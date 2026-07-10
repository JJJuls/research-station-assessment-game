import Phaser from 'phaser';

import { Depth, key } from '../constants';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { RoomScene, runOncePerSession } from '../world';

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
  private marker!: Phaser.GameObjects.Rectangle;
  private markerHint: Phaser.GameObjects.Text | null = null;
  private markerReached = false;
  private idleSinceMs: number | null = null;

  constructor() {
    super(key.scene.dock);
  }

  protected getLayout(): RoomLayout {
    // 24×14 dock bay: airlock wall at the bottom (spawn), sealed hub door
    // at the top ('-' doorway tiles), open floor with a crate block for
    // structure. Legend: StationMapBuilder CHAR_TO_TILE.
    return {
      grid: [
        '########################',
        '###########--###########',
        '#......................#',
        '#......................#',
        '#......................#',
        '#......................#',
        '#......................#',
        '#......####............#',
        '#......####............#',
        '#......................#',
        '#......................#',
        '#......................#',
        '###########--###########',
        '########################',
      ],
    };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    // Returning from the Hub spawns just inside the top door; a fresh
    // arrival spawns bottom-center, just inside the arrival airlock.
    // Just outside the hub door's 72px interaction radius (no accidental
    // immediate bounce-back on SPACE).
    if (data?.spawn === 'station_hub') {
      return { x: 12 * 32, y: 4 * 32 };
    }

    return { x: 12 * 32, y: 11 * 32 };
  }

  protected populateRoom(): void {
    // Arrival terminal (Station AI) — top-left of the bay.
    this.addStation({
      interactionKey: 'dockArrivalTutorial',
      label: 'Arrival Terminal',
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

    // Door to the Station Hub (opened in Phase C).
    this.addDoor({
      x: 12 * 32 - 16,
      y: 1 * 32 + 16,
      label: 'Station Hub',
      interactionKey: 'dockArrivalTutorial',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'dock_arrival',
      },
    });

    // Highlighted movement target (V3 Room 0 mini-game: "movement to
    // highlighted target"). Reaching it is a mechanic, not an event — no
    // canonical event exists for it and none is invented.
    this.marker = this.add
      .rectangle(17 * 32, 5 * 32, 36, 36, 0x5fd3c4, 0.35)
      .setStrokeStyle(2, 0x5fd3c4);
    this.tweens.add({
      targets: this.marker,
      alpha: { from: 1, to: 0.4 },
      duration: 700,
      repeat: -1,
      yoyo: true,
    });
    this.add
      .text(17 * 32, 5 * 32 - 34, 'Move here', {
        backgroundColor: '#000',
        color: '#5fd3c4',
        font: '12px monospace',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld);
  }

  protected onRoomEntered(): void {
    runOncePerSession('dock_started', () => {
      this.logRoomEvent('dockArrivalTutorial', 'dock_started');
    });

    this.showFeedbackMessage(
      'Station AI: WASD or arrow keys to move. Reach the highlighted marker.',
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
          'You skip the orientation. The station tasks remain available, but baseline comprehension is unclear.',
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
          'Station AI: use WASD or the arrow keys to move, and SPACE to interact.',
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
      this.marker.setFillStyle(0x5fd3c4, 0.9);
      this.markerHint = this.add
        .text(
          this.marker.x,
          this.marker.y - 56,
          'Marker reached — now check in at the Arrival Terminal (SPACE).',
          {
            backgroundColor: '#101820',
            color: '#ffffff',
            font: '13px monospace',
            padding: { x: 6, y: 3 },
          },
        )
        .setOrigin(0.5)
        .setDepth(Depth.AboveWorld);
      this.time.delayedCall(3000, () => {
        this.markerHint?.destroy();
        this.markerHint = null;
      });
    }
  }
}
