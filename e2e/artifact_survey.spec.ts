import { expect, test } from '@playwright/test';

import {
  Q16_ARTIFACTS,
  Q16_SITES,
  Q16_TRAYS,
} from '../src/measurement/q16ArtifactSurvey';
import {
  clickPhysicalContainer,
  clickPhysicalObject,
  clickPhysicalRect,
  clickPromptCard,
  driveAxisTo,
  findEvent,
  findEvents,
  getEvents,
  getLastPromptBody,
  getPromptCards,
  openNearbyPrompt,
  physicalProbe,
  press,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  eventCount,
  expectNoRuntimeErrors,
  waitForEventCount,
} from './journey';

/**
 * Physical-mechanics session (Unit 3): the independent Q16 artifact
 * survey (Ridge Annex).
 *
 * Verifies the candidate exploratory Q16 prototype end to end: fixed
 * entry state (pinned site/artifact/tray tables), brief review, physical
 * scan → dig → collect → tray placement → correction → manifest check →
 * report, its own proto_q16_* event family with no canonical context,
 * and complete isolation from the generic Survey Terrace route's proto
 * events and from every Q01-Q04 stream.
 */

type Pg = import('@playwright/test').Page;

/** Normalise into the open col-6/7 corridor, then approach a point. */
async function walkTo(page: Pg, x: number, y: number) {
  await driveAxisTo(page, 'x', 208, 14);
  await driveAxisTo(page, 'y', y, 12);
  await driveAxisTo(page, 'x', x, 12);
}

/** Click a stake and wait for its scan/dig event count to rise. */
async function actOnStake(
  page: Pg,
  siteId: string,
  eventType: string,
  expected: number,
) {
  const probe = await physicalProbe(page);
  const stake = probe?.objects.find((entry) => entry.id === `stake_${siteId}`);

  expect(stake, `stake_${siteId} missing from probe`).toBeDefined();
  await clickPhysicalRect(page, stake!, { expectChange: false });
  await waitForEventCount(page, eventType, 'artifact_survey', expected);
  // Let the timed world action's completion frame settle.
  await page.waitForTimeout(400);
}

test.describe('artifact diligence survey (Unit 3)', () => {
  test('entry state is a fixed table (frozen stimuli)', () => {
    expect(Q16_SITES).toHaveLength(6);
    expect(Q16_SITES.filter((site) => site.yields !== null)).toHaveLength(3);
    expect(
      Q16_ARTIFACTS.map((artifact) => artifact.artifact_id).sort(),
    ).toEqual(['basalt_fragment', 'ice_core_segment', 'sealed_biosample']);
    expect(Q16_TRAYS).toHaveLength(3);
  });

  test('full physical sweep: scan, dig, case, correct, verify, report', async ({
    page,
  }) => {
    test.setTimeout(480_000);

    const errors = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'PT_Q16_SWEEP',
        game_session_id: 'GS_Q16_SWEEP',
        scene: 'artifact_field',
      },
      'artifact_survey',
    );

    // Stakes are inert before Noor opens the sweep.
    await walkTo(page, 96, 224);
    const dormantProbe = await physicalProbe(page);

    expect(dormantProbe?.objects ?? []).toHaveLength(0);

    // — Noor's brief: accept, then read the notebook once.
    await walkTo(page, 256, 128);
    await openNearbyPrompt(page);
    await selectPromptOption(page, 1); // Take the survey brief
    await selectPromptOption(page, 1); // Start the sweep
    await waitForEventCount(page, 'proto_q16_accepted', 'artifact_survey', 1);

    await walkTo(page, 70, 130);
    await openNearbyPrompt(page);
    await selectPromptOption(page, 1); // Close the notebook
    await waitForEventCount(page, 'proto_q16_brief_read', 'artifact_survey', 1);

    // — Scan all six stakes (physical pointer path; timed scanner sweep).
    let scans = 0;

    for (const site of Q16_SITES) {
      await walkTo(page, site.x, site.y);
      scans += 1;
      await actOnStake(page, site.site_id, 'proto_q16_site_scanned', scans);
    }

    const scanEvents = findEvents(
      await getEvents(page),
      'proto_q16_site_scanned',
    );

    expect(
      scanEvents.filter(
        (event) => (event.metadata as { signal?: string }).signal === 'flagged',
      ),
    ).toHaveLength(3);

    // — Dig the three flagged sites and collect each specimen.
    const flagged = Q16_SITES.filter((site) => site.yields !== null);
    let digs = 0;

    for (const site of flagged) {
      await walkTo(page, site.x, site.y);
      digs += 1;
      await actOnStake(page, site.site_id, 'proto_q16_site_dug', digs);

      // The specimen lies loose beside the spoil — collect it...
      await clickPhysicalObject(page, site.yields!);
      expect((await physicalProbe(page))?.carried).toBe(site.yields);

      // ...and case it. The basalt fragment goes into the WRONG tray on
      // purpose (correctable mistake; neutral feedback either way).
      const artifact = Q16_ARTIFACTS.find(
        (entry) => entry.artifact_id === site.yields,
      )!;
      const trayId =
        artifact.artifact_id === 'basalt_fragment'
          ? 'tray_biology'
          : artifact.tray_id;

      await walkTo(page, 576, 176);
      await clickPhysicalContainer(page, trayId);
      expect((await physicalProbe(page))?.carried).toBeNull();
    }

    // — Manifest check surfaces the mistrayed basalt (correction cue).
    await walkTo(page, 576, 160);
    await openNearbyPrompt(page);

    let caseCards = await getPromptCards(page);
    const manifestCard = caseCards?.find((card) =>
      card.label.includes('manifest check'),
    );

    expect(manifestCard).toBeDefined();
    await clickPromptCard(page, manifestCard!.index);
    await waitForEventCount(
      page,
      'proto_q16_manifest_checked',
      'artifact_survey',
      1,
    );
    expect(await getLastPromptBody(page)).toContain('Basalt Fragment');
    await selectPromptOption(page, 1); // Close the case (result stage)

    // — Correction: take the basalt back out, re-case it correctly.
    await openNearbyPrompt(page);
    caseCards = await getPromptCards(page);

    const takeBack = caseCards?.find((card) =>
      card.label.includes('Basalt Fragment back out'),
    );

    expect(takeBack).toBeDefined();
    await clickPromptCard(page, takeBack!.index);
    await waitForEventCount(
      page,
      'proto_q16_artifact_restowed',
      'artifact_survey',
      1,
    );
    await clickPhysicalContainer(page, 'tray_minerals');

    // — Second manifest check comes back clean.
    await openNearbyPrompt(page);
    caseCards = await getPromptCards(page);

    const manifestAgain = caseCards?.find((card) =>
      card.label.includes('manifest check'),
    );

    await clickPromptCard(page, manifestAgain!.index);
    await waitForEventCount(
      page,
      'proto_q16_manifest_checked',
      'artifact_survey',
      2,
    );
    expect(await getLastPromptBody(page)).toContain('all three specimens');
    await selectPromptOption(page, 1); // Close the case (result stage)

    // — Report to Noor.
    await walkTo(page, 256, 128);
    await openNearbyPrompt(page);

    const noorCards = await getPromptCards(page);
    const reportCard = noorCards?.find((card) =>
      card.label.includes('Report the sweep'),
    );

    expect(reportCard).toBeDefined();
    await clickPromptCard(page, reportCard!.index);
    await waitForEventCount(page, 'proto_q16_reported', 'artifact_survey', 1);

    const events = await getEvents(page);
    const reported = findEvent(events, 'proto_q16_reported');
    const summary = reported?.metadata as {
      sites_scanned?: number;
      sites_dug?: number;
      stored_count?: number;
      corrections?: number;
      manifest_checks?: number;
      missing_at_report?: number;
      mistrayed_at_report?: number;
    };

    expect(summary.sites_scanned).toBe(6);
    expect(summary.sites_dug).toBe(3);
    expect(summary.stored_count).toBe(3);
    expect(summary.corrections).toBe(1);
    expect(summary.manifest_checks).toBe(2);
    expect(summary.missing_at_report).toBe(0);
    expect(summary.mistrayed_at_report).toBe(0);

    // — Its own family only: no generic Survey route proto events, no
    // Q01-Q04 stream events, and no canonical measurement context on any
    // proto_q16_* event.
    for (const foreign of [
      'proto_scan_performed',
      'proto_dig_performed',
      'proto_item_recovered',
      'inventory_item_sorted_correct',
      'correct_tool_selected',
      'cleanup_completed',
      'proto_q04_item_cleared',
      'side_repair_step_completed',
    ]) {
      expect(findEvent(events, foreign)).toBeUndefined();
    }

    for (const event of events) {
      if (event.event_type.startsWith('proto_q16_')) {
        expect(event.study_item_ids).toBeUndefined();
        expect(event.construct_id).toBeUndefined();
      }
    }

    // — SA-13 record: offered/entered/completed, exploratory owner.
    const validity = await page.evaluate(
      () =>
        (
          window as unknown as {
            __measurementValidity?:
              | {
                  opportunity_id: string;
                  owner: string;
                  completed: boolean;
                  validity: string;
                }[]
              | null;
          }
        ).__measurementValidity ?? [],
    );
    const record = validity.find(
      (entry) => entry.opportunity_id === 'proto_q16_artifact_survey',
    );

    expect(record).toBeDefined();
    expect(record!.owner).toContain('Q16');
    expect(record!.completed).toBe(true);
    expect(record!.validity).toBe('valid');

    expectNoRuntimeErrors(errors);
  });

  test('annex is reachable from the Survey Terrace south path', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const errors = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'PT_Q16_PATH',
        game_session_id: 'GS_Q16_PATH',
        scene: 'field',
      },
      'field',
    );

    const before = await eventCount(page, 'scene_start', 'artifact_survey');

    // Terrace spawn (320, 128) → south path door. Descend the x≈320
    // column (row 13's col-7/8 block flanks x 256), then west along the
    // open row 14 to the door column.
    await driveAxisTo(page, 'y', 300, 12);
    await driveAxisTo(page, 'x', 320, 12);
    await driveAxisTo(page, 'y', 460, 12);
    await driveAxisTo(page, 'x', 256, 12);
    await driveAxisTo(page, 'y', 470, 12);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'artifact_survey', before + 1);

    // And back again through the annex's terrace path.
    const fieldBefore = await eventCount(page, 'scene_start', 'field');

    await driveAxisTo(page, 'x', 144, 12);
    await driveAxisTo(page, 'y', 90, 14);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'field', fieldBefore + 1);

    expectNoRuntimeErrors(errors);
  });
});
