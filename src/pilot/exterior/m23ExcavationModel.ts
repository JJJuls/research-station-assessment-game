/**
 * M23 — scanner-guided excavation window (evidence-led pilot v2, Unit 4).
 * PURE model (no Phaser, no runtime imports; Node-testable).
 *
 * Ledger (sheet 09): use C-strength/bearing feedback to narrow a bounded
 * field, then D-dig exact terrain cells to recover an attainable buried
 * component. Raw components `informative_scan_moves`,
 * `signal_strength_changes`, `exact_dig_attempts`, `useful_strategy_shifts`,
 * `recovery_complete`. Validity gate: scanner tutorial passed; target
 * fixed/counterbalanced; feedback truthful; task attainable; blind/random
 * actions excluded; no M24 events.
 *
 * The MECHANICS are the accepted field-actions foundation (ScanController /
 * DigController / DigSurfaceRegistry / FieldTargetRegistry); this model
 * only classifies the records those controllers already produce, and only
 * while the window is open. C and D work anywhere in the yard as ordinary
 * gameplay (secondary_field_action_*); only records notified to an OPEN
 * window become M23 evidence.
 *
 * Operationalisations (candidate; recorded raw, never scored):
 * - informative scan move: an on-signal sweep taken ≥ 24 px from the
 *   previous on-plot sweep whose readout is comparable to it (a trend);
 * - signal strength changes: the stronger / weaker / unchanged trend counts
 *   plus the bounded strength sequence;
 * - exact dig attempt: a dig inside the staked plot (cell recorded);
 * - useful strategy shift: re-localising with a sweep ≥ 24 px away after an
 *   empty dig INSIDE the plot, or relocating ≥ 48 px for the next sweep after
 *   a weaker reading;
 * - actionable signal: MODERATE or STRONG (identical bands for everyone).
 */

import type {
  SignalCategory,
  SignalTrend,
} from '../../fieldActions/signalModel';

export const M23_OPPORTUNITY_ID = 'proto_m23_field_recovery';
export const M23_WINDOW_ID = 'm23_excavation_w1';
export const M23_ENTRY_STATE_VERSION = 'm23-excavation-v1';
export const M23_FAMILY = 'proto_m23_field_recovery_';

export const M23_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'scan',
  'dig',
  'invalid_action',
  'strategy_shift',
  'recovered',
  'departed',
  'window_closed',
  'technical_failure',
] as const;

export type M23Form = 'form_a' | 'form_b';

/**
 * Staked excavation field (tile bounds, inclusive) — 7 × 6 cells.
 *
 * World V2 rebuild (presentation-only translation): the plot moved from
 * cols 16–22 / rows 8–13 of the former 25×19 yard to cols 26–32 /
 * rows 3–8 of the 43×12 painted strip (the painted stake field). Its
 * SIZE (7 × 6) and the target cells' positions RELATIVE to the plot
 * (form A at +2/+1, form B at +4/+4) are the measurement fixture and are
 * unchanged; only the absolute origin moved with the room.
 *
 * World V3 open field (Station 080 correction): the same presentation-only
 * translation again — origin to cols 33–39 / rows 8–13 (+7 / +5); size
 * and both relative target positions unchanged.
 */
export const M23_PLOT = {
  minCol: 33,
  maxCol: 39,
  minRow: 8,
  maxRow: 13,
} as const;

/** Counterbalanced target cells — both deep inside the plot. */
export const M23_TARGET_CELLS: Record<M23Form, { col: number; row: number }> = {
  form_a: { col: 35, row: 9 },
  form_b: { col: 37, row: 12 },
};

export const M23_DETECTION_RADIUS = 160;
export const M23_TARGET_ID = 'm23_target';
export const M23_OBJECT_ID = 'm23_object';
export const M23_ITEM_ID = 'relay_coupling';
export const M23_ZONE_ID = 'm23_plot';
export const M23_SCAN_CONTEXT = 'm23_excavation';

const INFORMATIVE_MOVE_PX = 24;
const RELOCATE_PX = 48;
const STRENGTH_SEQUENCE_CAP = 60;

export function m23CellInsidePlot(col: number, row: number): boolean {
  return (
    col >= M23_PLOT.minCol &&
    col <= M23_PLOT.maxCol &&
    row >= M23_PLOT.minRow &&
    row <= M23_PLOT.maxRow
  );
}

export function m23PositionInsidePlot(x: number, y: number): boolean {
  return m23CellInsidePlot(Math.floor(x / 32), Math.floor(y / 32));
}

export function m23Actionable(category: SignalCategory): boolean {
  return category === 'moderate' || category === 'strong';
}

/** Structural subset of the foundation ScanRecord. */
export interface M23ScanLike {
  player_x: number;
  player_y: number;
  target_id: string | null;
  strength: number;
  category: SignalCategory;
  trend: SignalTrend | null;
}

/** Structural subset of the foundation DigRecord. */
export interface M23DigLike {
  col: number;
  row: number;
  zone_id: string | null;
  outcome: 'empty' | 'recovered' | 'cached';
  object_id: string | null;
}

export type M23StopChoice =
  | 'stopped'
  | 'ended_shift_outside'
  | 'closed_at_review'
  | null;

type M23LastAct =
  | 'scan'
  | 'dig_empty'
  | 'dig_off_plot'
  | 'dig_recovered'
  | null;

export interface M23State {
  form: M23Form;
  entered: boolean;
  closed: boolean;
  opened_at_ms: number | null;
  scans: number;
  on_plot_scans: number;
  on_signal_scans: number;
  informative_scan_moves: number;
  unique_scan_bins: Set<string>;
  signal_changes: { stronger: number; weaker: number; unchanged: number };
  strength_sequence: number[];
  best_strength: number;
  first_actionable_ms: number | null;
  digs: number;
  exact_dig_attempts: number;
  dug_cells: { col: number; row: number; outcome: M23DigLike['outcome'] }[];
  off_plot_digs: number;
  invalid_actions: number;
  useful_strategy_shifts: number;
  path_px: number;
  last_scan: { x: number; y: number; trend: SignalTrend | null } | null;
  last_on_plot_scan: { x: number; y: number } | null;
  last_act: M23LastAct;
  recovered: boolean;
  recovered_ms: number | null;
  recovery_delivery: 'inventory' | 'cache' | null;
  stop_choice: M23StopChoice;
  departures: number;
}

export function createM23State(form: M23Form): M23State {
  return {
    form,
    entered: false,
    closed: false,
    opened_at_ms: null,
    scans: 0,
    on_plot_scans: 0,
    on_signal_scans: 0,
    informative_scan_moves: 0,
    unique_scan_bins: new Set(),
    signal_changes: { stronger: 0, weaker: 0, unchanged: 0 },
    strength_sequence: [],
    best_strength: 0,
    first_actionable_ms: null,
    digs: 0,
    exact_dig_attempts: 0,
    dug_cells: [],
    off_plot_digs: 0,
    invalid_actions: 0,
    useful_strategy_shifts: 0,
    path_px: 0,
    last_scan: null,
    last_on_plot_scan: null,
    last_act: null,
    recovered: false,
    recovered_ms: null,
    recovery_delivery: null,
    stop_choice: null,
    departures: 0,
  };
}

export function m23Open(state: M23State): boolean {
  return state.entered && !state.closed;
}

export function m23Enter(state: M23State, nowMs: number): boolean {
  if (state.entered || state.closed) {
    return false;
  }

  state.entered = true;
  state.opened_at_ms = nowMs;

  return true;
}

function elapsed(state: M23State, nowMs: number): number {
  return Math.max(0, nowMs - (state.opened_at_ms ?? nowMs));
}

export interface M23ScanNote {
  on_plot: boolean;
  informative: boolean;
  first_actionable: boolean;
  strategy_shift: boolean;
}

export function m23NoteScan(
  state: M23State,
  record: M23ScanLike,
  nowMs: number,
): M23ScanNote {
  if (!m23Open(state)) {
    throw new Error('M23: scan outside the open window');
  }

  const onPlot = m23PositionInsidePlot(record.player_x, record.player_y);
  const onSignal = record.target_id === M23_TARGET_ID;
  const moved =
    state.last_scan === null
      ? null
      : Math.hypot(
          record.player_x - state.last_scan.x,
          record.player_y - state.last_scan.y,
        );

  state.scans += 1;

  if (onPlot) {
    state.on_plot_scans += 1;
  }

  state.unique_scan_bins.add(
    `${Math.round(record.player_x / 16)}:${Math.round(record.player_y / 16)}`,
  );

  if (moved !== null) {
    state.path_px += moved;
  }

  let informative = false;
  let firstActionable = false;
  let strategyShift = false;

  if (onSignal) {
    state.on_signal_scans += 1;
    state.best_strength = Math.max(state.best_strength, record.strength);

    if (state.strength_sequence.length < STRENGTH_SEQUENCE_CAP) {
      state.strength_sequence.push(record.strength);
    }

    if (record.trend !== null) {
      state.signal_changes[record.trend] += 1;

      const movedOnPlot =
        state.last_on_plot_scan === null
          ? null
          : Math.hypot(
              record.player_x - state.last_on_plot_scan.x,
              record.player_y - state.last_on_plot_scan.y,
            );

      informative =
        onPlot && movedOnPlot !== null && movedOnPlot >= INFORMATIVE_MOVE_PX;
    }

    if (m23Actionable(record.category) && state.first_actionable_ms === null) {
      state.first_actionable_ms = elapsed(state, nowMs);
      firstActionable = true;
    }
  }

  if (informative) {
    state.informative_scan_moves += 1;
  }

  // Strategy shifts: re-localise after an empty dig; relocate after a
  // weaker reading.
  if (
    state.last_act === 'dig_empty' &&
    moved !== null &&
    moved >= INFORMATIVE_MOVE_PX
  ) {
    strategyShift = true;
  } else if (
    state.last_scan?.trend === 'weaker' &&
    moved !== null &&
    moved >= RELOCATE_PX
  ) {
    strategyShift = true;
  }

  if (strategyShift) {
    state.useful_strategy_shifts += 1;
  }

  state.last_scan = {
    x: record.player_x,
    y: record.player_y,
    trend: onSignal ? record.trend : null,
  };

  if (onPlot) {
    state.last_on_plot_scan = { x: record.player_x, y: record.player_y };
  }

  state.last_act = 'scan';

  return {
    on_plot: onPlot,
    informative,
    first_actionable: firstActionable,
    strategy_shift: strategyShift,
  };
}

export interface M23DigNote {
  exact: boolean;
  recovered: boolean;
}

export function m23NoteDig(
  state: M23State,
  record: M23DigLike,
  nowMs: number,
): M23DigNote {
  if (!m23Open(state)) {
    throw new Error('M23: dig outside the open window');
  }

  const exact = record.zone_id === M23_ZONE_ID;

  state.digs += 1;

  if (exact) {
    state.exact_dig_attempts += 1;
    state.dug_cells.push({
      col: record.col,
      row: record.row,
      outcome: record.outcome,
    });
  } else {
    state.off_plot_digs += 1;
  }

  const recovered =
    record.object_id === M23_OBJECT_ID &&
    (record.outcome === 'recovered' || record.outcome === 'cached');

  if (recovered && !state.recovered) {
    state.recovered = true;
    state.recovered_ms = elapsed(state, nowMs);
    state.recovery_delivery =
      record.outcome === 'recovered' ? 'inventory' : 'cache';
  }

  state.last_act = recovered
    ? 'dig_recovered'
    : exact
      ? 'dig_empty'
      : 'dig_off_plot';

  return { exact, recovered };
}

export function m23NoteInvalidAction(state: M23State): void {
  if (m23Open(state)) {
    state.invalid_actions += 1;
  }
}

export function m23Depart(state: M23State): boolean {
  if (!m23Open(state)) {
    return false;
  }

  state.departures += 1;

  return true;
}

export function m23Close(
  state: M23State,
  choice: Exclude<M23StopChoice, null>,
): boolean {
  if (!m23Open(state)) {
    return false;
  }

  state.closed = true;

  if (!state.recovered) {
    state.stop_choice = choice;
  }

  return true;
}

/** Ledger raw components + contextual search-path counts (never a score). */
export function m23RawComponents(state: M23State) {
  return {
    form: state.form,
    target_cell: M23_TARGET_CELLS[state.form],
    informative_scan_moves: state.informative_scan_moves,
    signal_strength_changes: {
      ...state.signal_changes,
      sequence: [...state.strength_sequence],
    },
    exact_dig_attempts: state.exact_dig_attempts,
    useful_strategy_shifts: state.useful_strategy_shifts,
    recovery_complete: state.recovered,
    // Contextual search-path components.
    scans: state.scans,
    on_plot_scans: state.on_plot_scans,
    on_signal_scans: state.on_signal_scans,
    unique_scan_bins: state.unique_scan_bins.size,
    best_strength: state.best_strength,
    first_actionable_signal_ms: state.first_actionable_ms,
    actionable_to_recovery_ms:
      state.first_actionable_ms === null || state.recovered_ms === null
        ? null
        : state.recovered_ms - state.first_actionable_ms,
    digs: state.digs,
    dug_cells: state.dug_cells.map((cell) => ({ ...cell })),
    off_plot_digs: state.off_plot_digs,
    invalid_actions: state.invalid_actions,
    path_px: Math.round(state.path_px),
    recovered_ms: state.recovered_ms,
    recovery_delivery: state.recovery_delivery,
    stop_choice: state.stop_choice,
    departures: state.departures,
  };
}
