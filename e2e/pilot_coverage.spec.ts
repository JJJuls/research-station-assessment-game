/**
 * Pilot coverage registry — pure domain tests (Unit 1).
 *
 * Imports the Node-safe schedule module directly (no browser, no
 * import.meta): M01–M26 completeness, exactly one route-primary candidate per
 * applicable item, pairwise-disjoint primary families that never swallow a
 * legacy family, status derivation, and the participant-safe operational
 * summary.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { registerEntry } from '../src/measurement/registerV3';
import type { CoverageRecordLike } from '../src/pilot/coverageSchedule';
import {
  deriveCoverage,
  deriveItemCoverage,
  isTerminal,
  operationalCompletionSummary,
  opportunityCoverageStatus,
  PILOT_ITEM_IDS,
  PILOT_SCHEDULE,
  primaryFamilyPrefixes,
  scheduledOpportunityIds,
} from '../src/pilot/coverageSchedule';
import { EVIDENCE_LEDGER } from '../src/pilot/evidenceLedger';

function record(
  overrides: Partial<CoverageRecordLike> & { opportunity_id: string },
): CoverageRecordLike {
  return {
    form: null,
    entered: false,
    completed: false,
    absent: false,
    censored: false,
    technical_failure: false,
    comprehension_failure: false,
    contaminated: false,
    invalid_reason: null,
    prior_exposure: [],
    validity: 'pending',
    ...overrides,
  };
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }

  return out;
}

test.describe('pilot coverage schedule (pure)', () => {
  test('every M01–M26 item appears exactly once, in order', () => {
    expect(PILOT_SCHEDULE.map((entry) => entry.item)).toEqual([
      ...PILOT_ITEM_IDS,
    ]);
    expect(new Set(PILOT_SCHEDULE.map((entry) => entry.item)).size).toBe(26);
  });

  test('exactly one route-primary candidate per applicable item; none duplicated; identity always provisional', () => {
    const primaries = PILOT_SCHEDULE.filter(
      (entry) => entry.disposition === 'PRIMARY-CANDIDATE',
    );

    // Route-primary candidates = every strong/conditional ledger item plus
    // the items the Station 080 register promotes with an explicit, cited
    // override (M08 / M11 / M25 as their approved tasks land).
    expect(primaries.map((entry) => entry.item)).toEqual(
      EVIDENCE_LEDGER.filter(
        (entry) =>
          entry.disposition_class !== 'questionnaire_primary' ||
          registerEntry(entry.id).disposition_override !== null,
      ).map((entry) => entry.id),
    );

    const allIds = scheduledOpportunityIds();

    expect(new Set(allIds).size).toBe(allIds.length);

    for (const entry of PILOT_SCHEDULE) {
      if (entry.disposition === 'PRIMARY-CANDIDATE') {
        expect(entry.opportunityIds.length).toBeGreaterThan(0);
        expect(entry.familyPrefixes.length).toBeGreaterThan(0);
        expect(entry.zone).not.toBeNull();
        expect(entry.operationalLabel).not.toBeNull();
        expect(['mission_brief', 'module_header']).toContain(
          entry.itemIdentity,
        );
      } else if (entry.item !== 'M25') {
        expect(entry.opportunityIds).toEqual([]);
        expect(entry.familyPrefixes).toEqual([]);
      }
    }

    // Departure-closed stopping-rule windows are never named by the review.
    for (const item of ['M22', 'M24', 'M25', 'M26']) {
      expect(
        PILOT_SCHEDULE.find((entry) => entry.item === item)!.reviewNaming,
      ).toBe('never');
    }

    // No SHARED-AUTHORISED item exists in the M battery (Q29/Q31 is the sole
    // authorised shared exception and belongs to the Q battery).
    expect(
      PILOT_SCHEDULE.some((entry) => entry.disposition === 'SHARED-AUTHORISED'),
    ).toBe(false);
  });

  test('route-primary event-family prefixes are pairwise disjoint and never swallow a legacy proto_* event', () => {
    const prefixes = primaryFamilyPrefixes();

    // One prefix per family: an item may own several families (Station
    // 080 Unit 4: M25's loops and belief windows live in different rooms
    // and carry distinct families so neither swallows the legacy
    // `proto_m25_probe_*` / `proto_m25_yardpump_*` events).
    expect(prefixes.length).toBe(
      PILOT_SCHEDULE.reduce(
        (sum, entry) => sum + entry.familyPrefixes.length,
        0,
      ),
    );
    expect(new Set(prefixes).size).toBe(prefixes.length);

    for (const a of prefixes) {
      for (const b of prefixes) {
        if (a === b) {
          continue;
        }

        expect(a.startsWith(b), `${a} nested in ${b}`).toBe(false);
      }
    }

    // Scan every src/ literal `proto_*` event/family name that starts with a
    // route-primary prefix; each must come from that item's own route
    // module (inventory, informationProcessing, fieldActions or pilot) —
    // never from a legacy scene (Pump House, Coolant Yard, ...).
    const ROUTE_SOURCE_DIRS = [
      'src/inventory',
      'src/informationProcessing',
      'src/fieldActions',
      'src/pilot',
      // Station 080: the register and the read-only feature extractors
      // name the families they describe / consume (never emit).
      'src/measurement',
    ].map((dir) => dir.replace(/\//g, '\\'));
    const files = listTsFiles(join(__dirname, '..', 'src'));
    const offenders: string[] = [];
    // Pilot host scenes legitimately reference their items' opportunity
    // ids (declare/open wiring); they are hosts, not legacy rooms.
    const PILOT_HOST_SCENES = [
      'src/scenes/StationConcourseScene.ts',
      'src/scenes/DiagnosticsLaboratoryScene.ts',
      'src/scenes/ExteriorRecoveryYardScene.ts',
      'src/scenes/UtilityCoreDeckScene.ts',
    ];

    for (const file of files) {
      const rel = file.replace(join(__dirname, '..') + '\\', '');
      const text = readFileSync(file, 'utf8');

      if (
        PILOT_HOST_SCENES.includes(rel.split(String.fromCharCode(92)).join('/'))
      ) {
        continue;
      }

      for (const prefix of prefixes) {
        const pattern = new RegExp(`'${prefix}[a-z0-9_]*'`, 'g');

        if (!pattern.test(text)) {
          continue;
        }

        const isRouteSource = ROUTE_SOURCE_DIRS.some((dir) =>
          rel.startsWith(dir),
        );

        if (!isRouteSource) {
          offenders.push(`${rel} contains a literal under ${prefix}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  test('operational labels never leak item ids, Q ids, proto names or evaluative words', () => {
    for (const entry of PILOT_SCHEDULE) {
      if (entry.operationalLabel === null) {
        continue;
      }

      expect(entry.operationalLabel).not.toMatch(/\bM\d{2}\b/);
      expect(entry.operationalLabel).not.toMatch(/\bQ\d{2}\b/);
      expect(entry.operationalLabel).not.toMatch(/proto_/);
      expect(entry.operationalLabel).not.toMatch(
        /persist|organis|conscien|trait|score|good|bad|fail/i,
      );
    }
  });

  test('opportunity status derivation — missing and invalid are never completion; invalidity dominates censoring', () => {
    expect(opportunityCoverageStatus(null)).toBe('pending');
    expect(
      opportunityCoverageStatus(record({ opportunity_id: 'x', entered: true })),
    ).toBe('open');
    expect(
      opportunityCoverageStatus(
        record({
          opportunity_id: 'x',
          entered: true,
          completed: true,
          validity: 'valid',
        }),
      ),
    ).toBe('completed');
    expect(
      opportunityCoverageStatus(
        record({
          opportunity_id: 'x',
          entered: true,
          absent: true,
          invalid_reason: 'participant_absent',
          validity: 'missing',
        }),
      ),
    ).toBe('missing');
    expect(
      opportunityCoverageStatus(
        record({
          opportunity_id: 'x',
          entered: true,
          technical_failure: true,
          invalid_reason: 'technical_failure',
          validity: 'invalid',
        }),
      ),
    ).toBe('invalid');
    expect(
      opportunityCoverageStatus(
        record({
          opportunity_id: 'x',
          entered: true,
          censored: true,
          invalid_reason: 'censored',
          validity: 'missing',
        }),
      ),
    ).toBe('censored');
    // Technical failure + censoring → invalid dominates (MIN-3).
    expect(
      opportunityCoverageStatus(
        record({
          opportunity_id: 'x',
          entered: true,
          censored: true,
          technical_failure: true,
          invalid_reason: 'technical_failure',
          validity: 'invalid',
        }),
      ),
    ).toBe('invalid');
    // A completed-but-contaminated record is INVALID, never completed.
    expect(
      opportunityCoverageStatus(
        record({
          opportunity_id: 'x',
          entered: true,
          completed: true,
          contaminated: true,
          invalid_reason: 'contamination',
          validity: 'invalid',
        }),
      ),
    ).toBe('invalid');
  });

  test('item status is the least terminal of its instances (M03 A/B); per-instance detail survives', () => {
    const m03 = PILOT_SCHEDULE.find((entry) => entry.item === 'M03')!;

    expect(
      deriveItemCoverage(m03, [
        record({
          opportunity_id: 'proto_m03_reset_a',
          entered: true,
          completed: true,
          validity: 'valid',
        }),
      ]).status,
    ).toBe('pending');

    const mixed = deriveItemCoverage(m03, [
      record({
        opportunity_id: 'proto_m03_reset_a',
        entered: true,
        completed: true,
        validity: 'valid',
      }),
      record({
        opportunity_id: 'proto_m03_reset_b',
        entered: true,
        censored: true,
        invalid_reason: 'censored',
        validity: 'missing',
      }),
    ]);

    expect(mixed.status).toBe('censored');
    expect(
      mixed.opportunities.map((opportunity) => opportunity.status),
    ).toEqual(['completed', 'censored']);
  });

  test('unscheduled items are not_applicable; the summary names only never-entered reviewable windows', () => {
    const coverage = deriveCoverage([]);

    expect(
      coverage
        .filter((item) => item.status === 'not_applicable')
        .map((item) => item.item),
    ).toEqual(
      PILOT_SCHEDULE.filter((entry) => entry.opportunityIds.length === 0).map(
        (entry) => entry.item,
      ),
    );

    const summary = operationalCompletionSummary(coverage);

    const scheduledCount = PILOT_SCHEDULE.filter(
      (entry) => entry.opportunityIds.length > 0,
    ).length;

    expect(summary.scheduled).toBe(scheduledCount);
    // Round-2 S2 rule: the four reviewNaming-never stopping-rule items
    // are excluded from the participant-facing OPEN count.
    expect(summary.closed).toBe(4);
    expect(summary.open).toBe(scheduledCount - 4);
    // Every reviewable window — M22/M24/M25/M26 are never named.
    expect(summary.neverEnteredLabels.length).toBe(scheduledCount - 4);
    expect(summary.neverEnteredLabels.join(' ')).not.toMatch(
      /Magnet|Sector|seal|pump/i,
    );
    expect(isTerminal('not_applicable')).toBe(true);

    // An entered-but-unfinished reviewable window is counted open but NOT named.
    const entered = deriveCoverage([
      record({ opportunity_id: 'proto_m02_case_workspace', entered: true }),
    ]);
    const enteredSummary = operationalCompletionSummary(entered);

    // Round-2 S2 rule: the four reviewNaming-never items are excluded
    // from the participant-facing OPEN count (scheduled - 4).
    expect(enteredSummary.open).toBe(scheduledCount - 4);
    expect(enteredSummary.neverEnteredLabels.length).toBe(scheduledCount - 5);
    expect(enteredSummary.neverEnteredLabels.join(' ')).not.toMatch(
      /Case workspace/,
    );
  });

  test('contamination notes are carried per opportunity', () => {
    const m13 = PILOT_SCHEDULE.find((entry) => entry.item === 'M13')!;
    const derived = deriveItemCoverage(m13, [
      record({
        opportunity_id: 'proto_m13_lattice_construction',
        entered: true,
        prior_exposure: [
          'contamination:developer_scene:pump_house',
          'some other note',
        ],
      }),
    ]);

    expect(derived.opportunities[0].contamination_notes).toEqual([
      'contamination:developer_scene:pump_house',
    ]);
  });
});
