/**
 * M14 — the window adapter of the two-packet incident desk (Station 080
 * M01–M26 run, Unit 17; administration `m14-integration-v1`).
 *
 * Owns the ONE register window of the series (opportunity
 * `proto_m14_integration_series`, the kit's window id `m14_packet_p1`,
 * family `proto_m14_integration_`), the session-scope series state, the
 * log sink (the kit's required fields plus the protocol stamp), the
 * optional focused clock and the reload guard; every command delegates to
 * the pure model (`m14IntegrationModel.ts`) with its input mode, and the
 * surface model (`m14SurfaceModel.ts`) calls only these commands.
 *
 * Closure rules (research-owner decision D-U17-1, 7 October 2026): the
 * sixth first response completes the window; ESC / LEAVE DESK keep the
 * desk resumable; the review censors a series still in its orientation or
 * first-response phase with the answers as they stand and marks a
 * never-opened desk absent (`briefed_not_opened`, never `declined`); a
 * desk opened in an earlier page load is never re-run. The v2 family
 * `proto_m14_desk_*` is retired from the route and is not written by
 * this build. Nothing here scores.
 */
import { FocusedClock } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import {
  createM14Series,
  M14_RELOAD_DETAIL,
  m14ClosureSnapshot,
  type M14ConfirmOutcome,
  m14CurrentDecision,
  m14EntrySnapshot,
  type M14FailOutcome,
  m14Live,
  type M14LogSink,
  type M14NextOutcome,
  m14PriorAdministration,
  m14PriorLoadCheck,
  type M14RequestOutcome,
  type M14ResponseKind,
  m14sCancelCommit,
  m14sCloseAtReview,
  m14sCloseHelp,
  m14sConfirmCommit,
  m14sDraft,
  type M14Series,
  m14sFail,
  m14sHelp,
  m14sHoldBack,
  m14sLeave,
  m14sNext,
  m14sOpen,
  m14sRequestCommit,
  m14sResultsNavigate,
  m14sStart,
  m14sToggleSource,
} from './m14IntegrationModel';
import {
  M14_ENTRY_STATE_VERSION,
  M14_FAMILY,
  M14_OBJECT_ID,
  M14_OPPORTUNITY_ID,
  M14_SCENE,
  M14_WINDOW_ID,
} from './m14PacketContent';
import type { M14SurfaceHost } from './m14SurfaceModel';
import { type InputMode, ItemWindow } from './windowKit';

export {
  M14_ENTRY_STATE_VERSION,
  M14_FAMILY,
  M14_OPPORTUNITY_ID,
  M14_WINDOW_ID,
} from './m14PacketContent';

export const m14Window = new ItemWindow({
  item: 'M14',
  opportunityId: M14_OPPORTUNITY_ID,
  windowId: M14_WINDOW_ID,
  entryStateVersion: M14_ENTRY_STATE_VERSION,
  family: M14_FAMILY,
  scene: M14_SCENE,
  objectId: M14_OBJECT_ID,
});

let series: M14Series | null = null;
let clock: FocusedClock | null = null;
/** Focused ms at each decision's presentation (per-decision focused time). */
const focusedMarks: Record<string, number> = {};
let briefed = false;
/** The reload check is written once per page load. */
let priorLoadChecked = false;

function ensure(): M14Series {
  if (series === null) {
    series = createM14Series();
  }

  return series;
}

const sink: M14LogSink = (suffix, metadata) => {
  m14Window.log(suffix, { ...protocolStamp(), ...metadata });
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

/** Remembers the focused time at which the current decision was presented. */
function markCurrentDecision(nowMs: number) {
  const s = ensure();

  if (s.status !== 'first_responses' || clock === null) {
    return;
  }

  const id = m14CurrentDecision(s).id;

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
export function failM14(detail: string, nowMs: number = Date.now()) {
  const s = ensure();
  let outcome: M14FailOutcome;

  try {
    outcome = m14sFail(s, detail);
  } catch {
    outcome = 'none';
  }

  try {
    if (outcome === 'scored_phase') {
      stopClock(nowMs);
      m14Window.technicalFailure(detail);
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

/** Runs a command; a thrown fault is routed to `failM14` and `fallback` returned. */
function guarded<T>(name: string, fallback: T, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    failM14(`${name}: ${message}`);

    return fallback;
  }
}

export function declareM14() {
  ensure();
  m14Window.declare();
}

export function m14Series(): Readonly<M14Series> {
  return ensure();
}

/** True when the desk is a closed record in this page load. */
export function m14Closed(): boolean {
  return !m14Live(ensure()) && ensure().status !== 'unopened';
}

/**
 * Vale's briefing names the desk: the briefing exposure is recorded
 * through the kit's `present` (`presented`) — exposure only, not a desk
 * opening and not a decision presentation (decision D-U17-1, item 6).
 */
export function presentM14(nowMs: number) {
  declareM14();
  briefed = true;
  m14Window.present(nowMs);
}

/**
 * The reload check (research-owner closeout ruling of 9 October 2026):
 * once per page load after a reload, at the first guard run, the family
 * records whether the recovered history is continuous and whether it
 * holds an earlier opening or briefing (`prior_load_checked`) — the
 * current-load evidence from which the extractor reads an ESTABLISHED
 * absence of an earlier opening. A first page load writes nothing.
 */
function recordPriorLoadCheck(prior: readonly { event_type: string }[]) {
  const pageLoadIndex = researchRuntime.getPageLoadIndex();

  if (priorLoadChecked || pageLoadIndex <= 1) {
    return;
  }

  priorLoadChecked = true;
  sink('prior_load_checked', {
    phase: 'series',
    ...m14PriorLoadCheck(
      pageLoadIndex,
      prior,
      researchRuntime.getEventIntegrity(),
    ),
    input_mode: 'system',
  });
}

/**
 * Reload guard (register §5.14): a desk opened in an earlier page load of
 * this identity is never re-run — prior exposure is recorded and the
 * series is marked technically incomplete; the new load's row is
 * `interrupted`. Idempotent; called at Concourse entry and at the open.
 */
export function guardM14Reload(): boolean {
  const s = ensure();

  if (s.status !== 'unopened' || m14Window.windowStatus() !== 'unopened') {
    return false;
  }

  const prior = researchRuntime.getPriorPageLoadEvents();

  recordPriorLoadCheck(prior);

  if (!m14PriorAdministration(prior)) {
    return false;
  }

  m14sHoldBack(s);
  m14Window.recordPriorExposure(
    'incident desk opened in an earlier page load of this identity',
  );
  m14Window.technicalFailure(M14_RELOAD_DETAIL);

  return true;
}

/**
 * Opens (or reopens) the desk. The first opening writes the kit's
 * `opportunity_opened` with the entry snapshot (`stage` = the route stage
 * at the open); every later opening resumes the view as it stood.
 */
export function openM14(nowMs: number, entry: { stage?: string | null } = {}) {
  declareM14();
  guardM14Reload();

  const s = ensure();

  guarded('open', undefined, () => {
    if (s.status === 'unopened') {
      m14Window.setComprehension('not_required');
      m14Window.open(nowMs, m14EntrySnapshot(entry.stage ?? null));
      startClock(nowMs);
    } else if (m14Live(s)) {
      m14Window.open(nowMs);
      clock?.resume('surface_closed', nowMs);
    }

    m14sOpen(s, nowMs, sink);
    markCurrentDecision(nowMs);
  });
}

/** START PACKET 1 on the orientation card. */
export function startM14(mode: InputMode, nowMs: number): boolean {
  return guarded('start', false, () => {
    const done = m14sStart(ensure(), mode, nowMs, sink);

    markCurrentDecision(nowMs);

    return done;
  });
}

export function toggleM14Source(
  sourceId: string,
  mode: InputMode,
  nowMs: number,
) {
  return guarded('source', 'none' as const, () =>
    m14sToggleSource(ensure(), sourceId, mode, nowMs, sink),
  );
}

export function draftM14Option(
  optionId: string,
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('draft', false, () =>
    m14sDraft(ensure(), optionId, mode, nowMs, sink),
  );
}

export function requestM14Commit(
  kind: M14ResponseKind,
  mode: InputMode,
  nowMs: number,
): M14RequestOutcome {
  return guarded('request', 'none' as const, () =>
    m14sRequestCommit(ensure(), kind, mode, nowMs, sink),
  );
}

export function cancelM14Commit(mode: InputMode, nowMs: number): boolean {
  return guarded('cancel', false, () =>
    m14sCancelCommit(ensure(), mode, nowMs, sink),
  );
}

/**
 * The confirming press. A recorded sixth first response completes the
 * kit window right after the model's `first_responses_completed`.
 */
export function confirmM14Commit(
  mode: InputMode,
  nowMs: number,
): M14ConfirmOutcome {
  return guarded('confirm', 'none' as const, () => {
    const s = ensure();
    const id = s.status === 'first_responses' ? m14CurrentDecision(s).id : null;
    const focused =
      clock !== null && id !== null
        ? clock.focusedMs(nowMs) - (focusedMarks[id] ?? 0)
        : null;
    const outcome = m14sConfirmCommit(s, mode, nowMs, sink, {
      focused_ms: focused,
    });

    if (outcome === 'recorded' && s.status === 'completed') {
      stopClock(nowMs);
      m14Window.complete(nowMs, m14ClosureSnapshot(s), mode);
    }

    return outcome;
  });
}

export function nextM14(mode: InputMode, nowMs: number): M14NextOutcome {
  return guarded('next', 'none' as const, () => {
    const outcome = m14sNext(ensure(), mode, nowMs, sink);

    markCurrentDecision(nowMs);

    return outcome;
  });
}

export function navigateM14Results(
  direction: 'next' | 'back',
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('results', false, () =>
    m14sResultsNavigate(ensure(), direction, mode, nowMs, sink),
  );
}

export function openM14Help(mode: InputMode, nowMs: number): boolean {
  return guarded('help', false, () => m14sHelp(ensure(), mode, nowMs, sink));
}

export function closeM14Help(nowMs: number): boolean {
  return guarded('close_help', false, () => m14sCloseHelp(ensure(), nowMs));
}

/**
 * ESC order: an open dialog closes first, then the help sheet; only then
 * does ESC leave the desk. Returns true when ESC was consumed.
 */
export function m14ConsumesEsc(nowMs: number): boolean {
  return guarded('esc', false, () => {
    const s = ensure();

    if (s.pending_commit !== null) {
      m14sCancelCommit(s, 'keyboard', nowMs, sink);

      return true;
    }

    return m14sCloseHelp(s, nowMs);
  });
}

/** The surface closed (ESC, LEAVE DESK, FINISH): the window pauses; nothing closes. */
export function closeM14Surface(nowMs: number) {
  guarded('leave', undefined, () => {
    const s = ensure();

    if (!s.panel_open) {
      return;
    }

    m14sLeave(s, nowMs, sink);

    if (m14Window.isOpen()) {
      m14Window.pause(nowMs);
    }

    clock?.pause('surface_closed', nowMs);
  });
}

export function resumeM14Surface(nowMs: number) {
  m14Window.resume(nowMs);
}

/**
 * The station-record closure at the Utility Deck review. A series still
 * in its orientation or first-response phase closes as `closed_at_review`
 * (answers kept, unanswered decisions missing, censored); a completed
 * series is not reclosed; a never-opened desk is recorded absent —
 * `briefed_not_opened` when the briefing was acknowledged, never
 * `declined` (decision D-U17-1, item 6).
 */
export function closeM14AtReview(nowMs: number) {
  const s = ensure();

  if (m14Window.windowStatus() === 'unopened') {
    m14Window.markAbsent(
      briefed ? 'briefed_not_opened' : 'not_briefed_not_opened',
    );

    return;
  }

  guarded('review', undefined, () => {
    if (m14sCloseAtReview(s, nowMs, sink)) {
      stopClock(nowMs);
      m14Window.stop(
        nowMs,
        'closed_at_review',
        { ...m14ClosureSnapshot(s), invalid_detail: 'closed_at_review' },
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
export function bindM14Surface(base: {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
}): M14SurfaceHost {
  return {
    ...base,
    series: m14Series,
    commands: {
      start: startM14,
      toggleSource: toggleM14Source,
      draft: draftM14Option,
      request: requestM14Commit,
      cancel: cancelM14Commit,
      confirm: confirmM14Commit,
      next: nextM14,
      navigateResults: navigateM14Results,
      help: openM14Help,
      closeHelp: closeM14Help,
    },
  };
}

/** Test-only escape hatch. */
export function resetM14State() {
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
  m14Window.reset();
}
