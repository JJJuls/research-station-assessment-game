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
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { registerEntry } from '../src/measurement/registerV3';
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
