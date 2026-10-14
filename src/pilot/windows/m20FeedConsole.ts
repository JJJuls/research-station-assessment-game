/**
 * M20 — the window adapter of the station feed console (Station 080 M01–M26
 * run, Unit 22; administration `m20-feed-returns-v2`).
 *
 * Owns the ONE register window of the project (opportunity
 * `proto_m20_feed_project`, window id `m20_feed_w1`, family
 * `proto_m20_feed_`), the session-scope project state, the log sink (the
 * kit's required fields plus the protocol stamp; it returns the logger
 * sequence of the event it wrote), the channel clocks' subscription to the
 * focus monitor, the reload guard, the release / due check the Workshop scene
 * runs (`m20CueCheck`), the notice's early end (`m20CueEnded`), the yard's
 * outdoor preparation (`presentM20MastBrief`, `acceptM20Mast`,
 * `doM20MastStage`, `m20OutdoorFault` — the legacy PURE mast state, logged as
 * `outdoor_*`, never counted) and the DEV probe; every command delegates to
 * the pure model (`m20FeedModel.ts`) with its input mode, and the surface
 * model (`m20SurfaceModel.ts`) calls only these commands.
 *
 * Closure rules (research-owner decision D-U22-1, 14 October 2026, as
 * selected): both channels aligned complete the window; ESC / LEAVE keep the
 * console resumable; the sign-off closes an opened, uncompleted project
 * (`shift_signed_off` — a completed observation, noticed channels without a
 * credit counting 0) and records a presented, never-opened console
 * (`closed_unopened`); the review censors a project still open and marks a
 * never-opened console absent (`presented_not_opened`, never `declined`); a
 * runtime fault closes the project keeping every earned resumption; a console
 * opened in an earlier page load is never re-run. The legacy antenna family
 * (`m20AntennaModel.ts`) is not written by this build; the legacy modules
 * stay untouched. Nothing here scores.
 */
import type { FocusedClock } from '../../measurement/focusedClock';
import {
  environmentPauseCauses,
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import { protocolStamp } from '../../measurement/protocol';
import {
  markOpportunityInvalid,
  refreshValidityProbe,
} from '../../measurement/validity';
import { researchRuntime } from '../../systems';
import {
  M20_OUTDOOR_STAGES,
  m20Accept,
  m20CompleteStage,
  m20MissionLogText,
  m20OutdoorComplete,
  type M20OutdoorStage,
} from '../exterior/m20AntennaModel';
import { refreshPilotCoverageProbe } from '../pilotCoverage';
import { pilotStageAtOrAfter, registerMissionLogEntry } from '../pilotRoute';
import { exteriorEpisode } from './exteriorWindows';
import {
  M20_ENTRY_STATE_VERSION,
  M20_FAMILY,
  M20_OBJECT_ID,
  M20_OPPORTUNITY_ID,
  M20_SCENE,
  M20_WINDOW_ID,
  type M20ChannelId,
} from './m20FeedContent';
import {
  createM20Project,
  M20_RELOAD_DETAIL,
  type M20AlignOutcome,
  m20ChannelStatus,
  m20ChannelWord,
  m20ChipText as chipTextOf,
  m20ClosureSnapshot,
  type M20CueContext,
  type M20CueEndReason,
  m20EntrySnapshot,
  m20HelpView,
  m20Live,
  type M20LogSink,
  m20NoticeLines,
  type M20OutdoorPrepared,
  m20PriorAdministration,
  m20PriorLoadCheck,
  type M20Project,
  m20sAlign,
  m20sChangeCell,
  m20sChannels,
  m20sCloseAtReview,
  m20sCloseAtShiftEnd,
  m20sCloseHelp,
  m20sCloseUnopened,
  m20sContinue,
  m20sContinueChannel,
  m20sCueCheck,
  m20sEndCue,
  m20sFail,
  m20sHelp,
  m20sHoldBack,
  m20sLeave,
  m20sOpen,
  m20SpontaneousCount,
  m20sStartB,
  m20sWriteDueReleases,
  m20WorkSignature,
} from './m20FeedModel';
import type { M20SurfaceHost } from './m20SurfaceModel';
import { type InputMode, ItemWindow } from './windowKit';

export {
  M20_ENTRY_STATE_VERSION,
  M20_FAMILY,
  M20_OPPORTUNITY_ID,
  M20_WINDOW_ID,
} from './m20FeedContent';

declare global {
  interface Window {
    /** DEV-only, read-only probe of the feed console (Unit 22). */
    __m20FeedProbe?: M20FeedProbe | null;
  }
}

export interface M20FeedProbe {
  status: string;
  view: string;
  current: string | null;
  console_open: boolean;
  help_open: boolean;
  window: string;
  exit: string | null;
  chip: string;
  closure_reason: string | null;
  failure_detail: string | null;
  spontaneous_resumptions: number;
  notice: {
    channel_id: string;
    presented_at_ms: number;
    lines: string[];
  } | null;
  now_ms: number;
  last_check_at_ms: number | null;
  outdoor: M20OutdoorPrepared;
  channels: Record<
    M20ChannelId,
    {
      status: string;
      word: string;
      started: boolean;
      step: number;
      steps_done: number;
      cells: number[];
      attempts: number;
      held_at_ms: number | null;
      released_at_ms: number | null;
      cue_due_at_ms: number | null;
      cue_presented_at_ms: number | null;
      cue_ended_at_ms: number | null;
      cue_ended_reason: string | null;
      cue_cancelled: boolean;
      resumption: string | null;
      resumption_attempt_index: number | null;
      aligned: boolean;
      held_visits: number;
      released_visits: number;
      post_resumption_reentries: number;
    }
  >;
}

const windowInstance = new ItemWindow({
  item: 'M20',
  opportunityId: M20_OPPORTUNITY_ID,
  windowId: M20_WINDOW_ID,
  entryStateVersion: M20_ENTRY_STATE_VERSION,
  family: M20_FAMILY,
  scene: M20_SCENE,
  objectId: M20_OBJECT_ID,
});

/** The ONE register window of the project. */
export function m20Window(): ItemWindow {
  return windowInstance;
}

let project: M20Project | null = null;
let presented = false;
/** `closed_unopened` is written at most once. */
let closedUnopened = false;
/** The reload check is written once per page load. */
let priorLoadChecked = false;
let briefPresented = false;
let missionLogRegistered = false;
let lastCheckAtMs: number | null = null;

function ensure(): M20Project {
  if (project === null) {
    project = createM20Project({
      register: (clock: FocusedClock) => registerFocusedClock(clock),
      release: (clock: FocusedClock) => releaseFocusedClock(clock),
    });
  }

  return project;
}

/**
 * The log sink: writes the family event through the kit and returns the
 * logger sequence it received (read back from the runtime's event list),
 * so an attempt record can carry its own sequence.
 */
const sink: M20LogSink = (suffix, metadata) => {
  windowInstance.log(suffix, { ...protocolStamp(), ...metadata });

  const events = researchRuntime.getEvents();
  const last = events[events.length - 1];

  return last !== undefined &&
    last.event_type === `${M20_FAMILY}${suffix}` &&
    typeof last.sequence === 'number'
    ? last.sequence
    : null;
};

/** The yard's Mast 04 state (the legacy pure state object; outdoor preparation only). */
function outdoorPrepared(): M20OutdoorPrepared {
  const state = exteriorEpisode().m20;

  return {
    accepted: state.accepted,
    stages_done: [...state.stages_done],
    outdoor_complete: m20OutdoorComplete(state),
  };
}

/**
 * A runtime fault. While the project can be worked it closes the project
 * (due releases written, the notice ended, the register marked invalid, the
 * kit-shaped record carrying the channel in work); afterwards it is recorded
 * without touching the scored evidence. Never throws.
 */
export function m20TechnicalFailure(
  detail: string,
  channelId: M20ChannelId | null = null,
  nowMs: number = Date.now(),
) {
  const s = ensure();

  try {
    const outcome = m20sFail(s, detail, nowMs, sink);

    if (outcome.kind === 'none') {
      return;
    }

    const resultFinal = outcome.kind === 'closed' && outcome.result_final;

    if (outcome.kind === 'closed') {
      if (windowInstance.isOpen()) {
        windowInstance.pause(nowMs);
      }

      // The kit's `technicalFailure` cannot carry the channel in work (the
      // U21 precedent, register §5.340 (a)): the record goes through the
      // window's `log` and the register through the framework's function.
      // A fault after the result was already final (both channels resumed)
      // closes the console for the participant but leaves the opportunity's
      // validity as it is (owner amendment §5.359 (3)).
      if (!resultFinal) {
        markOpportunityInvalid(M20_OPPORTUNITY_ID, 'technical_failure', detail);
        refreshValidityProbe();
      }

      refreshPilotCoverageProbe();
    }

    sink('technical_failure', {
      phase: 'closure',
      detail,
      channel_id:
        outcome.kind === 'closed'
          ? (outcome.channel_id ?? channelId)
          : channelId,
      result_final: resultFinal,
      input_mode: 'system',
    });
  } catch {
    // The fault record itself failed: the project state already says
    // technical failure; nothing else can be done here.
  }
}

/** Runs a command; a thrown fault is routed to `m20TechnicalFailure` and `fallback` returned. */
function guarded<T>(name: string, fallback: T, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    m20TechnicalFailure(`${name}: ${message}`);

    return fallback;
  }
}

export function declareM20Feed() {
  ensure();
  windowInstance.declare();
}

export function m20ProjectState(): Readonly<M20Project> {
  return ensure();
}

/**
 * The Workshop presents the console on entry in the return shift: exposure
 * only, through the kit's `present` (`presented`) — never an opening.
 */
export function presentM20(nowMs: number) {
  declareM20Feed();
  presented = true;
  windowInstance.present(nowMs);
}

function recordPriorLoadCheck(prior: readonly { event_type: string }[]) {
  const pageLoadIndex = researchRuntime.getPageLoadIndex();

  if (priorLoadChecked || pageLoadIndex <= 1) {
    return;
  }

  priorLoadChecked = true;
  sink('prior_load_checked', {
    phase: 'closure',
    ...m20PriorLoadCheck(
      pageLoadIndex,
      prior,
      researchRuntime.getEventIntegrity(),
    ),
    input_mode: 'system',
  });
}

/**
 * Reload guard: a console opened in an earlier page load of this identity is
 * never re-run — prior exposure is recorded and the project is marked
 * technically incomplete; the new load's row is `interrupted`. Idempotent;
 * called at Workshop entry and at the open.
 */
export function guardM20Reload(): boolean {
  const s = ensure();

  if (s.status !== 'unopened' || windowInstance.windowStatus() !== 'unopened') {
    return false;
  }

  const prior = researchRuntime.getPriorPageLoadEvents();

  recordPriorLoadCheck(prior);

  if (!m20PriorAdministration(prior)) {
    return false;
  }

  m20sHoldBack(s);
  windowInstance.recordPriorExposure(
    'feed console opened in an earlier page load of this identity',
  );
  windowInstance.technicalFailure(M20_RELOAD_DETAIL);

  return true;
}

/**
 * Opens (or reopens) the console. Any due release is written first; the
 * first opening writes the kit's `opportunity_opened` with the entry snapshot
 * (`stage` = the route stage at the open; the yard's preparation); every
 * later opening lands on the channel view (or the card again).
 */
export function openM20(nowMs: number, entry: { stage?: string | null } = {}) {
  declareM20Feed();
  guardM20Reload();

  const s = ensure();

  guarded('open', undefined, () => {
    m20sWriteDueReleases(s, nowMs, sink, 'open');

    if (s.status === 'unopened') {
      windowInstance.open(
        nowMs,
        m20EntrySnapshot(entry.stage ?? null, outdoorPrepared()),
      );
    } else if (m20Live(s)) {
      windowInstance.open(nowMs);
    }

    m20sOpen(s, nowMs, sink);
  });
}

/**
 * The reconciliation of the open console (owner amendment of 14 October
 * 2026, register §5.359 (2)): the Workshop scene is paused while the
 * console is open, so every console command and the open surface's own
 * ≤ 250 ms check write any due release first (`check: 'console'`; the
 * release keeps `released_at_ms = held_at_ms + 30000`, its write time is
 * the real one). Returns the channels released now.
 */
function reconcileOpenConsole(s: M20Project, nowMs: number): M20ChannelId[] {
  if (!s.console_open || !m20Live(s)) {
    return [];
  }

  return m20sWriteDueReleases(s, nowMs, sink, 'console');
}

/**
 * The open console's check (the host runs it from the surface's clock at
 * most every 250 ms while the console is open): true when a release was
 * written, so the host re-renders the open view (same view, same focus,
 * no new settle).
 */
export function m20ConsoleTick(nowMs: number): boolean {
  return guarded(
    'console_tick',
    false,
    () => reconcileOpenConsole(ensure(), nowMs).length > 0,
  );
}

/** CONTINUE on the card. */
export function continueM20(mode: InputMode, nowMs: number): boolean {
  return guarded('continue', false, () => {
    const s = ensure();

    reconcileOpenConsole(s, nowMs);

    return m20sContinue(s, mode, nowMs, sink);
  });
}

/** CONTINUE CHANNEL A / B (the channel view, or the channel's released hold view). */
export function continueM20Channel(
  id: M20ChannelId,
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('continue_channel', false, () => {
    const s = ensure();

    reconcileOpenConsole(s, nowMs);

    return m20sContinueChannel(s, id, mode, nowMs, sink);
  });
}

/** START CHANNEL B (A's hold view or the channel view). */
export function startM20B(mode: InputMode, nowMs: number): boolean {
  return guarded('start_b', false, () => {
    const s = ensure();

    reconcileOpenConsole(s, nowMs);

    return m20sStartB(s, mode, nowMs, sink);
  });
}

/** CHANNELS [C]: the channel view inside the open console (no record). */
export function showM20Channels(mode: InputMode, nowMs: number): boolean {
  return guarded('channels', false, () => {
    const s = ensure();

    reconcileOpenConsole(s, nowMs);

    return m20sChannels(s, mode, nowMs);
  });
}

export function changeM20Cell(
  cell: number,
  mode: InputMode,
  nowMs: number,
): boolean {
  return guarded('change_cell', false, () => {
    const s = ensure();

    reconcileOpenConsole(s, nowMs);

    return m20sChangeCell(s, cell, mode, nowMs, sink);
  });
}

/** ALIGN; both channels aligned complete the kit window. */
export function alignM20(mode: InputMode, nowMs: number): M20AlignOutcome {
  return guarded('align', { kind: 'none' } as M20AlignOutcome, () => {
    const s = ensure();

    reconcileOpenConsole(s, nowMs);

    const outcome = m20sAlign(s, mode, nowMs, sink);

    if (s.status === 'completed' && windowInstance.isOpen()) {
      windowInstance.complete(nowMs, m20ClosureSnapshot(s, nowMs), mode);
    }

    return outcome;
  });
}

export function openM20Help(mode: InputMode, nowMs: number): boolean {
  return guarded('help', false, () => {
    const s = ensure();

    reconcileOpenConsole(s, nowMs);

    return m20sHelp(s, mode, nowMs, sink);
  });
}

export function closeM20Help(mode: InputMode, nowMs: number): boolean {
  return guarded('close_help', false, () => {
    const s = ensure();

    reconcileOpenConsole(s, nowMs);

    return m20sCloseHelp(s, mode, nowMs);
  });
}

/**
 * ESC order: the help sheet closes first; otherwise ESC leaves the console
 * exactly as LEAVE does — also inside the 400 ms settle (owner amendment of
 * 14 October 2026, register §5.359 (5): a fresh ESC and LEAVE are equal
 * non-committing exits). A held or repeated key never acts (the surface
 * drops `repeat` key events). Returns true when ESC was consumed.
 */
export function m20ConsumesEsc(nowMs: number): boolean {
  return guarded('esc', false, () => {
    const s = ensure();

    if (s.help_open) {
      reconcileOpenConsole(s, nowMs);
      s.help_open = false;
      s.view_shown_at_ms = nowMs;

      return true;
    }

    return false;
  });
}

/**
 * The surface closed (ESC, LEAVE): the window pauses, the work clock pauses;
 * nothing closes. Called from the surface's `onClose` (before the host
 * resumes) and from the LEAVE control's host close.
 */
export function closeM20Surface(nowMs: number) {
  guarded('leave', undefined, () => {
    const s = ensure();

    if (!s.console_open) {
      return;
    }

    // A release that fell due while the console was open is written before
    // the leaving record (honest order; owner amendment §5.359 (2)).
    reconcileOpenConsole(s, nowMs);
    m20sLeave(s, nowMs, sink);

    if (windowInstance.isOpen()) {
      windowInstance.pause(nowMs);
    }
  });
}

/**
 * The Workshop scene resumed. The kit window's active clock restarts only
 * while the console surface is open (a pause of the whole scene over the
 * open console); after LEAVE or ESC the window stays paused until the real
 * reopening.
 */
export function resumeM20Surface(nowMs: number) {
  if (project === null || !project.console_open) {
    return;
  }

  windowInstance.resume(nowMs);
}

/**
 * The release / due check the Workshop scene runs (≤ 250 ms while the scene
 * runs, and on RESUME): due releases are written first; a notice whose time
 * is over ends; at most one due notice is delivered when nothing blocks.
 * Returns the two lines of the active notice (null when none shows).
 */
export function m20CueCheck(
  nowMs: number,
  context: {
    blocked: boolean;
    distance_to_console_px: number | null;
    on_resume?: boolean;
  },
): string[] | null {
  const s = ensure();

  lastCheckAtMs = nowMs;

  if (!m20Live(s)) {
    return null;
  }

  const causes = environmentPauseCauses();
  const cueContext: M20CueContext = {
    blocked: context.blocked,
    pause_causes: causes,
    page_visible: typeof document === 'undefined' ? true : !document.hidden,
    page_focused:
      typeof document === 'undefined' || typeof document.hasFocus !== 'function'
        ? true
        : document.hasFocus(),
    distance_to_console_px: context.distance_to_console_px,
  };

  guarded('cue_check', undefined, () => {
    m20sCueCheck(
      s,
      nowMs,
      cueContext,
      sink,
      context.on_resume ? 'resume' : 'tick',
    );
  });

  return m20NoticeLines(s);
}

/** The notice ends early (a surface or prompt opening, leaving the Workshop). */
export function m20CueEnded(reason: M20CueEndReason, nowMs: number): boolean {
  return guarded('cue_ended', false, () =>
    m20sEndCue(ensure(), reason, nowMs, sink),
  );
}

/** The two lines of the active notice (null when none shows). */
export function m20ActiveNotice(): string[] | null {
  return project === null ? null : m20NoticeLines(project);
}

/**
 * The sign-off at the work order board. (a) An opened, uncompleted project
 * closes `shift_signed_off` (due releases written, the notice ended, every
 * channel as it stands) and the kit window completes with exit state
 * `stopped` — a completed observation (decision D-U22-1 item 6). (b) A
 * presented, never-opened console records `closed_unopened`
 * (`shift_signed_off`); the kit window stays unopened until the review. (c)
 * Not presented: nothing. A completed project is not reclosed.
 */
export function closeM20AtShiftEnd(nowMs: number) {
  const s = ensure();

  if (s.status === 'unopened') {
    if (
      presented &&
      windowInstance.windowStatus() === 'unopened' &&
      !closedUnopened
    ) {
      closedUnopened = true;
      m20sCloseUnopened(s, 'shift_signed_off');
      sink('closed_unopened', {
        phase: 'closure',
        closure_reason: 'shift_signed_off',
        input_mode: 'system',
      });
    }

    return;
  }

  guarded('shift_end', undefined, () => {
    if (m20sCloseAtShiftEnd(s, nowMs, sink)) {
      windowInstance.complete(nowMs, m20ClosureSnapshot(s, nowMs), 'system', {
        exitState: 'stopped',
      });
    }
  });
}

/**
 * The station-record closure at the Utility Deck review. A project still
 * open (reachable only when the sign-off closure did not run) closes
 * `closed_at_review` (censored); a never-opened console is recorded absent —
 * `presented_not_opened` when the Workshop presented it, never `declined` —
 * and, when no `closed_unopened` exists yet, closed as such; a closed or
 * completed project is untouched.
 */
export function closeM20AtReview(nowMs: number) {
  const s = ensure();

  if (windowInstance.windowStatus() === 'unopened') {
    windowInstance.markAbsent(
      presented ? 'presented_not_opened' : 'not_presented_not_opened',
    );

    if (presented && !closedUnopened) {
      closedUnopened = true;
      sink('closed_unopened', {
        phase: 'closure',
        closure_reason: 'closed_at_review',
        input_mode: 'system',
      });
    }

    m20sCloseUnopened(s, 'closed_at_review');

    return;
  }

  guarded('review', undefined, () => {
    if (m20sCloseAtReview(s, nowMs, sink)) {
      windowInstance.stop(
        nowMs,
        'closed_at_review',
        { ...m20ClosureSnapshot(s, nowMs), invalid_detail: 'closed_at_review' },
        'system',
        'censored',
      );
    }
  });
}

/** The world chip: counts only — never `held` or `pass open`. */
export function m20ChipText(): string {
  return chipTextOf(ensure());
}

/** The M04 other-work signature: executed ALIGNs plus aligned steps. */
export function m20OtherWorkSignature(): string {
  return m20WorkSignature(ensure());
}

/**
 * Binds the surface model to this adapter: the host scene supplies the
 * clock, the close path and the feedback line; the state reader and every
 * command come from here (the surface model stays pure).
 */
export function bindM20Surface(base: {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
}): M20SurfaceHost {
  return {
    ...base,
    project: m20ProjectState,
    commands: {
      continue: continueM20,
      continueChannel: continueM20Channel,
      startB: startM20B,
      changeCell: changeM20Cell,
      align: alignM20,
      help: openM20Help,
      closeHelp: closeM20Help,
      channels: showM20Channels,
    },
  };
}

// ——— The yard: Mast 04 as unmeasured outdoor preparation ———————————————

function ensureMissionLog() {
  if (missionLogRegistered) {
    return;
  }

  missionLogRegistered = true;
  registerMissionLogEntry({
    id: 'm20_feed_outdoor',
    kind: 'project',
    text: () => m20MissionLogText(exteriorEpisode().m20),
    // Closed once the return shift begins: the feed is the console's.
    isClosed: () =>
      !exteriorEpisode().m20.accepted || pilotStageAtOrAfter('return_hub'),
    order: 40,
  });
}

/** The mast prompt opened: the brief shown (once; descriptive). */
export function presentM20MastBrief(nowMs: number) {
  if (briefPresented) {
    return;
  }

  briefPresented = true;
  sink('outdoor_brief_presented', {
    phase: 'outdoor',
    presented_at_ms: nowMs,
    outdoor_stages_total: M20_OUTDOOR_STAGES.length,
    input_mode: 'system',
  });
}

/** "Accept the restoration" at Mast 04 (the legacy pure state; never the kit's open). */
export function acceptM20Mast(nowMs: number, inputMode: InputMode): boolean {
  const state = exteriorEpisode().m20;

  if (!m20Accept(state, nowMs)) {
    return false;
  }

  ensureMissionLog();
  sink('outdoor_accepted', {
    phase: 'outdoor',
    accepted_at_ms: nowMs,
    outdoor_stages_total: M20_OUTDOOR_STAGES.length,
    input_mode: inputMode,
  });

  return true;
}

/** An outdoor stage done at Mast 04 (the legacy pure state). */
export function doM20MastStage(
  stage: M20OutdoorStage,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const state = exteriorEpisode().m20;

  if (!m20CompleteStage(state, stage, nowMs)) {
    return false;
  }

  sink('outdoor_stage_completed', {
    phase: 'outdoor',
    stage,
    stages_done: state.stages_done.length,
    outdoor_complete: m20OutdoorComplete(state),
    elapsed_ms: Math.max(0, nowMs - (state.accepted_at_ms ?? nowMs)),
    input_mode: inputMode,
  });

  return true;
}

/** A runtime fault inside a mast action: recorded on the outdoor phase; the console is untouched. */
export function m20OutdoorFault(detail: string, nowMs: number = Date.now()) {
  const state = exteriorEpisode().m20;

  state.technical_failure = detail;
  sink('outdoor_technical_failure', {
    phase: 'outdoor',
    detail,
    at_ms: nowMs,
    input_mode: 'system',
  });
}

// ——— DEV probe —————————————————————————————————————————————————————————

/** Publishes the DEV probe (read-only; never read back into gameplay). */
export function publishM20Probe(nowMs: number = Date.now()) {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  const s = ensure();
  const lines = m20NoticeLines(s);
  const channels = Object.fromEntries(
    s.channels.map((channel) => [
      channel.id,
      {
        status: m20ChannelStatus(channel),
        word: m20ChannelWord(channel),
        started: channel.started,
        step: channel.step,
        steps_done: channel.steps_done,
        cells: [...channel.cells],
        attempts: channel.attempts.length,
        held_at_ms: channel.held_at_ms,
        released_at_ms: channel.released_at_ms,
        cue_due_at_ms:
          channel.released_at_ms === null
            ? null
            : channel.released_at_ms + 30_000,
        cue_presented_at_ms: channel.cue?.presented_at_ms ?? null,
        cue_ended_at_ms: channel.cue?.ended_at_ms ?? null,
        cue_ended_reason: channel.cue?.ended_reason ?? null,
        cue_cancelled: channel.cue_cancelled_at_ms !== null,
        resumption: channel.resumption,
        resumption_attempt_index: channel.resumption_attempt_index,
        aligned: channel.aligned_at_ms !== null,
        held_visits: channel.held_visits,
        released_visits: channel.released_visits,
        post_resumption_reentries: channel.post_resumption_reentries,
      },
    ]),
  ) as M20FeedProbe['channels'];

  window.__m20FeedProbe = {
    status: s.status,
    view: s.view,
    current: s.current,
    console_open: s.console_open,
    help_open: s.help_open,
    window: windowInstance.windowStatus(),
    exit: windowInstance.exit(),
    chip: chipTextOf(s),
    closure_reason: s.closure_reason,
    failure_detail: s.failure_detail,
    spontaneous_resumptions: m20SpontaneousCount(s),
    notice:
      s.notice === null || lines === null
        ? null
        : {
            channel_id: s.notice.channel_id,
            presented_at_ms: s.notice.presented_at_ms,
            lines,
          },
    now_ms: nowMs,
    last_check_at_ms: lastCheckAtMs,
    outdoor: outdoorPrepared(),
    channels,
    help_view: m20HelpView(s),
  } as M20FeedProbe & { help_view: string };
}

/** Test-only escape hatch. */
export function resetM20State() {
  if (project !== null) {
    for (const channel of project.channels) {
      releaseFocusedClock(channel.work);

      if (channel.spontaneous !== null) {
        releaseFocusedClock(channel.spontaneous);
      }
    }
  }

  project = null;
  presented = false;
  closedUnopened = false;
  priorLoadChecked = false;
  briefPresented = false;
  missionLogRegistered = false;
  lastCheckAtMs = null;
  windowInstance.reset();
}
