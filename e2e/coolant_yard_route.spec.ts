import { expect, test } from '@playwright/test';

import {
  applyM23Act,
  M23_PROGRESS_TARGET,
  m23State,
  resetM23State,
} from '../src/measurement/m23Excavation';
import {
  acknowledgeM26Depletion,
  m26State,
  resetM26State,
} from '../src/measurement/m26DepletedField';
import type { RawEventLike } from './helpers';
import { driveAxisTo, findEvents, getEvents, press } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  dockToHubJourney,
  eventCount,
  expectNoRuntimeErrors,
  waitForEventCount,
} from './journey';

/**
 * Action-assessment rebuild Unit 2: the Coolant Yard field
 * investigation — free scanner use (C) inside the staked survey sector,
 * deterministic buried deposits and dig yields (D), the M23
 * frozen-coupling extraction (hard but attainable by persistence
 * alone), and the M26 Reclaimed Sector window (certificate →
 * acknowledgement → post-ack searches only).
 */

async function inventoryItems(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const probe = (
      window as unknown as {
        __inventoryProbe?: { slots: (string | null)[] } | null;
      }
    ).__inventoryProbe;

    return (probe?.slots ?? []).filter((slot) => slot !== null);
  });
}

async function lastFeedback(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __lastRoomFeedbackText?: string | null })
        .__lastRoomFeedbackText ?? null,
  );
}

async function tap(page: import('@playwright/test').Page, key: string) {
  await page.keyboard.down(key);
  await page.waitForTimeout(130);
  await page.keyboard.up(key);
}

/**
 * Door transition with a swallowed-press retry: SPACE at an in-range
 * door, re-pressed if the scene_start never lands (SwiftShader input
 * loss; completeDockTutorial precedent).
 */
async function enterRoomBySpace(
  page: import('@playwright/test').Page,
  sceneName: string,
  wantedCount: number,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await press(page, 'Space');

    const landed = await page
      .waitForFunction(
        (args: { scene: string; wanted: number }) =>
          (
            window as unknown as {
              researchRuntime: {
                getEvents: () => { event_type: string; scene?: string }[];
              };
            }
          ).researchRuntime
            .getEvents()
            .filter(
              (event) =>
                event.event_type === 'scene_start' &&
                event.scene === args.scene,
            ).length >= args.wanted,
        { scene: sceneName, wanted: wantedCount },
        { timeout: 6_000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (landed) {
      return;
    }
  }

  throw new Error(`door press never reached scene ${sceneName}`);
}

/**
 * Event-synced action tap with a swallowed-press retry (SwiftShader
 * input loss; completeDockTutorial precedent): taps the action key and
 * waits for the expected event count; a lost press is re-tapped instead
 * of failing the run. Each successful tap adds exactly one event, so
 * the count guard prevents double-fires.
 */
async function tapForEvent(
  page: import('@playwright/test').Page,
  key: string,
  eventType: string,
  wantedCount: number,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await tap(page, key);

    const landed = await page
      .waitForFunction(
        (args: { type: string; wanted: number }) =>
          (
            window as unknown as {
              researchRuntime: {
                getEvents: () => { event_type: string }[];
              };
            }
          ).researchRuntime
            .getEvents()
            .filter((event) => event.event_type === args.type).length >=
          args.wanted,
        { type: eventType, wanted: wantedCount },
        { timeout: 4_500 },
      )
      .then(
        () => true,
        () => false,
      );

    if (landed) {
      return;
    }
  }

  throw new Error(`action key ${key} never produced ${eventType}`);
}

test.describe('coolant yard route (Unit 2)', () => {
  test('module logic: M23 attainable, strategies gated; M26 comprehension gate', () => {
    resetM23State();

    // Pry before the threshold is recorded but ineffective.
    expect(applyM23Act('pry').effective).toBe(false);
    // Heat without a canister in hand is ineffective.
    expect(applyM23Act('heat', { heatAvailable: false }).effective).toBe(false);

    // Digging alone always completes the extraction (attainability).
    let digs = 0;

    while (!m23State.completed && digs < 20) {
      expect(applyM23Act('dig').effective).toBe(true);
      digs += 1;
    }

    expect(m23State.completed).toBe(true);
    expect(m23State.progress).toBe(M23_PROGRESS_TARGET);
    expect(digs).toBe(10);
    // The two ineffective probes stayed recorded (contrast facts).
    expect(m23State.acts.filter((act) => !act.effective)).toHaveLength(2);

    resetM23State();

    // Strategy mix: dig -> heat -> digs -> pry x2 completes faster.
    applyM23Act('dig');
    expect(applyM23Act('heat', { heatAvailable: true }).effective).toBe(true);
    applyM23Act('dig');
    applyM23Act('dig');
    expect(m23State.progress).toBe(55);
    expect(applyM23Act('pry').effective).toBe(true);
    expect(applyM23Act('pry').effective).toBe(true);
    expect(applyM23Act('pry').effective).toBe(true);
    expect(m23State.completed).toBe(true);
    resetM23State();

    // M26: acknowledgement is refused until the certificate was shown.
    resetM26State();
    expect(acknowledgeM26Depletion()).toBe(false);
    m26State.certificate_shown = true;
    expect(acknowledgeM26Depletion()).toBe(true);
    resetM26State();
  });

  test('work order, free scan, deterministic dig, M23 and M26 windows', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await page.goto(
      '/?participant_id=PT_COOLANT_YARD&game_session_id=GS_COOLANT_YARD&route=legacy',
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'dock',
    );
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // — Vale's requisition + the three-tool collect (scanner/spade/case).
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

    expect(await inventoryItems(page)).toContain('field_scanner');
    expect(await inventoryItems(page)).toContain('excavation_spade');

    // — Hub -> Survey Terrace -> east gate -> Coolant Yard.
    const beforeField = await eventCount(page, 'scene_start', 'field');

    await driveAxisTo(page, 'x', 192, 10);
    await driveAxisTo(page, 'y', 418, 14);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'field', beforeField + 1);
    // Scene-entry settle (verification report §15 diagnostic): the first
    // position-synced drive after a transition otherwise misreads entry
    // jank as a wall clamp.
    await page.waitForTimeout(1200);

    const beforeYard = await eventCount(page, 'scene_start', 'coolant_yard');

    await driveAxisTo(page, 'y', 320, 10);
    await driveAxisTo(page, 'x', 640, 10);
    await enterRoomBySpace(page, 'coolant_yard', beforeYard + 1);
    await page.waitForTimeout(1200);

    // — Up into the Pump House; log the work order.
    const beforePump = await eventCount(page, 'scene_start', 'pump_house');

    await driveAxisTo(page, 'x', 560, 10);
    await enterRoomBySpace(page, 'pump_house', beforePump + 1);
    await page.waitForTimeout(1200);

    await driveAxisTo(page, 'x', 160, 10);
    await driveAxisTo(page, 'y', 128, 10);
    await press(page, 'Space');
    await press(page, '1');

    let events: RawEventLike[] = await getEvents(page);

    expect(findEvents(events, 'proto_work_order_read')).toHaveLength(1);

    // — Back down to the yard.
    await driveAxisTo(page, 'y', 400, 12);
    await driveAxisTo(page, 'x', 560, 10);
    await enterRoomBySpace(page, 'coolant_yard', beforeYard + 2);
    await page.waitForTimeout(1200);

    // — Free scan #1 at the sector's west edge: weak return only
    //   (nearest deposit ~101px away — outside the actionable radius).
    await driveAxisTo(page, 'y', 320, 8);
    await driveAxisTo(page, 'x', 64, 8);
    await tapForEvent(page, 'c', 'proto_yard_scan', 1);
    expect(await lastFeedback(page)).toContain('Faint return');

    // — Free scan #2 over the empty pocket: actionable return stakes it…
    await driveAxisTo(page, 'x', 160, 8);
    await tapForEvent(page, 'c', 'proto_yard_scan', 2);
    expect(await lastFeedback(page)).toContain('staked for digging');
    events = await getEvents(page);
    expect(findEvents(events, 'proto_yard_deposit_flagged')).toHaveLength(1);

    // …and the dig honestly reports the controlled deck's empty result.
    await tapForEvent(page, 'd', 'proto_yard_dig', 1);
    await page.waitForTimeout(400);
    expect(await lastFeedback(page)).toContain('empty');

    // — Free scan #3 further north stakes the pipe-segment deposit,
    //   and the dig recovers it as a real inventory object.
    await driveAxisTo(page, 'y', 224, 8);
    await tapForEvent(page, 'c', 'proto_yard_scan', 3);
    await tapForEvent(page, 'd', 'proto_yard_dig', 2);
    await page.waitForTimeout(400);
    expect(await inventoryItems(page)).toContain('pipe_segment');
    events = await getEvents(page);

    const digEvents = findEvents(events, 'proto_yard_dig');

    expect(digEvents).toHaveLength(2);
    expect(
      (digEvents[0].metadata as { yield_item_id?: string | null })
        .yield_item_id,
    ).toBeNull();
    expect(
      (digEvents[1].metadata as { yield_item_id?: string }).yield_item_id,
    ).toBe('pipe_segment');

    // — Into the Reclaimed Sector: a pre-certificate scan is secondary.
    //   (North-south legs run in column x=544 — the only fully clear
    //   corridor past the row-8 and row-13 rock outcrops.)
    await driveAxisTo(page, 'y', 320, 8);
    await driveAxisTo(page, 'x', 544, 8);
    await driveAxisTo(page, 'y', 176, 8);
    await driveAxisTo(page, 'x', 496, 8);
    await tapForEvent(page, 'c', 'proto_m26_pre_ack_scan', 1);
    events = await getEvents(page);
    expect(findEvents(events, 'proto_m26_pre_ack_scan')).toHaveLength(1);
    expect(findEvents(events, 'proto_m26_search_scan')).toHaveLength(0);

    // — The Reclamation Post: certificate, then explicit acknowledgement.
    await driveAxisTo(page, 'x', 456, 8);
    await press(page, 'Space');
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __lastPromptBody?: string | null })
            .__lastPromptBody ?? '',
      ),
    ).toContain('RECLAIMED SECTOR');
    await press(page, '1');
    events = await getEvents(page);
    expect(findEvents(events, 'proto_m26_certificate_shown')).toHaveLength(1);
    expect(findEvents(events, 'proto_m26_acknowledged')).toHaveLength(1);

    // — Post-acknowledgement searches inside the bounds are the M26
    //   record; they stay separate from the survey-sector telemetry.
    await driveAxisTo(page, 'x', 496, 8);
    await tapForEvent(page, 'c', 'proto_m26_search_scan', 1);
    await tapForEvent(page, 'd', 'proto_m26_search_dig', 1);
    events = await getEvents(page);
    expect(findEvents(events, 'proto_m26_search_scan')).toHaveLength(1);
    expect(findEvents(events, 'proto_m26_search_dig')).toHaveLength(1);

    // — The frozen housing: persistence alone frees the coupling
    //   (10 effective spade acts), with visible progress throughout.
    //   South through the clear x=544 corridor, then west along row 15.
    await driveAxisTo(page, 'x', 544, 8);
    await driveAxisTo(page, 'y', 480, 10);
    await driveAxisTo(page, 'x', 384, 8);

    // Swallow-proof loop: 10 effective digs complete the extraction;
    // extra taps only fire if an earlier one was lost mid-action.
    for (let act = 0; act < 14; act++) {
      await tap(page, 'd');
      await page.waitForTimeout(1650);

      const done = await page.evaluate(() =>
        (
          window as unknown as {
            researchRuntime: {
              getEvents: () => { event_type: string }[];
            };
          }
        ).researchRuntime
          .getEvents()
          .some((event) => event.event_type === 'proto_m23_completed'),
      );

      if (done) {
        break;
      }
    }

    events = await getEvents(page);

    const m23Acts = findEvents(events, 'proto_m23_act');

    expect(m23Acts.length).toBeGreaterThanOrEqual(10);
    expect(findEvents(events, 'proto_m23_completed')).toHaveLength(1);
    expect(findEvents(events, 'proto_m23_coupling_taken')).toHaveLength(1);
    expect(await inventoryItems(page)).toContain('coolant_coupling');

    // — Item-locality: M23/M26/yard families carry no canonical context,
    //   and no raw event type appears in two families.
    for (const event of [
      ...findEvents(events, 'proto_yard_scan'),
      ...findEvents(events, 'proto_yard_dig'),
      ...m23Acts,
      ...findEvents(events, 'proto_m26_search_scan'),
      ...findEvents(events, 'proto_m26_search_dig'),
    ]) {
      expect(event.study_item_ids).toBeUndefined();
      expect(event.construct_id).toBeUndefined();
    }

    // M26 search events never fired from survey-sector acts: exactly one
    // of each, both after the acknowledgement.
    const ackIndex = events.findIndex(
      (event) => event.event_type === 'proto_m26_acknowledged',
    );
    const searchIndices = events
      .map((event, index) => ({ event, index }))
      .filter(
        ({ event }) =>
          event.event_type === 'proto_m26_search_scan' ||
          event.event_type === 'proto_m26_search_dig',
      )
      .map(({ index }) => index);

    for (const index of searchIndices) {
      expect(index).toBeGreaterThan(ackIndex);
    }

    // — Validity register: M23 completed; M26 entered and pending close.
    const validity = await page.evaluate(
      () =>
        (
          window as unknown as {
            __measurementValidity?:
              | {
                  opportunity_id: string;
                  completed: boolean;
                  entered: boolean;
                  validity: string;
                }[]
              | null;
          }
        ).__measurementValidity ?? [],
    );
    const m23Record = validity.find(
      (record) => record.opportunity_id === 'proto_m23_frozen_coupling',
    );
    const m26Record = validity.find(
      (record) => record.opportunity_id === 'proto_m26_reclaimed_sector',
    );

    expect(m23Record?.completed).toBe(true);
    expect(m23Record?.validity).toBe('valid');
    expect(m26Record?.entered).toBe(true);

    expectNoRuntimeErrors(errors);
  });
});
