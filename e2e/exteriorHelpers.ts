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

import { M24_UNDERSTANDING_QUESTION } from '../src/pilot/exterior/m24MagnetRigModel';
import { M26_UNDERSTANDING_QUESTION } from '../src/pilot/exterior/m26ChannelModel';
import { UNDERSTANDING_SETTLE_MS } from '../src/pilot/exterior/outcomeUnderstanding';
import { YARD_SITES } from '../src/pilot/zoneSites';
import { getEvents, selectCardByLabel, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  answerLogbookOffer,
  bootPilot,
  labApproach,
  type LogbookChoice,
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
 * shared book (src/pilot/zoneSites.ts YARD_SITES + the registry). The
 * excavation field (M23, Unit 23: two staked plots, the A-adjusted stake
 * at (1072, 488)) has its own drivers and geometry in `m23Helpers.ts`;
 * the former single-plot target cells and sweep spots are gone with it.
 */
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
  console: { ...YARD_SITES.supportConsole },
  sensorPost: { ...YARD_SITES.sensorPost },
  /** Inside the rig's operating pad (F works only here). */
  pad: { x: 1424, y: 334 },
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
  console: yardOffset('yard.support_console', YARD.console),
  sensorPost: yardOffset('yard.sensor_post', YARD.sensorPost),
} as const;

export const FORBIDDEN_TEXT =
  /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bQ\d{2}\b|score|trait|persist|valid/i;

export const OPPORTUNITY = {
  m05o2: 'proto_m05_start_o2',
  m19: 'proto_m19_progressive_valve',
  m20: 'proto_m20_antenna_restoration',
  /** M23 (Unit 23): the two-plot series' opportunity (the legacy single-plot id is no longer declared on the route). */
  m23: 'proto_m23_excavation_series',
  m24: 'proto_m24_rig_continuation',
  m26: 'proto_m26_uplink_continuation',
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
  /** Station 080 M05 (Unit 6): the accepted flag job's state (`m05Probe`). */
  m05: {
    offered: boolean;
    accepted: boolean | null;
    eligible: boolean;
    status: 'started' | 'deferred' | 'exited' | 'cap' | 'interrupted' | null;
    started: boolean;
    work_done: boolean;
    late_start: boolean;
    window: 'unopened' | 'open' | 'closed';
  };
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
    check_due: string | null;
    continuation_open: boolean;
    knowledge_status: string;
    depletion_reached: boolean;
    depletion_shown_count: number;
    attempts: { attempt: number; correct: boolean; form: string }[];
    explanation_shown: boolean;
    refused_presses: number;
    postknowledge_casts: number;
    postknowledge_casts_minus_first: number;
    casts_pre_knowledge: number;
    casts_after_fail: number;
    postdepletion_casts: number;
    continuation_opened: boolean;
    continuation_closure: string | null;
    continuation_focused_ms: number | null;
    cap_reached: boolean;
    exited: boolean;
    alternative_used: boolean;
    alternative_used_pre_knowledge: number;
    cycles_committed: number;
    useful_outcomes: number;
  };
  m26: {
    window: string;
    exit: string | null;
    open: boolean;
    knowledge: string;
    check_due: string | null;
    continuation_open: boolean;
    knowledge_status: string;
    next_report: string | null;
    disconnect_demonstrated: boolean;
    attempts: { attempt: number; correct: boolean; form: string }[];
    explanation_shown: boolean;
    refused_presses: number;
    postknowledge_retries: number;
    postknowledge_retries_minus_first: number;
    pre_knowledge_attempts: number;
    attempts_after_fail: number;
    continuation_opened: boolean;
    continuation_closure: string | null;
    continuation_focused_ms: number | null;
    cap_reached: boolean;
    exited: boolean;
    alternative_used: boolean;
    b_transmissions_after_disconnect: number;
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
  // Timing marks (V3 verification): where the wall time before the yard goes.
  const t0 = Date.now();

  await bootPilot(page, tag);

  const tBoot = Date.now();

  await completeDockTutorial(page, 1);

  const tTutorial = Date.now();

  await routeToYardWork(page);

  // eslint-disable-next-line no-console
  console.log(
    `[enterYard] boot ${((tBoot - t0) / 1000).toFixed(1)} s · dock tutorial ${((tTutorial - tBoot) / 1000).toFixed(1)} s · route to the yard ${((Date.now() - tTutorial) / 1000).toFixed(1)} s`,
  );

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

  // World V3 open field: the rig compound stands east of the plot.
  return probe !== null && probe.x >= 1320;
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

  await yardVia(page, 1224, 376);
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

/**
 * Noor: "I am finished outside." (option 2) → return_hub, then her
 * yard-logbook offer (M10, Unit 15) answered as asked — deferred by
 * default: no answer, only the exposure record.
 */
export async function finishOutside(
  page: Page,
  options?: { logbook?: LogbookChoice; pointer?: boolean },
) {
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
  await answerLogbookOffer(page, options?.logbook ?? 'defer', {
    pointer: options?.pointer,
  });
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
 * M23 — excavation (Unit 23)
 *
 * The two-plot series has its own drivers in `m23Helpers.ts` (the stake's
 * surface, the plot panel, the walk into a plot, scans and digs on the
 * selected plot, the first-failure choice, the selector STOP). The former
 * single-plot begin / stop / sweep / exact-cell drivers of the retired
 * `proto_m23_field_recovery` binding are gone with that route.
 * ------------------------------------------------------------------ */

/** A free scan (C) from the current position, outside any M23 plot in work; resolves on the readout. */
export async function freeScanHere(page: Page) {
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

/** Walks to a spot and free-scans there. */
export async function freeScanAt(page: Page, at: { x: number; y: number }) {
  await ensureOutsideCompound(page);
  await yardVia(page, at.x, at.y);
  await page.waitForTimeout(250);

  return freeScanHere(page);
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

/** The rig panel's check stage is open (its body carries the stem). */
async function waitCheckStage(page: Page, stem: string) {
  await page.waitForFunction(
    (wanted) =>
      (
        (window as unknown as { __lastPromptBody?: string | null })
          .__lastPromptBody ?? ''
      ).includes(wanted),
    stem,
    { timeout: 6000 },
  );
}

/**
 * Opens the rig panel with the check due and answers it: 'correct' picks
 * the key, 'wrong' the first distractor. Waits past the settle window
 * first (a press inside it is refused and re-presented). Resolves when the
 * attempt is recorded.
 */
export async function answerRigCheck(page: Page, choice: 'correct' | 'wrong') {
  const before = (await exteriorProbe(page)).m24.attempts.length;

  await openSite(page, 'rig');
  await waitCheckStage(page, M24_UNDERSTANDING_QUESTION.stem);
  await page.waitForTimeout(UNDERSTANDING_SETTLE_MS + 200);

  const option =
    choice === 'correct'
      ? M24_UNDERSTANDING_QUESTION.options.find(
          (candidate) => candidate.id === M24_UNDERSTANDING_QUESTION.key,
        )!
      : M24_UNDERSTANDING_QUESTION.options.find(
          (candidate) => candidate.id !== M24_UNDERSTANDING_QUESTION.key,
        )!;

  await selectCardByLabel(page, option.label);
  await page.waitForFunction(
    (wanted) =>
      ((window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m24.attempts.length ?? 0) > wanted,
    before,
    { timeout: 6000 },
  );
}

/**
 * Answers the check stage that is ALREADY open (the recheck chained after
 * "Continue", or a stage opened by the caller for a screenshot).
 */
export async function answerOpenCheck(
  page: Page,
  item: 'M24' | 'M26',
  choice: 'correct' | 'wrong',
) {
  const question =
    item === 'M24' ? M24_UNDERSTANDING_QUESTION : M26_UNDERSTANDING_QUESTION;
  const before =
    item === 'M24'
      ? (await exteriorProbe(page)).m24.attempts.length
      : (await exteriorProbe(page)).m26.attempts.length;

  await waitCheckStage(page, question.stem);
  await page.waitForTimeout(UNDERSTANDING_SETTLE_MS + 200);

  const option =
    choice === 'correct'
      ? question.options.find((candidate) => candidate.id === question.key)!
      : question.options.find((candidate) => candidate.id !== question.key)!;

  await selectCardByLabel(page, option.label);
  await page.waitForFunction(
    ({ wanted, key }) =>
      ((window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.[key as 'm24' | 'm26'].attempts.length ?? 0) > wanted,
    { wanted: before, key: item === 'M24' ? 'm24' : 'm26' },
    { timeout: 6000 },
  );
}

/** The explanation stage is open after a wrong first answer: "Continue" → the recheck. */
export async function continueRigExplanation(page: Page) {
  await waitCheckStage(page, M24_UNDERSTANDING_QUESTION.explanation);
  await page.waitForTimeout(UNDERSTANDING_SETTLE_MS + 200);
  await selectCardByLabel(page, 'Continue');
  await waitCheckStage(page, M24_UNDERSTANDING_QUESTION.stem);
}

/** "Finish at the rig" inside the continuation (the explicit exit). */
export async function finishAtRig(page: Page) {
  await openSite(page, 'rig');
  await selectCardByLabel(page, 'Finish at the rig');
  await page.waitForFunction(
    () =>
      (window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m24.window === 'closed',
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
  return (await eventsByType(page, 'proto_m26_uplink_transmission')).length;
}

/** Transmit (option 1) at a post; resolves once the transmission logged. */
export async function transmitAt(page: Page, post: 'uplinkA' | 'uplinkB') {
  const before = await transmissionsCount(page);

  await openSite(page, post);

  const labels = await lastPromptBody(page);
  // Select the Transmit card BY LABEL: while the check is due the post's
  // first card is an answer, and after both reports the first card is
  // the log. The wait outlasts the post's settle window (Unit 12).
  const cards = await page.evaluate(
    () =>
      (
        window as unknown as { __promptCards?: { label: string }[] | null }
      ).__promptCards?.map((card) => card.label) ?? [],
  );
  const transmit = cards.findIndex((label) => label.startsWith('Transmit:'));

  expect(
    transmit,
    `no Transmit card at ${post} (cards: ${JSON.stringify(cards)})`,
  ).toBeGreaterThanOrEqual(0);
  await page.waitForTimeout(UNDERSTANDING_SETTLE_MS + 200);
  await selectPromptOption(page, transmit + 1);

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
            (event) => event.event_type === 'proto_m26_uplink_transmission',
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

/**
 * Opens Post A (or the line panel) with the check due and answers it:
 * 'correct' picks the key, 'wrong' the first distractor. Resolves when
 * the attempt is recorded.
 */
export async function answerUplinkCheck(
  page: Page,
  choice: 'correct' | 'wrong',
  site: 'uplinkA' | 'panel' = 'uplinkA',
) {
  const before = (await exteriorProbe(page)).m26.attempts.length;

  await openSite(page, site);
  await waitCheckStage(page, M26_UNDERSTANDING_QUESTION.stem);
  await page.waitForTimeout(UNDERSTANDING_SETTLE_MS + 200);

  const option =
    choice === 'correct'
      ? M26_UNDERSTANDING_QUESTION.options.find(
          (candidate) => candidate.id === M26_UNDERSTANDING_QUESTION.key,
        )!
      : M26_UNDERSTANDING_QUESTION.options.find(
          (candidate) => candidate.id !== M26_UNDERSTANDING_QUESTION.key,
        )!;

  await selectCardByLabel(page, option.label);
  await page.waitForFunction(
    (wanted) =>
      ((window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m26.attempts.length ?? 0) > wanted,
    before,
    { timeout: 6000 },
  );
}

/** The explanation stage is open after a wrong first answer: "Continue" → the recheck. */
export async function continueUplinkExplanation(page: Page) {
  await waitCheckStage(page, M26_UNDERSTANDING_QUESTION.explanation);
  await page.waitForTimeout(UNDERSTANDING_SETTLE_MS + 200);
  await selectCardByLabel(page, 'Continue');
  await waitCheckStage(page, M26_UNDERSTANDING_QUESTION.stem);
}

/** "Finish at the uplink" at Post A inside the continuation (the explicit exit). */
export async function finishAtUplink(page: Page) {
  await openSite(page, 'uplinkA');
  await selectCardByLabel(page, 'Finish at the uplink');
  await page.waitForFunction(
    () =>
      (window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.m26.window === 'closed',
    undefined,
    { timeout: 6000 },
  );
}

/** Waits for a continuation's focused cap to close its window. */
export async function waitContinuationClosed(
  page: Page,
  item: 'm24' | 'm26',
  timeout = 40_000,
) {
  await page.waitForFunction(
    (wanted) =>
      (window as unknown as { __exteriorProbe?: ExteriorProbe | null })
        .__exteriorProbe?.[wanted as 'm24' | 'm26'].window === 'closed',
    item,
    { timeout },
  );
}
