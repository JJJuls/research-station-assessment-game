/**
 * M08 — window adapter of the station support console (Unit 2 / U2-R).
 * Owns the register window and the session-scope model state; every
 * command below delegates to the pure model
 * (`src/pilot/exterior/m08EffortModel.ts`) and logs through the window's
 * `proto_m08_effort_*` family with the protocol stamp. Closure rules: a
 * closed surface (ESC or the Leave button) pauses a running slot or an
 * open choice; Noor's shift end completes a console whose six slots all
 * ended and otherwise closes it as a censored (stopped) observation with
 * the slots that have no explicit choice kept missing, never Rest; the
 * review marks a never-opened console absent and censors an open one; a
 * console already opened in an earlier page load is never re-run (reload
 * guard — technically incomplete, prior exposure recorded).
 *
 * Reload (U24 RL-1, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2 and §4): the
 * presentation of a reloaded load writes the family's single
 * `prior_load_checked` record before any opening, and the console is held
 * there unless its absence of an earlier opening is established (A): H
 * with the existing prior-exposure entry and marker, U / M without
 * administration.
 */
import {
  classifyM08Reload,
  m08PriorLoadCheck,
} from '../../measurement/features/m08';
import { protocolStamp } from '../../measurement/protocol';
import {
  PRIOR_LOAD_CHECK_SUFFIX,
  type PriorLoadCheck,
  type ReloadClass,
  reloadHoldBackDetail,
} from '../../measurement/reloadCheck';
import { researchRuntime } from '../../systems';
import {
  createM08State,
  M08_ENTRY_STATE_VERSION,
  M08_EPOCHS,
  M08_FAMILY,
  M08_OPPORTUNITY_ID,
  M08_WINDOW_ID,
  type M08Bin,
  type M08Choice,
  m08Choose,
  m08CompletedEpochs,
  m08Continue,
  m08CurrentEpoch as modelCurrentEpoch,
  m08CurrentReading as modelCurrentReading,
  m08EntrySnapshot,
  m08EpochRemainingMs as modelRemainingMs,
  m08Freeze,
  type M08LogSink,
  type M08Order,
  m08PresentChoice,
  m08RawComponents,
  m08SortPractice,
  type M08SortResult,
  m08SortWork,
  type M08State,
  m08SurfaceClosed,
  m08SurfaceReopened,
  m08Tick,
} from '../exterior/m08EffortModel';
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

export {
  M08_BENEFIT_ORDERS,
  M08_EPOCH_MS,
  M08_EPOCHS,
  M08_PRACTICE_ITEMS,
  M08_THRESHOLD,
} from '../exterior/m08EffortModel';

export const M08_PRIOR_ADMINISTRATION = 'prior_administration';

/** Closure reasons of a console held after a reload, by its class. */
const HOLD_BACK_REASON = {
  H: M08_PRIOR_ADMINISTRATION,
  U: 'unverified_history',
  M: 'contradictory_check',
} as const;

let state: M08State | null = null;

function ensureState(): M08State {
  if (state === null) {
    state = createM08State(
      assignCounterbalance<M08Order>(currentSessionId(), 'm08_benefit_order', [
        'order_a',
        'order_b',
      ]),
    );
  }

  return state;
}

export const m08Window = new ItemWindow({
  item: 'M08',
  opportunityId: M08_OPPORTUNITY_ID,
  windowId: M08_WINDOW_ID,
  entryStateVersion: M08_ENTRY_STATE_VERSION,
  family: M08_FAMILY,
  scene: 'exterior_recovery_yard',
  objectId: 'm08_support_console',
});

const sink: M08LogSink = (suffix, metadata) => {
  m08Window.log(suffix, { ...protocolStamp(), ...metadata });
};

export function declareM08() {
  const s = ensureState();

  m08Window.spec.form = s.order;
  m08Window.spec.counterbalance = s.order;
  m08Window.declare();
}

/**
 * The console was PRESENTED: Noor's briefing lists it as a yard job (review
 * U2-R). Logged once; a presented-but-never-opened console is then
 * `declined` at extraction, never `not_presented`. After a reload the
 * check is written first and a held console is held here, at its
 * availability (U24 RL-1).
 */
export function presentM08(nowMs: number) {
  declareM08();
  ensurePriorLoadCheck();
  m08Window.present(nowMs, m08EntrySnapshot(ensureState()));
  guardM08Reload(nowMs);
}

/** This load's check (undefined until the host ran in this load). */
let priorLoadCheck: PriorLoadCheck | null | undefined;

/** Writes the load's check once (never on a first load) and returns it. */
function ensurePriorLoadCheck(): PriorLoadCheck | null {
  if (priorLoadCheck === undefined) {
    priorLoadCheck = m08PriorLoadCheck(
      researchRuntime.getPageLoadIndex(),
      researchRuntime.getPriorPageLoadEvents(),
      researchRuntime.getEventIntegrity(),
    );

    if (priorLoadCheck !== null) {
      sink(PRIOR_LOAD_CHECK_SUFFIX, {
        ...priorLoadCheck,
        input_mode: 'system',
      });
    }
  }

  return priorLoadCheck;
}

/**
 * Reload guard (register §5.14; U24 RL-1): an unopened console of a
 * reloaded load is held unless its class is A — never re-run (no fresh
 * trials, no double credit); the prior-load evidence stays where it is.
 * True when it is held.
 */
function guardM08Reload(nowMs: number): boolean {
  if (m08Window.windowStatus() !== 'unopened') {
    return m08HoldBackClass() !== null;
  }

  const check = ensurePriorLoadCheck();
  const cls = classifyM08Reload(
    researchRuntime.getPageLoadIndex(),
    check === null ? [] : [check],
  ).occasions.row.class;

  if (cls === null || cls === 'A') {
    return false;
  }

  m08Freeze(ensureState(), nowMs, HOLD_BACK_REASON[cls]);

  if (cls === 'H') {
    m08Window.recordPriorExposure(
      'console opened in an earlier page load of this identity',
    );
    m08Window.technicalFailure(
      'reload after administration: console not re-run',
    );
  } else {
    m08Window.technicalFailure(
      reloadHoldBackDetail(cls, 'console not administered'),
    );
  }

  return true;
}

export function m08State(): Readonly<M08State> {
  return ensureState();
}

export function m08CurrentEpoch() {
  return modelCurrentEpoch(ensureState());
}

export function m08CurrentReading(): number {
  return modelCurrentReading(ensureState());
}

export function m08EpochRemainingMs(nowMs: number): number | null {
  return modelRemainingMs(ensureState(), nowMs);
}

/** True when the console was administered in an earlier page load. */
export function m08AdministeredBefore(): boolean {
  return ensureState().closureReason === M08_PRIOR_ADMINISTRATION;
}

/** The class the console is held under after a reload (null when not held). */
export function m08HoldBackClass(): Exclude<ReloadClass, 'A'> | null {
  const reason = ensureState().closureReason;

  return (
    (['H', 'U', 'M'] as const).find(
      (cls) => HOLD_BACK_REASON[cls] === reason,
    ) ?? null
  );
}

export function openM08(nowMs: number) {
  declareM08();

  const s = ensureState();

  if (guardM08Reload(nowMs)) {
    return;
  }

  if (m08Window.isClosed()) {
    return;
  }

  const first = !m08Window.isOpen();

  m08Window.open(nowMs, m08EntrySnapshot(s));

  if (!first) {
    m08SurfaceReopened(s, nowMs, sink);
  } else if (s.phase === 'choice') {
    m08PresentChoice(s, nowMs, sink);
  }
}

export function sortM08Practice(
  bin: M08Bin,
  nowMs: number,
  inputMode: InputMode,
): M08SortResult | null {
  return m08Window.isOpen()
    ? m08SortPractice(ensureState(), bin, nowMs, inputMode, sink)
    : null;
}

/** The interval screen's Continue control (presents the next choice). */
export function continueM08(nowMs: number, inputMode: InputMode): boolean {
  return m08Window.isOpen()
    ? m08Continue(ensureState(), nowMs, inputMode, sink)
    : false;
}

export function chooseM08(
  choice: M08Choice,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  return m08Window.isOpen()
    ? m08Choose(ensureState(), choice, nowMs, inputMode, sink)
    : false;
}

export function sortM08Work(
  bin: M08Bin,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  return m08Window.isOpen()
    ? m08SortWork(ensureState(), bin, nowMs, inputMode, sink)
    : false;
}

/** Surface tick; completes the window after the sixth slot. */
export function tickM08(nowMs: number): boolean {
  if (!m08Window.isOpen()) {
    return false;
  }

  const s = ensureState();
  const result = m08Tick(s, nowMs, sink);

  if (result === 'done') {
    m08Window.complete(nowMs, m08RawComponents(s, 'completed'), 'system');
  }

  return result !== 'none';
}

/** ESC or the Leave button: one path, a running slot or choice pauses. */
export function closeM08Surface(nowMs: number) {
  if (!m08Window.isOpen()) {
    return;
  }

  m08SurfaceClosed(ensureState(), nowMs, sink);
  m08Window.pause(nowMs);
}

/**
 * Noor's shift end with the console open: six ended slots complete the
 * observation; fewer close it as a censored (stopped) observation — the
 * register never calls a partial console "completed" (review U2-R).
 */
export function closeM08AtShiftEnd(nowMs: number) {
  if (!m08Window.isOpen()) {
    return;
  }

  const s = ensureState();

  if (m08CompletedEpochs(s) >= M08_EPOCHS) {
    m08Freeze(s, nowMs, 'completed');
    m08Window.complete(nowMs, m08RawComponents(s, 'completed'), 'system');

    return;
  }

  m08Freeze(s, nowMs, 'voluntary_stop');
  m08Window.stop(
    nowMs,
    'stopped',
    m08RawComponents(s, 'voluntary_stop'),
    'system',
    'censored',
  );
}

export function closeM08AtReview(nowMs: number) {
  if (m08Window.windowStatus() === 'unopened') {
    m08Window.markAbsent('support console never opened before the review');
    return;
  }

  if (m08Window.isOpen()) {
    const s = ensureState();

    m08Freeze(s, nowMs, 'closed_at_review');
    m08Window.stop(
      nowMs,
      'closed_at_review',
      m08RawComponents(s, 'closed_at_review'),
      'system',
      'censored',
    );
  }
}

/** Test-only escape hatch. */
export function resetM08State() {
  if (state !== null) {
    m08Freeze(state, 0, 'reset');
  }

  state = null;
  priorLoadCheck = undefined;
  m08Window.reset();
  m08Window.spec.form = null;
  m08Window.spec.counterbalance = null;
}
