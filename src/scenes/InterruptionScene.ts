import { key } from '../constants';
import { RELAY_SUPERVISION_DUTY_ID } from '../data/duties';
import {
  AUX_ANTENNA_TASK_ID,
  COMPETING_TASK_STATUS_ACCEPTED,
  COMPETING_TASK_STATUS_COMPLETED,
  COMPETING_TASK_STATUS_STARTED,
  INTERRUPTION_STATUS_ALERT_IGNORED,
  INTERRUPTION_STATUS_RETURNED,
  INTERRUPTION_STATUS_SWITCHED_AWAY,
  RELAY_CHECKPOINT_STATUS_COMPLETED,
  RELAY_CHECKPOINT_STATUS_PENDING,
  RELAY_CHECKPOINT_TASK_ID,
  SWITCH_ORIGINAL_NONE,
} from '../data/missionVocabulary';
import { researchRuntime } from '../systems';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
} from '../world';
import { RoomScene, runOncePerSession } from '../world';

/**
 * Interruption Corridor — V3 §4 Room 7,
 * docs/game/rooms/07-interruption-corridor.md. Q08 (productiveness,
 * low-engagement reverse) + Q15 (Grit-S PE) + Q17-Q20 (Grit-S CI,
 * weak/exploratory — switching can be rational; only unresolved non-return
 * and abandoned prior goals are scored, never switching alone).
 *
 * FABLE-NEXT-05 rebuild: the interruption now competes against a genuinely
 * pending objective, and the return is an observed physical act.
 *
 * Stations:
 * - Comms Beacon (center): the offer. Legacy options, labels, feedback and
 *   event sequences preserved verbatim (interruption_focus_lost /
 *   interruption_alert_acknowledged and siblings ARE consumed by
 *   ScoringManager summary formulas — KEPT, flagged for the D2-family
 *   raw-vs-derived pass). The prompt body now offers the competing task
 *   concretely with balanced framing (not more urgent, not more valuable —
 *   framing recorded in metadata, a validity requirement).
 * - Relay Checkpoint (west): the original objective's own station — the
 *   relay check-in, available while the accepted relay-supervision duty is
 *   active (SessionState relay_checkpoint_status 'pending', set lazily on
 *   entry). Re-engaging it after a committed switch is the observed return
 *   act; completing the check-in is the original objective's completion
 *   interaction. Stays available until Final Core (the guaranteed later
 *   return opportunity).
 * - Antenna Junction (east): the competing task actually runs here (two
 *   chained interactions: align + confirm).
 *
 * Canonical emissions this rebuild adds/moves (task-file binding trigger
 * table; each once/session, enforced by status transitions + one-shot
 * flags):
 * - new_goal_offered — beacon prompt open (co-emitted with the FROZEN
 *   interruption_received moment: the alert presentation and the concrete
 *   offer coincide at the beacon's single presentation moment); metadata:
 *   framing 'balanced', original_task_id ('relay_checkpoint' | null when
 *   nothing is genuinely pending — the recorded NO-OPPORTUNITY state;
 *   analysts exclude null, the formal spec §8.2 opportunity-flag
 *   convention stays open), competing_task_id.
 * - goal_switch_accepted — switch option selected (commit), with the same
 *   metadata keys.
 * - switched_task — MOVED from the beacon dialogue to the junction's first
 *   real interaction (legacy interruption_new_task_chosen stays at the
 *   dialogue moment, unchanged).
 * - return_to_unfinished_task + returned_to_original_task — CO-FIRED at
 *   the physical return act (checkpoint re-engaged after a committed
 *   switch, while still pending). Whether the co-fire stands or one name
 *   is folded is research-owner decision SA-9 — deliberately not decided
 *   locally; shared evidence, never two observations (spec §8).
 * - prior_goal_completed — the check-in's completion interaction; co-fired
 *   with task_completed_after_interruption iff the beacon interruption
 *   occurred earlier in the session (same act, shared evidence).
 * - prior_goal_abandoned — MOVED to Final-Core-bound closure
 *   (FinalCoreScene emits it at completion while the original was
 *   genuinely pending and never completed); no explicit abandon act exists
 *   in this design. Legacy interruption_previous_task_abandoned stays at
 *   the dialogue moment, unchanged.
 * Unchanged: interruption_corridor_entered, objective_active (state-
 * grounded once/session), task_avoidance (ignore branch),
 * final_unresolved_due_to_nonreturn (Final Core entry, reads
 * interruption_status). Deliberately unemitted: competing_task_viewed
 * (D6), excessive_idle_after_instruction (D3), task_deferred (CANDIDATE),
 * task_started (D7) — and the competing task's own completion has NO
 * canonical event name (not invented; documented in the room doc).
 *
 * interruption_status: legacy writes preserved verbatim (switch ->
 * switched_away, acknowledge -> returned_to_task, ignore -> alert_ignored,
 * at option selection). Additive transition: completing the check-in after
 * a committed switch sets returned_to_task, so Final Core's closure reads
 * reflect the observed return.
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
      texture: 'proc-beacon-comms',
      promptBody:
        'A new comms alert interrupts your current station work with a different request: the auxiliary antenna feed at the corridor junction has drifted off-axis and needs a manual realignment — a task of comparable size to your current work. How do you respond?',
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
        // NEXT-05: the concrete competing offer, with balanced framing and
        // the no-opportunity state recorded (original_task_id null when
        // nothing is genuinely pending).
        this.logRoomEvent('interruptionCorridor', 'new_goal_offered', {
          metadata: this.buildOfferMetadata(),
        });
        return true;
      },
    });

    // Relay Checkpoint (west) — the original objective's own station.
    this.addStation({
      interactionKey: 'interruptionRelayCheckpoint',
      label: 'Relay Checkpoint',
      x: 6 * 32,
      y: 2.5 * 32,
      texture: 'proc-console-wall',
      promptBody:
        'Relay checkpoint — the supervision log is due for a check-in.',
      onPromptOpened: () => this.onCheckpointOpened(),
    });

    // Antenna Junction (east) — the competing task's station.
    this.addStation({
      interactionKey: 'interruptionAuxJunction',
      label: 'Antenna Junction',
      x: 18 * 32,
      y: 2.5 * 32,
      texture: 'proc-beacon-comms',
      promptBody: 'Auxiliary antenna feed access panel.',
      onPromptOpened: () => this.onJunctionOpened(),
    });

    // Door back to the Station Hub.
    this.addDoor({
      x: 12 * 32, // center of the bottom '--'
      y: 7 * 32 + 16,
      label: 'Station Hub',
      texture: 'prop-hub-door-frame',
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

    const mission = researchRuntime.sessionState.getMissionState();

    // NEXT-05: the relay check-in becomes the genuinely pending original
    // objective while the accepted relay-supervision duty is active
    // (lazily recorded — the Engineer Hub is out of this unit's scope).
    if (
      mission.active_objectives.includes(RELAY_SUPERVISION_DUTY_ID) &&
      mission.relay_checkpoint_status !== RELAY_CHECKPOINT_STATUS_PENDING &&
      mission.relay_checkpoint_status !== RELAY_CHECKPOINT_STATUS_COMPLETED
    ) {
      researchRuntime.sessionState.setRelayCheckpointStatus(
        RELAY_CHECKPOINT_STATUS_PENDING,
      );
    }

    // Q18 (weak/exploratory): a multi-room objective is genuinely active
    // at this checkpoint. State-grounded — only fires when
    // active_objectives is non-empty (e.g. the accepted relay supervision
    // duty), once per session.
    if (mission.active_objectives.length > 0) {
      runOncePerSession('interruption_objective_active', () => {
        this.logRoomEvent('interruptionCorridor', 'objective_active');
      });
    }
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'interruptionRelayCheckpoint') {
      return this.buildCheckpointOptions();
    }

    if (interactionKey === 'interruptionAuxJunction') {
      return this.buildJunctionOptions();
    }

    if (interactionKey !== 'interruptionCorridor') {
      return [];
    }

    // Legacy options verbatim (labels, feedback, event sequences — the
    // derived-style names are ScoringManager-consumed and stay KEPT,
    // flagged for the D2-family pass). Canonical additions follow the
    // NEXT-05 binding table: goal_switch_accepted at the switch commit
    // (with metadata); switched_task and the return/completion events are
    // now observed at the real stations, never here.
    return [
      {
        label: 'Switch fully to the new request and leave the previous task.',
        feedback:
          'You follow the new alert, but the previous task is left unfinished.',
        getEventTypes: () => [
          'interruption_new_task_chosen',
          'interruption_previous_task_abandoned',
          'interruption_focus_lost',
        ],
        onSelected: () => {
          researchRuntime.sessionState.setInterruptionStatus(
            INTERRUPTION_STATUS_SWITCHED_AWAY,
          );
          researchRuntime.sessionState.setCompetingTaskStatus(
            COMPETING_TASK_STATUS_ACCEPTED,
          );
          // FREEZE the opportunity state at the commit moment: a duty
          // accepted later must never retroactively make this switch's
          // return/abandonment observations interpretable (gameplay-review
          // finding; task-file no-opportunity rule).
          researchRuntime.sessionState.setSwitchOriginalTaskId(
            this.isCheckpointPending()
              ? RELAY_CHECKPOINT_TASK_ID
              : SWITCH_ORIGINAL_NONE,
          );
          this.markInterruptionLogged();
          this.logRoomEvent('interruptionCorridor', 'goal_switch_accepted', {
            metadata: this.buildOfferMetadata(),
          });
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

  /**
   * Metadata for the offer/commit events (schema §4 additive
   * clarification): balanced framing is a validity requirement; a null
   * original_task_id records the no-opportunity state (nothing genuinely
   * pending) so analysts can exclude the observation.
   */
  private buildOfferMetadata(): Record<string, unknown> {
    const mission = researchRuntime.sessionState.getMissionState();

    return {
      framing: 'balanced',
      original_task_id:
        mission.relay_checkpoint_status === RELAY_CHECKPOINT_STATUS_PENDING
          ? RELAY_CHECKPOINT_TASK_ID
          : null,
      competing_task_id: AUX_ANTENNA_TASK_ID,
    };
  }

  // ——————————————————————————— Relay Checkpoint ———————————————————————————

  private onCheckpointOpened(): boolean {
    const mission = researchRuntime.sessionState.getMissionState();

    if (mission.relay_checkpoint_status === RELAY_CHECKPOINT_STATUS_COMPLETED) {
      this.showFeedbackMessage('The relay check-in is already logged.');
      return false;
    }

    if (mission.relay_checkpoint_status !== RELAY_CHECKPOINT_STATUS_PENDING) {
      this.showFeedbackMessage('No relay check-in is scheduled for you.');
      return false;
    }

    // Terminal guard (research-data-review finding): once the mission
    // cycle is closed at Final Core, the closure evidence is final — a
    // late checkpoint interaction must not emit return/completion events
    // that contradict an already-emitted prior_goal_abandoned.
    if (mission.completed_rooms.includes('final_core_room')) {
      this.showFeedbackMessage(
        'The relay window closed with the mission cycle.',
      );
      return false;
    }

    // The observed return ACT: re-engaging the original task's station
    // after a committed switch, while the original is still pending.
    // return_to_unfinished_task (Q15) and returned_to_original_task (Q17)
    // co-fire at this same physical moment — SA-9 records the open fold
    // question; shared evidence, never two observations. Gated on the
    // COMMIT-TIME opportunity state (switch_original_task_id): a duty
    // accepted after an opportunity-less switch never retroactively makes
    // this act a "return".
    if (this.switchHadPendingOriginal(mission)) {
      runOncePerSession('interruption_return_act', () => {
        const metadata = {
          original_task_id: RELAY_CHECKPOINT_TASK_ID,
          competing_task_id: AUX_ANTENNA_TASK_ID,
        };

        this.logRoomEvent(
          'interruptionRelayCheckpoint',
          'return_to_unfinished_task',
          { metadata },
        );
        this.logRoomEvent(
          'interruptionRelayCheckpoint',
          'returned_to_original_task',
          { metadata },
        );
      });
    }

    return true;
  }

  private buildCheckpointOptions(): PromptOption[] {
    return [
      {
        label: 'Review the relay log.',
        feedback: '',
        getEventTypes: () => [],
        nextStage: (): PromptStage => ({
          body: 'Relay cycle nominal — no faults recorded since the last check.',
          options: [
            {
              label: 'Log the check-in as complete.',
              feedback: 'The relay check-in is logged.',
              getEventTypes: () => [],
              onSelected: () => this.completeCheckpoint(),
            },
          ],
        }),
      },
    ];
  }

  /**
   * The original objective's completion interaction (binding table):
   * prior_goal_completed always; task_completed_after_interruption iff the
   * beacon interruption occurred earlier in the session (same physical
   * act — shared evidence, never analysed as two observations). After a
   * committed switch this observed completion also settles
   * interruption_status to returned_to_task so Final Core's closure reads
   * (final_unresolved_due_to_nonreturn at entry, prior_goal_abandoned at
   * completion) reflect the real outcome.
   */
  private completeCheckpoint(): void {
    const mission = researchRuntime.sessionState.getMissionState();

    researchRuntime.sessionState.setRelayCheckpointStatus(
      RELAY_CHECKPOINT_STATUS_COMPLETED,
    );

    const metadata = { original_task_id: RELAY_CHECKPOINT_TASK_ID };

    this.logRoomEvent('interruptionRelayCheckpoint', 'prior_goal_completed', {
      metadata,
    });

    if (mission.completed_rooms.includes('interruption_corridor')) {
      this.logRoomEvent(
        'interruptionRelayCheckpoint',
        'task_completed_after_interruption',
        { metadata },
      );
    }

    if (
      mission.interruption_status === INTERRUPTION_STATUS_SWITCHED_AWAY &&
      this.switchHadPendingOriginal(mission)
    ) {
      researchRuntime.sessionState.setInterruptionStatus(
        INTERRUPTION_STATUS_RETURNED,
      );
    }
  }

  /**
   * Commit-time opportunity gate: only a switch committed WHILE the
   * check-in was genuinely pending has an interpretable return (the frozen
   * switch_original_task_id, never the live checkpoint status — a duty
   * accepted after the switch must not retroactively create the
   * observation).
   */
  private switchHadPendingOriginal(mission: {
    switch_original_task_id: string;
  }): boolean {
    return mission.switch_original_task_id === RELAY_CHECKPOINT_TASK_ID;
  }

  // ——————————————————————————— Antenna Junction ———————————————————————————

  private onJunctionOpened(): boolean {
    const mission = researchRuntime.sessionState.getMissionState();

    if (mission.competing_task_status === COMPETING_TASK_STATUS_COMPLETED) {
      this.showFeedbackMessage(
        'The auxiliary antenna feed is already aligned.',
      );
      return false;
    }

    // 'started' remains openable (defensive: prompt chains are atomic
    // today, but a started-never-completed state must never dead-end the
    // task — gameplay-review finding). switched_task fires only on the
    // accepted -> started transition, so a resume never re-emits it.
    if (
      mission.competing_task_status !== COMPETING_TASK_STATUS_ACCEPTED &&
      mission.competing_task_status !== COMPETING_TASK_STATUS_STARTED
    ) {
      this.showFeedbackMessage('The junction equipment is idle.');
      return false;
    }

    if (mission.competing_task_status === COMPETING_TASK_STATUS_ACCEPTED) {
      // The competing task's first real interaction (binding table):
      // switched_task is observed here, never at the beacon dialogue. The
      // accepted -> started transition enforces once/session. The
      // original_task_id is the COMMIT-TIME frozen value (never the live
      // checkpoint status).
      researchRuntime.sessionState.setCompetingTaskStatus(
        COMPETING_TASK_STATUS_STARTED,
      );
      this.logRoomEvent('interruptionAuxJunction', 'switched_task', {
        metadata: {
          original_task_id: this.switchHadPendingOriginal(mission)
            ? RELAY_CHECKPOINT_TASK_ID
            : null,
          competing_task_id: AUX_ANTENNA_TASK_ID,
        },
      });
    }

    return true;
  }

  private buildJunctionOptions(): PromptOption[] {
    // The competing task actually runs: two chained interactions. Its
    // completion has NO canonical event name (none is schema-listed and
    // names are never invented) — completion is recorded in
    // competing_task_status only, documented in the room doc.
    return [
      {
        label: 'Realign the feed to the reference bearing.',
        feedback: '',
        getEventTypes: () => [],
        nextStage: (): PromptStage => ({
          body: 'The feed holds steady on the reference bearing.',
          options: [
            {
              label: 'Confirm and log the realignment.',
              feedback: 'The auxiliary antenna feed is aligned and logged.',
              getEventTypes: () => [],
              onSelected: () => {
                researchRuntime.sessionState.setCompetingTaskStatus(
                  COMPETING_TASK_STATUS_COMPLETED,
                );
              },
            },
          ],
        }),
      },
    ];
  }

  private isCheckpointPending(): boolean {
    return (
      researchRuntime.sessionState.getMissionState().relay_checkpoint_status ===
      RELAY_CHECKPOINT_STATUS_PENDING
    );
  }

  private hasCommittedSwitch(competingTaskStatus: string): boolean {
    return (
      competingTaskStatus === COMPETING_TASK_STATUS_ACCEPTED ||
      competingTaskStatus === COMPETING_TASK_STATUS_STARTED ||
      competingTaskStatus === COMPETING_TASK_STATUS_COMPLETED
    );
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
