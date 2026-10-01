/**
 * Station 080 M03 / M04 — the press occasions and the two cutting jobs on
 * the participant route (Unit 14, browser).
 *
 * Test 1 (restoration shift, driven by real input from the Dock): Label
 * Press A — the run control refuses in both input modes before the roll
 * is loaded, the taught movement by keyboard, three cycles, three tools on
 * the surface, the threaded roll no longer moves, one tool restored by
 * pointer drag, the panel closed (the first departure; the press is idle
 * afterwards); the Sample Cutter in its annex (U14-D2,
 * `m04-cutting-v4`) — coupon 1 with the line both cuts share, a repeated
 * press inside the settle window refused, one piece of the west cluster
 * disposed by pointer, one piece lifted by keyboard on open floor and
 * carried when another station's work is begun (the first departure of
 * job 1), two later disposals recorded apart, coupon 2 available only
 * now, one piece of the east cluster lifted and disposed by keyboard, one
 * piece carried out of the annex and out of the room (the first
 * departure of job 2, recorded before the piece is put back).
 *
 * Test 2 (the whole route to the return shift): Press A left untouched in
 * the restoration shift, Press B with all three tools restored by
 * keyboard (TAB between the trays) on the return shift; the cutter cuts
 * nothing on the return shift.
 *
 * Both tests reproduce the primaries offline from the raw families
 * through the read-only extractor.
 */
import { expect, type Page, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { M03_SPEC, M03_TOOLS } from '../src/pilot/windows/m03RestoreModel';
import { M04_PIECES } from '../src/pilot/windows/m04CuttingModel';
import { WORKSHOP_SITES } from '../src/pilot/zoneSites';
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
  ANNEX_DRIVER,
  annexPieceStand,
  bootPilot,
  concourseToWorkshop,
  expectStage,
  interactAt,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotProbe,
  registryApproach,
  routeToWorkshopWork,
  walkTo,
  workshopToConcourse,
  workshopVia,
} from './pilotHelpers';
import {
  clickElement,
  closeSurface,
  enterConcourseWithOffers,
  exteriorShift,
  FORBIDDEN_TEXT,
  handOverToKai,
  lastFeedback,
  openWorkshopSurface,
  readGauge,
  RETURN,
  returnInside,
  valeReturnCheckIn,
  validityRecord,
  workshopApproach,
} from './returnHelpers';

interface ProbeSlot {
  container_id: string;
  slot_index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  definition_id: string | null;
  shown_icon: string | null;
}

interface UiProbe {
  open: boolean;
  mode: string;
  focus: { container_id: string; slot_index: number } | null;
  held: { definition_id: string; quantity: number } | null;
  detail_text: string | null;
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
  buttons: {
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    enabled: boolean;
  }[];
}

const CONTEXT = { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false };
const M03_FAMILY = 'proto_m03tools_';
const M04_FAMILY = 'proto_m04_cutting_';
const [BRUSH, KEY, GAUGE] = M03_TOOLS.map((tool) => tool.definitionId);
/** Words the two items must never show a participant. */
const NO_CLEANUP_CUE =
  /tidy|tidi|neat|clean|put away|put back|restore|mess|dispose|throw|bin it|rack\b.*(use|return)/i;

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

function slotOf(probe: UiProbe, containerId: string, slotIndex: number) {
  const slot = probe.slots.find(
    (s) => s.container_id === containerId && s.slot_index === slotIndex,
  );

  if (slot === undefined) {
    throw new Error(`slot ${containerId}[${slotIndex}] not in probe`);
  }

  return slot;
}

function slotHolding(probe: UiProbe, definitionId: string) {
  const slot = probe.slots.find((s) => s.definition_id === definitionId);

  if (slot === undefined) {
    throw new Error(`${definitionId} is on no slot`);
  }

  return slot;
}

/** Moves the keyboard focus to a slot with the arrow keys (grid order). */
async function focusSlot(page: Page, containerId: string, slotIndex: number) {
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

  if (current === -1) {
    await press(page, 'ArrowRight');

    return focusSlot(page, containerId, slotIndex);
  }

  for (let step = current; step < target; step += 1) {
    await press(page, 'ArrowRight');
  }

  for (let step = current; step > target; step -= 1) {
    await press(page, 'ArrowLeft');
  }

  expect((await uiProbe(page))!.focus).toEqual({
    container_id: containerId,
    slot_index: slotIndex,
  });
}

/** Keyboard move: SPACE lifts the focused object, SPACE sets it down. */
async function keyboardMove(
  page: Page,
  from: { container: string; slot: number },
  to: { container: string; slot: number },
) {
  await focusSlot(page, from.container, from.slot);
  await press(page, 'Space');
  await page.waitForTimeout(200);
  await focusSlot(page, to.container, to.slot);
  await press(page, 'Space');
  await page.waitForTimeout(300);
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

async function openPress(page: Page, occasion: 'a' | 'b') {
  const at = occasion === 'a' ? PILOT.workshop.pressA : PILOT.workshop.pressB;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await workshopVia(page, at.x, at.y + 44);
    await interactAt(page, at, { approachOffset: { x: 0, y: 44 } });

    const opened = await waitOverlay(page, true).then(
      () => true,
      () => false,
    );

    if (opened) {
      break;
    }
  }

  const probe = (await uiProbe(page))!;

  expect(probe.mode).toBe('m03tools');
  expect(probe.m03t?.occasion).toBe(occasion);

  return probe;
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
  await page.waitForTimeout(260);
}

/** The taught movement and the three cycles, by keyboard. */
async function loadAndRunPress(page: Page, occasion: 'a' | 'b') {
  const c = M03_SPEC[occasion].containers;
  let probe = (await uiProbe(page))!;

  expect(probe.m03t?.phase).toBe('practice');
  expect(probe.m03t?.instruction).toContain('ROLL SUPPLY');
  expect(probe.m03t?.instruction).toContain('PRESS FEED');
  expect(probe.m03t?.instruction).toContain('RIGHT ARROW');
  expect(probe.m03t?.instruction).toContain('drag');
  expect(probe.m03t?.instruction).not.toMatch(NO_CLEANUP_CUE);
  expect(probe.m03t?.instruction).not.toMatch(/rack/i);
  // No tool exists before the run; the rack is visible and empty.
  expect(
    probe.slots.filter(
      (s) =>
        (s.container_id === c.bench || s.container_id === c.rack) &&
        s.definition_id !== null,
    ),
  ).toHaveLength(0);
  expect(probe.slots.filter((s) => s.container_id === c.rack)).toHaveLength(3);
  // The roll holds the first focus.
  expect(probe.focus).toEqual({ container_id: c.supply, slot_index: 0 });

  // The press refuses while the roll is in the supply slot — by keyboard
  // and by pointer, with the same line.
  await press(page, 'c');
  await page.waitForTimeout(250);
  probe = (await uiProbe(page))!;
  expect(probe.m03t?.cycles).toBe(0);
  expect(probe.feedback).toBe('Load the label roll first.');
  await clickButton(page, 'm03t_press');
  probe = (await uiProbe(page))!;
  expect(probe.m03t?.cycles).toBe(0);
  expect(probe.feedback).toBe('Load the label roll first.');

  await keyboardMove(
    page,
    { container: c.supply, slot: 0 },
    { container: c.feed, slot: 0 },
  );
  probe = (await uiProbe(page))!;
  expect(slotOf(probe, c.feed, 0).definition_id).toBe('m03t_label_roll');

  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await press(page, 'c');
    await page.waitForTimeout(450);
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
      .filter((s) => s.container_id === c.bench && s.definition_id !== null)
      .map((s) => [s.slot_index, s.definition_id]),
  ).toEqual(M03_TOOLS.map((tool) => [tool.bench_slot, tool.definitionId]));
  // Every tool is drawn with its own icon (reachable on screen).
  expect(
    probe.slots
      .filter((s) => s.container_id === c.bench && s.definition_id !== null)
      .every((s) => s.shown_icon !== null && s.shown_icon !== 'fallback'),
  ).toBe(true);
  expect(probe.m03t?.instruction).not.toMatch(NO_CLEANUP_CUE);
  expect(probe.m03t?.instruction).not.toMatch(/rack/i);
  expect(probe.m03t?.help).not.toMatch(NO_CLEANUP_CUE);

  return probe;
}

async function avatar(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );
}

/** Where a piece lies in the cutting annex (room px). */
function placeOf(objectId: string): { x: number; y: number } {
  const piece = M04_PIECES.find((entry) => entry.object_id === objectId)!;

  return {
    x: WORKSHOP_SITES.cutterScatter.x + piece.dx,
    y: WORKSHOP_SITES.cutterScatter.y + piece.dy,
  };
}

/**
 * Walks beside a piece of the annex (U14-D2): 20 px from it on the
 * cutter's side, where it is in keyboard and pointer reach and nearer
 * than every other piece. Driver geometry only.
 */
async function besidePiece(page: Page, objectId: string) {
  const stand = annexPieceStand(placeOf(objectId));

  await workshopVia(page, stand.x, stand.y);
  await page.waitForTimeout(250);
}

/** Whether the bin is the acquired target of the carried piece (U14-D). */
async function binAcquired(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      (window as unknown as { __m04BinProbe?: { acquired: boolean } | null })
        .__m04BinProbe?.acquired ?? false,
  );
}

/**
 * Walks to the bin the way a participant acquires it (U14-D2): down the
 * clear column on the avatar's side of the cutter to a place outside the
 * bin's 64 px range, then into it — the pocket beside the bin.
 */
async function toBin(page: Page) {
  const from = await avatar(page);
  const west = from === null || from.x < ANNEX_DRIVER.doorX;
  const pocket = west ? ANNEX_DRIVER.binWest : ANNEX_DRIVER.binEast;

  await workshopVia(
    page,
    west ? ANNEX_DRIVER.westX : ANNEX_DRIVER.eastX,
    pocket.y,
  );
  await driveAxisTo(page, 'x', pocket.x, 6);
  await page.waitForTimeout(250);

  const at = await avatar(page);

  expect(at).not.toBeNull();
  expect(
    Math.hypot(
      at!.x - WORKSHOP_SITES.disposalChute.x,
      at!.y - WORKSHOP_SITES.disposalChute.y,
    ),
  ).toBeLessThanOrEqual(64);
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

/**
 * Drops the carried piece into the bin by a real pointer click on the
 * bin. The click is repeated (the software renderer can lose one) and a
 * miss reports where the avatar stood.
 */
async function disposeByPointer(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickPhysicalContainer(page, 'm04_disposal');

    if (((await physicalProbe(page))?.carried ?? null) === null) {
      return;
    }

    await page.waitForTimeout(400);
  }

  const at = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );

  throw new Error(
    `the bin did not take the carried piece (avatar at ${JSON.stringify(at)}, probe ${JSON.stringify(await physicalProbe(page))})`,
  );
}

async function lyingPieces(page: Page): Promise<string[]> {
  return ((await physicalProbe(page))?.objects ?? []).map((o) => o.id).sort();
}

async function carriedPiece(page: Page): Promise<string | null> {
  return (await physicalProbe(page))?.carried ?? null;
}

async function stationsOpened(page: Page): Promise<string[]> {
  return (await getEvents(page))
    .filter((event) => event.event_type === 'pilot_station_opened')
    .map((event) => String(meta(event as never).station_id));
}

async function stage2Workshop(page: Page, tag: string) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await routeToWorkshopWork(page);
}

/** The cutter is operated from the north (U14-D2): 33 px above its anchor. */
const CUTTER_STAND = registryApproach('workshop.sample_cutter');
const CUTTER_APPROACH = {
  approachOffset: {
    x: CUTTER_STAND.x - WORKSHOP_SITES.sampleCutter.x,
    y: CUTTER_STAND.y - WORKSHOP_SITES.sampleCutter.y,
  },
};

test.describe('M03 press occasions and M04 cutting jobs on the route', () => {
  test('restoration shift: Press A partly restored; two cutting jobs, each closed at its own first departure, a carried piece counted and later disposals recorded apart', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await stage2Workshop(page, 'u14a');

    // The work orders listed both items; nothing else happened yet.
    let m03 = await family(page, M03_FAMILY);
    let m04 = await family(page, M04_FAMILY);

    expect(m03.map((e) => e.event_type)).toEqual([`${M03_FAMILY}presented`]);
    expect(meta(m03[0]).occasion).toBe('o1');
    expect(m04.map((e) => e.event_type)).toEqual([`${M04_FAMILY}listed`]);
    expect(await lyingPieces(page)).toEqual([]);

    // ——— Label Press A ———
    const a = M03_SPEC.a.containers;

    await openPress(page, 'a');
    await loadAndRunPress(page, 'a');
    await page.screenshot({ path: 'test-results/m03-tools-800x600.png' });

    // The threaded roll no longer moves (recorded, nothing changes).
    let probe = (await uiProbe(page))!;

    await dragMove(page, slotOf(probe, a.feed, 0), slotOf(probe, a.supply, 0));
    probe = (await uiProbe(page))!;
    expect(slotOf(probe, a.feed, 0).definition_id).toBe('m03t_label_roll');
    expect(probe.feedback).toBe('The roll is threaded into the press.');

    // One tool to the rack by pointer; the other two stay where they lie.
    await dragMove(page, slotHolding(probe, KEY), slotOf(probe, a.rack, 1));
    probe = (await uiProbe(page))!;
    expect(slotOf(probe, a.rack, 1).definition_id).toBe(KEY);
    expect(probe.detail_text ?? '').not.toMatch(NO_CLEANUP_CUE);
    await page.waitForTimeout(2_200);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    m03 = await family(page, M03_FAMILY);

    const departureA = m03.filter(
      (e) => e.event_type === `${M03_FAMILY}first_departure`,
    );

    expect(departureA).toHaveLength(1);
    expect(meta(departureA[0])).toMatchObject({
      occasion: 'o1',
      opportunity_id: 'proto_m03_tools_a',
      window_id: 'm03_tools_o1',
      close_reason: 'panel_closed',
      departed: true,
      tools_restored: 1,
      tools_left: 2,
      tool_total: 3,
      exposure_sufficient: true,
      close_state: 'panel_closed',
      input_mode: 'keyboard',
      measurement_protocol_version: 'station080-m26-pilot-v1',
    });
    expect(
      m03
        .filter((e) => e.event_type === `${M03_FAMILY}tool_moved`)
        .map((e) => [
          meta(e).object_id,
          meta(e).to_container,
          meta(e).input_mode,
        ]),
    ).toEqual([[KEY, a.rack, 'pointer']]);
    expect(
      m03
        .filter((e) => e.event_type === `${M03_FAMILY}practice_completed`)
        .map((e) => meta(e).input_mode),
    ).toEqual(['keyboard']);
    expect(
      m03
        .filter((e) => e.event_type === `${M03_FAMILY}move_refused`)
        .map((e) => [meta(e).reason, meta(e).input_mode]),
    ).toEqual([['roll_threaded', 'pointer']]);
    expect(
      m03
        .filter((e) => e.event_type === `${M03_FAMILY}run_refused`)
        .map((e) => meta(e).input_mode),
    ).toEqual(['keyboard', 'pointer']);
    expect(
      m03.filter((e) => e.event_type === `${M03_FAMILY}state_at_system_close`),
    ).toHaveLength(0);

    for (const event of m03) {
      expect(event.object_id).toBe('m03_press_bench_a');
      expect(
        (event as unknown as { study_item_ids?: unknown }).study_item_ids ??
          undefined,
      ).toBeUndefined();
      expect(
        (event as unknown as { success?: unknown }).success ?? undefined,
      ).toBeUndefined();
    }

    expect(await validityRecord(page, 'proto_m03_tools_a')).toMatchObject({
      entered: true,
      completed: true,
      validity: 'valid',
    });

    // The press is idle afterwards: the recorded state is permanent.
    await interactAt(page, PILOT.workshop.pressA, {
      approachOffset: { x: 0, y: 44 },
    });
    await page.waitForTimeout(500);
    expect((await uiProbe(page))?.open ?? false).toBe(false);
    expect(await lastFeedback(page)).toMatch(/batch is done/);
    expect((await family(page, M03_FAMILY)).length).toBe(m03.length);

    // ——— Sample Cutter: coupon 1 ———
    await workshopVia(page, CUTTER_STAND.x, CUTTER_STAND.y);
    await interactAt(page, PILOT.workshop.sampleCutter, CUTTER_APPROACH);
    // A repeated press right after the cut is refused: nothing is lifted.
    await press(page, 'Space');
    await page.waitForTimeout(300);
    expect(await carriedPiece(page)).toBeNull();
    // The line both cuts share: the cut, and nothing about what follows.
    expect(await lastFeedback(page)).toBe('Sample coupon 1 of 2 cut.');
    expect(await lastFeedback(page)).not.toMatch(NO_CLEANUP_CUE);
    expect(await lyingPieces(page)).toEqual([
      'm04_offcut_a',
      'm04_swarf_a',
      'm04_wrap_a',
    ]);
    await page.screenshot({ path: 'test-results/m04-pieces-800x600.png' });
    m04 = await family(page, M04_FAMILY);
    expect(
      m04
        .filter((e) => e.event_type === `${M04_FAMILY}press_refused`)
        .map((e) => meta(e).reason),
    ).toEqual(['cut_settling']);
    expect(
      m04.filter((e) => e.event_type === `${M04_FAMILY}job_run`),
    ).toHaveLength(1);
    expect(meta(m04.at(-1)!).entry_state_version).toBe('m04-cutting-v4');
    await page.waitForTimeout(1_600);

    // One piece to the bin by pointer: the avatar walks to the piece in
    // the west cluster, then to the bin.
    await besidePiece(page, 'm04_offcut_a');
    await clickPhysicalObject(page, 'm04_offcut_a');
    expect(await carriedPiece(page)).toBe('m04_offcut_a');
    // Lifting the piece names no bin (U14-D): the bin is walked up to.
    expect(await binAcquired(page)).toBe(false);
    expect(await promptLine(page)).not.toBe('E / Space — Use disposal bin');
    await toBin(page);
    expect(await binAcquired(page)).toBe(true);
    await disposeByPointer(page);
    expect(await lastFeedback(page)).toBe('Disposed.');

    // A press on open floor beside the swarf tray lifts it: the line
    // names the piece, no station is opened and the job stays open.
    const opened = await stationsOpened(page);

    await besidePiece(page, 'm04_swarf_a');
    expect(await promptLine(page)).toBe('E / Space — Take swarf tray');
    await press(page, 'Space');
    await page.waitForTimeout(500);

    const carried = await carriedPiece(page);

    expect(carried).toBe('m04_swarf_a');
    expect((await uiProbe(page))?.open ?? false).toBe(false);
    expect(await stationsOpened(page)).toEqual(opened);
    m04 = await family(page, M04_FAMILY);
    expect(
      m04.filter(
        (e) =>
          e.event_type === `${M04_FAMILY}first_departure` ||
          e.event_type === `${M04_FAMILY}state_at_review`,
      ),
    ).toHaveLength(0);

    // Still carried when another station's work is begun. The bench
    // shown is no work (U14-D): its first stage carried out is — the
    // first departure of job 1.
    await openWorkshopSurface(
      page,
      'calibrationBench',
      'm07_calibration_bench',
    );
    await page.waitForTimeout(400);
    expect(
      (await family(page, M04_FAMILY)).filter(
        (e) => e.event_type === `${M04_FAMILY}first_departure`,
      ),
    ).toHaveLength(0);
    await clickElement(page, 'advance');
    await page.waitForTimeout(400);
    await closeSurface(page);

    m04 = await family(page, M04_FAMILY);

    const departure1 = m04.filter(
      (e) => e.event_type === `${M04_FAMILY}first_departure`,
    );

    expect(departure1).toHaveLength(1);
    expect(meta(departure1[0])).toMatchObject({
      occasion: 'o1',
      opportunity_id: 'proto_m04_cutting_o1',
      window_id: 'm04_cutting_o1',
      trigger: 'other_station',
      detail: 'calibration_bench',
      departed: true,
      pieces_disposed: 1,
      disposed_ids: ['m04_offcut_a'],
      carried_piece: 'm04_swarf_a',
      pieces_lying: 1,
      undisposed_at_departure: 2,
      measurement_protocol_version: 'station080-m26-pilot-v1',
    });
    expect(
      m04
        .filter((e) => e.event_type === `${M04_FAMILY}piece_disposed`)
        .map((e) => [meta(e).object_id, meta(e).input_mode, meta(e).origin]),
    ).toEqual([['m04_offcut_a', 'pointer', 'pointer']]);
    expect(
      m04
        .filter((e) => e.event_type === `${M04_FAMILY}piece_picked_up`)
        .map((e) => [meta(e).object_id, meta(e).input_mode, meta(e).origin]),
    ).toEqual([
      ['m04_offcut_a', 'pointer', 'pointer'],
      ['m04_swarf_a', 'keyboard', 'open_floor_press'],
    ]);
    expect(await validityRecord(page, 'proto_m04_cutting_o1')).toMatchObject({
      entered: true,
      completed: true,
      validity: 'valid',
    });

    // Later cleanup: the carried piece and the last lying piece go to the
    // bin — recorded apart, the recorded state of job 1 unchanged.
    await toBin(page);
    await disposeByPointer(page);
    await besidePiece(page, 'm04_wrap_a');
    expect(await lyingPieces(page)).toEqual(['m04_wrap_a']);
    await clickPhysicalObject(page, 'm04_wrap_a');
    expect(await carriedPiece(page)).toBe('m04_wrap_a');
    await toBin(page);
    await disposeByPointer(page);
    m04 = await family(page, M04_FAMILY);
    expect(
      m04
        .filter((e) => e.event_type === `${M04_FAMILY}late_disposal`)
        .map((e) => meta(e).object_id),
    ).toEqual(['m04_swarf_a', 'm04_wrap_a']);
    expect(
      m04.filter((e) => e.event_type === `${M04_FAMILY}first_departure`),
    ).toHaveLength(1);
    expect(await lyingPieces(page)).toEqual([]);

    // ——— Sample Cutter: coupon 2 (available after the departure) ———
    await workshopVia(page, CUTTER_STAND.x, CUTTER_STAND.y);
    await interactAt(page, PILOT.workshop.sampleCutter, CUTTER_APPROACH);
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe('Sample coupon 2 of 2 cut.');
    expect(await lyingPieces(page)).toEqual([
      'm04_offcut_b',
      'm04_swarf_b',
      'm04_wrap_b',
    ]);
    await page.screenshot({ path: 'test-results/m04-pieces-job2-800x600.png' });
    await page.waitForTimeout(1_600);

    // At the cutter the press is the cutter's: no piece is lifted there.
    await press(page, 'Space');
    await page.waitForTimeout(400);
    expect(await carriedPiece(page)).toBeNull();
    expect(await lastFeedback(page)).toBe(
      'Both coupons cut. The cutter is idle.',
    );

    // Keyboard path: SPACE on open floor beside a piece lifts it, SPACE
    // beside the bin drops it.
    const keyboardPiece = 'm04_offcut_b';

    await besidePiece(page, keyboardPiece);
    expect(await promptLine(page)).toBe('E / Space — Take coupon offcut');
    await press(page, 'Space');
    await page.waitForTimeout(400);
    expect(await carriedPiece(page)).toBe(keyboardPiece);
    // Lifted outside the bin's range: the bin is not named for it.
    expect(await binAcquired(page)).toBe(false);
    expect(await promptLine(page)).not.toBe('E / Space — Use disposal bin');
    await toBin(page);
    expect(await promptLine(page)).toBe('E / Space — Use disposal bin');
    await press(page, 'Space');
    await page.waitForTimeout(400);
    expect(await carriedPiece(page)).toBeNull();
    expect(await lastFeedback(page)).toBe('Disposed.');
    expect(await lyingPieces(page)).toHaveLength(2);

    // A second piece is lifted and CARRIED out of the room.
    await besidePiece(page, 'm04_wrap_b');
    expect(await promptLine(page)).toBe('E / Space — Take blade wrap');
    await press(page, 'Space');
    await page.waitForTimeout(400);
    expect(await carriedPiece(page)).toBe('m04_wrap_b');

    // Walking out of the annex and through the room closes nothing.
    await workshopVia(page, 1256, RETURN.laneY);
    expect(
      (await family(page, M04_FAMILY)).filter(
        (e) => e.event_type === `${M04_FAMILY}first_departure`,
      ),
    ).toHaveLength(1);

    // Leaving the room is the first departure of job 2.
    await workshopToConcourse(page);

    m04 = await family(page, M04_FAMILY);

    const departures = m04.filter(
      (e) => e.event_type === `${M04_FAMILY}first_departure`,
    );

    expect(departures.map((e) => meta(e).occasion)).toEqual(['o1', 'o2']);

    const job2 = meta(departures[1]);

    // The piece in the hands is counted undisposed: the state was
    // recorded BEFORE the system put the piece back.
    expect(job2).toMatchObject({
      trigger: 'room_exit',
      detail: null,
      pieces_disposed: 1,
      disposed_ids: [keyboardPiece],
      carried_piece: 'm04_wrap_b',
      pieces_lying: 1,
      undisposed_at_departure: 2,
      entry_state_version: 'm04-cutting-v4',
    });

    const putBack = m04.filter(
      (e) => e.event_type === `${M04_FAMILY}piece_put_back`,
    );

    // `input_mode` alone tells the system's put-back from a set-down.
    expect(
      putBack.map((e) => [
        meta(e).object_id,
        meta(e).input_mode,
        'by' in meta(e),
        meta(e).after_departure,
      ]),
    ).toEqual([['m04_wrap_b', 'system', false, true]]);
    expect(putBack[0].sequence!).toBeGreaterThan(departures[1].sequence!);
    expect(
      m04
        .filter(
          (e) =>
            meta(e).occasion === 'o2' &&
            (e.event_type === `${M04_FAMILY}piece_picked_up` ||
              e.event_type === `${M04_FAMILY}piece_disposed`),
        )
        .map((e) => [
          e.event_type.slice(M04_FAMILY.length),
          meta(e).object_id,
          meta(e).input_mode,
          meta(e).origin ?? null,
        ]),
    ).toEqual([
      ['piece_picked_up', keyboardPiece, 'keyboard', 'open_floor_press'],
      ['piece_disposed', keyboardPiece, 'keyboard', 'open_floor_press'],
      ['piece_picked_up', 'm04_wrap_b', 'keyboard', 'open_floor_press'],
    ]);
    // Both cuts in the restoration shift.
    expect(
      m04
        .filter((e) => e.event_type === `${M04_FAMILY}opportunity_opened`)
        .map(
          (e) =>
            (meta(e).entry_state_snapshot as Record<string, unknown>).stage,
        ),
    ).toEqual(['workshop_work', 'workshop_work']);

    for (const event of m04) {
      expect(event.object_id).toBe('m04_sample_cutter');
      expect(
        (event as unknown as { study_item_ids?: unknown }).study_item_ids ??
          undefined,
      ).toBeUndefined();
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
      late_disposals: 2,
      undisposed_by_job: { o1: 2, o2: 2 },
      // No pick-up is issued by a press at a station any more (U14-D).
      pickups_by_station_press: 0,
      disposed_by_or_after_station_press: 0,
    });

    const coverage = (await pilotCoverage(page))!;

    expect(coverage.items.find((i) => i.item === 'M04')?.status).toBe(
      'completed',
    );
    // Press B belongs to the return shift: the item row reads the least
    // terminal of its two windows.
    expect(coverage.items.find((i) => i.item === 'M03')?.status).toBe(
      'pending',
    );
    expectNoRuntimeErrors(errors);
  });

  test('both presses: Press A left untouched in the restoration shift, Press B fully restored by keyboard on the return shift; no cutting on the return shift', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await enterConcourseWithOffers(page, 'u14b', {
      watch: 'accept',
      promise: 'accept',
      readGauge1: true,
    });
    await concourseToWorkshop(page);
    await workshopApproach(page, 'board');
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'workshop_work');
    await walkTo(page, 1256, RETURN.laneY, { yFirst: true });

    // Press B has no batch in the restoration shift.
    await workshopVia(page, 302, 204);
    await interactAt(page, PILOT.workshop.pressB, {
      approachOffset: { x: 0, y: 44 },
    });
    await page.waitForTimeout(500);
    expect((await uiProbe(page))?.open ?? false).toBe(false);
    expect(await lastFeedback(page)).toMatch(/No batch scheduled/);

    // Press A: run, leave every tool where it lies, close.
    await openPress(page, 'a');
    await loadAndRunPress(page, 'a');
    await page.waitForTimeout(2_200);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    // Sign off, the exterior shift, the one purposeful return.
    await workshopApproach(page, 'board');
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'lab_briefing');
    await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
    await workshopToConcourse(page);
    await exteriorShift(page, 'full');
    await returnInside(page);
    await handOverToKai(page);
    await readGauge(page);
    await valeReturnCheckIn(page);
    await expectStage(page, 'workshop_return');
    expect((await pilotProbe(page))?.beacon?.label).toBe('Label Press B');

    // Press B is presented with the return shift.
    expect(
      (await family(page, M03_FAMILY))
        .filter((e) => e.event_type === `${M03_FAMILY}presented`)
        .map((e) => meta(e).occasion),
    ).toEqual(['o1', 'o2']);

    // Press B: the taught movement again, then all three tools to the
    // rack by keyboard — SPACE lifts, TAB jumps to the next tray's first
    // free slot, SPACE sets down.
    const b = M03_SPEC.b.containers;

    await openPress(page, 'b');
    expect(`${(await uiProbe(page))!.m03t?.title}`).not.toMatch(FORBIDDEN_TEXT);
    await loadAndRunPress(page, 'b');

    for (const [index, tool] of M03_TOOLS.entries()) {
      await focusSlot(page, b.bench, tool.bench_slot);
      await press(page, 'Space');
      await page.waitForTimeout(200);
      expect((await uiProbe(page))!.held?.definition_id).toBe(
        tool.definitionId,
      );
      await press(page, 'Tab');
      await page.waitForTimeout(200);
      expect((await uiProbe(page))!.focus).toEqual({
        container_id: b.rack,
        slot_index: index,
      });
      await press(page, 'Space');
      await page.waitForTimeout(300);
    }

    const probe = (await uiProbe(page))!;

    expect(
      probe.slots
        .filter((s) => s.container_id === b.rack)
        .map((s) => s.definition_id),
    ).toEqual([BRUSH, KEY, GAUGE]);
    await page.waitForTimeout(800);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    const m03 = await family(page, M03_FAMILY);
    const departures = m03.filter(
      (e) => e.event_type === `${M03_FAMILY}first_departure`,
    );

    expect(
      departures.map((e) => [
        meta(e).occasion,
        meta(e).window_id,
        meta(e).tools_restored,
      ]),
    ).toEqual([
      ['o1', 'm03_tools_o1', 0],
      ['o2', 'm03_tools_o2', 3],
    ]);
    expect(
      m03
        .filter(
          (e) =>
            e.event_type === `${M03_FAMILY}tool_moved` &&
            meta(e).occasion === 'o2',
        )
        .map((e) => [meta(e).object_id, meta(e).to_home, meta(e).input_mode]),
    ).toEqual([
      [BRUSH, true, 'keyboard'],
      [KEY, true, 'keyboard'],
      [GAUGE, true, 'keyboard'],
    ]);
    expect(
      m03.filter(
        (e) =>
          e.event_type === `${M03_FAMILY}tool_moved` &&
          meta(e).occasion === 'o1',
      ),
    ).toHaveLength(0);

    // Occasion B never wrote under occasion A's ids.
    for (const event of m03.filter((e) => meta(e).occasion === 'o2')) {
      expect(meta(event).opportunity_id).toBe('proto_m03_tools_b');
      expect(event.object_id).toBe('m03_press_bench_b');
    }

    expect(await validityRecord(page, 'proto_m03_tools_b')).toMatchObject({
      entered: true,
      completed: true,
      validity: 'valid',
    });

    // The cutter cuts in the restoration shift only.
    await workshopVia(page, CUTTER_STAND.x, CUTTER_STAND.y);
    await interactAt(page, PILOT.workshop.sampleCutter, CUTTER_APPROACH);
    await page.waitForTimeout(400);
    expect(await lastFeedback(page)).toBe(
      'No cutting scheduled on the cutter right now.',
    );
    expect(await lyingPieces(page)).toEqual([]);

    const m04 = await family(page, M04_FAMILY);

    expect(m04.map((e) => e.event_type)).toEqual([
      `${M04_FAMILY}listed`,
      `${M04_FAMILY}job_unavailable`,
    ]);
    expect(meta(m04[1]).reason).toBe('not_scheduled');

    const all = (await getEvents(page)) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M03', all, CONTEXT);

    expect(rows[0]).toMatchObject({
      feature_id: 'm03_tools_restored',
      value: 3,
      numerator: 3,
      denominator: 6,
      planned_denominator: 6,
      disposition: 'observed',
      included_ids: ['m03_tools_o1', 'm03_tools_o2'],
    });
    expect(rows[0].components).toMatchObject({
      restored_by_occasion: { o1: 0, o2: 3 },
    });
    // No coupon was cut: the pieces never existed.
    expect(extractItemFeatures('M04', all, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expectNoRuntimeErrors(errors);
  });
});
