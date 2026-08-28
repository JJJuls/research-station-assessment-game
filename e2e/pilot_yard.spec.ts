/**
 * Pilot route — Exterior Recovery Yard (Unit 5).
 *
 * Real participant navigation from the Dock (no developer boots):
 *
 * 1. Counterbalanced job queue (`exterior_job_order`), M23 field
 *    recovery to completion, and both AMBIENT instances (M22 relay
 *    housing seal, M25 yard pump interlock) completed in the session's
 *    called order — with the exported control notes on every register.
 * 2. Corrected M24 deck standardisation on the route (EVERY committed
 *    cycle consumes a deck position, timing is telemetry only),
 *    acknowledgement-gated M24/M26 completion, verified-futility M26
 *    flow, and fail-forward job skipping (skipped jobs close honestly
 *    and never block the route).
 * 3. Ambient departure semantics: leaving the yard with an open M22/M25
 *    window records a departure (never a terminal code), and returning
 *    to finish the recovery still completes it.
 *
 * All checks read DEV probes (`__fieldActionsProbe`, `__yardJobsProbe`,
 * `__measurementValidity`, `__pilotProbe`, `__pilotCoverage`) and the
 * research event buffer; input is real keyboard traffic.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { driveAxisTo, getEvents, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToWorkshop,
  hold,
  interactAt,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotProbe,
  press,
  useDoor,
  valeHandover,
  walkTo,
  workshopSignOff,
  workshopToConcourse,
} from './pilotHelpers';

/** Yard geometry (src/scenes/ExteriorRecoveryYardScene.ts). */
const YARD = {
  noor: { x: 300.8, y: 428.8 },
  plotStake: { x: 480, y: 272 },
  housing: { x: 160, y: 470.4 },
  supplyCrate: { x: 608, y: 440 },
  pumpPrime: { x: 448, y: 108.8 },
  pumpBreaker: { x: 496, y: 108.8 },
  rig: { x: 656, y: 108.8 },
  verificationPost: { x: 240, y: 300.8 },
  m23Cells: {
    form_a: { x: 592, y: 272 },
    form_b: { x: 656, y: 336 },
  },
  m26ControlCell: { x: 112, y: 144 },
  m26DepletedSpot: { x: 112, y: 352 },
} as const;

const FORBIDDEN_IDENTIFIERS = /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bdev\b/i;

const OPPORTUNITY: Record<string, string> = {
  m22: 'proto_m22_housing_seal_setback',
  m23: 'proto_m23_field_recovery',
  m24: 'proto_m24_magnet_utility',
  m25: 'proto_m25_yardpump_interlock',
  m26: 'proto_m26_depleted_search',
};

const ITEM: Record<string, string> = {
  m22: 'M22',
  m23: 'M23',
  m24: 'M24',
  m25: 'M25',
  m26: 'M26',
};

/* ------------------------------------------------------------------ *
 * Probes
 * ------------------------------------------------------------------ */

interface FieldActionsProbeLike {
  worldActionActive: boolean;
  scan: { cooling: boolean; context: string; last: unknown };
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

interface YardJobsProbeLike {
  queue: string[];
  current_job: string;
  zone_entries: number;
  m22: {
    fix_attempted: boolean;
    setback_shown: boolean;
    spare_seal_fetched: boolean;
    seal_seated: boolean;
    yard_exits_during_window: number;
  };
  m25: {
    useful_cycles: number;
    lock_engaged: boolean;
    post_lock_primes: number;
    reset_done: boolean;
    yard_exits_during_window: number;
  };
}

interface ValidityRecordLike {
  opportunity_id: string;
  form: string | null;
  entered: boolean;
  completed: boolean;
  invalid_reason: string | null;
  prior_exposure: string[];
  validity: string;
}

async function faProbe(page: Page): Promise<FieldActionsProbeLike> {
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

async function yardProbe(page: Page): Promise<YardJobsProbeLike> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __yardJobsProbe?: YardJobsProbeLike | null })
        .__yardJobsProbe ?? null,
  );

  if (probe === null) {
    throw new Error('yard-jobs probe unavailable');
  }

  return probe;
}

async function validityRecord(
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

async function itemStatus(page: Page, item: string): Promise<string> {
  const coverage = await pilotCoverage(page);
  const row = coverage?.items.find((candidate) => candidate.item === item);

  if (row === undefined) {
    throw new Error(`coverage row ${item} missing`);
  }

  return row.status;
}

interface PilotEventLike {
  event_type: string;
  metadata?: Record<string, unknown>;
}

async function eventsByType(
  page: Page,
  type: string,
): Promise<PilotEventLike[]> {
  return ((await getEvents(page)) as PilotEventLike[]).filter(
    (event) => event.event_type === type,
  );
}

/* ------------------------------------------------------------------ *
 * Field-action drivers (proven field_actions_lab patterns)
 * ------------------------------------------------------------------ */

/** One JSON snapshot of everything a field-action press can change. */
async function observableSnapshot(page: Page): Promise<string> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __fieldActionsProbe?: {
        worldActionActive: boolean;
        scan: { last: unknown };
        dig: { last: unknown };
        magnet: { phase: string };
        caches: unknown[];
      } | null;
      __lastRoomFeedbackText?: string | null;
      __yardJobsProbe?: unknown;
    };
    const probe = w.__fieldActionsProbe;

    return JSON.stringify({
      feedback: w.__lastRoomFeedbackText ?? null,
      action: probe?.worldActionActive ?? false,
      scan: probe?.scan.last ?? null,
      dig: probe?.dig.last ?? null,
      phase: probe?.magnet.phase ?? null,
      caches: probe?.caches.length ?? 0,
      yard: w.__yardJobsProbe ?? null,
    });
  });
}

/** Press retried ONLY when nothing observable happened (input loss). */
async function pressExpectingEffect(page: Page, key: string, attempts = 3) {
  const before = await observableSnapshot(page);

  for (let attempt = 0; attempt < attempts; attempt++) {
    await press(page, key);
    await page.waitForTimeout(700);

    if ((await observableSnapshot(page)) !== before) {
      return;
    }
  }

  throw new Error(`"${key}" press produced no observable effect`);
}

async function waitMagnetPhase(page: Page, phase: string, timeout = 15_000) {
  await page.waitForFunction(
    (expected) =>
      (
        window as unknown as {
          __fieldActionsProbe?: { magnet: { phase: string } } | null;
        }
      ).__fieldActionsProbe?.magnet.phase === expected,
    phase,
    { timeout },
  );
}

/** One full committed magnet cycle, locked in or out of the band. */
async function magnetCycle(page: Page, inBand: boolean) {
  await pressExpectingEffect(page, 'F');
  await waitMagnetPhase(page, 'timing_window', 10_000);
  await page.waitForFunction(
    (wanted) =>
      (
        window as unknown as {
          __fieldActionsProbe?: { magnet: { markerInBand: boolean } } | null;
        }
      ).__fieldActionsProbe?.magnet.markerInBand === wanted,
    inBand,
    { timeout: 10_000 },
  );
  await page.keyboard.press('Space');
  await waitMagnetPhase(page, 'idle');
}

/**
 * Walks to a dig cell's north neighbour and faces down onto it, then
 * VERIFIES the facing-probe cell and re-drives on drift
 * (field_actions_lab faceCellFromNorth precedent).
 */
async function faceCellFromNorth(page: Page, cx: number, cy: number) {
  const targetCol = Math.floor(cx / 32);
  const targetRow = Math.floor(cy / 32);

  for (let attempt = 0; attempt < 4; attempt++) {
    await driveAxisTo(page, 'y', cy - 76, 5);
    await driveAxisTo(page, 'x', cx, 6);
    await hold(page, 'ArrowDown', 115);

    const probeNow = await faProbe(page);
    const target = probeNow.dig.target;

    if (
      target !== null &&
      target.col === targetCol &&
      target.row === targetRow
    ) {
      return;
    }
  }

  throw new Error(`could not face cell ${targetCol}:${targetRow}`);
}

async function waitDigOutcome(page: Page, outcome: string) {
  await page.waitForFunction(
    (expected) =>
      (
        window as unknown as {
          __fieldActionsProbe?: {
            dig: { last: { outcome: string } | null };
          } | null;
        }
      ).__fieldActionsProbe?.dig.last?.outcome === expected,
    outcome,
    { timeout: 10_000 },
  );
}

/* ------------------------------------------------------------------ *
 * Route navigation
 * ------------------------------------------------------------------ */

/**
 * Dock → Concourse (Vale ×2) → Workshop (board ×2) → Laboratory (Kai ×2) → airlock → Yard →
 * Noor's briefing ("Ready." issues the field tools, stage
 * exterior_work). Pure fail-forward path — no measurement work done.
 */
async function enterYard(page: Page, tag: string) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await walkTo(page, 96, 60, { yFirst: true });
  await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
    approachOffset: { x: 0, y: 20 },
  });
  await valeHandover(page);
  await concourseToWorkshop(page);
  await workshopSignOff(page);
  await workshopToConcourse(page);
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: { x: 40, y: 44 },
  });
  await selectPromptOption(page, 1);
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: { x: 40, y: 44 },
  });
  await selectPromptOption(page, 1);
  await walkTo(page, 240, 70, { yFirst: false });
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: { x: 0, y: 20 },
  });
  await openPromptAt(page, YARD.noor, { approachOffset: { x: 0, y: 40 } });
  await selectPromptOption(page, 1);

  const probe = await pilotProbe(page);

  expect(probe?.stage).toBe('exterior_work');
}

/** Opens Noor's prompt and accepts the current job (option 1). */
async function acceptNextJob(page: Page) {
  await openPromptAt(page, YARD.noor, { approachOffset: { x: 0, y: 40 } });

  const body = await page.evaluate(
    () =>
      (window as unknown as { __lastPromptBody?: string | null })
        .__lastPromptBody ?? '',
  );

  expect(body).not.toMatch(FORBIDDEN_IDENTIFIERS);
  await selectPromptOption(page, 1);
}

/** Retrying station interaction until a probe condition holds. */
async function useStationUntil(
  page: Page,
  at: { x: number; y: number },
  offset: { x: number; y: number },
  condition: () => Promise<boolean>,
) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await interactAt(page, at, { approachOffset: offset });
    await page.waitForTimeout(900);

    if (await condition()) {
      return;
    }
  }

  // Diagnostic-rich failure (Unit 8): where the avatar is and what the
  // yard-job probe holds when the condition never comes true.
  const diag = await page.evaluate(() => {
    const w = window as unknown as {
      __playerProbe?: { x: number; y: number } | null;
      __yardJobsProbe?: { m22: unknown; m25: unknown } | null;
      __lastRoomFeedbackText?: string | null;
    };

    return JSON.stringify({
      player: w.__playerProbe ?? null,
      m22: w.__yardJobsProbe?.m22 ?? null,
      m25: w.__yardJobsProbe?.m25 ?? null,
      feedback: w.__lastRoomFeedbackText ?? null,
    });
  });

  throw new Error(`station at ${at.x},${at.y} condition never held — ${diag}`);
}

/* ------------------------------------------------------------------ *
 * Job drivers
 * ------------------------------------------------------------------ */

/**
 * M22: setback → crate fetch → seat (housing recovered). All east-west
 * traversals ride the y=376 lane — the y≈470-500 band is blocked by the
 * airlock door body at (384, 496) and Noor's body at (300, 428), and
 * driveAxisTo gives up silently on a wall clamp.
 */
async function doM22(page: Page) {
  await useStationUntil(
    page,
    YARD.housing,
    { x: 44, y: 0 },
    async () => (await yardProbe(page)).m22.setback_shown,
  );
  await walkTo(page, YARD.housing.x + 44, 376, { yFirst: true });
  await walkTo(page, YARD.supplyCrate.x - 44, 376, { yFirst: false });
  await useStationUntil(
    page,
    YARD.supplyCrate,
    { x: -44, y: 0 },
    async () => (await yardProbe(page)).m22.spare_seal_fetched,
  );
  await walkTo(page, YARD.supplyCrate.x - 44, 376, { yFirst: true });
  await walkTo(page, YARD.housing.x + 44, 376, { yFirst: false });
  await useStationUntil(
    page,
    YARD.housing,
    { x: 44, y: 0 },
    async () => (await yardProbe(page)).m22.seal_seated,
  );
}

/** M25: three useful primes → lock → one post-lock prime → breaker. */
async function doM25(page: Page) {
  await walkTo(page, YARD.pumpPrime.x, 300, { yFirst: true });

  for (let cycle = 1; cycle <= 3; cycle++) {
    await useStationUntil(
      page,
      YARD.pumpPrime,
      { x: 0, y: 44 },
      async () => (await yardProbe(page)).m25.useful_cycles >= cycle,
    );
  }

  expect((await yardProbe(page)).m25.lock_engaged).toBe(true);

  // One unchanged post-lock prime (the identical lock statement).
  await useStationUntil(
    page,
    YARD.pumpPrime,
    { x: 0, y: 44 },
    async () => (await yardProbe(page)).m25.post_lock_primes >= 1,
  );

  // The visible different strategy: the breaker beside the control.
  await useStationUntil(
    page,
    YARD.pumpBreaker,
    { x: 0, y: 44 },
    async () => (await yardProbe(page)).m25.reset_done,
  );
}

/** Ambient-window opener only (for the departure test). */
async function openAmbientWindow(page: Page, job: string) {
  if (job === 'm22') {
    await useStationUntil(
      page,
      YARD.housing,
      { x: 44, y: 0 },
      async () => (await yardProbe(page)).m22.setback_shown,
    );

    return;
  }

  await walkTo(page, YARD.pumpPrime.x, 300, { yFirst: true });

  for (let cycle = 1; cycle <= 3; cycle++) {
    await useStationUntil(
      page,
      YARD.pumpPrime,
      { x: 0, y: 44 },
      async () => (await yardProbe(page)).m25.useful_cycles >= cycle,
    );
  }
}

/** Completes a previously opened ambient window after returning. */
async function completeAmbientWindow(page: Page, job: string) {
  if (job === 'm22') {
    // y=376 lane (clear of the airlock door and Noor bodies).
    await walkTo(page, YARD.supplyCrate.x - 44, 376, { yFirst: true });
    await useStationUntil(
      page,
      YARD.supplyCrate,
      { x: -44, y: 0 },
      async () => (await yardProbe(page)).m22.spare_seal_fetched,
    );
    await walkTo(page, YARD.supplyCrate.x - 44, 376, { yFirst: true });
    await walkTo(page, YARD.housing.x + 44, 376, { yFirst: false });
    await useStationUntil(
      page,
      YARD.housing,
      { x: 44, y: 0 },
      async () => (await yardProbe(page)).m22.seal_seated,
    );

    return;
  }

  await walkTo(page, YARD.pumpBreaker.x, 300, { yFirst: true });
  await useStationUntil(
    page,
    YARD.pumpBreaker,
    { x: 0, y: 44 },
    async () => (await yardProbe(page)).m25.reset_done,
  );
}

/** M23: scan inside the plot, then dig the form's target cell. */
async function doM23(page: Page) {
  const record = await validityRecord(page, OPPORTUNITY.m23);
  const cell =
    record.form === 'form_b' ? YARD.m23Cells.form_b : YARD.m23Cells.form_a;

  await walkTo(page, cell.x, 392, { yFirst: true });
  await pressExpectingEffect(page, 'C');
  await faceCellFromNorth(page, cell.x, cell.y);
  await pressExpectingEffect(page, 'D');
  await waitDigOutcome(page, 'recovered');
}

test.describe('pilot route — Exterior Recovery Yard (Unit 5)', () => {
  test('counterbalanced job queue; M23 recovery and both ambient instances complete in the called order', async ({
    page,
  }) => {
    test.setTimeout(720_000);

    const errors = captureErrors(page);

    await enterYard(page, 'jobs');

    // Counterbalanced job order: M23 first, {M22, M25} then {M24, M26}
    // pairs each counterbalanced, neutral check-in before the last job.
    const orderEvents = await eventsByType(page, 'pilot_exterior_job_order');

    expect(orderEvents.length).toBeGreaterThan(0);

    const queue = orderEvents[0].metadata?.queue as string[];

    expect(queue).toHaveLength(6);
    expect(queue[0]).toBe('m23');
    expect(new Set([queue[1], queue[2]])).toEqual(new Set(['m22', 'm25']));
    expect(queue[4]).toBe('checkin');
    expect(new Set([queue[3], queue[5]])).toEqual(new Set(['m24', 'm26']));

    // Every yard register carries its queue position as a control note.
    const orderIndex = orderEvents[0].metadata?.order_index;

    for (const job of ['m22', 'm23', 'm24', 'm25', 'm26']) {
      const record = await validityRecord(page, OPPORTUNITY[job]);
      const position = queue.indexOf(job) + 1;

      expect(record.prior_exposure).toContain(
        `control:exterior_job_order=${String(orderIndex)};queue_position=${position}`,
      );
    }

    // Guidance: the beacon leads to the first job's station.
    const probe = await pilotProbe(page);

    expect(probe?.beacon?.label).toBe('East Recovery Plot');

    // Job 1 — M23 field recovery to completion.
    await acceptNextJob(page);
    expect((await faProbe(page)).windows.m23_open).toBe(true);
    await doM23(page);

    const m23 = await validityRecord(page, OPPORTUNITY.m23);

    expect(m23.completed).toBe(true);
    expect(await itemStatus(page, 'M23')).toBe('completed');
    expect((await faProbe(page)).windows.m23_open).toBe(false);

    const eventTypes = ((await getEvents(page)) as PilotEventLike[]).map(
      (event) => event.event_type,
    );

    expect(eventTypes).toContain('proto_m23_field_recovery_scan');
    expect(eventTypes).toContain('proto_m23_field_recovery_completed');
    expect(eventTypes).toContain('secondary_field_action_dig');

    // Jobs 2 + 3 — the ambient pair in the called order.
    for (const job of [queue[1], queue[2]]) {
      await walkTo(page, YARD.noor.x, YARD.noor.y + 40, { yFirst: false });
      await acceptNextJob(page);

      if (job === 'm22') {
        await doM22(page);
      } else {
        await doM25(page);
      }

      const record = await validityRecord(page, OPPORTUNITY[job]);

      expect(record.completed).toBe(true);
      expect(await itemStatus(page, ITEM[job])).toBe('completed');
    }

    const finalTypes = ((await getEvents(page)) as PilotEventLike[]).map(
      (event) => event.event_type,
    );

    for (const required of [
      'proto_m22_housing_opportunity_opened',
      'proto_m22_housing_setback_shown',
      'proto_m22_housing_spare_fetched',
      'proto_m22_housing_seal_seated',
      'proto_m22_housing_closed',
      'proto_m25_yardpump_opportunity_opened',
      'proto_m25_yardpump_post_lock_prime',
      'proto_m25_yardpump_breaker_reset',
      'proto_m25_yardpump_closed',
    ]) {
      expect(finalTypes).toContain(required);
    }

    expectNoRuntimeErrors(errors);
  });

  test('corrected M24 deck, acknowledgement-gated M24/M26 completion, verified futility and fail-forward job skipping', async ({
    page,
  }) => {
    test.setTimeout(780_000);

    const errors = captureErrors(page);

    await enterYard(page, 'deck');

    const queue = (await yardProbe(page)).queue;

    // Fail-forward: skip M23 and the whole ambient pair by accepting
    // through the queue — nothing blocks, nothing is scored.
    await acceptNextJob(page); // m23 accepted (never worked)
    await walkTo(page, YARD.noor.x, YARD.noor.y + 40, { yFirst: false });
    await acceptNextJob(page); // pair1 job A (closes the M23 window)
    await openPromptAt(page, YARD.noor, { approachOffset: { x: 0, y: 40 } });
    await selectPromptOption(page, 1); // pair1 job B

    const m23Closed = await eventsByType(
      page,
      'proto_m23_field_recovery_closed',
    );

    expect(m23Closed).toHaveLength(1);
    expect(m23Closed[0].metadata?.exit_status).toBe('next_job');
    expect(await itemStatus(page, 'M23')).toBe('open'); // censored at Final Core

    // Pair 2 in the called order, with the neutral check-in between.
    const pairTwo = [queue[3], 'checkin', queue[5]];

    for (const job of pairTwo) {
      await openPromptAt(page, YARD.noor, { approachOffset: { x: 0, y: 40 } });
      await selectPromptOption(page, 1);

      if (job === 'm24') {
        await runM24Drill(page);
      } else if (job === 'm26') {
        await runM26Drill(page);
      }
      // checkin: nothing to do — the acceptance IS the neutral beat.
    }

    // Closing the last window happens at Noor's "done": both windows
    // reached displayed+acknowledged, so both complete.
    await openPromptAt(page, YARD.noor, { approachOffset: { x: 0, y: 40 } });
    await selectPromptOption(page, 1); // done beat option 1 = "I am done outside."

    expect((await pilotProbe(page))?.stage).toBe('report_kai');
    expect(await itemStatus(page, 'M24')).toBe('completed');
    expect(await itemStatus(page, 'M26')).toBe('completed');
    // Never-attempted ambient jobs stay honestly pending (never low).
    expect(await itemStatus(page, 'M22')).toBe('pending');
    expect(await itemStatus(page, 'M25')).toBe('pending');

    // Corrected standardisation: the six committed cycles consumed
    // positions 1..6 in order, in-band or not; the 7th (post-signal)
    // cycle consumed nothing and returned nothing.
    const cycles = (
      await eventsByType(page, 'proto_m24_magnet_utility_cycle')
    ).filter((event) => event.metadata?.cancelled === false);
    const positions = cycles
      .map((event) => event.metadata?.pull_position)
      .filter((position) => position !== null);

    expect(positions.slice(0, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(
      cycles.some((event) => event.metadata?.locked_in_band === false),
    ).toBe(true);

    for (const event of cycles) {
      expect(typeof event.metadata?.cycle_duration_ms).toBe('number');
    }

    // The depleting 6th cycle itself logs post_signal=true (the
    // statement is displayed during its resolution, before the note —
    // accepted foundation ordering); the genuine post-depletion cast is
    // the LAST post-signal cycle.
    const postSignal = cycles.filter(
      (event) => event.metadata?.post_signal === true,
    );

    expect(postSignal.length).toBeGreaterThanOrEqual(2);
    expect(postSignal[postSignal.length - 1].metadata?.post_depletion).toBe(
      true,
    );

    expectNoRuntimeErrors(errors);
  });

  test('ambient windows survive yard departure: departed is recorded, never terminal, and returning completes the recovery', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await enterYard(page, 'depart');

    const queue = (await yardProbe(page)).queue;
    const ambient = queue[1]; // first ambient job (m22 or m25)

    await acceptNextJob(page); // m23 (never worked)
    await walkTo(page, YARD.noor.x, YARD.noor.y + 40, { yFirst: false });
    await acceptNextJob(page); // the ambient job
    await openAmbientWindow(page, ambient);

    // Leave the yard with the ambient window open.
    await walkTo(page, 384, 400, { yFirst: false });
    await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: -40 },
    });

    const departedType =
      ambient === 'm22'
        ? 'proto_m22_housing_departed'
        : 'proto_m25_yardpump_departed';
    const departed = await eventsByType(page, departedType);

    expect(departed).toHaveLength(1);
    expect(departed[0].metadata?.yard_exits_during_window).toBe(1);

    // No terminal close was written — the window is still open.
    const closedType =
      ambient === 'm22'
        ? 'proto_m22_housing_closed'
        : 'proto_m25_yardpump_closed';

    expect(await eventsByType(page, closedType)).toHaveLength(0);
    expect(await itemStatus(page, ITEM[ambient])).toBe('open');

    // Return and complete the recovery — departure was never a latch.
    await walkTo(page, 240, 70, { yFirst: false });
    await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
      approachOffset: { x: 0, y: 20 },
    });

    const yard = await yardProbe(page);

    expect(yard.zone_entries).toBe(2);
    expect(yard.current_job).toBe(queue[2]);

    await completeAmbientWindow(page, ambient);

    const record = await validityRecord(page, OPPORTUNITY[ambient]);

    expect(record.completed).toBe(true);
    expect(await itemStatus(page, ITEM[ambient])).toBe('completed');

    const closed = await eventsByType(page, closedType);

    expect(closed).toHaveLength(1);
    expect(closed[0].metadata?.departure_code).toBeNull();
    expect(closed[0].metadata?.yard_exits_during_window).toBe(1);

    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * Drill bodies (used by test 2)
 * ------------------------------------------------------------------ */

/**
 * M24: six committed cycles (mixing in-band and out-of-band locks —
 * every one consumes a position), the depletion statement, one
 * post-signal cycle, then the explicit acknowledgement at the readout.
 */
async function runM24Drill(page: Page) {
  await walkTo(page, 680, 300, { yFirst: true });
  await walkTo(page, 680, 152, { yFirst: true });

  for (let position = 1; position <= 6; position++) {
    // Cycle 2 deliberately locks OUT of the band: the deck advances
    // regardless (timing is secondary motor telemetry only).
    await magnetCycle(page, position !== 2);

    const probe = await faProbe(page);

    expect(probe.magnet.deckPosition).toBe(position);
  }

  const afterSix = await faProbe(page);

  expect(afterSix.magnet.depleted).toBe(true);
  expect(
    (await eventsByType(page, 'proto_m24_magnet_utility_depletion_shown'))
      .length,
  ).toBeGreaterThan(0);

  // One post-signal cycle (recorded separately, returns nothing).
  await magnetCycle(page, true);

  // Explicit acknowledgement at the rig readout (E-station prompt).
  await openPromptAt(page, YARD.rig, { approachOffset: { x: 0, y: 44 } });
  await selectPromptOption(page, 2);
  expect(
    (
      await eventsByType(
        page,
        'proto_m24_magnet_utility_depletion_acknowledged',
      )
    ).length,
  ).toBe(1);
}

/**
 * M26: recover the control sample, read the certificate at the
 * verification post (display), acknowledge it, then one post-ack scan
 * inside the fenced verified-empty plot.
 */
async function runM26Drill(page: Page) {
  expect((await faProbe(page)).windows.m26_phase).toBe('control');

  await walkTo(page, YARD.m26ControlCell.x, 264, { yFirst: false });
  await faceCellFromNorth(page, YARD.m26ControlCell.x, YARD.m26ControlCell.y);
  await pressExpectingEffect(page, 'D');
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: { windows: { m26_phase: string } } | null;
        }
      ).__fieldActionsProbe?.windows.m26_phase === 'futile',
    undefined,
    { timeout: 10_000 },
  );

  // The verification post prompt body IS the certificate.
  await openPromptAt(page, YARD.verificationPost, {
    approachOffset: { x: 0, y: 44 },
  });
  await selectPromptOption(page, 2); // Acknowledge the verification
  expect(
    (
      await eventsByType(
        page,
        'proto_m26_depleted_search_futility_acknowledged',
      )
    ).length,
  ).toBe(1);

  // One post-acknowledgement scan INSIDE the fenced plot.
  await walkTo(page, YARD.m26DepletedSpot.x, YARD.m26DepletedSpot.y, {
    yFirst: false,
  });
  await pressExpectingEffect(page, 'C');
  await page.waitForFunction(
    () =>
      ((
        window as unknown as {
          researchRuntime?: { getEvents: () => { event_type: string }[] };
        }
      ).researchRuntime
        ?.getEvents()
        .filter(
          (event) =>
            event.event_type === 'proto_m26_depleted_search_search_scan',
        ).length ?? 0) >= 1,
    undefined,
    { timeout: 10_000 },
  );
}
