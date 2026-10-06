/**
 * M10 — window adapter of the two deliveries (Station 080 M01–M26 run,
 * Unit 15). One register window per delivery (`m10_delivery_d1` — the
 * calibration key card, Vale → Kai; `m10_delivery_d2` — the yard logbook,
 * Noor → Vale), one opportunity id each; every command delegates to the
 * pure model (`m10DeliveryModel.ts`) and logs through the delivery's
 * window with the protocol stamp. The objects are states of the model,
 * never belt or backpack items.
 *
 * Window lifecycle: presented at the offer; a decline opens and completes
 * it outside the denominator; acceptance opens it; it completes at the
 * ONE terminal outcome — handed to the recipient, left with the colleague
 * who agreed to take it, or still carried when the station record closes
 * at the shift review. An act after the closure is logged on the closed
 * window as a late act. An unanswered offer closes at the review as such;
 * an offer never presented is absent; an offer presented in an earlier
 * page load is never re-run (a later, never-presented delivery runs
 * normally). The v2 single-promise family keeps its meaning in the frozen
 * ledger and is no longer on the route.
 */
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import type { ObservedInput } from '../inputObservation';
import {
  pilotMissionLog,
  pilotStage,
  pilotZoneEntryCount,
  type PilotZoneKey,
  registerMissionLogEntry,
} from '../pilotRoute';
import {
  createM10State,
  M10_DELIVERIES,
  M10_DELIVERY_IDS,
  M10_ENTRY_STATE_VERSION,
  M10_FAMILY,
  M10_LOG_LINES,
  type M10ActResult,
  m10Answer,
  type M10AnswerResult,
  m10Carrying,
  type M10Channel,
  m10Close,
  m10Defer,
  type M10DeferResult,
  m10Delegate,
  m10DelegateAccepted,
  type M10Delivery,
  m10HandOver,
  m10InterruptionAcknowledged,
  m10InterruptionShown,
  type M10LogSink,
  m10ObligationOpen,
  m10ObligationShown,
  type M10Person,
  m10PersonPresent,
  m10Present,
  m10PressAllowed,
  m10PriorAdministration,
  m10RawComponents,
  m10RecipientPromptOpened,
  type M10State,
  type M10Step,
  m10StepShown,
} from './m10DeliveryModel';
import { ItemWindow } from './windowKit';

export * from './m10DeliveryModel';

/** The station map lists the first seven open lines (StationMapScene). */
const STATION_LOG_VISIBLE_LINES = 7;

/**
 * A delivery's window: every event of the family carries the protocol
 * stamp, and `presented` carries the offer's snapshot.
 */
class DeliveryWindow extends ItemWindow {
  private offerSnapshot: Record<string, unknown> = {};

  presentWith(nowMs: number, snapshot: Record<string, unknown>) {
    this.offerSnapshot = { ...snapshot };
    this.present(nowMs, snapshot);
  }

  log(suffix: string, metadata: Record<string, unknown> = {}) {
    super.log(suffix, {
      ...protocolStamp(),
      delivery: this.spec.occasion ?? null,
      ...(suffix === 'presented' ? this.offerSnapshot : {}),
      ...metadata,
    });
  }

  reset() {
    super.reset();
    this.offerSnapshot = {};
  }
}

function deliveryWindow(delivery: M10Delivery): DeliveryWindow {
  const spec = M10_DELIVERIES[delivery];

  return new DeliveryWindow({
    item: 'M10',
    opportunityId: spec.opportunity_id,
    windowId: spec.window_id,
    entryStateVersion: M10_ENTRY_STATE_VERSION,
    family: M10_FAMILY,
    scene: spec.offer_zone,
    objectId: spec.object_id,
    occasion: delivery,
  });
}

const windows: Record<M10Delivery, DeliveryWindow> = {
  d1: deliveryWindow('d1'),
  d2: deliveryWindow('d2'),
};

const states: Record<M10Delivery, M10State> = {
  d1: createM10State('d1'),
  d2: createM10State('d2'),
};

/** Deliveries the reload guard held back in this page load. */
const heldBack = new Set<M10Delivery>();

function sinkFor(delivery: M10Delivery): M10LogSink {
  return (suffix, metadata) => {
    windows[delivery].log(suffix, metadata);
  };
}

function logEntryId(delivery: M10Delivery): string {
  return `m10_delivery_${delivery}`;
}

export function m10Window(delivery: M10Delivery): ItemWindow {
  return windows[delivery];
}

export function m10State(delivery: M10Delivery): Readonly<M10State> {
  return states[delivery];
}

export function declareM10(delivery: M10Delivery) {
  windows[delivery].declare();
}

/** The object is with the participant (also after an unfulfilled closure). */
export function m10CarryingDelivery(delivery: M10Delivery): boolean {
  return m10Carrying(states[delivery]);
}

/** Deliveries carried right now, in their fixed order. */
export function m10CarriedDeliveries(): M10Delivery[] {
  return M10_DELIVERY_IDS.filter((delivery) => m10Carrying(states[delivery]));
}

/** The answer of one delivery for a neighbouring window's entry snapshot. */
export function m10DeliveryAccepted(delivery: M10Delivery): boolean | null {
  const { answer } = states[delivery];

  return answer === null ? null : answer === 'accept';
}

export function m10InterruptionWasShown(): boolean {
  return states.d1.interruption_shown_at_ms !== null;
}

// ——— Offer ————————————————————————————————————————————————————————————

/**
 * Reload guard: an offer presented in an earlier page load of this
 * identity is never re-run — prior exposure recorded, the opportunity
 * technically incomplete, the feature `interrupted`.
 */
export function guardM10Reload(delivery: M10Delivery): boolean {
  if (heldBack.has(delivery)) {
    return true;
  }

  if (
    states[delivery].presented_at_ms !== null ||
    !m10PriorAdministration(researchRuntime.getPriorPageLoadEvents(), delivery)
  ) {
    return false;
  }

  heldBack.add(delivery);
  windows[delivery].recordPriorExposure(
    `${M10_DELIVERIES[delivery].object_label} delivery offered in an earlier page load of this identity`,
  );
  windows[delivery].technicalFailure(
    'reload after the offer: delivery not re-run',
  );

  return true;
}

/** The offer stage may be shown: not answered, not held back, not closed. */
export function m10OfferAvailable(delivery: M10Delivery): boolean {
  return (
    states[delivery].answer === null &&
    !guardM10Reload(delivery) &&
    !windows[delivery].isClosed()
  );
}

/** The offer was shown before and is still unanswered (the re-ask case). */
export function m10OfferDeferred(delivery: M10Delivery): boolean {
  return (
    states[delivery].presented_at_ms !== null && m10OfferAvailable(delivery)
  );
}

/** The issuer shows the offer stage (presented once; a re-showing moves the settle reference). */
export function presentM10Offer(delivery: M10Delivery, nowMs: number): boolean {
  if (!m10OfferAvailable(delivery)) {
    return false;
  }

  declareM10(delivery);
  m10Present(states[delivery], nowMs, (suffix, metadata) => {
    if (suffix === 'presented') {
      windows[delivery].presentWith(nowMs, metadata);
    } else {
      sinkFor(delivery)(suffix, metadata);
    }
  });

  return true;
}

/**
 * Accept or decline (both deliberate). Acceptance opens the delivery and
 * lists it in the station log; a decline is a completed observation
 * outside the denominator; a press inside the settle window is refused
 * (the caller re-presents the stage).
 */
export function answerM10Offer(
  delivery: M10Delivery,
  answer: 'accept' | 'decline',
  optionPosition: number,
  optionCount: number,
  nowMs: number,
  input: ObservedInput,
): M10AnswerResult {
  if (!m10OfferAvailable(delivery)) {
    return 'invalid';
  }

  const s = states[delivery];
  const w = windows[delivery];
  const result = m10Answer(
    s,
    answer,
    optionPosition,
    optionCount,
    nowMs,
    input,
    sinkFor(delivery),
  );

  if (result === 'accepted') {
    w.open(nowMs, { accepted: true, stage: pilotStage() });
    registerMissionLogEntry({
      id: logEntryId(delivery),
      kind: 'obligation',
      order: s.spec.log_order,
      text: () => M10_LOG_LINES[delivery],
      isClosed: () => !m10ObligationOpen(states[delivery]),
    });
  } else if (result === 'declined') {
    w.open(nowMs, { accepted: false, stage: pilotStage() });
    m10Close(s, nowMs, 'declined');
    w.complete(nowMs, m10RawComponents(s, 'declined'), 'system');
  }

  return result;
}

/** "Ask me again later." — only the settle window applies; nothing is answered. */
export function deferM10Offer(
  delivery: M10Delivery,
  optionPosition: number,
  optionCount: number,
  nowMs: number,
): M10DeferResult {
  if (!m10OfferAvailable(delivery)) {
    return 'invalid';
  }

  return m10Defer(
    states[delivery],
    optionPosition,
    optionCount,
    nowMs,
    sinkFor(delivery),
  );
}

// ——— Interruption, recap and exposures ————————————————————————————————

/** The standardised interruption was shown (host stage) after d1's acceptance. */
export function noteM10InterruptionShown(nowMs: number) {
  m10InterruptionShown(states.d1, nowMs, sinkFor('d1'));
}

export function noteM10InterruptionAcknowledged(
  nowMs: number,
  input: ObservedInput,
) {
  m10InterruptionAcknowledged(states.d1, nowMs, input, sinkFor('d1'));
}

/** The recap stage after the alarm appeared: the obligation shown again. */
export function noteM10RecapShown(nowMs: number, fresh: boolean) {
  m10StepShown(states.d1, 'recap', nowMs);

  if (fresh) {
    m10ObligationShown(
      states.d1,
      'after_interruption',
      ['d1'],
      { line_id: 'm10_recap_d1' },
      sinkFor('d1'),
    );
  }
}

/** A press on a settle-guarded stage of one delivery (true = allowed). */
export function m10StagePress(
  delivery: M10Delivery,
  step: M10Step,
  optionPosition: number,
  optionCount: number,
  nowMs: number,
): boolean {
  return m10PressAllowed(
    states[delivery],
    step,
    optionPosition,
    optionCount,
    nowMs,
    sinkFor(delivery),
  );
}

function showObligations(channel: M10Channel, detail: Record<string, unknown>) {
  const carried = m10CarriedDeliveries();

  for (const delivery of carried) {
    m10ObligationShown(
      states[delivery],
      channel,
      carried,
      detail,
      sinkFor(delivery),
    );
  }
}

/**
 * The station log was opened: one exposure record per carried delivery
 * whose line the log lists (its position, whether the map could show it).
 * After the record closure the log shows its notice instead — nothing is
 * recorded.
 */
export function noteM10ReminderLogViewed() {
  const log = pilotMissionLog();
  const carried = m10CarriedDeliveries();

  for (const delivery of carried) {
    const position =
      log.findIndex((entry) => entry.id === logEntryId(delivery)) + 1;

    if (position < 1) {
      continue;
    }

    m10ObligationShown(
      states[delivery],
      'station_log',
      carried,
      {
        log_position: position,
        rendered: position <= STATION_LOG_VISIBLE_LINES,
      },
      sinkFor(delivery),
    );
  }
}

// ——— Deliveries menu ——————————————————————————————————————————————————

export type M10MenuAction =
  | { kind: 'handover'; delivery: M10Delivery }
  | { kind: 'delegate'; delivery: M10Delivery }
  | { kind: 'reask'; delivery: M10Delivery };

/**
 * What a named colleague can do about the deliveries right now: take the
 * one they are the recipient of, agree to carry the one they are the
 * permitted delegate of, or (the issuer) ask again about a deferred offer.
 */
export function m10MenuActions(person: M10Person): M10MenuAction[] {
  const actions: M10MenuAction[] = [];

  for (const delivery of M10_DELIVERY_IDS) {
    const s = states[delivery];

    if (m10Carrying(s) && person === s.spec.recipient) {
      actions.push({ kind: 'handover', delivery });
    }
  }

  for (const delivery of M10_DELIVERY_IDS) {
    const s = states[delivery];

    if (m10Carrying(s) && person === s.spec.permitted_delegate) {
      actions.push({ kind: 'delegate', delivery });
    }
  }

  for (const delivery of M10_DELIVERY_IDS) {
    // Only the yard offer is asked again from a menu (Vale's own re-ask
    // stays in her handover menu).
    if (
      delivery === 'd2' &&
      person === states[delivery].spec.issuer &&
      m10OfferDeferred(delivery)
    ) {
      actions.push({ kind: 'reask', delivery });
    }
  }

  return actions;
}

/** The delivery whose window records this menu's refused presses. */
function menuAnchor(person: M10Person): M10Delivery {
  return m10MenuActions(person)[0]?.delivery ?? 'd1';
}

/**
 * The deliveries menu appeared. A fresh opening records the obligation
 * shown for every carried delivery; a re-presentation after a refused
 * press only moves the settle reference.
 */
export function noteM10MenuShown(
  person: M10Person,
  nowMs: number,
  fresh: boolean,
) {
  for (const delivery of M10_DELIVERY_IDS) {
    m10StepShown(states[delivery], 'deliveries_menu', nowMs);
  }

  if (fresh) {
    showObligations('deliveries_menu', { with: person });
  }
}

export function m10MenuPress(
  person: M10Person,
  optionPosition: number,
  optionCount: number,
  nowMs: number,
): boolean {
  return m10StagePress(
    menuAnchor(person),
    'deliveries_menu',
    optionPosition,
    optionCount,
    nowMs,
  );
}

// ——— Presence ———————————————————————————————————————————————————————

/**
 * A named colleague stands in the zone the participant is in and can act
 * on a delivery there: the objective accessibility record of every
 * carried delivery that person is the recipient or the permitted delegate
 * of (once per person and zone visit).
 */
export function noteM10PersonPresent(person: M10Person, zone: PilotZoneKey) {
  for (const delivery of M10_DELIVERY_IDS) {
    m10PersonPresent(
      states[delivery],
      person,
      zone,
      pilotStage(),
      pilotZoneEntryCount(zone),
      sinkFor(delivery),
    );
  }
}

/** A colleague's conversation was opened: recorded for the deliveries they receive. */
export function noteM10RecipientPrompt(person: M10Person, zone: PilotZoneKey) {
  for (const delivery of M10_DELIVERY_IDS) {
    if (states[delivery].spec.recipient === person) {
      m10RecipientPromptOpened(
        states[delivery],
        zone,
        pilotStage(),
        sinkFor(delivery),
      );
    }
  }
}

// ——— Terminal acts ————————————————————————————————————————————————————

function complete(delivery: M10Delivery, nowMs: number) {
  const s = states[delivery];

  m10Close(s, nowMs, 'completed');
  windows[delivery].complete(nowMs, m10RawComponents(s, 'completed'), 'system');
}

/** The hand-over to the recipient (terminal before the closure; late after it). */
export function handOverM10(
  delivery: M10Delivery,
  to: M10Person,
  nowMs: number,
  input: ObservedInput,
): M10ActResult {
  const result = m10HandOver(
    states[delivery],
    to,
    M10_DELIVERIES[delivery].object_id,
    nowMs,
    input,
    sinkFor(delivery),
  );

  if (result === 'direct') {
    complete(delivery, nowMs);
  }

  return result;
}

/** The delegate's confirmation stage appeared: their stated acceptance. */
export function noteM10DelegateConfirmShown(
  delivery: M10Delivery,
  delegate: M10Person,
  nowMs: number,
): boolean {
  return m10DelegateAccepted(
    states[delivery],
    delegate,
    nowMs,
    sinkFor(delivery),
  );
}

/** Leaving the object with the colleague who agreed (terminal before the closure; late after it). */
export function delegateM10(
  delivery: M10Delivery,
  to: M10Person,
  nowMs: number,
  input: ObservedInput,
): M10ActResult {
  const result = m10Delegate(
    states[delivery],
    to,
    nowMs,
    input,
    sinkFor(delivery),
  );

  if (result === 'delegated') {
    complete(delivery, nowMs);
  }

  return result;
}

// ——— Review ———————————————————————————————————————————————————————————

/**
 * Deck review (the station-record closure — both deliveries' deadline):
 * a delivery still carried closes unfulfilled, as a completed observation;
 * an unanswered offer closes as such; one never offered is absent.
 */
export function closeM10AtReview(nowMs: number) {
  for (const delivery of M10_DELIVERY_IDS) {
    const s = states[delivery];
    const w = windows[delivery];

    if (heldBack.has(delivery)) {
      continue;
    }

    if (s.presented_at_ms === null) {
      w.markAbsent(
        `${s.spec.object_label} delivery never offered before the review`,
      );
      continue;
    }

    if (s.answer === null) {
      w.open(nowMs, { accepted: null });
      w.stop(
        nowMs,
        'closed_at_review',
        {
          ...m10RawComponents(s, 'closed_at_review'),
          offer_unanswered: true,
        },
        'system',
      );
      m10Close(s, nowMs, 'closed_at_review');
      continue;
    }

    if (m10ObligationOpen(s)) {
      m10Close(s, nowMs, 'closed_at_review');
      w.complete(nowMs, m10RawComponents(s, 'closed_at_review'), 'system');
    }
  }
}

/** Test-only escape hatch. */
export function resetM10State() {
  for (const delivery of M10_DELIVERY_IDS) {
    states[delivery] = createM10State(delivery);
    windows[delivery].reset();
  }

  heldBack.clear();
}
