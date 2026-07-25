import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  driveAxisTo,
  getEvents,
  getLastPromptBody,
  hold,
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
  completeAllPilotDecisions,
  completeDockTutorial,
  dockToHubJourney,
  expectNoRuntimeErrors,
  hubToStationJourney,
  openStationAlcove,
  stationToHubJourney,
} from './journey';

/**
 * FABLE-NEXT-09 Route G — scripted telemetry-comparison replay (contract
 * §11.4). Drives the full §11.4 route through REAL doors and captures the
 * ORDERED event stream as (event_type, sorted payload keys, sorted
 * metadata keys) — values (timestamps, coordinates, accuracy metadata) are
 * deliberately excluded: Route G compares stream SHAPE, not stochastic
 * content.
 *
 * Two replays:
 * - Route G-A (kit-less at Repair): the §11.4 order itself — Systems
 *   Repair completes BEFORE the inventory per-item kit prep, so no
 *   qualifying packed tool exists when the Repair Panel is used. Must be
 *   ZERO-DIFF against the pre-Phase-2 baseline.
 * - Route G-B (kit-packed at Repair): identical route with the inventory
 *   per-item leg moved BEFORE the Repair leg, so the Diagnostic Probe is
 *   packed and stored when the Repair Panel opens. May differ from its
 *   pre-Phase-2 baseline by EXACTLY ONE allowlisted `prepared_tool_used`
 *   entry in its contracted position (immediately after that visit's
 *   `repair_panel_opened`, before the first submission-family event).
 *
 * Baselines were captured at `f222fc6` (pre-Phase-2 code) with
 * ROUTE_G_CAPTURE=1 and are committed under e2e/route-g/. Re-running with
 * ROUTE_G_CAPTURE=1 OVERWRITES them — only do that to re-baseline before
 * a new phase, never to make a failing comparison pass.
 */

const CAPTURE_MODE = process.env.ROUTE_G_CAPTURE === '1';
// Playwright transpiles specs to CJS (no import.meta); the runner's cwd is
// the project root, so the baseline directory resolves beside this spec.
const BASELINE_DIR = resolve(process.cwd(), 'e2e', 'route-g');

/** One ordered stream entry: type + sorted payload/metadata key sets. */
interface StreamEntry {
  t: string;
  k: string[];
  m: string[];
}

async function captureStream(page: Page): Promise<StreamEntry[]> {
  const events = await getEvents(page);

  return events.map((event) => {
    const record = event as Record<string, unknown>;
    const metadata = record.metadata as Record<string, unknown> | undefined;

    return {
      t: String(record.event_type),
      k: Object.keys(record).sort(),
      m: metadata === undefined ? [] : Object.keys(metadata).sort(),
    };
  });
}

function baselinePath(name: string): string {
  return join(BASELINE_DIR, `${name}.baseline.json`);
}

function writeBaseline(name: string, stream: StreamEntry[]) {
  mkdirSync(BASELINE_DIR, { recursive: true });
  writeFileSync(
    baselinePath(name),
    `${JSON.stringify(stream, null, 2)}\n`,
    'utf8',
  );
}

function readBaseline(name: string): StreamEntry[] {
  const path = baselinePath(name);

  expect(
    existsSync(path),
    `Route G baseline missing: ${path} — capture it with ROUTE_G_CAPTURE=1 on pre-change code`,
  ).toBe(true);

  return JSON.parse(readFileSync(path, 'utf8')) as StreamEntry[];
}

/** Full-stream equality with a first-divergence diagnostic. */
function expectStreamsEqual(actual: StreamEntry[], baseline: StreamEntry[]) {
  const limit = Math.min(actual.length, baseline.length);

  for (let index = 0; index < limit; index++) {
    expect(
      actual[index],
      `Route G divergence at ordered index ${index} (baseline "${baseline[index].t}" vs actual "${actual[index].t}")`,
    ).toEqual(baseline[index]);
  }

  expect(
    actual.length,
    `Route G stream length ${actual.length} != baseline ${baseline.length}`,
  ).toBe(baseline.length);
}

/**
 * Engineer leg: prepared report (review evidence), fixed record-card claim
 * (option 1 — claim VALUES differ by session state, but Route G compares
 * key sets, which are state-independent), accept the relay duty.
 */
async function engineerReportAndDuty(page: Page) {
  await openStationAlcove(page);
  await selectPromptOption(page, 2); // review the station evidence
  await selectPromptOption(page, 1); // record-card claim (fixed choice)
  await selectPromptOption(page, 1); // accept the relay duty
}

/**
 * Inventory per-item leg (§11.4 "inventory per-item prep + cleanup"):
 * engage the bench mode, checklist action, pack the five requisition items
 * in checklist order, stow the three stray items, close out clean
 * (review → verify → reset).
 */
async function inventoryPerItemPrep(page: Page) {
  await inventoryToConsole(page);
  await press(page, '4'); // engage per-item mode
  await press(page, 'Space'); // reopen the console
  await press(page, '1'); // check the requisition list
  await press(page, '1'); // close the list

  // Requisition items in checklist order (bench lists remaining items in
  // registry order, so the first remaining is always option 1).
  for (let i = 0; i < 5; i++) {
    await inventoryToPrepBench(page);
    await press(page, '1');
    await inventoryToKitCrate(page);
    await press(page, '1');
  }

  await inventoryToPrepBench(page);
  await press(page, '1');
  await inventoryToStorageBin(page, 'hand_tools');
  await press(page, '1');
  await inventoryToPrepBench(page);
  await press(page, '1');
  await inventoryToStorageBin(page, 'consumables');
  await press(page, '1');
  await inventoryToPrepBench(page);
  await press(page, '1');
  await inventoryToStorageBin(page, 'electronics');
  await press(page, '1');

  await inventoryToConsole(page);
  await press(page, '2'); // close out the prep
  await press(page, '1'); // clean review: proceed to the readiness check
  await press(page, '1'); // run the readiness verification
  await press(page, '1'); // reset the bench
}

/**
 * Repair leg: default sequence fails, manual, revised sequence completes.
 * STATE-AWARE first stage: when the Phase 2 retrieval micro-step is
 * offered (qualifying packed-tool session, post-change code only), the
 * driver first retrieves and applies the Diagnostic Probe from the kit
 * crate — its actual stored location on this route — then continues into
 * the unchanged sequence stage. On kit-less sessions (and on pre-change
 * code) the panel opens directly on the sequence options and the branch
 * never triggers.
 */
async function repairLeg(page: Page) {
  await openStationAlcove(page);

  const body = await getLastPromptBody(page);

  if (body !== null && body.includes('Diagnostic Probe')) {
    await selectPromptOption(page, 1); // open the field kit crate
    await selectPromptOption(page, 1); // take the probe to the panel
    await selectPromptOption(page, 1); // fit the probe -> prepared_tool_used
  }

  await selectPromptOption(page, 1); // default sequence (fails)
  await openStationAlcove(page);
  await selectPromptOption(page, 2); // open the repair manual
  await openStationAlcove(page);
  await selectPromptOption(page, 3); // revised sequence (completes)
}

/** Archive leg: scripted failure, feedback, revised query completes. */
async function archiveLeg(page: Page) {
  await openStationAlcove(page);
  await selectPromptOption(page, 1); // wrong code (scripted failure)
  await openStationAlcove(page);
  await selectPromptOption(page, 2); // read the feedback
  await openStationAlcove(page);
  await selectPromptOption(page, 3); // revised query (completes)
}

/** Side repair leg: accept, fetch, seat, run check (completes). */
async function sideRepairLeg(page: Page) {
  await openStationAlcove(page);
  await selectPromptOption(page, 2); // accept the stabiliser repair
  await driveAxisTo(page, 'y', 272, 12);
  await hold(page, 'ArrowLeft', 2400);
  await press(page, 'Space');
  await selectPromptOption(page, 1); // collect the replacement part
  await driveAxisTo(page, 'x', 320, 12);
  await openStationAlcove(page);
  await selectPromptOption(page, 1); // seat the part
  await press(page, 'Space');
  await selectPromptOption(page, 1); // run the system check (completes)
}

/** Hazard leg: check the detail, then continue informed. */
async function hazardLeg(page: Page) {
  await openStationAlcove(page);
  await selectPromptOption(page, 1); // check the hazard detail
  await openStationAlcove(page);
  await selectPromptOption(page, 2); // continue (informed branch)
}

/** Corridor leg: switch to the competing task, then observed return. */
async function corridorSwitchAndReturn(page: Page) {
  await openStationAlcove(page); // comms beacon
  await selectPromptOption(page, 1); // commit to the competing request
  await driveAxisTo(page, 'x', 576, 12);
  await press(page, 'Space'); // antenna junction
  await selectPromptOption(page, 1); // realign the feed
  await selectPromptOption(page, 1); // confirm the realignment
  await driveAxisTo(page, 'x', 192, 12);
  await press(page, 'Space'); // relay checkpoint
  await selectPromptOption(page, 1); // review the relay log
  await selectPromptOption(page, 1); // log the check-in as complete
}

/**
 * The full §11.4 route. `kitBeforeRepair` moves the inventory per-item
 * leg ahead of the Repair leg (Route G-B); everything else is identical.
 */
async function driveRouteG(page: Page, kitBeforeRepair: boolean) {
  await completeDockTutorial(page, 2);
  await dockToHubJourney(page);

  // All four pilot decisions (route-gate prerequisite; starts and ends in
  // the Hub).
  await completeAllPilotDecisions(page);

  await hubToStationJourney(page, 'archive_room');
  await archiveLeg(page);
  await stationToHubJourney(page, 'archive_room');

  if (kitBeforeRepair) {
    await hubToStationJourney(page, 'inventory_prep_room');
    await inventoryPerItemPrep(page);
    await stationToHubJourney(page, 'inventory_prep_room');
  }

  await hubToStationJourney(page, 'systems_repair_room');
  await repairLeg(page);
  await stationToHubJourney(page, 'systems_repair_room');

  await hubToStationJourney(page, 'engineer_hub');
  await engineerReportAndDuty(page);
  await stationToHubJourney(page, 'engineer_hub');

  if (!kitBeforeRepair) {
    await hubToStationJourney(page, 'inventory_prep_room');
    await inventoryPerItemPrep(page);
    await stationToHubJourney(page, 'inventory_prep_room');
  }

  await hubToStationJourney(page, 'hazard_control_room');
  await hazardLeg(page);
  await stationToHubJourney(page, 'hazard_control_room');

  await hubToStationJourney(page, 'optional_side_repair_bay');
  await sideRepairLeg(page);
  await stationToHubJourney(page, 'optional_side_repair_bay');

  await hubToStationJourney(page, 'interruption_corridor');
  await corridorSwitchAndReturn(page);
  await stationToHubJourney(page, 'interruption_corridor');

  await hubToStationJourney(page, 'final_core_room');
  await openStationAlcove(page);
  await selectPromptOption(page, 3); // review and resolve, then complete
}

test.describe('route G telemetry comparison (NEXT-09 §11.4)', () => {
  test('route G-A: kit-less at Repair — zero-diff against the pre-Phase-2 baseline', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await bootJourney(page, {
      participant_id: 'RG_A',
      game_session_id: 'ROUTE_G_A',
      condition: 'pilot',
      game_version: 'e2e',
    });

    await driveRouteG(page, false);

    const stream = await captureStream(page);

    // The §11.4 order never offers the retrieval micro-step (the kit is
    // packed only after Systems Repair completes) — assert that directly
    // as well as via the baseline comparison.
    expect(stream.map((entry) => entry.t)).not.toContain('prepared_tool_used');

    if (CAPTURE_MODE) {
      writeBaseline('route-g-a', stream);
    } else {
      expectStreamsEqual(stream, readBaseline('route-g-a'));
    }

    expectNoRuntimeErrors(errors);
  });

  test('route G-B: kit-packed at Repair — exactly one allowlisted prepared_tool_used in its contracted position', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await bootJourney(page, {
      participant_id: 'RG_B',
      game_session_id: 'ROUTE_G_B',
      condition: 'pilot',
      game_version: 'e2e',
    });

    await driveRouteG(page, true);

    const stream = await captureStream(page);

    if (CAPTURE_MODE) {
      writeBaseline('route-g-b', stream);
      expectNoRuntimeErrors(errors);
      return;
    }

    const baseline = readBaseline('route-g-b');
    const added = stream.filter((entry) => entry.t === 'prepared_tool_used');

    // Exactly one allowlisted new event...
    expect(added).toHaveLength(1);
    expect(added[0].m).toEqual([]);

    // ...in its contracted position: immediately after that visit's
    // repair_panel_opened, before the first submission-family event.
    const index = stream.findIndex((entry) => entry.t === 'prepared_tool_used');

    expect(stream[index - 1].t).toBe('repair_panel_opened');
    expect(stream[index + 1].t).toBe('repair_attempt');

    // ...and removing it yields the pre-Phase-2 baseline byte-for-byte
    // (names, payload keys, metadata keys, relative order).
    expectStreamsEqual(
      stream.filter((entry) => entry.t !== 'prepared_tool_used'),
      baseline,
    );

    expectNoRuntimeErrors(errors);
  });
});
