import { key } from '../constants';
import {
  incidentReconciliationScenario,
  ScenarioController,
} from '../scenarios';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { RoomScene } from '../world';

/**
 * Cross-entry archive task state. Lives at module scope (session lifetime)
 * because leave-and-return is a measured behaviour: the repeat-same-wrong-
 * code comparison and the returned-after-failure detection must survive
 * scene restarts (docs/game/rooms/01-archive-room.md failure/edge cases).
 */
const archiveSessionState = {
  lastWrongCode: null as string | null,
  hadFailure: false,
  leftAfterFailure: false,
};

/**
 * Archive Room — V3 §4 Room 1, docs/game/rooms/01-archive-room.md.
 * Q13/Q22–Q26: response to setback, feedback use, revision after failure,
 * blind repetition. The forced first failure is a scripted scientific
 * manipulation (approved plan §12): the naive access code A17 is
 * deterministically wrong for every participant; no hidden randomisation.
 *
 * Ported audit-first from the prototype station (option labels, feedback
 * strings, event sequences, and the didRepeat same-wrong-code check are
 * preserved verbatim). Additive canonical events: archive_room_entered,
 * archive_terminal_opened, archive_code_entered, archive_feedback_shown,
 * archive_log_compared, archive_abandoned, archive_returned_after_failure.
 * Five of these appear in no Q-row Events column of
 * MASTER_33_ALIGNMENT.md and carry room_id/task_id only (precedent:
 * engineer_clarification_requested). archive_abandoned (Q24) and
 * archive_returned_after_failure (Q24+Q25) ARE matrix-listed and carry
 * those study_item_ids via CANONICAL_EVENT_CONTEXT; their construct_id is
 * deliberately unset pending a psychometric decision (research-data-
 * reviewer F1). The five previously-mapped events keep their exact
 * CANONICAL_EVENT_CONTEXT mappings.
 */
export class ArchiveScene extends RoomScene {
  protected readonly roomId = 'archive_room';
  protected readonly roomInteractionKey: InteractionKey =
    'archiveAccessTerminal';

  /**
   * Pilot Scenario C (incident reconciliation) — additive station driven by
   * the src/scenarios framework; the canonical archive code-entry task and
   * its Q13/Q22–Q26 measurement are untouched. Recreated per scene
   * instance; progress lives at framework module scope.
   */
  private reconciliationScenario: ScenarioController | null = null;

  constructor() {
    super(key.scene.archive);
  }

  protected getLayout(): RoomLayout {
    // 20×13 archive: door to the Hub at the bottom, terminal alcove at the
    // top-center, shelf stacks left and right.
    return {
      grid: [
        '####################',
        '#..................#',
        '#..................#',
        '#.###...####...###.#',
        '#.###...####...###.#',
        '#..................#',
        '#.###..........###.#',
        '#.###..........###.#',
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
    // Archive terminal (top-center, on the '####' alcove).
    this.addStation({
      interactionKey: 'archiveAccessTerminal',
      label: 'Archive Terminal',
      texture: 'prop-archive-terminal',
      x: 10 * 32 - 16,
      y: 5.5 * 32,
      onPromptOpened: () => {
        this.logRoomEvent('archiveAccessTerminal', 'archive_terminal_opened');
        return true;
      },
    });

    // Log shelves (left stack) — the canonical "optional log comparison
    // step". Understandable, in-fiction support for revision; no
    // questionnaire wording, no puzzle.
    this.addStation({
      interactionKey: 'archiveLogShelves',
      label: 'Log Shelves',
      texture: 'prop-archive-shelves',
      x: 3 * 32,
      y: 6.5 * 32,
      onPromptOpened: () => {
        this.logRoomEvent('archiveLogShelves', 'archive_log_compared');
        this.showFeedbackMessage(
          'Access logs: code A17 was rotated out last cycle. Current entries reference the revised archive query format.',
        );
        return false;
      },
    });

    // Set dressing (decorative only).
    this.addDecor(16.5 * 32, 3.5 * 32, 'prop-archive-racks'); // right stack
    this.addDecor(16.5 * 32, 6.5 * 32, 'prop-archive-panels');
    this.addDecor(3 * 32, 3.5 * 32, 'prop-archive-racks'); // left-top stack

    // Pilot Scenario C: records reconciliation desk in the open south-east
    // floor area (16*32, 9*32), just south of the right shelf stack —
    // 193+ px from the entry spawn, 208 px from the Hub door, and 236+ px
    // from the terminal and log shelves, so no 72 px interaction radius
    // overlaps and every existing interactable stays the strict nearest
    // target on its own approach.
    this.reconciliationScenario = new ScenarioController(
      incidentReconciliationScenario,
      {
        logScenarioEvent: (eventType, context) =>
          this.logScenarioEvent(
            'archiveReconciliationDesk',
            eventType,
            context,
          ),
        showFeedback: (message) => this.showFeedbackMessage(message),
      },
    );
    // NEXT-07 Phase 3: shared scenario-console texture (identical ×4;
    // set in place so the config's promptBody closure stays intact).
    const reconciliationConfig = this.reconciliationScenario.buildStationConfig(
      {
        x: 16 * 32,
        y: 9 * 32,
      },
    );

    reconciliationConfig.texture = 'proc-console-scenario';
    this.addStation(reconciliationConfig);

    // Door back to the Station Hub. archive_abandoned fires on exit while
    // an attempt has failed and the task is incomplete (room doc edge
    // case: "never revises and leaves without completing").
    this.addDoor({
      x: 10 * 32, // center of the bottom '--'
      y: 11 * 32 + 16,
      label: 'Station Hub',
      texture: 'prop-hub-door-frame',
      interactionKey: 'archiveAccessTerminal',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'archive_room',
      },
    });
  }

  protected onRoomEntered(): void {
    this.logRoomEvent('archiveAccessTerminal', 'archive_room_entered');

    if (
      archiveSessionState.leftAfterFailure &&
      archiveSessionState.hadFailure &&
      !this.isArchiveCompleted()
    ) {
      archiveSessionState.leftAfterFailure = false;
      this.logRoomEvent(
        'archiveAccessTerminal',
        'archive_returned_after_failure',
      );
    }
  }

  /** Called by RoomScene just before a door transition executes. */
  protected onRoomExit(): void {
    if (archiveSessionState.hadFailure && !this.isArchiveCompleted()) {
      archiveSessionState.leftAfterFailure = true;
      this.logRoomEvent('archiveAccessTerminal', 'archive_abandoned');
    }

    // Leaving with the reconciliation scenario entered but uncommitted is
    // measured abandonment telemetry (framework logs once per departure).
    this.reconciliationScenario?.handleRoomExit();
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'archiveReconciliationDesk') {
      return this.reconciliationScenario?.getRootOptions() ?? [];
    }

    if (interactionKey !== 'archiveAccessTerminal') {
      return [];
    }

    // Options ported verbatim from the prototype (labels, feedback,
    // legacy event sequences, didRepeat check). Canonical additions:
    // archive_code_entered alongside legacy archive_attempt on both code
    // submissions; archive_feedback_shown when the failure feedback is
    // displayed.
    return [
      {
        label: 'Enter access code A17',
        feedback: 'Access failed. Terminal feedback available.',
        getEventTypes: () => {
          const didRepeat = archiveSessionState.lastWrongCode === 'A17';

          archiveSessionState.lastWrongCode = 'A17';
          archiveSessionState.hadFailure = true;

          return [
            'archive_attempt',
            'archive_code_entered',
            didRepeat
              ? 'archive_same_wrong_code_repeated'
              : 'archive_wrong_code',
            'archive_feedback_shown',
          ];
        },
      },
      {
        label: 'Read terminal feedback',
        feedback: 'Feedback reviewed.',
        getEventTypes: () => ['archive_feedback_used'],
      },
      {
        label: 'Try revised archive query',
        feedback: 'Archive query revised successfully.',
        getEventTypes: () => [
          'archive_attempt',
          'archive_code_entered',
          'archive_strategy_revision',
          'archive_completed',
        ],
        onSelected: () => {
          researchRuntime.sessionState.markRoomCompleted('archive_room');
          // Prototype parity (Repair beat): objective_completed fires once
          // when Archive + Repair are both complete, whichever finishes
          // second (see RoomScene.logObjectiveCompletedIfBothDone).
          this.logObjectiveCompletedIfBothDone();
        },
      },
    ];
  }

  private isArchiveCompleted(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('archive_room');
  }
}
