/**
 * M24 recycler-salvage exhaustion module state (action-assessment
 * rebuild, Unit 4).
 *
 * The 26-measure developmental battery's M24 ("continuation after an
 * explicitly understood transition to zero benefit"): the Recycler
 * Catchment rig in the Coolant Yard. The participant operates the
 * electromagnetic winch (F) through a CONTROLLED, DETERMINISTIC useful
 * phase — a fixed six-pull reward deck whose ORDER is counterbalanced
 * per session and recorded — and the catchment then becomes OBJECTIVELY
 * exhausted:
 *
 * - The rig readout states the exhaustion explicitly (credible: the
 *   deck is empty by construction — no pull, including a jackpot, can
 *   occur after it).
 * - The participant verifies it with their own scanner pass and must
 *   explicitly acknowledge it; the PRIMARY WINDOW opens only at that
 *   acknowledgement.
 * - A neutral useful alternative stays visible; stopping immediately is
 *   fully valid. ONLY subsequent identical casts are M24 evidence.
 * - Rewards are cosmetic-economy only (reclaim credits + one rare
 *   display piece); nothing in the deck alters any later primary
 *   opportunity's availability, difficulty or entry state.
 *
 * Separation: M24 shares nothing with M25 (pump interlock) or M26
 * (reclaimed sector) — own state, own proto_m24_* family, own rig.
 * The post-assessment ice-bore free-play salvage is untouched and
 * remains locked behind Final Core. All identifiers provisional.
 */

export const M24_OPPORTUNITY_ID = 'proto_m24_recycler_catchment';
export const M24_ENTRY_STATE_VERSION = 'm24-recycler-v1';

export interface M24Pull {
  pull_id: string;
  label: string;
  icon: string;
  /** Reclaim credits granted (cosmetic economy only). */
  credits: number;
  tier: 'scrap' | 'ore' | 'credit' | 'empty' | 'rare';
}

/** The fixed useful-phase deck contents (identical for everyone). */
export const M24_DECK_CONTENTS: readonly M24Pull[] = [
  {
    pull_id: 'reclaim_scrap_a',
    label: 'Scrap Bundle',
    icon: 'proc-icon-scrap-plate',
    credits: 10,
    tier: 'scrap',
  },
  {
    pull_id: 'reclaim_ore',
    label: 'Ore Fragmets Pod',
    icon: 'proc-icon-ore-chunk',
    credits: 20,
    tier: 'ore',
  },
  {
    pull_id: 'reclaim_empty',
    label: 'Empty Sling',
    icon: 'proc-icon-tin-panel',
    credits: 0,
    tier: 'empty',
  },
  {
    pull_id: 'reclaim_credit_chit',
    label: 'Station Credit Chit',
    icon: 'proc-icon-relay-board',
    credits: 15,
    tier: 'credit',
  },
  {
    pull_id: 'reclaim_scrap_b',
    label: 'Scrap Bundle',
    icon: 'proc-icon-scrap-plate',
    credits: 10,
    tier: 'scrap',
  },
  {
    pull_id: 'reclaim_flux_regulator',
    label: 'Cryo Flux Regulator',
    icon: 'proc-icon-ice-pearl',
    credits: 60,
    tier: 'rare',
  },
] as const;

/** Counterbalanced deck orders (indices into M24_DECK_CONTENTS). */
export const M24_DECK_ORDERS: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5],
  [3, 0, 4, 1, 2, 5],
  [1, 4, 0, 2, 5, 3],
] as const;

/** The standardised exhaustion readout (identical for everyone). */
export const M24_EXHAUSTION_READOUT =
  'CATCHMENT CLEAR — recycler sump empty. Sonar and mass return read zero. No further material of any kind can come up from this catchment; additional casts return nothing.';

export interface M24State {
  /** Counterbalanced deck order for this session (recorded). */
  deck_order: number | null;
  /** Useful-phase pulls taken, in draw order. */
  pulls: string[];
  credits: number;
  rare_recovered: boolean;
  exhaustion_shown: boolean;
  verification_scan_done: boolean;
  acknowledged: boolean;
  /** Post-acknowledgement identical casts (the raw M24 record). */
  post_ack_casts: number;
  alternative_taken: boolean;
  closed: boolean;
}

function createInitialM24State(): M24State {
  return {
    deck_order: null,
    pulls: [],
    credits: 0,
    rare_recovered: false,
    exhaustion_shown: false,
    verification_scan_done: false,
    acknowledged: false,
    post_ack_casts: 0,
    alternative_taken: false,
    closed: false,
  };
}

export const m24State: M24State = createInitialM24State();

/** Assigns (once) and returns the session's deck order index. */
export function ensureM24DeckOrder(orderIndex: number): number {
  if (m24State.deck_order === null) {
    m24State.deck_order = orderIndex % M24_DECK_ORDERS.length;
  }

  return m24State.deck_order;
}

export function m24DeckRemaining(): number {
  return Math.max(0, M24_DECK_CONTENTS.length - m24State.pulls.length);
}

export function m24Exhausted(): boolean {
  return m24DeckRemaining() === 0;
}

/**
 * Draws the next useful-phase pull, or null when the deck is exhausted
 * (by construction NO pull — jackpot included — can occur afterwards).
 */
export function drawM24Pull(): M24Pull | null {
  if (m24State.deck_order === null) {
    throw new Error('M24 deck order not assigned');
  }

  if (m24Exhausted()) {
    return null;
  }

  const order = M24_DECK_ORDERS[m24State.deck_order];
  const pull = M24_DECK_CONTENTS[order[m24State.pulls.length]];

  m24State.pulls.push(pull.pull_id);
  m24State.credits += pull.credits;

  if (pull.tier === 'rare') {
    m24State.rare_recovered = true;
  }

  return pull;
}

export function markM24ExhaustionShown() {
  if (m24Exhausted()) {
    m24State.exhaustion_shown = true;
  }
}

export function markM24VerificationScan() {
  if (m24State.exhaustion_shown) {
    m24State.verification_scan_done = true;
  }
}

/**
 * Comprehension-gated acknowledgement: refused until the readout was
 * shown AND the catchment is genuinely exhausted.
 */
export function acknowledgeM24Exhaustion(): boolean {
  if (!m24State.exhaustion_shown || !m24Exhausted()) {
    return false;
  }

  m24State.acknowledged = true;

  return true;
}

export function m24WindowOpen(): boolean {
  return m24State.acknowledged && !m24State.closed;
}

/** Records one post-acknowledgement identical cast. Always yields
 * nothing (deck empty by construction). Returns the count. */
export function recordM24PostAckCast(): number {
  m24State.post_ack_casts += 1;

  return m24State.post_ack_casts;
}

export function markM24AlternativeTaken() {
  m24State.alternative_taken = true;
}

export function closeM24Window() {
  m24State.closed = true;
}

export function m24Summary() {
  return {
    deck_order: m24State.deck_order,
    useful_pulls: m24State.pulls.length,
    credits: m24State.credits,
    rare_recovered: m24State.rare_recovered,
    exhaustion_shown: m24State.exhaustion_shown,
    verification_scan_done: m24State.verification_scan_done,
    acknowledged: m24State.acknowledged,
    post_ack_casts: m24State.post_ack_casts,
    alternative_taken: m24State.alternative_taken,
    closed: m24State.closed,
  };
}

/** Test-only escape hatch. */
export function resetM24State() {
  Object.assign(m24State, createInitialM24State());
  m24State.pulls = [];
}
