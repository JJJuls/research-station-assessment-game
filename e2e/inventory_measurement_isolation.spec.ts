/**
 * Interactive inventory foundation — M02/M03 measurement separation.
 *
 * Verifies the scientific boundaries in the RUNNING game:
 *
 * - ordinary inventory behaviour emits only secondary_inventory_* events
 *   (contextual telemetry) and NEVER enters the proto_m02_* or proto_m03_*
 *   families;
 * - M02 and M03 event families are disjoint, each bound to its own
 *   opportunity ids, with counterbalance/entry-state recorded;
 * - M03's two occasions are independent of M02 and of each other;
 * - aborted/unentered opportunities stay pending/missing — never "low";
 * - the ordinary Sort control is absent in both workstations;
 * - no provisional event carries canonical scoring fields, and the
 *   canonical summary is untouched by workstation activity.
 */

import { expect, type Page, test } from '@playwright/test';

import { CANONICAL_EVENT_CONTEXT } from '../src/world/CanonicalEventContext';
import { driveAxisTo, getEvents } from './helpers';

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

interface ProbeButton {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
}

interface UiProbe {
  open: boolean;
  mode: string;
  focus: { container_id: string; slot_index: number } | null;
  held: { definition_id: string; quantity: number } | null;
  dragging: boolean;
  confirm_open: boolean;
  feedback: string | null;
  slots: ProbeSlot[];
  buttons: ProbeButton[];
}

interface ValidityRecord {
  opportunity_id: string;
  owner: string;
  entry_state_version: string;
  counterbalance: string | null;
  offered: boolean;
  entered: boolean;
  completed: boolean;
  validity: 'pending' | 'valid' | 'invalid' | 'missing';
}

async function bootLab(page: Page, tag: string) {
  await page.goto(
    `/?scene=inventory_lab&participant_id=PT_ISO_${tag}&game_session_id=GS_ISO_${tag}`,
  );
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'inventory_lab',
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(400);
}

async function uiProbe(page: Page): Promise<UiProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __inventoryUiProbe?: UiProbe | null })
        .__inventoryUiProbe ?? null,
  );
}

async function waitOverlayOpen(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open ?? false) === expected,
    open,
    { timeout: 8_000 },
  );
  await page.waitForTimeout(150);
}

async function validityRegister(page: Page): Promise<ValidityRecord[]> {
  return page.evaluate(
    () =>
      ((
        window as unknown as { __measurementValidity?: ValidityRecord[] | null }
      ).__measurementValidity ?? []) as ValidityRecord[],
  );
}

async function gamePoint(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();

  if (box === null) {
    throw new Error('game canvas not found');
  }

  return {
    x: box.x + (x * box.width) / 800,
    y: box.y + (y * box.height) / 600,
  };
}

async function clickButton(page: Page, id: string) {
  const probe = (await uiProbe(page))!;
  const button = probe.buttons.find((candidate) => candidate.id === id);

  if (button === undefined) {
    throw new Error(`button ${id} not present`);
  }

  const point = await gamePoint(
    page,
    button.x + button.w / 2,
    button.y + button.h / 2,
  );

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(220);
}

async function dragSlot(page: Page, from: ProbeSlot, to: ProbeSlot) {
  const fromPoint = await gamePoint(
    page,
    from.x + from.w / 2,
    from.y + from.h / 2,
  );
  const toPoint = await gamePoint(page, to.x + to.w / 2, to.y + to.h / 2);

  await page.mouse.move(fromPoint.x, fromPoint.y);
  await page.mouse.down();
  await page.mouse.move(fromPoint.x + 10, fromPoint.y + 10, { steps: 3 });
  await page.mouse.move(toPoint.x, toPoint.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function holdKey(page: Page, keyName: string, ms: number) {
  await page.keyboard.down(keyName);
  await page.waitForTimeout(ms);
  await page.keyboard.up(keyName);
  await page.waitForTimeout(120);
}

async function walkAndInteract(page: Page, x: number, y: number) {
  // Route via the open y=300 lane: the row-5/row-11 rail stubs clip the
  // player body when walking east-west at station height, so every leg
  // is vertical-open by construction (see the Lab layout grid).
  await driveAxisTo(page, 'y', 300, 8);
  await driveAxisTo(page, 'x', x, 8);
  await driveAxisTo(page, 'y', y, 8);
  await holdKey(page, 'e', 160);
}

function slotBy(
  probe: UiProbe,
  containerId: string,
  predicate: (slot: ProbeSlot) => boolean,
): ProbeSlot {
  const entry = probe.slots.find(
    (slot) => slot.container_id === containerId && predicate(slot),
  );

  if (entry === undefined) {
    throw new Error(`no matching slot in ${containerId}`);
  }

  return entry;
}

const M02_PREFIX = 'proto_m02_';
const M03_PREFIX = 'proto_m03_';
const SECONDARY_PREFIX = 'secondary_inventory_';

/** The canonical summary must never grow m02/m03/secondary keys. */
async function expectSummaryUncontaminated(page: Page) {
  const summaryKeys = await page.evaluate(() =>
    Object.keys(
      (
        window as unknown as {
          researchRuntime: { getSummary: () => Record<string, unknown> };
        }
      ).researchRuntime.getSummary(),
    ),
  );

  expect(
    summaryKeys.filter(
      (key) =>
        key.includes('m02') || key.includes('m03') || key.includes('secondary'),
    ),
  ).toHaveLength(0);
}

test('static: no provisional family is registered for canonical enrichment', () => {
  const promoted = Object.keys(CANONICAL_EVENT_CONTEXT).filter(
    (eventType) =>
      eventType.startsWith(M02_PREFIX) ||
      eventType.startsWith(M03_PREFIX) ||
      eventType.startsWith(SECONDARY_PREFIX),
  );

  expect(promoted).toEqual([]);
});

test('ordinary inventory behaviour stays out of the M02/M03 families and carries no scoring fields', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await bootLab(page, 'ORD');

  // Ordinary behaviour: open, transfer, sort, split, close.
  await walkAndInteract(page, 400, 200);
  await waitOverlayOpen(page, true);

  const probe = (await uiProbe(page))!;
  const seeded = slotBy(probe, 'lab_storage', (slot) => slot.quantity > 1);

  await page.keyboard.down('Shift');

  const point = await gamePoint(
    page,
    seeded.x + seeded.w / 2,
    seeded.y + seeded.h / 2,
  );

  await page.mouse.click(point.x, point.y);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(220);
  await clickButton(page, 'sort_lab_storage');
  await page.keyboard.press('i');
  await waitOverlayOpen(page, false);

  const events = await getEvents(page);
  const eventTypes = events.map((event) => event.event_type as string);

  // Ordinary telemetry exists…
  expect(eventTypes).toContain('secondary_inventory_opened');
  expect(eventTypes).toContain('secondary_inventory_quick_transfer');
  expect(eventTypes).toContain('secondary_inventory_sort');
  expect(eventTypes).toContain('secondary_inventory_closed');

  // …and NOTHING entered a measurement family.
  expect(
    eventTypes.filter(
      (type) => type.startsWith(M02_PREFIX) || type.startsWith(M03_PREFIX),
    ),
  ).toHaveLength(0);

  // Secondary events are provisional: no canonical scoring fields.
  for (const event of events.filter((candidate) =>
    (candidate.event_type as string).startsWith(SECONDARY_PREFIX),
  )) {
    expect(event.study_item_ids).toBeUndefined();
    expect(event.construct_id).toBeUndefined();
    expect(event.success).toBeUndefined();
  }

  // The canonical summary has no organisation/inventory-secondary keys.
  const summaryKeys = await page.evaluate(() =>
    Object.keys(
      (
        window as unknown as {
          researchRuntime: { getSummary: () => Record<string, unknown> };
        }
      ).researchRuntime.getSummary(),
    ),
  );

  expect(
    summaryKeys.filter(
      (key) =>
        key.includes('m02') || key.includes('m03') || key.includes('secondary'),
    ),
  ).toHaveLength(0);
});

test('M02 filing workstation: own event family, counterbalance recorded, sort absent, commit captures full placement', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await bootLab(page, 'M02');

  await walkAndInteract(page, 272, 430);
  await waitOverlayOpen(page, true);

  let probe = (await uiProbe(page))!;

  expect(probe.mode).toBe('m02');

  // The ordinary Sort control is nowhere in this context.
  expect(
    probe.buttons.filter((button) => button.id.startsWith('sort_')),
  ).toHaveLength(0);

  // R (the sort hotkey) must not reorder the desk.
  const deskBefore = probe.slots
    .filter((slot) => slot.container_id === 'm02_desk')
    .map((slot) => slot.definition_id);

  await page.keyboard.press('r');
  await page.waitForTimeout(200);
  probe = (await uiProbe(page))!;
  expect(
    probe.slots
      .filter((slot) => slot.container_id === 'm02_desk')
      .map((slot) => slot.definition_id),
  ).toEqual(deskBefore);

  // File D-01 correctly (case IR-12) and D-02 incorrectly (IR-7 sheet
  // into the IR-19 folder) — the engine allows misfiling; only the
  // reference tells the participant otherwise.
  const d01 = slotBy(probe, 'm02_desk', (slot) => slot.code === 'D-01');
  const folder12Slot = slotBy(
    probe,
    'm02_folder_ir12',
    (slot) => slot.definition_id === null,
  );

  await dragSlot(page, d01, folder12Slot);

  probe = (await uiProbe(page))!;

  const d02 = slotBy(probe, 'm02_desk', (slot) => slot.code === 'D-02');
  const folder19Slot = slotBy(
    probe,
    'm02_folder_ir19',
    (slot) => slot.definition_id === null,
  );

  await dragSlot(page, d02, folder19Slot);

  // Consult the reference explicitly, then commit.
  const referenceViewedBefore = (await getEvents(page)).filter(
    (event) => event.event_type === 'proto_m02_reference_viewed',
  ).length;

  // The reference panel is at x≈576+84,y≈128+85 (centre of the card).
  const referencePoint = await gamePoint(page, 660, 213);

  await page.mouse.click(referencePoint.x, referencePoint.y);
  await page.waitForTimeout(200);

  await clickButton(page, 'm02_commit');

  const events = await getEvents(page);
  const m02Events = events.filter((event) =>
    (event.event_type as string).startsWith(M02_PREFIX),
  );
  const eventTypes = m02Events.map((event) => event.event_type as string);

  expect(eventTypes).toContain('proto_m02_opportunity_opened');
  expect(eventTypes).toContain('proto_m02_item_moved');
  expect(eventTypes).toContain('proto_m02_committed');
  expect(
    (await getEvents(page)).filter(
      (event) => event.event_type === 'proto_m02_reference_viewed',
    ).length,
  ).toBeGreaterThan(referenceViewedBefore);

  // Every M02 event is bound to the single M02 opportunity id and the
  // recorded counterbalance condition.
  for (const event of m02Events) {
    const metadata = event.metadata as Record<string, unknown>;

    expect(metadata.opportunity_id).toBe('proto_m02_incident_filing');
    expect(metadata.measure_id).toBe('M02');
    expect(['layout_a', 'layout_b']).toContain(metadata.counterbalance);
    expect(metadata.entry_state_version).toBe('m02-incident-filing-v1');
    expect(event.study_item_ids).toBeUndefined();
    expect(event.construct_id).toBeUndefined();
    expect(event.success).toBeUndefined();
  }

  // The commit records the complete final placement: 2 filed (1 correct,
  // 1 misfiled), 10 unfiled — raw state components, never a score.
  const committed = m02Events.find(
    (event) => event.event_type === 'proto_m02_committed',
  )!;
  const commitMeta = committed.metadata as Record<string, unknown>;

  expect(commitMeta.misfiled_count).toBe(1);
  expect(commitMeta.unfiled_count).toBe(10);
  expect(commitMeta.untraceable_count).toBe(0);
  expect(
    Object.keys(commitMeta.per_document as Record<string, unknown>),
  ).toHaveLength(12);
  expect(commitMeta.move_count).toBe(2);

  // No M03 event and no secondary event fired for workstation moves.
  expect(
    events.filter((event) =>
      (event.event_type as string).startsWith(M03_PREFIX),
    ),
  ).toHaveLength(0);

  // Airtight leak check: the ONLY secondary event in this whole session
  // is the Lab-entry marker — no workstation interaction produced any
  // ordinary-inventory telemetry of any kind.
  expect(
    events
      .map((event) => event.event_type as string)
      .filter((type) => type.startsWith(SECONDARY_PREFIX)),
  ).toEqual(['secondary_inventory_lab_entered']);

  // The canonical summary is untouched AFTER the workstation activity.
  await expectSummaryUncontaminated(page);

  // Validity register: completed and valid, with counterbalance.
  const register = await validityRegister(page);
  const m02Record = register.find(
    (record) => record.opportunity_id === 'proto_m02_incident_filing',
  )!;

  expect(m02Record.owner).toBe('M02');
  expect(m02Record.completed).toBe(true);
  expect(m02Record.validity).toBe('valid');
  expect(['layout_a', 'layout_b']).toContain(m02Record.counterbalance);
});

test('M02 closed without commit stays pending (aborted ≠ low); reopening still works', async ({
  page,
}) => {
  await bootLab(page, 'M02ABORT');

  await walkAndInteract(page, 272, 430);
  await waitOverlayOpen(page, true);
  await page.keyboard.press('Escape');
  await waitOverlayOpen(page, false);

  const events = await getEvents(page);
  const eventTypes = events.map((event) => event.event_type as string);

  expect(eventTypes).toContain('proto_m02_panel_closed_without_commit');
  expect(eventTypes).not.toContain('proto_m02_committed');

  const register = await validityRegister(page);
  const record = register.find(
    (candidate) => candidate.opportunity_id === 'proto_m02_incident_filing',
  )!;

  expect(record.entered).toBe(true);
  expect(record.completed).toBe(false);
  expect(record.validity).toBe('pending'); // never a low measurement
});

test('M03: two independent occasions, disjoint from M02, capture-at-departure, leaving everything is valid', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await bootLab(page, 'M03');

  // Occasion B FIRST — proves independence from both M02 and occasion A.
  await walkAndInteract(page, 620, 430);
  await waitOverlayOpen(page, true);

  let probe = (await uiProbe(page))!;

  expect(probe.mode).toBe('m03');
  expect(
    probe.buttons.filter((button) => button.id.startsWith('sort_')),
  ).toHaveLength(0);

  // Run the press to completion (three cycles) — the real activity.
  for (let cycle = 0; cycle < 3; cycle++) {
    await clickButton(page, 'm03_press');
  }

  probe = (await uiProbe(page))!;

  const residualsB = probe.slots.filter(
    (slot) =>
      slot.container_id === 'm03_surface_b' && slot.definition_id !== null,
  );

  expect(residualsB).toHaveLength(5);

  // Depart WITHOUT touching anything: a fully valid observation.
  await page.keyboard.press('i');
  await waitOverlayOpen(page, false);

  let events = await getEvents(page);
  const departureB = events.find(
    (event) => event.event_type === 'proto_m03_surface_state_at_departure',
  )!;
  const metaB = departureB.metadata as Record<string, unknown>;

  expect(metaB.opportunity_id).toBe('proto_m03_reset_b');
  expect(metaB.stored_count).toBe(0);
  expect(metaB.left_count).toBe(5);
  expect(metaB.close_reason).toBe('panel_closed');

  let register = await validityRegister(page);
  const recordB = register.find(
    (record) => record.opportunity_id === 'proto_m03_reset_b',
  )!;

  expect(recordB.completed).toBe(true);
  expect(recordB.validity).toBe('valid'); // leaving residuals is VALID data

  // Occasion A: run the activity, store two residuals, then depart.
  await walkAndInteract(page, 384, 430);
  await waitOverlayOpen(page, true);

  for (let cycle = 0; cycle < 3; cycle++) {
    await clickButton(page, 'm03_press');
  }

  for (let moved = 0; moved < 2; moved++) {
    probe = (await uiProbe(page))!;

    const residual = slotBy(
      probe,
      'm03_surface_a',
      (slot) => slot.definition_id !== null,
    );
    const storeSlot = slotBy(
      probe,
      'm03_store_a',
      (slot) => slot.definition_id === null,
    );

    await dragSlot(page, residual, storeSlot);
  }

  await page.keyboard.press('i');
  await waitOverlayOpen(page, false);

  events = await getEvents(page);

  const departureA = events.find(
    (event) =>
      event.event_type === 'proto_m03_surface_state_at_departure' &&
      (event.metadata as Record<string, unknown>).opportunity_id ===
        'proto_m03_reset_a',
  )!;
  const metaA = departureA.metadata as Record<string, unknown>;

  expect(metaA.stored_count).toBe(2);
  expect(metaA.left_count).toBe(3);

  // Family discipline: distinct opportunity ids, disjoint from M02, no
  // scoring fields, no secondary events for workstation moves.
  const m03Events = events.filter((event) =>
    (event.event_type as string).startsWith(M03_PREFIX),
  );
  const opportunityIds = new Set(
    m03Events.map(
      (event) => (event.metadata as Record<string, unknown>).opportunity_id,
    ),
  );

  expect(opportunityIds).toEqual(
    new Set(['proto_m03_reset_a', 'proto_m03_reset_b']),
  );

  for (const event of m03Events) {
    expect((event.event_type as string).startsWith(M02_PREFIX)).toBe(false);
    expect(event.study_item_ids).toBeUndefined();
    expect(event.construct_id).toBeUndefined();
    expect(event.success).toBeUndefined();
    expect((event.metadata as Record<string, unknown>).measure_id).toBe('M03');
    expect((event.metadata as Record<string, unknown>).starting_condition).toBe(
      'fixed_identical_layout',
    );
  }

  expect(
    events.filter((event) =>
      (event.event_type as string).startsWith(M02_PREFIX),
    ),
  ).toHaveLength(0);

  // Airtight leak check + untouched summary after BOTH occasions.
  expect(
    events
      .map((event) => event.event_type as string)
      .filter((type) => type.startsWith(SECONDARY_PREFIX)),
  ).toEqual(['secondary_inventory_lab_entered']);
  await expectSummaryUncontaminated(page);

  // Register: A and B both completed, valid, independent of M02 (which
  // stays pending in this session — it was never even opened).
  register = await validityRegister(page);

  const recordA = register.find(
    (record) => record.opportunity_id === 'proto_m03_reset_a',
  )!;
  const m02Record = register.find(
    (record) => record.opportunity_id === 'proto_m02_incident_filing',
  )!;

  expect(recordA.completed).toBe(true);
  expect(recordA.validity).toBe('valid');
  expect(m02Record.entered).toBe(false);
  expect(m02Record.validity).toBe('pending');

  // A closed occasion does not reopen: prove the player actually stands
  // at the bench (within the 72px interaction radius) and the panel
  // still refuses to open.
  await walkAndInteract(page, 620, 430);
  await page.waitForTimeout(300);

  const playerAtBench = await page.evaluate(() => {
    const probe = (
      window as unknown as { __playerProbe?: { x: number; y: number } | null }
    ).__playerProbe;

    return probe === null || probe === undefined
      ? null
      : Math.hypot(probe.x - 620, probe.y - 430);
  });

  expect(playerAtBench).not.toBeNull();
  expect(playerAtBench!).toBeLessThan(72);
  expect((await uiProbe(page))?.open ?? false).toBe(false);
});
