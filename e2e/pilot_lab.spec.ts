/**
 * Pilot route — Diagnostics & Signal Laboratory (Unit 4).
 *
 * Verifies the six information-processing workstations ON THE PARTICIPANT
 * ROUTE (real navigation from the Dock; no developer scene boots, so the
 * sessions stay uncontaminated):
 *
 * 1. Orientation + the counterbalanced decoder bank: the four analysis
 *    terminals open exactly the module the session layout assigned to their
 *    bank position, the layout is exported (`pilot_decoder_layout` + a
 *    per-record control note), the four decoders present four different
 *    task surfaces, modal ownership holds while an overlay is open, and no
 *    participant-visible surface carries an M/proto/dev identifier.
 * 2. M13 lattice ↔ M18 console sequencing: the console defers ONLY while
 *    the lattice window is open (never a performance gate), explicit
 *    two-step stops close windows as participant_absent, and stopped
 *    stations never block the route (fail-forward through Kai + airlock).
 * 3. M18 independence: a never-opened lattice leads to the identical
 *    console (`prior_m13_window_status` is context only), and using the
 *    console leaves the untouched lattice pending.
 *
 * All checks read DEV probes (`__ipTerminalProbe`, `__ipPipeProbe`,
 * `__ipDiagnosisProbe`, `__ipModules`, `__pilotProbe`, `__pilotCoverage`,
 * `__ipLabFeedback`) and the research event buffer; input is real keyboard
 * and pointer traffic.
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
  pipeProbe,
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
  hold,
  interactAt,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotEventTypes,
  pilotProbe,
  press,
  useDoor,
  walkTo,
} from './pilotHelpers';

/** Lab workstation coordinates (src/pilot/zoneSites.ts LAB_STATIONS). */
const LAB = {
  orientation: { x: 112, y: 176 },
  bank: [
    { x: 112, y: 256 },
    { x: 112, y: 336 },
    { x: 112, y: 416 },
    { x: 224, y: 416 },
  ],
  lattice: { x: 672, y: 224 },
  diagnosis: { x: 672, y: 384 },
} as const;

/** Stand east of the west-bank stations, west of the conduit-bay ones. */
const WEST = { x: 44, y: 0 };
const EAST = { x: -48, y: 0 };

const DECODER_OPPORTUNITY: Record<string, string> = {
  m14: 'proto_m14_packet_saturation',
  m15: 'proto_m15_layered_cipher',
  m16: 'proto_m16_protocol_update',
  m17: 'proto_m17_syntax_acquisition',
};

/** No participant-visible study identifiers, ever (mission §20). */
const FORBIDDEN_IDENTIFIERS = /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bdev\b/i;

/**
 * Real participant navigation: Dock → Concourse (Vale advances to
 * lab_briefing without requiring records work — fail-forward) → Laboratory
 * → Kai's briefing (stage lab_work).
 */
async function enterLab(page: Page, tag: string) {
  await bootPilot(page, tag);
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
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: { x: 40, y: 44 },
  });
  await selectPromptOption(page, 1);
}

type IpProbeKey = '__ipTerminalProbe' | '__ipPipeProbe' | '__ipDiagnosisProbe';

/** Walks to a workstation and opens its overlay (retrying swallowed keys). */
async function openIpStation(
  page: Page,
  at: { x: number; y: number },
  offset: { x: number; y: number },
  probeKey: IpProbeKey,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, at, { approachOffset: offset });

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

  throw new Error(`station at ${at.x},${at.y} did not open ${probeKey}`);
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

async function labFeedback(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __ipLabFeedback?: string | null })
        .__ipLabFeedback ?? null,
  );
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

test.describe('pilot route — Diagnostics & Signal Laboratory (Unit 4)', () => {
  test('orientation, counterbalanced decoder bank, four distinct decoder surfaces, modal ownership and no identifier leakage', async ({
    page,
  }) => {
    test.setTimeout(540_000);

    const errors = captureErrors(page);

    await enterLab(page, 'bank');

    // Stage + guidance: the first unfinished station is the orientation.
    let probe = await pilotProbe(page);

    expect(probe?.stage).toBe('lab_work');
    expect(probe?.beacon?.label).toBe('Terminal Orientation');

    // Counterbalanced bank layout, exported as a pilot event…
    const layoutEvents = await eventsByType(page, 'pilot_decoder_layout');

    expect(layoutEvents.length).toBeGreaterThan(0);

    const layout = layoutEvents[0].metadata?.layout as string;
    const bankOrder = layoutEvents[0].metadata?.bank_order as string[];

    expect(['layout_a', 'layout_b']).toContain(layout);
    expect(bankOrder).toEqual(
      layout === 'layout_a'
        ? ['m14', 'm15', 'm16', 'm17']
        : ['m17', 'm16', 'm15', 'm14'],
    );

    // …and as a control note on each decoder's register record.
    for (const [position, moduleId] of bankOrder.entries()) {
      const validity = await ipValidity(page, DECODER_OPPORTUNITY[moduleId]);

      expect(validity.prior_exposure).toContain(
        `control:decoder_layout=${layout};bank_position=${position + 1}`,
      );
    }

    // Orientation: pointer drag, pointer click-composition, typed command.
    await openIpStation(page, LAB.orientation, WEST, '__ipTerminalProbe');

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

    // Guidance moves on once the orientation is complete.
    probe = await pilotProbe(page);
    expect(probe?.beacon?.label).toBe('Conduit Lattice Bench');

    // Each bank position opens exactly the module the layout assigned to
    // it; the four decoders present four different task surfaces.
    const surfaces: string[] = [];
    const visibleText: string[] = [];

    for (const [position, moduleId] of bankOrder.entries()) {
      await openIpStation(page, LAB.bank[position], WEST, '__ipTerminalProbe');

      const decoder = await terminalProbe(page);

      expect(decoder.task).toBe(moduleId);

      if (position === 0) {
        // Modal ownership: the paused host neither moves nor opens the map.
        const before = await playerX(page);

        await hold(page, 'ArrowRight', 350);
        expect(Math.abs((await playerX(page)) - before)).toBeLessThan(2);
        await press(page, 'm');

        const mapOpen = await page.evaluate(
          () =>
            (
              window as unknown as {
                __pilotMapProbe?: { open: boolean } | null;
              }
            ).__pilotMapProbe?.open ?? false,
        );

        expect(mapOpen).toBe(false);
      }

      surfaces.push(
        JSON.stringify({
          chips: decoder.chips.map((chip) => chip.id).sort(),
          bins: decoder.bins.map((bin) => bin.id).sort(),
          palette: decoder.palette.map((entry) => entry.token).sort(),
          codebook: decoder.codebook.length,
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

      // Leave without stopping: the window stays open (fail-forward).
      await clickTerminalButton(page, 'close');
      await waitTerminalOpen(page, false);
    }

    expect(new Set(surfaces).size).toBe(4);

    // Entered-and-left windows stay OPEN — never auto-failed.
    for (const moduleId of bankOrder) {
      const validity = await ipValidity(page, DECODER_OPPORTUNITY[moduleId]);

      expect(validity.entered).toBe(true);
      expect(validity.completed).toBe(false);
      expect(validity.invalid_reason).toBeNull();
    }

    for (const item of ['M14', 'M15', 'M16', 'M17']) {
      expect(await itemStatus(page, item)).toBe('open');
    }

    // No participant-visible study identifiers on any surface the
    // participant actually sees.
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
      ...visibleText,
    ]) {
      expect(text).not.toMatch(FORBIDDEN_IDENTIFIERS);
    }

    // Every measurement event stays provisional (no canonical context).
    const events = (await getEvents(page)) as unknown as IpEventLike[];

    expectProvisionalOnly(
      events.filter((event) => event.event_type.startsWith('proto_')),
    );
    expectNoRuntimeErrors(errors);
  });

  test('lattice bench and diagnosis console: sequencing without performance gating, explicit stops, fail-forward to the airlock', async ({
    page,
  }) => {
    test.setTimeout(540_000);

    const errors = captureErrors(page);

    await enterLab(page, 'seq');

    // Lattice open → leave: the M13 window STAYS open and re-enterable.
    await openIpStation(page, LAB.lattice, EAST, '__ipPipeProbe');

    const pipe = await pipeProbe(page);

    expect(pipe.form).not.toBeNull();
    await clickPipeButton(page, 'close');
    await waitPipeOpen(page, false);
    expect(await itemStatus(page, 'M13')).toBe('open');

    // While the lattice window is open the console defers — sequencing
    // only, and the refusal is plain guidance, not an error.
    let refusal: string | null = null;

    for (let attempt = 0; attempt < 3 && refusal === null; attempt += 1) {
      await interactAt(page, LAB.diagnosis, { approachOffset: EAST });
      await page.waitForTimeout(700);
      refusal = await labFeedback(page);
    }

    expect(refusal).toContain('lattice bench');

    const diagnosisOpen = await page.evaluate(
      () =>
        (window as unknown as { __ipDiagnosisProbe?: { open: boolean } | null })
          .__ipDiagnosisProbe?.open ?? false,
    );

    expect(diagnosisOpen).toBe(false);

    // The deferred attempt was still logged with the console's OWN window
    // status (unopened) — station telemetry never borrows M13 state.
    const stationOpens = (
      await eventsByType(page, 'pilot_station_opened')
    ).filter((event) => event.metadata?.station_id === 'diagnosis_console');

    expect(stationOpens.length).toBeGreaterThan(0);
    expect(stationOpens[stationOpens.length - 1].metadata?.window_status).toBe(
      'unopened',
    );

    // Re-enter the lattice, then stop it via the explicit two-step stop.
    // A confirmed stop shows the closed state IN the overlay (return is a
    // separate, explicit act — no auto-eject); Escape then leaves.
    await openIpStation(page, LAB.lattice, EAST, '__ipPipeProbe');
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

    const m13 = await ipValidity(page, 'proto_m13_lattice_construction');

    expect(m13.entered).toBe(true);
    expect(m13.invalid_reason).toBe('participant_absent');
    // An explicit stop is MISSING data (declined opportunity), never an
    // invalid record and never a low score (SA-13 missing≠low).
    expect(await itemStatus(page, 'M13')).toBe('missing');

    // The console now opens fully — an abandoned lattice never gates it,
    // and the closure state arrives as CONTEXT ONLY on the open event.
    await openIpStation(page, LAB.diagnosis, EAST, '__ipDiagnosisProbe');

    const diagnosis = await diagnosisProbe(page);

    expect(diagnosis.form).not.toBeNull();
    expect(diagnosis.panels.length).toBeGreaterThan(0);
    expect(diagnosis.tests.length).toBeGreaterThan(0);
    expect(diagnosis.hypotheses.length).toBeGreaterThan(0);

    const opened = await eventsByType(page, 'proto_m18_fault_window_opened');

    expect(opened).toHaveLength(1);
    expect(opened[0].metadata?.prior_m13_window_status).toBe('exited');

    // Stop the console the same explicit way (same stopped-state-then-
    // explicit-return contract as the lattice board).
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

    const m18 = await ipValidity(page, 'proto_m18_lattice_fault_diagnosis');

    expect(m18.invalid_reason).toBe('participant_absent');
    expect(await itemStatus(page, 'M18')).toBe('missing');

    // Fail-forward: stopped stations never block the route.
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: { x: 40, y: 44 },
    });
    await selectPromptOption(page, 1);
    expect((await pilotProbe(page))?.stage).toBe('exterior_briefing');
    await walkTo(page, 240, 70, { yFirst: false });
    await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
      approachOffset: { x: 0, y: 20 },
    });
    await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: -40 },
    });
    expectNoRuntimeErrors(errors);
  });

  test('the diagnosis console never requires the lattice: never-opened leads to the identical console and leaves M13 untouched', async ({
    page,
  }) => {
    test.setTimeout(480_000);

    const errors = captureErrors(page);

    await enterLab(page, 'nolat');

    await openIpStation(page, LAB.diagnosis, EAST, '__ipDiagnosisProbe');

    const diagnosis = await diagnosisProbe(page);

    expect(diagnosis.form).not.toBeNull();
    expect(diagnosis.panels.length).toBeGreaterThan(0);
    expect(diagnosis.hypotheses.length).toBeGreaterThan(0);

    const opened = await eventsByType(page, 'proto_m18_fault_window_opened');

    expect(opened).toHaveLength(1);
    expect(opened[0].metadata?.prior_m13_window_status).toBe('unopened');

    // Leave without stopping: the console window stays open; the untouched
    // lattice stays pending — M18 use never contaminates M13.
    await clickDiagnosisButton(page, 'close');
    await waitDiagnosisOpen(page, false);

    const m18 = await ipValidity(page, 'proto_m18_lattice_fault_diagnosis');

    expect(m18.entered).toBe(true);
    expect(m18.invalid_reason).toBeNull();

    const m13 = await ipValidity(page, 'proto_m13_lattice_construction');

    expect(m13.entered).toBe(false);
    expect(await itemStatus(page, 'M18')).toBe('open');
    expect(await itemStatus(page, 'M13')).toBe('pending');

    // No M13 family event was ever emitted.
    const types = await pilotEventTypes(page);

    expect(types.filter((t) => t.startsWith('proto_m13_lattice_'))).toEqual([]);
    expectNoRuntimeErrors(errors);
  });
});
