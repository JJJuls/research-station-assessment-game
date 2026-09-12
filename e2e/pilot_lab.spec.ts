/**
 * Pilot route — Diagnostics Laboratory: the signal-analysis incident
 * (evidence-led pilot v2, Unit 3).
 *
 * Verifies the laboratory ON THE PARTICIPANT ROUTE (real navigation from
 * the Dock; no developer scene boots, so the sessions stay uncontaminated):
 *
 * 1. Arrival + case brief: Kai's briefing, the workstation's reviewable
 *    brief, the wall display's phase indicator and Noor's intercom line;
 *    the console orientation; the four phase benches present four
 *    DIFFERENT surfaces (evidence table / protocol console / training rig
 *    / diagnostic board); modal ownership holds while any surface is open;
 *    no participant-visible surface carries an M/proto/dev identifier;
 *    entered-and-left windows stay open (never auto-failed).
 * 2. Explicit stops close windows as participant_absent (missing, never
 *    low); a stopped phase never blocks the next bench or the route
 *    (fail-forward through Kai + airlock); the diagnostic board never
 *    waits for the lattice bench (which lives in the workshop).
 * 3. M18 independence on the route: the board opens to the identical
 *    entry snapshot whether the lattice bench was never opened or was
 *    explicitly exited in the workshop; using the board leaves M13
 *    untouched; no M13 event is ever emitted from the laboratory.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { getEvents, selectPromptOption } from './helpers';
import type { IpEventLike } from './ipHelpers';
import {
  clickDiagnosisButton,
  clickPipeButton,
  clickTerminalButton,
  composeByClick,
  diagnosisProbe,
  dragChipToBin,
  expectProvisionalOnly,
  ipValidity,
  terminalProbe,
  typeCommand,
  waitDiagnosisOpen,
  waitPipeOpen,
  waitTerminalOpen,
} from './ipHelpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  expectStage,
  hold,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotEventTypes,
  pilotProbe,
  press,
  routeToLabWork,
  routeToWorkshopWork,
  useDoor,
  workshopToConcourse,
  workshopVia,
} from './pilotHelpers';

const PHASE_OPPORTUNITY: Record<string, string> = {
  m15: 'proto_m15_layered_cipher',
  m16: 'proto_m16_protocol_update',
  m17: 'proto_m17_syntax_acquisition',
  m18: 'proto_m18_lattice_fault_diagnosis',
};

/** No participant-visible study identifiers, ever (mission §20). */
const FORBIDDEN_IDENTIFIERS = /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bdev\b/i;

type ProbeKey =
  | '__ipTerminalProbe'
  | '__ipPipeProbe'
  | '__ipDiagnosisProbe'
  | '__workSurfaceProbe';

/** Walks to a bench and opens its overlay (retrying swallowed keys). */
async function openBench(
  page: Page,
  at: { x: number; y: number },
  probeKey: ProbeKey,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, at, {
      approachOffset: await labApproach(page, at),
    });

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

async function signalDisplay(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __signalDisplayProbe?: {
            phases_recorded: string[];
            next_phase: string | null;
            indicator: string;
            intercom: string;
          } | null;
        }
      ).__signalDisplayProbe ?? null,
  );
}

async function workSurface(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __workSurfaceProbe?: {
            open: boolean;
            surface_id: string | null;
            title: string | null;
            status: string | null;
            elements: { id: string; label: string; state: string }[];
            links: { from: string; to: string }[];
          } | null;
        }
      ).__workSurfaceProbe ?? null,
  );
}

async function playerX(page: Page): Promise<number> {
  const x = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number } | null })
        .__playerProbe?.x ?? null,
  );

  if (x === null) {
    throw new Error('player probe unavailable');
  }

  return x;
}

interface PilotEventLike {
  event_type: string;
  metadata?: Record<string, unknown>;
}

async function eventsByType(
  page: Page,
  type: string,
): Promise<PilotEventLike[]> {
  return ((await getEvents(page)) as PilotEventLike[]).filter(
    (event) => event.event_type === type,
  );
}

async function itemStatus(page: Page, item: string): Promise<string> {
  const coverage = await pilotCoverage(page);
  const row = coverage?.items.find((candidate) => candidate.item === item);

  if (row === undefined) {
    throw new Error(`coverage row ${item} missing`);
  }

  return row.status;
}

async function enterLab(page: Page, tag: string) {
  await bootPilot(page, tag, { extra: '&ip_form=A' });
  await completeDockTutorial(page, 1);
  await routeToLabWork(page);
}

test.describe('pilot route — Diagnostics Laboratory: signal-analysis incident (Unit 3)', () => {
  test('arrival and case brief, orientation, four distinct phase surfaces, modal ownership and no identifier leakage', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await enterLab(page, 'sig');

    // Stage + guidance: the first unfinished bench is the orientation; the
    // wall display points at phase 1 with Noor on the intercom.
    let probe = await pilotProbe(page);

    expect(probe?.stage).toBe('lab_work');
    expect(probe?.beacon?.label).toBe('Console Orientation');

    let display = await signalDisplay(page);

    expect(display?.phases_recorded).toEqual([]);
    expect(display?.next_phase).toBe('m15');
    expect(display?.indicator).toMatch(/PHASE 1 \/ 4/);
    expect(display?.intercom).toMatch(/^NOOR/);

    // The workstation's case brief is reviewable and lists the four phases.
    await openPromptAt(page, PILOT.lab.workstation, {
      approachOffset: await labApproach(page, PILOT.lab.workstation),
    });

    const brief = await page.evaluate(
      () =>
        (window as unknown as { __lastPromptBody?: string | null })
          .__lastPromptBody ?? '',
    );

    expect(brief).toMatch(/SIGNAL ANALYSIS/);
    expect(brief).toMatch(/Evidence Table/);
    expect(brief).toMatch(/Diagnostic Board/);
    expect(brief).not.toMatch(FORBIDDEN_IDENTIFIERS);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(300);

    // Orientation: pointer drag, pointer click-composition, typed command.
    await openBench(page, PILOT.lab.orientation, '__ipTerminalProbe');

    let terminal = await terminalProbe(page);

    expect(terminal.task).toBe('tutorial');
    await dragChipToBin(page, 'T1', 'ARCHIVE');
    await composeByClick(page, ['ROUTE', 'T2', 'RELAY']);
    await typeCommand(page, 'ROUTE T3 ARCHIVE');
    terminal = await terminalProbe(page);
    expect(terminal.submit_enabled).toBe(true);
    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(400);
    terminal = await terminalProbe(page);
    expect(terminal.stage).toBe('COMPLETE');
    await page.keyboard.press('Escape');
    await waitTerminalOpen(page, false);

    // Guidance moves on to phase 1.
    probe = await pilotProbe(page);
    expect(probe?.beacon?.label).toBe('Evidence Table');

    const visibleText: string[] = [];

    // Phase 1 — evidence table (work surface): distinct surface, modal.
    await openBench(page, PILOT.lab.evidenceTable, '__workSurfaceProbe');

    const table = (await workSurface(page))!;

    expect(table.surface_id).toBe('m15_evidence_table');
    expect(
      table.elements.filter((e) => e.id.startsWith('source_')),
    ).toHaveLength(4);
    expect(table.elements.filter((e) => e.id.startsWith('node_'))).toHaveLength(
      5,
    );
    visibleText.push(
      table.title ?? '',
      table.status ?? '',
      ...table.elements.map((e) => e.label),
    );

    // Modal ownership: the paused host neither moves nor opens the map.
    const before = await playerX(page);

    await hold(page, 'ArrowRight', 350);
    expect(Math.abs((await playerX(page)) - before)).toBeLessThan(2);
    await press(page, 'm');
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
            .__pilotMapProbe?.open ?? false,
      ),
    ).toBe(false);
    await press(page, 'Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
          .__workSurfaceProbe?.open !== true,
      undefined,
      { timeout: 8000 },
    );

    // Phases 2 and 3 — terminal surfaces with different task contracts.
    const surfaces: string[] = [];

    for (const [at, task] of [
      [PILOT.lab.protocolConsole, 'm16'],
      [PILOT.lab.trainingRig, 'm17'],
    ] as const) {
      await openBench(page, at, '__ipTerminalProbe');

      const decoder = await terminalProbe(page);

      expect(decoder.task).toBe(task);
      surfaces.push(
        JSON.stringify({
          chips: decoder.chips.map((chip) => chip.id).sort(),
          bins: decoder.bins.map((bin) => bin.id).sort(),
          palette: decoder.palette.map((entry) => entry.token).sort(),
          stage: decoder.stage,
        }),
      );
      visibleText.push(
        ...decoder.console,
        ...decoder.output,
        ...decoder.codebook,
        ...decoder.chips.map((chip) => chip.label),
        ...decoder.buttons.map((button) => button.label),
        decoder.line,
      );
      await clickTerminalButton(page, 'close');
      await waitTerminalOpen(page, false);
    }

    expect(new Set(surfaces).size).toBe(2);

    // Phase 4 — diagnostic board (its own scene, no lattice gate).
    await openBench(page, PILOT.lab.diagnosticBoard, '__ipDiagnosisProbe');

    const board = await diagnosisProbe(page);

    expect(board.form).toBe('A');
    expect(board.zones.map((zone) => zone.id).sort()).toEqual([
      'diagnosis',
      'open',
      'ruled_out',
    ]);
    expect(board.hypotheses).toHaveLength(4);
    visibleText.push(...board.detail_lines, ...board.feedback);
    await clickDiagnosisButton(page, 'close');
    await waitDiagnosisOpen(page, false);

    // Entered-and-left windows stay OPEN — never auto-failed.
    for (const id of ['m15', 'm16', 'm17', 'm18']) {
      const validity = await ipValidity(page, PHASE_OPPORTUNITY[id]);

      expect(validity.entered, id).toBe(true);
      expect(validity.completed, id).toBe(false);
      expect(validity.invalid_reason, id).toBeNull();
      expect(await itemStatus(page, id.toUpperCase())).toBe('open');
    }

    display = await signalDisplay(page);
    expect(display?.phases_recorded).toEqual([]);

    // No participant-visible study identifiers on any visible surface.
    const kaiBody = await page.evaluate(
      () =>
        (window as unknown as { __lastPromptBody?: string | null })
          .__lastPromptBody ?? '',
    );

    probe = await pilotProbe(page);

    for (const text of [
      probe?.objective ?? '',
      probe?.beacon?.label ?? '',
      kaiBody,
      display?.indicator ?? '',
      display?.intercom ?? '',
      ...visibleText,
    ]) {
      expect(text).not.toMatch(FORBIDDEN_IDENTIFIERS);
    }

    const events = (await getEvents(page)) as unknown as IpEventLike[];

    expectProvisionalOnly(
      events.filter((event) => event.event_type.startsWith('proto_')),
    );
    expectNoRuntimeErrors(errors);
  });

  test('explicit stops record missing (never low), a stopped phase never blocks the next bench, and the route fails forward to the airlock', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await enterLab(page, 'stop');

    // Phase 1 stopped from the evidence table (STOP TASK) → exited/missing.
    await openBench(page, PILOT.lab.evidenceTable, '__workSurfaceProbe');
    await press(page, 'q'); // arms
    await press(page, 'q'); // confirms
    await page.waitForTimeout(300);
    expect(
      (await workSurface(page))?.elements.find((e) => e.id === 'submit')?.label,
    ).toBe('RECORDED'); // the record view stays visible; nothing auto-ejects
    await press(page, 'Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
          .__workSurfaceProbe?.open !== true,
      undefined,
      { timeout: 8000 },
    );

    const m15 = await ipValidity(page, PHASE_OPPORTUNITY.m15);

    expect(m15.entered).toBe(true);
    expect(m15.invalid_reason).toBe('participant_absent');
    expect(await itemStatus(page, 'M15')).toBe('missing');

    // The display counts a stopped phase as recorded (neutral), never as low.
    let display = await signalDisplay(page);

    expect(display?.phases_recorded).toEqual(['m15']);
    expect(display?.next_phase).toBe('m16');

    // Phase 2 still opens fully — a stopped phase gates nothing — and is
    // stopped the explicit two-step way (STOP → confirm), then left.
    await openBench(page, PILOT.lab.protocolConsole, '__ipTerminalProbe');
    expect((await terminalProbe(page)).task).toBe('m16');
    await typeCommand(page, 'STOP');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect((await terminalProbe(page)).closed).toBe(true);
    await page.keyboard.press('Escape');
    await waitTerminalOpen(page, false);
    expect(await itemStatus(page, 'M16')).toBe('missing');

    // Phase 4 opens with no lattice involved at all (the lattice bench is
    // in the workshop; the board never waits for it).
    await openBench(page, PILOT.lab.diagnosticBoard, '__ipDiagnosisProbe');

    const opened = await eventsByType(page, 'proto_m18_fault_window_opened');

    expect(opened).toHaveLength(1);
    expect(opened[0].metadata?.prior_m13_window_status).toBe('unopened');
    await clickDiagnosisButton(page, 'stop');
    await clickDiagnosisButton(page, 'confirm_stop');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __ipDiagnosisProbe?: { closed: boolean } | null;
          }
        ).__ipDiagnosisProbe?.closed === true,
      undefined,
      { timeout: 8000 },
    );
    await page.keyboard.press('Escape');
    await waitDiagnosisOpen(page, false);

    const m18 = await ipValidity(page, PHASE_OPPORTUNITY.m18);

    expect(m18.invalid_reason).toBe('participant_absent');
    expect(await itemStatus(page, 'M18')).toBe('missing');

    // Never-opened phase 3 stays pending — no value invented.
    const m17 = await ipValidity(page, PHASE_OPPORTUNITY.m17);

    expect(m17.entered).toBe(false);
    expect(await itemStatus(page, 'M17')).toBe('pending');

    display = await signalDisplay(page);
    expect(display?.phases_recorded).toEqual(['m15', 'm16', 'm18']);
    expect(display?.next_phase).toBe('m17');

    // Fail-forward: stopped phases never block the route.
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: await labApproach(page, PILOT.lab.kai),
    });
    await selectPromptOption(page, 1);
    expect((await pilotProbe(page))?.stage).toBe('exterior_briefing');
    await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
      approachOffset: await labApproach(page, PILOT.lab.airlock),
    });
    await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: -40 },
    });
    expectNoRuntimeErrors(errors);
  });

  test('M18 independence on the route: never-opened and explicitly-exited lattice histories open the identical board; the board never touches M13', async ({
    browser,
  }) => {
    test.setTimeout(900_000);

    const snapshots: Record<string, unknown>[] = [];
    const contexts: string[] = [];

    // History 1 — the lattice bench was never opened.
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await enterLab(page, 'h1');
      await openBench(page, PILOT.lab.diagnosticBoard, '__ipDiagnosisProbe');

      const opened = await eventsByType(page, 'proto_m18_fault_window_opened');

      expect(opened).toHaveLength(1);
      snapshots.push(
        opened[0].metadata?.entry_snapshot as Record<string, unknown>,
      );
      contexts.push(String(opened[0].metadata?.prior_m13_window_status));
      await clickDiagnosisButton(page, 'close');
      await waitDiagnosisOpen(page, false);

      const m13 = await ipValidity(page, 'proto_m13_lattice_construction');

      expect(m13.entered).toBe(false);
      expect(await itemStatus(page, 'M13')).toBe('pending');
      expect(
        (await pilotEventTypes(page)).filter((t) => t.startsWith('proto_m13_')),
      ).toEqual([]);
      await context.close();
    }

    // History 2 — the lattice bench was opened in the workshop and STOPPED.
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await bootPilot(page, 'h2', { extra: '&ip_form=A' });
      await completeDockTutorial(page, 1);
      await routeToWorkshopWork(page);
      // The lattice bench in the rebuilt two-bay hall (audited approach).
      await workshopVia(page, 1193, 250);
      await interactAt(page, PILOT.workshop.latticeBench, {
        approachOffset: { x: 0, y: -50 },
      });
      await waitPipeOpen(page, true);
      await clickPipeButton(page, 'stop');
      await clickPipeButton(page, 'confirm_stop');
      await page.waitForFunction(
        () =>
          (window as unknown as { __ipPipeProbe?: { closed: boolean } | null })
            .__ipPipeProbe?.closed === true,
        undefined,
        { timeout: 8000 },
      );
      await page.keyboard.press('Escape');
      await waitPipeOpen(page, false);
      expect(await itemStatus(page, 'M13')).toBe('missing');

      // The restoration shift is already signed in; one more sign-off
      // releases the workshop toward the laboratory.
      await workshopVia(page, 1312, 178);
      await openPromptAt(page, PILOT.workshop.board, {
        approachOffset: { x: -32, y: 38 },
      });
      await selectPromptOption(page, 1);
      await expectStage(page, 'lab_briefing');
      await workshopToConcourse(page);
      await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
        approachOffset: { x: 0, y: 20 },
        yFirst: false,
      });
      await openPromptAt(page, PILOT.lab.kai, {
        approachOffset: await labApproach(page, PILOT.lab.kai),
      });
      await selectPromptOption(page, 1);
      await openBench(page, PILOT.lab.diagnosticBoard, '__ipDiagnosisProbe');

      const opened = await eventsByType(page, 'proto_m18_fault_window_opened');

      expect(opened).toHaveLength(1);
      snapshots.push(
        opened[0].metadata?.entry_snapshot as Record<string, unknown>,
      );
      contexts.push(String(opened[0].metadata?.prior_m13_window_status));

      const board = await diagnosisProbe(page);

      expect(board.panels.every((panel) => !panel.viewed)).toBe(true);
      expect(board.hypotheses.every((h) => !h.selected && !h.rejected)).toBe(
        true,
      );
      await clickDiagnosisButton(page, 'close');
      await waitDiagnosisOpen(page, false);

      // Using the board changed nothing on the M13 record and emitted no
      // M13 event from the laboratory.
      const m13 = await ipValidity(page, 'proto_m13_lattice_construction');

      expect(m13.invalid_reason).toBe('participant_absent');

      const labEvents = (await getEvents(page)).filter(
        (e) => (e as { scene?: string }).scene === 'diagnostics_laboratory',
      );

      expect(
        labEvents.filter((e) => e.event_type.startsWith('proto_m13_')),
      ).toEqual([]);
      await context.close();
    }

    // The two histories differ ONLY in the route context; the entry
    // snapshot (form, reference, hypotheses, panels, tests, rules, empty
    // working state, m13_dependency: none) is byte-identical.
    expect(contexts).toEqual(['unopened', 'exited']);
    expect(JSON.stringify(snapshots[0])).toBe(JSON.stringify(snapshots[1]));
    expect(snapshots[0].m13_dependency).toBe('none');
  });
});
