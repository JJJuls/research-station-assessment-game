/**
 * Evidence-led pilot v2 — Unit 0 ledger gate (pure, no browser).
 *
 * Proves the frozen M01–M26 implementation ledger before any gameplay edit:
 * every item appears exactly once, the classifications equal 16 strong /
 * 7 conditional / 3 questionnaire-primary-or-hybrid, item families are
 * disjoint, no canonical event or score was created, the docs-side JSON
 * (which alone carries the exact source wording) agrees with the runtime
 * module (which never does), and no questionnaire wording leaks into src/.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { expect, test } from '@playwright/test';

import { PILOT_SCHEDULE } from '../src/pilot/coverageSchedule';
import {
  EVIDENCE_LEDGER,
  LEDGER_BURDEN_BUDGET,
  LEDGER_INFERENCE_MODEL,
  LEDGER_WORKBOOK_MD5,
  ledgerClassificationCounts,
  ledgerFamilyPrefixes,
  ledgerItemsInEpisode,
  ledgerOpportunityIds,
} from '../src/pilot/evidenceLedger';
import { CANONICAL_EVENT_CONTEXT } from '../src/world/CanonicalEventContext';

const REPO = join(__dirname, '..');
const WORKBOOK = join(
  REPO,
  'docs/verification/input/Remote_Outpost_M01-M26_Scientific_Decision_v2.xlsx',
);
const LEDGER_JSON = join(
  REPO,
  'docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.json',
);

const EXPECTED_IDS = Array.from(
  { length: 26 },
  (_, index) => `M${String(index + 1).padStart(2, '0')}`,
);

const STRONG = [
  'M03',
  'M04',
  'M09',
  'M10',
  'M13',
  'M14',
  'M15',
  'M16',
  'M17',
  'M18',
  'M19',
  'M20',
  'M22',
  'M23',
  'M24',
  'M26',
];
const CONDITIONAL = ['M01', 'M02', 'M05', 'M06', 'M07', 'M12', 'M21'];
const QUESTIONNAIRE = ['M08', 'M11', 'M25'];

interface LedgerJsonItem {
  id: string;
  exact_source_item: string;
  disposition_class: string;
  active_seconds: number;
  route: {
    opportunity_ids: string[];
    family_prefixes: string[];
    windows: { id: string; episode: number }[];
    episodes: number[];
  };
  [key: string]: unknown;
}

interface LedgerJson {
  source: {
    workbook: string;
    workbook_md5: string;
    sheet: string;
    sheets_present: string[];
  };
  classification_counts: Record<string, number>;
  item_owned_active_seconds: number;
  items: LedgerJsonItem[];
}

function readLedgerJson(): LedgerJson {
  return JSON.parse(readFileSync(LEDGER_JSON, 'utf8')) as LedgerJson;
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

test.describe('evidence-led pilot v2 ledger (pure)', () => {
  test('all 26 items appear exactly once, in order, with an explicit disposition', () => {
    expect(EVIDENCE_LEDGER.map((entry) => entry.id)).toEqual(EXPECTED_IDS);
    expect(new Set(EVIDENCE_LEDGER.map((entry) => entry.id)).size).toBe(26);

    for (const entry of EVIDENCE_LEDGER) {
      expect(entry.final_disposition.length).toBeGreaterThan(0);
      expect(entry.instrument.length).toBeGreaterThan(0);
      expect(entry.facet_or_scale.length).toBeGreaterThan(0);
      expect(entry.validity_gate.length).toBeGreaterThan(0);
      expect(entry.candidate_raw_variables.length).toBeGreaterThan(0);
      expect(entry.primary_source).toMatch(/^https:\/\/doi\.org\//);
    }
  });

  test('classifications equal 16 strong / 7 conditional / 3 questionnaire-primary-or-hybrid', () => {
    expect(ledgerClassificationCounts()).toEqual({
      strong: 16,
      conditional: 7,
      questionnaire_primary: 3,
    });

    const byClass = (cls: string) =>
      EVIDENCE_LEDGER.filter((entry) => entry.disposition_class === cls).map(
        (entry) => entry.id,
      );

    expect(byClass('strong')).toEqual(STRONG);
    expect(byClass('conditional')).toEqual(CONDITIONAL);
    expect(byClass('questionnaire_primary')).toEqual(QUESTIONNAIRE);
  });

  test('questionnaire-primary items own no behavioural window and zero active seconds; game candidates own windows', () => {
    for (const entry of EVIDENCE_LEDGER) {
      if (entry.disposition_class === 'questionnaire_primary') {
        expect(entry.active_seconds).toBe(0);

        if (entry.id === 'M25') {
          // Hybrid: a transparent self-report probe window only.
          expect(entry.route.opportunity_ids).toEqual([
            'proto_m25_belief_probe',
          ]);
        } else {
          expect(entry.route.opportunity_ids).toEqual([]);
          expect(entry.route.windows).toEqual([]);
          expect(entry.route.secondary_telemetry_ids.length).toBe(1);
        }
      } else {
        expect(entry.active_seconds).toBeGreaterThan(0);
        expect(entry.route.opportunity_ids.length).toBeGreaterThan(0);
        expect(entry.route.windows.length).toBeGreaterThan(0);
        expect(entry.route.family_prefixes.length).toBeGreaterThan(0);
      }

      // Every window sits inside one of the item's sheet-09 episodes.
      for (const window of entry.route.windows) {
        expect(entry.route.episodes, `${entry.id} ${window.id}`).toContain(
          window.episode,
        );
      }
    }
  });

  test('inference architecture: six facet/scale models, item-owned components only', () => {
    expect(LEDGER_INFERENCE_MODEL.map((model) => model.items)).toEqual([
      ['M01', 'M02', 'M03', 'M04'],
      ['M05', 'M06', 'M07', 'M08'],
      ['M09', 'M10', 'M11', 'M12'],
      ['M13', 'M14', 'M15', 'M16', 'M17', 'M18'],
      ['M19', 'M20', 'M21', 'M22', 'M23'],
      ['M24', 'M25', 'M26'],
    ]);

    for (const model of LEDGER_INFERENCE_MODEL) {
      for (const id of model.items) {
        const entry = EVIDENCE_LEDGER.find((candidate) => candidate.id === id)!;

        expect(entry.facet_or_scale).toBe(model.facet_or_scale);
      }
    }
  });

  test('item-owned active time sums to the frozen 1,040 s budget', () => {
    const total = EVIDENCE_LEDGER.reduce(
      (sum, entry) => sum + entry.active_seconds,
      0,
    );

    expect(total).toBe(LEDGER_BURDEN_BUDGET.item_owned_active_seconds);
    expect(LEDGER_BURDEN_BUDGET.planned_total_seconds).toBe(
      LEDGER_BURDEN_BUDGET.item_owned_active_seconds +
        LEDGER_BURDEN_BUDGET.shared_overhead_seconds +
        LEDGER_BURDEN_BUDGET.non_scored_closure_seconds,
    );
    expect(LEDGER_BURDEN_BUDGET.status).toMatch(/requires human pilot/);
  });

  test('every episode 1–5 hosts windows; the closure episode hosts none', () => {
    for (const episode of [1, 2, 3, 4, 5] as const) {
      expect(ledgerItemsInEpisode(episode).length).toBeGreaterThan(0);
    }

    expect(ledgerItemsInEpisode(6)).toEqual([]);
  });

  test('opportunity ids, window ids and family prefixes are unique and pairwise non-nested', () => {
    const ids = ledgerOpportunityIds();

    expect(new Set(ids).size).toBe(ids.length);

    const windowIds = EVIDENCE_LEDGER.flatMap((entry) =>
      entry.route.windows.map((window) => window.id),
    );

    expect(new Set(windowIds).size).toBe(windowIds.length);

    const prefixes = ledgerFamilyPrefixes();

    expect(new Set(prefixes).size).toBe(prefixes.length);

    for (const a of prefixes) {
      for (const b of prefixes) {
        if (a !== b) {
          expect(a.startsWith(b), `${a} nested in ${b}`).toBe(false);
        }
      }
    }

    // Every opportunity id belongs to exactly one item.
    const owners = new Map<string, string>();

    for (const entry of EVIDENCE_LEDGER) {
      for (const id of entry.route.opportunity_ids) {
        expect(owners.has(id), `${id} owned twice`).toBe(false);
        owners.set(id, entry.id);
      }
    }
  });

  test('ledger families never swallow a legacy route family of a different item', () => {
    // Legacy (pre-v2) route families from the v1 schedule: a v2 prefix may
    // only match a legacy prefix when it is the SAME item's retained family.
    for (const legacy of PILOT_SCHEDULE) {
      for (const legacyPrefix of legacy.familyPrefixes) {
        for (const entry of EVIDENCE_LEDGER) {
          for (const prefix of entry.route.family_prefixes) {
            if (entry.id === legacy.item) {
              continue;
            }

            expect(
              legacyPrefix.startsWith(prefix) ||
                prefix.startsWith(legacyPrefix),
              `${entry.id} ${prefix} overlaps legacy ${legacy.item} ${legacyPrefix}`,
            ).toBe(false);
          }
        }
      }
    }
  });

  test('no canonical event and no score: ledger names are absent from the canonical map, event schema and scoring plan', () => {
    const canonicalKeys = Object.keys(CANONICAL_EVENT_CONTEXT);
    const eventSchema = readFileSync(
      join(REPO, 'docs/research/event-schema.md'),
      'utf8',
    );
    const scoringPlan = readFileSync(
      join(REPO, 'docs/research/scoring-plan.md'),
      'utf8',
    );
    const scoringManager = readFileSync(
      join(REPO, 'src/systems/ScoringManager.ts'),
      'utf8',
    );

    for (const prefix of ledgerFamilyPrefixes()) {
      for (const key of canonicalKeys) {
        expect(key.startsWith(prefix), `${key} is canonical`).toBe(false);
      }

      expect(scoringManager.includes(prefix), prefix).toBe(false);
    }

    for (const id of ledgerOpportunityIds()) {
      expect(eventSchema.includes(id), `${id} in event-schema`).toBe(false);
      expect(scoringPlan.includes(id), `${id} in scoring-plan`).toBe(false);
    }

    // Raw components are raw: never a score, index, trait or cut score.
    for (const entry of EVIDENCE_LEDGER) {
      for (const variable of entry.candidate_raw_variables) {
        expect(variable).not.toMatch(
          /(^|_)score(_|$)|(^|_)index(_|$)|trait|cut_score/i,
        );
      }
    }
  });

  test('docs-side JSON ledger matches the workbook and the runtime module; wording lives only in docs', () => {
    const json = readLedgerJson();
    const md5 = createHash('md5').update(readFileSync(WORKBOOK)).digest('hex');

    expect(json.source.workbook_md5).toBe(md5);
    expect(LEDGER_WORKBOOK_MD5).toBe(md5);
    expect(json.source.sheet).toBe('09_M01_M26_FINAL');

    for (const sheet of [
      '08_EXEC_DECISION',
      '09_M01_M26_FINAL',
      '10_SCALE_MODEL',
      '11_EPISODE_ROUTE',
      '12_PAPER_EVIDENCE',
      '13_BUILD_GATES',
      '14_CHANGE_LOG',
    ]) {
      expect(json.source.sheets_present).toContain(sheet);
    }

    expect(json.classification_counts).toEqual({
      strong: 16,
      conditional: 7,
      questionnaire_primary: 3,
    });
    expect(json.item_owned_active_seconds).toBe(1040);
    expect(json.items.map((item) => item.id)).toEqual(EXPECTED_IDS);

    for (const [index, item] of json.items.entries()) {
      const runtime = EVIDENCE_LEDGER[index];
      const { exact_source_item, ...rest } = item;

      expect(exact_source_item.length).toBeGreaterThan(0);
      expect(rest).toEqual(runtime);
    }

    // The runtime module never carries the wording.
    const moduleText = readFileSync(
      join(REPO, 'src/pilot/evidenceLedger.ts'),
      'utf8',
    );

    for (const item of json.items) {
      expect(moduleText.includes(item.exact_source_item)).toBe(false);
    }
  });

  test('no exact source item wording appears in any src/ code or string literal (comments are traceability)', () => {
    const json = readLedgerJson();
    const wordings = json.items.map((item) =>
      item.exact_source_item.toLowerCase().replace(/[’']/g, "'"),
    );
    const offenders: string[] = [];

    for (const file of listTsFiles(join(REPO, 'src'))) {
      // CLAUDE.md permits exact wording ONLY in comments/docs for internal
      // traceability; strip block and line comments so the scan covers
      // code, template strings and string literals (player-facing risk).
      const text = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
        .toLowerCase()
        .replace(/[’']/g, "'");

      for (const wording of wordings) {
        if (text.includes(wording)) {
          offenders.push(`${relative(REPO, file)}: ${wording}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
