/**
 * M05 — window adapter of the two accepted extra jobs (Station 080
 * M01–M26 run, Unit 6). Owns the two register windows (Vale's reading-desk
 * lamp connector in the Concourse, episode 1; Noor's loose guy-line flag
 * in the Recovery Yard, episode 4) and the session-scope model state;
 * every command delegates to the pure model (`m05StartModel.ts`) and logs
 * through the windows' `proto_m05_start_*` family with the protocol stamp.
 *
 * Closure rules: a decline opens and completes the window outside the
 * denominator (M11 precedent); acceptance opens it; the clock starts at
 * the first unblocked moment (scene poll) and the cap, a deferral, an
 * exit (room left / shift ended) or a start close it with distinct
 * statuses; the review censors an open occasion and marks a never-offered
 * one absent; a job accepted or declined in an earlier page load is never
 * re-offered (reload guard). The v2 silent-fault family
 * (`proto_m05_initiation_*`) keeps its v2 meaning in the frozen ledger and
 * is no longer on the route.
 */
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import {
  createM05State,
  M05_ENTRY_STATE_VERSION,
  M05_FAMILY,
  M05_JOBS,
  M05_OPPORTUNITY_IDS,
  M05_WINDOW_IDS,
  m05Accepted,
  m05Answer,
  type M05AnswerResult,
  m05ControlPresented,
  m05Defer,
  type M05DeferResult,
  m05EntrySnapshot,
  m05Exit,
  m05Freeze,
  type M05LogSink,
  type M05Occasion,
  m05Open,
  m05Poll,
  m05Present,
  m05PriorAdministration,
  m05RawComponents,
  m05SetBlock,
  m05Start,
  type M05StartResult,
  type M05State,
  m05SurfaceClosed,
  m05SurfaceReopened,
  m05WorkTick,
} from './m05StartModel';
import { type InputMode, ItemWindow } from './windowKit';

export {
  M05_FAMILY,
  M05_JOBS,
  M05_OPPORTUNITY_IDS,
  M05_SETTLE_MS,
  M05_START_CAP_MS,
  M05_WINDOW_IDS,
  M05_WORK_MS,
  type M05Occasion,
} from './m05StartModel';

export const M05_PRIOR_ADMINISTRATION = 'prior_administration';

const OCCASIONS: readonly M05Occasion[] = ['o1', 'o2'];

const states: Record<M05Occasion, M05State> = {
  o1: createM05State('o1'),
  o2: createM05State('o2'),
};

export const m05Windows: Record<M05Occasion, ItemWindow> = {
  o1: new ItemWindow({
    item: 'M05',
    opportunityId: M05_OPPORTUNITY_IDS.o1,
    windowId: M05_WINDOW_IDS.o1,
    entryStateVersion: M05_ENTRY_STATE_VERSION,
    family: M05_FAMILY,
    scene: M05_JOBS.o1.scene,
    objectId: 'm05_reading_desk_lamp',
    occasion: 'o1',
  }),
  o2: new ItemWindow({
    item: 'M05',
    opportunityId: M05_OPPORTUNITY_IDS.o2,
    windowId: M05_WINDOW_IDS.o2,
    entryStateVersion: M05_ENTRY_STATE_VERSION,
    family: M05_FAMILY,
    scene: M05_JOBS.o2.scene,
    objectId: 'm05_guy_line_flag',
    occasion: 'o2',
  }),
};

const sinkFor =
  (occasion: M05Occasion): M05LogSink =>
  (suffix, metadata) => {
    m05Windows[occasion].log(suffix, { ...protocolStamp(), ...metadata });
  };

export function declareM05(occasion: M05Occasion) {
  m05Windows[occasion].declare();
}

export function m05State(occasion: M05Occasion): Readonly<M05State> {
  return states[occasion];
}

export function m05Window(occasion: M05Occasion): ItemWindow {
  return m05Windows[occasion];
}

/** True when the occasion was administered in an earlier page load. */
export function m05AdministeredBefore(occasion: M05Occasion): boolean {
  return states[occasion].closureReason === M05_PRIOR_ADMINISTRATION;
}

/**
 * Reload guard, run at zone entry: an occasion opened in an earlier page
 * load of this identity is never re-offered — prior exposure recorded,
 * the opportunity technically incomplete, features `interrupted`.
 */
export function guardM05Reload(occasion: M05Occasion, nowMs: number) {
  const w = m05Windows[occasion];

  if (w.windowStatus() !== 'unopened' || states[occasion].accepted !== null) {
    return false;
  }

  if (
    !m05PriorAdministration(researchRuntime.getPriorPageLoadEvents(), occasion)
  ) {
    return false;
  }

  m05Freeze(states[occasion], nowMs, M05_PRIOR_ADMINISTRATION, 'reload');
  w.recordPriorExposure(
    `${M05_JOBS[occasion].title.toLowerCase()} job answered in an earlier page load of this identity`,
  );
  w.technicalFailure('reload after administration: job not re-offered');

  return true;
}

/** The offer stage may be shown: not yet answered, not held back. */
export function m05OfferAvailable(occasion: M05Occasion): boolean {
  return (
    states[occasion].accepted === null &&
    !m05Windows[occasion].isClosed() &&
    states[occasion].closureReason === null
  );
}

/** The NPC presents the offer stage (the window's `presented` once; re-presentations logged). */
export function presentM05Offer(occasion: M05Occasion, nowMs: number) {
  if (!m05OfferAvailable(occasion)) {
    return false;
  }

  declareM05(occasion);
  m05Windows[occasion].present(nowMs, m05EntrySnapshot(occasion));

  return m05Present(states[occasion], nowMs, sinkFor(occasion));
}

/**
 * Accept or decline (both deliberate). Acceptance opens the occasion; a
 * decline is a completed observation outside the denominator; a press
 * inside the settle window is refused (the caller re-presents).
 */
export function answerM05Offer(
  occasion: M05Occasion,
  accepted: boolean,
  optionPosition: number,
  nowMs: number,
  inputMode: InputMode,
  /**
   * Entry-state covariates the host scene knows at the answer (review U6
   * S-F3): the other offers answered before this one and any obligation
   * carried into the window — recorded in the entry snapshot, never used
   * by the extractor.
   */
  entryState: Record<string, unknown> = {},
): M05AnswerResult {
  const s = states[occasion];
  const w = m05Windows[occasion];

  if (!m05OfferAvailable(occasion)) {
    return 'invalid';
  }

  const result = m05Answer(
    s,
    accepted,
    optionPosition,
    nowMs,
    inputMode,
    sinkFor(occasion),
  );

  if (result === 'accepted') {
    w.setComprehension('not_required');
    w.open(nowMs, {
      ...m05EntrySnapshot(occasion),
      ...entryState,
      accepted: true,
    });
  } else if (result === 'declined') {
    w.setComprehension('not_required');
    w.open(nowMs, {
      ...m05EntrySnapshot(occasion),
      ...entryState,
      accepted: false,
    });
    w.complete(nowMs, m05RawComponents(s, 'declined', nowMs), inputMode, {
      exitState: 'stopped',
    });
  }

  return result;
}

// ——— eligibility (scene poll and host lifecycle) ——————————————————————

/**
 * Per-frame poll from the host scene. `prompt` = a prompt panel, a
 * typewriter or a transition holds the room; `worldAction` = a timed
 * world action runs. The cap completes the window as a censored
 * non-start (never a start).
 */
export function pollM05(
  occasion: M05Occasion,
  nowMs: number,
  blocks: { prompt: boolean; worldAction: boolean },
  distancePx: number | null = null,
): 'none' | 'eligible' | 'cap' {
  const s = states[occasion];

  if (!m05Open(s)) {
    return 'none';
  }

  m05SetBlock(s, 'prompt', blocks.prompt, nowMs);
  m05SetBlock(s, 'world_action', blocks.worldAction, nowMs);

  const result = m05Poll(s, nowMs, sinkFor(occasion), distancePx);

  if (result === 'cap') {
    m05Windows[occasion].complete(
      nowMs,
      m05RawComponents(s, 'cap', nowMs),
      'system',
      { exitState: 'stopped' },
    );
  }

  return result;
}

/** The host scene was paused under another surface or overlay. */
export function m05HostPaused(occasion: M05Occasion, nowMs: number) {
  m05SetBlock(states[occasion], 'host_paused', true, nowMs);
}

/** The host scene resumed. */
export function m05HostResumed(occasion: M05Occasion, nowMs: number) {
  m05SetBlock(states[occasion], 'host_paused', false, nowMs);
}

// ——— the job surface ————————————————————————————————————————————————

export type M05ControlResult = 'not_accepted' | 'presented' | 'reopened';

/**
 * The job site's station was used. Before acceptance (or after a
 * decline) the object simply reads as in order; otherwise the job surface
 * opens — a first view logs the control presentation, a reopen resumes a
 * paused work cycle.
 */
export function openM05Control(
  occasion: M05Occasion,
  nowMs: number,
): M05ControlResult {
  const s = states[occasion];

  if (!m05Accepted(s)) {
    return 'not_accepted';
  }

  if (s.workClock !== null && s.workClock.isRunning()) {
    m05SurfaceReopened(s, nowMs, sinkFor(occasion));

    return 'reopened';
  }

  m05ControlPresented(s, nowMs, sinkFor(occasion));

  return 'presented';
}

/** ESC or the Leave button: one path; a running work cycle pauses. */
export function closeM05Surface(occasion: M05Occasion, nowMs: number) {
  const s = states[occasion];

  if (!m05Accepted(s)) {
    return;
  }

  m05SurfaceClosed(s, nowMs, sinkFor(occasion));
}

/**
 * The model closed the occasion at the cap during a press or a surface
 * tick: the window completes as the censored non-start (review U6 S-F1).
 */
function completeAtCap(occasion: M05Occasion, nowMs: number) {
  const s = states[occasion];
  const w = m05Windows[occasion];

  if (s.status === 'cap' && w.isOpen()) {
    w.complete(nowMs, m05RawComponents(s, 'cap', nowMs), 'system', {
      exitState: 'stopped',
    });
  }
}

/** "Start the job" — the first work action, or a late start after a closure. */
export function startM05(
  occasion: M05Occasion,
  nowMs: number,
  inputMode: InputMode,
): M05StartResult {
  const result = m05Start(
    states[occasion],
    nowMs,
    inputMode,
    sinkFor(occasion),
  );

  completeAtCap(occasion, nowMs);

  return result;
}

/** "Not now" — the explicit deferral closes the occasion. */
export function deferM05(
  occasion: M05Occasion,
  nowMs: number,
  inputMode: InputMode,
): M05DeferResult {
  const s = states[occasion];
  const result = m05Defer(s, nowMs, inputMode, sinkFor(occasion));

  if (result === 'deferred') {
    m05Windows[occasion].complete(
      nowMs,
      m05RawComponents(s, 'voluntary_stop', nowMs),
      inputMode,
      { exitState: 'stopped' },
    );
  }

  completeAtCap(occasion, nowMs);

  return result;
}

/** Surface tick; a finished work cycle completes a started window. */
export function tickM05Work(
  occasion: M05Occasion,
  nowMs: number,
): 'none' | 'work_completed' {
  const s = states[occasion];
  const result = m05WorkTick(s, nowMs, sinkFor(occasion));

  if (
    result === 'work_completed' &&
    s.status === 'started' &&
    m05Windows[occasion].isOpen()
  ) {
    m05Windows[occasion].complete(
      nowMs,
      m05RawComponents(s, 'completed', nowMs),
      'system',
    );
  }

  return result;
}

// ——— route closures ————————————————————————————————————————————————

/**
 * The room was left (any door) or the shift ended: an unstarted accepted
 * occasion closes as `exited`; a started one keeps its latency (work
 * cycle recorded as it stands).
 */
export function exitM05(
  occasion: M05Occasion,
  nowMs: number,
  detail: 'room_left' | 'shift_ended' = 'room_left',
) {
  const s = states[occasion];
  const w = m05Windows[occasion];

  if (!w.isOpen()) {
    return false;
  }

  if (!m05Exit(s, nowMs, sinkFor(occasion), detail)) {
    return false;
  }

  w.complete(nowMs, m05RawComponents(s, 'route_departure', nowMs), 'system', {
    exitState: s.status === 'started' ? 'completed' : 'stopped',
  });

  return true;
}

/** Never offered → absent; open at the review → censored. */
export function closeM05AtReview(occasion: M05Occasion, nowMs: number) {
  const s = states[occasion];
  const w = m05Windows[occasion];

  if (w.windowStatus() === 'unopened') {
    w.markAbsent(
      s.offer_presentations > 0
        ? `${M05_JOBS[occasion].title.toLowerCase()} job offered, never answered before the review`
        : `${M05_JOBS[occasion].title.toLowerCase()} job never offered before the review`,
    );

    return;
  }

  if (w.isOpen()) {
    m05Freeze(s, nowMs, 'closed_at_review', 'review');
    w.stop(
      nowMs,
      'closed_at_review',
      m05RawComponents(s, 'closed_at_review', nowMs),
      'system',
      'censored',
    );
  }
}

/** DEV probe shape (read-only). */
export function m05Probe(occasion: M05Occasion) {
  const s = states[occasion];

  return {
    offered: s.offer_presentations > 0,
    accepted: s.accepted,
    eligible: s.eligible_at_ms !== null,
    status: s.status,
    started: s.status === 'started',
    work_done: s.work_completed_at_ms !== null,
    late_start: s.late_start !== null,
    window: m05Windows[occasion].windowStatus(),
  };
}

/** Test-only escape hatch. */
export function resetM05State() {
  for (const occasion of OCCASIONS) {
    m05Freeze(states[occasion], 0, 'reset', null);
    states[occasion] = createM05State(occasion);
    m05Windows[occasion].reset();
  }
}
