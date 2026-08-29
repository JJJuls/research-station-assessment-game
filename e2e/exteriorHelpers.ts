/**
 * Exterior Recovery e2e drivers (evidence-led pilot v2, Unit 4).
 *
 * Real keyboard input only, position-synced on the DEV `__playerProbe`;
 * read-only DEV probes (`__exteriorProbe`, `__fieldActionsProbe`,
 * `__measurementValidity`, `__pilotCoverage`); never a teleport, never a
 * state mutation through the window. Every driver walks the participant
 * path (E at a site panel, the site's own option cards, C/D/F in the
 * world) — no developer boot and no internal function call.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { driveAxisTo, getEvents, hold, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  interactAt,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotProbe,
  press,
  routeToYardWork,
  useDoor,
  walkTo,
} from './pilotHelpers';

export { captureErrors, expectNoRuntimeErrors };

/** Yard geometry (src/pilot/zoneSites.ts YARD_SITES + M23_TARGET_CELLS). */
export const YARD = {
  noor: { x: 300.8, y: 428.8 },
  airlock: { x: 384, y: 496 },
  coupling: { x: 102.4, y: 336 },
  mast: { x: 416, y: 176 },
  stake: { x: 480, y: 272 },
  rig: { x: 624, y: 160 },
  bench: { x: 726.4, y: 198.4 },
  uplinkA: { x: 96, y: 128 },
  uplinkB: { x: 304, y: 160 },
  panel: { x: 224, y: 96 },
  crate: { x: 176, y: 448 },
  flag: { x: 560, y: 448 },
  pad: { x: 680, y: 150 },
  targetCells: {
    form_a: { x: 592, y: 304 },
    form_b: { x: 656, y: 400 },
  },
  /** Sweep positions per form: outside the signal, faint, actionable. */
  scanSpots: {
    form_a: {
      none: { x: 700, y: 440 },
      faint: { x: 528, y: 420 },
      actionable: { x: 592, y: 360 },
    },
    form_b: {
      none: { x: 528, y: 272 },
      faint: { x: 560, y: 300 },
      actionable: { x: 656, y: 340 },
    },
  },
} as const;

/** Approach offsets (44 px, no other interactable nearer — D-V2-1 rule). */
export const APPROACH = {
  noor: { x: 0, y: 40 },
  coupling: { x: 44, y: 0 },
  mast: { x: 0, y: 44 },
  stake: { x: 0, y: 44 },
  rig: { x: 0, y: 44 },
  bench: { x: -44, y: 0 },
  uplinkA: { x: 0, y: 44 },
  uplinkB: { x: 0, y: 44 },
  panel: { x: 0, y: 44 },
  crate: { x: 0, y: -44 },
  flag: { x: 0, y: -44 },
} as const;

export const FORBIDDEN_TEXT =
  /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bQ\d{2}\b|score|trait|persist|valid/i;

export const OPPORTUNITY = {
  m05o2: 'proto_m05_initiation_o2',
  m19: 'proto_m19_progressive_valve',
  m20: 'proto_m20_antenna_restoration',
  m23: 'proto_m23_field_recovery',
  m24: 'proto_m24_magnet_utility',
  m26: 'proto_m26_channel_disconnect',
} as const;

export interface ExteriorProbe {
  site: string;
  objective: string;
  stage: string;
  m23_form: 'form_a' | 'form_b';
  deck_form: 'A' | 'B';
  shift_ended: boolean;
  zone_entries: number;
  caches: { id: string; item_id: string; x: number; y: number }[];
  dug_cells: { col: number; row: number }[];
  m05: { presented: boolean; open: boolean; initiated: boolean };
  m19: {
    window: string;
    exit: string | null;
    entered: boolean;
    closed: boolean;
    bound: boolean;
    thaw_remaining: number;
    progress: number;
    completion: boolean;
    stop_choice: string | null;
    useful_attempts: number;
    ineffective_attempts: number;
    strategy_shifts: number;
    inspections: number;
    acts: number;
    difficulty_onset: { elapsed_ms: number; progress: number } | null;
    postdifficulty_reengagement: boolean | null;
    departures: number;
  };
  m20: {
    window: string;
    accepted: boolean;
    stages_done: string[];
    outdoor_complete: boolean;
    interruption_recorded: boolean;
    progress_pre_interruption: number | null;
    returned: null;
    completion: null;
    departures: number;
  };
  m23: {
    window: string;
    exit: string | null;
    open: boolean;
    informative_scan_moves: number;
    signal_strength_changes: {
      stronger: number;
      weaker: number;
      unchanged: number;
    };
    exact_dig_attempts: number;
    useful_strategy_shifts: number;
    recovery_complete: boolean;
    recovery_delivery: string | null;
    scans: number;
    on_signal_scans: number;
    digs: number;
    invalid_actions: number;
    first_actionable_signal_ms: number | null;
    stop_choice: string | null;
  };
  m24: {
    window: string;
    exit: string | null;
    open: boolean;
    knowledge: string;
    depletion_reached: boolean;
    depletion_acknowledged: boolean;
    depletion_shown_count: number;
    postdepletion_casts: number;
    postdepletion_casts_pre_ack: number;
    identical_postdepletion_cycles: number;
    alternative_opened: boolean;
    cycles_committed: number;
    useful_outcomes: number;
  };
  m26: {
    window: string;
    exit: string | null;
    open: boolean;
    knowledge: string;
    next_report: string | null;
    disconnect_demonstrated: boolean;
    disconnect_acknowledged: boolean;
    confirmation_probe_excluded: boolean;
    postknowledge_transmissions: number;
    alternative_used: boolean;
    pre_knowledge_attempts: number;
    evidence_views: number;
    all_reports_delivered: boolean;
  };
}

export async function exteriorProbe(page: Page): Promise<ExteriorProbe> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe ?? null,
  );

  if (probe === null) {
    throw new Error('exterior probe unavailable');
  }

  return probe;
}

export interface FieldActionsProbeLike {
  worldActionActive: boolean;
  scan: {
    cooling: boolean;
    context: string;
    last: {
      strength: number;
      category: string;
      trend: string | null;
      target_id: string | null;
    } | null;
  };
  dig: {
    last: { col: number; row: number; outcome: string } | null;
    target: { col: number; row: number } | null;
  };
  magnet: {
    phase: string;
    markerInBand: boolean;
    deckForm: string | null;
    deckPosition: number;
    totalPulls: number;
    depleted: boolean;
  };
  windows: { m23_open: boolean; m24_open: boolean; m26_phase: string };
  caches: unknown[];
}

export async function faProbe(page: Page): Promise<FieldActionsProbeLike> {
  const probe = await page.evaluate(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: FieldActionsProbeLike | null;
        }
      ).__fieldActionsProbe ?? null,
  );

  if (probe === null) {
    throw new Error('field-actions probe unavailable');
  }

  return probe;
}

export interface ValidityRecordLike {
  opportunity_id: string;
  form: string | null;
  counterbalance: string | null;
  offered: boolean;
  entered: boolean;
  completed: boolean;
  invalid_reason: string | null;
  invalid_detail: string | null;
  prior_exposure: string[];
  validity: string;
}

export async function validityRecord(
  page: Page,
  opportunityId: string,
): Promise<ValidityRecordLike> {
  const rows = await page.evaluate(
    () =>
      (
        window as unknown as {
          __measurementValidity?: ValidityRecordLike[] | null;
        }
      ).__measurementValidity ?? [],
  );
  const row = rows.find(
    (candidate) => candidate.opportunity_id === opportunityId,
  );

  if (row === undefined) {
    throw new Error(`validity record ${opportunityId} missing`);
  }

  return row;
}

export async function itemStatus(page: Page, item: string): Promise<string> {
  const coverage = await pilotCoverage(page);
  const row = coverage?.items.find((candidate) => candidate.item === item);

  if (row === undefined) {
    throw new Error(`coverage row ${item} missing`);
  }

  return row.status;
}

export interface PilotEventLike {
  event_type: string;
  metadata?: Record<string, unknown>;
}

export async function eventsByType(
  page: Page,
  type: string,
): Promise<PilotEventLike[]> {
  return ((await getEvents(page)) as PilotEventLike[]).filter(
    (event) => event.event_type === type,
  );
}

export async function eventsByPrefix(
  page: Page,
  prefix: string,
): Promise<PilotEventLike[]> {
  return ((await getEvents(page)) as PilotEventLike[]).filter((event) =>
    event.event_type.startsWith(prefix),
  );
}

export async function lastFeedback(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __lastRoomFeedbackText?: string | null })
        .__lastRoomFeedbackText ?? null,
  );
}

export async function lastPromptBody(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (window as unknown as { __lastPromptBody?: string | null })
        .__lastPromptBody ?? '',
  );
}

export async function waitNoWorldAction(page: Page, timeout = 10_000) {
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: { worldActionActive: boolean } | null;
        }
      ).__fieldActionsProbe?.worldActionActive === false,
    undefined,
    { timeout },
  );
}

/* ------------------------------------------------------------------ *
 * Entry
 * ------------------------------------------------------------------ */

/** Dock → … → Yard at stage exterior_work (the pure fail-forward spine). */
export async function enterYard(page: Page, tag: string) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await routeToYardWork(page);

  const probe = await pilotProbe(page);

  expect(probe?.stage).toBe('exterior_work');
  expect(probe?.zone).toBe('exterior_recovery_yard');
}

/** Compound gate lane: col 15 (x 496) up to y 196, then east at y 196. */
const GATE = { x: 496, y: 188 } as const; // body 42 px: y must stay within 178-200 at the gate

async function insideCompound(page: Page): Promise<boolean> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );

  return probe !== null && probe.x >= 528 && probe.y < 224;
}

/** Walks into the Metal Recovery Yard through its western gate. */
export async function enterCompound(page: Page) {
  if (await insideCompound(page)) {
    return;
  }

  await walkTo(page, GATE.x, 300, { yFirst: false });
  await walkTo(page, GATE.x, GATE.y, { yFirst: true });
  await walkTo(page, YARD.pad.x, GATE.y, { yFirst: true });
}

/** Leaves the compound through the same gate (no-op when outside). */
export async function ensureOutsideCompound(page: Page) {
  if (!(await insideCompound(page))) {
    return;
  }

  await walkTo(page, YARD.pad.x, GATE.y, { yFirst: true });
  await walkTo(page, GATE.x, GATE.y, { yFirst: false });
  await walkTo(page, GATE.x, 300, { yFirst: true });
}

/** Opens a site prompt (E) from its approach point and asserts no leak. */
export async function openSite(page: Page, site: keyof typeof APPROACH) {
  if (site === 'rig' || site === 'bench') {
    await enterCompound(page);
  } else {
    await ensureOutsideCompound(page);
  }

  if (site === 'uplinkA') {
    // The short ridge (row 7, cols 1-4) blocks a northward leg at x 96:
    // approach Post A along column 7, then west at row 5.
    await walkTo(page, 240, 300, { yFirst: false });
    await walkTo(page, 240, 172, { yFirst: true });
  }

  try {
    await openPromptAt(page, YARD[site], { approachOffset: APPROACH[site] });
  } catch (error) {
    const diag = await page.evaluate(() => {
      const w = window as unknown as {
        __playerProbe?: { x: number; y: number } | null;
        __lastRoomFeedbackText?: string | null;
        __fieldActionsProbe?: { worldActionActive: boolean } | null;
      };

      return JSON.stringify({
        player: w.__playerProbe ?? null,
        feedback: w.__lastRoomFeedbackText ?? null,
        action: w.__fieldActionsProbe?.worldActionActive ?? null,
      });
    });

    throw new Error(`${(error as Error).message} — ${site} ${diag}`, {
      cause: error,
    });
  }

  const body = await lastPromptBody(page);

  expect(body).not.toMatch(FORBIDDEN_TEXT);
}

/** Yard airlock → laboratory (the return route). */
export async function leaveYard(page: Page) {
  await ensureOutsideCompound(page);
  await walkTo(page, 384, 400, { yFirst: false });
  await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: -40 },
  });
}

/** Laboratory airlock → yard (re-entry). */
export async function reenterYard(page: Page) {
  await walkTo(page, 240, 70, { yFirst: false });
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: { x: 0, y: 20 },
  });
}

/** Noor: "I am finished outside." (option 2) → return_hub. */
export async function finishOutside(page: Page) {
  await ensureOutsideCompound(page);
  await openPromptAt(page, YARD.noor, { approachOffset: APPROACH.noor });
  await selectPromptOption(page, 2);
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotProbe?: { stage: string } | null })
        .__pilotProbe?.stage === 'return_hub',
    undefined,
    { timeout: 8000 },
  );
}

/* ------------------------------------------------------------------ *
 * M05 occasion 2
 * ------------------------------------------------------------------ */

export async function fixCableFlag(page: Page) {
  await ensureOutsideCompound(page);
  await interactAt(page, YARD.flag, { approachOffset: APPROACH.flag });
  await page.waitForFunction(
    () =>
      (window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m05.initiated === true,
    undefined,
    { timeout: 6000 },
  );
  await page.waitForTimeout(2400);
}

/* ------------------------------------------------------------------ *
 * M19 — coupling
 * ------------------------------------------------------------------ */

async function waitActs(page: Page, acts: number) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m19.acts ?? -1) >= expected,
    acts,
    { timeout: 10_000 },
  );
  await waitNoWorldAction(page);
}

/** One coupling act by its option index (1 turn, 2 thaw, 3 inspect, 4 step away). */
export async function couplingAct(page: Page, option: 1 | 2 | 3 | 4) {
  const before = (await exteriorProbe(page)).m19.acts;

  await openSite(page, 'coupling');
  await selectPromptOption(page, option);

  if (option === 4) {
    await page.waitForTimeout(400);

    return;
  }

  await waitActs(page, before + 1);
}

/** Works the coupling to completion by turning and thawing as needed. */
export async function completeCoupling(page: Page, maxActs = 40) {
  for (let step = 0; step < maxActs; step++) {
    const probe = (await exteriorProbe(page)).m19;

    if (probe.completion) {
      return;
    }

    await couplingAct(page, probe.bound ? 2 : 1);
  }

  throw new Error('coupling not completed within the act budget');
}

/* ------------------------------------------------------------------ *
 * M20 — mast (start only)
 * ------------------------------------------------------------------ */

export async function acceptMast(page: Page) {
  await openSite(page, 'mast');
  await selectPromptOption(page, 1);
  await page.waitForFunction(
    () =>
      (window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m20.accepted === true,
    undefined,
    { timeout: 6000 },
  );
}

export async function doMastStage(page: Page, stagesAfter: number) {
  await openSite(page, 'mast');
  await selectPromptOption(page, 1);
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m20.stages_done.length ?? -1) >= expected,
    stagesAfter,
    { timeout: 10_000 },
  );
  await waitNoWorldAction(page);
}

/** Accept + both outdoor stages. */
export async function startAntenna(page: Page) {
  await acceptMast(page);
  await doMastStage(page, 1);
  await doMastStage(page, 2);
}

/* ------------------------------------------------------------------ *
 * M23 — excavation
 * ------------------------------------------------------------------ */

export async function beginExcavation(page: Page) {
  await openSite(page, 'stake');
  await selectPromptOption(page, 1);
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: FieldActionsProbeLike | null;
        }
      ).__fieldActionsProbe?.windows.m23_open === true,
    undefined,
    { timeout: 6000 },
  );
}

export async function stopExcavation(page: Page) {
  await openSite(page, 'stake');
  await selectPromptOption(page, 2);
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: FieldActionsProbeLike | null;
        }
      ).__fieldActionsProbe?.windows.m23_open === false,
    undefined,
    { timeout: 6000 },
  );
}

/** One sweep from the current position; resolves on the new readout. */
export async function scanHere(page: Page) {
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: FieldActionsProbeLike | null;
        }
      ).__fieldActionsProbe?.scan.cooling === false,
    undefined,
    { timeout: 8000 },
  );

  const before = await page.evaluate(() =>
    JSON.stringify(
      (
        window as unknown as {
          __fieldActionsProbe?: FieldActionsProbeLike | null;
        }
      ).__fieldActionsProbe?.scan.last ?? null,
    ),
  );

  await press(page, 'C');
  await page.waitForFunction(
    (prev) =>
      JSON.stringify(
        (
          window as unknown as {
            __fieldActionsProbe?: FieldActionsProbeLike | null;
          }
        ).__fieldActionsProbe?.scan.last ?? null,
      ) !== prev,
    before,
    { timeout: 10_000 },
  );
  await waitNoWorldAction(page);

  return (await faProbe(page)).scan.last!;
}

/** Walks to a spot and sweeps there. */
export async function scanAt(page: Page, at: { x: number; y: number }) {
  await ensureOutsideCompound(page);
  await walkTo(page, at.x, at.y, { yFirst: true });
  await page.waitForTimeout(250);

  return scanHere(page);
}

/**
 * Faces a plot cell so the spade probe (Player.selector + 8) lands inside
 * it, VERIFIED on the DEV probe after every short tap. Four approach
 * sides are tried in turn (north, west, south, east): the ridge north of
 * the field clamps a northern approach to row-8/9 cells, so a clamped
 * stand simply falls through to the next side. Real held-key input only.
 */
export async function faceCell(page: Page, cx: number, cy: number) {
  await ensureOutsideCompound(page);
  const col = Math.floor(cx / 32);
  const row = Math.floor(cy / 32);
  const approaches: { stand: { x: number; y: number }; key: string }[] = [
    { stand: { x: cx, y: cy - 60 }, key: 'ArrowDown' },
    { stand: { x: cx - 60, y: cy }, key: 'ArrowRight' },
    { stand: { x: cx, y: cy + 60 }, key: 'ArrowUp' },
    { stand: { x: cx + 60, y: cy }, key: 'ArrowLeft' },
  ];
  const facing = async () => {
    const target = (await faProbe(page)).dig.target;

    return target !== null && target.col === col && target.row === row;
  };

  for (const approach of approaches) {
    await driveAxisTo(page, 'y', approach.stand.y, 6);
    await driveAxisTo(page, 'x', approach.stand.x, 6);

    for (let tap = 0; tap < 8; tap++) {
      await hold(page, approach.key, 45);
      await page.waitForTimeout(90);

      if (await facing()) {
        return;
      }
    }
  }

  throw new Error(`could not face cell ${col}:${row}`);
}

export async function digFacing(
  page: Page,
  outcome: 'empty' | 'recovered' | 'cached',
) {
  const before = (await faProbe(page)).dig.last;

  await press(page, 'D');
  await page.waitForFunction(
    ([prev, expected]) => {
      const last = (
        window as unknown as {
          __fieldActionsProbe?: FieldActionsProbeLike | null;
        }
      ).__fieldActionsProbe?.dig.last;

      return (
        last !== null &&
        last !== undefined &&
        last.outcome === expected &&
        JSON.stringify(last) !== prev
      );
    },
    [JSON.stringify(before), outcome] as const,
    { timeout: 10_000 },
  );
  await waitNoWorldAction(page);
}

/** Begins (if needed), sweeps once near the target and digs the exact cell. */
export async function recoverCoupling(page: Page) {
  const form = (await exteriorProbe(page)).m23_form;
  const cell = YARD.targetCells[form];

  if (!(await faProbe(page)).windows.m23_open) {
    await beginExcavation(page);
  }

  await scanAt(page, YARD.scanSpots[form].actionable);
  await faceCell(page, cell.x, cell.y);
  await digFacing(page, 'recovered');
}

/* ------------------------------------------------------------------ *
 * M24 — rig
 * ------------------------------------------------------------------ */

export async function startSalvageTally(page: Page) {
  await openSite(page, 'rig');
  await selectPromptOption(page, 1);
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: FieldActionsProbeLike | null;
        }
      ).__fieldActionsProbe?.windows.m24_open === true,
    undefined,
    { timeout: 6000 },
  );
}

export async function waitMagnetPhase(
  page: Page,
  phase: string,
  timeout = 15_000,
) {
  await page.waitForFunction(
    (expected) =>
      (
        window as unknown as {
          __fieldActionsProbe?: FieldActionsProbeLike | null;
        }
      ).__fieldActionsProbe?.magnet.phase === expected,
    phase,
    { timeout },
  );
}

/** Press retried ONLY when nothing observable happened (input loss). */
export async function pressExpectingEffect(
  page: Page,
  key: string,
  attempts = 3,
) {
  const snapshot = () =>
    page.evaluate(() => {
      const w = window as unknown as {
        __fieldActionsProbe?: FieldActionsProbeLike | null;
        __lastRoomFeedbackText?: string | null;
      };

      return JSON.stringify({
        feedback: w.__lastRoomFeedbackText ?? null,
        action: w.__fieldActionsProbe?.worldActionActive ?? false,
        scan: w.__fieldActionsProbe?.scan.last ?? null,
        dig: w.__fieldActionsProbe?.dig.last ?? null,
        phase: w.__fieldActionsProbe?.magnet.phase ?? null,
      });
    });
  const before = await snapshot();

  for (let attempt = 0; attempt < attempts; attempt++) {
    await press(page, key);
    await page.waitForTimeout(600);

    if ((await snapshot()) !== before) {
      return;
    }
  }

  throw new Error(`"${key}" press produced no observable effect`);
}

/** One full committed magnet cycle from the pad, locked in or out of band. */
export async function magnetCycle(page: Page, inBand: boolean) {
  await pressExpectingEffect(page, 'F');
  await waitMagnetPhase(page, 'timing_window', 10_000);
  await page.waitForFunction(
    (wanted) =>
      (
        window as unknown as {
          __fieldActionsProbe?: FieldActionsProbeLike | null;
        }
      ).__fieldActionsProbe?.magnet.markerInBand === wanted,
    inBand,
    { timeout: 10_000 },
  );
  await page.keyboard.press('Space');
  await waitMagnetPhase(page, 'idle');
}

export async function standOnPad(page: Page) {
  await enterCompound(page);
  await walkTo(page, YARD.pad.x, YARD.pad.y, { yFirst: true });
}

/** Six committed cycles (one deliberately out of band) → explicit depletion. */
export async function depleteDeck(page: Page) {
  await standOnPad(page);

  for (let position = 1; position <= 6; position++) {
    await magnetCycle(page, position !== 2);
    expect((await faProbe(page)).magnet.deckPosition).toBe(position);
  }

  expect((await faProbe(page)).magnet.depleted).toBe(true);
}

export async function acknowledgeDepletion(page: Page) {
  await openSite(page, 'rig');
  await selectPromptOption(page, 1);
  await page.waitForFunction(
    () =>
      (window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m24.depletion_acknowledged === true,
    undefined,
    { timeout: 6000 },
  );
}

export async function useSortingBench(page: Page) {
  await openSite(page, 'bench');
  await selectPromptOption(page, 1);
  await page.waitForTimeout(1700);
  await waitNoWorldAction(page);
}

/* ------------------------------------------------------------------ *
 * M26 — uplink
 * ------------------------------------------------------------------ */

export async function powerUpUplink(page: Page) {
  await openSite(page, 'uplinkA');
  await selectPromptOption(page, 1);
  await page.waitForFunction(
    () =>
      (window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m26.open === true,
    undefined,
    { timeout: 6000 },
  );
}

async function transmissionsCount(page: Page): Promise<number> {
  return (await eventsByType(page, 'proto_m26_channel_transmission')).length;
}

/** Transmit (option 1) at a post; resolves once the transmission logged. */
export async function transmitAt(page: Page, post: 'uplinkA' | 'uplinkB') {
  const before = await transmissionsCount(page);

  await openSite(page, post);
  await selectPromptOption(page, 1);
  await page.waitForFunction(
    (expected) =>
      ((
        window as unknown as {
          researchRuntime?: { getEvents: () => { event_type: string }[] };
        }
      ).researchRuntime
        ?.getEvents()
        .filter(
          (event) => event.event_type === 'proto_m26_channel_transmission',
        ).length ?? 0) > expected,
    before,
    { timeout: 10_000 },
  );
  await waitNoWorldAction(page);
}

export async function waitDisconnect(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m26.disconnect_demonstrated === true,
    undefined,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300);
}

/** Acknowledge the open line at Post A (option 2 after the transmit option). */
export async function acknowledgeLineAtPostA(page: Page) {
  await openSite(page, 'uplinkA');
  await selectPromptOption(page, 2);
  await page.waitForFunction(
    () =>
      (window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m26.disconnect_acknowledged === true,
    undefined,
    { timeout: 6000 },
  );
}
