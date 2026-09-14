/**
 * Interactive inventory foundation — core verification.
 *
 * Part 1 (domain invariants): the Phaser-independent transactional engine
 * is exercised directly — conservation, stacking limits, atomic recipes,
 * safe restores, serialisation and migration.
 *
 * Part 2 (participant input): the REAL UI in a real browser — actual
 * pointer down/move/up drags against probe-reported slot rectangles and
 * actual keyboard input. No test invokes an inventory mutation method
 * through Playwright; every mutation happens through the participant
 * surface. The DEV probes (__inventoryUiProbe, __playerProbe) are
 * read-only state mirrors.
 */

import { expect, type Page, test } from '@playwright/test';

import {
  addItem,
  cancelHeld,
  commitRecipe,
  computeItemTotals,
  createInitialInventoryState,
  discardStack,
  loadSnapshot,
  pickUp,
  place,
  quickTransfer,
  sortContainer,
  toSnapshot,
  validateInvariants,
} from '../src/inventory/engine';
import type { InventoryState } from '../src/inventory/model';
import { CONTAINER_IDS } from '../src/inventory/model';
import { designToPage, driveAxisTo, getEvents } from './helpers';

/* ------------------------------------------------------------------ *
 * Part 1 — domain invariants (pure, no browser)
 * ------------------------------------------------------------------ */

const HOTBAR = CONTAINER_IDS.playerHotbar;
const BACKPACK = CONTAINER_IDS.playerBackpack;
const STORAGE = CONTAINER_IDS.labStorage;
const WB_IN = CONTAINER_IDS.workbenchInput;
const WB_OUT = CONTAINER_IDS.workbenchOutput;

/** Applies an op outcome, asserting success, and returns the new state. */
function apply(
  outcome: { state: InventoryState; result: { ok: boolean } },
  label: string,
): InventoryState {
  expect(outcome.result.ok, `${label} should succeed`).toBe(true);
  expect(validateInvariants(outcome.state), `${label} invariants`).toBeNull();

  return outcome.state;
}

function slotDef(
  state: InventoryState,
  containerId: string,
  index: number,
): { definitionId: string; quantity: number } | null {
  const stack = state.containers[containerId].slots[index];

  return stack === null
    ? null
    : { definitionId: stack.definitionId, quantity: stack.quantity };
}

test.describe('domain invariants', () => {
  test('move to an empty slot preserves identity and totals', () => {
    let state = createInitialInventoryState();

    state = apply(
      addItem(state, {
        definitionId: 'wire_spool',
        quantity: 3,
        targetContainerIds: [STORAGE],
        allOrNothing: true,
      }),
      'seed',
    );

    const before = computeItemTotals(state);
    const stackId = state.containers[STORAGE].slots[0]!.stackId;

    state = apply(
      pickUp(state, { containerId: STORAGE, slotIndex: 0, mode: 'all' }),
      'pick up',
    );
    state = apply(
      place(state, { containerId: BACKPACK, slotIndex: 4 }),
      'place',
    );

    expect(slotDef(state, STORAGE, 0)).toBeNull();
    expect(slotDef(state, BACKPACK, 4)).toEqual({
      definitionId: 'wire_spool',
      quantity: 3,
    });
    expect(state.containers[BACKPACK].slots[4]!.stackId).toBe(stackId);
    expect(computeItemTotals(state)).toEqual(before);
  });

  test('swap exchanges two different stacks', () => {
    let state = createInitialInventoryState();

    state = apply(
      addItem(state, {
        definitionId: 'wire_spool',
        quantity: 2,
        targetContainerIds: [BACKPACK],
        allOrNothing: true,
      }),
      'seed a',
    );
    state = apply(
      addItem(state, {
        definitionId: 'field_ration',
        quantity: 4,
        targetContainerIds: [STORAGE],
        allOrNothing: true,
      }),
      'seed b',
    );

    state = apply(
      pickUp(state, { containerId: BACKPACK, slotIndex: 0, mode: 'all' }),
      'pick up',
    );
    state = apply(
      place(state, { containerId: STORAGE, slotIndex: 0 }),
      'swap place',
    );

    expect(slotDef(state, STORAGE, 0)).toEqual({
      definitionId: 'wire_spool',
      quantity: 2,
    });
    expect(slotDef(state, BACKPACK, 0)).toEqual({
      definitionId: 'field_ration',
      quantity: 4,
    });
    expect(state.held).toBeNull();
  });

  test('merge respects the stack maximum; excess stays held then restores', () => {
    let state = createInitialInventoryState();

    // fuse_contact maxStack is 8: build 6 in slot 0, then 5 in slot 1.
    state = apply(
      addItem(state, {
        definitionId: 'fuse_contact',
        quantity: 6,
        targetContainerIds: [STORAGE],
        allOrNothing: true,
      }),
      'seed 6',
    );
    state = apply(
      addItem(state, {
        definitionId: 'fuse_contact',
        quantity: 7,
        targetContainerIds: [STORAGE],
        allOrNothing: true,
      }),
      'seed 7 (2 merge + 5 spill)',
    );
    expect(slotDef(state, STORAGE, 0)).toEqual({
      definitionId: 'fuse_contact',
      quantity: 8,
    });
    expect(slotDef(state, STORAGE, 1)).toEqual({
      definitionId: 'fuse_contact',
      quantity: 5,
    });

    // Take 3 off the full stack, merge onto slot 1 (5+3 = 8, at max).
    state = apply(
      pickUp(state, { containerId: STORAGE, slotIndex: 0, mode: 'half' }),
      'pick half of 8',
    );
    expect(state.held!.stack.quantity).toBe(4);

    state = apply(
      place(state, { containerId: STORAGE, slotIndex: 1 }),
      'merge onto 5',
    );

    // 5 + 4 exceeds the max by 1: slot fills to 8, one stays held.
    expect(slotDef(state, STORAGE, 1)).toEqual({
      definitionId: 'fuse_contact',
      quantity: 8,
    });
    expect(state.held!.stack.quantity).toBe(1);

    // Cancel restores the remainder onto its source stack.
    state = apply(cancelHeld(state), 'cancel');
    expect(slotDef(state, STORAGE, 0)).toEqual({
      definitionId: 'fuse_contact',
      quantity: 5,
    });
    expect(computeItemTotals(state)).toEqual({ fuse_contact: 13 });
  });

  test('split one and split half create correct quantities', () => {
    let state = createInitialInventoryState();

    state = apply(
      addItem(state, {
        definitionId: 'field_ration',
        quantity: 5,
        targetContainerIds: [BACKPACK],
        allOrNothing: true,
      }),
      'seed',
    );

    state = apply(
      pickUp(state, { containerId: BACKPACK, slotIndex: 0, mode: 'one' }),
      'split one',
    );
    expect(state.held!.stack.quantity).toBe(1);
    expect(slotDef(state, BACKPACK, 0)!.quantity).toBe(4);
    state = apply(
      place(state, { containerId: BACKPACK, slotIndex: 1 }),
      'place',
    );

    state = apply(
      pickUp(state, { containerId: BACKPACK, slotIndex: 0, mode: 'half' }),
      'split half',
    );
    expect(state.held!.stack.quantity).toBe(2);
    expect(slotDef(state, BACKPACK, 0)!.quantity).toBe(2);
    state = apply(
      place(state, { containerId: BACKPACK, slotIndex: 2 }),
      'place',
    );

    expect(computeItemTotals(state)).toEqual({ field_ration: 5 });
  });

  test('quick transfer merges first, then uses a free slot', () => {
    let state = createInitialInventoryState();

    state = apply(
      addItem(state, {
        definitionId: 'field_ration',
        quantity: 7,
        targetContainerIds: [BACKPACK],
        allOrNothing: true,
      }),
      'seed player 7',
    );
    state = apply(
      addItem(state, {
        definitionId: 'field_ration',
        quantity: 6,
        targetContainerIds: [STORAGE],
        allOrNothing: true,
      }),
      'seed storage 6',
    );

    // 6 from storage: 3 merge into the 7 (max 10), 3 land in a free slot.
    state = apply(
      quickTransfer(state, {
        containerId: STORAGE,
        slotIndex: 0,
        targetContainerIds: [BACKPACK, HOTBAR],
      }),
      'quick transfer',
    );

    expect(slotDef(state, STORAGE, 0)).toBeNull();
    expect(slotDef(state, BACKPACK, 0)!.quantity).toBe(10);
    expect(slotDef(state, BACKPACK, 1)!.quantity).toBe(3);
    expect(computeItemTotals(state)).toEqual({ field_ration: 13 });
  });

  test('sort is deterministic (category, then name, then id) and keeps stack identity', () => {
    let state = createInitialInventoryState();

    for (const [definitionId, quantity] of [
      ['wire_spool', 2],
      ['field_ration', 3],
      ['fuse_contact', 2],
      ['field_scanner', 1],
    ] as const) {
      state = apply(
        addItem(state, {
          definitionId,
          quantity,
          targetContainerIds: [STORAGE],
          allOrNothing: true,
        }),
        `seed ${definitionId}`,
      );
    }

    const idsBefore = state.containers[STORAGE].slots
      .filter((slot) => slot !== null)
      .map((slot) => slot!.stackId)
      .sort();

    state = apply(sortContainer(state, { containerId: STORAGE }), 'sort');

    expect(
      state.containers[STORAGE].slots
        .slice(0, 4)
        .map((slot) => slot!.definitionId),
    ).toEqual(['field_scanner', 'fuse_contact', 'wire_spool', 'field_ration']);

    const idsAfter = state.containers[STORAGE].slots
      .filter((slot) => slot !== null)
      .map((slot) => slot!.stackId)
      .sort();

    expect(idsAfter).toEqual(idsBefore);

    // Re-sorting an already sorted container is a stable no-op.
    const again = apply(
      sortContainer(state, { containerId: STORAGE }),
      'resort',
    );

    expect(again.containers[STORAGE].slots).toEqual(
      state.containers[STORAGE].slots,
    );
  });

  test('sort refuses measurement workstation containers', () => {
    const state = createInitialInventoryState();

    for (const containerId of [
      CONTAINER_IDS.m02Desk,
      CONTAINER_IDS.m02FolderIr7,
      CONTAINER_IDS.m03SurfaceA,
      CONTAINER_IDS.m03StoreB,
      WB_IN,
      WB_OUT,
    ]) {
      const outcome = sortContainer(state, { containerId });

      expect(outcome.result.ok).toBe(false);
      expect(outcome.result.ok ? '' : outcome.result.reason).toBe(
        'sort_unavailable',
      );
    }
  });

  test('recipe commits atomically; incomplete and blocked-output consume nothing', () => {
    let state = createInitialInventoryState();

    // Incomplete loadout: one fuse contact only.
    state = apply(
      addItem(state, {
        definitionId: 'fuse_contact',
        quantity: 1,
        targetContainerIds: [WB_IN],
        allOrNothing: true,
      }),
      'seed incomplete',
    );

    const incomplete = commitRecipe(state, {
      recipeId: 'fused_relay_cartridge',
    });

    expect(incomplete.result.ok).toBe(false);
    expect(incomplete.state).toBe(state); // the exact prior state object
    expect(computeItemTotals(state)).toEqual({ fuse_contact: 1 });

    // Complete the loadout: 2 fuse contacts + 1 relay housing.
    state = apply(
      addItem(state, {
        definitionId: 'fuse_contact',
        quantity: 1,
        targetContainerIds: [WB_IN],
        allOrNothing: true,
      }),
      'seed second contact',
    );
    state = apply(
      addItem(state, {
        definitionId: 'relay_housing',
        quantity: 1,
        targetContainerIds: [WB_IN],
        allOrNothing: true,
      }),
      'seed housing',
    );

    state = apply(
      commitRecipe(state, { recipeId: 'fused_relay_cartridge' }),
      'commit',
    );
    expect(computeItemTotals(state)).toEqual({ fused_relay_cartridge: 1 });
    expect(slotDef(state, WB_OUT, 0)).toEqual({
      definitionId: 'fused_relay_cartridge',
      quantity: 1,
    });

    // Fill the output to its maximum (2), then a third commit is blocked
    // BEFORE consuming anything.
    state = apply(
      addItem(state, {
        definitionId: 'fuse_contact',
        quantity: 2,
        targetContainerIds: [WB_IN],
        allOrNothing: true,
      }),
      'reload contacts',
    );
    state = apply(
      addItem(state, {
        definitionId: 'relay_housing',
        quantity: 1,
        targetContainerIds: [WB_IN],
        allOrNothing: true,
      }),
      'reload housing',
    );
    state = apply(
      commitRecipe(state, { recipeId: 'fused_relay_cartridge' }),
      'second commit',
    );
    expect(slotDef(state, WB_OUT, 0)!.quantity).toBe(2);

    state = apply(
      addItem(state, {
        definitionId: 'fuse_contact',
        quantity: 2,
        targetContainerIds: [WB_IN],
        allOrNothing: true,
      }),
      'third contacts',
    );
    state = apply(
      addItem(state, {
        definitionId: 'relay_housing',
        quantity: 1,
        targetContainerIds: [WB_IN],
        allOrNothing: true,
      }),
      'third housing',
    );

    const blocked = commitRecipe(state, { recipeId: 'fused_relay_cartridge' });

    expect(blocked.result.ok).toBe(false);
    expect(blocked.result.ok ? '' : blocked.result.reason).toBe(
      'recipe_output_blocked',
    );
    expect(computeItemTotals(blocked.state)).toEqual({
      fuse_contact: 2,
      relay_housing: 1,
      fused_relay_cartridge: 2,
    });
  });

  test('players cannot insert into the workbench output slot', () => {
    let state = createInitialInventoryState();

    state = apply(
      addItem(state, {
        definitionId: 'wire_spool',
        quantity: 1,
        targetContainerIds: [BACKPACK],
        allOrNothing: true,
      }),
      'seed',
    );
    state = apply(
      pickUp(state, { containerId: BACKPACK, slotIndex: 0, mode: 'all' }),
      'pick',
    );

    const refused = place(state, { containerId: WB_OUT, slotIndex: 0 });

    expect(refused.result.ok).toBe(false);
    expect(refused.state.held).not.toBeNull();

    state = apply(cancelHeld(refused.state), 'cancel');
    expect(slotDef(state, BACKPACK, 0)).toEqual({
      definitionId: 'wire_spool',
      quantity: 1,
    });
  });

  test('namespace binding: measurement items and ordinary items never cross', () => {
    const state = createInitialInventoryState();

    // An M02 document cannot enter the player inventory.
    const docIntoBackpack = addItem(state, {
      definitionId: 'm02_doc_01',
      quantity: 1,
      targetContainerIds: [BACKPACK, HOTBAR],
      allOrNothing: true,
    });

    expect(docIntoBackpack.result.ok).toBe(false);

    // An ordinary item cannot enter an M02 folder or an M03 surface.
    for (const containerId of [
      CONTAINER_IDS.m02FolderIr7,
      CONTAINER_IDS.m03SurfaceA,
    ]) {
      const refused = addItem(state, {
        definitionId: 'field_ration',
        quantity: 1,
        targetContainerIds: [containerId],
        allOrNothing: true,
      });

      expect(refused.result.ok).toBe(false);
    }
  });

  test('invalid placement leaves the complete prior state unchanged', () => {
    let state = createInitialInventoryState();

    state = apply(
      addItem(state, {
        definitionId: 'field_ration',
        quantity: 2,
        targetContainerIds: [BACKPACK],
        allOrNothing: true,
      }),
      'seed',
    );
    state = apply(
      pickUp(state, { containerId: BACKPACK, slotIndex: 0, mode: 'all' }),
      'pick',
    );

    const snapshotBefore = JSON.stringify(toSnapshot(state));
    const refused = place(state, {
      containerId: CONTAINER_IDS.m02Desk,
      slotIndex: 0,
    });

    expect(refused.result.ok).toBe(false);
    expect(JSON.stringify(toSnapshot(refused.state))).toBe(snapshotBefore);

    state = apply(cancelHeld(refused.state), 'cancel');
    expect(slotDef(state, BACKPACK, 0)).toEqual({
      definitionId: 'field_ration',
      quantity: 2,
    });
  });

  test('all-or-nothing pickup refuses cleanly when nothing fits', () => {
    let state = createInitialInventoryState();

    // Fill the single-slot output-locked path is separate; here fill the
    // whole player inventory with singletons (30 slots).
    for (let index = 0; index < 30; index++) {
      state = apply(
        addItem(state, {
          definitionId: 'core_sample',
          quantity: 1,
          targetContainerIds: [HOTBAR, BACKPACK],
          allOrNothing: true,
        }),
        `fill ${index}`,
      );
    }

    const before = JSON.stringify(toSnapshot(state));
    const refused = addItem(state, {
      definitionId: 'pry_bar',
      quantity: 1,
      targetContainerIds: [HOTBAR, BACKPACK],
      allOrNothing: true,
    });

    expect(refused.result.ok).toBe(false);
    expect(refused.result.ok ? '' : refused.result.reason).toBe('target_full');
    expect(JSON.stringify(toSnapshot(refused.state))).toBe(before);
  });

  test('discard requires a discardable definition and explicit call', () => {
    let state = createInitialInventoryState();

    state = apply(
      addItem(state, {
        definitionId: 'pry_bar', // legacy carry item: not discardable
        quantity: 1,
        targetContainerIds: [HOTBAR],
        allOrNothing: true,
      }),
      'seed legacy',
    );
    state = apply(
      addItem(state, {
        definitionId: 'field_ration',
        quantity: 2,
        targetContainerIds: [BACKPACK],
        allOrNothing: true,
      }),
      'seed ration',
    );

    const refused = discardStack(state, { containerId: HOTBAR, slotIndex: 0 });

    expect(refused.result.ok).toBe(false);
    expect(refused.result.ok ? '' : refused.result.reason).toBe(
      'not_discardable',
    );

    state = apply(
      discardStack(state, { containerId: BACKPACK, slotIndex: 0 }),
      'discard ration',
    );
    expect(computeItemTotals(state)).toEqual({ pry_bar: 1 });
  });

  test('serialisation round-trip and legacy migration', () => {
    let state = createInitialInventoryState();

    state = apply(
      addItem(state, {
        definitionId: 'field_ration',
        quantity: 6,
        targetContainerIds: [BACKPACK],
        allOrNothing: true,
      }),
      'seed a',
    );
    state = apply(
      addItem(state, {
        definitionId: 'fuse_contact',
        quantity: 3,
        targetContainerIds: [STORAGE],
        allOrNothing: true,
      }),
      'seed b',
    );

    const snapshot = toSnapshot(state);
    const loaded = loadSnapshot(JSON.parse(JSON.stringify(snapshot)));

    expect(loaded.result.ok).toBe(true);
    expect(toSnapshot(loaded.state)).toEqual(snapshot);

    // Bounded legacy migration: pre-foundation ten-slot belt shape.
    const migrated = loadSnapshot({
      slots: [
        'field_scanner',
        null,
        'pry_bar',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
      selected_index: 2,
    });

    expect(migrated.result.ok).toBe(true);
    expect(slotDef(migrated.state, HOTBAR, 0)).toEqual({
      definitionId: 'field_scanner',
      quantity: 1,
    });
    expect(slotDef(migrated.state, HOTBAR, 2)).toEqual({
      definitionId: 'pry_bar',
      quantity: 1,
    });
    expect(migrated.state.hotbarSelection).toBe(2);

    // Malformed snapshots load nothing.
    for (const bad of [
      { slots: ['no_such_item'], selected_index: null },
      { schema_version: 'inventory-v1', containers: 'nope' },
      42,
      null,
    ]) {
      expect(loadSnapshot(bad).result.ok).toBe(false);
    }
  });

  test('no duplication or loss across a long mixed operation sequence', () => {
    let state = createInitialInventoryState();

    for (const [definitionId, quantity] of [
      ['field_ration', 9],
      ['fuse_contact', 7],
      ['wire_spool', 5],
      ['relay_housing', 2],
      ['field_scanner', 1],
    ] as const) {
      state = apply(
        addItem(state, {
          definitionId,
          quantity,
          targetContainerIds: [STORAGE],
          allOrNothing: true,
        }),
        `seed ${definitionId}`,
      );
    }

    const baseline = computeItemTotals(state);

    // A scripted storm of mixed operations, including refused ones.
    const script: ((s: InventoryState) => {
      state: InventoryState;
      result: { ok: boolean };
    })[] = [
      (s) => pickUp(s, { containerId: STORAGE, slotIndex: 0, mode: 'half' }),
      (s) => place(s, { containerId: BACKPACK, slotIndex: 0 }),
      (s) =>
        quickTransfer(s, {
          containerId: STORAGE,
          slotIndex: 1,
          targetContainerIds: [BACKPACK, HOTBAR],
        }),
      (s) => pickUp(s, { containerId: BACKPACK, slotIndex: 0, mode: 'one' }),
      (s) => place(s, { containerId: HOTBAR, slotIndex: 3 }),
      (s) => pickUp(s, { containerId: STORAGE, slotIndex: 2, mode: 'all' }),
      (s) => place(s, { containerId: STORAGE, slotIndex: 3 }), // swap
      (s) => sortContainer(s, { containerId: STORAGE }),
      (s) => pickUp(s, { containerId: STORAGE, slotIndex: 0, mode: 'all' }),
      (s) => place(s, { containerId: CONTAINER_IDS.m02Desk, slotIndex: 0 }), // refused
      (s) => cancelHeld(s),
      (s) =>
        quickTransfer(s, {
          containerId: BACKPACK,
          slotIndex: 0,
          targetContainerIds: [STORAGE],
        }),
      (s) => sortContainer(s, { containerId: BACKPACK }),
      (s) => pickUp(s, { containerId: HOTBAR, slotIndex: 3, mode: 'all' }),
      (s) => cancelHeld(s),
    ];

    for (const step of script) {
      const outcome = step(state);

      // Refusals are fine; state corruption is not.
      state = outcome.state;
      expect(validateInvariants(state)).toBeNull();
      expect(computeItemTotals(state)).toEqual(baseline);
    }

    expect(state.held).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * Part 2 — participant input (real pointer + keyboard in the browser)
 * ------------------------------------------------------------------ */

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
  detail_text: string | null;
  feedback: string | null;
  slots: ProbeSlot[];
  buttons: ProbeButton[];
}

async function bootLab(page: Page, tag: string) {
  await page.goto(
    `/?scene=inventory_lab&participant_id=PT_INV_${tag}&game_session_id=GS_INV_${tag}`,
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
      ((
        window as unknown as {
          __inventoryUiProbe?: { open: boolean } | null;
        }
      ).__inventoryUiProbe?.open ?? false) === expected,
    open,
    { timeout: 8_000 },
  );
  await page.waitForTimeout(150);
}

/** Maps 800×600 game coordinates to page coordinates (FIT scale). */
async function gamePoint(page: Page, x: number, y: number) {
  // V4: design space → page through the shared helper (__designSpace).
  return designToPage(page, x, y);
}

function slotEntry(
  probe: UiProbe,
  containerId: string,
  slotIndex: number,
): ProbeSlot {
  const entry = probe.slots.find(
    (slot) =>
      slot.container_id === containerId && slot.slot_index === slotIndex,
  );

  if (entry === undefined) {
    throw new Error(`slot ${containerId}[${slotIndex}] not in probe`);
  }

  return entry;
}

async function slotCenter(page: Page, containerId: string, slotIndex: number) {
  const probe = (await uiProbe(page))!;
  const entry = slotEntry(probe, containerId, slotIndex);

  return gamePoint(page, entry.x + entry.w / 2, entry.y + entry.h / 2);
}

async function clickSlot(
  page: Page,
  containerId: string,
  slotIndex: number,
  options?: { button?: 'left' | 'right'; shift?: boolean },
) {
  const point = await slotCenter(page, containerId, slotIndex);

  if (options?.shift) {
    await page.keyboard.down('Shift');
  }

  await page.mouse.click(point.x, point.y, {
    button: options?.button ?? 'left',
  });

  if (options?.shift) {
    await page.keyboard.up('Shift');
  }

  await page.waitForTimeout(160);
}

async function dragSlotToSlot(
  page: Page,
  from: { containerId: string; slotIndex: number },
  to: { containerId: string; slotIndex: number },
) {
  const fromPoint = await slotCenter(page, from.containerId, from.slotIndex);
  const toPoint = await slotCenter(page, to.containerId, to.slotIndex);

  await page.mouse.move(fromPoint.x, fromPoint.y);
  await page.mouse.down();
  await page.mouse.move(fromPoint.x + 10, fromPoint.y + 10, { steps: 3 });
  await page.mouse.move(toPoint.x, toPoint.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function pressKey(page: Page, keyName: string) {
  await page.keyboard.press(keyName);
  await page.waitForTimeout(130);
}

/** Held key for player movement (Phaser JustDown/velocity needs ≥150ms). */
async function holdKey(page: Page, keyName: string, ms: number) {
  await page.keyboard.down(keyName);
  await page.waitForTimeout(ms);
  await page.keyboard.up(keyName);
  await page.waitForTimeout(120);
}

async function playerX(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number } | null })
        .__playerProbe?.x ?? -1,
  );
}

/** Walks to a station and interacts (position-synced, never timed legs). */
async function walkAndInteract(page: Page, x: number, y: number) {
  // Route via the open y=300 lane: the row-5/row-11 rail stubs clip the
  // player body when walking east-west at station height, so every leg
  // is vertical-open by construction (see the Lab layout grid).
  await driveAxisTo(page, 'y', 300, 8);
  await driveAxisTo(page, 'x', x, 8);
  await driveAxisTo(page, 'y', y, 8);
  await holdKey(page, 'e', 160);
}

function playerSlots(probe: UiProbe): ProbeSlot[] {
  return probe.slots.filter(
    (slot) =>
      slot.container_id === 'player_backpack' ||
      slot.container_id === 'player_hotbar',
  );
}

test.describe('participant input', () => {
  test('I opens and closes the inventory; world movement and actions are blocked while open', async ({
    page,
  }) => {
    await bootLab(page, 'TOGGLE');

    // Closed → open.
    await pressKey(page, 'i');
    await waitOverlayOpen(page, true);

    const probe = (await uiProbe(page))!;

    expect(probe.mode).toBe('backpack');

    // Arrow keys must not move the player while the overlay is open.
    const xBefore = await playerX(page);

    await holdKey(page, 'ArrowRight', 350);
    expect(await playerX(page)).toBe(xBefore);

    // E must not trigger world interactions underneath.
    await holdKey(page, 'e', 160);
    expect((await uiProbe(page))!.open).toBe(true);
    expect((await uiProbe(page))!.mode).toBe('backpack');

    // Open → closed, and world input resumes.
    await pressKey(page, 'i');
    await waitOverlayOpen(page, false);
    await holdKey(page, 'ArrowRight', 350);
    expect(await playerX(page)).toBeGreaterThan(xBefore);
  });

  test('I opens and closes the overlay in every four-zone route scene; default route unchanged', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    for (const zone of [
      'station_concourse',
      'diagnostics_laboratory',
      'exterior_recovery_yard',
      'utility_core_deck',
    ]) {
      await page.goto(
        `/?scene=${zone}&participant_id=PT_INV_Z&game_session_id=GS_INV_Z_${zone}`,
      );
      await page.waitForFunction(
        (expected) =>
          (window as unknown as { __playerProbe?: { scene: string } | null })
            .__playerProbe?.scene === expected,
        zone,
        { timeout: 60_000 },
      );
      await page.waitForTimeout(300);

      await pressKey(page, 'i');
      await waitOverlayOpen(page, true);

      const xBefore = await playerX(page);

      await holdKey(page, 'ArrowRight', 300);
      expect(await playerX(page)).toBe(xBefore);

      await pressKey(page, 'i');
      await waitOverlayOpen(page, false);
      await holdKey(page, 'ArrowRight', 300);

      let xAfter = await playerX(page);

      if (xAfter === xBefore) {
        // A wall may block rightward movement at this spawn; the strict
        // resume proof then comes from the opposite direction.
        await holdKey(page, 'ArrowLeft', 300);
        xAfter = await playerX(page);
      }

      expect(xAfter).not.toBe(xBefore);
    }

    // The participant default launch is the Dock (pilot route), no overlay.
    await page.goto('/?participant_id=PT_INV_D&game_session_id=GS_INV_D');
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'dock',
      undefined,
      { timeout: 60_000 },
    );
    expect(await uiProbe(page).then((probe) => probe?.open ?? false)).toBe(
      false,
    );
  });

  test('real pointer drag transfers a stack, with ghost, placeholder and snap', async ({
    page,
  }) => {
    await bootLab(page, 'DRAG');

    // Open the storage locker side-by-side view.
    await walkAndInteract(page, 400, 200);
    await waitOverlayOpen(page, true);
    expect((await uiProbe(page))!.mode).toBe('container');

    const before = (await uiProbe(page))!;
    const source = slotEntry(before, 'lab_storage', 0);

    expect(source.definition_id).not.toBeNull();

    // Begin the drag and assert MID-DRAG state: dragging flag, held
    // stack (the ghost's content) and the source slot as a placeholder.
    const fromPoint = await slotCenter(page, 'lab_storage', 0);
    const toPoint = await slotCenter(page, 'player_backpack', 0);

    await page.mouse.move(fromPoint.x, fromPoint.y);
    await page.mouse.down();
    await page.mouse.move(fromPoint.x + 12, fromPoint.y + 12, { steps: 4 });
    await page.waitForTimeout(200);

    const midDrag = (await uiProbe(page))!;

    expect(midDrag.dragging).toBe(true);
    expect(midDrag.held).toEqual({
      definition_id: source.definition_id,
      quantity: source.quantity,
    });
    expect(slotEntry(midDrag, 'lab_storage', 0).definition_id).toBeNull();

    // Complete the drop on an empty backpack slot.
    await page.mouse.move(toPoint.x, toPoint.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const after = (await uiProbe(page))!;

    expect(after.dragging).toBe(false);
    expect(after.held).toBeNull();
    expect(slotEntry(after, 'player_backpack', 0)).toMatchObject({
      definition_id: source.definition_id,
      quantity: source.quantity,
    });
    expect(slotEntry(after, 'lab_storage', 0).definition_id).toBeNull();
  });

  test('an invalid pointer drop returns the stack to its source', async ({
    page,
  }) => {
    await bootLab(page, 'BADDROP');
    await walkAndInteract(page, 400, 200);
    await waitOverlayOpen(page, true);

    const before = (await uiProbe(page))!;
    const source = slotEntry(before, 'lab_storage', 0);
    const fromPoint = await slotCenter(page, 'lab_storage', 0);
    const outside = await gamePoint(page, 20, 580); // dim margin, no slot

    await page.mouse.move(fromPoint.x, fromPoint.y);
    await page.mouse.down();
    await page.mouse.move(fromPoint.x + 12, fromPoint.y + 12, { steps: 4 });
    await page.mouse.move(outside.x, outside.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const after = (await uiProbe(page))!;

    expect(after.held).toBeNull();
    expect(slotEntry(after, 'lab_storage', 0)).toMatchObject({
      definition_id: source.definition_id,
      quantity: source.quantity,
    });
  });

  test('right-click takes one, shift+right-click takes half, both place normally', async ({
    page,
  }) => {
    await bootLab(page, 'SPLIT');
    await walkAndInteract(page, 400, 200);
    await waitOverlayOpen(page, true);

    // Storage slot 0 is the seeded 4× Field Ration stack.
    const seed = slotEntry((await uiProbe(page))!, 'lab_storage', 0);

    expect(seed).toMatchObject({ definition_id: 'field_ration', quantity: 4 });

    // Right-click: hold exactly one.
    await clickSlot(page, 'lab_storage', 0, { button: 'right' });

    let probe = (await uiProbe(page))!;

    expect(probe.held).toEqual({ definition_id: 'field_ration', quantity: 1 });
    expect(slotEntry(probe, 'lab_storage', 0).quantity).toBe(3);

    // Click an empty backpack slot to place the single item.
    await clickSlot(page, 'player_backpack', 0);
    probe = (await uiProbe(page))!;
    expect(probe.held).toBeNull();
    expect(slotEntry(probe, 'player_backpack', 0)).toMatchObject({
      definition_id: 'field_ration',
      quantity: 1,
    });

    // Shift+right-click: hold half (ceil(3/2) = 2).
    await clickSlot(page, 'lab_storage', 0, { button: 'right', shift: true });
    probe = (await uiProbe(page))!;
    expect(probe.held).toEqual({ definition_id: 'field_ration', quantity: 2 });

    // Place onto the existing single: merges to 3.
    await clickSlot(page, 'player_backpack', 0);
    probe = (await uiProbe(page))!;
    expect(probe.held).toBeNull();
    expect(slotEntry(probe, 'player_backpack', 0).quantity).toBe(3);
    expect(slotEntry(probe, 'lab_storage', 0).quantity).toBe(1);
  });

  test('shift-click quick-transfers between container and player', async ({
    page,
  }) => {
    await bootLab(page, 'QT');
    await walkAndInteract(page, 400, 200);
    await waitOverlayOpen(page, true);

    const seed = slotEntry((await uiProbe(page))!, 'lab_storage', 1);

    await clickSlot(page, 'lab_storage', 1, { shift: true });

    let probe = (await uiProbe(page))!;

    expect(slotEntry(probe, 'lab_storage', 1).definition_id).toBeNull();

    const landed = playerSlots(probe).find(
      (slot) => slot.definition_id === seed.definition_id,
    );

    expect(landed).toBeDefined();
    expect(landed!.quantity).toBe(seed.quantity);

    // And back again: shift-click the landed stack.
    await clickSlot(page, landed!.container_id, landed!.slot_index, {
      shift: true,
    });
    probe = (await uiProbe(page))!;
    expect(
      playerSlots(probe).find(
        (slot) => slot.definition_id === seed.definition_id,
      ),
    ).toBeUndefined();
    expect(
      probe.slots.filter(
        (slot) =>
          slot.container_id === 'lab_storage' &&
          slot.definition_id === seed.definition_id,
      ).length,
    ).toBeGreaterThan(0);
  });

  test('keyboard-only transfer and split produce the same state as the mouse path', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    // Mouse run: drag storage slot 0 to backpack slot 0.
    await bootLab(page, 'EQ_M');
    await walkAndInteract(page, 400, 200);
    await waitOverlayOpen(page, true);
    await dragSlotToSlot(
      page,
      { containerId: 'lab_storage', slotIndex: 0 },
      { containerId: 'player_backpack', slotIndex: 0 },
    );

    const mouseResult = (await uiProbe(page))!.slots.map((slot) => ({
      container: slot.container_id,
      index: slot.slot_index,
      definition: slot.definition_id,
      quantity: slot.quantity,
    }));

    // Keyboard run in a FRESH session: same logical operation with
    // arrows + space only. Grid order: backpack(20) → hotbar(10) →
    // storage(20); storage slot 0 is 30 steps right of backpack slot 0.
    await bootLab(page, 'EQ_K');
    await walkAndInteract(page, 400, 200);
    await waitOverlayOpen(page, true);

    for (let step = 0; step < 30; step++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(35);
    }

    let probe = (await uiProbe(page))!;

    expect(probe.focus).toEqual({ container_id: 'lab_storage', slot_index: 0 });
    await pressKey(page, 'Space'); // pick up
    probe = (await uiProbe(page))!;
    expect(probe.held).not.toBeNull();

    for (let step = 0; step < 30; step++) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(35);
    }

    await pressKey(page, 'Space'); // place
    probe = (await uiProbe(page))!;
    expect(probe.held).toBeNull();

    const keyboardResult = probe.slots.map((slot) => ({
      container: slot.container_id,
      index: slot.slot_index,
      definition: slot.definition_id,
      quantity: slot.quantity,
    }));

    expect(keyboardResult).toEqual(mouseResult);

    // Keyboard split: S on the moved stack (4 rations → hold 2), place
    // on the next slot with Space.
    probe = (await uiProbe(page))!;
    expect(probe.focus).toEqual({
      container_id: 'player_backpack',
      slot_index: 0,
    });
    await pressKey(page, 's');
    probe = (await uiProbe(page))!;
    expect(probe.held).toEqual({ definition_id: 'field_ration', quantity: 2 });
    await pressKey(page, 'ArrowRight');
    await pressKey(page, 'Space');
    probe = (await uiProbe(page))!;
    expect(probe.held).toBeNull();
    expect(slotEntry(probe, 'player_backpack', 0).quantity).toBe(2);
    expect(slotEntry(probe, 'player_backpack', 1).quantity).toBe(2);

    // ESC cancels a held stack FIRST, then a second ESC closes.
    await pressKey(page, 'Space'); // pick up again (slot 1)
    probe = (await uiProbe(page))!;
    expect(probe.held).not.toBeNull();
    await pressKey(page, 'Escape');
    probe = (await uiProbe(page))!;
    expect(probe.open).toBe(true);
    expect(probe.held).toBeNull();
    expect(slotEntry(probe, 'player_backpack', 1).quantity).toBe(2);
    await pressKey(page, 'Escape');
    await waitOverlayOpen(page, false);
  });

  test('sort button and R key deterministically sort an ordinary container', async ({
    page,
  }) => {
    await bootLab(page, 'SORT');
    await walkAndInteract(page, 400, 200);
    await waitOverlayOpen(page, true);

    const probeBefore = (await uiProbe(page))!;
    const sortButton = probeBefore.buttons.find(
      (button) => button.id === 'sort_lab_storage',
    );

    expect(sortButton).toBeDefined();

    const point = await gamePoint(
      page,
      sortButton!.x + sortButton!.w / 2,
      sortButton!.y + sortButton!.h / 2,
    );

    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(250);

    const sortedOnce = (await uiProbe(page))!.slots
      .filter((slot) => slot.container_id === 'lab_storage')
      .map((slot) => slot.definition_id);

    // Deterministic order: category (tool<component<sample<consumable),
    // then display name, then id — computed from the fixed seed.
    expect(sortedOnce.slice(0, 20)).toEqual([
      'beacon_cell',
      'beacon_cell',
      'filter_cell',
      'filter_cell',
      'fuse_contact',
      'fuse_contact',
      'insulation_wrap',
      'insulation_wrap',
      'relay_housing',
      'relay_housing',
      'seal_cap',
      'seal_cap',
      'spare_gasket',
      'spare_gasket',
      'wire_spool',
      'wire_spool',
      'sample_vial',
      'sample_vial',
      'field_ration',
      'field_ration',
    ]);

    // R key positively sorts the FOCUSED container: put two stacks into
    // the backpack in deliberately unsorted order (consumable before
    // component), focus stays on backpack slot 0 by default, press R,
    // and assert the deterministic category order was applied.
    const rationSlot = (await uiProbe(page))!.slots.find(
      (slot) =>
        slot.container_id === 'lab_storage' &&
        slot.definition_id === 'field_ration',
    )!;

    await clickSlot(page, 'lab_storage', rationSlot.slot_index, {
      shift: true,
    });

    const beaconSlot = (await uiProbe(page))!.slots.find(
      (slot) =>
        slot.container_id === 'lab_storage' &&
        slot.definition_id === 'beacon_cell',
    )!;

    await clickSlot(page, 'lab_storage', beaconSlot.slot_index, {
      shift: true,
    });
    expect(
      slotEntry((await uiProbe(page))!, 'player_backpack', 0),
    ).toMatchObject({ definition_id: 'field_ration' });
    expect(
      slotEntry((await uiProbe(page))!, 'player_backpack', 1),
    ).toMatchObject({ definition_id: 'beacon_cell' });

    await pressKey(page, 'r');

    const backpackSorted = (await uiProbe(page))!;

    expect(slotEntry(backpackSorted, 'player_backpack', 0)).toMatchObject({
      definition_id: 'beacon_cell', // component sorts before consumable
    });
    expect(slotEntry(backpackSorted, 'player_backpack', 1)).toMatchObject({
      definition_id: 'field_ration',
    });

    // The storage container was untouched by the backpack sort.
    const sortedTwice = backpackSorted.slots
      .filter((slot) => slot.container_id === 'lab_storage')
      .map((slot) => slot.definition_id);
    const expectedAfterRemoval = [...sortedOnce];

    expectedAfterRemoval[rationSlot.slot_index] = null;
    expectedAfterRemoval[beaconSlot.slot_index] = null;
    expect(sortedTwice).toEqual(expectedAfterRemoval);

    // Manual-action-only rule: the container never re-sorts by itself —
    // the two holes stay where the stacks were taken from.
    expect(
      slotEntry(backpackSorted, 'lab_storage', rationSlot.slot_index)
        .definition_id,
    ).toBeNull();
  });

  test('full inventory refuses pickup without loss; storage transfer station works end-to-end', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await bootLab(page, 'FULL');

    // 1. Empty the seeded 20-stack locker into the player inventory with
    //    shift-click quick transfers (merges pair the partial stacks).
    await walkAndInteract(page, 400, 200);
    await waitOverlayOpen(page, true);

    for (let index = 0; index < 20; index++) {
      const entry = slotEntry((await uiProbe(page))!, 'lab_storage', index);

      if (entry.definition_id !== null) {
        await clickSlot(page, 'lab_storage', index, { shift: true });
      }
    }

    let probe = (await uiProbe(page))!;

    expect(
      probe.slots.filter(
        (slot) =>
          slot.container_id === 'lab_storage' && slot.definition_id !== null,
      ),
    ).toHaveLength(0);
    expect(
      playerSlots(probe).filter((slot) => slot.definition_id !== null),
    ).toHaveLength(10);

    await pressKey(page, 'i');
    await waitOverlayOpen(page, false);

    // 2. Collect the 12-item salvage cache (12 more singleton slots).
    await walkAndInteract(page, 304, 200);
    await page.waitForTimeout(300);
    await pressKey(page, 'i');
    await waitOverlayOpen(page, true);
    probe = (await uiProbe(page))!;
    expect(
      playerSlots(probe).filter((slot) => slot.definition_id !== null),
    ).toHaveLength(22);

    // 3. Fill the remaining 8 slots by splitting singles off big stacks
    //    (right-click take one → click an empty slot).
    for (let round = 0; round < 8; round++) {
      probe = (await uiProbe(page))!;

      const source = playerSlots(probe).find((slot) => slot.quantity >= 2);
      const empty = playerSlots(probe).find(
        (slot) => slot.definition_id === null,
      );

      if (source === undefined || empty === undefined) {
        break;
      }

      await clickSlot(page, source.container_id, source.slot_index, {
        button: 'right',
      });
      await clickSlot(page, empty.container_id, empty.slot_index);
    }

    probe = (await uiProbe(page))!;
    expect(
      playerSlots(probe).filter((slot) => slot.definition_id !== null),
    ).toHaveLength(30);

    const totalsBefore = await page.evaluate(() => {
      const events = (
        window as unknown as {
          __inventoryUiProbe?: {
            slots: { definition_id: string | null; quantity: number }[];
          };
        }
      ).__inventoryUiProbe!.slots;

      return events
        .filter((slot) => slot.definition_id !== null)
        .reduce((sum, slot) => sum + slot.quantity, 0);
    });

    await pressKey(page, 'i');
    await waitOverlayOpen(page, false);

    // 4. The Component Bundle's relay housing cannot fit (its stack is
    //    at maximum and no slot is free): the pickup is refused and the
    //    bundle keeps the housing — nothing is lost or created.
    await walkAndInteract(page, 88, 200);
    await page.waitForTimeout(300);

    // Fuse contacts merged (2 into the 5-stack → 7/8); the housing
    // stayed behind. Interact again: refusal, and still no loss.
    await holdKey(page, 'e', 160);
    await page.waitForTimeout(300);

    await pressKey(page, 'i');
    await waitOverlayOpen(page, true);
    probe = (await uiProbe(page))!;

    const totalsAfter = playerSlots(probe)
      .filter((slot) => slot.definition_id !== null)
      .reduce((sum, slot) => sum + slot.quantity, 0);

    // +2 fuse contacts came in by merge; the housing never left the
    // bundle and no item vanished.
    expect(totalsAfter).toBe(totalsBefore + 2);
    expect(
      playerSlots(probe).filter((slot) => slot.definition_id !== null),
    ).toHaveLength(30);

    const housingTotal = playerSlots(probe)
      .filter((slot) => slot.definition_id === 'relay_housing')
      .reduce((sum, slot) => sum + slot.quantity, 0);

    expect(housingTotal).toBe(2); // the two from the locker, at max stack
  });

  test('confirmed world drop creates a recoverable bundle', async ({
    page,
  }) => {
    await bootLab(page, 'DROP');

    // Collect the ration box, then set it down through the confirm flow.
    await walkAndInteract(page, 232, 200);
    await page.waitForTimeout(300);
    await pressKey(page, 'i');
    await waitOverlayOpen(page, true);

    let probe = (await uiProbe(page))!;
    const ration = playerSlots(probe).find(
      (slot) => slot.definition_id === 'field_ration',
    );

    expect(ration).toBeDefined();

    // Focus the ration slot with a click, then DELETE opens the confirm.
    await clickSlot(page, ration!.container_id, ration!.slot_index);
    await pressKey(page, 'Delete');
    probe = (await uiProbe(page))!;
    expect(probe.confirm_open).toBe(true);

    const setDown = probe.buttons.find((button) => button.id === 'confirm_yes');

    expect(setDown).toBeDefined();
    expect(setDown!.label).toBe('SET DOWN');

    const point = await gamePoint(
      page,
      setDown!.x + setDown!.w / 2,
      setDown!.y + setDown!.h / 2,
    );

    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(250);

    probe = (await uiProbe(page))!;
    expect(probe.confirm_open).toBe(false);
    expect(
      playerSlots(probe).filter(
        (slot) => slot.definition_id === 'field_ration',
      ),
    ).toHaveLength(0);

    await pressKey(page, 'i');
    await waitOverlayOpen(page, false);
    await page.waitForTimeout(300);

    // The bundle materialised at the player's feet: collect it again.
    await holdKey(page, 'e', 160);
    await page.waitForTimeout(300);
    await pressKey(page, 'i');
    await waitOverlayOpen(page, true);
    probe = (await uiProbe(page))!;

    const recovered = playerSlots(probe).find(
      (slot) => slot.definition_id === 'field_ration',
    );

    expect(recovered).toBeDefined();
    expect(recovered!.quantity).toBe(5);

    // The full cycle is visible in the secondary telemetry.
    const events = await getEvents(page);
    const types = events.map((event) => event.event_type);

    expect(types).toContain('secondary_inventory_world_drop');
    expect(types).toContain('secondary_inventory_world_pickup');
  });

  test('both demonstration recipes assemble through the visible UI, atomically', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await bootLab(page, 'CRAFT');

    // Collect ingredients: Component Bundle + Sample Kit.
    await walkAndInteract(page, 88, 200);
    await page.waitForTimeout(250);
    await driveAxisTo(page, 'x', 160, 8);
    await holdKey(page, 'e', 160);
    await page.waitForTimeout(250);

    // Open the assembly bench.
    await walkAndInteract(page, 656, 200);
    await waitOverlayOpen(page, true);
    expect((await uiProbe(page))!.mode).toBe('workbench');

    let probe = (await uiProbe(page))!;

    // Incomplete recipe consumes nothing: load only the fuse contacts.
    const contacts = playerSlots(probe).find(
      (slot) => slot.definition_id === 'fuse_contact',
    )!;

    await clickSlot(page, contacts.container_id, contacts.slot_index, {
      shift: true,
    });
    probe = (await uiProbe(page))!;
    expect(slotEntry(probe, 'workbench_input', 0)).toMatchObject({
      definition_id: 'fuse_contact',
      quantity: 2,
    });

    const assemble = probe.buttons.find((button) => button.id === 'assemble')!;
    const assemblePoint = await gamePoint(
      page,
      assemble.x + assemble.w / 2,
      assemble.y + assemble.h / 2,
    );

    await page.mouse.click(assemblePoint.x, assemblePoint.y);
    await page.waitForTimeout(250);
    probe = (await uiProbe(page))!;
    expect(slotEntry(probe, 'workbench_input', 0).quantity).toBe(2); // intact
    expect(slotEntry(probe, 'workbench_output', 0).definition_id).toBeNull();

    // Complete it: add the relay housing, assemble.
    const housing = playerSlots(probe).find(
      (slot) => slot.definition_id === 'relay_housing',
    )!;

    await clickSlot(page, housing.container_id, housing.slot_index, {
      shift: true,
    });
    await page.mouse.click(assemblePoint.x, assemblePoint.y);
    await page.waitForTimeout(250);
    probe = (await uiProbe(page))!;
    expect(slotEntry(probe, 'workbench_output', 0)).toMatchObject({
      definition_id: 'fused_relay_cartridge',
      quantity: 1,
    });
    expect(slotEntry(probe, 'workbench_input', 0).definition_id).toBeNull();
    expect(slotEntry(probe, 'workbench_input', 1).definition_id).toBeNull();

    // The output moves normally afterwards.
    await clickSlot(page, 'workbench_output', 0, { shift: true });
    probe = (await uiProbe(page))!;
    expect(
      playerSlots(probe).find(
        (slot) => slot.definition_id === 'fused_relay_cartridge',
      ),
    ).toBeDefined();

    // Second recipe: Sealed Sample from the Sample Kit parts.
    const vial = playerSlots(probe).find(
      (slot) => slot.definition_id === 'sample_vial',
    )!;

    await clickSlot(page, vial.container_id, vial.slot_index, { shift: true });
    probe = (await uiProbe(page))!;

    const cap = playerSlots(probe).find(
      (slot) => slot.definition_id === 'seal_cap',
    )!;

    await clickSlot(page, cap.container_id, cap.slot_index, { shift: true });
    await page.mouse.click(assemblePoint.x, assemblePoint.y);
    await page.waitForTimeout(250);
    probe = (await uiProbe(page))!;
    expect(slotEntry(probe, 'workbench_output', 0)).toMatchObject({
      definition_id: 'sealed_sample',
      quantity: 1,
    });
  });
});
