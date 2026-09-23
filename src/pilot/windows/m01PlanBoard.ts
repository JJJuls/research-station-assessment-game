/**
 * M01 — window adapter of the two three-job batches (Station 080 M01–M26
 * run, Unit 5; replaces the v2 six-card plan board of pilot v2 Unit 2).
 * Owns one register window per occasion (`o1` the storm packet in the
 * Concourse, `o2` the return orders in the Records Workshop) and the
 * session-scope model state; every command delegates to the pure model
 * (`m01BatchModel.ts`) and logs through the window's `proto_m01_batch_*`
 * family with the protocol stamp.
 *
 * Closure rules: all three jobs done completes the window; a closed
 * surface pauses the window (fail-forward: reopening resumes it); the
 * review completes an open batch whose first work action already
 * snapshotted the board (the observation exists; the jobs are recorded
 * as they stand) and censors one left before any job press (no
 * observation — distinct from a valid choice not to plan); a never-opened
 * batch is absent; a batch opened in an earlier page load is never re-run
 * (reload guard).
 */
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import {
  createM01State,
  M01_ENTRY_STATE_VERSION,
  M01_FAMILY,
  M01_OPPORTUNITY_IDS,
  M01_WINDOW_IDS,
  m01EntrySnapshot,
  type M01Form,
  type M01LogSink,
  m01Observed,
  type M01Occasion,
  m01Pick,
  m01Place,
  m01PriorAdministration,
  m01RawComponents,
  m01Return,
  type M01State,
  m01Work,
  type M01WorkResult,
} from './m01BatchModel';
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

export {
  M01_BATCHES,
  M01_FAMILY,
  M01_JOBS,
  M01_SLOTS,
  m01Job,
  type M01Occasion,
  m01PacketCards,
  m01PacketOrder,
  m01PlannedJobs,
} from './m01BatchModel';

export const M01_PRIOR_ADMINISTRATION = 'prior_administration';

const SCENES: Record<M01Occasion, { scene: string; objectId: string }> = {
  o1: { scene: 'station_concourse', objectId: 'm01_plan_board' },
  o2: { scene: 'records_workshop', objectId: 'm01_return_orders' },
};

const states: Partial<Record<M01Occasion, M01State>> = {};

function ensureState(occasion: M01Occasion): M01State {
  let s = states[occasion];

  if (s === undefined) {
    s = createM01State(
      occasion,
      assignCounterbalance<M01Form>(
        currentSessionId(),
        `m01_batch_form_${occasion}`,
        ['form_a', 'form_b'],
      ),
    );
    states[occasion] = s;
  }

  return s;
}

const windows: Record<M01Occasion, ItemWindow> = {
  o1: new ItemWindow({
    item: 'M01',
    opportunityId: M01_OPPORTUNITY_IDS.o1,
    windowId: M01_WINDOW_IDS.o1,
    entryStateVersion: M01_ENTRY_STATE_VERSION,
    family: M01_FAMILY,
    scene: SCENES.o1.scene,
    objectId: SCENES.o1.objectId,
    occasion: 'o1',
  }),
  o2: new ItemWindow({
    item: 'M01',
    opportunityId: M01_OPPORTUNITY_IDS.o2,
    windowId: M01_WINDOW_IDS.o2,
    entryStateVersion: M01_ENTRY_STATE_VERSION,
    family: M01_FAMILY,
    scene: SCENES.o2.scene,
    objectId: SCENES.o2.objectId,
    occasion: 'o2',
  }),
};

export function m01Window(occasion: M01Occasion): ItemWindow {
  return windows[occasion];
}

function sink(occasion: M01Occasion): M01LogSink {
  return (suffix, metadata) => {
    windows[occasion].log(suffix, { ...protocolStamp(), ...metadata });
  };
}

export function declareM01(occasion: M01Occasion) {
  const s = ensureState(occasion);
  const w = windows[occasion];

  w.spec.form = s.form;
  w.spec.counterbalance = s.form;
  w.declare();
}

/**
 * The batch was PRESENTED: Vale's briefing names the plan board on the
 * storm packet (o1); the Work Order Board's return beat offers the return
 * orders (o2). Logged once; presented-but-never-opened is `declined`.
 */
export function presentM01(occasion: M01Occasion, nowMs: number) {
  declareM01(occasion);
  windows[occasion].present(nowMs, m01EntrySnapshot(ensureState(occasion)));
}

export function m01State(occasion: M01Occasion): Readonly<M01State> {
  return ensureState(occasion);
}

export function m01AdministeredBefore(occasion: M01Occasion): boolean {
  return ensureState(occasion).closureReason === M01_PRIOR_ADMINISTRATION;
}

export function openM01(occasion: M01Occasion, nowMs: number) {
  declareM01(occasion);

  const s = ensureState(occasion);
  const w = windows[occasion];

  if (w.windowStatus() === 'unopened') {
    if (
      m01PriorAdministration(researchRuntime.getPriorPageLoadEvents(), occasion)
    ) {
      s.closureReason = M01_PRIOR_ADMINISTRATION;
      w.recordPriorExposure(
        'batch opened in an earlier page load of this identity',
      );
      w.technicalFailure('reload after administration: batch not re-run');

      return;
    }
  }

  if (w.isClosed()) {
    return;
  }

  const first = !w.isOpen();

  w.open(nowMs, m01EntrySnapshot(s));

  if (!first) {
    w.resume(nowMs);
    sink(occasion)('surface_reopened', {
      jobs_done: s.done.length,
      plan_locked: s.plan_locked,
      input_mode: 'system',
    });
  }
}

export function pickM01Card(
  occasion: M01Occasion,
  jobId: string,
  inputMode: InputMode,
): boolean {
  return windows[occasion].isOpen()
    ? m01Pick(ensureState(occasion), jobId, inputMode, sink(occasion))
    : false;
}

export function placeM01Card(
  occasion: M01Occasion,
  slotIndex: number,
  inputMode: InputMode,
): boolean {
  return windows[occasion].isOpen()
    ? m01Place(ensureState(occasion), slotIndex, inputMode, sink(occasion))
    : false;
}

export function returnM01Card(
  occasion: M01Occasion,
  inputMode: InputMode,
): boolean {
  return windows[occasion].isOpen()
    ? m01Return(ensureState(occasion), inputMode, sink(occasion))
    : false;
}

/** "Do: <job>" — completes the window after the third job. */
export function workM01Job(
  occasion: M01Occasion,
  jobId: string,
  nowMs: number,
  inputMode: InputMode,
): M01WorkResult {
  const w = windows[occasion];

  if (!w.isOpen()) {
    return 'refused';
  }

  const s = ensureState(occasion);
  const result = m01Work(s, jobId, nowMs, inputMode, sink(occasion));

  if (result === 'complete') {
    s.closureReason = 'completed';
    w.complete(nowMs, m01RawComponents(s, 'completed'), inputMode);
  }

  return result;
}

/** Closing the surface keeps the window open (fail-forward). */
export function closeM01Surface(occasion: M01Occasion, nowMs: number) {
  const w = windows[occasion];

  if (!w.isOpen()) {
    return;
  }

  w.pause(nowMs);
  sink(occasion)('surface_closed', {
    jobs_done: ensureState(occasion).done.length,
    plan_locked: ensureState(occasion).plan_locked,
    input_mode: 'system',
  });
}

export function resumeM01Surface(occasion: M01Occasion, nowMs: number) {
  windows[occasion].resume(nowMs);
}

/**
 * Review closure: a batch whose first work action snapshotted the board
 * is a COMPLETE observation (jobs recorded as they stand); one left before
 * any job press has no observation (censored); never opened ⇒ absent.
 */
export function closeM01AtReview(nowMs: number) {
  for (const occasion of ['o1', 'o2'] as const) {
    const w = windows[occasion];

    if (w.windowStatus() === 'unopened') {
      w.markAbsent(
        occasion === 'o1'
          ? 'storm packet batch never opened before the review'
          : 'return orders batch never opened before the review',
      );
      continue;
    }

    if (!w.isOpen()) {
      continue;
    }

    const s = ensureState(occasion);

    if (m01Observed(s)) {
      s.closureReason = 'closed_at_review';
      w.complete(nowMs, m01RawComponents(s, 'closed_at_review'), 'system', {
        exitState: 'stopped',
      });
    } else {
      s.closureReason = 'closed_at_review';
      w.stop(
        nowMs,
        'closed_at_review',
        m01RawComponents(s, 'closed_at_review'),
        'system',
        'censored',
      );
    }
  }
}

/** Test-only escape hatch. */
export function resetM01State() {
  delete states.o1;
  delete states.o2;

  for (const occasion of ['o1', 'o2'] as const) {
    windows[occasion].reset();
    windows[occasion].spec.form = null;
    windows[occasion].spec.counterbalance = null;
  }
}
