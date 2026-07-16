import { key } from '../constants';
import { RELAY_SUPERVISION_DUTY_ID } from '../data/duties';
import { calibrationAnomalyScenario, ScenarioController } from '../scenarios';
import { researchRuntime } from '../systems';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
} from '../world';
import { RoomScene } from '../world';

/**
 * Engineer Hub / NPC Report-Back — V3 §4 Room 3,
 * docs/game/rooms/03-engineer-hub.md. Q09-Q11: interpersonal
 * accountability, dependable reporting, accepted duty follow-through.
 * Contract priority "very high" — fills the responsibility/dependability
 * gap without touching the persistence scoring model (V3 §1 rule 9/10).
 *
 * Report path ported audit-first from the prototype station (option
 * labels, feedback strings, legacy event sequences — including the
 * unmapped engineer_report_submitted_supervised and the derived-style
 * engineer_responsibility_* events — preserved verbatim; the one-shot
 * already-submitted gate keeps its exact prototype feedback text).
 *
 * New per contract (previously unimplemented, not misnamed): the relay
 * supervision duty. After any report submission, Kai offers the duty in a
 * chained prompt stage (U3): accepting logs engineer_supervision_assigned
 * + engineer_supervision_accepted (Q10, responsibility) and records the
 * duty in SessionState (accepted_duties + active_objectives); declining
 * logs engineer_supervision_declined and records skipped_duties — declining
 * is a valid choice, never a penalty (room doc edge case). The
 * completion/skip check and accepted_duty_unresolved emission are
 * deliberately DEFERRED to the Final Core beat: the contract places that
 * check "at Final Core or related station point", and inventing an earlier
 * check point would be an undocumented scientific decision.
 *
 * Additive canonical event: engineer_hub_entered (every entry; unmapped —
 * no Events-column listing).
 */
export class EngineerScene extends RoomScene {
  protected readonly roomId = 'engineer_hub';
  protected readonly roomInteractionKey: InteractionKey = 'engineerReportBack';

  /**
   * Pilot Scenario A (calibration anomaly) — additive station driven by the
   * src/scenarios framework; the legacy Kai report task is untouched.
   * Recreated per scene instance; progress lives at framework module scope.
   */
  private calibrationScenario: ScenarioController | null = null;

  constructor() {
    super(key.scene.engineer);
  }

  protected getLayout(): RoomLayout {
    // 20×13 engineer hub: door to the Station Hub at the bottom, report
    // console alcove at the top-center, work benches on the flanks.
    return {
      grid: [
        '####################',
        '#..................#',
        '#..................#',
        '#.###...####...###.#',
        '#.###...####...###.#',
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
    // Engineer Kai at the report console (top-center alcove). No committed
    // texture exists for this room in outpost-assets-v1 — placeholder
    // marker by design (placeholder-first rule; a Kai sprite is a future
    // PixelLab decision needing fresh explicit approval).
    this.addStation({
      interactionKey: 'engineerReportBack',
      label: 'Engineer Kai',
      x: 10 * 32 - 16,
      y: 5.5 * 32,
      promptBody:
        'The station engineer asks for a status report before the next repair cycle. How do you respond?',
      onPromptOpened: () => {
        // Prototype one-shot gate, exact feedback text preserved.
        if (this.isReportSubmitted()) {
          this.showFeedbackMessage(
            'Engineer Kai has already logged your report. Continue with the remaining station tasks.',
          );
          return false;
        }

        this.logRoomEvent('engineerReportBack', 'engineer_report_opened');
        return true;
      },
    });

    // Pilot Scenario A: calibration bench in the east work-bench area,
    // well clear of Kai's alcove (192 px away — the 72 px interaction
    // radii can never overlap) and of the exit door path.
    this.calibrationScenario = new ScenarioController(
      calibrationAnomalyScenario,
      {
        logScenarioEvent: (eventType, context) =>
          this.logScenarioEvent('engineerCalibrationBench', eventType, context),
        showFeedback: (message) => this.showFeedbackMessage(message),
      },
    );
    this.addStation(
      this.calibrationScenario.buildStationConfig({ x: 16 * 32, y: 5.5 * 32 }),
    );

    // Door back to the Station Hub.
    this.addDoor({
      x: 10 * 32, // center of the bottom '--'
      y: 11 * 32 + 16,
      label: 'Station Hub',
      interactionKey: 'engineerReportBack',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'engineer_hub',
      },
    });
  }

  protected onRoomExit(): void {
    // Leaving with the calibration scenario entered but uncommitted is
    // measured abandonment telemetry (framework logs once per departure).
    this.calibrationScenario?.handleRoomExit();
  }

  protected onRoomEntered(): void {
    this.logRoomEvent('engineerReportBack', 'engineer_hub_entered');
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'engineerCalibrationBench') {
      return this.calibrationScenario?.getRootOptions() ?? [];
    }

    if (interactionKey !== 'engineerReportBack') {
      return [];
    }

    // Options ported verbatim from the prototype (labels, feedback strings,
    // legacy event sequences). Each report submission chains into the duty
    // offer stage; the legacy feedback string is displayed verbatim as the
    // first paragraph of the stage body (U3 suppresses the toast when a
    // follow-up stage opens).
    return [
      {
        label: 'Submit a quick report from memory.',
        feedback:
          'You give a fast answer, but miss several uncertainties that should have been checked.',
        getEventTypes: () => [
          'engineer_report_submitted_unprepared',
          'engineer_responsibility_shortcut',
        ],
        onSelected: () => this.markReportSubmitted(),
        nextStage: () =>
          this.buildDutyOfferStage(
            'You give a fast answer, but miss several uncertainties that should have been checked.',
          ),
      },
      {
        label: 'Review station evidence, then report.',
        feedback:
          'You check the available evidence and give a clearer, more dependable report.',
        getEventTypes: () => [
          'engineer_evidence_reviewed',
          'engineer_report_submitted_prepared',
          'engineer_responsibility_adaptive',
        ],
        onSelected: () => this.markReportSubmitted(),
        nextStage: () =>
          this.buildDutyOfferStage(
            'You check the available evidence and give a clearer, more dependable report.',
          ),
      },
      {
        label: 'Ask Engineer Kai for clarification before reporting.',
        feedback:
          'You clarify expectations before reporting, reducing the risk of a misleading update.',
        getEventTypes: () => [
          'engineer_clarification_requested',
          'engineer_report_submitted_supervised',
          'engineer_responsibility_adaptive',
        ],
        onSelected: () => this.markReportSubmitted(),
        nextStage: () =>
          this.buildDutyOfferStage(
            'You clarify expectations before reporting, reducing the risk of a misleading update.',
          ),
      },
    ];
  }

  /**
   * Relay supervision duty offer (V3 Room 3 core task, Q10). Logged as
   * engineer_supervision_assigned when the offer is shown. Both options
   * are framed as plausible workload decisions — the decline must never
   * read as the obviously "wrong" choice (V3 validity caution).
   */
  private buildDutyOfferStage(reportFeedback: string): PromptStage {
    this.logRoomEvent('engineerReportBack', 'engineer_supervision_assigned');

    return {
      body: `${reportFeedback}\n\nKai flags one more item: the relay cycle needs supervision until core activation. Will you take it on alongside your current tasks?`,
      options: [
        {
          label: 'Take on the relay supervision.',
          feedback:
            'Kai logs you as relay supervisor. The relay check stays on your active objectives until core activation.',
          getEventTypes: () => ['engineer_supervision_accepted'],
          onSelected: () => {
            researchRuntime.sessionState.addAcceptedDuty(
              RELAY_SUPERVISION_DUTY_ID,
            );
            researchRuntime.sessionState.addActiveObjective(
              RELAY_SUPERVISION_DUTY_ID,
            );
          },
        },
        {
          label: 'Pass on it — your current task load takes priority.',
          feedback:
            'Kai notes your decision and reassigns the relay check. Your current tasks remain unchanged.',
          getEventTypes: () => ['engineer_supervision_declined'],
          onSelected: () => {
            researchRuntime.sessionState.addSkippedDuty(
              RELAY_SUPERVISION_DUTY_ID,
            );
          },
        },
      ],
    };
  }

  private markReportSubmitted() {
    // One-shot guard prevents repeated assessment submissions from
    // inflating responsibility scores (prototype comment preserved).
    researchRuntime.sessionState.markRoomCompleted('engineer_hub');
  }

  private isReportSubmitted(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('engineer_hub');
  }
}
