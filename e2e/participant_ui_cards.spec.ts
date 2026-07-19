import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  findEvent,
  getEvents,
  getEventTypes,
  hold,
  hubToStationDoor,
  inventoryToConsole,
  inventoryToKitCrate,
  inventoryToPrepBench,
  press,
  waitForRoomEntry,
} from './helpers';

/**
 * FABLE-NEXT-06 Phase 2: the shared choice-card panel
 * (UI-PRESENTATION-CONTRACT.md §2). Verifies that every input path —
 * pointer clicks on real card rects, arrow-key focus + Enter, and the
 * hidden numeric shortcuts — drives the SAME selection handler with
 * identical event emission (no duplicates, no new events), and that the
 * DEV card probe exposes participant labels only.
 */

interface PromptCardRect {
  index: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

async function getPromptCards(
  page: import('@playwright/test').Page,
): Promise<PromptCardRect[] | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __promptCards?: PromptCardRect[] | null })
        .__promptCards ?? null,
  );
}

/** Clicks the center of a card rect via real mouse input on the canvas. */
async function clickCard(
  page: import('@playwright/test').Page,
  card: PromptCardRect,
) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();

  if (box === null) {
    throw new Error('game canvas not found');
  }

  // The game canvas is scaled to fit; map game coords to page coords.
  const scaleX = box.width / 800;
  const scaleY = box.height / 600;

  await page.mouse.click(
    box.x + (card.x + card.width / 2) * scaleX,
    box.y + (card.y + card.height / 2) * scaleY,
  );
  await page.waitForTimeout(200);
}

async function openKaiPrompt(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'engineer_hub');
  await waitForRoomEntry(page, 'engineer_hub_entered');
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

test.describe('participant card panel (NEXT-06)', () => {
  test('mouse-only completion of the engineer report flow', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_UI',
      game_session_id: 'E2E_UI_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await openKaiPrompt(page);

    // Mode stage: 3 cards with participant labels only.
    let cards = await getPromptCards(page);

    expect(cards).not.toBeNull();
    expect(cards).toHaveLength(3);
    expect(cards![0].label).toBe('Submit a quick report from memory.');
    expect(cards![1].label).toBe('Review station evidence, then report.');

    await clickCard(page, cards![1]); // prepared mode

    // Content stage: 4 claims.
    cards = await getPromptCards(page);
    expect(cards).toHaveLength(4);
    await clickCard(page, cards![3]); // accurate claim

    // Duty stage: 2 cards.
    cards = await getPromptCards(page);
    expect(cards).toHaveLength(2);
    await clickCard(page, cards![0]); // accept the duty

    // Prompt closed: probe cleared.
    expect(await getPromptCards(page)).toBeNull();

    const types = await getEventTypes(page);

    for (const expected of [
      'engineer_report_opened',
      'engineer_evidence_reviewed',
      'engineer_report_submitted_prepared',
      'engineer_report_accuracy_scored',
      'engineer_supervision_assigned',
      'engineer_supervision_accepted',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    // No duplicate emission from the pointer path.
    expect(
      types.filter((t) => t === 'engineer_report_submitted_prepared'),
    ).toHaveLength(1);
    expect(
      types.filter((t) => t === 'engineer_report_accuracy_scored'),
    ).toHaveLength(1);

    const events = await getEvents(page);
    const accuracy = findEvent(events, 'engineer_report_accuracy_scored');

    expect(accuracy?.success).toBe(true);
  });

  test('keyboard-only completion via arrow focus and Enter', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_UI',
      game_session_id: 'E2E_UI_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await openKaiPrompt(page);

    // Focus starts on card 1; ArrowDown twice -> card 3 (clarify), Enter.
    await press(page, 'ArrowDown');
    await press(page, 'ArrowDown');
    await press(page, 'Enter');

    // Content stage: ArrowUp wraps from card 1 to card 4 (accurate), Enter.
    expect(await getPromptCards(page)).toHaveLength(4);
    await press(page, 'ArrowUp');
    await press(page, 'Enter');

    // Duty stage: ArrowDown -> card 2 (decline), Enter.
    expect(await getPromptCards(page)).toHaveLength(2);
    await press(page, 'ArrowDown');
    await press(page, 'Enter');

    expect(await getPromptCards(page)).toBeNull();

    const types = await getEventTypes(page);

    for (const expected of [
      'engineer_clarification_requested',
      'engineer_report_submitted_supervised',
      'engineer_report_accuracy_scored',
      'engineer_supervision_assigned',
      'engineer_supervision_declined',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(
      types.filter((t) => t === 'engineer_report_accuracy_scored'),
    ).toHaveLength(1);

    const events = await getEvents(page);
    const accuracy = findEvent(events, 'engineer_report_accuracy_scored');

    // ArrowUp wrap landed on the accurate claim (fresh session: claim 4).
    expect(accuracy?.success).toBe(true);
    expect(accuracy?.metadata).toMatchObject({ report_mode: 'supervised' });
  });

  test('hidden numeric shortcuts still select without duplicate events', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_UI',
      game_session_id: 'E2E_UI_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await openKaiPrompt(page);

    // Numeric path (legacy suites depend on it) — still one selection per
    // stage, same emission as any other input path.
    await press(page, '1'); // quick report
    await press(page, '1'); // claim 1
    await press(page, '2'); // decline duty

    const types = await getEventTypes(page);

    expect(types).toContain('engineer_report_submitted_unprepared');
    expect(
      types.filter((t) => t === 'engineer_report_submitted_unprepared'),
    ).toHaveLength(1);
    expect(
      types.filter((t) => t === 'engineer_supervision_assigned'),
    ).toHaveLength(1);
  });

  test('inventory prep status panel reflects live kit state (phase 3)', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await bootGame(page, {
      participant_id: 'E2E_UI',
      game_session_id: 'E2E_UI_S4',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToStationDoor(page, 'inventory_prep_room');
    await waitForRoomEntry(page, 'inventory_room_entered');

    const readPanel = () =>
      page.evaluate(
        () =>
          (window as unknown as { __prepStatusText?: string | null })
            .__prepStatusText ?? null,
      );

    // Fresh room: requisition open, hands free, full bench.
    let panel = await readPanel();

    expect(panel).toContain('PREP STATUS');
    expect(panel).toContain('[ ] Torque Driver');
    expect(panel).toContain('(hands free)');
    expect(panel).toContain('Bench (8 out):');

    // Engage per-item mode, take the first bench item: the carried slot
    // updates and the bench count drops.
    await inventoryToConsole(page);
    await press(page, '4');
    await inventoryToPrepBench(page);
    await press(page, '1'); // take Torque Driver

    panel = await readPanel();
    expect(panel).toContain('Carried:\nTorque Driver');
    expect(panel).toContain('Bench (7 out):');

    // Pack it into the kit crate: requisition line flips to packed.
    await inventoryToKitCrate(page);
    await press(page, '1');

    panel = await readPanel();
    expect(panel).toContain('[x] Torque Driver');
    expect(panel).toContain('(hands free)');

    // The panel is read-only presentation: no research event may have
    // fired from rendering it (the placement event fired from the ACT).
    const types = await getEventTypes(page);

    expect(types.filter((t) => t === 'correct_tool_selected')).toHaveLength(1);
  });

  test('repair and engineer status panels reflect task state (phase 4)', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await bootGame(page, {
      participant_id: 'E2E_UI',
      game_session_id: 'E2E_UI_S5',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);

    const readPanel = () =>
      page.evaluate(
        () =>
          (window as unknown as { __roomStatusText?: string | null })
            .__roomStatusText ?? null,
      );

    // Systems Repair: cycle counter follows submitted sequences.
    await hubToStationDoor(page, 'systems_repair_room');
    await waitForRoomEntry(page, 'repair_room_entered');

    let panel = await readPanel();

    expect(panel).toContain('SYSTEMS BAY');
    expect(panel).toContain('[ ] awaiting first sequence');
    expect(panel).toContain('Cycles logged: 0');

    await hold(page, 'ArrowUp', 900);
    await press(page, 'Space');
    await press(page, '1'); // first sequence attempt (fails by design)

    panel = await readPanel();
    expect(panel).toContain('Cycles logged: 1');
    expect(panel).toContain('sequence rejected');

    // Back to the Hub, then the Engineer report desk state.
    await hold(page, 'ArrowDown', 2200);
    await press(page, 'Space');
    await waitForRoomEntry(page, 'station_hub_entered');
    await openKaiPrompt(page);

    // Panel exists behind the prompt; report still pending.
    panel = await readPanel();
    expect(panel).toContain('REPORT DESK');
    expect(panel).toContain('[ ] pending');
    expect(panel).not.toContain('Relay duty');

    await press(page, '1'); // quick report
    await press(page, '1'); // claim 1
    await press(page, '2'); // decline duty

    panel = await readPanel();
    expect(panel).toContain('[x] logged');
    expect(panel).toContain('reassigned');
  });

  test('side repair status panel tracks the step indicator (phase 4)', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await bootGame(page, {
      participant_id: 'E2E_UI',
      game_session_id: 'E2E_UI_S6',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToStationDoor(page, 'optional_side_repair_bay');
    await waitForRoomEntry(page, 'side_repair_discovered');

    const readPanel = () =>
      page.evaluate(
        () =>
          (window as unknown as { __roomStatusText?: string | null })
            .__roomStatusText ?? null,
      );

    let panel = await readPanel();

    expect(panel).toContain('SIDE BAY');
    expect(panel).toContain('[ ] no work order accepted');

    await hold(page, 'ArrowUp', 900);
    await press(page, 'Space');
    await press(page, '2'); // accept the stabiliser repair

    panel = await readPanel();
    expect(panel).toContain('[ ] in progress');
    expect(panel).toContain('Step 1 of 3');
    expect(panel).toContain('fetch the component');
  });
});
