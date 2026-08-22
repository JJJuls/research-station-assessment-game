/**
 * Pure pipe-lattice board engine (Information Processing foundation).
 *
 * Phaser-free, runtime-free and `import.meta`-free so Node-side tests can
 * import it directly (inventory engine precedent). Inventory-engine
 * discipline: every operation validates before commit against a
 * structured clone and returns `{state, result}`; a refused operation
 * returns the untouched input state. The shared connectivity validator
 * lives in src/measurement/m13PipePuzzle.ts (`validatePipePlacements`).
 *
 * Parallel forms (matched by construction — a 90° rotation of the same
 * geometry): A feed west of A2 → intake east of C2; B feed north of B1 →
 * intake south of B3. Broken mount B2 in both.
 */

import type {
  M13Piece,
  M13Placement,
  M13Rotation,
  M13SlotId,
  PipeBoardConfig,
  PipeValidationDetail,
} from '../measurement/m13PipePuzzle';
import {
  M13_PIECES,
  M13_SLOT_IDS,
  validatePipePlacements,
} from '../measurement/m13PipePuzzle';
import type { FormId } from './model';

export interface LatticeForm extends PipeBoardConfig {
  feed_label: string;
  intake_label: string;
}

/** Equivalent forms: identical piece set, identical topology (rotated). */
export const M13L_FORMS: Record<FormId, LatticeForm> = {
  A: {
    source: { slot: 'A2', direction: 3 },
    outlet: { slot: 'C2', direction: 1 },
    broken: 'B2',
    feed_label: 'FEED (west)',
    intake_label: 'INTAKE (east)',
  },
  B: {
    source: { slot: 'B1', direction: 0 },
    outlet: { slot: 'B3', direction: 2 },
    broken: 'B2',
    feed_label: 'FEED (north)',
    intake_label: 'INTAKE (south)',
  },
};

/* ------------------------------------------------------------------ *
 * Pure transactional board
 * ------------------------------------------------------------------ */

export interface PipeHeld {
  piece_id: string;
  rotation: M13Rotation;
  source: 'bench' | M13SlotId;
}

export interface PipeBoardState {
  placements: Partial<Record<M13SlotId, M13Placement>>;
  held: PipeHeld | null;
}

export type PipeOpFailure =
  | 'broken_slot'
  | 'occupied_slot'
  | 'empty_slot'
  | 'not_on_bench'
  | 'holding'
  | 'not_holding'
  | 'unknown_piece'
  | 'unknown_slot';

export type PipeResult =
  | { ok: true; detail?: Record<string, unknown> }
  | { ok: false; reason: PipeOpFailure; detail: string };

export interface PipeOutcome {
  state: PipeBoardState;
  result: PipeResult;
}

export function createPipeBoardState(): PipeBoardState {
  return { placements: {}, held: null };
}

function refuse(
  state: PipeBoardState,
  reason: PipeOpFailure,
  detail: string,
): PipeOutcome {
  return { state, result: { ok: false, reason, detail } };
}

function isSlot(value: string): value is M13SlotId {
  return (M13_SLOT_IDS as readonly string[]).includes(value);
}

function seatedPieceIds(state: PipeBoardState): Set<string> {
  return new Set(
    Object.values(state.placements).map((placement) => placement!.piece_id),
  );
}

/** Pieces on the bench: neither seated nor held. */
export function pipeBenchPieces(state: PipeBoardState): M13Piece[] {
  const seated = seatedPieceIds(state);

  return M13_PIECES.filter(
    (piece) =>
      !seated.has(piece.piece_id) && state.held?.piece_id !== piece.piece_id,
  );
}

export function pipePickUpBench(
  state: PipeBoardState,
  pieceId: string,
): PipeOutcome {
  if (!M13_PIECES.some((piece) => piece.piece_id === pieceId)) {
    return refuse(state, 'unknown_piece', 'No such piece.');
  }

  if (state.held !== null) {
    return refuse(state, 'holding', 'Already holding a piece.');
  }

  if (!pipeBenchPieces(state).some((piece) => piece.piece_id === pieceId)) {
    return refuse(state, 'not_on_bench', 'That piece is not on the bench.');
  }

  const draft = structuredClone(state);

  draft.held = { piece_id: pieceId, rotation: 0, source: 'bench' };

  return { state: draft, result: { ok: true, detail: { source: 'bench' } } };
}

export function pipePickUpSlot(
  state: PipeBoardState,
  slot: string,
): PipeOutcome {
  if (!isSlot(slot)) {
    return refuse(state, 'unknown_slot', 'No such mount.');
  }

  if (state.held !== null) {
    return refuse(state, 'holding', 'Already holding a piece.');
  }

  const placement = state.placements[slot];

  if (placement === undefined) {
    return refuse(state, 'empty_slot', 'Nothing is seated there.');
  }

  const draft = structuredClone(state);

  delete draft.placements[slot];
  draft.held = {
    piece_id: placement.piece_id,
    rotation: placement.rotation,
    source: slot,
  };

  return { state: draft, result: { ok: true, detail: { source: slot } } };
}

export function pipePlaceHeld(
  state: PipeBoardState,
  slot: string,
  config: PipeBoardConfig,
): PipeOutcome {
  if (!isSlot(slot)) {
    return refuse(state, 'unknown_slot', 'No such mount.');
  }

  if (state.held === null) {
    return refuse(state, 'not_holding', 'Nothing is held.');
  }

  if (slot === config.broken) {
    return refuse(
      state,
      'broken_slot',
      'That mount is fractured — nothing seats there.',
    );
  }

  if (state.placements[slot] !== undefined) {
    return refuse(state, 'occupied_slot', 'That mount is already occupied.');
  }

  const draft = structuredClone(state);
  const held = draft.held!;

  draft.placements[slot] = { piece_id: held.piece_id, rotation: held.rotation };
  draft.held = null;

  return {
    state: draft,
    result: {
      ok: true,
      detail: { source: held.source, relocation: held.source !== 'bench' },
    },
  };
}

/** Held piece goes safely home (bench, or its original mount). */
export function pipeCancelHeld(state: PipeBoardState): PipeOutcome {
  if (state.held === null) {
    return refuse(state, 'not_holding', 'Nothing is held.');
  }

  const draft = structuredClone(state);
  const held = draft.held!;

  if (held.source !== 'bench' && draft.placements[held.source] === undefined) {
    draft.placements[held.source] = {
      piece_id: held.piece_id,
      rotation: held.rotation,
    };
  }

  draft.held = null;

  return {
    state: draft,
    result: { ok: true, detail: { source: held.source } },
  };
}

/** Held piece returns to the bench (wherever it came from). */
export function pipeReturnHeld(state: PipeBoardState): PipeOutcome {
  if (state.held === null) {
    return refuse(state, 'not_holding', 'Nothing is held.');
  }

  const draft = structuredClone(state);
  const held = draft.held!;

  draft.held = null;

  return {
    state: draft,
    result: {
      ok: true,
      detail: { piece_id: held.piece_id, source: held.source },
    },
  };
}

export function pipeReturnSlot(
  state: PipeBoardState,
  slot: string,
): PipeOutcome {
  if (!isSlot(slot)) {
    return refuse(state, 'unknown_slot', 'No such mount.');
  }

  if (state.held !== null) {
    return refuse(state, 'holding', 'Place or return the held piece first.');
  }

  const placement = state.placements[slot];

  if (placement === undefined) {
    return refuse(state, 'empty_slot', 'Nothing is seated there.');
  }

  const draft = structuredClone(state);

  delete draft.placements[slot];

  return {
    state: draft,
    result: { ok: true, detail: { piece_id: placement.piece_id } },
  };
}

function turn(rotation: M13Rotation): M13Rotation {
  return ((rotation + 90) % 360) as M13Rotation;
}

export function pipeRotateHeld(state: PipeBoardState): PipeOutcome {
  if (state.held === null) {
    return refuse(state, 'not_holding', 'Nothing is held.');
  }

  const draft = structuredClone(state);

  draft.held!.rotation = turn(draft.held!.rotation);

  return {
    state: draft,
    result: { ok: true, detail: { rotation: draft.held!.rotation } },
  };
}

export function pipeRotateSlot(
  state: PipeBoardState,
  slot: string,
): PipeOutcome {
  if (!isSlot(slot)) {
    return refuse(state, 'unknown_slot', 'No such mount.');
  }

  const placement = state.placements[slot];

  if (placement === undefined) {
    return refuse(state, 'empty_slot', 'Nothing is seated there.');
  }

  const draft = structuredClone(state);

  draft.placements[slot]!.rotation = turn(placement.rotation);

  return {
    state: draft,
    result: {
      ok: true,
      detail: { rotation: draft.placements[slot]!.rotation },
    },
  };
}

export function pipeValidate(
  state: PipeBoardState,
  config: PipeBoardConfig,
): PipeValidationDetail {
  return validatePipePlacements(state.placements, config);
}

export interface PipeBoardSnapshotV1 {
  version: 1;
  placements: Partial<Record<M13SlotId, M13Placement>>;
  held: PipeHeld | null;
}

export function toPipeSnapshot(state: PipeBoardState): PipeBoardSnapshotV1 {
  return { version: 1, ...structuredClone(state) };
}

export function loadPipeSnapshot(raw: unknown): PipeOutcome {
  const fresh = createPipeBoardState();

  if (typeof raw !== 'object' || raw === null) {
    return refuse(fresh, 'unknown_slot', 'Snapshot is not an object.');
  }

  const snapshot = raw as Record<string, unknown>;
  const placements = snapshot.placements as Record<string, unknown> | undefined;

  if (
    snapshot.version !== 1 ||
    typeof placements !== 'object' ||
    placements === null ||
    !Object.entries(placements).every(([slot, placement]) => {
      const value = placement as Record<string, unknown>;

      return (
        isSlot(slot) &&
        typeof value.piece_id === 'string' &&
        M13_PIECES.some((piece) => piece.piece_id === value.piece_id) &&
        [0, 90, 180, 270].includes(value.rotation as number)
      );
    })
  ) {
    return refuse(fresh, 'unknown_slot', 'Snapshot shape is not recognised.');
  }

  return {
    state: {
      placements: structuredClone(
        placements as Partial<Record<M13SlotId, M13Placement>>,
      ),
      held: (snapshot.held as PipeHeld | null) ?? null,
    },
    result: { ok: true },
  };
}
