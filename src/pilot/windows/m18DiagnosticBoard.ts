/**
 * M18 — the window adapter of the diagnostic board (Station 080 M01–M26
 * run, Unit 20; administration `m18-cases-v1`).
 *
 * Owns the ONE register window of the series (opportunity
 * `proto_m18_cases_series`, window id `m18_cases_w1`, family
 * `proto_m18_cases_`), the session-scope series state, the log sink (the
 * kit's required fields plus the protocol stamp), the optional focused
 * clock and the reload guard; every command delegates to the pure model
 * (`m18DiagnosisModel.ts`) with its input mode, and the surface model
 * (`m18SurfaceModel.ts`) calls only these commands.
 *
 * Closure rules (research-owner decision D-U20-1, 12 October 2026): the
 * sixth first response completes the window; ESC / LEAVE BOARD keep the
 * board resumable; the review censors a series still at the card, in a case
 * or in a step with the answers as they stand and marks a never-opened board
 * absent (`briefed_not_opened`, never `declined`); a board opened in an
 * earlier page load is never re-run, and a later load's first laboratory
 * entry writes the reload check. The v2 ids
 * `proto_m18_lattice_fault_diagnosis` / `proto_m18_fault_*` /
 * `m18_diagnosis_w1` are retired from the route and are not written by this
 * build; the legacy board stays untouched on the developer alias. Nothing
 * here scores.
 */
import { FocusedClock } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import {
  M18_ENTRY_STATE_VERSION,
  M18_FAMILY,
  M18_OBJECT_ID,
  M18_OPPORTUNITY_ID,
  M18_SCENE,
  M18_WINDOW_ID,
  type M18Slot,
} from './m18DiagnosisContent';
import {
  createM18Series,
  M18_RELOAD_DETAIL,
  m18ClosureSnapshot,
  type M18CommitKind,
  type M18ConfirmOutcome,
  m18CurrentCase,
  m18CurrentSlot,
  m18EntrySnapshot,
  type M18FailOutcome,
  m18Live,
  type M18LogSink,
  type M18NextOutcome,
  m18PriorAdministration,
  m18PriorLoadCheck,
  type M18RequestOutcome,
  m18sCancelCommit,
  m18sCloseAtReview,
  m18sCloseHelp,
  m18sCloseUnopenedAtReview,
  m18sConfirmCommit,
  m18sDraft,
  type M18Series,
  m18Settling,
  m18sFail,
  m18sFinish,
  m18sHelp,
  m18sHoldBack,
  m18sLeave,
  m18sNext,
  m18sOpen,
  m18sRequestCommit,
  m18sResultsNavigate,
  m18sRunTest,
  m18sStartCase1,
  type M18TestOutcome,
} from './m18DiagnosisModel';
import type { M18SurfaceHost } from './m18SurfaceModel';
import { type InputMode, ItemWindow } from './windowKit';

export {
  M18_ENTRY_STATE_VERSION,
  M18_FAMILY,
  M18_OPPORTUNITY_ID,
  M18_WINDOW_ID,
} from './m18DiagnosisContent';

export const m18Window = new ItemWindow({
  item: 'M18',
  opportunityId: M18_OPPORTUNITY_ID,
  windowId: M18_WINDOW_ID,
  entryStateVersion: M18_ENTRY_STATE_VERSION,
  family: M18_FAMILY,
  scene: M18_SCENE,
  objectId: M18_OBJECT_ID,
});

let series: M18Series | null = null;
let clock: FocusedClock | null = null;
/** Focused ms at each case's presentation and at each step's presentation (per slot). */
const focusedMarks: Record<string, number> = {};
let briefed = false;
/** The reload check is written once per page load. */
let priorLoadChecked = false;

function ensure(): M18Series {
  if (series === null) {
    series = createM18Series();
  }

  return series;
}

const sink: M18LogSink = (suffix, metadata) => {
  m18Window.log(suffix, { ...protocolStamp(), ...metadata });
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

function markKey(caseId: string, slot: M18Slot): string {
  return `${caseId}_${slot}`;
}

/** Remembers the focused time at which the current case's open slot was presented. */
function markCurrentSlot(nowMs: number) {
  const s = ensure();
  const slot = m18CurrentSlot(s);

  if (s.status !== 'measurement' || slot === null || clock === null) {
    return;
  }

  const key = markKey(m18CurrentCase(s).id, slot);

  if (focusedMarks[key] === undefined) {
    focusedMarks[key] = clock.focusedMs(nowMs);
  }
}

/**
 * A fault while the series is open closes it as a technical failure
 * through the kit (invalid, never behaviour); after completion it is
 * recorded without touching the scored evidence. Never throws.
 */
export function failM18(detail: string, nowMs: number = Date.now()) {
  const s = ensure();
  let outcome: M18FailOutcome;

  try {
    outcome = m18sFail(s, detail);
  } catch {
    outcome = 'none';
  }

  try {
    if (outcome === 'scored_phase') {
      stopClock(nowMs);
      m18Window.technicalFailure(detail);
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

/** Runs a command; a thrown fault is routed to `failM18` and `fallback` returned. */
function guarded<T>(name: string, fallback: T, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    failM18(`${name}: ${message}`);

    return fallback;
  }
}

export function declareM18Cases() {
  ensure();
  m18Window.declare();
}

export function m18Series(): Readonly<M18Series> {
  return ensure();
}

/** True when the board is a closed record in this page load. */
export function m18Closed(): boolean {
  return !m18Live(ensure()) && ensure().status !== 'unopened';
}

/**
 * Kai's briefing names the diagnostic board: the briefing exposure is
 * recorded through the kit's `present` (`presented`) — exposure only, not a
 * board opening and not a case presentation (decision D-U20-1, item 9).
 */
export function presentM18(nowMs: number) {
  declareM18Cases();
  briefed = true;
  m18Window.present(nowMs);
}

/**
 * The reload check (decision D-U20-1 item 9; the M14 closeout ruling of
 * 9 October 2026, D-U18-1 item 6 and D-U19-1 item 8 applied to M18): once
 * per page load after a reload, at the first guard run, the family records
 * whether the recovered history is continuous and whether it holds an
 * earlier opening or briefing (`prior_load_checked`) — the current-load
 * evidence from which the extractor reads an ESTABLISHED absence of an
 * earlier opening. A first page load writes nothing.
 */
function recordPriorLoadCheck(prior: readonly { event_type: string }[]) {
  const pageLoadIndex = researchRuntime.getPageLoadIndex();

  if (priorLoadChecked || pageLoadIndex <= 1) {
    return;
  }

  priorLoadChecked = true;
  sink('prior_load_checked', {
    phase: 'closure',
    ...m18PriorLoadCheck(
      pageLoadIndex,
      prior,
      researchRuntime.getEventIntegrity(),
    ),
    input_mode: 'system',
  });
}

/**
 * Reload guard (register §5.14): a board opened in an earlier page load of
 * this identity is never re-run — prior exposure is recorded and the series
 * is marked technically incomplete; the new load's rows are `interrupted`.
 * Idempotent; called at laboratory entry and at the open.
 */
export function guardM18Reload(): boolean {
  const s = ensure();

  if (s.status !== 'unopened' || m18Window.windowStatus() !== 'unopened') {
    return false;
  }

  const prior = researchRuntime.getPriorPageLoadEvents();

  recordPriorLoadCheck(prior);

  if (!m18PriorAdministration(prior)) {
    return false;
  }

  m18sHoldBack(s);
  m18Window.recordPriorExposure(
    'diagnostic board opened in an earlier page load of this identity',
  );
  m18Window.technicalFailure(M18_RELOAD_DETAIL);

  return true;
}

/**
 * Opens (or reopens) the board. The first opening writes the kit's
 * `opportunity_opened` with the entry snapshot (`stage` = the route stage at
 * the open; `prior_m13_window_status` = the lattice bench's status, route
 * context only — the field the entry snapshot carries); every later opening
 * resumes the view as it stood.
 */
export function openM18(
  nowMs: number,
  entry: {
    stage?: string | null;
    prior_m13_window_status?: string | null;
  } = {},
) {
  declareM18Cases();
  guardM18Reload();

  const s = ensure();

  guarded('open', undefined, () => {
    if (s.status === 'unopened') {
      m18Window.setComprehension('not_required');
      m18Window.open(
        nowMs,
        m18EntrySnapshot(
          entry.stage ?? null,
          entry.prior_m13_window_status ?? null,
        ),
      );
      startClock(nowMs);
    } else if (m18Live(s)) {
      m18Window.open(nowMs);
      clock?.resume('surface_closed', nowMs);
    }

    m18sOpen(s, nowMs, sink);
    markCurrentSlot(nowMs);
  });
}

/** START CASE 1 on the first-opening card. */
export function startM18Case1(mode: InputMode, nowMs: number): boolean {
  return guarded('start_case_1', false, () => {
    const started = m18sStartCase1(ensure(), mode, nowMs, sink);

    if (started) {
      markCurrentSlot(nowMs);
    }

    return started;
  });
}

/** A test of the current case (never a response). */
export function runM18Test(
  testId: string,
  mode: InputMode,
  nowMs: number,
): M18TestOutcome {
  return guarded('test', 'none' as const, () =>
    m18sRunTest(ensure(), testId, mode, nowMs, sink),
  );
}

export function draftM18Option(
  optionId: string,
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('draft', false, () =>
    m18sDraft(ensure(), optionId, mode, nowMs, sink),
  );
}

export function requestM18Commit(
  kind: M18CommitKind,
  mode: InputMode,
  nowMs: number,
): M18RequestOutcome {
  return guarded('request', 'none' as const, () =>
    m18sRequestCommit(ensure(), kind, mode, nowMs, sink),
  );
}

export function cancelM18Commit(mode: InputMode, nowMs: number): boolean {
  return guarded('cancel', false, () =>
    m18sCancelCommit(ensure(), mode, nowMs, sink),
  );
}

/** FINISH on the results: true when the settled page may close. */
export function finishM18(mode: InputMode, nowMs: number): boolean {
  return guarded('finish', false, () =>
    m18sFinish(ensure(), mode, nowMs, sink),
  );
}

/**
 * The confirming press (a part's or an answer's RECORD). A recorded part
 * presents the planned step (its focused mark set); a recorded sixth first
 * response completes the kit window right after the model's
 * `first_responses_completed`.
 */
export function confirmM18Commit(
  mode: InputMode,
  nowMs: number,
): M18ConfirmOutcome {
  return guarded('confirm', 'none' as const, () => {
    const s = ensure();
    const slot = s.status === 'measurement' ? m18CurrentSlot(s) : null;
    const key = slot === null ? null : markKey(m18CurrentCase(s).id, slot);
    const focused =
      clock !== null && key !== null
        ? clock.focusedMs(nowMs) - (focusedMarks[key] ?? 0)
        : null;
    const outcome = m18sConfirmCommit(s, mode, nowMs, sink, {
      focused_ms: focused,
    });

    if (outcome === 'recorded' && s.status === 'completed') {
      stopClock(nowMs);
      m18Window.complete(nowMs, m18ClosureSnapshot(s), mode);
    } else if (outcome === 'recorded') {
      markCurrentSlot(nowMs);
    }

    return outcome;
  });
}

export function nextM18(mode: InputMode, nowMs: number): M18NextOutcome {
  return guarded('next', 'none' as const, () => {
    const outcome = m18sNext(ensure(), mode, nowMs, sink);

    markCurrentSlot(nowMs);

    return outcome;
  });
}

export function navigateM18Results(
  direction: 'next' | 'back',
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('results', false, () =>
    m18sResultsNavigate(ensure(), direction, mode, nowMs, sink),
  );
}

export function openM18Help(mode: InputMode, nowMs: number): boolean {
  return guarded('help', false, () => m18sHelp(ensure(), mode, nowMs, sink));
}

export function closeM18Help(mode: InputMode, nowMs: number): boolean {
  return guarded('close_help', false, () =>
    m18sCloseHelp(ensure(), mode, nowMs, sink),
  );
}

/**
 * ESC order: an open dialog closes first (its cancel refused inside the
 * dialog's 400 ms — the dialog stays), then the help sheet; an ESC inside
 * the settle of the current view is consumed and leaves nothing; only then
 * does ESC leave the board. Returns true when ESC was consumed.
 */
export function m18ConsumesEsc(nowMs: number): boolean {
  return guarded('esc', false, () => {
    const s = ensure();

    if (s.pending_commit !== null) {
      m18sCancelCommit(s, 'keyboard', nowMs, sink);

      return true;
    }

    if (s.help_open) {
      // ESC on the help sheet always closes it (the settle guards only the
      // activations of the restored view).
      s.help_open = false;
      s.view_shown_at_ms = nowMs;

      if (s.acknowledgement !== null) {
        s.acknowledgement.opened_at_ms = nowMs;
      }

      return true;
    }

    // A carried ESC inside 400 ms of a view appearing never closes the
    // board (contract §3.5).
    return s.panel_open && m18Live(s) && m18Settling(s, nowMs);
  });
}

/** The surface closed (ESC, LEAVE BOARD, FINISH): the window pauses; nothing closes. */
export function closeM18Surface(nowMs: number) {
  guarded('leave', undefined, () => {
    const s = ensure();

    if (!s.panel_open) {
      return;
    }

    m18sLeave(s, nowMs, sink);

    if (m18Window.isOpen()) {
      m18Window.pause(nowMs);
    }

    clock?.pause('surface_closed', nowMs);
  });
}

export function resumeM18Surface(nowMs: number) {
  m18Window.resume(nowMs);
}

/**
 * The station-record closure at the Utility Deck review. A series still at
 * the card, in a case or in a step closes as `closed_at_review` (answers
 * kept, unanswered opportunities missing, censored); a completed series is
 * not reclosed; a never-opened board is recorded absent —
 * `briefed_not_opened` when the briefing was acknowledged, never `declined`
 * (decision D-U20-1, item 9) — and the series becomes the review's closed
 * record, so a later opening shows it, accepts nothing and writes nothing.
 */
export function closeM18AtReview(nowMs: number) {
  const s = ensure();

  if (m18Window.windowStatus() === 'unopened') {
    m18Window.markAbsent(
      briefed ? 'briefed_not_opened' : 'not_briefed_not_opened',
    );
    m18sCloseUnopenedAtReview(s);

    return;
  }

  guarded('review', undefined, () => {
    if (m18sCloseAtReview(s, nowMs, sink)) {
      stopClock(nowMs);
      m18Window.stop(
        nowMs,
        'closed_at_review',
        { ...m18ClosureSnapshot(s), invalid_detail: 'closed_at_review' },
        'system',
        'censored',
      );
    }
  });
}

/**
 * Binds the surface model to this adapter: the host scene supplies the
 * clock, the close path and the feedback line; the state reader and every
 * command come from here (the surface model stays pure).
 */
export function bindM18Surface(base: {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
}): M18SurfaceHost {
  return {
    ...base,
    series: m18Series,
    commands: {
      startCase1: startM18Case1,
      runTest: runM18Test,
      draft: draftM18Option,
      request: requestM18Commit,
      cancel: cancelM18Commit,
      confirm: confirmM18Commit,
      finish: finishM18,
      next: nextM18,
      navigateResults: navigateM18Results,
      help: openM18Help,
      closeHelp: closeM18Help,
    },
  };
}

/** Test-only escape hatch. */
export function resetM18State() {
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
  m18Window.reset();
}
