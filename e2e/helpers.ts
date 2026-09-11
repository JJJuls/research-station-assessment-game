import type { Page } from '@playwright/test';

/**
 * Shared driving helpers for the Remote Outpost smoke suite.
 *
 * Input rule (empirically verified): Phaser's JustDown can miss a fast
 * keyboard tap, so every key is HELD ≥150 ms. Movement legs are held
 * arrows at the player's 175 px/s.
 */

export interface RawEventLike {
  event_type: string;
  room_id?: string;
  construct_id?: string;
  study_item_ids?: string[];
  success?: boolean | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await settleAfterKeyUp(page);
}

/**
 * World V1 (U1 closure): under the software-GL verification renderer the
 * page runs at ~11 fps and a DOM key-up is delivered and processed up to
 * two frames (~200 ms) after Playwright dispatches it — the avatar keeps
 * moving 15–45 px AFTER the driver believes the key is released (traced
 * live: 46 px of travel in the 200 ms after key-up). A fixed 120 ms wait
 * therefore read positions that were still changing, and every axis leg
 * ended 15–35 px off its target. Wait for the observed position to hold
 * still across two consecutive reads (bounded), so a leg's end position
 * is read only once motion has actually stopped. Scenes without the
 * position probe keep the historical 120 ms wait.
 */
async function settleAfterKeyUp(page: Page) {
  const started = Date.now();
  let last = await playerProbe(page);

  if (last === null) {
    await page.waitForTimeout(120);
    return;
  }

  // Minimum one frame at the slow renderer before the first comparison.
  await page.waitForTimeout(100);

  while (Date.now() - started < 900) {
    const now = await playerProbe(page);

    if (
      now === null ||
      (Math.abs(now.x - last.x) < 0.5 && Math.abs(now.y - last.y) < 0.5)
    ) {
      return;
    }

    last = now;
    await page.waitForTimeout(70);
  }
}

export async function press(page: Page, key: string) {
  await page.keyboard.down(key);
  await page.waitForTimeout(150);
  await page.keyboard.up(key);
  await page.waitForTimeout(450);
}

export interface LaunchParams {
  participant_id: string;
  game_session_id: string;
  condition?: string;
  game_version?: string;
  return_url?: string;
  scene?: string;
  /** Test-only ingestion unit: only `test` ever enables the exporter. */
  launch_mode?: string;
  /** DEV-only free-play unlock (Unit 7 ice salvage; ?debug precedent). */
  freeplay?: string;
  /**
   * Route mode. The legacy regression specs drive the historical Dock → Hub
   * ring (`legacy`); the pilot route is the participant default. bootGame
   * and bootJourney default this to 'legacy' when no scene alias (or the
   * Dock) is requested, so every legacy spec explicitly selects the route
   * it was written against. Pilot-route specs use e2e/pilotHelpers.ts.
   */
  route?: string;
}

/** Adds the explicit legacy route to a legacy boot (see LaunchParams.route). */
export function withLegacyRoute(params: LaunchParams): LaunchParams {
  return {
    route:
      params.scene === undefined || params.scene === 'dock'
        ? 'legacy'
        : undefined,
    ...params,
  };
}

/** Navigates with Qualtrics-style launch params and waits for boot. */
export async function bootGame(page: Page, params: LaunchParams) {
  const search = new URLSearchParams(
    Object.entries(withLegacyRoute(params)).filter(
      ([, v]) => v !== undefined,
    ) as [string, string][],
  );

  await page.goto(`/?${search.toString()}`);
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          researchRuntime?: { getEvents: () => unknown[] };
        }
      ).researchRuntime !== undefined &&
      (
        window as unknown as { researchRuntime: { getEvents: () => unknown[] } }
      ).researchRuntime.getEvents().length >= 4,
    undefined,
    // Generous: the first load of a session cold-compiles the Vite dep
    // graph, which can exceed 30s on a cold dev server.
    { timeout: 60_000 },
  );
  // Let the intro typewriter finish so prompts are not suppressed.
  await page.waitForTimeout(2200);
}

export async function getEvents(page: Page): Promise<RawEventLike[]> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: { getEvents: () => unknown[] };
        }
      ).researchRuntime.getEvents() as never[],
  );
}

export async function getEventTypes(page: Page): Promise<string[]> {
  return (await getEvents(page)).map((e) => e.event_type);
}

export async function getSummary(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() =>
    (
      window as unknown as {
        researchRuntime: { getSummary: () => Record<string, unknown> };
      }
    ).researchRuntime.getSummary(),
  );
}

/**
 * Waits until the given canonical room-entry event has been logged, then a
 * settle delay for the fade-in. A fixed post-transition timeout is not
 * enough under load: if the fade + scene boot outlasts it, the next held
 * arrow key is partially swallowed and the route silently under-shoots
 * (observed as the hub status board eating the archive-door SPACE).
 */
export async function waitForRoomEntry(page: Page, eventType: string) {
  await page.waitForFunction(
    (type) =>
      (
        window as unknown as {
          researchRuntime: { getEvents: () => { event_type: string }[] };
        }
      ).researchRuntime
        .getEvents()
        .some((e) => e.event_type === type),
    eventType,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(800);
}

/**
 * Waits until the given event type has been logged at least `count` times.
 * Needed for re-entry paths: waitForRoomEntry matches the FIRST occurrence,
 * so on a second visit it returns instantly while the transition is still
 * in flight and assertions race the re-entry logging.
 */
export async function waitForNthEvent(
  page: Page,
  eventType: string,
  count: number,
) {
  await page.waitForFunction(
    ({ type, n }) =>
      (
        window as unknown as {
          researchRuntime: { getEvents: () => { event_type: string }[] };
        }
      ).researchRuntime
        .getEvents()
        .filter((e) => e.event_type === type).length >= n,
    { type: eventType, n: count },
    { timeout: 15_000 },
  );
  await page.waitForTimeout(800);
}

/**
 * Route rule: every movement leg OVERSHOOTS against a clamping wall.
 * Under CPU load Phaser's frame-delta cap makes a held key deliver less
 * distance than wall-clock duration promises, so exact-duration legs
 * under-shoot doors intermittently. Legs that end pressed into a wall or
 * doorway are load-independent.
 */

/**
 * Dock spawn -> Hub: straight up the door column. Position-synced
 * (driveAxisTo) instead of a fixed-duration hold: under CPU load the old
 * timed 2800ms leg under-delivered and left the player short of the hub
 * door's 72px radius (the documented timed-leg failure mode) — observed
 * again when the Stardew-quality ambience raised software-GL frame cost.
 */
export async function dockToHub(page: Page) {
  await driveAxisTo(page, 'y', 60, 14);
  await press(page, 'Space');
  await waitForRoomEntry(page, 'station_hub_entered');
}

/** Hub spawn -> Archive: clamp west wall, clamp top wall, short right. */
export async function hubToArchive(page: Page) {
  await hold(page, 'ArrowLeft', 4600); // clamps at the west wall
  await hold(page, 'ArrowUp', 3000); // clamps at the top wall (~y 82)
  await hold(page, 'ArrowRight', 500); // any delivery in 16-145 px is in range
  await press(page, 'Space');
  await waitForRoomEntry(page, 'archive_room_entered');
}

/** Archive spawn -> terminal: up clamps under the terminal alcove. */
export async function openArchiveTerminal(page: Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

/* ————————————————————————————————————————————————————————————————————
 * Wave 1A (U6) reusable room fixtures.
 *
 * Hub door-ring routes for the remaining stations, mirroring the verified
 * hubToArchive pattern: every route starts with wall clamps (position-
 * independent, load-robust), then one short tolerance leg to the door.
 * Door coordinates come from src/world/stationRegistry.ts. Routes for
 * still-sealed rooms are choreography prepared ahead of their build beat —
 * each room's playwright-game-verify pass MUST tune/verify its route
 * before the room's spec is trusted (this session is compile-only).
 * ———————————————————————————————————————————————————————————————————— */

/** Canonical room_ids for the door-ring stations (registry order). */
export type HubStationRoomId =
  | 'archive_room'
  | 'systems_repair_room'
  | 'engineer_hub'
  | 'inventory_prep_room'
  | 'hazard_control_room'
  | 'optional_side_repair_bay'
  | 'interruption_corridor'
  | 'final_core_room';

/**
 * Walks from anywhere in the Hub to the given station door and presses
 * SPACE. Does NOT wait for a room-entry event (sealed doors only log
 * station_hub_sealed_door_attempted; entry event names are per-room) —
 * compose with waitForRoomEntry(page, '<room>_entered') once the room
 * exists.
 */
/**
 * Normalizes the player to the Hub's north-west corner from ANY position
 * (Sprint A A3 finding: routes that clamp horizontally at mid-height wedge
 * against the central console block from side-wall return spawns, and
 * naive south/top clamps can trap the player in a doorway pocket).
 *
 * 1. Down-clamp: ends at the south corridor, on the console-block top, or
 *    inside the dock-door pocket (cols 12-13) — the only three outcomes.
 * 2. Short Up hop (~70 px): escapes any pocket/block-top onto an
 *    always-clear traversal row (rows 5 or 11-13 — never the side-door
 *    rows 6/9, never the block row 8).
 * 3. West-clamp along that clear row, then Up-clamp the obstacle-free
 *    west wall column to the corner.
 */
export async function hubToNorthWestAnchor(page: Page) {
  // Down-clamp + short up-hop stay fixed-duration (their outcome is a
  // clamp/pocket-escape, not a position); the long west/north legs are
  // position-synced — the former full-width Left-4600 hold had only ~8%
  // delivery margin from the east side and under-shot under CPU load.
  await hold(page, 'ArrowDown', 3200);
  await hold(page, 'ArrowUp', 400);
  await driveAxisTo(page, 'x', 44, 12);
  await driveAxisTo(page, 'y', 76, 12);
}

export async function hubToStationDoor(page: Page, roomId: HubStationRoomId) {
  // Every route starts at the NW anchor (position independence). The final
  // leg to each door is position-synced on the observed player position
  // (driveAxisTo) instead of a fixed-duration hold — the former timed legs
  // were the known movement-undershoot flake genre (under CPU load Phaser's
  // frame-delta cap under-delivers a hold; observed live on the engineer
  // leg during the pilot-slice bring-up). Route shapes are unchanged: the
  // top row (row 2), the west-wall column, and the east-wall column are
  // audited-clear traversal lanes.
  await hubToNorthWestAnchor(page);

  switch (roomId) {
    // Top-wall doors (y 48; the corner clamp row y≈76 is in vertical
    // range, so only x needs driving):
    case 'archive_room':
      await driveAxisTo(page, 'x', 128, 20);
      break;
    case 'systems_repair_room':
      await driveAxisTo(page, 'x', 320, 20);
      break;
    case 'engineer_hub':
      await driveAxisTo(page, 'x', 512, 20);
      break;
    case 'inventory_prep_room':
      await driveAxisTo(page, 'x', 704, 20);
      break;
    // Left-wall doors (door x 24 is inside the wall; the west clamp
    // already puts the player in x-range):
    case 'hazard_control_room':
      await driveAxisTo(page, 'y', 208, 20);
      break;
    case 'optional_side_repair_bay':
      await driveAxisTo(page, 'y', 304, 20);
      break;
    // Right-wall doors (door x 808 is inside the wall; drive to the east
    // wall along the clear top row first, then drive y). The former timed
    // Right-4600 clamp had only ~8% delivery margin over the full hub
    // width — under CPU load it fell short of the wall and left the door
    // out of range (observed live on the final-core leg).
    case 'interruption_corridor':
      await driveAxisTo(page, 'x', 788, 12);
      await driveAxisTo(page, 'y', 208, 20);
      break;
    case 'final_core_room':
      await driveAxisTo(page, 'x', 788, 12);
      await driveAxisTo(page, 'y', 304, 20);
      break;
  }

  await press(page, 'Space');
}

/**
 * Live active-scene player position from the dev-only, read-only probe
 * (RoomScene.update writes it every frame; stripped from production builds).
 * Returns null before the first framed update or if the hook is absent.
 */
export async function playerProbe(
  page: Page,
): Promise<{ scene: string; x: number; y: number } | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __playerProbe?: { scene: string; x: number; y: number } | null;
        }
      ).__playerProbe ?? null,
  );
}

/**
 * Real-keyboard movement synchronised on OBSERVED player position: holds the
 * arrow key toward `target` on one axis in short bursts, re-reading the
 * dev-only position probe after each, until the player is within `tolerance`
 * of the target OR has stopped advancing on that axis (a wall/obstacle clamp).
 *
 * Unlike a fixed-duration hold, this cannot silently under-deliver when CPU
 * load caps Phaser's per-frame delta — it keeps moving until the game itself
 * reports arrival. Movement is genuine held-key input (no teleport, no state
 * mutation); the bounded burst count is only an anti-hang safety stop, never
 * an interaction retry.
 */
export async function driveAxisTo(
  page: Page,
  axis: 'x' | 'y',
  target: number,
  tolerance: number,
) {
  let previous: number | null = null;
  let stalledHoldMs = 0;
  let lastBurstMs = 0;
  // World V1 (U2): a burst shorter than one frame yields NO travel when
  // both key events land in the same frame gap (slow moments right after a
  // scene load or a prompt close run at 3–5 fps). A no-motion burst is
  // therefore first answered by doubling the next burst (up to 240 ms);
  // only bursts of ≥ 150 ms count toward the wall-clamp budget.
  let boost = 1;

  for (let burst = 0; burst < 120; burst++) {
    const probe = await playerProbe(page);
    if (probe === null) {
      return;
    }

    const current = probe[axis];
    if (Math.abs(current - target) <= tolerance) {
      return;
    }
    // Advanced < 2px since the last burst => clamped against a wall on
    // this axis — but ONE stalled read can also be a dead frame window
    // under load (observed live: the first 150ms burst right after a
    // scene entry lands entirely between throttled frames and the leg
    // aborts at the spawn). Require TWO consecutive stalled reads before
    // treating it as a genuine wall clamp — and (physical-mechanics
    // report §15 recommended fix) require OBSERVED FORWARD MOTION first:
    // until the leg has seen the player actually move, stall reads are
    // treated as post-scene-entry jank and tolerated up to a longer
    // bound (8) instead of aborting the leg at the spawn.
    // V4: the stall budget is HELD-KEY TIME, not a burst count — the
    // software-GL verification renderer runs at ~13 fps under the 1280×720
    // canvas, so a single 100 ms burst can land entirely between frames.
    // A genuine wall clamp shows no motion across ≥ 400 ms of held key
    // (≥ 5 frames at 13 fps, ≥ 24 at 60 fps); before any motion has been
    // observed (post-scene-entry jank) the budget is 1600 ms, as before.
    if (previous !== null && Math.abs(current - previous) < 2) {
      if (lastBurstMs >= 150) {
        stalledHoldMs += lastBurstMs;
      }

      boost = Math.min(4, boost * 2);

      // World V1 production: the 1280×720 plate and the larger rooms run
      // slower under the software-GL verification renderer, so a held key
      // can show no motion across two 400 ms bursts without any wall;
      // require 900 ms of stalled held-key time before calling it a clamp.
      if (stalledHoldMs >= 1600) {
        return;
      }
    } else {
      stalledHoldMs = 0;
      boost = 1;
    }
    previous = current;

    const forward = current < target;
    const key =
      axis === 'x'
        ? forward
          ? 'ArrowRight'
          : 'ArrowLeft'
        : forward
          ? 'ArrowDown'
          : 'ArrowUp';

    // Adaptive burst: long remaining distances use longer holds (~70 px at
    // 175 px/s) so cross-room legs stay fast; the final approach drops to
    // short bursts for precision. World V1 (U1 closure): the last 40 px
    // use a 70 ms burst — shorter than one frame at the ~11 fps
    // verification renderer, so a burst yields at most one frame of
    // travel (~15 px) and cannot overshoot a 12 px tolerance by two
    // frames; hold() then waits for the position to settle before the
    // next read. Stall detection above is unaffected — any wall clamp
    // still ends the leg.
    const remaining = Math.abs(current - target);
    const base = remaining > 120 ? 400 : remaining > 40 ? 100 : 70;

    lastBurstMs = remaining > 120 ? base : Math.min(240, base * boost);
    await hold(page, key, lastBurstMs);
  }
}

/**
 * Walks from anywhere in the Hub to the Status Board and presses SPACE. The
 * board (HubScene x=13*32, y=7.5*32) is the one interactable with no wall
 * inside its 72px radius — it floats above the central console block — so a
 * fixed-duration approach leg silently under-shoots under CPU load and the
 * SPACE lands out of range. Instead we drive through the hub's guaranteed-
 * clear corridors, ending each leg on the OBSERVED player position:
 *   1. clamp the west wall  (clear vertical corridor, reachable from anywhere);
 *   2. rise to a row well north of the console block (clear across);
 *   3. move east to the board's column (now over the block);
 *   4. descend — clamps on the block top, ~26px from the board, in range.
 */
export async function hubToStatusBoard(page: Page) {
  await driveAxisTo(page, 'x', 30, 24); // west wall (stalls at the clear column)
  await driveAxisTo(page, 'y', 180, 24); // clear row north of the console block
  await driveAxisTo(page, 'x', 416, 24); // board column, over the block
  await driveAxisTo(page, 'y', 260, 20); // descend; stalls on the block top (~232)
  await press(page, 'Space');
}

/**
 * Walks from anywhere in the Hub to the Priority Allocation console (pilot
 * Scenario B; HubScene x=11.5*32, y=9.5*32 on the SOUTH face of the central
 * console block) and presses SPACE. Position-synced like hubToStatusBoard:
 *   1. clamp the west wall (clear vertical corridor from any spawn);
 *   2. descend to the clear south corridor row;
 *   3. move east to the console's column along that clear row;
 *   4. rise — clamps under the console block within a few px of the
 *      console itself.
 * The status board (80+ px away through the block) is always the farther
 * target from the south approach, so SPACE binds to the console.
 */
export async function hubToAllocationConsole(page: Page) {
  await driveAxisTo(page, 'x', 30, 24); // west wall (clear vertical corridor)
  await driveAxisTo(page, 'y', 368, 24); // clear south corridor row
  await driveAxisTo(page, 'x', 368, 12); // console column
  await driveAxisTo(page, 'y', 304, 12); // rise; clamps at the block face
  await press(page, 'Space');
}

/**
 * Walks from anywhere in the Engineer Hub to the Calibration Bench (pilot
 * Scenario A; EngineerScene x=16*32, y=5.5*32) and presses SPACE.
 * Position-synced route through audited-clear lanes: row 8 (fully open) to
 * column 14 (open from row 1 to row 10 — the col 12-14 corridor between
 * the bench blocks), up to the bench row, then east toward the bench. The
 * final leg either reaches its waypoint or wall-clamps on the row-4 east
 * block's collision band — every outcome lands ~34-50 px from the bench,
 * strictly inside the 72 px radius (the former 3-leg route could stop
 * ~78 px away at tolerance extremes, the suite's dominant load flake) and
 * 160+ px from Kai, so the bench is always the strict nearest target.
 */
export async function engineerToCalibrationBench(page: Page) {
  await driveAxisTo(page, 'y', 272, 16); // clear row 8 (fully open)
  await driveAxisTo(page, 'x', 448, 12); // column 14 (open corridor)
  await driveAxisTo(page, 'y', 176, 12); // rise beside the bench row
  await driveAxisTo(page, 'x', 480, 12); // east; clamps in bench range
  await press(page, 'Space');
}

/**
 * Walks from anywhere in the Archive Room to the Records Reconciliation
 * Desk (pilot Scenario C; ArchiveScene x=16*32, y=9*32 in the open
 * south-east floor) and presses SPACE. Position-synced route through
 * audited-clear lanes: row 9 (open across the room, south of both shelf
 * blocks) east to column ~14.75. The SPACE press lands ~25-60 px from the
 * desk (strictly inside the 72 px interaction radius even at tolerance
 * extremes); the Hub door (~150+ px) and terminal/shelves (220+ px) are
 * always farther, so the desk is the strict nearest target.
 */
export async function archiveToReconciliationDesk(page: Page) {
  await driveAxisTo(page, 'y', 288, 16); // clear row 9 (open across)
  await driveAxisTo(page, 'x', 472, 16); // just west of the desk
  await press(page, 'Space');
}

/**
 * Walks from anywhere in the Inventory / Prep Room to the Supply Airlock
 * Seal Log (pilot Scenario D; InventoryScene x=4*32, y=7.5*32 on the left
 * storage block) and presses SPACE. The player body (32×42, top edge 18 px
 * above the probe point) collides with the block (rows to y 256) whenever
 * probe y < 274, so the route first drops BELOW that collision band, drives
 * west along the guaranteed-clear row 9, then rises until the body clamps
 * on the block's south face (~probe y 274) — a load-independent wall clamp
 * ~36 px from the terminal. The quartermaster console and Hub door
 * (170+ px) are always farther, so the seal log is the strict nearest
 * target.
 */
export async function inventoryToSealLog(page: Page) {
  await driveAxisTo(page, 'y', 292, 12); // clear row 9, below the block band
  await driveAxisTo(page, 'x', 140, 12); // terminal's column, along row 9
  await driveAxisTo(page, 'y', 276, 8); // rise; clamps on the block face
  await press(page, 'Space');
}

/**
 * FABLE-NEXT-02 per-item stations (InventoryScene). Every route first
 * normalises into the col 6-7 corridor (x 224) — the one column open from
 * row 1 to row 10 and clear along every station resting row — so each
 * helper is valid from ANY per-item station, the console, the seal log or
 * the spawn. All legs are position-synced (driveAxisTo) and end either on
 * the waypoint or on an audited wall clamp strictly inside the target's
 * 72 px radius, with every other interactable ≥72 px away.
 */

/**
 * Quartermaster console (10,5.5 tiles): corridor → row 6 → console column
 * → rise until the body clamps under the top-center block (~probe y 178,
 * ~2-20 px from the console; Bin B is 112+ px away, always farther).
 */
export async function inventoryToConsole(page: Page) {
  await driveAxisTo(page, 'x', 224, 12); // col 6-7 corridor
  await driveAxisTo(page, 'y', 200, 10); // clear row 6
  await driveAxisTo(page, 'x', 320, 10); // console column
  await driveAxisTo(page, 'y', 180, 8); // rise; clamps under the alcove
  await press(page, 'Space');
}

/**
 * Prep Bench (16,7.5 tiles — right row-7 block, seal-log mirror): row 9
 * below the block band, east to the bench column, rise to the block-face
 * clamp (~probe y 276, ~36-40 px from the bench; Electronics Shelf and the
 * kit crate stay 170+ px away).
 */
export async function inventoryToPrepBench(page: Page) {
  await driveAxisTo(page, 'x', 224, 12); // col 6-7 corridor
  await driveAxisTo(page, 'y', 292, 12); // clear row 9
  await driveAxisTo(page, 'x', 500, 12); // bench column, along row 9
  await driveAxisTo(page, 'y', 276, 8); // rise; clamps on the block face
  await press(page, 'Space');
}

/**
 * Field Kit Crate (6,10.5 tiles — open south-west floor): row 10 west leg;
 * no clamp needed (the crate floats ≥115 px from the seal log and ≥132 px
 * from the Hub door, so the crate is the strict nearest target).
 */
export async function inventoryToKitCrate(page: Page) {
  await driveAxisTo(page, 'x', 224, 12); // col 6-7 corridor
  await driveAxisTo(page, 'y', 336, 10); // row 10, south of the block band
  await driveAxisTo(page, 'x', 192, 10); // crate column
  await press(page, 'Space');
}

/** Labelled storage bins on the top corridor (row 2, y 64). */
const INVENTORY_BIN_X: Record<
  'hand_tools' | 'consumables' | 'electronics',
  number
> = {
  hand_tools: 128,
  consumables: 320,
  electronics: 512,
};

/**
 * A labelled storage bin (4/10/16, 2 tiles): corridor → top corridor row
 * (probe band ~50-64: below the top-wall clamp at probe ~50, above the
 * body-bottom limit ~71 where the row 3-4 block tops start colliding, so
 * the east-west leg stays clear) → bin column. The console (112+ px below
 * Bin B, through the block) and the other bins (192 px apart) are always
 * farther than the target bin.
 */
export async function inventoryToStorageBin(
  page: Page,
  bin: 'hand_tools' | 'consumables' | 'electronics',
) {
  await driveAxisTo(page, 'x', 224, 12); // col 6-7 corridor
  await driveAxisTo(page, 'y', 56, 8); // top corridor row (clamp band)
  await driveAxisTo(page, 'x', INVENTORY_BIN_X[bin], 10); // bin column
  await press(page, 'Space');
}

/** Shape of one scenario's dev-only progress probe (ScenarioController). */
export interface ScenarioProbeLike {
  entered: boolean;
  enteredAtMs: number | null;
  briefingOpens: number;
  evidenceViewed: string[];
  evidenceOpens: number;
  optionalInfoRequests: number;
  selectedValue: string | null;
  selectionChanges: number;
  committedValue: string | null;
  consequenceShown: boolean;
  completed: boolean;
  interruptions: number;
  abandonments: number;
}

/**
 * Reads the dev-only, read-only scenario progress probe
 * (window.__scenarioProbe, ScenarioController.ts; stripped from production
 * builds). Returns null when the scenario has not been touched yet.
 */
export async function scenarioProbe(
  page: Page,
  scenarioId: string,
): Promise<ScenarioProbeLike | null> {
  return page.evaluate(
    (id) =>
      (
        window as unknown as {
          __scenarioProbe?: Record<string, never> | null;
        }
      ).__scenarioProbe?.[id] ?? null,
    scenarioId,
  );
}

/**
 * Reads the dev-only, presentation-only feedback-text probe (RoomScene.ts)
 * populated synchronously by showFeedbackMessage — safe to read immediately
 * after the corresponding event (e.g. station_hub_status_board_viewed) is
 * observed, since both happen in the same tick.
 */
export async function getLastFeedbackText(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __lastRoomFeedbackText?: string | null })
        .__lastRoomFeedbackText ?? null,
  );
}

/**
 * Reads the dev-only, presentation-only route-objective HUD probe
 * (RoomScene.ts window.__routeObjectiveText; stripped from production
 * builds). Mirrors getLastFeedbackText: written synchronously whenever the
 * HUD line is (re)computed, so it is safe to read after any prompt action
 * or scene entry.
 */
export async function getRouteObjectiveText(
  page: Page,
): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __routeObjectiveText?: string | null })
        .__routeObjectiveText ?? null,
  );
}

/**
 * Reads the dev-only, presentation-only prompt-body probe (RoomScene.ts
 * window.__lastPromptBody): the full text content of the most recently
 * rendered prompt stage. Lets specs assert DISPLAYED prompt content (e.g.
 * the Final Core route gate's remaining-decision list) the same way
 * getLastFeedbackText asserts displayed feedback text.
 */
export async function getLastPromptBody(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __lastPromptBody?: string | null })
        .__lastPromptBody ?? null,
  );
}

/**
 * Selects a numbered prompt option (U3 renderer: numeric keys in declared
 * option order, 1-based).
 */
export async function selectPromptOption(page: Page, optionNumber: number) {
  const cardsSnapshot = () =>
    page.evaluate(() =>
      JSON.stringify(
        (window as unknown as { __promptCards?: { label: string }[] | null })
          .__promptCards ?? null,
      ),
    );
  const settleAfterPress = async (prev: string, timeout: number) => {
    await press(page, `${optionNumber}`);

    return page
      .waitForFunction(
        (p) =>
          JSON.stringify(
            (
              window as unknown as {
                __promptCards?: { label: string }[] | null;
              }
            ).__promptCards ?? null,
          ) !== p,
        prev,
        { timeout },
      )
      .then(
        () => true,
        () => false,
      );
  };

  // Deterministic settle + verify-and-retry (count-aware-waits
  // discipline, NEXT-07): a selection always either re-renders the card
  // panel (chained stage) or closes it — both observable through the
  // __promptCards probe. If nothing observable happened within the
  // settle window, the press was swallowed (the documented
  // intermittent input loss of the SwiftShader/headless environment,
  // seen live on chained prompt stages), so press the same option once
  // more. Deliberate no-op presses (input-spam specs) keep their
  // semantics — one extra spam press changes nothing they assert.
  const before = await cardsSnapshot();

  if (!(await settleAfterPress(before, 8_000))) {
    // Retry guard (clickGameRect precedent): re-snapshot first. If the
    // first press's effect landed AFTER the settle window (slow stage
    // transition under load), the probe has changed by now and a retry
    // would select the SAME NUMBER on the follow-up stage — observed as
    // e.g. "2" (systematic prep) re-firing as "2" (skip verification).
    // Only a genuinely lost press (probe still identical) is retried.
    // Unit 8: a press can land AFTER the settle window AND after an
    // immediate re-snapshot (observed live: the follow-up stage then
    // received the retried digit — e.g. "2" skip-verification). Give a
    // late landing time to render before deciding the press was lost.
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    if ((await cardsSnapshot()) === before) {
      await settleAfterPress(before, 6_000);
    }
  }
}

/**
 * NEXT-08 task-surface probe row (window.__minigameSurface, RoomScene.ts):
 * screen rects + participant labels of the open stage's surface elements,
 * with the option index an activator redundantly activates (null = inert).
 */
export interface MinigameSurfaceEntryLike {
  kind: 'tray' | 'station' | 'steps' | 'schematic';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  activates: number | null;
  state?: 'pending' | 'current' | 'done';
}

export async function getMinigameSurface(
  page: Page,
): Promise<MinigameSurfaceEntryLike[] | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __minigameSurface?: MinigameSurfaceEntryLike[] | null;
        }
      ).__minigameSurface ?? null,
  );
}

/** Card rects of the open prompt (window.__promptCards). */
export async function getPromptCards(page: Page): Promise<
  | {
      index: number;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }[]
  | null
> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __promptCards?:
            | {
                index: number;
                label: string;
                x: number;
                y: number;
                width: number;
                height: number;
              }[]
            | null;
        }
      ).__promptCards ?? null,
  );
}

/**
 * Clicks the centre of a game-coordinate rect via real mouse input on the
 * canvas (FIT-scaled), then settles on the __promptCards probe changing —
 * a selection always re-renders or closes the panel — and retries the
 * same click once if nothing observable happened (the documented
 * intermittent input loss of the SwiftShader/headless environment;
 * selectPromptOption keyboard precedent).
 */
/**
 * V4 (docs/game/VISUAL-SYSTEM-V4.md §1.3): every probe rectangle the pointer
 * specs click is expressed in the 800×600 DESIGN space. The game publishes
 * `window.__designSpace` (DEV) with the design→canvas mapping; this is the
 * one place that turns a design point into a page click. Before V4 the
 * canvas WAS the design space, which the fallback branch preserves.
 */
export interface DesignSpaceLike {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
}

export async function designSpace(page: Page): Promise<DesignSpaceLike | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __designSpace?: DesignSpaceLike | null })
        .__designSpace ?? null,
  );
}

export async function designToPage(
  page: Page,
  x: number,
  y: number,
): Promise<{ x: number; y: number }> {
  const box = await page.locator('canvas').boundingBox();

  if (box === null) {
    throw new Error('game canvas not found');
  }

  const space = await designSpace(page);

  if (space === null) {
    return {
      x: box.x + (x * box.width) / 800,
      y: box.y + (y * box.height) / 600,
    };
  }

  return {
    x:
      box.x +
      ((space.offsetX + x * space.scale) * box.width) / space.canvasWidth,
    y:
      box.y +
      ((space.offsetY + y * space.scale) * box.height) / space.canvasHeight,
  };
}

export async function clickGameRect(
  page: Page,
  rect: { x: number; y: number; width: number; height: number },
) {
  const cardsSnapshot = () =>
    page.evaluate(() =>
      JSON.stringify(
        (window as unknown as { __promptCards?: { label: string }[] | null })
          .__promptCards ?? null,
      ),
    );
  const clickOnce = async () => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (box === null) {
      throw new Error('game canvas not found');
    }

    const point = await designToPage(
      page,
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    );

    await page.mouse.click(point.x, point.y);
  };
  const settle = async (prev: string, timeout: number) => {
    await clickOnce();

    return page
      .waitForFunction(
        (p) =>
          JSON.stringify(
            (
              window as unknown as {
                __promptCards?: { label: string }[] | null;
              }
            ).__promptCards ?? null,
          ) !== p,
        prev,
        { timeout },
      )
      .then(
        () => true,
        () => false,
      );
  };
  const before = await cardsSnapshot();

  if (!(await settle(before, 8_000))) {
    // Retry guard: re-snapshot first. If the first click's effect landed
    // AFTER the settle window (slow frame under load), the probe has
    // changed by now and a retry would double-select on the follow-up
    // prompt — the observed wrong-item drift. Only a genuinely lost
    // click (probe still identical) is retried.
    if ((await cardsSnapshot()) === before) {
      await settle(before, 6_000);
    }
  }

  await page.waitForTimeout(200);
}

/** Clicks the option card at the given declared index (0-based). */
export async function clickPromptCard(page: Page, index: number) {
  const cards = await getPromptCards(page);
  const card = cards?.find((c) => c.index === index);

  if (card === undefined) {
    throw new Error(`prompt card ${index} not found`);
  }

  await clickGameRect(page, card);
}

/**
 * Clicks the task-surface element with the given participant label. The
 * element must be an activator (activates !== null) — clicking an inert
 * element is a spec-authoring error, surfaced loudly here.
 */
export async function clickSurfaceEntry(page: Page, label: string) {
  const surface = await getMinigameSurface(page);
  const entry = surface?.find((e) => e.label === label);

  if (entry === undefined) {
    throw new Error(`surface entry "${label}" not found`);
  }

  if (entry.activates === null) {
    throw new Error(`surface entry "${label}" is inert`);
  }

  await clickGameRect(page, entry);
}

/** First event of the given type, or undefined. */
export function findEvent(
  events: RawEventLike[],
  eventType: string,
): RawEventLike | undefined {
  return events.find((e) => e.event_type === eventType);
}

/** All events of the given type, in log order. */
export function findEvents(
  events: RawEventLike[],
  eventType: string,
): RawEventLike[] {
  return events.filter((e) => e.event_type === eventType);
}

/**
 * Asserts-by-return the canonical context of one logged event; specs
 * compare against the committed CANONICAL_EVENT_CONTEXT values (study
 * item ids / construct / success are frozen scientific data — specs must
 * always pin them exactly, never loosely).
 */
export function eventContext(event: RawEventLike | undefined) {
  return {
    room_id: event?.room_id,
    study_item_ids: event?.study_item_ids,
    construct_id: event?.construct_id,
    success: event?.success,
  };
}

// ————————————————————————————————————————————————————————————————————
// Physical-mechanics session (Unit 2): direct-manipulation helpers
// ————————————————————————————————————————————————————————————————————

export interface PhysicalProbeLike {
  scene: string;
  objects: {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  containers: {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  carried: string | null;
  dragging: string | null;
}

/** The active scene's physical-layer probe (DEV-only, read-only). */
export async function physicalProbe(
  page: Page,
): Promise<PhysicalProbeLike | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __physicalProbe?: PhysicalProbeLike | null })
        .__physicalProbe ?? null,
  );
}

/** Page mouse position for a design-space point (V4: via __designSpace). */
async function gamePointToMouse(page: Page, x: number, y: number) {
  return designToPage(page, x, y);
}

/**
 * Clicks the centre of a physical object/container rect via real mouse
 * input, settling on the physical probe's carried/dragging/object-set
 * state changing (a successful pickup/place always changes it), with the
 * clickGameRect-style single re-snapshot retry for the documented
 * SwiftShader input loss. Refused interactions (hands full, out of
 * reach) do NOT change the probe — pass `expectChange: false` for those.
 */
export async function clickPhysicalRect(
  page: Page,
  rect: { x: number; y: number; width: number; height: number },
  options?: { expectChange?: boolean },
) {
  const snapshot = () =>
    page.evaluate(() => {
      const probe = (
        window as unknown as {
          __physicalProbe?: {
            objects: { id: string }[];
            carried: string | null;
          } | null;
        }
      ).__physicalProbe;

      return JSON.stringify({
        objects: probe?.objects.map((entry) => entry.id) ?? null,
        carried: probe?.carried ?? null,
      });
    });
  const point = await gamePointToMouse(
    page,
    rect.x + rect.width / 2,
    rect.y + rect.height / 2,
  );
  const before = await snapshot();

  await page.mouse.click(point.x, point.y);

  if (options?.expectChange === false) {
    await page.waitForTimeout(300);
    return;
  }

  const settled = await page
    .waitForFunction(
      (prev) => {
        const probe = (
          window as unknown as {
            __physicalProbe?: {
              objects: { id: string }[];
              carried: string | null;
            } | null;
          }
        ).__physicalProbe;

        return (
          JSON.stringify({
            objects: probe?.objects.map((entry) => entry.id) ?? null,
            carried: probe?.carried ?? null,
          }) !== prev
        );
      },
      before,
      { timeout: 6_000 },
    )
    .then(
      () => true,
      () => false,
    );

  if (!settled && (await snapshot()) === before) {
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(600);
  }

  await page.waitForTimeout(150);
}

/** Clicks the physical object with the given id (probe lookup). */
export async function clickPhysicalObject(
  page: Page,
  objectId: string,
  options?: { expectChange?: boolean },
) {
  const probe = await physicalProbe(page);
  const object = probe?.objects.find((entry) => entry.id === objectId);

  if (object === undefined) {
    throw new Error(`physical object ${objectId} not in probe`);
  }

  await clickPhysicalRect(page, object, options);
}

/** Clicks the physical container with the given id (probe lookup). */
export async function clickPhysicalContainer(
  page: Page,
  containerId: string,
  options?: { expectChange?: boolean },
) {
  const probe = await physicalProbe(page);
  const container = probe?.containers.find((entry) => entry.id === containerId);

  if (container === undefined) {
    throw new Error(`physical container ${containerId} not in probe`);
  }

  await clickPhysicalRect(page, container, options);
}

/**
 * Real mouse drag from a physical object to a physical container: press,
 * threshold-crossing move, glide, release over the container centre.
 */
export async function dragPhysicalObjectToContainer(
  page: Page,
  objectId: string,
  containerId: string,
) {
  const probe = await physicalProbe(page);
  const object = probe?.objects.find((entry) => entry.id === objectId);
  const container = probe?.containers.find((entry) => entry.id === containerId);

  if (object === undefined || container === undefined) {
    throw new Error(`drag endpoints missing: ${objectId} -> ${containerId}`);
  }

  const from = await gamePointToMouse(
    page,
    object.x + object.width / 2,
    object.y + object.height / 2,
  );
  const to = await gamePointToMouse(
    page,
    container.x + container.width / 2,
    container.y + container.height / 2,
  );

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y + 10, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

/**
 * State-aware card selection BY LABEL (action-assessment rebuild):
 * opens the nearby prompt if needed, finds the option whose label
 * contains `label`, presses its number key, and settles on the card
 * panel changing (stage advance) or closing (selection resolved).
 * Retries absorb swallowed presses without ever pressing a number key
 * against the wrong stage — the label lookup re-reads live cards each
 * attempt, which is what the blind fixed-index sequences could not do.
 */
/** Reads __promptCards until two consecutive reads agree (transient
 * mid-transition renders otherwise poison stage-sequenced drivers). */
async function stablePromptCards(page: Page) {
  let previous = JSON.stringify(await getPromptCards(page));

  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(250);

    const next = JSON.stringify(await getPromptCards(page));

    if (next === previous) {
      return JSON.parse(next) as { index: number; label: string }[] | null;
    }

    previous = next;
  }

  return JSON.parse(previous) as { index: number; label: string }[] | null;
}

export async function selectCardByLabel(page: Page, label: string) {
  /** Card signature at the moment of the last press (late-settle guard:
   * if a later read shows the stage moved past the target label, the
   * press landed and re-pressing would hit the WRONG stage). */
  let pressedSignature: string | null = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    let cards = await stablePromptCards(page);

    if (cards === null || cards.length === 0) {
      if (pressedSignature !== null) {
        // Prompt closed after our press — the selection resolved.
        return;
      }

      await press(page, 'Space');
      cards = await stablePromptCards(page);

      if (cards === null || cards.length === 0) {
        continue;
      }
    }

    const signature = JSON.stringify(cards);
    const index = cards.findIndex((card) => card.label.includes(label));

    if (index < 0) {
      if (pressedSignature !== null && signature !== pressedSignature) {
        // The stage advanced past the target: the press landed late.
        return;
      }

      throw new Error(
        `card "${label}" not among [${cards.map((card) => card.label).join(' | ')}]`,
      );
    }

    await press(page, `${index + 1}`);
    pressedSignature = signature;

    const settled = await page
      .waitForFunction(
        (prev) =>
          JSON.stringify(
            (window as unknown as { __promptCards?: unknown }).__promptCards ??
              null,
          ) !== prev,
        signature,
        { timeout: 5_000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (settled) {
      return;
    }
  }

  const debug = JSON.stringify(
    await page.evaluate(() => ({
      player: (window as unknown as { __playerProbe?: unknown }).__playerProbe,
      cards: (window as unknown as { __promptCards?: unknown }).__promptCards,
      feedback: (
        window as unknown as { __lastRoomFeedbackText?: string | null }
      ).__lastRoomFeedbackText,
    })),
  );

  throw new Error(`card "${label}" never selected: ${debug}`);
}

/**
 * Closes an accidentally open prompt by selecting its LAST option
 * (every prompt's final option is a neutral Back/Step back/Close).
 * No-op when nothing is open. Used after real-time minigame phases
 * where a settling SPACE can land on the station and open its prompt.
 */
export async function dismissOpenPrompt(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const cards = await getPromptCards(page);

    if (cards === null || cards.length === 0) {
      return;
    }

    await press(page, `${cards.length}`);

    const closed = await page
      .waitForFunction(
        () =>
          ((window as unknown as { __promptCards?: unknown }).__promptCards ??
            null) === null,
        undefined,
        { timeout: 3_000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (closed) {
      return;
    }
  }
}

/**
 * SPACE-open with the documented SwiftShader input-loss retry (the
 * measurement_boundaries openPrompt pattern, shared): presses SPACE and
 * waits for the card panel; re-presses up to twice when nothing renders.
 */
export async function openNearbyPrompt(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await press(page, 'Space');

    const opened = await page
      .waitForFunction(
        () =>
          ((
            window as unknown as {
              __promptCards?: { label: string }[] | null;
            }
          ).__promptCards ?? null) !== null,
        undefined,
        { timeout: 8000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (opened) {
      return;
    }
  }

  throw new Error('prompt did not open after 3 SPACE presses');
}
