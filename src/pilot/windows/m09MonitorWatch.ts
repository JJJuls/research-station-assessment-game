/**
 * M09 — window adapter of the monitor watch (Station 080 M01–M26 run,
 * Unit 15). One register window for the ONE accepted duty
 * (`proto_m09_watch_duty`); its window id names the check that is — or was
 * last — due (`m09_duty_check_1..3`). Every command delegates to the pure
 * model (`m09WatchModel.ts`) and logs through the window's
 * `proto_m09_checks_*` family with the protocol stamp.
 *
 * Window lifecycle: presented at Vale's offer; a decline opens and
 * completes it outside the denominator; acceptance opens it and the first
 * check with it; it completes when the third check closes (a reading, or
 * the first Concourse exit of the return visit — owner decision D-U15-1)
 * or at the shift review with the checks reached so far (an open one
 * censored). An unanswered offer closes at the review as such; an offer
 * never presented is absent; an offer presented in an earlier page load is
 * never re-run. The v2 two-check family keeps its meaning in the frozen
 * ledger and is no longer on the route.
 */
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import type { ObservedInput } from '../inputObservation';
import {
  pilotMissionLog,
  pilotStage,
  registerMissionLogEntry,
} from '../pilotRoute';
import {
  createM09State,
  M09_ENTRY_STATE_VERSION,
  M09_FAMILY,
  M09_GAUGE_REGISTRY_ID,
  M09_OBJECT_ID,
  M09_OPPORTUNITY_ID,
  M09_WINDOW_IDS,
  m09Accepted,
  type M09Access,
  m09Answer,
  type M09AnswerResult,
  m09CloseAtReview,
  m09ConcourseEntered,
  m09ConcourseExited,
  m09Defer,
  type M09DeferResult,
  m09LogLine,
  type M09LogSink,
  m09NoteLogViewed,
  m09OpenAcceptanceCheck,
  m09Present,
  m09PriorAdministration,
  m09RawComponents,
  m09ReadGauge,
  type M09ReadResult,
  type M09State,
} from './m09WatchModel';
import { ItemWindow } from './windowKit';

export {
  M09_ENTRY_STATE_VERSION,
  M09_FAMILY,
  M09_OFFER_BODY,
  M09_OFFER_LABELS,
  M09_OPPORTUNITY_ID,
  M09_REASK_LABEL,
  M09_SETTLE_MS,
  m09GaugeFeedback,
} from './m09WatchModel';

const LOG_ENTRY_ID = 'm09_watch';
/** The station map lists the first seven open lines (StationMapScene). */
const STATION_LOG_VISIBLE_LINES = 7;

/**
 * The duty's window: every event of the family carries the protocol
 * stamp, and `presented` carries the offer's snapshot.
 */
class WatchWindow extends ItemWindow {
  private offerSnapshot: Record<string, unknown> = {};

  presentWith(nowMs: number, snapshot: Record<string, unknown>) {
    this.offerSnapshot = { ...snapshot };
    this.present(nowMs, snapshot);
  }

  log(suffix: string, metadata: Record<string, unknown> = {}) {
    super.log(suffix, {
      ...protocolStamp(),
      ...(suffix === 'presented' ? this.offerSnapshot : {}),
      ...metadata,
    });
  }

  reset() {
    super.reset();
    this.offerSnapshot = {};
  }
}

export const m09Window = new WatchWindow({
  item: 'M09',
  opportunityId: M09_OPPORTUNITY_ID,
  windowId: M09_WINDOW_IDS[1],
  entryStateVersion: M09_ENTRY_STATE_VERSION,
  family: M09_FAMILY,
  scene: 'station_concourse',
  objectId: M09_OBJECT_ID,
});

let state: M09State = createM09State();
/** The reload guard held the offer back in this page load. */
let heldBack = false;

const sink: M09LogSink = (suffix, metadata) => {
  m09Window.log(suffix, metadata);
};

/** The gauge is a registered station of the Concourse in every visit. */
export const M09_GAUGE_ACCESS: M09Access = {
  available: true,
  basis: 'gauge_station_in_scene',
  registry_id: M09_GAUGE_REGISTRY_ID,
};

export function declareM09() {
  m09Window.declare();
}

export function m09State(): Readonly<M09State> {
  return state;
}

/** The watch answer for a neighbouring window's entry snapshot. */
export function m09WatchAccepted(): boolean | null {
  return state.answer === null ? null : state.answer === 'accept';
}

/**
 * Reload guard, run at Concourse entry: an offer presented in an earlier
 * page load of this identity is never re-run — prior exposure recorded,
 * the opportunity technically incomplete, the feature `interrupted`.
 */
export function guardM09Reload(): boolean {
  if (heldBack) {
    return true;
  }

  if (
    state.presented_at_ms !== null ||
    !m09PriorAdministration(researchRuntime.getPriorPageLoadEvents())
  ) {
    return false;
  }

  heldBack = true;
  m09Window.recordPriorExposure(
    'monitor watch offered in an earlier page load of this identity',
  );
  m09Window.technicalFailure('reload after the offer: watch not re-run');

  return true;
}

/** The offer stage may be shown: not answered, not held back, not closed. */
export function m09OfferAvailable(): boolean {
  return state.answer === null && !guardM09Reload() && !m09Window.isClosed();
}

/** Vale shows the offer stage (presented once; a re-showing moves the settle reference). */
export function presentM09Offer(nowMs: number): boolean {
  if (!m09OfferAvailable()) {
    return false;
  }

  declareM09();
  m09Present(state, nowMs, (suffix, metadata) => {
    if (suffix === 'presented') {
      m09Window.presentWith(nowMs, metadata);
    } else {
      sink(suffix, metadata);
    }
  });

  return true;
}

function registerWatchLogEntry() {
  registerMissionLogEntry({
    id: LOG_ENTRY_ID,
    kind: 'obligation',
    order: 10,
    text: () => m09LogLine(state, pilotStage())?.text ?? '',
    isClosed: () => m09LogLine(state, pilotStage()) === null,
  });
}

function finishDuty(nowMs: number, closureReason: string) {
  m09Window.complete(nowMs, m09RawComponents(state, closureReason), 'system');
}

/**
 * Accept or decline (both deliberate). Acceptance opens the duty and its
 * first check; a decline is a completed observation outside the
 * denominator; a press inside the settle window is refused (the caller
 * re-presents the stage).
 */
export function answerM09Offer(
  answer: 'accept' | 'decline',
  optionPosition: number,
  optionCount: number,
  nowMs: number,
  input: ObservedInput,
): M09AnswerResult {
  if (!m09OfferAvailable()) {
    return 'invalid';
  }

  const result = m09Answer(
    state,
    answer,
    optionPosition,
    optionCount,
    nowMs,
    input,
    sink,
  );

  if (result === 'accepted') {
    m09Window.open(nowMs, { accepted: true, stage: pilotStage() });
    m09OpenAcceptanceCheck(state, pilotStage(), M09_GAUGE_ACCESS, nowMs, sink);
    registerWatchLogEntry();
  } else if (result === 'declined') {
    m09Window.open(nowMs, { accepted: false, stage: pilotStage() });
    finishDuty(nowMs, 'declined');
  }

  return result;
}

/** "Ask me again later." — only the settle window applies; nothing is answered. */
export function deferM09Offer(
  optionPosition: number,
  optionCount: number,
  nowMs: number,
): M09DeferResult {
  if (!m09OfferAvailable()) {
    return 'invalid';
  }

  return m09Defer(state, optionPosition, optionCount, nowMs, sink);
}

/** Concourse entry: the lab-pass or the return-pass check opens, once each. */
export function enterM09Concourse(nowMs: number) {
  const opened = m09ConcourseEntered(
    state,
    pilotStage(),
    M09_GAUGE_ACCESS,
    nowMs,
    (suffix, metadata) => {
      // The window id follows the check that is due.
      const index = metadata.check_index as 1 | 2 | 3 | undefined;

      if (suffix === 'check_window_opened' && index !== undefined) {
        m09Window.spec.windowId = M09_WINDOW_IDS[index];
      }

      sink(suffix, metadata);
    },
  );

  return opened;
}

/** Concourse exit through any door: an open check closes unread. */
export function exitM09Concourse(exitTo: string | null, nowMs: number) {
  if (m09ConcourseExited(state, exitTo, nowMs, sink).duty_finished) {
    finishDuty(nowMs, 'completed');
  }
}

/** The gauge was read (always available); the model decides the credit. */
export function readM09Gauge(nowMs: number, input: ObservedInput) {
  const result: M09ReadResult = m09ReadGauge(
    state,
    pilotStage(),
    nowMs,
    input,
    sink,
  );

  if (result.duty_finished) {
    finishDuty(nowMs, 'completed');
  }

  return result;
}

/**
 * The station log was opened: one exposure record while the duty is
 * active (which line, its position, whether the map could show it).
 */
export function noteM09ReminderLogViewed() {
  if (!m09Accepted(state)) {
    return;
  }

  const position =
    pilotMissionLog().findIndex((entry) => entry.id === LOG_ENTRY_ID) + 1;

  m09NoteLogViewed(
    state,
    pilotStage(),
    {
      rendered: position >= 1 && position <= STATION_LOG_VISIBLE_LINES,
      log_position: position >= 1 ? position : null,
    },
    sink,
  );
}

/** Deck review: close whatever is still open (never a low value). */
export function closeM09AtReview(nowMs: number) {
  if (heldBack) {
    return;
  }

  if (state.presented_at_ms === null) {
    m09Window.markAbsent('offer never presented before the review');
    return;
  }

  if (state.answer === null) {
    m09Window.open(nowMs, { accepted: null });
    m09Window.stop(
      nowMs,
      'closed_at_review',
      {
        ...m09RawComponents(state, 'closed_at_review'),
        offer_unanswered: true,
      },
      'system',
    );
    return;
  }

  if (m09CloseAtReview(state, nowMs, sink)) {
    finishDuty(nowMs, 'closed_at_review');
  }
}

/** Test-only escape hatch. */
export function resetM09State() {
  state = createM09State();
  heldBack = false;
  m09Window.reset();
  m09Window.spec.windowId = M09_WINDOW_IDS[1];
}
