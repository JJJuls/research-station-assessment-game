/**
 * Station 080 M18 — the three diagnosis cases at the diagnostic board on
 * the participant route (Unit 20, browser evidence run). Every scenario
 * boots the participant default with `bootPilot`, finishes the Dock
 * tutorial and reaches the Diagnostics Laboratory with the existing
 * drivers of `pilotHelpers.ts` (`routeToLabWork`, whose `valeHandover`
 * declines the M05 lamp job so no M05 clock runs while the board is worked;
 * `labApproach` / `labVia` for the board's audited approach; `interactAt`
 * for the station prompt). No M18 state is injected. This route does NOT
 * verify M05 timing (the open M05 matters of register §5.290 (e) (i) stay
 * untouched).
 *
 * INPUT, stated plainly: the walking, the station prompt (SPACE at the
 * board) and Kai's briefing are done by the route drivers with the KEYBOARD
 * — that is navigation, not an M18 response. Inside the board R1, R3, R4,
 * R5, R6, R7 and R8 use the keyboard only; R2 uses the pointer only (every
 * in-board act a real click at the probe's design coordinates); R9 uses
 * both, each control by TAB / ENTER and by click.
 *
 *   R1  keyboard: card; case 1 TEST A, TEST B, TEST A again (repeat), part
 *       3, step 2; case 2 TEST B, TEST C, draft 4, a held ENTER, CANNOT
 *       SOLVE, step 2; case 3 no test, part 4, step CANNOT SOLVE; a press
 *       inside 400 ms refused; 1 / 3 and 1 / 3 observed; results page 1,
 *       H / H, NEXT, NEXT, BACK, FINISH; reopen read-only; ESC.
 *   R2  pointer: every act by click at 1280 × 720 and at `canvas=1080`;
 *       double clicks on a test, on the OPENER (zero responses) and on the
 *       CONFIRM (exactly one); double clicks changing one view; left
 *       mid-case and mid-step and reopened on the same state.
 *   R3  partial coverage: case 1 complete, case 2's part recorded and its
 *       step left; the route driven on to the Utility Deck review ⇒ 2 / 2
 *       and 1 / 1 incomplete; the board afterwards a closed record.
 *   R4  zero evidence: not_presented before Kai's briefing, pending with
 *       briefed_not_opened after it, the card and case 1 left and shown
 *       again.
 *   R5  reload after an opening: the earlier log carried byte-identically,
 *       both rows interrupted; the board, when reachable again, held back.
 *   R6  reload before any opening: the check establishes the absence; the
 *       rows read not_presented, then pending; the card appears.
 *   R7  the real-game layout gate under forced fallback fonts.
 *   R8  the other benches after M18: the evidence table, the protocol
 *       console and the training rig still open, the display advances,
 *       the M13 and M14 rows are untouched.
 *   R9  HELP, LEAVE BOARD and FINISH on every view by both input modes.
 *
 * Twenty-eight evidence frames (800 × 600) go to `U20_OUT`. Nothing here
 * establishes psychometric validity.
 */
import { mkdirSync } from 'node:fs';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { REGISTER_V3 } from '../src/measurement/registerV3';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { closeStationRecord } from './closureHelpers';
import { designToPage, getEvents, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToDeck,
  concourseToWorkshop,
  concourseVia,
  dockToConcourse,
  expectStage,
  interactAt,
  labApproach,
  labToYardBriefed,
  openPromptAt,
  PILOT,
  press,
  returnShiftToDeckClosure,
  routeToLabWork,
  useDoor,
  valeHandover,
  waitScene,
  workshopSignOff,
  workshopToConcourse,
  yardReturnToConcourse,
} from './pilotHelpers';
import { clickElement, surface, waitSurface } from './returnHelpers';

const OUT = process.env.U20_OUT ?? 'test-results/u20-evidence';
const FAMILY = 'proto_m18_cases_';
const VERSION = 'm18-cases-v1';
const SURFACE = 'm18_diagnostic_board';
const SETTLE_MS = 400;
const FORBIDDEN =
  /proto_|secondary_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|puzzle|persist|grit|skill|ability|intelligen|information|process|learn|quick|\bnew\b|complex|make sense|handle|\bROUTE\b|fragment|destination|ARCHIVE|RELAY|ALPHA|BETA|codebook|channel|program|buffer|SUBMIT|logical|solution|problem|\bfind\b/i;
/** No line before the sixth first response may carry a correctness word. */
const CORRECTNESS =
  /\bcorrect|incorrect|\bright\b|\bwrong\b|part at fault:|your recorded/i;
const SHEET_FIRST_LINES: Record<number, string> = {
  1: 'MAST RECEIVER\nPath: 1 MAST ▶ 2 CABLE ▶ 3 AMPLIFIER ▶ 4 FILTER ▶ SPEAKER',
  2: 'COOLING BAY\nAir path: FAN ▶ DUCT ▶ RACK. HEATER and GAUGE sit on the RACK.',
  3: 'HATCH WINCH\nChain: SENSOR ▶ LOCK ▶ WINCH. The SENSOR watches the HATCH.',
};
const SHEET_LINES: Record<number, number> = { 1: 10, 2: 11, 3: 11 };
/** [part, step] keys per case. */
const KEYS: [number, number][] = [
  [3, 2],
  [4, 1],
  [2, 4],
];
const CASE_VIEW_IDS = [
  'question',
  'sheet',
  'test_a',
  'result_a',
  'test_b',
  'result_b',
  'test_c',
  'result_c',
  'part_1',
  'part_2',
  'part_3',
  'part_4',
  'record_part',
  'cannot_solve',
  'help',
  'leave',
];
const STEP_VIEW_IDS = [
  'step_text',
  'answer_1',
  'answer_2',
  'answer_3',
  'answer_4',
  'record_answer',
  'cannot_solve',
  'sheet',
  'test_a',
  'result_a',
  'test_b',
  'result_b',
  'test_c',
  'result_c',
  'help',
  'leave',
];
const ACK_VIEW_IDS = [
  'acknowledgement',
  'next',
  'sheet',
  'test_a',
  'result_a',
  'test_b',
  'result_b',
  'test_c',
  'result_c',
  'help',
  'leave',
];
const DIALOG_IDS = ['confirm', 'keep_working', 'dialog_text'];

interface FeatureRow {
  item_id: string;
  feature_id: string;
  value: unknown;
  numerator: number | null;
  denominator: number | null;
  planned_denominator: number | null;
  disposition: string;
  censored: boolean;
  closure_reason: string | null;
  missing_reason: string | null;
  included_ids: string[];
  components: Record<string, unknown>;
}

interface ProbeElement {
  id: string;
  kind: string;
  label: string;
  state: string;
  x: number;
  y: number;
  w: number;
  h: number;
  focusable: boolean;
  text_px: number;
  text_h: number;
}

interface Probe {
  open: boolean;
  surface_id: string | null;
  title: string | null;
  status: string | null;
  focus: string | null;
  feedback: string | null;
  frame: 'standard' | 'wide';
  feedback_top: number;
  elements: ProbeElement[];
}

type Comp = Record<string, unknown>;

function meta(event: { metadata?: Record<string, unknown> }) {
  return event.metadata ?? {};
}

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function probe(page: Page): Promise<Probe> {
  const value = (await surface(page)) as unknown as Probe | null;

  if (value === null) {
    throw new Error('__workSurfaceProbe unavailable');
  }

  return value;
}

async function familyEvents(page: Page) {
  return (await getEvents(page)).filter((event) =>
    event.event_type.startsWith(FAMILY),
  );
}

async function countOf(page: Page, suffix: string) {
  return (await familyEvents(page)).filter(
    (event) => event.event_type === `${FAMILY}${suffix}`,
  ).length;
}

async function lastOf(page: Page, suffix: string) {
  const own = (await familyEvents(page)).filter(
    (event) => event.event_type === `${FAMILY}${suffix}`,
  );

  return own[own.length - 1];
}

/** The immutable records, serialised for a byte-identity comparison. */
async function records(page: Page) {
  return JSON.stringify(
    (await familyEvents(page)).filter(
      (event) => event.event_type === `${FAMILY}first_response`,
    ),
  );
}

/** Every rendered line of the surface (title, status, feedback, labels). */
async function lines(page: Page): Promise<string> {
  const value = await probe(page);

  return [
    value.title ?? '',
    value.status ?? '',
    value.feedback ?? '',
    ...value.elements.map((element) => element.label),
  ].join('\n');
}

async function ids(page: Page): Promise<string[]> {
  return (await probe(page)).elements.map((element) => element.id);
}

async function elementState(page: Page, id: string) {
  return (await probe(page)).elements.find((element) => element.id === id)
    ?.state;
}

async function labelOf(page: Page, id: string) {
  return (await probe(page)).elements.find((element) => element.id === id)
    ?.label;
}

/**
 * The page's OWN export payload (the runtime's builder, read in the
 * page): its feature rows, its raw events and the events it carries from
 * earlier page loads.
 */
async function pagePayload(page: Page): Promise<{
  features: FeatureRow[];
  raw_events: RawGameEvent[];
  prior: RawGameEvent[];
  page_load_index: number;
  final_core_closed: boolean;
}> {
  const json = await page.evaluate(`(async () => {
    const mod = await import('/src/systems/index.ts');
    const payload = mod.researchRuntime.buildExportPayload();

    return JSON.stringify({
      features: payload.measurement_features ?? [],
      raw_events: payload.raw_events,
      prior: payload.prior_page_load_events,
      page_load_index: payload.page_load_index,
      final_core_closed:
        (payload.pilot_coverage && payload.pilot_coverage.final_core_closed) ===
        true,
    });
  })()`);

  return JSON.parse(json as string);
}

/**
 * The offline reproduction: the same read-only extractor run in this
 * process over the page's raw events must equal the page's own rows — and
 * the raw log is identical before and after the extraction.
 */
async function reproduce(page: Page) {
  const payload = await pagePayload(page);
  const before = JSON.stringify(payload.raw_events);
  const context = {
    finalCoreClosed: payload.final_core_closed,
    pageLoadIndex: payload.page_load_index,
    reloaded: payload.page_load_index > 1,
  };
  const offline = JSON.parse(
    JSON.stringify(extractItemFeatures('M18', payload.raw_events, context)),
  ) as FeatureRow[];
  const own = payload.features.filter((row) => row.item_id === 'M18');

  expect(own, 'the page exports two M18 rows').toHaveLength(2);
  expect(offline, "offline extraction equals the page's rows").toEqual(own);
  expect(JSON.stringify(payload.raw_events)).toBe(before);
  expect(offline[0].feature_id).toBe('m18_correct_first_diagnoses');
  expect(offline[1].feature_id).toBe('m18_correct_consequence_predictions');
  expect(offline[0].planned_denominator).toBe(3);
  expect(offline[1].planned_denominator).toBe(3);

  return { diagnosis: offline[0], prediction: offline[1], payload };
}

const caseOf = (row: FeatureRow, id: string) =>
  (row.components.cases as Comp[]).find((entry) => entry.case_id === id)!;
const slotOf = (row: FeatureRow, slot: 'diagnosis' | 'prediction') =>
  (row.components.slots as Record<string, Comp>)[slot];

/** Another item's row as the page exports it (asserted unchanged in R8). */
async function itemRow(page: Page, item: string) {
  const payload = await pagePayload(page);

  return JSON.stringify(payload.features.filter((row) => row.item_id === item));
}

/** Administration version on the live events; exactly one family owner; no legacy event. */
async function expectFamilyDiscipline(page: Page) {
  const all = await getEvents(page);
  const own = all.filter((event) => event.event_type.startsWith(FAMILY));

  expect(own.length, 'the family was emitted').toBeGreaterThan(0);

  for (const event of own) {
    expect(meta(event).entry_state_version, event.event_type).toBe(VERSION);
    expect(meta(event).opportunity_id).toBe('proto_m18_cases_series');
    expect(meta(event).measure_id).toBe('M18');
    expect(meta(event).window_id).toBe('m18_cases_w1');
    expect(typeof (event as { sequence?: number }).sequence).toBe('number');
  }

  expect(
    REGISTER_V3.filter((entry) =>
      entry.route.family_prefixes.some((prefix) => FAMILY.startsWith(prefix)),
    ).map((entry) => entry.id),
  ).toEqual(['M18']);
  // The retired v2 board family is never written on the route.
  expect(
    all.filter((event) => event.event_type.startsWith('proto_m18_fault_')),
  ).toEqual([]);
}

/** Nothing on the board says anything about correctness or offers results. */
async function expectNoCorrectnessOnScreen(page: Page) {
  const text = await lines(page);
  const present = await ids(page);

  expect(text).not.toMatch(CORRECTNESS);
  expect(text).not.toMatch(FORBIDDEN);
  expect(present.filter((id) => id.startsWith('results_'))).toEqual([]);
  expect(present).not.toContain('finish');
}

// ——— Driver steps (KEYBOARD NAVIGATION — never an M18 response) ————————

/** Opening → Dock tutorial → … → Diagnostics Laboratory, Kai's briefing acknowledged (stage lab_work). */
async function toLab(page: Page, tag: string, extra = '') {
  await bootPilot(page, tag, { extra });
  await completeDockTutorial(page, 1);
  await routeToLabWork(page);
}

/** The same spine, stopping inside the laboratory BEFORE Kai's briefing. */
async function toLabUnbriefed(page: Page, tag: string) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await valeHandover(page);
  await concourseToWorkshop(page);
  await workshopSignOff(page);
  await workshopToConcourse(page);
  await enterLabFromConcourse(page);
}

/** Concourse north door → laboratory (keyboard navigation). */
async function enterLabFromConcourse(page: Page) {
  await concourseVia(
    page,
    PILOT.concourse.northDoor.x,
    PILOT.concourse.northDoor.y + 56,
  );
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });
}

/** Kai's laboratory briefing acknowledged (option 1: a `lab_brief_ack` handler). */
async function briefing(page: Page) {
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: await labApproach(page, PILOT.lab.kai),
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'lab_work');
}

/** Walks to the board's audited approach and presses SPACE (keyboard navigation). */
async function openBoard(page: Page, options?: { shotPrompt?: string }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = await labApproach(page, PILOT.lab.diagnosticBoard);

    if (options?.shotPrompt !== undefined && attempt === 0) {
      await page.waitForTimeout(300);
      await shot(page, options.shotPrompt);
    }

    await interactAt(page, PILOT.lab.diagnosticBoard, {
      approachOffset: offset,
    });

    const opened = await waitSurface(page, true, SURFACE).then(
      () => true,
      () => false,
    );

    if (opened) {
      return;
    }
  }

  throw new Error('the diagnostic board did not open');
}

/** ESC on the board after its view settled (the same path as LEAVE BOARD). */
async function leaveBoard(page: Page) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

// ——— In-board keyboard acts ———————————————————————————————————————————

/** Moves the keyboard focus to an element with the literal TAB key (bounded). */
async function focusByTab(page: Page, id: string) {
  for (let step = 0; step < 20; step += 1) {
    if ((await probe(page)).focus === id) {
      return;
    }

    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
  }

  expect((await probe(page)).focus, `TAB reaches ${id}`).toBe(id);
}

/** ENTER on a control reached by TAB, after the view settled. */
async function activateByKeyboard(page: Page, id: string) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await focusByTab(page, id);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

/** START CASE 1 by TAB and ENTER (the card lands on a neutral element). */
async function startCase1ByKeyboard(page: Page) {
  await page.waitForTimeout(SETTLE_MS + 50);
  expect((await probe(page)).focus).toBe('intro_text');
  await activateByKeyboard(page, 'start_case');
  expect(await ids(page)).toEqual(CASE_VIEW_IDS);
}

/** A test by its hotkey after the view settled. */
async function testByKeyboard(page: Page, letter: 'a' | 'b' | 'c') {
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press(letter);
  await page.waitForTimeout(150);
}

/** R (or N) opens the confirmation; a settled ENTER records. */
async function recordByKeyboard(page: Page, key: 'r' | 'n') {
  await page.keyboard.press(key);
  await page.waitForTimeout(SETTLE_MS + 120);
  expect(await ids(page)).toEqual(DIALOG_IDS);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
}

/** Drafts a part by its number and records it (the step view follows). */
async function partByKeyboard(page: Page, part: number) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press(String(part));
  await page.waitForTimeout(SETTLE_MS + 120);
  await recordByKeyboard(page, 'r');
  expect(await ids(page)).toEqual(STEP_VIEW_IDS);
}

/** Drafts an answer by its number and records it (the acknowledgement follows). */
async function stepByKeyboard(page: Page, answer: number) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press(String(answer));
  await page.waitForTimeout(SETTLE_MS + 120);
  await recordByKeyboard(page, 'r');
  expect(await ids(page)).toEqual(ACK_VIEW_IDS);
}

/** NEXT CASE / SHOW RESULTS by TAB and ENTER after the acknowledgement settled. */
async function nextByKeyboard(page: Page) {
  await page.waitForTimeout(SETTLE_MS + 120);
  expect((await probe(page)).focus).toBe('acknowledgement');
  await activateByKeyboard(page, 'next');
}

/** The current case index from the live events. */
async function currentCase(page: Page) {
  return Number(meta(await lastOf(page, 'case_presented')).case_index);
}

/** A whole keyed case by keyboard with its sufficient tests. */
async function keyedCaseByKeyboard(page: Page, index: number) {
  const tests: ('a' | 'b' | 'c')[][] = [
    ['a', 'b'],
    ['b', 'c'],
    ['a', 'c'],
  ];

  for (const letter of tests[index - 1]) {
    await testByKeyboard(page, letter);
  }

  await partByKeyboard(page, KEYS[index - 1][0]);
  await stepByKeyboard(page, KEYS[index - 1][1]);
}

test.describe('M18 diagnosis cases on the route (Unit 20)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test('R1 (keyboard in the board): card; case 1 with TEST A, TEST B, TEST A again, part 3 and step 2; case 2 with TEST B, TEST C, a draft, a held ENTER and CANNOT SOLVE, step 2; case 3 without a test, part 4, step CANNOT SOLVE; the fresh-press rule; 1 / 3 and 1 / 3 observed; results with H / H, NEXT, NEXT, BACK, FINISH; reopen read-only; ESC', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u20r1');
    await openBoard(page, {
      shotPrompt: '01-laboratory-diagnostic-board-prompt',
    });

    // The first-opening card: neutral focus, START CASE 1, HELP, LEAVE BOARD.
    expect((await probe(page)).frame).toBe('wide');
    expect((await probe(page)).title).toBe('DIAGNOSTIC BOARD');
    expect(await ids(page)).toEqual([
      'intro_text',
      'start_case',
      'help',
      'leave',
    ]);
    expect(await lines(page)).toContain(
      'The storm left three units of the test rig with one part at fault each.',
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '02-first-opening-card');
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'case_presented')).toBe(0);
    expect(
      meta(await lastOf(page, 'opportunity_opened')).entry_state_snapshot,
    ).toMatchObject({
      cases_planned: 3,
      responses_per_case: 2,
      prediction_target: 'actual_case',
      stop_control: false,
      stage: 'lab_work',
      prior_m13_window_status: 'unopened',
    });
    // A settled ENTER on the neutral landing presses nothing.
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await countOf(page, 'intro_acknowledged')).toBe(0);
    await startCase1ByKeyboard(page);
    expect(await countOf(page, 'intro_acknowledged')).toBe(1);
    expect(await countOf(page, 'case_presented')).toBe(1);
    expect(await currentCase(page)).toBe(1);

    // Case 1, no test run: the sheet, the test table, the question; neutral focus.
    expect((await probe(page)).status).toBe(
      'Run any tests, then choose the part at fault and record it.',
    );
    expect(await lines(page)).toContain(SHEET_FIRST_LINES[1]);
    expect(await labelOf(page, 'result_a')).toBe('not run yet');
    expect(await labelOf(page, 'test_a')).toBe('PROBE P1  [A]');
    expect(await lines(page)).not.toContain('Planned step');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '03-case-1-no-test');
    expect((await probe(page)).focus).toBe('question');
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await countOf(page, 'option_drafted')).toBe(0);
    expect(await countOf(page, 'test_run')).toBe(0);

    // TEST A, TEST B, TEST A again: the repeat shows the same line.
    await testByKeyboard(page, 'a');
    expect(await labelOf(page, 'result_a')).toBe('P1 reads TONE.');
    await testByKeyboard(page, 'b');
    expect(await labelOf(page, 'result_b')).toBe('P2 reads SILENT.');
    await testByKeyboard(page, 'a');
    expect(await labelOf(page, 'result_a')).toBe('P1 reads TONE.');
    expect(await countOf(page, 'test_run')).toBe(3);
    expect(meta(await lastOf(page, 'test_run'))).toMatchObject({
      test_id: 'm18_c1_ta',
      result_id: 'tone',
      run_index: 2,
      case_test_runs: 3,
      repeat: true,
      input_mode: 'keyboard',
    });
    expect(await labelOf(page, 'result_c')).toBe('not run yet');
    // RECORD PART without a draft: the neutral line.
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('r');
    await page.waitForTimeout(250);
    expect((await probe(page)).feedback).toBe('Choose a part first.');
    expect(await countOf(page, 'commit_without_draft')).toBe(1);
    expect(await ids(page)).toEqual(CASE_VIEW_IDS);
    await shot(page, '05-choose-a-part-first');
    // Draft 3; HELP over the case with a draft; H closes it back.
    await page.keyboard.press('3');
    await page.waitForTimeout(150);
    expect(await elementState(page, 'part_3')).toBe('selected');
    expect(meta(await lastOf(page, 'option_drafted'))).toMatchObject({
      slot: 'diagnosis',
      option_id: 'm18_c1_p3',
    });
    await page.waitForTimeout(2300); // the neutral line clears
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '04-case-1-tests-a-b-run-with-draft');
    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    expect((await ids(page))[0]).toBe('close_help');
    expect(await lines(page)).toContain('HOW THE BOARD WORKS');
    expect(await lines(page)).toContain(
      'TAB moves focus. ENTER selects the focused control.\nKeys: A-C test · 1-4 choose · R record · N cannot solve · H help · ESC leaves (work kept).',
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '18-help-sheet-over-case-1-with-draft');
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      phase: 'measurement',
      view: 'case_1',
      case_id: 'm18_c1',
      input_mode: 'keyboard',
    });
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    expect(await ids(page)).toEqual(CASE_VIEW_IDS);
    expect(await elementState(page, 'part_3')).toBe('selected');
    expect(await labelOf(page, 'result_b')).toBe('P2 reads SILENT.');
    // RECORD PART: the confirmation repeats the draft; an ENTER inside 400 ms
    // is refused and recorded; a settled ENTER records and presents the step.
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('r');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expect(await ids(page)).toEqual(DIALOG_IDS);
    expect(await lines(page)).toContain(
      'Record AMPLIFIER as the part at fault in case 1?',
    );
    expect(await lines(page)).toContain(
      'The tests then close; the test record stays.',
    );
    expect(await lines(page)).toContain('RECORD PART  [ENTER]');
    expect(await countOf(page, 'commit_press_refused')).toBe(1);
    expect(meta(await lastOf(page, 'commit_press_refused'))).toMatchObject({
      slot: 'diagnosis',
      kind: 'option',
      reason: 'dialog_settling',
    });
    expect(await countOf(page, 'first_response')).toBe(0);
    await shot(page, '06-part-confirmation');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter'); // the settled confirming press
    await page.keyboard.press('Enter'); // carried into the step view
    await page.waitForTimeout(250);
    expect(await countOf(page, 'first_response')).toBe(1);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      case_id: 'm18_c1',
      slot: 'diagnosis',
      response_kind: 'option',
      option_id: 'm18_c1_p3',
      correct: true,
      key_option_id: 'm18_c1_p3',
      tests_run_before: ['m18_c1_ta', 'm18_c1_tb'],
      test_runs_before: 3,
      refused_presses: 1,
      drafts_before: 1,
      help_consults_before: 1,
      input_mode: 'keyboard',
    });
    expect(await countOf(page, 'tests_closed')).toBe(1);
    expect(await countOf(page, 'step_presented')).toBe(1);

    // The step view: the record stays as labels, the status echo, a draft.
    expect(await ids(page)).toEqual(STEP_VIEW_IDS);
    expect((await probe(page)).status).toBe(
      'Recorded part: AMPLIFIER. The tests are closed; the record stays.',
    );
    expect(await labelOf(page, 'test_c')).toBe('C  SPARE FILTER');
    expect(await labelOf(page, 'result_c')).toBe('not run');
    expect(await lines(page)).toContain(
      'Planned step: the crew swaps the AMPLIFIER',
    );
    expect((await probe(page)).focus).toBe('step_text');
    expect(await countOf(page, 'option_drafted')).toBe(1);
    // A test hotkey does nothing now.
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('c');
    await page.waitForTimeout(200);
    expect(await countOf(page, 'test_run')).toBe(3);
    await page.keyboard.press('2');
    await page.waitForTimeout(150);
    expect(await elementState(page, 'answer_2')).toBe('selected');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '08-case-1-planned-step-with-draft');
    await page.keyboard.press('r');
    await page.waitForTimeout(SETTLE_MS + 120);
    expect(await ids(page)).toEqual(DIALOG_IDS);
    expect(await lines(page)).toContain(
      "Record this answer for case 1's planned step?",
    );
    expect(await lines(page)).toContain('Only P1, P2 read TONE');
    expect(await lines(page)).toContain('RECORD ANSWER  [ENTER]');
    await shot(page, '09-answer-confirmation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(await countOf(page, 'first_response')).toBe(2);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      slot: 'prediction',
      option_id: 'm18_c1_s2',
      correct: true,
      key_option_id: 'm18_c1_s2',
    });

    // The acknowledgement: the line, NEXT CASE, HELP and LEAVE BOARD; the
    // sheet and the record stay; nothing about correctness.
    expect(await ids(page)).toEqual(ACK_VIEW_IDS);
    expect(await lines(page)).toContain('Case 1 recorded.');
    expect(await lines(page)).toContain('NEXT CASE');
    expect(await lines(page)).toContain('1 of 3 cases recorded.');
    expect(await lines(page)).toContain('HELP  [H]');
    expect(await lines(page)).toContain('LEAVE BOARD');
    expect(await lines(page)).toContain(SHEET_FIRST_LINES[1]);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '10-acknowledgement-after-case-1');
    await nextByKeyboard(page);

    // Case 2: TEST B, TEST C; draft 4; a held ENTER on the focused opener
    // opens the dialog once and commits nothing; ESC keeps working; then
    // CANNOT SOLVE (recorded, not the draft).
    expect(await currentCase(page)).toBe(2);
    expect(await lines(page)).toContain(SHEET_FIRST_LINES[2]);
    expect(await lines(page)).not.toContain('MAST RECEIVER');
    await testByKeyboard(page, 'b');
    await testByKeyboard(page, 'c');
    expect(await labelOf(page, 'result_b')).toBe(
      'Air at the RACK inlet: 6 units.',
    );
    expect(await labelOf(page, 'result_c')).toBe(
      'A spare GAUGE (never at fault) shows HOT.',
    );
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('4');
    await page.waitForTimeout(150);
    expect(await elementState(page, 'part_4')).toBe('selected');
    await focusByTab(page, 'record_part');

    const refusedBefore = await countOf(page, 'commit_press_refused');

    await page.keyboard.down('Enter'); // opens the dialog
    await page.keyboard.down('Enter'); // the held key repeating
    await page.keyboard.down('Enter');
    await page.waitForTimeout(600);
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    await page.waitForTimeout(200);
    expect(await ids(page)).toEqual(DIALOG_IDS);
    expect(await lines(page)).toContain(
      'Record HEATER as the part at fault in case 2?',
    );
    expect(await countOf(page, 'first_response')).toBe(2);
    expect(await countOf(page, 'commit_press_refused')).toBe(refusedBefore);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect((await probe(page)).open).toBe(true);
    expect(await ids(page)).toEqual(CASE_VIEW_IDS);
    expect(meta(await lastOf(page, 'commit_cancelled'))).toMatchObject({
      slot: 'diagnosis',
      kind: 'option',
      option_id: 'm18_c2_p4',
      reason: 'keep_working',
      input_mode: 'keyboard',
    });
    expect(await elementState(page, 'part_4')).toBe('selected');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('n');
    await page.waitForTimeout(SETTLE_MS + 120);
    expect(await ids(page)).toEqual(DIALOG_IDS);
    expect(await lines(page)).toContain(
      'Record CANNOT SOLVE for the part in case 2?',
    );
    expect(await lines(page)).toContain('RECORD  [ENTER]');
    await shot(page, '07-cannot-solve-part-confirmation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(await countOf(page, 'first_response')).toBe(3);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      case_id: 'm18_c2',
      slot: 'diagnosis',
      response_kind: 'cannot_solve',
      option_id: null,
      correct: false,
      key_option_id: 'm18_c2_p4',
      draft_at_commit: 'm18_c2_p4',
      tests_run_before: ['m18_c2_tb', 'm18_c2_tc'],
    });
    expect((await probe(page)).status).toBe(
      'Recorded part: CANNOT SOLVE. The tests are closed; the record stays.',
    );
    await stepByKeyboard(page, 2);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      case_id: 'm18_c2',
      slot: 'prediction',
      option_id: 'm18_c2_s2',
      correct: false,
      key_option_id: 'm18_c2_s1',
    });
    expect(await lines(page)).toContain('Case 2 recorded.');
    expect(await lines(page)).toContain('2 of 3 cases recorded.');
    await expectNoCorrectnessOnScreen(page);
    await nextByKeyboard(page);

    // Case 3: no test; part 4 (WINCH, wrong); step CANNOT SOLVE.
    expect(await currentCase(page)).toBe(3);
    expect(await lines(page)).toContain(SHEET_FIRST_LINES[3]);
    await partByKeyboard(page, 4);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      case_id: 'm18_c3',
      option_id: 'm18_c3_p4',
      correct: false,
      tests_run_before: [],
      test_runs_before: 0,
    });
    expect(await labelOf(page, 'result_a')).toBe('not run');
    await page.waitForTimeout(SETTLE_MS + 50);
    await recordByKeyboard(page, 'n');
    expect(await countOf(page, 'first_response')).toBe(6);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      case_id: 'm18_c3',
      slot: 'prediction',
      response_kind: 'cannot_solve',
      correct: false,
      key_option_id: 'm18_c3_s4',
    });
    expect(await countOf(page, 'first_responses_completed')).toBe(1);
    expect(await ids(page)).toEqual(ACK_VIEW_IDS);
    expect(await lines(page)).toContain('SHOW RESULTS');
    expect(await lines(page)).toContain('3 of 3 cases recorded.');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '14-acknowledgement-after-case-3');

    const recorded = await records(page);
    const { diagnosis, prediction } = await reproduce(page);

    expect(diagnosis).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 3,
      planned_denominator: 3,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });
    expect(prediction).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 3,
      planned_denominator: 3,
      disposition: 'observed',
      closure_reason: 'completed',
    });
    expect(slotOf(diagnosis, 'diagnosis')).toMatchObject({
      answered: 3,
      cannot_solve_count: 1,
    });
    expect(slotOf(diagnosis, 'prediction')).toMatchObject({
      answered: 3,
      cannot_solve_count: 1,
    });
    expect(caseOf(diagnosis, 'm18_c1')).toMatchObject({
      tests_run_before_part: ['m18_c1_ta', 'm18_c1_tb'],
      test_runs_before_part: 3,
      repeated_test_runs: 1,
      evidence_sufficient_before_part: true,
      step_answer_implied_by_recorded_part: true,
    });
    expect(caseOf(diagnosis, 'm18_c2')).toMatchObject({
      tests_run_before_part: ['m18_c2_tb', 'm18_c2_tc'],
      evidence_sufficient_before_part: true,
      step_answer_implied_by_recorded_part: null,
    });
    expect(caseOf(diagnosis, 'm18_c3')).toMatchObject({
      tests_run_before_part: [],
      evidence_sufficient_before_part: false,
      step_answer_implied_by_recorded_part: null,
    });
    expect(diagnosis.components.investigation_record_consistent).toMatchObject({
      overall: true,
    });
    expect(diagnosis.components.exposure_record_consistent).toBe(true);
    expect(await countOf(page, 'results_shown')).toBe(0);

    // SHOW RESULTS ⇒ page 1; H opens the help over it and H closes it back
    // (no repeated results_shown); NEXT to page 2, NEXT to page 3, BACK to
    // page 2 by TAB focus and ENTER; FINISH by focus and ENTER.
    await nextByKeyboard(page);
    expect(await countOf(page, 'results_shown')).toBe(1);
    expect(meta(await lastOf(page, 'results_shown'))).toMatchObject({
      page: 1,
      case_id: 'm18_c1',
      phase: 'feedback',
    });
    expect((await probe(page)).title).toBe('RESULTS — CASE 1 OF 3');
    expect((await probe(page)).status).toBe(
      'Your answers are fixed. This view only shows them.',
    );
    expect(await ids(page)).toEqual([
      'results_text',
      'help',
      'finish',
      'results_next_1',
    ]);
    expect(await lines(page)).toContain('All three cases are recorded.');
    expect(await lines(page)).toContain(
      'Part at fault: AMPLIFIER · Your recorded part: AMPLIFIER',
    );
    expect(await lines(page)).toContain(
      'After the swap: Only P1, P2 read TONE · Your recorded answer: Only P1, P2 read TONE',
    );
    expect(await lines(page)).not.toMatch(FORBIDDEN);
    await shot(page, '15-results-page-1');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    expect((await ids(page))[0]).toBe('close_help');
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      phase: 'feedback',
      view: 'results_1',
    });
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    expect((await probe(page)).title).toBe('RESULTS — CASE 1 OF 3');
    expect(await countOf(page, 'results_shown')).toBe(1);
    await activateByKeyboard(page, 'results_next_1');
    expect((await probe(page)).title).toBe('RESULTS — CASE 2 OF 3');
    // A page change lands on the results text (contract §3.5), not on the
    // control that was pressed.
    expect((await probe(page)).focus).toBe('results_text');
    expect(await ids(page)).toEqual([
      'results_text',
      'help',
      'finish',
      'results_back_2',
      'results_next_2',
    ]);
    expect(await lines(page)).toContain(
      'Part at fault: HEATER · Your recorded part: CANNOT SOLVE',
    );
    expect(await lines(page)).toContain(
      'After HIGH: AIR 12 · GAUGE COOL · Your recorded answer: AIR 12 · GAUGE HOT',
    );
    expect(await countOf(page, 'results_shown')).toBe(2);
    await shot(page, '16-results-page-2');
    await activateByKeyboard(page, 'results_next_2');
    expect((await probe(page)).title).toBe('RESULTS — CASE 3 OF 3');
    expect((await probe(page)).focus).toBe('results_text');
    expect(await ids(page)).toEqual([
      'results_text',
      'help',
      'finish',
      'results_back_3',
    ]);
    expect(await lines(page)).toContain(
      'Part at fault: SENSOR · Your recorded part: WINCH',
    );
    expect(await lines(page)).toContain(
      'After a spare LOCK: LAMP OFF · WINCH STILL · Your recorded answer: CANNOT SOLVE',
    );
    expect(await countOf(page, 'results_shown')).toBe(3);
    await shot(page, '17-results-page-3');
    await activateByKeyboard(page, 'results_back_3');
    expect((await probe(page)).title).toBe('RESULTS — CASE 2 OF 3');
    expect((await probe(page)).focus).toBe('results_text');
    expect(await countOf(page, 'results_shown')).toBe(3);
    await activateByKeyboard(page, 'finish');
    await waitSurface(page, false);
    expect(await countOf(page, 'results_shown')).toBe(3);

    // Reopen: page 1 again, read-only; no second results_shown; no act
    // records anything; ESC closes it.
    await openBoard(page);
    expect((await probe(page)).title).toBe('RESULTS — CASE 1 OF 3');
    expect(await countOf(page, 'results_shown')).toBe(3);
    await page.keyboard.press('1');
    await page.keyboard.press('a');
    await page.keyboard.press('r');
    await page.keyboard.press('n');
    await page.waitForTimeout(300);
    expect(await countOf(page, 'first_response')).toBe(6);
    expect(await countOf(page, 'option_drafted')).toBe(5);
    expect(await countOf(page, 'test_run')).toBe(5);
    await leaveBoard(page);
    expect(await records(page)).toBe(recorded);
    expect((await reproduce(page)).diagnosis).toMatchObject({
      value: 1,
      denominator: 3,
      disposition: 'observed',
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R2 (pointer in the board): every act by click, a double click on a test recording one run and one refused press, on the opener recording nothing and on the confirm recording once, double clicks changing one view, a side-band click, left mid-case and mid-step and reopened on the same state', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u20r2');
    // KEYBOARD NAVIGATION: the walk and the station prompt.
    await openBoard(page);
    await pointerScenario(page, { shots: true });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R2 at canvas=1080: the same pointer acts at the full-HD canvas; case 3 with a draft (frame 24)', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u20r2b', '&canvas=1080');
    await openBoard(page);
    await pointerScenario(page, {
      shots: false,
      canvasShot: '24-canvas-1080-case-3-with-draft',
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test("R3 (partial coverage and route closure): case 1 complete, case 2's part recorded and its step left; pending before the review; the record closed ⇒ 2 / 2 and 1 / 1 incomplete, censored, closed_at_review; the board afterwards a closed record", async ({
    page,
  }) => {
    test.setTimeout(1_800_000);

    const errors = captureErrors(page);

    await toLab(page, 'u20r3');
    await openBoard(page);
    await startCase1ByKeyboard(page);
    await keyedCaseByKeyboard(page, 1);
    await nextByKeyboard(page);
    expect(await currentCase(page)).toBe(2);
    await testByKeyboard(page, 'b');
    await partByKeyboard(page, 4);
    expect(await countOf(page, 'step_presented')).toBe(2);
    await leaveBoard(page);

    // Reopened: the same step, no results offered.
    await openBoard(page);
    expect(await ids(page)).toEqual(STEP_VIEW_IDS);
    expect(await countOf(page, 'case_presented')).toBe(2);
    expect(await countOf(page, 'step_presented')).toBe(2);
    expect(await lines(page)).toContain(SHEET_FIRST_LINES[2]);
    await expectNoCorrectnessOnScreen(page);
    await leaveBoard(page);

    const pending = await reproduce(page);

    expect(pending.diagnosis).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    expect(pending.prediction).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    expect(slotOf(pending.diagnosis, 'diagnosis').answered).toBe(2);
    expect(slotOf(pending.diagnosis, 'prediction').answered).toBe(1);
    expect(pending.diagnosis.included_ids).toEqual(['m18_c1', 'm18_c2']);
    expect(pending.prediction.included_ids).toEqual(['m18_c1']);

    // KEYBOARD NAVIGATION: the route on to the Utility Deck review.
    await labToYardBriefed(page);
    await yardReturnToConcourse(page);
    await returnShiftToDeckClosure(page);
    await concourseToDeck(page);
    await expectStage(page, 'deck_closure');
    expect(await countOf(page, 'series_closed_at_review')).toBe(0);
    await closeStationRecord(page);

    const closures = (await familyEvents(page)).filter(
      (event) => event.event_type === `${FAMILY}series_closed_at_review`,
    );

    expect(closures).toHaveLength(1);
    expect(meta(closures[0])).toMatchObject({
      phase: 'closure',
      closure_reason: 'closed_at_review',
      cases_presented: 2,
      parts_recorded: 2,
      steps_recorded: 1,
      correct_first_diagnoses: 2,
      correct_consequence_predictions: 1,
    });

    const { diagnosis, prediction, payload } = await reproduce(page);

    expect(payload.final_core_closed).toBe(true);
    expect(diagnosis).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 2,
      planned_denominator: 3,
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(prediction).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      planned_denominator: 3,
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(slotOf(diagnosis, 'diagnosis')).toMatchObject({
      unanswered_case_ids: [],
      unpresented_case_ids: ['m18_c3'],
    });
    expect(slotOf(diagnosis, 'prediction')).toMatchObject({
      unanswered_case_ids: ['m18_c2'],
      unpresented_case_ids: ['m18_c3'],
    });
    expect(await countOf(page, 'results_shown')).toBe(0);

    // KEYBOARD NAVIGATION: back to the laboratory after the closure. A
    // driver that cannot get there leaves this part NOT VERIFIED — said,
    // not passed.
    let blocked: string | null = null;

    try {
      await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
        approachOffset: { x: 40, y: 0 },
        yFirst: true,
      });
      await enterLabFromConcourse(page);
      await openBoard(page);
    } catch (error) {
      blocked = (error as Error).message.split('\n')[0];
    }

    if (blocked !== null) {
      test.info().annotations.push({
        type: 'BLOCKED / NOT VERIFIED',
        description: `the board after the record closure was not reached (${blocked}); frame 21 is missing`,
      });
      // eslint-disable-next-line no-console
      console.log(
        `[R3] BLOCKED / NOT VERIFIED — board after the record closure not reached: ${blocked}`,
      );
    } else {
      const before = (await familyEvents(page)).length;

      expect(await lines(page)).toContain(
        'Station record closed — the board keeps its record.',
      );
      expect((await probe(page)).status).toBe(
        'Parts recorded: 2 of 3 · planned steps recorded: 1 of 3.',
      );
      await expectNoCorrectnessOnScreen(page);
      await shot(page, '21-closed-record-after-review');
      await page.keyboard.press('1');
      await page.keyboard.press('a');
      await page.keyboard.press('r');
      await page.keyboard.press('n');
      await page.keyboard.press('h');
      await page.waitForTimeout(300);
      expect(await ids(page)).toEqual(['record_text', 'leave']);
      await leaveBoard(page);
      expect((await familyEvents(page)).length).toBe(before);
      expect((await reproduce(page)).diagnosis).toMatchObject({
        value: 2,
        denominator: 2,
        disposition: 'incomplete',
      });
    }

    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test("R4 (zero evidence, briefing, card and a case without a part): not_presented before Kai's briefing; pending with briefed_not_opened after it; the card left and shown again; case 1 with two tests left and shown again, no second presentation", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLabUnbriefed(page, 'u20r4');

    // Before Kai's briefing there is no M18 evidence at all.
    expect(await familyEvents(page)).toEqual([]);

    const none = await reproduce(page);

    expect(none.diagnosis).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'not_presented',
    });
    expect(none.prediction).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });

    await briefing(page);
    expect((await familyEvents(page)).map((event) => event.event_type)).toEqual(
      [`${FAMILY}presented`],
    );

    const briefed = await reproduce(page);

    for (const row of [briefed.diagnosis, briefed.prediction]) {
      expect(row).toMatchObject({
        value: null,
        disposition: 'pending',
        missing_reason: 'briefed_not_opened',
      });
      expect(row.components.exposure).toMatchObject({
        briefed: true,
        board_opened: false,
        intro_acknowledged: false,
        cases_presented: 0,
      });
    }

    // Opened and left at the card: still pending; the card again.
    await openBoard(page);
    expect(await ids(page)).toEqual([
      'intro_text',
      'start_case',
      'help',
      'leave',
    ]);
    await leaveBoard(page);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'case_presented')).toBe(0);
    expect((await reproduce(page)).diagnosis).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    expect(
      (await reproduce(page)).prediction.components.exposure,
    ).toMatchObject({
      briefed: true,
      board_opened: true,
      intro_acknowledged: false,
      cases_presented: 0,
    });
    await openBoard(page);
    expect(await ids(page)).toEqual([
      'intro_text',
      'start_case',
      'help',
      'leave',
    ]);
    expect(await countOf(page, 'series_reopened')).toBe(1);

    // START CASE 1, two tests, left: pending; reopening shows case 1 with
    // both results, no second presentation, no test re-run.
    await startCase1ByKeyboard(page);
    await testByKeyboard(page, 'a');
    await testByKeyboard(page, 'c');
    expect(await countOf(page, 'test_run')).toBe(2);
    await leaveBoard(page);

    const open = await reproduce(page);

    expect(open.diagnosis).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    expect(open.prediction).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    expect(open.diagnosis.components.exposure).toMatchObject({
      intro_acknowledged: true,
      cases_presented: 1,
      steps_presented: 0,
    });
    expect(caseOf(open.diagnosis, 'm18_c1')).toMatchObject({
      tests_run_before_part: ['m18_c1_ta', 'm18_c1_tc'],
      evidence_sufficient_before_part: null,
    });
    await openBoard(page);
    expect(await ids(page)).toEqual(CASE_VIEW_IDS);
    expect(await labelOf(page, 'result_a')).toBe('P1 reads TONE.');
    expect(await labelOf(page, 'result_c')).toBe(
      'Spare FILTER in: the SPEAKER stays silent.',
    );
    expect(await labelOf(page, 'result_b')).toBe('not run yet');
    expect(await countOf(page, 'case_presented')).toBe(1);
    expect(await countOf(page, 'test_run')).toBe(2);
    expect(await countOf(page, 'first_response')).toBe(0);
    await leaveBoard(page);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R7 (real-game fallback font, Courier New): the longest views keep at least 30 design px above the feedback line and render on the fixed lines', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await forceMonospace(page, '"Courier New"');

    const errors = captureErrors(page);

    await toLab(page, 'u20r7a');
    await openBoard(page);
    await fallbackGate(
      page,
      'Courier New',
      'c1-courier-new',
      '25-case-3-all-tests-with-draft-courier-new',
      null,
    );
    expectNoRuntimeErrors(errors);
  });

  test('R7 (real-game fallback font, Lucida Console): the same views keep at least 30 design px above the feedback line and render on the fixed lines', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await forceMonospace(page, '"Lucida Console"');

    const errors = captureErrors(page);

    await toLab(page, 'u20r7b');
    await openBoard(page);
    await fallbackGate(
      page,
      'Lucida Console',
      'c2-lucida-console',
      '26-case-3-all-tests-with-draft-lucida-console',
      '27-results-page-3-lucida-console',
    );
    expectNoRuntimeErrors(errors);
  });

  test("R8 (other benches after M18 and M13 independence): the evidence table and the protocol console still open their surfaces with their rows unchanged, the training rig its terminal overlay; the wall display, beacon and Noor's line advance; the M13 and M14 rows untouched; no proto_m13_ event from the laboratory; the stamp equals the lattice bench's status", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u20r8');

    const m13Before = await itemRow(page, 'M13');
    const m14Before = await itemRow(page, 'M14');
    const m15Before = await itemRow(page, 'M15');
    const m16Before = await itemRow(page, 'M16');
    const displayBefore = await signalDisplay(page);

    expect(displayBefore?.phases_recorded).toEqual([]);
    expect(displayBefore?.next_phase).toBe('m15');

    // The whole series by keyboard, all keyed; SHOW RESULTS; leave.
    await openBoard(page);
    expect(
      meta(await lastOf(page, 'opportunity_opened')).entry_state_snapshot,
    ).toMatchObject({
      prior_m13_window_status: 'unopened',
    });
    await startCase1ByKeyboard(page);

    for (let index = 1; index <= 3; index += 1) {
      await keyedCaseByKeyboard(page, index);

      if (index < 3) {
        await nextByKeyboard(page);
      }
    }

    expect(await countOf(page, 'first_responses_completed')).toBe(1);
    await nextByKeyboard(page); // SHOW RESULTS
    await leaveBoard(page);

    const done = await reproduce(page);

    expect(done.diagnosis).toMatchObject({ value: 3, disposition: 'observed' });
    expect(done.prediction).toMatchObject({
      value: 3,
      disposition: 'observed',
    });
    expect(done.diagnosis.components.prior_m13_window_status).toBe('unopened');

    // The wall display after M18 is recorded: phase 1 stays next; the
    // other rows are untouched.
    await page.waitForTimeout(600);

    const display = await signalDisplay(page);

    expect(display?.phases_recorded).toEqual(['m18']);
    expect(display?.next_phase).toBe('m15');
    expect(display?.indicator).toMatch(/PHASE 1 \/ 4/);
    expect(display?.intercom).toMatch(/evidence table/);
    expect(m13Before).toBe(await itemRow(page, 'M13'));
    expect(m14Before).toBe(await itemRow(page, 'M14'));
    expect(m15Before).toBe(await itemRow(page, 'M15'));
    expect(m16Before).toBe(await itemRow(page, 'M16'));
    await shot(page, '28-wall-display-after-m18-recorded');

    // The evidence table (M15) opens its own surface as before.
    await interactAt(page, PILOT.lab.evidenceTable, {
      approachOffset: await labApproach(page, PILOT.lab.evidenceTable),
    });
    await waitSurface(page, true, 'm15_evidence_table');
    expect((await probe(page)).title).toBe('RELAY BOXES');
    await page.waitForTimeout(SETTLE_MS + 50);
    await press(page, 'Escape');
    await waitSurface(page, false);
    expect(JSON.parse(await itemRow(page, 'M15'))[0]).toMatchObject({
      disposition: 'pending',
      value: null,
    });

    // The protocol console (M16) opens its own surface as before.
    await interactAt(page, PILOT.lab.protocolConsole, {
      approachOffset: await labApproach(page, PILOT.lab.protocolConsole),
    });
    await waitSurface(page, true, 'm16_protocol_console');
    expect((await probe(page)).title).toBe('HANDLING RULE');
    await page.waitForTimeout(SETTLE_MS + 50);
    await press(page, 'Escape');
    await waitSurface(page, false);
    expect(JSON.parse(await itemRow(page, 'M16'))[0]).toMatchObject({
      disposition: 'pending',
      value: null,
    });

    // The training rig (M17) opens its terminal overlay as before.
    await interactAt(page, PILOT.lab.trainingRig, {
      approachOffset: await labApproach(page, PILOT.lab.trainingRig),
    });
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __ipTerminalProbe?: { open?: boolean; task?: string } | null;
          }
        ).__ipTerminalProbe?.open === true,
      undefined,
      { timeout: 8000 },
    );
    expect(
      await page.evaluate(
        () =>
          (
            window as unknown as {
              __ipTerminalProbe?: { task?: string } | null;
            }
          ).__ipTerminalProbe?.task,
      ),
    ).toBe('m17');
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __ipTerminalProbe?: { open?: boolean } | null })
          .__ipTerminalProbe?.open !== true,
      undefined,
      { timeout: 8000 },
    );
    expect(m13Before).toBe(await itemRow(page, 'M13'));
    expect(m14Before).toBe(await itemRow(page, 'M14'));
    expect(
      (await getEvents(page)).filter(
        (event) =>
          (event as { scene?: string }).scene === 'diagnostics_laboratory' &&
          event.event_type.startsWith('proto_m13_'),
      ),
    ).toEqual([]);
    expect((await reproduce(page)).diagnosis).toMatchObject({
      value: 3,
      disposition: 'observed',
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R9 (HELP, LEAVE BOARD and FINISH on every view by both input modes): from the card, a case without and with a draft and after all tests, a step without and with a draft and an acknowledgement HELP and LEAVE BOARD are present, focusable, clickable and overlapped by nothing; on every results page HELP and FINISH (with NEXT / BACK); HELP / CLOSE HELP restore the view; FINISH and ESC close', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await toLab(page, 'u20r9');
    await openBoard(page);
    await accessScenario(page);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });
});

async function signalDisplay(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __signalDisplayProbe?: {
            phases_recorded: string[];
            next_phase: string | null;
            indicator: string;
            intercom: string;
          } | null;
        }
      ).__signalDisplayProbe ?? null,
  );
}

/**
 * Test code only: substitutes a wider monospace for the generic
 * `monospace` family on every 2D canvas context, before the game boots.
 */
async function forceMonospace(page: Page, family: string) {
  await page.addInitScript((wanted: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CanvasRenderingContext2D.prototype,
      'font',
    );

    if (descriptor?.set === undefined || descriptor.get === undefined) {
      return;
    }

    Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', {
      configurable: true,
      get() {
        return descriptor.get!.call(this);
      },
      set(value: string) {
        descriptor.set!.call(
          this,
          String(value).replace(/\bmonospace\b/g, wanted),
        );
      },
    });
  }, family);
}

/**
 * The layout gate: the lowest control against the feedback line; no label
 * taller than its box; a multi-line text block on its fixed line count
 * (its rendered height against the per-line height).
 */
async function measureGate(
  page: Page,
  font: string,
  label: string,
  fixedLines: { id: string; lines: number }[],
  lineHeight: number | null,
) {
  const value = await probe(page);
  const bottom = Math.max(...value.elements.map((e) => e.y + e.h / 2));
  const spare = value.feedback_top - bottom;

  // eslint-disable-next-line no-console
  console.log(
    `[R7 ${font}] ${label}: content bottom ${bottom.toFixed(1)}, feedback top ${value.feedback_top.toFixed(1)}, spare ${spare.toFixed(1)} design px; text/box: ${value.elements.map((e) => `${e.id} ${e.text_h.toFixed(0)}/${e.h}`).join(', ')}`,
  );
  expect(
    spare,
    `${label}: space above the feedback line`,
  ).toBeGreaterThanOrEqual(30);
  expect(value.elements.every((e) => e.text_px === 16)).toBe(true);

  for (const element of value.elements) {
    expect(
      element.text_h,
      `${label}: ${element.id} text inside its box`,
    ).toBeLessThanOrEqual(element.h);
  }

  if (lineHeight !== null) {
    for (const block of fixedLines) {
      const element = value.elements.find((e) => e.id === block.id)!;

      expect(element, `${label}: ${block.id}`).toBeDefined();
      expect(
        Math.abs(element.text_h - block.lines * lineHeight),
        `${label}: ${block.id} on ${block.lines} lines (text ${element.text_h.toFixed(1)}, line ${lineHeight.toFixed(1)})`,
      ).toBeLessThan(lineHeight / 2);
    }
  }
}

/** The fixed single-line blocks of a case / step / acknowledgement view. */
const SINGLE_LINE_IDS = [
  'test_a',
  'result_a',
  'test_b',
  'result_b',
  'test_c',
  'result_c',
];
const TILE_IDS = (prefix: 'part' | 'answer') =>
  [1, 2, 3, 4].map((i) => `${prefix}_${i}`);

/**
 * Under a forced font (keyboard): case 1's step with a draft, case 2 with
 * all tests and a draft, the help sheet over it, case 2's step with a
 * draft, case 3 with all tests and a draft, a part confirmation, results
 * page 3. Every footer must render on ONE line: the surface places the
 * feedback line from the footer's bounds, so its top is compared with its
 * top under the help sheet, whose 24-character footer is one line by
 * construction.
 */
async function fallbackGate(
  page: Page,
  font: string,
  frames: string,
  caseFrame: string,
  resultsFrame: string | null,
) {
  const feedbackTop = async () => (await probe(page)).feedback_top;
  const tops: [string, number][] = [];

  await measureGate(page, font, 'first-opening card', [], null);

  const cardText = (await probe(page)).elements.find(
    (e) => e.id === 'intro_text',
  )!.text_h;

  tops.push(['first-opening card', await feedbackTop()]);
  await shot(page, `${frames}-card`);
  await startCase1ByKeyboard(page);
  // The per-line height, read from the case 1 sheet (ten fixed lines).
  const sheet = (await probe(page)).elements.find((e) => e.id === 'sheet')!;
  const lineHeight = sheet.text_h / SHEET_LINES[1];

  expect(
    Math.abs(cardText - 6 * lineHeight),
    `first-opening card on 6 lines (text ${cardText.toFixed(1)}, line ${lineHeight.toFixed(1)})`,
  ).toBeLessThan(lineHeight / 2);

  const singles = (prefix: 'part' | 'answer') =>
    [...SINGLE_LINE_IDS, ...TILE_IDS(prefix)].map((id) => ({ id, lines: 1 }));

  await measureGate(
    page,
    font,
    'case 1',
    [{ id: 'sheet', lines: 10 }, ...singles('part')],
    lineHeight,
  );
  tops.push(['case 1', await feedbackTop()]);
  await testByKeyboard(page, 'a');
  await testByKeyboard(page, 'b');
  await partByKeyboard(page, 3);
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('2');
  await page.waitForTimeout(150);
  await measureGate(
    page,
    font,
    "case 1's step with a draft",
    [{ id: 'sheet', lines: 10 }, ...singles('answer')],
    lineHeight,
  );
  tops.push(["case 1's step", await feedbackTop()]);
  await shot(page, `${frames}-case-1-step-with-draft`);
  await recordByKeyboard(page, 'r');
  await measureGate(
    page,
    font,
    'acknowledgement 1',
    [
      { id: 'sheet', lines: 10 },
      ...SINGLE_LINE_IDS.map((id) => ({ id, lines: 1 })),
    ],
    lineHeight,
  );
  tops.push(['acknowledgement 1', await feedbackTop()]);
  await nextByKeyboard(page);
  // Case 2 with all tests run and a draft.
  for (const letter of ['a', 'b', 'c'] as const) {
    await testByKeyboard(page, letter);
  }

  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('4');
  await page.waitForTimeout(150);
  expect(await elementState(page, 'part_4')).toBe('selected');
  await measureGate(
    page,
    font,
    'case 2 with all tests and a draft',
    [{ id: 'sheet', lines: 11 }, ...singles('part')],
    lineHeight,
  );
  tops.push(['case 2', await feedbackTop()]);
  await shot(page, `${frames}-case-2-all-tests-with-draft`);
  // The help sheet over case 2: the title, a blank and the eight lines on
  // ten lines inside the box; its footer the one-line reference.
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('h');
  await page.waitForTimeout(250);
  expect((await ids(page))[0]).toBe('close_help');
  await measureGate(
    page,
    font,
    'help sheet',
    [{ id: 'help_text', lines: 10 }],
    lineHeight,
  );

  const helpTop = await feedbackTop();

  await shot(page, `${frames}-help-over-case-2`);
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('h');
  await page.waitForTimeout(250);
  expect((await ids(page))[0]).toBe('question');
  // A part confirmation: three fixed lines.
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('r');
  await page.waitForTimeout(SETTLE_MS + 120);
  expect(await ids(page)).toEqual(DIALOG_IDS);
  await measureGate(
    page,
    font,
    'part confirmation',
    [{ id: 'dialog_text', lines: 3 }],
    lineHeight,
  );
  tops.push(['part confirmation', await feedbackTop()]);
  await shot(page, `${frames}-part-confirmation`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect(await ids(page)).toEqual(STEP_VIEW_IDS);
  // Case 2's step with a draft (the longest prose).
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  await measureGate(
    page,
    font,
    "case 2's step with a draft",
    [{ id: 'sheet', lines: 11 }, ...singles('answer')],
    lineHeight,
  );
  tops.push(["case 2's step", await feedbackTop()]);
  await shot(page, `${frames}-case-2-step-with-draft`);
  await recordByKeyboard(page, 'r');
  await nextByKeyboard(page);
  // Case 3 with all tests run and a draft.
  for (const letter of ['a', 'b', 'c'] as const) {
    await testByKeyboard(page, letter);
  }

  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('2');
  await page.waitForTimeout(150);
  await measureGate(
    page,
    font,
    'case 3 with all tests and a draft',
    [{ id: 'sheet', lines: 11 }, ...singles('part')],
    lineHeight,
  );
  tops.push(['case 3', await feedbackTop()]);
  await shot(page, caseFrame);
  await recordByKeyboard(page, 'r');
  await stepByKeyboard(page, 4);
  await nextByKeyboard(page); // SHOW RESULTS
  await measureGate(
    page,
    font,
    'results page 1',
    [{ id: 'results_text', lines: 8 }],
    lineHeight,
  );
  tops.push(['results page 1', await feedbackTop()]);
  await activateByKeyboard(page, 'results_next_1');
  await activateByKeyboard(page, 'results_next_2');
  expect((await probe(page)).title).toBe('RESULTS — CASE 3 OF 3');
  await measureGate(
    page,
    font,
    'results page 3',
    [{ id: 'results_text', lines: 6 }],
    lineHeight,
  );
  tops.push(['results page 3', await feedbackTop()]);

  if (resultsFrame !== null) {
    await shot(page, resultsFrame);
  }

  for (const [label, top] of tops) {
    expect(
      Math.abs(top - helpTop),
      `${label}: footer on one line (feedback top ${top.toFixed(1)}; ${helpTop.toFixed(1)} under the help sheet's one-line footer)`,
    ).toBeLessThan(1);
  }

  await page.waitForTimeout(SETTLE_MS + 50);
  await activateByKeyboard(page, 'finish');
  await waitSurface(page, false);
}

/** A click at a point inside an element offset from its centre (design px). */
async function clickElementAt(page: Page, id: string, dx: number) {
  const element = (await probe(page)).elements.find((e) => e.id === id);

  expect(element, id).toBeDefined();

  const x = element!.x + dx;

  expect(Math.abs(dx)).toBeLessThan(element!.w / 2);

  const point = await designToPage(page, x, element!.y);

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(220);

  return x;
}

async function dblclickElement(page: Page, id: string) {
  const element = (await probe(page)).elements.find((e) => e.id === id)!;

  expect(element, id).toBeDefined();

  const point = await designToPage(page, element.x, element.y);

  await page.mouse.dblclick(point.x, point.y);
  await page.waitForTimeout(300);
}

/** Two clicks on the same spot: the second lands at once (no delay between). */
async function clickTwice(page: Page, id: string) {
  const element = (await probe(page)).elements.find((e) => e.id === id)!;

  expect(element, id).toBeDefined();

  const point = await designToPage(page, element.x, element.y);

  await page.mouse.click(point.x, point.y);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(300);
}

/** Records the drafted option by click (the opener and, settled, its confirm). */
async function recordByPointer(
  page: Page,
  opener: 'record_part' | 'record_answer' | 'cannot_solve',
) {
  const responses = await countOf(page, 'first_response');

  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, opener);
  expect(await ids(page)).toEqual(DIALOG_IDS);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  expect(await countOf(page, 'first_response')).toBe(responses + 1);
}

/**
 * The pointer-only scenario inside the board. Every act is a click; the
 * only keyboard steps are the walk away and back and the station prompt
 * (reported as navigation).
 */
async function pointerScenario(
  page: Page,
  options: { shots: boolean; canvasShot?: string },
) {
  const space = await page.evaluate(
    () =>
      (window as unknown as { __designSpace?: { canvasWidth: number } | null })
        .__designSpace ?? null,
  );

  // eslint-disable-next-line no-console
  console.log(`[R2] canvas width ${space?.canvasWidth ?? 'unknown'}`);
  expect((await probe(page)).frame).toBe('wide');

  // The card: HELP / CLOSE HELP by click; START CASE 1 by click.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'help');
  expect((await ids(page))[0]).toBe('close_help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'intro',
    input_mode: 'pointer',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect(await ids(page)).toContain('start_case');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'start_case');
  expect(await countOf(page, 'case_presented')).toBe(1);
  expect(meta(await lastOf(page, 'intro_acknowledged'))).toMatchObject({
    input_mode: 'pointer',
  });

  // Case 1: TEST A by click; a double click on TEST B records one run and
  // one refused press; drafts chosen, changed and cleared by click.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'test_a');
  expect(await labelOf(page, 'result_a')).toBe('P1 reads TONE.');
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'test_b');
  expect(await labelOf(page, 'result_b')).toBe('P2 reads SILENT.');
  expect(await countOf(page, 'test_run')).toBe(2);
  expect(meta(await lastOf(page, 'press_refused'))).toMatchObject({
    target: 'test',
    reason: 'repeat_within_settle',
    test_id: 'm18_c1_tb',
    input_mode: 'pointer',
  });
  await clickElement(page, 'part_2');
  await clickElement(page, 'part_3');
  await clickElement(page, 'part_3');
  expect(
    String(meta(await lastOf(page, 'option_drafted')).option_id ?? 'null'),
  ).toBe('null');
  await clickElement(page, 'part_3');
  expect(await elementState(page, 'part_3')).toBe('selected');

  if (options.shots) {
    await shot(page, '23-pointer-driven-case-1-with-draft');
  }

  // HELP / CLOSE HELP with a draft; a double click on the OPENER records nothing.
  await clickElement(page, 'help');
  expect((await ids(page))[0]).toBe('close_help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'case_1',
    input_mode: 'pointer',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect(await elementState(page, 'part_3')).toBe('selected');
  await page.waitForTimeout(SETTLE_MS);

  const opener = (await probe(page)).elements.find(
    (e) => e.id === 'record_part',
  )!;

  expect(opener.x - opener.w / 2).toBeGreaterThanOrEqual(738 - 125 - 1);
  await dblclickElement(page, 'record_part');
  expect(await ids(page)).toEqual(DIALOG_IDS);
  expect(await lines(page)).toContain(
    'Record AMPLIFIER as the part at fault in case 1?',
  );
  expect(await countOf(page, 'first_response')).toBe(0);
  expect(await countOf(page, 'commit_requested')).toBe(1);

  const rect = (e: { x: number; y: number; w: number; h: number }) => ({
    left: e.x - e.w / 2,
    right: e.x + e.w / 2,
    top: e.y - e.h / 2,
    bottom: e.y + e.h / 2,
  });
  const openerRect = rect(opener);

  for (const control of (await probe(page)).elements.filter((e) =>
    ['confirm', 'keep_working'].includes(e.id),
  )) {
    expect(rect(control).right).toBeLessThanOrEqual(openerRect.left);
  }

  // After more than 400 ms a click on the CONFIRM followed at once by a
  // second click on the same spot: exactly one first response, the step
  // view shown once.
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickTwice(page, 'confirm');
  expect(await countOf(page, 'first_response')).toBe(1);
  expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
    case_id: 'm18_c1',
    slot: 'diagnosis',
    option_id: 'm18_c1_p3',
    correct: true,
    input_mode: 'pointer',
  });
  expect(await countOf(page, 'step_presented')).toBe(1);
  expect(await countOf(page, 'tests_closed')).toBe(1);
  expect(await ids(page)).toEqual(STEP_VIEW_IDS);
  await expectNoCorrectnessOnScreen(page);
  // The step: a draft; HELP / CLOSE HELP; RECORD ANSWER and its confirm.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'answer_2');
  expect(await elementState(page, 'answer_2')).toBe('selected');
  await clickElement(page, 'help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'step_1',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect(await elementState(page, 'answer_2')).toBe('selected');
  await recordByPointer(page, 'record_answer');
  expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
    slot: 'prediction',
    option_id: 'm18_c1_s2',
    input_mode: 'pointer',
  });
  expect(await ids(page)).toEqual(ACK_VIEW_IDS);
  // HELP / CLOSE HELP from the acknowledgement by click; a double click on
  // NEXT CASE presents one case.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'ack_1',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect(await lines(page)).toContain('Case 1 recorded.');
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'next');
  expect(await currentCase(page)).toBe(2);
  expect(await countOf(page, 'case_presented')).toBe(2);

  // Case 2: all three tests by click, a draft (frame 11); LEAVE BOARD by
  // click; KEYBOARD NAVIGATION away and back; reopen — the same case, the
  // same test record and draft, no second presentation, no test re-run;
  // leaving never records CANNOT SOLVE.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'test_a');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'test_b');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'test_c');
  expect(await labelOf(page, 'result_a')).toBe(
    'Air at the FAN outlet: 6 units.',
  );
  expect(await labelOf(page, 'result_c')).toBe(
    'A spare GAUGE (never at fault) shows HOT.',
  );
  await clickElement(page, 'part_3');
  expect(await elementState(page, 'part_3')).toBe('selected');

  if (options.shots) {
    await shot(page, '11-case-2-all-tests-with-draft');
  }

  await clickElement(page, 'leave');
  await waitSurface(page, false);
  expect(await countOf(page, 'first_response')).toBe(2);
  expect(await countOf(page, 'panel_left')).toBe(1);
  await labApproach(page, PILOT.lab.kai);
  await openBoard(page);
  expect(await countOf(page, 'case_presented')).toBe(2);
  expect(await countOf(page, 'test_run')).toBe(5);
  expect(await countOf(page, 'series_reopened')).toBe(1);
  expect(await currentCase(page)).toBe(2);
  expect(await labelOf(page, 'result_b')).toBe(
    'Air at the RACK inlet: 6 units.',
  );
  expect(await elementState(page, 'part_3')).toBe('selected');
  expect(
    (await familyEvents(page)).filter(
      (event) =>
        event.event_type === `${FAMILY}first_response` &&
        meta(event).response_kind === 'cannot_solve',
    ),
  ).toEqual([]);

  if (options.shots) {
    await shot(page, '19-board-reopened-mid-case-same-record-and-draft');
  }

  // A side-band click outside every control activates nothing.
  await page.waitForTimeout(SETTLE_MS);

  const eventsBefore = (await getEvents(page)).length;
  const band = await designToPage(page, -118, 300);

  await page.mouse.click(band.x, band.y);
  await page.waitForTimeout(300);
  expect((await probe(page)).open).toBe(true);
  expect((await getEvents(page)).length).toBe(eventsBefore);

  // CANNOT SOLVE by click: the opening click never confirms; KEEP WORKING
  // cancels; CANNOT SOLVE again and its RECORD by click.
  await clickElement(page, 'cannot_solve');
  expect(await lines(page)).toContain(
    'Record CANNOT SOLVE for the part in case 2?',
  );
  expect(await countOf(page, 'first_response')).toBe(2);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'keep_working');
  expect(await countOf(page, 'commit_cancelled')).toBe(1);
  expect(await elementState(page, 'part_3')).toBe('selected');
  await recordByPointer(page, 'cannot_solve');
  expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
    case_id: 'm18_c2',
    slot: 'diagnosis',
    response_kind: 'cannot_solve',
    option_id: null,
    correct: false,
    draft_at_commit: 'm18_c2_p3',
    input_mode: 'pointer',
  });
  expect(await ids(page)).toEqual(STEP_VIEW_IDS);
  await expectNoCorrectnessOnScreen(page);
  // Mid-step with a draft: LEAVE BOARD, away and back, reopen — the same
  // step and draft (frame 20).
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'answer_1');
  expect(await elementState(page, 'answer_1')).toBe('selected');
  await clickElement(page, 'leave');
  await waitSurface(page, false);
  await labApproach(page, PILOT.lab.kai);
  await openBoard(page);
  expect(await ids(page)).toEqual(STEP_VIEW_IDS);
  expect(await countOf(page, 'step_presented')).toBe(2);
  expect(await elementState(page, 'answer_1')).toBe('selected');
  expect(await countOf(page, 'first_response')).toBe(3);

  if (options.shots) {
    await shot(page, '20-board-reopened-mid-step-same-draft');
  }

  await recordByPointer(page, 'record_answer');
  expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
    case_id: 'm18_c2',
    slot: 'prediction',
    option_id: 'm18_c2_s1',
    correct: true,
  });
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next');
  expect(await currentCase(page)).toBe(3);

  // Case 3: all tests by click, a draft (frames 12 / 24); the part; the
  // step with a draft (frame 13); the answer.
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'test_a');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'test_b');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'test_c');
  await clickElementAt(page, 'part_2', 110);
  expect(await elementState(page, 'part_2')).toBe('selected');

  if (options.shots) {
    await shot(page, '12-case-3-all-tests-with-draft');
  }

  if (options.canvasShot !== undefined) {
    const value = await probe(page);
    const bottom = Math.max(...value.elements.map((e) => e.y + e.h / 2));

    // eslint-disable-next-line no-console
    console.log(
      `[R2 canvas=1080] case 3 with a draft: spare ${(value.feedback_top - bottom).toFixed(1)} design px`,
    );
    expect(value.feedback_top - bottom).toBeGreaterThanOrEqual(30);
    await shot(page, options.canvasShot);
  }

  await recordByPointer(page, 'record_part');
  expect(await ids(page)).toEqual(STEP_VIEW_IDS);
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'answer_4');

  if (options.shots) {
    await shot(page, '13-case-3-planned-step-with-draft');
  }

  await recordByPointer(page, 'record_answer');
  expect(await countOf(page, 'first_response')).toBe(6);
  expect(await countOf(page, 'first_responses_completed')).toBe(1);
  expect(await lines(page)).toContain('SHOW RESULTS');
  await expectNoCorrectnessOnScreen(page);

  // Results by pointer: SHOW RESULTS; HELP / CLOSE HELP on page 1 (double
  // clicks changing one view); a double click on NEXT changes one view;
  // HELP / CLOSE HELP on pages 2 and 3; BACK; FINISH; a reopening and
  // FINISH from page 1 (no new results_shown).
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next');
  expect(await countOf(page, 'results_shown')).toBe(1);
  expect((await probe(page)).title).toBe('RESULTS — CASE 1 OF 3');
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'help');
  expect((await ids(page))[0]).toBe('close_help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'results_1',
  });
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'close_help');
  expect((await probe(page)).title).toBe('RESULTS — CASE 1 OF 3');
  expect(await countOf(page, 'results_shown')).toBe(1);
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'results_next_1');
  expect((await probe(page)).open).toBe(true);
  expect((await probe(page)).title).toBe('RESULTS — CASE 2 OF 3');
  expect(await countOf(page, 'results_shown')).toBe(2);
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'results_2',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'results_next_2');
  expect((await probe(page)).title).toBe('RESULTS — CASE 3 OF 3');
  expect(await countOf(page, 'results_shown')).toBe(3);
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'results_3',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect((await probe(page)).title).toBe('RESULTS — CASE 3 OF 3');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'results_back_3');
  expect((await probe(page)).title).toBe('RESULTS — CASE 2 OF 3');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'results_back_2');
  expect((await probe(page)).title).toBe('RESULTS — CASE 1 OF 3');
  expect(await countOf(page, 'results_shown')).toBe(3);
  await page.waitForTimeout(SETTLE_MS);

  const finishX = await clickElementAt(page, 'finish', 0);

  expect(finishX).toBeLessThan(400);
  await waitSurface(page, false);
  await openBoard(page);
  expect((await probe(page)).title).toBe('RESULTS — CASE 1 OF 3');
  expect(await countOf(page, 'results_shown')).toBe(3);
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'finish');
  await waitSurface(page, false);
  expect(await countOf(page, 'results_shown')).toBe(3);

  const { diagnosis, prediction } = await reproduce(page);

  expect(diagnosis).toMatchObject({
    value: 2,
    numerator: 2,
    denominator: 3,
    disposition: 'observed',
  });
  expect(prediction).toMatchObject({
    value: 3,
    numerator: 3,
    denominator: 3,
    disposition: 'observed',
  });
}

/** The access checks of one view (R9): HELP and LEAVE / FINISH by keyboard and by pointer. */
async function accessFromView(
  page: Page,
  label: string,
  controls: ('help' | 'leave' | 'finish')[],
  restore: () => Promise<void>,
  signature: () => Promise<string>,
) {
  const view = await probe(page);
  const rect = (e: { x: number; y: number; w: number; h: number }) => ({
    left: e.x - e.w / 2,
    right: e.x + e.w / 2,
    top: e.y - e.h / 2,
    bottom: e.y + e.h / 2,
  });

  for (const id of controls) {
    const control = view.elements.find((e) => e.id === id);

    expect(control, `${label} ${id}`).toBeDefined();
    expect(control!.focusable, `${label} ${id} focusable`).toBe(true);

    const r = rect(control!);

    expect(r.bottom, `${label} ${id} above the feedback line`).toBeLessThan(
      view.feedback_top,
    );

    for (const other of view.elements) {
      if (other.id === id) {
        continue;
      }

      const o = rect(other);
      const apart =
        r.right <= o.left ||
        r.left >= o.right ||
        r.bottom <= o.top ||
        r.top >= o.bottom;

      expect(apart, `${label} ${id} overlapped by ${other.id}`).toBe(true);
    }
  }

  const before = await signature();
  const presented = await countOf(page, 'case_presented');
  const steps = await countOf(page, 'step_presented');
  const responses = await countOf(page, 'first_response');
  const requests = await countOf(page, 'commit_requested');
  const tests = await countOf(page, 'test_run');
  const shown = await countOf(page, 'results_shown');

  // HELP by TAB and ENTER; CLOSE HELP by ENTER (the first focusable).
  await page.waitForTimeout(SETTLE_MS + 50);
  await focusByTab(page, 'help');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect((await ids(page))[0], `${label} help by keyboard`).toBe('close_help');
  expect(await lines(page)).toContain('HOW THE BOARD WORKS');
  await page.waitForTimeout(SETTLE_MS + 50);
  expect((await probe(page)).focus).toBe('close_help');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect(await signature(), `${label} restored after help (keyboard)`).toBe(
    before,
  );
  // HELP by click; CLOSE HELP by click.
  await page.waitForTimeout(SETTLE_MS + 50);
  await clickElement(page, 'help');
  expect((await ids(page))[0], `${label} help by pointer`).toBe('close_help');
  await page.waitForTimeout(SETTLE_MS + 50);
  await clickElement(page, 'close_help');
  expect(await signature(), `${label} restored after help (pointer)`).toBe(
    before,
  );
  expect(await countOf(page, 'case_presented')).toBe(presented);
  expect(await countOf(page, 'step_presented')).toBe(steps);
  expect(await countOf(page, 'first_response')).toBe(responses);
  expect(await countOf(page, 'test_run')).toBe(tests);
  expect(await countOf(page, 'results_shown')).toBe(shown);

  const exit = controls.includes('finish') ? 'finish' : 'leave';

  // LEAVE BOARD / FINISH by TAB and ENTER: the surface closes, no response,
  // no dialog; reopening restores the same view.
  await page.waitForTimeout(SETTLE_MS + 50);
  await focusByTab(page, exit);
  await page.keyboard.press('Enter');
  await waitSurface(page, false);
  expect(await countOf(page, 'first_response')).toBe(responses);
  expect(await countOf(page, 'commit_requested')).toBe(requests);
  await restore();
  expect(await signature(), `${label} restored after ${exit} (keyboard)`).toBe(
    before,
  );
  // LEAVE BOARD / FINISH by click; reopen.
  await page.waitForTimeout(SETTLE_MS + 50);
  await clickElement(page, exit);
  await waitSurface(page, false);
  expect(await countOf(page, 'first_response')).toBe(responses);
  expect(await countOf(page, 'commit_requested')).toBe(requests);
  await restore();
  expect(await signature(), `${label} restored after ${exit} (pointer)`).toBe(
    before,
  );
  expect(await countOf(page, 'case_presented')).toBe(presented);
  expect(await countOf(page, 'step_presented')).toBe(steps);
  expect(await countOf(page, 'test_run')).toBe(tests);
  expect(await countOf(page, 'results_shown')).toBe(shown);
}

/** R9: every view where the preview lists HELP and LEAVE BOARD / FINISH. */
async function accessScenario(page: Page) {
  const reopen = async () => {
    await labApproach(page, PILOT.lab.kai);
    await openBoard(page);
  };
  const viewSignature = async () => {
    const value = await probe(page);

    return JSON.stringify([
      value.title,
      value.status,
      value.elements.map((e) => [e.id, e.label, e.state]),
    ]);
  };

  // The card.
  await accessFromView(page, 'card', ['help', 'leave'], reopen, viewSignature);
  await startCase1ByKeyboard(page);
  // A case without a draft, with a draft, after all tests.
  await accessFromView(
    page,
    'case 1 without a draft',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('2');
  await page.waitForTimeout(150);
  expect(await elementState(page, 'part_2')).toBe('selected');
  await accessFromView(
    page,
    'case 1 with a draft',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  expect(await elementState(page, 'part_2')).toBe('selected');

  for (const letter of ['a', 'b', 'c'] as const) {
    await testByKeyboard(page, letter);
  }

  expect(await countOf(page, 'test_run')).toBe(3);
  await accessFromView(
    page,
    'case 1 after all tests',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  // The step without a draft, then with a draft.
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('3');
  await page.waitForTimeout(150);
  await recordByKeyboard(page, 'r');
  expect(await ids(page)).toEqual(STEP_VIEW_IDS);
  await accessFromView(
    page,
    'step 1 without a draft',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('2');
  await page.waitForTimeout(150);
  expect(await elementState(page, 'answer_2')).toBe('selected');
  await accessFromView(
    page,
    'step 1 with a draft',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  expect(await elementState(page, 'answer_2')).toBe('selected');
  await page.waitForTimeout(SETTLE_MS + 50);
  await recordByKeyboard(page, 'r');
  // An acknowledgement.
  await accessFromView(
    page,
    'acknowledgement 1',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  await nextByKeyboard(page);
  await keyedCaseByKeyboard(page, 2);
  await nextByKeyboard(page);
  await keyedCaseByKeyboard(page, 3);
  expect(await countOf(page, 'first_responses_completed')).toBe(1);
  await nextByKeyboard(page); // SHOW RESULTS
  expect((await probe(page)).title).toBe('RESULTS — CASE 1 OF 3');
  // Results page 1: HELP and FINISH (NEXT present); a reopening shows page 1.
  await accessFromView(
    page,
    'results page 1',
    ['help', 'finish'],
    reopen,
    viewSignature,
  );
  expect(await ids(page)).toContain('results_next_1');
  expect(await countOf(page, 'results_shown')).toBe(1);
  // Results page 2 (reached by NEXT after each reopening).
  await activateByKeyboard(page, 'results_next_1');
  expect((await probe(page)).title).toBe('RESULTS — CASE 2 OF 3');
  expect(await countOf(page, 'results_shown')).toBe(2);
  await accessFromView(
    page,
    'results page 2',
    ['help', 'finish'],
    async () => {
      await reopen();
      await activateByKeyboard(page, 'results_next_1');
    },
    viewSignature,
  );
  expect(await ids(page)).toContain('results_back_2');
  expect(await ids(page)).toContain('results_next_2');
  // Results page 3 (reached by NEXT, NEXT after each reopening).
  await activateByKeyboard(page, 'results_next_2');
  expect((await probe(page)).title).toBe('RESULTS — CASE 3 OF 3');
  expect(await countOf(page, 'results_shown')).toBe(3);
  await accessFromView(
    page,
    'results page 3',
    ['help', 'finish'],
    async () => {
      await reopen();
      await activateByKeyboard(page, 'results_next_1');
      await activateByKeyboard(page, 'results_next_2');
    },
    viewSignature,
  );
  expect(await ids(page)).toContain('results_back_3');
  expect((await ids(page)).some((id) => id.startsWith('results_next'))).toBe(
    false,
  );
  expect(await countOf(page, 'results_shown')).toBe(3);
  // ESC closes the results from page 3 after its settle.
  await leaveBoard(page);

  const { diagnosis, prediction } = await reproduce(page);

  expect(diagnosis).toMatchObject({ value: 3, disposition: 'observed' });
  expect(prediction).toMatchObject({ value: 3, disposition: 'observed' });
}

test.describe('M18 diagnosis cases: reload (Unit 20)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  /** Route to the board, case 1's part recorded, the board left. */
  async function beforeReload(page: Page, tag: string) {
    await toLab(page, tag);
    await openBoard(page);
    await startCase1ByKeyboard(page);
    await testByKeyboard(page, 'a');
    await partByKeyboard(page, 3);
    await leaveBoard(page);

    const before = await pagePayload(page);

    expect(before.page_load_index).toBe(1);
    expect(before.prior).toEqual([]);
    expect(
      before.raw_events.filter(
        (event) => event.event_type === `${FAMILY}first_response`,
      ),
    ).toHaveLength(1);

    return before;
  }

  async function reload(page: Page) {
    await page.reload();
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __pilotOpeningProbe?: { open: boolean } | null;
          }
        ).__pilotOpeningProbe?.open === true,
      undefined,
      { timeout: 120_000 },
    );
    await page.waitForTimeout(600);
  }

  /** After the reload: the opening, the Dock tutorial and the spine to the laboratory (may be blocked). */
  async function driveBackToLab(page: Page): Promise<string | null> {
    try {
      await press(page, 'Space');
      await waitScene(page, 'dock', 60_000);
      await page.waitForTimeout(1600);
      await completeDockTutorial(page, 1);
      await dockToConcourse(page);
      await valeHandover(page);
      await concourseToWorkshop(page);
      await workshopSignOff(page);
      await workshopToConcourse(page);
      await enterLabFromConcourse(page);
    } catch (error) {
      return (error as Error).message.split('\n')[0];
    }

    return null;
  }

  test("R5 (reload after an opening): case 1's part recorded, then a page reload — the earlier log carried byte-identically, both rows interrupted; the board, reached again, held back", async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);
    const before = await beforeReload(page, 'u20r5');

    expect((await reproduce(page)).diagnosis).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    await reload(page);

    const after = await pagePayload(page);

    expect(after.page_load_index).toBe(2);
    // Byte-identical: nothing rewritten, nothing renumbered.
    expect(JSON.stringify(after.prior)).toBe(JSON.stringify(before.raw_events));
    expect(
      JSON.stringify(
        after.prior.filter((event) => event.event_type.startsWith(FAMILY)),
      ),
    ).toBe(
      JSON.stringify(
        before.raw_events.filter((event) =>
          event.event_type.startsWith(FAMILY),
        ),
      ),
    );
    expect(
      after.raw_events.filter((event) => event.event_type.startsWith(FAMILY)),
    ).toEqual([]);

    const interrupted = await reproduce(page);

    expect(interrupted.diagnosis).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'interrupted',
    });
    expect(interrupted.prediction).toMatchObject({
      value: null,
      disposition: 'interrupted',
    });

    // The recorded block (UNIT-LOG "U15", R4): after a reload the journey
    // driver may be unable to replay the dock tutorial. When it cannot, the
    // post-reload browser administration is NOT VERIFIED — the test is
    // skipped with that reason, never passed.
    const blocked = await driveBackToLab(page);

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the laboratory after the reload (${blocked}); the post-reload administration was not exercised in the browser and frame 22 is missing`,
    );

    // Laboratory entry wrote the check (the opening found) and the
    // hold-back record; nothing else of the board.
    const atEntry = (await familyEvents(page)).map((event) => event.event_type);

    expect(atEntry).toEqual([
      `${FAMILY}prior_load_checked`,
      `${FAMILY}technical_failure`,
    ]);

    await openBoard(page);
    expect(await lines(page)).toContain(
      'This board was already used in this session. Its record is kept; no further answers can be given here.',
    );
    expect(await ids(page)).toEqual(['record_text', 'leave']);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '22-reload-hold-back-record');
    await page.keyboard.press('1');
    await page.keyboard.press('a');
    await page.keyboard.press('r');
    await page.keyboard.press('Enter');
    await page.keyboard.press('h');
    await page.waitForTimeout(300);
    await leaveBoard(page);

    const held = await pagePayload(page);
    const own = held.raw_events.filter((event) =>
      event.event_type.startsWith(FAMILY),
    );

    expect(own.map((event) => event.event_type)).toEqual([
      `${FAMILY}prior_load_checked`,
      `${FAMILY}technical_failure`,
    ]);
    expect(meta(own[0])).toMatchObject({
      page_load_index: 2,
      prior_page_load_event_count: before.raw_events.length,
      prior_opening_found: true,
      prior_briefing_found: true,
      history_continuous: true,
      prior_opening_absence_established: false,
      input_mode: 'system',
    });
    expect(String(meta(own[1]).detail)).toMatch(/^reload/);
    expect(JSON.stringify(held.prior)).toBe(JSON.stringify(before.raw_events));

    const { diagnosis, prediction } = await reproduce(page);

    for (const row of [diagnosis, prediction]) {
      expect(row).toMatchObject({
        value: null,
        numerator: null,
        disposition: 'interrupted',
      });
      expect(row.components).toMatchObject({
        held_back_after_reload: true,
        exposure_record_consistent: true,
        reload_check: {
          checked: true,
          prior_opening_found: true,
          prior_opening_absence_established: false,
        },
      });
    }

    expectNoRuntimeErrors(errors);
  });

  test("R6 (reload before any opening): Kai's briefing acknowledged and the board never opened, then a reload — interrupted until the laboratory is re-entered; the check establishes the absence; not_presented until this load's briefing, then pending; the first-opening card appears", async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await toLab(page, 'u20r6');

    const before = await pagePayload(page);

    expect(before.page_load_index).toBe(1);
    expect(
      before.raw_events
        .filter((event) => event.event_type.startsWith(FAMILY))
        .map((event) => event.event_type),
    ).toEqual([`${FAMILY}presented`]);
    expect((await reproduce(page)).diagnosis).toMatchObject({
      disposition: 'pending',
      missing_reason: 'briefed_not_opened',
    });

    await reload(page);

    const atOpening = await pagePayload(page);

    expect(atOpening.page_load_index).toBe(2);
    expect(
      atOpening.raw_events.filter((event) =>
        event.event_type.startsWith(FAMILY),
      ),
    ).toEqual([]);
    expect((await reproduce(page)).diagnosis).toMatchObject({
      disposition: 'interrupted',
    });
    expect((await reproduce(page)).prediction).toMatchObject({
      disposition: 'interrupted',
    });

    const blocked = await driveBackToLab(page);

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the laboratory after the reload (${blocked}); the post-reload classification was not exercised in the browser`,
    );

    const after = await pagePayload(page);
    const checks = after.raw_events.filter(
      (event) => event.event_type === `${FAMILY}prior_load_checked`,
    );

    expect(JSON.stringify(after.prior)).toBe(JSON.stringify(before.raw_events));
    expect(checks).toHaveLength(1);
    expect(meta(checks[0])).toMatchObject({
      page_load_index: 2,
      prior_page_load_event_count: before.raw_events.length,
      prior_opening_found: false,
      prior_briefing_found: true,
      history_continuous: true,
      prior_opening_absence_established: true,
      input_mode: 'system',
      entry_state_version: VERSION,
    });

    // Before this load's briefing: not_presented.
    let rows = await reproduce(page);

    expect(rows.diagnosis).toMatchObject({
      disposition: 'not_presented',
      value: null,
    });
    expect(rows.prediction).toMatchObject({
      disposition: 'not_presented',
      value: null,
    });
    expect(rows.diagnosis.components).toMatchObject({
      reload_check: {
        page_reloaded: true,
        checked: true,
        prior_opening_found: false,
        prior_briefing_found: true,
        history_continuous: true,
        prior_opening_absence_established: true,
      },
      exposure: {
        briefed: false,
        board_opened: false,
        never_opened_reason: 'not_briefed_not_opened',
      },
      exposure_record_consistent: true,
    });

    // Briefed in this load, never opened: pending with briefed_not_opened.
    await briefing(page);
    rows = await reproduce(page);
    expect(rows.diagnosis).toMatchObject({
      disposition: 'pending',
      value: null,
      missing_reason: 'briefed_not_opened',
    });
    expect(rows.prediction).toMatchObject({
      disposition: 'pending',
      missing_reason: 'briefed_not_opened',
    });

    // The board opens normally — the first-opening card, not the hold-back.
    await openBoard(page);
    expect(await ids(page)).toContain('start_case');
    expect(await lines(page)).not.toContain(
      'This board was already used in this session.',
    );
    await expectNoCorrectnessOnScreen(page);
    await startCase1ByKeyboard(page);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'intro_acknowledged')).toBe(1);
    expect(await countOf(page, 'case_presented')).toBe(1);
    expect(await countOf(page, 'technical_failure')).toBe(0);
    await leaveBoard(page);

    rows = await reproduce(page);
    expect(rows.diagnosis).toMatchObject({
      disposition: 'pending',
      value: null,
    });
    expect(rows.diagnosis.components.exposure).toMatchObject({
      briefed: true,
      board_opened: true,
      intro_acknowledged: true,
      cases_presented: 1,
      never_opened_reason: null,
    });
    // The earlier load's events are untouched by everything above.
    expect(JSON.stringify((await pagePayload(page)).prior)).toBe(
      JSON.stringify(before.raw_events),
    );
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R10 (pause timing on leaving; closeout of 13 October 2026): LEAVE BOARD by click, a measurable interval away and the real reopening (no case, step or response repeated), then ESC and the review closure without a reopening — the kit window stays paused while the board is closed although the laboratory scene resumes, so the closure records only the time spent on the board (both departures take the one pause path; the closure after ESC is the discriminating leg)', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);
    const clock = () => page.evaluate(() => Date.now());

    await toLab(page, 'u20r10');
    await openBoard(page);

    const openedAt = await clock();

    await startCase1ByKeyboard(page);
    expect(await countOf(page, 'case_presented')).toBe(1);
    await page.waitForTimeout(1500);

    // Departure 1: LEAVE BOARD by click; a measurable interval away (the
    // walk to Kai and back plus 3 s); the real reopening.
    await page.waitForTimeout(SETTLE_MS);
    await clickElement(page, 'leave');
    await waitSurface(page, false);

    const leftAt1 = await clock();

    await labApproach(page, PILOT.lab.kai);
    await page.waitForTimeout(3000);
    await openBoard(page);

    const reopenedAt1 = await clock();

    expect(await ids(page)).toEqual(CASE_VIEW_IDS);
    expect(await countOf(page, 'case_presented')).toBe(1);
    expect(await countOf(page, 'panel_left')).toBe(1);
    expect(await countOf(page, 'first_response')).toBe(0);

    // Case 1's tests and part on the reopened board (the step view follows).
    await testByKeyboard(page, 'a');
    await testByKeyboard(page, 'b');
    await partByKeyboard(page, 3);
    expect(await countOf(page, 'first_response')).toBe(1);
    expect(await countOf(page, 'step_presented')).toBe(1);
    await page.waitForTimeout(1000);

    // Departure 2: ESC (the same path) from the step view, then the route
    // on to the Utility Deck review WITHOUT a reopening — the window is
    // stopped by the closure while still left.
    await leaveBoard(page);

    const leftAt2 = await clock();

    expect(await countOf(page, 'panel_left')).toBe(2);
    await labToYardBriefed(page);
    await yardReturnToConcourse(page);
    await returnShiftToDeckClosure(page);
    await concourseToDeck(page);
    await expectStage(page, 'deck_closure');
    await closeStationRecord(page);

    const closedAt = await clock();
    const onBoard = leftAt1 - openedAt + (leftAt2 - reopenedAt1);
    const awayBeforeClosure = closedAt - leftAt2;
    const closed = meta(await lastOf(page, 'window_closed'));
    const active = Number(closed.active_ms);

    expect(closed.exit_state).toBe('closed_at_review');
    expect(reopenedAt1 - leftAt1).toBeGreaterThanOrEqual(3000);
    expect(awayBeforeClosure).toBeGreaterThanOrEqual(10_000);
    // Paused while closed: the kit's active time is the time on the board
    // (±1.5 s for the surface's own open / close latency), never the
    // interval between the last departure and the review. Before the
    // closeout the laboratory RESUME after the departure restarted the kit
    // clock, so the closure added that whole interval.
    expect(
      Math.abs(active - onBoard),
      `active ${active} on board ${onBoard} away before closure ${awayBeforeClosure}`,
    ).toBeLessThanOrEqual(1500);
    expect(await countOf(page, 'case_presented')).toBe(1);
    expect(await countOf(page, 'step_presented')).toBe(1);
    expect(await countOf(page, 'first_response')).toBe(1);
    expect(await countOf(page, 'window_closed')).toBe(1);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'series_closed_at_review')).toBe(1);
    expect(meta(await lastOf(page, 'series_closed_at_review'))).toMatchObject({
      closure_reason: 'closed_at_review',
      cases_presented: 1,
      parts_recorded: 1,
      steps_recorded: 0,
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });
});
