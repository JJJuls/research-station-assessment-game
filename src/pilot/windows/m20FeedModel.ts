/**
 * M20 — the project model of the two held channels of the Mast 04 feed
 * (Station 080 M01–M26 run, Unit 22; administration `m20-feed-returns-v2`).
 * PURE (no Phaser, no runtime import): the window adapter
 * (`m20FeedConsole.ts`) owns the register window, injects the log sink and
 * the clock, registers the channel clocks with the focus monitor and runs
 * the release / due check from the Workshop scene; the surface model
 * (`m20SurfaceModel.ts`) only renders this state and calls the adapter with
 * its input mode.
 *
 * Under research-owner decision D-U22-1 (14 October 2026, recorded as the
 * owner's SPECIFIC selections: items 1–11 as recommended, item 12 the
 * silent-release alternative, item 13 the exploratory label): the
 * first-opening card; channel A, then B (B once A has ever been held); six
 * cell-matching steps per channel; the system HOLDS a channel the moment its
 * second step is aligned (`channel_held`); at `held_at_ms + 30000` the channel
 * is released SILENTLY (`channel_released`, written at the first check at or
 * after that time, always before any work on, view of, notice for or closure
 * of the channel); the first EXECUTED ALIGN after the release and before the
 * channel's notice is a SPONTANEOUS resumption (its notice cancelled and
 * never shown; the channel excluded from the cued denominator); at
 * `released_at_ms + 30000` a station notice becomes due and is delivered only
 * under the delivery conditions (the console closed, the scene running,
 * nothing else open, the page visible and focused, the channel neither
 * resumed nor aligned, A before B with B ≥ 8 000 ms after A's ACTUAL end);
 * the first EXECUTED ALIGN after the notice is the CUED credit. Opening,
 * CONTINUE, cell edits and refused ALIGNs are never resumptions; a channel is
 * never counted twice; no resumption writes a new hold, release, notice,
 * channel start, opening or occasion.
 *
 * ALIGN is refused on the current vector alone: `as_loaded` (every cell at
 * its loading value), `repeat` (the step's last EXECUTED vector), `settling`
 * (inside 400 ms of a view appearing) and `held` (unreachable through the
 * interface); an older vector executes. EVERY view transition settles; a held
 * key never reaches this model (the surface drops repeats).
 *
 * Nothing here scores: the attempts, holds, releases, notices and credits
 * are raw events, and `m20_cued_resumptions` is recounted read-only by
 * `features/m20.ts`. The targets are the content module's approved data.
 */
import { FocusedClock } from '../../measurement/focusedClock';
import {
  isM20ChannelId,
  M20_CELLS_PER_STEP,
  M20_CHANNEL_ORDER,
  M20_CHANNELS,
  M20_CHANNELS_PLANNED,
  M20_CONTENT_VERSION,
  M20_FAMILY,
  M20_FORM_ID,
  M20_HOLD_AFTER_STEP,
  M20_NOTICE_AFTER_RELEASE_MS,
  M20_NOTICE_MS,
  M20_RELEASE_MS,
  M20_SETTLE_MS,
  M20_SPACING_MS,
  M20_STEPS_PER_CHANNEL,
  M20_TEXT,
  m20Aligned,
  m20AsLoaded,
  type M20ChannelDef,
  type M20ChannelId,
  type M20ChannelLetter,
  type M20ChannelWord,
  m20CycleCell,
  m20Differ,
  m20LoadingCells,
  m20SameCells,
} from './m20FeedContent';

export type M20InputMode = 'pointer' | 'keyboard' | 'system';
export type M20Phase = 'outdoor' | 'intro' | 'measurement' | 'cue' | 'closure';
/** The sink returns the logger sequence of the event it wrote (null when unknown). */
export type M20LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => number | null | undefined | void;

export type M20Status =
  | 'unopened'
  | 'intro'
  | 'work'
  | 'completed'
  | 'closed'
  | 'held_back'
  | 'technical_failure';

export type M20View = 'intro' | 'step' | 'held' | 'channels' | 'record';

export type M20Resumption = 'spontaneous' | 'cued';

export type M20RefusalReason = 'as_loaded' | 'repeat' | 'settling' | 'held';

export type M20CueEndReason =
  | 'timeout'
  | 'surface_opened'
  | 'prompt_opened'
  | 'shutdown'
  | 'project_closed'
  | 'technical_failure';

export type M20ClosureReason =
  | 'completed'
  | 'shift_signed_off'
  | 'closed_at_review'
  | 'technical_failure';

/** The check that wrote a due release (descriptive). */
export type M20ReleaseContext =
  | 'tick'
  | 'resume'
  | 'open'
  // Owner amendment of 14 October 2026 (register §5.359 (2)): the
  // reconciliation while the console is open — every console command and
  // the ≤ 250 ms check of the open surface (the Workshop scene is paused).
  | 'console'
  | 'shift_end'
  | 'review'
  | 'fault';

/** Every suffix the family may log (contract §9.2; names fixed). */
export const M20_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'intro_acknowledged',
  'console_reopened',
  'console_left',
  'held_visit',
  'released_visit',
  'prior_load_checked',
  'closed_unopened',
  'channel_started',
  'step_presented',
  'cell_changed',
  'align_refused',
  'align_attempt',
  'step_aligned',
  'channel_held',
  'channel_released',
  'cue_presented',
  'cue_notice_ended',
  'cue_cancelled',
  'help_consulted',
  'channel_aligned',
  'project_completed',
  'project_closed',
  'technical_failure',
  'window_closed',
  'outdoor_brief_presented',
  'outdoor_accepted',
  'outdoor_stage_completed',
  'outdoor_technical_failure',
] as const;

export const M20_RELOAD_DETAIL =
  'reload after administration: console not re-run';

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

export interface M20Attempt {
  /** 1-based, consecutive per channel across its steps. */
  index: number;
  step_index: number;
  cells: number[];
  differ: number;
  aligned: boolean;
  after_cue: boolean;
  in_silent_window: boolean;
  /** The logger sequence of the attempt event (from the sink). */
  sequence: number | null;
  at_ms: number;
}

export interface M20Cue {
  presented_at_ms: number;
  due_at_ms: number;
  deferred_ms: number;
  page_visible: boolean;
  page_focused: boolean;
  distance_to_console_px: number | null;
  ended_at_ms: number | null;
  ended_reason: M20CueEndReason | null;
  focus_lost_during_display: boolean;
}

/** The console-closed clock from the notice to the credit or the closure. */
export interface M20CueClock {
  started_at_ms: number;
  console_open_since_ms: number | null;
  open_ms: number;
  stopped_at_ms: number | null;
}

export interface M20RefusedCounts {
  as_loaded: number;
  repeat: number;
  settling: number;
  held: number;
}

export interface M20ChannelState {
  id: M20ChannelId;
  letter: M20ChannelLetter;
  index: number;
  started: boolean;
  /** The current step (1-based; 0 until started). */
  step: number;
  /** The current step has been presented (a CONTINUE repeats it, `resumed: true`). */
  step_shown: boolean;
  steps_done: number;
  /** The draft cells of the current step (survive leaving). */
  cells: number[];
  /** The last EXECUTED vector of the current step. */
  last_executed: number[] | null;
  attempts: M20Attempt[];
  held_at_ms: number | null;
  released_at_ms: number | null;
  release_written_at_ms: number | null;
  cue: M20Cue | null;
  cue_cancelled_at_ms: number | null;
  resumption: M20Resumption | null;
  resumption_attempt_index: number | null;
  aligned_at_ms: number | null;
  held_visits: number;
  released_visits: number;
  post_resumption_reentries: number;
  refused: M20RefusedCounts;
  refused_in_silent_window: number;
  refused_after_cue_before_credit: M20RefusedCounts;
  /** Runs while the console is open on this channel's step view. */
  work: FocusedClock;
  work_registered: boolean;
  /** From the release to the spontaneous ALIGN (focused pauses on focus loss / hidden only). */
  spontaneous: FocusedClock | null;
  release_to_spontaneous_wall_ms: number | null;
  release_to_spontaneous_focused_ms: number | null;
  cue_clock: M20CueClock | null;
  cue_to_credit_wall_ms: number | null;
  cue_to_credit_console_closed_ms: number | null;
  cue_to_closure_wall_ms: number | null;
  cue_to_closure_console_closed_ms: number | null;
}

/** Hooks the adapter uses to subscribe clocks to the focus monitor. */
export interface M20ClockHooks {
  register?: (clock: FocusedClock) => void;
  release?: (clock: FocusedClock) => void;
}

export interface M20Notice {
  channel_id: M20ChannelId;
  presented_at_ms: number;
}

export interface M20Project {
  status: M20Status;
  view: M20View;
  /** The channel of the step view (null elsewhere). */
  current: M20ChannelId | null;
  channels: [M20ChannelState, M20ChannelState];
  console_open: boolean;
  open_count: number;
  intro_acknowledged: boolean;
  help_open: boolean;
  /** The active station notice (the band is shown while it is set). */
  notice: M20Notice | null;
  closure_reason: M20ClosureReason | null;
  failure_detail: string | null;
  /** When the current view appeared: a press inside `M20_SETTLE_MS` of it changes nothing. */
  view_shown_at_ms: number | null;
  hooks: M20ClockHooks;
}

function refusedCounts(): M20RefusedCounts {
  return { as_loaded: 0, repeat: 0, settling: 0, held: 0 };
}

function channelState(def: M20ChannelDef): M20ChannelState {
  return {
    id: def.id,
    letter: def.letter,
    index: def.index,
    started: false,
    step: 0,
    step_shown: false,
    steps_done: 0,
    cells: [],
    last_executed: null,
    attempts: [],
    held_at_ms: null,
    released_at_ms: null,
    release_written_at_ms: null,
    cue: null,
    cue_cancelled_at_ms: null,
    resumption: null,
    resumption_attempt_index: null,
    aligned_at_ms: null,
    held_visits: 0,
    released_visits: 0,
    post_resumption_reentries: 0,
    refused: refusedCounts(),
    refused_in_silent_window: 0,
    refused_after_cue_before_credit: refusedCounts(),
    work: new FocusedClock(),
    work_registered: false,
    spontaneous: null,
    release_to_spontaneous_wall_ms: null,
    release_to_spontaneous_focused_ms: null,
    cue_clock: null,
    cue_to_credit_wall_ms: null,
    cue_to_credit_console_closed_ms: null,
    cue_to_closure_wall_ms: null,
    cue_to_closure_console_closed_ms: null,
  };
}

export function createM20Project(hooks: M20ClockHooks = {}): M20Project {
  return {
    status: 'unopened',
    view: 'intro',
    current: null,
    channels: [channelState(M20_CHANNELS[0]), channelState(M20_CHANNELS[1])],
    console_open: false,
    open_count: 0,
    intro_acknowledged: false,
    help_open: false,
    notice: null,
    closure_reason: null,
    failure_detail: null,
    view_shown_at_ms: null,
    hooks,
  };
}

/* ------------------------------------------------------------------ *
 * Reload guard and entry snapshot
 * ------------------------------------------------------------------ */

/** True when an earlier page load of this identity already opened the console. */
export function m20PriorAdministration(
  priorLoadEvents: readonly { event_type: string }[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M20_FAMILY}opportunity_opened`,
  );
}

export interface M20HistoryIntegrity {
  first_sequence: number | null;
  sequence_gap_count: number;
  sequence_duplicate_count: number;
  recovered_from_chunks: boolean;
}

export interface M20PriorLoadCheck {
  page_load_index: number;
  prior_page_load_event_count: number;
  prior_opening_found: boolean;
  prior_presentation_found: boolean;
  history_continuous: boolean;
  prior_opening_absence_established: boolean;
}

/**
 * The reload check of a later page load (the M14 / M18 / M19 precedent): the
 * absence of an earlier opening is ESTABLISHED only when the recovered
 * history is continuous and holds no `opportunity_opened` of this family; a
 * found opening is the hold-back; an earlier presentation is reported, never
 * read as an opening.
 */
export function m20PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly { event_type: string }[],
  integrity: M20HistoryIntegrity,
): M20PriorLoadCheck {
  const found = m20PriorAdministration(priorLoadEvents);
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
    prior_presentation_found: priorLoadEvents.some(
      (event) => event.event_type === `${M20_FAMILY}presented`,
    ),
    history_continuous: continuous,
    prior_opening_absence_established: !found && continuous,
  };
}

export interface M20OutdoorPrepared {
  accepted: boolean;
  stages_done: string[];
  outdoor_complete: boolean;
}

/** The entry-state snapshot written with `opportunity_opened` (contract §9.3). */
export function m20EntrySnapshot(
  stage: string | null,
  outdoor: M20OutdoorPrepared,
) {
  return {
    channels_planned: M20_CHANNELS_PLANNED,
    channel_order: [...M20_CHANNEL_ORDER],
    steps_per_channel: M20_STEPS_PER_CHANNEL,
    cells_per_step: [...M20_CELLS_PER_STEP],
    hold_after_step: M20_HOLD_AFTER_STEP,
    release_delay_ms: M20_RELEASE_MS,
    notice_after_release_ms: M20_NOTICE_AFTER_RELEASE_MS,
    notice_ms: M20_NOTICE_MS,
    notice_spacing_ms: M20_SPACING_MS,
    refusal_rule: 'vector_as_loaded_or_last_executed',
    credit_rule: 'first_executed_align_after_cue',
    spontaneous_rule: 'first_executed_align_after_release_before_cue',
    form_id: M20_FORM_ID,
    content_version: M20_CONTENT_VERSION,
    settle_ms: M20_SETTLE_MS,
    outdoor_prepared: {
      accepted: outdoor.accepted,
      stages_done: [...outdoor.stages_done],
      outdoor_complete: outdoor.outdoor_complete,
    },
    stage,
  };
}

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

/** The project can still be worked (the card or the channels). */
export function m20Live(s: M20Project): boolean {
  return s.status === 'intro' || s.status === 'work';
}

export function m20Phase(s: M20Project): M20Phase {
  switch (s.status) {
    case 'intro':
      return 'intro';
    case 'work':
      return 'measurement';
    default:
      return 'closure';
  }
}

export function m20ChannelOf(s: M20Project, id: M20ChannelId): M20ChannelState {
  return s.channels.find((channel) => channel.id === id)!;
}

export function m20Current(s: M20Project): M20ChannelState | null {
  return s.current === null ? null : m20ChannelOf(s, s.current);
}

export function m20Settling(s: M20Project, nowMs: number): boolean {
  return (
    s.view_shown_at_ms !== null && nowMs - s.view_shown_at_ms < M20_SETTLE_MS
  );
}

export function m20IsHeld(channel: M20ChannelState): boolean {
  return channel.held_at_ms !== null && channel.released_at_ms === null;
}

export function m20IsReleased(channel: M20ChannelState): boolean {
  return channel.released_at_ms !== null;
}

export function m20IsAligned(channel: M20ChannelState): boolean {
  return channel.aligned_at_ms !== null;
}

/** A channel the participant can continue: started, not aligned, not held. */
export function m20Workable(channel: M20ChannelState): boolean {
  return channel.started && !m20IsAligned(channel) && !m20IsHeld(channel);
}

/** The channel view's word (preview §4.1). */
export function m20ChannelWord(channel: M20ChannelState): M20ChannelWord {
  if (m20IsAligned(channel)) {
    return 'aligned';
  }

  if (m20IsHeld(channel)) {
    return 'held';
  }

  if (m20IsReleased(channel)) {
    return 'pass open';
  }

  return channel.started ? 'in work' : 'not started';
}

/** A channel's status as the probe reports it (the extractor recounts its own). */
export function m20ChannelStatus(channel: M20ChannelState): string {
  if (m20IsAligned(channel)) {
    return 'aligned';
  }

  if (channel.resumption === 'spontaneous') {
    return 'resumed_spontaneously';
  }

  if (channel.resumption === 'cued') {
    return 'resumed';
  }

  if (channel.cue !== null) {
    return 'awaiting_return';
  }

  if (m20IsReleased(channel)) {
    return 'released_awaiting';
  }

  if (m20IsHeld(channel)) {
    return 'held';
  }

  return channel.started ? 'in_work' : 'not_begun';
}

/** The world chip: counts only — never `held` or `pass open`. */
export function m20ChipText(s: M20Project): string {
  switch (s.status) {
    case 'unopened':
      return M20_TEXT.chip_before;
    case 'closed':
    case 'held_back':
    case 'technical_failure':
      return M20_TEXT.chip_closed;
    default:
      return M20_TEXT.chip_counts(
        s.channels[0].steps_done,
        s.channels[1].steps_done,
      );
  }
}

/** The record line of a closed console (null while it can be worked or is completed). */
export function m20RecordLine(s: M20Project): string | null {
  switch (s.status) {
    case 'closed':
      return s.closure_reason === 'closed_at_review'
        ? M20_TEXT.closed_review
        : M20_TEXT.closed_signoff;
    case 'held_back':
      return M20_TEXT.held_back;
    case 'technical_failure':
      return M20_TEXT.closed_fault.join('\n');
    default:
      return null;
  }
}

/** The view name a help consult (and HELP / LEAVE ids) is recorded with. */
export function m20HelpView(s: M20Project): string {
  switch (s.status) {
    case 'intro':
      return 'intro';
    case 'work':
    case 'completed':
      if (s.view === 'step' && s.current !== null) {
        const channel = m20ChannelOf(s, s.current);

        return `step_${channel.letter.toLowerCase()}_${channel.step}`;
      }

      if (s.view === 'held' && s.current !== null) {
        return `held_${m20ChannelOf(s, s.current).letter.toLowerCase()}`;
      }

      return 'channels';
    default:
      return 'record';
  }
}

/** The buttons of the channel view (preview §4.6). */
export function m20ChannelButtons(s: M20Project): {
  continue: M20ChannelId[];
  start_b: boolean;
  none: boolean;
  both_aligned: boolean;
} {
  const [a, b] = s.channels;
  const cont = s.channels
    .filter((channel) => m20Workable(channel))
    .map((channel) => channel.id);
  const startB = !b.started && a.held_at_ms !== null;
  const both = m20IsAligned(a) && m20IsAligned(b);

  return {
    continue: cont,
    start_b: startB,
    none: cont.length === 0 && !startB && !both,
    both_aligned: both,
  };
}

export function m20SpontaneousCount(s: M20Project): number {
  return s.channels.filter((channel) => channel.resumption === 'spontaneous')
    .length;
}

function channelRecord(channel: M20ChannelState, nowMs: number) {
  return {
    channel_id: channel.id,
    occasion_id: channel.id,
    channel_index: channel.index,
    started: channel.started,
    steps_done: channel.steps_done,
    attempts: channel.attempts.length,
    held: channel.held_at_ms !== null,
    held_at_ms: channel.held_at_ms,
    released: channel.released_at_ms !== null,
    released_at_ms: channel.released_at_ms,
    noticed: channel.cue !== null,
    cue_presented_at_ms: channel.cue?.presented_at_ms ?? null,
    resumption: channel.resumption,
    resumption_attempt_index: channel.resumption_attempt_index,
    aligned: channel.aligned_at_ms !== null,
    held_visits: channel.held_visits,
    released_visits: channel.released_visits,
    post_resumption_reentries: channel.post_resumption_reentries,
    refused_in_silent_window: channel.refused_in_silent_window,
    work_focused_ms: Math.round(channel.work.focusedMs(nowMs)),
    release_to_spontaneous_wall_ms: channel.release_to_spontaneous_wall_ms,
    release_to_spontaneous_focused_ms:
      channel.release_to_spontaneous_focused_ms,
    cue_to_credit_wall_ms: channel.cue_to_credit_wall_ms,
    cue_to_credit_console_closed_ms: channel.cue_to_credit_console_closed_ms,
    cue_to_closure_wall_ms: channel.cue_to_closure_wall_ms,
    cue_to_closure_console_closed_ms: channel.cue_to_closure_console_closed_ms,
  };
}

/** The per-channel record written on every project closure (contract §9.2). */
export function m20ClosureSnapshot(s: M20Project, nowMs: number) {
  return {
    channels_planned: M20_CHANNELS_PLANNED,
    spontaneous_resumptions: m20SpontaneousCount(s),
    channels: s.channels.map((channel) => channelRecord(channel, nowMs)),
  };
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function fields(
  s: M20Project,
  channel: M20ChannelState | null,
  phase: M20Phase = m20Phase(s),
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    phase,
    form_id: M20_FORM_ID,
    content_version: M20_CONTENT_VERSION,
  };

  if (channel !== null) {
    base.channel_id = channel.id;
    base.occasion_id = channel.id;
    base.channel_index = channel.index;
  }

  return base;
}

function showView(
  s: M20Project,
  view: M20View,
  current: M20ChannelId | null,
  nowMs: number,
) {
  s.view = view;
  s.current = current;
  s.view_shown_at_ms = nowMs;
  syncWorkClocks(s, nowMs);
}

/** The work clock of a channel runs only while the console shows its step. */
function syncWorkClocks(s: M20Project, nowMs: number) {
  for (const channel of s.channels) {
    if (!channel.started || !channel.work.isRunning()) {
      continue;
    }

    const running =
      s.console_open &&
      s.status === 'work' &&
      s.view === 'step' &&
      s.current === channel.id;

    if (running) {
      channel.work.resume('surface_closed', nowMs);
    } else {
      channel.work.pause('surface_closed', nowMs);
    }
  }
}

function stopWork(s: M20Project, channel: M20ChannelState, nowMs: number) {
  if (channel.work.isRunning()) {
    channel.work.resume('surface_closed', nowMs);
    channel.work.stop(nowMs);
  }

  if (channel.work_registered) {
    channel.work_registered = false;
    s.hooks.release?.(channel.work);
  }
}

function stopSpontaneous(
  s: M20Project,
  channel: M20ChannelState,
  nowMs: number,
) {
  const clock = channel.spontaneous;

  if (clock === null) {
    return;
  }

  if (clock.isRunning()) {
    clock.stop(nowMs);
  }

  s.hooks.release?.(clock);
}

function cueClockOpen(channel: M20ChannelState, nowMs: number) {
  const clock = channel.cue_clock;

  if (clock !== null && clock.stopped_at_ms === null) {
    clock.console_open_since_ms ??= nowMs;
  }
}

function cueClockClose(channel: M20ChannelState, nowMs: number) {
  const clock = channel.cue_clock;

  if (
    clock !== null &&
    clock.stopped_at_ms === null &&
    clock.console_open_since_ms !== null
  ) {
    clock.open_ms += Math.max(0, nowMs - clock.console_open_since_ms);
    clock.console_open_since_ms = null;
  }
}

function cueClockStop(
  channel: M20ChannelState,
  nowMs: number,
): { wall: number; closed: number } | null {
  const clock = channel.cue_clock;

  if (clock === null || clock.stopped_at_ms !== null) {
    return null;
  }

  cueClockClose(channel, nowMs);
  clock.stopped_at_ms = nowMs;

  const wall = Math.max(0, nowMs - clock.started_at_ms);

  return { wall, closed: Math.max(0, wall - clock.open_ms) };
}

function startChannel(
  s: M20Project,
  channel: M20ChannelState,
  mode: M20InputMode,
  nowMs: number,
  sink: M20LogSink,
) {
  channel.started = true;
  channel.work.start(nowMs, ['surface_closed']);
  channel.work_registered = true;
  s.hooks.register?.(channel.work);
  sink('channel_started', {
    ...fields(s, channel, 'measurement'),
    assigned_position: channel.index,
    realised_position: s.channels.filter((candidate) => candidate.started)
      .length,
    input_mode: mode,
  });
}

function presentStep(
  s: M20Project,
  channel: M20ChannelState,
  stepIndex: number,
  resumed: boolean,
  nowMs: number,
  sink: M20LogSink,
) {
  if (!resumed) {
    channel.step = stepIndex;
    channel.cells = m20LoadingCells(stepIndex);
    channel.last_executed = null;
  }

  channel.step_shown = true;
  showView(s, 'step', channel.id, nowMs);
  sink('step_presented', {
    ...fields(s, channel, 'measurement'),
    step_index: channel.step,
    cells_n: channel.cells.length,
    cells: [...channel.cells],
    steps_done: channel.steps_done,
    resumed,
    input_mode: 'system',
  });
}

function writeDueReleases(
  s: M20Project,
  nowMs: number,
  sink: M20LogSink,
  context: M20ReleaseContext,
): M20ChannelId[] {
  const released: M20ChannelId[] = [];

  if (!m20Live(s)) {
    return released;
  }

  for (const channel of s.channels) {
    if (
      channel.held_at_ms === null ||
      channel.released_at_ms !== null ||
      nowMs < channel.held_at_ms + M20_RELEASE_MS
    ) {
      continue;
    }

    channel.released_at_ms = channel.held_at_ms + M20_RELEASE_MS;
    channel.release_written_at_ms = nowMs;

    const clock = new FocusedClock();

    clock.start(channel.released_at_ms);
    channel.spontaneous = clock;
    s.hooks.register?.(clock);
    sink('channel_released', {
      ...fields(s, channel, 'measurement'),
      released_at_ms: channel.released_at_ms,
      written_at_ms: nowMs,
      write_latency_ms: nowMs - channel.released_at_ms,
      check: context,
      input_mode: 'system',
    });
    released.push(channel.id);
  }

  return released;
}

function endNotice(
  s: M20Project,
  reason: M20CueEndReason,
  nowMs: number,
  sink: M20LogSink,
): boolean {
  const notice = s.notice;

  if (notice === null) {
    return false;
  }

  const channel = m20ChannelOf(s, notice.channel_id);
  const cue = channel.cue!;

  s.notice = null;
  cue.ended_at_ms = nowMs;
  cue.ended_reason = reason;
  sink('cue_notice_ended', {
    ...fields(s, channel, 'cue'),
    presented_at_ms: cue.presented_at_ms,
    ended_at_ms: nowMs,
    ended_reason: reason,
    displayed_ms: Math.max(0, nowMs - cue.presented_at_ms),
    focus_lost_during_display: cue.focus_lost_during_display,
    input_mode: 'system',
  });

  return true;
}

/** Closes every clock at a terminal record (closures add nothing after the last pause). */
function stopClocks(s: M20Project, nowMs: number) {
  for (const channel of s.channels) {
    stopWork(s, channel, nowMs);
    stopSpontaneous(s, channel, nowMs);

    const stopped = cueClockStop(channel, nowMs);

    if (stopped !== null && channel.resumption !== 'cued') {
      channel.cue_to_closure_wall_ms = stopped.wall;
      channel.cue_to_closure_console_closed_ms = stopped.closed;
    }
  }
}

function closeProject(
  s: M20Project,
  reason: 'shift_signed_off' | 'closed_at_review',
  nowMs: number,
  sink: M20LogSink,
  context: M20ReleaseContext,
): boolean {
  if (!m20Live(s)) {
    return false;
  }

  writeDueReleases(s, nowMs, sink, context);
  endNotice(s, 'project_closed', nowMs, sink);
  stopClocks(s, nowMs);
  s.help_open = false;
  s.status = 'closed';
  s.closure_reason = reason;
  s.view = 'record';
  s.current = null;
  sink('project_closed', {
    ...fields(s, null, 'closure'),
    closure_reason: reason,
    ...m20ClosureSnapshot(s, nowMs),
    input_mode: 'system',
  });

  return true;
}

/* ------------------------------------------------------------------ *
 * Opening, leaving, the card
 * ------------------------------------------------------------------ */

export type M20OpenOutcome = 'opened' | 'reopened' | 'record';

/**
 * The console surface opened. The FIRST opening shows the card (the adapter
 * has already written any due release and the kit's `opportunity_opened`);
 * a later opening lands on the channel view (or the card again) and records
 * `console_reopened` with the blocked approaches (`held_visit`) and the
 * silent-window visits (`released_visit`); a closed console shows its record.
 */
export function m20sOpen(
  s: M20Project,
  nowMs: number,
  sink: M20LogSink,
): M20OpenOutcome {
  s.open_count += 1;
  s.console_open = true;
  s.help_open = false;
  s.view_shown_at_ms = nowMs;

  if (s.status === 'unopened') {
    s.status = 'intro';
    showView(s, 'intro', null, nowMs);

    return 'opened';
  }

  if (!m20Live(s)) {
    showView(s, s.status === 'completed' ? 'channels' : 'record', null, nowMs);

    return 'record';
  }

  if (s.status === 'intro') {
    showView(s, 'intro', null, nowMs);
    sink('console_reopened', {
      ...fields(s, null),
      view: 'intro',
      input_mode: 'system',
    });

    return 'reopened';
  }

  showView(s, 'channels', null, nowMs);
  sink('console_reopened', {
    ...fields(s, null),
    view: 'channels',
    input_mode: 'system',
  });

  for (const channel of s.channels) {
    cueClockOpen(channel, nowMs);

    if (m20IsHeld(channel)) {
      channel.held_visits += 1;
      sink('held_visit', {
        ...fields(s, channel, 'measurement'),
        held_at_ms: channel.held_at_ms,
        input_mode: 'system',
      });
    } else if (
      m20IsReleased(channel) &&
      channel.resumption === null &&
      channel.cue === null &&
      !m20IsAligned(channel)
    ) {
      channel.released_visits += 1;
      sink('released_visit', {
        ...fields(s, channel, 'measurement'),
        released_at_ms: channel.released_at_ms,
        input_mode: 'system',
      });
    }

    if (channel.resumption !== null && !m20IsAligned(channel)) {
      channel.post_resumption_reentries += 1;
    }
  }

  return 'reopened';
}

/** The console surface closed (ESC, LEAVE, walking away). */
export function m20sLeave(s: M20Project, nowMs: number, sink: M20LogSink) {
  if (!s.console_open) {
    return;
  }

  const current = s.view === 'step' ? m20Current(s) : null;
  const view = s.view;

  s.help_open = false;
  s.console_open = false;
  syncWorkClocks(s, nowMs);

  for (const channel of s.channels) {
    cueClockClose(channel, nowMs);
  }

  if (m20Live(s)) {
    sink('console_left', {
      ...fields(s, current),
      view,
      input_mode: 'system',
    });
  }
}

/** CONTINUE on the card: the card acknowledged; channel A started, its step 1 presented. */
export function m20sContinue(
  s: M20Project,
  mode: M20InputMode,
  nowMs: number,
  sink: M20LogSink,
): boolean {
  if (s.status !== 'intro' || s.help_open || m20Settling(s, nowMs)) {
    return false;
  }

  s.intro_acknowledged = true;
  sink('intro_acknowledged', { ...fields(s, null), input_mode: mode });
  s.status = 'work';

  const a = s.channels[0];

  startChannel(s, a, mode, nowMs, sink);
  presentStep(s, a, 1, false, nowMs, sink);

  return true;
}

/* ------------------------------------------------------------------ *
 * The channel view: CONTINUE and START B
 * ------------------------------------------------------------------ */

/** CONTINUE CHANNEL X: the channel's current step presented again with its cells. */
export function m20sContinueChannel(
  s: M20Project,
  id: M20ChannelId,
  mode: M20InputMode,
  nowMs: number,
  sink: M20LogSink,
): boolean {
  if (
    s.status !== 'work' ||
    !(s.view === 'channels' || (s.view === 'held' && s.current === id)) ||
    s.help_open ||
    m20Settling(s, nowMs)
  ) {
    return false;
  }

  const channel = m20ChannelOf(s, id);

  if (!m20Workable(channel)) {
    return false;
  }

  void mode;
  // From the channel view, or (owner amendment §5.359 (4)) from the
  // channel's own hold view once its pass is open.
  // The step as it stood (`resumed: true`), or the next step the hold
  // prepared and never showed (a fresh presentation).
  presentStep(s, channel, channel.step, channel.step_shown, nowMs, sink);

  return true;
}

/** START CHANNEL B (A's hold view or the channel view): B started, its step 1 presented. */
export function m20sStartB(
  s: M20Project,
  mode: M20InputMode,
  nowMs: number,
  sink: M20LogSink,
): boolean {
  if (
    s.status !== 'work' ||
    (s.view !== 'channels' && s.view !== 'held') ||
    s.help_open ||
    m20Settling(s, nowMs)
  ) {
    return false;
  }

  const [a, b] = s.channels;

  if (b.started || a.held_at_ms === null) {
    return false;
  }

  startChannel(s, b, mode, nowMs, sink);
  presentStep(s, b, 1, false, nowMs, sink);

  return true;
}

/**
 * CHANNELS [C] (owner amendment of 14 October 2026, register §5.359 (2)):
 * from a working step or hold view, the channel view inside the open
 * console. A view change only — no record is written (no opening, leaving,
 * visit, resumption, hold, release or occasion); the step, its cells and
 * the channel's attempts stay as they are, and the work clock pauses as on
 * any view that is not the channel's step (its approved meaning).
 */
export function m20sChannels(
  s: M20Project,
  mode: M20InputMode,
  nowMs: number,
): boolean {
  void mode;

  if (
    s.status !== 'work' ||
    !s.console_open ||
    (s.view !== 'step' && s.view !== 'held') ||
    s.help_open ||
    m20Settling(s, nowMs)
  ) {
    return false;
  }

  showView(s, 'channels', null, nowMs);

  return true;
}

/**
 * The result is final (contract §3.8 [O-6]): no channel can still become
 * cued-eligible because both have resumed, spontaneously or after their
 * notice. A later runtime fault leaves such a result as it is (owner
 * amendment §5.359 (3)).
 */
export function m20ResultFinal(s: M20Project): boolean {
  return s.channels.every((channel) => channel.resumption !== null);
}

/* ------------------------------------------------------------------ *
 * A step: cells and ALIGN
 * ------------------------------------------------------------------ */

/** A cell tile: cycles the cell of the current step (descriptive; never work). */
export function m20sChangeCell(
  s: M20Project,
  cell: number,
  mode: M20InputMode,
  nowMs: number,
  sink: M20LogSink,
): boolean {
  const channel = m20Current(s);

  if (
    channel === null ||
    s.status !== 'work' ||
    s.view !== 'step' ||
    s.help_open ||
    m20Settling(s, nowMs) ||
    !Number.isInteger(cell) ||
    cell < 1 ||
    cell > channel.cells.length
  ) {
    return false;
  }

  const before = channel.cells[cell - 1];
  const after = m20CycleCell(before);

  channel.cells = channel.cells.map((value, at) =>
    at === cell - 1 ? after : value,
  );
  sink('cell_changed', {
    ...fields(s, channel, 'measurement'),
    step_index: channel.step,
    cell,
    value_before: before,
    value_after: after,
    cells: [...channel.cells],
    after_cue: channel.cue !== null,
    in_silent_window: inSilentWindow(channel),
    input_mode: mode,
  });

  return true;
}

function inSilentWindow(channel: M20ChannelState): boolean {
  return (
    m20IsReleased(channel) &&
    channel.cue === null &&
    channel.resumption === null &&
    !m20IsAligned(channel)
  );
}

export type M20AlignOutcome =
  | {
      kind: 'executed';
      attempt: M20Attempt;
      aligned: boolean;
      channel_aligned: boolean;
      resumption: M20Resumption | null;
    }
  | { kind: 'refused'; reason: M20RefusalReason }
  | { kind: 'none' };

/**
 * ALIGN: refused and not run (`align_refused`) when the press falls inside
 * the settle, the channel is held, every cell is at its loading value or the
 * cells equal this step's last EXECUTED vector; otherwise EXECUTED —
 * `align_attempt`, then (aligned) `step_aligned` and, at step 2 `channel_held`
 * (the hold view), at step 6 `channel_aligned` (and `project_completed` when
 * both are aligned), otherwise the next step; the first executed ALIGN after
 * the release and before the notice is the spontaneous resumption
 * (`cue_cancelled` written after the chain), the first after the notice the
 * cued credit.
 */
export function m20sAlign(
  s: M20Project,
  mode: M20InputMode,
  nowMs: number,
  sink: M20LogSink,
): M20AlignOutcome {
  const channel = m20Current(s);

  if (
    channel === null ||
    s.status !== 'work' ||
    s.view !== 'step' ||
    s.help_open
  ) {
    return { kind: 'none' };
  }

  const afterCue = channel.cue !== null;
  const silent = inSilentWindow(channel);
  const refuse = (
    reason: M20RefusalReason,
    extra: Record<string, unknown> = {},
  ): M20AlignOutcome => {
    channel.refused[reason] += 1;

    if (silent) {
      channel.refused_in_silent_window += 1;
    }

    if (afterCue && channel.resumption === null) {
      channel.refused_after_cue_before_credit[reason] += 1;
    }

    sink('align_refused', {
      ...fields(s, channel, 'measurement'),
      step_index: channel.step,
      reason,
      cells: [...channel.cells],
      after_cue: afterCue,
      in_silent_window: silent,
      ...extra,
      input_mode: mode,
    });

    return { kind: 'refused', reason };
  };

  if (m20Settling(s, nowMs)) {
    return refuse('settling', {
      since_ms: nowMs - (s.view_shown_at_ms ?? nowMs),
      settle_ms: M20_SETTLE_MS,
    });
  }

  if (m20IsHeld(channel)) {
    return refuse('held');
  }

  if (m20AsLoaded(channel.cells)) {
    return refuse('as_loaded');
  }

  if (m20SameCells(channel.last_executed, channel.cells)) {
    return refuse('repeat');
  }

  const cells = [...channel.cells];
  const differ = m20Differ(channel.id, channel.step, cells);
  const aligned = m20Aligned(channel.id, channel.step, cells);
  const attempt: M20Attempt = {
    index: channel.attempts.length + 1,
    step_index: channel.step,
    cells,
    differ,
    aligned,
    after_cue: afterCue,
    in_silent_window: silent,
    sequence: null,
    at_ms: nowMs,
  };
  let resumption: M20Resumption | null = null;
  const clocks: Record<string, unknown> = {};

  if (silent) {
    resumption = 'spontaneous';
    channel.release_to_spontaneous_wall_ms = Math.max(
      0,
      nowMs - (channel.released_at_ms ?? nowMs),
    );
    channel.release_to_spontaneous_focused_ms = Math.round(
      channel.spontaneous?.focusedMs(nowMs) ?? 0,
    );
    clocks.release_to_align_wall_ms = channel.release_to_spontaneous_wall_ms;
    clocks.release_to_align_focused_ms =
      channel.release_to_spontaneous_focused_ms;
  } else if (afterCue && channel.resumption === null) {
    resumption = 'cued';

    const stopped = cueClockStop(channel, nowMs);

    channel.cue_to_credit_wall_ms = stopped?.wall ?? null;
    channel.cue_to_credit_console_closed_ms = stopped?.closed ?? null;
    clocks.cue_to_align_wall_ms = channel.cue_to_credit_wall_ms;
    clocks.cue_to_align_console_closed_ms =
      channel.cue_to_credit_console_closed_ms;
  }

  const written = sink('align_attempt', {
    ...fields(s, channel, 'measurement'),
    step_index: attempt.step_index,
    attempt_index: attempt.index,
    cells: [...cells],
    differ,
    aligned,
    after_cue: afterCue,
    in_silent_window: silent,
    resumption,
    work_focused_ms: Math.round(channel.work.focusedMs(nowMs)),
    ...clocks,
    input_mode: mode,
  });

  attempt.sequence = typeof written === 'number' ? written : null;
  channel.attempts.push(attempt);
  channel.last_executed = [...cells];

  if (resumption !== null) {
    channel.resumption = resumption;
    channel.resumption_attempt_index = attempt.index;

    if (resumption === 'spontaneous') {
      stopSpontaneous(s, channel, nowMs);
    }
  }

  let channelAligned = false;

  if (aligned) {
    channel.steps_done += 1;
    sink('step_aligned', {
      ...fields(s, channel, 'measurement'),
      step_index: attempt.step_index,
      steps_done: channel.steps_done,
      attempt_index: attempt.index,
      input_mode: 'system',
    });

    if (channel.steps_done === M20_HOLD_AFTER_STEP) {
      // The system hold: immediately after the aligned second step, in the
      // same handler (decision D-U22-1 item 2).
      channel.held_at_ms = nowMs;
      sink('channel_held', {
        ...fields(s, channel, 'measurement'),
        held_at_ms: nowMs,
        steps_done: channel.steps_done,
        remaining_steps: M20_STEPS_PER_CHANNEL - channel.steps_done,
        input_mode: 'system',
      });
      // The next step is prepared (cells at their loading value) but shown
      // only by a CONTINUE once the channel is released.
      channel.step += 1;
      channel.step_shown = false;
      channel.cells = m20LoadingCells(channel.step);
      channel.last_executed = null;
      showView(s, 'held', channel.id, nowMs);
    } else if (channel.steps_done === M20_STEPS_PER_CHANNEL) {
      channel.aligned_at_ms = nowMs;
      channelAligned = true;
      stopWork(s, channel, nowMs);
      sink('channel_aligned', {
        ...fields(s, channel, 'measurement'),
        aligned_at_ms: nowMs,
        attempts: channel.attempts.length,
        input_mode: 'system',
      });
    }
  }

  if (resumption === 'spontaneous') {
    // The notice of a channel resumed in its silent window is never shown
    // (decision D-U22-1 item 12); descriptive.
    channel.cue_cancelled_at_ms = nowMs;
    sink('cue_cancelled', {
      ...fields(s, channel, 'cue'),
      reason: 'resumed_before_cue',
      cancelled_at_ms: nowMs,
      released_at_ms: channel.released_at_ms,
      attempt_index: attempt.index,
      input_mode: 'system',
    });
  }

  if (aligned && channel.steps_done !== M20_HOLD_AFTER_STEP) {
    if (channelAligned) {
      afterChannelAligned(s, nowMs, sink);
    } else {
      presentStep(s, channel, channel.step + 1, false, nowMs, sink);
    }
  }

  return {
    kind: 'executed',
    attempt,
    aligned,
    channel_aligned: channelAligned,
    resumption,
  };
}

/** After a channel's sixth step: the channel view; after both, the completion. */
function afterChannelAligned(s: M20Project, nowMs: number, sink: M20LogSink) {
  showView(s, 'channels', null, nowMs);

  if (s.channels.every((channel) => m20IsAligned(channel))) {
    stopClocks(s, nowMs);
    s.status = 'completed';
    s.closure_reason = 'completed';
    // The row is final here; the adapter completes the kit window right
    // after this event, so `window_closed` follows it.
    sink('project_completed', {
      ...fields(s, null, 'measurement'),
      closure_reason: 'completed',
      ...m20ClosureSnapshot(s, nowMs),
      input_mode: 'system',
    });
  }
}

/* ------------------------------------------------------------------ *
 * The release / due check and the notice
 * ------------------------------------------------------------------ */

export interface M20CueContext {
  /** A prompt, dialog, overlay, timed world action or input lock is active. */
  blocked: boolean;
  /** The environment's pause causes (`focus_loss`, `hidden`). */
  pause_causes: readonly string[];
  page_visible: boolean;
  page_focused: boolean;
  distance_to_console_px: number | null;
}

export interface M20CueCheckOutcome {
  released: M20ChannelId[];
  ended: M20ChannelId | null;
  presented: M20ChannelId | null;
}

/** Writes any due release (the adapter calls this at every check and opening). */
export function m20sWriteDueReleases(
  s: M20Project,
  nowMs: number,
  sink: M20LogSink,
  context: M20ReleaseContext,
): M20ChannelId[] {
  return writeDueReleases(s, nowMs, sink, context);
}

/** The notice is due and may be delivered for this channel (before the ordering rule). */
function cueDue(channel: M20ChannelState, nowMs: number): boolean {
  return (
    channel.released_at_ms !== null &&
    channel.cue === null &&
    channel.resumption === null &&
    !m20IsAligned(channel) &&
    nowMs >= channel.released_at_ms + M20_NOTICE_AFTER_RELEASE_MS
  );
}

/** A's notice is still to come (B must wait): A released, unresumed, unaligned, unnoticed. */
function aNoticePending(a: M20ChannelState): boolean {
  return (
    a.held_at_ms !== null &&
    a.resumption === null &&
    !m20IsAligned(a) &&
    a.cue === null
  );
}

/**
 * The release / due check (≤ 250 ms while the Workshop scene runs, and on
 * RESUME): writes any due release first; ends a notice whose 6 000 ms are
 * over (`timeout`); then delivers at most one due notice when the console
 * is closed, nothing blocks, the environment imposes no pause cause and the
 * ordering rule holds (A before B; B ≥ 8 000 ms after A's actual end, or A
 * will never get a notice; never while A's notice is due and undelivered).
 */
export function m20sCueCheck(
  s: M20Project,
  nowMs: number,
  context: M20CueContext,
  sink: M20LogSink,
  releaseContext: M20ReleaseContext = 'tick',
): M20CueCheckOutcome {
  const outcome: M20CueCheckOutcome = {
    released: writeDueReleases(s, nowMs, sink, releaseContext),
    ended: null,
    presented: null,
  };

  if (s.notice !== null) {
    const channel = m20ChannelOf(s, s.notice.channel_id);

    if (context.pause_causes.length > 0 && channel.cue !== null) {
      channel.cue.focus_lost_during_display = true;
    }

    if (nowMs >= s.notice.presented_at_ms + M20_NOTICE_MS) {
      outcome.ended = s.notice.channel_id;
      endNotice(s, 'timeout', nowMs, sink);
    }

    return outcome;
  }

  if (
    s.status !== 'work' ||
    s.console_open ||
    context.blocked ||
    context.pause_causes.length > 0 ||
    !context.page_visible ||
    !context.page_focused
  ) {
    return outcome;
  }

  const [a] = s.channels;

  for (const channel of s.channels) {
    if (!cueDue(channel, nowMs)) {
      continue;
    }

    if (channel.index === 2) {
      if (a.cue !== null) {
        if (
          a.cue.ended_at_ms === null ||
          nowMs < a.cue.ended_at_ms + M20_SPACING_MS
        ) {
          continue;
        }
      } else if (aNoticePending(a)) {
        continue;
      }
    }

    const dueAt = channel.released_at_ms! + M20_NOTICE_AFTER_RELEASE_MS;

    channel.cue = {
      presented_at_ms: nowMs,
      due_at_ms: dueAt,
      deferred_ms: Math.max(0, nowMs - dueAt),
      page_visible: context.page_visible,
      page_focused: context.page_focused,
      distance_to_console_px: context.distance_to_console_px,
      ended_at_ms: null,
      ended_reason: null,
      focus_lost_during_display: false,
    };
    channel.cue_clock = {
      started_at_ms: nowMs,
      console_open_since_ms: null,
      open_ms: 0,
      stopped_at_ms: null,
    };
    stopSpontaneous(s, channel, nowMs);
    s.notice = { channel_id: channel.id, presented_at_ms: nowMs };
    sink('cue_presented', {
      ...fields(s, channel, 'cue'),
      presented_at_ms: nowMs,
      held_at_ms: channel.held_at_ms,
      released_at_ms: channel.released_at_ms,
      due_at_ms: dueAt,
      deferred_ms: channel.cue.deferred_ms,
      page_visible: context.page_visible,
      page_focused: context.page_focused,
      distance_to_console_px: context.distance_to_console_px,
      remaining_steps: M20_STEPS_PER_CHANNEL - channel.steps_done,
      input_mode: 'system',
    });
    outcome.presented = channel.id;
    break;
  }

  return outcome;
}

/** The notice ends early (a surface or prompt opening, leaving the Workshop, closure). */
export function m20sEndCue(
  s: M20Project,
  reason: M20CueEndReason,
  nowMs: number,
  sink: M20LogSink,
): boolean {
  return endNotice(s, reason, nowMs, sink);
}

/** The two lines of the active notice (null without one). */
export function m20NoticeLines(s: M20Project): string[] | null {
  return s.notice === null
    ? null
    : [...M20_TEXT.cue(m20ChannelOf(s, s.notice.channel_id).letter)];
}

/* ------------------------------------------------------------------ *
 * Help
 * ------------------------------------------------------------------ */

/** HELP: informational; never work; never a resumption. */
export function m20sHelp(
  s: M20Project,
  mode: M20InputMode,
  nowMs: number,
  sink: M20LogSink,
): boolean {
  if (!m20Live(s) || s.help_open || m20Settling(s, nowMs)) {
    return false;
  }

  s.help_open = true;
  sink('help_consulted', {
    ...fields(s, s.view === 'step' ? m20Current(s) : null),
    view: m20HelpView(s),
    input_mode: mode,
  });
  s.view_shown_at_ms = nowMs;

  return true;
}

/** CLOSE HELP (H or the button): the view the help returns to settles again. */
export function m20sCloseHelp(
  s: M20Project,
  mode: M20InputMode,
  nowMs: number,
): boolean {
  void mode;

  if (!s.help_open || m20Settling(s, nowMs)) {
    return false;
  }

  s.help_open = false;
  s.view_shown_at_ms = nowMs;

  return true;
}

/* ------------------------------------------------------------------ *
 * Closures
 * ------------------------------------------------------------------ */

/** The sign-off: an opened, uncompleted project closes `shift_signed_off`. */
export function m20sCloseAtShiftEnd(
  s: M20Project,
  nowMs: number,
  sink: M20LogSink,
): boolean {
  return closeProject(s, 'shift_signed_off', nowMs, sink, 'shift_end');
}

/** The station-record review: an opened, uncompleted project closes `closed_at_review`. */
export function m20sCloseAtReview(
  s: M20Project,
  nowMs: number,
  sink: M20LogSink,
): boolean {
  return closeProject(s, 'closed_at_review', nowMs, sink, 'review');
}

/**
 * A presented, never-opened console closed by the sign-off or the review:
 * the project becomes the closed record (the adapter writes
 * `closed_unopened`), so a later opening shows it and writes nothing.
 */
export function m20sCloseUnopened(
  s: M20Project,
  reason: 'shift_signed_off' | 'closed_at_review',
): boolean {
  if (s.status !== 'unopened') {
    return false;
  }

  s.status = 'closed';
  s.closure_reason = reason;
  s.view = 'record';

  return true;
}

export type M20FailOutcome =
  | {
      kind: 'closed';
      channel_id: M20ChannelId | null;
      /** The result was already final (both channels resumed) before the fault. */
      result_final: boolean;
    }
  | { kind: 'after_closure' }
  | { kind: 'none' };

/**
 * A runtime fault. While the project can be worked it closes the project:
 * due releases are written, any active notice ends, earned credits and
 * spontaneous resumptions are kept (noticed channels without a credit are
 * excluded by the extractor); after completion or closure the fault is
 * recorded without touching the scored evidence.
 */
export function m20sFail(
  s: M20Project,
  detail: string,
  nowMs: number,
  sink: M20LogSink,
): M20FailOutcome {
  if (m20Live(s)) {
    const current = s.view === 'step' ? m20Current(s) : null;
    const resultFinal = m20ResultFinal(s);

    writeDueReleases(s, nowMs, sink, 'fault');
    endNotice(s, 'technical_failure', nowMs, sink);
    stopClocks(s, nowMs);
    s.help_open = false;
    s.status = 'technical_failure';
    s.closure_reason = 'technical_failure';
    s.failure_detail = detail;
    s.view = 'record';
    s.current = null;

    return {
      kind: 'closed',
      channel_id: current?.id ?? null,
      result_final: resultFinal,
    };
  }

  if (s.status === 'completed' || s.status === 'closed') {
    s.failure_detail = detail;
    s.help_open = false;

    return { kind: 'after_closure' };
  }

  return { kind: 'none' };
}

/** The reload hold-back: the console is never re-run in this page load. */
export function m20sHoldBack(s: M20Project): boolean {
  if (s.status !== 'unopened') {
    return false;
  }

  s.status = 'held_back';
  s.failure_detail = M20_RELOAD_DETAIL;
  s.view = 'record';

  return true;
}

/** True for a known channel id (the surface and the extractor share it). */
export function m20IsChannelId(value: unknown): value is M20ChannelId {
  return isM20ChannelId(value);
}

/** The M04 other-work signature: executed ALIGNs plus aligned steps. */
export function m20WorkSignature(s: M20Project): string {
  const attempts = s.channels.reduce(
    (sum, channel) => sum + channel.attempts.length,
    0,
  );
  const steps = s.channels.reduce(
    (sum, channel) => sum + channel.steps_done,
    0,
  );

  return `${attempts}|${steps}`;
}
