/**
 * Station 080 M23 — browser drivers of the two-plot excavation protocol
 * (Unit 23, administration `m23-plots-v1`).
 *
 * Real keyboard and pointer input only, position-synced on the DEV
 * `__playerProbe`; read-only DEV probes (`__m23PlotsProbe`,
 * `__m23FieldProbe`, `__workSurfaceProbe`, `__cameraProbe`,
 * `__fieldActionsProbe`); never a teleport, never a state write through
 * the window. Every driver walks the participant path: E at the stake, the
 * panel's own controls, C / D / P in the world or the pad by the pointer.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { M23_HUD } from '../src/pilot/windows/m23PlotsContent';
import type { M23Assignment } from '../src/pilot/windows/m23PlotsModel';
import { YARD_SITES } from '../src/pilot/zoneSites';
import { exteriorProbe, faProbe, waitNoWorldAction } from './exteriorHelpers';
import { getEvents, hold, press } from './helpers';
import { completeDockTutorial } from './journey';
import {
  interactAt,
  pilotProbe,
  registryApproach,
  routeToYardWork,
  waitScene,
  yardApproach,
  yardVia,
} from './pilotHelpers';
import { clickElement, surface, waitSurface } from './returnHelpers';

export { enterYard, finishOutside } from './exteriorHelpers';

export const M23 = {
  family: 'proto_m23_plots_',
  opportunity: 'proto_m23_excavation_series',
  window: 'm23_plots_w1',
  version: 'm23-plots-v1',
  surface: 'm23_excavation_field',
  settleMs: 400,
  /** The stake and its registry approach (A-adjusted, contract §13 R1). */
  stake: { x: 1072, y: 488 },
  approach: { x: 1116, y: 488 },
  /** Nominal body-valid entry stances south of each plot (UP probe inside). */
  entry: {
    plot_a: { x: 1072, y: 464 },
    plot_b: { x: 1104, y: 464 },
  },
  /** Interior stances near the plot centres (column 30 / 37, row 11). */
  interior: {
    plot_a: { x: 976, y: 364 },
    plot_b: { x: 1200, y: 364 },
  },
  /** The literal keys (hand-written from the contract; research-only). */
  keys: {
    a1: { col: 29, row: 9 },
    a2: { col: 31, row: 12 },
    b1: { col: 38, row: 9 },
    b2: { col: 36, row: 12 },
  },
  /** Hand-specified empty cells for the first failure (fixture notation F). */
  empty: {
    plot_a: { col: 28, row: 9 },
    plot_b: { col: 35, row: 9 },
  },
  /** The fixed camera scrolls (contract §12). */
  scroll: {
    plot_a: { x: 656, y: 172 },
    plot_b: { x: 880, y: 172 },
  },
  bounds: {
    plot_a: { minCol: 27, maxCol: 33, minRow: 8, maxRow: 13 },
    plot_b: { minCol: 34, maxCol: 40, minRow: 8, maxRow: 13 },
  },
} as const;

export type M23PlotKey = 'plot_a' | 'plot_b';

export interface M23PlotProbe {
  status: string;
  selector_status: string;
  form: string;
  opened: boolean;
  realised_position: number | null;
  resume_count: number;
  approaches: number;
  region_entries: number;
  stance: string | null;
  attempts: number;
  scans: number;
  digs: number;
  cancelled: number;
  refusals: number;
  pauses: number;
  first_failure: {
    action_id: string;
    cell: { col: number; row: number };
    at_ms: number;
  } | null;
  presentation: { id: string; count: number; unpresented: boolean } | null;
  response: string | null;
  response_source: string | null;
  credit: string | null;
  system_cancelled_after_continue: string[];
  stop_request: string | null;
  closure: string | null;
  observed_continuation: boolean | null;
  last_scan: { strength: number; band: string; trend: string } | null;
  last_dig: { cell: { col: number; row: number }; outcome: string } | null;
  tray: boolean;
}

export interface M23Probe {
  status: string;
  view: string;
  surface_open: boolean;
  help_replay: boolean;
  selected: M23PlotKey | null;
  opened: boolean;
  guidance_addressed: boolean;
  presented: boolean;
  window: string;
  exit: string | null;
  assignment: {
    plot_a_form: 'a1' | 'a2';
    plot_b_form: 'b1' | 'b2';
    plot_order: 'AB' | 'BA';
    failure_option_order: 'continue_left' | 'stop_left';
  };
  action: {
    id: string;
    kind: string;
    plot_id: string;
    started_at_ms: number;
  } | null;
  now_ms: number;
  closure: { trigger: string; reason: string } | null;
  fault_detail: string | null;
  focus_epoch: string;
  tray: string[];
  example_views: { page_1: number; page_2: number };
  closure_explanations: number;
  plots: Record<M23PlotKey, M23PlotProbe>;
}

export interface M23FieldProbe {
  visible: boolean;
  buttons: { id: string; x: number; y: number; w: number; h: number }[];
  scanner: string[];
  dig: string[];
  tray: string[];
  scanner_bounds: { x: number; y: number; w: number; h: number };
  dig_bounds: { x: number; y: number; w: number; h: number };
  tray_bounds: { x: number; y: number; w: number; h: number };
  feedback: string | null;
  feedback_bounds: { x: number; y: number; w: number; h: number } | null;
  held: string | null;
}

export interface CameraProbeLike {
  scrollX: number;
  scrollY: number;
  zoom: number;
  viewWidth: number;
  viewHeight: number;
  settled: boolean;
}

export async function m23Probe(page: Page): Promise<M23Probe> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __m23PlotsProbe?: M23Probe | null })
        .__m23PlotsProbe ?? null,
  );

  if (probe === null) {
    throw new Error('M23 probe unavailable');
  }

  return probe;
}

export async function m23Field(page: Page): Promise<M23FieldProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __m23FieldProbe?: M23FieldProbe | null })
        .__m23FieldProbe ?? null,
  );
}

export async function cameraProbe(page: Page): Promise<CameraProbeLike> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __cameraProbe?: CameraProbeLike | null })
        .__cameraProbe ?? null,
  );

  if (probe === null) {
    throw new Error('camera probe unavailable');
  }

  return probe;
}

export async function playerAt(page: Page): Promise<{ x: number; y: number }> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );

  if (probe === null) {
    throw new Error('player probe unavailable');
  }

  return probe;
}

export async function m23Events(page: Page) {
  return (await getEvents(page)).filter((event) =>
    event.event_type.startsWith(M23.family),
  );
}

export async function m23EventTypes(page: Page): Promise<string[]> {
  return (await m23Events(page)).map((event) =>
    event.event_type.slice(M23.family.length),
  );
}

/** Waits until the series probe satisfies the predicate (serialised for the page). */
export async function waitM23(
  page: Page,
  predicate: (probe: M23Probe, arg: unknown) => boolean,
  timeout = 8000,
  arg: unknown = null,
) {
  // The predicate is serialised: it must close over nothing (any outer
  // value travels through `arg`).
  await page.waitForFunction(
    ([source, value]) => {
      const probe = (window as unknown as { __m23PlotsProbe?: M23Probe | null })
        .__m23PlotsProbe;

      if (probe === null || probe === undefined) {
        return false;
      }

      return (
        new Function('probe', 'arg', `return (${source})(probe, arg);`) as (
          probe: M23Probe,
          arg: unknown,
        ) => boolean
      )(probe, value);
    },
    [predicate.toString(), arg] as const,
    { timeout },
  );
}

export async function waitView(page: Page, view: string, timeout = 8000) {
  try {
    await page.waitForFunction(
      (wanted) => {
        const probe = (
          window as unknown as { __m23PlotsProbe?: M23Probe | null }
        ).__m23PlotsProbe;
        const open = (
          window as unknown as {
            __workSurfaceProbe?: { open: boolean } | null;
          }
        ).__workSurfaceProbe?.open;

        return probe?.view === wanted && open === true;
      },
      view,
      { timeout },
    );
  } catch (error) {
    // The diagnosis travels with the failure: the series' own state.
    const probe = await page.evaluate(() => {
      const w = window as unknown as {
        __m23PlotsProbe?: (M23Probe & { fault_detail?: unknown }) | null;
        __workSurfaceProbe?: {
          open: boolean;
          surface_id: string | null;
        } | null;
      };
      const series = { ...(w.__m23PlotsProbe ?? {}) } as Record<
        string,
        unknown
      >;

      delete series.plots;

      return JSON.stringify({ series, surface: w.__workSurfaceProbe });
    });

    throw new Error(`waitView(${view}) timed out; ${probe}`, { cause: error });
  }
  // The surface settles 400 ms after a view appears; a press inside it
  // commits nothing (contract engineering invariant).
  await page.waitForTimeout(M23.settleMs + 150);
}

/** The element id of the open surface starting with the prefix (view-scoped ids). */
export async function elementId(page: Page, prefix: string): Promise<string> {
  const probe = await surface(page);
  const element = probe?.elements.find((candidate) =>
    candidate.id.startsWith(prefix),
  );

  if (element === undefined) {
    throw new Error(
      `no surface element with prefix ${prefix} (elements: ${probe?.elements.map((e) => e.id).join(',')})`,
    );
  }

  return element.id;
}

/**
 * Keyboard activation with the renderer's own navigation: Right/Left
 * arrows to the element, then ONE fresh Enter (never a hotkey).
 */
export async function keyActivatePrefix(page: Page, prefix: string) {
  const probe = await surface(page);

  if (probe === null) {
    throw new Error('no surface open');
  }

  const id = await elementId(page, prefix);
  const focusables = probe.elements.filter((e) => e.focusable).map((e) => e.id);
  const target = focusables.indexOf(id);
  const current = probe.focus === null ? 0 : focusables.indexOf(probe.focus);

  if (target === -1) {
    throw new Error(`element ${id} is not focusable`);
  }

  let delta = target - Math.max(0, current);

  while (delta > 0) {
    await press(page, 'ArrowRight');
    delta -= 1;
  }

  while (delta < 0) {
    await press(page, 'ArrowLeft');
    delta += 1;
  }

  await press(page, 'Enter');
  await page.waitForTimeout(220);
}

export async function activate(
  page: Page,
  prefix: string,
  mode: 'keyboard' | 'pointer',
) {
  if (mode === 'pointer') {
    await clickElement(page, await elementId(page, prefix));
    await page.waitForTimeout(220);

    return;
  }

  await keyActivatePrefix(page, prefix);
}

/* ------------------------------------------------------------------ *
 * The stake, the brief, the examples, the selector
 * ------------------------------------------------------------------ */

/** Walks to the stake's registry approach and opens its panel (E). */
export async function openStakeSurface(page: Page) {
  const approach = registryApproach('yard.plot_stake');

  expect(approach).toEqual(M23.approach);
  await yardVia(page, approach.x, approach.y);
  await interactAt(page, YARD_SITES.plotStake, {
    approachOffset: await yardApproach(page, YARD_SITES.plotStake),
  });
  await waitSurface(page, true, M23.surface);
}

/** P / PANEL in the field (keyboard P, or the pad's PANEL by the pointer). */
export async function openPanel(page: Page, mode: 'keyboard' | 'pointer') {
  if (mode === 'pointer') {
    await clickPad(page, 'panel');
  } else {
    await press(page, 'p');
  }

  await waitSurface(page, true, M23.surface);
}

/** The brief → CONTROL EXAMPLE → NEXT → OPEN PLOT PANEL: the selector. */
export async function briefToSelector(
  page: Page,
  mode: 'keyboard' | 'pointer',
) {
  await waitView(page, 'brief');
  await activate(page, 'control_example_', mode);
  await waitView(page, 'example_1');
  await activate(page, 'next_', mode);
  await waitView(page, 'example_2');
  await activate(page, 'open_plot_panel_', mode);
  await waitView(page, 'selector');

  // Round 4: every browser opening compares the RECORDED assignment (the
  // entry snapshot of `opportunity_opened`) with the independent oracle.
  if ((await m23Probe(page)).opened) {
    await expectRecordedAssignmentMatchesOracle(page);
  }
}

/**
 * The recorded assignment of this session — the `opportunity_opened` entry
 * snapshot's forms, row order, option order and scheme — equals the
 * independent oracle of the session id the page was launched with (the URL's
 * `game_session_id`); the live probe agrees.
 */
export async function expectRecordedAssignmentMatchesOracle(page: Page) {
  const sessionId = await page.evaluate(() =>
    new URLSearchParams(window.location.search).get('game_session_id'),
  );

  expect(sessionId, 'the launch session id').not.toBeNull();

  const oracle = jointAssignmentOracle(sessionId!);
  const opened = (await m23Events(page)).find((event) =>
    event.event_type.endsWith('opportunity_opened'),
  );

  expect(opened, 'the measured opening').toBeDefined();

  const snapshot = (
    opened!.metadata as {
      entry_state_snapshot?: {
        assignment_scheme?: string;
        assigned_plot_order?: string;
        failure_option_order?: string;
        forms?: { plot_a?: string; plot_b?: string };
      };
    }
  ).entry_state_snapshot;

  expect(snapshot?.assignment_scheme).toBe('m23_joint16_fnv1a_fmix32_v1');
  expect(snapshot?.assigned_plot_order).toBe(oracle.plot_order);
  expect(snapshot?.failure_option_order).toBe(oracle.failure_option_order);
  expect(snapshot?.forms).toEqual({
    plot_a: oracle.plot_a_form,
    plot_b: oracle.plot_b_form,
  });
  expect((await m23Probe(page)).assignment).toEqual(oracle);
}

/** E at the stake and through the brief and both pages to the first usable selector. */
export async function openSeries(page: Page, mode: 'keyboard' | 'pointer') {
  await openStakeSurface(page);
  await briefToSelector(page, mode);
  expect((await m23Probe(page)).opened).toBe(true);
}

/** OPEN / RESUME a plot from the selector; the surface closes (approaching or searching). */
export async function openPlot(
  page: Page,
  plot: M23PlotKey,
  mode: 'keyboard' | 'pointer',
) {
  await waitView(page, 'selector');
  await activate(page, `open_${plot}_`, mode);
  await page.waitForFunction(
    (wanted) => {
      const probe = (window as unknown as { __m23PlotsProbe?: M23Probe | null })
        .__m23PlotsProbe;

      return (
        probe?.selected === wanted &&
        (probe.view === 'first_failure' ||
          ['approaching', 'searching', 'choice_pending'].includes(
            probe.plots[wanted as M23PlotKey].status,
          ))
      );
    },
    plot,
    { timeout: 8000 },
  );
  await page.waitForTimeout(300);
}

/** Walks (real held keys) to a plot's nominal entry stance; the plot becomes searching. */
export async function walkIntoPlot(page: Page, plot: M23PlotKey) {
  const at = M23.entry[plot];

  await yardVia(page, at.x, at.y);
  await waitM23(
    page,
    (probe) => probe.plots[probe.selected!].status === 'searching',
  );
  await page.waitForTimeout(250);
}

/** Walks to an interior stance of the plot (inside its rectangle). */
export async function walkInsidePlot(page: Page, plot: M23PlotKey) {
  const at = M23.interior[plot];

  await yardVia(page, at.x, at.y);
  await page.waitForTimeout(250);
}

/* ------------------------------------------------------------------ *
 * Scanning, digging, the pad
 * ------------------------------------------------------------------ */

export async function clickPad(page: Page, id: string) {
  const field = await m23Field(page);
  const button = field?.buttons.find((candidate) => candidate.id === id);

  if (field === null || field === undefined || !field.visible || !button) {
    throw new Error(`pad button ${id} unavailable`);
  }

  const point = await designToPagePoint(
    page,
    button.x + button.w / 2,
    button.y + button.h / 2,
  );

  await page.mouse.click(point.x, point.y);
}

/** Holds a pad direction by the pointer for `ms` (real pointer down / up). */
export async function holdPad(page: Page, id: string, ms: number) {
  const field = await m23Field(page);
  const button = field?.buttons.find((candidate) => candidate.id === id);

  if (field === null || field === undefined || !field.visible || !button) {
    throw new Error(`pad button ${id} unavailable`);
  }

  const point = await designToPagePoint(
    page,
    button.x + button.w / 2,
    button.y + button.h / 2,
  );

  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(250);
}

async function designToPagePoint(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();
  const space = await page.evaluate(
    () =>
      (
        window as unknown as {
          __designSpace?: {
            offsetX: number;
            offsetY: number;
            scale: number;
            canvasWidth: number;
            canvasHeight: number;
          } | null;
        }
      ).__designSpace ?? null,
  );

  if (box === null || space === null) {
    throw new Error('canvas or design space unavailable');
  }

  return {
    x:
      box.x +
      ((space.offsetX + x * space.scale) * box.width) / space.canvasWidth,
    y:
      box.y +
      ((space.offsetY + y * space.scale) * box.height) / space.canvasHeight,
  };
}

/** One scan from the current position (C, or the pad's SCAN); resolves on the plot's count. */
export async function scanHere(page: Page, mode: 'keyboard' | 'pointer') {
  const before = await m23Probe(page);
  const plot = before.selected!;
  const scans = before.plots[plot].scans;

  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __fieldActionsProbe?: { scan: { cooling: boolean } } | null;
        }
      ).__fieldActionsProbe?.scan.cooling === false,
    undefined,
    { timeout: 8000 },
  );

  if (mode === 'pointer') {
    await clickPad(page, 'scan');
  } else {
    await press(page, 'c');
  }

  await waitM23(page, (probe) => probe.action !== null, 4000).catch(
    () => undefined,
  );
  await page.waitForFunction(
    ([wanted, count]) => {
      const probe = (window as unknown as { __m23PlotsProbe?: M23Probe | null })
        .__m23PlotsProbe;

      return (
        probe !== null &&
        probe !== undefined &&
        probe.action === null &&
        probe.plots[wanted as M23PlotKey].scans > (count as number)
      );
    },
    [plot, scans] as const,
    { timeout: 10_000 },
  );
  await waitNoWorldAction(page);

  return (await m23Probe(page)).plots[plot].last_scan!;
}

/**
 * Faces a plot cell so the spade probe lands inside it, VERIFIED on the DEV
 * probe after every short tap (the exterior helper's four-side approach).
 */
export async function faceCell(page: Page, cell: { col: number; row: number }) {
  const cx = cell.col * 32 + 16;
  const cy = cell.row * 32 + 16;
  const approaches: { stand: { x: number; y: number }; key: string }[] = [
    { stand: { x: cx, y: cy + 60 }, key: 'ArrowUp' },
    { stand: { x: cx, y: cy - 60 }, key: 'ArrowDown' },
    { stand: { x: cx - 60, y: cy }, key: 'ArrowRight' },
    { stand: { x: cx + 60, y: cy }, key: 'ArrowLeft' },
  ];
  const facing = async () => {
    const target = (await faProbe(page)).dig.target;

    return (
      target !== null && target.col === cell.col && target.row === cell.row
    );
  };

  for (const approach of approaches) {
    await yardVia(page, approach.stand.x, approach.stand.y);

    for (let tap = 0; tap < 8; tap++) {
      await hold(page, approach.key, 45);
      await page.waitForTimeout(90);

      if (await facing()) {
        return;
      }
    }
  }

  throw new Error(`could not face cell ${cell.col}:${cell.row}`);
}

/** D (or the pad's DIG) on the faced cell; resolves on the plot's dig count. */
export async function digFacing(
  page: Page,
  mode: 'keyboard' | 'pointer',
  expected: 'empty' | 'recovered',
) {
  const before = await m23Probe(page);
  const plot = before.selected!;
  const digs = before.plots[plot].digs;

  if (mode === 'pointer') {
    await clickPad(page, 'dig');
  } else {
    await press(page, 'd');
  }

  await page.waitForFunction(
    ([wanted, count, outcome]) => {
      const probe = (window as unknown as { __m23PlotsProbe?: M23Probe | null })
        .__m23PlotsProbe;
      const record = probe?.plots[wanted as M23PlotKey];

      return (
        record !== undefined &&
        probe?.action === null &&
        record.digs > (count as number) &&
        record.last_dig?.outcome === outcome
      );
    },
    [plot, digs, expected] as const,
    { timeout: 10_000 },
  );
  await waitNoWorldAction(page);
}

/** The first genuine failure of the selected plot: a dig of its hand-specified empty cell. */
export async function failFirst(page: Page, mode: 'keyboard' | 'pointer') {
  const plot = (await m23Probe(page)).selected!;

  await faceCell(page, M23.empty[plot]);
  await digFacing(page, mode, 'empty');
  await waitView(page, 'first_failure');
  await waitM23(
    page,
    (probe) =>
      probe.plots[probe.selected!].presentation !== null &&
      probe.plots[probe.selected!].presentation!.unpresented === false,
  );
}

/** The keyed cell of the selected plot under its assigned form. */
export async function keyCellOf(page: Page, plot: M23PlotKey) {
  const probe = await m23Probe(page);
  const form = probe.plots[plot].form as keyof typeof M23.keys;

  return M23.keys[form];
}

/* ------------------------------------------------------------------ *
 * The first-failure choice and the selector STOP
 * ------------------------------------------------------------------ */

/** The physical side of a response under the session's assigned option order. */
export async function sideOf(
  page: Page,
  response: 'continue' | 'stop',
): Promise<'left' | 'right'> {
  const order = (await m23Probe(page)).assignment.failure_option_order;

  return order === 'continue_left'
    ? response === 'continue'
      ? 'left'
      : 'right'
    : response === 'stop'
      ? 'left'
      : 'right';
}

/**
 * CONTINUE SEARCH / STOP THIS PLOT with ONE fresh activation after a single
 * navigation step (keyboard: the one-arrow side shortcut, then Enter or
 * Space; pointer: one click on the option).
 */
export async function chooseFailure(
  page: Page,
  response: 'continue' | 'stop',
  mode: 'keyboard' | 'pointer',
  commitKey: 'Enter' | 'Space' = 'Enter',
) {
  await waitView(page, 'first_failure');

  const side = await sideOf(page, response);

  if (mode === 'pointer') {
    await clickElement(page, await elementId(page, `ff_${side}_`));
  } else {
    await press(page, side === 'left' ? 'ArrowLeft' : 'ArrowRight');
    expect((await surface(page))?.focus).toMatch(new RegExp(`^ff_${side}_`));
    await press(page, commitKey === 'Space' ? ' ' : 'Enter');
  }

  await waitM23(
    page,
    (probe) =>
      probe.plots[probe.selected ?? 'plot_a'].response !== null ||
      probe.selected === null,
    8000,
  );
  await page.waitForTimeout(300);
}

/** Selector STOP → the confirmation (the request is recorded). */
export async function requestStop(
  page: Page,
  plot: M23PlotKey,
  mode: 'keyboard' | 'pointer',
) {
  await waitView(page, 'selector');
  await activate(page, `stop_${plot}_`, mode);
  await waitView(page, 'stop_confirm');
}

export async function confirmStop(
  page: Page,
  plot: M23PlotKey,
  mode: 'keyboard' | 'pointer',
) {
  await waitView(page, 'stop_confirm');
  await activate(page, `confirm_stop_${plot}_`, mode);
  await waitM23(
    page,
    (probe, wanted) =>
      probe.plots[wanted as 'plot_a' | 'plot_b'].status === 'stopped',
    8000,
    plot,
  );
}

export async function backFromStop(
  page: Page,
  plot: M23PlotKey,
  mode: 'keyboard' | 'pointer',
) {
  await waitView(page, 'stop_confirm');
  await activate(page, `confirm_back_${plot}_`, mode);
  await waitView(page, 'selector');
}

/** STEP AWAY on the open view (the surface closes; work pauses). */
export async function stepAway(page: Page, mode: 'keyboard' | 'pointer') {
  await activate(page, 'step_away_', mode);
  await waitSurface(page, false);
}

/** The whole opened route: stake, brief, examples, selector, OPEN PLOT, the walk in. */
export async function startPlot(
  page: Page,
  plot: M23PlotKey,
  mode: 'keyboard' | 'pointer',
) {
  await openSeries(page, mode);
  await openPlot(page, plot, mode);
  await walkIntoPlot(page, plot);
}

/** Convenience re-exports for the spec. */
export { exteriorProbe, faProbe, surface, waitSurface };

/* ------------------------------------------------------------------ *
 * Technical fixtures: an assigned counterbalance, the reload, the
 * environment events, the layout geometry
 * ------------------------------------------------------------------ */

/**
 * The INDEPENDENT oracle of the M23 joint assignment (round 3, amendment
 * OD-6; scheme `m23_joint16_fnv1a_fmix32_v1`), written from the
 * amendment's definition rather than imported from the production module:
 * FNV-1a 32 over `<session id>:m23_plots_assignment`, murmur3's fmix32
 * finaliser, cell = hash mod 16 with bits 8 / 4 / 2 / 1 = plot A form a2,
 * plot B form b2, row order BA, option order stop_left.
 */
export function jointAssignmentOracle(sessionId: string): M23Assignment {
  const input = `${sessionId}:m23_plots_assignment`;
  let h = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }

  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  h >>>= 0;

  const cell = h % 16;

  return {
    plot_a_form: cell >= 8 ? 'a2' : 'a1',
    plot_b_form: cell % 8 >= 4 ? 'b2' : 'b1',
    plot_order: cell % 4 >= 2 ? 'BA' : 'AB',
    failure_option_order: cell % 2 === 1 ? 'stop_left' : 'continue_left',
  };
}

/** The sixteen joint cells as `a|b|order|option` keys. */
export function jointCellKey(assignment: M23Assignment): string {
  return [
    assignment.plot_a_form,
    assignment.plot_b_form,
    assignment.plot_order,
    assignment.failure_option_order,
  ].join('|');
}

/**
 * A session id whose joint assignment realises the wanted cell (the oracle
 * above; the participant route is unchanged).
 */
export function sessionIdFor(
  tag: string,
  wanted: Partial<M23Assignment>,
): string {
  for (let n = 1; n < 100_000; n += 1) {
    const id = `GS_PILOT_${tag}_${n}`;
    const realised = jointAssignmentOracle(id);

    if (
      (Object.keys(wanted) as (keyof M23Assignment)[]).every(
        (slot) => wanted[slot] === undefined || realised[slot] === wanted[slot],
      )
    ) {
      return id;
    }
  }

  throw new Error('no session id realises the wanted assignment');
}

/** Boots the participant route on a session whose assignment is the wanted one; Dock → … → Yard. */
export async function enterYardAssigned(
  page: Page,
  tag: string,
  wanted: Partial<M23Assignment>,
) {
  const sessionId = sessionIdFor(tag, wanted);

  await page.goto(
    `/?participant_id=PT_PILOT_${tag}&game_session_id=${sessionId}`,
  );
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotOpeningProbe?: { open: boolean } | null })
        .__pilotOpeningProbe?.open === true,
    undefined,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(400);
  await press(page, 'Space');
  await waitScene(page, 'dock', 60_000);
  await page.waitForTimeout(1600);
  await completeDockTutorial(page, 1);
  await routeToYardWork(page);

  const probe = await pilotProbe(page);

  expect(probe?.stage).toBe('exterior_work');
  expect(probe?.zone).toBe('exterior_recovery_yard');

  return sessionId;
}

/** A page reload on the same session, then the opening, the Dock tutorial and the spine back to the yard. */
export async function reloadToYard(page: Page) {
  await page.reload();
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotOpeningProbe?: { open: boolean } | null })
        .__pilotOpeningProbe?.open === true,
    undefined,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(600);
  await press(page, 'Space');
  await waitScene(page, 'dock', 60_000);
  await page.waitForTimeout(1600);
  await completeDockTutorial(page, 1);
  await routeToYardWork(page);
}

/** The window loses focus (the scene's own `blur` listener). */
export async function blurPage(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
}

/** The window regains focus. */
export async function focusPage(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

/** The document is hidden (the scene's own `visibilitychange` listener). */
export async function hidePage(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/** The document is visible again. */
export async function showPage(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
}

/** The plot rectangle in the 800 × 600 design space under the current camera. */
export async function plotDesignRect(page: Page, plot: M23PlotKey) {
  const camera = await cameraProbe(page);
  const space = await page.evaluate(
    () =>
      (
        window as unknown as {
          __designSpace?: { offsetX: number; offsetY: number; scale: number };
        }
      ).__designSpace ?? null,
  );

  if (space === null) {
    throw new Error('design space unavailable');
  }

  const bounds = M23.bounds[plot];
  const toDesign = (wx: number, wy: number) => ({
    x: ((wx - camera.scrollX) * camera.zoom - space.offsetX) / space.scale,
    y: ((wy - camera.scrollY) * camera.zoom - space.offsetY) / space.scale,
  });
  const topLeft = toDesign(bounds.minCol * 32, bounds.minRow * 32);
  const bottomRight = toDesign(
    (bounds.maxCol + 1) * 32,
    (bounds.maxRow + 1) * 32,
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    w: bottomRight.x - topLeft.x,
    h: bottomRight.y - topLeft.y,
  };
}

const overlaps = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The HUD boxes (pad, scanner, dig) and the feedback line stay clear of the whole plot rectangle. */
export async function expectHudClearOfPlot(page: Page, plot: M23PlotKey) {
  const rect = await plotDesignRect(page, plot);
  const field = await m23Field(page);

  expect(field?.visible).toBe(true);
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.w).toBeLessThanOrEqual(800);
  expect(rect.y + rect.h).toBeLessThanOrEqual(600);

  for (const box of [M23_HUD.scanner, M23_HUD.dig, M23_HUD.tray, M23_HUD.pad]) {
    expect(overlaps(box, rect), `HUD box at ${box.x},${box.y}`).toBe(false);
  }

  for (const button of field!.buttons) {
    expect(overlaps(button, rect), `pad ${button.id}`).toBe(false);
  }

  // The local feedback line sits above the plot's top edge: the pinned y 92
  // statically, and its ACTUAL bounds whenever a message is showing.
  expect(M23_HUD.feedback_y + 40).toBeLessThanOrEqual(rect.y);

  const feedback = field!.feedback_bounds;

  if (feedback !== null) {
    expect(overlaps(feedback, rect), 'the feedback line over the plot').toBe(
      false,
    );
  }

  // Round 3 (OD-8b): the dig and tray texts' ACTUAL rendered bounds stay
  // inside their plates (bottom ≤ plate bottom − 4 design px): at most four
  // rendered rows on the dig plate and three on the tray plate (24 px
  // pitch at 22 px with 2 px spacing).
  expectPlateBounds(field!);

  return rect;
}

/** The dig / tray plates' rendered-bounds rule (OD-8b), from the live text objects. */
export function expectPlateBounds(field: M23FieldProbe) {
  const inside = (
    text: { x: number; y: number; w: number; h: number },
    plate: { x: number; y: number; w: number; h: number },
    rows: number,
    what: string,
  ) => {
    expect(text.y, `${what} top`).toBeGreaterThanOrEqual(plate.y);
    expect(text.y + text.h, `${what} bottom`).toBeLessThanOrEqual(
      plate.y + plate.h - 4,
    );
    expect(text.x + text.w, `${what} right`).toBeLessThanOrEqual(
      plate.x + plate.w,
    );
    expect(text.h, `${what} rows`).toBeLessThanOrEqual(rows * 24 + 2);
  };

  inside(field.dig_bounds, M23_HUD.dig, 4, 'dig readout');
  inside(field.tray_bounds, M23_HUD.tray, 3, 'field tray');
}

/**
 * The floating prompt's actual design-space bounds (the yard's DEV
 * `__yardPromptProbe`; round 4). U24 B-12: refused (null) unless the yard
 * itself is live — the player is in the yard and no work surface or
 * inventory overlay pauses it — so stale bounds never stand for current
 * prompt geometry (U23 acceptance 4b).
 */
export async function yardPromptBounds(page: Page): Promise<{
  text: string | null;
  bounds: { x: number; y: number; w: number; h: number };
} | null> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __yardPromptProbe?: {
        text: string | null;
        bounds: { x: number; y: number; w: number; h: number };
      } | null;
      __playerProbe?: { scene: string } | null;
      __workSurfaceProbe?: { open: boolean } | null;
      __inventoryUiProbe?: { open: boolean } | null;
    };
    const live =
      w.__playerProbe?.scene === 'exterior_recovery_yard' &&
      w.__workSurfaceProbe?.open !== true &&
      w.__inventoryUiProbe?.open !== true;

    return live ? (w.__yardPromptProbe ?? null) : null;
  });
}

/** The room's floating prompt (RoomScene's DEV `__worldPromptProbe`). */
export async function worldPrompt(
  page: Page,
): Promise<{ prompt: boolean; text: string | null }> {
  const probe = await page.evaluate(
    () =>
      (
        window as unknown as {
          __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
        }
      ).__worldPromptProbe ?? null,
  );

  expect(probe, 'world prompt probe').not.toBeNull();

  return { prompt: probe!.prompt, text: probe!.text ?? null };
}

/** Waits until the field HUD's own feedback line shows exactly `text`; returns the probe then. */
export async function waitFieldFeedback(
  page: Page,
  text: string,
  timeout = 7000,
): Promise<M23FieldProbe> {
  await page.waitForFunction(
    (wanted) =>
      (window as unknown as { __m23FieldProbe?: { feedback: string | null } })
        .__m23FieldProbe?.feedback === wanted,
    text,
    { timeout },
  );

  const field = await m23Field(page);

  expect(field).not.toBeNull();

  return field!;
}

/**
 * The two verbatim parts of the pinned field-controls line (round 3,
 * OD-8a): the split at the sentence boundary before "P / PANEL", written
 * from the amendment rather than imported from the scene.
 */
export function controlsParts(full: string): [string, string] {
  const at = full.indexOf(' P / PANEL');

  expect(at).toBeGreaterThan(0);

  return [full.slice(0, at), full.slice(at + 1)];
}

interface SurfaceElementLike {
  id: string;
  kind: string;
  label: string;
  state: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text_px?: number;
  text_h?: number;
}

/**
 * The static example pages' geometry (round 3, OD-2 / OD-3 / 8c) from the
 * work-surface probe: the heading box {24, 48, 672, 40} below the title bar
 * (its focus ring clear of the divider at panel y + 40), one line; page 2
 * the SAME figure glyph (40 px) facing a highlighted (`flag`) cell with only
 * the pinned label (20 px) in BOTH illustrations, each figure 12 px left of
 * its cell; page 1 the figure and the beacon 133.33 design px apart (80
 * world px at the field's scale) and the pinned reading at 20 px.
 */
export async function expectExampleGeometry(
  page: Page,
  pageNo: 1 | 2,
  glyphs: { figure: string; beacon: string },
) {
  const PANEL_Y = 42;
  const DIVIDER_Y = PANEL_Y + 40;
  const probe = await surface(page);

  expect(probe, 'surface probe').not.toBeNull();

  const elements = probe!.elements as unknown as SurfaceElementLike[];
  const find = (prefix: string) => {
    const element = elements.find((candidate) =>
      candidate.id.startsWith(prefix),
    );

    expect(element, prefix).toBeDefined();

    return element!;
  };
  const heading = find(`example_heading_${pageNo}_`);
  const headingTop = heading.y - heading.h / 2;

  expect(headingTop).toBeCloseTo(PANEL_Y + 48, 3);
  expect(heading.h).toBe(40);
  expect(heading.w).toBe(672);
  expect(headingTop - 3, 'focus ring top below the divider').toBeGreaterThan(
    DIVIDER_Y,
  );
  expect(heading.text_h ?? 0, 'one heading line').toBeLessThan(32);

  const figure = (prefix: string) => {
    const element = find(prefix);

    expect(element.label).toBe(glyphs.figure);
    expect(element.kind).toBe('readout');
    expect(element.text_px).toBe(40);
    expect(element.w).toBe(72);

    return element;
  };

  if (pageNo === 1) {
    const figureElement = figure('example_figure_beacon_');
    const beacon = find('example_beacon_');
    const reading = find('example_reading_');

    expect(beacon.label).toBe(glyphs.beacon);
    expect(beacon.text_px).toBe(40);
    expect(beacon.x - figureElement.x).toBeCloseTo((80 * 2) / 1.2, 1);
    expect(reading.text_px).toBe(20);
    expect(reading.label).toBe('50 / 100 — MODERATE');

    return;
  }

  for (const [figurePrefix, cellPrefix, label] of [
    ['example_figure_component_', 'example_component_cell_', 'COMPONENT CELL'],
    ['example_figure_empty_', 'example_empty_cell_', 'EMPTY CELL'],
  ] as const) {
    const figureElement = figure(figurePrefix);
    const cell = find(cellPrefix);

    expect(cell.kind).toBe('tile');
    expect(cell.state).toBe('flag');
    expect(cell.label).toBe(label);
    expect(cell.text_px).toBe(20);
    expect(cell.w).toBe(240);
    expect(
      cell.x - cell.w / 2 - (figureElement.x + figureElement.w / 2),
      `${label} adjacent to its figure`,
    ).toBeCloseTo(12, 3);
    expect(Math.abs(cell.y - figureElement.y)).toBeLessThan(0.01);
  }
}
