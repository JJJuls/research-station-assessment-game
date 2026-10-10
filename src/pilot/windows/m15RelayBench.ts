/**
 * M15 — the window adapter of the two relay boxes (Station 080 M01–M26
 * run, Unit 18; administration `m15-systems-v1`).
 *
 * Owns the ONE register window of the series (opportunity
 * `proto_m15_systems_series`, the kit's window id `m15_system_s1`, family
 * `proto_m15_systems_`), the session-scope series state, the log sink
 * (the kit's required fields plus the protocol stamp), the optional
 * focused clock and the reload guard; every command delegates to the pure
 * model (`m15SystemsModel.ts`) with its input mode, and the surface model
 * (`m15SurfaceModel.ts`) calls only these commands.
 *
 * Closure rules (research-owner decision D-U18-1, 10 October 2026): the
 * fourth first response completes the window; ESC / LEAVE BENCH keep the
 * bench resumable; the review censors a series still in its orientation or
 * first-response phase with the wirings and answers as they stand and
 * marks a never-opened bench absent (`briefed_not_opened`, never
 * `declined`); a bench opened in an earlier page load is never re-run, and
 * a later load's first laboratory entry writes the reload check. The v2
 * ids `proto_m15_layered_cipher` / `proto_m15_cipher_*` are retired from
 * the route and are not written by this build. Nothing here scores.
 */
import { FocusedClock } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import type { M15SurfaceHost } from './m15SurfaceModel';
import {
  M15_ENTRY_STATE_VERSION,
  M15_FAMILY,
  M15_OBJECT_ID,
  M15_OPPORTUNITY_ID,
  M15_SCENE,
  M15_WINDOW_ID,
} from './m15SystemsContent';
import {
  createM15Series,
  M15_RELOAD_DETAIL,
  m15ClosureSnapshot,
  type M15CommitKind,
  type M15ConfirmOutcome,
  m15CurrentQuestion,
  m15EntrySnapshot,
  type M15FailOutcome,
  m15Live,
  type M15LogSink,
  type M15NextOutcome,
  m15PriorAdministration,
  m15PriorLoadCheck,
  type M15RequestOutcome,
  m15sCancelCommit,
  m15sCloseAtReview,
  m15sCloseHelp,
  m15sConfirmCommit,
  m15sDraft,
  type M15Series,
  m15sFail,
  m15sFinish,
  m15sHelp,
  m15sHoldBack,
  m15sLeave,
  m15sNext,
  m15sOpen,
  m15sRequestCommit,
  m15sResultsNavigate,
  m15sStart,
  m15sTest,
  type M15TestOutcome,
} from './m15SystemsModel';
import { type InputMode, ItemWindow } from './windowKit';

export {
  M15_ENTRY_STATE_VERSION,
  M15_FAMILY,
  M15_OPPORTUNITY_ID,
  M15_WINDOW_ID,
} from './m15SystemsContent';

export const m15Window = new ItemWindow({
  item: 'M15',
  opportunityId: M15_OPPORTUNITY_ID,
  windowId: M15_WINDOW_ID,
  entryStateVersion: M15_ENTRY_STATE_VERSION,
  family: M15_FAMILY,
  scene: M15_SCENE,
  objectId: M15_OBJECT_ID,
});

let series: M15Series | null = null;
let clock: FocusedClock | null = null;
/** Focused ms at each question's presentation (per-question focused time). */
const focusedMarks: Record<string, number> = {};
let briefed = false;
/** The reload check is written once per page load. */
let priorLoadChecked = false;

function ensure(): M15Series {
  if (series === null) {
    series = createM15Series();
  }

  return series;
}

const sink: M15LogSink = (suffix, metadata) => {
  m15Window.log(suffix, { ...protocolStamp(), ...metadata });
};

function startClock(nowMs: number) {
  if (clock !== null) {
    return;
  }

  clock = new FocusedClock();
  clock.start(nowMs);
  registerFocusedClock(clock);
}

function stopClock(nowMs: number) {
  if (clock === null) {
    return;
  }

  clock.stop(nowMs);
  releaseFocusedClock(clock);
}

/** Remembers the focused time at which the current question was presented. */
function markCurrentQuestion(nowMs: number) {
  const s = ensure();

  if (
    s.status !== 'first_responses' ||
    s.view !== 'question' ||
    clock === null
  ) {
    return;
  }

  const id = m15CurrentQuestion(s).id;

  if (focusedMarks[id] === undefined) {
    focusedMarks[id] = clock.focusedMs(nowMs);
  }
}

/**
 * A fault in the orientation or the first-response phase closes the
 * series as a technical failure through the kit (invalid, never
 * behaviour); after completion it is recorded without touching the scored
 * evidence. Never throws.
 */
export function failM15(detail: string, nowMs: number = Date.now()) {
  const s = ensure();
  let outcome: M15FailOutcome;

  try {
    outcome = m15sFail(s, detail);
  } catch {
    outcome = 'none';
  }

  try {
    if (outcome === 'scored_phase') {
      stopClock(nowMs);
      m15Window.technicalFailure(detail);
    } else if (outcome === 'feedback') {
      sink('technical_failure', {
        phase: 'feedback',
        detail,
        input_mode: 'system',
      });
    }
  } catch {
    // The fault record itself failed: the series state already says
    // technical failure; nothing else can be done here.
  }
}

/** Runs a command; a thrown fault is routed to `failM15` and `fallback` returned. */
function guarded<T>(name: string, fallback: T, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    failM15(`${name}: ${message}`);

    return fallback;
  }
}

export function declareM15() {
  ensure();
  m15Window.declare();
}

export function m15Series(): Readonly<M15Series> {
  return ensure();
}

/** True when the bench is a closed record in this page load. */
export function m15Closed(): boolean {
  return !m15Live(ensure()) && ensure().status !== 'unopened';
}

/**
 * Kai's briefing names the evidence table: the briefing exposure is
 * recorded through the kit's `present` (`presented`) — exposure only, not
 * a bench opening and not a question presentation (decision D-U18-1,
 * item 5).
 */
export function presentM15(nowMs: number) {
  declareM15();
  briefed = true;
  m15Window.present(nowMs);
}

/**
 * The reload check (decision D-U18-1 item 6; the M14 closeout ruling of
 * 9 October 2026 applied to M15): once per page load after a reload, at
 * the first guard run, the family records whether the recovered history
 * is continuous and whether it holds an earlier opening or briefing
 * (`prior_load_checked`) — the current-load evidence from which the
 * extractor reads an ESTABLISHED absence of an earlier opening. A first
 * page load writes nothing.
 */
function recordPriorLoadCheck(prior: readonly { event_type: string }[]) {
  const pageLoadIndex = researchRuntime.getPageLoadIndex();

  if (priorLoadChecked || pageLoadIndex <= 1) {
    return;
  }

  priorLoadChecked = true;
  sink('prior_load_checked', {
    phase: 'closure',
    ...m15PriorLoadCheck(
      pageLoadIndex,
      prior,
      researchRuntime.getEventIntegrity(),
    ),
    input_mode: 'system',
  });
}

/**
 * Reload guard (register §5.14): a bench opened in an earlier page load
 * of this identity is never re-run — prior exposure is recorded and the
 * series is marked technically incomplete; the new load's row is
 * `interrupted`. Idempotent; called at laboratory entry and at the open.
 */
export function guardM15Reload(): boolean {
  const s = ensure();

  if (s.status !== 'unopened' || m15Window.windowStatus() !== 'unopened') {
    return false;
  }

  const prior = researchRuntime.getPriorPageLoadEvents();

  recordPriorLoadCheck(prior);

  if (!m15PriorAdministration(prior)) {
    return false;
  }

  m15sHoldBack(s);
  m15Window.recordPriorExposure(
    'relay bench opened in an earlier page load of this identity',
  );
  m15Window.technicalFailure(M15_RELOAD_DETAIL);

  return true;
}

/**
 * Opens (or reopens) the bench. The first opening writes the kit's
 * `opportunity_opened` with the entry snapshot (`stage` = the route stage
 * at the open); every later opening resumes the view as it stood.
 */
export function openM15(nowMs: number, entry: { stage?: string | null } = {}) {
  declareM15();
  guardM15Reload();

  const s = ensure();

  guarded('open', undefined, () => {
    if (s.status === 'unopened') {
      m15Window.setComprehension('not_required');
      m15Window.open(nowMs, m15EntrySnapshot(entry.stage ?? null));
      startClock(nowMs);
    } else if (m15Live(s)) {
      m15Window.open(nowMs);
      clock?.resume('surface_closed', nowMs);
    }

    m15sOpen(s, nowMs, sink);
    markCurrentQuestion(nowMs);
  });
}

/** START BOX 1 on the orientation card. */
export function startM15(mode: InputMode, nowMs: number): boolean {
  return guarded('start', false, () => m15sStart(ensure(), mode, nowMs, sink));
}

export function testM15Dial(
  dialId: string,
  mode: InputMode,
  nowMs: number,
): M15TestOutcome {
  return guarded('test', 'none' as const, () =>
    m15sTest(ensure(), dialId, mode, nowMs, sink),
  );
}

export function draftM15Option(
  optionId: string,
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('draft', false, () =>
    m15sDraft(ensure(), optionId, mode, nowMs, sink),
  );
}

export function requestM15Commit(
  kind: M15CommitKind,
  mode: InputMode,
  nowMs: number,
): M15RequestOutcome {
  return guarded('request', 'none' as const, () =>
    m15sRequestCommit(ensure(), kind, mode, nowMs, sink),
  );
}

export function cancelM15Commit(mode: InputMode, nowMs: number): boolean {
  return guarded('cancel', false, () =>
    m15sCancelCommit(ensure(), mode, nowMs, sink),
  );
}

/** FINISH on the results: true when the settled view may close. */
export function finishM15(nowMs: number): boolean {
  return guarded('finish', false, () => m15sFinish(ensure(), nowMs));
}

/**
 * The confirming press. A recorded fourth first response completes the
 * kit window right after the model's `first_responses_completed`.
 */
export function confirmM15Commit(
  mode: InputMode,
  nowMs: number,
): M15ConfirmOutcome {
  return guarded('confirm', 'none' as const, () => {
    const s = ensure();
    const id =
      s.status === 'first_responses' && s.view === 'question'
        ? m15CurrentQuestion(s).id
        : null;
    const focused =
      clock !== null && id !== null
        ? clock.focusedMs(nowMs) - (focusedMarks[id] ?? 0)
        : null;
    const outcome = m15sConfirmCommit(s, mode, nowMs, sink, {
      focused_ms: focused,
    });

    if (outcome === 'recorded' && s.status === 'completed') {
      stopClock(nowMs);
      m15Window.complete(nowMs, m15ClosureSnapshot(s), mode);
    }

    return outcome;
  });
}

export function nextM15(mode: InputMode, nowMs: number): M15NextOutcome {
  return guarded('next', 'none' as const, () => {
    const outcome = m15sNext(ensure(), mode, nowMs, sink);

    markCurrentQuestion(nowMs);

    return outcome;
  });
}

export function navigateM15Results(
  direction: 'next' | 'back',
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('results', false, () =>
    m15sResultsNavigate(ensure(), direction, mode, nowMs, sink),
  );
}

export function openM15Help(mode: InputMode, nowMs: number): boolean {
  return guarded('help', false, () => m15sHelp(ensure(), mode, nowMs, sink));
}

export function closeM15Help(nowMs: number): boolean {
  return guarded('close_help', false, () => m15sCloseHelp(ensure(), nowMs));
}

/**
 * ESC order: an open dialog closes first, then the help sheet; only then
 * does ESC leave the bench. Returns true when ESC was consumed.
 */
export function m15ConsumesEsc(nowMs: number): boolean {
  return guarded('esc', false, () => {
    const s = ensure();

    if (s.pending_commit !== null) {
      m15sCancelCommit(s, 'keyboard', nowMs, sink);

      return true;
    }

    if (!s.help_open) {
      return false;
    }

    // ESC on the help sheet always closes it (the settle guards only the
    // activations of the restored view).
    s.help_open = false;
    s.view_shown_at_ms = nowMs;

    if (s.acknowledgement !== null) {
      s.acknowledgement.opened_at_ms = nowMs;
    }

    return true;
  });
}

/** The surface closed (ESC, LEAVE BENCH, FINISH): the window pauses; nothing closes. */
export function closeM15Surface(nowMs: number) {
  guarded('leave', undefined, () => {
    const s = ensure();

    if (!s.panel_open) {
      return;
    }

    m15sLeave(s, nowMs, sink);

    if (m15Window.isOpen()) {
      m15Window.pause(nowMs);
    }

    clock?.pause('surface_closed', nowMs);
  });
}

export function resumeM15Surface(nowMs: number) {
  m15Window.resume(nowMs);
}

/**
 * The station-record closure at the Utility Deck review. A series still
 * in its orientation or first-response phase closes as `closed_at_review`
 * (wirings and answers kept, unanswered questions missing, censored); a
 * completed series is not reclosed; a never-opened bench is recorded
 * absent — `briefed_not_opened` when the briefing was acknowledged, never
 * `declined` (decision D-U18-1, item 5).
 */
export function closeM15AtReview(nowMs: number) {
  const s = ensure();

  if (m15Window.windowStatus() === 'unopened') {
    m15Window.markAbsent(
      briefed ? 'briefed_not_opened' : 'not_briefed_not_opened',
    );

    return;
  }

  guarded('review', undefined, () => {
    if (m15sCloseAtReview(s, nowMs, sink)) {
      stopClock(nowMs);
      m15Window.stop(
        nowMs,
        'closed_at_review',
        { ...m15ClosureSnapshot(s), invalid_detail: 'closed_at_review' },
        'system',
        'censored',
      );
    }
  });
}

/**
 * Binds the surface model to this adapter: the host scene supplies the
 * clock, the close path and the feedback line; the state reader and
 * every command come from here (the surface model stays pure).
 */
export function bindM15Surface(base: {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
}): M15SurfaceHost {
  return {
    ...base,
    series: m15Series,
    commands: {
      start: startM15,
      test: testM15Dial,
      draft: draftM15Option,
      request: requestM15Commit,
      cancel: cancelM15Commit,
      confirm: confirmM15Commit,
      finish: finishM15,
      next: nextM15,
      navigateResults: navigateM15Results,
      help: openM15Help,
      closeHelp: closeM15Help,
    },
  };
}

/** Test-only escape hatch. */
export function resetM15State() {
  if (clock !== null) {
    releaseFocusedClock(clock);
    clock = null;
  }

  for (const key of Object.keys(focusedMarks)) {
    delete focusedMarks[key];
  }

  series = null;
  briefed = false;
  priorLoadChecked = false;
  m15Window.reset();
}
