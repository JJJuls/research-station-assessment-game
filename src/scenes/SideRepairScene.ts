import { key } from '../constants';
import {
  SIDE_REPAIR_STATUS_ABANDONED_AFTER_START,
  SIDE_REPAIR_STATUS_COMPLETED,
  SIDE_REPAIR_STATUS_DEFERRED,
  SIDE_REPAIR_STATUS_IGNORED,
} from '../data/missionVocabulary';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { createRoomTaskState, RoomScene, runOncePerSession } from '../world';

/**
 * Ordered step ids of the accepted stabiliser repair (FABLE-NEXT-03 task A:
 * fetch component at the parts shelf, fit it at the work console, run the
 * system check). Recorded in each side_repair_step_completed event's
 * metadata.step (additive payload placement documented in event-schema.md,
 * control_error_count precedent). Steps are motorically trivial by design —
 * effort is observed as completed steps, never dexterity or duration.
 */
const SIDE_REPAIR_STEPS = [
  'fetch_component',
  'fit_component',
  'run_check',
] as const;

/**
 * Cross-entry side-repair task state (FABLE-NEXT-03; session lifetime —
 * accepted-task progress must survive scene restarts so defer-and-return
 * keeps completed steps, and a walk-away after real work is detectable at
 * the exit door). Follows the U2 roomTaskState factory precedent
 * (RepairScene/repairTaskState).
 */
interface SideRepairTaskState {
  /** Player explicitly accepted the repair (offer stage completed). */
  accepted: boolean;
  /** Count of completed SIDE_REPAIR_STEPS entries, in fixed order. */
  stepsCompleted: number;
  /**
   * Last decision was a formal deferral with no step completed since:
   * suppresses the walk-away abandonment on exit (defer is strategic
   * postponement, never abandonment — V3 confound control). Cleared by
   * the next completed step.
   */
  deferredSinceLastStep: boolean;
}

const sideRepairTaskState = createRoomTaskState<SideRepairTaskState>(
  'optional_side_repair_bay',
  () => ({
    accepted: false,
    stepsCompleted: 0,
    deferredSinceLastStep: false,
  }),
);

/**
 * Optional Side Repair Bay — V3 §4 Room 6,
 * docs/game/rooms/06-optional-side-repair-bay.md. Q07/Q16 (productiveness,
 * diligence), Q20 (Grit-S CI, weak/exploratory), Q29/Q32 (Goal-Time,
 * optional/exploratory). Voluntary effort beyond minimum requirements: not
 * required for progression, no gameplay power upgrade — only a visible
 * final-stability benefit.
 *
 * FABLE-NEXT-03 (task A): the one-press outcome assertions of the legacy
 * options 2-3 are retired and replaced by an observed multi-step task.
 * After acceptance the player completes three real steps (parts shelf ->
 * console fit -> system check); deferring keeps progress; leaving the room
 * after >=1 completed step without deferring is a real walk-away. Every
 * retired legacy event still fires at its observed semantic moment:
 * - accept family (side_repair_started + stabiliser_accepted +
 *   side_repair_accepted) on the explicit accept choice;
 * - abandonment pair (side_repair_abandoned_after_difficulty +
 *   side_repair_abandoned_after_start) at the observed walk-away (room
 *   exit), no longer as a self-reported one-press outcome;
 * - completion family (side_repair_completed + final_bonus_unlocked +
 *   side_repair_productive_persistence) when the final step completes.
 * side_repair_first_step fires at its semantic moment — the first
 * completed step — instead of being asserted at the accept press.
 * side_repair_step_completed (registered Q07/Q16) fires once per step with
 * metadata.step. The legacy ignore path (option 1) is preserved verbatim.
 *
 * Offer events (side_repair_opened + stabiliser_option_offered) fire only
 * while the task is unaccepted: after acceptance the bot prompt is the
 * work console, not an offer (re-entry never inflates Q29-tagged offers).
 *
 * Deliberately unemitted (candidates flagged in event-schema §4, never
 * built here): canonical side_repair_abandoned (the accepted-but-no-step
 * walk-away therefore emits nothing and stays resumable) and
 * side_repair_returned (return after defer is visible from the event
 * sequence). Any anomaly-arc or utility-stop mechanic stays SA-2-gated.
 */
export class SideRepairScene extends RoomScene {
  protected readonly roomId = 'optional_side_repair_bay';
  protected readonly roomInteractionKey: InteractionKey = 'optionalSideRepair';

  constructor() {
    super(key.scene.sideRepair);
  }

  protected getLayout(): RoomLayout {
    // 20×13 side bay: door to the Station Hub at the bottom-center (the
    // Hub's left-wall door leads here), utility bot alcove top-center,
    // parts shelves flanking.
    return {
      grid: [
        '####################',
        '#..................#',
        '#..................#',
        '#.##....####....##.#',
        '#.##....####....##.#',
        '#..................#',
        '#..................#',
        // Central segment kept clear: with the 32x42 player body a block
        // here overlaps the spawn (320,272) and seals the only approach
        // lane to the Utility Bot (Wave 1B runtime finding — the bot was
        // unreachable). Flanking parts shelves preserved.
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

  protected populateRoom(): void {
    // Utility Bot at the work console (top-center alcove). Placeholder
    // marker by design — no committed texture for this room in
    // outpost-assets-v1; a bot sprite is a future PixelLab decision.
    this.addStation({
      interactionKey: 'optionalSideRepair',
      label: 'Utility Bot',
      x: 10 * 32,
      y: 5.5 * 32,
      // Stage-dependent body (evaluated on every prompt open): the offer
      // framing must not re-present over the post-acceptance work-console
      // stages — the prompt is then a work console, not an offer.
      get promptBody() {
        return sideRepairTaskState.get().accepted
          ? 'The maintenance bot tracks the accepted stabiliser repair on its work order.'
          : 'A maintenance bot flags an optional repair. It is not required for the main cycle, but completing it would improve station stability. What do you do?';
      },
      onPromptOpened: () => {
        // Prototype one-shot gate, exact feedback text preserved. A
        // DEFERRED decision does not close the offer — the defer branch
        // exists precisely so returning later stays possible.
        if (this.isDecisionLogged()) {
          this.showFeedbackMessage(
            'The maintenance bot has already logged your side repair decision. Continue with the remaining station tasks.',
          );
          return false;
        }

        // Accepted task in progress: the prompt is the work console, not
        // a fresh offer — no offer events (they would inflate the
        // Q29-tagged opportunity count on every resume).
        if (sideRepairTaskState.get().accepted) {
          return true;
        }

        this.logRoomEvent('optionalSideRepair', 'side_repair_opened');
        this.logRoomEvent('optionalSideRepair', 'stabiliser_option_offered');
        return true;
      },
    });

    // Parts shelf (left flanking block beside the floor lane): the fetch
    // step of the accepted repair. Placeholder marker (see above).
    this.addStation({
      interactionKey: 'sideRepairPartsShelf',
      label: 'Parts Shelf',
      x: 3 * 32,
      y: 7 * 32 + 16,
      onPromptOpened: () => this.onPartsShelfOpened(),
    });

    // Door back to the Station Hub.
    this.addDoor({
      x: 10 * 32, // center of the bottom '--'
      y: 11 * 32 + 16,
      label: 'Station Hub',
      interactionKey: 'optionalSideRepair',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'optional_side_repair_bay',
      },
    });
  }

  protected onRoomEntered(): void {
    // V3 flow step 1: the optional repair is DISCOVERED. Once per session
    // (discovery is a first-encounter fact; re-entries are navigation).
    // No canonical *_room_entered event exists for this room and no new
    // name may be invented — scene_start covers generic entry logging.
    runOncePerSession('side_repair_discovered', () => {
      this.logRoomEvent('optionalSideRepair', 'side_repair_discovered');
    });
  }

  /**
   * Observed walk-away (FABLE-NEXT-03): leaving the room after completing
   * at least one real step, without a formal deferral since the last
   * completed step, is the abandonment the legacy option 2 could only
   * assert. Both legacy alias and canonical name fire here, in the legacy
   * option's order; the decision then closes one-shot (legacy semantics).
   * An accepted task with zero completed steps stays resumable and emits
   * nothing — canonical side_repair_abandoned (accepted-but-never-started
   * semantics) is an unresolved candidate, flagged, never invented here.
   */
  protected onRoomExit(): void {
    const state = sideRepairTaskState.get();

    if (
      state.accepted &&
      state.stepsCompleted >= 1 &&
      state.stepsCompleted < SIDE_REPAIR_STEPS.length &&
      !state.deferredSinceLastStep &&
      !this.isDecisionLogged()
    ) {
      this.logRoomEvent(
        'optionalSideRepair',
        'side_repair_abandoned_after_difficulty',
      );
      this.logRoomEvent(
        'optionalSideRepair',
        'side_repair_abandoned_after_start',
      );
      researchRuntime.sessionState.setSideRepairStatus(
        SIDE_REPAIR_STATUS_ABANDONED_AFTER_START,
      );
      this.markDecisionLogged();
    }
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'sideRepairPartsShelf') {
      return this.getPartsShelfOptions();
    }

    if (interactionKey !== 'optionalSideRepair') {
      return [];
    }

    if (sideRepairTaskState.get().accepted) {
      return this.getWorkConsoleOptions();
    }

    // Offer stage. Option 1 is the legacy ignore path verbatim (label,
    // feedback, event order, one-shot). The legacy one-press options 2-3
    // (asserted stop-after-difficulty / asserted completion) are retired
    // in favour of the observed multi-step task behind option 2; the
    // formal defer branch keeps its Wave 1A label/feedback/event.
    return [
      {
        label: 'Ignore the optional repair and move on.',
        feedback:
          'You skip the optional repair. The main path remains open, but the station issue is left unresolved.',
        getEventTypes: () => ['side_repair_ignored', 'side_repair_low_effort'],
        onSelected: () => {
          researchRuntime.sessionState.setSideRepairStatus(
            SIDE_REPAIR_STATUS_IGNORED,
          );
          this.markDecisionLogged();
        },
      },
      {
        label: 'Start the stabiliser repair.',
        feedback:
          'You take on the stabiliser repair. First step: collect the replacement part from the parts shelf.',
        // Legacy accept family at its unchanged semantic moment (the
        // explicit accept choice). side_repair_first_step now fires at
        // the observed first step instead of being asserted here.
        getEventTypes: () => [
          'side_repair_started',
          'stabiliser_accepted',
          'side_repair_accepted',
        ],
        onSelected: () => {
          sideRepairTaskState.get().accepted = true;
        },
      },
      {
        label: 'Log the repair for later in the cycle.',
        feedback:
          'You log the stabiliser repair for later in the cycle. The bot notes the deferral.',
        getEventTypes: () => ['side_repair_deferred'],
        onSelected: () => {
          // Strategic postponement, NOT abandonment: the room is not
          // marked complete, so the bot's offer stays open for a return
          // visit (V3 confound-control requirement).
          researchRuntime.sessionState.setSideRepairStatus(
            SIDE_REPAIR_STATUS_DEFERRED,
          );
        },
      },
    ];
  }

  /**
   * Work-console stages of the accepted repair. The step-2 label states
   * the misaligned mounting BEFORE the player commits, so the mild
   * difficulty rise is visible at the choice point (stable utility, no
   * stop signal — the Q27 utility-stop stage stays SA-2-gated and is NOT
   * built here). Deferring from any stage keeps progress.
   */
  private getWorkConsoleOptions(): PromptOption[] {
    const state = sideRepairTaskState.get();
    const deferOption: PromptOption = {
      label: 'Log the remaining work for later in the cycle.',
      feedback:
        'You log the remaining stabiliser work for later in the cycle. The bot notes the deferral.',
      getEventTypes: () => ['side_repair_deferred'],
      onSelected: () => {
        state.deferredSinceLastStep = true;
        researchRuntime.sessionState.setSideRepairStatus(
          SIDE_REPAIR_STATUS_DEFERRED,
        );
      },
    };

    if (state.stepsCompleted === 0) {
      return [
        {
          label: 'Review the work order.',
          feedback:
            'Work order: fetch the replacement stabiliser part from the parts shelf, then fit it here.',
          getEventTypes: () => [],
        },
        deferOption,
      ];
    }

    if (state.stepsCompleted === 1) {
      return [
        {
          label: 'Adjust the misaligned mounting and seat the part.',
          feedback:
            'The mounting resists, but careful adjustment seats the part. Last step: run the system check.',
          getEventTypes: () => [],
          onSelected: () => {
            this.completeStep('optionalSideRepair');
          },
        },
        deferOption,
      ];
    }

    return [
      {
        label: 'Run the system check.',
        feedback:
          'The stabiliser check passes. The bot logs the repair complete — station stability improves.',
        getEventTypes: () => [],
        onSelected: () => {
          this.completeStep('optionalSideRepair');
          // Legacy completion family at its unchanged semantic moment
          // (the repair actually finishing), in the legacy order.
          this.logRoomEvent('optionalSideRepair', 'side_repair_completed');
          this.logRoomEvent('optionalSideRepair', 'final_bonus_unlocked');
          this.logRoomEvent(
            'optionalSideRepair',
            'side_repair_productive_persistence',
          );
          researchRuntime.sessionState.setSideRepairStatus(
            SIDE_REPAIR_STATUS_COMPLETED,
          );
          this.markDecisionLogged();
        },
      },
      deferOption,
    ];
  }

  /** Parts shelf gate: only the accepted fetch step interacts. */
  private onPartsShelfOpened(): boolean {
    const state = sideRepairTaskState.get();

    if (!state.accepted || this.isDecisionLogged()) {
      this.showFeedbackMessage(
        'Racked stabiliser parts. The maintenance bot manages the work order.',
      );
      return false;
    }

    if (state.stepsCompleted >= 1) {
      this.showFeedbackMessage(
        'You already carry the replacement part. Fit it at the work console.',
      );
      return false;
    }

    return true;
  }

  private getPartsShelfOptions(): PromptOption[] {
    return [
      {
        label: 'Collect the replacement stabiliser part.',
        feedback:
          'You collect the replacement stabiliser part. Fit it at the work console.',
        getEventTypes: () => [],
        onSelected: () => {
          // The observed first step: side_repair_first_step (Q20
          // weak/exploratory early-engagement marker) fires at its
          // semantic moment, then the step record itself.
          this.logRoomEvent('sideRepairPartsShelf', 'side_repair_first_step');
          this.completeStep('sideRepairPartsShelf');
        },
      },
    ];
  }

  /**
   * Records the next step in fixed order: one act = one
   * side_repair_step_completed with metadata.step (event-schema §4
   * additive payload placement; control_error_count precedent). A
   * completed step also clears any pending deferral — new real work
   * re-opens walk-away detection.
   */
  private completeStep(interactionKey: InteractionKey) {
    const state = sideRepairTaskState.get();
    const step = SIDE_REPAIR_STEPS[state.stepsCompleted];

    state.stepsCompleted += 1;
    state.deferredSinceLastStep = false;

    this.logRoomEvent(interactionKey, 'side_repair_step_completed', {
      metadata: { step },
    });
  }

  private markDecisionLogged() {
    // One-shot guard prevents repeated assessment submissions from
    // inflating productiveness scores (prototype comment preserved).
    researchRuntime.sessionState.markRoomCompleted('optional_side_repair_bay');
  }

  private isDecisionLogged(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('optional_side_repair_bay');
  }
}
