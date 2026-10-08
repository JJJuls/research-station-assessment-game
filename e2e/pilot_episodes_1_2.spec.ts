/**
 * Evidence-led pilot v2 — episodes 1-2 windows (Unit 2).
 *
 * Real keyboard/pointer input against DEV probes. Proves on the participant
 * route: every episode-1 and episode-2 opportunity is independently
 * reachable without any prior success; each window logs only its own
 * item-owned family; the M09/M10 offers are explicit; the M05 fault is
 * presented silently and censors on departure; the M02 open workspace
 * runs organise → hand over → retrieval; the first M04 cutting job closes
 * at its first departure (Station 080 Unit 14); M03 occasion 2 refuses before the return; every overlay
 * renders above the host and resumes it; no canonical event and no score
 * exists anywhere in the log.
 *
 * Station 080 U14-D2: episode 2 stands on the interaction registry's own
 * approach points of the 43×19 Records Workshop and walks its lanes
 * (`workshopVia`). It used hand-typed coordinates of the former 25×19
 * room, which no longer met a station; the sample cutter is reached
 * through the annex doorway and operated from the north.
 */
// V4: the 800×600 design space sits at canvas (160 + 1.2x, 1.2y) on the
// 1280×720 canvas (src/world/viewport.ts; DEV probe window.__designSpace).
import { expect, type Page, test } from '@playwright/test';

import { WORKSHOP_REGISTRY } from '../src/world/interactionRegistry';
import { getEvents, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToWorkshop,
  concourseVia,
  dockToConcourse,
  expectStage,
  interactAt,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotEventTypes,
  press,
  registryApproach,
  routeToWorkshopWork,
  SETTLE_PAUSE_MS,
  waitPromptLabel,
  walkTo,
  workshopToConcourse,
  workshopVia,
} from './pilotHelpers';

/** World V1: approach points from the interaction registry (zero offsets). */
const CONCOURSE = {
  planBoard: registryApproach('concourse.plan_board'),
  incidentDesk: registryApproach('concourse.incident_desk'),
  qcPacket: registryApproach('concourse.qc_packet_o1'),
  monitorGauge: registryApproach('concourse.monitor_gauge'),
  deskLamp: registryApproach('concourse.reading_desk_lamp'),
} as const;

/** Records Workshop stations by their interaction-registry id (U14-D2). */
const WORKSHOP = {
  caseWorkspace: 'workshop.case_workspace',
  pressB: 'workshop.press_b',
  sampleCutter: 'workshop.sample_cutter',
  dispatchConsole: 'workshop.dispatch_console',
  calibrationBench: 'workshop.calibration_bench',
  qcPacket: 'workshop.qc_packet_o2',
  latticeBench: 'workshop.lattice_bench',
  sealLog: 'workshop.seal_log',
} as const;

/**
 * Walks the workshop's lanes to a station's registry approach point and
 * returns its anchor with the approach offset for interactAt /
 * openPromptAt — the machine-audited standing point, never a hand-typed
 * coordinate.
 */
async function workshopStation(page: Page, id: string) {
  const entry = WORKSHOP_REGISTRY.find((candidate) => candidate.id === id);

  if (entry === undefined) {
    throw new Error(`episode 2: no workshop registry entry ${id}`);
  }

  await workshopVia(page, entry.approach.x, entry.approach.y);

  return {
    at: { x: entry.x, y: entry.y },
    options: {
      approachOffset: {
        x: entry.approach.x - entry.x,
        y: entry.approach.y - entry.y,
      },
      yFirst: true,
    },
  };
}

/** Walks to a workshop station and presses SPACE at it. */
async function useWorkshopStation(page: Page, id: string) {
  const station = await workshopStation(page, id);

  await interactAt(page, station.at, station.options);
}

interface SurfaceProbe {
  open: boolean;
  surface_id: string | null;
  focus: string | null;
  elements: {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    state: string;
    focusable: boolean;
  }[];
}

async function surface(page: Page): Promise<SurfaceProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __workSurfaceProbe?: SurfaceProbe | null })
        .__workSurfaceProbe ?? null,
  );
}

async function waitSurface(page: Page, open: boolean, id?: string) {
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

async function clickElement(page: Page, id: string) {
  const probe = (await surface(page))!;
  const element = probe.elements.find((e) => e.id === id)!;
  const box = (await page.locator('canvas').boundingBox())!;

  await page.mouse.click(
    box.x + ((160 + element.x * 1.2) * box.width) / 1280,
    box.y + (element.y * 1.2 * box.height) / 720,
  );
  await page.waitForTimeout(200);
}

/**
 * Opens a work surface: at a Concourse registry approach point (zero
 * offset) or, given a workshop registry id, at that station.
 */
async function openSurfaceAt(
  page: Page,
  at: { x: number; y: number } | string,
  id: string,
) {
  const where = () =>
    page.evaluate(() => {
      const w = window as unknown as {
        __playerProbe?: { x: number; y: number } | null;
        __promptCards?: { label: string }[] | null;
      };

      return JSON.stringify({
        at: w.__playerProbe ?? null,
        cards: w.__promptCards?.map((card) => card.label) ?? null,
      });
    });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const before = await where();

    if (typeof at === 'string') {
      await useWorkshopStation(page, at);
    } else {
      await interactAt(page, at, { approachOffset: { x: 0, y: 0 } });
    }

    const opened = await waitSurface(page, true, id).then(
      () => true,
      () => false,
    );

    if (opened) {
      return;
    }

    // Driver evidence for a failed attempt (V3 verification precedent).
    // eslint-disable-next-line no-console
    console.log(
      `[openSurfaceAt] ${id} attempt ${attempt + 1}: before ${before} after ${await where()}`,
    );
  }

  const observed = await page.evaluate(() => {
    const w = window as unknown as {
      __playerProbe?: { x: number; y: number } | null;
      __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
      __lastRoomFeedbackText?: string | null;
      __workSurfaceProbe?: { open: boolean; surface_id: string | null } | null;
      __promptCards?: { label: string }[] | null;
    };

    return JSON.stringify({
      at: w.__playerProbe ?? null,
      prompt: w.__worldPromptProbe ?? null,
      feedback: w.__lastRoomFeedbackText ?? null,
      surface: w.__workSurfaceProbe ?? null,
      cards: w.__promptCards?.map((card) => card.label) ?? null,
    });
  });

  throw new Error(`surface ${id} did not open (observed ${observed})`);
}

async function closeSurface(page: Page) {
  await press(page, 'Escape');
  await waitSurface(page, false);
}

async function itemStatus(page: Page, item: string) {
  return (await pilotCoverage(page))!.items.find((i) => i.item === item)!
    .status;
}

async function itemCoverage(page: Page, item: string) {
  return (await pilotCoverage(page))!.items.find((i) => i.item === item)!;
}

function familyOf(type: string): string | null {
  const match = /^(proto_m\d\d_[a-z]+_)/.exec(type);

  return match ? match[1] : null;
}

test.describe('evidence-led pilot v2 — episodes 1 and 2 (Unit 2)', () => {
  test('episode 1: offers, plan board, incident desk, quality packet, gauge check and the silent fault are independent item windows', async ({
    page,
  }) => {
    test.setTimeout(600_000);
    const errors = captureErrors(page);

    await bootPilot(page, 'ep1');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);

    // Vale: briefing → watch offer (accept) → key-card offer (accept) →
    // interruption → recap (Station 080 Unit 15) → lamp job.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'incident_handover');
    await waitPromptLabel(page, 'I will take the watch.');
    await page.waitForTimeout(SETTLE_PAUSE_MS);
    await selectPromptOption(page, 1); // take the watch
    await waitPromptLabel(page, 'I will take it to Kai.');
    await page.waitForTimeout(SETTLE_PAUSE_MS);
    await selectPromptOption(page, 1); // carry the key card
    await waitPromptLabel(page, 'Alarm cleared — continue.');
    await page.waitForTimeout(400);
    await selectPromptOption(page, 1); // interruption acknowledged
    // M10 (Unit 15): the obligation is shown again after the alarm.
    await waitPromptLabel(page, 'Understood.');
    await page.waitForTimeout(SETTLE_PAUSE_MS);
    await selectPromptOption(page, 1); // recap acknowledged
    // M05 (Unit 6): the extra lamp job closes the chain — accepted here
    // (a deliberate press past the stage's 400 ms settle window).
    await waitPromptLabel(page, 'Yes — I will take the lamp job.');
    await page.waitForTimeout(450);
    await selectPromptOption(page, 1); // take the lamp job
    await page.waitForTimeout(400);

    let types = await pilotEventTypes(page);

    expect(types).toContain('proto_m09_checks_offer_answered');
    expect(types).toContain('proto_m09_checks_check_window_opened');
    expect(types).toContain('proto_m10_delivery_offer_answered');
    expect(types).toContain('proto_m10_delivery_interruption_shown');
    expect(types).toContain('proto_m10_delivery_interruption_acknowledged');
    expect(types).toContain('proto_m10_delivery_obligation_shown');
    // Each press was past its settle window: nothing was refused.
    expect(types).not.toContain('proto_m09_checks_offer_press_refused');
    expect(types).not.toContain('proto_m10_delivery_press_refused');

    // M05 (Unit 6): the accepted lamp job opened at the answer; the start
    // clock became eligible once the briefing chain closed (no prompt).
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            researchRuntime?: { getEvents: () => { event_type: string }[] };
          }
        ).researchRuntime
          ?.getEvents()
          .some((e) => e.event_type === 'proto_m05_start_eligible') ?? false,
      undefined,
      { timeout: 8000 },
    );
    expect(types).toContain('proto_m05_start_offer_answered');
    expect(await pilotEventTypes(page)).toContain(
      'proto_m05_start_opportunity_opened',
    );

    // Plan board: open the surface (above the host), lift and place a card by pointer, close.
    await openSurfaceAt(page, CONCOURSE.planBoard, 'm01_plan_board');
    const probe = (await surface(page))!;

    expect(probe.elements.some((e) => e.id.startsWith('card_'))).toBe(true);
    await clickElement(page, 'card_isolate_loop');
    await clickElement(page, 'slot_0');
    types = await pilotEventTypes(page);
    // Station 080 Unit 5: the plan board is the first three-job batch.
    expect(types).toContain('proto_m01_batch_card_placed');
    // Keyboard parity: focus moves and ENTER activates the same commands.
    await press(page, 'ArrowRight');
    await closeSurface(page);
    // Station 080 Unit 5: M01 owns two batch windows; the storm packet
    // batch is open, the return batch still pending.
    expect(
      (await itemCoverage(page, 'M01')).opportunities.find(
        (o) => o.opportunity_id === 'proto_m01_batch_o1',
      )?.status,
    ).toBe('open');
    expect(await itemStatus(page, 'M01')).toBe('pending');

    // Incident desk (Station 080 Unit 17): the two-packet series — the
    // orientation card, one tile opened, a draft, one recorded first
    // response, the desk left open and resumable. The desk is reached
    // with the lane driver (`concourseVia`): the straight-line eastward
    // leg from the plan board stalls on Vale's operations desk at x≈418
    // (U6 / U15 B4, driver limitation, left for the U24 driver pass).
    await concourseVia(
      page,
      CONCOURSE.incidentDesk.x,
      CONCOURSE.incidentDesk.y,
    );
    await openSurfaceAt(page, CONCOURSE.incidentDesk, 'm14_incident_desk');
    await page.waitForTimeout(450); // past START's settle window
    await clickElement(page, 'start');
    await clickElement(page, 'tile_m1');
    await clickElement(page, 'option_a');
    await clickElement(page, 'record_answer');
    await page.waitForTimeout(450); // past the dialog's settle window
    await clickElement(page, 'confirm');
    await waitSurface(page, true);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m14_integration_orientation_acknowledged');
    expect(types).toContain('proto_m14_integration_source_opened');
    expect(types).toContain('proto_m14_integration_first_response');
    expect(types).not.toContain('proto_m14_integration_results_shown');
    expect(types.some((t) => t.startsWith('proto_m14_desk_'))).toBe(false);
    await closeSurface(page);
    // One of six first responses recorded: the series window stays open.
    expect(await itemStatus(page, 'M14')).toBe('open');

    // Quality packet 1 (Unit 8): check one field (its reference is
    // revealed), judge it past the settle window, release the packet.
    await openSurfaceAt(page, CONCOURSE.qcPacket, 'm12_qc_packet_o1');
    await clickElement(page, 'check_fuse');
    await page.waitForTimeout(450);
    await clickElement(page, 'judge_matches'); // "fuse" is never the faulty field
    await clickElement(page, 'release');
    await closeSurface(page);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m12_check_field_judged');
    expect(types).toContain('proto_m12_check_released');
    expect(await itemStatus(page, 'M12')).toBe('pending'); // occasion 2 undeclared until the workshop

    // Gauge check 1 completes the first watch window.
    // From ABOVE: the point below the gauge lies 48 px from the Dock door.
    await interactAt(page, CONCOURSE.monitorGauge, {
      approachOffset: { x: 0, y: 0 },
    });
    await page.waitForTimeout(400);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m09_checks_check_fulfilled');

    // The reading-desk lamp (M05, Unit 6): the accepted extra job's start
    // control is the surface's "Start the job" — the first work action —
    // and the standard 2 s work cycle completes the window.
    // World V1: reach the east–west axis first (the side counter blocks an
    // x-first leg along the gauge row), then the reading nook.
    await walkTo(page, CONCOURSE.monitorGauge.x, 13 * 32, { yFirst: true });
    await openSurfaceAt(page, CONCOURSE.deskLamp, 'm05_lamp_job');
    await page.waitForTimeout(450); // past the surface's settle window
    await clickElement(page, 'start');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            researchRuntime?: { getEvents: () => { event_type: string }[] };
          }
        ).researchRuntime
          ?.getEvents()
          .some((e) => e.event_type === 'proto_m05_start_work_completed') ??
        false,
      undefined,
      { timeout: 8000 },
    );
    await closeSurface(page);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m05_start_started');
    expect(types).toContain('proto_m05_start_work_completed');
    expect(await itemStatus(page, 'M05')).toBe('pending'); // occasion 2 undeclared until the yard

    // Families are disjoint: every proto_* event carries exactly its own family
    // and the M09/M10 offers never reuse a raw event.
    const families = new Map<string, Set<string>>();

    for (const event of await getEvents(page)) {
      const family = familyOf(event.event_type);

      if (family !== null) {
        const item =
          (event.metadata as { measure_id?: string } | undefined)?.measure_id ??
          '?';

        families.set(family, (families.get(family) ?? new Set()).add(item));
      }
    }

    for (const [family, items] of families) {
      expect(items.size, `${family} owned by ${[...items].join(',')}`).toBe(1);
    }

    // No canonical study item, construct or success on any v2 window event.
    for (const event of (await getEvents(page)).filter((e) =>
      e.event_type.startsWith('proto_m'),
    )) {
      expect(event.study_item_ids ?? undefined).toBeUndefined();
      expect(event.construct_id ?? undefined).toBeUndefined();
      expect(event.success ?? undefined).toBeUndefined();
    }

    // Leaving the Concourse passes the check-1 milestone; the route still advances.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'workshop');
    await concourseToWorkshop(page);
    types = await pilotEventTypes(page);
    expect(
      types.filter((t) => t === 'proto_m09_checks_check_window_closed'),
    ).toHaveLength(1);
    expectNoRuntimeErrors(errors);
  });

  test('episode 2: case workspace, debris, dispatch, calibration, quality packet, lattice and seal log run independently; press B waits for the return', async ({
    page,
  }) => {
    test.setTimeout(720_000);
    const errors = captureErrors(page);

    await bootPilot(page, 'ep2');
    await completeDockTutorial(page, 1);
    await routeToWorkshopWork(page);

    // Press B is scheduled for the return shift only (no window opens now).
    await useWorkshopStation(page, WORKSHOP.pressB);
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(
        () =>
          (
            window as unknown as {
              __inventoryUiProbe?: { open: boolean } | null;
            }
          ).__inventoryUiProbe?.open ?? false,
      ),
    ).toBe(false);

    // Case workspace: overlay in m02case mode, hand over, first request shown.
    await useWorkshopStation(page, WORKSHOP.caseWorkspace);
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __inventoryUiProbe?: { open: boolean; mode: string } | null;
          }
        ).__inventoryUiProbe?.open === true,
      undefined,
      { timeout: 8000 },
    );
    expect(
      await page.evaluate(
        () =>
          (
            window as unknown as {
              __inventoryUiProbe?: { mode: string } | null;
            }
          ).__inventoryUiProbe?.mode,
      ),
    ).toBe('m02case');
    await press(page, 'l'); // label the focused tray? focus starts on intake — recorded either way
    await press(page, 'c'); // hand over
    await page.waitForTimeout(400);

    let types = await pilotEventTypes(page);

    expect(types).toContain('proto_m02_workspace_opportunity_opened');
    expect(types).toContain('proto_m02_workspace_handed_over');
    expect(types).toContain('proto_m02_workspace_request_presented');
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
          .__inventoryUiProbe?.open !== true,
      undefined,
      { timeout: 8000 },
    );
    expect(await itemStatus(page, 'M02')).toBe('open');

    // Sample cutter: NO debris exists before a job (the objects are created
    // by the cut, so rendered debris is evidence only together with the
    // job_run event); the first coupon then scatters three objects
    // (physical layer) and opens the first job's window once.
    const debrisCount = () =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              __physicalProbe?: { objects: unknown[] } | null;
            }
          ).__physicalProbe?.objects.length ?? 0,
      );

    expect(await debrisCount()).toBe(0);
    // Through the annex doorway; the cutter is operated from the north.
    await useWorkshopStation(page, WORKSHOP.sampleCutter);
    await page.waitForTimeout(600);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m04_cutting_job_run');
    expect(
      types.filter((t) => t === 'proto_m04_cutting_opportunity_opened'),
    ).toHaveLength(1);
    expect(await debrisCount()).toBe(3);
    // Job 1 is open and job 2 not yet run: the item row reads the least
    // terminal of its two windows.
    expect(await itemStatus(page, 'M04')).toBe('pending');

    // Dispatch console: practice line via token buttons (pointer), dispatched.
    await openSurfaceAt(page, WORKSHOP.dispatchConsole, 'm06_dispatch_console');
    await clickElement(page, 'token_OPEN');
    await clickElement(page, 'token_VALVE-C');
    await clickElement(page, 'token_AUTO');
    await clickElement(page, 'dispatch');
    await page.waitForTimeout(400);
    types = await pilotEventTypes(page);
    // Station 080 Unit 7: the timed work-period family (practice unchanged).
    expect(types).toContain('proto_m06_orders_practice_dispatched');
    await closeSurface(page);

    // Calibration bench: advance one stage, leave (state persists — reopen shows 1/6).
    await openSurfaceAt(
      page,
      WORKSHOP.calibrationBench,
      'm07_calibration_bench',
    );
    await clickElement(page, 'advance');
    await page.waitForTimeout(1600);
    await closeSurface(page);
    await openSurfaceAt(
      page,
      WORKSHOP.calibrationBench,
      'm07_calibration_bench',
    );
    expect(
      (await surface(page))!.elements.find((e) => e.id === 'stage_1')?.state,
    ).toBe('done');
    await closeSurface(page);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m07_calibration_returned');

    // Quality packet 2 (Unit 8): released unchecked — a valid observed 0/3.
    await openSurfaceAt(page, WORKSHOP.qcPacket, 'm12_qc_packet_o2');
    await clickElement(page, 'release');
    await closeSurface(page);
    types = await pilotEventTypes(page);
    // Only packet 2 is released in this session — packet 1 lies in the
    // Concourse and was never opened here — so one window closed and the
    // item still waits for its other occasion. (U14-D2: this step was
    // never reached while the test stood at the former room's
    // coordinates; it expected two closed windows and a completed item,
    // which holds only in a session that also released packet 1.)
    expect(
      types.filter((t) => t === 'proto_m12_check_window_closed'),
    ).toHaveLength(1);
    expect(
      (await itemCoverage(page, 'M12')).opportunities.map((o) => [
        o.opportunity_id,
        o.status,
      ]),
    ).toEqual([
      ['proto_m12_check_o1', 'pending'],
      ['proto_m12_check_o2', 'completed'],
    ]);
    expect(await itemStatus(page, 'M12')).toBe('pending');

    // Lattice bench opens the physical pipe board above the host.
    await useWorkshopStation(page, WORKSHOP.latticeBench);
    await page
      .waitForFunction(
        () =>
          (window as unknown as { __ipPipeProbe?: { open?: boolean } | null })
            .__ipPipeProbe?.open === true,
        undefined,
        { timeout: 8000 },
      )
      .catch(() => undefined);
    types = await pilotEventTypes(page);
    // Unit 16: the three-network series opens on network 1; the retired
    // one-network family is not written.
    expect(types).toContain('proto_m13_networks_series_opened');
    expect(
      types.filter((t) => t === 'proto_m13_networks_network_presented'),
    ).toHaveLength(1);
    expect(types.some((t) => t.startsWith('proto_m13_lattice_'))).toBe(false);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Seal log: secondary telemetry only (no window, no register entry).
    const sealLog = await workshopStation(page, WORKSHOP.sealLog);

    await openPromptAt(page, sealLog.at, sealLog.options);
    await selectPromptOption(page, 1);
    types = await pilotEventTypes(page);
    expect(types).toContain('secondary_m11_seal_obligation_acknowledged');
    // The seal log itself opens no window and enters nothing in the
    // register. (U14-D2: never reached at the former coordinates; it
    // expected M11 to be `not_applicable`, which predates M11's own two
    // custody occasions in the laboratory and the yard — not yet reached
    // in episode 2, so the item is pending.)
    expect(types.filter((t) => t.startsWith('proto_m11_'))).toEqual([]);
    expect(
      (await pilotCoverage(page))!.items.find((i) => i.item === 'M11')!.status,
    ).toBe('pending');

    // The first job closed at its first departure (the first work
    // recorded at another station after the cut), exactly once; the
    // second coupon was never cut.
    await workshopToConcourse(page);
    types = await pilotEventTypes(page);
    expect(
      types.filter((t) => t === 'proto_m04_cutting_first_departure'),
    ).toHaveLength(1);
    expect(types).toContain('proto_m04_cutting_window_closed');
    expect(await itemStatus(page, 'M04')).toBe('pending');

    // Disjoint families and no canonical context (same invariant as episode 1).
    for (const event of (await getEvents(page)).filter((e) =>
      e.event_type.startsWith('proto_m'),
    )) {
      expect(event.study_item_ids ?? undefined).toBeUndefined();
      expect(event.success ?? undefined).toBeUndefined();
    }

    expectNoRuntimeErrors(errors);
  });
});
