import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  findEvent,
  getEvents,
  getEventTypes,
  hold,
  hubToStationDoor,
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
});
