import { key } from '../constants';
import {
  INTERRUPTION_STATUS_ALERT_IGNORED,
  INTERRUPTION_STATUS_RETURNED,
  INTERRUPTION_STATUS_SWITCHED_AWAY,
} from '../data/missionVocabulary';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { RoomScene, runOncePerSession } from '../world';

/**
 * Interruption Corridor — V3 §4 Room 7,
 * docs/game/rooms/07-interruption-corridor.md. Q08 (productiveness,
 * low-engagement reverse) + Q15 (Grit-S PE) + Q17-Q20 (Grit-S CI,
 * weak/exploratory — switching can be rational; only unresolved non-return
 * and abandoned prior goals are scored, never switching alone).
 *
 * Ported audit-first from the prototype station: legacy options, feedback,
 * event sequences — including the derived-style interruption_focus_lost /
 * interruption_focus_maintained / interruption_possible_rigidity events —
 * preserved verbatim. Per scoring-plan §9, NO new interpretation-at-log-time
 * events are added; canonical additions are limited to the alias table's
 * direct renames plus the state-grounded objective_active:
 * - interruption_corridor_entered (every entry; unmapped),
 * - objective_active (Q18, CI-exploratory; once per session, emitted only
 *   while SessionState.active_objectives is genuinely non-empty — e.g. the
 *   relay supervision duty),
 * - interruption_received beside legacy interruption_opened (prompt open),
 * - switched_task / prior_goal_abandoned beside the switch triple,
 * - returned_to_original_task beside the return triple,
 * - task_avoidance beside the ignore triple (room-doc-directed mapping).
 *
 * Deliberately unemitted (documented in the room doc): competing_task_viewed
 * (open mapping decision vs legacy interruption_alert_acknowledged),
 * new_goal_offered / goal_switch_accepted / return_to_unfinished_task /
 * prior_goal_completed / task_completed_after_interruption (need real
 * cross-room objective mechanics, not fiction-only assertions),
 * final_unresolved_due_to_nonreturn (Final Core beat),
 * excessive_idle_after_instruction (blocked on the user-owned idle
 * definition — registered, never emitted; Dock precedent).
 */
export class InterruptionScene extends RoomScene {
  protected readonly roomId = 'interruption_corridor';
  protected readonly roomInteractionKey: InteractionKey =
    'interruptionCorridor';

  constructor() {
    super(key.scene.interruption);
  }

  protected getLayout(): RoomLayout {
    // 24×9 corridor: wide east-wing passage, door to the Station Hub at
    // the bottom-center, comms beacon alcove along the top wall.
    return {
      grid: [
        '########################',
        '#......................#',
        '#......................#',
        '#..##..............##..#',
        '#......................#',
        '#......................#',
        '#......................#',
        '###########--###########',
        '########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    // Just inside the Hub door, outside the 72px interaction radius of
    // both the door and the beacon.
    return { x: 12 * 32, y: 5 * 32 };
  }

  protected populateRoom(): void {
    // Comms beacon (top-center). Placeholder marker by design — no
    // committed texture for this room in outpost-assets-v1.
    this.addStation({
      interactionKey: 'interruptionCorridor',
      label: 'Comms Beacon',
      x: 12 * 32,
      y: 2.5 * 32,
      promptBody:
        'A new comms alert interrupts your current station work with a different request. How do you respond?',
      onPromptOpened: () => {
        // Prototype one-shot gate, exact feedback text preserved.
        if (this.isInterruptionLogged()) {
          this.showFeedbackMessage(
            'The comms interruption has already been logged. Continue with the remaining station tasks.',
          );
          return false;
        }

        this.logRoomEvent('interruptionCorridor', 'interruption_opened');
        this.logRoomEvent('interruptionCorridor', 'interruption_received');
        return true;
      },
    });

    // Door back to the Station Hub.
    this.addDoor({
      x: 12 * 32, // center of the bottom '--'
      y: 7 * 32 + 16,
      label: 'Station Hub',
      interactionKey: 'interruptionCorridor',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'interruption_corridor',
      },
    });
  }

  protected onRoomEntered(): void {
    this.logRoomEvent('interruptionCorridor', 'interruption_corridor_entered');

    // Q18 (weak/exploratory): a multi-room objective is genuinely active
    // at this checkpoint. State-grounded — only fires when
    // active_objectives is non-empty (e.g. the accepted relay supervision
    // duty), once per session.
    if (
      researchRuntime.sessionState.getMissionState().active_objectives.length >
      0
    ) {
      runOncePerSession('interruption_objective_active', () => {
        this.logRoomEvent('interruptionCorridor', 'objective_active');
      });
    }
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'interruptionCorridor') {
      return [];
    }

    // Legacy options verbatim; canonical direct-rename aliases emitted
    // adjacent to their legacy event (alias table, event-schema §4
    // Interruption Corridor). The legacy derived-style events stay
    // verbatim but gain no new interpretation events (scoring-plan §9).
    return [
      {
        label: 'Switch fully to the new request and leave the previous task.',
        feedback:
          'You follow the new alert, but the previous task is left unfinished.',
        getEventTypes: () => [
          'interruption_new_task_chosen',
          'switched_task',
          'interruption_previous_task_abandoned',
          'prior_goal_abandoned',
          'interruption_focus_lost',
        ],
        onSelected: () => {
          researchRuntime.sessionState.setInterruptionStatus(
            INTERRUPTION_STATUS_SWITCHED_AWAY,
          );
          this.markInterruptionLogged();
        },
      },
      {
        label:
          'Acknowledge the alert, then return to the unfinished station task.',
        feedback:
          'You note the alert without losing track of the original task.',
        getEventTypes: () => [
          'interruption_alert_acknowledged',
          'interruption_returned_to_original_task',
          'returned_to_original_task',
          'interruption_focus_maintained',
        ],
        onSelected: () => {
          researchRuntime.sessionState.setInterruptionStatus(
            INTERRUPTION_STATUS_RETURNED,
          );
          this.markInterruptionLogged();
        },
      },
      {
        label: 'Ignore the alert completely and continue without checking it.',
        feedback:
          'You stay focused, but you may miss relevant station information.',
        getEventTypes: () => [
          'interruption_alert_ignored',
          'task_avoidance',
          'interruption_single_task_focus',
          'interruption_possible_rigidity',
        ],
        onSelected: () => {
          researchRuntime.sessionState.setInterruptionStatus(
            INTERRUPTION_STATUS_ALERT_IGNORED,
          );
          this.markInterruptionLogged();
        },
      },
    ];
  }

  private markInterruptionLogged() {
    // One-shot guard prevents repeated assessment submissions from
    // inflating return-to-task scores (prototype comment preserved).
    researchRuntime.sessionState.markRoomCompleted('interruption_corridor');
  }

  private isInterruptionLogged(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('interruption_corridor');
  }
}
