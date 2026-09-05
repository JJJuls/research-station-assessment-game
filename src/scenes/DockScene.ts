import Phaser from 'phaser';

import { DepthLayer, key, worldDepth } from '../constants';
import { prefersReducedMotion } from '../inventory/ui/theme';
import { pilotLaunchMode } from '../pilot/pilotCoverage';
import { notePilotZoneEntered, pilotStage } from '../pilot/pilotRoute';
import { PILOT_CONTROLS_LINES } from '../pilot/PilotZoneScene';
import { missionCardAction, storyActTitle } from '../pilot/storyState';
import { DOCK_SITES, LEGACY_DOCK_SITES } from '../pilot/zoneSites';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { RoomScene, runOncePerSession } from '../world';
import { DOCK_LAYOUT, LEGACY_DOCK_LAYOUT } from '../world/layouts/dock';
import { isLegacyRoute } from '../world/SceneRouter';

/**
 * Idle-help parameters — OPEN SCIENTIFIC PARAMETERS (approved plan §12/§16.11).
 * No authoritative document defines the idle threshold for
 * `tutorial_help_shown` or the exact "idle" definition feeding
 * `baseline_idle_seconds`. Both mechanisms stay DISABLED (null) until the
 * user supplies values; they must never be chosen autonomously. When
 * enabled, the idle watcher surfaces the help prompt and accumulates
 * baseline idle time without ever blocking progress (Dock doc,
 * failure/edge cases).
 */
const DOCK_IDLE_HELP_THRESHOLD_MS: number | null = null;

const TILE = 32;

declare global {
  interface Window {
    /**
     * DEV-only, read-only Dock geometry probe (World V1): the terminal,
     * the north door and the movement marker of the ACTIVE layout, so the
     * shared e2e tutorial helper drives the right coordinates on both
     * routes.
     */
    __dockProbe?: {
      layout: 'pilot' | 'legacy';
      terminal: { x: number; y: number };
      northDoor: { x: number; y: number };
      marker: { x: number; y: number };
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__dockProbe = null;
}

/**
 * Dock / Arrival Bay — V3 §4 Room 0, docs/game/rooms/00-dock-arrival.md.
 * Control/usability room only: every event carries study_item_ids: [] and
 * no construct_id. Canonical mini-game: arrival → movement instruction →
 * highlighted movement marker → first terminal interaction → readiness
 * confirm (or explicit skip). Legacy dock_* events keep firing alongside
 * canonical ones per event-schema.md §4's Dock alias table.
 *
 * World V1 (docs/game/world-v1/ROOM-BLOCKOUTS.md §1): the participant
 * route uses the 36×24 bay — docking airlock and apron on the south wall
 * with the shuttle nose behind the bay windows, one circulation spine to
 * the station entrance, the arrival terminal in a lit west alcove, cargo
 * staging behind a rail on the east. `?route=legacy` keeps the V4 bay and
 * its coordinates byte-for-byte for the historical regression specs.
 */
export class DockScene extends RoomScene {
  protected readonly roomId = 'dock_arrival';
  protected readonly roomInteractionKey: InteractionKey = 'dockArrivalTutorial';

  private controlErrorCount = 0;
  private controlErrorLogged = false;
  private marker!: Phaser.GameObjects.Ellipse;
  private markerPulse: Phaser.Tweens.Tween | null = null;
  private markerReached = false;
  private idleSinceMs: number | null = null;

  constructor() {
    super(key.scene.dock);
  }

  /** The V4 bay for the legacy ring; the World V1 bay for participants. */
  private legacyLayout(): boolean {
    return isLegacyRoute();
  }

  private sites() {
    return this.legacyLayout() ? LEGACY_DOCK_SITES : DOCK_SITES;
  }

  protected getLayout(): RoomLayout {
    return {
      theme: 'dock',
      grid: [...(this.legacyLayout() ? LEGACY_DOCK_LAYOUT : DOCK_LAYOUT)],
    };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    // Returning from the station spawns just inside the north door; a
    // fresh arrival spawns on the docking apron, just inside the docking
    // airlock — both outside every door's 72 px interaction radius.
    if (this.legacyLayout()) {
      if (
        data?.spawn === 'station_hub' ||
        data?.spawn === 'station_concourse'
      ) {
        return LEGACY_DOCK_SITES.spawnFromHub;
      }

      return LEGACY_DOCK_SITES.spawnArrival;
    }

    if (data?.spawn === 'station_hub' || data?.spawn === 'station_concourse') {
      return DOCK_SITES.spawnFromConcourse;
    }

    return DOCK_SITES.spawnArrival;
  }

  /**
   * Professional pilot route: the north door leads into the Station
   * Concourse (participant default). `?route=legacy` keeps the historical
   * Hub target for the legacy regression specs.
   */
  private northDoorTarget() {
    if (isLegacyRoute()) {
      return {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'dock_arrival',
      };
    }

    return {
      sceneKey: key.scene.stationConcourse,
      roomId: 'station_concourse',
      spawn: 'dock',
    };
  }

  protected populateRoom(): void {
    const sites = this.sites();

    // Arrival terminal (Station AI).
    this.addStation({
      interactionKey: 'dockArrivalTutorial',
      label: this.legacyLayout() ? 'Arrival Terminal' : 'arrival terminal',
      verb: 'Check in at',
      registryId: 'dock.arrival_terminal',
      texture: this.legacyLayout()
        ? 'prop-dock-terminal'
        : 'kit-terminal-kiosk',
      x: sites.terminal.x,
      y: sites.terminal.y,
      promptBody:
        'The dock system checks whether you understand the basic controls before station tasks begin. What do you do?',
      // World V1 (U2, visual review V5): once the check-in is logged the
      // terminal is a class-3 object — the prompt reads its state and E
      // shows it, instead of a stale "Check in" verb.
      availability: () =>
        this.isPilotRoute() && this.isTutorialCompleted() ? 'checked in' : null,
      onPromptOpened: () => {
        runOncePerSession('dock_first_interaction', () => {
          this.logRoomEvent('dockArrivalTutorial', 'first_interaction');
        });

        if (this.isTutorialCompleted()) {
          this.showFeedbackMessage(
            'The dock tutorial has already been logged. Continue into the station.',
          );
          return false;
        }

        this.logRoomEvent('dockArrivalTutorial', 'dock_tutorial_opened');
        return true;
      },
    });

    // North door: Station Concourse on the pilot route (Phase C's Hub
    // target survives under ?route=legacy).
    const northTarget = this.northDoorTarget();

    this.addDoor({
      x: sites.northDoor.x,
      y: sites.northDoor.y,
      label: isLegacyRoute() ? 'Station Hub' : 'Station Concourse',
      verb: 'Go to',
      registryId: 'dock.door_concourse',
      texture: this.textures.exists('plv1-arch-door')
        ? 'plv1-arch-door'
        : 'prop-dock-airlock',
      interactionKey: 'dockArrivalTutorial',
      target: northTarget,
    });

    if (this.legacyLayout()) {
      this.buildLegacyBay();
    } else {
      this.buildArrivalBay();
    }

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__dockProbe = {
        layout: this.legacyLayout() ? 'legacy' : 'pilot',
        terminal: { ...sites.terminal },
        northDoor: { ...sites.northDoor },
        marker: { ...sites.marker },
      };
    }
  }

  /**
   * World V1 arrival bay (ROOM-BLOCKOUTS.md §1): docking threshold on the
   * south wall with the shuttle nose behind the central bay windows (the
   * landmark), the docking apron in front of it, one painted circulation
   * spine north to the station entrance, the arrival terminal in a lit
   * west alcove, cargo staging behind a low rail on the east, a service
   * column south-west. Nothing here logs, gates or moves an interactable.
   */
  private buildArrivalBay() {
    const S = DOCK_SITES;

    // ——— South wall: docking airlock (sealed class-3 door), header, windows ———
    this.addOverhead(S.dockingAirlock.x, 21 * TILE + 8, 'kit-airlock-frame');
    this.addDoor({
      x: S.dockingAirlock.x,
      y: S.dockingAirlock.y,
      label: 'docking airlock',
      verb: 'Docking airlock',
      registryId: 'dock.docking_airlock',
      texture: this.textures.exists('plv1-airlock-open')
        ? 'plv1-airlock-open'
        : 'prop-dock-airlock',
      // Closed iris (strip frame 0 — the V4 Dock's "closed leaf"): the
      // shuttle is secured. The arrival cut shows it open and seals it
      // (sealDockingAirlock).
      textureFrame: 0,
      interactionKey: 'dockArrivalTutorial',
      availability: () => 'shuttle secured',
      sealedMessage: 'Docking airlock sealed — the shuttle is secured.',
    });

    for (const [col, shuttle] of [
      [10, false],
      [14, true],
      [22, true],
      [26, false],
    ] as const) {
      this.addGroundInfra(
        col * TILE + 16,
        22 * TILE + 24,
        shuttle ? 'kit-bay-window-shuttle' : 'kit-bay-window',
      );
    }

    // ——— North wall: station entrance frame, sign, light fixtures ———
    this.addDoorFrame(S.northDoor.x, 1 * TILE + 16, 'h');
    this.addWallSign(
      S.northDoor.x + 128,
      1 * TILE + 18,
      'Station 080 · Concourse',
    );
    for (const col of [6, 12, 24, 30]) {
      this.addGroundInfra(col * TILE + 16, 1 * TILE + 30, 'kit-light-fixture');
    }

    // ——— Circulation spine: painted lane from the apron to the entrance ———
    this.addFloorLane(16, 2, 4, 20);
    this.addFloorDecal(
      S.dockingAirlock.x,
      20 * TILE,
      'kit-light-pool-cold',
      0.7,
    );

    // ——— West alcove: the arrival terminal on its kiosk cells ———
    this.addFloorDecal(
      S.terminal.x,
      S.terminal.y + 36,
      'kit-contact-shadow',
      0.8,
    );
    this.addGroundInfra(
      S.terminal.x + 40,
      S.terminal.y - 10,
      'kit-notice-board',
    );
    this.addGroundInfra(2 * TILE + 16, 10 * TILE + 8, 'kit-light-fixture');
    // Act 1 — emergency lighting only: a cold pool over the terminal alcove
    // (STORY-STATE-SPEC §4; the warm work-area pools return from act 3).
    this.addFloorDecal(
      S.terminal.x + 16,
      S.terminal.y + 40,
      'kit-light-pool-cold',
      0.75,
    );

    // ——— East cargo staging: rail, crate stacks, pallet jack, hazard strips ———
    for (let row = 8; row <= 20; row += 1) {
      this.addGroundInfra(
        24 * TILE + 16,
        row * TILE + 24,
        'kit-cargo-rail',
      )?.setAngle(90);
    }
    this.addFloorDecal(28 * TILE, 14 * TILE - 6, 'kit-contact-shadow');
    this.addKitProp(28 * TILE, 14 * TILE, 'kit-crate-stack');
    this.addFloorDecal(31 * TILE, 17 * TILE - 6, 'kit-contact-shadow');
    this.addKitProp(31 * TILE, 17 * TILE, 'kit-crate-stack');
    this.addGroundInfra(26.5 * TILE, 18 * TILE + 16, 'kit-pallet-jack');
    for (const col of [26, 28, 30, 32]) {
      this.addFloorDecal(col * TILE + 16, 20 * TILE + 8, 'kit-hazard-strip');
    }

    // ——— South-west service column with pipes and a cable tray ———
    this.addFloorDecal(9 * TILE, 17 * TILE - 6, 'kit-contact-shadow');
    this.addKitProp(
      9 * TILE,
      17 * TILE,
      this.textures.exists('plv1-utility-tower')
        ? 'plv1-utility-tower'
        : 'proc-console-wall',
      { tint: 0x8fa0b0 },
    );
    for (let col = 2; col < 8; col += 1) {
      this.addGroundInfra(col * TILE + 16, 22 * TILE + 8, 'kit-cable-tray');
    }
    this.addGroundInfra(8 * TILE + 8, 22 * TILE + 8, 'kit-cable-junction');
    this.addKitProp(4 * TILE, 21 * TILE + 24, 'kit-locker-bank');

    // ——— Highlighted movement target (V3 Room 0 mini-game) ———
    // Reaching it is a mechanic, not an event — no canonical event exists
    // for it and none is invented. A floor ring on the spine with a
    // restrained pulse (held under reduced motion), removed once reached.
    this.buildMovementMarker(S.marker.x, S.marker.y);
  }

  /** The V4 bay, byte-identical for the legacy regression specs. */
  private buildLegacyBay() {
    const S = LEGACY_DOCK_SITES;

    if (this.textures.exists('plv1-airlock-open')) {
      this.add
        .image(12 * TILE - 16, 12 * TILE + 18, 'plv1-airlock-open', 0)
        .setDepth(DepthLayer.LowProp);
    } else {
      this.addDecor(12 * TILE - 16, 12 * TILE + 8, 'prop-dock-airlock');
    }

    const laneX = 12 * TILE - 16;

    this.add
      .rectangle(laneX, 7 * TILE, 2 * TILE, 10 * TILE, 0x55627a, 0.22)
      .setDepth(DepthLayer.FloorDecal);
    for (let row = 2; row < 12; row += 1) {
      this.add
        .rectangle(laneX, row * TILE + 16, 4, 14, 0x8fa4b8, 0.35)
        .setDepth(DepthLayer.FloorMarking);
    }
    this.add
      .rectangle(laneX, 2 * TILE + 4, 2 * TILE - 8, 3, 0x5fd3c4, 0.5)
      .setDepth(DepthLayer.FloorMarking);

    this.addDecor(3 * TILE, 3.4 * TILE, 'proc-light-pool');
    this.add
      .rectangle(3 * TILE, 3 * TILE + 20, 3 * TILE, 2 * TILE, 0x55627a, 0.16)
      .setDepth(DepthLayer.FloorDecal);

    for (const x of [5.5, 8.5, 15.5, 18.5]) {
      if (this.textures.exists('proc-window-exterior')) {
        this.add
          .image(x * TILE, 46, 'proc-window-exterior')
          .setTint(0x7f93a8)
          .setDepth(DepthLayer.LowProp);
      }
    }
    this.addDecor(19 * TILE, 3 * TILE + 12, 'prop-dock-crates');
    this.addDecor(21 * TILE + 4, 3 * TILE + 12, 'prop-dock-crates');
    this.addDecor(20 * TILE + 8, 4.6 * TILE, 'proc-crate-supply');
    this.addDecor(8.5 * TILE, 7 * TILE, 'prop-dock-crates');
    this.addDecor(21.5 * TILE, 7.5 * TILE, 'proc-locker-field');
    this.addDecor(21.5 * TILE, 10 * TILE, 'proc-cart-utility');
    this.addDecor(4.5 * TILE, 12 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(19.5 * TILE, 12 * TILE + 10, 'proc-wall-pipes');

    for (const [x, y] of [
      [9.4 * TILE, 9.4 * TILE],
      [14.6 * TILE, 9.4 * TILE],
      [9.4 * TILE, 11.6 * TILE],
      [14.6 * TILE, 11.6 * TILE],
    ] as const) {
      this.add
        .rectangle(x, y, 4, 4, 0x9a7a3a, 0.8)
        .setDepth(DepthLayer.FloorMarking);
    }

    this.buildMovementMarker(S.marker.x, S.marker.y);
  }

  private buildMovementMarker(x: number, y: number) {
    this.marker = this.add
      .ellipse(x, y, 44, 18, 0x5fd3c4, 0.22)
      .setStrokeStyle(2, 0x5fd3c4, 0.95)
      .setDepth(DepthLayer.FloorMarking);

    if (!prefersReducedMotion()) {
      this.markerPulse = this.tweens.add({
        targets: this.marker,
        alpha: { from: 1, to: 0.5 },
        duration: 900,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Participant pilot launch (not the legacy Hub ring, not a dev alias). */
  private isPilotRoute(): boolean {
    return pilotLaunchMode() === 'participant' && !isLegacyRoute();
  }

  create(data?: { spawn?: string }) {
    super.create(data);

    if (!this.isPilotRoute()) {
      return;
    }

    // Pilot guidance in the Dock: the route objective line, the station
    // map on M and the zone-entry bookkeeping (discovery + re-entry count).
    notePilotZoneEntered('dock', Date.now());
    this.refreshRouteObjective();
    this.input.keyboard!.on('keydown-M', (event: KeyboardEvent) => {
      if (event.repeat || !this.physicalInputEligible()) {
        return;
      }

      this.logScenarioEvent('pilotRoute', 'pilot_map_opened', {
        metadata: { zone: 'dock' },
      });
      this.scene.pause(this.scene.key);
      this.scene.launch(key.scene.pilotStationMap, {
        resumeKey: this.scene.key,
        zone: 'dock',
      });
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.input.keyboard?.resetKeys();
    });
  }

  /**
   * World V1 (U2): the story state's next action for the Dock — the
   * check-in until it is logged (either path), then the station entrance.
   */
  protected buildRouteObjectiveText(): string {
    return this.isPilotRoute()
      ? missionCardAction(pilotStage(), 'dock', {
          dockCheckedIn: this.isTutorialCompleted(),
        })
      : super.buildRouteObjectiveText();
  }

  protected buildMissionCardTitle(): string {
    return this.isPilotRoute() ? storyActTitle(pilotStage()) : '';
  }

  /**
   * The Dock's guidance target: nothing while the movement marker is the
   * instruction (one cue at a time — gameplay review F1), then the terminal
   * until checked in, then the exit.
   */
  protected isGuidanceTarget(config: { x: number; y: number }): boolean {
    if (!this.isPilotRoute() || !this.markerReached) {
      return false;
    }

    const sites = this.sites();
    const target = this.isTutorialCompleted()
      ? sites.northDoor
      : sites.terminal;

    return (
      Math.abs(config.x - target.x) < 1 && Math.abs(config.y - target.y) < 1
    );
  }

  protected hotbarVisible(): boolean {
    return !this.isPilotRoute();
  }

  protected muteKeyEnabled(): boolean {
    return !this.isPilotRoute();
  }

  protected questLineEnabled(): boolean {
    return !this.isPilotRoute();
  }

  protected controlsReferenceOptions() {
    return this.isPilotRoute()
      ? { startVisible: false, lines: PILOT_CONTROLS_LINES, panelY: 404 }
      : undefined;
  }

  protected onRoomEntered(): void {
    runOncePerSession('dock_started', () => {
      this.logRoomEvent('dockArrivalTutorial', 'dock_started');
    });

    // Professional pilot route: a brief, skippable in-engine opening plays
    // ONCE per session before control is handed over (participant launches
    // only; never under ?route=legacy or a developer alias). Skipping or
    // finishing changes no measurement entry state — the instruction below
    // and every Dock event are identical either way.
    let openingShown = false;

    if (pilotLaunchMode() === 'participant' && !isLegacyRoute()) {
      runOncePerSession('pilot_opening_shown', () => {
        openingShown = true;
        this.logScenarioEvent('pilotOpening', 'pilot_opening_shown');
        this.scene.pause(this.scene.key);
        this.scene.launch(key.scene.pilotOpening, {
          resumeKey: this.scene.key,
          onDone: (outcome: 'completed' | 'skipped') => {
            // V4: the skip press never becomes the first interaction.
            this.suppressInteractUntilMs = Date.now() + 300;
            this.logScenarioEvent(
              'pilotOpening',
              outcome === 'skipped'
                ? 'pilot_opening_skipped'
                : 'pilot_opening_completed',
            );
            this.sealDockingAirlock();
            this.showMovementInstruction();
          },
        });
      });
    }

    if (!openingShown) {
      this.showMovementInstruction();
    }
  }

  /**
   * World V1 (U2): the cut from the opening lands on the docking threshold
   * with the airlock iris still open behind the participant; it closes
   * over ~1 s (strip frames 0 → 3) — a state-driven reaction, identical
   * after a skip and after a completed opening, held on the closed frame
   * under reduced motion. The door stays the sealed class-3 object.
   */
  private sealDockingAirlock() {
    if (!this.textures.exists('plv1-airlock-open')) {
      return;
    }

    // Strip frames run closed (0) → open (6).
    const openFrame = 6;
    const closedFrame = 0;

    if (prefersReducedMotion()) {
      this.setDoorFrameById('dock.docking_airlock', closedFrame);
      return;
    }

    this.setDoorFrameById('dock.docking_airlock', openFrame);

    for (let step = 1; step <= 3; step += 1) {
      this.time.delayedCall(300 * step, () =>
        this.setDoorFrameById('dock.docking_airlock', openFrame - step * 2),
      );
    }
  }

  private showMovementInstruction() {
    this.showFeedbackMessage(
      'Station AI: arrow keys to move. Reach the highlighted marker.',
    );
    runOncePerSession('dock_movement_instruction_shown', () => {
      this.logRoomEvent('dockArrivalTutorial', 'movement_instruction_shown');
    });

    this.idleSinceMs = Date.now();
  }

  protected onRoomUpdate(): void {
    const { velocity } = this.player.body;
    const moving = velocity.x !== 0 || velocity.y !== 0;

    if (moving) {
      runOncePerSession('dock_first_movement', () => {
        this.logRoomEvent('dockArrivalTutorial', 'first_movement');
      });
      this.idleSinceMs = null;
    }

    this.updateIdleWatcher(moving);
    this.updateMarker();
  }

  protected onEmptyInteract(): void {
    // Out-of-range SPACE press = control error (Dock doc failure/edge
    // cases: "Repeated interaction attempts / control errors: should
    // increment control_error_count, not throw or freeze").
    this.controlErrorCount += 1;
  }

  protected getPromptOptions(): PromptOption[] {
    // Ported verbatim from the prototype's dockArrivalTutorial options
    // (legacy events unchanged); each path additionally emits the
    // canonical tutorial_completed with the fold metadata recommended by
    // event-schema.md §4, plus the control_error_count aggregate event.
    return [
      {
        label: 'Skip the tutorial and continue.',
        feedback:
          'You skip the orientation and head in. The station tasks are all available.',
        getEventTypes: () => [
          'dock_tutorial_skipped',
          'dock_instruction_shortcut',
        ],
        onSelected: () => {
          this.completeTutorial({ skipped: true });
        },
      },
      {
        label: 'Review the controls and confirm readiness.',
        feedback:
          'You review the basic controls and confirm that you are ready to continue.',
        getEventTypes: () => [
          'dock_controls_reviewed',
          'dock_tutorial_completed',
          'dock_instruction_followed',
        ],
        onSelected: () => {
          this.completeTutorial({ path: 'reviewed' });
        },
      },
      {
        label: 'Practice movement briefly, then confirm readiness.',
        feedback:
          'You take a moment to practise movement before starting the station tasks.',
        getEventTypes: () => [
          'dock_movement_practiced',
          'dock_tutorial_completed',
          'dock_control_familiarisation',
        ],
        onSelected: () => {
          this.completeTutorial({ path: 'practiced' });
        },
      },
    ];
  }

  private isTutorialCompleted(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('dock_arrival');
  }

  private completeTutorial(metadata: Record<string, unknown>) {
    // Canonical readiness event alongside the legacy per-path events.
    this.logRoomEvent('dockArrivalTutorial', 'tutorial_completed', {
      metadata,
    });

    if (!this.controlErrorLogged) {
      this.controlErrorLogged = true;
      this.logRoomEvent('dockArrivalTutorial', 'control_error_count', {
        metadata: { count: this.controlErrorCount },
      });
    }

    // One-shot guard prevents repeated tutorial interactions from
    // inflating baseline control variables (prototype behavior).
    researchRuntime.sessionState.markRoomCompleted('dock_arrival');
  }

  private updateIdleWatcher(moving: boolean) {
    // DISABLED until the user supplies the idle threshold + definition
    // (open scientific parameter). The plumbing exists so enabling it is a
    // constant change, not a design decision.
    if (DOCK_IDLE_HELP_THRESHOLD_MS === null) {
      return;
    }

    if (moving || this.isTutorialCompleted()) {
      this.idleSinceMs = null;
      return;
    }

    if (this.idleSinceMs === null) {
      this.idleSinceMs = Date.now();
      return;
    }

    if (Date.now() - this.idleSinceMs >= DOCK_IDLE_HELP_THRESHOLD_MS) {
      this.idleSinceMs = null;
      runOncePerSession('dock_tutorial_help_shown', () => {
        this.showFeedbackMessage(
          'Station AI: use the arrow keys to move, and SPACE or E to interact.',
        );
        this.logRoomEvent('dockArrivalTutorial', 'tutorial_help_shown');
      });
    }
  }

  private updateMarker() {
    if (this.markerReached) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.marker.x,
      this.marker.y,
    );

    if (distance < 40) {
      this.markerReached = true;
      // The reached marker settles and leaves — no lingering cue; the
      // instruction rides the transient feedback banner.
      this.markerPulse?.stop();
      this.markerPulse = null;
      this.marker.setAlpha(1).setFillStyle(0x5fd3c4, 0.5);
      this.time.delayedCall(700, () => this.marker.destroy());
      this.showFeedbackMessage(
        'Marker reached — now check in at the arrival terminal (E).',
      );
    }
  }

  /** Depth helper for the bay's tall props (unused on the legacy bay). */
  protected propDepth(footY: number): number {
    return worldDepth(footY);
  }
}
