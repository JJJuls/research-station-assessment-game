/**
 * Field-actions foundation — provisional measurement-window isolation.
 *
 * Browser verification of the three PROVISIONAL opportunity adapters
 * over the real mechanics: M23 field recovery (hard scan-and-dig), M24
 * magnet utility (explicit depletion signal), M26 depleted search
 * (control vs verified-futile separation). Asserts window gating,
 * event-family ownership on the live stream, missing/invalid handling
 * (reset stays pending — never a low measurement), independence from
 * prior windows, and zero canonical/scoring contact.
 *
 * Every boot uses a fresh session id; window order across tests is
 * deliberately varied (M26 opens first in its test with no M23/M24
 * exposure — no prior item state gates entry).
 */

import { expect, type Page, test } from '@playwright/test';

import type { M23FieldRecoveryForm } from '../src/fieldActions/opportunities/m23FieldRecovery';
import { M23FR_FORMS } from '../src/fieldActions/opportunities/m23FieldRecovery';
import {
  driveAxisTo,
  getEvents,
  getEventTypes,
  getLastPromptBody,
  getSummary,
  hold,
  openNearbyPrompt,
  playerProbe,
  press,
  selectCardByLabel,
} from './helpers';

const FAMILY_PREFIXES = [
  'proto_m23_field_recovery_',
  'proto_m24_magnet_utility_',
  'proto_m26_depleted_search_',
] as const;

interface ValidityRecordLike {
  opportunity_id: string;
  form: string | null;
  offered: boolean;
  entered: boolean;
  completed: boolean;
  validity: string;
}

async function validityRecord(
  page: Page,
  opportunityId: string,
): Promise<ValidityRecordLike | null> {
  return page.evaluate(
    (id) =>
      (
        window as unknown as {
          __measurementValidity?: ValidityRecordLike[] | null;
        }
      ).__measurementValidity?.find((r) => r.opportunity_id === id) ?? null,
    opportunityId,
  );
}

interface ProbeLike {
  worldActionActive: boolean;
  scan: { cooling: boolean; last: { strength: number } | null };
  dig: {
    last: { outcome: string } | null;
    target: { col: number; row: number } | null;
  };
  magnet: {
    phase: string;
    markerInBand: boolean;
    deckPosition: number;
    depleted: boolean;
  };
  windows: { m23_open: boolean; m24_open: boolean; m26_phase: string };
  caches: unknown[];
}

async function faProbe(page: Page): Promise<ProbeLike | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
        .__fieldActionsProbe ?? null,
  );
}

async function observableSnapshot(page: Page): Promise<string> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __fieldActionsProbe?: ProbeLike | null;
      __lastRoomFeedbackText?: string | null;
    };
    const probe = w.__fieldActionsProbe;

    return JSON.stringify({
      feedback: w.__lastRoomFeedbackText ?? null,
      action: probe?.worldActionActive ?? false,
      scan: probe?.scan.last ?? null,
      dig: probe?.dig.last ?? null,
      phase: probe?.magnet.phase ?? null,
    });
  });
}

async function pressExpectingEffect(page: Page, key: string, attempts = 3) {
  const before = await observableSnapshot(page);

  for (let attempt = 0; attempt < attempts; attempt++) {
    await press(page, key);

    const changed = await page
      .waitForFunction(
        (prev) => {
          const w = window as unknown as {
            __fieldActionsProbe?: ProbeLike | null;
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

/** Faces a dig cell from the north (field_actions_lab.spec pattern). */
async function faceCellFromNorth(page: Page, cx: number, cy: number) {
  const targetCol = Math.floor(cx / 32);
  const targetRow = Math.floor(cy / 32);

  for (let attempt = 0; attempt < 4; attempt++) {
    await driveAxisTo(page, 'y', cy - 76, 5);
    await driveAxisTo(page, 'x', cx, 6);
    await hold(page, 'ArrowDown', 115);

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

  throw new Error(`could not face cell ${targetCol}:${targetRow}`);
}

async function waitDigResolved(page: Page) {
  const before = await page.evaluate(() =>
    JSON.stringify(
      (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
        .__fieldActionsProbe?.dig.last ?? null,
    ),
  );

  await pressExpectingEffect(page, 'D');
  await page.waitForFunction(
    (prev) =>
      JSON.stringify(
        (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
          .__fieldActionsProbe?.dig.last ?? null,
      ) !== prev,
    before,
    { timeout: 10_000 },
  );

  return (await faProbe(page))!.dig.last!;
}

async function scanHere(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
        .__fieldActionsProbe?.scan.cooling === false,
    undefined,
    { timeout: 8_000 },
  );

  const before = await page.evaluate(() =>
    JSON.stringify(
      (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
        .__fieldActionsProbe?.scan.last ?? null,
    ),
  );

  await pressExpectingEffect(page, 'C');
  await page.waitForFunction(
    (prev) =>
      JSON.stringify(
        (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
          .__fieldActionsProbe?.scan.last ?? null,
      ) !== prev,
    before,
    { timeout: 10_000 },
  );

  return (await faProbe(page))!.scan.last!;
}

async function waitMagnetPhase(page: Page, phase: string, timeout = 15_000) {
  await page.waitForFunction(
    (expected) =>
      (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
        .__fieldActionsProbe?.magnet.phase === expected,
    phase,
    { timeout },
  );
}

async function magnetCycleInBand(page: Page) {
  await pressExpectingEffect(page, 'F');
  await waitMagnetPhase(page, 'timing_window', 10_000);
  await page.waitForFunction(
    () =>
      (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
        .__fieldActionsProbe?.magnet.markerInBand === true,
    undefined,
    { timeout: 10_000 },
  );
  await page.keyboard.press('Space');
  await waitMagnetPhase(page, 'idle');
}

async function walkToRig(page: Page) {
  await driveAxisTo(page, 'y', 656, 10);
  await driveAxisTo(page, 'x', 512, 10);
}

async function openConsoleExercise(page: Page, label: string) {
  await goTo(page, 320, 817, 12);
  await openNearbyPrompt(page);
  await selectCardByLabel(page, label);
  await page.waitForTimeout(300);
}

let bootCounter = 0;

async function bootLab(page: Page, sessionTag: string) {
  bootCounter += 1;
  await page.goto(
    `/?participant_id=P_FA_MEAS&game_session_id=fa_meas_${sessionTag}_${bootCounter}&scene=field_actions_lab`,
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

function familyOf(eventType: string): string | null {
  for (const prefix of FAMILY_PREFIXES) {
    if (eventType.startsWith(prefix)) {
      return prefix;
    }
  }

  return null;
}

test.describe('field-actions measurement windows', () => {
  test('M23: explicit window, own family only, completion and validity', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await bootLab(page, 'm23');

    // Before the window: general actions emit NO item-family events.
    const preScan = await scanHere(page);

    expect(preScan).not.toBeNull();

    let types = await getEventTypes(page);

    expect(types.filter((t) => familyOf(t) !== null)).toEqual([]);

    // Open the M23 exercise at the console.
    await openConsoleExercise(page, 'Exercise 1 — deep recovery drill');

    const probe = await faProbe(page);

    expect(probe!.windows.m23_open).toBe(true);

    // The recorded counterbalance form determines the target cell.
    const record = await validityRecord(page, 'proto_m23_field_recovery');

    expect(record?.entered).toBe(true);

    const form = record!.form as M23FieldRecoveryForm;
    const cell = M23FR_FORMS[form];
    const cx = cell.col * 32 + 16;
    const cy = cell.row * 32 + 16;

    // Scan inside the plot (several scans are ordinary for this hard
    // window), dig one wrong cell, then recover from the actual cell.
    await goTo(page, 496, 290, 12);
    await scanHere(page);
    await goTo(page, cx, cy - 96, 14);
    await scanHere(page);

    const wrongCx =
      cell.col === 14 ? (cell.col + 2) * 32 + 16 : (cell.col - 2) * 32 + 16;

    await faceCellFromNorth(page, wrongCx, cy);

    const wrongDig = await waitDigResolved(page);

    expect(wrongDig.outcome).toBe('empty');

    await faceCellFromNorth(page, cx, cy);

    const recovery = await waitDigResolved(page);

    expect(['recovered', 'cached']).toContain(recovery.outcome);

    // Completion closes the window explicitly; the plot re-seals.
    await page.waitForFunction(
      () =>
        (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
          .__fieldActionsProbe?.windows.m23_open === false,
      undefined,
      { timeout: 8_000 },
    );

    // Event-family audit on the live stream.
    types = await getEventTypes(page);

    const m23Events = types.filter((t) =>
      t.startsWith('proto_m23_field_recovery_'),
    );

    expect(m23Events).toContain('proto_m23_field_recovery_opportunity_opened');
    expect(
      m23Events.filter((t) => t === 'proto_m23_field_recovery_scan').length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      m23Events.filter((t) => t === 'proto_m23_field_recovery_dig').length,
    ).toBe(2);
    expect(m23Events).toContain('proto_m23_field_recovery_completed');
    expect(m23Events).toContain('proto_m23_field_recovery_closed');

    // No other item family received a single event.
    expect(
      types.filter(
        (t) =>
          t.startsWith('proto_m24_magnet_utility_') ||
          t.startsWith('proto_m26_depleted_search_'),
      ),
    ).toEqual([]);

    // The closed event carries the raw process summary (no scores).
    const events = await getEvents(page);
    const closed = events.find(
      (e) => e.event_type === 'proto_m23_field_recovery_closed',
    );
    const summary = (closed?.metadata ?? {}) as Record<string, unknown>;

    expect(summary.completed).toBe(true);
    expect(summary.form_id).toBe(form);
    expect(summary.exit_status).toBe('completed');
    expect(typeof summary.scan_count).toBe('number');
    expect(typeof summary.dig_attempt_count).toBe('number');
    expect(typeof summary.active_time_ms).toBe('number');

    // Validity register: completed and valid; canonical summary clean.
    const after = await validityRecord(page, 'proto_m23_field_recovery');

    expect(after?.completed).toBe(true);
    expect(after?.validity).toBe('valid');

    const gameSummary = JSON.stringify(await getSummary(page));

    for (const prefix of FAMILY_PREFIXES) {
      expect(gameSummary).not.toContain(prefix);
    }
  });

  test('M23 reset: an unfinished window stays pending — never invalid/low', async ({
    page,
  }) => {
    await bootLab(page, 'm23_reset');
    await openConsoleExercise(page, 'Exercise 1 — deep recovery drill');
    await goTo(page, 496, 290, 12);
    await scanHere(page);
    await openConsoleExercise(page, 'End the active exercise');

    const probe = await faProbe(page);

    expect(probe!.windows.m23_open).toBe(false);

    const events = await getEvents(page);
    const closed = events.find(
      (e) => e.event_type === 'proto_m23_field_recovery_closed',
    );

    expect(
      ((closed?.metadata ?? {}) as Record<string, unknown>).exit_status,
    ).toBe('reset');

    const record = await validityRecord(page, 'proto_m23_field_recovery');

    expect(record?.entered).toBe(true);
    expect(record?.completed).toBe(false);
    expect(record?.validity).toBe('pending');
  });

  test('M24: depletion signal, acknowledgement, post-signal separation, alternative', async ({
    page,
  }) => {
    test.setTimeout(360_000);
    await bootLab(page, 'm24');
    await openConsoleExercise(page, 'Exercise 2 — rig utility drill');

    const opened = await faProbe(page);

    expect(opened!.windows.m24_open).toBe(true);

    // Exhaust the finite deck (misses cost nothing; retry).
    await walkToRig(page);

    for (let attempt = 0; attempt < 18; attempt++) {
      const magnet = await faProbe(page);

      if (magnet!.magnet.deckPosition >= 6) {
        break;
      }

      await magnetCycleInBand(page);
    }

    let types = await getEventTypes(page);

    expect((await faProbe(page))!.magnet.depleted).toBe(true);
    expect(types).toContain('proto_m24_magnet_utility_depletion_shown');

    // Standardised entry state recorded: the deck was untouched when
    // this window opened.
    const openedEvent = (await getEvents(page)).find(
      (e) => e.event_type === 'proto_m24_magnet_utility_opportunity_opened',
    );

    expect(
      ((openedEvent?.metadata ?? {}) as Record<string, unknown>)
        .deck_position_at_open,
    ).toBe(0);

    // Acknowledge at the rig readout (E-station), recorded separately.
    await openNearbyPrompt(page);
    await selectCardByLabel(page, 'Acknowledge the depletion notice');
    await page.waitForTimeout(300);
    types = await getEventTypes(page);
    expect(types).toContain('proto_m24_magnet_utility_depletion_acknowledged');

    // One post-signal cycle: recorded separately, still zero reward.
    await magnetCycleInBand(page);

    const events = await getEvents(page);
    const postCycles = events.filter(
      (e) =>
        e.event_type === 'proto_m24_magnet_utility_cycle' &&
        (e.metadata as Record<string, unknown> | undefined)?.post_signal ===
          true &&
        (e.metadata as Record<string, unknown> | undefined)?.cancelled ===
          false,
    );

    expect(postCycles.length).toBeGreaterThanOrEqual(1);

    for (const cycle of postCycles) {
      expect((cycle.metadata as Record<string, unknown>).item_id).toBeNull();
    }

    // The alternative useful activity is represented separately.
    await goTo(page, 480, 817, 12);
    await openNearbyPrompt(page);
    await selectCardByLabel(page, 'Run a component sort cycle');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            researchRuntime?: { getEvents(): { event_type: string }[] };
          }
        ).researchRuntime
          ?.getEvents()
          .some(
            (e) =>
              e.event_type === 'proto_m24_magnet_utility_alternative_activity',
          ),
      undefined,
      { timeout: 10_000 },
    );

    // Close via console reset: independent of stop/continue behaviour.
    await openConsoleExercise(page, 'End the active exercise');

    const closed = (await getEvents(page)).find(
      (e) => e.event_type === 'proto_m24_magnet_utility_closed',
    );
    const summary = (closed?.metadata ?? {}) as Record<string, unknown>;

    expect(summary.depletion_signal_acknowledged).toBe(true);
    expect(summary.alternative_activity_entered).toBe(true);
    expect(summary.cycle_count_post_signal as number).toBeGreaterThanOrEqual(1);

    const record = await validityRecord(page, 'proto_m24_magnet_utility');

    expect(record?.completed).toBe(true);
    expect(record?.validity).toBe('valid');

    // No cross-family leakage.
    types = await getEventTypes(page);
    expect(
      types.filter(
        (t) =>
          t.startsWith('proto_m23_field_recovery_') ||
          t.startsWith('proto_m26_depleted_search_'),
      ),
    ).toEqual([]);
  });

  test('M26 first (no prior windows): control vs verified-futile separation', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await bootLab(page, 'm26');

    // Opens with NO M23/M24 exposure — nothing gates entry.
    await openConsoleExercise(page, 'Exercise 3 — sector verification drill');

    let probe = await faProbe(page);

    expect(probe!.windows.m26_phase).toBe('control');

    // Control phase: scan INSIDE the control plot + recover the sample
    // (plot-position routing is what separates control acts).
    await goTo(page, 112, 580, 12);
    await scanHere(page);
    await faceCellFromNorth(page, 112, 624);

    const controlDig = await waitDigResolved(page);

    expect(['recovered', 'cached']).toContain(controlDig.outcome);

    probe = await faProbe(page);
    expect(probe!.windows.m26_phase).toBe('futile');

    // A depleted-plot act BEFORE acknowledgement counts separately.
    await faceCellFromNorth(page, 272, 624);

    const preAckDig = await waitDigResolved(page);

    expect(preAckDig.outcome).toBe('empty');

    // Certificate + own verification: the post displays the futility
    // statement on open; the participant acknowledges explicitly.
    await goTo(page, 176, 572, 12);
    await openNearbyPrompt(page);

    // The certificate is the prompt BODY — opening the prompt IS the
    // recorded display of the futility statement.
    expect(await getLastPromptBody(page)).toContain(
      'SECTOR VERIFICATION COMPLETE',
    );

    await selectCardByLabel(page, 'Acknowledge the verification');
    await page.waitForTimeout(300);

    let types = await getEventTypes(page);

    expect(types).toContain('proto_m26_depleted_search_futility_shown');
    expect(types).toContain('proto_m26_depleted_search_futility_acknowledged');
    expect(types).toContain('proto_m26_depleted_search_pre_ack_act');

    // Post-acknowledgement search acts in the verified-empty plot: own
    // event names, zero yield, zero signal (never a concealed reward).
    const beltBefore = await page.evaluate(
      () =>
        (
          window as unknown as {
            __inventoryProbe?: { slots?: (string | null)[] } | null;
          }
        ).__inventoryProbe?.slots?.filter((s) => s !== null).length ?? 0,
    );

    await goTo(page, 272, 590, 12);

    const futileScan = await scanHere(page);

    expect(futileScan.strength).toBe(0);

    await faceCellFromNorth(page, 304, 656);

    const futileDig = await waitDigResolved(page);

    expect(futileDig.outcome).toBe('empty');

    const beltAfter = await page.evaluate(
      () =>
        (
          window as unknown as {
            __inventoryProbe?: { slots?: (string | null)[] } | null;
          }
        ).__inventoryProbe?.slots?.filter((s) => s !== null).length ?? 0,
    );

    expect(beltAfter).toBe(beltBefore);

    types = await getEventTypes(page);
    expect(types).toContain('proto_m26_depleted_search_search_scan');
    expect(types).toContain('proto_m26_depleted_search_search_dig');

    // Control-phase and futile-phase events never blend.
    const controlEvents = types.filter((t) =>
      t.startsWith('proto_m26_depleted_search_control_'),
    );

    expect(controlEvents).toContain('proto_m26_depleted_search_control_scan');
    expect(controlEvents).toContain('proto_m26_depleted_search_control_dig');
    expect(controlEvents).toContain(
      'proto_m26_depleted_search_control_completed',
    );

    // Close; the observation is complete and valid.
    await openConsoleExercise(page, 'End the active exercise');

    const record = await validityRecord(page, 'proto_m26_depleted_search');

    expect(record?.completed).toBe(true);
    expect(record?.validity).toBe('valid');

    // No cross-family leakage in the whole session.
    expect(
      types.filter(
        (t) =>
          t.startsWith('proto_m23_field_recovery_') ||
          t.startsWith('proto_m24_magnet_utility_'),
      ),
    ).toEqual([]);
  });
});
