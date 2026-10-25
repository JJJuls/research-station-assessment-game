/**
 * Station 080 M16 — the handling rule with two worked examples and six
 * immutable rule applications (Unit 19, administration `m16-handling-v1`),
 * pure tests.
 *
 * Playwright test blocks that never touch `page`:
 * - the INDEPENDENT ORACLE: this file carries its own transcription of the
 *   rule card (the grid and the four steps), the two worked examples and
 *   the six labels with their keys, written by hand from
 *   `U19-STIMULUS-PREVIEW.md` r3 §2–§5, and its own rule function — it
 *   imports nothing from `m16HandlingContent.ts` or `m16HandlingModel.ts`
 *   for the expected side. It derives every key and both worked results,
 *   checks the rule over all sixteen label patterns, the threshold margin,
 *   unseen-ness, rule-part coverage, the examples' identical structure and
 *   the §5.3 error table, and REPORTS (never asserts as a ceiling) the
 *   strategy table of preview §7; a cross-check then binds the module's
 *   text to the transcription;
 * - the register row and route, and the legacy module's separation;
 * - the series model under research-owner decision D-U19-1 with amendment
 *   A1: no correctness information before the sixth first response, first
 *   responses written once and never changed, the fresh-press rule, the
 *   settle on every view transition, the examples closed at the boundary,
 *   drafts that never count, the results controls;
 * - the read-only extractor on synthetic logs: values, companions,
 *   legitimate missingness, technical failure for contradictory or
 *   unverifiable scored evidence, determinism;
 * - the wording of the console.
 *
 * Nothing here establishes psychometric validity: the six applications are
 * repeated observations of one rule inside one console episode, not six
 * independent situations; the vials are not claimed to be equal in
 * difficulty; a correct answer never proves understanding.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  extractItemFeatures,
  extractMeasurementFeatures,
} from '../src/measurement/features';
import { REGISTER_V3, registerEntry } from '../src/measurement/registerV3';
import {
  classifyReload,
  reloadHoldBackClass,
} from '../src/measurement/reloadCheck';
import { PILOT_SCHEDULE } from '../src/pilot/coverageSchedule';
import {
  M16_ASSIGNED_VIAL_ORDER,
  M16_ENTRY_STATE_VERSION,
  M16_EXAMPLES,
  M16_EXAMPLES_VERSION,
  M16_FAMILY,
  M16_FORM_ID,
  M16_OPPORTUNITY_ID,
  M16_RULE_CARD_LINES,
  M16_RULE_VERSION,
  M16_SETTLE_MS,
  M16_TEXT,
  M16_VIALS,
  M16_WINDOW_ID,
  m16ErrorKind,
  m16IntroAndHelpStrings,
  m16LabelLine,
  m16ParticipantStrings,
  m16PreCompletionStrings,
  type M16VialId,
} from '../src/pilot/windows/m16HandlingContent';
import {
  createM16Series,
  M16_ACK_LINE_ID,
  M16_CONTRADICTORY_DETAIL,
  M16_EVENT_SUFFIXES,
  M16_RELOAD_DETAIL,
  M16_UNVERIFIED_DETAIL,
  m16AnsweredCount,
  m16EntrySnapshot,
  type M16LogSink,
  m16PriorAdministration,
  m16PriorHoldBackCarried,
  m16PriorLoadCheck,
  m16RecordLine,
  m16sCancelCommit,
  m16sCloseAtReview,
  m16sCloseHelp,
  m16sCloseUnopenedAtReview,
  m16sConfirmCommit,
  m16sDraft,
  type M16Series,
  m16Settling,
  m16sFail,
  m16sFinish,
  m16sHelp,
  m16sHoldBack,
  m16sLeave,
  m16sNavigateExample,
  m16sNext,
  m16sOpen,
  m16sRequestCommit,
  m16sRequestTeachingClose,
  m16sResultsNavigate,
  m16sShowExample1,
} from '../src/pilot/windows/m16HandlingModel';
import {
  type M16SurfaceHost,
  m16SurfaceModel,
} from '../src/pilot/windows/m16SurfaceModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/* ------------------------------------------------------------------ *
 * 1. The transcription, by hand from the preview (r3 §2–§5). Nothing
 *    below is imported from the content module.
 * ------------------------------------------------------------------ */

type Site = 'ORLA' | 'VESK';
type Row = 'TOP' | 'BOTTOM';
type Marks = 'none' | 'STAR' | 'RING' | 'STAR, RING';
type Drawer = 1 | 2 | 3 | 4;

interface HandLabel {
  site: Site;
  depth: number;
  marks: Marks;
}

interface HandExample extends HandLabel {
  id: 'm16_e1' | 'm16_e2';
  lines: [string, string, string, string, string, string, string];
  result: Drawer;
}

interface HandVial extends HandLabel {
  id: M16VialId;
  key: Drawer;
  explanation: [string, string];
}

/** The 2 × 2 grid of preview §2. */
const GRID: Record<Row, Record<Site, Drawer>> = {
  TOP: { ORLA: 1, VESK: 2 },
  BOTTOM: { ORLA: 3, VESK: 4 },
};

/** The rule card (preview §3.2), nine fixed lines. */
const RULE_CARD = [
  'HANDLING RULE',
  '                ORLA column    VESK column',
  '   TOP row      DRAWER 1       DRAWER 2',
  '   BOTTOM row   DRAWER 3       DRAWER 4',
  "1  Column: the vial's site, ORLA or VESK.",
  '2  Row: depth under 40 m — TOP row. Depth 40 m or more — BOTTOM row.',
  '3  STAR mark: use the other row.',
  '4  RING mark: use the other column.',
  '   A vial with both marks: apply both.',
];

const EXAMPLES: [HandExample, HandExample] = [
  {
    id: 'm16_e1',
    site: 'ORLA',
    depth: 18,
    marks: 'STAR',
    lines: [
      'WORKED EXAMPLE 1 OF 2',
      'Label: site ORLA · depth 18 m · marks: STAR',
      '1  Site ORLA — ORLA column.',
      '2  18 m is under 40 m — TOP row.',
      '3  STAR mark — other row: BOTTOM row.',
      '4  No RING mark — column stays ORLA.',
      'Result: BOTTOM row, ORLA column — DRAWER 3.',
    ],
    result: 3,
  },
  {
    id: 'm16_e2',
    site: 'VESK',
    depth: 63,
    marks: 'RING',
    lines: [
      'WORKED EXAMPLE 2 OF 2',
      'Label: site VESK · depth 63 m · marks: RING',
      '1  Site VESK — VESK column.',
      '2  63 m is 40 m or more — BOTTOM row.',
      '3  No STAR mark — row stays BOTTOM.',
      '4  RING mark — other column: ORLA column.',
      'Result: BOTTOM row, ORLA column — DRAWER 3.',
    ],
    result: 3,
  },
];

const VIALS: HandVial[] = [
  {
    id: 'm16_v1',
    site: 'ORLA',
    depth: 12,
    marks: 'none',
    key: 1,
    explanation: [
      'ORLA column; 12 m is under 40 m — TOP row.',
      'No marks. DRAWER 1.',
    ],
  },
  {
    id: 'm16_v2',
    site: 'VESK',
    depth: 34,
    marks: 'STAR, RING',
    key: 3,
    explanation: [
      'VESK column; 34 m is under 40 m — TOP row.',
      'STAR — other row: BOTTOM. RING — other column: ORLA. DRAWER 3.',
    ],
  },
  {
    id: 'm16_v3',
    site: 'ORLA',
    depth: 46,
    marks: 'RING',
    key: 4,
    explanation: [
      'ORLA column; 46 m is 40 m or more — BOTTOM row.',
      'RING — other column: VESK. DRAWER 4.',
    ],
  },
  {
    id: 'm16_v4',
    site: 'VESK',
    depth: 71,
    marks: 'STAR, RING',
    key: 1,
    explanation: [
      'VESK column; 71 m is 40 m or more — BOTTOM row.',
      'STAR — other row: TOP. RING — other column: ORLA. DRAWER 1.',
    ],
  },
  {
    id: 'm16_v5',
    site: 'VESK',
    depth: 27,
    marks: 'STAR',
    key: 4,
    explanation: [
      'VESK column; 27 m is under 40 m — TOP row.',
      'STAR — other row: BOTTOM. DRAWER 4.',
    ],
  },
  {
    id: 'm16_v6',
    site: 'ORLA',
    depth: 58,
    marks: 'STAR, RING',
    key: 2,
    explanation: [
      'ORLA column; 58 m is 40 m or more — BOTTOM row.',
      'STAR — other row: TOP. RING — other column: VESK. DRAWER 2.',
    ],
  },
];

/** The §5.3 table: what each drawer represents per vial. */
type Cell = 'key' | 'row' | 'column' | 'row_and_column';
const ERROR_TABLE: Record<M16VialId, [Cell, Cell, Cell, Cell]> = {
  m16_v1: ['key', 'column', 'row', 'row_and_column'],
  m16_v2: ['row', 'row_and_column', 'key', 'column'],
  m16_v3: ['row_and_column', 'row', 'column', 'key'],
  m16_v4: ['key', 'column', 'row', 'row_and_column'],
  m16_v5: ['row_and_column', 'row', 'column', 'key'],
  m16_v6: ['column', 'key', 'row_and_column', 'row'],
};

const hasStar = (marks: Marks) => marks === 'STAR' || marks === 'STAR, RING';
const hasRing = (marks: Marks) => marks === 'RING' || marks === 'STAR, RING';
const otherRow = (row: Row): Row => (row === 'TOP' ? 'BOTTOM' : 'TOP');
const otherSite = (site: Site): Site => (site === 'ORLA' ? 'VESK' : 'ORLA');
const depthRow = (depth: number): Row => (depth < 40 ? 'TOP' : 'BOTTOM');

/** The rule of preview §2, applied literally: steps 1–4; both marks → apply both. */
function rule(label: HandLabel): Drawer {
  let column: Site = label.site;
  let row: Row = depthRow(label.depth);

  if (hasStar(label.marks)) {
    row = otherRow(row);
  }

  if (hasRing(label.marks)) {
    column = otherSite(column);
  }

  return GRID[row][column];
}

const rowOf = (drawer: Drawer): Row => (drawer <= 2 ? 'TOP' : 'BOTTOM');
const columnOf = (drawer: Drawer): Site => (drawer % 2 === 1 ? 'ORLA' : 'VESK');
const SITES: Site[] = ['ORLA', 'VESK'];
const MARK_STATES: Marks[] = ['none', 'STAR', 'RING', 'STAR, RING'];
const pattern = (label: HandLabel) =>
  `${label.site}/${depthRow(label.depth)}/${label.marks}`;

/* ------------------------------------------------------------------ *
 * 2. The strategy table of preview §7 — hypotheses about misreadings,
 *    computed for disclosure, never a ceiling. Each strategy returns a
 *    drawer or `null` for a blind guess (expected 0.25) or a set of tied
 *    drawers (uniform among them).
 * ------------------------------------------------------------------ */

type Strategy = (label: HandLabel) => Drawer | Drawer[] | null;

function withSteps(
  label: HandLabel,
  options: {
    column?: (site: Site) => Site;
    row?: (depth: number) => Row;
    star?: (row: Row, column: Site) => [Row, Site];
    ring?: (row: Row, column: Site) => [Row, Site];
  },
): Drawer {
  let column = (options.column ?? ((site) => site))(label.site);
  let row = (options.row ?? depthRow)(label.depth);

  if (hasStar(label.marks)) {
    [row, column] = (options.star ?? ((r, c) => [otherRow(r), c]))(row, column);
  }

  if (hasRing(label.marks)) {
    [row, column] = (options.ring ?? ((r, c) => [r, otherSite(c)]))(
      row,
      column,
    );
  }

  return GRID[row][column];
}

const STRATEGIES: { name: string; expected: number; apply: Strategy }[] = [
  { name: 'full rule', expected: 6, apply: (label) => rule(label) },
  {
    name: 'STAR and RING meanings swapped (STAR moves the column, RING the row)',
    expected: 4,
    apply: (label) =>
      withSteps(label, {
        star: (r, c) => [r, otherSite(c)],
        ring: (r, c) => [otherRow(r), c],
      }),
  },
  {
    // The same reading under its second name in preview §7 (listed twice
    // there; the table shares one row for both).
    name: 'STAR moves the column, RING the row',
    expected: 4,
    apply: (label) =>
      withSteps(label, {
        star: (r, c) => [r, otherSite(c)],
        ring: (r, c) => [otherRow(r), c],
      }),
  },
  {
    name: 'STAR read as an absolute "BOTTOM row"',
    expected: 4,
    apply: (label) => withSteps(label, { star: (_, c) => ['BOTTOM', c] }),
  },
  {
    name: 'STAR read as an absolute "TOP row"',
    expected: 4,
    apply: (label) => withSteps(label, { star: (_, c) => ['TOP', c] }),
  },
  {
    name: 'RING read as an absolute "VESK column"',
    expected: 4,
    apply: (label) => withSteps(label, { ring: (r) => [r, 'VESK'] }),
  },
  {
    name: 'RING read as an absolute "ORLA column"',
    expected: 4,
    apply: (label) => withSteps(label, { ring: (r) => [r, 'ORLA'] }),
  },
  {
    name: 'apply only one mark when a vial has both (STAR kept)',
    expected: 3,
    apply: (label) =>
      label.marks === 'STAR, RING'
        ? withSteps({ ...label, marks: 'STAR' }, {})
        : rule(label),
  },
  {
    name: 'apply only one mark when a vial has both (RING kept)',
    expected: 3,
    apply: (label) =>
      label.marks === 'STAR, RING'
        ? withSteps({ ...label, marks: 'RING' }, {})
        : rule(label),
  },
  {
    name: 'row always TOP (other steps right)',
    expected: 3,
    apply: (label) => withSteps(label, { row: () => 'TOP' }),
  },
  {
    name: 'row always BOTTOM (other steps right)',
    expected: 3,
    apply: (label) => withSteps(label, { row: () => 'BOTTOM' }),
  },
  {
    name: 'column always ORLA (other steps right)',
    expected: 3,
    apply: (label) => withSteps(label, { column: () => 'ORLA' }),
  },
  {
    name: 'column always VESK (other steps right)',
    expected: 3,
    apply: (label) => withSteps(label, { column: () => 'VESK' }),
  },
  {
    name: 'ignore STAR',
    expected: 2,
    apply: (label) => withSteps(label, { star: (r, c) => [r, c] }),
  },
  {
    name: 'ignore RING',
    expected: 2,
    apply: (label) => withSteps(label, { ring: (r, c) => [r, c] }),
  },
  {
    name: "any mark → BOTTOM row of the site's column",
    expected: 2,
    apply: (label) =>
      label.marks === 'none'
        ? GRID[depthRow(label.depth)][label.site]
        : GRID.BOTTOM[label.site],
  },
  { name: 'blind guess', expected: 1.5, apply: () => null },
  {
    name: 'ignore both marks',
    expected: 1,
    apply: (label) => GRID[depthRow(label.depth)][label.site],
  },
  {
    name: "copy the worked examples' result (DRAWER 3)",
    expected: 1,
    apply: () => 3,
  },
  {
    name: 'copy the example with the same site',
    expected: 1,
    apply: (label) => EXAMPLES.find((e) => e.site === label.site)!.result,
  },
  {
    name: 'copy the example with the same single mark (else guess)',
    expected: 1,
    apply: (label) =>
      EXAMPLES.find((e) => e.marks === label.marks)?.result ?? null,
  },
  {
    name: 'marks count as the drawer (none → 1, one → 2 or 3, two → 4)',
    expected: 1,
    apply: (label) =>
      label.marks === 'none' ? 1 : label.marks === 'STAR, RING' ? 4 : [2, 3],
  },
  {
    name: 'depth rule reversed',
    expected: 0,
    apply: (label) =>
      withSteps(label, { row: (depth) => otherRow(depthRow(depth)) }),
  },
  {
    name: 'site columns reversed',
    expected: 0,
    apply: (label) => withSteps(label, { column: otherSite }),
  },
];

function expectedKeys(apply: Strategy): number {
  return VIALS.reduce((sum, vial) => {
    const answer = apply(vial);

    if (answer === null) {
      return sum + 0.25;
    }

    if (Array.isArray(answer)) {
      return sum + (answer.includes(vial.key) ? 1 / answer.length : 0);
    }

    return sum + (answer === vial.key ? 1 : 0);
  }, 0);
}

/* ------------------------------------------------------------------ *
 * 3. The oracle
 * ------------------------------------------------------------------ */

test.describe('M16 oracle — keys derived independently of the implementation', () => {
  test('(i) the rule function gives the transcribed key for every vial and DRAWER 3 for both worked examples; the content module agrees', () => {
    for (const vial of VIALS) {
      expect(rule(vial), vial.id).toBe(vial.key);

      const module = M16_VIALS.find((entry) => entry.id === vial.id)!;

      expect(module.key_drawer, vial.id).toBe(vial.key);
      expect(module.key_option_id, vial.id).toBe(`${vial.id}_d${vial.key}`);
    }

    for (const example of EXAMPLES) {
      expect(rule(example), example.id).toBe(3);
      expect(example.result).toBe(3);

      const module = M16_EXAMPLES.find((entry) => entry.id === example.id)!;

      expect(module.result_drawer, example.id).toBe(3);
      expect(module.lines[6]).toContain('DRAWER 3.');
    }

    expect(VIALS.map((vial) => vial.key)).toEqual([1, 3, 4, 1, 4, 2]);
  });

  test('(ii) over all sixteen label patterns the rule is a function with one drawer each; every content depth is at least 6 m from the 40 m threshold', () => {
    const seen = new Set<string>();

    for (const site of SITES) {
      for (const depth of [20, 60]) {
        for (const marks of MARK_STATES) {
          const label = { site, depth, marks };
          const drawer = rule(label);

          expect([1, 2, 3, 4]).toContain(drawer);
          // Deterministic: the same pattern always gives the same drawer,
          // whatever representative depth is used in the class.
          expect(rule({ ...label, depth: depth + 15 })).toBe(drawer);
          seen.add(pattern(label));
        }
      }
    }

    expect(seen.size).toBe(16);

    for (const label of [...VIALS, ...EXAMPLES]) {
      expect(Math.abs(label.depth - 40), label.id).toBeGreaterThanOrEqual(6);
    }

    for (const entry of [...M16_VIALS, ...M16_EXAMPLES]) {
      expect(
        Math.abs(entry.label.depth_m - 40),
        entry.id,
      ).toBeGreaterThanOrEqual(6);
    }
  });

  test('(iii) unseen: no vial shares a (site, depth class, marks) pattern with a worked example or with another vial, and no vial repeats an example depth', () => {
    const examplePatterns = EXAMPLES.map(pattern);
    const vialPatterns = VIALS.map(pattern);

    expect(examplePatterns).toEqual(['ORLA/TOP/STAR', 'VESK/BOTTOM/RING']);
    expect(new Set(vialPatterns).size).toBe(6);

    for (const vial of VIALS) {
      expect(examplePatterns, vial.id).not.toContain(pattern(vial));
      expect(
        EXAMPLES.map((e) => e.depth),
        vial.id,
      ).not.toContain(vial.depth);
    }
  });

  test('(iv) every rule part — both sites, both depth classes, no mark, STAR only, RING only, both marks — is required by at least one vial', () => {
    expect(VIALS.filter((v) => v.site === 'ORLA')).toHaveLength(3);
    expect(VIALS.filter((v) => v.site === 'VESK')).toHaveLength(3);
    expect(VIALS.filter((v) => depthRow(v.depth) === 'TOP')).toHaveLength(3);
    expect(VIALS.filter((v) => depthRow(v.depth) === 'BOTTOM')).toHaveLength(3);
    expect(VIALS.filter((v) => v.marks === 'none').map((v) => v.id)).toEqual([
      'm16_v1',
    ]);
    expect(VIALS.filter((v) => v.marks === 'STAR').map((v) => v.id)).toEqual([
      'm16_v5',
    ]);
    expect(VIALS.filter((v) => v.marks === 'RING').map((v) => v.id)).toEqual([
      'm16_v3',
    ]);
    expect(
      VIALS.filter((v) => v.marks === 'STAR, RING').map((v) => v.id),
    ).toEqual(['m16_v2', 'm16_v4', 'm16_v6']);
    // Keys balanced 3 / 3 by row and by column; no consecutive repeat.
    expect(VIALS.filter((v) => rowOf(v.key) === 'TOP')).toHaveLength(3);
    expect(VIALS.filter((v) => columnOf(v.key) === 'ORLA')).toHaveLength(3);

    for (let index = 1; index < VIALS.length; index += 1) {
      expect(VIALS[index].key).not.toBe(VIALS[index - 1].key);
    }
  });

  test('(v) both worked examples have the identical seven-line structure with exactly one mark present, and each step line follows the rule', () => {
    for (const example of EXAMPLES) {
      expect(example.lines).toHaveLength(7);
      expect(example.lines[0]).toBe(
        `WORKED EXAMPLE ${example.id.slice(-1)} OF 2`,
      );
      expect(example.lines[1]).toBe(
        `Label: site ${example.site} · depth ${example.depth} m · marks: ${example.marks}`,
      );
      expect(example.lines[2]).toMatch(/^1 {2}Site (ORLA|VESK) — \1 column\.$/);
      expect(example.lines[3]).toMatch(
        /^2 {2}\d+ m is (under 40 m — TOP|40 m or more — BOTTOM) row\.$/,
      );
      expect(example.lines[4]).toMatch(/^3 {2}(STAR mark|No STAR mark)/);
      expect(example.lines[5]).toMatch(/^4 {2}(RING mark|No RING mark)/);
      expect(example.lines[6]).toMatch(
        /^Result: (TOP|BOTTOM) row, (ORLA|VESK) column — DRAWER [1-4]\.$/,
      );
      expect(['STAR', 'RING']).toContain(example.marks);

      // The step lines agree with the rule's intermediate states: the
      // column from the site, the row from the depth, the STAR step naming
      // the row it leaves or keeps, the RING step naming the column it
      // leaves or keeps.
      const baseRow = depthRow(example.depth);
      const finalRow = hasStar(example.marks) ? otherRow(baseRow) : baseRow;
      const finalColumn = hasRing(example.marks)
        ? otherSite(example.site)
        : example.site;

      expect(example.lines[2]).toBe(
        `1  Site ${example.site} — ${example.site} column.`,
      );
      expect(example.lines[3]).toBe(
        `2  ${example.depth} m is ${baseRow === 'TOP' ? 'under 40 m' : '40 m or more'} — ${baseRow} row.`,
      );
      expect(example.lines[4]).toBe(
        hasStar(example.marks)
          ? `3  STAR mark — other row: ${finalRow} row.`
          : `3  No STAR mark — row stays ${baseRow}.`,
      );
      expect(example.lines[5]).toBe(
        hasRing(example.marks)
          ? `4  RING mark — other column: ${finalColumn} column.`
          : `4  No RING mark — column stays ${example.site}.`,
      );
      expect(example.lines[6]).toBe(
        `Result: ${finalRow} row, ${finalColumn} column — DRAWER ${GRID[finalRow][finalColumn]}.`,
      );
    }

    // Together: both sites, both depth classes, each mark present and absent.
    expect(EXAMPLES.map((e) => e.site).sort()).toEqual(['ORLA', 'VESK']);
    expect(EXAMPLES.map((e) => depthRow(e.depth)).sort()).toEqual([
      'BOTTOM',
      'TOP',
    ]);
  });

  test('(vi) the error_kind of every wrong option equals the preview §5.3 table', () => {
    for (const vial of VIALS) {
      for (const drawer of [1, 2, 3, 4] as Drawer[]) {
        const cell = ERROR_TABLE[vial.id][drawer - 1];
        const expected =
          cell === 'key'
            ? null
            : rowOf(drawer) !== rowOf(vial.key) &&
                columnOf(drawer) !== columnOf(vial.key)
              ? 'row_and_column'
              : rowOf(drawer) !== rowOf(vial.key)
                ? 'row'
                : 'column';

        // The transcribed table is consistent with the grid …
        expect(
          cell === 'key' ? null : cell,
          `${vial.id} drawer ${drawer}`,
        ).toBe(expected);
        // … and the content module recomputes the same kind.
        expect(
          m16ErrorKind(vial.id, `${vial.id}_d${drawer}`),
          `${vial.id} drawer ${drawer}`,
        ).toBe(expected);
      }

      expect(m16ErrorKind(vial.id, null)).toBeNull();
      expect(m16ErrorKind(vial.id, 'm16_v1_d9')).toBeNull();
    }
  });

  test('(vii) the strategy table of preview §7 is computed and REPORTED (reproduced, never a ceiling)', () => {
    const rows = STRATEGIES.map((strategy) => ({
      strategy: strategy.name,
      expected_keys: Number(expectedKeys(strategy.apply).toFixed(2)),
      preview_figure: strategy.expected,
    }));

    // eslint-disable-next-line no-console
    console.log(
      `[M16 §7 strategies — hypotheses about misreadings, reported for disclosure]\n${rows
        .map((row) => `  ${row.expected_keys} of 6  ${row.strategy}`)
        .join('\n')}`,
    );

    for (const row of rows) {
      expect(row.expected_keys, row.strategy).toBe(row.preview_figure);
    }

    // The disclosed v1 cue: 16 of the 23 listed non-guess strategies — every
    // one that handles steps 1–2 as the rule does — answer v1 correctly.
    const v1 = VIALS[0];
    const nonGuess = STRATEGIES.filter((s) => s.name !== 'blind guess');
    const right = nonGuess.filter((s) => s.apply(v1) === v1.key).length;

    expect(nonGuess).toHaveLength(23);
    expect(right).toBe(16);
    // Feature-to-key associations (preview §7), reported.
    // eslint-disable-next-line no-console
    console.log(
      `[M16 §7 associations] STAR present → BOTTOM ${VIALS.filter((v) => hasStar(v.marks) && rowOf(v.key) === 'BOTTOM').length} of ${VIALS.filter((v) => hasStar(v.marks)).length}; RING present → VESK column ${VIALS.filter((v) => hasRing(v.marks) && columnOf(v.key) === 'VESK').length} of ${VIALS.filter((v) => hasRing(v.marks)).length}; key = the examples' result (3): ${VIALS.filter((v) => v.key === 3).length} of 6`,
    );
  });
});

/* ------------------------------------------------------------------ *
 * 4. The content cross-check: the module's text IS the transcription
 * ------------------------------------------------------------------ */

test.describe('M16 content cross-check', () => {
  test('the rule card, both worked examples, every label, option, confirmation, acknowledgement, help line, results line and closed-record line occur exactly as transcribed', () => {
    expect([...M16_RULE_CARD_LINES]).toEqual(RULE_CARD);
    expect(M16_EXAMPLES.map((e) => [...e.lines])).toEqual(
      EXAMPLES.map((e) => [...e.lines]),
    );
    expect(M16_EXAMPLES.map((e) => e.id)).toEqual(['m16_e1', 'm16_e2']);

    for (const vial of VIALS) {
      const module = M16_VIALS.find((entry) => entry.id === vial.id)!;

      expect(m16LabelLine(module.label)).toBe(
        `Label: site ${vial.site} · depth ${vial.depth} m · marks: ${vial.marks}`,
      );
      expect(module.options.map((o) => o.label)).toEqual([
        'DRAWER 1  [1]',
        'DRAWER 2  [2]',
        'DRAWER 3  [3]',
        'DRAWER 4  [4]',
      ]);
      expect(module.options.map((o) => o.id)).toEqual(
        [1, 2, 3, 4].map((d) => `${vial.id}_d${d}`),
      );
      expect([...module.explanation]).toEqual(vial.explanation);
    }

    expect([...M16_ASSIGNED_VIAL_ORDER]).toEqual(VIALS.map((v) => v.id));

    const T = M16_TEXT;

    expect(T.title).toBe('HANDLING RULE');
    expect([...T.intro]).toEqual([
      'A handling rule came in with the storm sample vials.',
      'First: the rule and two worked examples. Read them at your own pace.',
      'Then: six vials you have not seen, one at a time. For each, choose its drawer.',
      'The rule stays on screen while you choose.',
      'The worked examples close when the six vials start.',
      'Each recorded answer is final.',
      'Results come after all six vials.',
    ]);
    expect(T.show_example_1).toBe('SHOW EXAMPLE 1');
    expect(T.subtitle_example(2)).toBe('Worked example 2 of 2');
    expect(T.status_teaching).toBe(
      'Worked examples: read them at your own pace.',
    );
    expect(T.teaching_note).toBe(
      'Read how the rule places this vial. No answer is requested on this page.',
    );
    expect(T.next_example).toBe('NEXT EXAMPLE');
    expect(T.back_to_example_1).toBe('BACK TO EXAMPLE 1');
    expect(T.start_vials).toBe('START THE SIX VIALS');
    expect(T.confirm_start).toBe(
      'Start the six vials?\nThe worked examples close and cannot be opened again.\nThe handling rule stays on screen.',
    );
    expect(T.confirm_start_control).toBe('START  [ENTER]');
    expect(T.keep_reading).toBe('KEEP READING  [ESC]');
    expect(T.subtitle_vial(4)).toBe('Vial 4 of 6');
    expect(T.status_vial).toBe(
      'Use the handling rule. Choose a drawer, then record it.',
    );
    expect(T.vial_heading(4)).toBe('VIAL 4 OF 6');
    expect(T.question(4)).toBe(
      'Which drawer does vial 4 go in? Choose a drawer, then record it.',
    );
    expect(T.record_drawer).toBe('RECORD DRAWER  [R]');
    expect(T.dont_know).toBe("DON'T KNOW  [N]");
    expect(T.choose_drawer_first).toBe('Choose a drawer first.');
    expect(T.confirm_drawer(3, 2)).toBe(
      'Record DRAWER 3 for vial 2?\nIt cannot be changed afterwards.',
    );
    expect(T.confirm_dont_know(2)).toBe(
      "Record DON'T KNOW for vial 2?\nIt cannot be changed afterwards.",
    );
    expect(T.confirm_drawer_control).toBe('RECORD DRAWER  [ENTER]');
    expect(T.confirm_record_control).toBe('RECORD  [ENTER]');
    expect(T.keep_working).toBe('KEEP WORKING  [ESC]');
    expect(T.acknowledgement(3)).toBe('Vial 3 recorded.');
    expect(T.status_recorded(3)).toBe('3 of 6 vials recorded.');
    expect(T.next_vial).toBe('NEXT VIAL');
    expect(T.show_results).toBe('SHOW RESULTS');
    expect(T.help).toBe('HELP  [H]');
    expect(T.leave).toBe('LEAVE CONSOLE');
    expect(T.help_title).toBe('HOW THE CONSOLE WORKS');
    expect([...T.help_lines]).toEqual([
      'The handling rule stays on the left while you work.',
      'Worked examples: NEXT EXAMPLE and BACK TO EXAMPLE 1 move between them; no answer is requested there.',
      'START THE SIX VIALS closes the worked examples; they cannot be opened again.',
      "Each vial: choose a drawer (1-4), then RECORD DRAWER and confirm, or DON'T KNOW and confirm.",
      'Only confirming records your answer. A recorded answer cannot be changed.',
      'Results come after all six vials; FINISH or ESC closes them.',
      // The closeout ruling 3 of 12 October 2026 (register §5.314): one
      // separate line immediately before the approved "Keys:" line.
      'TAB moves focus. ENTER selects the focused control.',
      "Keys: 1-4 choose · R record · N don't know · H help · ESC leaves (work kept).",
    ]);
    expect(T.close_help).toBe('CLOSE HELP  [H]');
    expect(T.results_title(1)).toBe('RESULTS — VIALS 1-3 OF 6');
    expect(T.results_title(2)).toBe('RESULTS — VIALS 4-6 OF 6');
    expect(T.results_status).toBe(
      'Your answers are fixed. This view only shows them.',
    );
    expect(T.results_first_line).toBe('All six vials are recorded.');
    expect(T.results_vial_line(1, M16_VIALS[0].label)).toBe(
      'VIAL 1 — site ORLA · depth 12 m · marks: none',
    );
    expect(T.results_recorded_line('DRAWER 2', 1)).toBe(
      "Your recorded drawer: DRAWER 2 · Rule's drawer: DRAWER 1",
    );
    expect(T.results_recorded_line("DON'T KNOW", 4)).toBe(
      "Your recorded drawer: DON'T KNOW · Rule's drawer: DRAWER 4",
    );
    expect(T.next).toBe('NEXT');
    expect(T.back).toBe('BACK');
    expect(T.finish).toBe('FINISH');
    expect(T.closed_at_review).toBe(
      'Station record closed — the console keeps its record.',
    );
    expect(T.held_back).toBe(
      'This console was already used in this session. Its record is kept; no further answers can be given here.',
    );
    expect(T.footer_vial).toBe(
      "1-4 choose · R record · N don't know · H help · ESC leaves (work kept)",
    );
    // The card and example footer of the closeout ruling 3 (12 October
    // 2026); the results footer stays the preview's; the five contextual
    // strings accepted by ruling 1 are unchanged.
    expect(T.footer_card).toBe(
      'TAB moves focus · ENTER selects · H help · ESC leaves (work kept)',
    );
    expect(T.footer_results).toBe('H help · ESC leaves (work kept)');
    expect(T.footer_start_dialog).toBe('ENTER starts · ESC keeps reading');
    expect(T.footer_dialog).toBe('ENTER records · ESC keeps working');
    expect(T.footer_help).toBe('H or ESC closes the help');
    expect(T.footer_record).toBe('ESC leaves');
    expect(T.fault).toBe(
      'The console has a fault and is closed. Recorded answers are kept.',
    );
    // The versions and ids of the approved administration.
    expect(M16_ENTRY_STATE_VERSION).toBe('m16-handling-v1');
    expect(M16_FORM_ID).toBe('m16-form-1');
    expect(M16_RULE_VERSION).toBe('m16-rule-v1');
    expect(M16_EXAMPLES_VERSION).toBe('m16-examples-v1');
    expect(M16_SETTLE_MS).toBe(400);
  });

  test('the first-opening card and the help sheet name no vial and no correctness word', () => {
    for (const line of m16IntroAndHelpStrings()) {
      expect(line).not.toMatch(/\bvial [1-6]\b/i);
      expect(line).not.toMatch(/ORLA|VESK|\d+ m\b/);
      expect(line).not.toMatch(CORRECTNESS);
    }
  });

  test('by source, each of the four lab_brief_ack* handlers of the laboratory scene calls presentM16 and still calls presentM15', () => {
    const source = readFileSync(
      'src/scenes/DiagnosticsLaboratoryScene.ts',
      'utf8',
    );
    const handlers = [
      ...source.matchAll(
        /tag: '(lab_brief_ack(?:_loan_accept|_loan_decline)?)',\s*onSelected: \(\) => \{([\s\S]*?)\n {14}\},/g,
      ),
    ];

    expect(handlers.map((match) => match[1])).toEqual([
      'lab_brief_ack',
      'lab_brief_ack',
      'lab_brief_ack_loan_accept',
      'lab_brief_ack_loan_decline',
    ]);

    for (const match of handlers) {
      expect(match[2], match[1]).toContain('presentM16(');
      expect(match[2], match[1]).toContain('presentM15(');
      expect(match[2], match[1]).toContain("advancePilotStage('lab_work'");
    }
  });
});

/* ------------------------------------------------------------------ *
 * 5. The register row, the route and the legacy module
 * ------------------------------------------------------------------ */

/** SHA-256 of the legacy files at the base (line endings normalised to LF). */
const LEGACY_SHA256: Record<string, string> = {
  'src/informationProcessing/m16ProtocolUpdate.ts':
    'ec06d553fbfc4740e8c4bb69f15c15360e641f99073cf475f2a8bb66c7f19aee',
  'src/informationProcessing/protocolForms.ts':
    'f9e8327fab44a764dca55600158d3f079dc657633699adb39786765a86434556',
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : path.endsWith('.ts')
        ? [path.replace(/\\/g, '/')]
        : [];
  });
}

test.describe('M16 register row, route and the legacy module', () => {
  test('M16 is on an explicit v3 route, implemented, with the series opportunity, one window, one family and no secondary id', () => {
    const entry = registerEntry('M16');

    expect(entry.implementation_status).toBe('implemented');
    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([M16_OPPORTUNITY_ID]);
    expect(entry.route.windows).toEqual([
      {
        id: 'm16_handling_w1',
        occasion: null,
        zone: 'diagnostics_laboratory',
        episode: 3,
      },
    ]);
    expect(entry.route.family_prefixes).toEqual([M16_FAMILY]);
    expect(entry.route.secondary_ids).toEqual([]);
    expect(entry.independence.kind).toBe('single_episode');
    expect(M16_WINDOW_ID).toBe('m16_handling_w1');
    expect(M16_OPPORTUNITY_ID).toBe('proto_m16_handling_series');
    expect(M16_FAMILY).toBe('proto_m16_handling_');
  });

  test('the feature row is unchanged', () => {
    const entry = registerEntry('M16');

    expect(entry.features).toHaveLength(1);
    expect(entry.features[0]).toMatchObject({
      feature_id: 'm16_correct_first_applications',
      role: 'primary',
      planned_denominator: 6,
      denominator_kind: 'planned_observations',
      range: '0–6',
      numerator:
        "applications whose first committed response is correct (Don't know = incorrect)",
      denominator: 'six applications; interrupted applications are missing',
      higher_means: 'better transfer of the taught rule',
      missing_rule: 'no application answered → null',
    });
    expect(entry.coverage_label).toBe('performance_counterpart');
    expect(entry.direction).toBe('replace_structure');
    expect(entry.target.occasions).toBe(1);
    expect(entry.source).toEqual({
      instrument: 'BESSI',
      item: '118',
      reverse_keyed: false,
    });
  });

  test('the schedule mirrors the register; primary prefixes stay pairwise disjoint; the handling family is disjoint from the legacy protocol family', () => {
    const scheduled = PILOT_SCHEDULE.find((entry) => entry.item === 'M16')!;

    expect(scheduled.opportunityIds).toEqual([M16_OPPORTUNITY_ID]);
    expect(scheduled.familyPrefixes).toEqual([M16_FAMILY]);
    expect(scheduled.zone).toBe('diagnostics_laboratory');

    const prefixes = REGISTER_V3.flatMap(
      (entry) => entry.route.family_prefixes,
    );

    for (const a of prefixes) {
      for (const b of prefixes) {
        if (a !== b) {
          expect(a.startsWith(b), `${a} / ${b}`).toBe(false);
        }
      }
    }

    expect(M16_FAMILY.startsWith('proto_m16_protocol_')).toBe(false);
    expect('proto_m16_protocol_'.startsWith(M16_FAMILY)).toBe(false);
    expect(
      prefixes.some((prefix) => 'proto_m16_protocol_'.startsWith(prefix)),
      'the legacy family covered by a primary prefix',
    ).toBe(false);
    expect(
      REGISTER_V3.filter((entry) =>
        entry.route.family_prefixes.includes(M16_FAMILY),
      ).map((entry) => entry.id),
    ).toEqual(['M16']);
  });

  test('a log containing only legacy proto_m16_protocol_* events yields the M16 row of a log with no M16 evidence', () => {
    const context = {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    };
    const legacy: RawGameEvent[] = [
      'window_opened',
      'command_added',
      'first_application',
      'submitted',
      'completed',
    ].map((suffix, index) => ({
      session_id: 'GS',
      timestamp_ms: 1_000 + index,
      scene: 'information_processing_lab',
      event_type: `proto_m16_protocol_${suffix}`,
      object_id: 'ip_protocol_console',
      sequence: 10 + index,
      page_load_index: 1,
      metadata: {
        opportunity_id: 'proto_m16_protocol_update',
        window_id: 'm16_protocol_w1',
        measure_id: 'M16',
        entry_state_version: 'm16-protocol-v1',
      },
    }));
    const none = extractItemFeatures('M16', [], context);

    expect(extractItemFeatures('M16', legacy, context)).toEqual(none);
    expect(none[0]).toMatchObject({
      disposition: 'not_presented',
      value: null,
    });
  });

  test('the laboratory scene no longer imports the legacy module; the series opportunity is declared by exactly one adapter; the legacy files are byte-identical to the base', () => {
    const lab = readFileSync(
      'src/scenes/DiagnosticsLaboratoryScene.ts',
      'utf8',
    );

    expect(lab).not.toContain('m16ProtocolUpdate');
    expect(lab).toContain("from '../pilot/windows/m16ProtocolConsole'");
    expect(lab).toContain("surfaceId: 'm16_protocol_console'");

    // The literal opportunity id appears in the content module (its
    // definition), the register and the scene's phase table; exactly one
    // module constructs the window with it.
    const files = sourceFiles('src');
    const literal = files.filter((file) =>
      readFileSync(file, 'utf8').includes("'proto_m16_handling_series'"),
    );

    expect(literal.sort()).toEqual([
      'src/measurement/registerV3.ts',
      'src/pilot/windows/m16HandlingContent.ts',
      'src/scenes/DiagnosticsLaboratoryScene.ts',
    ]);

    const declaring = files.filter((file) => {
      const source = readFileSync(file, 'utf8');

      return (
        source.includes('new ItemWindow(') &&
        source.includes('opportunityId: M16_OPPORTUNITY_ID')
      );
    });

    expect(declaring).toEqual(['src/pilot/windows/m16ProtocolConsole.ts']);

    for (const [file, sha] of Object.entries(LEGACY_SHA256)) {
      const content = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

      expect(createHash('sha256').update(content).digest('hex'), file).toBe(
        sha,
      );
    }

    // The legacy module keeps its v2 identity on the developer alias.
    const legacy = readFileSync(
      'src/informationProcessing/m16ProtocolUpdate.ts',
      'utf8',
    );

    expect(legacy).toContain(
      "M16_OPPORTUNITY_ID = 'proto_m16_protocol_update'",
    );
    expect(legacy).toContain("M16_ENTRY_STATE_VERSION = 'm16-protocol-v1'");
    expect(legacy).not.toContain('proto_m16_handling');
    expect(
      readFileSync('src/scenes/InformationProcessingLabScene.ts', 'utf8'),
    ).toContain('m16ProtocolUpdate');
  });
});

/* ------------------------------------------------------------------ *
 * 6. The series model
 * ------------------------------------------------------------------ */

interface Run {
  s: M16Series;
  events: { suffix: string; metadata: Record<string, unknown> }[];
  sink: M16LogSink;
  now: number;
  tick: (ms: number) => number;
  /** Past the settle of the current view. */
  settle: () => number;
}

function run(): Run {
  const r: Run = {
    s: createM16Series(),
    events: [],
    sink: (suffix, metadata) => {
      r.events.push({ suffix, metadata });
    },
    now: 10_000,
    tick: (ms) => {
      r.now += ms;

      return r.now;
    },
    settle: () => r.tick(M16_SETTLE_MS + 50),
  };

  return r;
}

const suffixes = (r: Run) => r.events.map((event) => event.suffix);
const last = (r: Run, suffix: string) =>
  [...r.events].reverse().find((event) => event.suffix === suffix);
const count = (r: Run, suffix: string) =>
  r.events.filter((event) => event.suffix === suffix).length;

/** Opens the console (the first-opening card). */
function opened(): Run {
  const r = run();

  m16sOpen(r.s, r.now, r.sink);

  return r;
}

/** The card acknowledged: worked example 1 shown. */
function teaching(): Run {
  const r = opened();

  expect(m16sShowExample1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);

  return r;
}

/** Teaching closed through the boundary confirmation: vial 1 presented. */
function closeTeaching(r: Run, mode: 'pointer' | 'keyboard' = 'keyboard') {
  if (r.s.example === 0) {
    expect(m16sNavigateExample(r.s, 'next', mode, r.settle(), r.sink)).toBe(
      true,
    );
  }

  expect(m16sRequestTeachingClose(r.s, mode, r.settle(), r.sink)).toBe(true);
  expect(m16sConfirmCommit(r.s, mode, r.tick(M16_SETTLE_MS + 1), r.sink)).toBe(
    'teaching_closed',
  );
}

function measuring(): Run {
  const r = teaching();

  closeTeaching(r);

  return r;
}

type Choice = Drawer | 'dont_know';

/** Answers the current vial: a drawer or DON'T KNOW. */
function answer(
  r: Run,
  choice: Choice,
  mode: 'pointer' | 'keyboard' = 'keyboard',
) {
  const vial = M16_ASSIGNED_VIAL_ORDER[r.s.vial];

  if (choice === 'dont_know') {
    expect(m16sRequestCommit(r.s, 'dont_know', mode, r.settle(), r.sink)).toBe(
      'opened',
    );
  } else {
    expect(m16sDraft(r.s, `${vial}_d${choice}`, mode, r.settle(), r.sink)).toBe(
      true,
    );
    expect(m16sRequestCommit(r.s, 'option', mode, r.tick(100), r.sink)).toBe(
      'opened',
    );
  }

  expect(m16sConfirmCommit(r.s, mode, r.tick(M16_SETTLE_MS + 1), r.sink)).toBe(
    'recorded',
  );
}

/** NEXT VIAL / SHOW RESULTS after the acknowledgement has settled. */
function next(r: Run) {
  return m16sNext(r.s, 'keyboard', r.settle(), r.sink);
}

const KEYS: Choice[] = VIALS.map((v) => v.key);
const WRONG: Choice[] = VIALS.map(
  (v) => ([1, 2, 3, 4] as Drawer[]).find((d) => d !== v.key)!,
);

/** A whole series from the vials: the answers in order; SHOW RESULTS optionally. */
function completeSeries(
  r: Run,
  answers: Choice[],
  options: { showResults?: boolean } = {},
) {
  answers.forEach((choice, index) => {
    answer(r, choice);

    if (index < answers.length - 1) {
      expect(next(r)).toBe('vial_presented');
    }
  });

  if (options.showResults) {
    expect(next(r)).toBe('results_shown');
  }
}

/** Renders the surface model from a series with no-op commands. */
function render(s: M16Series) {
  const host: M16SurfaceHost = {
    now: () => 0,
    close: () => undefined,
    feedback: () => undefined,
    series: () => s,
    commands: {
      showExample1: () => false,
      navigateExample: () => false,
      requestTeachingClose: () => false,
      draft: () => false,
      request: () => 'none',
      cancel: () => false,
      confirm: () => 'none',
      finish: () => false,
      next: () => 'none',
      navigateResults: () => false,
      help: () => false,
      closeHelp: () => false,
    },
  };
  const model = m16SurfaceModel(host);
  const text = [
    model.title,
    model.subtitle ?? '',
    model.status ?? '',
    model.help ?? '',
    ...model.elements.map((element) => element.label),
  ].join('\n');

  return { model, text, ids: model.elements.map((element) => element.id) };
}

const CORRECTNESS = /\bcorrect|incorrect|\bright\b|\bwrong\b|rule's drawer/i;
const FORBIDDEN =
  /proto_|secondary_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|puzzle|persist|grit|skill|ability|intelligen|information|process|learn|quick|\bnew\b|\bROUTE\b|fragment|destination|ARCHIVE|RELAY|ALPHA|BETA|codebook|channel|program|buffer|SUBMIT/i;

test.describe('M16 series model — no correctness information before the sixth first response', () => {
  test("at the card, in teaching and after one to five answers (a key, a wrong drawer and DON'T KNOW) nothing on the surface says anything about correctness or offers results", () => {
    const check = (r: Run, label: string) => {
      const { text, ids } = render(r.s);

      expect(text, label).not.toMatch(CORRECTNESS);
      expect(text, label).not.toMatch(FORBIDDEN);
      expect(ids, label).not.toContain('results_text');
      expect(ids, label).not.toContain('results_next');
      expect(ids, label).not.toContain('results_back');
      expect(ids, label).not.toContain('finish');
    };

    check(opened(), 'card');

    const t = teaching();

    check(t, 'example 1');
    m16sNavigateExample(t.s, 'next', 'keyboard', t.settle(), t.sink);
    check(t, 'example 2');
    m16sRequestTeachingClose(t.s, 'keyboard', t.settle(), t.sink);
    check(t, 'boundary dialog');

    const plans: { answers: Choice[]; label: string }[] = [
      { answers: [KEYS[0]], label: 'one answer, the key' },
      { answers: [WRONG[0]], label: 'one answer, wrong' },
      { answers: ['dont_know'], label: "one answer, DON'T KNOW" },
      { answers: KEYS.slice(0, 3), label: 'three answers' },
      { answers: [...WRONG.slice(0, 4), 'dont_know'], label: 'five answers' },
    ];

    for (const plan of plans) {
      const r = measuring();

      check(r, `${plan.label}: vial 1 view`);
      m16sDraft(r.s, 'm16_v1_d2', 'keyboard', r.settle(), r.sink);
      check(r, `${plan.label}: vial 1 with a draft`);
      m16sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink);
      check(r, `${plan.label}: drawer dialog`);
      m16sCancelCommit(r.s, 'keyboard', r.tick(M16_SETTLE_MS + 1), r.sink);
      m16sDraft(r.s, 'm16_v1_d2', 'keyboard', r.settle(), r.sink); // clear
      completeSeries(r, plan.answers);
      check(r, `${plan.label}: acknowledgement`);
      m16sHelp(r.s, 'keyboard', r.settle(), r.sink);
      check(r, `${plan.label}: help`);
      m16sCloseHelp(r.s, r.settle());
      expect(r.s.status).toBe(
        plan.answers.length === 6 ? 'completed' : 'measurement',
      );
    }
  });

  test("the acknowledgement line, status and control are identical after the key, a wrong drawer and DON'T KNOW; no draft echo", () => {
    const seen = new Set<string>();

    for (const choice of [KEYS[0], WRONG[0], 'dont_know'] as Choice[]) {
      const r = measuring();

      answer(r, choice);

      const { model, text } = render(r.s);
      const ack = model.elements.find((e) => e.id === 'acknowledgement')!;
      const control = model.elements.find((e) => e.id === 'next')!;

      expect(ack.label).toBe('Vial 1 recorded.');
      expect(control.label).toBe('NEXT VIAL');
      expect(model.status).toBe('1 of 6 vials recorded.');
      expect(text).not.toMatch(/DRAWER [1-4] {2}\[|DON'T KNOW {2}\[/);
      expect(model.elements.map((e) => e.id)).toEqual([
        'next',
        'rule_card',
        'vial_block',
        'acknowledgement',
        'help',
        'leave',
      ]);
      seen.add(
        JSON.stringify(
          model.elements.map((e) => [
            e.id,
            e.label,
            e.x,
            e.y,
            e.w,
            e.h,
            e.state,
          ]),
        ) + model.status,
      );
      expect(last(r, 'response_acknowledged')!.metadata).toMatchObject({
        line_id: M16_ACK_LINE_ID,
        next_control: 'next_vial',
        answered_count: 1,
      });
    }

    expect(seen.size).toBe(1);
  });

  test('a results request is refused before the sixth answer and writes no results_shown; a review-closed partial series never exposes results', () => {
    const r = measuring();

    completeSeries(r, KEYS.slice(0, 5));
    expect(
      m16sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(m16sFinish(r.s, r.settle())).toBe(false);
    expect(next(r)).toBe('vial_presented');
    expect(count(r, 'results_shown')).toBe(0);
    expect(count(r, 'first_responses_completed')).toBe(0);
    m16sCloseAtReview(r.s, r.tick(10), r.sink);
    expect(m16sNext(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');
    expect(
      m16sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(count(r, 'results_shown')).toBe(0);

    const { text, ids } = render(r.s);

    expect(ids).toEqual(['record_text', 'leave']);
    expect(text).toContain(
      'Station record closed — the console keeps its record.',
    );
    expect(text).toContain('5 of 6 vials recorded.');
    expect(text).not.toMatch(CORRECTNESS);
    // Leaving and reopening the closed record: no answer, no event.
    m16sLeave(r.s, r.tick(10), r.sink);

    const before = r.events.length;

    expect(m16sOpen(r.s, r.tick(10), r.sink)).toBe('record');
    expect(m16sDraft(r.s, 'm16_v6_d1', 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(
      m16sRequestCommit(r.s, 'dont_know', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(m16sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    expect(r.events.length).toBe(before);
  });

  test('results follow only the sixth first response: page 1 → NEXT → page 2 → BACK → page 1; FINISH and ESC close from either page; results_shown once per displayed page; FINISH from page 1 leaves page 2 unrecorded; HELP / CLOSE HELP restore the page; reopening shows page 1 read-only', () => {
    const r = measuring();

    completeSeries(r, [
      KEYS[0],
      WRONG[1],
      'dont_know',
      KEYS[3],
      WRONG[4],
      KEYS[5],
    ]);
    expect(r.s.status).toBe('completed');
    expect(count(r, 'first_responses_completed')).toBe(1);
    expect(last(r, 'response_acknowledged')!.metadata.next_control).toBe(
      'show_results',
    );
    expect(render(r.s).model.elements.find((e) => e.id === 'next')!.label).toBe(
      'SHOW RESULTS',
    );
    expect(render(r.s).text).not.toMatch(CORRECTNESS);
    expect(count(r, 'results_shown')).toBe(0);

    // SHOW RESULTS: page 1, recorded once.
    expect(next(r)).toBe('results_shown');
    expect(count(r, 'results_shown')).toBe(1);
    expect(last(r, 'results_shown')!.metadata).toMatchObject({
      phase: 'feedback',
      page: 1,
      vial_ids: ['m16_v1', 'm16_v2', 'm16_v3'],
    });

    let view = render(r.s);

    expect(view.model.title).toBe('RESULTS — VIALS 1-3 OF 6');
    expect(view.model.status).toBe(
      'Your answers are fixed. This view only shows them.',
    );
    expect(view.ids).toEqual([
      'results_next',
      'finish',
      'help',
      'results_text',
    ]);
    expect(view.text).toContain('All six vials are recorded.');
    expect(view.text).toContain(
      'VIAL 1 — site ORLA · depth 12 m · marks: none',
    );
    expect(view.text).toContain(
      "Your recorded drawer: DRAWER 1 · Rule's drawer: DRAWER 1",
    );
    expect(view.text).toContain(
      `Your recorded drawer: DRAWER ${WRONG[1]} · Rule's drawer: DRAWER 3`,
    );
    expect(view.text).toContain(
      "Your recorded drawer: DON'T KNOW · Rule's drawer: DRAWER 4",
    );
    expect(view.text).toContain('No marks. DRAWER 1.');
    expect(view.text).not.toContain('VIAL 4 —');
    expect(view.text).not.toMatch(FORBIDDEN);
    // NEXT and BACK never share a position; HELP and FINISH where the preview puts them.
    const positions = (ids: string[], s: M16Series) =>
      Object.fromEntries(
        render(s)
          .model.elements.filter((e) => ids.includes(e.id))
          .map((e) => [e.id, [e.x, e.y, e.w]]),
      );

    expect(positions(['help', 'finish', 'results_next'], r.s)).toEqual({
      help: [12, 462, 160],
      finish: [184, 462, 180],
      results_next: [778, 462, 260],
    });

    // NEXT inside the settle: nothing; after it: page 2, recorded once.
    expect(
      m16sResultsNavigate(r.s, 'next', 'keyboard', r.tick(100), r.sink),
    ).toBe(false);
    expect(
      m16sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(count(r, 'results_shown')).toBe(2);
    expect(last(r, 'results_shown')!.metadata).toMatchObject({
      page: 2,
      vial_ids: ['m16_v4', 'm16_v5', 'm16_v6'],
    });
    view = render(r.s);
    expect(view.model.title).toBe('RESULTS — VIALS 4-6 OF 6');
    expect(view.ids).toEqual([
      'finish',
      'results_back',
      'help',
      'results_text',
    ]);
    expect(view.text).toContain(
      'VIAL 4 — site VESK · depth 71 m · marks: STAR, RING',
    );
    expect(positions(['help', 'finish', 'results_back'], r.s)).toEqual({
      help: [12, 462, 160],
      finish: [184, 462, 180],
      results_back: [654, 462, 112],
    });
    // FINISH inside the settle of page 2 is refused (a press carried from NEXT).
    expect(m16sFinish(r.s, r.tick(100))).toBe(false);
    // BACK → page 1 again: no new results_shown.
    expect(
      m16sResultsNavigate(r.s, 'back', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(count(r, 'results_shown')).toBe(2);
    expect(render(r.s).model.title).toBe('RESULTS — VIALS 1-3 OF 6');
    // HELP on a results page, CLOSE HELP restores the same page; no results_shown.
    expect(m16sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')!.metadata).toMatchObject({
      phase: 'feedback',
      view: 'results_1',
    });
    expect(render(r.s).ids).toEqual(['close_help', 'help_text']);
    expect(m16sCloseHelp(r.s, r.settle())).toBe(true);
    expect(render(r.s).model.title).toBe('RESULTS — VIALS 1-3 OF 6');
    expect(count(r, 'results_shown')).toBe(2);
    // FINISH after the settle may close; nothing recorded by it.
    expect(m16sFinish(r.s, r.tick(100))).toBe(false);
    expect(m16sFinish(r.s, r.settle())).toBe(true);

    const eventsBefore = r.events.length;

    m16sLeave(r.s, r.tick(10), r.sink);
    expect(suffixes(r).slice(eventsBefore)).toEqual(['panel_left']);
    // Reopen: page 1, read-only; no new results_shown; no act records.
    expect(m16sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(r.s.view).toBe('results');
    expect(r.s.results_page).toBe(1);
    expect(count(r, 'results_shown')).toBe(2);
    expect(m16sDraft(r.s, 'm16_v1_d2', 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(
      m16sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(m16sConfirmCommit(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');
    expect(count(r, 'first_response')).toBe(6);
    expect(r.s.closure_reason).toBe('completed');

    // FINISH from page 1 on a fresh completed series leaves page 2 unrecorded.
    const fresh = measuring();

    completeSeries(fresh, KEYS, { showResults: true });
    expect(count(fresh, 'results_shown')).toBe(1);
    expect(m16sFinish(fresh.s, fresh.settle())).toBe(true);
    m16sLeave(fresh.s, fresh.tick(10), fresh.sink);
    expect(count(fresh, 'results_shown')).toBe(1);
    expect(count(fresh, 'first_responses_completed')).toBe(1);
    expect(fresh.s.results_shown).toEqual({ 1: true, 2: false });

    // A completed series left from the acknowledgement: reopening shows
    // page 1 and records it then, once.
    const left = measuring();

    completeSeries(left, KEYS);
    m16sLeave(left.s, left.tick(10), left.sink);
    expect(count(left, 'results_shown')).toBe(0);
    expect(m16sOpen(left.s, left.tick(10), left.sink)).toBe('reopened');
    expect(count(left, 'results_shown')).toBe(1);
    expect(last(left, 'results_shown')!.metadata.page).toBe(1);
    m16sLeave(left.s, left.tick(10), left.sink);
    m16sOpen(left.s, left.tick(10), left.sink);
    expect(count(left, 'results_shown')).toBe(1);
  });
});

test.describe('U24 completion S3 — C-6 and C-7 for M16 (V-7 reproduced on 6bd81c7; the M18 precedents)', () => {
  test('C-7: the review closure of a console never opened — the series becomes the closed record; a later opening shows it, accepts nothing and writes no event; the adapter closes it right after the absence record', () => {
    const r = run();

    expect(m16sCloseUnopenedAtReview(r.s)).toBe(true);
    expect(m16sCloseUnopenedAtReview(r.s)).toBe(false);
    expect(r.s.status).toBe('closed_at_review');
    expect(r.s.closure_reason).toBe('closed_at_review');
    expect(m16sOpen(r.s, r.tick(10), r.sink)).toBe('record');
    expect(r.s.view).toBe('record');
    expect(m16RecordLine(r.s)).toBe(M16_TEXT.closed_at_review);

    const view = render(r.s);

    expect(view.ids).toEqual(['record_text', 'leave']);
    expect(view.text).toContain(M16_TEXT.closed_at_review);
    expect(view.ids).not.toContain('show_example');
    expect(m16sShowExample1(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    m16sLeave(r.s, r.tick(10), r.sink);
    expect(r.events).toEqual([]);

    // An opened series is never closed this way.
    const opened = run();

    expect(m16sOpen(opened.s, opened.tick(10), opened.sink)).toBe('opened');
    expect(m16sCloseUnopenedAtReview(opened.s)).toBe(false);

    const adapter = readFileSync(
      'src/pilot/windows/m16ProtocolConsole.ts',
      'utf8',
    );

    expect(adapter).toMatch(
      /markAbsent\([\s\S]{0,160}?\);[\s\S]{0,400}?m16sCloseUnopenedAtReview\(s\);/,
    );
  });

  test('C-6: the laboratory RESUME restarts the kit window only while the console surface is open (the M18 guard, closeout of 13 October 2026)', () => {
    const adapter = readFileSync(
      'src/pilot/windows/m16ProtocolConsole.ts',
      'utf8',
    );

    expect(adapter).toMatch(
      /export function resumeM16Surface\(nowMs: number\) \{\s*if \(series === null \|\| !series\.panel_open\) \{\s*return;\s*\}\s*m16Window\.resume\(nowMs\);\s*\}/,
    );
  });
});

test.describe('M16 series model — teaching, order, immutability, commitment', () => {
  test('card → example 1 ↔ example 2 → boundary; every view logged as an interaction; examples never rendered after teaching_closed; fixed vial order; a vial only after the previous first response', () => {
    const r = opened();

    expect(r.s.status).toBe('intro');
    expect(render(r.s).ids).toEqual([
      'show_example',
      'intro_text',
      'help',
      'leave',
    ]);
    expect(render(r.s).text).toContain(
      'A handling rule came in with the storm sample vials.',
    );
    // NEXT / BACK / START do nothing at the card.
    expect(
      m16sNavigateExample(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(m16sRequestTeachingClose(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(m16sShowExample1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(suffixes(r)).toEqual(['intro_acknowledged', 'example_viewed']);
    expect(last(r, 'example_viewed')!.metadata).toMatchObject({
      phase: 'teaching',
      example_id: 'm16_e1',
      example_index: 1,
      view_index: 1,
      navigation: 'first',
      input_mode: 'keyboard',
    });

    let view = render(r.s);

    expect(view.model.subtitle).toBe('Worked example 1 of 2');
    expect(view.model.status).toBe(
      'Worked examples: read them at your own pace.',
    );
    expect(view.ids).toEqual([
      'teaching_note',
      'rule_card',
      'example_block',
      'next_example',
      'help',
      'leave',
    ]);
    expect(view.text).toContain(RULE_CARD.join('\n'));
    expect(view.text).toContain(EXAMPLES[0].lines.join('\n'));
    expect(view.text).toContain('No answer is requested on this page.');
    // BACK on example 1 and START on example 1 do nothing.
    expect(
      m16sNavigateExample(r.s, 'back', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(m16sRequestTeachingClose(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    // NEXT → example 2; BACK → 1; NEXT → 2: every view logged.
    expect(
      m16sNavigateExample(r.s, 'next', 'pointer', r.settle(), r.sink),
    ).toBe(true);
    view = render(r.s);
    expect(view.model.subtitle).toBe('Worked example 2 of 2');
    expect(view.ids).toEqual([
      'teaching_note',
      'rule_card',
      'example_block',
      'start_vials',
      'back_to_example_1',
      'help',
      'leave',
    ]);
    expect(view.text).toContain(EXAMPLES[1].lines.join('\n'));
    expect(
      m16sNavigateExample(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(
      m16sNavigateExample(r.s, 'back', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(
      m16sNavigateExample(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(
      r.events
        .filter((e) => e.suffix === 'example_viewed')
        .map((e) => [
          e.metadata.example_id,
          e.metadata.view_index,
          e.metadata.navigation,
        ]),
    ).toEqual([
      ['m16_e1', 1, 'first'],
      ['m16_e2', 1, 'next'],
      ['m16_e1', 2, 'back'],
      ['m16_e2', 2, 'next'],
    ]);
    expect(r.s.back_navigations).toBe(1);
    expect(count(r, 'first_response')).toBe(0);
    expect(count(r, 'vial_presented')).toBe(0);

    // The boundary: START opens the dialog; KEEP READING cancels; START again, confirm.
    expect(m16sRequestTeachingClose(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(last(r, 'teaching_close_requested')!.metadata).toMatchObject({
      example_id: 'm16_e2',
      example_views: { m16_e1: 2, m16_e2: 2 },
    });
    view = render(r.s);
    expect(view.ids).toEqual(['confirm', 'keep_reading', 'dialog_text']);
    expect(view.text).toContain('Start the six vials?');
    expect(view.text).toContain('START  [ENTER]');
    expect(
      m16sCancelCommit(r.s, 'keyboard', r.tick(M16_SETTLE_MS + 1), r.sink),
    ).toBe(true);
    expect(last(r, 'teaching_close_cancelled')!.metadata).toMatchObject({
      reason: 'keep_reading',
    });
    expect(count(r, 'teaching_closed')).toBe(0);
    expect(render(r.s).model.subtitle).toBe('Worked example 2 of 2');
    expect(m16sRequestTeachingClose(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m16sConfirmCommit(r.s, 'keyboard', r.tick(M16_SETTLE_MS + 1), r.sink),
    ).toBe('teaching_closed');
    expect(count(r, 'teaching_closed')).toBe(1);
    expect(last(r, 'teaching_closed')!.metadata).toMatchObject({
      example_views: { m16_e1: 2, m16_e2: 2 },
      back_navigations: 1,
      help_consults_before: 0,
      input_mode: 'keyboard',
    });
    expect(typeof last(r, 'teaching_closed')!.metadata.teaching_active_ms).toBe(
      'number',
    );
    expect(suffixes(r).slice(-2)).toEqual([
      'teaching_closed',
      'vial_presented',
    ]);
    expect(last(r, 'vial_presented')!.metadata).toMatchObject({
      vial_id: 'm16_v1',
      vial_index: 1,
      assigned_position: 1,
      realised_position: 1,
      option_ids: ['m16_v1_d1', 'm16_v1_d2', 'm16_v1_d3', 'm16_v1_d4'],
    });

    // After the boundary no view renders an example; the rule card stays.
    view = render(r.s);
    expect(view.model.subtitle).toBe('Vial 1 of 6');
    expect(view.ids).toEqual([
      'question',
      'option_1',
      'option_2',
      'option_3',
      'option_4',
      'record_drawer',
      'dont_know',
      'rule_card',
      'vial_block',
      'help',
      'leave',
    ]);
    expect(view.text).toContain(RULE_CARD.join('\n'));
    expect(view.text).toContain(
      'VIAL 1 OF 6\nLabel: site ORLA · depth 12 m · marks: none',
    );
    expect(view.text).not.toContain('WORKED EXAMPLE');
    expect(
      m16sNavigateExample(r.s, 'back', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(m16sRequestTeachingClose(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(m16sShowExample1(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);

    // The next vial only from the acknowledgement; fixed order.
    expect(m16sNext(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');
    answer(r, 1);
    expect(count(r, 'vial_presented')).toBe(1);
    expect(next(r)).toBe('vial_presented');
    expect(last(r, 'vial_presented')!.metadata).toMatchObject({
      vial_id: 'm16_v2',
      assigned_position: 2,
      realised_position: 2,
    });
    expect(render(r.s).text).toContain(
      'Label: site VESK · depth 34 m · marks: STAR, RING',
    );
    expect(render(r.s).text).not.toContain('depth 12 m');
    completeSeries(r, KEYS.slice(1));
    expect(r.s.vials.map((v) => v.presented)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(
      r.events
        .filter((e) => e.suffix === 'vial_presented')
        .map((e) => e.metadata.vial_id),
    ).toEqual([...M16_ASSIGNED_VIAL_ORDER]);
    expect(count(r, 'example_viewed')).toBe(4);
    expect(count(r, 'teaching_closed')).toBe(1);
  });

  test("a first response is written once: a doubled confirmation, a second RECORD DRAWER, DON'T KNOW after an answer and an answer after DON'T KNOW never create a second one", () => {
    const r = measuring();

    answer(r, 2);
    expect(count(r, 'first_response')).toBe(1);
    // The doubled confirmation: no dialog is left.
    expect(m16sConfirmCommit(r.s, 'keyboard', r.tick(10), r.sink)).toBe('none');
    expect(m16sConfirmCommit(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');
    // RECORD DRAWER / DON'T KNOW again on the acknowledgement: nothing.
    expect(
      m16sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(
      m16sRequestCommit(r.s, 'dont_know', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(m16sDraft(r.s, 'm16_v1_d3', 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(count(r, 'first_response')).toBe(1);
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      vial_id: 'm16_v1',
      response_kind: 'option',
      option_id: 'm16_v1_d2',
      correct: false,
      key_option_id: 'm16_v1_d1',
      drafts_before: 1,
      draft_at_commit: 'm16_v1_d2',
    });

    // DON'T KNOW on vial 2, then a drawer attempted: still one response.
    expect(next(r)).toBe('vial_presented');
    answer(r, 'dont_know');
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      vial_id: 'm16_v2',
      response_kind: 'dont_know',
      option_id: null,
      correct: false,
      key_option_id: 'm16_v2_d3',
    });
    expect(m16sDraft(r.s, 'm16_v2_d3', 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(
      m16sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(count(r, 'first_response')).toBe(2);

    // DON'T KNOW with a drawer drafted records DON'T KNOW, not the draft.
    expect(next(r)).toBe('vial_presented');
    expect(m16sDraft(r.s, 'm16_v3_d4', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    answer(r, 'dont_know');
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      vial_id: 'm16_v3',
      response_kind: 'dont_know',
      option_id: null,
      correct: false,
      draft_at_commit: 'm16_v3_d4',
      drafts_before: 1,
    });
    expect(count(r, 'first_response')).toBe(3);
  });

  test('the fresh-press rule on all three confirmations: a press inside 400 ms is refused and recorded once per dialog, the count carried on the record; a cancelled confirmation leaves no record; RECORD DRAWER without a draft; the opener / confirm distinction', () => {
    // The boundary.
    const t = teaching();

    expect(
      m16sNavigateExample(t.s, 'next', 'keyboard', t.settle(), t.sink),
    ).toBe(true);
    expect(m16sRequestTeachingClose(t.s, 'keyboard', t.settle(), t.sink)).toBe(
      true,
    );
    expect(m16sConfirmCommit(t.s, 'keyboard', t.tick(50), t.sink)).toBe(
      'refused',
    );
    expect(m16sConfirmCommit(t.s, 'keyboard', t.tick(50), t.sink)).toBe(
      'refused',
    );
    expect(count(t, 'commit_press_refused')).toBe(1);
    expect(last(t, 'commit_press_refused')!.metadata).toMatchObject({
      target: 'teaching_close',
      kind: 'start',
      reason: 'dialog_settling',
      settle_ms: 400,
    });
    expect(count(t, 'teaching_closed')).toBe(0);
    expect(
      m16sConfirmCommit(t.s, 'keyboard', t.tick(M16_SETTLE_MS), t.sink),
    ).toBe('teaching_closed');
    expect(last(t, 'teaching_closed')!.metadata.refused_presses).toBe(2);

    // The drawer dialog: a double activation of the OPENER within 400 ms
    // yields zero first responses — the first press opens the dialog, the
    // second finds the dialog and is refused by the settle (recorded).
    const r = measuring();

    expect(m16sDraft(r.s, 'm16_v1_d1', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m16sRequestCommit(r.s, 'option', 'pointer', r.tick(100), r.sink),
    ).toBe('opened');
    expect(
      m16sRequestCommit(r.s, 'option', 'pointer', r.tick(50), r.sink),
    ).toBe('none');
    expect(m16sConfirmCommit(r.s, 'pointer', r.tick(10), r.sink)).toBe(
      'refused',
    );
    expect(count(r, 'first_response')).toBe(0);
    expect(count(r, 'commit_press_refused')).toBe(1);
    expect(r.s.pending_commit).not.toBeNull();
    expect(render(r.s).text).toContain('Record DRAWER 1 for vial 1?');
    expect(render(r.s).ids).toEqual(['confirm', 'keep_working', 'dialog_text']);
    // A fresh CONFIRM after 400 ms followed immediately by a duplicate:
    // exactly one.
    expect(
      m16sConfirmCommit(r.s, 'pointer', r.tick(M16_SETTLE_MS), r.sink),
    ).toBe('recorded');
    expect(m16sConfirmCommit(r.s, 'pointer', r.tick(10), r.sink)).toBe('none');
    expect(m16sNext(r.s, 'pointer', r.tick(10), r.sink)).toBe('refused');
    expect(count(r, 'first_response')).toBe(1);
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      refused_presses: 1,
      input_mode: 'pointer',
      correct: true,
    });
    expect(count(r, 'vial_presented')).toBe(1);

    // DON'T KNOW: KEEP WORKING inside 400 ms is ignored and not recorded;
    // after it, cancels with a record and no response.
    expect(next(r)).toBe('vial_presented');
    expect(
      m16sRequestCommit(r.s, 'dont_know', 'keyboard', r.settle(), r.sink),
    ).toBe('opened');
    expect(m16sCancelCommit(r.s, 'keyboard', r.tick(50), r.sink)).toBe(false);
    expect(count(r, 'commit_cancelled')).toBe(0);
    expect(r.s.pending_commit).not.toBeNull();
    expect(
      m16sCancelCommit(r.s, 'keyboard', r.tick(M16_SETTLE_MS), r.sink),
    ).toBe(true);
    expect(last(r, 'commit_cancelled')!.metadata).toMatchObject({
      kind: 'dont_know',
      option_id: null,
      reason: 'keep_working',
      refused_presses: 0,
    });
    expect(count(r, 'first_response')).toBe(1);
    // The restored vial view settles again: a draft inside 400 ms is ignored.
    expect(m16sDraft(r.s, 'm16_v2_d3', 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    expect(m16sDraft(r.s, 'm16_v2_d3', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );

    // RECORD DRAWER without a draft: the refused request only.
    expect(m16sDraft(r.s, 'm16_v2_d3', 'keyboard', r.tick(100), r.sink)).toBe(
      true,
    ); // clears
    expect(last(r, 'option_drafted')!.metadata).toMatchObject({
      option_id: null,
      previous_option_id: 'm16_v2_d3',
    });
    expect(
      m16sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink),
    ).toBe('no_draft');
    expect(count(r, 'commit_without_draft')).toBe(1);
    expect(count(r, 'commit_requested')).toBe(2);
    expect(r.s.pending_commit).toBeNull();
    expect(count(r, 'first_response')).toBe(1);
    // Drafts never become responses: leave with a draft, the row has one answer.
    expect(m16sDraft(r.s, 'm16_v2_d1', 'keyboard', r.tick(100), r.sink)).toBe(
      true,
    );
    m16sLeave(r.s, r.tick(10), r.sink);
    expect(count(r, 'first_response')).toBe(1);
    expect(m16AnsweredCount(r.s)).toBe(1);
  });

  test("the settle on every view transition: a press inside 400 ms of SHOW EXAMPLE 1, NEXT EXAMPLE, BACK TO EXAMPLE 1, the boundary START and KEEP READING, a vial's first view, the acknowledgement, the results NEXT / BACK / FINISH / HELP, HELP and CLOSE HELP changes nothing; a later one acts", () => {
    const r = opened();

    // The card settles: SHOW EXAMPLE 1 inside 400 ms does nothing.
    expect(m16sShowExample1(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m16sHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m16sShowExample1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    // Example 1 settles: NEXT inside 400 ms does nothing; HELP too.
    expect(
      m16sNavigateExample(r.s, 'next', 'keyboard', r.tick(100), r.sink),
    ).toBe(false);
    expect(m16sHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(
      m16sNavigateExample(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    // Example 2 settles: BACK and START inside 400 ms do nothing.
    expect(
      m16sNavigateExample(r.s, 'back', 'keyboard', r.tick(100), r.sink),
    ).toBe(false);
    expect(m16sRequestTeachingClose(r.s, 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    expect(
      m16sNavigateExample(r.s, 'back', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(
      m16sNavigateExample(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    // HELP, then CLOSE HELP inside 400 ms ignored; after, the restored view
    // settles again (START inside 400 ms ignored).
    expect(m16sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m16sCloseHelp(r.s, r.tick(100))).toBe(false);
    expect(
      m16sNavigateExample(r.s, 'back', 'keyboard', r.tick(100), r.sink),
    ).toBe(false);
    expect(m16sCloseHelp(r.s, r.settle())).toBe(true);
    expect(m16sRequestTeachingClose(r.s, 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    // KEEP READING re-arms example 2.
    expect(m16sRequestTeachingClose(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m16sCancelCommit(r.s, 'keyboard', r.tick(M16_SETTLE_MS + 1), r.sink),
    ).toBe(true);
    expect(m16sRequestTeachingClose(r.s, 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    expect(m16sHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m16sRequestTeachingClose(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m16sConfirmCommit(r.s, 'keyboard', r.tick(M16_SETTLE_MS + 1), r.sink),
    ).toBe('teaching_closed');
    // A vial's first view settles: draft, RECORD, DON'T KNOW and HELP inside
    // 400 ms do nothing and record nothing.
    const before = r.events.length;

    expect(m16sDraft(r.s, 'm16_v1_d2', 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    expect(
      m16sRequestCommit(r.s, 'option', 'keyboard', r.tick(50), r.sink),
    ).toBe('none');
    expect(
      m16sRequestCommit(r.s, 'dont_know', 'keyboard', r.tick(50), r.sink),
    ).toBe('none');
    expect(m16sHelp(r.s, 'keyboard', r.tick(50), r.sink)).toBe(false);
    expect(r.events.length).toBe(before);
    expect(m16Settling(r.s, r.now)).toBe(true);
    expect(m16sDraft(r.s, 'm16_v1_d2', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(m16Settling(r.s, r.now)).toBe(false);
    answer(r, 1);
    // The acknowledgement settles: NEXT VIAL inside 400 ms refused and not
    // recorded; HELP inside 400 ms does nothing.
    const atAck = r.events.length;

    expect(m16sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(m16sHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(r.events.length).toBe(atAck);
    // HELP on the acknowledgement, CLOSE HELP re-arms it.
    expect(m16sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')!.metadata).toMatchObject({
      phase: 'measurement',
      view: 'ack_1',
      vial_id: 'm16_v1',
    });
    expect(m16sCloseHelp(r.s, r.settle())).toBe(true);
    expect(m16sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(m16sNext(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      'vial_presented',
    );
    completeSeries(r, KEYS.slice(1));
    // SHOW RESULTS inside 400 ms of the acknowledgement: refused.
    expect(m16sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(count(r, 'results_shown')).toBe(0);
    expect(next(r)).toBe('results_shown');
    // The results pages settle (covered with HELP / CLOSE HELP in the results test).
    expect(m16sHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m16sFinish(r.s, r.tick(100))).toBe(false);
    expect(
      m16sResultsNavigate(r.s, 'next', 'keyboard', r.tick(100), r.sink),
    ).toBe(false);
    expect(
      m16sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(
      m16sResultsNavigate(r.s, 'back', 'keyboard', r.tick(100), r.sink),
    ).toBe(false);
    expect(m16sFinish(r.s, r.tick(100))).toBe(false);
    expect(m16sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m16sCloseHelp(r.s, r.tick(100))).toBe(false);
    expect(m16sCloseHelp(r.s, r.settle())).toBe(true);
    expect(r.s.results_page).toBe(2);
    expect(m16sFinish(r.s, r.tick(100))).toBe(false);
    expect(m16sFinish(r.s, r.settle())).toBe(true);
    expect(count(r, 'results_shown')).toBe(2);
  });

  test("help is refused during a dialog and recorded with the phase and view; ESC order (dialog, then help) is the adapter's; leaving in a dialog cancels it with no response", () => {
    const r = measuring();

    expect(m16sDraft(r.s, 'm16_v1_d2', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m16sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink),
    ).toBe('opened');
    expect(m16sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    expect(count(r, 'help_consulted')).toBe(0);
    // Leaving with the dialog open cancels it (panel_left), no response.
    m16sLeave(r.s, r.tick(10), r.sink);
    expect(last(r, 'commit_cancelled')!.metadata).toMatchObject({
      reason: 'panel_left',
      kind: 'option',
      option_id: 'm16_v1_d2',
      input_mode: 'system',
    });
    expect(count(r, 'first_response')).toBe(0);
    expect(r.s.pending_commit).toBeNull();
    expect(suffixes(r).slice(-2)).toEqual(['commit_cancelled', 'panel_left']);
    // Help on every view with its phase and view name.
    expect(m16sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(r.s.vials[0].draft).toBe('m16_v1_d2');
    expect(m16sHelp(r.s, 'pointer', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')!.metadata).toMatchObject({
      phase: 'measurement',
      view: 'vial_1',
      vial_id: 'm16_v1',
      vial_index: 1,
      input_mode: 'pointer',
    });
    expect(render(r.s).ids).toEqual(['close_help', 'help_text']);
    expect(render(r.s).text).toContain('HOW THE CONSOLE WORKS');
    expect(m16sCloseHelp(r.s, r.settle())).toBe(true);
    expect(r.s.vials[0].draft).toBe('m16_v1_d2');
    expect(
      render(r.s).model.elements.find((e) => e.id === 'option_2')!.state,
    ).toBe('selected');

    const t = opened();

    expect(m16sHelp(t.s, 'keyboard', t.settle(), t.sink)).toBe(true);
    expect(last(t, 'help_consulted')!.metadata).toMatchObject({
      phase: 'intro',
      view: 'intro',
    });
    expect(m16sCloseHelp(t.s, t.settle())).toBe(true);
    expect(m16sShowExample1(t.s, 'keyboard', t.settle(), t.sink)).toBe(true);
    expect(m16sHelp(t.s, 'keyboard', t.settle(), t.sink)).toBe(true);
    expect(last(t, 'help_consulted')!.metadata).toMatchObject({
      phase: 'teaching',
      view: 'example_1',
      example_id: 'm16_e1',
    });
    expect(m16sCloseHelp(t.s, t.settle())).toBe(true);
    expect(render(t.s).model.subtitle).toBe('Worked example 1 of 2');
    expect(
      m16sNavigateExample(t.s, 'next', 'keyboard', t.settle(), t.sink),
    ).toBe(true);
    expect(m16sHelp(t.s, 'keyboard', t.settle(), t.sink)).toBe(true);
    expect(last(t, 'help_consulted')!.metadata).toMatchObject({
      view: 'example_2',
    });
    expect(m16sCloseHelp(t.s, t.settle())).toBe(true);
    expect(render(t.s).model.subtitle).toBe('Worked example 2 of 2');
    closeTeaching(t);
    expect(last(t, 'teaching_closed')!.metadata.help_consults_before).toBe(3);
    expect(t.s.help_consults).toMatchObject({ intro: 1, teaching: 2 });
  });

  test('leaving keeps the phase, the example, the vial, the draft and the answers; returning never presents again and never starts a new trial; leaving before SHOW EXAMPLE 1 shows the card again; a reopening in teaching is a logged view', () => {
    // At the card.
    const c = opened();

    m16sLeave(c.s, c.tick(10), c.sink);
    expect(suffixes(c)).toEqual(['panel_left']);
    expect(m16sOpen(c.s, c.tick(10), c.sink)).toBe('reopened');
    expect(c.s.status).toBe('intro');
    expect(render(c.s).ids).toEqual([
      'show_example',
      'intro_text',
      'help',
      'leave',
    ]);
    expect(last(c, 'series_reopened')!.metadata).toMatchObject({
      view: 'intro',
      phase: 'intro',
    });

    // In teaching on example 2.
    const t = teaching();

    expect(
      m16sNavigateExample(t.s, 'next', 'keyboard', t.settle(), t.sink),
    ).toBe(true);
    m16sLeave(t.s, t.tick(10), t.sink);
    expect(m16sOpen(t.s, t.tick(10), t.sink)).toBe('reopened');
    expect(render(t.s).model.subtitle).toBe('Worked example 2 of 2');
    expect(suffixes(t).slice(-3)).toEqual([
      'panel_left',
      'series_reopened',
      'example_viewed',
    ]);
    expect(last(t, 'example_viewed')!.metadata).toMatchObject({
      example_id: 'm16_e2',
      view_index: 2,
      navigation: 'resume',
      input_mode: 'system',
    });
    expect(count(t, 'teaching_closed')).toBe(0);
    // The restored example settles.
    expect(m16sRequestTeachingClose(t.s, 'keyboard', t.tick(100), t.sink)).toBe(
      false,
    );

    // Mid-vial with a draft and two answers.
    const r = measuring();

    completeSeries(r, [1, 'dont_know']);
    expect(next(r)).toBe('vial_presented');
    expect(m16sDraft(r.s, 'm16_v3_d4', 'pointer', r.settle(), r.sink)).toBe(
      true,
    );
    m16sLeave(r.s, r.tick(10), r.sink);
    expect(last(r, 'panel_left')!.metadata).toMatchObject({
      view: 'vial',
      vial_id: 'm16_v3',
    });
    expect(m16sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(count(r, 'vial_presented')).toBe(3);
    expect(count(r, 'first_response')).toBe(2);
    expect(r.s.vials[2].draft).toBe('m16_v3_d4');
    expect(render(r.s).model.subtitle).toBe('Vial 3 of 6');
    expect(
      render(r.s).model.elements.find((e) => e.id === 'option_4')!.state,
    ).toBe('selected');
    expect(m16sDraft(r.s, 'm16_v3_d1', 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    // The acknowledgement survives leaving too (the draft replaced by 1).
    answer(r, 1);
    m16sLeave(r.s, r.tick(10), r.sink);
    expect(m16sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(r.s.view).toBe('acknowledgement');
    expect(m16sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(next(r)).toBe('vial_presented');
    expect(count(r, 'vial_presented')).toBe(4);
  });

  test('the review closure: the card only, teaching, teaching closed with no answer and a partial series each close with the record as it stands; a completed series is not reclosed', () => {
    const c = opened();

    expect(m16sCloseAtReview(c.s, c.tick(10), c.sink)).toBe(true);
    expect(last(c, 'series_closed_at_review')!.metadata).toMatchObject({
      phase: 'closure',
      closure_reason: 'closed_at_review',
      intro_acknowledged: false,
      teaching_closed: false,
      vials_presented: 0,
      vials_answered: 0,
      correct_first_applications: 0,
    });
    expect(c.s.view).toBe('record');
    expect(render(c.s).text).toContain('0 of 6 vials recorded.');

    const t = teaching();

    expect(m16sCloseAtReview(t.s, t.tick(10), t.sink)).toBe(true);
    expect(last(t, 'series_closed_at_review')!.metadata).toMatchObject({
      intro_acknowledged: true,
      teaching_closed: false,
      examples_viewed: { m16_e1: 1, m16_e2: 0 },
    });

    const m = measuring();

    expect(m16sCloseAtReview(m.s, m.tick(10), m.sink)).toBe(true);
    expect(last(m, 'series_closed_at_review')!.metadata).toMatchObject({
      teaching_closed: true,
      vials_presented: 1,
      vials_answered: 0,
    });

    const p = measuring();

    completeSeries(p, [1, 2, 'dont_know']);
    expect(next(p)).toBe('vial_presented');
    expect(m16sCloseAtReview(p.s, p.tick(10), p.sink)).toBe(true);
    expect(last(p, 'series_closed_at_review')!.metadata).toMatchObject({
      vials_presented: 4,
      vials_answered: 3,
      correct_first_applications: 1,
      dont_know_count: 1,
    });
    expect(
      (
        last(p, 'series_closed_at_review')!.metadata.vials as {
          answered: boolean;
        }[]
      ).map((v) => v.answered),
    ).toEqual([true, true, true, false, false, false]);
    expect(m16sCloseAtReview(p.s, p.tick(10), p.sink)).toBe(false);

    const done = measuring();

    completeSeries(done, KEYS, { showResults: true });
    expect(m16sCloseAtReview(done.s, done.tick(10), done.sink)).toBe(false);
    expect(count(done, 'series_closed_at_review')).toBe(0);
    expect(done.s.status).toBe('completed');
  });

  test("the reload predicate reads an earlier load's opportunity_opened; a held-back console is a closed record; the reload check establishes absence only from a continuous history without an opening", () => {
    expect(m16PriorAdministration([])).toBe(false);
    expect(
      m16PriorAdministration([{ event_type: `${M16_FAMILY}presented` }]),
    ).toBe(false);
    expect(
      m16PriorAdministration([
        { event_type: 'proto_m16_protocol_window_opened' },
        { event_type: 'proto_m15_systems_opportunity_opened' },
      ]),
    ).toBe(false);
    expect(
      m16PriorAdministration([
        { event_type: `${M16_FAMILY}opportunity_opened` },
      ]),
    ).toBe(true);

    const r = run();

    expect(m16sHoldBack(r.s)).toBe(true);
    expect(r.s.status).toBe('held_back');
    expect(m16sOpen(r.s, r.now, r.sink)).toBe('record');
    expect(render(r.s).text).toContain(
      'This console was already used in this session. Its record is kept; no further answers can be given here.',
    );
    expect(render(r.s).text).not.toContain('of 6 vials recorded.');
    expect(render(r.s).ids).toEqual(['record_text', 'leave']);
    expect(m16sShowExample1(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    expect(r.events).toEqual([]);
    expect(m16sHoldBack(r.s)).toBe(false);
    expect(m16sHoldBack(opened().s)).toBe(false);

    const continuous = {
      first_sequence: 1,
      sequence_gap_count: 0,
      sequence_duplicate_count: 0,
      recovered_from_chunks: false,
    };
    const briefing = [{ event_type: `${M16_FAMILY}presented` }];

    expect(m16PriorLoadCheck(2, briefing, continuous)).toEqual({
      page_load_index: 2,
      prior_page_load_event_count: 1,
      prior_opening_found: false,
      prior_briefing_found: true,
      history_continuous: true,
      prior_opening_absence_established: true,
    });
    expect(
      m16PriorLoadCheck(2, [], continuous).prior_opening_absence_established,
    ).toBe(false);
    expect(
      m16PriorLoadCheck(2, briefing, { ...continuous, sequence_gap_count: 1 })
        .prior_opening_absence_established,
    ).toBe(false);
    expect(
      m16PriorLoadCheck(2, briefing, { ...continuous, first_sequence: 2 })
        .history_continuous,
    ).toBe(false);
    expect(
      m16PriorLoadCheck(2, briefing, {
        ...continuous,
        recovered_from_chunks: true,
      }).history_continuous,
    ).toBe(false);
    expect(
      m16PriorLoadCheck(2, briefing, {
        ...continuous,
        sequence_duplicate_count: 1,
      }).history_continuous,
    ).toBe(false);
    expect(
      m16PriorLoadCheck(
        3,
        [...briefing, { event_type: `${M16_FAMILY}opportunity_opened` }],
        continuous,
      ),
    ).toMatchObject({
      prior_opening_found: true,
      prior_briefing_found: true,
      history_continuous: true,
      prior_opening_absence_established: false,
    });
  });

  test('a fault closes an open series (card, teaching, vials); after completion it is recorded without touching the scored phase', () => {
    for (const make of [opened, teaching, measuring]) {
      const r = make();

      expect(m16sFail(r.s, 'boom')).toBe('scored_phase');
      expect(r.s.status).toBe('technical_failure');
      expect(render(r.s).text).toContain(
        'The console has a fault and is closed.',
      );
      expect(m16sFail(r.s, 'again')).toBe('none');
    }

    const done = measuring();

    completeSeries(done, KEYS);
    expect(m16sFail(done.s, 'late')).toBe('feedback');
    expect(done.s.status).toBe('completed');
    expect(done.s.closure_reason).toBe('completed');
    expect(count(done, 'first_response')).toBe(6);
  });

  test("the entry snapshot and the event suffixes are the contract's", () => {
    const snapshot = m16EntrySnapshot('lab_work');

    expect(snapshot).toMatchObject({
      vials_planned: 6,
      examples_planned: 2,
      form_id: 'm16-form-1',
      rule_version: 'm16-rule-v1',
      examples_version: 'm16-examples-v1',
      example_ids: ['m16_e1', 'm16_e2'],
      assigned_vial_order: [
        'm16_v1',
        'm16_v2',
        'm16_v3',
        'm16_v4',
        'm16_v5',
        'm16_v6',
      ],
      teaching: 'passive_worked_examples',
      examples_after_boundary: 'closed',
      rule_card: 'always_visible',
      dont_know_available: true,
      feedback: 'after_all_first_responses',
      stop_control: false,
      settle_ms: 400,
      stage: 'lab_work',
    });
    expect(snapshot.vials.map((v) => v.key_option_id)).toEqual([
      'm16_v1_d1',
      'm16_v2_d3',
      'm16_v3_d4',
      'm16_v4_d1',
      'm16_v5_d4',
      'm16_v6_d2',
    ]);
    expect(snapshot.vials[1].option_ids).toEqual([
      'm16_v2_d1',
      'm16_v2_d2',
      'm16_v2_d3',
      'm16_v2_d4',
    ]);

    for (const suffix of [
      'intro_acknowledged',
      'example_viewed',
      'teaching_close_requested',
      'teaching_close_cancelled',
      'teaching_closed',
      'vial_presented',
      'option_drafted',
      'commit_requested',
      'commit_cancelled',
      'commit_press_refused',
      'commit_without_draft',
      'first_response',
      'response_acknowledged',
      'first_responses_completed',
      'results_shown',
      'help_consulted',
      'series_closed_at_review',
      'prior_load_checked',
    ]) {
      expect(M16_EVENT_SUFFIXES).toContain(suffix);
    }

    expect(M16_RELOAD_DETAIL.startsWith('reload')).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * 7. The extractor on synthetic logs
 * ------------------------------------------------------------------ */

type Step = (r: Run) => void;

interface LogOptions {
  /** Omit the kit's `opportunity_opened` (the console never opened). */
  opened?: boolean;
  /** Add the kit's `presented` (the briefing acknowledged) first. */
  briefed?: boolean;
  /** Add the kit's review-closure `window_closed` for a never-opened console. */
  absentAtReview?: boolean;
  version?: string;
  opportunity?: string;
  pageLoadIndex?: number;
  /** Rewrites each event's sequence (default: 100, 110, …). */
  sequence?: (index: number) => number | undefined;
}

function kitFields(options: LogOptions = {}): Record<string, unknown> {
  return {
    measure_id: 'M16',
    opportunity_id: options.opportunity ?? M16_OPPORTUNITY_ID,
    window_id: M16_WINDOW_ID,
    entry_state_version: options.version ?? M16_ENTRY_STATE_VERSION,
    form: null,
    counterbalance: null,
    occasion: null,
  };
}

/**
 * Builds a raw log: the kit's `presented` / `opportunity_opened` records,
 * then the model's events of the steps, each stamped with the kit's
 * fields and a sequence number.
 */
function log(steps: Step[], options: LogOptions = {}): RawGameEvent[] {
  const r = run();
  const kit: { suffix: string; metadata: Record<string, unknown> }[] = [];

  if (options.briefed) {
    kit.push({ suffix: 'presented', metadata: { input_mode: 'system' } });
  }

  if (options.opened !== false) {
    kit.push({
      suffix: 'opportunity_opened',
      metadata: {
        entry_state_snapshot: m16EntrySnapshot('lab_work'),
        input_mode: 'system',
      },
    });
    m16sOpen(r.s, r.now, r.sink);
  }

  for (const step of steps) {
    step(r);
  }

  if (options.absentAtReview) {
    r.events.push({
      suffix: 'window_closed',
      metadata: { exit_state: 'closed_at_review', input_mode: 'system' },
    });
  }

  return [...kit, ...r.events].map((event, index) => ({
    session_id: 'GS',
    timestamp_ms: 1_000 + index,
    scene: 'diagnostics_laboratory',
    event_type: `${M16_FAMILY}${event.suffix}`,
    object_id: 'm16_protocol_console',
    sequence: options.sequence ? options.sequence(index) : 100 + index * 10,
    page_load_index: options.pageLoadIndex ?? 1,
    metadata: { ...kitFields(options), ...event.metadata },
  }));
}

const CONTEXT = { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false };
const CLOSED = { ...CONTEXT, finalCoreClosed: true };
const RELOADED = { finalCoreClosed: false, pageLoadIndex: 2, reloaded: true };

function row(events: RawGameEvent[], context = CONTEXT) {
  const rows = extractItemFeatures('M16', events, context);

  expect(rows).toHaveLength(1);
  expect(rows[0].feature_id).toBe('m16_correct_first_applications');
  expect(rows[0].planned_denominator).toBe(6);

  return rows[0];
}

const showExample1: Step = (r) => {
  expect(m16sShowExample1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
};
const nextExample: Step = (r) => {
  expect(m16sNavigateExample(r.s, 'next', 'keyboard', r.settle(), r.sink)).toBe(
    true,
  );
};
const backExample: Step = (r) => {
  expect(m16sNavigateExample(r.s, 'back', 'keyboard', r.settle(), r.sink)).toBe(
    true,
  );
};
const closeTeachingStep: Step = (r) => {
  closeTeaching(r);
};
const series =
  (answers: Choice[], options: { showResults?: boolean } = {}): Step =>
  (r) => {
    completeSeries(r, answers, options);
  };
const nextVial: Step = (r) => {
  expect(next(r)).toBe('vial_presented');
};
const closeAtReview: Step = (r) => {
  m16sCloseAtReview(r.s, r.tick(10), r.sink);
};
const leave: Step = (r) => {
  m16sLeave(r.s, r.tick(10), r.sink);
  m16sOpen(r.s, r.tick(10), r.sink);
};
const help: Step = (r) => {
  expect(m16sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
  expect(m16sCloseHelp(r.s, r.settle())).toBe(true);
};
const fault: Step = (r) => {
  m16sFail(r.s, 'boom');
  r.events.push({
    suffix: 'technical_failure',
    metadata: { detail: 'boom', input_mode: 'system' },
  });
};
/** The full teaching run: card, example 1, example 2, boundary. */
const taught: Step[] = [showExample1, nextExample, closeTeachingStep];

/** Mutates one event's metadata in a copied log. */
function withMeta(
  events: RawGameEvent[],
  suffix: string,
  patch: Record<string, unknown>,
  which: 'first' | 'last' = 'last',
): RawGameEvent[] {
  const copy = events.map((event) => ({
    ...event,
    metadata: { ...event.metadata },
  }));
  const own = copy.filter(
    (event) => event.event_type === `${M16_FAMILY}${suffix}`,
  );
  const target = which === 'first' ? own[0] : own[own.length - 1];

  expect(target, suffix).toBeDefined();
  Object.assign(target.metadata as Record<string, unknown>, patch);

  return copy;
}

function without(
  events: RawGameEvent[],
  suffix: string,
  which: 'first' | 'last' = 'last',
) {
  const own = events.filter(
    (event) => event.event_type === `${M16_FAMILY}${suffix}`,
  );
  const target = which === 'first' ? own[0] : own[own.length - 1];

  return events.filter((event) => event !== target);
}

/** Truncates a log right after the last event of a suffix. */
function upTo(
  events: RawGameEvent[],
  suffix: string,
  which: 'first' | 'last' = 'last',
) {
  const own = events.filter(
    (event) => event.event_type === `${M16_FAMILY}${suffix}`,
  );
  const target = which === 'first' ? own[0] : own[own.length - 1];

  return events.slice(0, events.indexOf(target) + 1);
}

test.describe('M16 extractor — values and companions', () => {
  test("6 / 6, 0 / 6 and a mixed series with DON'T KNOW are observed on the planned six; per-vial error_kind; omissions apart from DON'T KNOW; versions and teaching exposure in the components", () => {
    const all = row(log([...taught, series(KEYS, { showResults: true })]));

    expect(all).toMatchObject({
      value: 6,
      numerator: 6,
      denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
      included_ids: [...M16_ASSIGNED_VIAL_ORDER],
    });
    expect(all.components).toMatchObject({
      administration_version: 'm16-handling-v1',
      form_id: 'm16-form-1',
      rule_version: 'm16-rule-v1',
      examples_version: 'm16-examples-v1',
      assigned_vial_order: [...M16_ASSIGNED_VIAL_ORDER],
      realised_vial_order: [...M16_ASSIGNED_VIAL_ORDER],
      observations_share_one_episode: true,
      first_response_phase_complete: true,
      first_response_phase_closure: 'completed',
      vials_answered: 6,
      vials_planned: 6,
      dont_know_count: 0,
      omissions: { unanswered_vial_ids: [], unpresented_vial_ids: [] },
      exposure: {
        briefed: false,
        console_opened: true,
        intro_acknowledged: true,
        examples_viewed: { m16_e1: 1, m16_e2: 1 },
        teaching_closed: true,
        vials_presented: 6,
        never_opened_reason: null,
        stage_at_open: 'lab_work',
      },
      teaching: {
        examples_viewed: { m16_e1: 1, m16_e2: 1 },
        back_navigations: 0,
        teaching_closed: true,
      },
      results_shown: { 1: true, 2: false },
      exposure_record_consistent: true,
      teaching_record_consistent: true,
    });
    expect(
      typeof (all.components.teaching as { teaching_active_ms: unknown })
        .teaching_active_ms,
    ).toBe('number');
    expect(
      (all.components.vials as { correct: boolean; error_kind: unknown }[]).map(
        (v) => [v.correct, v.error_kind],
      ),
    ).toEqual(Array.from({ length: 6 }, () => [true, null]));

    const none = row(log([...taught, series(WRONG)]));

    expect(none).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 6,
      disposition: 'observed',
    });
    expect(
      (
        none.components.vials as { error_kind: unknown; option_id: string }[]
      ).map((v) => v.error_kind),
    ).toEqual(
      VIALS.map((v, index) => {
        const drawer = WRONG[index] as Drawer;

        return ERROR_TABLE[v.id][drawer - 1];
      }),
    );

    // Mixed: v1 key, v2 wrong (4, column), v3 DON'T KNOW (with a draft), v4
    // key, v5 wrong (2, row), v6 key; two back-navigations; one help.
    const mixed = row(
      log([
        showExample1,
        nextExample,
        backExample,
        nextExample,
        backExample,
        help,
        nextExample,
        closeTeachingStep,
        (r) => {
          answer(r, 1);
          expect(next(r)).toBe('vial_presented');
          answer(r, 4);
          expect(next(r)).toBe('vial_presented');
          expect(
            m16sDraft(r.s, 'm16_v3_d4', 'keyboard', r.settle(), r.sink),
          ).toBe(true);
          answer(r, 'dont_know');
          expect(next(r)).toBe('vial_presented');
          answer(r, 1);
          expect(next(r)).toBe('vial_presented');
          answer(r, 2);
          expect(next(r)).toBe('vial_presented');
          answer(r, 2);
          expect(next(r)).toBe('results_shown');
          expect(
            m16sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
          ).toBe(true);
        },
      ]),
    );

    expect(mixed).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 6,
      disposition: 'observed',
    });
    expect(mixed.components).toMatchObject({
      dont_know_count: 1,
      teaching: {
        examples_viewed: { m16_e1: 3, m16_e2: 3 },
        back_navigations: 2,
      },
      help_consults: {
        intro: 0,
        teaching: 1,
        measurement: 0,
        feedback: 0,
        closure: 0,
      },
      results_shown: { 1: true, 2: true },
    });
    expect(
      (
        mixed.components.vials as {
          response_kind: string;
          error_kind: unknown;
          correct: boolean;
        }[]
      ).map((v) => [v.response_kind, v.correct, v.error_kind]),
    ).toEqual([
      ['option', true, null],
      ['option', false, 'column'],
      ['dont_know', false, null],
      ['option', true, null],
      ['option', false, 'row'],
      ['option', true, null],
    ]);
    expect(mixed.supporting_sequences.length).toBeGreaterThan(20);
  });

  test('the completed row is stable: results unopened, opened, after leaving, after HELP and after the review give the identical observed row', () => {
    const base = log([...taught, series(KEYS)]);
    const reference = row(base);
    const variants = [
      log([...taught, series(KEYS, { showResults: true })]),
      log([
        ...taught,
        series(KEYS, { showResults: true }),
        (r) => {
          expect(
            m16sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
          ).toBe(true);
        },
        help,
        leave,
      ]),
      log([...taught, series(KEYS, { showResults: true }), closeAtReview]),
      // A fault after completion: recorded (phase feedback), never valued.
      log([...taught, series(KEYS, { showResults: true }), fault]),
    ];

    expect(reference).toMatchObject({ value: 6, disposition: 'observed' });
    expect(row(variants[3]).components).toMatchObject({
      feedback_phase_faults: 1,
      first_response_phase_closure: 'completed',
    });

    for (const variant of variants) {
      const other = row(variant);
      const strip = (record: typeof other) => ({
        ...record,
        supporting_sequences: [],
        components: {
          ...record.components,
          results_shown: null,
          help_consults: null,
          feedback_phase_faults: null,
        },
      });

      expect(strip(other)).toEqual(strip(reference));
      expect(row(variant, CLOSED).disposition).toBe('observed');
    }
  });

  test('one to five answered and closed at the review ⇒ incomplete with the value and its observed denominator, censored; omissions listed apart; still open ⇒ pending with the answers in the components', () => {
    const partial = log([
      ...taught,
      series([1, 4, 'dont_know']),
      nextVial,
      closeAtReview,
    ]);
    const closed = row(partial, CLOSED);

    expect(closed).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 3,
      planned_denominator: 6,
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
      included_ids: ['m16_v1', 'm16_v2', 'm16_v3'],
    });
    expect(closed.components).toMatchObject({
      omissions: {
        unanswered_vial_ids: ['m16_v4'],
        unpresented_vial_ids: ['m16_v5', 'm16_v6'],
      },
      dont_know_count: 1,
      first_response_phase_closure: 'closed_at_review',
    });

    const open = row(log([...taught, series([1, 4, 'dont_know']), nextVial]));

    expect(open).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'pending',
      included_ids: ['m16_v1', 'm16_v2', 'm16_v3'],
    });
    expect(open.components).toMatchObject({ vials_answered: 3 });
    expect(
      (open.components.vials as { answered: boolean }[]).map((v) => v.answered),
    ).toEqual([true, true, true, false, false, false]);

    const five = row(
      log([...taught, series(KEYS.slice(0, 5)), closeAtReview]),
      CLOSED,
    );

    expect(five).toMatchObject({
      value: 5,
      denominator: 5,
      disposition: 'incomplete',
    });
  });
});

test.describe('M16 extractor — zero evidence and legitimate missingness (never technical_failure)', () => {
  test('never briefed and never opened ⇒ not_presented (also at the review closure); briefed and never opened ⇒ pending, then no_eligible_event with briefed_not_opened', () => {
    const none = row([], CONTEXT);

    expect(none).toMatchObject({ value: null, disposition: 'not_presented' });
    expect(row([], CLOSED).disposition).toBe('not_presented');
    expect(none.components).toMatchObject({
      exposure: {
        briefed: false,
        console_opened: false,
        never_opened_reason: 'not_briefed_not_opened',
      },
    });

    const briefed = log([], { briefed: true, opened: false });

    expect(row(briefed)).toMatchObject({
      value: null,
      disposition: 'pending',
      missing_reason: 'briefed_not_opened',
    });
    expect(row(briefed).components).toMatchObject({
      exposure: {
        briefed: true,
        console_opened: false,
        never_opened_reason: 'briefed_not_opened',
      },
    });

    const absent = log([], {
      briefed: true,
      opened: false,
      absentAtReview: true,
    });

    expect(row(absent, CLOSED)).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
      missing_reason: 'briefed_not_opened',
      censored: true,
      censor_reason: 'briefed_not_opened',
      closure_reason: 'closed_at_review',
    });
  });

  test('no log of any kind yields declined; the exposure stages are distinct', () => {
    const logs = [
      [],
      log([], { briefed: true, opened: false }),
      log([]),
      log([showExample1]),
      log([...taught]),
      log([...taught, series([1])]),
      log([...taught, series(KEYS)]),
      log([...taught], { briefed: true }),
      log([closeAtReview]),
      log([...taught, fault]),
    ];

    for (const events of logs) {
      for (const context of [CONTEXT, CLOSED, RELOADED]) {
        expect(row(events, context).disposition).not.toBe('declined');
      }
    }

    const stages = [
      log([], { briefed: true, opened: false }),
      log([], { briefed: true }),
      log([showExample1], { briefed: true }),
      log([...taught], { briefed: true }),
    ].map((events) => row(events).components.exposure);

    expect(stages).toEqual([
      expect.objectContaining({
        briefed: true,
        console_opened: false,
        intro_acknowledged: false,
      }),
      expect.objectContaining({
        briefed: true,
        console_opened: true,
        intro_acknowledged: false,
        teaching_closed: false,
      }),
      expect.objectContaining({
        console_opened: true,
        intro_acknowledged: true,
        teaching_closed: false,
        examples_viewed: { m16_e1: 1, m16_e2: 0 },
      }),
      expect.objectContaining({
        intro_acknowledged: true,
        teaching_closed: true,
        vials_presented: 1,
      }),
    ]);
  });

  test('opened and unanswered at the review ⇒ no_eligible_event with the stage reached (intro_only / teaching_only / teaching_closed_no_first_response); still open ⇒ pending', () => {
    const cases: [Step[], string][] = [
      [[closeAtReview], 'intro_only'],
      [[showExample1, closeAtReview], 'teaching_only'],
      [
        [showExample1, nextExample, backExample, closeAtReview],
        'teaching_only',
      ],
      [[...taught, closeAtReview], 'teaching_closed_no_first_response'],
    ];

    for (const [steps, reason] of cases) {
      const closed = row(log(steps), CLOSED);

      expect(closed, reason).toMatchObject({
        value: null,
        numerator: null,
        denominator: 0,
        disposition: 'no_eligible_event',
        missing_reason: reason,
        censored: true,
        censor_reason: reason,
        closure_reason: 'closed_at_review',
      });
    }

    for (const steps of [[], [showExample1], [...taught]]) {
      expect(row(log(steps))).toMatchObject({
        value: null,
        disposition: 'pending',
      });
    }
  });

  test('held back after a reload ⇒ interrupted (also after a completed earlier load); a fault while open ⇒ technical_failure with the answers kept', () => {
    const held: RawGameEvent[] = [
      {
        session_id: 'GS',
        timestamp_ms: 1,
        scene: 'diagnostics_laboratory',
        event_type: `${M16_FAMILY}technical_failure`,
        object_id: 'm16_protocol_console',
        sequence: 5,
        page_load_index: 2,
        metadata: {
          ...kitFields(),
          detail: M16_RELOAD_DETAIL,
          input_mode: 'system',
        },
      },
    ];

    expect(row(held, RELOADED)).toMatchObject({
      value: null,
      disposition: 'interrupted',
    });
    expect(row(held, RELOADED).components).toMatchObject({
      held_back_after_reload: true,
    });
    // The earlier load's completed series stays out of the current load.
    const earlier = log([...taught, series(KEYS)]);

    expect(row([...earlier, ...held], RELOADED)).toMatchObject({
      disposition: 'interrupted',
    });

    const faulted = row(log([...taught, series([1, 2]), nextVial, fault]));

    expect(faulted).toMatchObject({
      value: null,
      disposition: 'technical_failure',
      closure_reason: 'technical_failure',
      included_ids: ['m16_v1', 'm16_v2'],
    });
    expect(faulted.components).toMatchObject({ vials_answered: 2 });
    expect(row(log([fault])).disposition).toBe('technical_failure');
    expect(row(log([showExample1, fault])).disposition).toBe(
      'technical_failure',
    );
  });

  test('after a reload: without a check ⇒ interrupted; with an ESTABLISHED absence the load is read as a first load; a broken history or a found opening never establishes it', () => {
    const check = (patch: Record<string, unknown>): RawGameEvent => ({
      session_id: 'GS',
      timestamp_ms: 1,
      scene: 'diagnostics_laboratory',
      event_type: `${M16_FAMILY}prior_load_checked`,
      object_id: 'm16_protocol_console',
      sequence: 3,
      page_load_index: 2,
      metadata: {
        ...kitFields(),
        phase: 'closure',
        page_load_index: 2,
        prior_page_load_event_count: 40,
        prior_opening_found: false,
        prior_briefing_found: true,
        history_continuous: true,
        prior_opening_absence_established: true,
        input_mode: 'system',
        ...patch,
      },
    });
    const briefedLater = log([], {
      briefed: true,
      opened: false,
      pageLoadIndex: 2,
    });

    expect(row([], RELOADED).disposition).toBe('interrupted');
    expect(row(briefedLater, RELOADED).disposition).toBe('interrupted');
    // Established: a first load's reading.
    expect(row([check({})], RELOADED)).toMatchObject({
      disposition: 'not_presented',
    });
    expect(row([check({}), ...briefedLater], RELOADED)).toMatchObject({
      disposition: 'pending',
      missing_reason: 'briefed_not_opened',
    });
    expect(
      row([check({}), ...briefedLater], RELOADED).components,
    ).toMatchObject({
      reload_check: {
        page_reloaded: true,
        checked: true,
        prior_opening_found: false,
        prior_briefing_found: true,
        history_continuous: true,
        prior_opening_absence_established: true,
      },
      exposure_record_consistent: true,
    });
    expect(
      row(
        [check({}), ...log([...taught, series(KEYS)], { pageLoadIndex: 2 })],
        RELOADED,
      ),
    ).toMatchObject({ value: 6, disposition: 'observed' });
    // Not established: discontinuous, or an opening found.
    for (const patch of [
      { history_continuous: false, prior_opening_absence_established: false },
      { prior_opening_found: true, prior_opening_absence_established: false },
      {
        prior_page_load_event_count: 0,
        prior_opening_absence_established: false,
      },
    ]) {
      expect(row([check(patch), ...briefedLater], RELOADED).disposition).toBe(
        'interrupted',
      );
    }

    // A self-contradictory check establishes nothing and is flagged.
    const contradictory = row(
      [check({ history_continuous: false }), ...briefedLater],
      RELOADED,
    );

    expect(contradictory.disposition).toBe('interrupted');
    expect(contradictory.components).toMatchObject({
      exposure_record_consistent: false,
    });
    // Two checks: flagged and (U24 RL-4, the owner's D-6 (i) of 23 October
    // 2026: two or more records establish nothing, even when they agree)
    // the absence not established — interrupted; until RL-4 this read
    // `pending` ("row unchanged"). A check on a first load: flagged, row
    // unchanged.
    const twice = row(
      [check({}), { ...check({}), sequence: 4 }, ...briefedLater],
      RELOADED,
    );

    expect(twice.disposition).toBe('interrupted');
    expect(twice.components).toMatchObject({
      exposure_record_consistent: false,
    });
    expect(
      row([{ ...check({}), page_load_index: 1, sequence: 50 }], CONTEXT),
    ).toMatchObject({
      disposition: 'not_presented',
    });
    expect(
      row([{ ...check({}), page_load_index: 1, sequence: 50 }], CONTEXT)
        .components,
    ).toMatchObject({ exposure_record_consistent: false });
  });

  test('every legitimate-missingness case is not a technical failure', () => {
    const cases: [RawGameEvent[], typeof CONTEXT][] = [
      [[], CONTEXT],
      [[], CLOSED],
      [[], RELOADED],
      [log([], { briefed: true, opened: false }), CONTEXT],
      [log([], { briefed: true, opened: false, absentAtReview: true }), CLOSED],
      [log([]), CONTEXT],
      [log([closeAtReview]), CLOSED],
      [log([showExample1, closeAtReview]), CLOSED],
      [log([...taught, closeAtReview]), CLOSED],
      [log([...taught, series([1])]), CONTEXT],
      [log([...taught, series([1]), closeAtReview]), CLOSED],
      [log([...taught, series(KEYS)]), CONTEXT],
      [log([...taught, series(KEYS, { showResults: true })]), CLOSED],
      [log([...taught, series([1, 2]), leave]), CONTEXT],
    ];

    for (const [events, context] of cases) {
      expect(row(events, context).disposition).not.toBe('technical_failure');
    }
  });
});

test.describe('M16 extractor — integrity (technical_failure for contradictory or unverifiable scored evidence)', () => {
  const full = () => log([...taught, series(KEYS, { showResults: true })]);
  const expectFailure = (
    events: RawGameEvent[],
    label: string,
    context = CONTEXT,
  ) => {
    const record = row(events, context);

    expect(record.disposition, label).toBe('technical_failure');
    expect(record.value, label).toBeNull();
    expect(record.numerator, label).toBeNull();
  };

  test('duplicate first response, unknown or mismatched version, form, rule or opportunity, unknown ids, an option of another vial', () => {
    const events = full();

    expectFailure(
      [...events, events.find((e) => e.event_type.endsWith('first_response'))!],
      'duplicate first response',
    );
    expectFailure(
      log([...taught, series(KEYS)], { version: 'm16-handling-v0' }),
      'unknown version',
    );
    expectFailure(
      withMeta(events, 'first_response', { entry_state_version: 'other' }),
      'mismatched version',
    );
    expectFailure(
      log([...taught, series(KEYS)], {
        opportunity: 'proto_m16_protocol_update',
      }),
      'other opportunity',
    );
    expectFailure(
      withMeta(events, 'vial_presented', { form_id: 'm16-form-2' }),
      'unknown form',
    );
    expectFailure(
      withMeta(events, 'first_response', { form_id: 'm16-form-2' }),
      'unknown form on a response',
    );
    expectFailure(
      withMeta(events, 'opportunity_opened', {
        entry_state_snapshot: {
          ...m16EntrySnapshot('lab_work'),
          rule_version: 'm16-rule-v2',
        },
      }),
      'unknown rule version',
    );
    expectFailure(
      withMeta(events, 'opportunity_opened', {
        entry_state_snapshot: {
          ...m16EntrySnapshot('lab_work'),
          form_id: 'other',
        },
      }),
      'unknown form in the snapshot',
    );
    // The snapshot's keys and option ids are checked against the content.
    const snapshot = m16EntrySnapshot('lab_work');

    expectFailure(
      withMeta(events, 'opportunity_opened', {
        entry_state_snapshot: {
          ...snapshot,
          vials: snapshot.vials.map((entry) =>
            entry.vial_id === 'm16_v2'
              ? { ...entry, key_option_id: 'm16_v2_d1' }
              : entry,
          ),
        },
      }),
      'a snapshot key disagreeing with the content',
    );
    expectFailure(
      withMeta(events, 'opportunity_opened', {
        entry_state_snapshot: {
          ...snapshot,
          vials: snapshot.vials.map((entry) =>
            entry.vial_id === 'm16_v5'
              ? { ...entry, option_ids: entry.option_ids.slice(0, 3) }
              : entry,
          ),
        },
      }),
      'a snapshot missing an option',
    );
    expectFailure(
      withMeta(events, 'opportunity_opened', {
        entry_state_snapshot: { ...snapshot, vials: undefined },
      }),
      'a snapshot without its vials',
    );
    expectFailure(
      withMeta(events, 'vial_presented', { vial_id: 'm16_v7' }),
      'unknown vial presented',
    );
    expectFailure(
      withMeta(events, 'first_response', { vial_id: 'm16_v9' }),
      'unknown vial answered',
    );
    expectFailure(
      withMeta(events, 'first_response', {
        option_id: 'm16_v6_d9',
        correct: false,
      }),
      'unknown option',
    );
    expectFailure(
      withMeta(events, 'first_response', {
        option_id: 'm16_v1_d2',
        correct: false,
      }),
      'an option of another vial',
    );
    // The examples version is unscored: a mismatch flags, never fails.
    const examples = row(
      withMeta(events, 'opportunity_opened', {
        entry_state_snapshot: {
          ...m16EntrySnapshot('lab_work'),
          examples_version: 'm16-examples-v0',
        },
      }),
    );

    expect(examples.disposition).toBe('observed');
    expect(examples.components).toMatchObject({
      teaching_record_consistent: false,
    });
  });

  test('a vial presented before teaching_closed, before the previous first response, out of the assigned order or twice; a first response without its presentation', () => {
    const events = full();

    expectFailure(
      without(events, 'teaching_closed'),
      'vial before teaching closed',
    );
    expectFailure(
      without(events, 'first_response', 'first'),
      'a vial presented before the previous first response',
    );

    const presentations = events.filter((e) =>
      e.event_type.endsWith('vial_presented'),
    );
    const swapped = events.map((e) =>
      e === presentations[1]
        ? {
            ...e,
            metadata: { ...e.metadata, vial_id: 'm16_v3', vial_index: 3 },
          }
        : e === presentations[2]
          ? {
              ...e,
              metadata: { ...e.metadata, vial_id: 'm16_v2', vial_index: 2 },
            }
          : e,
    );

    expectFailure(swapped, 'out of the assigned order');
    expectFailure(
      [...events, { ...presentations[0], sequence: 9_999 }],
      'a vial presented twice',
    );
    expectFailure(
      without(events, 'vial_presented', 'first'),
      'a response without its presentation',
    );
    // Truncated right after an out-of-order presentation: still a failure,
    // not an open series.
    expectFailure(
      upTo(swapped, 'vial_presented', 'last'),
      'out of order, truncated',
    );
  });

  test("a correct flag contradicting the key, DON'T KNOW marked correct or with an option, a missing option id, a non-boolean correct, a key disagreeing with the content, a response outside measurement", () => {
    const events = full();
    const dontKnow = log([...taught, series(['dont_know', 1, 2, 3, 4, 1])]);

    expectFailure(
      withMeta(events, 'first_response', { correct: false }),
      'correct contradicting the key',
    );
    expectFailure(
      withMeta(dontKnow, 'first_response', { correct: true }, 'first'),
      "DON'T KNOW marked correct",
    );
    expectFailure(
      withMeta(dontKnow, 'first_response', { option_id: 'm16_v1_d1' }, 'first'),
      "DON'T KNOW with an option",
    );
    expectFailure(
      withMeta(events, 'first_response', { option_id: null }),
      'missing option id',
    );
    expectFailure(
      withMeta(events, 'first_response', { correct: 'yes' }),
      'non-boolean correct',
    );
    expectFailure(
      withMeta(events, 'first_response', { key_option_id: 'm16_v6_d1' }),
      'key disagreeing',
    );
    expectFailure(
      withMeta(events, 'first_response', { phase: 'teaching' }),
      'outside measurement',
    );
    expectFailure(
      withMeta(events, 'first_response', { response_kind: 'guess' }),
      'unknown kind',
    );
  });

  test('entry snapshot definition (closeout, 12 October 2026): the complete declared task definition is validated — exactly six unique known vial records, each with its four unique options in the fixed order and its key; a correct record beside a conflicting duplicate or an extra unknown record fails; legitimate missingness is untouched', () => {
    const events = full();
    const snapshot = m16EntrySnapshot('lab_work');
    const withVials = (vials: unknown) =>
      withMeta(events, 'opportunity_opened', {
        entry_state_snapshot: { ...snapshot, vials },
      });
    const edit = (
      id: string,
      change: (entry: (typeof snapshot.vials)[number]) => unknown,
    ) =>
      withVials(
        snapshot.vials.map((entry) =>
          entry.vial_id === id ? change(entry) : entry,
        ),
      );
    const v2 = snapshot.vials[1];
    const unknown = {
      vial_id: 'm16_v7',
      option_ids: ['m16_v7_d1', 'm16_v7_d2', 'm16_v7_d3', 'm16_v7_d4'],
      key_option_id: 'm16_v7_d1',
    };

    // Valid definitions: the genuine one; the same six records in another
    // order; a record carrying an additive field. The value is unchanged.
    for (const [vials, label] of [
      [[...snapshot.vials], 'the genuine definition'],
      [[...snapshot.vials].reverse(), 'the records in another order'],
      [
        snapshot.vials.map((entry) => ({ ...entry, label: 'additive' })),
        'an additive field on every record',
      ],
    ] as const) {
      expect(row(withVials(vials)), label).toMatchObject({
        disposition: 'observed',
        value: 6,
        numerator: 6,
        denominator: 6,
      });
    }

    // The definition check concerns task metadata, never the responses:
    // zero to five answers keep their approved dispositions.
    const twoAnswered = [...taught, series(KEYS.slice(0, 2))];

    expect(row(log(twoAnswered))).toMatchObject({
      disposition: 'pending',
      value: null,
    });
    expect(row(log([...twoAnswered, closeAtReview]), CLOSED)).toMatchObject({
      disposition: 'incomplete',
      value: 2,
      numerator: 2,
      denominator: 2,
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(row(log([...taught, closeAtReview]), CLOSED)).toMatchObject({
      disposition: 'no_eligible_event',
      value: null,
      missing_reason: 'teaching_closed_no_first_response',
    });

    // The reported counterexample: the six correct records accompanied by a
    // conflicting duplicate of v2 (another key) and an extra unknown record.
    expectFailure(
      withVials([
        ...snapshot.vials,
        { ...v2, key_option_id: 'm16_v2_d1' },
        unknown,
      ]),
      'a conflicting duplicate and an unknown record beside the six',
    );
    expectFailure(
      withVials([...snapshot.vials, { ...v2, key_option_id: 'm16_v2_d1' }]),
      'a conflicting duplicate alone',
    );
    expectFailure(
      withVials([{ ...v2, key_option_id: 'm16_v2_d1' }, ...snapshot.vials]),
      'a conflicting duplicate before the correct record',
    );
    expectFailure(
      withVials([...snapshot.vials, { ...v2 }]),
      'an identical duplicate (seven records)',
    );
    expectFailure(
      withVials([...snapshot.vials, unknown]),
      'an extra unknown record',
    );
    expectFailure(withVials(snapshot.vials.slice(0, 5)), 'five records');
    expectFailure(
      edit('m16_v6', (entry) => ({ ...entry, vial_id: 'm16_v7' })),
      'an unknown vial in place of a known one',
    );
    expectFailure(
      withVials([...snapshot.vials.slice(0, 5), snapshot.vials[0]]),
      'six records with one vial twice and one missing',
    );
    expectFailure(
      edit('m16_v3', (entry) => ({
        ...entry,
        option_ids: ['m16_v3_d1', 'm16_v3_d1', 'm16_v3_d3', 'm16_v3_d4'],
      })),
      'a duplicate option id (four entries, three unique)',
    );
    expectFailure(
      edit('m16_v3', (entry) => ({
        ...entry,
        option_ids: [...entry.option_ids].reverse(),
      })),
      'the options out of the fixed order',
    );
    expectFailure(
      edit('m16_v4', (entry) => ({
        ...entry,
        option_ids: [...entry.option_ids, 'm16_v4_d5'],
      })),
      'a fifth option',
    );
    expectFailure(
      edit('m16_v4', (entry) => ({ ...entry, key_option_id: 'm16_v1_d1' })),
      "another vial's key",
    );
    expectFailure(
      edit('m16_v1', (entry) => ({
        vial_id: entry.vial_id,
        key_option_id: entry.key_option_id,
      })),
      'a record without its options',
    );
    expectFailure(
      edit('m16_v1', (entry) => ({
        vial_id: entry.vial_id,
        option_ids: entry.option_ids,
      })),
      'a record without its key',
    );
    expectFailure(
      edit('m16_v5', () => null),
      'a null record',
    );
    expectFailure(
      edit('m16_v5', () => 'm16_v5'),
      'a record that is a string',
    );
    expectFailure(withVials([]), 'no records');
    expectFailure(withVials('six'), 'records not a list');
    expectFailure(withVials(undefined), 'records absent');

    // Precedence (the scored-metadata integrity rule, as for the form and
    // rule check): a load with its own opening and a defective definition
    // is technical_failure whatever the number of answers, open or closed
    // at the review. The defect is found at the opening, before any
    // response is read, so the row names the defect and carries no
    // answered ids — the responses stay in the raw log (the Opus
    // confirmation of 12 October 2026, recommendation (a)).
    const defective = (steps: Step[]) =>
      withMeta(log(steps), 'opportunity_opened', {
        entry_state_snapshot: {
          ...snapshot,
          vials: snapshot.vials.map((entry) =>
            entry.vial_id === 'm16_v2'
              ? { ...entry, key_option_id: 'm16_v2_d1' }
              : entry,
          ),
        },
      });

    expectFailure(defective([...taught]), 'defective, none answered, open');
    expectFailure(
      defective([...taught, closeAtReview]),
      'defective, none answered, closed',
      CLOSED,
    );
    expectFailure(defective(twoAnswered), 'defective, two answered, open');

    const closedDefective = row(
      defective([...twoAnswered, closeAtReview]),
      CLOSED,
    );

    expect(closedDefective).toMatchObject({
      disposition: 'technical_failure',
      value: null,
      closure_reason: 'technical_failure',
      included_ids: [],
    });
    expect(closedDefective.components).toMatchObject({
      integrity_defect: "the entry snapshot's key disagrees with the content",
    });

    // The raw log is read, never changed: byte-identical before and after
    // the extraction, for the genuine and for a defective definition
    // (recommendation (b)).
    for (const sample of [full(), defective([...twoAnswered, closeAtReview])]) {
      const before = JSON.stringify(sample);

      row(sample);
      row(sample, CLOSED);
      row(sample, RELOADED);
      expect(JSON.stringify(sample)).toBe(before);
    }

    // A reloaded load without its own opening stays interrupted, also when
    // the earlier load's definition was defective: the earlier load's
    // events never enter the current load's reading (recommendation (c)).
    const heldBack: RawGameEvent = {
      session_id: 'GS',
      timestamp_ms: 1,
      scene: 'diagnostics_laboratory',
      event_type: `${M16_FAMILY}technical_failure`,
      object_id: 'm16_protocol_console',
      sequence: 5,
      page_load_index: 2,
      metadata: {
        ...kitFields(),
        detail: M16_RELOAD_DETAIL,
        input_mode: 'system',
      },
    };

    expect(
      row([...defective([...taught, series(KEYS)]), heldBack], RELOADED),
    ).toMatchObject({ disposition: 'interrupted', value: null });
  });

  test('entry snapshot planned count and assigned order (correction, 12 October 2026): `vials_planned` is the number 6 and `assigned_vial_order` is exactly m16_v1–m16_v6 in order; the records may be stored in any order; six planned vials are never six answers — a valid partial session keeps its disposition', () => {
    const events = full();
    const snapshot = m16EntrySnapshot('lab_work');
    const order = [...M16_ASSIGNED_VIAL_ORDER];
    const withFields = (
      fields: Record<string, unknown>,
      base: RawGameEvent[] = events,
    ) =>
      withMeta(base, 'opportunity_opened', {
        entry_state_snapshot: { ...snapshot, ...fields },
      });
    const withoutField = (field: 'vials_planned' | 'assigned_vial_order') => {
      const copy: Record<string, unknown> = { ...snapshot };

      delete copy[field];

      return withMeta(events, 'opportunity_opened', {
        entry_state_snapshot: copy,
      });
    };

    // The approved administration's values are the ones the kit writes.
    expect(snapshot.vials_planned).toBe(6);
    expect(snapshot.assigned_vial_order).toEqual([
      'm16_v1',
      'm16_v2',
      'm16_v3',
      'm16_v4',
      'm16_v5',
      'm16_v6',
    ]);

    // Valid: the fields as approved, also with the six definition records
    // stored in another order (the storage order is unrestricted; the
    // assigned order is the ordered field, not the records' position).
    for (const [fields, label] of [
      [{ vials_planned: 6, assigned_vial_order: order }, 'as approved'],
      [
        {
          vials_planned: 6,
          assigned_vial_order: order,
          vials: [...snapshot.vials].reverse(),
        },
        'the records stored in reverse, the assigned order as approved',
      ],
    ] as const) {
      expect(row(withFields(fields)), label).toMatchObject({
        disposition: 'observed',
        value: 6,
        numerator: 6,
        denominator: 6,
      });
    }

    // Six planned vials, two answers: a valid partial session keeps its
    // approved dispositions — pending while open, incomplete 2 of 2 and
    // censored when closed at the review; the count stays 6.
    const partial = [...taught, series(KEYS.slice(0, 2))];
    const partialFields = { vials_planned: 6, assigned_vial_order: order };

    expect(row(withFields(partialFields, log(partial)))).toMatchObject({
      disposition: 'pending',
      value: null,
    });

    const closedPartial = row(
      withFields(partialFields, log([...partial, closeAtReview])),
      CLOSED,
    );

    expect(closedPartial).toMatchObject({
      disposition: 'incomplete',
      value: 2,
      numerator: 2,
      denominator: 2,
      censored: true,
      closure_reason: 'closed_at_review',
      included_ids: ['m16_v1', 'm16_v2'],
    });
    expect(closedPartial.components).toMatchObject({
      vials_planned: 6,
      vials_answered: 2,
      assigned_vial_order: order,
    });

    // Every failing case names its defect (the scientific confirmation's
    // recommendation): a count defect and an order defect read differently.
    const COUNT_DEFECT =
      "the entry snapshot's planned vial count is not the number 6";
    const ORDER_DEFECT =
      "the entry snapshot's assigned vial order disagrees with the content";
    const expectDefect = (
      sample: RawGameEvent[],
      label: string,
      defect: string,
      context = CONTEXT,
    ) => {
      expectFailure(sample, label, context);
      expect(row(sample, context).components, label).toMatchObject({
        integrity_defect: defect,
      });
    };
    const expectCountDefect = (
      fields: Record<string, unknown>,
      label: string,
    ) => expectDefect(withFields(fields), label, COUNT_DEFECT);
    const expectOrderDefect = (
      fields: Record<string, unknown>,
      label: string,
    ) => expectDefect(withFields(fields), label, ORDER_DEFECT);

    // Missing or malformed count.
    expectDefect(
      withoutField('vials_planned'),
      'the planned count absent',
      COUNT_DEFECT,
    );
    expectCountDefect({ vials_planned: null }, 'a null count');
    expectCountDefect({ vials_planned: '6' }, 'the count as a string');
    expectCountDefect({ vials_planned: NaN }, 'the count NaN');
    expectCountDefect({ vials_planned: [6] }, 'the count in a list');

    // Contradictory count: six records and six assigned ids, another count.
    expectCountDefect({ vials_planned: 5 }, 'a count of five');
    expectCountDefect({ vials_planned: 7 }, 'a count of seven');
    expectCountDefect({ vials_planned: 0 }, 'a count of zero');
    expectDefect(
      withFields({ vials_planned: 2 }, log([...partial, closeAtReview])),
      'a count of two with two answers (answers are not the plan)',
      COUNT_DEFECT,
      CLOSED,
    );

    // Missing or malformed order.
    expectDefect(
      withoutField('assigned_vial_order'),
      'the assigned order absent',
      ORDER_DEFECT,
    );
    expectOrderDefect({ assigned_vial_order: null }, 'a null assigned order');
    expectOrderDefect(
      { assigned_vial_order: order.join(',') },
      'the assigned order as a string',
    );
    expectOrderDefect({ assigned_vial_order: [] }, 'an empty assigned order');

    // Contradictory order: the six records as approved, the order not.
    expectOrderDefect(
      { assigned_vial_order: [...order].reverse() },
      'the assigned order reversed',
    );
    expectOrderDefect(
      { assigned_vial_order: [order[1], order[0], ...order.slice(2)] },
      'two ids swapped',
    );
    expectOrderDefect({ assigned_vial_order: order.slice(0, 5) }, 'five ids');
    expectOrderDefect(
      { assigned_vial_order: [...order, 'm16_v7'] },
      'seven ids with an unknown one',
    );
    expectOrderDefect(
      { assigned_vial_order: [...order, order[0]] },
      'seven ids with one twice',
    );
    expectOrderDefect(
      { assigned_vial_order: [...order.slice(0, 5), order[0]] },
      'six ids with one twice and one missing',
    );
    expectOrderDefect(
      { assigned_vial_order: [...order.slice(0, 5), 'm16_v7'] },
      'six ids with an unknown one in place of the sixth',
    );

    // Order of the checks: the count before the order, both before the
    // records — a count defect beside an order defect and a defective
    // record is named as the count defect; an order defect beside a
    // defective record as the order defect.
    const badRecords = snapshot.vials.map((entry) =>
      entry.vial_id === 'm16_v2'
        ? { ...entry, key_option_id: 'm16_v2_d1' }
        : entry,
    );

    expectCountDefect(
      {
        vials_planned: 5,
        assigned_vial_order: [...order].reverse(),
        vials: badRecords,
      },
      'a count defect beside an order defect and a record defect',
    );
    expectOrderDefect(
      { assigned_vial_order: [...order].reverse(), vials: badRecords },
      'an order defect beside a record defect',
    );
    expectDefect(
      withFields({ vials: badRecords }),
      'a record defect alone (the count and order as approved)',
      "the entry snapshot's key disagrees with the content",
    );

    // Precedence and the defect named: the count and order are read at the
    // opening before any response, so a defective load with two answers,
    // closed at the review, is technical_failure with no answered ids; the
    // responses stay in the raw log, which is byte-identical afterwards.
    const defectiveCount = withFields(
      { vials_planned: '6' },
      log([...partial, closeAtReview]),
    );
    const defectiveOrder = withFields(
      { assigned_vial_order: [...order].reverse() },
      log([...partial, closeAtReview]),
    );

    for (const [sample, defect] of [
      [
        defectiveCount,
        "the entry snapshot's planned vial count is not the number 6",
      ],
      [
        defectiveOrder,
        "the entry snapshot's assigned vial order disagrees with the content",
      ],
    ] as const) {
      const before = JSON.stringify(sample);
      const record = row(sample, CLOSED);

      expect(record).toMatchObject({
        disposition: 'technical_failure',
        value: null,
        closure_reason: 'technical_failure',
        included_ids: [],
      });
      expect(record.components).toMatchObject({ integrity_defect: defect });
      row(sample);
      row(sample, RELOADED);
      expect(JSON.stringify(sample)).toBe(before);
    }

    // A reloaded load without its own opening stays interrupted whatever
    // the earlier load's count or order.
    const heldBack: RawGameEvent = {
      session_id: 'GS',
      timestamp_ms: 1,
      scene: 'diagnostics_laboratory',
      event_type: `${M16_FAMILY}technical_failure`,
      object_id: 'm16_protocol_console',
      sequence: 5,
      page_load_index: 2,
      metadata: {
        ...kitFields(),
        detail: M16_RELOAD_DETAIL,
        input_mode: 'system',
      },
    };

    expect(
      row(
        [
          ...withFields({ vials_planned: 5 }, log([...taught, series(KEYS)])),
          heldBack,
        ],
        RELOADED,
      ),
    ).toMatchObject({ disposition: 'interrupted', value: null });
  });

  test('a response after completion, six responses without the snapshot, a snapshot with fewer or disagreeing, results before the sixth response, a double closure', () => {
    const events = full();
    const completion = events.find((e) =>
      e.event_type.endsWith('first_responses_completed'),
    )!;
    const responses = events.filter((e) =>
      e.event_type.endsWith('first_response'),
    );
    const sixth = responses[5];

    expectFailure(
      [
        ...events,
        {
          ...sixth,
          sequence: 9_000,
          metadata: { ...sixth.metadata, vial_id: 'm16_v6' },
        },
      ],
      'a response after completion',
    );
    expectFailure(
      without(events, 'first_responses_completed'),
      'six responses without the snapshot',
    );
    expectFailure(
      upTo(
        without(events, 'first_responses_completed'),
        'response_acknowledged',
      ),
      'six responses without the snapshot (truncated)',
    );
    expectFailure(
      withMeta(events, 'first_responses_completed', { vials_answered: 5 }),
      'a snapshot with fewer',
    );
    expectFailure(
      withMeta(events, 'first_responses_completed', {
        correct_first_applications: 5,
      }),
      'a snapshot disagreeing',
    );
    // The completion record moved before the sixth response.
    const early = events.filter((e) => e !== completion);
    const atFive = early.indexOf(responses[4]);

    expectFailure(
      [
        ...early.slice(0, atFive + 1),
        { ...completion, sequence: 55 },
        ...early.slice(atFive + 1),
      ],
      'the snapshot precedes the sixth response',
    );
    // results_shown before completion — also in a partial series.
    const partial = log([...taught, series([1, 2, 3])]);
    const shown = events.find((e) => e.event_type.endsWith('results_shown'))!;

    expectFailure(
      [...partial, { ...shown, sequence: 9_000 }],
      'results before the sixth response',
    );
    expectFailure(
      events.map((e) => (e === shown ? { ...e, sequence: 5 } : e)),
      'results before completion by sequence',
    );
    // Double closure.
    const closed = log([...taught, series([1]), closeAtReview]);
    const closure = closed.find((e) =>
      e.event_type.endsWith('series_closed_at_review'),
    )!;

    expectFailure(
      [...closed, { ...closure, sequence: 9_000 }],
      'the series closed twice',
      CLOSED,
    );
    expectFailure(
      [...events, { ...closure, sequence: 9_000 }],
      'closed after completion',
      CLOSED,
    );
    expectFailure(
      [...closed, { ...completion, sequence: 9_000 }],
      'completed after the closure',
      CLOSED,
    );
  });

  test('missing, zero, negative, fractional, string or duplicated sequence numbers; a presented or check record without a usable sequence or of another identity', () => {
    const base = [...taught, series(KEYS)];

    expectFailure(
      log(base, { sequence: (i) => (i === 3 ? undefined : 100 + i) }),
      'missing sequence',
    );
    expectFailure(log(base, { sequence: (i) => i }), 'zero sequence');
    expectFailure(log(base, { sequence: (i) => i - 5 }), 'negative sequence');
    expectFailure(
      log(base, { sequence: (i) => 100 + i + 0.5 }),
      'fractional sequence',
    );
    expectFailure(
      log(base, {
        sequence: (i) => (i === 2 ? ('x' as unknown as number) : 100 + i),
      }),
      'string sequence',
    );
    expectFailure(
      log(base, { sequence: (i) => (i < 2 ? 100 : 100 + i) }),
      'duplicated sequence',
    );
    // Gaps are normal.
    expect(row(log(base, { sequence: (i) => 1 + i * 97 })).disposition).toBe(
      'observed',
    );

    const presented = log([], { briefed: true, opened: false });

    expectFailure(
      presented.map((e) => ({ ...e, sequence: undefined })),
      'presented without a sequence',
    );
    expectFailure(
      presented.map((e) => ({
        ...e,
        metadata: {
          ...e.metadata,
          opportunity_id: 'proto_m16_protocol_update',
        },
      })),
      'presented of another opportunity',
    );
    expectFailure(
      presented.map((e) => ({
        ...e,
        metadata: { ...e.metadata, entry_state_version: 'm16-protocol-v1' },
      })),
      'presented of another version',
    );
    // A check record of another identity on the reload path.
    const check: RawGameEvent = {
      session_id: 'GS',
      timestamp_ms: 1,
      scene: 'diagnostics_laboratory',
      event_type: `${M16_FAMILY}prior_load_checked`,
      object_id: 'm16_protocol_console',
      sequence: 3,
      page_load_index: 2,
      metadata: {
        ...kitFields({ version: 'other' }),
        phase: 'closure',
        prior_page_load_event_count: 10,
        prior_opening_found: false,
        prior_briefing_found: false,
        history_continuous: true,
        prior_opening_absence_established: true,
        input_mode: 'system',
      },
    };

    expectFailure([check], 'check of another version', RELOADED);
    expectFailure(
      [
        {
          ...check,
          sequence: undefined,
          metadata: { ...check.metadata, ...kitFields() },
        },
      ],
      'check without a sequence',
      RELOADED,
    );
  });

  test('an unscored-record defect flags the components and leaves the row unchanged', () => {
    const events = full();
    const reference = row(events);
    const unchanged = (
      mutated: RawGameEvent[],
      flag: 'exposure_record_consistent' | 'teaching_record_consistent',
      label: string,
    ) => {
      const record = row(mutated);

      expect(record.disposition, label).toBe('observed');
      expect(record.value, label).toBe(reference.value);
      expect(record.components[flag], label).toBe(false);
    };
    const viewed = events.find((e) => e.event_type.endsWith('example_viewed'))!;
    const closedTeaching = events.find((e) =>
      e.event_type.endsWith('teaching_closed'),
    )!;
    const drafted = {
      ...events.find((e) => e.event_type.endsWith('first_response'))!,
      event_type: `${M16_FAMILY}option_drafted`,
      sequence: 9_000,
      metadata: {
        ...kitFields(),
        phase: 'measurement',
        vial_id: 'm16_v9',
        option_id: 'x',
        input_mode: 'keyboard',
      },
    };

    // An example viewed after teaching closed.
    unchanged(
      [...events, { ...viewed, sequence: 9_100 }],
      'teaching_record_consistent',
      'example after the boundary',
    );
    // Two teaching_closed.
    unchanged(
      [...events, { ...closedTeaching, sequence: 9_200 }],
      'teaching_record_consistent',
      'two teaching_closed',
    );
    // A teaching_closed whose view counts disagree.
    unchanged(
      withMeta(events, 'teaching_closed', {
        example_views: { m16_e1: 9, m16_e2: 1 },
      }),
      'teaching_record_consistent',
      'view counts disagree',
    );
    // A teaching_closed with another form does not count as the boundary:
    // flagged, and with no vial after it the row is unchanged (pending);
    // a vial presented after it is a vial before the boundary and voids
    // the scored evidence (contract §10).
    const wrongForm = row(
      withMeta(log([...taught]), 'teaching_closed', {
        form_id: 'm16-form-2',
      }).filter((event) => !event.event_type.endsWith('vial_presented')),
    );

    expect(wrongForm.disposition).toBe('pending');
    expect(wrongForm.components).toMatchObject({
      teaching_record_consistent: false,
      exposure: { teaching_closed: false },
    });
    expect(
      row(withMeta(events, 'teaching_closed', { form_id: 'm16-form-2' }))
        .disposition,
    ).toBe('technical_failure');
    // An orphan draft.
    unchanged(
      [...events, drafted],
      'exposure_record_consistent',
      'orphan draft',
    );
    // A help record without a phase.
    unchanged(
      [
        ...events,
        {
          ...drafted,
          event_type: `${M16_FAMILY}help_consulted`,
          sequence: 9_300,
          metadata: { ...kitFields(), view: 'vial_1', input_mode: 'keyboard' },
        },
      ],
      'exposure_record_consistent',
      'help without a phase',
    );
    // A results_shown without a page, or a page shown twice.
    const shown = events.find((e) => e.event_type.endsWith('results_shown'))!;

    unchanged(
      withMeta(events, 'results_shown', { page: 7 }),
      'exposure_record_consistent',
      'results without a page',
    );
    unchanged(
      [...events, { ...shown, sequence: 9_400 }],
      'exposure_record_consistent',
      'a page shown twice',
    );
    // A check that found an opening beside an opening of this load.
    const found: RawGameEvent = {
      ...events[0],
      event_type: `${M16_FAMILY}prior_load_checked`,
      sequence: 1,
      page_load_index: 2,
      metadata: {
        ...kitFields(),
        phase: 'closure',
        prior_page_load_event_count: 10,
        prior_opening_found: true,
        prior_briefing_found: true,
        history_continuous: true,
        prior_opening_absence_established: false,
        input_mode: 'system',
      },
    };
    const reloadedRun = log([...taught, series(KEYS)], { pageLoadIndex: 2 });
    const beside = row([found, ...reloadedRun], RELOADED);

    expect(beside).toMatchObject({ value: 6, disposition: 'observed' });
    expect(beside.components).toMatchObject({
      exposure_record_consistent: false,
    });
  });

  test("determinism: the same log gives identical rows; the input is not mutated; the row equals the full extraction's row", () => {
    const events = log([
      ...taught,
      series([1, 'dont_know', 4, 1, 2, 2], { showResults: true }),
    ]);
    const before = JSON.stringify(events);
    const first = row(events);
    const second = row(events);

    expect(JSON.stringify(events)).toBe(before);
    expect(second).toEqual(first);
    // Keys 1, 3, 4, 1, 4, 2: v1, v3, v4 and v6 answered with the key.
    expect(first).toMatchObject({
      value: 4,
      denominator: 6,
      disposition: 'observed',
    });

    const all = extractMeasurementFeatures(events, CONTEXT).filter(
      (r) => r.item_id === 'M16',
    );

    expect(all).toEqual([first]);
    expect(JSON.stringify(events)).toBe(before);
    // Order-free: a shuffled log gives the same row (the supporting
    // sequence numbers are listed in input order; compared sorted).
    const shuffled = row([...events].reverse());
    const sorted = (record: typeof first) => ({
      ...record,
      supporting_sequences: [...record.supporting_sequences].sort(
        (a, b) => a - b,
      ),
    });

    expect(sorted(shuffled)).toEqual(sorted(first));
  });
});

/* ------------------------------------------------------------------ *
 * 8. Wording
 * ------------------------------------------------------------------ */

test.describe('M16 wording', () => {
  test('no participant-facing string carries a forbidden token', () => {
    for (const line of m16ParticipantStrings()) {
      expect(line, line).not.toMatch(FORBIDDEN);
    }
  });

  test('the card, status lines, confirmations, acknowledgements and closed records are present exactly', () => {
    const strings = m16ParticipantStrings();

    for (const expected of [
      ...RULE_CARD,
      ...EXAMPLES.flatMap((e) => e.lines),
      ...VIALS.flatMap((v) => [
        `Label: site ${v.site} · depth ${v.depth} m · marks: ${v.marks}`,
        ...v.explanation,
      ]),
      'A handling rule came in with the storm sample vials.',
      'Each recorded answer is final.',
      'Results come after all six vials.',
      'Worked examples: read them at your own pace.',
      'Read how the rule places this vial. No answer is requested on this page.',
      'Start the six vials?\nThe worked examples close and cannot be opened again.\nThe handling rule stays on screen.',
      'Use the handling rule. Choose a drawer, then record it.',
      'Which drawer does vial 1 go in? Choose a drawer, then record it.',
      'Choose a drawer first.',
      'Record DRAWER 3 for vial 2?\nIt cannot be changed afterwards.',
      "Record DON'T KNOW for vial 2?\nIt cannot be changed afterwards.",
      'Vial 6 recorded.',
      '6 of 6 vials recorded.',
      'Only confirming records your answer. A recorded answer cannot be changed.',
      'All six vials are recorded.',
      'Your answers are fixed. This view only shows them.',
      'Station record closed — the console keeps its record.',
      'This console was already used in this session. Its record is kept; no further answers can be given here.',
    ]) {
      expect(strings, expected).toContain(expected);
    }
  });

  test('no string shown before the sixth first response contains a correctness word; no string claims that nothing is recorded', () => {
    for (const line of m16PreCompletionStrings()) {
      expect(line, line).not.toMatch(CORRECTNESS);
      expect(line, line).not.toMatch(/nothing is recorded/i);
    }

    // The results use "Rule's drawer", never "correct".
    for (const line of m16ParticipantStrings()) {
      expect(line).not.toMatch(/\bcorrect\b/i);
    }
  });
});

/* ------------------------------------------------------------------ *
 * U24 RL-4 — uncertain history (RELOAD-CORRECTION-SPEC-r3-exec.md §2, §3,
 * §8 RL-4, §9; D-6 (i), D-7 (i)): D-6 (i) in the extractor, D-7 (i) in the
 * check function, the U / M hold at the model and its reading. Expected
 * readings come from r3 §2 and §8 RL-4 (the existing not-established
 * reason is kept for this family).
 * ------------------------------------------------------------------ */

test.describe('U24 RL-4 — M16 under uncertain history (D-6 (i), D-7 (i), the U / M hold)', () => {
  const SOUND = {
    first_sequence: 1,
    sequence_gap_count: 0,
    sequence_duplicate_count: 0,
    recovered_from_chunks: false,
  };
  const NOT_ESTABLISHED =
    'no current-load console evidence after a reload: protocol console not opened in this page load and the absence of an earlier opening not established';
  const other = { event_type: 'proto_m15_systems_presented' };
  const U_LINES = [
    'The earlier state of this protocol console could not be verified.',
    'It stays closed after this reload.',
  ];

  function check(
    flags: Record<string, unknown> = {},
    sequence = 5,
  ): RawGameEvent {
    return {
      session_id: 'GS',
      timestamp_ms: 4,
      scene: 'diagnostics_laboratory',
      event_type: `${M16_FAMILY}prior_load_checked`,
      object_id: 'm16_protocol_console',
      sequence,
      page_load_index: 2,
      metadata: {
        ...kitFields(),
        phase: 'closure',
        page_load_index: 2,
        prior_page_load_event_count: 40,
        prior_opening_found: false,
        prior_briefing_found: true,
        history_continuous: true,
        prior_opening_absence_established: true,
        input_mode: 'system',
        ...flags,
      },
    };
  }

  function marker(detail: string, sequence = 7): RawGameEvent {
    return {
      session_id: 'GS',
      timestamp_ms: 5,
      scene: 'diagnostics_laboratory',
      event_type: `${M16_FAMILY}technical_failure`,
      object_id: 'm16_protocol_console',
      sequence,
      page_load_index: 2,
      metadata: { ...kitFields(), detail, input_mode: 'system' },
    };
  }

  const presented = () =>
    log([], { opened: false, briefed: true, pageLoadIndex: 2 });
  const flagsOf = (events: RawGameEvent[]) =>
    events.map((event) => event.metadata ?? {});

  test('F-A (D-6 (i)): two agreeing check records with distinct sequence numbers establish nothing — U, refused, the not-established reading', () => {
    const checks = [check({}, 5), check({}, 6)];
    const cls = classifyReload({ pageLoadIndex: 2, checks: flagsOf(checks) });

    expect(cls.occasions.row).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'duplicate_checks',
    });
    expect(cls.check_coherent).toBe(true);
    expect(cls.exposure_record_consistent).toBe(false);

    const read = row([...checks, ...presented()], RELOADED);

    expect(read).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason: NOT_ESTABLISHED,
    });
    expect(read.components).toMatchObject({
      exposure_record_consistent: false,
      reload_check: {
        checked: true,
        prior_opening_absence_established: false,
      },
    });
  });

  test('F-B (D-6 (i)): two conflicting check records ⇒ U, refused, coherence false; the not-established reading', () => {
    const checks = [
      check({}, 5),
      check(
        { history_continuous: false, prior_opening_absence_established: false },
        6,
      ),
    ];
    const cls = classifyReload({ pageLoadIndex: 2, checks: flagsOf(checks) });

    expect(cls.occasions.row).toMatchObject({
      class: 'U',
      administration_permitted: false,
    });
    expect(cls.check_coherent).toBe(false);

    const read = row([...checks, ...presented()], RELOADED);

    expect(read).toMatchObject({
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    expect(read.components.exposure_record_consistent).toBe(false);
  });

  test('F-C (D-7 (i)): an earlier U / M hold-back of this family keeps the absence unestablished in a later load with a continuous history; an H marker, another family’s marker or no marker never does', () => {
    const priorU = [
      other,
      {
        event_type: `${M16_FAMILY}technical_failure`,
        metadata: { detail: M16_UNVERIFIED_DETAIL },
      },
    ];
    const priorM = [
      other,
      {
        event_type: `${M16_FAMILY}technical_failure`,
        metadata: { detail: M16_CONTRADICTORY_DETAIL },
      },
    ];
    const priorH = [
      other,
      {
        event_type: `${M16_FAMILY}technical_failure`,
        metadata: { detail: M16_RELOAD_DETAIL },
      },
    ];

    expect(m16PriorHoldBackCarried(priorU)).toBe(true);
    expect(m16PriorHoldBackCarried(priorM)).toBe(true);
    expect(m16PriorHoldBackCarried(priorH)).toBe(false);
    expect(m16PriorHoldBackCarried([other])).toBe(false);
    expect(
      m16PriorHoldBackCarried([
        {
          event_type: 'proto_m15_systems_technical_failure',
          metadata: { detail: M16_UNVERIFIED_DETAIL },
        },
      ]),
    ).toBe(false);

    const carried = m16PriorLoadCheck(3, priorU, SOUND);

    expect(carried).toMatchObject({
      page_load_index: 3,
      prior_opening_found: false,
      history_continuous: true,
      prior_opening_absence_established: false,
    });
    expect(
      m16PriorLoadCheck(3, priorM, SOUND).prior_opening_absence_established,
    ).toBe(false);
    expect(
      m16PriorLoadCheck(3, priorH, SOUND).prior_opening_absence_established,
    ).toBe(true);
    expect(
      classifyReload({ pageLoadIndex: 3, checks: [carried] }).occasions.row,
    ).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'absence_not_established',
    });
  });

  test('the U / M hold (direction c): the console is never administered — held with the class detail, the record shows exactly the §9 lines and LEAVE, the card’s first step is refused, nothing is written; the H hold keeps its text; permission per class', () => {
    for (const [detail, cls] of [
      [M16_UNVERIFIED_DETAIL, 'U'],
      [M16_CONTRADICTORY_DETAIL, 'M'],
    ] as const) {
      const r = run();

      expect(reloadHoldBackClass(detail)).toBe(cls);
      expect(m16sHoldBack(r.s, detail)).toBe(true);
      expect(r.s.status).toBe('held_back');
      expect(r.s.failure_detail).toBe(detail);
      expect(m16RecordLine(r.s)).toBe(U_LINES.join('\n'));
      expect(m16sShowExample1(r.s, 'keyboard', r.tick(5_000), r.sink)).toBe(
        false,
      );
      expect(r.events).toEqual([]);

      const view = render(r.s);

      expect(view.ids).toEqual(['record_text', 'leave']);
      expect(view.text).toContain(U_LINES[0]);
      expect(view.text).toContain(U_LINES[1]);
      expect(view.text).not.toContain(M16_TEXT.held_back);
    }

    const h = createM16Series();

    expect(m16sHoldBack(h)).toBe(true);
    expect(m16RecordLine(h)).toBe(M16_TEXT.held_back);
    expect([...M16_TEXT.held_unverified]).toEqual(U_LINES);

    for (const line of U_LINES) {
      expect(m16ParticipantStrings()).toContain(line);
    }

    expect(
      classifyReload({
        pageLoadIndex: 2,
        checks: [
          m16PriorLoadCheck(2, [other], { ...SOUND, sequence_gap_count: 1 }),
        ],
      }).occasions.row,
    ).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'history_discontinuous',
    });
    expect(
      classifyReload({
        pageLoadIndex: 2,
        checks: [m16PriorLoadCheck(2, [other], SOUND)],
      }).occasions.row,
    ).toMatchObject({ class: 'A', administration_permitted: true });
    expect(
      classifyReload({ pageLoadIndex: 1, checks: [] }).occasions.row,
    ).toMatchObject({ class: null, administration_permitted: true });
  });

  test('the extractor reads a U / M marker: interrupted with the existing not-established reason (r3 §8 RL-4), held_back_after_reload, consistent with its own check; an established check beside the marker is flagged; the H reading and the first load are unchanged', () => {
    const u = row(
      [
        check({
          history_continuous: false,
          prior_opening_absence_established: false,
        }),
        marker(M16_UNVERIFIED_DETAIL),
        ...presented(),
      ],
      RELOADED,
    );

    expect(u).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason: NOT_ESTABLISHED,
    });
    expect(u.components).toMatchObject({
      held_back_after_reload: true,
      exposure_record_consistent: true,
      reload_check: {
        checked: true,
        history_continuous: false,
        prior_opening_absence_established: false,
      },
    });

    const m = row(
      [
        check({
          history_continuous: false,
          prior_opening_absence_established: true,
        }),
        marker(M16_CONTRADICTORY_DETAIL),
        ...presented(),
      ],
      RELOADED,
    );

    expect(m).toMatchObject({
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    expect(m.components).toMatchObject({
      held_back_after_reload: true,
      exposure_record_consistent: false,
    });

    const contradiction = row(
      [check(), marker(M16_UNVERIFIED_DETAIL), ...presented()],
      RELOADED,
    );

    expect(contradiction).toMatchObject({
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    expect(contradiction.components.exposure_record_consistent).toBe(false);

    const h = row(
      [
        check({
          prior_opening_found: true,
          prior_opening_absence_established: false,
        }),
        marker(M16_RELOAD_DETAIL),
        ...presented(),
      ],
      RELOADED,
    );

    expect(h).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'console opened in an earlier page load; not re-run after the reload',
    });
    expect(h.components).toMatchObject({
      held_back_after_reload: true,
      exposure_record_consistent: true,
    });

    expect(row(presented(), RELOADED)).toMatchObject({
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    expect(row(log([], { opened: false, briefed: true }))).toMatchObject({
      disposition: 'pending',
    });
  });
});
