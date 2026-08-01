import { expect, test } from '@playwright/test';

import {
  Q04_MESS_OBJECTS,
  Q04_RETURN_POINTS,
} from '../src/measurement/q04FieldCleanup';
import {
  clickPhysicalContainer,
  clickPhysicalObject,
  clickPromptCard,
  dragPhysicalObjectToContainer,
  driveAxisTo,
  findEvent,
  findEvents,
  getEvents,
  getLastFeedbackText,
  getPromptCards,
  physicalProbe,
  press,
  selectPromptOption,
} from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  dockToHubJourney,
  eventCount,
  expectNoRuntimeErrors,
  hubToStationJourney,
  stationToHubJourney,
  waitForEventCount,
} from './journey';

/**
 * Physical-mechanics session (Unit 2): the Q01-Q04 organisation suite as
 * direct manipulation.
 *
 * Verifies:
 * - Q01 kit sorting is physically playable (click pickup, drag, carry,
 *   container placement) and the physical path emits EXACTLY the same
 *   canonical per-item placement events as the card path (redundant-
 *   activator convergence), one event per placement act with object_id +
 *   attempt_number.
 * - The card flow remains fully available (keyboard-accessible
 *   equivalent) and interleaves freely with the physical flow.
 * - Q02's correction opportunity stays the unmissable close-out review
 *   (now marked by proto_q02_review_entered raw telemetry) and physical
 *   re-placement after review carries a higher attempt_number.
 * - Q03's SA-12 cabinet works physically (tray→drawer stow by drag AND
 *   click; retrieval by opening drawer cells directly), converging on the
 *   same proto_q03_* events, with wrong-bin openings distinguishable.
 * - Q04's standardised field cleanup: identical mess presented at install
 *   completion, physical partial cleanup, category-mismatch refusal,
 *   exit-state snapshot, persistence across room re-entry, and complete
 *   separation of its proto_q04_* family from the Q01-Q03 streams.
 */

type Pg = import('@playwright/test').Page;

async function bootToDock(page: Pg, tag: string) {
  await page.goto(`/?participant_id=PT_${tag}&game_session_id=GS_${tag}`);
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'dock',
  );
  await completeDockTutorial(page, 1);
  await dockToHubJourney(page);
}

/** Prep-room: normalise to the corridor then stand at the bench face. */
async function standAtBench(page: Pg) {
  await driveAxisTo(page, 'x', 224, 12);
  await driveAxisTo(page, 'y', 292, 12);
  await driveAxisTo(page, 'x', 500, 12);
  await driveAxisTo(page, 'y', 276, 8);
}

/** Prep-room: bench face → kit crate (no SPACE — physical target). */
async function standAtKitCrate(page: Pg) {
  await driveAxisTo(page, 'x', 224, 12);
  await driveAxisTo(page, 'y', 336, 10);
  await driveAxisTo(page, 'x', 192, 10);
}

/** Prep-room: → a top-corridor bin column (no SPACE). */
async function standAtBin(page: Pg, x: number) {
  await driveAxisTo(page, 'x', 224, 12);
  await driveAxisTo(page, 'y', 56, 8);
  await driveAxisTo(page, 'x', x, 10);
}

/** Bench → pick object → walk to a container → place (physical loop). */
async function carryBenchItemTo(
  page: Pg,
  objectId: string,
  containerId: string,
) {
  await standAtBench(page);
  await clickPhysicalObject(page, objectId);
  expect((await physicalProbe(page))?.carried).toBe(objectId);

  if (containerId === 'kit_crate') {
    await standAtKitCrate(page);
  } else {
    await standAtBin(
      page,
      containerId === 'bin_hand_tools'
        ? 128
        : containerId === 'bin_consumables'
          ? 320
          : 512,
    );
  }

  await clickPhysicalContainer(page, containerId);
  expect((await physicalProbe(page))?.carried).toBeNull();
}

test.describe('physical organisation suite (Unit 2)', () => {
  test('Q01/Q02: physical kit sorting, card equivalence, review correction', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await bootToDock(page, 'PHYS_Q01');
    await hubToStationJourney(page, 'inventory_prep_room');

    // Bench gear is inert before the quartermaster releases the stock.
    await standAtBench(page);
    await clickPhysicalObject(page, 'torque_driver', { expectChange: false });
    expect(await getLastFeedbackText(page)).toContain('racked and strapped');

    // Engage per-item preparation at the console (option 4).
    await driveAxisTo(page, 'x', 224, 12);
    await driveAxisTo(page, 'y', 200, 10);
    await driveAxisTo(page, 'x', 320, 10);
    await driveAxisTo(page, 'y', 180, 8);
    await press(page, 'Space');
    await selectPromptOption(page, 4);

    // — Physical pickup: the object leaves the bench and rides in hand.
    await standAtBench(page);
    expect((await physicalProbe(page))?.objects).toHaveLength(8);
    await clickPhysicalObject(page, 'torque_driver');
    expect((await physicalProbe(page))?.carried).toBe('torque_driver');
    expect((await physicalProbe(page))?.objects).toHaveLength(7);

    // Single-slot carry: a second pickup is refused with neutral feedback.
    await clickPhysicalObject(page, 'diagnostic_probe', {
      expectChange: false,
    });
    expect(await getLastFeedbackText(page)).toContain('hands are full');
    expect((await physicalProbe(page))?.carried).toBe('torque_driver');

    // — Physical placement into the kit crate: same canonical event as
    // the card path, object_id + attempt_number attached.
    await standAtKitCrate(page);
    await clickPhysicalContainer(page, 'kit_crate');

    let events = await getEvents(page);
    const torquePlacement = findEvent(events, 'correct_tool_selected');

    expect(torquePlacement?.object_id).toBe('torque_driver');
    expect(torquePlacement?.attempt_number).toBe(1);

    // — Deliberate misplacement (hand-tools item into the kit crate):
    // logged neutrally as wrong_tool_selected; feedback stays neutral.
    await carryBenchItemTo(page, 'hex_spanner', 'kit_crate');
    events = await getEvents(page);

    const hexMisplacement = findEvent(events, 'wrong_tool_selected');

    expect(hexMisplacement?.object_id).toBe('hex_spanner');
    expect(await getLastFeedbackText(page)).toContain(
      'You pack the Hex Spanner into the kit crate.',
    );

    // — Drag released away from any in-reach container: the object is
    // simply carried (never lost), then placed by click at the crate.
    await standAtBench(page);
    await dragPhysicalObjectToContainer(page, 'diagnostic_probe', 'kit_crate');
    expect((await physicalProbe(page))?.carried).toBe('diagnostic_probe');
    await standAtKitCrate(page);
    await clickPhysicalContainer(page, 'kit_crate');
    expect((await physicalProbe(page))?.carried).toBeNull();

    // — Card-path equivalence: one item staged entirely through the
    // prompt-card flow (keyboard-accessible path, unchanged).
    await standAtBench(page);
    await press(page, 'Space');

    const benchCards = await getPromptCards(page);
    const takeCoolant = benchCards?.find((card) =>
      card.label.includes('Coolant Cartridge'),
    );

    expect(takeCoolant).toBeDefined();
    await clickPromptCard(page, takeCoolant!.index);
    await standAtKitCrate(page);
    await press(page, 'Space');
    await selectPromptOption(page, 1);

    events = await getEvents(page);
    expect(
      findEvents(events, 'correct_tool_selected').map(
        (event) => event.object_id,
      ),
    ).toEqual(['torque_driver', 'diagnostic_probe', 'coolant_cartridge']);

    // — Remaining stock, physical loop: kit items + the two bin items.
    await carryBenchItemTo(page, 'fuse_pack', 'kit_crate');
    await carryBenchItemTo(page, 'patch_tape', 'kit_crate');
    await carryBenchItemTo(page, 'sealant_canister', 'bin_consumables');
    await carryBenchItemTo(page, 'relay_board', 'bin_electronics');

    events = await getEvents(page);
    expect(findEvents(events, 'inventory_item_sorted_correct')).toHaveLength(2);
    expect(findEvents(events, 'inventory_sequence_completed')).toHaveLength(1);

    // — Q02 correction window: close-out review surfaces the misplaced
    // spanner; going back, physically re-placing carries attempt 2.
    await driveAxisTo(page, 'x', 224, 12);
    await driveAxisTo(page, 'y', 200, 10);
    await driveAxisTo(page, 'x', 320, 10);
    await driveAxisTo(page, 'y', 180, 8);
    await press(page, 'Space');
    await selectPromptOption(page, 2); // Close out the prep

    events = await getEvents(page);
    const reviewMarkers = findEvents(events, 'proto_q02_review_entered');

    expect(reviewMarkers).toHaveLength(1);
    expect(
      (reviewMarkers[0].metadata as { misplaced?: number }).misplaced,
    ).toBe(1);

    await selectPromptOption(page, 1); // Go back and adjust the staging

    // Take the spanner back out at the crate (card path), then place it
    // physically into its tagged rack.
    await standAtKitCrate(page);
    await press(page, 'Space');

    const crateCards = await getPromptCards(page);
    const takeSpanner = crateCards?.find((card) =>
      card.label.includes('Hex Spanner'),
    );

    expect(takeSpanner).toBeDefined();
    await clickPromptCard(page, takeSpanner!.index);
    await standAtBin(page, 128);
    await clickPhysicalContainer(page, 'bin_hand_tools');

    events = await getEvents(page);
    const spannerPlacements = findEvents(
      events,
      'inventory_item_sorted_correct',
    ).filter((event) => event.object_id === 'hex_spanner');

    expect(spannerPlacements).toHaveLength(1);
    expect(spannerPlacements[0].attempt_number).toBe(2);

    // — Clean close-out: review clean, verify, reset the bench (legacy
    // canonical cleanup stage unchanged).
    await driveAxisTo(page, 'x', 224, 12);
    await driveAxisTo(page, 'y', 200, 10);
    await driveAxisTo(page, 'x', 320, 10);
    await driveAxisTo(page, 'y', 180, 8);
    await press(page, 'Space');
    await selectPromptOption(page, 2); // Close out
    await selectPromptOption(page, 1); // Proceed to the readiness check
    await selectPromptOption(page, 1); // Run the readiness verification
    await selectPromptOption(page, 1); // Reset the bench

    events = await getEvents(page);
    expect(findEvents(events, 'proto_q02_review_entered')).toHaveLength(2);
    expect(findEvent(events, 'missing_item')).toBeUndefined();
    expect(findEvent(events, 'inventory_verified_complete')).toBeDefined();
    expect(findEvent(events, 'cleanup_completed')).toBeDefined();
    expect(findEvents(events, 'correct_tool_selected')).toHaveLength(5);
    expect(findEvents(events, 'wrong_tool_selected')).toHaveLength(1);
    expect(findEvents(events, 'inventory_item_misplaced')).toHaveLength(0);

    expectNoRuntimeErrors(errors);
  });

  test('Q03: physical tray-to-drawer stow and drawer-cell retrieval', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await bootToDock(page, 'PHYS_Q03');

    // The stow phase is offered on the first Hub visit; walk to the
    // cabinet's south face where tray and drawers are all within reach.
    await driveAxisTo(page, 'y', 380, 12);
    await driveAxisTo(page, 'x', 640, 10);

    const probe = await physicalProbe(page);

    expect(probe?.objects.map((entry) => entry.id).sort()).toEqual([
      'flux_calibrator_bench',
      'hex_gauge',
      'lens_kit',
    ]);
    expect(probe?.containers).toHaveLength(4);

    // — Drag stow (tray → drawer cell in one gesture).
    await dragPhysicalObjectToContainer(
      page,
      'flux_calibrator_bench',
      'slot_measurement',
    );
    await waitForEventCount(page, 'proto_q03_tool_stowed', 'hub', 1);

    // — Click stow (pick, then place).
    await clickPhysicalObject(page, 'hex_gauge');
    expect((await physicalProbe(page))?.carried).toBe('hex_gauge');
    await clickPhysicalContainer(page, 'slot_optics');
    await clickPhysicalObject(page, 'lens_kit');
    await clickPhysicalContainer(page, 'slot_general');
    await waitForEventCount(page, 'proto_q03_stow_completed', 'hub', 1);

    const stowEvents = findEvents(
      await getEvents(page),
      'proto_q03_tool_stowed',
    );

    expect(
      stowEvents.map(
        (event) => (event.metadata as { slot_id?: string }).slot_id,
      ),
    ).toEqual(['slot_measurement', 'slot_optics', 'slot_general']);

    // — Retrieval becomes eligible after visiting another room.
    await hubToStationJourney(page, 'inventory_prep_room');
    await stationToHubJourney(page, 'inventory_prep_room');
    await driveAxisTo(page, 'y', 380, 12);
    await driveAxisTo(page, 'x', 640, 10);

    const retrievalProbe = await physicalProbe(page);

    expect(retrievalProbe?.objects.map((entry) => entry.id).sort()).toEqual([
      'slot_fasteners',
      'slot_general',
      'slot_measurement',
      'slot_optics',
    ]);

    // Wrong drawer first (distinguishable), then the stowed drawer.
    await clickPhysicalObject(page, 'slot_optics', { expectChange: false });
    await waitForEventCount(page, 'proto_q03_slot_opened', 'hub', 1);
    expect(await getLastFeedbackText(page)).toContain('Not in this');
    await clickPhysicalObject(page, 'slot_measurement', {
      expectChange: false,
    });
    await waitForEventCount(page, 'proto_q03_retrieved', 'hub', 1);

    const retrieved = findEvent(await getEvents(page), 'proto_q03_retrieved');
    const summary = retrieved?.metadata as {
      opens_count?: number;
      first_open_correct?: boolean;
      completed?: boolean;
    };

    expect(summary.opens_count).toBe(2);
    expect(summary.first_open_correct).toBe(false);
    expect(summary.completed).toBe(true);

    expectNoRuntimeErrors(errors);
  });

  test('Q04: standardised field-site mess, physical cleanup, exit snapshot', async ({
    page,
  }) => {
    test.setTimeout(480_000);

    const errors = captureErrors(page);

    // The module's entry state is a fixed table — pin it (identical mess
    // for every participant; content never depends on Q01-Q03 behaviour,
    // and this session performs NO prep at all before the route).
    expect(Q04_MESS_OBJECTS).toHaveLength(6);
    expect(Q04_MESS_OBJECTS.map((object) => object.category).sort()).toEqual([
      'component',
      'component',
      'field_tool',
      'field_tool',
      'waste',
      'waste',
    ]);
    expect(Q04_RETURN_POINTS.map((point) => point.accepts).sort()).toEqual([
      'component',
      'field_tool',
      'waste',
    ]);

    await bootToDock(page, 'PHYS_Q04');

    // — Vale's requisition + locker collection.
    await driveAxisTo(page, 'y', 368, 12);
    await driveAxisTo(page, 'x', 144, 10);
    await press(page, 'Space');
    await press(page, '1');
    await driveAxisTo(page, 'x', 62, 10);
    await press(page, 'Space');
    for (let i = 0; i < 3; i++) {
      await press(page, '1');
      await page.waitForTimeout(1300);
      if (i < 2) {
        await press(page, 'Space');
      }
    }

    // — To the Survey Terrace.
    const beforeField = await eventCount(page, 'scene_start', 'field');

    await driveAxisTo(page, 'x', 192, 10);
    await driveAxisTo(page, 'y', 418, 14);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'field', beforeField + 1);

    // — Kai briefing, scans, digs, install (field_route choreography).
    await driveAxisTo(page, 'x', 416, 12);
    await press(page, 'Space');
    await press(page, '1');
    await driveAxisTo(page, 'x', 576, 10);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(1600);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(2000);
    await driveAxisTo(page, 'x', 416, 10);
    await driveAxisTo(page, 'y', 272, 10);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(1600);
    await driveAxisTo(page, 'x', 160, 10);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(1600);
    await driveAxisTo(page, 'y', 208, 10);
    await driveAxisTo(page, 'x', 96, 10);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(1600);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(2000);
    await driveAxisTo(page, 'x', 160, 10);
    await driveAxisTo(page, 'y', 272, 12);
    await driveAxisTo(page, 'x', 576, 10);
    for (let step = 0; step < 3; step++) {
      await press(page, 'Space');
      await press(page, '1');
      await page.waitForTimeout(1400);
    }

    // — Install completion IS the presentation moment: identical mess.
    await waitForEventCount(page, 'proto_q04_mess_presented', 'field', 1);

    const messProbe = await physicalProbe(page);

    expect(messProbe?.objects.map((entry) => entry.id).sort()).toEqual([
      'q04_clamp_a',
      'q04_clamp_b',
      'q04_shim_a',
      'q04_shim_b',
      'q04_wrap_a',
      'q04_wrap_b',
    ]);
    expect(messProbe?.containers.map((entry) => entry.id).sort()).toEqual([
      'q04_component_crate',
      'q04_disposal',
      'q04_tool_rack',
    ]);
    expect(await getLastFeedbackText(page)).toContain('Station practice');

    // — Physical cleanup, item 1: wrap → disposal unit.
    await clickPhysicalObject(page, 'q04_wrap_a');
    expect((await physicalProbe(page))?.carried).toBe('q04_wrap_a');
    await driveAxisTo(page, 'x', 500, 12);
    await driveAxisTo(page, 'y', 384, 12);
    await driveAxisTo(page, 'x', 384, 10);
    await clickPhysicalContainer(page, 'q04_disposal');
    await waitForEventCount(page, 'proto_q04_item_cleared', 'field', 1);

    // — Item 2: clamp; the disposal unit refuses it (category mismatch,
    // neutral), the tool rack takes it — both within reach of one spot.
    await driveAxisTo(page, 'y', 300, 10);
    await driveAxisTo(page, 'x', 576, 10);
    await driveAxisTo(page, 'y', 260, 12);
    await clickPhysicalObject(page, 'q04_clamp_a');
    await driveAxisTo(page, 'x', 500, 12);
    await driveAxisTo(page, 'y', 384, 12);
    await driveAxisTo(page, 'x', 420, 10);
    await clickPhysicalContainer(page, 'q04_disposal', { expectChange: false });
    expect(await getLastFeedbackText(page)).toContain(
      "doesn't go in the Disposal Unit",
    );
    expect((await physicalProbe(page))?.carried).toBe('q04_clamp_a');
    await clickPhysicalContainer(page, 'q04_tool_rack');
    await waitForEventCount(page, 'proto_q04_item_cleared', 'field', 2);

    // — Leave with the site partially cleared: the window closes at the
    // exit and the site state is the record.
    const beforeHub = await eventCount(page, 'scene_start', 'hub');

    await driveAxisTo(page, 'y', 128, 10);
    await driveAxisTo(page, 'x', 320, 10);
    await driveAxisTo(page, 'y', 96, 14);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'hub', beforeHub + 1);

    const events = await getEvents(page);
    const exitState = findEvent(events, 'proto_q04_site_state_at_exit');
    const exitMetadata = exitState?.metadata as {
      cleared?: number;
      remaining?: number;
      restored?: boolean;
    };

    expect(exitMetadata.cleared).toBe(2);
    expect(exitMetadata.remaining).toBe(4);
    expect(exitMetadata.restored).toBe(false);

    // Q04's raw family carries no canonical measurement context, and no
    // Q01-Q03 stream event fired anywhere on this terrace route.
    for (const eventType of [
      'proto_q04_mess_presented',
      'proto_q04_item_cleared',
      'proto_q04_site_state_at_exit',
    ]) {
      const event = findEvent(events, eventType);

      expect(event?.study_item_ids).toBeUndefined();
      expect(event?.construct_id).toBeUndefined();
    }

    for (const foreign of [
      'inventory_item_sorted_correct',
      'inventory_item_misplaced',
      'correct_tool_selected',
      'wrong_tool_selected',
      'cleanup_completed',
      'workspace_left_disordered',
      'proto_q03_tool_stowed',
    ]) {
      expect(findEvent(events, foreign)).toBeUndefined();
    }

    // — The site state persists: re-entering the terrace shows the same
    // four remaining objects; leaving again logs revisit telemetry only.
    const beforeField2 = await eventCount(page, 'scene_start', 'field');

    await driveAxisTo(page, 'x', 192, 10);
    await driveAxisTo(page, 'y', 418, 14);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'field', beforeField2 + 1);

    expect((await physicalProbe(page))?.objects).toHaveLength(4);

    const beforeHub2 = await eventCount(page, 'scene_start', 'hub');

    await driveAxisTo(page, 'y', 128, 10);
    await driveAxisTo(page, 'x', 320, 10);
    await driveAxisTo(page, 'y', 96, 14);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'hub', beforeHub2 + 1);

    const finalEvents = await getEvents(page);

    expect(
      findEvents(finalEvents, 'proto_q04_site_state_at_exit'),
    ).toHaveLength(1);
    expect(findEvents(finalEvents, 'proto_q04_revisit_exit')).toHaveLength(1);

    expectNoRuntimeErrors(errors);
  });
});
