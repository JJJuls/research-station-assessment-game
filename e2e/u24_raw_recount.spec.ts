/**
 * U24 Part C — the comparison harness for the independent raw-event recount
 * (RC-1 = a, RC-2 = a, RC-3 = b; plan §R, the completion brief §6.4–§6.7).
 *
 * The recount module `./u24RawRecount` was authored BLIND by a fresh-context
 * Opus 5.5 analyst from the approved rule documents only, outside the
 * repository, and copied here byte for byte (provenance in the completion
 * run's `C\PROVENANCE.md`). This spec is the integration lead's: it feeds the
 * module the stripped inputs of the final re-pinned exports, compares its
 * records with production's `measurement_features` (IR-4), with the L2
 * expectation (IR-5), checks the reload and missingness readings of S3 (IR-6)
 * and, under RC-2 = a, runs the stated mutation cases against the recount AND
 * the production extractor (IR-7; the only place production code runs here).
 * IR-1 checks the module's independence statically; IR-2 the inputs; IR-3 the
 * transcription's coverage. IR-8 (static and scope) is run outside this file.
 *
 * Inputs come ONLY from `U24_RECOUNT_EXPORTS_DIR` (the durable final-exports
 * checkpoint). In a U24 run (`U24_EVIDENCE_DIR` set) an unset variable FAILS;
 * in another unit's regression run (neither set) the suite skips with an
 * annotation. Outputs go to `U24_EVIDENCE_DIR/C/reproduction/`.
 *
 * Plan §R.1 rule 6: a recount that disagrees with production is a FAIL until
 * diagnosed; the recount is never edited to agree. Mismatches are written to
 * the `-R.json` records before the assertion fails, so the dossier exists.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { extractMeasurementFeatures } from '../src/measurement/features';
import {
  recount,
  RECOUNT_GAPS,
  RECOUNT_SPEC,
  type RecountEvent,
  type RecountInput,
  type RecountRecord,
} from './u24RawRecount';

/* ------------------------------------------------------------------ *
 * Inputs: the final re-pinned exports and their SHA-256 pins
 * ------------------------------------------------------------------ */

const EXPORTS_DIR = process.env.U24_RECOUNT_EXPORTS_DIR ?? null;
const U24_RUN = process.env.U24_EVIDENCE_DIR !== undefined;
const OUT = process.env.U24_EVIDENCE_DIR
  ? join(process.env.U24_EVIDENCE_DIR, 'C')
  : 'test-results/u24-c';

/**
 * The re-pinned final exports (S5 step 3, `EXPORTS-SHA256SUMS.txt` of the
 * completion run). A `null` pin means the export has not been re-pinned yet:
 * IR-2 fails on it.
 */
const EXPORT_PINS: Record<string, string | null> = {
  'S1-800x600.json':
    '63382c531eb4df055bccdf855067fcfa44d1b1e0cf26f4e66056a1a461b38e79',
  'S1-1280x720.json':
    'c33472ac8898c3618f0a9d6c2511aa8f35aa11c6eb424c8f6336c34c7c671455',
  'S2.json': '9c97ce94fadb6e2ad872f88014816634f5220a3211e5cab52c898be84c27ef78',
  'S3.json': '917e945f299f08965909e3180b481f842d90aabe43520022794f68c6c0269d5f',
};
const EXPORT_NAMES = Object.keys(EXPORT_PINS);

interface ProductionFeature {
  item_id?: string;
  feature_id: string;
  role: string;
  value: unknown;
  numerator: number | null;
  denominator: number | null;
  disposition: string;
  missing_reason?: string | null;
}

interface Envelope {
  game_session_id: string;
  page_load_index: number;
  payload: {
    raw_events: RecountEvent[];
    prior_page_load_events: RecountEvent[];
    raw_events_omitted?: boolean;
    measurement_features: ProductionFeature[];
  };
}

function sha256(text: string | Buffer): string {
  return createHash('sha256').update(text).digest('hex');
}

function readEnvelope(name: string): { text: string; envelope: Envelope } {
  const text = readFileSync(join(EXPORTS_DIR!, name), 'utf8');

  return { text, envelope: JSON.parse(text) as Envelope };
}

/** Plan §R.1 rule 2: the recount receives these four fields and nothing else. */
function stripped(envelope: Envelope): RecountInput {
  return {
    raw_events: envelope.payload.raw_events,
    prior_page_load_events: envelope.payload.prior_page_load_events,
    page_load_index: envelope.page_load_index,
    game_session_id: envelope.game_session_id,
  };
}

function write(rel: string, text: string) {
  const file = join(OUT, rel);

  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, text);
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : v,
  );
}

/* ------------------------------------------------------------------ *
 * Literals (generated from the evidence files; never typed by hand)
 * ------------------------------------------------------------------ */

interface L2Literal {
  feature_id: string;
  value: number | null | 'present' | Record<string, unknown>;
  numerator: number | null | 'any';
  denominator: number | null | 'any';
  disposition: string | readonly string[];
}

/** The RC3B inventory (RC3B-FEATURE-IDS.json at 287dcc66645fc439fc55179b07aede5eaeaf5f96): item, feature_id, role. */
const INVENTORY = [
  { item: 'M01', feature_id: 'm01_planned_jobs', role: 'primary' },
  { item: 'M01', feature_id: 'm01_plan_structure', role: 'companion' },
  { item: 'M02', feature_id: 'm02_correct_first_retrievals', role: 'primary' },
  { item: 'M02', feature_id: 'm02_retrieval_latency', role: 'companion' },
  { item: 'M02', feature_id: 'm02_filing_layout', role: 'companion' },
  { item: 'M03', feature_id: 'm03_tools_restored', role: 'primary' },
  { item: 'M03', feature_id: 'm03_object_states', role: 'companion' },
  { item: 'M04', feature_id: 'm04_undisposed_pieces', role: 'primary' },
  { item: 'M04', feature_id: 'm04_job_values', role: 'companion' },
  { item: 'M05', feature_id: 'm05_start_latency', role: 'primary' },
  { item: 'M05', feature_id: 'm05_acceptance_exposure', role: 'companion' },
  { item: 'M06', feature_id: 'm06_unique_correct_orders', role: 'primary' },
  { item: 'M06', feature_id: 'm06_work_period_detail', role: 'companion' },
  { item: 'M07', feature_id: 'm07_stages_completed', role: 'primary' },
  { item: 'M07', feature_id: 'm07_returns', role: 'companion' },
  { item: 'M08', feature_id: 'm08_work_choice_fraction', role: 'primary' },
  { item: 'M08', feature_id: 'm08_work_choice_by_benefit', role: 'companion' },
  { item: 'M09', feature_id: 'm09_due_checks_fulfilled', role: 'primary' },
  { item: 'M10', feature_id: 'm10_obligations_fulfilled', role: 'primary' },
  { item: 'M11', feature_id: 'm11_unresolved_custodies', role: 'primary' },
  { item: 'M11', feature_id: 'm11_custody_records', role: 'companion' },
  { item: 'M12', feature_id: 'm12_fields_verified', role: 'primary' },
  {
    item: 'M12',
    feature_id: 'm12_detection_and_correction',
    role: 'companion',
  },
  { item: 'M13', feature_id: 'm13_first_solutions', role: 'primary' },
  {
    item: 'M14',
    feature_id: 'm14_correct_first_integrations',
    role: 'primary',
  },
  { item: 'M15', feature_id: 'm15_correct_first_predictions', role: 'primary' },
  {
    item: 'M16',
    feature_id: 'm16_correct_first_applications',
    role: 'primary',
  },
  { item: 'M17', feature_id: 'm17_criterion_trial', role: 'primary' },
  {
    item: 'M17',
    feature_id: 'm17_sequence_baseline_transfer',
    role: 'companion',
  },
  { item: 'M18', feature_id: 'm18_correct_first_diagnoses', role: 'primary' },
  {
    item: 'M18',
    feature_id: 'm18_correct_consequence_predictions',
    role: 'companion',
  },
  { item: 'M19', feature_id: 'm19_continuations', role: 'primary' },
  { item: 'M20', feature_id: 'm20_cued_resumptions', role: 'primary' },
  { item: 'M21', feature_id: 'm21_restudy_revisions', role: 'primary' },
  { item: 'M22', feature_id: 'm22_revisions_begun', role: 'primary' },
  { item: 'M22', feature_id: 'm22_discouragement_ratings', role: 'companion' },
  {
    item: 'M23',
    feature_id: 'm23_continuations_after_failure',
    role: 'primary',
  },
  { item: 'M24', feature_id: 'm24_postknowledge_casts', role: 'primary' },
  {
    item: 'M24',
    feature_id: 'm24_postknowledge_casts_minus_first',
    role: 'sensitivity',
  },
  { item: 'M24', feature_id: 'm24_unqualified_casts', role: 'companion' },
  { item: 'M25', feature_id: 'm25_optional_repeats', role: 'primary' },
  { item: 'M25', feature_id: 'm25_normality_belief', role: 'companion' },
  { item: 'M26', feature_id: 'm26_postknowledge_retries', role: 'primary' },
  {
    item: 'M26',
    feature_id: 'm26_postknowledge_retries_minus_first',
    role: 'sensitivity',
  },
  { item: 'M26', feature_id: 'm26_unqualified_retries', role: 'companion' },
] as const;

/**
 * L2 expectation literals copied from the completion run's B/reproduction/S1-800x600-L2.json
 * (the S1 / S2 recapture on 287dcc6; the hand-derived expectation of e2e/u24Helpers.ts).
 */
const S1_L2: readonly L2Literal[] = [
  {
    feature_id: 'm01_planned_jobs',
    value: 1,
    numerator: 1,
    denominator: 6,
    disposition: 'observed',
  },
  {
    feature_id: 'm02_correct_first_retrievals',
    value: 3,
    numerator: 3,
    denominator: 6,
    disposition: 'observed',
  },
  {
    feature_id: 'm03_tools_restored',
    value: 4,
    numerator: 4,
    denominator: 6,
    disposition: 'observed',
  },
  {
    feature_id: 'm04_undisposed_pieces',
    value: 4,
    numerator: 4,
    denominator: 6,
    disposition: 'observed',
  },
  {
    feature_id: 'm05_start_latency',
    value: 'present',
    numerator: 'any',
    denominator: 'any',
    disposition: 'observed',
  },
  {
    feature_id: 'm06_unique_correct_orders',
    value: 3,
    numerator: 3,
    denominator: null,
    disposition: 'observed',
  },
  {
    feature_id: 'm07_stages_completed',
    value: 5,
    numerator: 5,
    denominator: 6,
    disposition: 'observed',
  },
  {
    feature_id: 'm08_work_choice_fraction',
    value: 3,
    numerator: 3,
    denominator: 6,
    disposition: 'observed',
  },
  {
    feature_id: 'm09_due_checks_fulfilled',
    value: 3,
    numerator: 3,
    denominator: 3,
    disposition: 'observed',
  },
  {
    feature_id: 'm10_obligations_fulfilled',
    value: 2,
    numerator: 2,
    denominator: 2,
    disposition: 'observed',
  },
  {
    feature_id: 'm11_unresolved_custodies',
    value: 0,
    numerator: 0,
    denominator: 2,
    disposition: 'observed',
  },
  {
    feature_id: 'm12_fields_verified',
    value: 5,
    numerator: 5,
    denominator: 6,
    disposition: 'observed',
  },
  {
    feature_id: 'm13_first_solutions',
    value: 1,
    numerator: 1,
    denominator: 3,
    disposition: 'observed',
  },
  {
    feature_id: 'm14_correct_first_integrations',
    value: 3,
    numerator: 3,
    denominator: 6,
    disposition: 'observed',
  },
  {
    feature_id: 'm15_correct_first_predictions',
    value: 2,
    numerator: 2,
    denominator: 4,
    disposition: 'observed',
  },
  {
    feature_id: 'm16_correct_first_applications',
    value: 3,
    numerator: 3,
    denominator: 6,
    disposition: 'observed',
  },
  {
    feature_id: 'm17_criterion_trial',
    value: { criterion_trial: 4, attained: true },
    numerator: 'any',
    denominator: null,
    disposition: 'observed',
  },
  {
    feature_id: 'm18_correct_first_diagnoses',
    value: 1,
    numerator: 1,
    denominator: 3,
    disposition: 'observed',
  },
  {
    feature_id: 'm19_continuations',
    value: 1,
    numerator: 1,
    denominator: 2,
    disposition: 'observed',
  },
  {
    feature_id: 'm20_cued_resumptions',
    value: 1,
    numerator: 1,
    denominator: 2,
    disposition: 'observed',
  },
  {
    feature_id: 'm21_restudy_revisions',
    value: 1,
    numerator: 1,
    denominator: 1,
    disposition: 'observed',
  },
  {
    feature_id: 'm22_revisions_begun',
    value: 1,
    numerator: 1,
    denominator: 2,
    disposition: 'observed',
  },
  {
    feature_id: 'm23_continuations_after_failure',
    value: 1,
    numerator: 1,
    denominator: 1,
    disposition: 'observed',
  },
  {
    feature_id: 'm24_postknowledge_casts',
    value: 2,
    numerator: 'any',
    denominator: null,
    disposition: 'observed',
  },
  {
    feature_id: 'm25_optional_repeats',
    value: 2,
    numerator: 'any',
    denominator: null,
    disposition: 'observed',
  },
  {
    feature_id: 'm26_postknowledge_retries',
    value: 2,
    numerator: 'any',
    denominator: null,
    disposition: 'observed',
  },
];

/**
 * L2 expectation literals copied from the completion run's B/reproduction/S2-L2.json
 * (the S2 recapture on 287dcc6; the hand-derived expectation of e2e/u24Helpers.ts).
 */
const S2_L2: readonly L2Literal[] = [
  {
    feature_id: 'm01_planned_jobs',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm02_correct_first_retrievals',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: ['declined', 'no_eligible_event'],
  },
  {
    feature_id: 'm03_tools_restored',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm04_undisposed_pieces',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'not_presented',
  },
  {
    feature_id: 'm05_start_latency',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm06_unique_correct_orders',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm07_stages_completed',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'no_eligible_event',
  },
  {
    feature_id: 'm08_work_choice_fraction',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm09_due_checks_fulfilled',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm10_obligations_fulfilled',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm11_unresolved_custodies',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm12_fields_verified',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm13_first_solutions',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'not_presented',
  },
  {
    feature_id: 'm14_correct_first_integrations',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'no_eligible_event',
  },
  {
    feature_id: 'm15_correct_first_predictions',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'no_eligible_event',
  },
  {
    feature_id: 'm16_correct_first_applications',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'no_eligible_event',
  },
  {
    feature_id: 'm17_criterion_trial',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'not_presented',
  },
  {
    feature_id: 'm18_correct_first_diagnoses',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'no_eligible_event',
  },
  {
    feature_id: 'm19_continuations',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'no_eligible_event',
  },
  {
    feature_id: 'm20_cued_resumptions',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'no_eligible_event',
  },
  {
    feature_id: 'm21_restudy_revisions',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm22_revisions_begun',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm23_continuations_after_failure',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: ['no_eligible_event', 'not_presented'],
  },
  {
    feature_id: 'm24_postknowledge_casts',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: ['declined', 'no_eligible_event', 'not_presented'],
  },
  {
    feature_id: 'm25_optional_repeats',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: 'declined',
  },
  {
    feature_id: 'm26_postknowledge_retries',
    value: null,
    numerator: null,
    denominator: 'any',
    disposition: ['declined', 'no_eligible_event', 'not_presented'],
  },
];

/** The plan's L2 matcher, restated here so this spec imports no helper. */
function l2Mismatches(
  expected: L2Literal,
  row: Pick<
    RecountRecord,
    'value' | 'numerator' | 'denominator' | 'disposition'
  >,
): string[] {
  const mismatches: string[] = [];
  const scalar = typeof row.value === 'number' || row.value === null;

  if (expected.value === 'present') {
    if (row.value === null) mismatches.push('value null');
  } else if (expected.value !== null && typeof expected.value === 'object') {
    const actual = (row.value ?? {}) as Record<string, unknown>;

    for (const [key, wanted] of Object.entries(expected.value)) {
      if (actual[key] !== wanted) {
        mismatches.push(`value.${key} ${JSON.stringify(actual[key])}`);
      }
    }
  } else if (!scalar || row.value !== expected.value) {
    mismatches.push(`value ${JSON.stringify(row.value)}`);
  }

  if (expected.numerator !== 'any' && row.numerator !== expected.numerator) {
    mismatches.push(`numerator ${row.numerator}`);
  }

  if (
    expected.denominator !== 'any' &&
    row.denominator !== expected.denominator
  ) {
    mismatches.push(`denominator ${row.denominator}`);
  }

  const allowed =
    typeof expected.disposition === 'string'
      ? [expected.disposition]
      : expected.disposition;

  if (!allowed.includes(row.disposition)) {
    mismatches.push(`disposition ${row.disposition}`);
  }

  return mismatches;
}

/* ------------------------------------------------------------------ *
 * The gate: inputs configured?
 * ------------------------------------------------------------------ */

test.beforeAll(() => {
  if (EXPORTS_DIR === null) {
    if (U24_RUN) {
      throw new Error(
        'U24_RECOUNT_EXPORTS_DIR is unset in a U24 run: Part C reads the final exports only from the durable checkpoint (IR-2)',
      );
    }

    test.info().annotations.push({
      type: 'skipped',
      description:
        "Part C inputs not configured (U24_RECOUNT_EXPORTS_DIR unset outside a U24 run) — another unit's regression run",
    });
    test.skip();
  }
});

/* ------------------------------------------------------------------ *
 * IR-1 — independence (plan §R.1 rules 1 and 2), static
 * ------------------------------------------------------------------ */

test.describe('IR-1 — independence of the recount module (static)', () => {
  const source = readFileSync('e2e/u24RawRecount.ts', 'utf8');

  test('the module imports only node: built-ins (it imports nothing at all), and requires nothing', () => {
    const specifiers = [
      ...source.matchAll(/^\s*import[^'"]*['"]([^'"]+)['"]/gm),
      ...source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1]);
    const foreign = specifiers.filter((s) => !s.startsWith('node:'));

    expect(foreign, 'import specifiers outside node:').toEqual([]);
    // Nothing from src/, from a helper or from the Part A recount.
    expect(source).not.toMatch(/from\s+['"]\.\.\/src\//);
    expect(source).not.toMatch(/Helpers['"]/);
    expect(source).not.toMatch(/m07Recount/);
  });

  test('the module never names the forbidden keys (measurement_features, measurement_validity, measurement_protocol, summary_dispositions) and takes only the four input fields', () => {
    for (const key of [
      'measurement_features',
      'measurement_validity',
      'measurement_protocol',
      'summary_dispositions',
    ]) {
      expect(source.includes(key), key).toBe(false);
    }

    const inputType = source.match(
      /export interface RecountInput \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(inputType).toBeDefined();

    const fields = [...inputType!.matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]);

    expect(fields.sort()).toEqual(
      [
        'game_session_id',
        'page_load_index',
        'prior_page_load_events',
        'raw_events',
      ].sort(),
    );
  });

  test("the committed module is byte-identical to the analyst's frozen v4 (SHA-256 dab3cdc87e5c707edbfdb85e88d92cccd49e629b57e0ae483a5bd08bc9368468; v3 was 456c27a6…8a51, corrected after mismatch dossier 1)", () => {
    // The file's bytes, never a decoded string: the module holds non-ASCII
    // text, which a string re-encodes before hashing.
    expect(sha256(readFileSync('e2e/u24RawRecount.ts'))).toBe(
      'dab3cdc87e5c707edbfdb85e88d92cccd49e629b57e0ae483a5bd08bc9368468',
    );
  });
});

/* ------------------------------------------------------------------ *
 * IR-2 — input integrity
 * ------------------------------------------------------------------ */

test.describe('IR-2 — the final exports: pinned, full envelopes, from the durable checkpoint', () => {
  for (const name of EXPORT_NAMES) {
    test(`${name}: SHA-256 equals its re-pin; raw_events_omitted is false; the stripped input has exactly four fields`, () => {
      const pin = EXPORT_PINS[name];

      expect(pin, `${name} re-pinned in this spec`).not.toBeNull();
      expect(
        existsSync(join(EXPORTS_DIR!, name)),
        `${name} present in ${EXPORTS_DIR}`,
      ).toBe(true);

      const { text, envelope } = readEnvelope(name);

      expect(sha256(text)).toBe(pin);
      expect(envelope.payload.raw_events_omitted ?? false).toBe(false);
      expect(Object.keys(stripped(envelope)).sort()).toEqual([
        'game_session_id',
        'page_load_index',
        'prior_page_load_events',
        'raw_events',
      ]);
    });
  }

  test('the checkpoint manifest agrees with the pins', () => {
    const manifest = readFileSync(
      join(EXPORTS_DIR!, 'EXPORTS-SHA256SUMS.txt'),
      'utf8',
    );

    for (const name of EXPORT_NAMES) {
      expect(manifest, name).toContain(`${EXPORT_PINS[name]}`);
      expect(manifest, name).toContain(name);
    }
  });
});

/* ------------------------------------------------------------------ *
 * IR-3 — transcription coverage
 * ------------------------------------------------------------------ */

test.describe('IR-3 — RECOUNT_SPEC covers the inventory with citations (the scientific reviewer checks every entry against the register)', () => {
  test('45 inventory features: 26 primary, 17 companion, 2 sensitivity; every one in RECOUNT_SPEC with at least one citation, or in RECOUNT_GAPS with a reason', () => {
    const specIds = new Map(RECOUNT_SPEC.map((e) => [e.feature_id, e]));
    const gapIds = new Map(RECOUNT_GAPS.map((g) => [g.feature_id, g]));
    const missing: string[] = [];

    for (const f of INVENTORY) {
      const entry = specIds.get(f.feature_id);

      if (entry !== undefined) {
        expect(entry.item, f.feature_id).toBe(f.item);
        expect(entry.role, f.feature_id).toBe(f.role);
        expect(
          entry.citations.length,
          `${f.feature_id} citations`,
        ).toBeGreaterThan(0);
        expect(
          entry.families.length,
          `${f.feature_id} families`,
        ).toBeGreaterThan(0);
      } else if (!gapIds.has(f.feature_id)) {
        missing.push(f.feature_id);
      }
    }

    expect(
      missing,
      'inventory features neither recounted nor listed as gaps',
    ).toEqual([]);
    expect(RECOUNT_SPEC.filter((e) => e.role === 'primary')).toHaveLength(26);
    expect(RECOUNT_SPEC.filter((e) => e.role === 'companion')).toHaveLength(17);
    expect(RECOUNT_SPEC.filter((e) => e.role === 'sensitivity')).toHaveLength(
      2,
    );
    // Nothing in the spec that the inventory does not name.
    const inventoryIds = new Set<string>(INVENTORY.map((f) => f.feature_id));

    expect(
      RECOUNT_SPEC.filter((e) => !inventoryIds.has(e.feature_id)).map(
        (e) => e.feature_id,
      ),
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * IR-4 / IR-5 / IR-6 — the recount over the final exports
 * ------------------------------------------------------------------ */

interface RRecord {
  item: string;
  feature_id: string;
  role: string;
  recount: {
    value: unknown;
    numerator: number | null;
    denominator: number | null;
    disposition: string;
    reason: string | null;
    components?: Record<string, unknown>;
  };
  production: {
    value: unknown;
    numerator: number | null;
    denominator: number | null;
    disposition: string;
    missing_reason: string | null;
  } | null;
  l2: L2Literal | null;
  match: {
    value: boolean;
    numerator: boolean;
    denominator: boolean;
    disposition: boolean;
    all: boolean;
    l2: boolean | null;
    l2_mismatches: string[];
  };
  citation: string;
}

function compareExport(name: string, l2: readonly L2Literal[] | null) {
  const { envelope } = readEnvelope(name);
  const input = stripped(envelope);
  const records = recount(input);
  const byId = new Map(records.map((r) => [r.feature_id, r]));
  const production = new Map(
    envelope.payload.measurement_features.map((f) => [f.feature_id, f]),
  );
  const rows: RRecord[] = [];

  for (const f of INVENTORY) {
    const r = byId.get(f.feature_id);
    const p = production.get(f.feature_id) ?? null;
    const expected = l2?.find((e) => e.feature_id === f.feature_id) ?? null;

    if (r === undefined) {
      rows.push({
        item: f.item,
        feature_id: f.feature_id,
        role: f.role,
        recount: {
          value: undefined,
          numerator: null,
          denominator: null,
          disposition: 'MISSING',
          reason: 'no recount record',
        },
        production: p && {
          value: p.value,
          numerator: p.numerator,
          denominator: p.denominator,
          disposition: p.disposition,
          missing_reason: p.missing_reason ?? null,
        },
        l2: expected,
        match: {
          value: false,
          numerator: false,
          denominator: false,
          disposition: false,
          all: false,
          l2: expected ? false : null,
          l2_mismatches: expected ? ['no recount record'] : [],
        },
        citation: '',
      });
      continue;
    }

    const m = {
      value: p !== null && canonical(r.value) === canonical(p.value),
      numerator: p !== null && r.numerator === p.numerator,
      denominator: p !== null && r.denominator === p.denominator,
      disposition: p !== null && r.disposition === p.disposition,
    };
    const l2m = expected ? l2Mismatches(expected, r) : [];

    rows.push({
      item: f.item,
      feature_id: f.feature_id,
      role: f.role,
      recount: {
        value: r.value,
        numerator: r.numerator,
        denominator: r.denominator,
        disposition: r.disposition,
        reason: r.reason,
        components: r.components,
      },
      production: p && {
        value: p.value,
        numerator: p.numerator,
        denominator: p.denominator,
        disposition: p.disposition,
        missing_reason: p.missing_reason ?? null,
      },
      l2: expected,
      match: {
        ...m,
        all: m.value && m.numerator && m.denominator && m.disposition,
        l2: expected ? l2m.length === 0 : null,
        l2_mismatches: l2m,
      },
      citation: r.citation,
    });
  }

  write(
    `reproduction/${name.replace(/\.json$/, '')}-R.json`,
    JSON.stringify(
      {
        layer:
          "R — independent raw-event recount (the analyst's module over the stripped final export; compared outside the module with production and with L2)",
        export: name,
        export_sha256: EXPORT_PINS[name],
        page_load_index: envelope.page_load_index,
        features: rows.length,
        production_matches: rows.filter((x) => x.match.all).length,
        l2_matches: rows.filter((x) => x.match.l2 === true).length,
        l2_compared: rows.filter((x) => x.match.l2 !== null).length,
        rows,
      },
      null,
      1,
    ),
  );

  return { envelope, input, records, rows };
}

test.describe('IR-4 — recount = production, one comparison per inventory feature per export (RC-3 = b: 45 × 4 = 180, of which 26 × 4 = 104 primaries)', () => {
  for (const name of EXPORT_NAMES) {
    test(`${name}: every inventory feature's value, numerator, denominator and disposition agree; mismatches are written to the -R record before this fails`, () => {
      const { rows } = compareExport(
        name,
        name === 'S2.json' ? S2_L2 : name.startsWith('S1') ? S1_L2 : null,
      );
      const mismatched = rows.filter((r) => !r.match.all);

      expect(
        mismatched.map(
          (r) =>
            `${r.feature_id}: recount ${r.recount.disposition} ${JSON.stringify(r.recount.value)} ${r.recount.numerator}/${r.recount.denominator} vs production ${r.production?.disposition} ${JSON.stringify(r.production?.value)} ${r.production?.numerator}/${r.production?.denominator}`,
        ),
        `${name}: recount ≠ production (plan §R.1 rule 6: FAIL until diagnosed; never edit the recount to agree)`,
      ).toEqual([]);
    });
  }
});

test.describe('IR-5 — recount = L2 expectation for the primaries of S1 × 2 and S2 (78 comparisons)', () => {
  for (const [name, l2] of [
    ['S1-800x600.json', S1_L2],
    ['S1-1280x720.json', S1_L2],
    ['S2.json', S2_L2],
  ] as const) {
    test(`${name}: the 26 primary recount records match the scenario expectation`, () => {
      const { records } = compareExport(name, l2);
      const failures: string[] = [];

      for (const expected of l2) {
        const r = records.find((x) => x.feature_id === expected.feature_id);

        if (r === undefined) {
          failures.push(`${expected.feature_id}: no recount record`);
          continue;
        }

        const mm = l2Mismatches(expected, r);

        if (mm.length > 0)
          failures.push(`${expected.feature_id}: ${mm.join(', ')}`);
      }

      expect(l2).toHaveLength(26);
      expect(failures, `${name}: recount ≠ L2`).toEqual([]);
    });
  }
});

test.describe('IR-6 — S3: reload and missingness (r3 §2 / §5 / §6; the D-8 restatement)', () => {
  test('page load 4; the rows held after the reloads read as r3 §4 G1 states; prior_page_load_events are never current-load evidence (the recount with and without them differs only where a rule reads the earlier loads: the D-7 (i) carry-forward of the six RL-4 rows and the M25 case-3 delay covariate)', () => {
    const { envelope, input, records } = compareExport('S3.json', null);

    expect(envelope.page_load_index).toBe(4);

    // The S3 route's load-4 readings of the six RL-4 rows (r3 §4 G1; the
    // RL-4 S3 expectations of u24_export_recovery): M14 and M15 opened in an
    // earlier load and held (H) — interrupted; M16, M18, M19 and M20 never
    // opened — no eligible event.
    const disposition = (id: string) =>
      records.find((r) => r.feature_id === id)?.disposition;

    expect(disposition('m14_correct_first_integrations')).toBe('interrupted');
    expect(disposition('m15_correct_first_predictions')).toBe('interrupted');

    for (const id of [
      'm16_correct_first_applications',
      'm18_correct_first_diagnoses',
      'm19_continuations',
      'm20_cued_resumptions',
    ]) {
      expect(disposition(id), id).toBe('no_eligible_event');
    }

    // With and without the earlier loads.
    const without = recount({ ...input, prior_page_load_events: [] });
    const differences: {
      feature_id: string;
      with: unknown;
      without: unknown;
    }[] = [];

    for (const r of records) {
      const w = without.find((x) => x.feature_id === r.feature_id)!;
      const a = canonical({
        v: r.value,
        n: r.numerator,
        d: r.denominator,
        s: r.disposition,
      });
      const b = canonical({
        v: w.value,
        n: w.numerator,
        d: w.denominator,
        s: w.disposition,
      });

      if (a !== b) {
        differences.push({
          feature_id: r.feature_id,
          with: { value: r.value, disposition: r.disposition },
          without: { value: w.value, disposition: w.disposition },
        });
      }
    }

    const componentDifferences = records
      .filter((r) => {
        const w = without.find((x) => x.feature_id === r.feature_id)!;

        return (
          canonical(r.components ?? null) !== canonical(w.components ?? null)
        );
      })
      .map((r) => r.feature_id);

    write(
      'reproduction/S3-R-prior-load-exclusion.json',
      JSON.stringify(
        {
          note: 'the recount over S3 with and without prior_page_load_events; a reading that differs would mean the earlier loads were counted as current-load evidence',
          reading_differences: differences,
          component_differences: componentDifferences,
        },
        null,
        1,
      ),
    );
    // No value, numerator, denominator or disposition may depend on the
    // earlier loads (the carry-forward of D-7 (i) can only withhold an A
    // class, and S3 carries no U / M marker in its earlier loads).
    expect(differences).toEqual([]);
    // Components may differ only where a rule reads the earlier loads.
    expect(
      componentDifferences.filter(
        (id) =>
          id !== 'm25_normality_belief' &&
          ![
            'm14_correct_first_integrations',
            'm15_correct_first_predictions',
            'm16_correct_first_applications',
            'm18_correct_first_diagnoses',
            'm19_continuations',
            'm20_cued_resumptions',
          ].includes(id),
      ),
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * IR-7 — RC-2 = a: the stated mutation cases on in-memory copies
 * ------------------------------------------------------------------ */

type Mutator = (input: RecountInput) => RecountInput;

interface MutationCase {
  id: string;
  rule: string;
  base: 'S1-800x600.json' | 'S3.json';
  features: string[];
  /** The stated treatment of the named features. */
  expected: 'technical_failure' | 'unchanged' | 'held_unverified';
  mutate: Mutator;
}

function cloneInput(input: RecountInput): RecountInput {
  return JSON.parse(JSON.stringify(input)) as RecountInput;
}

function nth(
  events: readonly RecountEvent[],
  type: string,
  index = 0,
): RecountEvent {
  const found = events.filter((e) => e.event_type === type)[index];

  if (found === undefined)
    throw new Error(`no event ${type}[${index}] in the base export`);

  return found;
}

function maxSequence(events: readonly RecountEvent[]): number {
  return events.reduce(
    (m, e) =>
      typeof e.sequence === 'number' && e.sequence > m ? e.sequence : m,
    0,
  );
}

const MUTATIONS: MutationCase[] = [
  {
    id: 'X-SEQ-1',
    rule: 'M09 row (REG §5.259): every event of the accepted watch duty carries a usable sequence',
    base: 'S1-800x600.json',
    features: ['m09_due_checks_fulfilled'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);

      delete (
        nth(c.raw_events, 'proto_m09_checks_check_fulfilled') as {
          sequence?: unknown;
        }
      ).sequence;

      return c;
    },
  },
  {
    id: 'X-SEQ-2',
    rule: 'M09 row (REG §5.259): a sequence that is not a safe integer ≥ 1 (2.5) is unusable',
    base: 'S1-800x600.json',
    features: ['m09_due_checks_fulfilled'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);

      nth(c.raw_events, 'proto_m09_checks_check_fulfilled').sequence = 2.5;

      return c;
    },
  },
  {
    id: 'X-SEQ-3',
    rule: 'M10 row (REG §5.259): no two events of an accepted delivery share a sequence',
    base: 'S1-800x600.json',
    features: ['m10_obligations_fulfilled'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);
      const shown = c.raw_events.filter(
        (e) => e.event_type === 'proto_m10_delivery_obligation_shown',
      );

      shown[1].sequence = shown[0].sequence;

      return c;
    },
  },
  {
    id: 'X-SEQ-4',
    rule: 'M14 row (addendum §2 M14; REG §5.284): a family event without a usable, unique sequence voids the row',
    base: 'S1-800x600.json',
    features: ['m14_correct_first_integrations'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);

      delete (
        nth(c.raw_events, 'proto_m14_integration_first_response', 2) as {
          sequence?: unknown;
        }
      ).sequence;

      return c;
    },
  },
  {
    id: 'X-SEQ-5',
    rule: 'M18 row (addendum §2 M18, shared scope): two family events sharing one sequence void both M18 rows',
    base: 'S1-800x600.json',
    features: [
      'm18_correct_first_diagnoses',
      'm18_correct_consequence_predictions',
    ],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);
      const events = c.raw_events.filter(
        (e) =>
          e.event_type.startsWith('proto_m18_cases_') &&
          typeof e.sequence === 'number',
      );

      events[3].sequence = events[2].sequence;

      return c;
    },
  },
  {
    id: 'X-SEQ-6',
    rule: 'M19 row (S2, REG §5.259): a family event without a usable sequence voids the row',
    base: 'S1-800x600.json',
    features: ['m19_continuations'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);
      const events = c.raw_events.filter((e) =>
        e.event_type.startsWith('proto_m19_lines_'),
      );

      delete (events[Math.floor(events.length / 2)] as { sequence?: unknown })
        .sequence;

      return c;
    },
  },
  {
    id: 'X-SEQ-7',
    rule: 'M07 row (REG §4 "Unit 24-A", §5.378–§5.384): a stage_advanced without a usable sequence voids the stages; m07_returns null with it',
    base: 'S1-800x600.json',
    features: ['m07_stages_completed', 'm07_returns'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);

      delete (
        nth(c.raw_events, 'proto_m07_calibration_stage_advanced', 1) as {
          sequence?: unknown;
        }
      ).sequence;

      return c;
    },
  },
  {
    id: 'X-DUP-1',
    rule: 'M02 row (addendum §2 M02): a second answer to one request voids the retrievals and the latency; the layout keeps its reading',
    base: 'S1-800x600.json',
    features: ['m02_correct_first_retrievals', 'm02_retrieval_latency'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);
      const answer = nth(
        c.raw_events,
        'proto_m02_workspace_request_answered',
        2,
      );
      const copy = JSON.parse(JSON.stringify(answer)) as RecountEvent;

      copy.sequence = maxSequence(c.raw_events) + 1;
      c.raw_events = [...c.raw_events, copy];

      return c;
    },
  },
  {
    id: 'X-DUP-4',
    rule: 'M07 row: a duplicate stage_advanced voids the stages',
    base: 'S1-800x600.json',
    features: ['m07_stages_completed'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);
      const stage = nth(
        c.raw_events,
        'proto_m07_calibration_stage_advanced',
        0,
      );
      const copy = JSON.parse(JSON.stringify(stage)) as RecountEvent;

      copy.sequence = maxSequence(c.raw_events) + 1;
      c.raw_events = [...c.raw_events, copy];

      return c;
    },
  },
  {
    id: 'X-DUP-5',
    rule: 'M14 row (addendum §2 M14): a second first response to one decision voids the row',
    base: 'S1-800x600.json',
    features: ['m14_correct_first_integrations'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);
      const first = nth(
        c.raw_events,
        'proto_m14_integration_first_response',
        0,
      );
      const copy = JSON.parse(JSON.stringify(first)) as RecountEvent;

      copy.sequence = maxSequence(c.raw_events) + 1;
      c.raw_events = [...c.raw_events, copy];

      return c;
    },
  },
  {
    id: 'X-VER-1',
    rule: 'M07 row: a record of the superseded administration m07-calibration-v1 voids the row ("superseded administration")',
    base: 'S1-800x600.json',
    features: ['m07_stages_completed'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);
      const stage = nth(
        c.raw_events,
        'proto_m07_calibration_stage_advanced',
        0,
      );

      stage.metadata = {
        ...(stage.metadata ?? {}),
        entry_state_version: 'm07-calibration-v1',
      };

      return c;
    },
  },
  {
    id: 'X-VER-3',
    rule: 'M14 row (addendum §2 M14): an unknown administration version on a family event voids the row',
    base: 'S1-800x600.json',
    features: ['m14_correct_first_integrations'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);
      const first = nth(
        c.raw_events,
        'proto_m14_integration_first_response',
        0,
      );

      first.metadata = {
        ...(first.metadata ?? {}),
        entry_state_version: 'm14-integration-v99',
      };

      return c;
    },
  },
  {
    id: 'X-PLI-1',
    rule: 'C-2 (REG §5.404 (d)): a check record naming another page load is malformed — the row a technical failure',
    base: 'S3.json',
    features: ['m14_correct_first_integrations'],
    expected: 'technical_failure',
    mutate: (input) => {
      const c = cloneInput(input);
      const check = nth(
        c.raw_events,
        'proto_m14_integration_prior_load_checked',
      );

      check.metadata = { ...(check.metadata ?? {}), page_load_index: 2 };

      return c;
    },
  },
  {
    // Added with the analyst's v4 (DIAGNOSIS-1, rule C-6): the envelope's
    // own page-load stamp, as distinct from the check record's field above.
    id: 'X-PLI-3',
    rule: 'C-6 (REG §5.374): a record STAMPED with another page load (the envelope field) is excluded from the row, never a technical failure — the row unchanged',
    base: 'S1-800x600.json',
    features: ['m07_stages_completed'],
    expected: 'unchanged',
    mutate: (input) => {
      const c = cloneInput(input);
      const stage = nth(
        c.raw_events,
        'proto_m07_calibration_stage_advanced',
        1,
      );
      const copy = JSON.parse(JSON.stringify(stage)) as RecountEvent;

      copy.sequence = maxSequence(c.raw_events) + 1;
      (copy as { page_load_index?: number }).page_load_index = 2;
      c.raw_events = [...c.raw_events, copy];

      return c;
    },
  },
  {
    id: 'X-DUP-10',
    rule: 'C-1 (D-6 (i); REG §5.410): two check records of a family in one load establish nothing — the row its held (not established) reading',
    base: 'S3.json',
    features: ['m16_correct_first_applications'],
    expected: 'held_unverified',
    mutate: (input) => {
      const c = cloneInput(input);
      const check = nth(c.raw_events, 'proto_m16_handling_prior_load_checked');
      const copy = JSON.parse(JSON.stringify(check)) as RecountEvent;

      copy.sequence = maxSequence(c.raw_events) + 1;
      c.raw_events = [...c.raw_events, copy];

      return c;
    },
  },
];

test.describe('IR-7 — RC-2 = a: the stated integrity rules on in-memory copies of the final exports (recount AND production, the latter called only here)', () => {
  test('each mutation case reads as its stated rule in the recount and in production; the original exports are unchanged afterwards', () => {
    const bases = new Map(EXPORT_NAMES.map((n) => [n, readEnvelope(n)]));
    const results: Record<string, unknown>[] = [];
    const failures: string[] = [];

    // The four read fields of a record, for the 'unchanged' cases.
    const reading = (
      x:
        | {
            value: unknown;
            numerator: unknown;
            denominator: unknown;
            disposition: unknown;
          }
        | undefined,
    ) =>
      x === undefined
        ? 'MISSING'
        : canonical({
            v: x.value,
            n: x.numerator,
            d: x.denominator,
            s: x.disposition,
          });

    for (const m of MUTATIONS) {
      const { envelope } = bases.get(m.base)!;
      const base = stripped(envelope);
      const mutated = m.mutate(base);
      const context = {
        finalCoreClosed: true,
        pageLoadIndex: envelope.page_load_index,
        reloaded: envelope.page_load_index > 1,
      };
      const rec = recount(mutated);
      const prod = extractMeasurementFeatures(
        mutated.raw_events as never,
        context,
      ) as unknown as ProductionFeature[];
      // The unmutated readings, only for the 'unchanged' cases.
      const baseRec = m.expected === 'unchanged' ? recount(base) : [];
      const baseProd =
        m.expected === 'unchanged'
          ? (extractMeasurementFeatures(
              base.raw_events as never,
              context,
            ) as unknown as ProductionFeature[])
          : [];
      const perFeature = m.features.map((id) => {
        const r = rec.find((x) => x.feature_id === id);
        const p = prod.find((x) => x.feature_id === id);
        const recountOk =
          m.expected === 'technical_failure'
            ? r?.disposition === 'technical_failure'
            : m.expected === 'held_unverified'
              ? r?.disposition === 'interrupted' && r.value === null
              : reading(r) ===
                reading(baseRec.find((x) => x.feature_id === id));
        const productionOk =
          m.expected === 'technical_failure'
            ? p?.disposition === 'technical_failure'
            : m.expected === 'held_unverified'
              ? p?.disposition === 'interrupted' && p.value === null
              : reading(p) ===
                reading(baseProd.find((x) => x.feature_id === id));

        return {
          feature_id: id,
          recount: {
            disposition: r?.disposition ?? 'MISSING',
            value: r?.value ?? null,
            reason: r?.reason ?? null,
          },
          production: {
            disposition: p?.disposition ?? 'MISSING',
            value: p?.value ?? null,
            missing_reason: p?.missing_reason ?? null,
          },
          recount_as_rule: recountOk,
          production_as_rule: productionOk,
        };
      });

      results.push({
        case: m.id,
        rule: m.rule,
        base: m.base,
        expected: m.expected,
        features: perFeature,
      });

      for (const f of perFeature) {
        if (!f.recount_as_rule)
          failures.push(
            `${m.id} ${f.feature_id}: recount read ${f.recount.disposition}, the rule says ${m.expected}`,
          );
        if (!f.production_as_rule)
          failures.push(
            `${m.id} ${f.feature_id}: PRODUCTION read ${f.production.disposition}, the rule says ${m.expected}`,
          );
      }
    }

    write(
      'reproduction/IR7-mutations.json',
      JSON.stringify(
        {
          cases: results,
          uncovered:
            "MUTATION-RULES.md Part 3 (the analyst's list; not implemented, not invented)",
        },
        null,
        1,
      ),
    );

    // The original exports are untouched (the mutations worked on copies).
    for (const name of EXPORT_NAMES) {
      expect(
        sha256(readFileSync(join(EXPORTS_DIR!, name), 'utf8')),
        `${name} unchanged after IR-7`,
      ).toBe(EXPORT_PINS[name]);
    }

    expect(failures).toEqual([]);
  });
});
