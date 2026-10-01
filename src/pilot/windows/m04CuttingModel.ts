/**
 * M04 — Own debris: the cutting-job model (Station 080 M01–M26 run,
 * Unit 14). PURE (no Phaser, no runtime import): the window adapter
 * (`m04Debris.ts`) owns the register windows and injects the log sink;
 * the Records Workshop scene renders the pieces and calls the adapter
 * with its input mode.
 *
 * Approved design (register M04 row, "Extend occasions"): six debris
 * pieces across two short cutting jobs (three each); disposal optional
 * and accessible; debris recorded at the first departure from each job;
 * later cleanup never rewrites it.
 *
 * Mechanic: the Sample Cutter, in its annex, cuts one test coupon per
 * job; each cut leaves three pieces at fixed places on the annex floor —
 * job 1 west of the cutter, job 2 at the mirrored places east of it
 * (U14-D2). Pieces are carried one at a time and dropped into the bin, or
 * set down again where they lay; nobody mentions them. A job's FIRST
 * DEPARTURE is the first time the participant turns to other work after
 * the cut — the first accepted action at another station that changed
 * that task's recorded state (U14-D: a panel only shown or closed, a
 * station only inspected, a refusal close nothing), or the room left: the state of that
 * job's three pieces is recorded once. The second coupon becomes
 * available after the first job's departure, so each job has a departure
 * of its own. A piece disposed after its job's departure is recorded
 * apart and changes nothing. A press at the cutter inside the settle
 * window after a cut is refused and recorded. A job closed by the system
 * (the review) is not a departure: its state is kept and censored.
 *
 * Measure (register `m04_undisposed_pieces`): pieces not disposed at the
 * first departure, carried pieces included, summed over both jobs / 6
 * (three per job); a job never run is not presented. Nothing here is a
 * score.
 */
import { FocusedClock, type PauseCause } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';

export const M04_FAMILY = 'proto_m04_cutting_';
/**
 * `m04-cutting-v4` (U14-D2, the approved annex administration): the
 * cutter and the bin stand in a 13 × 6-tile annex of the Records
 * Workshop; job 1 leaves its three pieces west of the cutter, job 2 at
 * the mirrored places east of it; a piece is lifted by keyboard or by
 * pointer within 64 px and the bin answers within 64 px, and every
 * position a piece can be lifted from lies more than 76 px from the bin.
 * As in the pass before it: a station in range always keeps the press,
 * lifting a piece never names the bin (`M04BinGate`), a carried piece can
 * be set down again where it lay, both cuts are answered by the same
 * line, and a job's first departure is the first accepted action at
 * another station that changed that task's record, or the room left.
 *
 * Earlier values: `m04-cutting-v1` is the administration of Unit 14,
 * `m04-cutting-v2` that of U14-C. `m04-cutting-v3` named the geometry of
 * the first U14-D pass, which was blocked (register §5.219) and never
 * committed, approved or released: no administration carries it. The
 * administrations differ in places, cues and the departure rule and are
 * not pooled by any code.
 */
export const M04_ENTRY_STATE_VERSION = 'm04-cutting-v4';
/**
 * What the cutter states, when it is used, while the second coupon is
 * not available yet: a status of the station, never an instruction. It
 * is shown only when the participant checks the cutter; it names no
 * leaving, no tidying and no other work.
 */
export const M04_NO_ORDER_LINE = 'No cutting order is available.';
/** What is shown when a carried piece was set down where it lay. */
export const M04_SET_DOWN_LINE = 'Set down.';
/** What is shown when a carried piece could not be set down. */
export const M04_SET_DOWN_REFUSED_LINE = 'Cannot set that down right now.';
export const M04_PIECES_PER_JOB = 3;
export const M04_PRIOR_ADMINISTRATION = 'prior_administration';
/**
 * Settle window after a cut (review U10 / U11 precedent, 1.5 s): a press
 * at the cutter arriving within it is a repeated or carried press of the
 * cut, never an act on the pieces.
 */
export const M04_CUT_SETTLE_MS = 1500;

export type M04Job = 'o1' | 'o2';
export type M04InputMode = 'pointer' | 'keyboard' | 'system';
export type M04JobStatus = 'not_run' | 'open' | 'closed' | 'failed';
export type M04DepartureTrigger =
  | 'other_station'
  | 'room_exit'
  | 'closed_at_review';
export type M04LogSink = (
  job: M04Job,
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export const M04_JOBS: readonly M04Job[] = ['o1', 'o2'];

export interface M04JobSpec {
  job: M04Job;
  number: 1 | 2;
  opportunity_id: string;
  window_id: string;
}

export const M04_SPEC: Record<M04Job, M04JobSpec> = {
  o1: {
    job: 'o1',
    number: 1,
    opportunity_id: 'proto_m04_cutting_o1',
    window_id: 'm04_cutting_o1',
  },
  o2: {
    job: 'o2',
    number: 2,
    opportunity_id: 'proto_m04_cutting_o2',
    window_id: 'm04_cutting_o2',
  },
};

export interface M04Piece {
  object_id: string;
  job: M04Job;
  label: string;
  icon: string;
  /** Offset from the cutter's scatter origin (px). */
  dx: number;
  dy: number;
}

/**
 * Six standardised pieces at fixed offsets from the scatter origin (the
 * cutter, 400, 456; identical for everyone): one offcut, one swarf tray
 * and one blade wrap per job. The approved v4 places (room px): job 1,
 * west of the cutter — offcut 228, 476 · swarf tray 212, 516 · blade
 * wrap 212, 556; job 2, east of it — offcut 572, 476 · swarf tray
 * 588, 516 · blade wrap 588, 556. Each piece of job 2 is the mirror
 * image of the same kind of piece of job 1 about the cutter (x 400), in
 * an annex whose floor and whose collision footprints of the cutter and
 * the bin are mirrored about the same line (the painted machine itself
 * is not a mirror image): the two jobs are laid out alike. The two
 * clusters are 344 px apart and
 * do not interleave; every piece lies more than 160 px from the cutter,
 * the doorway and the line between them, nearer to the cutter than to
 * any other station, and no position it can be lifted from is within
 * 76 px of the bin (64 px reach plus the approved 12 px margin).
 */
export const M04_PIECES: readonly M04Piece[] = [
  {
    object_id: 'm04_offcut_a',
    job: 'o1',
    label: 'coupon offcut',
    icon: 'w2-debris-coupon-offcut',
    dx: -172,
    dy: 20,
  },
  {
    object_id: 'm04_swarf_a',
    job: 'o1',
    label: 'swarf tray',
    icon: 'w2-debris-swarf-tray',
    dx: -188,
    dy: 60,
  },
  {
    object_id: 'm04_wrap_a',
    job: 'o1',
    label: 'blade wrap',
    icon: 'w2-debris-blade-wrap',
    dx: -188,
    dy: 100,
  },
  {
    object_id: 'm04_offcut_b',
    job: 'o2',
    label: 'coupon offcut',
    icon: 'w2-debris-coupon-offcut',
    dx: 172,
    dy: 20,
  },
  {
    object_id: 'm04_swarf_b',
    job: 'o2',
    label: 'swarf tray',
    icon: 'w2-debris-swarf-tray',
    dx: 188,
    dy: 60,
  },
  {
    object_id: 'm04_wrap_b',
    job: 'o2',
    label: 'blade wrap',
    icon: 'w2-debris-blade-wrap',
    dx: 188,
    dy: 100,
  },
];

export function m04Piece(objectId: string): M04Piece | undefined {
  return M04_PIECES.find((piece) => piece.object_id === objectId);
}

export function m04PiecesOf(job: M04Job): M04Piece[] {
  return M04_PIECES.filter((piece) => piece.job === job);
}

// ——— state ————————————————————————————————————————————————————————————

export interface M04Departure {
  at_ms: number;
  trigger: M04DepartureTrigger;
  detail: string | null;
  pieces_total: number;
  disposed_ids: string[];
  pieces_disposed: number;
  /** The carried piece of THIS job at the departure (counted undisposed). */
  carried_piece: string | null;
  pieces_lying: number;
  undisposed_at_departure: number;
  first_disposal_focused_ms: number | null;
  focused_ms: number;
  wall_ms: number;
  excluded_ms: Record<PauseCause, number>;
  excluded_total_ms: number;
}

export interface M04JobState {
  spec: M04JobSpec;
  status: M04JobStatus;
  ranAtMs: number | null;
  runInputMode: M04InputMode | null;
  disposed: string[];
  pickups: number;
  putBacks: number;
  firstDisposalFocusedMs: number | null;
  clock: FocusedClock | null;
  departure: M04Departure | null;
  lateDisposals: string[];
  closureReason: string | null;
}

export interface M04State {
  jobs: Record<M04Job, M04JobState>;
  carried: string | null;
  listedAtMs: number | null;
  unavailablePresses: number;
  refusedPresses: number;
}

function createJob(job: M04Job): M04JobState {
  return {
    spec: M04_SPEC[job],
    status: 'not_run',
    ranAtMs: null,
    runInputMode: null,
    disposed: [],
    pickups: 0,
    putBacks: 0,
    firstDisposalFocusedMs: null,
    clock: null,
    departure: null,
    lateDisposals: [],
    closureReason: null,
  };
}

export function createM04State(): M04State {
  return {
    jobs: { o1: createJob('o1'), o2: createJob('o2') },
    carried: null,
    listedAtMs: null,
    unavailablePresses: 0,
    refusedPresses: 0,
  };
}

export function m04EntrySnapshot(job: M04Job) {
  return {
    occasion_id: job,
    job_number: M04_SPEC[job].number,
    jobs_planned: M04_JOBS.length,
    pieces: m04PiecesOf(job).map((piece) => piece.object_id),
    piece_offsets: m04PiecesOf(job).map((piece) => ({
      object_id: piece.object_id,
      dx: piece.dx,
      dy: piece.dy,
    })),
    pieces_total: M04_PIECES_PER_JOB,
    second_job_available: 'after_the_first_departure_of_job_1',
    cut_settle_ms: M04_CUT_SETTLE_MS,
    disposal_available: true,
    cleanup_instructed: false,
    cleanup_rewarded: false,
    exit_always_available: true,
    departure: 'other_station_work_begun_or_room_exit',
    set_down_available: true,
    set_down_counts_as: 'undisposed',
    cut_feedback: 'same_line_for_both_jobs',
    snapshot_at_first_departure: true,
    carried_piece_counts_as: 'undisposed',
    later_disposal: 'recorded_apart',
    time_limit: null,
    payment_fixed: true,
    route_fixed: true,
  };
}

/**
 * Reload guard (register §5.14): true when an earlier page load of this
 * identity already ran this job.
 */
export function m04PriorAdministration(
  priorLoadEvents: readonly {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[],
  job: M04Job,
): boolean {
  return priorLoadEvents.some(
    (event) =>
      event.event_type === `${M04_FAMILY}opportunity_opened` &&
      event.metadata?.opportunity_id === M04_SPEC[job].opportunity_id,
  );
}

// ——— readers ——————————————————————————————————————————————————————————

function settled(job: M04JobState): boolean {
  return job.status === 'closed' || job.status === 'failed';
}

/**
 * The job the cutter can run now: job 1 first; job 2 once job 1 has had
 * its departure (or failed technically). Null while a job is open or
 * both are done.
 */
export function m04AvailableJob(s: M04State): M04Job | null {
  if (s.jobs.o1.status === 'not_run') {
    return 'o1';
  }

  if (settled(s.jobs.o1) && s.jobs.o2.status === 'not_run') {
    return 'o2';
  }

  return null;
}

export function m04OpenJob(s: M04State): M04Job | null {
  return M04_JOBS.find((job) => s.jobs[job].status === 'open') ?? null;
}

export function m04AnyJobRun(s: M04State): boolean {
  return M04_JOBS.some((job) => s.jobs[job].ranAtMs !== null);
}

/** Every job has been run (or failed): the cutter has nothing left to cut. */
export function m04AllJobsRun(s: M04State): boolean {
  return M04_JOBS.every((job) => s.jobs[job].status !== 'not_run');
}

function produced(s: M04State, piece: M04Piece): boolean {
  const job = s.jobs[piece.job];

  return job.ranAtMs !== null && job.status !== 'failed';
}

function gone(s: M04State, piece: M04Piece): boolean {
  const job = s.jobs[piece.job];

  return (
    job.disposed.includes(piece.object_id) ||
    job.lateDisposals.includes(piece.object_id)
  );
}

/**
 * Pieces lying at the bench (produced by a job that ran; not carried, not
 * disposed). Nothing exists before a job ran: the pieces are CREATED by
 * the cut.
 */
export function m04LyingPieces(s: M04State): M04Piece[] {
  return M04_PIECES.filter(
    (piece) =>
      produced(s, piece) && !gone(s, piece) && s.carried !== piece.object_id,
  );
}

export function m04CarriedPiece(s: M04State): M04Piece | null {
  return s.carried === null ? null : (m04Piece(s.carried) ?? null);
}

/** True when at least one job left pieces at the bench (it ran and did not fail). */
export function m04AnyJobProduced(s: M04State): boolean {
  return M04_JOBS.some(
    (job) => s.jobs[job].ranAtMs !== null && s.jobs[job].status !== 'failed',
  );
}

/** A job that could not be run (its pieces could not be drawn, or a reload held it back). */
export function m04AnyJobFailed(s: M04State): boolean {
  return M04_JOBS.some((job) => s.jobs[job].status === 'failed');
}

/**
 * What the cutter states when it is used with nothing to cut (never
 * shown unasked; the line at a cut is the same for both jobs). "Both
 * coupons cut"
 * is stated only when both were: never after a jam or a held-back job.
 */
export function m04IdleLine(s: M04State): string {
  if (m04OpenJob(s) === 'o1') {
    return M04_NO_ORDER_LINE;
  }

  if (!m04AnyJobProduced(s)) {
    return 'The cutter is out of service.';
  }

  return m04AnyJobFailed(s)
    ? 'The cutter is idle.'
    : 'Both coupons cut. The cutter is idle.';
}

/** Milliseconds since the open job's cut, while inside its settle window (else null). */
export function m04CutSettling(s: M04State, nowMs: number): number | null {
  const job = m04OpenJob(s);
  const ranAt = job === null ? null : s.jobs[job].ranAtMs;

  if (ranAt === null) {
    return null;
  }

  const since = nowMs - ranAt;

  return since >= 0 && since < M04_CUT_SETTLE_MS ? since : null;
}

// ——— the jobs —————————————————————————————————————————————————————————

/** The work orders listed the sample coupons (exposure record, once). */
export function m04Listed(s: M04State, nowMs: number): boolean {
  if (s.listedAtMs !== null) {
    return false;
  }

  s.listedAtMs = nowMs;

  return true;
}

export type M04RunResult =
  | { outcome: 'run'; job: M04Job }
  | { outcome: 'technical_failure'; job: M04Job }
  | { outcome: 'unavailable'; reason: 'job_open' | 'all_jobs_run' };

/**
 * Runs the next available job. `accessible` is the host's statement that
 * every piece of the job can be drawn and reached; a job whose pieces
 * cannot is a technical failure — never three pieces "left behind".
 */
export function m04RunJob(
  s: M04State,
  accessible: boolean,
  nowMs: number,
  inputMode: M04InputMode,
): M04RunResult {
  const job = m04AvailableJob(s);

  if (job === null) {
    return {
      outcome: 'unavailable',
      reason: m04OpenJob(s) === null ? 'all_jobs_run' : 'job_open',
    };
  }

  const state = s.jobs[job];

  state.ranAtMs = nowMs;
  state.runInputMode = inputMode;

  if (!accessible) {
    state.status = 'failed';
    state.closureReason = 'technical_failure';

    return { outcome: 'technical_failure', job };
  }

  const clock = new FocusedClock();

  clock.start(nowMs);
  registerFocusedClock(clock);
  state.clock = clock;
  state.status = 'open';

  return { outcome: 'run', job };
}

/** The cut itself, logged after the adapter opened the job's window. */
export function m04NoteJobRun(s: M04State, job: M04Job, log: M04LogSink) {
  const state = s.jobs[job];

  log(job, 'job_run', {
    occasion_id: job,
    job_number: state.spec.number,
    pieces: m04PiecesOf(job).map((piece) => piece.object_id),
    pieces_total: M04_PIECES_PER_JOB,
    earlier_pieces_lying: m04LyingPieces(s).filter((piece) => piece.job !== job)
      .length,
    carrying_at_cut: s.carried,
    phase: 'measurement',
    input_mode: state.runInputMode ?? 'system',
  });
}

/** A press inside the settle window of a cut (recorded, no effect). */
export function m04NotePressRefused(
  s: M04State,
  sinceCutMs: number,
  inputMode: M04InputMode,
  log: M04LogSink,
) {
  const job = m04OpenJob(s) ?? 'o1';

  s.refusedPresses += 1;
  log(job, 'press_refused', {
    occasion_id: job,
    control: 'sample_cutter',
    reason: 'cut_settling',
    since_cut_ms: sinceCutMs,
    settle_ms: M04_CUT_SETTLE_MS,
    refusal_number: s.refusedPresses,
    phase: 'measurement',
    input_mode: inputMode,
  });
}

export type M04UnavailableReason =
  | 'job_open'
  | 'all_jobs_run'
  | 'not_scheduled'
  | 'out_of_service';

/** The cutter was used while it had no job to run (recorded, no effect). */
export function m04NoteUnavailable(
  s: M04State,
  reason: M04UnavailableReason,
  inputMode: M04InputMode,
  log: M04LogSink,
) {
  const job = m04OpenJob(s) ?? (s.jobs.o2.ranAtMs !== null ? 'o2' : 'o1');

  s.unavailablePresses += 1;
  log(job, 'job_unavailable', {
    occasion_id: job,
    reason,
    press_number: s.unavailablePresses,
    phase: 'measurement',
    input_mode: inputMode,
  });
}

/**
 * Where a pick-up or a disposal was issued: a pointer click on the piece
 * or the bin, a press at the cutter, a press at another station that
 * stands farther from the avatar than the bin, or a press on open floor.
 * Kept so an interface-routed act can be told from a pointed one. Under
 * `m04-cutting-v4` a PICK-UP is issued by pointer or on open floor only
 * (a station in range keeps the press); the other two origins remain for
 * a disposal and for the records of v1 / v2.
 */
export type M04PickupOrigin =
  | 'pointer'
  | 'cutter_press'
  | 'open_floor_press'
  | `station_press:${string}`;

export function m04PickUp(
  s: M04State,
  objectId: string,
  nowMs: number,
  inputMode: M04InputMode,
  log: M04LogSink,
  origin: M04PickupOrigin = inputMode === 'pointer'
    ? 'pointer'
    : 'open_floor_press',
): boolean {
  const piece = m04Piece(objectId);

  if (
    piece === undefined ||
    s.carried !== null ||
    !produced(s, piece) ||
    gone(s, piece)
  ) {
    return false;
  }

  const job = s.jobs[piece.job];

  s.carried = objectId;
  job.pickups += 1;
  log(piece.job, 'piece_picked_up', {
    occasion_id: piece.job,
    object_id: objectId,
    origin,
    after_departure: job.status === 'closed',
    focused_ms: job.clock?.focusedMs(nowMs) ?? null,
    phase: 'measurement',
    input_mode: inputMode,
  });

  return true;
}

/**
 * The carried piece goes back where it lay: set down by the participant
 * (keyboard or pointer), or put back by the system when the room is
 * left. The piece stays undisposed; a record already made is untouched.
 * `input_mode` alone tells who did it (`keyboard` / `pointer` = the
 * participant, `system` = the room exit).
 */
export function m04PutBack(
  s: M04State,
  inputMode: M04InputMode,
  log: M04LogSink,
): boolean {
  const piece = m04CarriedPiece(s);

  if (piece === null) {
    return false;
  }

  const job = s.jobs[piece.job];

  s.carried = null;
  job.putBacks += 1;
  log(piece.job, 'piece_put_back', {
    occasion_id: piece.job,
    object_id: piece.object_id,
    after_departure: job.status === 'closed',
    phase: 'measurement',
    input_mode: inputMode,
  });

  return true;
}

export type M04SetDownResult = 'set_down' | 'refused' | 'nothing_carried';

/**
 * The participant sets the carried piece down. `placeable` is the host's
 * statement that the piece can be shown where it lay; when it cannot,
 * the piece STAYS in the hands and nothing is recorded — a set-down that
 * fails is never a disposal and never changes a record.
 */
export function m04SetDown(
  s: M04State,
  placeable: boolean,
  inputMode: Exclude<M04InputMode, 'system'>,
  log: M04LogSink,
): M04SetDownResult {
  if (m04CarriedPiece(s) === null) {
    return 'nothing_carried';
  }

  if (!placeable) {
    return 'refused';
  }

  return m04PutBack(s, inputMode, log) ? 'set_down' : 'refused';
}

// ——— the bin as a target (U14-D, owner ruling 2) ———————————————————————

/**
 * Whether the bin may be named, outlined or used for the carried piece.
 * Lifting a piece never nominates the bin: the bin becomes the target
 * only after (1) the activation that lifted the piece is over — every
 * interaction key and the pointer were seen released — and (2) the
 * participant acquired the bin anew, by walking INTO its range from
 * outside it. A pointer press on the bin is a target of its own (a
 * separate gesture, see `m04BinPointerAllowed`). State and input-release
 * boundaries only: no delay is measured anywhere.
 */
export interface M04BinGate {
  /** The pick-up's activation is over (keys and pointer seen released). */
  released: boolean;
  /** The avatar stood outside the bin's range after that release. */
  beenOutside: boolean;
  /** The bin is the acquired target now (in range, entered from outside). */
  acquired: boolean;
  /** The piece was lifted by a drag whose pointer is still held. */
  dragHeld: boolean;
}

export interface M04BinGateInput {
  carrying: boolean;
  /** An interaction key (E / SPACE) is held. */
  keysDown: boolean;
  pointerDown: boolean;
  /** The avatar stands within the bin's range. */
  inRange: boolean;
}

export function createM04BinGate(dragHeld = false): M04BinGate {
  return { released: false, beenOutside: false, acquired: false, dragHeld };
}

/** One step of the gate (the host calls it every frame); returns the gate. */
export function m04BinGateStep(
  gate: M04BinGate,
  input: M04BinGateInput,
): M04BinGate {
  if (!input.carrying) {
    gate.released = false;
    gate.beenOutside = false;
    gate.acquired = false;
    gate.dragHeld = false;

    return gate;
  }

  if (!input.pointerDown) {
    gate.dragHeld = false;
  }

  if (!gate.released) {
    gate.released = !input.keysDown && !input.pointerDown;
  }

  if (!gate.released) {
    gate.acquired = false;

    return gate;
  }

  if (!input.inRange) {
    gate.beenOutside = true;
    gate.acquired = false;
  } else {
    gate.acquired = gate.beenOutside;
  }

  return gate;
}

/**
 * A pointer act on the bin: a PRESS on it is a gesture of its own and
 * needs the pick-up's activation to be over; the RELEASE of a drag that
 * lifted the piece and was carried to the bin is the one continuous
 * gesture that may end in the bin (released anywhere else, the piece
 * stays in the hands and can be set down).
 */
export function m04BinPointerAllowed(
  gate: M04BinGate,
  gesture: 'press' | 'drag_release',
): boolean {
  return gesture === 'press' ? gate.released : gate.dragHeld;
}

export type M04DisposeResult = 'disposed' | 'late' | 'invalid';

/**
 * The carried piece was dropped into the bin. Inside its job's window it
 * is a disposal; after the job's departure it is a LATE disposal — kept
 * apart, never rewriting the recorded state.
 */
export function m04Dispose(
  s: M04State,
  objectId: string,
  nowMs: number,
  inputMode: M04InputMode,
  log: M04LogSink,
  origin: M04PickupOrigin = inputMode === 'pointer'
    ? 'pointer'
    : 'open_floor_press',
): M04DisposeResult {
  const piece = m04Piece(objectId);

  if (piece === undefined || s.carried !== objectId) {
    return 'invalid';
  }

  const job = s.jobs[piece.job];

  s.carried = null;

  if (job.status === 'open') {
    const focused = job.clock?.focusedMs(nowMs) ?? null;

    job.disposed.push(objectId);

    if (job.firstDisposalFocusedMs === null) {
      job.firstDisposalFocusedMs = focused;
    }

    log(piece.job, 'piece_disposed', {
      occasion_id: piece.job,
      object_id: objectId,
      origin,
      disposed_count: job.disposed.length,
      remaining: M04_PIECES_PER_JOB - job.disposed.length,
      after_departure: false,
      focused_ms: focused,
      phase: 'measurement',
      input_mode: inputMode,
    });

    return 'disposed';
  }

  job.lateDisposals.push(objectId);
  log(piece.job, 'late_disposal', {
    occasion_id: piece.job,
    object_id: objectId,
    origin,
    late_disposal_number: job.lateDisposals.length,
    after_departure: true,
    recorded_undisposed_unchanged:
      job.departure?.undisposed_at_departure ?? null,
    phase: 'closure',
    input_mode: inputMode,
  });

  return 'late';
}

/**
 * The first departure from every open job: the state of its pieces is
 * recorded once. Returns the jobs it closed (none when no job was open).
 * The CALLER decides what a departure is (U14-D: an accepted action at
 * another station that changed that task's recorded state, or the room
 * left); this function only records it.
 * A closure by the system (`closed_at_review`) is NOT a departure: the
 * state is recorded under `state_at_review`, never `first_departure`.
 */
export function m04Depart(
  s: M04State,
  trigger: M04DepartureTrigger,
  detail: string | null,
  nowMs: number,
  log: M04LogSink,
): M04Job[] {
  const closed: M04Job[] = [];

  for (const job of M04_JOBS) {
    const state = s.jobs[job];

    if (state.status !== 'open' || state.clock === null) {
      continue;
    }

    const clock = state.clock;

    clock.stop(nowMs);

    const snapshot = clock.snapshot(nowMs);

    releaseFocusedClock(clock);
    state.clock = null;

    const carried = m04CarriedPiece(s);
    const carriedHere = carried !== null && carried.job === job;
    const undisposed = M04_PIECES_PER_JOB - state.disposed.length;

    state.departure = {
      at_ms: nowMs,
      trigger,
      detail,
      pieces_total: M04_PIECES_PER_JOB,
      disposed_ids: [...state.disposed],
      pieces_disposed: state.disposed.length,
      carried_piece: carriedHere ? carried.object_id : null,
      pieces_lying: undisposed - (carriedHere ? 1 : 0),
      undisposed_at_departure: undisposed,
      first_disposal_focused_ms: state.firstDisposalFocusedMs,
      focused_ms: snapshot.focused_ms,
      wall_ms: snapshot.wall_ms,
      excluded_ms: snapshot.excluded_ms,
      excluded_total_ms: snapshot.excluded_total_ms,
    };
    state.status = 'closed';
    state.closureReason =
      trigger === 'closed_at_review' ? 'closed_at_review' : 'completed';
    log(
      job,
      trigger === 'closed_at_review' ? 'state_at_review' : 'first_departure',
      {
        occasion_id: job,
        job_number: state.spec.number,
        ...state.departure,
        departed: trigger !== 'closed_at_review',
        pickups: state.pickups,
        put_backs: state.putBacks,
        snapshot_permanent: true,
        phase: 'closure',
        input_mode: 'system',
      },
    );
    closed.push(job);
  }

  return closed;
}

/** Freezes a job (technical failure, reload guard, reset). */
export function m04Freeze(
  s: M04State,
  job: M04Job,
  nowMs: number,
  reason: string,
) {
  const state = s.jobs[job];

  if (state.clock !== null) {
    state.clock.stop(nowMs);
    releaseFocusedClock(state.clock);
    state.clock = null;
  }

  if (state.status !== 'closed') {
    state.status = 'failed';
  }

  state.closureReason = reason;
}

/** Item-owned raw components of one job (state description, never a score). */
export function m04RawComponents(s: M04State, job: M04Job, reason: string) {
  const state = s.jobs[job];

  return {
    occasion: job,
    job_number: state.spec.number,
    opportunity_id: state.spec.opportunity_id,
    window_id: state.spec.window_id,
    observed:
      state.departure !== null &&
      state.departure.trigger !== 'closed_at_review',
    pieces_total: M04_PIECES_PER_JOB,
    undisposed_at_departure: state.departure?.undisposed_at_departure ?? null,
    pieces_disposed: state.departure?.pieces_disposed ?? null,
    disposed_ids: state.departure?.disposed_ids ?? null,
    carried_piece: state.departure?.carried_piece ?? null,
    pieces_lying: state.departure?.pieces_lying ?? null,
    departure_trigger: state.departure?.trigger ?? null,
    departure_detail: state.departure?.detail ?? null,
    first_disposal_focused_ms:
      state.departure?.first_disposal_focused_ms ?? null,
    exposure_focused_ms: state.departure?.focused_ms ?? null,
    exposure_wall_ms: state.departure?.wall_ms ?? null,
    exposure_excluded_ms: state.departure?.excluded_ms ?? null,
    pickups: state.pickups,
    put_backs: state.putBacks,
    late_disposals: [...state.lateDisposals],
    run_input_mode: state.runInputMode,
    closure_reason: reason,
  };
}
