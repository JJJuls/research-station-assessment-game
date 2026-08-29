/**
 * Utility & Core closure — participant-route tests (evidence-led pilot v2,
 * Unit 6). Real participant input over the full route spine from the Dock
 * (Unit 5 endpoint → Utility Deck), no developer boot except where the
 * test is ABOUT the developer launch. Every assertion is on rendered
 * state, DEV probes or the raw event stream — never on injected state.
 *
 * 1. Participant path: record review (two-step), feeds by keyboard in
 *    order (with an out-of-order refusal), the gated Core door, chamber
 *    enter/exit before confirmation, the compact review (no trait/score/
 *    item-id language), ESC and stand-down, held ENTER never confirms,
 *    two distinct actions synchronise, stable Core, neutral completion
 *    notice, map/inventory harmless, export available, prior records
 *    untouched, no item event, no Qualtrics navigation, no page errors.
 * 2. Pointer path: sealed reasons before the review, a genuinely open
 *    window named neutrally, ESC mid-valve keeps a recoverable state, an
 *    off-index engage and a mis-drop are refused neutrally, pointer and
 *    keyboard end states match, scene recreation keeps every feed.
 * 3. Developer launches: a direct zone launch fabricates no readiness;
 *    the labelled DEV inspection bypass emits no participant evidence and
 *    never closes the record; the participant boot ignores the parameter.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import {
  attemptCoreDoorSealed,
  attemptFeedRefused,
  chamberProbe,
  closeStationRecord,
  CLOSURE_FORBIDDEN_TEXT,
  closureProbe,
  deckProbe,
  enterCoreChamber,
  feedPanel,
  lastFeedback,
  leaveCoreChamber,
  openCorePrompt,
  openFeedPanel,
  openReviewPanel,
  openSyncReview,
  raiseAllFeeds,
  raiseFeedKeyboard,
  raiseFeedPointer,
  routeToUtilityDeck,
  waitCompletionNotice,
  waitCoreState,
  waitFeedPanel,
} from './closureHelpers';
import { getEvents, hold, press, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  bootPilotScene,
  concourseToDeck,
  dockToConcourse,
  expectStage,
  PILOT,
  pilotCoverage,
  pilotProbe,
  useDoor,
} from './pilotHelpers';
import {
  clickElement,
  closeSurface,
  keyActivate,
  surface,
  waitSurface,
} from './returnHelpers';

interface ValidityRow {
  opportunity_id: string;
  entered: boolean;
  completed: boolean;
  absent: boolean;
  censored: boolean;
  invalid_reason: string | null;
  invalid_detail: string | null;
  validity: string;
}

async function validityRegister(page: Page): Promise<ValidityRow[]> {
  return page.evaluate(
    () =>
      (window as unknown as { __measurementValidity?: ValidityRow[] | null })
        .__measurementValidity ?? [],
  );
}

async function protoEventCount(page: Page): Promise<number> {
  return (await getEvents(page)).filter((event) =>
    event.event_type.startsWith('proto_'),
  ).length;
}

async function closureEvents(page: Page) {
  return (await getEvents(page)).filter((event) =>
    event.event_type.startsWith('pilot_closure_'),
  );
}

async function openMap(page: Page) {
  await press(page, 'm');
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
        .__pilotMapProbe?.open === true,
    undefined,
    { timeout: 6000 },
  );
  await press(page, 'Escape');
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
        .__pilotMapProbe?.open !== true,
    undefined,
    { timeout: 6000 },
  );
}

async function openInventory(page: Page) {
  await press(page, 'i');
  await page.waitForFunction(
    () =>
      (window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open === true,
    undefined,
    { timeout: 6000 },
  );
  await press(page, 'Escape');
  await page.waitForFunction(
    () =>
      (window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open !== true,
    undefined,
    { timeout: 6000 },
  );
}

test.describe('Utility & Core closure — participant route (Unit 6)', () => {
  test('1. record review, keyboard feeds, gated door, chamber enter/exit, two-step confirmation, stable Core, neutral completion', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    // Mixed history: both obligations accepted (never fulfilled — their
    // review disposition is the observation), the calibration started and
    // left unfinished, a partial antenna start; every other window never
    // entered. No task is "solved" anywhere on this path.
    await routeToUtilityDeck(page, 'clo', {
      concourse: { watch: 'accept', promise: 'accept', readGauge1: true },
      calibration: true,
      mast: 'partial',
    });

    const arrivedAt = Date.now();
    let probe = await closureProbe(page);

    expect(probe.utility_state).toBe('ready_for_review');
    expect(probe.record_closed).toBe(false);
    expect(probe.readiness.ready).toBe(false);
    expect(probe.readiness.dev_inspection).toBe(false);
    expect(probe.readiness.blockers[0]).toEqual({
      kind: 'record_not_reviewed',
      hint: 'Shift Review Panel (Utility Deck)',
    });
    // Genuinely open windows (entered, unfinished) are blockers with a
    // neutral location hint — and the calibration bench is one of them.
    expect(probe.readiness.blockers).toContainEqual({
      kind: 'window_open',
      hint: 'Calibration bench (Workshop)',
    });
    expect((await pilotProbe(page))?.objective).toContain('Shift Review Panel');
    expect((await deckProbe(page))?.dev_label_visible).toBe(false);

    // Early Core attempt: sealed with a concise operational reason.
    const sealed = await attemptCoreDoorSealed(page);

    expect(sealed).toContain('Shift Review Panel');

    // Feeds are isolated before the review.
    expect(await attemptFeedRefused(page, 'coolant')).toContain(
      'Shift Review Panel',
    );

    // The participant can leave and come back (no trap, nothing changes).
    await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
      approachOffset: { x: 40, y: 0 },
      yFirst: true,
    });
    await concourseToDeck(page);
    expect((await closureProbe(page)).record_closed).toBe(false);

    // ——— The explicit two-step record closure ———
    const coverageBefore = (await pilotCoverage(page))!;
    const protoBefore = await protoEventCount(page);
    const closureStartedAt = Date.now();

    await closeStationRecord(page);

    probe = await closureProbe(page);
    expect(probe.utility_state).toBe('ready_for_feeds');
    expect(probe.readiness.ready).toBe(true);
    expect(probe.readiness.blockers).toEqual([]);
    expect(probe.context).toEqual({
      gameplay_route_closed: false,
      research_record_closed: true,
      research_readiness_terminal: true,
      external_questionnaire_pending: true,
      qualtrics_completion_performed: false,
    });

    // Terminality, never success: nothing pending was promoted to
    // completed; obligations closed as observations; every item terminal.
    const coverageAfter = (await pilotCoverage(page))!;

    for (const item of coverageAfter.items) {
      const before = coverageBefore.items.find((i) => i.item === item.item)!;

      expect([
        'completed',
        'missing',
        'invalid',
        'censored',
        'not_applicable',
      ]).toContain(item.status);

      if (before.status === 'pending') {
        expect(item.status, item.item).toBe('missing');
      }
    }

    const m25 = probe.readiness.items.find((item) => item.item === 'M25')!;

    expect(m25.class).toBe('external_pending');
    expect(m25.routeTerminal).toBe(true);
    expect(probe.readiness.externalQuestionnairePending).toBe(true);
    expect(probe.readiness.counts.open + probe.readiness.counts.pending).toBe(
      0,
    );

    // The closure wrote its terminal window records (system input) and
    // from here on NO proto_* event may appear again.
    const protoAtClosure = await protoEventCount(page);

    expect(protoAtClosure).toBeGreaterThanOrEqual(protoBefore);

    const registerAtClosure = await validityRegister(page);

    // The panel now reads as closed, with the approved words only.
    const closedPanel = await openReviewPanel(page);

    expect(closedPanel.body).toContain('STATION RECORD — closed');
    expect(closedPanel.body).toContain('Questionnaire handoff: prepared');
    expect(closedPanel.body).toMatch(/Not observed: \d+/);
    expect(closedPanel.labels).toEqual(['Step away']);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(300);

    // ——— Feeds (keyboard), operational order enforced neutrally ———
    expect(await attemptFeedRefused(page, 'calibration')).toContain(
      'coolant feed valve first',
    );

    const feedsStartedAt = Date.now();

    await raiseFeedKeyboard(page, 'coolant');
    expect((await deckProbe(page))?.feed_chips.coolant).toBe('OPEN · flowing');
    expect((await deckProbe(page))?.manifold).toContain('COOLANT ●');
    expect((await closureProbe(page)).utility_state).toBe('coolant_ready');

    // Cannot complete twice: the panel reopens read-only; a held key
    // changes nothing.
    await openFeedPanel(page, 'coolant');

    const actionsBefore = (await closureProbe(page)).feeds.coolant.actions;

    await hold(page, 'ArrowRight', 600);
    expect((await closureProbe(page)).feeds.coolant.actions).toBe(
      actionsBefore,
    );
    await press(page, 'Enter');
    await waitFeedPanel(page, false);

    await raiseFeedKeyboard(page, 'calibration');
    expect((await deckProbe(page))?.feed_chips.calibration).toBe(
      'ENGAGED · live',
    );
    await raiseFeedKeyboard(page, 'distribution');
    expect((await deckProbe(page))?.feed_chips.distribution).toBe(
      'CONNECTED · live',
    );

    const feedsDoneAt = Date.now();

    probe = await closureProbe(page);
    expect(probe.utility_state).toBe('core_access_ready');
    expect(probe.feeds.coolant).toMatchObject({ open: true, travel: 1 });
    expect(probe.feeds.calibration).toMatchObject({ engaged: true, index: 7 });
    expect(probe.feeds.distribution).toMatchObject({
      seated: true,
      coupler: 'seated',
    });
    expect((await deckProbe(page))?.door_open).toBe(true);
    expect((await deckProbe(page))?.manifold).toBe(
      'COOLANT ● · CALIBRATION ● · DISTRIBUTION ●',
    );
    expect((await pilotProbe(page))?.objective).toContain('north door');

    // ——— Core Chamber: enter, look, leave, re-enter (no trap) ———
    await enterCoreChamber(page);
    await expectStage(page, 'core_sync');

    let chamber = await chamberProbe(page);

    expect(chamber?.core_state).toBe('accessible');
    expect(chamber?.visual_state).toBe('prepared');
    expect(chamber?.kai_texture).toBe('plv1-kai');
    expect(chamber?.dev_label_visible).toBe(false);

    await leaveCoreChamber(page);
    expect((await deckProbe(page))?.feed_chips.distribution).toBe(
      'CONNECTED · live',
    );
    await enterCoreChamber(page);
    chamber = await chamberProbe(page);
    expect(chamber?.visual_state).toBe('prepared');

    // ——— The Core: inspect, review (compact, neutral), ESC, arm, stand down ———
    const reviewStartedAt = Date.now();
    const corePrompt = await openCorePrompt(page);

    expect(corePrompt.body).toContain('CORE — PREPARED');
    expect(corePrompt.labels).toEqual([
      'Inspect the Core',
      'Open the synchronisation review',
      'Step away',
    ]);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    expect(await lastFeedback(page)).toContain('Ready for synchronisation');

    const review = await openSyncReview(page);

    expect(review.elements.map((e) => e.id)).toEqual(
      expect.arrayContaining([
        'episodes',
        'feeds',
        'sync_ready',
        'recorded',
        'recorded_limited',
        'not_observed',
        'technical',
        'questionnaire',
        'logging',
        'arm_sync',
        'close_review',
      ]),
    );
    expect(review.elements.find((e) => e.id === 'sync_ready')?.label).toContain(
      'Synchronisation readiness',
    );
    expect(review.elements.map((e) => e.id)).not.toContain('confirm_sync');
    expect((await closureProbe(page)).core.state).toBe('review_open');

    // ESC during the review: closes it, state back to accessible.
    await closeSurface(page);
    expect((await closureProbe(page)).core.state).toBe('accessible');

    // Arm (keyboard), ESC → stands down but keeps the review open.
    await openSyncReview(page);
    await keyActivate(page, 'arm_sync');
    await waitCoreState(page, 'confirmation_armed');
    expect((await surface(page))?.elements.map((e) => e.id)).toEqual(
      expect.arrayContaining(['stand_down', 'confirm_sync']),
    );
    await press(page, 'Escape');
    await page.waitForTimeout(300);
    expect((await surface(page))?.open).toBe(true);
    await waitCoreState(page, 'review_open');
    expect((await closureProbe(page)).core.stand_downs).toBe(1);

    // Arm again; a HELD ENTER cannot confirm: the focus after arming sits
    // on STAND DOWN and OS repeats are ignored — exactly one stand-down.
    await keyActivate(page, 'arm_sync');
    await waitCoreState(page, 'confirmation_armed');
    await hold(page, 'Enter', 1100);
    await page.waitForTimeout(400);
    expect((await closureProbe(page)).core.state).toBe('review_open');
    expect((await closureProbe(page)).core.stand_downs).toBe(2);
    expect((await closureProbe(page)).core.confirmed_at_ms).toBeNull();

    // ——— Two distinct actions: arm (pointer), confirm (keyboard focus move + ENTER) ———
    await clickElement(page, 'arm_sync');
    await waitCoreState(page, 'confirmation_armed');
    await keyActivate(page, 'confirm_sync');
    await waitCoreState(page, 'stable', 20_000);

    const stableAt = Date.now();

    await waitCompletionNotice(page, true);

    const notice = (await surface(page))!;

    expect(notice.surface_id).toBe('core_completion_notice');
    expect(`${notice.title}\n${notice.status}`).not.toMatch(
      CLOSURE_FORBIDDEN_TEXT,
    );

    for (const element of notice.elements) {
      expect(element.label).not.toMatch(CLOSURE_FORBIDDEN_TEXT);
    }

    expect(notice.elements.map((e) => e.label).join('\n')).toContain(
      'Questionnaire handoff: prepared',
    );
    await keyActivate(page, 'close_notice');
    await waitSurface(page, false);
    await waitCompletionNotice(page, false);

    chamber = await chamberProbe(page);
    expect(chamber?.core_state).toBe('stable');
    expect(chamber?.visual_state).toBe('stable');
    expect(chamber?.kai_texture).toBe('plv1-kai-done');
    expect((await pilotProbe(page))?.stage).toBe('complete');
    expect((await pilotProbe(page))?.objective).toContain('Shift complete');
    expect((await pilotProbe(page))?.beacon).toBeNull();

    // No second synchronisation: the Core offers the notice only.
    const stablePrompt = await openCorePrompt(page);

    expect(stablePrompt.body).toContain('CORE — STABLE');
    expect(stablePrompt.labels).toEqual([
      'Review the completion notice',
      'Step away',
    ]);
    await selectPromptOption(page, 2);
    await page.waitForTimeout(300);

    // Map and inventory open/close without disturbing the completion.
    await openMap(page);
    await openInventory(page);
    expect((await closureProbe(page)).core.state).toBe('stable');
    expect((await chamberProbe(page))?.completion_open).toBe(false);

    // The door is not blocked: leave, and the deck reflects the closure.
    await leaveCoreChamber(page);
    expect((await deckProbe(page))?.board).toContain('CLOSED');
    await enterCoreChamber(page);
    expect((await chamberProbe(page))?.visual_state).toBe('stable');

    // ——— Data boundaries ———
    expect(await protoEventCount(page)).toBe(protoAtClosure);
    expect(await validityRegister(page)).toEqual(registerAtClosure);

    const types = (await getEvents(page)).map((event) => event.event_type);

    expect(types).toContain('pilot_closure_record_closed');
    expect(types).toContain('pilot_closure_feed_ready');
    expect(types).toContain('pilot_closure_synchronised');
    expect(types).toContain('pilot_closure_stable');
    expect(types).not.toContain('objective_completed');
    expect(types.some((type) => type.startsWith('pilot_final_core'))).toBe(
      false,
    );

    for (const event of await closureEvents(page)) {
      expect(event.study_item_ids ?? undefined).toBeUndefined();
      expect(event.construct_id ?? undefined).toBeUndefined();
      expect(event.success ?? undefined).toBeUndefined();
      expect((event.metadata as { non_scored?: boolean })?.non_scored).toBe(
        true,
      );
      // (`non_scored` is the boundary flag itself; the word "score" as a
      // value is what must never appear.)
      expect(JSON.stringify(event.metadata)).not.toMatch(
        /proto_m|\bQ\d{2}\b|\bscore\b|trait/,
      );
    }

    expect(page.url()).not.toContain('pilot_return');
    expect(
      await page.evaluate(() =>
        JSON.parse(
          (
            window as unknown as {
              researchRuntime: { exportEventsJSON: () => string };
            }
          ).researchRuntime.exportEventsJSON(),
        ),
      ),
    ).toBeTruthy();

    // ——— Timing (automated; never a human estimate) ———
    const feedEvents = await closureEvents(page);
    const readyStamps = feedEvents
      .filter((e) => e.event_type === 'pilot_closure_feed_ready')
      .map((e) => e.timestamp_ms as number);
    const openStamps = feedEvents
      .filter((e) => e.event_type === 'pilot_closure_feed_panel_opened')
      .map((e) => e.timestamp_ms as number);
    const activeFeedMs = readyStamps.reduce((sum, ready) => {
      const opened = openStamps.filter((o) => o < ready).pop() ?? ready;

      return sum + (ready - opened);
    }, 0);

    // Also written to the (gitignored) test-results folder for the report.
    mkdirSync(join(tmpdir(), 'unit6'), { recursive: true });
    writeFileSync(
      join(tmpdir(), 'unit6', 'timing.json'),
      JSON.stringify(
        {
          closure_wall_ms_from_deck_arrival: stableAt - arrivedAt,
          closure_wall_ms_from_record_closure: stableAt - closureStartedAt,
          feeds_wall_ms: feedsDoneAt - feedsStartedAt,
          feed_panel_active_ms: activeFeedMs,
          review_confirm_wall_ms: stableAt - reviewStartedAt,
        },
        null,
        2,
      ),
    );
    test.info().annotations.push(
      {
        type: 'closure_wall_ms_from_deck_arrival',
        description: `${stableAt - arrivedAt}`,
      },
      {
        type: 'closure_wall_ms_from_record_closure',
        description: `${stableAt - closureStartedAt}`,
      },
      {
        type: 'feeds_wall_ms',
        description: `${feedsDoneAt - feedsStartedAt}`,
      },
      { type: 'feed_panel_active_ms', description: `${activeFeedMs}` },
      {
        type: 'review_confirm_wall_ms',
        description: `${stableAt - reviewStartedAt}`,
      },
    );
    expect(stableAt - closureStartedAt).toBeLessThan(300_000);
    expectNoRuntimeErrors(errors);
  });

  test('2. pointer feeds, neutral refusals, ESC keeps a recoverable state, pointer/keyboard parity, scene recreation persists', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await routeToUtilityDeck(page, 'clp', { calibration: true });

    // Genuinely open window before the review: named neutrally, no item id.
    const before = await closureProbe(page);

    expect(before.readiness.blockers.map((b) => b.kind)).toEqual(
      expect.arrayContaining(['record_not_reviewed', 'window_open']),
    );
    expect(JSON.stringify(before.readiness.blockers)).not.toMatch(
      /M\d{2}|proto_/,
    );
    await attemptCoreDoorSealed(page);

    await closeStationRecord(page);

    // Coolant by pointer, interrupted: ESC mid-turn leaves partial travel.
    const partial = await openFeedPanel(page, 'coolant');
    const wheel = partial.geometry.wheel!;
    const box = (await page.locator('canvas').boundingBox())!;
    const at = (x: number, y: number) => ({
      x: box.x + (x * box.width) / 800,
      y: box.y + (y * box.height) / 600,
    });
    const start = at(wheel.x + wheel.r - 4, wheel.y);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();

    for (let step = 1; step <= 20; step += 1) {
      const angle = (step * Math.PI) / 48;
      const point = at(
        wheel.x + Math.cos(angle) * (wheel.r - 4),
        wheel.y + Math.sin(angle) * (wheel.r - 4),
      );

      await page.mouse.move(point.x, point.y);
    }

    await page.mouse.up();
    await press(page, 'Escape');
    await waitFeedPanel(page, false);

    const interrupted = (await closureProbe(page)).feeds.coolant;

    expect(interrupted.open).toBe(false);
    expect(interrupted.travel).toBeGreaterThan(0.05);
    expect(interrupted.travel).toBeLessThan(1);
    expect((await deckProbe(page))?.feed_chips.coolant).toBe(
      'SHUT · ready to open',
    );

    await raiseFeedPointer(page, 'coolant');
    expect((await closureProbe(page)).feeds.coolant.open).toBe(true);

    // Breaker by pointer: an off-index engage is refused neutrally first.
    const breaker = await openFeedPanel(page, 'calibration');
    const engage = breaker.geometry.engage!;
    const button = at(engage.x + engage.w / 2, engage.y + engage.h / 2);

    await page.mouse.click(button.x, button.y);
    await page.waitForTimeout(300);

    const refused = await feedPanel(page);

    expect(refused?.ready).toBe(false);
    expect(refused?.feedback).toContain('index 7');
    expect(refused?.feedback).not.toMatch(CLOSURE_FORBIDDEN_TEXT);
    expect(
      (await closureProbe(page)).feeds.calibration.misaligned_attempts,
    ).toBe(1);
    await press(page, 'Escape');
    await waitFeedPanel(page, false);
    await raiseFeedPointer(page, 'calibration');

    // Bus by pointer: a drop outside the socket returns the coupler.
    const bus = await openFeedPanel(page, 'distribution');
    const coupler = bus.geometry.coupler!;
    const from = at(coupler.x + coupler.w / 2, coupler.y + coupler.h / 2);
    const rail = bus.geometry.rail!;
    const midway = at((rail.x0 + rail.x1) / 2, rail.y);

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(midway.x, midway.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    expect((await feedPanel(page))?.coupler).toBe('tray');
    expect((await feedPanel(page))?.feedback).toContain('returns to the tray');
    expect((await closureProbe(page)).feeds.distribution.returns_to_tray).toBe(
      1,
    );
    await press(page, 'Escape');
    await waitFeedPanel(page, false);
    await raiseFeedPointer(page, 'distribution');

    // Keyboard/pointer end states match the keyboard run's shape exactly.
    const pointerEnd = (await closureProbe(page)).feeds;

    expect(pointerEnd.coolant).toMatchObject({ open: true, travel: 1 });
    expect(pointerEnd.calibration).toMatchObject({ engaged: true, index: 7 });
    expect(pointerEnd.distribution).toMatchObject({
      seated: true,
      coupler: 'seated',
      travel: 1,
    });
    expect((await closureProbe(page)).utility_state).toBe('core_access_ready');

    // Scene recreation (Concourse and back) keeps every feed and the door.
    await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
      approachOffset: { x: 40, y: 0 },
      yFirst: true,
    });
    await concourseToDeck(page);

    const deck = await deckProbe(page);

    expect(deck?.feed_chips).toEqual({
      coolant: 'OPEN · flowing',
      calibration: 'ENGAGED · live',
      distribution: 'CONNECTED · live',
    });
    expect(deck?.door_open).toBe(true);
    await enterCoreChamber(page);
    expect((await chamberProbe(page))?.visual_state).toBe('prepared');
    expectNoRuntimeErrors(errors);
  });

  test('3. developer launches: no fabricated readiness; the labelled DEV inspection closes no record and emits no participant evidence', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    // Direct zone launch (developer): the route never reached its closure
    // stage, so the panel offers only a return and the Core stays sealed.
    await bootPilotScene(page, 'dev', 'utility_core_deck');

    const direct = await closureProbe(page);

    expect(direct.dev_inspection).toBe(false);
    expect(direct.utility_state).toBe('unavailable');
    expect(direct.readiness.ready).toBe(false);
    expect(direct.readiness.blockers[0].kind).toBe('route_not_signed_off');

    const panel = await openReviewPanel(page);

    expect(panel.labels).toEqual(['Return to the station']);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(300);
    expect(await attemptCoreDoorSealed(page)).toContain('Work Order Board');
    expect(await attemptFeedRefused(page, 'coolant')).toContain(
      'Work Order Board',
    );
    expect((await closureProbe(page)).record_closed).toBe(false);
    expect(await protoEventCount(page)).toBe(0);

    // DEV inspection bypass: visibly labelled, feeds and Core available,
    // record untouched, every closure event tagged, no proto_* event.
    await page.goto(
      `/?participant_id=PT_PILOT_devi&game_session_id=GS_PILOT_devi_${Date.now()}&scene=utility_core_deck&dev_closure=inspect`,
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'utility_core_deck',
      undefined,
      { timeout: 60_000 },
    );
    await page.waitForTimeout(1200);

    const inspect = await closureProbe(page);

    expect(inspect.dev_inspection).toBe(true);
    expect(inspect.record_closed).toBe(false);
    expect((await deckProbe(page))?.dev_label_visible).toBe(true);
    expect((await openReviewPanel(page)).body).toContain('DEV INSPECTION');
    await selectPromptOption(page, 1);
    await page.waitForTimeout(300);
    await raiseAllFeeds(page, 'keyboard');
    expect((await closureProbe(page)).record_closed).toBe(false);
    await enterCoreChamber(page);
    expect((await chamberProbe(page))?.dev_label_visible).toBe(true);

    const review = await openSyncReview(page);

    expect(review.title).toContain('OPERATIONAL REVIEW');
    expect(
      review.elements.find((e) => e.id === 'sync_ready')?.label,
    ).toBeDefined();
    await keyActivate(page, 'arm_sync');
    await waitCoreState(page, 'confirmation_armed');
    await keyActivate(page, 'confirm_sync');
    await waitCoreState(page, 'stable', 20_000);
    await waitCompletionNotice(page, true);
    await closeSurface(page);

    expect((await closureProbe(page)).record_closed).toBe(false);
    expect(await protoEventCount(page)).toBe(0);
    expect(await validityRegister(page)).toEqual([]);

    const events = await closureEvents(page);

    expect(events.length).toBeGreaterThan(5);

    for (const event of events) {
      expect(
        (event.metadata as { dev_inspection?: boolean })?.dev_inspection,
      ).toBe(true);
    }

    // The participant boot ignores the parameter entirely: the launch is
    // recorded as a participant launch (the bypass requires a developer
    // launch — test 1 asserts `dev_inspection: false` on the participant
    // route with no parameter at all).
    await bootPilot(page, 'part', { extra: '&dev_closure=inspect' });
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    expect((await pilotCoverage(page))?.launch_mode).toBe('participant');
    expect((await pilotCoverage(page))?.developer_scenes_visited).toEqual([]);
    expectNoRuntimeErrors(errors);
  });
});
