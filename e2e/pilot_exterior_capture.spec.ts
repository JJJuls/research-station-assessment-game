/**
 * Exterior Recovery — participant-view visual evidence capture
 * (evidence-led pilot v2, Unit 4).
 *
 * Thirteen participant-view frames (09–21), each produced with REAL
 * keyboard input on the participant route (no developer boot, no state
 * injection) and inspected manually at full resolution. Unit 23: the
 * frames are written OUTSIDE the repository, to the external evidence
 * directory (`U23_CAPTURE_OUT`), with a git-ignored `test-results/`
 * fallback — never into the old committed screenshot folder.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import {
  acceptMast,
  answerOpenCheck,
  answerRigCheck,
  APPROACH,
  captureErrors,
  doMastStage,
  enterYard,
  expectNoRuntimeErrors,
  exteriorProbe,
  faProbe,
  finishAtRig,
  finishOutside,
  openSite,
  powerUpUplink,
  pressExpectingEffect,
  standOnPad,
  startSalvageTally,
  transmitAt,
  waitDisconnect,
  waitMagnetPhase,
  YARD,
} from './exteriorHelpers';
import { press, selectPromptOption } from './helpers';
import {
  chooseFailure,
  digFacing,
  faceCell,
  failFirst,
  keyCellOf,
  openPlot,
  openSeries,
  scanHere,
  walkInsidePlot,
  walkIntoPlot,
} from './m23Helpers';
import { interactAt, pilotProbe, walkTo, yardVia } from './pilotHelpers';
import { surface, waitSurface } from './returnHelpers';

const OUT = process.env.U23_CAPTURE_OUT ?? 'test-results/u23-capture';
const PANEL_SETTLE_MS = 450;

async function shot(page: Page, name: string, settleMs = 450) {
  await page.waitForTimeout(settleMs);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

/** M19 (Unit 21): walks to the coupling's audited approach and opens the panel (SPACE at the station). */
async function openCouplingPanel(page: Page) {
  await yardVia(
    page,
    YARD.coupling.x + APPROACH.coupling.x,
    YARD.coupling.y + APPROACH.coupling.y,
  );
  await interactAt(page, YARD.coupling, { approachOffset: APPROACH.coupling });
  await waitSurface(page, true, 'm19_coupling_panel');
}

/**
 * Keyboard input on the panel: a hotkey, ENTER, or `Tab-<id>` (TAB to the
 * element, then ENTER) — each after the current view settled (the
 * pilot_yard route's driver).
 */
async function panelKeys(page: Page, keys: string[]) {
  for (const key of keys) {
    await page.waitForTimeout(PANEL_SETTLE_MS);

    if (key.startsWith('Tab-')) {
      const id = key.slice(4);

      for (
        let step = 0;
        step < 20 && (await surface(page))?.focus !== id;
        step += 1
      ) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(60);
      }

      expect((await surface(page))?.focus, `TAB reaches ${id}`).toBe(id);
      await page.keyboard.press('Enter');
    } else {
      await page.keyboard.press(key);
    }

    await page.waitForTimeout(150);
  }
}

test('exterior recovery — thirteen participant-view frames', async ({
  page,
}) => {
  test.setTimeout(1_500_000);
  mkdirSync(OUT, { recursive: true });

  const errors = captureErrors(page);

  await enterYard(page, 'cap4');

  // 09 — arrival: apron, airlock sign, objective line, beacon on the coupling.
  await walkTo(page, 420, 250, { yFirst: true });
  await shot(page, '09-exterior-arrival');

  // 10 — M05 occasion 2 (Unit 6): the guy-line flag — offered by Noor after
  // "Ready" (declined by the spine), the job site itself on the apron.
  expect((await exteriorProbe(page)).m05.offered).toBe(true);
  await walkTo(page, YARD.flag.x - 60, YARD.flag.y - 44, { yFirst: true });
  await shot(page, '10-m05-cable-flag');

  // 11 — M19 (Unit 21, the coupling panel): line 1 at its designed
  // obstacle after the check and three settings (the former prompt-based
  // "iced after the third turn" of the retired v2 binding).
  await openCouplingPanel(page);
  await panelKeys(page, [
    'Tab-continue',
    '2',
    'r',
    'Tab-start',
    '1',
    '2',
    '3',
    't',
  ]);
  // The panel's own status line (the host scene's probe is refreshed only
  // once the surface closes).
  expect((await surface(page))?.status).toContain('line 1');
  await shot(page, '11-m19-coupling-obstacle', 200);

  // Finish the panel for the later frames (line 1 restored, line 2 to its
  // obstacle and set aside, FINISH — the pilot_yard route's own key path).
  await panelKeys(page, [
    '4',
    '2',
    't',
    'Tab-next',
    '2',
    '2',
    '2',
    't',
    '2',
    't',
    'n',
    'Enter',
    'Tab-finish',
  ]);
  await waitSurface(page, false);
  expect((await exteriorProbe(page)).m19_panel.window).toBe('closed');

  // 12 — M20: antenna restoration started (feed seated, alignment pending).
  await acceptMast(page);
  await doMastStage(page, 1);
  await doMastStage(page, 2);
  await page.waitForTimeout(2400); // let the stage feedback toast clear
  await openSite(page, 'mast');
  await shot(page, '12-m20-antenna-started');
  await selectPromptOption(page, 1);

  // 13 — M23 (Unit 23): the stake's selector after the brief and both
  // example pages; plot A in work with the pinned scanner readout (no
  // reading, then a reading from the interior).
  await openSeries(page, 'keyboard');
  await shot(page, '13a-m23-plot-selector');
  await openPlot(page, 'plot_a', 'keyboard');
  await walkIntoPlot(page, 'plot_a');
  await shot(page, '13b-m23-plot-a-searching', 150);
  await walkInsidePlot(page, 'plot_a');
  await scanHere(page, 'keyboard');
  await shot(page, '13c-m23-scanner-reading', 150);

  // 14 — the first failed dig and its panel, CONTINUE, the recovery at
  // the plot's keyed cell (the component goes to the field tray).
  await failFirst(page, 'keyboard');
  await shot(page, '14a-m23-first-failure', 200);
  await chooseFailure(page, 'continue', 'keyboard');
  await faceCell(page, await keyCellOf(page, 'plot_a'));
  await digFacing(page, 'keyboard', 'recovered');
  await shot(page, '14b-m23-recovery', 200);

  // 15 — Metal Recovery Yard overview + rig panel.
  await standOnPad(page);
  await shot(page, '15-metal-recovery-yard');

  // 16 — the active timing window (marker, band, hint).
  await startSalvageTally(page);
  await standOnPad(page);
  await pressExpectingEffect(page, 'F');
  await waitMagnetPhase(page, 'timing_window', 10_000);
  await shot(page, '16-m24-timing-window', 120);
  await page.keyboard.press('Space');
  await waitMagnetPhase(page, 'resolved', 15_000).catch(() => undefined);

  // 17 — a cycle result on the magnet.
  await shot(page, '17-m24-cycle-result', 0);
  await waitMagnetPhase(page, 'idle');

  // 18 — explicit depletion (banner + statement + panel).
  for (
    let position = (await faProbe(page)).magnet.deckPosition;
    position < 6;
    position++
  ) {
    await pressExpectingEffect(page, 'F');
    await waitMagnetPhase(page, 'timing_window', 10_000);
    await page.keyboard.press('Space');
    await waitMagnetPhase(page, 'idle');
  }

  expect((await faProbe(page)).magnet.depleted).toBe(true);
  await shot(page, '18-m24-depleted', 200);
  await answerRigCheck(page, 'correct');
  // Close the rig's continuation here, so its cap line never lands in a
  // later frame.
  await finishAtRig(page);

  // 19 — M26 evidence: severed conduit, LINE A ✕ OPEN chips, panel notice.
  await powerUpUplink(page);
  await transmitAt(page, 'uplinkA');
  await waitDisconnect(page);
  await openSite(page, 'panel');
  await shot(page, '19-m26-disconnect-evidence');
  // Unit 12: the open panel IS the expected-outcome check (a right answer).
  await answerOpenCheck(page, 'M26', 'correct');

  await transmitAt(page, 'uplinkB');

  // 20 — the yard state with plot A's component in the field tray and the
  // persisted excavation (the two dug cells) for the report; plot B is
  // untouched.
  const key = await keyCellOf(page, 'plot_a');

  await yardVia(page, key.col * 32 + 16, key.row * 32 + 16 - 40);
  await shot(page, '20-m23-persistent-excavation');

  // 21 — the return route with the persistent antenna state.
  await finishOutside(page);
  await walkTo(page, 342, 240, { yFirst: true });
  await press(page, 'm');
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
        .__pilotMapProbe?.open === true,
    undefined,
    { timeout: 5000 },
  );
  await shot(page, '21a-return-mission-log');
  await press(page, 'Escape');
  await page.waitForTimeout(400);
  await walkTo(page, 342, 262, { yFirst: true });
  expect((await pilotProbe(page))?.objective).toContain('Concourse');
  await shot(page, '21-return-route');

  expectNoRuntimeErrors(errors);
});
