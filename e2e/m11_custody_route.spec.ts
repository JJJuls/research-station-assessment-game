/**
 * Station 080 M11 — borrowed-instrument custody on the participant route
 * (Unit 3, browser). Real navigation and real prompt input.
 *
 * Test 1: Kai's briefing offers the field probe; the loan is TAKEN
 * deliberately (option 2 — the pre-focused option 1 is the plain
 * acknowledgement), the signal analysis workstation (the named return
 * point) takes it back before departure (resolved); Noor's briefing offers
 * the torque driver (taken, option 2), the participant finishes outside
 * and walks back in with it (unresolved at the first departure), then
 * hands it to Kai on the way back (a late, named handover — companion
 * only). The exported raw family reproduces 1 unresolved / 2 accepted
 * accessible through the read-only extractor.
 *
 * Test 2: the loan is REFUSED (option 3); leaving the laboratory through
 * the Concourse door (a room transition) creates no custody and no
 * departure record; the extractor yields `declined`, never a zero.
 *
 * No participant-visible study identifier anywhere.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  eventsByPrefix,
  eventsByType,
  FORBIDDEN_TEXT,
} from './exteriorHelpers';
import { selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToWorkshop,
  concourseVia,
  dockToConcourse,
  expectStage,
  labApproach,
  labVia,
  openPromptAt,
  PILOT,
  useDoor,
  valeHandover,
  workshopSignOff,
  workshopToConcourse,
  yardApproach,
} from './pilotHelpers';

type PageT = import('@playwright/test').Page;

async function promptLabels(page: PageT) {
  return page.evaluate(
    () =>
      (
        window as unknown as { __promptCards?: { label: string }[] | null }
      ).__promptCards?.map((card) => card.label) ?? [],
  );
}

async function lastPromptBody(page: PageT) {
  return page.evaluate(
    () =>
      (window as unknown as { __lastPromptBody?: string | null })
        .__lastPromptBody ?? '',
  );
}

/** Dock → Concourse → Workshop → Concourse → Laboratory door → Kai's briefing prompt (open). */
async function routeToKaiBriefing(page: PageT) {
  await dockToConcourse(page);
  await valeHandover(page);
  await concourseToWorkshop(page);
  await workshopSignOff(page);
  await workshopToConcourse(page);
  await concourseVia(
    page,
    PILOT.concourse.northDoor.x,
    PILOT.concourse.northDoor.y + 56,
  );
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: await labApproach(page, PILOT.lab.kai),
  });
}

test.describe('M11 borrowed instruments on the route', () => {
  test('probe taken and returned at the workstation; driver taken, carried out unresolved, handed to Kai late; reproduced feature', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'm11');
    await completeDockTutorial(page, 1);
    await routeToKaiBriefing(page);

    // The plain acknowledgement is option 1; the loan is option 2.
    const briefing = await promptLabels(page);

    expect(briefing).toEqual([
      'Understood.',
      'Understood — and I will take the probe.',
      'Understood — no need for the probe.',
    ]);
    expect(await lastPromptBody(page)).not.toMatch(FORBIDDEN_TEXT);
    await selectPromptOption(page, 2);
    await expectStage(page, 'lab_work');

    const started = await eventsByType(
      page,
      'proto_m11_custody_custody_started',
    );

    expect(started).toHaveLength(1);
    expect(started[0]?.metadata?.occasion).toBe('lab');
    expect(
      (await eventsByType(page, 'proto_m11_custody_offer_presented')).length,
    ).toBe(1);

    // Kai offers the hand-back while the probe is carried (last option).
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: await labApproach(page, PILOT.lab.kai),
    });
    expect(await promptLabels(page)).toContain(
      'Hand the field probe back to Kai.',
    );
    await selectPromptOption(page, 2); // "Still working on it."
    await page.waitForTimeout(300);
    expect(
      (await eventsByType(page, 'proto_m11_custody_owner_available')).length,
    ).toBeGreaterThanOrEqual(1);

    // The workstation (named return point) takes the probe back:
    // resolved before departure.
    const wsApproach = await labApproach(page, PILOT.lab.workstation);

    await labVia(
      page,
      PILOT.lab.workstation.x + wsApproach.x,
      PILOT.lab.workstation.y + wsApproach.y,
    );
    await openPromptAt(page, PILOT.lab.workstation, {
      approachOffset: wsApproach,
    });
    expect(await promptLabels(page)).toEqual([
      'Back to the bench.',
      'Leave the field probe on the workstation.',
    ]);
    await selectPromptOption(page, 2);
    await page.waitForTimeout(300);
    expect(
      (await eventsByType(page, 'proto_m11_custody_return_point_available'))
        .length,
    ).toBe(1);

    const resolved = await eventsByType(page, 'proto_m11_custody_resolved');

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.metadata).toMatchObject({
      occasion: 'lab',
      method: 'return_point',
      to: 'workstation',
    });

    // Kai "done" → airlock → Noor's briefing: the driver is TAKEN (option 2).
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: await labApproach(page, PILOT.lab.kai),
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'exterior_briefing');
    await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
      approachOffset: await labApproach(page, PILOT.lab.airlock),
    });

    const departed = await eventsByType(page, 'proto_m11_custody_departed');

    expect(departed).toHaveLength(1);
    expect(departed[0]?.metadata).toMatchObject({
      occasion: 'lab',
      unresolved: false,
    });

    await openPromptAt(page, PILOT.yard.noor, {
      approachOffset: await yardApproach(page, PILOT.yard.noor),
    });
    expect(await promptLabels(page)).toEqual([
      'Ready.',
      'Ready — and I will take the driver.',
      'Ready — no need for the driver.',
    ]);
    await selectPromptOption(page, 2);
    await expectStage(page, 'exterior_work');
    // M05 (Unit 6): Noor's extra flag job follows "Ready"; declined here.
    await page.waitForTimeout(450);
    await selectPromptOption(page, 2);
    await page.waitForTimeout(300);
    expect(
      (await eventsByType(page, 'proto_m11_custody_custody_started')).length,
    ).toBe(2);

    // Noor offers the hand-back while the driver is carried; the
    // participant finishes outside without giving it back.
    await openPromptAt(page, PILOT.yard.noor, {
      approachOffset: await yardApproach(page, PILOT.yard.noor),
    });
    expect(await promptLabels(page)).toContain(
      'Hand the torque driver back to Noor.',
    );
    await selectPromptOption(page, 2); // "I am finished outside."
    await expectStage(page, 'return_hub');
    await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
      approachOffset: await yardApproach(page, PILOT.yard.airlock),
    });

    const departedAll = await eventsByType(page, 'proto_m11_custody_departed');

    expect(departedAll).toHaveLength(2);
    expect(departedAll[1]?.metadata).toMatchObject({
      occasion: 'yard',
      unresolved: true,
    });

    // Back in the Laboratory: Kai takes Noor's driver (late, named).
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: await labApproach(page, PILOT.lab.kai),
    });

    const labels = await promptLabels(page);

    expect(labels).toContain("Hand Noor's torque driver to Kai.");
    await selectPromptOption(
      page,
      labels.indexOf("Hand Noor's torque driver to Kai.") + 1,
    );
    await page.waitForTimeout(300);

    const late = await eventsByType(page, 'proto_m11_custody_late_resolved');

    expect(late).toHaveLength(1);
    expect(late[0]?.metadata).toMatchObject({
      occasion: 'yard',
      method: 'named_handover',
      to: 'kai',
    });
    expect(
      (await eventsByType(page, 'proto_m11_custody_window_closed')).length,
    ).toBe(2);

    // Independent reproduction from the raw family alone.
    const family = (await eventsByPrefix(
      page,
      'proto_m11_custody_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M11', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      feature_id: 'm11_unresolved_custodies',
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
      closure_reason: 'completed',
      included_ids: ['m11_custody_lab', 'm11_custody_yard'],
    });
    expect(rows[0].components).toMatchObject({
      late_resolutions: 1,
      untaken: 0,
      declined: 0,
    });

    const records = rows[1].value as {
      lab: { resolution: { method: string } | null };
      yard: {
        unresolved_at_departure: boolean;
        late_resolution: { to: string } | null;
      };
    };

    expect(records.lab.resolution?.method).toBe('return_point');
    expect(records.yard.unresolved_at_departure).toBe(true);
    expect(records.yard.late_resolution?.to).toBe('kai');
    expectNoRuntimeErrors(errors);
  });

  test('a refused loan: no custody, the Concourse-door exit records no departure, the item is declined (never a zero)', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'm11d');
    await completeDockTutorial(page, 1);
    await routeToKaiBriefing(page);
    await selectPromptOption(page, 3); // "Understood — no need for the probe."
    await expectStage(page, 'lab_work');

    const answered = await eventsByType(
      page,
      'proto_m11_custody_offer_answered',
    );

    expect(answered).toHaveLength(1);
    expect(answered[0]?.metadata).toMatchObject({
      occasion: 'lab',
      accepted: false,
    });
    expect(
      (await eventsByType(page, 'proto_m11_custody_custody_started')).length,
    ).toBe(0);

    // No hand-back is offered without a custody.
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: await labApproach(page, PILOT.lab.kai),
    });
    expect(await promptLabels(page)).not.toContain(
      'Hand the field probe back to Kai.',
    );
    await selectPromptOption(page, 2); // "Still working on it."
    await page.waitForTimeout(300);

    // A room transition through the Concourse door: no departure record.
    await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
      approachOffset: await labApproach(page, PILOT.lab.southDoor),
    });
    expect(
      (await eventsByType(page, 'proto_m11_custody_departed')).length,
    ).toBe(0);

    const family = (await eventsByPrefix(
      page,
      'proto_m11_custody_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M11', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'declined',
    });
    expect(rows[0].components).toMatchObject({ declined: 1, untaken: 0 });
    expectNoRuntimeErrors(errors);
  });
});
