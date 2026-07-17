import { expect, test } from '@playwright/test';

import {
  bootGame,
  findEvent,
  findEvents,
  getEvents,
  getSummary,
} from './helpers';
import { completeDockTutorial } from './journey';

/**
 * Dock tutorial alternative paths (coverage-gap closure): the skip and
 * practice options and their registered-but-unmapped control events
 * (dock_instruction_shortcut, dock_control_familiarisation — both frozen
 * as study_item_ids: [] control/usability telemetry, CanonicalEventContext).
 * The reviewed path (option 2) stays covered by
 * movement_and_first_interaction.spec.ts.
 */

test.describe('dock tutorial alternative paths', () => {
  test('skip path logs dock_instruction_shortcut as empty-mapped control telemetry', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P2',
      game_session_id: 'E2E_DOCK_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });

    await completeDockTutorial(page, 1); // skip the tutorial

    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);

    expect(types).toContain('dock_tutorial_skipped');
    expect(types).toContain('tutorial_completed');
    // Skip path never fires the reviewed/practiced family (emission
    // placement rule: each legacy event belongs to exactly one option).
    expect(types).not.toContain('dock_controls_reviewed');
    expect(types).not.toContain('dock_instruction_followed');
    expect(types).not.toContain('dock_movement_practiced');
    expect(types).not.toContain('dock_control_familiarisation');
    expect(types).not.toContain('dock_tutorial_completed');

    const shortcut = findEvents(events, 'dock_instruction_shortcut');

    expect(shortcut).toHaveLength(1);
    // Frozen registration: control-only event, empty study_item_ids, no
    // construct, no success flag.
    expect(shortcut[0].room_id).toBe('dock_arrival');
    expect(shortcut[0].study_item_ids).toEqual([]);
    expect(shortcut[0].construct_id).toBeUndefined();
    expect(shortcut[0].success).toBeUndefined();

    const tutorialCompleted = findEvent(events, 'tutorial_completed');

    expect(tutorialCompleted?.metadata).toEqual({ skipped: true });

    // Control-layer summary variables stay separated from construct
    // variables: only the tutorial-control fields move.
    const summary = await getSummary(page);

    expect(summary.control_tutorial_skipped).toBe(true);
    expect(summary.control_tutorial_completed).toBe(false);
    expect(summary.control_familiarisation_used).toBe(false);
    expect(summary.control_tutorial_count).toBe(1);
  });

  test('practice path logs dock_control_familiarisation as empty-mapped control telemetry', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P2',
      game_session_id: 'E2E_DOCK_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });

    await completeDockTutorial(page, 3); // practice movement first

    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);

    expect(types).toContain('dock_movement_practiced');
    expect(types).toContain('dock_tutorial_completed');
    expect(types).toContain('tutorial_completed');
    expect(types).not.toContain('dock_tutorial_skipped');
    expect(types).not.toContain('dock_instruction_shortcut');
    expect(types).not.toContain('dock_controls_reviewed');
    expect(types).not.toContain('dock_instruction_followed');

    const familiarisation = findEvents(events, 'dock_control_familiarisation');

    expect(familiarisation).toHaveLength(1);
    expect(familiarisation[0].room_id).toBe('dock_arrival');
    expect(familiarisation[0].study_item_ids).toEqual([]);
    expect(familiarisation[0].construct_id).toBeUndefined();
    expect(familiarisation[0].success).toBeUndefined();

    const tutorialCompleted = findEvent(events, 'tutorial_completed');

    expect(tutorialCompleted?.metadata).toEqual({ path: 'practiced' });

    const summary = await getSummary(page);

    expect(summary.control_familiarisation_used).toBe(true);
    expect(summary.control_movement_practiced).toBe(true);
    expect(summary.control_tutorial_skipped).toBe(false);
    expect(summary.control_tutorial_completed).toBe(true);
    expect(summary.control_tutorial_count).toBe(1);
  });
});
