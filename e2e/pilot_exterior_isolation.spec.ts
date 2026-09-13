/**
 * Exterior Recovery — isolation / adversarial route checks (evidence-led
 * pilot v2, Unit 4).
 *
 * 1. No task's outcome gates another opportunity: with the coupling never
 *    opened, M23 begins; with M23 never opened, M24 runs; with M24 fresh
 *    (never begun), M26 runs; with the mast never accepted, everything
 *    still works — and every site stays enterable in any order. C and D
 *    outside the M23 window create no M23 primary event; F outside the
 *    rig pad (and before the M24 window) cannot start a cycle or open
 *    the window; every window that was never entered stays honestly
 *    pending, never low.
 * 2. Direct developer launch (`?scene=exterior_recovery_yard`) is a
 *    developer session: the route windows are contaminated (invalid),
 *    never a valid participant exposure.
 */
import { expect, test } from '@playwright/test';

import {
  beginExcavation,
  captureErrors,
  enterYard,
  eventsByPrefix,
  eventsByType,
  expectNoRuntimeErrors,
  exteriorProbe,
  faProbe,
  finishOutside,
  itemStatus,
  lastFeedback,
  magnetCycle,
  openSite,
  OPPORTUNITY,
  powerUpUplink,
  scanAt,
  standOnPad,
  startSalvageTally,
  transmitAt,
  validityRecord,
  waitDisconnect,
  YARD,
} from './exteriorHelpers';
import { hold, press, selectPromptOption } from './helpers';
import {
  bootPilotScene,
  pilotCoverage,
  pilotProbe,
  yardVia,
} from './pilotHelpers';

test.describe('exterior recovery — isolation (Unit 4)', () => {
  test('1. no outcome gates another opportunity; C/D/F outside their windows never create primary evidence; untouched windows stay pending', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await enterYard(page, 'iso');

    const form = (await exteriorProbe(page)).m23_form;
    const spots = YARD.scanSpots[form];
    // ——— General C/D outside any window: secondary only. ———
    // World V2 strip: open apron floor on the west half, > 500 px from
    // either target cell (the former (400,380) lies in the strip's hull
    // band — a 25×19-yard coordinate).
    await scanAt(page, { x: 400, y: 250 });
    expect((await faProbe(page)).scan.last?.category).toBe('none');
    await press(page, 'd');
    await page.waitForTimeout(500);
    expect(await lastFeedback(page)).toContain('sealed');
    expect(await eventsByPrefix(page, 'proto_m23_field_recovery_')).toEqual(
      expect.arrayContaining([]),
    );
    expect(
      (await eventsByPrefix(page, 'proto_m23_field_recovery_')).filter(
        (e) => !e.event_type.endsWith('_presented'),
      ),
    ).toHaveLength(0);
    expect(
      (await eventsByType(page, 'secondary_field_action_scan')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'secondary_field_action_refusal')).length,
    ).toBe(1);

    // Inside the staked field before the window: refused, never a fake reading.
    // (East half — through the drift pass with the pass-aware driver.)
    await yardVia(page, spots.actionable.x, spots.actionable.y);
    await press(page, 'c');
    await page.waitForTimeout(600);
    expect(await lastFeedback(page)).toContain('stake panel');
    expect((await faProbe(page)).scan.last?.category).toBe('none'); // unchanged
    // The dig target is null before the window, so face the cell below
    // with a plain tap (the actionable spot's southern neighbour is inside
    // the field for both forms).
    await hold(page, 'ArrowDown', 45);
    await page.waitForTimeout(150);
    await press(page, 'd');
    await page.waitForTimeout(600);
    expect(await lastFeedback(page)).toContain('stake panel');
    expect((await faProbe(page)).dig.last).toBeNull();

    // ——— F off the pad / before the window: nothing. ———
    await press(page, 'f');
    await page.waitForTimeout(500);
    expect((await faProbe(page)).magnet.phase).toBe('idle');
    await standOnPad(page);
    await press(page, 'f');
    await page.waitForTimeout(600);
    expect((await faProbe(page)).magnet.phase).toBe('idle');
    expect(await lastFeedback(page)).toContain('rig panel');
    expect((await faProbe(page)).windows.m24_open).toBe(false);
    expect(
      (await eventsByPrefix(page, 'proto_m24_magnet_utility_')).filter(
        (e) => !e.event_type.endsWith('_presented'),
      ),
    ).toHaveLength(0);

    // ——— M24 with M23 and M19 never opened. ———
    await startSalvageTally(page);
    await standOnPad(page);
    await magnetCycle(page, true);
    expect((await faProbe(page)).magnet.deckPosition).toBe(1);
    expect((await validityRecord(page, OPPORTUNITY.m24)).entered).toBe(true);
    expect(
      (await validityRecord(page, OPPORTUNITY.m24)).prior_exposure,
    ).toEqual([]);

    // ——— M26 with M24 open-but-not-depleted (fresh knowledge state). ———
    await powerUpUplink(page);
    await transmitAt(page, 'uplinkA');
    await waitDisconnect(page);
    expect((await exteriorProbe(page)).m26.knowledge).toBe(
      'disconnected_unacknowledged',
    );
    expect((await exteriorProbe(page)).m24.knowledge).toBe('not_depleted');
    // M26's disconnect knowledge is its own: nothing on the M24 register.
    expect(
      (await validityRecord(page, OPPORTUNITY.m26)).prior_exposure,
    ).toEqual([]);
    expect(
      (await eventsByPrefix(page, 'proto_m26_channel_')).every(
        (e) => e.metadata?.measure_id === 'M26',
      ),
    ).toBe(true);

    // ——— M23 with M19 never opened and M20 never accepted. ———
    await beginExcavation(page);
    expect((await faProbe(page)).windows.m23_open).toBe(true);
    expect((await validityRecord(page, OPPORTUNITY.m23)).entered).toBe(true);

    // The M23 entry snapshot is identical whatever else happened: the
    // opened event names no other item.
    const m23Open = (
      await eventsByType(page, 'proto_m23_field_recovery_opportunity_opened')
    )[0];

    expect(JSON.stringify(m23Open.metadata?.entry_state_snapshot)).not.toMatch(
      /m19|m20|m24|m26|M19|M20|M24|M26/,
    );

    // ——— Coupling / mast never touched: pending on the register. ———
    expect(await itemStatus(page, 'M19')).toBe('pending');
    expect(await itemStatus(page, 'M20')).toBe('pending');
    expect((await validityRecord(page, OPPORTUNITY.m19)).entered).toBe(false);
    expect((await validityRecord(page, OPPORTUNITY.m19)).offered).toBe(true);
    expect((await validityRecord(page, OPPORTUNITY.m20)).entered).toBe(false);

    // The beacon still guides to the FIRST unfinished site — never a gate.
    expect((await pilotProbe(page))?.beacon?.label).toBe(
      'Frozen Coolant Coupling',
    );
    await openSite(page, 'coupling');
    await selectPromptOption(page, 4); // step away without acting
    await page.waitForTimeout(300);
    expect((await validityRecord(page, OPPORTUNITY.m19)).entered).toBe(false);

    // Shift end: never-entered windows stay pending (closed at the
    // review as absent), entered ones close honestly, nothing is low.
    await finishOutside(page);
    expect(await itemStatus(page, 'M19')).toBe('pending');
    expect(await itemStatus(page, 'M20')).toBe('pending');
    expect(await itemStatus(page, 'M23')).toBe('completed'); // stopped observation
    expect(await itemStatus(page, 'M24')).toBe('censored'); // never depleted (validity: missing)
    expect(await itemStatus(page, 'M26')).toBe('invalid'); // not acknowledged
    expect((await validityRecord(page, OPPORTUNITY.m24)).invalid_reason).toBe(
      'censored',
    );
    expect(
      (await eventsByPrefix(page, 'proto_m19_valve_')).filter(
        (e) => e.event_type !== 'proto_m19_valve_presented',
      ),
    ).toHaveLength(0);
    expect(
      (await eventsByPrefix(page, 'proto_m20_antenna_')).filter(
        (e) => e.event_type !== 'proto_m20_antenna_presented',
      ),
    ).toHaveLength(0);
    expectNoRuntimeErrors(errors);
  });

  test('2. a direct developer launch of the yard never fabricates a valid participant exposure', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const errors = captureErrors(page);

    await bootPilotScene(page, 'devyard', 'exterior_recovery_yard');

    const coverage = await pilotCoverage(page);

    expect(coverage?.launch_mode).toBe('developer');
    expect(coverage?.developer_scenes_visited).toContain(
      'exterior_recovery_yard',
    );

    for (const id of Object.values(OPPORTUNITY)) {
      const record = await validityRecord(page, id);

      expect(record.validity, id).toBe('invalid');
      expect(record.invalid_reason, id).toBe('contamination');
      expect(
        record.prior_exposure.some((note) =>
          note.startsWith('contamination:developer_scene:'),
        ),
      ).toBe(true);
    }

    // The scene is still a working room (developer verification), but no
    // participant stage exists: Noor redirects, the sites stay usable.
    expect((await pilotProbe(page))?.launch_mode).toBe('developer');
    await openSite(page, 'coupling');
    await selectPromptOption(page, 4);
    expect((await exteriorProbe(page)).m19.entered).toBe(false);
    expectNoRuntimeErrors(errors);
  });
});
