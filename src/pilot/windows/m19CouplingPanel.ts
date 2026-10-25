/**
 * M19 — the window adapter of the coupling panel (Station 080 M01–M26 run,
 * Unit 21; administration `m19-lines-v2`).
 *
 * Owns the ONE register window of the series (opportunity
 * `proto_m19_lines_series`, window id `m19_lines_w1`, family
 * `proto_m19_lines_`), the session-scope series state, the log sink (the
 * kit's required fields plus the protocol stamp; it returns the logger
 * sequence of the event it wrote so the boundary can name its attempt), the
 * per-line focused clocks' subscription to the focus monitor and the reload
 * guard; every command delegates to the pure model (`m19LinesModel.ts`) with
 * its input mode, and the surface model (`m19SurfaceModel.ts`) calls only
 * these commands.
 *
 * Closure rules (research-owner decision D-U21-1, 13 October 2026): line 2's
 * finish completes the window; ESC / LEAVE keep the panel resumable; the end
 * of the outside work closes an opened, unfinished series (`shift_ended`,
 * the unfinished lines finished as such — observed, never censored) and
 * records a presented, never-opened panel (`closed_unopened`); the review
 * censors a series still unfinished and marks a never-opened panel absent
 * (`presented_not_opened`, never `declined`); a runtime fault excludes the
 * line in work only; a panel opened in an earlier page load is never re-run.
 * The v2 ids `proto_m19_progressive_valve` / `proto_m19_valve_*` /
 * `m19_valve_w1` are retired from the route and are not written by this
 * build; the legacy coupling module stays untouched. Nothing here scores.
 */
import type { FocusedClock } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import { protocolStamp } from '../../measurement/protocol';
import { classifyReload, ROW_OCCASION } from '../../measurement/reloadCheck';
import {
  markOpportunityInvalid,
  refreshValidityProbe,
} from '../../measurement/validity';
import { researchRuntime } from '../../systems';
import { refreshPilotCoverageProbe } from '../pilotCoverage';
import {
  M19_ENTRY_STATE_VERSION,
  M19_FAMILY,
  M19_OBJECT_ID,
  M19_OPPORTUNITY_ID,
  M19_SCENE,
  M19_WINDOW_ID,
  type M19Control,
} from './m19LinesContent';
import {
  createM19Series,
  M19_CONTRADICTORY_DETAIL,
  M19_RELOAD_DETAIL,
  M19_UNVERIFIED_DETAIL,
  type M19ChangeOutcome,
  m19ClosureSnapshot,
  type M19ConfirmOutcome,
  m19EntrySnapshot,
  m19LineInWork,
  m19Live,
  type M19LogSink,
  type M19PriorEvent,
  type M19PriorLoadCheck,
  m19PriorLoadCheck,
  type M19RecordOutcome,
  m19sCancelSetAside,
  m19sChange,
  m19sCloseAtReview,
  m19sCloseAtShiftEnd,
  m19sCloseHelp,
  m19sCloseUnopened,
  m19sConfirmSetAside,
  m19sContinue,
  m19sContinueExplanation,
  m19sDraft,
  type M19Series,
  m19Settling,
  m19sFail,
  m19sFinish,
  m19sHelp,
  m19sHoldBack,
  m19sLeave,
  m19sNextLine,
  m19sOpen,
  m19sRecordAnswer,
  m19sRequestSetAside,
  m19sStartLine1,
  m19sTry,
  type M19TryOutcome,
} from './m19LinesModel';
import type { M19SurfaceHost } from './m19SurfaceModel';
import { type InputMode, ItemWindow } from './windowKit';

export {
  M19_ENTRY_STATE_VERSION,
  M19_FAMILY,
  M19_OPPORTUNITY_ID,
  M19_WINDOW_ID,
} from './m19LinesContent';

export const m19Window = new ItemWindow({
  item: 'M19',
  opportunityId: M19_OPPORTUNITY_ID,
  windowId: M19_WINDOW_ID,
  entryStateVersion: M19_ENTRY_STATE_VERSION,
  family: M19_FAMILY,
  scene: M19_SCENE,
  objectId: M19_OBJECT_ID,
});

let series: M19Series | null = null;
let briefed = false;
/** `closed_unopened` is written at most once. */
let closedUnopened = false;
/** The reload check is written once per page load. */
let priorLoadChecked = false;
let priorLoadCheck: M19PriorLoadCheck | null = null;

function ensure(): M19Series {
  if (series === null) {
    series = createM19Series({
      register: (clock: FocusedClock) => registerFocusedClock(clock),
      release: (clock: FocusedClock) => releaseFocusedClock(clock),
    });
  }

  return series;
}

/**
 * The log sink: writes the family event through the kit and returns the
 * logger sequence it received (read back from the runtime's event list),
 * so a boundary record can name its attempt's sequence.
 */
const sink: M19LogSink = (suffix, metadata) => {
  m19Window.log(suffix, { ...protocolStamp(), ...metadata });

  const events = researchRuntime.getEvents();
  const last = events[events.length - 1];

  return last !== undefined &&
    last.event_type === `${M19_FAMILY}${suffix}` &&
    typeof last.sequence === 'number'
    ? last.sequence
    : null;
};

/**
 * A runtime fault. While the series can be worked it closes the series
 * (the line in work finished `technical_failure` by the model, the
 * kit-shaped record with the line in work, the register marked invalid);
 * afterwards it is recorded without touching the scored evidence. Never
 * throws.
 */
export function m19TechnicalFailure(
  detail: string,
  nowMs: number = Date.now(),
) {
  const s = ensure();

  try {
    const outcome = m19sFail(s, detail, nowMs, sink);

    if (outcome.kind === 'none') {
      return;
    }

    if (outcome.kind === 'closed') {
      if (m19Window.isOpen()) {
        m19Window.pause(nowMs);
      }

      // The kit's `technicalFailure` cannot carry the line in work
      // (register §5.340 (a)): the record goes through the window's `log`
      // and the register through the framework's own function.
      markOpportunityInvalid(M19_OPPORTUNITY_ID, 'technical_failure', detail);
      refreshValidityProbe();
      refreshPilotCoverageProbe();
    }

    const line =
      outcome.kind === 'closed' && outcome.line_id !== null
        ? s.lines.find((candidate) => candidate.id === outcome.line_id)!
        : null;

    sink('technical_failure', {
      phase: 'closure',
      detail,
      line_id: line?.id ?? null,
      line_index: line?.index ?? null,
      input_mode: 'system',
    });
  } catch {
    // The fault record itself failed: the series state already says
    // technical failure; nothing else can be done here.
  }
}

/** Runs a command; a thrown fault is routed to `m19TechnicalFailure` and `fallback` returned. */
function guarded<T>(name: string, fallback: T, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    m19TechnicalFailure(`${name}: ${message}`);

    return fallback;
  }
}

export function declareM19Lines() {
  ensure();
  m19Window.declare();
}

export function m19Series(): Readonly<M19Series> {
  return ensure();
}

/**
 * Noor's briefing names the coupling: the briefing exposure is recorded
 * through the kit's `present` (`presented`) — exposure only, never an
 * opening and never a line presentation.
 */
export function presentM19(nowMs: number) {
  declareM19Lines();
  briefed = true;
  m19Window.present(nowMs);
}

function recordPriorLoadCheck(
  prior: readonly M19PriorEvent[],
): M19PriorLoadCheck | null {
  const pageLoadIndex = researchRuntime.getPageLoadIndex();

  if (pageLoadIndex <= 1) {
    return null;
  }

  if (!priorLoadChecked) {
    priorLoadChecked = true;
    priorLoadCheck = m19PriorLoadCheck(
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
 * Reload guard (U24 RL-4, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2 and §4 G1,
 * direction c): the load's single check record is classified by RL-0's
 * helper. H — a panel opened in an earlier page load of this identity — is
 * never re-run: prior exposure is recorded and the series is marked
 * technically incomplete; the new load's row is `interrupted`. U (the
 * earlier history not verified) and M (a self-contradictory record) are
 * never administered either, without a prior-exposure entry. Only A (or a
 * first load) administers. Idempotent; called at yard entry and at the open.
 */
export function guardM19Reload(): boolean {
  const s = ensure();

  if (s.status !== 'unopened' || m19Window.windowStatus() !== 'unopened') {
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
    m19sHoldBack(s);
    m19Window.recordPriorExposure(
      'coupling panel opened in an earlier page load of this identity',
    );
    m19Window.technicalFailure(M19_RELOAD_DETAIL);

    return true;
  }

  const detail = cls === 'U' ? M19_UNVERIFIED_DETAIL : M19_CONTRADICTORY_DETAIL;

  m19sHoldBack(s, detail);
  m19Window.technicalFailure(detail);

  return true;
}

/**
 * Opens (or reopens) the panel. The first opening writes the kit's
 * `opportunity_opened` with the entry snapshot (`stage` = the route stage
 * at the open); every later opening resumes the view as it stood.
 */
export function openM19(nowMs: number, entry: { stage?: string | null } = {}) {
  declareM19Lines();
  guardM19Reload();

  const s = ensure();

  guarded('open', undefined, () => {
    if (s.status === 'unopened') {
      m19Window.setComprehension('pending');
      m19Window.open(nowMs, m19EntrySnapshot(entry.stage ?? null));
    } else if (m19Live(s)) {
      m19Window.open(nowMs);
    }

    m19sOpen(s, nowMs, sink);
  });
}

/** CONTINUE on the card. */
export function continueM19(mode: InputMode, nowMs: number): boolean {
  return guarded('continue', false, () =>
    m19sContinue(ensure(), mode, nowMs, sink),
  );
}

export function draftM19Option(
  optionId: string,
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('draft', false, () =>
    m19sDraft(ensure(), optionId, mode, nowMs, sink),
  );
}

/** RECORD ANSWER; a recorded check sets the kit's comprehension state. */
export function recordM19Answer(
  mode: InputMode,
  nowMs: number,
): M19RecordOutcome {
  return guarded('record_answer', 'none' as const, () => {
    const s = ensure();
    const outcome = m19sRecordAnswer(s, mode, nowMs, sink);

    if (outcome === 'recorded' && s.check.status !== null) {
      m19Window.setComprehension(
        s.check.status === 'fail' ? 'failed' : 'passed',
      );
    }

    return outcome;
  });
}

export function continueM19Explanation(
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('continue_explanation', false, () =>
    m19sContinueExplanation(ensure(), mode, nowMs, sink),
  );
}

export function startM19Line1(mode: InputMode, nowMs: number): boolean {
  return guarded('start_line_1', false, () =>
    m19sStartLine1(ensure(), mode, nowMs, sink),
  );
}

export function changeM19Setting(
  control: M19Control,
  mode: InputMode,
  nowMs: number,
): M19ChangeOutcome {
  return guarded('change', 'none' as const, () =>
    m19sChange(ensure(), control, mode, nowMs, sink),
  );
}

/** TRY; a restoring attempt on line 2 completes the kit window. */
export function tryM19(mode: InputMode, nowMs: number): M19TryOutcome {
  return guarded('try', { kind: 'none' } as M19TryOutcome, () => {
    const s = ensure();
    const outcome = m19sTry(s, mode, nowMs, sink);

    completeIfDone(s, nowMs, mode);

    return outcome;
  });
}

export function requestM19SetAside(mode: InputMode, nowMs: number): boolean {
  return guarded('set_aside', false, () =>
    m19sRequestSetAside(ensure(), mode, nowMs, sink),
  );
}

export function cancelM19SetAside(mode: InputMode, nowMs: number): boolean {
  return guarded('cancel', false, () =>
    m19sCancelSetAside(ensure(), mode, nowMs, sink),
  );
}

/** The confirming press; a set-aside line 2 completes the kit window. */
export function confirmM19SetAside(
  mode: InputMode,
  nowMs: number,
): M19ConfirmOutcome {
  return guarded('confirm', 'none' as const, () => {
    const s = ensure();
    const outcome = m19sConfirmSetAside(s, mode, nowMs, sink);

    completeIfDone(s, nowMs, mode);

    return outcome;
  });
}

/** Both lines finished: the kit window completes right after `series_completed`. */
function completeIfDone(s: M19Series, nowMs: number, mode: InputMode) {
  if (s.status === 'completed' && m19Window.isOpen()) {
    m19Window.complete(nowMs, m19ClosureSnapshot(s), mode);
  }
}

export function nextM19Line(mode: InputMode, nowMs: number): boolean {
  return guarded('next_line', false, () =>
    m19sNextLine(ensure(), mode, nowMs, sink),
  );
}

/** FINISH on the final view: true when the settled surface may close. */
export function finishM19(mode: InputMode, nowMs: number): boolean {
  return guarded('finish', false, () => m19sFinish(ensure(), mode, nowMs));
}

export function openM19Help(mode: InputMode, nowMs: number): boolean {
  return guarded('help', false, () => m19sHelp(ensure(), mode, nowMs, sink));
}

export function closeM19Help(mode: InputMode, nowMs: number): boolean {
  return guarded('close_help', false, () =>
    m19sCloseHelp(ensure(), mode, nowMs),
  );
}

/**
 * ESC order: an open dialog closes first (its cancel refused inside the
 * dialog's 400 ms — the dialog stays), then the help sheet; an ESC inside
 * the settle of the current view is consumed and leaves nothing; only then
 * does ESC leave the panel. Returns true when ESC was consumed.
 */
export function m19ConsumesEsc(nowMs: number): boolean {
  return guarded('esc', false, () => {
    const s = ensure();

    if (s.pending_set_aside !== null) {
      m19sCancelSetAside(s, 'keyboard', nowMs, sink);

      return true;
    }

    if (s.help_open) {
      // ESC on the help sheet always closes it (the settle guards only the
      // activations of the restored view).
      s.help_open = false;
      s.view_shown_at_ms = nowMs;

      return true;
    }

    // A carried ESC inside 400 ms of a view appearing never closes the
    // panel (contract §3.5).
    return (
      s.panel_open &&
      (m19Live(s) || s.status === 'completed') &&
      m19Settling(s, nowMs)
    );
  });
}

/**
 * The surface closed (ESC, LEAVE, FINISH): the window pauses, the line in
 * work's clock pauses; nothing closes. Called from the surface's `onClose`
 * (before the yard resumes) and from the LEAVE control's host close.
 */
export function closeM19Surface(nowMs: number) {
  guarded('leave', undefined, () => {
    const s = ensure();

    if (!s.panel_open) {
      return;
    }

    m19sLeave(s, nowMs, sink);

    if (m19Window.isOpen()) {
      m19Window.pause(nowMs);
    }
  });
}

/**
 * The yard scene resumed. The kit window's active clock restarts only while
 * the panel surface is open (a pause of the whole scene over an open
 * panel); after LEAVE or ESC the window stays paused until the real
 * reopening (`openM19`), whatever resumes the yard meanwhile — the
 * surface's own close, another surface's close (the U20 closeout lesson).
 * The line's focused clock is never touched here.
 */
export function resumeM19Surface(nowMs: number) {
  if (series === null || !series.panel_open) {
    return;
  }

  m19Window.resume(nowMs);
}

/**
 * The end of the outside work (Noor's "finished outside"). (a) An opened,
 * unfinished series closes `shift_ended` (each presented, unfinished line
 * finished as such) and the kit window completes with exit state `stopped`
 * — a completed observation (decision D-U21-1 item 7). (b) A presented,
 * never-opened panel records `closed_unopened` (`shift_ended`); the kit
 * window stays unopened until the review. (c) Not presented: nothing. A
 * completed series is not reclosed.
 */
export function closeM19AtShiftEnd(nowMs: number) {
  const s = ensure();

  if (s.status === 'unopened') {
    if (briefed && m19Window.windowStatus() === 'unopened' && !closedUnopened) {
      closedUnopened = true;
      m19sCloseUnopened(s, 'shift_ended');
      sink('closed_unopened', {
        phase: 'closure',
        closure_reason: 'shift_ended',
        input_mode: 'system',
      });
    }

    return;
  }

  guarded('shift_end', undefined, () => {
    if (m19sCloseAtShiftEnd(s, nowMs, sink)) {
      m19Window.complete(nowMs, m19ClosureSnapshot(s), 'system', {
        exitState: 'stopped',
      });
    }
  });
}

/**
 * The station-record closure at the Utility Deck review. A series still
 * unfinished (reachable only when the shift-end closure did not run) closes
 * `closed_at_review` (censored); a never-opened panel is recorded absent —
 * `presented_not_opened` when the briefing presented it, never `declined`
 * — and, when no `closed_unopened` exists yet, closed as such; a closed or
 * completed series is untouched.
 */
export function closeM19AtReview(nowMs: number) {
  const s = ensure();

  if (m19Window.windowStatus() === 'unopened') {
    m19Window.markAbsent(
      briefed ? 'presented_not_opened' : 'not_presented_not_opened',
    );

    if (briefed && !closedUnopened) {
      closedUnopened = true;
      sink('closed_unopened', {
        phase: 'closure',
        closure_reason: 'closed_at_review',
        input_mode: 'system',
      });
    }

    m19sCloseUnopened(s, 'closed_at_review');

    return;
  }

  guarded('review', undefined, () => {
    if (m19sCloseAtReview(s, nowMs, sink)) {
      m19Window.stop(
        nowMs,
        'closed_at_review',
        { ...m19ClosureSnapshot(s), invalid_detail: 'closed_at_review' },
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
export function bindM19Surface(base: {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
}): M19SurfaceHost {
  return {
    ...base,
    series: m19Series,
    commands: {
      continue: continueM19,
      draft: draftM19Option,
      recordAnswer: recordM19Answer,
      continueExplanation: continueM19Explanation,
      startLine1: startM19Line1,
      change: changeM19Setting,
      try: tryM19,
      requestSetAside: requestM19SetAside,
      cancelSetAside: cancelM19SetAside,
      confirmSetAside: confirmM19SetAside,
      nextLine: nextM19Line,
      finish: finishM19,
      help: openM19Help,
      closeHelp: closeM19Help,
    },
  };
}

/** True when a line is in work (the yard's DEV probe). */
export function m19LineInWorkId(): string | null {
  return series === null ? null : (m19LineInWork(series)?.id ?? null);
}

/** Test-only escape hatch. */
export function resetM19State() {
  if (series !== null) {
    for (const line of series.lines) {
      releaseFocusedClock(line.clock);
    }
  }

  series = null;
  briefed = false;
  closedUnopened = false;
  priorLoadChecked = false;
  priorLoadCheck = null;
  m19Window.reset();
}
