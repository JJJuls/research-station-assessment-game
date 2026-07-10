import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  getEvents,
  getEventTypes,
  getSummary,
  hubToArchive,
  openArchiveTerminal,
  press,
} from './helpers';

/**
 * V3 §9 / smoke-plan spec 3: Archive room logging through the connected
 * world (Dock -> Hub -> Archive), adaptive and blind-retry paths, and the
 * adaptive-vs-inappropriate persistence separation invariant (approved
 * plan §13.7).
 */
test.describe('archive room logging', () => {
  test('adaptive path: wrong code -> feedback -> revised query', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P3',
      game_session_id: 'E2E_ARCH_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToArchive(page);

    await openArchiveTerminal(page);
    await press(page, '1'); // naive code A17 — deterministic scripted failure
    await press(page, 'Space');
    await press(page, '2'); // read feedback
    await press(page, 'Space');
    await press(page, '3'); // revised query — success path

    const types = await getEventTypes(page);

    for (const expected of [
      'archive_room_entered',
      'archive_terminal_opened',
      'archive_code_entered',
      'archive_wrong_code',
      'archive_feedback_shown',
      'archive_feedback_used',
      'archive_strategy_revision',
      'archive_completed',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(types).not.toContain('archive_same_wrong_code_repeated');
    expect(types).not.toContain('archive_abandoned');

    const events = await getEvents(page);
    const wrongCode = events.find((e) => e.event_type === 'archive_wrong_code');
    const revision = events.find(
      (e) => e.event_type === 'archive_strategy_revision',
    );

    expect(wrongCode?.room_id).toBe('archive_room');
    expect(wrongCode?.study_item_ids).toEqual(['Q13']);
    expect(wrongCode?.construct_id).toBe('adaptive_persistence');
    expect(wrongCode?.success).toBe(false);
    expect(revision?.study_item_ids).toEqual(['Q13', 'Q22', 'Q26']);
    expect(revision?.success).toBe(true);

    // Separation invariant: a purely adaptive path never touches the
    // inappropriate-persistence variables.
    const summary = await getSummary(page);

    expect(summary.strategy_revision_count).toBe(1);
    expect(summary.manual_or_feedback_used).toBe(true);
    expect(summary.game_inappropriate_persistence).toBe(0);
    expect(summary.blind_retry_count).toBe(0);
  });

  test('blind retry logs the repeated variant, not a duplicate wrong_code', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P3',
      game_session_id: 'E2E_ARCH_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToArchive(page);

    await openArchiveTerminal(page);
    await press(page, '1'); // wrong code
    await press(page, 'Space');
    await press(page, '1'); // SAME wrong code again

    const types = await getEventTypes(page);

    expect(types.filter((t) => t === 'archive_wrong_code')).toHaveLength(1);
    expect(
      types.filter((t) => t === 'archive_same_wrong_code_repeated'),
    ).toHaveLength(1);

    const events = await getEvents(page);
    const repeated = events.find(
      (e) => e.event_type === 'archive_same_wrong_code_repeated',
    );

    expect(repeated?.study_item_ids).toEqual(['Q26']);
    expect(repeated?.construct_id).toBe('inappropriate_persistence');
    expect(repeated?.success).toBe(false);

    // Separation invariant, maladaptive direction: inappropriate
    // persistence counted, adaptive variables untouched.
    const summary = await getSummary(page);

    expect(summary.game_inappropriate_persistence).toBe(1);
    expect(summary.blind_retry_count).toBe(1);
    expect(summary.strategy_revision_count).toBe(0);
    expect(summary.game_difficulty_persistence).toBe(0);
  });
});
