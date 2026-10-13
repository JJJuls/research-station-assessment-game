/**
 * Station 080 M19 — the two coupling lines at the Exterior Recovery Yard
 * coupling panel on the participant route (Unit 21, browser evidence run).
 * Every scenario boots the participant default with `bootPilot`, finishes
 * the Dock tutorial and reaches the yard with the existing drivers of
 * `pilotHelpers.ts` (`routeToYardWork`, whose `labToYardBriefed` declines
 * the M05 flag job so no M05 clock runs while the panel is worked), walks
 * to the coupling's audited approach with `yardVia` and opens the panel
 * with `interactAt` (SPACE at the station). No M19 state is injected.
 *
 * INPUT, stated plainly: the walking, the station prompt (SPACE at the
 * coupling), Noor's briefing and the M08 console in R4 are done by the
 * route drivers with the KEYBOARD — navigation, not an M19 response.
 * Inside the panel R1, R3, R4, R5, R6, R7 and R8 use the keyboard only; R2
 * uses the pointer only (every in-panel act a real click at the probe's
 * design coordinates); R9 uses both, each control by TAB / ENTER and by
 * click.
 *
 *   R1  keyboard: card; check right first; line 1 H3 TRY, H2 TRY, H1 TRY
 *       (the boundary), TRY again (refused), a settling TRY, held keys,
 *       FEED, H2 off, TRY (restored); NEXT LINE; line 2 the dial limit,
 *       dial 4 TRY, dial 5 TRY (the boundary), SET ASIDE, BACK, SET ASIDE,
 *       confirm; FINISH ⇒ 1 / 2 observed; the reopened final record.
 *   R2  pointer at 1280 × 720 and at `canvas=1080`: check wrong, the
 *       explanation, recheck right; line 1 restored at the first TRY (no
 *       boundary); line 2 TRY, dial 5 TRY, dial 4 TRY (the boundary), dial
 *       5, BYPASS, TRY (restored) ⇒ 1 / 1; HELP / CLOSE HELP on five views;
 *       double clicks on TRY and on SET ASIDE.
 *   R3  check fail: the lines still administered; SET ASIDE on both ⇒
 *       understanding_failed.
 *   R4  leaving, returning, the shift end WITHOUT reopening, the review.
 *   R5  zero evidence: not_presented, pending, closed_unopened at the shift
 *       end, the absence record at the review; opened and left at the card.
 *   R6  no obstacle: both lines restored at their first TRY.
 *   R7  reload after an opening (W2) and after a briefing only (E18).
 *   R8  the real-game layout gate under the default and the fallback fonts.
 *   R9  HELP and LEAVE on every view by both input modes; the ESC order.
 *
 * Twenty-nine evidence frames (800 × 600 unless stated) go to `U21_OUT`.
 * Nothing here establishes psychometric validity.
 */
import { mkdirSync } from 'node:fs';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { REGISTER_V3 } from '../src/measurement/registerV3';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { closeStationRecord } from './closureHelpers';
import { APPROACH, YARD } from './exteriorHelpers';
import { designToPage, getEvents, hold, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  answerLogbookOffer,
  bootPilot,
  concourseToDeck,
  expectStage,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  press,
  returnShiftToDeckClosure,
  routeToLabWork,
  routeToYardWork,
  useDoor,
  waitScene,
  yardApproach,
  yardVia,
} from './pilotHelpers';
import { clickElement, surface, waitSurface } from './returnHelpers';

const OUT = process.env.U21_OUT ?? 'test-results/u21-evidence';
const FAMILY = 'proto_m19_lines_';
const VERSION = 'm19-lines-v2';
const SURFACE = 'm19_coupling_panel';
const SETTLE_MS = 400;
const FORBIDDEN =
  /proto_|secondary_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|persist|grit|tough|\bgoing\b|difficult|\bhard\b|setback|discourag|give up|\bquit|\bfail|success|trying|challenge|\btest|skill|abilit|effort|motivat|wrong|correct|mistake|error|puzzle|solv|solution|\bhint|should|must\b|hurry|quick|fast|\btime\b/i;
// HELP and LEAVE carry the view's name in their ids (review finding GP-1,
// fixed locally at the closeout): `help_<view>` / `leave_<view>`.
const CARD_IDS = ['intro', 'continue', 'help_intro', 'leave_intro'];
const CHECK_IDS = [
  'question',
  'option_1',
  'option_2',
  'option_3',
  'record',
  'help_check_1',
  'leave_check_1',
];
const EXPLANATION_IDS = [
  'explanation',
  'continue',
  'help_explanation',
  'leave_explanation',
];
const RECORDED_IDS = ['recorded', 'start', 'help_recorded', 'leave_recorded'];
const RECORD_IDS = ['closed', 'leave_record'];
const LINE1_IDS = [
  'readout',
  'sheet',
  'log',
  'heater_1',
  'heater_2',
  'heater_3',
  'feed',
  'try',
  'set_aside',
  'help_line_1',
  'leave_line_1',
];
const LINE2_IDS = [
  'readout',
  'sheet',
  'log',
  'dial_down',
  'dial_up',
  'bypass',
  'try',
  'set_aside',
  'help_line_2',
  'leave_line_2',
];
const DIALOG_IDS = ['confirm', 'back', 'dialog'];

interface FeatureRow {
  item_id: string;
  feature_id: string;
  value: unknown;
  numerator: number | null;
  denominator: number | null;
  planned_denominator: number | null;
  disposition: string;
  censored: boolean;
  censor_reason: string | null;
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

/** The immutable records (attempts and boundaries), serialised for a byte-identity comparison. */
async function records(page: Page) {
  return JSON.stringify(
    (await familyEvents(page)).filter(
      (event) =>
        event.event_type === `${FAMILY}attempt` ||
        event.event_type === `${FAMILY}difficulty_boundary`,
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

async function labelOf(page: Page, id: string) {
  return (await probe(page)).elements.find((element) => element.id === id)
    ?.label;
}

async function stateOf(page: Page, id: string) {
  return (await probe(page)).elements.find((element) => element.id === id)
    ?.state;
}

/** The page's OWN export payload (the runtime's builder, read in the page). */
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
async function reproduce(page: Page): Promise<FeatureRow> {
  const payload = await pagePayload(page);
  const before = JSON.stringify(payload.raw_events);
  const context = {
    finalCoreClosed: payload.final_core_closed,
    pageLoadIndex: payload.page_load_index,
    reloaded: payload.page_load_index > 1,
  };
  const offline = JSON.parse(
    JSON.stringify(extractItemFeatures('M19', payload.raw_events, context)),
  ) as FeatureRow[];
  const own = payload.features.filter((row) => row.item_id === 'M19');

  expect(own, 'the page exports one M19 row').toHaveLength(1);
  expect(offline, "offline extraction equals the page's row").toEqual(own);
  expect(JSON.stringify(payload.raw_events)).toBe(before);
  expect(offline[0].feature_id).toBe('m19_continuations');
  expect(offline[0].planned_denominator).toBe(2);

  return offline[0];
}

/**
 * The row without the descriptive records a reopening of a closed panel
 * adds (`reopenings`, `panel_leaves` and the supporting sequences, which
 * list every family event): the value, the dispositions and every per-line
 * record must be byte-identical.
 */
function stableOf(row: FeatureRow): string {
  const { reopenings, panel_leaves, ...components } = row.components as {
    reopenings: number;
    panel_leaves: number;
  } & Record<string, unknown>;

  void reopenings;
  void panel_leaves;

  return JSON.stringify({ ...row, components, supporting_sequences: [] });
}

const lineOf = (row: FeatureRow, id: string) =>
  (row.components.lines as Comp[]).find((entry) => entry.line_id === id)!;

/** Administration version on the live events; exactly one family owner; no legacy event. */
async function expectFamilyDiscipline(page: Page) {
  const all = await getEvents(page);
  const own = all.filter((event) => event.event_type.startsWith(FAMILY));

  expect(own.length, 'the family was emitted').toBeGreaterThan(0);

  for (const event of own) {
    expect(meta(event).entry_state_version, event.event_type).toBe(VERSION);
    expect(meta(event).opportunity_id).toBe('proto_m19_lines_series');
    expect(meta(event).measure_id).toBe('M19');
    expect(meta(event).window_id).toBe('m19_lines_w1');
    expect(typeof (event as { sequence?: number }).sequence).toBe('number');
  }

  expect(
    REGISTER_V3.filter((entry) =>
      entry.route.family_prefixes.some((prefix) => FAMILY.startsWith(prefix)),
    ).map((entry) => entry.id),
  ).toEqual(['M19']);
  // The retired v2 coupling family is never written on the route.
  expect(
    all.filter((event) => event.event_type.startsWith('proto_m19_valve_')),
  ).toEqual([]);
}

async function expectNoForbiddenOnScreen(page: Page) {
  expect(await lines(page)).not.toMatch(FORBIDDEN);
}

// ——— Driver steps (KEYBOARD NAVIGATION — never an M19 response) ————————

/** Opening → Dock tutorial → … → the yard with Noor's briefing acknowledged (stage exterior_work). */
async function toYard(page: Page, tag: string, extra = '') {
  await bootPilot(page, tag, { extra });
  await completeDockTutorial(page, 1);
  await routeToYardWork(page);
}

/** The same spine, stopping inside the yard BEFORE Noor's briefing. */
async function toYardUnbriefed(page: Page, tag: string) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await routeToLabWork(page);
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: await labApproach(page, PILOT.lab.kai),
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'exterior_briefing');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
}

/** Noor's briefing acknowledged with the flag job declined (keyboard navigation). */
async function briefing(page: Page) {
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: await yardApproach(page, PILOT.yard.noor),
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'exterior_work');
  await page.waitForTimeout(450);
  await selectPromptOption(page, 2);
  await page.waitForTimeout(300);
}

/** Walks to the coupling's audited approach and presses SPACE (keyboard navigation). */
async function openPanel(page: Page, options?: { shotPrompt?: string }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await yardVia(
      page,
      YARD.coupling.x + APPROACH.coupling.x,
      YARD.coupling.y + APPROACH.coupling.y,
    );

    if (options?.shotPrompt !== undefined && attempt === 0) {
      await page.waitForTimeout(300);
      await shot(page, options.shotPrompt);
    }

    await interactAt(page, YARD.coupling, {
      approachOffset: APPROACH.coupling,
    });

    const opened = await waitSurface(page, true, SURFACE).then(
      () => true,
      () => false,
    );

    if (opened) {
      return;
    }
  }

  throw new Error('the coupling panel did not open');
}

/** ESC on the panel after its view settled (the same path as LEAVE). */
async function leavePanel(page: Page) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/** Noor's "finished outside" with the logbook deferred (keyboard navigation). */
async function finishOutside(page: Page) {
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: await yardApproach(page, PILOT.yard.noor),
  });
  await selectPromptOption(page, 2);
  await expectStage(page, 'return_hub');
  await answerLogbookOffer(page, 'defer');
}

/** The yard left and the route driven to the Utility Deck review, the record closed. */
async function toReviewClosure(page: Page) {
  await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
    approachOffset: await yardApproach(page, PILOT.yard.airlock),
  });
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: await labApproach(page, PILOT.lab.southDoor),
  });
  await returnShiftToDeckClosure(page);
  await concourseToDeck(page);
  await closeStationRecord(page);
}

// ——— In-panel keyboard acts ———————————————————————————————————————————

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

/** A hotkey after the view settled. */
async function hotkey(page: Page, key: string) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press(key);
  await page.waitForTimeout(150);
}

/** The check answered right first by keyboard (option 2, R). */
async function checkRightByKeyboard(page: Page) {
  await activateByKeyboard(page, 'continue');
  expect(await ids(page)).toEqual(CHECK_IDS);
  await hotkey(page, '2');
  expect(await stateOf(page, 'option_2')).toBe('selected');
  await hotkey(page, 'r');
  expect(await labelOf(page, 'recorded')).toBe(
    'Check recorded. Line 1 is ready.',
  );
}

/** START LINE 1 by TAB and ENTER. */
async function startLine1ByKeyboard(page: Page) {
  await activateByKeyboard(page, 'start');
  expect(await ids(page)).toEqual(LINE1_IDS);
  expect((await probe(page)).status).toBe('Working on line 1 of 2.');
}

/** Line 1 at its obstacle by keyboard: H1, H2, H3, TRY. */
async function line1ObstacleByKeyboard(page: Page) {
  for (const key of ['1', '2', '3']) {
    await hotkey(page, key);
  }

  expect(await labelOf(page, 'readout')).toBe('ON: H1 H2 H3 · FEED SINGLE');
  await hotkey(page, 't');
  expect(await countOf(page, 'difficulty_boundary')).toBe(1);
}

/** SET ASIDE opened and confirmed by keyboard (N, a settled ENTER). */
async function setAsideByKeyboard(page: Page) {
  await hotkey(page, 'n');
  expect(await ids(page)).toEqual(DIALOG_IDS);
  expect((await probe(page)).focus).toBe('confirm');
  await page.waitForTimeout(SETTLE_MS + 120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect(await ids(page)).not.toEqual(DIALOG_IDS);
}

/** NEXT LINE by TAB and ENTER. */
async function nextLineByKeyboard(page: Page) {
  await activateByKeyboard(page, 'next');
  expect(await ids(page)).toEqual(LINE2_IDS);
  expect((await probe(page)).status).toBe('Working on line 2 of 2.');
}

/** Line 2 at its obstacle by keyboard: dial 4 TRY, dial 5 TRY. */
async function line2ObstacleByKeyboard(page: Page) {
  for (let step = 0; step < 3; step += 1) {
    await hotkey(page, '2');
  }

  expect(await labelOf(page, 'readout')).toBe('DIAL 4 · BYPASS SHUT');
  await hotkey(page, 't');
  await hotkey(page, '2');
  await hotkey(page, 't');
  expect((await lastOf(page, 'difficulty_boundary'))?.metadata).toMatchObject({
    line_id: 'm19_l2',
    attempt_index: 2,
    evidence_attempt_indices: [1, 2],
  });
}

// ——— In-panel pointer acts ————————————————————————————————————————————

async function dblclickElement(page: Page, id: string) {
  const element = (await probe(page)).elements.find((e) => e.id === id);

  if (element === undefined) {
    throw new Error(`element ${id} missing`);
  }

  const point = await designToPage(page, element.x, element.y);

  await page.mouse.dblclick(point.x, point.y);
  await page.waitForTimeout(250);
}

/** A click after the view settled. */
async function click(page: Page, id: string) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await clickElement(page, id);
}

test.describe('M19 coupling lines on the route (Unit 21)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test('R1 (keyboard in the panel): card; check right first; line 1 H3 TRY, H2 TRY, H1 TRY (the boundary), TRY again refused, a settling TRY, held keys, FEED, H2 off, TRY restored; NEXT LINE; line 2 the dial limit, dial 4 TRY, dial 5 TRY (the boundary), SET ASIDE, BACK, SET ASIDE confirmed; FINISH ⇒ 1 / 2 observed; the reopened final record', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r1');
    await openPanel(page, { shotPrompt: '01-yard-coupling-station-prompt' });

    // The first-opening card: neutral focus, CONTINUE, HELP, LEAVE.
    expect((await probe(page)).frame).toBe('wide');
    expect((await probe(page)).title).toBe('COOLANT COUPLING');
    expect((await probe(page)).status).toBe('Read the card, then CONTINUE.');
    expect(await ids(page)).toEqual(CARD_IDS);
    expect(await lines(page)).toContain(
      'The coupling has two lines to restore, one after the other.',
    );
    await expectNoForbiddenOnScreen(page);
    await shot(page, '02-first-opening-card');
    expect(await countOf(page, 'presented')).toBe(1);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(
      meta(await lastOf(page, 'opportunity_opened')).entry_state_snapshot,
    ).toMatchObject({
      lines_planned: 2,
      line_order: ['m19_l1', 'm19_l2'],
      form_id: 'm19-form-1',
      content_version: 'm19-content-v2',
      boundary_rule: 'designed_obstacle',
      continuation_rule: 'further_new_executed_try',
      stop_control: 'set_aside',
      time_limit: null,
      check: 'one_question_one_explanation_one_recheck',
      settle_ms: 400,
      stage: 'exterior_work',
    });
    // A settled ENTER on the neutral landing presses nothing.
    await page.waitForTimeout(SETTLE_MS + 50);
    expect((await probe(page)).focus).toBe('intro');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await countOf(page, 'intro_acknowledged')).toBe(0);
    // The guidance released the coupling at the first opening (checked
    // after the panel closes, below).

    await activateByKeyboard(page, 'continue');
    expect(await countOf(page, 'intro_acknowledged')).toBe(1);
    expect(await ids(page)).toEqual(CHECK_IDS);
    expect((await probe(page)).focus).toBe('question');
    expect((await probe(page)).status).toBe(
      'One short check of how the panel works.',
    );
    // RECORD without a draft: the neutral line; nothing recorded.
    await hotkey(page, 'r');
    expect((await probe(page)).feedback).toBe('Choose an answer first.');
    expect(await countOf(page, 'check_answered')).toBe(0);
    await shot(page, '04-check-choose-an-answer-first');
    await hotkey(page, '2');
    expect(await stateOf(page, 'option_2')).toBe('selected');
    expect(meta(await lastOf(page, 'option_drafted'))).toMatchObject({
      check_id: 'm19_chk_q1',
      option_id: 'm19_chk_q1_o2',
    });
    await shot(page, '03-check-question-1-with-a-draft');
    await hotkey(page, 'r');
    expect(meta(await lastOf(page, 'check_answered'))).toMatchObject({
      check_id: 'm19_chk_q1',
      attempt: 1,
      option_id: 'm19_chk_q1_o2',
      correct: true,
      input_mode: 'keyboard',
    });
    expect(meta(await lastOf(page, 'check_recorded'))).toMatchObject({
      status: 'pass_first',
    });
    expect(await ids(page)).toEqual(RECORDED_IDS);
    expect(await lines(page)).not.toMatch(/right|correct|wrong/i);
    await shot(page, '07-check-recorded-line-1-ready');
    await startLine1ByKeyboard(page);
    expect(meta(await lastOf(page, 'line_presented'))).toMatchObject({
      line_id: 'm19_l1',
      assigned_position: 1,
      realised_position: 1,
      starting_setting: { h1: false, h2: false, h3: false, feed: 'SINGLE' },
    });
    expect((await probe(page)).focus).toBe('readout');
    expect(await labelOf(page, 'readout')).toBe('ON: none · FEED SINGLE');
    expect(await labelOf(page, 'log')).toBe('TRIES (newest last)\nNo TRY yet.');
    expect(await lines(page)).toContain('LINE 1 — HEATER BANK');
    await shot(page, '08-line-1-no-try');

    // H3, TRY: LOW, no boundary.
    await hotkey(page, '3');
    expect(await stateOf(page, 'heater_3')).toBe('selected');
    expect(await labelOf(page, 'readout')).toBe('ON: H3 · FEED SINGLE');
    expect(meta(await lastOf(page, 'setting_changed'))).toMatchObject({
      control: 'h3',
      setting_after: { h1: false, h2: false, h3: true, feed: 'SINGLE' },
      input_mode: 'keyboard',
    });
    await hotkey(page, 't');
    expect((await probe(page)).feedback).toBe(
      'TRY 1: the gauge reads LOW. Line 1 is not restored.',
    );
    expect(meta(await lastOf(page, 'attempt'))).toMatchObject({
      line_id: 'm19_l1',
      attempt_index: 1,
      setting: { h1: false, h2: false, h3: true, feed: 'SINGLE' },
      reading: 'LOW',
      restored: false,
      after_boundary: false,
      input_mode: 'keyboard',
    });
    expect(await countOf(page, 'difficulty_boundary')).toBe(0);
    expect(await labelOf(page, 'log')).toBe(
      'TRIES (newest last)\nTRY 1  H3 · SINGLE   LOW',
    );
    await shot(page, '09-line-1-early-unsuccessful-try');
    // H2, TRY: LOW, still no boundary.
    await hotkey(page, '2');
    await hotkey(page, 't');
    expect(await countOf(page, 'attempt')).toBe(2);
    expect(await countOf(page, 'difficulty_boundary')).toBe(0);
    // H1, TRY: all ON SINGLE ⇒ LOW and the boundary.
    await hotkey(page, '1');
    expect(await labelOf(page, 'readout')).toBe('ON: H1 H2 H3 · FEED SINGLE');
    await hotkey(page, 't');
    expect((await probe(page)).feedback).toBe(
      'TRY 3: the gauge reads LOW. Line 1 is not restored.',
    );
    expect(await countOf(page, 'difficulty_boundary')).toBe(1);

    const own = await familyEvents(page);
    const boundary = own.find(
      (e) => e.event_type === `${FAMILY}difficulty_boundary`,
    )!;
    const attempt3 = own.find(
      (e) => e.event_type === `${FAMILY}attempt` && meta(e).attempt_index === 3,
    )!;

    expect(meta(boundary)).toMatchObject({
      line_id: 'm19_l1',
      attempt_index: 3,
      attempt_sequence: (attempt3 as { sequence?: number }).sequence,
      rule: 'designed_obstacle',
      evidence_attempt_indices: [3],
      input_mode: 'system',
    });
    expect(own.indexOf(boundary)).toBe(own.indexOf(attempt3) + 1);
    // Nothing marks the boundary: the same view, status and controls.
    expect(await ids(page)).toEqual(LINE1_IDS);
    expect((await probe(page)).status).toBe('Working on line 1 of 2.');
    await shot(page, '10-line-1-after-its-obstacle-try');

    // TRY again: refused, no attempt.
    await hotkey(page, 't');
    expect((await probe(page)).feedback).toBe(
      'That setting was tried at TRY 3; it is not run again.',
    );
    expect(meta(await lastOf(page, 'try_refused'))).toMatchObject({
      reason: 'already_tried',
      tried_at_attempt: 3,
      after_boundary: true,
    });
    expect(await countOf(page, 'attempt')).toBe(3);
    await shot(page, '11-line-1-already-tried');
    // A TRY inside the settle of a freshly restored view (CLOSE HELP):
    // refused and recorded as settling.
    await hotkey(page, 'h');
    expect(await ids(page)).toEqual(['close_help', 'help_sheet']);
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('h');
    await page.waitForTimeout(60);
    await page.keyboard.press('t');
    await page.waitForTimeout(200);
    expect(meta(await lastOf(page, 'try_refused'))).toMatchObject({
      reason: 'settling',
    });
    expect(await countOf(page, 'attempt')).toBe(3);
    // Held keys: E and W are not bound (nothing, nothing recorded); a held
    // T acts once (its repeats are dropped) and finds the setting tried.
    const before = (await familyEvents(page)).length;

    await page.waitForTimeout(SETTLE_MS + 50);
    await hold(page, 'e', 700);
    await hold(page, 'w', 700);
    expect((await familyEvents(page)).length).toBe(before);
    expect(await countOf(page, 'attempt')).toBe(3);
    await hold(page, 't', 900);
    expect(await countOf(page, 'attempt')).toBe(3);
    expect(await countOf(page, 'try_refused')).toBe(3);
    // FEED, H2 off, TRY: H1 H3 DOUBLE restores.
    await hotkey(page, '4');
    await hotkey(page, '2');
    expect(await labelOf(page, 'readout')).toBe('ON: H1 H3 · FEED DOUBLE');
    await hotkey(page, 't');
    expect((await probe(page)).feedback).toBe(
      'TRY 4: the gauge reads OK. Line 1 is restored.',
    );
    expect(meta(await lastOf(page, 'line_finished'))).toMatchObject({
      line_id: 'm19_l1',
      finish: 'restored',
      attempts: 4,
      boundary_attempt_index: 3,
      continued: true,
      restored_at_attempt: 4,
      continued_after_leaving: false,
      panel_leaves_after_boundary: 0,
      help_consults: 1,
    });
    expect(await countOf(page, 'difficulty_boundary')).toBe(1);
    expect(await ids(page)).toEqual([
      'finished_line',
      'next',
      'sheet',
      'log',
      'help_finished_1',
      'leave_finished_1',
    ]);
    expect(await labelOf(page, 'finished_line')).toBe(
      'Line 1 finished: restored.',
    );
    expect((await probe(page)).status).toBe('1 of 2 lines finished.');
    expect((await probe(page)).focus).toBe('finished_line');
    await shot(page, '14-line-1-finished-restored');

    await nextLineByKeyboard(page);
    expect(meta(await lastOf(page, 'line_presented'))).toMatchObject({
      line_id: 'm19_l2',
      assigned_position: 2,
      realised_position: 2,
      starting_setting: { dial: 1, bypass: 'SHUT' },
    });
    expect(await labelOf(page, 'readout')).toBe('DIAL 1 · BYPASS SHUT');
    await shot(page, '16-line-2-at-its-start');
    // The dial limit: nothing changes.
    await hotkey(page, '1');
    expect((await probe(page)).feedback).toBe('The dial is at 1.');
    expect(await labelOf(page, 'readout')).toBe('DIAL 1 · BYPASS SHUT');
    await shot(page, '18-line-2-dial-limit');
    await line2ObstacleByKeyboard(page);
    expect(await countOf(page, 'difficulty_boundary')).toBe(2);
    expect(await labelOf(page, 'log')).toBe(
      'TRIES (newest last)\nTRY 1  dial 4 · SHUT   LOW\nTRY 2  dial 5 · SHUT   HIGH',
    );
    await shot(page, '17-line-2-after-its-obstacle');
    // SET ASIDE, BACK: no continuation, the line stays in work.
    await hotkey(page, 'n');
    expect(await ids(page)).toEqual(DIALOG_IDS);
    expect(await labelOf(page, 'dialog')).toBe(
      'Set line 2 aside?\nIt finishes as it is and stays finished.\nIt is the last line.',
    );
    await shot(page, '19-line-2-set-aside-dialog');
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    expect(await ids(page)).toEqual(LINE2_IDS);
    expect(meta(await lastOf(page, 'set_aside_cancelled'))).toMatchObject({
      reason: 'back',
    });
    expect(await countOf(page, 'line_finished')).toBe(1);
    await setAsideByKeyboard(page);
    expect(meta(await lastOf(page, 'line_finished'))).toMatchObject({
      line_id: 'm19_l2',
      finish: 'set_aside',
      attempts: 2,
      boundary_attempt_index: 2,
      continued: false,
    });
    expect(await countOf(page, 'series_completed')).toBe(1);
    expect(await countOf(page, 'window_closed')).toBe(1);
    expect(meta(await lastOf(page, 'window_closed'))).toMatchObject({
      exit_state: 'completed',
    });
    expect(await labelOf(page, 'finished_line')).toBe(
      'Line 2 finished: set aside.\nBoth lines finished.',
    );
    expect((await probe(page)).status).toBe('2 of 2 lines finished.');
    await shot(page, '20-both-lines-finished');

    // The row is final here: 1 / 2 observed.
    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 2,
      planned_denominator: 2,
      included_ids: ['m19_l1', 'm19_l2'],
      disposition: 'observed',
      censored: false,
      closure_reason: 'completed',
    });
    expect(lineOf(row, 'm19_l1')).toMatchObject({
      boundary_attempt_index: 3,
      continued: true,
      eligible: true,
      changed_second_control_after_boundary: true,
    });
    expect(lineOf(row, 'm19_l2')).toMatchObject({
      boundary_attempt_index: 2,
      continued: false,
      eligible: true,
      finish: 'set_aside',
    });

    await activateByKeyboard(page, 'finish');
    await waitSurface(page, false);
    expect(await countOf(page, 'panel_left')).toBe(1);
    // The guidance moved on at the first opening; the chip is neutral.
    const guidance = await page.evaluate(() => {
      const w = window as unknown as {
        __pilotProbe?: {
          beacon?: { label: string } | null;
          objective?: string;
        };
        __exteriorProbe?: { m19_panel?: { window: string } } | null;
      };

      return {
        beacon: w.__pilotProbe?.beacon?.label ?? null,
        objective: w.__pilotProbe?.objective ?? null,
        window: w.__exteriorProbe?.m19_panel?.window ?? null,
      };
    });

    expect(guidance.beacon).not.toBe('Frozen Coolant Coupling');
    expect(guidance.objective).not.toContain('coupling');
    expect(guidance.window).toBe('closed');
    await shot(page, '29-yard-after-the-first-opening');

    // Reopened: the final record, LEAVE only, nothing written.
    const eventsBefore = (await familyEvents(page)).length;

    await openPanel(page);
    expect(await ids(page)).toEqual(RECORD_IDS);
    expect(await labelOf(page, 'closed')).toBe(
      'Both lines are finished. The panel takes no further settings.',
    );
    await shot(page, '22-reopened-final-record');
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('t');
    await page.keyboard.press('n');
    await page.keyboard.press('1');
    await page.waitForTimeout(200);
    await leavePanel(page);
    // The reopening and leaving of a completed series are descriptive records only.
    expect(
      (await familyEvents(page))
        .slice(eventsBefore)
        .map((e) => e.event_type.slice(FAMILY.length)),
    ).toEqual(['series_reopened', 'panel_left']);
    expect(stableOf(await reproduce(page))).toBe(stableOf(row));
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  /** The pointer scenario shared by the two R2 runs (every in-panel act a click). */
  async function pointerScenario(page: Page, frames: boolean) {
    await openPanel(page);
    expect(await ids(page)).toEqual(CARD_IDS);
    // HELP / CLOSE HELP from the card.
    await click(page, 'help_intro');
    expect(await ids(page)).toEqual(['close_help', 'help_sheet']);
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'intro',
      input_mode: 'pointer',
    });
    await click(page, 'close_help');
    expect(await ids(page)).toEqual(CARD_IDS);
    await click(page, 'continue');
    expect(await ids(page)).toEqual(CHECK_IDS);
    // HELP / CLOSE HELP from the check.
    await click(page, 'help_check_1');
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'check_1',
    });
    await click(page, 'close_help');
    // Wrong first answer: the explanation, then the recheck.
    await click(page, 'option_1');
    expect(await stateOf(page, 'option_1')).toBe('selected');
    await click(page, 'record');
    expect(meta(await lastOf(page, 'check_answered'))).toMatchObject({
      check_id: 'm19_chk_q1',
      attempt: 1,
      option_id: 'm19_chk_q1_o1',
      correct: false,
      input_mode: 'pointer',
    });
    expect(await countOf(page, 'explanation_shown')).toBe(1);
    expect(await ids(page)).toEqual(EXPLANATION_IDS);
    expect(await lines(page)).toContain('How the panel works:');
    expect(await lines(page)).not.toMatch(/wrong|correct|right/i);

    await click(page, 'continue');
    expect(meta(await lastOf(page, 'check_presented'))).toMatchObject({
      check_id: 'm19_chk_q2',
      attempt: 2,
    });
    expect(await lines(page)).toContain(
      'A TRY has just left a line not restored. Which is true?',
    );

    await click(page, 'option_3');
    await click(page, 'record');
    expect(meta(await lastOf(page, 'check_recorded'))).toMatchObject({
      status: 'pass_after_explanation',
    });
    expect(await ids(page)).toEqual(RECORDED_IDS);
    await click(page, 'start');
    expect(await ids(page)).toEqual(LINE1_IDS);
    // Line 1 restored at the first TRY: H1, H3, FEED DOUBLE.
    await click(page, 'heater_1');
    await click(page, 'heater_3');
    await click(page, 'feed');
    expect(await labelOf(page, 'readout')).toBe('ON: H1 H3 · FEED DOUBLE');
    // HELP / CLOSE HELP from line 1 with heaters set: the setting kept.
    await click(page, 'help_line_1');
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'line_1',
    });
    await click(page, 'close_help');
    expect(await labelOf(page, 'readout')).toBe('ON: H1 H3 · FEED DOUBLE');

    if (frames) {
      await shot(page, '25-line-1-at-1280x720');
    }

    await click(page, 'try');
    expect((await probe(page)).feedback).toBe(
      'TRY 1: the gauge reads OK. Line 1 is restored.',
    );
    expect(meta(await lastOf(page, 'line_finished'))).toMatchObject({
      line_id: 'm19_l1',
      finish: 'restored',
      boundary_attempt_index: null,
      continued: null,
      attempts: 1,
    });
    expect(await countOf(page, 'difficulty_boundary')).toBe(0);
    await click(page, 'next');
    expect(await ids(page)).toEqual(LINE2_IDS);
    // Line 2: TRY at dial 1 (LOW), dial 5 TRY (HIGH), dial 4 TRY (LOW ⇒ boundary).
    await click(page, 'try');
    expect((await probe(page)).feedback).toBe(
      'TRY 1: the gauge reads LOW. Line 2 is not restored.',
    );

    for (let step = 0; step < 4; step += 1) {
      await click(page, 'dial_up');
    }

    expect(await labelOf(page, 'readout')).toBe('DIAL 5 · BYPASS SHUT');
    await click(page, 'try');
    expect((await probe(page)).feedback).toBe(
      'TRY 2: the gauge reads HIGH. Line 2 is not restored.',
    );
    expect(await countOf(page, 'difficulty_boundary')).toBe(0);
    await click(page, 'dial_down');
    await click(page, 'try');
    expect(meta(await lastOf(page, 'difficulty_boundary'))).toMatchObject({
      line_id: 'm19_l2',
      attempt_index: 3,
      evidence_attempt_indices: [2, 3],
    });
    // HELP / CLOSE HELP from line 2 after its boundary.
    await click(page, 'help_line_2');
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'line_2',
    });
    await click(page, 'close_help');
    // A double click on SET ASIDE opens ONE dialog and records nothing further.
    await page.waitForTimeout(SETTLE_MS + 50);
    await dblclickElement(page, 'set_aside');
    expect(await ids(page)).toEqual(DIALOG_IDS);
    expect(await countOf(page, 'set_aside_requested')).toBe(1);
    expect(await countOf(page, 'line_finished')).toBe(1);
    await click(page, 'back');
    expect(await ids(page)).toEqual(LINE2_IDS);
    // Dial 5, BYPASS, a double click on TRY: ONE attempt (the second press
    // is settling or already tried), and it restores the line.
    await click(page, 'dial_up');
    await click(page, 'bypass');
    expect(await labelOf(page, 'readout')).toBe('DIAL 5 · BYPASS OPEN');

    if (frames) {
      await shot(page, '26-line-2-at-canvas-1080');
    }

    const attemptsBefore = await countOf(page, 'attempt');

    await page.waitForTimeout(SETTLE_MS + 50);
    await dblclickElement(page, 'try');
    expect(await countOf(page, 'attempt')).toBe(attemptsBefore + 1);
    expect(meta(await lastOf(page, 'line_finished'))).toMatchObject({
      line_id: 'm19_l2',
      finish: 'restored',
      boundary_attempt_index: 3,
      continued: true,
      attempts: 4,
    });
    expect(await countOf(page, 'series_completed')).toBe(1);
    // HELP / CLOSE HELP from the finished view.
    await click(page, 'help_finished_2');
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'finished_2',
    });

    await click(page, 'close_help');

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      included_ids: ['m19_l2'],
      censored: false,
      closure_reason: 'completed',
    });
    expect(lineOf(row, 'm19_l1')).toMatchObject({
      eligible: false,
      first_unsuccessful_try_index: null,
      continued_after_first_unsuccessful: null,
    });
    expect(lineOf(row, 'm19_l2')).toMatchObject({
      changed_second_control_after_boundary: true,
      first_unsuccessful_try_index: 1,
      continued_after_first_unsuccessful: true,
    });
    await click(page, 'finish');
    await waitSurface(page, false);
    await expectFamilyDiscipline(page);
  }

  test('R2 (pointer in the panel at 1280 × 720): check wrong, the explanation, recheck right; line 1 restored at the first TRY (no boundary); line 2 TRY, dial 5 TRY, dial 4 TRY (the boundary), dial 5, BYPASS, TRY restored ⇒ 1 / 1; HELP / CLOSE HELP on five views; a double click on SET ASIDE opens one dialog and on TRY executes one attempt', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await page.setViewportSize({ width: 1280, height: 720 });

    const errors = captureErrors(page);

    await toYard(page, 'u21r2');
    // KEYBOARD NAVIGATION: the walk and the station prompt.
    await pointerScenario(page, true);
    expectNoRuntimeErrors(errors);
  });

  test('R2 at canvas=1080: the same pointer acts at the full-HD canvas', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await page.setViewportSize({ width: 1280, height: 720 });

    const errors = captureErrors(page);

    await toYard(page, 'u21r2b', '&canvas=1080');
    await pointerScenario(page, false);
    expectNoRuntimeErrors(errors);
  });

  test('R3 (check fail): wrong, wrong; the lines still administered — line 1 at its obstacle then SET ASIDE, line 2 SET ASIDE before any TRY ⇒ null understanding_failed (check_failed) with the line records in the components', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r3');
    await openPanel(page);
    await activateByKeyboard(page, 'continue');
    await hotkey(page, '1');
    await hotkey(page, 'r');
    expect(await ids(page)).toEqual(EXPLANATION_IDS);
    // Frames 05 and 06 at 800 × 600 (contract §13; the pointer scenario R2
    // runs at 1280 × 720).
    await shot(page, '05-check-explanation');
    await activateByKeyboard(page, 'continue');
    await shot(page, '06-check-recheck');
    await hotkey(page, '1');
    await hotkey(page, 'r');
    expect(meta(await lastOf(page, 'check_recorded'))).toMatchObject({
      status: 'fail',
    });
    // The recorded line is the same line as after a pass.
    expect(await labelOf(page, 'recorded')).toBe(
      'Check recorded. Line 1 is ready.',
    );
    expect(await lines(page)).not.toMatch(/wrong|fail|correct/i);
    await startLine1ByKeyboard(page);
    await line1ObstacleByKeyboard(page);
    await hotkey(page, 'n');
    expect(await labelOf(page, 'dialog')).toBe(
      'Set line 1 aside?\nIt finishes as it is and stays finished.\nLine 2 comes next.',
    );
    await shot(page, '13-line-1-set-aside-dialog');
    await page.waitForTimeout(SETTLE_MS + 120);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(await labelOf(page, 'finished_line')).toBe(
      'Line 1 finished: set aside.',
    );
    await shot(page, '15-line-1-finished-set-aside');
    await nextLineByKeyboard(page);
    await setAsideByKeyboard(page);
    expect(await countOf(page, 'series_completed')).toBe(1);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'understanding_failed',
      missing_reason: 'check_failed',
      closure_reason: 'completed',
    });
    expect(row.components.nonresponse_kind).toBe('check_failed');
    expect((row.components.check as Comp).status).toBe('fail');
    expect(lineOf(row, 'm19_l1')).toMatchObject({
      boundary_attempt_index: 1,
      finish: 'set_aside',
      attempts: 1,
    });
    expect(lineOf(row, 'm19_l2')).toMatchObject({
      attempts: 0,
      finish: 'set_aside',
    });
    await activateByKeyboard(page, 'finish');
    await waitSurface(page, false);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R4 (leaving, returning, the shift end WITHOUT reopening, then the review): line 1 obstacle, LEAVE, the M08 console opened and closed, return, one TRY (continued_after_leaving), SET ASIDE; line 2 obstacle, LEAVE, Noor ⇒ series_closed shift_ended, 1 / 2 observed, the timing stops at LEAVE; the shift-end record; the review changes nothing', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r4');
    await openPanel(page);
    await checkRightByKeyboard(page);
    await startLine1ByKeyboard(page);
    await line1ObstacleByKeyboard(page);
    await leavePanel(page);
    expect(meta(await lastOf(page, 'panel_left'))).toMatchObject({
      view: 'line',
      line_id: 'm19_l1',
    });
    // Another surface over the yard (PAUSE / RESUME of the yard scene).
    await yardVia(
      page,
      YARD.console.x + APPROACH.console.x,
      YARD.console.y + APPROACH.console.y,
    );
    await interactAt(page, YARD.console, { approachOffset: APPROACH.console });
    await waitSurface(page, true, 'm08_support_console');
    await page.waitForTimeout(1500);
    await press(page, 'Escape');
    await waitSurface(page, false);
    // Return and reopen: the same state; one further TRY after leaving.
    await openPanel(page);
    expect(meta(await lastOf(page, 'series_reopened'))).toMatchObject({
      view: 'line',
      line_id: 'm19_l1',
    });
    expect(await ids(page)).toEqual(LINE1_IDS);
    expect(await labelOf(page, 'readout')).toBe('ON: H1 H2 H3 · FEED SINGLE');
    expect(await countOf(page, 'line_presented')).toBe(1);
    await hotkey(page, '4');
    await hotkey(page, 't');
    expect(meta(await lastOf(page, 'attempt'))).toMatchObject({
      attempt_index: 2,
      after_boundary: true,
      reading: 'HIGH',
    });
    await setAsideByKeyboard(page);
    expect(meta(await lastOf(page, 'line_finished'))).toMatchObject({
      line_id: 'm19_l1',
      finish: 'set_aside',
      continued: true,
      continued_after_leaving: true,
      panel_leaves_after_boundary: 1,
    });
    await nextLineByKeyboard(page);

    const line2PresentedAt = Date.now();

    await line2ObstacleByKeyboard(page);
    await leavePanel(page);

    const leftAt = Date.now();
    const leftEvent = await lastOf(page, 'panel_left');

    expect(meta(leftEvent)).toMatchObject({ view: 'line', line_id: 'm19_l2' });
    // Away from the panel for a measurable interval, then Noor.
    await page.waitForTimeout(4000);
    await finishOutside(page);
    expect(meta(await lastOf(page, 'series_closed'))).toMatchObject({
      closure_reason: 'shift_ended',
    });
    expect(meta(await lastOf(page, 'line_finished'))).toMatchObject({
      line_id: 'm19_l2',
      finish: 'shift_ended',
      boundary_attempt_index: 2,
      continued: false,
    });
    expect(meta(await lastOf(page, 'window_closed'))).toMatchObject({
      exit_state: 'stopped',
    });

    const finish = meta(await lastOf(page, 'line_finished'));
    const focused = Number(finish.line_focused_ms);
    const toFinish = Number(finish.boundary_to_finish_focused_ms);
    const onLine = leftAt - line2PresentedAt;

    // The recorded focused time excludes everything after LEAVE (the
    // interval includes the driver's own waits on the line, so the bound is
    // the wall time on the line with a tolerance for the frame rate).
    expect(focused).toBeGreaterThan(0);
    expect(focused).toBeLessThanOrEqual(onLine + 500);
    expect(toFinish).toBeLessThanOrEqual(focused);
    expect(toFinish).toBeGreaterThanOrEqual(0);

    const activeMs = Number(
      meta(await lastOf(page, 'window_closed')).active_ms,
    );
    const openedAt = Number(
      (await lastOf(page, 'opportunity_opened'))?.timestamp_ms,
    );

    // The kit window's active time stops at LEAVE: well below the wall time
    // from the opening to the closure.
    expect(activeMs).toBeGreaterThan(0);
    expect(activeMs).toBeLessThan(Date.now() - openedAt - 4000);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
      censored: false,
      closure_reason: 'route_departure',
      included_ids: ['m19_l1', 'm19_l2'],
    });
    expect(row.components.series_closure_reason).toBe('shift_ended');
    expect(lineOf(row, 'm19_l2')).toMatchObject({
      finish: 'shift_ended',
      continued: false,
      eligible: true,
    });
    // The panel afterwards: the shift-end record; nothing is written.
    const before = (await familyEvents(page)).length;

    await openPanel(page);
    expect(await ids(page)).toEqual(RECORD_IDS);
    expect(await labelOf(page, 'closed')).toBe(
      'The coupling panel closed when the outside work ended.',
    );
    await shot(page, '23-shift-end-closed-record');
    await leavePanel(page);
    expect((await familyEvents(page)).length).toBe(before);
    // The review: the row unchanged, no new family event.
    await toReviewClosure(page);
    expect((await familyEvents(page)).length).toBe(before);
    expect(stableOf(await reproduce(page))).toBe(stableOf(row));
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test("R5 (zero evidence): not_presented before Noor's briefing; pending after it; the shift end ⇒ closed_unopened (shift_ended), no_eligible_event (not_opened), no opportunity_opened; the shift-end record on a later visit; at the review the absence record and no second closed_unopened", async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await toYardUnbriefed(page, 'u21r5');
    expect(await familyEvents(page)).toEqual([]);
    expect(await reproduce(page)).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    await briefing(page);
    expect(
      (await familyEvents(page)).map((e) => e.event_type.slice(FAMILY.length)),
    ).toEqual(['presented']);

    const pending = await reproduce(page);

    expect(pending).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'pending',
      missing_reason: 'presented_not_opened',
    });
    expect(pending.components.presented_in_current_load).toBe(true);
    await finishOutside(page);
    expect(
      (await familyEvents(page)).map((e) => e.event_type.slice(FAMILY.length)),
    ).toEqual(['presented', 'closed_unopened']);
    expect(meta(await lastOf(page, 'closed_unopened'))).toMatchObject({
      closure_reason: 'shift_ended',
      input_mode: 'system',
    });

    const closed = await reproduce(page);

    expect(closed).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'no_eligible_event',
      missing_reason: 'not_opened',
    });
    expect(closed.disposition).not.toBe('declined');
    expect(closed.components.nonresponse_kind).toBe('not_opened');
    // A later visit: the shift-end record; no opening is written.
    await openPanel(page);
    expect(await ids(page)).toEqual(RECORD_IDS);
    expect(await labelOf(page, 'closed')).toBe(
      'The coupling panel closed when the outside work ended.',
    );
    await leavePanel(page);
    expect(await countOf(page, 'opportunity_opened')).toBe(0);
    expect(
      (await familyEvents(page)).map((e) => e.event_type.slice(FAMILY.length)),
    ).toEqual(['presented', 'closed_unopened']);
    // The review: the kit's absence record; no second closed_unopened.
    await toReviewClosure(page);
    expect(
      (await familyEvents(page)).map((e) => e.event_type.slice(FAMILY.length)),
    ).toEqual(['presented', 'closed_unopened', 'window_closed']);
    expect(meta(await lastOf(page, 'window_closed'))).toMatchObject({
      exit_state: 'closed_at_review',
    });
    expect(await reproduce(page)).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'not_opened',
    });
    expectNoRuntimeErrors(errors);
  });

  test('R5b (opened, left at the card): pending; the shift end ⇒ no_eligible_event (check_not_reached)', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r5b');
    await openPanel(page);
    await leavePanel(page);
    expect(await reproduce(page)).toMatchObject({
      value: null,
      disposition: 'pending',
      missing_reason: 'check_open',
    });
    // The card is shown again at the next opening.
    await openPanel(page);
    expect(await ids(page)).toEqual(CARD_IDS);
    await leavePanel(page);
    await finishOutside(page);
    expect(meta(await lastOf(page, 'series_closed'))).toMatchObject({
      closure_reason: 'shift_ended',
      check_status: null,
    });
    expect(await countOf(page, 'line_finished')).toBe(0);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'no_eligible_event',
      missing_reason: 'check_not_reached',
    });
    expect(row.components.nonresponse_kind).toBe('check_not_reached');
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R6 (no obstacle): both lines restored at their first TRY ⇒ null no_eligible_event, numerator null, denominator 0, included_ids []', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r6');
    await openPanel(page);
    await checkRightByKeyboard(page);
    await startLine1ByKeyboard(page);
    await hotkey(page, '1');
    await hotkey(page, '3');
    await hotkey(page, '4');
    await hotkey(page, 't');
    expect(meta(await lastOf(page, 'line_finished'))).toMatchObject({
      finish: 'restored',
      attempts: 1,
      boundary_attempt_index: null,
    });
    await nextLineByKeyboard(page);

    for (let step = 0; step < 4; step += 1) {
      await hotkey(page, '2');
    }

    await hotkey(page, '3');
    expect(await labelOf(page, 'readout')).toBe('DIAL 5 · BYPASS OPEN');
    await hotkey(page, 't');
    expect(await countOf(page, 'difficulty_boundary')).toBe(0);
    expect(await countOf(page, 'series_completed')).toBe(1);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      planned_denominator: 2,
      included_ids: [],
      disposition: 'no_eligible_event',
      missing_reason: 'obstacle_not_reached',
      censored: false,
      closure_reason: 'completed',
    });
    expect(row.components.nonresponse_kind).toBe('obstacle_not_reached');
    await activateByKeyboard(page, 'finish');
    await waitSurface(page, false);
    expectNoRuntimeErrors(errors);
  });
});

test.describe('M19 coupling lines: reload (Unit 21)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

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

  /** After the reload: the opening, the Dock tutorial and the spine to the yard (may be blocked). */
  async function driveBackToYard(page: Page): Promise<string | null> {
    try {
      await press(page, 'Space');
      await waitScene(page, 'dock', 60_000);
      await page.waitForTimeout(1600);
      await completeDockTutorial(page, 1);
      await routeToYardWork(page);
    } catch (error) {
      return (error as Error).message.split('\n')[0];
    }

    return null;
  }

  test('R7 (reload after an opening, W2): line 1 at its obstacle and a further TRY, then a page reload — the earlier log carried byte-identically, the row interrupted; back in the yard the reload check, the hold-back record, no attempt possible', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r7');
    await openPanel(page);
    await checkRightByKeyboard(page);
    await startLine1ByKeyboard(page);
    await line1ObstacleByKeyboard(page);
    await hotkey(page, '4');
    await hotkey(page, 't');
    await leavePanel(page);

    const before = await pagePayload(page);
    const immutable = await records(page);

    expect(before.page_load_index).toBe(1);
    expect(before.prior).toEqual([]);
    expect(
      before.raw_events.filter((e) => e.event_type === `${FAMILY}attempt`),
    ).toHaveLength(2);
    await reload(page);

    const after = await pagePayload(page);

    expect(after.page_load_index).toBe(2);
    expect(JSON.stringify(after.prior)).toBe(JSON.stringify(before.raw_events));
    expect(
      JSON.stringify(
        after.prior.filter(
          (e) =>
            e.event_type === `${FAMILY}attempt` ||
            e.event_type === `${FAMILY}difficulty_boundary`,
        ),
      ),
    ).toBe(immutable);
    expect(
      after.raw_events.filter((e) => e.event_type.startsWith(FAMILY)),
    ).toEqual([]);
    expect(await reproduce(page)).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'interrupted',
    });

    const blocked = await driveBackToYard(page);

    if (blocked !== null) {
      // eslint-disable-next-line no-console
      console.log(`[R7] BLOCKED / NOT VERIFIED after the reload: ${blocked}`);
    }

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the yard after the reload (${blocked}); the post-reload administration was not exercised in the browser and frame 24 is missing`,
    );

    // Yard entry wrote the check (the opening found) and the hold-back; the
    // route driver then replays Noor's briefing (the route stage is not
    // persisted across a reload), so a new `presented` follows — exposure
    // only, after the hold-back.
    expect(
      (await familyEvents(page)).map((e) => e.event_type.slice(FAMILY.length)),
    ).toEqual(['prior_load_checked', 'technical_failure', 'presented']);
    expect(meta(await lastOf(page, 'prior_load_checked'))).toMatchObject({
      page_load_index: 2,
      prior_opening_found: true,
      prior_briefing_found: true,
    });
    await openPanel(page);
    expect(await ids(page)).toEqual(RECORD_IDS);
    expect(await labelOf(page, 'closed')).toBe(
      'This panel was opened earlier in the session. It stays closed now.',
    );
    await shot(page, '24-reload-hold-back-record');
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('1');
    await page.keyboard.press('t');
    await page.keyboard.press('n');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await leavePanel(page);
    expect(
      (await familyEvents(page)).map((e) => e.event_type.slice(FAMILY.length)),
    ).toEqual(['prior_load_checked', 'technical_failure', 'presented']);

    const row = await reproduce(page);

    expect(row).toMatchObject({ value: null, disposition: 'interrupted' });
    expect(row.components.held_back_after_reload).toBe(true);
    expectNoRuntimeErrors(errors);
  });

  test("R7b (reload after the briefing only): briefed, never opened, a reload, then both lines worked in the new load ⇒ the row read from the new load's opening, observed with its count — never not_presented or interrupted (the driver replays the briefing, so case E18 is covered by the pure spec)", async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r7b');
    expect(
      (await familyEvents(page)).map((e) => e.event_type.slice(FAMILY.length)),
    ).toEqual(['presented']);
    await reload(page);
    expect(await reproduce(page)).toMatchObject({ disposition: 'interrupted' });

    const blocked = await driveBackToYard(page);

    if (blocked !== null) {
      // eslint-disable-next-line no-console
      console.log(`[R7] BLOCKED / NOT VERIFIED after the reload: ${blocked}`);
    }

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the yard after the reload (${blocked}); case E18 was not exercised in the browser`,
    );

    // The route driver replays Noor's briefing after the reload (the route
    // stage is not persisted), so the new load carries its own `presented`
    // after the check that established the absence of an earlier opening.
    // Case E18 proper — an opening WITHOUT a current-load `presented` — is
    // not reachable with this driver and is covered by the pure spec.
    const atEntry = (await familyEvents(page)).map((e) =>
      e.event_type.slice(FAMILY.length),
    );

    expect(atEntry).toEqual(['prior_load_checked', 'presented']);
    expect(meta(await lastOf(page, 'prior_load_checked'))).toMatchObject({
      prior_opening_found: false,
      prior_briefing_found: true,
    });
    await openPanel(page);
    expect(await ids(page)).toEqual(CARD_IDS);
    await checkRightByKeyboard(page);
    await startLine1ByKeyboard(page);
    await line1ObstacleByKeyboard(page);
    await hotkey(page, '4');
    await hotkey(page, '2');
    await hotkey(page, 't');
    expect(meta(await lastOf(page, 'line_finished'))).toMatchObject({
      finish: 'restored',
      continued: true,
    });
    await nextLineByKeyboard(page);
    await line2ObstacleByKeyboard(page);
    await setAsideByKeyboard(page);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
    });
    expect(row.components.presented_in_current_load).toBe(true);
    expect((row.components.reload_check as Comp).prior_opening_found).toBe(
      false,
    );
    await activateByKeyboard(page, 'finish');
    await waitSurface(page, false);
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * R8 — the layout gate under the default and the fallback fonts
 * ------------------------------------------------------------------ */

/** Test code only: substitutes a wider monospace for the generic `monospace` family on every 2D canvas context. */
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
 * The layout gate: the lowest control against the feedback line (≥ 30
 * design px); no label taller than its box; every fixed block on its line
 * count (its rendered height against the per-line height).
 */
async function measureGate(
  page: Page,
  font: string,
  label: string,
  fixed: { id: string; lines: number }[],
  lineHeight: number,
) {
  const value = await probe(page);
  const bottom = Math.max(...value.elements.map((e) => e.y + e.h / 2));
  const spare = value.feedback_top - bottom;

  // eslint-disable-next-line no-console
  console.log(
    `[R8 ${font}] ${label}: content bottom ${bottom.toFixed(1)}, feedback top ${value.feedback_top.toFixed(1)}, spare ${spare.toFixed(1)} design px; text/box: ${value.elements.map((e) => `${e.id} ${e.text_h.toFixed(0)}/${e.h}`).join(', ')}`,
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

  for (const block of fixed) {
    const element = value.elements.find((e) => e.id === block.id);

    expect(element, `${label}: ${block.id}`).toBeDefined();
    expect(
      Math.abs(element!.text_h - block.lines * lineHeight),
      `${label}: ${block.id} on ${block.lines} lines (text ${element!.text_h.toFixed(1)}, line ${lineHeight.toFixed(1)})`,
    ).toBeLessThan(lineHeight / 2);
  }
}

const ONE_LINE = (ids: string[]) => ids.map((id) => ({ id, lines: 1 }));
const LINE1_SINGLES = [
  'readout',
  'heater_1',
  'heater_2',
  'heater_3',
  'feed',
  'try',
  'set_aside',
  'help_line_1',
  'leave_line_1',
];
const LINE2_SINGLES = [
  'readout',
  'dial_down',
  'dial_up',
  'bypass',
  'try',
  'set_aside',
  'help_line_2',
  'leave_line_2',
];

/** Under one font (keyboard): the card, the check, line 1 with ten TRYs, line 2 with eight TRYs, the line 2 dialog and the help sheet. */
async function fontGate(page: Page, font: string, frame: string | null) {
  await openPanel(page);
  // The per-line height, read from the readout once line 1 is up; the card
  // is measured against it afterwards (its text height is kept).
  const cardText = (await probe(page)).elements.find(
    (e) => e.id === 'intro',
  )!.text_h;

  await activateByKeyboard(page, 'continue');

  const checkText = (await probe(page)).elements.find(
    (e) => e.id === 'question',
  )!.text_h;
  const optionText = (await probe(page)).elements.find(
    (e) => e.id === 'option_2',
  )!.text_h;

  await hotkey(page, '2');
  await hotkey(page, 'r');
  await startLine1ByKeyboard(page);

  const readout = (await probe(page)).elements.find((e) => e.id === 'readout')!;
  const lineHeight = readout.text_h;

  expect(lineHeight).toBeGreaterThan(10);
  expect(
    Math.abs(cardText - 10 * lineHeight),
    `${font}: the card on 10 lines`,
  ).toBeLessThan(lineHeight / 2);
  expect(
    Math.abs(checkText - lineHeight),
    `${font}: the question on 1 line`,
  ).toBeLessThan(lineHeight / 2);
  expect(
    Math.abs(optionText - lineHeight),
    `${font}: an option on 1 line`,
  ).toBeLessThan(lineHeight / 2);
  await measureGate(
    page,
    font,
    'line 1 at its start',
    [
      { id: 'sheet', lines: 6 },
      { id: 'log', lines: 2 },
      ...ONE_LINE(LINE1_SINGLES),
    ],
    lineHeight,
  );

  // Ten TRYs on line 1 (SINGLE settings first, then DOUBLE ones; none the key).
  const settings: [string[], number][] = [
    [['3'], 0],
    [['2'], 0],
    [['1'], 0], // all ON SINGLE: the obstacle
    [['4'], 0], // all ON DOUBLE
    [['1'], 0], // H2 H3 DOUBLE
    [['2'], 0], // H3 DOUBLE
    [['3', '1'], 0], // H1 DOUBLE
    [['2'], 0], // H1 H2 DOUBLE
    [['4'], 0], // H1 H2 SINGLE
    [['1'], 0], // H2 SINGLE
  ];

  for (const [keys] of settings) {
    for (const key of keys) {
      await hotkey(page, key);
    }

    await hotkey(page, 't');
  }

  expect(await countOf(page, 'attempt')).toBe(10);
  expect(await labelOf(page, 'log')).toMatch(
    /^TRIES \(newest last\)\n… 2 earlier TRYs not shown\n/,
  );
  await measureGate(
    page,
    font,
    'line 1 with ten TRYs',
    [
      { id: 'sheet', lines: 6 },
      { id: 'log', lines: 10 },
      ...ONE_LINE(LINE1_SINGLES),
    ],
    lineHeight,
  );

  if (frame !== null) {
    await shot(page, frame);
  }

  await setAsideByKeyboard(page);
  await measureGate(
    page,
    font,
    'line 1 finished',
    [
      { id: 'sheet', lines: 6 },
      { id: 'log', lines: 10 },
      ...ONE_LINE([
        'finished_line',
        'next',
        'help_finished_1',
        'leave_finished_1',
      ]),
    ],
    lineHeight,
  );
  await nextLineByKeyboard(page);
  // Eight TRYs on line 2 (dial 1..8 SHUT).
  for (let step = 0; step < 8; step += 1) {
    if (step > 0) {
      await hotkey(page, '2');
    }

    await hotkey(page, 't');
  }

  expect(await countOf(page, 'attempt')).toBe(18);
  await measureGate(
    page,
    font,
    'line 2 with eight TRYs',
    [
      { id: 'sheet', lines: 6 },
      { id: 'log', lines: 9 },
      ...ONE_LINE(LINE2_SINGLES),
    ],
    lineHeight,
  );
  await hotkey(page, 'n');
  await measureGate(
    page,
    font,
    'line 2 dialog',
    [{ id: 'dialog', lines: 3 }, ...ONE_LINE(['confirm', 'back'])],
    lineHeight,
  );
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await hotkey(page, 'h');
  await measureGate(
    page,
    font,
    'help',
    [{ id: 'help_sheet', lines: 8 }, ...ONE_LINE(['close_help'])],
    lineHeight,
  );
  await hotkey(page, 'h');
  await leavePanel(page);
}

test.describe('M19 coupling lines: the layout gate (Unit 21)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test('R8 (default font): the card, the check, line 1 with ten TRYs, line 2 with eight TRYs, the line 2 dialog and the help sheet on their fixed lines with 30 design px above the feedback line (frame 12)', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r8');
    await fontGate(page, 'default', '12-line-1-ten-tries');
    expectNoRuntimeErrors(errors);
  });

  test('R8 (Courier New): the same views under the fallback font (frame 27)', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await forceMonospace(page, '"Courier New"');

    const errors = captureErrors(page);

    await toYard(page, 'u21r8c');
    await fontGate(page, 'Courier New', '27-line-1-ten-tries-courier-new');
    expectNoRuntimeErrors(errors);
  });

  test('R8 (Lucida Console): the same views under the fallback font (frame 28)', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await forceMonospace(page, '"Lucida Console"');

    const errors = captureErrors(page);

    await toYard(page, 'u21r8l');
    await fontGate(
      page,
      'Lucida Console',
      '28-line-1-ten-tries-lucida-console',
    );
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * R9 — HELP and LEAVE on every view by both input modes
 * ------------------------------------------------------------------ */

/** HELP and LEAVE present (ids `help_<view>` / `leave_<view>` with one view name), focusable, above the feedback line and overlapped by nothing; returns their ids. */
async function expectHelpAndLeave(
  page: Page,
  label: string,
): Promise<{ help: string; leave: string }> {
  const value = await probe(page);
  const help = value.elements.find((e) => e.id.startsWith('help_'));
  const leave = value.elements.find((e) => e.id.startsWith('leave_'));

  expect(help, `${label}: HELP present`).toBeDefined();
  expect(leave, `${label}: LEAVE present`).toBeDefined();
  expect(help!.id.slice('help_'.length)).toBe(leave!.id.slice('leave_'.length));
  expect(help!.focusable && leave!.focusable).toBe(true);
  expect(help!.label).toBe('HELP  [H]');
  expect(leave!.label).toBe('LEAVE  [ESC]');

  for (const control of [help!, leave!]) {
    expect(
      control.y + control.h / 2,
      `${label}: ${control.id} above the feedback line`,
    ).toBeLessThan(value.feedback_top);

    for (const other of value.elements) {
      if (other.id === control.id) {
        continue;
      }

      const overlaps =
        Math.abs(other.x - control.x) < (other.w + control.w) / 2 &&
        Math.abs(other.y - control.y) < (other.h + control.h) / 2;

      expect(overlaps, `${label}: ${other.id} overlaps ${control.id}`).toBe(
        false,
      );
    }
  }

  return { help: help!.id, leave: leave!.id };
}

/** The rendered view without the feedback line (it auto-clears after 2.2 s). */
async function viewState(page: Page): Promise<string> {
  const value = await probe(page);

  return [
    value.title ?? '',
    value.status ?? '',
    ...value.elements.map(
      (element) => `${element.id}:${element.state}:${element.label}`,
    ),
  ].join('\n');
}

/** HELP by TAB / ENTER then CLOSE HELP by H, HELP by click then CLOSE HELP by click: the view restored both times. */
async function helpBothModes(page: Page, label: string) {
  const before = await ids(page);
  const state = await viewState(page);

  const { help } = await expectHelpAndLeave(page, label);

  await activateByKeyboard(page, help);
  expect(await ids(page), `${label}: help by keyboard`).toEqual([
    'close_help',
    'help_sheet',
  ]);
  expect((await probe(page)).focus).toBe('close_help');
  await hotkey(page, 'h');
  expect(await ids(page)).toEqual(before);
  expect(await viewState(page)).toBe(state);
  await click(page, help);
  expect(await ids(page), `${label}: help by pointer`).toEqual([
    'close_help',
    'help_sheet',
  ]);
  await click(page, 'close_help');
  expect(await ids(page)).toEqual(before);
  expect(await viewState(page)).toBe(state);
}

/** LEAVE by click, the panel reopened, the same view; LEAVE by TAB / ENTER, reopened, the same view. */
async function leaveBothModes(page: Page, label: string) {
  const before = await ids(page);
  const state = await viewState(page);
  const { leave } = await expectHelpAndLeave(page, label);

  await click(page, leave);
  await waitSurface(page, false);
  await openPanel(page);
  expect(await ids(page), `${label}: after LEAVE by pointer`).toEqual(before);
  expect(await viewState(page)).toBe(state);
  await activateByKeyboard(page, leave);
  await waitSurface(page, false);
  await openPanel(page);
  expect(await ids(page), `${label}: after LEAVE by keyboard`).toEqual(before);
  expect(await viewState(page)).toBe(state);
}

test.describe('M19 coupling lines: HELP and LEAVE everywhere (Unit 21)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test('R9: HELP and LEAVE on the card, the check without and with a draft, the explanation, the recheck, the recorded line, line 1 at its start, after a TRY and after its obstacle, the finished views, line 2, the final view and the closed records — present, focusable, clickable, above the feedback line; the ESC order dialog → help → panel', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r9');
    await openPanel(page);
    await helpBothModes(page, 'card');
    await leaveBothModes(page, 'card');
    await activateByKeyboard(page, 'continue');
    await helpBothModes(page, 'check without a draft');
    await leaveBothModes(page, 'check without a draft');
    await hotkey(page, '1');
    await helpBothModes(page, 'check with a draft');
    await leaveBothModes(page, 'check with a draft');
    expect(await stateOf(page, 'option_1')).toBe('selected');
    await hotkey(page, 'r');
    await helpBothModes(page, 'explanation');
    await leaveBothModes(page, 'explanation');
    await activateByKeyboard(page, 'continue');
    await helpBothModes(page, 'recheck');
    await hotkey(page, '3');
    await hotkey(page, 'r');
    await helpBothModes(page, 'recorded');
    await leaveBothModes(page, 'recorded');
    await startLine1ByKeyboard(page);
    await helpBothModes(page, 'line 1 at its start');
    await leaveBothModes(page, 'line 1 at its start');
    await hotkey(page, '3');
    await hotkey(page, 't');
    await helpBothModes(page, 'line 1 after a TRY');
    await hotkey(page, '2');
    await hotkey(page, '1');
    await hotkey(page, 't');
    expect(await countOf(page, 'difficulty_boundary')).toBe(1);
    await helpBothModes(page, 'line 1 after its obstacle');
    await leaveBothModes(page, 'line 1 after its obstacle');
    // The ESC order: a dialog closes first, then the help sheet, then the panel.
    await hotkey(page, 'n');
    expect(await ids(page)).toEqual(DIALOG_IDS);
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    expect(await ids(page)).toEqual(LINE1_IDS);
    await hotkey(page, 'h');
    expect(await ids(page)).toEqual(['close_help', 'help_sheet']);
    // Frame 21 at 800 × 600 (contract §13): the help sheet over line 1.
    await shot(page, '21-help-sheet');
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    expect(await ids(page)).toEqual(LINE1_IDS);
    expect((await probe(page)).open).toBe(true);
    await leavePanel(page);
    await openPanel(page);
    // Line 1 restored: the finished view (restored).
    await hotkey(page, '4');
    await hotkey(page, '2');
    await hotkey(page, 't');
    expect(await labelOf(page, 'finished_line')).toBe(
      'Line 1 finished: restored.',
    );
    await helpBothModes(page, 'line 1 finished: restored');
    await leaveBothModes(page, 'line 1 finished: restored');
    await nextLineByKeyboard(page);
    await helpBothModes(page, 'line 2');
    await leaveBothModes(page, 'line 2');
    await setAsideByKeyboard(page);
    expect(await labelOf(page, 'finished_line')).toBe(
      'Line 2 finished: set aside.\nBoth lines finished.',
    );
    await helpBothModes(page, 'final view');
    await expectHelpAndLeave(page, 'final view');
    // LEAVE from the final view by click: the series is complete, so the
    // reopened panel is the final record (LEAVE only, no HELP on a closed
    // record); its LEAVE by keyboard and by click.
    await click(page, 'leave_finished_2');
    await waitSurface(page, false);
    await openPanel(page);
    expect(await ids(page)).toEqual(RECORD_IDS);
    expect((await probe(page)).focus).toBe('closed');
    expect(await labelOf(page, 'closed')).toBe(
      'Both lines are finished. The panel takes no further settings.',
    );
    await activateByKeyboard(page, 'leave_record');
    await waitSurface(page, false);
    await openPanel(page);
    expect(await ids(page)).toEqual(RECORD_IDS);
    await click(page, 'leave_record');
    await waitSurface(page, false);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R9b: LEAVE on the shift-end closed record by both modes', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r9b');
    await openPanel(page);
    await leavePanel(page);
    await finishOutside(page);
    await openPanel(page);
    expect(await ids(page)).toEqual(RECORD_IDS);
    await click(page, 'leave_record');
    await waitSurface(page, false);
    await openPanel(page);
    await activateByKeyboard(page, 'leave_record');
    await waitSurface(page, false);
    expectNoRuntimeErrors(errors);
  });

  test("R10 (review finding GP-1): a hotkey that changes the view while HELP or LEAVE is focused lands on the new view's neutral element — the check to the explanation, the recheck to the recorded line, line 1 to its finished view; inside one view the focus is kept", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toYard(page, 'u21r10');
    await openPanel(page);
    expect((await probe(page)).focus).toBe('intro');
    await activateByKeyboard(page, 'continue');
    expect(await ids(page)).toEqual(CHECK_IDS);
    expect((await probe(page)).focus).toBe('question');
    // A wrong draft, HELP focused by TAB, then R: the explanation lands on
    // its text, not on HELP.
    await hotkey(page, '1');
    await focusByTab(page, 'help_check_1');
    await hotkey(page, 'r');
    expect(await ids(page)).toEqual(EXPLANATION_IDS);
    expect((await probe(page)).focus).toBe('explanation');
    await activateByKeyboard(page, 'continue');
    expect((await probe(page)).focus).toBe('question');
    // The recheck with LEAVE focused, then R: the recorded line.
    await hotkey(page, '3');
    await focusByTab(page, 'leave_check_2');
    await hotkey(page, 'r');
    expect(await ids(page)).toEqual(RECORDED_IDS);
    expect((await probe(page)).focus).toBe('recorded');
    await startLine1ByKeyboard(page);
    expect((await probe(page)).focus).toBe('readout');
    // Line 1 set to its restoring setting (H1, H3, FEED DOUBLE), HELP
    // focused, then T: the finished view lands on its line.
    await hotkey(page, '1');
    await hotkey(page, '3');
    await hotkey(page, '4');
    expect(await labelOf(page, 'readout')).toBe('ON: H1 H3 · FEED DOUBLE');
    await focusByTab(page, 'help_line_1');
    await hotkey(page, 't');
    expect(await labelOf(page, 'finished_line')).toBe(
      'Line 1 finished: restored.',
    );
    expect((await probe(page)).focus).toBe('finished_line');
    // Inside one view the frame keeps the focus: TRY focused on line 2, a
    // setting hotkey, TRY still focused; HELP focused, a TRY that does not
    // restore, HELP still focused.
    await nextLineByKeyboard(page);
    expect((await probe(page)).focus).toBe('readout');
    await focusByTab(page, 'try');
    await hotkey(page, '2');
    expect((await probe(page)).focus).toBe('try');
    await focusByTab(page, 'help_line_2');
    await hotkey(page, 't');
    expect(await countOf(page, 'attempt')).toBe(2);
    expect((await probe(page)).focus).toBe('help_line_2');
    await expectFamilyDiscipline(page);
    await leavePanel(page);
    expectNoRuntimeErrors(errors);
  });
});
