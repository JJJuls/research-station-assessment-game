import { expect, test } from '@playwright/test';

import {
  acknowledgeM24Exhaustion,
  drawM24Pull,
  ensureM24DeckOrder,
  M24_DECK_CONTENTS,
  M24_DECK_ORDERS,
  m24State,
  resetM24State,
} from '../src/measurement/m24SalvageExhaustion';
import {
  M25_LOCK_STATEMENT,
  m25State,
  pressM25Prime,
  resetM25Interlock,
  resetM25State,
} from '../src/measurement/m25PumpLock';
import type { RawEventLike } from './helpers';
import {
  dismissOpenPrompt,
  driveAxisTo,
  findEvents,
  getEvents,
  press,
  selectCardByLabel,
} from './helpers';
import { captureErrors, eventCount, expectNoRuntimeErrors } from './journey';

/**
 * Action-assessment rebuild Unit 4: the Recycler Catchment
 * electromagnet salvage (M24 controlled deck -> objective exhaustion ->
 * acknowledged window) and the pump restart interlock (M25 salient
 * mechanical lock).
 *
 * - The reward deck is fixed in content, counterbalanced in order, and
 *   cosmetic in effect (reclaim credits only).
 * - After the deck empties NO reward — jackpot included — can occur;
 *   the M24 window opens only at the explicit acknowledgement, and only
 *   subsequent identical casts are its evidence.
 * - M25's prime control works for standardised cycles, then a salient
 *   interlock makes the SAME control objectively ineffective while a
 *   different control (breaker reset) stays visible beside it.
 * - M24, M25 and M26 share no raw event, state or rig.
 */

async function tap(page: import('@playwright/test').Page, key: string) {
  await page.keyboard.down(key);
  await page.waitForTimeout(130);
  await page.keyboard.up(key);
}

async function waitForEventType(
  page: import('@playwright/test').Page,
  eventType: string,
  wantedCount: number,
  timeout = 8_000,
): Promise<boolean> {
  return page
    .waitForFunction(
      (args: { type: string; wanted: number }) =>
        (
          window as unknown as {
            researchRuntime: { getEvents: () => { event_type: string }[] };
          }
        ).researchRuntime
          .getEvents()
          .filter((event) => event.event_type === args.type).length >=
        args.wanted,
      { type: eventType, wanted: wantedCount },
      { timeout },
    )
    .then(
      () => true,
      () => false,
    );
}

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

async function salvagePhase(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __salvageProbe?: { phase: string; markerInBand: boolean } | null;
        }
      ).__salvageProbe ?? null,
  );
}

/** One full F-cast with the hook set inside the band, event-synced
 * and timeout-proof (miss resolutions and swallowed keys retried). */
async function castAndHook(
  page: import('@playwright/test').Page,
  eventType: string,
  wantedCount: number,
  options?: { missDeliberately?: boolean },
) {
  const waitProbe = (predicate: 'tension' | 'band', want: boolean) =>
    page
      .waitForFunction(
        (args: { predicate: string; want: boolean }) => {
          const probe = (
            window as unknown as {
              __salvageProbe?: {
                phase: string;
                markerInBand: boolean;
              } | null;
            }
          ).__salvageProbe;

          return args.predicate === 'tension'
            ? (probe?.phase === 'tension') === args.want
            : probe?.markerInBand === args.want;
        },
        { predicate, want },
        { timeout: 6_000 },
      )
      .then(
        () => true,
        () => false,
      );

  for (let attempt = 0; attempt < 6; attempt++) {
    const phase = await salvagePhase(page);

    if (phase?.phase === 'idle' || phase === null) {
      await tap(page, 'f');
    }

    if (!(await waitProbe('tension', true))) {
      continue;
    }

    for (let hook = 0; hook < 4; hook++) {
      const bandReady = await waitProbe(
        'band',
        options?.missDeliberately !== true,
      );

      if (!bandReady) {
        break;
      }

      await press(page, 'Space');

      if (await waitForEventType(page, eventType, wantedCount, 6_000)) {
        return;
      }

      const after = await salvagePhase(page);

      if (after?.phase !== 'tension') {
        break;
      }
    }

    if (await waitForEventType(page, eventType, wantedCount, 3_000)) {
      return;
    }
  }

  throw new Error(`cast never produced ${eventType} #${wantedCount}`);
}

test.describe('magnet salvage and IP mechanics (Unit 4)', () => {
  test('module logic: deck determinism, exhaustion finality, interlock gates', () => {
    resetM24State();

    // Orders are true permutations of the fixed deck.
    for (const order of M24_DECK_ORDERS) {
      expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    }

    // Draws follow the assigned order exactly; credits accumulate.
    ensureM24DeckOrder(1);

    const drawn: string[] = [];

    for (let i = 0; i < 6; i++) {
      const pull = drawM24Pull();

      expect(pull).not.toBeNull();
      drawn.push(pull!.pull_id);
    }

    expect(drawn).toEqual(
      M24_DECK_ORDERS[1].map((index) => M24_DECK_CONTENTS[index].pull_id),
    );
    expect(m24State.credits).toBe(115);

    // Finality: once exhausted NOTHING can come up again — ever.
    for (let i = 0; i < 5; i++) {
      expect(drawM24Pull()).toBeNull();
    }

    // Comprehension gate: acknowledgement needs the readout shown.
    expect(acknowledgeM24Exhaustion()).toBe(false);
    m24State.exhaustion_shown = true;
    expect(acknowledgeM24Exhaustion()).toBe(true);
    resetM24State();

    // M25: three useful cycles, then the lock; identical presses are
    // recorded but ineffective; reset is the different strategy.
    resetM25State();

    for (let cycle = 1; cycle <= 3; cycle++) {
      const result = pressM25Prime();

      expect(result.kind).toBe('cycle');

      if (result.kind === 'cycle') {
        expect(result.cycleNumber).toBe(cycle);
        expect(result.lockEngaged).toBe(cycle === 3);
      }
    }

    for (let n = 1; n <= 2; n++) {
      const locked = pressM25Prime();

      expect(locked.kind).toBe('locked');

      if (locked.kind === 'locked') {
        expect(locked.postLockPresses).toBe(n);
      }
    }

    expect(m25State.useful_cycles).toBe(3);
    expect(resetM25Interlock()).toBe(true);
    expect(m25State.running).toBe(true);
    expect(pressM25Prime().kind).toBe('running');
    resetM25State();
  });

  test('recycler rig: controlled deck, objective exhaustion, M24 window', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await page.goto(
      '/?participant_id=PT_M24_RIG&game_session_id=GS_M24_RIG&scene=coolant_yard',
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'coolant_yard',
      undefined,
      { timeout: 60_000 },
    );
    await page.waitForTimeout(2200);

    // West lane down to the rig (clear of the row-5 rocks).
    await driveAxisTo(page, 'x', 64, 8);
    await driveAxisTo(page, 'y', 480, 10);
    await driveAxisTo(page, 'x', 96, 8);

    // — Useful phase: six hits draw the whole counterbalanced deck.
    for (let pull = 1; pull <= 6; pull++) {
      await castAndHook(page, 'proto_m24_pull', pull);
      await dismissOpenPrompt(page);
    }

    let events: RawEventLike[] = await getEvents(page);
    const pulls = findEvents(events, 'proto_m24_pull');

    expect(pulls).toHaveLength(6);

    const deckOrder = (pulls[0].metadata as { deck_order?: number }).deck_order;

    expect(deckOrder).toBeGreaterThanOrEqual(0);
    expect(
      pulls.map((event) => (event.metadata as { pull_id?: string }).pull_id),
    ).toEqual(
      M24_DECK_ORDERS[deckOrder!].map(
        (index) => M24_DECK_CONTENTS[index].pull_id,
      ),
    );
    expect(findEvents(events, 'proto_m24_exhaustion_shown')).toHaveLength(1);

    // — A cast between readout and acknowledgement is pre-ack context.
    await castAndHook(page, 'proto_m24_pre_ack_cast', 1);
    await dismissOpenPrompt(page);

    // — The participant's own verification sweep (C at the rig).
    let verificationLanded = false;

    for (let attempt = 0; attempt < 3 && !verificationLanded; attempt++) {
      await tap(page, 'c');
      verificationLanded = await waitForEventType(
        page,
        'proto_m24_verification_scan',
        1,
        4_500,
      );
    }

    expect(verificationLanded).toBe(true);

    // — Explicit acknowledgement at the rig (comprehension evidence).
    await selectCardByLabel(page, 'Acknowledge the empty catchment');
    expect(await waitForEventType(page, 'proto_m24_acknowledged', 1)).toBe(
      true,
    );

    // — Post-acknowledgement identical casts: the M24 record; nothing
    //   can come up (hit and miss both come up bare).
    await castAndHook(page, 'proto_m24_post_ack_cast', 1);
    await dismissOpenPrompt(page);
    await castAndHook(page, 'proto_m24_post_ack_cast', 2, {
      missDeliberately: true,
    });
    await dismissOpenPrompt(page);

    events = await getEvents(page);
    expect(findEvents(events, 'proto_m24_pull')).toHaveLength(6);

    const ackIndex = events.findIndex(
      (event) => event.event_type === 'proto_m24_acknowledged',
    );

    for (const [index, event] of events.entries()) {
      if (event.event_type === 'proto_m24_pull') {
        expect(index).toBeLessThan(ackIndex);
      }
    }

    // — The neutral alternative: walking clear of the rig records once
    //   (>150 px from the rig head).
    await driveAxisTo(page, 'y', 264, 10);

    const altLanded = await waitForEventType(
      page,
      'proto_m24_alternative_taken',
      1,
      6_000,
    );
    const altDebug = JSON.stringify(
      await page.evaluate(() => ({
        player: (
          window as unknown as {
            __playerProbe?: { x: number; y: number } | null;
          }
        ).__playerProbe,
        m24: (
          window as unknown as {
            __measurementValidity?: { opportunity_id: string }[] | null;
          }
        ).__measurementValidity?.find(
          (record) => record.opportunity_id === 'proto_m24_recycler_catchment',
        ),
      })),
    );

    expect(altLanded, `alternative never fired: ${altDebug}`).toBe(true);

    // — Leaving the yard closes the window and completes the record.
    //   (Approach the terrace door from x=80 so the supply crate never
    //   becomes the nearest target.)
    const beforeField = await eventCount(page, 'scene_start', 'field');

    await driveAxisTo(page, 'x', 64, 8);
    await driveAxisTo(page, 'y', 96, 12);
    await driveAxisTo(page, 'x', 80, 8);
    await enterRoomBySpace(page, 'field', beforeField + 1);

    events = await getEvents(page);

    const closed = findEvents(events, 'proto_m24_closed');

    expect(closed).toHaveLength(1);
    expect(
      (closed[0].metadata as { post_ack_casts?: number }).post_ack_casts,
    ).toBe(2);

    // Independence: the ice-bore free-play deck never fired, and no
    // M25/M26 event rode along.
    for (const type of events.map((event) => String(event.event_type))) {
      expect(type.startsWith('proto_salvage_')).toBe(false);
      expect(type.startsWith('proto_m25_')).toBe(false);
      expect(type.startsWith('proto_m26_search')).toBe(false);
    }

    const validity = await page.evaluate(
      () =>
        (
          window as unknown as {
            __measurementValidity?:
              | {
                  opportunity_id: string;
                  completed: boolean;
                  validity: string;
                  counterbalance: string | null;
                }[]
              | null;
          }
        ).__measurementValidity ?? [],
    );
    const m24Record = validity.find(
      (record) => record.opportunity_id === 'proto_m24_recycler_catchment',
    );

    expect(m24Record?.completed).toBe(true);
    expect(m24Record?.validity).toBe('valid');
    expect(m24Record?.counterbalance).toBe(`deck_order_${deckOrder}`);

    expectNoRuntimeErrors(errors);
  });

  test('pump interlock: standardised lock, ineffective identical primes, visible reset', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await page.goto(
      '/?participant_id=PT_M25_LOCK&game_session_id=GS_M25_LOCK&scene=pump_house',
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'pump_house',
      undefined,
      { timeout: 60_000 },
    );
    await page.waitForTimeout(2200);

    // Interlock console refuses before the relief-valve work is done.
    await driveAxisTo(page, 'x', 320, 8);
    await driveAxisTo(page, 'y', 138, 6);

    let refusal: string | null = null;

    for (let attempt = 0; attempt < 5 && refusal === null; attempt++) {
      await driveAxisTo(page, 'x', 320, 6);
      await driveAxisTo(page, 'y', 148, 6);
      await press(page, 'Space');
      await page.waitForTimeout(600);
      refusal = await page.evaluate(
        () =>
          (window as unknown as { __lastRoomFeedbackText?: string | null })
            .__lastRoomFeedbackText ?? null,
      );
    }

    const positionNote = JSON.stringify(
      await page.evaluate(
        () =>
          (
            window as unknown as {
              __playerProbe?: { x: number; y: number } | null;
            }
          ).__playerProbe,
      ),
    );

    expect(refusal, `no refusal feedback at ${positionNote}`).toContain(
      'waits on the relief-valve work',
    );

    // — Run the coolant-line chain (work order -> manifold via cards ->
    //   diagnosis -> setback -> seal) to unlock the restart.
    await driveAxisTo(page, 'x', 160, 10);
    await driveAxisTo(page, 'y', 128, 10);
    await selectCardByLabel(page, 'Log the work order');
    expect(await waitForEventType(page, 'proto_work_order_read', 1)).toBe(true);

    await driveAxisTo(page, 'x', 416, 8);
    await driveAxisTo(page, 'y', 224, 8);

    const seat = async (
      typeLabel: string,
      slotLabel: string,
      wanted: number,
    ) => {
      await selectCardByLabel(page, 'Seat a section');
      await selectCardByLabel(page, typeLabel);
      await selectCardByLabel(page, slotLabel);
      expect(
        await waitForEventType(page, 'proto_m13_piece_placed', wanted),
      ).toBe(true);
    };
    const rotate = async (slotLabel: string, wanted: number) => {
      await selectCardByLabel(page, 'Rotate a section');
      await selectCardByLabel(page, slotLabel);
      expect(
        await waitForEventType(page, 'proto_m13_piece_rotated', wanted),
      ).toBe(true);
    };

    await seat('Elbow section', 'Mount A2.', 1);
    await rotate('Mount A2.', 1);
    await rotate('Mount A2.', 2);
    await rotate('Mount A2.', 3);
    await seat('Elbow section', 'Mount A1.', 2);
    await rotate('Mount A1.', 4);
    await seat('Elbow section', 'Mount C1.', 3);
    await rotate('Mount C1.', 5);
    await rotate('Mount C1.', 6);
    await seat('Elbow section', 'Mount C2.', 4);
    await seat('Isolation valve', 'Mount B1.', 5);
    await selectCardByLabel(page, 'Open the test flow');
    expect(await waitForEventType(page, 'proto_m13_completed', 1)).toBe(true);

    await driveAxisTo(page, 'x', 512, 8);
    await driveAxisTo(page, 'y', 140, 8);

    await selectCardByLabel(page, 'Log the diagnosis');
    await selectCardByLabel(page, 'Relief valve leaking');
    expect(
      await waitForEventType(page, 'proto_m18_diagnosis_submitted', 1),
    ).toBe(true);

    await driveAxisTo(page, 'x', 576, 8);
    await driveAxisTo(page, 'y', 288, 8);
    await selectCardByLabel(page, 'Fit the shop-stock seal');
    expect(await waitForEventType(page, 'proto_m22_setback_shown', 1)).toBe(
      true,
    );

    const beforeYard = await eventCount(page, 'scene_start', 'coolant_yard');

    await driveAxisTo(page, 'y', 400, 10);
    await driveAxisTo(page, 'x', 560, 10);
    await enterRoomBySpace(page, 'coolant_yard', beforeYard + 1);
    await page.waitForTimeout(1200);
    await driveAxisTo(page, 'x', 160, 10);
    await driveAxisTo(page, 'y', 176, 10);
    await selectCardByLabel(page, 'Take a replacement valve seal');
    expect(await waitForEventType(page, 'proto_m22_spare_seal_taken', 1)).toBe(
      true,
    );

    const beforePump = await eventCount(page, 'scene_start', 'pump_house');

    await driveAxisTo(page, 'y', 96, 10);
    await driveAxisTo(page, 'x', 560, 10);
    await enterRoomBySpace(page, 'pump_house', beforePump + 1);
    await page.waitForTimeout(1200);
    await driveAxisTo(page, 'x', 576, 8);
    await driveAxisTo(page, 'y', 288, 8);
    await selectCardByLabel(page, 'Seat the fresh seal');
    expect(await waitForEventType(page, 'proto_m22_recovered', 1)).toBe(true);

    // — M25: three useful prime cycles, the salient lock…
    await driveAxisTo(page, 'x', 320, 8);
    await driveAxisTo(page, 'y', 138, 6);

    for (const cycle of [1, 2, 3]) {
      await selectCardByLabel(page, 'Run a prime cycle');
      expect(await waitForEventType(page, 'proto_m25_prime_cycle', cycle)).toBe(
        true,
      );
    }

    let events: RawEventLike[] = await getEvents(page);

    expect(findEvents(events, 'proto_m25_lock_engaged')).toHaveLength(1);

    // …two unchanged identical primes: recorded, ineffective, answered
    // with the IDENTICAL lock statement each time…
    for (const n of [1, 2]) {
      await selectCardByLabel(page, 'Run a prime cycle');
      expect(await waitForEventType(page, 'proto_m25_post_lock_prime', n)).toBe(
        true,
      );
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { __lastRoomFeedbackText?: string | null })
              .__lastRoomFeedbackText,
        ),
      ).toBe(M25_LOCK_STATEMENT);
    }

    // …and the visible different strategy: the breaker reset.
    await selectCardByLabel(page, 'Reset the interlock breaker');
    expect(await waitForEventType(page, 'proto_m25_reset', 1)).toBe(true);
    events = await getEvents(page);
    expect(findEvents(events, 'proto_m25_pump_running')).toHaveLength(1);

    // No extra useful cycle fired post-lock; counts stay exact.
    expect(findEvents(events, 'proto_m25_prime_cycle')).toHaveLength(3);
    expect(findEvents(events, 'proto_m25_post_lock_prime')).toHaveLength(2);

    // Independence: no M24 events in this run.
    for (const type of events.map((event) => String(event.event_type))) {
      expect(type.startsWith('proto_m24_')).toBe(false);
    }

    const validity = await page.evaluate(
      () =>
        (
          window as unknown as {
            __measurementValidity?:
              | {
                  opportunity_id: string;
                  completed: boolean;
                  validity: string;
                }[]
              | null;
          }
        ).__measurementValidity ?? [],
    );
    const m25Record = validity.find(
      (record) => record.opportunity_id === 'proto_m25_pump_interlock',
    );

    expect(m25Record?.completed).toBe(true);
    expect(m25Record?.validity).toBe('valid');

    expectNoRuntimeErrors(errors);
  });
});
