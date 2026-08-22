/**
 * Pilot route — Records & Logistics integration (Unit 3).
 *
 * Real input + DEV probes. Asserts on the participant route (Dock →
 * Concourse): the filing workstation opens the M02 overlay and a commit
 * records its own family with the opportunity id; the press stations run
 * M03 occasions A (pointer) and B (keyboard parity) and close as completed;
 * supply bundles are recoverable world items whose pickup, locker transfer
 * and assembly conserve items and emit only secondary telemetry; the
 * inventory survives a scene transition; the coverage registry reflects
 * completed / open windows; and abandonment (close without commit) keeps
 * the window open while the route still advances (fail-forward).
 */
import { expect, test } from '@playwright/test';

import { getEvents, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotEventTypes,
  pilotProbe,
  press,
  useDoor,
  walkTo,
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

async function uiProbe(
  page: import('@playwright/test').Page,
): Promise<UiProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __inventoryUiProbe?: UiProbe | null })
        .__inventoryUiProbe ?? null,
  );
}

async function waitOverlay(
  page: import('@playwright/test').Page,
  open: boolean,
) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open ?? false) === expected,
    open,
    { timeout: 8000 },
  );
  await page.waitForTimeout(200);
}

async function gamePoint(
  page: import('@playwright/test').Page,
  x: number,
  y: number,
) {
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

async function dragSlot(
  page: import('@playwright/test').Page,
  from: ProbeSlot,
  to: ProbeSlot,
) {
  const a = await gamePoint(page, from.x + from.w / 2, from.y + from.h / 2);
  const b = await gamePoint(page, to.x + to.w / 2, to.y + to.h / 2);

  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 10, a.y + 10, { steps: 3 });
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function clickButton(page: import('@playwright/test').Page, id: string) {
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

function playerItemCount(probe: UiProbe): number {
  return probe.slots
    .filter(
      (s) =>
        s.container_id === 'player_hotbar' ||
        s.container_id === 'player_backpack',
    )
    .reduce((sum, s) => sum + s.quantity, 0);
}

async function enterConcourse(
  page: import('@playwright/test').Page,
  tag: string,
) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await walkTo(page, 96, 60, { yFirst: true });
  await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
    approachOffset: { x: 0, y: 20 },
  });
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
}

test.describe('pilot route — Records & Logistics (Unit 3)', () => {
  test('M02 filing and M03 press occasions run on the route with their own families; beacon follows; coverage completes', async ({
    page,
  }) => {
    test.setTimeout(480_000);
    const errors = captureErrors(page);

    await enterConcourse(page, 'rec');

    // Filing workstation → M02 overlay.
    await openPromptAt(page, PILOT.concourse.filingDesk, {
      approachOffset: { x: 0, y: 44 },
    }).catch(() => undefined);
    await waitOverlay(page, true);

    let probe = (await uiProbe(page))!;

    expect(probe.mode).toBe('m02');
    expect(probe.buttons.filter((b) => b.id.startsWith('sort_'))).toHaveLength(
      0,
    );

    const d01 = slotBy(probe, 'm02_desk', (s) => s.code === 'D-01');
    const ir12 = slotBy(
      probe,
      'm02_folder_ir12',
      (s) => s.definition_id === null,
    );

    await dragSlot(page, d01, ir12);
    probe = (await uiProbe(page))!;

    const d02 = slotBy(probe, 'm02_desk', (s) => s.code === 'D-02');
    const ir19 = slotBy(
      probe,
      'm02_folder_ir19',
      (s) => s.definition_id === null,
    );

    await dragSlot(page, d02, ir19);
    await clickButton(page, 'm02_commit');
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    let events = await getEvents(page);
    const m02 = events.filter((e) =>
      (e.event_type as string).startsWith('proto_m02_'),
    );

    expect(m02.map((e) => e.event_type)).toEqual(
      expect.arrayContaining([
        'proto_m02_opportunity_opened',
        'proto_m02_item_moved',
        'proto_m02_committed',
      ]),
    );

    for (const event of m02) {
      const metadata = event.metadata as Record<string, unknown>;

      expect(metadata.opportunity_id).toBe('proto_m02_incident_filing');
      expect(event.study_item_ids).toBeUndefined();
      expect(event.construct_id).toBeUndefined();
      expect(event.success).toBeUndefined();
    }

    const committed = m02.find((e) => e.event_type === 'proto_m02_committed')!
      .metadata as Record<string, unknown>;

    expect(committed.misfiled_count).toBe(1);
    expect(committed.unfiled_count).toBe(10);

    // Beacon moves to the next guided station (Press A).
    let route = await pilotProbe(page);

    expect(route?.beacon?.label).toBe('Label Press A');

    // Press A — pointer path: three press cycles, then close = departure.
    await openPromptAt(page, PILOT.concourse.pressA, {
      approachOffset: { x: 0, y: 44 },
    }).catch(() => undefined);
    await waitOverlay(page, true);
    probe = (await uiProbe(page))!;
    expect(probe.mode).toBe('m03');

    for (let cycle = 0; cycle < 3; cycle += 1) {
      await clickButton(page, 'm03_press');
      await page.waitForTimeout(900);
    }

    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    // Press B — keyboard parity: C runs the press cycle.
    await openPromptAt(page, PILOT.concourse.pressB, {
      approachOffset: { x: 0, y: 44 },
    }).catch(() => undefined);
    await waitOverlay(page, true);

    for (let cycle = 0; cycle < 3; cycle += 1) {
      await page.keyboard.press('c');
      await page.waitForTimeout(900);
    }

    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    events = await getEvents(page);

    const m03 = events.filter((e) =>
      (e.event_type as string).startsWith('proto_m03_'),
    );
    const m03Closed = m03.filter(
      (e) => e.event_type === 'proto_m03_window_closed',
    );

    expect(m03Closed).toHaveLength(2);
    expect(
      new Set(
        m03Closed.map(
          (e) => (e.metadata as Record<string, unknown>).opportunity_id,
        ),
      ),
    ).toEqual(new Set(['proto_m03_reset_a', 'proto_m03_reset_b']));
    // Coded prior exposure on the occasions (M02 committed before).
    for (const event of m03.filter(
      (e) => e.event_type === 'proto_m03_opportunity_opened',
    )) {
      expect(
        (event.metadata as Record<string, unknown>).opportunity_id,
      ).toMatch(/proto_m03_reset_[ab]/);
    }

    // Coverage registry: M02 and M03 completed; beacon falls back to Vale.
    const coverage = await pilotCoverage(page);
    const byItem = new Map(coverage!.items.map((item) => [item.item, item]));

    expect(byItem.get('M02')?.status).toBe('completed');
    expect(byItem.get('M03')?.status).toBe('completed');
    expect(coverage!.summary.closed).toBe(2);
    route = await pilotProbe(page);
    expect(route?.beacon?.label).toBe('Vale');

    // Families stay disjoint from each other and from secondary telemetry.
    const types = await pilotEventTypes(page);

    expect(
      types.filter((t) => t.startsWith('proto_m02_') && t.includes('m03')),
    ).toEqual([]);
    expect(
      types.filter(
        (t) => t.startsWith('secondary_inventory_') && /m02|m03/.test(t),
      ),
    ).toEqual([]);
    expectNoRuntimeErrors(errors);
  });

  test('supply bundles: pickup, locker transfer and assembly conserve items, emit secondary telemetry only, and survive a scene transition', async ({
    page,
  }) => {
    test.setTimeout(420_000);
    const errors = captureErrors(page);

    await enterConcourse(page, 'inv');

    // Collect the component bundle (SPACE with no station in range).
    await walkTo(page, 96, 130, { yFirst: true });

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
    await openPromptAt(page, PILOT.concourse.assemblyBench, {
      approachOffset: { x: 0, y: 44 },
    }).catch(() => undefined);
    await waitOverlay(page, true);
    probe = (await uiProbe(page))!;
    expect(probe.mode).toBe('workbench');

    const fuse = slotBy(
      probe,
      'player_hotbar',
      (s) => s.definition_id === 'fuse_contact',
    );
    const input0 = slotBy(probe, 'workbench_input', (s) => s.slot_index === 0);

    await dragSlot(page, fuse, input0);
    probe = (await uiProbe(page))!;

    const housing = slotBy(
      probe,
      'player_hotbar',
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
    await openPromptAt(page, PILOT.concourse.storageLocker, {
      approachOffset: { x: 0, y: 44 },
    }).catch(() => undefined);
    await waitOverlay(page, true);
    probe = (await uiProbe(page))!;
    expect(probe.mode).toBe('container');

    const cartridge = slotBy(
      probe,
      'player_hotbar',
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
    await walkTo(page, 176, 130, { yFirst: true });
    await press(page, 'Space');
    await page.waitForTimeout(400);
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

  test('abandonment fail-forward: a filing window closed without commit stays open; the route still advances', async ({
    page,
  }) => {
    test.setTimeout(360_000);

    await enterConcourse(page, 'aband');

    await openPromptAt(page, PILOT.concourse.filingDesk, {
      approachOffset: { x: 0, y: 44 },
    }).catch(() => undefined);
    await waitOverlay(page, true);

    const probe = (await uiProbe(page))!;
    const d03 = slotBy(probe, 'm02_desk', (s) => s.code === 'D-03');
    const ir7 = slotBy(
      probe,
      'm02_folder_ir7',
      (s) => s.definition_id === null,
    );

    await dragSlot(page, d03, ir7);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    const types = await pilotEventTypes(page);

    expect(types).toContain('proto_m02_panel_closed_without_commit');
    expect(types).not.toContain('proto_m02_committed');

    let coverage = await pilotCoverage(page);

    expect(coverage!.items.find((i) => i.item === 'M02')?.status).toBe('open');

    // Vale lets the participant move on regardless (no performance gate).
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    expect((await pilotProbe(page))?.stage).toBe('lab_briefing');
    coverage = await pilotCoverage(page);
    expect(coverage!.items.find((i) => i.item === 'M02')?.status).toBe('open');
    // The review never names an entered-but-unfinished window.
    expect(coverage!.summary.neverEnteredLabels.join(' ')).not.toMatch(
      /filing/i,
    );
  });
});
