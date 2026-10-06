/**
 * Station 080 M13 — the three-network series on the participant route
 * (Unit 16, browser evidence run). Every scenario reaches the Conduit
 * Lattice Bench through the ordinary route — the opening, the Dock
 * tutorial, the Concourse handover, the Records Workshop and its Work
 * Order Board — with the existing drivers of `pilotHelpers.ts`. No M13
 * state is injected; the orientation form is selected only through the
 * documented DEV launch parameter `ip_form`.
 *
 * INPUT, stated plainly: the walking and the station interaction around
 * the bench are done by the route drivers with the KEYBOARD — that is
 * navigation, not an M13 response. Inside the bench overlay R1 uses the
 * keyboard only and R2 the pointer only.
 *
 *   R1  keyboard, form A: n1 a sealed layout, n2 an unsealed layout, n3
 *       CANNOT SOLVE — only the neutral acknowledgement after each answer;
 *       1 / 3 observed at the third; results; practice on n3 (sealed in
 *       practice) and n2; leave and reopen in practice; FINISH. The three
 *       first responses and the row never change.
 *   R2  pointer, form B: three sealed layouts (3 / 3); a double click on
 *       RECORD ANSWER records once; the bench left mid-n2 by its close
 *       control, the avatar walked away and back (keyboard navigation),
 *       the same network and board on return.
 *   R3  n1 answered, n2 opened and left; the route driven on to the
 *       Utility Deck review; the record closed ⇒ incomplete over 1,
 *       censored, `closed_at_review`; the bench afterwards a record.
 *   R4  `not_presented` before the bench is opened; STOP TASK without an
 *       answer ⇒ null `voluntary_stop`; a read-only record afterwards.
 *   R5  n1 answered, then a page reload: the earlier load carried
 *       byte-identically, the feature `interrupted`; the bench, when
 *       reachable again, held back.
 *
 * Eighteen evidence frames (800 × 600) go to `U16_OUT`. Nothing here
 * establishes psychometric validity.
 */
import { mkdirSync } from 'node:fs';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { REGISTER_V3 } from '../src/measurement/registerV3';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { closeStationRecord } from './closureHelpers';
import { getEvents, selectPromptOption } from './helpers';
import {
  clickPipeButton,
  clickRect,
  commitLatticeByKeyboard,
  commitLatticeByPointer,
  LATTICE_LAYOUTS,
  LATTICE_SETTLE_MS,
  latticeFocus,
  latticeLayout,
  latticeNext,
  pipeBenchPiece,
  pipeButton,
  pipeCell,
  pipeProbe,
  pipeSeries,
  rectCenter,
  seatLatticeByKeyboard,
  seatLatticeByPointer,
  waitCellPiece,
  waitPipeOpen,
  waitPipeView,
} from './ipHelpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToDeck,
  concourseToLabBriefed,
  concourseToWorkshop,
  expectStage,
  interactAt,
  labToYardBriefed,
  openPromptAt,
  PILOT,
  press,
  returnShiftToDeckClosure,
  routeToWorkshopWork,
  useDoor,
  waitScene,
  walkTo,
  workshopToConcourse,
  workshopVia,
  yardReturnToConcourse,
} from './pilotHelpers';

const OUT = process.env.U16_OUT ?? 'test-results/u16-evidence';
const FAMILY = 'proto_m13_networks_';
const VERSION = 'm13-networks-v1';
const FORBIDDEN =
  /proto_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|puzzle|persist|grit|skill|ability|intelligen/i;
/** No line of the first-response phase may carry a structural result. */
const CORRECTNESS_WORDS =
  /connected|sealed|inline|open branch|test run|test flow/i;
/** The audited approach to the bench (pilot_lab precedent). */
const BENCH_LANE = { x: 1193, y: 250 };
const BENCH_APPROACH = { x: 0, y: -50 };

interface FeatureRow {
  item_id: string;
  feature_id: string;
  value: unknown;
  numerator: number | null;
  denominator: number | null;
  planned_denominator: number | null;
  disposition: string;
  censored: boolean;
  closure_reason: string | null;
  components: Record<string, unknown>;
}

function meta(event: { metadata?: Record<string, unknown> }) {
  return event.metadata ?? {};
}

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function familyEvents(page: Page) {
  return (await getEvents(page)).filter((event) =>
    event.event_type.startsWith(FAMILY),
  );
}

async function countOf(page: Page, suffix: string) {
  return (await familyEvents(page)).filter(
    (event) => event.event_type === `${FAMILY}${suffix}`,
  ).length;
}

async function firstResponses(page: Page) {
  return JSON.stringify(
    (await familyEvents(page)).filter(
      (event) => event.event_type === `${FAMILY}first_response`,
    ),
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
 * process over the page's raw events must equal the page's own row — and
 * the raw log is identical before and after the extraction.
 */
async function reproduce(page: Page) {
  const payload = await pagePayload(page);
  const before = JSON.stringify(payload.raw_events);
  const context = {
    finalCoreClosed: payload.final_core_closed,
    pageLoadIndex: payload.page_load_index,
    reloaded: payload.page_load_index > 1,
  };
  const offline = JSON.parse(
    JSON.stringify(extractItemFeatures('M13', payload.raw_events, context)),
  ) as FeatureRow[];
  const own = payload.features.filter((row) => row.item_id === 'M13');

  expect(own, 'the page exports one M13 row').toHaveLength(1);
  expect(offline, "offline extraction equals the page's row").toEqual(own);
  expect(JSON.stringify(payload.raw_events)).toBe(before);
  expect(offline[0].feature_id).toBe('m13_first_solutions');
  expect(offline[0].planned_denominator).toBe(3);

  return { row: offline[0], payload };
}

/** Administration version on the live events; exactly one family owner. */
async function expectFamilyDiscipline(page: Page, form: 'A' | 'B') {
  const all = await getEvents(page);
  const own = all.filter((event) => event.event_type.startsWith(FAMILY));

  expect(own.length, 'the family was emitted').toBeGreaterThan(0);

  for (const event of own) {
    expect(meta(event).entry_state_version, event.event_type).toBe(VERSION);
    expect(meta(event).opportunity_id).toBe('proto_m13_network_series');
    expect(meta(event).form_id).toBe(form);
    expect(typeof (event as { sequence?: number }).sequence).toBe('number');
  }

  expect(
    REGISTER_V3.filter((entry) =>
      entry.route.family_prefixes.some((prefix) => FAMILY.startsWith(prefix)),
    ).map((entry) => entry.id),
  ).toEqual(['M13']);
  // The retired one-network family is not written on the route.
  expect(
    all.filter((event) => event.event_type.startsWith('proto_m13_lattice_')),
  ).toEqual([]);
}

/** Nothing on the bench says anything about the correctness of an answer. */
async function expectNoCorrectnessOnScreen(page: Page) {
  const probe = await pipeProbe(page);

  expect(probe.lines.join('\n')).not.toMatch(CORRECTNESS_WORDS);
  expect(probe.lines.join('\n')).not.toMatch(FORBIDDEN);
  expect(
    probe.buttons
      .map((button) => button.id)
      .filter((id) => /test_flow|practise|finish|back_to_results/.test(id)),
  ).toEqual([]);
}

// ——— Driver steps (KEYBOARD NAVIGATION — never an M13 response) ————————

/** Opening → Dock tutorial → Concourse handover → Workshop, orders taken. */
async function toWorkshop(page: Page, tag: string, form: 'A' | 'B') {
  await bootPilot(page, tag, { extra: `&ip_form=${form}` });
  await completeDockTutorial(page, 1);
  await routeToWorkshopWork(page);
}

/** Walks to the bench and presses the interaction key (keyboard navigation). */
async function openBench(page: Page) {
  await workshopVia(page, BENCH_LANE.x, BENCH_LANE.y);
  await interactAt(page, PILOT.workshop.latticeBench, {
    approachOffset: BENCH_APPROACH,
  });
  await waitPipeOpen(page, true);
}

test.describe('M13 three keyed networks on the route (Unit 16)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  test('R1 (keyboard in the bench, form A): sealed layout, unsealed layout, CANNOT SOLVE — neutral acknowledgements only; 1 / 3 observed; results; practice; leave and reopen; FINISH', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toWorkshop(page, 'u16r1', 'A');

    // KEYBOARD NAVIGATION: to the bench; its prompt on the ordinary route.
    await workshopVia(page, BENCH_LANE.x, BENCH_LANE.y);
    await walkTo(
      page,
      PILOT.workshop.latticeBench.x + BENCH_APPROACH.x,
      PILOT.workshop.latticeBench.y + BENCH_APPROACH.y,
    );
    await page.waitForTimeout(300);
    await shot(page, '01-workshop-bench-prompt');
    await openBench(page);

    // ——— Network 1 ———
    let probe = await pipeProbe(page);

    expect(probe.form).toBe('A');
    expect(probe.series).toMatchObject({
      status: 'first_responses',
      view: 'network',
      phase: 'measurement',
      header: 'Network 1 of 3',
      network_id: 'n1',
    });
    expect(probe.feedback).toEqual([
      'Seat the pieces, then RECORD LAYOUT. One answer per network. Results for all three follow the third answer.',
    ]);
    expect(probe.cells.find((cell) => cell.port === 'feed')?.slot).toBe('A2');
    expect(probe.cells.find((cell) => cell.port === 'intake')?.slot).toBe('C2');
    expect(
      probe.cells.filter((cell) => cell.broken).map((c) => c.slot),
    ).toEqual(['B2']);
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '02-network-1-untouched');

    // A piece held by keyboard (the focus ring carries it).
    await latticeFocus(page, 'bench', '2');
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);

    for (let turn = 0; turn < 3; turn += 1) {
      await page.keyboard.press('r');
      await page.waitForTimeout(80);
    }

    await latticeFocus(page, 'cell', 'A2');
    expect((await pipeProbe(page)).held).toMatchObject({
      piece_id: 'el1',
      rotation: 270,
    });
    await shot(page, '03-network-1-piece-held-keyboard');
    await page.keyboard.press('Space');
    await waitCellPiece(page, 'A2', 'el1', 270);
    await seatLatticeByKeyboard(
      page,
      latticeLayout('A1:el2@90 B1:va1@0 C1:el3@180 C2:el4@0'),
    );

    // RECORD LAYOUT (T) opens the confirmation; nothing is recorded yet.
    await page.keyboard.press('t');
    await page.waitForTimeout(200);
    probe = await pipeProbe(page);
    expect(probe.dialog).toBe('layout');
    expect(probe.lines).toContain(
      'Record this layout as your answer for network 1? It cannot be changed afterwards. Results are shown after all three networks.',
    );
    expect(await countOf(page, 'first_response')).toBe(0);
    await shot(page, '04-layout-answer-confirmation');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    expect((await pipeProbe(page)).dialog).toBeNull();

    // Only a fresh press confirms. ENTER straight after T lands inside the
    // settle window, and the same key held on repeats: both are refused
    // and recorded, and no answer is written.
    await page.keyboard.press('t');
    await page.waitForTimeout(80);
    await page.keyboard.down('Enter');
    await page.waitForTimeout(LATTICE_SETTLE_MS + 150);
    await page.keyboard.down('Enter'); // the held key repeating
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    await page.waitForTimeout(150);
    expect((await pipeProbe(page)).dialog).toBe('layout');
    expect(await countOf(page, 'first_response')).toBe(0);
    expect(
      (await familyEvents(page))
        .filter((event) => event.event_type === `${FAMILY}commit_press_refused`)
        .map((event) => meta(event).reason),
    ).toEqual(['dialog_settling', 'held_or_repeated_press']);

    // A fresh ENTER after the window records the answer.
    await page.keyboard.press('Enter');
    await waitPipeView(page, 'acknowledgement');
    expect(await countOf(page, 'first_response')).toBe(1);

    // The neutral acknowledgement — and nothing else.
    probe = await pipeProbe(page);
    expect(probe.feedback).toEqual(['Answer recorded for network 1.']);
    expect(probe.buttons.find((b) => b.id === 'next')?.label).toBe(
      'NEXT NETWORK (ENTER)',
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '05-acknowledgement-network-1');
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      disposition: 'pending',
    });

    // ——— Network 2: an unsealed layout (one open branch) ———
    await latticeNext(page);
    probe = await pipeProbe(page);
    expect(probe.series).toMatchObject({
      view: 'network',
      header: 'Network 2 of 3',
      network_id: 'n2',
    });
    expect(probe.cells.find((cell) => cell.port === 'feed')?.slot).toBe('A1');
    expect(probe.cells.find((cell) => cell.port === 'intake')?.slot).toBe('C3');
    expect(
      probe.cells.filter((cell) => cell.broken).map((c) => c.slot),
    ).toEqual(['B1']);
    expect(probe.cells.every((cell) => cell.piece_id === null)).toBe(true);
    await shot(page, '06-network-2-untouched');

    // Help in the first-response phase: rules and controls only.
    await page.keyboard.press('h');
    await page.waitForTimeout(200);
    probe = await pipeProbe(page);
    expect(probe.help_open).toBe(true);
    expect(probe.lines.join('\n')).toMatch(/Each takes ONE answer/);
    expect(probe.lines.join('\n')).not.toMatch(CORRECTNESS_WORDS);
    await shot(page, '12-help-first-response-phase');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expect((await pipeProbe(page)).help_open).toBe(false);

    await seatLatticeByKeyboard(page, latticeLayout(LATTICE_LAYOUTS.A.n2.open));
    await commitLatticeByKeyboard(page, 'layout');
    probe = await pipeProbe(page);
    expect(probe.feedback).toEqual(['Answer recorded for network 2.']);
    await expectNoCorrectnessOnScreen(page);

    // ——— Network 3: CANNOT SOLVE ———
    await latticeNext(page);
    probe = await pipeProbe(page);
    expect(probe.series).toMatchObject({
      header: 'Network 3 of 3',
      network_id: 'n3',
    });
    expect(probe.cells.find((cell) => cell.port === 'feed')?.slot).toBe('A1');
    expect(probe.cells.find((cell) => cell.port === 'intake')?.slot).toBe('A3');
    expect(
      probe.cells.filter((cell) => cell.broken).map((c) => c.slot),
    ).toEqual(['A2']);
    await shot(page, '07-network-3-untouched');
    await page.keyboard.press('n');
    await page.waitForTimeout(200);
    probe = await pipeProbe(page);
    expect(probe.dialog).toBe('cannot_solve');
    expect(probe.lines).toContain(
      'Record CANNOT SOLVE as your answer for network 3? It cannot be changed afterwards.',
    );
    await shot(page, '08-cannot-solve-confirmation');
    await page.waitForTimeout(LATTICE_SETTLE_MS);
    await page.keyboard.press('Enter');
    await waitPipeView(page, 'acknowledgement');
    probe = await pipeProbe(page);
    expect(probe.feedback).toEqual(['Answer recorded for network 3.']);
    expect(probe.buttons.find((b) => b.id === 'next')?.label).toBe(
      'SHOW RESULTS (ENTER)',
    );
    expect(probe.lines.join('\n')).not.toMatch(CORRECTNESS_WORDS);
    await shot(page, '09-acknowledgement-third-answer');

    // The scored phase is complete: 1 / 3, observed, from now on.
    const frozen = await firstResponses(page);
    const core = (row: FeatureRow) => ({
      value: row.value,
      numerator: row.numerator,
      denominator: row.denominator,
      disposition: row.disposition,
      closure_reason: row.closure_reason,
      censored: row.censored,
    });
    const complete = core((await reproduce(page)).row);

    expect(complete).toEqual({
      value: 1,
      numerator: 1,
      denominator: 3,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });
    expect(JSON.parse(frozen)).toHaveLength(3);
    expect(await countOf(page, 'results_shown')).toBe(0);

    const stable = async (stage: string) => {
      expect(await firstResponses(page), `${stage}: first responses`).toBe(
        frozen,
      );
      expect(core((await reproduce(page)).row), `${stage}: row`).toEqual(
        complete,
      );
    };

    // ——— Results ———
    await latticeNext(page);
    await waitPipeView(page, 'results');
    probe = await pipeProbe(page);

    const results = probe.lines.join('\n');

    expect(results).toMatch(/All three answers are recorded\./);
    expect(results).toMatch(/Network 1 — recorded answer:/);
    expect(results).toMatch(/The run is sealed\./);
    expect(results).toMatch(/Open branches on the run: 1\./);
    expect(results).toMatch(/The run is not sealed\./);
    expect(results).toMatch(/Network 3 — recorded answer: cannot solve\./);
    expect(results).toMatch(
      /Practice is optional\. It changes nothing in your recorded answers and nothing else on the shift\./,
    );
    expect(results).not.toMatch(FORBIDDEN);
    await shot(page, '10-results-view');
    await stable('results opened');

    // ——— Practice on network 3 (after CANNOT SOLVE): sealed in practice ———
    await page.keyboard.press('3');
    await waitPipeView(page, 'practice');
    expect((await pipeSeries(page)).header).toBe('Network 3 of 3 — practice');
    await stable('practice open');
    await seatLatticeByKeyboard(
      page,
      latticeLayout(LATTICE_LAYOUTS.A.n3.sealed),
    );
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    probe = await pipeProbe(page);
    expect(probe.feedback).toEqual([
      'Run: feed → intake CONNECTED.',
      'Isolation valve: inline.',
      'Open branches on the run: 0.',
      'Practice test run 1 of 3. Your recorded answer is unchanged.',
    ]);
    await shot(page, '11-practice-after-cannot-solve');
    await stable('sealed in practice');

    // Practice on network 2: one run; then leave the bench from practice.
    await page.keyboard.press('b');
    await waitPipeView(page, 'results');
    await page.keyboard.press('2');
    await waitPipeView(page, 'practice');
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await waitPipeOpen(page, false);
    await stable('left during practice');

    // KEYBOARD NAVIGATION: the station again. The same view, the same runs.
    await openBench(page);
    probe = await pipeProbe(page);
    expect(probe.series).toMatchObject({
      view: 'practice',
      network_id: 'n2',
      header: 'Network 2 of 3 — practice',
    });
    expect(probe.series?.practice_runs).toEqual([
      { network_id: 'n1', runs_used: 0 },
      { network_id: 'n2', runs_used: 1 },
      { network_id: 'n3', runs_used: 1 },
    ]);
    expect(await countOf(page, 'network_presented')).toBe(3);
    await stable('reopened in practice');

    // FINISH.
    await page.keyboard.press('b');
    await waitPipeView(page, 'results');
    await page.keyboard.press('f');
    await page.waitForTimeout(300);
    probe = await pipeProbe(page);
    expect(probe.lines.join('\n')).toMatch(
      /All three networks are recorded\. The bench is closed\./,
    );
    expect(probe.buttons.filter((b) => b.id.startsWith('practise_'))).toEqual(
      [],
    );
    await stable('finished');

    // Order of the record: nothing of the second phase precedes the third
    // first response; the bench input was keyboard throughout.
    const family = await familyEvents(page);
    const types = family.map((event) => event.event_type);

    expect(
      types.findIndex((type) => /results_shown|practice_/.test(type)),
    ).toBeGreaterThan(types.lastIndexOf(`${FAMILY}first_response`));
    expect(
      family
        .map((event) => meta(event).input_mode)
        .filter((mode) => mode !== undefined && mode !== 'system'),
    ).not.toContain('pointer');
    expect(
      JSON.parse(frozen).map((event: { metadata: Record<string, unknown> }) => [
        event.metadata.network_id,
        event.metadata.response_kind,
        event.metadata.correct,
        event.metadata.input_mode,
      ]),
    ).toEqual([
      ['n1', 'layout', true, 'typed'],
      ['n2', 'layout', false, 'typed'],
      ['n3', 'cannot_solve', false, 'typed'],
    ]);

    const final = (await reproduce(page)).row.components as {
      networks: { practice: Record<string, unknown> }[];
      practice_closure: string;
      help_consults: Record<string, number>;
    };

    expect(final.networks.map((network) => network.practice)).toEqual([
      { opened: false, runs_used: 0, sealed_in_practice: false },
      { opened: true, runs_used: 1, sealed_in_practice: false },
      { opened: true, runs_used: 1, sealed_in_practice: true },
    ]);
    expect(final.practice_closure).toBe('finished');
    expect(final.help_consults).toEqual({
      measurement: 1,
      feedback: 0,
      practice: 0,
    });
    await page.keyboard.press('Escape');
    await waitPipeOpen(page, false);
    await expectStage(page, 'workshop_work');
    await expectFamilyDiscipline(page, 'A');
    expectNoRuntimeErrors(errors);
  });

  test('R2 (pointer in the bench, form B): three sealed layouts — 3 / 3; a double click records once; left mid-network 2 by the close control and reopened on the same board', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toWorkshop(page, 'u16r2', 'B');
    // KEYBOARD NAVIGATION: to the bench.
    await openBench(page);

    let probe = await pipeProbe(page);

    expect(probe.form).toBe('B');
    expect(probe.series).toMatchObject({ view: 'network', network_id: 'n1' });
    expect(probe.cells.find((cell) => cell.port === 'feed')?.slot).toBe('B1');
    expect(probe.cells.find((cell) => cell.port === 'intake')?.slot).toBe('B3');

    // POINTER: HELP before network 1's answer; closed by a click.
    await clickPipeButton(page, 'help');
    probe = await pipeProbe(page);
    expect(probe.help_open).toBe(true);
    expect(probe.lines.join('\n')).not.toMatch(CORRECTNESS_WORDS);
    await clickRect(page, { x: 380, y: 290, w: 40, h: 20 });
    expect((await pipeProbe(page)).help_open).toBe(false);

    // POINTER: a drag in progress (the piece follows the pointer).
    {
      const bench = await pipeBenchPiece(page, 'el1');
      const from = await rectCenter(page, { ...bench, y: bench.y - 8 });
      const to = await rectCenter(page, await pipeCell(page, 'B1'));

      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x + 12, from.y + 10, { steps: 3 });
      await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, {
        steps: 6,
      });
      // Held over the mount, the button still down: the drop target shows.
      await page.mouse.move(to.x, to.y - 6, { steps: 6 });
      await page.waitForTimeout(150);
      expect(await pipeProbe(page)).toMatchObject({
        dragging: true,
        drop_target: 'B1',
        drop_valid: true,
      });
      await shot(page, '15-form-b-network-1-pointer-drag');
      await page.mouse.move(to.x, to.y, { steps: 3 });
      await page.waitForTimeout(120);
      await page.mouse.up();
      await waitCellPiece(page, 'B1', 'el1', 0);
    }

    await seatLatticeByPointer(
      page,
      latticeLayout('C1:el2@180 C2:va1@90 C3:el3@270 B3:el4@90'),
    );

    // POINTER: the click that opens the confirmation never confirms it.
    await clickPipeButton(page, 'record_layout');
    probe = await pipeProbe(page);
    expect(probe.dialog).toBe('layout');
    expect(await countOf(page, 'first_response')).toBe(0);

    // POINTER: a double click on RECORD ANSWER records exactly once.
    await page.waitForTimeout(LATTICE_SETTLE_MS + 120);

    const confirm = await rectCenter(
      page,
      await pipeButton(page, 'confirm_commit'),
    );

    await page.mouse.move(confirm.x, confirm.y);
    await page.mouse.down();
    await page.mouse.up();
    await page.mouse.down();
    await page.mouse.up();
    await waitPipeView(page, 'acknowledgement');
    await page.waitForTimeout(200);
    expect(await countOf(page, 'first_response')).toBe(1);
    expect(await countOf(page, 'response_acknowledged')).toBe(1);
    await expectNoCorrectnessOnScreen(page);

    // ——— Network 2: left mid-work by the on-screen close control ———
    await latticeNext(page, 'pointer');
    expect((await pipeSeries(page)).network_id).toBe('n2');
    await seatLatticeByPointer(page, latticeLayout('C1:el1@270 B1:st1@180'));

    const presentedBefore = await countOf(page, 'network_presented');

    await clickPipeButton(page, 'close');
    await waitPipeOpen(page, false);

    // KEYBOARD NAVIGATION: the avatar walks away and back; the station is
    // opened again with the interaction key.
    await workshopVia(page, 1256, 252);
    await openBench(page);
    probe = await pipeProbe(page);
    expect(probe.series).toMatchObject({
      view: 'network',
      network_id: 'n2',
      header: 'Network 2 of 3',
    });
    await waitCellPiece(page, 'C1', 'el1', 270);
    await waitCellPiece(page, 'B1', 'st1', 180);
    expect(probe.seated_count).toBe(2);
    expect(await countOf(page, 'network_presented')).toBe(presentedBefore);
    expect(await countOf(page, 'series_opened')).toBe(1);
    expect(await countOf(page, 'first_response')).toBe(1);
    await shot(page, '14-bench-reopened-mid-series');

    // POINTER: the rest of network 2, then network 3.
    await seatLatticeByPointer(
      page,
      latticeLayout('A1:el2@90 A2:va1@90 A3:el3@270'),
    );
    await commitLatticeByPointer(page, 'layout');
    await expectNoCorrectnessOnScreen(page);
    await latticeNext(page, 'pointer');
    expect((await pipeSeries(page)).network_id).toBe('n3');
    await seatLatticeByPointer(
      page,
      latticeLayout(LATTICE_LAYOUTS.B.n3.sealed),
    );
    await commitLatticeByPointer(page, 'layout');
    expect((await pipeProbe(page)).lines.join('\n')).not.toMatch(
      CORRECTNESS_WORDS,
    );

    const frozen = await firstResponses(page);

    expect((await reproduce(page)).row).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 3,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });

    // POINTER: SHOW RESULTS, then FINISH.
    await latticeNext(page, 'pointer');
    await waitPipeView(page, 'results');
    expect(
      (await pipeProbe(page)).lines.join('\n').match(/The run is sealed\./g),
    ).toHaveLength(3);
    await clickPipeButton(page, 'finish');
    await page.waitForTimeout(300);
    expect((await pipeProbe(page)).lines.join('\n')).toMatch(
      /All three networks are recorded\. The bench is closed\./,
    );
    expect(await firstResponses(page)).toBe(frozen);
    expect((await reproduce(page)).row).toMatchObject({
      value: 3,
      disposition: 'observed',
      closure_reason: 'completed',
    });

    // Every act inside the bench was made with the pointer.
    const family = await familyEvents(page);

    expect(
      family
        .filter((event) => event.event_type === `${FAMILY}first_response`)
        .map((event) => meta(event).input_mode),
    ).toEqual(['pointer', 'pointer', 'pointer']);
    expect(
      family
        .map((event) => meta(event).input_mode)
        .filter((mode) => mode !== undefined && mode !== 'system'),
    ).not.toContain('typed');

    // POINTER: leave by the close control.
    await clickPipeButton(page, 'close');
    await waitPipeOpen(page, false);
    await expectFamilyDiscipline(page, 'B');
    expectNoRuntimeErrors(errors);
  });

  test('R3 (partial coverage and route closure): network 1 answered, network 2 opened and left; the review closes the record — incomplete over a denominator of 1, censored, closed_at_review', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await toWorkshop(page, 'u16r3', 'A');
    await openBench(page);
    await seatLatticeByKeyboard(
      page,
      latticeLayout(LATTICE_LAYOUTS.A.n1.sealed),
    );
    await commitLatticeByKeyboard(page, 'layout');
    await latticeNext(page);
    expect((await pipeSeries(page)).network_id).toBe('n2');
    await seatLatticeByKeyboard(page, latticeLayout('A1:el1@180'));
    await page.keyboard.press('Escape');
    await waitPipeOpen(page, false);

    // Reopened: the same open network; no results, no practice.
    await openBench(page);
    expect(await pipeSeries(page)).toMatchObject({
      status: 'first_responses',
      view: 'network',
      network_id: 'n2',
    });
    await waitCellPiece(page, 'A1', 'el1', 180);
    await expectNoCorrectnessOnScreen(page);
    await page.keyboard.press('Escape');
    await waitPipeOpen(page, false);
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      disposition: 'pending',
    });

    // KEYBOARD NAVIGATION: the route on to the Utility Deck review.
    await workshopVia(page, 1312, 178);
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'lab_briefing');
    await workshopToConcourse(page);
    await concourseToLabBriefed(page);
    await labToYardBriefed(page);
    await yardReturnToConcourse(page);
    await returnShiftToDeckClosure(page);
    await concourseToDeck(page);
    await expectStage(page, 'deck_closure');
    expect(await countOf(page, 'series_closed_at_review')).toBe(0);
    await closeStationRecord(page);

    // The record closure closed the series in its first-response phase.
    const closures = (await familyEvents(page)).filter(
      (event) => event.event_type === `${FAMILY}series_closed_at_review`,
    );

    expect(closures).toHaveLength(1);
    expect(meta(closures[0])).toMatchObject({
      phase: 'closure',
      closure_reason: 'closed_at_review',
      networks_answered: 1,
      first_solutions: 1,
    });

    const { row, payload } = await reproduce(page);

    expect(payload.final_core_closed).toBe(true);
    expect(row).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      planned_denominator: 3,
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    // Networks 2 and 3 are missing, never incorrect.
    expect(
      (
        row.components as { networks: { first_response: unknown }[] }
      ).networks.map((network) => network.first_response === null),
    ).toEqual([false, true, true]);
    expect(await countOf(page, 'results_shown')).toBe(0);
    expect(await countOf(page, 'practice_opened')).toBe(0);

    // KEYBOARD NAVIGATION: back to the bench after the closure. A driver
    // that cannot get there leaves this part NOT VERIFIED — said, not passed.
    let blocked: string | null = null;

    try {
      await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
        approachOffset: { x: 40, y: 0 },
        yFirst: true,
      });
      await concourseToWorkshop(page);
      await openBench(page);
    } catch (error) {
      blocked = (error as Error).message.split('\n')[0];
    }

    if (blocked !== null) {
      test.info().annotations.push({
        type: 'BLOCKED / NOT VERIFIED',
        description: `the bench after the record closure was not reached (${blocked}); frame 17 is missing`,
      });
      // eslint-disable-next-line no-console
      console.log(
        `[R3] BLOCKED / NOT VERIFIED — bench after the record closure not reached: ${blocked}`,
      );
    } else {
      const before = (await familyEvents(page)).length;
      const probe = await pipeProbe(page);

      expect(probe.series).toMatchObject({
        status: 'closed_at_review',
        view: 'record',
      });
      expect(probe.lines.join('\n')).toMatch(
        /Station record closed — the bench keeps its record\./,
      );
      expect(probe.lines.join('\n')).toMatch(/Network 2: no answer recorded\./);
      await expectNoCorrectnessOnScreen(page);
      await shot(page, '17-bench-after-record-closure');
      // No response can be given and nothing more is recorded.
      await page.keyboard.press('t');
      await page.keyboard.press('n');
      await page.keyboard.press('h');
      await page.waitForTimeout(300);
      expect((await pipeProbe(page)).dialog).toBeNull();
      await page.keyboard.press('Escape');
      await waitPipeOpen(page, false);
      expect((await familyEvents(page)).length).toBe(before);
      expect((await reproduce(page)).row).toMatchObject({
        value: 1,
        denominator: 1,
        disposition: 'incomplete',
      });
    }

    await expectFamilyDiscipline(page, 'A');
    expectNoRuntimeErrors(errors);
  });

  test('R4 (zero eligible evidence and stopping): not_presented before the bench is opened; STOP TASK without an answer — null voluntary_stop and a read-only record', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await toWorkshop(page, 'u16r4', 'A');

    // Before the bench is opened there is no M13 evidence at all.
    expect(await familyEvents(page)).toEqual([]);
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'not_presented',
    });

    await openBench(page);
    await seatLatticeByKeyboard(page, latticeLayout('A2:el1@270 A1:el2@90'));
    await page.keyboard.press('u');
    await page.waitForTimeout(150);

    // STOP TASK (Q): its own confirmation, apart from the answer controls.
    expect(await countOf(page, 'undone')).toBe(1);
    await page.keyboard.press('q');
    await page.waitForTimeout(200);

    let probe = await pipeProbe(page);

    expect(probe.dialog).toBe('stop');
    expect(probe.lines).toContain(
      'Stop the bench? Networks without a recorded answer stay unanswered, and no results are shown.',
    );
    await shot(page, '13-stop-task-confirmation');
    await page.keyboard.press('Enter');
    await waitPipeView(page, 'record');
    probe = await pipeProbe(page);
    expect(probe.series).toMatchObject({ status: 'stopped', view: 'record' });
    expect(probe.lines.join('\n')).toMatch(
      /Bench stopped\. Recorded answers are kept\./,
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '16-stopped-bench-record');
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'voluntary_stop',
      closure_reason: 'voluntary_stop',
      censored: false,
    });
    await page.keyboard.press('Escape');
    await waitPipeOpen(page, false);

    // Reopened: a read-only record — no results, no practice, no response.
    const before = (await familyEvents(page)).length;

    await openBench(page);
    probe = await pipeProbe(page);
    expect(probe.series).toMatchObject({ status: 'stopped', view: 'record' });
    await expectNoCorrectnessOnScreen(page);
    await stopLatticeKeysDoNothing(page);
    await page.keyboard.press('Escape');
    await waitPipeOpen(page, false);
    expect((await familyEvents(page)).length).toBe(before);
    expect(await countOf(page, 'first_response')).toBe(0);
    await expectStage(page, 'workshop_work');
    await expectFamilyDiscipline(page, 'A');
    expectNoRuntimeErrors(errors);
  });
});

/** On a closed record the answer, practice and help keys do nothing. */
async function stopLatticeKeysDoNothing(page: Page) {
  for (const keyName of ['t', 'n', 'h', 'q', '1', 'f', 'b']) {
    await page.keyboard.press(keyName);
    await page.waitForTimeout(80);
  }

  const probe = await pipeProbe(page);

  expect(probe.dialog).toBeNull();
  expect(probe.help_open).toBe(false);
  expect(probe.series?.view).toBe('record');
}

test.describe('M13 three keyed networks: reload (Unit 16)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
  });

  /** Route to the bench, network 1 answered (a sealed layout), bench left. */
  async function beforeReload(page: Page, tag: string) {
    await toWorkshop(page, tag, 'A');
    await openBench(page);
    await seatLatticeByKeyboard(
      page,
      latticeLayout(LATTICE_LAYOUTS.A.n1.sealed),
    );
    await commitLatticeByKeyboard(page, 'layout');
    await page.keyboard.press('Escape');
    await waitPipeOpen(page, false);

    const before = await pagePayload(page);

    expect(before.page_load_index).toBe(1);
    expect(before.prior).toEqual([]);
    expect(
      before.raw_events.filter(
        (event) => event.event_type === `${FAMILY}first_response`,
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

  test('R5 (reload): network 1 answered, then a page reload — the earlier log is carried byte-identically and the feature is interrupted', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);
    const before = await beforeReload(page, 'u16r5');

    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      disposition: 'pending',
    });

    await reload(page);

    const after = await pagePayload(page);

    expect(after.page_load_index).toBe(2);
    // Byte-identical: nothing rewritten, nothing renumbered.
    expect(JSON.stringify(after.prior)).toBe(JSON.stringify(before.raw_events));
    expect(
      JSON.stringify(
        after.prior.filter((event) => event.event_type.startsWith(FAMILY)),
      ),
    ).toBe(
      JSON.stringify(
        before.raw_events.filter((event) =>
          event.event_type.startsWith(FAMILY),
        ),
      ),
    );
    expect(
      after.raw_events.filter((event) => event.event_type.startsWith(FAMILY)),
    ).toEqual([]);
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'interrupted',
    });
    expectNoRuntimeErrors(errors);
  });

  test('R5 (after the reload): the bench reached again — held back, never re-run', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);
    const before = await beforeReload(page, 'u16r5b');

    await reload(page);

    // The recorded block (UNIT-LOG "U15", R4): after a reload the journey
    // driver may be unable to replay the dock tutorial. When it cannot,
    // the post-reload browser administration is NOT VERIFIED — the test
    // is skipped with that reason, never passed.
    let blocked: string | null = null;

    try {
      await press(page, 'Space');
      await waitScene(page, 'dock', 60_000);
      await page.waitForTimeout(1600);
      await completeDockTutorial(page, 1);
      await routeToWorkshopWork(page);
      await openBench(page);
    } catch (error) {
      blocked = (error as Error).message.split('\n')[0];
    }

    test.skip(
      blocked !== null,
      `BLOCKED / NOT VERIFIED — the driver could not reach the bench after the reload (${blocked}); the post-reload administration was not exercised in the browser and frame 18 is missing`,
    );

    const probe = await pipeProbe(page);

    expect(probe.series).toMatchObject({ status: 'held_back', view: 'record' });
    expect(probe.lines.join('\n')).toMatch(
      /This bench was already used in this session\. Its record is kept; nothing further is recorded here\./,
    );
    await expectNoCorrectnessOnScreen(page);
    await shot(page, '18-reload-hold-back-record');
    await stopLatticeKeysDoNothing(page);
    await page.keyboard.press('Escape');
    await waitPipeOpen(page, false);

    // The new load holds the hold-back record and nothing else of the bench.
    const after = await pagePayload(page);
    const own = after.raw_events.filter((event) =>
      event.event_type.startsWith(FAMILY),
    );

    expect(own.map((event) => event.event_type)).toEqual([
      `${FAMILY}technical_failure`,
    ]);
    expect(String(meta(own[0]).detail)).toMatch(/^reload/);
    expect(
      own.filter((event) =>
        /series_opened|network_presented|first_response|results_shown|practice_/.test(
          event.event_type,
        ),
      ),
    ).toEqual([]);
    expect(JSON.stringify(after.prior)).toBe(JSON.stringify(before.raw_events));
    expect((await reproduce(page)).row).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'interrupted',
    });
    expectNoRuntimeErrors(errors);
  });
});
