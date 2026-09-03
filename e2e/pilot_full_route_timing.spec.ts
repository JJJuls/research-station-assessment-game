/**
 * Unit 8 — the complete participant route, driven with real input from the
 * Dock to the stable Core, with a timing and coverage record for the burden
 * gate (workbook sheet 08: item-owned active 1,040 s, shared overhead
 * 420 s, closure 75 s, planned total 1,535 s; human median ≤ 27 min, p90
 * ≤ 30 min).
 *
 * Automation walks faster than a person and never pauses to read, so the
 * numbers recorded here are AUTOMATION wall/active times — never a human
 * duration claim. No DEV state mutation: the route is the same driver the
 * closure suite uses (offers accepted, calibration started, partial
 * antenna start), followed by the record closure, the three feeds and the
 * Core confirmation. The result is written to the scratch directory and
 * printed for the report.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import {
  closeStationRecord,
  enterCoreChamber,
  feedPanel,
  openFeedPanel,
  openSyncReview,
  routeToUtilityDeck,
  waitCompletionNotice,
  waitCoreState,
  waitFeedPanel,
} from './closureHelpers';
import { hold, press } from './helpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import { PILOT, walkTo } from './pilotHelpers';
import { clickElement, keyActivate } from './returnHelpers';

interface RawEvent {
  event_type: string;
  timestamp?: string | number;
  ts?: number;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

async function waitReady(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __feedPanelProbe?: { ready: boolean } | null })
        .__feedPanelProbe?.ready === true,
    undefined,
    { timeout: 10_000 },
  );
}

function eventTime(event: RawEvent): number {
  const raw = event.timestamp ?? event.ts;

  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return Date.parse(raw);

  return Number.NaN;
}

test('complete participant route — Dock to stable Core, timing and coverage record', async ({
  page,
}) => {
  test.setTimeout(1_800_000);

  const errors = captureErrors(page);
  const startedAt = Date.now();
  const marks: Record<string, number> = {};
  const mark = (name: string) => {
    marks[name] = Date.now() - startedAt;
  };

  await routeToUtilityDeck(page, 'fullroute', {
    concourse: { watch: 'accept', promise: 'accept', readGauge1: true },
    calibration: true,
    mast: 'partial',
  });
  mark('deck_arrival');

  await closeStationRecord(page);
  mark('record_closed');

  await openFeedPanel(page, 'coolant');
  // Probe-gated turning: hold in chunks until the panel reports the wheel
  // through full travel (a single fixed hold under-travels on a loaded
  // machine — the same mechanic, driven to its observable state).
  for (let chunk = 0; chunk < 10; chunk += 1) {
    await hold(page, 'ArrowRight', 700);

    const ready = await page.evaluate(
      () =>
        (window as unknown as { __feedPanelProbe?: { ready: boolean } | null })
          .__feedPanelProbe?.ready === true,
    );

    if (ready) break;
  }
  await waitReady(page);
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  await openFeedPanel(page, 'calibration');
  for (let step = 0; step < 7; step += 1) {
    await press(page, 'ArrowUp');
  }
  await press(page, 'Enter');
  await waitReady(page);
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  const bus = await openFeedPanel(page, 'distribution');
  const box = (await page.locator('canvas').boundingBox())!;
  const at = (x: number, y: number) => ({
    x: box.x + (x * box.width) / 800,
    y: box.y + (y * box.height) / 600,
  });
  const coupler = bus.geometry.coupler!;
  const socket = bus.geometry.socket!;
  const from = at(coupler.x + coupler.w / 2, coupler.y + coupler.h / 2);
  const to = at(socket.x + socket.w / 2, socket.y + socket.h / 2);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, from.y, { steps: 10 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await waitReady(page);
  expect((await feedPanel(page))?.coupler).toBe('seated');
  await press(page, 'Enter');
  await waitFeedPanel(page, false);
  mark('feeds_up');

  await walkTo(page, PILOT.deck.coreDoor.x, PILOT.deck.coreDoor.y + 60, {
    yFirst: false,
  });
  await enterCoreChamber(page);
  await walkTo(page, 400, 380, { yFirst: true });
  await openSyncReview(page);
  await keyActivate(page, 'arm_sync');
  await waitCoreState(page, 'confirmation_armed');
  await clickElement(page, 'confirm_sync');
  await waitCoreState(page, 'stable');
  mark('core_stable');
  await waitCompletionNotice(page, true);
  await press(page, 'Escape');
  mark('completion_closed');

  const wallMs = Date.now() - startedAt;

  // ——— Record: events, coverage, timing ———
  const events = (await page.evaluate(() =>
    JSON.parse(
      (
        window as unknown as {
          researchRuntime: { exportEventsJSON: () => string };
        }
      ).researchRuntime.exportEventsJSON(),
    ),
  )) as RawEvent[] | { events?: RawEvent[] };
  const list: RawEvent[] = Array.isArray(events)
    ? events
    : (events.events ?? []);
  const coverage = await page.evaluate(
    () => (window as unknown as { __pilotCoverage?: unknown }).__pilotCoverage,
  );

  const doorUses = list
    .filter((event) => event.event_type === 'pilot_door_used')
    .map((event) => ({
      t: eventTime(event),
      from: (event.metadata ?? event.context ?? {}).from,
      to: (event.metadata ?? event.context ?? {}).to,
    }));
  const activeMs = list.reduce(
    (sum, event) =>
      sum + Number((event.metadata as { active_ms?: number })?.active_ms ?? 0),
    0,
  );
  const first = Math.min(...list.map(eventTime).filter(Number.isFinite));
  const zoneOrder: string[] = [];

  for (const door of doorUses) {
    const to = String(door.to);

    if (zoneOrder[zoneOrder.length - 1] !== to) zoneOrder.push(to);
  }

  const record = {
    generated_at: new Date().toISOString(),
    note: 'AUTOMATION timing — not a human duration estimate',
    wall_ms_total: wallMs,
    wall_marks_ms: marks,
    item_owned_active_ms_from_surface_events: activeMs,
    event_count: list.length,
    zone_sequence: zoneOrder,
    door_transitions: doorUses.map((door) => ({
      at_ms: Number.isFinite(door.t) ? door.t - first : null,
      from: door.from,
      to: door.to,
    })),
    coverage,
  };
  const dir = join(tmpdir(), 'claude', 'u8');

  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'full-route-timing.json'),
    JSON.stringify(record, null, 2),
  );
  test.info().annotations.push({
    type: 'full-route-timing',
    description: `FULL-ROUTE wall ${Math.round(wallMs / 1000)} s · item-owned active (surface events) ${Math.round(activeMs / 1000)} s · deck arrival ${Math.round(marks.deck_arrival / 1000)} s · closure ${Math.round((marks.core_stable - marks.record_closed) / 1000)} s · zones ${zoneOrder.join(' → ')}`,
  });
  await test.info().attach('full-route-timing.json', {
    body: JSON.stringify(record, null, 2),
    contentType: 'application/json',
  });

  expect(zoneOrder.length, 'the route crossed zones').toBeGreaterThan(5);
  expectNoRuntimeErrors(errors);
});
