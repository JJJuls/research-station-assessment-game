/**
 * Pilot route — topology, guidance and launch-mode specs (Unit 2).
 *
 * Real keyboard input, DEV probes only. Asserts: the participant default is
 * the Dock with a skippable opening; the four-zone topology is walkable in
 * BOTH directions through every ordinary door; exactly one objective line
 * at a time; the beacon hides on arrival; the M map reports position,
 * destination and discovery; H toggles the controls overlay; the
 * participant cannot be trapped (Core deck → Concourse); no measurement
 * event fires anywhere on the bare route; developer aliases are recorded as
 * developer launches; `?route=legacy` keeps the Dock → Hub ring.
 */
import { expect, test } from '@playwright/test';

import { getEvents, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  dockToHubJourney,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  bootPilotScene,
  expectNoMeasurementEvents,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotEventTypes,
  pilotProbe,
  playerScene,
  press,
  useDoor,
  waitScene,
  walkTo,
} from './pilotHelpers';

test.describe('pilot route — topology and guidance (Unit 2)', () => {
  test('default launch is the Dock with a skippable opening; the skip changes nothing measurable', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const errors = captureErrors(page);

    await bootPilot(page, 'open');

    const types = await pilotEventTypes(page);

    expect(types).toContain('dock_started');
    expect(types).toContain('pilot_opening_shown');
    expect(types).toContain('pilot_opening_skipped');
    expect(types.indexOf('dock_started')).toBeLessThan(
      types.indexOf('pilot_opening_shown'),
    );
    // The Dock's control instruction still fires once (identical either way).
    expect(
      types.filter((t) => t === 'movement_instruction_shown'),
    ).toHaveLength(1);
    expect(await playerScene(page)).toBe('dock');

    const coverage = await pilotCoverage(page);

    expect(coverage?.launch_mode ?? 'participant').toBe('participant');

    // The Dock tutorial path is unchanged (every path emits tutorial_completed).
    await completeDockTutorial(page, 2);
    expect(await pilotEventTypes(page)).toContain('tutorial_completed');
    await expectNoMeasurementEvents(page);
    expectNoRuntimeErrors(errors);
  });

  test('four-zone topology: every ordinary door is bidirectional, one objective, beacon hides on arrival, map and controls overlay work, no dead end', async ({
    page,
  }) => {
    test.setTimeout(600_000);
    const errors = captureErrors(page);

    await bootPilot(page, 'topo');
    await completeDockTutorial(page, 1);

    // Dock → Concourse through the north door.
    await walkTo(page, 96, 60, { yFirst: true });
    await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
      approachOffset: { x: 0, y: 20 },
    });

    let probe = await pilotProbe(page);

    expect(probe?.zone).toBe('station_concourse');
    expect(probe?.stage).toBe('meet_vale');
    expect(probe?.objective).toContain('Vale');
    // Exactly one objective line: the legacy quest line is disabled.
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __questObjectiveText?: string | null })
            .__questObjectiveText ?? null,
      ),
    ).toBeNull();
    expect(probe?.beacon?.kind).toBe('npc');
    expect(probe?.beacon?.visible).toBe(true);

    // Concourse → Dock and back (bidirectional).
    await useDoor(page, PILOT.concourse.southDoor, 'dock', {
      approachOffset: { x: 0, y: -40 },
    });
    expect(await playerScene(page)).toBe('dock');
    await walkTo(page, 368, 60, { yFirst: true });
    await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
      approachOffset: { x: 0, y: 20 },
    });

    // Vale briefing advances to the records stage; beacon retargets to a station.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    probe = await pilotProbe(page);
    expect(probe?.stage).toBe('records');
    expect(probe?.objective).toMatch(/Records & Logistics/);
    expect(probe?.beacon?.kind).toBe('station');
    expect(probe?.beacon?.label).toBe('Incident Filing Workstation');

    // Beacon hides on arrival (< 120 px).
    await walkTo(
      page,
      PILOT.concourse.filingDesk.x,
      PILOT.concourse.filingDesk.y + 40,
    );
    probe = await pilotProbe(page);
    expect(probe?.beacon?.visible).toBe(false);

    // (The filing workstation is a live M02 window since Unit 3 — the bare
    // topology walk deliberately never opens a measurement station.)

    // M station map: current + destination + discovery.
    await press(page, 'm');
    await page.waitForFunction(
      () =>
        (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
          .__pilotMapProbe?.open === true,
      undefined,
      { timeout: 5000 },
    );

    const map = await page.evaluate(
      () =>
        (
          window as unknown as {
            __pilotMapProbe?: {
              open: boolean;
              current: string | null;
              destination: string | null;
              discovered: string[];
            } | null;
          }
        ).__pilotMapProbe ?? null,
    );

    expect(map?.current).toBe('station_concourse');
    expect(map?.destination).toBe('station_concourse');
    expect(map?.discovered).toEqual(
      expect.arrayContaining(['dock', 'station_concourse']),
    );
    expect(map?.discovered).not.toContain('diagnostics_laboratory');
    await press(page, 'Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
          .__pilotMapProbe?.open === false,
      undefined,
      { timeout: 5000 },
    );
    expect(await pilotEventTypes(page)).toContain('pilot_map_opened');

    // H toggles the controls overlay (hidden by default → shown → hidden).
    await press(page, 'h');
    await press(page, 'h');

    const toggles = (await getEvents(page)).filter(
      (event) => event.event_type === 'pilot_controls_toggled',
    );

    expect(
      toggles.map((event) => (event.metadata as { shown: boolean }).shown),
    ).toEqual([true, false]);

    // Vale → move on → laboratory stage.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    probe = await pilotProbe(page);
    expect(probe?.stage).toBe('lab_briefing');
    expect(probe?.beacon?.kind).toBe('door');
    expect(probe?.beacon?.label).toBe('Diagnostics Laboratory');

    // Concourse → Lab → Concourse → Lab (bidirectional).
    await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: 20 },
      yFirst: false,
    });
    await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
      approachOffset: { x: 0, y: -40 },
    });
    await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: 20 },
    });

    // Kai briefing → lab work → done → exterior stage.
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: { x: 40, y: 44 },
    });
    await selectPromptOption(page, 1);
    expect((await pilotProbe(page))?.stage).toBe('lab_work');
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: { x: 40, y: 44 },
    });
    await selectPromptOption(page, 1);
    probe = await pilotProbe(page);
    expect(probe?.stage).toBe('exterior_briefing');
    expect(probe?.beacon?.label).toBe('Exterior Airlock');

    // Lab → Yard through the airlock (route around the briefing wall), and back.
    await walkTo(page, 240, 70, { yFirst: false });
    await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
      approachOffset: { x: 0, y: 20 },
    });
    expect((await pilotProbe(page))?.zone).toBe('exterior_recovery_yard');
    await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: -40 },
    });
    expect(await playerScene(page)).toBe('diagnostics_laboratory');
    await walkTo(page, 240, 70, { yFirst: false });
    await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
      approachOffset: { x: 0, y: 20 },
    });

    // Noor briefing → work → done → report stage.
    await openPromptAt(page, PILOT.yard.noor, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    expect((await pilotProbe(page))?.stage).toBe('exterior_work');
    // Unit 5: Noor's exterior_work beat is the job queue — option 1
    // accepts the first job, option 2 is always "I am done outside".
    await openPromptAt(page, PILOT.yard.noor, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 2);
    probe = await pilotProbe(page);
    expect(probe?.stage).toBe('report_kai');
    expect(probe?.beacon?.kind).toBe('door');

    // Back inside: Kai → Vale → Deck.
    await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: -40 },
    });
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: { x: 40, y: 44 },
    });
    await selectPromptOption(page, 1);
    expect((await pilotProbe(page))?.stage).toBe('report_vale');
    await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
      approachOffset: { x: 0, y: -40 },
    });
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    probe = await pilotProbe(page);
    expect(probe?.stage).toBe('deck_review');
    expect(probe?.beacon?.label).toBe('Utility & Core Deck');

    await useDoor(page, PILOT.concourse.eastDoor, 'utility_core_deck', {
      approachOffset: { x: -40, y: 0 },
      yFirst: true,
    });
    probe = await pilotProbe(page);
    expect(probe?.zone).toBe('utility_core_deck');
    expect(probe?.beacon?.label).toBe('Core Synchronisation Console');

    // No dead end: the deck door returns to the Concourse, and back again.
    await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
      approachOffset: { x: 40, y: 0 },
      yFirst: true,
    });
    expect(await playerScene(page)).toBe('station_concourse');
    await useDoor(page, PILOT.concourse.eastDoor, 'utility_core_deck', {
      approachOffset: { x: -40, y: 0 },
      yFirst: true,
    });

    // Core console placeholder (Unit 7 activates it).
    await openPromptAt(page, PILOT.deck.coreConsole, {
      approachOffset: { x: 0, y: 44 },
      yFirst: false,
    }).catch(() => undefined);
    expect(await pilotEventTypes(page)).toContain('pilot_core_console_opened');

    // Map from the deck: every zone discovered, current = deck.
    await press(page, 'm');
    await page.waitForFunction(
      () =>
        (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
          .__pilotMapProbe?.open === true,
      undefined,
      { timeout: 5000 },
    );

    const finalMap = await page.evaluate(
      () =>
        (
          window as unknown as {
            __pilotMapProbe?: {
              current: string | null;
              discovered: string[];
            } | null;
          }
        ).__pilotMapProbe ?? null,
    );

    expect(finalMap?.current).toBe('utility_core_deck');
    expect(finalMap?.discovered.sort()).toEqual(
      [
        'diagnostics_laboratory',
        'dock',
        'exterior_recovery_yard',
        'station_concourse',
        'utility_core_deck',
      ].sort(),
    );
    await press(page, 'm');

    // Zero measurement events across the whole bare route; no runtime errors.
    await expectNoMeasurementEvents(page);

    // No participant-visible item/proto/Q identifiers in any objective shown.
    const objectives = (await getEvents(page))
      .filter((event) => event.event_type === 'pilot_stage_advanced')
      .map((event) => JSON.stringify(event.metadata));

    for (const text of objectives) {
      expect(text).not.toMatch(/proto_|\bM\d{2}\b|\bQ\d{2}\b/);
    }

    expectNoRuntimeErrors(errors);
  });

  test('developer aliases are developer launches; the pilot default is a participant launch', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await bootPilotScene(page, 'devlab', 'inventory_lab');

    const dev = await pilotCoverage(page);

    expect(dev?.launch_mode).toBe('developer');
    expect(dev?.developer_scenes_visited).toContain('inventory_lab');

    // Direct zone aliases are developer launches too (the route is entered
    // mid-way; recorded, never the participant default).
    await bootPilotScene(page, 'devzone', 'diagnostics_laboratory');
    expect((await pilotProbe(page))?.launch_mode).toBe('developer');
  });

  test('route=legacy keeps the historical Dock → Hub ring for the legacy specs', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await page.goto(
      '/?participant_id=PT_PILOT_LEGACY&game_session_id=GS_PILOT_LEGACY&route=legacy',
    );
    await waitScene(page, 'dock', 60_000);
    await page.waitForTimeout(1600);

    // No opening under the legacy route.
    expect(await pilotEventTypes(page)).not.toContain('pilot_opening_shown');
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);
    expect(await playerScene(page)).toBe('hub');
  });
});
