/**
 * M13 — the three keyed networks of the Conduit Lattice Bench series
 * (Station 080 Unit 16, administration `m13-networks-v1`).
 *
 * PURE module (no Phaser, no runtime, no `import.meta`): the network
 * definitions in both orientation forms, their ids and content versions,
 * the form isometry and the structural descriptors the events carry.
 *
 * Research-owner ruling D-U16-1 (7 October 2026): the same 3×3 mount
 * board and the same standard nine-piece set across three genuinely
 * different configurations; the existing 90° rotation is the alternate
 * orientation form; fixed order n1 → n2 → n3. The key of a network is the
 * pair (its configuration, the shared validator `validatePipePlacements`).
 *
 * What this file does NOT claim: the three networks are repeated
 * observations inside one bench episode, not independent situations; they
 * are not equal in difficulty; forms A and B are matched by construction
 * (a rotation), neither empirically equated nor independent. Every
 * identifier is a PROVISIONAL candidate, never a canonical name.
 */

import type { M13SlotId, PipeBoardConfig } from '../measurement/m13PipePuzzle';
import type { FormId } from './model';
import type { LatticeForm } from './pipeBoardEngine';

/** Administration (entry-state) version carried on every event. */
export const M13N_ENTRY_STATE_VERSION = 'm13-networks-v1';
/** The ONE opportunity of the series. */
export const M13N_OPPORTUNITY_ID = 'proto_m13_network_series';
/** Event-family prefix (`IpFamily` `proto_m13_networks`). */
export const M13N_FAMILY_PREFIX = 'proto_m13_networks_';
export const M13N_OBJECT_ID = 'ip_lattice_bench';

export const M13N_NETWORK_IDS = ['n1', 'n2', 'n3'] as const;
export type M13NetworkId = (typeof M13N_NETWORK_IDS)[number];

/** Fixed presentation order for every participant (ruling item 3). */
export const M13N_ASSIGNED_ORDER: readonly M13NetworkId[] = M13N_NETWORK_IDS;
export const M13N_NETWORKS_PLANNED = M13N_NETWORK_IDS.length;

export type M13PortRelation = 'opposite_sides' | 'adjacent_sides' | 'same_side';

export const M13N_CONTENT_VERSIONS: Record<M13NetworkId, string> = {
  n1: 'm13-n1-opposite-v1',
  n2: 'm13-n2-adjacent-v1',
  n3: 'm13-n3-same-side-v1',
};

/**
 * Form A of each network, authored (default D-1). Directions: 0 north,
 * 1 east, 2 south, 3 west — the side of the mount the port sits on.
 * - n1: the v2 geometry — feed west of A2, intake east of C2, B2 fractured.
 * - n2: feed west of A1, intake south of C3, B1 fractured.
 * - n3: feed west of A1, intake west of A3, A2 fractured.
 */
const FORM_A: Record<M13NetworkId, PipeBoardConfig> = {
  n1: {
    source: { slot: 'A2', direction: 3 },
    outlet: { slot: 'C2', direction: 1 },
    broken: 'B2',
  },
  n2: {
    source: { slot: 'A1', direction: 3 },
    outlet: { slot: 'C3', direction: 2 },
    broken: 'B1',
  },
  n3: {
    source: { slot: 'A1', direction: 3 },
    outlet: { slot: 'A3', direction: 3 },
    broken: 'A2',
  },
};

/** 90° clockwise rotation of a mount: (column, row) → (2 − row, column). */
export function m13RotateSlotCw(slot: M13SlotId): M13SlotId {
  const column = slot.charCodeAt(0) - 65;
  const row = Number(slot[1]) - 1;

  return `${String.fromCharCode(65 + (2 - row))}${column + 1}` as M13SlotId;
}

/** 90° clockwise rotation of a side: north → east → south → west → north. */
export function m13RotateDirectionCw(direction: number): number {
  return (direction + 1) % 4;
}

/** The form isometry: form B of a network is this rotation of its form A. */
export function m13RotateConfigCw(config: PipeBoardConfig): PipeBoardConfig {
  return {
    source: {
      slot: m13RotateSlotCw(config.source.slot),
      direction: m13RotateDirectionCw(config.source.direction),
    },
    outlet: {
      slot: m13RotateSlotCw(config.outlet.slot),
      direction: m13RotateDirectionCw(config.outlet.direction),
    },
    broken: m13RotateSlotCw(config.broken),
  };
}

const SIDE_NAMES = ['north', 'east', 'south', 'west'] as const;

export function m13SideName(direction: number): string {
  return SIDE_NAMES[((direction % 4) + 4) % 4];
}

function portRelation(config: PipeBoardConfig): M13PortRelation {
  const turn = (config.outlet.direction - config.source.direction + 4) % 4;

  return turn === 0
    ? 'same_side'
    : turn === 2
      ? 'opposite_sides'
      : 'adjacent_sides';
}

export interface M13NetworkDef {
  network_id: M13NetworkId;
  /** 1-based position in the fixed order. */
  network_index: number;
  /** Trial / window id of the network (`m13_network_n1` …). */
  trial_id: string;
  content_version: string;
  form_id: FormId;
  port_relation: M13PortRelation;
  /** Board geometry handed to the engine and to the shared validator. */
  config: LatticeForm;
  /** Fractured mounts (every network of this version has exactly one). */
  blocked: M13SlotId[];
}

function build(id: M13NetworkId, form: FormId): M13NetworkDef {
  const geometry = form === 'A' ? FORM_A[id] : m13RotateConfigCw(FORM_A[id]);

  return {
    network_id: id,
    network_index: M13N_NETWORK_IDS.indexOf(id) + 1,
    trial_id: `m13_network_${id}`,
    content_version: M13N_CONTENT_VERSIONS[id],
    form_id: form,
    port_relation: portRelation(geometry),
    config: {
      source: { ...geometry.source },
      outlet: { ...geometry.outlet },
      broken: geometry.broken,
      feed_label: `FEED (${m13SideName(geometry.source.direction)} of ${geometry.source.slot})`,
      intake_label: `INTAKE (${m13SideName(geometry.outlet.direction)} of ${geometry.outlet.slot})`,
    },
    blocked: [geometry.broken],
  };
}

const NETWORKS: Record<FormId, Record<M13NetworkId, M13NetworkDef>> = {
  A: { n1: build('n1', 'A'), n2: build('n2', 'A'), n3: build('n3', 'A') },
  B: { n1: build('n1', 'B'), n2: build('n2', 'B'), n3: build('n3', 'B') },
};

export function isM13NetworkId(value: unknown): value is M13NetworkId {
  return (
    typeof value === 'string' &&
    (M13N_NETWORK_IDS as readonly string[]).includes(value)
  );
}

/** One network in one form (a fresh copy; callers may not share state). */
export function m13Network(id: M13NetworkId, form: FormId): M13NetworkDef {
  return structuredClone(NETWORKS[form][id]);
}

/** The three networks of a form, in the assigned order. */
export function m13Networks(form: FormId): M13NetworkDef[] {
  return M13N_ASSIGNED_ORDER.map((id) => m13Network(id, form));
}

/** The structural descriptor of a network as the events record it. */
export function m13NetworkDescriptor(def: M13NetworkDef) {
  return {
    network_id: def.network_id,
    network_index: def.network_index,
    trial_id: def.trial_id,
    content_version: def.content_version,
    port_relation: def.port_relation,
    feed: {
      slot: def.config.source.slot,
      side: m13SideName(def.config.source.direction),
    },
    intake: {
      slot: def.config.outlet.slot,
      side: m13SideName(def.config.outlet.direction),
    },
    blocked_mounts: [...def.blocked],
  };
}
