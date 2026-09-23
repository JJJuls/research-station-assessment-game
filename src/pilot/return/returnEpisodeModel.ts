/**
 * Return, Revision & Handover episode model (evidence-led pilot v2,
 * Unit 5). PURE (no Phaser, no runtime imports; Node-testable).
 *
 * Sheet 11 row 5: purposeful return → fulfil obligations → manual-based
 * repair → setback/revision → direct M25 item; one deliberate backtrack
 * supports the prospective-memory opportunities; no maze, no hidden route.
 *
 * This module is the ONE table of the episode's item windows: for every
 * two-phase item (M03 occasions, M07 start/end, M09 check 1/2, M10
 * accept/handover, M20 start/resume) it names the SAME opportunity id and
 * the two ledger window ids, so start and end data stay traceably linked
 * while each phase keeps its own window id and `phase` tag on every
 * event. The adapters stamp `phaseMetadata()`; the pure spec proves the
 * table against the frozen ledger and the source modules.
 *
 * Scientific boundary: every identifier is provisional (`proto_*`); no
 * family is a prefix of another; nothing here aggregates, weights or
 * scores; navigation and global time are never item evidence.
 */

import {
  M20_FAMILY,
  M20_OPPORTUNITY_ID,
  M20_RESUME_EVENT_SUFFIXES,
  M20_RESUME_WINDOW_ID,
  M20_START_EVENT_SUFFIXES,
  M20_START_WINDOW_ID,
} from '../exterior/m20AntennaModel';
import {
  M21_EVENT_SUFFIXES,
  M21_FAMILY,
  M21_OBJECT_ID,
  M21_OPPORTUNITY_IDS,
  M21_WINDOW_IDS,
} from './m21ManualModel';
import {
  M22_EVENT_SUFFIXES,
  M22_FAMILY,
  M22_OBJECT_ID,
  M22_OPPORTUNITY_IDS,
  M22_WINDOW_IDS,
} from './m22ReportModel';
import {
  M25_EVENT_SUFFIXES,
  M25_FAMILY,
  M25_OPPORTUNITY_ID,
  M25_WINDOW_ID,
} from './m25HandoffModel';

export type ReturnPhase = 'start' | 'end';

export interface ReturnItemWindows {
  item: string;
  opportunityIds: readonly string[];
  /** Window ids by phase (ledger). */
  windows: Readonly<Record<ReturnPhase, string>>;
  family: string;
  /** Raw task object per phase (never shared between primary variables). */
  objects: Readonly<Record<ReturnPhase, string>>;
  episodes: readonly [number, number];
}

/** M03 window ids (ledger): one per matched occasion. */
export const M03_WINDOW_IDS = {
  a: 'm03_reset_o1',
  b: 'm03_reset_o2',
} as const;

/**
 * Minimum time the residual surface must be visible before a departure
 * counts as a full-exposure observation. Exposure below the floor is
 * RECORDED (`exposure_sufficient: false`, `close_state:
 * 'panel_closed_early'`) and is NEVER a validity marker — every panel
 * close is a completed observation (m03Reset.ts closure path;
 * docs/game/rooms/12-workshop-return.md). The earlier draft rule
 * (`insufficient_opportunity` below the floor) was not adopted; the
 * threshold itself remains flagged for research-owner confirmation
 * (M01-M26 spatial crosswalk).
 */
export const M03_MIN_EXPOSURE_MS = 2000;

export function m03ExposureSufficient(exposureMs: number): boolean {
  return exposureMs >= M03_MIN_EXPOSURE_MS;
}

/** Two-phase items of the return episode, keyed by item id. */
export const RETURN_LINKED_WINDOWS: readonly ReturnItemWindows[] = [
  {
    item: 'M03',
    opportunityIds: ['proto_m03_reset_a', 'proto_m03_reset_b'],
    windows: { start: M03_WINDOW_IDS.a, end: M03_WINDOW_IDS.b },
    family: 'proto_m03_',
    objects: { start: 'm03_press_bench_a', end: 'm03_press_bench_b' },
    episodes: [2, 5],
  },
  {
    item: 'M07',
    opportunityIds: ['proto_m07_calibration_project'],
    windows: { start: 'm07_calibration_start', end: 'm07_calibration_end' },
    family: 'proto_m07_calibration_',
    objects: { start: 'm07_calibration_bench', end: 'm07_calibration_bench' },
    episodes: [2, 5],
  },
  {
    item: 'M09',
    opportunityIds: ['proto_m09_monitor_watch'],
    windows: { start: 'm09_check_1', end: 'm09_check_2' },
    family: 'proto_m09_watch_',
    objects: { start: 'm09_monitor_gauge', end: 'm09_monitor_gauge' },
    episodes: [1, 5],
  },
  {
    item: 'M10',
    opportunityIds: ['proto_m10_component_promise'],
    windows: { start: 'm10_promise_accept', end: 'm10_promise_handover' },
    family: 'proto_m10_promise_',
    objects: { start: 'm10_component_promise', end: 'm10_component_promise' },
    episodes: [1, 5],
  },
  {
    item: 'M20',
    opportunityIds: [M20_OPPORTUNITY_ID],
    windows: { start: M20_START_WINDOW_ID, end: M20_RESUME_WINDOW_ID },
    family: M20_FAMILY,
    objects: { start: 'm20_mast_04', end: 'm20_feed_console' },
    episodes: [4, 5],
  },
];

/** Single-window items hosted by the return shift. */
export const RETURN_SINGLE_WINDOWS = [
  // Unit 10: M21 owns two case windows on the one bench object.
  {
    item: 'M21',
    opportunityId: M21_OPPORTUNITY_IDS.o1,
    windowId: M21_WINDOW_IDS.o1,
    family: M21_FAMILY,
    object: M21_OBJECT_ID,
  },
  {
    item: 'M21',
    opportunityId: M21_OPPORTUNITY_IDS.o2,
    windowId: M21_WINDOW_IDS.o2,
    family: M21_FAMILY,
    object: M21_OBJECT_ID,
  },
  // Unit 11: M22 owns two report windows on the one desk object.
  {
    item: 'M22',
    opportunityId: M22_OPPORTUNITY_IDS.o1,
    windowId: M22_WINDOW_IDS.o1,
    family: M22_FAMILY,
    object: M22_OBJECT_ID,
  },
  {
    item: 'M22',
    opportunityId: M22_OPPORTUNITY_IDS.o2,
    windowId: M22_WINDOW_IDS.o2,
    family: M22_FAMILY,
    object: M22_OBJECT_ID,
  },
  {
    item: 'M25',
    opportunityId: M25_OPPORTUNITY_ID,
    windowId: M25_WINDOW_ID,
    family: M25_FAMILY,
    object: 'm25_shift_question_terminal',
  },
] as const;

/** Every primary family prefix the return shift writes to. */
export const RETURN_FAMILIES = {
  M03: 'proto_m03_',
  M07: 'proto_m07_calibration_',
  M09: 'proto_m09_watch_',
  M10: 'proto_m10_promise_',
  M20: M20_FAMILY,
  M21: M21_FAMILY,
  M22: M22_FAMILY,
  M25: M25_FAMILY,
} as const;

/**
 * Linking fields stamped on every event of a two-phase item: the phase
 * this event belongs to and BOTH window ids, so an analyst can join the
 * phases without ever merging their raw events.
 */
export function phaseMetadata(
  item: ReturnItemWindows['item'],
  phase: ReturnPhase,
): {
  phase: ReturnPhase;
  start_window_id: string;
  end_window_id: string;
} {
  const entry = RETURN_LINKED_WINDOWS.find((row) => row.item === item);

  if (entry === undefined) {
    throw new Error(`returnEpisodeModel: ${item} is not a two-phase item`);
  }

  return {
    phase,
    start_window_id: entry.windows.start,
    end_window_id: entry.windows.end,
  };
}

/** Item-owned event types of the Unit 5 pure models (disjointness tests). */
export function returnEventTypes(): Record<string, string[]> {
  return {
    M20: [...M20_START_EVENT_SUFFIXES, ...M20_RESUME_EVENT_SUFFIXES].map(
      (suffix) => `${M20_FAMILY}${suffix}`,
    ),
    M21: M21_EVENT_SUFFIXES.map((suffix) => `${M21_FAMILY}${suffix}`),
    M22: M22_EVENT_SUFFIXES.map((suffix) => `${M22_FAMILY}${suffix}`),
    M25: M25_EVENT_SUFFIXES.map((suffix) => `${M25_FAMILY}${suffix}`),
  };
}

/**
 * Guided order of the return shift (beacon only — never a gate). The feed
 * console (M20 resume) and the calibration bench (M07 natural return) are
 * deliberately NOT guided: both opportunities must stay uncommanded.
 */
export const RETURN_GUIDED_ORDER = [
  'press_b',
  'relay_bench',
  'report_desk',
  'handover_desk',
] as const;

/** Board copy for the return shift (operational; no item id, no directive on M07/M20). */
export const RETURN_BOARD_BODY =
  'WORK ORDERS — RETURN SHIFT\n' +
  'Press batch B, two bench units (relay bench — manual in the bench drawer), two shift reports (report desk), outbound handover. Anything you left open earlier is still yours to close. Sign the board when you are done here.';
