import { expect, test } from '@playwright/test';

import {
  m13State,
  placeM13Piece,
  resetM13State,
  rotateM13Piece,
  submitM13Flow,
} from '../src/measurement/m13PipePuzzle';
import {
  M18_OPTION_ORDERS,
  resetM18State,
  submitM18Diagnosis,
} from '../src/measurement/m18Diagnosis';
import {
  m22State,
  markM22FixAttempted,
  markM22SetbackShown,
  markM22SpareSealFetched,
  resetM22State,
  seatM22Seal,
} from '../src/measurement/m22Setback';
import type { RawEventLike } from './helpers';
import {
  clickPhysicalContainer,
  dragPhysicalObjectToContainer,
  driveAxisTo,
  findEvents,
  getEvents,
  getPromptCards,
  physicalProbe,
  press,
} from './helpers';
import { captureErrors, eventCount, expectNoRuntimeErrors } from './journey';

/**
 * Action-assessment rebuild Unit 3: the Pump House manifold puzzle
 * (M13), pressure diagnosis (M18) and standardised setback (M22).
 *
 * - M13 is direct manipulation with a full keyboard-card equivalent;
 *   submission validates real connectivity and the puzzle can never
 *   auto-complete.
 * - M18 presents one standardised fault after (and independent of) the
 *   sealed test flow; evidence checks and the single diagnosis are its
 *   only acts, in counterbalanced option order.
 * - M22's setback is identical for everyone and explained as external;
 *   the recovery route through the yard supply crate stays open.
 * - The three windows share no raw event and open strictly in sequence.
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

/**
 * Presses a key sequence and waits for the expected event count, with
 * the documented swallowed-press retry (the count guard makes retries
 * side-effect-free: once the event landed no further keys are sent; a
 * surplus SPACE against an open prompt is inert by design).
 */
async function pressForEvent(
  page: import('@playwright/test').Page,
  keys: string[],
  eventType: string,
  wantedCount: number,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const keyName of keys) {
      await press(page, keyName);
    }

    if (await waitForEventType(page, eventType, wantedCount, 5_000)) {
      return;
    }
  }

  throw new Error(`keys [${keys.join(',')}] never produced ${eventType}`);
}

/** Click-rotate a seated piece (slot container rect), event-synced
 * with a swallowed-click retry (count-guarded, so no double turns). */
async function rotateSlotByClick(
  page: import('@playwright/test').Page,
  slot: string,
  wantedRotations: number,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await clickPhysicalContainer(page, slot, { expectChange: false });

    if (
      await waitForEventType(
        page,
        'proto_m13_piece_rotated',
        wantedRotations,
        4_000,
      )
    ) {
      return;
    }
  }

  throw new Error(`rotate click on ${slot} never landed`);
}

test.describe('pipe puzzle, diagnosis and setback (Unit 3)', () => {
  test('module logic: connectivity validation, one-shot diagnosis, setback gates', () => {
    resetM13State();

    // The known detour solution validates (broken centre forces it).
    expect(placeM13Piece('A2', 'el1')).toBe(true);
    rotateM13Piece('A2');
    rotateM13Piece('A2');
    rotateM13Piece('A2'); // 270: [W,N]
    placeM13Piece('A1', 'el2');
    rotateM13Piece('A1'); // 90: [E,S]
    placeM13Piece('B1', 'va1'); // 0: [E,W]
    placeM13Piece('C1', 'el3');
    rotateM13Piece('C1');
    rotateM13Piece('C1'); // 180: [S,W]
    placeM13Piece('C2', 'el4'); // 0: [N,E]

    const valid = submitM13Flow();

    expect(valid.valid).toBe(true);
    expect(valid.reason).toBe('valid');
    expect(m13State.completed).toBe(true);
    // Completion locks the trench: no further mutation is possible.
    expect(placeM13Piece('A3', 'st1')).toBe(false);
    expect(rotateM13Piece('A1')).toBeNull();

    // A sealed run without the valve is rejected as valve_missing.
    resetM13State();
    placeM13Piece('A2', 'el1');
    rotateM13Piece('A2');
    rotateM13Piece('A2');
    rotateM13Piece('A2');
    placeM13Piece('A1', 'el2');
    rotateM13Piece('A1');
    placeM13Piece('B1', 'st1');
    placeM13Piece('C1', 'el3');
    rotateM13Piece('C1');
    rotateM13Piece('C1');
    placeM13Piece('C2', 'el4');
    expect(submitM13Flow().reason).toBe('valve_missing');

    // A tee with an unmated branch is rejected as open_branch.
    resetM13State();
    placeM13Piece('A2', 'el1');
    rotateM13Piece('A2');
    rotateM13Piece('A2');
    rotateM13Piece('A2');
    placeM13Piece('A1', 'el2');
    rotateM13Piece('A1');
    placeM13Piece('B1', 'va1');
    placeM13Piece('C1', 'te1');
    rotateM13Piece('C1');
    rotateM13Piece('C1'); // 180: [E,S,W] — E points off-grid
    placeM13Piece('C2', 'el4');
    expect(submitM13Flow().reason).toBe('open_branch');

    // The fractured centre mount refuses every piece.
    resetM13State();
    expect(placeM13Piece('B2', 'st1')).toBe(false);
    resetM13State();

    // M18: the diagnosis is one-shot; orders are true permutations.
    resetM18State();
    expect(submitM18Diagnosis('relief_valve_leak')?.correct).toBe(true);
    expect(submitM18Diagnosis('pump_impeller')).toBeNull();
    for (const order of M18_OPTION_ORDERS) {
      expect([...order].sort()).toEqual([0, 1, 2, 3]);
    }
    resetM18State();

    // M22: seating is impossible before the setback + fetch sequence.
    resetM22State();
    expect(seatM22Seal()).toBe(false);
    markM22FixAttempted();
    markM22SetbackShown();
    expect(seatM22Seal()).toBe(false);
    markM22SpareSealFetched();
    expect(seatM22Seal()).toBe(true);
    expect(m22State.closed).toBe(true);
    resetM22State();
  });

  test('manifold rebuild, diagnosis and seal setback run as separate windows', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await page.goto(
      '/?participant_id=PT_PIPE_M13&game_session_id=GS_PIPE_M13&scene=pump_house',
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'pump_house',
      undefined,
      { timeout: 60_000 },
    );
    await page.waitForTimeout(2200);

    // — Work order at the pressure console.
    await driveAxisTo(page, 'x', 160, 10);
    await driveAxisTo(page, 'y', 128, 10);
    await pressForEvent(page, ['Space', '1'], 'proto_work_order_read', 1);

    // — Pointer path: drag the first elbow into A2, rotate it to [W,N].
    await driveAxisTo(page, 'x', 272, 8);
    await driveAxisTo(page, 'y', 224, 8);

    const benchBefore = (await physicalProbe(page))?.objects.length ?? 0;

    await dragPhysicalObjectToContainer(page, 'el1', 'A2');
    expect(await waitForEventType(page, 'proto_m13_piece_placed', 1)).toBe(
      true,
    );
    expect((await physicalProbe(page))?.objects.length ?? 0).toBe(
      benchBefore - 1,
    );
    await rotateSlotByClick(page, 'A2', 1);
    await rotateSlotByClick(page, 'A2', 2);
    await rotateSlotByClick(page, 'A2', 3);

    // — Keyboard-card path for the rest (full equivalence, no pointer).
    //   Trench console options: 1 test flow, 2 seat, 3 rotate, 4 return.
    await driveAxisTo(page, 'x', 416, 8);
    await driveAxisTo(page, 'y', 224, 8);

    const seatViaCards = (
      pieceOption: number,
      slotOption: number,
      wantedPlacements: number,
    ) =>
      pressForEvent(
        page,
        ['Space', '2', `${pieceOption}`, `${slotOption}`],
        'proto_m13_piece_placed',
        wantedPlacements,
      );

    // el2 -> A1 (pieces [st1,st2,el2,...] => 3; slots [A1,...] => 1).
    await seatViaCards(3, 1, 2);
    // rotate A1 once (seated [A1,A2] => option 1).
    await pressForEvent(
      page,
      ['Space', '3', '1'],
      'proto_m13_piece_rotated',
      4,
    );
    // el3 -> C1 (pieces [st1,st2,el3,...] => 3; slots [B1,C1,...] => 2).
    await seatViaCards(3, 2, 3);
    // rotate C1 twice (seated [A1,C1,A2] => option 2).
    for (const wanted of [5, 6]) {
      await pressForEvent(
        page,
        ['Space', '3', '2'],
        'proto_m13_piece_rotated',
        wanted,
      );
    }
    // el4 -> C2 (pieces [st1,st2,el4,...] => 3; slots [B1,C2,...] => 2).
    await seatViaCards(3, 2, 4);

    // — Premature submission: honestly rejected, recorded, no completion.
    await pressForEvent(page, ['Space', '1'], 'proto_m13_flow_submitted', 1);

    let events: RawEventLike[] = await getEvents(page);
    const firstSubmit = findEvents(events, 'proto_m13_flow_submitted')[0];

    expect((firstSubmit.metadata as { valid?: boolean }).valid).toBe(false);
    expect(findEvents(events, 'proto_m13_completed')).toHaveLength(0);
    expect(findEvents(events, 'proto_m18_fault_presented')).toHaveLength(0);

    // — Seat the valve (pieces [st1,st2,te1,va1,cap1] => 4; slots [B1] => 1)
    //   and submit the now-sealed run.
    await seatViaCards(4, 1, 5);
    await pressForEvent(page, ['Space', '1'], 'proto_m13_completed', 1);
    events = await getEvents(page);
    expect(findEvents(events, 'proto_m18_fault_presented')).toHaveLength(1);

    // — M18: check the intake gauge, then log the diagnosis by LABEL
    //   (option order is counterbalanced, so position is looked up).
    await driveAxisTo(page, 'x', 512, 8);
    await driveAxisTo(page, 'y', 140, 8);
    await pressForEvent(page, ['Space', '3'], 'proto_m18_evidence_checked', 1);
    await press(page, '1'); // Back (closes the prompt).

    // Open the diagnosis stage (retry until its cards render).
    let reliefIndex = -1;

    for (let attempt = 0; attempt < 3 && reliefIndex < 0; attempt++) {
      await press(page, 'Space');
      await press(page, '5');

      const cards = (await getPromptCards(page)) ?? [];

      reliefIndex = cards.findIndex((card) =>
        card.label.includes('Relief valve leaking'),
      );
    }

    expect(reliefIndex).toBeGreaterThanOrEqual(0);
    await pressForEvent(
      page,
      [`${reliefIndex + 1}`],
      'proto_m18_diagnosis_submitted',
      1,
    );
    events = await getEvents(page);

    const diagnosis = findEvents(events, 'proto_m18_diagnosis_submitted')[0];

    expect((diagnosis.metadata as { correct?: boolean }).correct).toBe(true);
    expect(
      (diagnosis.metadata as { option_order?: number }).option_order,
    ).toBeGreaterThanOrEqual(0);

    // — M22: the shop-stock seal cracks on the first seating (setback).
    await driveAxisTo(page, 'x', 576, 8);
    await driveAxisTo(page, 'y', 288, 8);
    await pressForEvent(page, ['Space', '1'], 'proto_m22_setback_shown', 1);

    // Recovery route: fetch the fresh seal from the yard supply crate.
    const beforeYard = await eventCount(page, 'scene_start', 'coolant_yard');

    await driveAxisTo(page, 'y', 400, 10);
    await driveAxisTo(page, 'x', 560, 10);
    await enterRoomBySpace(page, 'coolant_yard', beforeYard + 1);
    await page.waitForTimeout(1200);
    await driveAxisTo(page, 'x', 160, 10);
    await driveAxisTo(page, 'y', 176, 10);
    await pressForEvent(page, ['Space', '1'], 'proto_m22_spare_seal_taken', 1);

    const beforePump = await eventCount(page, 'scene_start', 'pump_house');

    await driveAxisTo(page, 'y', 96, 10);
    await driveAxisTo(page, 'x', 560, 10);
    await enterRoomBySpace(page, 'pump_house', beforePump + 1);
    await page.waitForTimeout(1200);
    await driveAxisTo(page, 'x', 576, 8);
    await driveAxisTo(page, 'y', 288, 8);
    await pressForEvent(page, ['Space', '1'], 'proto_m22_recovered', 1);

    // — Window independence: strict sequence and disjoint families.
    events = await getEvents(page);

    const indexOf = (type: string) =>
      events.findIndex((event) => event.event_type === type);

    expect(indexOf('proto_m18_fault_presented')).toBeGreaterThan(
      indexOf('proto_m13_completed'),
    );
    expect(indexOf('proto_m22_setback_shown')).toBeGreaterThan(
      indexOf('proto_m18_diagnosis_submitted'),
    );

    for (const event of events.filter((entry) =>
      String(entry.event_type).startsWith('proto_m'),
    )) {
      expect(event.study_item_ids).toBeUndefined();
      expect(event.construct_id).toBeUndefined();
    }

    // No M13 manipulation act fired after the M18 window opened.
    const faultIndex = indexOf('proto_m18_fault_presented');
    const lateM13 = events.filter(
      (event, index) =>
        index > faultIndex &&
        ['proto_m13_piece_placed', 'proto_m13_piece_rotated'].includes(
          String(event.event_type),
        ),
    );

    expect(lateM13).toHaveLength(0);

    // — Validity register: all three windows completed and valid.
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

    for (const id of [
      'proto_m13_manifold_puzzle',
      'proto_m18_pressure_diagnosis',
      'proto_m22_seal_setback',
    ]) {
      const record = validity.find((entry) => entry.opportunity_id === id);

      expect(record?.completed, id).toBe(true);
      expect(record?.validity, id).toBe('valid');
    }

    expectNoRuntimeErrors(errors);
  });
});
