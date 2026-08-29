/**
 * Pilot route — Records Workshop evidence windows (evidence-led pilot v2,
 * Unit 2 closure). REWRITTEN around the M02 open case workspace.
 *
 * The v1 "file sheets into the correct folder" workstation (an answer-key
 * task) is gone from the participant route. M02 is now an OPEN workspace:
 * the participant organises six heterogeneous cases across four trays with
 * optional self-chosen labels, hands the workspace over, then retrieves two
 * counterbalanced cases from wherever they put them. Nothing here compares
 * the layout to a designer-preferred arrangement — every raw component is
 * defined against the participant's OWN labels (misfile = a case in a tray
 * whose chosen label names a different kind; untraceable = a case in an
 * unlabelled tray) or against functional retrieval.
 *
 * Real keyboard/pointer input against DEV probes. Proves: organisation and
 * retrieval record raw organisation/retrieval components only; the two
 * window ids (workspace / retrieval) are stamped correctly; the M02 family
 * never touches M03/M04/M06/M07/M12/M13; abandonment keeps the window open
 * and the route still advances; the two M03 press occasions are distinct
 * registered opportunities (A on the restoration shift, B refused until the
 * return); ordinary inventory play emits secondary telemetry only.
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
  expectStage,
  interactAt,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotEventTypes,
  press,
  routeToWorkshopWork,
  useDoor,
  walkTo,
  workshopToConcourse,
} from './pilotHelpers';

interface ProbeSlot {
  container_id: string;
  slot_index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  definition_id: string | null;
  quantity: number;
  code: string | null;
}

interface UiProbe {
  open: boolean;
  mode: string;
  focus: { container_id: string; slot_index: number } | null;
  slots: ProbeSlot[];
  buttons: {
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    enabled: boolean;
  }[];
}

interface RegisterRecord {
  opportunity_id: string;
  owner: string;
  entered: boolean;
  completed: boolean;
  invalid_reason: string | null;
  form?: string | null;
}

const TRAY = (n: number) => `m02c_tray_${n}`;
const DESK = 'm02c_desk';
const M02_FAMILY = 'proto_m02_case_';
const OTHER_WORKSHOP_FAMILIES = [
  'proto_m03_',
  'proto_m04_',
  'proto_m06_',
  'proto_m07_',
  'proto_m12_',
  'proto_m13_',
];

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
    { timeout: 8000 },
  );
  await page.waitForTimeout(200);
}

async function gamePoint(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();

  if (box === null) {
    throw new Error('canvas not found');
  }

  return {
    x: box.x + (x * box.width) / 800,
    y: box.y + (y * box.height) / 600,
  };
}

function slotBy(
  probe: UiProbe,
  containerId: string,
  predicate: (slot: ProbeSlot) => boolean,
) {
  const slot = probe.slots.find(
    (s) => s.container_id === containerId && predicate(s),
  );

  if (slot === undefined) {
    throw new Error(`no slot in ${containerId}`);
  }

  return slot;
}

function slotOfCase(probe: UiProbe, definitionId: string) {
  const slot = probe.slots.find((s) => s.definition_id === definitionId);

  if (slot === undefined) {
    throw new Error(`case ${definitionId} not on any surface`);
  }

  return slot;
}

async function dragSlot(page: Page, from: ProbeSlot, to: ProbeSlot) {
  const a = await gamePoint(page, from.x + from.w / 2, from.y + from.h / 2);
  const b = await gamePoint(page, to.x + to.w / 2, to.y + to.h / 2);

  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 10, a.y + 10, { steps: 3 });
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function clickSlot(page: Page, slot: ProbeSlot) {
  const point = await gamePoint(page, slot.x + slot.w / 2, slot.y + slot.h / 2);

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(260);
}

async function clickButton(page: Page, id: string) {
  const probe = (await uiProbe(page))!;
  const button = probe.buttons.find((b) => b.id === id);

  if (button === undefined) {
    throw new Error(`button ${id} not in probe`);
  }

  const point = await gamePoint(
    page,
    button.x + button.w / 2,
    button.y + button.h / 2,
  );

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(260);
}

function playerSlotBy(probe: UiProbe, predicate: (slot: ProbeSlot) => boolean) {
  const slot = probe.slots.find(
    (s) =>
      (s.container_id === 'player_hotbar' ||
        s.container_id === 'player_backpack') &&
      predicate(s),
  );

  if (slot === undefined) {
    throw new Error('no matching player slot');
  }

  return slot;
}

function playerItemCount(probe: UiProbe): number {
  return probe.slots
    .filter(
      (s) =>
        s.container_id === 'player_hotbar' ||
        s.container_id === 'player_backpack',
    )
    .reduce((sum, s) => sum + s.quantity, 0);
}

async function register(page: Page): Promise<RegisterRecord[]> {
  return page.evaluate(
    () =>
      (window as unknown as { __measurementValidity?: RegisterRecord[] })
        .__measurementValidity ?? [],
  );
}

async function m02Events(page: Page) {
  return (await getEvents(page)).filter((e) =>
    e.event_type.startsWith(M02_FAMILY),
  );
}

function metadataOf(event: { metadata?: unknown }) {
  return (event.metadata ?? {}) as Record<string, unknown>;
}

/** Dock -> Concourse (Vale's handover beats) -> Records Workshop at stage workshop_work. */
async function enterWorkshop(page: Page, tag: string) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await routeToWorkshopWork(page);
}

async function openCaseWorkspace(page: Page) {
  await interactAt(page, PILOT.workshop.filingDesk, {
    approachOffset: { x: 0, y: 44 },
  });
  await waitOverlay(page, true);

  const probe = (await uiProbe(page))!;

  expect(probe.mode).toBe('m02case');

  return probe;
}

test.describe('pilot route — Records Workshop evidence windows (v2 Unit 2)', () => {
  test("M02 open workspace: free organisation, functional retrieval, raw components against the participant's own labels, independent of every other workshop family", async ({
    page,
  }) => {
    test.setTimeout(480_000);
    const errors = captureErrors(page);

    await enterWorkshop(page, 'm02');

    let probe = await openCaseWorkspace(page);

    // Entry state: six cases on the intake tray, four empty 2×2 trays, no
    // sort/answer buttons — labels are the participant's own choice.
    expect(
      probe.slots.filter((s) => s.container_id === DESK && s.definition_id),
    ).toHaveLength(6);

    for (let n = 1; n <= 4; n += 1) {
      const slots = probe.slots.filter((s) => s.container_id === TRAY(n));

      expect(slots).toHaveLength(4);
      expect(slots.every((s) => s.definition_id === null)).toBe(true);
    }

    expect(probe.buttons.map((b) => b.id)).toEqual(
      expect.arrayContaining([
        'm02c_label_1',
        'm02c_label_2',
        'm02c_label_3',
        'm02c_label_4',
        'm02c_handover',
      ]),
    );
    expect(probe.buttons.some((b) => /sort|answer|check/i.test(b.id))).toBe(
      false,
    );

    let types = await pilotEventTypes(page);

    expect(types).toContain('proto_m02_case_opportunity_opened');

    // Organise by pointer: an own schema that is deliberately imperfect.
    //   tray 1  S-14 + I-22   (label SAMPLES → I-22 misfiled by OWN label)
    //   tray 2  R-07          (label REPAIRS)
    //   tray 3  K-03          (no label → untraceable)
    //   tray 4  empty         (label SAMPLES again → duplicate)
    //   intake  S-15, R-09    (left on intake)
    const moves: [string, number, number][] = [
      ['m02c_case_s14', 1, 0],
      ['m02c_case_i22', 1, 1],
      ['m02c_case_r07', 2, 0],
      ['m02c_case_k03', 3, 0],
    ];

    for (const [caseId, tray, index] of moves) {
      probe = (await uiProbe(page))!;
      await dragSlot(
        page,
        slotOfCase(probe, caseId),
        slotBy(probe, TRAY(tray), (s) => s.slot_index === index),
      );
    }

    probe = (await uiProbe(page))!;
    expect(slotOfCase(probe, 'm02c_case_i22').container_id).toBe(TRAY(1));
    expect(slotOfCase(probe, 'm02c_case_k03').container_id).toBe(TRAY(3));
    expect(slotOfCase(probe, 'm02c_case_s15').container_id).toBe(DESK);

    // Labels: pointer on trays 1 and 2, keyboard (L on the focused tray) on
    // tray 4 — the same semantic act by either input mode.
    await clickButton(page, 'm02c_label_1'); // SAMPLES
    await clickButton(page, 'm02c_label_2'); // SAMPLES
    await clickButton(page, 'm02c_label_2'); // REPAIRS
    probe = (await uiProbe(page))!;
    await clickSlot(
      page,
      slotBy(probe, TRAY(4), (s) => s.slot_index === 0),
    );
    probe = (await uiProbe(page))!;
    expect(probe.focus?.container_id).toBe(TRAY(4));
    await press(page, 'l'); // SAMPLES (duplicate of tray 1)
    probe = (await uiProbe(page))!;
    expect(probe.buttons.find((b) => b.id === 'm02c_label_1')?.label).toBe(
      'LABEL: SAMPLES',
    );
    expect(probe.buttons.find((b) => b.id === 'm02c_label_2')?.label).toBe(
      'LABEL: REPAIRS',
    );
    expect(probe.buttons.find((b) => b.id === 'm02c_label_3')?.label).toBe(
      'LABEL: none',
    );
    expect(probe.buttons.find((b) => b.id === 'm02c_label_4')?.label).toBe(
      'LABEL: SAMPLES',
    );

    // HAND OVER (pointer) commits the workspace as it is.
    await clickButton(page, 'm02c_handover');
    await page.waitForTimeout(300);

    let events = await m02Events(page);
    const committed = events.find(
      (e) => e.event_type === 'proto_m02_case_workspace_committed',
    );

    expect(committed).toBeDefined();

    const commitMeta = metadataOf(committed!);

    expect(commitMeta.window_id).toBe('m02_workspace_w1');
    expect(commitMeta.opportunity_id).toBe('proto_m02_case_workspace');
    expect(commitMeta.tray_labels).toEqual({
      [TRAY(1)]: 'SAMPLES',
      [TRAY(2)]: 'REPAIRS',
      [TRAY(3)]: null,
      [TRAY(4)]: 'SAMPLES',
    });
    expect(commitMeta.misfile_count).toBe(1); // I-22 under the OWN label SAMPLES
    expect(commitMeta.untraceable_case_count).toBe(1); // K-03 in the unlabelled tray
    expect(commitMeta.duplicate_count).toBe(1); // SAMPLES used twice
    expect(commitMeta.cases_left_on_intake).toBe(2);
    expect(commitMeta.move_count).toBe(4);
    expect(commitMeta.label_changes).toBe(4);
    expect(commitMeta.case_location_at_close).toMatchObject({
      m02c_case_i22: { container: TRAY(1), label: 'SAMPLES', kind: 'incident' },
      m02c_case_k03: { container: TRAY(3), label: null, kind: 'supply' },
    });
    // No designer key anywhere: the v1 answer-key fields do not exist and
    // no field compares the layout to an expected arrangement.
    for (const key of Object.keys(commitMeta)) {
      expect(key).not.toMatch(
        /misfiled_count|unfiled|expected|designer|target/,
      );
    }

    // Retrieval: the requested case is read from the probe event (fixed by
    // form, never by the layout); one wrong pick, then the correct slot;
    // the second probe is answered directly. Retrieval events carry the
    // retrieval window id.
    for (let probeIndex = 0; probeIndex < 2; probeIndex += 1) {
      events = await m02Events(page);

      const requested = events
        .filter((e) => e.event_type === 'proto_m02_case_retrieval_requested')
        .map((e) => metadataOf(e))
        .find((m) => m.probe_index === probeIndex);

      expect(requested).toBeDefined();
      expect(requested!.window_id).toBe('m02_retrieval_w1');

      const requestedCase = requested!.requested_case as string;

      probe = (await uiProbe(page))!;

      if (probeIndex === 0) {
        const wrong = probe.slots.find(
          (s) => s.definition_id !== null && s.definition_id !== requestedCase,
        )!;

        await clickSlot(page, wrong);
        probe = (await uiProbe(page))!;
      }

      await clickSlot(page, slotOfCase(probe, requestedCase));
    }

    await page.waitForTimeout(300);
    events = await m02Events(page);

    const closed = events.find(
      (e) => e.event_type === 'proto_m02_case_window_closed',
    );

    expect(closed).toBeDefined();

    const raw = metadataOf(closed!).raw_components as Record<string, unknown>;

    expect(metadataOf(closed!).exit_state).toBe('completed');
    expect(raw.retrieval_actions).toBe(3);
    expect(raw.retrieval_errors).toBe(1);
    expect(raw.retrieval_success).toBe(2);
    expect(raw.retrievals).toHaveLength(3);
    expect((raw.retrieval_route as string[]).length).toBeGreaterThan(0);
    expect(raw.misfile_count).toBe(1);
    expect(raw.untraceable_case_count).toBe(1);

    const picks = events.filter(
      (e) => e.event_type === 'proto_m02_case_retrieval_pick',
    );

    expect(picks.map((e) => metadataOf(e).correct)).toEqual([
      false,
      true,
      true,
    ]);

    // Every M02 event: one opportunity, a recorded form = counterbalance,
    // no canonical study item / construct / success.
    const forms = new Set<string>();

    for (const event of events) {
      const m = metadataOf(event);

      expect(m.measure_id).toBe('M02');
      expect(m.opportunity_id).toBe('proto_m02_case_workspace');
      expect(['form_a', 'form_b']).toContain(m.form);
      expect(m.counterbalance).toBe(m.form);
      forms.add(m.form as string);
      expect(event.study_item_ids ?? undefined).toBeUndefined();
      expect(event.construct_id ?? undefined).toBeUndefined();
      expect(event.success ?? undefined).toBeUndefined();
    }

    expect(forms.size).toBe(1);

    // Independence: nothing the workspace did touched another workshop
    // family, and no other family fired during the whole M02 flow.
    types = await pilotEventTypes(page);

    for (const family of OTHER_WORKSHOP_FAMILIES) {
      expect(
        types.filter((t) => t.startsWith(family)),
        `${family} events during the M02 flow`,
      ).toEqual([]);
    }

    await page.keyboard.press('Escape');
    await waitOverlay(page, false);
    expect(
      (await pilotCoverage(page))!.items.find((i) => i.item === 'M02')?.status,
    ).toBe('completed');
    expect(
      (await register(page)).find(
        (r) => r.opportunity_id === 'proto_m02_case_workspace',
      ),
    ).toMatchObject({ owner: 'M02', entered: true, completed: true });
    expectNoRuntimeErrors(errors);
  });

  test('M02 abandonment fail-forward: closing without hand-over keeps the window open, reopening resumes the same workspace, the board sign-off still advances', async ({
    page,
  }) => {
    test.setTimeout(420_000);
    const errors = captureErrors(page);

    await enterWorkshop(page, 'm02ab');

    let probe = await openCaseWorkspace(page);

    await dragSlot(
      page,
      slotOfCase(probe, 'm02c_case_r09'),
      slotBy(probe, TRAY(2), (s) => s.slot_index === 0),
    );
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    let events = await m02Events(page);
    const abandoned = events.find(
      (e) => e.event_type === 'proto_m02_case_panel_closed_without_handover',
    );

    expect(abandoned).toBeDefined();
    expect(metadataOf(abandoned!).phase).toBe('organise');
    expect(metadataOf(abandoned!).cases_left_on_intake).toBe(5);
    expect(
      events.some((e) => e.event_type === 'proto_m02_case_workspace_committed'),
    ).toBe(false);
    expect(
      events.some((e) => e.event_type === 'proto_m02_case_window_closed'),
    ).toBe(false);
    expect(
      (await pilotCoverage(page))!.items.find((i) => i.item === 'M02')?.status,
    ).toBe('open');

    // Reopen: the same workspace (no re-seed, no reset), recorded as a
    // panel reopen, and the earlier move persists.
    probe = await openCaseWorkspace(page);
    expect(slotOfCase(probe, 'm02c_case_r09').container_id).toBe(TRAY(2));
    events = await m02Events(page);
    expect(
      events.filter(
        (e) => e.event_type === 'proto_m02_case_opportunity_opened',
      ),
    ).toHaveLength(1);
    expect(
      events.some((e) => e.event_type === 'proto_m02_case_panel_reopened'),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    // The board lets the participant sign off regardless (no performance
    // gate); the window stays open and the review never names it as
    // never-entered.
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: 0, y: 44 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'lab_briefing');

    const coverage = (await pilotCoverage(page))!;

    expect(coverage.items.find((i) => i.item === 'M02')?.status).toBe('open');
    expect(coverage.summary.neverEnteredLabels.join(' ')).not.toMatch(
      /case workspace/i,
    );
    expectNoRuntimeErrors(errors);
  });

  test('M03 occasions stay distinct: press A runs on the restoration shift under its own ids; press B refuses until the return; both are separately registered', async ({
    page,
  }) => {
    test.setTimeout(420_000);
    const errors = captureErrors(page);

    await enterWorkshop(page, 'm03');

    // Both occasions are declared + offered on entry, neither entered.
    let records = await register(page);

    expect(
      records
        .filter((r) => r.opportunity_id.startsWith('proto_m03_reset_'))
        .map((r) => r.opportunity_id)
        .sort(),
    ).toEqual(['proto_m03_reset_a', 'proto_m03_reset_b']);

    // Press A — keyboard path: C runs the press cycle; the third cycle
    // opens the window; closing the panel is the departure observation.
    await interactAt(page, PILOT.workshop.pressA, {
      approachOffset: { x: 0, y: 44 },
    });
    await waitOverlay(page, true);
    expect((await uiProbe(page))!.mode).toBe('m03');

    for (let cycle = 0; cycle < 3; cycle += 1) {
      await page.keyboard.press('c');
      await page.waitForTimeout(900);
    }

    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    const m03 = (await getEvents(page)).filter((e) =>
      e.event_type.startsWith('proto_m03_'),
    );

    expect(m03.map((e) => e.event_type)).toEqual(
      expect.arrayContaining([
        'proto_m03_press_cycle',
        'proto_m03_opportunity_opened',
        'proto_m03_surface_state_at_departure',
        'proto_m03_window_closed',
      ]),
    );

    for (const event of m03) {
      const m = metadataOf(event);

      expect(m.opportunity_id).toBe('proto_m03_reset_a');
      // Ledger window id (Unit 5 aligned the module to sheet 09).
      expect(m.window_id).toBe('m03_reset_o1');
      expect(m.occasion).toBe('o1');
      expect(event.object_id).toBe('m03_press_bench_a');
      expect(event.study_item_ids ?? undefined).toBeUndefined();
      expect(event.success ?? undefined).toBeUndefined();
    }

    // Press B is scheduled for the return shift: no window, no B event.
    await interactAt(page, PILOT.workshop.pressB, {
      approachOffset: { x: 0, y: 44 },
    });
    await page.waitForTimeout(500);
    expect((await uiProbe(page))?.open ?? false).toBe(false);
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __lastRoomFeedbackText?: string | null })
            .__lastRoomFeedbackText ?? null,
      ),
    ).toMatch(/No batch scheduled/);
    expect(
      (await pilotEventTypes(page)).filter((t) => t.startsWith('proto_m03_')),
    ).toHaveLength(m03.length);

    // Register: A completed, B still offered-only (distinct records, one
    // owner, identical fixed starting condition recorded as the form).
    records = await register(page);

    const a = records.find((r) => r.opportunity_id === 'proto_m03_reset_a')!;
    const b = records.find((r) => r.opportunity_id === 'proto_m03_reset_b')!;

    expect(a).toMatchObject({ owner: 'M03', entered: true, completed: true });
    expect(b).toMatchObject({ owner: 'M03', entered: false, completed: false });
    expect(a.form).toBe(b.form);
    expectNoRuntimeErrors(errors);
  });

  test('supply bundles: pickup, locker transfer and assembly conserve items, emit secondary telemetry only, and survive a scene transition', async ({
    page,
  }) => {
    test.setTimeout(420_000);
    const errors = captureErrors(page);

    await enterWorkshop(page, 'inv');

    // Collect the component bundle (SPACE with no station in range):
    // west along the y=272 lane, then north up the clear x=96 column.
    await walkTo(page, 96, 112, { yFirst: false });

    const bundleProbe = await page.evaluate(
      () =>
        (
          window as unknown as {
            __pilotBundles?: { count: number; nearest: string | null } | null;
          }
        ).__pilotBundles ?? null,
    );

    expect(bundleProbe?.nearest).toBe('Component bundle');
    await press(page, 'Space');
    await page.waitForTimeout(400);

    let types = await pilotEventTypes(page);

    expect(types).toContain('secondary_inventory_world_pickup');

    // I opens the backpack; player holds 2 fuse contacts + 1 housing.
    await press(page, 'i');
    await waitOverlay(page, true);

    let probe = (await uiProbe(page))!;

    expect(playerItemCount(probe)).toBe(3);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    // Assembly bench: move both stacks into the workbench input, assemble.
    await openPromptAt(page, PILOT.workshop.assemblyBench, {
      approachOffset: { x: 0, y: 44 },
    }).catch(() => undefined);
    await waitOverlay(page, true);
    probe = (await uiProbe(page))!;
    expect(probe.mode).toBe('workbench');

    const fuse = playerSlotBy(probe, (s) => s.definition_id === 'fuse_contact');
    const input0 = slotBy(probe, 'workbench_input', (s) => s.slot_index === 0);

    await dragSlot(page, fuse, input0);
    probe = (await uiProbe(page))!;

    const housing = playerSlotBy(
      probe,
      (s) => s.definition_id === 'relay_housing',
    );
    const input1 = slotBy(probe, 'workbench_input', (s) => s.slot_index === 1);

    await dragSlot(page, housing, input1);
    await clickButton(page, 'assemble');
    probe = (await uiProbe(page))!;

    const output = slotBy(probe, 'workbench_output', () => true);

    expect(output.definition_id).toBe('fused_relay_cartridge');
    expect(output.quantity).toBe(1);
    // Conservation: 3 inputs consumed exactly by the recipe → 1 cartridge.
    expect(playerItemCount(probe)).toBe(0);

    // Take the cartridge back (shift-click quick transfer) and close.
    const outPoint = await gamePoint(
      page,
      output.x + output.w / 2,
      output.y + output.h / 2,
    );

    await page.keyboard.down('Shift');
    await page.mouse.click(outPoint.x, outPoint.y);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(260);
    probe = (await uiProbe(page))!;
    expect(playerItemCount(probe)).toBe(1);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    // Locker transfer: put the cartridge into the Component Locker.
    await openPromptAt(page, PILOT.workshop.storageLocker, {
      approachOffset: { x: 0, y: 44 },
    }).catch(() => undefined);
    await waitOverlay(page, true);
    probe = (await uiProbe(page))!;
    expect(probe.mode).toBe('container');

    const cartridge = playerSlotBy(
      probe,
      (s) => s.definition_id === 'fused_relay_cartridge',
    );
    const emptyLocker = slotBy(
      probe,
      'lab_storage',
      (s) => s.definition_id === null,
    );

    await dragSlot(page, cartridge, emptyLocker);
    probe = (await uiProbe(page))!;
    expect(playerItemCount(probe)).toBe(0);
    expect(
      probe.slots.filter(
        (s) =>
          s.container_id === 'lab_storage' &&
          s.definition_id === 'fused_relay_cartridge',
      ),
    ).toHaveLength(1);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    // Pick up the sample kit, then cross into the laboratory and back: the
    // hotbar survives the transition (store is session scope).
    await walkTo(page, 60, 112);
    await walkTo(page, 176, 112);
    await press(page, 'Space');
    await page.waitForTimeout(400);
    await workshopToConcourse(page);
    await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: 20 },
    });
    await press(page, 'i');
    await waitOverlay(page, true);
    probe = (await uiProbe(page))!;
    expect(playerItemCount(probe)).toBe(2);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    // Ordinary inventory never touches a measurement family.
    types = await pilotEventTypes(page);
    expect(types.filter((t) => t.startsWith('proto_m0'))).toEqual([]);
    expect(types).toContain('secondary_inventory_commit_recipe');
    expectNoRuntimeErrors(errors);
  });
});
