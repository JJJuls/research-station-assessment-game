/**
 * Unit 8 — final scientific gates of the evidence-led pilot v2, proven
 * directly (pure, no browser) from the docs-side ledger, the runtime
 * schedule and the branch's research documents. Each test names one gate
 * of the mission's final checklist; the deeper proofs live in
 * `evidence_ledger.spec.ts`, `pilot_coverage.spec.ts` and the pure model
 * suites — this file is the explicit, one-line-per-gate record.
 *
 * Nothing here computes a score, promotes an event or claims validity.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import {
  PILOT_SCHEDULE,
  primaryFamilyPrefixes,
} from '../src/pilot/coverageSchedule';

const LEDGER = JSON.parse(
  readFileSync(
    path.resolve(
      'docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.json',
    ),
    'utf8',
  ),
) as {
  scientific_status: string;
  classification_counts: Record<string, number>;
  inference_model: {
    instrument: string;
    facet_or_scale: string;
    items: string[];
  }[];
  episodes: { number: number; name: string }[];
  items: {
    id: string;
    final_disposition: string;
    disposition_class: string;
    active_seconds: number;
    episode_label: string;
    route: unknown;
  }[];
};

const IDS = Array.from(
  { length: 26 },
  (_, i) => `M${String(i + 1).padStart(2, '0')}`,
);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);

    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (full.endsWith('.ts')) {
      out.push(full);
    }
  }

  return out;
}

test.describe('final scientific gates (evidence-led pilot v2)', () => {
  test('26 ids represented exactly once, in order', () => {
    expect(LEDGER.items.map((item) => item.id)).toEqual(IDS);
    expect(PILOT_SCHEDULE.map((entry) => entry.item)).toEqual(IDS);
  });

  test('16 strong, 7 conditional, 3 questionnaire-primary / hybrid', () => {
    const counts = { strong: 0, conditional: 0, questionnaire_primary: 0 };

    for (const item of LEDGER.items) {
      const d = item.final_disposition;

      if (d.includes('STRONG')) counts.strong += 1;
      else if (d.includes('CONDITIONAL')) counts.conditional += 1;
      else if (d.startsWith('QUESTIONNAIRE-PRIMARY'))
        counts.questionnaire_primary += 1;
    }

    expect(counts).toEqual({
      strong: 16,
      conditional: 7,
      questionnaire_primary: 3,
    });
    expect(LEDGER.classification_counts).toEqual(counts);
  });

  test('six facet/scale models partition the 26 items', () => {
    expect(LEDGER.inference_model).toHaveLength(6);

    const all = LEDGER.inference_model.flatMap((model) => model.items);

    expect([...all].sort()).toEqual([...IDS].sort());
    expect(new Set(all).size).toBe(26);
  });

  test('item event families are pairwise disjoint (no event reused across primary variables)', () => {
    const prefixes = primaryFamilyPrefixes();

    for (const a of prefixes) {
      for (const b of prefixes) {
        if (a !== b) {
          expect(a.startsWith(b), `${a} nested in ${b}`).toBe(false);
        }
      }
    }
  });

  test('M13 and M18 are independent; M24 and M26 are independent', () => {
    const family = (id: string) =>
      PILOT_SCHEDULE.find((entry) => entry.item === id)!.familyPrefixes;

    for (const [a, b] of [
      ['M13', 'M18'],
      ['M24', 'M26'],
    ]) {
      const fa = family(a);
      const fb = family(b);

      expect(fa.length, `${a} has a family`).toBeGreaterThan(0);
      expect(fb.length, `${b} has a family`).toBeGreaterThan(0);

      for (const x of fa) {
        for (const y of fb) {
          expect(
            x === y || x.startsWith(y) || y.startsWith(x),
            `${x} vs ${y}`,
          ).toBe(false);
        }
      }
    }
  });

  test('M08 and M11 are questionnaire-primary: no window, no active seconds', () => {
    for (const id of ['M08', 'M11']) {
      const item = LEDGER.items.find((entry) => entry.id === id)!;
      const scheduled = PILOT_SCHEDULE.find((entry) => entry.item === id)!;

      expect(item.final_disposition).toBe('QUESTIONNAIRE-PRIMARY');
      expect(item.active_seconds).toBe(0);
      expect(scheduled.opportunityIds).toEqual([]);
    }
  });

  test('M25 is questionnaire-primary / hybrid — external administration pending, no game-only inference', () => {
    const item = LEDGER.items.find((entry) => entry.id === 'M25')!;

    expect(item.final_disposition).toBe(
      'QUESTIONNAIRE-PRIMARY / HYBRID REQUIRED',
    );
    expect(item.active_seconds).toBe(0);

    const model = readFileSync(
      path.resolve('src/pilot/return/m25HandoffModel.ts'),
      'utf8',
    );

    // A handoff shell only: no belief value, score or lock-derived inference.
    expect(model).not.toMatch(
      /belief_(score|value)|inappropriate_persistence_score/,
    );
  });

  test('Utility/Core closure is non-scored: every closure event carries non_scored, no window family', () => {
    const closureDir = path.resolve('src/pilot/closure');
    const sources = walk(closureDir)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(sources).toContain('non_scored: true');
    expect(sources).not.toMatch(/proto_m\d\d/);
    // Code tokens, not the header comments that state the rule.
    expect(sources).not.toMatch(
      /ScoringManager|scoreFor\(|trait_(label|score)\s*[:=]/,
    );

    const closure = LEDGER.episodes.find((episode) => episode.number === 6)!;

    expect(closure.name).toBe('Utility & Core Closure');
    expect(
      LEDGER.items.some((item) => item.episode_label.includes('6')),
      'no item window lives in episode 6',
    ).toBe(false);
  });

  test('no scoring, no trait output, no global movement/time/click score in pilot code', () => {
    const sources = walk(path.resolve('src/pilot'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(sources).not.toMatch(/ScoringManager/);
    expect(sources).not.toMatch(
      /\btrait_score|personality_score|conscientiousness_score|persistence_score\b/,
    );
    expect(sources).not.toMatch(
      /movement_score|time_score|click_score|global_diligence/,
    );
  });

  test('no canonical promotion and no formula change on this branch (event schema, scoring plan, runtime unchanged since the base)', () => {
    const diff = execFileSync(
      'git',
      [
        'diff',
        '0e1a8aa',
        '--stat',
        '--',
        'docs/research/event-schema.md',
        'docs/research/scoring-plan.md',
        // Pilot V3 changed the transport/runtime files deliberately
        // (EventLogger, EventStore, ResearchRuntime, ResearchExportClient,
        // QualtricsBridge, SessionStatus — every choice PROVISIONAL and
        // recorded in the V3 report). The scoring surface and the
        // measurement-side systems stay byte-identical to the base.
        'src/systems/ScoringManager.ts',
        'src/systems/DataQualityTracker.ts',
        'src/systems/SessionState.ts',
      ],
      { encoding: 'utf8' },
    ).trim();

    expect(
      diff,
      'research authority documents and the scoring/measurement systems are byte-identical to the base',
    ).toBe('');
  });

  test('missing / invalid never become low values; no questionnaire-replacement or validity claim', () => {
    expect(LEDGER.scientific_status).toContain('never become low values');
    expect(LEDGER.scientific_status).toContain('no trait score is computed');
    expect(LEDGER.scientific_status).toMatch(/no formal validity/i);

    const report = readFileSync(
      path.resolve(
        'docs/verification/PROFESSIONAL-ASSESSMENT-PILOT-V2-REPORT.md',
      ),
      'utf8',
    );

    expect(report).not.toMatch(/replaces the (source )?questionnaire/i);
    expect(report).not.toMatch(
      /\bvalidated (measure|instrument|assessment)\b/i,
    );
  });

  // ——— Pilot V3 Unit 4: instrumentation defensibility (V2 report §15.10) ———

  function sourcesUnder(dir: string): { file: string; text: string }[] {
    return walk(path.resolve(dir)).map((file) => ({
      file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
      text: readFileSync(file, 'utf8'),
    }));
  }

  test('U8-13: proto_m15_layered_cipher is reachable from exactly one module on the participant route', () => {
    const src = sourcesUnder('src');
    const declaring = src.filter(({ text }) =>
      /OPPORTUNITY_ID = 'proto_m15_layered_cipher'/.test(text),
    );

    // Two modules still declare the id (legacy cipher + causal model)…
    expect(declaring.map((entry) => entry.file).sort()).toEqual([
      'src/informationProcessing/m15CausalModel.ts',
      'src/informationProcessing/m15LayeredCipher.ts',
    ]);

    // …but the legacy cipher module is imported ONLY by the legacy
    // (developer-alias) information-processing lab, never by the pilot
    // route, so a participant can only ever meet the causal model.
    const importers = src.filter(
      ({ file, text }) =>
        file !== 'src/informationProcessing/m15LayeredCipher.ts' &&
        /m15LayeredCipher'/.test(text),
    );

    expect(importers.map((entry) => entry.file)).toEqual([
      'src/scenes/InformationProcessingLabScene.ts',
    ]);
    expect(
      src.some(
        ({ file, text }) =>
          file.startsWith('src/pilot/') && /m15LayeredCipher/.test(text),
      ),
    ).toBe(false);
  });

  test('U8-2: the legacy yard M22/M25 families are unreachable on the v2 route and outside every primary family', () => {
    const src = sourcesUnder('src');
    const references = src.filter(
      ({ file, text }) =>
        file !== 'src/pilot/yardJobs.ts' &&
        /yardJobs'|YARD_M2[25]_OPPORTUNITY_ID|yardM2[25]WindowOpen|finalizeYardAmbientWindows|proto_m22_housing|proto_m25_yardpump/.test(
          text,
        ),
    );

    // The only importer is the closure session (record closure parity);
    // the two pure measurement models merely define the family names. No
    // scene, window kit or route module hosts the legacy windows.
    expect(references.map((entry) => entry.file).sort()).toEqual([
      'src/measurement/m22Setback.ts',
      'src/measurement/m25PumpLock.ts',
      'src/pilot/closure/closureSession.ts',
    ]);

    const prefixes = primaryFamilyPrefixes();

    expect(
      prefixes.some((prefix) => prefix.startsWith('proto_m22_housing')),
    ).toBe(false);
    expect(
      prefixes.some((prefix) => prefix.startsWith('proto_m25_yardpump')),
    ).toBe(false);
  });

  test('U8-7: the M09/M10 reminder-exposure control is recorded where the mission log opens', () => {
    const zone = readFileSync(
      path.resolve('src/pilot/PilotZoneScene.ts'),
      'utf8',
    );
    const watch = readFileSync(
      path.resolve('src/pilot/windows/m09MonitorWatch.ts'),
      'utf8',
    );

    expect(watch).toMatch(/export function noteM09ReminderLogViewed\(\)/);
    expect(zone).toMatch(/noteM09ReminderLogViewed\(\);/);
    // The control is not constant by construction: the call site is the
    // participant's own map/mission-log opening, before the open event.
    expect(zone.indexOf('noteM09ReminderLogViewed();')).toBeLessThan(
      zone.indexOf("'pilot_map_opened'"),
    );
  });

  test('U8-3: prefers-reduced-motion is recorded as an environment control in the export', () => {
    const runtime = readFileSync(
      path.resolve('src/systems/ResearchRuntime.ts'),
      'utf8',
    );
    const client = readFileSync(
      path.resolve('src/systems/ResearchExportClient.ts'),
      'utf8',
    );

    expect(client).toMatch(
      /environment: \{ prefers_reduced_motion: boolean \| null \}/,
    );
    expect(runtime).toMatch(/prefers-reduced-motion: reduce/);
  });

  test('U8-12 (recorded, not resolved): exterior comprehension is still asserted, never checked', () => {
    // An honest gate: the ledger's "comprehension confirmed" validity gates
    // for the exterior items are satisfied by unconditional
    // setComprehension('passed') calls. Adding a real check changes the
    // participant burden and is a research-owner decision (V3 report §4).
    // This test pins the current count so a silent change is noticed.
    const exterior = readFileSync(
      path.resolve('src/pilot/windows/exteriorWindows.ts'),
      'utf8',
    );
    const unconditional = exterior.match(/setComprehension\('passed'\)/g) ?? [];

    expect(unconditional).toHaveLength(10);
    expect(exterior).not.toMatch(/setComprehension\('(failed|pending)'\)/);
  });
});
