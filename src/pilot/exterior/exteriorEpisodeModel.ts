/**
 * Exterior Recovery episode model (evidence-led pilot v2, Unit 4).
 * PURE (no Phaser, no runtime imports; Node-testable).
 *
 * One recovery operation with five sites in a fixed operational order
 * (sheet 11 participant flow: valve difficulty → antenna start → scan/dig
 * recovery → magnet deck/depletion → disconnected channel), plus the M05
 * occasion-2 fault beside the airlock apron (hosted by
 * ../windows/m05Initiation.ts). The order is GUIDANCE only (objective line
 * + beacon): every site is independently enterable at any time after the
 * briefing, no site's outcome gates another, and the return airlock is
 * always available.
 *
 * The episode state bundles the five item models and the deterministic
 * factories the tests need (fresh episode, counterbalanced forms, each
 * prepared scenario). Persisted field caches (belt-full recoveries) live
 * here too so an item can never be lost by leaving the yard.
 */

import type { M19Form, M19State } from './m19CouplingModel';
import {
  createM19State,
  M19_EVENT_SUFFIXES,
  M19_FAMILY,
} from './m19CouplingModel';
import type { M20State } from './m20AntennaModel';
import {
  createM20State,
  M20_FAMILY,
  M20_START_EVENT_SUFFIXES,
} from './m20AntennaModel';
import type { M23Form, M23State } from './m23ExcavationModel';
import {
  createM23State,
  M23_EVENT_SUFFIXES,
  M23_FAMILY,
} from './m23ExcavationModel';
import type { M24State } from './m24MagnetRigModel';
import {
  createM24State,
  M24_EVENT_SUFFIXES,
  M24_FAMILY,
} from './m24MagnetRigModel';
import type { M26State } from './m26ChannelModel';
import {
  createM26State,
  M26_EVENT_SUFFIXES,
  M26_FAMILY,
} from './m26ChannelModel';

export type ExteriorSite =
  | 'coupling'
  | 'mast'
  | 'excavation'
  | 'rig'
  | 'console'
  | 'uplink';

export const EXTERIOR_SITE_ORDER: readonly ExteriorSite[] = [
  'coupling',
  'mast',
  'excavation',
  'rig',
  // Station 080 M08 (U2-R): the support console is a listed yard job so
  // every participant is told where it is; it sits between the rig and
  // the uplink posts, separating the two post-knowledge assays.
  'console',
  'uplink',
];

/** Stable landmark names (participant-facing). */
export const EXTERIOR_SITE_LABELS: Record<ExteriorSite, string> = {
  coupling: 'Frozen Coolant Coupling',
  mast: 'Mast 04',
  excavation: 'Excavation Field Stake',
  rig: 'Magnet Recovery Rig',
  console: 'Station Support Console',
  uplink: 'Field Uplink Post A',
};

/** ONE objective line per site (tool hint only where relevant). */
export const EXTERIOR_OBJECTIVES: Record<ExteriorSite | 'report', string> = {
  coupling: 'Open the frozen coolant coupling — west side (E at the coupling).',
  mast: 'Start the antenna restoration at Mast 04 — north (E at the mast).',
  excavation:
    'Recover the buried relay coupling — staked excavation field, east (E at the stake, then C scan · D dig).',
  rig: 'Run the salvage tally at the magnet rig — Metal Recovery Yard, north-east (E at the rig panel, then F on the pad).',
  console:
    'Run the six slots at the station support console — open field south of the mast (E at the console).',
  uplink:
    'When the yard work is done, send the recovery reports from the uplink posts — north-west (E at a post).',
  report: 'Report to Noor, then return inside through the airlock.',
};

export type MagnetDeckFormId = 'A' | 'B';

export interface PersistedFieldCache {
  id: string;
  item_id: string;
  x: number;
  y: number;
  source: 'dig' | 'magnet';
}

export interface ExteriorEpisodeState {
  m23_form: M23Form;
  deck_form: MagnetDeckFormId;
  m19: M19State;
  m20: M20State;
  m23: M23State;
  m24: M24State;
  m26: M26State;
  /** Belt-full recoveries left at their spot (item conservation). */
  caches: PersistedFieldCache[];
  cache_seq: number;
  /** Persisted disturbed ground (col:row → outcome) across scene creations. */
  dug_cells: { col: number; row: number }[];
  zone_entries: number;
  /** Sites the participant explicitly stepped away from (GUIDANCE only). */
  guidance_dismissed: ExteriorSite[];
  /** The shift outside was declared finished (the interruption point). */
  shift_ended_at_ms: number | null;
}

export interface ExteriorEpisodeOptions {
  m23Form: M23Form;
  deckForm: MagnetDeckFormId;
  m19Form?: M19Form;
}

/** Fresh exterior episode with explicit counterbalanced forms. */
export function createExteriorEpisode(
  options: ExteriorEpisodeOptions,
): ExteriorEpisodeState {
  return {
    m23_form: options.m23Form,
    deck_form: options.deckForm,
    m19: createM19State(options.m19Form ?? 'standard_v1'),
    m20: createM20State(),
    m23: createM23State(options.m23Form),
    m24: createM24State(`deck_form_${options.deckForm}`),
    m26: createM26State(),
    caches: [],
    cache_seq: 0,
    dug_cells: [],
    zone_entries: 0,
    guidance_dismissed: [],
    shift_ended_at_ms: null,
  };
}

/**
 * A site is terminal for GUIDANCE only (objective line + beacon; never a
 * gate, never a register write): once the participant has ENTERED the
 * site's window, explicitly stepped away from its panel, or the window
 * closed. Guidance therefore never changes at an acknowledgement or a
 * depletion — the moment a post-knowledge behaviour is being observed
 * (scientific review, Unit 4).
 */
export function exteriorDismissSite(
  state: ExteriorEpisodeState,
  site: ExteriorSite,
): void {
  if (!state.guidance_dismissed.includes(site)) {
    state.guidance_dismissed.push(site);
  }
}

export function exteriorSiteDone(
  state: ExteriorEpisodeState,
  site: ExteriorSite,
): boolean {
  if (state.guidance_dismissed.includes(site)) {
    return true;
  }

  switch (site) {
    case 'coupling':
      return state.m19.entered || state.m19.closed;
    case 'mast':
      return state.m20.accepted;
    case 'excavation':
      return state.m23.entered || state.m23.closed;
    case 'rig':
      return state.m24.entered || state.m24.closed;
    case 'console':
      // The console's own window lives outside this pure model; the scene
      // releases guidance for it when the console opens (guidance only).
      return false;
    case 'uplink':
      return state.m26.entered || state.m26.closed;
  }
}

/** The current guided site in operational order, or 'report' when done. */
export function exteriorCurrentSite(
  state: ExteriorEpisodeState,
): ExteriorSite | 'report' {
  return (
    EXTERIOR_SITE_ORDER.find((site) => !exteriorSiteDone(state, site)) ??
    'report'
  );
}

export function exteriorObjective(state: ExteriorEpisodeState): string {
  return EXTERIOR_OBJECTIVES[exteriorCurrentSite(state)];
}

export function exteriorAddCache(
  state: ExteriorEpisodeState,
  cache: Omit<PersistedFieldCache, 'id'>,
): PersistedFieldCache {
  state.cache_seq += 1;

  const entry: PersistedFieldCache = {
    id: `exterior_cache_${state.cache_seq}`,
    ...cache,
  };

  state.caches.push(entry);

  return entry;
}

export function exteriorRemoveCache(
  state: ExteriorEpisodeState,
  itemId: string,
  x: number,
  y: number,
): PersistedFieldCache | null {
  const index = state.caches.findIndex(
    (entry) =>
      entry.item_id === itemId &&
      Math.abs(entry.x - x) < 1 &&
      Math.abs(entry.y - y) < 1,
  );

  if (index === -1) {
    return null;
  }

  return state.caches.splice(index, 1)[0];
}

export function exteriorNoteDug(
  state: ExteriorEpisodeState,
  col: number,
  row: number,
): void {
  if (!state.dug_cells.some((cell) => cell.col === col && cell.row === row)) {
    state.dug_cells.push({ col, row });
  }
}

/** Every Unit 4 primary family prefix (pairwise-disjointness tests). */
export const EXTERIOR_FAMILIES = {
  M19: M19_FAMILY,
  M20: M20_FAMILY,
  M23: M23_FAMILY,
  M24: M24_FAMILY,
  M26: M26_FAMILY,
} as const;

/** Every Unit 4 item-owned event type (complete, for disjointness tests). */
export function exteriorEventTypes(): Record<string, string[]> {
  return {
    M19: M19_EVENT_SUFFIXES.map((suffix) => `${M19_FAMILY}${suffix}`),
    M20: M20_START_EVENT_SUFFIXES.map((suffix) => `${M20_FAMILY}${suffix}`),
    M23: M23_EVENT_SUFFIXES.map((suffix) => `${M23_FAMILY}${suffix}`),
    M24: M24_EVENT_SUFFIXES.map((suffix) => `${M24_FAMILY}${suffix}`),
    M26: M26_EVENT_SUFFIXES.map((suffix) => `${M26_FAMILY}${suffix}`),
  };
}
