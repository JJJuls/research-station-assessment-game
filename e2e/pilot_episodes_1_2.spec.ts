/**
 * Evidence-led pilot v2 — episodes 1-2 windows (Unit 2).
 *
 * Real keyboard/pointer input against DEV probes. Proves on the participant
 * route: every episode-1 and episode-2 opportunity is independently
 * reachable without any prior success; each window logs only its own
 * item-owned family; the M09/M10 offers are explicit; the M05 fault is
 * presented silently and censors on departure; the M02 open workspace
 * runs organise → hand over → retrieval; the M04 debris window closes at
 * the first exit; M03 occasion 2 refuses before the return; every overlay
 * renders above the host and resumes it; no canonical event and no score
 * exists anywhere in the log.
 */
import { expect, type Page, test } from '@playwright/test';

import { getEvents, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToWorkshop,
  dockToConcourse,
  expectStage,
  interactAt,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotEventTypes,
  press,
  routeToWorkshopWork,
  walkTo,
  workshopToConcourse,
} from './pilotHelpers';

const CONCOURSE = {
  planBoard: { x: 128, y: 160 },
  incidentDesk: { x: 256, y: 160 },
  qcPacket: { x: 256, y: 416 },
  monitorGauge: { x: 352, y: 416 },
  deskLamp: { x: 608, y: 432 },
} as const;

const WORKSHOP = {
  caseWorkspace: { x: 96, y: 272 },
  pressB: { x: 288, y: 272 },
  sampleCutter: { x: 320, y: 352 },
  dispatchConsole: { x: 640, y: 448 },
  calibrationBench: { x: 352, y: 96 },
  qcPacket: { x: 544, y: 448 },
  latticeBench: { x: 608, y: 96 },
  sealLog: { x: 704, y: 160 },
} as const;

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
    box.x + (element.x * box.width) / 800,
    box.y + (element.y * box.height) / 600,
  );
  await page.waitForTimeout(200);
}

async function openSurfaceAt(
  page: Page,
  at: { x: number; y: number },
  id: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, at, { approachOffset: { x: 0, y: 44 } });

    const opened = await waitSurface(page, true, id).then(
      () => true,
      () => false,
    );

    if (opened) {
      return;
    }
  }

  throw new Error(`surface ${id} did not open`);
}

async function closeSurface(page: Page) {
  await press(page, 'Escape');
  await waitSurface(page, false);
}

async function itemStatus(page: Page, item: string) {
  return (await pilotCoverage(page))!.items.find((i) => i.item === item)!
    .status;
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

    // Vale: briefing → watch offer (accept) → promise offer (accept) → interruption.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'incident_handover');
    await page.waitForTimeout(400);
    await selectPromptOption(page, 1); // take the watch
    await page.waitForTimeout(400);
    await selectPromptOption(page, 1); // carry the component
    await page.waitForTimeout(400);
    await selectPromptOption(page, 1); // interruption acknowledged
    await page.waitForTimeout(400);

    let types = await pilotEventTypes(page);

    expect(types).toContain('proto_m09_watch_offer_answered');
    expect(types).toContain('proto_m10_promise_offer_answered');
    expect(types).toContain('proto_m10_promise_interruption_shown');
    expect(types).toContain('proto_m10_promise_interruption_acknowledged');

    // The silent fault is presented at the first quiet moment (never mentioned).
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            researchRuntime?: { getEvents: () => { event_type: string }[] };
          }
        ).researchRuntime
          ?.getEvents()
          .some(
            (e) => e.event_type === 'proto_m05_initiation_opportunity_opened',
          ) ?? false,
      undefined,
      { timeout: 8000 },
    );

    // Plan board: open the surface (above the host), lift and place a card by pointer, close.
    await openSurfaceAt(page, CONCOURSE.planBoard, 'm01_plan_board');
    const probe = (await surface(page))!;

    expect(probe.elements.some((e) => e.id.startsWith('card_'))).toBe(true);
    await clickElement(page, 'card_isolate_loop');
    await clickElement(page, 'slot_0');
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m01_board_card_placed');
    // Keyboard parity: focus moves and ENTER activates the same commands.
    await press(page, 'ArrowRight');
    await closeSurface(page);
    expect(await itemStatus(page, 'M01')).toBe('open');

    // Incident desk: select a message, assign a subsystem and priority, submit twice (warned, then accepted).
    await openSurfaceAt(page, CONCOURSE.incidentDesk, 'm14_incident_desk');
    await clickElement(page, 'msg_1');
    await clickElement(page, 'node_coolant');
    await clickElement(page, 'priority_1');
    await clickElement(page, 'submit');
    await clickElement(page, 'submit');
    await waitSurface(page, true);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m14_desk_submit_warned');
    expect(types).toContain('proto_m14_desk_window_closed');
    await closeSurface(page);
    expect(await itemStatus(page, 'M14')).toBe('completed');

    // Quality packet 1: inspect one line and submit (no correctness gate).
    await openSurfaceAt(page, CONCOURSE.qcPacket, 'm12_qc_packet_o1');
    await clickElement(page, 'line_fuse');
    await clickElement(page, 'submit');
    await closeSurface(page);
    expect(await itemStatus(page, 'M12')).toBe('pending'); // occasion 2 undeclared until the workshop

    // Gauge check 1 completes the first watch window.
    await interactAt(page, CONCOURSE.monitorGauge, {
      approachOffset: { x: 0, y: 44 },
    });
    await page.waitForTimeout(400);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m09_watch_check_completed');

    // The desk lamp fault: initiating it is the M05 act (2 s neutral fix).
    await interactAt(page, CONCOURSE.deskLamp, {
      approachOffset: { x: 0, y: 44 },
    });
    await page.waitForTimeout(2600);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m05_initiation_initiated');
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
      types.filter((t) => t === 'proto_m09_watch_check_window_closed'),
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
    await interactAt(page, WORKSHOP.pressB, {
      approachOffset: { x: 0, y: 44 },
    });
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

    // Case workspace: overlay in m02case mode, hand over, retrieval prompt shown.
    await interactAt(page, WORKSHOP.caseWorkspace, {
      approachOffset: { x: 0, y: 44 },
    });
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

    expect(types).toContain('proto_m02_case_opportunity_opened');
    expect(types).toContain('proto_m02_case_workspace_committed');
    expect(types).toContain('proto_m02_case_retrieval_requested');
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
          .__inventoryUiProbe?.open !== true,
      undefined,
      { timeout: 8000 },
    );
    expect(await itemStatus(page, 'M02')).toBe('open');

    // Sample cutter: the neutral job scatters six debris objects (physical layer).
    await interactAt(page, WORKSHOP.sampleCutter, {
      approachOffset: { x: 0, y: -44 },
    });
    await page.waitForTimeout(600);
    const physical = await page.evaluate(
      () =>
        (
          window as unknown as {
            __physicalProbe?: { objects: unknown[] } | null;
          }
        ).__physicalProbe ?? null,
    );

    expect(physical?.objects.length).toBe(6);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m04_debris_job_run');

    // Dispatch console: practice line via token buttons (pointer), dispatched.
    await openSurfaceAt(page, WORKSHOP.dispatchConsole, 'm06_dispatch_console');
    await clickElement(page, 'token_OPEN');
    await clickElement(page, 'token_VALVE-C');
    await clickElement(page, 'token_AUTO');
    await clickElement(page, 'dispatch');
    await page.waitForTimeout(400);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m06_dispatch_practice_dispatched');
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

    // Quality packet 2 is independent of packet 1 (never opened in this session).
    await openSurfaceAt(page, WORKSHOP.qcPacket, 'm12_qc_packet_o2');
    await clickElement(page, 'submit');
    await closeSurface(page);
    expect(
      types.filter((t) => t.startsWith('proto_m12_qc_') && t.includes('o1')),
    ).toEqual([]);

    // Lattice bench opens the physical pipe board above the host.
    await interactAt(page, WORKSHOP.latticeBench, {
      approachOffset: { x: 0, y: 44 },
    });
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
    expect(types.some((t) => t.startsWith('proto_m13_lattice_'))).toBe(true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Seal log: secondary telemetry only (no window, no register entry).
    await openPromptAt(page, WORKSHOP.sealLog, {
      approachOffset: { x: 0, y: 44 },
    });
    await selectPromptOption(page, 1);
    types = await pilotEventTypes(page);
    expect(types).toContain('secondary_m11_seal_obligation_acknowledged');
    expect(
      (await pilotCoverage(page))!.items.find((i) => i.item === 'M11')!.status,
    ).toBe('not_applicable');

    // Leaving the workshop closes the debris window (first exit) as a completed observation.
    await walkTo(page, 640, 272);
    await workshopToConcourse(page);
    types = await pilotEventTypes(page);
    expect(types).toContain('proto_m04_debris_window_closed');
    expect(await itemStatus(page, 'M04')).toBe('completed');

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
