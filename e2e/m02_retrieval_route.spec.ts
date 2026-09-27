/**
 * Station 080 M02 — the six retrieval requests on the participant route
 * (Unit 13, browser). Real navigation from the Dock through the Concourse
 * to the Records Workshop, real pointer AND keyboard input in the case
 * workspace. No developer shortcut reaches the workspace: the Dock
 * tutorial, Vale's handover and the Work Order Board are all played.
 *
 * The Work Order Board presents the workspace; the participant arranges
 * the cases (one by pointer drag, one by keyboard), labels a tray and
 * hands the workspace over by keyboard. Six requests follow:
 *
 *   1  a WRONG case selected by pointer      → advances, "Recorded."
 *   2  the requested case by keyboard        → advances, "Recorded."
 *   3  an empty slot (answers nothing), then Cannot locate by keyboard
 *   4  the workspace closed and reopened (the SAME request, its focused
 *      clock paused), then the requested case by pointer
 *   5  Cannot locate by pointer
 *   6  the requested case by pointer         → the request record
 *
 * Nothing about correctness is shown before the sixth answer; the record
 * is shown after it. The raw family reproduces 3/6 through the read-only
 * extractor with the latencies and the layout kept beside. No
 * participant-visible study identifier anywhere.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { M02_CASES } from '../src/pilot/windows/m02RetrievalModel';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  eventsByPrefix,
  eventsByType,
  FORBIDDEN_TEXT,
  itemStatus,
  validityRecord,
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
  dockToConcourse,
  expectStage,
  interactAt,
  openPromptAt,
  PILOT,
  valeHandover,
  walkTo,
  workshopVia,
} from './pilotHelpers';

const FAMILY = 'proto_m02_workspace_';
const OPPORTUNITY = 'proto_m02_retrieval_series';
const INTAKE = 'm02c_desk';
const KIT_EVENTS = [
  'presented',
  'opportunity_opened',
  'window_closed',
  'technical_failure',
];
const TRAY = (n: number) => `m02c_tray_${n}`;

interface ProbeSlot {
  container_id: string;
  slot_index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  definition_id: string | null;
  code: string | null;
  shown_icon: string | null;
  shown_glyph: string | null;
  shown_code: string | null;
}

interface UiProbe {
  open: boolean;
  mode: string;
  focus: { container_id: string; slot_index: number } | null;
  feedback: string | null;
  detail_text: string | null;
  m02c: {
    phase: string;
    banner: string | null;
    help: string | null;
    request_number: number | null;
    contents_concealed: boolean;
    detail_icon: string | null;
    record: string[];
  } | null;
  slots: ProbeSlot[];
  buttons: {
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    enabled: boolean;
  }[];
}

async function uiProbe(page: Page): Promise<UiProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __inventoryUiProbe?: UiProbe | null })
        .__inventoryUiProbe ?? null,
  );
}

async function waitOverlay(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open ?? false) === expected,
    open,
    { timeout: 8000 },
  );
  await page.waitForTimeout(200);
}

// V4: the 800×600 design space sits at canvas (160 + 1.2x, 1.2y) on the
// 1280×720 canvas (src/world/viewport.ts).
async function gamePoint(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();

  if (box === null) {
    throw new Error('canvas not found');
  }

  return {
    x: box.x + ((160 + x * 1.2) * box.width) / 1280,
    y: box.y + (y * 1.2 * box.height) / 720,
  };
}

function slotAt(probe: UiProbe, containerId: string, slotIndex: number) {
  const slot = probe.slots.find(
    (s) => s.container_id === containerId && s.slot_index === slotIndex,
  );

  if (slot === undefined) {
    throw new Error(`no slot ${containerId}:${slotIndex}`);
  }

  return slot;
}

function slotOfCase(probe: UiProbe, definitionId: string) {
  const slot = probe.slots.find((s) => s.definition_id === definitionId);

  if (slot === undefined) {
    throw new Error(`case ${definitionId} not on any surface`);
  }

  return slot;
}

async function clickSlot(page: Page, slot: ProbeSlot) {
  const point = await gamePoint(page, slot.x + slot.w / 2, slot.y + slot.h / 2);

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(260);
}

async function dragSlot(page: Page, from: ProbeSlot, to: ProbeSlot) {
  const a = await gamePoint(page, from.x + from.w / 2, from.y + from.h / 2);
  const b = await gamePoint(page, to.x + to.w / 2, to.y + to.h / 2);

  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 10, a.y + 10, { steps: 3 });
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function clickButton(page: Page, id: string) {
  const probe = (await uiProbe(page))!;
  const button = probe.buttons.find((b) => b.id === id);

  if (button === undefined) {
    throw new Error(`button ${id} not in probe`);
  }

  const point = await gamePoint(
    page,
    button.x + button.w / 2,
    button.y + button.h / 2,
  );

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(260);
}

/** Moves the keyboard focus to a slot with the arrow keys only. */
async function focusSlot(page: Page, containerId: string, slotIndex: number) {
  for (let presses = 0; presses < 40; presses += 1) {
    const focus = (await uiProbe(page))!.focus;

    if (focus?.container_id === containerId && focus.slot_index === slotIndex) {
      return;
    }

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(90);
  }

  throw new Error(`keyboard focus never reached ${containerId}:${slotIndex}`);
}

async function countType(page: Page, suffix: string) {
  return (await eventsByType(page, `${FAMILY}${suffix}`)).length;
}

async function waitType(
  page: Page,
  suffix: string,
  wanted: number,
  timeout = 4_000,
) {
  const until = Date.now() + timeout;

  while (Date.now() < until) {
    if ((await countType(page, suffix)) >= wanted) {
      return;
    }

    await page.waitForTimeout(150);
  }

  throw new Error(
    `timed out waiting for ${wanted} × ${suffix} (have ${await countType(page, suffix)})`,
  );
}

/** Everything the workspace shows the participant, as one string. */
function shownText(probe: UiProbe): string {
  return [
    probe.m02c?.banner,
    probe.m02c?.help,
    probe.feedback,
    probe.detail_text,
    ...(probe.m02c?.record ?? []),
    ...probe.buttons.map((b) => b.label),
  ]
    .filter((text): text is string => typeof text === 'string')
    .join('\n');
}

const CLOSED_LINE = 'The cases are closed during the requests.';

/** Every case code the system supplies. */
const CASE_CODES = M02_CASES.map((c) => c.code);

/** Parks the pointer on the panel's empty margin (no slot hovered). */
async function parkPointer(page: Page) {
  const point = await gamePoint(page, 400, 380);

  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(200);
}

/** Tray labels and the slot of every case, as the participant left them. */
function organisation(probe: UiProbe) {
  return {
    labels: probe.buttons
      .filter((b) => b.id.startsWith('m02c_label_'))
      .map((b) => [b.id, b.label]),
    slots: probe.slots
      .filter((s) => s.definition_id !== null)
      .map((s) => [s.definition_id, s.container_id, s.slot_index])
      .sort(),
  };
}

/**
 * While a request is open: no system-supplied code or name of any case is
 * shown except the requested case's in the banner, and every occupied slot
 * draws the same closed-case glyph (read from the slot's display objects;
 * a byte comparison of slot pixels is not possible here — the browser
 * resamples the canvas, so equal glyphs at different places differ).
 */
async function expectConcealed(page: Page, requestedCaseId: string) {
  await parkPointer(page);

  const probe = (await uiProbe(page))!;
  const requested = M02_CASES.find((c) => c.definitionId === requestedCaseId)!;

  expect(probe.m02c?.contents_concealed).toBe(true);

  const shown = [
    probe.feedback,
    probe.detail_text,
    probe.m02c?.help,
    ...probe.buttons.map((b) => b.label),
  ]
    .filter((text): text is string => typeof text === 'string')
    .join('\n');

  for (const c of M02_CASES) {
    expect(shown, `${c.code} outside the banner`).not.toContain(c.code);
    expect(shown).not.toContain(c.label);
  }

  for (const code of CASE_CODES.filter((c) => c !== requested.code)) {
    expect(probe.m02c?.banner ?? '', `${code} in the banner`).not.toContain(
      code,
    );
  }

  expect(probe.detail_text).toBe(CLOSED_LINE);
  expect(probe.m02c?.detail_icon).toBeNull();

  // The participant's own tray labels are at full strength (never the
  // dimmed, disabled look) and say what the participant made them say.
  for (const button of probe.buttons.filter((b) =>
    b.id.startsWith('m02c_label_'),
  )) {
    expect(button.enabled, button.id).toBe(true);
  }

  // What every slot draws, read from its display objects: an occupied
  // slot draws the closed-case glyph and no code; an empty one nothing.
  for (const slot of probe.slots) {
    expect(
      slot.shown_code,
      `${slot.container_id}:${slot.slot_index}`,
    ).toBeNull();
    expect(slot.shown_icon).toBe(slot.definition_id === null ? null : 'closed');
  }

  const closed = probe.slots.filter((s) => s.shown_icon === 'closed');

  expect(closed).toHaveLength(6);
  // One glyph: the same size, fill, opacity and place in the cell for
  // every case, whatever its kind.
  expect(new Set(closed.map((s) => s.shown_glyph)).size).toBe(1);
  expect(closed[0].shown_glyph).toMatch(/^16\/18\/[0-9a-f]+\/1\/true\//);
}

/**
 * The two channels that used to name a case: the pointer resting on an
 * occupied slot, and the keyboard focus on one. Neither names it now.
 */
async function expectNoNameOnHover(page: Page, slot: ProbeSlot) {
  const point = await gamePoint(page, slot.x + slot.w / 2, slot.y + slot.h / 2);

  await page.mouse.move(point.x - 30, point.y);
  await page.mouse.move(point.x, point.y, { steps: 4 });
  await page.waitForTimeout(250);

  const probe = (await uiProbe(page))!;

  expect(probe.detail_text).toBe(CLOSED_LINE);
  expect(probe.m02c?.detail_icon).toBeNull();
  expect(slotOfCase(probe, slot.definition_id!).shown_code).toBeNull();
  await parkPointer(page);
}

/** No word about correctness before the series has ended. */
const CORRECTNESS = /match|it was in|not the requested|right|wrong|correct/i;

async function openWorkspace(page: Page) {
  await workshopVia(page, 188, 214);
  await interactAt(page, PILOT.workshop.filingDesk, {
    approachOffset: { x: 4, y: 44 },
  });
  await waitOverlay(page, true);

  const probe = (await uiProbe(page))!;

  expect(probe.mode).toBe('m02case');

  return probe;
}

/** The case the workspace is asking for now (read from the raw log). */
async function requestedCase(page: Page, requestIndex: number) {
  const presented = (await eventsByType(page, `${FAMILY}request_presented`))
    .map((e) => e.metadata ?? {})
    .filter((m) => m.request_index === requestIndex);

  expect(
    presented.length,
    `request ${requestIndex + 1} presented`,
  ).toBeGreaterThan(0);

  const requested = presented[0].requested_case as string;

  await expectBanner(page, requestIndex, requested);
  await expectConcealed(page, requested);

  return requested;
}

/** The banner names the request's number and the requested case itself. */
async function expectBanner(
  page: Page,
  requestIndex: number,
  requestedCaseId: string,
) {
  const label = M02_CASES.find(
    (c) => c.definitionId === requestedCaseId,
  )?.label;

  expect(label, requestedCaseId).toBeDefined();
  expect((await uiProbe(page))?.m02c?.banner).toBe(
    `REQUEST ${requestIndex + 1} OF 6 — ${label}: select the slot holding it`,
  );
}

test.describe('M02 retrieval requests on the route', () => {
  test('ordinary route: organise by pointer and keyboard, hand over, six requests with a wrong selection, Cannot locate twice and a close / reopen; feedback only at the end; reproduced 3/6', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'm02r');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await valeHandover(page);
    await concourseToWorkshop(page);

    // The Work Order Board presents the workspace.
    expect(await countType(page, 'presented')).toBe(0);
    await workshopVia(page, 1312, 178);
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    await selectPromptOption(page, 1); // Take the orders.
    await expectStage(page, 'workshop_work');
    expect(await countType(page, 'presented')).toBe(1);
    expect(await itemStatus(page, 'M02')).toBe('pending');
    await walkTo(page, 1256, 252, { yFirst: true });

    // ——— Organise.
    let probe = await openWorkspace(page);

    await waitType(page, 'opportunity_opened', 1);

    const opened = (await eventsByType(page, `${FAMILY}opportunity_opened`))[0];
    const snapshot = opened.metadata?.entry_state_snapshot as Record<
      string,
      unknown
    >;

    expect(snapshot).toMatchObject({
      requests_planned: 6,
      advance_on_first_answer: true,
      cannot_locate_available: true,
      feedback: 'deferred_to_end',
      layout_frozen_at_handover: true,
      contents_during_requests: 'concealed',
      participant_labels_during_requests: 'visible',
      stage: 'workshop_work',
    });
    expect(opened.metadata).toMatchObject({
      opportunity_id: OPPORTUNITY,
      window_id: 'm02_filing_w1',
      measure_id: 'M02',
    });

    const assigned = snapshot.assigned_order as string[];

    expect([...assigned].sort()).toEqual(
      [
        'm02c_case_i22',
        'm02c_case_k03',
        'm02c_case_r07',
        'm02c_case_r09',
        'm02c_case_s14',
        'm02c_case_s15',
      ].sort(),
    );
    expect(
      probe.slots.filter((s) => s.container_id === INTAKE && s.definition_id),
    ).toHaveLength(6);
    expect(probe.m02c).toMatchObject({ phase: 'organise', banner: null });
    expect(
      probe.buttons.find((b) => b.id === 'm02c_cannot_locate')?.enabled,
    ).toBe(false);
    expect(shownText(probe)).not.toMatch(FORBIDDEN_TEXT);

    // One case by pointer drag, one by keyboard (SPACE picks, arrows carry,
    // SPACE places): the same semantic act by either input mode.
    await dragSlot(
      page,
      slotOfCase(probe, 'm02c_case_s14'),
      slotAt(probe, TRAY(1), 0),
    );
    await waitType(page, 'case_moved', 1);

    probe = (await uiProbe(page))!;

    const r07 = slotOfCase(probe, 'm02c_case_r07');

    await clickSlot(page, r07); // focus only (a plain click never moves)
    await focusSlot(page, r07.container_id, r07.slot_index);
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    await focusSlot(page, TRAY(2), 0);
    await page.keyboard.press('Space');
    await waitType(page, 'case_moved', 2);

    const moves = await eventsByType(page, `${FAMILY}case_moved`);

    expect(
      moves.map((e) => [e.metadata?.case_id, e.metadata?.input_mode]),
    ).toEqual([
      ['m02c_case_s14', 'pointer'],
      ['m02c_case_r07', 'keyboard'],
    ]);

    // A label by pointer, a label by keyboard (L on the focused tray).
    await clickButton(page, 'm02c_label_1');
    await page.keyboard.press('l');
    await waitType(page, 'tray_labelled', 2);
    probe = (await uiProbe(page))!;
    expect(probe.buttons.find((b) => b.id === 'm02c_label_1')?.label).toBe(
      'LABEL: SAMPLES',
    );
    expect(probe.buttons.find((b) => b.id === 'm02c_label_2')?.label).toBe(
      'LABEL: SAMPLES',
    );

    // While organising the cases show what they are: a sample case and a
    // repair ticket do not look alike.
    await parkPointer(page);
    probe = (await uiProbe(page))!;
    expect(probe.m02c?.contents_concealed).toBe(false);

    for (const slot of probe.slots.filter((s) => s.definition_id !== null)) {
      expect(slot.shown_code).toBe(slot.code);
      expect(slot.shown_icon).toMatch(/^inv-icon-m02c-/);
    }

    const handedOverState = organisation(probe);

    expect(handedOverState.labels).toEqual([
      ['m02c_label_1', 'LABEL: SAMPLES'],
      ['m02c_label_2', 'LABEL: SAMPLES'],
      ['m02c_label_3', 'LABEL: none'],
      ['m02c_label_4', 'LABEL: none'],
    ]);

    // ——— Hand over by keyboard.
    await page.keyboard.press('c');
    await waitType(page, 'handed_over', 1);
    await waitType(page, 'request_presented', 1);

    const handedOver = (await eventsByType(page, `${FAMILY}handed_over`))[0];

    expect(handedOver.metadata).toMatchObject({
      window_id: 'm02_filing_w1',
      input_mode: 'keyboard',
      move_count: 2,
      label_changes: 2,
      cases_left_on_intake: 4,
      duplicate_count: 1,
      layout_frozen: true,
    });

    await page.waitForTimeout(300);
    probe = (await uiProbe(page))!;
    expect(probe.m02c).toMatchObject({ phase: 'retrieve', request_number: 1 });
    // Owner ruling: the participant's own organisation — every case's
    // slot and every tray label — is exactly what was handed over; only
    // the system's codes and contents are closed.
    expect(organisation(probe)).toEqual(handedOverState);
    expect(
      (await eventsByType(page, `${FAMILY}request_presented`))[0].metadata,
    ).toMatchObject({ contents_concealed: true });
    expect(probe.m02c?.banner).toMatch(/^REQUEST 1 OF 6 — /);
    expect(probe.m02c?.help).toContain('N cannot locate');
    // No slot is pre-focused for a request.
    expect(probe.focus).toBeNull();
    expect(
      probe.buttons.find((b) => b.id === 'm02c_cannot_locate'),
    ).toMatchObject({ enabled: true, label: 'CANNOT LOCATE (N)' });
    expect(probe.buttons.find((b) => b.id === 'm02c_handover')?.enabled).toBe(
      false,
    );
    expect(shownText(probe)).not.toMatch(FORBIDDEN_TEXT);
    await page.screenshot({ path: 'test-results/m02-request-800x600.png' });

    // With nothing focused, SPACE / ENTER answer nothing.
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    expect(await countType(page, 'request_answered')).toBe(0);

    // A right-click is never an answer.
    {
      const target = slotOfCase(probe, 'm02c_case_k03');
      const point = await gamePoint(
        page,
        target.x + target.w / 2,
        target.y + target.h / 2,
      );

      await page.mouse.click(point.x, point.y, { button: 'right' });
      await page.waitForTimeout(300);
      expect(await countType(page, 'request_answered')).toBe(0);
    }

    // The layout is frozen: a drag moves nothing during the requests.
    await dragSlot(
      page,
      slotOfCase(probe, 'm02c_case_k03'),
      slotAt(probe, TRAY(3), 0),
    );
    probe = (await uiProbe(page))!;
    expect(slotOfCase(probe, 'm02c_case_k03').container_id).toBe(INTAKE);
    expect(probe.feedback).toBe('The layout is fixed after the handover.');
    expect(await countType(page, 'layout_change_refused')).toBe(1);
    expect(await countType(page, 'case_moved')).toBe(2);
    expect(await countType(page, 'request_answered')).toBe(0);

    // ——— Request 1: a WRONG case by pointer — the request advances.
    const first = await requestedCase(page, 0);

    expect(first).toBe(assigned[0]);
    await page.waitForTimeout(500);
    probe = (await uiProbe(page))!;
    // The pointer resting on a filed case names nothing.
    await expectNoNameOnHover(page, slotOfCase(probe, first));
    expect(await countType(page, 'request_answered')).toBe(0);
    probe = (await uiProbe(page))!;
    await clickSlot(
      page,
      probe.slots.find(
        (s) => s.definition_id !== null && s.definition_id !== first,
      )!,
    );
    await waitType(page, 'request_answered', 1);
    await waitType(page, 'request_presented', 2);
    probe = (await uiProbe(page))!;
    expect(probe.feedback).toBe('Recorded.');
    expect(probe.m02c).toMatchObject({ request_number: 2 });
    expect(probe.focus).toBeNull();
    expect(shownText(probe)).not.toMatch(CORRECTNESS);
    expect(
      (await eventsByType(page, `${FAMILY}request_answered`))[0].metadata,
    ).toMatchObject({
      request_index: 0,
      requested_case: first,
      answer_kind: 'pick',
      correct: false,
      first_answer: true,
      feedback_shown: false,
      input_mode: 'pointer',
      window_id: 'm02_requests_w1',
      phase: 'measurement',
    });

    // ——— Request 2: the requested case by keyboard.
    const second = await requestedCase(page, 1);
    const secondSlot = slotOfCase(probe, second);

    await page.waitForTimeout(500);
    await focusSlot(page, secondSlot.container_id, secondSlot.slot_index);

    // The keyboard focus on a filed case names nothing either.
    {
      const focused = (await uiProbe(page))!;

      expect(focused.focus).toEqual({
        container_id: secondSlot.container_id,
        slot_index: secondSlot.slot_index,
      });
      expect(focused.detail_text).toBe(CLOSED_LINE);
      expect(focused.m02c?.detail_icon).toBeNull();
      expect(slotOfCase(focused, second).shown_icon).toBe('closed');
      expect(slotOfCase(focused, second).shown_code).toBeNull();
    }

    await page.keyboard.press('Enter');
    await waitType(page, 'request_answered', 2);
    probe = (await uiProbe(page))!;
    expect(probe.feedback).toBe('Recorded.');
    expect(probe.m02c).toMatchObject({ request_number: 3 });
    expect(shownText(probe)).not.toMatch(CORRECTNESS);
    expect(
      (await eventsByType(page, `${FAMILY}request_answered`))[1].metadata,
    ).toMatchObject({
      request_index: 1,
      picked_case: second,
      correct: true,
      input_mode: 'keyboard',
    });

    // ——— Request 3: an empty slot answers nothing; Cannot locate by keyboard.
    await page.waitForTimeout(500);
    await clickSlot(page, slotAt(probe, TRAY(4), 3));
    await waitType(page, 'empty_slot_selected', 1);
    probe = (await uiProbe(page))!;
    expect(probe.feedback).toBe('Empty slot.');
    expect(probe.m02c).toMatchObject({ request_number: 3 });
    expect(await countType(page, 'request_answered')).toBe(2);
    await page.keyboard.press('n');
    await waitType(page, 'request_answered', 3);
    probe = (await uiProbe(page))!;
    expect(probe.feedback).toBe('Recorded.');
    expect(probe.m02c).toMatchObject({ request_number: 4 });
    expect(
      (await eventsByType(page, `${FAMILY}request_answered`))[2].metadata,
    ).toMatchObject({
      request_index: 2,
      answer_kind: 'cannot_locate',
      picked_case: null,
      correct: false,
      empty_selections: 1,
      input_mode: 'keyboard',
    });

    // ——— Request 4: close and reopen — the same request, its clock paused.
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);
    await waitType(page, 'surface_closed', 1);
    expect(await itemStatus(page, 'M02')).toBe('open');
    expect(await countType(page, 'window_closed')).toBe(0);
    await page.waitForTimeout(1_500);
    probe = await openWorkspace(page);
    await waitType(page, 'surface_reopened', 1);
    expect(probe.m02c).toMatchObject({ phase: 'retrieve', request_number: 4 });
    expect(probe.focus).toBeNull();
    // No re-seed: the layout is the one handed over.
    expect(slotOfCase(probe, 'm02c_case_s14').container_id).toBe(TRAY(1));
    expect(slotOfCase(probe, 'm02c_case_r07').container_id).toBe(TRAY(2));
    expect(await countType(page, 'opportunity_opened')).toBe(1);

    const fourthPresented = (
      await eventsByType(page, `${FAMILY}request_presented`)
    )
      .map((e) => e.metadata ?? {})
      .filter((m) => m.request_index === 3);

    expect(fourthPresented.map((m) => m.presentation_number)).toEqual([1, 2]);

    const fourth = fourthPresented[0].requested_case as string;

    // The reopened workspace asks for the same case again.
    await expectBanner(page, 3, fourth);
    await expectConcealed(page, fourth);
    // The reopened workspace shows the participant's organisation as it
    // was handed over.
    expect(organisation((await uiProbe(page))!)).toEqual(handedOverState);

    await page.waitForTimeout(500);
    await clickSlot(page, slotOfCase(probe, fourth));
    await waitType(page, 'request_answered', 4);

    const fourthAnswer = (
      await eventsByType(page, `${FAMILY}request_answered`)
    )[3].metadata as Record<string, unknown>;

    expect(fourthAnswer).toMatchObject({
      request_index: 3,
      picked_case: fourth,
      correct: true,
      presentations: 2,
    });
    expect(
      (fourthAnswer.excluded_ms as Record<string, number>).surface_closed,
    ).toBeGreaterThan(1_000);
    expect(fourthAnswer.focused_ms as number).toBeLessThan(
      fourthAnswer.wall_ms as number,
    );

    // ——— Request 5: Cannot locate by pointer.
    await page.waitForTimeout(500);
    await clickButton(page, 'm02c_cannot_locate');
    await waitType(page, 'request_answered', 5);
    probe = (await uiProbe(page))!;
    expect(probe.m02c).toMatchObject({ request_number: 6 });
    expect(probe.m02c?.record).toEqual([]);
    expect(shownText(probe)).not.toMatch(CORRECTNESS);
    expect(await countType(page, 'feedback_shown')).toBe(0);
    expect(
      (await eventsByType(page, `${FAMILY}request_answered`))[4].metadata,
    ).toMatchObject({
      request_index: 4,
      answer_kind: 'cannot_locate',
      input_mode: 'pointer',
    });

    // ——— Request 6: the requested case — the series ends, the record shows.
    const sixth = await requestedCase(page, 5);

    await page.waitForTimeout(500);
    await clickSlot(page, slotOfCase(probe, sixth));
    await waitType(page, 'request_answered', 6);
    await waitType(page, 'feedback_shown', 1);
    await waitType(page, 'window_closed', 1);
    await page.waitForTimeout(300);
    probe = (await uiProbe(page))!;
    expect(probe.m02c).toMatchObject({
      phase: 'closed',
      request_number: null,
      banner: 'REQUESTS COMPLETE — request record below',
    });
    expect(probe.m02c?.record).toHaveLength(6);

    // Every line fits its column in any monospace font.
    for (const line of probe.m02c?.record ?? []) {
      expect(line.length, line).toBeLessThanOrEqual(45);
    }

    expect(probe.m02c?.record[0]).toMatch(/^1\. .+: selected .+ — it was in /);
    expect(probe.m02c?.record[1]).toMatch(/^2\. .+: selected .+ — matched$/);
    expect(probe.m02c?.record[2]).toMatch(
      /^3\. .+: cannot locate — it was in /,
    );
    expect(probe.m02c?.record[3]).toMatch(/^4\. .+ — matched$/);
    expect(probe.m02c?.record[4]).toMatch(/^5\. .+: cannot locate — /);
    expect(probe.m02c?.record[5]).toMatch(/^6\. .+ — matched$/);
    expect(
      probe.buttons.find((b) => b.id === 'm02c_cannot_locate')?.enabled,
    ).toBe(false);
    expect(shownText(probe)).not.toMatch(FORBIDDEN_TEXT);
    // The record is the authorised feedback point: the cases show what
    // they are again, in the places the participant gave them.
    await parkPointer(page);
    probe = (await uiProbe(page))!;
    expect(probe.m02c?.contents_concealed).toBe(false);
    expect(organisation(probe)).toEqual(handedOverState);

    for (const slot of probe.slots.filter((s) => s.definition_id !== null)) {
      expect(slot.shown_code).toBe(slot.code);
      expect(slot.shown_icon).toMatch(/^inv-icon-m02c-/);
    }

    await page.screenshot({ path: 'test-results/m02-record-800x600.png' });

    const closed = (await eventsByType(page, `${FAMILY}window_closed`))[0];
    const raw = closed.metadata?.raw_components as Record<string, unknown>;

    expect(closed.metadata?.exit_state).toBe('completed');
    expect(raw).toMatchObject({
      handed_over: true,
      requests_planned: 6,
      requests_presented: 6,
      requests_answered: 6,
      requests_inaccessible: 0,
      correct_first_retrievals: 3,
      cannot_locate_count: 2,
      wrong_selection_count: 1,
      empty_selections: 1,
      surface_closures: 1,
      feedback_shown: true,
      assigned_order: assigned,
      realised_order: assigned,
      closure_reason: 'completed',
    });
    expect((await validityRecord(page, OPPORTUNITY)).validity).toBe('valid');
    expect(await itemStatus(page, 'M02')).toBe('completed');

    // A read-only record: a further selection answers nothing.
    await clickSlot(page, slotOfCase(probe, sixth));
    await page.keyboard.press('n');
    await page.waitForTimeout(300);
    expect(await countType(page, 'request_answered')).toBe(6);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    // Reopened after the end: the same record, nothing re-run.
    probe = await openWorkspace(page);
    await waitType(page, 'feedback_reviewed', 1);
    expect(probe.m02c?.record).toHaveLength(6);
    expect(await countType(page, 'request_presented')).toBe(7);
    expect(await countType(page, 'window_closed')).toBe(1);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    // Every event of the family: one opportunity, the protocol stamp, no
    // canonical study item / construct / success.
    const family = await eventsByPrefix(page, FAMILY);

    for (const event of family) {
      const m = event.metadata ?? {};

      expect(m.measure_id).toBe('M02');
      expect(m.opportunity_id).toBe(OPPORTUNITY);
      expect(['m02_filing_w1', 'm02_requests_w1']).toContain(m.window_id);

      // The shared window kit logs its own lifecycle events; every event
      // the model logs carries the protocol stamp.
      if (!KIT_EVENTS.includes(event.event_type.slice(FAMILY.length))) {
        expect(m.measurement_protocol_version, event.event_type).toBe(
          'station080-m26-pilot-v1',
        );
      }

      const canonical = event as unknown as Record<string, unknown>;

      expect(canonical.study_item_ids ?? undefined).toBeUndefined();
      expect(canonical.construct_id ?? undefined).toBeUndefined();
      expect(canonical.success ?? undefined).toBeUndefined();
    }

    // The retired v2 family never fires on the route.
    expect(await eventsByPrefix(page, 'proto_m02_case_')).toEqual([]);

    // Independent reproduction from the raw family alone.
    const rows = extractItemFeatures(
      'M02',
      family as unknown as RawGameEvent[],
      { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false },
    );

    expect(rows[0]).toMatchObject({
      feature_id: 'm02_correct_first_retrievals',
      value: 3,
      numerator: 3,
      denominator: 6,
      planned_denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });
    expect(rows[0].components).toMatchObject({
      cannot_locate_count: 2,
      wrong_selection_count: 1,
      recount_agrees: true,
    });
    expect(rows[1]).toMatchObject({
      feature_id: 'm02_retrieval_latency',
      disposition: 'observed',
    });
    expect(
      Object.values(rows[1].value as Record<string, { status: string }>).filter(
        (entry) => entry.status === 'answered',
      ),
    ).toHaveLength(6);
    expect(rows[2]).toMatchObject({
      feature_id: 'm02_filing_layout',
      disposition: 'observed',
    });
    expect(rows[2].value).toMatchObject({
      cases_left_on_intake: 4,
      move_count: 2,
      label_changes: 2,
    });
    expect(JSON.stringify(rows)).not.toMatch(/score|disorgani|tidy/i);
    expectNoRuntimeErrors(errors);
  });
});
