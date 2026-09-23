/**
 * Pilot route — topology, guidance and launch-mode specs (evidence-led
 * pilot v2, Unit 1).
 *
 * Real keyboard input, DEV probes only. Asserts: the participant default is
 * the Dock with a skippable opening; the six-zone hub-and-loop is walkable
 * in BOTH directions through every ordinary door; exactly one objective
 * line at a time; the beacon hides on arrival; the M map/log reports
 * position, destination, discovery and the (empty) mission log; H toggles
 * the controls overlay; the route's ONE purposeful return (Yard → Concourse
 * → Workshop) is walked; the participant cannot be trapped (Deck →
 * Concourse); no measurement event fires anywhere on the bare route;
 * developer aliases are recorded as developer launches; `?route=legacy`
 * keeps the Dock → Hub ring.
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
  concourseToDeck,
  concourseToLabBriefed,
  concourseToWorkshop,
  dockToConcourse,
  expectNoMeasurementEvents,
  expectStage,
  labApproach,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotEventTypes,
  pilotProbe,
  playerScene,
  press,
  returnShiftToDeckClosure,
  useDoor,
  valeHandover,
  waitScene,
  walkTo,
  workshopSignOff,
  workshopToConcourse,
  yardApproach,
  yardReturnToConcourse,
} from './pilotHelpers';

interface MapProbe {
  open: boolean;
  current: string | null;
  destination: string | null;
  discovered: string[];
  log_entries: string[];
}

async function openMap(page: import('@playwright/test').Page) {
  await press(page, 'm');
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
        .__pilotMapProbe?.open === true,
    undefined,
    { timeout: 5000 },
  );

  return page.evaluate(
    () =>
      (window as unknown as { __pilotMapProbe?: MapProbe | null })
        .__pilotMapProbe ?? null,
  );
}

async function closeMap(page: import('@playwright/test').Page) {
  await press(page, 'Escape');
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
        .__pilotMapProbe?.open === false,
    undefined,
    { timeout: 5000 },
  );
}

test.describe('pilot route v2 — topology and guidance (Unit 1)', () => {
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
    expect(
      types.filter((t) => t === 'movement_instruction_shown'),
    ).toHaveLength(1);
    expect(await playerScene(page)).toBe('dock');

    const coverage = await pilotCoverage(page);

    if (coverage !== null) {
      expect(coverage.launch_mode).toBe('participant');
    }

    await completeDockTutorial(page, 2);
    expect(await pilotEventTypes(page)).toContain('tutorial_completed');
    await expectNoMeasurementEvents(page);
    expectNoRuntimeErrors(errors);
  });

  test('six-zone hub-and-loop: every door bidirectional, one objective, beacon hides on arrival, map/log and controls work, one purposeful return, no dead end', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    const errors = captureErrors(page);

    await bootPilot(page, 'topo');
    await completeDockTutorial(page, 1);

    // ——— Episode 1: Dock → Concourse ———
    await dockToConcourse(page);

    let probe = await pilotProbe(page);

    expect(probe?.zone).toBe('station_concourse');
    expect(probe?.stage).toBe('handover_briefing');
    expect(probe?.episode).toBe(1);
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
    // World V2 rescue geometry (`5d05115`): the Dock-side Concourse spawn
    // (352,224) stands 89 px from Vale (440,208) — inside the beacon's
    // 120 px arrival range (PilotZoneScene BEACON_ARRIVAL_RANGE), so the
    // beacon is already hidden on arrival. The pre-rescue assertion
    // (visible at the spawn) encoded the old 60×38 distances. Assert the
    // rule itself: hidden inside the range, shown once the participant is
    // beyond it (west across the hall, ≈ 208 px from Vale), hidden again on
    // the return.
    expect(probe?.beacon?.visible).toBe(false);
    expect(probe?.mission_log).toEqual([]);
    await walkTo(page, 232, 224, { yFirst: false });
    probe = await pilotProbe(page);
    expect(probe?.beacon?.kind).toBe('npc');
    expect(probe?.beacon?.visible).toBe(true);
    await walkTo(page, 352, 224, { yFirst: false }); // back to the spawn
    expect((await pilotProbe(page))?.beacon?.visible).toBe(false);

    // Concourse ↔ Dock (bidirectional).
    await useDoor(page, PILOT.concourse.southDoor, 'dock', {
      approachOffset: { x: 0, y: -40 },
    });
    expect(await playerScene(page)).toBe('dock');
    await walkTo(
      page,
      PILOT.dock.northDoorApproach.x,
      PILOT.dock.northDoorApproach.y,
      { yFirst: true },
    );
    await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
      approachOffset: { x: 0, y: 20 },
    });

    // Vale's beats: briefing → incident_handover → workshop.
    await valeHandover(page);
    probe = await pilotProbe(page);
    expect(probe?.stage).toBe('workshop');
    expect(probe?.episode).toBe(2);
    expect(probe?.beacon?.kind).toBe('door');
    expect(probe?.beacon?.label).toBe('Records Workshop');

    // Beacon hides on arrival (< 120 px of the west door).
    await walkTo(
      page,
      PILOT.concourse.westDoor.x + 52,
      PILOT.concourse.westDoor.y,
      { yFirst: true },
    );
    probe = await pilotProbe(page);
    expect(probe?.beacon?.visible).toBe(false);

    // M station map + mission log: current, destination, discovery, empty log.
    let map = await openMap(page);

    expect(map?.current).toBe('station_concourse');
    expect(map?.destination).toBe('records_workshop');
    expect(map?.discovered).toEqual(
      expect.arrayContaining(['dock', 'station_concourse']),
    );
    expect(map?.discovered).not.toContain('records_workshop');
    expect(map?.log_entries).toEqual([]);
    await closeMap(page);
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

    // ——— Episode 2: Concourse ↔ Workshop (bidirectional), board sign-off ———
    await concourseToWorkshop(page);
    probe = await pilotProbe(page);
    expect(probe?.zone).toBe('records_workshop');
    expect(probe?.beacon?.kind).toBe('station');
    expect(probe?.beacon?.label).toBe('Work Order Board');
    await workshopToConcourse(page);
    expect(await playerScene(page)).toBe('station_concourse');
    await concourseToWorkshop(page);
    await workshopSignOff(page);
    probe = await pilotProbe(page);
    expect(probe?.stage).toBe('lab_briefing');
    expect(probe?.episode).toBe(3);
    expect(probe?.beacon?.kind).toBe('door');
    expect(probe?.beacon?.label).toBe('Station Concourse');

    // ——— Episode 3: Concourse ↔ Lab (bidirectional), Kai's beats ———
    await workshopToConcourse(page);
    probe = await pilotProbe(page);
    expect(probe?.beacon?.label).toBe('Diagnostics Laboratory');
    await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: 20 },
      yFirst: false,
    });
    await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
      approachOffset: await labApproach(page, PILOT.lab.southDoor),
    });
    await concourseToLabBriefed(page);
    expect((await pilotProbe(page))?.stage).toBe('lab_work');

    // ——— Episode 4: Lab ↔ Yard (bidirectional), Noor's beats ———
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: await labApproach(page, PILOT.lab.kai),
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'exterior_briefing');
    probe = await pilotProbe(page);
    expect(probe?.beacon?.label).toBe('Exterior Airlock');
    await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
      approachOffset: await labApproach(page, PILOT.lab.airlock),
    });
    expect((await pilotProbe(page))?.zone).toBe('exterior_recovery_yard');
    await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: -40 },
    });
    expect(await playerScene(page)).toBe('diagnostics_laboratory');
    // Kai at exterior_briefing only redirects (no stage change).
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: await labApproach(page, PILOT.lab.kai),
    });
    await selectPromptOption(page, 1);
    expect((await pilotProbe(page))?.stage).toBe('exterior_briefing');
    await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
      approachOffset: await labApproach(page, PILOT.lab.airlock),
    });
    await openPromptAt(page, PILOT.yard.noor, {
      approachOffset: await yardApproach(page, PILOT.yard.noor),
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'exterior_work');
    // M05 (Unit 6): Noor's extra flag job follows "Ready"; declined here.
    await page.waitForTimeout(450);
    await selectPromptOption(page, 2);
    await page.waitForTimeout(300);
    expect((await pilotProbe(page))?.episode).toBe(4);

    // ——— Episode 5: the ONE purposeful return ———
    await yardReturnToConcourse(page);
    probe = await pilotProbe(page);
    expect(probe?.stage).toBe('return_hub');
    expect(probe?.episode).toBe(5);
    expect(probe?.zone).toBe('station_concourse');
    expect(probe?.beacon?.kind).toBe('npc');
    expect(probe?.beacon?.label).toBe('Vale');
    await returnShiftToDeckClosure(page);
    probe = await pilotProbe(page);
    expect(probe?.stage).toBe('deck_closure');
    expect(probe?.episode).toBe(6);
    expect(probe?.beacon?.label).toBe('Utility Deck');

    // ——— Episode 6: Concourse ↔ Deck (bidirectional), no dead end ———
    await concourseToDeck(page);
    probe = await pilotProbe(page);
    expect(probe?.zone).toBe('utility_core_deck');
    expect(probe?.beacon?.label).toBe('Shift Review Panel');
    await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
      approachOffset: { x: 40, y: 0 },
      yFirst: true,
    });
    expect(await playerScene(page)).toBe('station_concourse');
    await concourseToDeck(page);

    // The review panel is live — leave via the explicit return option
    // (nothing committed, the record stays open; Unit 6).
    await openPromptAt(page, PILOT.deck.reviewPanel, {
      approachOffset: { x: 0, y: 44 },
      yFirst: false,
    });
    expect(await pilotEventTypes(page)).toContain(
      'pilot_closure_review_opened',
    );
    await selectPromptOption(page, 2);
    await page.waitForTimeout(400);

    // Map from the deck: every zone discovered except the Core Chamber
    // (behind the readiness-gated door, Unit 6), current = deck.
    map = await openMap(page);
    expect(map?.current).toBe('utility_core_deck');
    expect([...(map?.discovered ?? [])].sort()).toEqual(
      [
        'diagnostics_laboratory',
        'dock',
        'exterior_recovery_yard',
        'records_workshop',
        'station_concourse',
        'utility_core_deck',
      ].sort(),
    );
    await closeMap(page);

    // The stage machine walked every stage in order through the beats.
    const advanced = (await getEvents(page))
      .filter((event) => event.event_type === 'pilot_stage_advanced')
      .map((event) => (event.metadata as { to: string }).to);

    expect(advanced).toEqual([
      'handover_briefing',
      'incident_handover',
      'workshop',
      'workshop_work',
      'lab_briefing',
      'lab_work',
      'exterior_briefing',
      'exterior_work',
      'return_hub',
      'workshop_return',
      'deck_closure',
    ]);

    // Zero measurement events across the whole bare route; no runtime errors.
    await expectNoMeasurementEvents(page);

    // No participant-visible item/proto/Q identifiers in any stage telemetry.
    for (const event of (await getEvents(page)).filter(
      (e) => e.event_type === 'pilot_stage_advanced',
    )) {
      expect(JSON.stringify(event.metadata)).not.toMatch(
        /proto_|\bM\d{2}\b|\bQ\d{2}\b/,
      );
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
    // mid-way; recorded, never the participant default). The new Records
    // Workshop alias is routable and recorded the same way.
    await bootPilotScene(page, 'devzone', 'records_workshop');
    expect((await pilotProbe(page))?.launch_mode).toBe('developer');
    expect((await pilotProbe(page))?.zone).toBe('records_workshop');
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

    expect(await pilotEventTypes(page)).not.toContain('pilot_opening_shown');
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);
    expect(await playerScene(page)).toBe('hub');
  });
});
