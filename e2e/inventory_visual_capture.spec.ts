/**
 * Interactive inventory foundation — visual evidence capture.
 *
 * Committed frames for docs/verification/screenshots-inventory-foundation.
 * Frames are inspected manually, not diffed; re-running replaces them in
 * place (visual_rebuild_capture precedent). Every state is produced with
 * REAL pointer/keyboard input.
 */

import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { driveAxisTo } from './helpers';

const OUT = 'docs/verification/screenshots-inventory-foundation';

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
  held: { definition_id: string; quantity: number } | null;
  dragging: boolean;
  slots: ProbeSlot[];
  buttons: { id: string; x: number; y: number; w: number; h: number }[];
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function uiProbe(page: Page): Promise<UiProbe> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __inventoryUiProbe?: UiProbe | null })
        .__inventoryUiProbe ?? null,
  );

  if (probe === null) {
    throw new Error('inventory UI probe unavailable');
  }

  return probe;
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

async function gamePoint(page: Page, x: number, y: number) {
  // V4: design space → page through the shared helper (__designSpace).
  return designToPage(page, x, y);
}

async function slotPoint(page: Page, containerId: string, slotIndex: number) {
  const probe = await uiProbe(page);
  const entry = probe.slots.find(
    (slot) =>
      slot.container_id === containerId && slot.slot_index === slotIndex,
  );

  if (entry === undefined) {
    throw new Error(`slot ${containerId}[${slotIndex}] not in probe`);
  }

  return gamePoint(page, entry.x + entry.w / 2, entry.y + entry.h / 2);
}

async function clickButton(page: Page, id: string) {
  const probe = await uiProbe(page);
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

test('inventory foundation visual capture', async ({ page }) => {
  test.setTimeout(420_000);
  mkdirSync(OUT, { recursive: true });

  await page.goto(
    '/?scene=inventory_lab&participant_id=PT_CAP_INV&game_session_id=GS_CAP_INV',
  );
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'inventory_lab',
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(600);

  // Collect two bundles so the personal stores are populated.
  await walkAndInteract(page, 88, 200);
  await page.waitForTimeout(250);
  await driveAxisTo(page, 'x', 232, 8);
  await holdKey(page, 'e', 160);
  await page.waitForTimeout(250);

  // 01 — the inventory overlay, open, with items.
  await page.keyboard.press('i');
  await waitOverlayOpen(page, true);
  await shot(page, '01-inventory-open');
  await page.keyboard.press('i');
  await waitOverlayOpen(page, false);

  // 02/03 — live drag: ghost + placeholder over a valid target, then the
  // same drag hovering an INVALID target (the insert-locked output tray).
  await walkAndInteract(page, 656, 200);
  await waitOverlayOpen(page, true);
  expect((await uiProbe(page)).mode).toBe('workbench');

  const rationPoint = await (async () => {
    const probe = await uiProbe(page);
    const ration = probe.slots.find(
      (slot) => slot.definition_id === 'field_ration',
    );

    if (ration === undefined) {
      throw new Error('ration stack missing');
    }

    return gamePoint(page, ration.x + ration.w / 2, ration.y + ration.h / 2);
  })();
  const inputPoint = await slotPoint(page, 'workbench_input', 0);
  const outputPoint = await slotPoint(page, 'workbench_output', 0);

  await page.mouse.move(rationPoint.x, rationPoint.y);
  await page.mouse.down();
  await page.mouse.move(rationPoint.x + 12, rationPoint.y + 12, { steps: 4 });
  await page.mouse.move(inputPoint.x, inputPoint.y, { steps: 8 });
  await page.waitForTimeout(250);
  expect((await uiProbe(page)).dragging).toBe(true);
  await shot(page, '02-item-being-dragged');

  await page.mouse.move(outputPoint.x, outputPoint.y, { steps: 8 });
  await page.waitForTimeout(250);
  await shot(page, '03-valid-and-invalid-drop-feedback');
  await page.mouse.up(); // drop on the locked output: refused, snaps home
  await page.waitForTimeout(400);

  // 04 — stack split: right-click holds one item (ghost on the cursor).
  await page.mouse.move(rationPoint.x, rationPoint.y);
  await page.mouse.click(rationPoint.x, rationPoint.y, { button: 'right' });
  await page.waitForTimeout(250);
  expect((await uiProbe(page)).held).not.toBeNull();
  await shot(page, '04-stack-split');
  await page.keyboard.press('Escape'); // return the held item
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape'); // close the bench
  await waitOverlayOpen(page, false);

  // 05 — storage container transfer, side by side.
  await walkAndInteract(page, 400, 200);
  await waitOverlayOpen(page, true);
  await shot(page, '05-storage-container-transfer');
  await page.keyboard.press('i');
  await waitOverlayOpen(page, false);

  // 06 — workbench combination: load both ingredients, assemble.
  await walkAndInteract(page, 656, 200);
  await waitOverlayOpen(page, true);

  for (const definitionId of ['fuse_contact', 'relay_housing']) {
    const probe = await uiProbe(page);
    const source = probe.slots.find(
      (slot) =>
        (slot.container_id === 'player_backpack' ||
          slot.container_id === 'player_hotbar') &&
        slot.definition_id === definitionId,
    );

    if (source === undefined) {
      throw new Error(`${definitionId} missing from player stores`);
    }

    const point = await gamePoint(
      page,
      source.x + source.w / 2,
      source.y + source.h / 2,
    );

    await page.keyboard.down('Shift');
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(200);
  }

  await clickButton(page, 'assemble');
  await shot(page, '06-workbench-combination');
  await page.keyboard.press('i');
  await waitOverlayOpen(page, false);

  // 07 — M02 Incident Filing Workstation (docs, folders, reference).
  await walkAndInteract(page, 272, 430);
  await waitOverlayOpen(page, true);
  expect((await uiProbe(page)).mode).toBe('m02');
  await shot(page, '07-m02-filing-workstation');
  await page.keyboard.press('Escape');
  await waitOverlayOpen(page, false);

  // 08 — M03 occasion A with the reset window open.
  await walkAndInteract(page, 384, 430);
  await waitOverlayOpen(page, true);

  for (let cycle = 0; cycle < 3; cycle++) {
    await clickButton(page, 'm03_press');
  }

  await shot(page, '08-m03-reset-opportunity-a');
  await page.keyboard.press('Escape');
  await waitOverlayOpen(page, false);

  // 09 — M03 occasion B (independent, identical starting state).
  await walkAndInteract(page, 620, 430);
  await waitOverlayOpen(page, true);

  for (let cycle = 0; cycle < 3; cycle++) {
    await clickButton(page, 'm03_press');
  }

  await shot(page, '09-m03-reset-opportunity-b');
  await page.keyboard.press('Escape');
  await waitOverlayOpen(page, false);

  // 10 — keyboard focus state: arrows move the visible focus ring.
  await page.keyboard.press('i');
  await waitOverlayOpen(page, true);

  // 20 steps right: through the backpack grid into the first hotbar
  // slot, which holds a collected item — ring + detail both visible.
  for (let step = 0; step < 20; step++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(60);
  }

  await page.waitForTimeout(200);
  await shot(page, '10-keyboard-focus-state');
});
