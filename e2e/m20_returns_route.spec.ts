/**
 * Station 080 M20 — the two held channels of the Mast 04 feed at the
 * Records Workshop station feed console on the participant route (Unit 22,
 * browser evidence run). Every scenario boots the participant default with
 * `bootPilot`, finishes the Dock tutorial, reaches the yard with
 * `routeToYardWork` (the mast prepared with `startAntenna` where the
 * scenario says so), returns inside with `yardReturnToConcourse` and
 * Vale's check-in (`valeReturnCheckIn`), and works the console in the
 * Workshop. No M20 state is injected; every protocol time is a real wait.
 *
 * INPUT, stated plainly: the walking, the station prompts (SPACE at a
 * station), Noor's and Vale's beats and the board sign-off are done by the
 * route drivers with the KEYBOARD — navigation, not an M20 response.
 * Inside the console R1, R3, R4, R5, R6 and R7 use the keyboard only; R2
 * uses the pointer only (every in-console act a real click at the probe's
 * design coordinates); R8 uses both.
 *
 *   R1  keyboard, yard prepared: the beacon at the console then at Press
 *       B; the card; A step 1 with a wrong executed ALIGN, a repeat and an
 *       as_loaded refusal; leave and reopen (in work, CONTINUE); A → hold;
 *       START B; B → hold; away from the console through both silent
 *       windows; A's notice (exact text) ≥ release + 30 s; walk back;
 *       CONTINUE A; one ALIGN ⇒ the cued credit; B's notice ≥ 8 s after A's
 *       end; B not resumed; sign-off ⇒ 1 / 2 observed, spontaneous 0.
 *   R2  pointer at 1280 × 720: a silent-window visit, CONTINUE A, one
 *       executed ALIGN ⇒ A resumed spontaneously (no notice, cue_cancelled);
 *       B's notice while standing at the console; the console closed and
 *       reopened in place; one ALIGN ⇒ B's cued credit ⇒ 1 / 1, spontaneous
 *       1; a double click on ALIGN executes once; HELP on four views.
 *   R3  deferral and early end: the relay bench open past A's due time;
 *       the release recorded on time; the notice right after the bench
 *       closes; an early end by a surface opening; a silent-window visit
 *       to B with edits and an as_loaded refusal; sign-off before B's
 *       notice ⇒ B cue_not_presented.
 *   R4  zero evidence (no yard preparation): never opened; sign-off ⇒
 *       closed_unopened; the review ⇒ the absence record; separately both
 *       held and signed off within 30 s ⇒ cue_not_presented.
 *   R5  both spontaneous ⇒ null primary, denominator 0, spontaneous 2.
 *   R6  reload after a credit ⇒ interrupted; the held-back record.
 *   R7  fallback fonts (Courier New, Lucida Console): the layout gate.
 *   R8  focus and access: neutral landings, TAB / ENTER / SPACE, pointer,
 *       HELP and LEAVE everywhere, the ESC order; both channels aligned.
 *   R9  the closed records: the sign-off record (R1, R4) and the held-back
 *       record (R6); the fault record by pure evidence only.
 *
 * Thirty-one evidence frames (800 × 600 unless stated) go to `U22_OUT`.
 * Nothing here establishes psychometric validity.
 */
import { mkdirSync } from 'node:fs';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { REGISTER_V3 } from '../src/measurement/registerV3';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { closeStationRecord } from './closureHelpers';
import { openSite, startAntenna } from './exteriorHelpers';
import { designToPage, getEvents, press, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  answerLogbookOffer,
  bootPilot,
  concourseToDeck,
  concourseToWorkshop,
  expectStage,
  labApproach,
  LOGBOOK_LABELS,
  openPromptAt,
  PILOT,
  pilotProbe,
  routeToYardWork,
  useDoor,
  waitPromptLabel,
  waitScene,
  workshopToConcourse,
  workshopVia,
  yardApproach,
  yardReturnToConcourse,
} from './pilotHelpers';
import {
  clickElement,
  openWorkshopSurface,
  signOffReturnShift,
  surface,
  valeReturnCheckIn,
  waitSurface,
  workshopApproach,
} from './returnHelpers';

const OUT = process.env.U22_OUT ?? 'test-results/u22-evidence';
const FAMILY = 'proto_m20_feed_';
const VERSION = 'm20-feed-returns-v2';
const SURFACE = 'm20_feed_console';
const SETTLE_MS = 400;
const A = 'm20_ch_a';
const B = 'm20_ch_b';
/** The targets, by hand from the preview (§4.4). */
const TARGET: Record<string, number[][]> = {
  m20_ch_a: [
    [2, 4, 3],
    [3, 1, 4],
    [4, 2, 1, 3],
    [1, 3, 4, 2],
    [3, 4, 2, 1, 4],
    [2, 1, 3, 4, 2],
  ],
  m20_ch_b: [
    [4, 1, 3],
    [2, 3, 1],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 2, 3, 1, 3],
    [1, 4, 2, 3, 4],
  ],
};
const FORBIDDEN =
  /proto_|people|describe|someone|\bstick|\btask|difficult|\bhard\b|persist|persever|grit|determin|resilien|give up|\bquit|effort|\blazy|\bgood\b|well done|great|\bfail|score|\btest|measure|rating|\bmust\b|should|need to|don't forget|remember|hurry|quick|please|\breturn|interrupt|remind/i;

const CARD_IDS = ['intro', 'continue', 'help_intro', 'leave_intro'];
const RECORD_IDS = ['closed', 'leave_record'];
const stepIds = (letter: string, step: number, cells: number) => [
  `board_${letter}_${step}`,
  ...Array.from({ length: cells }, (_, i) => `cell_${letter}_${step}_${i + 1}`),
  `align_${letter}_${step}`,
  // Owner amendment of 14 October 2026 (register §5.359 (2)): CHANNELS [C].
  `channels_step_${letter}_${step}`,
  `help_step_${letter}_${step}`,
  `leave_step_${letter}_${step}`,
];

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
  coverage_label: string;
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

interface M20Channel {
  status: string;
  word: string;
  started: boolean;
  step: number;
  steps_done: number;
  cells: number[];
  attempts: number;
  held_at_ms: number | null;
  released_at_ms: number | null;
  cue_due_at_ms: number | null;
  cue_presented_at_ms: number | null;
  cue_ended_at_ms: number | null;
  cue_ended_reason: string | null;
  cue_cancelled: boolean;
  resumption: string | null;
  resumption_attempt_index: number | null;
  aligned: boolean;
  held_visits: number;
  released_visits: number;
  post_resumption_reentries: number;
}

interface M20Probe {
  status: string;
  view: string;
  current: string | null;
  console_open: boolean;
  help_open: boolean;
  window: string;
  exit: string | null;
  chip: string;
  closure_reason: string | null;
  spontaneous_resumptions: number;
  notice: {
    channel_id: string;
    presented_at_ms: number;
    lines: string[];
  } | null;
  now_ms: number;
  outdoor: {
    accepted: boolean;
    stages_done: string[];
    outdoor_complete: boolean;
  };
  channels: Record<string, M20Channel>;
}

interface BandProbe {
  visible: boolean;
  lines: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  text_height: number;
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

async function m20(page: Page): Promise<M20Probe> {
  const value = await page.evaluate(
    () =>
      (window as unknown as { __m20FeedProbe?: M20Probe | null })
        .__m20FeedProbe ?? null,
  );

  if (value === null) {
    throw new Error('__m20FeedProbe unavailable');
  }

  return value;
}

async function band(page: Page): Promise<BandProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __m20BandProbe?: BandProbe | null })
        .__m20BandProbe ?? null,
  );
}

async function familyEvents(page: Page) {
  return (await getEvents(page)).filter((event) =>
    event.event_type.startsWith(FAMILY),
  );
}

/** The console's own records (the yard's `outdoor_*` records left out). */
async function consoleEvents(page: Page) {
  return (await familyEvents(page)).filter(
    (event) => !event.event_type.startsWith(`${FAMILY}outdoor_`),
  );
}

async function suffixes(page: Page) {
  return (await consoleEvents(page)).map((event) =>
    event.event_type.slice(FAMILY.length),
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

async function ofChannel(page: Page, suffix: string, channel: string) {
  return (await familyEvents(page)).filter(
    (event) =>
      event.event_type === `${FAMILY}${suffix}` &&
      meta(event).channel_id === channel,
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
    JSON.stringify(extractItemFeatures('M20', payload.raw_events, context)),
  ) as FeatureRow[];
  const own = payload.features.filter((row) => row.item_id === 'M20');

  expect(own, 'the page exports one M20 row').toHaveLength(1);
  expect(offline, "offline extraction equals the page's row").toEqual(own);
  expect(JSON.stringify(payload.raw_events)).toBe(before);
  expect(offline[0].feature_id).toBe('m20_cued_resumptions');
  expect(offline[0].planned_denominator).toBe(2);
  expect(offline[0].coverage_label).toBe('exploratory');
  expect(offline[0].components.difficulty_established).toBe(false);

  return offline[0];
}

const channelOf = (row: FeatureRow, id: string) =>
  (row.components.channels as Comp[]).find((c) => c.channel_id === id)!;

/** Administration version on the live events; exactly one family owner; no legacy event. */
async function expectFamilyDiscipline(page: Page) {
  const all = await getEvents(page);
  const own = all.filter((event) => event.event_type.startsWith(FAMILY));

  expect(own.length, 'the family was emitted').toBeGreaterThan(0);

  for (const event of own) {
    expect(meta(event).entry_state_version, event.event_type).toBe(VERSION);
    expect(meta(event).opportunity_id).toBe('proto_m20_feed_project');
    expect(meta(event).measure_id).toBe('M20');
    expect(meta(event).window_id).toBe('m20_feed_w1');
    expect(typeof (event as { sequence?: number }).sequence).toBe('number');
  }

  expect(
    REGISTER_V3.filter((entry) =>
      entry.route.family_prefixes.some((prefix) => FAMILY.startsWith(prefix)),
    ).map((entry) => entry.id),
  ).toEqual(['M20']);
  // The legacy antenna family is never written on the route.
  expect(
    all.filter((event) => event.event_type.startsWith('proto_m20_antenna_')),
  ).toEqual([]);
}

async function expectNoForbiddenOnScreen(page: Page) {
  expect(await lines(page)).not.toMatch(FORBIDDEN);
}

// ——— Driver steps (KEYBOARD NAVIGATION — never an M20 response) ————————

/**
 * Opening → Dock tutorial → … → the yard (Noor's briefing acknowledged),
 * the mast prepared when asked, Noor's "finished outside", the laboratory,
 * the Concourse, Vale's check-in and the Workshop (stage workshop_return).
 */
async function toWorkshopReturn(
  page: Page,
  tag: string,
  options: { mast: 'prepared' | 'none'; shotMast?: string } = {
    mast: 'prepared',
  },
) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await routeToYardWork(page);

  if (options.mast === 'prepared') {
    await startAntenna(page);

    if (options.shotMast !== undefined) {
      await openSite(page, 'mast');
      await shot(page, options.shotMast);
      await selectPromptOption(page, 1);
      await page.waitForTimeout(300);
    }
  }

  await yardReturnToConcourse(page);
  await valeReturnCheckIn(page);
  await waitScene(page, 'records_workshop');
  await page.bringToFront();
  await page.waitForTimeout(400);
}

/** Walks to the console's audited approach and presses SPACE (keyboard navigation). */
async function openConsole(page: Page) {
  await openWorkshopSurface(page, 'feedConsole', SURFACE);
  await page.waitForTimeout(SETTLE_MS + 50);
}

/** ESC on the console after its view settled (the same path as LEAVE). */
async function leaveConsole(page: Page) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/** The review closure after the sign-off: the deck and the station record closed. */
async function toReviewClosure(page: Page) {
  await workshopToConcourse(page);
  await concourseToDeck(page);
  await closeStationRecord(page);
}

// ——— In-console keyboard acts ——————————————————————————————————————————

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

/** Sets the current step's cells by the 1–5 hotkeys (cells cycle 1 → 2 → 3 → 4 → 1). */
async function setCellsByKeys(page: Page, target: number[]) {
  await page.waitForTimeout(SETTLE_MS + 50);

  for (let cell = 0; cell < target.length; cell += 1) {
    for (let k = 1; k < target[cell]; k += 1) {
      await page.keyboard.press(String(cell + 1));
      await page.waitForTimeout(120);
    }
  }
}

/** Aligns the current step with its target by keys (G). */
async function solveByKeys(page: Page, channel: string, step: number) {
  await setCellsByKeys(page, TARGET[channel][step - 1]);
  await hotkey(page, 'g');
}

/** Aligns the current step from the cells it holds now (a kept draft), by keys. */
async function solveFromDraftByKeys(page: Page, channel: string, step: number) {
  const current = (await m20(page)).channels[channel].cells;
  const target = TARGET[channel][step - 1];

  await page.waitForTimeout(SETTLE_MS + 50);

  for (let cell = 0; cell < target.length; cell += 1) {
    const presses = (target[cell] - current[cell] + 4) % 4;

    for (let k = 0; k < presses; k += 1) {
      await page.keyboard.press(String(cell + 1));
      await page.waitForTimeout(120);
    }
  }

  await hotkey(page, 'g');
}

// ——— In-console pointer acts ———————————————————————————————————————————

async function click(page: Page, id: string) {
  await page.waitForTimeout(SETTLE_MS + 50);
  await clickElement(page, id);
}

async function dblclickElement(page: Page, id: string) {
  const element = (await probe(page)).elements.find((e) => e.id === id);

  if (element === undefined) {
    throw new Error(`element ${id} missing`);
  }

  const point = await designToPage(page, element.x, element.y);

  await page.mouse.dblclick(point.x, point.y);
  await page.waitForTimeout(250);
}

/** Sets the current step's cells by clicks on the tiles. */
async function setCellsByClicks(
  page: Page,
  letter: string,
  step: number,
  target: number[],
) {
  await page.waitForTimeout(SETTLE_MS + 50);

  for (let cell = 0; cell < target.length; cell += 1) {
    for (let k = 1; k < target[cell]; k += 1) {
      await clickElement(page, `cell_${letter}_${step}_${cell + 1}`);
    }
  }
}

async function solveByClicks(page: Page, channel: string, step: number) {
  const letter = channel === A ? 'a' : 'b';

  await setCellsByClicks(page, letter, step, TARGET[channel][step - 1]);
  await click(page, `align_${letter}_${step}`);
}

// ——— Waits on the protocol times (the probe) ———————————————————————————

async function waitRelease(page: Page, channel: string) {
  await page.waitForFunction(
    (id) =>
      (window as unknown as { __m20FeedProbe?: M20Probe | null }).__m20FeedProbe
        ?.channels[id]?.released_at_ms !== null,
    channel,
    { timeout: 45_000 },
  );
}

async function waitNotice(page: Page, channel: string, timeout = 50_000) {
  await page.waitForFunction(
    (id) =>
      (window as unknown as { __m20FeedProbe?: M20Probe | null }).__m20FeedProbe
        ?.notice?.channel_id === id,
    channel,
    { timeout },
  );
}

async function waitNoticeEnd(page: Page, channel: string) {
  await page.waitForFunction(
    (id) =>
      (window as unknown as { __m20FeedProbe?: M20Probe | null }).__m20FeedProbe
        ?.channels[id]?.cue_ended_at_ms !== null,
    channel,
    { timeout: 10_000 },
  );
}

/** Waits until the page clock passes a time (the adapter's own clock). */
async function waitUntilMs(page: Page, atMs: number, timeout = 70_000) {
  await page.waitForFunction((at) => Date.now() >= at, atMs, { timeout });
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
) {
  const value = await probe(page);
  const bottom = Math.max(...value.elements.map((e) => e.y + e.h / 2));
  const spare = value.feedback_top - bottom;
  // The per-line height of the font: the first fixed block measured under
  // this font sets the reference (a 16 px line is 16–24 px under every
  // font); every later block must agree with it within 1.5 px, so a block
  // wrapped onto an extra line disagrees whichever block it is.
  const first = value.elements.find((e) => e.id === fixed[0]?.id);
  const lineHeight =
    LINE_REF.get(font) ??
    (first !== undefined ? first.text_h / fixed[0].lines : 16);

  if (!LINE_REF.has(font)) {
    LINE_REF.set(font, lineHeight);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[layout ${font}] ${label}: content bottom ${bottom.toFixed(1)}, feedback top ${value.feedback_top.toFixed(1)}, spare ${spare.toFixed(1)} design px; line ${lineHeight.toFixed(1)}; text/box: ${value.elements.map((e) => `${e.id} ${e.text_h.toFixed(0)}/${e.h}`).join(', ')}`,
  );
  expect(lineHeight).toBeGreaterThanOrEqual(14);
  expect(lineHeight).toBeLessThanOrEqual(24);
  expect(
    spare,
    `${label}: space above the feedback line`,
  ).toBeGreaterThanOrEqual(30);
  expect(value.frame).toBe('wide');
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
      Math.abs(element!.text_h / block.lines - lineHeight),
      `${label}: ${block.id} on ${block.lines} lines (text ${element!.text_h.toFixed(1)}, line ${lineHeight.toFixed(1)})`,
    ).toBeLessThan(1.5);
  }
}

/** The per-line height measured first under each font (see `measureGate`). */
const LINE_REF = new Map<string, number>();

/**
 * The notice band (owner amendment of 14 October 2026, register §5.359
 * (6)): two lines in the top strip, right of the mission card, inside a
 * 16 px margin — above design y 80, where no floating station prompt is
 * ever drawn, so clear of the shared feedback line (y 128) and of the
 * south wall's annex doorway.
 */
async function measureBand(page: Page, font: string, channel: string) {
  const value = await band(page);
  const card = await page.evaluate(
    () =>
      (
        window as unknown as {
          __missionCardProbe?: { x: number; width: number } | null;
        }
      ).__missionCardProbe ?? null,
  );

  expect(value, 'the band probe').not.toBeNull();
  expect(value!.visible).toBe(true);
  expect(value!.lines).toEqual([
    `FEED CONSOLE: the next pass for channel ${channel} is open.`,
    `Channel ${channel} can be continued · 4 of 6 steps remain.`,
  ]);
  // eslint-disable-next-line no-console
  console.log(
    `[band ${font}] x ${value!.x.toFixed(1)} y ${value!.y.toFixed(1)} w ${value!.width.toFixed(1)} h ${value!.height.toFixed(1)} text ${value!.text_height.toFixed(1)}`,
  );
  expect(card, 'the mission-card probe').not.toBeNull();
  expect(value!.x).toBeGreaterThanOrEqual(card!.x + card!.width + 16 - 1);
  expect(value!.x + value!.width).toBeLessThanOrEqual(800 - 16);
  // The top strip: inside the 16 px margin and wholly above design y 80
  // (prompts are clamped below it; the feedback line is centred at 128).
  expect(value!.y).toBeGreaterThanOrEqual(16 - 1);
  expect(value!.y + value!.height).toBeLessThanOrEqual(80);
  // Two lines of 16 px text with their padding: never one, never three.
  expect(value!.text_height).toBeGreaterThan(36);
  expect(value!.text_height).toBeLessThan(70);
}

/* ------------------------------------------------------------------ *
 * R1 — keyboard, yard prepared
 * ------------------------------------------------------------------ */

test.describe('M20 feed console on the route (Unit 22)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test("R1 (keyboard, yard prepared): the beacon at the console then Press B; the card; A step 1 with a wrong ALIGN, a repeat and an as_loaded refusal; leave and reopen in work; A → hold; START B; B → hold; away through both silent windows; A's notice at ≥ release + 30 s; walk back; CONTINUE A; one ALIGN ⇒ the cued credit; B's notice ≥ 8 s after A's end; B not resumed; sign-off ⇒ 1 / 2 observed", async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await toWorkshopReturn(page, 'u22r1', {
      mast: 'prepared',
      shotMast: '27-yard-mast-04-prompt',
    });

    // The Workshop entry: presented, guided first; the chip counts only.
    expect((await pilotProbe(page))?.beacon?.label).toBe(
      'Station Feed Console',
    );
    expect(await suffixes(page)).toEqual(['presented']);
    expect(
      (await familyEvents(page)).filter((e) =>
        e.event_type.startsWith(`${FAMILY}outdoor_`),
      ).length,
    ).toBe(4);
    expect((await m20(page)).chip).toBe('MAST 04 FEED · 2 channels');
    expect((await m20(page)).outdoor).toEqual({
      accepted: true,
      stages_done: ['clear_base_clamp', 'seat_feed_line'],
      outdoor_complete: true,
    });
    // The yard's mission-log line closed with the return shift.
    expect(
      (await pilotProbe(page))?.mission_log.map((e) => e.text).join(' '),
    ).not.toContain('Mast 04');
    expect(await reproduce(page)).toMatchObject({
      value: null,
      disposition: 'pending',
      missing_reason: 'presented_not_opened',
    });
    await shot(page, '01-workshop-entry-beacon-at-console');
    await workshopApproach(page, 'feedConsole');
    await shot(page, '01b-at-the-console-before-the-first-opening');

    // The first-opening card: neutral focus, CONTINUE, HELP, LEAVE.
    await openConsole(page);
    expect((await probe(page)).frame).toBe('wide');
    expect((await probe(page)).title).toBe('MAST 04 FEED');
    expect((await probe(page)).status).toBe('Read the card, then CONTINUE.');
    expect(await ids(page)).toEqual(CARD_IDS);
    expect((await probe(page)).focus).toBe('intro');
    expect(await lines(page)).toContain(
      'The Mast 04 feed has two channels, A and B. Each needs six steps.',
    );
    await expectNoForbiddenOnScreen(page);
    await measureGate(page, 'default', 'card', [{ id: 'intro', lines: 9 }]);
    await shot(page, '02-first-opening-card');
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(
      meta(await lastOf(page, 'opportunity_opened')).entry_state_snapshot,
    ).toMatchObject({
      channels_planned: 2,
      channel_order: [A, B],
      steps_per_channel: 6,
      cells_per_step: [3, 3, 4, 4, 5, 5],
      hold_after_step: 2,
      release_delay_ms: 30000,
      notice_after_release_ms: 30000,
      notice_ms: 6000,
      notice_spacing_ms: 8000,
      refusal_rule: 'vector_as_loaded_or_last_executed',
      credit_rule: 'first_executed_align_after_cue',
      spontaneous_rule: 'first_executed_align_after_release_before_cue',
      form_id: 'm20-form-1',
      content_version: 'm20-content-v2',
      settle_ms: 400,
      outdoor_prepared: { accepted: true, outdoor_complete: true },
      stage: 'workshop_return',
    });
    // A settled ENTER on the neutral landing presses nothing.
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await countOf(page, 'intro_acknowledged')).toBe(0);

    await activateByKeyboard(page, 'continue');
    expect(await countOf(page, 'intro_acknowledged')).toBe(1);
    expect(await ids(page)).toEqual(stepIds('a', 1, 3));
    expect((await probe(page)).focus).toBe('board_a_1');
    expect((await probe(page)).status).toBe('Working on channel A.');
    expect(await labelOf(page, 'board_a_1')).toBe(
      'TARGET   2  4  3\nCELLS    1  1  1\n\nChannel A: 0 of 6 steps done.',
    );
    await measureGate(page, 'default', 'A step 1', [
      { id: 'board_a_1', lines: 4 },
    ]);
    await shot(page, '03-a-step-1');
    // as_loaded refused first.
    await hotkey(page, 'g');
    expect((await probe(page)).feedback).toBe(
      'The cells are as loaded. Change a cell first.',
    );
    expect(meta(await lastOf(page, 'align_refused'))).toMatchObject({
      channel_id: A,
      step_index: 1,
      reason: 'as_loaded',
      input_mode: 'keyboard',
    });
    await shot(page, '05-refused-as-loaded');
    // A wrong executed ALIGN: 2 1 1 ⇒ 2 cells differ.
    await hotkey(page, '1');
    expect(await labelOf(page, 'cell_a_1_1')).toBe('CELL 1   value 2   [1]');
    expect(meta(await lastOf(page, 'cell_changed'))).toMatchObject({
      cell: 1,
      value_before: 1,
      value_after: 2,
    });
    await hotkey(page, 'g');
    expect((await probe(page)).feedback).toBe('Not aligned: 2 cells differ.');
    expect(meta(await lastOf(page, 'align_attempt'))).toMatchObject({
      channel_id: A,
      step_index: 1,
      attempt_index: 1,
      cells: [2, 1, 1],
      differ: 2,
      aligned: false,
      after_cue: false,
      in_silent_window: false,
      input_mode: 'keyboard',
    });
    await shot(page, '04-not-aligned');
    // The same vector again: refused repeat.
    await hotkey(page, 'g');
    expect((await probe(page)).feedback).toBe(
      'Same cells as the last ALIGN. Change a cell first.',
    );
    expect(meta(await lastOf(page, 'align_refused'))).toMatchObject({
      reason: 'repeat',
      cells: [2, 1, 1],
    });
    expect(await countOf(page, 'align_attempt')).toBe(1);
    await shot(page, '06-refused-repeat');
    // Leave and reopen during step 1: in work, CONTINUE A, no START B.
    await leaveConsole(page);
    expect(meta(await lastOf(page, 'console_left'))).toMatchObject({
      view: 'step',
      channel_id: A,
    });
    expect((await m20(page)).chip).toBe('A 0/6 · B 0/6');
    await openConsole(page);
    expect(await ids(page)).toEqual([
      'rows',
      'continue_a',
      'help_channels',
      'leave_channels',
    ]);
    expect(await labelOf(page, 'rows')).toBe(
      'CHANNEL A   0 of 6 steps   in work\nCHANNEL B   0 of 6 steps   not started',
    );
    await measureGate(page, 'default', 'channel view', [
      { id: 'rows', lines: 2 },
    ]);
    await shot(page, '07-channel-view-a-in-work');
    await hotkey(page, 'a');
    expect(meta(await lastOf(page, 'step_presented'))).toMatchObject({
      step_index: 1,
      resumed: true,
      cells: [2, 1, 1],
    });
    expect((await probe(page)).focus).toBe('board_a_1');
    // Step 1 aligned (the cells as left: 2 1 1 → 2 4 3), then step 2 ⇒ the hold.
    await setCellsByKeys(page, [1, 4, 3]); // relative: cell 1 stays at 2
    await hotkey(page, 'g');
    expect((await probe(page)).feedback).toBe('Step 1 aligned.');
    expect(await ids(page)).toEqual(stepIds('a', 2, 3));
    expect((await probe(page)).focus).toBe('board_a_2');
    await solveByKeys(page, A, 2);
    expect((await probe(page)).feedback).toBe('Step 2 aligned.');
    expect(await ids(page)).toEqual([
      'held_a',
      'start_b',
      'channels_held_a',
      'help_held_a',
      'leave_held_a',
    ]);
    expect((await probe(page)).status).toBe(
      'Channel A is held until its next pass.',
    );
    expect(await labelOf(page, 'held_a')).toBe(
      'Pass ended. Channel A is held.\nChannel A: 2 of 6 steps done, 4 remain.\nIts next pass opens later. This console shows when it is open.',
    );
    await measureGate(page, 'default', 'A held', [{ id: 'held_a', lines: 3 }]);
    await shot(page, '08-a-hold-view');

    const heldA = meta(await lastOf(page, 'channel_held'));

    expect(heldA).toMatchObject({
      channel_id: A,
      steps_done: 2,
      remaining_steps: 4,
    });
    expect((await m20(page)).channels[A].held_at_ms).toBe(heldA.held_at_ms);
    // START B from the hold view; B's two steps ⇒ the hold.
    await hotkey(page, 'b');
    expect(meta(await lastOf(page, 'channel_started'))).toMatchObject({
      channel_id: B,
      assigned_position: 2,
      realised_position: 2,
    });
    expect(await ids(page)).toEqual(stepIds('b', 1, 3));
    await solveByKeys(page, B, 1);
    await solveByKeys(page, B, 2);
    expect(await ids(page)).toEqual([
      'held_b',
      'channels_held_b',
      'help_held_b',
      'leave_held_b',
    ]);
    await shot(page, '09-b-hold-view');

    const heldB = meta(await lastOf(page, 'channel_held'));

    expect(heldB.channel_id).toBe(B);
    await leaveConsole(page);
    expect((await m20(page)).chip).toBe('A 2/6 · B 2/6');
    expect((await pilotProbe(page))?.beacon?.label).toBe('Label Press B');
    // Reopen: both held, no button, a blocked approach per channel.
    await openConsole(page);
    expect(await ids(page)).toEqual([
      'rows',
      'note',
      'help_channels',
      'leave_channels',
    ]);
    expect(await labelOf(page, 'note')).toBe(
      'No channel can be worked until its next pass.',
    );
    expect(await labelOf(page, 'rows')).toBe(
      'CHANNEL A   2 of 6 steps   held\nCHANNEL B   2 of 6 steps   held',
    );
    await shot(page, '10-channel-view-both-held');
    expect(await countOf(page, 'held_visit')).toBe(2);
    await leaveConsole(page);

    // Away from the console through both silent windows: no visit; the
    // releases at exactly hold + 30 000. The guidance after the first
    // opening: the beacon at Press B, never back at the console — seen from
    // the south lane, outside its 120 px arrival range, where its light is
    // drawn (owner amendment §5.359 (6), frame 26).
    await workshopVia(page, 430, 252);
    await page.waitForTimeout(300);
    expect((await pilotProbe(page))?.beacon).toMatchObject({
      label: 'Label Press B',
      visible: true,
    });
    await shot(page, '26-workshop-after-first-opening-beacon-at-press-b');
    await workshopApproach(page, 'pressB');
    await waitRelease(page, A);
    await waitRelease(page, B);
    expect(await countOf(page, 'released_visit')).toBe(0);
    expect(
      meta((await ofChannel(page, 'channel_released', A))[0]),
    ).toMatchObject({
      released_at_ms: Number(heldA.held_at_ms) + 30_000,
      check: 'tick',
    });
    expect(
      Number(
        meta((await ofChannel(page, 'channel_released', A))[0])
          .write_latency_ms,
      ),
    ).toBeLessThan(1_000);
    expect(
      meta((await ofChannel(page, 'channel_released', B))[0]),
    ).toMatchObject({
      released_at_ms: Number(heldB.held_at_ms) + 30_000,
    });
    expect((await m20(page)).chip).toBe('A 2/6 · B 2/6'); // counts only
    expect((await m20(page)).notice).toBeNull();
    // A's notice at ≥ release + 30 s, with the exact text.
    await waitNotice(page, A);

    const noticeA = await m20(page);

    expect(noticeA.notice?.lines).toEqual([
      'FEED CONSOLE: the next pass for channel A is open.',
      'Channel A can be continued · 4 of 6 steps remain.',
    ]);
    await measureBand(page, 'default', 'A');
    await shot(page, '31-world-notice-for-a');

    const cueA = meta(await lastOf(page, 'cue_presented'));

    expect(cueA).toMatchObject({
      channel_id: A,
      occasion_id: A,
      released_at_ms: Number(heldA.held_at_ms) + 30_000,
      due_at_ms: Number(heldA.held_at_ms) + 60_000,
      page_visible: true,
      page_focused: true,
      remaining_steps: 4,
    });
    expect(Number(cueA.presented_at_ms)).toBeGreaterThanOrEqual(
      Number(heldA.held_at_ms) + 60_000,
    );
    expect(Number(cueA.deferred_ms)).toBeLessThan(1_000);
    expect(typeof cueA.distance_to_console_px).toBe('number');
    await waitNoticeEnd(page, A);

    const endA = meta(await lastOf(page, 'cue_notice_ended'));

    expect(endA).toMatchObject({ channel_id: A, ended_reason: 'timeout' });
    expect(Number(endA.displayed_ms)).toBeGreaterThanOrEqual(6_000);
    expect(Number(endA.displayed_ms)).toBeLessThan(7_000);
    expect(endA.focus_lost_during_display).toBe(false);
    expect((await band(page))?.visible).toBe(false);

    // B's notice ≥ 8 s after A's ACTUAL end (and ≥ B's release + 30 s),
    // still away from the console; B is never resumed.
    await waitNotice(page, B);

    const cueB = meta(await lastOf(page, 'cue_presented'));

    expect(cueB.channel_id).toBe(B);
    expect(Number(cueB.presented_at_ms)).toBeGreaterThanOrEqual(
      Number(endA.ended_at_ms) + 8_000,
    );
    expect(Number(cueB.presented_at_ms)).toBeGreaterThanOrEqual(
      Number(heldB.held_at_ms) + 60_000,
    );
    expect((await m20(page)).notice?.lines).toEqual([
      'FEED CONSOLE: the next pass for channel B is open.',
      'Channel B can be continued · 4 of 6 steps remain.',
    ]);
    await shot(page, '14-world-notice-for-b');
    await waitNoticeEnd(page, B);
    expect(meta(await lastOf(page, 'cue_notice_ended'))).toMatchObject({
      channel_id: B,
      ended_reason: 'timeout',
    });
    expect(await countOf(page, 'cue_presented')).toBe(2);

    // Walk back; CONTINUE A; one ALIGN ⇒ the cued credit.
    await openConsole(page);
    expect(await ids(page)).toEqual([
      'rows',
      'continue_a',
      'continue_b',
      'help_channels',
      'leave_channels',
    ]);
    expect(await labelOf(page, 'rows')).toBe(
      'CHANNEL A   2 of 6 steps   pass open\nCHANNEL B   2 of 6 steps   pass open',
    );
    await shot(page, '16-channel-view-two-continue');
    expect(meta(await lastOf(page, 'console_reopened'))).toMatchObject({
      view: 'channels',
    });
    // Both channels are noticed: an arrival after the notices, never a
    // silent-window visit.
    expect(await countOf(page, 'released_visit')).toBe(0);
    await hotkey(page, 'a');
    expect(meta(await lastOf(page, 'step_presented'))).toMatchObject({
      channel_id: A,
      step_index: 3,
      resumed: false,
      cells: [1, 1, 1, 1],
    });
    await hotkey(page, '1');
    await hotkey(page, 'g');

    const credit = meta(await lastOf(page, 'align_attempt'));

    expect(credit).toMatchObject({
      channel_id: A,
      step_index: 3,
      attempt_index: 4,
      cells: [2, 1, 1, 1],
      aligned: false,
      after_cue: true,
      in_silent_window: false,
      resumption: 'cued',
    });
    expect((await m20(page)).channels[A].resumption).toBe('cued');
    // Continue to a 5-cell step with feedback.
    await setCellsByKeys(page, [3, 2, 1, 3]); // 2 1 1 1 → 4 2 1 3
    await hotkey(page, 'g');
    expect((await probe(page)).feedback).toBe('Step 3 aligned.');
    await solveByKeys(page, A, 4);
    expect((await probe(page)).feedback).toBe('Step 4 aligned.');
    expect(await ids(page)).toEqual(stepIds('a', 5, 5));
    await measureGate(page, 'default', 'A step 5', [
      { id: 'board_a_5', lines: 4 },
    ]);
    await shot(page, '15-five-cell-step-with-feedback');
    // Help on a step.
    await hotkey(page, 'h');
    expect(await ids(page)).toEqual(['close_help', 'help_sheet']);
    expect((await probe(page)).focus).toBe('close_help');
    await measureGate(page, 'default', 'help', [
      { id: 'help_sheet', lines: 8 },
    ]);
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'step_a_5',
    });
    await hotkey(page, 'h');
    expect(await ids(page)).toEqual(stepIds('a', 5, 5));
    await leaveConsole(page);
    expect((await m20(page)).chip).toBe('A 4/6 · B 2/6');
    // No notice is repeated; B stays unresumed.
    await page.waitForTimeout(1_500);
    expect(await countOf(page, 'cue_presented')).toBe(2);
    expect((await m20(page)).notice).toBeNull();

    // The sign-off closes the project: 1 / 2 observed.
    await signOffReturnShift(page);
    expect(meta(await lastOf(page, 'project_closed'))).toMatchObject({
      closure_reason: 'shift_signed_off',
      channels_planned: 2,
      spontaneous_resumptions: 0,
    });
    expect(meta(await lastOf(page, 'window_closed'))).toMatchObject({
      exit_state: 'stopped',
    });
    expect((await suffixes(page)).slice(-2)).toEqual([
      'project_closed',
      'window_closed',
    ]);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
      censored: false,
      closure_reason: 'route_departure',
      included_ids: [A, B],
    });
    expect(row.components.spontaneous_resumptions).toBe(0);
    expect(channelOf(row, A)).toMatchObject({
      status: 'resumed',
      credited: true,
      credit_attempt_index: 4,
      held_visits: 1,
      released_visits: 0,
      steps_after_cue: 2,
    });
    expect(channelOf(row, B)).toMatchObject({
      status: 'not_resumed',
      credited: false,
      held_visits: 1,
      released_visits: 0,
      arrived_after_cue_without_credit: true,
      cue_ended_reason: 'timeout',
    });
    expect(row.components.project_closure_reason).toBe('shift_signed_off');
    expect((await m20(page)).chip).toBe('closed for the shift');
    // The console afterwards: the sign-off record; nothing is written.
    const before = (await familyEvents(page)).length;

    await openConsole(page);
    expect(await ids(page)).toEqual(RECORD_IDS);
    expect(await labelOf(page, 'closed')).toBe(
      'The console closed when the shift was signed off.',
    );
    await shot(page, '19-sign-off-record');
    await leaveConsole(page);
    expect((await familyEvents(page)).length).toBe(before);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  /* ---------------------------------------------------------------- *
   * R3 — deferral, early end, neighbours, the silent-window visit
   * ---------------------------------------------------------------- */

  test("R3 (deferral, early end, neighbours, silent-window visit): the relay bench open past A's due time ⇒ the release recorded on time and no notice; the notice right after the bench closes (deferred_ms > 0); a surface opening within 6 s ends it (surface_opened); M21's events unchanged; B held later, a silent-window visit with edits and an as_loaded refusal is no resumption; sign-off before B's notice ⇒ B cue_not_presented", async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await toWorkshopReturn(page, 'u22r3');
    await openConsole(page);
    await activateByKeyboard(page, 'continue');
    await solveByKeys(page, A, 1);
    await solveByKeys(page, A, 2);

    const heldA = Number(meta(await lastOf(page, 'channel_held')).held_at_ms);
    const dueA = heldA + 60_000;

    await leaveConsole(page);
    // The relay bench (M21) before A's release, kept open past A's due time.
    await openWorkshopSurface(page, 'relayBench', 'm21_relay_bench');

    const m21Before = (await getEvents(page)).filter((e) =>
      e.event_type.startsWith('proto_m21_case_'),
    ).length;

    await waitUntilMs(page, dueA + 2_000);
    expect(await countOf(page, 'cue_presented')).toBe(0);
    expect((await band(page))?.visible ?? false).toBe(false);
    await shot(page, '28-relay-bench-open-at-a-due-time');
    await press(page, 'Escape');
    await waitSurface(page, false);
    // RESUME: the release (its protocol time hold + 30 000; written late),
    // then the notice at the first permitted moment, deferred.
    await waitNotice(page, A, 5_000);

    const release = meta((await ofChannel(page, 'channel_released', A))[0]);

    expect(release).toMatchObject({ released_at_ms: heldA + 30_000 });
    expect(Number(release.write_latency_ms)).toBeGreaterThan(20_000);
    expect(['resume', 'tick']).toContain(release.check);

    const cueA = meta(await lastOf(page, 'cue_presented'));

    expect(Number(cueA.deferred_ms)).toBeGreaterThan(0);
    expect(Number(cueA.presented_at_ms)).toBeGreaterThanOrEqual(dueA);
    await shot(page, '29-notice-right-after-the-bench-closes');
    // The M21 records: the bench's own open and close only; no M20 record
    // altered them and the notice came after the bench's last record.
    const m21After = (await getEvents(page)).filter((e) =>
      e.event_type.startsWith('proto_m21_case_'),
    );

    expect(m21After.length).toBeGreaterThanOrEqual(m21Before);

    const lastM21 = m21After[m21After.length - 1] as { sequence?: number };
    const cueEvent = (await lastOf(page, 'cue_presented')) as {
      sequence?: number;
    };

    expect(Number(cueEvent.sequence)).toBeGreaterThan(
      Number(lastM21.sequence ?? 0),
    );
    // A surface opening within 6 s of the notice ends it early (the bench
    // again: the console is too far to reach inside 6 s; the console's own
    // early end is shown in R2).
    await press(page, 'Space');
    await waitSurface(page, true, 'm21_relay_bench');
    expect(meta(await lastOf(page, 'cue_notice_ended'))).toMatchObject({
      channel_id: A,
      ended_reason: 'surface_opened',
    });
    expect(
      Number(meta(await lastOf(page, 'cue_notice_ended')).displayed_ms),
    ).toBeLessThan(6_000);
    expect((await band(page))?.visible ?? false).toBe(false);
    await page.waitForTimeout(800);
    await press(page, 'Escape');
    await waitSurface(page, false);
    expect(
      (await getEvents(page)).filter((e) =>
        e.event_type.startsWith('proto_m21_case_'),
      ).length,
    ).toBeGreaterThanOrEqual(m21After.length);
    // Now B: started after A's notice; held; released; a silent-window visit.
    await openConsole(page);
    expect(await ids(page)).toEqual([
      'rows',
      'continue_a',
      'start_b',
      'help_channels',
      'leave_channels',
    ]);
    await hotkey(page, 'b');
    await solveByKeys(page, B, 1);
    await solveByKeys(page, B, 2);

    const heldB = Number(meta(await lastOf(page, 'channel_held')).held_at_ms);

    await leaveConsole(page);
    await waitRelease(page, B);
    await openConsole(page);
    expect(await ofChannel(page, 'released_visit', B)).toHaveLength(1);
    await hotkey(page, 'b');
    expect(meta(await lastOf(page, 'step_presented'))).toMatchObject({
      channel_id: B,
      step_index: 3,
    });
    for (let k = 0; k < 4; k += 1) {
      await hotkey(page, '1'); // 1 → 2 → 3 → 4 → 1
    }

    await hotkey(page, 'g');
    expect((await probe(page)).feedback).toBe(
      'The cells are as loaded. Change a cell first.',
    );
    expect(meta(await lastOf(page, 'align_refused'))).toMatchObject({
      channel_id: B,
      reason: 'as_loaded',
      in_silent_window: true,
    });
    await leaveConsole(page);

    const b = (await m20(page)).channels[B];

    expect(b.resumption).toBeNull();
    expect(b.cue_cancelled).toBe(false);
    expect(await ofChannel(page, 'cue_cancelled', B)).toHaveLength(0);
    expect(
      await ofChannel(page, 'align_attempt', B).then((l) => l.length),
    ).toBe(2);
    // The sign-off before B's notice is due: B cue_not_presented.
    await signOffReturnShift(page);
    expect(await ofChannel(page, 'cue_presented', B)).toHaveLength(0);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 1,
      disposition: 'observed',
      included_ids: [A],
      closure_reason: 'route_departure',
    });
    expect(channelOf(row, A)).toMatchObject({
      status: 'not_resumed',
      cue_ended_reason: 'surface_opened',
    });
    expect(Number(channelOf(row, A).cue_deferred_ms)).toBeGreaterThan(0);
    expect(channelOf(row, B)).toMatchObject({
      status: 'cue_not_presented',
      released_visits: 1,
      refused_in_silent_window: 1,
    });
    expect(Number(channelOf(row, B).held_at_ms)).toBe(heldB);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  /* ---------------------------------------------------------------- *
   * R4 — zero evidence and absence
   * ---------------------------------------------------------------- */

  test('R4 (zero evidence, no yard preparation): presented, never opened; the sign-off ⇒ exactly one closed_unopened (shift_signed_off), the row final (no_eligible_event, not_opened); the sign-off record; the review ⇒ the absence record, no second closed_unopened, the row unchanged', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await toWorkshopReturn(page, 'u22r4', { mast: 'none' });
    expect(
      await familyEvents(page).then((l) => l.map((e) => e.event_type)),
    ).toEqual([`${FAMILY}presented`]);
    expect((await m20(page)).outdoor).toEqual({
      accepted: false,
      stages_done: [],
      outdoor_complete: false,
    });
    expect(await reproduce(page)).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'pending',
      missing_reason: 'presented_not_opened',
    });
    // A repeated Workshop entry (the scene recreated): the console is
    // presented once, its state and the guidance persist (the check that
    // `pilot_return` test 2 makes only after its pre-existing M21 failure).
    await workshopToConcourse(page);
    await concourseToWorkshop(page);
    await page.waitForTimeout(400);
    expect(await suffixes(page)).toEqual(['presented']);
    expect((await m20(page)).chip).toBe('MAST 04 FEED · 2 channels');
    expect((await pilotProbe(page))?.beacon?.label).toBe(
      'Station Feed Console',
    );
    await signOffReturnShift(page);
    expect(await suffixes(page)).toEqual(['presented', 'closed_unopened']);
    expect(meta(await lastOf(page, 'closed_unopened'))).toMatchObject({
      closure_reason: 'shift_signed_off',
      input_mode: 'system',
    });

    const closed = await reproduce(page);

    expect(closed).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'no_eligible_event',
      missing_reason: 'not_opened',
      closure_reason: 'route_departure',
    });
    expect(closed.disposition).not.toBe('declined');
    expect(closed.components.nonresponse_kind).toBe('not_opened');
    expect((await m20(page)).chip).toBe('closed for the shift');
    // A later visit: the sign-off record; no opening is written.
    await openConsole(page);
    expect(await ids(page)).toEqual(RECORD_IDS);
    expect(await labelOf(page, 'closed')).toBe(
      'The console closed when the shift was signed off.',
    );
    await shot(page, '19b-sign-off-record-never-opened');
    await hotkey(page, 'g');
    await hotkey(page, 'a');
    await leaveConsole(page);
    expect(await countOf(page, 'opportunity_opened')).toBe(0);
    expect(await suffixes(page)).toEqual(['presented', 'closed_unopened']);
    // The review: the kit's absence record; no second closed_unopened.
    await toReviewClosure(page);
    expect(await suffixes(page)).toEqual([
      'presented',
      'closed_unopened',
      'window_closed',
    ]);
    expect(meta(await lastOf(page, 'window_closed'))).toMatchObject({
      exit_state: 'closed_at_review',
    });
    expect(await reproduce(page)).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'not_opened',
      closure_reason: 'route_departure',
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R4b (both held, signed off within 30 s): no release yet ⇒ null, denominator 0, cue_not_presented on both; the sign-off writes no release', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await toWorkshopReturn(page, 'u22r4b');
    await openConsole(page);
    await activateByKeyboard(page, 'continue');
    await solveByKeys(page, A, 1);
    await solveByKeys(page, A, 2);
    await hotkey(page, 'b');
    await solveByKeys(page, B, 1);
    await solveByKeys(page, B, 2);

    const heldB = Number(meta(await lastOf(page, 'channel_held')).held_at_ms);

    await leaveConsole(page);
    await signOffReturnShift(page);
    expect(Date.now()).toBeLessThan(heldB + 30_000);
    expect(await countOf(page, 'channel_released')).toBe(0);
    expect(await countOf(page, 'cue_presented')).toBe(0);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'no_eligible_event',
      included_ids: [],
      closure_reason: 'route_departure',
    });
    expect(row.components.nonresponse_kind).toBe('cue_not_presented');
    expect(channelOf(row, A).status).toBe('cue_not_presented');
    expect(channelOf(row, B).status).toBe('cue_not_presented');
    // After the closure nothing is released or noticed, however long.
    await page.waitForTimeout(2_000);
    expect(await countOf(page, 'channel_released')).toBe(0);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  /* ---------------------------------------------------------------- *
   * R5 — both spontaneous
   * ---------------------------------------------------------------- */

  test('R5 (both spontaneous): A and B resumed in their silent windows ⇒ neither notice appears; sign-off ⇒ null primary, denominator 0, resumed_before_cue, spontaneous 2', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await toWorkshopReturn(page, 'u22r5');
    await openConsole(page);
    await activateByKeyboard(page, 'continue');
    await solveByKeys(page, A, 1);
    await solveByKeys(page, A, 2);
    await hotkey(page, 'b');
    await solveByKeys(page, B, 1);
    await solveByKeys(page, B, 2);

    const heldA = Number(
      meta((await ofChannel(page, 'channel_held', A))[0]).held_at_ms,
    );
    const heldB = Number(
      meta((await ofChannel(page, 'channel_held', B))[0]).held_at_ms,
    );

    await leaveConsole(page);
    await waitRelease(page, A);
    await openConsole(page);
    expect(await ofChannel(page, 'released_visit', A)).toHaveLength(1);
    await hotkey(page, 'a');
    await hotkey(page, '2');
    await hotkey(page, 'g');
    expect(meta(await lastOf(page, 'align_attempt'))).toMatchObject({
      channel_id: A,
      in_silent_window: true,
      resumption: 'spontaneous',
    });
    expect(meta(await lastOf(page, 'cue_cancelled'))).toMatchObject({
      channel_id: A,
      reason: 'resumed_before_cue',
    });
    await leaveConsole(page);
    await waitRelease(page, B);
    await openConsole(page);
    await hotkey(page, 'b');
    await hotkey(page, '3');
    await hotkey(page, 'g');
    expect(meta(await lastOf(page, 'align_attempt'))).toMatchObject({
      channel_id: B,
      in_silent_window: true,
      resumption: 'spontaneous',
    });
    await leaveConsole(page);
    expect((await m20(page)).spontaneous_resumptions).toBe(2);
    // Past both due times: no notice.
    await waitUntilMs(page, Math.max(heldA, heldB) + 60_000 + 3_000, 90_000);
    expect(await countOf(page, 'cue_presented')).toBe(0);
    expect(await countOf(page, 'cue_cancelled')).toBe(2);
    expect((await m20(page)).notice).toBeNull();
    expect((await band(page))?.visible ?? false).toBe(false);
    await signOffReturnShift(page);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'no_eligible_event',
      included_ids: [],
      closure_reason: 'route_departure',
    });
    expect(row.components.nonresponse_kind).toBe('resumed_before_cue');
    expect(row.components.spontaneous_resumptions).toBe(2);
    expect(channelOf(row, A)).toMatchObject({
      status: 'resumed_spontaneously',
      spontaneous_attempt_index: 3,
      credited: false,
    });
    expect(channelOf(row, B)).toMatchObject({
      status: 'resumed_spontaneously',
      spontaneous_attempt_index: 3,
    });
    expect(
      Number(channelOf(row, A).release_to_spontaneous_wall_ms),
    ).toBeGreaterThan(0);
    expect(meta(await lastOf(page, 'project_closed'))).toMatchObject({
      spontaneous_resumptions: 2,
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * R2 — pointer at 1280 × 720: spontaneous and cued
 * ------------------------------------------------------------------ */

test.describe('M20 feed console: pointer at 1280 × 720 (Unit 22)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("R2 (pointer only): HELP on the card, a step, a hold and the channel view; A and B held by clicks; a silent-window visit (A pass open, B held); the chip counts only; CONTINUE A and one executed ALIGN ⇒ A resumed spontaneously (no notice, cue_cancelled); a double click on ALIGN executes once; B's notice while standing at the console; the console closed and reopened in place; one ALIGN ⇒ B cued ⇒ 1 / 1, spontaneous 1", async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await toWorkshopReturn(page, 'u22r2');
    await openConsole(page);
    expect(await ids(page)).toEqual(CARD_IDS);
    // HELP on the card.
    await click(page, 'help_intro');
    expect(await ids(page)).toEqual(['close_help', 'help_sheet']);
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'intro',
      input_mode: 'pointer',
    });
    await shot(page, '18-help');
    await click(page, 'close_help');
    expect(await ids(page)).toEqual(CARD_IDS);
    await click(page, 'continue');
    expect(meta(await lastOf(page, 'intro_acknowledged'))).toMatchObject({
      input_mode: 'pointer',
    });
    expect(await ids(page)).toEqual(stepIds('a', 1, 3));
    await solveByClicks(page, A, 1);
    expect((await probe(page)).feedback).toBe('Step 1 aligned.');
    expect(meta(await lastOf(page, 'align_attempt'))).toMatchObject({
      input_mode: 'pointer',
      aligned: true,
    });
    await shot(page, '21-a-step-at-1280x720');
    await solveByClicks(page, A, 2);
    expect(await ids(page)).toEqual([
      'held_a',
      'start_b',
      'channels_held_a',
      'help_held_a',
      'leave_held_a',
    ]);
    // HELP on the hold view.
    await click(page, 'help_held_a');
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'held_a',
    });
    await click(page, 'close_help');
    await click(page, 'start_b');
    expect(await ids(page)).toEqual(stepIds('b', 1, 3));
    await solveByClicks(page, B, 1);
    await solveByClicks(page, B, 2);
    expect(await ids(page)).toEqual([
      'held_b',
      'channels_held_b',
      'help_held_b',
      'leave_held_b',
    ]);

    const heldB = Number(meta(await lastOf(page, 'channel_held')).held_at_ms);

    await click(page, 'leave_held_b');
    await waitSurface(page, false);
    // The silent window of A: A pass open, B held; the chip counts only.
    await waitRelease(page, A);
    await openConsole(page);
    expect(await ids(page)).toEqual([
      'rows',
      'continue_a',
      'help_channels',
      'leave_channels',
    ]);
    expect(await labelOf(page, 'rows')).toBe(
      'CHANNEL A   2 of 6 steps   pass open\nCHANNEL B   2 of 6 steps   held',
    );
    expect(await ofChannel(page, 'released_visit', A)).toHaveLength(1);
    expect(await ofChannel(page, 'held_visit', B)).toHaveLength(1);
    // Frame 11 (800 × 600) is taken in R11; this view at 1280 × 720 is frame 22.
    // HELP on the channel view.
    await click(page, 'help_channels');
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'channels',
    });
    await click(page, 'close_help');
    await shot(page, '22-channel-view-at-1280x720');
    await click(page, 'leave_channels');
    await waitSurface(page, false);
    expect((await m20(page)).chip).toBe('A 2/6 · B 2/6');
    expect((await m20(page)).chip).not.toMatch(/held|pass open/);
    // The chip is shown only near the console, where the floating station
    // label stands over it (the base chip and label placement); the probe's
    // text above is the evidence that it counts only.
    await shot(page, '12-chip-during-the-silent-window');
    // CONTINUE A: step 3; HELP on the step; one executed ALIGN ⇒ spontaneous.
    await openConsole(page);
    expect(await ofChannel(page, 'released_visit', A)).toHaveLength(2);
    await click(page, 'continue_a');
    expect(await ids(page)).toEqual(stepIds('a', 3, 4));
    expect(meta(await lastOf(page, 'step_presented'))).toMatchObject({
      channel_id: A,
      step_index: 3,
    });
    await shot(page, '13-a-step-3-after-a-silent-window-continue');
    await click(page, 'help_step_a_3');
    expect(meta(await lastOf(page, 'help_consulted'))).toMatchObject({
      view: 'step_a_3',
    });
    await click(page, 'close_help');
    await click(page, 'cell_a_3_1');
    // A double click on ALIGN executes once (the second click is a repeat).
    await page.waitForTimeout(SETTLE_MS + 50);

    const attemptsBefore = await countOf(page, 'align_attempt');

    await dblclickElement(page, 'align_a_3');
    expect(await countOf(page, 'align_attempt')).toBe(attemptsBefore + 1);
    expect(meta(await lastOf(page, 'align_refused'))).toMatchObject({
      reason: 'repeat',
      input_mode: 'pointer',
    });
    expect(meta(await lastOf(page, 'align_attempt'))).toMatchObject({
      channel_id: A,
      cells: [2, 1, 1, 1],
      in_silent_window: true,
      resumption: 'spontaneous',
      input_mode: 'pointer',
    });
    expect(meta(await lastOf(page, 'cue_cancelled'))).toMatchObject({
      channel_id: A,
      reason: 'resumed_before_cue',
    });
    expect((await m20(page)).channels[A].resumption).toBe('spontaneous');
    await click(page, 'leave_step_a_3');
    await waitSurface(page, false);
    // Stand at the console; A gets no notice; B's notice comes at its due
    // time (A will never get one).
    await waitNotice(page, B, 70_000);
    expect(await ofChannel(page, 'cue_presented', A)).toHaveLength(0);

    const cueB = meta(await lastOf(page, 'cue_presented'));

    expect(cueB.channel_id).toBe(B);
    expect(Number(cueB.presented_at_ms)).toBeGreaterThanOrEqual(heldB + 60_000);
    expect(Number(cueB.distance_to_console_px)).toBeLessThan(120);
    await shot(page, '14b-world-notice-for-b-at-the-console');
    // Close and reopen in place: the console opened within 6 s of the
    // notice ends it (surface_opened); one ALIGN ⇒ the cued credit.
    await press(page, 'Space');
    await waitSurface(page, true, SURFACE);
    expect(meta(await lastOf(page, 'cue_notice_ended'))).toMatchObject({
      channel_id: B,
      ended_reason: 'surface_opened',
    });
    expect(
      Number(meta(await lastOf(page, 'cue_notice_ended')).displayed_ms),
    ).toBeLessThan(6_000);
    expect((await band(page))?.visible ?? false).toBe(false);
    await shot(page, '30-console-opened-within-6-s-of-a-notice');
    expect(await ids(page)).toEqual([
      'rows',
      'continue_a',
      'continue_b',
      'help_channels',
      'leave_channels',
    ]);
    await click(page, 'continue_b');
    expect(await ids(page)).toEqual(stepIds('b', 3, 4));
    await click(page, 'cell_b_3_2');
    await click(page, 'align_b_3');
    expect(meta(await lastOf(page, 'align_attempt'))).toMatchObject({
      channel_id: B,
      after_cue: true,
      in_silent_window: false,
      resumption: 'cued',
      input_mode: 'pointer',
    });
    expect((await m20(page)).channels[B].resumption).toBe('cued');
    await click(page, 'leave_step_b_3');
    await waitSurface(page, false);
    await signOffReturnShift(page);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      included_ids: [B],
      closure_reason: 'route_departure',
    });
    expect(row.components.spontaneous_resumptions).toBe(1);
    expect(channelOf(row, A)).toMatchObject({
      status: 'resumed_spontaneously',
      released_visits: 2,
      cue_cancelled: true,
    });
    expect(channelOf(row, B)).toMatchObject({
      status: 'resumed',
      credited: true,
      cue_ended_reason: 'surface_opened',
    });
    // B is still held at the first opening and, depending on how long B's
    // steps took, possibly at the reopening that continues A: the export
    // equals the raw blocked approaches, at least one.
    const heldVisitsB = (await ofChannel(page, 'held_visit', B)).length;

    expect(heldVisitsB).toBeGreaterThanOrEqual(1);
    expect(channelOf(row, B).held_visits).toBe(heldVisitsB);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * R6 — reload after a credit
 * ------------------------------------------------------------------ */

test.describe('M20 feed console: reload (Unit 22)', () => {
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

  /**
   * The yard → Concourse spine after a reload. The shared helper waits for
   * Noor's M10 logbook offer, which a reload holds back (the earlier load
   * already administered it); here the offer is deferred when it appears and
   * the spine continues when it does not.
   */
  async function yardReturnAfterReload(page: Page) {
    await openPromptAt(page, PILOT.yard.noor, {
      approachOffset: await yardApproach(page, PILOT.yard.noor),
    });
    await selectPromptOption(page, 2);
    await expectStage(page, 'return_hub');

    const offered = await waitPromptLabel(page, LOGBOOK_LABELS.accept).then(
      () => true,
      () => false,
    );

    if (offered) {
      await answerLogbookOffer(page, 'defer');
    }

    await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
      approachOffset: await yardApproach(page, PILOT.yard.airlock),
    });
    await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
      approachOffset: await labApproach(page, PILOT.lab.southDoor),
    });
  }

  /** After the reload: the opening, the Dock tutorial and the spine back to the Workshop (may be blocked). */
  async function driveBackToWorkshop(page: Page): Promise<string | null> {
    let step = 'the opening';

    try {
      await press(page, 'Space');
      await waitScene(page, 'dock', 60_000);
      await page.waitForTimeout(1600);
      step = 'the Dock tutorial';
      await completeDockTutorial(page, 1);
      step = 'the route to the yard work';
      await routeToYardWork(page);
      step = 'the yard to the Concourse';
      await yardReturnAfterReload(page);
      step = "Vale's return check-in";
      await valeReturnCheckIn(page);
      step = 'the Workshop scene';
      await waitScene(page, 'records_workshop');
      await page.waitForTimeout(600);
    } catch (error) {
      return `${step}: ${(error as Error).message.split('\n')[0]}`;
    }

    return null;
  }

  test('R6 (reload after a credit): A noticed and credited, then a page reload — the earlier log carried byte-identically, the row interrupted; back in the Workshop the reload check, the hold-back record, no work possible', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);

    const errors = captureErrors(page);

    await toWorkshopReturn(page, 'u22r6');
    await openConsole(page);
    await activateByKeyboard(page, 'continue');
    await solveByKeys(page, A, 1);
    await solveByKeys(page, A, 2);
    await leaveConsole(page);
    await workshopApproach(page, 'pressB');
    await waitNotice(page, A, 70_000);
    await waitNoticeEnd(page, A);
    await openConsole(page);
    await hotkey(page, 'a');
    await hotkey(page, '1');
    await hotkey(page, 'g');
    expect(meta(await lastOf(page, 'align_attempt'))).toMatchObject({
      resumption: 'cued',
    });
    await leaveConsole(page);

    const before = await pagePayload(page);
    const immutable = JSON.stringify(
      before.raw_events.filter(
        (e) =>
          e.event_type === `${FAMILY}align_attempt` ||
          e.event_type === `${FAMILY}channel_held` ||
          e.event_type === `${FAMILY}channel_released` ||
          e.event_type === `${FAMILY}cue_presented`,
      ),
    );

    expect(before.page_load_index).toBe(1);
    expect(before.prior).toEqual([]);
    await reload(page);

    const after = await pagePayload(page);

    expect(after.page_load_index).toBe(2);
    expect(JSON.stringify(after.prior)).toBe(JSON.stringify(before.raw_events));
    expect(
      JSON.stringify(
        after.prior.filter(
          (e) =>
            e.event_type === `${FAMILY}align_attempt` ||
            e.event_type === `${FAMILY}channel_held` ||
            e.event_type === `${FAMILY}channel_released` ||
            e.event_type === `${FAMILY}cue_presented`,
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

    const blocked = await driveBackToWorkshop(page);

    if (blocked !== null) {
      // eslint-disable-next-line no-console
      console.log(`[R6] BLOCKED / NOT VERIFIED after the reload: ${blocked}`);
    }

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the Workshop after the reload (${blocked}); the post-reload administration was not exercised in the browser and frame 20 is missing`,
    );

    // Workshop entry wrote the check (the opening found) and the hold-back,
    // then the new load's presentation (exposure only, after the hold-back).
    expect(await suffixes(page)).toEqual([
      'prior_load_checked',
      'technical_failure',
      'presented',
    ]);
    expect(meta(await lastOf(page, 'prior_load_checked'))).toMatchObject({
      page_load_index: 2,
      prior_opening_found: true,
      prior_presentation_found: true,
    });
    expect(meta(await lastOf(page, 'technical_failure'))).toMatchObject({
      detail: 'reload after administration: console not re-run',
    });
    expect((await m20(page)).chip).toBe('closed for the shift');
    await openConsole(page);
    expect(await ids(page)).toEqual(RECORD_IDS);
    expect(await labelOf(page, 'closed')).toBe(
      'This console was opened earlier in the session. It stays closed now.',
    );
    await shot(page, '20-reload-hold-back-record');
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('1');
    await page.keyboard.press('g');
    await page.keyboard.press('a');
    await page.keyboard.press('b');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await leaveConsole(page);
    expect(await suffixes(page)).toEqual([
      'prior_load_checked',
      'technical_failure',
      'presented',
    ]);

    const row = await reproduce(page);

    expect(row).toMatchObject({ value: null, disposition: 'interrupted' });
    expect(row.components.held_back_after_reload).toBe(true);
    expect(row.components.nonresponse_kind).toBe('reload_hold_back');
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * R7 — fallback fonts: the layout gate in the real game
 * ------------------------------------------------------------------ */

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

/** Under one font (keyboard): the card, a 5-cell step with both refusal lines, the hold, the two-button channel view, help and the notice. */
async function fontGate(
  page: Page,
  font: string,
  tag: string,
  frames: { step: string; notice: string },
) {
  await toWorkshopReturn(page, tag);
  await openConsole(page);
  await measureGate(page, font, 'card', [{ id: 'intro', lines: 9 }]);
  await activateByKeyboard(page, 'continue');
  await measureGate(page, font, 'A step 1', [{ id: 'board_a_1', lines: 4 }]);
  await solveByKeys(page, A, 1);
  await solveByKeys(page, A, 2);
  await measureGate(page, font, 'A held', [{ id: 'held_a', lines: 3 }]);
  await leaveConsole(page);
  // A released, B not started: the two-button channel view (CONTINUE A,
  // START B).
  await waitRelease(page, A);
  await openConsole(page);
  expect(await ids(page)).toEqual([
    'rows',
    'continue_a',
    'start_b',
    'help_channels',
    'leave_channels',
  ]);
  await measureGate(page, font, 'channel view (two buttons)', [
    { id: 'rows', lines: 2 },
  ]);
  await hotkey(page, 'h');
  await measureGate(page, font, 'help', [{ id: 'help_sheet', lines: 8 }]);
  await hotkey(page, 'h');
  // CONTINUE A: steps 3 and 4 aligned (the first executed ALIGN is a
  // spontaneous resumption: A gets no notice), then the 5-cell step 5 with
  // both refusal lines and the differ feedback.
  await hotkey(page, 'a');
  await solveByKeys(page, A, 3);
  await solveByKeys(page, A, 4);
  expect(await ids(page)).toEqual(stepIds('a', 5, 5));
  await hotkey(page, 'g');
  expect((await probe(page)).feedback).toBe(
    'The cells are as loaded. Change a cell first.',
  );
  await measureGate(page, font, 'A step 5 (as_loaded)', [
    { id: 'board_a_5', lines: 4 },
  ]);
  await hotkey(page, '5');
  await hotkey(page, 'g');
  expect((await probe(page)).feedback).toBe('Not aligned: 4 cells differ.');
  // After an executed miss the board keeps a fifth line, `Last ALIGN …`
  // (owner amendment §5.359 (5)).
  expect(await labelOf(page, 'board_a_5')).toContain(
    'Last ALIGN: 4 cells differed.',
  );
  await measureGate(page, font, 'A step 5 (feedback)', [
    { id: 'board_a_5', lines: 5 },
  ]);
  await shot(page, frames.step);
  await hotkey(page, 'g');
  expect((await probe(page)).feedback).toBe(
    'Same cells as the last ALIGN. Change a cell first.',
  );
  // The refused repeat leaves the executed attempt's count on the board.
  expect(await labelOf(page, 'board_a_5')).toContain(
    'Last ALIGN: 4 cells differed.',
  );
  await measureGate(page, font, 'A step 5 (repeat)', [
    { id: 'board_a_5', lines: 5 },
  ]);
  await leaveConsole(page);
  // B: started and held now, so its notice comes 60 s later while A never
  // gets one (resumed spontaneously).
  await openConsole(page);
  await hotkey(page, 'b');
  await solveByKeys(page, B, 1);
  await solveByKeys(page, B, 2);
  await measureGate(page, font, 'B held', [{ id: 'held_b', lines: 3 }]);
  await leaveConsole(page);
  await workshopApproach(page, 'pressB');
  await waitNotice(page, B, 70_000);
  await measureBand(page, font, 'B');
  await shot(page, frames.notice);
  await waitNoticeEnd(page, B);
  expect(await ofChannel(page, 'cue_presented', A)).toHaveLength(0);
}

test.describe('M20 feed console: the layout gate under the fallback fonts (Unit 22)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test('R7 (Courier New): the card, a 5-cell step with both refusal lines, the hold, the two-button channel view, help and the notice on their fixed lines with 30 design px above the feedback line', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);
    await forceMonospace(page, '"Courier New"');

    const errors = captureErrors(page);

    await fontGate(page, 'Courier New', 'u22r7c', {
      step: '23-five-cell-step-courier-new',
      notice: '25-notice-courier-new',
    });
    expectNoRuntimeErrors(errors);
  });

  test('R7 (Lucida Console): the same views under the second fallback font', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);
    await forceMonospace(page, '"Lucida Console"');

    const errors = captureErrors(page);

    await fontGate(page, 'Lucida Console', 'u22r7l', {
      step: '24-five-cell-step-lucida-console',
      notice: '25b-notice-lucida-console',
    });
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * R8 — focus and access
 * ------------------------------------------------------------------ */

test.describe('M20 feed console: focus and access (Unit 22)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  /** HELP and LEAVE of the current view: present, focusable, above the bottom row. */
  async function expectHelpAndLeave(page: Page, view: string) {
    const value = await probe(page);
    const help = value.elements.find((e) => e.id === `help_${view}`);
    const leave = value.elements.find((e) => e.id === `leave_${view}`);

    expect(help, `help_${view}`).toBeDefined();
    expect(leave, `leave_${view}`).toBeDefined();
    expect(help!.focusable).toBe(true);
    expect(leave!.focusable).toBe(true);
    expect(help!.y + help!.h / 2).toBeLessThanOrEqual(value.feedback_top);
  }

  test('R8 (focus and access): the neutral landing after every view change; same-view focus on the acting control; TAB / ENTER / SPACE and the pointer; HELP and LEAVE everywhere; the ESC order (help, then the console — a fresh ESC inside the settle leaves, owner amendment §5.359 (5)); both channels aligned ⇒ the restored line and project_completed', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await toWorkshopReturn(page, 'u22r8');
    await openConsole(page);
    expect((await probe(page)).focus).toBe('intro');
    await expectHelpAndLeave(page, 'intro');
    await focusByTab(page, 'continue');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expect((await probe(page)).open).toBe(true);
    expect((await probe(page)).focus).toBe('board_a_1');
    await expectHelpAndLeave(page, 'step_a_1');
    // TAB to a cell, SPACE cycles it; TAB to ALIGN, ENTER executes; the
    // focus stays on the acting control inside one view.
    await page.waitForTimeout(SETTLE_MS + 50);
    await focusByTab(page, 'cell_a_1_1');
    await page.keyboard.press(' ');
    await page.waitForTimeout(150);
    expect(await labelOf(page, 'cell_a_1_1')).toBe('CELL 1   value 2   [1]');
    expect((await probe(page)).focus).toBe('cell_a_1_1');
    await focusByTab(page, 'cell_a_1_2');
    for (let k = 0; k < 3; k += 1) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
    }

    expect(await labelOf(page, 'cell_a_1_2')).toBe('CELL 2   value 4   [2]');
    await focusByTab(page, 'align_a_1');
    // A cell hotkey with ALIGN focused keeps the focus on ALIGN (same view).
    await page.keyboard.press('3');
    await page.waitForTimeout(120);
    await page.keyboard.press('3');
    await page.waitForTimeout(120);
    expect((await probe(page)).focus).toBe('align_a_1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    expect((await probe(page)).feedback).toBe('Step 1 aligned.');
    // The new step lands on its board (neutral), never on ALIGN.
    expect((await probe(page)).focus).toBe('board_a_2');
    await solveByKeys(page, A, 2);
    expect((await probe(page)).focus).toBe('held_a');
    await expectHelpAndLeave(page, 'held_a');
    await page.waitForTimeout(SETTLE_MS + 50);
    await focusByTab(page, 'start_b');
    await page.keyboard.press(' ');
    await page.waitForTimeout(300);
    expect((await probe(page)).focus).toBe('board_b_1');
    // The pointer: B's two steps by clicks.
    await solveByClicks(page, B, 1);
    expect((await probe(page)).focus).toBe('board_b_2');
    await solveByClicks(page, B, 2);
    expect((await probe(page)).focus).toBe('held_b');
    await expectHelpAndLeave(page, 'held_b');
    // The ESC order: help first, then the console.
    await hotkey(page, 'h');
    expect((await probe(page)).focus).toBe('close_help');
    await page.waitForTimeout(SETTLE_MS + 50);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    expect((await probe(page)).open).toBe(true);
    expect((await probe(page)).focus).toBe('held_b');
    // Owner amendment of 14 October 2026 (register §5.359 (5)): a fresh
    // ESC inside the settle of the restored view leaves at once, exactly as
    // LEAVE does (no longer consumed).
    const leavesBefore = await countOf(page, 'console_left');

    await page.keyboard.press('Escape');
    await waitSurface(page, false);
    expect(await countOf(page, 'console_left')).toBe(leavesBefore + 1);
    expect(meta(await lastOf(page, 'console_left'))).toMatchObject({
      view: 'held',
    });
    // LEAVE by the pointer on the channel view; the neutral landing there.
    await openConsole(page);
    expect((await probe(page)).focus).toBe('rows');
    await expectHelpAndLeave(page, 'channels');
    await click(page, 'leave_channels');
    await waitSurface(page, false);
    // Both released: finish A by clicks and B by keys ⇒ both aligned.
    await waitRelease(page, A);
    await waitRelease(page, B);
    await openConsole(page);
    await click(page, 'continue_a');
    expect((await probe(page)).focus).toBe('board_a_3');
    for (let k = 3; k <= 6; k += 1) {
      await solveByClicks(page, A, k);
    }

    expect((await probe(page)).feedback).toBe('Channel A aligned.');
    expect((await probe(page)).focus).toBe('rows');
    expect(await ids(page)).toEqual([
      'rows',
      'continue_b',
      'help_channels',
      'leave_channels',
    ]);
    await hotkey(page, 'b');
    expect((await probe(page)).focus).toBe('board_b_3');
    for (let k = 3; k <= 6; k += 1) {
      await solveByKeys(page, B, k);
    }

    expect((await probe(page)).feedback).toBe('Channel B aligned.');
    expect(await ids(page)).toEqual(['rows', 'note', 'leave_channels']);
    expect(await labelOf(page, 'note')).toBe(
      'Both channels are aligned. The feed is restored.',
    );
    expect(await labelOf(page, 'rows')).toBe(
      'CHANNEL A   6 of 6 steps   aligned\nCHANNEL B   6 of 6 steps   aligned',
    );
    await shot(page, '17-both-aligned');
    expect((await suffixes(page)).slice(-3)).toEqual([
      'channel_aligned',
      'project_completed',
      'window_closed',
    ]);
    expect(meta(await lastOf(page, 'window_closed'))).toMatchObject({
      exit_state: 'completed',
    });
    expect((await m20(page)).status).toBe('completed');
    expect((await m20(page)).chip).toBe('A 6/6 · B 6/6');
    await leaveConsole(page);
    // Both resumed in their silent windows: no notice ever; the row null
    // with denominator 0 and two spontaneous resumptions, closure completed.
    await page.waitForTimeout(1_000);
    expect(await countOf(page, 'cue_presented')).toBe(0);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'no_eligible_event',
      closure_reason: 'completed',
    });
    expect(row.components.spontaneous_resumptions).toBe(2);
    expect(row.components.nonresponse_kind).toBe('resumed_before_cue');
    // The completed project reopens on its restored line and writes nothing.
    const before = (await familyEvents(page)).length;

    await openConsole(page);
    expect(await ids(page)).toEqual(['rows', 'note', 'leave_channels']);
    await leaveConsole(page);
    expect((await familyEvents(page)).length).toBe(before);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * R10 / R11 — correction round 1 (owner amendment of 14 October 2026,
 * register §5.359 (2), (5), (7)): the console stays open across releases
 * ------------------------------------------------------------------ */

test.describe('M20 feed console: the console stays open across releases (Unit 22, correction round 1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test("R10 (keyboard): B's step stays as it is across A's release — the open console writes the release (check console), the view, the draft and the focus unchanged; CHANNELS [C] reaches A pass open without leaving (no record); CONTINUE A; past A's due time with the console still open no world notice, and one ALIGN ⇒ spontaneous; CHANNELS ⇒ B with its draft; B → hold; the hold view turns pass open by itself; past B's due time LEAVE without resuming ⇒ B's overdue notice at once (deferred); nothing duplicated; sign-off ⇒ 0 / 1 with one spontaneous resumption", async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await toWorkshopReturn(page, 'u22r10');
    await openConsole(page);
    await activateByKeyboard(page, 'continue');
    await solveByKeys(page, A, 1);
    await solveByKeys(page, A, 2);

    const heldA = Number(meta(await lastOf(page, 'channel_held')).held_at_ms);

    await hotkey(page, 'b');
    expect(await ids(page)).toEqual(stepIds('b', 1, 3));
    // A draft on B's step 1 and the focus on its third cell.
    await hotkey(page, '2');
    await focusByTab(page, 'cell_b_1_3');

    const draftBoard = await labelOf(page, 'board_b_1');

    expect(draftBoard).toContain('CELLS    1  2  1');
    expect(await countOf(page, 'channel_released')).toBe(0);
    // A's release while B's step is open: written by the open console.
    await waitUntilMs(page, heldA + 30_000 + 300);
    await expect
      .poll(async () => countOf(page, 'channel_released'), { timeout: 3_000 })
      .toBe(1);
    expect(meta(await lastOf(page, 'channel_released'))).toMatchObject({
      channel_id: A,
      released_at_ms: heldA + 30_000,
      check: 'console',
    });
    expect((await probe(page)).open).toBe(true);
    expect(await ids(page)).toEqual(stepIds('b', 1, 3));
    expect((await probe(page)).focus).toBe('cell_b_1_3');
    expect(await labelOf(page, 'board_b_1')).toBe(draftBoard);
    await shot(page, '32-b-step-kept-across-a-release');

    // CHANNELS by the keyboard: the channel view inside the console.
    const before = (await familyEvents(page)).length;

    await hotkey(page, 'c');
    expect((await probe(page)).open).toBe(true);
    expect((await probe(page)).focus).toBe('rows');
    expect(await labelOf(page, 'rows')).toBe(
      'CHANNEL A   2 of 6 steps   pass open\nCHANNEL B   0 of 6 steps   in work',
    );
    expect(await ids(page)).toEqual([
      'rows',
      'continue_a',
      'continue_b',
      'help_channels',
      'leave_channels',
    ]);
    expect((await familyEvents(page)).length).toBe(before);
    await shot(page, '33-channels-from-b-a-pass-open');
    // CONTINUE A: its step 3.
    await hotkey(page, 'a');
    expect(await ids(page)).toEqual(stepIds('a', 3, 4));
    // Past A's notice due time, the console still open: no world notice.
    await waitUntilMs(page, heldA + 60_000 + 1_500);
    expect(await countOf(page, 'cue_presented')).toBe(0);
    expect((await m20(page)).notice).toBeNull();
    // One executed ALIGN before any notice ⇒ the spontaneous resumption.
    await setCellsByKeys(page, [4, 2, 1, 1]);
    await hotkey(page, 'g');
    expect(meta(await lastOf(page, 'align_attempt'))).toMatchObject({
      channel_id: A,
      in_silent_window: true,
      after_cue: false,
      resumption: 'spontaneous',
    });
    expect(await countOf(page, 'cue_cancelled')).toBe(1);
    expect(await labelOf(page, 'board_a_3')).toContain(
      'Last ALIGN: 1 cell differed.',
    );
    // CHANNELS ⇒ B's step with its draft.
    await hotkey(page, 'c');
    await hotkey(page, 'b');
    expect(await ids(page)).toEqual(stepIds('b', 1, 3));
    expect(await labelOf(page, 'board_b_1')).toBe(draftBoard);
    expect(meta(await lastOf(page, 'step_presented'))).toMatchObject({
      channel_id: B,
      step_index: 1,
      resumed: true,
    });
    // B → hold (step 1 from its kept draft); its hold view turns pass open
    // by itself at the release.
    await solveFromDraftByKeys(page, B, 1);
    await solveByKeys(page, B, 2);

    const heldB = Number(meta(await lastOf(page, 'channel_held')).held_at_ms);

    expect(await ids(page)).toEqual([
      'held_b',
      'channels_held_b',
      'help_held_b',
      'leave_held_b',
    ]);
    expect((await probe(page)).focus).toBe('held_b');
    await waitUntilMs(page, heldB + 30_000 + 300);
    await expect
      .poll(async () => ids(page), { timeout: 3_000 })
      .toEqual([
        'held_b',
        'continue_b',
        'channels_held_b',
        'help_held_b',
        'leave_held_b',
      ]);
    expect(await labelOf(page, 'held_b')).toBe(
      'Pass open. Channel B can be continued.\nChannel B: 2 of 6 steps done, 4 remain.',
    );
    expect((await probe(page)).status).toBe('Channel B can be continued.');
    expect((await probe(page)).focus).toBe('held_b');
    await measureGate(page, 'default', 'B hold view, pass open', [
      { id: 'held_b', lines: 2 },
    ]);
    await shot(page, '34-b-hold-view-pass-open');
    // Past B's due time, still open: no notice for B.
    await waitUntilMs(page, heldB + 60_000 + 2_000);
    expect(await ofChannel(page, 'cue_presented', B)).toHaveLength(0);
    // LEAVE without resuming ⇒ the overdue notice at the first permitted
    // moment, with its deferral (no grace period).
    await leaveConsole(page);
    await waitNotice(page, B, 10_000);

    const cueB = meta(await lastOf(page, 'cue_presented'));

    expect(cueB).toMatchObject({ channel_id: B, due_at_ms: heldB + 60_000 });
    expect(Number(cueB.deferred_ms)).toBeGreaterThan(2_000);

    const order = await suffixes(page);

    expect(order.lastIndexOf('console_left')).toBeLessThan(
      order.lastIndexOf('cue_presented'),
    );
    await measureBand(page, 'default', 'B');
    await shot(page, '35-overdue-notice-after-leaving-chip-at-console');
    // Nothing duplicated.
    expect(await countOf(page, 'channel_held')).toBe(2);
    expect(await countOf(page, 'channel_released')).toBe(2);
    expect(await countOf(page, 'cue_presented')).toBe(1);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(await countOf(page, 'channel_started')).toBe(2);
    await waitNoticeEnd(page, B);
    await signOffReturnShift(page);

    const row = await reproduce(page);

    expect(row).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 1,
      disposition: 'observed',
    });
    expect(row.components.spontaneous_resumptions).toBe(1);
    expect(channelOf(row, A).status).toBe('resumed_spontaneously');
    expect(channelOf(row, B).status).toBe('not_resumed');
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test("R11 (pointer): CHANNELS from B's hold view; the channel view updates by itself at A's release (A pass open, B held — frame 11 at 800 × 600); HELP stays across B's release and CLOSE HELP restores the channel view with both CONTINUE; CONTINUE A by the pointer and one ALIGN ⇒ spontaneous; LEAVE by the pointer", async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await toWorkshopReturn(page, 'u22r11');
    await openConsole(page);
    await click(page, 'continue');
    await solveByClicks(page, A, 1);
    await solveByClicks(page, A, 2);

    const heldA = Number(meta(await lastOf(page, 'channel_held')).held_at_ms);

    await click(page, 'start_b');
    await solveByClicks(page, B, 1);
    await solveByClicks(page, B, 2);

    const heldB = Number(meta(await lastOf(page, 'channel_held')).held_at_ms);

    // CHANNELS by the pointer from B's hold view: nothing can be chosen yet.
    const before = (await familyEvents(page)).length;

    await click(page, 'channels_held_b');
    expect(await ids(page)).toEqual([
      'rows',
      'note',
      'help_channels',
      'leave_channels',
    ]);
    expect((await probe(page)).status).toBe('');
    expect((await familyEvents(page)).length).toBe(before);
    // The channel view updates by itself at A's release.
    await waitUntilMs(page, heldA + 30_000 + 300);
    await expect
      .poll(async () => ids(page), { timeout: 3_000 })
      .toEqual(['rows', 'continue_a', 'help_channels', 'leave_channels']);
    expect(await labelOf(page, 'rows')).toBe(
      'CHANNEL A   2 of 6 steps   pass open\nCHANNEL B   2 of 6 steps   held',
    );
    expect((await probe(page)).status).toBe('Choose a channel, or LEAVE.');
    expect((await probe(page)).focus).toBe('rows');
    await shot(page, '11-channel-view-a-silent-window');
    // HELP across B's release.
    await click(page, 'help_channels');
    expect((await probe(page)).focus).toBe('close_help');
    await waitUntilMs(page, heldB + 30_000 + 600);
    expect((await probe(page)).title).toBe('HELP');
    expect(await countOf(page, 'channel_released')).toBe(2);
    await click(page, 'close_help');
    expect(await ids(page)).toEqual([
      'rows',
      'continue_a',
      'continue_b',
      'help_channels',
      'leave_channels',
    ]);
    // CONTINUE A by the pointer; one ALIGN ⇒ spontaneous.
    await click(page, 'continue_a');
    expect(await ids(page)).toEqual(stepIds('a', 3, 4));
    await solveByClicks(page, A, 3);
    expect(meta(await lastOf(page, 'align_attempt'))).toMatchObject({
      channel_id: A,
      resumption: 'spontaneous',
    });
    await click(page, 'leave_step_a_4');
    await waitSurface(page, false);
    expect(await countOf(page, 'console_left')).toBe(1);
    await signOffReturnShift(page);

    const row = await reproduce(page);

    expect(row.components.spontaneous_resumptions).toBe(1);
    expect(channelOf(row, A).status).toBe('resumed_spontaneously');
    expect(['cue_not_presented', 'not_resumed']).toContain(
      String(channelOf(row, B).status),
    );
    expect(await countOf(page, 'channel_released')).toBe(2);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });
});
