/**
 * Information Processing Lab — visual evidence capture.
 *
 * Committed frames for docs/verification/screenshots-information-processing.
 * Frames are inspected manually, not diffed; re-running replaces them in
 * place (inventory_visual_capture precedent). Every state is produced
 * with REAL pointer/keyboard input.
 */

import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import {
  bootIpLab,
  composeByClick,
  dragChipToBin,
  rectCenter,
  terminalChip,
  terminalProbe,
  typeCommand,
  waitBufferLength,
  waitTerminalOpen,
  walkAndUseStation,
} from './ipHelpers';

const OUT = 'docs/verification/screenshots-information-processing';

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test('information processing lab visual capture — terminal foundation', async ({
  page,
}) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });

  await bootIpLab(page, { game_session_id: 'GS_IP_CAP_1' });

  // 01 — laboratory overview from the spawn point.
  await shot(page, '01-laboratory-overview');

  // 02 — orientation terminal, untouched.
  await walkAndUseStation(page, 'tutorial');
  await waitTerminalOpen(page, true);
  await shot(page, '02-terminal-orientation-open');

  // 03 — live drag over a valid destination (ghost + highlighted bin).
  const chip = await terminalChip(page, 'T1');
  const probe = await terminalProbe(page);
  const bin = probe.bins.find((candidate) => candidate.id === 'ARCHIVE')!;
  const start = await rectCenter(page, chip);
  const end = await rectCenter(page, bin);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 10, { steps: 3 });
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.waitForTimeout(250);
  expect((await terminalProbe(page)).dragging).toBe(true);
  await shot(page, '03-terminal-drag-valid-target');

  // 04 — same drag over an INVALID target (the buffer area → red snap-back).
  await page.mouse.move(640, 300, { steps: 8 });
  await page.waitForTimeout(200);
  await shot(page, '04-terminal-drag-no-target');
  await page.mouse.up();
  await page.waitForTimeout(300);

  // 05 — mixed buffer: one dragged, one click-composed, one typed; the
  // keyboard command line mid-entry.
  await dragChipToBin(page, 'T1', 'ARCHIVE');
  await waitBufferLength(page, 1);
  await composeByClick(page, ['ROUTE', 'T2', 'RELAY']);
  await waitBufferLength(page, 2);

  for (const char of 'ROUTE T3 ARC') {
    await page.keyboard.press(char === ' ' ? 'Space' : char);
    await page.waitForTimeout(20);
  }

  await page.waitForTimeout(200);
  await shot(page, '05-terminal-keyboard-entry');

  // 06 — refused command feedback in the console (unknown destination).
  for (const char of 'ZZ') {
    await page.keyboard.press(char);
  }

  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  await shot(page, '06-terminal-invalid-command-feedback');

  // 07 — help overlay.
  await typeCommand(page, 'HELP');
  await shot(page, '07-terminal-help');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // 08 — completed orientation (closed record view).
  await typeCommand(page, 'ROUTE T3 ARCHIVE');
  await waitBufferLength(page, 3);
  await typeCommand(page, 'SUBMIT');
  await shot(page, '08-terminal-orientation-complete');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);
});
