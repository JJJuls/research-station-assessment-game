import * as fs from 'node:fs';

import { expect, test } from '@playwright/test';

import { Q16_SITES } from '../src/measurement/q16ArtifactSurvey';
import {
  clickPhysicalContainer,
  clickPhysicalObject,
  clickPhysicalRect,
  clickPromptCard,
  driveAxisTo,
  getPromptCards,
  openNearbyPrompt,
  physicalProbe,
  press,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  completeDockTutorial,
  dockToHubJourney,
  eventCount,
  expectNoRuntimeErrors,
  hubToStationJourney,
  waitForEventCount,
} from './journey';

/**
 * Physical-mechanics session (Unit 8): participant-view captures of every
 * new physical mechanic, exactly as played (real input, no debug
 * overlays). Frames land in docs/verification/screenshots-physical/.
 */

const OUT_DIR = 'docs/verification/screenshots-physical';

type Pg = import('@playwright/test').Page;

async function shot(page: Pg, name: string) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT_DIR}/${name}.png` });
}

async function standAtBench(page: Pg) {
  await driveAxisTo(page, 'x', 224, 12);
  await driveAxisTo(page, 'y', 292, 12);
  await driveAxisTo(page, 'x', 500, 12);
  await driveAxisTo(page, 'y', 276, 8);
}

async function standAtKitCrate(page: Pg) {
  await driveAxisTo(page, 'x', 224, 12);
  await driveAxisTo(page, 'y', 336, 10);
  await driveAxisTo(page, 'x', 192, 10);
}

async function prepConsole(page: Pg) {
  await driveAxisTo(page, 'x', 224, 12);
  await driveAxisTo(page, 'y', 200, 10);
  await driveAxisTo(page, 'x', 320, 10);
  await driveAxisTo(page, 'y', 180, 8);
  await press(page, 'Space');
}

async function annexWalkTo(page: Pg, x: number, y: number) {
  await driveAxisTo(page, 'x', 208, 14);
  await driveAxisTo(page, 'y', y, 12);
  await driveAxisTo(page, 'x', x, 12);
}

test.describe('physical-mechanics visual capture (Unit 8)', () => {
  test('organisation suite frames (Q01/Q02/Q03)', async ({ page }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await page.goto('/?participant_id=PT_CAP_ORG&game_session_id=GS_CAP_ORG');
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'dock',
    );
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // Q03 stow phase at the cabinet (physical tray + drawers).
    await driveAxisTo(page, 'y', 380, 12);
    await driveAxisTo(page, 'x', 640, 10);
    await shot(page, '05-q03-cabinet-tray');
    await clickPhysicalObject(page, 'flux_calibrator_bench');
    await clickPhysicalContainer(page, 'slot_measurement');
    await clickPhysicalObject(page, 'hex_gauge');
    await clickPhysicalContainer(page, 'slot_optics');
    await clickPhysicalObject(page, 'lens_kit');
    await clickPhysicalContainer(page, 'slot_general');

    await hubToStationJourney(page, 'inventory_prep_room');
    await prepConsole(page);
    await selectPromptOption(page, 4);
    await standAtBench(page);
    await shot(page, '01-q01-unsorted-bench');

    // Active sorting: one item carried toward the crate.
    await clickPhysicalObject(page, 'torque_driver');
    await shot(page, '02-q01-carrying-item');
    await standAtKitCrate(page);
    await clickPhysicalContainer(page, 'kit_crate');

    // Misplace the spanner for the review capture, then finish staging.
    await standAtBench(page);
    await clickPhysicalObject(page, 'hex_spanner');
    await standAtKitCrate(page);
    await clickPhysicalContainer(page, 'kit_crate');

    for (const [objectId, containerId] of [
      ['diagnostic_probe', 'kit_crate'],
      ['coolant_cartridge', 'kit_crate'],
      ['fuse_pack', 'kit_crate'],
      ['patch_tape', 'kit_crate'],
    ] as const) {
      await standAtBench(page);
      await clickPhysicalObject(page, objectId);
      await standAtKitCrate(page);
      await clickPhysicalContainer(page, containerId);
    }

    await standAtBench(page);
    await clickPhysicalObject(page, 'sealant_canister');
    await driveAxisTo(page, 'x', 224, 12);
    await driveAxisTo(page, 'y', 56, 8);
    await driveAxisTo(page, 'x', 320, 10);
    await clickPhysicalContainer(page, 'bin_consumables');
    await standAtBench(page);
    await clickPhysicalObject(page, 'relay_board');
    await driveAxisTo(page, 'x', 224, 12);
    await driveAxisTo(page, 'y', 56, 8);
    await driveAxisTo(page, 'x', 512, 10);
    await clickPhysicalContainer(page, 'bin_electronics');

    // Q02: the close-out review names the misplaced spanner.
    await prepConsole(page);
    await selectPromptOption(page, 2);
    await shot(page, '03-q02-correction-review');
    await selectPromptOption(page, 1); // go back and adjust
    await standAtKitCrate(page);
    await press(page, 'Space');

    const crateCards = await getPromptCards(page);
    const takeSpanner = crateCards?.find((card) =>
      card.label.includes('Hex Spanner'),
    );

    expect(takeSpanner).toBeDefined();
    await clickPromptCard(page, takeSpanner!.index);
    await driveAxisTo(page, 'x', 224, 12);
    await driveAxisTo(page, 'y', 56, 8);
    await driveAxisTo(page, 'x', 128, 10);
    await clickPhysicalContainer(page, 'bin_hand_tools');

    await prepConsole(page);
    await selectPromptOption(page, 2);
    await shot(page, '04-q01-verified-kit-review');
    await selectPromptOption(page, 1);
    await selectPromptOption(page, 1);
    await selectPromptOption(page, 1);

    expectNoRuntimeErrors(errors);
  });

  test('artifact survey frames (Q16)', async ({ page }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'PT_CAP_Q16',
        game_session_id: 'GS_CAP_Q16',
        scene: 'artifact_field',
      },
      'artifact_survey',
    );

    await annexWalkTo(page, 256, 128);
    await openNearbyPrompt(page);
    await shot(page, '06-q16-briefing');
    await selectPromptOption(page, 1);
    await selectPromptOption(page, 1);

    // Scan a clear site and a flagged site (animated scan in frame 07).
    const flagged = Q16_SITES.find((site) => site.yields !== null)!;

    await annexWalkTo(page, flagged.x, flagged.y);

    const probe = await physicalProbe(page);
    const stake = probe?.objects.find(
      (entry) => entry.id === `stake_${flagged.site_id}`,
    );

    expect(stake).toBeDefined();
    await clickPhysicalRect(page, stake!, { expectChange: false });
    await page.waitForTimeout(600);
    await shot(page, '07-q16-scanning');
    await waitForEventCount(
      page,
      'proto_q16_site_scanned',
      'artifact_survey',
      1,
    );
    await page.waitForTimeout(400);

    // Dig it (animated dig in frame 08) and collect the specimen.
    const probe2 = await physicalProbe(page);
    const stake2 = probe2?.objects.find(
      (entry) => entry.id === `stake_${flagged.site_id}`,
    );

    await clickPhysicalRect(page, stake2!, { expectChange: false });
    await page.waitForTimeout(800);
    await shot(page, '08-q16-digging');
    await waitForEventCount(page, 'proto_q16_site_dug', 'artifact_survey', 1);
    await page.waitForTimeout(400);
    await clickPhysicalObject(page, flagged.yields!);

    // Case it and capture the specimen case + manifest check.
    await annexWalkTo(page, 576, 176);
    await clickPhysicalContainer(
      page,
      flagged.yields === 'basalt_fragment'
        ? 'tray_minerals'
        : flagged.yields === 'ice_core_segment'
          ? 'tray_cores'
          : 'tray_biology',
    );
    await shot(page, '09-q16-specimen-case');
    await driveAxisTo(page, 'y', 160, 10);
    await press(page, 'Space');

    const caseCards = await getPromptCards(page);
    const manifest = caseCards?.find((card) =>
      card.label.includes('manifest check'),
    );

    await clickPromptCard(page, manifest!.index);
    await page.waitForTimeout(400);
    await shot(page, '10-q16-manifest-verify');

    expectNoRuntimeErrors(errors);
  });

  test('persistence frames (Q21/Q23/Q26/Q27)', async ({ page }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await bootJourney(page, {
      participant_id: 'PT_CAP_PERSIST',
      game_session_id: 'GS_CAP_PERSIST',
    });
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);
    await hubToStationJourney(page, 'systems_repair_room');

    // Q21/Q26: default sequence failure + identical resubmission at the
    // repair panel (faulted machine visible beside it).
    await driveAxisTo(page, 'x', 224, 12);
    await driveAxisTo(page, 'y', 200, 10);
    await driveAxisTo(page, 'x', 304, 10);
    await driveAxisTo(page, 'y', 180, 8);
    await press(page, 'Space');
    await selectPromptOption(page, 1);
    await shot(page, '11-q21-difficulty-failure');
    await press(page, 'Space');
    await shot(page, '12-q26-identical-retry-panel');
    await selectPromptOption(page, 1);

    // Q23: intake rig with an attempt running (animated spanner).
    await driveAxisTo(page, 'y', 272, 12);
    await driveAxisTo(page, 'x', 544, 12);
    await driveAxisTo(page, 'y', 250, 10);
    await press(page, 'Space');
    await selectPromptOption(page, 1);
    await page.waitForTimeout(500);
    await shot(page, '13-q23-rig-attempt');
    await waitForEventCount(page, 'proto_q23_attempt', 'repair', 1);

    expectNoRuntimeErrors(errors);
  });

  test('utility-stop and salvage frames (Q27, free play)', async ({ page }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'PT_CAP_Q27',
        game_session_id: 'GS_CAP_Q27',
        scene: 'utility_bay',
      },
      'utility_bay',
    );

    await driveAxisTo(page, 'x', 288, 12);
    await driveAxisTo(page, 'y', 240, 12);
    for (let cycle = 0; cycle < 3; cycle++) {
      await press(page, 'Space');
      await press(page, '1');
      await page.waitForTimeout(1400);
    }

    await waitForEventCount(page, 'proto_q27_stop_signal_shown', undefined, 1);
    await press(page, 'Space');
    await shot(page, '14-q27-stop-signal-window');
    await press(page, '2'); // close the session cleanly

    expectNoRuntimeErrors(errors);
  });

  test('ice-salvage frames (free play)', async ({ page }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'PT_CAP_SALVAGE',
        game_session_id: 'GS_CAP_SALVAGE',
        scene: 'field',
        freeplay: '1',
      },
      'field',
    );

    await driveAxisTo(page, 'y', 318, 8);
    await driveAxisTo(page, 'x', 80, 6);
    await driveAxisTo(page, 'y', 430, 14);
    await openNearbyPrompt(page);
    await waitForEventCount(page, 'proto_salvage_opened', 'field', 1);
    await selectPromptOption(page, 1);
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __salvageProbe?: { phase: string } | null;
          }
        ).__salvageProbe?.phase === 'tension',
      undefined,
      { timeout: 10_000 },
    );
    await shot(page, '15-salvage-tension');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __salvageProbe?: { markerInBand: boolean } | null;
          }
        ).__salvageProbe?.markerInBand === true,
      undefined,
      { timeout: 10_000 },
    );
    await press(page, 'Space');
    await waitForEventCount(page, 'proto_salvage_pull', 'field', 1);
    await shot(page, '16-salvage-catch');

    expectNoRuntimeErrors(errors);
  });

  test('Q04 field cleanup frames', async ({ page }) => {
    test.setTimeout(480_000);

    const errors = captureErrors(page);

    await page.goto('/?participant_id=PT_CAP_Q04&game_session_id=GS_CAP_Q04');
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'dock',
    );
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // Requisition + collection + terrace route to the install.
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

    const beforeField = await eventCount(page, 'scene_start', 'field');

    await driveAxisTo(page, 'x', 192, 10);
    await driveAxisTo(page, 'y', 418, 14);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'field', beforeField + 1);

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

    await waitForEventCount(page, 'proto_q04_mess_presented', 'field', 1);
    await shot(page, '17-q04-standard-mess');

    // Partial cleanup: one wrap to the disposal unit.
    await clickPhysicalObject(page, 'q04_wrap_a');
    await driveAxisTo(page, 'x', 500, 12);
    await driveAxisTo(page, 'y', 384, 12);
    await driveAxisTo(page, 'x', 384, 10);
    await clickPhysicalContainer(page, 'q04_disposal');
    await waitForEventCount(page, 'proto_q04_item_cleared', 'field', 1);
    await shot(page, '18-q04-partial-cleanup');

    // Full restoration.
    const remaining = [
      ['q04_wrap_b', 'q04_disposal'],
      ['q04_clamp_a', 'q04_tool_rack'],
      ['q04_clamp_b', 'q04_tool_rack'],
      ['q04_shim_a', 'q04_component_crate'],
      ['q04_shim_b', 'q04_component_crate'],
    ] as const;

    let cleared = 1;

    for (const [objectId, containerId] of remaining) {
      await driveAxisTo(page, 'y', 300, 12);
      await driveAxisTo(page, 'x', 590, 14);

      const probe = await physicalProbe(page);
      const object = probe?.objects.find((entry) => entry.id === objectId);

      expect(object, `${objectId} still at the site`).toBeDefined();
      // Stand near the object before lifting it (reach rule).
      await driveAxisTo(page, 'x', object!.x + 14, 16);
      await driveAxisTo(page, 'y', object!.y + 14, 16);
      await clickPhysicalObject(page, objectId);
      await driveAxisTo(page, 'x', 500, 14);
      await driveAxisTo(page, 'y', 384, 12);
      await driveAxisTo(
        page,
        'x',
        containerId === 'q04_disposal'
          ? 384
          : containerId === 'q04_tool_rack'
            ? 464
            : 544,
        10,
      );
      await clickPhysicalContainer(page, containerId);
      cleared += 1;
      await waitForEventCount(page, 'proto_q04_item_cleared', 'field', cleared);
    }

    await waitForEventCount(page, 'proto_q04_site_restored', 'field', 1);
    await shot(page, '19-q04-restored-site');

    expectNoRuntimeErrors(errors);
  });
});
