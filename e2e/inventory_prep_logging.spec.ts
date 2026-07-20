import { expect, test } from '@playwright/test';

import {
  bootGame,
  clickPromptCard,
  clickSurfaceEntry,
  dockToHub,
  findEvent,
  findEvents,
  getEvents,
  getEventTypes,
  getLastPromptBody,
  getMinigameSurface,
  getPromptCards,
  getSummary,
  hold,
  hubToStationDoor,
  inventoryToConsole,
  inventoryToKitCrate,
  inventoryToPrepBench,
  inventoryToStorageBin,
  press,
  waitForRoomEntry,
} from './helpers';

/**
 * V3 §9 spec: inventory_prep_logging.spec.ts — shortcut, systematic
 * (+ verification/cleanup sub-steps), and sort-and-verify paths, with
 * SessionState propagation for the Final Core flags, plus the
 * FABLE-NEXT-02 per-item preparation paths (systematic, misplacement +
 * correction, rushed, gating).
 *
 * Runtime status: executed green (8/8) in the FABLE-NEXT-02 worktree on
 * PW_DEV_PORT=5297 (2026-07-18) — the Wave 1A "authored compile-only"
 * caveat no longer applies. Secondary-surface coverage gaps (prompt/
 * feedback text, put-back/keep-hold/step-back options, incomplete-kit
 * verification, mid-flow exit + re-entry persistence) are listed in the
 * room doc for a follow-up playwright-game-verify pass.
 */

async function hubToInventory(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'inventory_prep_room');
  await waitForRoomEntry(page, 'inventory_room_entered');
}

/** Inventory spawn -> quartermaster console: up clamps under the alcove. */
async function openConsole(page: import('@playwright/test').Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

async function getMissionState(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        researchRuntime: {
          getMissionState: () => {
            prepared_items: string[];
            workspace_status: string;
          };
        };
      }
    ).researchRuntime.getMissionState(),
  );
}

test.describe('inventory prep logging', () => {
  test('shortcut path: incomplete kit, disorder, verification skipped', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    await openConsole(page);
    await press(page, '1'); // grab tools quickly

    const types = await getEventTypes(page);

    for (const expected of [
      'inventory_room_entered',
      'inventory_prep_opened',
      'inventory_prep_shortcut',
      'inventory_required_item_missed',
      'missing_item',
      'inventory_disorganized_action',
      'workspace_left_disordered',
      'inventory_verification_skipped',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    // Q01 checklist signal must NOT fire on the shortcut path (emission
    // placement rule: checklist_opened belongs to the checklist option).
    expect(types).not.toContain('inventory_checklist_opened');
    expect(types).not.toContain('inventory_checklist_used');

    const events = await getEvents(page);
    const disordered = findEvent(events, 'workspace_left_disordered');
    const skipped = findEvent(events, 'inventory_verification_skipped');

    expect(disordered?.room_id).toBe('inventory_prep_room');
    expect(disordered?.study_item_ids).toEqual(['Q04']);
    expect(disordered?.construct_id).toBe('organisation');
    // Dual-listed Q02+Q30: construct deliberately unset.
    expect(skipped?.study_item_ids).toEqual(['Q02', 'Q30']);
    expect(skipped?.construct_id).toBeUndefined();

    const mission = await getMissionState(page);

    expect(mission.prepared_items).not.toContain('field_kit');
    expect(mission.workspace_status).toBe('disordered');
  });

  test('systematic path: checklist -> verify -> tidy, kit propagated', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    await openConsole(page);
    await press(page, '2'); // checklist + ordered packing
    await press(page, '1'); // verification stage: run the check
    await press(page, '1'); // cleanup stage: sort the workspace

    const types = await getEventTypes(page);

    for (const expected of [
      'inventory_checklist_used',
      'inventory_checklist_opened',
      'inventory_required_tools_packed',
      'correct_tool_selected',
      'inventory_systematic_prep',
      'inventory_sequence_followed',
      'inventory_verified_complete',
      'workspace_tidy_confirmed',
      'cleanup_completed',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(types).not.toContain('inventory_verification_skipped');
    expect(types).not.toContain('workspace_left_disordered');

    const events = await getEvents(page);
    const checklist = findEvent(events, 'inventory_checklist_opened');
    const verified = findEvent(events, 'inventory_verified_complete');
    const cleanup = findEvent(events, 'cleanup_completed');

    expect(checklist?.study_item_ids).toEqual(['Q01']);
    expect(checklist?.construct_id).toBe('organisation');
    // Q30 — optional/exploratory Goal-Time proxy.
    expect(verified?.study_item_ids).toEqual(['Q30']);
    expect(verified?.construct_id).toBe('goal_time_exploratory');
    expect(cleanup?.study_item_ids).toEqual(['Q04']);
    expect(cleanup?.construct_id).toBe('organisation');

    const mission = await getMissionState(page);

    expect(mission.prepared_items).toContain('field_kit');
    expect(mission.workspace_status).toBe('tidy');

    // One-shot: console re-open must not allow a second submission.
    await openConsole(page);
    await press(page, '1');

    const typesAfter = await getEventTypes(page);

    expect(
      typesAfter.filter((t) => t === 'inventory_prep_shortcut'),
    ).toHaveLength(0);
  });

  test('systematic path with skipped verification and disordered exit', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    await openConsole(page);
    await press(page, '2'); // checklist + ordered packing
    await press(page, '2'); // verification stage: skip the check
    await press(page, '2'); // cleanup stage: leave the bench

    const types = await getEventTypes(page);

    expect(types).toContain('inventory_verification_skipped');
    expect(types).toContain('workspace_left_disordered');
    expect(types).not.toContain('inventory_verified_complete');
    expect(types).not.toContain('workspace_tidy_confirmed');

    const mission = await getMissionState(page);

    // Kit packed (checklist path) but process signals independent of
    // outcome: skipped verification + disorder both recorded.
    expect(mission.prepared_items).toContain('field_kit');
    expect(mission.workspace_status).toBe('disordered');
  });

  test('sort-and-verify path: canonical inventory events beside their legacy aliases', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S4',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    await openConsole(page);
    await press(page, '3'); // sort the workspace and verify the kit

    const types = await getEventTypes(page);

    for (const expected of [
      'inventory_workspace_sorted',
      'workspace_tidy_confirmed',
      'inventory_kit_verified',
      'inventory_verified_complete',
      'inventory_cleanup_completed',
      'cleanup_completed',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(types).not.toContain('inventory_prep_shortcut');
    expect(types).not.toContain('inventory_checklist_used');
    expect(types).not.toContain('inventory_checklist_opened');
    expect(types).not.toContain('workspace_left_disordered');
    expect(types).not.toContain('inventory_verification_skipped');

    const events = await getEvents(page);

    // The three canonical option-3 names stay unregistered raw telemetry:
    // no research mapping fields (frozen data — the D2 naming-split
    // question is open, tests document reality, never anticipate rulings).
    for (const name of [
      'inventory_workspace_sorted',
      'inventory_kit_verified',
      'inventory_cleanup_completed',
    ]) {
      const matched = findEvents(events, name);

      expect(matched, `${name} fires exactly once`).toHaveLength(1);
      expect(matched[0].room_id).toBe('inventory_prep_room');
      expect(matched[0].study_item_ids).toBeUndefined();
      expect(matched[0].construct_id).toBeUndefined();
      expect(matched[0].success).toBeUndefined();
    }

    // Registered legacy aliases keep their frozen registrations.
    const tidy = findEvent(events, 'workspace_tidy_confirmed');

    expect(tidy?.study_item_ids).toEqual(['Q03']);
    expect(tidy?.construct_id).toBe('organisation');

    // Scoring separation: option-3 names feed exactly the organisation
    // aggregates (kit-verified flag, cleanup count = sorted + cleanup).
    const summary = await getSummary(page);

    expect(summary.organization_kit_verified).toBe(true);
    expect(summary.organization_cleanup_count).toBe(2);
    expect(summary.organization_prep_count).toBe(1);
    expect(summary.organization_checklist_used).toBe(false);
    expect(summary.organization_shortcut_count).toBe(0);

    const mission = await getMissionState(page);

    expect(mission.prepared_items).toContain('field_kit');
    expect(mission.workspace_status).toBe('tidy');
  });

  // ——————————————————————————————————————————————————————————————————
  // FABLE-NEXT-02 per-item preparation mode (console option 4). The
  // legacy tests above are extended, never weakened: options 1-3 keep
  // their verbatim behaviour, and these tests drive the additive per-item
  // sort/place → correction → verify → cleanup flow.
  // ——————————————————————————————————————————————————————————————————

  /** Engage per-item mode: console option 4, from the entry spawn. */
  async function engagePerItemMode(page: import('@playwright/test').Page) {
    await inventoryToConsole(page);
    await press(page, '4');
  }

  /** Take the Nth bench option, walk to the kit crate, pack (option 1). */
  async function takeAndPack(
    page: import('@playwright/test').Page,
    benchOption: string,
  ) {
    await inventoryToPrepBench(page);
    await press(page, benchOption);
    await inventoryToKitCrate(page);
    await press(page, '1');
  }

  /** Take the Nth bench option, walk to a bin, stow (option 1). */
  async function takeAndStow(
    page: import('@playwright/test').Page,
    benchOption: string,
    bin: 'hand_tools' | 'consumables' | 'electronics',
  ) {
    await inventoryToPrepBench(page);
    await press(page, benchOption);
    await inventoryToStorageBin(page, bin);
    await press(page, '1');
  }

  test('per-item systematic path: checklist, ordered placement, review, verify, reset', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S5',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    await engagePerItemMode(page);

    // Engagement emits NO event (checklist credit belongs to checklist
    // actions only; no approved name exists for mode engagement).
    let types = await getEventTypes(page);

    expect(types).not.toContain('inventory_checklist_opened');
    expect(types).not.toContain('inventory_checklist_used');

    // Checklist action at the console (player is still at the console).
    await press(page, 'Space');
    await press(page, '1'); // check the requisition list
    await press(page, '1'); // close the list

    // Kit items in checklist order (bench lists items in registry order,
    // so the first remaining item is always option 1), then stray gear.
    await takeAndPack(page, '1'); // torque_driver
    await takeAndPack(page, '1'); // diagnostic_probe
    await takeAndPack(page, '1'); // coolant_cartridge
    await takeAndPack(page, '1'); // fuse_pack
    await takeAndPack(page, '1'); // patch_tape
    await takeAndStow(page, '1', 'hand_tools'); // hex_spanner
    await takeAndStow(page, '1', 'consumables'); // sealant_canister
    await takeAndStow(page, '1', 'electronics'); // relay_board

    // Close out: review (clean) -> readiness check -> reset the bench.
    await inventoryToConsole(page);
    await press(page, '2'); // close out the prep
    await press(page, '1'); // review clean: proceed to the readiness check
    await press(page, '1'); // run the readiness verification
    await press(page, '1'); // reset the bench

    types = await getEventTypes(page);

    for (const expected of [
      'inventory_checklist_opened',
      'inventory_item_sorted_correct',
      'correct_tool_selected',
      'inventory_sequence_followed',
      'inventory_sequence_completed',
      'inventory_verified_complete',
      'workspace_tidy_confirmed',
      'cleanup_completed',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }

    // No error/skip/legacy-alias events on the clean per-item path.
    for (const absent of [
      'inventory_item_misplaced',
      'wrong_tool_selected',
      'missing_item',
      'inventory_verification_skipped',
      'workspace_left_disordered',
      'inventory_prep_shortcut',
      'inventory_checklist_used',
      'inventory_systematic_prep',
      'inventory_required_tools_packed',
      'inventory_workspace_sorted',
      'inventory_kit_verified',
      'inventory_cleanup_completed',
    ]) {
      expect(types, `${absent} must NOT be logged`).not.toContain(absent);
    }

    // Event order: checklist before the first placement; the sort pass
    // completes before verification; cleanup is last.
    expect(types.indexOf('inventory_checklist_opened')).toBeLessThan(
      types.indexOf('correct_tool_selected'),
    );
    expect(types.indexOf('inventory_sequence_completed')).toBeLessThan(
      types.indexOf('inventory_verified_complete'),
    );
    expect(types.indexOf('inventory_verified_complete')).toBeLessThan(
      types.indexOf('cleanup_completed'),
    );

    const events = await getEvents(page);
    const kitPlacements = findEvents(events, 'correct_tool_selected');
    const binPlacements = findEvents(events, 'inventory_item_sorted_correct');

    // Per-item payloads: object_id = registry item_id, attempt_number = 1,
    // pinned canonical contexts untouched.
    expect(kitPlacements).toHaveLength(5);
    expect(kitPlacements.map((e) => e.object_id)).toEqual([
      'torque_driver',
      'diagnostic_probe',
      'coolant_cartridge',
      'fuse_pack',
      'patch_tape',
    ]);

    for (const placement of kitPlacements) {
      expect(placement.attempt_number).toBe(1);
      expect(placement.study_item_ids).toEqual(['Q03']);
      expect(placement.construct_id).toBe('organisation');
      expect(placement.room_id).toBe('inventory_prep_room');
    }

    expect(binPlacements).toHaveLength(3);
    expect(binPlacements.map((e) => e.object_id)).toEqual([
      'hex_spanner',
      'sealant_canister',
      'relay_board',
    ]);

    for (const placement of binPlacements) {
      expect(placement.attempt_number).toBe(1);
      expect(placement.study_item_ids).toEqual(['Q01']);
      expect(placement.construct_id).toBe('organisation');
    }

    // Task-level milestones carry the console's task context and the Q01
    // registration (sequence_completed stays unmapped raw telemetry).
    const followed = findEvent(events, 'inventory_sequence_followed');
    const completed = findEvent(events, 'inventory_sequence_completed');

    expect(followed?.object_id).toBe('inventory_prep_checklist');
    expect(followed?.study_item_ids).toEqual(['Q01']);
    expect(followed?.construct_id).toBe('organisation');
    expect(completed?.object_id).toBe('inventory_prep_checklist');
    expect(completed?.study_item_ids).toBeUndefined();
    expect(completed?.construct_id).toBeUndefined();

    // Outcome state: the kit's actual contents (registry order) + the
    // legacy-compatible field_kit completeness marker.
    const mission = await getMissionState(page);

    expect(mission.prepared_items).toEqual([
      'torque_driver',
      'diagnostic_probe',
      'coolant_cartridge',
      'fuse_pack',
      'patch_tape',
      'field_kit',
    ]);
    expect(mission.workspace_status).toBe('tidy');

    // Scoring boundary: ScoringManager aggregates only legacy names, so
    // the per-item path changes NO organization_* summary field.
    const summary = await getSummary(page);

    expect(summary.organization_checklist_used).toBe(false);
    expect(summary.organization_kit_verified).toBe(false);
    expect(summary.organization_prep_count).toBe(0);
    expect(summary.organization_cleanup_count).toBe(0);
    expect(summary.organization_shortcut_count).toBe(0);

    // One-shot: the console is closed out after completion.
    const eventCountBefore = (await getEvents(page)).length;

    await press(page, 'Space');
    await press(page, '1');

    const eventsAfter = await getEvents(page);

    expect(eventsAfter.length).toBe(eventCountBefore);
  });

  test('per-item misplacement path: unmissable review, correction, higher attempt numbers', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S6',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    await engagePerItemMode(page);

    // Two deliberate errors: the Torque Driver (kit requisition) goes into
    // the Hand Tools Rack; the Hex Spanner (rack-tagged) goes into the kit.
    await takeAndStow(page, '1', 'hand_tools'); // torque_driver -> misplaced
    await takeAndPack(page, '5'); // hex_spanner -> wrong tool
    // Remaining items to their correct destinations.
    await takeAndPack(page, '1'); // diagnostic_probe
    await takeAndPack(page, '1'); // coolant_cartridge
    await takeAndPack(page, '1'); // fuse_pack
    await takeAndPack(page, '1'); // patch_tape
    await takeAndStow(page, '1', 'consumables'); // sealant_canister
    await takeAndStow(page, '1', 'electronics'); // relay_board

    // Close out: the review flags the staging issues once; go back.
    await inventoryToConsole(page);
    await press(page, '2'); // close out -> review (missing_item logged)
    await press(page, '1'); // go back and adjust the staging

    // Correction: retrieve the Torque Driver from the wrong rack and pack
    // it; retrieve the Hex Spanner from the kit and stow it correctly.
    await inventoryToStorageBin(page, 'hand_tools');
    await press(page, '1'); // take the Torque Driver back out
    await inventoryToKitCrate(page);
    await press(page, '1'); // pack it (attempt 2)
    await inventoryToKitCrate(page);
    await press(page, '6'); // take the Hex Spanner back out (6th kit item)
    await inventoryToStorageBin(page, 'hand_tools');
    await press(page, '1'); // stow it (attempt 2)

    // Close out again: clean review -> verify -> reset.
    await inventoryToConsole(page);
    await press(page, '2');
    await press(page, '1'); // clean review: proceed
    await press(page, '1'); // run the readiness verification
    await press(page, '1'); // reset the bench

    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);

    // The two first-pass errors, with attempt_number 1.
    const misplaced = findEvent(events, 'inventory_item_misplaced');
    const wrongTool = findEvent(events, 'wrong_tool_selected');

    expect(misplaced?.object_id).toBe('torque_driver');
    expect(misplaced?.attempt_number).toBe(1);
    expect(misplaced?.study_item_ids).toEqual(['Q02']);
    expect(misplaced?.construct_id).toBe('organisation');
    expect(wrongTool?.object_id).toBe('hex_spanner');
    expect(wrongTool?.attempt_number).toBe(1);
    expect(wrongTool?.study_item_ids).toEqual(['Q03']);

    // The review flagged the preventable omission exactly once, with the
    // item as object_id, unmapped (no canonical registration).
    const missing = findEvents(events, 'missing_item');

    expect(missing).toHaveLength(1);
    expect(missing[0].object_id).toBe('torque_driver');
    expect(missing[0].study_item_ids).toBeUndefined();

    // Corrected re-placements carry attempt_number 2 (correction telemetry
    // is derivable; inventory_item_corrected stays a CANDIDATE).
    const torquePacked = findEvents(events, 'correct_tool_selected').find(
      (e) => e.object_id === 'torque_driver',
    );
    const hexStowed = findEvents(events, 'inventory_item_sorted_correct').find(
      (e) => e.object_id === 'hex_spanner',
    );

    expect(torquePacked?.attempt_number).toBe(2);
    expect(hexStowed?.attempt_number).toBe(2);

    // Sequence: error -> review flag -> corrected re-placement.
    const torquePackedIndex = events.findIndex(
      (e) =>
        e.event_type === 'correct_tool_selected' &&
        e.object_id === 'torque_driver',
    );

    expect(types.indexOf('inventory_item_misplaced')).toBeLessThan(
      types.indexOf('missing_item'),
    );
    expect(types.indexOf('missing_item')).toBeLessThan(torquePackedIndex);

    // Order compliance was judged at first kit completion (which happened
    // out of checklist order), so inventory_sequence_followed must NOT
    // fire; the sort pass itself did complete.
    expect(types).not.toContain('inventory_sequence_followed');
    expect(types).toContain('inventory_sequence_completed');
    expect(types).toContain('inventory_verified_complete');

    // Outcome: every requisition item packed after correction.
    const mission = await getMissionState(page);

    expect(mission.prepared_items).toContain('field_kit');
    expect(mission.prepared_items).toContain('torque_driver');
    expect(mission.prepared_items).not.toContain('hex_spanner');
    expect(mission.workspace_status).toBe('tidy');
  });

  test('per-item rushed path: skip items, skip verification, disorder chosen at the cleanup stage', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S7',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    await engagePerItemMode(page);

    // Pack only two requisition items, then close out immediately.
    await takeAndPack(page, '1'); // torque_driver
    await takeAndPack(page, '1'); // diagnostic_probe

    await inventoryToConsole(page);
    await press(page, '2'); // close out -> review flags the omissions
    await press(page, '2'); // proceed to the readiness check anyway
    await press(page, '2'); // skip the check and close out now
    await press(page, '2'); // head out and leave the bench as it is

    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);

    // The rushed path still passed through review, verification choice and
    // the cleanup stage: disorder is CHOSEN (exactly one disorder event —
    // never the legacy shortcut's asserted cascade).
    expect(types).toContain('inventory_verification_skipped');
    expect(types).toContain('workspace_left_disordered');
    expect(findEvents(events, 'workspace_left_disordered')).toHaveLength(1);
    expect(types).not.toContain('inventory_verified_complete');
    expect(types).not.toContain('workspace_tidy_confirmed');
    expect(types).not.toContain('cleanup_completed');
    expect(types).not.toContain('inventory_prep_shortcut');
    expect(types).not.toContain('inventory_sequence_completed');
    expect(types).not.toContain('inventory_sequence_followed');
    expect(types).not.toContain('inventory_checklist_opened');

    // Preventable omissions logged once each at the review, item-scoped.
    const missing = findEvents(events, 'missing_item');

    expect(missing.map((e) => e.object_id)).toEqual([
      'coolant_cartridge',
      'fuse_pack',
      'patch_tape',
    ]);

    // Outcome: partial kit contents recorded, field_kit absent (Final Core
    // missing-item flag source), workspace disordered.
    const mission = await getMissionState(page);

    expect(mission.prepared_items).toEqual([
      'torque_driver',
      'diagnostic_probe',
    ]);
    expect(mission.prepared_items).not.toContain('field_kit');
    expect(mission.workspace_status).toBe('disordered');
  });

  test('NEXT-08 task surfaces: mouse-only and keyboard-only runs emit identical event streams', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    /**
     * Route A discipline (NEXT-08 §10): the same per-item flow twice in
     * fresh sessions — once keyboard-only (hidden numerics), once
     * mouse-only for every SELECTION (cards, the destination silhouette,
     * the carried-item row). Event types, order, object_ids and
     * attempt_numbers must be identical; SPACE only opens prompts (the
     * proximity interact has no pointer equivalent by design).
     */
    const CHECKLIST_BODY =
      'Kit requisition — pack into the kit crate, in this order:\n' +
      '1. Torque Driver\n2. Diagnostic Probe\n3. Coolant Cartridge\n' +
      '4. Spare Fuse Pack\n5. Patch Tape\n\n' +
      'Stray gear on the bench carries a rack tag naming its storage rack.';

    const runFlow = async (sessionId: string, useMouse: boolean) => {
      const select = async (index: number) => {
        if (useMouse) {
          await clickPromptCard(page, index);
        } else {
          await press(page, `${index + 1}`);
        }
      };

      await bootGame(page, {
        participant_id: 'E2E_P6',
        game_session_id: sessionId,
        condition: 'pilot',
        game_version: 'e2e',
      });
      await dockToHub(page);
      await hubToInventory(page);

      // Engage per-item mode, then the checklist action (byte-identical
      // panel text on the icon-enriched checklist stage, §3.5).
      await inventoryToConsole(page);
      await select(3); // stage the kit yourself
      await press(page, 'Space');
      await select(0); // check the kit requisition list
      expect(await getLastPromptBody(page)).toContain(CHECKLIST_BODY);
      await select(0); // close the list

      // Torque driver -> kit crate. Mouse path packs by clicking the
      // destination silhouette (station activator).
      await inventoryToPrepBench(page);
      await select(0); // take the torque driver
      await inventoryToKitCrate(page);

      if (useMouse) {
        const surface = await getMinigameSurface(page);
        const station = surface?.find((e) => e.kind === 'station');

        expect(station?.label).toBe('Field Kit Crate');
        expect(station?.activates).toBe(0);
        await clickSurfaceEntry(page, 'Field Kit Crate');
      } else {
        await press(page, '1');
      }

      // Hex spanner -> hand tools rack. Mouse path stows by clicking the
      // carried-item row (tray activator).
      await inventoryToPrepBench(page);

      if (useMouse) {
        // Icon-enriched cards; enriched panel fully on-canvas (§7.4).
        const cards = await getPromptCards(page);
        const last = cards![cards!.length - 1];

        expect(last.y + last.height).toBeLessThanOrEqual(600);
      }

      await select(4); // take the hex spanner (5th remaining bench item)
      await inventoryToStorageBin(page, 'hand_tools');

      if (useMouse) {
        const surface = await getMinigameSurface(page);
        const carriedRow = surface?.find((e) => e.kind === 'tray');

        expect(carriedRow?.label).toBe('Hex Spanner');
        expect(carriedRow?.activates).toBe(0);
        await clickSurfaceEntry(page, 'Hex Spanner');
        // Probe cleared once the selection closed the prompt (§3.5).
        expect(await getMinigameSurface(page)).toBeNull();
      } else {
        await press(page, '1');
      }

      // Close out: review (issues listed), proceed, skip, leave.
      await inventoryToConsole(page);
      await select(1); // close out the prep
      await select(1); // proceed to the readiness check anyway
      await select(1); // skip the check and close out now
      await select(1); // head out and leave the bench as it is

      const events = await getEvents(page);

      return events.map((e) => ({
        event_type: e.event_type,
        object_id: e.object_id ?? null,
        attempt_number: e.attempt_number ?? null,
      }));
    };

    const keyboardStream = await runFlow('E2E_INV_S9K', false);
    const mouseStream = await runFlow('E2E_INV_S9M', true);

    // Route A: identical event types, order, object_ids, attempt_numbers.
    expect(mouseStream).toEqual(keyboardStream);

    // Sanity: the flow actually exercised the placement family.
    const streamTypes = keyboardStream.map((e) => e.event_type);

    expect(streamTypes).toContain('correct_tool_selected');
    expect(streamTypes).toContain('inventory_item_sorted_correct');
    expect(streamTypes).toContain('inventory_checklist_opened');
    expect(streamTypes).toContain('inventory_verification_skipped');
    expect(streamTypes).toContain('workspace_left_disordered');
  });

  test('per-item stations stay gated before engagement and after completion', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S8',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    // Before engagement: the bench is inert — no prompt, no events.
    const countBefore = (await getEvents(page)).length;

    await inventoryToPrepBench(page);
    await press(page, '1');

    expect((await getEvents(page)).length).toBe(countBefore);

    // Complete prep via the legacy sort-and-verify option (path parity:
    // options 1-3 keep their verbatim behaviour beside the new mode).
    await inventoryToConsole(page);
    await press(page, '3');

    const types = await getEventTypes(page);

    expect(types).toContain('inventory_workspace_sorted');
    expect(types).toContain('workspace_tidy_confirmed');

    // After completion: per-item stations are closed out — still no
    // placement events possible.
    const countAfter = (await getEvents(page)).length;

    await inventoryToKitCrate(page);
    await press(page, '1');

    expect((await getEvents(page)).length).toBe(countAfter);

    const mission = await getMissionState(page);

    expect(mission.prepared_items).toEqual(['field_kit']);
    expect(mission.workspace_status).toBe('tidy');
  });
});
