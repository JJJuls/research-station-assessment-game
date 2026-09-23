/**
 * M11 — Responsible custody: the borrowed-instrument model (Station 080
 * M01–M26 run, Unit 3). PURE (no Phaser, no runtime import): the window
 * adapter (`m11Custody.ts`) owns the register windows, the inventory and
 * the log sink; the scenes call the commands below with their input mode.
 *
 * Approved design (specification, M11 row): two brief borrowed-instrument
 * occasions in different rooms; ownership and return options clear; the
 * participant may return the item, hand it to a named person, or depart
 * with custody unresolved; objects disjoint from M03 and M04.
 *
 * Mechanic: at each room briefing the owner (Kai in the Laboratory, Noor
 * in the Yard) offers a personal instrument with the terms stated —
 * "it is mine; hand it back to me or leave it at <return point> before
 * you leave". The plain acknowledgement is always the first option;
 * taking the loan or refusing it are deliberate further options (review
 * U3 S-F1: a pre-focused first option must never accept a loan). A loan
 * neither taken nor refused at the acknowledgement LAPSES — outside the
 * denominator, distinct from an explicit refusal. While carried, the owner
 * offers the hand-back and the return
 * point accepts the item. The FIRST departure from the loan room freezes
 * the outcome: resolved (owner / return point) or unresolved. A later
 * handover (to the owner on the way back, or to the other named NPC) is
 * recorded as a late resolution — never the primary.
 *
 * Measure (register `m11_unresolved_custodies`): custodies unresolved at
 * first departure / accepted, accessible custodies (0–2). Refusing the
 * loan is not irresponsible (outside the denominator); an item that could
 * not be carried (belt full) is inaccessible (outside the denominator).
 * Exploratory counterpart only; nothing here is a score.
 */

export type M11Occasion = 'lab' | 'yard';
export type M11Method = 'owner_handover' | 'return_point' | 'named_handover';
export type M11InputMode = 'pointer' | 'keyboard' | 'system';
export type M11LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export const M11_FAMILY = 'proto_m11_custody_';
export const M11_TERMS_VERSION = 'm11-terms-v1';

export interface M11OccasionSpec {
  occasion: M11Occasion;
  owner: string;
  item_id: string;
  item_label: string;
  return_point: string;
  room: string;
}

export const M11_OCCASIONS: Record<M11Occasion, M11OccasionSpec> = {
  lab: {
    occasion: 'lab',
    owner: 'kai',
    item_id: 'kai_field_probe',
    item_label: 'field probe',
    return_point: 'signal analysis workstation',
    room: 'diagnostics_laboratory',
  },
  yard: {
    occasion: 'yard',
    owner: 'noor',
    item_id: 'noor_torque_driver',
    item_label: 'torque driver',
    return_point: 'yard supply crate',
    room: 'exterior_recovery_yard',
  },
};

export interface M11Resolution {
  method: M11Method;
  /** Who received the item (owner id, the return point, or a named NPC). */
  to: string;
  at_ms: number;
}

export interface M11State {
  spec: M11OccasionSpec;
  offered_at_ms: number | null;
  /** null = unanswered; true / false = explicit answer. */
  accepted: boolean | null;
  answered_at_ms: number | null;
  /** The acknowledgement passed without taking or refusing the loan. */
  lapsed_at_ms: number | null;
  /** False only when the item could not be carried (belt full). */
  accessible: boolean;
  inaccessible_reason: string | null;
  /** Resolution BEFORE the first departure (the primary evidence). */
  resolution: M11Resolution | null;
  departed_at_ms: number | null;
  /** Frozen at the first departure: accepted, accessible and unresolved. */
  unresolved_at_departure: boolean | null;
  /** A handover after the first departure (companion only). */
  late_resolution: M11Resolution | null;
  owner_encounters_while_carrying: number;
  return_point_encounters_while_carrying: number;
  closure_reason: string | null;
}

export function createM11State(occasion: M11Occasion): M11State {
  return {
    spec: M11_OCCASIONS[occasion],
    offered_at_ms: null,
    accepted: null,
    answered_at_ms: null,
    lapsed_at_ms: null,
    accessible: true,
    inaccessible_reason: null,
    resolution: null,
    departed_at_ms: null,
    unresolved_at_departure: null,
    late_resolution: null,
    owner_encounters_while_carrying: 0,
    return_point_encounters_while_carrying: 0,
    closure_reason: null,
  };
}

/** The item is in the participant's custody (accepted, carriable, not yet given back). */
export function m11Carrying(s: M11State): boolean {
  return (
    s.accepted === true &&
    s.accessible &&
    s.resolution === null &&
    s.late_resolution === null
  );
}

/** Custody is open for the primary observation (before the first departure). */
export function m11CustodyOpen(s: M11State): boolean {
  return m11Carrying(s) && s.departed_at_ms === null;
}

export function m11Offer(s: M11State, nowMs: number, log: M11LogSink): boolean {
  if (s.offered_at_ms !== null) {
    return false;
  }

  s.offered_at_ms = nowMs;
  log('offer_presented', {
    occasion: s.spec.occasion,
    owner: s.spec.owner,
    item_id: s.spec.item_id,
    return_point: s.spec.return_point,
    terms_version: M11_TERMS_VERSION,
    input_mode: 'system',
  });

  return true;
}

/**
 * The explicit answer. `carriable` is the inventory's verdict (false when
 * the belt is full): an accepted loan that cannot be carried is an
 * inaccessible custody, never an unresolved one.
 */
export function m11Answer(
  s: M11State,
  accepted: boolean,
  carriable: boolean,
  nowMs: number,
  inputMode: M11InputMode,
  log: M11LogSink,
): boolean {
  if (
    s.offered_at_ms === null ||
    s.accepted !== null ||
    s.lapsed_at_ms !== null
  ) {
    return false;
  }

  s.accepted = accepted;
  s.answered_at_ms = nowMs;

  if (accepted && !carriable) {
    s.accessible = false;
    s.inaccessible_reason = 'belt_full';
  }

  log('offer_answered', {
    occasion: s.spec.occasion,
    accepted,
    accessible: s.accessible,
    inaccessible_reason: s.inaccessible_reason,
    input_mode: inputMode,
  });

  if (accepted && s.accessible) {
    log('custody_started', {
      occasion: s.spec.occasion,
      item_id: s.spec.item_id,
      input_mode: 'system',
    });
  }

  return true;
}

/**
 * The acknowledgement passed without a loan decision: the offer lapses.
 * Not a refusal, not a custody — outside the denominator, kept distinct.
 */
export function m11Lapse(s: M11State, nowMs: number, log: M11LogSink): boolean {
  if (
    s.offered_at_ms === null ||
    s.accepted !== null ||
    s.lapsed_at_ms !== null
  ) {
    return false;
  }

  s.lapsed_at_ms = nowMs;
  log('offer_lapsed', {
    occasion: s.spec.occasion,
    input_mode: 'system',
  });

  return true;
}

/** The owner was available (talked to) while the item was carried. */
export function m11OwnerAvailable(s: M11State, log: M11LogSink) {
  if (!m11Carrying(s)) {
    return;
  }

  s.owner_encounters_while_carrying += 1;
  log('owner_available', {
    occasion: s.spec.occasion,
    encounter: s.owner_encounters_while_carrying,
    after_departure: s.departed_at_ms !== null,
    input_mode: 'system',
  });
}

/** The return point was opened while the item was carried. */
export function m11ReturnPointAvailable(s: M11State, log: M11LogSink) {
  if (!m11Carrying(s)) {
    return;
  }

  s.return_point_encounters_while_carrying += 1;
  log('return_point_available', {
    occasion: s.spec.occasion,
    encounter: s.return_point_encounters_while_carrying,
    after_departure: s.departed_at_ms !== null,
    input_mode: 'system',
  });
}

/**
 * Gives the item back. Before the first departure this is the primary
 * resolution; after it, a late resolution (companion). Returns which.
 */
export function m11Resolve(
  s: M11State,
  method: M11Method,
  to: string,
  nowMs: number,
  inputMode: M11InputMode,
  log: M11LogSink,
): 'resolved' | 'late' | 'none' {
  if (!m11Carrying(s)) {
    return 'none';
  }

  const resolution: M11Resolution = { method, to, at_ms: nowMs };

  if (s.departed_at_ms === null) {
    s.resolution = resolution;
    log('resolved', {
      occasion: s.spec.occasion,
      method,
      to,
      custody_ms: nowMs - (s.answered_at_ms ?? nowMs),
      input_mode: inputMode,
    });

    return 'resolved';
  }

  s.late_resolution = resolution;
  log('late_resolved', {
    occasion: s.spec.occasion,
    method,
    to,
    after_departure_ms: nowMs - s.departed_at_ms,
    input_mode: inputMode,
  });

  return 'late';
}

/**
 * The first departure from the loan room freezes the primary outcome.
 * Later departures are ignored. Returns true when an accepted, accessible
 * custody was frozen (resolved or unresolved) by this call.
 */
export function m11Depart(
  s: M11State,
  nowMs: number,
  log: M11LogSink,
): boolean {
  if (s.departed_at_ms !== null || s.accepted !== true || !s.accessible) {
    return false;
  }

  s.departed_at_ms = nowMs;
  s.unresolved_at_departure = s.resolution === null;
  log('departed', {
    occasion: s.spec.occasion,
    unresolved: s.unresolved_at_departure,
    custody_ms: nowMs - (s.answered_at_ms ?? nowMs),
    input_mode: 'system',
  });

  return true;
}

/** Raw components for the window closure (state description, never a score). */
export function m11RawComponents(s: M11State, closureReason: string) {
  return {
    occasion: s.spec.occasion,
    owner: s.spec.owner,
    item_id: s.spec.item_id,
    return_point: s.spec.return_point,
    terms_version: M11_TERMS_VERSION,
    offered: s.offered_at_ms !== null,
    accepted: s.accepted,
    lapsed: s.lapsed_at_ms !== null,
    accessible: s.accessible,
    inaccessible_reason: s.inaccessible_reason,
    // Objective accessibility of the resolution paths (design constants:
    // the owner and the return point stand in the loan room throughout).
    owner_accessible: true,
    return_point_accessible: true,
    custody_ms:
      s.answered_at_ms === null || s.accepted !== true || !s.accessible
        ? null
        : (s.resolution?.at_ms ?? s.departed_at_ms ?? null) === null
          ? null
          : (s.resolution?.at_ms ?? s.departed_at_ms ?? 0) - s.answered_at_ms,
    resolved_before_departure: s.resolution !== null,
    resolution: s.resolution,
    departed: s.departed_at_ms !== null,
    unresolved_at_departure: s.unresolved_at_departure,
    late_resolution: s.late_resolution,
    owner_encounters_while_carrying: s.owner_encounters_while_carrying,
    return_point_encounters_while_carrying:
      s.return_point_encounters_while_carrying,
    closure_reason: closureReason,
  };
}

/**
 * Reload guard: true when an earlier page load already presented this
 * occasion's offer — it is then never offered again in this load.
 */
export function m11PriorAdministration(
  priorLoadEvents: readonly {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[],
  occasion: M11Occasion,
): boolean {
  return priorLoadEvents.some(
    (event) =>
      event.event_type === `${M11_FAMILY}offer_presented` &&
      event.metadata?.occasion === occasion,
  );
}
