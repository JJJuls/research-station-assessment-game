import { key } from '../constants';
import { RELAY_SUPERVISION_DUTY_ID } from '../data/duties';
import { calibrationAnomalyScenario, ScenarioController } from '../scenarios';
import { researchRuntime } from '../systems';
import {
  evaluateReportAccuracy,
  getReportFacts,
  REPORT_CLAIMS,
} from '../utils/reportAccuracy';
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
 *
 * FABLE-NEXT-04 — report-accuracy evaluation substrate (Q09 raw
 * telemetry). Between the (verbatim) response-mode options and the duty
 * offer, a report-CONTENT stage now asks which status update is actually
 * sent: all four combinations of the two checkable mission facts
 * (systems repair cycle complete? field kit packed?) in fixed template
 * order — exactly one is fully accurate against the live SessionState.
 * The stage body differs by mode: quick = from memory only; evidence
 * review = a station log extract showing the actual values (evidence
 * genuinely accessible); clarification = Kai names which two facts he
 * needs (genuinely narrows scope, no answers). Selecting a statement is
 * the content submission: it emits engineer_report_accuracy_scored ONCE
 * per submission — unmapped raw telemetry (no CanonicalEventContext
 * registration, engineer_hub_entered precedent; adding a Q09 registration
 * is an explicit research-owner event-schema decision). The evaluation is
 * silent: identical neutral acknowledgement for every claim, no grade, no
 * moralising. All pre-existing events keep firing unchanged at their
 * original observed moments (the duty offer simply chains one stage
 * later, still logged when shown).
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

  /**
   * FABLE-NEXT-06 Phase 4: read-only report-desk status side panel
   * (shared primitive) — the one-shot report state and, once the offer
   * was decided, the relay-duty outcome. Deliberately shows NO pending
   * reminders beyond what the player already decided (no duty nudge, no
   * checkpoint reminder - measurement-neutral presentation).
   */
  private statusPanel: { setText: (value: string) => void } | null = null;

  private refreshStatusPanel(): void {
    if (this.statusPanel === null) {
      return;
    }

    const mission = researchRuntime.sessionState.getMissionState();
    const lines = ['REPORT DESK', '', 'Status report:'];

    lines.push(this.isReportSubmitted() ? '[x] logged' : '[ ] pending');

    if (mission.accepted_duties.includes(RELAY_SUPERVISION_DUTY_ID)) {
      lines.push('', 'Relay duty:', 'accepted');
    } else if (mission.skipped_duties.includes(RELAY_SUPERVISION_DUTY_ID)) {
      lines.push('', 'Relay duty:', 'reassigned');
    }

    this.statusPanel.setText(lines.join('\n'));
  }

  protected onRoomUpdate(): void {
    this.refreshStatusPanel();
  }

  protected populateRoom(): void {
    this.statusPanel = this.addStatusSidePanel();
    this.refreshStatusPanel();

    // Engineer Kai at the report console (top-center alcove). NEXT-07
    // Phase 1: procedural person-at-console composite (proc-npc-kai) — a
    // placeholder-tier stand-in documented as procedural art, pending the
    // gated external NPC pass. The station position, radius, label and
    // interaction are unchanged (art swaps never alter interaction
    // regions).
    this.addStation({
      interactionKey: 'engineerReportBack',
      label: 'Engineer Kai',
      x: 10 * 32 - 16,
      y: 5.5 * 32,
      texture: 'proc-npc-kai',
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
    // NEXT-07 Phase 3: shared scenario-console texture (identical ×4;
    // set in place so the config's promptBody closure stays intact).
    const calibrationConfig = this.calibrationScenario.buildStationConfig({
      x: 16 * 32,
      y: 5.5 * 32,
    });

    calibrationConfig.texture = 'proc-console-scenario';
    this.addStation(calibrationConfig);

    // Workshop dressing on the flanking bench blocks (NEXT-07 Phase 1,
    // A2 reuse per visual plan §3.3): committed props as machinery/parts
    // stock. Decorative only — duller than the two stations, no cyan.
    this.addDecor(96, 120, 'prop-archive-racks');
    this.addDecor(544, 120, 'prop-dock-crates');

    // Door back to the Station Hub.
    this.addDoor({
      x: 10 * 32, // center of the bottom '--'
      y: 11 * 32 + 16,
      label: 'Station Hub',
      texture: 'prop-hub-door-frame',
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
          this.buildReportContentStage(
            'unprepared',
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
          this.buildReportContentStage(
            'prepared',
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
          this.buildReportContentStage(
            'supervised',
            'You clarify expectations before reporting, reducing the risk of a misleading update.',
          ),
      },
    ];
  }

  /**
   * FABLE-NEXT-04 report-content stage: the actual status update sent to
   * Kai. Claims come from REPORT_CLAIMS in fixed template order (never
   * reordered by state — U3 determinism rule); exactly one is fully
   * accurate against the live SessionState. report_mode uses the existing
   * submitted-event vocabulary (unprepared/prepared/supervised).
   *
   * Mode-specific help (validity risk: the clarification path must
   * genuinely help, and evidence must be genuinely accessible):
   * - unprepared: memory only, no extract;
   * - prepared: station log extract showing the two actual values;
   * - supervised: Kai names the two facts he needs (no answers).
   *
   * Selecting a claim emits engineer_report_accuracy_scored once per
   * submission (session one-shot via the existing already-submitted gate)
   * with success = every checkable fact correct and metadata.accuracy =
   * 0-1 proportion (payload placement recorded additively in
   * event-schema.md §4 — control_error_count precedent). Feedback is the
   * same neutral acknowledgement for every claim: the evaluation is
   * silent, no grade is shown, and the duty offer chains exactly as
   * before.
   */
  private buildReportContentStage(
    reportMode: 'unprepared' | 'prepared' | 'supervised',
    reportFeedback: string,
  ): PromptStage {
    const mission = researchRuntime.sessionState.getMissionState();
    const facts = getReportFacts(mission);

    let modeHelp: string;

    if (reportMode === 'prepared') {
      modeHelp = `Station log — systems repair cycle: ${
        facts.systems_repair_complete ? 'logged complete' : 'still open'
      }. Field kit: ${facts.field_kit_packed ? 'packed' : 'not packed'}.`;
    } else if (reportMode === 'supervised') {
      modeHelp =
        'Kai narrows the request: he needs the systems repair cycle state and whether the field kit is packed.';
    } else {
      modeHelp = 'You compile the update from memory.';
    }

    return {
      body: `${reportFeedback}\n\n${modeHelp}\n\nWhich status update do you send?`,
      // NEXT-08 Phase 5 (§6.4): the mode-specific help sentence renders
      // inside a visually distinct inset — the log-extract treatment in
      // evidence-review mode, a plain inset otherwise — with the text
      // byte-identical (bodyInset carves the exact substring out of the
      // body; __lastPromptBody composition is untouched). The four claim
      // cards take the record-card treatment, labels verbatim, template
      // order. Deliberately NO fact-grid, tick-mark or decomposition:
      // the comparison work between claims is the Q09 measurement
      // substance. The mode stage and duty offer stay plain cards.
      presentation: {
        bodyInset: {
          text: modeHelp,
          treatment: reportMode === 'prepared' ? 'log' : 'plain',
        },
        recordCards: [0, 1, 2, 3],
      },
      options: REPORT_CLAIMS.map((claim) => ({
        label: claim.label,
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          const result = evaluateReportAccuracy(
            claim,
            researchRuntime.sessionState.getMissionState(),
          );

          this.logRoomEvent(
            'engineerReportBack',
            'engineer_report_accuracy_scored',
            {
              success: result.success,
              metadata: {
                report_mode: reportMode,
                accuracy: result.accuracy,
                facts_total: result.facts_total,
                facts_correct: result.facts_correct,
                claimed_systems_repair_complete:
                  claim.claimed_systems_repair_complete,
                claimed_field_kit_packed: claim.claimed_field_kit_packed,
                actual_systems_repair_complete:
                  result.actual_systems_repair_complete,
                actual_field_kit_packed: result.actual_field_kit_packed,
              },
            },
          );
        },
        nextStage: () =>
          this.buildDutyOfferStage('Kai logs your status update.'),
      })),
    };
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
