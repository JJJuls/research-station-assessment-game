import { expect, test } from '@playwright/test';

import type { RawEventLike } from './helpers';
import { bootGame, dockToHub, getEvents } from './helpers';

/**
 * Sprint A Phase A2: state/session continuity coverage for the behaviours
 * NOT already runtime-verified by the per-room specs (re-entry, one-shots,
 * Hazard state, and Final Core continuity live there). Contract under test:
 * docs/architecture/STATE-AND-SESSION-CONTINUITY.md.
 */

interface RuntimeWindow {
  researchRuntime?: {
    getEvents: () => RawEventLike[];
    getSummary: () => Record<string, unknown>;
    getMissionState: () => {
      current_room_id: string;
      completed_rooms: string[];
    };
  };
}

/** Waits for the runtime plus a specific logged event (any scene). */
async function waitForEvent(
  page: import('@playwright/test').Page,
  eventType: string,
) {
  await page.waitForFunction(
    (type) => {
      const rr = (window as unknown as RuntimeWindow).researchRuntime;

      return (
        rr !== undefined && rr.getEvents().some((e) => e.event_type === type)
      );
    },
    eventType,
    { timeout: 60_000 },
  );
}

async function getMissionState(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    (
      window as unknown as Required<RuntimeWindow>
    ).researchRuntime.getMissionState(),
  );
}

test.describe('state and session continuity', () => {
  test('reload resets the event log but preserves URL-derived metadata', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'A2_P1',
      game_session_id: 'A2_RELOAD_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });

    const before = await getEvents(page);

    expect(before.filter((e) => e.event_type === 'session_start')).toHaveLength(
      1,
    );
    expect(before.length).toBeGreaterThanOrEqual(4);

    await page.reload();
    await waitForEvent(page, 'dock_started');

    const after = await getEvents(page);

    // Fresh append-only log: exactly one session_start again, prior events
    // gone (no client-side persistence, by design).
    expect(after.filter((e) => e.event_type === 'session_start')).toHaveLength(
      1,
    );
    expect(after.length).toBeLessThanOrEqual(before.length);

    // URL-derived metadata identical across the reload.
    for (const event of after) {
      expect(event.participant_id).toBe('A2_P1');
      expect(event.game_session_id).toBe('A2_RELOAD_S1');
      expect(event.condition).toBe('pilot');
      expect(event.game_version).toBe('e2e');
    }

    // Elapsed clock restarted (no event may carry a stale large elapsed).
    const elapsed = after.map((e) => e.elapsed_seconds as number);

    expect(Math.max(...elapsed)).toBeLessThan(30);
  });

  test('direct room launch boots into the room and tracks current_room_id', async ({
    page,
  }) => {
    await page.goto(
      '/?scene=repair&participant_id=A2_P2&game_session_id=A2_DIRECT_S1',
    );
    await waitForEvent(page, 'repair_room_entered');

    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);

    // Session context precedes the room; no Dock baseline events exist in a
    // direct-launch session (documented in the continuity contract §4).
    expect(types[0]).toBe('session_start');
    expect(types).toContain('scene_start');
    expect(types).toContain('repair_room_entered');
    expect(types).not.toContain('dock_started');

    const mission = await getMissionState(page);

    expect(mission.current_room_id).toBe('systems_repair_room');
    expect(mission.completed_rooms).toEqual([]);
  });

  test('unknown ?scene= value falls back to the Dock without errors', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(
      '/?scene=does_not_exist&participant_id=A2_P3&game_session_id=A2_INVALID_S1',
    );
    await waitForEvent(page, 'dock_started');

    const mission = await getMissionState(page);

    expect(mission.current_room_id).toBe('dock_arrival');
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('current_room_id follows a real door transition; summary reads are pure', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'A2_P4',
      game_session_id: 'A2_TRANSIT_S1',
    });

    expect((await getMissionState(page)).current_room_id).toBe('dock_arrival');

    await dockToHub(page);

    expect((await getMissionState(page)).current_room_id).toBe('station_hub');

    // getSummary / getMissionState are read-only: no events appended, and
    // repeated summaries agree on everything except the elapsed clock.
    const purity = await page.evaluate(() => {
      const rr = (window as unknown as Required<RuntimeWindow>).researchRuntime;
      const before = rr.getEvents().length;
      const first = rr.getSummary();
      const second = rr.getSummary();
      const after = rr.getEvents().length;

      const differingKeys = Object.keys(first).filter(
        (key) =>
          key !== 'elapsed_seconds' &&
          JSON.stringify(first[key]) !== JSON.stringify(second[key]),
      );

      return { before, after, differingKeys };
    });

    expect(purity.after).toBe(purity.before);
    expect(purity.differingKeys).toEqual([]);
  });
});
