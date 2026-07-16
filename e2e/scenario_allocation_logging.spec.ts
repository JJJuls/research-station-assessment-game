import { expect, test } from '@playwright/test';

import {
  findEvent,
  findEvents,
  getEvents,
  getLastFeedbackText,
  hubToAllocationConsole,
  hubToStatusBoard,
  scenarioProbe,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  eventCount,
  expectNoRuntimeErrors,
  missionState,
  waitForEventCount,
} from './journey';

/**
 * Pilot Scenario B — overnight priority-slot allocation (Station Hub,
 * src/scenarios framework ordered-picks mode). Room-isolation spec via the
 * direct ?scene=hub launch.
 *
 * Asserts the ordering component end to end: per-slot selections, full
 * revision, commit latency fields, the final allocation value, consequence
 * and completion — plus that the Hub status board and mission state stay
 * untouched by scenario play (ADV-5 byte-pins the board).
 */

const SCENARIO_ID = 'priority_allocation';

test.describe('pilot scenario: priority allocation', () => {
  test('ordered slot picks, revision, commit, consequence, completion, duplicate-completion gate, board isolation', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'SCN_B1',
        game_session_id: 'SCN_B1_S',
        condition: 'pilot_scenario',
        scene: 'hub',
      },
      'hub',
    );

    // — Activation —
    await hubToAllocationConsole(page);
    await waitForEventCount(page, 'scenario_entered', 'hub', 1);

    let events = await getEvents(page);
    const entered = findEvent(events, 'scenario_entered');

    expect(entered?.room_id).toBe('station_hub');
    expect(entered?.object_id).toBe('hub_priority_allocation_console');
    expect(entered?.metadata?.scenario_id).toBe(SCENARIO_ID);
    expect(entered?.study_item_ids).toBeUndefined();
    expect(entered?.construct_id).toBeUndefined();

    // — Evidence: load forecast (option 2), then return —
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'scenario_evidence_opened', 'hub', 1);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_closed', 'hub', 1);

    events = await getEvents(page);
    expect(
      findEvent(events, 'scenario_evidence_opened')?.metadata?.evidence_id,
    ).toBe('load_forecast');

    // — Ordered picks: option 4 opens the allocation; slot 1 = cryostore
    //   (candidate 2), slot 2 = crew quarters (remaining candidate 2) —
    await selectPromptOption(page, 4);
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'scenario_option_selected', 'hub', 1);
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'scenario_option_selected', 'hub', 2);

    events = await getEvents(page);
    const picks = findEvents(events, 'scenario_option_selected');

    expect(picks[0].choice_value).toBe('cryostore');
    expect(picks[0].metadata?.slot).toBe(1);
    expect(picks[0].metadata?.slot_label).toBe('Priority slot 1');
    expect(picks[1].choice_value).toBe('crew_quarters');
    expect(picks[1].metadata?.slot).toBe(2);

    let probe = await scenarioProbe(page, SCENARIO_ID);

    expect(probe?.selectedValue).toBe('cryostore>crew_quarters');

    // — Full revision on the review stage (option 2), then re-pick:
    //   slot 1 = life support (candidate 1), slot 2 = cryostore (candidate 1)
    //   -> scenario_option_changed records the complete-value change —
    await selectPromptOption(page, 2);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_option_selected', 'hub', 3);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_option_changed', 'hub', 1);

    events = await getEvents(page);
    const changed = findEvent(events, 'scenario_option_changed');

    expect(changed?.metadata?.previous_value).toBe('cryostore>crew_quarters');
    expect(changed?.metadata?.new_value).toBe('life_support>cryostore');

    // — Commit (option 1 on the review stage) —
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_decision_committed', 'hub', 1);

    events = await getEvents(page);
    const committed = findEvent(events, 'scenario_decision_committed');

    expect(committed?.choice_value).toBe('life_support>cryostore');
    expect(committed?.metadata?.changes_before_commit).toBe(1);
    expect(committed?.metadata?.evidence_viewed_count).toBe(1);
    expect(committed?.metadata?.optional_info_requested).toBe(false);
    expect(
      committed?.metadata?.commit_latency_ms as number,
    ).toBeGreaterThanOrEqual(0);
    expect(findEvents(events, 'scenario_consequence_shown')).toHaveLength(1);
    expect(
      findEvent(events, 'scenario_consequence_shown')?.metadata
        ?.committed_value,
    ).toBe('life_support>cryostore');

    // — Completion —
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_completed', 'hub', 1);

    probe = await scenarioProbe(page, SCENARIO_ID);
    expect(probe?.completed).toBe(true);
    expect(probe?.committedValue).toBe('life_support>cryostore');

    // — Duplicate-completion gate —
    const briefingsBefore = await eventCount(
      page,
      'scenario_briefing_opened',
      'hub',
    );

    await hubToAllocationConsole(page);
    await page.waitForTimeout(600);

    expect(await getLastFeedbackText(page)).toContain(
      'already committed tonight',
    );

    events = await getEvents(page);
    expect(findEvents(events, 'scenario_entered')).toHaveLength(1);
    expect(findEvents(events, 'scenario_decision_committed')).toHaveLength(1);
    expect(findEvents(events, 'scenario_completed')).toHaveLength(1);
    expect(findEvents(events, 'scenario_briefing_opened')).toHaveLength(
      briefingsBefore,
    );

    // — Board isolation: the status board text is untouched by scenario
    //   play (ADV-5 byte-pins this format) and mission state is unchanged —
    const boardBefore = await eventCount(
      page,
      'station_hub_status_board_viewed',
      'hub',
    );

    await hubToStatusBoard(page);
    await waitForEventCount(
      page,
      'station_hub_status_board_viewed',
      'hub',
      boardBefore + 1,
    );

    const board = await getLastFeedbackText(page);

    expect(board).toContain('STATION STATUS');
    expect(board).not.toContain('llocation');
    expect(board).not.toContain('riority');

    const mission = await missionState(page);

    expect(mission.completed_rooms).toEqual([]);
    expect(mission.active_objectives).toEqual([]);

    // — Scenario events never leak into other scenes —
    for (const event of await getEvents(page)) {
      if (String(event.event_type).startsWith('scenario_')) {
        expect(event.scene).toBe('hub');
        expect(event.metadata?.scenario_id).toBe(SCENARIO_ID);
      }
    }

    expectNoRuntimeErrors(capture);
  });
});
