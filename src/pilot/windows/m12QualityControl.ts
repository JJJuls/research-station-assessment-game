/**
 * M12 — window adapter of the two quality packets (Station 080 M01–M26
 * run, Unit 8). Owns the two register windows (the storm delivery manifest
 * in the Concourse, episode 1; the calibration tag sheet in the Records
 * Workshop, episode 2) and the session-scope model state; every command
 * delegates to the pure model (`m12CheckModel.ts`) and logs through the
 * windows' `proto_m12_check_*` family with the protocol stamp.
 *
 * Closure rules: release completes the occasion with the fields as they
 * stand (an unchecked release is a valid observed 0); ESC / Leave keeps
 * the packet open (fail-forward, no timers); the review censors an open
 * packet (no release ⇒ no observation) and marks a never-opened one
 * absent; a packet opened in an earlier page load is never re-run. The
 * v2 six-line family (`proto_m12_qc_*`) keeps its v2 meaning in the
 * frozen ledger and is retired from the route.
 */
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import {
  createM12State,
  M12_ENTRY_STATE_VERSION,
  M12_FAMILY,
  M12_OPPORTUNITY_IDS,
  M12_WINDOW_IDS,
  m12AbandonCorrection,
  m12Check,
  m12ConfirmCorrection,
  type M12ConfirmResult,
  m12EntrySnapshot,
  type M12Form,
  m12Freeze,
  m12Judge,
  type M12Judgement,
  type M12JudgeResult,
  m12KeypadBack,
  m12KeypadClear,
  m12KeypadDigit,
  type M12LogSink,
  type M12Occasion,
  m12PriorAdministration,
  m12RawComponents,
  m12Release,
  m12ReopenKeypad,
  m12Reread,
  type M12State,
} from './m12CheckModel';
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

export {
  M12_FAMILY,
  M12_FIELDS_PER_PRODUCT,
  M12_OPPORTUNITY_IDS,
  M12_PRODUCTS,
  M12_SETTLE_MS,
  M12_WINDOW_IDS,
  m12FaultDetected,
  m12Field,
  m12FieldsChecked,
  m12FieldsJudged,
  m12KeypadField,
  type M12Occasion,
  m12Open,
} from './m12CheckModel';

export const M12_PRIOR_ADMINISTRATION = 'prior_administration';

const OCCASIONS: readonly M12Occasion[] = ['o1', 'o2'];

const states: Partial<Record<M12Occasion, M12State>> = {};
const realisedOrder: M12Occasion[] = [];

function ensureState(occasion: M12Occasion): M12State {
  let s = states[occasion];

  if (s === undefined) {
    s = createM12State(
      occasion,
      assignCounterbalance<M12Form>(
        currentSessionId(),
        `m12_check_${occasion}_form`,
        ['form_a', 'form_b'],
      ),
    );
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

const sinkFor =
  (occasion: M12Occasion): M12LogSink =>
  (suffix, metadata) => {
    m12Windows[occasion].log(suffix, { ...protocolStamp(), ...metadata });
  };

export function declareM12(occasion: M12Occasion) {
  const s = ensureState(occasion);
  const window = m12Windows[occasion];

  window.spec.form = s.form;
  window.spec.counterbalance = s.form;
  window.declare();
}

export function m12State(occasion: M12Occasion): Readonly<M12State> {
  return ensureState(occasion);
}

export function m12RealisedOrder(): readonly M12Occasion[] {
  return realisedOrder;
}

/** True when the occasion was administered in an earlier page load. */
export function m12AdministeredBefore(occasion: M12Occasion): boolean {
  return ensureState(occasion).closureReason === M12_PRIOR_ADMINISTRATION;
}

/**
 * The packet was PRESENTED: Vale's briefing names the storm packet's
 * quality packet (o1); the Work Order Board lists the quality packet (o2).
 */
export function presentM12(occasion: M12Occasion, nowMs: number) {
  declareM12(occasion);
  m12Windows[occasion].present(
    nowMs,
    m12EntrySnapshot(occasion, ensureState(occasion).form),
  );
}

/**
 * Opens (or reopens) the packet. `entry` carries what the host scene knows
 * at the open (the route stage and neighbouring windows' states).
 */
export function openM12(
  occasion: M12Occasion,
  nowMs: number,
  entry: Record<string, unknown> = {},
) {
  declareM12(occasion);

  const s = ensureState(occasion);
  const window = m12Windows[occasion];
  const other: M12Occasion = occasion === 'o1' ? 'o2' : 'o1';

  if (window.windowStatus() === 'unopened') {
    // Reload guard: the raw log of an earlier page load already holds an
    // opened packet. Never re-run it (no second observation).
    if (
      m12PriorAdministration(researchRuntime.getPriorPageLoadEvents(), occasion)
    ) {
      m12Freeze(s, M12_PRIOR_ADMINISTRATION);
      window.recordPriorExposure(
        'quality packet opened in an earlier page load of this identity',
      );
      window.technicalFailure('reload after administration: packet not re-run');

      return;
    }

    if (!realisedOrder.includes(occasion)) {
      realisedOrder.push(occasion);

      if (m12Windows[other].windowStatus() !== 'unopened') {
        window.recordPriorExposure(
          `exposure:${M12_OPPORTUNITY_IDS[other]}_before`,
        );
      }
    }
  }

  if (window.isClosed()) {
    return;
  }

  const first = !window.isOpen();

  window.setComprehension('not_required');
  window.open(nowMs, {
    ...m12EntrySnapshot(occasion, s.form),
    ...entry,
    realised_order: [...realisedOrder],
  });

  if (!first) {
    sinkFor(occasion)('surface_reopened', {
      fields_judged: s.fields.filter((field) => field.judgement !== null)
        .length,
      input_mode: 'system',
    });
  }
}

export function checkM12Field(
  occasion: M12Occasion,
  fieldId: string,
  nowMs: number,
  inputMode: InputMode,
) {
  return m12Windows[occasion].isOpen()
    ? m12Check(
        ensureState(occasion),
        fieldId,
        nowMs,
        inputMode,
        sinkFor(occasion),
      )
    : 'invalid';
}

export function judgeM12Field(
  occasion: M12Occasion,
  fieldId: string,
  judgement: M12Judgement,
  nowMs: number,
  inputMode: InputMode,
): M12JudgeResult {
  return m12Windows[occasion].isOpen()
    ? m12Judge(
        ensureState(occasion),
        fieldId,
        judgement,
        nowMs,
        inputMode,
        sinkFor(occasion),
      )
    : 'invalid';
}

export function m12KeypadPress(
  occasion: M12Occasion,
  key: 'back' | 'clear' | 'cancel' | string,
  inputMode: InputMode,
): boolean {
  if (!m12Windows[occasion].isOpen()) {
    return false;
  }

  const s = ensureState(occasion);
  const sink = sinkFor(occasion);

  switch (key) {
    case 'back':
      return m12KeypadBack(s, inputMode, sink);
    case 'clear':
      return m12KeypadClear(s, inputMode, sink);
    case 'cancel':
      return m12AbandonCorrection(s, inputMode, sink);
    default:
      return m12KeypadDigit(s, key, inputMode, sink);
  }
}

export function reopenM12Keypad(
  occasion: M12Occasion,
  fieldId: string,
  inputMode: InputMode,
): boolean {
  return m12Windows[occasion].isOpen()
    ? m12ReopenKeypad(
        ensureState(occasion),
        fieldId,
        inputMode,
        sinkFor(occasion),
      )
    : false;
}

export function rereadM12Reference(
  occasion: M12Occasion,
  fieldId: string,
  inputMode: InputMode,
): boolean {
  return m12Windows[occasion].isOpen()
    ? m12Reread(ensureState(occasion), fieldId, inputMode, sinkFor(occasion))
    : false;
}

export function confirmM12Correction(
  occasion: M12Occasion,
  nowMs: number,
  inputMode: InputMode,
): M12ConfirmResult {
  return m12Windows[occasion].isOpen()
    ? m12ConfirmCorrection(
        ensureState(occasion),
        nowMs,
        inputMode,
        sinkFor(occasion),
      )
    : 'invalid';
}

/** "Release packet": completes the occasion with the fields as they stand. */
export function releaseM12(
  occasion: M12Occasion,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const s = ensureState(occasion);
  const window = m12Windows[occasion];

  if (!window.isOpen()) {
    return false;
  }

  if (!m12Release(s, nowMs, inputMode, sinkFor(occasion))) {
    return false;
  }

  window.complete(
    nowMs,
    { ...m12RawComponents(s, 'completed'), realised_order: [...realisedOrder] },
    inputMode,
  );

  return true;
}

export function closeM12Surface(occasion: M12Occasion, nowMs: number) {
  const window = m12Windows[occasion];

  if (!window.isOpen()) {
    return;
  }

  window.pause(nowMs);
  sinkFor(occasion)('surface_closed', {
    released: ensureState(occasion).released,
    input_mode: 'system',
  });
}

export function resumeM12Surface(occasion: M12Occasion, nowMs: number) {
  m12Windows[occasion].resume(nowMs);
}

/** Never opened → absent; open at the review → censored (no release, no observation). */
export function closeM12AtReview(nowMs: number) {
  for (const occasion of OCCASIONS) {
    const window = m12Windows[occasion];
    const s = ensureState(occasion);

    if (window.windowStatus() === 'unopened') {
      window.markAbsent(
        `quality packet ${occasion} never opened before the review`,
      );
      continue;
    }

    if (window.isOpen()) {
      m12Freeze(s, 'closed_at_review');
      window.stop(
        nowMs,
        'closed_at_review',
        {
          ...m12RawComponents(s, 'closed_at_review'),
          realised_order: [...realisedOrder],
        },
        'system',
        'censored',
      );
    }
  }
}

/** Test-only escape hatch. */
export function resetM12State() {
  delete states.o1;
  delete states.o2;
  realisedOrder.length = 0;

  for (const occasion of OCCASIONS) {
    m12Windows[occasion].reset();
    m12Windows[occasion].spec.form = null;
    m12Windows[occasion].spec.counterbalance = null;
  }
}
