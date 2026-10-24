import { expect, type Page, test } from '@playwright/test';

import { M09_OFFER_LABELS } from '../src/pilot/windows/m09WatchModel';
import { M10_OFFER_LABELS } from '../src/pilot/windows/m10DeliveryModel';
import { APPROACH, ensureOutsideCompound, YARD } from './exteriorHelpers';
import { getEvents, press, selectPromptOption } from './helpers';
import { pipeProbe, waitPipeOpen } from './ipHelpers';
import {
  bootJourney,
  captureErrors,
  completeDockTutorial,
  eventCount,
  expectNoRuntimeErrors,
  expectSessionMetadata,
  missionState,
  openStationAlcove,
  waitForEventCount,
} from './journey';
import {
  bootPilot,
  concourseToWorkshop,
  concourseVia,
  dockToConcourse,
  expectStage,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  promptLabels,
  registryApproach,
  routeToWorkshopWork,
  selectPromptLabel,
  useDoor,
  workshopToConcourse,
  workshopVia,
  yardVia,
} from './pilotHelpers';
import { surface, waitSurface, workshopApproach } from './returnHelpers';
import {
  boardFirstCard,
  concourseToLab,
  couponOneAndBench,
  episode1Engaged,
  episode2Engaged,
  openKai,
  openNoor,
  openVale,
  qualityPacket1,
  reloadToDock,
  replayToWorkshopReturn,
  supportConsole,
  valeChainAccept,
} from './u24Helpers';

/**
 * ADV-2 (Sprint B Part 1, docs/testing/ADVERSARIAL-JOURNEY-PLAN.md):
 * reload during partial room state. A participant fails the repair once
 * (partial task state: failure recorded in the module-scope store, room
 * incomplete) and then the page reloads mid-room — the realistic
 * mid-session refresh/crash-recovery scenario. Documented semantics
 * (STATE-AND-SESSION-CONTINUITY.md): module-scope stores and the event log
 * reset on reload; URL-derived metadata persists. The scientific risk is a
 * PHANTOM abandon/return classification crossing the reload boundary —
 * repair_returned_after_failure must NOT fire on the post-reload entry,
 * because the failure evidence died with the previous JS session.
 */

const PARAMS = {
  participant_id: 'ADV2_P1',
  game_session_id: 'ADV2_S1',
  condition: 'adv_reload',
  scene: 'repair',
};

test.describe('adversarial: reload during partial room state', () => {
  test('mid-room reload resets task state without phantom return-after-failure', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    // — Direct room launch, then a single failure (partial state) —
    await bootJourney(page, PARAMS, 'repair');
    await openStationAlcove(page); // repair panel prompt

    const failuresBefore = await eventCount(page, 'repair_failed');

    await selectPromptOption(page, 1); // default sequence -> deterministic failure
    await waitForEventCount(
      page,
      'repair_failed',
      undefined,
      failuresBefore + 1,
    );

    const preReload = await getEvents(page);

    expect(
      preReload.filter((e) => e.event_type === 'repair_failed').length,
    ).toBe(1);
    expect(preReload.map((e) => e.event_type)).not.toContain(
      'repair_completed',
    );

    // — Full reload on the same URL (fresh JS session, same launch params) —
    await bootJourney(page, PARAMS, 'repair');

    const postReload = await getEvents(page);
    const postTypes = postReload.map((e) => e.event_type);

    // Fresh append-only log: one session_start, first in the log; the
    // pre-reload failure is gone (raw logs are per-JS-session by design).
    expect(postTypes.indexOf('session_start')).toBe(0);
    expect(postTypes.filter((t) => t === 'session_start').length).toBe(1);
    expect(postTypes).not.toContain('repair_failed');

    // The room re-entered normally — and WITHOUT a phantom
    // return-after-failure: the module-scope failure state must not
    // survive the reload (no cross-boundary Q24/Q25 classification).
    expect(postTypes.filter((t) => t === 'repair_room_entered').length).toBe(1);
    expect(postTypes).not.toContain('repair_returned_after_failure');
    expect(postTypes).not.toContain('repair_abandoned');

    // URL-derived identity persists across the reload.
    expectSessionMetadata(postReload, {
      participant_id: 'ADV2_P1',
      game_session_id: 'ADV2_S1',
      condition: 'adv_reload',
    });

    // Mission state is fully reset (completed_rooms empty, room tracked).
    const stateAfterReload = await missionState(page);

    expect(stateAfterReload.current_room_id).toBe('systems_repair_room');
    expect(stateAfterReload.completed_rooms).toEqual([]);

    // — The session continues normally after the reload —
    await openStationAlcove(page);
    await selectPromptOption(page, 2); // consult the manual
    await waitForEventCount(page, 'repair_manual_used', undefined, 1);
    await press(page, 'Space'); // dismiss feedback, re-open the prompt
    await selectPromptOption(page, 3); // revised sequence -> completion
    await waitForEventCount(page, 'repair_completed', undefined, 1);

    const finalEvents = await getEvents(page);
    const finalTypes = finalEvents.map((e) => e.event_type);

    expect(finalTypes.filter((t) => t === 'repair_completed').length).toBe(1);
    // Still no phantom failure-family events from the pre-reload session.
    expect(finalTypes).not.toContain('repair_failed');
    expect(finalTypes).not.toContain('repair_returned_after_failure');

    const stateAfterCompletion = await missionState(page);

    expect(stateAfterCompletion.completed_rooms).toEqual([
      'systems_repair_room',
    ]);

    expectNoRuntimeErrors(capture);
  });
});

/* ================================================================== *
 * U24 RL-1 — the reload check at availability, in the browser
 * (`RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4, §8 R1–R4 and R6, §9):
 * genuine `page.reload()`s, ordinary input through the existing route
 * drivers. R1 an earlier opening is held at its availability, never re-run,
 * the check written before any opening; R2 a load with nothing opened
 * earlier administers normally; R3 an unverified earlier state (the store's
 * meta record removed before the reload — fault-injected, the M07 S-M07f
 * mechanism) holds every station and administers nothing; R4 one check per
 * family per load; R6 the screens (the existing H lines unchanged, the §9
 * U / M lines exact), each screenshot kept with the run's output.
 * ================================================================== */

const RL1_FAMILY = {
  M01: 'proto_m01_batch_',
  M02: 'proto_m02_workspace_',
  M03: 'proto_m03tools_',
  M04: 'proto_m04_cutting_',
  M06: 'proto_m06_orders_',
  M08: 'proto_m08_effort_',
  M12: 'proto_m12_check_',
  M13: 'proto_m13_networks_',
} as const;

type Rl1Item = keyof typeof RL1_FAMILY;

/** The existing held-back lines (r3 §9: kept unchanged). */
const RL1_H_STATUS = {
  M01: 'This batch was already opened earlier in this session. Its record is held; it does not run again.',
  M06: 'This console was already used earlier in this session. Its record is held; it does not run again.',
  M08: 'This console was already used in an earlier session load. Its record is held; it does not run again.',
  M12: 'This packet was opened earlier in this session. Its record is held; it does not run again.',
  M13: 'This bench was already used in this session. Its record is kept; nothing further is recorded here.',
} as const;

/** The owner's U / M lines (r3 §9, D-5), with each station's noun. */
const rl1ULines = (station: string) => [
  `The earlier state of this ${station} could not be verified.`,
  'It stays closed after this reload.',
];

interface Rl1Event {
  event_type: string;
  sequence?: number;
  page_load_index?: number;
  metadata?: Record<string, unknown>;
}

interface Rl1Envelope {
  page_load_index: number;
  raw_events: Rl1Event[];
  prior_page_load_events: Rl1Event[];
  event_integrity: Record<string, unknown>;
  measurement_validity: unknown;
}

/** The runtime's own export builder read in the page (a harness read). */
async function rl1Payload(page: Page): Promise<Rl1Envelope> {
  const json = await page.evaluate(`(async () => {
    const mod = await import('/src/systems/index.ts');
    return JSON.stringify(mod.researchRuntime.buildExportPayload());
  })()`);

  return JSON.parse(json as string) as Rl1Envelope;
}

/** The validity record of one opportunity, wherever the export nests it. */
function rl1Validity(
  envelope: Rl1Envelope,
  opportunityId: string,
): Record<string, unknown> | null {
  const seen: unknown[] = [envelope.measurement_validity];

  while (seen.length > 0) {
    const value = seen.pop();

    if (Array.isArray(value)) {
      seen.push(...value);
    } else if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>;

      if (record.opportunity_id === opportunityId) {
        return record;
      }

      seen.push(...Object.values(record));
    }
  }

  return null;
}

const rl1Own = (events: readonly Rl1Event[], item: Rl1Item) =>
  events.filter((event) => event.event_type.startsWith(RL1_FAMILY[item]));
const rl1Suffix = (event: Rl1Event, item: Rl1Item) =>
  event.event_type.slice(RL1_FAMILY[item].length);
const rl1Opening = (item: Rl1Item) =>
  item === 'M13' ? 'series_opened' : 'opportunity_opened';

/**
 * R1 / R3: the family's ONE check of this load, written before any of its
 * markers, and no opening of the family in this load. Returns the check.
 */
function expectHeld(
  events: readonly Rl1Event[],
  item: Rl1Item,
  detail: RegExp,
): Record<string, unknown> {
  const own = rl1Own(events, item);
  const checks = own.filter(
    (event) => rl1Suffix(event, item) === 'prior_load_checked',
  );
  const markers = own.filter(
    (event) => rl1Suffix(event, item) === 'technical_failure',
  );

  expect(checks, `${item}: one check in this load`).toHaveLength(1);
  expect(
    own.filter((event) => rl1Suffix(event, item) === rl1Opening(item)),
    `${item}: nothing administered in this load`,
  ).toEqual([]);
  expect(markers.length, `${item}: held at availability`).toBeGreaterThan(0);

  for (const marker of markers) {
    expect(String(marker.metadata?.detail), `${item} marker`).toMatch(detail);
    expect(marker.sequence ?? 0).toBeGreaterThan(checks[0].sequence ?? 0);
  }

  return checks[0].metadata ?? {};
}

/** The minimal replay's cards: declines, defers and route beats only. */
const RL1_CARDS = [
  'Handover confirmed — what is next?',
  M09_OFFER_LABELS.decline,
  M10_OFFER_LABELS.d1.decline,
  'No — leave the lamp job.',
  'No — leave the flag job.',
  'Understood — no need for the probe.',
  'Ready — no need for the driver.',
  'Heading to the workshop.',
  'Understood.',
  'Ready.',
] as const;

async function rl1AnswerBy(page: Page, limit = 8) {
  for (let step = 0; step < limit; step += 1) {
    await page.waitForTimeout(450);

    const labels = await promptLabels(page);

    if (labels.length === 0) {
      return;
    }

    const choice = RL1_CARDS.find((label) => labels.includes(label));

    if (choice === undefined) {
      throw new Error(`RL-1 replay: no expected card among ${labels}`);
    }

    await selectPromptLabel(page, choice);
    await page.waitForTimeout(400);
  }
}

async function rl1Stage(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __pilotProbe?: { stage: string } | null })
        .__pilotProbe?.stage ?? null,
  );
}

/** After a reload: the Dock, then Vale's briefing (M01 o1, M12 o1 presented). */
async function rl1ReplayToWorkshopStage(page: Page) {
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await rl1AnswerBy(page);

  if ((await rl1Stage(page)) !== 'workshop') {
    await openVale(page);
    await rl1AnswerBy(page);
  }

  await expectStage(page, 'workshop');
}

/** Opens a work surface at a station's approach point (E, retried). */
async function rl1OpenSurface(
  page: Page,
  approach: { x: number; y: number },
  id: string,
  via: (x: number, y: number) => Promise<void>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await via(approach.x, approach.y);
    await interactAt(page, approach, { approachOffset: { x: 0, y: 0 } });

    if (
      await waitSurface(page, true, id).then(
        () => true,
        () => false,
      )
    ) {
      await page.waitForTimeout(500);

      return;
    }
  }

  throw new Error(`surface ${id} did not open`);
}

/** The open surface's status, its screenshot kept, then ESC. */
async function rl1ReadAndLeave(
  page: Page,
  shot: string,
  absent: readonly string[] = [],
): Promise<string> {
  await page.screenshot({ path: test.info().outputPath(`${shot}.png`) });

  const probe = await surface(page);
  const status = probe?.status ?? '';

  // Elements that must not cover the status lines.
  for (const id of absent) {
    expect(
      probe?.elements.some((element) => element.id === id),
      `${shot}: ${id}`,
    ).toBe(false);
  }

  await press(page, 'Escape');
  await waitSurface(page, false);

  return status;
}

async function rl1Lattice(page: Page, shot: string): Promise<string[]> {
  await workshopVia(page, 1193, 250);
  await interactAt(page, PILOT.workshop.latticeBench, {
    approachOffset: { x: 0, y: -50 },
  });
  await waitPipeOpen(page, true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: test.info().outputPath(`${shot}.png`) });

  const lines = (await pipeProbe(page)).lines;

  await press(page, 'Escape');
  await waitPipeOpen(page, false);

  return lines;
}

const RL1_CONCOURSE = {
  planBoard: registryApproach('concourse.plan_board'),
  packet1: registryApproach('concourse.qc_packet_o1'),
} as const;
const RL1_WORKSHOP = {
  console: registryApproach('workshop.dispatch_console'),
  packet2: registryApproach('workshop.qc_packet_o2'),
} as const;

/** Workshop sign-off → laboratory → yard (stage `exterior_work`). */
async function rl1WorkshopToYardWork(
  page: Page,
  options: { signedOff?: boolean } = {},
) {
  // From the Workshop (stage `workshop_work`), or — once the shift is
  // signed off and the Concourse reached (`episode2Engaged`) — from there.
  if (options.signedOff !== true) {
    await boardFirstCard(page, 'lab_briefing');
    await workshopToConcourse(page);
  }

  await concourseToLab(page);
  await openKai(page);
  await rl1AnswerBy(page, 1);
  await expectStage(page, 'lab_work');
  await openKai(page);
  await selectPromptLabel(page, 'I am done here — what is next?');
  await expectStage(page, 'exterior_briefing');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await openNoor(page);
  await rl1AnswerBy(page);
  await expectStage(page, 'exterior_work');
}

async function rl1OpenSupportConsole(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await ensureOutsideCompound(page);
    await yardVia(
      page,
      YARD.console.x + APPROACH.console.x,
      YARD.console.y + APPROACH.console.y,
    );
    await interactAt(page, YARD.console, { approachOffset: APPROACH.console });

    if (
      await waitSurface(page, true, 'm08_support_console').then(
        () => true,
        () => false,
      )
    ) {
      await page.waitForTimeout(500);

      return;
    }
  }

  throw new Error('surface m08_support_console did not open');
}

const RL1_H_DETAIL = /^reload after administration: /;
const RL1_U_DETAIL = /^reload with an unverified earlier state: /;

/**
 * U24 RL-1C: the open M01 surface's subtitle, read from its model in the
 * page — the text the work surface renders (`WorkSurfaceScene` sets the
 * subtitle from `model.subtitle`); a harness read, as the surface probe
 * carries no subtitle.
 */
async function rl1cM01Subtitle(
  page: Page,
  occasion: 'o1' | 'o2',
): Promise<string | null> {
  return (await page.evaluate(`(async () => {
    const mod = await import('/src/pilot/windows/m01SurfaceModel.ts');
    const host = { now: () => Date.now(), close: () => {}, feedback: () => {} };
    return mod.m01SurfaceModel(host, '${occasion}').subtitle ?? null;
  })()`)) as string | null;
}

test.describe('U24 RL-1: reload at availability (browser)', () => {
  test.describe.configure({ timeout: 1_500_000 });

  test('R1 + R4 + R6 (H): stations opened in load 1 are held at their availability after a genuine reload — the check first, nothing re-run, the existing held-back lines unchanged — and every later load writes one check per family', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL1H');
    // Load 1: episodes 1 and 2 engaged (M01 o1, M12 o1 and o2, M02, M06,
    // M13, M03 occasion a and both M04 jobs administered).
    await episode1Engaged(page);
    await episode2Engaged(page);

    const before = await rl1Payload(page);

    for (const item of ['M01', 'M02', 'M03', 'M04', 'M06', 'M12'] as const) {
      expect(
        rl1Own(before.raw_events, item).some(
          (event) => rl1Suffix(event, item) === 'opportunity_opened',
        ),
        `${item} administered in load 1`,
      ).toBe(true);
    }

    // Load 2.
    await reloadToDock(page);
    await rl1ReplayToWorkshopStage(page);

    let now = await rl1Payload(page);

    expect(now.page_load_index).toBe(2);

    const m01 = expectHeld(now.raw_events, 'M01', RL1_H_DETAIL);
    const m12 = expectHeld(now.raw_events, 'M12', RL1_H_DETAIL);

    // The record covers both occasions; o1 is H, o2 (never opened) A.
    expect(m01).toMatchObject({
      page_load_index: 2,
      history_continuous: true,
      occasions: {
        o1: { prior_opening_found: true },
        o2: {
          prior_opening_found: false,
          prior_opening_absence_established: true,
        },
      },
    });
    expect(m12).toMatchObject({
      occasions: {
        o1: { prior_opening_found: true },
        o2: { prior_opening_found: true },
      },
    });

    // R6 (H): the existing lines, unchanged; the H subtitle stays
    // "recorded" (RL-1C, decision D).
    await rl1OpenSurface(
      page,
      RL1_CONCOURSE.planBoard,
      'm01_plan_board',
      (x, y) => concourseVia(page, x, y),
    );
    expect(await rl1cM01Subtitle(page, 'o1')).toBe('recorded');
    expect(await rl1ReadAndLeave(page, 'rl1-h-m01-o1')).toBe(RL1_H_STATUS.M01);
    await rl1OpenSurface(
      page,
      RL1_CONCOURSE.packet1,
      'm12_qc_packet_o1',
      (x, y) => concourseVia(page, x, y),
    );
    expect(await rl1ReadAndLeave(page, 'rl1-h-m12-o1')).toBe(RL1_H_STATUS.M12);

    await concourseToWorkshop(page);
    await boardFirstCard(page, 'workshop_work'); // Take the orders.
    now = await rl1Payload(page);

    for (const item of ['M02', 'M03', 'M04', 'M06', 'M13'] as const) {
      expectHeld(now.raw_events, item, RL1_H_DETAIL);
    }

    // M04: both jobs cut in load 1 — each its own H, held at the listing.
    expect(
      rl1Own(now.raw_events, 'M04')
        .filter((event) => rl1Suffix(event, 'M04') === 'technical_failure')
        .map((event) => [event.metadata?.occasion, event.metadata?.detail]),
    ).toEqual([
      ['o1', 'reload after administration: cutting job not run'],
      ['o2', 'reload after administration: cutting job not run'],
    ]);

    await rl1OpenSurface(
      page,
      RL1_WORKSHOP.console,
      'm06_dispatch_console',
      (x, y) => workshopVia(page, x, y),
    );
    expect(await rl1ReadAndLeave(page, 'rl1-h-m06')).toBe(RL1_H_STATUS.M06);
    await rl1OpenSurface(
      page,
      RL1_WORKSHOP.packet2,
      'm12_qc_packet_o2',
      (x, y) => workshopVia(page, x, y),
    );
    expect(await rl1ReadAndLeave(page, 'rl1-h-m12-o2')).toBe(RL1_H_STATUS.M12);
    expect(await rl1Lattice(page, 'rl1-h-m13')).toContain(RL1_H_STATUS.M13);

    // Opening a held station re-runs nothing.
    now = await rl1Payload(page);

    for (const item of [
      'M01',
      'M02',
      'M03',
      'M04',
      'M06',
      'M12',
      'M13',
    ] as const) {
      expect(
        rl1Own(now.raw_events, item).filter(
          (event) => rl1Suffix(event, item) === rl1Opening(item),
        ),
        `${item} re-run`,
      ).toEqual([]);
    }

    // The existing prior-exposure entry of an earlier opening (direction a).
    for (const id of [
      'proto_m01_batch_o1',
      'proto_m12_check_o1',
      'proto_m12_check_o2',
      'proto_m02_retrieval_series',
      'proto_m06_work_period',
      'proto_m03_tools_a',
      'proto_m04_cutting_o1',
      'proto_m04_cutting_o2',
      'proto_m13_network_series',
    ]) {
      expect(
        (rl1Validity(now, id)?.prior_exposure as unknown[] | undefined)
          ?.length ?? 0,
        `${id} prior exposure`,
      ).toBeGreaterThan(0);
    }

    // R4: a second genuine reload; load 3 writes one check per family, and
    // load 2's record stays one per family.
    await reloadToDock(page);
    await rl1ReplayToWorkshopStage(page);
    await concourseToWorkshop(page);
    await boardFirstCard(page, 'workshop_work');
    now = await rl1Payload(page);
    expect(now.page_load_index).toBe(3);

    for (const item of [
      'M01',
      'M02',
      'M03',
      'M04',
      'M06',
      'M12',
      'M13',
    ] as const) {
      const count = (events: readonly Rl1Event[]) =>
        rl1Own(events, item).filter(
          (event) => rl1Suffix(event, item) === 'prior_load_checked',
        ).length;

      expect(count(now.raw_events), `${item} checks in load 3`).toBe(1);
      expect(
        count(
          now.prior_page_load_events.filter(
            (event) => event.page_load_index === 2,
          ),
        ),
        `${item} checks in load 2`,
      ).toBe(1);
      expect(
        count(
          now.prior_page_load_events.filter(
            (event) => event.page_load_index === 1,
          ),
        ),
        `${item} checks in load 1 (a first load writes none)`,
      ).toBe(0);
      expectHeld(now.raw_events, item, RL1_H_DETAIL);
    }

    expectNoRuntimeErrors(capture);
  });

  test('R-2 + R1 (M04 joint hold-back, M08 H): job 1 cut and the support console used in load 1 — after a genuine reload job 2 is held only with job 1, with the dependency wording and the other job’s prior-exposure note, and the console is held with its existing lines', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL1J');
    await completeDockTutorial(page, 1);
    // Load 1: the orders taken, coupon 1 cut (job 2 never cut), then the
    // yard and the support console.
    await routeToWorkshopWork(page);
    await couponOneAndBench(page);
    await rl1WorkshopToYardWork(page);
    await supportConsole(page);

    const before = await rl1Payload(page);
    const cutIn = (events: readonly Rl1Event[]) =>
      rl1Own(events, 'M04')
        .filter((event) => rl1Suffix(event, 'M04') === 'opportunity_opened')
        .map((event) => event.metadata?.occasion);

    expect(cutIn(before.raw_events)).toEqual(['o1']);

    // Load 2.
    await reloadToDock(page);
    await rl1ReplayToWorkshopStage(page);
    await concourseToWorkshop(page);
    await boardFirstCard(page, 'workshop_work'); // Take the orders.

    let now = await rl1Payload(page);
    const check = expectHeld(now.raw_events, 'M04', /^reload /);

    // The record is factual per job: job 1 opened earlier, job 2 never.
    expect(check).toMatchObject({
      occasions: {
        o1: { prior_opening_found: true },
        o2: {
          prior_opening_found: false,
          prior_opening_absence_established: true,
          prior_opening_sequences: [],
        },
      },
    });
    expect(
      rl1Own(now.raw_events, 'M04')
        .filter((event) => rl1Suffix(event, 'M04') === 'technical_failure')
        .map((event) => [event.metadata?.occasion, event.metadata?.detail]),
    ).toEqual([
      ['o1', 'reload after administration: cutting job not run'],
      [
        'o2',
        'reload with a joint hold-back: cutting job not run; the other job is held (earlier opening found) and shares its starting state',
      ],
    ]);
    expect(cutIn(now.raw_events)).toEqual([]);
    // Job 1's existing prior-exposure entry; job 2's names the other job.
    expect(rl1Validity(now, 'proto_m04_cutting_o1')).toMatchObject({
      prior_exposure: [
        'a cutting job was administered in an earlier page load of this identity',
      ],
      technical_failure: true,
      absent: false,
    });
    expect(rl1Validity(now, 'proto_m04_cutting_o2')).toMatchObject({
      prior_exposure: [
        'the other cutting job was administered in an earlier page load of this identity; this job, never cut, shares its starting state',
      ],
      technical_failure: true,
      absent: false,
    });

    // The export reports job 2's own class apart from its effective one.
    const m04 = (
      (now as unknown as { measurement_features: Record<string, unknown>[] })
        .measurement_features ?? []
    ).find((row) => row.feature_id === 'm04_undisposed_pieces');

    expect(m04).toMatchObject({ disposition: 'interrupted', value: null });
    expect(
      (m04?.components as { reload_jobs?: Record<string, unknown> })
        ?.reload_jobs,
    ).toMatchObject({
      o1: { own_class: 'H', effective_class: 'H', joint_hold_back: false },
      o2: {
        own_class: 'A',
        effective_class: 'H',
        administration_permitted: false,
        basis: 'joint_hold_back',
        joint_hold_back: true,
        held_with: 'H',
        prior_opening_found: false,
        prior_opening_sequences: [],
      },
    });

    // M08: opened in load 1 ⇒ held at the yard briefing, existing lines.
    await rl1WorkshopToYardWork(page);
    now = await rl1Payload(page);
    expectHeld(now.raw_events, 'M08', RL1_H_DETAIL);
    await rl1OpenSupportConsole(page);
    expect(await rl1ReadAndLeave(page, 'rl1-h-m08')).toBe(RL1_H_STATUS.M08);
    expect(
      (
        rl1Validity(await rl1Payload(page), 'proto_m08_effort_choice')
          ?.prior_exposure as unknown[] | undefined
      )?.length ?? 0,
    ).toBeGreaterThan(0);

    expectNoRuntimeErrors(capture);
  });

  test('R2: nothing opened before a genuine reload — the check establishes the absence and every station is administered normally on its first opening', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL1A');
    await completeDockTutorial(page, 1);
    await reloadToDock(page);

    // Load 2: the same drivers as a first load.
    await episode1Engaged(page);
    await episode2Engaged(page);
    await rl1WorkshopToYardWork(page, { signedOff: true });
    await supportConsole(page);

    const now = await rl1Payload(page);

    expect(now.page_load_index).toBe(2);

    for (const item of [
      'M01',
      'M02',
      'M03',
      'M04',
      'M06',
      'M08',
      'M12',
      'M13',
    ] as const) {
      const own = rl1Own(now.raw_events, item);
      const checks = own.filter(
        (event) => rl1Suffix(event, item) === 'prior_load_checked',
      );
      const openings = own.filter(
        (event) => rl1Suffix(event, item) === rl1Opening(item),
      );

      expect(checks, `${item}: one check`).toHaveLength(1);
      expect(checks[0].metadata, `${item}: absence established`).toMatchObject({
        page_load_index: 2,
        history_continuous: true,
        prior_opening_found: false,
        prior_opening_absence_established: true,
      });
      expect(openings.length, `${item}: administered`).toBeGreaterThan(0);
      expect(openings[0].sequence ?? 0, `${item}: check first`).toBeGreaterThan(
        checks[0].sequence ?? 0,
      );
      expect(
        own.filter(
          (event) =>
            rl1Suffix(event, item) === 'technical_failure' &&
            String(event.metadata?.detail ?? '').startsWith('reload'),
        ),
        `${item}: no hold-back`,
      ).toEqual([]);
    }

    expectNoRuntimeErrors(capture);
  });

  test('R3 + R6 (U): an earlier state that cannot be verified (store meta record removed before the reload — fault-injected) holds every station at its availability, administers nothing, and shows the exact U lines', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL1U');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await page.addInitScript(() => {
      if (sessionStorage.getItem('rl1-meta-removed') !== null) {
        return;
      }

      sessionStorage.setItem('rl1-meta-removed', '1');

      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('research-events:v1:') && key.endsWith(':meta')) {
          localStorage.removeItem(key);
        }
      }
    });
    await reloadToDock(page);
    await rl1ReplayToWorkshopStage(page);

    let now = await rl1Payload(page);

    expect(now.page_load_index).toBe(2);
    expect(now.event_integrity.recovered_from_chunks).toBe(true);

    for (const item of ['M01', 'M12'] as const) {
      expect(expectHeld(now.raw_events, item, RL1_U_DETAIL)).toMatchObject({
        history_continuous: false,
        prior_opening_absence_established: false,
      });
    }

    await rl1OpenSurface(
      page,
      RL1_CONCOURSE.planBoard,
      'm01_plan_board',
      (x, y) => concourseVia(page, x, y),
    );
    // The U subtitle reads "closed" (RL-1C, decision D).
    expect(await rl1cM01Subtitle(page, 'o1')).toBe('closed');
    expect(await rl1ReadAndLeave(page, 'rl1-u-m01-o1')).toBe(
      rl1ULines('batch').join('\n'),
    );
    await rl1OpenSurface(
      page,
      RL1_CONCOURSE.packet1,
      'm12_qc_packet_o1',
      (x, y) => concourseVia(page, x, y),
    );
    expect(await rl1ReadAndLeave(page, 'rl1-u-m12-o1')).toBe(
      rl1ULines('packet').join('\n'),
    );

    await concourseToWorkshop(page);
    await boardFirstCard(page, 'workshop_work');
    now = await rl1Payload(page);

    for (const item of ['M02', 'M03', 'M04', 'M06', 'M13'] as const) {
      expectHeld(now.raw_events, item, RL1_U_DETAIL);
    }

    await rl1OpenSurface(
      page,
      RL1_WORKSHOP.console,
      'm06_dispatch_console',
      (x, y) => workshopVia(page, x, y),
    );
    expect(await rl1ReadAndLeave(page, 'rl1-u-m06', ['summary'])).toBe(
      rl1ULines('console').join('\n'),
    );
    await rl1OpenSurface(
      page,
      RL1_WORKSHOP.packet2,
      'm12_qc_packet_o2',
      (x, y) => workshopVia(page, x, y),
    );
    expect(await rl1ReadAndLeave(page, 'rl1-u-m12-o2')).toBe(
      rl1ULines('packet').join('\n'),
    );

    const lattice = await rl1Lattice(page, 'rl1-u-m13');

    // The record renders both lines in one text block, one per line.
    const [first, second] = rl1ULines('lattice bench');

    expect(
      lattice.some(
        (text) =>
          text.startsWith(first) &&
          text.endsWith(second) &&
          text.slice(first.length, -second.length).trim() === '',
      ),
      JSON.stringify(lattice),
    ).toBe(true);

    expect(lattice).not.toContain(RL1_H_STATUS.M13);

    // M08 at the yard briefing.
    await rl1WorkshopToYardWork(page);
    now = await rl1Payload(page);
    expectHeld(now.raw_events, 'M08', RL1_U_DETAIL);
    await rl1OpenSupportConsole(page);
    expect(await rl1ReadAndLeave(page, 'rl1-u-m08', ['tally', 'slot'])).toBe(
      rl1ULines('console').join('\n'),
    );

    // Nothing administered; no prior exposure claimed; never absent.
    now = await rl1Payload(page);

    for (const item of [
      'M01',
      'M02',
      'M03',
      'M04',
      'M06',
      'M08',
      'M12',
      'M13',
    ] as const) {
      expect(
        rl1Own(now.raw_events, item).filter(
          (event) => rl1Suffix(event, item) === rl1Opening(item),
        ),
        `${item} administered`,
      ).toEqual([]);
    }

    for (const id of [
      'proto_m01_batch_o1',
      'proto_m12_check_o1',
      'proto_m12_check_o2',
      'proto_m02_retrieval_series',
      'proto_m06_work_period',
      'proto_m03_tools_a',
      'proto_m04_cutting_o1',
      'proto_m04_cutting_o2',
      'proto_m13_network_series',
      'proto_m08_effort_choice',
    ]) {
      const record = rl1Validity(now, id);

      expect(record?.prior_exposure ?? [], `${id} prior exposure`).toEqual([]);
      expect(record?.absent ?? false, `${id} absent`).toBe(false);
    }

    expectNoRuntimeErrors(capture);
  });
});

/* ================================================================== *
 * U24 RL-1C (owner ruling of 24 October 2026; register §5.406): the
 * return batch's held screen (decisions C, D) and the M12 context note
 * (qualification 3), with genuine `page.reload()`s and ordinary input.
 * ================================================================== */

const RL1C_RETURN_BATCH = 'Open the return batch (three jobs).';

/** The Work Order Board's prompt at the return shift; returns its labels. */
async function rl1cReturnBoard(page: Page): Promise<string[]> {
  await workshopApproach(page, 'board');
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });

  return promptLabels(page);
}

test.describe('U24 RL-1C: held screens and the M12 note (browser)', () => {
  test.describe.configure({ timeout: 1_500_000 });

  test('C + D (U): in a load whose earlier state cannot be verified (store meta record removed — fault-injected), the board keeps "Open the return batch" while batch 2 is held; it opens the read-only U screen ("closed", the §9 lines) and administers nothing', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL1CRB');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await page.addInitScript(() => {
      if (sessionStorage.getItem('rl1c-meta-removed') !== null) {
        return;
      }

      sessionStorage.setItem('rl1c-meta-removed', '1');

      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('research-events:v1:') && key.endsWith(':meta')) {
          localStorage.removeItem(key);
        }
      }
    });
    await reloadToDock(page);
    await replayToWorkshopReturn(page);

    let now = await rl1Payload(page);

    expect(now.page_load_index).toBe(2);
    expect(now.event_integrity.recovered_from_chunks).toBe(true);

    await concourseToWorkshop(page);
    await page.waitForTimeout(400);

    // The board's read presents batch 2 and holds it (U) at availability.
    const labels = await rl1cReturnBoard(page);

    expect(labels).toContain(RL1C_RETURN_BATCH);
    now = await rl1Payload(page);
    expectHeld(now.raw_events, 'M01', RL1_U_DETAIL);
    expect(
      rl1Own(now.raw_events, 'M01')
        .filter((event) => rl1Suffix(event, 'M01') === 'technical_failure')
        .map((event) => event.metadata?.occasion),
    ).toContain('o2');

    await selectPromptLabel(page, RL1C_RETURN_BATCH);
    await waitSurface(page, true, 'm01_return_orders');
    await page.waitForTimeout(500);
    expect(await rl1cM01Subtitle(page, 'o2')).toBe('closed');
    expect(await rl1ReadAndLeave(page, 'rl1c-u-m01-o2')).toBe(
      rl1ULines('batch').join('\n'),
    );

    // Nothing administered; no prior exposure claimed; never absent.
    now = await rl1Payload(page);
    expect(
      rl1Own(now.raw_events, 'M01').filter(
        (event) => rl1Suffix(event, 'M01') === 'opportunity_opened',
      ),
    ).toEqual([]);

    const record = rl1Validity(now, 'proto_m01_batch_o2');

    expect(record?.prior_exposure ?? []).toEqual([]);
    expect(record?.absent ?? false).toBe(false);

    // Still listed while the batch is held.
    expect(await rl1cReturnBoard(page)).toContain(RL1C_RETURN_BATCH);
    await selectPromptLabel(page, 'Still working.');

    expectNoRuntimeErrors(capture);
  });

  test('Q3: packet 1 opened in load 1, packet 2 never; after a genuine reload packet 1 is held (H) at its availability and never touched, packet 2 is opened — packet 2 carries no "exposure:proto_m12_check_o1_before" note', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL1CM12');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await valeChainAccept(page);
    await qualityPacket1(page);

    let now = await rl1Payload(page);

    expect(
      rl1Own(now.raw_events, 'M12')
        .filter((event) => rl1Suffix(event, 'M12') === 'opportunity_opened')
        .map((event) => event.metadata?.occasion),
    ).toEqual(['o1']);

    // Load 2: packet 1 held at Vale's briefing; packet 2 listed by the
    // work orders (A).
    await reloadToDock(page);
    await rl1ReplayToWorkshopStage(page);
    await concourseToWorkshop(page);
    await boardFirstCard(page, 'workshop_work');
    now = await rl1Payload(page);
    expect(expectHeld(now.raw_events, 'M12', RL1_H_DETAIL)).toMatchObject({
      occasions: {
        o1: { prior_opening_found: true },
        o2: {
          prior_opening_found: false,
          prior_opening_absence_established: true,
        },
      },
    });

    await rl1OpenSurface(
      page,
      RL1_WORKSHOP.packet2,
      'm12_qc_packet_o2',
      (x, y) => workshopVia(page, x, y),
    );
    await rl1ReadAndLeave(page, 'rl1c-m12-o2-opened');

    now = await rl1Payload(page);
    expect(
      rl1Own(now.raw_events, 'M12')
        .filter((event) => rl1Suffix(event, 'M12') === 'opportunity_opened')
        .map((event) => event.metadata?.occasion),
    ).toEqual(['o2']);
    expect(rl1Validity(now, 'proto_m12_check_o2')?.prior_exposure).toEqual([]);
    expect(rl1Validity(now, 'proto_m12_check_o1')?.prior_exposure).toEqual([
      'quality packet opened in an earlier page load of this identity',
    ]);

    expectNoRuntimeErrors(capture);
  });
});

/* ================================================================== *
 * U24 RL-1C qualification 3 — the M12 context note, in-page harness
 * fixtures (the M07 A-5 precedent): the window module is driven through
 * the dev server's module graph in a booted page, the runtime's reload
 * inputs (page-load index, earlier events, event integrity) injected per
 * fixture. NEVER ordinary-play evidence; the ordinary-input check is the
 * Q3 browser test above. The note `exposure:<other>_before` is written
 * when the other packet was opened, or its held screen opened, in this
 * load — never for a hold at availability alone. M (a contradictory
 * check) cannot be produced at the host: its own record is always
 * coherent, so the guard holds only H or U; the rule reads no class.
 * ================================================================== */

interface Rl1cNote {
  name: string;
  /** The other packet's earlier history: none, opened (H), held as U. */
  prior: 'first_load' | 'none' | 'H' | 'U';
  /** The other packet opened (A) or its held screen opened (H / U). */
  openOther: boolean;
  note: boolean;
  otherClass: 'H' | 'U' | null;
}

const RL1C_NOTES: readonly Rl1cNote[] = [
  {
    name: 'the other packet opened (first load) ⇒ the note',
    prior: 'first_load',
    openOther: true,
    note: true,
    otherClass: null,
  },
  {
    name: 'the other packet opened (reloaded, both A) ⇒ the note',
    prior: 'none',
    openOther: true,
    note: true,
    otherClass: null,
  },
  {
    name: 'the other packet held (H) and its held screen opened ⇒ the note',
    prior: 'H',
    openOther: true,
    note: true,
    otherClass: 'H',
  },
  {
    name: 'the other packet held (U) and its held screen opened ⇒ the note',
    prior: 'U',
    openOther: true,
    note: true,
    otherClass: 'U',
  },
  {
    name: 'the other packet held (H) at availability only ⇒ no note',
    prior: 'H',
    openOther: false,
    note: false,
    otherClass: 'H',
  },
  {
    name: 'the other packet held (U) at availability only ⇒ no note',
    prior: 'U',
    openOther: false,
    note: false,
    otherClass: 'U',
  },
];

test.describe('U24 RL-1C: the M12 context note (in-page harness, never ordinary play)', () => {
  for (const [other, self] of [
    ['o1', 'o2'],
    ['o2', 'o1'],
  ] as const) {
    test(`packet ${other} first, then ${self} opened: ${RL1C_NOTES.length} fixtures`, async ({
      page,
    }) => {
      await bootPilot(page, `rl1c_note_${other}`, { skipOpening: false });

      for (const fixture of RL1C_NOTES) {
        const out = JSON.parse(
          (await page.evaluate(`(async () => {
            const m12 = await import('/src/pilot/windows/m12QualityControl.ts');
            const validity = await import('/src/measurement/validity.ts');
            const systems = await import('/src/systems/index.ts');
            const rt = systems.researchRuntime;
            const other = '${other}';
            const self = '${self}';
            const fixture = ${JSON.stringify(fixture)};
            const prior = [
              { event_type: 'session_start', sequence: 1, page_load_index: 1, metadata: {} },
              ...(fixture.prior === 'H'
                ? [{ event_type: 'proto_m12_check_opportunity_opened', sequence: 2,
                     page_load_index: 1, metadata: { occasion: other } }]
                : fixture.prior === 'U'
                  ? [{ event_type: 'proto_m12_check_technical_failure', sequence: 2,
                       page_load_index: 1, metadata: { occasion: other,
                         detail: 'reload with an unverified earlier state: packet not administered' } }]
                  : []),
            ];

            m12.resetM12State();
            validity.resetMeasurementValidity();

            if (fixture.prior !== 'first_load') {
              rt.getPageLoadIndex = () => 2;
              rt.getPriorPageLoadEvents = () => prior;
              rt.getEventIntegrity = () => ({ first_sequence: 1, sequence_gap_count: 0,
                sequence_duplicate_count: 0, recovered_from_chunks: false });
            }

            try {
              const t = Date.now();

              m12.presentM12(other, t);

              if (fixture.openOther) {
                m12.openM12(other, t + 10);
              }

              m12.presentM12(self, t + 20);
              m12.openM12(self, t + 30);

              const record = validity.serializeOpportunities()
                .find((r) => r.opportunity_id === 'proto_m12_check_' + self);

              return JSON.stringify({
                otherClass: m12.m12HoldBackClass(other),
                selfClass: m12.m12HoldBackClass(self),
                selfStatus: m12.m12Windows[self].windowStatus(),
                notes: record?.prior_exposure ?? null,
              });
            } finally {
              delete rt.getPageLoadIndex;
              delete rt.getPriorPageLoadEvents;
              delete rt.getEventIntegrity;
              m12.resetM12State();
              validity.resetMeasurementValidity();
            }
          })()`)) as string,
        ) as {
          otherClass: string | null;
          selfClass: string | null;
          selfStatus: string;
          notes: string[] | null;
        };

        expect(out.otherClass, fixture.name).toBe(fixture.otherClass);
        // This packet is administered in every fixture.
        expect(out.selfClass, fixture.name).toBeNull();
        expect(out.selfStatus, fixture.name).toBe('open');
        expect(out.notes, fixture.name).toEqual(
          fixture.note ? [`exposure:proto_m12_check_${other}_before`] : [],
        );
      }
    });
  }
});
