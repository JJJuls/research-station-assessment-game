import { expect, test } from '@playwright/test';

import {
  clickPromptCard,
  driveAxisTo,
  findEvent,
  findEvents,
  getEvents,
  getLastFeedbackText,
  getPromptCards,
  press,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  completeDockTutorial,
  dockToHubJourney,
  expectNoRuntimeErrors,
  hubToStationJourney,
  waitForEventCount,
} from './journey';

/**
 * Physical-mechanics session (Unit 4): persistence deepening with strict
 * evidence separation.
 *
 * - Q23: the Auxiliary Intake Rig is a separately bounded retry-quality
 *   opportunity — its own proto_q23_* family; identical retry, unguided
 *   change and gauge-informed revision are DISTINCT recorded acts; the
 *   gauge-informed revision completes the task; and no rig act emits any
 *   canonical repair_* event (the contested Q14/Q21/Q23 stream is
 *   untouched both ways).
 * - Q26: identical repetition still requires separate completed cycles on
 *   the repair panel (didRepeat semantics preserved beside the rig).
 * - Q27: the utility-stop window gains a switch-to-useful-action route
 *   (bay console) that is equally accessible, reveals nothing, rewards
 *   nothing, and closes the window as a valid stop.
 */

async function repairPanelSubmit(page: import('@playwright/test').Page) {
  await driveAxisTo(page, 'x', 224, 12);
  await driveAxisTo(page, 'y', 200, 10);
  await driveAxisTo(page, 'x', 304, 10);
  await driveAxisTo(page, 'y', 180, 8);
}

test.describe('persistence mechanics (Unit 4)', () => {
  test('Q23 intake rig: identical vs unguided vs gauge-informed retries', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await bootJourney(page, {
      participant_id: 'PT_Q23_RIG',
      game_session_id: 'GS_Q23_RIG',
    });
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);
    await hubToStationJourney(page, 'systems_repair_room');

    // — Rig, attempt 1: the standardised setback (always fails).
    await driveAxisTo(page, 'x', 224, 12);
    await driveAxisTo(page, 'y', 272, 12);
    await driveAxisTo(page, 'x', 544, 12);
    await driveAxisTo(page, 'y', 240, 10);
    await press(page, 'Space');
    await selectPromptOption(page, 1); // Run the intake alignment
    await waitForEventCount(page, 'proto_q23_attempt', 'repair', 1);
    await page.waitForTimeout(1300);
    expect(await getLastFeedbackText(page)).toContain('jams');

    // — Attempt 2: identical retry (distinct recorded act).
    await press(page, 'Space');

    let cards = await getPromptCards(page);
    const identical = cards?.find((card) =>
      card.label.includes('same alignment again'),
    );

    expect(identical).toBeDefined();
    await clickPromptCard(page, identical!.index);
    await waitForEventCount(page, 'proto_q23_attempt', 'repair', 2);
    await page.waitForTimeout(1300);

    // — Attempt 3: adjust by feel (real change, but unguided — fails).
    await press(page, 'Space');
    cards = await getPromptCards(page);

    const byFeel = cards?.find((card) => card.label.includes('by feel'));

    expect(byFeel).toBeDefined();
    await clickPromptCard(page, byFeel!.index);
    await waitForEventCount(page, 'proto_q23_attempt', 'repair', 3);
    await page.waitForTimeout(1300);

    // — Attempt 4: "match the gauge" WITHOUT having read the gauge card:
    // records as an unguided change (guessing cannot masquerade as
    // support-informed revision).
    await press(page, 'Space');
    cards = await getPromptCards(page);

    let matchGauge = cards?.find((card) => card.label.includes('gauge'));

    expect(matchGauge).toBeDefined();
    await clickPromptCard(page, matchGauge!.index);
    await waitForEventCount(page, 'proto_q23_attempt', 'repair', 4);
    await page.waitForTimeout(1300);

    // — Consult the gauge card (usable diagnostic support): west along
    // the open row 8, up the col-14 pocket to the card.
    await driveAxisTo(page, 'x', 464, 10);
    await driveAxisTo(page, 'y', 140, 12);
    await press(page, 'Space');
    await waitForEventCount(page, 'proto_q23_gauge_viewed', 'repair', 1);

    // — Attempt 5: gauge-informed revision succeeds.
    await driveAxisTo(page, 'y', 274, 12);
    await driveAxisTo(page, 'x', 544, 10);
    await driveAxisTo(page, 'y', 240, 10);
    await press(page, 'Space');
    cards = await getPromptCards(page);
    matchGauge = cards?.find((card) => card.label.includes('gauge'));
    await clickPromptCard(page, matchGauge!.index);
    await waitForEventCount(page, 'proto_q23_completed', 'repair', 1);
    await page.waitForTimeout(1300);

    const events = await getEvents(page);
    const attempts = findEvents(events, 'proto_q23_attempt');

    expect(
      attempts.map(
        (event) => (event.metadata as { strategy?: string }).strategy,
      ),
    ).toEqual([
      'initial',
      'identical',
      'unguided_change',
      'unguided_change',
      'guided_change',
    ]);

    const completed = findEvent(events, 'proto_q23_completed');
    const summary = completed?.metadata as {
      attempts?: number;
      identical_retries?: number;
      unguided_changes?: number;
      gauge_viewed?: boolean;
    };

    expect(summary.attempts).toBe(5);
    expect(summary.identical_retries).toBe(1);
    expect(summary.unguided_changes).toBe(2);
    expect(summary.gauge_viewed).toBe(true);

    // — Stream separation, both directions: the rig emitted NO canonical
    // repair-stream event, and the untouched repair panel emitted nothing
    // in this session.
    for (const canonical of [
      'repair_attempt',
      'repair_sequence_submitted',
      'repair_failed',
      'repair_same_sequence_repeated',
      'repair_strategy_revision',
      'repair_completed',
      'repair_manual_used',
    ]) {
      expect(findEvent(events, canonical)).toBeUndefined();
    }

    // proto_q23_* events carry no canonical measurement context.
    for (const event of events) {
      if (event.event_type.startsWith('proto_q23_')) {
        expect(event.study_item_ids).toBeUndefined();
        expect(event.construct_id).toBeUndefined();
      }
    }

    expectNoRuntimeErrors(errors);
  });

  test('Q21/Q26: repair panel cycles unchanged beside the rig', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const errors = captureErrors(page);

    await bootJourney(page, {
      participant_id: 'PT_Q26_PANEL',
      game_session_id: 'GS_Q26_PANEL',
    });
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);
    await hubToStationJourney(page, 'systems_repair_room');

    // Default sequence: fail, then identical resubmission in a SEPARATE
    // completed cycle logs the repeated variant (Q26 semantics intact).
    await repairPanelSubmit(page);
    await press(page, 'Space');
    await selectPromptOption(page, 1);
    await press(page, 'Space');
    await selectPromptOption(page, 1);

    let events = await getEvents(page);

    expect(findEvents(events, 'repair_failed')).toHaveLength(1);
    expect(findEvents(events, 'repair_same_sequence_repeated')).toHaveLength(1);

    // Manual-guided revision completes (Q21 continuation path intact).
    await press(page, 'Space');
    await selectPromptOption(page, 2);
    await press(page, 'Space');
    await selectPromptOption(page, 3);

    events = await getEvents(page);
    expect(findEvent(events, 'repair_strategy_revision')).toBeDefined();
    expect(findEvent(events, 'repair_completed')).toBeDefined();

    // No rig telemetry fired in this panel-only session.
    expect(
      events.filter((event) => event.event_type.startsWith('proto_q23_')),
    ).toHaveLength(0);

    expectNoRuntimeErrors(errors);
  });

  test('Q27: switching to a useful action is a valid, unrewarded stop', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const errors = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'PT_Q27_SWITCH',
        game_session_id: 'GS_Q27_SWITCH',
        scene: 'utility_bay',
      },
      'utility_bay',
    );

    // Run the three useful cycles to the standardised stop signal.
    await driveAxisTo(page, 'x', 288, 12);
    await driveAxisTo(page, 'y', 240, 12);
    for (let cycle = 0; cycle < 3; cycle++) {
      await press(page, 'Space');
      await press(page, '1');
      await page.waitForTimeout(1400);
    }

    await waitForEventCount(page, 'proto_q27_stop_signal_shown', undefined, 1);

    // The window offers the switch route; taking it closes the prompt
    // without any cycle.
    await press(page, 'Space');

    const cards = await getPromptCards(page);
    const switchCard = cards?.find((card) =>
      card.label.includes('bay console'),
    );

    expect(switchCard).toBeDefined();
    await clickPromptCard(page, switchCard!.index);

    // File the sweep at the console (embodied useful switch).
    await driveAxisTo(page, 'y', 130, 12);
    await driveAxisTo(page, 'x', 384, 10);
    await press(page, 'Space');
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'proto_q27_switched_to_useful', undefined, 1);

    const events = await getEvents(page);
    const switched = findEvent(events, 'proto_q27_switched_to_useful');
    const metadata = switched?.metadata as { extra_cycles?: number };

    expect(metadata.extra_cycles).toBe(0);
    expect(findEvents(events, 'proto_q27_extra_cycle')).toHaveLength(0);

    // The switch closed the window as a valid stop: the SA-13 record
    // completes without any bot-path close event.
    const validity = await page.evaluate(
      () =>
        (
          window as unknown as {
            __measurementValidity?:
              | {
                  opportunity_id: string;
                  completed: boolean;
                  validity: string;
                }[]
              | null;
          }
        ).__measurementValidity ?? [],
    );
    const record = validity.find(
      (entry) => entry.opportunity_id === 'proto_q27_utility_stop',
    );

    expect(record?.completed).toBe(true);
    expect(record?.validity).toBe('valid');

    // Neutral outcome: no reward, no hidden information.
    expect(await getLastFeedbackText(page)).not.toMatch(
      /bonus|reward|unlock|discover/i,
    );

    expectNoRuntimeErrors(errors);
  });
});
