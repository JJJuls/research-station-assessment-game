/**
 * M08 — window adapter of the station support console (Unit 2). Owns the
 * register window and the session-scope model state; every command below
 * delegates to the pure model (`src/pilot/exterior/m08EffortModel.ts`) and
 * logs through the window's `proto_m08_effort_*` family with the protocol
 * stamp. Closure rules: a closed surface pauses a running slot; Noor's
 * shift end completes an open console as a stopped observation (slots
 * without an explicit choice stay missing, never Rest); the review marks a
 * never-opened console absent and censors an open one.
 */
import { protocolStamp } from '../../measurement/protocol';
import {
  createM08State,
  M08_ENTRY_STATE_VERSION,
  M08_FAMILY,
  M08_OPPORTUNITY_ID,
  M08_WINDOW_ID,
  type M08Bin,
  type M08Choice,
  m08Choose,
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

export function openM08(nowMs: number) {
  declareM08();

  const s = ensureState();

  if (m08Window.isClosed()) {
    return;
  }

  const first = !m08Window.isOpen();

  m08Window.setComprehension(s.practice.passed ? 'passed' : 'pending');
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
): boolean {
  if (!m08Window.isOpen()) {
    return false;
  }

  const s = ensureState();
  const result = m08SortPractice(s, bin, nowMs, inputMode, sink);

  if (s.practice.passed) {
    m08Window.setComprehension('passed');
  }

  return result;
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

export function closeM08Surface(nowMs: number) {
  if (!m08Window.isOpen()) {
    return;
  }

  m08SurfaceClosed(ensureState(), nowMs, sink);
  m08Window.pause(nowMs);
}

export function closeM08AtShiftEnd(nowMs: number) {
  if (!m08Window.isOpen()) {
    return;
  }

  const s = ensureState();

  m08Freeze(s, nowMs, 'voluntary_stop');
  m08Window.complete(nowMs, m08RawComponents(s, 'voluntary_stop'), 'system', {
    exitState: 'stopped',
  });
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
  m08Window.reset();
  m08Window.spec.form = null;
  m08Window.spec.counterbalance = null;
}
