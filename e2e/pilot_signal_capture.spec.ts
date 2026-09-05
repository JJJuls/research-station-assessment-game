/**
 * Signal-analysis incident — participant-view visual evidence capture
 * (evidence-led pilot v2, Unit 3).
 *
 * Committed frames for docs/verification/screenshots-evidence-led-pilot-v2.
 * Frames are inspected manually at full resolution, not diffed; re-running
 * replaces them in place. Every state is produced with REAL keyboard /
 * pointer input on the participant route — no developer scene boots, no
 * state injection. Captures: arrival + briefing, the M15 causal-model
 * work, the M16 protocol reference + command surface, the M17
 * demonstration / practice, the M17 transfer case, the M18 hypothesis
 * diagnosis, and the completed incident with the changed laboratory.
 */
// V4: the 800×600 design space sits at canvas (160 + 1.2x, 1.2y) on the
// 1280×720 canvas (src/world/viewport.ts; DEV probe window.__designSpace).
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { selectPromptOption } from './helpers';
import {
  clickDiagnosisButton,
  clickDiagnosisPanel,
  clickDiagnosisRun,
  clickHypothesis,
  clickTerminalButton,
  composeByClick,
  diagnosisProbe,
  dragChipToBin,
  terminalProbe,
  typeCommand,
  waitBufferLength,
  waitDiagnosisOpen,
  waitTerminalOpen,
} from './ipHelpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  interactAt,
  openPromptAt,
  PILOT,
  pilotProbe,
  press,
  routeToLabWork,
  walkTo,
} from './pilotHelpers';

// V4: an explicit output directory keeps the historical v2 evidence
// untouched when the capture is re-run for a later visual pass.
const OUT =
  process.env.PILOT_SIGNAL_OUT ??
  'docs/verification/screenshots-evidence-led-pilot-v2';
const BELOW = { x: 0, y: 44 } as const;

async function shot(page: Page, name: string) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

interface SurfaceProbe {
  open: boolean;
  elements: { id: string; x: number; y: number }[];
}

async function clickElement(page: Page, id: string) {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __workSurfaceProbe?: SurfaceProbe | null })
        .__workSurfaceProbe ?? null,
  );
  const element = probe?.elements.find((e) => e.id === id);

  if (element === undefined) {
    throw new Error(`surface element ${id} missing`);
  }

  const box = (await page.locator('canvas').boundingBox())!;

  await page.mouse.click(
    box.x + ((160 + element.x * 1.2) * box.width) / 1280,
    box.y + (element.y * 1.2 * box.height) / 720,
  );
  await page.waitForTimeout(220);
}

async function openBench(
  page: Page,
  at: { x: number; y: number },
  probeKey: '__ipTerminalProbe' | '__ipDiagnosisProbe' | '__workSurfaceProbe',
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, at, { approachOffset: BELOW });

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
      .then(() => true)
      .catch(() => false);

    if (opened) {
      await page.waitForTimeout(350);
      return;
    }
  }

  throw new Error(`bench at ${at.x},${at.y} did not open ${probeKey}`);
}

async function waitSurfaceClosed(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
        .__workSurfaceProbe?.open !== true,
    undefined,
    { timeout: 8000 },
  );
  await page.waitForTimeout(300);
}

test('signal incident visual capture — arrival, four phases, completed laboratory', async ({
  page,
}) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });

  const errors = captureErrors(page);

  await bootPilot(page, 'sigcap', { extra: '&ip_form=A' });
  await completeDockTutorial(page, 1);
  await routeToLabWork(page);

  // 01 — arrival: laboratory with the signal display, phase benches, Kai
  // and Noor's intercom subtitle (still on screen right after the briefing).
  await shot(page, '01-signal-arrival');

  // 02 — the workstation's case brief.
  await openPromptAt(page, PILOT.lab.workstation, { approachOffset: BELOW });
  await shot(page, '02-signal-case-brief');
  await selectPromptOption(page, 1);
  await page.waitForTimeout(300);

  // Orientation (not captured — foundation frame exists).
  await openBench(page, PILOT.lab.orientation, '__ipTerminalProbe');
  await dragChipToBin(page, 'T1', 'ARCHIVE');
  await composeByClick(page, ['ROUTE', 'T2', 'RELAY']);
  await typeCommand(page, 'ROUTE T3 ARCHIVE');
  await waitBufferLength(page, 3);
  await clickTerminalButton(page, 'submit');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // 03 — M15 causal-model work (sources read, three links drawn).
  await openBench(page, PILOT.lab.evidenceTable, '__workSurfaceProbe');
  await clickElement(page, 'source_timing');
  await clickElement(page, 'node_FEED');
  await clickElement(page, 'node_GATE');
  await clickElement(page, 'node_CLOCK');
  await clickElement(page, 'node_GATE');
  await clickElement(page, 'node_GATE');
  await clickElement(page, 'node_BUFFER');
  await shot(page, '03-m15-causal-model');
  await clickElement(page, 'node_BUFFER');
  await clickElement(page, 'node_OUTPUT');
  await press(page, '2');
  await clickElement(page, 'node_BUFFER');
  await clickElement(page, 'node_OUTPUT');
  await shot(page, '03b-m15-prediction');
  await press(page, 's');
  await page.waitForTimeout(300);
  await press(page, 'Escape');
  await waitSurfaceClosed(page);

  // 04 — M16 protocol reference + command surface (apply stage).
  await openBench(page, PILOT.lab.protocolConsole, '__ipTerminalProbe');

  let terminal = await terminalProbe(page);
  const originOf = (probe: { output: string[] }, id: string) =>
    /\b(NORTH|SOUTH)\b/.exec(
      probe.output.find((text) => text.startsWith(`${id} `)) ?? '',
    )?.[1] ?? 'NORTH';
  const baseDestination = (origin: string) =>
    origin === 'NORTH' ? 'ARCHIVE' : 'RELAY';

  for (const chip of terminal.chips) {
    await typeCommand(
      page,
      `ROUTE ${chip.id} ${baseDestination(originOf(terminal, chip.id))}`,
    );
  }

  await waitBufferLength(page, 3);
  await clickTerminalButton(page, 'submit');
  await clickTerminalButton(page, 'READY');
  await clickTerminalButton(page, 'ACKNOWLEDGE');
  terminal = await terminalProbe(page);
  await dragChipToBin(
    page,
    terminal.chips[0].id,
    terminal.chips[0].label.includes('!CRITICAL')
      ? 'HOLD'
      : baseDestination(originOf(terminal, terminal.chips[0].id)),
  );
  await clickTerminalButton(page, 'reference');
  await shot(page, '04-m16-protocol-reference');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await shot(page, '04b-m16-command-surface');

  for (const chip of terminal.chips.slice(1)) {
    await typeCommand(
      page,
      `ROUTE ${chip.id} ${
        chip.label.includes('!CRITICAL')
          ? 'HOLD'
          : baseDestination(originOf(terminal, chip.id))
      }`,
    );
  }

  await waitBufferLength(page, 6);
  await clickTerminalButton(page, 'submit');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // 05 — M17 demonstration, then the practice case.
  await openBench(page, PILOT.lab.trainingRig, '__ipTerminalProbe');
  await shot(page, '05-m17-demonstration');
  await clickTerminalButton(page, 'READY');
  await typeCommand(page, 'ZOR A B');
  await composeByClick(page, ['VEK', 'C', 'GRN']);
  await waitBufferLength(page, 2);
  await clickTerminalButton(page, 'submit');
  await shot(page, '05b-m17-practice-feedback');

  // 06 — M17 transfer case.
  await clickTerminalButton(page, 'NEXT');
  await typeCommand(page, 'ZOR A C');
  await waitBufferLength(page, 1);
  await shot(page, '06-m17-transfer');
  await typeCommand(page, 'KAI B');
  await waitBufferLength(page, 2);
  await clickTerminalButton(page, 'submit');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // 07 — M18 hypothesis diagnosis (evidence read, one tag ruled out, one placed).
  await openBench(page, PILOT.lab.diagnosticBoard, '__ipDiagnosisProbe');
  await clickDiagnosisPanel(page, 'pressure_map');
  await clickHypothesis(page, 'feed_restriction', 'reject');
  await clickDiagnosisRun(page, 'hold_test');
  await page.keyboard.press('3');
  await page.waitForTimeout(250);
  await shot(page, '07-m18-diagnosis-board');
  expect((await diagnosisProbe(page)).submit_enabled).toBe(true);
  await clickHypothesis(page, 'valve_seat_leak', 'reject');
  await clickHypothesis(page, 'intake_sensor_fault', 'reject');
  // The one explicit participant-facing submission (pointer path).
  await clickDiagnosisButton(page, 'submit');
  await page.waitForTimeout(300);
  expect((await diagnosisProbe(page)).closed).toBe(true);
  await page.keyboard.press('Escape');
  await waitDiagnosisOpen(page, false);

  // Positive completion proof: all four phases recorded through their
  // normal participant paths, the display advanced, no surface left open.
  const display = await page.evaluate(
    () =>
      (
        window as unknown as {
          __signalDisplayProbe?: {
            phases_recorded: string[];
            next_phase: string | null;
            indicator: string;
          } | null;
        }
      ).__signalDisplayProbe ?? null,
  );

  expect(display?.phases_recorded).toEqual(['m15', 'm16', 'm17', 'm18']);
  expect(display?.next_phase).toBeNull();
  expect(display?.indicator).toMatch(/CASE RECORDED/);
  expect(
    await page.evaluate(
      () =>
        ((
          window as unknown as { __workSurfaceProbe?: { open: boolean } | null }
        ).__workSurfaceProbe?.open ??
          false) ||
        ((window as unknown as { __ipTerminalProbe?: { open: boolean } | null })
          .__ipTerminalProbe?.open ??
          false) ||
        ((
          window as unknown as { __ipDiagnosisProbe?: { open: boolean } | null }
        ).__ipDiagnosisProbe?.open ??
          false),
    ),
  ).toBe(false);

  // Kai closes the episode: the route objective advances.
  await openPromptAt(page, PILOT.lab.kai, { approachOffset: { x: 0, y: 44 } });
  await selectPromptOption(page, 1);
  expect((await pilotProbe(page))?.stage).toBe('exterior_briefing');

  // 08 — the completed incident: recorded display, advanced objective.
  await walkTo(page, 384, 300, { yFirst: true });
  await shot(page, '08-signal-incident-complete');
  expectNoRuntimeErrors(errors);
});
