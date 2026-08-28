/**
 * M01 — Storm incident plan board (evidence-led pilot v2, Unit 2).
 *
 * Ledger (sheet 09): inspect a compact packet, create a dependency-valid
 * work order, then execute the first three transitions; at least two
 * equally valid orders exist; one "correct" sequence is NEVER scored.
 *
 * Mechanic: six work-order cards with three explicit dependency arrows
 * (each printed on the card). The participant places cards into six
 * ordered slots (place / swap / take back), commits the order, then
 * executes the first three transitions one by one. Two independent
 * chains (coolant, comms) plus one free card give many valid orders.
 *
 * Raw components (state descriptions only): order_board_state,
 * dependency_violations, precommit_corrections, first_three_transitions
 * (+ presented/opened/closed timestamps via the kit). Missing/invalid via
 * the kit — never a low value.
 */
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

export const M01_OPPORTUNITY_ID = 'proto_m01_plan_board';
export const M01_WINDOW_ID = 'm01_plan_board_w1';
export const M01_ENTRY_STATE_VERSION = 'm01-plan-board-v1';
export const M01_FAMILY = 'proto_m01_board_';

export type M01Form = 'form_a' | 'form_b';

export interface M01Card {
  id: string;
  label: string;
  /** Cards that must come BEFORE this one (printed on the card). */
  requires: readonly string[];
}

/** Six standardised cards; the printed dependencies are the only rule. */
export const M01_CARDS: readonly M01Card[] = [
  { id: 'isolate_loop', label: 'Isolate coolant loop', requires: [] },
  {
    id: 'replace_seal',
    label: 'Replace loop seal',
    requires: ['isolate_loop'],
  },
  {
    id: 'restart_pump',
    label: 'Restart coolant pump',
    requires: ['replace_seal'],
  },
  { id: 'reset_relay', label: 'Reset comms relay', requires: [] },
  {
    id: 'verify_link',
    label: 'Verify uplink',
    requires: ['reset_relay'],
  },
  { id: 'log_storm', label: 'Log storm readings', requires: [] },
];

/** Form changes the packet's card order (never the dependencies). */
function packetOrder(form: M01Form): string[] {
  const ids = M01_CARDS.map((card) => card.id);

  return form === 'form_a' ? ids : [...ids].reverse();
}

interface M01State {
  form: M01Form;
  /** Slot index → card id (null = empty). */
  slots: (string | null)[];
  /** Card currently lifted (keyboard/pointer parity: pick then place). */
  held: string | null;
  committed: boolean;
  /** Placements made after the board was first full (pre-commit corrections). */
  precommitCorrections: number;
  everFull: boolean;
  executed: string[];
  moves: number;
  packetConsults: number;
}

let state: M01State | null = null;

function initialState(form: M01Form): M01State {
  return {
    form,
    slots: [null, null, null, null, null, null],
    held: null,
    committed: false,
    precommitCorrections: 0,
    everFull: false,
    executed: [],
    moves: 0,
    packetConsults: 0,
  };
}

function ensureState(): M01State {
  if (state === null) {
    const form = assignCounterbalance<M01Form>(
      currentSessionId(),
      'm01_plan_board_form',
      ['form_a', 'form_b'],
    );

    state = initialState(form);
  }

  return state;
}

export const m01Window = new ItemWindow({
  item: 'M01',
  opportunityId: M01_OPPORTUNITY_ID,
  windowId: M01_WINDOW_ID,
  entryStateVersion: M01_ENTRY_STATE_VERSION,
  family: M01_FAMILY,
  scene: 'station_concourse',
  objectId: 'm01_plan_board',
  form: null,
  counterbalance: null,
});

export function declareM01() {
  const s = ensureState();

  m01Window.spec.form = s.form;
  m01Window.spec.counterbalance = s.form;
  m01Window.declare();
}

export function m01State(): Readonly<M01State> {
  return ensureState();
}

/** Cards still in the packet (not placed, not held). */
export function m01PacketCards(): M01Card[] {
  const s = ensureState();

  return packetOrder(s.form)
    .filter((id) => !s.slots.includes(id) && s.held !== id)
    .map((id) => M01_CARDS.find((card) => card.id === id)!);
}

export function m01Card(id: string): M01Card {
  return M01_CARDS.find((card) => card.id === id)!;
}

export function openM01(nowMs: number) {
  declareM01();
  m01Window.open(nowMs, {
    packet_order: packetOrder(ensureState().form),
    slots: 6,
    cards: M01_CARDS.length,
  });
}

export function consultM01Packet(inputMode: InputMode) {
  const s = ensureState();

  if (!m01Window.isOpen() || s.committed) {
    return;
  }

  s.packetConsults += 1;
  m01Window.log('packet_consulted', {
    consult_count: s.packetConsults,
    input_mode: inputMode,
  });
}

/** Pick a card up from the packet or a slot (parity: click or focus+enter). */
export function pickM01Card(cardId: string, inputMode: InputMode): boolean {
  const s = ensureState();

  if (!m01Window.isOpen() || s.committed || s.held !== null) {
    return false;
  }

  const slot = s.slots.indexOf(cardId);

  if (slot >= 0) {
    s.slots[slot] = null;
  }

  s.held = cardId;
  m01Window.log('card_lifted', {
    card_id: cardId,
    from_slot: slot >= 0 ? slot : null,
    input_mode: inputMode,
  });

  return true;
}

/** Place the held card into a slot (swapping out an occupant). */
export function placeM01Card(slotIndex: number, inputMode: InputMode): boolean {
  const s = ensureState();

  if (!m01Window.isOpen() || s.committed || s.held === null) {
    return false;
  }

  const occupant = s.slots[slotIndex];
  const wasFull = s.everFull;

  s.slots[slotIndex] = s.held;
  s.moves += 1;

  if (wasFull) {
    s.precommitCorrections += 1;
  }

  m01Window.log('card_placed', {
    card_id: s.held,
    slot_index: slotIndex,
    displaced_card_id: occupant,
    move_number: s.moves,
    input_mode: inputMode,
  });
  s.held = occupant;

  if (s.slots.every((id) => id !== null)) {
    s.everFull = true;
  }

  return true;
}

/** Return the held card to the packet. */
export function returnM01Card(inputMode: InputMode): boolean {
  const s = ensureState();

  if (s.held === null) {
    return false;
  }

  m01Window.log('card_returned', { card_id: s.held, input_mode: inputMode });
  s.held = null;

  return true;
}

/** Dependency violations of an order (pairs where a requirement comes later or is absent). */
export function m01DependencyViolations(order: readonly (string | null)[]) {
  const violations: { card_id: string; requires: string }[] = [];

  for (const [index, id] of order.entries()) {
    if (id === null) {
      continue;
    }

    for (const requirement of m01Card(id).requires) {
      const requirementIndex = order.indexOf(requirement);

      if (requirementIndex < 0 || requirementIndex > index) {
        violations.push({ card_id: id, requires: requirement });
      }
    }
  }

  return violations;
}

export function m01BoardFull(): boolean {
  return ensureState().slots.every((id) => id !== null);
}

/** Commit the order (allowed with any full board — never a correctness gate). */
export function commitM01Order(inputMode: InputMode): boolean {
  const s = ensureState();

  if (!m01Window.isOpen() || s.committed || !m01BoardFull()) {
    return false;
  }

  s.committed = true;
  m01Window.log('order_committed', {
    order_board_state: [...s.slots],
    dependency_violations: m01DependencyViolations(s.slots),
    precommit_corrections: s.precommitCorrections,
    move_count: s.moves,
    input_mode: inputMode,
  });

  return true;
}

/** Execute the next transition (first three are the raw component). */
export function executeM01Transition(
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const s = ensureState();

  if (!m01Window.isOpen() || !s.committed || s.executed.length >= 3) {
    return false;
  }

  const next = s.slots[s.executed.length];

  if (next === null) {
    return false;
  }

  s.executed.push(next);
  m01Window.log('transition_executed', {
    step: s.executed.length,
    card_id: next,
    input_mode: inputMode,
  });

  if (s.executed.length === 3) {
    m01Window.complete(
      nowMs,
      {
        order_board_state: [...s.slots],
        dependency_violations: m01DependencyViolations(s.slots),
        dependency_violation_count: m01DependencyViolations(s.slots).length,
        precommit_corrections: s.precommitCorrections,
        first_three_transitions: [...s.executed],
        move_count: s.moves,
        packet_consults: s.packetConsults,
      },
      inputMode,
    );
  }

  return true;
}

/** Closing the surface without finishing keeps the window open (fail-forward). */
export function closeM01Surface(nowMs: number) {
  m01Window.pause(nowMs);
  m01Window.log('surface_closed', {
    committed: ensureState().committed,
    executed: [...ensureState().executed],
    input_mode: 'system',
  });
}

export function resumeM01Surface(nowMs: number) {
  m01Window.resume(nowMs);
}

/** Test-only escape hatch. */
export function resetM01State() {
  state = null;
  m01Window.reset();
  m01Window.spec.form = null;
  m01Window.spec.counterbalance = null;
}
