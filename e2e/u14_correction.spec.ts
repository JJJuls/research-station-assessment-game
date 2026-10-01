/**
 * Station 080 M03 / M04 — the U14-C corrections and the U14-D / U14-D2
 * cleanup-choice correction on the participant route (browser, real input
 * from the Dock).
 *
 * One session that reaches the Records Workshop and does NOT take the work
 * orders first (direct access):
 *
 * - Label Press A opened before any order named it: the presentation is
 *   written once, by the press and before its panel; the press is loaded
 *   and run by POINTER; TAB / SHIFT+TAB move between the trays, with and
 *   without a tool lifted; the panel is captured at 800 × 600 (U14-C,
 *   unchanged).
 * - The Sample Cutter in its annex (U14-D2, the approved administration
 *   `m04-cutting-v4`): the place the cutter left in the machine bay
 *   answers no press; the cutter is operated from the north; both cuts
 *   are answered by the same line and the cutter's status reads "No
 *   cutting order is available."; job 1 leaves its three pieces west of
 *   the cutter, job 2 at the mirrored places east of it; a station in
 *   range keeps the press; ALL SIX pieces, by ONE sequence, are lifted by
 *   keyboard and by pointer and set down where they lay by X and by a
 *   click on the control beside the avatar — every pick-up is made
 *   OUTSIDE the bin's range, and after it the bin is neither named nor
 *   outlined. A key held, repeated or pressed again, a key held all the
 *   way to the bin and a press without a fresh acquisition dispose of
 *   nothing; the bin walked up to after the release disposes once; a
 *   pointer press never lifts and disposes in one gesture; a drag
 *   released elsewhere is no disposal, a drag carried to the bin and
 *   released on it is; a press on the control released outside the canvas
 *   leaves the pointer working.
 * - What does NOT close a cutting job: walking out of the annex, the map,
 *   the backpack, a supply bundle collected, a press that refuses, the
 *   Assembly Bench and the Calibration Bench opened and closed, the seal
 *   log read and closed, the Work Order Board read and its orders taken,
 *   a piece lifted, set down or disposed of. What does, exactly once: the
 *   seal rule acknowledged (job 1) and the first calibration stage
 *   carried out (job 2), a carried piece counted; a later set-down or
 *   disposal leaves the record as it was.
 *
 * A second session takes the work orders first: the board read, "Still
 * working." and a released Quality Packet shown as a record close
 * nothing; the optional filter swap accepted (job 1) and the Component
 * Locker's first use (job 2) are each one first departure.
 *
 * NOT covered here: a station held back after a reload (no cutting job
 * can be open then); the qualifying actions of the Case Workspace, the
 * presses, the Dispatch Console, the Conduit Lattice Bench, the Assembly
 * Bench, the Quality Packet and the return-shift stations. The measured
 * geometry of the annex (every reachable pick-up position, the mirrored
 * pairs, the walking cost) is the pure test of `m04_cutting.spec.ts`.
 *
 * Both primaries are reproduced offline from the raw families through the
 * read-only extractor. Press B, the ordinary order of the route and the
 * departure by leaving the room stay with `m03_m04_route.spec.ts`.
 *
 * `U14C_ALIAS=1` boots the developer alias of the Workshop instead of
 * walking from the Dock (driver convenience for a local repeat of the
 * first session up to the work orders, which the alias does not have;
 * the recorded evidence is the run from the Dock).
 */
import { expect, type Page, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { M03_SPEC, M03_TOOLS } from '../src/pilot/windows/m03RestoreModel';
import {
  M04_NO_ORDER_LINE,
  M04_PIECES,
  M04_SET_DOWN_LINE,
} from '../src/pilot/windows/m04CuttingModel';
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
  ANNEX_DRIVER,
  annexPieceStand,
  bootPilot,
  bootPilotScene,
  concourseToWorkshop,
  dockToConcourse,
  interactAt,
  openPromptAt,
  PILOT,
  registryApproach,
  routeToWorkshopWork,
  valeHandover,
  walkTo,
  workshopVia,
} from './pilotHelpers';
import {
  clickElement,
  closeSurface,
  lastFeedback,
  openWorkshopSurface,
  promptCardLabels,
  surface,
  waitSurface,
} from './returnHelpers';

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

interface SetDownProbe {
  visible: boolean;
  text: string | null;
  status: string | null;
  key: string;
  hovered: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The bin as a target of the carried piece (DEV probe of the scene). */
interface BinProbe {
  carrying: string | null;
  released: boolean;
  been_outside: boolean;
  acquired: boolean;
  drag_held: boolean;
  in_range: boolean;
  outlined: boolean;
  watching: string | null;
}

const CONTEXT = { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false };
const M03_FAMILY = 'proto_m03tools_';
const M04_FAMILY = 'proto_m04_cutting_';
const [BRUSH] = M03_TOOLS.map((tool) => tool.definitionId);
const SHOTS = 'test-results/u14c';
/** The screenshots U14-D2 requires of this session (3 to 6; 800 × 600). */
const SHOTS_D = 'test-results/u14d';
/** Words neither item may show a participant. */
const NO_CLEANUP_CUE =
  /tidy|tidi|neat|clean|put away|put back|restore|mess|throw|bin it|should|please/i;
/** What the cutter and the set-down control may never ask for. */
const NO_DEPARTURE_CUE = /another|other work|order|leave|dispos|\bbin\b/i;
/**
 * The cutter's status names its own cutting order (owner ruling 4) and
 * nothing else: no work elsewhere, no leaving, no tidying, no bin.
 */
const NO_STATUS_CUE =
  /another|other|elsewhere|leave|go |begin|start|dispos|\bbin\b|re-arm/i;
const SET_DOWN_TEXT = 'X — Set down';
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

/**
 * Where a lying piece is drawn, in ROOM pixels (null when it does not
 * lie): the centre of its probe rectangle, taken back through the design
 * space and the room camera of the same frame — so the place can be
 * compared wherever the avatar, and with it the camera, stands.
 */
async function pieceRect(page: Page, objectId: string) {
  return page.evaluate((id) => {
    const w = window as unknown as {
      __physicalProbe?: {
        objects: {
          id: string;
          x: number;
          y: number;
          width: number;
          height: number;
        }[];
      } | null;
      __designSpace?: { offsetX: number; offsetY: number; scale: number };
      __cameraProbe?: {
        viewX: number;
        viewY: number;
        plate: { scale: number };
      } | null;
    };
    const object = w.__physicalProbe?.objects.find((entry) => entry.id === id);
    const space = w.__designSpace;
    const camera = w.__cameraProbe;

    if (object === undefined || space === undefined || !camera) {
      return null;
    }

    const canvasX = space.offsetX + (object.x + object.width / 2) * space.scale;
    const canvasY =
      space.offsetY + (object.y + object.height / 2) * space.scale;

    return {
      x: Math.round(camera.viewX + canvasX / camera.plate.scale),
      y: Math.round(camera.viewY + canvasY / camera.plate.scale),
    };
  }, objectId);
}

/** The piece lies, and is drawn at the fixed place the job gives it. */
async function expectAtItsPlace(page: Page, objectId: string) {
  const drawn = await pieceRect(page, objectId);
  const place = placeOf(objectId);

  expect(drawn, `${objectId} lies`).not.toBeNull();
  expect(Math.abs(drawn!.x - place.x), `${objectId} x`).toBeLessThanOrEqual(1);
  expect(Math.abs(drawn!.y - place.y), `${objectId} y`).toBeLessThanOrEqual(1);
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

async function countOf(page: Page, eventType: string): Promise<number> {
  return (await getEvents(page)).filter(
    (event) => event.event_type === eventType,
  ).length;
}

/** The set-down control as the scene publishes it (DEV probe). */
async function setDownProbe(page: Page): Promise<SetDownProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __m04SetDownProbe?: SetDownProbe | null })
        .__m04SetDownProbe ?? null,
  );
}

/** The page point of the middle of the set-down control. */
async function setDownPoint(page: Page) {
  const control = (await setDownProbe(page))!;

  expect(control.visible).toBe(true);

  return designToPage(
    page,
    control.x + control.width / 2,
    control.y + control.height / 2,
  );
}

/** A real pointer click on the set-down control. */
async function clickSetDown(page: Page) {
  const point = await setDownPoint(page);

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(400);
}

async function binProbe(page: Page): Promise<BinProbe> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __m04BinProbe?: BinProbe | null })
        .__m04BinProbe ?? null,
  );

  expect(probe).not.toBeNull();

  return probe!;
}

/**
 * A piece is in the hands and the bin is NOT its target: no line names
 * the bin, the bin is not outlined, nothing was dropped into it.
 */
async function expectNoBinCue(page: Page, objectId: string, when: string) {
  const what = `${objectId} ${when}`;
  const probe = await binProbe(page);

  expect(probe.carrying, what).toBe(objectId);
  expect(probe.acquired, what).toBe(false);
  expect(probe.outlined, what).toBe(false);
  expect(await promptLine(page), what).not.toBe(BIN_LINE);
  expect(String(await promptLine(page)), what).not.toMatch(/\bbin\b|dispos/i);
  expect(await carriedPiece(page), what).toBe(objectId);
}

/** A point of the room in the 800 × 600 design space (the same frame). */
async function designOf(page: Page, at: { x: number; y: number }) {
  return page.evaluate((point) => {
    const w = window as unknown as {
      __designSpace?: { offsetX: number; offsetY: number; scale: number };
      __cameraProbe?: {
        viewX: number;
        viewY: number;
        plate: { scale: number };
      } | null;
    };
    const space = w.__designSpace!;
    const camera = w.__cameraProbe!;

    return {
      x:
        ((point.x - camera.viewX) * camera.plate.scale - space.offsetX) /
        space.scale,
      y:
        ((point.y - camera.viewY) * camera.plate.scale - space.offsetY) /
        space.scale,
    };
  }, at);
}

/**
 * The control as it is shown with `objectId` in the hands: its own line,
 * the carried-item line beside it, whole inside the design space and
 * BESIDE THE AVATAR — never in a far corner.
 */
async function expectSetDownControl(page: Page, objectId: string) {
  const control = (await setDownProbe(page))!;

  expect(control.visible).toBe(true);
  expect(control.key).toBe('X');
  expect(control.text).toBe(SET_DOWN_TEXT);
  expect(control.status).toBe(`Carrying: ${labelOf(objectId)}`);

  for (const line of [control.text, control.status]) {
    expect(line).not.toMatch(NO_CLEANUP_CUE);
    expect(line).not.toMatch(NO_DEPARTURE_CUE);
  }

  expect(control.x).toBeGreaterThanOrEqual(0);
  expect(control.y).toBeGreaterThanOrEqual(0);
  expect(control.x + control.width).toBeLessThanOrEqual(800);
  expect(control.y + control.height).toBeLessThanOrEqual(600);
  // A pointer target that can be read and hit.
  expect(control.width).toBeGreaterThanOrEqual(88);
  expect(control.height).toBeGreaterThanOrEqual(22);

  const figure = await designOf(page, await avatar(page));
  const middle = {
    x: control.x + control.width / 2,
    y: control.y + control.height / 2,
  };

  expect(Math.abs(middle.x - figure.x)).toBeLessThanOrEqual(220);
  expect(Math.abs(middle.y - figure.y)).toBeLessThanOrEqual(190);

  return control;
}

function pieceOf(objectId: string) {
  return M04_PIECES.find((piece) => piece.object_id === objectId)!;
}

function labelOf(objectId: string): string {
  return pieceOf(objectId).label;
}

/** Where a piece lies (room px). */
function placeOf(objectId: string): { x: number; y: number } {
  const piece = pieceOf(objectId);

  return {
    x: WORKSHOP_SITES.cutterScatter.x + piece.dx,
    y: WORKSHOP_SITES.cutterScatter.y + piece.dy,
  };
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

/** Where the cutter is operated from: north of it (the registry's point). */
const CUTTER_STAND = registryApproach('workshop.sample_cutter');
/** Where the cutter stood before U14-D2: a place of the machine bay. */
const OLD_CUTTER_STAND = { x: 348, y: 230 };
/** A place of the annex with no piece, no station and no bin in reach. */
const NOTHING_IN_REACH = [
  { x: 300, y: 416 },
  { x: 304, y: 418 },
  { x: 296, y: 414 },
];

/** Where the avatar stands to reach a piece by keyboard (driver only). */
function standBy(objectId: string): { x: number; y: number } {
  return annexPieceStand(placeOf(objectId));
}

/**
 * Stands beside a piece and MEASURES the state before anything is
 * pressed: no station within its 72 px range, no bundle in reach, the
 * bin beyond its reach and the approved margin (76 px), the piece within
 * keyboard reach and nearer than every other lying piece.
 */
async function standBesidePiece(page: Page, objectId: string) {
  const spot = standBy(objectId);

  await workshopVia(page, spot.x, spot.y);
  await page.waitForTimeout(250);

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

    expect(away(at), `${name} from ${stood.x},${stood.y}`).toBeGreaterThan(72);
  }

  expect(await nearestBundle(page)).toBeNull();
  expect(away(placeOf(objectId))).toBeLessThanOrEqual(64);
  expect(away(WORKSHOP_SITES.disposalChute)).toBeGreaterThan(76);
  expect((await binProbe(page)).in_range).toBe(false);

  for (const other of await lyingPieces(page)) {
    if (other !== objectId) {
      expect(
        away(placeOf(other)),
        `${other} against ${objectId} from ${stood.x},${stood.y}`,
      ).toBeGreaterThan(away(placeOf(objectId)));
    }
  }

  return stood;
}

/**
 * Walks to the bin the way a participant acquires it: down the clear
 * column on the avatar's side of the cutter to a place OUTSIDE the bin's
 * range, then into it — the pocket beside the bin. No interaction key is
 * touched (the driver taps the arrow keys only), so a key the test holds
 * stays held all the way.
 */
async function toBin(page: Page) {
  const west = (await avatar(page)).x < ANNEX_DRIVER.doorX;
  const pocket = west ? ANNEX_DRIVER.binWest : ANNEX_DRIVER.binEast;

  await workshopVia(
    page,
    west ? ANNEX_DRIVER.westX : ANNEX_DRIVER.eastX,
    pocket.y,
  );
  expect((await binProbe(page)).in_range).toBe(false);
  await driveAxisTo(page, 'x', pocket.x, 6);
  await page.waitForTimeout(250);

  const at = await avatar(page);

  expect(
    Math.hypot(
      at.x - WORKSHOP_SITES.disposalChute.x,
      at.y - WORKSHOP_SITES.disposalChute.y,
    ),
  ).toBeLessThanOrEqual(64);
  expect((await binProbe(page)).in_range).toBe(true);
}

/** Drops the carried piece into the bin by a real pointer click on it. */
async function disposeByPointer(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickPhysicalContainer(page, 'm04_disposal');

    if ((await carriedPiece(page)) === null) {
      return;
    }

    await page.waitForTimeout(400);
  }

  throw new Error(
    `the bin did not take the carried piece (avatar at ${JSON.stringify(await avatar(page))})`,
  );
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

/** Opens and closes the station map (M, then ESC). */
async function openAndCloseMap(page: Page) {
  const mapOpen = (expected: boolean) =>
    page.waitForFunction(
      (wanted) =>
        ((window as unknown as { __pilotMapProbe?: { open: boolean } | null })
          .__pilotMapProbe?.open ?? false) === wanted,
      expected,
      { timeout: 6000 },
    );

  await press(page, 'm');
  await mapOpen(true);
  await press(page, 'Escape');
  await mapOpen(false);
  await page.waitForTimeout(300);
}

/** Opens and closes the backpack (I, then ESC). */
async function openAndCloseBackpack(page: Page) {
  await press(page, 'i');
  await waitOverlay(page, true);
  expect((await uiProbe(page))!.mode).toBe('backpack');
  await page.keyboard.press('Escape');
  await waitOverlay(page, false);
}

async function firstDepartures(page: Page): Promise<RawGameEvent[]> {
  return of(await family(page, M04_FAMILY), M04_FAMILY, 'first_departure');
}

/**
 * ONE sequence for every piece of both jobs (matched administration):
 * named and lifted by keyboard on open floor, set down with X where it
 * lay; lifted by a pointer click from the same place, set down by a click
 * on the control. After each pick-up the bin is no target: no line, no
 * outline. Returns whether the avatar stood within the bin's range when
 * the piece was lifted.
 */
async function liftBothWays(page: Page, objectId: string) {
  const lying = await lyingPieces(page);

  await standBesidePiece(page, objectId);
  expect(await promptLine(page)).toBe(`E / Space — Take ${labelOf(objectId)}`);
  expect(await promptLine(page)).toMatch(PIECE_LINE);
  await expectAtItsPlace(page, objectId);

  const inRange = (await binProbe(page)).in_range;

  await press(page, 'Space');
  await page.waitForTimeout(400);
  await expectNoBinCue(page, objectId, 'lifted by keyboard');
  expect(await pieceRect(page, objectId)).toBeNull();
  await expectSetDownControl(page, objectId);
  await press(page, 'x');
  await page.waitForTimeout(300);
  expect(await lastFeedback(page)).toBe(M04_SET_DOWN_LINE);
  expect(await carriedPiece(page)).toBeNull();
  await expectAtItsPlace(page, objectId);
  expect((await setDownProbe(page))?.visible).toBe(false);

  await clickPhysicalObject(page, objectId);
  await expectNoBinCue(page, objectId, 'lifted by pointer');
  await expectSetDownControl(page, objectId);
  await clickSetDown(page);
  expect(await lastFeedback(page)).toBe(M04_SET_DOWN_LINE);
  expect(await carriedPiece(page)).toBeNull();
  await expectAtItsPlace(page, objectId);
  expect(await lyingPieces(page)).toEqual(lying);
  expect((await setDownProbe(page))?.visible).toBe(false);

  return { objectId, lifted_within_the_bins_range: inRange };
}

/** The page points of a lying piece and of the bin (pointer targets). */
async function pointerTargets(page: Page, objectId: string) {
  const probe = (await physicalProbe(page))!;
  const object = probe.objects.find((entry) => entry.id === objectId)!;
  const bin = probe.containers.find((entry) => entry.id === 'm04_disposal')!;

  expect(object, `${objectId} lies`).toBeDefined();
  expect(bin).toBeDefined();

  return {
    piece: await designToPage(
      page,
      object.x + object.width / 2,
      object.y + object.height / 2,
    ),
    bin: await designToPage(
      page,
      bin.x + bin.width / 2,
      bin.y + bin.height / 2,
    ),
  };
}

/** The page point of the middle of the bin (a pointer target). */
async function binPoint(page: Page) {
  const bin = (await physicalProbe(page))!.containers.find(
    (entry) => entry.id === 'm04_disposal',
  );

  expect(bin).toBeDefined();

  return designToPage(page, bin!.x + bin!.width / 2, bin!.y + bin!.height / 2);
}

/** A point of the page that lies outside the game canvas. */
async function outsideTheCanvas(page: Page) {
  const box = (await page.locator('canvas').boundingBox())!;
  const view = page.viewportSize()!;

  if (box.x >= 6) {
    return { x: box.x - 4, y: box.y + box.height / 2 };
  }

  if (box.y >= 6) {
    return { x: box.x + box.width / 2, y: box.y - 4 };
  }

  if (box.x + box.width <= view.width - 6) {
    return { x: box.x + box.width + 4, y: box.y + box.height / 2 };
  }

  if (box.y + box.height <= view.height - 6) {
    return { x: box.x + box.width / 2, y: box.y + box.height + 4 };
  }

  return null;
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

test.describe('U14-C / U14-D: M03 / M04 observation order, interaction targeting and the cleanup choice', () => {
  test('direct access: Press A by pointer with TAB / SHIFT+TAB; the cutting jobs with matched lines, every piece lifted both ways by one sequence with no bin cue, the bin only after release and acquisition, set-down beside the avatar, and a first departure only at accepted work', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

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

    // The M03 record is complete here; nothing below may add to it.
    const m03Recorded = JSON.stringify(await family(page, M03_FAMILY));

    // ——— The place the cutter left in the machine bay (U14-D2) ———
    // Where the cutter was operated until now there is floor, and no
    // press there reaches a cutter: nothing of M04 is written.
    await workshopVia(page, OLD_CUTTER_STAND.x, OLD_CUTTER_STAND.y);
    await page.waitForTimeout(250);
    expect(await promptLine(page)).not.toBe(CUTTER_LINE);

    const atOldPlace = await avatar(page);

    expect(Math.abs(atOldPlace.x - OLD_CUTTER_STAND.x)).toBeLessThanOrEqual(12);
    expect(Math.abs(atOldPlace.y - OLD_CUTTER_STAND.y)).toBeLessThanOrEqual(12);
    // The avatar walks ACROSS the floor the cutter island stood on.
    await driveAxisTo(page, 'x', 436, 8);
    expect(Math.abs((await avatar(page)).x - 436)).toBeLessThanOrEqual(12);
    expect(await promptLine(page)).not.toBe(CUTTER_LINE);
    expect(await family(page, M04_FAMILY)).toEqual([]);

    // ——— Sample Cutter, used before the orders list the coupons ———
    // In its annex, through the doorway, operated from the north.
    await workshopVia(page, CUTTER_STAND.x, CUTTER_STAND.y);
    await page.waitForTimeout(250);
    expect(CUTTER_STAND).toEqual({ x: 400, y: 423 });
    expect((await avatar(page)).y).toBeLessThan(WORKSHOP_SITES.sampleCutter.y);
    expect(await promptLine(page)).toBe(CUTTER_LINE);
    expect(await family(page, M04_FAMILY)).toEqual([]);
    expect(await lyingPieces(page)).toEqual([]);
    await page.screenshot({ path: `${SHOTS}-prompt-cutter-800x600.png` });
    await press(page, 'Space');
    await page.waitForTimeout(250);

    // The line at the cut states the cut and nothing else.
    const cutLine1 = await lastFeedback(page);

    expect(cutLine1).toBe('Sample coupon 1 of 2 cut.');
    expect(cutLine1).not.toMatch(NO_CLEANUP_CUE);
    expect(cutLine1).not.toMatch(NO_DEPARTURE_CUE);

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
      entry_state_version: 'm04-cutting-v4',
      input_mode: 'keyboard',
    });
    expect(meta(m04[1]).entry_state_version).toBe('m04-cutting-v4');
    expect(meta(m04[1]).entry_state_snapshot).toMatchObject({
      occasion_id: 'o1',
      departure: 'other_station_work_begun_or_room_exit',
      set_down_available: true,
      set_down_counts_as: 'undisposed',
      cut_feedback: 'same_line_for_both_jobs',
      cleanup_instructed: false,
      cleanup_rewarded: false,
      piece_offsets: M04_PIECES.filter((piece) => piece.job === 'o1').map(
        ({ object_id, dx, dy }) => ({ object_id, dx, dy }),
      ),
    });
    expect(await lyingPieces(page)).toEqual([
      'm04_offcut_a',
      'm04_swarf_a',
      'm04_wrap_a',
    ]);
    // The snapshot's offsets are the approved v4 places, west of the
    // cutter, and the three pieces are drawn there.
    expect(
      (
        meta(m04[1]).entry_state_snapshot as {
          piece_offsets: { object_id: string; dx: number; dy: number }[];
        }
      ).piece_offsets,
    ).toEqual([
      { object_id: 'm04_offcut_a', dx: -172, dy: 20 },
      { object_id: 'm04_swarf_a', dx: -188, dy: 60 },
      { object_id: 'm04_wrap_a', dx: -188, dy: 100 },
    ]);

    for (const objectId of ['m04_offcut_a', 'm04_swarf_a', 'm04_wrap_a']) {
      await expectAtItsPlace(page, objectId);
      expect(placeOf(objectId).x).toBeLessThan(WORKSHOP_SITES.sampleCutter.x);
    }

    // The cut names no bin and outlines none.
    expect((await binProbe(page)).outlined).toBe(false);
    expect(String(await promptLine(page))).not.toMatch(/\bbin\b|dispos/i);
    // Nothing is shown about setting down while the hands are empty.
    expect((await setDownProbe(page))?.visible).toBe(false);
    // REQUIRED SCREENSHOT 3: job 1's three pieces, the cluster west of
    // the cutter, after cut 1.
    await page.screenshot({
      path: `${SHOTS_D}-3-job1-west-cluster-800x600.png`,
    });
    await page.waitForTimeout(1_600);

    // After the settle window the cutter STILL keeps the press: within a
    // station's range no piece is named. Checked, the cutter states that
    // it has no cutting order — a status, no instruction — and nothing is
    // lifted.
    expect(await promptLine(page)).toBe(CUTTER_LINE);
    await press(page, 'Space');
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe('No cutting order is available.');
    expect(await lastFeedback(page)).toBe(M04_NO_ORDER_LINE);
    expect(M04_NO_ORDER_LINE).not.toMatch(NO_CLEANUP_CUE);
    expect(M04_NO_ORDER_LINE).not.toMatch(NO_STATUS_CUE);
    expect(await carriedPiece(page)).toBeNull();
    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'job_unavailable').map((e) => [
        meta(e).reason,
        meta(e).input_mode,
      ]),
    ).toEqual([['job_open', 'keyboard']]);
    expect(of(m04, M04_FAMILY, 'piece_picked_up')).toHaveLength(0);

    // ——— Out of the annex, the pieces lying: nothing is closed ———
    // The Component Locker's approach in the machine bay (U14-D3: on the
    // north wall, (555, 190)). Walking out of the annex while staying in
    // the Records Workshop is no departure, and standing at a station is
    // none either.
    await workshopVia(page, 555, 190);
    await page.waitForTimeout(250);
    expect(await promptLine(page)).toBe(LOCKER_LINE);
    expect(await lyingPieces(page)).toHaveLength(3);
    expect(await carriedPiece(page)).toBeNull();
    expect(await firstDepartures(page)).toHaveLength(0);
    expect((await family(page, M04_FAMILY)).length).toBe(m04.length);

    // ——— Job 1: every piece by keyboard AND by pointer, one sequence ———
    const exposure1 = [];

    for (const objectId of ['m04_offcut_a', 'm04_wrap_a', 'm04_swarf_a']) {
      exposure1.push(await liftBothWays(page, objectId));
    }

    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'piece_picked_up').map((e) => [
        meta(e).object_id,
        meta(e).input_mode,
        meta(e).origin,
      ]),
    ).toEqual([
      ['m04_offcut_a', 'keyboard', 'open_floor_press'],
      ['m04_offcut_a', 'pointer', 'pointer'],
      ['m04_wrap_a', 'keyboard', 'open_floor_press'],
      ['m04_wrap_a', 'pointer', 'pointer'],
      ['m04_swarf_a', 'keyboard', 'open_floor_press'],
      ['m04_swarf_a', 'pointer', 'pointer'],
    ]);
    // `input_mode` alone tells who set the piece down: no `by`.
    expect(
      of(m04, M04_FAMILY, 'piece_put_back').map((e) => [
        meta(e).object_id,
        meta(e).input_mode,
        meta(e).after_departure,
        'by' in meta(e),
      ]),
    ).toEqual([
      ['m04_offcut_a', 'keyboard', false, false],
      ['m04_offcut_a', 'pointer', false, false],
      ['m04_wrap_a', 'keyboard', false, false],
      ['m04_wrap_a', 'pointer', false, false],
      ['m04_swarf_a', 'keyboard', false, false],
      ['m04_swarf_a', 'pointer', false, false],
    ]);
    // Six pick-ups and six set-downs: nothing is disposed, nothing closed.
    expect(of(m04, M04_FAMILY, 'piece_disposed')).toHaveLength(0);
    expect(of(m04, M04_FAMILY, 'late_disposal')).toHaveLength(0);
    expect(of(m04, M04_FAMILY, 'first_departure')).toHaveLength(0);

    // Every one of those pick-ups was made outside the bin's range.
    expect(
      exposure1.map((entry) => entry.lifted_within_the_bins_range),
    ).toEqual([false, false, false]);

    // ——— A key HELD, repeated and pressed again: never a disposal ———
    // The coupon offcut is lifted where it lies, outside the bin's range
    // (as every piece is, `m04-cutting-v4`).
    await standBesidePiece(page, 'm04_offcut_a');

    const beforeHeld = (await family(page, M04_FAMILY)).length;

    await page.keyboard.down('Space');
    await page.waitForTimeout(400);
    await expectNoBinCue(page, 'm04_offcut_a', 'with the key held');
    expect((await binProbe(page)).released).toBe(false);

    // The key repeats (the keyboard's own repeat) while it is held.
    for (let repeat = 0; repeat < 4; repeat += 1) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(150);
    }

    await expectNoBinCue(page, 'm04_offcut_a', 'with the key repeating');
    // The OTHER interaction key, pressed while the first is still held.
    await press(page, 'e');
    await expectNoBinCue(page, 'm04_offcut_a', 'with a second key pressed');
    expect((await binProbe(page)).released).toBe(false);
    await page.keyboard.up('Space');
    await page.waitForTimeout(400);

    // Every key released: the bin is out of reach and no target.
    let gate = await binProbe(page);

    expect(gate).toMatchObject({
      carrying: 'm04_offcut_a',
      released: true,
      in_range: false,
      been_outside: true,
      acquired: false,
      outlined: false,
    });
    await expectNoBinCue(page, 'm04_offcut_a', 'with every key released');
    // REQUIRED SCREENSHOT 5: a piece in the hands right after the
    // pick-up, the local set-down control beside the avatar, no line and
    // no outline for the bin.
    await expectSetDownControl(page, 'm04_offcut_a');
    await page.screenshot({
      path: `${SHOTS_D}-5-carried-set-down-no-bin-cue-800x600.png`,
    });

    // Quick repeated presses there drop nothing: with the hands full the
    // press names the piece lying in reach and says why it is not lifted.
    for (const interactKey of ['Space', 'e', 'Space', 'Space']) {
      await press(page, interactKey);
      await page.waitForTimeout(120);
      expect(await lastFeedback(page)).toBe('Hands full.');
      await expectNoBinCue(page, 'm04_offcut_a', `after ${interactKey}`);
    }

    // All of it recorded the pick-up and nothing else.
    m04 = await family(page, M04_FAMILY);
    expect(m04.length).toBe(beforeHeld + 1);
    expect(meta(m04.at(-1)!)).toMatchObject({
      object_id: 'm04_offcut_a',
      input_mode: 'keyboard',
      origin: 'open_floor_press',
    });
    expect(of(m04, M04_FAMILY, 'piece_disposed')).toHaveLength(0);
    await press(page, 'x');
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe(M04_SET_DOWN_LINE);
    expect(await carriedPiece(page)).toBeNull();
    await expectAtItsPlace(page, 'm04_offcut_a');
    // X with empty hands does nothing.
    m04 = await family(page, M04_FAMILY);
    await press(page, 'x');
    await page.waitForTimeout(300);
    expect((await family(page, M04_FAMILY)).length).toBe(m04.length);

    // ——— The pointer: one press is never a pick-up AND a disposal ———
    await standBesidePiece(page, 'm04_wrap_a');

    let targets = await pointerTargets(page, 'm04_wrap_a');

    // A press that wavers (below the drag threshold) and is released.
    await page.mouse.move(targets.piece.x, targets.piece.y);
    await page.mouse.down();
    await page.mouse.move(targets.piece.x + 2, targets.piece.y + 2);
    await page.mouse.up();
    await page.waitForTimeout(400);
    await expectNoBinCue(page, 'm04_wrap_a', 'lifted by a wavering click');

    // The control shows that it is targeted while the pointer is on it.
    let control = await expectSetDownControl(page, 'm04_wrap_a');

    expect(control.hovered).toBe(false);

    const point = await setDownPoint(page);

    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(250);
    control = (await setDownProbe(page))!;
    expect(control.hovered).toBe(true);
    await page.screenshot({
      path: `${SHOTS_D}-set-down-targeted-800x600.png`,
    });

    // Pressed on the control and RELEASED OUTSIDE THE CANVAS: the piece
    // is set down and the pointer works afterwards.
    const outside = await outsideTheCanvas(page);

    await page.mouse.down();
    await page.waitForTimeout(200);
    expect(await carriedPiece(page)).toBeNull();

    if (outside !== null) {
      await page.mouse.move(outside.x, outside.y, { steps: 4 });
    }

    await page.mouse.up();
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe(M04_SET_DOWN_LINE);
    await expectAtItsPlace(page, 'm04_wrap_a');
    await clickPhysicalObject(page, 'm04_wrap_a');
    expect(await carriedPiece(page)).toBe('m04_wrap_a');
    await expectNoBinCue(page, 'm04_wrap_a', 'lifted after the release');
    await clickSetDown(page);
    expect(await carriedPiece(page)).toBeNull();
    m04 = await family(page, M04_FAMILY);
    expect(of(m04, M04_FAMILY, 'piece_picked_up')).toHaveLength(9);
    expect(of(m04, M04_FAMILY, 'piece_put_back')).toHaveLength(9);
    expect(of(m04, M04_FAMILY, 'piece_disposed')).toHaveLength(0);

    // ——— A key held ALL THE WAY to the bin: nothing is acquired ———
    await standBesidePiece(page, 'm04_wrap_a');
    expect(await promptLine(page)).toBe('E / Space — Take blade wrap');
    await page.keyboard.down('Space');
    await page.waitForTimeout(400);
    expect(await carriedPiece(page)).toBe('m04_wrap_a');
    // Walked to the bin with the key never released.
    await toBin(page);
    gate = await binProbe(page);
    expect(gate).toMatchObject({
      carrying: 'm04_wrap_a',
      released: false,
      in_range: true,
      acquired: false,
      outlined: false,
    });
    await expectNoBinCue(page, 'm04_wrap_a', 'carried to the bin, key held');
    // A second key there, the first still held: nothing is dropped.
    await press(page, 'e');
    await expectNoBinCue(page, 'm04_wrap_a', 'second key beside the bin');
    await page.keyboard.up('Space');
    await page.waitForTimeout(400);
    gate = await binProbe(page);
    expect(gate).toMatchObject({
      released: true,
      in_range: true,
      acquired: false,
      outlined: false,
    });
    // Released within the range it entered with the key held: a press
    // there drops nothing either — the bin was not approached afresh.
    await press(page, 'Space');
    await page.waitForTimeout(300);
    await expectNoBinCue(page, 'm04_wrap_a', 'pressed without acquisition');
    expect(await lastFeedback(page)).toBe('Carrying the blade wrap.');
    expect(
      of(await family(page, M04_FAMILY), M04_FAMILY, 'piece_disposed'),
    ).toHaveLength(0);

    // Hands full on OPEN FLOOR, the coupon offcut in reach and the bin
    // out of reach: the piece is named, the press says why nothing is
    // lifted, and nothing is recorded.
    m04 = await family(page, M04_FAMILY);

    const openedBefore = await stationsOpened(page);
    const lyingBefore = await lyingPieces(page);

    await standBesidePiece(page, 'm04_offcut_a');
    expect(await promptLine(page)).toBe('E / Space — Take coupon offcut');

    for (const interactKey of ['Space', 'e']) {
      await press(page, interactKey);
      await page.waitForTimeout(300);
      expect(await lastFeedback(page)).toBe('Hands full.');
      expect(await carriedPiece(page)).toBe('m04_wrap_a');
      expect(await lyingPieces(page)).toEqual(lyingBefore);
      expect((await family(page, M04_FAMILY)).length).toBe(m04.length);
      expect(await stationsOpened(page)).toEqual(openedBefore);
      expect((await uiProbe(page))?.open ?? false).toBe(false);
    }

    await page.screenshot({ path: `${SHOTS}-feedback-hands-full-800x600.png` });

    // Nothing in reach, a piece in the hands: the press states what is
    // held.
    await workshopVia(page, NOTHING_IN_REACH[0].x, NOTHING_IN_REACH[0].y);
    expect(
      await standWhere(
        page,
        NOTHING_IN_REACH,
        (line) => line === null,
        'no line',
      ),
    ).toBeNull();
    await press(page, 'Space');
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe('Carrying the blade wrap.');
    await page.screenshot({ path: `${SHOTS}-feedback-carrying-800x600.png` });
    expect(await carriedPiece(page)).toBe('m04_wrap_a');
    expect((await family(page, M04_FAMILY)).length).toBe(m04.length);
    gate = await binProbe(page);
    expect(gate).toMatchObject({
      released: true,
      in_range: false,
      been_outside: true,
      acquired: false,
    });

    // ——— Disposal by keyboard: the bin walked up to is the target ———
    await toBin(page);
    await page.waitForTimeout(250);
    gate = await binProbe(page);
    expect(gate).toMatchObject({
      carrying: 'm04_wrap_a',
      released: true,
      in_range: true,
      acquired: true,
      outlined: true,
    });
    expect(await promptLine(page)).toBe(BIN_LINE);
    // REQUIRED SCREENSHOT 6: the bin acquired only after the input was
    // released and the bin deliberately approached.
    await page.screenshot({
      path: `${SHOTS_D}-6-bin-acquired-after-release-800x600.png`,
    });
    await press(page, 'Space');
    await page.waitForTimeout(400);
    expect(await carriedPiece(page)).toBeNull();
    expect(await lastFeedback(page)).toBe('Disposed.');
    expect((await setDownProbe(page))?.visible).toBe(false);
    // One press, one disposal.
    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'piece_disposed').map((e) => [
        meta(e).object_id,
        meta(e).input_mode,
        meta(e).origin,
      ]),
    ).toEqual([['m04_wrap_a', 'keyboard', 'open_floor_press']]);
    // Nothing carried, the bin in reach: the bin is not named.
    expect(await promptLine(page)).not.toBe(BIN_LINE);
    expect((await binProbe(page)).outlined).toBe(false);
    // The disposal closed nothing.
    expect(of(m04, M04_FAMILY, 'first_departure')).toHaveLength(0);

    // ——— What does NOT close the job ———
    const beforeNonQualifying = (await family(page, M04_FAMILY)).length;
    const maps = await countOf(page, 'pilot_map_opened');

    // The station map.
    await openAndCloseMap(page);
    expect(await countOf(page, 'pilot_map_opened')).toBe(maps + 1);
    // The backpack.
    await openAndCloseBackpack(page);

    // The Assembly Bench opened and closed: a panel shown, no work done.
    let opened = await stationsOpened(page);

    await workshopVia(page, 578, 252);
    await page.waitForTimeout(250);
    expect(await promptLine(page)).toBe('E / Space — Use Assembly Bench');
    await press(page, 'Space');
    await waitOverlay(page, true);
    expect((await uiProbe(page))!.mode).toBe('workbench');
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);
    expect(await stationsOpened(page)).toEqual([...opened, 'assembly_bench']);
    expect(await firstDepartures(page)).toHaveLength(0);

    // A supply bundle collected.
    const bundles = await bundleCount(page);

    expect(bundles).toBeGreaterThan(0);
    await workshopVia(page, 348, 236);

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

    expect(bundleLine).toBe('E — Take sample kit');
    await page.screenshot({ path: `${SHOTS}-prompt-bundle-800x600.png` });
    await press(page, 'Space');
    await page.waitForTimeout(500);
    expect(await bundleCount(page)).toBe(bundles - 1);
    expect(await carriedPiece(page)).toBeNull();

    // Two presses that REFUSE: Press A is idle, Press B has no batch.
    opened = await stationsOpened(page);

    await walkTo(page, PILOT.workshop.pressA.x, 204, { yFirst: false });
    await page.waitForTimeout(250);
    expect(await promptLine(page)).toBe('E / Space — Use Label Press A');
    await press(page, 'Space');
    await page.waitForTimeout(500);
    expect((await uiProbe(page))?.open ?? false).toBe(false);
    expect(await lastFeedback(page)).toBe(
      'Label press idle. The batch is done.',
    );
    await walkTo(page, PILOT.workshop.pressB.x, 204, { yFirst: false });
    await page.waitForTimeout(250);
    expect(await promptLine(page)).toBe('E / Space — Use Label Press B');
    await press(page, 'Space');
    await page.waitForTimeout(500);
    expect((await uiProbe(page))?.open ?? false).toBe(false);
    expect(await lastFeedback(page)).toBe(
      'No batch scheduled on this press right now.',
    );
    // Both presses were reached — and refused.
    expect(await stationsOpened(page)).toEqual([
      ...opened,
      'press_a',
      'press_b',
    ]);

    // The Calibration Bench opened and closed: its surface shown, no
    // stage carried out.
    await openWorkshopSurface(
      page,
      'calibrationBench',
      'm07_calibration_bench',
    );
    await closeSurface(page);
    expect(await stationsOpened(page)).toContain('calibration_bench');

    // The seal log read and closed.
    await workshopVia(page, 1224, 196);
    await openPromptAt(page, PILOT.workshop.sealLog, {
      approachOffset: { x: 13, y: 54 },
    });
    expect(await promptCardLabels(page)).toEqual([
      'Acknowledge the seal rule',
      'Close log',
    ]);
    await selectPromptOption(page, 2);
    await page.waitForTimeout(400);
    expect(await stationsOpened(page)).toContain('seal_log');
    expect(
      await countOf(page, 'secondary_m11_seal_obligation_acknowledged'),
    ).toBe(0);

    // None of it wrote an M04 event; the job is open as it was.
    m04 = await family(page, M04_FAMILY);
    expect(m04.length).toBe(beforeNonQualifying);
    expect(of(m04, M04_FAMILY, 'first_departure')).toHaveLength(0);
    expect(of(m04, M04_FAMILY, 'state_at_review')).toHaveLength(0);
    // The cutter still has no second coupon: the job awaits its departure.
    expect(await lyingPieces(page)).toEqual(['m04_offcut_a', 'm04_swarf_a']);

    // ——— The seal rule ACKNOWLEDGED: the log's accepted action ———
    await openPromptAt(page, PILOT.workshop.sealLog, {
      approachOffset: { x: 13, y: 54 },
    });
    // The log read again: still nothing.
    expect(await firstDepartures(page)).toHaveLength(0);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    expect(
      await countOf(page, 'secondary_m11_seal_obligation_acknowledged'),
    ).toBe(1);
    m04 = await family(page, M04_FAMILY);

    // That is the first departure of job 1 — exactly one.
    const departure1 = of(m04, M04_FAMILY, 'first_departure');

    expect(departure1).toHaveLength(1);
    expect(meta(departure1[0])).toMatchObject({
      occasion: 'o1',
      opportunity_id: 'proto_m04_cutting_o1',
      window_id: 'm04_cutting_o1',
      trigger: 'other_station',
      detail: 'seal_log',
      departed: true,
      pieces_total: 3,
      pieces_disposed: 1,
      disposed_ids: ['m04_wrap_a'],
      carried_piece: null,
      pieces_lying: 2,
      undisposed_at_departure: 2,
      pickups: 10,
      put_backs: 9,
      snapshot_permanent: true,
      entry_state_version: 'm04-cutting-v4',
    });

    const recorded = JSON.stringify(departure1[0]);

    // The acknowledged log read again records nothing more.
    await openPromptAt(page, PILOT.workshop.sealLog, {
      approachOffset: { x: 13, y: 54 },
    });
    expect(await promptCardLabels(page)).toEqual(['Close log']);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    expect(await firstDepartures(page)).toHaveLength(1);

    // ——— Later: a set-down and a disposal leave the record as it was ———
    await standBesidePiece(page, 'm04_offcut_a');
    await press(page, 'Space');
    await page.waitForTimeout(400);
    await expectNoBinCue(page, 'm04_offcut_a', 'lifted after the departure');
    // Set down from ANOTHER place: the piece goes back where it lay.
    await workshopVia(page, NOTHING_IN_REACH[0].x, NOTHING_IN_REACH[0].y);
    await press(page, 'x');
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe(M04_SET_DOWN_LINE);
    expect(await carriedPiece(page)).toBeNull();
    await standBesidePiece(page, 'm04_offcut_a');
    expect(await promptLine(page)).toBe('E / Space — Take coupon offcut');
    await expectAtItsPlace(page, 'm04_offcut_a');

    // The swarf tray goes to the bin by pointer: a LATE disposal.
    await standBesidePiece(page, 'm04_swarf_a');
    await clickPhysicalObject(page, 'm04_swarf_a');
    await expectNoBinCue(page, 'm04_swarf_a', 'lifted by pointer, later');
    await toBin(page);
    expect((await binProbe(page)).outlined).toBe(true);
    await disposeByPointer(page);
    expect(await lastFeedback(page)).toBe('Disposed.');
    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'late_disposal').map((e) => [
        meta(e).object_id,
        meta(e).input_mode,
        meta(e).recorded_undisposed_unchanged,
      ]),
    ).toEqual([['m04_swarf_a', 'pointer', 2]]);
    expect(of(m04, M04_FAMILY, 'piece_disposed')).toHaveLength(1);
    expect(
      of(m04, M04_FAMILY, 'piece_put_back')
        .filter((e) => meta(e).after_departure === true)
        .map((e) => [meta(e).object_id, meta(e).input_mode, 'by' in meta(e)]),
    ).toEqual([['m04_offcut_a', 'keyboard', false]]);
    expect(
      of(m04, M04_FAMILY, 'first_departure').map((e) => JSON.stringify(e)),
    ).toEqual([recorded]);

    // ——— Coupon 2: available now, answered by the SAME line ———
    await workshopVia(page, CUTTER_STAND.x, CUTTER_STAND.y);
    await page.waitForTimeout(250);
    expect(await lyingPieces(page)).toEqual(['m04_offcut_a']);
    expect(await promptLine(page)).toBe(CUTTER_LINE);
    await press(page, 'Space');
    await page.waitForTimeout(300);

    const cutLine2 = await lastFeedback(page);

    expect(cutLine2).toBe('Sample coupon 2 of 2 cut.');
    // The two lines differ in the coupon's number only.
    expect(cutLine2!.replace('2 of 2', 'N of 2')).toBe(
      cutLine1!.replace('1 of 2', 'N of 2'),
    );
    expect(await carriedPiece(page)).toBeNull();
    expect(await lyingPieces(page)).toEqual([
      'm04_offcut_a',
      'm04_offcut_b',
      'm04_swarf_b',
      'm04_wrap_b',
    ]);
    // Job 2's pieces are drawn at the approved places EAST of the cutter,
    // each the mirror image of the same kind of piece of job 1; the piece
    // job 1 left stays where it lay.
    for (const objectId of ['m04_offcut_b', 'm04_swarf_b', 'm04_wrap_b']) {
      const twin = placeOf(objectId.replace(/_b$/, '_a'));

      await expectAtItsPlace(page, objectId);
      expect(placeOf(objectId)).toEqual({
        x: 2 * WORKSHOP_SITES.sampleCutter.x - twin.x,
        y: twin.y,
      });
    }

    await expectAtItsPlace(page, 'm04_offcut_a');
    expect((await binProbe(page)).outlined).toBe(false);
    // REQUIRED SCREENSHOT 4: job 2's three pieces, the cluster east of
    // the cutter, after cut 2 — with the piece job 1 left in the west.
    await page.screenshot({
      path: `${SHOTS_D}-4-job2-east-cluster-800x600.png`,
    });
    await page.waitForTimeout(1_600);
    m04 = await family(page, M04_FAMILY);

    const opened2 = of(m04, M04_FAMILY, 'opportunity_opened')[1];

    expect(meta(opened2)).toMatchObject({
      occasion: 'o2',
      opportunity_id: 'proto_m04_cutting_o2',
      entry_state_version: 'm04-cutting-v4',
    });
    expect(meta(opened2).entry_state_snapshot).toMatchObject({
      occasion_id: 'o2',
      job_number: 2,
      cut_feedback: 'same_line_for_both_jobs',
      set_down_available: true,
    });

    // ——— Job 2: every piece by keyboard AND by pointer, the SAME
    // sequence as job 1 ———
    const exposure2 = [];

    for (const objectId of ['m04_offcut_b', 'm04_wrap_b', 'm04_swarf_b']) {
      exposure2.push(await liftBothWays(page, objectId));
    }

    // Twelve pick-ups of each job's three pieces, by both modes: the bin
    // was named or outlined after none of them — zero of three pieces in
    // job 1, zero of three in job 2 (asserted inside the sequence).
    expect(exposure1.map((entry) => entry.objectId)).toEqual([
      'm04_offcut_a',
      'm04_wrap_a',
      'm04_swarf_a',
    ]);
    expect(exposure2.map((entry) => entry.objectId)).toEqual([
      'm04_offcut_b',
      'm04_wrap_b',
      'm04_swarf_b',
    ]);
    // Job 2's pick-ups, like job 1's, were all made outside the bin's
    // range: zero of three pieces in either job.
    expect(
      exposure2.map((entry) => entry.lifted_within_the_bins_range),
    ).toEqual([false, false, false]);

    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'piece_put_back')
        .filter((e) => meta(e).occasion === 'o2')
        .map((e) => [meta(e).object_id, meta(e).input_mode, 'by' in meta(e)]),
    ).toEqual([
      ['m04_offcut_b', 'keyboard', false],
      ['m04_offcut_b', 'pointer', false],
      ['m04_wrap_b', 'keyboard', false],
      ['m04_wrap_b', 'pointer', false],
      ['m04_swarf_b', 'keyboard', false],
      ['m04_swarf_b', 'pointer', false],
    ]);
    expect(
      of(m04, M04_FAMILY, 'piece_disposed').filter(
        (e) => meta(e).occasion === 'o2',
      ),
    ).toHaveLength(0);
    expect(of(m04, M04_FAMILY, 'first_departure')).toHaveLength(1);

    // ——— A drag: released elsewhere it is no disposal; carried to the
    // bin and released on it, it is ———
    await standBesidePiece(page, 'm04_offcut_b');
    targets = await pointerTargets(page, 'm04_offcut_b');
    await page.mouse.move(targets.piece.x, targets.piece.y);
    await page.mouse.down();
    await page.mouse.move(targets.piece.x + 10, targets.piece.y - 10, {
      steps: 3,
    });
    await page.waitForTimeout(250);
    // Lifted by the drag, the pointer held and NOT on the bin.
    gate = await binProbe(page);
    expect(gate).toMatchObject({
      carrying: 'm04_offcut_b',
      drag_held: true,
      released: false,
      acquired: false,
      outlined: false,
    });
    expect(await promptLine(page)).not.toBe(BIN_LINE);
    // Released away from the bin: the piece stays in the hands.
    await page.mouse.move(targets.piece.x - 60, targets.piece.y - 30, {
      steps: 6,
    });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await expectNoBinCue(page, 'm04_offcut_b', 'after a drag released away');
    expect((await binProbe(page)).drag_held).toBe(false);
    await clickSetDown(page);
    expect(await carriedPiece(page)).toBeNull();
    await expectAtItsPlace(page, 'm04_offcut_b');
    expect(
      of(await family(page, M04_FAMILY), M04_FAMILY, 'piece_disposed').filter(
        (e) => meta(e).occasion === 'o2',
      ),
    ).toHaveLength(0);

    // Dragged to the bin: the piece is lifted by a drag that is HELD
    // while the avatar walks to the bin (no pick-up position reaches the
    // bin). The bin is outlined while the held drag is over it, and the
    // release there disposes of the piece — once.
    await standBesidePiece(page, 'm04_offcut_b');
    targets = await pointerTargets(page, 'm04_offcut_b');
    await page.mouse.move(targets.piece.x, targets.piece.y);
    await page.mouse.down();
    await page.mouse.move(targets.piece.x + 10, targets.piece.y + 10, {
      steps: 3,
    });
    await page.waitForTimeout(250);
    expect(await binProbe(page)).toMatchObject({
      carrying: 'm04_offcut_b',
      drag_held: true,
      in_range: false,
      acquired: false,
      outlined: false,
    });
    // The arrow keys walk the avatar; the pointer stays down.
    await toBin(page);
    expect(await binProbe(page)).toMatchObject({
      drag_held: true,
      released: false,
      acquired: false,
    });

    const binAt = await binPoint(page);

    await page.mouse.move(binAt.x, binAt.y, { steps: 8 });
    await page.waitForTimeout(250);
    gate = await binProbe(page);
    expect(gate).toMatchObject({
      carrying: 'm04_offcut_b',
      drag_held: true,
      in_range: true,
      acquired: false,
      outlined: true,
    });
    await page.mouse.up();
    await page.waitForTimeout(400);
    expect(await carriedPiece(page)).toBeNull();
    expect(await lastFeedback(page)).toBe('Disposed.');
    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'piece_disposed')
        .filter((e) => meta(e).occasion === 'o2')
        .map((e) => [meta(e).object_id, meta(e).input_mode, meta(e).origin]),
    ).toEqual([['m04_offcut_b', 'pointer', 'pointer']]);

    // One piece of job 2 lifted by keyboard and CARRIED from here on.
    await standBesidePiece(page, 'm04_swarf_b');
    await press(page, 'Space');
    await page.waitForTimeout(400);
    await expectNoBinCue(page, 'm04_swarf_b', 'lifted to be carried');

    // ——— The work orders read and taken: an inspection, no departure ———
    // U14-D3: the board alcove is reached along the office's north lane,
    // west of the east-wall rail (x 1280–1343, y 216–231) — the driver's
    // straight L from the vestibule can otherwise end under the rail.
    await workshopVia(page, 1250, 178);
    await workshopVia(page, 1312, 178);
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    // The board is open: nothing closed.
    expect(await stationsOpened(page)).toContain('work_order_board');
    expect(await firstDepartures(page)).toHaveLength(1);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(500);

    m03 = await family(page, M03_FAMILY);
    m04 = await family(page, M04_FAMILY);

    // The listing never rewrote the presentation of the press, and M03
    // is as it was before the first cut.
    expect(JSON.stringify(m03)).toBe(m03Recorded);

    const listed = of(m04, M04_FAMILY, 'listed');

    expect(listed).toHaveLength(1);

    for (const run of of(m04, M04_FAMILY, 'job_run')) {
      expect(run.sequence!).toBeLessThan(listed[0].sequence!);
    }

    // Taking the orders closed nothing either; the piece is still held.
    expect(of(m04, M04_FAMILY, 'first_departure')).toHaveLength(1);
    expect(await carriedPiece(page)).toBe('m04_swarf_b');

    // ——— The Calibration Bench: shown, it closes nothing; its first
    // stage carried out is work begun, the carried piece counted ———
    await openWorkshopSurface(
      page,
      'calibrationBench',
      'm07_calibration_bench',
    );
    await page.waitForTimeout(400);
    expect(await firstDepartures(page)).toHaveLength(1);
    await closeSurface(page);
    // Opened and closed at once: no departure.
    expect(await firstDepartures(page)).toHaveLength(1);
    await openWorkshopSurface(
      page,
      'calibrationBench',
      'm07_calibration_bench',
    );
    expect(await firstDepartures(page)).toHaveLength(1);
    await clickElement(page, 'advance');
    await page.waitForTimeout(400);
    expect(await countOf(page, 'proto_m07_calibration_stage_advanced')).toBe(1);
    // Written while the surface is still open, right after the stage.
    expect((await surface(page))?.open).toBe(true);
    expect(await firstDepartures(page)).toHaveLength(2);
    await page.waitForTimeout(1_700);
    await clickElement(page, 'advance');
    await page.waitForTimeout(400);
    expect(await firstDepartures(page)).toHaveLength(2);
    await closeSurface(page);
    expect(await carriedPiece(page)).toBe('m04_swarf_b');
    m04 = await family(page, M04_FAMILY);

    const departures = of(m04, M04_FAMILY, 'first_departure');

    expect(departures.map((e) => meta(e).occasion)).toEqual(['o1', 'o2']);
    expect(JSON.stringify(departures[0])).toBe(recorded);
    expect(meta(departures[1])).toMatchObject({
      occasion: 'o2',
      trigger: 'other_station',
      detail: 'calibration_bench',
      departed: true,
      pieces_disposed: 1,
      disposed_ids: ['m04_offcut_b'],
      carried_piece: 'm04_swarf_b',
      pieces_lying: 1,
      undisposed_at_departure: 2,
      pickups: 9,
      put_backs: 7,
      entry_state_version: 'm04-cutting-v4',
    });

    const recorded2 = JSON.stringify(departures[1]);

    // Set down after the departure: recorded as such, the record as it
    // was, and no third departure exists.
    await press(page, 'x');
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe(M04_SET_DOWN_LINE);
    expect(await carriedPiece(page)).toBeNull();
    m04 = await family(page, M04_FAMILY);
    expect(
      of(m04, M04_FAMILY, 'first_departure').map((e) => JSON.stringify(e)),
    ).toEqual([recorded, recorded2]);
    expect(meta(of(m04, M04_FAMILY, 'piece_put_back').at(-1)!)).toMatchObject({
      object_id: 'm04_swarf_b',
      occasion: 'o2',
      after_departure: true,
      input_mode: 'keyboard',
    });
    expect(
      meta(of(m04, M04_FAMILY, 'piece_put_back').at(-1)!),
    ).not.toHaveProperty('by');

    // Every event of the family carries the administration's version.
    for (const event of m04) {
      if (meta(event).entry_state_version !== undefined) {
        expect(meta(event).entry_state_version).toBe('m04-cutting-v4');
      }
    }

    expect(
      m04.filter((e) => meta(e).entry_state_version === 'm04-cutting-v4')
        .length,
    ).toBeGreaterThan(20);

    // No event suffix beyond those of the family as it stood.
    expect(
      [
        ...new Set(m04.map((e) => e.event_type.slice(M04_FAMILY.length))),
      ].sort(),
    ).toEqual([
      'first_departure',
      'job_run',
      'job_unavailable',
      'late_disposal',
      'listed',
      'opportunity_opened',
      'piece_disposed',
      'piece_picked_up',
      'piece_put_back',
      'presented',
      'press_refused',
      'window_closed',
    ]);

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
      pickups_by_station_press: 0,
      disposed_by_or_after_station_press: 0,
    });

    const values = m04Rows[1].value as Record<string, Record<string, unknown>>;

    // The set-downs are counted apart and never improved a value.
    expect(values.o1).toMatchObject({
      status: 'observed',
      undisposed_at_departure: 2,
      undisposed_recount: 2,
      departure_trigger: 'other_station',
      departure_detail: 'seal_log',
      carried_piece: null,
      put_backs: 10,
      late_disposals: ['m04_swarf_a'],
    });
    expect(values.o2).toMatchObject({
      status: 'observed',
      undisposed_at_departure: 2,
      undisposed_recount: 2,
      departure_trigger: 'other_station',
      departure_detail: 'calibration_bench',
      carried_piece: 'm04_swarf_b',
      put_backs: 8,
      late_disposals: [],
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

  test('orders taken: the board read and the packet shown as a record close nothing; the filter swap accepted and the locker first used are each one first departure', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'u14d');
    await completeDockTutorial(page, 1);
    await routeToWorkshopWork(page);

    // ——— The Quality Packet released before any cut: a closed record ———
    await workshopVia(page, 1100, 250);
    await interactAt(page, PILOT.workshop.qcPacket, {
      approachOffset: { x: 0, y: -50 },
    });
    await waitSurface(page, true, 'm12_qc_packet_o2');
    await clickElement(page, 'release');
    await page.waitForTimeout(500);
    expect(await countOf(page, 'proto_m12_check_released')).toBe(1);

    if ((await surface(page))?.open) {
      await closeSurface(page);
    }

    // ——— Coupon 1 ———
    await workshopVia(page, CUTTER_STAND.x, CUTTER_STAND.y);
    await interactAt(page, PILOT.workshop.sampleCutter, {
      approachOffset: {
        x: CUTTER_STAND.x - PILOT.workshop.sampleCutter.x,
        y: CUTTER_STAND.y - PILOT.workshop.sampleCutter.y,
      },
    });
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe('Sample coupon 1 of 2 cut.');
    expect(await lyingPieces(page)).toHaveLength(3);
    await page.waitForTimeout(1_600);

    let m04 = await family(page, M04_FAMILY);
    const quiet = m04.length;

    // ——— The packet opened again: a record only, nothing to work ———
    await workshopVia(page, 1100, 250);
    await interactAt(page, PILOT.workshop.qcPacket, {
      approachOffset: { x: 0, y: -50 },
    });
    await waitSurface(page, true, 'm12_qc_packet_o2');
    expect(
      (await surface(page))!.elements.some((e) => e.id === 'release'),
    ).toBe(false);
    await closeSurface(page);
    expect(await stationsOpened(page)).toContain('qc_packet_o2');
    expect(await countOf(page, 'proto_m12_check_released')).toBe(1);
    expect(await firstDepartures(page)).toHaveLength(0);

    // ——— The board read, "Still working.": an inspection ———
    await workshopVia(page, 1312, 178);
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    expect(await promptCardLabels(page)).toEqual([
      'Sign off — done here.',
      'Still working.',
      'Optional: swap the intake filter',
    ]);
    // The swap is only SHOWN: nothing is engaged, nothing closed.
    expect(await countOf(page, 'secondary_m08_optional_job_engaged')).toBe(0);
    expect(await firstDepartures(page)).toHaveLength(0);
    await selectPromptOption(page, 2);
    await page.waitForTimeout(400);
    expect(await countOf(page, 'secondary_m08_optional_job_engaged')).toBe(0);
    m04 = await family(page, M04_FAMILY);
    expect(m04.length).toBe(quiet);
    expect(of(m04, M04_FAMILY, 'first_departure')).toHaveLength(0);

    // ——— The filter swap ACCEPTED: the board's one piece of work ———
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    await selectPromptOption(page, 3);
    await page.waitForTimeout(400);
    expect(await lastFeedback(page)).toBe('Filter swapped.');
    expect(await countOf(page, 'secondary_m08_optional_job_engaged')).toBe(1);

    let departures = await firstDepartures(page);

    expect(departures).toHaveLength(1);
    expect(meta(departures[0])).toMatchObject({
      occasion: 'o1',
      trigger: 'other_station',
      detail: 'work_order_board',
      departed: true,
      pieces_disposed: 0,
      carried_piece: null,
      pieces_lying: 3,
      undisposed_at_departure: 3,
      pickups: 0,
      put_backs: 0,
      entry_state_version: 'm04-cutting-v4',
    });

    const recorded = JSON.stringify(departures[0]);

    // The swap is done: the board no longer offers it.
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    expect(await promptCardLabels(page)).toEqual([
      'Sign off — done here.',
      'Still working.',
    ]);
    await selectPromptOption(page, 2);
    await page.waitForTimeout(400);
    expect(await firstDepartures(page)).toHaveLength(1);

    // ——— Coupon 2, then the Component Locker used for the first time ———
    await workshopVia(page, CUTTER_STAND.x, CUTTER_STAND.y);
    await interactAt(page, PILOT.workshop.sampleCutter, {
      approachOffset: {
        x: CUTTER_STAND.x - PILOT.workshop.sampleCutter.x,
        y: CUTTER_STAND.y - PILOT.workshop.sampleCutter.y,
      },
    });
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe('Sample coupon 2 of 2 cut.');
    expect(await lyingPieces(page)).toHaveLength(6);
    await page.waitForTimeout(1_600);
    expect(await firstDepartures(page)).toHaveLength(1);

    const opened = await stationsOpened(page);

    // Out of the annex to the locker: walking there closed nothing.
    await workshopVia(page, 555, 190);
    await page.waitForTimeout(250);
    expect(await promptLine(page)).toBe(LOCKER_LINE);
    // Standing at the locker closed nothing.
    expect(await firstDepartures(page)).toHaveLength(1);
    expect(await countOf(page, 'secondary_m08_optional_job_engaged')).toBe(1);
    await press(page, 'Space');
    await waitOverlay(page, true);
    expect((await uiProbe(page))!.mode).toBe('container');
    // The stowing job engaged: the departure follows that transition.
    expect(await countOf(page, 'secondary_m08_optional_job_engaged')).toBe(2);
    departures = await firstDepartures(page);
    expect(departures).toHaveLength(2);

    const engaged = (await getEvents(page)).filter(
      (event) => event.event_type === 'secondary_m08_optional_job_engaged',
    ) as unknown as RawGameEvent[];

    expect(meta(engaged[1]).job).toBe('stow_supplies');
    expect(engaged[1].sequence!).toBeLessThan(departures[1].sequence!);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);
    expect(await carriedPiece(page)).toBeNull();
    expect(await lyingPieces(page)).toHaveLength(6);
    expect(await stationsOpened(page)).toEqual([...opened, 'storage_locker']);
    expect(meta(departures[1])).toMatchObject({
      occasion: 'o2',
      trigger: 'other_station',
      detail: 'storage_locker',
      departed: true,
      pieces_disposed: 0,
      pieces_lying: 3,
      undisposed_at_departure: 3,
      entry_state_version: 'm04-cutting-v4',
    });
    expect(JSON.stringify(departures[0])).toBe(recorded);

    // The locker opened again engages nothing and records nothing.
    await press(page, 'Space');
    await waitOverlay(page, true);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);
    expect(await countOf(page, 'secondary_m08_optional_job_engaged')).toBe(2);
    expect(await firstDepartures(page)).toHaveLength(2);

    const rows = extractItemFeatures(
      'M04',
      (await getEvents(page)) as unknown as RawGameEvent[],
      CONTEXT,
    );

    expect(rows[0]).toMatchObject({
      feature_id: 'm04_undisposed_pieces',
      value: 6,
      numerator: 6,
      denominator: 6,
      disposition: 'observed',
    });
    expect(
      (rows[1].value as Record<string, Record<string, unknown>>).o1,
    ).toMatchObject({
      departure_trigger: 'other_station',
      departure_detail: 'work_order_board',
    });
    expectNoRuntimeErrors(errors);
  });
});
