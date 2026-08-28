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
  clickDiagnosisButton,
  clickDiagnosisPanel,
  clickDiagnosisRun,
  clickHypothesis,
  clickPipeButton,
  clickTerminalButton,
  composeByClick,
  dragChipToBin,
  dragChipToChip,
  dragPieceToCell,
  pipeBenchPiece,
  pipeCell,
  pipeProbe,
  rectCenter,
  rightClickRect,
  terminalChip,
  terminalProbe,
  typeCommand,
  waitBufferLength,
  waitCellPiece,
  waitDiagnosisOpen,
  waitPipeOpen,
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

test('information processing lab visual capture — lattice bench and diagnosis console', async ({
  page,
}) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });

  await bootIpLab(page, { game_session_id: 'GS_IP_CAP_2', ip_form: 'A' });

  // 09 — M13 untouched board.
  await walkAndUseStation(page, 'm13');
  await waitPipeOpen(page, true);
  await shot(page, '09-m13-lattice-untouched');

  // 10 — active manipulation: a piece mid-drag over a valid mount, with
  // two pieces already seated and one rotated.
  await dragPieceToCell(page, 'el1', 'A2');
  await waitCellPiece(page, 'A2', 'el1', 0);

  for (let turn = 0; turn < 3; turn++) {
    await rightClickRect(page, await pipeCell(page, 'A2'));
  }

  await dragPieceToCell(page, 'el2', 'A1');
  await waitCellPiece(page, 'A1', 'el2', 0);
  await rightClickRect(page, await pipeCell(page, 'A1'));

  const valve = await pipeBenchPiece(page, 'va1');
  const target = await pipeCell(page, 'B1');
  const from = await rectCenter(page, { ...valve, y: valve.y - 8 });
  const to = await rectCenter(page, target);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 12, from.y + 10, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.waitForTimeout(250);
  expect((await pipeProbe(page)).dragging).toBe(true);
  await shot(page, '10-m13-active-manipulation-drag');

  // 11 — invalid target: the same drag held over the fractured mount.
  const broken = await rectCenter(page, await pipeCell(page, 'B2'));

  await page.mouse.move(broken.x, broken.y, { steps: 8 });
  await page.waitForTimeout(250);
  await shot(page, '11-m13-invalid-target-feedback');
  await page.mouse.up();
  await page.waitForTimeout(300);

  // 12 — keyboard interaction state: focus ring on a mount with a
  // keyboard-held piece hovering above it.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  await page.keyboard.press('ArrowRight'); // bench el3? (row0 col2 = el1 gone → empty); move on
  await page.keyboard.press('ArrowDown'); // bench row1 col2 = el4
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await shot(page, '12-m13-keyboard-held-piece');
  await page.keyboard.press('Escape'); // cancel held
  await page.waitForTimeout(200);

  // 13 — valid submitted network.
  await dragPieceToCell(page, 'va1', 'B1');
  await waitCellPiece(page, 'B1', 'va1', 0);
  await dragPieceToCell(page, 'el3', 'C1');
  await waitCellPiece(page, 'C1', 'el3', 0);
  await rightClickRect(page, await pipeCell(page, 'C1'));
  await rightClickRect(page, await pipeCell(page, 'C1'));
  await dragPieceToCell(page, 'el4', 'C2');
  await waitCellPiece(page, 'C2', 'el4', 0);
  await clickPipeButton(page, 'submit');
  await page.waitForTimeout(300);
  expect((await pipeProbe(page)).closed).toBe(true);
  await shot(page, '13-m13-valid-submitted-network');
  await page.keyboard.press('Escape');
  await waitPipeOpen(page, false);

  // 14 — M18 evidence view (panel read, test run).
  await walkAndUseStation(page, 'm18');
  await waitDiagnosisOpen(page, true);
  await shot(page, '14-m18-console-entry');
  await clickDiagnosisPanel(page, 'pressure_map');
  await clickDiagnosisRun(page, 'hold_test');
  await shot(page, '15-m18-evidence-and-test-readout');

  // 16 — hypothesis interaction: one ruled out, one selected, rules open.
  await clickHypothesis(page, 'intake_sensor_fault', 'reject');
  await clickHypothesis(page, 'intake_segment_leak', 'select');
  await shot(page, '16-m18-hypothesis-interaction');
  await clickDiagnosisButton(page, 'rules');
  await shot(page, '16b-m18-rules-reference');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await clickDiagnosisButton(page, 'submit');
  await page.waitForTimeout(300);
  await shot(page, '17-m18-diagnosis-logged');
  await page.keyboard.press('Escape');
  await waitDiagnosisOpen(page, false);
});

test('information processing lab visual capture — packet saturation and layered cipher', async ({
  page,
}) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });

  await bootIpLab(page, { game_session_id: 'GS_IP_CAP_3', ip_form: 'A' });

  // Orientation first (valid entry state), then the two decoder stations.
  await walkAndUseStation(page, 'tutorial');
  await waitTerminalOpen(page, true);
  await dragChipToBin(page, 'T1', 'ARCHIVE');
  await waitBufferLength(page, 1);
  await typeCommand(page, 'ROUTE T2 RELAY');
  await typeCommand(page, 'ROUTE T3 ARCHIVE');
  await waitBufferLength(page, 3);
  await typeCommand(page, 'SUBMIT');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // 18 — M14 packet saturation: intake stage, partly routed.
  await walkAndUseStation(page, 'm14');
  await waitTerminalOpen(page, true);
  await dragChipToBin(page, 'Q1', 'ARCHIVE');
  await typeCommand(page, 'ROUTE Q2 RELAY');
  await typeCommand(page, 'ROUTE Q3 HOLD');
  await typeCommand(page, 'ROUTE Q4 RELAY');
  await waitBufferLength(page, 4);
  await clickTerminalButton(page, 'submit');
  await clickTerminalButton(page, 'BEGIN');
  await dragChipToBin(page, 'P1', 'RELAY');
  await dragChipToBin(page, 'P2', 'ARCHIVE');
  await typeCommand(page, 'ROUTE P3 RELAY');
  await typeCommand(page, 'ROUTE P4 ARCHIVE');
  await typeCommand(page, 'ROUTE P5 HOLD');
  await waitBufferLength(page, 5);
  await shot(page, '18-m14-packet-saturation-intake');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // 19 — M15 layered cipher: two keys paired, shift pending; codebook.
  await walkAndUseStation(page, 'm15');
  await waitTerminalOpen(page, true);
  await dragChipToChip(page, 'F3', 'F2');
  await waitBufferLength(page, 1);
  await typeCommand(page, 'PAIR F1 F5');
  await waitBufferLength(page, 2);
  await shot(page, '19-m15-layered-cipher-reconstruction');
  await clickTerminalButton(page, 'reference');
  await shot(page, '19b-m15-codebook-reference');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);
});

test('information processing lab visual capture — protocol update and syntax trainer', async ({
  page,
}) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });

  await bootIpLab(page, { game_session_id: 'GS_IP_CAP_4', ip_form: 'A' });

  // 20 — M16 new-rule reveal; 21 — M16 application in progress.
  await walkAndUseStation(page, 'm16');
  await waitTerminalOpen(page, true);
  await dragChipToBin(page, 'B1', 'ARCHIVE');
  await typeCommand(page, 'ROUTE B2 RELAY');
  await typeCommand(page, 'ROUTE B3 ARCHIVE');
  await waitBufferLength(page, 3);
  await clickTerminalButton(page, 'submit');
  await clickTerminalButton(page, 'READY');
  await shot(page, '20-m16-new-rule-reveal');
  await clickTerminalButton(page, 'ACKNOWLEDGE');
  await dragChipToBin(page, 'R1', 'RELAY');
  await typeCommand(page, 'ROUTE R2 HOLD');
  await waitBufferLength(page, 2);
  await shot(page, '21-m16-application');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // 22 — M17 practice case (after submission, feedback shown); 23 — the
  // changed transfer case (no corrective feedback).
  await walkAndUseStation(page, 'm17');
  await waitTerminalOpen(page, true);
  await clickTerminalButton(page, 'READY');
  await typeCommand(page, 'ZOR A B');
  await composeByClick(page, ['VEK', 'C', 'GRN']);
  await waitBufferLength(page, 2);
  await clickTerminalButton(page, 'submit');
  await shot(page, '22-m17-early-feedback-trial');

  await clickTerminalButton(page, 'NEXT');
  await typeCommand(page, 'ZOR A C');
  await waitBufferLength(page, 1);
  await shot(page, '23-m17-transfer-trial');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // 24 — final laboratory state after the suite.
  await shot(page, '24-laboratory-after-suite');
});
