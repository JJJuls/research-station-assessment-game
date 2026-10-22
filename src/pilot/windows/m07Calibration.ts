/**
 * M07 — Six-stage routine calibration project (evidence-led pilot v2;
 * Unit 2 hosts the start in the Records Workshop, the same bench hosts
 * the natural return in episode 5).
 *
 * Ledger (sheet 09): six-stage routine calibration with a visible
 * endpoint and persistent state; the participant may leave and naturally
 * return; no injected setback or difficulty spike; attainable; controls
 * known; no route gate forces completion. Distinguish routine finish-
 * through from PDD.
 *
 * Mechanic (work surface): the calibration bench shows six stage tiles
 * (1/6 … 6/6) and one ADVANCE control; each advance runs a 1.4 s settle
 * and marks the stage done. State is session-scope: leaving the surface,
 * the workshop or the zone keeps progress; the bench shows the same
 * progress on every return. The endpoint (6/6) is always visible.
 *
 * Raw components: stages_completed, voluntary_returns (surface reopened
 * after leaving with stages remaining), useful_reengagement (returns that
 * advanced ≥1 stage), completion, departure_state (stage count at each
 * departure; last one at close).
 *
 * Station 080 U24 Part A (owner ruling of 21 October 2026, D-U24-1 M07-1
 * to M07-4 a, clarification 2, RA-1, RA-2): administration
 * `m07-calibration-v2`. Entry = the participant opened the bench; the
 * review closes a never-opened bench as absent (`markAbsent`) and never
 * opens or completes it. A bench opened in an earlier page load is held
 * back (register §5.14; §5.270 for both phases, a completed earlier load
 * included), and a reloaded load's first Workshop entry writes the
 * provisional `prior_load_checked` record (register §5.290 (a), adapted to
 * M07 by RA-1).
 *
 * Closeout amendment of 22 October 2026 (register §5.378 (3) and (4)): a
 * reloaded load also holds the bench back when the absence of an earlier
 * opening cannot be established, and when an earlier load's review closed
 * the bench unopened (terminal). Each kind has its own detail and screen;
 * none fabricates an earlier opening.
 */
import { researchRuntime } from '../../systems';
import { registerMissionLogEntry } from '../pilotRoute';
import { phaseMetadata } from '../return/returnEpisodeModel';
import { type InputMode, ItemWindow } from './windowKit';

export const M07_OPPORTUNITY_ID = 'proto_m07_calibration_project';
export const M07_ENTRY_STATE_VERSION = 'm07-calibration-v2';
export const M07_FAMILY = 'proto_m07_calibration_';
export const M07_WINDOW_IDS = {
  start: 'm07_calibration_start',
  end: 'm07_calibration_end',
} as const;
export const M07_STAGES = 6;
export const M07_SETTLE_MS = 1400;
/** The kit's technical-failure detail of the reload hold-back (register §5.14). */
export const M07_RELOAD_DETAIL =
  'reload after administration: bench not re-run';

/**
 * Why a reloaded load holds the bench back (register §5.378): an earlier
 * opening found (§5.14), an earlier state that could not be verified
 * (§5.378 (3)), or an earlier review closure of the unopened bench
 * (§5.378 (4)).
 */
export type M07HoldBackKind =
  | 'prior_opening'
  | 'unverified_history'
  | 'prior_review_closure';

/** The kit's technical-failure detail per hold-back kind (each begins `reload`). */
export const M07_RELOAD_DETAILS: Readonly<Record<M07HoldBackKind, string>> = {
  prior_opening: M07_RELOAD_DETAIL,
  unverified_history:
    'reload with an unverified earlier state: bench not administered',
  prior_review_closure: 'reload after a review closure: bench not reopened',
};

/**
 * How the start phase reached the return (Unit 5): `present` = the bench
 * was opened in episode 2; `missing` = never opened before the return
 * (the end opportunity is still presented and recorded as such — never a
 * low value); `completed` = the project finished in episode 2.
 */
export type M07StartState = 'present' | 'missing' | 'completed';

interface M07State {
  stagesCompleted: number;
  settlingUntilMs: number | null;
  surfaceOpen: boolean;
  visits: number;
  voluntaryReturns: number;
  usefulReengagements: number;
  stagesAtVisitStart: number;
  departures: number[];
  completed: boolean;
  /** The end opportunity was presented (workshop entered on the return). */
  endPresentedAtMs: number | null;
  startState: M07StartState | null;
  /**
   * The bench is held back in this load after a reload (register §5.14 /
   * §5.270 / §5.378), and why; null = administered normally.
   */
  holdBack: M07HoldBackKind | null;
}

let state: M07State = initial();
/** The reload check of this page load, written once (register §5.290 (a)). */
let priorLoadCheck: M07PriorLoadCheck | null = null;

function initial(): M07State {
  return {
    stagesCompleted: 0,
    settlingUntilMs: null,
    surfaceOpen: false,
    visits: 0,
    voluntaryReturns: 0,
    usefulReengagements: 0,
    stagesAtVisitStart: 0,
    departures: [],
    completed: false,
    endPresentedAtMs: null,
    startState: null,
    holdBack: null,
  };
}

export const m07Window = new ItemWindow({
  item: 'M07',
  opportunityId: M07_OPPORTUNITY_ID,
  windowId: M07_WINDOW_IDS.start,
  entryStateVersion: M07_ENTRY_STATE_VERSION,
  family: M07_FAMILY,
  scene: 'records_workshop',
  objectId: 'm07_calibration_bench',
});

export function declareM07() {
  m07Window.declare();
}

export function m07State(): Readonly<M07State> {
  return state;
}

/** True when the bench is held back after a reload (never re-run). */
export function m07HeldBack(): boolean {
  return state.holdBack !== null;
}

/** Why the bench is held back in this load (null = administered normally). */
export function m07HoldBackKind(): M07HoldBackKind | null {
  return state.holdBack;
}

/** An earlier page load's record, as the runtime recovered it. */
export interface M07PriorEvent {
  event_type: string;
  metadata?: Record<string, unknown>;
}

/** True when an earlier page load of this identity opened the bench (either phase). */
export function m07PriorAdministration(
  priorLoadEvents: readonly M07PriorEvent[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M07_FAMILY}opportunity_opened`,
  );
}

/**
 * True when an earlier page load's station review closed the bench as
 * absent (the kit's `window_closed`, exit `closed_at_review`). The review
 * closes only an unopened bench this way (M07-4 a).
 */
export function m07PriorReviewClosure(
  priorLoadEvents: readonly M07PriorEvent[],
): boolean {
  return priorLoadEvents.some(
    (event) =>
      event.event_type === `${M07_FAMILY}window_closed` &&
      event.metadata?.exit_state === 'closed_at_review',
  );
}

/**
 * An earlier load's reload hold-back that no earlier review closure
 * explains (register §5.379 (b), §5.381 (2)): that load could not establish
 * the absence of an opening before it, so neither can a later load. Only a
 * hold-back whose detail names the review closure is explained, and only
 * when that closure is on record; an intervening unverified-history
 * hold-back stays unexplained.
 */
function priorHoldBackUnexplained(
  priorLoadEvents: readonly M07PriorEvent[],
): boolean {
  const reviewClosed = m07PriorReviewClosure(priorLoadEvents);

  return priorLoadEvents.some((event) => {
    const detail = String(event.metadata?.detail ?? '');

    return (
      event.event_type === `${M07_FAMILY}technical_failure` &&
      detail.startsWith('reload') &&
      !(reviewClosed && detail === M07_RELOAD_DETAILS.prior_review_closure)
    );
  });
}

/** The losslessness evidence the runtime keeps beside the raw events. */
export interface M07HistoryIntegrity {
  first_sequence: number | null;
  sequence_gap_count: number;
  sequence_duplicate_count: number;
  /** The store's meta record was unreadable; the history came from chunks. */
  recovered_from_chunks: boolean;
}

/** The reload check written once per page load after a reload. */
export interface M07PriorLoadCheck {
  page_load_index: number;
  prior_page_load_event_count: number;
  prior_opening_found: boolean;
  prior_end_presented_found: boolean;
  history_continuous: boolean;
  prior_opening_absence_established: boolean;
}

/**
 * The reload check of a later page load (register §5.290 (a), the M14
 * closeout ruling of 9 October 2026, adapted to M07 by the owner's RA-1
 * decision of 21 October 2026): the absence of an earlier opening is
 * ESTABLISHED only when the recovered history is continuous — at least one
 * earlier record, sequence numbers running from 1 without a gap or a
 * duplicate, and the store's own meta record readable — and holds no
 * `opportunity_opened` of this family in either phase. A missing or broken
 * history never establishes absence; a found opening is the hold-back.
 * M07 has no briefing: in place of §5.290 (a)'s `prior_briefing_found` the
 * record reports an earlier `end_presented` (RA-1's one adapted field),
 * which is never read as this load's exposure. An earlier load's hold-back
 * that no earlier review closure explains keeps the absence unestablished
 * (register §5.379; only a hold-back naming that closure is explained,
 * §5.381 (2)).
 */
export function m07PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly M07PriorEvent[],
  integrity: M07HistoryIntegrity,
): M07PriorLoadCheck {
  const found = m07PriorAdministration(priorLoadEvents);
  const continuous =
    priorLoadEvents.length > 0 &&
    integrity.first_sequence === 1 &&
    integrity.sequence_gap_count === 0 &&
    integrity.sequence_duplicate_count === 0 &&
    integrity.recovered_from_chunks === false;

  return {
    page_load_index: pageLoadIndex,
    prior_page_load_event_count: priorLoadEvents.length,
    prior_opening_found: found,
    prior_end_presented_found: priorLoadEvents.some(
      (event) => event.event_type === `${M07_FAMILY}end_presented`,
    ),
    history_continuous: continuous,
    prior_opening_absence_established:
      !found && continuous && !priorHoldBackUnexplained(priorLoadEvents),
  };
}

/**
 * The hold-back decision of a reloaded load (register §5.14, §5.270 and
 * §5.378 (3) / (4)), in this precedence: an earlier opening found; the
 * absence of an earlier opening not established; an earlier review closure
 * of the unopened bench (verified: only read once the absence is
 * established). Null = the bench is administered normally (a confirmed
 * absence, §5.290 (a)).
 */
export function m07ReloadHoldBack(
  priorLoadEvents: readonly M07PriorEvent[],
  check: M07PriorLoadCheck,
): M07HoldBackKind | null {
  if (check.prior_opening_found) {
    return 'prior_opening';
  }

  if (!check.prior_opening_absence_established) {
    return 'unverified_history';
  }

  return m07PriorReviewClosure(priorLoadEvents) ? 'prior_review_closure' : null;
}

/**
 * The reload check of this page load (RA-1): computed and written once,
 * at the first guard run; a first page load has none and writes nothing.
 */
function recordPriorLoadCheck(
  prior: readonly M07PriorEvent[],
): M07PriorLoadCheck | null {
  const pageLoadIndex = researchRuntime.getPageLoadIndex();

  if (pageLoadIndex <= 1) {
    return null;
  }

  if (priorLoadCheck === null) {
    priorLoadCheck = m07PriorLoadCheck(
      pageLoadIndex,
      prior,
      researchRuntime.getEventIntegrity(),
    );
    logM07('prior_load_checked', {
      ...priorLoadCheck,
      input_mode: 'system',
    });
  }

  return priorLoadCheck;
}

/**
 * Reload guard (register §5.14; §5.270: both phases, a completed earlier
 * load included; §5.290 (a) as adapted by RA-1; §5.378 (3) / (4)). Called
 * at the first Workshop entry of a page load — before any M07 opening —
 * and again at the open. The check is written first. When the bench is
 * held back, the window is closed as a technical failure with the kind's
 * detail (beginning `reload`); prior exposure is recorded only for an
 * earlier opening found, never invented for the other kinds. A held-back
 * bench is never re-run: `openM07`, `advanceM07`, `presentM07End` and
 * `closeM07AtReview` write nothing further in this load. Idempotent.
 */
export function guardM07Reload(): boolean {
  if (state.holdBack !== null) {
    return true;
  }

  if (m07Window.windowStatus() !== 'unopened' || state.visits > 0) {
    return false;
  }

  declareM07();

  const prior = researchRuntime.getPriorPageLoadEvents();
  const check = recordPriorLoadCheck(prior);
  const kind = check === null ? null : m07ReloadHoldBack(prior, check);

  if (kind === null) {
    return false;
  }

  state.holdBack = kind;

  if (kind === 'prior_opening') {
    m07Window.recordPriorExposure(
      'calibration bench opened in an earlier page load of this identity',
    );
  }

  m07Window.technicalFailure(M07_RELOAD_DETAILS[kind]);

  return true;
}

/** Every event carries its phase and BOTH ledger window ids (Unit 5). */
function m07Phase() {
  return phaseMetadata(
    'M07',
    m07Window.spec.windowId === M07_WINDOW_IDS.end ? 'end' : 'start',
  );
}

function logM07(suffix: string, metadata: Record<string, unknown>) {
  m07Window.log(suffix, { ...m07Phase(), ...metadata });
}

/**
 * The END opportunity is presented: the workshop is entered on the return
 * shift with the bench available (once). Whatever the start history —
 * present, missing or already completed — the route is identical and the
 * fact is recorded; a missing start never becomes a low result.
 */
export function presentM07End(nowMs: number) {
  // A held-back bench writes no end record (U24 Part A, §5.14).
  if (state.holdBack !== null || state.endPresentedAtMs !== null) {
    return;
  }

  declareM07();
  state.endPresentedAtMs = nowMs;
  state.startState = state.completed
    ? 'completed'
    : state.visits > 0
      ? 'present'
      : 'missing';

  if (state.completed) {
    return; // the window closed in episode 2: nothing to present
  }

  m07Window.spec.windowId = M07_WINDOW_IDS.end;
  logM07('end_presented', {
    start_state: state.startState,
    stages_completed: state.stagesCompleted,
    input_mode: 'system',
  });
}

function rawComponents(completion: boolean) {
  return {
    ...m07Phase(),
    stages_completed: state.stagesCompleted,
    voluntary_returns: state.voluntaryReturns,
    useful_reengagement: state.usefulReengagements,
    completion,
    departure_state: [...state.departures],
    visits: state.visits,
    start_state: state.startState ?? (state.visits > 0 ? 'present' : 'missing'),
    end_presented: state.endPresentedAtMs !== null,
  };
}

export function m07Settling(nowMs: number): boolean {
  return state.settlingUntilMs !== null && nowMs < state.settlingUntilMs;
}

/**
 * The bench surface was opened by the participant (first time = start =
 * entry, D-U24-1 M07-1 a; later = a visit/return). A bench held back after
 * a reload is never opened (the scene shows the held-back screen instead).
 */
export function openM07(
  nowMs: number,
  stage: 'workshop_work' | 'workshop_return' | 'other',
) {
  declareM07();

  if (guardM07Reload()) {
    return;
  }

  m07Window.open(nowMs, {
    stages: M07_STAGES,
    settle_ms: M07_SETTLE_MS,
    endpoint_visible: true,
  });
  state.visits += 1;
  state.stagesAtVisitStart = state.stagesCompleted;
  state.surfaceOpen = true;

  if (state.visits > 1 && !state.completed) {
    state.voluntaryReturns += 1;
    m07Window.spec.windowId = M07_WINDOW_IDS.end;
    logM07('returned', {
      visit: state.visits,
      stages_completed: state.stagesCompleted,
      route_stage: stage,
      start_state: state.startState ?? 'present',
      input_mode: 'system',
    });
  } else if (
    state.visits === 1 &&
    m07Window.spec.windowId === M07_WINDOW_IDS.end
  ) {
    // The bench is first opened on the return: the end opportunity with a
    // MISSING start (recorded as such; never a low value).
    logM07('end_opened_without_start', {
      route_stage: stage,
      start_state: 'missing',
      input_mode: 'system',
    });
  }

  m07Window.resume(nowMs);
  registerMissionLogEntry({
    id: 'm07_project',
    kind: 'project',
    order: 20,
    text: () =>
      `Calibration bench: stage ${state.stagesCompleted} of ${M07_STAGES} done.`,
    isClosed: () => state.completed,
  });
}

export function advanceM07(nowMs: number, inputMode: InputMode): boolean {
  if (
    state.holdBack !== null ||
    !m07Window.isOpen() ||
    state.completed ||
    m07Settling(nowMs)
  ) {
    return false;
  }

  state.stagesCompleted += 1;
  state.settlingUntilMs = nowMs + M07_SETTLE_MS;
  logM07('stage_advanced', {
    stage: state.stagesCompleted,
    of: M07_STAGES,
    visit: state.visits,
    input_mode: inputMode,
  });

  if (state.stagesCompleted >= M07_STAGES) {
    state.completed = true;

    if (state.visits > 1) {
      state.usefulReengagements +=
        state.stagesCompleted > state.stagesAtVisitStart ? 1 : 0;
    }

    m07Window.complete(nowMs, rawComponents(true), inputMode);
  }

  return true;
}

/** The surface was closed (departure with the project at its current stage). */
export function closeM07Surface(nowMs: number) {
  if (!state.surfaceOpen) {
    return;
  }

  state.surfaceOpen = false;
  m07Window.pause(nowMs);

  if (!state.completed) {
    state.departures.push(state.stagesCompleted);

    if (state.visits > 1 && state.stagesCompleted > state.stagesAtVisitStart) {
      state.usefulReengagements += 1;
    }

    logM07('departed', {
      stages_completed: state.stagesCompleted,
      visit: state.visits,
      input_mode: 'system',
    });
  }
}

/**
 * Deck review (the common milestone, D-U24-1 M07-3 a): an ENTERED
 * unfinished project closes as a completed observation (completion
 * false). A bench never opened in EITHER phase — the end opportunity
 * presented on the return or not — is closed through the kit's absence
 * path (`closed_at_review`, validity `participant_absent`): never opened,
 * never completed, never a value (M07-4 a; the v1 review opened and
 * completed it as 0/6, the P7 defect). A held-back bench writes nothing.
 */
export function closeM07AtReview(nowMs: number) {
  if (state.holdBack !== null) {
    return;
  }

  if (m07Window.windowStatus() === 'unopened') {
    m07Window.markAbsent('bench never opened before the review');
    return;
  }

  if (m07Window.isOpen()) {
    closeM07Surface(nowMs);
    m07Window.complete(nowMs, rawComponents(false), 'system');
  }
}

/** Test-only escape hatch. */
export function resetM07State() {
  state = initial();
  priorLoadCheck = null;
  m07Window.reset();
  m07Window.spec.windowId = M07_WINDOW_IDS.start;
}
