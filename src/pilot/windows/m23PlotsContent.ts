/**
 * M23 — the approved content of the two-plot excavation protocol at the
 * Exterior Recovery Yard (Station 080 M01–M26 run, Unit 23; administration
 * `m23-plots-v1`).
 *
 * PURE module (no Phaser, no runtime, no `import.meta`): the administration
 * of `U23-CONTRACT.md` exactly as approved by the research owner's decision
 * D-U23-1 of 16 October 2026 (all nine rows — A-adjusted with numeric
 * scanner feedback and the final neutral wording, B, C, D1, D2, D3, E(c),
 * F, G) — the identifiers and versions, the A-adjusted plot geometry (two
 * 7 × 6 plots, cols 27–33 and 34–40, rows 8–13), the four literal target
 * keys, the stake and approach, the fixed camera scrolls, the unchanged
 * Player selector probe offsets that define the qualifying scan region
 * (contract §10), the signal rule, the band and trend words, the
 * counterbalance slots, every participant-facing string of contract §4 and
 * the modal geometry of contract §10.
 *
 * Nothing here is re-authored by the implementer: a defect found in a key,
 * a rule or a string is recorded for the owner, never corrected here. The
 * pure spec re-derives the signal arithmetic and the region predicate with
 * its own transcription, never by importing them. Every identifier is
 * PROVISIONAL prototype telemetry (contract §2 row G); approval of the
 * administration is no scientific-validity claim. No questionnaire wording
 * appears anywhere in this file.
 */

export const M23_FAMILY = 'proto_m23_plots_';
export const M23P_OPPORTUNITY_ID = 'proto_m23_excavation_series';
export const M23P_WINDOW_ID = 'm23_plots_w1';
export const M23P_ENTRY_STATE_VERSION = 'm23-plots-v1';
export const M23P_CONTENT_VERSION = 'm23-plots-v1';
export const M23P_OBJECT_ID = 'm23_excavation_field';
export const M23P_SURFACE_ID = 'm23_excavation_field';
export const M23P_SCENE = 'exterior_recovery_yard';
export const M23_LAYOUT_ID = 'a_adjusted_v1';
export const M23_SCAN_REGION_VERSION = 'inverse_probe_union_v1';
export const M23_CLOSURE_COPY_VERSION = 'closure-explanation-v1';
export const M23_PLOTS_PLANNED = 2;

export const TILE = 32;
export const M23_SCAN_MS = 1000;
export const M23_SCAN_COOLDOWN_MS = 900;
export const M23_DIG_MS = 1500;
export const M23_DETECTION_RADIUS = 160;
export const M23_SPEED_PX_S = 175;
/** A press inside this window after a surface view appeared commits nothing. */
export const M23_SETTLE_MS = 400;
/** Up to this many accepted navigation tokens ride a `failure_choice`. */
export const M23_NAVIGATION_TOKEN_LIMIT = 32;
/** A frame-to-frame jump above this during an approach is a discontinuity. */
export const M23_PATH_DISCONTINUITY_PX = 96;

export type M23PlotId = 'plot_a' | 'plot_b';
export type M23PlotLetter = 'A' | 'B';
export type M23PlotForm = 'a1' | 'a2' | 'b1' | 'b2';
export type M23PlotOrder = 'AB' | 'BA';
export type M23FailureOptionOrder = 'continue_left' | 'stop_left';
export type M23Band = 'NONE' | 'FAINT' | 'MODERATE' | 'STRONG';
export type M23Trend = 'CLOSER' | 'FARTHER' | 'SAME' | 'NO COMPARISON';

export interface M23Cell {
  col: number;
  row: number;
}

/** Inclusive tile bounds of a plot (half-open world rectangle, §10). */
export interface M23PlotBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

export interface M23PlotDef {
  id: M23PlotId;
  letter: M23PlotLetter;
  bounds: M23PlotBounds;
  /** The two forms of this plot and their literal keyed cells (research-only). */
  keys: Record<M23PlotForm, M23Cell | undefined>;
  forms: readonly [M23PlotForm, M23PlotForm];
  object_id: string;
  target_id: string;
  zone_id: string;
  /** Fixed camera scroll while searching this plot (contract §12). */
  fixed_scroll: { x: number; y: number };
}

/** The A-adjusted plots (owner ruling of 16 October 2026). */
export const M23_PLOTS: readonly [M23PlotDef, M23PlotDef] = [
  {
    id: 'plot_a',
    letter: 'A',
    bounds: { minCol: 27, maxCol: 33, minRow: 8, maxRow: 13 },
    keys: {
      a1: { col: 29, row: 9 },
      a2: { col: 31, row: 12 },
      b1: undefined,
      b2: undefined,
    },
    forms: ['a1', 'a2'],
    object_id: 'm23_plot_a_object',
    target_id: 'm23_plot_a_target',
    zone_id: 'm23_plot_a',
    fixed_scroll: { x: 656, y: 172 },
  },
  {
    id: 'plot_b',
    letter: 'B',
    bounds: { minCol: 34, maxCol: 40, minRow: 8, maxRow: 13 },
    keys: {
      a1: undefined,
      a2: undefined,
      b1: { col: 38, row: 9 },
      b2: { col: 36, row: 12 },
    },
    forms: ['b1', 'b2'],
    object_id: 'm23_plot_b_object',
    target_id: 'm23_plot_b_target',
    zone_id: 'm23_plot_b',
    fixed_scroll: { x: 880, y: 172 },
  },
];

export const M23_PLOT_IDS: readonly M23PlotId[] = M23_PLOTS.map(
  (plot) => plot.id,
);

/** The stake anchor and its registry approach point (contract §13 R1). */
export const M23_STAKE_ANCHOR = { x: 1072, y: 488 } as const;
export const M23_STAKE_APPROACH = { x: 1116, y: 488 } as const;

/**
 * The unchanged Player selector probe offsets (Player.ts `moveSelector`,
 * centre of the 16 × 16 selector relative to the sprite origin): a scan
 * origin qualifies when its anchor is inside the plot or at least one
 * cardinal probe reaches it (contract §10, F6).
 */
export const M23_PROBE_OFFSETS: readonly { dx: number; dy: number }[] = [
  { dx: -27, dy: 4 },
  { dx: 27, dy: 4 },
  { dx: 0, dy: -28 },
  { dx: 0, dy: 36 },
];

/**
 * The deterministic joint assignment (round 3, amendment OD-6, replacing
 * the four separate session slots): ONE hash of the session id selects one
 * of the 2 × 2 × 2 × 2 cells — plot A form, plot B form, displayed row
 * order and first-failure option order. The shared two-option helper
 * reduces every slot to one parity bit of the session id, so the four slots
 * realised only two joint cells; this local FNV-1a 32 hash with the
 * murmur3 finaliser reaches all sixteen on synthetic ids (the amendment's
 * diagnostic; no claim of balance in any recruited sample). The scheme name
 * travels in the entry snapshot as a provisional field.
 */
export const M23_ASSIGNMENT_KEY = 'm23_plots_assignment';
export const M23_ASSIGNMENT_SCHEME = 'm23_joint16_fnv1a_fmix32_v1';

export interface M23JointAssignment {
  plot_a_form: 'a1' | 'a2';
  plot_b_form: 'b1' | 'b2';
  plot_order: M23PlotOrder;
  failure_option_order: M23FailureOptionOrder;
}

/** FNV-1a 32 over `${sessionId}:${M23_ASSIGNMENT_KEY}`, then murmur3's fmix32. */
export function m23AssignmentHash(sessionId: string): number {
  const input = `${sessionId}:${M23_ASSIGNMENT_KEY}`;
  let h = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }

  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;

  return h >>> 0;
}

/** Cell index bits: 8 = plot A form, 4 = plot B form, 2 = row order, 1 = option order. */
export function m23JointAssignment(sessionId: string): M23JointAssignment {
  const index = m23AssignmentHash(sessionId) % 16;

  return {
    plot_a_form: (index & 8) !== 0 ? 'a2' : 'a1',
    plot_b_form: (index & 4) !== 0 ? 'b2' : 'b1',
    plot_order: (index & 2) !== 0 ? 'BA' : 'AB',
    failure_option_order: (index & 1) !== 0 ? 'stop_left' : 'continue_left',
  };
}

export function isM23PlotId(value: unknown): value is M23PlotId {
  return value === 'plot_a' || value === 'plot_b';
}

export function m23Plot(id: M23PlotId): M23PlotDef {
  return M23_PLOTS.find((plot) => plot.id === id)!;
}

export function m23OtherPlotId(id: M23PlotId): M23PlotId {
  return id === 'plot_a' ? 'plot_b' : 'plot_a';
}

export function m23PlotLetter(id: M23PlotId): M23PlotLetter {
  return m23Plot(id).letter;
}

/** The keyed cell of a plot under a form (null when the form is not the plot's). */
export function m23KeyCell(id: M23PlotId, form: M23PlotForm): M23Cell | null {
  return m23Plot(id).keys[form] ?? null;
}

export function m23CellInside(bounds: M23PlotBounds, cell: M23Cell): boolean {
  return (
    cell.col >= bounds.minCol &&
    cell.col <= bounds.maxCol &&
    cell.row >= bounds.minRow &&
    cell.row <= bounds.maxRow
  );
}

/** The half-open world rectangle of a plot (§10). */
export function m23PlotRect(bounds: M23PlotBounds): {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
} {
  return {
    x0: bounds.minCol * TILE,
    y0: bounds.minRow * TILE,
    x1: (bounds.maxCol + 1) * TILE,
    y1: (bounds.maxRow + 1) * TILE,
  };
}

/** A world point inside the half-open plot rectangle. */
export function m23PointInsidePlot(
  bounds: M23PlotBounds,
  x: number,
  y: number,
): boolean {
  const rect = m23PlotRect(bounds);

  return x >= rect.x0 && x < rect.x1 && y >= rect.y0 && y < rect.y1;
}

export function m23CellOfPoint(x: number, y: number): M23Cell {
  return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
}

export function m23CellCentre(cell: M23Cell): { x: number; y: number } {
  return { x: cell.col * TILE + TILE / 2, y: cell.row * TILE + TILE / 2 };
}

/** Every cell of a plot (42), row-major. */
export function m23PlotCells(bounds: M23PlotBounds): M23Cell[] {
  const cells: M23Cell[] = [];

  for (let row = bounds.minRow; row <= bounds.maxRow; row += 1) {
    for (let col = bounds.minCol; col <= bounds.maxCol; col += 1) {
      cells.push({ col, row });
    }
  }

  return cells;
}

/** Local 1-based two-digit cell label (`C03 R02`; columns from the left, rows from the top). */
export function m23CellLabel(bounds: M23PlotBounds, cell: M23Cell): string {
  const c = String(cell.col - bounds.minCol + 1).padStart(2, '0');
  const r = String(cell.row - bounds.minRow + 1).padStart(2, '0');

  return `C${c} R${r}`;
}

/** The signal rule (contract §3): round(100 × clamp(1 − d / 160, 0, 1)). */
export function m23Signal(distancePx: number): number {
  const linear = 1 - Math.max(0, distancePx) / M23_DETECTION_RADIUS;

  return Math.round(100 * Math.min(1, Math.max(0, linear)));
}

export function m23Band(strength: number): M23Band {
  if (strength <= 0) {
    return 'NONE';
  }

  if (strength <= 33) {
    return 'FAINT';
  }

  if (strength <= 66) {
    return 'MODERATE';
  }

  return 'STRONG';
}

/** Trend against the preceding scan of the SAME plot (null previous: no comparison). */
export function m23Trend(previous: number | null, current: number): M23Trend {
  if (previous === null) {
    return 'NO COMPARISON';
  }

  if (current > previous) {
    return 'CLOSER';
  }

  if (current < previous) {
    return 'FARTHER';
  }

  return 'SAME';
}

/**
 * The qualifying scan region (contract §10, F6): bodyFits(p) AND p is
 * inside the plot or one unchanged cardinal probe reaches it, AND p is not
 * inside the OTHER plot's rectangle (the association rule). `bodyFits` is
 * the room's actual collision predicate, injected.
 */
export function m23RegionMember(
  plotId: M23PlotId,
  x: number,
  y: number,
  bodyFits: (x: number, y: number) => boolean,
): { member: boolean; stance: 'interior' | 'boundary_stance' | null } {
  const plot = m23Plot(plotId);
  const other = m23Plot(m23OtherPlotId(plotId));

  if (m23PointInsidePlot(other.bounds, x, y) || !bodyFits(x, y)) {
    return { member: false, stance: null };
  }

  if (m23PointInsidePlot(plot.bounds, x, y)) {
    return { member: true, stance: 'interior' };
  }

  const reaches = M23_PROBE_OFFSETS.some((probe) =>
    m23PointInsidePlot(plot.bounds, x + probe.dx, y + probe.dy),
  );

  return reaches
    ? { member: true, stance: 'boundary_stance' }
    : { member: false, stance: null };
}

/**
 * The plot a C / D press in the qualifying regions associates with while
 * nothing is selected (amendment OD-4): exactly one region → that plot; both
 * regions (the overlap band on the shared border) → null, governed but
 * associated with neither; no region → undefined, not governed.
 */
export function m23RegionAssociation(
  regions: readonly M23PlotId[],
): M23PlotId | null | undefined {
  if (regions.length === 1) {
    return regions[0];
  }

  return regions.length === 0 ? undefined : null;
}

/** The participant-facing selector status words (contract §4). */
export type M23SelectorStatus =
  | 'Not started'
  | 'Approaching'
  | 'Searching'
  | 'Choose next step'
  | 'Paused'
  | 'Stopped'
  | 'Recovered'
  | 'Closed at shift end'
  | 'Closed before a choice'
  | 'Unavailable — technical problem';

/** Every participant-facing string of contract §4 (pinned; A / B are data). */
export const M23_TEXT = {
  title: 'EXCAVATION FIELD',
  objective: 'Excavation field — two staked plots, east (E at the stake).',
  noor_clause: 'the excavation field with two staked plots (east)',
  noor_sentence: 'You can search either excavation plot, pause, or stop.',
  approach_status: (c: M23PlotLetter) =>
    `Approaching Plot ${c}. Move towards its outlined cells. P / PANEL: plots and stop controls.`,
  refused_approaching:
    "Walk into the selected plot's search area before scanning or digging.",
  brief:
    'Two staked plots each contain a buried component. You can search either plot, pause and return, or stop work on a plot.',
  scanner_instruction:
    'Scan from where you stand. A stronger reading means you are nearer the component than on your last comparable scan. It does not point to the component.',
  dig_instruction:
    'Dig the highlighted cell you are facing. Only the cell holding the component will recover it.',
  closure_explanation:
    'Telling Noor you are finished outside closes the excavation as it is. Leaving this panel only pauses work.',
  control_example: 'CONTROL EXAMPLE',
  step_away: 'STEP AWAY',
  example_heading: 'CONTROL EXAMPLE — NOT A SEARCH PLOT',
  example_1:
    'The scanner reads from where you stand. This visible example beacon is 80 pixels away. The reading is 50 / 100 — MODERATE.',
  example_2:
    'The highlighted cell is where DIG will act. A cell with the component recovers it. An empty cell stays empty.',
  example_component_cell: 'COMPONENT CELL',
  example_empty_cell: 'EMPTY CELL',
  next: 'NEXT',
  back: 'BACK',
  open_plot_panel: 'OPEN PLOT PANEL',
  close_help: 'CLOSE HELP',
  field_controls:
    'Arrow keys or direction pad: move and face. C / SCAN: scan. D / DIG: dig the highlighted cell. P / PANEL: plots and stop controls. HELP: repeat the control example. ESC / STEP AWAY: pause.',
  modal_guidance: 'Arrows / Tab: move focus. Enter / Space: choose.',
  failure_guidance: [
    'Left / Right: select the option on that side.',
    'Enter / Space: choose. Tab / Shift+Tab: cycle.',
    'ESC / STEP AWAY: pause.',
  ],
  plot: (c: M23PlotLetter) => `PLOT ${c}`,
  open_plot: (c: M23PlotLetter) => `OPEN PLOT ${c}`,
  resume_plot: (c: M23PlotLetter) => `RESUME PLOT ${c}`,
  stop_plot: (c: M23PlotLetter) => `STOP PLOT ${c}`,
  help: 'HELP',
  selector_footer:
    'P / PANEL: plots and stop controls. ESC / STEP AWAY: pause.',
  first_failure:
    'No component was found in this cell. Choose what happens next for this plot. Either option lets you move on.',
  continue_search: 'CONTINUE SEARCH',
  stop_this_plot: 'STOP THIS PLOT',
  after_continue: 'Search resumed. Scan or dig when ready.',
  stop_confirm: (c: M23PlotLetter) =>
    `Stop work on Plot ${c} for this shift? Stopping leaves the other plot unchanged. You can still leave the yard.`,
  confirm_footer:
    'BACK: return to the requesting panel. It does not resume a scan or dig.',
  stopped: (c: M23PlotLetter) =>
    `Plot ${c} is stopped for this shift. The other plot is unchanged. You can step away.`,
  recovery: (c: M23PlotLetter) =>
    `Component recovered from Plot ${c} and placed in the field tray. Return to the plot panel or step away.`,
  paused: 'This plot is paused. Its excavated cells will remain as they are.',
  left_region:
    "Work paused outside this plot's search area. Open the plot panel (P) to resume.",
  cell_label_help: 'Columns count from the left; rows count from the top.',
  ordinary_exit: 'Work is paused. Return to the excavation panel to resume.',
  scan_cancelled: 'The scan was cancelled. Start a new scan when ready.',
  dig_cancelled: 'The dig was cancelled. Start a new dig when ready.',
  refused_inactive: 'Open the plot panel (P) to resume.',
  refused_outside_region:
    "Walk into the selected plot's search area before scanning or digging.",
  refused_outside_plot: 'Face a highlighted cell inside the open plot.',
  refused_duplicate: 'This cell has already been dug.',
  refused_busy: 'Wait for the current action to finish.',
  refused_cooldown: 'The scanner is resetting.',
  scanner_heading: (c: M23PlotLetter) => `PLOT ${c} / SCANNER`,
  scanner_none: 'No reading yet.',
  scanner_reading: (strength: number, band: M23Band) =>
    `${strength} / 100 — ${band}`,
  dig_heading: (c: M23PlotLetter) => `PLOT ${c} / LAST DIG`,
  dig_none: 'No dig recorded.',
  dig_empty: (label: string) => `${label}: EMPTY`,
  dig_recovered: (label: string) => `${label}: COMPONENT RECOVERED`,
  facing: (label: string) => `Facing: ${label}`,
  facing_outside: 'Facing: outside plot',
  tray_empty: 'FIELD TRAY: No components recovered.',
  tray: (items: readonly M23PlotLetter[]) =>
    `FIELD TRAY: ${items.map((c) => `Plot ${c} component`).join(' / ')}`,
  series_closed:
    'The excavation is closed for this shift. Work already recorded is unchanged.',
  reload_lock:
    'This excavation was opened before the page reloaded. It cannot be restarted in this session. You can continue through the station.',
  // U24 RL-3 (owner decision D-5, r3 §9, ⟨station⟩ = excavation stake): a
  // series held after a reload because its earlier state could not be
  // verified or its check is contradictory (U / M). `reload_lock` above
  // stays the H line, unchanged.
  reload_lock_unverified: [
    'The earlier state of this excavation stake could not be verified.',
    'It stays closed after this reload.',
  ] as const,
  plot_fault:
    'This plot is unavailable because of a technical problem. Work already recorded is saved. The other plot is unchanged. You can leave.',
  status: {
    not_started: 'Not started',
    approaching: 'Approaching',
    searching: 'Searching',
    choice_pending: 'Choose next step',
    paused: 'Paused',
    stopped: 'Stopped',
    recovered: 'Recovered',
    closed_shift_end: 'Closed at shift end',
    closed_before_choice: 'Closed before a choice',
    technical: 'Unavailable — technical problem',
  } as const satisfies Record<string, M23SelectorStatus>,
} as const;

/** Every participant-facing string (the wording audit of the pure spec). */
export function m23ParticipantStrings(): string[] {
  const t = M23_TEXT;

  return [
    t.title,
    t.objective,
    t.noor_clause,
    t.noor_sentence,
    t.approach_status('A'),
    t.approach_status('B'),
    t.refused_approaching,
    t.brief,
    t.scanner_instruction,
    t.dig_instruction,
    t.closure_explanation,
    t.control_example,
    t.step_away,
    t.example_heading,
    t.example_1,
    t.example_2,
    t.example_component_cell,
    t.example_empty_cell,
    t.next,
    t.back,
    t.open_plot_panel,
    t.close_help,
    t.field_controls,
    t.modal_guidance,
    ...t.failure_guidance,
    t.plot('A'),
    t.plot('B'),
    t.open_plot('A'),
    t.open_plot('B'),
    t.resume_plot('A'),
    t.resume_plot('B'),
    t.stop_plot('A'),
    t.stop_plot('B'),
    t.help,
    t.selector_footer,
    t.first_failure,
    t.continue_search,
    t.stop_this_plot,
    t.after_continue,
    t.stop_confirm('A'),
    t.stop_confirm('B'),
    t.confirm_footer,
    t.stopped('A'),
    t.stopped('B'),
    t.recovery('A'),
    t.recovery('B'),
    t.paused,
    t.left_region,
    t.cell_label_help,
    t.ordinary_exit,
    t.scan_cancelled,
    t.dig_cancelled,
    t.refused_inactive,
    t.refused_outside_region,
    t.refused_outside_plot,
    t.refused_duplicate,
    t.refused_busy,
    t.refused_cooldown,
    t.scanner_heading('A'),
    t.scanner_heading('B'),
    t.scanner_none,
    t.scanner_reading(50, 'MODERATE'),
    t.scanner_reading(0, 'NONE'),
    t.dig_heading('A'),
    t.dig_heading('B'),
    t.dig_none,
    t.dig_empty('C03 R02'),
    t.dig_recovered('C03 R02'),
    t.facing('C03 R02'),
    t.facing_outside,
    t.tray_empty,
    t.tray(['A']),
    t.tray(['A', 'B']),
    t.series_closed,
    t.reload_lock,
    ...t.reload_lock_unverified,
    t.plot_fault,
    ...Object.values(t.status),
  ];
}

/** Modal geometry of contract §10 (panel-relative design px, standard frame). */
export const M23_MODAL = {
  heading: { x: 24, y: 72, w: 672, h: 32 },
  body: { x: 24, y: 112, w: 672, h: 144 },
  option_left: { x: 24, y: 272, w: 324, h: 64 },
  option_right: { x: 372, y: 272, w: 324, h: 64 },
  selector_status_1: { x: 24, y: 112, w: 672, h: 32 },
  selector_open_1: { x: 24, y: 152, w: 324, h: 64 },
  selector_stop_1: { x: 372, y: 152, w: 324, h: 64 },
  selector_status_2: { x: 24, y: 228, w: 672, h: 32 },
  selector_open_2: { x: 24, y: 268, w: 324, h: 64 },
  selector_stop_2: { x: 372, y: 268, w: 324, h: 64 },
  help: { x: 24, y: 352, w: 220, h: 64 },
  step_away: { x: 476, y: 352, w: 220, h: 64 },
  guidance: { x: 24, y: 428, w: 672, h: 78 },
  // Round 3 (amendment OD-3): the heading below the title bar (y 48, h 40).
  example_heading: { x: 24, y: 48, w: 672, h: 40 },
  example_body: { x: 24, y: 96, w: 672, h: 100 },
  illustration_left: { x: 24, y: 212, w: 324, h: 116 },
  illustration_right: { x: 372, y: 212, w: 324, h: 116 },
  // Round 3 (amendment OD-2 / 8c): inside each illustration the figure
  // (72 wide) and, 12 px to its right, the highlighted cell tile; on page 1
  // the figure and the beacon stand 133.33 design px apart (80 world px at
  // the field's zoom 2 / design scale 1.2).
  illustration_figure_left: { x: 24, y: 212, w: 72, h: 116 },
  illustration_cell_left: { x: 108, y: 212, w: 240, h: 116 },
  illustration_figure_right: { x: 372, y: 212, w: 72, h: 116 },
  illustration_cell_right: { x: 456, y: 212, w: 240, h: 116 },
  illustration_beacon: { x: 157.33, y: 212, w: 72, h: 116 },
  nav_1: { x: 24, y: 352, w: 220, h: 64 },
  nav_2: { x: 250, y: 352, w: 220, h: 64 },
  nav_3: { x: 476, y: 352, w: 220, h: 64 },
  text_heading_px: 24,
  text_body_px: 22,
  text_option_px: 22,
  text_guidance_px: 20,
  text_illustration_px: 20,
  text_figure_px: 40,
} as const;

/** The example figure (a glyph, not copy): the character facing the cell (OD-2). */
export const M23_FIGURE_GLYPH = '☻▸';
/** The example beacon glyph (page 1). */
export const M23_BEACON_GLYPH = '◉';

/** Field HUD geometry of contract §10 (design px). */
export const M23_HUD = {
  pad: { x: 673.333333, y: 250, w: 240, h: 256 },
  pad_column_w: 116,
  pad_gap_x: 8,
  pad_row_h: 60,
  pad_gap_y: 4,
  // Round 4 (owner authorization of 20 October 2026): the scanner plate 24 px
  // higher (rows at design y 92 / 116 / 140, the third ending at 162) and
  // the dig plate 8 px higher (its fourth row ending at 347), so the base
  // scene's floating prompt of a foreign station near a plot (the mast
  // beside Plot A's west ring: a 24 px band at design y 165–189 from above
  // the mast, y 351–375 from below it) crosses only text-free plate area —
  // the prompt and the readouts are readable at once. The plates sit below
  // the prompt's layer (M23FieldControls).
  scanner: { x: -126.6667, y: 84.3333, w: 250, h: 120 },
  dig: { x: -126.6667, y: 245.3333, w: 250, h: 173.3333 },
  // Round 3 (amendment OD-8b): the field tray on its own plate under the dig
  // plate (up to three wrapped lines), so the dig plate keeps at most four.
  tray: { x: -126.6667, y: 436, w: 250, h: 88 },
  feedback_y: 92,
  text_px: 22,
} as const;
