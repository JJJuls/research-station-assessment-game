import { expect, test } from '@playwright/test';

import {
  bootGame,
  clickPromptCard,
  dockToHub,
  findEvent,
  findEvents,
  getEvents,
  getEventTypes,
  getMinigameSurface,
  getSummary,
  hold,
  hubToArchive,
  hubToStationDoor,
  openArchiveTerminal,
  press,
  waitForNthEvent,
  waitForRoomEntry,
} from './helpers';

/**
 * V3 §9 spec: repair_room_logging.spec.ts — Systems Repair Room logging
 * through the connected world (Dock -> Hub -> Repair), adaptive
 * manual-then-revision path and blind repeat-failed-sequence path, plus
 * the adaptive-vs-inappropriate persistence separation invariant.
 *
 * FABLE-NEXT-03 (task B): the repair is a bounded multi-cycle sequence —
 * every submitted sequence carries an incrementing attempt_number on the
 * canonical events (legacy repair_attempt payload unchanged), an unguided
 * revised submission fails as a distinct cycle, only the manual-guided
 * revision succeeds, and cycle state (attempt counter, guidance flag,
 * didRepeat memory) survives room exit/return.
 */

async function hubToRepair(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'systems_repair_room');
  await waitForRoomEntry(page, 'repair_room_entered');
}

/** Repair spawn -> panel: up clamps under the console alcove. */
async function openRepairPanel(page: import('@playwright/test').Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

test.describe('repair room logging', () => {
  test('adaptive path: default failure -> manual -> revised sequence', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P4',
      game_session_id: 'E2E_REP_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToRepair(page);

    await openRepairPanel(page);
    await press(page, '1'); // default sequence — deterministic scripted failure
    await press(page, 'Space');
    await press(page, '2'); // open repair manual (legacy repair_manual_used)
    await press(page, 'Space');
    await press(page, '3'); // revised sequence — success path

    const types = await getEventTypes(page);

    for (const expected of [
      'repair_room_entered',
      'repair_panel_opened',
      'repair_attempt',
      'repair_sequence_submitted',
      'repair_failed',
      'repair_manual_used',
      'repair_strategy_revision',
      'repair_completed',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(types).not.toContain('repair_same_sequence_repeated');
    expect(types).not.toContain('repair_abandoned');
    // Deliberately unemitted (documentation conflict — see U4 note).
    expect(types).not.toContain('task_started');

    const events = await getEvents(page);
    const failed = findEvent(events, 'repair_failed');
    const revision = findEvent(events, 'repair_strategy_revision');
    const completed = findEvent(events, 'repair_completed');

    expect(failed?.room_id).toBe('systems_repair_room');
    expect(failed?.study_item_ids).toEqual(['Q14', 'Q21']);
    expect(failed?.construct_id).toBe('adaptive_persistence');
    expect(failed?.success).toBe(false);
    expect(revision?.study_item_ids).toEqual(['Q14', 'Q21', 'Q23']);
    expect(revision?.success).toBe(true);
    expect(completed?.study_item_ids).toEqual(['Q06', 'Q14', 'Q21']);
    expect(completed?.construct_id).toBeUndefined();

    // FABLE-NEXT-03: distinct cycles carry the incrementing attempt_number
    // on the canonical events; the legacy repair_attempt payload is frozen
    // (never gains the field).
    expect(failed?.attempt_number).toBe(1);
    expect(revision?.attempt_number).toBe(2);
    expect(completed?.attempt_number).toBe(2);
    expect(
      findEvents(events, 'repair_sequence_submitted').map(
        (e) => e.attempt_number,
      ),
    ).toEqual([1, 2]);
    for (const legacy of findEvents(events, 'repair_attempt')) {
      expect(legacy.attempt_number).toBeUndefined();
    }

    // Separation invariant: a purely adaptive path never touches the
    // inappropriate-persistence variables.
    const summary = await getSummary(page);

    expect(summary.game_inappropriate_persistence).toBe(0);
    expect(summary.blind_retry_count).toBe(0);
  });

  test('blind retry logs the repeated variant, not a duplicate repair_failed', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P4',
      game_session_id: 'E2E_REP_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToRepair(page);

    await openRepairPanel(page);
    await press(page, '1'); // default sequence fails
    await press(page, 'Space');
    await press(page, '1'); // SAME failed sequence again

    const types = await getEventTypes(page);

    expect(types.filter((t) => t === 'repair_failed')).toHaveLength(1);
    expect(
      types.filter((t) => t === 'repair_same_sequence_repeated'),
    ).toHaveLength(1);

    const events = await getEvents(page);
    const repeated = findEvent(events, 'repair_same_sequence_repeated');

    expect(repeated?.study_item_ids).toEqual(['Q26']);
    expect(repeated?.construct_id).toBe('inappropriate_persistence');
    expect(repeated?.success).toBe(false);
    // The identical resubmission is still its own cycle.
    expect(repeated?.attempt_number).toBe(2);

    const summary = await getSummary(page);

    expect(summary.game_inappropriate_persistence).toBe(1);
    expect(summary.blind_retry_count).toBe(1);
  });

  test('multi-cycle adaptive: unguided revision fails as a distinct cycle, manual-guided revision succeeds', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P4',
      game_session_id: 'E2E_REP_S5',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToRepair(page);

    await openRepairPanel(page);
    await press(page, '1'); // default sequence — cycle 1 fails
    await press(page, 'Space');
    await press(page, '3'); // UNGUIDED adjusted sequence — cycle 2 fails
    await press(page, 'Space');
    await press(page, '2'); // open repair manual (guidance acquired)
    await press(page, 'Space');
    await press(page, '3'); // manual-guided revision — cycle 3 succeeds

    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);

    // Two DISTINCT failing cycles (never a detected repeat), then the
    // guided success — with the attempt counter spanning all three.
    expect(
      findEvents(events, 'repair_failed').map((e) => e.attempt_number),
    ).toEqual([1, 2]);
    expect(types).not.toContain('repair_same_sequence_repeated');
    expect(
      findEvents(events, 'repair_sequence_submitted').map(
        (e) => e.attempt_number,
      ),
    ).toEqual([1, 2, 3]);
    expect(findEvent(events, 'repair_strategy_revision')?.attempt_number).toBe(
      3,
    );
    expect(findEvent(events, 'repair_completed')?.attempt_number).toBe(3);
    expect(findEvents(events, 'repair_attempt')).toHaveLength(3);
    // Strategy revision fires ONLY on the manual-guided success: exactly
    // one revision despite two "revised sequence" submissions.
    expect(findEvents(events, 'repair_strategy_revision')).toHaveLength(1);

    // Separation invariant: distinct-cycle failures are never
    // inappropriate persistence.
    const summary = await getSummary(page);

    expect(summary.game_inappropriate_persistence).toBe(0);
    expect(summary.blind_retry_count).toBe(0);

    // Completed repairs stay completed: reopening the panel logs the
    // panel-open telemetry but never a duplicate completion cycle.
    await press(page, 'Space');
    await press(page, '3');

    const finalEvents = await getEvents(page);

    expect(findEvents(finalEvents, 'repair_completed')).toHaveLength(1);
    expect(findEvents(finalEvents, 'repair_sequence_submitted')).toHaveLength(
      3,
    );
  });

  test('multi-cycle identical repeats: each resubmitted failed sequence logs the repeated variant with its cycle number', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P4',
      game_session_id: 'E2E_REP_S6',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToRepair(page);

    await openRepairPanel(page);
    await press(page, '3'); // unguided adjustment — cycle 1 fails
    await press(page, 'Space');
    await press(page, '3'); // SAME unguided adjustment — detected repeat
    await press(page, 'Space');
    await press(page, '1'); // default — different sequence, real failure
    await press(page, 'Space');
    await press(page, '1'); // SAME default again — detected repeat

    const events = await getEvents(page);

    expect(
      findEvents(events, 'repair_failed').map((e) => e.attempt_number),
    ).toEqual([1, 3]);
    expect(
      findEvents(events, 'repair_same_sequence_repeated').map(
        (e) => e.attempt_number,
      ),
    ).toEqual([2, 4]);
    expect(
      findEvents(events, 'repair_sequence_submitted').map(
        (e) => e.attempt_number,
      ),
    ).toEqual([1, 2, 3, 4]);
    expect(findEvents(events, 'repair_attempt')).toHaveLength(4);

    const summary = await getSummary(page);

    expect(summary.blind_retry_count).toBe(2);
    expect(summary.game_inappropriate_persistence).toBe(2);
  });

  test('manual station logs opened + page reviewed; leave-and-return logs abandoned + returned', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P4',
      game_session_id: 'E2E_REP_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToRepair(page);

    await openRepairPanel(page);
    await press(page, '1'); // fail once so abandon/return arms

    // Walk to the manual station (left block, x 96 / y 208). One left
    // clamp is enough: with the 32x42 player body the leg stops against
    // either the machinery block's east face (x ~144) or the west wall
    // (x ~48) depending on exact row alignment — the manual is inside the
    // 72 px radius (~55 px) from BOTH clamp positions.
    await hold(page, 'ArrowLeft', 2400);
    await press(page, 'Space');

    // Leave unresolved via the Hub door (bottom-center). The clamp x is
    // ambiguous (48 vs 144, above), so normalize with a double clamp —
    // bottom wall, then west wall along the open bottom corridor — before
    // the timed east leg to the door at x 320.
    await hold(page, 'ArrowDown', 2200);
    await hold(page, 'ArrowLeft', 2400);
    await hold(page, 'ArrowRight', 1550);
    await press(page, 'Space');
    await waitForNthEvent(page, 'station_hub_entered', 2);

    // Return; wait on the returned-after-failure event itself (the
    // first-entry event makes waitForRoomEntry return instantly here).
    await hubToStationDoor(page, 'systems_repair_room');
    await waitForNthEvent(page, 'repair_room_entered', 2);
    await waitForRoomEntry(page, 'repair_returned_after_failure');

    const types = await getEventTypes(page);

    expect(types).toContain('repair_manual_opened');
    expect(types).toContain('manual_page_reviewed');
    expect(types).toContain('repair_abandoned');
    expect(types).toContain('repair_returned_after_failure');

    const events = await getEvents(page);
    const opened = findEvent(events, 'repair_manual_opened');
    const reviewed = findEvent(events, 'manual_page_reviewed');
    const abandoned = findEvent(events, 'repair_abandoned');
    const returned = findEvent(events, 'repair_returned_after_failure');

    expect(opened?.room_id).toBe('systems_repair_room');
    expect(reviewed?.study_item_ids).toEqual(['Q22']);
    expect(reviewed?.construct_id).toBe('adaptive_persistence');
    // Q24/Q25 mapping with construct_id deliberately unset (open
    // psychometric decision — F1 precedent).
    expect(abandoned?.study_item_ids).toEqual(['Q24']);
    expect(abandoned?.construct_id).toBeUndefined();
    expect(returned?.study_item_ids).toEqual(['Q24', 'Q25']);
    expect(returned?.construct_id).toBeUndefined();

    // FABLE-NEXT-03 persistence: the cycle counter AND the manual-guidance
    // flag (set at the manual station before leaving) survive the round
    // trip — the guided revision now completes as cycle 2, not cycle 1.
    await openRepairPanel(page);
    await press(page, '3');

    const finalEvents = await getEvents(page);
    const completedAfterReturn = findEvent(finalEvents, 'repair_completed');

    expect(completedAfterReturn?.attempt_number).toBe(2);
    expect(
      findEvent(finalEvents, 'repair_strategy_revision')?.attempt_number,
    ).toBe(2);
    expect(
      finalEvents.filter((e) => e.event_type === 'repair_failed'),
    ).toHaveLength(1);
  });

  test('NEXT-08 tactile panel: schematic mirrors the side panel only, mouse path event-identical', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    /**
     * §6.2 honesty checks + Route A discipline: the schematic strip's
     * readout re-renders ONLY the status side panel's text (verbatim),
     * never manual/guidance state or which sequence is loaded; the
     * adaptive flow driven mouse-only emits the identical event stream
     * to the keyboard-only run.
     */
    const readStatusPanel = () =>
      page.evaluate(
        () =>
          (window as unknown as { __roomStatusText?: string | null })
            .__roomStatusText ?? null,
      );

    const runFlow = async (sessionId: string, useMouse: boolean) => {
      const select = async (index: number) => {
        if (useMouse) {
          await clickPromptCard(page, index);
        } else {
          await press(page, `${index + 1}`);
        }
      };

      await bootGame(page, {
        participant_id: 'E2E_P4',
        game_session_id: sessionId,
        condition: 'pilot',
        game_version: 'e2e',
      });
      await dockToHub(page);
      await hubToRepair(page);
      await openRepairPanel(page);

      if (useMouse) {
        const surface = await getMinigameSurface(page);
        const schematic = surface?.find((e) => e.kind === 'schematic');

        expect(schematic).toBeDefined();
        // Inert dressing: never an activator.
        expect(schematic!.activates).toBeNull();
        // Verbatim side-panel strings only.
        expect(schematic!.label).toBe(
          '[ ] awaiting first sequence\nCycles logged: 0',
        );
      }

      await select(0); // default sequence — deterministic failure (cycle 1)
      await press(page, 'Space');

      if (useMouse) {
        const surface = await getMinigameSurface(page);
        const schematic = surface?.find((e) => e.kind === 'schematic');

        expect(schematic!.label).toBe(
          '[ ] sequence rejected\nCycles logged: 1',
        );

        // Every readout line is text the side panel already shows —
        // and none of it leaks manual/guidance or loaded-sequence state.
        const status = await readStatusPanel();

        for (const line of schematic!.label.split('\n')) {
          expect(status).toContain(line);
        }

        expect(schematic!.label.toLowerCase()).not.toContain('manual');
        expect(schematic!.label.toLowerCase()).not.toContain('guid');
        expect(schematic!.label.toLowerCase()).not.toContain('default');
        expect(schematic!.label.toLowerCase()).not.toContain('revised');
      }

      await select(1); // open repair manual (guidance acquired)
      await press(page, 'Space');
      await select(2); // manual-guided revision — success

      const events = await getEvents(page);

      return events.map((e) => ({
        event_type: e.event_type,
        object_id: e.object_id ?? null,
        attempt_number: e.attempt_number ?? null,
      }));
    };

    const keyboardStream = await runFlow('E2E_REP_S7K', false);
    const mouseStream = await runFlow('E2E_REP_S7M', true);

    expect(mouseStream).toEqual(keyboardStream);

    const streamTypes = keyboardStream.map((e) => e.event_type);

    expect(streamTypes).toContain('repair_failed');
    expect(streamTypes).toContain('repair_manual_used');
    expect(streamTypes).toContain('repair_strategy_revision');
    expect(streamTypes).toContain('repair_completed');
  });

  test('objective_completed fires exactly once when Archive AND Repair complete', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P4',
      game_session_id: 'E2E_REP_S4',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);

    // Complete the Archive first (revised query — direct success path).
    await hubToArchive(page);
    await openArchiveTerminal(page);
    await press(page, '3');

    let types = await getEventTypes(page);

    expect(types).toContain('archive_completed');
    // Only one of the two rooms is complete: parity event must NOT fire.
    expect(types).not.toContain('objective_completed');

    // Back to the Hub (bottom-center door), then complete the Repair.
    await hold(page, 'ArrowDown', 2200);
    await press(page, 'Space');
    await waitForNthEvent(page, 'station_hub_entered', 2);
    await hubToRepair(page);
    await openRepairPanel(page);
    await press(page, '2'); // manual first — the revision must be guided
    await press(page, 'Space');
    await press(page, '3');

    const events = await getEvents(page);

    types = events.map((e) => e.event_type);
    expect(types).toContain('repair_completed');
    expect(findEvents(events, 'objective_completed')).toHaveLength(1);

    // Prototype-parity payload: always the archive terminal's interaction
    // context, regardless of completion order (Main.tsx precedent).
    const objective = findEvent(events, 'objective_completed');

    expect(objective?.room_id).toBe('archive_room');
  });
});
