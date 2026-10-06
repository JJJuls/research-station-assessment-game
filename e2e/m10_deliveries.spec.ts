/**
 * Station 080 M10 — two separately accepted deliveries (Unit 15), pure
 * tests.
 *
 * Playwright test blocks that never touch `page`: the two independent
 * offers (accept / decline / later, settle-guarded); the direct handover
 * (only to the recipient, only the delivery's own object); the accountable
 * delegation (only the permitted delegate, only after their stated
 * acceptance); the deadline (unfulfilled vs inaccessible); late acts after
 * the closure; the interruption and its recap (delivery 1 only); the
 * read-only extractor on 2 / 2, 1 / 1, 0 / 1 and every disposition; the
 * CONDITIONAL invariants (legitimate missingness is never a technical
 * failure; contradictory evidence is); immutability; and the copy.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { registerEntry } from '../src/measurement/registerV3';
import type { ObservedInput } from '../src/pilot/inputObservation';
import { M03_SPEC } from '../src/pilot/windows/m03RestoreModel';
import {
  createM10State,
  M10_D1_REASK_LABEL,
  M10_D2_ANSWER_FEEDBACK,
  M10_D2_REASK_BODY,
  M10_D2_REASK_LABEL,
  M10_DEADLINE,
  M10_DELEGATE_KEEP_LABEL,
  M10_DELEGATE_LABELS,
  M10_DELIVERIES,
  M10_DELIVERY_IDS,
  M10_ENTRY_STATE_VERSION,
  M10_FAMILY,
  M10_HANDOVER_FEEDBACK,
  M10_HANDOVER_LABELS,
  M10_INTERRUPTION_ACK_LABEL,
  M10_INTERRUPTION_TEXT,
  M10_LOG_LINES,
  M10_MENU_ENTRY_LABEL,
  M10_MENU_NOT_NOW_LABEL,
  M10_OFFER_BODY,
  M10_OFFER_LABELS,
  M10_OFFER_TAGS,
  M10_RECAP_ACK_LABEL,
  M10_RECAP_BODY,
  M10_SETTLE_MS,
  m10Answer,
  m10Carrying,
  m10Close,
  m10Defer,
  m10Delegate,
  m10DelegateAccepted,
  m10DelegateConfirmBody,
  m10DelegateConfirmLabel,
  m10DelegateFeedback,
  type M10Delivery,
  m10HandOver,
  m10InterruptionAcknowledged,
  m10InterruptionShown,
  type M10LogSink,
  m10MenuBody,
  m10ObligationOpen,
  m10ObligationShown,
  m10PersonPresent,
  m10Present,
  m10PressAllowed,
  m10PriorAdministration,
  m10RawComponents,
  m10RecipientPromptOpened,
  type M10State,
  m10StepShown,
} from '../src/pilot/windows/m10DeliveryModel';
import { M11_OCCASIONS } from '../src/pilot/windows/m11CustodyModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

const KEY: ObservedInput = {
  input_mode: 'keyboard',
  input_mode_basis: 'window_keydown',
};
const POINTER: ObservedInput = {
  input_mode: 'pointer',
  input_mode_basis: 'window_pointerdown',
};
const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const FORBIDDEN =
  /proto_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|persist|valid|grit|resilien|dependable|reliable/i;
const KEY_CARD = M10_DELIVERIES.d1.object_id;
const LOGBOOK = M10_DELIVERIES.d2.object_id;

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    delivery: M10Delivery,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: M10_DELIVERIES[delivery].offer_zone,
      event_type: `${M10_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: M10_DELIVERIES[delivery].opportunity_id,
        entry_state_version: M10_ENTRY_STATE_VERSION,
        delivery,
        ...metadata,
      },
    });
  };

  return {
    events,
    sink:
      (delivery: M10Delivery): M10LogSink =>
      (suffix, metadata) =>
        push(delivery, suffix, metadata),
    opened: (delivery: M10Delivery) =>
      push(delivery, 'opportunity_opened', { input_mode: 'system' }),
    /** The window's closure after a terminal act, a decline or the review. */
    close: (s: M10State, nowMs: number, reason = 'completed') => {
      m10Close(s, nowMs, reason);
      push(s.spec.delivery, 'window_closed', {
        exit_state:
          reason === 'closed_at_review' ? 'closed_at_review' : 'completed',
        raw_components: m10RawComponents(s, reason),
      });
    },
    closeUnanswered: (s: M10State, nowMs: number) => {
      push(s.spec.delivery, 'window_closed', {
        exit_state: 'closed_at_review',
        raw_components_partial: {
          ...m10RawComponents(s, 'closed_at_review'),
          offer_unanswered: true,
        },
      });
      m10Close(s, nowMs, 'closed_at_review');
    },
    heldBack: (delivery: M10Delivery) =>
      push(delivery, 'technical_failure', {
        detail: 'reload after the offer: delivery not re-run',
        input_mode: 'system',
      }),
    /** Route telemetry of a read offer choice (never part of the family). */
    beat: (tag: string) =>
      events.push({
        session_id: 's',
        timestamp_ms: events.length,
        scene: 'station_concourse',
        event_type: 'pilot_npc_beat',
        choice_value: tag,
        sequence: events.length + 1,
        page_load_index: 1,
        metadata: {},
      }),
  };
}

type Harness = ReturnType<typeof harness>;

/** The offer shown at `at`, answered 400 ms later (past the settle window). */
function offer(
  h: Harness,
  delivery: M10Delivery,
  answer: 'accept' | 'decline',
  at: number,
): M10State {
  const s = createM10State(delivery);

  m10Present(s, at, h.sink(delivery));
  expect(m10Answer(s, answer, 1, 3, at + 400, KEY, h.sink(delivery))).toBe(
    answer === 'accept' ? 'accepted' : 'declined',
  );
  h.opened(delivery);

  if (answer === 'decline') {
    h.close(s, at + 400, 'declined');
  }

  return s;
}

function feature(events: readonly RawGameEvent[], context = CONTEXT) {
  return extractItemFeatures('M10', events, context)[0];
}

interface DeliveryComponent {
  status: string;
  answer: string | null;
  deferrals: number;
  accessible: boolean | null;
  accessibility_basis: string | null;
  path: string | null;
  terminal_to: string | null;
  input_mode: string | null;
  recipient_encounters: number;
  exposures: Record<string, number>;
  interruption: { shown: boolean; acknowledged: boolean };
  late_act: { kind: string; to: string | null } | null;
  persons_present: { person: string; role: string; zone: string }[];
}

function deliveries(row: { components: Record<string, unknown> }) {
  return row.components.deliveries as Record<M10Delivery, DeliveryComponent>;
}

/** A copy of the log with one edit, renumbered like a real log. */
function rewrite(
  events: readonly RawGameEvent[],
  edit: (copy: RawGameEvent[]) => RawGameEvent[],
): RawGameEvent[] {
  const copy = JSON.parse(JSON.stringify(events)) as RawGameEvent[];

  return edit(copy).map((event, index) => ({ ...event, sequence: index + 1 }));
}

const typeOf = (suffix: string) => `${M10_FAMILY}${suffix}`;
const source = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8');

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }

    Object.freeze(value);
  }

  return value;
}

/**
 * The full two-delivery route: the key card handed to Kai in the
 * Laboratory (pointer), the logbook left with Kai on the way back.
 */
function bothFulfilled() {
  const h = harness();
  const d1 = offer(h, 'd1', 'accept', 1_000);

  m10InterruptionShown(d1, 1_500, h.sink('d1'));
  m10InterruptionAcknowledged(d1, 2_000, KEY, h.sink('d1'));
  m10ObligationShown(d1, 'after_interruption', ['d1'], {}, h.sink('d1'));
  m10PersonPresent(
    d1,
    'kai',
    'diagnostics_laboratory',
    'lab_work',
    1,
    h.sink('d1'),
  );
  m10RecipientPromptOpened(
    d1,
    'diagnostics_laboratory',
    'lab_work',
    h.sink('d1'),
  );
  expect(m10HandOver(d1, 'kai', KEY_CARD, 9_000, POINTER, h.sink('d1'))).toBe(
    'direct',
  );
  h.close(d1, 9_000);

  const d2 = offer(h, 'd2', 'accept', 20_000);

  m10PersonPresent(
    d2,
    'kai',
    'diagnostics_laboratory',
    'return_hub',
    2,
    h.sink('d2'),
  );
  expect(m10DelegateAccepted(d2, 'kai', 21_000, h.sink('d2'))).toBe(true);
  expect(m10Delegate(d2, 'kai', 21_500, KEY, h.sink('d2'))).toBe('delegated');
  h.close(d2, 21_500);

  return { h, d1, d2 };
}

test.describe('M10 deliveries (pure)', () => {
  test('register row and terms: v3 route, two deliveries with distinct objects, recipients and delegates, conditional denominator', () => {
    const entry = registerEntry('M10');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m10_delivery_d1',
      'proto_m10_delivery_d2',
    ]);
    expect(entry.route.windows.map((w) => [w.id, w.zone])).toEqual([
      ['m10_delivery_d1', 'station_concourse'],
      ['m10_delivery_d2', 'exterior_recovery_yard'],
    ]);
    expect(entry.route.family_prefixes).toEqual([M10_FAMILY]);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.disposition_override).toBeNull();
    expect(entry.independence.kind).toBe('independent_occasions');
    expect(entry.features.map((f) => f.feature_id)).toEqual([
      'm10_obligations_fulfilled',
    ]);
    expect(entry.features[0]).toMatchObject({
      planned_denominator: 2,
      denominator_kind: 'conditional_eligibility',
      range: '0–2',
    });
    expect(entry.operational_label).toBe(
      'Deliveries (Concourse / Recovery Yard)',
    );

    const { d1, d2 } = M10_DELIVERIES;

    expect(d1).toMatchObject({
      issuer: 'vale',
      recipient: 'kai',
      permitted_delegate: 'noor',
      object_id: 'm10_calibration_key_card',
      interruption: true,
    });
    expect(d2).toMatchObject({
      issuer: 'noor',
      recipient: 'vale',
      permitted_delegate: 'kai',
      object_id: 'm10_yard_logbook',
      interruption: false,
    });
    expect(M10_DEADLINE).toBe('station_record_closure');
    expect(d1.object_id).not.toBe(d2.object_id);
    expect(d1.recipient).not.toBe(d2.recipient);
    expect(d1.opportunity_id).toBe(entry.route.opportunity_ids[0]);
    expect(d2.opportunity_id).toBe(entry.route.opportunity_ids[1]);

    // The issuer and the recipient are never the delegate.
    for (const delivery of M10_DELIVERY_IDS) {
      const spec = M10_DELIVERIES[delivery];

      expect(spec.permitted_delegate).not.toBe(spec.issuer);
      expect(spec.permitted_delegate).not.toBe(spec.recipient);
      expect(spec.issuer).not.toBe(spec.recipient);
    }

    // Objects disjoint from the borrowed instruments (M11), the press
    // benches (M03) and the cutter (M04); never inventory items.
    const others = [
      ...Object.values(M11_OCCASIONS).map((spec) => spec.item_id),
      M03_SPEC.a.object_id,
      M03_SPEC.b.object_id,
    ];

    for (const delivery of M10_DELIVERY_IDS) {
      expect(others).not.toContain(M10_DELIVERIES[delivery].object_id);
    }

    for (const path of [
      'src/pilot/windows/m04CuttingModel.ts',
      'src/pilot/windows/m11CustodyModel.ts',
      'src/inventory/itemDefs.ts',
    ]) {
      expect(source(path), path).not.toMatch(/key_card|yard_logbook|logbook/i);
    }

    const model = source('src/pilot/windows/m10DeliveryModel.ts');
    const adapter = source('src/pilot/windows/m10ComponentPromise.ts');
    const imports = (text: string) =>
      [...text.matchAll(/from '([^']+)'/g)].map((match) => match[1]);

    expect(imports(model)).toEqual(['../inputObservation']);
    expect(imports(adapter).some((path) => /inventory/.test(path))).toBe(false);
    expect(adapter).not.toMatch(/addInventoryItem|invTakeStack/);
    expect(adapter).not.toContain('proto_m10_promise_');
    expect(adapter).not.toContain('phaseMetadata');

    for (const text of [model, adapter]) {
      expect(text).not.toMatch(/score|dependab|reliab/i);
    }

    for (const name of ['closeM10AtReview', 'noteM10ReminderLogViewed']) {
      expect(adapter).toContain(`export function ${name}(`);
    }
  });

  test('the two offers are independent: accept, decline and later on each, one presentation and one terminal answer each, settle-guarded', () => {
    const h = harness();
    const d1 = createM10State('d1');
    const d2 = createM10State('d2');

    expect(M10_SETTLE_MS).toBe(300);
    expect(m10Answer(d1, 'accept', 1, 3, 10, KEY, h.sink('d1'))).toBe(
      'invalid',
    );
    expect(m10Present(d1, 1_000, h.sink('d1'))).toBe(true);
    // Inside the settle window every option is refused.
    expect(m10Answer(d1, 'accept', 1, 3, 1_100, KEY, h.sink('d1'))).toBe(
      'refused',
    );
    expect(m10Defer(d1, 3, 3, 1_250, h.sink('d1'))).toBe('refused');
    // Re-presented in place: no second presentation, a new reference.
    expect(m10Present(d1, 1_260, h.sink('d1'))).toBe(false);
    expect(m10Defer(d1, 3, 3, 1_600, h.sink('d1'))).toBe('deferred');
    expect(d1.answer).toBeNull();
    // Nothing about d1 touched d2.
    expect(d2).toEqual(createM10State('d2'));

    // Asked again: accepted by pointer.
    expect(m10Present(d1, 9_000, h.sink('d1'))).toBe(false);
    expect(m10Answer(d1, 'accept', 1, 3, 9_400, POINTER, h.sink('d1'))).toBe(
      'accepted',
    );
    expect(m10Answer(d1, 'decline', 2, 3, 9_900, KEY, h.sink('d1'))).toBe(
      'invalid',
    );
    expect(m10Carrying(d1)).toBe(true);
    expect(m10Carrying(d2)).toBe(false);

    // d2 declined while d1 is carried: d1 is unchanged.
    const carried = JSON.stringify(d1);

    m10Present(d2, 20_000, h.sink('d2'));
    expect(m10Answer(d2, 'decline', 2, 3, 20_400, KEY, h.sink('d2'))).toBe(
      'declined',
    );
    expect(JSON.stringify(d1)).toBe(carried);
    expect(m10Carrying(d2)).toBe(false);

    const types = (delivery: M10Delivery) =>
      h.events
        .filter((e) => e.metadata?.delivery === delivery)
        .map((e) => e.event_type.slice(M10_FAMILY.length));

    expect(types('d1')).toEqual([
      'presented',
      'press_refused',
      'press_refused',
      'offer_answered',
    ]);
    expect(types('d2')).toEqual(['presented', 'offer_answered']);
    expect(
      h.events.find((e) => e.event_type === typeOf('presented'))?.metadata,
    ).toMatchObject({
      delivery: 'd1',
      issuer: 'vale',
      recipient: 'kai',
      object: KEY_CARD,
      deadline: 'station_record_closure',
      permitted_delegate: 'noor',
      wording_id: 'm10_offer_d1_v1',
      offer_milestone: 'incident_handover',
      settle_ms: 300,
    });
    expect(
      h.events.find((e) => e.event_type === typeOf('offer_answered'))?.metadata,
    ).toMatchObject({
      answer: 'accept',
      option_position: 1,
      option_count: 3,
      input_mode: 'pointer',
      input_mode_basis: 'window_pointerdown',
    });
    expect(
      h.events.find((e) => e.event_type === typeOf('press_refused'))?.metadata,
    ).toMatchObject({ step: 'offer', latency_ms: 100, settle_ms: 300 });

    // The recap, the deliveries menu and the delegation confirmation are
    // settle-guarded the same way.
    for (const step of [
      'recap',
      'deliveries_menu',
      'delegation_confirm',
    ] as const) {
      m10StepShown(d1, step, 30_000);
      expect(m10PressAllowed(d1, step, 1, 2, 30_299, h.sink('d1'))).toBe(false);
      expect(m10PressAllowed(d1, step, 1, 2, 30_300, h.sink('d1'))).toBe(true);
    }

    expect(
      h.events
        .filter((e) => e.event_type === typeOf('press_refused'))
        .map((e) => e.metadata?.step),
    ).toEqual([
      'offer',
      'offer',
      'recap',
      'deliveries_menu',
      'delegation_confirm',
    ]);
  });

  test('direct handover: only to the recipient and only the delivery’s own object; one credited outcome', () => {
    const h = harness();
    const d1 = offer(h, 'd1', 'accept', 1_000);
    const before = h.events.length;

    // The wrong person or the wrong object is refused without a record.
    expect(m10HandOver(d1, 'noor', KEY_CARD, 2_000, KEY, h.sink('d1'))).toBe(
      'refused',
    );
    expect(m10HandOver(d1, 'vale', KEY_CARD, 2_000, KEY, h.sink('d1'))).toBe(
      'refused',
    );
    expect(m10HandOver(d1, 'kai', LOGBOOK, 2_000, KEY, h.sink('d1'))).toBe(
      'refused',
    );
    expect(h.events).toHaveLength(before);
    expect(m10Carrying(d1)).toBe(true);

    expect(m10HandOver(d1, 'kai', KEY_CARD, 3_000, POINTER, h.sink('d1'))).toBe(
      'direct',
    );
    expect(d1).toMatchObject({ path: 'direct', terminal_to: 'kai' });
    expect(m10Carrying(d1)).toBe(false);
    h.close(d1, 3_000);
    // Nothing more can be done with a delivery that is no longer carried.
    expect(m10HandOver(d1, 'kai', KEY_CARD, 4_000, KEY, h.sink('d1'))).toBe(
      'refused',
    );
    expect(m10DelegateAccepted(d1, 'noor', 4_000, h.sink('d1'))).toBe(false);
    expect(
      h.events.filter((e) => e.event_type === typeOf('handed_over')),
    ).toHaveLength(1);
    expect(
      h.events.find((e) => e.event_type === typeOf('handed_over'))?.metadata,
    ).toMatchObject({
      delivery: 'd1',
      to: 'kai',
      object: KEY_CARD,
      delay_ms: 1_600,
      input_mode: 'pointer',
      basis: 'window_pointerdown',
    });
    // Not offered / declined deliveries cannot be handed over.
    expect(
      m10HandOver(createM10State('d2'), 'vale', LOGBOOK, 1, KEY, h.sink('d2')),
    ).toBe('refused');
  });

  test('accountable delegation: only the permitted delegate, only after their stated acceptance', () => {
    const h = harness();
    const d1 = offer(h, 'd1', 'accept', 1_000);

    // No delegation before the colleague has stated their acceptance.
    expect(m10Delegate(d1, 'noor', 2_000, KEY, h.sink('d1'))).toBe('refused');
    // The issuer, the recipient and anyone else never accept as delegate.
    expect(m10DelegateAccepted(d1, 'vale', 2_100, h.sink('d1'))).toBe(false);
    expect(m10DelegateAccepted(d1, 'kai', 2_100, h.sink('d1'))).toBe(false);
    expect(d1.delegate_accepted_at_ms).toBeNull();

    expect(m10DelegateAccepted(d1, 'noor', 3_000, h.sink('d1'))).toBe(true);
    // Shown again ("Keep it for now." earlier): no second record.
    expect(m10DelegateAccepted(d1, 'noor', 3_500, h.sink('d1'))).toBe(true);
    expect(
      h.events.filter((e) => e.event_type === typeOf('delegate_accepted')),
    ).toHaveLength(1);
    expect(m10Carrying(d1)).toBe(true);

    // Even after the statement, nobody else can be left with it.
    expect(m10Delegate(d1, 'kai', 3_600, KEY, h.sink('d1'))).toBe('refused');
    expect(m10Delegate(d1, 'noor', 4_000, KEY, h.sink('d1'))).toBe('delegated');
    expect(d1).toMatchObject({ path: 'delegated', terminal_to: 'noor' });
    h.close(d1, 4_000);
    expect(m10Delegate(d1, 'noor', 5_000, KEY, h.sink('d1'))).toBe('refused');

    expect(
      h.events.find((e) => e.event_type === typeOf('delegate_accepted'))
        ?.metadata,
    ).toMatchObject({ delivery: 'd1', delegate: 'noor', for: 'kai' });
    expect(
      h.events.find((e) => e.event_type === typeOf('delegated'))?.metadata,
    ).toMatchObject({
      delivery: 'd1',
      to: 'noor',
      for: 'kai',
      delay_ms: 2_600,
      input_mode: 'keyboard',
    });
    expect(m10DelegateConfirmBody('d1')).toBe(
      'Noor: I can take the calibration key card to Kai — from now on that is my job, not yours. Leave it with me?',
    );
    expect(m10DelegateConfirmBody('d2')).toBe(
      'Kai: I can take the yard logbook to Vale — from now on that is my job, not yours. Leave it with me?',
    );
  });

  test('2 / 2 (one direct, one delegated), 1 / 1 with one declined, 0 / 1 unfulfilled — reproduced from the raw events', () => {
    const both = feature(bothFulfilled().h.events);

    expect(both).toMatchObject({
      feature_id: 'm10_obligations_fulfilled',
      value: 2,
      numerator: 2,
      denominator: 2,
      planned_denominator: 2,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
      included_ids: ['m10_delivery_d1', 'm10_delivery_d2'],
      independence: 'independent_occasions',
    });
    expect(both.components).toMatchObject({
      administration_version: M10_ENTRY_STATE_VERSION,
      offered: 2,
      accepted: 2,
      declined: 0,
      direct: 1,
      delegated: 1,
      unfulfilled_at_deadline: 0,
      inaccessible: 0,
      late_acts: 0,
    });
    expect(deliveries(both).d1).toMatchObject({
      status: 'closed',
      path: 'direct',
      terminal_to: 'kai',
      input_mode: 'pointer',
      accessible: true,
      accessibility_basis: 'person_present',
      recipient_encounters: 1,
      interruption: { shown: true, acknowledged: true },
      exposures: { after_interruption: 1, station_log: 0, deliveries_menu: 0 },
    });
    expect(deliveries(both).d2).toMatchObject({
      path: 'delegated',
      terminal_to: 'kai',
      interruption: { shown: false, acknowledged: false },
    });

    // d1 delegated, d2 declined: 1 / 1 — complete (conditional denominator).
    const mixed = harness();
    const d1 = offer(mixed, 'd1', 'accept', 1_000);

    m10PersonPresent(
      d1,
      'noor',
      'exterior_recovery_yard',
      'exterior_work',
      1,
      mixed.sink('d1'),
    );
    m10DelegateAccepted(d1, 'noor', 5_000, mixed.sink('d1'));
    m10Delegate(d1, 'noor', 5_500, KEY, mixed.sink('d1'));
    mixed.close(d1, 5_500);
    offer(mixed, 'd2', 'decline', 9_000);
    expect(feature(mixed.events)).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      included_ids: ['m10_delivery_d1'],
    });
    expect(feature(mixed.events).components).toMatchObject({
      delegated: 1,
      direct: 0,
      declined: 1,
    });

    // Accepted, the recipient present, still carried at the deadline: 0 / 1.
    const late = harness();
    const carried = offer(late, 'd1', 'accept', 1_000);

    m10PersonPresent(
      carried,
      'kai',
      'diagnostics_laboratory',
      'lab_work',
      1,
      late.sink('d1'),
    );
    late.close(carried, 50_000, 'closed_at_review');
    expect(carried.path).toBe('unfulfilled_at_deadline');
    expect(feature(late.events)).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 1,
      disposition: 'observed',
      closure_reason: 'closed_at_review',
    });
    expect(feature(late.events).components).toMatchObject({
      unfulfilled_at_deadline: 1,
    });
  });

  test('the deadline: an accessible delivery left unfulfilled is an observed zero; an inaccessible one is excluded, never failed', () => {
    // Nobody who could take it was ever present while it was carried.
    const h = harness();
    const d1 = offer(h, 'd1', 'accept', 1_000);

    // The station log showing the line is an exposure, not access.
    m10ObligationShown(
      d1,
      'station_log',
      ['d1'],
      { rendered: true },
      h.sink('d1'),
    );
    // Someone who is neither recipient nor delegate is no presence.
    expect(
      m10PersonPresent(
        d1,
        'vale',
        'station_concourse',
        'incident_handover',
        1,
        h.sink('d1'),
      ),
    ).toBe(false);
    h.close(d1, 50_000, 'closed_at_review');

    const row = feature(h.events);

    expect(row).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'no_eligible_event',
      missing_reason: 'no accepted delivery was accessible',
    });
    expect(row.components).toMatchObject({ accepted: 1, inaccessible: 1 });
    expect(deliveries(row).d1).toMatchObject({
      accessible: false,
      accessibility_basis: 'no_person_present',
      path: 'unfulfilled_at_deadline',
      exposures: { station_log: 1 },
    });

    // One accessible and unfulfilled, one inaccessible: 0 / 1.
    const two = harness();
    const a = offer(two, 'd1', 'accept', 1_000);
    const b = offer(two, 'd2', 'accept', 2_000);

    m10PersonPresent(
      a,
      'noor',
      'exterior_recovery_yard',
      'exterior_work',
      1,
      two.sink('d1'),
    );
    two.close(a, 50_000, 'closed_at_review');
    two.close(b, 50_000, 'closed_at_review');
    expect(feature(two.events)).toMatchObject({
      value: 0,
      denominator: 1,
      disposition: 'observed',
      included_ids: ['m10_delivery_d1'],
    });

    // Presence is recorded once per person and zone visit, and never
    // after the closure.
    const p = harness();
    const s = offer(p, 'd2', 'accept', 1_000);

    expect(
      m10PersonPresent(
        s,
        'vale',
        'station_concourse',
        'return_hub',
        3,
        p.sink('d2'),
      ),
    ).toBe(true);
    expect(
      m10PersonPresent(
        s,
        'vale',
        'station_concourse',
        'return_hub',
        3,
        p.sink('d2'),
      ),
    ).toBe(false);
    expect(
      m10PersonPresent(
        s,
        'kai',
        'station_concourse',
        'return_hub',
        3,
        p.sink('d2'),
      ),
    ).toBe(true);
    expect(
      m10PersonPresent(
        s,
        'vale',
        'station_concourse',
        'deck_closure',
        4,
        p.sink('d2'),
      ),
    ).toBe(true);
    p.close(s, 9_000, 'closed_at_review');
    expect(
      m10PersonPresent(
        s,
        'vale',
        'station_concourse',
        'core_stabilise',
        5,
        p.sink('d2'),
      ),
    ).toBe(false);
    expect(
      p.events
        .filter((e) => e.event_type === typeOf('person_present'))
        .map((e) => [e.metadata?.person, e.metadata?.role, e.metadata?.visit]),
    ).toEqual([
      ['vale', 'recipient', 3],
      ['kai', 'delegate', 3],
      ['vale', 'recipient', 4],
    ]);
  });

  test('late handover and late delegation after the closure are kept apart and never change the first outcome', () => {
    const h = harness();
    const d1 = offer(h, 'd1', 'accept', 1_000);
    const d2 = offer(h, 'd2', 'accept', 2_000);

    m10PersonPresent(
      d1,
      'kai',
      'diagnostics_laboratory',
      'lab_work',
      1,
      h.sink('d1'),
    );
    m10PersonPresent(
      d2,
      'kai',
      'diagnostics_laboratory',
      'return_hub',
      2,
      h.sink('d2'),
    );
    h.close(d1, 50_000, 'closed_at_review');
    h.close(d2, 50_000, 'closed_at_review');

    const atDeadline = JSON.stringify(feature(h.events).value);

    // Still carried after the closure — and no longer an open obligation.
    expect(m10Carrying(d1)).toBe(true);
    expect(m10ObligationOpen(d1)).toBe(false);
    // The menu viewed after the closure is flagged and not an exposure.
    m10ObligationShown(d1, 'deliveries_menu', ['d1', 'd2'], {}, h.sink('d1'));
    expect(d1.exposures.deliveries_menu).toBe(0);

    expect(m10HandOver(d1, 'kai', KEY_CARD, 60_000, KEY, h.sink('d1'))).toBe(
      'late',
    );
    expect(m10DelegateAccepted(d2, 'kai', 61_000, h.sink('d2'))).toBe(true);
    expect(m10Delegate(d2, 'kai', 62_000, POINTER, h.sink('d2'))).toBe('late');
    expect(d1.path).toBe('unfulfilled_at_deadline');
    expect(d2.path).toBe('unfulfilled_at_deadline');
    expect(m10Carrying(d1)).toBe(false);
    expect(m10HandOver(d1, 'kai', KEY_CARD, 70_000, KEY, h.sink('d1'))).toBe(
      'refused',
    );

    const row = feature(h.events);

    expect(JSON.stringify(row.value)).toBe(atDeadline);
    expect(row).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 2,
      disposition: 'observed',
    });
    expect(row.components).toMatchObject({
      unfulfilled_at_deadline: 2,
      late_acts: 2,
      direct: 0,
      delegated: 0,
    });
    expect(deliveries(row).d1.late_act).toMatchObject({
      kind: 'late_handover',
      to: 'kai',
    });
    expect(deliveries(row).d2.late_act).toMatchObject({
      kind: 'late_delegation',
      to: 'kai',
    });
    expect(deliveries(row).d1.exposures.deliveries_menu).toBe(0);
    expect(
      h.events.find((e) => e.event_type === typeOf('late_handover'))?.metadata,
    ).toMatchObject({ after_closure_ms: 10_000, input_mode: 'keyboard' });
    expect(
      h.events.filter((e) => e.event_type === typeOf('obligation_shown'))[0]
        ?.metadata,
    ).toMatchObject({ channel: 'deliveries_menu', after_closure: true });
  });

  test('the interruption and its recap belong to delivery 1 only; exposures are counted by channel, a line the log could not show is not', () => {
    const h = harness();
    const d1 = createM10State('d1');
    const d2 = offer(h, 'd2', 'accept', 500);

    // Never before acceptance, never on delivery 2.
    expect(m10InterruptionShown(d1, 900, h.sink('d1'))).toBe(false);
    expect(m10InterruptionShown(d2, 900, h.sink('d2'))).toBe(false);
    expect(m10InterruptionAcknowledged(d1, 950, KEY, h.sink('d1'))).toBe(false);

    m10Present(d1, 1_000, h.sink('d1'));
    m10Answer(d1, 'accept', 1, 3, 1_400, KEY, h.sink('d1'));
    h.opened('d1');
    expect(m10InterruptionShown(d1, 1_500, h.sink('d1'))).toBe(true);
    expect(m10InterruptionShown(d1, 1_600, h.sink('d1'))).toBe(false);
    expect(m10InterruptionAcknowledged(d1, 2_000, KEY, h.sink('d1'))).toBe(
      true,
    );
    expect(m10InterruptionAcknowledged(d1, 2_100, KEY, h.sink('d1'))).toBe(
      false,
    );
    expect(
      m10ObligationShown(d1, 'after_interruption', ['d1'], {}, h.sink('d1')),
    ).toBe(true);
    expect(
      m10ObligationShown(
        d1,
        'station_log',
        ['d1', 'd2'],
        { rendered: true },
        h.sink('d1'),
      ),
    ).toBe(true);
    expect(
      m10ObligationShown(
        d1,
        'station_log',
        ['d1', 'd2'],
        { rendered: false },
        h.sink('d1'),
      ),
    ).toBe(true);
    expect(
      m10ObligationShown(d1, 'deliveries_menu', ['d1', 'd2'], {}, h.sink('d1')),
    ).toBe(true);
    expect(d1.exposures).toEqual({
      after_interruption: 1,
      station_log: 1,
      deliveries_menu: 1,
    });
    // Nothing is shown for a delivery that is not carried.
    expect(
      m10ObligationShown(
        createM10State('d2'),
        'station_log',
        [],
        {},
        h.sink('d2'),
      ),
    ).toBe(false);

    m10PersonPresent(
      d1,
      'kai',
      'diagnostics_laboratory',
      'lab_work',
      1,
      h.sink('d1'),
    );
    m10HandOver(d1, 'kai', KEY_CARD, 5_000, KEY, h.sink('d1'));
    h.close(d1, 5_000);
    m10PersonPresent(
      d2,
      'vale',
      'station_concourse',
      'return_hub',
      2,
      h.sink('d2'),
    );
    m10HandOver(d2, 'vale', LOGBOOK, 6_000, KEY, h.sink('d2'));
    h.close(d2, 6_000);

    const row = feature(h.events);

    expect(row).toMatchObject({ value: 2, denominator: 2 });
    expect(deliveries(row).d1).toMatchObject({
      interruption: { shown: true, acknowledged: true },
      exposures: { after_interruption: 1, station_log: 1, deliveries_menu: 1 },
    });
    expect(deliveries(row).d2).toMatchObject({
      interruption: { shown: false, acknowledged: false },
      exposures: { after_interruption: 0, station_log: 0, deliveries_menu: 0 },
    });
    expect(
      h.events
        .filter((e) => e.event_type.startsWith(`${M10_FAMILY}interruption`))
        .map((e) => e.metadata?.delivery),
    ).toEqual(['d1', 'd1']);
  });

  test('dispositions: never presented, none answered, all declined, pending and held back after a reload are distinct — none is a zero', () => {
    expect(feature([])).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expect(feature([], { ...CONTEXT, reloaded: true }).disposition).toBe(
      'interrupted',
    );

    // None answered: both presented, both deferred (deferrals counted
    // from the route telemetry only).
    const none = harness();
    const u1 = createM10State('d1');
    const u2 = createM10State('d2');

    m10Present(u1, 1_000, none.sink('d1'));
    expect(m10Defer(u1, 3, 3, 1_400, none.sink('d1'))).toBe('deferred');
    none.beat(M10_OFFER_TAGS.d1.defer);
    m10Present(u2, 2_000, none.sink('d2'));
    m10Defer(u2, 3, 3, 2_400, none.sink('d2'));
    none.beat(M10_OFFER_TAGS.d2.defer);
    none.beat(M10_OFFER_TAGS.d2.defer);

    const unanswered = feature(none.events);

    expect(unanswered).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'no_eligible_event',
      missing_reason: 'no delivery offer answered',
    });
    expect(deliveries(unanswered).d1).toMatchObject({
      status: 'unanswered',
      deferrals: 1,
    });
    expect(deliveries(unanswered).d2.deferrals).toBe(2);

    // All declined (one declined, one unanswered counts as declined too).
    const declined = harness();

    offer(declined, 'd1', 'decline', 1_000);
    expect(feature(declined.events)).toMatchObject({
      value: null,
      disposition: 'declined',
    });
    offer(declined, 'd2', 'decline', 2_000);
    expect(feature(declined.events)).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'declined',
    });
    expect(feature(declined.events).components).toMatchObject({ declined: 2 });

    // Pending: an accepted delivery is carried and the record not closed.
    const open = harness();
    const carried = offer(open, 'd1', 'accept', 1_000);

    expect(feature(open.events)).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    m10PersonPresent(
      carried,
      'kai',
      'diagnostics_laboratory',
      'lab_work',
      1,
      open.sink('d1'),
    );
    m10HandOver(carried, 'kai', KEY_CARD, 5_000, KEY, open.sink('d1'));
    // Handed over but the window's closure not yet written: still pending.
    expect(feature(open.events).disposition).toBe('pending');
    open.close(carried, 5_000);
    expect(feature(open.events)).toMatchObject({ value: 1, denominator: 1 });

    // Held back: d1's offer lies in an earlier page load; a later,
    // never-presented d2 runs normally — value kept, item interrupted.
    const held = harness();

    held.heldBack('d1');
    expect(feature(held.events, { ...CONTEXT, reloaded: true })).toMatchObject({
      value: null,
      disposition: 'interrupted',
    });

    const d2 = offer(held, 'd2', 'accept', 9_000);

    m10PersonPresent(
      d2,
      'vale',
      'station_concourse',
      'return_hub',
      1,
      held.sink('d2'),
    );
    m10HandOver(d2, 'vale', LOGBOOK, 9_900, KEY, held.sink('d2'));
    held.close(d2, 9_900);

    const interrupted = feature(held.events, { ...CONTEXT, reloaded: true });

    expect(interrupted).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'interrupted',
      censored: true,
    });
    expect(interrupted.components).toMatchObject({ held_back: ['d1'] });

    // The reload guard recognises a prior offer of the SAME delivery only.
    expect(m10PriorAdministration(open.events, 'd1')).toBe(true);
    expect(m10PriorAdministration(open.events, 'd2')).toBe(false);
    expect(m10PriorAdministration([], 'd1')).toBe(false);
  });

  test('conditional invariants: legitimate missingness is never a technical failure', () => {
    const cases: Record<string, { events: RawGameEvent[]; expected: string }> =
      {};

    // (a) An offer presented and never answered.
    const a = harness();
    const u = createM10State('d1');

    m10Present(u, 1_000, a.sink('d1'));
    cases['unanswered, no closure'] = {
      events: [...a.events],
      expected: 'no_eligible_event',
    };
    a.closeUnanswered(u, 50_000);
    cases['unanswered, closed at the review'] = {
      events: a.events,
      expected: 'no_eligible_event',
    };

    // (b) A declined delivery with no act events.
    const b = harness();

    offer(b, 'd2', 'decline', 1_000);
    cases['declined'] = { events: b.events, expected: 'declined' };

    // (c) Accepted, unfulfilled at the deadline, no handover / delegation.
    const c = harness();
    const carried = offer(c, 'd1', 'accept', 1_000);

    m10PersonPresent(
      carried,
      'kai',
      'diagnostics_laboratory',
      'lab_work',
      1,
      c.sink('d1'),
    );
    m10RecipientPromptOpened(
      carried,
      'diagnostics_laboratory',
      'lab_work',
      c.sink('d1'),
    );
    c.close(carried, 50_000, 'closed_at_review');
    cases['unfulfilled at the deadline'] = {
      events: c.events,
      expected: 'observed',
    };

    // (d) Accepted and objectively accessible (the recipient recorded
    // present) with NO recipient prompt and NO deliveries-menu exposure.
    const d = harness();
    const silent = offer(d, 'd1', 'accept', 1_000);

    m10PersonPresent(
      silent,
      'kai',
      'diagnostics_laboratory',
      'lab_work',
      1,
      d.sink('d1'),
    );
    d.close(silent, 50_000, 'closed_at_review');
    cases['accessible without any prompt or menu'] = {
      events: d.events,
      expected: 'observed',
    };

    // (e) A direct handover followed by a late_handover attempt.
    const e = bothFulfilled();
    const attempt = rewrite(e.h.events, (copy) => {
      const template = copy.find(
        (event) => event.event_type === typeOf('handed_over'),
      )!;

      copy.push({
        ...template,
        event_type: typeOf('late_handover'),
        metadata: { ...template.metadata, after_closure_ms: 5_000 },
      });

      return copy;
    });

    cases['a late attempt after a direct handover'] = {
      events: attempt,
      expected: 'observed',
    };

    // (f) d1 delegated, d2 declined.
    const f = harness();
    const delegated = offer(f, 'd1', 'accept', 1_000);

    m10PersonPresent(
      delegated,
      'noor',
      'exterior_recovery_yard',
      'exterior_work',
      1,
      f.sink('d1'),
    );
    m10DelegateAccepted(delegated, 'noor', 5_000, f.sink('d1'));
    m10Delegate(delegated, 'noor', 5_500, KEY, f.sink('d1'));
    f.close(delegated, 5_500);
    offer(f, 'd2', 'decline', 9_000);
    cases['d1 delegated, d2 declined'] = {
      events: f.events,
      expected: 'observed',
    };

    for (const [name, { events, expected }] of Object.entries(cases)) {
      const row = feature(events);

      expect(row.disposition, name).not.toBe('technical_failure');
      expect(row.disposition, name).toBe(expected);
    }

    expect(feature(cases['unfulfilled at the deadline'].events)).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 1,
    });

    // (d): accessible on the presence record alone — 0 / 1 observed.
    const silentRow = feature(
      cases['accessible without any prompt or menu'].events,
    );

    expect(silentRow).toMatchObject({ value: 0, numerator: 0, denominator: 1 });
    expect(deliveries(silentRow).d1).toMatchObject({
      accessible: true,
      accessibility_basis: 'person_present',
      recipient_encounters: 0,
      exposures: { after_interruption: 0, station_log: 0, deliveries_menu: 0 },
      path: 'unfulfilled_at_deadline',
    });
    expect(
      cases['accessible without any prompt or menu'].events.some(
        (event) =>
          event.event_type === typeOf('recipient_prompt_opened') ||
          event.event_type === typeOf('obligation_shown'),
      ),
    ).toBe(false);

    // (e): one credited outcome, the late act kept apart.
    const lateRow = feature(
      cases['a late attempt after a direct handover'].events,
    );

    expect(lateRow).toMatchObject({ value: 2, numerator: 2, denominator: 2 });
    expect(deliveries(lateRow).d1).toMatchObject({
      path: 'direct',
      late_act: { kind: 'late_handover' },
    });
    expect(lateRow.components).toMatchObject({ direct: 1, late_acts: 1 });

    expect(feature(cases['d1 delegated, d2 declined'].events)).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
    });
  });

  test('conditional invariants: contradictory, malformed or unreproducible evidence is a technical failure', () => {
    const valid = bothFulfilled().h.events;
    const at = (
      events: RawGameEvent[],
      suffix: string,
      delivery: M10Delivery,
    ) =>
      events.findIndex(
        (e) =>
          e.event_type === typeOf(suffix) && e.metadata?.delivery === delivery,
      );

    expect(feature(valid).disposition).toBe('observed');

    const broken: Record<string, RawGameEvent[]> = {
      'handed over to the wrong person': rewrite(valid, (copy) => {
        const event = copy[at(copy, 'handed_over', 'd1')];

        event.metadata = { ...event.metadata, to: 'noor' };

        return copy;
      }),
      'handed over with the wrong object': rewrite(valid, (copy) => {
        const event = copy[at(copy, 'handed_over', 'd1')];

        event.metadata = { ...event.metadata, object: LOGBOOK };

        return copy;
      }),
      'delegated without delegate_accepted': rewrite(valid, (copy) =>
        copy.filter((e) => e.event_type !== typeOf('delegate_accepted')),
      ),
      'delegate_accepted only after the delegation': rewrite(valid, (copy) => {
        const stated = at(copy, 'delegate_accepted', 'd2');
        const done = at(copy, 'delegated', 'd2');

        [copy[stated], copy[done]] = [copy[done], copy[stated]];

        return copy;
      }),
      'delegated to someone else': rewrite(valid, (copy) => {
        const event = copy[at(copy, 'delegated', 'd2')];

        event.metadata = { ...event.metadata, to: 'noor' };

        return copy;
      }),
      'two credited terminal acts': rewrite(valid, (copy) => {
        const index = at(copy, 'handed_over', 'd1');

        copy.splice(index + 1, 0, JSON.parse(JSON.stringify(copy[index])));

        return copy;
      }),
      'a handover and a delegation of one delivery': rewrite(valid, (copy) => {
        const index = at(copy, 'delegated', 'd2');

        copy.splice(index + 1, 0, {
          ...JSON.parse(JSON.stringify(copy[index])),
          event_type: typeOf('handed_over'),
        });

        return copy;
      }),
      'an act before the acceptance': rewrite(valid, (copy) => {
        const answer = at(copy, 'offer_answered', 'd1');
        const [act] = copy.splice(at(copy, 'handed_over', 'd1'), 1);

        copy.splice(answer, 0, act);

        return copy;
      }),
      'a closure snapshot disagreeing with the recount': rewrite(
        valid,
        (copy) => {
          const closure = copy[at(copy, 'window_closed', 'd1')];

          (closure.metadata!.raw_components as { path: string }).path =
            'delegated';

          return copy;
        },
      ),
      'an act on a declined delivery': rewrite(valid, (copy) => {
        const answer = copy[at(copy, 'offer_answered', 'd1')];

        answer.metadata = { ...answer.metadata, answer: 'decline' };

        return copy;
      }),
      'an act on an unanswered delivery': rewrite(valid, (copy) =>
        copy.filter(
          (e) =>
            !(
              e.event_type === typeOf('offer_answered') &&
              e.metadata?.delivery === 'd2'
            ),
        ),
      ),
      'a terminal act after the closure': rewrite(valid, (copy) => {
        const act = at(copy, 'handed_over', 'd1');
        const closure = at(copy, 'window_closed', 'd1');

        [copy[act], copy[closure]] = [copy[closure], copy[act]];

        return copy;
      }),
      'a late act before the closure': rewrite(valid, (copy) => {
        const index = at(copy, 'person_present', 'd1');

        copy.splice(index + 1, 0, {
          ...JSON.parse(JSON.stringify(copy[index])),
          event_type: typeOf('late_handover'),
        });

        return copy;
      }),
      'an unknown version': rewrite(valid, (copy) => {
        copy[1].metadata = {
          ...copy[1].metadata,
          entry_state_version: 'm10-component-promise-v1',
        };

        return copy;
      }),
      'two presentations': rewrite(valid, (copy) => {
        copy.splice(1, 0, JSON.parse(JSON.stringify(copy[0])));

        return copy;
      }),
      'an unknown delivery': rewrite(valid, (copy) => {
        copy[0].metadata = { ...copy[0].metadata, delivery: 'd3' };

        return copy;
      }),
    };

    for (const [name, events] of Object.entries(broken)) {
      const row = feature(events);

      expect(row.disposition, name).toBe('technical_failure');
      expect(row.value, name).toBeNull();
      expect(row.missing_reason, name).not.toBeNull();
    }
  });

  test('closeout rulings: a presence record must follow the acceptance and the opening, and a delegation must name the delivery’s own object', () => {
    // Research-owner rulings of the U15 closeout (register §5.256 and
    // §5.257): (1) a delivery's `person_present` record before its
    // acceptance or before its opportunity opened is malformed evidence —
    // a technical failure, never accessibility and never an observed
    // zero; (2) a `delegated` event must name the delivery's own object,
    // as a direct handover must.
    type Outcome = {
      disposition: string;
      value: unknown;
      numerator: number | null;
      denominator: number | null;
      missing_reason: string | null;
    };
    const outcome = (events: readonly RawGameEvent[]): Outcome => {
      const row = feature(events);

      return {
        disposition: row.disposition,
        value: row.value,
        numerator: row.numerator,
        denominator: row.denominator,
        missing_reason: row.missing_reason,
      };
    };
    /** A raw presence record, written as the adapter would shape it. */
    const present = (h: Harness, delivery: M10Delivery) =>
      h.sink(delivery)('person_present', {
        delivery,
        person: M10_DELIVERIES[delivery].recipient,
        role: 'recipient',
        zone: 'diagnostics_laboratory',
        stage: 'lab_work',
        visit: 1,
        input_mode: 'system',
      });

    // The game itself never writes such a record: the model refuses
    // presence for a delivery that is not carried.
    const idle = harness();
    const notCarried = createM10State('d1');

    m10Present(notCarried, 1_000, idle.sink('d1'));
    expect(
      m10PersonPresent(
        notCarried,
        'kai',
        'diagnostics_laboratory',
        'lab_work',
        1,
        idle.sink('d1'),
      ),
    ).toBe(false);
    expect(
      idle.events.filter((e) => e.event_type === typeOf('person_present')),
    ).toEqual([]);

    const logs: Record<string, RawGameEvent[]> = {};

    // ——— Malformed: presence that does not follow acceptance + opening ———
    {
      // Presented, PRESENCE, accepted, opened, still carried at the deadline.
      const h = harness();
      const s = createM10State('d1');

      m10Present(s, 1_000, h.sink('d1'));
      present(h, 'd1');
      m10Answer(s, 'accept', 1, 3, 1_400, KEY, h.sink('d1'));
      h.opened('d1');
      h.close(s, 50_000, 'closed_at_review');
      logs['presence before the acceptance'] = h.events;
    }

    {
      // Presented, accepted, PRESENCE, opened, still carried at the deadline.
      const h = harness();
      const s = createM10State('d1');

      m10Present(s, 1_000, h.sink('d1'));
      m10Answer(s, 'accept', 1, 3, 1_400, KEY, h.sink('d1'));
      present(h, 'd1');
      h.opened('d1');
      h.close(s, 50_000, 'closed_at_review');
      logs['presence after the acceptance, before the opening'] = h.events;
    }

    {
      // Accepted and present, but the opportunity never opened.
      const h = harness();
      const s = createM10State('d1');

      m10Present(s, 1_000, h.sink('d1'));
      m10Answer(s, 'accept', 1, 3, 1_400, KEY, h.sink('d1'));
      present(h, 'd1');
      h.close(s, 50_000, 'closed_at_review');
      logs['presence with no opening at all'] = h.events;
    }

    {
      // A malformed early record is not repaired by a valid later one.
      const h = harness();
      const s = createM10State('d1');

      m10Present(s, 1_000, h.sink('d1'));
      present(h, 'd1');
      m10Answer(s, 'accept', 1, 3, 1_400, KEY, h.sink('d1'));
      h.opened('d1');
      m10PersonPresent(
        s,
        'kai',
        'diagnostics_laboratory',
        'lab_work',
        2,
        h.sink('d1'),
      );
      h.close(s, 50_000, 'closed_at_review');
      logs['presence before the acceptance and again after the opening'] =
        h.events;
    }

    {
      // The offer was never answered: there is no acceptance to follow.
      const h = harness();
      const s = createM10State('d1');

      m10Present(s, 1_000, h.sink('d1'));
      present(h, 'd1');
      h.closeUnanswered(s, 50_000);
      logs['presence on an unanswered delivery'] = h.events;
    }

    {
      const h = harness();

      offer(h, 'd2', 'decline', 1_000);
      present(h, 'd2');
      logs['presence on a declined delivery'] = h.events;
    }

    {
      const h = harness();

      present(h, 'd1');
      logs['presence without a presentation'] = h.events;
    }

    // ——— Malformed: a delegation that does not name its own object ———
    const fulfilled = bothFulfilled().h.events;
    const delegatedAt = (events: RawGameEvent[]) =>
      events.findIndex(
        (e) =>
          e.event_type === typeOf('delegated') && e.metadata?.delivery === 'd2',
      );

    expect(fulfilled[delegatedAt(fulfilled)].metadata?.object).toBe(LOGBOOK);
    logs['a delegation naming the other delivery’s object'] = rewrite(
      fulfilled,
      (copy) => {
        const event = copy[delegatedAt(copy)];

        event.metadata = { ...event.metadata, object: KEY_CARD };

        return copy;
      },
    );
    logs['a delegation naming no object'] = rewrite(fulfilled, (copy) => {
      const event = copy[delegatedAt(copy)];
      const { object: _dropped, ...rest } = event.metadata as Record<
        string,
        unknown
      >;

      void _dropped;
      event.metadata = rest;

      return copy;
    });

    // ——— Valid records that must stay as they were ———
    {
      // Accepted, opened, THEN the recipient recorded present; no
      // conversation, log or deliveries menu was ever opened; still
      // carried at the deadline: accessible, an observed 0 / 1.
      const h = harness();
      const s = offer(h, 'd1', 'accept', 1_000);

      m10PersonPresent(
        s,
        'kai',
        'diagnostics_laboratory',
        'lab_work',
        1,
        h.sink('d1'),
      );
      h.close(s, 50_000, 'closed_at_review');
      expect(
        h.events.some(
          (e) =>
            e.event_type === typeOf('obligation_shown') ||
            e.event_type === typeOf('recipient_prompt_opened'),
        ),
      ).toBe(false);
      logs['valid presence after the opening, no menu exposure'] = h.events;
    }

    {
      // Legitimate absence of presence evidence: excluded, never failed.
      const h = harness();
      const s = offer(h, 'd1', 'accept', 1_000);

      h.close(s, 50_000, 'closed_at_review');
      logs['no presence record at all'] = h.events;
    }

    logs['a valid direct handover and a valid delegation'] = fulfilled;

    // The raw logs are never changed by the extraction.
    const before = Object.fromEntries(
      Object.entries(logs).map(([name, events]) => [
        name,
        JSON.stringify(events),
      ]),
    );
    const outcomes = Object.fromEntries(
      Object.keys(logs).map((name) => [
        name,
        outcome(deepFreeze(JSON.parse(before[name]) as RawGameEvent[])),
      ]),
    );
    const failed = (missing_reason: string): Outcome => ({
      disposition: 'technical_failure',
      value: null,
      numerator: null,
      denominator: null,
      missing_reason,
    });

    expect(outcomes).toEqual({
      'presence before the acceptance': failed(
        'd1: a presence record before the acceptance',
      ),
      'presence after the acceptance, before the opening': failed(
        'd1: a presence record before the opportunity opened',
      ),
      'presence with no opening at all': failed(
        'd1: a presence record before the opportunity opened',
      ),
      'presence before the acceptance and again after the opening': failed(
        'd1: a presence record before the acceptance',
      ),
      'presence on an unanswered delivery': failed(
        'd1: a presence record without an accepted delivery',
      ),
      'presence on a declined delivery': failed(
        'd2: a presence record without an accepted delivery',
      ),
      'presence without a presentation': failed(
        'd1: a presence record without an accepted delivery',
      ),
      'a delegation naming the other delivery’s object': failed(
        'd2: delegated with the wrong object',
      ),
      'a delegation naming no object': failed(
        'd2: delegated with the wrong object',
      ),
      'valid presence after the opening, no menu exposure': {
        disposition: 'observed',
        value: 0,
        numerator: 0,
        denominator: 1,
        missing_reason: null,
      },
      'no presence record at all': {
        disposition: 'no_eligible_event',
        value: null,
        numerator: null,
        denominator: 0,
        missing_reason: 'no accepted delivery was accessible',
      },
      'a valid direct handover and a valid delegation': {
        disposition: 'observed',
        value: 2,
        numerator: 2,
        denominator: 2,
        missing_reason: null,
      },
    });

    // Immutability, twice over: the rows above were extracted from deeply
    // FROZEN copies (any write would have thrown); and here the original,
    // unfrozen logs are extracted and then compared with their text from
    // before — byte-identical — with a second extraction giving the same
    // row (deterministic).
    for (const [name, events] of Object.entries(logs)) {
      const first = JSON.stringify(feature(events));

      expect(JSON.stringify(events), name).toBe(before[name]);
      expect(JSON.stringify(feature(events)), name).toBe(first);
      expect(JSON.stringify(events), name).toBe(before[name]);
    }

    // The valid records keep their detail: accessible on the presence
    // record alone; one direct and one delegated completion.
    const silent = feature(
      logs['valid presence after the opening, no menu exposure'],
    );

    expect(deliveries(silent).d1).toMatchObject({
      accessible: true,
      accessibility_basis: 'person_present',
      path: 'unfulfilled_at_deadline',
      recipient_encounters: 0,
      exposures: { after_interruption: 0, station_log: 0, deliveries_menu: 0 },
    });
    expect(
      deliveries(feature(logs['no presence record at all'])).d1,
    ).toMatchObject({
      accessible: false,
      accessibility_basis: 'no_person_present',
      path: 'unfulfilled_at_deadline',
    });

    const both = feature(fulfilled);

    expect(both.components).toMatchObject({ direct: 1, delegated: 1 });
    expect(deliveries(both).d1).toMatchObject({
      path: 'direct',
      terminal_to: 'kai',
      accessibility_basis: 'person_present',
    });
    expect(deliveries(both).d2).toMatchObject({
      path: 'delegated',
      terminal_to: 'kai',
      accessibility_basis: 'person_present',
    });
  });

  test('event-order integrity: an order that cannot be verified never yields an observed value', () => {
    // Research-owner ruling (register §5.259): an outcome that depends on
    // event order must not be valued when the ordering evidence is
    // missing or malformed, and a missing sequence number is never read
    // as zero. The logger's convention: an integer from 1, unique within
    // the session; gaps are normal (other events lie in between).
    type Outcome = {
      disposition: string;
      value: unknown;
      numerator: number | null;
      denominator: number | null;
      missing_reason: string | null;
    };
    const outcome = (events: readonly RawGameEvent[]): Outcome => {
      const row = feature(events);

      return {
        disposition: row.disposition,
        value: row.value,
        numerator: row.numerator,
        denominator: row.denominator,
        missing_reason: row.missing_reason,
      };
    };
    const clone = (events: readonly RawGameEvent[]) =>
      JSON.parse(JSON.stringify(events)) as RawGameEvent[];
    const eventOf = (
      events: RawGameEvent[],
      suffix: string,
      delivery: M10Delivery,
    ) =>
      events.find(
        (e) =>
          e.event_type === typeOf(suffix) && e.metadata?.delivery === delivery,
      )!;
    /** A copy whose one event carries this sequence value (undefined = none). */
    const resequenced = (
      events: readonly RawGameEvent[],
      suffix: string,
      delivery: M10Delivery,
      value: unknown,
    ) => {
      const copy = clone(events);
      const event = eventOf(copy, suffix, delivery) as { sequence?: unknown };

      if (value === undefined) {
        delete event.sequence;
      } else {
        event.sequence = value;
      }

      return copy;
    };

    // ——— Valid logs (every event numbered by the harness) ———
    const fulfilled = bothFulfilled().h.events;

    const carriedLog = harness();
    const carried = offer(carriedLog, 'd1', 'accept', 1_000);

    m10PersonPresent(
      carried,
      'kai',
      'diagnostics_laboratory',
      'lab_work',
      1,
      carriedLog.sink('d1'),
    );
    carriedLog.close(carried, 50_000, 'closed_at_review');

    const lateLog = harness();
    const late = offer(lateLog, 'd1', 'accept', 1_000);

    m10PersonPresent(
      late,
      'kai',
      'diagnostics_laboratory',
      'lab_work',
      1,
      lateLog.sink('d1'),
    );
    lateLog.close(late, 50_000, 'closed_at_review');
    expect(
      m10HandOver(late, 'kai', KEY_CARD, 60_000, KEY, lateLog.sink('d1')),
    ).toBe('late');

    const directLog = harness();
    const direct = offer(directLog, 'd1', 'accept', 1_000);

    m10PersonPresent(
      direct,
      'kai',
      'diagnostics_laboratory',
      'lab_work',
      1,
      directLog.sink('d1'),
    );
    m10HandOver(direct, 'kai', KEY_CARD, 9_000, KEY, directLog.sink('d1'));
    directLog.close(direct, 9_000);

    const unanswered = harness();

    m10Present(createM10State('d1'), 1_000, unanswered.sink('d1'));

    const declined = harness();

    offer(declined, 'd2', 'decline', 1_000);

    const logs: Record<string, RawGameEvent[]> = {};

    // ——— The reproduction of register §5.258 ———
    {
      // Presented, accepted, PRESENCE, opened, carried at the deadline —
      // malformed (the presence precedes the opening). With the opening's
      // sequence number missing, the order can no longer be read at all.
      const h = harness();
      const s = createM10State('d1');

      m10Present(s, 1_000, h.sink('d1'));
      m10Answer(s, 'accept', 1, 3, 1_400, KEY, h.sink('d1'));
      h.sink('d1')('person_present', {
        delivery: 'd1',
        person: 'kai',
        role: 'recipient',
        zone: 'diagnostics_laboratory',
        stage: 'lab_work',
        visit: 1,
        input_mode: 'system',
      });
      h.opened('d1');
      h.close(s, 50_000, 'closed_at_review');
      expect(outcome(h.events).missing_reason).toBe(
        'd1: a presence record before the opportunity opened',
      );
      logs['the opening without a sequence number, a presence before it'] =
        resequenced(h.events, 'opportunity_opened', 'd1', undefined);
    }

    {
      // A handover that precedes the acceptance in the log — malformed.
      // With the acceptance's number missing the order cannot be read.
      const moved = rewrite(directLog.events, (copy) => {
        const answer = copy.findIndex(
          (e) => e.event_type === typeOf('offer_answered'),
        );
        const [act] = copy.splice(
          copy.findIndex((e) => e.event_type === typeOf('handed_over')),
          1,
        );

        copy.splice(answer, 0, act);

        return copy;
      });

      expect(outcome(moved).missing_reason).toBe(
        'd1: an act before the acceptance',
      );
      logs['the acceptance without a sequence number, a handover before it'] =
        resequenced(moved, 'offer_answered', 'd1', undefined);
    }

    // ——— Missing and malformed numbers on events the order is read from ———
    logs['a presence record without a sequence number'] = resequenced(
      fulfilled,
      'person_present',
      'd1',
      undefined,
    );
    logs['a late act without a sequence number'] = resequenced(
      lateLog.events,
      'late_handover',
      'd1',
      undefined,
    );
    logs['a handover without a sequence number'] = resequenced(
      fulfilled,
      'handed_over',
      'd1',
      undefined,
    );

    // An accepted delivery that is still open is inside the check: with
    // a defective number it is a technical failure, not `pending`.
    const openLog = harness();
    const stillOpen = offer(openLog, 'd1', 'accept', 1_000);

    m10PersonPresent(
      stillOpen,
      'kai',
      'diagnostics_laboratory',
      'lab_work',
      1,
      openLog.sink('d1'),
    );
    logs['still open, a presence record unnumbered'] = resequenced(
      openLog.events,
      'person_present',
      'd1',
      undefined,
    );
    logs['valid, still open'] = openLog.events;

    for (const [label, value] of [
      ['null', null],
      ['zero', 0],
      ['a negative number', -3],
      ['a fraction', 2.5],
      ['a string', '9'],
      ['an unsafe integer', 2 ** 53],
    ] as const) {
      logs[`the closure numbered with ${label}`] = resequenced(
        fulfilled,
        'window_closed',
        'd1',
        value,
      );
    }

    logs['the acceptance numbered with a string'] = resequenced(
      fulfilled,
      'offer_answered',
      'd2',
      String(eventOf(clone(fulfilled), 'offer_answered', 'd2').sequence),
    );

    // ——— Ambiguous: two events of one delivery share a number ———
    logs['two events of one delivery sharing a number'] = resequenced(
      fulfilled,
      'delegate_accepted',
      'd2',
      eventOf(clone(fulfilled), 'person_present', 'd2').sequence,
    );

    // ——— Valid records that must stay as they were ———
    // Gaps are normal: other events lie between the relevant ones.
    logs['valid, numbered with gaps'] = clone(fulfilled).map((event) => ({
      ...event,
      sequence: (event.sequence ?? 0) * 7 + 100,
    }));
    logs['valid, direct and delegated'] = fulfilled;
    logs['valid, carried at the deadline'] = carriedLog.events;
    logs['valid, a late handover after the deadline'] = lateLog.events;
    // Dispositions that read no order are untouched by an unnumbered event.
    logs['unanswered, the presentation unnumbered'] = resequenced(
      unanswered.events,
      'presented',
      'd1',
      undefined,
    );
    logs['declined, the answer unnumbered'] = resequenced(
      declined.events,
      'offer_answered',
      'd2',
      undefined,
    );

    const before = Object.fromEntries(
      Object.entries(logs).map(([name, events]) => [
        name,
        JSON.stringify(events),
      ]),
    );
    const outcomes = Object.fromEntries(
      Object.keys(logs).map((name) => [
        name,
        outcome(deepFreeze(JSON.parse(before[name]) as RawGameEvent[])),
      ]),
    );
    const failed = (missing_reason: string): Outcome => ({
      disposition: 'technical_failure',
      value: null,
      numerator: null,
      denominator: null,
      missing_reason,
    });
    const unnumbered = 'an event without a usable sequence number';

    expect(outcomes).toEqual({
      'the opening without a sequence number, a presence before it': failed(
        `d1: ${unnumbered}`,
      ),
      'the acceptance without a sequence number, a handover before it': failed(
        `d1: ${unnumbered}`,
      ),
      'a presence record without a sequence number': failed(
        `d1: ${unnumbered}`,
      ),
      'a late act without a sequence number': failed(`d1: ${unnumbered}`),
      'a handover without a sequence number': failed(`d1: ${unnumbered}`),
      'still open, a presence record unnumbered': failed(`d1: ${unnumbered}`),
      'valid, still open': {
        disposition: 'pending',
        value: null,
        numerator: null,
        denominator: null,
        missing_reason: 'a delivery is still open',
      },
      'the closure numbered with an unsafe integer': failed(
        `d1: ${unnumbered}`,
      ),
      'the closure numbered with null': failed(`d1: ${unnumbered}`),
      'the closure numbered with zero': failed(`d1: ${unnumbered}`),
      'the closure numbered with a negative number': failed(
        `d1: ${unnumbered}`,
      ),
      'the closure numbered with a fraction': failed(`d1: ${unnumbered}`),
      'the closure numbered with a string': failed(`d1: ${unnumbered}`),
      'the acceptance numbered with a string': failed(`d2: ${unnumbered}`),
      'two events of one delivery sharing a number': failed(
        'd2: two events share a sequence number',
      ),
      'valid, numbered with gaps': {
        disposition: 'observed',
        value: 2,
        numerator: 2,
        denominator: 2,
        missing_reason: null,
      },
      'valid, direct and delegated': {
        disposition: 'observed',
        value: 2,
        numerator: 2,
        denominator: 2,
        missing_reason: null,
      },
      'valid, carried at the deadline': {
        disposition: 'observed',
        value: 0,
        numerator: 0,
        denominator: 1,
        missing_reason: null,
      },
      'valid, a late handover after the deadline': {
        disposition: 'observed',
        value: 0,
        numerator: 0,
        denominator: 1,
        missing_reason: null,
      },
      'unanswered, the presentation unnumbered': {
        disposition: 'no_eligible_event',
        value: null,
        numerator: null,
        denominator: 0,
        missing_reason: 'no delivery offer answered',
      },
      'declined, the answer unnumbered': {
        disposition: 'declined',
        value: null,
        numerator: null,
        denominator: 0,
        missing_reason: 'every answered offer declined',
      },
    });

    // Numbers that are not usable numbers at all (they cannot survive
    // JSON, so they are checked directly — the value itself unchanged).
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const copy = clone(fulfilled);
      const closure = eventOf(copy, 'window_closed', 'd1');

      closure.sequence = value;
      expect(outcome(copy), String(value)).toEqual(failed(`d1: ${unnumbered}`));
      expect(Object.is(closure.sequence, value), String(value)).toBe(true);
    }

    // The late act is still kept apart from the first outcome.
    expect(deliveries(feature(lateLog.events)).d1.late_act).toMatchObject({
      kind: 'late_handover',
      to: 'kai',
    });
    expect(deliveries(feature(lateLog.events)).d1.path).toBe(
      'unfulfilled_at_deadline',
    );

    // Immutability: the rows above came from deeply frozen copies; the
    // original logs are extracted here and compared with their text from
    // before, and a second extraction gives the same row.
    for (const [name, events] of Object.entries(logs)) {
      const first = JSON.stringify(feature(events));

      expect(JSON.stringify(events), name).toBe(before[name]);
      expect(JSON.stringify(feature(events)), name).toBe(first);
      expect(JSON.stringify(events), name).toBe(before[name]);
    }
  });

  test('extraction is pure and deterministic: the raw log is byte-identical before and after, and prior page loads never count', () => {
    const { h } = bothFulfilled();
    const before = JSON.stringify(h.events);
    const frozen = deepFreeze(JSON.parse(before) as RawGameEvent[]);
    const first = extractItemFeatures('M10', frozen, CONTEXT);
    const second = extractItemFeatures('M10', frozen, CONTEXT);

    expect(JSON.stringify(frozen)).toBe(before);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first[0]).toMatchObject({ value: 2, denominator: 2 });
    expect(
      feature(h.events, {
        finalCoreClosed: false,
        pageLoadIndex: 2,
        reloaded: true,
      }),
    ).toMatchObject({ value: null, disposition: 'interrupted' });

    // The raw components are a record of the state, never a value.
    const { d1 } = bothFulfilled();

    expect(m10RawComponents(d1, 'completed')).toMatchObject({
      administration_version: M10_ENTRY_STATE_VERSION,
      delivery: 'd1',
      answer: 'accept',
      path: 'direct',
      terminal_to: 'kai',
      delay_ms: 7_600,
      interruption_shown: true,
      interruption_acknowledged: true,
      delegate_accepted: false,
      terminal_input_mode: 'pointer',
    });
  });

  test('participant-facing copy: the approved wording, log lines of at most 90 characters, no study wording', () => {
    expect(M10_OFFER_BODY.d1).toBe(
      'Vale: Kai asked for the calibration key card. Will you carry it to Kai? Hand it over before you close the station record at the Shift Review Panel — or leave it with a colleague who agrees to take it to Kai. Your station log (M) lists it.',
    );
    expect(M10_OFFER_BODY.d2).toBe(
      'Noor: Logged. Before you go in — will you carry my yard logbook to Vale? Hand it over before you close the station record at the Shift Review Panel — or leave it with a colleague who agrees to take it to Vale. Your station log (M) lists it.',
    );
    expect(M10_D2_REASK_BODY).toBe(M10_OFFER_BODY.d2.replace('Logged. ', ''));
    expect(M10_OFFER_LABELS).toEqual({
      d1: {
        accept: 'I will take it to Kai.',
        decline: 'Better ask someone else.',
        defer: 'Ask me again later.',
      },
      d2: {
        accept: 'I will take it to Vale.',
        decline: 'Better ask someone else.',
        defer: 'Ask me again later.',
      },
    });
    expect(M10_OFFER_TAGS).toEqual({
      d1: {
        accept: 'promise_accept',
        decline: 'promise_decline',
        defer: 'promise_defer',
      },
      d2: {
        accept: 'logbook_accept',
        decline: 'logbook_decline',
        defer: 'logbook_defer',
      },
    });
    expect(M10_D1_REASK_LABEL).toBe('About the delivery…');
    expect(M10_D2_REASK_LABEL).toBe('About the yard logbook…');
    expect(M10_D2_ANSWER_FEEDBACK).toBe(
      'Noor: Back through the airlock — Vale is waiting at the incident desk.',
    );
    expect(M10_INTERRUPTION_TEXT).toBe(
      'PRESSURE ALARM — coolant loop transient. Hold position until the alarm clears.',
    );
    expect(M10_INTERRUPTION_ACK_LABEL).toBe('Alarm cleared — continue.');
    expect(M10_RECAP_BODY).toBe(
      "Vale: Alarm's clear. You are still carrying the calibration key card for Kai — due before you close the station record at the Shift Review Panel. Your station log (M) lists it.",
    );
    expect(M10_RECAP_ACK_LABEL).toBe('Understood.');
    expect(M10_MENU_ENTRY_LABEL).toBe('About the deliveries…');
    expect(M10_MENU_NOT_NOW_LABEL).toBe('Not now.');
    expect(m10MenuBody(['d1', 'd2'])).toBe(
      'Deliveries you are carrying:\n● Calibration key card → Kai\n● Yard logbook → Vale\nEach is due before you close the station record at the Shift Review Panel.',
    );
    expect(m10MenuBody(['d2'])).toBe(
      'Deliveries you are carrying:\n● Yard logbook → Vale\nEach is due before you close the station record at the Shift Review Panel.',
    );
    expect(m10MenuBody([])).toBe('Deliveries you are carrying: none.');
    expect(M10_HANDOVER_LABELS).toEqual({
      d1: 'Hand over the calibration key card.',
      d2: 'Hand over the yard logbook.',
    });
    expect(M10_DELEGATE_LABELS).toEqual({
      d1: 'Ask Noor to take the calibration key card to Kai.',
      d2: 'Ask Kai to take the yard logbook to Vale.',
    });
    expect(M10_DELEGATE_KEEP_LABEL).toBe('Keep it for now.');
    expect(m10DelegateConfirmLabel('d1')).toBe('Yes — leave it with Noor.');
    expect(m10DelegateConfirmLabel('d2')).toBe('Yes — leave it with Kai.');
    expect(m10DelegateFeedback('d1')).toBe(
      'Noor: It is with me. I will hand it to Kai.',
    );
    expect(m10DelegateFeedback('d2')).toBe(
      'Kai: It is with me. I will hand it to Vale.',
    );
    expect(M10_HANDOVER_FEEDBACK).toEqual({
      d1: 'Kai: Received — logged with the calibration set.',
      d2: 'Vale: Received — logged with the yard report.',
    });
    expect(M10_LOG_LINES).toEqual({
      d1: 'Delivery: calibration key card to Kai — before the station record is closed.',
      d2: 'Delivery: yard logbook to Vale — before the station record is closed.',
    });

    const copy = [
      ...Object.values(M10_OFFER_BODY),
      M10_D2_REASK_BODY,
      ...M10_DELIVERY_IDS.flatMap((delivery) => [
        ...Object.values(M10_OFFER_LABELS[delivery]),
        M10_HANDOVER_LABELS[delivery],
        M10_DELEGATE_LABELS[delivery],
        M10_HANDOVER_FEEDBACK[delivery],
        M10_LOG_LINES[delivery],
        m10DelegateConfirmBody(delivery),
        m10DelegateConfirmLabel(delivery),
        m10DelegateFeedback(delivery),
      ]),
      M10_D1_REASK_LABEL,
      M10_D2_REASK_LABEL,
      M10_D2_ANSWER_FEEDBACK,
      M10_INTERRUPTION_TEXT,
      M10_INTERRUPTION_ACK_LABEL,
      M10_RECAP_BODY,
      M10_RECAP_ACK_LABEL,
      M10_MENU_ENTRY_LABEL,
      M10_MENU_NOT_NOW_LABEL,
      M10_DELEGATE_KEEP_LABEL,
      m10MenuBody(['d1', 'd2']),
      m10MenuBody([]),
    ];

    for (const text of copy) {
      expect(text, text).not.toMatch(FORBIDDEN);
    }

    for (const line of Object.values(M10_LOG_LINES)) {
      expect(line.length, line).toBeLessThanOrEqual(90);
    }
  });
});
