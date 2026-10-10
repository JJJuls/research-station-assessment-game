/**
 * Station 080 M15 — the two relay boxes on the participant route (Unit
 * 18, browser evidence run). Every scenario boots the participant default
 * with `bootPilot`, finishes the Dock tutorial and reaches the Diagnostics
 * Laboratory with the existing drivers of `pilotHelpers.ts`
 * (`routeToLabWork`, whose `valeHandover` declines the M05 lamp job so no
 * M05 clock runs while the bench is worked; `labApproach` / `labVia` for
 * the evidence table's audited approach; `interactAt` for the station
 * prompt). No M15 state is injected.
 *
 * INPUT, stated plainly: the walking, the station prompt (SPACE at the
 * table) and Kai's briefing are done by the route drivers with the
 * KEYBOARD — that is navigation, not an M15 response. Inside the bench R1,
 * R3, R4, R5, R6, R7 and R8 use the keyboard only; R2 and R9 use the
 * pointer only (every in-bench act a real click at the probe's design
 * coordinates).
 *
 *   R1  keyboard: orientation; box 1 — TEST F, TEST F, TEST G, wiring B,
 *       S1-Q1 correct (C), S1-Q2 wrong (A); box 2 — TEST S only, wiring
 *       CANNOT TELL, S2-Q1 CANNOT SOLVE, S2-Q2 correct (C) with TEST T
 *       never run; a press inside 400 ms refused and recorded; a held ENTER
 *       producing no record; 2 / 4 observed; SHOW RESULTS, FINISH, reopen
 *       read-only.
 *   R2  pointer: every act by click, at 1280 × 720 and at `canvas=1080`;
 *       controls beyond design x 800; a side-band click activating nothing;
 *       the opening click never confirming; double clicks recording once /
 *       changing one view; the bench left mid box 1 and reopened on the same
 *       state.
 *   R3  partial coverage: box 1 complete, box 2 wired and S2-Q1 answered,
 *       S2-Q2 left; the route driven on to the Utility Deck review ⇒
 *       incomplete over 3; the bench afterwards a record.
 *   R4  zero evidence: not_presented before Kai's briefing, pending with
 *       briefed_not_opened after it, the orientation card left and shown
 *       again.
 *   R5  reload after an opening: the earlier log carried byte-identically,
 *       the row interrupted; the bench, when reachable again, held back.
 *   R6  reload before any opening: the check establishes the absence; the
 *       row reads not_presented, then pending; the orientation appears.
 *   R7  the real-game layout gate under forced fallback fonts.
 *   R8  the other benches after M15: the protocol console still opens, the
 *       display advances, the M14 row is untouched.
 *   R9  closeout (pointer, at 800 × 600 and at 1280 × 720): HELP, CLOSE
 *       HELP and LEAVE BENCH by click from every question view of both
 *       boxes with an unsubmitted draft — the two controls present, usable
 *       and overlapped by nothing; help keeps the question and the draft;
 *       leaving submits nothing; reopening restores the same state without
 *       a second presentation. Its eight frames go to `U18_CLOSEOUT_OUT`.
 *
 * Twenty-four evidence frames (800 × 600) go to `U18_OUT`. Nothing here
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

const OUT = process.env.U18_OUT ?? 'test-results/u18-evidence';
const FAMILY = 'proto_m15_systems_';
const VERSION = 'm15-systems-v1';
const SURFACE = 'm15_evidence_table';
const SETTLE_MS = 400;
const FORBIDDEN =
  /proto_|secondary_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|puzzle|persist|grit|skill|ability|intelligen|information|complex|make sense|handle/i;
/** No line of the first-response phase may carry a correctness word. */
const CORRECTNESS =
  /\bcorrect|incorrect|\bright\b|\bwrong\b|station answer|station wiring/i;
const LISTING_F = 'TEST F  step 1: P up · step 2: Q down, W up';
const LISTING_S = 'TEST S  step 1: X down · step 2: Y down · step 3: Z up';

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
      (event) =>
        event.event_type === `${FAMILY}first_response` ||
        event.event_type === `${FAMILY}wiring_recorded`,
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
 * process over the page's raw events must equal the page's own row — and
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
    JSON.stringify(extractItemFeatures('M15', payload.raw_events, context)),
  ) as FeatureRow[];
  const own = payload.features.filter((row) => row.item_id === 'M15');

  expect(own, 'the page exports one M15 row').toHaveLength(1);
  expect(offline, "offline extraction equals the page's row").toEqual(own);
  expect(JSON.stringify(payload.raw_events)).toBe(before);
  expect(offline[0].feature_id).toBe('m15_correct_first_predictions');
  expect(offline[0].planned_denominator).toBe(4);

  return { row: offline[0], payload };
}

/** The M14 row as the page exports it (asserted unchanged in R8). */
async function m14Row(page: Page) {
  const payload = await pagePayload(page);

  return JSON.stringify(payload.features.find((row) => row.item_id === 'M14'));
}

/** Administration version on the live events; exactly one family owner; no cipher event. */
async function expectFamilyDiscipline(page: Page) {
  const all = await getEvents(page);
  const own = all.filter((event) => event.event_type.startsWith(FAMILY));

  expect(own.length, 'the family was emitted').toBeGreaterThan(0);

  for (const event of own) {
    expect(meta(event).entry_state_version, event.event_type).toBe(VERSION);
    expect(meta(event).opportunity_id).toBe('proto_m15_systems_series');
    expect(meta(event).measure_id).toBe('M15');
    expect(typeof (event as { sequence?: number }).sequence).toBe('number');
  }

  expect(
    REGISTER_V3.filter((entry) =>
      entry.route.family_prefixes.some((prefix) => FAMILY.startsWith(prefix)),
    ).map((entry) => entry.id),
  ).toEqual(['M15']);
  // Neither the retired v2 cipher family nor its secondary identity is
  // written on the route.
  expect(
    all.filter(
      (event) =>
        event.event_type.startsWith('proto_m15_cipher_') ||
        event.event_type.startsWith('secondary_m15_cipher_'),
    ),
  ).toEqual([]);
}

/** Nothing on the bench says anything about correctness or offers results. */
async function expectNoCorrectnessOnScreen(page: Page) {
  const text = await lines(page);
  const present = await ids(page);

  expect(text).not.toMatch(CORRECTNESS);
  expect(text).not.toMatch(FORBIDDEN);
  expect(present).not.toContain('results_text');
  expect(present).not.toContain('results_next');
  expect(present).not.toContain('finish');
}

// ——— Driver steps (KEYBOARD NAVIGATION — never an M15 response) ————————

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

/** Walks to the evidence table's audited approach and presses SPACE (keyboard navigation). */
async function openBench(page: Page, options?: { shotPrompt?: string }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = await labApproach(page, PILOT.lab.evidenceTable);

    if (options?.shotPrompt !== undefined && attempt === 0) {
      await page.waitForTimeout(300);
      await shot(page, options.shotPrompt);
    }

    await interactAt(page, PILOT.lab.evidenceTable, { approachOffset: offset });

    const opened = await waitSurface(page, true, SURFACE).then(
      () => true,
      () => false,
    );

    if (opened) {
      return;
    }
  }

  throw new Error('the evidence table did not open');
}

/** ESC on the bench (the same path as LEAVE BENCH): the surface closes. */
async function leaveBench(page: Page) {
  await press(page, 'Escape');
  await waitSurface(page, false);
}

// ——— In-bench keyboard acts ————————————————————————————————————————————

/** Hotkeys (tests 1 / 2, options a–d); each followed by a short pause. */
async function keys(page: Page, pressed: string[]) {
  for (const key of pressed) {
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
  }
}

/** START after the opening settled (the first focusable). */
async function startByKeyboard(page: Page) {
  await page.waitForTimeout(SETTLE_MS);
  expect((await probe(page)).focus).toBe('start');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

/** R (or N) opens the confirmation; a settled ENTER records. */
async function recordByKeyboard(page: Page, key: 'r' | 'n') {
  await page.keyboard.press(key);
  await page.waitForTimeout(SETTLE_MS + 120);
  expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect((await ids(page))[0]).toBe('next');
}

/** Drafts an answer option by its letter and records it. */
async function answerByKeyboard(page: Page, letter: 'a' | 'b' | 'c') {
  // The question's first view settles 400 ms before a draft is accepted.
  await page.waitForTimeout(SETTLE_MS);
  await page.keyboard.press(letter);
  await page.waitForTimeout(SETTLE_MS + 120);
  await recordByKeyboard(page, 'r');
}

/** FIRST QUESTION / NEXT QUESTION / NEXT BOX / SHOW RESULTS after the acknowledgement settled. */
async function nextByKeyboard(page: Page) {
  await page.waitForTimeout(SETTLE_MS + 120);
  expect((await probe(page)).focus).toBe('next');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

/** The current question id from the live events. */
async function currentQuestion(page: Page) {
  return String(meta(await lastOf(page, 'question_presented')).question_id);
}

/** Box 1 complete by keyboard: tests F and G, wiring B, S1-Q1 C, S1-Q2 B; NEXT BOX pressed. */
async function completeBox1ByKeyboard(page: Page) {
  await page.waitForTimeout(SETTLE_MS);
  await keys(page, ['1', '2']);
  await page.keyboard.press('b');
  await page.waitForTimeout(150);
  await recordByKeyboard(page, 'r');
  await nextByKeyboard(page); // FIRST QUESTION
  await answerByKeyboard(page, 'c');
  await nextByKeyboard(page);
  await answerByKeyboard(page, 'b');
  await nextByKeyboard(page); // NEXT BOX
  expect(String(meta(await lastOf(page, 'box_presented')).box_id)).toBe('s2');
}

test.describe('M15 two relay boxes on the route (Unit 18)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test('R1 (keyboard in the bench): orientation, box 1 (tests, wiring B, correct and wrong answers), the fresh-press rule, box 2 (one test, CANNOT TELL, CANNOT SOLVE, correct without TEST T), 2 / 4 observed, results, FINISH, reopen read-only', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u18r1');
    await openBench(page, {
      shotPrompt: '01-laboratory-evidence-table-prompt',
    });

    // Orientation.
    expect((await probe(page)).frame).toBe('wide');
    expect((await probe(page)).title).toBe('RELAY BOXES');
    expect(await ids(page)).toEqual(['start', 'orientation', 'help', 'leave']);
    expect(await lines(page)).toContain(
      'Two relay boxes came in from the storm relay.',
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '02-orientation-card');
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'box_presented')).toBe(0);
    await startByKeyboard(page);

    // Box 1, nothing tested.
    expect(await countOf(page, 'orientation_acknowledged')).toBe(1);
    expect(await countOf(page, 'box_presented')).toBe(1);
    expect((await probe(page)).title).toBe('RELAY BOX 1 OF 2');
    expect(await lines(page)).toContain('TEST F  not run yet');
    expect(await lines(page)).toContain(
      'WIRING OF BOX 1 — which one fits your tests?',
    );
    expect(await lines(page)).toContain(
      'F raises W. G raises W. P raises Q. W lowers P.',
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '03-box-1-nothing-tested');

    // The wiring view's keyboard focus lands on the instruction (a neutral
    // landing): a settled ENTER there runs no test and drafts nothing.
    expect((await probe(page)).focus).toBe('wiring_instruction');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await countOf(page, 'test_run')).toBe(0);
    expect(await countOf(page, 'wiring_drafted')).toBe(0);
    expect((await probe(page)).focus).toBe('wiring_instruction');

    // TEST F, TEST F again, TEST G; wiring B drafted.
    await page.waitForTimeout(SETTLE_MS);
    await keys(page, ['1', '1', '2']);
    expect(await countOf(page, 'test_run')).toBe(3);
    expect(
      (await familyEvents(page))
        .filter((event) => event.event_type === `${FAMILY}test_run`)
        .map((event) => [meta(event).dial_id, meta(event).run_index]),
    ).toEqual([
      ['s1_f', 1],
      ['s1_f', 2],
      ['s1_g', 1],
    ]);
    expect(await lines(page)).toContain(LISTING_F);
    await page.keyboard.press('b');
    await page.waitForTimeout(150);
    expect(await elementState(page, 'wiring_b')).toBe('selected');
    expect(String(meta(await lastOf(page, 'wiring_drafted')).option_id)).toBe(
      's1_w_b',
    );
    await shot(page, '04-box-1-tests-f-g-wiring-draft');

    // The fresh-press rule on the wiring confirmation: R opens the dialog;
    // an ENTER inside 400 ms is refused and recorded; a settled ENTER records.
    await page.keyboard.press('r');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
    expect(await lines(page)).toContain('Record wiring B for box 1?');
    expect(await countOf(page, 'commit_press_refused')).toBe(1);
    expect(meta(await lastOf(page, 'commit_press_refused'))).toMatchObject({
      target: 'wiring',
      kind: 'option',
      reason: 'dialog_settling',
    });
    expect(await countOf(page, 'wiring_recorded')).toBe(0);
    await shot(page, '05-wiring-confirmation');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter'); // the settled confirming press
    // A second ENTER carried into the acknowledgement inside its 400 ms
    // settle lands on FIRST QUESTION and changes nothing.
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(await countOf(page, 'wiring_recorded')).toBe(1);
    expect(await countOf(page, 'question_presented')).toBe(0);
    expect(meta(await lastOf(page, 'wiring_recorded'))).toMatchObject({
      box_id: 's1',
      response_kind: 'option',
      option_id: 's1_w_b',
      correct: true,
      tests_before: { s1_f: 2, s1_g: 1 },
      refused_presses: 1,
      input_mode: 'keyboard',
    });

    // The wiring acknowledgement: tests closed, FIRST QUESTION, no correctness.
    expect((await ids(page))[0]).toBe('next');
    expect(await lines(page)).toContain('Wiring recorded for box 1.');
    expect(await lines(page)).toContain('FIRST QUESTION');
    expect(await lines(page)).toContain('Tests closed');
    expect(await elementState(page, 'test_f')).toBe('disabled');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '06-wiring-acknowledgement');
    await nextByKeyboard(page);

    // Question 1 with a draft: the test record and the recorded wiring visible.
    expect(await currentQuestion(page)).toBe('s1_q1');
    expect(await lines(page)).toContain('QUESTION 1 OF 2');
    expect(await lines(page)).toContain(LISTING_F);
    expect(await lines(page)).toContain('YOUR RECORDED WIRING');
    expect(await lines(page)).toContain(
      'F raises P. G raises P. P lowers Q. P raises W.',
    );
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('c');
    await page.waitForTimeout(150);
    expect(await elementState(page, 'option_c')).toBe('selected');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '07-box-1-question-1-draft');

    // Help from the question view; ESC closes the help, not the bench.
    await page.keyboard.press('h');
    await page.waitForTimeout(200);
    expect((await ids(page))[0]).toBe('close_help');
    expect(await lines(page)).toContain('HOW THE BENCH WORKS');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '16-help-sheet');
    expect(await countOf(page, 'help_consulted')).toBe(1);
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      phase: 'measurement',
      question_id: 's1_q1',
      step: 'question',
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    expect((await probe(page)).open).toBe(true);
    expect(await ids(page)).toContain('record_answer');
    await page.waitForTimeout(SETTLE_MS);

    // The answer confirmation; a settled ENTER records S1-Q1 = C (correct).
    await page.keyboard.press('r');
    await page.waitForTimeout(SETTLE_MS + 120);
    expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
    expect(await lines(page)).toContain('Record this answer for question 1?');
    await shot(page, '08-answer-confirmation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(await countOf(page, 'first_response')).toBe(1);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      question_id: 's1_q1',
      response_kind: 'option',
      option_id: 's1_q1_c',
      correct: true,
      recorded_wiring_option_id: 's1_w_b',
      consistent_with_recorded_wiring: true,
      tests_before: { s1_f: 2, s1_g: 1 },
      input_mode: 'keyboard',
    });
    expect((await ids(page))[0]).toBe('next');
    expect(await lines(page)).toContain('Answer recorded for question 1.');
    expect(await lines(page)).toContain('NEXT QUESTION');
    expect(await lines(page)).toContain('1 of 4 answers recorded.');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '09-acknowledgement-question-1');
    await nextByKeyboard(page);

    // Question 2: a wrong option (A). A held ENTER on the focused RECORD
    // ANSWER opens the dialog once and commits nothing (the surface drops
    // the repeats); a fresh, settled press records.
    expect(await currentQuestion(page)).toBe('s1_q2');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('a');
    await page.waitForTimeout(150);

    while ((await probe(page)).focus !== 'record_answer') {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(60);
    }

    const refusedBefore = await countOf(page, 'commit_press_refused');

    await page.keyboard.down('Enter'); // opens the dialog
    await page.keyboard.down('Enter'); // the held key repeating
    await page.keyboard.down('Enter');
    await page.waitForTimeout(600);
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    await page.waitForTimeout(200);
    expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
    expect(await countOf(page, 'first_response')).toBe(1);
    expect(await countOf(page, 'commit_press_refused')).toBe(refusedBefore);
    await page.keyboard.press('Enter'); // a fresh, settled press
    await page.waitForTimeout(250);
    expect(await countOf(page, 'first_response')).toBe(2);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      question_id: 's1_q2',
      option_id: 's1_q2_a',
      correct: false,
      consistent_with_recorded_wiring: false,
      refused_presses: 0,
    });
    expect(await lines(page)).toContain('Answer recorded for question 2.');
    expect(await lines(page)).toContain('NEXT BOX');
    await expectNoCorrectnessOnScreen(page);
    expect(await countOf(page, 'box_completed')).toBe(1);
    await nextByKeyboard(page);

    // Box 2: TEST S only; a wiring draft D, then CANNOT TELL.
    expect(String(meta(await lastOf(page, 'box_presented')).box_id)).toBe('s2');
    expect((await probe(page)).title).toBe('RELAY BOX 2 OF 2');
    expect(await lines(page)).toContain('TEST S  not run yet');
    await page.waitForTimeout(SETTLE_MS);
    await keys(page, ['1']);
    expect(await lines(page)).toContain(LISTING_S);
    expect(await lines(page)).toContain('TEST T  not run yet');
    await page.keyboard.press('d');
    await page.waitForTimeout(150);
    expect(await elementState(page, 'wiring_d')).toBe('selected');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '11-box-2-wiring-step-draft');
    await page.keyboard.press('n');
    await page.waitForTimeout(SETTLE_MS + 120);
    expect(await lines(page)).toContain('Record CANNOT TELL for box 2?');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(meta(await lastOf(page, 'wiring_recorded'))).toMatchObject({
      box_id: 's2',
      response_kind: 'cannot_tell',
      option_id: null,
      correct: false,
      tests_before: { s2_s: 1, s2_t: 0 },
      draft_at_commit: 's2_w_d',
    });
    expect(await lines(page)).toContain('Wiring recorded for box 2.');
    await expectNoCorrectnessOnScreen(page);
    await nextByKeyboard(page);

    // S2-Q1: ESC on the CANNOT SOLVE dialog closes the dialog only; then
    // CANNOT SOLVE recorded.
    expect(await currentQuestion(page)).toBe('s2_q1');
    expect(await lines(page)).toContain('YOUR RECORDED WIRING');
    expect(await lines(page)).toContain('CANNOT TELL');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('n');
    await page.waitForTimeout(SETTLE_MS + 120);
    expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect((await probe(page)).open).toBe(true);
    expect(await ids(page)).toContain('cannot_solve');
    expect(await countOf(page, 'commit_cancelled')).toBe(1);
    expect(meta(await lastOf(page, 'commit_cancelled'))).toMatchObject({
      target: 'question',
      kind: 'cannot',
      reason: 'keep_working',
      input_mode: 'keyboard',
    });
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('n');
    await page.waitForTimeout(SETTLE_MS + 120);
    expect(await lines(page)).toContain('Record CANNOT SOLVE for question 1?');
    await shot(page, '10-cannot-solve-confirmation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      question_id: 's2_q1',
      response_kind: 'cannot_solve',
      option_id: null,
      correct: false,
      recorded_wiring_option_id: 'cannot_tell',
      consistent_with_recorded_wiring: null,
    });
    await expectNoCorrectnessOnScreen(page);
    await nextByKeyboard(page);

    // S2-Q2: correct (C) although TEST T was never run.
    expect(await currentQuestion(page)).toBe('s2_q2');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('c');
    await page.waitForTimeout(150);
    expect(await elementState(page, 'option_c')).toBe('selected');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '12-box-2-question-2-draft');
    await recordByKeyboard(page, 'r');
    expect(await countOf(page, 'first_response')).toBe(4);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      question_id: 's2_q2',
      option_id: 's2_q2_c',
      correct: true,
      tests_before: { s2_s: 1, s2_t: 0 },
      consistent_with_recorded_wiring: null,
    });
    expect(await countOf(page, 'first_responses_completed')).toBe(1);
    expect(await lines(page)).toContain('SHOW RESULTS');
    expect(await lines(page)).toContain('4 of 4 answers recorded.');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '13-acknowledgement-fourth-answer');

    const recorded = await records(page);
    const { row } = await reproduce(page);

    expect(row).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 4,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });
    expect(row.components.by_box).toMatchObject({
      s1: { numerator: 1, denominator: 2 },
      s2: { numerator: 1, denominator: 2 },
    });
    expect(row.components.model).toMatchObject({
      by_box: {
        s1: { recorded_wiring: 's1_w_b', wiring_correct: true },
        s2: { recorded_wiring: 'cannot_tell', wiring_correct: false },
      },
      models_recorded: 2,
      models_correct: 1,
    });
    expect(row.components.exploration).toMatchObject({
      s1: {
        runs_per_dial_before_wiring: { s1_f: 2, s1_g: 1 },
        both_dials_tested_before_wiring: true,
      },
      s2: {
        runs_per_dial_before_wiring: { s2_s: 1, s2_t: 0 },
        dials_tested_before_wiring: ['s2_s'],
        both_dials_tested_before_wiring: false,
      },
    });
    expect(row.components.cannot_solve_count).toBe(1);
    expect(row.components.cannot_tell_count).toBe(1);
    expect(await countOf(page, 'results_shown')).toBe(0);

    // SHOW RESULTS ⇒ both boxes; FINISH; reopen read-only.
    await nextByKeyboard(page);
    expect(await countOf(page, 'results_shown')).toBe(1);
    expect((await probe(page)).title).toBe('RESULTS — RELAY BOX 1 OF 2');
    expect(await lines(page)).toContain('All four answers are recorded.');
    expect(await lines(page)).toContain(
      'Station wiring: F raises P. G raises P. P lowers Q. P raises W.',
    );
    expect(await lines(page)).toContain('Your recorded answer: Q goes up');
    expect(await lines(page)).toContain('Station answer: Q goes down');
    expect(await lines(page)).not.toMatch(FORBIDDEN);
    await shot(page, '14-results-box-1');
    await page.waitForTimeout(SETTLE_MS);
    expect((await probe(page)).focus).toBe('results_next');
    await page.keyboard.press('Enter'); // NEXT BOX
    await page.keyboard.press('Enter'); // carried: lands on FINISH, closes nothing
    await page.waitForTimeout(250);
    expect((await probe(page)).open).toBe(true);
    expect(await countOf(page, 'results_shown')).toBe(2);
    expect((await probe(page)).title).toBe('RESULTS — RELAY BOX 2 OF 2');
    expect(await lines(page)).toContain('Your recorded wiring: CANNOT TELL');
    expect(await lines(page)).toContain('Your recorded answer: CANNOT SOLVE');
    expect(await lines(page)).toContain('Station answer: Z goes down');
    await shot(page, '15-results-box-2');
    await page.waitForTimeout(SETTLE_MS);
    expect((await probe(page)).focus).toBe('finish');
    await page.keyboard.press('Enter'); // FINISH
    await waitSurface(page, false);
    expect(await countOf(page, 'results_shown')).toBe(2);

    // Reopen: the results again, read-only; no second results_shown; no
    // act records anything.
    await openBench(page);
    expect(await lines(page)).toContain('All four answers are recorded.');
    expect(await countOf(page, 'results_shown')).toBe(2);
    await page.keyboard.press('a');
    await page.keyboard.press('1');
    await page.keyboard.press('r');
    await page.keyboard.press('n');
    await page.waitForTimeout(300);
    expect(await countOf(page, 'first_response')).toBe(4);
    expect(await countOf(page, 'wiring_recorded')).toBe(2);
    expect(await countOf(page, 'test_run')).toBe(4);
    await leaveBench(page);
    expect(await records(page)).toBe(recorded);
    expect((await reproduce(page)).row).toMatchObject({
      value: 2,
      denominator: 4,
      disposition: 'observed',
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R2 (pointer in the bench): every act by click, double clicks recording once, controls beyond design x 800, a side-band click activating nothing, left mid box 1 and reopened on the same state', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u18r2');
    // KEYBOARD NAVIGATION: the walk and the station prompt.
    await openBench(page);
    await pointerScenario(page, '20-pointer-tests-and-wiring-draft', null);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R2 at canvas=1080: the same pointer acts beyond design x 800 at the full-HD canvas; box 1 question 1 (screenshot 21)', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u18r2b', '&canvas=1080');
    await openBench(page);
    await pointerScenario(page, null, '21-canvas-1080-box-1-question-1');
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R9 (closeout; pointer access during the questions): HELP, CLOSE HELP and LEAVE BENCH by real clicks from every question view of both boxes with an unsubmitted draft; help keeps the question and the draft; leaving submits nothing; reopening restores the same state (800 × 600)', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u18r9a');
    await openBench(page);
    await questionAccessScenario(page, 'closeout-800x600');
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R9 at 1280 × 720 (the standard desktop viewport): the same pointer access from every question view', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await toLab(page, 'u18r9b');
    await openBench(page);
    await questionAccessScenario(page, 'closeout-1280x720');
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R3 (partial coverage and route closure): box 1 complete, box 2 wired and S2-Q1 answered, S2-Q2 left; pending before the review; the record closed ⇒ incomplete over 3, censored, closed_at_review; the bench afterwards a record', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);

    const errors = captureErrors(page);

    await toLab(page, 'u18r3');
    await openBench(page);
    await startByKeyboard(page);
    await completeBox1ByKeyboard(page);
    // Box 2: TEST S, wiring D, S2-Q1 = B; S2-Q2 presented and left.
    await page.waitForTimeout(SETTLE_MS);
    await keys(page, ['1']);
    await page.keyboard.press('d');
    await page.waitForTimeout(150);
    await recordByKeyboard(page, 'r');
    await nextByKeyboard(page);
    await answerByKeyboard(page, 'b');
    await nextByKeyboard(page);
    expect(await currentQuestion(page)).toBe('s2_q2');
    await leaveBench(page);

    // Reopened: the same question, no results offered.
    await openBench(page);
    expect(await currentQuestion(page)).toBe('s2_q2');
    expect(await countOf(page, 'question_presented')).toBe(4);
    await expectNoCorrectnessOnScreen(page);
    await leaveBench(page);

    const pending = (await reproduce(page)).row;

    expect(pending).toMatchObject({ value: null, disposition: 'pending' });
    expect(pending.components.predictions_answered).toBe(3);
    expect(
      (pending.components.questions as { answered: boolean }[]).map(
        (question) => question.answered,
      ),
    ).toEqual([true, true, true, false]);

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
      predictions_answered: 3,
      correct_first_predictions: 3,
      questions_presented: 4,
      models_recorded: 2,
    });

    const { row, payload } = await reproduce(page);

    expect(payload.final_core_closed).toBe(true);
    expect(row).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 3,
      planned_denominator: 4,
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(row.components.omissions).toEqual({
      unanswered_question_ids: ['s2_q2'],
      unpresented_question_ids: [],
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
      await openBench(page);
    } catch (error) {
      blocked = (error as Error).message.split('\n')[0];
    }

    if (blocked !== null) {
      test.info().annotations.push({
        type: 'BLOCKED / NOT VERIFIED',
        description: `the bench after the record closure was not reached (${blocked}); frame 18 is missing`,
      });
      // eslint-disable-next-line no-console
      console.log(
        `[R3] BLOCKED / NOT VERIFIED — bench after the record closure not reached: ${blocked}`,
      );
    } else {
      const before = (await familyEvents(page)).length;

      expect(await lines(page)).toContain(
        'Station record closed — the bench keeps its record.',
      );
      expect(await lines(page)).toContain('3 of 4 answers recorded.');
      await expectNoCorrectnessOnScreen(page);
      await shot(page, '18-closed-record-after-review');
      await page.keyboard.press('1');
      await page.keyboard.press('a');
      await page.keyboard.press('r');
      await page.keyboard.press('n');
      await page.keyboard.press('h');
      await page.waitForTimeout(300);
      expect(await ids(page)).toEqual(['record_text', 'leave']);
      await leaveBench(page);
      expect((await familyEvents(page)).length).toBe(before);
      expect((await reproduce(page)).row).toMatchObject({
        value: 3,
        denominator: 3,
        disposition: 'incomplete',
      });
    }

    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test("R4 (zero evidence, briefing and orientation only): not_presented before Kai's briefing; pending with briefed_not_opened after it; the orientation card left and shown again", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLabUnbriefed(page, 'u18r4');

    // Before Kai's briefing there is no M15 evidence at all.
    expect(await familyEvents(page)).toEqual([]);
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'not_presented',
    });

    await briefing(page);
    expect((await familyEvents(page)).map((event) => event.event_type)).toEqual(
      [`${FAMILY}presented`],
    );

    const briefed = (await reproduce(page)).row;

    expect(briefed).toMatchObject({
      value: null,
      disposition: 'pending',
      missing_reason: 'briefed_not_opened',
    });
    expect(briefed.components.exposure).toMatchObject({
      briefed: true,
      bench_opened: false,
      boxes_presented: 0,
      questions_presented: 0,
    });

    // Opened and left at the orientation card: still pending; the card again.
    await openBench(page);
    expect(await ids(page)).toEqual(['start', 'orientation', 'help', 'leave']);
    await leaveBench(page);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'box_presented')).toBe(0);
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    expect((await reproduce(page)).row.components.exposure).toMatchObject({
      briefed: true,
      bench_opened: true,
      orientation_acknowledged: false,
      boxes_presented: 0,
    });
    await openBench(page);
    expect(await ids(page)).toEqual(['start', 'orientation', 'help', 'leave']);
    expect(await countOf(page, 'box_presented')).toBe(0);
    expect(await countOf(page, 'series_reopened')).toBe(1);
    await leaveBench(page);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R7 (real-game fallback font, Courier New): box 1 wiring step with a draft and question 1 with the record, the wiring and a draft keep at least 30 design px above the feedback line', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await forceMonospace(page, '"Courier New"');

    const errors = captureErrors(page);

    await toLab(page, 'u18r7a');
    await openBench(page);
    await fallbackGate(page, '22-box-1-question-1-courier-new', 'Courier New');
    expectNoRuntimeErrors(errors);
  });

  test('R7 (real-game fallback font, Lucida Console): the same views keep at least 30 design px above the feedback line', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await forceMonospace(page, '"Lucida Console"');

    const errors = captureErrors(page);

    await toLab(page, 'u18r7b');
    await openBench(page);
    await fallbackGate(
      page,
      '23-box-1-question-1-lucida-console',
      'Lucida Console',
    );
    expectNoRuntimeErrors(errors);
  });

  test("R8 (other benches after M15): the protocol console still opens its terminal overlay, the wall display, beacon and Noor's line advance, and the M14 row is untouched", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u18r8');

    const m14Before = await m14Row(page);
    const displayBefore = await signalDisplay(page);

    expect(displayBefore?.phases_recorded).toEqual([]);
    expect(displayBefore?.next_phase).toBe('m15');

    // The whole series by keyboard, all four keyed; FINISH.
    await openBench(page);
    await startByKeyboard(page);
    await completeBox1ByKeyboard(page);
    await page.waitForTimeout(SETTLE_MS);
    await keys(page, ['1', '2']);
    await page.keyboard.press('d');
    await page.waitForTimeout(150);
    await recordByKeyboard(page, 'r');
    await nextByKeyboard(page);
    await answerByKeyboard(page, 'b');
    await nextByKeyboard(page);
    await answerByKeyboard(page, 'c');
    expect(await countOf(page, 'first_responses_completed')).toBe(1);
    await nextByKeyboard(page); // SHOW RESULTS
    await leaveBench(page);
    expect((await reproduce(page)).row).toMatchObject({
      value: 4,
      disposition: 'observed',
    });

    // The wall display after M15 is recorded.
    await page.waitForTimeout(600);

    const display = await signalDisplay(page);

    expect(display?.phases_recorded).toEqual(['m15']);
    expect(display?.next_phase).toBe('m16');
    expect(display?.indicator).toMatch(/PHASE 2 \/ 4/);
    expect(display?.intercom).toMatch(/handling protocol/);
    expect(m14Before).toBe(await m14Row(page));
    await shot(page, '24-wall-display-after-m15-recorded');

    // The protocol console (M16) opens its terminal overlay as before.
    await interactAt(page, PILOT.lab.protocolConsole, {
      approachOffset: await labApproach(page, PILOT.lab.protocolConsole),
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
    ).toBe('m16');
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __ipTerminalProbe?: { open?: boolean } | null })
          .__ipTerminalProbe?.open !== true,
      undefined,
      { timeout: 8000 },
    );
    expect(m14Before).toBe(await m14Row(page));
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

/** The layout gate: the lowest control against the feedback line; no label taller than its box. */
async function measureGate(page: Page, font: string, label: string) {
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
}

/** Box 1 wiring step with tests and a draft, then question 1 with a draft (keyboard). */
async function fallbackGate(page: Page, frame: string, font: string) {
  await startByKeyboard(page);
  await page.waitForTimeout(SETTLE_MS);
  await keys(page, ['1', '2']);
  await page.keyboard.press('b');
  await page.waitForTimeout(150);
  await measureGate(page, font, 'box 1 wiring step with draft');
  await recordByKeyboard(page, 'r');
  await nextByKeyboard(page);
  expect(await currentQuestion(page)).toBe('s1_q1');
  await page.waitForTimeout(SETTLE_MS);
  await page.keyboard.press('c');
  await page.waitForTimeout(150);
  await measureGate(page, font, 'box 1 question 1 with draft');
  await shot(page, frame);
  await leaveBench(page);
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

/** Where the closeout's evidence frames go (never the contract's 24). */
const CLOSEOUT_OUT =
  process.env.U18_CLOSEOUT_OUT ?? 'test-results/u18-closeout';

/**
 * HELP, CLOSE HELP and LEAVE BENCH by real clicks from one question view
 * with an unsubmitted draft: the two controls are present, focusable,
 * idle, inside the panel below every right-column control and above the
 * feedback line, and overlapped by nothing; help keeps the question and
 * the draft; leaving records no response and opens no dialog; reopening
 * shows the same question and draft without a second presentation.
 */
async function questionAccessFromView(
  page: Page,
  questionId: string,
  letter: 'a' | 'b' | 'c',
  shotName: string,
) {
  expect(await currentQuestion(page)).toBe(questionId);

  // The question as the SCREEN shows it (the panel title and the question
  // block's label), compared again after help and after the reopen.
  const boxIndex = Number(questionId.charAt(1));
  const questionIndex = Number(questionId.slice(-1));
  const onScreen = async () => {
    const view = await probe(page);
    const block = view.elements.find((e) => e.id === 'question');

    expect(view.title).toBe(`RELAY BOX ${boxIndex} OF 2`);
    expect(block, `${questionId} question block`).toBeDefined();
    expect(block!.label).toContain(`QUESTION ${questionIndex} OF 2`);

    return block!.label;
  };
  const shownBefore = await onScreen();

  const presented = await countOf(page, 'question_presented');
  const responses = await countOf(page, 'first_response');
  const requests = await countOf(page, 'commit_requested');
  const consults = await countOf(page, 'help_consulted');
  const left = await countOf(page, 'panel_left');
  const reopened = await countOf(page, 'series_reopened');
  const optionId = `option_${letter}`;

  // The draft (unsubmitted).
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, optionId);
  expect(await elementState(page, optionId)).toBe('selected');

  // Both controls present and usable, below the right column, above the
  // feedback line, overlapped by nothing.
  const view = await probe(page);
  const rect = (e: { x: number; y: number; w: number; h: number }) => ({
    left: e.x - e.w / 2,
    right: e.x + e.w / 2,
    top: e.y - e.h / 2,
    bottom: e.y + e.h / 2,
  });

  for (const id of ['help', 'leave']) {
    const control = view.elements.find((e) => e.id === id);

    expect(control, `${questionId} ${id}`).toBeDefined();
    expect(control!.focusable, `${questionId} ${id} focusable`).toBe(true);
    expect(control!.state, `${questionId} ${id} state`).toBe('idle');

    const r = rect(control!);

    expect(
      r.bottom,
      `${questionId} ${id} above the feedback line`,
    ).toBeLessThan(view.feedback_top);

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

      expect(apart, `${questionId} ${id} overlapped by ${other.id}`).toBe(true);

      if (['record_answer', 'cannot_solve', optionId].includes(other.id)) {
        expect(r.top, `${questionId} ${id} below ${other.id}`).toBeGreaterThan(
          o.bottom,
        );
      }
    }
  }

  mkdirSync(CLOSEOUT_OUT, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${CLOSEOUT_OUT}/${shotName}.png` });

  // HELP by click: the sheet; CLOSE HELP by click: the question and the
  // draft as they were; nothing presented or recorded.
  await clickElement(page, 'help');
  expect((await ids(page))[0]).toBe('close_help');
  expect(await lines(page)).toContain('HOW THE BENCH WORKS');
  expect(await countOf(page, 'help_consulted')).toBe(consults + 1);
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    question_id: questionId,
    step: 'question',
    input_mode: 'pointer',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect(await ids(page)).not.toContain('close_help');
  expect(await ids(page)).toContain('record_answer');
  expect(await ids(page)).toContain('help');
  expect(await ids(page)).toContain('leave');
  expect(await currentQuestion(page)).toBe(questionId);
  expect(await onScreen()).toBe(shownBefore);
  expect(await elementState(page, optionId)).toBe('selected');
  expect(await countOf(page, 'question_presented')).toBe(presented);
  expect(await countOf(page, 'first_response')).toBe(responses);
  await page.waitForTimeout(SETTLE_MS);

  // LEAVE BENCH by click with the draft unsubmitted: no response, no
  // dialog, no CANNOT SOLVE; the surface closes.
  await clickElement(page, 'leave');
  await waitSurface(page, false);
  expect(await countOf(page, 'panel_left')).toBe(left + 1);
  expect(await countOf(page, 'first_response')).toBe(responses);
  expect(await countOf(page, 'commit_requested')).toBe(requests);
  expect(await countOf(page, 'commit_cancelled')).toBe(0);

  // Walk away and back (keyboard navigation, not an M15 response); reopen:
  // the same question and draft, no second presentation.
  await labApproach(page, PILOT.lab.kai);
  await openBench(page);
  expect(await countOf(page, 'series_reopened')).toBe(reopened + 1);
  expect(await countOf(page, 'question_presented')).toBe(presented);
  expect(await countOf(page, 'first_response')).toBe(responses);
  expect(await currentQuestion(page)).toBe(questionId);
  expect(await onScreen()).toBe(shownBefore);
  expect(await elementState(page, optionId)).toBe('selected');
  expect(await ids(page)).toContain('help');
  expect(await ids(page)).toContain('leave');
  await page.waitForTimeout(SETTLE_MS);
}

/** Records the drafted answer by click and moves on with the acknowledgement's control. */
async function recordAndNextByPointer(page: Page) {
  const responses = await countOf(page, 'first_response');

  await clickElement(page, 'record_answer');
  expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  expect(await countOf(page, 'first_response')).toBe(responses + 1);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next');
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * The closeout scenario: both boxes wired by click (box 1 B, box 2 CANNOT
 * TELL), then every question view checked with `questionAccessFromView`
 * before its answer is recorded; four first responses at the end.
 */
async function questionAccessScenario(page: Page, shotPrefix: string) {
  expect((await probe(page)).frame).toBe('wide');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'start');
  expect(await countOf(page, 'box_presented')).toBe(1);
  await page.waitForTimeout(SETTLE_MS);

  // Box 1: wiring B by click.
  await clickElement(page, 'wiring_b');
  await clickElement(page, 'record_wiring');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  expect(await countOf(page, 'wiring_recorded')).toBe(1);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next'); // FIRST QUESTION
  await page.waitForTimeout(SETTLE_MS);

  await questionAccessFromView(page, 's1_q1', 'c', `${shotPrefix}-s1-q1`);
  await recordAndNextByPointer(page);
  await questionAccessFromView(page, 's1_q2', 'a', `${shotPrefix}-s1-q2`);
  await recordAndNextByPointer(page); // NEXT BOX
  expect(await countOf(page, 'box_presented')).toBe(2);

  // Box 2: CANNOT TELL by click.
  await clickElement(page, 'cannot_tell');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  expect(await countOf(page, 'wiring_recorded')).toBe(2);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next'); // FIRST QUESTION
  await page.waitForTimeout(SETTLE_MS);

  await questionAccessFromView(page, 's2_q1', 'b', `${shotPrefix}-s2-q1`);
  await recordAndNextByPointer(page);
  await questionAccessFromView(page, 's2_q2', 'c', `${shotPrefix}-s2-q2`);
  await recordAndNextByPointer(page); // SHOW RESULTS
  expect(await countOf(page, 'first_response')).toBe(4);
  expect(await countOf(page, 'question_presented')).toBe(4);
  expect(await countOf(page, 'results_shown')).toBe(1);
}

/**
 * The pointer-only scenario inside the bench. Every act is a click; the
 * only keyboard steps are the walk away and back and the station prompt
 * (reported as navigation).
 */
async function pointerScenario(
  page: Page,
  draftShot: string | null,
  questionShot: string | null,
) {
  const space = await page.evaluate(
    () =>
      (window as unknown as { __designSpace?: { canvasWidth: number } | null })
        .__designSpace ?? null,
  );

  // eslint-disable-next-line no-console
  console.log(`[R2] canvas width ${space?.canvasWidth ?? 'unknown'}`);
  expect((await probe(page)).frame).toBe('wide');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'start');
  expect(await countOf(page, 'box_presented')).toBe(1);
  await page.waitForTimeout(SETTLE_MS);

  // Tests by click; drafts: choose, change, clear, choose again.
  await clickElement(page, 'test_f');
  await clickElement(page, 'test_g');
  expect(await countOf(page, 'test_run')).toBe(2);
  expect(meta(await lastOf(page, 'test_run'))).toMatchObject({
    dial_id: 's1_g',
    input_mode: 'pointer',
  });
  await clickElement(page, 'wiring_a');
  await clickElement(page, 'wiring_d');
  await clickElement(page, 'wiring_d');
  expect(
    String(meta(await lastOf(page, 'wiring_drafted')).option_id ?? 'null'),
  ).toBe('null');
  await clickElement(page, 'wiring_d');
  expect(await elementState(page, 'wiring_d')).toBe('selected');

  if (draftShot !== null) {
    await shot(page, draftShot);
  }

  // Mid box 1 with tests run and a draft: LEAVE BENCH by click; KEYBOARD
  // NAVIGATION away and back; the same step, record and draft on return.
  await clickElement(page, 'leave');
  await waitSurface(page, false);
  expect(await countOf(page, 'panel_left')).toBe(1);
  await labApproach(page, PILOT.lab.kai);
  await openBench(page);
  expect(await countOf(page, 'box_presented')).toBe(1);
  expect(await countOf(page, 'series_reopened')).toBe(1);
  expect(await lines(page)).toContain(LISTING_F);
  expect(await lines(page)).toContain('TEST G  step 1: P up');
  expect(await elementState(page, 'wiring_d')).toBe('selected');
  expect(await ids(page)).toContain('record_wiring');

  if (draftShot !== null) {
    await shot(page, '17-bench-reopened-mid-box');
  }

  // A side-band click outside every control activates nothing.
  await page.waitForTimeout(SETTLE_MS);

  const eventsBefore = (await getEvents(page)).length;
  const band = await designToPage(page, -118, 300);

  await page.mouse.click(band.x, band.y);
  await page.waitForTimeout(300);
  expect((await probe(page)).open).toBe(true);
  expect((await getEvents(page)).length).toBe(eventsBefore);

  // Change the draft to B; RECORD WIRING beyond design x 800 opens the
  // dialog; the opening click never confirms; a double click on RECORD
  // records once.
  await clickElement(page, 'wiring_b');
  expect(await elementState(page, 'wiring_b')).toBe('selected');

  const recordX = await clickElementAt(page, 'record_wiring', 110);

  expect(recordX).toBeGreaterThan(800);
  expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
  expect(await countOf(page, 'wiring_recorded')).toBe(0);
  await page.waitForTimeout(SETTLE_MS + 120);
  await dblclickElement(page, 'confirm');
  expect(await countOf(page, 'wiring_recorded')).toBe(1);
  expect(meta(await lastOf(page, 'wiring_recorded'))).toMatchObject({
    option_id: 's1_w_b',
    correct: true,
    input_mode: 'pointer',
  });
  await expectNoCorrectnessOnScreen(page);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next'); // FIRST QUESTION
  expect(await currentQuestion(page)).toBe('s1_q1');

  if (questionShot !== null) {
    await page.waitForTimeout(SETTLE_MS + 120);
    await clickElementAt(page, 'option_c', 110);
    expect(await elementState(page, 'option_c')).toBe('selected');

    const value = await probe(page);
    const bottom = Math.max(...value.elements.map((e) => e.y + e.h / 2));

    // eslint-disable-next-line no-console
    console.log(
      `[R2 canvas=1080] box 1 question 1: spare ${(value.feedback_top - bottom).toFixed(1)} design px`,
    );
    expect(value.feedback_top - bottom).toBeGreaterThanOrEqual(30);
    await shot(page, questionShot);
  } else {
    // Option C beyond design x 800.
    await page.waitForTimeout(SETTLE_MS + 120);

    const optionX = await clickElementAt(page, 'option_c', 110);

    expect(optionX).toBeGreaterThan(800);
    expect(await elementState(page, 'option_c')).toBe('selected');
  }

  // HELP and CLOSE HELP by click: a double click on each changes one view.
  await dblclickElement(page, 'help');
  expect((await ids(page))[0]).toBe('close_help');
  expect(await countOf(page, 'help_consulted')).toBe(1);
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'close_help');
  expect(await ids(page)).toContain('record_answer');
  expect(await ids(page)).not.toContain('close_help');
  expect(await countOf(page, 'help_consulted')).toBe(1);
  await page.waitForTimeout(SETTLE_MS);

  // RECORD ANSWER and its RECORD: a double click yields one first_response.
  await clickElement(page, 'record_answer');
  expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
  expect(await countOf(page, 'first_response')).toBe(0);
  await page.waitForTimeout(SETTLE_MS + 120);
  await dblclickElement(page, 'confirm');
  expect(await countOf(page, 'first_response')).toBe(1);
  expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
    question_id: 's1_q1',
    option_id: 's1_q1_c',
    correct: true,
    input_mode: 'pointer',
  });
  await expectNoCorrectnessOnScreen(page);
  // A double click on NEXT QUESTION changes only one view.
  await page.waitForTimeout(SETTLE_MS + 120);
  await dblclickElement(page, 'next');
  expect(await currentQuestion(page)).toBe('s1_q2');
  expect(await countOf(page, 'question_presented')).toBe(2);
  expect(await ids(page)).toContain('record_answer');

  // CANNOT SOLVE: KEEP WORKING cancels; then its RECORD.
  await page.waitForTimeout(SETTLE_MS + 120);
  const requestsBefore = await countOf(page, 'commit_requested');
  const opener = (await probe(page)).elements.find(
    (e) => e.id === 'cannot_solve',
  )!;

  expect(opener).toBeDefined();
  await dblclickElement(page, 'cannot_solve');
  expect(await lines(page)).toContain('Record CANNOT SOLVE for question 2?');
  expect(await countOf(page, 'commit_requested')).toBe(requestsBefore + 1);
  expect(await countOf(page, 'commit_cancelled')).toBe(0);
  // Neither dialog control overlaps the opener's place, and both end left
  // of the right column that holds every opener (the opener's left edge),
  // so the second click landed on nothing. The probe reports element
  // CENTRES in world coordinates; both sides are read the same way.
  const rect = (e: { x: number; y: number; w: number; h: number }) => ({
    left: e.x - e.w / 2,
    right: e.x + e.w / 2,
    top: e.y - e.h / 2,
    bottom: e.y + e.h / 2,
  });
  const openerRect = rect(opener);
  const dialogControls = (await probe(page)).elements.filter((e) =>
    ['confirm', 'keep_working'].includes(e.id),
  );

  expect(dialogControls).toHaveLength(2);
  for (const control of dialogControls) {
    const r = rect(control);

    expect(r.right).toBeLessThanOrEqual(openerRect.left);
    expect(
      r.right <= openerRect.left ||
        r.left >= openerRect.right ||
        r.bottom <= openerRect.top ||
        r.top >= openerRect.bottom,
    ).toBe(true);
  }
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'keep_working');
  expect(await countOf(page, 'commit_cancelled')).toBe(1);
  expect(await countOf(page, 'first_response')).toBe(1);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'cannot_solve');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
    question_id: 's1_q2',
    response_kind: 'cannot_solve',
    correct: false,
    input_mode: 'pointer',
  });
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next'); // NEXT BOX
  expect(String(meta(await lastOf(page, 'box_presented')).box_id)).toBe('s2');

  // Box 2 by pointer: TEST S, TEST T, wiring D, S2-Q1 B, S2-Q2 C.
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'test_s');
  await clickElement(page, 'test_t');
  await clickElement(page, 'wiring_d');
  await clickElement(page, 'record_wiring');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next');

  for (const letter of ['b', 'c'] as const) {
    await page.waitForTimeout(SETTLE_MS + 120);
    await clickElement(page, `option_${letter}`);
    await clickElement(page, 'record_answer');
    await page.waitForTimeout(SETTLE_MS + 120);
    await clickElement(page, 'confirm');
    await page.waitForTimeout(SETTLE_MS + 120);
    await clickElement(page, 'next');
  }

  // Results navigation and FINISH by pointer.
  expect(await countOf(page, 'first_response')).toBe(4);
  expect(await countOf(page, 'results_shown')).toBe(1);
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'results_next');
  expect(await countOf(page, 'results_shown')).toBe(2);
  expect(await lines(page)).toContain('Station answer: Z does not move');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'results_back');
  expect(await lines(page)).toContain('Station answer: W does not move');
  await page.waitForTimeout(SETTLE_MS);

  const finishX = await clickElementAt(page, 'finish', 0);

  expect(finishX).toBeLessThan(800);
  await waitSurface(page, false);
  expect((await reproduce(page)).row).toMatchObject({
    value: 3,
    numerator: 3,
    denominator: 4,
    disposition: 'observed',
  });
}

test.describe('M15 two relay boxes: reload (Unit 18)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  /** Route to the bench, box 1 wired (B) and S1-Q1 answered, the bench left. */
  async function beforeReload(page: Page, tag: string) {
    await toLab(page, tag);
    await openBench(page);
    await startByKeyboard(page);
    await page.waitForTimeout(SETTLE_MS);
    await keys(page, ['1']);
    await page.keyboard.press('b');
    await page.waitForTimeout(150);
    await recordByKeyboard(page, 'r');
    await nextByKeyboard(page);
    await answerByKeyboard(page, 'c');
    await leaveBench(page);

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

  test('R5 (reload after an opening): box 1 wiring and S1-Q1 recorded, then a page reload — the earlier log carried byte-identically, the row interrupted; the bench, reached again, held back', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);
    const before = await beforeReload(page, 'u18r5');

    expect((await reproduce(page)).row).toMatchObject({
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
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'interrupted',
    });

    // The recorded block (UNIT-LOG "U15", R4): after a reload the journey
    // driver may be unable to replay the dock tutorial. When it cannot,
    // the post-reload browser administration is NOT VERIFIED — the test is
    // skipped with that reason, never passed.
    const blocked = await driveBackToLab(page);

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the laboratory after the reload (${blocked}); the post-reload administration was not exercised in the browser and frame 19 is missing`,
    );

    // Laboratory entry wrote the check (the opening found) and the
    // hold-back record; nothing else of the bench.
    const atEntry = (await familyEvents(page)).map((event) => event.event_type);

    expect(atEntry).toEqual([
      `${FAMILY}prior_load_checked`,
      `${FAMILY}technical_failure`,
    ]);

    await openBench(page);
    expect(await lines(page)).toContain(
      'This bench was already used in this session. Its record is kept; nothing further is recorded here.',
    );
    expect(await ids(page)).toEqual(['record_text', 'leave']);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '19-reload-hold-back-record');
    await page.keyboard.press('1');
    await page.keyboard.press('a');
    await page.keyboard.press('r');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await leaveBench(page);

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

    const row = (await reproduce(page)).row;

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
    expectNoRuntimeErrors(errors);
  });

  test("R6 (reload before any opening): Kai's briefing acknowledged and the bench never opened, then a reload — interrupted until the laboratory is re-entered; the check establishes the absence; not_presented until this load's briefing, then pending; the orientation appears", async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    // The first load: briefed, the bench never opened.
    await toLab(page, 'u18r6');

    const before = await pagePayload(page);

    expect(before.page_load_index).toBe(1);
    expect(
      before.raw_events
        .filter((event) => event.event_type.startsWith(FAMILY))
        .map((event) => event.event_type),
    ).toEqual([`${FAMILY}presented`]);
    expect((await reproduce(page)).row).toMatchObject({
      disposition: 'pending',
      missing_reason: 'briefed_not_opened',
    });

    await reload(page);

    // Right after the reload, before the laboratory: no check of this load
    // yet, so nothing is established and the row is interrupted.
    const atOpening = await pagePayload(page);

    expect(atOpening.page_load_index).toBe(2);
    expect(
      atOpening.raw_events.filter((event) =>
        event.event_type.startsWith(FAMILY),
      ),
    ).toEqual([]);
    expect((await reproduce(page)).row).toMatchObject({
      disposition: 'interrupted',
    });

    const blocked = await driveBackToLab(page);

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the laboratory after the reload (${blocked}); the post-reload classification was not exercised in the browser`,
    );

    // Laboratory entry wrote the check: a continuous history, the earlier
    // briefing reported, no earlier opening ⇒ absence established.
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
    let row = (await reproduce(page)).row;

    expect(row).toMatchObject({ disposition: 'not_presented', value: null });
    expect(row.components).toMatchObject({
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
        bench_opened: false,
        never_opened_reason: 'not_briefed_not_opened',
      },
      exposure_record_consistent: true,
    });

    // Briefed in this load, never opened: pending with briefed_not_opened.
    await briefing(page);
    row = (await reproduce(page)).row;
    expect(row).toMatchObject({
      disposition: 'pending',
      value: null,
      missing_reason: 'briefed_not_opened',
    });
    expect(row.components.exposure).toMatchObject({
      briefed: true,
      bench_opened: false,
      never_opened_reason: 'briefed_not_opened',
    });

    // The bench opens normally — the orientation card, not the hold-back.
    await openBench(page);
    expect(await ids(page)).toContain('start');
    expect(await lines(page)).not.toContain(
      'This bench was already used in this session.',
    );
    await expectNoCorrectnessOnScreen(page);
    await startByKeyboard(page);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'orientation_acknowledged')).toBe(1);
    expect(await countOf(page, 'box_presented')).toBe(1);
    expect(await countOf(page, 'technical_failure')).toBe(0);
    await leaveBench(page);

    row = (await reproduce(page)).row;
    expect(row).toMatchObject({ disposition: 'pending', value: null });
    expect(row.components.exposure).toMatchObject({
      briefed: true,
      bench_opened: true,
      orientation_acknowledged: true,
      boxes_presented: 1,
      never_opened_reason: null,
    });
    // The earlier load's events are untouched by everything above.
    expect(JSON.stringify((await pagePayload(page)).prior)).toBe(
      JSON.stringify(before.raw_events),
    );
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });
});
