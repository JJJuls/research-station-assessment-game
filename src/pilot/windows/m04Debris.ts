/**
 * M04 — Self-generated sample-job debris (evidence-led pilot v2, Unit 2).
 *
 * Ledger (sheet 09): a neutral sample job creates six standardised,
 * self-generated debris objects; disposal is optional and the route never
 * gates on cleanup; debris is never reused by M03; exit always available.
 *
 * Mechanic: the Sample Cutter bench in the Records Workshop. Running the
 * one-press coupon cut (a listed neutral work order) scatters six debris
 * objects around the bench at fixed positions; a disposal chute stands
 * beside the bench. Objects are carried one at a time (physical layer:
 * click/drag or E) and dropped into the chute. Nobody mentions cleanup.
 * The window closes at the first workshop exit after the debris appeared
 * (exposure recorded); later exits are gameplay only.
 *
 * Raw components: debris_remaining_at_exit, debris_disposed,
 * cleanup_latency (ms from debris appearance to first disposal; null when
 * none), window_exposure (ms the debris was present before exit).
 */
import { type InputMode, ItemWindow } from './windowKit';

export const M04_OPPORTUNITY_ID = 'proto_m04_debris_cleanup';
export const M04_WINDOW_ID = 'm04_debris_w1';
export const M04_ENTRY_STATE_VERSION = 'm04-debris-v1';
export const M04_FAMILY = 'proto_m04_debris_';

export interface M04Debris {
  object_id: string;
  label: string;
  icon: string;
  /** Offset from the cutter bench (px). */
  dx: number;
  dy: number;
}

/**
 * Six standardised objects at fixed offsets (identical for everyone). The
 * scatter stays compact (dx within ±64, dy 0..64) so every object lands on
 * open floor beside the bench and none sits under a station, the chute or
 * the workshop machinery block (x ≥ 416 on rows 12-13).
 */
export const M04_DEBRIS: readonly M04Debris[] = [
  {
    object_id: 'm04_offcut_a',
    label: 'Coupon offcut',
    icon: 'w2-debris-coupon-offcut',
    dx: -28,
    dy: 44,
  },
  {
    object_id: 'm04_offcut_b',
    label: 'Coupon offcut',
    icon: 'w2-debris-coupon-offcut',
    dx: 28,
    dy: 44,
  },
  {
    object_id: 'm04_swarf_a',
    label: 'Swarf tray',
    icon: 'w2-debris-swarf-tray',
    dx: -8,
    dy: 64,
  },
  {
    object_id: 'm04_swarf_b',
    label: 'Swarf tray',
    icon: 'w2-debris-swarf-tray',
    dx: 52,
    dy: 60,
  },
  {
    object_id: 'm04_wrap_a',
    label: 'Blade wrap',
    icon: 'w2-debris-blade-wrap',
    dx: -64,
    dy: 8,
  },
  {
    object_id: 'm04_wrap_b',
    label: 'Blade wrap',
    icon: 'w2-debris-blade-wrap',
    dx: 52,
    dy: 0,
  },
];

interface M04State {
  jobRun: boolean;
  presentedAtMs: number | null;
  disposed: string[];
  carried: string | null;
  firstDisposalAtMs: number | null;
  windowClosed: boolean;
  exitSnapshot: { remaining: number; disposed: number } | null;
  pickups: number;
}

let state: M04State = initial();

function initial(): M04State {
  return {
    jobRun: false,
    presentedAtMs: null,
    disposed: [],
    carried: null,
    firstDisposalAtMs: null,
    windowClosed: false,
    exitSnapshot: null,
    pickups: 0,
  };
}

export const m04Window = new ItemWindow({
  item: 'M04',
  opportunityId: M04_OPPORTUNITY_ID,
  windowId: M04_WINDOW_ID,
  entryStateVersion: M04_ENTRY_STATE_VERSION,
  family: M04_FAMILY,
  scene: 'records_workshop',
  objectId: 'm04_sample_cutter',
});

export function declareM04() {
  m04Window.declare();
}

export function m04State(): Readonly<M04State> {
  return state;
}

export function m04JobRun(): boolean {
  return state.jobRun;
}

/**
 * Debris still lying at the bench (not carried, not disposed). Nothing
 * exists before the sample job ran: the objects are CREATED by the job
 * (D-V2-1 fix — the six objects used to be materialised at scene creation,
 * so "six rendered objects" was never evidence that the job ran).
 */
export function m04RemainingDebris(): M04Debris[] {
  if (!state.jobRun) {
    return [];
  }

  return M04_DEBRIS.filter(
    (d) =>
      !state.disposed.includes(d.object_id) && state.carried !== d.object_id,
  );
}

export function m04Carried(): M04Debris | null {
  return M04_DEBRIS.find((d) => d.object_id === state.carried) ?? null;
}

/** The neutral sample job ran: debris appears, the window opens. */
export function runM04SampleJob(nowMs: number, inputMode: InputMode) {
  if (state.jobRun) {
    return false;
  }

  declareM04();
  state.jobRun = true;
  state.presentedAtMs = nowMs;
  m04Window.open(nowMs, {
    debris_count: M04_DEBRIS.length,
    disposal_available: true,
    cleanup_instructed: false,
  });
  m04Window.log('job_run', { input_mode: inputMode });

  return true;
}

export function pickUpM04(objectId: string, inputMode: InputMode): boolean {
  if (
    !state.jobRun ||
    state.carried !== null ||
    state.disposed.includes(objectId) ||
    !M04_DEBRIS.some((d) => d.object_id === objectId)
  ) {
    return false;
  }

  state.carried = objectId;
  state.pickups += 1;
  m04Window.log('debris_picked_up', {
    object_id: objectId,
    input_mode: inputMode,
  });

  return true;
}

/** Drops the carried object back where it lay (room exit put-back). */
export function dropM04Carried() {
  if (state.carried !== null) {
    m04Window.log('debris_put_back', {
      object_id: state.carried,
      input_mode: 'system',
    });
    state.carried = null;
  }
}

export function disposeM04(
  objectId: string,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  if (state.carried !== objectId) {
    return false;
  }

  state.carried = null;
  state.disposed.push(objectId);

  if (state.firstDisposalAtMs === null) {
    state.firstDisposalAtMs = nowMs;
  }

  m04Window.log('debris_disposed', {
    object_id: objectId,
    disposed_count: state.disposed.length,
    remaining: M04_DEBRIS.length - state.disposed.length,
    input_mode: inputMode,
  });

  return true;
}

/**
 * Closes the primary window at the FIRST workshop exit after the debris
 * appeared and snapshots the site state (later exits are gameplay only).
 */
export function closeM04OnExit(nowMs: number): boolean {
  if (!state.jobRun || state.windowClosed) {
    return false;
  }

  dropM04Carried();
  state.windowClosed = true;
  state.exitSnapshot = {
    remaining: M04_DEBRIS.length - state.disposed.length,
    disposed: state.disposed.length,
  };
  m04Window.complete(
    nowMs,
    {
      debris_remaining_at_exit: state.exitSnapshot.remaining,
      debris_disposed: state.exitSnapshot.disposed,
      disposed_ids: [...state.disposed],
      cleanup_latency_ms:
        state.firstDisposalAtMs === null
          ? null
          : state.firstDisposalAtMs - (state.presentedAtMs ?? 0),
      window_exposure_ms: nowMs - (state.presentedAtMs ?? nowMs),
      pickups: state.pickups,
    },
    'system',
  );

  return true;
}

/** Deck review: never ran the job → missing; ran but never left → close now. */
export function closeM04AtReview(nowMs: number) {
  if (!state.jobRun) {
    m04Window.markAbsent('sample job never run before the review');
    return;
  }

  closeM04OnExit(nowMs);
}

/** Test-only escape hatch. */
export function resetM04State() {
  state = initial();
  m04Window.reset();
}
