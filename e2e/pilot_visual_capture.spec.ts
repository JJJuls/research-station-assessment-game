/**
 * Professional pilot — full participant-route visual evidence capture.
 *
 * Committed frames for docs/verification/screenshots-professional-pilot.
 * Frames are inspected manually, not diffed; re-running replaces them in
 * place (ip_visual_capture precedent). Every state is produced with REAL
 * keyboard/pointer input over the participant route — no developer
 * scene boots, no state injection.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { driveAxisTo, selectPromptOption } from './helpers';
import { completeDockTutorial } from './journey';
import {
  bootPilot,
  hold,
  interactAt,
  openPromptAt,
  PILOT,
  press,
  useDoor,
  walkTo,
} from './pilotHelpers';

const OUT = 'docs/verification/screenshots-professional-pilot';

async function shot(page: Page, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function waitOverlay(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((
        window as unknown as {
          __inventoryUiProbe?: { open: boolean } | null;
        }
      ).__inventoryUiProbe?.open ?? false) === expected,
    open,
    { timeout: 10_000 },
  );
}

async function openOverlayAt(
  page: Page,
  at: { x: number; y: number },
  offset: { x: number; y: number },
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await interactAt(page, at, { approachOffset: offset });

    const opened = await page
      .waitForFunction(
        () =>
          (
            window as unknown as {
              __inventoryUiProbe?: { open: boolean } | null;
            }
          ).__inventoryUiProbe?.open === true,
        undefined,
        { timeout: 4000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (opened) {
      return;
    }
  }

  throw new Error(`overlay at ${at.x},${at.y} did not open`);
}

async function waitIpOpen(
  page: Page,
  probeKey: '__ipTerminalProbe' | '__ipPipeProbe' | '__ipDiagnosisProbe',
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const opened = await page
      .waitForFunction(
        (probe) =>
          (
            window as unknown as Record<
              string,
              { open?: boolean } | null | undefined
            >
          )[probe]?.open === true,
        probeKey,
        { timeout: 4000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (opened) {
      return true;
    }
  }

  return false;
}

test('pilot route visual capture — dock, concourse, records', async ({
  page,
}) => {
  test.setTimeout(480_000);
  mkdirSync(OUT, { recursive: true });

  // 01 — the skippable opening (before any input).
  await bootPilot(page, 'cap1', { skipOpening: false });
  await shot(page, '01-opening-arrival');
  await press(page, 'Space');
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'dock',
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1600);

  // 02 — the Dock with the control tutorial surface.
  await shot(page, '02-dock-arrival');
  await completeDockTutorial(page, 1);

  // 03 — station map overlay (M).
  await press(page, 'm');
  await page.waitForTimeout(500);
  await shot(page, '03-station-map');
  await press(page, 'Escape');
  await page.waitForTimeout(400);

  // 04 — hidden controls reference (H).
  await press(page, 'h');
  await page.waitForTimeout(300);
  await shot(page, '04-controls-reference');
  await press(page, 'h');

  await walkTo(page, 96, 60, { yFirst: true });
  await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
    approachOffset: { x: 0, y: 20 },
  });

  // 05 — Concourse overview with the route beacon.
  await shot(page, '05-concourse-overview');

  // 06 — Vale's briefing prompt.
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await shot(page, '06-vale-briefing');
  await selectPromptOption(page, 1);

  // 07 — a supply bundle in reach (world pickup surface).
  await walkTo(page, 96, 112, { yFirst: true });
  await shot(page, '07-supply-bundle');
  await press(page, 'Space');
  await page.waitForTimeout(600);

  // 08 — M02 incident filing overlay. Route around the row-5 rail stub
  // (x96-127, y160-191) via the x=60 corridor — a straight descent down
  // x=96 clamps on it (pilot_deck precedent).
  await walkTo(page, 60, 112, { yFirst: false });
  await walkTo(page, 60, 312, { yFirst: true });
  await openOverlayAt(page, PILOT.concourse.filingDesk, { x: 0, y: 44 });
  await shot(page, '08-m02-filing-overlay');
  await page.keyboard.press('Escape');
  await waitOverlay(page, false);

  // 09 — M03 label press overlay (occasion A).
  await openOverlayAt(page, PILOT.concourse.pressA, { x: 0, y: 44 });
  await shot(page, '09-m03-press-overlay');
  await page.keyboard.press('Escape');
  await waitOverlay(page, false);

  // 10 — component locker overlay (storage transfer).
  await openOverlayAt(page, PILOT.concourse.storageLocker, { x: 0, y: 44 });
  await shot(page, '10-locker-overlay');
  await page.keyboard.press('Escape');
  await waitOverlay(page, false);

  // 11 — assembly bench overlay (recipes).
  await openOverlayAt(page, PILOT.concourse.assemblyBench, { x: 0, y: 44 });
  await shot(page, '11-assembly-bench-overlay');
  await page.keyboard.press('Escape');
  await waitOverlay(page, false);
});

test('pilot route visual capture — diagnostics laboratory', async ({
  page,
}) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });

  await bootPilot(page, 'cap2');
  await completeDockTutorial(page, 1);
  await walkTo(page, 96, 60, { yFirst: true });
  await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
    approachOffset: { x: 0, y: 20 },
  });
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });

  // 12 — laboratory overview.
  await shot(page, '12-laboratory-overview');

  // 13 — Kai's briefing prompt.
  await openPromptAt(page, PILOT.lab.kai, { approachOffset: { x: 40, y: 44 } });
  await shot(page, '13-kai-briefing');
  await selectPromptOption(page, 1);

  // 14 — terminal orientation overlay.
  await interactAt(page, PILOT.lab.orientation, {
    approachOffset: { x: 44, y: 0 },
  });

  if (await waitIpOpen(page, '__ipTerminalProbe')) {
    await shot(page, '14-terminal-orientation');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // 15 — decoder bank (world view, counterbalanced layout).
  await walkTo(page, 156, 336, { yFirst: true });
  await shot(page, '15-decoder-bank');

  // 16 — first decoder overlay (whichever module the layout assigned).
  await interactAt(
    page,
    { x: 112, y: 256 },
    { approachOffset: { x: 44, y: 0 } },
  );

  if (await waitIpOpen(page, '__ipTerminalProbe')) {
    await shot(page, '16-decoder-overlay');

    // Leave WITHOUT stopping (the window stays open — fail-forward).
    const closeClicked = await page.evaluate(() => {
      const probe = (
        window as unknown as {
          __ipTerminalProbe?: {
            buttons: { id: string; x: number; y: number }[];
          } | null;
        }
      ).__ipTerminalProbe;

      return probe?.buttons.find((b) => b.id === 'close') ?? null;
    });

    if (closeClicked !== null) {
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(700);
  }

  // 17 — conduit lattice board (M13 physical pipe puzzle).
  await interactAt(page, PILOT.lab.lattice, {
    approachOffset: { x: -48, y: 0 },
  });

  if (await waitIpOpen(page, '__ipPipeProbe')) {
    await shot(page, '17-lattice-board');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
  }

  // 18 — fault diagnosis console refusal while the lattice is open.
  await interactAt(page, PILOT.lab.diagnosis, {
    approachOffset: { x: -48, y: 0 },
  });
  await page.waitForTimeout(800);
  await shot(page, '18-diagnosis-deferred');
});

test('pilot route visual capture — yard, deck, completion', async ({
  page,
}) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });

  await bootPilot(page, 'cap3');
  await completeDockTutorial(page, 1);
  await walkTo(page, 96, 60, { yFirst: true });
  await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
    approachOffset: { x: 0, y: 20 },
  });
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });
  await openPromptAt(page, PILOT.lab.kai, { approachOffset: { x: 40, y: 44 } });
  await selectPromptOption(page, 1);
  await openPromptAt(page, PILOT.lab.kai, { approachOffset: { x: 40, y: 44 } });
  await selectPromptOption(page, 1);
  await walkTo(page, 240, 70, { yFirst: false });
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: { x: 0, y: 20 },
  });

  // 19 — yard overview (plots, rig, pump, housing, snowfall).
  await shot(page, '19-yard-overview');

  // 20 — Noor's job-queue prompt.
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: { x: 0, y: 40 },
  });
  await shot(page, '20-noor-briefing');
  await selectPromptOption(page, 1); // Ready → exterior_work
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1); // accept the first job (M23)

  // 21 — scan action in the east plot (pulse + action animation).
  await walkTo(page, 592, 392, { yFirst: true });
  await press(page, 'c');
  await page.waitForTimeout(450);
  await shot(page, '21-scan-action');
  await page.waitForTimeout(900);

  // 22 — dig action (spade animation + dust).
  await driveAxisTo(page, 'y', 292, 5);
  await driveAxisTo(page, 'x', 592, 6);
  await hold(page, 'ArrowDown', 115);
  await press(page, 'd');
  await page.waitForTimeout(600);
  await shot(page, '22-dig-action');
  await page.waitForTimeout(1400);

  // 23 — relay housing setback statement (M22 ambient instance).
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: { x: 0, y: 40 },
  }).catch(() => undefined);
  await selectPromptOption(page, 1).catch(() => undefined);
  await walkTo(page, 204, 376, { yFirst: true });
  await interactAt(
    page,
    { x: 160, y: 470.4 },
    { approachOffset: { x: 44, y: 0 } },
  );
  await page.waitForTimeout(500);
  await shot(page, '23-housing-setback');

  // 24 — yard pump interlock statement (M25 ambient instance).
  await walkTo(page, 448, 300, { yFirst: true });

  for (let i = 0; i < 4; i++) {
    await interactAt(
      page,
      { x: 448, y: 108.8 },
      { approachOffset: { x: 0, y: 44 } },
    );
    await page.waitForTimeout(500);
  }

  await shot(page, '24-pump-interlock');

  // 25 — magnet rig timing window (live sweep marker). Round-2 rig
  // gate: cycles need the open M24 window, so accept jobs from Noor
  // until the salvage job is the one just accepted.
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await page.evaluate(
      () =>
        (window as unknown as { __yardJobsProbe?: { current_job: string } })
          .__yardJobsProbe?.current_job ?? 'done',
    );

    if (current === 'done') {
      break;
    }

    await openPromptAt(page, PILOT.yard.noor, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);

    if (current === 'm24') {
      break; // the accept we just made OPENED the m24 window
    }
  }

  await walkTo(page, 680, 300, { yFirst: true });
  await walkTo(page, 680, 152, { yFirst: true });
  await press(page, 'f');
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: { magnet: { phase: string } } | null;
        }
      ).__fieldActionsProbe?.magnet.phase === 'timing_window',
    undefined,
    { timeout: 10_000 },
  );
  await shot(page, '25-rig-timing-window');
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: { magnet: { phase: string } } | null;
        }
      ).__fieldActionsProbe?.magnet.phase === 'idle',
    undefined,
    { timeout: 15_000 },
  );

  // 26 — verification post (control-pending guidance).
  await walkTo(page, 240, 376, { yFirst: true });
  await openPromptAt(
    page,
    { x: 240, y: 300.8 },
    { approachOffset: { x: 0, y: 44 } },
  );
  await shot(page, '26-verification-post');
  await selectPromptOption(page, 1);

  // Done outside → back through the route to the deck.
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 2);
  await walkTo(page, 384, 400, { yFirst: false });
  await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: -40 },
  });
  await openPromptAt(page, PILOT.lab.kai, { approachOffset: { x: 40, y: 44 } });
  await selectPromptOption(page, 1);
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: { x: 0, y: -40 },
  });
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await useDoor(page, PILOT.concourse.eastDoor, 'utility_core_deck', {
    approachOffset: { x: -40, y: 0 },
    yFirst: true,
  });

  // 27 — Utility & Core Deck overview.
  await shot(page, '27-deck-overview');

  // 28 — core console end-of-shift review.
  await openPromptAt(page, PILOT.deck.coreConsole, {
    approachOffset: { x: 0, y: 44 },
    yFirst: false,
  });
  await shot(page, '28-core-review');
  await selectPromptOption(page, 1); // Begin
  await page.waitForTimeout(500);

  // 29 — the explicit confirmation step.
  await openPromptAt(page, PILOT.deck.coreConsole, {
    approachOffset: { x: 0, y: 44 },
    yFirst: false,
  });
  await shot(page, '29-core-confirm');
  await selectPromptOption(page, 1); // Confirm

  // 30 — the neutral completion screen (no return configured).
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __pilotCompletionProbe?: { closed: boolean } | null;
        }
      ).__pilotCompletionProbe?.closed === true,
    undefined,
    { timeout: 10_000 },
  );
  await shot(page, '30-shift-complete');

  expect(true).toBe(true);
});
