/**
 * Station 080 M12 — two quality packets of three checkable fields with one
 * fault each (Unit 8), pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row; the
 * two products and their forms (one fault per product, matched salience,
 * counterbalanced position); the reference of a field is hidden until
 * that field is checked and a judgement press inside the settle window
 * after the reveal is refused; the first judgement is immutable and a
 * wrong judgement is still a check; "differs" opens the keypad and the
 * confirmed value is compared with the reference — never copied (a wrong
 * correction is an attempted, unsuccessful correction; Cancel abandons
 * without a correction and the judgement stands); an unchecked release is
 * an observed 0/3 for that product; the review freezes an open packet;
 * and the extractor over the raw family — 6/6, one released product ⇒
 * `incomplete` 3-field observation, an unchecked release ⇒ observed 0,
 * an open packet closed at the review ⇒ never a zero, never opened ≠
 * declined ≠ interrupted ≠ pending, a recount disagreement ⇒ technical
 * failure on both rows.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { registerEntry } from '../src/measurement/registerV3';
import {
  createM12State,
  M12_FAMILY,
  M12_FIELDS_PER_PRODUCT,
  M12_OPPORTUNITY_IDS,
  M12_PRODUCTS,
  M12_SETTLE_MS,
  m12AbandonCorrection,
  m12Check,
  m12ConfirmCorrection,
  m12FaultDetected,
  m12FaultyField,
  m12FieldsChecked,
  m12FieldsJudged,
  m12Freeze,
  m12Judge,
  m12KeypadBack,
  m12KeypadDigit,
  m12KeypadField,
  type M12LogSink,
  type M12Occasion,
  m12Open,
  m12PriorAdministration,
  m12RawComponents,
  m12Release,
  m12ReopenKeypad,
  type M12State,
} from '../src/pilot/windows/m12CheckModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    occasion: M12Occasion,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: occasion === 'o1' ? 'station_concourse' : 'records_workshop',
      event_type: `${M12_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: M12_OPPORTUNITY_IDS[occasion],
        occasion,
        ...metadata,
      },
    });
  };
  const sink =
    (occasion: M12Occasion): M12LogSink =>
    (suffix, metadata) =>
      push(occasion, suffix, metadata);

  return {
    events,
    sink,
    presented: (occasion: M12Occasion) =>
      push(occasion, 'presented', { input_mode: 'system' }),
    opened: (occasion: M12Occasion) =>
      push(occasion, 'opportunity_opened', { input_mode: 'system' }),
    heldBack: (occasion: M12Occasion) =>
      push(occasion, 'technical_failure', {
        detail: 'reload after administration',
        input_mode: 'system',
      }),
    close: (
      s: M12State,
      exit: 'completed' | 'closed_at_review' = 'completed',
    ) =>
      push(s.occasion, 'window_closed', {
        exit_state: exit,
        [exit === 'closed_at_review'
          ? 'raw_components_partial'
          : 'raw_components']: m12RawComponents(
          s,
          exit === 'closed_at_review' ? 'closed_at_review' : 'completed',
        ),
      }),
  };
}

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };
const T0 = 50_000;
const AFTER = M12_SETTLE_MS + 100;

/** Checks and judges every field correctly, correcting the fault with the reference. */
function checkAll(s: M12State, at: number, log: M12LogSink): number {
  let t = at;

  for (const field of s.fields) {
    expect(m12Check(s, field.id, t, 'pointer', log)).toBe('checked');
    t += AFTER;
    expect(
      m12Judge(
        s,
        field.id,
        field.faulty ? 'differs' : 'matches',
        t,
        'pointer',
        log,
      ),
    ).toBe('judged');
    t += 200;

    if (field.faulty) {
      for (const digit of field.reference) {
        expect(m12KeypadDigit(s, digit, 'keyboard', log)).toBe(true);
      }

      expect(m12ConfirmCorrection(s, t, 'keyboard', log)).toBe('entered');
      t += 200;
    }
  }

  return t;
}

test.describe('M12 quality packets (pure)', () => {
  test('register row: v3 route with two windows, a reverse-keyed fraction primary over six fields and a detail companion; two products with three fields and one fault each, counterbalanced by form', () => {
    const entry = registerEntry('M12');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m12_check_o1',
      'proto_m12_check_o2',
    ]);
    expect(entry.route.windows.map((w) => [w.id, w.zone, w.episode])).toEqual([
      ['m12_check_o1', 'station_concourse', 1],
      ['m12_check_o2', 'records_workshop', 2],
    ]);
    expect(entry.route.family_prefixes).toEqual(['proto_m12_check_']);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.source.reverse_keyed).toBe(true);
    expect(entry.target.occasions).toBe(2);
    expect(entry.independence.kind).toBe('independent_occasions');
    expect(entry.features.map((f) => [f.feature_id, f.kind, f.role])).toEqual([
      ['m12_fields_verified', 'fraction', 'primary'],
      ['m12_detection_and_correction', 'count', 'companion'],
    ]);
    expect(M12_FIELDS_PER_PRODUCT).toBe(3);

    for (const occasion of ['o1', 'o2'] as const) {
      const product = M12_PRODUCTS[occasion];

      expect(product.fields).toHaveLength(3);

      for (const form of ['form_a', 'form_b'] as const) {
        const s = createM12State(occasion, form);
        const faulty = s.fields.filter((field) => field.faulty);

        expect(faulty).toHaveLength(1);
        expect(faulty[0].printed).not.toBe(faulty[0].reference);
        expect(faulty[0].printed).toHaveLength(faulty[0].reference.length);
        // Matched salience: exactly one digit differs.
        expect(
          [...faulty[0].printed].filter(
            (digit, index) => digit !== faulty[0].reference[index],
          ),
        ).toHaveLength(1);
        expect(
          s.fields.filter(
            (field) => !field.faulty && field.printed !== field.reference,
          ),
        ).toHaveLength(0);
      }

      // The fault's position differs between the forms (not learnable across products).
      expect(m12FaultyField(createM12State(occasion, 'form_a')).index).not.toBe(
        m12FaultyField(createM12State(occasion, 'form_b')).index,
      );
    }

    // Between products the same form never puts the fault in the same slot twice… or does
    // so only by design: recorded here so a change is deliberate.
    expect(M12_PRODUCTS.o1.fault.form_a.index).toBe(1);
    expect(M12_PRODUCTS.o2.fault.form_a.index).toBe(1);
  });

  test('the reference is hidden until checked; a judgement inside the settle window is refused; the first judgement is immutable and a wrong judgement is still a check; a second check is logged, never a second observation', () => {
    const h = harness();
    const s = createM12State('o1', 'form_a');
    const log = h.sink('o1');

    // Nothing is judged or detected before any check.
    expect(m12FieldsChecked(s)).toBe(0);
    expect(m12Judge(s, 'fuse', 'matches', T0, 'pointer', log)).toBe('invalid');
    expect(
      h.events.filter((e) => e.event_type.endsWith('field_judged')),
    ).toEqual([]);

    // Check reveals the reference; a press inside the settle window is refused.
    expect(m12Check(s, 'fuse', T0, 'pointer', log)).toBe('checked');
    expect(s.pending).toBe('fuse');
    // One field at a time: another check waits for this judgement.
    expect(m12Check(s, 'wire', T0 + 50, 'pointer', log)).toBe('refused');
    expect(m12FieldsChecked(s)).toBe(1);
    expect(m12Judge(s, 'fuse', 'matches', T0 + 100, 'keyboard', log)).toBe(
      'refused',
    );
    expect(m12FieldsJudged(s)).toBe(0);
    expect(
      h.events.find(
        (e) =>
          e.event_type.endsWith('press_refused') &&
          e.metadata?.reason === 'reference_settling',
      )?.metadata,
    ).toMatchObject({ control: 'judge_matches', field_id: 'fuse' });

    // A settled judgement stands; the second judgement is invalid.
    expect(m12Judge(s, 'fuse', 'matches', T0 + AFTER, 'keyboard', log)).toBe(
      'judged',
    );
    expect(
      m12Judge(s, 'fuse', 'differs', T0 + AFTER + 500, 'keyboard', log),
    ).toBe('invalid');
    expect(s.fields[0]).toMatchObject({
      judgement: 'matches',
      judgement_correct: true,
      keypad_open: false,
    });

    // The faulty field (form A: index 1, "wire") judged "matches" — wrong but a check.
    expect(m12Check(s, 'wire', T0 + 2_000, 'pointer', log)).toBe('checked');
    expect(
      m12Judge(s, 'wire', 'matches', T0 + 2_000 + AFTER, 'pointer', log),
    ).toBe('judged');
    expect(s.fields[1]).toMatchObject({
      faulty: true,
      judgement: 'matches',
      judgement_correct: false,
    });
    expect(m12FaultDetected(s)).toBe(false);
    expect(m12FieldsJudged(s)).toBe(2);
    // Viewing again is a re-check event, not a second observation.
    expect(m12Check(s, 'wire', T0 + 3_000, 'pointer', log)).toBe('again');
    expect(s.fields[1].checks).toBe(2);
    expect(m12FieldsChecked(s)).toBe(2);

    const judgedEvents = h.events.filter((e) =>
      e.event_type.endsWith('field_judged'),
    );

    expect(judgedEvents).toHaveLength(2);
    expect(judgedEvents[1].metadata).toMatchObject({
      field_id: 'wire',
      judgement: 'matches',
      judgement_correct: false,
      faulty_field: true,
      fault_detected: false,
    });
    // Neither the reveal nor the judgement event says "detected" on a view.
    expect(
      h.events.find((e) => e.event_type.endsWith('field_checked'))?.metadata,
    ).not.toHaveProperty('fault_detected');
  });

  test('"differs" opens the keypad; the entered value is compared with the reference, never copied; Cancel abandons without a correction and the judgement stands; the keypad can be reopened; one correction per field', () => {
    const h = harness();
    const s = createM12State('o2', 'form_b'); // fault at t3: printed 2604, reference 2609
    const log = h.sink('o2');
    const faulty = m12FaultyField(s);

    expect(faulty.id).toBe('t3');
    expect(m12Check(s, 't3', T0, 'pointer', log)).toBe('checked');
    expect(m12Judge(s, 't3', 'differs', T0 + AFTER, 'pointer', log)).toBe(
      'judged',
    );
    expect(m12FaultDetected(s)).toBe(true);
    expect(m12KeypadField(s)?.id).toBe('t3');
    // The open keypad blocks checking another field.
    expect(m12Check(s, 't1', T0 + 500, 'keyboard', log)).toBe('refused');
    // Confirm with nothing entered is refused as empty.
    expect(m12ConfirmCorrection(s, T0 + 600, 'pointer', log)).toBe('empty');
    // Entry is bounded by the field's digits; Back removes one.
    for (const digit of '26091') {
      m12KeypadDigit(s, digit, 'keyboard', log);
    }

    expect(faulty.entry).toBe('2609');
    expect(m12KeypadBack(s, 'keyboard', log)).toBe(true);
    expect(faulty.entry).toBe('260');
    // Cancel: no correction, the "differs" judgement stands.
    expect(m12AbandonCorrection(s, 'pointer', log)).toBe(true);
    expect(faulty).toMatchObject({
      keypad_open: false,
      correction: null,
      corrections_abandoned: 1,
      judgement: 'differs',
    });
    // Reopen and enter a WRONG value: an attempted, unsuccessful correction.
    expect(m12ReopenKeypad(s, 't3', 'pointer', log)).toBe(true);
    for (const digit of '2600') {
      m12KeypadDigit(s, digit, 'pointer', log);
    }

    expect(m12ConfirmCorrection(s, T0 + 2_000, 'pointer', log)).toBe('entered');
    expect(faulty.correction).toMatchObject({
      entered: '2600',
      correct: false,
    });
    expect(faulty.keypad_open).toBe(false);
    // One correction per field: the keypad does not reopen once corrected.
    expect(m12ReopenKeypad(s, 't3', 'pointer', log)).toBe(false);

    // A non-faulty field judged "differs" and "corrected" to its own printed value.
    expect(m12Check(s, 't1', T0 + 3_000, 'pointer', log)).toBe('checked');
    expect(
      m12Judge(s, 't1', 'differs', T0 + 3_000 + AFTER, 'pointer', log),
    ).toBe('judged');
    for (const digit of '2041') {
      m12KeypadDigit(s, digit, 'pointer', log);
    }

    expect(m12ConfirmCorrection(s, T0 + 4_000, 'pointer', log)).toBe('entered');
    expect(m12Release(s, T0 + 5_000, 'pointer', log)).toBe(true);

    const raw = m12RawComponents(s, 'completed');

    expect(raw).toMatchObject({
      fields_judged: 2,
      judgements_correct: 1,
      judgement_accuracy: 0.5,
      fault_detected: true,
      correction_attempted: true,
      correction_successful: false,
      unnecessary_corrections: 1,
      released: true,
    });
    expect(
      h.events.filter((e) => e.event_type.endsWith('correction_entered')),
    ).toHaveLength(2);
    expect(
      h.events.find((e) => e.event_type.endsWith('correction_abandoned')),
    ).toBeDefined();
  });

  test('release closes the packet as it stands (an unchecked release is an observed 0/3; an open keypad is abandoned); nothing acts after release or a freeze; the reload guard reads only an opened packet of an earlier load', () => {
    const h = harness();
    const s = createM12State('o1', 'form_b');
    const log = h.sink('o1');

    expect(m12Release(s, T0, 'keyboard', log)).toBe(true);
    expect(m12Open(s)).toBe(false);
    expect(m12RawComponents(s, 'completed')).toMatchObject({
      fields_checked: 0,
      fields_judged: 0,
      judgement_accuracy: null,
      fault_detected: false,
      correction_attempted: false,
      correction_successful: null,
      released: true,
    });
    expect(m12Check(s, 'fuse', T0 + 1, 'pointer', log)).toBe('invalid');
    expect(m12Release(s, T0 + 1, 'pointer', log)).toBe(false);

    // Release with the keypad open abandons the entry (no correction).
    const s2 = createM12State('o1', 'form_b'); // fault at "vial": printed 16, ref 10
    const log2 = h.sink('o1');

    m12Check(s2, 'vial', T0, 'pointer', log2);
    m12Judge(s2, 'vial', 'differs', T0 + AFTER, 'pointer', log2);
    m12KeypadDigit(s2, '1', 'pointer', log2);
    expect(m12Release(s2, T0 + 1_000, 'pointer', log2)).toBe(true);
    expect(m12FaultyField(s2)).toMatchObject({
      keypad_open: false,
      correction: null,
      corrections_abandoned: 1,
    });
    expect(
      h.events.filter((e) => e.event_type.endsWith('released'))[1].metadata,
    ).toMatchObject({ keypad_abandoned_at_release: true, fields_judged: 1 });

    // A freeze (the review) closes the keypad and refuses every command.
    const s3 = createM12State('o2', 'form_a');
    const log3 = h.sink('o2');

    m12Check(s3, 't2', T0, 'pointer', log3);
    m12Judge(s3, 't2', 'differs', T0 + AFTER, 'pointer', log3);
    m12Freeze(s3, 'closed_at_review');
    expect(s3.closureReason).toBe('closed_at_review');
    expect(m12KeypadField(s3)).toBeNull();
    // The freeze counts the open keypad as an abandoned correction.
    expect(m12FaultyField(s3).corrections_abandoned).toBe(1);
    expect(m12KeypadDigit(s3, '2', 'pointer', log3)).toBe(false);
    expect(m12Release(s3, T0 + 2_000, 'pointer', log3)).toBe(false);
    expect(m12RawComponents(s3, 'closed_at_review')).toMatchObject({
      released: false,
      fields_judged: 1,
      fault_detected: true,
      correction_attempted: false,
    });

    // Reload guard: an opened packet of an earlier load, per occasion.
    const prior = [
      { event_type: `${M12_FAMILY}presented`, metadata: { occasion: 'o1' } },
      {
        event_type: `${M12_FAMILY}opportunity_opened`,
        metadata: { occasion: 'o2' },
      },
    ];

    expect(m12PriorAdministration(prior, 'o1')).toBe(false);
    expect(m12PriorAdministration(prior, 'o2')).toBe(true);
    expect(m12PriorAdministration([], 'o2')).toBe(false);
  });

  test('extractor: two released packets sum the judged fields over six; one released product is an `incomplete` 3-field observation; an unchecked release is an observed 0; a review-closed open packet is never a zero; declined ≠ absent ≠ interrupted ≠ pending; a recount disagreement fails both rows', () => {
    // 6/6 with the fault detected and corrected in both products.
    {
      const h = harness();
      const a = createM12State('o1', 'form_a');
      const b = createM12State('o2', 'form_a');

      h.presented('o1');
      h.opened('o1');
      m12Release(a, checkAll(a, T0, h.sink('o1')), 'pointer', h.sink('o1'));
      h.close(a);
      h.presented('o2');
      h.opened('o2');
      m12Release(
        b,
        checkAll(b, T0 + 60_000, h.sink('o2')),
        'pointer',
        h.sink('o2'),
      );
      h.close(b);

      const rows = extractItemFeatures('M12', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        feature_id: 'm12_fields_verified',
        value: 6,
        numerator: 6,
        denominator: 6,
        disposition: 'observed',
        closure_reason: 'completed',
        censored: false,
      });
      expect(rows[0].included_ids).toEqual(['m12_check_o1', 'm12_check_o2']);
      expect(rows[0].components).toMatchObject({
        occasions_released: ['o1', 'o2'],
        judged_by_occasion: { o1: 3, o2: 3 },
        fault_detected_by_occasion: { o1: true, o2: true },
        recount_agrees: true,
      });
      expect(rows[1].feature_id).toBe('m12_detection_and_correction');
      expect(rows[1].value).toMatchObject({
        o1: {
          fields_judged: 3,
          judgement_accuracy: 1,
          fault_detected: true,
          correction_attempted: true,
          correction_successful: true,
        },
        o2: { fault_detected: true, correction_successful: true },
      });
      expect(JSON.stringify(rows)).not.toMatch(/score|careless|careful/i);
    }

    // One product released unchecked (observed 0/3), the other never presented: incomplete.
    {
      const h = harness();
      const a = createM12State('o1', 'form_b');

      h.presented('o1');
      h.opened('o1');
      m12Release(a, T0, 'keyboard', h.sink('o1'));
      h.close(a);

      const rows = extractItemFeatures('M12', h.events, OPEN_CONTEXT);

      expect(rows[0]).toMatchObject({
        value: 0,
        numerator: 0,
        denominator: 3,
        disposition: 'incomplete',
        censored: false,
      });
      expect(rows[0].included_ids).toEqual(['m12_check_o1']);
      expect(rows[1].value).toMatchObject({
        o1: { fields_judged: 0, fault_detected: false, released: true },
        o2: null,
      });
    }

    // Opened, one field judged, closed at the review without a release:
    // no observation of checking (never a zero), with the exposure kept.
    {
      const h = harness();
      const a = createM12State('o1', 'form_a');
      const log = h.sink('o1');

      h.presented('o1');
      h.opened('o1');
      m12Check(a, 'fuse', T0, 'pointer', log);
      m12Judge(a, 'fuse', 'matches', T0 + AFTER, 'pointer', log);
      m12Freeze(a, 'closed_at_review');
      h.close(a, 'closed_at_review');
      h.presented('o2');

      const rows = extractItemFeatures('M12', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: null,
        disposition: 'no_eligible_event',
        closure_reason: 'closed_at_review',
      });
      expect(rows[0].components).toMatchObject({
        occasions_released: [],
        occasions_open_unreleased: ['o1'],
        occasions_declined: ['o2'],
      });
      // The companion is null with the primary (register rule).
      expect(rows[1]).toMatchObject({
        value: null,
        disposition: 'no_eligible_event',
      });
    }

    // One released (3/3) and one open at the review: incomplete AND censored.
    {
      const h = harness();
      const a = createM12State('o1', 'form_a');
      const b = createM12State('o2', 'form_a');

      h.presented('o1');
      h.opened('o1');
      m12Release(a, checkAll(a, T0, h.sink('o1')), 'pointer', h.sink('o1'));
      h.close(a);
      h.presented('o2');
      h.opened('o2');
      m12Freeze(b, 'closed_at_review');
      h.close(b, 'closed_at_review');

      const rows = extractItemFeatures('M12', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: 3,
        numerator: 3,
        denominator: 3,
        disposition: 'incomplete',
        censored: true,
        closure_reason: 'closed_at_review',
      });
    }

    // Presented and never opened: declined. Never presented: absent
    // (not_presented; interrupted after a reload).
    {
      const h = harness();

      h.presented('o1');
      h.presented('o2');
      expect(extractItemFeatures('M12', h.events, CONTEXT)[0]).toMatchObject({
        value: null,
        disposition: 'declined',
      });
      expect(extractItemFeatures('M12', [], CONTEXT)[0]).toMatchObject({
        value: null,
        disposition: 'not_presented',
      });
      expect(
        extractItemFeatures('M12', [], { ...CONTEXT, reloaded: true })[0],
      ).toMatchObject({ disposition: 'interrupted' });
    }

    // Held back after a reload (no re-run): interrupted, never a zero.
    {
      const h = harness();

      h.presented('o1');
      h.heldBack('o1');
      expect(
        extractItemFeatures('M12', h.events, { ...CONTEXT, reloaded: true })[0],
      ).toMatchObject({ value: null, disposition: 'interrupted' });
    }

    // Opened and still open (no closure yet): pending.
    {
      const h = harness();

      h.presented('o1');
      h.opened('o1');
      expect(
        extractItemFeatures('M12', h.events, OPEN_CONTEXT)[0],
      ).toMatchObject({
        value: null,
        disposition: 'pending',
      });
    }

    // A window record that disagrees with the field_judged events fails both rows.
    {
      const h = harness();
      const a = createM12State('o1', 'form_a');

      h.presented('o1');
      h.opened('o1');
      m12Release(a, checkAll(a, T0, h.sink('o1')), 'pointer', h.sink('o1'));
      // Drop one judged event from the raw stream.
      const index = h.events.findIndex((e) =>
        e.event_type.endsWith('field_judged'),
      );

      h.events.splice(index, 1);
      h.close(a);

      const rows = extractItemFeatures('M12', h.events, CONTEXT);

      expect(rows[0].disposition).toBe('technical_failure');
      expect(rows[1].disposition).toBe('technical_failure');
      expect(rows[0].components).toMatchObject({ recount_agrees: false });
    }
  });
});
