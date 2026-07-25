import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clickPromptCard,
  findEvent,
  getEvents,
  getEventTypes,
  getLastPromptBody,
  inventoryToConsole,
  inventoryToKitCrate,
  inventoryToPrepBench,
  inventoryToStorageBin,
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
  openStationAlcove,
  stationToHubJourney,
} from './journey';

/**
 * FABLE-NEXT-09 Phase 2 — Q03 prepared-tool retrieval episode at the
 * Systems Repair Panel (NEXT-09-OD-3, approved emission definition):
 *
 * `prepared_tool_used` fires EXACTLY ONCE, and only when the task-relevant
 * tool (Diagnostic Probe) that the participant previously packed is
 * retrieved from its ACTUAL stored location and first APPLIED to the
 * Systems Repair task — never on container opening, item selection,
 * display, or carrying. A session with no qualifying packed tool is a
 * no-opportunity state: the Repair Panel stays byte-identical to the
 * pre-Phase-2 panel and the ordered event stream is unchanged (Route G
 * asserts the full-route version of that invariant).
 */

const count = (types: string[], type: string) =>
  types.filter((t) => t === type).length;

/** Boot, skip the tutorial, walk to the Hub (single page session). */
async function bootToHub(page: Page, participant: string, session: string) {
  await bootJourney(page, {
    participant_id: participant,
    game_session_id: session,
    condition: 'pilot',
    game_version: 'e2e',
  });
  await completeDockTutorial(page, 1);
  await dockToHubJourney(page);
}

/** Engage the per-item bench mode at the quartermaster console. */
async function engagePerItemMode(page: Page) {
  await inventoryToConsole(page);
  await press(page, '4');
}

/**
 * Pack the Diagnostic Probe into the kit crate. Fresh bench order is the
 * registry order, so the probe is bench option 2 (after the torque
 * driver).
 */
async function packProbeIntoCrate(page: Page) {
  await inventoryToPrepBench(page);
  await press(page, '2');
  await inventoryToKitCrate(page);
  await press(page, '1');
}

/**
 * Close out the per-item prep with items still unstaged: close out →
 * proceed past the bench review → run the verification → reset the bench.
 */
async function closeOutWithIssues(page: Page) {
  await inventoryToConsole(page);
  await press(page, '2');
  await press(page, '2');
  await press(page, '1');
  await press(page, '1');
}

/** Open the Repair Panel from the repair-room entry spawn. */
async function openRepairPanel(page: Page) {
  await openStationAlcove(page);
  await page.waitForTimeout(400);
}

test.describe('repair prepared-tool retrieval (Q03, NEXT-09 Phase 2)', () => {
  test('qualifying packed tool: opportunity shown, wrong container and selection emit nothing, first application emits exactly once', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await bootToHub(page, 'E2E_Q03_P1', 'E2E_Q03_S1');

    // Pack the probe, close out (kit incomplete — the opportunity is
    // per-tool, not per-kit).
    await hubToStationJourney(page, 'inventory_prep_room');
    await engagePerItemMode(page);
    await packProbeIntoCrate(page);
    await closeOutWithIssues(page);
    await stationToHubJourney(page, 'inventory_prep_room');

    await hubToStationJourney(page, 'systems_repair_room');
    await openRepairPanel(page);

    // The retrieval micro-step is offered (opportunity state).
    let body = await getLastPromptBody(page);

    expect(body).toContain('Diagnostic Probe');
    expect(body).toContain('Open the Field Kit Crate.');
    expect(body).toContain('Go straight to the sequence controls.');

    // Panel opening never emits the event (and repair_panel_opened is
    // unchanged).
    let types = await getEventTypes(page);

    expect(types).not.toContain('prepared_tool_used');
    expect(count(types, 'repair_panel_opened')).toBe(1);

    // Wrong container: opening emits nothing; the display names no probe.
    await selectPromptOption(page, 2); // open the Hand Tools Rack
    body = await getLastPromptBody(page);
    expect(body).toContain('The Hand Tools Rack is empty.');
    expect(body).not.toContain('Take the Diagnostic Probe');
    await selectPromptOption(page, 1); // close the container

    types = await getEventTypes(page);
    expect(types).not.toContain('prepared_tool_used');
    expect(types).not.toContain('wrong_tool_selected');

    // Actual stored location: the kit crate holds the probe.
    await selectPromptOption(page, 1); // open the Field Kit Crate
    body = await getLastPromptBody(page);
    expect(body).toContain('Inside the Field Kit Crate: Diagnostic Probe.');

    // Taking the tool (selection + carrying) emits nothing.
    await selectPromptOption(page, 1); // take the probe to the panel
    types = await getEventTypes(page);
    expect(types).not.toContain('prepared_tool_used');

    // First application to the repair task: the single emission moment.
    body = await getLastPromptBody(page);
    expect(body).toContain(
      'Fit the Diagnostic Probe for the calibration steps.',
    );
    await selectPromptOption(page, 1);

    let events = await getEvents(page);

    expect(
      count(
        events.map((e) => e.event_type),
        'prepared_tool_used',
      ),
    ).toBe(1);

    const applied = findEvent(events, 'prepared_tool_used');

    expect(applied?.object_id).toBe('diagnostic_probe');
    expect(applied?.room_id).toBe('systems_repair_room');
    expect(applied?.task_id).toBe('repair_sequence_selection');
    expect(applied?.study_item_ids).toEqual(['Q03']);
    expect(applied?.construct_id).toBe('organisation');
    expect(applied && 'attempt_number' in applied).toBe(false);

    // The chained sequence stage is the unchanged repair panel.
    body = await getLastPromptBody(page);
    expect(body).toContain('Run default repair sequence');
    expect(body).not.toContain('Diagnostic Probe');

    // Complete the repair through the unchanged cycle model.
    await selectPromptOption(page, 1); // default sequence fails
    await openRepairPanel(page);
    await selectPromptOption(page, 2); // manual
    await openRepairPanel(page);
    await selectPromptOption(page, 3); // revised sequence completes

    events = await getEvents(page);
    types = events.map((e) => e.event_type);

    // Exactly once, in the contracted position: after that visit's
    // repair_panel_opened, before the first submission-family event.
    expect(count(types, 'prepared_tool_used')).toBe(1);
    expect(types.indexOf('prepared_tool_used')).toBeGreaterThan(
      types.indexOf('repair_panel_opened'),
    );
    expect(types.indexOf('prepared_tool_used')).toBeLessThan(
      types.indexOf('repair_attempt'),
    );

    // Unchanged repair choreography: attempt numbers and completion.
    const submissions = events.filter(
      (e) => e.event_type === 'repair_sequence_submitted',
    );

    expect(submissions.map((e) => e.attempt_number)).toEqual([1, 2]);
    expect(types).toContain('repair_failed');
    expect(types).toContain('repair_strategy_revision');
    expect(types).toContain('repair_completed');

    expectNoRuntimeErrors(errors);
  });

  test('actual stored location: a probe re-stowed into a bin is retrieved there, not at the crate', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await bootToHub(page, 'E2E_Q03_P2', 'E2E_Q03_S2');

    // Pack the probe, then take it back out and stow it on the
    // Electronics Shelf — its actual stored location is now the shelf.
    await hubToStationJourney(page, 'inventory_prep_room');
    await engagePerItemMode(page);
    await packProbeIntoCrate(page);
    await inventoryToKitCrate(page);
    await press(page, '1'); // take the probe back out
    await inventoryToStorageBin(page, 'electronics');
    await press(page, '1'); // stow it here
    await closeOutWithIssues(page);
    await stationToHubJourney(page, 'inventory_prep_room');

    await hubToStationJourney(page, 'systems_repair_room');
    await openRepairPanel(page);

    let body = await getLastPromptBody(page);

    expect(body).toContain('Diagnostic Probe');

    // The crate no longer holds it — display only, no emission.
    await selectPromptOption(page, 1); // open the Field Kit Crate
    body = await getLastPromptBody(page);
    expect(body).toContain('The Field Kit Crate is empty.');
    await selectPromptOption(page, 1); // close the container

    // Its actual stored location: the Electronics Shelf.
    await selectPromptOption(page, 4); // open the Electronics Shelf
    body = await getLastPromptBody(page);
    expect(body).toContain('Inside the Electronics Shelf:');
    expect(body).toContain('Take the Diagnostic Probe to the panel.');
    await selectPromptOption(page, 1); // take it
    await selectPromptOption(page, 1); // fit it — the emission moment

    const types = await getEventTypes(page);

    expect(count(types, 'prepared_tool_used')).toBe(1);

    expectNoRuntimeErrors(errors);
  });

  test('no-opportunity: legacy checklist prep leaves the Repair Panel byte-identical and never emits', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    // Session A — fresh session, no inventory work at all: reference
    // panel body.
    await bootToHub(page, 'E2E_Q03_P3A', 'E2E_Q03_S3A');
    await hubToStationJourney(page, 'systems_repair_room');
    await openRepairPanel(page);

    const freshBody = await getLastPromptBody(page);

    expect(freshBody).toContain('Run default repair sequence');
    expect(freshBody).not.toContain('Diagnostic Probe');

    // Session B — legacy checklist prep (kit packed WITHOUT the per-item
    // storage substrate): no actual stored location exists, so this is a
    // no-opportunity state and the panel must render byte-identically.
    const errors = captureErrors(page);

    await bootToHub(page, 'E2E_Q03_P3B', 'E2E_Q03_S3B');
    await hubToStationJourney(page, 'inventory_prep_room');
    await inventoryToConsole(page);
    await press(page, '2'); // legacy checklist pack
    await press(page, '1'); // run the readiness verification
    await press(page, '1'); // sort the workspace
    await stationToHubJourney(page, 'inventory_prep_room');

    await hubToStationJourney(page, 'systems_repair_room');
    await openRepairPanel(page);

    expect(await getLastPromptBody(page)).toBe(freshBody);

    // The unchanged repair flow, end to end, never emits the event.
    await selectPromptOption(page, 1);
    await openRepairPanel(page);
    await selectPromptOption(page, 2);
    await openRepairPanel(page);
    await selectPromptOption(page, 3);

    const types = await getEventTypes(page);

    expect(types).not.toContain('prepared_tool_used');
    expect(types).toContain('repair_completed');

    expectNoRuntimeErrors(errors);
  });

  test('no-opportunity: per-item sessions without a stored packed probe never see the micro-step', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    // Probe left on the bench (only the torque driver packed): the probe
    // was never packed, so no opportunity exists.
    await bootToHub(page, 'E2E_Q03_P4', 'E2E_Q03_S4');
    await hubToStationJourney(page, 'inventory_prep_room');
    await engagePerItemMode(page);
    await inventoryToPrepBench(page);
    await press(page, '1'); // take the torque driver
    await inventoryToKitCrate(page);
    await press(page, '1'); // pack it
    await closeOutWithIssues(page);
    await stationToHubJourney(page, 'inventory_prep_room');

    await hubToStationJourney(page, 'systems_repair_room');
    await openRepairPanel(page);

    const body = await getLastPromptBody(page);

    expect(body).toContain('Run default repair sequence');
    expect(body).not.toContain('Diagnostic Probe');
    expect(await getEventTypes(page)).not.toContain('prepared_tool_used');

    expectNoRuntimeErrors(errors);
  });

  test('no-opportunity: a probe stowed in a bin but never packed does not qualify', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await bootToHub(page, 'E2E_Q03_P5', 'E2E_Q03_S5');
    await hubToStationJourney(page, 'inventory_prep_room');
    await engagePerItemMode(page);
    await inventoryToPrepBench(page);
    await press(page, '2'); // take the diagnostic probe
    await inventoryToStorageBin(page, 'hand_tools');
    await press(page, '1'); // stow it — misplaced, never packed
    await closeOutWithIssues(page);
    await stationToHubJourney(page, 'inventory_prep_room');

    await hubToStationJourney(page, 'systems_repair_room');
    await openRepairPanel(page);

    const body = await getLastPromptBody(page);

    expect(body).toContain('Run default repair sequence');
    expect(body).not.toContain('Diagnostic Probe');
    expect(await getEventTypes(page)).not.toContain('prepared_tool_used');

    expectNoRuntimeErrors(errors);
  });

  test('room re-entry: the unapplied opportunity persists, the applied state never re-offers, the event stays exactly once', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await bootToHub(page, 'E2E_Q03_P6', 'E2E_Q03_S6');
    await hubToStationJourney(page, 'inventory_prep_room');
    await engagePerItemMode(page);
    await packProbeIntoCrate(page);
    await closeOutWithIssues(page);
    await stationToHubJourney(page, 'inventory_prep_room');

    // Visit 1: decline the retrieval ("go straight"), fail the default
    // sequence, leave (repair_abandoned fires per the unchanged rule).
    await hubToStationJourney(page, 'systems_repair_room');
    await openRepairPanel(page);
    expect(await getLastPromptBody(page)).toContain('Diagnostic Probe');
    await selectPromptOption(page, 5); // go straight to the sequence controls
    expect(await getLastPromptBody(page)).toContain(
      'Run default repair sequence',
    );
    await selectPromptOption(page, 1); // default sequence fails
    await stationToHubJourney(page, 'systems_repair_room');

    let types = await getEventTypes(page);

    expect(types).not.toContain('prepared_tool_used');
    expect(types).toContain('repair_abandoned');

    // Visit 2: the opportunity is still offered (unapplied state
    // persists); retrieve and apply now.
    await hubToStationJourney(page, 'systems_repair_room');
    await openRepairPanel(page);
    expect(await getLastPromptBody(page)).toContain('Diagnostic Probe');
    await selectPromptOption(page, 1); // open the Field Kit Crate
    await selectPromptOption(page, 1); // take the probe
    await selectPromptOption(page, 1); // fit it — emits once

    types = await getEventTypes(page);
    expect(count(types, 'prepared_tool_used')).toBe(1);
    expect(types).toContain('repair_returned_after_failure');

    // The fit act chains into the (open) sequence stage — close it the
    // only way any repair panel closes, by a sequence selection, before
    // walking out (movement is captured while a prompt is open).
    await selectPromptOption(page, 1); // default sequence fails again
    await stationToHubJourney(page, 'systems_repair_room');

    // Visit 3: applied — the micro-step never re-offers, the count never
    // grows.
    await hubToStationJourney(page, 'systems_repair_room');
    await openRepairPanel(page);

    const body = await getLastPromptBody(page);

    expect(body).toContain('Run default repair sequence');
    expect(body).not.toContain('Diagnostic Probe');

    types = await getEventTypes(page);
    expect(count(types, 'prepared_tool_used')).toBe(1);

    expectNoRuntimeErrors(errors);
  });

  test('keyboard and mouse parity: identical ordered event streams through the retrieval episode', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const driveSession = async (
      participant: string,
      session: string,
      input: 'keyboard' | 'mouse',
    ): Promise<string[]> => {
      await bootToHub(page, participant, session);
      await hubToStationJourney(page, 'inventory_prep_room');
      await engagePerItemMode(page);
      await packProbeIntoCrate(page);
      await closeOutWithIssues(page);
      await stationToHubJourney(page, 'inventory_prep_room');
      await hubToStationJourney(page, 'systems_repair_room');

      const pick = async (optionNumber: number) => {
        if (input === 'keyboard') {
          await selectPromptOption(page, optionNumber);
        } else {
          await clickPromptCard(page, optionNumber - 1);
        }
      };

      await openRepairPanel(page);
      await pick(1); // open the Field Kit Crate
      await pick(1); // take the probe
      await pick(1); // fit it — prepared_tool_used
      await pick(1); // default sequence fails
      await openRepairPanel(page);
      await pick(2); // manual
      await openRepairPanel(page);
      await pick(3); // revised sequence completes

      return getEventTypes(page);
    };

    const keyboardStream = await driveSession(
      'E2E_Q03_P7K',
      'E2E_Q03_S7K',
      'keyboard',
    );
    const mouseStream = await driveSession(
      'E2E_Q03_P7M',
      'E2E_Q03_S7M',
      'mouse',
    );

    expect(count(keyboardStream, 'prepared_tool_used')).toBe(1);
    expect(mouseStream).toEqual(keyboardStream);
  });
});
