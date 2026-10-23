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
 *
 * Reload (U24 RL-1, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2 and §4): the
 * first presentation of a reloaded load writes the family's single
 * `prior_load_checked` record, covering both occasions, before any
 * opening. An occasion is then held at its availability unless its
 * absence of an earlier opening is established (A): H with the existing
 * prior-exposure entry and marker, U / M without administration.
 */
import {
  classifyM01Reload,
  m01PriorLoadCheck,
} from '../../measurement/features/m01';
import { protocolStamp } from '../../measurement/protocol';
import {
  PRIOR_LOAD_CHECK_SUFFIX,
  type PriorLoadCheck,
  type ReloadClass,
  reloadHoldBackDetail,
} from '../../measurement/reloadCheck';
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

/** Closure reasons of a batch held because its earlier state is U or M. */
const HOLD_BACK_REASON = {
  H: M01_PRIOR_ADMINISTRATION,
  U: 'unverified_history',
  M: 'contradictory_check',
} as const;

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

/** This load's check (undefined until the first host of the load ran). */
let priorLoadCheck: PriorLoadCheck | null | undefined;

/** Writes the load's check once (never on a first load) and returns it. */
function ensurePriorLoadCheck(occasion: M01Occasion): PriorLoadCheck | null {
  if (priorLoadCheck === undefined) {
    priorLoadCheck = m01PriorLoadCheck(
      researchRuntime.getPageLoadIndex(),
      researchRuntime.getPriorPageLoadEvents(),
      researchRuntime.getEventIntegrity(),
    );

    if (priorLoadCheck !== null) {
      sink(occasion)(PRIOR_LOAD_CHECK_SUFFIX, {
        ...priorLoadCheck,
        input_mode: 'system',
      });
    }
  }

  return priorLoadCheck;
}

function holdM01(occasion: M01Occasion, cls: Exclude<ReloadClass, 'A'>) {
  const w = windows[occasion];

  ensureState(occasion).closureReason = HOLD_BACK_REASON[cls];

  if (cls === 'H') {
    w.recordPriorExposure(
      'batch opened in an earlier page load of this identity',
    );
    w.technicalFailure('reload after administration: batch not re-run');
  } else {
    w.technicalFailure(reloadHoldBackDetail(cls, 'batch not administered'));
  }
}

/**
 * Reload guard (register §5.14; U24 RL-1): an unopened occasion of a
 * reloaded load is held unless its class is A. True when it is held.
 */
function guardM01Reload(occasion: M01Occasion): boolean {
  if (windows[occasion].windowStatus() !== 'unopened') {
    return m01HoldBackClass(occasion) !== null;
  }

  const check = ensurePriorLoadCheck(occasion);
  const cls = classifyM01Reload(
    researchRuntime.getPageLoadIndex(),
    check === null ? [] : [check],
  ).occasions[occasion].class;

  if (cls === null || cls === 'A') {
    return false;
  }

  holdM01(occasion, cls);

  return true;
}

/**
 * The batch was PRESENTED: Vale's briefing names the plan board on the
 * storm packet (o1); the Work Order Board's return beat offers the return
 * orders (o2). Logged once; presented-but-never-opened is `declined`.
 * After a reload the check is written first and a held occasion is held
 * here, at its availability (U24 RL-1).
 */
export function presentM01(occasion: M01Occasion, nowMs: number) {
  declareM01(occasion);
  ensurePriorLoadCheck(occasion);
  windows[occasion].present(nowMs, m01EntrySnapshot(ensureState(occasion)));
  guardM01Reload(occasion);
}

export function m01State(occasion: M01Occasion): Readonly<M01State> {
  return ensureState(occasion);
}

export function m01AdministeredBefore(occasion: M01Occasion): boolean {
  return ensureState(occasion).closureReason === M01_PRIOR_ADMINISTRATION;
}

/** The class an occasion is held under after a reload (null when not held). */
export function m01HoldBackClass(
  occasion: M01Occasion,
): Exclude<ReloadClass, 'A'> | null {
  const reason = ensureState(occasion).closureReason;

  return (
    (['H', 'U', 'M'] as const).find(
      (cls) => HOLD_BACK_REASON[cls] === reason,
    ) ?? null
  );
}

export function openM01(occasion: M01Occasion, nowMs: number) {
  declareM01(occasion);

  const s = ensureState(occasion);
  const w = windows[occasion];

  if (guardM01Reload(occasion)) {
    return;
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
      // A check of this load holds an occasion that is not A (U24 RL-1).
      if (priorLoadCheck != null && guardM01Reload(occasion)) {
        continue;
      }

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
  priorLoadCheck = undefined;

  for (const occasion of ['o1', 'o2'] as const) {
    windows[occasion].reset();
    windows[occasion].spec.form = null;
    windows[occasion].spec.counterbalance = null;
  }
}
