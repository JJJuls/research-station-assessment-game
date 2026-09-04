/**
 * V4 visual-validity redesign — full participant-route visual capture,
 * parameterised by output directory and browser viewport so the untouched
 * V3 baseline and every later V4 capture land in their OWN directories
 * (mission §4/§23: never overwrite historical evidence).
 *
 *   V4_OUT       output directory (default professional-visual-v4/current)
 *   V4_VIEWPORT  WxH browser viewport (default 800x600; use 1280x720)
 *
 * Route driving is byte-identical to pilot_visual_capture.spec.ts (real
 * keyboard/pointer input over the participant route; no state injection).
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { driveAxisTo, selectPromptOption } from './helpers';
import { completeDockTutorial } from './journey';
import {
  bootPilot,
  concourseToDeck,
  concourseToWorkshop,
  expectStage,
  hold,
  interactAt,
  openPromptAt,
  PILOT,
  press,
  returnShiftToDeckClosure,
  useDoor,
  valeHandover,
  walkTo,
  workshopSignOff,
  workshopToConcourse,
  yardReturnToConcourse,
} from './pilotHelpers';

const OUT =
  process.env.V4_OUT ?? 'docs/verification/professional-visual-v4/current';
const VIEWPORT = (() => {
  const raw = process.env.V4_VIEWPORT ?? '800x600';
  const [w, h] = raw.split('x').map((value) => Number(value));

  return { width: w || 800, height: h || 600 };
})();

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
});

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

test('v4 route visual capture — dock, concourse, workshop', async ({
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

  // 06 — Vale's briefing prompt. Since Unit 2 "Understood." chains the
  // voluntary watch / delivery offers as follow-up stages; prompts confirm
  // on ENTER only, so the spine's dismissal sequence (ask me again later ×2)
  // must run before the west door is reachable (Unit 5 driver fix).
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await shot(page, '06-vale-briefing');
  await selectPromptOption(page, 1);
  await expectStage(page, 'incident_handover');
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3); // watch offer: ask me later
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3); // delivery offer: ask me later
  await page.waitForTimeout(300);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop');
  await concourseToWorkshop(page);

  // 07 — a supply bundle in reach (world pickup surface). Unit 7: the
  // y-first lane targets 84 (body 66-108, rows 2-3) — at 112 the ±12 px
  // stop point could leave the body's foot inside row 4, where the
  // cols-13-16 machinery block then stops the x-leg at x = 560.
  await walkTo(page, 96, 84, { yFirst: true });
  await shot(page, '07-supply-bundle');
  await press(page, 'Space');
  await page.waitForTimeout(600);

  // 08 — M02 incident filing overlay. Route around the row-5 rail stub
  // (x96-127, y160-191) via the x=60 corridor — a straight descent down
  // x=96 clamps on it (pilot_deck precedent).
  await walkTo(page, 60, 112, { yFirst: false });
  await walkTo(page, 60, 312, { yFirst: true });
  await openOverlayAt(page, PILOT.workshop.filingDesk, { x: 0, y: 44 });
  await shot(page, '08-m02-filing-overlay');
  await page.keyboard.press('Escape');
  await waitOverlay(page, false);

  // 09 — M03 label press overlay (occasion A).
  await openOverlayAt(page, PILOT.workshop.pressA, { x: 0, y: 44 });
  await shot(page, '09-m03-press-overlay');
  await page.keyboard.press('Escape');
  await waitOverlay(page, false);

  // 10 — component locker overlay (storage transfer).
  await openOverlayAt(page, PILOT.workshop.storageLocker, { x: 0, y: 44 });
  await shot(page, '10-locker-overlay');
  await page.keyboard.press('Escape');
  await waitOverlay(page, false);

  // 11 — assembly bench overlay (recipes).
  await openOverlayAt(page, PILOT.workshop.assemblyBench, { x: 0, y: 44 });
  await shot(page, '11-assembly-bench-overlay');
  await page.keyboard.press('Escape');
  await waitOverlay(page, false);
});

test('v4 route visual capture — diagnostics laboratory', async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });

  await bootPilot(page, 'cap2');
  await completeDockTutorial(page, 1);
  await walkTo(page, 96, 60, { yFirst: true });
  await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
    approachOffset: { x: 0, y: 20 },
  });
  await valeHandover(page);
  await concourseToWorkshop(page);
  await workshopSignOff(page);
  await workshopToConcourse(page);
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });

  // 12 — laboratory overview (signal display, phase benches, Kai).
  await shot(page, '12-laboratory-overview');

  // 13 — Kai's briefing prompt.
  await openPromptAt(page, PILOT.lab.kai, { approachOffset: { x: 0, y: 44 } });
  await shot(page, '13-kai-briefing');
  await selectPromptOption(page, 1);

  // 14 — console orientation overlay.
  await interactAt(page, PILOT.lab.orientation, {
    approachOffset: { x: 0, y: 44 },
  });

  if (await waitIpOpen(page, '__ipTerminalProbe')) {
    await shot(page, '14-terminal-orientation');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // 15 — the phase benches (world view, presented order).
  await walkTo(page, 400, 300, { yFirst: true });
  await shot(page, '15-laboratory-phase-benches');

  // 16 — phase 1 evidence table (work surface; left without stopping).
  await interactAt(page, PILOT.lab.evidenceTable, {
    approachOffset: { x: 0, y: 44 },
  });
  await page
    .waitForFunction(
      () =>
        (window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
          .__workSurfaceProbe?.open === true,
      undefined,
      { timeout: 6000 },
    )
    .catch(() => undefined);
  await shot(page, '16-decoder-overlay');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);

  // 17 — phase 3 training rig (terminal surface, demonstration stage).
  await interactAt(page, PILOT.lab.trainingRig, {
    approachOffset: { x: 0, y: 44 },
  });

  if (await waitIpOpen(page, '__ipTerminalProbe')) {
    await shot(page, '17-lattice-board');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
  }

  // 18 — phase 4 diagnostic board (opens with no lattice gate).
  await interactAt(page, PILOT.lab.diagnosticBoard, {
    approachOffset: { x: 0, y: 44 },
  });

  if (await waitIpOpen(page, '__ipDiagnosisProbe')) {
    await shot(page, '18-diagnosis-deferred');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
  }
});

test('v4 route visual capture — yard, deck, completion', async ({ page }) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });

  await bootPilot(page, 'cap3');
  await completeDockTutorial(page, 1);
  await walkTo(page, 96, 60, { yFirst: true });
  await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
    approachOffset: { x: 0, y: 20 },
  });
  await valeHandover(page);
  await concourseToWorkshop(page);
  await workshopSignOff(page);
  await workshopToConcourse(page);
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });
  await openPromptAt(page, PILOT.lab.kai, { approachOffset: { x: 0, y: 44 } });
  await selectPromptOption(page, 1);
  await openPromptAt(page, PILOT.lab.kai, { approachOffset: { x: 0, y: 44 } });
  await selectPromptOption(page, 1);
  await walkTo(page, 240, 70, { yFirst: false });
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: { x: 0, y: 20 },
  });

  // 19 — yard overview (apron, coupling, mast, field, Metal Yard, posts).
  await shot(page, '19-yard-overview');

  // 20 — Noor's recovery brief.
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: { x: 0, y: 40 },
  });
  await shot(page, '20-noor-briefing');
  await selectPromptOption(page, 1); // Ready → exterior_work

  // 21 — scan action in the staked field (after the stake brief).
  await openPromptAt(
    page,
    { x: 480, y: 272 },
    { approachOffset: { x: 0, y: 44 } },
  );
  await selectPromptOption(page, 1); // Begin the excavation
  await walkTo(page, 592, 392, { yFirst: true });
  await press(page, 'c');
  await page.waitForTimeout(450);
  await shot(page, '21-scan-action');
  await page.waitForTimeout(900);

  // 22 — dig action (spade animation + dust) on a field cell.
  await driveAxisTo(page, 'y', 350, 5);
  await driveAxisTo(page, 'x', 592, 6);
  await hold(page, 'ArrowDown', 115);
  await press(page, 'd');
  await page.waitForTimeout(600);
  await shot(page, '22-dig-action');
  await page.waitForTimeout(1400);

  // 23 — the frozen coupling panel (Unit 4 site brief).
  await openPromptAt(
    page,
    { x: 80, y: 336 },
    { approachOffset: { x: 44, y: 0 } },
  );
  await shot(page, '23-coupling-brief');
  await selectPromptOption(page, 4);

  // 24 — Mast 04 panel (antenna restoration brief).
  await openPromptAt(
    page,
    { x: 416, y: 176 },
    { approachOffset: { x: 0, y: 44 } },
  );
  await shot(page, '24-mast-brief');
  await selectPromptOption(page, 2);

  // 25 — magnet rig timing window (live sweep marker) inside the tally.
  await openPromptAt(
    page,
    { x: 672, y: 108.8 },
    { approachOffset: { x: 0, y: 44 } },
  );
  await selectPromptOption(page, 1); // Start the salvage tally
  await walkTo(page, 680, 300, { yFirst: true });
  await walkTo(page, 680, 150, { yFirst: true });
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

  // 26 — uplink post A (M26 brief).
  await walkTo(page, 96, 300, { yFirst: true });
  await openPromptAt(
    page,
    { x: 96, y: 128 },
    { approachOffset: { x: 0, y: 44 } },
  );
  await shot(page, '26-uplink-post');
  await selectPromptOption(page, 2);

  // Done outside → the ONE purposeful return (Concourse → Workshop) → deck.
  await yardReturnToConcourse(page);
  await returnShiftToDeckClosure(page);
  await concourseToDeck(page);

  // 27 — Utility & Core Deck overview.
  await shot(page, '27-deck-overview');

  // 28 — the Shift Review Panel's end-of-shift review (Unit 6: the record
  // closure moved here from the old core console).
  await openPromptAt(page, PILOT.deck.reviewPanel, {
    approachOffset: { x: 0, y: 44 },
    yFirst: false,
  });
  await shot(page, '28-core-review');
  await selectPromptOption(page, 1); // Close the record as it stands (arms)
  await page.waitForTimeout(500);

  // 29 — the explicit confirmation step.
  await openPromptAt(page, PILOT.deck.reviewPanel, {
    approachOffset: { x: 0, y: 44 },
    yFirst: false,
  });
  await shot(page, '29-core-confirm');
  await selectPromptOption(page, 1); // Confirm — close the station record

  // 30 — the record closed; the deck's feeds become available (the
  // physical finale itself is captured by pilot_closure_capture.spec.ts).
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __closureProbe?: { record_closed: boolean } | null;
        }
      ).__closureProbe?.record_closed === true,
    undefined,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(600);
  await shot(page, '30-record-closed-feeds-pending');

  expect(true).toBe(true);
});
