/**
 * M01 — Systematic organisation: the three-job batch model (Station 080
 * M01–M26 run, Unit 5). PURE (no Phaser, no runtime import): the window
 * adapter (`m01PlanBoard.ts`) owns the two register windows and injects
 * the log sinks; the surface builder calls the commands below with their
 * input mode.
 *
 * Approved design (specification, M01 row): two unrelated three-job
 * batches; direct work or OPTIONAL sequencing on a three-slot board;
 * deliberate card placements snapshotted at the first work action;
 * partial plans and any workable order remain valid; planning is never
 * required, rewarded or gating. Six cards are not six independent
 * situations.
 *
 * Mechanic: three job cards (each printing its requirement, if any) sit
 * in a packet beside an optional SEQUENCE board of three slots (place /
 * swap / take back). "Do: <job>" starts a job directly. The FIRST job
 * press — whether or not the job can run — records the board as it
 * stands (`plan_snapshot`) and locks it; a held card returns to the
 * packet unplaced. A job whose printed requirement is not yet done is
 * refused with a factual line (`dependency_error`, job correctness —
 * never a planning score). A press inside the settle window after a job
 * finishes is refused (held keys and carried presses never do a job).
 *
 * Measure (register `m01_planned_jobs`): cards on the board at the
 * snapshot, summed over the occasions whose snapshot exists, / 6. The
 * companion `m01_plan_structure` keeps each occasion's plan order,
 * dependency violations of the plan, adherence of the executed order to
 * it, dependency errors during work and jobs done. Nothing here is a
 * score.
 */

export const M01_FAMILY = 'proto_m01_batch_';
export const M01_ENTRY_STATE_VERSION = 'm01-batch-v1';
export const M01_JOBS = 3;
export const M01_SLOTS = 3;
/** Settle window after a job finishes: a press inside it is a carried press. */
export const M01_SETTLE_MS = 400;

export type M01Occasion = 'o1' | 'o2';
export type M01Form = 'form_a' | 'form_b';
export type M01InputMode = 'pointer' | 'keyboard' | 'system';
export type M01LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export interface M01Job {
  id: string;
  label: string;
  /** Jobs that must be done BEFORE this one (printed on the card). */
  requires: readonly string[];
}

export const M01_OPPORTUNITY_IDS: Record<M01Occasion, string> = {
  o1: 'proto_m01_batch_o1',
  o2: 'proto_m01_batch_o2',
};

export const M01_WINDOW_IDS: Record<M01Occasion, string> = {
  o1: 'm01_batch_o1',
  o2: 'm01_batch_o2',
};

/** Two unrelated batches: the storm packet (Concourse) and the return orders (Workshop). */
export const M01_BATCHES: Record<
  M01Occasion,
  { title: string; jobs: readonly M01Job[] }
> = {
  o1: {
    title: 'STORM PACKET — THREE JOBS',
    jobs: [
      { id: 'isolate_loop', label: 'Isolate coolant loop', requires: [] },
      {
        id: 'replace_seal',
        label: 'Replace loop seal',
        requires: ['isolate_loop'],
      },
      { id: 'log_storm', label: 'Log storm readings', requires: [] },
    ],
  },
  o2: {
    title: 'RETURN BATCH — THREE JOBS',
    jobs: [
      { id: 'sort_spares', label: 'Sort the returned spares', requires: [] },
      {
        id: 'seal_spares_crate',
        label: 'Seal the spares crate',
        requires: ['sort_spares'],
      },
      { id: 'count_hand_tools', label: 'Count the hand tools', requires: [] },
    ],
  },
};

export function m01Job(occasion: M01Occasion, id: string): M01Job {
  return M01_BATCHES[occasion].jobs.find((job) => job.id === id)!;
}

/** Form changes the packet's card order only (never the requirements). */
export function m01PacketOrder(occasion: M01Occasion, form: M01Form): string[] {
  const ids = M01_BATCHES[occasion].jobs.map((job) => job.id);

  return form === 'form_a' ? ids : [...ids].reverse();
}

export interface M01Snapshot {
  at_ms: number;
  /** Slot index → job id (null = empty), as the board stood. */
  slots: (string | null)[];
  planned_jobs: number;
  plan_order: string[];
  plan_dependency_violations: { job_id: string; requires: string }[];
  /** True when a lifted card was returned to the packet by the snapshot. */
  held_returned: boolean;
  /** The slot that card had been lifted from (an earlier placement now lost), or null. */
  held_from_slot: number | null;
}

export interface M01State {
  occasion: M01Occasion;
  form: M01Form;
  slots: (string | null)[];
  held: string | null;
  /** Slot the held card was lifted from (null: from the packet). */
  held_from_slot: number | null;
  /** Card placements (every `card_placed`). */
  placements: number;
  lifts: number;
  returns: number;
  /** The board is locked after the first work action. */
  plan_locked: boolean;
  snapshot: M01Snapshot | null;
  done: string[];
  dependency_errors: { job_id: string; requires: string; at_ms: number }[];
  refused_presses: number;
  first_work_at_ms: number | null;
  last_job_done_at_ms: number | null;
  closureReason: string | null;
}

export function createM01State(occasion: M01Occasion, form: M01Form): M01State {
  return {
    occasion,
    form,
    slots: [null, null, null],
    held: null,
    held_from_slot: null,
    placements: 0,
    lifts: 0,
    returns: 0,
    plan_locked: false,
    snapshot: null,
    done: [],
    dependency_errors: [],
    refused_presses: 0,
    first_work_at_ms: null,
    last_job_done_at_ms: null,
    closureReason: null,
  };
}

// ——— derived readers ————————————————————————————————————————————————

/** Cards still in the packet (not placed, not held), in the form's order. */
export function m01PacketCards(s: M01State): M01Job[] {
  return m01PacketOrder(s.occasion, s.form)
    .filter((id) => !s.slots.includes(id) && s.held !== id)
    .map((id) => m01Job(s.occasion, id));
}

export function m01PlannedJobs(s: M01State): number {
  return s.slots.filter((id) => id !== null).length;
}

export function m01AllDone(s: M01State): boolean {
  return s.done.length >= M01_JOBS;
}

/** Observation taken: the first work action snapshotted the board. */
export function m01Observed(s: M01State): boolean {
  return s.snapshot !== null;
}

/** Dependency violations of an order (a requirement absent or later). */
export function m01DependencyViolations(
  occasion: M01Occasion,
  order: readonly (string | null)[],
): { job_id: string; requires: string }[] {
  const violations: { job_id: string; requires: string }[] = [];

  for (const [index, id] of order.entries()) {
    if (id === null) {
      continue;
    }

    for (const requirement of m01Job(occasion, id).requires) {
      const requirementIndex = order.indexOf(requirement);

      if (requirementIndex < 0 || requirementIndex > index) {
        violations.push({ job_id: id, requires: requirement });
      }
    }
  }

  return violations;
}

/**
 * Violations WITHIN a plan: a requirement placed later than the job that
 * needs it. A requirement left off the board is not a violation — a
 * partial plan is valid (review U5 F4).
 */
export function m01PlanViolations(
  occasion: M01Occasion,
  order: readonly (string | null)[],
): { job_id: string; requires: string }[] {
  return m01DependencyViolations(occasion, order).filter(({ requires }) =>
    order.includes(requires),
  );
}

/**
 * Reload guard (register §5.14): true when an earlier page load of this
 * identity already opened this occasion's batch.
 */
export function m01PriorAdministration(
  priorLoadEvents: readonly {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[],
  occasion: M01Occasion,
): boolean {
  return priorLoadEvents.some(
    (event) =>
      event.event_type === `${M01_FAMILY}opportunity_opened` &&
      event.metadata?.occasion === occasion,
  );
}

export function m01EntrySnapshot(s: M01State) {
  return {
    occasion: s.occasion,
    form: s.form,
    packet_order: m01PacketOrder(s.occasion, s.form),
    jobs: M01_JOBS,
    slots: M01_SLOTS,
    sequencing_optional: true,
    route_fixed: true,
  };
}

// ——— board commands (only before the first work action) ——————————————

/** Pick a card up from the packet or a slot. */
export function m01Pick(
  s: M01State,
  jobId: string,
  inputMode: M01InputMode,
  log: M01LogSink,
): boolean {
  if (s.plan_locked || s.held !== null) {
    return false;
  }

  if (!M01_BATCHES[s.occasion].jobs.some((job) => job.id === jobId)) {
    return false;
  }

  const slot = s.slots.indexOf(jobId);

  if (slot >= 0) {
    s.slots[slot] = null;
  }

  s.held = jobId;
  s.held_from_slot = slot >= 0 ? slot : null;
  s.lifts += 1;
  log('card_lifted', {
    job_id: jobId,
    from_slot: slot >= 0 ? slot : null,
    input_mode: inputMode,
  });

  return true;
}

/** Place the held card into a slot (swapping out an occupant). */
export function m01Place(
  s: M01State,
  slotIndex: number,
  inputMode: M01InputMode,
  log: M01LogSink,
): boolean {
  if (
    s.plan_locked ||
    s.held === null ||
    slotIndex < 0 ||
    slotIndex >= M01_SLOTS
  ) {
    return false;
  }

  const occupant = s.slots[slotIndex];

  s.slots[slotIndex] = s.held;
  s.placements += 1;
  log('card_placed', {
    job_id: s.held,
    slot_index: slotIndex,
    displaced_job_id: occupant,
    placement_number: s.placements,
    board: [...s.slots],
    input_mode: inputMode,
  });
  s.held = occupant;
  s.held_from_slot = occupant === null ? null : slotIndex;

  return true;
}

/** Return the held card to the packet. */
export function m01Return(
  s: M01State,
  inputMode: M01InputMode,
  log: M01LogSink,
): boolean {
  if (s.held === null) {
    return false;
  }

  log('card_returned', { job_id: s.held, input_mode: inputMode });
  s.held = null;
  s.held_from_slot = null;
  s.returns += 1;

  return true;
}

// ——— work ————————————————————————————————————————————————————————————

export type M01WorkResult = 'done' | 'complete' | 'blocked' | 'refused';

function takeSnapshot(
  s: M01State,
  nowMs: number,
  jobId: string,
  inputMode: M01InputMode,
  log: M01LogSink,
) {
  const heldReturned = s.held !== null;
  const heldFromSlot = s.held_from_slot;

  if (heldReturned) {
    log('card_returned', {
      job_id: s.held,
      reason: 'first_work_action',
      input_mode: 'system',
    });
    s.held = null;
    s.held_from_slot = null;
    s.returns += 1;
  }

  const slots = [...s.slots];

  s.snapshot = {
    at_ms: nowMs,
    slots,
    planned_jobs: slots.filter((id) => id !== null).length,
    plan_order: slots.filter((id): id is string => id !== null),
    plan_dependency_violations: m01PlanViolations(s.occasion, slots),
    held_returned: heldReturned,
    held_from_slot: heldReturned ? heldFromSlot : null,
  };
  s.plan_locked = true;
  s.first_work_at_ms = nowMs;
  log('plan_snapshot', {
    ...s.snapshot,
    first_job_pressed: jobId,
    placements: s.placements,
    lifts: s.lifts,
    returns: s.returns,
    phase: 'measurement',
    input_mode: inputMode,
  });
}

/**
 * "Do: <job>". The first press (any job, runnable or not) records the
 * board and locks it; then the job runs when every printed requirement is
 * done, else it is refused with a `dependency_error`. A press inside the
 * settle window after a job finished is a carried press — refused.
 */
export function m01Work(
  s: M01State,
  jobId: string,
  nowMs: number,
  inputMode: M01InputMode,
  log: M01LogSink,
): M01WorkResult {
  const job = M01_BATCHES[s.occasion].jobs.find((j) => j.id === jobId);

  if (job === undefined || s.done.includes(jobId) || m01AllDone(s)) {
    return 'refused';
  }

  if (
    s.last_job_done_at_ms !== null &&
    nowMs - s.last_job_done_at_ms < M01_SETTLE_MS
  ) {
    s.refused_presses += 1;
    log('work_press_refused', {
      job_id: jobId,
      reason: 'settling',
      since_last_job_ms: nowMs - s.last_job_done_at_ms,
      settle_ms: M01_SETTLE_MS,
      input_mode: inputMode,
    });

    return 'refused';
  }

  if (s.snapshot === null) {
    takeSnapshot(s, nowMs, jobId, inputMode, log);
  }

  const missing = job.requires.filter((req) => !s.done.includes(req));

  if (missing.length > 0) {
    for (const requires of missing) {
      s.dependency_errors.push({ job_id: jobId, requires, at_ms: nowMs });
    }

    log('dependency_error', {
      job_id: jobId,
      requires: missing,
      error_number: s.dependency_errors.length,
      input_mode: inputMode,
    });

    return 'blocked';
  }

  s.done.push(jobId);
  s.last_job_done_at_ms = nowMs;

  const step = s.done.length;
  const plannedPosition =
    s.snapshot === null ? null : s.snapshot.slots.indexOf(jobId);

  log('job_done', {
    job_id: jobId,
    step,
    planned_position: plannedPosition === -1 ? null : plannedPosition,
    followed_plan: s.snapshot !== null && s.snapshot.slots[step - 1] === jobId,
    input_mode: inputMode,
  });

  return m01AllDone(s) ? 'complete' : 'done';
}

/** Steps whose executed job equals the planned card at that position. */
export function m01PlanAdherence(s: M01State): number | null {
  if (s.snapshot === null) {
    return null;
  }

  return s.done.filter((id, index) => s.snapshot!.slots[index] === id).length;
}

export function m01RawComponents(s: M01State, closureReason: string) {
  return {
    occasion: s.occasion,
    form: s.form,
    observed: s.snapshot !== null,
    planned_jobs: s.snapshot?.planned_jobs ?? null,
    plan_order: s.snapshot?.plan_order ?? null,
    plan_dependency_violations: s.snapshot?.plan_dependency_violations ?? null,
    plan_dependency_violation_count:
      s.snapshot?.plan_dependency_violations.length ?? null,
    held_returned_at_snapshot: s.snapshot?.held_returned ?? null,
    board_final: [...s.slots],
    placements: s.placements,
    lifts: s.lifts,
    returns: s.returns,
    execution_order: [...s.done],
    jobs_done: s.done.length,
    all_done: m01AllDone(s),
    plan_adherence: m01PlanAdherence(s),
    dependency_errors: s.dependency_errors.map((e) => ({ ...e })),
    dependency_error_count: s.dependency_errors.length,
    refused_presses: s.refused_presses,
    first_work_at_ms: s.first_work_at_ms,
    closure_reason: closureReason,
  };
}
