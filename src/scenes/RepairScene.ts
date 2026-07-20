import { key } from '../constants';
import type { ResearchInteraction } from '../data/researchInteractions';
import { researchInteractions } from '../data/researchInteractions';
import { researchRuntime } from '../systems';
import type {
  InteractionKey,
  PromptOption,
  RoomLayout,
  StagePresentation,
} from '../world';
import {
  CANONICAL_EVENT_CONTEXT,
  createFailedTaskState,
  createRoomTaskState,
  type FailedTaskState,
  ICON_TEXTURES,
  recordFailedAttempt,
  RoomScene,
  shouldLogAbandonedOnExit,
  shouldLogReturnedOnEnter,
} from '../world';

/**
 * Cross-entry repair task state (U2 factory; session lifetime — the
 * repeat-same-failed-sequence comparison and returned-after-failure
 * detection must survive scene restarts, docs/game/rooms/
 * 02-systems-repair-room.md failure/edge cases).
 *
 * FABLE-NEXT-03 (task B) additions, same session lifetime so the bounded
 * multi-cycle sequence survives room exit and return without resetting:
 * - attemptCount: 1-indexed cycle counter; every submitted sequence
 *   (default, unguided adjustment, manual-guided revision) increments it
 *   and carries it as attempt_number on the canonical submission-family
 *   events (approved §3 payload field; legacy repair_attempt unchanged).
 * - manualGuided: the player has consulted repair guidance this session
 *   (panel manual option or the manual station). The revised sequence
 *   succeeds only when manual-guided — an unguided adjustment is a real,
 *   distinct failing cycle (Q23 safeguard: revision must reflect
 *   support/feedback, or a guessed option would masquerade as strategy
 *   revision).
 */
interface RepairTaskState extends FailedTaskState {
  attemptCount: number;
  manualGuided: boolean;
}

const repairTaskState = createRoomTaskState<RepairTaskState>(
  'systems_repair_room',
  () => ({
    ...createFailedTaskState(),
    attemptCount: 0,
    manualGuided: false,
  }),
);

/**
 * Shared side-panel/schematic strings (NEXT-08 Phase 7, reviewer
 * finding): the §6.2 diagnostic readout must re-render EXACTLY what the
 * status side panel shows, so both surfaces read from one constant set —
 * a wording edit can never silently diverge tracker from panel.
 */
const REPAIR_STATE_AWAITING = '[ ] awaiting first sequence';
const REPAIR_STATE_REJECTED = '[ ] sequence rejected';
const REPAIR_CYCLES_LINE = (cycles: number) => `Cycles logged: ${cycles}`;

/**
 * Systems Repair Room — V3 §4 Room 2, docs/game/rooms/02-systems-repair-room.md.
 * Q05/Q06/Q14/Q21/Q23-Q26: task initiation, repair after failure, manual
 * use, revised sequence, productive persistence. The default-sequence
 * failure is a scripted scientific manipulation: it fails deterministically
 * for every participant; no hidden randomisation.
 *
 * Ported audit-first from the prototype station (option labels, feedback
 * strings, legacy event sequences, and the didRepeat same-failed-sequence
 * check are preserved verbatim; the prototype scene keeps its own copy).
 * Additive canonical events: repair_room_entered, repair_panel_opened,
 * repair_sequence_submitted, repair_manual_opened, manual_page_reviewed,
 * repair_abandoned, repair_returned_after_failure. task_started is
 * deliberately NOT emitted — V3 §5 and MASTER_33_ALIGNMENT.md disagree on
 * its Q-listing (open documentation conflict; never guessed). The
 * abandon/return pair carries Q24/Q25 via CANONICAL_EVENT_CONTEXT with
 * construct_id deliberately unset (research-data-reviewer F1 precedent).
 *
 * FABLE-NEXT-03 (task B): the repair is a bounded multi-cycle difficulty
 * sequence. Each submitted sequence is a distinct cycle with
 * attempt_number on the canonical events (repair_sequence_submitted /
 * repair_failed / repair_same_sequence_repeated / repair_strategy_revision
 * / repair_completed — approved names only, no new names). The default
 * sequence always fails; an UNGUIDED "revised" adjustment fails as its own
 * distinct cycle; resubmitting the same failed sequence still logs the
 * repeated variant instead of a duplicate failure (didRepeat, unchanged
 * semantics); only the manual-guided revision succeeds and fires
 * repair_strategy_revision (registered success: true) + repair_completed.
 * Bounded in VARIETY, not submissions: only two failing sequence ids
 * exist (default, unguided adjustment). Repeat detection keeps the
 * preserved didRepeat semantics — it compares against the immediately
 * previous wrong submission only, so ALTERNATING the two failing
 * sequences logs a fresh repair_failed each time (never the repeated
 * variant); the D2-family scoring pass must account for this when
 * re-checking blind_retry_count/adaptive_retry_count. Legacy
 * repair_attempt fires on every submission with its payload unchanged.
 * Abandon/return (Q24/Q25) semantics are untouched.
 */
export class RepairScene extends RoomScene {
  protected readonly roomId = 'systems_repair_room';
  protected readonly roomInteractionKey: InteractionKey =
    'systemsRepairFailure';

  constructor() {
    super(key.scene.repair);
  }

  protected getLayout(): RoomLayout {
    // 20×13 repair bay: door to the Hub at the bottom, systems console
    // alcove at the top-center, machinery blocks flanking the floor.
    return {
      grid: [
        '####################',
        '#..................#',
        '#..................#',
        '#.##....####....##.#',
        '#.##....####....##.#',
        '#..................#',
        '#.##............##.#',
        '#.##............##.#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#########--#########',
        '####################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    // Just inside the Hub door, outside the 72px interaction radius.
    return { x: 10 * 32, y: 8.5 * 32 };
  }

  /**
   * FABLE-NEXT-06 Phase 4: read-only systems status side panel (shared
   * primitive) — current repair-cycle count and completion state only.
   * Deliberately does NOT display manual/guidance state: surfacing "manual
   * not consulted" would nudge manual use and confound its measurement.
   */
  private statusPanel: { setText: (value: string) => void } | null = null;

  private refreshStatusPanel(): void {
    if (this.statusPanel === null) {
      return;
    }

    const cycles = repairTaskState.get().attemptCount;
    const complete = researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('systems_repair_room');
    const lines = [
      'SYSTEMS BAY',
      '',
      'Repair task:',
      complete
        ? '[x] repair logged'
        : cycles === 0
          ? REPAIR_STATE_AWAITING
          : REPAIR_STATE_REJECTED,
      '',
      REPAIR_CYCLES_LINE(cycles),
    ];

    this.statusPanel.setText(lines.join('\n'));
  }

  protected onRoomUpdate(): void {
    this.refreshStatusPanel();
  }

  protected populateRoom(): void {
    this.statusPanel = this.addStatusSidePanel();
    this.refreshStatusPanel();

    // Repair panel (top-center, on the '####' alcove). No committed
    // texture exists for this room in outpost-assets-v1 — placeholder
    // rectangle by design (placeholder-first rule; PixelLab needs fresh
    // explicit approval).
    this.addStation({
      interactionKey: 'systemsRepairFailure',
      label: 'Repair Panel',
      x: 10 * 32 - 16,
      y: 5.5 * 32,
      texture: 'proc-console-wall',
      onPromptOpened: () => {
        this.logRoomEvent('systemsRepairFailure', 'repair_panel_opened');

        // FABLE-NEXT-03: completed repairs stay completed — the sequence
        // options never reopen, so a return visit can never double-log
        // repair_completed or grow attempt_number (no-duplicate-completion
        // persistence requirement; side-repair one-shot precedent).
        if (this.isRepairCompleted()) {
          this.showFeedbackMessage(
            'The system reads nominal — the repair is already complete.',
          );
          return false;
        }

        return true;
      },
    });

    // Repair manual station (left machinery block) — the canonical
    // "repair manual/log hints" system, distinct from the panel's legacy
    // manual option (archiveLogShelves precedent). Understandable,
    // in-fiction support for revision; no questionnaire wording.
    this.addStation({
      interactionKey: 'repairManualStation',
      label: 'Repair Manual',
      x: 3 * 32,
      y: 6.5 * 32,
      texture: 'proc-console-wall',
      onPromptOpened: () => {
        this.logRoomEvent('repairManualStation', 'repair_manual_opened');
        this.logRoomEvent('repairManualStation', 'manual_page_reviewed');
        // Manual consultation makes the next revised sequence
        // manual-guided (either manual surface counts — panel option or
        // this station).
        repairTaskState.get().manualGuided = true;
        this.showFeedbackMessage(
          'Maintenance manual: the default repair sequence predates the last calibration cycle. Current pages describe the revised sequence.',
        );
        return false;
      },
    });

    // Door back to the Station Hub. repair_abandoned fires on exit while
    // an attempt has failed and the repair is incomplete (room doc edge
    // case: "player leaves the repair unresolved").
    this.addDoor({
      x: 10 * 32, // center of the bottom '--'
      y: 11 * 32 + 16,
      label: 'Station Hub',
      texture: 'prop-hub-door-frame',
      interactionKey: 'systemsRepairFailure',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'systems_repair_room',
      },
    });
  }

  protected onRoomEntered(): void {
    this.logRoomEvent('systemsRepairFailure', 'repair_room_entered');

    if (
      shouldLogReturnedOnEnter(repairTaskState.get(), this.isRepairCompleted())
    ) {
      this.logRoomEvent(
        'systemsRepairFailure',
        'repair_returned_after_failure',
      );
    }
  }

  /** Called by RoomScene just before a door transition executes. */
  protected onRoomExit(): void {
    if (
      shouldLogAbandonedOnExit(repairTaskState.get(), this.isRepairCompleted())
    ) {
      this.logRoomEvent('systemsRepairFailure', 'repair_abandoned');
    }
  }

  /**
   * NEXT-08 Phase 3 (§6.2): tactile panel presentation for the repair
   * panel stage only. The schematic strip is static dressing (three slot
   * chips + component/manual glyphs, identical every visit); the
   * diagnostic readout re-renders ONLY the two lines the status side
   * panel already shows in text — the awaiting/rejected state line and
   * the cycle-count line, verbatim — and never which sequence is loaded,
   * whether the manual was consulted, or any cue distinguishing the
   * default from the revised sequence (§5.7; manualGuided is never
   * rendered). Option glyphs: sequence chip on options 1 and 3 (the same
   * glyph — deliberately indistinguishable), manual/document on option 2.
   */
  protected getStagePresentation(
    interactionKey: InteractionKey,
  ): StagePresentation | undefined {
    if (interactionKey !== 'systemsRepairFailure' || this.isRepairCompleted()) {
      return undefined;
    }

    const cycles = repairTaskState.get().attemptCount;

    return {
      surface: [
        {
          kind: 'schematic',
          readout: [
            cycles === 0 ? REPAIR_STATE_AWAITING : REPAIR_STATE_REJECTED,
            REPAIR_CYCLES_LINE(cycles),
          ],
        },
      ],
      optionIcons: {
        0: ICON_TEXTURES.slotChip,
        1: ICON_TEXTURES.manual,
        2: ICON_TEXTURES.slotChip,
      },
    };
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'systemsRepairFailure') {
      return [];
    }

    // Option labels and the legacy repair_attempt / feedback strings are
    // ported verbatim from the prototype. Events are logged in onSelected
    // (getEventTypes stays empty) so the canonical submission-family
    // events can carry attempt_number — the same-order equivalent of the
    // previous getEventTypes lists (InventoryScene logItemEvent
    // precedent).
    return [
      {
        label: 'Run default repair sequence',
        feedback: 'Repair failed. Manual may help.',
        getEventTypes: () => [],
        onSelected: () => {
          this.submitFailingSequence('default');
        },
      },
      {
        label: 'Open repair manual',
        feedback: 'Manual reviewed.',
        getEventTypes: () => ['repair_manual_used'],
        onSelected: () => {
          repairTaskState.get().manualGuided = true;
        },
      },
      {
        label: 'Apply revised repair sequence',
        feedback: repairTaskState.get().manualGuided
          ? 'Repair sequence revised successfully.'
          : 'The adjusted sequence fails. The calibration values do not match — the manual lists the current ones.',
        getEventTypes: () => [],
        onSelected: () => {
          const state = repairTaskState.get();

          if (!state.manualGuided) {
            // Unguided adjustment: a real, distinct failing cycle (or a
            // detected identical repeat of it) — never a strategy
            // revision (Q23: revision requires support/feedback).
            this.submitFailingSequence('unguided_revision');
            return;
          }

          state.attemptCount += 1;
          this.logRoomEvent('systemsRepairFailure', 'repair_attempt');
          this.logCycleEvent('repair_sequence_submitted', state.attemptCount);
          this.logCycleEvent('repair_strategy_revision', state.attemptCount);
          this.logCycleEvent('repair_completed', state.attemptCount);
          researchRuntime.sessionState.markRoomCompleted('systems_repair_room');
          this.logObjectiveCompletedIfBothDone();
        },
      },
    ];
  }

  /**
   * One failing submission cycle: legacy repair_attempt (payload
   * unchanged), canonical repair_sequence_submitted, then either
   * repair_failed (first failure of this sequence) or
   * repair_same_sequence_repeated (identical resubmission — didRepeat
   * check unchanged; the repeat REPLACES the failure event, never
   * duplicates it), all with the incremented attempt_number.
   */
  private submitFailingSequence(sequenceId: string) {
    const state = repairTaskState.get();
    const didRepeat = recordFailedAttempt(state, sequenceId);

    state.attemptCount += 1;
    this.logRoomEvent('systemsRepairFailure', 'repair_attempt');
    this.logCycleEvent('repair_sequence_submitted', state.attemptCount);
    this.logCycleEvent(
      didRepeat ? 'repair_same_sequence_repeated' : 'repair_failed',
      state.attemptCount,
    );
  }

  /**
   * logRoomEvent's payload shape with attempt_number attached (approved
   * event-schema §3 field; InventoryScene.logItemEvent precedent).
   * Canonical study_item_ids/construct_id/success context still comes
   * from CANONICAL_EVENT_CONTEXT — registrations untouched.
   */
  private logCycleEvent(eventType: string, attemptNumber: number) {
    const interaction: ResearchInteraction =
      researchInteractions.systemsRepairFailure;

    researchRuntime.logInteraction({
      scene: this.scene.key,
      episode: interaction.episode,
      event_type: eventType,
      object_id: interaction.object_id,
      x: this.player.x,
      y: this.player.y,
      room_id: interaction.room_id,
      task_id: interaction.task_id,
      attempt_number: attemptNumber,
      ...CANONICAL_EVENT_CONTEXT[eventType],
    });
  }

  private isRepairCompleted(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('systems_repair_room');
  }
}
