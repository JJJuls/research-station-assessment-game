/**
 * Station 080 M23 — the two-plot excavation protocol at the Exterior Recovery
 * Yard (Unit 23, administration `m23-plots-v1`; research-owner decision
 * D-U23-1 of 16 October 2026, all nine rows approved).
 *
 * Groups (contract §8):
 * - `M23 pure` — the INDEPENDENT ORACLE: this file carries its own
 *   transcription of the identifiers, the two plots' bounds, the four literal
 *   keys, the stake and approach, the fixed scrolls, the selector probe
 *   offsets, the signal rule and every participant string, written by hand
 *   from `U23-CONTRACT.md` §§3, 4, 10, 12, 13 — it imports nothing from the
 *   content module for the expected side; the region predicate is re-derived
 *   over the yard's pure collision model; the model's transitions (opening,
 *   approaching, entry, admission, the failure, the choices, the stops, the
 *   cancellations, the closures, the faults) are checked against the
 *   fixtures' expectations.
 * - `M23 extraction` — every outcome fixture of `U23-OUTCOME-FIXTURES.md`
 *   (O, B, C, R, T, X) on model-produced and hand-written logs, both plot
 *   mirrors, with hand-written expected values; integrity and descriptive
 *   rules.
 * - `M23 browser`, `M23 STOP`, `M23 boundaries`, `M23 cancellation`,
 *   `M23 layout` — real input on the participant route (screenshots to
 *   `U23_OUT`).
 *
 * Nothing here establishes psychometric validity: two plots are clustered
 * observations of one series in one yard visit; a count never proves a
 * trait; an approved administration is an administration, not a validated
 * measure.
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import {
  classifyM23Reload,
  m23PriorLoadRecord,
} from '../src/measurement/features/m23';
import { registerEntry } from '../src/measurement/registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  RELOAD_HOLD_BACK_PREFIX,
  type ReloadEvent,
} from '../src/measurement/reloadCheck';
import { PILOT_SCHEDULE } from '../src/pilot/coverageSchedule';
import {
  createExteriorEpisode,
  EXTERIOR_OBJECTIVES,
  exteriorCurrentSite,
  exteriorDismissSite,
  exteriorM23GuidanceAddressed,
} from '../src/pilot/exterior/exteriorEpisodeModel';
import {
  M23_ASSIGNMENT_SCHEME,
  M23_BEACON_GLYPH,
  M23_FAMILY,
  M23_FIGURE_GLYPH,
  M23_HUD,
  M23_MODAL,
  M23_PLOTS,
  M23_PROBE_OFFSETS,
  M23_STAKE_ANCHOR,
  M23_STAKE_APPROACH,
  M23_TEXT,
  m23Band,
  m23CellLabel,
  m23JointAssignment,
  M23P_ENTRY_STATE_VERSION,
  M23P_OPPORTUNITY_ID,
  M23P_WINDOW_ID,
  m23ParticipantStrings,
  type M23PlotId,
  m23RegionAssociation,
  m23RegionMember,
  m23Signal,
  m23Trend,
} from '../src/pilot/windows/m23PlotsContent';
import {
  createM23Series,
  M23_EVENT_SUFFIXES,
  M23_RELOAD_DETAIL,
  m23Admit,
  type M23Assignment,
  type M23CancelReason,
  m23ClosureSnapshot,
  m23EntrySnapshot,
  m23FailureSides,
  type M23LogSink,
  m23ObservedContinuation,
  m23PlotOf,
  m23PriorLoadCheck,
  m23sAfterChoiceEnter,
  m23sApproachSample,
  m23sBriefShown,
  m23sCancelAction,
  m23sCancelStop,
  m23sChoose,
  m23sCloseAtReview,
  m23sCloseAtShiftEnd,
  m23sConfirmStop,
  m23Selected,
  m23SelectorStatus,
  m23sEnterRegion,
  type M23Series,
  m23sExampleViewed,
  m23sFail,
  m23sHelpClosed,
  m23sHelpOpened,
  type M23ShiftEndSource,
  m23sHoldBack,
  m23sNavigationToken,
  m23sOpenPlot,
  m23sPause,
  m23sPresentFailureChoice,
  m23sRefuse,
  m23sRegionExit,
  m23sRequestStop,
  m23sResolveDig,
  m23sResolveScan,
  m23sSelectorShown,
  m23sStartAction,
  m23sSurfaceClosed,
  m23sSurfaceOpened,
} from '../src/pilot/windows/m23PlotsModel';
import {
  type M23SurfaceHost,
  m23SurfaceModel,
} from '../src/pilot/windows/m23SurfaceModel';
import { YARD_SITES, YARD_SPAWN } from '../src/pilot/zoneSites';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  INTERACTION_RADIUS,
  YARD_REGISTRY,
} from '../src/world/interactionRegistry';
import {
  bodyFits,
  gridOf,
  npcSolid,
  walkingDistance,
} from '../src/world/layouts/grid';
import {
  YARD_LAYOUT,
  YARD_PROPS,
  YARD_SOLIDS,
} from '../src/world/layouts/yard';
import {
  captureErrors,
  eventsByType,
  expectNoRuntimeErrors,
  exteriorProbe,
  itemStatus,
  lastFeedback,
} from './exteriorHelpers';
import { hold, press, selectPromptOption } from './helpers';
import {
  activate,
  backFromStop,
  blurPage,
  briefToSelector,
  cameraProbe,
  chooseFailure,
  clickPad,
  confirmStop,
  controlsParts,
  digFacing,
  enterYard,
  enterYardAssigned,
  expectExampleGeometry,
  expectHudClearOfPlot,
  faceCell,
  failFirst,
  faProbe,
  finishOutside,
  focusPage,
  hidePage,
  jointAssignmentOracle,
  jointCellKey,
  keyActivatePrefix,
  keyCellOf,
  M23,
  m23Events,
  m23EventTypes,
  m23Field,
  m23Probe,
  openPanel,
  openPlot,
  openSeries,
  openStakeSurface,
  playerAt,
  plotDesignRect,
  reloadToYard,
  requestStop,
  scanHere,
  sessionIdFor,
  showPage,
  startPlot,
  stepAway,
  surface,
  waitFieldFeedback,
  waitM23,
  waitSurface,
  waitView,
  walkInsidePlot,
  walkIntoPlot,
  worldPrompt,
  yardPromptBounds,
} from './m23Helpers';
import {
  interactAt,
  promptLabels,
  registryApproach,
  yardApproach,
  yardVia,
} from './pilotHelpers';

const OUT = process.env.U23_OUT ?? 'test-results/u23-dev';
const REPO = resolve(__dirname, '..');

/* ------------------------------------------------------------------ *
 * 1. The transcription, by hand from the contract (§§3, 4, 10, 12, 13).
 *    Nothing below is imported from the content module.
 * ------------------------------------------------------------------ */

const HAND = {
  family: 'proto_m23_plots_',
  opportunity: 'proto_m23_excavation_series',
  window: 'm23_plots_w1',
  version: 'm23-plots-v1',
  layout: 'a_adjusted_v1',
  plots: {
    plot_a: { minCol: 27, maxCol: 33, minRow: 8, maxRow: 13 },
    plot_b: { minCol: 34, maxCol: 40, minRow: 8, maxRow: 13 },
  },
  keys: {
    a1: { col: 29, row: 9 },
    a2: { col: 31, row: 12 },
    b1: { col: 38, row: 9 },
    b2: { col: 36, row: 12 },
  },
  offsets: { a1: [2, 1], a2: [4, 4], b1: [4, 1], b2: [2, 4] },
  ids: {
    plot_a: {
      object: 'm23_plot_a_object',
      target: 'm23_plot_a_target',
    },
    plot_b: {
      object: 'm23_plot_b_object',
      target: 'm23_plot_b_target',
    },
  },
  stake: { x: 1072, y: 488 },
  approach: { x: 1116, y: 488 },
  scroll: { plot_a: { x: 656, y: 172 }, plot_b: { x: 880, y: 172 } },
  probes: [
    { dx: -27, dy: 4 },
    { dx: 27, dy: 4 },
    { dx: 0, dy: -28 },
    { dx: 0, dy: 36 },
  ],
  radius: 160,
  scan_ms: 1000,
  cooldown_ms: 900,
  dig_ms: 1500,
  speed: 175,
  removed_props: [
    { texture: 'w3-yard-stake-field', x: 1074, y: 330 },
    { texture: 'w3-yard-debris-c', x: 1130, y: 470 },
    { texture: 'w3-yard-lamp-a', x: 948, y: 440 },
    { texture: 'w3-yard-lamp-e', x: 1290, y: 300 },
  ],
  text: {
    title: 'EXCAVATION FIELD',
    objective: 'Excavation field — two staked plots, east (E at the stake).',
    noor_clause: 'the excavation field with two staked plots (east)',
    noor_sentence: 'You can search either excavation plot, pause, or stop.',
    removed_sentence: 'Recovering a component is not required.',
    approach_a:
      'Approaching Plot A. Move towards its outlined cells. P / PANEL: plots and stop controls.',
    refused_approaching:
      "Walk into the selected plot's search area before scanning or digging.",
    brief:
      'Two staked plots each contain a buried component. You can search either plot, pause and return, or stop work on a plot.',
    scanner:
      'Scan from where you stand. A stronger reading means you are nearer the component than on your last comparable scan. It does not point to the component.',
    dig: 'Dig the highlighted cell you are facing. Only the cell holding the component will recover it.',
    closure:
      'Telling Noor you are finished outside closes the excavation as it is. Leaving this panel only pauses work.',
    example_heading: 'CONTROL EXAMPLE — NOT A SEARCH PLOT',
    example_1:
      'The scanner reads from where you stand. This visible example beacon is 80 pixels away. The reading is 50 / 100 — MODERATE.',
    example_2:
      'The highlighted cell is where DIG will act. A cell with the component recovers it. An empty cell stays empty.',
    field_controls:
      'Arrow keys or direction pad: move and face. C / SCAN: scan. D / DIG: dig the highlighted cell. P / PANEL: plots and stop controls. HELP: repeat the control example. ESC / STEP AWAY: pause.',
    modal_guidance: 'Arrows / Tab: move focus. Enter / Space: choose.',
    failure_guidance: [
      'Left / Right: select the option on that side.',
      'Enter / Space: choose. Tab / Shift+Tab: cycle.',
      'ESC / STEP AWAY: pause.',
    ],
    statuses: [
      'Not started',
      'Approaching',
      'Searching',
      'Choose next step',
      'Paused',
      'Stopped',
      'Recovered',
      'Closed at shift end',
      'Closed before a choice',
      'Unavailable — technical problem',
    ],
    selector_footer:
      'P / PANEL: plots and stop controls. ESC / STEP AWAY: pause.',
    first_failure:
      'No component was found in this cell. Choose what happens next for this plot. Either option lets you move on.',
    continue: 'CONTINUE SEARCH',
    stop: 'STOP THIS PLOT',
    after_continue: 'Search resumed. Scan or dig when ready.',
    stop_confirm_a:
      'Stop work on Plot A for this shift? Stopping leaves the other plot unchanged. You can still leave the yard.',
    confirm_footer:
      'BACK: return to the requesting panel. It does not resume a scan or dig.',
    stopped_a:
      'Plot A is stopped for this shift. The other plot is unchanged. You can step away.',
    recovery_a:
      'Component recovered from Plot A and placed in the field tray. Return to the plot panel or step away.',
    paused: 'This plot is paused. Its excavated cells will remain as they are.',
    left_region:
      "Work paused outside this plot's search area. Open the plot panel (P) to resume.",
    cell_help: 'Columns count from the left; rows count from the top.',
    exit: 'Work is paused. Return to the excavation panel to resume.',
    scan_cancelled: 'The scan was cancelled. Start a new scan when ready.',
    dig_cancelled: 'The dig was cancelled. Start a new dig when ready.',
    refused_inactive: 'Open the plot panel (P) to resume.',
    refused_outside_plot: 'Face a highlighted cell inside the open plot.',
    refused_duplicate: 'This cell has already been dug.',
    refused_busy: 'Wait for the current action to finish.',
    refused_cooldown: 'The scanner is resetting.',
    scanner_none: 'No reading yet.',
    dig_none: 'No dig recorded.',
    tray_empty: 'FIELD TRAY: No components recovered.',
    series_closed:
      'The excavation is closed for this shift. Work already recorded is unchanged.',
    reload_lock:
      'This excavation was opened before the page reloaded. It cannot be restarted in this session. You can continue through the station.',
    // U24 RL-3: the owner's §9 lines (D-5), ⟨station⟩ = excavation stake.
    reload_lock_unverified: [
      'The earlier state of this excavation stake could not be verified.',
      'It stays closed after this reload.',
    ],
    plot_fault:
      'This plot is unavailable because of a technical problem. Work already recorded is saved. The other plot is unchanged. You can leave.',
  },
} as const;

const FORBIDDEN =
  /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bQ\d{2}\b|people|describe|someone|\bstick|\btask|difficult|\bhard\b|persist|persever|grit|determin|resilien|give up|\bquit|effort|\blazy|\bgood\b|well done|great|\bfail\b|score|\btest\b|measure|rating|\bmust\b|should|need to|don't forget|remember|hurry|quick|please|try again|keep going/i;

/** The yard's pure collision model (the scene's region predicate reads the same). */
const GRID = gridOf(YARD_LAYOUT, YARD_SOLIDS);
const fits = (x: number, y: number) => bodyFits(GRID, x, y);

/** The hand-written region predicate (contract §10 F6). */
function handMember(plot: M23PlotId, x: number, y: number): boolean {
  const inside = (
    bounds: { minCol: number; maxCol: number; minRow: number; maxRow: number },
    px: number,
    py: number,
  ) =>
    px >= bounds.minCol * 32 &&
    px < (bounds.maxCol + 1) * 32 &&
    py >= bounds.minRow * 32 &&
    py < (bounds.maxRow + 1) * 32;
  const own = HAND.plots[plot];
  const other = HAND.plots[plot === 'plot_a' ? 'plot_b' : 'plot_a'];

  if (inside(other, x, y) || !fits(x, y)) {
    return false;
  }

  return (
    inside(own, x, y) ||
    HAND.probes.some((probe) => inside(own, x + probe.dx, y + probe.dy))
  );
}

const handSignal = (d: number) =>
  Math.round(100 * Math.min(1, Math.max(0, 1 - d / 160)));
const handBand = (s: number) =>
  s <= 0 ? 'NONE' : s <= 33 ? 'FAINT' : s <= 66 ? 'MODERATE' : 'STRONG';

/* ------------------------------------------------------------------ *
 * 2. The scenario kit: the model driven through a kit-shaped sink.
 * ------------------------------------------------------------------ */

const ASSIGN: M23Assignment = {
  plot_a_form: 'a1',
  plot_b_form: 'b1',
  plot_order: 'AB',
  failure_option_order: 'continue_left',
};

const EMPTY = { plot_a: { col: 28, row: 9 }, plot_b: { col: 35, row: 9 } };
const ENTRY = { plot_a: { x: 1072, y: 464 }, plot_b: { x: 1104, y: 464 } };
const INSIDE = { plot_a: { x: 976, y: 364 }, plot_b: { x: 1200, y: 364 } };
const OUTSIDE = { x: 1116, y: 488 };

const PARTICIPANT: M23ShiftEndSource = {
  participant_initiated: true,
  origin_input_mode: 'keyboard',
  shift_end_command_id: 'noor_finished_outside',
  shift_end_sequence: 900,
};

const SYSTEM_SHIFT: M23ShiftEndSource = {
  participant_initiated: false,
  origin_input_mode: 'system',
  shift_end_command_id: null,
  shift_end_sequence: null,
};

interface Kit {
  s: M23Series;
  events: RawGameEvent[];
  sink: M23LogSink;
  now: () => number;
  tick: (ms: number) => void;
  /** The kit's own records (the ItemWindow writes them in production). */
  kitLog: (suffix: string, metadata: Record<string, unknown>) => void;
}

/** The kit assignment the fixtures run under (`mirrors()` runs both variants). */
let KIT_ASSIGNMENT: M23Assignment = ASSIGN;
/** The input mode the fixtures commit with (`mirrors()` runs keyboard AND pointer; round 3, 8d). */
let KIT_MODE: 'keyboard' | 'pointer' = 'keyboard';

/** The visual side of a response under the kit's assignment. */
function sideOf(kit: Kit, response: 'continue' | 'stop'): 'left' | 'right' {
  const left =
    kit.s.assignment.failure_option_order === 'continue_left'
      ? 'continue'
      : 'stop';

  return response === left ? 'left' : 'right';
}

function makeKit(assignment: M23Assignment = KIT_ASSIGNMENT): Kit {
  const events: RawGameEvent[] = [];
  let sequence = 0;
  let clock = 10_000;
  const s = createM23Series(assignment);
  const write = (suffix: string, metadata: Record<string, unknown>) => {
    sequence += 1;
    events.push({
      session_id: 'GS',
      timestamp_ms: clock,
      scene: 'exterior_recovery_yard',
      event_type: `${HAND.family}${suffix}`,
      sequence,
      page_load_index: 1,
      metadata: {
        measure_id: 'M23',
        opportunity_id: HAND.opportunity,
        window_id: HAND.window,
        entry_state_version: HAND.version,
        ...metadata,
      },
    });

    return sequence;
  };

  return {
    s,
    events,
    sink: write,
    now: () => clock,
    tick: (ms) => {
      clock += ms;
    },
    kitLog: write,
  };
}

/** OPEN of the fixtures: brief, both pages, the first usable selector. */
function openKit(kit: Kit) {
  const { s, sink, now } = kit;

  s.status = 'presented';
  kit.kitLog('presented', { input_mode: 'system' });
  m23sSurfaceOpened(s, 'brief', now(), sink);
  m23sBriefShown(s, now(), true, sink);
  kit.tick(500);
  m23sExampleViewed(s, 1, now(), sink, 'keyboard');
  kit.tick(500);
  m23sExampleViewed(s, 2, now(), sink, 'keyboard');
  kit.tick(500);
  expect(m23sSelectorShown(s, now())).toBe('first');
  kit.kitLog('opportunity_opened', {
    entry_state_snapshot: m23EntrySnapshot(s, {
      stage: 'exterior_work',
      visibility: { page_visible: true, page_focused: true },
      prior_load: null,
      tools: ['field_scanner', 'excavation_spade'],
    }),
    input_mode: 'system',
  });
  kit.tick(500);
}

const member = (plot: M23PlotId, at: { x: number; y: number }) =>
  m23RegionMember(plot, at.x, at.y, fits);

/** ENTER(X): OPEN PLOT X from the given origin (inside ⇒ searching at once). */
function enter(
  kit: Kit,
  plot: M23PlotId,
  at: { x: number; y: number } = INSIDE[plot],
) {
  const outcome = m23sOpenPlot(
    kit.s,
    plot,
    KIT_MODE,
    kit.now(),
    at,
    member(plot, at),
    kit.sink,
  );

  if (outcome.kind === 'refused') {
    throw new Error(`enter ${plot} refused: ${outcome.reason}`);
  }

  kit.tick(500);

  return outcome;
}

/** A fully elapsed scan at the origin (the region membership re-evaluated). */
function scan(
  kit: Kit,
  at: { x: number; y: number },
  mode: 'keyboard' | 'pointer' = KIT_MODE,
) {
  const plot = m23Selected(kit.s)!;
  const token = m23sStartAction(
    kit.s,
    'scan',
    kit.now(),
    at,
    member(plot.id, at).stance ?? 'interior',
    null,
    mode,
    kit.sink,
  )!;

  kit.tick(HAND.scan_ms);

  return m23sResolveScan(
    kit.s,
    token.id,
    kit.now(),
    at,
    member(plot.id, at),
    kit.sink,
  )!;
}

/** A fully elapsed dig of a cell from the origin. */
function dig(
  kit: Kit,
  cell: { col: number; row: number },
  at: { x: number; y: number },
  mode: 'keyboard' | 'pointer' = KIT_MODE,
) {
  const plot = m23Selected(kit.s)!;
  const token = m23sStartAction(
    kit.s,
    'dig',
    kit.now(),
    at,
    member(plot.id, at).stance ?? 'interior',
    cell,
    mode,
    kit.sink,
  )!;

  kit.tick(HAND.dig_ms);

  return m23sResolveDig(kit.s, token.id, kit.now(), at, kit.sink)!;
}

/** F(X): the genuine first failure (a dig of the hand-specified empty cell). */
function fail(kit: Kit, plot: M23PlotId) {
  const outcome = dig(kit, EMPTY[plot], INSIDE[plot]);

  expect(outcome.outcome).toBe('empty');
  expect(outcome.first_failure).toBe(true);
  kit.tick(300);

  return outcome;
}

/** V(X): the usable first-failure panel. */
function present(kit: Kit, plot: M23PlotId, epoch = 'e1') {
  expect(
    m23sPresentFailureChoice(kit.s, plot, kit.now(), true, epoch, kit.sink),
  ).toBe(true);
  kit.tick(HAND.scan_ms);
}

/** CONT(X): the fresh CONTINUE, then the origin re-evaluated (inside ⇒ searching). */
function cont(
  kit: Kit,
  plot: M23PlotId,
  at: { x: number; y: number } = INSIDE[plot],
) {
  const choice = m23sChoose(
    kit.s,
    plot,
    'continue',
    KIT_MODE,
    kit.now(),
    sideOf(kit, 'continue'),
    kit.sink,
  );

  expect(choice.kind).toBe('chosen');
  // Round 4 (8d): the recorded response carries the mode it was committed with.
  expect(lastEvent(kit, 'failure_choice').metadata).toMatchObject({
    response: 'continue',
    input_mode: KIT_MODE,
  });
  kit.tick(200);

  const entry = m23sAfterChoiceEnter(
    kit.s,
    plot,
    kit.now(),
    at,
    member(plot, at),
    kit.sink,
  );

  kit.tick(200);

  return entry;
}

/** STOP(X): the direct first-failure STOP. */
function stopDirect(kit: Kit, plot: M23PlotId) {
  const choice = m23sChoose(
    kit.s,
    plot,
    'stop',
    KIT_MODE,
    kit.now(),
    sideOf(kit, 'stop'),
    kit.sink,
  );

  expect(choice.kind).toBe('chosen');
  expect(lastEvent(kit, 'failure_choice').metadata).toMatchObject({
    response: 'stop',
    input_mode: KIT_MODE,
  });
  // The stopped record's settle (400 ms) precedes any further opening.
  kit.tick(500);
}

/** The kit's last record of a family suffix (round 4: the input-mode assertions). */
function lastEvent(kit: Kit, suffix: string): RawGameEvent {
  const event = [...kit.events]
    .reverse()
    .find((candidate) => candidate.event_type === `${HAND.family}${suffix}`);

  if (event === undefined) {
    throw new Error(`no ${suffix} record`);
  }

  return event;
}

/** SELSTOP(X): P → selector → STOP → confirm. */
function selStop(kit: Kit, plot: M23PlotId) {
  if (kit.s.selected === plot) {
    m23sPause(kit.s, 'panel', kit.now(), kit.sink, KIT_MODE);
  }

  m23sSurfaceOpened(kit.s, 'selector', kit.now(), kit.sink);
  m23sSelectorShown(kit.s, kit.now());
  kit.tick(500);
  expect(m23sRequestStop(kit.s, plot, KIT_MODE, kit.now(), kit.sink)).toBe(
    true,
  );
  expect(lastEvent(kit, 'stop_requested').metadata?.input_mode).toBe(KIT_MODE);
  kit.tick(500);
  expect(m23sConfirmStop(kit.s, plot, KIT_MODE, kit.now(), kit.sink)).toBe(
    true,
  );
  kit.tick(500);
}

/** R(X): the first-dig recovery at the literal key. */
function recover(kit: Kit, plot: M23PlotId) {
  const key = HAND.keys[m23PlotOf(kit.s, plot).form];
  const outcome = dig(kit, key, INSIDE[plot]);

  expect(outcome.outcome).toBe('recovered');
  // The recovery record's settle (400 ms) precedes any further opening.
  kit.tick(500);
}

/** ACT(X): a qualifying scan after CONTINUE (the credit). */
function act(kit: Kit, plot: M23PlotId) {
  const outcome = scan(kit, INSIDE[plot]);

  expect(outcome.qualifying).toBe(true);
  kit.tick(200);

  return outcome;
}

/** The kit's `window_closed` after a closure (complete / censored as the adapter does). */
function closeWindow(kit: Kit) {
  const unknown = kit.s.plots.some(
    (plot) =>
      plot.first_failure !== null &&
      plot.status !== 'technical_failure' &&
      m23ObservedContinuation(plot) === null,
  );

  kit.kitLog('window_closed', {
    exit_state: unknown ? 'stopped' : 'completed',
    [unknown ? 'raw_components_partial' : 'raw_components']: m23ClosureSnapshot(
      kit.s,
      kit.now(),
    ),
    input_mode: 'system',
  });
}

function shift(kit: Kit, source: M23ShiftEndSource = PARTICIPANT) {
  m23sCloseAtShiftEnd(kit.s, kit.now(), source, kit.sink);
  closeWindow(kit);
}

function review(kit: Kit) {
  m23sCloseAtReview(kit.s, kit.now(), kit.sink);
  closeWindow(kit);
}

function extract(kit: Kit, reloaded = false) {
  return extractItemFeatures('M23', kit.events, {
    finalCoreClosed: true,
    pageLoadIndex: 1,
    reloaded,
  })[0];
}

function expectRow(
  row: ReturnType<typeof extract>,
  expected: {
    value: number | null;
    numerator: number | null;
    denominator: number;
    disposition: string;
    reason?: string;
  },
) {
  expect(row.value).toBe(expected.value);
  expect(row.numerator).toBe(expected.numerator);
  expect(row.denominator).toBe(expected.denominator);
  expect(row.disposition).toBe(expected.disposition);
  expect(row.planned_denominator).toBe(2);

  if (expected.reason !== undefined) {
    expect(row.missing_reason).toBe(expected.reason);
  }
}

const comps = (row: ReturnType<typeof extract>) =>
  row.components as Record<string, unknown>;

/* ------------------------------------------------------------------ *
 * 3. M23 pure — the oracle
 * ------------------------------------------------------------------ */

test.describe('M23 pure: the content oracle (Unit 23)', () => {
  test('the identity, the plots, the four literal keys, the stake, the approach and the scrolls equal the transcription', () => {
    expect(M23_FAMILY).toBe(HAND.family);
    expect(M23P_OPPORTUNITY_ID).toBe(HAND.opportunity);
    expect(M23P_WINDOW_ID).toBe(HAND.window);
    expect(M23P_ENTRY_STATE_VERSION).toBe(HAND.version);
    expect(M23_PLOTS.map((plot) => plot.id)).toEqual(['plot_a', 'plot_b']);

    for (const plot of M23_PLOTS) {
      expect(plot.bounds).toEqual(HAND.plots[plot.id]);
      expect(plot.object_id).toBe(HAND.ids[plot.id].object);
      expect(plot.target_id).toBe(HAND.ids[plot.id].target);
      expect(plot.fixed_scroll).toEqual(HAND.scroll[plot.id]);

      for (const form of plot.forms) {
        const key = plot.keys[form]!;
        const [dc, dr] = HAND.offsets[form];

        expect(key).toEqual(HAND.keys[form]);
        // The within-plot offsets are unchanged (contract §3).
        expect(key.col - plot.bounds.minCol).toBe(dc);
        expect(key.row - plot.bounds.minRow).toBe(dr);
        // Deep inside: never on the plot's edge.
        expect(key.col).toBeGreaterThan(plot.bounds.minCol);
        expect(key.col).toBeLessThan(plot.bounds.maxCol);
        expect(key.row).toBeGreaterThan(plot.bounds.minRow);
        expect(key.row).toBeLessThan(plot.bounds.maxRow);
      }
    }

    expect(M23_STAKE_ANCHOR).toEqual(HAND.stake);
    expect(M23_STAKE_APPROACH).toEqual(HAND.approach);
    expect(YARD_SITES.plotStake).toEqual(HAND.stake);
    expect(
      YARD_REGISTRY.find((entry) => entry.id === 'yard.plot_stake')!.approach,
    ).toEqual(HAND.approach);
    expect(M23_PROBE_OFFSETS).toEqual(HAND.probes);
  });

  test('the signal rule and the bands: 0 px → 100, 80 → 50, 160 → 0; trend compares the same plot only', () => {
    expect(m23Signal(0)).toBe(100);
    expect(m23Signal(80)).toBe(50);
    expect(m23Signal(160)).toBe(0);
    expect(m23Signal(400)).toBe(0);

    for (let d = 0; d <= 200; d += 1) {
      expect(m23Signal(d)).toBe(handSignal(d));
      expect(m23Band(m23Signal(d))).toBe(handBand(handSignal(d)));
    }

    expect(m23Band(0)).toBe('NONE');
    expect(m23Band(1)).toBe('FAINT');
    expect(m23Band(33)).toBe('FAINT');
    expect(m23Band(34)).toBe('MODERATE');
    expect(m23Band(66)).toBe('MODERATE');
    expect(m23Band(67)).toBe('STRONG');
    expect(m23Trend(null, 40)).toBe('NO COMPARISON');
    expect(m23Trend(40, 50)).toBe('CLOSER');
    expect(m23Trend(50, 40)).toBe('FARTHER');
    expect(m23Trend(40, 40)).toBe('SAME');
  });

  test('every plot has 42 cells; each key is one of them; the local labels count columns from the left and rows from the top', () => {
    for (const plot of M23_PLOTS) {
      const cells: string[] = [];

      for (let row = plot.bounds.minRow; row <= plot.bounds.maxRow; row += 1) {
        for (
          let col = plot.bounds.minCol;
          col <= plot.bounds.maxCol;
          col += 1
        ) {
          cells.push(`${col}:${row}`);
        }
      }

      expect(cells).toHaveLength(42);
      expect(new Set(cells).size).toBe(42);

      for (const form of plot.forms) {
        const key = plot.keys[form]!;

        expect(cells).toContain(`${key.col}:${key.row}`);
      }

      expect(
        m23CellLabel(plot.bounds, {
          col: plot.bounds.minCol,
          row: plot.bounds.minRow,
        }),
      ).toBe('C01 R01');
      expect(
        m23CellLabel(plot.bounds, {
          col: plot.bounds.maxCol,
          row: plot.bounds.maxRow,
        }),
      ).toBe('C07 R06');
    }

    expect(m23CellLabel(HAND.plots.plot_a, HAND.keys.a1)).toBe('C03 R02');
    expect(m23CellLabel(HAND.plots.plot_b, HAND.keys.b2)).toBe('C03 R05');
  });

  test('the qualifying region equals the hand-written body-valid inverse-probe union over a 4 px lattice; the fixture stances; the other-plot exclusion; the stake and approach are outside both', () => {
    for (const plot of ['plot_a', 'plot_b'] as const) {
      let members = 0;

      for (let x = 800; x <= 1360; x += 4) {
        for (let y = 180; y <= 520; y += 4) {
          const expected = handMember(plot, x, y);
          const actual = member(plot, { x, y }).member;

          expect(actual, `${plot} at ${x},${y}`).toBe(expected);
          members += expected ? 1 : 0;
        }
      }

      expect(members).toBeGreaterThan(1000);
    }

    // Boundary examples (U23-LAYOUT-CHOICE-EVIDENCE.md): north with DOWN,
    // south with UP, outer west with RIGHT, outer east with LEFT.
    expect(member('plot_a', { x: 976, y: 220 })).toEqual({
      member: true,
      stance: 'boundary_stance',
    });
    expect(member('plot_a', { x: 976, y: 464 }).member).toBe(true);
    expect(member('plot_a', { x: 848, y: 348 }).member).toBe(true);
    expect(member('plot_b', { x: 1200, y: 220 }).member).toBe(true);
    expect(member('plot_b', { x: 1200, y: 464 }).member).toBe(true);
    expect(member('plot_b', { x: 1328, y: 348 }).member).toBe(true);
    // The inner edges are INSIDE the other plot: refused for the selected plot.
    expect(member('plot_a', { x: 1096, y: 348 }).member).toBe(false);
    expect(member('plot_b', { x: 1080, y: 348 }).member).toBe(false);
    expect(member('plot_b', { x: 1096, y: 348 })).toEqual({
      member: true,
      stance: 'interior',
    });
    // The overlap sample lies outside both rectangles and in both unions
    // (P08): it belongs to whichever plot is selected, never both at once.
    expect(member('plot_a', { x: 1080, y: 255 }).member).toBe(true);
    expect(member('plot_b', { x: 1080, y: 255 }).member).toBe(true);
    // The stake, the approach and its ±12 box are outside both regions.
    for (const at of [HAND.stake, HAND.approach]) {
      expect(member('plot_a', at).member).toBe(false);
      expect(member('plot_b', at).member).toBe(false);
    }

    for (let x = 1104; x <= 1128; x += 4) {
      for (let y = 476; y <= 500; y += 4) {
        expect(fits(x, y), `approach box ${x},${y} body-valid`).toBe(true);
        expect(member('plot_a', { x, y }).member).toBe(false);
        expect(member('plot_b', { x, y }).member).toBe(false);
      }
    }

    // The layout group's extremal stances (the corner extremes and the R2
    // rig-chip stance) are members of their plot and of no other.
    for (const [plot, other, stances] of [
      [
        'plot_a',
        'plot_b',
        [
          { x: 848, y: 260 },
          { x: 848, y: 440 },
          { x: 1056, y: 232 },
          { x: 976, y: 232 },
        ],
      ],
      [
        'plot_b',
        'plot_a',
        [
          { x: 1338, y: 252 },
          { x: 1334, y: 252 },
          { x: 1328, y: 440 },
          { x: 1296, y: 232 },
          { x: 1200, y: 232 },
        ],
      ],
    ] as const) {
      for (const at of stances) {
        expect(member(plot, at).member, `${plot} ${at.x},${at.y}`).toBe(true);
        expect(member(other, at).member, `${other} ${at.x},${at.y}`).toBe(
          false,
        );
      }
    }

    // The nominal entry stances (P04): accepted with the UP probe.
    expect(member('plot_a', ENTRY.plot_a)).toEqual({
      member: true,
      stance: 'boundary_stance',
    });
    expect(member('plot_b', ENTRY.plot_b)).toEqual({
      member: true,
      stance: 'boundary_stance',
    });
    expect(
      Math.hypot(ENTRY.plot_a.x - HAND.stake.x, ENTRY.plot_a.y - HAND.stake.y),
    ).toBe(24);
    expect(
      Math.hypot(ENTRY.plot_b.x - HAND.stake.x, ENTRY.plot_b.y - HAND.stake.y),
    ).toBe(40);
    expect(
      Math.hypot(
        ENTRY.plot_a.x - HAND.approach.x,
        ENTRY.plot_a.y - HAND.approach.y,
      ),
    ).toBeCloseTo(50.12, 2);
    expect(
      Math.hypot(
        ENTRY.plot_b.x - HAND.approach.x,
        ENTRY.plot_b.y - HAND.approach.y,
      ),
    ).toBeCloseTo(26.833, 2);
  });

  test('S01–S04: the relocated stake keeps D-V2-1 spacing and unique ownership over the ±12 landing box; the approach is reachable from the spawn; the four props are gone', () => {
    const d = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);

    expect(d(HAND.stake, HAND.approach)).toBe(44);
    expect(d(HAND.stake, YARD_SITES.cableFlag)).toBeCloseTo(103.942, 2);
    expect(d(HAND.stake, YARD_SITES.supplyCrate)).toBeCloseTo(111.866, 2);

    const stations = YARD_REGISTRY.filter(
      (entry) => entry.id !== 'yard.plot_stake' && entry.kind !== 'door',
    );

    for (const station of stations) {
      expect(d(HAND.stake, station), station.id).toBeGreaterThanOrEqual(100);
    }

    // S02: the approach's whole ±12 box is nearer the stake than any other
    // station (affine squared differences: the four corners suffice), and
    // every unchanged approach stays nearer its own station than the stake.
    for (const dx of [-12, 12]) {
      for (const dy of [-12, 12]) {
        const corner = { x: HAND.approach.x + dx, y: HAND.approach.y + dy };
        const own = d(corner, HAND.stake);

        expect(own).toBeLessThan(INTERACTION_RADIUS);

        for (const station of stations) {
          expect(d(corner, station), `${station.id} vs stake`).toBeGreaterThan(
            own,
          );
        }
      }
    }

    for (const station of stations) {
      for (const dx of [-12, 12]) {
        for (const dy of [-12, 12]) {
          const corner = {
            x: station.approach.x + dx,
            y: station.approach.y + dy,
          };

          expect(d(corner, station), `${station.id} own`).toBeLessThan(
            d(corner, HAND.stake),
          );
        }
      }
    }

    // The tight neighbour (the M05 flag's corner (1130, 518)).
    expect(d({ x: 1130, y: 518 }, YARD_SITES.cableFlag)).toBeCloseTo(60.299, 2);
    expect(d({ x: 1130, y: 518 }, HAND.stake)).toBeCloseTo(65.299, 2);

    // S03: reachable on foot from the spawn (the registry's own rule).
    const navGrid = gridOf(YARD_LAYOUT, [
      ...YARD_SOLIDS,
      npcSolid(YARD_SITES.noor.x, YARD_SITES.noor.y),
    ]);

    expect(
      walkingDistance(navGrid, YARD_SPAWN, HAND.approach, 12),
    ).not.toBeNull();

    // S04: the four props are removed; every other prop stands.
    for (const removed of HAND.removed_props) {
      expect(
        YARD_PROPS.some(
          (prop) =>
            prop.texture === removed.texture &&
            prop.x === removed.x &&
            prop.y === removed.y,
        ),
        `${removed.texture} at ${removed.x},${removed.y} removed`,
      ).toBe(false);
    }

    expect(YARD_PROPS.some((prop) => prop.texture === 'w3-yard-mast')).toBe(
      true,
    );
    expect(
      YARD_PROPS.some((prop) => prop.texture === 'w3-yard-cable-flag'),
    ).toBe(true);
  });

  test('every participant string of the module is in the transcription and carries no forbidden token; the neutral objective and the Noor sentence are exact; the removed sentence is absent', () => {
    const strings = m23ParticipantStrings();
    const hand = new Set<string>([
      HAND.text.title,
      HAND.text.objective,
      HAND.text.noor_clause,
      HAND.text.noor_sentence,
      HAND.text.approach_a,
      HAND.text.approach_a.replace('Plot A', 'Plot B'),
      HAND.text.refused_approaching,
      HAND.text.brief,
      HAND.text.scanner,
      HAND.text.dig,
      HAND.text.closure,
      'CONTROL EXAMPLE',
      'STEP AWAY',
      HAND.text.example_heading,
      HAND.text.example_1,
      HAND.text.example_2,
      'COMPONENT CELL',
      'EMPTY CELL',
      'NEXT',
      'BACK',
      'OPEN PLOT PANEL',
      'CLOSE HELP',
      HAND.text.field_controls,
      HAND.text.modal_guidance,
      ...HAND.text.failure_guidance,
      'PLOT A',
      'PLOT B',
      'OPEN PLOT A',
      'OPEN PLOT B',
      'RESUME PLOT A',
      'RESUME PLOT B',
      'STOP PLOT A',
      'STOP PLOT B',
      'HELP',
      HAND.text.selector_footer,
      HAND.text.first_failure,
      HAND.text.continue,
      HAND.text.stop,
      HAND.text.after_continue,
      HAND.text.stop_confirm_a,
      HAND.text.stop_confirm_a.replace('Plot A', 'Plot B'),
      HAND.text.confirm_footer,
      HAND.text.stopped_a,
      HAND.text.stopped_a.replace('Plot A', 'Plot B'),
      HAND.text.recovery_a,
      HAND.text.recovery_a.replace('Plot A', 'Plot B'),
      HAND.text.paused,
      HAND.text.left_region,
      HAND.text.cell_help,
      HAND.text.exit,
      HAND.text.scan_cancelled,
      HAND.text.dig_cancelled,
      HAND.text.refused_inactive,
      HAND.text.refused_approaching,
      HAND.text.refused_outside_plot,
      HAND.text.refused_duplicate,
      HAND.text.refused_busy,
      HAND.text.refused_cooldown,
      'PLOT A / SCANNER',
      'PLOT B / SCANNER',
      HAND.text.scanner_none,
      '50 / 100 — MODERATE',
      '0 / 100 — NONE',
      'PLOT A / LAST DIG',
      'PLOT B / LAST DIG',
      HAND.text.dig_none,
      'C03 R02: EMPTY',
      'C03 R02: COMPONENT RECOVERED',
      'Facing: C03 R02',
      'Facing: outside plot',
      HAND.text.tray_empty,
      'FIELD TRAY: Plot A component',
      'FIELD TRAY: Plot A component / Plot B component',
      HAND.text.series_closed,
      HAND.text.reload_lock,
      ...HAND.text.reload_lock_unverified,
      HAND.text.plot_fault,
      ...HAND.text.statuses,
    ]);

    for (const text of strings) {
      expect(
        hand.has(text),
        `module string in the transcription: ${text}`,
      ).toBe(true);
      expect(text, text).not.toMatch(FORBIDDEN);
      expect(text).not.toContain(HAND.text.removed_sentence);
    }

    for (const text of hand) {
      expect(strings, `transcribed string in the module: ${text}`).toContain(
        text,
      );
    }

    expect(M23_TEXT.objective).toBe(HAND.text.objective);
    expect(EXTERIOR_OBJECTIVES.excavation).toBe(HAND.text.objective);
    expect(M23_TEXT.noor_sentence).toBe(HAND.text.noor_sentence);
    expect(Object.values(M23_TEXT.status).sort()).toEqual(
      [...HAND.text.statuses].sort(),
    );
    // The modal geometry of contract §10 and the HUD boxes.
    expect(M23_MODAL.option_left).toEqual({ x: 24, y: 272, w: 324, h: 64 });
    expect(M23_MODAL.option_right).toEqual({ x: 372, y: 272, w: 324, h: 64 });
    expect(M23_MODAL.help).toEqual({ x: 24, y: 352, w: 220, h: 64 });
    expect(M23_MODAL.step_away).toEqual({ x: 476, y: 352, w: 220, h: 64 });
    expect(M23_MODAL.guidance).toEqual({ x: 24, y: 428, w: 672, h: 78 });
    expect(M23_HUD.scanner.w).toBe(250);
    expect(M23_HUD.dig.h).toBeCloseTo(173.3333, 3);
  });

  test('G01–G05: the excavation guidance has one setter — the first usable selector; a step-away, a legacy state or a dismissal never sets it; the Noor copy carries the clause and the one sentence', () => {
    const episode = createExteriorEpisode({ m23Form: 'form_a', deckForm: 'A' });

    expect(exteriorCurrentSite(episode)).toBe('coupling');
    episode.m19.entered = true;
    episode.m20.accepted = true;
    expect(exteriorCurrentSite(episode)).toBe('excavation');
    // G02: a step-away before the selector does not address it.
    exteriorDismissSite(episode, 'excavation');
    expect(exteriorCurrentSite(episode)).toBe('excavation');
    // The legacy single-plot state is never read.
    episode.m23.entered = true;
    episode.m23.closed = true;
    episode.m23.recovered = true;
    expect(exteriorCurrentSite(episode)).toBe('excavation');
    // G03: the one setter.
    exteriorM23GuidanceAddressed(episode);
    expect(exteriorCurrentSite(episode)).toBe('rig');
    expect(EXTERIOR_OBJECTIVES.excavation).not.toMatch(
      /recover|relay|scan|dig/i,
    );

    const scene = readFileSync(
      resolve(REPO, 'src/scenes/ExteriorRecoveryYardScene.ts'),
      'utf8',
    );

    expect(scene).toContain('M23_TEXT.noor_clause');
    expect(scene).toContain('M23_TEXT.noor_sentence');
    expect(scene).not.toContain('the staked excavation field (east)');
    expect(scene).not.toContain(HAND.text.removed_sentence);
    expect(scene).toContain(
      "private guard(item: 'M20' | 'M23' | 'M24' | 'M26', fn: () => void) {",
    );
    expect(scene).toContain("if (item === 'M20') {");
  });

  test('the register row and the schedule: route v3, the family, the window, implemented; the approved formula row unchanged; the eight dormant comprehension marks kept; the legacy module untouched on the route', () => {
    const entry = registerEntry('M23');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([HAND.opportunity]);
    expect(entry.route.windows.map((window) => window.id)).toEqual([
      HAND.window,
    ]);
    expect(entry.route.family_prefixes).toEqual([HAND.family]);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.coverage_label).toBe('behavioural_counterpart');
    expect(entry.independence.kind).toBe('repeated_within_episode');

    const primary = entry.features[0];

    expect(primary.feature_id).toBe('m23_continuations_after_failure');
    expect(primary.numerator).toBe(
      'plots with another executable search action after the first failed dig',
    );
    expect(primary.denominator).toBe('plots with a genuine failed dig');
    expect(primary.range).toBe('0–2');
    expect(primary.planned_denominator).toBe(2);
    expect(primary.denominator_kind).toBe('conditional_eligibility');
    expect(primary.missing_rule).toBe(
      'no failed dig → null (a lucky recovery is no post-failure observation)',
    );

    const scheduled = PILOT_SCHEDULE.find((item) => item.item === 'M23')!;

    expect(scheduled.opportunityIds).toEqual([HAND.opportunity]);
    expect(scheduled.familyPrefixes).toEqual([HAND.family]);
    expect(scheduled.zone).toBe('exterior_recovery_yard');

    const windows = readFileSync(
      resolve(REPO, 'src/pilot/windows/exteriorWindows.ts'),
      'utf8',
    );

    expect(windows.match(/setComprehension\('passed'\)/g)).toHaveLength(8);
    expect(windows).toContain('m23Present(');
    expect(windows).toContain('m23Begin(');
    expect(windows).not.toContain('w.m23.declare()');

    const register = readFileSync(
      resolve(REPO, 'src/measurement/registerV3.ts'),
      'utf8',
    );

    expect(register).toContain(
      "'plots with another executable search action after the first failed dig',",
    );
    expect(register).toContain("'plots with a genuine failed dig',");

    const index = readFileSync(
      resolve(REPO, 'src/measurement/features/index.ts'),
      'utf8',
    );

    expect(index).toContain("import './m23';");
    expect([...M23_EVENT_SUFFIXES]).toEqual([
      'approach_ended',
      'search_region_entered',
      'presented',
      'opportunity_opened',
      'example_viewed',
      'closure_explanation_presented',
      'plot_opened',
      'surface_opened',
      'surface_closed',
      'help_opened',
      'help_closed',
      'action_started',
      'action_cancelled',
      'scan_resolved',
      'dig_resolved',
      'action_refused',
      'failure_choice_presented',
      'failure_choice',
      'stop_requested',
      'stop_cancelled',
      'plot_closed',
      'paused',
      'resumed',
      'reload_blocked',
      'invalidated',
      'technical_failure',
      'window_closed',
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * 4. M23 pure — the model
 * ------------------------------------------------------------------ */

test.describe('M23 pure: round 3 (Unit 23)', () => {
  test('OD-2 / OD-3 / OD-8b oracle: the example heading box {24, 48, 672, 40}; the figure and cell sub-boxes (12 px apart) and the beacon 133.33 design px from the figure; the glyphs are glyphs, not copy; the tray plate under the dig plate', () => {
    expect(M23_MODAL.example_heading).toEqual({ x: 24, y: 48, w: 672, h: 40 });
    expect(M23_MODAL.example_body).toEqual({ x: 24, y: 96, w: 672, h: 100 });
    expect(M23_MODAL.illustration_figure_left).toEqual({
      x: 24,
      y: 212,
      w: 72,
      h: 116,
    });
    expect(M23_MODAL.illustration_cell_left).toEqual({
      x: 108,
      y: 212,
      w: 240,
      h: 116,
    });
    expect(M23_MODAL.illustration_figure_right).toEqual({
      x: 372,
      y: 212,
      w: 72,
      h: 116,
    });
    expect(M23_MODAL.illustration_cell_right).toEqual({
      x: 456,
      y: 212,
      w: 240,
      h: 116,
    });
    expect(M23_MODAL.illustration_beacon).toEqual({
      x: 157.33,
      y: 212,
      w: 72,
      h: 116,
    });

    for (const side of ['left', 'right'] as const) {
      const figure = M23_MODAL[`illustration_figure_${side}`];
      const cell = M23_MODAL[`illustration_cell_${side}`];

      expect(cell.x - (figure.x + figure.w)).toBe(12);
      expect(cell.x + cell.w).toBe(M23_MODAL[`illustration_${side}`].x + 324);
    }

    // 80 world px at the field's zoom 2 over the 1.2 design scale.
    expect(
      M23_MODAL.illustration_beacon.x - M23_MODAL.illustration_figure_left.x,
    ).toBeCloseTo((80 * 2) / 1.2, 1);
    expect(M23_MODAL.text_figure_px).toBe(40);
    expect(M23_MODAL.text_illustration_px).toBe(20);
    expect(M23_FIGURE_GLYPH).toBe('☻▸');
    expect(M23_BEACON_GLYPH).toBe('◉');
    // Glyphs are not participant copy: the audited strings are unchanged.
    expect(m23ParticipantStrings()).not.toContain(M23_FIGURE_GLYPH);
    expect(m23ParticipantStrings()).not.toContain(M23_BEACON_GLYPH);

    expect(M23_HUD.tray).toEqual({ x: -126.6667, y: 436, w: 250, h: 88 });
    expect(M23_HUD.tray.y).toBeGreaterThan(M23_HUD.dig.y + M23_HUD.dig.h);
    expect(M23_HUD.tray.x).toBe(M23_HUD.dig.x);
    // Above the belt (native y 669.6 → design 558) and left of the plot's
    // projection (design x 213.33 at both viewports).
    expect(M23_HUD.tray.y + M23_HUD.tray.h).toBeLessThan(669.6 / 1.2);
    expect(M23_HUD.tray.x + M23_HUD.tray.w).toBeLessThan(213);
  });

  test('OD-6 oracle: the joint assignment equals the independent re-implementation; on 10 000 synthetic ids every one of the sixteen cells is reached with 5–7.5 % each (a property of the hash on those ids, not a claim about any recruited sample); every cell has a fixture session id; the scheme name rides the entry snapshot', () => {
    const counts = new Map<string, number>();
    const n = 10_000;

    for (let i = 0; i < n; i += 1) {
      const id = `session-${randomUUID()}`;
      const production = m23JointAssignment(id);

      expect(production).toEqual(jointAssignmentOracle(id));

      const key = jointCellKey(production);

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    expect(counts.size).toBe(16);

    for (const [cell, count] of counts) {
      expect(count / n, cell).toBeGreaterThanOrEqual(0.05);
      expect(count / n, cell).toBeLessThanOrEqual(0.075);
    }

    for (const plotA of ['a1', 'a2'] as const) {
      for (const plotB of ['b1', 'b2'] as const) {
        for (const order of ['AB', 'BA'] as const) {
          for (const option of ['continue_left', 'stop_left'] as const) {
            const wanted: M23Assignment = {
              plot_a_form: plotA,
              plot_b_form: plotB,
              plot_order: order,
              failure_option_order: option,
            };
            const id = sessionIdFor('cells', wanted);

            expect(m23JointAssignment(id)).toEqual(wanted);
          }
        }
      }
    }

    expect(M23_ASSIGNMENT_SCHEME).toBe('m23_joint16_fnv1a_fmix32_v1');

    const kit = makeKit();

    openKit(kit);

    const opened = kit.events.find((event) =>
      event.event_type.endsWith('opportunity_opened'),
    );
    const snapshot = opened?.metadata?.entry_state_snapshot as {
      assignment_scheme?: string;
      assigned_plot_order?: string;
    };

    expect(snapshot.assignment_scheme).toBe(M23_ASSIGNMENT_SCHEME);
    expect(snapshot.assigned_plot_order).toBe(kit.s.assignment.plot_order);
  });

  test('round-3 source: the RoomScene hook is default-off and consulted once in the station branch; the yard suppresses only its own stake while it owns a fixed frame; the field governs the exact ring; the controls line splits before "P / PANEL" and the parts rejoin verbatim; the adapter no longer uses the shared slot helper', () => {
    const room = readFileSync(resolve(REPO, 'src/world/RoomScene.ts'), 'utf8');

    expect(room).toMatch(
      /protected stationPromptSuppressed\(station: RoomStationConfig\): boolean \{\r?\n\s*void station;\r?\n\r?\n\s*return false;\r?\n\s*\}/,
    );
    expect(room.match(/stationPromptSuppressed\(/g)).toHaveLength(2);
    expect(room).toContain(
      "this.activeTarget.kind === 'station' &&\r\n      this.stationPromptSuppressed(this.activeTarget.station!)".replace(
        /\r\n/g,
        room.includes('\r\n') ? '\r\n' : '\n',
      ),
    );
    expect(room.match(/\.setVisible\(!suppressed\)/g)).toHaveLength(1);

    const scene = readFileSync(
      resolve(REPO, 'src/scenes/ExteriorRecoveryYardScene.ts'),
      'utf8',
    );

    expect(scene).toContain(
      "station.interactionKey === 'pilotPlotStake' && this.m23FixedPlot !== null",
    );
    expect(scene).toContain("full.indexOf(' P / PANEL')");
    expect(scene).toContain('const M23_GUIDANCE_PART_MS = 4000;');
    expect(scene).not.toContain('m23ApproachSince');

    const [part1, part2] = controlsParts(HAND.text.field_controls);

    expect(`${part1} ${part2}`).toBe(HAND.text.field_controls);
    expect(part1.endsWith('dig the highlighted cell.')).toBe(true);
    expect(part2.startsWith('P / PANEL')).toBe(true);

    const adapter = readFileSync(
      resolve(REPO, 'src/pilot/windows/m23Plots.ts'),
      'utf8',
    );

    expect(adapter).toContain('host.regionPlots(x, y).length > 0');
    expect(adapter).toContain('createM23Series(m23JointAssignment(sessionId))');
    expect(adapter).not.toContain('assignCounterbalance');
    expect(adapter).not.toContain('M23_SLOTS');

    const validity = readFileSync(
      resolve(REPO, 'src/measurement/validity.ts'),
      'utf8',
    );

    // The shared helper is untouched (its char-code hash, verbatim).
    expect(validity).toContain('hash = (hash * 31 + input.charCodeAt(i)) | 0;');
  });
});

test.describe('M23 pure: round 4 (Unit 23)', () => {
  test('the region association (OD-4, host level): one region → that plot, both → null (governed, no plot), none → undefined (not governed); the adapter uses it', () => {
    expect(m23RegionAssociation(['plot_a'])).toBe('plot_a');
    expect(m23RegionAssociation(['plot_b'])).toBe('plot_b');
    expect(m23RegionAssociation(['plot_a', 'plot_b'])).toBeNull();
    expect(m23RegionAssociation([])).toBeUndefined();

    const adapter = readFileSync(
      resolve(REPO, 'src/pilot/windows/m23Plots.ts'),
      'utf8',
    );

    expect(adapter).toContain('regionPlot: m23RegionAssociation(regions)');
    // The overlap band, hand-written: x 1088–1114, y 252–255 are members of
    // BOTH regions and inside neither rectangle.
    for (const [x, y] of [
      [1088, 252],
      [1100, 253],
      [1114, 255],
    ] as const) {
      expect(handMember('plot_a', x, y)).toBe(true);
      expect(handMember('plot_b', x, y)).toBe(true);
      expect(m23RegionMember('plot_a', x, y, fits).member).toBe(true);
      expect(m23RegionMember('plot_b', x, y, fits).member).toBe(true);
    }
  });

  test('the HUD rows avoid the foreign prompt band and the plates sit below its layer: the mast prompt projects to design y 164.7–188.7 from above the mast and 351.3–375.3 from below; the scanner rows end at 162.3, the dig rows at 347.3; the tray plate is clear of both', () => {
    const scroll = M23.scroll.plot_a;
    const mast = YARD_SITES.mast;
    const design = (worldY: number) => ((worldY - scroll.y) * 2) / 1.2;
    const bandAbove = {
      top: design(mast.y - 56) - 12,
      bottom: design(mast.y - 56) + 12,
    };
    const bandBelow = {
      top: design(mast.y + 56) - 12,
      bottom: design(mast.y + 56) + 12,
    };
    const rowPitch = 24;
    const scannerRowsEnd = M23_HUD.scanner.y + 8 + 3 * rowPitch - 2;
    const digRowsEnd = M23_HUD.dig.y + 8 + 4 * rowPitch - 2;

    expect(bandAbove.top).toBeCloseTo(164.67, 1);
    expect(bandBelow.top).toBeCloseTo(351.33, 1);
    expect(M23_HUD.scanner.y).toBeCloseTo(84.3333, 3);
    expect(M23_HUD.dig.y).toBeCloseTo(245.3333, 3);
    expect(scannerRowsEnd).toBeLessThan(bandAbove.top);
    expect(M23_HUD.scanner.y + M23_HUD.scanner.h).toBeGreaterThan(
      bandAbove.bottom,
    );
    expect(digRowsEnd).toBeLessThan(bandBelow.top);
    expect(M23_HUD.dig.y + M23_HUD.dig.h).toBeGreaterThan(bandBelow.bottom);
    expect(M23_HUD.tray.y).toBeGreaterThan(bandBelow.bottom);
    expect(M23_HUD.tray.y).toBeGreaterThan(M23_HUD.dig.y + M23_HUD.dig.h);
    // Clear of the mission card (design y ≤ about 61 in every frame) and of
    // the feedback line (x ≥ 132): the scanner plate ends at x 123.3.
    expect(M23_HUD.scanner.y).toBeGreaterThan(70);
    expect(M23_HUD.scanner.x + M23_HUD.scanner.w).toBeLessThan(132);

    const controls = readFileSync(
      resolve(REPO, 'src/pilot/ui/M23FieldControls.ts'),
      'utf8',
    );

    expect(controls).toContain('const HUD_PLATE_DEPTH = Depth.AboveWorld - 2;');
    expect(controls).toContain('const HUD_TEXT_DEPTH = Depth.AboveWorld - 1;');
    expect(controls.match(/setDepth\(HUD_PLATE_DEPTH\)/g)).toHaveLength(2);
    expect(controls.match(/setDepth\(HUD_TEXT_DEPTH\)/g)).toHaveLength(2);
    expect(controls).toContain('.setDepth(Depth.AboveWorld + 2)');
    expect(controls).not.toContain('.setDepth(Depth.AboveWorld)');
  });
});

test.describe('M23 pure: the model (Unit 23)', () => {
  test('OPEN: the brief and both pages precede the first usable selector; the measured opening happens once and addresses guidance; HELP replays without a second opening', () => {
    const kit = makeKit();

    expect(kit.s.status).toBe('unopened');
    openKit(kit);
    expect(kit.s.opened).toBe(true);
    expect(kit.s.guidance_addressed).toBe(true);
    expect(kit.s.closure_explanations).toBe(1);
    expect(kit.s.example_views).toEqual({ page_1: 1, page_2: 1 });
    expect(m23sSelectorShown(kit.s, kit.now())).toBe('again');
    m23sHelpOpened(kit.s, 'selector', kit.now(), 'keyboard', kit.sink);
    expect(kit.s.example_views.page_1).toBe(2);
    expect(m23sHelpClosed(kit.s, kit.now(), 'keyboard', kit.sink)).toBe(
      'selector',
    );
    expect(
      kit.events.filter((e) => e.event_type.endsWith('opportunity_opened')),
    ).toHaveLength(1);
    expect(
      kit.events.filter((e) => e.event_type.endsWith('help_opened')),
    ).toHaveLength(1);
  });

  test('every literal key recovers on its first dig; every other cell is empty; the 42 cells are reached by exhaustive new-cell digging; a duplicate is refused, never a failure (both plots, both forms)', () => {
    for (const assignment of [
      ASSIGN,
      { ...ASSIGN, plot_a_form: 'a2' as const, plot_b_form: 'b2' as const },
    ]) {
      for (const plotId of ['plot_a', 'plot_b'] as const) {
        const kit = makeKit(assignment);

        openKit(kit);
        expect(enter(kit, plotId).kind).toBe('searching');

        const plot = m23PlotOf(kit.s, plotId);
        const key = HAND.keys[plot.form];
        let digs = 0;
        let recovered = false;

        for (
          let row = plot.def.bounds.minRow;
          row <= plot.def.bounds.maxRow;
          row += 1
        ) {
          for (
            let col = plot.def.bounds.minCol;
            col <= plot.def.bounds.maxCol;
            col += 1
          ) {
            if (recovered) {
              break;
            }

            const cell = { col, row };
            const admission = m23Admit(kit.s, 'dig', {
              member: member(plotId, INSIDE[plotId]),
              cell,
              busy: false,
              cooling: false,
              insidePlot: plotId,
            });

            expect(admission.admitted).toBe(true);

            const outcome = dig(kit, cell, INSIDE[plotId]);

            digs += 1;

            if (cell.col === key.col && cell.row === key.row) {
              expect(outcome.outcome).toBe('recovered');
              recovered = true;
            } else {
              expect(outcome.outcome).toBe('empty');
              // The first empty dig only is the genuine failure.
              expect(outcome.first_failure).toBe(digs === 1);
              // A served choice: CONTINUE to keep digging (the test's path).
              if (digs === 1) {
                present(kit, plotId);
                expect(cont(kit, plotId).kind).toBe('searching');
              }
            }
          }
        }

        expect(recovered).toBe(true);
        expect(digs).toBeLessThanOrEqual(42);
        expect(plot.status).toBe('recovered');
        expect(plot.tray).toBe(true);
        // A dug cell cannot be dug again on a terminal plot; on a live plot a
        // duplicate is `already_dug`.
        const fresh = makeKit(assignment);

        openKit(fresh);
        enter(fresh, plotId);
        dig(fresh, EMPTY[plotId], INSIDE[plotId]);
        present(fresh, plotId);
        cont(fresh, plotId);
        expect(
          m23Admit(fresh.s, 'dig', {
            member: member(plotId, INSIDE[plotId]),
            cell: EMPTY[plotId],
            busy: false,
            cooling: false,
            insidePlot: plotId,
          }).reason,
        ).toBe('already_dug');
        expect(m23PlotOf(fresh.s, plotId).first_failure?.cell).toEqual(
          EMPTY[plotId],
        );
      }
    }
  });

  test('P01–P04, P06: opening inside is searching at once with a zero approach; opening outside approaches with ordinary follow and refuses both actions (outside_scan_region); the first body-valid entry engages searching; leaving pauses once and walking back never resumes; RESUME re-evaluates', () => {
    const kit = makeKit();

    openKit(kit);

    // P02 / P04: open A from the registry approach → approaching.
    const outcome = enter(kit, 'plot_a', OUTSIDE);

    expect(outcome.kind).toBe('approaching');
    expect(kit.s.plots[0].status).toBe('approaching');

    for (const kind of ['scan', 'dig'] as const) {
      const admission = m23Admit(kit.s, kind, {
        member: member('plot_a', OUTSIDE),
        cell: { col: 30, row: 10 },
        busy: false,
        cooling: false,
        insidePlot: null,
      });

      expect(admission.reason).toBe('outside_scan_region');
      m23sRefuse(
        kit.s,
        kind,
        'outside_scan_region',
        admission.plot,
        { ...OUTSIDE, cell: null },
        'keyboard',
        kit.sink,
      );
    }

    expect(
      kit.events.filter((e) => e.event_type.endsWith('action_refused')),
    ).toHaveLength(2);
    expect(kit.events.some((e) => e.event_type.endsWith('scan_resolved'))).toBe(
      false,
    );

    // The walk: samples, then the entry at the nominal stance (24 px from the stake).
    m23sApproachSample(kit.s, 1116, 480, kit.now());
    m23sApproachSample(kit.s, 1100, 472, kit.now());
    expect(
      m23sEnterRegion(
        kit.s,
        ENTRY.plot_a.x,
        ENTRY.plot_a.y,
        'boundary_stance',
        kit.now(),
        kit.sink,
      ),
    ).toBe(true);
    expect(kit.s.plots[0].status).toBe('searching');

    const entered = kit.events.find((e) =>
      e.event_type.endsWith('search_region_entered'),
    )!;

    expect(entered.metadata?.first_plot_region_entry).toBe(true);
    expect(entered.metadata?.movement_sample_count).toBe(4);
    expect(entered.metadata?.path_complete).toBe(true);
    expect(entered.metadata?.direct_displacement_px).toBeCloseTo(50.12, 2);

    // P06: leaving the region pauses once; walking back does not resume.
    expect(m23sRegionExit(kit.s, kit.now(), kit.sink)).toBe(true);
    expect(kit.s.plots[0].status).toBe('paused');
    expect(m23sRegionExit(kit.s, kit.now(), kit.sink)).toBe(false);
    expect(
      m23sEnterRegion(kit.s, 976, 364, 'interior', kit.now(), kit.sink),
    ).toBe(false);
    expect(kit.s.plots[0].status).toBe('paused');
    // RESUME outside → a new approach segment; RESUME inside → searching.
    expect(enter(kit, 'plot_a', OUTSIDE).kind).toBe('approaching');
    expect(kit.s.plots[0].resume_count).toBe(1);
    expect(m23sPause(kit.s, 'panel', kit.now(), kit.sink, 'keyboard')).toBe(
      true,
    );
    expect(enter(kit, 'plot_a', INSIDE.plot_a).kind).toBe('searching');
    expect(
      kit.events.filter((e) => e.event_type.endsWith('plot_opened')),
    ).toHaveLength(1);
    expect(
      kit.events.filter((e) => e.event_type.endsWith('resumed')),
    ).toHaveLength(2);
    expect(
      kit.events.filter((e) => e.event_type.endsWith('approach_ended')),
    ).toHaveLength(1);

    // P01-adjusted: an inside opening has zero displacement and path.
    const inside = makeKit();

    openKit(inside);
    expect(enter(inside, 'plot_b', INSIDE.plot_b).kind).toBe('searching');

    const zero = inside.events.find((e) =>
      e.event_type.endsWith('search_region_entered'),
    )!;

    expect(zero.metadata?.direct_displacement_px).toBe(0);
    expect(zero.metadata?.travelled_path_length_px).toBe(0);
    expect(zero.metadata?.start_inside_region).toBe(true);
  });

  test('P05, P07, P08, P10: the other-plot origin is refused until that plot is selected; crossing the shared border pauses the active plot without a switch; the overlap associates with the selected plot only; a discontinuous approach has a null path', () => {
    const kit = makeKit();

    openKit(kit);
    // P05: open A from inside B → approaching (B's interior is not A's region).
    expect(enter(kit, 'plot_a', INSIDE.plot_b).kind).toBe('approaching');
    // P07: once searching at (1072, 348), crossing to x 1088 (inside B) pauses A.
    m23sEnterRegion(kit.s, 1072, 348, 'interior', kit.now(), kit.sink);
    expect(kit.s.plots[0].status).toBe('searching');
    expect(member('plot_a', { x: 1088, y: 348 }).member).toBe(false);
    expect(m23sRegionExit(kit.s, kit.now(), kit.sink)).toBe(true);
    expect(kit.s.plots[0].status).toBe('paused');
    expect(kit.s.selected).toBe('plot_a');
    expect(kit.s.plots[1].status).toBe('not_started');
    // P08: the overlap sample scans for the selected plot only.
    expect(enter(kit, 'plot_b', { x: 1080, y: 255 }).kind).toBe('searching');
    expect(kit.s.plots[0].status).toBe('paused');

    const reading = scan(kit, { x: 1080, y: 255 });

    expect(reading.qualifying).toBe(true);
    expect(kit.s.plots[1].scans).toHaveLength(1);
    expect(kit.s.plots[0].scans).toHaveLength(0);
    // P10: samples along the approach; a jump makes the path incomplete.
    const walk = makeKit();

    openKit(walk);
    enter(walk, 'plot_a', { x: 1116, y: 488 });
    m23sApproachSample(walk.s, 1116, 496, walk.now());
    m23sApproachSample(walk.s, 1100, 496, walk.now());
    m23sApproachSample(walk.s, 1100, 480, walk.now());
    m23sPause(walk.s, 'panel', walk.now(), walk.sink, 'keyboard');

    const ended = walk.events.find((e) =>
      e.event_type.endsWith('approach_ended'),
    )!;

    expect(ended.metadata?.direct_displacement_px).toBeCloseTo(
      Math.sqrt(320),
      3,
    );
    expect(ended.metadata?.travelled_path_length_px).toBe(40);
    expect(ended.metadata?.first_entry_at_ms).toBeNull();
    enter(walk, 'plot_a', { x: 1116, y: 488 });
    m23sApproachSample(walk.s, 900, 300, walk.now());
    m23sPause(walk.s, 'panel', walk.now(), walk.sink, 'keyboard');

    const jumped = walk.events.filter((e) =>
      e.event_type.endsWith('approach_ended'),
    )[1];

    expect(jumped.metadata?.path_complete).toBe(false);
    expect(jumped.metadata?.travelled_path_length_px).toBeNull();
  });

  test('admission precedence (F5 / M2): unselected inside a plot → plot_not_active; terminal → plot_terminal; pending choice → choice_pending; outside region → outside_scan_region; outside plot → outside_plot; duplicate → already_dug; busy; cooldown; every refusal leaves the evidence untouched', () => {
    const kit = makeKit();

    openKit(kit);
    expect(
      m23Admit(kit.s, 'scan', {
        member: { member: false, stance: null },
        cell: null,
        busy: false,
        cooling: false,
        insidePlot: 'plot_a',
      }).reason,
    ).toBe('plot_not_active');
    expect(
      m23Admit(kit.s, 'scan', {
        member: { member: false, stance: null },
        cell: null,
        busy: false,
        cooling: false,
        insidePlot: null,
      }),
    ).toEqual({ admitted: false, reason: null, plot: null });
    enter(kit, 'plot_a');
    expect(
      m23Admit(kit.s, 'scan', {
        member: member('plot_a', INSIDE.plot_a),
        cell: null,
        busy: true,
        cooling: false,
        insidePlot: 'plot_a',
      }).reason,
    ).toBe('action_busy');
    expect(
      m23Admit(kit.s, 'scan', {
        member: member('plot_a', INSIDE.plot_a),
        cell: null,
        busy: false,
        cooling: true,
        insidePlot: 'plot_a',
      }).reason,
    ).toBe('cooldown');
    expect(
      m23Admit(kit.s, 'dig', {
        member: member('plot_a', INSIDE.plot_a),
        cell: { col: 35, row: 9 },
        busy: false,
        cooling: false,
        insidePlot: 'plot_a',
      }).reason,
    ).toBe('outside_plot');
    expect(
      m23Admit(kit.s, 'scan', {
        member: member('plot_a', OUTSIDE),
        cell: null,
        busy: false,
        cooling: false,
        insidePlot: null,
      }).reason,
    ).toBe('outside_scan_region');
    fail(kit, 'plot_a');
    expect(
      m23Admit(kit.s, 'scan', {
        member: member('plot_a', INSIDE.plot_a),
        cell: null,
        busy: false,
        cooling: false,
        insidePlot: 'plot_a',
      }).reason,
    ).toBe('choice_pending');
    present(kit, 'plot_a');
    stopDirect(kit, 'plot_a');
    expect(kit.s.selected).toBeNull();
    expect(
      m23Admit(kit.s, 'dig', {
        member: { member: true, stance: 'interior' },
        cell: { col: 30, row: 10 },
        busy: false,
        cooling: false,
        insidePlot: 'plot_a',
      }).reason,
    ).toBe('plot_terminal');

    const before = kit.events.length;

    m23sRefuse(
      kit.s,
      'dig',
      'plot_terminal',
      kit.s.plots[0],
      { x: 976, y: 364, cell: { col: 30, row: 10 } },
      'keyboard',
      kit.sink,
    );
    expect(kit.events).toHaveLength(before + 1);
    expect(kit.events[before].metadata?.reason).toBe('plot_terminal');
    expect(kit.s.plots[0].first_failure?.cell).toEqual(EMPTY.plot_a);
    expect(kit.s.plots[0].response?.response).toBe('stop');
  });

  test('round 3 (OD-4): the boundary ring is governed like the rectangle in every non-live status — none selected (the ring plot is associated; the overlap band with neither), paused, choice_pending, terminal, closed, held back; approaching and searching unchanged; a pointer refusal records pointer; no refusal starts, resolves, credits or resumes', () => {
    const ring = (plot: M23PlotId | null) => ({
      member: { member: false, stance: null },
      cell: null,
      busy: false,
      cooling: false,
      insidePlot: null,
      regionPlot: plot,
    });

    // None selected, before the opening: the ring plot is associated.
    const kit = makeKit();

    expect(m23Admit(kit.s, 'scan', ring('plot_a'))).toMatchObject({
      admitted: false,
      reason: 'plot_not_active',
    });
    expect(m23Admit(kit.s, 'dig', ring('plot_b')).plot?.id).toBe('plot_b');
    // The overlap band on the shared border: refused, associated with
    // neither plot.
    expect(m23Admit(kit.s, 'scan', ring(null))).toEqual({
      admitted: false,
      reason: 'plot_not_active',
      plot: null,
    });
    // Outside both regions with nothing selected: not governed (the
    // adapter never asks); the admission stays the ungoverned null.
    expect(
      m23Admit(kit.s, 'scan', { ...ring(null), regionPlot: undefined }),
    ).toEqual({ admitted: false, reason: null, plot: null });

    openKit(kit);
    // Approaching (opened outside): the ring still refuses outside_scan_region.
    enter(kit, 'plot_a', OUTSIDE);
    expect(m23Admit(kit.s, 'scan', ring('plot_a')).reason).toBe(
      'outside_scan_region',
    );
    // Searching from the boundary stance: admitted (unchanged, C).
    expect(
      m23sEnterRegion(
        kit.s,
        ENTRY.plot_a.x,
        ENTRY.plot_a.y,
        'boundary_stance',
        kit.now(),
        kit.sink,
      ),
    ).toBe(true);
    expect(
      m23Admit(kit.s, 'scan', {
        ...ring('plot_a'),
        member: member('plot_a', ENTRY.plot_a),
      }).admitted,
    ).toBe(true);
    // Searching, in the OTHER plot's ring only: outside_scan_region (unchanged).
    expect(
      m23Admit(kit.s, 'scan', {
        ...ring('plot_b'),
        member: member('plot_a', ENTRY.plot_b),
      }).reason,
    ).toBe('outside_scan_region');
    // Paused by the region exit, back in the ring: plot_not_active, A.
    expect(m23sRegionExit(kit.s, kit.now(), kit.sink)).toBe(true);
    expect(kit.s.plots[0].status).toBe('paused');

    const paused = m23Admit(kit.s, 'scan', ring('plot_a'));

    expect(paused.reason).toBe('plot_not_active');
    expect(paused.plot?.id).toBe('plot_a');
    expect(m23Admit(kit.s, 'dig', ring('plot_b')).plot?.id).toBe('plot_a');
    expect(kit.s.plots[0].status).toBe('paused');
    // The pending choice: choice_pending, S.
    enter(kit, 'plot_a');
    fail(kit, 'plot_a');
    expect(m23Admit(kit.s, 'scan', ring('plot_a')).reason).toBe(
      'choice_pending',
    );
    expect(m23Admit(kit.s, 'dig', ring('plot_b')).reason).toBe(
      'choice_pending',
    );
    // Terminal A with nothing selected: A's ring → plot_terminal (A); B's
    // ring → plot_not_active (B, not started).
    present(kit, 'plot_a');
    stopDirect(kit, 'plot_a');
    expect(kit.s.selected).toBeNull();
    expect(m23Admit(kit.s, 'scan', ring('plot_a'))).toMatchObject({
      reason: 'plot_terminal',
    });
    expect(m23Admit(kit.s, 'scan', ring('plot_b'))).toMatchObject({
      reason: 'plot_not_active',
    });
    expect(m23Admit(kit.s, 'scan', ring('plot_b')).plot?.id).toBe('plot_b');

    // A pointer refusal records pointer and leaves everything else as it is.
    const before = kit.events.length;
    const failureBefore = kit.s.plots[0].first_failure;

    m23sRefuse(
      kit.s,
      'scan',
      'plot_terminal',
      kit.s.plots[0],
      { x: ENTRY.plot_a.x, y: ENTRY.plot_a.y, cell: null },
      'pointer',
      kit.sink,
    );
    expect(kit.events).toHaveLength(before + 1);
    expect(kit.events[before].metadata).toMatchObject({
      input_mode: 'pointer',
      reason: 'plot_terminal',
      attempted_kind: 'scan',
      plot_id: 'plot_a',
      attempted_x: ENTRY.plot_a.x,
    });
    expect(kit.s.plots[0].first_failure).toBe(failureBefore);
    expect(kit.s.plots[0].response?.response).toBe('stop');
    expect(
      kit.events.filter((event) =>
        /action_started|scan_resolved|dig_resolved|resumed|search_region_entered$/.test(
          event.event_type,
        ),
      ).length,
    ).toBe(
      kit.events
        .slice(0, before)
        .filter((event) =>
          /action_started|scan_resolved|dig_resolved|resumed|search_region_entered$/.test(
            event.event_type,
          ),
        ).length,
    );

    // The closed series (both terminal): every ring → plot_terminal.
    preStop(kit, 'plot_b');
    expect(kit.s.status).toBe('closed');
    expect(m23Admit(kit.s, 'dig', ring('plot_b')).reason).toBe('plot_terminal');

    // Held back after a reload: the ring refuses plot_not_active.
    const held = makeKit();

    held.s.status = 'held_back';
    expect(m23Admit(held.s, 'scan', ring('plot_a'))).toMatchObject({
      reason: 'plot_not_active',
    });
  });

  test('D1 / K-fixtures: the first-failure options keep their assigned sides across both plots; the sides are visual positions, the focus order is neutral, right, HELP, STEP AWAY, left; one fresh activation commits; direct STOP writes the response and the closure together; neutral and a refused settle commit nothing', () => {
    for (const order of ['continue_left', 'stop_left'] as const) {
      const kit = makeKit({ ...ASSIGN, failure_option_order: order });
      const sides = m23FailureSides(kit.s);

      expect(sides).toEqual(
        order === 'continue_left'
          ? { left: 'continue', right: 'stop' }
          : { left: 'stop', right: 'continue' },
      );
      openKit(kit);

      for (const plotId of ['plot_a', 'plot_b'] as const) {
        expect(enter(kit, plotId).kind).toBe('searching');
        fail(kit, plotId);
        m23sSurfaceOpened(kit.s, 'first_failure', kit.now(), kit.sink);
        present(kit, plotId, `e_${plotId}`);

        const host: M23SurfaceHost = {
          now: kit.now,
          series: () => kit.s,
          focusEpoch: () => `e_${plotId}`,
          commands: {
            showExample: () => undefined,
            backToBrief: () => undefined,
            openSelector: () => undefined,
            help: () => undefined,
            closeHelp: () => undefined,
            stepAway: () => undefined,
            openPlot: () => undefined,
            requestStop: () => undefined,
            cancelStop: () => undefined,
            confirmStop: () => undefined,
            choose: () => undefined,
          },
        };
        const model = m23SurfaceModel(host);
        const focusables = model.elements.filter(
          (e) => e.onActivate !== undefined,
        );

        expect(focusables.map((e) => e.id)).toEqual([
          `ff_landing_e_${plotId}`,
          `ff_right_e_${plotId}`,
          `help_e_${plotId}`,
          `step_away_e_${plotId}`,
          `ff_left_e_${plotId}`,
        ]);

        const left = model.elements.find(
          (e) => e.id === `ff_left_e_${plotId}`,
        )!;
        const right = model.elements.find(
          (e) => e.id === `ff_right_e_${plotId}`,
        )!;

        expect(left.x).toBe(24);
        expect(right.x).toBe(372);
        expect(left.w).toBe(right.w);
        expect(left.h).toBe(right.h);
        expect(left.label).toBe(
          sides.left === 'continue' ? HAND.text.continue : HAND.text.stop,
        );
        expect(right.label).toBe(
          sides.right === 'continue' ? HAND.text.continue : HAND.text.stop,
        );
        expect(model.help).toBe('');
        expect(
          model.elements.find((e) => e.id === `guidance_e_${plotId}`)!.label,
        ).toBe(HAND.text.failure_guidance.join('\n'));
        // The neutral landing commits nothing.
        focusables[0].onActivate!('keyboard');
        expect(m23PlotOf(kit.s, plotId).response).toBeNull();
        // A press inside the settle commits nothing (refused, recorded nowhere).
        expect(
          m23sChoose(
            kit.s,
            plotId,
            'continue',
            'keyboard',
            kit.s.view_shown_at_ms! + 100,
            'left',
            kit.sink,
          ).kind,
        ).toBe('refused');
        // K01 / K02: one navigation token, then one fresh commit.
        m23sNavigationToken(
          kit.s,
          plotId === 'plot_a' ? 'Left' : 'Right',
          'arrow',
          plotId === 'plot_a' ? `ff_left_e_${plotId}` : `ff_right_e_${plotId}`,
        );
        kit.tick(HAND.scan_ms);

        const response = plotId === 'plot_a' ? sides.left : sides.right;
        const side = plotId === 'plot_a' ? 'left' : 'right';
        const outcome = m23sChoose(
          kit.s,
          plotId,
          response,
          'keyboard',
          kit.now(),
          side,
          kit.sink,
        );

        expect(outcome).toEqual({ kind: 'chosen', response, reason: null });

        const record = kit.events
          .filter((e) => e.event_type.endsWith('failure_choice'))
          .pop()!;

        expect(record.metadata?.response).toBe(response);
        expect(record.metadata?.chosen_visual_side).toBe(side);
        expect(record.metadata?.navigation_family).toBe('arrow');
        expect(record.metadata?.navigation_steps).toBe(1);
        expect(record.metadata?.navigation_tokens).toEqual([
          plotId === 'plot_a' ? 'Left' : 'Right',
        ]);
        expect(record.metadata?.option_order).toBe(order);

        if (response === 'stop') {
          expect(m23PlotOf(kit.s, plotId).status).toBe('stopped');
          expect(
            kit.events.some((e) => e.event_type.endsWith('stop_requested')),
          ).toBe(false);

          const closed = kit.events
            .filter((e) => e.event_type.endsWith('plot_closed'))
            .pop()!;

          expect(closed.metadata?.plot_closure_reason).toBe('explicit_stop');
          expect(closed.metadata?.source).toBe('first_failure_choice');
          expect(closed.metadata?.observed_continuation).toBe(false);
        } else {
          expect(m23PlotOf(kit.s, plotId).response?.response).toBe('continue');
        }

        m23sSurfaceClosed(kit.s, kit.now(), kit.sink, 'test');
        // The closed surface starts a settle: the next opening waits it out.
        kit.tick(500);
        if (m23PlotOf(kit.s, plotId).status !== 'stopped') {
          m23sPause(kit.s, 'panel', kit.now(), kit.sink, 'keyboard');
        }
      }
    }
  });

  test('K07: more than 32 accepted navigation tokens are truncated with the total kept; Tab and Shift+Tab are counted apart from the arrows', () => {
    const kit = makeKit();

    openKit(kit);
    enter(kit, 'plot_a');
    fail(kit, 'plot_a');
    present(kit, 'plot_a');

    for (let i = 0; i < 40; i += 1) {
      m23sNavigationToken(
        kit.s,
        i % 3 === 0 ? 'Tab' : i % 3 === 1 ? 'Shift+Tab' : 'Right',
        i % 3 === 0 ? 'tab' : i % 3 === 1 ? 'shift_tab' : 'arrow',
        null,
      );
    }

    kit.tick(HAND.scan_ms);
    m23sChoose(
      kit.s,
      'plot_a',
      'continue',
      'keyboard',
      kit.now(),
      'left',
      kit.sink,
    );

    const record = kit.events
      .filter((e) => e.event_type.endsWith('failure_choice'))
      .pop()!;

    expect(record.metadata?.navigation_tokens).toHaveLength(32);
    expect(record.metadata?.navigation_tokens_total).toBe(40);
    expect(record.metadata?.navigation_tokens_truncated).toBe(true);
    expect(record.metadata?.navigation_family).toBe('mixed');
    expect(record.metadata?.tab_count).toBe(14);
    expect(record.metadata?.shift_tab_count).toBe(13);
    expect(record.metadata?.arrow_count).toBe(13);
  });

  test('B01–B05: the selector STOP keeps its confirmation (request, BACK cancels, confirm closes); after CONTINUE the confirmation writes no second failure_choice; after ACT the known 1 is preserved; STEP AWAY and RESUME serve the same unanswered choice', () => {
    // B02 / B03
    const kit = makeKit();

    openKit(kit);
    enter(kit, 'plot_a');
    fail(kit, 'plot_a');
    present(kit, 'plot_a');
    cont(kit, 'plot_a');
    m23sPause(kit.s, 'panel', kit.now(), kit.sink, 'keyboard');
    m23sSurfaceOpened(kit.s, 'selector', kit.now(), kit.sink);
    m23sSelectorShown(kit.s, kit.now());
    kit.tick(500);
    expect(
      m23sRequestStop(kit.s, 'plot_a', 'keyboard', kit.now(), kit.sink),
    ).toBe(true);
    expect(kit.s.view).toBe('stop_confirm');
    expect(
      m23sCancelStop(kit.s, 'plot_a', 'keyboard', kit.now(), 'back', kit.sink),
    ).toBe(true);
    expect(kit.s.view).toBe('selector');
    expect(kit.s.plots[0].status).toBe('paused');
    expect(kit.s.plots[0].response?.response).toBe('continue');
    expect(
      kit.events.filter((e) => e.event_type.endsWith('stop_cancelled')),
    ).toHaveLength(1);
    kit.tick(500);
    expect(
      m23sRequestStop(kit.s, 'plot_a', 'keyboard', kit.now(), kit.sink),
    ).toBe(true);
    kit.tick(500);
    expect(
      m23sConfirmStop(kit.s, 'plot_a', 'keyboard', kit.now(), kit.sink),
    ).toBe(true);
    expect(kit.s.plots[0].status).toBe('stopped');
    expect(
      kit.events.filter((e) => e.event_type.endsWith('failure_choice')),
    ).toHaveLength(1);
    expect(m23ObservedContinuation(kit.s.plots[0])).toBe(false);

    const closed = kit.events
      .filter((e) => e.event_type.endsWith('plot_closed'))
      .pop()!;

    expect(closed.metadata?.confirmed_stop).toBe(true);
    expect(closed.metadata?.source).toBe('selector');
    expect(closed.metadata?.stop_request_id).toBe('m23_stop_2');

    // B04: a credited plot keeps its 1 through a later confirmed stop.
    const credited = makeKit();

    openKit(credited);
    enter(credited, 'plot_a');
    fail(credited, 'plot_a');
    present(credited, 'plot_a');
    cont(credited, 'plot_a');
    act(credited, 'plot_a');
    selStop(credited, 'plot_a');
    expect(m23ObservedContinuation(credited.s.plots[0])).toBe(true);
    expect(credited.s.plots[0].credit?.kind).toBe('scan');

    // B05: STEP AWAY (the surface closes) and RESUME: the same identity.
    const away = makeKit();

    openKit(away);
    enter(away, 'plot_a');
    fail(away, 'plot_a');
    m23sSurfaceOpened(away.s, 'first_failure', away.now(), away.sink);
    present(away, 'plot_a');
    m23sSurfaceClosed(away.s, away.now(), away.sink, 'esc');
    away.tick(500);
    expect(m23sPause(away.s, 'esc', away.now(), away.sink, 'keyboard')).toBe(
      false,
    );
    expect(away.s.plots[0].status).toBe('choice_pending');
    expect(m23SelectorStatus(away.s.plots[0])).toBe('Choose next step');
    expect(enter(away, 'plot_a', OUTSIDE).kind).toBe('choice_first');
    present(away, 'plot_a', 'e2');

    const presentations = away.events.filter((e) =>
      e.event_type.endsWith('failure_choice_presented'),
    );

    expect(presentations).toHaveLength(2);
    expect(presentations[1].metadata?.presentation_id).toBe(
      presentations[0].metadata?.presentation_id,
    );
    expect(presentations[1].metadata?.resume).toBe(true);
    expect(away.s.plots[0].first_failure?.action_id).toBe('m23_action_1');
    // P09: CONTINUE from the served choice evaluates the origin (outside → approaching).
    expect(cont(away, 'plot_a', OUTSIDE).kind).toBe('approaching');
  });

  test('D3 / C-fixtures: a start after CONTINUE cancelled by focus_loss is the diagnostic (no credit); waiting past the deadline completes nothing; a fresh scan is the known 1; a stop after the cancellation is 0 with the diagnostic kept; ESC is not a system cause; the same-tick race keeps one terminal transition', () => {
    const kit = makeKit();

    openKit(kit);
    enter(kit, 'plot_a');
    fail(kit, 'plot_a');
    present(kit, 'plot_a');
    cont(kit, 'plot_a');

    // C01: a scan started, blur at 500 ms.
    const token = m23sStartAction(
      kit.s,
      'scan',
      kit.now(),
      INSIDE.plot_a,
      'interior',
      null,
      'keyboard',
      kit.sink,
    )!;

    kit.tick(500);
    expect(m23sPause(kit.s, 'focus_loss', kit.now(), kit.sink, 'system')).toBe(
      true,
    );

    const cancelled = kit.events
      .filter((e) => e.event_type.endsWith('action_cancelled'))
      .pop()!;

    expect(cancelled.metadata?.elapsed_action_ms).toBe(500);
    expect(cancelled.metadata?.planned_duration_ms).toBe(1000);
    expect(cancelled.metadata?.continuation_started_then_system_cancelled).toBe(
      true,
    );
    expect(kit.s.plots[0].credit).toBeNull();
    expect(kit.s.plots[0].system_cancelled_after_continue).toEqual([token.id]);
    // C02: the stale completion after the original deadline is a no-op.
    kit.tick(600);
    expect(
      m23sResolveScan(
        kit.s,
        token.id,
        kit.now(),
        INSIDE.plot_a,
        member('plot_a', INSIDE.plot_a),
        kit.sink,
      ),
    ).toBeNull();
    expect(kit.s.stale_callbacks).toBe(1);
    expect(kit.s.plots[0].credit).toBeNull();
    // C03: a fresh id, a full scan → the known 1; the diagnostic remains.
    // (The plot was paused by the system cause: RESUME inside first.)
    expect(kit.s.plots[0].status).toBe('paused');
    expect(enter(kit, 'plot_a').kind).toBe('searching');
    act(kit, 'plot_a');
    expect(kit.s.plots[0].credit?.action_id).toBe('m23_action_3');
    expect(kit.s.plots[0].system_cancelled_after_continue).toEqual([token.id]);

    // C04: a stop directly after the cancellation → known 0, diagnostic kept.
    const stopKit = makeKit();

    openKit(stopKit);
    enter(stopKit, 'plot_a');
    fail(stopKit, 'plot_a');
    present(stopKit, 'plot_a');
    cont(stopKit, 'plot_a');
    m23sStartAction(
      stopKit.s,
      'dig',
      stopKit.now(),
      INSIDE.plot_a,
      'interior',
      { col: 30, row: 10 },
      'keyboard',
      stopKit.sink,
    );
    stopKit.tick(400);
    m23sPause(stopKit.s, 'hidden', stopKit.now(), stopKit.sink, 'system');
    selStop(stopKit, 'plot_a');
    expect(m23ObservedContinuation(stopKit.s.plots[0])).toBe(false);
    expect(stopKit.s.plots[0].system_cancelled_after_continue).toHaveLength(1);
    // C07: a dig cancelled before 1500 ms is no failure and no ground change.
    expect(stopKit.s.plots[0].dug).toHaveLength(1);

    // C10: ESC is the participant's cancellation, never system-cancelled.
    const esc = makeKit();

    openKit(esc);
    enter(esc, 'plot_a');
    fail(esc, 'plot_a');
    present(esc, 'plot_a');
    cont(esc, 'plot_a');
    m23sStartAction(
      esc.s,
      'scan',
      esc.now(),
      INSIDE.plot_a,
      'interior',
      null,
      'keyboard',
      esc.sink,
    );
    esc.tick(300);
    m23sCancelAction(esc.s, 'esc', esc.now(), esc.sink, 'keyboard');

    const escRecord = esc.events
      .filter((e) => e.event_type.endsWith('action_cancelled'))
      .pop()!;

    expect(escRecord.metadata?.continuation_started_then_system_cancelled).toBe(
      false,
    );
    expect(escRecord.metadata?.input_mode).toBe('keyboard');
    expect(esc.s.plots[0].system_cancelled_after_continue).toEqual([]);

    // C09: resolve then cancel in the same tick → one terminal transition.
    const race = makeKit();

    openKit(race);
    enter(race, 'plot_a');

    const t = m23sStartAction(
      race.s,
      'scan',
      race.now(),
      INSIDE.plot_a,
      'interior',
      null,
      'keyboard',
      race.sink,
    )!;

    race.tick(1000);
    expect(
      m23sResolveScan(
        race.s,
        t.id,
        race.now(),
        INSIDE.plot_a,
        member('plot_a', INSIDE.plot_a),
        race.sink,
      ),
    ).not.toBeNull();
    expect(
      m23sCancelAction(race.s, 'esc', race.now(), race.sink, 'keyboard'),
    ).toBe(false);
    expect(
      race.events.filter((e) => e.event_type.endsWith('action_cancelled')),
    ).toHaveLength(0);
    expect(
      race.events.filter((e) => e.event_type.endsWith('scan_resolved')),
    ).toHaveLength(1);
  });

  test('D2 / B06–B13, B18: an informed participant shift-end resolves an unanswered usable choice to 0; CONTINUE alone is not credit; a known 1 never downgrades; review keeps unknown; an unpresented choice stays unknown even at shift-end; no explanation or no participant source → unknown; ordinary departure only pauses; repeated closures are idempotent', () => {
    // B06
    const b06 = makeKit();

    openKit(b06);
    enter(b06, 'plot_a');
    fail(b06, 'plot_a');
    present(b06, 'plot_a');
    m23sPause(b06.s, 'panel', b06.now(), b06.sink, 'keyboard');
    shift(b06);
    expect(b06.s.plots[0].status).toBe('closed_shift_end');
    expect(m23ObservedContinuation(b06.s.plots[0])).toBe(false);
    expect(
      b06.events.filter((e) => e.event_type.endsWith('failure_choice')),
    ).toHaveLength(0);
    expect(b06.s.closure?.trigger).toBe('shift_end');
    // B07
    const b07 = makeKit();

    openKit(b07);
    enter(b07, 'plot_a');
    fail(b07, 'plot_a');
    present(b07, 'plot_a');
    cont(b07, 'plot_a');
    shift(b07);
    expect(m23ObservedContinuation(b07.s.plots[0])).toBe(false);
    // B08
    const b08 = makeKit();

    openKit(b08);
    enter(b08, 'plot_a');
    fail(b08, 'plot_a');
    present(b08, 'plot_a');
    cont(b08, 'plot_a');
    act(b08, 'plot_a');
    shift(b08);
    expect(m23ObservedContinuation(b08.s.plots[0])).toBe(true);
    // B09
    const b09 = makeKit();

    openKit(b09);
    enter(b09, 'plot_a');
    fail(b09, 'plot_a');
    present(b09, 'plot_a');
    review(b09);
    expect(b09.s.plots[0].status).toBe('closed_review');
    expect(m23ObservedContinuation(b09.s.plots[0])).toBeNull();
    // B10: F without V, then the shift-end → unknown.
    const b10 = makeKit();

    openKit(b10);
    enter(b10, 'plot_a');
    fail(b10, 'plot_a');
    shift(b10);
    expect(m23ObservedContinuation(b10.s.plots[0])).toBeNull();
    expect(b10.s.plots[0].presentation?.unpresented).toBe(true);
    // B11: no recorded explanation exposure → unknown.
    const b11 = makeKit();

    b11.s.status = 'presented';
    m23sSurfaceOpened(b11.s, 'brief', b11.now(), b11.sink);
    m23sBriefShown(b11.s, b11.now(), false, b11.sink);
    m23sExampleViewed(b11.s, 1, b11.now(), b11.sink, 'keyboard');
    m23sExampleViewed(b11.s, 2, b11.now(), b11.sink, 'keyboard');
    m23sSelectorShown(b11.s, b11.now());
    b11.kitLog('opportunity_opened', {
      entry_state_snapshot: {},
      input_mode: 'system',
    });
    b11.tick(500);
    enter(b11, 'plot_a');
    fail(b11, 'plot_a');
    present(b11, 'plot_a');
    shift(b11);
    expect(b11.s.closure_explanations).toBe(0);
    expect(m23ObservedContinuation(b11.s.plots[0])).toBeNull();
    // B12: a system-labelled shift-end never establishes a 0.
    const b12 = makeKit();

    openKit(b12);
    enter(b12, 'plot_a');
    fail(b12, 'plot_a');
    present(b12, 'plot_a');
    shift(b12, SYSTEM_SHIFT);
    expect(m23ObservedContinuation(b12.s.plots[0])).toBeNull();
    // B13: departure / blur / shutdown pause; the series stays open.
    const b13 = makeKit();

    openKit(b13);
    enter(b13, 'plot_a');
    fail(b13, 'plot_a');
    present(b13, 'plot_a');
    cont(b13, 'plot_a');

    for (const cause of [
      'yard_departure',
      'focus_loss',
      'scene_shutdown',
    ] as M23CancelReason[]) {
      enter(b13, 'plot_a');
      expect(m23sPause(b13.s, cause, b13.now(), b13.sink, 'system')).toBe(true);
      expect(b13.s.status).toBe('open');
      expect(b13.s.closure).toBeNull();
    }

    expect(
      b13.events.filter((e) => e.event_type.endsWith('window_closed')),
    ).toHaveLength(0);
    // B18: both terminal, then repeated SHIFT / REVIEW: one closure.
    const b18 = makeKit();

    openKit(b18);
    enter(b18, 'plot_a');
    recover(b18, 'plot_a');
    enter(b18, 'plot_b');
    fail(b18, 'plot_b');
    present(b18, 'plot_b');
    stopDirect(b18, 'plot_b');
    expect(b18.s.closure?.trigger).toBe('both_plots_terminal');
    expect(b18.s.closure?.reason).toBe('voluntary_stop');
    expect(m23sCloseAtShiftEnd(b18.s, b18.now(), PARTICIPANT, b18.sink)).toBe(
      false,
    );
    expect(m23sCloseAtReview(b18.s, b18.now(), b18.sink)).toBe(false);
    expect(
      b18.events.filter((e) => e.event_type.endsWith('plot_closed')),
    ).toHaveLength(2);
    expect(b18.s.closure?.trigger).toBe('both_plots_terminal');
  });

  test('B17 / T08 / faults: a terminal plot leaves the other usable; a plot-specific fault terminates that plot only and keeps the other plot and verified outcomes; a whole-series fault closes everything; the reload hold-back', () => {
    const kit = makeKit();

    openKit(kit);
    enter(kit, 'plot_a');
    recover(kit, 'plot_a');
    expect(kit.s.status).toBe('open');
    expect(kit.s.plots[1].status).toBe('not_started');
    expect(enter(kit, 'plot_b').kind).toBe('searching');
    fail(kit, 'plot_b');
    present(kit, 'plot_b');
    cont(kit, 'plot_b');
    act(kit, 'plot_b');
    expect(m23sFail(kit.s, 'boom', 'plot_b', kit.now(), kit.sink)).toEqual({
      kind: 'plot',
      plot_id: 'plot_b',
      series_closed: true,
    });
    expect(kit.s.plots[1].status).toBe('technical_failure');
    expect(kit.s.plots[0].status).toBe('recovered');
    expect(kit.s.closure?.reason).toBe('completed');

    // An unnamed fault while a plot is selected scopes to that plot (the
    // adapter names the plot it serves); without a selection it is the
    // whole series.
    const scoped = makeKit();

    openKit(scoped);
    enter(scoped, 'plot_a');
    fail(scoped, 'plot_a');
    present(scoped, 'plot_a');
    m23sPause(scoped.s, 'panel', scoped.now(), scoped.sink, 'keyboard');
    expect(
      m23sFail(scoped.s, 'crash', null, scoped.now(), scoped.sink),
    ).toEqual({
      kind: 'plot',
      plot_id: 'plot_a',
      series_closed: false,
    });
    expect(scoped.s.plots[1].status).toBe('not_started');
    expect(scoped.s.status).toBe('open');

    const series = makeKit();

    openKit(series);
    expect(
      m23sFail(series.s, 'crash', null, series.now(), series.sink),
    ).toEqual({ kind: 'series' });
    expect(series.s.status).toBe('technical_failure');
    expect(
      series.s.plots.every((plot) => plot.status === 'technical_failure'),
    ).toBe(true);
    expect(
      m23sFail(series.s, 'later', null, series.now(), series.sink),
    ).toEqual({ kind: 'after_closure' });

    const reload = makeKit();
    const check = m23PriorLoadCheck(
      2,
      [{ event_type: 'proto_m23_plots_opportunity_opened' }],
      {
        first_sequence: 1,
        sequence_gap_count: 0,
        sequence_duplicate_count: 0,
        recovered_from_chunks: false,
      },
    );

    expect(check.prior_opening_found).toBe(true);
    expect(m23sHoldBack(reload.s, check, reload.now(), reload.sink)).toBe(true);
    expect(reload.s.status).toBe('held_back');
    expect(reload.s.fault_detail).toBe(M23_RELOAD_DETAIL);
    expect(m23sSelectorShown(reload.s, reload.now())).toBe('closed');
    // A reload before any measured opening permits the replay (R01).
    const replay = m23PriorLoadCheck(
      2,
      [
        { event_type: 'proto_m23_plots_presented' },
        { event_type: 'proto_m23_plots_example_viewed' },
      ],
      {
        first_sequence: 1,
        sequence_gap_count: 0,
        sequence_duplicate_count: 0,
        recovered_from_chunks: false,
      },
    );

    expect(replay.prior_opening_found).toBe(false);
    expect(replay.prior_presentation_found).toBe(true);
    expect(replay.prior_opening_absence_established).toBe(true);
    // G04: the hold-back keeps the guidance addressed.
    expect(reload.s.guidance_addressed).toBe(true);
  });

  test('review round 2: a confirmed selector STOP of a failure whose choice was never presented stays eligible and unknown (never a 0); a later plot-scoped fault keeps a verified 1 on that plot; a system-cancelled start after CONTINUE is the diagnostic even after a credit', () => {
    // M-1: F without V, then SELSTOP → unknown.
    const kit = makeKit();

    openKit(kit);
    enter(kit, 'plot_a');
    fail(kit, 'plot_a');
    m23sPause(kit.s, 'panel', kit.now(), kit.sink, 'keyboard');
    selStop(kit, 'plot_a');
    expect(kit.s.plots[0].status).toBe('stopped');
    expect(kit.s.plots[0].presentation?.unpresented).toBe(true);
    expect(kit.s.plots[0].response).toBeNull();
    expect(m23ObservedContinuation(kit.s.plots[0])).toBeNull();
    expect(
      metaOf(
        kit.events.filter((e) => e.event_type.endsWith('plot_closed')).pop()!,
      ).observed_continuation,
    ).toBeNull();
    expect(
      kit.events.filter((e) => e.event_type.endsWith('failure_choice')),
    ).toHaveLength(0);

    // M-2: a verified 1, then a fault on the same plot → the 1 stands.
    const faulted = makeKit();

    openKit(faulted);
    enter(faulted, 'plot_a');
    fail(faulted, 'plot_a');
    present(faulted, 'plot_a');
    cont(faulted, 'plot_a');
    act(faulted, 'plot_a');
    expect(
      m23sFail(
        faulted.s,
        'same-plot fault',
        'plot_a',
        faulted.now(),
        faulted.sink,
      ),
    ).toEqual({
      kind: 'plot',
      plot_id: 'plot_a',
      series_closed: false,
    });
    expect(faulted.s.plots[0].status).toBe('technical_failure');
    expect(m23ObservedContinuation(faulted.s.plots[0])).toBe(true);
    expect(
      metaOf(
        faulted.events
          .filter((e) => e.event_type.endsWith('plot_closed'))
          .pop()!,
      ).observed_continuation,
    ).toBe(true);

    // m-6: the diagnostic after a credit too.
    const late = makeKit();

    openKit(late);
    enter(late, 'plot_a');
    fail(late, 'plot_a');
    present(late, 'plot_a');
    cont(late, 'plot_a');
    act(late, 'plot_a');
    m23sStartAction(
      late.s,
      'scan',
      late.now(),
      INSIDE.plot_a,
      'interior',
      null,
      'keyboard',
      late.sink,
    );
    late.tick(300);
    expect(m23sPause(late.s, 'hidden', late.now(), late.sink, 'system')).toBe(
      true,
    );
    expect(late.s.plots[0].system_cancelled_after_continue).toHaveLength(1);
    expect(late.s.plots[0].credit).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * 5. M23 extraction — the outcome fixtures
 * ------------------------------------------------------------------ */

type Mirror = 'AB' | 'BA';

/** The second assignment variant: the other forms, row order BA, STOP on the left. */
const ASSIGN_VARIANT: M23Assignment = {
  plot_a_form: 'a2',
  plot_b_form: 'b2',
  plot_order: 'BA',
  failure_option_order: 'stop_left',
};

/**
 * Runs a fixture with A / B swapped (labels only; the expectations never
 * change) under BOTH assignment variants (forms, row order, option order)
 * and, since round 3 (8d), with keyboard AND pointer commits.
 */
function mirrors(
  fn: (first: M23PlotId, second: M23PlotId, mirror: Mirror) => void,
) {
  for (const mode of ['keyboard', 'pointer'] as const) {
    KIT_MODE = mode;

    for (const assignment of [ASSIGN, ASSIGN_VARIANT]) {
      KIT_ASSIGNMENT = assignment;
      fn('plot_a', 'plot_b', 'AB');
      fn('plot_b', 'plot_a', 'BA');
    }
  }

  KIT_MODE = 'keyboard';
  KIT_ASSIGNMENT = ASSIGN;
}

/** K0(X): F, V, direct STOP. */
function k0(kit: Kit, plot: M23PlotId) {
  enter(kit, plot);
  fail(kit, plot);
  present(kit, plot);
  stopDirect(kit, plot);
}

/** K1(X): F, V, CONT, ACT, then SELSTOP. */
function k1(kit: Kit, plot: M23PlotId, close = true) {
  enter(kit, plot);
  fail(kit, plot);
  present(kit, plot);
  cont(kit, plot);
  act(kit, plot);

  if (close) {
    selStop(kit, plot);
  }
}

/** U(X): F, V, left unresolved (the review / a system boundary closes it). */
function u(kit: Kit, plot: M23PlotId) {
  enter(kit, plot);
  fail(kit, plot);
  present(kit, plot);
  m23sPause(kit.s, 'panel', kit.now(), kit.sink, KIT_MODE);
}

/** Pre-failure SELSTOP(X) without any opening. */
function preStop(kit: Kit, plot: M23PlotId) {
  m23sSurfaceOpened(kit.s, 'selector', kit.now(), kit.sink);
  m23sSelectorShown(kit.s, kit.now());
  kit.tick(500);
  expect(m23sRequestStop(kit.s, plot, KIT_MODE, kit.now(), kit.sink)).toBe(
    true,
  );
  kit.tick(500);
  expect(m23sConfirmStop(kit.s, plot, KIT_MODE, kit.now(), kit.sink)).toBe(
    true,
  );
  kit.tick(500);
}

test.describe('M23 extraction: the outcome fixtures (Unit 23)', () => {
  test('O01–O03, O15–O17: no eligible plot — both recoveries, both pre-failure stops, the mix, no failed dig, the brief without a selector, nothing', () => {
    mirrors((a, b) => {
      const o01 = makeKit({
        ...ASSIGN,
        plot_order: a === 'plot_a' ? 'AB' : 'BA',
      });

      openKit(o01);
      enter(o01, a);
      recover(o01, a);
      enter(o01, b);
      recover(o01, b);
      closeWindow(o01);

      const r1 = extract(o01);

      expectRow(r1, {
        value: null,
        numerator: null,
        denominator: 0,
        disposition: 'no_eligible_event',
        reason: 'recovered_without_failure',
      });
      expect(comps(r1).recovered_without_failure_ids).toEqual(
        expect.arrayContaining([a, b]),
      );
      expect(r1.closure_reason).toBe('completed');

      const o02 = makeKit();

      openKit(o02);
      preStop(o02, a);
      preStop(o02, b);
      closeWindow(o02);

      const r2 = extract(o02);

      expectRow(r2, {
        value: null,
        numerator: null,
        denominator: 0,
        disposition: 'no_eligible_event',
        reason: 'stopped_before_failure',
      });
      expect(comps(r2).stopped_before_failure_ids).toEqual(
        expect.arrayContaining([a, b]),
      );
      expect(o02.events.some((e) => e.event_type.endsWith('plot_opened'))).toBe(
        false,
      );
      expect(
        o02.events.some((e) => e.event_type.endsWith('action_started')),
      ).toBe(false);
      expect(
        o02.events.some((e) => e.event_type.endsWith('failure_choice')),
      ).toBe(false);
      expect(r2.closure_reason).toBe('voluntary_stop');

      const o03 = makeKit();

      openKit(o03);
      enter(o03, a);
      recover(o03, a);
      preStop(o03, b);
      closeWindow(o03);

      const r3 = extract(o03);

      expectRow(r3, {
        value: null,
        numerator: null,
        denominator: 0,
        disposition: 'no_eligible_event',
        reason: 'mixed_no_eligible_event',
      });
      expect(comps(r3).recovered_without_failure_ids).toEqual([a]);
      expect(comps(r3).stopped_before_failure_ids).toEqual([b]);

      // O15: opened, searched, no failed dig, the shift end.
      const o15 = makeKit();

      openKit(o15);
      enter(o15, a);
      scan(o15, INSIDE[a]);
      shift(o15);

      const r15 = extract(o15);

      expectRow(r15, {
        value: null,
        numerator: null,
        denominator: 0,
        disposition: 'no_eligible_event',
        reason: 'no_failed_dig',
      });
      expect(comps(r15).searched_no_failure_ids).toEqual([a]);
      expect(comps(r15).unopened_ids).toEqual([b]);
      expect(
        o15.events.some((e) => e.event_type.endsWith('stop_requested')),
      ).toBe(false);
      expect(r15.closure_reason).toBe('session_end');
    });

    // O16: the brief and the examples only, then the review.
    const o16 = makeKit();

    o16.s.status = 'presented';
    o16.kitLog('presented', { input_mode: 'system' });
    m23sSurfaceOpened(o16.s, 'brief', o16.now(), o16.sink);
    m23sBriefShown(o16.s, o16.now(), true, o16.sink);
    m23sExampleViewed(o16.s, 1, o16.now(), o16.sink, 'keyboard');
    o16.kitLog('window_closed', {
      exit_state: 'closed_at_review',
      input_mode: 'system',
    });

    const r16 = extract(o16);

    expectRow(r16, {
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'not_presented',
      reason: 'presented_not_opened',
    });
    expect(
      o16.events.some((e) => e.event_type.endsWith('opportunity_opened')),
    ).toBe(false);

    // O17: nothing at all.
    const r17 = extract(makeKit());

    expectRow(r17, {
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'not_presented',
    });
    expect(comps(r17).presented_in_current_load).toBe(false);
  });

  test('O04–O09: every resolved composition — one eligible complete (0 or 1 with a recovery, a pre-failure stop or an unopened other plot), 0/2, 1/2 both ways (never 0.5), 2/2 (never a ratio 1)', () => {
    mirrors((a, b) => {
      for (const other of ['recover', 'prestop', 'unopened'] as const) {
        const o04 = makeKit();

        openKit(o04);
        k0(o04, a);

        if (other === 'recover') {
          enter(o04, b);
          recover(o04, b);
          closeWindow(o04);
        } else if (other === 'prestop') {
          preStop(o04, b);
          closeWindow(o04);
        } else {
          shift(o04);
        }

        const r4 = extract(o04);

        expectRow(r4, {
          value: 0,
          numerator: 0,
          denominator: 1,
          disposition: 'observed',
        });
        expect(comps(r4).denominator_resolved).toBe(1);
        expect(comps(r4).observed_count).toBe(0);
        expect(r4.included_ids).toEqual([a]);

        const o05 = makeKit();

        openKit(o05);
        k1(o05, a);

        if (other === 'recover') {
          enter(o05, b);
          recover(o05, b);
          closeWindow(o05);
        } else if (other === 'prestop') {
          preStop(o05, b);
          closeWindow(o05);
        } else {
          shift(o05);
        }

        const r5 = extract(o05);

        expectRow(r5, {
          value: 1,
          numerator: 1,
          denominator: 1,
          disposition: 'observed',
        });
        expect(comps(r5).observed_count).toBe(1);
      }

      const o06 = makeKit();

      openKit(o06);
      k0(o06, a);
      k0(o06, b);
      closeWindow(o06);
      expectRow(extract(o06), {
        value: 0,
        numerator: 0,
        denominator: 2,
        disposition: 'observed',
      });

      const o07 = makeKit();

      openKit(o07);
      k0(o07, a);
      k1(o07, b);
      closeWindow(o07);

      const r7 = extract(o07);

      expectRow(r7, {
        value: 1,
        numerator: 1,
        denominator: 2,
        disposition: 'observed',
      });
      expect(r7.value).not.toBe(0.5);
      expect(comps(r7).known_outcomes_by_plot).toEqual({ [a]: 0, [b]: 1 });

      const o08 = makeKit();

      openKit(o08);
      k1(o08, a);
      k0(o08, b);
      closeWindow(o08);

      const r8 = extract(o08);

      expectRow(r8, {
        value: 1,
        numerator: 1,
        denominator: 2,
        disposition: 'observed',
      });
      expect(comps(r8).known_outcomes_by_plot).toEqual({ [a]: 1, [b]: 0 });

      const o09 = makeKit();

      openKit(o09);
      k1(o09, a);
      k1(o09, b);
      closeWindow(o09);

      const r9 = extract(o09);

      expectRow(r9, {
        value: 2,
        numerator: 2,
        denominator: 2,
        disposition: 'observed',
      });
      expect(r9.value).not.toBe(1 / 1);
      expect(comps(r9).denominator_resolved).toBe(2);
      expect(r9.closure_reason).toBe('voluntary_stop');
    });
  });

  test('O10–O14, X01–X02: E(c) — any valid eligible unknown makes the primary AND the numerator null with the total denominator; the known outcomes stay in the components; the open series is pending with its current denominator', () => {
    mirrors((a, b) => {
      const o10 = makeKit();

      openKit(o10);
      k0(o10, a);
      u(o10, b);
      review(o10);

      const r10 = extract(o10);

      expectRow(r10, {
        value: null,
        numerator: null,
        denominator: 2,
        disposition: 'interrupted',
        reason: 'eligible_response_unresolved',
      });
      expect(r10.censored).toBe(true);
      expect(comps(r10).denominator_resolved).toBe(1);
      expect(comps(r10).observed_count).toBe(0);
      expect(comps(r10).unknown_eligible_ids).toEqual([b]);
      expect(r10.closure_reason).toBe('closed_at_review');

      const o11 = makeKit();

      openKit(o11);
      k1(o11, a);
      u(o11, b);
      review(o11);

      const r11 = extract(o11);

      expectRow(r11, {
        value: null,
        numerator: null,
        denominator: 2,
        disposition: 'interrupted',
      });
      expect(comps(r11).observed_count).toBe(1);
      expect(comps(r11).denominator_resolved).toBe(1);

      const o12 = makeKit();

      openKit(o12);
      u(o12, a);
      u(o12, b);
      review(o12);

      const r12 = extract(o12);

      expectRow(r12, {
        value: null,
        numerator: null,
        denominator: 2,
        disposition: 'interrupted',
      });
      expect(comps(r12).denominator_resolved).toBe(0);
      expect(comps(r12).observed_count).toBe(0);
      expect(comps(r12).unknown_eligible_ids).toEqual(
        expect.arrayContaining([a, b]),
      );

      const o13 = makeKit();

      openKit(o13);
      u(o13, a);
      enter(o13, b);
      recover(o13, b);
      review(o13);

      const r13 = extract(o13);

      expectRow(r13, {
        value: null,
        numerator: null,
        denominator: 1,
        disposition: 'interrupted',
      });
      expect(r13.value).not.toBe(0);

      // O14: known on A, B still available → pending with denominator 1.
      const o14 = makeKit();

      openKit(o14);
      k1(o14, a);

      const r14 = extract(o14);

      expectRow(r14, {
        value: null,
        numerator: null,
        denominator: 1,
        disposition: 'pending',
      });
      expect(comps(r14).observed_count).toBe(1);
      expect(
        o14.events.some((e) => e.event_type.endsWith('window_closed')),
      ).toBe(false);

      // X01: the CENSORING alternative is not selected — under the approved
      // D2 an informed shift end with CONTINUE and no act resolves 0 (B07);
      // the fixture's dependency is shown with the system source: unknown
      // keeps the primary null even with a known 1 elsewhere (X02).
      const x02 = makeKit();

      openKit(x02);
      k1(x02, a, false);
      m23sPause(x02.s, 'panel', x02.now(), x02.sink, 'keyboard');
      enter(x02, b);
      fail(x02, b);
      present(x02, b);
      cont(x02, b);
      shift(x02, SYSTEM_SHIFT);

      const rx = extract(x02);

      expectRow(rx, {
        value: null,
        numerator: null,
        denominator: 2,
        disposition: 'interrupted',
      });
      expect(comps(rx).observed_count).toBe(1);
      expect(comps(rx).denominator_resolved).toBe(1);
      expect(comps(rx).shift_end_unresolved_ids).toEqual([b]);
    });
  });

  test('B06–B16 through the extractor: informed shift-end 0 (B06, B07, B14), no downgrade (B08), review unknown (B09), unpresented choice never 0 (B10, B15), no explanation (B11), no participant source (B12), the resolved component of B16', () => {
    mirrors((a, b) => {
      const b06 = makeKit();

      openKit(b06);
      u(b06, a);
      shift(b06);

      const r6 = extract(b06);

      expectRow(r6, {
        value: 0,
        numerator: 0,
        denominator: 1,
        disposition: 'observed',
      });
      expect(comps(r6).shift_end_resolved_zero_ids).toEqual([a]);
      expect(
        b06.events.filter((e) => e.event_type.endsWith('failure_choice')),
      ).toHaveLength(0);

      const b07 = makeKit();

      openKit(b07);
      enter(b07, a);
      fail(b07, a);
      present(b07, a);
      cont(b07, a);
      shift(b07);
      expectRow(extract(b07), {
        value: 0,
        numerator: 0,
        denominator: 1,
        disposition: 'observed',
      });

      const b08 = makeKit();

      openKit(b08);
      k1(b08, a, false);
      shift(b08);
      expectRow(extract(b08), {
        value: 1,
        numerator: 1,
        denominator: 1,
        disposition: 'observed',
      });

      const b09 = makeKit();

      openKit(b09);
      u(b09, a);
      review(b09);

      const r9 = extract(b09);

      expectRow(r9, {
        value: null,
        numerator: null,
        denominator: 1,
        disposition: 'interrupted',
      });
      expect(comps(r9).unknown_eligible_ids).toEqual([a]);

      const b10 = makeKit();

      openKit(b10);
      enter(b10, a);
      fail(b10, a);
      m23sPause(b10.s, 'panel', b10.now(), b10.sink, 'keyboard');
      shift(b10);

      const r10 = extract(b10);

      expectRow(r10, {
        value: null,
        numerator: null,
        denominator: 1,
        disposition: 'interrupted',
      });
      expect(comps(r10).failure_choice_unpresented_ids).toEqual([a]);
      expect(comps(r10).shift_end_unresolved_ids).toEqual([a]);

      // B11: no closure-explanation exposure recorded → unknown.
      const b11 = makeKit();

      b11.s.status = 'presented';
      b11.kitLog('presented', { input_mode: 'system' });
      m23sSurfaceOpened(b11.s, 'brief', b11.now(), b11.sink);
      m23sBriefShown(b11.s, b11.now(), false, b11.sink);
      m23sExampleViewed(b11.s, 1, b11.now(), b11.sink, 'keyboard');
      m23sExampleViewed(b11.s, 2, b11.now(), b11.sink, 'keyboard');
      m23sSelectorShown(b11.s, b11.now());
      b11.kitLog('opportunity_opened', {
        entry_state_snapshot: m23EntrySnapshot(b11.s, {
          stage: 'exterior_work',
          visibility: { page_visible: true, page_focused: true },
          prior_load: null,
          tools: [],
        }),
        input_mode: 'system',
      });
      b11.tick(500);
      u(b11, a);
      shift(b11);

      const r11 = extract(b11);

      expectRow(r11, {
        value: null,
        numerator: null,
        denominator: 1,
        disposition: 'interrupted',
      });
      expect(comps(r11).shift_end_unresolved_ids).toEqual([a]);
      expect(comps(r11).closure_explanations_presented).toBe(0);

      const b12 = makeKit();

      openKit(b12);
      u(b12, a);
      shift(b12, SYSTEM_SHIFT);
      expectRow(extract(b12), {
        value: null,
        numerator: null,
        denominator: 1,
        disposition: 'interrupted',
      });

      const b14 = makeKit();

      openKit(b14);
      k1(b14, a, false);
      m23sPause(b14.s, 'panel', b14.now(), b14.sink, 'keyboard');
      u(b14, b);
      shift(b14);
      expectRow(extract(b14), {
        value: 1,
        numerator: 1,
        denominator: 2,
        disposition: 'observed',
      });

      const b15 = makeKit();

      openKit(b15);
      k1(b15, a, false);
      m23sPause(b15.s, 'panel', b15.now(), b15.sink, 'keyboard');
      enter(b15, b);
      fail(b15, b);
      m23sPause(b15.s, 'panel', b15.now(), b15.sink, 'keyboard');
      shift(b15);

      const r15 = extract(b15);

      expectRow(r15, {
        value: null,
        numerator: null,
        denominator: 2,
        disposition: 'interrupted',
      });
      expect(comps(r15).observed_count).toBe(1);
      expect(comps(r15).unknown_eligible_ids).toEqual([b]);

      const b16 = makeKit();

      openKit(b16);
      k0(b16, a);
      enter(b16, b);
      fail(b16, b);
      m23sPause(b16.s, 'panel', b16.now(), b16.sink, 'keyboard');
      review(b16);

      const r16 = extract(b16);

      expectRow(r16, {
        value: null,
        numerator: null,
        denominator: 2,
        disposition: 'interrupted',
      });
      expect(comps(r16).observed_count).toBe(0);
      expect(comps(r16).denominator_resolved).toBe(1);
    });
  });

  test('C01–C06 through the extractor: the system-cancelled start after CONTINUE is a diagnostic, never credit or a second denominator; the later fresh act is the 1; the stop is the 0 with the diagnostic kept; the review keeps unknown', () => {
    mirrors((a) => {
      const run = (finish: 'act' | 'stop' | 'shift' | 'review') => {
        const kit = makeKit();

        openKit(kit);
        enter(kit, a);
        fail(kit, a);
        present(kit, a);
        cont(kit, a);
        m23sStartAction(
          kit.s,
          'scan',
          kit.now(),
          INSIDE[a],
          'interior',
          null,
          'keyboard',
          kit.sink,
        );
        kit.tick(500);
        m23sPause(kit.s, 'focus_loss', kit.now(), kit.sink, 'system');
        kit.tick(1000);

        if (finish === 'act') {
          enter(kit, a);
          act(kit, a);
          selStop(kit, a);
        } else if (finish === 'stop') {
          selStop(kit, a);
        } else if (finish === 'shift') {
          shift(kit);
        } else {
          review(kit);
        }

        // The shift end and the review write the kit's `window_closed` themselves.
        if (finish === 'act' || finish === 'stop') {
          closeWindow(kit);
        }

        return extract(kit);
      };

      const r3 = run('act');

      expectRow(r3, {
        value: 1,
        numerator: 1,
        denominator: 1,
        disposition: 'observed',
      });
      expect(comps(r3).continuation_started_then_system_cancelled_ids).toEqual([
        a,
      ]);

      const r4 = run('stop');

      expect(comps(r4).invalid_reasons).toEqual({});
      expect(comps(r4).flags).toEqual([]);
      expect(r4.missing_reason).toBeNull();
      expectRow(r4, {
        value: 0,
        numerator: 0,
        denominator: 1,
        disposition: 'observed',
      });
      expect(comps(r4).continuation_started_then_system_cancelled_ids).toEqual([
        a,
      ]);

      const r5 = run('shift');

      expect(comps(r5).invalid_reasons).toEqual({});
      expect(comps(r5).flags).toEqual([]);
      expect(comps(r5).shift_end_unresolved_ids).toEqual([]);
      expect(comps(r5).shift_end_resolved_zero_ids).toEqual([a]);
      expectRow(r5, {
        value: 0,
        numerator: 0,
        denominator: 1,
        disposition: 'observed',
      });

      const r6 = run('review');

      expectRow(r6, {
        value: null,
        numerator: null,
        denominator: 1,
        disposition: 'interrupted',
      });
      expect(comps(r6).continuation_started_then_system_cancelled_ids).toEqual([
        a,
      ]);
    });
  });

  test('R02–R03: a measured opening in an earlier load locks the current load (null / null / 0 interrupted; the earlier evidence never pooled); R01: a reload during the brief is no lock', () => {
    const kit = makeKit();
    const check = m23PriorLoadCheck(
      2,
      [{ event_type: 'proto_m23_plots_opportunity_opened' }],
      {
        first_sequence: 1,
        sequence_gap_count: 0,
        sequence_duplicate_count: 0,
        recovered_from_chunks: false,
      },
    );

    m23sHoldBack(kit.s, check, kit.now(), kit.sink);
    kit.kitLog('technical_failure', {
      detail: M23_RELOAD_DETAIL,
      input_mode: 'system',
    });

    const row = extract(kit, true);

    expectRow(row, {
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'interrupted',
    });
    expect(comps(row).held_back_after_reload).toBe(true);
    expect(row.closure_reason).toBe('session_end');

    // The earlier load's own events are never read into the current load.
    const prior: RawGameEvent[] = [
      {
        session_id: 'GS',
        timestamp_ms: 1,
        scene: 'exterior_recovery_yard',
        event_type: 'proto_m23_plots_dig_resolved',
        sequence: 1,
        page_load_index: 1,
        metadata: {
          opportunity_id: HAND.opportunity,
          entry_state_version: HAND.version,
          plot_id: 'plot_a',
          outcome: 'empty',
        },
      },
      ...kit.events.map((event) => ({ ...event, page_load_index: 2 })),
    ];
    const pooled = extractItemFeatures('M23', prior, {
      finalCoreClosed: true,
      pageLoadIndex: 2,
      reloaded: true,
    })[0];

    expect(pooled.disposition).toBe('interrupted');
    expect(pooled.denominator).toBe(0);

    // R01: a reload with the brief replayed is no lock; the series opens normally.
    const replay = makeKit();

    openKit(replay);
    expect(extract(replay, true).disposition).toBe('pending');
    // A later load with no current-load evidence at all is `interrupted`.
    expect(
      extractItemFeatures('M23', [], {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      })[0].disposition,
    ).toBe('interrupted');
  });

  test('T01–T07: a technically invalid plot is excluded transparently — 0/0/1 and 1/1/1 with the censor flag; invalid plus unknown stays null/1 interrupted; only invalid evidence is technical_failure; a later unrelated fault never erases a verified outcome; refusals never invalidate', () => {
    mirrors((a, b) => {
      // T01 / T02: X(A) by a plot fault, then K0(B) / K1(B).
      for (const known of [0, 1] as const) {
        const kit = makeKit();

        openKit(kit);
        enter(kit, a);
        fail(kit, a);
        present(kit, a);
        m23sFail(kit.s, 'plot fault', a, kit.now(), kit.sink);
        expect(kit.s.plots.find((p) => p.id === a)!.status).toBe(
          'technical_failure',
        );

        if (known === 0) {
          k0(kit, b);
        } else {
          k1(kit, b);
        }

        closeWindow(kit);

        const row = extract(kit);

        expectRow(row, {
          value: known,
          numerator: known,
          denominator: 1,
          disposition: 'observed',
        });
        expect(row.censored).toBe(true);
        expect(comps(row).invalid_ids).toEqual([a]);
        expect(row.included_ids).toEqual([b]);
      }

      // T03: X(A), U(B) → null / 1 interrupted.
      const t03 = makeKit();

      openKit(t03);
      enter(t03, a);
      fail(t03, a);
      m23sFail(t03.s, 'plot fault', a, t03.now(), t03.sink);
      u(t03, b);
      review(t03);
      expectRow(extract(t03), {
        value: null,
        numerator: null,
        denominator: 1,
        disposition: 'interrupted',
      });

      // T04: X(A), I(B) → technical_failure 0.
      const t04 = makeKit();

      openKit(t04);
      enter(t04, a);
      fail(t04, a);
      m23sFail(t04.s, 'plot fault', a, t04.now(), t04.sink);
      enter(t04, b);
      recover(t04, b);
      closeWindow(t04);

      const r4 = extract(t04);

      expectRow(r4, {
        value: null,
        numerator: null,
        denominator: 0,
        disposition: 'technical_failure',
      });
      expect(comps(r4).invalid_ids).toEqual([a]);

      // T05: a verified 1 on A, then a plot fault on B: A's 1 stands.
      const t05 = makeKit();

      openKit(t05);
      k1(t05, a);
      enter(t05, b);
      fail(t05, b);
      m23sFail(t05.s, 'late fault', b, t05.now(), t05.sink);
      closeWindow(t05);

      const r5 = extract(t05);

      expectRow(r5, {
        value: 1,
        numerator: 1,
        denominator: 1,
        disposition: 'observed',
      });
      expect(r5.censored).toBe(true);

      // T07: refused presses on the terminal / pending plot are refusals only.
      const t07 = makeKit();

      openKit(t07);
      k0(t07, a);
      m23sRefuse(
        t07.s,
        'scan',
        'plot_terminal',
        m23PlotOf(t07.s, a),
        { x: 976, y: 364, cell: null },
        'keyboard',
        t07.sink,
      );
      m23sRefuse(
        t07.s,
        'dig',
        'plot_terminal',
        m23PlotOf(t07.s, a),
        { x: 976, y: 364, cell: { col: 30, row: 10 } },
        'pointer',
        t07.sink,
      );
      k1(t07, b);
      closeWindow(t07);

      const r7 = extract(t07);

      expectRow(r7, {
        value: 1,
        numerator: 1,
        denominator: 2,
        disposition: 'observed',
      });
      expect(comps(r7).invalid_ids).toEqual([]);
      expect(r7.censored).toBe(false);
    });
  });

  test('T06 and the integrity rules: a contradictory key, a resolution without its start, a second terminal transition, a response without a failure and a second response exclude the affected plot with the reason; identity and order defects void the row; snapshots never repair missing evidence', () => {
    const base = () => {
      const kit = makeKit();

      openKit(kit);
      k1(kit, 'plot_a');
      k0(kit, 'plot_b');
      closeWindow(kit);

      return kit;
    };
    const clone = (events: RawGameEvent[]) =>
      events.map((event) => ({
        ...event,
        metadata: { ...(event.metadata ?? {}) },
      }));
    const rowOf = (events: RawGameEvent[]) =>
      extractItemFeatures('M23', events, {
        finalCoreClosed: true,
        pageLoadIndex: 1,
        reloaded: false,
      })[0];

    // The healthy baseline.
    expectRow(rowOf(base().events), {
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
    });

    // T06: a dig outcome contradicting A's key excludes A → B alone (0/0/1).
    const keyed = clone(base().events);
    const failDig = keyed.find(
      (e) =>
        e.event_type.endsWith('dig_resolved') &&
        e.metadata?.plot_id === 'plot_a',
    )!;

    failDig.metadata!.outcome = 'recovered';

    const r6 = rowOf(keyed);

    expectRow(r6, {
      value: 0,
      numerator: 0,
      denominator: 1,
      disposition: 'observed',
    });
    expect(comps(r6).invalid_ids).toEqual(['plot_a']);
    expect(
      String((comps(r6).invalid_reasons as Record<string, string[]>).plot_a[0]),
    ).toContain('contradicts');

    // A resolution without its start (the missing link).
    const unlinked = clone(base().events).filter(
      (e) =>
        !(
          e.event_type.endsWith('action_started') &&
          e.metadata?.plot_id === 'plot_a' &&
          e.metadata?.kind === 'scan'
        ),
    );
    const ru = rowOf(unlinked);

    expectRow(ru, {
      value: 0,
      numerator: 0,
      denominator: 1,
      disposition: 'observed',
    });
    expect(comps(ru).invalid_ids).toEqual(['plot_a']);

    // A second terminal transition of one action (resolve then cancel).
    const raced = clone(base().events);
    const resolved = raced.find((e) => e.event_type.endsWith('scan_resolved'))!;

    raced.push({
      ...resolved,
      event_type: 'proto_m23_plots_action_cancelled',
      sequence: 9000,
      metadata: { ...resolved.metadata, cancellation_reason: 'esc' },
    });
    expect(comps(rowOf(raced)).invalid_ids).toEqual(['plot_a']);

    // A response without a failure excludes B.
    const orphan = clone(base().events).filter(
      (e) =>
        !(
          e.event_type.endsWith('dig_resolved') &&
          e.metadata?.plot_id === 'plot_b'
        ),
    );

    expect(comps(rowOf(orphan)).invalid_ids).toEqual(['plot_b']);

    // A second response for one failure.
    const doubled = clone(base().events);
    const choice = doubled.find(
      (e) =>
        e.event_type.endsWith('failure_choice') &&
        e.metadata?.plot_id === 'plot_b',
    )!;

    doubled.push({
      ...choice,
      sequence: 9001,
      metadata: { ...choice.metadata },
    });
    expect(comps(rowOf(doubled)).invalid_ids).toEqual(['plot_b']);

    // Identity defects void the row.
    const foreign = clone(base().events);

    foreign[3].metadata!.opportunity_id = 'proto_other';
    expect(rowOf(foreign).disposition).toBe('technical_failure');
    expect(rowOf(foreign).value).toBeNull();

    const version = clone(base().events);

    version[5].metadata!.entry_state_version = 'm23-plots-v0';
    expect(rowOf(version).disposition).toBe('technical_failure');

    const snapshot = clone(base().events);
    const openedEvent = snapshot.find((e) =>
      e.event_type.endsWith('opportunity_opened'),
    )!;

    (
      openedEvent.metadata!.entry_state_snapshot as Record<string, unknown>
    ).layout_id = 'a_existing';
    expect(rowOf(snapshot).disposition).toBe('technical_failure');

    // Two different records sharing a sequence void the row (S2); identical
    // duplicates deduplicate; a shuffled log sorts by sequence; the input is
    // never mutated.
    const shared = clone(base().events);

    shared[7].sequence = shared[6].sequence;
    expect(rowOf(shared).disposition).toBe('technical_failure');

    const duplicated = clone(base().events);

    duplicated.push({
      ...duplicated[10],
      metadata: { ...duplicated[10].metadata },
    });
    expectRow(rowOf(duplicated), {
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
    });

    const shuffled = clone(base().events).reverse();
    const frozen = shuffled.map((event) =>
      Object.freeze({
        ...event,
        metadata: Object.freeze({ ...event.metadata }),
      }),
    );
    const serialised = JSON.stringify(frozen);

    expectRow(rowOf(frozen as RawGameEvent[]), {
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
    });
    expect(JSON.stringify(frozen)).toBe(serialised);

    // Missing evidence is never recovered from a snapshot: a plot_closed
    // claiming a continuation without the act is a flagged disagreement,
    // and the value follows the raw events.
    const claimed = clone(base().events);
    const closedB = claimed.find(
      (e) =>
        e.event_type.endsWith('plot_closed') &&
        e.metadata?.plot_id === 'plot_b',
    )!;

    closedB.metadata!.observed_continuation = true;

    const rc = rowOf(claimed);

    expectRow(rc, {
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
    });
    expect(
      (comps(rc).flags as string[]).some((f) =>
        f.includes('observed_continuation'),
      ),
    ).toBe(true);

    // More than 200 supporting sequences flag the truncation; the raw log is complete.
    const long = clone(base().events);

    for (let i = 0; i < 220; i += 1) {
      long.push({
        session_id: 'GS',
        timestamp_ms: 1,
        scene: 'exterior_recovery_yard',
        event_type: 'proto_m23_plots_action_refused',
        sequence: 10_000 + i,
        page_load_index: 1,
        metadata: {
          opportunity_id: HAND.opportunity,
          entry_state_version: HAND.version,
          plot_id: 'plot_a',
          reason: 'plot_terminal',
        },
      });
    }

    const rl = rowOf(long);

    expectRow(rl, {
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
    });
    expect(rl.supporting_sequences_truncated).toBe(true);
    expect(rl.supporting_sequences).toHaveLength(200);
    expect(long.length).toBeGreaterThan(200);
  });

  test('review round 2: an unpresented failure stopped from the selector is an eligible unknown (null / null / 1; null / null / 2 beside a known 1); a later fault on the same plot keeps its verified 1 (1 / 1 / 1; 1 / 1 / 2 beside a known 0); only an outcome unknown at the fault is excluded', () => {
    mirrors((a, b) => {
      // M-1: F(A) without V, SELSTOP(A) → unknown; alone, then with K1(B).
      const alone = makeKit();

      openKit(alone);
      enter(alone, a);
      fail(alone, a);
      m23sPause(alone.s, 'panel', alone.now(), alone.sink, 'keyboard');
      selStop(alone, a);
      review(alone);

      const r1 = extract(alone);

      expectRow(r1, {
        value: null,
        numerator: null,
        denominator: 1,
        disposition: 'interrupted',
      });
      expect(comps(r1).stopped_unpresented_ids).toEqual([a]);
      expect(comps(r1).unknown_eligible_ids).toEqual([a]);
      expect(comps(r1).invalid_ids).toEqual([]);

      const beside = makeKit();

      openKit(beside);
      enter(beside, a);
      fail(beside, a);
      m23sPause(beside.s, 'panel', beside.now(), beside.sink, 'keyboard');
      selStop(beside, a);
      k1(beside, b);
      closeWindow(beside);

      const r2 = extract(beside);

      expectRow(r2, {
        value: null,
        numerator: null,
        denominator: 2,
        disposition: 'interrupted',
      });
      expect(comps(r2).observed_count).toBe(1);
      expect(comps(r2).denominator_resolved).toBe(1);

      // M-2: K1(A) then a fault on A → the 1 stands; beside K0(B), and alone.
      const kept = makeKit();

      openKit(kept);
      k1(kept, a, false);
      m23sFail(kept.s, 'same-plot fault', a, kept.now(), kept.sink);
      k0(kept, b);
      closeWindow(kept);

      const r3 = extract(kept);

      expectRow(r3, {
        value: 1,
        numerator: 1,
        denominator: 2,
        disposition: 'observed',
      });
      expect(comps(r3).invalid_ids).toEqual([]);
      expect(r3.censored).toBe(false);

      const keptAlone = makeKit();

      openKit(keptAlone);
      k1(keptAlone, a, false);
      m23sFail(
        keptAlone.s,
        'same-plot fault',
        a,
        keptAlone.now(),
        keptAlone.sink,
      );
      enter(keptAlone, b);
      recover(keptAlone, b);
      closeWindow(keptAlone);
      expectRow(extract(keptAlone), {
        value: 1,
        numerator: 1,
        denominator: 1,
        disposition: 'observed',
      });

      // A fault while the outcome is still unknown excludes the plot (T01).
      const unknown = makeKit();

      openKit(unknown);
      enter(unknown, a);
      fail(unknown, a);
      present(unknown, a);
      cont(unknown, a);
      m23sFail(
        unknown.s,
        'fault before any act',
        a,
        unknown.now(),
        unknown.sink,
      );
      k0(unknown, b);
      closeWindow(unknown);

      const r5 = extract(unknown);

      expectRow(r5, {
        value: 0,
        numerator: 0,
        denominator: 1,
        disposition: 'observed',
      });
      expect(comps(r5).invalid_ids).toEqual([a]);
      expect(r5.censored).toBe(true);
    });
  });
});

test.describe('M23 extraction: round 3 fixtures (Unit 23)', () => {
  test('T09a–T09c (amendment §3.7): two plots that fault AFTER verified outcomes close completed (2 / 2 observed), never technical_failure; a verified 1 beside a faulted unresolved plot is 1 / 1 observed, censored, completed; two faults before any failure stay technical_failure', () => {
    mirrors((a, b) => {
      // T09a: K1(A), fault(A) after the credit; K1(B), fault(B) after the credit.
      const t9a = makeKit();

      openKit(t9a);
      k1(t9a, a, false);
      expect(
        m23sFail(t9a.s, 'plot fault after the credit', a, t9a.now(), t9a.sink)
          .kind,
      ).not.toBe('none');
      k1(t9a, b, false);
      expect(
        m23sFail(t9a.s, 'plot fault after the credit', b, t9a.now(), t9a.sink)
          .kind,
      ).not.toBe('none');
      closeWindow(t9a);

      const r9a = extract(t9a);

      expectRow(r9a, {
        value: 2,
        numerator: 2,
        denominator: 2,
        disposition: 'observed',
      });
      expect(r9a.closure_reason).toBe('completed');
      expect(r9a.censored).toBe(false);
      expect(comps(r9a).series_closure_trigger).toBe('both_plots_terminal');
      expect(comps(r9a).invalid_ids).toEqual([]);
      expect([...(comps(r9a).faulted_ids as string[])].sort()).toEqual(
        [a, b].sort(),
      );
      expect(r9a.included_ids).toEqual(['plot_a', 'plot_b']);

      // T09b: K1(A), fault(A); ENTER(B), F(B), V(B), fault(B) unresolved.
      const t9b = makeKit();

      openKit(t9b);
      k1(t9b, a, false);
      m23sFail(t9b.s, 'plot fault after the credit', a, t9b.now(), t9b.sink);
      enter(t9b, b);
      fail(t9b, b);
      present(t9b, b);
      m23sFail(t9b.s, 'plot fault before a response', b, t9b.now(), t9b.sink);
      closeWindow(t9b);

      const r9b = extract(t9b);

      expectRow(r9b, {
        value: 1,
        numerator: 1,
        denominator: 1,
        disposition: 'observed',
      });
      expect(r9b.closure_reason).toBe('completed');
      expect(r9b.censored).toBe(true);
      expect(comps(r9b).invalid_ids).toEqual([b]);
      expect([...(comps(r9b).faulted_ids as string[])].sort()).toEqual(
        [a, b].sort(),
      );
      expect(r9b.included_ids).toEqual([a]);

      // T09c (the guard): two faults before any failure — wholly invalid.
      const t9c = makeKit();

      openKit(t9c);
      enter(t9c, a);
      m23sFail(t9c.s, 'plot fault', a, t9c.now(), t9c.sink);
      enter(t9c, b);
      m23sFail(t9c.s, 'plot fault', b, t9c.now(), t9c.sink);
      closeWindow(t9c);

      const r9c = extract(t9c);

      expectRow(r9c, {
        value: null,
        numerator: null,
        denominator: 0,
        disposition: 'technical_failure',
      });
      expect(r9c.closure_reason).toBe('technical_failure');
    });
  });

  test('8d: the mixed commit — keyboard navigation then a pointer activation — records input_mode pointer with the arrow trace; the primary is the same 1 / 1 observed as the keyboard and pointer mirrors', () => {
    mirrors((a) => {
      const kit = makeKit();

      openKit(kit);
      enter(kit, a);
      fail(kit, a);
      present(kit, a);
      m23sNavigationToken(kit.s, 'ArrowLeft', 'arrow', `ff_left_e1`);

      const choice = m23sChoose(
        kit.s,
        a,
        'continue',
        'pointer',
        kit.now(),
        sideOf(kit, 'continue'),
        kit.sink,
      );

      expect(choice.kind).toBe('chosen');

      const record = kit.events.find((event) =>
        event.event_type.endsWith('failure_choice'),
      );

      expect(record?.metadata).toMatchObject({
        response: 'continue',
        input_mode: 'pointer',
        navigation_family: 'arrow',
        navigation_steps: 1,
        chosen_visual_side: sideOf(kit, 'continue'),
      });
      kit.tick(200);
      m23sAfterChoiceEnter(
        kit.s,
        a,
        kit.now(),
        INSIDE[a],
        member(a, INSIDE[a]),
        kit.sink,
      );
      kit.tick(200);
      act(kit, a);
      selStop(kit, a);
      closeWindow(kit);
      expectRow(extract(kit), {
        value: 1,
        numerator: 1,
        denominator: 1,
        disposition: 'observed',
      });
    });
  });
});

/* ------------------------------------------------------------------ *
 * 6. Browser groups — real input on the participant route
 * ------------------------------------------------------------------ */

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(250);

  // Provenance beside the frame (contract §8): the viewport, the native
  // camera, the plot / form / order, the raw sequence range, branch and
  // base, and whether the run was the participant route or a technical
  // fixture (an assigned session id or a reload). Read-only probes, read
  // immediately BEFORE the capture (round 4: a timed line could otherwise
  // change between the frame and its sidecar).
  const probe = await page.evaluate(() => {
    const w = window as unknown as {
      __cameraProbe?: Record<string, unknown> | null;
      __m23PlotsProbe?:
        | (Record<string, unknown> & {
            plots: Record<string, Record<string, unknown>>;
          })
        | null;
    };
    const series = w.__m23PlotsProbe ?? null;

    return {
      camera: w.__cameraProbe ?? null,
      series:
        series === null
          ? null
          : {
              selected: series.selected,
              status: series.status,
              view: series.view,
              assignment: series.assignment,
              plots: Object.fromEntries(
                Object.entries(series.plots).map(([id, plot]) => [
                  id,
                  {
                    status: plot.status,
                    form: plot.form,
                    // The stance recorded at the plot's region entry (the
                    // model's); the frame's own stance is the file name's.
                    entry_stance: plot.stance,
                    digs: plot.digs,
                    scans: plot.scans,
                  },
                ]),
              ),
            },
      field: (() => {
        const field = (
          window as unknown as {
            __m23FieldProbe?: {
              visible: boolean;
              dig: string[];
              tray: string[];
              scanner_bounds: unknown;
              dig_bounds: unknown;
              tray_bounds: unknown;
              scanner: string[];
              feedback: string | null;
              feedback_bounds: unknown;
            } | null;
          }
        ).__m23FieldProbe;

        return field === null || field === undefined
          ? null
          : {
              visible: field.visible,
              facing:
                field.dig.find((line) => line.startsWith('Facing')) ?? null,
              scanner: field.scanner,
              dig: field.dig,
              tray: field.tray,
              scanner_bounds: field.scanner_bounds,
              dig_bounds: field.dig_bounds,
              tray_bounds: field.tray_bounds,
              feedback: field.feedback,
              feedback_bounds: field.feedback_bounds,
            };
      })(),
      // The room's floating prompt (round 3, OD-1): hidden for the stake
      // inside the fixed frame; a foreign station's prompt is never touched.
      world_prompt:
        (window as unknown as { __worldPromptProbe?: unknown })
          .__worldPromptProbe ?? null,
      // Round 4: the prompt's actual design-space bounds (the yard's DEV
      // probe) beside the HUD bounds above.
      world_prompt_bounds:
        (window as unknown as { __yardPromptProbe?: unknown })
          .__yardPromptProbe ?? null,
    };
  });
  const sequences = (await m23Events(page)).map(
    (event) => (event as { sequence?: number }).sequence ?? 0,
  );

  await page.screenshot({ path: `${OUT}/${name}.png` });
  writeFileSync(
    `${OUT}/${name}.json`,
    JSON.stringify(
      {
        name,
        viewport: page.viewportSize(),
        ...probe,
        raw_sequence_range:
          sequences.length === 0
            ? null
            : [Math.min(...sequences), Math.max(...sequences)],
        branch: process.env.U23_UNIT_BRANCH ?? null,
        base: process.env.U23_BASE_SHA ?? null,
        run_kind: /^(B2|B3|L1|L2)\b/.test(test.info().title)
          ? 'technical_fixture'
          : 'participant_route',
        test: test.info().title,
        captured_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

function metaOf(event: { metadata?: Record<string, unknown> }) {
  return event.metadata ?? {};
}

/** The line the participant sees: the field HUD's own line while a plot is live, else the room's. */
async function anyFeedback(page: Page) {
  return (await m23Field(page))?.feedback ?? (await lastFeedback(page));
}

interface YardChip {
  id: string;
  text: string;
  visible: boolean;
  bounds: { left: number; top: number; right: number; bottom: number } | null;
}

/**
 * V01–V06: inside a plot's fixed frame the mast chip is masked and no
 * visible world readout's ACTUAL bounds intersect the active plot
 * rectangle (the scene's DEV `__yardChipProbe`, read-only).
 */
async function expectChipsClearOfPlot(page: Page, plot: PlotKey) {
  const chips = await page.evaluate(
    () =>
      (window as unknown as { __yardChipProbe?: YardChip[] | null })
        .__yardChipProbe ?? null,
  );

  expect(chips, 'yard chip probe').not.toBeNull();

  const bounds = M23.bounds[plot];
  const rect = {
    left: bounds.minCol * 32,
    top: bounds.minRow * 32,
    right: (bounds.maxCol + 1) * 32,
    bottom: (bounds.maxRow + 1) * 32,
  };
  const mast = chips!.find((chip) => chip.id === 'mast');

  expect(mast?.visible, 'the mast chip masked in the fixed frame').toBe(false);

  for (const chip of chips!) {
    if (!chip.visible || chip.text.length === 0 || chip.bounds === null) {
      continue;
    }

    const b = chip.bounds;
    const intersects =
      b.left < rect.right &&
      rect.left < b.right &&
      b.top < rect.bottom &&
      rect.top < b.bottom;

    expect(intersects, `chip ${chip.id} "${chip.text}" clear of ${plot}`).toBe(
      false,
    );
  }
}

test.describe('M23 browser (Unit 23)', () => {
  test('B-smoke (keyboard): the route to the yard, the stake, the brief and both examples, the measured opening, OPEN PLOT A, the approach and entry, the fixed frame, a scan, the first failure and its panel, CONTINUE, the credit, P and a confirmed selector STOP', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm23s');

    const before = await m23Probe(page);

    expect(before.status).toBe('unopened');
    expect(before.opened).toBe(false);

    await startPlot(page, 'plot_a', 'keyboard');

    const opened = await m23Probe(page);

    expect(opened.opened).toBe(true);
    expect(opened.guidance_addressed).toBe(true);
    expect(opened.plots.plot_a.status).toBe('searching');
    expect(opened.plots.plot_a.region_entries).toBe(1);

    const camera = await cameraProbe(page);

    expect(camera.scrollX).toBe(M23.scroll.plot_a.x);
    expect(camera.scrollY).toBe(M23.scroll.plot_a.y);
    expect(camera.zoom).toBe(2);
    await shot(page, 'smoke-01-a-searching-entry');

    const scan = await scanHere(page, 'keyboard');

    expect(scan.strength).toBeGreaterThanOrEqual(0);
    expect(scan.trend).toBe('NO COMPARISON');

    await failFirst(page, 'keyboard');
    await shot(page, 'smoke-02-first-failure');

    const failed = await m23Probe(page);

    expect(failed.plots.plot_a.first_failure?.cell).toEqual(M23.empty.plot_a);
    expect(failed.plots.plot_a.presentation?.unpresented).toBe(false);

    await chooseFailure(page, 'continue', 'keyboard');

    const continued = await m23Probe(page);

    expect(continued.plots.plot_a.response).toBe('continue');
    expect(continued.plots.plot_a.status).toBe('searching');

    const credit = await scanHere(page, 'keyboard');

    expect(credit).not.toBeNull();
    expect((await m23Probe(page)).plots.plot_a.credit).not.toBeNull();

    await openPanel(page, 'keyboard');
    await waitView(page, 'selector');
    await shot(page, 'smoke-03-selector-after-continue');
    await requestStop(page, 'plot_a', 'keyboard');
    await shot(page, 'smoke-04-stop-confirm');
    await confirmStop(page, 'plot_a', 'keyboard');

    const stopped = await m23Probe(page);

    expect(stopped.plots.plot_a.status).toBe('stopped');
    expect(stopped.plots.plot_a.observed_continuation).toBe(true);
    expect(stopped.plots.plot_b.status).toBe('not_started');

    const types = await m23EventTypes(page);

    expect(types).toEqual(
      expect.arrayContaining([
        'presented',
        'closure_explanation_presented',
        'example_viewed',
        'opportunity_opened',
        'plot_opened',
        'search_region_entered',
        'action_started',
        'scan_resolved',
        'dig_resolved',
        'failure_choice_presented',
        'failure_choice',
        'stop_requested',
        'plot_closed',
      ]),
    );

    const choices = (await m23Events(page)).filter(
      (event) => event.event_type === `${M23.family}failure_choice`,
    );

    expect(choices).toHaveLength(1);
    expect(metaOf(choices[0]).response).toBe('continue');
    expect(metaOf(choices[0]).navigation_steps).toBe(1);

    const row = extractItemFeatures(
      'M23',
      (await m23Events(page)) as unknown as RawGameEvent[],
      { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false },
    )[0];

    expect(row.disposition).toBe('pending');
    expect(row.denominator).toBe(1);
    expect(row.components.observed_count).toBe(1);
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * 7. Browser helpers shared by the remaining groups
 * ------------------------------------------------------------------ */

type PlotKey = 'plot_a' | 'plot_b';

async function eventsOf(page: Page, suffix: string) {
  return (await m23Events(page)).filter(
    (event) => event.event_type === `${M23.family}${suffix}`,
  );
}

async function countOf(page: Page, suffix: string) {
  return (await eventsOf(page, suffix)).length;
}

/** The page's own feature row for the current load. */
async function rowOf(page: Page, pageLoadIndex = 1, reloaded = false) {
  return extractItemFeatures(
    'M23',
    (await m23Events(page)) as unknown as RawGameEvent[],
    { finalCoreClosed: false, pageLoadIndex, reloaded },
  )[0];
}

/** The selector's status line of a plot (its displayed copy). */
async function statusLabel(page: Page, plot: PlotKey) {
  const probe = await surface(page);
  const element = probe?.elements.find((candidate) =>
    candidate.id.startsWith(`status_${plot}_`),
  );

  return element?.label ?? null;
}

/** The two first-failure option labels by their visual side. */
async function optionLabels(page: Page) {
  const probe = await surface(page);
  const left = probe!.elements.find((e) => e.id.startsWith('ff_left_'))!;
  const right = probe!.elements.find((e) => e.id.startsWith('ff_right_'))!;

  expect(left.x).toBeLessThan(right.x);
  expect(left.y).toBe(right.y);
  expect(left.w).toBe(right.w);

  return { left: left.label, right: right.label, focus: probe!.focus };
}

/** E at the stake once the series is locked or closed: no surface, the one line. */
/** The ordinary (non-M23) field-action records. */
async function ordinaryCounts(page: Page) {
  return {
    scan: (await eventsByType(page, 'secondary_field_action_scan')).length,
    dig: (await eventsByType(page, 'secondary_field_action_dig')).length,
    refusal: (await eventsByType(page, 'secondary_field_action_refusal'))
      .length,
  };
}

/**
 * Round 3 (OD-4): one C or D press in a plot's boundary ring in a non-live
 * state. Exactly one `action_refused` with the expected reason, kind and
 * plot association; no M23 start, resolution, resumption or region entry;
 * the ordinary scan / dig / refusal records and the field-action probe's
 * last records unchanged; every plot status, the credit and the feature row
 * unchanged; the camera on follow (never a fixed frame).
 */
async function ringPress(
  page: Page,
  kind: 'scan' | 'dig',
  expected: { reason: string; plot: PlotKey | null },
) {
  const before = {
    fa: await faProbe(page),
    ordinary: await ordinaryCounts(page),
    refused: await countOf(page, 'action_refused'),
    started: await countOf(page, 'action_started'),
    scans: await countOf(page, 'scan_resolved'),
    digs: await countOf(page, 'dig_resolved'),
    resumed: await countOf(page, 'resumed'),
    entered: await countOf(page, 'search_region_entered'),
    probe: await m23Probe(page),
    row: await rowOf(page),
    player: await playerAt(page),
  };

  await press(page, kind === 'scan' ? 'c' : 'd');
  await page.waitForTimeout(600);

  const refusals = await eventsOf(page, 'action_refused');

  expect(refusals).toHaveLength(before.refused + 1);

  const last = metaOf(refusals[refusals.length - 1]);

  expect(last.reason).toBe(expected.reason);
  expect(last.attempted_kind).toBe(kind);
  expect(last.plot_id).toBe(expected.plot);
  expect(last.attempted_x).toBeCloseTo(before.player.x, 0);
  expect(last.attempted_y).toBeCloseTo(before.player.y, 0);
  expect(await countOf(page, 'action_started')).toBe(before.started);
  expect(await countOf(page, 'scan_resolved')).toBe(before.scans);
  expect(await countOf(page, 'dig_resolved')).toBe(before.digs);
  expect(await countOf(page, 'resumed')).toBe(before.resumed);
  expect(await countOf(page, 'search_region_entered')).toBe(before.entered);
  expect(await ordinaryCounts(page)).toEqual(before.ordinary);

  const after = await faProbe(page);

  expect(after.scan.last).toEqual(before.fa.scan.last);
  expect(after.dig.last).toEqual(before.fa.dig.last);

  const probe = await m23Probe(page);

  for (const plot of ['plot_a', 'plot_b'] as const) {
    expect(probe.plots[plot].status).toBe(before.probe.plots[plot].status);
    expect(probe.plots[plot].credit).toBe(before.probe.plots[plot].credit);
    expect(probe.plots[plot].first_failure?.action_id).toBe(
      before.probe.plots[plot].first_failure?.action_id,
    );
    expect(probe.plots[plot].scans).toBe(before.probe.plots[plot].scans);
    expect(probe.plots[plot].digs).toBe(before.probe.plots[plot].digs);
  }

  expect(probe.status).toBe(before.probe.status);
  expect(probe.selected).toBe(before.probe.selected);

  const row = await rowOf(page);

  expect([row.value, row.numerator, row.denominator, row.disposition]).toEqual([
    before.row.value,
    before.row.numerator,
    before.row.denominator,
    before.row.disposition,
  ]);

  const camera = await cameraProbe(page);

  for (const plot of ['plot_a', 'plot_b'] as const) {
    expect(
      camera.scrollX !== M23.scroll[plot].x ||
        camera.scrollY !== M23.scroll[plot].y,
      `follow camera, not ${plot}'s fixed frame`,
    ).toBe(true);
  }
}

async function pressStakeExpectLine(page: Page, fragment: string) {
  const approach = registryApproach('yard.plot_stake');

  await yardVia(page, approach.x, approach.y);
  await interactAt(page, YARD_SITES.plotStake, {
    approachOffset: await yardApproach(page, YARD_SITES.plotStake),
  });
  await page.waitForTimeout(700);
  expect((await surface(page))?.open ?? false).toBe(false);
  expect(await lastFeedback(page)).toContain(fragment);
}

/**
 * Walks to a stance of the selected plot; a region exit on the way only
 * pauses (never a switch), so the plot is resumed from the panel when the
 * walk left the union — the stance itself must then be a member.
 */
async function standAt(page: Page, plot: PlotKey, x: number, y: number) {
  await yardVia(page, x, y);
  await page.waitForTimeout(300);

  if ((await m23Probe(page)).plots[plot].status === 'paused') {
    await openPanel(page, 'keyboard');
    await openPlot(page, plot, 'keyboard');
  }

  if ((await m23Probe(page)).plots[plot].status === 'approaching') {
    // A held-key arrival a few pixels short of the stance: one nudge toward
    // the plot's centre (the region entry is the plot's own rule).
    const bounds = M23.bounds[plot];
    const centre = {
      x: ((bounds.minCol + bounds.maxCol + 1) * 32) / 2,
      y: ((bounds.minRow + bounds.maxRow + 1) * 32) / 2,
    };

    await yardVia(
      page,
      x + Math.sign(centre.x - x) * 8,
      y + Math.sign(centre.y - y) * 8,
    );
    await page.waitForTimeout(300);

    if ((await m23Probe(page)).plots[plot].status === 'approaching') {
      // A second nudge (the driver's stop tolerance on both axes).
      await yardVia(
        page,
        x + Math.sign(centre.x - x) * 16,
        y + Math.sign(centre.y - y) * 16,
      );
    }
  }

  try {
    await waitM23(
      page,
      (probe, wanted) =>
        probe.plots[wanted as PlotKey].status === 'searching' &&
        probe.selected === wanted,
      8000,
      plot,
    );
  } catch (error) {
    // The diagnosis travels with the failure: where the avatar stopped and
    // what the series made of it.
    const probe = await m23Probe(page);
    const here = await playerAt(page);

    throw new Error(
      `standAt(${plot}, ${x}, ${y}) did not reach searching: avatar at (${here.x.toFixed(1)}, ${here.y.toFixed(1)}), selected ${probe.selected}, ${plot} ${probe.plots[plot].status} (stance ${probe.plots[plot].stance}, approaches ${probe.plots[plot].approaches}, region entries ${probe.plots[plot].region_entries}, pauses ${probe.plots[plot].pauses}), view ${probe.view}`,
      { cause: error },
    );
  }

  // Face into the plot (one short tap toward its centre on the axis with
  // the larger distance) so the facing cell lies inside the plot.
  const bounds = M23.bounds[plot];
  const centre = {
    x: ((bounds.minCol + bounds.maxCol + 1) * 32) / 2,
    y: ((bounds.minRow + bounds.maxRow + 1) * 32) / 2,
  };
  const dx = centre.x - x;
  const dy = centre.y - y;
  const key =
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0
        ? 'ArrowRight'
        : 'ArrowLeft'
      : dy > 0
        ? 'ArrowDown'
        : 'ArrowUp';

  await hold(page, key, 40);
  await page.waitForTimeout(150);
}

/* ------------------------------------------------------------------ *
 * 8. M23 browser — technical fixtures
 * ------------------------------------------------------------------ */

test.describe('M23 browser — technical fixtures (Unit 23)', () => {
  test('B2 (pointer, stop_left, AB): the pad and the panel by the pointer; OPEN PLOT B; a scan and the first failure; STOP THIS PLOT on the left with one click; B terminal / A available; A recovered at its key; the series completes by itself', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYardAssigned(page, 'm23p', {
      failure_option_order: 'stop_left',
      plot_order: 'AB',
    });
    await openSeries(page, 'pointer');
    expect((await m23Probe(page)).assignment.failure_option_order).toBe(
      'stop_left',
    );
    await openPlot(page, 'plot_b', 'pointer');
    await walkIntoPlot(page, 'plot_b');
    await walkInsidePlot(page, 'plot_b');
    await shot(page, 'b2-01-b-searching-pointer');

    const reading = await scanHere(page, 'pointer');

    expect(reading.trend).toBe('NO COMPARISON');
    expect((await m23Field(page))?.scanner.join(' ')).toContain('/ 100');
    await failFirst(page, 'pointer');

    const labels = await optionLabels(page);

    expect(labels.left).toBe(HAND.text.stop);
    expect(labels.right).toBe(HAND.text.continue);
    expect(labels.focus).toMatch(/^ff_landing_/);
    await shot(page, 'first-failure-stop-left-800x600');
    await chooseFailure(page, 'stop', 'pointer');

    const after = await m23Probe(page);

    expect(after.plots.plot_b.status).toBe('stopped');
    expect(after.plots.plot_b.response).toBe('stop');
    expect(after.plots.plot_b.observed_continuation).toBe(false);
    expect(after.selected).toBeNull();
    expect(after.plots.plot_a.status).toBe('not_started');
    expect(await countOf(page, 'stop_requested')).toBe(0);
    expect(await countOf(page, 'failure_choice')).toBe(1);

    const choice = (await eventsOf(page, 'failure_choice'))[0];

    expect(metaOf(choice).chosen_visual_side).toBe('left');
    expect(metaOf(choice).input_mode).toBe('pointer');
    expect(metaOf(choice).navigation_steps).toBe(0);
    expect(metaOf(choice).option_order).toBe('stop_left');
    expect(await lastFeedback(page)).toContain('Plot B is stopped');

    // B terminal / A available on the selector (no plot in work: the pad
    // is hidden, so the panel is the stake's own surface again).
    await openStakeSurface(page);
    await waitView(page, 'selector');
    expect(await statusLabel(page, 'plot_b')).toContain('Stopped');
    expect(await statusLabel(page, 'plot_a')).toContain('Not started');
    await shot(page, 'b-terminal-a-available-800x600');
    await openPlot(page, 'plot_a', 'pointer');
    await walkIntoPlot(page, 'plot_a');
    await faceCell(page, await keyCellOf(page, 'plot_a'));
    await digFacing(page, 'pointer', 'recovered');

    const done = await m23Probe(page);

    expect(done.plots.plot_a.status).toBe('recovered');
    expect(done.plots.plot_a.tray).toBe(true);
    expect(done.plots.plot_a.first_failure).toBeNull();
    expect(done.closure).toEqual({
      trigger: 'both_plots_terminal',
      reason: 'voluntary_stop',
    });
    expect(done.window).toBe('closed');
    expect(done.tray).toEqual(['A']);
    expect(await lastFeedback(page)).toContain(
      'Component recovered from Plot A',
    );
    expect(await itemStatus(page, 'M23')).toBe('completed');

    const closed = await eventsOf(page, 'window_closed');

    expect(closed).toHaveLength(1);
    expect(metaOf(closed[0]).exit_state).toBe('stopped');
    expect(metaOf(closed[0]).raw_components).toBeDefined();

    const row = await rowOf(page);

    expect(row.value).toBe(0);
    expect(row.numerator).toBe(0);
    expect(row.denominator).toBe(1);
    expect(row.disposition).toBe('observed');
    expect(row.included_ids).toEqual(['plot_b']);
    expect(comps(row).recovered_without_failure_ids).toEqual(['plot_a']);
    expectNoRuntimeErrors(errors);
  });

  test('B3 (technical fixture): a reload during the brief replays the demo with no opening; the first usable selector is the one opening across loads; a later reload locks the stake with its own line', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm23r');
    await openStakeSurface(page);
    await waitView(page, 'brief');
    await activate(page, 'control_example_', 'keyboard');
    await waitView(page, 'example_1');
    expect(await countOf(page, 'presented')).toBe(1);
    expect(await countOf(page, 'closure_explanation_presented')).toBe(1);
    expect(await countOf(page, 'opportunity_opened')).toBe(0);

    // R01: the reload during the demo.
    await reloadToYard(page);
    await openStakeSurface(page);
    await waitView(page, 'brief');

    const replayed = await m23Probe(page);

    expect(replayed.status).toBe('presented');
    expect(replayed.opened).toBe(false);
    expect(await countOf(page, 'reload_blocked')).toBe(0);

    const loads = (await m23Events(page)).map(
      (event) => (event as { page_load_index?: number }).page_load_index,
    );

    expect(loads).toContain(2);
    await briefToSelector(page, 'keyboard');
    expect((await m23Probe(page)).opened).toBe(true);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    expect(
      (await eventsOf(page, 'opportunity_opened'))[0].metadata
        ?.entry_state_snapshot,
    ).toMatchObject({ layout_id: 'a_adjusted_v1', plots_planned: 2 });
    await stepAway(page, 'keyboard');

    // R02: the reload after the measured opening locks the current load.
    await reloadToYard(page);
    await pressStakeExpectLine(page, 'cannot be restarted');
    await shot(page, 'reload-lock-800x600');

    const locked = await m23Probe(page);

    expect(locked.status).toBe('held_back');
    expect(locked.opened).toBe(false);
    expect(await countOf(page, 'reload_blocked')).toBe(1);
    // The page's buffer holds this load's records: no opening in load 3
    // (the earlier load's opening is what locked it, read by the guard).
    expect(await countOf(page, 'opportunity_opened')).toBe(0);
    expect(await countOf(page, 'presented')).toBe(0);
    // P in the field is inert on a locked series; C / D stay ordinary.
    await press(page, 'p');
    await page.waitForTimeout(500);
    expect((await surface(page))?.open ?? false).toBe(false);

    const row = await rowOf(page, 3, true);

    expect(row.disposition).toBe('interrupted');
    expect(row.value).toBeNull();
    expect(row.denominator).toBe(0);
    expect(comps(row).held_back_after_reload).toBe(true);
    expectNoRuntimeErrors(errors);
  });

  test('B4 (keyboard): the static examples record views and no attempt; a held ENTER on the neutral landing commits nothing; TAB cycles the five controls; HELP from the first failure replays page 1 and returns to the same choice; CONTINUE by SPACE; the one closure explanation is the brief that was shown', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm23k');
    await openStakeSurface(page);
    await waitView(page, 'brief');

    const brief = await surface(page);

    expect(
      brief?.elements.find((e) => e.id.startsWith('brief_'))?.label,
    ).toContain(HAND.text.closure);
    await activate(page, 'control_example_', 'keyboard');
    await waitView(page, 'example_1');
    expect(
      (await surface(page))?.elements.find((e) =>
        e.id.startsWith('example_body_1_'),
      )?.label,
    ).toContain('50 / 100 — MODERATE');
    await activate(page, 'next_', 'keyboard');
    await waitView(page, 'example_2');
    await activate(page, 'back_', 'keyboard');
    await waitView(page, 'example_1');
    await activate(page, 'next_', 'keyboard');
    await waitView(page, 'example_2');
    await shot(page, 'static-example-800x600');
    await activate(page, 'open_plot_panel_', 'keyboard');
    await waitView(page, 'selector');
    expect(await countOf(page, 'example_viewed')).toBe(4);
    expect(await countOf(page, 'action_started')).toBe(0);
    expect(await countOf(page, 'dig_resolved')).toBe(0);
    expect(await countOf(page, 'scan_resolved')).toBe(0);
    expect(await countOf(page, 'closure_explanation_presented')).toBe(1);
    expect(await countOf(page, 'opportunity_opened')).toBe(1);
    await openPlot(page, 'plot_a', 'keyboard');
    await walkIntoPlot(page, 'plot_a');
    await failFirst(page, 'keyboard');
    expect(await countOf(page, 'failure_choice_presented')).toBe(1);

    const presentationId = (await m23Probe(page)).plots.plot_a.presentation?.id;

    // A held ENTER on the neutral landing: no response, no record.
    expect((await surface(page))?.focus).toMatch(/^ff_landing_/);
    await hold(page, 'Enter', 900);
    await page.waitForTimeout(300);
    expect((await m23Probe(page)).plots.plot_a.response).toBeNull();
    expect(await countOf(page, 'failure_choice')).toBe(0);
    expect((await m23Probe(page)).view).toBe('first_failure');

    // TAB cycles neutral → right → HELP → STEP AWAY → left → neutral.
    const seen: string[] = [];

    for (let step = 0; step < 5; step += 1) {
      await press(page, 'Tab');
      await page.waitForTimeout(120);
      seen.push((await surface(page))?.focus ?? '');
    }

    expect(seen[0]).toMatch(/^ff_right_/);
    expect(seen[1]).toMatch(/^help_/);
    expect(seen[2]).toMatch(/^step_away_/);
    expect(seen[3]).toMatch(/^ff_left_/);
    expect(seen[4]).toMatch(/^ff_landing_/);
    expect((await m23Probe(page)).plots.plot_a.response).toBeNull();

    // HELP replays page 1 and returns to the same unanswered choice.
    await keyActivatePrefix(page, 'help_');
    await waitView(page, 'example_1');
    expect(await countOf(page, 'help_opened')).toBe(1);
    expect(metaOf((await eventsOf(page, 'help_opened'))[0]).origin_view).toBe(
      'first_failure',
    );
    await activate(page, 'close_help_', 'keyboard');
    await waitView(page, 'first_failure');
    expect((await m23Probe(page)).plots.plot_a.presentation?.id).toBe(
      presentationId,
    );
    expect((await m23Probe(page)).plots.plot_a.response).toBeNull();

    // CONTINUE by SPACE after one arrow step.
    await chooseFailure(page, 'continue', 'keyboard', 'Space');

    const choice = (await eventsOf(page, 'failure_choice'))[0];

    expect(metaOf(choice).response).toBe('continue');
    expect(metaOf(choice).navigation_steps).toBe(1);
    expect(metaOf(choice).presentation_id).toBe(presentationId);
    expect((await m23Probe(page)).plots.plot_a.status).toBe('searching');
    expect(await anyFeedback(page)).toContain('Search resumed');
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * 9. M23 STOP navigation
 * ------------------------------------------------------------------ */

test.describe('M23 STOP navigation (Unit 23)', () => {
  test('S1 (keyboard): pre-failure P → STOP → BACK; ESC pauses; RESUME; the first failure; STEP AWAY and RESUME serve the same choice; CONTINUE; a later selector STOP confirms with no second failure_choice and resolves 0', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm23s1');
    await startPlot(page, 'plot_a', 'keyboard');
    await openPanel(page, 'keyboard');
    await waitView(page, 'selector');
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    expect(await statusLabel(page, 'plot_a')).toContain('Paused');
    await requestStop(page, 'plot_a', 'keyboard');
    expect(await countOf(page, 'stop_requested')).toBe(1);
    await backFromStop(page, 'plot_a', 'keyboard');
    expect(await countOf(page, 'stop_cancelled')).toBe(1);
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    // ESC on the selector is the pause (the surface closes).
    await page.waitForTimeout(M23.settleMs + 100);
    await press(page, 'Escape');
    await waitSurface(page, false);
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    await openPanel(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await waitM23(page, (probe) => probe.plots.plot_a.status === 'searching');
    expect(await countOf(page, 'resumed')).toBe(1);
    await failFirst(page, 'keyboard');

    const first = (await m23Probe(page)).plots.plot_a.presentation!;

    await stepAway(page, 'keyboard');
    expect((await m23Probe(page)).plots.plot_a.status).toBe('choice_pending');
    await openPanel(page, 'keyboard');
    await waitView(page, 'selector');
    expect(await statusLabel(page, 'plot_a')).toContain('Choose next step');
    await openPlot(page, 'plot_a', 'keyboard');
    await waitView(page, 'first_failure');

    const again = (await m23Probe(page)).plots.plot_a.presentation!;

    expect(again.id).toBe(first.id);
    expect(again.count).toBe(2);
    expect(await countOf(page, 'failure_choice_presented')).toBe(2);
    expect(
      metaOf((await eventsOf(page, 'failure_choice_presented'))[1]).resume,
    ).toBe(true);
    await chooseFailure(page, 'continue', 'keyboard');
    expect((await m23Probe(page)).plots.plot_a.response).toBe('continue');
    // The later STOP from the selector: request, confirm, no second response.
    await openPanel(page, 'keyboard');
    await requestStop(page, 'plot_a', 'keyboard');
    await confirmStop(page, 'plot_a', 'keyboard');
    expect(await countOf(page, 'failure_choice')).toBe(1);
    expect(await countOf(page, 'stop_requested')).toBe(2);

    const stopped = await m23Probe(page);

    expect(stopped.plots.plot_a.status).toBe('stopped');
    expect(stopped.plots.plot_a.observed_continuation).toBe(false);
    expect(stopped.plots.plot_a.credit).toBeNull();
    expect(stopped.view).toBe('selector');

    const closed = (await eventsOf(page, 'plot_closed')).pop()!;

    expect(metaOf(closed).plot_closure_reason).toBe('explicit_stop');
    expect(metaOf(closed).confirmed_stop).toBe(true);
    expect(metaOf(closed).source).toBe('selector');
    expect(metaOf(closed).observed_continuation).toBe(false);

    const row = await rowOf(page);

    expect(row.disposition).toBe('pending');
    expect(row.denominator).toBe(1);
    expect(comps(row).observed_count).toBe(0);
    expect(comps(row).known_outcomes_by_plot).toEqual({ plot_a: 0 });
    expectNoRuntimeErrors(errors);
  });

  test('S2 (pointer): a selector STOP before any opening of B creates no work (stopped_before_failure); A fails, CONTINUE, the credited scan, then the confirmed STOP preserves the 1; the series completes', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm23s2');
    await openSeries(page, 'pointer');
    await requestStop(page, 'plot_b', 'pointer');
    await shot(page, 'selector-stop-confirmation-b-800x600');
    await confirmStop(page, 'plot_b', 'pointer');

    const preStop = await m23Probe(page);

    expect(preStop.plots.plot_b.status).toBe('stopped');
    expect(preStop.plots.plot_b.opened).toBe(false);
    expect(preStop.plots.plot_b.first_failure).toBeNull();
    expect(preStop.plots.plot_b.observed_continuation).toBeNull();
    expect(
      (await eventsOf(page, 'plot_opened')).filter(
        (event) => metaOf(event).plot_id === 'plot_b',
      ),
    ).toHaveLength(0);
    expect(
      metaOf((await eventsOf(page, 'plot_closed'))[0]).stopped_before_failure,
    ).toBe(true);
    expect(await countOf(page, 'failure_choice')).toBe(0);
    await openPlot(page, 'plot_a', 'pointer');
    await walkIntoPlot(page, 'plot_a');
    await failFirst(page, 'pointer');
    await chooseFailure(page, 'continue', 'pointer');
    await walkInsidePlot(page, 'plot_a');

    const credit = await scanHere(page, 'pointer');

    expect(credit.strength).toBeGreaterThanOrEqual(0);
    expect((await m23Probe(page)).plots.plot_a.credit).not.toBeNull();
    await openPanel(page, 'pointer');
    await waitView(page, 'selector');
    await shot(page, 'selector-after-continue-800x600');
    await requestStop(page, 'plot_a', 'pointer');
    await confirmStop(page, 'plot_a', 'pointer');

    const done = await m23Probe(page);

    expect(done.plots.plot_a.observed_continuation).toBe(true);
    expect(done.closure).toEqual({
      trigger: 'both_plots_terminal',
      reason: 'voluntary_stop',
    });
    expect(done.view).toBe('record');
    expect(await countOf(page, 'failure_choice')).toBe(1);
    expect(await itemStatus(page, 'M23')).toBe('completed');

    const row = await rowOf(page);

    expect(row.value).toBe(1);
    expect(row.numerator).toBe(1);
    expect(row.denominator).toBe(1);
    expect(row.disposition).toBe('observed');
    expect(comps(row).stopped_before_failure_ids).toEqual(['plot_b']);
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * 10. M23 boundaries and refusals
 * ------------------------------------------------------------------ */

test.describe('M23 boundaries and refusals (Unit 23)', () => {
  test('X1 (keyboard): C and D before any opening are ordinary (no reading inside a plot, a sealed dig, no family record); both pre-failure stops close the series no_eligible_event; C and D on the terminal plots are exact refusals', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm23x1');
    // Inside plot A before the series was ever presented: C and D are the
    // series' own refusals (`plot_not_active`, the pinned line, a record)
    // — never a reading over the inactive target, never the ground's line
    // (contract §3, F5).
    await walkInsidePlot(page, 'plot_a');
    await press(page, 'c');
    await page.waitForTimeout(600);
    expect(await lastFeedback(page)).toContain('Open the plot panel');
    expect((await faProbe(page)).scan.last).toBeNull();
    await press(page, 'd');
    await page.waitForTimeout(600);
    expect(await lastFeedback(page)).toContain('Open the plot panel');
    expect((await faProbe(page)).dig.last).toBeNull();

    const early = await eventsOf(page, 'action_refused');

    expect(early).toHaveLength(2);
    expect(early.map((event) => metaOf(event).reason)).toEqual([
      'plot_not_active',
      'plot_not_active',
    ]);
    expect(early.map((event) => metaOf(event).attempted_kind)).toEqual([
      'scan',
      'dig',
    ]);
    expect(await countOf(page, 'scan_resolved')).toBe(0);
    expect(await countOf(page, 'presented')).toBe(0);
    // Round 3 (OD-4): the boundary ring of EITHER plot before any opening
    // refuses like the rectangle — the ring plot associated, no ordinary
    // scan or dig, nothing started or resumed.
    for (const plot of ['plot_a', 'plot_b'] as const) {
      await yardVia(page, M23.entry[plot].x, M23.entry[plot].y);
      await page.waitForTimeout(300);
      await ringPress(page, 'scan', { reason: 'plot_not_active', plot });
      await ringPress(page, 'dig', { reason: 'plot_not_active', plot });
    }

    expect(await countOf(page, 'presented')).toBe(0);
    await openSeries(page, 'keyboard');
    await requestStop(page, 'plot_a', 'keyboard');
    await confirmStop(page, 'plot_a', 'keyboard');
    await requestStop(page, 'plot_b', 'keyboard');
    await confirmStop(page, 'plot_b', 'keyboard');

    const probe = await m23Probe(page);

    expect(probe.status).toBe('closed');
    expect(probe.closure).toEqual({
      trigger: 'both_plots_terminal',
      reason: 'voluntary_stop',
    });
    expect(probe.view).toBe('record');
    expect(await countOf(page, 'plot_opened')).toBe(0);
    expect(await countOf(page, 'action_started')).toBe(0);
    await stepAway(page, 'keyboard');
    expect(await itemStatus(page, 'M23')).toBe('completed');

    const row = await rowOf(page);

    expect(row.disposition).toBe('no_eligible_event');
    expect(row.missing_reason).toBe('stopped_before_failure');
    expect(row.denominator).toBe(0);
    // Refusals on the closed series: exact, never a resolution.
    await walkInsidePlot(page, 'plot_a');
    await press(page, 'c');
    await page.waitForTimeout(600);
    expect(await countOf(page, 'scan_resolved')).toBe(0);
    await press(page, 'd');
    await page.waitForTimeout(600);
    expect(await countOf(page, 'dig_resolved')).toBe(0);
    await pressStakeExpectLine(page, 'closed for this shift');
    expectNoRuntimeErrors(errors);
  });

  test("X2 (keyboard, BA): A recovered keeps B available; an approach refuses C outside the region; the first failure, STEP AWAY, C while the choice is pending is refused; Noor's informed shift end resolves the unanswered usable choice to 0; the closure is written once", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYardAssigned(page, 'm23x2', { plot_order: 'BA' });
    await openSeries(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await walkIntoPlot(page, 'plot_a');
    await faceCell(page, await keyCellOf(page, 'plot_a'));
    await digFacing(page, 'keyboard', 'recovered');
    expect((await m23Probe(page)).plots.plot_a.status).toBe('recovered');
    expect((await m23Probe(page)).status).toBe('open');
    await openPanel(page, 'keyboard');
    await waitView(page, 'selector');
    expect(await statusLabel(page, 'plot_a')).toContain('Recovered');
    expect(await statusLabel(page, 'plot_b')).toContain('Not started');
    await shot(page, 'a-terminal-b-available-800x600');
    // OPEN PLOT B from the stake's approach: approaching; C is refused.
    await openPlot(page, 'plot_b', 'keyboard');
    expect((await m23Probe(page)).plots.plot_b.status).toBe('approaching');
    await press(page, 'c');
    await page.waitForTimeout(600);
    expect(await anyFeedback(page)).toContain('Walk into the selected plot');

    const refusals = await eventsOf(page, 'action_refused');

    expect(refusals).toHaveLength(1);
    expect(metaOf(refusals[0]).reason).toBe('outside_scan_region');
    expect(metaOf(refusals[0]).plot_id).toBe('plot_b');
    expect(await countOf(page, 'scan_resolved')).toBe(0);
    await walkIntoPlot(page, 'plot_b');
    // E at the stake while B is in work (the entry stance is inside the
    // stake's radius): the deliberate interaction pauses the plot FIRST
    // (§12 M2), then the selector opens over a paused plot; RESUME inside
    // is searching again.
    await press(page, 'e');
    await waitSurface(page, true, M23.surface);
    await waitView(page, 'selector');
    expect((await m23Probe(page)).plots.plot_b.status).toBe('paused');
    expect(metaOf((await eventsOf(page, 'paused')).pop()!).cause).toBe('panel');
    expect(await statusLabel(page, 'plot_b')).toContain('Paused');
    await openPlot(page, 'plot_b', 'keyboard');
    await waitM23(page, (probe) => probe.plots.plot_b.status === 'searching');
    await failFirst(page, 'keyboard');
    await stepAway(page, 'keyboard');
    expect((await m23Probe(page)).plots.plot_b.status).toBe('choice_pending');
    await press(page, 'c');
    await page.waitForTimeout(600);
    expect(await anyFeedback(page)).toContain('Open the plot panel');
    expect(metaOf((await eventsOf(page, 'action_refused')).pop()!).reason).toBe(
      'choice_pending',
    );
    expect((await m23Probe(page)).plots.plot_b.response).toBeNull();
    // Noor: the informed participant shift end.
    await finishOutside(page);

    const closed = await m23Probe(page);

    expect(closed.status).toBe('closed');
    expect(closed.closure).toEqual({
      trigger: 'shift_end',
      reason: 'session_end',
    });
    expect(closed.plots.plot_b.status).toBe('closed_shift_end');
    expect(closed.plots.plot_b.observed_continuation).toBe(false);
    expect(await countOf(page, 'failure_choice')).toBe(0);

    const plotClosed = (await eventsOf(page, 'plot_closed')).filter(
      (event) => metaOf(event).plot_id === 'plot_b',
    );

    expect(plotClosed).toHaveLength(1);
    expect(metaOf(plotClosed[0]).informed_shift_end).toBe(true);
    expect(metaOf(plotClosed[0]).participant_initiated).toBe(true);
    expect(metaOf(plotClosed[0]).shift_end_command_id).toBe(
      'noor_finished_outside',
    );
    expect(await countOf(page, 'window_closed')).toBe(1);
    expect(await itemStatus(page, 'M23')).toBe('completed');

    const row = await rowOf(page);

    expect(row.value).toBe(0);
    expect(row.numerator).toBe(0);
    expect(row.denominator).toBe(1);
    expect(row.disposition).toBe('observed');
    expect(comps(row).shift_end_resolved_zero_ids).toEqual(['plot_b']);
    expectNoRuntimeErrors(errors);
  });
});

test.describe('M23 boundaries and refusals — round 3 (Unit 23)', () => {
  test("X3 (keyboard): the boundary ring in every non-live state — paused after the region exit (own ring and the other plot's), awaiting the choice, terminal, and held back after the reload — refuses like the rectangle on both plots: one exact refusal each, no ordinary scan or dig, nothing started or resumed, the row unchanged", async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm23x3');
    await openSeries(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await walkIntoPlot(page, 'plot_a');
    // The region exit pauses A; walking back into its ring never resumes it.
    await yardVia(page, M23.approach.x, M23.approach.y);
    await waitM23(page, (probe) => probe.plots.plot_a.status === 'paused');
    // Round 4 (OD-1 restoration): the frame released by the REGION EXIT,
    // the stake's own prompt is back within one frame (the avatar stands
    // 44 px from the stake).
    await page.waitForTimeout(150);
    expect((await worldPrompt(page)).text).toContain('Excavation Field Stake');
    await yardVia(page, M23.entry.plot_a.x, M23.entry.plot_a.y);
    await page.waitForTimeout(400);
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    expect(await countOf(page, 'resumed')).toBe(0);

    const pausedA = { reason: 'plot_not_active', plot: 'plot_a' as const };

    await ringPress(page, 'scan', pausedA);
    await ringPress(page, 'dig', pausedA);
    // The other plot's ring while A is the paused selection: still A.
    await yardVia(page, M23.entry.plot_b.x, M23.entry.plot_b.y);
    await page.waitForTimeout(400);
    await ringPress(page, 'scan', pausedA);
    await ringPress(page, 'dig', pausedA);
    // RESUME is explicit (the panel): from A's ring the plot searches again.
    await yardVia(page, M23.entry.plot_a.x, M23.entry.plot_a.y);
    await openPanel(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await waitM23(page, (probe) => probe.plots.plot_a.status === 'searching');
    expect(await countOf(page, 'resumed')).toBe(1);
    // The pending choice, stepped away from: choice_pending in the ring.
    await walkInsidePlot(page, 'plot_a');
    await failFirst(page, 'keyboard');
    await stepAway(page, 'keyboard');
    expect((await m23Probe(page)).plots.plot_a.status).toBe('choice_pending');
    await yardVia(page, M23.entry.plot_a.x, M23.entry.plot_a.y);
    await page.waitForTimeout(400);
    await ringPress(page, 'scan', { reason: 'choice_pending', plot: 'plot_a' });
    await ringPress(page, 'dig', { reason: 'choice_pending', plot: 'plot_a' });
    // Terminal A (the served choice, STOP THIS PLOT): A's ring → plot_terminal,
    // B's ring → plot_not_active with B associated.
    await openPanel(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await chooseFailure(page, 'stop', 'keyboard');
    // The direct STOP commits and closes the surface itself (the room's
    // "Plot A is stopped" line); nothing is selected afterwards.
    expect((await m23Probe(page)).plots.plot_a.status).toBe('stopped');
    expect((await m23Probe(page)).selected).toBeNull();
    await yardVia(page, M23.entry.plot_a.x, M23.entry.plot_a.y);
    await page.waitForTimeout(400);
    await ringPress(page, 'scan', { reason: 'plot_terminal', plot: 'plot_a' });
    await ringPress(page, 'dig', { reason: 'plot_terminal', plot: 'plot_a' });
    const inactiveB = { reason: 'plot_not_active', plot: 'plot_b' as const };

    await yardVia(page, M23.entry.plot_b.x, M23.entry.plot_b.y);
    await page.waitForTimeout(400);
    await ringPress(page, 'scan', inactiveB);
    await ringPress(page, 'dig', inactiveB);
    // Held back after the reload: the ring refuses on the locked series.
    await reloadToYard(page);
    expect((await m23Probe(page)).status).toBe('held_back');
    await yardVia(page, M23.entry.plot_b.x, M23.entry.plot_b.y);
    await page.waitForTimeout(400);
    await ringPress(page, 'scan', inactiveB);
    await ringPress(page, 'dig', inactiveB);
    expect((await m23Probe(page)).status).toBe('held_back');
    expectNoRuntimeErrors(errors);
  });

  for (const viewport of [
    { width: 800, height: 600 },
    { width: 1280, height: 720 },
  ]) {
    const vp = `${viewport.width}x${viewport.height}`;

    test(`X4 (keyboard, ${viewport.width} × ${viewport.height}): the foreign mast station beside Plot A's west ring — its prompt and the scanner readout are readable at once (the prompt crosses no readout text, cell or control); E opens the mast (M23 pauses with cause overlay; the M20 brief is presented, nothing accepted) and its own control closes it; the known 1, the failure and the presentation are intact and nothing resumed`, async ({
      page,
    }) => {
      test.setTimeout(900_000);

      const errors = captureErrors(page);

      await page.setViewportSize(viewport);
      await enterYard(page, `m23x4${viewport.width}`);
      await openSeries(page, 'keyboard');
      await openPlot(page, 'plot_a', 'keyboard');
      await walkIntoPlot(page, 'plot_a');
      await walkInsidePlot(page, 'plot_a');
      await scanHere(page, 'keyboard');
      await failFirst(page, 'keyboard');
      await chooseFailure(page, 'continue', 'keyboard');
      await scanHere(page, 'keyboard');

      const known = await m23Probe(page);

      expect(known.plots.plot_a.credit).not.toBeNull();
      expect(known.plots.plot_a.status).toBe('searching');
      // The west ring stance (the R2 fixture's west-outer, 848 / 348), then
      // short steps west until the mast (777, 334; radius 72) prompts; the
      // stance stays in A's region (the RIGHT probe reaches col 27 at x ≥ 837).
      await standAt(page, 'plot_a', 848, 348);

      for (let nudge = 0; nudge < 3; nudge += 1) {
        if (((await worldPrompt(page)).text ?? '').includes('Mast 04')) {
          break;
        }

        await hold(page, 'ArrowLeft', 30);
        await page.waitForTimeout(250);
      }

      const prompt = await worldPrompt(page);
      const stance = await playerAt(page);

      expect(prompt.prompt).toBe(true);
      expect(prompt.text).toContain('Mast 04');
      expect(stance.x).toBeGreaterThanOrEqual(837);
      expect((await m23Probe(page)).plots.plot_a.status).toBe('searching');

      const rect = await expectHudClearOfPlot(page, 'plot_a');
      // Round 4: the prompt's ACTUAL bounds against the HUD texts, the pad
      // and the plot — readable at once (the HUD sits below the prompt's
      // layer and its rows avoid the prompt's band).
      const promptBounds = await yardPromptBounds(page);
      const field = (await m23Field(page))!;

      expect(promptBounds?.text).toContain('Mast 04');

      const band = promptBounds!.bounds;
      const clear = (
        box: { x: number; y: number; w: number; h: number },
        what: string,
      ) => {
        const hit =
          band.x < box.x + box.w &&
          box.x < band.x + band.w &&
          band.y < box.y + box.h &&
          box.y < band.y + band.h;

        expect(hit, `the mast prompt over ${what}`).toBe(false);
      };

      clear(field.scanner_bounds, 'the scanner readout text');
      clear(field.dig_bounds, 'the dig readout text');
      clear(field.tray_bounds, 'the tray text');
      clear(rect, 'the plot');

      for (const button of field.buttons) {
        clear(button, `the pad button ${button.id}`);
      }

      if (field.feedback_bounds !== null) {
        clear(field.feedback_bounds, 'the feedback line');
      }

      expect(field.scanner.join(' ')).toMatch(/\/ 100 — /);
      await shot(page, `mast-prompt-west-ring-${vp}`);

      const before = await m23Probe(page);
      const rowBefore = await rowOf(page);
      const resumedBefore = await countOf(page, 'resumed');
      const cancelledBefore = await countOf(page, 'action_cancelled');
      const briefsBefore = (
        await eventsByType(page, 'proto_m20_feed_outdoor_brief_presented')
      ).length;

      expect(briefsBefore).toBe(0);
      // E at the mast: the base scene opens its prompt only while no world
      // action runs, so no scan can be in flight here; M23 pauses first.
      await press(page, 'e');
      await page.waitForFunction(
        () =>
          (
            (
              window as unknown as {
                __promptCards?: { label: string }[] | null;
              }
            ).__promptCards ?? []
          ).some((card) => card.label === 'Step away'),
        undefined,
        { timeout: 8000 },
      );

      const paused = await m23Probe(page);
      const pauses = await eventsOf(page, 'paused');

      expect(paused.plots.plot_a.status).toBe('paused');
      expect(paused.plots.plot_a.pauses).toBe(before.plots.plot_a.pauses + 1);
      expect(metaOf(pauses[pauses.length - 1]).cause).toBe('overlay');
      expect(await countOf(page, 'action_cancelled')).toBe(cancelledBefore);
      expect((await m23Field(page))?.visible).toBe(false);
      // The mast's own behaviour (M20): the station opened — its prompt
      // cards and exactly one outdoor brief presented — nothing accepted
      // and no stage done; closed through its own "Step away".
      expect(
        (await eventsByType(page, 'proto_m20_feed_outdoor_brief_presented'))
          .length,
      ).toBe(1);
      expect(
        (await eventsByType(page, 'proto_m20_feed_outdoor_accepted')).length,
      ).toBe(0);
      expect((await exteriorProbe(page)).m20.accepted).toBe(false);
      expect((await exteriorProbe(page)).m20.stages_done).toEqual([]);

      const labels = await promptLabels(page);

      expect(labels).toContain('Accept the restoration');
      expect(labels).toContain('Step away');
      await selectPromptOption(page, labels.indexOf('Step away') + 1);
      await page.waitForTimeout(500);
      expect(await promptLabels(page)).toEqual([]);
      expect((await exteriorProbe(page)).m20.accepted).toBe(false);
      expect(
        (await eventsByType(page, 'proto_m20_feed_outdoor_accepted')).length,
      ).toBe(0);

      const after = await m23Probe(page);
      const rowAfter = await rowOf(page);

      expect(after.plots.plot_a.status).toBe('paused');
      expect(after.plots.plot_a.credit).toBe(before.plots.plot_a.credit);
      expect(after.plots.plot_a.first_failure).toEqual(
        before.plots.plot_a.first_failure,
      );
      expect(after.plots.plot_a.presentation?.id).toBe(
        before.plots.plot_a.presentation?.id,
      );
      expect(after.plots.plot_a.scans).toBe(before.plots.plot_a.scans);
      expect(after.plots.plot_a.digs).toBe(before.plots.plot_a.digs);
      expect(after.plots.plot_b.status).toBe(before.plots.plot_b.status);
      expect(after.selected).toBe('plot_a');
      expect(await countOf(page, 'resumed')).toBe(resumedBefore);
      expect([
        rowAfter.value,
        rowAfter.numerator,
        rowAfter.denominator,
        rowAfter.disposition,
      ]).toEqual([
        rowBefore.value,
        rowBefore.numerator,
        rowBefore.denominator,
        rowBefore.disposition,
      ]);
      expect(comps(rowAfter).known_outcomes_by_plot).toEqual(
        comps(rowBefore).known_outcomes_by_plot,
      );
      expectNoRuntimeErrors(errors);
    });
  }

  test('X5 (keyboard): the overlap band on the shared border — a stance in BOTH probe regions outside both rectangles is governed with NO plot associated before any opening, and with the paused selection afterwards; refusal only, nothing started or resumed', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm23x5');
    await standInOverlapBand(page);
    await ringPress(page, 'scan', { reason: 'plot_not_active', plot: null });
    await ringPress(page, 'dig', { reason: 'plot_not_active', plot: null });
    expect(await countOf(page, 'presented')).toBe(0);
    await openSeries(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await walkIntoPlot(page, 'plot_a');
    await yardVia(page, M23.approach.x, M23.approach.y);
    await waitM23(page, (probe) => probe.plots.plot_a.status === 'paused');
    await standInOverlapBand(page);
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    expect(await countOf(page, 'resumed')).toBe(0);

    const pausedA = { reason: 'plot_not_active', plot: 'plot_a' as const };

    await ringPress(page, 'scan', pausedA);
    await ringPress(page, 'dig', pausedA);
    expectNoRuntimeErrors(errors);
  });
});

/**
 * Round 4: a stance in the P08 overlap band — outside both rectangles, inside
 * BOTH probe regions (x 1088–1114, y 252–255 by the hand-written region):
 * the walk, then short taps until the hand predicate holds for both plots.
 */
async function standInOverlapBand(page: Page) {
  const inBand = (at: { x: number; y: number }) =>
    at.y < 8 * 32 &&
    handMember('plot_a', at.x, at.y) &&
    handMember('plot_b', at.x, at.y);

  await yardVia(page, 1100, 253);
  await page.waitForTimeout(300);

  for (let tap = 0; tap < 12 && !inBand(await playerAt(page)); tap += 1) {
    const at = await playerAt(page);
    const key =
      at.y >= 256
        ? 'ArrowUp'
        : at.y < 252
          ? 'ArrowDown'
          : at.x < 1088
            ? 'ArrowRight'
            : 'ArrowLeft';

    await hold(page, key, 20);
    await page.waitForTimeout(200);
  }

  const at = await playerAt(page);

  expect(inBand(at), `overlap-band stance (${at.x}, ${at.y})`).toBe(true);
}

/* ------------------------------------------------------------------ *
 * 11. M23 cancellation
 * ------------------------------------------------------------------ */

test.describe('M23 cancellation (Unit 23)', () => {
  test("C (keyboard): after the failure and CONTINUE, a scan cut by a window blur is one system cancellation with the diagnostic and no credit; nothing completes later; a fresh scan is the 1 and the confirmed stop keeps it; on B a dig cut by P is the participant's own cancellation, a scan cut by a hidden page the system's, and the stop is 0 with the diagnostic", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm23c');
    await startPlot(page, 'plot_a', 'keyboard');
    await walkInsidePlot(page, 'plot_a');
    await failFirst(page, 'keyboard');
    await chooseFailure(page, 'continue', 'keyboard');

    const resolvedBefore = await countOf(page, 'scan_resolved');

    // A bare key (no settle): the cancellation must land inside the action.
    await page.keyboard.press('c');
    await waitM23(page, (probe) => probe.action !== null, 4000);

    const running = await m23Probe(page);

    expect(running.action?.kind).toBe('scan');
    await page.waitForTimeout(450);
    await blurPage(page);
    await waitM23(page, (probe) => probe.action === null, 4000);

    const afterBlur = await m23Probe(page);

    expect(
      {
        types: await m23EventTypes(page),
        cancelled: afterBlur.plots.plot_a.cancelled,
        status: afterBlur.plots.plot_a.status,
        started_at: running.action?.started_at_ms,
        now: afterBlur.now_ms,
      },
      'the blur cancelled the running scan',
    ).toMatchObject({ cancelled: 1, status: 'paused' });

    const cancelled = (await eventsOf(page, 'action_cancelled')).pop()!;

    expect(metaOf(cancelled).cancellation_reason).toBe('focus_loss');
    expect(metaOf(cancelled).continuation_started_then_system_cancelled).toBe(
      true,
    );
    expect(Number(metaOf(cancelled).elapsed_action_ms)).toBeGreaterThan(300);
    expect(Number(metaOf(cancelled).elapsed_action_ms)).toBeLessThan(1000);
    expect((await m23Probe(page)).plots.plot_a.credit).toBeNull();
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    await page.waitForTimeout(1300);
    expect(await countOf(page, 'scan_resolved')).toBe(resolvedBefore);
    await focusPage(page);
    await openPanel(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await waitM23(page, (probe) => probe.plots.plot_a.status === 'searching');
    await scanHere(page, 'keyboard');
    expect((await m23Probe(page)).plots.plot_a.credit).not.toBeNull();
    expect(
      (await m23Probe(page)).plots.plot_a.system_cancelled_after_continue,
    ).toHaveLength(1);
    await openPanel(page, 'keyboard');
    await requestStop(page, 'plot_a', 'keyboard');
    await confirmStop(page, 'plot_a', 'keyboard');
    expect((await m23Probe(page)).plots.plot_a.observed_continuation).toBe(
      true,
    );

    const resolvedAfterCredit = await countOf(page, 'scan_resolved');

    // Plot B.
    await openPlot(page, 'plot_b', 'keyboard');
    await walkIntoPlot(page, 'plot_b');
    await walkInsidePlot(page, 'plot_b');
    await failFirst(page, 'keyboard');
    await chooseFailure(page, 'continue', 'keyboard');

    const digsBefore = (await m23Probe(page)).plots.plot_b.digs;
    const target = (await m23Probe(page)).plots.plot_b.last_dig!.cell;

    // Face a different cell (one column east) and start a dig, then P.
    await faceCell(page, { col: target.col + 1, row: target.row });
    await page.keyboard.press('d');
    await waitM23(page, (probe) => probe.action !== null, 4000);
    await page.waitForTimeout(400);
    await press(page, 'p');
    await waitSurface(page, true, M23.surface);

    const byPanel = (await eventsOf(page, 'action_cancelled')).pop()!;

    expect(metaOf(byPanel).cancellation_reason).toBe('panel');
    expect(metaOf(byPanel).continuation_started_then_system_cancelled).toBe(
      false,
    );
    expect(metaOf(byPanel).kind).toBe('dig');
    expect((await m23Probe(page)).plots.plot_b.digs).toBe(digsBefore);
    expect((await m23Probe(page)).plots.plot_b.first_failure?.cell).toEqual(
      target,
    );
    await openPlot(page, 'plot_b', 'keyboard');
    await waitM23(page, (probe) => probe.plots.plot_b.status === 'searching');
    await page.keyboard.press('c');
    await waitM23(page, (probe) => probe.action !== null, 4000);
    await page.waitForTimeout(300);
    await hidePage(page);
    await waitM23(page, (probe) => probe.action === null, 4000);

    const hidden = (await eventsOf(page, 'action_cancelled')).pop()!;

    expect(metaOf(hidden).cancellation_reason).toBe('hidden');
    expect(metaOf(hidden).continuation_started_then_system_cancelled).toBe(
      true,
    );
    await showPage(page);
    // The world action ended with the pause (the framework's cancel): no
    // reading is ever shown for it.
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __fieldActionsProbe?: { worldActionActive: boolean } | null;
          }
        ).__fieldActionsProbe?.worldActionActive === false,
      undefined,
      { timeout: 8000 },
    );
    expect(await countOf(page, 'scan_resolved')).toBe(resolvedAfterCredit);
    await openPanel(page, 'keyboard');
    await requestStop(page, 'plot_b', 'keyboard');
    await confirmStop(page, 'plot_b', 'keyboard');

    const done = await m23Probe(page);

    expect(done.plots.plot_b.observed_continuation).toBe(false);
    expect(done.plots.plot_b.system_cancelled_after_continue).toHaveLength(1);
    expect(done.plots.plot_b.credit).toBeNull();

    const row = await rowOf(page);

    expect(row.value).toBe(1);
    expect(row.numerator).toBe(1);
    expect(row.denominator).toBe(2);
    expect(row.disposition).toBe('observed');
    expect(comps(row).continuation_started_then_system_cancelled_ids).toEqual(
      expect.arrayContaining(['plot_a', 'plot_b']),
    );
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * 12. M23 layout — both viewports
 * ------------------------------------------------------------------ */

const STANCES: Record<PlotKey, { name: string; x: number; y: number }[]> = {
  plot_a: [
    { name: 'south-entry', x: 1072, y: 464 },
    { name: 'interior', x: 976, y: 364 },
    { name: 'west-outer', x: 848, y: 348 },
    // North with the DOWN probe (0, +36): y 232 lands it 12 px inside row 8
    // (the edge stance y 220 is a member too, but a held-key arrival may
    // stop a few pixels short of it).
    { name: 'north', x: 976, y: 232 },
    // The corner extremes: the outer west column at the top and bottom
    // rows, the north edge at the inner-east column (col 33).
    { name: 'northwest-outer', x: 848, y: 260 },
    { name: 'southwest-outer', x: 848, y: 440 },
    { name: 'northeast', x: 1056, y: 232 },
  ],
  plot_b: [
    { name: 'south-entry', x: 1104, y: 464 },
    { name: 'interior', x: 1200, y: 364 },
    { name: 'east-outer', x: 1328, y: 348 },
    { name: 'north', x: 1200, y: 232 },
    // The corner extremes and the R2 rig-chip stance: the fixture's
    // (1338, 252) sits 1 px inside the region's east edge (the LEFT probe at
    // x 1311 against col 40's end at 1312), so the walk targets 4 px inward;
    // the rig chip's eligibility (its centre ≈ 105 px away) is the same.
    { name: 'rig-chip', x: 1334, y: 252 },
    { name: 'southeast-outer', x: 1328, y: 440 },
    { name: 'northeast', x: 1296, y: 232 },
  ],
};

/**
 * Round 3 (OD-8a): on the load's first fixed-frame entry the two verbatim
 * parts of the field-controls line show in order, each two rendered lines
 * clear of the plot's top edge, then the cell-label help; a scan started
 * during a part acts (nothing is blocked). Frames and sidecars per part.
 */
async function expectControlsSequence(page: Page, plot: PlotKey, vp: string) {
  const [part1, part2] = controlsParts(HAND.text.field_controls);
  const rect = await plotDesignRect(page, plot);
  const twoLines = (
    bounds: { x: number; y: number; w: number; h: number } | null,
    what: string,
  ) => {
    expect(bounds, what).not.toBeNull();
    expect(bounds!.h, `${what}: two rendered lines`).toBeGreaterThan(36);
    expect(bounds!.h, `${what}: two rendered lines`).toBeLessThan(48);
    expect(bounds!.y + bounds!.h, `${what} above the plot`).toBeLessThan(
      rect.y,
    );
  };
  const first = await waitFieldFeedback(page, part1, 4000);

  twoLines(first.feedback_bounds, 'part 1');
  await shot(page, `controls-part-1-${vp}`);

  // A scan during the part: it starts (nothing is blocked by the guidance).
  const started = await countOf(page, 'action_started');

  await press(page, 'c');
  expect(await countOf(page, 'action_started')).toBe(started + 1);

  const second = await waitFieldFeedback(page, part2, 9000);

  twoLines(second.feedback_bounds, 'part 2');
  await shot(page, `controls-part-2-${vp}`);
  expect(`${part1} ${part2}`).toBe(HAND.text.field_controls);
  await ensureFacingCell(page);
  await waitFieldFeedback(page, M23_TEXT.cell_label_help, 9000);
}

/**
 * The cell-label help is shown once WITH the first facing label: a body-valid
 * entry south of a plot usually ends facing up into it, but the walk's last
 * step can leave the avatar facing along the boundary ("Facing: outside
 * plot"), and then no help is due until a cell is faced (the round-4 pass's
 * L1 ended so and waited in vain). So, when needed, face up into the plot
 * with the 40 ms tap G1 uses; movement is never blocked by the guidance.
 */
async function ensureFacingCell(page: Page) {
  const facing = async () =>
    /Facing: C\d\d R\d\d/.test((await m23Field(page))?.dig.join(' ') ?? '');

  if (!(await facing())) {
    expect((await m23Field(page))?.feedback).not.toBe(M23_TEXT.cell_label_help);
    await hold(page, 'ArrowUp', 40);
    await page.waitForTimeout(150);
  }

  expect(await facing()).toBe(true);
}

async function layoutRoute(
  page: Page,
  viewport: { width: number; height: number },
  tag: string,
  order: [PlotKey, PlotKey],
  route: 'approach' | 'direct',
) {
  const vp = `${viewport.width}x${viewport.height}`;
  const errors = captureErrors(page);

  await page.setViewportSize(viewport);

  const sessionId = await enterYardAssigned(page, tag, {
    failure_option_order: order[0] === 'plot_a' ? 'continue_left' : 'stop_left',
  });

  // OD-6: the realised assignment equals the independent oracle.
  expect((await m23Probe(page)).assignment).toEqual(
    jointAssignmentOracle(sessionId),
  );
  await openStakeSurface(page);
  await waitView(page, 'brief');
  await activate(page, 'control_example_', 'keyboard');
  await waitView(page, 'example_1');
  await expectExampleGeometry(page, 1, {
    figure: M23_FIGURE_GLYPH,
    beacon: M23_BEACON_GLYPH,
  });
  await shot(page, `static-example-${vp}`);
  await activate(page, 'next_', 'keyboard');
  await waitView(page, 'example_2');
  await expectExampleGeometry(page, 2, {
    figure: M23_FIGURE_GLYPH,
    beacon: M23_BEACON_GLYPH,
  });
  // The static component and empty example (page 2) is its own subject.
  await shot(page, `static-example-2-${vp}`);
  await activate(page, 'open_plot_panel_', 'keyboard');
  await waitView(page, 'selector');

  const [first, second] = order;
  const letter = (plot: PlotKey) => (plot === 'plot_a' ? 'a' : 'b');

  /**
   * One plot's subjects: the entry stance; a scan and the first failure
   * from the interior (the panel); CONTINUE; the comparable second scan
   * (the history); then every extremal stance WITH the reading, the
   * recorded dig and the facing cell on screen.
   */
  const plotSubjects = async (plot: PlotKey) => {
    await standAt(page, plot, STANCES[plot][0].x, STANCES[plot][0].y);
    await expectHudClearOfPlot(page, plot);
    await expectChipsClearOfPlot(page, plot);
    // OD-1: the stake (within 72 px of both south entries) shows no floating
    // prompt while the yard owns the fixed frame.
    expect(await worldPrompt(page)).toEqual({ prompt: false, text: null });
    await shot(page, `plot-${letter(plot)}-${STANCES[plot][0].name}-${vp}`);
    await standAt(page, plot, STANCES[plot][1].x, STANCES[plot][1].y);
    await scanHere(page, 'keyboard');
    expect((await m23Field(page))?.scanner.join(' ')).toContain('/ 100');
    await failFirst(page, 'keyboard');
    await shot(
      page,
      `first-failure-${(await m23Probe(page)).assignment.failure_option_order}-${letter(plot)}-${vp}`,
    );
    await chooseFailure(page, 'continue', 'keyboard');
    await standAt(page, plot, STANCES[plot][1].x, STANCES[plot][1].y);
    await scanHere(page, 'keyboard');
    expect((await m23Field(page))?.dig.join(' ')).toContain('EMPTY');
    expect((await m23Field(page))?.scanner.join(' ')).toMatch(
      /CLOSER|FARTHER|SAME/,
    );
    await expectHudClearOfPlot(page, plot);
    await expectChipsClearOfPlot(page, plot);
    await shot(page, `plot-${letter(plot)}-history-${vp}`);

    for (const stance of STANCES[plot].slice(1)) {
      await standAt(page, plot, stance.x, stance.y);

      const camera = await cameraProbe(page);

      expect(camera.scrollX).toBe(M23.scroll[plot].x);
      expect(camera.scrollY).toBe(M23.scroll[plot].y);
      expect((await m23Probe(page)).plots[plot].stance).not.toBeNull();
      // The avatar faces into the plot at every stance: the highlighted
      // cell and the readouts are on screen with the reading and the dig.
      expect((await m23Field(page))?.dig.join(' ')).toMatch(
        /Facing: C\d\d R\d\d/,
      );
      await expectHudClearOfPlot(page, plot);
      await expectChipsClearOfPlot(page, plot);
      await shot(page, `plot-${letter(plot)}-${stance.name}-${vp}`);
    }
  };

  if (route === 'approach') {
    // OPEN from the stake, then the walk into the region (approaching →
    // searching at the first body-valid entry).
    await openPlot(page, first, 'keyboard');
    await walkIntoPlot(page, first);
  } else {
    // OPEN from inside the region (the panel by P): searching at once.
    await stepAway(page, 'keyboard');
    await walkInsidePlot(page, first);
    await openPanel(page, 'keyboard');
    await openPlot(page, first, 'keyboard');
    await waitM23(
      page,
      (probe, wanted) => probe.plots[wanted as PlotKey].status === 'searching',
      8000,
      first,
    );
  }

  await expectControlsSequence(page, first, vp);
  await plotSubjects(first);
  await openPanel(page, 'keyboard');
  await waitView(page, 'selector');
  await shot(page, `selector-after-continue-${vp}`);
  await requestStop(page, first, 'keyboard');
  await shot(page, `selector-stop-confirmation-${vp}`);
  await confirmStop(page, first, 'keyboard');
  await waitView(page, 'selector');
  await shot(
    page,
    `${letter(first)}-terminal-${letter(second)}-available-${vp}`,
  );
  await openPlot(page, second, 'keyboard');
  await walkIntoPlot(page, second);
  await plotSubjects(second);

  // The camera is released on a pause: ordinary follow resumes.
  await openPanel(page, 'keyboard');
  await stepAway(page, 'keyboard');
  expect((await m23Probe(page)).plots[second].status).toBe('paused');
  // The HUD belongs to a plot in work: hidden on the pause, wherever the
  // avatar goes (no standing reminder, §12 M1).
  expect((await m23Field(page))?.visible).toBe(false);
  await yardVia(page, 1116, 488);
  await page.waitForTimeout(400);
  expect((await m23Field(page))?.visible).toBe(false);
  // OD-1: the frame released, the stake's prompt is back at once.
  expect((await worldPrompt(page)).text).toContain('Excavation Field Stake');

  const released = await cameraProbe(page);

  expect(
    released.scrollX !== M23.scroll[second].x ||
      released.scrollY !== M23.scroll[second].y,
  ).toBe(true);
  expectNoRuntimeErrors(errors);
}

test.describe('M23 layout (Unit 23)', () => {
  test('L1 (800 × 600): every extremal valid stance of both plots with the fixed frame, the HUD clear of the plot, the recorded dig and scanner history, the first failure (continue_left), the selector after CONTINUE, the STOP confirmation, A terminal / B available, the camera released on a pause', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);
    await layoutRoute(
      page,
      { width: 800, height: 600 },
      'm23l1',
      ['plot_a', 'plot_b'],
      'approach',
    );
  });

  test('L2 (1280 × 720): the same subjects at the larger viewport with B first (stop_left), B terminal / A available, then the reload lock', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);
    await layoutRoute(
      page,
      { width: 1280, height: 720 },
      'm23l2',
      ['plot_b', 'plot_a'],
      'direct',
    );
    await reloadToYard(page);
    await pressStakeExpectLine(page, 'cannot be restarted');
    await shot(page, 'reload-lock-1280x720');
    expect((await m23Probe(page)).status).toBe('held_back');
  });

  test('G1 (keyboard, 800 × 600): the controls guidance, one load — part 1 on the first fixed-frame entry with movement and a scan during it; part 2 follows and shows for four seconds (measured between its two transitions); then the cell-label help once; ESC pauses; after the next entry nothing of the sequence shows again in the load', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);
    const [part1, part2] = controlsParts(HAND.text.field_controls);

    await page.setViewportSize({ width: 800, height: 600 });
    await enterYard(page, 'm23g1');
    await openSeries(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await walkIntoPlot(page, 'plot_a');
    // Part 1 on the first fixed-frame entry; movement and a scan during it
    // (nothing is blocked; the scan resolves without a feedback line, so the
    // part is not pre-empted).
    const first = await waitFieldFeedback(page, part1, 3000);

    expect(first.feedback_bounds!.h).toBeGreaterThan(36);

    const before = await playerAt(page);

    await hold(page, 'ArrowLeft', 120);

    const moved = await playerAt(page);

    expect(moved.x).toBeLessThan(before.x);
    expect((await m23Probe(page)).plots.plot_a.status).toBe('searching');
    // Face into the plot again (the help line needs a facing cell inside).
    await hold(page, 'ArrowUp', 40);
    await page.waitForTimeout(150);
    expect((await m23Field(page))?.dig.join(' ')).toMatch(
      /Facing: C\d\d R\d\d/,
    );

    const started = await countOf(page, 'action_started');

    await page.keyboard.press('c');
    await page.waitForTimeout(200);
    expect(await countOf(page, 'action_started')).toBe(started + 1);
    // Part 2 begins when part 1's four seconds end (transition 1) and ends
    // four seconds later (transition 2): the presentation time measured
    // between the two transitions, both detected within a frame.
    await waitFieldFeedback(page, part2, 6000);

    const partBegan = Date.now();

    await page.waitForFunction(
      (wanted) =>
        (window as unknown as { __m23FieldProbe?: { feedback: string | null } })
          .__m23FieldProbe?.feedback !== wanted,
      part2,
      { timeout: 6000 },
    );

    const partMs = Date.now() - partBegan;

    expect(partMs).toBeGreaterThanOrEqual(3600);
    expect(partMs).toBeLessThanOrEqual(4600);
    expect(`${part1} ${part2}`).toBe(HAND.text.field_controls);
    // The cell-label help once (the facing cell is inside the plot).
    await waitFieldFeedback(page, M23_TEXT.cell_label_help, 3000);
    // ESC during the help line: the participant's ESC menu over the yard
    // pauses the plot (`esc`); ESC on the menu returns to the yard, where
    // the plot stays paused (no automatic resumption: RESUME is explicit).
    await press(page, 'Escape');
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    expect((await m23Field(page))?.visible).toBe(false);
    await press(page, 'Escape');
    await page.waitForTimeout(500);
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    expect((await m23Field(page))?.visible).toBe(false);
    // Never again in the load: after the next entry no part and no help
    // line shows (twenty samples over six seconds).
    await openPanel(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await waitM23(page, (probe) => probe.plots.plot_a.status === 'searching');

    for (let sample = 0; sample < 20; sample += 1) {
      await page.waitForTimeout(300);

      const line = (await m23Field(page))?.feedback ?? null;

      expect([part1, part2, M23_TEXT.cell_label_help]).not.toContain(line);
    }

    expectNoRuntimeErrors(errors);
  });

  test('G2 (keyboard and pointer, 800 × 600): the controls guidance, one load — P during part 1 (the panel; STEP AWAY pauses; the sequence suspended) and part 1 again from its start at the next entry; a cooldown refusal pre-empts part 2 and it shows again; HELP from the pad replays the example and the part returns; D starts the first dig, its choice is served, CONTINUE returns the part; then the help line', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);
    const [part1, part2] = controlsParts(HAND.text.field_controls);

    await page.setViewportSize({ width: 800, height: 600 });
    await enterYard(page, 'm23g2');
    await openSeries(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await walkIntoPlot(page, 'plot_a');
    await waitFieldFeedback(page, part1, 3000);
    // P during part 1: the panel opens at once (the plot paused, the frame
    // released: the sequence suspends); STEP AWAY returns to the paused
    // yard, where the HUD is hidden.
    await openPanel(page, 'keyboard');
    await waitView(page, 'selector');
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    await stepAway(page, 'keyboard');
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    expect((await m23Field(page))?.visible).toBe(false);
    // RESUME inside the region: part 1 again from its start, then part 2.
    await openPanel(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await waitM23(page, (probe) => probe.plots.plot_a.status === 'searching');
    await waitFieldFeedback(page, part1, 3000);
    await waitFieldFeedback(page, part2, 6000);
    // C during part 2 starts a scan (nothing is blocked). Once it resolved,
    // a second C inside the scanner's cooldown is the cooldown refusal: its
    // line pre-empts the part, which is shown again once the line clears.
    // (A second C during the RUNNING scan is dropped by the shared key
    // handler's eligibility gate before any admission, so the busy line is
    // not reachable by a key press; the stance is not moved here, so the
    // avatar stays where the frame holds it.)
    const started = await countOf(page, 'action_started');
    const resolved = await countOf(page, 'scan_resolved');

    // The scan lasts 1000 ms and its cooldown 900 ms more: the second C at
    // 1300 ms falls inside the cooldown (an event poll here would be too
    // slow — its interval grows to a second and the window would be over).
    await page.keyboard.press('c');
    await page.waitForTimeout(1300);
    await page.keyboard.press('c');
    await waitFieldFeedback(page, M23_TEXT.refused_cooldown, 2000);
    expect(await countOf(page, 'scan_resolved')).toBe(resolved + 1);
    expect(await countOf(page, 'action_started')).toBe(started + 1);
    // The dig needs a facing cell inside the plot (faced up if the entry
    // walk left the avatar facing along the boundary).
    await ensureFacingCell(page);
    await waitFieldFeedback(page, part2, 6000);
    // HELP from the pad (the pointer) during the part: the example replays
    // and the plot pauses (the frame released); CLOSE HELP returns to the
    // paused yard (HELP is a pause, contract §12 M2: RESUME is explicit),
    // and the RESUME inside the region brings the search and the part back.
    await clickPad(page, 'help');
    await waitView(page, 'example_1');
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    await activate(page, 'close_help_', 'keyboard');
    await waitSurface(page, false);
    expect((await m23Probe(page)).plots.plot_a.status).toBe('paused');
    expect((await m23Field(page))?.visible).toBe(false);
    await openPanel(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await waitM23(page, (probe) => probe.plots.plot_a.status === 'searching');
    await waitFieldFeedback(page, part2, 6000);
    // D during the part: the dig starts; it is the plot's first dig, so its
    // empty result opens the choice; CONTINUE returns the search and the
    // part; then the cell-label help once.
    expect((await m23Field(page))?.dig.join(' ')).toMatch(
      /Facing: C\d\d R\d\d/,
    );

    const digs = await countOf(page, 'action_started');

    await press(page, 'd');
    expect(await countOf(page, 'action_started')).toBe(digs + 1);
    await waitView(page, 'first_failure', 8000);
    await chooseFailure(page, 'continue', 'keyboard');
    await waitM23(page, (probe) => probe.plots.plot_a.status === 'searching');
    await waitFieldFeedback(page, part2, 6000);
    await waitFieldFeedback(page, M23_TEXT.cell_label_help, 7000);
    expectNoRuntimeErrors(errors);
  });

  test('L3 (1280 × 720, continue_left, AB): the first failure in the other option order at the larger viewport, the selector after CONTINUE, A terminal / B available', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);
    const vp = '1280x720';

    await page.setViewportSize({ width: 1280, height: 720 });
    // Round 3 (OD-6): the joint assignment reaches every cell, so the
    // fixture asks for AB WITH continue_left (unreachable under the former
    // four-slot scheme, register §5.364 (o)).
    const sessionId = await enterYardAssigned(page, 'm23l3', {
      plot_order: 'AB',
      failure_option_order: 'continue_left',
    });

    expect((await m23Probe(page)).assignment).toMatchObject({
      plot_order: 'AB',
      failure_option_order: 'continue_left',
    });
    expect((await m23Probe(page)).assignment).toEqual(
      jointAssignmentOracle(sessionId),
    );
    await openSeries(page, 'keyboard');
    await openPlot(page, 'plot_a', 'keyboard');
    await walkIntoPlot(page, 'plot_a');
    await walkInsidePlot(page, 'plot_a');
    await scanHere(page, 'keyboard');
    await failFirst(page, 'keyboard');

    const labels = await optionLabels(page);

    expect(labels.left).toBe(HAND.text.continue);
    expect(labels.right).toBe(HAND.text.stop);
    await shot(page, `first-failure-continue_left-a-${vp}`);
    await chooseFailure(page, 'continue', 'keyboard');
    await openPanel(page, 'keyboard');
    await waitView(page, 'selector');
    await shot(page, `selector-after-continue-ab-${vp}`);
    await requestStop(page, 'plot_a', 'keyboard');
    await confirmStop(page, 'plot_a', 'keyboard');
    await waitView(page, 'selector');
    expect(await statusLabel(page, 'plot_a')).toContain('Stopped');
    expect(await statusLabel(page, 'plot_b')).toContain('Not started');
    await shot(page, `a-terminal-b-available-${vp}`);
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * U24 RL-3 — the logged M23 check (pure)
 *
 * Expected values come from RELOAD-CORRECTION-SPEC-r3-exec.md §2 (classes,
 * permission, H / U / M readings), §3 (the common requirement), §4 G4 (log
 * the existing check; U / M without administration), §5 (under A the
 * first-load readings) and r1 §1 / §3 (stage 1 the yard briefing, stage 2
 * `presented`, stage 3 `opportunity_opened`; the F8 replay unchanged);
 * records from RL-0's helper with that map written here.
 * ------------------------------------------------------------------ */

const RL3_CONTINUOUS = {
  first_sequence: 1,
  sequence_gap_count: 0,
  sequence_duplicate_count: 0,
  recovered_from_chunks: false,
};
const RL3_STAGES = {
  briefing: (event: ReloadEvent) =>
    event.event_type === 'pilot_stage_advanced' &&
    event.metadata?.to === 'exterior_work',
  presentation: (event: ReloadEvent) =>
    event.event_type === `${HAND.family}presented`,
  opening: (event: ReloadEvent) =>
    event.event_type === `${HAND.family}opportunity_opened`,
  holdBack: (event: ReloadEvent) =>
    event.event_type === `${HAND.family}reload_blocked` ||
    event.event_type === `${HAND.family}technical_failure`,
};
const RL3_UNVERIFIED = `${RELOAD_HOLD_BACK_PREFIX.U}: excavation not administered`;
const RL3_CONTRADICTORY = `${RELOAD_HOLD_BACK_PREFIX.M}: excavation not administered`;

function rl3Number(
  events: readonly RawGameEvent[],
  load: number,
  from: number,
): RawGameEvent[] {
  return events.map((event, i) => ({
    ...event,
    page_load_index: load,
    sequence: from + i,
  }));
}

/** Load 1: the yard briefing; the brief shown, or the selector measured. */
function rl3Prior(
  what: 'briefed' | 'brief' | 'opened' | 'held_u',
): RawGameEvent[] {
  const kit = makeKit();

  kit.events.push({
    session_id: 'GS',
    timestamp_ms: 0,
    scene: 'exterior_recovery_yard',
    event_type: 'pilot_stage_advanced',
    metadata: { from: 'exterior_briefing', to: 'exterior_work' },
  });

  if (what === 'brief') {
    kit.kitLog('presented', { input_mode: 'system' });
  } else if (what === 'opened') {
    openKit(kit);
  } else if (what === 'held_u') {
    kit.kitLog('reload_blocked', {
      detail: RL3_UNVERIFIED,
      input_mode: 'system',
    });
  }

  return rl3Number(kit.events, 1, 1);
}

function rl3Record(
  prior: readonly RawGameEvent[],
  integrity = RL3_CONTINUOUS,
  pageLoadIndex = 2,
) {
  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents: prior,
    integrity,
    stages: RL3_STAGES,
  }) as unknown as Record<string, unknown>;
}

/**
 * A reloaded load as the guard writes it: the record at yard entry (or
 * `records`), the lock when the class is not A (`reload_blocked` with the
 * class's detail and the kit's technical failure), then `after`.
 */
function rl3Load(
  prior: RawGameEvent[],
  options: {
    integrity?: typeof RL3_CONTINUOUS;
    records?: (record: Record<string, unknown>) => object[];
    after?: (kit: Kit) => void;
    pageLoadIndex?: number;
  } = {},
) {
  const pageLoadIndex = options.pageLoadIndex ?? 2;
  const record = rl3Record(prior, options.integrity, pageLoadIndex);
  const records = options.records?.(record) ?? [record];
  const reload = classifyReload({ pageLoadIndex, checks: records });
  const cls = reload.occasions.row.class;
  const kit = makeKit();

  for (const r of records) {
    kit.kitLog('prior_load_checked', { ...r, input_mode: 'system' });
  }

  if (cls !== 'A') {
    const detail =
      cls === 'H'
        ? M23_RELOAD_DETAIL
        : cls === 'M'
          ? RL3_CONTRADICTORY
          : RL3_UNVERIFIED;

    kit.kitLog('reload_blocked', { detail, input_mode: 'system' });
    kit.kitLog('technical_failure', { detail, input_mode: 'system' });
  } else {
    options.after?.(kit);
  }

  const current = rl3Number(kit.events, pageLoadIndex, prior.length + 1);
  const row = extractItemFeatures('M23', [...prior, ...current], {
    finalCoreClosed: true,
    pageLoadIndex,
    reloaded: true,
  })[0];

  return { record, reload, row, current };
}

const rl3Class = (reload: ReturnType<typeof classifyReload>) => [
  reload.occasions.row.class,
  reload.occasions.row.administration_permitted,
];

test.describe('M23 the logged reload check (U24 RL-3, pure)', () => {
  test('the logged record keeps the existing guard computation’s fields and adds RL-0’s (stage map r1 §1); the extractor’s map is the same; a first load writes none', () => {
    for (const what of ['briefed', 'brief', 'opened'] as const) {
      const prior = rl3Prior(what);
      const existing = m23PriorLoadCheck(2, prior, RL3_CONTINUOUS);
      const record = m23PriorLoadRecord(2, prior, RL3_CONTINUOUS)!;

      expect(record).toEqual(rl3Record(prior));
      expect(record).toMatchObject(
        existing as unknown as Record<string, unknown>,
      );
      expect(classifyM23Reload(2, [record])).toEqual(
        classifyReload({ pageLoadIndex: 2, checks: [record] }),
      );
    }

    expect(m23PriorLoadRecord(1, [], RL3_CONTINUOUS)).toBeNull();
  });

  test('H: a selector measured earlier holds the series (the existing lock and reason); F8: a brief seen earlier is A — permitted, replayed and opened as on a first load', () => {
    const h = rl3Load(rl3Prior('opened'));

    expect(rl3Class(h.reload)).toEqual(['H', false]);
    expectRow(h.row, {
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'interrupted',
    });
    expect(h.row.missing_reason).toBe(
      'excavation selector measured in an earlier page load; not re-run after the reload',
    );
    expect(comps(h.row).held_back_after_reload).toBe(true);

    const replay = rl3Load(rl3Prior('brief'), {
      after: (kit) => openKit(kit),
    });

    expect(rl3Class(replay.reload)).toEqual(['A', true]);
    expect(replay.record).toMatchObject({
      prior_presentation_found: true,
      prior_opening_found: false,
      prior_opening_absence_established: true,
    });
    expect(replay.row.disposition).toBe('pending');
    expect(replay.row.supporting_sequences).not.toContain(
      replay.current[0].sequence,
    );
  });

  test('A without current-load evidence takes the first-load readings: not_presented (nothing in the load; or closed at the review), never the reload branch', () => {
    const prior = rl3Prior('briefed');
    const nothing = rl3Load(prior);

    expect(rl3Class(nothing.reload)).toEqual(['A', true]);
    expectRow(nothing.row, {
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'not_presented',
    });

    const review = rl3Load(prior, {
      after: (kit) =>
        kit.kitLog('window_closed', {
          exit_state: 'closed_at_review',
          input_mode: 'system',
        }),
    });

    expect(review.row.disposition).toBe('not_presented');
  });

  test('U and M: an unverified history or a contradictory record locks the series without administration — interrupted with its reason; F-C: an earlier U lock is carried forward over a continuous history; a malformed record is a technical failure', () => {
    const prior = rl3Prior('briefed');
    const u = rl3Load(prior, {
      integrity: { ...RL3_CONTINUOUS, sequence_duplicate_count: 1 },
    });

    expect(rl3Class(u.reload)).toEqual(['U', false]);
    expect(
      u.current.some(
        (event) => event.event_type === `${HAND.family}opportunity_opened`,
      ),
    ).toBe(false);
    expect(u.row).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason:
        'excavation not administered after a reload: earlier history not verified',
    });

    const m = rl3Load(prior, {
      records: (record) => [{ ...record, prior_opening_found: true }],
    });

    expect(rl3Class(m.reload)).toEqual(['M', false]);
    expect(m.row.missing_reason).toBe(
      'excavation not administered after a reload: earlier check contradictory',
    );

    const carried = rl3Load(rl3Prior('held_u'));

    expect(carried.record.history_continuous).toBe(true);
    expect(rl3Class(carried.reload)).toEqual(['U', false]);

    const malformed = rl3Load(prior, {
      records: (record) => [{ ...record, page_load_index: 6 }],
    });

    expect(malformed.row.disposition).toBe('technical_failure');
  });

  test('RL-1C decision A: a brief presented and left unopened in a reloaded load without its check is U and held; a first load keeps pending; an unreached reloaded load keeps the reload reading', () => {
    const prior = rl3Prior('briefed');
    const kit = makeKit();

    kit.kitLog('presented', { input_mode: 'system' });

    const row = extractItemFeatures(
      'M23',
      [...prior, ...rl3Number(kit.events, 2, prior.length + 1)],
      { finalCoreClosed: false, pageLoadIndex: 2, reloaded: true },
    )[0];

    expect(row).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'excavation not administered after a reload: earlier history not verified',
    });
    expect(
      extractItemFeatures('M23', kit.events, {
        finalCoreClosed: false,
        pageLoadIndex: 1,
        reloaded: false,
      })[0].disposition,
    ).toBe('pending');
    expect(
      extractItemFeatures('M23', prior, {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      })[0].disposition,
    ).toBe('interrupted');
  });

  test('the U / M lines (r3 §9, ⟨station⟩ = excavation stake) are in the participant-string inventory; the H lock line is unchanged', () => {
    expect(HAND.text.reload_lock).toBe(
      'This excavation was opened before the page reloaded. It cannot be restarted in this session. You can continue through the station.',
    );
    expect(m23ParticipantStrings()).toEqual(
      expect.arrayContaining([
        'The earlier state of this excavation stake could not be verified.',
        'It stays closed after this reload.',
      ]),
    );
  });
});
