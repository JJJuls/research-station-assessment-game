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

import { M23_TARGET_CELLS } from '../src/pilot/exterior/m23ExcavationModel';
import { YARD_SITES } from '../src/pilot/zoneSites';
import { driveAxisTo, getEvents, hold, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotProbe,
  press,
  registryApproach,
  routeToYardWork,
  useDoor,
  walkTo,
  yardApproach,
  yardVia,
} from './pilotHelpers';

export { captureErrors, expectNoRuntimeErrors };

/**
 * Yard geometry — World V2 rebuild: every site from the machine-audited
 * shared book (src/pilot/zoneSites.ts YARD_SITES + the registry), the
 * M23 target cells from the model, and sweep spots chosen by distance
 * band from each form's target (none ≥ 160 px; faint 107–159 px;
 * actionable ≤ 106 px), all standable on the painted strip.
 */
const cellCentre = (cell: { col: number; row: number }) => ({
  x: cell.col * 32 + 16,
  y: cell.row * 32 + 16,
});

export const YARD = {
  noor: { ...YARD_SITES.noor },
  airlock: { ...PILOT.yard.airlock },
  coupling: { ...YARD_SITES.coupling },
  mast: { ...YARD_SITES.mast },
  stake: { ...YARD_SITES.plotStake },
  rig: { ...YARD_SITES.magnetRig },
  bench: { ...YARD_SITES.sortingBench },
  uplinkA: { ...YARD_SITES.uplinkA },
  uplinkB: { ...YARD_SITES.uplinkB },
  panel: { ...YARD_SITES.linePanel },
  crate: { ...YARD_SITES.supplyCrate },
  flag: { ...YARD_SITES.cableFlag },
  /** Inside the rig's operating pad (F works only here). */
  pad: { x: 1190, y: 216 },
  targetCells: {
    form_a: cellCentre(M23_TARGET_CELLS.form_a),
    form_b: cellCentre(M23_TARGET_CELLS.form_b),
  },
  /** Sweep positions per form: outside the signal, faint, actionable. */
  scanSpots: {
    form_a: {
      none: { x: 1100, y: 250 },
      faint: { x: 1000, y: 240 },
      actionable: { x: 912, y: 200 },
    },
    form_b: {
      none: { x: 1180, y: 120 },
      faint: { x: 860, y: 160 },
      actionable: { x: 976, y: 180 },
    },
  },
} as const;

/** Approach offsets — derived from the registry's audited approach points. */
const yardOffset = (id: string, at: { x: number; y: number }) => {
  const approach = registryApproach(id);

  return { x: approach.x - at.x, y: approach.y - at.y };
};

export const APPROACH = {
  noor: yardOffset('yard.noor', YARD.noor),
  coupling: yardOffset('yard.coupling', YARD.coupling),
  mast: yardOffset('yard.mast', YARD.mast),
  stake: yardOffset('yard.plot_stake', YARD.stake),
  rig: yardOffset('yard.magnet_rig', YARD.rig),
  bench: yardOffset('yard.sorting_bench', YARD.bench),
  uplinkA: yardOffset('yard.uplink_a', YARD.uplinkA),
  uplinkB: yardOffset('yard.uplink_b', YARD.uplinkB),
  panel: yardOffset('yard.line_panel', YARD.panel),
  crate: yardOffset('yard.supply_crate', YARD.crate),
  flag: yardOffset('yard.cable_flag', YARD.flag),
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

/**
 * The rig's operating area (the gantry on the east half). "Inside the
 * compound" = under the gantry; every other site is reached through the
 * open field, so leaving simply steps back onto the field.
 */
async function insideCompound(page: Page): Promise<boolean> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );

  return probe !== null && probe.x >= 1100;
}

/** Walks onto the rig's operating pad (through the drift pass if needed). */
export async function enterCompound(page: Page) {
  if (await insideCompound(page)) {
    return;
  }

  await yardVia(page, YARD.pad.x, YARD.pad.y);
}

/** Steps off the rig area back onto the field (no-op when outside). */
export async function ensureOutsideCompound(page: Page) {
  if (!(await insideCompound(page))) {
    return;
  }

  await yardVia(page, 1000, 216);
}

export async function openSite(page: Page, site: keyof typeof APPROACH) {
  if (site === 'rig' || site === 'bench') {
    await enterCompound(page);
  } else {
    await ensureOutsideCompound(page);
  }

  // Pass-aware travel to the audited approach point, then the prompt.
  await yardVia(
    page,
    YARD[site].x + APPROACH[site].x,
    YARD[site].y + APPROACH[site].y,
  );

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
  await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
    approachOffset: await yardApproach(page, PILOT.yard.airlock),
  });
}

/** Laboratory airlock → yard (re-entry). */
export async function reenterYard(page: Page) {
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
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
  await yardVia(page, at.x, at.y);
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
  await yardVia(page, cx, cy - 60);
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

  const labels = await lastPromptBody(page);

  await selectPromptOption(page, 1);

  try {
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
  } catch (error) {
    // Diagnostic detail (V3): what the post offered, what the world was
    // doing and what the channel model holds at the moment the
    // transmission failed to log — a swallowed option press, a busy world
    // action and a closed window all read differently.
    const diag = await page.evaluate(() => {
      const w = window as unknown as {
        __playerProbe?: { x: number; y: number } | null;
        __lastRoomFeedbackText?: string | null;
        __lastPromptBody?: string | null;
        __fieldActionsProbe?: { worldActionActive: boolean } | null;
        __exteriorProbe?: { m26: unknown } | null;
        __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
      };

      return JSON.stringify({
        player: w.__playerProbe ?? null,
        feedback: w.__lastRoomFeedbackText ?? null,
        promptBodyNow: w.__lastPromptBody ?? null,
        worldPrompt: w.__worldPromptProbe ?? null,
        action: w.__fieldActionsProbe?.worldActionActive ?? null,
        m26: w.__exteriorProbe?.m26 ?? null,
      });
    });

    throw new Error(
      `${(error as Error).message} — transmitAt ${post} (prompt body at open: ${JSON.stringify(labels)}) ${diag}`,
      { cause: error },
    );
  }

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
