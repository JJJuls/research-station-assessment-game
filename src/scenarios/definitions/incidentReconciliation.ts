import type { ScenarioDefinition, ScenarioOutcome } from '../scenarioTypes';

/**
 * Pilot Scenario C — incident-report reconciliation (Archive Room).
 *
 * The player reviews two conflicting station records about last cycle's
 * pressure spike under an accountability deadline (the section review
 * closes tonight, and sections with an unresolved incident lose their
 * green readiness rating). The reconciliation entry is filed under the
 * player's name: file the discrepancy as it stands, smooth the timeline,
 * attribute the mismatch to an instrument fault, or hold the file for an
 * extended review. Every option carries a credible operational cost and
 * none is framed as the obviously "right" one; no questionnaire wording.
 *
 * All wording is in-fiction pilot content; scenario_* events are
 * pilot-development telemetry only (see scenarioTypes.ts governance note).
 */

const OUTCOMES: Record<string, ScenarioOutcome> = {
  file_discrepancy: {
    consequence:
      'The file goes in with the discrepancy on record. The section drops ' +
      'to amber for tonight’s review, and the night crew is asked to ' +
      'account for the inspection timing next shift.',
    acknowledgeFeedback: 'Reconciliation entry filed.',
  },
  align_timeline: {
    consequence:
      'The entry shows a consistent timeline and the section holds green ' +
      'for the review. The original sensor extract stays in the raw ' +
      'archive tier, one query away from anyone who looks.',
    acknowledgeFeedback: 'Reconciliation entry filed.',
  },
  attribute_clock_fault: {
    consequence:
      'The mismatch is filed as instrument timing. The section holds ' +
      'green, and a calibration ticket is raised against a sensor array ' +
      'whose clock history shows no fault.',
    acknowledgeFeedback: 'Reconciliation entry filed.',
  },
  request_extended_review: {
    consequence:
      'The file is held for an extended records review next cycle. The ' +
      'review board logs the incident as open past its deadline; section ' +
      'readiness shows "under review" until the second pass clears.',
    acknowledgeFeedback: 'Reconciliation entry filed.',
  },
};

export const incidentReconciliationScenario: ScenarioDefinition = {
  id: 'incident_reconciliation',
  interactionKey: 'archiveReconciliationDesk',
  stationLabel: 'Records Reconciliation Desk',
  // Kept short: the briefing renders above 5 options inside the fixed
  // prompt-panel geometry (RoomScene renderer; ~3 wrapped lines of budget).
  briefing:
    'The incident file on last cycle’s pressure spike is due before the ' +
    'section review closes tonight. The sensor record and the maintenance ' +
    'duty report disagree, and the reconciliation goes out under your name.',
  evidence: [
    {
      id: 'sensor_record',
      label: 'Pull the automated sensor record.',
      body:
        'Sensor record — deck 2 pressure line: the spike begins at 21:14. ' +
        'The valve inspection tag for the same line is time-stamped 21:22, ' +
        'after the spike was already underway.',
    },
    {
      id: 'duty_report',
      label: 'Read the maintenance duty report.',
      body:
        'Duty report — night crew: valve inspection on the deck 2 line ' +
        'logged as completed at 21:05 with no anomalies, nine minutes ' +
        'before the recorded spike. Signed by the duty technician at end ' +
        'of shift.',
    },
    {
      id: 'clock_history',
      label: 'Check the sensor clock history (optional).',
      body:
        'Clock history — deck 2 sensor array: last synchronisation three ' +
        'days ago, drift within tolerance since. A timestamp offset large ' +
        'enough to explain the gap would need a power event; none is on ' +
        'record for that window.',
      optional: true,
    },
  ],
  decision: {
    mode: 'single',
    prompt:
      'The review board takes the reconciliation entry as filed, and ' +
      'sections with an unresolved incident drop from green readiness ' +
      'tonight. How do you file it?',
    options: [
      {
        id: 'file_discrepancy',
        label: 'File the records as they stand, discrepancy included.',
      },
      {
        id: 'align_timeline',
        label: 'Adjust the entry so both records show a consistent timeline.',
      },
      {
        id: 'attribute_clock_fault',
        label: 'Attribute the mismatch to a sensor clock fault.',
      },
      {
        id: 'request_extended_review',
        label: 'Hold the file and request an extended records review.',
      },
    ],
    confirmHint:
      'The reconciliation entry is filed to the incident record and cannot ' +
      'be edited afterwards.',
  },
  decideOptionLabel: 'File the reconciliation entry.',
  stepAwayLabel: 'Step away from the desk for now.',
  stepAwayFeedback: 'You step away. The incident file stays open on the desk.',
  completedFeedback:
    'The reconciliation entry for the pressure spike has already been ' +
    'filed this shift.',
  resolveOutcome: (committedValue) =>
    OUTCOMES[committedValue] ?? OUTCOMES.request_extended_review,
};
