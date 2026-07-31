import { expect, test } from '@playwright/test';

import {
  addInventoryItem,
  getInventoryItems,
  getSelectedInventoryItem,
  hasInventoryItem,
  INVENTORY_CAPACITY,
  isInventoryFull,
  removeInventoryItem,
  resetGameplayInventory,
  selectNextInventoryItem,
  serializeInventory,
} from '../src/gameplay/inventory';
import { GAME_ITEM_REGISTRY, getGameItem } from '../src/gameplay/items';
import {
  acceptTask,
  completeTask,
  declineTask,
  getActiveObjectiveLine,
  getTaskStatus,
  offerTask,
  registerTask,
  resetGameplayTasks,
  serializeTasks,
  setTaskObjective,
} from '../src/gameplay/tasks';
import { PROCEDURAL_TEXTURE_MANIFEST } from '../src/world/proceduralTextures';
import { bootGame } from './helpers';

/**
 * Unit 1 gameplay-foundation coverage (overnight playable prototype).
 *
 * Pure-logic tests run the session-lifetime gameplay modules directly
 * (proc_textures_determinism.spec.ts precedent for importing src modules);
 * the runtime test verifies the DEV probes the HUD layer exposes. Nothing
 * here is research data: inventory/tasks are the gameplay carry/progress
 * layer, deliberately separate from measurement state.
 */

test.describe('gameplay inventory (Unit 1)', () => {
  test.beforeEach(() => resetGameplayInventory());

  test('adds, selects, removes, and reports fullness', () => {
    expect(getInventoryItems()).toEqual([]);
    expect(getSelectedInventoryItem()).toBeNull();

    expect(addInventoryItem('field_scanner')).toBe(true);
    expect(addInventoryItem('excavation_spade')).toBe(true);
    expect(hasInventoryItem('field_scanner')).toBe(true);
    // First added item auto-selects.
    expect(getSelectedInventoryItem()).toBe('field_scanner');

    selectNextInventoryItem();
    expect(getSelectedInventoryItem()).toBe('excavation_spade');
    selectNextInventoryItem();
    expect(getSelectedInventoryItem()).toBe('field_scanner');

    expect(removeInventoryItem('field_scanner')).toBe(true);
    expect(hasInventoryItem('field_scanner')).toBe(false);
    // Selection falls to the next held item.
    expect(getSelectedInventoryItem()).toBe('excavation_spade');
    expect(removeInventoryItem('field_scanner')).toBe(false);
  });

  test('rejects additions when full and unknown item ids always throw', () => {
    const [first] = GAME_ITEM_REGISTRY;

    for (let i = 0; i < INVENTORY_CAPACITY; i++) {
      expect(addInventoryItem(first.item_id)).toBe(true);
    }

    expect(isInventoryFull()).toBe(true);
    expect(addInventoryItem('excavation_spade')).toBe(false);

    expect(() => addInventoryItem('not_a_real_item')).toThrow();
    expect(() => getGameItem('not_a_real_item')).toThrow();
  });

  test('serialises and resets', () => {
    addInventoryItem('sample_case');

    const snapshot = serializeInventory();

    expect(snapshot.slots[0]).toBe('sample_case');
    expect(snapshot.selected_index).toBe(0);
    expect(snapshot.slots).toHaveLength(INVENTORY_CAPACITY);

    resetGameplayInventory();
    expect(getInventoryItems()).toEqual([]);
    expect(serializeInventory().selected_index).toBeNull();
  });

  test('every registry item has a generated icon in the texture manifest', () => {
    for (const item of GAME_ITEM_REGISTRY) {
      expect(
        PROCEDURAL_TEXTURE_MANIFEST[item.icon],
        `missing icon for ${item.item_id}`,
      ).toBeDefined();
    }
  });
});

test.describe('gameplay tasks (Unit 1)', () => {
  test.beforeEach(() => {
    registerTask({
      task_id: 'test_requisition',
      title: 'Field requisition',
      initialObjective: 'Collect the field equipment.',
    });
    registerTask({
      task_id: 'test_survey',
      title: 'Survey run',
      initialObjective: 'Scan the marked sites.',
    });
    resetGameplayTasks();
  });

  test('progresses offered -> accepted -> completed with objective updates', () => {
    expect(getTaskStatus('test_requisition')).toBe('hidden');
    expect(getActiveObjectiveLine()).toBeNull();

    offerTask('test_requisition');
    expect(getTaskStatus('test_requisition')).toBe('offered');
    // Offered-but-unaccepted tasks do not direct the HUD.
    expect(getActiveObjectiveLine()).toBeNull();

    acceptTask('test_requisition');
    expect(getActiveObjectiveLine()).toBe(
      'Field requisition: Collect the field equipment.',
    );

    setTaskObjective('test_requisition', 'Deliver the kit to the survey site.');
    expect(getActiveObjectiveLine()).toBe(
      'Field requisition: Deliver the kit to the survey site.',
    );

    completeTask('test_requisition');
    expect(getTaskStatus('test_requisition')).toBe('completed');
    expect(getActiveObjectiveLine()).toBeNull();
  });

  test('objective line follows registration order and decline is terminal-safe', () => {
    acceptTask('test_survey');
    acceptTask('test_requisition');
    // Registration order wins, not acceptance order.
    expect(getActiveObjectiveLine()).toBe(
      'Field requisition: Collect the field equipment.',
    );

    completeTask('test_requisition');
    expect(getActiveObjectiveLine()).toBe('Survey run: Scan the marked sites.');

    offerTask('test_requisition');
    // A completed task can be re-offered but never leaves completed.
    expect(getTaskStatus('test_requisition')).toBe('completed');

    resetGameplayTasks();
    offerTask('test_survey');
    declineTask('test_survey');
    expect(getTaskStatus('test_survey')).toBe('declined');
    expect(serializeTasks().map((task) => task.status)).toEqual([
      'hidden',
      'declined',
    ]);
  });
});

test.describe('gameplay HUD probes (Unit 1)', () => {
  test('boot exposes an empty inventory probe and no quest objective', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'PT_GAMEPLAY_FOUNDATION',
      game_session_id: 'GS_GAMEPLAY_FOUNDATION',
    });

    const probes = await page.evaluate(() => ({
      inventory: window.__inventoryProbe ?? null,
      quest: window.__questObjectiveText ?? null,
    }));

    expect(probes.inventory).not.toBeNull();
    expect(probes.inventory!.slots).toHaveLength(10);
    expect(probes.inventory!.slots.every((slot) => slot === null)).toBe(true);
    expect(probes.inventory!.selected_index).toBeNull();
    expect(probes.quest).toBeNull();
  });
});
