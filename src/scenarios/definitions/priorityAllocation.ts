import type { ScenarioDefinition, ScenarioOutcome } from '../scenarioTypes';

/**
 * Pilot Scenario B — overnight priority-slot allocation (Station Hub).
 *
 * The player assigns two overnight power priority slots between three
 * competing station needs (safety margin, research assets, crew welfare)
 * against a clear performance target (green readiness at morning
 * inspection). The ordered two-slot pick uses the framework's reusable
 * ordering component; the consequence follows from whichever need was left
 * unpowered. Fairness pressure (crew repeatedly deprioritised for research
 * loads) conflicts with the scored target — no allocation is framed as the
 * obviously "right" one.
 *
 * All wording is in-fiction pilot content; scenario_* events are
 * pilot-development telemetry only (see scenarioTypes.ts governance note).
 */

const SLOT_SUMMARY: Record<string, string> = {
  life_support: 'scrubber margin',
  cryostore: 'sample cryostore',
  crew_quarters: 'crew quarters',
};

function committedSummary(committedValue: string): string {
  const picks = committedValue.split('>');
  const names = picks.map((id) => SLOT_SUMMARY[id] ?? id);

  return `Slots committed: ${names.join(', then ')}.`;
}

function leftOutOutcome(committedValue: string): ScenarioOutcome {
  const picks = committedValue.split('>');
  const leftOut = ['life_support', 'cryostore', 'crew_quarters'].find(
    (id) => !picks.includes(id),
  );

  const consequences: Record<string, string> = {
    life_support:
      'Overnight, the unpowered scrubber margin dips below the green line ' +
      'twice. The morning report flags an amber readiness excursion ' +
      'against tonight’s allocation.',
    cryostore:
      'Overnight, the unpowered cryostore drifts out of sample tolerance. ' +
      'The research team logs a formal protest that this month’s ' +
      'sample run may be void.',
    crew_quarters:
      'Overnight, the unpowered crew quarters drop to 12°C. Two crew ' +
      'members file cold-berth complaints noting that research loads were ' +
      'favoured over quarters again.',
  };

  return {
    consequence:
      `${committedSummary(committedValue)}\n\n` +
      (leftOut !== undefined
        ? consequences[leftOut]
        : 'The committed allocation is applied overnight.'),
    acknowledgeFeedback: 'Priority allocation committed.',
  };
}

export const priorityAllocationScenario: ScenarioDefinition = {
  id: 'priority_allocation',
  interactionKey: 'hubPriorityAllocation',
  stationLabel: 'Priority Allocation',
  // Kept short: the briefing renders above 5 options inside the fixed
  // prompt-panel geometry (RoomScene renderer; ~3 wrapped lines of budget).
  briefing:
    'Overnight power budget: two priority slots, three requests. Target: ' +
    'green station readiness at the morning inspection. Slots commit at ' +
    'shift end and hold until morning.',
  evidence: [
    {
      id: 'readiness_targets',
      label: 'Review the readiness targets.',
      body:
        'Readiness targets — the morning inspection scores scrubber ' +
        'margin and cryostore integrity. Crew comfort is not scored. ' +
        'Two cold-berth complaints from crew quarters are already on ' +
        'file from last week.',
    },
    {
      id: 'load_forecast',
      label: 'Review the load forecasts.',
      body:
        'Load forecast — unpowered overnight: the scrubbers hold minimum ' +
        'safe margin with a 60% probability; the cryostore breaches sample ' +
        'tolerance within six hours; crew quarters drop to 12°C by ' +
        'morning rotation.',
    },
    {
      id: 'crew_notes',
      label: 'Read the crew notes (optional).',
      body:
        'Crew note (Ito): “Third cold night this month. We keep ' +
        'covering for the research racks.” Crew note (Vasquez): ' +
        '“If the samples degrade, the whole month’s run is ' +
        'void.”',
      optional: true,
    },
  ],
  decision: {
    mode: 'ordered',
    prompt:
      'Assign the two overnight priority slots. Whatever is left unassigned ' +
      'runs unpowered until morning.',
    slotLabels: ['Priority slot 1', 'Priority slot 2'],
    candidates: [
      { id: 'life_support', label: 'Life-support scrubber margin' },
      { id: 'cryostore', label: 'Sample cryostore (research run)' },
      { id: 'crew_quarters', label: 'Crew quarters heating and comms' },
    ],
    confirmHint:
      'The allocation is written to the station record and holds until ' +
      'morning.',
  },
  decideOptionLabel: 'Assign the priority slots.',
  stepAwayLabel: 'Leave the console for now.',
  stepAwayFeedback: 'You step away. The allocation request stays open.',
  completedFeedback:
    'The console has already committed tonight’s priority slots.',
  resolveOutcome: leftOutOutcome,
};
