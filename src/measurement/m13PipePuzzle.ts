/**
 * M13 manifold-reconstruction puzzle state (action-assessment rebuild,
 * Unit 3).
 *
 * The 26-measure developmental battery's M13 ("solving a constrained
 * physical puzzle"): rebuilding the Pump House coolant manifold in a
 * floor trench by seating and rotating pipe pieces between the coolant
 * feed (west) and the pump intake (east).
 *
 * Puzzle contract (mission-fixed):
 * - 3x3 slot grid; the centre mount (B2) is fractured and unusable, so
 *   the flow must route around it.
 * - STANDARDISED PIECE SET, always complete at window start regardless
 *   of any earlier gameplay outcome (in fiction the reclaimed segments
 *   are cleaned and pooled with shop stock): 2 straights, 4 elbows,
 *   1 tee, 1 inline valve, 1 end cap. The cap is the redundant/decoy
 *   piece — useless on the main run, genuinely useful only to close a
 *   stray tee branch.
 * - Submission validates real connectivity: a sealed path from feed to
 *   intake, the isolation valve inline, and no open branch on the
 *   pressurised run. Correctness is never previewed piece-by-piece.
 * - Multiple layouts are valid (any sealed routed run counts).
 *
 * The connectivity validator is a PURE function (validatePipePlacements)
 * shared with the Information Processing lattice bench; the module
 * singleton below is the Pump House route's own state container.
 *
 * OWNERSHIP: M13 owns ONLY placement/rotation/removal/submission acts
 * inside this window (proto_m13_* family, own state container).
 * Searching, digging, collection and delivery are never M13 evidence.
 * Identifiers are provisional; no scoring exists here.
 */

export const M13_OPPORTUNITY_ID = 'proto_m13_manifold_puzzle';
export const M13_ENTRY_STATE_VERSION = 'm13-manifold-v1';

export type M13PieceType = 'straight' | 'elbow' | 'tee' | 'valve' | 'cap';

export interface M13Piece {
  piece_id: string;
  type: M13PieceType;
  label: string;
}

/** The standardised piece set (identical, complete, for everyone). */
export const M13_PIECES: readonly M13Piece[] = [
  { piece_id: 'st1', type: 'straight', label: 'Straight section' },
  { piece_id: 'st2', type: 'straight', label: 'Straight section' },
  { piece_id: 'el1', type: 'elbow', label: 'Elbow section' },
  { piece_id: 'el2', type: 'elbow', label: 'Elbow section' },
  { piece_id: 'el3', type: 'elbow', label: 'Elbow section' },
  { piece_id: 'el4', type: 'elbow', label: 'Elbow section' },
  { piece_id: 'te1', type: 'tee', label: 'T-junction' },
  { piece_id: 'va1', type: 'valve', label: 'Isolation valve' },
  { piece_id: 'cap1', type: 'cap', label: 'End cap' },
] as const;

/** Slot ids, column A-C (west to east) x row 1-3 (north to south). */
export const M13_SLOT_IDS = [
  'A1',
  'B1',
  'C1',
  'A2',
  'B2',
  'C2',
  'A3',
  'B3',
  'C3',
] as const;

export type M13SlotId = (typeof M13_SLOT_IDS)[number];

/** The fractured centre mount — nothing can be seated here. */
export const M13_BROKEN_SLOT: M13SlotId = 'B2';

/** Feed enters A2 from the west; intake leaves C2 to the east. */
export const M13_SOURCE_SLOT: M13SlotId = 'A2';
export const M13_OUTLET_SLOT: M13SlotId = 'C2';

export type M13Rotation = 0 | 90 | 180 | 270;

export interface M13Placement {
  piece_id: string;
  rotation: M13Rotation;
}

/** N/E/S/W openings of each piece type at rotation 0. */
const BASE_OPENINGS: Record<M13PieceType, readonly number[]> = {
  // Direction indices: 0 N, 1 E, 2 S, 3 W.
  straight: [1, 3],
  elbow: [0, 1],
  tee: [3, 0, 1],
  valve: [1, 3],
  cap: [3],
};

const DIRECTION_DELTAS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
] as const;

export function getM13Piece(pieceId: string): M13Piece {
  const piece = M13_PIECES.find((entry) => entry.piece_id === pieceId);

  if (piece === undefined) {
    throw new Error(`Unknown manifold piece: ${pieceId}`);
  }

  return piece;
}

/** Openings (0 N, 1 E, 2 S, 3 W) of a piece at a rotation. */
export function pieceOpenings(
  type: M13PieceType,
  rotation: M13Rotation,
): number[] {
  const steps = rotation / 90;

  return BASE_OPENINGS[type].map((direction) => (direction + steps) % 4);
}

function slotCoords(slot: M13SlotId): { x: number; y: number } {
  const column = slot.charCodeAt(0) - 'A'.charCodeAt(0);
  const row = Number(slot[1]) - 1;

  return { x: column, y: row };
}

function coordsSlot(x: number, y: number): M13SlotId | null {
  if (x < 0 || x > 2 || y < 0 || y > 2) {
    return null;
  }

  return `${String.fromCharCode('A'.charCodeAt(0) + x)}${y + 1}` as M13SlotId;
}

export type M13SubmitReason =
  | 'valid'
  | 'no_path'
  | 'valve_missing'
  | 'open_branch';

export interface M13SubmitResult {
  valid: boolean;
  reason: M13SubmitReason;
  /** Slots on the connected run (diagnostic rendering, not feedback). */
  path_slots: M13SlotId[];
}

/** Structural facts of one connectivity check (raw, never a score). */
export interface PipeValidationDetail extends M13SubmitResult {
  endpoint_connected: boolean;
  valve_inline: boolean;
  /** Unmated openings on the pressurised run (0 when sealed). */
  open_branch_count: number;
  /** Source port seated and facing the feed. */
  source_seated: boolean;
}

/** Board geometry: where the flow enters and leaves, and the broken mount. */
export interface PipeBoardConfig {
  source: { slot: M13SlotId; direction: number };
  outlet: { slot: M13SlotId; direction: number };
  broken: M13SlotId;
}

/** The Pump House manifold geometry (feed west of A2, intake east of C2). */
export const M13_BOARD_CONFIG: PipeBoardConfig = {
  source: { slot: M13_SOURCE_SLOT, direction: 3 },
  outlet: { slot: M13_OUTLET_SLOT, direction: 1 },
  broken: M13_BROKEN_SLOT,
};

/**
 * PURE connectivity validation over a placements map (no module state).
 * Floods the connected run from the source port: every opening must mate
 * with a matching neighbour opening, or be the feed/intake port itself;
 * anything else is an open branch. Shared by the Pump House trench and
 * the Information Processing lattice bench.
 */
export function validatePipePlacements(
  placements: Partial<Record<M13SlotId, M13Placement>>,
  config: PipeBoardConfig = M13_BOARD_CONFIG,
): PipeValidationDetail {
  const source = placements[config.source.slot];
  const sourceSeated =
    source !== undefined &&
    pieceOpenings(getM13Piece(source.piece_id).type, source.rotation).includes(
      config.source.direction,
    );

  if (!sourceSeated) {
    return {
      valid: false,
      reason: 'no_path',
      path_slots: [],
      endpoint_connected: false,
      valve_inline: false,
      open_branch_count: 0,
      source_seated: false,
    };
  }

  const connected = new Set<M13SlotId>([config.source.slot]);
  const queue: M13SlotId[] = [config.source.slot];
  let openBranches = 0;
  let outletReached = false;

  while (queue.length > 0) {
    const slot = queue.shift()!;
    const placement = placements[slot]!;
    const openings = pieceOpenings(
      getM13Piece(placement.piece_id).type,
      placement.rotation,
    );
    const { x, y } = slotCoords(slot);

    for (const direction of openings) {
      if (
        slot === config.source.slot &&
        direction === config.source.direction
      ) {
        continue; // The feed port itself.
      }

      if (
        slot === config.outlet.slot &&
        direction === config.outlet.direction
      ) {
        outletReached = true;
        continue; // The intake port itself.
      }

      const delta = DIRECTION_DELTAS[direction];
      const neighbourSlot = coordsSlot(x + delta.dx, y + delta.dy);
      const neighbour =
        neighbourSlot === null ? undefined : placements[neighbourSlot];

      if (neighbourSlot === null || neighbour === undefined) {
        openBranches += 1;
        continue;
      }

      const neighbourOpenings = pieceOpenings(
        getM13Piece(neighbour.piece_id).type,
        neighbour.rotation,
      );

      if (!neighbourOpenings.includes((direction + 2) % 4)) {
        openBranches += 1;
        continue;
      }

      if (!connected.has(neighbourSlot)) {
        connected.add(neighbourSlot);
        queue.push(neighbourSlot);
      }
    }
  }

  const pathSlots = [...connected];
  const valveInline = pathSlots.some(
    (slot) => getM13Piece(placements[slot]!.piece_id).type === 'valve',
  );
  const detail = {
    path_slots: pathSlots,
    endpoint_connected: outletReached,
    valve_inline: valveInline,
    open_branch_count: openBranches,
    source_seated: true,
  };

  if (!outletReached) {
    return { valid: false, reason: 'no_path', ...detail };
  }

  if (!valveInline) {
    return { valid: false, reason: 'valve_missing', ...detail };
  }

  if (openBranches > 0) {
    return { valid: false, reason: 'open_branch', ...detail };
  }

  return { valid: true, reason: 'valid', ...detail };
}

interface M13State {
  engaged: boolean;
  /** Seated pieces by slot. */
  placements: Partial<Record<M13SlotId, M13Placement>>;
  place_acts: number;
  rotate_acts: number;
  remove_acts: number;
  submissions: { valid: boolean; reason: M13SubmitReason }[];
  completed: boolean;
}

function createInitialM13State(): M13State {
  return {
    engaged: false,
    placements: {},
    place_acts: 0,
    rotate_acts: 0,
    remove_acts: 0,
    submissions: [],
    completed: false,
  };
}

export const m13State: M13State = createInitialM13State();

export function markM13Engaged() {
  m13State.engaged = true;
}

/** Piece ids still on the bench (not seated in any slot). */
export function m13BenchPieces(): M13Piece[] {
  const seated = new Set(
    Object.values(m13State.placements).map((placement) => placement!.piece_id),
  );

  return M13_PIECES.filter((piece) => !seated.has(piece.piece_id));
}

export function m13SlotPlacement(slot: M13SlotId): M13Placement | null {
  return m13State.placements[slot] ?? null;
}

/**
 * Seats a bench piece into an empty, intact slot at rotation 0.
 * Returns false (no change) when the slot is broken/occupied or the
 * piece is already seated elsewhere.
 */
export function placeM13Piece(slot: M13SlotId, pieceId: string): boolean {
  getM13Piece(pieceId);

  if (
    slot === M13_BROKEN_SLOT ||
    m13State.placements[slot] !== undefined ||
    !m13BenchPieces().some((piece) => piece.piece_id === pieceId) ||
    m13State.completed
  ) {
    return false;
  }

  m13State.placements[slot] = { piece_id: pieceId, rotation: 0 };
  m13State.place_acts += 1;

  return true;
}

/** Rotates the seated piece 90° clockwise. Returns the new rotation. */
export function rotateM13Piece(slot: M13SlotId): M13Rotation | null {
  const placement = m13State.placements[slot];

  if (placement === undefined || m13State.completed) {
    return null;
  }

  placement.rotation = ((placement.rotation + 90) % 360) as M13Rotation;
  m13State.rotate_acts += 1;

  return placement.rotation;
}

/** Returns the seated piece to the bench. */
export function removeM13Piece(slot: M13SlotId): boolean {
  if (m13State.placements[slot] === undefined || m13State.completed) {
    return false;
  }

  delete m13State.placements[slot];
  m13State.remove_acts += 1;

  return true;
}

/**
 * Opens the test flow and validates the run: sealed connectivity from
 * feed to intake, the isolation valve inline, no open branch anywhere
 * on the pressurised run.
 */
export function submitM13Flow(): M13SubmitResult {
  const result = validateM13Layout();

  m13State.submissions.push({ valid: result.valid, reason: result.reason });

  if (result.valid) {
    m13State.completed = true;
  }

  return result;
}

function validateM13Layout(): M13SubmitResult {
  const { valid, reason, path_slots } = validatePipePlacements(
    m13State.placements,
  );

  return { valid, reason, path_slots };
}

export function m13Summary() {
  return {
    engaged: m13State.engaged,
    seated: Object.keys(m13State.placements).length,
    place_acts: m13State.place_acts,
    rotate_acts: m13State.rotate_acts,
    remove_acts: m13State.remove_acts,
    submissions: m13State.submissions.length,
    invalid_submissions: m13State.submissions.filter(
      (submission) => !submission.valid,
    ).length,
    completed: m13State.completed,
  };
}

/** Test-only escape hatch. */
export function resetM13State() {
  Object.assign(m13State, createInitialM13State());
  m13State.placements = {};
  m13State.submissions = [];
}
