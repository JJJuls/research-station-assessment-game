/**
 * Post-assessment ice-salvage activity state (physical-mechanics
 * session, Unit 7).
 *
 * A fishing-like free-play activity at the terrace ice bore: lower the
 * salvage magnet through the bore, set the hook on the tension swing,
 * and reel up whatever the deterministic loot deck holds next. STRICTLY
 * post-assessment content:
 *
 * - LOCKED until the primary assessment route is complete (Final Core
 *   synchronization) or an explicit DEV `?freeplay` launch flag is set.
 * - No primary Q-item tags, no trait scoring, no effect on the primary
 *   inventory, task access, rewards, or NPC wording — catches live in
 *   this module's own salvage log only.
 * - The loot deck is DETERMINISTIC: a balanced 12-card deck shuffled by
 *   a seeded PRNG derived from the game_session_id; the seed and every
 *   pull are logged as secondary gameplay telemetry (proto_salvage_*).
 * - It may inform exploratory research only after a separate ruling and
 *   validation plan; nothing here is a measurement opportunity.
 */

export interface SalvageCatch {
  catch_id: string;
  label: string;
  icon: string;
  tier: 'trash' | 'common' | 'rare';
}

/** The balanced deck composition (before the seeded shuffle). */
export const SALVAGE_DECK_COMPOSITION: readonly SalvageCatch[] = [
  {
    catch_id: 'scrap_bolt',
    label: 'Scrap Bolt Cluster',
    icon: 'proc-icon-scrap-bolt',
    tier: 'trash',
  },
  {
    catch_id: 'scrap_bolt',
    label: 'Scrap Bolt Cluster',
    icon: 'proc-icon-scrap-bolt',
    tier: 'trash',
  },
  {
    catch_id: 'tin_panel',
    label: 'Buckled Tin Panel',
    icon: 'proc-icon-tin-panel',
    tier: 'trash',
  },
  {
    catch_id: 'tin_panel',
    label: 'Buckled Tin Panel',
    icon: 'proc-icon-tin-panel',
    tier: 'trash',
  },
  {
    catch_id: 'coolant_slug',
    label: 'Frozen Coolant Slug',
    icon: 'proc-icon-coolant-slug',
    tier: 'common',
  },
  {
    catch_id: 'coolant_slug',
    label: 'Frozen Coolant Slug',
    icon: 'proc-icon-coolant-slug',
    tier: 'common',
  },
  {
    catch_id: 'coolant_slug',
    label: 'Frozen Coolant Slug',
    icon: 'proc-icon-coolant-slug',
    tier: 'common',
  },
  {
    catch_id: 'sensor_husk',
    label: 'Sensor Husk',
    icon: 'proc-icon-sensor-husk',
    tier: 'common',
  },
  {
    catch_id: 'sensor_husk',
    label: 'Sensor Husk',
    icon: 'proc-icon-sensor-husk',
    tier: 'common',
  },
  {
    catch_id: 'sensor_husk',
    label: 'Sensor Husk',
    icon: 'proc-icon-sensor-husk',
    tier: 'common',
  },
  {
    catch_id: 'ice_pearl',
    label: 'Ice Pearl',
    icon: 'proc-icon-ice-pearl',
    tier: 'rare',
  },
  {
    catch_id: 'core_whorl',
    label: 'Core Whorl',
    icon: 'proc-icon-ice-pearl',
    tier: 'rare',
  },
] as const;

/** Deterministic 32-bit seed from an arbitrary string (session id). */
export function salvageSeedFromSession(sessionId: string): number {
  let hash = 2166136261;

  for (let i = 0; i < sessionId.length; i++) {
    hash ^= sessionId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/** mulberry32 (effects.ts recipe) — deterministic shuffle source. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The session's full shuffled deck (pure function of the seed). */
export function buildSalvageDeck(seed: number): SalvageCatch[] {
  const deck = [...SALVAGE_DECK_COMPOSITION];
  const rand = mulberry32(seed);

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));

    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

interface SalvageState {
  seed: number | null;
  /** Draws taken from the deck so far (log display order). */
  pulls: SalvageCatch[];
  misses: number;
}

const salvageState: SalvageState = { seed: null, pulls: [], misses: 0 };

/** Initialises (once) and returns the session deck. */
export function ensureSalvageSeed(sessionId: string): number {
  if (salvageState.seed === null) {
    salvageState.seed = salvageSeedFromSession(sessionId);
  }

  return salvageState.seed;
}

/** Next catch in deterministic deck order (deck recycles when spent). */
export function drawSalvageCatch(): SalvageCatch {
  if (salvageState.seed === null) {
    throw new Error('salvage seed not initialised');
  }

  const deck = buildSalvageDeck(salvageState.seed);
  const draw = deck[salvageState.pulls.length % deck.length];

  salvageState.pulls.push(draw);

  return draw;
}

export function recordSalvageMiss() {
  salvageState.misses += 1;
}

export function salvageLog() {
  return {
    seed: salvageState.seed,
    pulls: salvageState.pulls.map((pull) => pull.catch_id),
    misses: salvageState.misses,
  };
}

export function salvagePullCount(): number {
  return salvageState.pulls.length;
}

/** Test-only escape hatch. */
export function resetSalvageState() {
  salvageState.seed = null;
  salvageState.pulls = [];
  salvageState.misses = 0;
}
