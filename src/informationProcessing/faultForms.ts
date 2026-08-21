/**
 * Pure fault-diagnosis forms + consistency helpers (Information
 * Processing foundation, M18).
 *
 * Phaser-free, runtime-free and `import.meta`-free so Node-side tests can
 * import it directly. Every reading, test result and interpretation rule
 * is a FIXED CONSTANT of the form — nothing here reads any M13 state, and
 * this file imports no M13 module.
 */

import type { FormId } from './model';

export interface FaultHypothesis {
  id: string;
  label: string;
}

export interface EvidencePanel {
  id: string;
  title: string;
  lines: readonly string[];
  /** Hypotheses this panel's content contradicts (by the in-task rules). */
  contradicts: readonly string[];
}

export interface DiagnosticTest {
  id: string;
  label: string;
  procedure: string;
  result: readonly string[];
  contradicts: readonly string[];
}

export interface FaultForm {
  id: FormId;
  brief: readonly string[];
  hypotheses: readonly FaultHypothesis[];
  panels: readonly EvidencePanel[];
  tests: readonly DiagnosticTest[];
  rules: readonly string[];
  correct: string;
}

/** The standardised reference lattice shown on the console (both forms). */
export const M18F_REFERENCE_LATTICE: readonly string[] = [
  'REFERENCE LATTICE (test rig, pressurised for the run):',
  'FEED ▶ [A2] → [A1] → [B1 valve] → [C1] → [C2] ▶ INTAKE',
  'Centre mount B2 fractured (bypassed). Run sealed at last service.',
];

const RULES_COMMON: readonly string[] = [
  'R1  A supply restriction upstream lowers the FEED reading itself.',
  'R2  A leaking valve seat shows MID well below FEED and a cycling seat indicator.',
  'R3  A seat that closes fully and reopens cleanly is holding (not leaking).',
  'R4  If an independent gauge agrees with a sensor, that sensor reads correctly.',
  'R5  Thermal anomalies point to electrical faults only; none → no electrical fault.',
  'R6  An ISOLATED section that keeps losing pressure has a leak inside it.',
  'R7  A leak just before the intake shows INTAKE well below MID; equal readings → no such leak.',
  'Nominal pressure band: 90–100 kPa at every tap.',
];

const HYPOTHESES: readonly FaultHypothesis[] = [
  {
    id: 'feed_restriction',
    label: 'Supply restriction upstream of the lattice',
  },
  { id: 'valve_seat_leak', label: 'Isolation valve seat not holding' },
  {
    id: 'intake_segment_leak',
    label: 'Leak in the segment just before the intake',
  },
  {
    id: 'intake_sensor_fault',
    label: 'Intake sensor reading incorrectly (flow actually normal)',
  },
];

export const M18F_FORMS: Record<FormId, FaultForm> = {
  A: {
    id: 'A',
    brief: [
      'Test run on the reference lattice: intake flow is LOW.',
      'Identify the single fault consistent with every reading.',
    ],
    hypotheses: HYPOTHESES,
    panels: [
      {
        id: 'pressure_map',
        title: 'E1  Pressure map',
        lines: [
          'FEED tap     96 kPa   (nominal 90–100)',
          'MID tap      95 kPa   (after the valve)',
          'INTAKE tap   58 kPa   (LOW)',
        ],
        contradicts: ['feed_restriction', 'valve_seat_leak'],
      },
      {
        id: 'valve_log',
        title: 'E2  Valve log',
        lines: [
          '09:41 OPEN command → indicator OPEN',
          'Seat status: HOLDING, drift 0.0 kPa/s (steady)',
        ],
        contradicts: ['valve_seat_leak'],
      },
      {
        id: 'sensor_crosscheck',
        title: 'E3  Sensor cross-check',
        lines: [
          'Portable gauge at intake port: 57 kPa',
          'INTAKE sensor: 58 kPa — agreement within tolerance',
        ],
        contradicts: ['intake_sensor_fault'],
      },
      {
        id: 'thermal_map',
        title: 'E4  Thermal map',
        lines: ['FEED 21.0°  MID 21.1°  INTAKE 20.9°', 'No thermal anomaly.'],
        contradicts: [],
      },
    ],
    tests: [
      {
        id: 'valve_seat_test',
        label: 'T1  Valve seat test',
        procedure: 'Close the isolation valve, watch MID, reopen.',
        result: [
          'MID 95 → 1 kPa in 2 s (closed).',
          'Reopen: MID returns to 95 kPa.',
        ],
        contradicts: ['valve_seat_leak'],
      },
      {
        id: 'sensor_swap',
        label: 'T2  Sensor swap',
        procedure: 'Fit the spare intake sensor and read it.',
        result: ['Spare intake sensor reads 58 kPa.'],
        contradicts: ['intake_sensor_fault'],
      },
      {
        id: 'hold_test',
        label: 'T3  Hold test',
        procedure: 'Isolate the lattice, watch INTAKE for 10 s.',
        result: ['INTAKE 58 → 41 kPa over 10 s.', 'FEED steady at 96 kPa.'],
        contradicts: ['feed_restriction'],
      },
    ],
    rules: RULES_COMMON,
    correct: 'intake_segment_leak',
  },
  B: {
    id: 'B',
    brief: [
      'Test run on the reference lattice: intake flow is LOW.',
      'Identify the single fault consistent with every reading.',
    ],
    hypotheses: HYPOTHESES,
    panels: [
      {
        id: 'pressure_map',
        title: 'E1  Pressure map',
        lines: [
          'FEED tap     61 kPa   (LOW; nominal 90–100)',
          'MID tap      60 kPa   (after the valve)',
          'INTAKE tap   58 kPa   (LOW)',
        ],
        contradicts: ['valve_seat_leak', 'intake_segment_leak'],
      },
      {
        id: 'valve_log',
        title: 'E2  Valve log',
        lines: [
          '09:41 OPEN command → indicator OPEN',
          'Seat status: HOLDING, drift 0.0 kPa/s (steady)',
        ],
        contradicts: ['valve_seat_leak'],
      },
      {
        id: 'sensor_crosscheck',
        title: 'E3  Sensor cross-check',
        lines: [
          'Portable gauge at intake port: 58 kPa',
          'INTAKE sensor: 58 kPa — agreement within tolerance',
        ],
        contradicts: ['intake_sensor_fault'],
      },
      {
        id: 'thermal_map',
        title: 'E4  Thermal map',
        lines: ['FEED 21.0°  MID 21.0°  INTAKE 21.1°', 'No thermal anomaly.'],
        contradicts: [],
      },
    ],
    tests: [
      {
        id: 'valve_seat_test',
        label: 'T1  Valve seat test',
        procedure: 'Close the isolation valve, watch MID, reopen.',
        result: [
          'MID 60 → 1 kPa in 2 s (closed).',
          'Reopen: MID returns to 60 kPa.',
        ],
        contradicts: ['valve_seat_leak'],
      },
      {
        id: 'sensor_swap',
        label: 'T2  Sensor swap',
        procedure: 'Fit the spare intake sensor and read it.',
        result: ['Spare intake sensor reads 58 kPa.'],
        contradicts: ['intake_sensor_fault'],
      },
      {
        id: 'hold_test',
        label: 'T3  Hold test',
        procedure: 'Isolate the lattice, watch INTAKE for 10 s.',
        result: [
          'INTAKE 58 → 58 kPa over 10 s (steady).',
          'FEED steady at 61 kPa.',
        ],
        contradicts: ['intake_segment_leak'],
      },
    ],
    rules: RULES_COMMON,
    correct: 'feed_restriction',
  },
};

/* ------------------------------------------------------------------ *
 * Pure consistency helpers (tests + the console)
 * ------------------------------------------------------------------ */

/** Hypotheses contradicted by NO panel and NO test of a form. */
export function consistentHypotheses(form: FaultForm): string[] {
  const contradicted = new Set<string>();

  for (const panel of form.panels) {
    for (const id of panel.contradicts) {
      contradicted.add(id);
    }
  }

  for (const test of form.tests) {
    for (const id of test.contradicts) {
      contradicted.add(id);
    }
  }

  return form.hypotheses
    .map((hypothesis) => hypothesis.id)
    .filter((id) => !contradicted.has(id));
}

/** Number of items (among the given ids) contradicting a hypothesis. */
export function contradictionCount(
  form: FaultForm,
  hypothesisId: string,
  panelIds: readonly string[],
  testIds: readonly string[],
): number {
  let count = 0;

  for (const panel of form.panels) {
    if (
      panelIds.includes(panel.id) &&
      panel.contradicts.includes(hypothesisId)
    ) {
      count += 1;
    }
  }

  for (const test of form.tests) {
    if (testIds.includes(test.id) && test.contradicts.includes(hypothesisId)) {
      count += 1;
    }
  }

  return count;
}
