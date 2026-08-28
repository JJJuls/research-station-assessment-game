/**
 * M12 — Two matched quality-control occasions (evidence-led pilot v2,
 * Unit 2).
 *
 * Ledger (sheet 09): inspect two independent completed work products,
 * each with one visible-but-not-salient matched error, and optionally
 * correct before submit; record form and order; no speed score.
 *
 * Occasion 1 (Concourse, episode 1): a completed supply manifest — six
 * line items, one quantity does not match the packing list beside it.
 * Occasion 2 (Records Workshop, episode 2): a completed calibration tag
 * sheet — six tags, one serial does not match the bench register.
 * Each occasion is independently reachable and independently valid; the
 * form (which line carries the error) is counterbalanced per occasion.
 *
 * Raw components per occasion: error_detected_oN (the erroneous field
 * was opened for inspection/correction), error_corrected_oN,
 * inspection_actions; plus the realised order of the two occasions.
 */
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

export type M12Occasion = 'o1' | 'o2';
export type M12Form = 'form_a' | 'form_b';

export const M12_OPPORTUNITY_IDS: Record<M12Occasion, string> = {
  o1: 'proto_m12_qc_o1',
  o2: 'proto_m12_qc_o2',
};
export const M12_WINDOW_IDS: Record<M12Occasion, string> = {
  o1: 'm12_qc_o1',
  o2: 'm12_qc_o2',
};
export const M12_ENTRY_STATE_VERSION = 'm12-qc-v1';
export const M12_FAMILY = 'proto_m12_qc_';

export interface M12Line {
  id: string;
  label: string;
  /** Value printed on the completed product. */
  value: string;
  /** Value on the reference beside it. */
  reference: string;
}

interface M12Product {
  title: string;
  referenceTitle: string;
  lines: readonly M12Line[];
  /** Which line index carries the error per form. */
  errorLine: Record<M12Form, number>;
  /** The erroneous printed value per form (reference stays true). */
  erroneousValue: Record<M12Form, string>;
}

export const M12_PRODUCTS: Record<M12Occasion, M12Product> = {
  o1: {
    title: 'Supply manifest — storm delivery',
    referenceTitle: 'Packing list',
    lines: [
      { id: 'fuse', label: 'Fuse contacts', value: '12', reference: '12' },
      { id: 'seal', label: 'Seal caps', value: '6', reference: '6' },
      { id: 'wire', label: 'Wire spools', value: '4', reference: '4' },
      { id: 'wrap', label: 'Insulation wrap', value: '8', reference: '8' },
      { id: 'vial', label: 'Sample vials', value: '10', reference: '10' },
      { id: 'cell', label: 'Beacon cells', value: '3', reference: '3' },
    ],
    errorLine: { form_a: 2, form_b: 4 },
    erroneousValue: { form_a: '5', form_b: '12' },
  },
  o2: {
    title: 'Calibration tag sheet — bench run',
    referenceTitle: 'Bench register',
    lines: [
      {
        id: 't1',
        label: 'Tag 1 serial',
        value: 'CB-2041',
        reference: 'CB-2041',
      },
      {
        id: 't2',
        label: 'Tag 2 serial',
        value: 'CB-2042',
        reference: 'CB-2042',
      },
      {
        id: 't3',
        label: 'Tag 3 serial',
        value: 'CB-2043',
        reference: 'CB-2043',
      },
      {
        id: 't4',
        label: 'Tag 4 serial',
        value: 'CB-2044',
        reference: 'CB-2044',
      },
      {
        id: 't5',
        label: 'Tag 5 serial',
        value: 'CB-2045',
        reference: 'CB-2045',
      },
      {
        id: 't6',
        label: 'Tag 6 serial',
        value: 'CB-2046',
        reference: 'CB-2046',
      },
    ],
    errorLine: { form_a: 1, form_b: 3 },
    erroneousValue: { form_a: 'CB-2024', form_b: 'CB-2404' },
  },
};

interface M12OccasionState {
  form: M12Form;
  values: string[];
  inspected: string[];
  inspectionActions: number;
  errorDetected: boolean;
  errorCorrected: boolean;
  submitted: boolean;
}

const states: Partial<Record<M12Occasion, M12OccasionState>> = {};
const realisedOrder: M12Occasion[] = [];

function ensureState(occasion: M12Occasion): M12OccasionState {
  let s = states[occasion];

  if (s === undefined) {
    const form = assignCounterbalance<M12Form>(
      currentSessionId(),
      `m12_qc_${occasion}_form`,
      ['form_a', 'form_b'],
    );
    const product = M12_PRODUCTS[occasion];

    s = {
      form,
      values: product.lines.map((line, index) =>
        index === product.errorLine[form]
          ? product.erroneousValue[form]
          : line.value,
      ),
      inspected: [],
      inspectionActions: 0,
      errorDetected: false,
      errorCorrected: false,
      submitted: false,
    };
    states[occasion] = s;
  }

  return s;
}

export const m12Windows: Record<M12Occasion, ItemWindow> = {
  o1: new ItemWindow({
    item: 'M12',
    opportunityId: M12_OPPORTUNITY_IDS.o1,
    windowId: M12_WINDOW_IDS.o1,
    entryStateVersion: M12_ENTRY_STATE_VERSION,
    family: M12_FAMILY,
    scene: 'station_concourse',
    objectId: 'm12_qc_packet_o1',
    occasion: 'o1',
  }),
  o2: new ItemWindow({
    item: 'M12',
    opportunityId: M12_OPPORTUNITY_IDS.o2,
    windowId: M12_WINDOW_IDS.o2,
    entryStateVersion: M12_ENTRY_STATE_VERSION,
    family: M12_FAMILY,
    scene: 'records_workshop',
    objectId: 'm12_qc_packet_o2',
    occasion: 'o2',
  }),
};

export function declareM12(occasion: M12Occasion) {
  const s = ensureState(occasion);
  const window = m12Windows[occasion];

  window.spec.form = s.form;
  window.spec.counterbalance = s.form;
  window.declare();
}

export function m12State(occasion: M12Occasion): Readonly<M12OccasionState> {
  return ensureState(occasion);
}

export function m12RealisedOrder(): readonly M12Occasion[] {
  return realisedOrder;
}

export function openM12(occasion: M12Occasion, nowMs: number) {
  declareM12(occasion);

  const window = m12Windows[occasion];
  const other: M12Occasion = occasion === 'o1' ? 'o2' : 'o1';

  if (
    !realisedOrder.includes(occasion) &&
    window.windowStatus() === 'unopened'
  ) {
    realisedOrder.push(occasion);

    if (m12Windows[other].windowStatus() !== 'unopened') {
      window.recordPriorExposure(
        `exposure:${M12_OPPORTUNITY_IDS[other]}_before`,
      );
    }
  }

  window.open(nowMs, {
    lines: M12_PRODUCTS[occasion].lines.length,
    realised_order: [...realisedOrder],
  });
}

/** Open one line for inspection (the reference value becomes comparable). */
export function inspectM12Line(
  occasion: M12Occasion,
  lineId: string,
  inputMode: InputMode,
) {
  const s = ensureState(occasion);
  const window = m12Windows[occasion];

  if (!window.isOpen() || s.submitted) {
    return;
  }

  s.inspectionActions += 1;

  if (!s.inspected.includes(lineId)) {
    s.inspected.push(lineId);
  }

  const product = M12_PRODUCTS[occasion];
  const errorLineId = product.lines[product.errorLine[s.form]].id;

  if (lineId === errorLineId) {
    s.errorDetected = true;
  }

  window.log('line_inspected', {
    line_id: lineId,
    inspection_actions: s.inspectionActions,
    input_mode: inputMode,
  });
}

/** Correct a line to its reference value (allowed on any line). */
export function correctM12Line(
  occasion: M12Occasion,
  lineId: string,
  inputMode: InputMode,
): boolean {
  const s = ensureState(occasion);
  const window = m12Windows[occasion];

  if (!window.isOpen() || s.submitted) {
    return false;
  }

  const product = M12_PRODUCTS[occasion];
  const index = product.lines.findIndex((line) => line.id === lineId);

  if (index < 0) {
    return false;
  }

  const before = s.values[index];

  s.values[index] = product.lines[index].reference;
  s.inspectionActions += 1;

  if (index === product.errorLine[s.form]) {
    s.errorDetected = true;
    s.errorCorrected = true;
  }

  window.log('line_corrected', {
    line_id: lineId,
    before,
    after: s.values[index],
    input_mode: inputMode,
  });

  return true;
}

export function submitM12(
  occasion: M12Occasion,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const s = ensureState(occasion);
  const window = m12Windows[occasion];

  if (!window.isOpen() || s.submitted) {
    return false;
  }

  s.submitted = true;

  const product = M12_PRODUCTS[occasion];

  window.complete(
    nowMs,
    {
      [`error_detected_${occasion}`]: s.errorDetected,
      [`error_corrected_${occasion}`]: s.errorCorrected,
      inspection_actions: s.inspectionActions,
      inspected_lines: [...s.inspected],
      final_values: product.lines.map((line, index) => ({
        line_id: line.id,
        value: s.values[index],
      })),
      error_line_id: product.lines[product.errorLine[s.form]].id,
      realised_order: [...realisedOrder],
    },
    inputMode,
  );

  return true;
}

export function closeM12Surface(occasion: M12Occasion, nowMs: number) {
  m12Windows[occasion].pause(nowMs);
  m12Windows[occasion].log('surface_closed', {
    submitted: ensureState(occasion).submitted,
    input_mode: 'system',
  });
}

export function resumeM12Surface(occasion: M12Occasion, nowMs: number) {
  m12Windows[occasion].resume(nowMs);
}

/** Test-only escape hatch. */
export function resetM12State() {
  delete states.o1;
  delete states.o2;
  realisedOrder.length = 0;

  for (const occasion of ['o1', 'o2'] as const) {
    m12Windows[occasion].reset();
    m12Windows[occasion].spec.form = null;
    m12Windows[occasion].spec.counterbalance = null;
  }
}
