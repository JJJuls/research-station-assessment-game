/**
 * Station 080 M09 / M10 on the participant route (Unit 15, browser): the
 * monitor watch's three checks and the two deliveries, driven with real
 * navigation and real prompt input — no state injection.
 *
 * R1  watch and key card accepted (keyboard); the recap after the alarm;
 *     all three checks read; the key card handed to Kai in the Laboratory
 *     by POINTER; the logbook accepted and left with Kai on the way back;
 *     the shift review. M09 3 / 3; M10 2 / 2 (one direct, one delegated).
 * R2  the field probe borrowed (Kai's four-card menu) and handed back; the
 *     laboratory-pass check left unread and read late (uncredited); Kai's
 *     deliveries menu opened and "Not now." chosen (viewing only); the
 *     torque driver borrowed (Noor's four-card menu) and handed back; the
 *     key card left with Noor; the logbook accepted and handed to Vale.
 *     M09 2 / 3; M10 2 / 2; the M11 records intact.
 * R3  the watch deferred and never answered (a gauge reading is then
 *     uncredited); the key card accepted; Kai's whole route dialogue
 *     completed without ever opening the deliveries menu; the logbook
 *     declined by POINTER; the review. The key card is accessible on the
 *     recorded presence of its recipient alone — M10 0 / 1 observed — and
 *     a handover after the deadline is a late act that changes nothing.
 * R4  both Concourse offers accepted, check 1 read, the page reloaded:
 *     the earlier load's events are carried byte-identically and both
 *     features are interrupted. The administration after the reload (no
 *     re-offer, the held-back records) is a SEPARATE test: when the
 *     driver cannot replay the dock tutorial after a reload it is skipped
 *     as BLOCKED / NOT VERIFIED — never reported as a browser pass.
 *
 * Every scenario: the administration versions on the live events; each
 * family owned by one item; the offline extraction equal to the page's
 * own export rows; no menu overflow; no runtime error. Screenshots (the
 * 19 evidence frames, 800 × 600) go to `U15_OUT`.
 */
import { mkdirSync } from 'node:fs';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import {
  M09_ENTRY_STATE_VERSION,
  M09_FAMILY,
  M09_LOG_LINES,
  M09_OFFER_BODY,
  M09_OFFER_LABELS,
} from '../src/pilot/windows/m09WatchModel';
import {
  M10_DELEGATE_KEEP_LABEL,
  M10_DELEGATE_LABELS,
  M10_ENTRY_STATE_VERSION,
  M10_FAMILY,
  M10_HANDOVER_FEEDBACK,
  M10_HANDOVER_LABELS,
  M10_INTERRUPTION_ACK_LABEL,
  M10_LOG_LINES,
  M10_MENU_ENTRY_LABEL,
  M10_MENU_NOT_NOW_LABEL,
  M10_OFFER_BODY,
  M10_OFFER_LABELS,
  M10_RECAP_ACK_LABEL,
  M10_RECAP_BODY,
  m10DelegateConfirmBody,
  m10DelegateConfirmLabel,
  m10DelegateFeedback,
  m10MenuBody,
} from '../src/pilot/windows/m10DeliveryModel';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { driveAxisTo, getEvents, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  answerLogbookOffer,
  bootPilot,
  clickPromptLabel,
  concourseToDeck,
  concourseToWorkshop,
  concourseVia,
  dockToConcourse,
  expectStage,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  press,
  promptLabels,
  registryApproach,
  returnShiftToDeckClosure,
  selectPromptLabel,
  SETTLE_PAUSE_MS,
  useDoor,
  waitPromptLabel,
  waitScene,
  walkTo,
  workshopSignOff,
  workshopToConcourse,
  yardApproach,
} from './pilotHelpers';

const OUT = process.env.U15_OUT ?? 'test-results/u15-evidence';
const FORBIDDEN =
  /proto_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|persist|valid|grit|resilien|dependable|reliable/i;

/** The Concourse's clear east–west lane (the driver's travel row). */
const LANE_Y = 252;
const GAUGE = registryApproach('concourse.monitor_gauge');
const KAI_RETURN = { x: 232, y: 148 };

type Choice = 'accept' | 'decline' | 'defer';

interface FeatureRow {
  item_id: string;
  feature_id: string;
  value: unknown;
  numerator: number | null;
  denominator: number | null;
  disposition: string;
  components: Record<string, unknown>;
}

function meta(event: { metadata?: Record<string, unknown> }) {
  return event.metadata ?? {};
}

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function lastPromptBody(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (window as unknown as { __lastPromptBody?: string | null })
        .__lastPromptBody ?? '',
  );
}

async function lastFeedback(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __lastRoomFeedbackText?: string | null })
        .__lastRoomFeedbackText ?? null,
  );
}

async function eventsOf(page: Page, type: string) {
  return (await getEvents(page)).filter((event) => event.event_type === type);
}

async function familyEvents(page: Page, family: string) {
  return (await getEvents(page)).filter((event) =>
    event.event_type.startsWith(family),
  );
}

/**
 * The page's OWN export payload (the runtime's builder, read in the
 * page): its feature rows, its raw events and the events it carries from
 * earlier page loads.
 */
async function pagePayload(page: Page): Promise<{
  features: FeatureRow[];
  raw_events: RawGameEvent[];
  prior: RawGameEvent[];
  page_load_index: number;
  final_core_closed: boolean;
}> {
  const json = await page.evaluate(`(async () => {
    const mod = await import('/src/systems/index.ts');
    const payload = mod.researchRuntime.buildExportPayload();

    return JSON.stringify({
      features: payload.measurement_features ?? [],
      raw_events: payload.raw_events,
      prior: payload.prior_page_load_events,
      page_load_index: payload.page_load_index,
      final_core_closed:
        (payload.pilot_coverage && payload.pilot_coverage.final_core_closed) ===
        true,
    });
  })()`);

  return JSON.parse(json as string);
}

/**
 * The offline reproduction: the same read-only extractor run in this
 * process over the page's raw events must equal the page's own rows —
 * and the raw log is identical before and after the extraction.
 */
async function reproduce(page: Page) {
  const payload = await pagePayload(page);
  const before = JSON.stringify(payload.raw_events);
  const context = {
    finalCoreClosed: payload.final_core_closed,
    pageLoadIndex: payload.page_load_index,
    reloaded: payload.page_load_index > 1,
  };
  const rows: Record<'M09' | 'M10', FeatureRow> = {} as never;

  for (const item of ['M09', 'M10'] as const) {
    const offline = JSON.parse(
      JSON.stringify(extractItemFeatures(item, payload.raw_events, context)),
    ) as FeatureRow[];
    const own = payload.features.filter((row) => row.item_id === item);

    expect(own, `${item}: the page exports its rows`).toHaveLength(1);
    expect(
      offline,
      `${item}: offline extraction equals the page's rows`,
    ).toEqual(own);
    rows[item] = offline[0];
  }

  expect(JSON.stringify(payload.raw_events)).toBe(before);

  // The page's builder and the debug API read the same log.
  expect(payload.raw_events).toHaveLength((await getEvents(page)).length);

  return { rows, payload };
}

/** Versions on the live events; one item per family; no menu overflow. */
async function expectFamilyDiscipline(page: Page) {
  const events = await getEvents(page);

  for (const [family, item, version] of [
    [M09_FAMILY, 'M09', M09_ENTRY_STATE_VERSION],
    [M10_FAMILY, 'M10', M10_ENTRY_STATE_VERSION],
  ] as const) {
    const own = events.filter((event) => event.event_type.startsWith(family));

    expect(own.length, `${family} emitted`).toBeGreaterThan(0);

    for (const event of own) {
      expect(meta(event).entry_state_version, event.event_type).toBe(version);
      expect(meta(event).measure_id, event.event_type).toBe(item);
      expect(typeof meta(event).input_mode, event.event_type).toBe('string');
      expect(event.study_item_ids ?? undefined).toBeUndefined();
      expect(event.construct_id ?? undefined).toBeUndefined();
      expect(event.success ?? undefined).toBeUndefined();
    }
  }

  // The retired v2 families are no longer on the route.
  expect(
    events.filter((event) =>
      /^proto_m09_watch_|^proto_m10_promise_/.test(event.event_type),
    ),
  ).toEqual([]);
  expect(
    events.filter((event) => event.event_type === 'pilot_npc_menu_overflow'),
  ).toEqual([]);
}

// ——— Driver steps ————————————————————————————————————————————————————

async function start(page: Page, tag: string) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
}

/**
 * Vale's handover chain: briefing → watch offer → key-card offer →
 * (alarm → recap) → lamp job (declined). `frames` captures the evidence
 * screenshots of the stages.
 */
async function valeChain(
  page: Page,
  choices: { watch: Choice; keyCard: Choice },
  frames = false,
) {
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'incident_handover');

  // The watch offer: three deliberate cards, the approved wording.
  await waitPromptLabel(page, M09_OFFER_LABELS.accept);
  expect(await lastPromptBody(page)).toContain(M09_OFFER_BODY);
  expect(await promptLabels(page)).toEqual(Object.values(M09_OFFER_LABELS));

  if (frames) {
    await shot(page, '01-watch-offer');
  }

  await page.waitForTimeout(SETTLE_PAUSE_MS);
  await selectPromptLabel(page, M09_OFFER_LABELS[choices.watch]);

  // The key-card offer follows every watch answer.
  await waitPromptLabel(page, M10_OFFER_LABELS.d1.accept);
  expect(await lastPromptBody(page)).toContain(M10_OFFER_BODY.d1);
  expect(await promptLabels(page)).toEqual(Object.values(M10_OFFER_LABELS.d1));

  if (frames) {
    await shot(page, '02-key-card-offer');
  }

  await page.waitForTimeout(SETTLE_PAUSE_MS);
  await selectPromptLabel(page, M10_OFFER_LABELS.d1[choices.keyCard]);

  if (choices.keyCard === 'accept') {
    // The standardised alarm, then the recap of the obligation.
    await waitPromptLabel(page, M10_INTERRUPTION_ACK_LABEL);
    await page.waitForTimeout(400);
    await selectPromptOption(page, 1);
    await waitPromptLabel(page, M10_RECAP_ACK_LABEL);
    expect(await lastPromptBody(page)).toContain(M10_RECAP_BODY);
    expect(await promptLabels(page)).toEqual([M10_RECAP_ACK_LABEL]);

    if (frames) {
      await shot(page, '03-post-alarm-recap');
    }

    await page.waitForTimeout(SETTLE_PAUSE_MS);
    await selectPromptOption(page, 1);
  }

  // M05's lamp job is still the chain's LAST stage, unchanged.
  await waitPromptLabel(page, 'Yes — I will take the lamp job.');
  expect(await promptLabels(page)).toEqual([
    'Yes — I will take the lamp job.',
    'No — leave the lamp job.',
  ]);
  await page.waitForTimeout(450);
  await selectPromptOption(page, 2);
  await page.waitForTimeout(400);
  expect(await promptLabels(page)).toEqual([]);
}

/** Opens the station log (M) and returns the lines it lists. */
async function openLog(page: Page): Promise<string[]> {
  await press(page, 'm');
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
        .__pilotMapProbe?.open === true,
    undefined,
    { timeout: 6000 },
  );

  return page.evaluate(
    () =>
      (
        window as unknown as {
          __pilotMapProbe?: { log_entries: string[] } | null;
        }
      ).__pilotMapProbe?.log_entries ?? [],
  );
}

async function closeLog(page: Page) {
  await press(page, 'Escape');
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
        .__pilotMapProbe?.open !== true,
    undefined,
    { timeout: 6000 },
  );
  await page.waitForTimeout(400);
}

async function gaugeReads(page: Page): Promise<number> {
  return (await eventsOf(page, 'pilot_station_opened')).filter(
    (event) => meta(event).station_id === 'monitor_gauge',
  ).length;
}

/**
 * Walks to the gauge along the lane and reads it ONCE (E at its north
 * face); a swallowed press is retried, a landed one never repeated.
 */
async function readGauge(page: Page): Promise<string> {
  const before = await gaugeReads(page);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await concourseVia(page, GAUGE.x, LANE_Y);
    await driveAxisTo(page, 'y', LANE_Y, 4);
    await driveAxisTo(page, 'x', GAUGE.x, 8);
    await interactAt(page, GAUGE, { approachOffset: { x: 0, y: 0 } });
    await page.waitForTimeout(500);

    if ((await gaugeReads(page)) > before) {
      break;
    }
  }

  expect(await gaugeReads(page)).toBe(before + 1);

  return (await lastFeedback(page)) ?? '';
}

/** Vale on the lane side of the desk (prompt open on return). */
async function openVale(page: Page) {
  await concourseVia(page, PILOT.concourse.vale.x, LANE_Y);
  await driveAxisTo(page, 'y', LANE_Y, 4);
  await walkTo(page, PILOT.concourse.vale.x, LANE_Y);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 56 },
  });
}

/** Vale: "Handover confirmed" (→ workshop), then the workshop sign-off and back. */
async function handoverThenWorkshop(page: Page) {
  await openVale(page);
  await selectPromptLabel(page, 'Handover confirmed — what is next?');
  await expectStage(page, 'workshop');
  await concourseToWorkshop(page);
  await workshopSignOff(page);
  await workshopToConcourse(page);
  await expectStage(page, 'lab_briefing');
}

async function concourseToLab(page: Page) {
  // Along the lane into the open hall under the Laboratory door first
  // (the gauge and the desks stand north of the lane), then north.
  await driveAxisTo(page, 'y', LANE_Y, 6);
  await driveAxisTo(page, 'x', PILOT.concourse.northDoor.x, 8);
  await concourseVia(
    page,
    PILOT.concourse.northDoor.x,
    PILOT.concourse.northDoor.y + 56,
  );
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });
}

async function labToConcourse(page: Page) {
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: await labApproach(page, PILOT.lab.southDoor),
  });
}

async function labToYard(page: Page) {
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
}

async function yardToLab(page: Page) {
  await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
    approachOffset: await yardApproach(page, PILOT.yard.airlock),
  });
}

async function openKaiLab(page: Page) {
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: await labApproach(page, PILOT.lab.kai),
  });
}

async function openKaiConcourse(page: Page) {
  await concourseVia(page, KAI_RETURN.x, LANE_Y);
  await openPromptAt(page, KAI_RETURN, { approachOffset: { x: 0, y: 40 } });
}

async function openNoor(page: Page) {
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: await yardApproach(page, PILOT.yard.noor),
  });
}

/** Noor's briefing card, then her flag job (M05, declined, unchanged). */
async function noorBriefing(page: Page, card: string) {
  await openNoor(page);
  expect(await promptLabels(page)).toEqual([
    'Ready.',
    'Ready — and I will take the driver.',
    'Ready — no need for the driver.',
  ]);
  await selectPromptLabel(page, card);
  await expectStage(page, 'exterior_work');
  await waitPromptLabel(page, 'Yes — I will take the flag job.');
  await page.waitForTimeout(450);
  await selectPromptOption(page, 2);
  await page.waitForTimeout(300);
}

/** From a colleague's open prompt into their deliveries menu (settled). */
async function openDeliveriesMenu(page: Page, firstAction: string) {
  const labels = await promptLabels(page);

  // The entry is always the LAST card.
  expect(labels[labels.length - 1]).toBe(M10_MENU_ENTRY_LABEL);
  await selectPromptLabel(page, M10_MENU_ENTRY_LABEL);
  await waitPromptLabel(page, firstAction);
  expect((await promptLabels(page))[0]).toBe(M10_MENU_NOT_NOW_LABEL);
  await page.waitForTimeout(SETTLE_PAUSE_MS);
}

/** Workshop return shift → the deck, then the two-step record closure. */
async function returnShiftAndReview(page: Page) {
  await concourseVia(page, PILOT.concourse.vale.x, LANE_Y);
  await returnShiftToDeckClosure(page);
  await concourseToDeck(page);
  await expectStage(page, 'deck_closure');

  const panel = async () =>
    openPromptAt(page, PILOT.deck.reviewPanel, {
      approachOffset: { x: 0, y: 44 },
      yFirst: false,
    });

  await panel();
  await selectPromptOption(page, 1); // arm
  await page.waitForTimeout(400);
  await panel();
  expect(await lastPromptBody(page)).toContain('CONFIRM RECORD CLOSURE');
  await selectPromptOption(page, 1); // confirm — the station record closes
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __closureProbe?: { record_closed: boolean } | null;
        }
      ).__closureProbe?.record_closed === true,
    undefined,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(400);
}

test.describe('M09 watch checks and M10 deliveries on the route (Unit 15)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test('R1: watch and key card accepted, all three checks read, key card handed to Kai by pointer, logbook left with Kai, review — 3 / 3 and 2 / 2', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await start(page, 'u15r1');
    await valeChain(page, { watch: 'accept', keyCard: 'accept' }, true);

    // The alarm and its recap were recorded for the key card only.
    expect(
      (await eventsOf(page, 'proto_m10_delivery_obligation_shown')).map((e) => [
        meta(e).delivery,
        meta(e).channel,
      ]),
    ).toEqual([['d1', 'after_interruption']]);

    // ——— Check 1 (due from acceptance): the log shows the due line. ———
    let log = await openLog(page);

    expect(log).toContain(M09_LOG_LINES.m09_log_due);
    expect(log).toContain(M10_LOG_LINES.d1);
    expect(log.join('\n')).not.toMatch(FORBIDDEN);
    await shot(page, '04-log-check-1-due');
    await closeLog(page);
    expect(await readGauge(page)).toBe(
      'Gauge read: loop 1.6 bar · bus 26.8 V · relay LOCK. Watch reading logged.',
    );

    // ——— Workshop and back: the pass toward the laboratory (check 2). ———
    await handoverThenWorkshop(page);
    log = await openLog(page);
    expect(log).toContain(M09_LOG_LINES.m09_log_due);
    await shot(page, '05-log-lab-pass-check-2-due');
    await closeLog(page);
    expect(await readGauge(page)).toBe(
      'Gauge read: loop 1.5 bar ▼ · bus 26.4 V ▼ · relay LOCK. Watch reading logged.',
    );
    await shot(page, '06-lab-pass-gauge-feedback');
    // Between checks the log names the next reading.
    log = await openLog(page);
    expect(log).toContain(M09_LOG_LINES.m09_log_next_return_pass);
    expect(log).not.toContain(M09_LOG_LINES.m09_log_due);
    await closeLog(page);

    // ——— Laboratory: Kai's briefing keeps its three cards; the key card
    // is handed over from his deliveries menu by POINTER. ———
    await concourseToLab(page);
    await openKaiLab(page);
    expect(await promptLabels(page)).toEqual([
      'Understood.',
      'Understood — and I will take the probe.',
      'Understood — no need for the probe.',
    ]);
    await selectPromptOption(page, 1);
    await expectStage(page, 'lab_work');
    await openKaiLab(page);
    expect(await promptLabels(page)).toEqual([
      'I am done here — what is next?',
      'Still working on it.',
      M10_MENU_ENTRY_LABEL,
    ]);
    await openDeliveriesMenu(page, M10_HANDOVER_LABELS.d1);
    expect(await promptLabels(page)).toEqual([
      M10_MENU_NOT_NOW_LABEL,
      M10_HANDOVER_LABELS.d1,
    ]);
    expect(await lastPromptBody(page)).toContain(m10MenuBody(['d1']));
    await shot(page, '08-kai-deliveries-menu-d1');
    await clickPromptLabel(page, M10_HANDOVER_LABELS.d1);
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe(M10_HANDOVER_FEEDBACK.d1);
    await shot(page, '09-d1-direct-feedback');

    const handed = await eventsOf(page, 'proto_m10_delivery_handed_over');

    expect(handed).toHaveLength(1);
    expect(meta(handed[0])).toMatchObject({
      delivery: 'd1',
      to: 'kai',
      object: 'm10_calibration_key_card',
      input_mode: 'pointer',
      basis: 'window_pointerdown',
    });
    // The watch and the key-card answers were keyboard presses.
    expect(
      meta((await eventsOf(page, 'proto_m09_checks_offer_answered'))[0]),
    ).toMatchObject({ answer: 'accept', input_mode: 'keyboard' });

    // Nothing is left to deliver here: the entry is gone.
    await openKaiLab(page);
    expect(await promptLabels(page)).toEqual([
      'I am done here — what is next?',
      'Still working on it.',
    ]);
    await selectPromptOption(page, 1);
    await expectStage(page, 'exterior_briefing');

    // ——— Yard: Noor's logbook offer after the shift end (accepted). ———
    await labToYard(page);
    await noorBriefing(page, 'Ready.');
    await openNoor(page);
    expect(await promptLabels(page)).toEqual([
      'Still working.',
      'I am finished outside.',
    ]);
    await selectPromptLabel(page, 'I am finished outside.');
    await expectStage(page, 'return_hub');
    await waitPromptLabel(page, M10_OFFER_LABELS.d2.accept);
    expect(await lastPromptBody(page)).toContain(M10_OFFER_BODY.d2);
    expect(await promptLabels(page)).toEqual(
      Object.values(M10_OFFER_LABELS.d2),
    );
    await shot(page, '10-noor-logbook-offer');
    await answerLogbookOffer(page, 'accept');
    expect(await lastFeedback(page)).toBe(
      'Noor: Back through the airlock — Vale is waiting at the incident desk.',
    );

    // ——— Back through the Laboratory: the logbook is left with Kai. ———
    await yardToLab(page);
    await openKaiLab(page);
    expect(await promptLabels(page)).toEqual([
      'Heading to Vale.',
      M10_MENU_ENTRY_LABEL,
    ]);
    await openDeliveriesMenu(page, M10_DELEGATE_LABELS.d2);
    expect(await promptLabels(page)).toEqual([
      M10_MENU_NOT_NOW_LABEL,
      M10_DELEGATE_LABELS.d2,
    ]);
    await selectPromptLabel(page, M10_DELEGATE_LABELS.d2);
    await waitPromptLabel(page, m10DelegateConfirmLabel('d2'));
    expect(await lastPromptBody(page)).toContain(m10DelegateConfirmBody('d2'));
    expect(await promptLabels(page)).toEqual([
      M10_DELEGATE_KEEP_LABEL,
      m10DelegateConfirmLabel('d2'),
    ]);
    await shot(page, '11-kai-delegation-confirm-d2');
    await page.waitForTimeout(SETTLE_PAUSE_MS);
    await selectPromptLabel(page, m10DelegateConfirmLabel('d2'));
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe(m10DelegateFeedback('d2'));
    await shot(page, '11b-kai-delegation-feedback-d2');

    // ——— Return to the Concourse: check 3 is due; read before leaving. ———
    await labToConcourse(page);
    await expectStage(page, 'return_hub');
    log = await openLog(page);
    expect(log).toContain(M09_LOG_LINES.m09_log_due);
    expect(log).not.toContain(M10_LOG_LINES.d1);
    expect(log).not.toContain(M10_LOG_LINES.d2);
    await shot(page, '07-return-pass-due-line');
    await closeLog(page);
    expect(await readGauge(page)).toBe(
      'Gauge read: loop 1.4 bar ▼ · bus 26.1 V ▼ · relay LOCK. Watch reading logged.',
    );
    // The watch is over: its line leaves the log.
    log = await openLog(page);
    expect(log.join('\n')).not.toContain('Monitor watch');
    await closeLog(page);

    await returnShiftAndReview(page);

    // ——— The records. ———
    expect(
      (await eventsOf(page, 'proto_m09_checks_check_window_closed')).map(
        (e) => [meta(e).check_index, meta(e).outcome, meta(e).reason],
      ),
    ).toEqual([
      [1, 'fulfilled', 'read'],
      [2, 'fulfilled', 'read'],
      [3, 'fulfilled', 'read'],
    ]);
    expect(
      (await eventsOf(page, 'proto_m09_checks_log_viewed')).map((e) => [
        meta(e).due_check_index,
        meta(e).line_id,
        meta(e).rendered,
      ]),
    ).toEqual([
      [1, 'm09_log_due', true],
      [2, 'm09_log_due', true],
      [null, 'm09_log_next_return_pass', true],
      [3, 'm09_log_due', true],
    ]);
    expect(
      await eventsOf(page, 'proto_m09_checks_gauge_read_uncredited'),
    ).toEqual([]);

    const { rows } = await reproduce(page);

    expect(rows.M09).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 3,
      disposition: 'observed',
    });
    expect(rows.M10).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 2,
      disposition: 'observed',
    });
    expect(rows.M10.components).toMatchObject({
      direct: 1,
      delegated: 1,
      unfulfilled_at_deadline: 0,
      late_acts: 0,
    });
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R2: probe and driver borrowed and handed back, lab-pass check missed and read late, deliveries menu viewed only, key card left with Noor, logbook handed to Vale — 2 / 3 and 2 / 2', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await start(page, 'u15r2');
    await valeChain(page, { watch: 'accept', keyCard: 'accept' });
    await readGauge(page);
    await handoverThenWorkshop(page);

    // ——— The laboratory pass is walked straight through: check 2 closes
    // unread at the Concourse exit. ———
    await concourseToLab(page);
    expect(
      (await eventsOf(page, 'proto_m09_checks_check_window_closed')).map(
        (e) => [meta(e).check_index, meta(e).outcome, meta(e).exit_to],
      ),
    ).toEqual([
      [1, 'fulfilled', null],
      [2, 'missed', 'diagnostics_laboratory'],
    ]);

    // ——— Kai: the probe is borrowed; his laboratory menu has four cards
    // (M11's options in their places, the deliveries entry last). ———
    await openKaiLab(page);
    await selectPromptLabel(page, 'Understood — and I will take the probe.');
    await expectStage(page, 'lab_work');
    await page.waitForTimeout(400);
    await openKaiLab(page);
    expect(await promptLabels(page)).toEqual([
      'I am done here — what is next?',
      'Still working on it.',
      'Hand the field probe back to Kai.',
      M10_MENU_ENTRY_LABEL,
    ]);
    await shot(page, '12-kai-lab-work-4-option-menu');

    // The deliveries menu is opened and left with "Not now.": viewing is
    // an exposure record — no act, the key card still carried.
    await openDeliveriesMenu(page, M10_HANDOVER_LABELS.d1);
    await shot(page, '19-kai-deliveries-menu-not-now');
    await selectPromptLabel(page, M10_MENU_NOT_NOW_LABEL);
    await page.waitForTimeout(300);
    expect(
      (await eventsOf(page, 'proto_m10_delivery_obligation_shown'))
        .filter((e) => meta(e).channel === 'deliveries_menu')
        .map((e) => [meta(e).delivery, meta(e).with, meta(e).after_closure]),
    ).toEqual([['d1', 'kai', false]]);
    expect(await eventsOf(page, 'proto_m10_delivery_handed_over')).toEqual([]);
    expect(await eventsOf(page, 'proto_m10_delivery_window_closed')).toEqual(
      [],
    );

    // The probe goes back to Kai (M11 unchanged).
    await openKaiLab(page);
    await selectPromptLabel(page, 'Hand the field probe back to Kai.');
    await page.waitForTimeout(400);
    expect(
      meta((await eventsOf(page, 'proto_m11_custody_resolved'))[0]),
    ).toMatchObject({ occasion: 'lab', method: 'owner_handover', to: 'kai' });

    // ——— A late reading of the missed check: back to the Concourse during
    // the laboratory work (nothing opens), the gauge read uncredited. ———
    await labToConcourse(page);
    expect(await readGauge(page)).toBe(
      'Gauge read: loop 1.5 bar ▼ · bus 26.4 V ▼ · relay LOCK.',
    );
    expect(
      (await eventsOf(page, 'proto_m09_checks_gauge_read_uncredited')).map(
        (e) => [
          meta(e).reason,
          meta(e).last_closed_check_index,
          meta(e).last_closed_outcome,
        ],
      ),
    ).toEqual([['no_check_due', 2, 'missed']]);
    expect(
      await eventsOf(page, 'proto_m09_checks_check_window_opened'),
    ).toHaveLength(2);
    await concourseToLab(page);

    // ——— Yard: the driver is borrowed; Noor's menu has four cards. ———
    await openKaiLab(page);
    await selectPromptLabel(page, 'I am done here — what is next?');
    await expectStage(page, 'exterior_briefing');
    await labToYard(page);
    await noorBriefing(page, 'Ready — and I will take the driver.');
    await page.waitForTimeout(400);
    await openNoor(page);
    expect(await promptLabels(page)).toEqual([
      'Still working.',
      'I am finished outside.',
      'Hand the torque driver back to Noor.',
      M10_MENU_ENTRY_LABEL,
    ]);
    await shot(page, '13-noor-4-option-menu');
    await selectPromptLabel(page, 'Hand the torque driver back to Noor.');
    await page.waitForTimeout(400);

    // The key card is left with Noor, who states that it is now her job.
    await openNoor(page);
    await openDeliveriesMenu(page, M10_DELEGATE_LABELS.d1);
    expect(await promptLabels(page)).toEqual([
      M10_MENU_NOT_NOW_LABEL,
      M10_DELEGATE_LABELS.d1,
    ]);
    await selectPromptLabel(page, M10_DELEGATE_LABELS.d1);
    await waitPromptLabel(page, m10DelegateConfirmLabel('d1'));
    expect(await lastPromptBody(page)).toContain(m10DelegateConfirmBody('d1'));
    await shot(page, '14-noor-delegation-confirm-d1');
    await page.waitForTimeout(SETTLE_PAUSE_MS);
    await selectPromptLabel(page, m10DelegateConfirmLabel('d1'));
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe(m10DelegateFeedback('d1'));
    await shot(page, '14b-noor-delegation-feedback-d1');
    expect(
      meta((await eventsOf(page, 'proto_m10_delivery_delegated'))[0]),
    ).toMatchObject({
      delivery: 'd1',
      to: 'noor',
      for: 'kai',
      input_mode: 'keyboard',
    });

    // The logbook is accepted at the shift end.
    await openNoor(page);
    expect(await promptLabels(page)).toEqual([
      'Still working.',
      'I am finished outside.',
    ]);
    await selectPromptLabel(page, 'I am finished outside.');
    await expectStage(page, 'return_hub');
    await answerLogbookOffer(page, 'accept');

    // ——— Return: check 3 read; the logbook handed to Vale. ———
    await yardToLab(page);
    await labToConcourse(page);
    await readGauge(page);
    await openVale(page);
    expect(await promptLabels(page)).toEqual([
      'Heading to the workshop.',
      M10_MENU_ENTRY_LABEL,
    ]);
    await openDeliveriesMenu(page, M10_HANDOVER_LABELS.d2);
    expect(await promptLabels(page)).toEqual([
      M10_MENU_NOT_NOW_LABEL,
      M10_HANDOVER_LABELS.d2,
    ]);
    expect(await lastPromptBody(page)).toContain(m10MenuBody(['d2']));
    await shot(page, '15-vale-deliveries-menu-d2');
    await selectPromptLabel(page, M10_HANDOVER_LABELS.d2);
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toBe(M10_HANDOVER_FEEDBACK.d2);

    await returnShiftAndReview(page);

    expect(
      (await eventsOf(page, 'proto_m09_checks_check_window_closed')).map(
        (e) => [meta(e).check_index, meta(e).outcome],
      ),
    ).toEqual([
      [1, 'fulfilled'],
      [2, 'missed'],
      [3, 'fulfilled'],
    ]);

    const { rows, payload } = await reproduce(page);

    expect(rows.M09).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 3,
      disposition: 'observed',
    });
    expect(rows.M10).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 2,
      disposition: 'observed',
    });
    expect(rows.M10.components).toMatchObject({ direct: 1, delegated: 1 });
    expect(
      (
        rows.M10.components.deliveries as Record<
          string,
          { path: string; exposures: Record<string, number> }
        >
      ).d1,
    ).toMatchObject({
      path: 'delegated',
      exposures: { after_interruption: 1, deliveries_menu: 2 },
    });

    // M11 intact: both loans taken and handed back to their owners.
    const m11 = payload.features.filter((row) => row.item_id === 'M11');

    expect(m11[0]).toMatchObject({
      feature_id: 'm11_unresolved_custodies',
      value: 0,
      numerator: 0,
      denominator: 2,
      disposition: 'observed',
    });
    expect(
      (await familyEvents(page, 'proto_m11_custody_')).map((e) =>
        e.event_type.replace('proto_m11_custody_', ''),
      ),
    ).toEqual(
      expect.arrayContaining([
        'offer_presented',
        'offer_answered',
        'custody_started',
        'owner_available',
        'resolved',
        'departed',
        'window_closed',
      ]),
    );
    expect(await eventsOf(page, 'proto_m11_custody_resolved')).toHaveLength(2);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  test('R3: watch never answered, key card accepted and never offered to Kai before the deadline, logbook declined by pointer — accessible on presence alone, 0 / 1, then a late handover', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await start(page, 'u15r3');
    await valeChain(page, { watch: 'defer', keyCard: 'accept' });

    // No duty was taken: a reading is recorded, uncredited.
    expect(await readGauge(page)).toBe(
      'Gauge read: loop 1.6 bar · bus 26.8 V · relay LOCK.',
    );
    expect(
      meta((await eventsOf(page, 'proto_m09_checks_gauge_read_uncredited'))[0]),
    ).toMatchObject({ reason: 'duty_not_accepted' });
    await handoverThenWorkshop(page);

    // ——— Kai's route dialogue, completed without the deliveries entry:
    // the briefing, "done", and — on the way back — the return line. ———
    await concourseToLab(page);
    await openKaiLab(page);
    await selectPromptLabel(page, 'Understood.');
    await expectStage(page, 'lab_work');
    await openKaiLab(page);
    expect(await promptLabels(page)).toContain(M10_MENU_ENTRY_LABEL);
    await selectPromptLabel(page, 'I am done here — what is next?');
    await expectStage(page, 'exterior_briefing');
    await labToYard(page);
    await noorBriefing(page, 'Ready.');

    // Noor could take the key card (the entry is offered) — not used.
    await openNoor(page);
    expect(await promptLabels(page)).toEqual([
      'Still working.',
      'I am finished outside.',
      M10_MENU_ENTRY_LABEL,
    ]);
    await selectPromptLabel(page, 'I am finished outside.');
    await expectStage(page, 'return_hub');
    // The logbook is declined by POINTER.
    await answerLogbookOffer(page, 'decline', { pointer: true });
    expect(await lastFeedback(page)).toBe(
      'Noor: Back through the airlock — Vale is waiting at the incident desk.',
    );
    await shot(page, '17-r3-declined-logbook-feedback');
    expect(
      meta(
        (await eventsOf(page, 'proto_m10_delivery_offer_answered')).find(
          (e) => meta(e).delivery === 'd2',
        )!,
      ),
    ).toMatchObject({
      answer: 'decline',
      option_position: 2,
      input_mode: 'pointer',
      input_mode_basis: 'window_pointerdown',
    });

    await yardToLab(page);
    await openKaiLab(page);
    expect(await lastPromptBody(page)).toContain('Back from outside');
    expect(await promptLabels(page)).toEqual([
      'Heading to Vale.',
      M10_MENU_ENTRY_LABEL,
    ]);
    await selectPromptLabel(page, 'Heading to Vale.');
    await page.waitForTimeout(300);
    await labToConcourse(page);

    // The log still lists the key card (and no watch line: none taken).
    const log = await openLog(page);

    expect(log).toContain(M10_LOG_LINES.d1);
    expect(log.join('\n')).not.toContain('Monitor watch');
    await shot(page, '16-r3-log-unfulfilled-key-card');
    await closeLog(page);

    await returnShiftAndReview(page);

    // After the review the log shows the record-closed notice only.
    const closedLog = await openLog(page);

    expect(closedLog).toHaveLength(1);
    expect(closedLog.join('\n')).not.toContain('Delivery:');
    await shot(page, '18-record-closed-log');
    await closeLog(page);

    // ——— At the deadline: accessible on the recorded presence alone. ———
    const d1 = (e: { metadata?: Record<string, unknown> }) =>
      meta(e).delivery === 'd1';
    const presence = (await eventsOf(page, 'proto_m10_delivery_person_present'))
      .filter(d1)
      .map((e) => `${meta(e).person}:${meta(e).role}:${meta(e).zone}`);

    expect(presence).toContain('kai:recipient:diagnostics_laboratory');
    expect(presence).toContain('kai:recipient:station_concourse');
    expect(presence).toContain('noor:delegate:exterior_recovery_yard');
    expect(
      (await eventsOf(page, 'proto_m10_delivery_obligation_shown')).filter(
        (e) => meta(e).channel === 'deliveries_menu',
      ),
    ).toEqual([]);

    for (const act of [
      'handed_over',
      'delegated',
      'delegate_accepted',
      'late_handover',
      'late_delegation',
    ]) {
      expect(await eventsOf(page, `proto_m10_delivery_${act}`), act).toEqual(
        [],
      );
    }

    const atDeadline = await reproduce(page);

    expect(atDeadline.rows.M09).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
    });
    expect(atDeadline.rows.M10).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 1,
      disposition: 'observed',
    });

    const deliveries = atDeadline.rows.M10.components.deliveries as Record<
      string,
      {
        status: string;
        accessible: boolean | null;
        accessibility_basis: string | null;
        path: string | null;
        recipient_encounters: number;
        exposures: Record<string, number>;
        late_act: { kind: string; to: string } | null;
      }
    >;

    expect(deliveries.d1).toMatchObject({
      status: 'closed',
      accessible: true,
      accessibility_basis: 'person_present',
      path: 'unfulfilled_at_deadline',
      late_act: null,
    });
    expect(deliveries.d1.exposures.deliveries_menu).toBe(0);
    expect(deliveries.d2).toMatchObject({ status: 'declined' });
    expect(atDeadline.rows.M10.components).toMatchObject({
      declined: 1,
      unfulfilled_at_deadline: 1,
    });

    // ——— After the deadline: the first use of the deliveries menu, with
    // Kai in the Concourse — a late handover. ———
    await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
      approachOffset: { x: 40, y: 0 },
      yFirst: true,
    });
    await openKaiConcourse(page);
    expect(await promptLabels(page)).toEqual([
      'Understood.',
      M10_MENU_ENTRY_LABEL,
    ]);
    await openDeliveriesMenu(page, M10_HANDOVER_LABELS.d1);
    await selectPromptLabel(page, M10_HANDOVER_LABELS.d1);
    await page.waitForTimeout(400);

    const late = await eventsOf(page, 'proto_m10_delivery_late_handover');

    expect(late).toHaveLength(1);
    expect(meta(late[0])).toMatchObject({ delivery: 'd1', to: 'kai' });
    expect(await eventsOf(page, 'proto_m10_delivery_handed_over')).toEqual([]);
    expect(
      (await eventsOf(page, 'proto_m10_delivery_obligation_shown'))
        .filter((e) => meta(e).channel === 'deliveries_menu')
        .map((e) => meta(e).after_closure),
    ).toEqual([true]);

    const afterLate = await reproduce(page);

    // The value and the first outcome are unchanged; the late act is kept
    // beside them.
    expect(afterLate.rows.M10).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 1,
      disposition: 'observed',
    });
    expect(
      (afterLate.rows.M10.components.deliveries as typeof deliveries).d1,
    ).toMatchObject({
      path: 'unfulfilled_at_deadline',
      late_act: { kind: 'late_handover', to: 'kai' },
    });
    expect(
      (afterLate.rows.M10.components.deliveries as typeof deliveries).d1
        .exposures.deliveries_menu,
    ).toBe(0);
    // Nothing is left to hand over.
    await openKaiConcourse(page);
    expect(await promptLabels(page)).toEqual(['Understood.']);
    await selectPromptOption(page, 1);
    await expectFamilyDiscipline(page);
    expectNoRuntimeErrors(errors);
  });

  /** R4's shared pre-reload administration; returns the pre-reload raw log. */
  async function beforeReload(page: Page, tag: string) {
    await start(page, tag);
    await valeChain(page, { watch: 'accept', keyCard: 'accept' });
    await readGauge(page);

    const before = await pagePayload(page);

    expect(before.page_load_index).toBe(1);
    expect(before.prior).toEqual([]);
    expect(
      before.raw_events.filter(
        (event) => event.event_type === 'proto_m09_checks_check_fulfilled',
      ),
    ).toHaveLength(1);

    return before;
  }

  async function reload(page: Page) {
    await page.reload();
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __pilotOpeningProbe?: { open: boolean } | null;
          }
        ).__pilotOpeningProbe?.open === true,
      undefined,
      { timeout: 120_000 },
    );
    await page.waitForTimeout(600);
  }

  test('R4 (reload): both offers accepted and check 1 read, then a page reload — the earlier log is carried byte-identically and both features are interrupted', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);
    const before = await beforeReload(page, 'u15r4');
    const pending = await reproduce(page);

    // Before the reload both observations are simply still running.
    expect(pending.rows.M09.disposition).toBe('pending');
    expect(pending.rows.M10.disposition).toBe('pending');

    await reload(page);

    const after = await pagePayload(page);

    expect(after.page_load_index).toBe(2);
    // Byte-identical: nothing rewritten, nothing renumbered.
    expect(JSON.stringify(after.prior)).toBe(JSON.stringify(before.raw_events));
    expect(
      after.raw_events.filter((event) =>
        /^proto_m(09|10)_/.test(event.event_type),
      ),
    ).toEqual([]);

    const { rows } = await reproduce(page);

    expect(rows.M09).toMatchObject({ value: null, disposition: 'interrupted' });
    expect(rows.M10).toMatchObject({ value: null, disposition: 'interrupted' });
    expectNoRuntimeErrors(errors);
  });

  test('R4 (after the reload): the Concourse reached again — no offer is re-run and the held-back records are written', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);
    const before = await beforeReload(page, 'u15r4b');

    await reload(page);

    // The recorded block (m24_m26_boundary_route header): after a reload
    // the journey driver may be unable to replay the dock tutorial. When
    // it cannot, the post-reload browser administration is NOT VERIFIED —
    // the test is skipped with that reason, never passed.
    let blocked: string | null = null;

    try {
      await press(page, 'Space');
      await waitScene(page, 'dock', 60_000);
      await page.waitForTimeout(1600);
      await completeDockTutorial(page, 1);
      await dockToConcourse(page);
    } catch (error) {
      blocked = (error as Error).message.split('\n')[0];
    }

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the Concourse after the reload (${blocked}); the post-reload administration was not exercised in the browser`,
    );

    // Concourse entry ran the reload guards: both offers are held back.
    const heldBack = (await getEvents(page)).filter((event) =>
      /^proto_m(09_checks|10_delivery)_technical_failure$/.test(
        event.event_type,
      ),
    );

    expect(heldBack.map((e) => e.event_type).sort()).toEqual([
      'proto_m09_checks_technical_failure',
      'proto_m10_delivery_technical_failure',
    ]);
    expect(meta(heldBack.find((e) => /m10/.test(e.event_type))!).delivery).toBe(
      'd1',
    );

    // Vale's briefing chain no longer carries either offer.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'incident_handover');
    await page.waitForTimeout(600);

    const afterBriefing = await promptLabels(page);

    expect(afterBriefing).not.toContain(M09_OFFER_LABELS.accept);
    expect(afterBriefing).not.toContain(M10_OFFER_LABELS.d1.accept);

    if (afterBriefing.length > 0) {
      // Whatever follows (the lamp job when not itself held back) is
      // dismissed deliberately.
      await page.waitForTimeout(450);
      await selectPromptOption(page, afterBriefing.length);
      await page.waitForTimeout(400);
    }

    // Her handover menu offers no re-ask of either.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });

    const menu = await promptLabels(page);

    expect(menu).not.toContain('About the monitor watch…');
    expect(menu).not.toContain('About the delivery…');
    await selectPromptLabel(page, 'Still working on it.');
    await page.waitForTimeout(300);

    // A reading now is uncredited; nothing was presented in this load.
    await readGauge(page);

    const events = await getEvents(page);

    expect(
      events.filter((event) =>
        /^proto_m(09_checks|10_delivery)_(presented|offer_answered|check_window_opened)$/.test(
          event.event_type,
        ),
      ),
    ).toEqual([]);

    const after = await pagePayload(page);

    expect(JSON.stringify(after.prior)).toBe(JSON.stringify(before.raw_events));

    const { rows } = await reproduce(page);

    expect(rows.M09).toMatchObject({ value: null, disposition: 'interrupted' });
    expect(rows.M10).toMatchObject({ value: null, disposition: 'interrupted' });
    expect(rows.M10.components).toMatchObject({ held_back: ['d1'] });
    expectNoRuntimeErrors(errors);
  });
});
