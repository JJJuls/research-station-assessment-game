/**
 * M13 — Conduit Lattice construction (Information Processing foundation).
 *
 * BESSI Information Processing item M13 ("Solve puzzles.") — the
 * provisional behavioural analogue is constraint satisfaction through
 * manipulating a physical pipe / signal-lattice network: a 3×3 board, the
 * standardised nine-piece set (2 straights, 4 elbows, 1 tee, 1 inline
 * valve, 1 end cap), a fractured centre mount that forces a detour, one
 * feed port and one intake port, and explicit "test flow" submission that
 * validates real connectivity (sealed run, valve inline, no open branch).
 *
 * Engine discipline (inventory precedent): a pure transactional board
 * (`PipeBoardState`) whose operations validate before commit and return
 * `{state, result}`; the module store below is the ONE authoritative
 * state container for the lattice bench. Mouse and keyboard call the same
 * `m13LatticeAct` with the same semantic actions.
 *
 * Parallel forms (matched by construction — a 90° rotation of the same
 * geometry): A feed west of A2 → intake east of C2; B feed north of B1 →
 * intake south of B3. Broken mount B2 in both.
 *
 * SCIENTIFIC BOUNDARY: family `proto_m13_lattice_*` only; raw observables
 * (placements, moves, rotations, constraints satisfied, open branches…)
 * are recorded, never scored. M18 never reads any of this state.
 */

import type {
  M13Piece,
  M13Placement,
  M13SlotId,
  PipeValidationDetail,
} from '../measurement/m13PipePuzzle';
import { getM13Piece, M13_PIECES } from '../measurement/m13PipePuzzle';
import type { FormId, InputMode } from './model';
import type {
  LatticeForm,
  PipeBoardState,
  PipeHeld,
  PipeOutcome,
  PipeResult,
} from './pipeBoardEngine';
import {
  createPipeBoardState,
  M13L_FORMS,
  pipeBenchPieces,
  pipeCancelHeld,
  pipePickUpBench,
  pipePickUpSlot,
  pipePlaceHeld,
  pipeReturnHeld,
  pipeReturnSlot,
  pipeRotateHeld,
  pipeRotateSlot,
  pipeValidate,
} from './pipeBoardEngine';
import { refreshIpProbe, registerIpProbeSource } from './probe';
import { declareIpEvents, logIpEvent } from './telemetry';
import type { IpWindow } from './windowState';
import {
  bumpIpHelp,
  bumpIpSubmission,
  closeIpWindow,
  createIpWindow,
  declareIpWindow,
  enterIpWindow,
  ipWindowFields,
  ipWindowIsClosed,
  leaveIpPanel,
  resolveForm,
} from './windowState';

export const M13L_OPPORTUNITY_ID = 'proto_m13_lattice_construction';
export const M13L_ENTRY_STATE_VERSION = 'm13-lattice-v1';
export const M13L_MAX_SUBMISSIONS = 4;
export const M13L_CONSTRAINTS = [
  'endpoint_connected',
  'valve_inline',
  'no_open_branch',
] as const;
const OBJECT_ID = 'ip_lattice_bench';

export const M13L_EVENT_TYPES = declareIpEvents('proto_m13_lattice', [
  'window_opened',
  'window_reopened',
  'panel_left',
  'piece_picked',
  'piece_placed',
  'piece_returned',
  'piece_rotated',
  'placement_refused',
  'undone',
  'board_reset',
  'submitted',
  'completed',
  'exhausted',
  'stopped',
  'help_consulted',
  'technical_failure',
]);

export type {
  LatticeForm,
  PipeBoardSnapshotV1,
  PipeBoardState,
  PipeHeld,
  PipeOpFailure,
  PipeOutcome,
  PipeResult,
} from './pipeBoardEngine';
export {
  createPipeBoardState,
  loadPipeSnapshot,
  M13L_FORMS,
  pipeBenchPieces,
  pipeCancelHeld,
  pipePickUpBench,
  pipePickUpSlot,
  pipePlaceHeld,
  pipeReturnHeld,
  pipeReturnSlot,
  pipeRotateHeld,
  pipeRotateSlot,
  pipeValidate,
  toPipeSnapshot,
} from './pipeBoardEngine';

/* ------------------------------------------------------------------ *
 * Module store (one authoritative container)
 * ------------------------------------------------------------------ */

export type PipeAction =
  | { kind: 'pick_bench'; piece_id: string }
  | { kind: 'pick_slot'; slot: string }
  | { kind: 'place'; slot: string }
  | { kind: 'cancel' }
  | { kind: 'return_held' }
  | { kind: 'return_slot'; slot: string }
  | { kind: 'rotate_held' }
  | { kind: 'rotate_slot'; slot: string }
  /** Usability pass (v2 Unit 2): revert the last board change. */
  | { kind: 'undo' }
  /** Usability pass (v2 Unit 2): return every seated piece to the bench. */
  | { kind: 'reset_board' };

/** Bounded undo history (board snapshots before each committed change). */
export const M13L_UNDO_DEPTH = 64;

interface SubmissionRecord {
  submission: number;
  valid: boolean;
  reason: string;
  endpoint_connected: boolean;
  valve_inline: boolean;
  open_branch_count: number;
  constraints_satisfied: number;
  input_mode: InputMode;
}

interface M13LatticeState {
  window: IpWindow;
  form: FormId;
  board: PipeBoardState;
  placements: number;
  moves: number;
  rotations: number;
  returns: number;
  refused: number;
  undos: number;
  resets: number;
  submissions: SubmissionRecord[];
  feedback: string[];
  /** One-line neutral description of the last successful board act (UI). */
  last_action: string | null;
  /** Board snapshots before each committed change (undo stack). */
  history: PipeBoardState[];
  final_network_valid: boolean | null;
}

function createInitialState(form: FormId): M13LatticeState {
  return {
    window: createIpWindow({
      opportunity_id: M13L_OPPORTUNITY_ID,
      owner: 'M13',
      entry_state_version: M13L_ENTRY_STATE_VERSION,
      form_id: form,
    }),
    form,
    board: createPipeBoardState(),
    placements: 0,
    moves: 0,
    rotations: 0,
    returns: 0,
    refused: 0,
    undos: 0,
    resets: 0,
    submissions: [],
    feedback: [],
    last_action: null,
    history: [],
    final_network_valid: null,
  };
}

let state: M13LatticeState | null = null;

function ensure(): M13LatticeState {
  if (state === null) {
    state = createInitialState(resolveForm('m13'));
  }

  return state;
}

export function m13LatticeConfig(): LatticeForm {
  return M13L_FORMS[ensure().form];
}

function rawSummary() {
  const s = ensure();
  const last = s.submissions[s.submissions.length - 1];

  return {
    ...ipWindowFields(s.window),
    pieces_available: M13_PIECES.length,
    placements: s.placements,
    moves: s.moves,
    rotations: s.rotations,
    returns: s.returns,
    placements_refused: s.refused,
    undos: s.undos,
    resets: s.resets,
    constraints_total: M13L_CONSTRAINTS.length,
    constraints_satisfied_at_submission: last?.constraints_satisfied ?? null,
    open_branch_count_at_submission: last?.open_branch_count ?? null,
    endpoint_connected_at_submission: last?.endpoint_connected ?? null,
    valve_inline_at_submission: last?.valve_inline ?? null,
    final_network_valid: s.final_network_valid,
  };
}

function log(suffix: string, metadata: Record<string, unknown> = {}) {
  logIpEvent('proto_m13_lattice', OBJECT_ID, suffix, {
    ...ipWindowFields(ensure().window),
    ...metadata,
  });
  refreshIpProbe();
}

export function declareM13Lattice() {
  const s = ensure();

  declareIpWindow(s.window);
  registerIpProbeSource('m13', M13L_OPPORTUNITY_ID, m13LatticeProbe);
  refreshIpProbe();
}

export function m13LatticeWindowStatus() {
  return ensure().window.status;
}

export function m13LatticeOpen(nowMs: number) {
  const s = ensure();

  declareM13Lattice();

  const entry = enterIpWindow(s.window, nowMs);

  if (entry === 'opened') {
    log('window_opened', {
      pieces_available: M13_PIECES.length,
      piece_set: M13_PIECES.map((piece) => piece.piece_id),
      board: M13L_FORMS[s.form],
      max_submissions: M13L_MAX_SUBMISSIONS,
    });
  } else if (entry === 'reopened') {
    log('window_reopened');
  }

  refreshIpProbe();
}

export function m13LatticeLeave(nowMs: number) {
  const s = ensure();

  if (s.window.panel_open) {
    // A held piece always goes safely home when the bench is left.
    if (s.board.held !== null) {
      s.board = pipeCancelHeld(s.board).state;
    }

    leaveIpPanel(s.window, nowMs);
    log('panel_left');
  }
}

function canAct(): boolean {
  return ensure().window.status === 'open';
}

/** Every semantic manipulation (mouse and keyboard call exactly this). */
export function m13LatticeAct(
  action: PipeAction,
  mode: InputMode,
  nowMs: number,
): PipeResult {
  void nowMs;

  const s = ensure();

  if (!canAct()) {
    return { ok: false, reason: 'holding', detail: 'The bench is closed.' };
  }

  const config = M13L_FORMS[s.form];
  let outcome: PipeOutcome;

  switch (action.kind) {
    case 'pick_bench':
      outcome = pipePickUpBench(s.board, action.piece_id);
      break;
    case 'pick_slot':
      outcome = pipePickUpSlot(s.board, action.slot);
      break;
    case 'place':
      outcome = pipePlaceHeld(s.board, action.slot, config);
      break;
    case 'cancel':
      outcome = pipeCancelHeld(s.board);
      break;
    case 'return_held':
      outcome = pipeReturnHeld(s.board);
      break;
    case 'return_slot':
      outcome = pipeReturnSlot(s.board, action.slot);
      break;
    case 'rotate_held':
      outcome = pipeRotateHeld(s.board);
      break;
    case 'rotate_slot':
      outcome = pipeRotateSlot(s.board, action.slot);
      break;
    case 'undo':
      outcome = undoOutcome(s);
      break;
    case 'reset_board':
      outcome = resetOutcome(s);
      break;
    default:
      outcome = {
        state: s.board,
        result: {
          ok: false,
          reason: 'unknown_slot',
          detail: 'Unknown action.',
        },
      };
  }

  if (!outcome.result.ok) {
    if (action.kind === 'place') {
      s.refused += 1;
      log('placement_refused', {
        slot: action.slot,
        reason: outcome.result.reason,
        input_mode: mode,
      });
    }

    refreshIpProbe();

    return outcome.result;
  }

  const before = s.board;

  // Undo stack: every committed change to what is SEATED (place / return
  // / rotate / reset) pushes the prior board; picks, cancels and undo
  // itself never do. Bounded depth; oldest entries fall away.
  if (
    action.kind === 'place' ||
    action.kind === 'return_held' ||
    action.kind === 'return_slot' ||
    action.kind === 'rotate_held' ||
    action.kind === 'rotate_slot' ||
    action.kind === 'reset_board'
  ) {
    // Snapshots always describe SEATED state: a piece held mid-act goes
    // home in the snapshot, so an undo never leaves a piece in the hand.
    s.history.push(
      structuredClone(
        before.held === null ? before : pipeCancelHeld(before).state,
      ),
    );

    if (s.history.length > M13L_UNDO_DEPTH) {
      s.history.shift();
    }
  }

  s.board = outcome.state;

  switch (action.kind) {
    case 'pick_bench':
    case 'pick_slot':
      log('piece_picked', {
        piece_id: s.board.held?.piece_id,
        source: s.board.held?.source,
        input_mode: mode,
      });
      s.last_action =
        s.board.held === null
          ? null
          : `Holding ${getM13Piece(s.board.held.piece_id).label}.`;
      break;
    case 'place': {
      const detail = outcome.result.detail as {
        source: string;
        relocation: boolean;
      };
      const seated = s.board.placements[action.slot as M13SlotId];

      if (detail.relocation) {
        s.moves += 1;
      } else {
        s.placements += 1;
      }

      log('piece_placed', {
        piece_id: seated?.piece_id,
        slot: action.slot,
        rotation: seated?.rotation,
        source: detail.source,
        relocation: detail.relocation,
        input_mode: mode,
      });
      s.last_action =
        seated === undefined
          ? null
          : `Seated ${getM13Piece(seated.piece_id).label} at ${action.slot} · ${seated.rotation}°.`;
      break;
    }
    case 'cancel':
      // Safe restore — no raw act recorded (the piece is where it was).
      s.last_action = null;
      break;
    case 'return_held':
    case 'return_slot':
      s.returns += 1;
      log('piece_returned', {
        ...(outcome.result.detail ?? {}),
        input_mode: mode,
      });
      s.last_action = 'Returned to the bench.';
      break;
    case 'rotate_held':
      s.rotations += 1;
      log('piece_rotated', {
        piece_id: before.held?.piece_id,
        target: 'held',
        rotation: s.board.held?.rotation,
        input_mode: mode,
      });
      s.last_action = `Rotated (held) → ${s.board.held?.rotation}°.`;
      break;
    case 'rotate_slot': {
      const seated = s.board.placements[action.slot as M13SlotId];

      s.rotations += 1;
      log('piece_rotated', {
        piece_id: seated?.piece_id,
        target: action.slot,
        rotation: seated?.rotation,
        input_mode: mode,
      });
      s.last_action = `Rotated ${action.slot} → ${seated?.rotation}°.`;
      break;
    }
    case 'undo':
      s.undos += 1;
      log('undone', {
        ...(outcome.result.detail ?? {}),
        history_remaining: s.history.length,
        input_mode: mode,
      });
      s.last_action = 'Undid the last change.';
      break;
    case 'reset_board':
      s.resets += 1;
      log('board_reset', {
        ...(outcome.result.detail ?? {}),
        input_mode: mode,
      });
      s.last_action = 'Board cleared — every piece is back on the bench.';
      break;
    default:
      break;
  }

  refreshIpProbe();

  return outcome.result;
}

/** Undo: restore the board snapshot taken before the last committed change. */
function undoOutcome(s: M13LatticeState): PipeOutcome {
  if (s.history.length === 0) {
    return {
      state: s.board,
      result: {
        ok: false,
        reason: 'not_holding',
        detail: 'Nothing to undo.',
      },
    };
  }

  // The restored snapshot never holds a piece (snapshots are taken of
  // seated state), so a held piece is never lost by an undo.
  const restored = s.history.pop()!;

  return {
    state: restored,
    result: {
      ok: true,
      detail: { seated_after: Object.keys(restored.placements).length },
    },
  };
}

/** Reset: every seated piece returns to the bench (one committed change). */
function resetOutcome(s: M13LatticeState): PipeOutcome {
  let board = s.board.held === null ? s.board : pipeCancelHeld(s.board).state;
  const seated = Object.keys(board.placements) as M13SlotId[];

  if (seated.length === 0) {
    return {
      state: s.board,
      result: {
        ok: false,
        reason: 'not_holding',
        detail: 'The board is already clear.',
      },
    };
  }

  for (const slot of seated) {
    const step = pipeReturnSlot(board, slot);

    if (step.result.ok) {
      board = step.state;
    }
  }

  return {
    state: board,
    result: { ok: true, detail: { pieces_returned: seated.length } },
  };
}

/** Neutral structural feedback lines for a validation result. */
export function latticeFeedbackLines(detail: PipeValidationDetail): string[] {
  return [
    `Run: feed → intake ${detail.endpoint_connected ? 'CONNECTED' : 'NOT connected'}${
      detail.source_seated ? '' : ' (no piece faces the feed port)'
    }.`,
    `Isolation valve: ${detail.valve_inline ? 'inline' : 'NOT inline'}.`,
    `Open branches on the run: ${detail.open_branch_count}.`,
  ];
}

export interface LatticeSubmitOutcome {
  valid: boolean;
  closed: boolean;
  lines: string[];
}

/** Explicit "test flow" submission; never auto-completes. */
export function m13LatticeSubmit(
  mode: InputMode,
  nowMs: number,
): LatticeSubmitOutcome {
  const s = ensure();

  if (!canAct()) {
    return { valid: false, closed: true, lines: ['The bench is closed.'] };
  }

  if (s.board.held !== null) {
    s.board = pipeCancelHeld(s.board).state;
  }

  const detail = pipeValidate(s.board, M13L_FORMS[s.form]);
  const satisfied =
    Number(detail.endpoint_connected) +
    Number(detail.valve_inline) +
    Number(detail.open_branch_count === 0 && detail.source_seated);
  const submission = bumpIpSubmission(s.window);
  const record: SubmissionRecord = {
    submission,
    valid: detail.valid,
    reason: detail.reason,
    endpoint_connected: detail.endpoint_connected,
    valve_inline: detail.valve_inline,
    open_branch_count: detail.open_branch_count,
    constraints_satisfied: satisfied,
    input_mode: mode,
  };

  s.submissions.push(record);
  s.final_network_valid = detail.valid;
  s.last_action = null;
  log('submitted', {
    ...record,
    layout: s.board.placements,
    path_slots: detail.path_slots,
  });

  const lines = latticeFeedbackLines(detail);

  if (detail.valid) {
    closeIpWindow(s.window, 'completed', nowMs);
    lines.push('Test flow recorded. The lattice holds pressure.');
    s.feedback = lines;
    log('completed', rawSummary());

    return { valid: true, closed: true, lines };
  }

  if (submission >= M13L_MAX_SUBMISSIONS) {
    closeIpWindow(s.window, 'exhausted', nowMs);
    lines.push(
      'Test runs used. The bench closes; the diagnosis console takes over with the reference lattice.',
    );
    s.feedback = lines;
    log('exhausted', rawSummary());

    return { valid: false, closed: true, lines };
  }

  lines.push(
    `Test run ${submission} of ${M13L_MAX_SUBMISSIONS} recorded. Revise and test again.`,
  );
  s.feedback = lines;
  refreshIpProbe();

  return { valid: false, closed: false, lines };
}

export function m13LatticeHelp(mode: InputMode, nowMs: number): string[] {
  void nowMs;

  const s = ensure();

  bumpIpHelp(s.window);
  log('help_consulted', { input_mode: mode });

  return [
    'Seat pieces from the bench into the nine mounts so the feed port',
    'connects to the intake port as one sealed run. The isolation valve',
    'must sit on that run. Every open end must be closed (no branches',
    'left open). The fractured centre mount seats nothing.',
    'Drag or click a piece to pick it up, click a mount to seat it.',
    'Right-click / R rotates a piece. DEL / drop on bench returns it.',
    'UNDO (U) reverts the last change; CLEAR (C) returns every piece.',
    'TEST FLOW checks the run; you may revise and test again.',
  ];
}

export function m13LatticeStop(nowMs: number) {
  const s = ensure();

  if (!canAct()) {
    return;
  }

  if (s.board.held !== null) {
    s.board = pipeCancelHeld(s.board).state;
  }

  closeIpWindow(s.window, 'exited', nowMs);
  s.feedback = ['Bench closed at your request. Record kept.'];
  log('stopped', rawSummary());
}

export function m13LatticeFail(nowMs: number, detail: string) {
  const s = ensure();

  if (!canAct()) {
    return;
  }

  closeIpWindow(s.window, 'technical_failure', nowMs, detail);
  log('technical_failure', { ...rawSummary(), detail });
}

export interface LatticeView {
  form: FormId;
  config: LatticeForm;
  placements: Partial<Record<M13SlotId, M13Placement>>;
  held: PipeHeld | null;
  bench: M13Piece[];
  feedback: string[];
  last_action: string | null;
  undo_available: boolean;
  seated_count: number;
  submissions_used: number;
  max_submissions: number;
  status: IpWindow['status'];
  closed: boolean;
}

export function m13LatticeView(): LatticeView {
  const s = ensure();

  return {
    form: s.form,
    config: M13L_FORMS[s.form],
    placements: structuredClone(s.board.placements),
    held: s.board.held === null ? null : { ...s.board.held },
    bench: pipeBenchPieces(s.board),
    feedback: [...s.feedback],
    last_action: s.last_action,
    undo_available: s.history.length > 0,
    seated_count: Object.keys(s.board.placements).length,
    submissions_used: s.window.submission_count,
    max_submissions: M13L_MAX_SUBMISSIONS,
    status: s.window.status,
    closed: ipWindowIsClosed(s.window),
  };
}

export function m13LatticeProbe(): Record<string, unknown> {
  const s = ensure();

  return {
    ...rawSummary(),
    form: s.form,
    board: M13L_FORMS[s.form],
    placements_map: structuredClone(s.board.placements),
    held: s.board.held,
    bench: pipeBenchPieces(s.board).map((piece) => piece.piece_id),
    submissions: s.submissions,
    feedback: [...s.feedback],
  };
}

export function pieceTypeOf(pieceId: string) {
  return getM13Piece(pieceId).type;
}

/** Test-only escape hatch. */
export function resetM13LatticeState() {
  state = null;
}
