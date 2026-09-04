import { expect, test } from '@playwright/test';

import {
  bootGame,
  driveAxisTo,
  getEvents,
  getEventTypes,
  press,
} from './helpers';

/**
 * V3 §9 / smoke-plan spec 2: movement + first SPACE interaction in the
 * Dock, canonical baseline events with room_id "dock_arrival" and empty
 * study_item_ids, legacy dock_* events preserved, control_error_count
 * aggregate.
 */
test('dock movement, first interaction, and tutorial completion log canonically', async ({
  page,
}) => {
  await bootGame(page, {
    participant_id: 'E2E_P2',
    game_session_id: 'E2E_DOCK_S1',
    condition: 'pilot',
    game_version: 'e2e',
  });

  // Two deliberate out-of-range interaction attempts (control errors).
  await press(page, 'Space');
  await press(page, 'Space');

  // Move to the highlighted marker (544, 224), then to the Arrival
  // Terminal (96, 96). V4: position-synced legs (the same real held-arrow
  // input, stopped on the observed position) — the software-GL
  // verification renderer is frame-rate bound, so fixed-duration holds
  // under-shoot; the events asserted below are unchanged.
  await driveAxisTo(page, 'x', 544, 12);
  await driveAxisTo(page, 'y', 224, 12);
  // Back north to the clear upper lane before heading west (the crate
  // block occupies rows 7-8 between the marker and the terminal).
  await driveAxisTo(page, 'y', 140, 12);
  await driveAxisTo(page, 'x', 96, 12);

  // First in-range interaction opens the tutorial prompt.
  await press(page, 'Space');
  // Option 2: review controls and confirm readiness.
  await press(page, '2');

  const types = await getEventTypes(page);

  // Canonical baseline events, in order relative to each other.
  const canonicalOrder = [
    'dock_started',
    'movement_instruction_shown',
    'first_movement',
    'first_interaction',
    'tutorial_completed',
  ];
  const positions = canonicalOrder.map((t) => types.indexOf(t));

  for (const [i, position] of positions.entries()) {
    expect(position, `${canonicalOrder[i]} must be logged`).toBeGreaterThan(-1);
  }
  expect([...positions]).toEqual([...positions].sort((a, b) => a - b));

  // Legacy path events preserved verbatim.
  for (const legacy of [
    'dock_tutorial_opened',
    'dock_controls_reviewed',
    'dock_tutorial_completed',
    'dock_instruction_followed',
  ]) {
    expect(types, `legacy ${legacy} must still fire`).toContain(legacy);
  }

  const events = await getEvents(page);

  // Every dock event is control-only: room_id dock_arrival, empty
  // study_item_ids, no construct_id.
  for (const event of events.filter((e) => e.room_id === 'dock_arrival')) {
    expect(event.study_item_ids).toEqual([]);
    expect(event.construct_id).toBeUndefined();
  }

  // tutorial_completed carries the fold metadata for the reviewed path.
  const tutorialCompleted = events.find(
    (e) => e.event_type === 'tutorial_completed',
  );

  expect(tutorialCompleted?.metadata).toEqual({ path: 'reviewed' });

  // control_error_count aggregates exactly the two injected errors.
  const controlErrors = events.filter(
    (e) => e.event_type === 'control_error_count',
  );

  expect(controlErrors).toHaveLength(1);
  expect(controlErrors[0].metadata).toEqual({ count: 2 });
});
