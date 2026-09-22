/**
 * Station 080 M01–M26 — protocol foundation (Unit 1), pure tests.
 *
 * Playwright test blocks that never touch `page`: the versioned register
 * v3 (26 items, six groups, source identity without wording, feature
 * contracts), the schedule derived from it (equal to the frozen v2 ledger
 * route for every item still on its v2 route), the focused clock (hidden
 * time excluded, stillness counted, cap = censoring), the feature
 * extractor framework (all 26 items and every feature key present on an
 * empty log, null with a disposition — never a zero), and the export
 * block plumbing.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  absentFeature,
  emptyFeature,
  extractItemFeatures,
  extractMeasurementFeatures,
  fractionFeature,
  observedFeature,
  registerFeatureExtractor,
  resetFeatureExtractors,
} from '../src/measurement/features';
import { FocusedClock } from '../src/measurement/focusedClock';
import {
  CLOSURE_REASONS,
  M22_DISCOURAGEMENT_OPTIONS,
  M25_NORMALITY_OPTIONS,
  MEASUREMENT_PROTOCOL_VERSION,
  PILOT_SETTINGS,
  protocolStamp,
} from '../src/measurement/protocol';
import {
  M26_ITEM_IDS,
  primaryFeatureIds,
  REGISTER_GROUPS,
  REGISTER_V3,
  registerEntry,
  registerFamilyPrefixes,
  registerOpportunityIds,
} from '../src/measurement/registerV3';
import { PILOT_SCHEDULE } from '../src/pilot/coverageSchedule';
import { EVIDENCE_LEDGER } from '../src/pilot/evidenceLedger';

const REPO = join(__dirname, '..');

test.describe('register v3 (pure)', () => {
  test('exactly M01–M26 once, in order, in six groups of 4/4/4/6/5/3', () => {
    expect(REGISTER_V3.map((entry) => entry.id)).toEqual([...M26_ITEM_IDS]);
    expect(M26_ITEM_IDS).toHaveLength(26);
    expect(REGISTER_GROUPS.map((group) => group.items.length)).toEqual([
      4, 4, 4, 6, 5, 3,
    ]);
    expect(REGISTER_GROUPS.flatMap((group) => group.items)).toEqual([
      ...M26_ITEM_IDS,
    ]);

    for (const group of REGISTER_GROUPS) {
      for (const item of group.items) {
        expect(registerEntry(item).group).toBe(group.group);
      }
    }
  });

  test('source identity is instrument + item number; questionnaire reverse keys match the crosswalk; no wording', () => {
    const reverse = REGISTER_V3.filter(
      (entry) => entry.source.reverse_keyed,
    ).map((entry) => entry.id);

    expect(reverse).toEqual(['M02', 'M04', 'M05', 'M08', 'M11', 'M12']);
    expect(
      REGISTER_V3.filter((e) => e.source.instrument === 'BFI-2'),
    ).toHaveLength(12);
    expect(
      REGISTER_V3.filter((e) => e.source.instrument === 'BESSI'),
    ).toHaveLength(6);
    expect(
      REGISTER_V3.filter((e) => e.source.instrument === 'MPS'),
    ).toHaveLength(8);

    // The exact source wording never enters the game bundle: the register
    // module contains no ledger wording (comments stripped).
    const ledger = JSON.parse(
      readFileSync(
        join(
          REPO,
          'docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.json',
        ),
        'utf8',
      ),
    ) as { items: { exact_source_item: string }[] };
    const source = readFileSync(
      join(REPO, 'src/measurement/registerV3.ts'),
      'utf8',
    )
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
      .toLowerCase();

    for (const item of ledger.items) {
      expect(source.includes(item.exact_source_item.toLowerCase())).toBe(false);
    }
  });

  test('every item has exactly one primary feature; feature ids unique; fractions carry a denominator rule', () => {
    const primaries = primaryFeatureIds();

    expect(primaries).toHaveLength(26);
    expect(new Set(primaries).size).toBe(26);

    const all = REGISTER_V3.flatMap((entry) => entry.features);

    expect(new Set(all.map((f) => f.feature_id)).size).toBe(all.length);

    for (const entry of REGISTER_V3) {
      expect(entry.features.filter((f) => f.role === 'primary')).toHaveLength(
        1,
      );

      for (const feature of entry.features) {
        expect(feature.feature_id.startsWith(entry.id.toLowerCase())).toBe(
          true,
        );
        expect(feature.missing_rule.length).toBeGreaterThan(0);

        if (feature.kind === 'fraction') {
          expect(feature.denominator).not.toBeNull();
        }
      }
    }

    // Coverage labels the specification requires.
    expect(registerEntry('M08').coverage_label).toBe('exploratory');
    expect(registerEntry('M11').coverage_label).toBe('exploratory');
    expect(registerEntry('M21').coverage_label).toBe('partial');
    expect(registerEntry('M22').coverage_label).toBe('hybrid');
    expect(registerEntry('M25').coverage_label).toBe('hybrid');
    // Sensitivity counts are declared beside the M24 / M26 primaries.
    expect(registerEntry('M24').features.map((f) => f.role)).toEqual([
      'primary',
      'sensitivity',
      'companion',
    ]);
    expect(registerEntry('M26').features.map((f) => f.role)).toEqual([
      'primary',
      'sensitivity',
      'companion',
    ]);
  });

  test('an item on its v2-ledger route reproduces the frozen ledger route exactly', () => {
    const onV2 = REGISTER_V3.filter(
      (entry) => entry.route.route_version === 'v2-ledger',
    );
    const onV3 = REGISTER_V3.length - onV2.length;

    // Never vacuous: every item is on exactly one of the two route
    // versions, and the split is stated so a migration is visible here.
    expect(onV2.length + onV3).toBe(26);

    for (const entry of onV2) {
      const ledger = EVIDENCE_LEDGER.find((l) => l.id === entry.id)!;

      expect(entry.route.opportunity_ids).toEqual(ledger.route.opportunity_ids);
      expect(entry.route.family_prefixes).toEqual(ledger.route.family_prefixes);
      expect(entry.route.windows.map((w) => w.id)).toEqual(
        ledger.route.windows.map((w) => w.id),
      );
      expect(entry.route.secondary_ids).toEqual(
        ledger.route.secondary_telemetry_ids,
      );
    }
  });

  test('opportunity ids unique; family prefixes pairwise disjoint; schedule mirrors the register', () => {
    const ids = registerOpportunityIds();

    expect(new Set(ids).size).toBe(ids.length);

    const prefixes = registerFamilyPrefixes();

    for (const a of prefixes) {
      for (const b of prefixes) {
        if (a !== b) {
          expect(a.startsWith(b)).toBe(false);
        }
      }
    }

    expect(PILOT_SCHEDULE.map((entry) => entry.item)).toEqual([
      ...M26_ITEM_IDS,
    ]);

    for (const scheduled of PILOT_SCHEDULE) {
      const entry = registerEntry(scheduled.item);

      expect(scheduled.opportunityIds).toEqual(entry.route.opportunity_ids);
      expect(scheduled.familyPrefixes).toEqual(entry.route.family_prefixes);
      expect(scheduled.disposition).toBe(entry.disposition);
      expect(scheduled.reviewNaming).toBe(entry.review_naming);
      expect(scheduled.operationalLabel).toBe(entry.operational_label);
      expect(scheduled.zone).toBe(entry.route.windows[0]?.zone ?? null);
    }
  });

  test('evidential status follows the frozen ledger unless an explicit, cited override exists (M08 / M11 / M25 only)', () => {
    for (const entry of REGISTER_V3) {
      const ledger = EVIDENCE_LEDGER.find((l) => l.id === entry.id)!;
      const ledgerClass =
        ledger.disposition_class === 'questionnaire_primary'
          ? 'QUESTIONNAIRE-PRIMARY'
          : 'PRIMARY-CANDIDATE';

      if (entry.disposition_override === null) {
        expect(entry.disposition, entry.id).toBe(ledgerClass);
      } else {
        expect(['M08', 'M11', 'M25'], entry.id).toContain(entry.id);
        expect(entry.disposition_override.approved_by.length).toBeGreaterThan(
          0,
        );
        expect(entry.route.route_version, entry.id).toBe('v3');
      }
    }
  });

  test('every item declares its clustering (independence) and the planned denominator of each fraction', () => {
    for (const entry of REGISTER_V3) {
      expect(entry.independence.note.length, entry.id).toBeGreaterThan(0);

      for (const feature of entry.features) {
        if (feature.kind === 'fraction') {
          expect(
            feature.planned_denominator,
            feature.feature_id,
          ).not.toBeNull();
          expect(feature.planned_denominator!).toBeGreaterThan(0);
        } else {
          expect(feature.planned_denominator, feature.feature_id).toBeNull();
        }
      }
    }

    expect(registerEntry('M02').features[0].planned_denominator).toBe(6);
    expect(registerEntry('M19').features[0].planned_denominator).toBe(2);
    expect(registerEntry('M09').independence.kind).toBe(
      'repeated_within_one_project',
    );
    expect(registerEntry('M17').features.map((f) => f.feature_id)).toEqual([
      'm17_criterion_trial',
      'm17_sequence_baseline_transfer',
    ]);
  });
});

test.describe('protocol constants (pure)', () => {
  test('versions, closure reasons, pilot settings and the two five-option items', () => {
    expect(MEASUREMENT_PROTOCOL_VERSION).toBe('station080-m26-pilot-v1');
    expect(Object.keys(protocolStamp())).toEqual([
      'measurement_protocol_version',
      'measurement_schema_version',
      'measurement_register_version',
    ]);
    expect(CLOSURE_REASONS).toContain('cap');
    expect(CLOSURE_REASONS).toContain('declined');
    expect(PILOT_SETTINGS.m05_start_cap_ms).toBe(60_000);
    expect(PILOT_SETTINGS.m06_work_budget_ms).toBe(60_000);
    expect(PILOT_SETTINGS.m08_epoch_ms).toBe(15_000);
    expect(PILOT_SETTINGS.m17_learning_trials).toBe(12);
    expect(PILOT_SETTINGS.m17_criterion_run).toBe(3);
    expect(PILOT_SETTINGS.m24_cap_ms).toBe(30_000);
    expect(
      M22_DISCOURAGEMENT_OPTIONS.map((o) => `${o.value} ${o.label}`),
    ).toEqual([
      '1 Not at all',
      '2 Slightly',
      '3 Moderately',
      '4 Very',
      '5 Extremely',
    ]);
    expect(M25_NORMALITY_OPTIONS.map((o) => `${o.value} ${o.label}`)).toEqual([
      '1 Not at all normal',
      '2 Slightly normal',
      '3 Moderately normal',
      '4 Very normal',
      '5 Completely normal',
    ]);
  });
});

test.describe('focused clock (pure)', () => {
  test('hidden and unfocused intervals are excluded by cause; stillness counts; cap is reached on focused time only', () => {
    const clock = new FocusedClock();

    clock.start(1_000);
    // 5 s of visible stillness counts as observation time.
    expect(clock.focusedMs(6_000)).toBe(5_000);
    // Tab hidden for 10 s: excluded, attributed to `hidden`.
    clock.pause('hidden', 6_000);
    expect(clock.isPaused()).toBe(true);
    expect(clock.focusedMs(16_000)).toBe(5_000);
    expect(clock.excludedMs(16_000).hidden).toBe(10_000);
    // Two overlapping causes: still one exclusion of focused time, both
    // causes carry the interval.
    clock.pause('focus_loss', 16_000);
    clock.resume('hidden', 20_000);
    expect(clock.isPaused()).toBe(true);
    expect(clock.focusedMs(20_000)).toBe(5_000);
    clock.resume('focus_loss', 21_000);
    expect(clock.isPaused()).toBe(false);
    expect(clock.excludedMs(21_000)).toMatchObject({
      hidden: 14_000,
      focus_loss: 5_000,
    });
    // Resumed focused time accumulates again.
    expect(clock.focusedMs(31_000)).toBe(15_000);
    expect(clock.wallMs(31_000)).toBe(30_000);
    // The cap is a focused-time cap.
    expect(clock.capReached(31_000, 30_000)).toBe(false);
    expect(clock.remainingMs(31_000, 30_000)).toBe(15_000);
    expect(clock.capReached(46_000, 30_000)).toBe(true);
    // Stop freezes every reading.
    clock.stop(46_000);
    expect(clock.isRunning()).toBe(false);
    expect(clock.focusedMs(90_000)).toBe(30_000);
    expect(clock.wallMs(90_000)).toBe(45_000);
  });

  test('double pause / double resume are inert; the cap never advances while paused; stop before start is a no-op', () => {
    const clock = new FocusedClock();

    clock.stop(0); // never started → nothing happens
    expect(clock.isRunning()).toBe(false);
    clock.start(0);
    clock.pause('explicit_pause', 2_000);
    clock.pause('explicit_pause', 3_000); // same cause twice
    expect(clock.activeCauses()).toEqual(['explicit_pause']);
    expect(clock.focusedMs(10_000)).toBe(2_000);
    expect(clock.capReached(40_000, 5_000)).toBe(false);
    expect(clock.remainingMs(40_000, 5_000)).toBe(3_000);
    clock.resume('explicit_pause', 12_000);
    clock.resume('explicit_pause', 12_500); // already inactive
    expect(clock.excludedMs(12_500).explicit_pause).toBe(10_000);
    expect(clock.focusedMs(15_000)).toBe(5_000);
    expect(clock.capReached(15_000, 5_000)).toBe(true);
    // Restart after stop resets every reading; a cause recorded while
    // stopped (the tab went hidden meanwhile) is carried into the restart.
    clock.stop(15_000);
    clock.pause('hidden', 16_000);
    clock.start(20_000);
    expect(clock.isPaused()).toBe(true);
    expect(clock.focusedMs(21_000)).toBe(0);
    clock.resume('hidden', 21_000);
    expect(clock.focusedMs(22_000)).toBe(1_000);
    expect(clock.excludedMs(22_000).explicit_pause).toBe(0);
  });

  test('a cause recorded before start is kept: a clock paused while hidden never starts unpaused', () => {
    const clock = new FocusedClock();

    clock.pause('hidden', 0); // the focus monitor pauses a registered clock
    clock.start(1_000); // …and the window opens later, still hidden
    expect(clock.isPaused()).toBe(true);
    expect(clock.focusedMs(9_000)).toBe(0);
    clock.resume('hidden', 9_000);
    expect(clock.focusedMs(12_000)).toBe(3_000);
    expect(clock.snapshot(12_000).excluded_total_ms).toBe(8_000);
    expect(clock.snapshot(12_000).wall_ms).toBe(11_000);
  });

  test('a clock started while the page is hidden begins paused; unknown resumes are inert', () => {
    const clock = new FocusedClock();

    clock.start(0, ['hidden']);
    expect(clock.isPaused()).toBe(true);
    expect(clock.focusedMs(5_000)).toBe(0);
    clock.resume('focus_loss', 5_000); // never active → no change
    expect(clock.isPaused()).toBe(true);
    clock.resume('hidden', 5_000);
    expect(clock.focusedMs(8_000)).toBe(3_000);
    expect(clock.snapshot(8_000)).toMatchObject({
      running: true,
      paused: false,
      active_causes: [],
      focused_ms: 3_000,
      wall_ms: 8_000,
    });
  });
});

test.describe('feature extractor framework (pure)', () => {
  test.afterEach(() => {
    resetFeatureExtractors();
  });

  test('an empty log yields all 26 items and every feature key, null with a disposition — never a zero', () => {
    const rows = extractMeasurementFeatures([], {
      finalCoreClosed: true,
      pageLoadIndex: 1,
      reloaded: false,
    });
    const expected = REGISTER_V3.flatMap((entry) =>
      entry.features.map((feature) => `${entry.id}:${feature.feature_id}`),
    );

    expect(rows.map((row) => `${row.item_id}:${row.feature_id}`)).toEqual(
      expected,
    );
    expect(new Set(rows.map((row) => row.item_id)).size).toBe(26);

    for (const row of rows) {
      expect(row.value).toBeNull();
      // Items with a landed extractor report the empty log as not presented.
      expect(['not_implemented', 'not_presented']).toContain(row.disposition);
      expect(row.protocol_version).toBe(MEASUREMENT_PROTOCOL_VERSION);
      expect(row.missing_reason).not.toBeNull();
      expect(row.closure_reason).toBeNull();
    }

    expect(
      rows.find((row) => row.feature_id === 'm02_correct_first_retrievals')!
        .planned_denominator,
    ).toBe(6);
  });

  test('a registered extractor replaces the placeholder rows; a zero denominator is null, an observed zero stays zero', () => {
    const m19 = registerEntry('M19');
    const spec = m19.features[0];

    registerFeatureExtractor('M19', () => [
      fractionFeature('M19', spec, 0, 0, [], [], {
        disposition: 'no_eligible_event',
        reason: 'no difficulty encountered',
      }),
    ]);

    const noDifficulty = extractItemFeatures('M19', [], {
      finalCoreClosed: true,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(noDifficulty).toHaveLength(1);
    expect(noDifficulty[0]).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
      numerator: null,
      denominator: 0,
      missing_reason: 'no difficulty encountered',
    });

    registerFeatureExtractor('M19', () => [
      fractionFeature('M19', spec, 0, 2, ['a', 'b'], [3, 9], {
        disposition: 'no_eligible_event',
        reason: 'unused',
      }),
    ]);

    const observedZero = extractItemFeatures('M19', [], {
      finalCoreClosed: true,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(observedZero[0]).toMatchObject({
      value: 0,
      disposition: 'observed',
      numerator: 0,
      denominator: 2,
      included_ids: ['a', 'b'],
      supporting_sequences: [3, 9],
    });
  });

  test('a zero denominator keeps the caller\'s reason (declined is never "no eligible event"); a partial denominator is incomplete with its value; a reload is interrupted', () => {
    const m09 = registerEntry('M09');
    const spec = m09.features[0];
    const context = {
      finalCoreClosed: true,
      pageLoadIndex: 1,
      reloaded: false,
    };

    const declined = fractionFeature('M09', spec, 0, 0, [], [], {
      disposition: 'declined',
      reason: 'watch duty declined',
    });

    expect(declined).toMatchObject({
      value: null,
      disposition: 'declined',
      denominator: 0,
      planned_denominator: 3,
      missing_reason: 'watch duty declined',
    });

    // Two of the three planned checks were eligible: the value is exported
    // with its denominator, but never as a complete component score.
    const partial = fractionFeature('M09', spec, 2, 2, ['c1', 'c2'], [5, 8], {
      disposition: 'no_eligible_event',
      reason: 'unused',
    });

    expect(partial).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 2,
      planned_denominator: 3,
      disposition: 'incomplete',
    });

    const full = fractionFeature('M09', spec, 1, 3, ['c1', 'c2', 'c3'], [], {
      disposition: 'no_eligible_event',
      reason: 'unused',
    });

    expect(full.disposition).toBe('observed');

    // A conditional-eligibility denominator (one difficulty encounter of
    // two possible challenges) is a COMPLETE observation, never partial.
    const m19 = registerEntry('M19').features[0];

    expect(m19.denominator_kind).toBe('conditional_eligibility');
    expect(
      fractionFeature('M19', m19, 1, 1, ['coupling'], [], {
        disposition: 'no_eligible_event',
        reason: 'unused',
      }),
    ).toMatchObject({ value: 1, denominator: 1, disposition: 'observed' });
    expect(registerEntry('M09').features[0].denominator_kind).toBe(
      'planned_observations',
    );
    expect(
      ['M10', 'M11', 'M19', 'M20', 'M21', 'M23'].map(
        (id) => registerEntry(id as 'M10').features[0].denominator_kind,
      ),
    ).toEqual(Array(6).fill('conditional_eligibility'));

    expect(absentFeature('M09', spec, context, 'never offered')).toMatchObject({
      disposition: 'not_presented',
      value: null,
    });
    expect(
      absentFeature(
        'M09',
        spec,
        { ...context, reloaded: true },
        'never offered',
      ),
    ).toMatchObject({ disposition: 'interrupted', value: null });

    // Supporting sequences are bounded and the cut is flagged.
    const many = Array.from({ length: 500 }, (_, i) => i + 1);
    const bounded = observedFeature('M09', spec, 1, {
      supporting_sequences: many,
    });

    expect(bounded.supporting_sequences).toHaveLength(200);
    expect(bounded.supporting_sequences_truncated).toBe(true);
  });

  test('an extractor that omits a feature or throws never loses the row', () => {
    const m24 = registerEntry('M24');

    registerFeatureExtractor('M24', () => [
      observedFeature('M24', m24.features[0], 2),
    ]);

    const partial = extractItemFeatures('M24', [], {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(partial.map((row) => [row.feature_id, row.disposition])).toEqual([
      ['m24_postknowledge_casts', 'observed'],
      ['m24_postknowledge_casts_minus_first', 'not_implemented'],
      ['m24_unqualified_casts', 'not_implemented'],
    ]);

    // An extra row whose feature id is not in the register is dropped —
    // the export carries exactly the register's feature keys.
    registerFeatureExtractor('M24', () => [
      observedFeature('M24', m24.features[0], 1),
      observedFeature(
        'M24',
        { ...m24.features[0], feature_id: 'm24_invented_extra' },
        7,
      ),
    ]);
    expect(
      extractItemFeatures('M24', [], {
        finalCoreClosed: false,
        pageLoadIndex: 1,
        reloaded: false,
      }).map((row) => row.feature_id),
    ).toEqual([
      'm24_postknowledge_casts',
      'm24_postknowledge_casts_minus_first',
      'm24_unqualified_casts',
    ]);

    registerFeatureExtractor('M24', () => {
      throw new Error('boom');
    });

    const failed = extractItemFeatures('M24', [], {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(failed).toHaveLength(3);

    for (const row of failed) {
      expect(row.disposition).toBe('technical_failure');
      expect(row.value).toBeNull();
      expect(row.missing_reason).toContain('boom');
    }

    // `emptyFeature` never carries a number.
    expect(
      emptyFeature('M24', m24.features[0], 'declined', 'declined').value,
    ).toBeNull();
  });
});
