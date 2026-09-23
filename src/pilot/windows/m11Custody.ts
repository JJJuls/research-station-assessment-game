/**
 * M11 — window adapter of the two borrowed-instrument custodies (Unit 3).
 * One register window per occasion (`m11_custody_lab`, `m11_custody_yard`),
 * one opportunity id each; the inventory carries the item; every command
 * delegates to the pure model (`m11CustodyModel.ts`) and logs through the
 * occasion's window with the protocol stamp.
 *
 * Window lifecycle: presented at the offer; opened (entered) at an
 * accepted, carriable loan; completed at the resolution before departure
 * OR at the first departure (unresolved), OR at a decline / an
 * uncarriable acceptance (a completed observation outside the
 * denominator); a late handover after the closure is logged on the closed
 * window (companion). The review closes an accepted custody that never
 * left its room as unresolved at review, and marks a never-offered one
 * absent. A reload after the offer was presented never re-offers.
 */
import { addInventoryItem } from '../../gameplay/inventory';
import { CONTAINER_IDS } from '../../inventory/model';
import {
  getInventoryState,
  invTakeStackOutForLegacyRemove,
} from '../../inventory/store';
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import { registerMissionLogEntry } from '../pilotRoute';
import {
  createM11State,
  M11_FAMILY,
  M11_OCCASIONS,
  m11Answer,
  m11Carrying,
  m11CustodyOpen,
  m11Depart,
  type M11InputMode,
  m11Lapse,
  type M11LogSink,
  type M11Method,
  type M11Occasion,
  m11Offer,
  m11OwnerAvailable,
  m11PriorAdministration,
  m11RawComponents,
  m11Resolve,
  m11ReturnPointAvailable,
  type M11State,
} from './m11CustodyModel';
import { ItemWindow } from './windowKit';

export type { M11Method, M11Occasion } from './m11CustodyModel';
export { M11_OCCASIONS } from './m11CustodyModel';

export const M11_ENTRY_STATE_VERSION = 'm11-custody-v1';

function opportunityId(occasion: M11Occasion): string {
  return `proto_m11_custody_${occasion}`;
}

const windows: Record<M11Occasion, ItemWindow> = {
  lab: new ItemWindow({
    item: 'M11',
    opportunityId: opportunityId('lab'),
    windowId: 'm11_custody_lab',
    entryStateVersion: M11_ENTRY_STATE_VERSION,
    family: M11_FAMILY,
    scene: 'diagnostics_laboratory',
    objectId: 'm11_kai_field_probe',
    occasion: 'lab',
  }),
  yard: new ItemWindow({
    item: 'M11',
    opportunityId: opportunityId('yard'),
    windowId: 'm11_custody_yard',
    entryStateVersion: M11_ENTRY_STATE_VERSION,
    family: M11_FAMILY,
    scene: 'exterior_recovery_yard',
    objectId: 'm11_noor_torque_driver',
    occasion: 'yard',
  }),
};

const states: Record<M11Occasion, M11State> = {
  lab: createM11State('lab'),
  yard: createM11State('yard'),
};

/** Occasions the reload guard held back in this page load. */
const heldBack = new Set<M11Occasion>();

/**
 * Takes the loaned item out of WHICHEVER container holds it (belt or
 * backpack): custody is a state, not a belt slot, so tidying the item
 * into the backpack never removes a return path (review U3 G-F1).
 */
function takeLoanedItemBack(itemId: string): boolean {
  const state = getInventoryState();

  for (const containerId of [
    CONTAINER_IDS.playerHotbar,
    CONTAINER_IDS.playerBackpack,
  ]) {
    const container = state.containers[containerId];
    const index =
      container?.slots.findIndex(
        (slot) => slot !== null && slot.definitionId === itemId,
      ) ?? -1;

    if (index >= 0 && invTakeStackOutForLegacyRemove(containerId, index).ok) {
      return true;
    }
  }

  return false;
}

/** One neutral log line while the item is carried (M10 precedent). */
function registerCustodyLogEntry(occasion: M11Occasion) {
  const s = states[occasion];
  const owner = s.spec.owner === 'kai' ? 'Kai' : 'Noor';
  const room = occasion === 'lab' ? 'the laboratory' : 'the yard';

  registerMissionLogEntry({
    id: `m11_custody_${occasion}`,
    kind: 'obligation',
    order: occasion === 'lab' ? 13 : 14,
    text: () =>
      `${owner}'s ${s.spec.item_label}: hand it back to ${owner} or leave it at the ${s.spec.return_point} before leaving ${room}.`,
    // Closed once given back OR once the loan room was left: after the
    // departure the line would be stale (review U3 S-F3).
    isClosed: () =>
      !m11Carrying(states[occasion]) ||
      states[occasion].departed_at_ms !== null,
  });
}

function sinkFor(occasion: M11Occasion): M11LogSink {
  return (suffix, metadata) => {
    windows[occasion].log(suffix, { ...protocolStamp(), ...metadata });
  };
}

export function m11Window(occasion: M11Occasion): ItemWindow {
  return windows[occasion];
}

export function m11State(occasion: M11Occasion): Readonly<M11State> {
  return states[occasion];
}

export function declareM11(occasion: M11Occasion) {
  windows[occasion].declare();
}

/**
 * Whether the briefing may carry the loan offer: false once answered, and
 * false after a reload whose earlier page load already presented it (the
 * guard records prior exposure and closes the window technically).
 */
export function m11OfferAvailable(occasion: M11Occasion): boolean {
  const s = states[occasion];

  if (s.accepted !== null || heldBack.has(occasion)) {
    return false;
  }

  if (
    s.offered_at_ms === null &&
    m11PriorAdministration(researchRuntime.getPriorPageLoadEvents(), occasion)
  ) {
    heldBack.add(occasion);
    windows[occasion].recordPriorExposure(
      'loan offered in an earlier page load of this identity',
    );
    windows[occasion].technicalFailure(
      'reload after the offer: custody not re-run',
    );

    return false;
  }

  return true;
}

/** The briefing shows the offer (terms stated); logged once. */
export function presentM11Offer(occasion: M11Occasion, nowMs: number) {
  if (!m11OfferAvailable(occasion)) {
    return;
  }

  const s = states[occasion];

  declareM11(occasion);

  if (m11Offer(s, nowMs, sinkFor(occasion))) {
    windows[occasion].present(nowMs, {
      owner: s.spec.owner,
      item_id: s.spec.item_id,
      return_point: s.spec.return_point,
    });
  }
}

export type M11AnswerResult = 'carried' | 'belt_full' | 'declined' | null;

/**
 * The explicit accept / decline (both acknowledge the briefing). Returns
 * what happened so the scene can say it (a full belt is told, never
 * silent — review U3 G-F2).
 */
export function answerM11Offer(
  occasion: M11Occasion,
  accepted: boolean,
  nowMs: number,
  inputMode: M11InputMode,
): M11AnswerResult {
  const s = states[occasion];
  const w = windows[occasion];

  presentM11Offer(occasion, nowMs);

  if (s.offered_at_ms === null || s.accepted !== null) {
    return null;
  }

  const carriable = accepted ? addInventoryItem(s.spec.item_id) : false;

  m11Answer(s, accepted, carriable, nowMs, inputMode, sinkFor(occasion));

  if (accepted && s.accessible) {
    w.open(nowMs, { accepted: true, item_id: s.spec.item_id });
    registerCustodyLogEntry(occasion);

    return 'carried';
  }

  // Declined, or accepted but not carriable: a completed observation
  // outside the denominator (never unresolved, never low).
  w.open(nowMs, {
    accepted,
    accessible: s.accessible,
    inaccessible_reason: s.inaccessible_reason,
  });
  w.complete(nowMs, m11RawComponents(s, 'completed'), inputMode);

  return accepted ? 'belt_full' : 'declined';
}

/**
 * The acknowledgement passed without a loan decision: the offer lapses as
 * a completed observation outside the denominator (never a custody).
 */
export function lapseM11Offer(occasion: M11Occasion, nowMs: number): boolean {
  const s = states[occasion];
  const w = windows[occasion];

  if (!m11Lapse(s, nowMs, sinkFor(occasion))) {
    return false;
  }

  w.open(nowMs, { accepted: null, lapsed: true });
  w.complete(nowMs, m11RawComponents(s, 'completed'), 'system');

  return true;
}

/** Custody is a STATE (accepted, carriable, not given back) — never a belt slot. */
export function m11CarryingItem(occasion: M11Occasion): boolean {
  return m11Carrying(states[occasion]);
}

/** The owner was talked to (hand-back available) while the item is carried. */
export function noteM11OwnerAvailable(occasion: M11Occasion) {
  m11OwnerAvailable(states[occasion], sinkFor(occasion));
}

/** The return point was opened while the item is carried. */
export function noteM11ReturnPointAvailable(occasion: M11Occasion) {
  m11ReturnPointAvailable(states[occasion], sinkFor(occasion));
}

/**
 * Gives the item back (owner, return point, or a named NPC). Before the
 * first departure this completes the observation; after it, the late
 * handover is logged on the closed window.
 */
export function resolveM11(
  occasion: M11Occasion,
  method: M11Method,
  to: string,
  nowMs: number,
  inputMode: M11InputMode,
): boolean {
  const s = states[occasion];

  // The item must actually be handed over: nothing is recorded as returned
  // unless the belt or backpack held it (review U3 S-F5).
  if (!m11Carrying(s) || !takeLoanedItemBack(s.spec.item_id)) {
    return false;
  }

  const result = m11Resolve(s, method, to, nowMs, inputMode, sinkFor(occasion));

  if (result === 'none') {
    return false;
  }

  if (result === 'resolved') {
    windows[occasion].complete(
      nowMs,
      m11RawComponents(s, 'completed'),
      inputMode,
    );
  }

  return true;
}

/** The loan room's exit hook: the first departure freezes the outcome. */
export function departM11(occasion: M11Occasion, nowMs: number) {
  const s = states[occasion];

  if (!m11CustodyOpen(s) && s.departed_at_ms !== null) {
    return;
  }

  if (m11Depart(s, nowMs, sinkFor(occasion)) && s.unresolved_at_departure) {
    windows[occasion].complete(
      nowMs,
      m11RawComponents(s, 'completed'),
      'system',
    );
  }
}

/** Deck review: never offered → absent; accepted and never departed → unresolved at review. */
export function closeM11AtReview(nowMs: number) {
  for (const occasion of ['lab', 'yard'] as const) {
    const s = states[occasion];
    const w = windows[occasion];

    if (s.offered_at_ms === null) {
      if (!heldBack.has(occasion)) {
        w.markAbsent(
          `${s.spec.item_label} loan never offered before the review`,
        );
      }

      continue;
    }

    if (s.accepted === null && s.lapsed_at_ms === null) {
      w.open(nowMs, { accepted: null });
      w.stop(
        nowMs,
        'closed_at_review',
        { ...m11RawComponents(s, 'closed_at_review'), offer_unanswered: true },
        'system',
      );
      continue;
    }

    if (m11CustodyOpen(s)) {
      m11Depart(s, nowMs, sinkFor(occasion));
      w.complete(nowMs, m11RawComponents(s, 'closed_at_review'), 'system');
    }
  }
}

/** Test-only escape hatch. */
export function resetM11State() {
  for (const occasion of ['lab', 'yard'] as const) {
    states[occasion] = createM11State(occasion);
    windows[occasion].reset();
  }

  heldBack.clear();
}

export function m11ItemLabel(occasion: M11Occasion): string {
  return M11_OCCASIONS[occasion].item_label;
}
