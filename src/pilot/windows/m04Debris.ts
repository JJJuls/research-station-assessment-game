/**
 * M04 — window adapter of the two cutting jobs (Station 080 M01–M26 run,
 * Unit 14). One register window per job (`m04_cutting_o1`,
 * `m04_cutting_o2`), one opportunity id each; every command delegates to
 * the pure model (`m04CuttingModel.ts`) and logs through the job's window
 * with the protocol stamp.
 *
 * Mechanic: the Sample Cutter bench in the Records Workshop. Each cut
 * leaves three pieces at fixed places beside the bench; a disposal bin
 * stands next to it. Pieces are carried one at a time (pointer, or SPACE
 * / E at the cutter) and dropped into the bin. Nobody mentions them.
 *
 * Window lifecycle: the work orders LIST the coupons (exposure record);
 * a job is presented and opened (entered) by its cut — the pieces are
 * created by the cut, so a job never run is not presented; it completes
 * at its FIRST DEPARTURE (another station opened, or the room left) with
 * the state of its three pieces, a carried piece counted as undisposed.
 * A disposal after the departure is a late disposal on the closed window.
 * The second coupon becomes available after the first job's departure.
 * A job still open at the review is closed by the system — no departure
 * occurred, so its state is kept and censored; a job never run is absent;
 * after a reload that follows any cut, neither job is run again. The v2
 * single-job family (`proto_m04_debris_*`) keeps its v2
 * meaning in the frozen ledger and is retired from the route.
 */
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import {
  createM04State,
  M04_ENTRY_STATE_VERSION,
  M04_FAMILY,
  M04_JOBS,
  M04_PRIOR_ADMINISTRATION,
  M04_SPEC,
  m04AllJobsRun,
  m04AnyJobProduced,
  m04AvailableJob,
  m04CarriedPiece,
  m04CutSettling,
  m04Depart,
  type M04DepartureTrigger,
  m04Dispose,
  type M04DisposeResult,
  m04EntrySnapshot,
  m04Freeze,
  type M04Job,
  m04Listed,
  type M04LogSink,
  m04LyingPieces,
  m04NoteJobRun,
  m04NotePressRefused,
  m04NoteUnavailable,
  m04OpenJob,
  m04PickUp,
  type M04PickupOrigin,
  type M04Piece,
  m04PiecesOf,
  m04PriorAdministration,
  m04PutBack,
  m04RawComponents,
  m04RunJob,
  type M04State,
  type M04UnavailableReason,
} from './m04CuttingModel';
import { type InputMode, ItemWindow, type WindowStatus } from './windowKit';

export type { M04Job, M04PickupOrigin, M04Piece } from './m04CuttingModel';
export { M04_FAMILY, M04_JOBS, M04_PIECES, M04_SPEC } from './m04CuttingModel';

function createWindow(job: M04Job): ItemWindow {
  return new ItemWindow({
    item: 'M04',
    opportunityId: M04_SPEC[job].opportunity_id,
    windowId: M04_SPEC[job].window_id,
    entryStateVersion: M04_ENTRY_STATE_VERSION,
    family: M04_FAMILY,
    scene: 'records_workshop',
    objectId: 'm04_sample_cutter',
    occasion: job,
  });
}

const windows: Record<M04Job, ItemWindow> = {
  o1: createWindow('o1'),
  o2: createWindow('o2'),
};

let state: M04State = createM04State();
let entryContext: Record<string, unknown> = {};

const sink: M04LogSink = (job, suffix, metadata) =>
  windows[job].log(suffix, { ...protocolStamp(), ...metadata });

export function declareM04() {
  for (const job of M04_JOBS) {
    windows[job].declare();
  }
}

export function m04Window(job: M04Job): ItemWindow {
  return windows[job];
}

export function m04State(): Readonly<M04State> {
  return state;
}

/**
 * One status for the cutter as the other Workshop items' entry snapshots
 * record it: `open` while a job awaits its departure, `closed` once every
 * job that was run has had it, `unopened` before the first cut.
 */
export function m04SiteStatus(): WindowStatus {
  if (m04OpenJob(state) !== null) {
    return 'open';
  }

  return M04_JOBS.some((job) => state.jobs[job].ranAtMs !== null)
    ? 'closed'
    : 'unopened';
}

/** The job the cutter can run now (null while one is open or all are run). */
export function m04NextJob(): M04Job | null {
  return m04AvailableJob(state);
}

export function m04JobsAllRun(): boolean {
  return m04AllJobsRun(state);
}

/** True when at least one cut left pieces at the bench. */
export function m04AnyProduced(): boolean {
  return m04AnyJobProduced(state);
}

/**
 * A press at the cutter inside the settle window of a cut: recorded and
 * refused (true) — a repeated or carried press never acts on the pieces.
 */
export function refuseM04SettlingPress(
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const since = m04CutSettling(state, nowMs);

  if (since === null) {
    return false;
  }

  m04NotePressRefused(state, since, inputMode, sink);

  return true;
}

/** The job whose pieces await their first departure (null when none). */
export function m04JobOpen(): M04Job | null {
  return m04OpenJob(state);
}

/** Pieces lying at the bench (none before a cut: the cut creates them). */
export function m04RemainingDebris(): M04Piece[] {
  return m04LyingPieces(state);
}

export function m04Carried(): M04Piece | null {
  return m04CarriedPiece(state);
}

export function m04JobPieces(job: M04Job): M04Piece[] {
  return m04PiecesOf(job);
}

/**
 * The host scene states what it knows at a cut (the route stage and the
 * other Workshop items' window states); recorded in the entry snapshot.
 */
export function noteM04Entry(entry: Record<string, unknown>) {
  entryContext = { ...entry };
}

/** The work orders listed the sample coupons (exposure record, once). */
export function listM04(nowMs: number) {
  declareM04();

  if (m04Listed(state, nowMs)) {
    sink('o1', 'listed', {
      jobs_listed: M04_JOBS.length,
      phase: 'measurement',
      input_mode: 'system',
    });
  }
}

export type M04CutResult =
  | { outcome: 'run'; job: M04Job; number: 1 | 2 }
  | { outcome: 'technical_failure'; job: M04Job }
  | { outcome: 'unavailable'; reason: 'job_open' | 'all_jobs_run' };

/**
 * Uses the cutter. `accessible(job)` is the host's statement that every
 * piece of the job can be drawn. Runs the next available job, or records
 * that the cutter had none.
 */
export function runM04SampleJob(
  nowMs: number,
  inputMode: InputMode,
  accessible: (job: M04Job) => boolean,
): M04CutResult {
  declareM04();

  // Reload guard (register §5.14): once the raw log of an earlier page
  // load holds a cut, NEITHER job is run in this load — the first is never
  // re-run and the second would start from a state this load cannot know
  // (the first job's pieces and its departure).
  const prior = researchRuntime.getPriorPageLoadEvents();

  if (
    m04AvailableJob(state) !== null &&
    M04_JOBS.some((job) => m04PriorAdministration(prior, job))
  ) {
    for (const job of M04_JOBS) {
      if (state.jobs[job].status !== 'not_run') {
        continue;
      }

      m04Freeze(state, job, nowMs, M04_PRIOR_ADMINISTRATION);
      windows[job].recordPriorExposure(
        'a cutting job was administered in an earlier page load of this identity',
      );
      windows[job].technicalFailure(
        'reload after administration: cutting job not run',
      );
    }
  }

  const next = m04AvailableJob(state);
  const result = m04RunJob(
    state,
    next === null ? false : accessible(next),
    nowMs,
    inputMode,
  );

  if (result.outcome === 'unavailable') {
    return result;
  }

  if (result.outcome === 'technical_failure') {
    windows[result.job].technicalFailure(
      'piece unreachable: a piece of the job cannot be drawn',
    );

    return result;
  }

  const window = windows[result.job];

  window.present(nowMs, m04EntrySnapshot(result.job));
  window.setComprehension('not_required');
  window.open(nowMs, { ...m04EntrySnapshot(result.job), ...entryContext });
  m04NoteJobRun(state, result.job, sink);

  return {
    outcome: 'run',
    job: result.job,
    number: M04_SPEC[result.job].number,
  };
}

/** The cutter was used while it had no job to run (recorded, no effect). */
export function noteM04Unavailable(
  reason: M04UnavailableReason,
  inputMode: InputMode,
) {
  declareM04();
  m04NoteUnavailable(state, reason, inputMode, sink);
}

export function pickUpM04(
  objectId: string,
  inputMode: InputMode,
  origin: M04PickupOrigin,
  nowMs: number = Date.now(),
): boolean {
  return m04PickUp(state, objectId, nowMs, inputMode, sink, origin);
}

/** Drops the carried object back where it lay (room exit put-back). */
export function dropM04Carried() {
  m04PutBack(state, 'system', sink);
}

export function disposeM04(
  objectId: string,
  nowMs: number,
  inputMode: InputMode,
  origin: M04PickupOrigin,
): M04DisposeResult {
  return m04Dispose(state, objectId, nowMs, inputMode, sink, origin);
}

/**
 * The participant turned to other work: the first departure of every job
 * still open. Later departures are gameplay only.
 */
export function departM04(
  trigger: M04DepartureTrigger,
  detail: string | null,
  nowMs: number,
): M04Job[] {
  const closed = m04Depart(state, trigger, detail, nowMs, sink);

  for (const job of closed) {
    if (trigger === 'closed_at_review') {
      // Closed by the system: no departure occurred — censored, the state
      // as it stood kept as context, never a value.
      windows[job].stop(
        nowMs,
        'closed_at_review',
        m04RawComponents(state, job, 'closed_at_review'),
        'system',
        'censored',
      );
    } else {
      windows[job].complete(
        nowMs,
        m04RawComponents(state, job, 'completed'),
        'system',
      );
    }
  }

  return closed;
}

/** Deck review: a job never run → absent; a job still open → censored. */
export function closeM04AtReview(nowMs: number) {
  departM04('closed_at_review', null, nowMs);

  for (const job of M04_JOBS) {
    if (windows[job].windowStatus() === 'unopened') {
      windows[job].markAbsent('cutting job never run before the review');
    }
  }
}

/** Test-only escape hatch. */
export function resetM04State() {
  for (const job of M04_JOBS) {
    m04Freeze(state, job, 0, 'reset');
    windows[job].reset();
  }

  state = createM04State();
  entryContext = {};
}
