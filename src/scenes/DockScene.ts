import Phaser from 'phaser';

import { DepthLayer, key } from '../constants';
import { prefersReducedMotion } from '../inventory/ui/theme';
import { pilotLaunchMode } from '../pilot/pilotCoverage';
import { notePilotZoneEntered, pilotObjective } from '../pilot/pilotRoute';
import { PILOT_CONTROLS_LINES } from '../pilot/PilotZoneScene';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { RoomScene, runOncePerSession } from '../world';
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

/**
 * Dock / Arrival Bay — V3 §4 Room 0, docs/game/rooms/00-dock-arrival.md.
 * Control/usability room only: every event carries study_item_ids: [] and
 * no construct_id. Canonical mini-game: arrival → movement instruction →
 * highlighted movement marker → first terminal interaction → readiness
 * confirm (or explicit skip). Legacy dock_* events keep firing alongside
 * canonical ones per event-schema.md §4's Dock alias table.
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

  protected getLayout(): RoomLayout {
    // V4 arrival bay (docs/game/VISUAL-SYSTEM-V4.md §7): a compact bay
    // read left to right — the Arrival Terminal kiosk on the west wall
    // (floor plate + light pool; the west lane at x ≈ 48 that the legacy
    // journeys clamp along stays fully open), the north airlock on the
    // centre spine, a cargo stack
    // on the north-east wall (cols 18-22 rows 3-4), a service rail along
    // the east wall (cols 21-22 rows 5-11), the landing pad ('P') centred
    // on the arrival airlock. Every V3 coordinate is preserved: terminal
    // (96,96), north door (368,48), both
    // spawns, and the e2e lanes (col 3 north, row 2 east to the door).
    // The grid is 14 rows (448 px): one wall row below the arrival airlock
    // instead of seven rows of dead wall mass under the bay. Legend:
    // StationMapBuilder CHAR_TO_TILE.
    return {
      theme: 'dock',
      grid: [
        '#########################',
        '###########--############',
        '#......................##',
        '#.................#######',
        '#.................#######',
        '#....................####',
        '#....................####',
        '#......####..........####',
        '#......####..........####',
        '#........PPPPPP......####',
        '#........PPPPPP......####',
        '#........PPPPPP......####',
        '###########--############',
        '#########################',
      ],
    };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    // Returning from the Hub spawns just inside the top door; a fresh
    // arrival spawns bottom-center, just inside the arrival airlock.
    // Just outside the hub door's 72px interaction radius (no accidental
    // immediate bounce-back on SPACE).
    if (data?.spawn === 'station_hub' || data?.spawn === 'station_concourse') {
      return { x: 12 * 32, y: 4 * 32 };
    }

    return { x: 12 * 32, y: 11 * 32 };
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
    // Arrival terminal (Station AI) — top-left of the bay.
    this.addStation({
      interactionKey: 'dockArrivalTutorial',
      label: 'Arrival Terminal',
      texture: 'prop-dock-terminal',
      x: 3 * 32,
      y: 3 * 32,
      promptBody:
        'The dock system checks whether you understand the basic controls before station tasks begin. What do you do?',
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

    // V4: the one interior door family (arch leaf + cyan threshold) so the
    // exit reads like every other station door; the legacy prop remains
    // the fallback when the leaf is not loaded.
    this.addDoor({
      x: 12 * 32 - 16,
      y: 1 * 32 + 16,
      label: isLegacyRoute() ? 'Station Hub' : 'Station Concourse',
      texture: this.textures.exists('plv1-arch-door')
        ? 'plv1-arch-door'
        : 'prop-dock-airlock',
      interactionKey: 'dockArrivalTutorial',
      target: northTarget,
    });

    // V4 set dressing (presentation only; never obstructs interactables;
    // every prop that could block movement stands on a wall cell).
    this.buildArrivalBay();
  }

  /**
   * V4 arrival-bay composition (docs/game/VISUAL-SYSTEM-V4.md §7 Dock):
   * one dominant circulation spine (arrival airlock → landing pad → north
   * airlock), the terminal kiosk as the western landmark, a grouped cargo
   * stack and a service rail as quiet structure, static pad lights, no
   * ambient motion. Nothing here logs, gates or moves an interactable.
   */
  private buildArrivalBay() {
    const TILE = 32;

    // Arrival airlock behind the spawn (the iris strip's closed leaf when
    // loaded, else the committed airlock prop).
    if (this.textures.exists('plv1-airlock-open')) {
      // Centred on the wall row so the leaf never covers the figure.
      this.add
        .image(12 * TILE - 16, 12 * TILE + 18, 'plv1-airlock-open', 0)
        .setDepth(DepthLayer.LowProp);
    } else {
      this.addDecor(12 * TILE - 16, 12 * TILE + 8, 'prop-dock-airlock');
    }

    // Circulation spine: a painted service lane from the arrival airlock
    // to the north airlock (two tiles wide), with a dashed centre line.
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

    // Terminal kiosk: light pool + a floor plate that reads as its own
    // station.
    this.addDecor(3 * TILE, 3.4 * TILE, 'proc-light-pool');
    this.add
      .rectangle(3 * TILE, 3 * TILE + 20, 3 * TILE, 2 * TILE, 0x55627a, 0.16)
      .setDepth(DepthLayer.FloorDecal);

    // North wall: exterior windows either side of the airlock (rhythm) and
    // the cargo stack on the north-east wall cells.
    for (const x of [5.5, 8.5, 15.5, 18.5]) {
      if (this.textures.exists('proc-window-exterior')) {
        // Night outside: the window card is held to the wall register so
        // decoration never outshines the figure or the exit.
        this.add
          .image(x * TILE, 46, 'proc-window-exterior')
          .setTint(0x7f93a8)
          .setDepth(DepthLayer.LowProp);
      }
    }
    this.addDecor(19 * TILE, 3 * TILE + 12, 'prop-dock-crates');
    this.addDecor(21 * TILE + 4, 3 * TILE + 12, 'prop-dock-crates');
    this.addDecor(20 * TILE + 8, 4.6 * TILE, 'proc-crate-supply');

    // The crate block in the bay (collidable cells) and the east service
    // rail: a locker and a cart on wall cells only; pipes on the south
    // wall.
    this.addDecor(8.5 * TILE, 7 * TILE, 'prop-dock-crates');
    this.addDecor(21.5 * TILE, 7.5 * TILE, 'proc-locker-field');
    this.addDecor(21.5 * TILE, 10 * TILE, 'proc-cart-utility');
    this.addDecor(4.5 * TILE, 12 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(19.5 * TILE, 12 * TILE + 10, 'proc-wall-pipes');

    // Landing-pad edge lights: static, dull amber (never cyan, no motion).
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

    // Highlighted movement target (V3 Room 0 mini-game: "movement to
    // highlighted target"). Reaching it is a mechanic, not an event — no
    // canonical event exists for it and none is invented. V4: a floor ring
    // with a restrained pulse (held under reduced motion) that is removed
    // once reached — never a floating label.
    // The ring sits at (544, 224): inside the 640×360 view from the arrival
    // spawn (the V3 spot two rows higher was above the top edge at arrival).
    this.marker = this.add
      .ellipse(17 * TILE, 7 * TILE, 44, 18, 0x5fd3c4, 0.22)
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

  protected buildRouteObjectiveText(): string {
    return this.isPilotRoute()
      ? pilotObjective()
      : super.buildRouteObjectiveText();
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
            this.showMovementInstruction();
          },
        });
      });
    }

    if (!openingShown) {
      this.showMovementInstruction();
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
      // V4: the reached marker settles and leaves — no lingering cue; the
      // instruction rides the transient feedback banner.
      this.markerPulse?.stop();
      this.markerPulse = null;
      this.marker.setAlpha(1).setFillStyle(0x5fd3c4, 0.5);
      this.time.delayedCall(700, () => this.marker.destroy());
      this.showFeedbackMessage(
        'Marker reached — now check in at the Arrival Terminal (SPACE).',
      );
    }
  }
}
