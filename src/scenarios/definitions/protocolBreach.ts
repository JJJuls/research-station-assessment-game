import type { ScenarioDefinition, ScenarioOutcome } from '../scenarioTypes';

/**
 * Pilot Scenario D — colleague protocol breach (Inventory / Prep Room).
 *
 * The player discovers that the quartermaster — the colleague who runs
 * this room's prep console — cycled the outbound supply airlock overnight
 * with the seal verification overridden, and never filed the required
 * override report. The mitigating context is real: the verification
 * interlock was faulted (a ~1 hour reset) and a time-critical cold-chain
 * medical crate had a fixed transport window. The player signs off the
 * log review: report formally, fold the cycle into the fault record
 * (conceal), take it to the quartermaster and require a correcting
 * report, or leave it unreported. Every option carries a credible cost;
 * none is framed as the obviously "right" one; no questionnaire wording.
 *
 * All wording is in-fiction pilot content; scenario_* events are
 * pilot-development telemetry only (see scenarioTypes.ts governance note).
 */

const OUTCOMES: Record<string, ScenarioOutcome> = {
  report_breach: {
    consequence:
      'Command opens a formal review of the override. The quartermaster’s ' +
      'airlock authority is suspended while it runs, and the interlock ' +
      'fault is escalated for immediate repair.',
    acknowledgeFeedback: 'Airlock review sign-off logged.',
  },
  log_as_fault: {
    consequence:
      'The cycle is filed under the interlock fault with no override on ' +
      'record. The fault ticket absorbs the anomaly — and the override ' +
      'code entry stays in the raw system log, unmatched to any report.',
    acknowledgeFeedback: 'Airlock review sign-off logged.',
  },
  private_correction: {
    consequence:
      'The quartermaster files the late override report with the fault ' +
      'ticket and manifest attached. Command notes the report arrived a ' +
      'shift late; the review closes with a procedural reminder on file.',
    acknowledgeFeedback: 'Airlock review sign-off logged.',
  },
  leave_unreported: {
    consequence:
      'Your sign-off closes the review with the override unreported. The ' +
      'log keeps the raw entry, and the next audit sweep will read it ' +
      'without the context you have now.',
    acknowledgeFeedback: 'Airlock review sign-off logged.',
  },
};

export const protocolBreachScenario: ScenarioDefinition = {
  id: 'protocol_breach',
  interactionKey: 'inventorySealLog',
  stationLabel: 'Supply Airlock Seal Log',
  // Kept short: the briefing renders above 5 options inside the fixed
  // prompt-panel geometry (RoomScene renderer; ~3 wrapped lines of budget).
  briefing:
    'Last night’s outbound supply cycle ran with the airlock seal ' +
    'verification overridden under the quartermaster’s code, and no ' +
    'override report has been filed. The log flags it for your review ' +
    'sign-off.',
  evidence: [
    {
      id: 'cycle_log',
      label: 'Open the airlock cycle log.',
      body:
        'Cycle log — outbound 02:40: seal verification bypassed with a ' +
        'manual override, authorised under the quartermaster’s personal ' +
        'code. The crate cleared the airlock and made the 03:00 transport. ' +
        'No follow-up report is attached.',
    },
    {
      id: 'fault_ticket',
      label: 'Check the interlock fault ticket.',
      body:
        'Fault ticket — seal verification interlock: raised at 02:12, ' +
        '"verification cycle hangs at stage 2". The reset procedure takes ' +
        'roughly an hour. The ticket was still open when the airlock ' +
        'cycled at 02:40.',
    },
    {
      id: 'outbound_manifest',
      label: 'Review the outbound manifest (optional).',
      body:
        'Manifest — outbound 03:00 transport: one cold-chain medical ' +
        'resupply crate for the survey team, rated for four hours outside ' +
        'a cooled hold. It had been staged at the airlock since 01:50.',
      optional: true,
    },
  ],
  decision: {
    mode: 'single',
    prompt:
      'Procedure requires every seal override to be reported within the ' +
      'shift. Your sign-off closes the log review. What do you do about ' +
      'the unreported override?',
    options: [
      {
        id: 'report_breach',
        label: 'Forward the override to station command for formal review.',
      },
      {
        id: 'log_as_fault',
        label: 'File the cycle under the interlock fault, no override noted.',
      },
      {
        id: 'private_correction',
        label: 'Take it to the quartermaster and have them file the report.',
      },
      {
        id: 'leave_unreported',
        label: 'Leave the entry as it is for now.',
      },
    ],
    confirmHint:
      'Your review sign-off is written to the airlock log and cannot be ' +
      'edited afterwards.',
  },
  decideOptionLabel: 'Enter your review sign-off.',
  stepAwayLabel: 'Step away from the terminal for now.',
  stepAwayFeedback: 'You step away. The review flag stays on the log.',
  completedFeedback:
    'You have already signed off the airlock log review for this shift.',
  resolveOutcome: (committedValue) =>
    OUTCOMES[committedValue] ?? OUTCOMES.leave_unreported,
};
