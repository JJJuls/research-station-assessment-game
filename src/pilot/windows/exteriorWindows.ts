/**
 * Exterior Recovery item windows (evidence-led pilot v2, Unit 4).
 *
 * Binds the five PURE exterior models (../exterior/*) to the ItemWindow
 * kit: every item-owned event carries the required per-opportunity fields
 * (item id, opportunity id, window/version id, form/counterbalance,
 * entry-state snapshot, presented timestamp, comprehension state,
 * start/end/exit state, input mode, raw components, validity status and
 * reason) and rides the unmapped `researchRuntime.logInteraction` path —
 * never a canonical event, never a score.
 *
 * Session-scope singleton (page lifetime, like every pilot window):
 * leaving the yard pauses the open windows and re-entry resumes them, so
 * coupling progress, mast stages, disturbed ground, the finite deck, the
 * uplink state and belt-full field caches all persist across scene
 * creations. `endExteriorShift` is the ONE interruption point (Noor's
 * "finished outside"): it closes the exterior observations with their
 * honest dispositions and freezes the M20 start state — it never
 * manufactures an M20 outcome (the resume window is episode 5).
 */
import {
  ensureMagnetDeckForm,
  magnetDeckState,
} from '../../fieldActions/magnetDeck';
import type {
  ExteriorEpisodeState,
  ExteriorSite,
} from '../exterior/exteriorEpisodeModel';
import {
  createExteriorEpisode,
  exteriorCurrentSite,
  exteriorDismissSite,
  exteriorObjective,
} from '../exterior/exteriorEpisodeModel';
import type {
  M19ThawResult,
  M19TurnResult,
} from '../exterior/m19CouplingModel';
import {
  M19_ENTRY_STATE_VERSION,
  M19_FAMILY,
  M19_OPPORTUNITY_ID,
  M19_WINDOW_ID,
  m19Close,
  m19Completed,
  m19Depart,
  m19Enter,
  m19Inspect,
  m19Open,
  m19RawComponents,
  m19Readout,
  m19Schedule,
  m19Thaw,
  m19Turn,
} from '../exterior/m19CouplingModel';
import type { M20OutdoorStage } from '../exterior/m20AntennaModel';
import {
  M20_ENTRY_STATE_VERSION,
  M20_FAMILY,
  M20_OPPORTUNITY_ID,
  M20_RESUME_WINDOW_ID,
  M20_START_WINDOW_ID,
  m20Accept,
  m20Complete,
  m20CompleteStage,
  m20Depart,
  m20MissionLogText,
  m20OutdoorComplete,
  m20RecordInterruption,
  m20Snapshot,
} from '../exterior/m20AntennaModel';
import type { M23DigLike, M23ScanLike } from '../exterior/m23ExcavationModel';
import {
  M23_ENTRY_STATE_VERSION,
  M23_FAMILY,
  M23_OPPORTUNITY_ID,
  M23_TARGET_CELLS,
  M23_WINDOW_ID,
  m23Close,
  m23Depart,
  m23Enter,
  m23NoteDig,
  m23NoteInvalidAction,
  m23NoteScan,
  m23Open,
  m23RawComponents,
} from '../exterior/m23ExcavationModel';
import type { M24CycleLike } from '../exterior/m24MagnetRigModel';
import {
  M24_ENTRY_STATE_VERSION,
  M24_FAMILY,
  M24_OPPORTUNITY_ID,
  M24_WINDOW_ID,
  m24Acknowledge,
  m24Close,
  m24ClosureDisposition,
  m24Depart,
  m24Enter,
  m24KnowledgeState,
  m24NoteAlternative,
  m24NoteCycle,
  m24NoteDepletionShown,
  m24Open,
  m24RawComponents,
} from '../exterior/m24MagnetRigModel';
import type { M26Channel, M26Transmission } from '../exterior/m26ChannelModel';
import {
  M26_ENTRY_STATE_VERSION,
  M26_FAMILY,
  M26_OPPORTUNITY_ID,
  M26_WINDOW_ID,
  m26Acknowledge,
  m26AllDelivered,
  m26Close,
  m26ClosureDisposition,
  m26Demonstrate,
  m26Depart,
  m26DisconnectDue,
  m26Enter,
  m26Knowledge,
  m26NextReport,
  m26Open,
  m26RawComponents,
  m26Transmit,
  m26ViewEvidence,
} from '../exterior/m26ChannelModel';
import { registerMissionLogEntry } from '../pilotRoute';
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

const SCENE = 'exterior_recovery_yard';

interface ExteriorWindows {
  m19: ItemWindow;
  m20: ItemWindow;
  m23: ItemWindow;
  m24: ItemWindow;
  m26: ItemWindow;
}

let episode: ExteriorEpisodeState | null = null;
let windows: ExteriorWindows | null = null;
let missionLogRegistered = false;

function buildWindows(state: ExteriorEpisodeState): ExteriorWindows {
  return {
    m19: new ItemWindow({
      item: 'M19',
      opportunityId: M19_OPPORTUNITY_ID,
      windowId: M19_WINDOW_ID,
      entryStateVersion: M19_ENTRY_STATE_VERSION,
      family: M19_FAMILY,
      scene: SCENE,
      objectId: 'm19_frozen_coupling',
      form: state.m19.form,
    }),
    m20: new ItemWindow({
      item: 'M20',
      opportunityId: M20_OPPORTUNITY_ID,
      windowId: M20_START_WINDOW_ID,
      entryStateVersion: M20_ENTRY_STATE_VERSION,
      family: M20_FAMILY,
      scene: SCENE,
      objectId: 'm20_mast_04',
    }),
    m23: new ItemWindow({
      item: 'M23',
      opportunityId: M23_OPPORTUNITY_ID,
      windowId: M23_WINDOW_ID,
      entryStateVersion: M23_ENTRY_STATE_VERSION,
      family: M23_FAMILY,
      scene: SCENE,
      objectId: 'm23_excavation_field',
      form: state.m23_form,
    }),
    m24: new ItemWindow({
      item: 'M24',
      opportunityId: M24_OPPORTUNITY_ID,
      windowId: M24_WINDOW_ID,
      entryStateVersion: M24_ENTRY_STATE_VERSION,
      family: M24_FAMILY,
      scene: SCENE,
      objectId: 'm24_magnet_rig',
      counterbalance: `deck_form_${state.deck_form}`,
    }),
    m26: new ItemWindow({
      item: 'M26',
      opportunityId: M26_OPPORTUNITY_ID,
      windowId: M26_WINDOW_ID,
      entryStateVersion: M26_ENTRY_STATE_VERSION,
      family: M26_FAMILY,
      scene: SCENE,
      objectId: 'm26_uplink_posts',
    }),
  };
}

/**
 * The session's exterior episode (created on first use with the
 * deterministic counterbalanced forms; the deck form is shared with the
 * foundation deck so the rig and the record always agree).
 */
export function exteriorEpisode(): ExteriorEpisodeState {
  if (episode === null) {
    const sessionId = currentSessionId();
    const deckForm = ensureMagnetDeckForm(
      assignCounterbalance(sessionId, 'field_magnet_deck_form', [
        'A',
        'B',
      ] as const),
    );

    episode = createExteriorEpisode({
      m23Form: assignCounterbalance(sessionId, 'm23_excavation_form', [
        'form_a',
        'form_b',
      ] as const),
      deckForm,
    });
    windows = buildWindows(episode);
  }

  return episode;
}

export function exteriorWindows(): ExteriorWindows {
  exteriorEpisode();

  return windows!;
}

/** Declares + offers every exterior opportunity (zone entry; idempotent). */
export function declareExteriorWindows() {
  const w = exteriorWindows();

  w.m19.declare();
  w.m20.declare();
  w.m23.declare();
  w.m24.declare();
  w.m26.declare();
}

/** Explicit step-away from a site panel: guidance only, never the register. */
export function dismissExteriorSite(site: ExteriorSite) {
  exteriorDismissSite(exteriorEpisode(), site);
}

export function exteriorSite() {
  return exteriorCurrentSite(exteriorEpisode());
}

export function exteriorObjectiveLine(): string {
  return exteriorObjective(exteriorEpisode());
}

function elapsedSince(openedAt: number | null, nowMs: number): number {
  return Math.max(0, nowMs - (openedAt ?? nowMs));
}

// ——— M19 — frozen coupling ————————————————————————————————————————————

export const M19_BRIEF =
  'Frozen coolant coupling. Open the valve fully by turning the wheel (each turn is one step). Cold builds at the collar as the valve opens: if the collar ices, the wheel will not move until it is thawed — heat gun on the rack. Step away whenever you choose; the coupling keeps its state.';

export function m19PromptBody(): string {
  const { m19 } = exteriorEpisode();

  if (!m19.entered) {
    return M19_BRIEF;
  }

  return m19Readout(m19);
}

export function m19Present(nowMs: number) {
  const state = exteriorEpisode().m19;
  const w = exteriorWindows().m19;

  w.setComprehension('passed');
  w.present(nowMs, {
    form: state.form,
    schedule: m19Schedule(state),
    progress: state.progress,
    brief_shown: true,
  });
}

function m19EnsureOpen(nowMs: number) {
  const state = exteriorEpisode().m19;
  const w = exteriorWindows().m19;

  if (m19Enter(state, nowMs)) {
    w.setComprehension('passed');
    w.open(nowMs, {
      form: state.form,
      schedule: m19Schedule(state),
      progress: 0,
      brief_shown: true,
    });
  }
}

export type M19ActKind = 'turn' | 'thaw' | 'inspect';

export interface M19ActOutcome {
  kind: M19ActKind;
  message: string;
  turn?: M19TurnResult;
  thaw?: M19ThawResult;
  completed: boolean;
}

/** One coupling act (the host performs the timed action, then calls this). */
export function m19Act(
  kind: M19ActKind,
  nowMs: number,
  inputMode: InputMode,
): M19ActOutcome | null {
  const state = exteriorEpisode().m19;

  if (state.closed || m19Completed(state)) {
    return null;
  }

  m19EnsureOpen(nowMs);

  const w = exteriorWindows().m19;
  const elapsed = elapsedSince(state.opened_at_ms, nowMs);

  if (kind === 'inspect') {
    const message = m19Inspect(state);

    w.log('inspect', {
      elapsed_ms: elapsed,
      progress: state.progress,
      bound: state.bound,
      input_mode: inputMode,
    });

    return { kind, message, completed: false };
  }

  if (kind === 'turn') {
    const turn = m19Turn(state, nowMs);

    w.log('turn', {
      elapsed_ms: elapsed,
      effective: turn.effective,
      progress: turn.progress,
      bound_after: turn.bound,
      bind_engaged: turn.bind_engaged,
      ineffective_run: state.ineffective_run,
      input_mode: inputMode,
    });

    if (turn.difficulty_onset) {
      w.log('difficulty_onset', {
        elapsed_ms: elapsed,
        progress: turn.progress,
        explained: true,
        input_mode: 'system',
      });
    }

    let message: string;

    if (turn.completed) {
      message =
        'The wheel comes round — coupling fully open, coolant flow restored.';
      m19Close(state, 'step_away');
      w.complete(nowMs, m19RawComponents(state), inputMode);
    } else if (!turn.effective) {
      message =
        'The wheel will not move — the collar is iced solid. Thaw it (heat gun on the rack) before turning.';
    } else if (turn.bind_engaged) {
      message = `Valve ${turn.progress}% open — the collar has iced over as the pressure rose. The wheel stops dead. Thaw the collar before turning further.`;
    } else {
      message = `Valve ${turn.progress}% open.`;
    }

    return { kind, message, turn, completed: turn.completed };
  }

  const thaw = m19Thaw(state, nowMs);

  w.log('thaw', {
    elapsed_ms: elapsed,
    useful: thaw.useful,
    thaw_remaining: thaw.thaw_remaining,
    freed: thaw.freed,
    input_mode: inputMode,
  });

  if (thaw.strategy_shift) {
    w.log('strategy_shift', {
      elapsed_ms: elapsed,
      from: 'turn_ineffective',
      to: 'thaw',
      input_mode: inputMode,
    });
  }

  const message = !thaw.useful
    ? 'The collar is already free — no thawing needed.'
    : thaw.freed
      ? 'The ice cracks off the collar — it is free. The wheel will turn again.'
      : `Ice softening — ${thaw.thaw_remaining} more thaw pass${thaw.thaw_remaining === 1 ? '' : 'es'} to free the collar.`;

  return { kind, message, thaw, completed: false };
}

/** The neutral stop (explicit). Records a completed observation. */
export function m19StepAway(nowMs: number, inputMode: InputMode): boolean {
  const state = exteriorEpisode().m19;

  if (!m19Open(state)) {
    return false;
  }

  m19Close(state, 'step_away');
  exteriorWindows().m19.complete(nowMs, m19RawComponents(state), inputMode, {
    exitState: 'stopped',
  });

  return true;
}

// ——— M20 — antenna restoration (start only) ————————————————————————————

export const M20_BRIEF =
  'Mast 04 restoration. Storm damage: the base clamp is iced and the feed line has come off. Outdoor work: clear the base clamp, then seat the feed line. The feed can only be aligned from the station feed console inside — that part is done later.';

function ensureMissionLog() {
  if (missionLogRegistered) {
    return;
  }

  missionLogRegistered = true;
  registerMissionLogEntry({
    id: 'm20_antenna_obligation',
    kind: 'project',
    text: () => m20MissionLogText(exteriorEpisode().m20),
    // Hidden once the restoration is complete (Unit 5) — the record stays.
    isClosed: () =>
      !exteriorEpisode().m20.accepted || m20Complete(exteriorEpisode().m20),
    order: 40,
  });
}

export function m20Present(nowMs: number) {
  const w = exteriorWindows().m20;

  w.setComprehension('passed');
  w.present(nowMs, { brief_shown: true, outdoor_stages_total: 2 });
}

export function m20AcceptTask(nowMs: number, inputMode: InputMode): boolean {
  const state = exteriorEpisode().m20;
  const w = exteriorWindows().m20;

  if (!m20Accept(state, nowMs)) {
    return false;
  }

  w.setComprehension('passed');
  w.open(nowMs, {
    brief_shown: true,
    outdoor_stages_total: 2,
    indoor_stage: 'align_feed',
  });
  w.log('accepted', { input_mode: inputMode });
  ensureMissionLog();

  return true;
}

export function m20DoStage(
  stage: M20OutdoorStage,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const state = exteriorEpisode().m20;

  if (!m20CompleteStage(state, stage, nowMs)) {
    return false;
  }

  exteriorWindows().m20.log('stage_completed', {
    stage,
    stages_done: state.stages_done.length,
    outdoor_complete: m20OutdoorComplete(state),
    elapsed_ms: elapsedSince(state.accepted_at_ms, nowMs),
    input_mode: inputMode,
  });

  return true;
}

// ——— M23 — excavation ——————————————————————————————————————————————————

export const M23_BRIEF =
  'Excavation field. A relay coupling is buried somewhere inside the stakes. Scanner (C): sweeps from where you stand and reads strength 0-100 with FAINT / MODERATE / STRONG and whether it is stronger or weaker than your last sweep — it never gives a direction. Spade (D): digs the cell you are facing; dug ground stays open. Only the exact cell holds the coupling. Begin when ready; stop at the stake whenever you choose.';

export function m23Present(nowMs: number) {
  const state = exteriorEpisode();
  const w = exteriorWindows().m23;

  w.setComprehension('passed');
  w.present(nowMs, {
    form: state.m23_form,
    plot: 'staked_east_field',
    brief_shown: true,
  });
}

export function m23Begin(nowMs: number, inputMode: InputMode): boolean {
  const state = exteriorEpisode();
  const w = exteriorWindows().m23;

  if (!m23Enter(state.m23, nowMs)) {
    return false;
  }

  w.setComprehension('passed');
  w.open(nowMs, {
    form: state.m23_form,
    plot: 'staked_east_field',
    brief_shown: true,
    target_cell_hidden: true,
    begin_input_mode: inputMode,
  });

  return true;
}

export function m23WindowOpen(): boolean {
  return m23Open(exteriorEpisode().m23);
}

export function m23TargetActive(): boolean {
  const state = exteriorEpisode().m23;

  return m23Open(state) && !state.recovered;
}

export function m23Scan(record: M23ScanLike, nowMs: number) {
  const state = exteriorEpisode().m23;

  if (!m23Open(state)) {
    return null;
  }

  const note = m23NoteScan(state, record, nowMs);
  const w = exteriorWindows().m23;

  w.log('scan', {
    elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
    strength: record.strength,
    category: record.category,
    trend: record.trend,
    on_signal: record.target_id !== null,
    on_plot: note.on_plot,
    informative_move: note.informative,
    first_actionable: note.first_actionable,
    scan_number: state.scans,
    player_bin: `${Math.round(record.player_x / 16)}:${Math.round(record.player_y / 16)}`,
    input_mode: 'keyboard',
  });

  if (note.strategy_shift) {
    w.log('strategy_shift', {
      elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
      kind: state.last_act === 'scan' ? 'relocalise_scan' : 'relocate',
      input_mode: 'keyboard',
    });
  }

  return note;
}

export function m23Dig(
  record: M23DigLike,
  nowMs: number,
  inputMode: InputMode,
) {
  const state = exteriorEpisode().m23;

  if (!m23Open(state)) {
    return null;
  }

  const note = m23NoteDig(state, record, nowMs);
  const w = exteriorWindows().m23;

  w.log('dig', {
    elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
    col: record.col,
    row: record.row,
    exact_plot_cell: note.exact,
    outcome: record.outcome,
    dig_number: state.digs,
    input_mode: inputMode,
  });

  if (note.recovered) {
    w.log('recovered', {
      elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
      delivery: state.recovery_delivery,
      input_mode: inputMode,
    });
    m23Close(state, 'stopped');
    w.complete(nowMs, m23RawComponents(state), inputMode);
  }

  return note;
}

export function m23Invalid(nowMs: number, detail: Record<string, unknown>) {
  const state = exteriorEpisode().m23;

  if (!m23Open(state)) {
    return;
  }

  m23NoteInvalidAction(state);
  exteriorWindows().m23.log('invalid_action', {
    elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
    ...detail,
    input_mode: 'keyboard',
  });
}

/** Explicit stop at the stake. Records a completed observation. */
export function m23Stop(nowMs: number, inputMode: InputMode): boolean {
  const state = exteriorEpisode().m23;

  if (!m23Open(state)) {
    return false;
  }

  m23Close(state, 'stopped');
  exteriorWindows().m23.complete(nowMs, m23RawComponents(state), inputMode, {
    exitState: 'stopped',
  });

  return true;
}

export function m23TargetCell() {
  return M23_TARGET_CELLS[exteriorEpisode().m23_form];
}

// ——— M24 — magnet rig ——————————————————————————————————————————————————

export function m24Present(nowMs: number) {
  const state = exteriorEpisode();
  const w = exteriorWindows().m24;

  w.setComprehension('passed');
  w.present(nowMs, {
    deck_form: state.deck_form,
    deck_position: magnetDeckState.position,
    brief_shown: true,
  });
}

export function m24Begin(nowMs: number, inputMode: InputMode): boolean {
  const state = exteriorEpisode();
  const w = exteriorWindows().m24;

  if (!m24Enter(state.m24, nowMs, magnetDeckState.position)) {
    return false;
  }

  w.setComprehension('passed');
  w.open(nowMs, {
    deck_form: state.deck_form,
    deck_position_at_open: magnetDeckState.position,
    brief_shown: true,
    depletion_statement_pre_explained: true,
    begin_input_mode: inputMode,
  });

  if (magnetDeckState.position > 0) {
    w.recordPriorExposure(`deck_position_at_open=${magnetDeckState.position}`);
  }

  return true;
}

export function m24WindowOpen(): boolean {
  return m24Open(exteriorEpisode().m24);
}

export function m24Cycle(record: M24CycleLike, nowMs: number) {
  const state = exteriorEpisode().m24;

  if (!m24Open(state)) {
    return null;
  }

  const note = m24NoteCycle(state, record, nowMs);
  const w = exteriorWindows().m24;
  const elapsed = elapsedSince(state.opened_at_ms, nowMs);

  w.log('cycle', {
    elapsed_ms: elapsed,
    cancelled: record.cancelled,
    hook_set: record.hook_set,
    locked_in_band: record.locked_in_band,
    lock_source: record.lock_source,
    outcome_tier: record.outcome_tier,
    item_id: record.item_id,
    item_delivery: record.item_delivery,
    pull_position: record.pull_position,
    cycle_duration_ms: record.cycle_duration_ms,
    post_depletion: note.post_depletion,
    post_acknowledgement: note.post_ack,
    knowledge_state: m24KnowledgeState(state),
    cycle_number: state.cycles_committed,
    input_mode: 'keyboard',
  });

  if (note.depletion_reached_now) {
    w.log('depletion_reached', {
      elapsed_ms: elapsed,
      at_cycle: state.depletion_reached_at_cycle,
      input_mode: 'system',
    });
  }

  return note;
}

export function m24DepletionShown(nowMs: number): boolean {
  const state = exteriorEpisode().m24;

  if (!m24NoteDepletionShown(state, nowMs)) {
    return false;
  }

  exteriorWindows().m24.log('depletion_shown', {
    elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
    display_number: state.depletion_shown_count,
    input_mode: 'system',
  });

  return true;
}

export function m24AcknowledgeDepletion(
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const state = exteriorEpisode().m24;

  if (!m24Acknowledge(state, nowMs)) {
    return false;
  }

  exteriorWindows().m24.log('depletion_acknowledged', {
    elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
    input_mode: inputMode,
  });

  return true;
}

export function m24Alternative(nowMs: number, inputMode: InputMode): boolean {
  const state = exteriorEpisode().m24;

  if (!m24NoteAlternative(state, nowMs)) {
    return false;
  }

  exteriorWindows().m24.log('alternative_opened', {
    elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
    knowledge_state: m24KnowledgeState(state),
    input_mode: inputMode,
  });

  return true;
}

// ——— M26 — uplink channel ————————————————————————————————————————————

export function m26Present(nowMs: number) {
  const w = exteriorWindows().m26;

  w.setComprehension('passed');
  w.present(nowMs, { brief_shown: true, reports_due: 2 });
}

export function m26Begin(nowMs: number, inputMode: InputMode): boolean {
  const state = exteriorEpisode().m26;
  const w = exteriorWindows().m26;

  if (!m26Enter(state, nowMs)) {
    return false;
  }

  w.setComprehension('passed');
  w.open(nowMs, {
    brief_shown: true,
    reports_due: 2,
    posts: { A: 'primary', B: 'backup' },
    line_a_connected: true,
    begin_input_mode: inputMode,
  });

  return true;
}

export function m26WindowOpen(): boolean {
  return m26Open(exteriorEpisode().m26);
}

export function m26Send(
  channel: M26Channel,
  nowMs: number,
  inputMode: InputMode,
): M26Transmission | null {
  const state = exteriorEpisode().m26;

  if (!m26Open(state)) {
    return null;
  }

  const alternativeBefore = state.alternative_used_ms;
  const transmission = m26Transmit(state, channel, nowMs);
  const w = exteriorWindows().m26;
  const elapsed = elapsedSince(state.opened_at_ms, nowMs);

  w.log('transmission', {
    elapsed_ms: elapsed,
    channel,
    report: transmission.report,
    delivered: transmission.delivered,
    classification: transmission.classification,
    knowledge_state: m26Knowledge(state),
    transmission_number: state.transmissions.length,
    input_mode: inputMode,
  });

  if (transmission.classification === 'confirmation_probe') {
    w.log('confirmation_probe', { elapsed_ms: elapsed, input_mode: inputMode });
  } else if (transmission.classification === 'postknowledge') {
    w.log('postknowledge_transmission', {
      elapsed_ms: elapsed,
      count: state.postknowledge_transmissions,
      input_mode: inputMode,
    });
  }

  if (alternativeBefore === null && state.alternative_used_ms !== null) {
    w.log('alternative_used', { elapsed_ms: elapsed, input_mode: inputMode });
  }

  return transmission;
}

export function m26DisconnectPending(): boolean {
  return m26DisconnectDue(exteriorEpisode().m26);
}

export function m26DemonstrateDisconnect(nowMs: number): boolean {
  const state = exteriorEpisode().m26;

  if (!m26Demonstrate(state, nowMs)) {
    return false;
  }

  exteriorWindows().m26.log('disconnect_demonstrated', {
    elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
    evidence: [
      'conduit_severed',
      'indicator_line_a_open',
      'panel_notice',
      'no_carrier_readout',
    ],
    input_mode: 'system',
  });

  return true;
}

export function m26Evidence(
  nowMs: number,
  source: string,
  inputMode: InputMode,
): boolean {
  const state = exteriorEpisode().m26;

  if (!m26ViewEvidence(state, nowMs, source)) {
    return false;
  }

  exteriorWindows().m26.log('evidence_viewed', {
    elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
    source,
    view_number: state.evidence_views,
    input_mode: inputMode,
  });

  return true;
}

export function m26AcknowledgeDisconnect(
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const state = exteriorEpisode().m26;

  if (!m26Acknowledge(state, nowMs)) {
    return false;
  }

  exteriorWindows().m26.log('disconnect_acknowledged', {
    elapsed_ms: elapsedSince(state.opened_at_ms, nowMs),
    evidence_views_before: state.evidence_views,
    input_mode: inputMode,
  });

  return true;
}

export function m26NextReportId() {
  return m26NextReport(exteriorEpisode().m26);
}

export function m26Delivered(): boolean {
  return m26AllDelivered(exteriorEpisode().m26);
}

// ——— departures / resumes / closures ————————————————————————————————————

/** Airlock exit: every open window pauses and records a departure. */
export function exteriorDeparture(nowMs: number) {
  const state = exteriorEpisode();
  const w = exteriorWindows();

  if (m19Depart(state.m19)) {
    w.m19.log('departed', {
      departures: state.m19.departures,
      input_mode: 'system',
    });
    w.m19.pause(nowMs);
  }

  if (m20Depart(state.m20)) {
    w.m20.log('departed', {
      departures: state.m20.departures,
      input_mode: 'system',
    });
    w.m20.pause(nowMs);
  }

  if (m23Depart(state.m23)) {
    w.m23.log('departed', {
      departures: state.m23.departures,
      input_mode: 'system',
    });
    w.m23.pause(nowMs);
  }

  if (m24Depart(state.m24)) {
    w.m24.log('departed', {
      departures: state.m24.departures,
      input_mode: 'system',
    });
    w.m24.pause(nowMs);
  }

  if (m26Depart(state.m26)) {
    w.m26.log('departed', {
      departures: state.m26.departures,
      input_mode: 'system',
    });
    w.m26.pause(nowMs);
  }
}

/** Re-entry: open windows resume their active-time bookkeeping. */
export function exteriorResume(nowMs: number) {
  const w = exteriorWindows();

  w.m19.resume(nowMs);
  w.m20.resume(nowMs);
  w.m23.resume(nowMs);
  w.m24.resume(nowMs);
  w.m26.resume(nowMs);
}

type ShiftChoice = 'ended_shift_outside' | 'closed_at_review';

function closeM24(nowMs: number, choice: ShiftChoice) {
  const state = exteriorEpisode().m24;
  const w = exteriorWindows().m24;

  if (!m24Open(state)) {
    return;
  }

  m24Close(state, choice);

  const disposition = m24ClosureDisposition(state);
  const raw = m24RawComponents(state);

  if (disposition.kind === 'completed') {
    w.complete(nowMs, raw, 'system');
  } else if (disposition.kind === 'missing') {
    // Audit 2026-09 A15: the substantive detail (`deck_never_depleted`)
    // is passed on this branch too — stop() reads `raw.invalid_detail`
    // for the register detail and previously only saw the exit code here.
    w.stop(
      nowMs,
      choice === 'closed_at_review' ? 'closed_at_review' : 'departed',
      { ...raw, invalid_detail: disposition.detail },
      'system',
      'censored',
    );
  } else {
    // One terminal marker: invalid (knowledge unverified), never censored.
    w.stop(
      nowMs,
      choice === 'closed_at_review' ? 'closed_at_review' : 'departed',
      { ...raw, invalid_detail: disposition.detail },
      'system',
      'insufficient_opportunity',
    );
  }
}

function closeM26(nowMs: number, choice: ShiftChoice) {
  const state = exteriorEpisode().m26;
  const w = exteriorWindows().m26;

  if (!m26Open(state)) {
    return;
  }

  m26Close(state, choice);

  const disposition = m26ClosureDisposition(state);
  const raw = m26RawComponents(state);

  if (disposition.kind === 'completed') {
    w.complete(nowMs, raw, 'system');
  } else if (disposition.kind === 'missing') {
    // Audit 2026-09 A15: pass `channel_never_disconnected` (see closeM24).
    w.stop(
      nowMs,
      choice === 'closed_at_review' ? 'closed_at_review' : 'departed',
      { ...raw, invalid_detail: disposition.detail },
      'system',
      'censored',
    );
  } else {
    // One terminal marker: invalid (knowledge unverified), never censored.
    w.stop(
      nowMs,
      choice === 'closed_at_review' ? 'closed_at_review' : 'departed',
      { ...raw, invalid_detail: disposition.detail },
      'system',
      'insufficient_opportunity',
    );
  }
}

function closeM19(nowMs: number, choice: ShiftChoice) {
  const state = exteriorEpisode().m19;

  if (!m19Open(state)) {
    return;
  }

  m19Close(state, choice);

  if (choice === 'closed_at_review') {
    // Never a stop the participant chose: censored (missing), never valid.
    exteriorWindows().m19.stop(
      nowMs,
      'closed_at_review',
      m19RawComponents(state),
      'system',
      'censored',
    );

    return;
  }

  exteriorWindows().m19.complete(nowMs, m19RawComponents(state), 'system', {
    exitState: 'stopped',
  });
}

function closeM23(nowMs: number, choice: ShiftChoice) {
  const state = exteriorEpisode().m23;

  if (!m23Open(state)) {
    return;
  }

  m23Close(state, choice);

  if (choice === 'closed_at_review') {
    exteriorWindows().m23.stop(
      nowMs,
      'closed_at_review',
      m23RawComponents(state),
      'system',
      'censored',
    );

    return;
  }

  exteriorWindows().m23.complete(nowMs, m23RawComponents(state), 'system', {
    exitState: 'stopped',
  });
}

/**
 * The interruption point — Noor's "finished outside". Exterior
 * observations close with their honest dispositions; the M20 start state
 * is frozen (`progress_pre_interruption`) and the M20 window stays OPEN
 * for the Return episode. Idempotent.
 */
export function endExteriorShift(nowMs: number) {
  const state = exteriorEpisode();

  if (state.shift_ended_at_ms !== null) {
    return;
  }

  state.shift_ended_at_ms = nowMs;
  closeM19(nowMs, 'ended_shift_outside');
  closeM23(nowMs, 'ended_shift_outside');
  closeM24(nowMs, 'ended_shift_outside');
  closeM26(nowMs, 'ended_shift_outside');

  if (m20RecordInterruption(state.m20, nowMs)) {
    exteriorWindows().m20.log('interruption_recorded', {
      progress_pre_interruption: state.m20.progress_pre_interruption,
      outdoor_complete: m20OutdoorComplete(state.m20),
      resume_window: M20_RESUME_WINDOW_ID,
      input_mode: 'system',
    });
    exteriorWindows().m20.pause(nowMs);
  }
}

/**
 * Review closure (Utility Deck): never-presented windows record absence;
 * still-open windows close as at the shift end with `closed_at_review`.
 * The M20 window, if still open here, is CENSORED: the return episode's
 * `closeM20ResumeAtReview` (returnWindows.ts, called first by the review
 * closure) has already completed the observation whenever the resume
 * opportunity was PRESENTED; reaching this branch means the participant
 * never came back to the feed console — no M20 outcome exists.
 */
export function closeExteriorWindowsAtReview(nowMs: number) {
  const state = exteriorEpisode();
  const w = exteriorWindows();

  closeM19(nowMs, 'closed_at_review');
  closeM23(nowMs, 'closed_at_review');
  closeM24(nowMs, 'closed_at_review');
  closeM26(nowMs, 'closed_at_review');

  for (const [window, detail] of [
    [w.m19, 'coupling never worked before the review'],
    [w.m23, 'excavation never begun before the review'],
    [w.m24, 'rig tally never begun before the review'],
    [w.m26, 'uplink never used before the review'],
  ] as const) {
    if (window.windowStatus() === 'unopened') {
      window.markAbsent(detail);
    }
  }

  if (w.m20.windowStatus() === 'unopened') {
    w.m20.markAbsent('antenna restoration never accepted before the review');
  } else if (w.m20.isOpen()) {
    // Censored as it stands: no interruption is fabricated at the review.
    w.m20.stop(
      nowMs,
      'closed_at_review',
      m20Snapshot(state.m20),
      'system',
      'censored',
    );
  }
}

/** Technical failure on an exterior item (invalid — never behaviour). */
export function exteriorTechnicalFailure(
  item: 'M19' | 'M20' | 'M23' | 'M24' | 'M26',
  detail: string,
) {
  const state = exteriorEpisode();
  const w = exteriorWindows();

  switch (item) {
    case 'M19':
      state.m19.closed = true; // no stop_choice: never a participant stop
      w.m19.technicalFailure(detail);
      break;
    case 'M20':
      state.m20.technical_failure = detail;
      w.m20.technicalFailure(detail);
      break;
    case 'M23':
      state.m23.closed = true;
      w.m23.technicalFailure(detail);
      break;
    case 'M24':
      state.m24.closed = true;
      w.m24.technicalFailure(detail);
      break;
    case 'M26':
      state.m26.closed = true;
      w.m26.technicalFailure(detail);
      break;
  }
}

/** DEV probe snapshot (read-only; never read back into gameplay). */
export function exteriorProbeSnapshot() {
  const state = exteriorEpisode();
  const w = exteriorWindows();

  return {
    site: exteriorCurrentSite(state),
    objective: exteriorObjective(state),
    m23_form: state.m23_form,
    deck_form: state.deck_form,
    shift_ended: state.shift_ended_at_ms !== null,
    zone_entries: state.zone_entries,
    caches: state.caches.map((entry) => ({ ...entry })),
    dug_cells: state.dug_cells.map((cell) => ({ ...cell })),
    m19: {
      window: w.m19.windowStatus(),
      exit: w.m19.exit(),
      ...m19RawComponents(state.m19),
      bound: state.m19.bound,
      thaw_remaining: state.m19.thaw_remaining,
      entered: state.m19.entered,
      closed: state.m19.closed,
    },
    m20: { window: w.m20.windowStatus(), ...m20Snapshot(state.m20) },
    m23: {
      window: w.m23.windowStatus(),
      exit: w.m23.exit(),
      open: m23Open(state.m23),
      ...m23RawComponents(state.m23),
    },
    m24: {
      window: w.m24.windowStatus(),
      exit: w.m24.exit(),
      open: m24Open(state.m24),
      knowledge: m24KnowledgeState(state.m24),
      ...m24RawComponents(state.m24),
    },
    m26: {
      window: w.m26.windowStatus(),
      exit: w.m26.exit(),
      open: m26Open(state.m26),
      knowledge: m26Knowledge(state.m26),
      next_report: m26NextReport(state.m26),
      ...m26RawComponents(state.m26),
    },
  };
}

/** Test-only escape hatch (page-session state otherwise). */
export function resetExteriorEpisode() {
  episode = null;
  windows = null;
  missionLogRegistered = false;
}
