import { key } from '../constants';
import { RELAY_SUPERVISION_DUTY_ID } from '../data/duties';
import {
  FIELD_KIT_ITEM_ID,
  FINAL_CORE_STATUS_FORCED,
  FINAL_CORE_STATUS_HIGH_QUALITY,
  FINAL_CORE_STATUS_LOW_QUALITY,
  FINAL_CORE_STATUS_STRUCTURED,
  INTERRUPTION_STATUS_SWITCHED_AWAY,
  SIDE_REPAIR_STATUS_COMPLETED,
  WORKSPACE_STATUS_DISORDERED,
} from '../data/missionVocabulary';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { RoomScene, runOncePerSession } from '../world';

/**
 * Final Core Room — V3 §4 Room 8, docs/game/rooms/08-final-core-room.md.
 * Q04/Q10/Q11 (organisation cleanup, responsibility), Q28 (inappropriate
 * persistence — maladaptive), Q29/Q33 (Goal-Time, optional/exploratory).
 * Outcome/integration room: it must never become a global "good player"
 * score; final_core_status records the completion PATH only.
 *
 * Ported audit-first: the three legacy options (labels, feedback, event
 * sequences, one-shot gate text) are preserved verbatim and remain options
 * 1-3 in unchanged order. Canonical events are added additively.
 *
 * Cross-room integration (first consumer of the Wave 1A SessionState
 * writers) — system flag events fire once per session at room entry,
 * independent of player choices (they are system facts, so rushed players
 * still carry Q02/Q04 flags):
 * - prepared_items lacks field_kit  -> final_core_missing_item_flagged
 * - workspace_status = disordered   -> final_core_workspace_issue_flagged
 * - interruption switched_away      -> final_unresolved_due_to_nonreturn
 * - side_repair_status = completed  -> final_core_stability_bonus
 * (hazard consequence flags stay unemitted: Hazard Control is blocked on a
 * user decision and writes no state yet.)
 *
 * Q28 blocker: when unresolved issues exist at prompt open, the prompt
 * body lists them as outstanding core flags and final_core_blocker_shown
 * fires — the explicit blocker display. A 4th option (appended; legacy
 * order untouched) then allows forcing the synchronization through the
 * blocker (final_core_force_continue). With no outstanding issues the
 * prompt is exactly the legacy three options.
 *
 * Duty follow-through (contract: checked at Final Core): resolving the
 * remaining flags (legacy option 3) completes an active relay supervision
 * duty (engineer_supervision_completed); every completion path that leaves
 * the duty active logs accepted_duty_unresolved at completion time.
 * engineer_supervision_skipped stays unemitted — no distinct formal
 * skip-duty action exists, and inventing one is a task-design decision.
 *
 * Unemitted, documented: final_quality_score_computed,
 * final_summary_previewed, qualtrics_return_previewed — their emission
 * points live inside ScoringManager/QualtricsBridge debug-completion flow,
 * which is outside this wave's scope (qualtrics-logging-review gate);
 * final_hazard_issue / hazard-consequence display (blocked upstream).
 */
export class FinalCoreScene extends RoomScene {
  protected readonly roomId = 'final_core_room';
  protected readonly roomInteractionKey: InteractionKey =
    'finalCoreIntegration';

  /** Mutated at prompt open so the body lists live outstanding flags. */
  private coreStationConfig: { promptBody?: string } | null = null;

  constructor() {
    super(key.scene.finalCore);
  }

  protected getLayout(): RoomLayout {
    // 20×13 core chamber: door to the Station Hub at the bottom, core
    // interface alcove top-center, monitor banks flanking.
    return {
      grid: [
        '####################',
        '#..................#',
        '#..................#',
        '#.###..######..###.#',
        '#.###..######..###.#',
        '#..................#',
        '#..................#',
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
    const config = {
      interactionKey: 'finalCoreIntegration' as InteractionKey,
      label: 'Core Interface',
      x: 10 * 32,
      y: 5.5 * 32,
      promptBody: '',
      onPromptOpened: () => {
        // Prototype one-shot gate, exact feedback text preserved.
        if (this.isFinalCoreCompleted()) {
          this.showFeedbackMessage(
            'The core interface has already logged the final integration decision.',
          );
          return false;
        }

        this.logRoomEvent('finalCoreIntegration', 'final_core_opened');

        const issues = this.getOutstandingIssueLabels();

        // Legacy prompt body verbatim; outstanding flags appended as the
        // status-board display the contract requires. Listing the flags IS
        // the explicit blocker display (Q28) when issues exist.
        this.coreStationConfig!.promptBody =
          'The core interface asks you to review the station status before closing the mission cycle. How do you proceed?' +
          (issues.length > 0
            ? `\n\nOutstanding core flags: ${issues.join('; ')}.`
            : '');

        if (issues.length > 0) {
          this.logRoomEvent('finalCoreIntegration', 'final_core_blocker_shown');
        }

        return true;
      },
    };

    this.coreStationConfig = config;
    this.addStation(config);

    // Door back to the Station Hub.
    this.addDoor({
      x: 10 * 32, // center of the bottom '--'
      y: 11 * 32 + 16,
      label: 'Station Hub',
      interactionKey: 'finalCoreIntegration',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'final_core_room',
      },
    });
  }

  protected onRoomEntered(): void {
    this.logRoomEvent('finalCoreIntegration', 'final_core_entered');

    // System flag events: once per session, computed from SessionState —
    // facts about prior rooms, independent of what the player chooses here.
    runOncePerSession('final_core_entry_flags', () => {
      const mission = researchRuntime.sessionState.getMissionState();

      if (!mission.prepared_items.includes(FIELD_KIT_ITEM_ID)) {
        this.logRoomEvent(
          'finalCoreIntegration',
          'final_core_missing_item_flagged',
        );
      }

      if (mission.workspace_status === WORKSPACE_STATUS_DISORDERED) {
        this.logRoomEvent(
          'finalCoreIntegration',
          'final_core_workspace_issue_flagged',
        );
      }

      if (mission.interruption_status === INTERRUPTION_STATUS_SWITCHED_AWAY) {
        this.logRoomEvent(
          'finalCoreIntegration',
          'final_unresolved_due_to_nonreturn',
        );
      }

      if (mission.side_repair_status === SIDE_REPAIR_STATUS_COMPLETED) {
        this.logRoomEvent('finalCoreIntegration', 'final_core_stability_bonus');
      }
    });
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'finalCoreIntegration') {
      return [];
    }

    const hasIssues = this.getOutstandingIssueLabels().length > 0;

    // Options 1-3 ported verbatim (labels, feedback, legacy event order);
    // canonical events inserted adjacent to their legacy alias. Additive
    // per-selection events are conditioned on REAL mission state (no
    // fiction-only assertions).
    const options: PromptOption[] = [
      {
        label: 'Start final synchronization immediately.',
        feedback:
          'You start synchronization quickly, but unresolved station issues remain unreviewed.',
        getEventTypes: () => [
          'final_core_quick_sync',
          'final_core_rushed',
          'final_core_unresolved_issues_ignored',
          'final_core_low_quality_completion',
          'final_core_completed',
          ...this.dutyUnresolvedEvents(),
        ],
        onSelected: () =>
          this.markFinalCoreCompleted(FINAL_CORE_STATUS_LOW_QUALITY),
      },
      {
        label: 'Review station status, then integrate completed work.',
        feedback:
          'You review the station status and integrate the completed work in a structured sequence.',
        getEventTypes: () => [
          'final_core_status_reviewed',
          ...(hasIssues ? ['unresolved_issue_reviewed'] : []),
          'final_core_prior_results_integrated',
          'final_core_structured_completion',
          'final_core_completed',
          ...this.dutyUnresolvedEvents(),
        ],
        onSelected: () =>
          this.markFinalCoreCompleted(FINAL_CORE_STATUS_STRUCTURED),
      },
      {
        label: 'Resolve remaining issue flags before final synchronization.',
        feedback:
          'You address remaining issue flags before completing the final synchronization.',
        getEventTypes: () => {
          const dutyActive = this.isRelayDutyActive();

          return [
            'final_core_status_reviewed',
            ...(hasIssues ? ['unresolved_issue_reviewed'] : []),
            'final_core_remaining_issues_resolved',
            ...(hasIssues
              ? ['issue_resolution_attempted', 'final_core_issue_resolved']
              : []),
            ...(dutyActive ? ['engineer_supervision_completed'] : []),
            'final_core_high_quality_completion',
            'final_core_completed',
          ];
        },
        onSelected: () => {
          // Resolving the flags completes the accepted relay duty
          // (follow-through at the contract's Final Core check point).
          if (this.isRelayDutyActive()) {
            researchRuntime.sessionState.removeActiveObjective(
              RELAY_SUPERVISION_DUTY_ID,
            );
          }

          this.markFinalCoreCompleted(FINAL_CORE_STATUS_HIGH_QUALITY);
        },
      },
    ];

    if (hasIssues) {
      // Q28 core mechanic, appended so legacy order stays frozen: forcing
      // the synchronization through the displayed blocker flags.
      options.push({
        label: 'Force the synchronization through the outstanding flags.',
        feedback:
          'You force the synchronization through the outstanding flags. The mission cycle closes with unresolved issues.',
        getEventTypes: () => [
          'final_core_force_continue',
          'final_core_completed',
          ...this.dutyUnresolvedEvents(),
        ],
        onSelected: () => this.markFinalCoreCompleted(FINAL_CORE_STATUS_FORCED),
      });
    }

    return options;
  }

  /**
   * Outstanding-issue labels for the status display (in-fiction, no
   * questionnaire wording). Sources: Wave 1A SessionState writers only;
   * hazard consequences are absent until Hazard Control is unblocked.
   */
  private getOutstandingIssueLabels(): string[] {
    const mission = researchRuntime.sessionState.getMissionState();
    const labels: string[] = [];

    if (!mission.prepared_items.includes(FIELD_KIT_ITEM_ID)) {
      labels.push('field kit incomplete');
    }

    if (mission.workspace_status === WORKSPACE_STATUS_DISORDERED) {
      labels.push('prep workspace unresolved');
    }

    if (this.isRelayDutyActive()) {
      labels.push('relay supervision outstanding');
    }

    if (mission.interruption_status === INTERRUPTION_STATUS_SWITCHED_AWAY) {
      labels.push('station task unfinished after comms switch');
    }

    return labels;
  }

  /** accepted_duty_unresolved fires at completion while the duty is open. */
  private dutyUnresolvedEvents(): string[] {
    return this.isRelayDutyActive() ? ['accepted_duty_unresolved'] : [];
  }

  private isRelayDutyActive(): boolean {
    const mission = researchRuntime.sessionState.getMissionState();

    return (
      mission.accepted_duties.includes(RELAY_SUPERVISION_DUTY_ID) &&
      mission.active_objectives.includes(RELAY_SUPERVISION_DUTY_ID)
    );
  }

  private markFinalCoreCompleted(status: string) {
    // One-shot guard prevents repeated final-core submissions from
    // inflating integration scores (prototype comment preserved).
    researchRuntime.sessionState.markRoomCompleted('final_core_room');
    researchRuntime.sessionState.setFinalCoreStatus(status);
  }

  private isFinalCoreCompleted(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('final_core_room');
  }
}
