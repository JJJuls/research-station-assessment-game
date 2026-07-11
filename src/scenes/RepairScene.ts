import { key } from '../constants';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import {
  createFailedTaskState,
  createRoomTaskState,
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
 */
const repairTaskState = createRoomTaskState(
  'systems_repair_room',
  createFailedTaskState,
);

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

  protected populateRoom(): void {
    // Repair panel (top-center, on the '####' alcove). No committed
    // texture exists for this room in outpost-assets-v1 — placeholder
    // rectangle by design (placeholder-first rule; PixelLab needs fresh
    // explicit approval).
    this.addStation({
      interactionKey: 'systemsRepairFailure',
      label: 'Repair Panel',
      x: 10 * 32 - 16,
      y: 5.5 * 32,
      onPromptOpened: () => {
        this.logRoomEvent('systemsRepairFailure', 'repair_panel_opened');
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
      onPromptOpened: () => {
        this.logRoomEvent('repairManualStation', 'repair_manual_opened');
        this.logRoomEvent('repairManualStation', 'manual_page_reviewed');
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

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'systemsRepairFailure') {
      return [];
    }

    // Options ported verbatim from the prototype (labels, feedback, legacy
    // event sequences, didRepeat check). Canonical addition:
    // repair_sequence_submitted alongside legacy repair_attempt on both
    // sequence submissions (archive_code_entered precedent).
    return [
      {
        label: 'Run default repair sequence',
        feedback: 'Repair failed. Manual may help.',
        getEventTypes: () => {
          const didRepeat = recordFailedAttempt(
            repairTaskState.get(),
            'default',
          );

          return [
            'repair_attempt',
            'repair_sequence_submitted',
            didRepeat ? 'repair_same_sequence_repeated' : 'repair_failed',
          ];
        },
      },
      {
        label: 'Open repair manual',
        feedback: 'Manual reviewed.',
        getEventTypes: () => ['repair_manual_used'],
      },
      {
        label: 'Apply revised repair sequence',
        feedback: 'Repair sequence revised successfully.',
        getEventTypes: () => [
          'repair_attempt',
          'repair_sequence_submitted',
          'repair_strategy_revision',
          'repair_completed',
        ],
        onSelected: () => {
          researchRuntime.sessionState.markRoomCompleted('systems_repair_room');
          this.logObjectiveCompletedIfBothDone();
        },
      },
    ];
  }

  private isRepairCompleted(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('systems_repair_room');
  }
}
