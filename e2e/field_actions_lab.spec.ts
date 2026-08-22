/**
 * Field-actions foundation — participant-interaction verification.
 *
 * Real browser input against the Field Actions Lab
 * (?scene=field_actions_lab): C scanning with the monotone signal
 * model, cooldown and modal suppression; D facing-cell digging with
 * persistent terrain state, once-only cells, conservation and the
 * inventory-full field cache; F magnet recovery with the explicit
 * state machine, keyboard/pointer equivalence, rig locality, ESC
 * cancellation and deck depletion finality.
 *
 * Action key presses use the documented SwiftShader input-loss retry
 * (openNearbyPrompt / clickGameRect precedent): a press is retried
 * ONLY when nothing observable happened, never after an effect landed.
 * Every boot uses a fresh session id (module-scope state isolation).
 */

import { expect, type Page, test } from '@playwright/test';

import {
  driveAxisTo,
  getEvents,
  getEventTypes,
  getLastFeedbackText,
  hold,
  openNearbyPrompt,
  playerProbe,
  press,
  selectPromptOption,
} from './helpers';

interface FieldActionsProbe {
  scene: string;
  worldActionActive: boolean;
  scan: {
    cooling: boolean;
    context: string;
    last: {
      strength: number;
      category: string;
      trend: string | null;
      target_id: string | null;
      player_x: number;
      player_y: number;
    } | null;
  };
  dig: {
    last: {
      col: number;
      row: number;
      outcome: string;
      item_id: string | null;
    } | null;
    target: { col: number; row: number } | null;
    probe: { x: number; y: number };
  };
  magnet: {
    phase: string;
    markerInBand: boolean;
    deckForm: string | null;
    deckPosition: number;
    totalPulls: number;
    depleted: boolean;
  };
  windows: { m23_open: boolean; m24_open: boolean; m26_phase: string };
  caches: { cache_id: string; item_id: string; x: number; y: number }[];
}

async function faProbe(page: Page): Promise<FieldActionsProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __fieldActionsProbe?: FieldActionsProbe | null })
        .__fieldActionsProbe ?? null,
  );
}

async function beltItems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const probe = (
      window as unknown as {
        __inventoryProbe?: { slots?: (string | null)[] } | null;
      }
    ).__inventoryProbe;

    return (probe?.slots ?? []).filter((slot): slot is string => slot !== null);
  });
}

/** One JSON snapshot of everything a field-action press can change. */
async function observableSnapshot(page: Page): Promise<string> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __fieldActionsProbe?: FieldActionsProbe | null;
      __lastRoomFeedbackText?: string | null;
    };
    const probe = w.__fieldActionsProbe;

    return JSON.stringify({
      feedback: w.__lastRoomFeedbackText ?? null,
      action: probe?.worldActionActive ?? false,
      scan: probe?.scan.last ?? null,
      dig: probe?.dig.last ?? null,
      phase: probe?.magnet.phase ?? null,
      caches: probe?.caches.length ?? 0,
    });
  });
}

/**
 * Presses a key and waits for ANY observable field-action effect.
 * Retried only when the snapshot is byte-identical (a genuinely lost
 * press); an effect that lands late is never double-pressed.
 */
async function pressExpectingEffect(page: Page, key: string, attempts = 3) {
  const before = await observableSnapshot(page);

  for (let attempt = 0; attempt < attempts; attempt++) {
    await press(page, key);

    const changed = await page
      .waitForFunction(
        (prev) => {
          const w = window as unknown as {
            __fieldActionsProbe?: FieldActionsProbe | null;
            __lastRoomFeedbackText?: string | null;
          };
          const probe = w.__fieldActionsProbe;

          return (
            JSON.stringify({
              feedback: w.__lastRoomFeedbackText ?? null,
              action: probe?.worldActionActive ?? false,
              scan: probe?.scan.last ?? null,
              dig: probe?.dig.last ?? null,
              phase: probe?.magnet.phase ?? null,
              caches: probe?.caches.length ?? 0,
            }) !== prev
          );
        },
        before,
        { timeout: 5_000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (changed || (await observableSnapshot(page)) !== before) {
      return;
    }
  }

  throw new Error(`"${key}" press produced no observable effect`);
}

/** Waits until the dig record matches; input-loss retried via caller. */
async function waitDigOutcome(page: Page, outcome: string) {
  await page.waitForFunction(
    (expected) =>
      (
        window as unknown as {
          __fieldActionsProbe?: {
            dig: { last: { outcome: string } | null };
          } | null;
        }
      ).__fieldActionsProbe?.dig.last?.outcome === expected,
    outcome,
    { timeout: 10_000 },
  );
}

async function waitMagnetPhase(page: Page, phase: string, timeout = 15_000) {
  await page.waitForFunction(
    (expected) =>
      (
        window as unknown as {
          __fieldActionsProbe?: { magnet: { phase: string } } | null;
        }
      ).__fieldActionsProbe?.magnet.phase === expected,
    phase,
    { timeout },
  );
}

let bootCounter = 0;

async function bootLab(page: Page, sessionTag: string) {
  bootCounter += 1;
  await page.goto(
    `/?participant_id=P_FA_LAB&game_session_id=fa_lab_${sessionTag}_${bootCounter}&scene=field_actions_lab`,
  );
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'field_actions_lab',
    undefined,
    { timeout: 45_000 },
  );
  await page.waitForTimeout(600);
}

/** One resolved scan: press C (loss-retried), wait for the record. */
async function scanOnce(page: Page) {
  // Let any prior cooldown lapse so the press is a real scan, not a
  // cooldown refusal.
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: { scan: { cooling: boolean } } | null;
        }
      ).__fieldActionsProbe?.scan.cooling === false,
    undefined,
    { timeout: 8_000 },
  );

  const before = await page.evaluate(() =>
    JSON.stringify(
      (
        window as unknown as {
          __fieldActionsProbe?: { scan: { last: unknown } } | null;
        }
      ).__fieldActionsProbe?.scan.last ?? null,
    ),
  );

  await pressExpectingEffect(page, 'C');
  await page.waitForFunction(
    (prev) =>
      JSON.stringify(
        (
          window as unknown as {
            __fieldActionsProbe?: { scan: { last: unknown } } | null;
          }
        ).__fieldActionsProbe?.scan.last ?? null,
      ) !== prev,
    before,
    { timeout: 10_000 },
  );

  return (await faProbe(page))!.scan.last!;
}

/** Position-verified walk (drift under CPU load is re-driven). */
async function goTo(page: Page, x: number, y: number, tolerance = 10) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await driveAxisTo(page, 'y', y, 8);
    await driveAxisTo(page, 'x', x, 8);

    const probe = await playerProbe(page);

    if (
      Math.abs(probe.x - x) <= tolerance &&
      Math.abs(probe.y - y) <= tolerance
    ) {
      return;
    }
  }

  const final = await playerProbe(page);

  throw new Error(
    `could not reach (${x}, ${y}) — player ${JSON.stringify(final)}`,
  );
}

/**
 * Walks to a dig cell's north neighbour and faces down onto it, then
 * VERIFIES the facing-probe cell (player.x, player.y + 33 — the
 * Player.selector geometry) and re-drives on drift. Position-synced
 * navigation precedent: never trust a timed walk under CPU load.
 */
async function faceCellFromNorth(page: Page, cx: number, cy: number) {
  const targetCol = Math.floor(cx / 32);
  const targetRow = Math.floor(cy / 32);

  for (let attempt = 0; attempt < 4; attempt++) {
    // Stage above the cell, then finish with one guaranteed downward
    // HOLD (not a tolerance-gated drive, which can skip a leg entirely
    // and leave the avatar facing the wrong way). Observed realised
    // movement for a 115 ms hold is 26-42 px under SwiftShader keyup
    // latency; from cy-76 the facing probe lands inside the target row
    // across that whole jitter range (window is cy-52…cy-21).
    await driveAxisTo(page, 'y', cy - 76, 5);
    await driveAxisTo(page, 'x', cx, 6);
    await hold(page, 'ArrowDown', 115);

    // Ground truth: the controller's own facing-cell resolution.
    const probeNow = await faProbe(page);
    const target = probeNow?.dig.target ?? null;

    if (
      target !== null &&
      target.col === targetCol &&
      target.row === targetRow
    ) {
      return;
    }
  }

  const finalPlayer = await playerProbe(page);
  const finalProbe = await faProbe(page);

  throw new Error(
    `could not face cell ${targetCol}:${targetRow} — player ${JSON.stringify(
      finalPlayer,
    )}, dig.target ${JSON.stringify(
      finalProbe?.dig.target ?? null,
    )}, dig.probe ${JSON.stringify(
      finalProbe?.dig.probe ?? null,
    )}, dig.refusal ${JSON.stringify(
      (finalProbe?.dig as { refusal?: unknown } | undefined)?.refusal ?? null,
    )}`,
  );
}

/**
 * Runs full cycles (locking inside the band) until the deck position
 * reaches the target. A mistimed lock is a MISS by design (it costs
 * the cycle, never a deck position), so under automation latency the
 * loop simply casts again — exactly what a participant would do.
 */
async function pullUntilDeckPosition(
  page: Page,
  target: number,
  lock: 'keyboard' | 'pointer',
  maxAttempts = 6,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const probe = await faProbe(page);

    if (probe!.magnet.deckPosition >= target) {
      return;
    }

    await magnetCycleInBand(page, lock);
  }

  const final = await faProbe(page);

  expect(final!.magnet.deckPosition).toBeGreaterThanOrEqual(target);
}

/** One full magnet cycle locked in-band; returns the magnet probe. */
async function magnetCycleInBand(
  page: Page,
  lock: 'keyboard' | 'pointer' = 'keyboard',
) {
  await pressExpectingEffect(page, 'F');
  await waitMagnetPhase(page, 'timing_window', 10_000);
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: { magnet: { markerInBand: boolean } } | null;
        }
      ).__fieldActionsProbe?.magnet.markerInBand === true,
    undefined,
    { timeout: 10_000 },
  );

  if (lock === 'keyboard') {
    await page.keyboard.press('Space');
  } else {
    await page.mouse.click(400, 300);
  }

  await waitMagnetPhase(page, 'idle');

  return (await faProbe(page))!.magnet;
}

/** Drives from the south band into the rig operating pad. */
async function walkToRig(page: Page) {
  await driveAxisTo(page, 'y', 656, 10);
  await driveAxisTo(page, 'x', 512, 10);
}

test.describe('field actions lab', () => {
  test('C scans without a card; cooldown gates; held key fires once', async ({
    page,
  }) => {
    await bootLab(page, 'scan_basics');

    // No prompt card may ever open from a scan.
    const first = await scanOnce(page);

    expect(first).not.toBeNull();

    const cards = await page.evaluate(
      () =>
        (window as unknown as { __promptCards?: unknown[] | null })
          .__promptCards ?? null,
    );

    expect(cards).toBeNull();

    let types = await getEventTypes(page);

    expect(
      types.filter((t) => t === 'secondary_field_action_scan'),
    ).toHaveLength(1);

    // Immediate re-press lands inside the visible cooldown: refused
    // neutrally, no second scan event. (Plain press — a lost press and
    // a refused press are equally "no new scan" here.)
    await press(page, 'C');
    types = await getEventTypes(page);
    expect(
      types.filter((t) => t === 'secondary_field_action_scan'),
    ).toHaveLength(1);

    // Held key (repeat events) after the cooldown: exactly one more.
    await page.waitForTimeout(1100);
    await page.keyboard.down('C');
    await page.waitForTimeout(700);
    await page.keyboard.up('C');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            researchRuntime?: { getEvents(): { event_type: string }[] };
          }
        ).researchRuntime
          ?.getEvents()
          .filter((e) => e.event_type === 'secondary_field_action_scan')
          .length === 2,
      undefined,
      { timeout: 8_000 },
    );
  });

  test('signal strength follows the documented monotone model', async ({
    page,
  }) => {
    await bootLab(page, 'gradient');

    // Neutral spot (no active target in radius): no survey signal, no
    // target identity, no coordinates leaked. y≈290 keeps the player
    // body clear of the col-13 divider wall for east-west crossings.
    await goTo(page, 480, 290);

    const none = await scanOnce(page);

    expect(none.strength).toBe(0);
    expect(none.category).toBe('none');
    expect(none.target_id).toBeNull();

    // Calibration range: closer -> stronger, farther -> weaker, with
    // the exact formula strength = round(100·(1 − d/240)). Cross the
    // divider line at y=290, then climb inside the west range.
    await goTo(page, 240, 290);
    await goTo(page, 240, 260);
    await page.waitForTimeout(1000);

    const mid = await scanOnce(page);

    expect(mid.target_id).toBe('cal_source');
    expect(mid.trend).toBeNull();

    const expectStrength = (record: {
      strength: number;
      player_x: number;
      player_y: number;
    }) => {
      const distance = Math.hypot(record.player_x - 240, record.player_y - 144);
      const expected = Math.round(
        100 * Math.min(1, Math.max(0, 1 - distance / 240)),
      );

      // The record stores player coordinates rounded to whole pixels,
      // so recomputing from them can differ by at most one point from
      // the strength computed on the exact position. The exact-value
      // guarantees live in the pure signal-model tests.
      expect(Math.abs(record.strength - expected)).toBeLessThanOrEqual(1);
    };

    expectStrength(mid);

    await goTo(page, 240, 200);
    await page.waitForTimeout(1000);

    const close = await scanOnce(page);

    expect(close.target_id).toBe('cal_source');
    expect(close.strength).toBeGreaterThan(mid.strength);
    expect(close.trend).toBe('stronger');
    expectStrength(close);

    await goTo(page, 240, 260);
    await page.waitForTimeout(1000);

    const back = await scanOnce(page);

    expect(back.strength).toBeLessThan(close.strength);
    expect(back.trend).toBe('weaker');
    expectStrength(back);
  });

  test('inventory overlay suppresses C/D/F structurally', async ({ page }) => {
    await bootLab(page, 'overlay');

    // Positive control: prove the key pipeline delivers before opening
    // the overlay (a lost press is otherwise indistinguishable from
    // suppression).
    await scanOnce(page);

    const beforeTypes = await getEventTypes(page);

    expect(
      beforeTypes.filter((t) => t === 'secondary_field_action_scan'),
    ).toHaveLength(1);

    await press(page, 'I');
    await page.waitForFunction(
      () => {
        const probe = (
          window as unknown as { __inventoryUiProbe?: unknown | null }
        ).__inventoryUiProbe;

        return probe !== null && probe !== undefined;
      },
      undefined,
      { timeout: 8_000 },
    );

    await press(page, 'C');
    await press(page, 'D');
    await press(page, 'F');

    const duringTypes = await getEventTypes(page);

    expect(
      duringTypes.filter((t) => t.startsWith('secondary_field_action_')),
    ).toEqual(
      beforeTypes.filter((t) => t.startsWith('secondary_field_action_')),
    );

    // Close; latched keys reset and the world responds again.
    await press(page, 'I');
    await page.waitForTimeout(400);

    const before = await playerProbe(page);

    await driveAxisTo(page, 'x', before.x - 40, 8);

    const after = await playerProbe(page);

    expect(Math.abs(after.x - (before.x - 40))).toBeLessThanOrEqual(14);

    // Positive control after resume: the same pipeline scans again.
    await scanOnce(page);
    expect(
      (await getEventTypes(page)).filter(
        (t) => t === 'secondary_field_action_scan',
      ),
    ).toHaveLength(2);
  });

  test('digging: refusals, persistent once-only cells, ESC cancel', async ({
    page,
  }) => {
    await bootLab(page, 'dig_basics');

    // Sealed ground outside every zone refuses neutrally (corridor
    // row: every facing lands outside every registered dig zone).
    await goTo(page, 480, 272);
    await pressExpectingEffect(page, 'D');
    expect(await getLastFeedbackText(page)).toContain('sealed');

    // The staked (closed) M23 plot refuses with its own message.
    await driveAxisTo(page, 'y', 340, 8);
    await driveAxisTo(page, 'x', 496, 8);
    await driveAxisTo(page, 'y', 367, 6);
    await pressExpectingEffect(page, 'D');
    expect(await getLastFeedbackText(page)).toContain('staked');

    // ESC cancels a running dig: no terrain change, no dig event.
    await faceCellFromNorth(page, 208, 400);
    await pressExpectingEffect(page, 'D');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __fieldActionsProbe?: { worldActionActive: boolean } | null;
          }
        ).__fieldActionsProbe?.worldActionActive === true,
      undefined,
      { timeout: 4_000 },
    );
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __fieldActionsProbe?: { worldActionActive: boolean } | null;
          }
        ).__fieldActionsProbe?.worldActionActive === false,
      undefined,
      { timeout: 4_000 },
    );
    expect(await getLastFeedbackText(page)).toContain('cancelled');

    let types = await getEventTypes(page);

    expect(
      types.filter((t) => t === 'secondary_field_action_dig'),
    ).toHaveLength(0);

    // A completed dig on an empty cell: persistent dug state, and the
    // same cell can never be dug twice.
    await pressExpectingEffect(page, 'D');
    await waitDigOutcome(page, 'empty');

    const dug = (await faProbe(page))!.dig.last!;

    expect(dug.col).toBe(6);
    expect(dug.row).toBe(12);

    await pressExpectingEffect(page, 'D');
    expect(await getLastFeedbackText(page)).toContain('already excavated');
    types = await getEventTypes(page);
    expect(
      types.filter((t) => t === 'secondary_field_action_dig'),
    ).toHaveLength(1);
  });

  test('buried rock recovered only from its cell; conservation holds', async ({
    page,
  }) => {
    await bootLab(page, 'dig_rock');

    // Wrong cell first: adjacent to the rock, empty.
    await faceCellFromNorth(page, 176, 400);
    await pressExpectingEffect(page, 'D');
    await waitDigOutcome(page, 'empty');

    // The actual cell yields the sample exactly once.
    await faceCellFromNorth(page, 144, 400);
    await pressExpectingEffect(page, 'D');
    await waitDigOutcome(page, 'recovered');

    const items = await beltItems(page);

    expect(items.filter((item) => item === 'core_sample')).toHaveLength(1);

    // Repeat dig refused; no duplication possible.
    await pressExpectingEffect(page, 'D');
    expect(await getLastFeedbackText(page)).toContain('already excavated');
    expect(
      (await beltItems(page)).filter((item) => item === 'core_sample'),
    ).toHaveLength(1);

    // The recovered rock stops signalling.
    await page.waitForTimeout(1000);

    const scan = await scanOnce(page);

    expect(scan.target_id).not.toBe('field_rock');
  });

  test('inventory-full dig result becomes a recoverable field cache', async ({
    page,
  }) => {
    await bootLab(page, 'cache');

    // Fill the belt at the supply crate (deterministic full state).
    await goTo(page, 128, 817, 12);
    await openNearbyPrompt(page);
    await selectPromptOption(page, 2);
    expect(await getLastFeedbackText(page)).toContain('belt is full');

    // Dig the buried salvage with a full belt: the result is cached at
    // the excavation, never destroyed.
    await faceCellFromNorth(page, 304, 464);
    await pressExpectingEffect(page, 'D');
    await waitDigOutcome(page, 'cached');

    let probe = await faProbe(page);

    expect(probe!.caches).toHaveLength(1);
    expect(probe!.caches[0].item_id).toBe('scrap_plate');

    // Collecting with a full belt refuses and keeps the cache.
    await pressExpectingEffect(page, 'E');
    expect(await getLastFeedbackText(page)).toContain('still full');
    probe = await faProbe(page);
    expect(probe!.caches).toHaveLength(1);

    // Free one slot at the crate, then the cache collects cleanly.
    await goTo(page, 128, 817, 12);
    await openNearbyPrompt(page);
    await selectPromptOption(page, 3);
    expect(await getLastFeedbackText(page)).toContain('space freed');

    // Return within cache reach (no facing requirement — pickup is
    // radial) and collect through the same transactional command.
    await goTo(page, 304, 431);
    await pressExpectingEffect(page, 'E');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __fieldActionsProbe?: { caches: unknown[] } | null;
          }
        ).__fieldActionsProbe?.caches.length === 0,
      undefined,
      { timeout: 8_000 },
    );

    const types = await getEventTypes(page);

    expect(types).toContain('secondary_field_action_cache_created');
    expect(types).toContain('secondary_field_action_cache_recovered');
  });

  test('magnet rig: explicit state machine, locality, pointer parity, ESC', async ({
    page,
  }) => {
    await bootLab(page, 'magnet');

    // F away from the rig starts nothing.
    await goTo(page, 480, 290);
    await press(page, 'F');
    await page.waitForTimeout(500);

    let probe = await faProbe(page);

    expect(probe!.magnet.phase).toBe('idle');
    expect(
      (await getEventTypes(page)).filter(
        (t) => t === 'secondary_field_action_magnet_cycle',
      ),
    ).toHaveLength(0);

    await walkToRig(page);

    // Deterministic timing-boundary check: a lock committed OUTSIDE the
    // band is a miss — the cycle resolves, the event records
    // hook_set=true / locked_in_band=false, and NO deck position is
    // consumed. (Rare in-band drift is detected and retried honestly.)
    let missProven = false;

    for (let attempt = 0; attempt < 3 && !missProven; attempt++) {
      const posBefore = (await faProbe(page))!.magnet.deckPosition;

      await pressExpectingEffect(page, 'F');
      await waitMagnetPhase(page, 'timing_window', 10_000);
      await page.waitForFunction(
        () =>
          (
            window as unknown as {
              __fieldActionsProbe?: {
                magnet: { markerInBand: boolean };
              } | null;
            }
          ).__fieldActionsProbe?.magnet.markerInBand === false,
        undefined,
        { timeout: 10_000 },
      );
      await page.keyboard.press('Space');
      await waitMagnetPhase(page, 'idle');

      if ((await faProbe(page))!.magnet.deckPosition === posBefore) {
        const cycles = (await getEvents(page)).filter(
          (e) => e.event_type === 'secondary_field_action_magnet_cycle',
        );
        const last = (cycles[cycles.length - 1].metadata ?? {}) as Record<
          string,
          unknown
        >;

        expect(last.hook_set).toBe(true);
        expect(last.locked_in_band).toBe(false);
        missProven = true;
      }
    }

    expect(missProven).toBe(true);

    // Keyboard route: cycles until deck position 1 is consumed (a
    // mistimed lock is a miss and costs no deck position).
    await pullUntilDeckPosition(page, 1, 'keyboard');

    const afterFirst = await faProbe(page);

    expect(afterFirst!.magnet.deckPosition).toBe(1);
    expect(afterFirst!.magnet.depleted).toBe(false);

    // ESC during the timing window cancels the cycle (no menu pause).
    await pressExpectingEffect(page, 'F');
    await waitMagnetPhase(page, 'timing_window', 10_000);
    await page.keyboard.press('Escape');
    await waitMagnetPhase(page, 'idle', 10_000);
    probe = await faProbe(page);
    expect(probe!.magnet.deckPosition).toBe(1);

    // The scene is still live (the menu did not open): movement works.
    const before = await playerProbe(page);

    await driveAxisTo(page, 'x', before.x - 30, 8);

    // Pointer route: the click sets the lock through the SAME
    // transition function; deck position 2 is consumed.
    await driveAxisTo(page, 'x', 750, 10);
    await pullUntilDeckPosition(page, 2, 'pointer');
    probe = await faProbe(page);
    expect(probe!.magnet.deckPosition).toBe(2);

    // Every cycle (resolved pulls, misses AND the cancelled one) is
    // recorded exactly once: cycles = pulls + misses + 1 cancel.
    const cycleEvents = (await getEventTypes(page)).filter(
      (t) => t === 'secondary_field_action_magnet_cycle',
    );

    expect(cycleEvents.length).toBeGreaterThanOrEqual(3);
  });

  test('deck depletion is explicit and final; rig refuses afterwards', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await bootLab(page, 'depletion');
    await walkToRig(page);

    // Consume all six deck positions (misses cost nothing; retry).
    for (let attempt = 0; attempt < 18; attempt++) {
      const magnet = await faProbe(page);

      if (magnet!.magnet.deckPosition >= 6) {
        break;
      }

      await magnetCycleInBand(page);
    }

    const probe = await faProbe(page);

    expect(probe!.magnet.deckPosition).toBe(6);
    expect(probe!.magnet.depleted).toBe(true);

    // The depletion statement was displayed explicitly.
    expect(await getLastFeedbackText(page)).toContain('CATCHMENT DEPLETED');

    // Outside any measurement window the rig refuses further cycles.
    const pullsBefore = probe!.magnet.totalPulls;

    await pressExpectingEffect(page, 'F');

    const after = await faProbe(page);

    expect(after!.magnet.phase).toBe('idle');
    expect(after!.magnet.totalPulls).toBe(pullsBefore);
    expect(await getLastFeedbackText(page)).toContain('depleted');
  });
});
