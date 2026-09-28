/**
 * Station 080 M03 / M04 — the U14-C corrections on the participant route
 * (browser, real input from the Dock).
 *
 * One session that reaches the Records Workshop and does NOT take the work
 * orders first (direct access):
 *
 * - Label Press A opened before any order named it: the presentation is
 *   written once, by the press and before its panel; the press is loaded
 *   and run by POINTER; TAB / SHIFT+TAB move between the trays, with and
 *   without a tool lifted; the panel is captured at 800 × 600.
 * - The Sample Cutter used before the orders list the coupons: the line
 *   above the avatar names what a press will act on, and the press acts on
 *   exactly that — the cutter, a piece, the bin, a station, a bundle; with
 *   the hands full the press says so; a station that is only approached
 *   closes nothing; a station that is opened closes the job with the
 *   carried piece counted; a later disposal leaves the record as it was.
 * - The work orders taken last: the listing never rewrites the
 *   presentation, and a missing listing never invalidated the cut.
 *
 * Both primaries are reproduced offline from the raw families through the
 * read-only extractor. Press B and the ordinary order of the route stay
 * with `m03_m04_route.spec.ts`.
 *
 * `U14C_ALIAS=1` boots the developer alias of the Workshop instead of
 * walking from the Dock (driver convenience for a local repeat; the
 * recorded evidence is the run from the Dock).
 */
import { expect, type Page, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { M03_SPEC, M03_TOOLS } from '../src/pilot/windows/m03RestoreModel';
import { M04_PIECES } from '../src/pilot/windows/m04CuttingModel';
import { WORKSHOP_SITES, WORKSHOP_STATIONS } from '../src/pilot/zoneSites';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  clickPhysicalContainer,
  clickPhysicalObject,
  designToPage,
  driveAxisTo,
  getEvents,
  physicalProbe,
  press,
  selectPromptOption,
} from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  bootPilotScene,
  concourseToWorkshop,
  dockToConcourse,
  openPromptAt,
  PILOT,
  valeHandover,
  walkTo,
  workshopVia,
} from './pilotHelpers';
import { lastFeedback } from './returnHelpers';

interface ProbeSlot {
  container_id: string;
  slot_index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  definition_id: string | null;
}

interface UiProbe {
  open: boolean;
  mode: string;
  focus: { container_id: string; slot_index: number } | null;
  held: { definition_id: string; quantity: number } | null;
  feedback: string | null;
  m03t?: {
    occasion: string;
    phase: string;
    cycles: number;
    instruction: string;
    title: string;
    help: string | null;
  } | null;
  slots: ProbeSlot[];
  buttons: { id: string; x: number; y: number; w: number; h: number }[];
}

const CONTEXT = { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false };
const M03_FAMILY = 'proto_m03tools_';
const M04_FAMILY = 'proto_m04_cutting_';
const [BRUSH] = M03_TOOLS.map((tool) => tool.definitionId);
const SHOTS = 'test-results/u14c';
/** Words neither item may show a participant. */
const NO_CLEANUP_CUE =
  /tidy|tidi|neat|clean|put away|put back|restore|mess|throw|bin it|should|please/i;
const PIECE_LINE = /^E \/ Space — Take (coupon offcut|swarf tray|blade wrap)$/;
const CUTTER_LINE = 'E / Space — Use Sample Cutter';
const BIN_LINE = 'E / Space — Use disposal bin';
const LOCKER_LINE = 'E / Space — Use Component Locker';

function meta(event: { metadata?: Record<string, unknown> }) {
  return event.metadata ?? {};
}

async function uiProbe(page: Page): Promise<UiProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __inventoryUiProbe?: UiProbe | null })
        .__inventoryUiProbe ?? null,
  );
}

async function waitOverlay(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open ?? false) === expected,
    open,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300);
}

async function family(page: Page, prefix: string): Promise<RawGameEvent[]> {
  return (await getEvents(page)).filter((event) =>
    event.event_type.startsWith(prefix),
  ) as unknown as RawGameEvent[];
}

function of(events: RawGameEvent[], prefix: string, suffix: string) {
  return events.filter((event) => event.event_type === `${prefix}${suffix}`);
}

/** The line shown above the avatar's target (null = none shown). */
async function promptLine(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
        }
      ).__worldPromptProbe?.text ?? null,
  );
}

async function avatar(page: Page): Promise<{ x: number; y: number }> {
  const at = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );

  expect(at).not.toBeNull();

  return at!;
}

async function carriedPiece(page: Page): Promise<string | null> {
  return (await physicalProbe(page))?.carried ?? null;
}

async function lyingPieces(page: Page): Promise<string[]> {
  return ((await physicalProbe(page))?.objects ?? []).map((o) => o.id).sort();
}

async function bundleCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (window as unknown as { __pilotBundles?: { count: number } | null })
        .__pilotBundles?.count ?? -1,
  );
}

/** The bundle in reach of the avatar (null = none), from the DEV probe. */
async function nearestBundle(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __pilotBundles?: { nearest: string | null } | null;
        }
      ).__pilotBundles?.nearest ?? null,
  );
}

async function stationsOpened(page: Page): Promise<string[]> {
  return (await getEvents(page))
    .filter((event) => event.event_type === 'pilot_station_opened')
    .map((event) => String(meta(event as never).station_id));
}

function labelOf(objectId: string): string {
  return M04_PIECES.find((piece) => piece.object_id === objectId)!.label;
}

function slotOf(probe: UiProbe, containerId: string, slotIndex: number) {
  const slot = probe.slots.find(
    (s) => s.container_id === containerId && s.slot_index === slotIndex,
  );

  if (slot === undefined) {
    throw new Error(`slot ${containerId}[${slotIndex}] not in probe`);
  }

  return slot;
}

/** Pointer move: a drag from slot centre to slot centre. */
async function dragMove(page: Page, from: ProbeSlot, to: ProbeSlot) {
  const a = await designToPage(page, from.x + from.w / 2, from.y + from.h / 2);
  const b = await designToPage(page, to.x + to.w / 2, to.y + to.h / 2);

  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 8 });
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

/** Clicks a panel button by id (real pointer input). */
async function clickButton(page: Page, id: string) {
  const button = (await uiProbe(page))!.buttons.find((b) => b.id === id);

  if (button === undefined) {
    throw new Error(`button ${id} not in probe`);
  }

  const point = await designToPage(
    page,
    button.x + button.w / 2,
    button.y + button.h / 2,
  );

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(300);
}

/** Moves the keyboard focus to a slot with the arrow keys (grid order). */
async function focusSlot(page: Page, containerId: string, slotIndex: number) {
  for (let guard = 0; guard < 24; guard += 1) {
    const probe = (await uiProbe(page))!;
    const linear = (container: string, slot: number) =>
      probe.slots.findIndex(
        (s) => s.container_id === container && s.slot_index === slot,
      );
    const target = linear(containerId, slotIndex);
    const current =
      probe.focus === null
        ? -1
        : linear(probe.focus.container_id, probe.focus.slot_index);

    expect(target).toBeGreaterThanOrEqual(0);

    if (current === target) {
      return;
    }

    await press(page, current < target ? 'ArrowRight' : 'ArrowLeft');
  }

  throw new Error(`focus never reached ${containerId}[${slotIndex}]`);
}

/** SHIFT+TAB as a participant presses it: SHIFT held, TAB pressed. */
async function shiftTab(page: Page) {
  await page.keyboard.down('Shift');
  await press(page, 'Tab');
  await page.keyboard.up('Shift');
}

/** The north lane above the disposal bin (within the bin's reach). */
async function toBin(page: Page) {
  await workshopVia(page, 352, 156);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await avatar(page)).y <= 166) {
      break;
    }

    await driveAxisTo(page, 'y', 156, 8);
  }

  await driveAxisTo(page, 'x', 492, 8);

  const at = await avatar(page);

  expect(Math.hypot(at.x - 492, at.y - 235)).toBeLessThanOrEqual(96);
}

/** From the north lane down the clear column west of the cutter island. */
async function fromLane(page: Page, x: number, y: number) {
  await workshopVia(page, 348, 160);
  await walkTo(page, 348, y, { yFirst: true });

  if (x !== 348) {
    await walkTo(page, x, y, { yFirst: false });
  }
}

/**
 * Walks the candidate spots until the line above the avatar satisfies
 * `wanted`; returns that line. The spots are driver geometry only.
 */
async function standWhere(
  page: Page,
  spots: { x: number; y: number }[],
  wanted: (line: string | null) => boolean,
  what: string,
): Promise<string | null> {
  const seen: string[] = [];

  for (const spot of spots) {
    await walkTo(page, spot.x, spot.y, { yFirst: false, tolerance: 6 });
    await page.waitForTimeout(250);

    const line = await promptLine(page);
    const at = await avatar(page);

    seen.push(`${Math.round(at.x)},${Math.round(at.y)} → ${String(line)}`);

    if (wanted(line)) {
      return line;
    }
  }

  throw new Error(`no spot showed ${what}: ${seen.join(' | ')}`);
}

async function arriveWithoutOrders(page: Page) {
  if (process.env.U14C_ALIAS === '1') {
    await bootPilotScene(page, 'u14c', 'records_workshop');

    return;
  }

  await bootPilot(page, 'u14c');
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await valeHandover(page);
  await concourseToWorkshop(page);
}

test.describe('U14-C: M03 / M04 observation order and interaction targeting', () => {
  test('direct access: Press A by pointer with TAB / SHIFT+TAB; the prompt names what the press acts on at the cutter, a piece, the bin, a station and a bundle; a carried piece is counted at the departure and a later disposal changes nothing', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await arriveWithoutOrders(page);

    // Nothing of either item exists yet: the orders were not taken.
    expect(await family(page, M03_FAMILY)).toEqual([]);
    expect(await family(page, M04_FAMILY)).toEqual([]);

    // ——— Label Press A, opened before any order named it ———
    const a = M03_SPEC.a.containers;

    await workshopVia(page, PILOT.workshop.pressA.x, 204);
    await page.waitForTimeout(250);
    expect(await promptLine(page)).toBe('E / Space — Use Label Press A');
    // Approaching the press recorded nothing.
    expect(await family(page, M03_FAMILY)).toEqual([]);
    await press(page, 'Space');
    await waitOverlay(page, true);

    let probe = (await uiProbe(page))!;

    expect(probe.mode).toBe('m03tools');
    expect(probe.m03t?.phase).toBe('practice');

    let m03 = await family(page, M03_FAMILY);

    // Presented once, by the press, BEFORE its panel.
    expect(m03.map((e) => e.event_type.slice(M03_FAMILY.length))).toEqual([
      'presented',
      'surface_opened',
      'practice_presented',
    ]);
    expect(m03[0].sequence!).toBeLessThan(m03[1].sequence!);
    expect(meta(m03[0])).toMatchObject({
      occasion: 'o1',
      entry_state_version: 'm03-tools-v2',
    });
    expect(meta(m03[1])).toMatchObject({
      presented_by: 'station_direct',
      open_number: 1,
    });
    expect(meta(m03[1]).presented_at_ms).toBe(meta(m03[0]).presented_at_ms);
    await page.screenshot({ path: `${SHOTS}-m03-panel-practice-800x600.png` });

    // The press is loaded and run by POINTER.
    await dragMove(page, slotOf(probe, a.supply, 0), slotOf(probe, a.feed, 0));
    probe = (await uiProbe(page))!;
    expect(slotOf(probe, a.feed, 0).definition_id).toBe('m03t_label_roll');
    await page.screenshot({ path: `${SHOTS}-m03-panel-loaded-800x600.png` });

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await clickButton(page, 'm03t_press');
      await page.waitForTimeout(250);
    }

    await page.waitForFunction(
      () =>
        (window as unknown as { __inventoryUiProbe?: UiProbe | null })
          .__inventoryUiProbe?.m03t?.phase === 'tools_out',
      undefined,
      { timeout: 6000 },
    );
    probe = (await uiProbe(page))!;
    expect(
      probe.slots
        .filter((s) => s.container_id === a.bench && s.definition_id !== null)
        .map((s) => [s.slot_index, s.definition_id]),
    ).toEqual(M03_TOOLS.map((tool) => [tool.bench_slot, tool.definitionId]));
    expect(`${probe.m03t?.instruction} ${probe.m03t?.help}`).not.toMatch(
      NO_CLEANUP_CUE,
    );
    expect(probe.m03t?.instruction).not.toMatch(/rack/i);
    await page.screenshot({ path: `${SHOTS}-m03-panel-tools-out-800x600.png` });

    // TAB / SHIFT+TAB between the trays, nothing lifted: there and back.
    await focusSlot(page, a.bench, M03_TOOLS[0].bench_slot);
    await press(page, 'Tab');
    await page.waitForTimeout(200);
    expect((await uiProbe(page))!.focus?.container_id).toBe(a.rack);
    await shiftTab(page);
    await page.waitForTimeout(200);
    expect((await uiProbe(page))!.focus).toEqual({
      container_id: a.bench,
      slot_index: M03_TOOLS[0].bench_slot,
    });

    // With a tool lifted: TAB to the next tray that can take it, SHIFT+TAB
    // back to the tray it came from, TAB again, SPACE sets it down.
    await press(page, 'Space');
    await page.waitForTimeout(200);
    expect((await uiProbe(page))!.held?.definition_id).toBe(BRUSH);
    await press(page, 'Tab');
    await page.waitForTimeout(200);
    expect((await uiProbe(page))!.focus).toEqual({
      container_id: a.rack,
      slot_index: 0,
    });
    await shiftTab(page);
    await page.waitForTimeout(200);
    expect((await uiProbe(page))!.focus?.container_id).toBe(a.bench);
    expect((await uiProbe(page))!.held?.definition_id).toBe(BRUSH);
    await page.screenshot({
      path: `${SHOTS}-m03-panel-tool-lifted-800x600.png`,
    });
    await press(page, 'Tab');
    await page.waitForTimeout(200);
    expect((await uiProbe(page))!.focus).toEqual({
      container_id: a.rack,
      slot_index: 0,
    });
    await press(page, 'Space');
    await page.waitForTimeout(300);
    probe = (await uiProbe(page))!;
    expect(slotOf(probe, a.rack, 0).definition_id).toBe(BRUSH);
    expect(probe.held).toBeNull();
    await page.screenshot({ path: `${SHOTS}-m03-panel-restored-800x600.png` });
    await page.waitForTimeout(2_200);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    m03 = await family(page, M03_FAMILY);
    expect(of(m03, M03_FAMILY, 'presented')).toHaveLength(1);
    expect(
      of(m03, M03_FAMILY, 'practice_completed').map((e) => meta(e).input_mode),
    ).toEqual(['pointer']);
    expect(
      of(m03, M03_FAMILY, 'press_cycle').map((e) => meta(e).input_mode),
    ).toEqual(['pointer', 'pointer', 'pointer']);
    expect(
      of(m03, M03_FAMILY, 'tool_moved').map((e) => [
        meta(e).object_id,
        meta(e).to_container,
        meta(e).input_mode,
      ]),
    ).toEqual([[BRUSH, a.rack, 'keyboard']]);
    expect(
      (
        meta(of(m03, M03_FAMILY, 'opportunity_opened')[0])
          .entry_state_snapshot as Record<string, unknown>
      ).presented_by,
    ).toBe('station_direct');

    const departureA = of(m03, M03_FAMILY, 'first_departure');

    expect(departureA).toHaveLength(1);
    expect(meta(departureA[0])).toMatchObject({
      occasion: 'o1',
      departed: true,
      tools_restored: 1,
      tools_left: 2,
      entry_state_version: 'm03-tools-v2',
    });

    // The press is idle: its batch is done (the participant closed it).
    await press(page, 'Space');
    await page.waitForTimeout(500);
    expect((await uiProbe(page))?.open ?? false).toBe(false);
    expect(await lastFeedback(page)).toBe(
      'Label press idle. The batch is done.',
    );

    // ——— Sample Cutter, used before the orders list the coupons ———
    await fromLane(page, 348, 230);
    await page.waitForTimeout(250);
    expect(await promptLine(page)).toBe(CUTTER_LINE);
    expect(await family(page, M04_FAMILY)).toEqual([]);
    await page.screenshot({ path: `${SHOTS}-prompt-cutter-800x600.png` });
    await press(page, 'Space');
    await page.waitForTimeout(250);
    expect(await lastFeedback(page)).toBe(
      'Sample coupon 1 of 2 cut. The cutter re-arms while you work another order.',
    );

    // Inside the settle window the press still belongs to the cutter: it
    // is refused and lifts nothing.
    expect(await promptLine(page)).toBe(CUTTER_LINE);
    await press(page, 'Space');
    await page.waitForTimeout(300);
    expect(await carriedPiece(page)).toBeNull();

    let m04 = await family(page, M04_FAMILY);

    expect(m04.map((e) => e.event_type.slice(M04_FAMILY.length))).toEqual([
      'presented',
      'opportunity_opened',
      'job_run',
      'press_refused',
    ]);
    expect(meta(m04[2])).toMatchObject({
      occasion: 'o1',
      pieces: ['m04_offcut_a', 'm04_swarf_a', 'm04_wrap_a'],
      entry_state_version: 'm04-cutting-v2',
      input_mode: 'keyboard',
    });
    await page.waitForTimeout(1_600);

    // After it the line names a piece, and the press lifts THAT piece (a
    // step towards the bench, so that one piece is clearly the nearest).
    await walkTo(page, 358, 228, { yFirst: false, tolerance: 6 });
    await page.waitForTimeout(250);

    const firstLine = await promptLine(page);

    expect(firstLine).toMatch(PIECE_LINE);
    expect(firstLine).not.toMatch(NO_CLEANUP_CUE);
    await page.screenshot({ path: `${SHOTS}-prompt-piece-800x600.png` });
    await press(page, 'Space');
    await page.waitForTimeout(400);

    const first = (await carriedPiece(page))!;

    expect(first).toMatch(/^m04_.*_a$/);
    expect(firstLine).toBe(`E / Space — Take ${labelOf(first)}`);
    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'piece_picked_up').map((e) => [
        meta(e).object_id,
        meta(e).input_mode,
        meta(e).origin,
      ]),
    ).toEqual([[first, 'keyboard', 'cutter_press']]);

    // Hands full AT THE CUTTER: the press stays the cutter's and states
    // the cutter's own line, recorded as in Unit 14 — no piece is named,
    // none is lifted.
    expect(await promptLine(page)).toBe(CUTTER_LINE);
    await press(page, 'Space');
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe(
      'The cutter re-arms while you work another order.',
    );
    expect(await carriedPiece(page)).toBe(first);
    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'job_unavailable').map((e) => [
        meta(e).reason,
        meta(e).input_mode,
      ]),
    ).toEqual([['job_open', 'keyboard']]);
    expect(of(m04, M04_FAMILY, 'piece_picked_up')).toHaveLength(1);

    // (Hands full on OPEN FLOOR is checked during job 2, beside its blade
    // wrap: the first job's pieces lie between the radii of the Component
    // Locker, Label Press B and the sample kit, where the clear floor is
    // a few pixels wide — U14-C2.)

    // Nothing in reach, a piece in the hands: the press states what is
    // held.
    await workshopVia(page, 352, 156);
    expect(
      await standWhere(
        page,
        [
          { x: 424, y: 152 },
          { x: 416, y: 150 },
          { x: 432, y: 150 },
          { x: 408, y: 148 },
        ],
        (line) => line === null,
        'no line',
      ),
    ).toBeNull();
    await press(page, 'Space');
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe(`Carrying the ${labelOf(first)}.`);
    await page.screenshot({ path: `${SHOTS}-feedback-carrying-800x600.png` });
    expect(await carriedPiece(page)).toBe(first);
    expect((await family(page, M04_FAMILY)).length).toBe(m04.length);

    // Beside the bin the line names the bin, and the press drops the
    // piece there.
    await toBin(page);
    await page.waitForTimeout(250);
    expect(await promptLine(page)).toBe(BIN_LINE);
    await page.screenshot({ path: `${SHOTS}-prompt-bin-800x600.png` });
    await press(page, 'Space');
    await page.waitForTimeout(400);
    expect(await carriedPiece(page)).toBeNull();
    expect(await lastFeedback(page)).toBe('Disposed.');
    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'piece_disposed').map((e) => [
        meta(e).object_id,
        meta(e).input_mode,
        meta(e).origin,
      ]),
    ).toEqual([[first, 'keyboard', 'open_floor_press']]);
    // Nothing carried, the bin in reach: the bin is not named.
    expect(await promptLine(page)).not.toBe(BIN_LINE);

    // ——— Beside the Component Locker ———
    const opened = await stationsOpened(page);

    await fromLane(page, 310, 250);
    await page.waitForTimeout(250);

    // A piece of the open job lies nearer than the locker: the line names
    // the piece, the press lifts it, the locker stays shut.
    const besideLine = await promptLine(page);

    expect(besideLine).toMatch(PIECE_LINE);
    await page.screenshot({
      path: `${SHOTS}-prompt-piece-beside-locker-800x600.png`,
    });
    await press(page, 'Space');
    await page.waitForTimeout(500);

    const second = (await carriedPiece(page))!;

    expect(second).toMatch(/^m04_.*_a$/);
    expect(second).not.toBe(first);
    expect(besideLine).toBe(`E / Space — Take ${labelOf(second)}`);
    expect((await uiProbe(page))?.open ?? false).toBe(false);
    expect(await stationsOpened(page)).toEqual(opened);
    m04 = await family(page, M04_FAMILY);
    expect(meta(of(m04, M04_FAMILY, 'piece_picked_up')[1])).toMatchObject({
      object_id: second,
      input_mode: 'keyboard',
      origin: 'station_press:storage_locker',
    });

    // With the piece carried the line names the locker. Standing beside
    // it closes nothing.
    expect(await promptLine(page)).toBe(LOCKER_LINE);
    await page.screenshot({ path: `${SHOTS}-prompt-station-800x600.png` });
    await page.waitForTimeout(600);
    m04 = await family(page, M04_FAMILY);
    expect(of(m04, M04_FAMILY, 'first_departure')).toHaveLength(0);
    expect(of(m04, M04_FAMILY, 'piece_disposed')).toHaveLength(1);

    // The press opens the locker — it neither drops nor lifts a piece —
    // and that is the first departure of job 1, the carried piece counted.
    await press(page, 'Space');
    await waitOverlay(page, true);
    expect((await uiProbe(page))!.mode).toBe('container');
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);
    expect(await carriedPiece(page)).toBe(second);
    expect(await stationsOpened(page)).toEqual([...opened, 'storage_locker']);
    m04 = await family(page, M04_FAMILY);

    const departure1 = of(m04, M04_FAMILY, 'first_departure');

    expect(departure1).toHaveLength(1);
    expect(meta(departure1[0])).toMatchObject({
      occasion: 'o1',
      trigger: 'other_station',
      detail: 'storage_locker',
      departed: true,
      pieces_disposed: 1,
      disposed_ids: [first],
      carried_piece: second,
      pieces_lying: 1,
      undisposed_at_departure: 2,
    });
    expect(of(m04, M04_FAMILY, 'piece_disposed')).toHaveLength(1);

    const recorded = JSON.stringify(departure1[0]);

    // ——— A later disposal, by pointer: recorded apart ———
    await toBin(page);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await clickPhysicalContainer(page, 'm04_disposal');

      if ((await carriedPiece(page)) === null) {
        break;
      }

      await page.waitForTimeout(400);
    }

    expect(await carriedPiece(page)).toBeNull();
    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'late_disposal').map((e) => [
        meta(e).object_id,
        meta(e).input_mode,
        meta(e).recorded_undisposed_unchanged,
      ]),
    ).toEqual([[second, 'pointer', 2]]);
    expect(of(m04, M04_FAMILY, 'piece_disposed')).toHaveLength(1);
    expect(
      of(m04, M04_FAMILY, 'first_departure').map((e) => JSON.stringify(e)),
    ).toEqual([recorded]);

    // ——— Coupon 2: a coupon is waiting, so the press is the cutter's
    // although a piece of job 1 still lies in reach ———
    await fromLane(page, 348, 230);
    await page.waitForTimeout(250);
    expect(await lyingPieces(page)).toHaveLength(1);
    expect(await promptLine(page)).toBe(CUTTER_LINE);
    await press(page, 'Space');
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe('Sample coupon 2 of 2 cut.');
    expect(await carriedPiece(page)).toBeNull();
    expect(await lyingPieces(page)).toHaveLength(4);
    await page.screenshot({ path: `${SHOTS}-m04-job2-pieces-800x600.png` });
    await page.waitForTimeout(1_600);

    // One piece of job 2 is lifted by POINTER from the bench (a named
    // object, so the state that follows is the same in every run).
    await clickPhysicalObject(page, 'm04_offcut_b');
    expect(await carriedPiece(page)).toBe('m04_offcut_b');
    m04 = await family(page, M04_FAMILY);
    expect(meta(of(m04, M04_FAMILY, 'piece_picked_up')[2])).toMatchObject({
      object_id: 'm04_offcut_b',
      occasion: 'o2',
      input_mode: 'pointer',
      origin: 'pointer',
    });

    // ——— A supply bundle and a piece in reach of each other ———
    const bundles = await bundleCount(page);

    expect(bundles).toBeGreaterThan(0);

    const bundleLine = await standWhere(
      page,
      [
        { x: 250, y: 248 },
        { x: 244, y: 252 },
        { x: 240, y: 244 },
      ],
      (line) => line === 'E — Take sample kit',
      'the sample kit line',
    );

    await page.screenshot({ path: `${SHOTS}-prompt-bundle-800x600.png` });
    await press(page, 'Space');
    await page.waitForTimeout(500);
    // The press took the bundle the line named, and no piece; the piece
    // in the hands stayed there.
    expect(bundleLine).toBe('E — Take sample kit');
    expect(await bundleCount(page)).toBe(bundles - 1);
    expect(await carriedPiece(page)).toBe('m04_offcut_b');
    expect(
      of(await family(page, M04_FAMILY), M04_FAMILY, 'piece_picked_up'),
    ).toHaveLength(3);

    // ——— Hands full on open floor, the blade wrap of job 2 in reach ———
    // With the sample kit gone, the floor south-west of the blade wrap
    // (280, 232) is clear over the whole ±6 px landing box of every spot
    // below (x 258–274, y 236–252): no station within its 72 px radius
    // (the locker ≥ 74, Press A ≥ 79, Press B ≥ 81), no bundle within its
    // 44 px reach (≥ 48), the bin far out of reach — and the blade wrap
    // within 30 px, nearer than any other piece.
    m04 = await family(page, M04_FAMILY);

    const openedBefore = await stationsOpened(page);
    const lyingBefore = await lyingPieces(page);
    const blockedLine = await standWhere(
      page,
      [
        { x: 266, y: 244 },
        { x: 264, y: 246 },
        { x: 268, y: 242 },
      ],
      (line) => line === 'E / Space — Take blade wrap',
      'the blade wrap line with the hands full',
    );

    expect(blockedLine).toBe('E / Space — Take blade wrap');
    expect(lyingBefore).toContain('m04_wrap_b');

    // The state is open floor by measurement, not by assumption: where
    // the avatar stands, every station lies outside its radius, the bin
    // outside its reach, no bundle is in reach and the wrap is.
    const stood = await avatar(page);
    const away = (at: { x: number; y: number }) =>
      Math.hypot(stood.x - at.x, stood.y - at.y);

    for (const [name, at] of Object.entries({
      ...WORKSHOP_STATIONS,
      ...WORKSHOP_SITES,
    })) {
      if (
        name.startsWith('supply') ||
        name === 'cutterScatter' ||
        name === 'disposalChute'
      ) {
        continue;
      }

      expect(away(at), `${name} from ${stood.x},${stood.y}`).toBeGreaterThan(
        72,
      );
    }

    expect(away(WORKSHOP_SITES.disposalChute)).toBeGreaterThan(96);
    expect(await nearestBundle(page)).toBeNull();
    const wrap = M04_PIECES.find((piece) => piece.object_id === 'm04_wrap_b')!;

    expect(
      away({
        x: WORKSHOP_SITES.cutterScatter.x + wrap.dx,
        y: WORKSHOP_SITES.cutterScatter.y + wrap.dy,
      }),
    ).toBeLessThanOrEqual(64);
    test.info().annotations.push({
      type: 'hands-full position',
      description: `${Math.round(stood.x)},${Math.round(stood.y)}`,
    });
    // eslint-disable-next-line no-console
    console.log(
      `[u14c] hands-full check at ${Math.round(stood.x)},${Math.round(stood.y)}`,
    );

    // SPACE and E take the same path; neither lifts, records or opens.
    for (const interactKey of ['Space', 'e']) {
      await press(page, interactKey);
      await page.waitForTimeout(300);
      expect(await lastFeedback(page)).toBe('Hands full.');
      expect(await promptLine(page)).toBe('E / Space — Take blade wrap');
      expect(await carriedPiece(page)).toBe('m04_offcut_b');
      expect(await lyingPieces(page)).toEqual(lyingBefore);
      expect((await family(page, M04_FAMILY)).length).toBe(m04.length);
      expect(await stationsOpened(page)).toEqual(openedBefore);
      expect((await uiProbe(page))?.open ?? false).toBe(false);
      expect(await bundleCount(page)).toBe(bundles - 1);
    }

    await page.screenshot({ path: `${SHOTS}-feedback-hands-full-800x600.png` });

    // The carried piece goes to the bin by keyboard: a disposal inside
    // job 2's window.
    await toBin(page);
    await page.waitForTimeout(250);
    expect(await promptLine(page)).toBe(BIN_LINE);
    await press(page, 'Space');
    await page.waitForTimeout(400);
    expect(await carriedPiece(page)).toBeNull();
    expect(await lastFeedback(page)).toBe('Disposed.');
    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'piece_disposed').map((e) => [
        meta(e).object_id,
        meta(e).occasion,
        meta(e).input_mode,
      ]),
    ).toEqual([
      [first, 'o1', 'keyboard'],
      ['m04_offcut_b', 'o2', 'keyboard'],
    ]);

    // ——— The blade wrap, by keyboard, with the hands free ———
    await fromLane(page, 348, 230);

    const wrapLine = await standWhere(
      page,
      [
        { x: 284, y: 234 },
        { x: 288, y: 238 },
        { x: 280, y: 240 },
      ],
      (line) => line === 'E / Space — Take blade wrap',
      'the blade wrap line',
    );

    expect(wrapLine).toBe('E / Space — Take blade wrap');
    await press(page, 'Space');
    await page.waitForTimeout(500);
    // The press took the piece the line named, and no bundle.
    expect(await carriedPiece(page)).toBe('m04_wrap_b');
    expect(await bundleCount(page)).toBe(bundles - 1);
    m04 = await family(page, M04_FAMILY);
    expect(meta(of(m04, M04_FAMILY, 'piece_picked_up')[3])).toMatchObject({
      object_id: 'm04_wrap_b',
      occasion: 'o2',
      input_mode: 'keyboard',
    });
    expect(of(m04, M04_FAMILY, 'first_departure')).toHaveLength(1);

    // ——— The work orders, taken last ———
    await workshopVia(page, 1312, 178);
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    await selectPromptOption(page, 1);
    await page.waitForTimeout(500);

    m03 = await family(page, M03_FAMILY);
    m04 = await family(page, M04_FAMILY);

    // The listing never rewrote the presentation of the press.
    expect(of(m03, M03_FAMILY, 'presented')).toHaveLength(1);
    expect(of(m03, M03_FAMILY, 'first_departure')).toHaveLength(1);

    // Opening the board was the first departure of job 2, the carried
    // piece counted; the listing came after both cuts.
    const departures = of(m04, M04_FAMILY, 'first_departure');

    expect(departures.map((e) => meta(e).occasion)).toEqual(['o1', 'o2']);
    expect(JSON.stringify(departures[0])).toBe(recorded);
    expect(meta(departures[1])).toMatchObject({
      trigger: 'other_station',
      detail: 'work_order_board',
      pieces_disposed: 1,
      disposed_ids: ['m04_offcut_b'],
      carried_piece: 'm04_wrap_b',
      pieces_lying: 1,
      undisposed_at_departure: 2,
    });

    const listed = of(m04, M04_FAMILY, 'listed');

    expect(listed).toHaveLength(1);

    for (const run of of(m04, M04_FAMILY, 'job_run')) {
      expect(run.sequence!).toBeLessThan(listed[0].sequence!);
    }

    for (const event of [...m03, ...m04]) {
      expect(JSON.stringify(meta(event))).not.toMatch(/score|penalt|correct/i);
    }

    // ——— Offline reproduction through the read-only extractor ———
    const all = (await getEvents(page)) as unknown as RawGameEvent[];
    const m03Rows = extractItemFeatures('M03', all, CONTEXT);
    const m04Rows = extractItemFeatures('M04', all, CONTEXT);

    expect(m03Rows[0]).toMatchObject({
      feature_id: 'm03_tools_restored',
      value: 1,
      numerator: 1,
      denominator: 3,
      planned_denominator: 6,
      disposition: 'incomplete',
      included_ids: ['m03_tools_o1'],
    });
    expect(
      (m03Rows[1].value as Record<string, Record<string, unknown>>).o1,
    ).toMatchObject({
      status: 'observed',
      presented_by: 'station_direct',
      presented_before_panel_opened: true,
      practice_input_mode: 'pointer',
    });
    expect(m04Rows[0]).toMatchObject({
      feature_id: 'm04_undisposed_pieces',
      value: 4,
      numerator: 4,
      denominator: 6,
      disposition: 'observed',
      censored: false,
      included_ids: ['m04_cutting_o1', 'm04_cutting_o2'],
    });
    expect(m04Rows[0].components).toMatchObject({
      cutter_listed: true,
      jobs_observed: ['o1', 'o2'],
      undisposed_by_job: { o1: 2, o2: 2 },
      late_disposals: 1,
      disposed_by_or_after_station_press: 0,
    });
    // The same log without its listing reads the same value.
    expect(
      extractItemFeatures(
        'M04',
        all.filter((event) => event.event_type !== `${M04_FAMILY}listed`),
        CONTEXT,
      )[0],
    ).toMatchObject({ value: 4, denominator: 6, disposition: 'observed' });
    expectNoRuntimeErrors(errors);
  });
});
