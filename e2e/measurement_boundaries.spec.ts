import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  driveAxisTo,
  findEvent,
  findEvents,
  getEvents,
  getLastFeedbackText,
  getLastPromptBody,
  press,
  selectPromptOption,
} from './helpers';
import {
  completeAllPilotDecisions,
  completeDockTutorial,
  dockToHubJourney,
  eventCount,
  hubToStationJourney,
  missionState,
  openStationAlcove,
  waitForEventCount,
} from './journey';

/**
 * Unit 3 measurement-boundary coverage (overnight prototype).
 *
 * Verifies the adopted NEXT-10 measurement designs as IMPLEMENTED
 * BOUNDARIES — availability, independence, shared-construct unity, and
 * validity recording. Everything asserted here is raw prototype
 * telemetry (proto_* events, __measurementValidity probe): no canonical
 * events, no scores.
 */

/**
 * Local mirror of src/measurement/validity.ts assignCounterbalance (that
 * module can't be imported in the Node test process — it touches
 * import.meta.env). Must stay byte-equivalent to the source hash.
 */
function assignCounterbalance<T>(
  sessionId: string,
  slotKey: string,
  options: readonly T[],
): T {
  const input = `${sessionId}:${slotKey}`;
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }

  return options[Math.abs(hash) % options.length];
}

async function bootToDock(page: Page, participant: string, session: string) {
  await page.goto(`/?participant_id=${participant}&game_session_id=${session}`);
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'dock',
  );
}

async function validityRecords(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __measurementValidity?:
            | {
                opportunity_id: string;
                owner: string;
                entry_state_version: string;
                offered: boolean;
                entered: boolean;
                completed: boolean;
                prior_exposure: string[];
                validity: string;
              }[]
            | null;
        }
      ).__measurementValidity ?? null,
  );
}

/**
 * Opens the nearest station prompt with a swallowed-press retry (the
 * documented SwiftShader intermittent input loss): SPACE, then verify the
 * card panel actually rendered via the __promptCards probe.
 */
async function openPrompt(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await press(page, 'Space');

    const opened = await page
      .waitForFunction(
        () =>
          ((
            window as unknown as {
              __promptCards?: { label: string }[] | null;
            }
          ).__promptCards ?? null) !== null,
        undefined,
        { timeout: 3000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (opened) {
      return;
    }
  }

  throw new Error('prompt did not open after 3 SPACE presses');
}

/** Door activation with the same swallowed-press retry. */
async function enterDoor(page: Page, sceneName: string) {
  const before = await eventCount(page, 'scene_start', sceneName);

  for (let attempt = 0; attempt < 3; attempt++) {
    await press(page, 'Space');

    const entered = await page
      .waitForFunction(
        ({ scene, wanted }) =>
          (
            window as unknown as {
              researchRuntime?: {
                getEvents: () => { event_type: string; scene?: string }[];
              };
            }
          )
            .researchRuntime!.getEvents()
            .filter((e) => e.event_type === 'scene_start' && e.scene === scene)
            .length >= wanted,
        { scene: sceneName, wanted: before + 1 },
        { timeout: 6000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (entered) {
      return;
    }
  }

  throw new Error(`door to ${sceneName} did not activate`);
}

async function hubToDoor(page: Page, doorX: number, sceneName: string) {
  await driveAxisTo(page, 'y', 368, 14);
  await driveAxisTo(page, 'x', doorX, 10);
  await driveAxisTo(page, 'y', 418, 14);
  await enterDoor(page, sceneName);
}

test.describe('measurement boundaries (Unit 3)', () => {
  test('Q03 cabinet: standardised stow + later retrieval, independent of Inventory', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await bootToDock(page, 'PT_MEASURE_Q03', 'GS_MEASURE_Q03');
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // The stow phase is offered at first Hub entry after check-in —
    // WITHOUT ever visiting the Inventory/Prep room.
    let events = await getEvents(page);

    expect(events.map((e) => e.event_type)).toContain('proto_q03_stow_offered');

    // Stow the three tools (first tool -> Measurement shelf, rest -> any).
    await driveAxisTo(page, 'y', 368, 12);
    await driveAxisTo(page, 'x', 640, 10);
    await driveAxisTo(page, 'y', 344, 10);
    for (let i = 0; i < 3; i++) {
      await press(page, 'Space');
      await press(page, '1');
      await press(page, '1'); // Measurement shelf every time
    }

    events = await getEvents(page);
    expect(findEvents(events, 'proto_q03_tool_stowed')).toHaveLength(3);
    expect(events.map((e) => e.event_type)).toContain(
      'proto_q03_stow_completed',
    );

    // Visit another room (Utility Bay round trip) to open the later
    // retrieval window.
    await hubToDoor(page, 576, 'utility_bay');
    const hubBefore = await eventCount(page, 'scene_start', 'hub');

    await driveAxisTo(page, 'y', 100, 12);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'hub', hubBefore + 1);

    events = await getEvents(page);
    expect(events.map((e) => e.event_type)).toContain(
      'proto_q03_retrieval_offered',
    );

    // Retrieve: first open = the slot we stowed it in.
    await driveAxisTo(page, 'y', 368, 12);
    await driveAxisTo(page, 'x', 640, 10);
    await driveAxisTo(page, 'y', 344, 10);
    await press(page, 'Space');
    await press(page, '1');

    events = await getEvents(page);
    const retrieved = findEvent(events, 'proto_q03_retrieved');

    expect(retrieved).toBeDefined();
    expect(
      (retrieved!.metadata as { first_open_correct?: boolean })
        .first_open_correct,
    ).toBe(true);

    // SA-13 record: completed, with the standardised entry version.
    const records = await validityRecords(page);
    const q03 = records?.find(
      (r) => r.opportunity_id === 'proto_q03_calibration_retrieval',
    );

    expect(q03).toBeDefined();
    expect(q03!.owner).toBe('Q03');
    expect(q03!.entry_state_version).toBe('q03-cabinet-v1');
    expect(q03!.completed).toBe(true);
    expect(q03!.validity).toBe('valid');

    // The Inventory/Prep room was never entered (independence witness).
    const mission = await missionState(page);

    expect(mission.completed_rooms).not.toContain('inventory_prep_room');
  });

  test('Q27 utility-stop: window opens at the signal, independent of Hazard/Side Repair', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    await bootToDock(page, 'PT_MEASURE_Q27', 'GS_MEASURE_Q27');
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);
    await hubToDoor(page, 576, 'utility_bay');

    // Three useful cycles; the standardised stop signal fires at the
    // third cycle's completion.
    await driveAxisTo(page, 'x', 288, 10);
    await driveAxisTo(page, 'y', 176, 10);
    for (let i = 0; i < 3; i++) {
      await press(page, 'Space');
      await press(page, '1');
      await page.waitForTimeout(1500);
    }

    expect(await getLastFeedbackText(page)).toContain(
      'no new information and no additional operational benefit',
    );

    // One post-signal cycle, then close — both equally accessible.
    await press(page, 'Space');
    expect(await getLastPromptBody(page)).toContain('Diagnostic complete');
    await press(page, '1');
    await page.waitForTimeout(1500);
    expect(await getLastFeedbackText(page)).toContain('No new findings');

    await press(page, 'Space');
    await press(page, '2');

    const events = await getEvents(page);
    const closed = findEvent(events, 'proto_q27_closed');

    expect(closed).toBeDefined();
    expect((closed!.metadata as { extra_cycles?: number }).extra_cycles).toBe(
      1,
    );
    expect(findEvents(events, 'proto_q27_useful_cycle')).toHaveLength(3);
    expect(events.map((e) => e.event_type)).toContain(
      'proto_q27_stop_signal_shown',
    );

    // Independence: the whole module ran without touching Hazard or Side
    // Repair state, and its events carry no canonical context.
    const mission = await missionState(page);

    expect(mission.hazard_status).toBe('not_started');
    expect(mission.side_repair_status).toBe('not_started');
    expect(closed!.study_item_ids).toBeUndefined();
    expect(closed!.construct_id).toBeUndefined();

    const records = await validityRecords(page);
    const q27 = records?.find(
      (r) => r.opportunity_id === 'proto_q27_utility_stop',
    );

    expect(q27?.completed).toBe(true);
    expect(q27?.validity).toBe('valid');
    expect(
      q27?.prior_exposure.some((note) =>
        note.startsWith('hazard_status:not_started'),
      ),
    ).toBe(true);
  });

  test('Q29/Q31 one shared construct; Q30 two instances; Q32/Q33 distinct modules', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const SESSION = 'GS_MEASURE_ANNEX';

    await bootToDock(page, 'PT_MEASURE_ANNEX', SESSION);
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // — Q30 instance 1: Work Order Board (Hub, SW wall).
    await driveAxisTo(page, 'y', 368, 12);
    await driveAxisTo(page, 'x', 96, 10);
    await driveAxisTo(page, 'y', 398, 14);
    await openPrompt(page);
    await selectPromptOption(page, 1);

    // — Operations Annex: horizon form B, portfolio, closure desk.
    await driveAxisTo(page, 'y', 368, 12);
    await driveAxisTo(page, 'x', 704, 10);
    await driveAxisTo(page, 'y', 418, 14);
    await enterDoor(page, 'ops_annex');

    // Planning terminal (form B).
    await driveAxisTo(page, 'y', 96, 10);
    await driveAxisTo(page, 'x', 96, 10);
    await openPrompt(page);
    await selectPromptOption(page, 1);

    // Portfolio board: activate one project, advance once, step away.
    await driveAxisTo(page, 'x', 448, 10);
    await openPrompt(page);
    await selectPromptOption(page, 1); // activate first project
    await openPrompt(page);
    await selectPromptOption(page, 1); // advance it (timed action)
    await page.waitForTimeout(1200);
    await openPrompt(page);
    await selectPromptOption(page, 6); // [advance, 3× activate, park, away]

    // Closure desk: close ONE contract (self-selected), then leave.
    await driveAxisTo(page, 'x', 288, 10);
    await driveAxisTo(page, 'y', 208, 10);
    await openPrompt(page);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(1300);
    await openPrompt(page);
    await selectPromptOption(page, 5); // 4 open contracts + leave

    // Back to the Hub, then the Engineer planning slate (form A).
    await driveAxisTo(page, 'y', 96, 12);
    await driveAxisTo(page, 'x', 288, 10);
    await driveAxisTo(page, 'y', 90, 14);
    await enterDoor(page, 'hub');
    await hubToStationJourney(page, 'engineer_hub');
    await driveAxisTo(page, 'y', 180, 12);
    await driveAxisTo(page, 'x', 128, 10);
    await openPrompt(page);
    await selectPromptOption(page, 1);

    const events = await getEvents(page);

    // Q29/Q31: exactly two observations, one per form, ONE shared record.
    const horizonChoices = findEvents(events, 'proto_horizon_choice');

    expect(horizonChoices).toHaveLength(2);

    const forms = horizonChoices
      .map((e) => (e.metadata as { form?: string }).form)
      .sort();

    expect(forms).toEqual(['A_npc', 'B_terminal']);

    // The pressed first option maps through the recorded counterbalance
    // order — the spec computes the same deterministic assignment.
    const orderB = assignCounterbalance(SESSION, 'horizon_form_b', [
      'immediate_first',
      'distributed_first',
    ] as const);
    const choiceB = horizonChoices.find(
      (e) => (e.metadata as { form?: string }).form === 'B_terminal',
    )!;

    expect((choiceB.metadata as { option_order?: string }).option_order).toBe(
      orderB,
    );
    expect(choiceB.choice_value).toBe(
      orderB === 'immediate_first' ? 'immediate' : 'distributed',
    );

    // Q30: two distinct instances, two distinct opportunity records.
    const q30Choices = findEvents(events, 'proto_q30_structure_chosen');

    expect(
      q30Choices.map(
        (e) => (e.metadata as { instance_id?: string }).instance_id,
      ),
    ).toContain('work_orders');

    // Q32/Q33: distinct event families with their own summaries.
    expect(events.map((e) => e.event_type)).toContain(
      'proto_q32_project_activated',
    );
    expect(events.map((e) => e.event_type)).toContain('proto_q32_board_closed');

    const deskLeft = findEvent(events, 'proto_q33_desk_left');

    expect(deskLeft).toBeDefined();
    expect((deskLeft!.metadata as { closed_count?: number }).closed_count).toBe(
      1,
    );
    expect((deskLeft!.metadata as { open_count?: number }).open_count).toBe(4);

    const records = await validityRecords(page);
    const ids = (records ?? []).map((r) => r.opportunity_id);

    // One shared horizon record — never two item records.
    expect(
      (records ?? []).filter((r) => r.owner.includes('Q29/Q31')),
    ).toHaveLength(1);
    expect(ids).toContain('proto_q30_work_orders');
    expect(ids).toContain('proto_q32_project_portfolio');
    expect(ids).toContain('proto_q33_closure_queue');

    const shared = (records ?? []).find((r) => r.owner.includes('Q29/Q31'))!;

    expect(shared.completed).toBe(true);
  });

  test('corridor de-gating: relay check-in exists without any Q10 duty', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    await bootToDock(page, 'PT_MEASURE_CORRIDOR', 'GS_MEASURE_CORRIDOR');
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // Straight to the corridor — the Engineer Hub (Q10 duty offer) is
    // never visited.
    await hubToStationJourney(page, 'interruption_corridor');

    const events = await getEvents(page);
    const scheduled = findEvent(events, 'proto_corridor_checkin_scheduled');

    expect(scheduled).toBeDefined();
    expect(
      (scheduled!.metadata as { relay_duty_accepted?: boolean })
        .relay_duty_accepted,
    ).toBe(false);

    // The relay checkpoint OPENS and completes (pre-ruling behaviour:
    // "No relay check-in is scheduled for you").
    await driveAxisTo(page, 'x', 192, 10);
    await driveAxisTo(page, 'y', 112, 10);
    await press(page, 'Space');
    expect(await getLastPromptBody(page)).toContain('Relay checkpoint');
    await press(page, '1');
    await press(page, '1');

    const after = await getEvents(page);

    expect(after.map((e) => e.event_type)).toContain('prior_goal_completed');

    const mission = await missionState(page);

    expect(mission.accepted_duties).toEqual([]);
    expect(mission.relay_checkpoint_status).toBe('completed');
  });

  test('Final Core baseline: identical baseline blocker and force option for every session', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    await bootToDock(page, 'PT_MEASURE_FCBASE', 'GS_MEASURE_FCBASE');
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);
    await completeAllPilotDecisions(page);
    await hubToStationJourney(page, 'final_core_room');
    await openStationAlcove(page);

    // The baseline issue leads the outstanding flags, and the force
    // option exists — in a session that created NO interruption issues.
    const body = await getLastPromptBody(page);

    expect(body).toContain('core sync buffer flag pending review');
    expect(body).toContain('Force the synchronization');

    const events = await getEvents(page);
    const baseline = findEvent(events, 'proto_final_core_baseline_presented');

    expect(baseline).toBeDefined();
    expect(
      (baseline!.metadata as { baseline_version?: string }).baseline_version,
    ).toBe('fc-baseline-v1');
    expect(events.map((e) => e.event_type)).toContain(
      'final_core_blocker_shown',
    );
  });
});
