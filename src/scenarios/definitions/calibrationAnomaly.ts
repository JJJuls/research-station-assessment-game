import type { ScenarioDefinition, ScenarioOutcome } from '../scenarioTypes';

/**
 * Pilot Scenario A — equipment calibration anomaly (Engineer Hub).
 *
 * The player finds a calibration drift on a sensor array under time
 * pressure (a closing transport window), can optionally inspect evidence,
 * and signs off the array status: report the drift now, sign the readings
 * off as valid, or hold the sign-off for a supervised re-check. Every
 * option embodies a credible operational demand (data integrity vs the
 * transport window vs delay) — no option is framed as the obviously
 * "right" one, and none uses questionnaire wording.
 *
 * All wording is in-fiction pilot content; scenario_* events are
 * pilot-development telemetry only (see scenarioTypes.ts governance note).
 */

const OUTCOMES: Record<string, ScenarioOutcome> = {
  report_drift: {
    consequence:
      'Recalibration starts immediately and array C goes offline for the ' +
      'rest of the shift. The supply request goes out one shift late with ' +
      'corrected figures; operations logs the missed transport window ' +
      'against tonight’s bench.',
    acknowledgeFeedback: 'Calibration sign-off logged.',
  },
  sign_off_as_valid: {
    consequence:
      'The transport window holds and the supply request goes out on time ' +
      'using array C’s figures. The maintenance queue now carries an ' +
      'unresolved drift flag for array C, and tomorrow’s coolant count ' +
      'will show whether the reserves were overstated.',
    acknowledgeFeedback: 'Calibration sign-off logged.',
  },
  hold_for_recheck: {
    consequence:
      'The sign-off is held for a supervised re-check next shift. The ' +
      'supply request waits on verified figures; whether it still makes ' +
      'the transport window now depends on how fast the re-check clears.',
    acknowledgeFeedback: 'Calibration sign-off logged.',
  },
};

export const calibrationAnomalyScenario: ScenarioDefinition = {
  id: 'calibration_anomaly',
  interactionKey: 'engineerCalibrationBench',
  stationLabel: 'Calibration Bench',
  // Kept short: the briefing renders above 5 options inside the fixed
  // prompt-panel geometry (RoomScene renderer; ~3 wrapped lines of budget).
  briefing:
    'Sensor array C shows calibration drift. Tonight’s readings feed ' +
    'the outgoing supply request, and the uplink window closes at end of ' +
    'shift. The bench asks for your sign-off on the array status.',
  evidence: [
    {
      id: 'drift_log',
      label: 'Review the drift log.',
      body:
        'Drift log — array C: +0.8% cumulative drift over the last ' +
        'three duty cycles. Readings taken this week may overstate coolant ' +
        'reserves. A full recalibration takes array C offline for the rest ' +
        'of the shift.',
    },
    {
      id: 'cross_check',
      label: 'Compare against array B.',
      body:
        'Cross-check — array B reports coolant reserves 6% lower than ' +
        'array C for the same tanks. The two arrays cannot both be right. ' +
        'Array B was serviced and re-certified last week.',
    },
    {
      id: 'extended_diagnostic',
      label: 'Run an extended diagnostic (optional).',
      body:
        'Extended diagnostic — fault isolated to array C’s ' +
        'reference cell. Every array C reading taken this week is ' +
        'unreliable until the cell is recalibrated. Diagnostic result has ' +
        'been attached to the bench log.',
      optional: true,
    },
  ],
  decision: {
    mode: 'single',
    prompt:
      'The supply request needs the array status before the uplink window ' +
      'closes. How do you sign off array C?',
    options: [
      {
        id: 'report_drift',
        label: 'Report the drift and request recalibration now.',
      },
      {
        id: 'sign_off_as_valid',
        label: 'Sign the readings off as valid to hold the uplink window.',
      },
      {
        id: 'hold_for_recheck',
        label: 'Hold the sign-off and schedule a supervised re-check.',
      },
    ],
    confirmHint:
      'The sign-off is written to the station record and cannot be edited ' +
      'afterwards.',
  },
  decideOptionLabel: 'Enter your sign-off.',
  stepAwayLabel: 'Step away from the bench for now.',
  stepAwayFeedback: 'You step away. The sign-off request stays open.',
  completedFeedback:
    'The bench has already logged your calibration sign-off for this shift.',
  resolveOutcome: (committedValue) =>
    OUTCOMES[committedValue] ?? OUTCOMES.hold_for_recheck,
};
