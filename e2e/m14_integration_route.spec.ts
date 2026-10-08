/**
 * Station 080 M14 — the two-packet incident desk on the participant route
 * (Unit 17, browser evidence run). Every scenario boots the participant
 * default, finishes the Dock tutorial, reaches the Concourse and the
 * desk's registry approach with the existing drivers of `pilotHelpers.ts`
 * (`dockToConcourse`, `concourseVia`, `interactAt`) and opens the desk
 * with the station prompt. No M14 state is injected.
 *
 * INPUT, stated plainly: the walking, the station prompt (SPACE at the
 * desk) and Vale's briefing are done by the route drivers with the
 * KEYBOARD — that is navigation, not an M14 response. Inside the desk R1,
 * R3, R4, R5 and R7 use the keyboard only; R2 uses the pointer only (every
 * in-desk act a real click at the probe's design coordinates).
 *
 *   R1  keyboard: orientation; packet 1 — D1 correct after its three
 *       establishing sources, D2 wrong with none of its own sources ever
 *       opened (the three from D1 stay open and recorded), D3 CANNOT
 *       SOLVE; a press inside 400 ms refused and recorded, a held ENTER
 *       committing nothing; packet 2 — D1 correct, D2 correct, D3 wrong;
 *       3 / 6 observed; SHOW RESULTS, FINISH, reopen read-only.
 *   R2  pointer: every act by click, a double click recording once,
 *       controls beyond design x 800 activated at the 1280 × 720 canvas
 *       and at `canvas=1080`, a side-band click activating nothing, the
 *       desk left mid packet and reopened on the same state.
 *   R3  partial coverage: two answers, the third decision left; the route
 *       driven on to the Utility Deck review; the record closed ⇒
 *       incomplete over 2; the desk afterwards a record.
 *   R4  zero evidence: not_presented before the briefing, pending with
 *       briefed_not_opened after it, the orientation card left and shown
 *       again.
 *   R8  closeout ruling of 9 October 2026: a reload BEFORE the desk was
 *       opened — the new load's check establishes the absence of an
 *       earlier opening (not_presented, then pending) and the desk opens
 *       normally; R9 closeout correction: CLOSE HELP on the results
 *       settles NEXT / BACK against a doubled press
 *   R5  reload: one answer, then a page reload — the earlier log carried
 *       byte-identically, the feature interrupted; the desk, when
 *       reachable again, held back.
 *   R6  a standard surface after the desk: the quality packet keeps its
 *       geometry, typography and input behaviour.
 *   R7  the real-game layout gate under forced fallback fonts.
 *
 * Twenty-two evidence frames (800 × 600) go to `U17_OUT`. Nothing here
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
  concourseToDeck,
  concourseToLabBriefed,
  concourseToWorkshop,
  concourseVia,
  dockToConcourse,
  expectStage,
  interactAt,
  labToYardBriefed,
  openPromptAt,
  PILOT,
  press,
  registryApproach,
  returnShiftToDeckClosure,
  useDoor,
  waitScene,
  walkTo,
  workshopSignOff,
  workshopToConcourse,
  yardReturnToConcourse,
} from './pilotHelpers';
import { clickElement, surface, waitSurface } from './returnHelpers';

const OUT = process.env.U17_OUT ?? 'test-results/u17-evidence';
const FAMILY = 'proto_m14_integration_';
const VERSION = 'm14-integration-v1';
const SURFACE = 'm14_incident_desk';
const DESK = registryApproach('concourse.incident_desk');
const PACKET_1 = registryApproach('concourse.qc_packet_o1');
const SETTLE_MS = 400;
const FORBIDDEN =
  /proto_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|puzzle|persist|grit|skill|ability|intelligen|handle|information/i;
/** No line of the first-response phase may carry a correctness word. */
const CORRECTNESS = /\bcorrect|incorrect|\bright\b|\bwrong\b|station answer/i;

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

async function firstResponses(page: Page) {
  return JSON.stringify(
    (await familyEvents(page)).filter(
      (event) => event.event_type === `${FAMILY}first_response`,
    ),
  );
}

/** Every rendered line of the surface (title, subtitle, status, help, labels). */
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
    JSON.stringify(extractItemFeatures('M14', payload.raw_events, context)),
  ) as FeatureRow[];
  const own = payload.features.filter((row) => row.item_id === 'M14');

  expect(own, 'the page exports one M14 row').toHaveLength(1);
  expect(offline, "offline extraction equals the page's row").toEqual(own);
  expect(JSON.stringify(payload.raw_events)).toBe(before);
  expect(offline[0].feature_id).toBe('m14_correct_first_integrations');
  expect(offline[0].planned_denominator).toBe(6);

  return { row: offline[0], payload };
}

/** Administration version on the live events; exactly one family owner; no runtime error. */
async function expectFamilyDiscipline(page: Page) {
  const all = await getEvents(page);
  const own = all.filter((event) => event.event_type.startsWith(FAMILY));

  expect(own.length, 'the family was emitted').toBeGreaterThan(0);

  for (const event of own) {
    expect(meta(event).entry_state_version, event.event_type).toBe(VERSION);
    expect(meta(event).opportunity_id).toBe('proto_m14_integration_series');
    expect(meta(event).measure_id).toBe('M14');
    expect(typeof (event as { sequence?: number }).sequence).toBe('number');
  }

  expect(
    REGISTER_V3.filter((entry) =>
      entry.route.family_prefixes.some((prefix) => FAMILY.startsWith(prefix)),
    ).map((entry) => entry.id),
  ).toEqual(['M14']);
  // The retired v2 family is not written on the route.
  expect(
    all.filter((event) => event.event_type.startsWith('proto_m14_desk_')),
  ).toEqual([]);
}

/** Nothing on the desk says anything about correctness or offers results. */
async function expectNoCorrectnessOnScreen(page: Page) {
  const text = await lines(page);
  const present = await ids(page);

  expect(text).not.toMatch(CORRECTNESS);
  expect(text).not.toMatch(FORBIDDEN);
  expect(present).not.toContain('results_text');
  expect(present).not.toContain('results_next');
  expect(present).not.toContain('finish');
}

// ——— Driver steps (KEYBOARD NAVIGATION — never an M14 response) ————————

/** Opening → Dock tutorial → Concourse (stage handover_briefing). */
async function toConcourse(page: Page, tag: string, extra = '') {
  await page.goto(
    `/?participant_id=PT_PILOT_${tag}&game_session_id=GS_PILOT_${tag}_${Date.now()}${extra}`,
  );
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
  await page.waitForTimeout(400);
  await press(page, 'Space');
  await waitScene(page, 'dock', 60_000);
  await page.waitForTimeout(1600);
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
}

/**
 * Vale's briefing acknowledged (the desk is presented here), the chained
 * offers left unanswered or declined as the spine does; the handover is
 * NOT confirmed (the desk is used in the incident handover).
 */
async function briefing(page: Page) {
  await concourseVia(page, PILOT.concourse.vale.x, PILOT.concourse.vale.y + 56);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 56 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'incident_handover');
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3); // watch offer: ask me later
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3); // delivery offer: ask me later
  await page.waitForTimeout(450);
  await selectPromptOption(page, 2); // extra lamp job: decline
  await page.waitForTimeout(300);
}

/** Walks to the desk's registry approach and presses SPACE (keyboard navigation). */
async function openDesk(page: Page, options?: { shotPrompt?: string }) {
  const where = () =>
    page.evaluate(() => {
      const w = window as unknown as {
        __playerProbe?: { x: number; y: number } | null;
        __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
        __promptCards?: { label: string }[] | null;
      };

      return JSON.stringify({
        at: w.__playerProbe ?? null,
        prompt: w.__worldPromptProbe ?? null,
        cards: w.__promptCards?.map((card) => card.label) ?? null,
      });
    });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await concourseVia(page, DESK.x, DESK.y);

    if (options?.shotPrompt !== undefined && attempt === 0) {
      await page.waitForTimeout(300);
      await shot(page, options.shotPrompt);
    }

    const before = await where();

    await interactAt(page, DESK, { approachOffset: { x: 0, y: 0 } });

    const opened = await waitSurface(page, true, SURFACE).then(
      () => true,
      () => false,
    );

    if (opened) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[openDesk] attempt ${attempt + 1}: before ${before} after ${await where()}`,
    );
  }

  throw new Error(`the incident desk did not open (observed ${await where()})`);
}

/** ESC on the desk (the same path as LEAVE DESK): the surface closes. */
async function leaveDesk(page: Page) {
  await press(page, 'Escape');
  await waitSurface(page, false);
}

// ——— In-desk keyboard acts ————————————————————————————————————————————

/** Opens or closes tiles by their number keys. */
async function toggleTiles(page: Page, keys: string[]) {
  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
  }
}

/** Drafts an option by its letter and records it (R, settled ENTER). */
async function answerByKeyboard(page: Page, letter: 'a' | 'b' | 'c' | 'd') {
  await page.keyboard.press(letter);
  await page.waitForTimeout(150);
  await page.keyboard.press('r');
  await page.waitForTimeout(SETTLE_MS + 120);
  expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect((await ids(page))[0]).toBe('next');
}

/** NEXT DECISION / NEXT PACKET / SHOW RESULTS after the acknowledgement settled. */
async function nextByKeyboard(page: Page) {
  await page.waitForTimeout(SETTLE_MS + 120);
  expect((await probe(page)).focus).toBe('next');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
}

/** The current decision id from the live events. */
async function currentDecision(page: Page) {
  return String(meta(await lastOf(page, 'decision_presented')).decision_id);
}

test.describe('M14 two keyed packets on the route (Unit 17)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test('R1 (keyboard in the desk): orientation, packet 1 (correct with its sources, wrong with none of its own sources, CANNOT SOLVE), the fresh-press rule, packet 2, 3 / 6 observed, results, FINISH, reopen read-only', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toConcourse(page, 'u17r1');
    await briefing(page);
    await openDesk(page, { shotPrompt: '01-concourse-incident-desk-prompt' });
    // (START's 400 ms settle against the opening is a model rule covered
    // by the pure spec; the route drivers' own settle after the station
    // prompt puts every browser press past that window.)

    // Orientation.
    expect((await probe(page)).frame).toBe('wide');
    expect(await ids(page)).toEqual(['orientation', 'start', 'help', 'leave']);
    expect(await lines(page)).toContain(
      'Two packets from the storm are waiting.',
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '02-orientation-card');
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'packet_presented')).toBe(0);
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter'); // START PACKET 1 (the first focusable)
    await page.waitForTimeout(300);

    // Packet 1, decision 1: all tiles closed.
    expect(await currentDecision(page)).toBe('p1_d1');
    expect((await probe(page)).title).toBe(
      'PACKET 1 OF 2 — Night packet: pump bay and power',
    );
    expect(await lines(page)).toContain('DECISION 1 OF 3');
    expect(await lines(page)).toContain(
      'Gauge readings taken at 04:00. Messages are listed in time order.',
    );
    expect(await countOf(page, 'packet_presented')).toBe(1);
    expect(await countOf(page, 'source_opened')).toBe(0);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '03-packet-1-decision-1-closed');

    // D1: open its three establishing sources (M1, G1, M4), draft A.
    await toggleTiles(page, ['1', '7', '4']);
    expect(await countOf(page, 'source_opened')).toBe(3);
    expect(await lines(page)).toContain(
      'Standing order: whenever a coolant loop',
    );
    await page.keyboard.press('a');
    await page.waitForTimeout(150);
    expect(
      (await probe(page)).elements.find((e) => e.id === 'option_a')?.state,
    ).toBe('selected');
    expect(String(meta(await lastOf(page, 'option_drafted')).option_id)).toBe(
      'p1_d1_a',
    );
    await shot(page, '04-packet-1-three-tiles-open-draft');

    // The fresh-press rule: R opens the dialog; an ENTER inside 400 ms is
    // refused and recorded; a settled ENTER records.
    await page.keyboard.press('r');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
    expect(await lines(page)).toContain(
      'Record this answer for decision 1? It cannot be changed afterwards.',
    );
    expect(await countOf(page, 'commit_press_refused')).toBe(1);
    expect(meta(await lastOf(page, 'commit_press_refused'))).toMatchObject({
      kind: 'option',
      reason: 'dialog_settling',
    });
    expect(await countOf(page, 'first_response')).toBe(0);
    await shot(page, '05-answer-confirmation');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(await countOf(page, 'first_response')).toBe(1);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      decision_id: 'p1_d1',
      response_kind: 'option',
      option_id: 'p1_d1_a',
      correct: true,
      sources_opened_before: ['p1_m1', 'p1_g1', 'p1_m4'],
      establishing_sets_opened_before: [3],
      refused_presses: 1,
      input_mode: 'keyboard',
    });

    // A press inside the acknowledgement's settle window does nothing
    // (sent right after the confirming press, within 400 ms).
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    expect(await countOf(page, 'decision_presented')).toBe(1);

    // The neutral acknowledgement: no correctness, no results control.
    expect((await ids(page))[0]).toBe('next');
    expect(await lines(page)).toContain('Answer recorded for decision 1.');
    expect(await lines(page)).toContain('NEXT DECISION (ENTER)');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '06-acknowledgement-decision-1');
    await nextByKeyboard(page);
    expect(await currentDecision(page)).toBe('p1_d2');

    // D2: a wrong option with NONE of its own establishing sources (M3,
    // M5, M6) ever opened; the three from D1 stay open and recorded. A
    // held ENTER on the focused RECORD ANSWER opens the dialog once and
    // commits nothing (the surface drops the repeats).
    expect(
      (await probe(page)).elements
        .filter((e) => e.id.startsWith('tile_') && e.label.includes('\n'))
        .map((e) => e.id),
    ).toEqual(['tile_m1', 'tile_m4', 'tile_g1']);
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
      decision_id: 'p1_d2',
      option_id: 'p1_d2_a',
      correct: false,
      sources_opened_before: ['p1_m1', 'p1_g1', 'p1_m4'],
      establishing_source_sets: [['p1_m3', 'p1_m5', 'p1_m6']],
      establishing_sets_opened_before: [0],
      refused_presses: 0,
    });
    expect(await lines(page)).toContain('Answer recorded for decision 2.');
    await expectNoCorrectnessOnScreen(page);

    // Help from the acknowledgement; ESC closes the help, not the desk.
    await page.keyboard.press('h');
    await page.waitForTimeout(200);
    expect((await ids(page))[0]).toBe('close_help');
    expect(await lines(page)).toContain('HELP — INCIDENT DESK');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '14-help-sheet');
    expect(await countOf(page, 'help_consulted')).toBe(1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    expect((await probe(page)).open).toBe(true);
    expect((await ids(page))[0]).toBe('next');
    await nextByKeyboard(page);
    expect(await currentDecision(page)).toBe('p1_d3');

    // D3: ESC while the CANNOT SOLVE dialog is open closes the dialog only
    // (the desk stays open, the decision unanswered, a cancellation recorded).
    await page.keyboard.press('n');
    await page.waitForTimeout(SETTLE_MS + 120);
    expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect((await probe(page)).open).toBe(true);
    expect(await ids(page)).toContain('cannot_solve');
    expect(await countOf(page, 'commit_cancelled')).toBe(1);
    expect(meta(await lastOf(page, 'commit_cancelled'))).toMatchObject({
      kind: 'cannot_solve',
      reason: 'keep_working',
      input_mode: 'keyboard',
    });
    expect(await countOf(page, 'first_response')).toBe(2);

    // D3: CANNOT SOLVE.
    await page.keyboard.press('n');
    await page.waitForTimeout(SETTLE_MS + 120);
    expect(await lines(page)).toContain(
      'Record CANNOT SOLVE for decision 3? It cannot be changed afterwards.',
    );
    await shot(page, '07-cannot-solve-confirmation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
      decision_id: 'p1_d3',
      response_kind: 'cannot_solve',
      option_id: null,
      correct: false,
    });
    expect(await lines(page)).toContain('NEXT PACKET (ENTER)');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '08-acknowledgement-decision-3');
    expect(await countOf(page, 'packet_completed')).toBe(1);
    await nextByKeyboard(page);

    // Packet 2, decision 1: sources start closed.
    expect(await currentDecision(page)).toBe('p2_d1');
    expect((await probe(page)).title).toBe(
      'PACKET 2 OF 2 — Morning packet: mast, yard and uplink',
    );
    expect(
      (await probe(page)).elements.filter(
        (e) => e.id.startsWith('tile_') && e.label.includes('\n'),
      ),
    ).toEqual([]);
    expect(await countOf(page, 'packet_presented')).toBe(2);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '09-packet-2-decision-1-closed');
    await answerByKeyboard(page, 'b');
    await nextByKeyboard(page);
    expect(await currentDecision(page)).toBe('p2_d2');
    await answerByKeyboard(page, 'c');
    await nextByKeyboard(page);
    expect(await currentDecision(page)).toBe('p2_d3');

    // Every tile open: the layout gate in the real game (screenshot 10).
    await toggleTiles(page, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(await countOf(page, 'source_opened')).toBe(12);

    const p2d3 = await probe(page);
    const tiles = p2d3.elements.filter((e) => e.id.startsWith('tile_'));

    expect(tiles).toHaveLength(9);
    expect(tiles.every((e) => e.label.includes('\n'))).toBe(true);
    expect(tiles.every((e) => e.text_px === 16)).toBe(true);
    expect(
      tiles.every((e) => e.text_h <= e.h - 2),
      JSON.stringify(tiles.map((e) => [e.id, e.h, e.text_h])),
    ).toBe(true);

    const bottom = Math.max(...p2d3.elements.map((e) => e.y + e.h / 2));

    // eslint-disable-next-line no-console
    console.log(
      `[R1] P2-D3 all nine open (default font): content bottom ${bottom.toFixed(1)}, feedback top ${p2d3.feedback_top.toFixed(1)}, spare ${(p2d3.feedback_top - bottom).toFixed(1)} design px`,
    );
    expect(p2d3.feedback_top - bottom).toBeGreaterThanOrEqual(30);
    await shot(page, '10-packet-2-decision-3-all-open');
    await answerByKeyboard(page, 'b'); // voice — wrong
    expect(await countOf(page, 'first_response')).toBe(6);
    expect(await countOf(page, 'first_responses_completed')).toBe(1);
    expect(await lines(page)).toContain('SHOW RESULTS (ENTER)');
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '11-acknowledgement-sixth-answer');

    const recorded = await firstResponses(page);
    const { row } = await reproduce(page);

    expect(row).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });
    expect(row.components.by_packet).toMatchObject({
      p1: { numerator: 1, denominator: 3 },
      p2: { numerator: 2, denominator: 3 },
    });
    expect(
      (row.components.decisions as { sources_opened_before: string[] }[]).map(
        (d) => d.sources_opened_before,
      ),
    ).toEqual([
      ['p1_m1', 'p1_g1', 'p1_m4'],
      ['p1_m1', 'p1_g1', 'p1_m4'],
      ['p1_m1', 'p1_g1', 'p1_m4'],
      [],
      [],
      [
        'p2_m1',
        'p2_m2',
        'p2_m3',
        'p2_m4',
        'p2_m5',
        'p2_m6',
        'p2_g1',
        'p2_g2',
        'p2_g3',
      ],
    ]);
    expect(await countOf(page, 'results_shown')).toBe(0);

    // SHOW RESULTS ⇒ both packets' results; FINISH; reopen read-only.
    await nextByKeyboard(page);
    expect(await countOf(page, 'results_shown')).toBe(1);
    expect(await lines(page)).toContain('All six answers are recorded.');
    expect(await lines(page)).toContain('Station answer: Loop A only');
    expect(await lines(page)).toContain('Your recorded answer: CANNOT SOLVE');
    expect(await lines(page)).not.toMatch(FORBIDDEN);
    await shot(page, '12-results-packet-1');
    await page.waitForTimeout(SETTLE_MS); // the results settle
    await page.keyboard.press('Enter'); // NEXT (the first focusable)
    // A doubled B inside 400 ms of the change of view changes nothing.
    await page.keyboard.press('b');
    await page.waitForTimeout(250);
    expect(await countOf(page, 'results_shown')).toBe(2);
    expect(await lines(page)).toContain('Station answer: Text bursts only');
    expect(await lines(page)).toContain('Your recorded answer: Voice call');
    await shot(page, '13-results-packet-2');
    // A settled B goes back.
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('b');
    await page.waitForTimeout(250);
    expect(await lines(page)).toContain('Station answer: Loop A only');
    await page.keyboard.press('f'); // FINISH
    await waitSurface(page, false);
    expect(await countOf(page, 'results_shown')).toBe(2);

    // Reopen: the results again, read-only; no second results_shown.
    await openDesk(page);
    expect(await lines(page)).toContain('All six answers are recorded.');
    expect(await countOf(page, 'results_shown')).toBe(2);
    expect(await countOf(page, 'first_response')).toBe(6);
    await page.keyboard.press('a');
    await page.keyboard.press('r');
    await page.keyboard.press('n');
    await page.waitForTimeout(300);
    expect(await countOf(page, 'first_response')).toBe(6);
    await leaveDesk(page);
    expect(await firstResponses(page)).toBe(recorded);
    expect((await reproduce(page)).row).toMatchObject({
      value: 3,
      denominator: 6,
      disposition: 'observed',
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R2 (pointer in the desk): every act by click, a double click recording once, controls beyond design x 800, a side-band click activating nothing, left mid packet and reopened on the same state', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toConcourse(page, 'u17r2');
    await briefing(page);
    // KEYBOARD NAVIGATION: the walk and the station prompt.
    await openDesk(page);
    await pointerScenario(page, '18-pointer-draft-and-open-tiles', null);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R2 at canvas=1080: the same pointer acts beyond design x 800 at the full-HD canvas; all nine open (screenshot 21)', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toConcourse(page, 'u17r2b', '&canvas=1080');
    await briefing(page);
    await openDesk(page);
    await pointerScenario(page, null, '21-canvas-1080-all-nine-open');
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R3 (partial coverage and route closure): two answers, the third decision left; the record closed at the review ⇒ incomplete over 2, censored, closed_at_review; the desk afterwards a record', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);

    const errors = captureErrors(page);

    await toConcourse(page, 'u17r3');
    await briefing(page);
    await openDesk(page);
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter'); // START
    await page.waitForTimeout(300);
    await answerByKeyboard(page, 'a');
    await nextByKeyboard(page);
    await answerByKeyboard(page, 'b');
    await nextByKeyboard(page);
    expect(await currentDecision(page)).toBe('p1_d3');
    await leaveDesk(page);

    // Reopened: the same decision, no results offered.
    await openDesk(page);
    expect(await currentDecision(page)).toBe('p1_d3');
    expect(await countOf(page, 'decision_presented')).toBe(3);
    await expectNoCorrectnessOnScreen(page);
    await leaveDesk(page);
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      disposition: 'pending',
    });

    // KEYBOARD NAVIGATION: the route on to the Utility Deck review.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 56 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'workshop');
    await concourseToWorkshop(page);
    await workshopSignOff(page);
    await workshopToConcourse(page);
    await concourseToLabBriefed(page);
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
      decisions_answered: 2,
      correct_first_decisions: 2,
      decisions_presented: 3,
    });

    const { row, payload } = await reproduce(page);

    expect(payload.final_core_closed).toBe(true);
    expect(row).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 2,
      planned_denominator: 6,
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(row.components.omissions).toEqual({
      unanswered_decision_ids: ['p1_d3'],
      unpresented_decision_ids: ['p2_d1', 'p2_d2', 'p2_d3'],
    });
    expect(
      (row.components.decisions as { correct: boolean | null }[]).map(
        (d) => d.correct,
      ),
    ).toEqual([true, true, null, null, null, null]);
    expect(await countOf(page, 'results_shown')).toBe(0);

    // KEYBOARD NAVIGATION: back to the desk after the closure. A driver
    // that cannot get there leaves this part NOT VERIFIED — said, not passed.
    let blocked: string | null = null;

    try {
      await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
        approachOffset: { x: 40, y: 0 },
        yFirst: true,
      });
      await openDesk(page);
    } catch (error) {
      blocked = (error as Error).message.split('\n')[0];
    }

    if (blocked !== null) {
      test.info().annotations.push({
        type: 'BLOCKED / NOT VERIFIED',
        description: `the desk after the record closure was not reached (${blocked}); frame 16 is missing`,
      });
      // eslint-disable-next-line no-console
      console.log(
        `[R3] BLOCKED / NOT VERIFIED — desk after the record closure not reached: ${blocked}`,
      );
    } else {
      const before = (await familyEvents(page)).length;

      expect(await lines(page)).toContain(
        'Station record closed — the desk keeps its record.',
      );
      expect(await lines(page)).toContain('2 of 6 recorded');
      await expectNoCorrectnessOnScreen(page);
      await shot(page, '16-record-after-station-record-closure');
      await page.keyboard.press('a');
      await page.keyboard.press('r');
      await page.keyboard.press('n');
      await page.keyboard.press('h');
      await page.waitForTimeout(300);
      expect(await ids(page)).toEqual(['record_text', 'leave']);
      await leaveDesk(page);
      expect((await familyEvents(page)).length).toBe(before);
      expect((await reproduce(page)).row).toMatchObject({
        value: 2,
        denominator: 2,
        disposition: 'incomplete',
      });
    }

    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R4 (zero evidence and orientation only): not_presented before the briefing; pending with briefed_not_opened after it; the orientation card left and shown again', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await toConcourse(page, 'u17r4');

    // Before Vale's briefing there is no M14 evidence at all.
    expect(await familyEvents(page)).toEqual([]);
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'not_presented',
    });

    await briefing(page);
    expect((await familyEvents(page)).map((e) => e.event_type)).toEqual([
      `${FAMILY}presented`,
    ]);

    const briefed = (await reproduce(page)).row;

    expect(briefed).toMatchObject({
      value: null,
      disposition: 'pending',
      missing_reason: 'briefed_not_opened',
    });
    expect(briefed.components.exposure).toMatchObject({
      briefed: true,
      desk_opened: false,
      decisions_presented: 0,
    });

    // Opened and left at the orientation card: still pending; the card again.
    await openDesk(page);
    expect(await ids(page)).toEqual(['orientation', 'start', 'help', 'leave']);
    await leaveDesk(page);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'packet_presented')).toBe(0);
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    expect((await reproduce(page)).row.components.exposure).toMatchObject({
      briefed: true,
      desk_opened: true,
      orientation_acknowledged: false,
      decisions_presented: 0,
    });
    await openDesk(page);
    expect(await ids(page)).toEqual(['orientation', 'start', 'help', 'leave']);
    expect(await countOf(page, 'packet_presented')).toBe(0);
    expect(await countOf(page, 'series_reopened')).toBe(1);
    await leaveDesk(page);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R6 (a standard surface after M14): the quality packet keeps its frame, geometry, text sizes and input behaviour after the desk was used in the wide frame', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    // Session A: the desk in the wide frame first, then the packet.
    await toConcourse(page, 'u17r6a');
    await briefing(page);
    await openDesk(page);
    expect((await probe(page)).frame).toBe('wide');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter'); // START
    await page.waitForTimeout(300);
    await toggleTiles(page, ['1', '2']);
    await leaveDesk(page);
    await openPacket1(page);

    const after = await probe(page);

    expect(after.frame).toBe('standard');
    await shot(page, '22-quality-packet-standard-frame-after-desk');
    // Pointer activation as before: a click on Check (fuse) reveals the reference.
    await clickElement(page, 'check_fuse');
    expect(
      (await probe(page)).elements.find((e) => e.id === 'ref_fuse')?.label,
    ).toMatch(/Packing list: .+/);
    // A click in the side band outside the standard panel activates nothing.
    const eventsBefore = (await getEvents(page)).length;
    const band = await designToPage(page, -100, 300);

    await page.mouse.click(band.x, band.y);
    await page.waitForTimeout(300);
    expect((await probe(page)).open).toBe(true);
    expect((await getEvents(page)).length).toBe(eventsBefore);
    await press(page, 'Escape');
    await waitSurface(page, false);

    // Session B: the packet opened before any desk use, in a fresh session.
    await toConcourse(page, 'u17r6b');
    await briefing(page);
    await openPacket1(page);

    const fresh = await probe(page);

    expect(fresh.frame).toBe('standard');
    expect(after.title).toBe(fresh.title);
    expect(
      after.elements.map((e) => [e.id, e.x, e.y, e.w, e.h, e.text_px]),
    ).toEqual(fresh.elements.map((e) => [e.id, e.x, e.y, e.w, e.h, e.text_px]));
    expect(new Set(fresh.elements.map((e) => e.text_px))).toEqual(
      new Set([10, 12]),
    );
    expect(Math.abs(after.feedback_top - fresh.feedback_top)).toBeLessThan(0.5);
    await press(page, 'Escape');
    await waitSurface(page, false);
    expectNoRuntimeErrors(errors);
  });

  test('R7 (real-game fallback font, Courier New): all nine open at P1-D1 and P2-D3 keep at least 30 design px above the feedback line', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await forceMonospace(page, '"Courier New"');

    const errors = captureErrors(page);

    await toConcourse(page, 'u17r7a');
    await briefing(page);
    await openDesk(page);
    await fallbackGate(page, '19-p2d3-all-open-courier-new', 'Courier New');
    expectNoRuntimeErrors(errors);
  });

  test('R7 (real-game fallback font, Lucida Console): all nine open at P1-D1 and P2-D3 keep at least 30 design px above the feedback line', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await forceMonospace(page, '"Lucida Console"');

    const errors = captureErrors(page);

    await toConcourse(page, 'u17r7b');
    await briefing(page);
    await openDesk(page);
    await fallbackGate(
      page,
      '20-p2d3-all-open-lucida-console',
      'Lucida Console',
    );
    expectNoRuntimeErrors(errors);
  });
});

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

/** Measures the gate with all nine open at P1-D1 and at P2-D3 (keyboard). */
async function fallbackGate(page: Page, frame: string, font: string) {
  const measure = async (label: string) => {
    const value = await probe(page);
    const tiles = value.elements.filter((e) => e.id.startsWith('tile_'));
    const bottom = Math.max(...value.elements.map((e) => e.y + e.h / 2));
    const spare = value.feedback_top - bottom;

    expect(tiles.every((e) => e.label.includes('\n'))).toBe(true);
    // eslint-disable-next-line no-console
    console.log(
      `[R7 ${font}] ${label}: content bottom ${bottom.toFixed(1)}, feedback top ${value.feedback_top.toFixed(1)}, spare ${spare.toFixed(1)} design px; tile text/slot: ${tiles.map((e) => `${e.id} ${e.text_h.toFixed(0)}/${e.h}`).join(', ')}`,
    );
    expect(
      spare,
      `${label}: space above the feedback line`,
    ).toBeGreaterThanOrEqual(30);

    for (const tile of tiles) {
      expect(
        tile.text_h,
        `${label}: ${tile.id} text inside its slot`,
      ).toBeLessThanOrEqual(tile.h - 2);
    }

    const question = value.elements.find((e) => e.id === 'question');

    expect(
      question!.text_h,
      `${label}: question inside its block`,
    ).toBeLessThanOrEqual(question!.h);
  };

  await page.waitForTimeout(SETTLE_MS);
  await page.keyboard.press('Enter'); // START
  await page.waitForTimeout(300);
  await toggleTiles(page, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  await measure('P1-D1');

  for (const letter of ['a', 'b', 'd', 'b', 'c'] as const) {
    await answerByKeyboard(page, letter);
    await nextByKeyboard(page);
  }

  expect(await currentDecision(page)).toBe('p2_d3');
  await toggleTiles(page, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  await measure('P2-D3');
  await shot(page, frame);
  await leaveDesk(page);
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

/**
 * Quality packet 1 (the M12 route precedent): the packet's approach lies
 * inside Vale's radius, so the driver lands, reads the proximity prompt
 * and steps until it names the packet before pressing.
 */
async function openPacket1(page: Page) {
  // From wherever the avatar stands: west into the open hall, north to
  // the packet's row, then east (the M12 route-spec routine).
  await concourseVia(page, 368, 252);
  await walkTo(page, 368, PACKET_1.y, { yFirst: true });

  const landings = [
    { x: PACKET_1.x, y: PACKET_1.y },
    { x: PACKET_1.x + 8, y: PACKET_1.y - 10 },
    { x: PACKET_1.x + 14, y: PACKET_1.y - 16 },
    { x: PACKET_1.x + 4, y: PACKET_1.y - 20 },
  ];

  for (const [attempt, landing] of landings.entries()) {
    await walkTo(page, landing.x, landing.y, { tolerance: 6 });
    await page.waitForTimeout(200);

    const prompt = await page.evaluate(
      () =>
        (
          window as unknown as {
            __worldPromptProbe?: {
              prompt: boolean;
              text: string | null;
            } | null;
          }
        ).__worldPromptProbe ?? null,
    );

    if (prompt?.text?.toLowerCase().includes('quality packet')) {
      await press(page, 'Space');
      await waitSurface(page, true, 'm12_qc_packet_o1');

      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[driver] packet 1 landing ${attempt + 1}: prompt "${prompt?.text ?? 'none'}"`,
    );
  }

  throw new Error('packet 1: no landing put the quality packet nearest');
}

/**
 * The pointer-only scenario inside the desk. Every act is a click; the
 * only keyboard steps are the walk away and back and the station prompt
 * (reported as navigation).
 */
async function pointerScenario(
  page: Page,
  draftShot: string | null,
  allOpenShot: string | null,
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
  expect(await currentDecision(page)).toBe('p1_d1');

  // Tiles: open three, close one, reopen it.
  await clickElement(page, 'tile_m1');
  await clickElement(page, 'tile_g1');
  await clickElement(page, 'tile_m4');
  await clickElement(page, 'tile_g1');
  await clickElement(page, 'tile_g1');
  expect(await countOf(page, 'source_opened')).toBe(4);
  expect(await countOf(page, 'source_closed')).toBe(1);
  expect(meta(await lastOf(page, 'source_opened'))).toMatchObject({
    source_id: 'p1_g1',
    open_count: 2,
    input_mode: 'pointer',
  });

  // Drafts: choose, change, clear, choose again.
  await clickElement(page, 'option_b');
  await clickElement(page, 'option_a');
  await clickElement(page, 'option_a');
  expect(
    String(meta(await lastOf(page, 'option_drafted')).option_id ?? 'null'),
  ).toBe('null');
  await clickElement(page, 'option_a');
  expect(
    (await probe(page)).elements.find((e) => e.id === 'option_a')?.state,
  ).toBe('selected');

  if (draftShot !== null) {
    await shot(page, draftShot);
  }

  // RECORD ANSWER beyond design x 800 opens the dialog; the opening click
  // never confirms; a double click on RECORD ANSWER in the dialog records once.
  const recordX = await clickElementAt(page, 'record_answer', 110);

  expect(recordX).toBeGreaterThan(800);
  expect(await ids(page)).toEqual(['confirm', 'keep_working', 'dialog_text']);
  expect(await countOf(page, 'first_response')).toBe(0);
  await page.waitForTimeout(SETTLE_MS + 120);

  const confirm = (await probe(page)).elements.find((e) => e.id === 'confirm')!;
  const point = await designToPage(page, confirm.x, confirm.y);

  await page.mouse.dblclick(point.x, point.y);
  await page.waitForTimeout(300);
  expect(await countOf(page, 'first_response')).toBe(1);
  expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
    decision_id: 'p1_d1',
    option_id: 'p1_d1_a',
    correct: true,
    input_mode: 'pointer',
  });
  await expectNoCorrectnessOnScreen(page);
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next');
  expect(await currentDecision(page)).toBe('p1_d2');

  // Option D beyond design x 800; a side-band click activates nothing.
  const optionX = await clickElementAt(page, 'option_d', 110);

  expect(optionX).toBeGreaterThan(800);
  expect(
    (await probe(page)).elements.find((e) => e.id === 'option_d')?.state,
  ).toBe('selected');

  const eventsBefore = (await getEvents(page)).length;
  const band = await designToPage(page, -118, 300);

  await page.mouse.click(band.x, band.y);
  await page.waitForTimeout(300);
  expect((await probe(page)).open).toBe(true);
  expect((await getEvents(page)).length).toBe(eventsBefore);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __promptCards?: unknown[] | null })
          .__promptCards ?? null,
    ),
  ).toBeNull();

  // CANNOT SOLVE and its RECORD; HELP and CLOSE HELP; a cancelled dialog.
  await clickElement(page, 'help');
  expect((await ids(page))[0]).toBe('close_help');
  await clickElement(page, 'close_help');
  expect(await countOf(page, 'help_consulted')).toBe(1);
  await clickElement(page, 'cannot_solve');
  expect(await lines(page)).toContain('Record CANNOT SOLVE for decision 2?');
  await clickElement(page, 'keep_working');
  expect(await countOf(page, 'commit_cancelled')).toBe(1);
  expect(await countOf(page, 'first_response')).toBe(1);
  await clickElement(page, 'cannot_solve');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  expect(meta(await lastOf(page, 'first_response'))).toMatchObject({
    decision_id: 'p1_d2',
    response_kind: 'cannot_solve',
    correct: false,
    input_mode: 'pointer',
  });
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next');
  expect(await currentDecision(page)).toBe('p1_d3');

  // Mid packet with two tiles open and a draft: LEAVE DESK beyond design
  // x 800; KEYBOARD NAVIGATION away and back; the same state on return.
  await clickElement(page, 'tile_m1'); // close one of the three
  await clickElement(page, 'option_d');
  const openBefore = (await probe(page)).elements
    .filter((e) => e.id.startsWith('tile_') && e.label.includes('\n'))
    .map((e) => e.id);

  expect(openBefore).toEqual(['tile_m4', 'tile_g1']);

  const leaveX = await clickElementAt(page, 'leave', 0);

  expect(leaveX).toBeGreaterThan(800);
  await waitSurface(page, false);
  expect(await countOf(page, 'panel_left')).toBe(1);
  await concourseVia(page, PILOT.concourse.vale.x, PILOT.concourse.vale.y + 56);
  await openDesk(page);
  expect(await currentDecision(page)).toBe('p1_d3');
  expect(await countOf(page, 'decision_presented')).toBe(3);
  expect(
    (await probe(page)).elements
      .filter((e) => e.id.startsWith('tile_') && e.label.includes('\n'))
      .map((e) => e.id),
  ).toEqual(openBefore);
  expect(
    (await probe(page)).elements.find((e) => e.id === 'option_d')?.state,
  ).toBe('selected');

  if (draftShot !== null) {
    await shot(page, '15-desk-reopened-mid-packet');
  }

  // Finish the series by pointer: D3 correct; packet 2 all correct.
  await clickElement(page, 'record_answer');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'confirm');
  await page.waitForTimeout(SETTLE_MS + 120);
  await clickElement(page, 'next'); // NEXT PACKET
  expect(await currentDecision(page)).toBe('p2_d1');

  for (const letter of ['b', 'c', 'c'] as const) {
    if (
      letter === 'c' &&
      (await currentDecision(page)) === 'p2_d3' &&
      allOpenShot !== null
    ) {
      for (const tile of [
        'tile_m1',
        'tile_m2',
        'tile_m3',
        'tile_m4',
        'tile_m5',
        'tile_m6',
        'tile_g1',
        'tile_g2',
        'tile_g3',
      ]) {
        await clickElement(page, tile);
      }

      const value = await probe(page);
      const bottom = Math.max(...value.elements.map((e) => e.y + e.h / 2));

      // eslint-disable-next-line no-console
      console.log(
        `[R2 canvas=1080] P2-D3 all nine open: spare ${(value.feedback_top - bottom).toFixed(1)} design px`,
      );
      expect(value.feedback_top - bottom).toBeGreaterThanOrEqual(30);
      await shot(page, allOpenShot);
    }

    await clickElement(page, `option_${letter}`);
    await clickElement(page, 'record_answer');
    await page.waitForTimeout(SETTLE_MS + 120);
    await clickElement(page, 'confirm');
    await page.waitForTimeout(SETTLE_MS + 120);
    await clickElement(page, 'next');
  }

  // Results navigation and FINISH by pointer.
  expect(await countOf(page, 'first_response')).toBe(6);
  expect(await countOf(page, 'results_shown')).toBe(1);
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'results_next');
  expect(await countOf(page, 'results_shown')).toBe(2);
  await page.waitForTimeout(SETTLE_MS);
  await clickElement(page, 'results_back');
  expect(await lines(page)).toContain('Station answer: Loop A only');
  await clickElement(page, 'finish');
  await waitSurface(page, false);
  expect((await reproduce(page)).row).toMatchObject({
    value: 5,
    numerator: 5,
    denominator: 6,
    disposition: 'observed',
  });
}

test.describe('M14 two keyed packets: reload (Unit 17)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  /** Route to the desk, P1-D1 answered, the desk left. */
  async function beforeReload(page: Page, tag: string) {
    await toConcourse(page, tag);
    await briefing(page);
    await openDesk(page);
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter'); // START
    await page.waitForTimeout(300);
    await answerByKeyboard(page, 'a');
    await leaveDesk(page);

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

  test('R5 (reload): P1-D1 answered, then a page reload — the earlier log is carried byte-identically and the feature is interrupted', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);
    const before = await beforeReload(page, 'u17r5');

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
    expectNoRuntimeErrors(errors);
  });

  test('R5 (after the reload): the desk reached again — held back, never re-run', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);
    const before = await beforeReload(page, 'u17r5b');

    await reload(page);

    // The recorded block (UNIT-LOG "U15", R4): after a reload the journey
    // driver may be unable to replay the dock tutorial. When it cannot,
    // the post-reload browser administration is NOT VERIFIED — the test
    // is skipped with that reason, never passed.
    let blocked: string | null = null;

    try {
      await press(page, 'Space');
      await waitScene(page, 'dock', 60_000);
      await page.waitForTimeout(1600);
      await completeDockTutorial(page, 1);
      await dockToConcourse(page);
      await openDesk(page);
    } catch (error) {
      blocked = (error as Error).message.split('\n')[0];
    }

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the desk after the reload (${blocked}); the post-reload administration was not exercised in the browser and frame 17 is missing`,
    );

    expect(await lines(page)).toContain(
      'This desk was already used in this session. Its record is kept; nothing further is recorded here.',
    );
    expect(await ids(page)).toEqual(['record_text', 'leave']);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '17-reload-hold-back-record');
    await page.keyboard.press('a');
    await page.keyboard.press('r');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await leaveDesk(page);

    // The new load holds its reload check (the opening found) and the
    // hold-back record, and nothing else of the desk.
    const after = await pagePayload(page);
    const own = after.raw_events.filter((event) =>
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
    expect(
      own.filter((event) =>
        /opportunity_opened|packet_presented|decision_presented|first_response|results_shown/.test(
          event.event_type,
        ),
      ),
    ).toEqual([]);
    expect(JSON.stringify(after.prior)).toBe(JSON.stringify(before.raw_events));
    const held = (await reproduce(page)).row;

    expect(held).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'interrupted',
    });
    expect(held.components).toMatchObject({
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

  test('R8 (closeout ruling of 9 October 2026 — a reload BEFORE the desk was opened): the new load establishes the absence of an earlier opening, reads not_presented before the briefing and pending with briefed_not_opened after it, and opens the desk normally', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    // The first load: briefed, the desk never opened.
    await toConcourse(page, 'u17r8');
    await briefing(page);

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

    // Right after the reload, before the Concourse: no check of this load
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

    let blocked: string | null = null;

    try {
      await press(page, 'Space');
      await waitScene(page, 'dock', 60_000);
      await page.waitForTimeout(1600);
      await completeDockTutorial(page, 1);
      await dockToConcourse(page);
    } catch (error) {
      blocked = (error as Error).message.split('\n')[0];
    }

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the Concourse after the reload (${blocked}); the post-reload classification was not exercised in the browser`,
    );

    // Concourse entry wrote the check: a continuous history, the earlier
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

    // Before this load's briefing: not_presented (the earlier briefing is
    // in the components, never read as this load's exposure).
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
        desk_opened: false,
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
      desk_opened: false,
      never_opened_reason: 'briefed_not_opened',
    });

    // The desk opens normally — the orientation card, not the hold-back.
    await openDesk(page);
    expect(await ids(page)).toContain('start');
    expect(await lines(page)).not.toContain(
      'This desk was already used in this session.',
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, 'c01-reload-before-opening-orientation-card');
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter'); // START
    await page.waitForTimeout(300);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'orientation_acknowledged')).toBe(1);
    expect(await countOf(page, 'technical_failure')).toBe(0);
    expect(await currentDecision(page)).toBe('p1_d1');
    await leaveDesk(page);

    row = (await reproduce(page)).row;
    expect(row).toMatchObject({ disposition: 'pending', value: null });
    expect(row.components.exposure).toMatchObject({
      briefed: true,
      desk_opened: true,
      orientation_acknowledged: true,
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

test.describe('M14 two keyed packets: CLOSE HELP on the results (U17 closeout, 9 October 2026)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test('R9 (help on the results): a doubled ENTER and a double click after CLOSE HELP change nothing and write no results_shown; a settled press navigates', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await toConcourse(page, 'u17r9');
    await briefing(page);
    await openDesk(page);
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter'); // START
    await page.waitForTimeout(300);

    // The six keyed answers, then SHOW RESULTS.
    for (const letter of ['a', 'b', 'd', 'b', 'c', 'c'] as const) {
      await answerByKeyboard(page, letter);
      await nextByKeyboard(page);
    }

    expect(await countOf(page, 'first_response')).toBe(6);
    expect(await countOf(page, 'results_shown')).toBe(1);
    expect(await lines(page)).toContain('Station answer: Loop A only');

    // Keyboard: H opens the help sheet; ENTER closes it; a second ENTER
    // inside 400 ms lands on NEXT (the same place) and changes nothing.
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    expect((await probe(page)).focus).toBe('close_help');
    expect(await countOf(page, 'help_consulted')).toBe(1);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(await ids(page)).toContain('results_next');
    expect(await ids(page)).not.toContain('close_help');
    expect(await countOf(page, 'results_shown')).toBe(1);
    expect(await lines(page)).toContain('Station answer: Loop A only');
    expect(await lines(page)).not.toContain('Station answer: Text bursts only');
    await shot(page, 'c02-results-packet-1-after-doubled-close-help');

    // A settled ENTER on NEXT shows packet 2 (its one results_shown).
    await page.waitForTimeout(SETTLE_MS);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    expect(await countOf(page, 'results_shown')).toBe(2);
    expect(await lines(page)).toContain('Station answer: Text bursts only');

    // Pointer: HELP by click, then a double click on CLOSE HELP — the
    // second click lands on BACK (the same place) and changes nothing.
    await page.waitForTimeout(SETTLE_MS);
    await clickElement(page, 'help');
    expect((await probe(page)).focus).toBe('close_help');
    expect(await countOf(page, 'help_consulted')).toBe(2);

    const closeHelp = (await probe(page)).elements.find(
      (e) => e.id === 'close_help',
    )!;
    const point = await designToPage(page, closeHelp.x, closeHelp.y);

    await page.mouse.dblclick(point.x, point.y);
    await page.waitForTimeout(250);
    expect(await ids(page)).toContain('results_back');
    expect(await ids(page)).not.toContain('close_help');
    expect(await lines(page)).toContain('Station answer: Text bursts only');
    expect(await lines(page)).not.toContain('Station answer: Loop A only');
    expect(await countOf(page, 'results_shown')).toBe(2);
    await shot(page, 'c03-results-packet-2-after-double-clicked-close-help');

    // A settled click on BACK returns to packet 1; nothing new is recorded.
    await page.waitForTimeout(SETTLE_MS);
    await clickElement(page, 'results_back');
    expect(await lines(page)).toContain('Station answer: Loop A only');
    expect(await countOf(page, 'results_shown')).toBe(2);
    expect(await countOf(page, 'help_consulted')).toBe(2);
    expect(await lines(page)).not.toMatch(FORBIDDEN);
    await leaveDesk(page);

    expect((await reproduce(page)).row).toMatchObject({
      value: 6,
      denominator: 6,
      disposition: 'observed',
    });
    expect(await countOf(page, 'results_shown')).toBe(2);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });
});
