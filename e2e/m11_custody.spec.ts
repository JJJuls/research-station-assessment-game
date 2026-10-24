/**
 * Station 080 M11 — borrowed-instrument custody (Unit 3), pure tests.
 *
 * Playwright test blocks that never touch `page`: the offer / explicit
 * answer, an uncarriable acceptance is inaccessible (never unresolved),
 * a return to the owner or the return point before the first departure
 * resolves the custody, the first departure freezes the outcome and a
 * later handover is a late resolution only, the reload guard recognises a
 * prior offer, and the extractor reproduces unresolved / accepted
 * accessible with declined ≠ no eligible event ≠ pending ≠ interrupted ≠
 * not presented, plus the per-occasion records companion.
 *
 * U24 RL-2 (`RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4 G2, §5 "M11 (lab,
 * yard)", §8; register §5.406 decision A, §5.407): each occasion's class
 * after a reload (H = its loan offered in an earlier load, the existing
 * rule), the permission to administer and the reading — the existing
 * per-occasion held-back rule, OBS + NOP (A) and NOP + NOP (A) by the
 * first-load rule, U and M never offered; F-D, F-E and F-A; the RL-1C
 * missing-check rule. Records from r3 §4's stage map with the RL-0 helper;
 * expected readings from r3 §5, never from running the extractor.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import {
  classifyM11Reload,
  m11PriorLoadCheck,
} from '../src/measurement/features/m11';
import { registerEntry } from '../src/measurement/registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  type ReloadEvent,
} from '../src/measurement/reloadCheck';
import {
  createM11State,
  m11Answer,
  m11Carrying,
  m11CustodyOpen,
  m11Depart,
  m11Lapse,
  type M11LogSink,
  type M11Occasion,
  m11Offer,
  m11OwnerAvailable,
  m11PriorAdministration,
  m11RawComponents,
  m11Resolve,
  m11ReturnPointAvailable,
  type M11State,
} from '../src/pilot/windows/m11CustodyModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    occasion: M11Occasion,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene:
        occasion === 'lab'
          ? 'diagnostics_laboratory'
          : 'exterior_recovery_yard',
      event_type: `proto_m11_custody_${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: `proto_m11_custody_${occasion}`,
        occasion,
        ...metadata,
      },
    });
  };
  const sink =
    (occasion: M11Occasion): M11LogSink =>
    (suffix, metadata) =>
      push(occasion, suffix, metadata);

  return {
    events,
    sink,
    close: (s: M11State, reason = 'completed') =>
      push(s.spec.occasion, 'window_closed', {
        exit_state:
          reason === 'closed_at_review' ? 'closed_at_review' : 'completed',
        raw_components: m11RawComponents(s, reason),
      }),
  };
}

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };

test.describe('M11 borrowed-instrument custody (pure)', () => {
  test('register row: v3 route with two occasions in different rooms, a cited override and the records companion', () => {
    const entry = registerEntry('M11');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m11_custody_lab',
      'proto_m11_custody_yard',
    ]);
    expect(entry.route.windows.map((w) => w.zone)).toEqual([
      'diagnostics_laboratory',
      'exterior_recovery_yard',
    ]);
    expect(entry.disposition).toBe('PRIMARY-CANDIDATE');
    expect(entry.disposition_override?.approved_by).toContain('M11 row');
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.coverage_label).toBe('exploratory');
    expect(entry.independence.kind).toBe('independent_occasions');
    expect(entry.features.map((f) => f.feature_id)).toEqual([
      'm11_unresolved_custodies',
      'm11_custody_records',
    ]);
    expect(entry.features[0].denominator_kind).toBe('conditional_eligibility');
    expect(entry.operational_label).toBe(
      'Borrowed instruments (Laboratory / Recovery Yard)',
    );
  });

  test('offer, explicit answer, resolution before departure, frozen departure, late handover', () => {
    const h = harness();
    const lab = createM11State('lab');
    const log = h.sink('lab');

    // Nothing before the offer; the answer is explicit and once.
    expect(m11Answer(lab, true, true, 10, 'keyboard', log)).toBe(false);
    expect(m11Offer(lab, 100, log)).toBe(true);
    expect(m11Offer(lab, 101, log)).toBe(false);
    expect(m11Answer(lab, true, true, 200, 'keyboard', log)).toBe(true);
    expect(m11Answer(lab, false, true, 201, 'keyboard', log)).toBe(false);
    expect(m11Carrying(lab)).toBe(true);
    expect(m11CustodyOpen(lab)).toBe(true);

    // Encounters while carrying are recorded; the return point resolves.
    m11OwnerAvailable(lab, log);
    m11ReturnPointAvailable(lab, log);
    expect(
      m11Resolve(lab, 'return_point', 'workstation', 900, 'pointer', log),
    ).toBe('resolved');
    expect(m11Carrying(lab)).toBe(false);
    expect(m11Resolve(lab, 'owner_handover', 'kai', 950, 'pointer', log)).toBe(
      'none',
    );
    // Departure after a resolution freezes "resolved" (not unresolved).
    expect(m11Depart(lab, 1_000, log)).toBe(true);
    expect(lab.unresolved_at_departure).toBe(false);
    expect(m11Depart(lab, 2_000, log)).toBe(false);
    expect(m11RawComponents(lab, 'completed')).toMatchObject({
      accepted: true,
      accessible: true,
      resolved_before_departure: true,
      resolution: { method: 'return_point', to: 'workstation' },
      unresolved_at_departure: false,
      owner_encounters_while_carrying: 1,
      return_point_encounters_while_carrying: 1,
    });

    // Yard: accepted, carried out through the airlock, handed to Kai later.
    const yard = createM11State('yard');
    const ylog = h.sink('yard');

    m11Offer(yard, 100, ylog);
    m11Answer(yard, true, true, 200, 'keyboard', ylog);
    expect(m11Depart(yard, 5_000, ylog)).toBe(true);
    expect(yard.unresolved_at_departure).toBe(true);
    expect(m11CustodyOpen(yard)).toBe(false);
    expect(m11Carrying(yard)).toBe(true);
    // The window closes at the departure; the late handover is logged
    // afterwards as its own event (the primary never changes).
    h.close(yard);
    expect(
      m11Resolve(yard, 'named_handover', 'kai', 9_000, 'keyboard', ylog),
    ).toBe('late');
    expect(yard.unresolved_at_departure).toBe(true);
    expect(yard.late_resolution).toMatchObject({
      method: 'named_handover',
      to: 'kai',
    });
    expect(yard.resolution).toBeNull();

    h.close(lab);

    const rows = extractItemFeatures('M11', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      feature_id: 'm11_unresolved_custodies',
      value: 1,
      numerator: 1,
      denominator: 2,
      planned_denominator: 2,
      disposition: 'observed',
      closure_reason: 'completed',
      included_ids: ['m11_custody_lab', 'm11_custody_yard'],
      coverage_label: 'exploratory',
      independence: 'independent_occasions',
    });
    expect(rows[0].components).toMatchObject({
      offered: 2,
      accepted: 2,
      declined: 0,
      inaccessible: 0,
      late_resolutions: 1,
    });
    expect(rows[1]).toMatchObject({
      feature_id: 'm11_custody_records',
      disposition: 'observed',
    });
    const yardRecord = (
      rows[1].value as {
        yard: {
          unresolved_at_departure: boolean;
          late_resolution: { method: string; to: string } | null;
        };
      }
    ).yard;

    expect(yardRecord.unresolved_at_departure).toBe(true);
    expect(yardRecord.late_resolution).toMatchObject({
      method: 'named_handover',
      to: 'kai',
    });
  });

  test('declined loans are outside the denominator; one accepted and returned custody is a complete 0 / 1; an uncarriable acceptance is inaccessible', () => {
    // Both declined → null, declined (never unresolved, never zero).
    const declined = harness();

    for (const occasion of ['lab', 'yard'] as const) {
      const s = createM11State(occasion);
      const log = declined.sink(occasion);

      m11Offer(s, 1, log);
      m11Answer(s, false, false, 2, 'keyboard', log);
      expect(m11Carrying(s)).toBe(false);
      expect(m11Depart(s, 3, log)).toBe(false);
      declined.close(s);
    }

    const declinedRows = extractItemFeatures('M11', declined.events, CONTEXT);

    expect(declinedRows[0]).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'declined',
    });
    expect(declinedRows[1].disposition).toBe('observed');

    // One declined, one accepted and handed back → 0 / 1, complete
    // (conditional-eligibility denominator, never "incomplete").
    const mixed = harness();
    const lab = createM11State('lab');
    const yard = createM11State('yard');

    m11Offer(lab, 1, mixed.sink('lab'));
    m11Answer(lab, false, false, 2, 'keyboard', mixed.sink('lab'));
    mixed.close(lab);
    m11Offer(yard, 1, mixed.sink('yard'));
    m11Answer(yard, true, true, 2, 'keyboard', mixed.sink('yard'));
    expect(
      m11Resolve(
        yard,
        'owner_handover',
        'noor',
        50,
        'keyboard',
        mixed.sink('yard'),
      ),
    ).toBe('resolved');
    m11Depart(yard, 60, mixed.sink('yard'));
    mixed.close(yard);

    expect(extractItemFeatures('M11', mixed.events, CONTEXT)[0]).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 1,
      disposition: 'observed',
      included_ids: ['m11_custody_yard'],
    });

    // Accepted but the belt was full → inaccessible → no eligible event.
    const full = harness();
    const s = createM11State('lab');

    m11Offer(s, 1, full.sink('lab'));
    m11Answer(s, true, false, 2, 'keyboard', full.sink('lab'));
    expect(s.accessible).toBe(false);
    expect(s.inaccessible_reason).toBe('belt_full');
    expect(m11Carrying(s)).toBe(false);
    expect(m11Depart(s, 3, full.sink('lab'))).toBe(false);
    full.close(s);

    expect(extractItemFeatures('M11', full.events, CONTEXT)[0]).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'no_eligible_event',
    });
  });

  test('pending while a custody is open; not presented, interrupted and the reload guard are distinct', () => {
    const empty = extractItemFeatures('M11', [], CONTEXT);

    expect(empty[0]).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expect(
      extractItemFeatures('M11', [], { ...CONTEXT, reloaded: true })[0]
        .disposition,
    ).toBe('interrupted');

    const open = harness();
    const s = createM11State('lab');

    m11Offer(s, 1, open.sink('lab'));
    m11Answer(s, true, true, 2, 'keyboard', open.sink('lab'));
    expect(extractItemFeatures('M11', open.events, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'pending',
    });

    // The guard recognises a prior offer of the SAME occasion only.
    expect(m11PriorAdministration(open.events, 'lab')).toBe(true);
    expect(m11PriorAdministration(open.events, 'yard')).toBe(false);
    expect(m11PriorAdministration([], 'lab')).toBe(false);

    // The guard's marker in the new load makes the item interrupted.
    const held = harness();

    held.sink('lab')('technical_failure', {
      detail: 'reload after the offer: custody not re-run',
      input_mode: 'system',
    });
    expect(
      extractItemFeatures('M11', held.events, {
        ...CONTEXT,
        reloaded: true,
      })[0],
    ).toMatchObject({ value: null, disposition: 'interrupted' });
  });

  test('an untaken loan lapses outside the denominator (distinct from a refusal); a reload that held back one occasion makes the item interrupted even when the other was observed', () => {
    // Lapse: the plain acknowledgement passed without a decision.
    const h = harness();
    const lab = createM11State('lab');
    const log = h.sink('lab');

    expect(m11Lapse(lab, 5, log)).toBe(false);
    m11Offer(lab, 10, log);
    expect(m11Lapse(lab, 20, log)).toBe(true);
    expect(m11Lapse(lab, 21, log)).toBe(false);
    expect(m11Answer(lab, true, true, 22, 'keyboard', log)).toBe(false);
    expect(m11Carrying(lab)).toBe(false);
    expect(m11RawComponents(lab, 'completed')).toMatchObject({
      accepted: null,
      lapsed: true,
      owner_accessible: true,
      return_point_accessible: true,
      custody_ms: null,
    });
    h.close(lab);

    const yard = createM11State('yard');

    m11Offer(yard, 30, h.sink('yard'));
    m11Answer(yard, false, false, 31, 'keyboard', h.sink('yard'));
    h.close(yard);

    const rows = extractItemFeatures('M11', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'declined',
    });
    expect(rows[0].components).toMatchObject({ declined: 1, untaken: 1 });

    // Mixed reload: the lab offer was presented in an earlier load (held
    // back now), the yard custody observed in this load -> interrupted,
    // with the yard value kept beside it, never a complete observation.
    const mixed = harness();

    mixed.sink('lab')('technical_failure', {
      detail: 'reload after the offer: custody not re-run',
      input_mode: 'system',
    });

    const y = createM11State('yard');

    m11Offer(y, 100, mixed.sink('yard'));
    m11Answer(y, true, true, 110, 'keyboard', mixed.sink('yard'));
    m11Depart(y, 900, mixed.sink('yard'));
    mixed.close(y);

    const mixedRows = extractItemFeatures('M11', mixed.events, {
      ...CONTEXT,
      reloaded: true,
    });

    expect(mixedRows[0]).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'interrupted',
      censored: true,
    });
    expect(mixedRows[0].components).toMatchObject({
      interrupted_occasions: ['lab'],
    });
    expect(
      (mixedRows[1].value as { lab: { interrupted: boolean } | null }).lab,
    ).toEqual({ interrupted: true });
  });
});

/* ================================================================== *
 * U24 RL-2: the logged reload check of the two custodies (pure)
 * ================================================================== */

const RL2_CONTINUOUS = {
  first_sequence: 1,
  sequence_gap_count: 0,
  sequence_duplicate_count: 0,
  recovered_from_chunks: false,
};
const RL2_UNVERIFIED = { ...RL2_CONTINUOUS, recovered_from_chunks: true };
const RL2_DETAIL = {
  H: 'reload after the offer: custody not re-run',
  U: 'reload with an unverified earlier state: custody not administered',
  M: 'reload with a contradictory earlier check: custody not administered',
} as const;
const RL2_REASON = {
  H: 'loan offered in an earlier page load; not re-run after the reload',
  U: 'custody not administered after a reload: earlier history not verified',
  M: 'custody not administered after a reload: earlier check contradictory',
} as const;
const RL2_OCCASIONS = ['lab', 'yard'] as const;
const RL2_OWNER = { lab: 'kai', yard: 'noor' } as const;

/**
 * r3 §4 G2's stage map as reconciled in register §5.407 reading (a) (a
 * writer's reconciliation, for the owner; the stage-3 predicate is the
 * row's existing guard rule from its read-only model): stage 1 the
 * window's `presented`; stage 3 the existing guard's record (the model's
 * `offer_presented`: a loan offered earlier is held); the markers.
 */
const RL2_STAGES = Object.fromEntries(
  RL2_OCCASIONS.map((occasion) => [
    occasion,
    {
      briefing: (event: ReloadEvent) =>
        event.event_type === 'proto_m11_custody_presented' &&
        event.metadata?.occasion === occasion,
      opening: (event: ReloadEvent) =>
        m11PriorAdministration([event], occasion),
      holdBack: (event: ReloadEvent) =>
        event.event_type === 'proto_m11_custody_technical_failure' &&
        event.metadata?.occasion === occasion,
    },
  ]),
);

function rl2Record(
  pageLoadIndex: number,
  prior: readonly RawGameEvent[],
  integrity = RL2_CONTINUOUS,
) {
  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents: prior,
    integrity,
    occasions: RL2_STAGES,
  });
}

type Rl2Step = 'none' | 'offer' | 'decline' | 'returned' | 'unresolved';

/**
 * One occasion's events as the window adapter writes them: the model's
 * offer, then the window's `presented`; an answer, then the window's
 * opening; the closure.
 */
function rl2Occasion(
  h: ReturnType<typeof harness>,
  occasion: M11Occasion,
  step: Rl2Step | 'H' | 'U' | 'M',
) {
  const log = h.sink(occasion);
  const s = createM11State(occasion);

  if (step === 'none') {
    return;
  }

  if (step === 'H' || step === 'U' || step === 'M') {
    log('technical_failure', {
      detail: RL2_DETAIL[step],
      input_mode: 'system',
    });

    return;
  }

  expect(m11Offer(s, 10, log)).toBe(true);
  log('presented', { input_mode: 'system' });

  if (step === 'offer') {
    return;
  }

  const accepted = step !== 'decline';

  m11Answer(s, accepted, accepted, 20, 'keyboard', log);
  log('opportunity_opened', { input_mode: 'system' });

  if (step === 'returned') {
    expect(
      m11Resolve(s, 'owner_handover', RL2_OWNER[occasion], 50, 'keyboard', log),
    ).toBe('resolved');
  }

  m11Depart(s, 60, log);
  h.close(s);
}

function rl2Place(
  events: readonly RawGameEvent[],
  index: number,
  from: number,
): RawGameEvent[] {
  return events.map((event, i) => ({
    ...event,
    page_load_index: index,
    sequence: from + i,
  }));
}

function rl2Prior(
  index: number,
  from: number,
  steps: Partial<Record<M11Occasion, Rl2Step | 'H' | 'U' | 'M'>>,
): RawGameEvent[] {
  const h = harness();

  for (const occasion of RL2_OCCASIONS) {
    rl2Occasion(h, occasion, steps[occasion] ?? 'none');
  }

  return rl2Place(
    [
      {
        session_id: 's',
        timestamp_ms: 0,
        scene: 'dock',
        event_type: 'session_start',
        metadata: {},
      },
      ...h.events,
    ],
    index,
    from,
  );
}

function rl2CheckEvent(record: object): RawGameEvent {
  return {
    session_id: 's',
    timestamp_ms: 0,
    scene: 'diagnostics_laboratory',
    event_type: 'proto_m11_custody_prior_load_checked',
    metadata: {
      opportunity_id: 'proto_m11_custody_lab',
      occasion: 'lab',
      ...record,
      input_mode: 'system',
    },
  };
}

function rl2Raw(
  prior: RawGameEvent[],
  records: readonly object[],
  steps: Record<M11Occasion, Rl2Step | 'H' | 'U' | 'M'>,
  pageLoadIndex = 2,
) {
  const h = harness();

  for (const occasion of RL2_OCCASIONS) {
    rl2Occasion(h, occasion, steps[occasion]);
  }

  const current = rl2Place(
    [...records.map(rl2CheckEvent), ...h.events],
    pageLoadIndex,
    (prior.at(-1)?.sequence ?? 0) + 1,
  );

  return {
    current,
    rows: extractItemFeatures('M11', [...prior, ...current], {
      finalCoreClosed: true,
      pageLoadIndex,
      reloaded: pageLoadIndex > 1,
    }),
  };
}

/** A reloaded load as the runtime writes it (not A ⇒ marker, never offered). */
function rl2Load(
  prior: RawGameEvent[],
  steps: Record<M11Occasion, Rl2Step>,
  options: {
    integrity?: typeof RL2_CONTINUOUS;
    pageLoadIndex?: number;
    records?: (record: Record<string, unknown>) => object[];
  } = {},
) {
  const pageLoadIndex = options.pageLoadIndex ?? 2;
  const record = rl2Record(
    pageLoadIndex,
    prior,
    options.integrity,
  ) as unknown as Record<string, unknown>;
  const records = options.records?.(record) ?? [record];
  const reload = classifyReload({
    pageLoadIndex,
    checks: records,
    occasions: RL2_OCCASIONS,
  });
  const runtime = Object.fromEntries(
    RL2_OCCASIONS.map((occasion) => {
      const cls = reload.occasions[occasion].class;

      return [
        occasion,
        steps[occasion] === 'none' || cls === 'A' ? steps[occasion] : cls!,
      ];
    }),
  ) as Record<M11Occasion, Rl2Step | 'H' | 'U' | 'M'>;

  return {
    record,
    reload,
    ...rl2Raw(prior, records, runtime, pageLoadIndex),
  };
}

const RL2_NEVER = rl2Prior(1, 1, {});
const RL2_LAB_OFFERED = rl2Prior(1, 1, { lab: 'decline' });
const RL2_BOTH_OFFERED = rl2Prior(1, 1, { lab: 'decline', yard: 'offer' });
const RL2_LAB_EARLIER_U = rl2Prior(1, 1, { lab: 'U' });

test.describe('M11 the logged reload check (U24 RL-2, pure)', () => {
  const cases: readonly {
    name: string;
    prior: RawGameEvent[];
    steps: Record<M11Occasion, Rl2Step>;
    integrity?: typeof RL2_CONTINUOUS;
    classes: [string, string];
    row: Record<string, unknown>;
    records?: Record<string, unknown>;
    reason?: string;
  }[] = [
    {
      name: 'HB + OBS ⇒ interrupted, the other occasion’s value kept (the existing per-occasion rule)',
      prior: RL2_LAB_OFFERED,
      steps: { lab: 'offer', yard: 'unresolved' },
      classes: ['H', 'A'],
      row: {
        disposition: 'interrupted',
        value: 1,
        numerator: 1,
        denominator: 1,
      },
      records: { lab: { interrupted: true } },
    },
    {
      name: 'HB + NOP ⇒ interrupted · null',
      prior: RL2_LAB_OFFERED,
      steps: { lab: 'offer', yard: 'none' },
      classes: ['H', 'A'],
      row: { disposition: 'interrupted', value: null },
      reason: RL2_REASON.H,
    },
    {
      name: 'HB + HB ⇒ interrupted · null',
      prior: RL2_BOTH_OFFERED,
      steps: { lab: 'offer', yard: 'offer' },
      classes: ['H', 'H'],
      row: { disposition: 'interrupted', value: null },
      reason: RL2_REASON.H,
    },
    {
      name: 'OBS + NOP (A) ⇒ observed · 0 · 0/1 (the first-load rule)',
      prior: RL2_NEVER,
      steps: { lab: 'returned', yard: 'none' },
      classes: ['A', 'A'],
      row: { disposition: 'observed', value: 0, numerator: 0, denominator: 1 },
      records: { yard: null },
    },
    {
      name: 'NOP + NOP (A) ⇒ not_presented · null (b)',
      prior: RL2_NEVER,
      steps: { lab: 'none', yard: 'none' },
      classes: ['A', 'A'],
      row: { disposition: 'not_presented', value: null },
      reason: 'no loan offered',
    },
    {
      name: 'A, offered and unanswered ⇒ pending (the first-load reading)',
      prior: RL2_NEVER,
      steps: { lab: 'offer', yard: 'none' },
      classes: ['A', 'A'],
      row: { disposition: 'pending', value: null },
      reason: 'a custody is still open',
    },
    {
      name: 'U, history level ⇒ neither offered, interrupted · null, reason unverified (c)',
      prior: RL2_NEVER,
      integrity: RL2_UNVERIFIED,
      steps: { lab: 'offer', yard: 'none' },
      classes: ['U', 'U'],
      row: { disposition: 'interrupted', value: null },
      reason: RL2_REASON.U,
    },
    {
      name: 'F-D: HB(U) + OBS(A) ⇒ interrupted, the A occasion administered and its value kept (clarification 1)',
      prior: RL2_LAB_EARLIER_U,
      steps: { lab: 'offer', yard: 'returned' },
      classes: ['U', 'A'],
      row: {
        disposition: 'interrupted',
        value: 0,
        numerator: 0,
        denominator: 1,
      },
      records: { lab: { interrupted: true } },
    },
  ];

  for (const c of cases) {
    test(`r3 §5: ${c.name}`, () => {
      const { reload, rows } = rl2Load(c.prior, c.steps, {
        integrity: c.integrity,
      });

      expect([reload.occasions.lab.class, reload.occasions.yard.class]).toEqual(
        c.classes,
      );
      expect([
        reload.occasions.lab.administration_permitted,
        reload.occasions.yard.administration_permitted,
      ]).toEqual(c.classes.map((cls) => cls === 'A'));
      expect(rows[0]).toMatchObject(c.row);

      if (c.reason !== undefined) {
        expect(rows[0].missing_reason).toBe(c.reason);
        expect(rows[1].missing_reason).toBe(c.reason);
      }

      if (c.records !== undefined) {
        expect(rows[1].value).toMatchObject(c.records);
      }
    });
  }

  test('the extractor’s stage map is r3 §4’s; a first load writes none; the record is never task evidence', () => {
    for (const prior of [
      RL2_NEVER,
      RL2_LAB_OFFERED,
      RL2_BOTH_OFFERED,
      RL2_LAB_EARLIER_U,
    ]) {
      for (const integrity of [RL2_CONTINUOUS, RL2_UNVERIFIED]) {
        const record = rl2Record(2, prior, integrity);

        expect(m11PriorLoadCheck(2, prior, integrity)).toEqual(record);
        expect(classifyM11Reload(2, [record!])).toEqual(
          classifyReload({
            pageLoadIndex: 2,
            checks: [record!],
            occasions: RL2_OCCASIONS,
          }),
        );
      }
    }

    expect(m11PriorLoadCheck(1, [], RL2_CONTINUOUS)).toBeNull();
    expect(rl2Record(2, RL2_LAB_OFFERED)).toMatchObject({
      occasions: {
        lab: { prior_briefing_found: true, prior_opening_found: true },
        yard: { prior_opening_absence_established: true },
      },
    });

    const { rows, current } = rl2Load(RL2_NEVER, {
      lab: 'returned',
      yard: 'none',
    });

    expect(rows[0].disposition).toBe('observed');
    expect(rows[0].supporting_sequences).not.toContain(current[0].sequence);
  });

  test('F-A: two agreeing check records ⇒ U for both, refused; F-B: conflicting ⇒ U, coherence false', () => {
    const fa = rl2Load(
      RL2_NEVER,
      { lab: 'offer', yard: 'none' },
      { records: (record) => [record, { ...record }] },
    );

    expect(fa.reload).toMatchObject({ check_count: 2, check_coherent: true });
    expect(fa.reload.occasions.lab).toMatchObject({
      class: 'U',
      basis: 'duplicate_checks',
      administration_permitted: false,
    });
    expect(fa.rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason: RL2_REASON.U,
    });

    const fb = rl2Load(
      RL2_LAB_OFFERED,
      { lab: 'offer', yard: 'none' },
      {
        records: (record) => [
          record,
          { ...record, prior_opening_found: false },
        ],
      },
    );

    expect(fb.reload.check_coherent).toBe(false);
    expect(fb.reload.occasions.lab.class).toBe('U');
  });

  test('F-E: an H marker of one occasion leaves the other A, administered and observed', () => {
    const prior = [
      ...RL2_LAB_OFFERED,
      ...rl2Prior(2, RL2_LAB_OFFERED.length + 1, { lab: 'H' }),
    ];
    const { reload, rows } = rl2Load(
      prior,
      { lab: 'offer', yard: 'unresolved' },
      { pageLoadIndex: 3 },
    );

    expect(reload.occasions.lab.class).toBe('H');
    expect(reload.occasions.yard).toMatchObject({
      class: 'A',
      administration_permitted: true,
    });
    expect(rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: 1,
      denominator: 1,
    });
  });

  test('M and malformed: a self-contradictory record holds both as M; a malformed one is a technical failure on both rows', () => {
    const m = rl2Load(
      RL2_NEVER,
      { lab: 'offer', yard: 'none' },
      {
        integrity: RL2_UNVERIFIED,
        records: (record) => [
          { ...record, prior_opening_absence_established: true },
        ],
      },
    );

    expect(m.reload.occasions.lab).toMatchObject({
      class: 'M',
      administration_permitted: false,
    });
    expect(m.rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason: RL2_REASON.M,
    });

    const malformed = rl2Load(
      RL2_LAB_OFFERED,
      { lab: 'offer', yard: 'none' },
      { records: (record) => [{ ...record, page_load_index: 1 }] },
    );

    expect(malformed.reload.check_malformed).toBe(true);
    expect(malformed.rows[0].disposition).toBe('technical_failure');
    expect(malformed.rows[1].disposition).toBe('technical_failure');
  });

  test('RL-1C decision A: a loan offered and left unanswered in a reloaded load without its check is U (no_check), refused, and reads held', () => {
    expect(classifyM11Reload(2, []).occasions.lab).toMatchObject({
      class: 'U',
      basis: 'no_check',
      administration_permitted: false,
    });

    const { rows } = rl2Raw(RL2_NEVER, [], { lab: 'offer', yard: 'none' });

    expect(rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason: RL2_REASON.U,
    });
    expect(rows[1].missing_reason).toBe(RL2_REASON.U);
  });

  test('decision A contrasts: a first load keeps pending; a genuinely unreached reloaded load keeps the F5 / absentFeature reading; an unreached occasion beside an observed one is not held', () => {
    expect(
      rl2Raw([], [], { lab: 'offer', yard: 'none' }, 1).rows[0],
    ).toMatchObject({
      disposition: 'pending',
      missing_reason: 'a custody is still open',
    });
    expect(
      rl2Raw(RL2_NEVER, [], { lab: 'none', yard: 'none' }).rows[0],
    ).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'no current-load evidence after a reload: no loan offered',
    });
    expect(
      rl2Raw(RL2_NEVER, [], { lab: 'returned', yard: 'none' }).rows[0],
    ).toMatchObject({ disposition: 'observed', value: 0, denominator: 1 });
  });

  test('with a check, an occasion whose class is not A reads held even where its room was not reached in this load (its offer lies in an earlier load)', () => {
    const prior = rl2Prior(1, 1, { yard: 'offer' });
    const { reload, rows } = rl2Load(prior, { lab: 'returned', yard: 'none' });

    expect(reload.occasions.yard.class).toBe('H');
    expect(rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: 0,
      denominator: 1,
    });
    expect(rows[0].components).toMatchObject({
      interrupted_occasions: ['yard'],
    });
  });
});
