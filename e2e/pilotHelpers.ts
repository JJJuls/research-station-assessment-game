/**
 * Pilot-route e2e helpers (evidence-led pilot v2).
 *
 * Real keyboard input only (position-synced via the DEV `__playerProbe`),
 * read-only DEV probes (`__pilotProbe`, `__pilotMapProbe`,
 * `__pilotOpeningProbe`, `__pilotCoverage`), never teleports, never mutates
 * game state through the window.
 *
 * The v2 route is a hub-and-loop: Dock → Concourse (ep 1) → Records
 * Workshop (ep 2) → Laboratory (ep 3) → Recovery Yard (ep 4) → the ONE
 * purposeful return: Concourse → Workshop (ep 5) → Utility Deck (ep 6).
 * The `routeTo*` helpers walk that spine through the explicit NPC/board
 * beats only — no measurement window is ever opened by them.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { PilotZoneKey } from '../src/pilot/pilotRoute';
import { PILOT_DOORS } from '../src/pilot/pilotRoute';
import {
  CONCOURSE_STATIONS,
  CORE_SITES,
  CORE_SPAWN,
  DECK_SITES,
  DECK_SPAWNS,
  DOCK_SITES,
  LAB_SPAWNS,
  LAB_STATIONS,
  WORKSHOP_SITES,
  WORKSHOP_SPAWN,
  WORKSHOP_STATIONS,
  YARD_SITES,
  YARD_SPAWN,
} from '../src/pilot/zoneSites';
import {
  CORE_REGISTRY,
  DECK_REGISTRY,
  LAB_REGISTRY,
  WORLD_V1_REGISTRY,
  YARD_REGISTRY,
} from '../src/world/interactionRegistry';
import { gridOf, npcSolid } from '../src/world/layouts/grid';
import { YARD_LAYOUT, YARD_SOLIDS } from '../src/world/layouts/yard';
import {
  driveAxisTo,
  getEvents,
  hold,
  playerProbe,
  press,
  selectPromptOption,
} from './helpers';
import { navigateTo } from './navGrid';

export interface PilotProbe {
  zone: string;
  stage: string;
  episode: number;
  objective: string;
  beacon: {
    x: number;
    y: number;
    label: string;
    kind: string;
    visible: boolean;
  } | null;
  launch_mode: string;
  route: {
    stage: string;
    episode: number;
    current_zone: string | null;
    visited: string[];
    entry_counts: Record<string, number>;
  };
  mission_log: { id: string; kind: string; text: string }[];
}

export interface PilotCoverageProbe {
  launch_mode: string;
  developer_scenes_visited: string[];
  items: {
    item: string;
    disposition: string;
    status: string;
    opportunities: { opportunity_id: string; status: string }[];
  }[];
  summary: {
    scheduled: number;
    closed: number;
    open: number;
    neverEnteredLabels: string[];
  };
  final_core_closed: boolean;
}

/**
 * Well-known pilot positions. World V1: the Dock and Concourse books
 * derive from the source of truth (src/pilot/zoneSites.ts, PILOT_DOORS)
 * so a moved station never leaves a stale literal here; the zones not yet
 * rebuilt keep their V4 literals until their units.
 */
const doorOf = (zone: PilotZoneKey, to: PilotZoneKey) => {
  const ref = PILOT_DOORS[zone].find((door) => door.to === to);

  if (ref === undefined) {
    throw new Error(`pilotHelpers: no door ${zone} → ${to}`);
  }

  return { x: ref.x, y: ref.y };
};

export const PILOT = {
  dock: {
    terminal: { ...DOCK_SITES.terminal },
    northDoor: doorOf('dock', 'station_concourse'),
    /** Walkable point just south of the north door (inside the spine). */
    northDoorApproach: {
      x: doorOf('dock', 'station_concourse').x,
      y: doorOf('dock', 'station_concourse').y + 56,
    },
  },
  concourse: {
    vale: { ...CONCOURSE_STATIONS.vale },
    northDoor: doorOf('station_concourse', 'diagnostics_laboratory'),
    southDoor: doorOf('station_concourse', 'dock'),
    eastDoor: doorOf('station_concourse', 'utility_core_deck'),
    westDoor: doorOf('station_concourse', 'records_workshop'),
  },
  // World V2 rescue continuation: the 43×12 two-bay hall — all
  // coordinates derive from the machine-audited shared book.
  workshop: {
    board: { ...WORKSHOP_STATIONS.workOrderBoard },
    filingDesk: { ...WORKSHOP_STATIONS.filingDesk },
    pressA: { ...WORKSHOP_STATIONS.pressA },
    pressB: { ...WORKSHOP_STATIONS.pressB },
    storageLocker: { ...WORKSHOP_STATIONS.storageLocker },
    assemblyBench: { ...WORKSHOP_STATIONS.assemblyBench },
    relayBench: { ...WORKSHOP_STATIONS.relayBench },
    feedConsole: { ...WORKSHOP_STATIONS.feedConsole },
    reportDesk: { ...WORKSHOP_STATIONS.reportDesk },
    handoverDesk: { ...WORKSHOP_STATIONS.handoverDesk },
    sampleCutter: { ...WORKSHOP_SITES.sampleCutter },
    dispatchConsole: { ...WORKSHOP_SITES.dispatchConsole },
    calibrationBench: { ...WORKSHOP_SITES.calibrationBench },
    qcPacket: { ...WORKSHOP_SITES.qcPacket },
    sealLog: { ...WORKSHOP_SITES.sealLog },
    latticeBench: { ...WORKSHOP_SITES.latticeBench },
    spawn: { ...WORKSHOP_SPAWN },
    eastDoor: doorOf('records_workshop', 'station_concourse'),
  },
  // World V2 rebuild: the 22×12 painted laboratory — all coordinates
  // derive from the machine-audited shared book (approach offsets via
  // labApproach below, never a hand-typed literal).
  lab: {
    kai: { ...LAB_STATIONS.kai },
    workstation: { ...LAB_STATIONS.workstation },
    orientation: { ...LAB_STATIONS.orientation },
    evidenceTable: { ...LAB_STATIONS.evidenceTable },
    protocolConsole: { ...LAB_STATIONS.protocolConsole },
    trainingRig: { ...LAB_STATIONS.trainingRig },
    diagnosticBoard: { ...LAB_STATIONS.diagnosticBoard },
    airlock: doorOf('diagnostics_laboratory', 'exterior_recovery_yard'),
    southDoor: doorOf('diagnostics_laboratory', 'station_concourse'),
    spawnFromConcourse: { ...LAB_SPAWNS.fromConcourse },
    spawnFromYard: { ...LAB_SPAWNS.fromYard },
  },
  // World V2 rebuild: the 43×12 two-plate yard — coordinates derive from
  // the machine-audited shared book (approach offsets via yardApproach).
  yard: {
    noor: { ...YARD_SITES.noor },
    airlock: doorOf('exterior_recovery_yard', 'diagnostics_laboratory'),
    spawn: { ...YARD_SPAWN },
  },
  // World V2 rebuild: the 22×12 painted deck — all coordinates derive
  // from the machine-audited shared book (approach offsets via
  // deckApproach below, never a hand-typed literal).
  deck: {
    reviewPanel: { ...DECK_SITES.reviewPanel },
    systemsBoard: { ...DECK_SITES.systemsBoard },
    coolantValve: { ...DECK_SITES.coolantValve },
    calibrationBreaker: { ...DECK_SITES.calibrationBreaker },
    distributionBus: { ...DECK_SITES.distributionBus },
    coreDoor: doorOf('utility_core_deck', 'core_chamber'),
    westDoor: doorOf('utility_core_deck', 'station_concourse'),
    spawnFromConcourse: { ...DECK_SPAWNS.fromConcourse },
    spawnFromCore: { ...DECK_SPAWNS.fromCore },
  },
  // World V2 rebuild: the 22×12 painted chamber — coordinates derive from
  // the machine-audited shared book (approach offsets via coreApproach).
  core: {
    core: { ...CORE_SITES.core },
    kai: { ...CORE_SITES.kai },
    southDoor: doorOf('core_chamber', 'utility_core_deck'),
    spawn: { ...CORE_SPAWN },
  },
} as const;

/** World V1 registry approach point for an object id (rebuilt zones). */
export function registryApproach(id: string): { x: number; y: number } {
  for (const entries of Object.values(WORLD_V1_REGISTRY)) {
    const entry = entries?.find((candidate) => candidate.id === id);

    if (entry !== undefined) {
      return { ...entry.approach };
    }
  }

  throw new Error(`pilotHelpers: no registry entry ${id}`);
}

export async function pilotProbe(page: Page): Promise<PilotProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __pilotProbe?: PilotProbe | null })
        .__pilotProbe ?? null,
  );
}

export async function pilotCoverage(
  page: Page,
): Promise<PilotCoverageProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __pilotCoverage?: PilotCoverageProbe | null })
        .__pilotCoverage ?? null,
  );
}

export async function playerScene(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene ?? null,
  );
}

export async function waitScene(page: Page, scene: string, timeout = 30_000) {
  await page.waitForFunction(
    (expected) =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === expected,
    scene,
    { timeout },
  );
  await page.waitForTimeout(900);
}

/**
 * Boots the participant default (the Dock, opening overlay shown) and skips
 * the opening with one key press; resolves once the Dock is live.
 */
export async function bootPilot(
  page: Page,
  tag: string,
  options?: { extra?: string; skipOpening?: boolean },
) {
  await page.goto(
    `/?participant_id=PT_PILOT_${tag}&game_session_id=GS_PILOT_${tag}_${Date.now()}${options?.extra ?? ''}`,
  );
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __pilotOpeningProbe?: { open: boolean } | null;
        }
      ).__pilotOpeningProbe?.open === true,
    undefined,
    // 120 s: a video-recording context on software GL can double the
    // first-load time (observed on the rescue capture run).
    { timeout: 120_000 },
  );

  if (options?.skipOpening !== false) {
    await page.waitForTimeout(400);
    await press(page, 'Space');
    await waitScene(page, 'dock', 60_000);
    // Typewriter/feedback settle (bootGame precedent).
    await page.waitForTimeout(1600);
  }
}

/** Boots a developer alias directly (no opening). */
export async function bootPilotScene(page: Page, tag: string, scene: string) {
  await page.goto(
    `/?participant_id=PT_PILOT_${tag}&game_session_id=GS_PILOT_${tag}_${Date.now()}&scene=${scene}`,
  );
  await waitScene(page, scene, 60_000);
  await page.waitForTimeout(1200);
}

/**
 * Axis-by-axis position-synced walk (x first unless yFirst).
 *
 * World V1 (U1 closure): a leg can end OUTSIDE its tolerance under CPU
 * load — a 100 ms final burst delivers ~17 px at 60 fps but 30–45 px when
 * the software-GL renderer starves the key-up (observed: a 29 px overshoot
 * on the Concourse north-door x-leg). After both legs the observed
 * position is re-checked and each axis still off by more than the
 * tolerance is corrected with up to two further short legs. Test-driver
 * precision only — production geometry is never adjusted for the driver.
 */
export async function walkTo(
  page: Page,
  x: number,
  y: number,
  options?: { yFirst?: boolean; tolerance?: number },
) {
  const tolerance = options?.tolerance ?? 12;
  const legs: ('x' | 'y')[] = options?.yFirst ? ['y', 'x'] : ['x', 'y'];
  const start = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );

  for (let attempt = 0; attempt < 2; attempt += 1) {
    // A leg that clamps on a collision row (the second leg running along
    // a wall block) leaves the avatar off target. The second attempt goes
    // back to the start position's first-leg coordinate and walks the
    // L the other way round — a different path, not the same wall again.
    // Driver only; production geometry is never adjusted for it.
    const order = attempt === 0 ? legs : legs.slice().reverse();

    if (attempt === 1 && start !== null) {
      // Back to the START POINT on both axes (second leg first), so the
      // reversed L really starts from the other corner of the rectangle
      // — restoring one axis alone re-entered the same wall from the
      // other side (observed: Vale approached from the north spawn).
      for (const back of [legs[1], legs[0]]) {
        await driveAxisTo(
          page,
          back,
          back === 'x' ? start.x : start.y,
          tolerance,
        );
      }
    }

    for (const axis of order) {
      await driveAxisTo(page, axis, axis === 'x' ? x : y, tolerance);
    }

    if (await settledWithin(page, x, y, tolerance, order)) {
      return;
    }
  }
}

async function settledWithin(
  page: Page,
  x: number,
  y: number,
  tolerance: number,
  legs: readonly ('x' | 'y')[],
): Promise<boolean> {
  for (let pass = 0; pass < 2; pass += 1) {
    const at = await page.evaluate(
      () =>
        (
          window as unknown as {
            __playerProbe?: { x: number; y: number } | null;
          }
        ).__playerProbe ?? null,
    );

    if (at === null) {
      return true;
    }

    const offX = Math.abs(at.x - x) > tolerance;
    const offY = Math.abs(at.y - y) > tolerance;

    if (!offX && !offY) {
      return true;
    }

    // Correct the last leg's axis first (the overshoot lives there), then
    // the other axis only if it also drifted.
    for (const axis of legs.slice().reverse()) {
      if (axis === 'x' ? offX : offY) {
        await driveAxisTo(page, axis, axis === 'x' ? x : y, tolerance);
      }
    }
  }

  const at = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );

  return (
    at === null ||
    (Math.abs(at.x - x) <= tolerance && Math.abs(at.y - y) <= tolerance)
  );
}

/** Walks next to an interactable and presses SPACE (retrying swallowed presses). */
export async function interactAt(
  page: Page,
  at: { x: number; y: number },
  options?: { yFirst?: boolean; approachOffset?: { x: number; y: number } },
) {
  const target = {
    x: at.x + (options?.approachOffset?.x ?? 0),
    y: at.y + (options?.approachOffset?.y ?? 0),
  };

  await walkTo(page, target.x, target.y, { yFirst: options?.yFirst });

  // Close the gap (U1 closure): an approach offset near the 72 px radius
  // plus the 12 px landing tolerance can leave the avatar a few px out of
  // range (observed: 74 px from the Dock's north door). If no prompt is
  // showing, step toward the object along its dominant axis — at most
  // twice, 16 px each — before pressing. Driver only.
  for (let nudge = 0; nudge < 2; nudge += 1) {
    const visible = await page.evaluate(
      () =>
        (
          window as unknown as {
            __worldPromptProbe?: { prompt: boolean } | null;
          }
        ).__worldPromptProbe?.prompt ?? false,
    );

    if (visible) {
      break;
    }

    const here = await page.evaluate(
      () =>
        (
          window as unknown as {
            __playerProbe?: { x: number; y: number } | null;
          }
        ).__playerProbe ?? null,
    );

    if (here === null) {
      break;
    }

    const dx = at.x - here.x;
    const dy = at.y - here.y;
    const axis: 'x' | 'y' = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    const step = axis === 'x' ? Math.sign(dx) * 16 : Math.sign(dy) * 16;

    // Never silent (test review T4): a nudge is recorded in the run log so
    // a geometry regression that passes only because of it stays visible.
    // eslint-disable-next-line no-console
    console.log(
      `[driver] nudge ${nudge + 1} toward ${at.x},${at.y} from ${Math.round(here.x)},${Math.round(here.y)} (${axis} ${step > 0 ? '+' : ''}${step})`,
    );

    await driveAxisTo(page, axis, (axis === 'x' ? here.x : here.y) + step, 6);
    await page.waitForTimeout(150);
  }

  await press(page, 'Space');
}

/** Opens a prompt at the interactable and waits for its cards. */
export async function openPromptAt(
  page: Page,
  at: { x: number; y: number },
  options?: { yFirst?: boolean; approachOffset?: { x: number; y: number } },
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, at, options);

    const opened = await page
      .waitForFunction(
        () =>
          (window as unknown as { __promptCards?: unknown[] | null })
            .__promptCards !== null &&
          (window as unknown as { __promptCards?: unknown[] | null })
            .__promptCards !== undefined,
        undefined,
        { timeout: 3000 },
      )
      .then(() => true)
      .catch(() => false);

    if (opened) {
      return;
    }
  }

  // Diagnostic detail (U1 closure): the observed avatar position and the
  // world-prompt probe at the moment of failure, so a driver miss (out of
  // range) and a real interactability defect (in range, no prompt) are
  // distinguishable from the error alone.
  const observed = await page.evaluate(() => {
    const w = window as unknown as {
      __playerProbe?: { x: number; y: number } | null;
      __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
    };

    return {
      at: w.__playerProbe ?? null,
      prompt: w.__worldPromptProbe ?? null,
    };
  });

  const target = {
    x: at.x + (options?.approachOffset?.x ?? 0),
    y: at.y + (options?.approachOffset?.y ?? 0),
  };

  throw new Error(
    `prompt did not open at ${at.x},${at.y} (target ${target.x},${target.y}; observed ${JSON.stringify(observed)})`,
  );
}

/** Uses a pilot door and waits for the destination scene. */
export async function useDoor(
  page: Page,
  door: { x: number; y: number },
  destination: string,
  options?: { yFirst?: boolean; approachOffset?: { x: number; y: number } },
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, door, options);

    const arrived = await page
      .waitForFunction(
        (scene) =>
          (window as unknown as { __playerProbe?: { scene: string } | null })
            .__playerProbe?.scene === scene,
        destination,
        { timeout: 6000 },
      )
      .then(() => true)
      .catch(() => false);

    if (arrived) {
      await page.waitForTimeout(900);
      return;
    }
  }

  // Diagnostic detail (U1 closure): scene, position, prompt and the last
  // feedback line at the moment of failure — a driver miss, a sealed
  // door's message and a stalled transition all read differently.
  const observed = await page.evaluate(() => {
    const w = window as unknown as {
      __playerProbe?: { scene: string; x: number; y: number } | null;
      __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
      __lastRoomFeedbackText?: string | null;
    };

    return {
      at: w.__playerProbe ?? null,
      prompt: w.__worldPromptProbe ?? null,
      feedback: w.__lastRoomFeedbackText ?? null,
    };
  });

  throw new Error(
    `door at ${door.x},${door.y} did not reach ${destination} (observed ${JSON.stringify(observed)})`,
  );
}

export async function pilotEventTypes(page: Page): Promise<string[]> {
  return (await getEvents(page)).map((event) => event.event_type);
}

/**
 * The bare route emits no behavioural measurement event. Exposure records
 * (`*_presented` — an offer or fault was shown) are the only proto_* events
 * tolerated: they carry the required presented timestamp and never a value.
 */
const SYSTEM_DRIVEN = new Set([
  'proto_m05_initiation_opportunity_opened',
  'proto_m05_initiation_window_closed',
  // Unit 5: the feed console logs `resume_unavailable` once (input_mode
  // 'system') when the workshop is entered on the return without an
  // antenna start — a system-driven availability record, not an act.
  'proto_m20_antenna_resume_unavailable',
]);

export async function expectNoMeasurementEvents(page: Page) {
  const types = await pilotEventTypes(page);

  expect(
    types.filter(
      (type) =>
        type.startsWith('proto_') &&
        !type.endsWith('_presented') &&
        // System-driven registrations (a silently presented window opening
        // and censoring on departure, input_mode 'system') are not
        // participant acts; the bare route must emit no participant act.
        !SYSTEM_DRIVEN.has(type),
    ),
  ).toEqual([]);
}

export async function expectStage(page: Page, stage: string) {
  await page.waitForFunction(
    (expected) =>
      (window as unknown as { __pilotProbe?: { stage: string } | null })
        .__pilotProbe?.stage === expected,
    stage,
    { timeout: 8000 },
  );
}

// ——— v2 spine navigation (explicit beats only; never a measurement window) ———

/**
 * World V1 production Concourse: the districts hang off the spine (cols
 * 28–31) and the loops; a two-leg L from an arbitrary point clamps on a
 * district wall. Route every Concourse leg through the spine: reach the
 * south loop row (or the axis when already on it), the spine column, the
 * target row, then the target column. Driver only — production geometry
 * is never adjusted for it.
 */
export async function concourseVia(page: Page, x: number, y: number) {
  // Rescue Concourse (22×12): three regions — the west hall (open floor
  // up to x ≈ 470), the south lane (safe east–west travel at y ≈ 252,
  // where the body's top edge clears the operations-desk row) and the
  // two-column east strip (safe north–south travel at x ≈ 604, where the
  // body's left edge clears the desk/table column). Route legs through
  // them; driver only — production geometry is never adjusted for it.
  const here = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );
  const eastTarget = x >= 576;
  const eastHere = here !== null && here.x >= 576;

  if (eastTarget !== eastHere) {
    // Cross between the hall and the strip through the south lane.
    if (here === null || here.y < 242) {
      await driveAxisTo(page, 'y', 252, 8);
    }

    await driveAxisTo(page, 'x', eastTarget ? 604 : 368, 8);
  }

  if (eastTarget) {
    await driveAxisTo(page, 'y', y, 10);
    await walkTo(page, x, y, { yFirst: true });
    return;
  }

  // West-hall target: pick the row first (the hall is open); the
  // west-door pocket is entered along the rows-5/6 band only.
  await driveAxisTo(page, 'y', x < 140 ? 190 : y, 8);
  await walkTo(page, x, y, { yFirst: false });
}

/**
 * Rescue Workshop (43×12 two-bay hall): three walk segments — the machine
 * bay west of the cutter island (x < 500), the mid zone between the
 * island and the vestibule (500–700), and the records office (x > 700).
 * Lane discipline (machine-audited): the island (cols 12–15) is passed on
 * the NORTH lane (y ≈ 156, rows 4–5, x 320–608), the vestibule is crossed
 * at y ≈ 240 (rows 6–8), and the office travels on the y ≈ 252 south
 * lane. Driver only — production geometry is never adjusted for it.
 */
export async function workshopVia(page: Page, x: number, y: number) {
  const seg = (px: number) => (px < 500 ? 0 : px < 700 ? 1 : 2);
  const here = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );
  let at = here ?? { x, y };

  for (let guard = 0; guard < 4 && seg(at.x) !== seg(x); guard += 1) {
    if (seg(at.x) === 0) {
      // West → mid over the island's north lane.
      await driveAxisTo(page, 'x', 352, 8);
      await driveAxisTo(page, 'y', 156, 8);
      await driveAxisTo(page, 'x', 544, 8);
      at = { x: 544, y: 156 };
    } else if (seg(at.x) === 1 && seg(x) === 2) {
      // Mid → office through the vestibule.
      await driveAxisTo(page, 'y', 240, 8);
      await driveAxisTo(page, 'x', 780, 8);
      at = { x: 780, y: 240 };
    } else if (seg(at.x) === 1 && seg(x) === 0) {
      // Mid → west back over the north lane.
      await driveAxisTo(page, 'x', 544, 8);
      await driveAxisTo(page, 'y', 156, 8);
      await driveAxisTo(page, 'x', 352, 8);
      at = { x: 352, y: 156 };
    } else {
      // Office → mid through the vestibule.
      await driveAxisTo(page, 'y', 240, 8);
      await driveAxisTo(page, 'x', 644, 8);
      at = { x: 644, y: 240 };
    }
  }

  await walkTo(page, x, y, { yFirst: true });
}

/**
 * Rebuilt Laboratory (22×12 painted plate): the workstation island (x
 * 403–480, rows 6–7) splits the floor into a west hall and an east bay
 * that connect ONLY over the north lane (y ≈ 156, rows 4–5). A leg that
 * changes sides climbs to the lane, crosses, then descends. Driver only —
 * production geometry is never adjusted for it.
 */
export async function labVia(page: Page, x: number, y: number) {
  const side = (px: number) => (px < 440 ? 0 : 1);
  const here = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );

  if (here !== null && side(here.x) !== side(x)) {
    // The lane (row 4) exists only between cols 5 and 16, so the climb
    // happens at the lane's own end columns: x 352 (west) / x 512 (east —
    // the middle of the 32 px window clear of the island), never at the
    // current x.
    const from = side(here.x) === 1 ? 512 : 352;
    const to = side(x) === 1 ? 512 : 352;

    // The east window is exactly one body wide (x 496–528 for the body's
    // centre: island east face 480 below, lane end column 544 above), so
    // a ±8 landing can settle on its very edge after the key-up drift and
    // the climb clamps on the island / desk legs (observed in-engine:
    // (496,178) after Kai's beat). Land at ±4, VERIFY the lane was
    // reached, and re-centre + climb again if not — up to three tries.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await driveAxisTo(page, 'x', from, 4);
      await driveAxisTo(page, 'y', 156, 8);

      const now = await page.evaluate(
        () =>
          (
            window as unknown as {
              __playerProbe?: { x: number; y: number } | null;
            }
          ).__playerProbe ?? null,
      );

      if (now === null || now.y <= 168) {
        break;
      }

      // eslint-disable-next-line no-console
      console.log(
        `[driver] labVia climb stalled at ${Math.round(now.x)},${Math.round(now.y)} toward the lane (attempt ${attempt + 1})`,
      );
    }

    await driveAxisTo(page, 'x', to, 8);
  }

  await walkTo(page, x, y, { yFirst: true });
}

/**
 * Walks (island-aware) to the registry approach point of a laboratory
 * object and returns the approach offset for interactAt / openPromptAt /
 * useDoor — so every spec stands on the machine-audited point instead of
 * a hand-typed offset.
 */
export async function labApproach(
  page: Page,
  at: { x: number; y: number },
): Promise<{ x: number; y: number }> {
  const entry = LAB_REGISTRY.find(
    (candidate) =>
      Math.abs(candidate.x - at.x) < 1 && Math.abs(candidate.y - at.y) < 1,
  );

  if (entry === undefined) {
    throw new Error(
      `pilotHelpers: no laboratory registry object at ${at.x},${at.y}`,
    );
  }

  await labVia(page, entry.approach.x, entry.approach.y);

  return { x: entry.approach.x - at.x, y: entry.approach.y - at.y };
}

/**
 * Rebuilt Utility Deck (22×12 painted plate): an open hall whose three
 * south machines (rows 7–10) block east–west travel below row 7. Every
 * leg travels on the rows 5–6 band (y ≈ 176) before descending. Driver
 * only — production geometry is never adjusted for it.
 */
export async function deckVia(page: Page, x: number, y: number) {
  await driveAxisTo(page, 'y', 176, 8);
  await driveAxisTo(page, 'x', x, 8);
  await walkTo(page, x, y, { yFirst: true });
}

/**
 * Walks (lane-aware) to the registry approach point of a deck object and
 * returns the approach offset for interactAt / openPromptAt / useDoor.
 */
export async function deckApproach(
  page: Page,
  at: { x: number; y: number },
): Promise<{ x: number; y: number }> {
  const entry = DECK_REGISTRY.find(
    (candidate) =>
      Math.abs(candidate.x - at.x) < 1 && Math.abs(candidate.y - at.y) < 1,
  );

  if (entry === undefined) {
    throw new Error(`pilotHelpers: no deck registry object at ${at.x},${at.y}`);
  }

  await deckVia(page, entry.approach.x, entry.approach.y);

  return { x: entry.approach.x - at.x, y: entry.approach.y - at.y };
}

/**
 * Rebuilt Core Chamber (22×12 painted plate): the reactor platform splits
 * the west and east floors, which connect only through the south corridor
 * (rows 8–9, y ≈ 288). Every leg drops to the corridor first. Driver only
 * — production geometry is never adjusted for it.
 */
export async function coreVia(page: Page, x: number, y: number) {
  await driveAxisTo(page, 'y', 288, 8);
  await driveAxisTo(page, 'x', x, 8);
  await walkTo(page, x, y, { yFirst: true });
}

/**
 * Walks (corridor-aware) to the registry approach point of a chamber
 * object and returns the approach offset for interactAt / openPromptAt /
 * useDoor.
 */
export async function coreApproach(
  page: Page,
  at: { x: number; y: number },
): Promise<{ x: number; y: number }> {
  const entry = CORE_REGISTRY.find(
    (candidate) =>
      Math.abs(candidate.x - at.x) < 1 && Math.abs(candidate.y - at.y) < 1,
  );

  if (entry === undefined) {
    throw new Error(
      `pilotHelpers: no chamber registry object at ${at.x},${at.y}`,
    );
  }

  await coreVia(page, entry.approach.x, entry.approach.y);

  return { x: entry.approach.x - at.x, y: entry.approach.y - at.y };
}

/**
 * World V3 open Recovery Yard (56×24 field, free-standing props): every
 * leg is planned over the yard's PURE collision model (cells + skirts +
 * prop solids + Noor's foot solid) and driven with ordinary held keys
 * (e2e/navGrid.ts) — the two-plate strip's hand-written pass / gantry /
 * panel lanes are gone with the strip. Driver only.
 */
const YARD_NAV_GRID = gridOf(YARD_LAYOUT, [
  ...YARD_SOLIDS,
  npcSolid(YARD_SITES.noor.x, YARD_SITES.noor.y),
]);

export async function yardVia(page: Page, x: number, y: number) {
  await navigateTo(
    page,
    YARD_NAV_GRID,
    { x, y },
    { reach: 6, tolerance: 8, margin: 9 },
  );
}

/**
 * Walks (pass-aware) to the registry approach point of a yard site and
 * returns the approach offset for interactAt / openPromptAt / useDoor.
 */
export async function yardApproach(
  page: Page,
  at: { x: number; y: number },
): Promise<{ x: number; y: number }> {
  const entry = YARD_REGISTRY.find(
    (candidate) =>
      Math.abs(candidate.x - at.x) < 1 && Math.abs(candidate.y - at.y) < 1,
  );

  if (entry === undefined) {
    throw new Error(`pilotHelpers: no yard registry object at ${at.x},${at.y}`);
  }

  await yardVia(page, entry.approach.x, entry.approach.y);

  return { x: entry.approach.x - at.x, y: entry.approach.y - at.y };
}

/** Dock (after the tutorial) → Concourse north door → stage handover_briefing. */
export async function dockToConcourse(page: Page) {
  await walkTo(
    page,
    PILOT.dock.northDoorApproach.x,
    PILOT.dock.northDoorApproach.y,
    { yFirst: true },
  );
  await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
    approachOffset: { x: 0, y: 20 },
  });
  await expectStage(page, 'handover_briefing');
}

/**
 * Vale's briefing (→ incident_handover), the chained voluntary offers left
 * UNANSWERED (dismissed — no behavioural event, only the exposure record),
 * then the handover confirmation (→ workshop).
 */
export async function valeHandover(page: Page) {
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
  await page.waitForTimeout(300);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 56 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop');
}

/** Concourse west door → Records Workshop (any stage). */
export async function concourseToWorkshop(page: Page) {
  await concourseVia(
    page,
    PILOT.concourse.westDoor.x + 56,
    PILOT.concourse.westDoor.y,
  );
  // The west-door pocket admits the body along rows 5–6 only (probe y
  // 178–200). The lane leg lands at 190 ±8 and the key-up drift can carry
  // it past 200 (observed in-engine: clamped at (176,203) outside the
  // pocket); re-centre on the band at ±4 before the door leg.
  await driveAxisTo(page, 'y', 190, 4);
  await useDoor(page, PILOT.concourse.westDoor, 'records_workshop', {
    approachOffset: { x: 40, y: 0 },
    yFirst: true,
  });
}

/** Records Workshop east door → Concourse. */
export async function workshopToConcourse(page: Page) {
  await workshopVia(page, 1288, 268);
  await useDoor(page, PILOT.workshop.eastDoor, 'station_concourse', {
    approachOffset: { x: -44, y: -22 },
    yFirst: true,
  });
}

/** Work Order Board: take the orders (→ workshop_work), then sign off (→ lab_briefing). */
export async function workshopSignOff(page: Page) {
  await workshopVia(page, 1312, 178);
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_work');
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'lab_briefing');
}

/** Concourse north door → Laboratory, then Kai's briefing (→ lab_work). */
export async function concourseToLabBriefed(page: Page) {
  await concourseVia(
    page,
    PILOT.concourse.northDoor.x,
    PILOT.concourse.northDoor.y + 56,
  );
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: await labApproach(page, PILOT.lab.kai),
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'lab_work');
}

/** Kai "done" (→ exterior_briefing), airlock → Yard, Noor "Ready" (→ exterior_work). */
export async function labToYardBriefed(page: Page) {
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: await labApproach(page, PILOT.lab.kai),
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'exterior_briefing');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: await yardApproach(page, PILOT.yard.noor),
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'exterior_work');
}

/**
 * Noor "done outside" (→ return_hub), airlock → Laboratory → Concourse.
 * This is the route's ONE purposeful return.
 */
export async function yardReturnToConcourse(page: Page) {
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: await yardApproach(page, PILOT.yard.noor),
  });
  await selectPromptOption(page, 2);
  await expectStage(page, 'return_hub');
  await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
    approachOffset: await yardApproach(page, PILOT.yard.airlock),
  });
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: await labApproach(page, PILOT.lab.southDoor),
  });
}

/** Vale's return check-in (→ workshop_return), west door → Workshop, board sign-off (→ deck_closure). */
export async function returnShiftToDeckClosure(page: Page) {
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_return');
  await concourseToWorkshop(page);
  await workshopVia(page, 1312, 178);
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'deck_closure');
  await workshopToConcourse(page);
}

/** Concourse east door → Utility Deck. */
export async function concourseToDeck(page: Page) {
  await concourseVia(
    page,
    PILOT.concourse.eastDoor.x - 56,
    PILOT.concourse.eastDoor.y,
  );
  await useDoor(page, PILOT.concourse.eastDoor, 'utility_core_deck', {
    approachOffset: { x: -40, y: 0 },
    yFirst: true,
  });
}

/** Full spine from the Dock (after the tutorial) to the Workshop at stage workshop_work. */
export async function routeToWorkshopWork(page: Page) {
  await dockToConcourse(page);
  await valeHandover(page);
  await concourseToWorkshop(page);
  await workshopVia(page, 1312, 178);
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_work');
  // Step down onto the office's clear y=252 lane before any spec walks
  // west (the board approach sits against the east wall).
  await walkTo(page, 1256, 252, { yFirst: true });
}

/** Full spine from the Dock (after the tutorial) to the Laboratory at stage lab_work. */
export async function routeToLabWork(page: Page) {
  await dockToConcourse(page);
  await valeHandover(page);
  await concourseToWorkshop(page);
  await workshopSignOff(page);
  await workshopToConcourse(page);
  await concourseToLabBriefed(page);
}

/** Full spine from the Dock (after the tutorial) to the Yard at stage exterior_work. */
export async function routeToYardWork(page: Page) {
  await routeToLabWork(page);
  await labToYardBriefed(page);
}

/** Full spine from the Dock (after the tutorial) to the Deck at stage deck_closure. */
export async function routeToDeckClosure(page: Page) {
  await routeToYardWork(page);
  await yardReturnToConcourse(page);
  await returnShiftToDeckClosure(page);
  await concourseToDeck(page);
  await expectStage(page, 'deck_closure');
}

export { hold, press };

/**
 * V3 verification (1920×1080 driver evidence): logs where a leg actually
 * landed relative to its audited approach point together with the DEV
 * frame-time probe, so landing precision can be read against the
 * renderer's frame quantum. Read-only; nothing behavioural.
 */
export async function logLanding(
  page: Page,
  id: string,
  approach: { x: number; y: number },
) {
  const at = await page.evaluate(() => {
    const w = window as unknown as {
      __playerProbe?: { x: number; y: number } | null;
      __frameProbe?: { fps: number; avgMs: number; maxMs: number } | null;
    };

    return { player: w.__playerProbe ?? null, frames: w.__frameProbe ?? null };
  });
  const dx = at.player === null ? null : at.player.x - approach.x;
  const dy = at.player === null ? null : at.player.y - approach.y;

  // eslint-disable-next-line no-console
  console.log(
    `[landing] ${id}: off by (${dx === null ? '?' : dx.toFixed(1)}, ${dy === null ? '?' : dy.toFixed(1)}) px · ${at.frames === null ? 'frames n/a' : `${at.frames.fps.toFixed(1)} fps (avg ${at.frames.avgMs.toFixed(0)} ms, max ${at.frames.maxMs.toFixed(0)} ms)`}`,
  );
}

/**
 * V3 verification (1920×1080 tours): walks to an audited approach point
 * with the room's own via-helper and reads the world prompt; when the
 * landing sits inside the ±12 px box but the prompt names something else
 * (measured at 1080p: ~28 px of travel per rendered frame lands on the
 * box's corners, where an approach's nearest-wins margin can be thinner
 * than the box — e.g. a supply bundle beside the workshop locker), backs
 * off 40 px along the worse axis and re-approaches, at most `tries`
 * times, logging every landing. Real input only; the caller keeps its
 * own assertion on the returned text. Returns the last prompt text.
 */
export async function approachAudited(
  page: Page,
  via: (page: Page, x: number, y: number) => Promise<void>,
  entry: { id: string; label: string; approach: { x: number; y: number } },
  promptText: () => Promise<string | null>,
  tries = 3,
): Promise<string | null> {
  let text: string | null = null;

  for (let attempt = 1; attempt <= tries; attempt += 1) {
    await via(page, entry.approach.x, entry.approach.y);
    await logLanding(page, entry.id, entry.approach);
    await page.waitForTimeout(250);
    text = await promptText();

    if (
      text !== null &&
      text.toLowerCase().includes(entry.label.toLowerCase())
    ) {
      return text;
    }

    const at = await playerProbe(page);
    const dx = at === null ? 0 : at.x - entry.approach.x;
    const dy = at === null ? 0 : at.y - entry.approach.y;

    // eslint-disable-next-line no-console
    console.log(
      `[approach] ${entry.id}: try ${attempt}/${tries} landed off by (${dx.toFixed(1)}, ${dy.toFixed(1)}) px, prompt ${JSON.stringify(text)} — re-approaching`,
    );

    if (attempt < tries) {
      // Back off along the worse axis, away from the side we landed on, so
      // the final leg re-rolls its frame phase from the other side.
      const axisX = Math.abs(dx) >= Math.abs(dy);
      const sign = axisX ? dx : dy;
      const back = sign > 0 ? -40 : 40;

      await via(
        page,
        entry.approach.x + (axisX ? back : 0),
        entry.approach.y + (axisX ? 0 : back),
      );
    }
  }

  return text;
}
