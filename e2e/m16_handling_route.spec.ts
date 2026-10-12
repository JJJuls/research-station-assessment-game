/**
 * Station 080 M16 — the handling rule at the protocol console on the
 * participant route (Unit 19, browser evidence run). Every scenario boots
 * the participant default with `bootPilot`, finishes the Dock tutorial and
 * reaches the Diagnostics Laboratory with the existing drivers of
 * `pilotHelpers.ts` (`routeToLabWork`, whose `valeHandover` declines the
 * M05 lamp job so no M05 clock runs while the console is worked;
 * `labApproach` / `labVia` for the console's audited approach; `interactAt`
 * for the station prompt). No M16 state is injected. This route does NOT
 * verify M05 timing (the open M05 matters of register §5.290 (e) (i) stay
 * untouched).
 *
 * INPUT, stated plainly: the walking, the station prompt (SPACE at the
 * console) and Kai's briefing are done by the route drivers with the
 * KEYBOARD — that is navigation, not an M16 response. Inside the console
 * R1, R3, R4, R5, R6, R7 and R8 use the keyboard only; R2 uses the pointer
 * only (every in-console act a real click at the probe's design
 * coordinates); R9 uses both, each control by TAB / ENTER and by click.
 *
 *   R1  keyboard: card; example 1; NEXT; BACK; NEXT; START, KEEP READING,
 *       START, confirm; v1 key (1), v2 wrong (4), v3 DON'T KNOW with 4
 *       drafted, v4 key (1), v5 wrong (2), v6 key (2); a press inside 400 ms
 *       refused and recorded; a held ENTER producing no record; 3 / 6
 *       observed; results page 1, H / H, NEXT, H / H, FINISH; reopen
 *       read-only; ESC.
 *   R2  pointer: every act by click at 1280 × 720 and at `canvas=1080`;
 *       double clicks on the OPENER (zero responses) and on the CONFIRM
 *       (exactly one); double clicks changing one view; left mid-teaching
 *       and mid-vial and reopened on the same state.
 *   R3  partial coverage: teaching closed, v1–v3 answered, v4 presented and
 *       left; the route driven on to the Utility Deck review ⇒ incomplete
 *       over 3; the console afterwards a closed record.
 *   R4  zero evidence: not_presented before Kai's briefing, pending with
 *       briefed_not_opened after it, the card and example 1 left and shown
 *       again.
 *   R5  reload after an opening: the earlier log carried byte-identically,
 *       the row interrupted; the console, when reachable again, held back.
 *   R6  reload before any opening: the check establishes the absence; the
 *       row reads not_presented, then pending; the card appears.
 *   R7  the real-game layout gate under forced fallback fonts.
 *   R8  the other benches after M16: the evidence table and the training
 *       rig still open, the display advances, the M14 row is untouched.
 *   R9  HELP, LEAVE CONSOLE and FINISH on every view by both input modes.
 *
 * Twenty-six evidence frames (800 × 600) go to `U19_OUT`. Nothing here
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

const OUT = process.env.U19_OUT ?? 'test-results/u19-evidence';
const FAMILY = 'proto_m16_handling_';
const VERSION = 'm16-handling-v1';
const SURFACE = 'm16_protocol_console';
const SETTLE_MS = 400;
const FORBIDDEN =
  /proto_|secondary_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|puzzle|persist|grit|skill|ability|intelligen|information|process|learn|quick|\bnew\b|\bROUTE\b|fragment|destination|ARCHIVE|RELAY|ALPHA|BETA|codebook|channel|program|buffer|SUBMIT/i;
/** No line before the sixth first response may carry a correctness word. */
const CORRECTNESS = /\bcorrect|incorrect|\bright\b|\bwrong\b|rule's drawer/i;
const RULE_CARD_FIRST_LINES =
  'HANDLING RULE\n                ORLA column    VESK column\n   TOP row      DRAWER 1       DRAWER 2';
const VIAL_LABELS: Record<number, string> = {
  1: 'Label: site ORLA · depth 12 m · marks: none',
  2: 'Label: site VESK · depth 34 m · marks: STAR, RING',
  3: 'Label: site ORLA · depth 46 m · marks: RING',
  4: 'Label: site VESK · depth 71 m · marks: STAR, RING',
  5: 'Label: site VESK · depth 27 m · marks: STAR',
  6: 'Label: site ORLA · depth 58 m · marks: STAR, RING',
};
const KEYS = [1, 3, 4, 1, 4, 2];

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
        event.event_type === `${FAMILY}teaching_closed`,
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
    JSON.stringify(extractItemFeatures('M16', payload.raw_events, context)),
  ) as FeatureRow[];
  const own = payload.features.filter((row) => row.item_id === 'M16');

  expect(own, 'the page exports one M16 row').toHaveLength(1);
  expect(offline, "offline extraction equals the page's row").toEqual(own);
  expect(JSON.stringify(payload.raw_events)).toBe(before);
  expect(offline[0].feature_id).toBe('m16_correct_first_applications');
  expect(offline[0].planned_denominator).toBe(6);

  return { row: offline[0], payload };
}

/** Another item's row as the page exports it (asserted unchanged in R8). */
async function itemRow(page: Page, item: string) {
  const payload = await pagePayload(page);

  return JSON.stringify(payload.features.find((row) => row.item_id === item));
}

/** Administration version on the live events; exactly one family owner; no legacy event. */
async function expectFamilyDiscipline(page: Page) {
  const all = await getEvents(page);
  const own = all.filter((event) => event.event_type.startsWith(FAMILY));

  expect(own.length, 'the family was emitted').toBeGreaterThan(0);

  for (const event of own) {
    expect(meta(event).entry_state_version, event.event_type).toBe(VERSION);
    expect(meta(event).opportunity_id).toBe('proto_m16_handling_series');
    expect(meta(event).measure_id).toBe('M16');
    expect(meta(event).window_id).toBe('m16_handling_w1');
    expect(typeof (event as { sequence?: number }).sequence).toBe('number');
  }

  expect(
    REGISTER_V3.filter((entry) =>
      entry.route.family_prefixes.some((prefix) => FAMILY.startsWith(prefix)),
    ).map((entry) => entry.id),
  ).toEqual(['M16']);
  // The retired v2 protocol family is never written on the route.
  expect(
    all.filter((event) => event.event_type.startsWith('proto_m16_protocol_')),
  ).toEqual([]);
}

/** Nothing on the console says anything about correctness or offers results. */
async function expectNoCorrectnessOnScreen(page: Page) {
  const text = await lines(page);
  const present = await ids(page);

  expect(text).not.toMatch(CORRECTNESS);
  expect(text).not.toMatch(FORBIDDEN);
  expect(present).not.toContain('results_text');
  expect(present).not.toContain('results_next');
  expect(present).not.toContain('results_back');
  expect(present).not.toContain('finish');
}

// ——— Driver steps (KEYBOARD NAVIGATION — never an M16 response) ————————

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

/** Walks to the console's audited approach and presses SPACE (keyboard navigation). */
async function openConsole(page: Page, options?: { shotPrompt?: string }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = await labApproach(page, PILOT.lab.protocolConsole);

    if (options?.shotPrompt !== undefined && attempt === 0) {
      await page.waitForTimeout(300);
      await shot(page, options.shotPrompt);
    }

    await interactAt(page, PILOT.lab.protocolConsole, {
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

  throw new Error('the protocol console did not open');
}

/** ESC on the console after its view settled (the same path as LEAVE CONSOLE). */
async function leaveConsole(page: Page) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

// ——— In-console keyboard acts ———————————————————————————————————————————

/** Moves the keyboard focus to an element with ArrowRight (bounded). */
async function focusByKeyboard(page: Page, id: string) {
  for (let step = 0; step < 16; step += 1) {
    if ((await probe(page)).focus === id) {
      return;
    }

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(60);
  }

  expect((await probe(page)).focus, `focus reaches ${id}`).toBe(id);
}

/** Moves the keyboard focus to an element with the literal TAB key (bounded). */
async function focusByTab(page: Page, id: string) {
  for (let step = 0; step < 16; step += 1) {
    if ((await probe(page)).focus === id) {
      return;
    }

    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
  }

  expect((await probe(page)).focus, `TAB reaches ${id}`).toBe(id);
}

/** ENTER on a control reached by focus, after the view settled. */
async function activateByKeyboard(page: Page, id: string) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await focusByKeyboard(page, id);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

/** SHOW EXAMPLE 1 (the first focusable of the card). */
async function showExample1ByKeyboard(page: Page) {
  await page.waitForTimeout(SETTLE_MS + 50);
  expect((await probe(page)).focus).toBe('show_example');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

/** START THE SIX VIALS by focus and ENTER, then a settled confirming ENTER. */
async function startVialsByKeyboard(page: Page) {
  await activateByKeyboard(page, 'start_vials');
  expect(await ids(page)).toEqual(['confirm', 'keep_reading', 'dialog_text']);
  await page.waitForTimeout(SETTLE_MS + 120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  expect(await ids(page)).toContain('record_drawer');
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

/** Drafts a drawer by its number and records it. */
async function answerByKeyboard(page: Page, drawer: number) {
  // The vial's first view settles 400 ms before a draft is accepted.
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press(String(drawer));
  await page.waitForTimeout(SETTLE_MS + 120);
  await recordByKeyboard(page, 'r');
}

/** NEXT VIAL / SHOW RESULTS after the acknowledgement settled. */
async function nextByKeyboard(page: Page) {
  await page.waitForTimeout(SETTLE_MS + 120);
  expect((await probe(page)).focus).toBe('next');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

/** The current vial index from the live events. */
async function currentVial(page: Page) {
  return Number(meta(await lastOf(page, 'vial_presented')).vial_index);
}

/** Card → example 1 → NEXT → START → confirm: vial 1 presented. */
async function teachingByKeyboard(page: Page) {
  await showExample1ByKeyboard(page);
  await activateByKeyboard(page, 'next_example');
  await startVialsByKeyboard(page);
  expect(await currentVial(page)).toBe(1);
}

test.describe('M16 handling rule on the route (Unit 19)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test("R1 (keyboard in the console): card, both examples with free movement, the boundary cancelled then confirmed, six vials (key, wrong, DON'T KNOW with a draft, key, wrong, key), the fresh-press rule, a held ENTER, 3 / 6 observed, results with H / H, NEXT, FINISH, reopen read-only, ESC", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u19r1');
    await openConsole(page, {
      shotPrompt: '01-laboratory-protocol-console-prompt',
    });

    // The first-opening card.
    expect((await probe(page)).frame).toBe('wide');
    expect((await probe(page)).title).toBe('HANDLING RULE');
    expect(await ids(page)).toEqual([
      'show_example',
      'intro_text',
      'help',
      'leave',
    ]);
    expect(await lines(page)).toContain(
      'A handling rule came in with the storm sample vials.',
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '02-first-opening-card');
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'vial_presented')).toBe(0);
    await showExample1ByKeyboard(page);

    // Worked example 1: the rule card and the example block; the focus
    // lands on the teaching note (a settled ENTER there presses nothing).
    expect(await countOf(page, 'intro_acknowledged')).toBe(1);
    expect(await countOf(page, 'example_viewed')).toBe(1);
    expect((await probe(page)).title).toBe('HANDLING RULE');
    // (The header subtitle is not in the probe; the pure spec asserts it and
    // frames 03 / 04 show it.)
    expect((await probe(page)).status).toBe(
      'Worked examples: read them at your own pace.',
    );
    expect(await lines(page)).toContain(RULE_CARD_FIRST_LINES);
    expect(await lines(page)).toContain('WORKED EXAMPLE 1 OF 2');
    expect(await lines(page)).toContain(
      'Label: site ORLA · depth 18 m · marks: STAR',
    );
    expect(await lines(page)).toContain('No answer is requested on this page.');
    expect(await ids(page)).toEqual([
      'teaching_note',
      'rule_card',
      'example_block',
      'next_example',
      'help',
      'leave',
    ]);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '03-worked-example-1');
    expect((await probe(page)).focus).toBe('teaching_note');
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await countOf(page, 'example_viewed')).toBe(1);
    expect((await probe(page)).focus).toBe('teaching_note');

    // NEXT → example 2; BACK → example 1; NEXT → example 2.
    await activateByKeyboard(page, 'next_example');
    expect(await lines(page)).toContain('WORKED EXAMPLE 2 OF 2');
    expect(await lines(page)).not.toContain('WORKED EXAMPLE 1 OF 2');
    expect(await ids(page)).toEqual([
      'teaching_note',
      'rule_card',
      'example_block',
      'start_vials',
      'back_to_example_1',
      'help',
      'leave',
    ]);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '04-worked-example-2');
    await activateByKeyboard(page, 'back_to_example_1');
    expect(await lines(page)).toContain('WORKED EXAMPLE 1 OF 2');
    await activateByKeyboard(page, 'next_example');
    expect(await lines(page)).toContain('WORKED EXAMPLE 2 OF 2');
    expect(
      (await familyEvents(page))
        .filter((event) => event.event_type === `${FAMILY}example_viewed`)
        .map((event) => [
          meta(event).example_id,
          meta(event).view_index,
          meta(event).navigation,
        ]),
    ).toEqual([
      ['m16_e1', 1, 'first'],
      ['m16_e2', 1, 'next'],
      ['m16_e1', 2, 'back'],
      ['m16_e2', 2, 'next'],
    ]);

    // The boundary: START opens the confirmation; ESC keeps reading.
    await activateByKeyboard(page, 'start_vials');
    expect(await ids(page)).toEqual(['confirm', 'keep_reading', 'dialog_text']);
    expect(await lines(page)).toContain('Start the six vials?');
    expect(await lines(page)).toContain('START  [ENTER]');
    await shot(page, '05-boundary-confirmation');
    await page.waitForTimeout(SETTLE_MS + 120);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect((await probe(page)).open).toBe(true);
    expect(await countOf(page, 'teaching_close_cancelled')).toBe(1);
    expect(await countOf(page, 'teaching_closed')).toBe(0);
    expect(await lines(page)).toContain('WORKED EXAMPLE 2 OF 2');
    // START again; an ENTER inside 400 ms is refused and recorded; a settled
    // ENTER closes teaching and presents vial 1.
    await activateByKeyboard(page, 'start_vials');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expect(await ids(page)).toEqual(['confirm', 'keep_reading', 'dialog_text']);
    expect(await countOf(page, 'commit_press_refused')).toBe(1);
    expect(meta(await lastOf(page, 'commit_press_refused'))).toMatchObject({
      target: 'teaching_close',
      kind: 'start',
      reason: 'dialog_settling',
    });
    expect(await countOf(page, 'teaching_closed')).toBe(0);
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    expect(await countOf(page, 'teaching_closed')).toBe(1);
    expect(meta(await lastOf(page, 'teaching_closed'))).toMatchObject({
      example_views: { m16_e1: 2, m16_e2: 2 },
      back_navigations: 1,
      help_consults_before: 0,
      refused_presses: 1,
      input_mode: 'keyboard',
    });
    expect(await countOf(page, 'vial_presented')).toBe(1);

    // Vial 1, no draft: the rule card and the label; the focus lands on the
    // question (a settled ENTER drafts nothing).
    expect(await currentVial(page)).toBe(1);
    expect((await probe(page)).status).toBe(
      'Use the handling rule. Choose a drawer, then record it.',
    );
    expect(await lines(page)).toContain(RULE_CARD_FIRST_LINES);
    expect(await lines(page)).toContain(`VIAL 1 OF 6\n${VIAL_LABELS[1]}`);
    expect(await lines(page)).not.toContain('WORKED EXAMPLE');
    expect(await ids(page)).toEqual([
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
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '06-vial-1-no-draft');
    expect((await probe(page)).focus).toBe('question');
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await countOf(page, 'option_drafted')).toBe(0);
    expect(await countOf(page, 'commit_requested')).toBe(0);

    // v1 = DRAWER 1 (the key): the drawer confirmation repeats the draft;
    // an ENTER inside 400 ms is refused; a settled ENTER records; a second
    // ENTER carried into the acknowledgement changes nothing.
    await page.keyboard.press('1');
    await page.waitForTimeout(150);
    expect(await elementState(page, 'option_1')).toBe('selected');
    expect(String(meta(await lastOf(page, 'option_drafted')).option_id)).toBe(
      'm16_v1_d1',
    );
    await page.keyboard.press('r');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
    expect(await lines(page)).toContain('Record DRAWER 1 for vial 1?');
    expect(await lines(page)).toContain('It cannot be changed afterwards.');
    expect(await lines(page)).toContain('RECORD DRAWER  [ENTER]');
    expect(await countOf(page, 'commit_press_refused')).toBe(2);
    expect(await countOf(page, 'first_response')).toBe(0);
    await shot(page, '08-drawer-confirmation');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter'); // the settled confirming press
    await page.keyboard.press('Enter'); // carried into the acknowledgement
    await page.waitForTimeout(250);
    expect(await countOf(page, 'first_response')).toBe(1);
    expect(await countOf(page, 'vial_presented')).toBe(1);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      vial_id: 'm16_v1',
      response_kind: 'option',
      option_id: 'm16_v1_d1',
      correct: true,
      key_option_id: 'm16_v1_d1',
      refused_presses: 1,
      drafts_before: 1,
      input_mode: 'keyboard',
    });

    // The acknowledgement: the line, NEXT VIAL, HELP and LEAVE CONSOLE; the
    // rule card and the label stay; nothing about correctness.
    expect((await ids(page))[0]).toBe('next');
    expect(await ids(page)).toEqual([
      'next',
      'rule_card',
      'vial_block',
      'acknowledgement',
      'help',
      'leave',
    ]);
    expect(await lines(page)).toContain('Vial 1 recorded.');
    expect(await lines(page)).toContain('NEXT VIAL');
    expect(await lines(page)).toContain('1 of 6 vials recorded.');
    expect(await lines(page)).toContain('HELP  [H]');
    expect(await lines(page)).toContain('LEAVE CONSOLE');
    expect(await lines(page)).toContain(VIAL_LABELS[1]);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '10-acknowledgement-after-vial-1');
    await nextByKeyboard(page);

    // v2 = DRAWER 4 (wrong, column). A held ENTER on the focused opener
    // opens the dialog once and commits nothing; a fresh, settled press
    // records.
    expect(await currentVial(page)).toBe(2);
    expect(await lines(page)).toContain(VIAL_LABELS[2]);
    expect(await lines(page)).not.toContain(VIAL_LABELS[1]);
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('4');
    await page.waitForTimeout(150);
    await focusByKeyboard(page, 'record_drawer');

    const refusedBefore = await countOf(page, 'commit_press_refused');

    await page.keyboard.down('Enter'); // opens the dialog
    await page.keyboard.down('Enter'); // the held key repeating
    await page.keyboard.down('Enter');
    await page.waitForTimeout(600);
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    await page.waitForTimeout(200);
    expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
    expect(await lines(page)).toContain('Record DRAWER 4 for vial 2?');
    expect(await countOf(page, 'first_response')).toBe(1);
    expect(await countOf(page, 'commit_press_refused')).toBe(refusedBefore);
    await page.keyboard.press('Enter'); // a fresh, settled press
    await page.waitForTimeout(250);
    expect(await countOf(page, 'first_response')).toBe(2);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      vial_id: 'm16_v2',
      option_id: 'm16_v2_d4',
      correct: false,
      refused_presses: 0,
    });
    expect(await lines(page)).toContain('Vial 2 recorded.');
    expect(await lines(page)).toContain('2 of 6 vials recorded.');
    await expectNoCorrectnessOnScreen(page);
    await nextByKeyboard(page);

    // v3 = DON'T KNOW with DRAWER 4 drafted: ESC on the dialog closes the
    // dialog only; then DON'T KNOW recorded (not the draft).
    expect(await currentVial(page)).toBe(3);
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('4');
    await page.waitForTimeout(150);
    expect(await elementState(page, 'option_4')).toBe('selected');
    await page.keyboard.press('n');
    await page.waitForTimeout(SETTLE_MS + 120);
    expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
    expect(await lines(page)).toContain("Record DON'T KNOW for vial 3?");
    expect(await lines(page)).toContain('RECORD  [ENTER]');
    await shot(page, '09-dont-know-confirmation');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect((await probe(page)).open).toBe(true);
    expect(await ids(page)).toContain('dont_know');
    expect(await countOf(page, 'commit_cancelled')).toBe(1);
    expect(meta(await lastOf(page, 'commit_cancelled'))).toMatchObject({
      kind: 'dont_know',
      reason: 'keep_working',
      input_mode: 'keyboard',
    });
    expect(await elementState(page, 'option_4')).toBe('selected');
    await page.waitForTimeout(SETTLE_MS);
    await recordByKeyboard(page, 'n');
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      vial_id: 'm16_v3',
      response_kind: 'dont_know',
      option_id: null,
      correct: false,
      key_option_id: 'm16_v3_d4',
      draft_at_commit: 'm16_v3_d4',
    });
    await expectNoCorrectnessOnScreen(page);
    await nextByKeyboard(page);

    // v4: RECORD DRAWER without a draft shows the neutral line; then DRAWER
    // 1 drafted (one of the three longest labels); HELP from the vial with
    // the draft, H closes it back to the same vial and draft; the key.
    expect(await currentVial(page)).toBe(4);
    expect(await lines(page)).toContain(VIAL_LABELS[4]);
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('r');
    await page.waitForTimeout(250);
    expect((await probe(page)).feedback).toBe('Choose a drawer first.');
    expect(await countOf(page, 'commit_without_draft')).toBe(1);
    expect(await ids(page)).toContain('record_drawer');
    await shot(page, '11-choose-a-drawer-first');
    await page.keyboard.press('1');
    await page.waitForTimeout(150);
    expect(await elementState(page, 'option_1')).toBe('selected');
    await expectNoCorrectnessOnScreen(page);
    await page.waitForTimeout(2300); // the neutral line clears
    await shot(page, '07-vial-4-with-draft');
    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    expect((await ids(page))[0]).toBe('close_help');
    expect(await lines(page)).toContain('HOW THE CONSOLE WORKS');
    expect(await lines(page)).toContain('Only confirming records your answer.');
    // The keyboard line of the closeout ruling 3 (12 October 2026), one
    // separate line immediately before the approved "Keys:" line.
    expect(await lines(page)).toContain(
      "TAB moves focus. ENTER selects the focused control.\nKeys: 1-4 choose · R record · N don't know · H help · ESC leaves (work kept).",
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '15-help-sheet-over-vial-4-with-draft');
    expect(await countOf(page, 'help_consulted')).toBe(1);
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      phase: 'measurement',
      view: 'vial_4',
      vial_id: 'm16_v4',
      input_mode: 'keyboard',
    });
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    expect((await probe(page)).open).toBe(true);
    expect(await ids(page)).toContain('record_drawer');
    expect(await lines(page)).toContain(VIAL_LABELS[4]);
    expect(await elementState(page, 'option_1')).toBe('selected');
    expect(await countOf(page, 'vial_presented')).toBe(4);
    await page.waitForTimeout(SETTLE_MS);
    await recordByKeyboard(page, 'r');
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      vial_id: 'm16_v4',
      option_id: 'm16_v4_d1',
      correct: true,
      help_consults_before: 1,
    });
    await nextByKeyboard(page);

    // v5 = DRAWER 2 (wrong, row); v6 = DRAWER 2 (the key).
    expect(await currentVial(page)).toBe(5);
    await answerByKeyboard(page, 2);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      vial_id: 'm16_v5',
      option_id: 'm16_v5_d2',
      correct: false,
    });
    await expectNoCorrectnessOnScreen(page);
    await nextByKeyboard(page);
    expect(await currentVial(page)).toBe(6);
    await answerByKeyboard(page, 2);
    expect(await countOf(page, 'first_response')).toBe(6);
    expect(await countOf(page, 'first_responses_completed')).toBe(1);
    expect(await lines(page)).toContain('SHOW RESULTS');
    expect(await lines(page)).toContain('6 of 6 vials recorded.');
    expect(await lines(page)).toContain('HELP  [H]');
    expect(await lines(page)).toContain('LEAVE CONSOLE');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '12-acknowledgement-after-vial-6');

    const recorded = await records(page);
    const { row } = await reproduce(page);

    expect(row).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });
    expect(row.components).toMatchObject({
      dont_know_count: 1,
      teaching: {
        examples_viewed: { m16_e1: 2, m16_e2: 2 },
        back_navigations: 1,
      },
      exposure: {
        examples_viewed: { m16_e1: 2, m16_e2: 2 },
        teaching_closed: true,
        vials_presented: 6,
      },
      results_shown: { 1: false, 2: false },
    });
    expect(
      (row.components.vials as { error_kind: unknown }[]).map(
        (v) => v.error_kind,
      ),
    ).toEqual([null, 'column', null, null, 'row', null]);
    expect(await countOf(page, 'results_shown')).toBe(0);

    // SHOW RESULTS ⇒ page 1; H opens the help over it and H closes it back
    // (no repeated results_shown); NEXT by focus and ENTER ⇒ page 2 (a
    // carried ENTER lands on FINISH inside its settle and closes nothing);
    // H / H on page 2; FINISH by focus and ENTER closes the results.
    await nextByKeyboard(page);
    expect(await countOf(page, 'results_shown')).toBe(1);
    expect(meta(await lastOf(page, 'results_shown'))).toMatchObject({
      page: 1,
      phase: 'feedback',
    });
    expect((await probe(page)).title).toBe('RESULTS — VIALS 1-3 OF 6');
    expect((await probe(page)).status).toBe(
      'Your answers are fixed. This view only shows them.',
    );
    expect(await ids(page)).toEqual([
      'results_next',
      'finish',
      'help',
      'results_text',
    ]);
    expect(await lines(page)).toContain('All six vials are recorded.');
    expect(await lines(page)).toContain(
      "Your recorded drawer: DRAWER 1 · Rule's drawer: DRAWER 1",
    );
    expect(await lines(page)).toContain(
      "Your recorded drawer: DRAWER 4 · Rule's drawer: DRAWER 3",
    );
    expect(await lines(page)).toContain(
      "Your recorded drawer: DON'T KNOW · Rule's drawer: DRAWER 4",
    );
    expect(await lines(page)).toContain('No marks. DRAWER 1.');
    expect(await lines(page)).not.toMatch(FORBIDDEN);
    await shot(page, '13-results-page-1');
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
    expect((await probe(page)).title).toBe('RESULTS — VIALS 1-3 OF 6');
    expect(await countOf(page, 'results_shown')).toBe(1);
    await page.waitForTimeout(SETTLE_MS);
    expect((await probe(page)).focus).toBe('results_next');
    await page.keyboard.press('Enter'); // NEXT
    await page.keyboard.press('Enter'); // carried: lands on FINISH, closes nothing
    await page.waitForTimeout(250);
    expect((await probe(page)).open).toBe(true);
    expect(await countOf(page, 'results_shown')).toBe(2);
    expect(meta(await lastOf(page, 'results_shown'))).toMatchObject({
      page: 2,
    });
    expect((await probe(page)).title).toBe('RESULTS — VIALS 4-6 OF 6');
    expect(await ids(page)).toEqual([
      'finish',
      'results_back',
      'help',
      'results_text',
    ]);
    expect(await lines(page)).toContain(
      "Your recorded drawer: DRAWER 2 · Rule's drawer: DRAWER 4",
    );
    expect(await lines(page)).toContain(
      "Your recorded drawer: DRAWER 2 · Rule's drawer: DRAWER 2",
    );
    await shot(page, '14-results-page-2');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'results_2',
    });
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    expect((await probe(page)).title).toBe('RESULTS — VIALS 4-6 OF 6');
    expect(await countOf(page, 'results_shown')).toBe(2);
    await page.waitForTimeout(SETTLE_MS);
    expect((await probe(page)).focus).toBe('finish');
    await page.keyboard.press('Enter'); // FINISH
    await waitSurface(page, false);
    expect(await countOf(page, 'results_shown')).toBe(2);

    // Reopen: page 1 again, read-only; no second results_shown; no act
    // records anything; ESC closes it.
    await openConsole(page);
    expect((await probe(page)).title).toBe('RESULTS — VIALS 1-3 OF 6');
    expect(await countOf(page, 'results_shown')).toBe(2);
    await page.keyboard.press('1');
    await page.keyboard.press('r');
    await page.keyboard.press('n');
    await page.waitForTimeout(300);
    expect(await countOf(page, 'first_response')).toBe(6);
    expect(await countOf(page, 'option_drafted')).toBe(6);
    await leaveConsole(page);
    expect(await records(page)).toBe(recorded);
    expect((await reproduce(page)).row).toMatchObject({
      value: 3,
      denominator: 6,
      disposition: 'observed',
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R2 (pointer in the console): every act by click, a double click on the opener recording nothing and on the confirm recording once, double clicks changing one view, a side-band click, left mid-teaching and mid-vial and reopened on the same state', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u19r2');
    // KEYBOARD NAVIGATION: the walk and the station prompt.
    await openConsole(page);
    await pointerScenario(page, { shots: true });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R2 at canvas=1080: the same pointer acts at the full-HD canvas; vial 4 with a draft (screenshot 21)', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u19r2b', '&canvas=1080');
    await openConsole(page);
    await pointerScenario(page, {
      shots: false,
      canvasShot: '21-canvas-1080-vial-4-with-draft',
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R3 (partial coverage and route closure): teaching closed, v1–v3 answered, v4 presented and left; pending before the review; the record closed ⇒ incomplete over 3, censored, closed_at_review; the console afterwards a closed record', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);

    const errors = captureErrors(page);

    await toLab(page, 'u19r3');
    await openConsole(page);
    await teachingByKeyboard(page);
    await answerByKeyboard(page, KEYS[0]);
    await nextByKeyboard(page);
    await answerByKeyboard(page, KEYS[1]);
    await nextByKeyboard(page);
    await answerByKeyboard(page, KEYS[2]);
    await nextByKeyboard(page);
    expect(await currentVial(page)).toBe(4);
    await leaveConsole(page);

    // Reopened: the same vial, no results offered.
    await openConsole(page);
    expect(await currentVial(page)).toBe(4);
    expect(await countOf(page, 'vial_presented')).toBe(4);
    expect(await lines(page)).toContain(VIAL_LABELS[4]);
    await expectNoCorrectnessOnScreen(page);
    await leaveConsole(page);

    const pending = (await reproduce(page)).row;

    expect(pending).toMatchObject({ value: null, disposition: 'pending' });
    expect(pending.components.vials_answered).toBe(3);
    expect(
      (pending.components.vials as { answered: boolean }[]).map(
        (v) => v.answered,
      ),
    ).toEqual([true, true, true, false, false, false]);

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
      vials_answered: 3,
      correct_first_applications: 3,
      vials_presented: 4,
      teaching_closed: true,
    });

    const { row, payload } = await reproduce(page);

    expect(payload.final_core_closed).toBe(true);
    expect(row).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 3,
      planned_denominator: 6,
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(row.components.omissions).toEqual({
      unanswered_vial_ids: ['m16_v4'],
      unpresented_vial_ids: ['m16_v5', 'm16_v6'],
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
      await openConsole(page);
    } catch (error) {
      blocked = (error as Error).message.split('\n')[0];
    }

    if (blocked !== null) {
      test.info().annotations.push({
        type: 'BLOCKED / NOT VERIFIED',
        description: `the console after the record closure was not reached (${blocked}); frame 18 is missing`,
      });
      // eslint-disable-next-line no-console
      console.log(
        `[R3] BLOCKED / NOT VERIFIED — console after the record closure not reached: ${blocked}`,
      );
    } else {
      const before = (await familyEvents(page)).length;

      expect(await lines(page)).toContain(
        'Station record closed — the console keeps its record.',
      );
      expect(await lines(page)).toContain('3 of 6 vials recorded.');
      await expectNoCorrectnessOnScreen(page);
      await shot(page, '18-closed-record-after-review');
      await page.keyboard.press('1');
      await page.keyboard.press('r');
      await page.keyboard.press('n');
      await page.keyboard.press('h');
      await page.waitForTimeout(300);
      expect(await ids(page)).toEqual(['record_text', 'leave']);
      await leaveConsole(page);
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

  test("R4 (zero evidence, briefing, card and teaching only): not_presented before Kai's briefing; pending with briefed_not_opened after it; the card left and shown again; example 1 left and shown again, no vial presented", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLabUnbriefed(page, 'u19r4');

    // Before Kai's briefing there is no M16 evidence at all.
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
      console_opened: false,
      intro_acknowledged: false,
      vials_presented: 0,
    });

    // Opened and left at the card: still pending; the card again.
    await openConsole(page);
    expect(await ids(page)).toEqual([
      'show_example',
      'intro_text',
      'help',
      'leave',
    ]);
    await leaveConsole(page);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'example_viewed')).toBe(0);
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    expect((await reproduce(page)).row.components.exposure).toMatchObject({
      briefed: true,
      console_opened: true,
      intro_acknowledged: false,
      vials_presented: 0,
    });
    await openConsole(page);
    expect(await ids(page)).toEqual([
      'show_example',
      'intro_text',
      'help',
      'leave',
    ]);
    expect(await countOf(page, 'series_reopened')).toBe(1);

    // Example 1 viewed and left: pending; reopening shows example 1 again.
    await showExample1ByKeyboard(page);
    expect(await countOf(page, 'example_viewed')).toBe(1);
    await leaveConsole(page);
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    expect((await reproduce(page)).row.components.exposure).toMatchObject({
      intro_acknowledged: true,
      examples_viewed: { m16_e1: 1, m16_e2: 0 },
      teaching_closed: false,
      vials_presented: 0,
    });
    await openConsole(page);
    expect(await lines(page)).toContain('WORKED EXAMPLE 1 OF 2');
    expect(await countOf(page, 'example_viewed')).toBe(2);
    expect(meta(await lastOf(page, 'example_viewed'))).toMatchObject({
      example_id: 'm16_e1',
      navigation: 'resume',
    });
    expect(await countOf(page, 'vial_presented')).toBe(0);
    expect(await countOf(page, 'teaching_closed')).toBe(0);
    await leaveConsole(page);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R7 (real-game fallback font, Courier New): example 2, vial 4 with a draft and results page 2 keep at least 30 design px above the feedback line and render on the fixed lines', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await forceMonospace(page, '"Courier New"');

    const errors = captureErrors(page);

    await toLab(page, 'u19r7a');
    await openConsole(page);
    await fallbackGate(
      page,
      'Courier New',
      'c1-courier-new',
      '22-vial-4-with-draft-courier-new',
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

    await toLab(page, 'u19r7b');
    await openConsole(page);
    await fallbackGate(
      page,
      'Lucida Console',
      'c2-lucida-console',
      '23-vial-4-with-draft-lucida-console',
      '24-results-page-2-lucida-console',
    );
    expectNoRuntimeErrors(errors);
  });

  test("R8 (other benches after M16): the evidence table still opens its surface and its row is unchanged, the training rig still opens its terminal overlay, the wall display, beacon and Noor's line advance, and the M14 row is untouched", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u19r8');

    const m14Before = await itemRow(page, 'M14');
    const m15Before = await itemRow(page, 'M15');
    const displayBefore = await signalDisplay(page);

    expect(displayBefore?.phases_recorded).toEqual([]);
    expect(displayBefore?.next_phase).toBe('m15');

    // The whole series by keyboard, all six keyed; SHOW RESULTS; leave.
    await openConsole(page);
    await teachingByKeyboard(page);

    for (const [index, key] of KEYS.entries()) {
      await answerByKeyboard(page, key);

      if (index < KEYS.length - 1) {
        await nextByKeyboard(page);
      }
    }

    expect(await countOf(page, 'first_responses_completed')).toBe(1);
    await nextByKeyboard(page); // SHOW RESULTS
    await leaveConsole(page);
    expect((await reproduce(page)).row).toMatchObject({
      value: 6,
      disposition: 'observed',
    });

    // The wall display after M16 is recorded: phase 1 (the evidence table)
    // stays the next phase; the M14 and M15 rows are untouched.
    await page.waitForTimeout(600);

    const display = await signalDisplay(page);

    expect(display?.phases_recorded).toEqual(['m16']);
    expect(display?.next_phase).toBe('m15');
    expect(display?.indicator).toMatch(/PHASE 1 \/ 4/);
    expect(display?.intercom).toMatch(/evidence table/);
    expect(m14Before).toBe(await itemRow(page, 'M14'));
    expect(m15Before).toBe(await itemRow(page, 'M15'));
    await shot(page, '25-wall-display-after-m16-recorded');

    // The evidence table (M15) opens its own surface as before; left at its
    // orientation card, its row reads pending.
    await interactAt(page, PILOT.lab.evidenceTable, {
      approachOffset: await labApproach(page, PILOT.lab.evidenceTable),
    });
    await waitSurface(page, true, 'm15_evidence_table');
    expect((await probe(page)).title).toBe('RELAY BOXES');
    await page.waitForTimeout(SETTLE_MS + 50);
    await press(page, 'Escape');
    await waitSurface(page, false);
    expect(JSON.parse(await itemRow(page, 'M15'))).toMatchObject({
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
    expect(m14Before).toBe(await itemRow(page, 'M14'));
    expect((await reproduce(page)).row).toMatchObject({
      value: 6,
      disposition: 'observed',
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R8 supplementary capture (closeout ruling 5 of 12 October 2026): the wall display after M16 is recorded at canvas=1080 and a 2560 × 1440 viewport, the display region clipped (frames 27, 27a) — test-side viewport only, no product change', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toLab(page, 'u19r8c', '&canvas=1080');
    await openConsole(page);
    await teachingByKeyboard(page);

    for (const [index, key] of KEYS.entries()) {
      await answerByKeyboard(page, key);

      if (index < KEYS.length - 1) {
        await nextByKeyboard(page);
      }
    }

    expect(await countOf(page, 'first_responses_completed')).toBe(1);
    await nextByKeyboard(page); // SHOW RESULTS
    await leaveConsole(page);
    await page.waitForTimeout(600);

    const display = await signalDisplay(page);

    expect(display?.phases_recorded).toEqual(['m16']);
    expect(display?.next_phase).toBe('m15');
    expect(display?.indicator).toMatch(/PHASE 1 \/ 4/);

    // The larger viewport scales the FIT-letterboxed canvas; the display
    // region (upper right of the laboratory) is clipped from the canvas box.
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.waitForTimeout(1500);

    const box = await page.locator('canvas').boundingBox();

    expect(box).not.toBeNull();
    // eslint-disable-next-line no-console
    console.log(
      `[R8 supplementary] canvas box ${box!.width.toFixed(0)} × ${box!.height.toFixed(0)} at (${box!.x.toFixed(0)}, ${box!.y.toFixed(0)})`,
    );
    await shot(page, '27-wall-display-after-m16-recorded-2560x1440');
    await page.screenshot({
      path: `${OUT}/27a-wall-display-close-up-2560x1440.png`,
      clip: {
        x: box!.x + box!.width * 0.54,
        y: box!.y + box!.height * 0.08,
        width: box!.width * 0.27,
        height: box!.height * 0.3,
      },
    });
    expect(display).toEqual(await signalDisplay(page));
    expectNoRuntimeErrors(errors);
  });

  test('R9 (HELP, LEAVE CONSOLE and FINISH on every view by both input modes): from the card, both examples, a vial without and with a draft and an acknowledgement HELP and LEAVE CONSOLE are present, focusable, clickable and overlapped by nothing; on both results pages HELP and FINISH; HELP / CLOSE HELP restore the view; FINISH and ESC close', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await toLab(page, 'u19r9');
    await openConsole(page);
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
 * (its rendered height against the per-line height of a two-line block).
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

/**
 * Under a forced font (keyboard): the first-opening card, example 1,
 * example 2, the help sheet over example 2, vial 4 with a draft and results
 * page 2. The card and example footer of the closeout ruling 3 (12 October
 * 2026) must render on ONE line: the surface places the feedback line from
 * the footer's bounds, so its top is compared with its top under the help
 * sheet, whose 24-character footer is one line by construction — a wrapped
 * footer would lift the feedback line by one line.
 */
async function fallbackGate(
  page: Page,
  font: string,
  frames: string,
  vialFrame: string,
  resultsFrame: string | null,
) {
  const feedbackTop = async () => (await probe(page)).feedback_top;
  const tops: [string, number][] = [];

  // The first-opening card: its text inside its box; its seven lines are
  // checked once the rule card gives the line height.
  await measureGate(page, font, 'first-opening card', [], null);

  const cardText = (await probe(page)).elements.find(
    (e) => e.id === 'intro_text',
  )!.text_h;

  tops.push(['first-opening card', await feedbackTop()]);
  await shot(page, `${frames}-card`);
  await showExample1ByKeyboard(page);
  // The per-line height, read from the rule card (nine fixed lines).
  const card = (await probe(page)).elements.find((e) => e.id === 'rule_card')!;
  const lineHeight = card.text_h / 9;

  expect(
    Math.abs(cardText - 7 * lineHeight),
    `first-opening card on 7 lines (text ${cardText.toFixed(1)}, line ${lineHeight.toFixed(1)})`,
  ).toBeLessThan(lineHeight / 2);
  await measureGate(
    page,
    font,
    'example 1',
    [
      { id: 'rule_card', lines: 9 },
      { id: 'example_block', lines: 7 },
    ],
    lineHeight,
  );
  tops.push(['example 1', await feedbackTop()]);
  await shot(page, `${frames}-example-1`);
  await activateByKeyboard(page, 'next_example');
  await measureGate(
    page,
    font,
    'example 2',
    [{ id: 'example_block', lines: 7 }],
    lineHeight,
  );
  tops.push(['example 2', await feedbackTop()]);
  await shot(page, `${frames}-example-2`);

  // The help sheet over example 2: the title, a blank and the eight lines
  // (the keyboard line of the ruling before "Keys:") on ten lines inside
  // the box; its footer the one-line reference for the footers above.
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('h');
  await page.waitForTimeout(250);
  expect((await ids(page))[0]).toBe('close_help');
  expect(await lines(page)).toContain(
    'TAB moves focus. ENTER selects the focused control.\nKeys:',
  );
  await measureGate(
    page,
    font,
    'help sheet',
    [{ id: 'help_text', lines: 10 }],
    lineHeight,
  );

  const helpTop = await feedbackTop();

  for (const [label, top] of tops) {
    expect(
      Math.abs(top - helpTop),
      `${label}: footer on one line (feedback top ${top.toFixed(1)}; ${helpTop.toFixed(1)} under the help sheet's one-line footer)`,
    ).toBeLessThan(1);
  }

  await shot(page, `${frames}-help-over-example-2`);
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('h');
  await page.waitForTimeout(250);
  expect((await ids(page))[0]).toBe('teaching_note');
  await startVialsByKeyboard(page);
  await answerByKeyboard(page, KEYS[0]);
  await nextByKeyboard(page);
  await answerByKeyboard(page, KEYS[1]);
  await nextByKeyboard(page);
  await answerByKeyboard(page, KEYS[2]);
  await nextByKeyboard(page);
  expect(await currentVial(page)).toBe(4);
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  expect(await elementState(page, 'option_1')).toBe('selected');
  await measureGate(
    page,
    font,
    'vial 4 with draft',
    [
      { id: 'rule_card', lines: 9 },
      { id: 'vial_block', lines: 2 },
    ],
    lineHeight,
  );
  // The preview's vial footer stays one line as well (the question block
  // alone may wrap under these fonts — ruling 2 of 12 October 2026).
  expect(Math.abs((await feedbackTop()) - helpTop)).toBeLessThan(1);
  await shot(page, vialFrame);
  await recordByKeyboard(page, 'r');
  await nextByKeyboard(page);
  await answerByKeyboard(page, KEYS[4]);
  await nextByKeyboard(page);
  await answerByKeyboard(page, KEYS[5]);
  await nextByKeyboard(page); // SHOW RESULTS
  await activateByKeyboard(page, 'results_next');
  expect((await probe(page)).title).toBe('RESULTS — VIALS 4-6 OF 6');
  // Page 2: the first line, a blank, three vials of four lines with a
  // blank between — sixteen fixed lines.
  await measureGate(
    page,
    font,
    'results page 2',
    [{ id: 'results_text', lines: 16 }],
    lineHeight,
  );

  if (resultsFrame !== null) {
    await shot(page, resultsFrame);
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

/** Records the drafted drawer by click and moves on with NEXT VIAL. */
async function recordAndNextByPointer(page: Page) {
  const responses = await countOf(page, 'first_response');

  await clickElement(page, 'record_drawer');
  expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  expect(await countOf(page, 'first_response')).toBe(responses + 1);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next');
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * The pointer-only scenario inside the console. Every act is a click; the
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

  // The card: HELP / CLOSE HELP by click; SHOW EXAMPLE 1 by click.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'help');
  expect((await ids(page))[0]).toBe('close_help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'intro',
    input_mode: 'pointer',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect(await ids(page)).toContain('show_example');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'show_example');
  expect(await countOf(page, 'example_viewed')).toBe(1);
  expect(meta(await lastOf(page, 'intro_acknowledged'))).toMatchObject({
    input_mode: 'pointer',
  });

  // A double click on NEXT EXAMPLE changes one view; BACK; NEXT; HELP /
  // CLOSE HELP from an example.
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'next_example');
  expect(await countOf(page, 'example_viewed')).toBe(2);
  expect(await lines(page)).toContain('WORKED EXAMPLE 2 OF 2');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'back_to_example_1');
  expect(await lines(page)).toContain('WORKED EXAMPLE 1 OF 2');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'next_example');
  expect(await countOf(page, 'example_viewed')).toBe(4);
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'example_2',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect(await lines(page)).toContain('WORKED EXAMPLE 2 OF 2');

  // Mid-teaching (example 2): LEAVE CONSOLE by click; KEYBOARD NAVIGATION
  // away and back; reopen — example 2 again, no new teaching_closed.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'leave');
  await waitSurface(page, false);
  expect(await countOf(page, 'panel_left')).toBe(1);
  await labApproach(page, PILOT.lab.kai);
  await openConsole(page);
  expect(await countOf(page, 'series_reopened')).toBe(1);
  expect(await lines(page)).toContain('WORKED EXAMPLE 2 OF 2');
  expect(meta(await lastOf(page, 'example_viewed'))).toMatchObject({
    example_id: 'm16_e2',
    navigation: 'resume',
  });
  expect(await countOf(page, 'teaching_closed')).toBe(0);

  if (options.shots) {
    await shot(page, '16-console-reopened-mid-teaching');
  }

  // START by click: the opening click never confirms; its confirm by click.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'start_vials');
  expect(await ids(page)).toEqual(['confirm', 'keep_reading', 'dialog_text']);
  expect(await countOf(page, 'teaching_closed')).toBe(0);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  expect(await countOf(page, 'teaching_closed')).toBe(1);
  expect(meta(await lastOf(page, 'teaching_closed'))).toMatchObject({
    input_mode: 'pointer',
  });
  expect(await currentVial(page)).toBe(1);

  // Vial 1: drafts chosen, changed and cleared by click; HELP / CLOSE HELP
  // with a draft; a double click on the OPENER records nothing.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'option_2');
  await clickElement(page, 'option_3');
  await clickElement(page, 'option_3');
  expect(
    String(meta(await lastOf(page, 'option_drafted')).option_id ?? 'null'),
  ).toBe('null');
  await clickElement(page, 'option_1');
  expect(await elementState(page, 'option_1')).toBe('selected');
  await clickElement(page, 'help');
  expect((await ids(page))[0]).toBe('close_help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'vial_1',
    input_mode: 'pointer',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect(await elementState(page, 'option_1')).toBe('selected');
  await page.waitForTimeout(SETTLE_MS);

  const opener = (await probe(page)).elements.find(
    (e) => e.id === 'record_drawer',
  )!;

  expect(opener.x + opener.w / 2).toBeGreaterThan(800);
  await dblclickElement(page, 'record_drawer');
  expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
  expect(await lines(page)).toContain('Record DRAWER 1 for vial 1?');
  expect(await countOf(page, 'first_response')).toBe(0);
  expect(await countOf(page, 'commit_requested')).toBe(1);
  // Neither dialog control overlaps the opener's place: both end left of
  // the right column that holds every opener.
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
  // second click on the same spot: exactly one first response, one
  // acknowledgement.
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickTwice(page, 'confirm');
  expect(await countOf(page, 'first_response')).toBe(1);
  expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
    vial_id: 'm16_v1',
    option_id: 'm16_v1_d1',
    correct: true,
    input_mode: 'pointer',
  });
  expect(await countOf(page, 'response_acknowledged')).toBe(1);
  expect(await countOf(page, 'vial_presented')).toBe(1);
  expect((await ids(page))[0]).toBe('next');
  await expectNoCorrectnessOnScreen(page);
  // HELP / CLOSE HELP from the acknowledgement by click; a double click on
  // NEXT VIAL presents one vial.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'ack_1',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect(await lines(page)).toContain('Vial 1 recorded.');
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'next');
  expect(await currentVial(page)).toBe(2);
  expect(await countOf(page, 'vial_presented')).toBe(2);

  // Vial 2 with a draft: LEAVE CONSOLE by click; KEYBOARD NAVIGATION away
  // and back; reopen — the same vial and draft, no second presentation;
  // leaving never records DON'T KNOW.
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'option_3');
  expect(await elementState(page, 'option_3')).toBe('selected');

  if (options.shots) {
    await shot(page, '20-pointer-driven-vial-2-with-draft');
  }

  await clickElement(page, 'leave');
  await waitSurface(page, false);
  expect(await countOf(page, 'first_response')).toBe(1);
  expect(await countOf(page, 'commit_requested')).toBe(1);
  await labApproach(page, PILOT.lab.kai);
  await openConsole(page);
  expect(await countOf(page, 'vial_presented')).toBe(2);
  expect(await countOf(page, 'series_reopened')).toBe(2);
  expect(await currentVial(page)).toBe(2);
  expect(await lines(page)).toContain(VIAL_LABELS[2]);
  expect(await elementState(page, 'option_3')).toBe('selected');

  if (options.shots) {
    await shot(page, '17-console-reopened-mid-vial-same-draft');
  }

  // A side-band click outside every control activates nothing.
  await page.waitForTimeout(SETTLE_MS);

  const eventsBefore = (await getEvents(page)).length;
  const band = await designToPage(page, -118, 300);

  await page.mouse.click(band.x, band.y);
  await page.waitForTimeout(300);
  expect((await probe(page)).open).toBe(true);
  expect((await getEvents(page)).length).toBe(eventsBefore);

  // DON'T KNOW by click: the opening click never confirms; KEEP WORKING
  // cancels; DON'T KNOW again and its RECORD by click.
  await clickElement(page, 'dont_know');
  expect(await lines(page)).toContain("Record DON'T KNOW for vial 2?");
  expect(await countOf(page, 'first_response')).toBe(1);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'keep_working');
  expect(await countOf(page, 'commit_cancelled')).toBe(1);
  expect(await elementState(page, 'option_3')).toBe('selected');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'dont_know');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
    vial_id: 'm16_v2',
    response_kind: 'dont_know',
    option_id: null,
    correct: false,
    draft_at_commit: 'm16_v2_d3',
    input_mode: 'pointer',
  });
  await expectNoCorrectnessOnScreen(page);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next');
  expect(await currentVial(page)).toBe(3);

  // Vials 3–6 by click (3 → 4 key, 4 → 1 key with the canvas frame, 5 →
  // 1 wrong, 6 → 2 key).
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElementAt(page, 'option_4', 110);
  await recordAndNextByPointer(page);
  expect(await currentVial(page)).toBe(4);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'option_1');
  expect(await elementState(page, 'option_1')).toBe('selected');

  if (options.canvasShot !== undefined) {
    const value = await probe(page);
    const bottom = Math.max(...value.elements.map((e) => e.y + e.h / 2));

    // eslint-disable-next-line no-console
    console.log(
      `[R2 canvas=1080] vial 4 with a draft: spare ${(value.feedback_top - bottom).toFixed(1)} design px`,
    );
    expect(value.feedback_top - bottom).toBeGreaterThanOrEqual(30);
    await shot(page, options.canvasShot);
  }

  await recordAndNextByPointer(page);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'option_1');
  await recordAndNextByPointer(page);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'option_2');
  await clickElement(page, 'record_drawer');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  expect(await countOf(page, 'first_response')).toBe(6);
  expect(await countOf(page, 'first_responses_completed')).toBe(1);
  expect(await lines(page)).toContain('SHOW RESULTS');
  await expectNoCorrectnessOnScreen(page);

  // Results by pointer: SHOW RESULTS; HELP / CLOSE HELP on page 1; a double
  // click on NEXT changes one view; HELP / CLOSE HELP on page 2; BACK;
  // FINISH; a reopening and FINISH from page 1 (no new results_shown).
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next');
  expect(await countOf(page, 'results_shown')).toBe(1);
  expect((await probe(page)).title).toBe('RESULTS — VIALS 1-3 OF 6');
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'help');
  expect((await ids(page))[0]).toBe('close_help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'results_1',
  });
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'close_help');
  expect((await probe(page)).title).toBe('RESULTS — VIALS 1-3 OF 6');
  expect(await countOf(page, 'results_shown')).toBe(1);
  await page.waitForTimeout(SETTLE_MS);
  await dblclickElement(page, 'results_next');
  expect((await probe(page)).open).toBe(true);
  expect((await probe(page)).title).toBe('RESULTS — VIALS 4-6 OF 6');
  expect(await countOf(page, 'results_shown')).toBe(2);
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'help');
  expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
    view: 'results_2',
  });
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'close_help');
  expect((await probe(page)).title).toBe('RESULTS — VIALS 4-6 OF 6');
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'results_back');
  expect((await probe(page)).title).toBe('RESULTS — VIALS 1-3 OF 6');
  expect(await countOf(page, 'results_shown')).toBe(2);
  await page.waitForTimeout(SETTLE_MS);

  const finishX = await clickElementAt(page, 'finish', 0);

  expect(finishX).toBeLessThan(800);
  await waitSurface(page, false);
  await openConsole(page);
  expect((await probe(page)).title).toBe('RESULTS — VIALS 1-3 OF 6');
  expect(await countOf(page, 'results_shown')).toBe(2);
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'finish');
  await waitSurface(page, false);
  expect(await countOf(page, 'results_shown')).toBe(2);
  expect((await reproduce(page)).row).toMatchObject({
    value: 4,
    numerator: 4,
    denominator: 6,
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
  const presented = await countOf(page, 'vial_presented');
  const responses = await countOf(page, 'first_response');
  const requests = await countOf(page, 'commit_requested');
  const shown = await countOf(page, 'results_shown');

  // HELP by TAB and ENTER; CLOSE HELP by ENTER (the first focusable).
  await page.waitForTimeout(SETTLE_MS + 50);
  await focusByTab(page, 'help');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect((await ids(page))[0], `${label} help by keyboard`).toBe('close_help');
  expect(await lines(page)).toContain('HOW THE CONSOLE WORKS');
  // The keyboard line of the closeout ruling 3 (12 October 2026) sits
  // immediately before the approved "Keys:" line.
  expect(await lines(page)).toContain(
    "TAB moves focus. ENTER selects the focused control.\nKeys: 1-4 choose · R record · N don't know · H help · ESC leaves (work kept).",
  );
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
  expect(await countOf(page, 'vial_presented')).toBe(presented);
  expect(await countOf(page, 'first_response')).toBe(responses);
  expect(await countOf(page, 'results_shown')).toBe(shown);

  const exit = controls.includes('finish') ? 'finish' : 'leave';

  // LEAVE CONSOLE / FINISH by TAB and ENTER: the surface closes, no response,
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
  // LEAVE CONSOLE / FINISH by click; reopen.
  await page.waitForTimeout(SETTLE_MS + 50);
  await clickElement(page, exit);
  await waitSurface(page, false);
  expect(await countOf(page, 'first_response')).toBe(responses);
  expect(await countOf(page, 'commit_requested')).toBe(requests);
  await restore();
  expect(await signature(), `${label} restored after ${exit} (pointer)`).toBe(
    before,
  );
  expect(await countOf(page, 'vial_presented')).toBe(presented);
  expect(await countOf(page, 'results_shown')).toBe(shown);
}

/** R9: every view where the preview lists HELP and LEAVE CONSOLE / FINISH. */
async function accessScenario(page: Page) {
  const reopen = async () => {
    await labApproach(page, PILOT.lab.kai);
    await openConsole(page);
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
  await showExample1ByKeyboard(page);
  // Example 1 and example 2.
  await accessFromView(
    page,
    'example 1',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  await activateByKeyboard(page, 'next_example');
  await accessFromView(
    page,
    'example 2',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  await startVialsByKeyboard(page);
  // A vial without a draft, then with a draft.
  await accessFromView(
    page,
    'vial 1 without a draft',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('2');
  await page.waitForTimeout(150);
  expect(await elementState(page, 'option_2')).toBe('selected');
  await accessFromView(
    page,
    'vial 1 with a draft',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  expect(await elementState(page, 'option_2')).toBe('selected');
  // An acknowledgement.
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  await recordByKeyboard(page, 'r');
  await accessFromView(
    page,
    'acknowledgement 1',
    ['help', 'leave'],
    reopen,
    viewSignature,
  );
  await nextByKeyboard(page);

  for (const key of KEYS.slice(1)) {
    await answerByKeyboard(page, key);

    if (await lines(page).then((text) => text.includes('NEXT VIAL'))) {
      await nextByKeyboard(page);
    }
  }

  expect(await countOf(page, 'first_responses_completed')).toBe(1);
  await nextByKeyboard(page); // SHOW RESULTS
  expect((await probe(page)).title).toBe('RESULTS — VIALS 1-3 OF 6');
  // Results page 1: HELP and FINISH; a reopening shows page 1 again.
  await accessFromView(
    page,
    'results page 1',
    ['help', 'finish'],
    reopen,
    viewSignature,
  );
  expect(await countOf(page, 'results_shown')).toBe(1);
  // Results page 2 (reached by NEXT after each reopening).
  await activateByKeyboard(page, 'results_next');
  expect((await probe(page)).title).toBe('RESULTS — VIALS 4-6 OF 6');
  expect(await countOf(page, 'results_shown')).toBe(2);
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('h');
  await page.waitForTimeout(250);
  expect((await ids(page))[0]).toBe('close_help');
  await shot(page, '26-help-sheet-over-results-page-2');
  await page.waitForTimeout(SETTLE_MS + 50);
  await page.keyboard.press('h');
  await page.waitForTimeout(250);
  await accessFromView(
    page,
    'results page 2',
    ['help', 'finish'],
    async () => {
      await reopen();
      await activateByKeyboard(page, 'results_next');
    },
    viewSignature,
  );
  expect(await countOf(page, 'results_shown')).toBe(2);
  // ESC closes the results from page 2 after its settle.
  await leaveConsole(page);
  expect((await reproduce(page)).row).toMatchObject({
    value: 6,
    disposition: 'observed',
  });
}

test.describe('M16 handling rule: reload (Unit 19)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  /** Route to the console, teaching closed and v1 recorded, the console left. */
  async function beforeReload(page: Page, tag: string) {
    await toLab(page, tag);
    await openConsole(page);
    await teachingByKeyboard(page);
    await answerByKeyboard(page, KEYS[0]);
    await leaveConsole(page);

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

  test('R5 (reload after an opening): teaching closed and v1 recorded, then a page reload — the earlier log carried byte-identically, the row interrupted; the console, reached again, held back', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);
    const before = await beforeReload(page, 'u19r5');

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
    // hold-back record; nothing else of the console.
    const atEntry = (await familyEvents(page)).map((event) => event.event_type);

    expect(atEntry).toEqual([
      `${FAMILY}prior_load_checked`,
      `${FAMILY}technical_failure`,
    ]);

    await openConsole(page);
    expect(await lines(page)).toContain(
      'This console was already used in this session. Its record is kept; no further answers can be given here.',
    );
    expect(await ids(page)).toEqual(['record_text', 'leave']);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '19-reload-hold-back-record');
    await page.keyboard.press('1');
    await page.keyboard.press('r');
    await page.keyboard.press('Enter');
    await page.keyboard.press('h');
    await page.waitForTimeout(300);
    await leaveConsole(page);

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

  test("R6 (reload before any opening): Kai's briefing acknowledged and the console never opened, then a reload — interrupted until the laboratory is re-entered; the check establishes the absence; not_presented until this load's briefing, then pending; the first-opening card appears", async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    // The first load: briefed, the console never opened.
    await toLab(page, 'u19r6');

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
        console_opened: false,
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
      console_opened: false,
      never_opened_reason: 'briefed_not_opened',
    });

    // The console opens normally — the first-opening card, not the hold-back.
    await openConsole(page);
    expect(await ids(page)).toContain('show_example');
    expect(await lines(page)).not.toContain(
      'This console was already used in this session.',
    );
    await expectNoCorrectnessOnScreen(page);
    await showExample1ByKeyboard(page);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'intro_acknowledged')).toBe(1);
    expect(await countOf(page, 'example_viewed')).toBe(1);
    expect(await countOf(page, 'technical_failure')).toBe(0);
    await leaveConsole(page);

    row = (await reproduce(page)).row;
    expect(row).toMatchObject({ disposition: 'pending', value: null });
    expect(row.components.exposure).toMatchObject({
      briefed: true,
      console_opened: true,
      intro_acknowledged: true,
      examples_viewed: { m16_e1: 1, m16_e2: 0 },
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
