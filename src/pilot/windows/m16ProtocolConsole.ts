/**
 * M16 — the window adapter of the protocol console (Station 080 M01–M26
 * run, Unit 19; administration `m16-handling-v1`).
 *
 * Owns the ONE register window of the series (opportunity
 * `proto_m16_handling_series`, window id `m16_handling_w1`, family
 * `proto_m16_handling_`), the session-scope series state, the log sink
 * (the kit's required fields plus the protocol stamp), the optional
 * focused clock and the reload guard; every command delegates to the pure
 * model (`m16HandlingModel.ts`) with its input mode, and the surface model
 * (`m16SurfaceModel.ts`) calls only these commands.
 *
 * Closure rules (research-owner decision D-U19-1 with amendment A1,
 * 11 October 2026): the sixth first response completes the window; ESC /
 * LEAVE CONSOLE keep the console resumable; the review censors a series
 * still at the card, in teaching or in the vials with the answers as they
 * stand and marks a never-opened console absent (`briefed_not_opened`,
 * never `declined`); a console opened in an earlier page load is never
 * re-run, and a later load's first laboratory entry writes the reload
 * check. The v2 ids `proto_m16_protocol_update` / `proto_m16_protocol_*` /
 * `m16_protocol_w1` are retired from the route and are not written by this
 * build; the legacy module stays untouched on the developer alias. Nothing
 * here scores.
 */
import { FocusedClock } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import { protocolStamp } from '../../measurement/protocol';
import { classifyReload, ROW_OCCASION } from '../../measurement/reloadCheck';
import { researchRuntime } from '../../systems';
import {
  M16_ENTRY_STATE_VERSION,
  M16_FAMILY,
  M16_OBJECT_ID,
  M16_OPPORTUNITY_ID,
  M16_SCENE,
  M16_WINDOW_ID,
} from './m16HandlingContent';
import {
  createM16Series,
  M16_CONTRADICTORY_DETAIL,
  M16_RELOAD_DETAIL,
  M16_UNVERIFIED_DETAIL,
  m16ClosureSnapshot,
  type M16CommitKind,
  type M16ConfirmOutcome,
  m16CurrentVial,
  m16EntrySnapshot,
  type M16FailOutcome,
  m16Live,
  type M16LogSink,
  type M16NextOutcome,
  type M16PriorEvent,
  type M16PriorLoadCheck,
  m16PriorLoadCheck,
  type M16RequestOutcome,
  m16sCancelCommit,
  m16sCloseAtReview,
  m16sCloseHelp,
  m16sConfirmCommit,
  m16sDraft,
  type M16Series,
  m16Settling,
  m16sFail,
  m16sFinish,
  m16sHelp,
  m16sHoldBack,
  m16sLeave,
  m16sNavigateExample,
  m16sNext,
  m16sOpen,
  m16sRequestCommit,
  m16sRequestTeachingClose,
  m16sResultsNavigate,
  m16sShowExample1,
} from './m16HandlingModel';
import type { M16SurfaceHost } from './m16SurfaceModel';
import { type InputMode, ItemWindow } from './windowKit';

export {
  M16_ENTRY_STATE_VERSION,
  M16_FAMILY,
  M16_OPPORTUNITY_ID,
  M16_WINDOW_ID,
} from './m16HandlingContent';

export const m16Window = new ItemWindow({
  item: 'M16',
  opportunityId: M16_OPPORTUNITY_ID,
  windowId: M16_WINDOW_ID,
  entryStateVersion: M16_ENTRY_STATE_VERSION,
  family: M16_FAMILY,
  scene: M16_SCENE,
  objectId: M16_OBJECT_ID,
});

let series: M16Series | null = null;
let clock: FocusedClock | null = null;
/** Focused ms at each vial's presentation (per-vial focused time). */
const focusedMarks: Record<string, number> = {};
let briefed = false;
/** The reload check is written once per page load. */
let priorLoadChecked = false;
let priorLoadCheck: M16PriorLoadCheck | null = null;

function ensure(): M16Series {
  if (series === null) {
    series = createM16Series();
  }

  return series;
}

const sink: M16LogSink = (suffix, metadata) => {
  m16Window.log(suffix, { ...protocolStamp(), ...metadata });
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

/** Remembers the focused time at which the current vial was presented. */
function markCurrentVial(nowMs: number) {
  const s = ensure();

  if (s.status !== 'measurement' || s.view !== 'vial' || clock === null) {
    return;
  }

  const id = m16CurrentVial(s).id;

  if (focusedMarks[id] === undefined) {
    focusedMarks[id] = clock.focusedMs(nowMs);
  }
}

/**
 * A fault while the series is open closes it as a technical failure
 * through the kit (invalid, never behaviour); after completion it is
 * recorded without touching the scored evidence. Never throws.
 */
export function failM16(detail: string, nowMs: number = Date.now()) {
  const s = ensure();
  let outcome: M16FailOutcome;

  try {
    outcome = m16sFail(s, detail);
  } catch {
    outcome = 'none';
  }

  try {
    if (outcome === 'scored_phase') {
      stopClock(nowMs);
      m16Window.technicalFailure(detail);
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

/** Runs a command; a thrown fault is routed to `failM16` and `fallback` returned. */
function guarded<T>(name: string, fallback: T, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    failM16(`${name}: ${message}`);

    return fallback;
  }
}

export function declareM16Handling() {
  ensure();
  m16Window.declare();
}

export function m16Series(): Readonly<M16Series> {
  return ensure();
}

/** True when the console is a closed record in this page load. */
export function m16Closed(): boolean {
  return !m16Live(ensure()) && ensure().status !== 'unopened';
}

/**
 * Kai's briefing names the protocol console: the briefing exposure is
 * recorded through the kit's `present` (`presented`) — exposure only, not
 * a console opening and not a vial presentation (decision D-U19-1,
 * item 7).
 */
export function presentM16(nowMs: number) {
  declareM16Handling();
  briefed = true;
  m16Window.present(nowMs);
}

/**
 * The reload check (decision D-U19-1 item 8; the M14 closeout ruling of
 * 9 October 2026 and D-U18-1 item 6 applied to M16): once per page load
 * after a reload, at the first guard run, the family records whether the
 * recovered history is continuous and whether it holds an earlier opening
 * or briefing (`prior_load_checked`) — the current-load evidence from
 * which the extractor reads an ESTABLISHED absence of an earlier opening.
 * A first page load writes nothing.
 */
function recordPriorLoadCheck(
  prior: readonly M16PriorEvent[],
): M16PriorLoadCheck | null {
  const pageLoadIndex = researchRuntime.getPageLoadIndex();

  if (pageLoadIndex <= 1) {
    return null;
  }

  if (!priorLoadChecked) {
    priorLoadChecked = true;
    priorLoadCheck = m16PriorLoadCheck(
      pageLoadIndex,
      prior,
      researchRuntime.getEventIntegrity(),
    );
    sink('prior_load_checked', {
      phase: 'closure',
      ...priorLoadCheck,
      input_mode: 'system',
    });
  }

  return priorLoadCheck;
}

/**
 * Reload guard (register §5.14; U24 RL-4, `RELOAD-CORRECTION-SPEC-r3-exec.md`
 * §2 and §4 G1, direction c): the load's single check record is classified
 * by RL-0's helper. H — a console opened in an earlier page load of this
 * identity — is never re-run: prior exposure is recorded and the series is
 * marked technically incomplete. U (the earlier history not verified) and M
 * (a self-contradictory record) are never administered either, without a
 * prior-exposure entry. Only A (or a first load) administers. Idempotent;
 * called at laboratory entry and at the open.
 */
export function guardM16Reload(): boolean {
  const s = ensure();

  if (s.status !== 'unopened' || m16Window.windowStatus() !== 'unopened') {
    return false;
  }

  const check = recordPriorLoadCheck(researchRuntime.getPriorPageLoadEvents());
  const cls = classifyReload({
    pageLoadIndex: researchRuntime.getPageLoadIndex(),
    checks: check === null ? [] : [check],
  }).occasions[ROW_OCCASION].class;

  if (cls === null || cls === 'A') {
    return false;
  }

  if (cls === 'H') {
    m16sHoldBack(s);
    m16Window.recordPriorExposure(
      'protocol console opened in an earlier page load of this identity',
    );
    m16Window.technicalFailure(M16_RELOAD_DETAIL);

    return true;
  }

  const detail = cls === 'U' ? M16_UNVERIFIED_DETAIL : M16_CONTRADICTORY_DETAIL;

  m16sHoldBack(s, detail);
  m16Window.technicalFailure(detail);

  return true;
}

/**
 * Opens (or reopens) the console. The first opening writes the kit's
 * `opportunity_opened` with the entry snapshot (`stage` = the route stage
 * at the open); every later opening resumes the view as it stood.
 */
export function openM16(nowMs: number, entry: { stage?: string | null } = {}) {
  declareM16Handling();
  guardM16Reload();

  const s = ensure();

  guarded('open', undefined, () => {
    if (s.status === 'unopened') {
      m16Window.setComprehension('not_required');
      m16Window.open(nowMs, m16EntrySnapshot(entry.stage ?? null));
      startClock(nowMs);
    } else if (m16Live(s)) {
      m16Window.open(nowMs);
      clock?.resume('surface_closed', nowMs);
    }

    m16sOpen(s, nowMs, sink);
    markCurrentVial(nowMs);
  });
}

/** SHOW EXAMPLE 1 on the first-opening card. */
export function showM16Example1(mode: InputMode, nowMs: number): boolean {
  return guarded('show_example_1', false, () =>
    m16sShowExample1(ensure(), mode, nowMs, sink),
  );
}

/** NEXT EXAMPLE / BACK TO EXAMPLE 1. */
export function navigateM16Example(
  direction: 'next' | 'back',
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('example', false, () =>
    m16sNavigateExample(ensure(), direction, mode, nowMs, sink),
  );
}

/** START THE SIX VIALS: opens the boundary confirmation. */
export function requestM16TeachingClose(
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('start', false, () =>
    m16sRequestTeachingClose(ensure(), mode, nowMs, sink),
  );
}

export function draftM16Option(
  optionId: string,
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('draft', false, () =>
    m16sDraft(ensure(), optionId, mode, nowMs, sink),
  );
}

export function requestM16Commit(
  kind: M16CommitKind,
  mode: InputMode,
  nowMs: number,
): M16RequestOutcome {
  return guarded('request', 'none' as const, () =>
    m16sRequestCommit(ensure(), kind, mode, nowMs, sink),
  );
}

export function cancelM16Commit(mode: InputMode, nowMs: number): boolean {
  return guarded('cancel', false, () =>
    m16sCancelCommit(ensure(), mode, nowMs, sink),
  );
}

/** FINISH on the results: true when the settled page may close. */
export function finishM16(nowMs: number): boolean {
  return guarded('finish', false, () => m16sFinish(ensure(), nowMs));
}

/**
 * The confirming press (the boundary's START or a vial's RECORD). A
 * recorded sixth first response completes the kit window right after the
 * model's `first_responses_completed`.
 */
export function confirmM16Commit(
  mode: InputMode,
  nowMs: number,
): M16ConfirmOutcome {
  return guarded('confirm', 'none' as const, () => {
    const s = ensure();
    const id =
      s.status === 'measurement' && s.view === 'vial'
        ? m16CurrentVial(s).id
        : null;
    const focused =
      clock !== null && id !== null
        ? clock.focusedMs(nowMs) - (focusedMarks[id] ?? 0)
        : null;
    const outcome = m16sConfirmCommit(s, mode, nowMs, sink, {
      focused_ms: focused,
    });

    if (outcome === 'teaching_closed') {
      markCurrentVial(nowMs);
    } else if (outcome === 'recorded' && s.status === 'completed') {
      stopClock(nowMs);
      m16Window.complete(nowMs, m16ClosureSnapshot(s), mode);
    }

    return outcome;
  });
}

export function nextM16(mode: InputMode, nowMs: number): M16NextOutcome {
  return guarded('next', 'none' as const, () => {
    const outcome = m16sNext(ensure(), mode, nowMs, sink);

    markCurrentVial(nowMs);

    return outcome;
  });
}

export function navigateM16Results(
  direction: 'next' | 'back',
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('results', false, () =>
    m16sResultsNavigate(ensure(), direction, mode, nowMs, sink),
  );
}

export function openM16Help(mode: InputMode, nowMs: number): boolean {
  return guarded('help', false, () => m16sHelp(ensure(), mode, nowMs, sink));
}

export function closeM16Help(nowMs: number): boolean {
  return guarded('close_help', false, () => m16sCloseHelp(ensure(), nowMs));
}

/**
 * ESC order: an open dialog closes first (its cancel refused inside the
 * dialog's 400 ms — the dialog stays), then the help sheet; an ESC inside
 * the settle of the current view is consumed and leaves nothing; only then
 * does ESC leave the console. Returns true when ESC was consumed.
 */
export function m16ConsumesEsc(nowMs: number): boolean {
  return guarded('esc', false, () => {
    const s = ensure();

    if (s.pending_commit !== null) {
      m16sCancelCommit(s, 'keyboard', nowMs, sink);

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
    // console (contract §3.4 item 6; amendment A1-2 for the results).
    return s.panel_open && m16Live(s) && m16Settling(s, nowMs);
  });
}

/** The surface closed (ESC, LEAVE CONSOLE, FINISH): the window pauses; nothing closes. */
export function closeM16Surface(nowMs: number) {
  guarded('leave', undefined, () => {
    const s = ensure();

    if (!s.panel_open) {
      return;
    }

    m16sLeave(s, nowMs, sink);

    if (m16Window.isOpen()) {
      m16Window.pause(nowMs);
    }

    clock?.pause('surface_closed', nowMs);
  });
}

export function resumeM16Surface(nowMs: number) {
  m16Window.resume(nowMs);
}

/**
 * The station-record closure at the Utility Deck review. A series still
 * at the card, in teaching or in the vials closes as `closed_at_review`
 * (answers kept, unanswered vials missing, censored); a completed series
 * is not reclosed; a never-opened console is recorded absent —
 * `briefed_not_opened` when the briefing was acknowledged, never
 * `declined` (decision D-U19-1, item 7).
 */
export function closeM16AtReview(nowMs: number) {
  const s = ensure();

  if (m16Window.windowStatus() === 'unopened') {
    m16Window.markAbsent(
      briefed ? 'briefed_not_opened' : 'not_briefed_not_opened',
    );

    return;
  }

  guarded('review', undefined, () => {
    if (m16sCloseAtReview(s, nowMs, sink)) {
      stopClock(nowMs);
      m16Window.stop(
        nowMs,
        'closed_at_review',
        { ...m16ClosureSnapshot(s), invalid_detail: 'closed_at_review' },
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
export function bindM16Surface(base: {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
}): M16SurfaceHost {
  return {
    ...base,
    series: m16Series,
    commands: {
      showExample1: showM16Example1,
      navigateExample: navigateM16Example,
      requestTeachingClose: requestM16TeachingClose,
      draft: draftM16Option,
      request: requestM16Commit,
      cancel: cancelM16Commit,
      confirm: confirmM16Commit,
      finish: finishM16,
      next: nextM16,
      navigateResults: navigateM16Results,
      help: openM16Help,
      closeHelp: closeM16Help,
    },
  };
}

/** Test-only escape hatch. */
export function resetM16State() {
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
  priorLoadCheck = null;
  m16Window.reset();
}
