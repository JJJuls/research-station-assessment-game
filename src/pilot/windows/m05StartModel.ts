/**
 * M05 — Initiation: the accepted extra-job model (Station 080 M01–M26
 * run, Unit 6). PURE (no Phaser, no runtime import): the window adapter
 * (`m05Initiation.ts`) owns the two register windows and injects the log
 * sinks; the scenes and the job surface call the commands below with
 * their input mode.
 *
 * Approved design (register M05 row, "Redesign"): two EXPLICITLY ACCEPTED
 * jobs on different route legs (Vale's reading-desk lamp connector in the
 * Concourse, Noor's loose guy-line flag in the Recovery Yard); the clock
 * starts at a visible, usable start control with no competing required
 * task; the participant may start, explicitly defer, or exit; at most 60
 * FOCUSED seconds per occasion; focused time pauses during documented
 * loss of focus, explicit pauses and unusable controls, while reading,
 * deciding or waiting with the task usable remains observation time.
 *
 * Mechanic: the job is offered by the NPC's briefing chain (accept /
 * decline, both deliberate; a press inside the settle window after the
 * stage appears is refused and the stage re-presented). Acceptance opens
 * the occasion; the focused clock starts at the FIRST moment after
 * acceptance with no block — no prompt, no work surface, no world action,
 * no transition — and pauses (`unusable_controls` / `animation_lock`)
 * whenever a block returns; the browser focus monitor adds `focus_loss` /
 * `hidden`. The job site's station opens a work surface whose "Start the
 * job" control is the first work action (latency = focused ms from
 * eligibility to that press); "Not now" is an explicit deferral; leaving
 * the room (or the shift) is an exit; 60 focused seconds without a start
 * is a cap — a censoring signal, never a start. A start after any closure
 * is a LATE START (companion; the primary is never rewritten).
 *
 * Measure (register `m05_start_latency`): PER ACCEPTED OCCASION the
 * focused latency to the first work action plus its status
 * (started | deferred | exited | cap | interrupted); a declined job is
 * outside the set; a non-start keeps its exposure and reason. Nothing
 * here forms a mean, a score or a trait inference.
 */
import { FocusedClock, type PauseCause } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import { PILOT_SETTINGS } from '../../measurement/protocol';

export type M05Occasion = 'o1' | 'o2';

export const M05_OPPORTUNITY_IDS: Record<M05Occasion, string> = {
  o1: 'proto_m05_start_o1',
  o2: 'proto_m05_start_o2',
};
export const M05_WINDOW_IDS: Record<M05Occasion, string> = {
  o1: 'm05_start_o1',
  o2: 'm05_start_o2',
};
export const M05_FAMILY = 'proto_m05_start_';
export const M05_ENTRY_STATE_VERSION = 'm05-start-v1';

/** Focused observation cap per accepted occasion (pilot default). */
export const M05_START_CAP_MS = PILOT_SETTINGS.m05_start_cap_ms;
/** Standard focused work cycle once the job is started (identical for both jobs). */
export const M05_WORK_MS = 2_000;
/**
 * Settle window after a screen change (review U4 / U5 precedent): a press
 * arriving within it cannot be a read response to the new screen — it is
 * a carried or double-tapped press from the previous one. Such presses
 * are logged and refused; the screen stays as it is.
 */
export const M05_SETTLE_MS = 400;

/** Participant-facing job copy (operational; no study identifier). */
export const M05_JOBS: Record<
  M05Occasion,
  {
    scene: string;
    title: string;
    /** Imperative job line, lower case ("reseat the lamp connector"). */
    job: string;
    working: string;
    done: string;
    /** Station reading before acceptance (the object is in order as far as the participant knows). */
    idle: string;
  }
> = {
  o1: {
    scene: 'station_concourse',
    title: 'READING-DESK LAMP',
    job: 'reseat the lamp connector',
    working: 'Reseating the connector…',
    done: 'Connector reseated.',
    idle: 'Lamp steady.',
  },
  o2: {
    scene: 'exterior_recovery_yard',
    title: 'GUY-LINE FLAG',
    job: 're-tie the guy-line flag',
    working: 'Re-tying the flag…',
    done: 'Guy-line flag re-tied.',
    idle: 'Guy-line flag tied off.',
  },
};

/** How an accepted occasion closed — kept beside the latency, never merged. */
export type M05Status =
  /** The start control was pressed: the latency is observed. */
  | 'started'
  /** "Not now" pressed on the job surface: an explicit voluntary deferral. */
  | 'deferred'
  /** The room (or the shift) was left without a start. */
  | 'exited'
  /** 60 focused seconds passed without a start: censored, never a start. */
  | 'cap'
  /** A reload, a technical fault or the review closed the occasion. */
  | 'interrupted';

/** What blocks a usable start (a competing required task or a lock). */
export type M05Block = 'prompt' | 'host_paused' | 'world_action';

export type M05InputMode = 'pointer' | 'keyboard' | 'system';
export type M05LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export interface M05LateStart {
  after: M05Status;
  at_ms: number;
  /** Wall ms from the occasion's closure to the late start. */
  since_closure_ms: number | null;
  input_mode: M05InputMode;
  work_completed: boolean;
}

export interface M05State {
  occasion: M05Occasion;
  offer_presentations: number;
  first_offered_at_ms: number | null;
  /** Wall time of the most recent presentation (the settle reference). */
  last_offered_at_ms: number | null;
  offer_refused_presses: number;
  accepted: boolean | null;
  answered_at_ms: number | null;
  answer_option_position: number | null;
  /** Wall ms from the LAST presentation to the recorded answer. */
  offer_latency_ms: number | null;
  /** Wall time the start control first became usable (the clock start). */
  eligible_at_ms: number | null;
  /** Focused clock from eligibility to the first work action (null before / after). */
  clock: FocusedClock | null;
  blocks: Set<M05Block>;
  /** Times the job surface (the start control) was opened before the decision. */
  control_views: number;
  first_control_view_focused_ms: number | null;
  first_control_view_wall_ms: number | null;
  last_control_view_at_ms: number | null;
  own_surface_open: boolean;
  /** Presses on the surface refused inside its settle window. */
  refused_presses: number;
  status: M05Status | null;
  interruption_kind: 'reload' | 'review' | 'technical' | null;
  closed_at_ms: number | null;
  started_at_ms: number | null;
  start_input_mode: M05InputMode | null;
  latency_focused_ms: number | null;
  latency_wall_ms: number | null;
  /** Focused / wall exposure of the usable start control up to the closure. */
  exposure_focused_ms: number | null;
  exposure_wall_ms: number | null;
  excluded_ms: Record<PauseCause, number> | null;
  excluded_total_ms: number | null;
  /** Clock of the standard work cycle once started (paused by a closed surface). */
  workClock: FocusedClock | null;
  work_completed_at_ms: number | null;
  work_focused_ms: number | null;
  work_wall_ms: number | null;
  late_start: M05LateStart | null;
  /** Register closure reason of the occasion (null while open). */
  closureReason: string | null;
  /** Participant distance to the job site when the clock started (px). */
  distance_px_at_eligibility: number | null;
}

export function createM05State(occasion: M05Occasion): M05State {
  return {
    occasion,
    offer_presentations: 0,
    first_offered_at_ms: null,
    last_offered_at_ms: null,
    offer_refused_presses: 0,
    accepted: null,
    answered_at_ms: null,
    answer_option_position: null,
    offer_latency_ms: null,
    eligible_at_ms: null,
    clock: null,
    blocks: new Set(),
    control_views: 0,
    first_control_view_focused_ms: null,
    first_control_view_wall_ms: null,
    last_control_view_at_ms: null,
    own_surface_open: false,
    refused_presses: 0,
    status: null,
    interruption_kind: null,
    closed_at_ms: null,
    started_at_ms: null,
    start_input_mode: null,
    latency_focused_ms: null,
    latency_wall_ms: null,
    exposure_focused_ms: null,
    exposure_wall_ms: null,
    excluded_ms: null,
    excluded_total_ms: null,
    workClock: null,
    work_completed_at_ms: null,
    work_focused_ms: null,
    work_wall_ms: null,
    late_start: null,
    closureReason: null,
    distance_px_at_eligibility: null,
  };
}

// ——— derived readers ————————————————————————————————————————————————

export function m05Offered(s: M05State): boolean {
  return s.first_offered_at_ms !== null;
}

export function m05Accepted(s: M05State): boolean {
  return s.accepted === true;
}

/** Accepted, not yet closed (the observation is live). */
export function m05Open(s: M05State): boolean {
  return s.accepted === true && s.status === null;
}

/** The start control is usable right now (clock running and unpaused). */
export function m05Eligible(s: M05State): boolean {
  return m05Open(s) && s.clock !== null && !s.clock.isPaused();
}

export function m05Started(s: M05State): boolean {
  return s.status === 'started';
}

export function m05WorkRunning(s: M05State): boolean {
  return s.workClock !== null && s.workClock.isRunning();
}

export function m05WorkDone(s: M05State): boolean {
  return s.work_completed_at_ms !== null;
}

/** Focused ms since eligibility (frozen at closure; null before eligibility). */
export function m05FocusedMs(s: M05State, nowMs: number): number | null {
  return s.clock === null ? null : s.clock.focusedMs(nowMs);
}

/** Focused ms of the running work cycle (null when none runs). */
export function m05WorkElapsedMs(s: M05State, nowMs: number): number | null {
  return s.workClock === null ? null : s.workClock.focusedMs(nowMs);
}

/**
 * Reload guard (register §5.14): true when an earlier page load of this
 * identity already opened this occasion (accepted OR declined — both open
 * the window). The job is then never re-offered: a reload never creates
 * a fresh start opportunity.
 */
export function m05PriorAdministration(
  priorLoadEvents: readonly {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[],
  occasion: M05Occasion,
): boolean {
  return priorLoadEvents.some(
    (event) =>
      event.event_type === `${M05_FAMILY}opportunity_opened` &&
      event.metadata?.occasion === occasion,
  );
}

export function m05EntrySnapshot(occasion: M05Occasion) {
  return {
    occasion,
    acceptance: 'explicit',
    start_cap_ms: M05_START_CAP_MS,
    work_ms: M05_WORK_MS,
    settle_ms: M05_SETTLE_MS,
    deferral_control: true,
    countdown_shown: false,
    payment_fixed: true,
    route_fixed: true,
  };
}

// ——— offer ————————————————————————————————————————————————————————————

/** The offer stage was presented (every presentation counted; the first timed). */
export function m05Present(s: M05State, nowMs: number, log: M05LogSink) {
  if (s.accepted !== null) {
    return false;
  }

  s.offer_presentations += 1;
  s.last_offered_at_ms = nowMs;

  if (s.first_offered_at_ms === null) {
    s.first_offered_at_ms = nowMs;
  } else {
    log('offer_represented', {
      presentation: s.offer_presentations,
      refused_presses: s.offer_refused_presses,
      input_mode: 'system',
    });
  }

  return true;
}

export type M05AnswerResult = 'accepted' | 'declined' | 'refused' | 'invalid';

/**
 * The FIRST read answer is recorded. A press inside the settle window
 * after the (last) presentation is a carried or double-tapped press from
 * the preceding acknowledgement, never a read response: logged with its
 * position, refused, and the caller re-presents the stage.
 */
export function m05Answer(
  s: M05State,
  accepted: boolean,
  optionPosition: number,
  nowMs: number,
  inputMode: M05InputMode,
  log: M05LogSink,
): M05AnswerResult {
  if (s.accepted !== null || s.last_offered_at_ms === null) {
    return 'invalid';
  }

  const latency = Math.max(0, nowMs - s.last_offered_at_ms);

  if (latency < M05_SETTLE_MS) {
    s.offer_refused_presses += 1;
    log('offer_press_refused', {
      option_position: optionPosition,
      would_accept: accepted,
      since_presented_ms: latency,
      settle_ms: M05_SETTLE_MS,
      presentation: s.offer_presentations,
      refused_presses: s.offer_refused_presses,
      input_mode: inputMode,
    });

    return 'refused';
  }

  s.accepted = accepted;
  s.answered_at_ms = nowMs;
  s.answer_option_position = optionPosition;
  s.offer_latency_ms = latency;

  if (!accepted) {
    s.closureReason = 'declined';
    s.closed_at_ms = nowMs;
  }

  log('offer_answered', {
    accepted,
    option_position: optionPosition,
    option_count: 2,
    focus_default_position: 1,
    offer_latency_ms: latency,
    presentations: s.offer_presentations,
    refused_presses: s.offer_refused_presses,
    input_mode: inputMode,
  });

  return accepted ? 'accepted' : 'declined';
}

// ——— eligibility and the focused clock ————————————————————————————————

const BLOCK_CAUSE: Record<M05Block, PauseCause> = {
  prompt: 'unusable_controls',
  host_paused: 'unusable_controls',
  world_action: 'animation_lock',
};

/** The two causes this model manages (the focus monitor owns the rest). */
const MANAGED_CAUSES: readonly PauseCause[] = [
  'unusable_controls',
  'animation_lock',
];

function applyBlocks(s: M05State, nowMs: number) {
  if (s.clock === null || !s.clock.isRunning()) {
    return;
  }

  const wanted = new Set<PauseCause>();

  for (const block of s.blocks) {
    wanted.add(BLOCK_CAUSE[block]);
  }

  const active = new Set(s.clock.activeCauses());

  for (const cause of MANAGED_CAUSES) {
    if (wanted.has(cause) && !active.has(cause)) {
      s.clock.pause(cause, nowMs);
    } else if (!wanted.has(cause) && active.has(cause)) {
      s.clock.resume(cause, nowMs);
    }
  }
}

/**
 * A competing required task (a prompt, a paused host under another
 * surface or overlay) or a lock (a timed world action) blocks a usable
 * start: before eligibility it holds the clock unstarted; after it, it
 * pauses focused time under the matching cause. The job's own surface is
 * never a block (the start control is usable there).
 */
export function m05SetBlock(
  s: M05State,
  block: M05Block,
  active: boolean,
  nowMs: number,
) {
  if (block === 'host_paused' && active && s.own_surface_open) {
    return;
  }

  if (active) {
    s.blocks.add(block);
  } else {
    s.blocks.delete(block);
  }

  applyBlocks(s, nowMs);
}

/**
 * Per-frame poll. Starts the clock at the first unblocked moment after
 * acceptance (the start control became visible and usable) and closes
 * the occasion as `cap` once 60 focused seconds passed without a start.
 * A cap is a censoring signal, never an action.
 */
export function m05Poll(
  s: M05State,
  nowMs: number,
  log: M05LogSink,
  distancePx: number | null = null,
): 'none' | 'eligible' | 'cap' {
  if (!m05Open(s)) {
    return 'none';
  }

  if (s.clock === null) {
    if (s.blocks.size > 0) {
      return 'none';
    }

    const clock = new FocusedClock();

    clock.start(nowMs);
    registerFocusedClock(clock);
    s.clock = clock;
    s.eligible_at_ms = nowMs;
    s.distance_px_at_eligibility = distancePx;
    log('eligible', {
      wait_before_eligible_ms:
        s.answered_at_ms === null
          ? null
          : Math.max(0, nowMs - s.answered_at_ms),
      start_cap_ms: M05_START_CAP_MS,
      distance_px: distancePx,
      environment_paused: clock.isPaused(),
      input_mode: 'system',
    });

    return 'eligible';
  }

  return closeAtCapIfDue(s, nowMs, log) ? 'cap' : 'none';
}

/** True once the open occasion's focused clock has reached the cap. */
export function m05CapDue(s: M05State, nowMs: number): boolean {
  return (
    m05Open(s) &&
    s.clock !== null &&
    s.clock.capReached(nowMs, M05_START_CAP_MS)
  );
}

/**
 * The cap: a censoring signal, never an action. Checked by the per-frame
 * poll, by the job surface's own tick and by every press on the surface
 * (review U6 S-F1: the host is paused under the job's own surface, so the
 * poll alone could let a start or a deferral past the cap through).
 */
function closeAtCapIfDue(s: M05State, nowMs: number, log: M05LogSink): boolean {
  if (!m05CapDue(s, nowMs)) {
    return false;
  }

  freezeExposure(s, nowMs);
  s.status = 'cap';
  s.closureReason = 'cap';
  s.closed_at_ms = nowMs;
  log('cap_reached', {
    start_cap_ms: M05_START_CAP_MS,
    focused_ms: s.exposure_focused_ms,
    wall_ms: s.exposure_wall_ms,
    excluded_ms: s.excluded_ms,
    control_views: s.control_views,
    surface_open: s.own_surface_open,
    input_mode: 'system',
  });

  return true;
}

/** Fixed presentation of the two decision controls (documented in the data). */
export const M05_CONTROL_ORDER = ['start', 'defer'] as const;
export const M05_FOCUS_DEFAULT = 'start';

/** Stops the eligibility clock and records the exposure it measured. */
function freezeExposure(s: M05State, nowMs: number) {
  if (s.clock === null) {
    return;
  }

  s.clock.stop(nowMs);
  releaseFocusedClock(s.clock);

  const snap = s.clock.snapshot(nowMs);

  s.exposure_focused_ms = snap.focused_ms;
  s.exposure_wall_ms = snap.wall_ms;
  s.excluded_ms = snap.excluded_ms;
  s.excluded_total_ms = snap.excluded_total_ms;
}

// ——— the job surface (start control) ————————————————————————————————

/** The job surface opened: the start control is in view. */
export function m05ControlPresented(
  s: M05State,
  nowMs: number,
  log: M05LogSink,
) {
  s.own_surface_open = true;
  // The job's own surface pauses the host, which is never a block here.
  s.blocks.delete('host_paused');
  applyBlocks(s, nowMs);
  s.last_control_view_at_ms = nowMs;

  if (s.status === null) {
    s.control_views += 1;

    if (s.first_control_view_focused_ms === null && s.clock !== null) {
      s.first_control_view_focused_ms = s.clock.focusedMs(nowMs);
      s.first_control_view_wall_ms = s.clock.wallMs(nowMs);
    }
  }

  log('control_presented', {
    view: s.control_views,
    focused_ms: m05FocusedMs(s, nowMs),
    status: s.status,
    work_running: m05WorkRunning(s),
    control_order: s.status === null ? [...M05_CONTROL_ORDER] : ['start'],
    focus_default: M05_FOCUS_DEFAULT,
    input_mode: 'system',
  });
}

/** The job surface was closed (ESC / Leave): a running work cycle pauses. */
export function m05SurfaceClosed(s: M05State, nowMs: number, log: M05LogSink) {
  s.own_surface_open = false;
  s.workClock?.pause('surface_closed', nowMs);
  log('surface_closed', {
    status: s.status,
    work_running: m05WorkRunning(s),
    input_mode: 'system',
  });
}

/** The job surface reopened: a paused work cycle resumes. */
export function m05SurfaceReopened(
  s: M05State,
  nowMs: number,
  log: M05LogSink,
) {
  s.own_surface_open = true;
  s.workClock?.resume('surface_closed', nowMs);
  log('surface_reopened', {
    status: s.status,
    work_running: m05WorkRunning(s),
    input_mode: 'system',
  });
}

function settling(
  s: M05State,
  nowMs: number,
  control: 'start' | 'defer',
  inputMode: M05InputMode,
  log: M05LogSink,
): boolean {
  const since =
    s.last_control_view_at_ms === null
      ? null
      : nowMs - s.last_control_view_at_ms;

  if (since === null || since >= M05_SETTLE_MS) {
    return false;
  }

  s.refused_presses += 1;
  log('press_refused', {
    control,
    reason: 'surface_settling',
    since_presented_ms: since,
    settle_ms: M05_SETTLE_MS,
    refused_presses: s.refused_presses,
    input_mode: inputMode,
  });

  return true;
}

function beginWork(s: M05State, nowMs: number) {
  const clock = new FocusedClock();

  clock.start(nowMs);
  registerFocusedClock(clock);
  s.workClock = clock;
}

export type M05StartResult = 'started' | 'late' | 'refused' | 'invalid';

/**
 * "Start the job": the FIRST WORK ACTION. Before any closure it records
 * the latency and closes the eligibility clock; after a deferral, an exit
 * or the cap it is a LATE START (companion only — the primary keeps its
 * status). Refused inside the settle window and while work already runs.
 */
export function m05Start(
  s: M05State,
  nowMs: number,
  inputMode: M05InputMode,
  log: M05LogSink,
): M05StartResult {
  if (s.accepted !== true || m05WorkRunning(s) || m05WorkDone(s)) {
    return 'invalid';
  }

  if (s.late_start !== null) {
    return 'invalid';
  }

  if (settling(s, nowMs, 'start', inputMode, log)) {
    return 'refused';
  }

  // A press at or after the cap is a late start, never an observed start.
  closeAtCapIfDue(s, nowMs, log);

  if (s.status === null) {
    if (s.clock === null) {
      // Not yet eligible (a block still holds the clock unstarted).
      return 'invalid';
    }

    freezeExposure(s, nowMs);
    s.status = 'started';
    s.started_at_ms = nowMs;
    s.start_input_mode = inputMode;
    s.latency_focused_ms = s.exposure_focused_ms;
    s.latency_wall_ms = s.exposure_wall_ms;
    beginWork(s, nowMs);
    log('started', {
      latency_focused_ms: s.latency_focused_ms,
      latency_wall_ms: s.latency_wall_ms,
      excluded_ms: s.excluded_ms,
      excluded_total_ms: s.excluded_total_ms,
      control_views: s.control_views,
      first_control_view_focused_ms: s.first_control_view_focused_ms,
      control_order: [...M05_CONTROL_ORDER],
      focus_default: M05_FOCUS_DEFAULT,
      work_ms: M05_WORK_MS,
      phase: 'measurement',
      input_mode: inputMode,
    });

    return 'started';
  }

  s.late_start = {
    after: s.status,
    at_ms: nowMs,
    since_closure_ms:
      s.closed_at_ms === null ? null : Math.max(0, nowMs - s.closed_at_ms),
    input_mode: inputMode,
    work_completed: false,
  };
  beginWork(s, nowMs);
  log('late_start', {
    after: s.status,
    since_closure_ms: s.late_start.since_closure_ms,
    work_ms: M05_WORK_MS,
    input_mode: inputMode,
  });

  return 'late';
}

export type M05DeferResult = 'deferred' | 'refused' | 'invalid';

/** "Not now": the explicit voluntary deferral (closes the occasion). */
export function m05Defer(
  s: M05State,
  nowMs: number,
  inputMode: M05InputMode,
  log: M05LogSink,
): M05DeferResult {
  if (!m05Open(s) || s.clock === null) {
    return 'invalid';
  }

  if (settling(s, nowMs, 'defer', inputMode, log)) {
    return 'refused';
  }

  // A deferral at or after the cap is the cap's closure, not a deferral.
  if (closeAtCapIfDue(s, nowMs, log)) {
    return 'invalid';
  }

  freezeExposure(s, nowMs);
  s.status = 'deferred';
  s.closureReason = 'voluntary_stop';
  s.closed_at_ms = nowMs;
  log('deferred', {
    focused_ms: s.exposure_focused_ms,
    wall_ms: s.exposure_wall_ms,
    excluded_ms: s.excluded_ms,
    control_views: s.control_views,
    control_order: [...M05_CONTROL_ORDER],
    focus_default: M05_FOCUS_DEFAULT,
    input_mode: inputMode,
  });

  return 'deferred';
}

/** Surface tick: completes the standard work cycle on focused time. */
export function m05WorkTick(
  s: M05State,
  nowMs: number,
  log: M05LogSink,
): 'none' | 'work_completed' {
  if (
    s.workClock === null ||
    !s.workClock.isRunning() ||
    !s.workClock.capReached(nowMs, M05_WORK_MS)
  ) {
    return 'none';
  }

  s.workClock.stop(nowMs);
  releaseFocusedClock(s.workClock);
  s.work_completed_at_ms = nowMs;
  s.work_focused_ms = s.workClock.focusedMs(nowMs);
  s.work_wall_ms = s.workClock.wallMs(nowMs);

  const late = s.late_start !== null;

  if (s.late_start !== null) {
    s.late_start.work_completed = true;
  }

  if (!late) {
    s.closureReason = 'completed';
    s.closed_at_ms = nowMs;
  }

  log('work_completed', {
    late,
    work_focused_ms: s.work_focused_ms,
    work_wall_ms: s.work_wall_ms,
    input_mode: 'system',
  });

  return 'work_completed';
}

// ——— closures ————————————————————————————————————————————————————————

/**
 * The room (or the shift) was left. An open, unstarted occasion closes as
 * `exited`; a started occasion keeps its latency and records whether the
 * work cycle finished. Returns true when this call closed the occasion.
 */
export function m05Exit(
  s: M05State,
  nowMs: number,
  log: M05LogSink,
  detail: 'room_left' | 'shift_ended' = 'room_left',
): boolean {
  if (s.accepted !== true || s.closureReason !== null) {
    return false;
  }

  if (m05WorkRunning(s) && s.workClock !== null) {
    s.workClock.stop(nowMs);
    releaseFocusedClock(s.workClock);
    s.work_focused_ms = s.workClock.focusedMs(nowMs);
    s.work_wall_ms = s.workClock.wallMs(nowMs);
  }

  if (s.status === null) {
    freezeExposure(s, nowMs);
    s.status = 'exited';
    log('exited', {
      detail,
      focused_ms: s.exposure_focused_ms,
      wall_ms: s.exposure_wall_ms,
      excluded_ms: s.excluded_ms,
      eligible: s.eligible_at_ms !== null,
      control_views: s.control_views,
      input_mode: 'system',
    });
  }

  s.closureReason = 'route_departure';
  s.closed_at_ms = nowMs;

  return true;
}

/**
 * Freezes every clock without completing anything (the review, a reload,
 * a technical fault or a reset). An open occasion becomes `interrupted`.
 */
export function m05Freeze(
  s: M05State,
  nowMs: number,
  closureReason: string,
  kind: 'reload' | 'review' | 'technical' | null,
) {
  if (s.workClock !== null && s.workClock.isRunning()) {
    s.workClock.stop(nowMs);
    releaseFocusedClock(s.workClock);
    s.work_focused_ms = s.workClock.focusedMs(nowMs);
    s.work_wall_ms = s.workClock.wallMs(nowMs);
  }

  if (s.status === null) {
    if (s.clock !== null) {
      freezeExposure(s, nowMs);
    }

    if (s.accepted === true || kind === 'reload') {
      s.status = 'interrupted';
      s.interruption_kind = kind ?? 'technical';
    }
  }

  if (s.closureReason === null) {
    s.closureReason = closureReason;
    s.closed_at_ms = nowMs;
  }
}

/** Item-owned raw components (state description — never a score). */
export function m05RawComponents(
  s: M05State,
  closureReason: string,
  nowMs: number,
) {
  const focused = s.exposure_focused_ms ?? m05FocusedMs(s, nowMs);
  const wall =
    s.exposure_wall_ms ?? (s.clock === null ? null : s.clock.wallMs(nowMs));

  return {
    occasion: s.occasion,
    offered: m05Offered(s),
    offer_presentations: s.offer_presentations,
    offer_refused_presses: s.offer_refused_presses,
    accepted: s.accepted,
    answer_option_position: s.answer_option_position,
    offer_latency_ms: s.offer_latency_ms,
    eligible: s.eligible_at_ms !== null,
    wait_before_eligible_ms:
      s.eligible_at_ms === null || s.answered_at_ms === null
        ? null
        : Math.max(0, s.eligible_at_ms - s.answered_at_ms),
    distance_px_at_eligibility: s.distance_px_at_eligibility,
    status: s.status,
    interruption_kind: s.interruption_kind,
    latency_focused_ms: s.latency_focused_ms,
    latency_wall_ms: s.latency_wall_ms,
    exposure_focused_ms: focused,
    exposure_wall_ms: wall,
    excluded_ms: s.excluded_ms,
    excluded_total_ms: s.excluded_total_ms,
    start_cap_ms: M05_START_CAP_MS,
    cap_reached: s.status === 'cap',
    control_views: s.control_views,
    first_control_view_focused_ms: s.first_control_view_focused_ms,
    first_control_view_wall_ms: s.first_control_view_wall_ms,
    refused_presses: s.refused_presses,
    start_input_mode: s.start_input_mode,
    control_order: [...M05_CONTROL_ORDER],
    focus_default: M05_FOCUS_DEFAULT,
    work_ms: M05_WORK_MS,
    work_completed: s.late_start === null && m05WorkDone(s),
    work_focused_ms: s.work_focused_ms,
    work_wall_ms: s.work_wall_ms,
    late_start: s.late_start === null ? null : { ...s.late_start },
    closure_reason: closureReason,
  };
}
