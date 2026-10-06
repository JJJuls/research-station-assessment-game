/**
 * M13 — Conduit Lattice Bench: the module store and telemetry adapter of
 * the three-network series (Station 080 Unit 16, administration
 * `m13-networks-v1`).
 *
 * BESSI Information Processing item M13 — the provisional performance
 * counterpart is constraint satisfaction on a physical pipe board. Under
 * research-owner ruling D-U16-1 (7 October 2026) the bench presents three
 * independently keyed networks (n1 → n2 → n3) in one orientation form and
 * takes ONE immutable first response per network — a confirmed layout or a
 * confirmed CANNOT SOLVE — before any correctness feedback; structural
 * results and optional, equally capped practice follow only after the
 * third first response and never change a recorded answer.
 *
 * The rules live in the pure model (`m13NetworkSeries.ts`, networks in
 * `m13NetworkForms.ts`); this file holds the ONE authoritative series
 * container of the bench, forwards the model's events to the provisional
 * family `proto_m13_networks_*` and bridges the series to the legacy
 * validity-register opportunity (`windowState.ts`, unchanged): the
 * opportunity is completed when the scored phase completes, and nothing in
 * practice changes it. Mouse and keyboard call the same functions with
 * the same semantic actions.
 *
 * SCIENTIFIC BOUNDARY: family `proto_m13_networks_*` only; every name is a
 * PROVISIONAL candidate; raw observables are recorded, never scored here.
 * The v2 family `proto_m13_lattice_*` is retired from the route and is
 * not written by this build. M18 never reads any of this state.
 */

import { getM13Piece, M13_PIECES } from '../measurement/m13PipePuzzle';
import { researchRuntime } from '../systems';
import {
  M13N_ENTRY_STATE_VERSION,
  M13N_OBJECT_ID,
  M13N_OPPORTUNITY_ID,
  type M13NetworkId,
} from './m13NetworkForms';
import type {
  M13ConfirmOutcome,
  M13NextOutcome,
  M13PracticeRunOutcome,
  M13Press,
  M13ResponseKind,
  M13Series,
  M13SeriesView,
  PipeAction,
} from './m13NetworkSeries';
import {
  createM13Series,
  M13N_EVENT_SUFFIXES,
  M13N_RELOAD_DETAIL,
  m13PriorAdministration,
  m13sAct,
  m13sBackToResults,
  m13sCancelCommit,
  m13sCloseAtReview,
  m13sConfirmCommit,
  m13sFail,
  m13sFinish,
  m13sHelp,
  m13sLeave,
  m13sNext,
  m13sOpen,
  m13sOpenPractice,
  m13sPracticeTest,
  m13sRecord,
  m13sRequestCommit,
  m13sStop,
  m13sSubmissionCount,
  m13sView,
} from './m13NetworkSeries';
import type { InputMode } from './model';
import type { PipeResult } from './pipeBoardEngine';
import { refreshIpProbe, registerIpProbeSource } from './probe';
import { declareIpEvents, logIpEvent } from './telemetry';
import type { IpWindow } from './windowState';
import {
  closeIpWindow,
  createIpWindow,
  declareIpWindow,
  enterIpWindow,
  ipWindowFields,
  leaveIpPanel,
  noteIpPriorExposure,
  resolveForm,
} from './windowState';

export const M13N_EVENT_TYPES = declareIpEvents('proto_m13_networks', [
  ...M13N_EVENT_SUFFIXES,
]);

export type { M13SeriesView, PipeAction } from './m13NetworkSeries';

/* ------------------------------------------------------------------ *
 * Module store (one authoritative container)
 * ------------------------------------------------------------------ */

interface M13BenchState {
  /** Legacy validity-register bridge (one opportunity for the series). */
  window: IpWindow;
  series: M13Series;
  /** Events of `series.events` already forwarded to the telemetry family. */
  flushed: number;
}

let state: M13BenchState | null = null;

function ensure(): M13BenchState {
  if (state === null) {
    const form = resolveForm('m13');

    state = {
      window: createIpWindow({
        opportunity_id: M13N_OPPORTUNITY_ID,
        owner: 'M13',
        entry_state_version: M13N_ENTRY_STATE_VERSION,
        form_id: form,
      }),
      series: createM13Series(form),
      flushed: 0,
    };
  }

  return state;
}

/**
 * Forwards the model's new events, then mirrors the series status on the
 * legacy opportunity: completed with the third first response (and never
 * reopened), exited on a stop, censored at the review, invalid on a fault.
 */
function sync(nowMs: number) {
  const s = ensure();
  const fields = ipWindowFields(s.window);

  while (s.flushed < s.series.events.length) {
    const event = s.series.events[s.flushed];

    s.flushed += 1;
    logIpEvent('proto_m13_networks', M13N_OBJECT_ID, event.suffix, {
      entry_state_id: fields.entry_state_id,
      window_status: fields.window_status,
      open_count: fields.open_count,
      ip_windows_opened_before: fields.ip_windows_opened_before,
      ...event.metadata,
    });
  }

  if (s.window.status === 'open') {
    switch (s.series.status) {
      case 'completed':
        closeIpWindow(s.window, 'completed', nowMs);
        break;
      case 'stopped':
        closeIpWindow(
          s.window,
          'exited',
          nowMs,
          'participant stopped the series; recorded answers kept',
        );
        break;
      case 'closed_at_review':
        closeIpWindow(
          s.window,
          'censored',
          nowMs,
          'series closed at the review in the first-response phase',
        );
        break;
      case 'technical_failure':
      case 'held_back':
        closeIpWindow(
          s.window,
          'technical_failure',
          nowMs,
          s.series.failure_detail ?? 'technical failure',
        );
        break;
      default:
        break;
    }
  }

  refreshIpProbe();
}

export function declareM13Lattice() {
  const s = ensure();

  declareIpWindow(s.window);
  registerIpProbeSource('m13', M13N_OPPORTUNITY_ID, m13LatticeProbe);
  refreshIpProbe();
}

/** The legacy opportunity's status (the M18 context stamp reads only this). */
export function m13LatticeWindowStatus() {
  return ensure().window.status;
}

export function m13LatticeOpen(nowMs: number) {
  const s = ensure();

  declareM13Lattice();

  // Reload guard (register §5.14): the raw log of an earlier page load
  // already holds this administration's opening. Never re-run it — neither
  // the first-response phase nor results nor practice.
  const prior =
    s.series.status === 'unopened' &&
    !s.series.record_closed &&
    m13PriorAdministration(researchRuntime.getPriorPageLoadEvents());

  if (s.series.status !== 'unopened' || !s.series.record_closed) {
    enterIpWindow(s.window, nowMs);
  }

  if (prior) {
    noteIpPriorExposure(
      s.window,
      'lattice bench opened in an earlier page load of this identity',
    );
  }

  const outcome = m13sOpen(s.series, nowMs, { priorAdministration: prior });

  if (outcome === 'held_back') {
    s.series.failure_detail = M13N_RELOAD_DETAIL;
  }

  sync(nowMs);
}

export function m13LatticeLeave(nowMs: number) {
  const s = ensure();

  m13sLeave(s.series, nowMs);
  leaveIpPanel(s.window, nowMs);
  sync(nowMs);
}

/** Every semantic manipulation (mouse and keyboard call exactly this). */
export function m13LatticeAct(
  action: PipeAction,
  mode: InputMode,
  nowMs: number,
): PipeResult {
  const result = m13sAct(ensure().series, action, mode, nowMs);

  sync(nowMs);

  return result;
}

/** RECORD LAYOUT / CANNOT SOLVE: opens the neutral confirmation. */
export function m13LatticeRequestCommit(
  kind: M13ResponseKind,
  mode: InputMode,
  nowMs: number,
): boolean {
  const opened = m13sRequestCommit(ensure().series, kind, mode, nowMs);

  sync(nowMs);

  return opened;
}

export function m13LatticeCancelCommit(mode: InputMode, nowMs: number) {
  m13sCancelCommit(ensure().series, mode, nowMs);
  sync(nowMs);
}

/** RECORD ANSWER / RECORD: only a fresh press writes the first response. */
export function m13LatticeConfirmCommit(
  press: M13Press,
  mode: InputMode,
  nowMs: number,
): M13ConfirmOutcome {
  const outcome = m13sConfirmCommit(ensure().series, press, mode, nowMs);

  sync(nowMs);

  return outcome;
}

/** NEXT NETWORK / SHOW RESULTS. */
export function m13LatticeNext(nowMs: number): M13NextOutcome {
  const outcome = m13sNext(ensure().series, nowMs);

  sync(nowMs);

  return outcome;
}

export function m13LatticeOpenPractice(
  networkId: M13NetworkId,
  nowMs: number,
): boolean {
  const opened = m13sOpenPractice(ensure().series, networkId, nowMs);

  sync(nowMs);

  return opened;
}

/** TEST FLOW on a practice board (never available before the results). */
export function m13LatticePracticeTest(
  mode: InputMode,
  nowMs: number,
): M13PracticeRunOutcome {
  const outcome = m13sPracticeTest(ensure().series, mode, nowMs);

  sync(nowMs);

  return outcome;
}

export function m13LatticeBackToResults(nowMs: number): boolean {
  const back = m13sBackToResults(ensure().series, nowMs);

  sync(nowMs);

  return back;
}

export function m13LatticeFinish(nowMs: number): boolean {
  const finished = m13sFinish(ensure().series, nowMs);

  sync(nowMs);

  return finished;
}

export function m13LatticeHelp(mode: InputMode, nowMs: number): string[] {
  const lines = m13sHelp(ensure().series, mode, nowMs);

  sync(nowMs);

  return lines;
}

export function m13LatticeStop(nowMs: number) {
  m13sStop(ensure().series, nowMs);
  sync(nowMs);
}

export function m13LatticeFail(nowMs: number, detail: string) {
  m13sFail(ensure().series, nowMs, detail);
  sync(nowMs);
}

/**
 * Station-record closure at the Utility Deck review: a series still in
 * the first-response phase closes `closed_at_review`; a completed scored
 * phase is not reclosed (only an open practice ends); afterwards the bench
 * records nothing. A bench never opened is left to the generic coverage
 * closure.
 */
export function closeM13AtReview(nowMs: number) {
  const s = ensure();

  m13sCloseAtReview(s.series, nowMs);
  leaveIpPanel(s.window, nowMs);
  sync(nowMs);
}

export function m13LatticeView(): M13SeriesView {
  return m13sView(ensure().series);
}

export function m13LatticeProbe(): Record<string, unknown> {
  const s = ensure();
  const series = s.series;
  const view = m13sView(series);

  return {
    ...ipWindowFields(s.window),
    entry_state_version: M13N_ENTRY_STATE_VERSION,
    form: series.form,
    series_status: series.status,
    series_view: view.view,
    series_phase: view.phase,
    record_closed: series.record_closed,
    practice_closed: series.practice_closed,
    pieces_available: M13_PIECES.length,
    // Recorded work at the station (the workshop's signature reads these).
    placements: series.placements,
    moves: series.moves,
    rotations: series.rotations,
    returns: series.returns,
    placements_refused: series.refused,
    undos: series.undos,
    resets: series.resets,
    /** Recorded first responses plus practice test runs. */
    submission_count: m13sSubmissionCount(series),
    help_consults_by_phase: { ...series.help_consults },
    active_ms: series.active_ms,
    network_id: view.network?.network_id ?? null,
    board: view.network?.config ?? null,
    placements_map: view.placements,
    held: view.held,
    bench: view.bench,
    networks: m13sRecord(series),
  };
}

export function pieceTypeOf(pieceId: string) {
  return getM13Piece(pieceId).type;
}

/** Test-only escape hatch. */
export function resetM13LatticeState() {
  state = null;
}
