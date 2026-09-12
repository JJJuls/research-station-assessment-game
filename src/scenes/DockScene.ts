import Phaser from 'phaser';

import { DepthLayer, key, worldDepth } from '../constants';
import { prefersReducedMotion } from '../inventory/ui/theme';
import { pilotLaunchMode } from '../pilot/pilotCoverage';
import {
  notePilotZoneEntered,
  onPilotRouteChange,
  pilotStage,
  pilotStageAtOrAfter,
} from '../pilot/pilotRoute';
import { PILOT_CONTROLS_LINES } from '../pilot/PilotZoneScene';
import {
  missionCardAction,
  OPENING_STATION_LINE,
  storyActTitle,
} from '../pilot/storyState';
import { DOCK_SITES, LEGACY_DOCK_SITES } from '../pilot/zoneSites';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { RoomScene, runOncePerSession } from '../world';
import { EMERGENCY_PLATE_TINT } from '../world/kit/worldV2Assets';
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

/**
 * Scripted arrival (rescue cut, wall-clock ms after the opening): the
 * vault seal vents with a light spill and a steam burst, the participant
 * steps from the seal to the exact spawn, the station line plays, and
 * control releases at a fixed end state shared with the skipped path.
 */
const ARRIVAL = {
  ventMs: 900,
  stepStartMs: 1100,
  stepMs: 800,
  stationLineMs: 2300,
  releaseMs: 4600,
} as const;

/**
 * The dock plate's baked hanging lamps (world px): warm pools fade in
 * under them when station power is restored at check-in. Presentation
 * only — mapped by eye to public/assets/world-v2/plates/dock-plate.png.
 */
const DOCK_LAMPS: readonly { x: number; y: number }[] = [
  { x: 175, y: 150 },
  { x: 330, y: 150 },
  { x: 520, y: 150 },
];

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
      /** World V1 slice: the arrival script is still running. */
      arrival_playing: boolean;
      /** Dock restoration shape state (stage-driven). */
      cover: 'loose' | 'secured';
      lighting: string;
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
 * World V2 rescue (22×12 painted plate): a weather-sealed cargo dock.
 * The plate (`w2-dock-plate`) bakes the vault docking seal with tracked
 * snow in the south hull, the check-in kiosk on the north wall, the
 * cargo groups and drums along the walls and the three hanging work
 * lamps; the Concourse door leaf, the terminal's screen glow, the
 * power-state light pools and the movement marker are layered sprites.
 * `?route=legacy` keeps the V4 bay and its coordinates byte-for-byte for
 * the historical regression specs.
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
  private arrivalPlaying = false;
  private unsubscribeRoute: (() => void) | null = null;

  /**
   * Power-state presentation (rescue): the painted plate renders the Dock
   * in its full-power look; before check-in the plate is tinted cold
   * (emergency power) and the warm lamp pools are dark. Checking in
   * triggers the visible power step-up. Presentation only.
   */
  private warmPools: Phaser.GameObjects.Image[] = [];
  private terminalGlow: Phaser.GameObjects.Rectangle | null = null;
  private poweredShown = false;

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
    return this.legacyLayout()
      ? { theme: 'dock', grid: [...LEGACY_DOCK_LAYOUT] }
      : {
          theme: 'dock',
          grid: [...DOCK_LAYOUT],
          field: 'wide',
          plateTexture: 'w2-dock-plate',
        };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    // Returning from the station spawns just inside the north door; a
    // fresh arrival spawns on the berth threshold, inside the sealed
    // docking airlock — both outside every door's 72 px interaction radius.
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

    this.warmPools = [];
    this.terminalGlow = null;
    this.poweredShown = false;
    this.markerReached = false;

    // Arrival terminal (Station AI).
    this.addStation({
      interactionKey: 'dockArrivalTutorial',
      label: this.legacyLayout() ? 'Arrival Terminal' : 'arrival terminal',
      verb: 'Check in at',
      registryId: 'dock.arrival_terminal',
      texture: this.legacyLayout()
        ? 'prop-dock-terminal'
        : 'w1-terminal-available',
      x: sites.terminal.x,
      y: sites.terminal.y,
      promptBody:
        'The dock system checks whether you understand the basic controls before station tasks begin. What do you do?',
      // World V1 (U2, visual review V5): once the check-in is logged the
      // terminal is a class-5 (completed) object — the prompt reads its
      // state and E shows it, instead of a stale "Check in" verb.
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
      texture: this.legacyLayout()
        ? this.textures.exists('plv1-arch-door')
          ? 'plv1-arch-door'
          : 'prop-dock-airlock'
        : 'w2-door-north',
      interactionKey: 'dockArrivalTutorial',
      target: northTarget,
    });

    if (this.legacyLayout()) {
      this.buildLegacyBay();
    } else {
      this.buildArrivalHall();
      this.refreshDockState();
    }

    this.publishDockProbe();
  }

  private publishDockProbe() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const sites = this.sites();

    window.__dockProbe = {
      layout: this.legacyLayout() ? 'legacy' : 'pilot',
      terminal: { ...sites.terminal },
      northDoor: { ...sites.northDoor },
      marker: { ...sites.marker },
      arrival_playing: this.arrivalPlaying,
      cover: this.coverSecured() ? 'secured' : 'loose',
      lighting: this.isPilotRoute()
        ? this.dockPowered()
          ? 'restored'
          : 'emergency'
        : 'n/a',
    };
  }

  /**
   * The arrival hall (rescue): the painted plate IS the room art — the
   * cargo groups, drums, kiosk, vault seal, snow and lamps are baked into
   * one authored composition (collision mirrors it in DOCK_FOOTPRINTS).
   * This method layers only the DYNAMIC pieces on top: the Concourse door
   * leaf, the terminal's screen glow, the power-state light pools and the
   * movement marker. Nothing here logs, gates or moves an interactable.
   */
  private buildArrivalHall() {
    const S = DOCK_SITES;

    // ——— South hull: the docking vault (baked art; sealed interaction) ———
    this.addDoor({
      x: S.dockingAirlock.x,
      y: S.dockingAirlock.y,
      label: 'docking airlock',
      verb: 'Docking airlock',
      registryId: 'dock.docking_airlock',
      texture: 'w1-airlock-closed',
      interactionKey: 'dockArrivalTutorial',
      availability: () => 'shuttle secured',
      sealedMessage: 'Docking airlock sealed — the shuttle is secured.',
    });
    // The vault leaf is painted into the plate: hide the marker rectangle,
    // keep the interaction (prompt + lamp) exactly where the art shows it.
    this.hideMarkerArt(this.doorImage('dock.docking_airlock'));

    // ——— North wall: the Concourse door leaf (sprite over the plate) ———
    // The interaction anchor is (352, 64) so the approach clears the wall
    // band; the 80×96 leaf itself is drawn at y 48, filling the wall band
    // exactly, behind the actors.
    this.doorImage('dock.door_concourse')
      ?.setY(48)
      .setDepth(DepthLayer.GroundInfra);

    // ——— Check-in terminal: baked kiosk + a live screen glow ———
    this.hideMarkerArt(this.stationImage('dockArrivalTutorial'));
    this.terminalGlow = this.add
      .rectangle(S.terminal.x, S.terminal.y - 24, 16, 12, 0x9fe8ff, 0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DepthLayer.WorldReadout);

    if (!prefersReducedMotion()) {
      this.tweens.add({
        targets: this.terminalGlow,
        alpha: { from: 0.55, to: 0.3 },
        duration: 1200,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

    // ——— Power-state pools: dark until the check-in restores power ———
    for (const lamp of DOCK_LAMPS) {
      const pool = this.addFloorDecal(lamp.x, lamp.y, 'kit-light-pool-warm');

      if (pool !== null) {
        pool.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
        this.warmPools.push(pool);
      }
    }

    // ——— Highlighted movement target (V3 Room 0 mini-game) ———
    // Reaching it is a mechanic, not an event — no canonical event exists
    // for it and none is invented. A floor ring with a restrained pulse
    // (held under reduced motion), removed once reached.
    this.buildMovementMarker(S.marker.x, S.marker.y);
  }

  /** Hides a marker's art while keeping its interaction untouched. */
  private hideMarkerArt(image: Phaser.GameObjects.GameObject | null) {
    (image as Phaser.GameObjects.Image | null)?.setVisible(false);
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

  // ——— Power-state presentation (rescue) ————————————————————————————————

  /** Retained probe shape: the crew state at handover (no visual now). */
  private coverSecured(): boolean {
    return this.isPilotRoute() && pilotStageAtOrAfter('handover_briefing');
  }

  /** Whether the Dock shows full station power (the check-in payoff). */
  private dockPowered(): boolean {
    return !this.isPilotRoute() || this.isTutorialCompleted();
  }

  /**
   * Presentation of the Dock's power state over the painted plate: cold
   * multiplied tint + dark warm pools on emergency power; neutral plate +
   * lit pools once the check-in restores power. `animate` plays the
   * visible step-up (the room's one meaningful world response); re-entry
   * applies the settled state instantly. Presentation only — check-in
   * state, events and the route collision are untouched.
   */
  private refreshDockState(animate = false) {
    const powered = this.dockPowered();
    const plateArt = this.roomPlateArt();

    if (plateArt === null) {
      this.publishDockProbe();
      return;
    }

    if (!powered) {
      this.poweredShown = false;
      plateArt.setTint(EMERGENCY_PLATE_TINT);
      for (const pool of this.warmPools) {
        pool.setAlpha(0);
      }
      this.terminalGlow?.setVisible(true);
    } else if (animate && !this.poweredShown && !prefersReducedMotion()) {
      this.poweredShown = true;
      this.playPowerStepUp(plateArt);
    } else {
      this.poweredShown = true;
      this.tweens.killTweensOf(plateArt);
      plateArt.clearTint();
      for (const pool of this.warmPools) {
        pool.setAlpha(0.65);
      }
      this.terminalGlow?.setVisible(false);
    }

    this.publishDockProbe();
  }

  /**
   * The power step-up: a breaker flicker, then the cold tint warms to
   * neutral while the lamp pools ignite west → east. Pure presentation.
   */
  private playPowerStepUp(plateArt: Phaser.GameObjects.Image) {
    const from = Phaser.Display.Color.ValueToColor(EMERGENCY_PLATE_TINT);
    const to = Phaser.Display.Color.ValueToColor(0xffffff);

    this.terminalGlow?.setVisible(false);

    // Breaker flicker: two quick dips before the warm-up.
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 260,
      repeat: 1,
      yoyo: true,
      onUpdate: (tween) => {
        const dim = 1 - 0.25 * (tween.getValue() ?? 0);

        plateArt.setTint(
          Phaser.Display.Color.GetColor(
            Math.round(from.red * dim),
            Math.round(from.green * dim),
            Math.round(from.blue * dim),
          ),
        );
      },
      onComplete: () => {
        this.tweens.addCounter({
          from: 0,
          to: 100,
          duration: 1400,
          ease: 'Sine.easeInOut',
          onUpdate: (tween) => {
            const mixed = Phaser.Display.Color.Interpolate.ColorWithColor(
              from,
              to,
              100,
              tween.getValue() ?? 0,
            );

            plateArt.setTint(
              Phaser.Display.Color.GetColor(mixed.r, mixed.g, mixed.b),
            );
          },
          onComplete: () => plateArt.clearTint(),
        });
      },
    });

    // Lamp pools ignite in sequence, west to east.
    this.warmPools.forEach((pool, index) => {
      this.tweens.add({
        targets: pool,
        alpha: 0.65,
        delay: 500 + index * 320,
        duration: 420,
        ease: 'Sine.easeOut',
      });
    });
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
      if (event.repeat || !this.physicalInputEligible() || this.inputLocked) {
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
      this.refreshDockState();
    });

    this.unsubscribeRoute = onPilotRouteChange(() => {
      this.refreshRouteObjective();
      this.refreshDockState();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeRoute?.();
      this.unsubscribeRoute = null;
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
            this.beginArrival(outcome);
          },
        });
      });
    }

    if (!openingShown) {
      this.showMovementInstruction();
    }
  }

  /**
   * The cut from the opening (rescue): a COMPLETED opening plays the
   * continuous arrival — the vault seal vents a cold light spill and a
   * steam burst, the participant steps from the seal to the exact spawn,
   * the station line plays — with input locked and the camera held on the
   * authored composition. A SKIPPED opening (or reduced motion) goes
   * straight to the same end state: finishArrival() is the ONE finish
   * function for both paths.
   */
  private beginArrival(outcome: 'completed' | 'skipped') {
    const S = DOCK_SITES;

    if (outcome !== 'completed' || prefersReducedMotion()) {
      this.finishArrival();
      return;
    }

    this.arrivalPlaying = true;
    this.inputLocked = true;
    this.cameraHeld = true;
    this.plate.snapTo(S.spawnArrival.x, S.spawnArrival.y);
    this.publishDockProbe();

    // The participant stands in the seal's threshold; the vault vents.
    this.player.setPosition(S.spawnArrival.x, S.spawnArrival.y + 56);
    this.player.anims.play('researcher_idle_north', true);

    // Cold light spill from the opening seal, swallowed as it recloses.
    const spill = this.add
      .rectangle(S.dockingAirlock.x, S.dockingAirlock.y - 24, 88, 56, 0xcfe8ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(DepthLayer.WorldReadout);

    this.tweens.add({
      targets: spill,
      alpha: { from: 0, to: 0.5 },
      duration: ARRIVAL.ventMs * 0.4,
      yoyo: true,
      hold: ARRIVAL.ventMs * 0.5,
      onComplete: () => spill.destroy(),
    });

    // Steam burst at the seal: three soft puffs drifting up and fading.
    for (let i = 0; i < 3; i += 1) {
      const puff = this.add
        .ellipse(
          S.dockingAirlock.x - 24 + i * 24,
          S.dockingAirlock.y - 8,
          26,
          16,
          0xdfe9f1,
          0.5,
        )
        .setDepth(DepthLayer.WorldReadout - 0.01);

      this.tweens.add({
        targets: puff,
        y: puff.y - 34 - i * 8,
        scaleX: 1.9,
        scaleY: 1.6,
        alpha: 0,
        delay: 120 * i,
        duration: 1300,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy(),
      });
    }

    // The step from the seal to the exact playable spawn.
    this.time.delayedCall(ARRIVAL.stepStartMs, () => {
      this.player.anims.play('researcher_walk_north', true);
      this.tweens.add({
        targets: this.player,
        y: S.spawnArrival.y,
        duration: ARRIVAL.stepMs,
        ease: 'Linear',
        onComplete: () => this.player.anims.play('researcher_idle_north', true),
      });
    });

    // The station line (role and situation, no instruction).
    this.time.delayedCall(ARRIVAL.stationLineMs, () => {
      this.showFeedbackMessage(OPENING_STATION_LINE);
    });

    // Control releases at the fixed end state.
    this.time.delayedCall(ARRIVAL.releaseMs, () => this.finishArrival());
  }

  /** The one common finish: spawn, camera, seal, input, instruction. */
  private finishArrival() {
    const S = DOCK_SITES;

    this.tweens.killTweensOf(this.player);
    this.player.setPosition(S.spawnArrival.x, S.spawnArrival.y);
    this.player.body.reset(S.spawnArrival.x, S.spawnArrival.y);
    this.player.anims.play('researcher_idle_north', true);
    this.plate.snapTo(S.spawnArrival.x, S.spawnArrival.y);
    this.cameraHeld = false;
    this.inputLocked = false;
    this.arrivalPlaying = false;
    this.suppressInteractUntilMs = Math.max(
      this.suppressInteractUntilMs,
      Date.now() + 300,
    );
    this.showMovementInstruction();
    this.refreshRouteObjective();
    this.publishDockProbe();
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
    if (this.arrivalPlaying) {
      return;
    }

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

    // Rescue payoff: the check-in restores station power — the plate
    // warms from its cold emergency tint and the lamp pools ignite in
    // sequence. Presentation only; the logged events above are unchanged.
    if (!this.legacyLayout()) {
      this.refreshDockState(true);
    }
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
