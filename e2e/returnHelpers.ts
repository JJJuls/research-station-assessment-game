/**
 * Return, Revision & Handover e2e drivers (evidence-led pilot v2, Unit 5).
 *
 * Real keyboard/pointer input only, position-synced on the DEV
 * `__playerProbe`; read-only DEV probes (`__returnProbe`,
 * `__workSurfaceProbe`, `__inventoryUiProbe`, `__measurementValidity`,
 * `__pilotCoverage`); never a teleport, never a state mutation through the
 * window. Every driver walks the participant path (E at a station, the
 * surface's own tiles/buttons, the prompt's own cards) — no developer boot
 * and no internal function call.
 *
 * Workshop navigation rule: every leg starts on the clear y = 272 lane
 * (x-then-y walks clamp on the two machinery blocks otherwise).
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { CONCOURSE_STATIONS } from '../src/pilot/zoneSites';
import {
  acceptMast,
  doMastStage,
  finishOutside,
  leaveYard,
  openSite,
  startAntenna,
} from './exteriorHelpers';
import {
  designToPage,
  driveAxisTo,
  getEvents,
  hold,
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
  concourseToDeck,
  concourseToWorkshop,
  dockToConcourse,
  expectStage,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotProbe,
  useDoor,
  walkTo,
  workshopToConcourse,
  workshopVia,
  yardApproach,
} from './pilotHelpers';

export { captureErrors, expectNoRuntimeErrors, press };

/** Return-shift geometry (src/pilot/zoneSites.ts + the Unit 2 stations). */
export const RETURN = {
  // World V2 rescue continuation (43×12 two-bay hall): anchors from the
  // machine-audited shared book; offsets land on the audited approach
  // points (registry) exactly.
  workshop: {
    feedConsole: { x: 1034, y: 132 },
    relayBench: { x: 104, y: 232 },
    reportDesk: { x: 996, y: 300 },
    handoverDesk: { x: 1148, y: 164 },
    pressB: { x: 302, y: 160 },
    calibrationBench: { x: 833, y: 300 },
    board: { x: 1344, y: 140 },
  },
  /** Offsets to the machine-audited approach points (±12 px safe). */
  approach: {
    feedConsole: { x: 0, y: 48 },
    relayBench: { x: 48, y: 8 },
    reportDesk: { x: 0, y: -50 },
    handoverDesk: { x: 0, y: 44 },
    pressB: { x: 0, y: 44 },
    calibrationBench: { x: 0, y: -50 },
    board: { x: -32, y: 38 },
  },
  // World V1 production: derived from the shared site book (the stale
  // V4 literals were the U2 projection's M09 driver miss).
  concourse: {
    kai: { ...CONCOURSE_STATIONS.kaiReturn },
    gauge: { ...CONCOURSE_STATIONS.monitorGauge },
    vale: { ...CONCOURSE_STATIONS.vale },
    /** The rescue hall's south lane: the clear approach row. */
    loopY: 252,
  },
  /** The office bays' clear south lane (rows 7-8). */
  laneY: 252,
} as const;

export type WorkshopStation = keyof typeof RETURN.workshop;

export const FORBIDDEN_TEXT =
  /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bQ\d{2}\b|score|trait|persist|resilien|grit|valid/i;

export const OPPORTUNITY = {
  m03a: 'proto_m03_reset_a',
  m03b: 'proto_m03_reset_b',
  m07: 'proto_m07_calibration_project',
  m09: 'proto_m09_monitor_watch',
  m10: 'proto_m10_component_promise',
  m20: 'proto_m20_antenna_restoration',
  m21o1: 'proto_m21_case_o1',
  m21o2: 'proto_m21_case_o2',
  m22: 'proto_m22_report_revision',
  m25: 'proto_m25_belief_probe',
} as const;

/* ------------------------------------------------------------------ *
 * Probes
 * ------------------------------------------------------------------ */

export interface ReturnProbeM21Case {
  window: string;
  exit: string | null;
  entered: boolean;
  closed: boolean;
  manual_mode: string;
  current_section: string | null;
  case: 'o1' | 'o2';
  form: 'form_a' | 'form_b';
  applications: number;
  first_application_correct: boolean | null;
  first_application_faults: string[] | null;
  restudy_sections_after_first: string[];
  relevant_restudy: boolean | null;
  revised_application: boolean | null;
  restudy_revision: boolean | null;
  accepted: boolean;
  correct_rule_application: boolean | null;
  strategy: string;
  reference_sections_used: number;
  cross_reference_depth: number;
  sections_consulted: string[];
  reference_follows: number;
  diagram_mode_used: boolean;
  plate_inspected: boolean;
  repair_actions: number;
  invalid_actions: number;
  output_delivery: string | null;
  departures: number;
  reengagement: number;
  stop_choice: string | null;
  time_by_phase_ms: { manual: number; unit: number };
}

export interface ReturnProbe {
  m20: {
    availability: { available: boolean; history: string; reason: string };
    status: string;
    window: string;
    window_id: string;
    exit: string | null;
    settling: string | null;
    progress_pre_interruption: number | null;
    returned: boolean;
    resume_latency: number | null;
    useful_resume_actions: number;
    completion: boolean;
    start_history: string;
    outdoor_stages_done: string[];
    indoor_stages_done: string[];
    resume_presented: boolean;
    console_inspections: number;
    console_departures: number;
    resume_closed_reason: string | null;
  };
  m21: {
    active: 'o1' | 'o2';
    all_closed: boolean;
    o1: ReturnProbeM21Case;
    o2: ReturnProbeM21Case;
  };
  m22: {
    window: string;
    exit: string | null;
    entered: boolean;
    phase: string;
    untagged_lines: number;
    setback_presented: boolean;
    revision_started: boolean;
    feedback_consistent_edits: number;
    resubmitted: boolean;
    recovery_complete: boolean;
    form: 'form_a' | 'form_b';
    setback_comprehension: boolean;
    inspections: number;
    repeated_unchanged_action: number;
    other_edits: number;
    mismatched_tag_edits: number;
    progress: { tagged: number; placed: number };
    submissions: number;
    departures: number;
    stop_choice: string | null;
    lines_at_close: (string | null)[];
  };
  m25: {
    window: string;
    exit: string | null;
    handoff: string;
    direct_belief_probe: null;
    administration: string;
    handoff_presented: boolean;
    handoff_acknowledged: boolean;
    in_game_response: null;
  };
  handover: { relay_unit: boolean; relay_coupling: boolean };
}

export async function returnProbe(page: Page): Promise<ReturnProbe> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __returnProbe?: ReturnProbe | null })
        .__returnProbe ?? null,
  );

  if (probe === null) {
    throw new Error('__returnProbe unavailable (not in the workshop?)');
  }

  return probe;
}

export interface SurfaceProbe {
  open: boolean;
  surface_id: string | null;
  title: string | null;
  status: string | null;
  focus: string | null;
  feedback: string | null;
  elements: {
    id: string;
    kind: string;
    label: string;
    state: string;
    x: number;
    y: number;
    w: number;
    h: number;
    focusable: boolean;
  }[];
}

export async function surface(page: Page): Promise<SurfaceProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __workSurfaceProbe?: SurfaceProbe | null })
        .__workSurfaceProbe ?? null,
  );
}

export async function waitSurface(page: Page, open: boolean, id?: string) {
  await page.waitForFunction(
    ({ expected, wanted }) => {
      const probe = (
        window as unknown as {
          __workSurfaceProbe?: {
            open: boolean;
            surface_id: string | null;
          } | null;
        }
      ).__workSurfaceProbe;

      return (
        (probe?.open ?? false) === expected &&
        (wanted === undefined || !expected || probe?.surface_id === wanted)
      );
    },
    { expected: open, wanted: id },
    { timeout: 8000 },
  );
  await page.waitForTimeout(250);
}

export interface ValidityRecordLike {
  opportunity_id: string;
  owner: string;
  form: string | null;
  entered: boolean;
  completed: boolean;
  absent: boolean;
  censored: boolean;
  invalid_reason: string | null;
  invalid_detail: string | null;
  validity: string;
}

export async function validityRecord(
  page: Page,
  opportunityId: string,
): Promise<ValidityRecordLike> {
  const record = await page.evaluate(
    (id) =>
      (
        window as unknown as {
          __measurementValidity?: ValidityRecordLike[] | null;
        }
      ).__measurementValidity?.find((r) => r.opportunity_id === id) ?? null,
    opportunityId,
  );

  if (record === null) {
    throw new Error(`no validity record for ${opportunityId}`);
  }

  return record;
}

export async function itemStatus(page: Page, item: string): Promise<string> {
  const coverage = await pilotCoverage(page);
  const entry = coverage?.items.find((i) => i.item === item);

  if (entry === undefined) {
    throw new Error(`no coverage entry for ${item}`);
  }

  return entry.status;
}

export interface PilotEventLike {
  event_type: string;
  object_id?: string;
  metadata?: Record<string, unknown>;
  study_item_ids?: unknown;
  construct_id?: unknown;
  success?: unknown;
}

export async function eventsByType(
  page: Page,
  type: string,
): Promise<PilotEventLike[]> {
  return (await getEvents(page)).filter(
    (event) => event.event_type === type,
  ) as PilotEventLike[];
}

export async function eventsByPrefix(
  page: Page,
  prefix: string,
): Promise<PilotEventLike[]> {
  return (await getEvents(page)).filter((event) =>
    event.event_type.startsWith(prefix),
  ) as PilotEventLike[];
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

export async function promptCardLabels(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      (
        window as unknown as { __promptCards?: { label: string }[] | null }
      ).__promptCards?.map((card) => card.label) ?? [],
  );
}

/* ------------------------------------------------------------------ *
 * Surface input (pointer + keyboard converge on the same activation)
 * ------------------------------------------------------------------ */

/** Pointer activation of a surface element (game 800×600 → canvas). */
export async function clickElement(page: Page, id: string) {
  const probe = await surface(page);
  const element = probe?.elements.find((e) => e.id === id);

  if (element === undefined) {
    throw new Error(
      `surface element ${id} not found (elements: ${probe?.elements.map((e) => e.id).join(',')})`,
    );
  }

  // The probe's x/y is the element's CENTRE (WorkSurfaceScene hit-tests by
  // absolute distance to half width/height); V4 maps it through the
  // design space.
  const point = await designToPage(page, element.x, element.y);

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(220);
}

/** Keyboard activation: arrow-focus to the element, then ENTER. */
export async function keyActivate(page: Page, id: string) {
  const probe = await surface(page);

  if (probe === null) {
    throw new Error('no surface open');
  }

  const focusables = probe.elements.filter((e) => e.focusable).map((e) => e.id);
  const target = focusables.indexOf(id);
  const current = probe.focus === null ? 0 : focusables.indexOf(probe.focus);

  if (target === -1) {
    throw new Error(`element ${id} is not focusable`);
  }

  let delta = target - Math.max(0, current);

  while (delta > 0) {
    await press(page, 'ArrowRight');
    delta -= 1;
  }

  while (delta < 0) {
    await press(page, 'ArrowLeft');
    delta += 1;
  }

  await press(page, 'Enter');
  await page.waitForTimeout(220);
}

export async function surfaceElement(page: Page, id: string) {
  return (await surface(page))?.elements.find((e) => e.id === id) ?? null;
}

/* ------------------------------------------------------------------ *
 * Workshop navigation (lane rule)
 * ------------------------------------------------------------------ */

/** Walks to a station's audited approach point via the two-bay lanes. */
export async function workshopApproach(page: Page, station: WorkshopStation) {
  const at = RETURN.workshop[station];
  const off = RETURN.approach[station];

  await workshopVia(page, at.x + off.x, at.y + off.y);
}

/** Opens a return-shift SURFACE at a workshop station (E, retried). */
export async function openWorkshopSurface(
  page: Page,
  station: WorkshopStation,
  surfaceId: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await workshopApproach(page, station);
    await press(page, 'Space');

    const opened = await waitSurface(page, true, surfaceId).then(
      () => true,
      () => false,
    );

    if (opened) {
      const probe = await surface(page);

      expect(`${probe?.title}\n${probe?.status}`).not.toMatch(FORBIDDEN_TEXT);

      return;
    }
  }

  throw new Error(`surface ${surfaceId} did not open at ${station}`);
}

/** Opens a PROMPT at a workshop station (E, retried). */
export async function openWorkshopPrompt(page: Page, station: WorkshopStation) {
  const at = RETURN.workshop[station];
  const off = RETURN.approach[station];

  await workshopVia(page, at.x + off.x, at.y + off.y);
  await openPromptDiag(page, at, off);
  expect(await lastPromptBody(page)).not.toMatch(FORBIDDEN_TEXT);
}

export async function closeSurface(page: Page) {
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/* ------------------------------------------------------------------ *
 * Spine builders (explicit beats; obligations configurable)
 * ------------------------------------------------------------------ */

export type OfferChoice = 'accept' | 'decline' | 'defer';

export interface ConcourseOptions {
  watch: OfferChoice;
  promise: OfferChoice;
  readGauge1: boolean;
}

const OFFER_OPTION: Record<OfferChoice, 1 | 2 | 3> = {
  accept: 1,
  decline: 2,
  defer: 3,
};

/** Dock → Concourse → Vale's briefing with the two offers answered as asked → stage workshop. */
export async function enterConcourseWithOffers(
  page: Page,
  tag: string,
  options: ConcourseOptions,
) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'incident_handover');
  await page.waitForTimeout(400);
  await selectPromptOption(page, OFFER_OPTION[options.watch]);
  await page.waitForTimeout(400);
  await selectPromptOption(page, OFFER_OPTION[options.promise]);
  await page.waitForTimeout(400);

  if (options.promise === 'accept') {
    await selectPromptOption(page, 1); // the standardised interruption
    await page.waitForTimeout(400);
  }

  // M05 (Unit 6): the extra lamp job closes the chain; declined here.
  await page.waitForTimeout(450);
  await selectPromptOption(page, 2); // extra lamp job: decline
  await page.waitForTimeout(400);

  if (options.readGauge1) {
    // South-lane discipline FIRST (rescue Concourse): Vale's approach lands
    // anywhere in 236–260; an eastward leg started at y ≤ 241 clips the
    // operations-desk row (row 6, y < 224) with the body's top edge and
    // clamps at x 464 — the gauge is never reached and the M09 check-1
    // read is silently missed (observed in 3 of 5 runs). Reach the lane
    // (y 252) at ±4 before travelling east — a y-first walk's ±12 box
    // accepts 241.5 and never moves (observed once more with yFirst alone).
    await driveAxisTo(page, 'y', RETURN.concourse.loopY, 4);
    await driveAxisTo(page, 'x', RETURN.concourse.gauge.x, 8);
    await interactAt(page, RETURN.concourse.gauge, {
      // The gauge hangs on the south hull; its operating face is north.
      approachOffset: { x: 0, y: -56 },
      yFirst: true,
    });
    await page.waitForTimeout(400);

    // Diagnostic (V3): the check-1 read is the one M09 act on the outbound
    // leg — record what the interaction actually produced so a missed
    // press, a wrong nearest object or a model refusal read differently.
    const gaugeDiag = await page.evaluate(() => {
      const w = window as unknown as {
        __playerProbe?: { x: number; y: number } | null;
        __lastRoomFeedbackText?: string | null;
        __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
        researchRuntime?: { getEvents: () => { event_type: string }[] };
      };

      return JSON.stringify({
        player: w.__playerProbe ?? null,
        feedback: w.__lastRoomFeedbackText ?? null,
        prompt: w.__worldPromptProbe ?? null,
        m09: (w.researchRuntime?.getEvents() ?? [])
          .map((event) => event.event_type)
          .filter((type) => type.startsWith('proto_m09_')),
      });
    });

    // eslint-disable-next-line no-console
    console.log(`[driver] gauge check 1: ${gaugeDiag}`);
  }

  await walkTo(page, PILOT.concourse.vale.x, RETURN.concourse.loopY, {
    yFirst: true,
  });
  await openPromptDiag(page, PILOT.concourse.vale, { x: 0, y: 56 });
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop');
}

/** openPromptAt with a state dump on failure (exteriorHelpers.openSite precedent). */
export async function openPromptDiag(
  page: Page,
  at: { x: number; y: number },
  approachOffset: { x: number; y: number },
) {
  try {
    await openPromptAt(page, at, { approachOffset });
  } catch (error) {
    const diag = await page.evaluate(() => {
      const w = window as unknown as {
        __playerProbe?: { scene: string; x: number; y: number } | null;
        __lastRoomFeedbackText?: string | null;
        __fieldActionsProbe?: { worldActionActive: boolean } | null;
        __promptCards?: unknown;
        __pilotProbe?: { stage: string } | null;
        __inventoryUiProbe?: { open: boolean } | null;
        __workSurfaceProbe?: { open: boolean } | null;
      };

      return JSON.stringify({
        player: w.__playerProbe ?? null,
        feedback: w.__lastRoomFeedbackText ?? null,
        action: w.__fieldActionsProbe?.worldActionActive ?? null,
        cards: w.__promptCards ?? null,
        stage: w.__pilotProbe?.stage ?? null,
        inventory: w.__inventoryUiProbe?.open ?? null,
        surface: w.__workSurfaceProbe?.open ?? null,
      });
    });

    throw new Error(`${(error as Error).message} — ${diag}`, { cause: error });
  }
}

/** Concourse → Workshop: take the orders, optionally start the calibration (1 stage), sign off → lab_briefing, back to the Concourse. */
export async function workshopRestorationShift(
  page: Page,
  options: { startCalibration: boolean; calibrationStages?: number },
) {
  await concourseToWorkshop(page);
  await workshopApproach(page, 'board');
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_work');
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });

  if (options.startCalibration) {
    await openWorkshopSurface(
      page,
      'calibrationBench',
      'm07_calibration_bench',
    );

    for (let stage = 0; stage < (options.calibrationStages ?? 1); stage += 1) {
      await waitAdvanceEnabled(page);
      await clickElement(page, 'advance');
      await waitStageDone(page, stage + 1);
      await page.waitForTimeout(300);
    }

    await closeSurface(page);
  }

  await workshopApproach(page, 'board');
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'lab_briefing');
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
  await workshopToConcourse(page);
}

export type MastHistory = 'full' | 'partial' | 'none';

/**
 * Concourse → Laboratory (Kai) → Yard (Noor) → the antenna start as asked
 * (→ optionally eight crate spares to fill the belt) → Noor "finished
 * outside".
 */
export async function exteriorShift(
  page: Page,
  mast: MastHistory,
  options?: { fillBelt?: boolean },
) {
  // Kai is an M10 recipient in the laboratory too: with the promise
  // accepted the handover is his FIRST option, so the briefing / "done"
  // beats select the first non-handover card (the participant withholds
  // the component until the return).
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });
  await kaiSelectNonHandover(page);
  await expectStage(page, 'lab_work');
  await kaiSelectNonHandover(page);
  await expectStage(page, 'exterior_briefing');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: await yardApproach(page, PILOT.yard.noor),
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'exterior_work');
  // M05 (Unit 6): Noor's extra flag job follows "Ready"; declined here.
  await page.waitForTimeout(450);
  await selectPromptOption(page, 2); // extra flag job: decline
  await page.waitForTimeout(300);

  if (mast === 'full') {
    await startAntenna(page);
  } else if (mast === 'partial') {
    await acceptMast(page);
    await doMastStage(page, 1);
  }

  if (options?.fillBelt) {
    // Scanner + spade + eight spares = the ten-slot belt (Unit 4 route 3).
    for (let take = 0; take < 8; take += 1) {
      await openSite(page, 'crate');
      await selectPromptOption(page, 1);
      await page.waitForTimeout(250);
    }
  }

  await finishOutside(page);
}

/** Opens Kai's prompt and selects the first card that is NOT the handover. */
export async function kaiSelectNonHandover(page: Page) {
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: await labApproach(page, PILOT.lab.kai),
  });

  const labels = await promptCardLabels(page);
  const index = labels.findIndex((label) => !/^Hand over/.test(label));

  expect(index).toBeGreaterThanOrEqual(0);
  await selectPromptOption(page, index + 1);
}

/** Yard airlock → Laboratory → Concourse (the ONE purposeful return). */
export async function returnInside(page: Page) {
  await leaveYard(page);
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: await labApproach(page, PILOT.lab.southDoor),
  });
  await expectStage(page, 'return_hub');
}

/**
 * Kai stands over the Concourse's east machinery block (x 576–703, row 11):
 * an x-first approach from the gauge row clamps on it, so reach his column
 * along the y = 272 lane first.
 */
export async function kaiViaLane(page: Page) {
  await driveAxisTo(page, 'y', RETURN.concourse.loopY, 12);
  await walkTo(page, RETURN.concourse.kai.x, RETURN.concourse.loopY, {
    yFirst: false,
  });
}

/** Kai: hand the component over (the handover option is first while carrying). */
export async function handOverToKai(page: Page) {
  await kaiViaLane(page);
  await openPromptAt(page, RETURN.concourse.kai, {
    approachOffset: { x: 0, y: 40 },
  });

  const labels = await promptCardLabels(page);

  expect(labels[0]).toMatch(/Hand over/);
  await selectPromptOption(page, 1);
  await page.waitForTimeout(400);
}

/** Kai without handing over: the option exists; "Understood." is taken. */
export async function meetKaiWithoutHandover(page: Page) {
  await kaiViaLane(page);
  await openPromptAt(page, RETURN.concourse.kai, {
    approachOffset: { x: 0, y: 40 },
  });

  const labels = await promptCardLabels(page);

  await selectPromptOption(page, labels.length);
  await page.waitForTimeout(400);

  return labels;
}

export async function readGauge(page: Page) {
  // From above (the point below the gauge is contested by the Dock door).
  await interactAt(page, RETURN.concourse.gauge, {
    approachOffset: { x: 0, y: -44 },
  });
  await page.waitForTimeout(400);
}

/** Vale's return check-in (→ workshop_return), west door → Workshop. */
export async function valeReturnCheckIn(page: Page) {
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  expect(await lastPromptBody(page)).not.toMatch(/gauge|hand|card/i);
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_return');
  await concourseToWorkshop(page);
  await page.waitForTimeout(400);
}

/** Workshop → Concourse → Utility Deck: the review panel offers only a return before the sign-off; back to the workshop. */
export async function assertCoreLockedThenReturn(page: Page) {
  await workshopToConcourse(page);
  await concourseToDeck(page);
  await openPromptAt(page, PILOT.deck.reviewPanel, {
    approachOffset: { x: 0, y: 44 },
  });

  const labels = await promptCardLabels(page);

  expect(labels).toEqual(['Return to the station']);
  await selectPromptOption(page, 1);
  await page.waitForTimeout(400);
  await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
    approachOffset: { x: 40, y: 0 },
    yFirst: true,
  });
  await concourseToWorkshop(page);
}

/** Work Order Board sign-off on the return shift (→ deck_closure). */
export async function signOffReturnShift(page: Page) {
  await workshopApproach(page, 'board');
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  expect(await lastPromptBody(page)).not.toMatch(FORBIDDEN_TEXT);
  await selectPromptOption(page, 1);
  await expectStage(page, 'deck_closure');
}

/* ------------------------------------------------------------------ *
 * M03 occasion 2 — Press B
 * ------------------------------------------------------------------ */

interface UiProbe {
  open: boolean;
  mode: string;
  slots: {
    container_id: string;
    slot_index: number;
    /** Slot top-left in the 800×600 design space (SlotGridView, origin 0,0). */
    x: number;
    y: number;
    w: number;
    h: number;
    definition_id: string | null;
  }[];
}

export async function uiProbe(page: Page): Promise<UiProbe | null> {
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

/**
 * Press B: run the three press cycles (C), then either leave the residuals
 * untouched for the minimum exposure or drag `store` of them into the
 * component store by pointer, then close the panel (the observation).
 */
export async function pressBatchB(
  page: Page,
  options: { store: number; exposureMs: number },
) {
  await workshopApproach(page, 'pressB');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await press(page, 'Space');

    const opened = await waitOverlay(page, true).then(
      () => true,
      () => false,
    );

    if (opened) {
      break;
    }

    await workshopApproach(page, 'pressB');
  }

  const probe = await uiProbe(page);

  expect(probe?.mode).toBe('m03');

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await press(page, 'c');
    await page.waitForTimeout(350);
  }

  await page.waitForFunction(
    () =>
      (
        (window as unknown as { __inventoryUiProbe?: UiProbe | null })
          .__inventoryUiProbe?.slots ?? []
      ).some(
        (slot) =>
          slot.container_id === 'm03_surface_b' && slot.definition_id !== null,
      ),
    undefined,
    { timeout: 6000 },
  );

  const toCanvas = (x: number, y: number) => designToPage(page, x, y);

  for (let moved = 0; moved < options.store; moved += 1) {
    const slots = (await uiProbe(page))!.slots;
    const source = slots.find(
      (slot) =>
        slot.container_id === 'm03_surface_b' && slot.definition_id !== null,
    );
    const target = slots.find(
      (slot) =>
        slot.container_id === 'm03_store_b' && slot.definition_id === null,
    );

    if (source === undefined || target === undefined) {
      throw new Error('M03 residual or store slot not found');
    }

    // V3 verification: the probe publishes each slot's TOP-LEFT corner
    // (SlotGridView rectangles are origin 0,0). Dragging corner-to-corner
    // was inside the slot only while the canvas was the design space (1:1,
    // integer page pixels); under the V4 design camera (×1.2, letterboxed
    // to 0.625) the corner maps to a fractional page pixel that Chromium
    // rounds OUTSIDE the 42 px slot, so the overlay picked nothing up
    // (reproduced at HEAD: held null, dragging false, surface unchanged).
    // Drag slot centres, as every other inventory drag driver does.
    const from = await toCanvas(
      source.x + source.w / 2,
      source.y + source.h / 2,
    );
    const to = await toCanvas(target.x + target.w / 2, target.y + target.h / 2);

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, {
      steps: 8,
    });
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Diagnostic (read-only): where the residual ended up after the drag.
    const after = await uiProbe(page);
    const m03Slots = (after?.slots ?? []).filter((slot) =>
      slot.container_id.startsWith('m03_'),
    );

    // eslint-disable-next-line no-console
    console.log(
      `[pressBatchB] drag ${moved + 1}/${options.store} from design (${source.x},${source.y}) ` +
        `page (${from.x.toFixed(2)},${from.y.toFixed(2)}) to design (${target.x},${target.y}) ` +
        `page (${to.x.toFixed(2)},${to.y.toFixed(2)}) → ${JSON.stringify({
          held: (after as { held?: unknown } | null)?.held ?? null,
          dragging: (after as { dragging?: unknown } | null)?.dragging ?? null,
          feedback: (after as { feedback?: unknown } | null)?.feedback ?? null,
          slots: m03Slots.map(
            (slot) =>
              `${slot.container_id}[${slot.slot_index}]=${slot.definition_id ?? '-'}`,
          ),
        })}`,
    );
  }

  await page.waitForTimeout(options.exposureMs);
  await page.keyboard.press('Escape');
  await waitOverlay(page, false);
}

/* ------------------------------------------------------------------ *
 * M07 end — calibration bench
 * ------------------------------------------------------------------ */

/** Waits until the bench tile `stage_n` renders as done (surface re-renders on its clock). */
async function waitStageDone(page: Page, stage: number) {
  await page.waitForFunction(
    (id) =>
      (
        window as unknown as {
          __workSurfaceProbe?: {
            elements: { id: string; state: string }[];
          } | null;
        }
      ).__workSurfaceProbe?.elements.find((e) => e.id === id)?.state === 'done',
    `stage_${stage}`,
    // V3 verification: the post-settle re-render rides the surface scene's
    // Phaser timer, which runs slower than wall time whenever the software
    // renderer's frame exceeds the 200 ms delta cap (observed: > 8 s under
    // a second SwiftShader browser). A wait budget, not an assertion.
    { timeout: 20_000 },
  );
}

/** Waits until the ADVANCE control is enabled again (settle re-render on the surface clock). */
async function waitAdvanceEnabled(page: Page) {
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __workSurfaceProbe?: {
            elements: { id: string; state: string }[];
          } | null;
        }
      ).__workSurfaceProbe?.elements.find((e) => e.id === 'advance')?.state !==
      'disabled',
    undefined,
    { timeout: 20_000 },
  );
}

/** Opens the bench and advances `stages` stages (1.4 s settle each), waiting for each tile. */
export async function calibrationReturn(page: Page, stages: number) {
  await openWorkshopSurface(page, 'calibrationBench', 'm07_calibration_bench');

  const before = (await surface(page))!.elements.filter(
    (e) => e.id.startsWith('stage_') && e.state === 'done',
  ).length;

  for (let stage = 0; stage < stages; stage += 1) {
    await waitAdvanceEnabled(page);
    await clickElement(page, 'advance');
    await waitStageDone(page, before + stage + 1);
    await page.waitForTimeout(300);
  }

  const probe = await surface(page);

  await closeSurface(page);

  return probe;
}

/* ------------------------------------------------------------------ *
 * M20 resume — feed console
 * ------------------------------------------------------------------ */

const INDOOR_STAGES = ['power_feed', 'align_feed', 'lock_alignment'] as const;

/** Opens the console surface; returns the probe (throws if unavailable). */
export async function openFeedConsole(page: Page) {
  await openWorkshopSurface(page, 'feedConsole', 'm20_feed_console');

  return (await surface(page))!;
}

/** Resumes and completes `stages` console stages (timed, on the surface clock). */
export async function resumeAntenna(page: Page, stages: number) {
  await openFeedConsole(page);
  await keyActivate(page, 'resume');
  await page.waitForFunction(
    () =>
      (window as unknown as { __returnProbe?: ReturnProbe | null })
        .__returnProbe?.m20.returned === true,
    undefined,
    { timeout: 5000 },
  );

  for (let stage = 0; stage < stages; stage += 1) {
    const expected = stage + 1;

    await clickElement(page, 'stage_action');
    await page.waitForFunction(
      (count) =>
        ((window as unknown as { __returnProbe?: ReturnProbe | null })
          .__returnProbe?.m20.indoor_stages_done.length ?? -1) >= count,
      expected,
      { timeout: 8000 },
    );
    await page.waitForTimeout(300);
  }

  const done = (await returnProbe(page)).m20;

  expect(done.indoor_stages_done).toEqual(INDOOR_STAGES.slice(0, stages));

  if (!done.completion) {
    await closeSurface(page);
  } else {
    await clickElement(page, 'leave');
    await waitSurface(page, false);
  }
}

/* ------------------------------------------------------------------ *
 * M21 — relay bench
 * ------------------------------------------------------------------ */

export const M21_SPEC = {
  o1: {
    form_a: { posts: ['J1', 'J3'], selector: 'L3', plate: 'RELAY 7K/B' },
    form_b: { posts: ['J2', 'J4'], selector: 'L1', plate: 'RELAY 7R/C' },
    all: ['J1', 'J2', 'J3', 'J4'],
  },
  o2: {
    form_a: { posts: ['B2'], selector: 'R1', plate: 'PUMP 3Y/M' },
    form_b: { posts: ['B1'], selector: 'R4', plate: 'PUMP 3X/S' },
    all: ['B1', 'B2'],
  },
} as const;

/**
 * Unit 10: the two-case manual repair by real input. Case 1 (relay unit):
 * inspect the plate (keyboard hotkey), read §1 → §2 → §4 by following the
 * references, §3 from the tab bar, switch to the diagram once; when asked,
 * fit ONE wrong jumper first and FIT — the truthful fault names the
 * subsystem; restudy §4 (relevant), revise, FIT again (accepted). Case 2
 * (pump controller, placed at once): read §1 / §3 / §4, configure and FIT
 * correctly first time. Keyboard and pointer both used.
 */
export async function repairRelay(
  page: Page,
  options: { wrongFirst: boolean; fit: boolean },
) {
  await openWorkshopSurface(page, 'relayBench', 'm21_relay_bench');

  const form1 = (await returnProbe(page)).m21.o1.form;
  const spec1 = M21_SPEC.o1[form1];

  await press(page, 'i'); // inspect plate (hidden hotkey)
  await page.waitForTimeout(250);
  expect((await surfaceElement(page, 'plate'))?.label).toContain(spec1.plate);

  await clickElement(page, 'section_s1_identify');
  await clickElement(page, 'ref_s2_post_rule');
  await clickElement(page, 'ref_s4_code_table');
  await keyActivate(page, 'section_s3_selector_rule');
  await clickElement(page, 'mode_diagram');
  await clickElement(page, 'mode_text');

  if (options.wrongFirst) {
    const wrong = M21_SPEC.o1.all.find(
      (post) => !(spec1.posts as readonly string[]).includes(post),
    )!;

    await clickElement(page, `post_${wrong}`);
    await keyActivate(page, `line_${spec1.selector}`);
    await press(page, 'f');
    await page.waitForTimeout(300);
    expect((await surfaceElement(page, 'fit_readout'))?.label).toContain(
      'fails',
    );
    // Restudy the table after the failing application (relevant), revise.
    await clickElement(page, 'section_s4_code_table');
    await clickElement(page, `post_${wrong}`);
  }

  for (const post of spec1.posts) {
    await clickElement(page, `post_${post}`);
  }

  if (!options.wrongFirst) {
    await keyActivate(page, `line_${spec1.selector}`);
  }

  if (!options.fit) {
    return;
  }

  await press(page, 'f');
  await page.waitForFunction(
    () =>
      (window as unknown as { __returnProbe?: ReturnProbe | null })
        .__returnProbe?.m21.o1.accepted === true,
    undefined,
    { timeout: 5000 },
  );

  // Case 2 is placed on the bench at once: a correct first application.
  const form2 = (await returnProbe(page)).m21.o2.form;
  const spec2 = M21_SPEC.o2[form2];

  // Past the placement settle window (Unit 10 review G-H1).
  await page.waitForTimeout(1_600);
  await press(page, 'i');
  await page.waitForTimeout(250);
  expect((await surfaceElement(page, 'plate'))?.label).toContain(spec2.plate);
  await clickElement(page, 'section_s1_identify');
  await clickElement(page, 'ref_s3_selector_rule');
  await clickElement(page, 'section_s2_post_rule');
  await clickElement(page, 'ref_s4_code_table');

  for (const post of spec2.posts) {
    await clickElement(page, `post_${post}`);
  }

  await clickElement(page, `line_${spec2.selector}`);
  await press(page, 'f');
  await page.waitForFunction(
    () =>
      (window as unknown as { __returnProbe?: ReturnProbe | null })
        .__returnProbe?.m21.all_closed === true,
    undefined,
    { timeout: 5000 },
  );
  await clickElement(page, 'leave');
  await waitSurface(page, false);
}

/* ------------------------------------------------------------------ *
 * M22 — report desk
 * ------------------------------------------------------------------ */

export const M22_TAG: Record<string, string> = {
  l_coupling: 'WO-11',
  l_loop: 'WO-12',
  l_excavation: 'WO-13',
  l_metal: 'WO-14',
  l_uplink: 'WO-15',
  l_records: 'WO-16',
};

/** Places the first three tray lines into slots 1-3 (select line, then slot). */
export async function assembleReport(page: Page) {
  await openWorkshopSurface(page, 'reportDesk', 'm22_report_desk');

  const tray = (await surface(page))!.elements
    .filter((e) => e.id.startsWith('line_') && e.focusable)
    .slice(0, 3);

  for (const [index, line] of tray.entries()) {
    await clickElement(page, line.id);
    await clickElement(page, `slot_${index}`);
  }

  return tray.map((line) => line.id.replace('line_', ''));
}

/** Submits; returns the desk feedback. */
export async function submitReport(page: Page) {
  await press(page, 's');
  await page.waitForTimeout(400);

  return (await surface(page))?.feedback ?? null;
}

/** Attaches the register tag for `lineId` to the slot holding it (pointer). */
export async function attachTag(page: Page, slot: number, tag: string) {
  await clickElement(page, `tag_${tag}`);
  await clickElement(page, `slot_${slot}`);
}

/* ------------------------------------------------------------------ *
 * Handover desk + M25 notice
 * ------------------------------------------------------------------ */

/** Opens the handover desk prompt and returns its card labels. */
export async function openHandoverDesk(page: Page) {
  await openWorkshopPrompt(page, 'handoverDesk');

  return promptCardLabels(page);
}

/** Reads and acknowledges the questionnaire notice (M25 handoff shell). */
export async function acknowledgeQuestionnaireNotice(page: Page) {
  const labels = await openHandoverDesk(page);
  const index = labels.findIndex((label) =>
    /questionnaire notice/i.test(label),
  );

  expect(index).toBeGreaterThanOrEqual(0);
  await selectPromptOption(page, index + 1);
  await page.waitForTimeout(400);

  const body = await lastPromptBody(page);

  expect(body).toContain('QUESTIONNAIRE NOTICE');
  expect(body).not.toMatch(FORBIDDEN_TEXT);
  await selectPromptOption(page, 1);
  await page.waitForTimeout(400);

  return body;
}

/** Places whatever outbound items are carried (relay unit / coupling). */
export async function placeOutbound(page: Page) {
  const placed: string[] = [];

  for (let round = 0; round < 2; round += 1) {
    const labels = await openHandoverDesk(page);
    const index = labels.findIndex((label) => /^Place the/.test(label));

    if (index === -1) {
      await selectPromptOption(page, labels.length);
      await page.waitForTimeout(300);
      break;
    }

    placed.push(labels[index]);
    await selectPromptOption(page, index + 1);
    await page.waitForTimeout(400);
  }

  return placed;
}

/** Held ENTER on a surface must activate the focused element once. */
export async function holdEnter(page: Page, ms: number) {
  await hold(page, 'Enter', ms);
  await page.waitForTimeout(300);
}

export { pilotProbe };
