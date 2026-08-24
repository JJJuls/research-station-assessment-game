/**
 * Magnet-recovery outcome deck (field-actions foundation).
 *
 * Pure, Phaser-free, module-scope session state (project convention).
 * The Metal Recovery Yard's rig draws from a FINITE, fixed deck: two
 * counterbalanced forms hold the SAME outcome multiset in different
 * fixed orders, so every participant gets an equivalent total outcome
 * opportunity and no uncontrolled RNG exists anywhere in the cycle.
 *
 * Composition per form (6 positions): 2 × low-value scrap, 1 × modest
 * useful material, 1 × uncommon high-utility candidate item, 2 × empty
 * pull. EVERY committed (non-cancelled) cycle consumes one deck
 * position and receives that position's outcome regardless of
 * timing-band accuracy (M24 standardisation correction, pilot Unit 5):
 * timing is secondary motor telemetry only, so every participant who
 * commits six cycles receives the identical outcome multiset and the
 * identical depletion exposure.
 *
 * After the deck is exhausted the rig is objectively depleted: every
 * later pull is empty BY CONSTRUCTION (no later pull may secretly
 * produce a reward), and the hosting scene shows an explicit depleted
 * signal. The uncommon high-utility item is a gameplay candidate only:
 * nothing in this unit lets it affect assessment difficulty or any
 * measurement window.
 *
 * Nothing here logs an event or computes a score.
 */

export type MagnetOutcomeTier = 'empty' | 'scrap' | 'material' | 'rare';

export interface MagnetOutcome {
  tier: MagnetOutcomeTier;
  /** Inventory item id, or null for an empty pull. */
  item_id: string | null;
  /** Participant-facing label. */
  label: string;
}

const OUTCOME_EMPTY: MagnetOutcome = {
  tier: 'empty',
  item_id: null,
  label: 'Nothing on the magnet',
};
const OUTCOME_SCRAP: MagnetOutcome = {
  tier: 'scrap',
  item_id: 'scrap_plate',
  label: 'Scrap Plate',
};
const OUTCOME_MATERIAL: MagnetOutcome = {
  tier: 'material',
  item_id: 'ore_chunk',
  label: 'Ore Chunk',
};
const OUTCOME_RARE: MagnetOutcome = {
  tier: 'rare',
  item_id: 'flux_calibrator',
  label: 'Flux Calibrator',
};

export type MagnetDeckForm = 'A' | 'B';

/** Two fixed orders of one identical outcome multiset. */
export const MAGNET_DECK_FORMS: Record<
  MagnetDeckForm,
  readonly MagnetOutcome[]
> = {
  A: [
    OUTCOME_SCRAP,
    OUTCOME_EMPTY,
    OUTCOME_MATERIAL,
    OUTCOME_SCRAP,
    OUTCOME_RARE,
    OUTCOME_EMPTY,
  ],
  B: [
    OUTCOME_EMPTY,
    OUTCOME_MATERIAL,
    OUTCOME_SCRAP,
    OUTCOME_EMPTY,
    OUTCOME_SCRAP,
    OUTCOME_RARE,
  ],
};

export interface MagnetDeckState {
  form: MagnetDeckForm | null;
  /** Committed pulls resolved so far (deck positions consumed). */
  position: number;
  /** Total pulls resolved including post-depletion pulls. */
  total_pulls: number;
}

function createInitialMagnetDeckState(): MagnetDeckState {
  return { form: null, position: 0, total_pulls: 0 };
}

export const magnetDeckState: MagnetDeckState = createInitialMagnetDeckState();

/** Assigns the counterbalanced form once per session (idempotent). */
export function ensureMagnetDeckForm(form: MagnetDeckForm): MagnetDeckForm {
  if (magnetDeckState.form === null) {
    magnetDeckState.form = form;
  }

  return magnetDeckState.form;
}

export function magnetDeckDepleted(): boolean {
  if (magnetDeckState.form === null) {
    return false;
  }

  return (
    magnetDeckState.position >= MAGNET_DECK_FORMS[magnetDeckState.form].length
  );
}

export interface MagnetPullResult {
  outcome: MagnetOutcome;
  /** 1-based pull position (post-depletion pulls keep counting). */
  pull_position: number;
  form: MagnetDeckForm;
  /** True when this pull came AFTER the deck was already exhausted. */
  post_depletion: boolean;
  /** True when THIS pull consumed the deck's final position. */
  depleted_now: boolean;
}

/**
 * Resolves one committed pull. Post-depletion pulls are mechanically
 * identical but always empty.
 */
export function drawMagnetPull(): MagnetPullResult {
  if (magnetDeckState.form === null) {
    throw new Error('Magnet deck form not assigned (ensureMagnetDeckForm)');
  }

  const deck = MAGNET_DECK_FORMS[magnetDeckState.form];
  const postDepletion = magnetDeckState.position >= deck.length;

  magnetDeckState.total_pulls += 1;

  if (postDepletion) {
    return {
      outcome: OUTCOME_EMPTY,
      pull_position: magnetDeckState.total_pulls,
      form: magnetDeckState.form,
      post_depletion: true,
      depleted_now: false,
    };
  }

  const outcome = deck[magnetDeckState.position];

  magnetDeckState.position += 1;

  return {
    outcome,
    pull_position: magnetDeckState.total_pulls,
    form: magnetDeckState.form,
    post_depletion: false,
    depleted_now: magnetDeckState.position >= deck.length,
  };
}

/** Test-only escape hatch. */
export function resetMagnetDeck(): void {
  Object.assign(magnetDeckState, createInitialMagnetDeckState());
}
