/**
 * Station 080 M13 — three keyed networks with immutable first responses
 * (Unit 16, administration `m13-networks-v1`), pure tests.
 *
 * Playwright test blocks that never touch `page`:
 * - keys and solvability of every network × form against a REFERENCE
 *   CHECKER written here from the rule text (its own piece-opening table,
 *   its own flood of the run, its own rotation of the board — it imports
 *   neither the shared validator nor any helper of the forms module for
 *   the expected side), hand-authored key layouts, a seeded random sample
 *   and an independent backtracking census;
 * - the register row and route;
 * - the series model in its two phases (research-owner ruling D-U16-1): no
 *   correctness information and no practice before all three first
 *   responses; first responses written once and never changed; the same
 *   practice access and cap after every kind of first response;
 * - the read-only extractor on synthetic logs: values, the stability of
 *   the completed result, legitimate missingness, technical failure for
 *   contradictory or unverifiable scored evidence;
 * - the wording of the bench.
 *
 * Nothing here establishes psychometric validity: the three networks are
 * repeated observations inside one bench episode and are not claimed to be
 * equal in difficulty; the forms are a rotation of one another.
 */
import { expect, test } from '@playwright/test';

import {
  M13N_ASSIGNED_ORDER,
  M13N_CONTENT_VERSIONS,
  M13N_ENTRY_STATE_VERSION,
  M13N_FAMILY_PREFIX,
  M13N_OPPORTUNITY_ID,
  m13Network,
  type M13NetworkId,
  m13Networks,
} from '../src/informationProcessing/m13NetworkForms';
import {
  createM13Series,
  m13AcknowledgementLine,
  M13N_EVENT_SUFFIXES,
  M13N_HELP_FIRST_RESPONSES,
  M13N_HELP_RESULTS,
  M13N_PRACTICE_RUNS_MAX,
  M13N_RELOAD_DETAIL,
  M13N_SETTLE_MS,
  M13N_TEXT,
  m13ParticipantStrings,
  m13PriorAdministration,
  m13sAct,
  m13sBackToResults,
  m13sCancelCommit,
  m13sCloseAtReview,
  m13sConfirmCommit,
  type M13Series,
  type M13SeriesEvent,
  m13sFail,
  m13sFinish,
  m13sHelp,
  m13sLeave,
  m13sNext,
  m13sOpen,
  m13sOpenPractice,
  m13sPracticeTest,
  m13sRecord,
  m13sRequestCommit,
  m13sResults,
  m13sStop,
  m13sSubmissionCount,
  m13sView,
} from '../src/informationProcessing/m13NetworkSeries';
import type { FormId } from '../src/informationProcessing/model';
import { M13L_FORMS } from '../src/informationProcessing/pipeBoardEngine';
import {
  extractItemFeatures,
  extractMeasurementFeatures,
} from '../src/measurement/features';
import type { M13Placement, M13SlotId } from '../src/measurement/m13PipePuzzle';
import { validatePipePlacements } from '../src/measurement/m13PipePuzzle';
import { REGISTER_V3, registerEntry } from '../src/measurement/registerV3';
import { PILOT_SCHEDULE } from '../src/pilot/coverageSchedule';
import type { RawGameEvent } from '../src/systems/EventLogger';

const FORMS: readonly FormId[] = ['A', 'B'];
const NETWORKS: readonly M13NetworkId[] = ['n1', 'n2', 'n3'];

/* ------------------------------------------------------------------ *
 * The reference checker — written from the rule text, independent of the
 * implementation. Rule text: pieces sit on the nine mounts A1…C3 (column
 * A–C west to east, row 1–3 north to south); a fractured mount seats
 * nothing. The run is everything reachable from the piece on the feed
 * mount through pairs of openings that face each other, provided that
 * piece has an opening on the feed side. The run is CONNECTED when a
 * piece of it sits on the intake mount with an opening on the intake
 * side; the VALVE IS INLINE when the isolation valve is a piece of the
 * run; an OPEN BRANCH is an opening of a piece of the run — other than
 * the two ports — that does not face a matching opening. SEALED =
 * connected, valve inline, no open branch.
 * ------------------------------------------------------------------ */

type Side = 'N' | 'E' | 'S' | 'W';
const CLOCKWISE: readonly Side[] = ['N', 'E', 'S', 'W'];
/** Openings of each piece type as delivered (quarter turn 0). */
const REF_OPENINGS: Record<string, string> = {
  straight: 'EW',
  elbow: 'NE',
  tee: 'WNE',
  valve: 'EW',
  cap: 'W',
};
const REF_STOCK: Record<string, string[]> = {
  straight: ['st1', 'st2'],
  elbow: ['el1', 'el2', 'el3', 'el4'],
  tee: ['te1'],
  valve: ['va1'],
  cap: ['cap1'],
};
const REF_TYPE_OF: Record<string, string> = Object.fromEntries(
  Object.entries(REF_STOCK).flatMap(([type, ids]) =>
    ids.map((id) => [id, type]),
  ),
);
const REF_SLOTS = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3'];

interface RefNetwork {
  feed: [string, Side];
  intake: [string, Side];
  fractured: string[];
}

type Layout = Record<string, { piece_id: string; rotation: number }>;

function turnSide(side: Side, quarterTurns: number): Side {
  return CLOCKWISE[(CLOCKWISE.indexOf(side) + quarterTurns) % 4];
}

function refSides(pieceId: string, rotation: number): Side[] {
  return [...REF_OPENINGS[REF_TYPE_OF[pieceId]]].map((letter) =>
    turnSide(letter as Side, rotation / 90),
  );
}

function refNeighbour(slot: string, side: Side): string | null {
  const column = 'ABC'.indexOf(slot[0]);
  const row = Number(slot[1]);
  const next =
    side === 'N'
      ? [column, row - 1]
      : side === 'S'
        ? [column, row + 1]
        : side === 'E'
          ? [column + 1, row]
          : [column - 1, row];

  return next[0] < 0 || next[0] > 2 || next[1] < 1 || next[1] > 3
    ? null
    : `${'ABC'[next[0]]}${next[1]}`;
}

interface RefVerdict {
  connected: boolean;
  valve: boolean;
  open: number;
  sealed: boolean;
}

function refCheck(layout: Layout, network: RefNetwork): RefVerdict {
  const start = layout[network.feed[0]];

  if (
    start === undefined ||
    !refSides(start.piece_id, start.rotation).includes(network.feed[1])
  ) {
    return { connected: false, valve: false, open: 0, sealed: false };
  }

  const run = new Set<string>();
  let open = 0;
  let connected = false;
  const visit = (slot: string) => {
    run.add(slot);

    for (const side of refSides(layout[slot].piece_id, layout[slot].rotation)) {
      if (slot === network.feed[0] && side === network.feed[1]) {
        continue;
      }

      if (slot === network.intake[0] && side === network.intake[1]) {
        connected = true;
        continue;
      }

      const next = refNeighbour(slot, side);
      const facing =
        next !== null &&
        layout[next] !== undefined &&
        refSides(layout[next].piece_id, layout[next].rotation).includes(
          turnSide(side, 2),
        );

      if (!facing) {
        open += 1;
      } else if (!run.has(next!)) {
        visit(next!);
      }
    }
  };

  visit(network.feed[0]);

  const valve = [...run].some(
    (slot) => REF_TYPE_OF[layout[slot].piece_id] === 'valve',
  );

  return { connected, valve, open, sealed: connected && valve && open === 0 };
}

/** The test's own 90° clockwise rotation of the board. */
function refRotateSlot(slot: string): string {
  const column = 'ABC'.indexOf(slot[0]);
  const row = Number(slot[1]) - 1;

  return `${'ABC'[2 - row]}${column + 1}`;
}

function refRotateNetwork(network: RefNetwork): RefNetwork {
  return {
    feed: [refRotateSlot(network.feed[0]), turnSide(network.feed[1], 1)],
    intake: [refRotateSlot(network.intake[0]), turnSide(network.intake[1], 1)],
    fractured: network.fractured.map(refRotateSlot),
  };
}

/** Mirror across the vertical axis (west ↔ east). */
function refMirrorNetwork(network: RefNetwork): RefNetwork {
  const slot = (value: string) =>
    `${'CBA'['ABC'.indexOf(value[0])]}${value[1]}`;
  const side = (value: Side): Side =>
    value === 'E' ? 'W' : value === 'W' ? 'E' : value;

  return {
    feed: [slot(network.feed[0]), side(network.feed[1])],
    intake: [slot(network.intake[0]), side(network.intake[1])],
    fractured: network.fractured.map(slot),
  };
}

/** The eight symmetries of the square applied to a network. */
function refSymmetries(network: RefNetwork): RefNetwork[] {
  const out: RefNetwork[] = [];
  let turned = network;

  for (let quarter = 0; quarter < 4; quarter += 1) {
    out.push(turned, refMirrorNetwork(turned));
    turned = refRotateNetwork(turned);
  }

  return out;
}

function refKey(network: RefNetwork): string {
  return `${network.feed.join('')}>${network.intake.join('')}|${[...network.fractured].sort().join(',')}`;
}

/** Form A of each network as the register documents it (hand-written). */
const REF_A: Record<M13NetworkId, RefNetwork> = {
  n1: { feed: ['A2', 'W'], intake: ['C2', 'E'], fractured: ['B2'] },
  n2: { feed: ['A1', 'W'], intake: ['C3', 'S'], fractured: ['B1'] },
  n3: { feed: ['A1', 'W'], intake: ['A3', 'W'], fractured: ['A2'] },
};
/** Form B as the register documents it (hand-written, not derived). */
const REF_B: Record<M13NetworkId, RefNetwork> = {
  n1: { feed: ['B1', 'N'], intake: ['B3', 'S'], fractured: ['B2'] },
  n2: { feed: ['C1', 'N'], intake: ['A3', 'W'], fractured: ['C2'] },
  n3: { feed: ['C1', 'N'], intake: ['A1', 'N'], fractured: ['B1'] },
};
const REF: Record<FormId, Record<M13NetworkId, RefNetwork>> = {
  A: REF_A,
  B: REF_B,
};

/** The implementation's configuration in the reference vocabulary. */
function implNetwork(id: M13NetworkId, form: FormId): RefNetwork {
  const def = m13Network(id, form);

  return {
    feed: [def.config.source.slot, CLOCKWISE[def.config.source.direction]],
    intake: [def.config.outlet.slot, CLOCKWISE[def.config.outlet.direction]],
    fractured: [...def.blocked],
  };
}

function implVerdict(layout: Layout, id: M13NetworkId, form: FormId) {
  const detail = validatePipePlacements(
    layout as Partial<Record<M13SlotId, M13Placement>>,
    m13Network(id, form).config,
  );

  return {
    connected: detail.endpoint_connected,
    valve: detail.valve_inline,
    open: detail.open_branch_count,
    sealed: detail.valid,
  };
}

function lay(spec: string): Layout {
  // "A2:el1@270 A1:el2@90" → layout.
  return Object.fromEntries(
    spec.split(' ').map((entry) => {
      const [slot, rest] = entry.split(':');
      const [pieceId, rotation] = rest.split('@');

      return [slot, { piece_id: pieceId, rotation: Number(rotation) }];
    }),
  );
}

/**
 * Hand-authored key layouts. Each near-miss breaks exactly ONE constraint;
 * the expected verdicts were written by hand from the rule text.
 */
const KEYS: Record<
  FormId,
  Record<
    M13NetworkId,
    { sealed: string; unconnected: string; valve_off: string; open: string }
  >
> = {
  A: {
    n1: {
      sealed: 'A2:el1@270 A1:el2@90 B1:va1@0 C1:el3@180 C2:el4@0',
      unconnected: 'A2:el1@270 A1:el2@90 B1:va1@0 C1:cap1@0',
      valve_off: 'A2:el1@270 A1:el2@90 B1:st1@0 C1:el3@180 C2:el4@0',
      open: 'A2:el1@270 A1:el2@90 B1:va1@0 C1:el3@180 C2:te1@90',
    },
    n2: {
      sealed: 'A1:el1@180 A2:st1@90 A3:el2@0 B3:va1@0 C3:el3@180',
      unconnected: 'A1:el1@180 A2:va1@90 A3:el2@0 B3:cap1@0',
      valve_off: 'A1:el1@180 A2:st1@90 A3:el2@0 B3:st2@0 C3:el3@180',
      open: 'A1:el1@180 A2:st1@90 A3:el2@0 B3:va1@0 C3:te1@180',
    },
    n3: {
      sealed: 'A1:st1@0 B1:el1@180 B2:va1@90 B3:el2@270 A3:st2@0',
      unconnected: 'A1:st1@0 B1:el1@180 B2:va1@90 B3:cap1@90',
      valve_off: 'A1:st1@0 B1:el1@180 B2:te1@90 C2:cap1@0 B3:el2@270 A3:st2@0',
      open: 'A1:st1@0 B1:el1@180 B2:va1@90 B3:te1@0 A3:st2@0',
    },
  },
  B: {
    n1: {
      sealed: 'B1:el1@0 C1:el2@180 C2:va1@90 C3:el3@270 B3:el4@90',
      unconnected: 'B1:el1@0 C1:el2@180 C2:va1@90 C3:cap1@90',
      valve_off: 'B1:el1@0 C1:el2@180 C2:st1@90 C3:el3@270 B3:el4@90',
      open: 'B1:el1@0 C1:el2@180 C2:va1@90 C3:el3@270 B3:te1@180',
    },
    n2: {
      sealed: 'C1:el1@270 B1:st1@180 A1:el2@90 A2:va1@90 A3:el3@270',
      unconnected: 'C1:el1@270 B1:va1@180 A1:el2@90 A2:cap1@90',
      valve_off: 'C1:el1@270 B1:st1@180 A1:el2@90 A2:st2@90 A3:el3@270',
      open: 'C1:el1@270 B1:st1@180 A1:el2@90 A2:va1@90 A3:te1@270',
    },
    n3: {
      sealed: 'C1:st1@90 C2:el1@270 B2:va1@180 A2:el2@0 A1:st2@90',
      unconnected: 'C1:st1@90 C2:el1@270 B2:va1@180 A2:cap1@180',
      valve_off:
        'C1:st1@90 C2:el1@270 B2:te1@180 B3:cap1@90 A2:el2@0 A1:st2@90',
      open: 'C1:st1@90 C2:el1@270 B2:va1@180 A2:te1@90 A1:st2@90',
    },
  },
};

/** Deterministic pseudo-random numbers (mulberry32). */
function seeded(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALL_PIECES = Object.values(REF_STOCK).flat();

function randomLayout(random: () => number, network: RefNetwork): Layout {
  const mounts = REF_SLOTS.filter((slot) => !network.fractured.includes(slot));
  const pieces = [...ALL_PIECES].sort(() => random() - 0.5);
  const layout: Layout = {};

  for (const slot of mounts) {
    if (random() < 0.7 && pieces.length > 0) {
      layout[slot] = {
        piece_id: pieces.pop()!,
        rotation: Math.floor(random() * 4) * 90,
      };
    }
  }

  return layout;
}

/** One random edit of a layout (turn, remove, swap type or add a piece). */
function perturb(
  random: () => number,
  layout: Layout,
  network: RefNetwork,
): Layout {
  const next: Layout = structuredClone(layout);
  const seated = Object.keys(next);
  const free = ALL_PIECES.filter(
    (id) => !Object.values(next).some((entry) => entry.piece_id === id),
  );
  const roll = random();
  const slot = seated[Math.floor(random() * seated.length)];

  if (roll < 0.3) {
    next[slot].rotation = (next[slot].rotation + 90) % 360;
  } else if (roll < 0.5) {
    delete next[slot];
  } else if (roll < 0.8 && free.length > 0) {
    next[slot].piece_id = free[Math.floor(random() * free.length)];
  } else if (free.length > 0) {
    const empty = REF_SLOTS.filter(
      (candidate) =>
        next[candidate] === undefined && !network.fractured.includes(candidate),
    );

    if (empty.length > 0) {
      next[empty[Math.floor(random() * empty.length)]] = {
        piece_id: free[Math.floor(random() * free.length)],
        rotation: Math.floor(random() * 4) * 90,
      };
    }
  }

  return next;
}

/**
 * Independent backtracking search over connected runs from the feed (a tee
 * branch closed by the cap included). A layout is identified by mount →
 * (piece type, set of openings): pieces of one type are interchangeable
 * and a straight turned by 180° is the same layout.
 */
function refCensus(network: RefNetwork) {
  const stock: Record<string, number> = Object.fromEntries(
    Object.entries(REF_STOCK).map(([type, ids]) => [type, ids.length]),
  );
  const placed = new Map<string, { type: string; sides: Side[] }>();
  const found = new Map<string, Layout>();
  const orientations = (type: string): Side[][] => {
    const seen = new Map<string, Side[]>();

    for (let quarter = 0; quarter < 4; quarter += 1) {
      const sides = [...REF_OPENINGS[type]].map((letter) =>
        turnSide(letter as Side, quarter),
      );

      seen.set([...sides].sort().join(''), sides);
    }

    return [...seen.values()];
  };
  const isPort = (slot: string, side: Side) =>
    (slot === network.feed[0] && side === network.feed[1]) ||
    (slot === network.intake[0] && side === network.intake[1]);
  const fits = (slot: string, sides: Side[]) =>
    CLOCKWISE.every((side) => {
      const has = sides.includes(side);

      if (has && isPort(slot, side)) {
        return true;
      }

      const next = refNeighbour(slot, side);

      if (has && (next === null || network.fractured.includes(next))) {
        return false;
      }

      const other = next === null ? undefined : placed.get(next);

      return (
        other === undefined || other.sides.includes(turnSide(side, 2)) === has
      );
    });
  /** The first mount an opening of the run still points at, if any. */
  const pending = (): [string, Side] | null | 'dead' => {
    for (const [slot, piece] of placed) {
      for (const side of piece.sides) {
        if (isPort(slot, side)) {
          continue;
        }

        const next = refNeighbour(slot, side);

        if (next === null || network.fractured.includes(next)) {
          return 'dead';
        }

        if (!placed.has(next)) {
          return [next, turnSide(side, 2)];
        }
      }
    }

    return null;
  };
  const emitLayout = () => {
    const key = [...placed.entries()]
      .map(
        ([slot, piece]) =>
          `${slot}:${piece.type}:${[...piece.sides].sort().join('')}`,
      )
      .sort()
      .join('|');
    const spare: Record<string, string[]> = structuredClone(REF_STOCK);
    const layout: Layout = {};

    for (const [slot, piece] of placed) {
      const pieceId = spare[piece.type].shift()!;
      const rotation = [0, 90, 180, 270].find(
        (candidate) =>
          [...refSides(pieceId, candidate)].sort().join('') ===
          [...piece.sides].sort().join(''),
      )!;

      layout[slot] = { piece_id: pieceId, rotation };
    }

    found.set(key, layout);
  };
  const search = () => {
    const next = pending();

    if (next === 'dead') {
      return;
    }

    if (next === null) {
      const end = placed.get(network.intake[0]);

      if (
        end !== undefined &&
        end.sides.includes(network.intake[1]) &&
        [...placed.values()].some((piece) => piece.type === 'valve')
      ) {
        emitLayout();
      }

      return;
    }

    tryMount(next[0], next[1]);
  };
  const tryMount = (slot: string, must: Side) => {
    for (const type of Object.keys(REF_OPENINGS)) {
      if (stock[type] === 0) {
        continue;
      }

      for (const sides of orientations(type)) {
        if (sides.includes(must) && fits(slot, sides)) {
          stock[type] -= 1;
          placed.set(slot, { type, sides });
          search();
          placed.delete(slot);
          stock[type] += 1;
        }
      }
    }
  };

  tryMount(network.feed[0], network.feed[1]);

  const sizes = [...found.values()].map((layout) => Object.keys(layout).length);

  return {
    layouts: [...found.values()],
    count: found.size,
    smallest: Math.min(...sizes),
    by_size: [5, 6, 7, 8].map(
      (size) => sizes.filter((value) => value === size).length,
    ),
  };
}

/** The census recorded in the register (§4 "Unit 16" (2)). */
const CENSUS: Record<
  M13NetworkId,
  { count: number; smallest: number; by_size: number[] }
> = {
  n1: { count: 18, smallest: 5, by_size: [2, 4, 4, 8] },
  n2: { count: 32, smallest: 5, by_size: [4, 10, 14, 4] },
  n3: { count: 39, smallest: 5, by_size: [3, 8, 16, 12] },
};

test.describe('M13 networks: keys and solvability, independently derived', () => {
  for (const form of FORMS) {
    for (const id of NETWORKS) {
      test(`${id} form ${form}: hand-authored key layouts, reference checker and implementation agree`, () => {
        const reference = REF[form][id];
        const expected: Record<string, RefVerdict> = {
          sealed: { connected: true, valve: true, open: 0, sealed: true },
          unconnected: {
            connected: false,
            valve: true,
            open: 0,
            sealed: false,
          },
          valve_off: { connected: true, valve: false, open: 0, sealed: false },
          open: { connected: true, valve: true, open: 1, sealed: false },
        };

        for (const [name, spec] of Object.entries(KEYS[form][id])) {
          const layout = lay(spec);

          // No key layout uses a fractured mount or a piece twice.
          expect(
            Object.keys(layout).some((slot) =>
              reference.fractured.includes(slot),
            ),
          ).toBe(false);
          expect(
            new Set(Object.values(layout).map((entry) => entry.piece_id)).size,
          ).toBe(Object.keys(layout).length);
          expect(refCheck(layout, reference), `${name}: reference`).toEqual(
            expected[name],
          );
          expect(implVerdict(layout, id, form), `${name}: bench`).toEqual(
            expected[name],
          );
        }
      });

      test(`${id} form ${form}: the bench's verdict equals the reference checker's on a seeded sample`, () => {
        const reference = REF[form][id];
        const random = seeded(
          1300 + NETWORKS.indexOf(id) * 10 + (form === 'A' ? 0 : 1),
        );
        const base = refCensus(reference).layouts;
        let compared = 0;
        let sealedSeen = 0;
        let unsealedSeen = 0;

        // Layouts on the seatable mounts only: the bench refuses a piece on
        // a fractured mount, so no other layout can be recorded.
        for (let index = 0; index < 1200; index += 1) {
          const layout = randomLayout(random, reference);
          const verdict = refCheck(layout, reference);

          expect(implVerdict(layout, id, form)).toEqual(verdict);
          compared += 1;
          sealedSeen += Number(verdict.sealed);
          unsealedSeen += Number(!verdict.sealed);
        }

        for (let index = 0; index < 1200; index += 1) {
          let layout = base[Math.floor(random() * base.length)];

          for (let edits = Math.floor(random() * 3); edits > 0; edits -= 1) {
            layout = perturb(random, layout, reference);
          }

          const verdict = refCheck(layout, reference);

          expect(implVerdict(layout, id, form)).toEqual(verdict);
          compared += 1;
          sealedSeen += Number(verdict.sealed);
          unsealedSeen += Number(!verdict.sealed);
        }

        expect(compared).toBeGreaterThanOrEqual(2000);
        // The sample exercises both verdicts.
        expect(sealedSeen).toBeGreaterThan(100);
        expect(unsealedSeen).toBeGreaterThan(1000);
      });
    }
  }

  test('an independent search finds sealed layouts for every network; the bench accepts each; the census is identical for forms A and B', () => {
    for (const id of NETWORKS) {
      const censusA = refCensus(REF.A[id]);
      const censusB = refCensus(REF.B[id]);

      for (const [form, census] of [
        ['A', censusA],
        ['B', censusB],
      ] as const) {
        expect(census.count).toBeGreaterThan(0);

        for (const layout of census.layouts) {
          expect(refCheck(layout, REF[form][id]).sealed).toBe(true);
          expect(implVerdict(layout, id, form).sealed).toBe(true);
        }
      }

      const summary = (census: ReturnType<typeof refCensus>) => ({
        count: census.count,
        smallest: census.smallest,
        by_size: census.by_size,
      });

      expect(summary(censusA)).toEqual(summary(censusB));
      expect(summary(censusA)).toEqual(CENSUS[id]);
      // No network has a sealed run of fewer than four seated pieces.
      expect(censusA.smallest).toBeGreaterThanOrEqual(4);
    }
  });

  test("form B is the test's own 90° clockwise rotation of form A; the bench's configurations equal the documented ones", () => {
    for (const id of NETWORKS) {
      expect(refKey(refRotateNetwork(REF_A[id]))).toBe(refKey(REF_B[id]));

      for (const form of FORMS) {
        expect(refKey(implNetwork(id, form))).toBe(refKey(REF[form][id]));
      }
    }
  });

  test('within each form no network equals another under any of the eight symmetries of the square', () => {
    const swapped = (network: RefNetwork): RefNetwork => ({
      feed: network.intake,
      intake: network.feed,
      fractured: network.fractured,
    });

    for (const form of FORMS) {
      for (const a of NETWORKS) {
        // The eight symmetries are distinct maps of the board.
        expect(refSymmetries(implNetwork(a, form))).toHaveLength(8);

        for (const b of NETWORKS) {
          if (a === b) {
            continue;
          }

          const target = implNetwork(b, form);

          for (const image of refSymmetries(implNetwork(a, form))) {
            expect(refKey(image)).not.toBe(refKey(target));
            // Not even with feed and intake exchanged.
            expect(refKey(image)).not.toBe(refKey(swapped(target)));
          }
        }
      }
    }
  });

  test('n1 is the v2 geometry in both forms; the port relations are opposite / adjacent / same side; ids, versions and order are fixed', () => {
    expect(m13Network('n1', 'A').config).toMatchObject({
      source: { slot: 'A2', direction: 3 },
      outlet: { slot: 'C2', direction: 1 },
      broken: 'B2',
    });
    expect(m13Network('n1', 'B').config).toMatchObject({
      source: { slot: 'B1', direction: 0 },
      outlet: { slot: 'B3', direction: 2 },
      broken: 'B2',
    });

    for (const form of FORMS) {
      const { source, outlet, broken } = M13L_FORMS[form];

      expect(m13Network('n1', form).config).toMatchObject({
        source,
        outlet,
        broken,
      });
      expect(m13Networks(form).map((def) => def.port_relation)).toEqual([
        'opposite_sides',
        'adjacent_sides',
        'same_side',
      ]);
      expect(m13Networks(form).map((def) => def.network_id)).toEqual(NETWORKS);
      expect(m13Networks(form).map((def) => def.trial_id)).toEqual([
        'm13_network_n1',
        'm13_network_n2',
        'm13_network_n3',
      ]);
      expect(new Set(m13Networks(form).map((def) => def.form_id))).toEqual(
        new Set([form]),
      );

      // The relation, read by the test from the two port sides.
      const turn = (id: M13NetworkId) => {
        const network = implNetwork(id, form);

        return (
          (CLOCKWISE.indexOf(network.intake[1]) -
            CLOCKWISE.indexOf(network.feed[1]) +
            4) %
          4
        );
      };

      expect(turn('n1')).toBe(2);
      expect([1, 3]).toContain(turn('n2'));
      expect(turn('n3')).toBe(0);
    }

    expect([...M13N_ASSIGNED_ORDER]).toEqual(['n1', 'n2', 'n3']);
    expect(new Set(Object.values(M13N_CONTENT_VERSIONS)).size).toBe(3);
    expect(M13N_ENTRY_STATE_VERSION).toBe('m13-networks-v1');
  });
});

test.describe('M13 register row and route', () => {
  test('route v3, implemented, one opportunity, three network windows, one family; the feature row is unchanged', () => {
    const entry = registerEntry('M13');

    expect(entry.route).toEqual({
      route_version: 'v3',
      opportunity_ids: ['proto_m13_network_series'],
      windows: [
        {
          id: 'm13_network_n1',
          occasion: 'n1',
          zone: 'records_workshop',
          episode: 2,
        },
        {
          id: 'm13_network_n2',
          occasion: 'n2',
          zone: 'records_workshop',
          episode: 2,
        },
        {
          id: 'm13_network_n3',
          occasion: 'n3',
          zone: 'records_workshop',
          episode: 2,
        },
      ],
      family_prefixes: ['proto_m13_networks_'],
      secondary_ids: [],
    });
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.route.opportunity_ids).toEqual([M13N_OPPORTUNITY_ID]);
    expect(entry.route.family_prefixes).toEqual([M13N_FAMILY_PREFIX]);
    expect(entry.features).toHaveLength(1);
    expect(entry.features[0]).toMatchObject({
      feature_id: 'm13_first_solutions',
      kind: 'fraction',
      numerator: 'networks fully solved on the first submission',
      denominator:
        'three networks; Cannot solve counts as an incorrect first response; an interrupted network is missing',
      planned_denominator: 3,
      denominator_kind: 'planned_observations',
      range: '0–3',
      missing_rule: 'no network answered → null',
      role: 'primary',
    });
    expect(entry.features[0].feature_version).toBe(
      registerEntry('M12').features[0].feature_version,
    );
    expect(entry).toMatchObject({
      coverage_label: 'performance_counterpart',
      direction: 'extend_occasions',
      target: { occasions: 3 },
      independence: {
        kind: 'repeated_within_episode',
        note: 'three networks in one bench session',
      },
      operational_label: 'Conduit lattice bench (Workshop)',
      disposition_override: null,
    });
  });

  test('the schedule follows the register; opportunity ids are unique and family prefixes never overlap', () => {
    const scheduled = PILOT_SCHEDULE.find((entry) => entry.item === 'M13')!;

    expect(scheduled.opportunityIds).toEqual(['proto_m13_network_series']);
    expect(scheduled.familyPrefixes).toEqual(['proto_m13_networks_']);
    expect(scheduled.zone).toBe('records_workshop');

    const opportunities = REGISTER_V3.flatMap(
      (entry) => entry.route.opportunity_ids,
    );
    const prefixes = REGISTER_V3.flatMap(
      (entry) => entry.route.family_prefixes,
    );

    expect(new Set(opportunities).size).toBe(opportunities.length);
    expect(opportunities).not.toContain('proto_m13_lattice_construction');

    for (const a of prefixes) {
      for (const b of prefixes) {
        if (a !== b) {
          expect(a.startsWith(b), `${a} / ${b}`).toBe(false);
        }
      }
    }

    // The family's declared event names all carry the one prefix.
    expect(new Set(M13N_EVENT_SUFFIXES).size).toBe(M13N_EVENT_SUFFIXES.length);
  });
});

/* ------------------------------------------------------------------ *
 * Series-model drivers
 * ------------------------------------------------------------------ */

const NO_PRIOR = { priorAdministration: false };

/** A series with its own clock (ms). */
function bench(form: FormId = 'A') {
  const series = createM13Series(form);
  const clock = { now: 1_000 };
  const tick = (ms = 50) => {
    clock.now += ms;

    return clock.now;
  };

  return { series, clock, tick };
}

type Bench = ReturnType<typeof bench>;

function seat(b: Bench, layout: Layout) {
  for (const [slot, piece] of Object.entries(layout)) {
    expect(
      m13sAct(
        b.series,
        { kind: 'pick_bench', piece_id: piece.piece_id },
        'typed',
        b.tick(),
      ).ok,
    ).toBe(true);

    for (let turns = piece.rotation / 90; turns > 0; turns -= 1) {
      m13sAct(b.series, { kind: 'rotate_held' }, 'typed', b.tick());
    }

    expect(
      m13sAct(b.series, { kind: 'place', slot }, 'typed', b.tick()).ok,
    ).toBe(true);
  }
}

/** A fresh confirming press made well after the dialog opened. */
function confirmFresh(b: Bench) {
  const down = b.tick(M13N_SETTLE_MS + 100);

  return m13sConfirmCommit(
    b.series,
    { repeat: false, down_at_ms: down },
    'typed',
    b.tick(20),
  );
}

type Answer = 'sealed' | 'unsealed' | 'cannot_solve' | 'empty';

/** Gives the current network its first response. */
function answer(b: Bench, kind: Answer) {
  const network = b.series.networks[b.series.current].def;
  const keys = KEYS[b.series.form][network.network_id];

  if (kind === 'sealed') {
    seat(b, lay(keys.sealed));
  } else if (kind === 'unsealed') {
    seat(b, lay(keys.open));
  } else if (kind === 'cannot_solve') {
    // A sealed board on the bench: CANNOT SOLVE is incorrect whatever stands.
    seat(b, lay(keys.sealed));
  }

  expect(
    m13sRequestCommit(
      b.series,
      kind === 'cannot_solve' ? 'cannot_solve' : 'layout',
      'typed',
      b.tick(),
    ),
  ).toBe(true);
  expect(confirmFresh(b)).toBe('recorded');
}

/** Opens the bench and answers the three networks in order. */
function completed(answers: [Answer, Answer, Answer], form: FormId = 'A') {
  const b = bench(form);

  m13sOpen(b.series, b.tick(), NO_PRIOR);

  answers.forEach((kind, index) => {
    answer(b, kind);

    if (index < 2) {
      expect(m13sNext(b.series, b.tick())).toBe('network_presented');
    }
  });

  return b;
}

const suffixes = (series: M13Series) =>
  series.events.map((event) => event.suffix);
const count = (series: M13Series, suffix: string) =>
  series.events.filter((event) => event.suffix === suffix).length;
const firstResponses = (series: M13Series) =>
  JSON.stringify(
    series.events.filter((event) => event.suffix === 'first_response'),
  );

/** Every string a view puts on screen. */
function viewText(series: M13Series): string {
  const view = m13sView(series);

  return [
    view.header,
    view.instruction,
    view.hint,
    view.last_action ?? '',
    ...view.console_lines,
    ...view.record_lines,
    view.pending_commit?.question ?? '',
    view.pending_commit?.confirm_label ?? '',
    view.pending_commit?.cancel_label ?? '',
    ...(view.results ?? []).flatMap((block) => [block.label, ...block.lines]),
    ...view.controls.practise.map((control) => control.label),
  ].join('\n');
}

const CORRECTNESS_WORDS =
  /connected|sealed|inline|open branch|test run|test flow/i;

function expectNoCorrectnessInformation(series: M13Series) {
  const view = m13sView(series);

  expect(viewText(series)).not.toMatch(CORRECTNESS_WORDS);
  expect(view.results).toBeNull();
  expect(m13sResults(series)).toBeNull();
  expect(view.controls.practise).toEqual([]);
  expect(view.controls.test_flow).toBe(false);
  expect(view.controls.back_to_results).toBe(false);
  expect(view.controls.finish).toBe(false);
  // The view carries no outcome of any answer — only whether one exists.
  expect(JSON.stringify(view)).not.toMatch(
    /"correct"|"sealed"|endpoint_connected|valve_inline|open_branch|constraints/,
  );
}

test.describe('M13 series model — the first-response phase', () => {
  test('entry snapshot, fixed order, one presentation per network, no network before the previous first response', () => {
    const b = bench('A');

    expect(m13sOpen(b.series, b.tick(), NO_PRIOR)).toBe('opened');
    expect(suffixes(b.series)).toEqual(['series_opened', 'network_presented']);
    expect(b.series.events[0].metadata).toMatchObject({
      opportunity_id: 'proto_m13_network_series',
      entry_state_version: 'm13-networks-v1',
      form_id: 'A',
      phase: 'measurement',
      networks_planned: 3,
      assigned_order: ['n1', 'n2', 'n3'],
      commit: 'explicit_confirmation',
      cannot_solve_available: true,
      feedback: 'after_all_first_responses',
      practice: {
        available_after: 'all_first_responses',
        test_runs_max_per_network: 3,
        same_access_for_every_first_response: true,
      },
      help: 'on_request',
      settle_ms: 400,
    });
    expect(
      (b.series.events[0].metadata.networks as { network_id: string }[]).map(
        (network) => network.network_id,
      ),
    ).toEqual(['n1', 'n2', 'n3']);
    expect(b.series.events[1].metadata).toMatchObject({
      network_id: 'n1',
      network_index: 1,
      trial_id: 'm13_network_n1',
      content_version: 'm13-n1-opposite-v1',
      assigned_position: 1,
      realised_position: 1,
    });

    // NEXT NETWORK does nothing while the open network has no answer.
    expect(m13sNext(b.series, b.tick())).toBe('none');
    expect(count(b.series, 'network_presented')).toBe(1);

    answer(b, 'sealed');
    expect(m13sView(b.series).view).toBe('acknowledgement');
    expect(m13sNext(b.series, b.tick())).toBe('network_presented');
    // A second press presents nothing further.
    expect(m13sNext(b.series, b.tick())).toBe('none');
    answer(b, 'unsealed');
    m13sNext(b.series, b.tick());
    answer(b, 'cannot_solve');

    const presented = b.series.events.filter(
      (event) => event.suffix === 'network_presented',
    );

    expect(presented.map((event) => event.metadata.network_id)).toEqual([
      'n1',
      'n2',
      'n3',
    ]);
    expect(presented.map((event) => event.metadata.realised_position)).toEqual([
      1, 2, 3,
    ]);
    // Every event names the administration, the form and its phase.
    for (const event of b.series.events) {
      expect(event.metadata).toMatchObject({
        opportunity_id: 'proto_m13_network_series',
        entry_state_version: 'm13-networks-v1',
        form_id: 'A',
        measurement_protocol_version: 'station080-m26-pilot-v1',
      });
      expect(['measurement', 'feedback', 'practice', 'closure']).toContain(
        event.metadata.phase,
      );
      expect(M13N_EVENT_SUFFIXES).toContain(event.suffix);
    }
  });

  test('a first response is written once: doubled confirmation, second RECORD LAYOUT, CANNOT SOLVE after a layout and a layout after CANNOT SOLVE create no second one', () => {
    const b = bench('A');

    m13sOpen(b.series, b.tick(), NO_PRIOR);
    seat(b, lay(KEYS.A.n1.sealed));
    m13sRequestCommit(b.series, 'layout', 'typed', b.tick());
    expect(confirmFresh(b)).toBe('recorded');

    const frozen = firstResponses(b.series);

    // Doubled confirmation: no dialog is open any more.
    expect(confirmFresh(b)).toBe('none');
    // A second RECORD LAYOUT and a CANNOT SOLVE on the answered network.
    expect(m13sRequestCommit(b.series, 'layout', 'typed', b.tick())).toBe(
      false,
    );
    expect(m13sRequestCommit(b.series, 'cannot_solve', 'typed', b.tick())).toBe(
      false,
    );
    // The answered board is read-only.
    expect(
      m13sAct(b.series, { kind: 'reset_board' }, 'typed', b.tick()).ok,
    ).toBe(false);
    expect(firstResponses(b.series)).toBe(frozen);
    expect(count(b.series, 'first_response')).toBe(1);
    expect(count(b.series, 'response_acknowledged')).toBe(1);

    // n2: CANNOT SOLVE, then a layout attempt.
    m13sNext(b.series, b.tick());
    m13sRequestCommit(b.series, 'cannot_solve', 'typed', b.tick());
    expect(confirmFresh(b)).toBe('recorded');
    expect(m13sRequestCommit(b.series, 'layout', 'typed', b.tick())).toBe(
      false,
    );
    expect(
      m13sAct(
        b.series,
        { kind: 'pick_bench', piece_id: 'el1' },
        'typed',
        b.tick(),
      ).ok,
    ).toBe(false);
    expect(count(b.series, 'first_response')).toBe(2);

    const record = m13sRecord(b.series);

    expect(record[0].first_response).toMatchObject({
      response_kind: 'layout',
      correct: true,
    });
    expect(record[1].first_response).toMatchObject({
      response_kind: 'cannot_solve',
      correct: false,
    });
    expect(record[2].first_response).toBeNull();
  });

  test('CANNOT SOLVE is an incorrect first response whatever stands on the board; an empty board may be committed', () => {
    const b = completed(['cannot_solve', 'empty', 'sealed']);
    const record = m13sRecord(b.series);

    // n1: a sealed layout stood on the board when CANNOT SOLVE was confirmed.
    expect(record[0].first_response).toMatchObject({
      response_kind: 'cannot_solve',
      correct: false,
      reason: 'cannot_solve',
    });
    expect(
      refCheck(record[0].first_response!.board as Layout, REF.A.n1).sealed,
    ).toBe(true);
    expect(record[1].first_response).toMatchObject({
      response_kind: 'layout',
      correct: false,
      board: {},
    });
    expect(record[2].first_response).toMatchObject({
      response_kind: 'layout',
      correct: true,
      constraints_satisfied: 3,
    });
  });

  test('only a fresh press confirms: carried press, auto-repeat and a press inside 400 ms are refused and recorded; KEEP WORKING leaves no response', () => {
    const b = bench('A');

    m13sOpen(b.series, b.tick(), NO_PRIOR);
    seat(b, lay(KEYS.A.n1.sealed));

    const opened = b.tick();

    expect(m13sRequestCommit(b.series, 'layout', 'typed', opened)).toBe(true);
    // A second request while the dialog is open changes nothing.
    expect(m13sRequestCommit(b.series, 'cannot_solve', 'typed', opened)).toBe(
      false,
    );
    expect(m13sView(b.series).pending_commit).toMatchObject({
      kind: 'layout',
      confirm_label: 'RECORD ANSWER (ENTER)',
      cancel_label: 'KEEP WORKING (ESC)',
    });

    // The press that opened the dialog, still down.
    expect(
      m13sConfirmCommit(
        b.series,
        { repeat: false, down_at_ms: opened },
        'typed',
        opened + 600,
      ),
    ).toBe('refused');
    // A held key repeating — many times, recorded once.
    for (let repeat = 0; repeat < 5; repeat += 1) {
      expect(
        m13sConfirmCommit(
          b.series,
          { repeat: true, down_at_ms: opened + 700 },
          'typed',
          opened + 700 + repeat,
        ),
      ).toBe('refused');
    }

    expect(count(b.series, 'first_response')).toBe(0);

    // Cancel, reopen: a fresh press inside the settle window.
    expect(m13sCancelCommit(b.series, 'typed', b.tick(800))).toBe(true);
    expect(m13sView(b.series).pending_commit).toBeNull();

    const reopened = b.tick();

    m13sRequestCommit(b.series, 'layout', 'pointer', reopened);
    expect(
      m13sConfirmCommit(
        b.series,
        { repeat: false, down_at_ms: reopened + 100 },
        'pointer',
        reopened + 399,
      ),
    ).toBe('refused');
    expect(count(b.series, 'first_response')).toBe(0);

    const refused = b.series.events.filter(
      (event) => event.suffix === 'commit_press_refused',
    );

    expect(refused.map((event) => event.metadata.reason)).toEqual([
      'press_began_before_dialog',
      'held_or_repeated_press',
      'dialog_settling',
    ]);
    expect(count(b.series, 'commit_requested')).toBe(2);
    expect(count(b.series, 'commit_cancelled')).toBe(1);

    // KEEP WORKING leaves the network open and editable, without an answer.
    m13sCancelCommit(b.series, 'pointer', b.tick());
    expect(m13sRecord(b.series)[0].first_response).toBeNull();
    expect(m13sView(b.series).editable).toBe(true);
    expect(m13sView(b.series).view).toBe('network');

    // The same press, made fresh after the window, records.
    m13sRequestCommit(b.series, 'layout', 'pointer', b.tick());
    expect(confirmFresh(b)).toBe('recorded');
    expect(
      b.series.events.find((event) => event.suffix === 'first_response')!
        .metadata,
    ).toMatchObject({ correct: true, refused_presses_before: 0 });
  });

  test('no correctness information and no practice or results in any first-response state; the acknowledgement is identical for every outcome', () => {
    const outcomes: Answer[] = ['sealed', 'unsealed', 'cannot_solve'];
    const acknowledgements: string[] = [];
    const ackEvents: string[] = [];

    for (const first of outcomes) {
      for (const second of outcomes) {
        const b = bench('A');

        m13sOpen(b.series, b.tick(), NO_PRIOR);
        expectNoCorrectnessInformation(b.series);

        // Requests that belong to the second phase are refused and unrecorded.
        const refusals = () => {
          expect(m13sPracticeTest(b.series, 'typed', b.tick()).recorded).toBe(
            false,
          );
          expect(m13sOpenPractice(b.series, 'n1', b.tick())).toBe(false);
          expect(m13sFinish(b.series, b.tick())).toBe(false);
          expect(m13sBackToResults(b.series, b.tick())).toBe(false);
        };

        refusals();
        seat(b, lay(KEYS.A.n1.sealed));
        expectNoCorrectnessInformation(b.series);
        m13sAct(b.series, { kind: 'reset_board' }, 'typed', b.tick());
        answer(b, first);
        expectNoCorrectnessInformation(b.series);
        refusals();

        const view = m13sView(b.series);

        acknowledgements.push(
          JSON.stringify([
            view.header,
            view.console_lines,
            view.instruction,
            view.hint,
            view.controls,
            view.editable,
          ]),
        );

        const ack = b.series.events.find(
          (event) => event.suffix === 'response_acknowledged',
        )!;

        ackEvents.push(
          JSON.stringify({ ...ack.metadata, series_active_ms: 0 }),
        );
        expect(view.console_lines).toEqual([m13AcknowledgementLine(1)]);
        expect(view.controls.next).toBe('next_network');

        m13sNext(b.series, b.tick());
        expectNoCorrectnessInformation(b.series);
        answer(b, second);
        expectNoCorrectnessInformation(b.series);
        refusals();
        m13sHelp(b.series, 'typed', b.tick());
        m13sLeave(b.series, b.tick());
        m13sOpen(b.series, b.tick(), NO_PRIOR);
        expectNoCorrectnessInformation(b.series);

        for (const suffix of [
          'results_shown',
          'practice_opened',
          'practice_test_run',
          'practice_closed',
          'first_responses_completed',
        ]) {
          expect(count(b.series, suffix)).toBe(0);
        }
      }
    }

    // One acknowledgement view and one acknowledgement record for all nine.
    expect(new Set(acknowledgements).size).toBe(1);
    expect(new Set(ackEvents).size).toBe(1);
  });

  test('help is recorded by phase and network, shows rules and controls only, and never changes correctness', () => {
    const b = bench('B');

    m13sOpen(b.series, b.tick(), NO_PRIOR);

    const lines = m13sHelp(b.series, 'typed', b.tick());

    expect(lines).toEqual([...M13N_HELP_FIRST_RESPONSES]);
    m13sHelp(b.series, 'pointer', b.tick());
    answer(b, 'sealed');
    // On the acknowledgement: still the first-response phase, network answered.
    m13sHelp(b.series, 'typed', b.tick());
    m13sNext(b.series, b.tick());
    answer(b, 'sealed');
    m13sNext(b.series, b.tick());
    answer(b, 'sealed');

    const helps = b.series.events.filter(
      (event) => event.suffix === 'help_consulted',
    );

    expect(
      helps.map((event) => [
        event.metadata.phase,
        event.metadata.network_id,
        event.metadata.network_answered,
        event.metadata.input_mode,
      ]),
    ).toEqual([
      ['measurement', 'n1', false, 'typed'],
      ['measurement', 'n1', false, 'pointer'],
      ['measurement', 'n1', true, 'typed'],
    ]);

    const record = m13sRecord(b.series);

    // Two consults before n1's answer; the third came after it.
    expect(
      record.map((entry) => entry.first_response!.help_consults_before),
    ).toEqual([2, 0, 0]);
    expect(record.every((entry) => entry.first_response!.correct)).toBe(true);

    // After the third answer the help sheet is the results-and-practice one.
    expect(m13sHelp(b.series, 'typed', b.tick())).toEqual([
      ...M13N_HELP_RESULTS,
    ]);
    expect(b.series.events.at(-1)!.metadata).toMatchObject({
      phase: 'feedback',
      network_id: null,
    });
  });

  test('leaving and reopening keeps the network, the board and the answers; a held piece goes home; nothing is presented again', () => {
    const b = bench('A');

    m13sOpen(b.series, b.tick(), NO_PRIOR);
    answer(b, 'sealed');
    m13sNext(b.series, b.tick());
    seat(b, lay('A1:el1@180 A2:st1@90'));
    m13sAct(b.series, { kind: 'pick_slot', slot: 'A2' }, 'typed', b.tick());
    expect(m13sView(b.series).held).not.toBeNull();

    const before = firstResponses(b.series);
    const presentedBefore = count(b.series, 'network_presented');

    m13sLeave(b.series, b.tick());
    expect(b.series.events.at(-1)!.suffix).toBe('panel_left');
    expect(m13sOpen(b.series, b.tick(), NO_PRIOR)).toBe('reopened');
    expect(b.series.events.at(-1)!).toMatchObject({
      suffix: 'series_reopened',
      metadata: { network_id: 'n2', phase: 'measurement' },
    });

    const view = m13sView(b.series);

    expect(view.view).toBe('network');
    expect(view.network?.network_id).toBe('n2');
    expect(view.held).toBeNull();
    expect(view.placements).toEqual({
      A1: { piece_id: 'el1', rotation: 180 },
      A2: { piece_id: 'st1', rotation: 90 },
    });
    expect(count(b.series, 'network_presented')).toBe(presentedBefore);
    expect(count(b.series, 'series_opened')).toBe(1);
    expect(firstResponses(b.series)).toBe(before);

    // A dialog left open is dropped without an answer.
    m13sRequestCommit(b.series, 'layout', 'typed', b.tick());
    m13sLeave(b.series, b.tick());
    m13sOpen(b.series, b.tick(), NO_PRIOR);
    expect(m13sView(b.series).pending_commit).toBeNull();
    expect(count(b.series, 'first_response')).toBe(1);
    expect(
      b.series.events.some(
        (event) =>
          event.suffix === 'commit_cancelled' &&
          event.metadata.reason === 'panel_left',
      ),
    ).toBe(true);

    // Leaving on the acknowledgement returns to the acknowledgement.
    m13sRequestCommit(b.series, 'layout', 'typed', b.tick());
    confirmFresh(b);
    m13sLeave(b.series, b.tick());
    m13sOpen(b.series, b.tick(), NO_PRIOR);
    expect(m13sView(b.series).view).toBe('acknowledgement');
    expect(m13sView(b.series).controls.next).toBe('next_network');
    expect(count(b.series, 'first_response')).toBe(2);
  });

  test('STOP TASK, the review and a fault close the first-response phase without results or practice; the reload predicate holds a second administration back', () => {
    // Stopped after one answer.
    const stopped = bench('A');

    m13sOpen(stopped.series, stopped.tick(), NO_PRIOR);
    answer(stopped, 'sealed');
    expect(m13sStop(stopped.series, stopped.tick())).toBe(true);
    expect(stopped.series.status).toBe('stopped');
    expect(stopped.series.events.at(-1)!).toMatchObject({
      suffix: 'series_stopped',
      metadata: {
        phase: 'closure',
        closure_reason: 'voluntary_stop',
        networks_answered: 1,
        first_solutions: 1,
      },
    });

    // Closed at the review with n2 open and unanswered.
    const reviewed = bench('A');

    m13sOpen(reviewed.series, reviewed.tick(), NO_PRIOR);
    answer(reviewed, 'unsealed');
    m13sNext(reviewed.series, reviewed.tick());
    m13sLeave(reviewed.series, reviewed.tick());
    m13sCloseAtReview(reviewed.series, reviewed.tick());
    m13sCloseAtReview(reviewed.series, reviewed.tick());
    expect(reviewed.series.status).toBe('closed_at_review');
    expect(count(reviewed.series, 'series_closed_at_review')).toBe(1);
    expect(reviewed.series.events.at(-1)!.metadata).toMatchObject({
      closure_reason: 'closed_at_review',
      networks_answered: 1,
      first_solutions: 0,
      first_responses: [
        { network_id: 'n1', answered: true, correct: false },
        { network_id: 'n2', answered: false, correct: null },
        { network_id: 'n3', answered: false, correct: null },
      ],
    });

    // A fault in the first-response phase.
    const failed = bench('A');

    m13sOpen(failed.series, failed.tick(), NO_PRIOR);
    answer(failed, 'sealed');
    m13sFail(failed.series, failed.tick(), 'render: boom');
    expect(failed.series.status).toBe('technical_failure');
    expect(failed.series.events.at(-1)!).toMatchObject({
      suffix: 'technical_failure',
      metadata: { phase: 'measurement', detail: 'render: boom' },
    });

    for (const b of [stopped, reviewed, failed]) {
      const events = b.series.events.length;

      // Read-only record: nothing is offered and nothing more is recorded.
      expect(m13sOpen(b.series, b.tick(), NO_PRIOR)).toBe('record');
      expectNoCorrectnessInformation(b.series);

      const view = m13sView(b.series);

      expect(view.view).toBe('record');
      expect(view.controls).toMatchObject({
        record_layout: false,
        cannot_solve: false,
        next: null,
        stop: false,
        help: false,
      });
      expect(m13sRequestCommit(b.series, 'layout', 'typed', b.tick())).toBe(
        false,
      );
      expect(m13sNext(b.series, b.tick())).toBe('none');
      expect(m13sOpenPractice(b.series, 'n1', b.tick())).toBe(false);
      expect(m13sHelp(b.series, 'typed', b.tick())).toEqual([]);
      expect(m13sStop(b.series, b.tick())).toBe(false);
      m13sLeave(b.series, b.tick());
      expect(b.series.events.length).toBe(events);
    }

    expect(m13sView(stopped.series).record_lines).toEqual([
      'Bench stopped. Recorded answers are kept.',
      'Network 1: answer recorded.',
      'Network 2: no answer recorded.',
      'Network 3: no answer recorded.',
    ]);
    expect(m13sView(reviewed.series).record_lines[0]).toBe(
      'Station record closed — the bench keeps its record.',
    );

    // Reload: an earlier load's `series_opened` holds the bench back.
    expect(m13PriorAdministration([])).toBe(false);
    expect(
      m13PriorAdministration([
        { event_type: 'proto_m13_lattice_window_opened' },
        { event_type: 'proto_m13_networks_first_response' },
      ]),
    ).toBe(false);
    expect(
      m13PriorAdministration([
        { event_type: 'proto_m13_networks_series_opened' },
      ]),
    ).toBe(true);

    const held = bench('A');

    expect(
      m13sOpen(held.series, held.tick(), { priorAdministration: true }),
    ).toBe('held_back');
    expect(held.series.events).toHaveLength(1);
    expect(held.series.events[0]).toMatchObject({
      suffix: 'technical_failure',
      metadata: { detail: M13N_RELOAD_DETAIL, phase: 'closure' },
    });
    expect(String(held.series.events[0].metadata.detail)).toMatch(/^reload/);
    expect(m13sOpen(held.series, held.tick(), NO_PRIOR)).toBe('record');
    expect(m13sView(held.series).record_lines).toEqual([
      'This bench was already used in this session. Its record is kept; nothing further is recorded here.',
    ]);
    expect(held.series.events).toHaveLength(1);

    // A bench never opened before the review records nothing afterwards.
    const late = bench('A');

    m13sCloseAtReview(late.series, late.tick());
    expect(m13sOpen(late.series, late.tick(), NO_PRIOR)).toBe('record');
    expect(late.series.events).toEqual([]);
    expect(m13sView(late.series).record_lines).toEqual([
      'Station record closed — the bench keeps its record.',
    ]);
  });
});

test.describe('M13 series model — results and optional practice', () => {
  test('results exist only after the third first response, list the three recorded answers structurally and carry no tally', () => {
    const b = completed(['sealed', 'unsealed', 'cannot_solve']);

    expect(b.series.status).toBe('completed');
    expect(suffixes(b.series).slice(-3)).toEqual([
      'first_response',
      'response_acknowledged',
      'first_responses_completed',
    ]);
    expect(b.series.events.at(-1)!.metadata).toMatchObject({
      phase: 'closure',
      closure_reason: 'completed',
      networks_answered: 3,
      first_solutions: 1,
      realised_order: ['n1', 'n2', 'n3'],
      first_responses: [
        { network_id: 'n1', response_kind: 'layout', correct: true },
        { network_id: 'n2', response_kind: 'layout', correct: false },
        { network_id: 'n3', response_kind: 'cannot_solve', correct: false },
      ],
    });

    // The third acknowledgement is the same neutral line; the control reads
    // SHOW RESULTS; nothing structural is on screen yet.
    const ack = m13sView(b.series);

    expect(ack.view).toBe('acknowledgement');
    expect(ack.console_lines).toEqual(['Answer recorded for network 3.']);
    expect(ack.controls.next).toBe('show_results');
    expect(ack.controls.stop).toBe(false);
    expect(viewText(b.series)).not.toMatch(CORRECTNESS_WORDS);
    expect(count(b.series, 'results_shown')).toBe(0);

    expect(m13sNext(b.series, b.tick())).toBe('results_shown');

    const view = m13sView(b.series);

    expect(view.view).toBe('results');
    expect(view.instruction).toBe('All three answers are recorded.');
    expect(view.results).toEqual([
      {
        network_id: 'n1',
        network_index: 1,
        label: 'Network 1 — recorded answer:',
        lines: [
          'Run: feed → intake CONNECTED.',
          'Isolation valve: inline.',
          'Open branches on the run: 0.',
          'The run is sealed.',
        ],
      },
      {
        network_id: 'n2',
        network_index: 2,
        label: 'Network 2 — recorded answer:',
        lines: [
          'Run: feed → intake CONNECTED.',
          'Isolation valve: inline.',
          'Open branches on the run: 1.',
          'The run is not sealed.',
        ],
      },
      {
        network_id: 'n3',
        network_index: 3,
        label: 'Network 3 — recorded answer: cannot solve.',
        lines: [],
      },
    ]);
    expect(view.record_lines).toEqual([
      'Practice is optional. It changes nothing in your recorded answers and nothing else on the shift.',
    ]);
    // The same practice offer for every network, whatever its first response.
    expect(view.controls.practise.map((control) => control.label)).toEqual([
      'PRACTISE NETWORK 1 (3 test runs left)',
      'PRACTISE NETWORK 2 (3 test runs left)',
      'PRACTISE NETWORK 3 (3 test runs left)',
    ]);
    expect(viewText(b.series)).not.toMatch(
      /\d\s*(of|\/)\s*3 (sealed|correct)|well done|good|wrong|failed/i,
    );
    expect(b.series.events.at(-1)!).toMatchObject({
      suffix: 'results_shown',
      metadata: {
        phase: 'feedback',
        trigger: 'show_results',
        results: [
          {
            network_id: 'n1',
            line_ids: [
              'run_connected',
              'valve_inline',
              'open_branches',
              'run_sealed',
            ],
          },
          {
            network_id: 'n2',
            line_ids: [
              'run_connected',
              'valve_inline',
              'open_branches',
              'run_not_sealed',
            ],
          },
          { network_id: 'n3', line_ids: ['cannot_solve'] },
        ],
      },
    });
  });

  test('practice: the same access and the same cap of three runs after a sealed layout, an unsealed layout and CANNOT SOLVE; first responses never change', () => {
    const b = completed(['sealed', 'unsealed', 'cannot_solve']);
    const frozen = firstResponses(b.series);
    const recordBefore = JSON.stringify(
      m13sRecord(b.series).map((entry) => entry.first_response),
    );

    m13sNext(b.series, b.tick());
    expect(firstResponses(b.series)).toBe(frozen);

    for (const id of NETWORKS) {
      const index = NETWORKS.indexOf(id);
      const answerBoard = m13sRecord(b.series)[index].first_response!.board;

      expect(m13sOpenPractice(b.series, id, b.tick())).toBe(true);
      expect(b.series.events.at(-1)!).toMatchObject({
        suffix: 'practice_opened',
        metadata: {
          phase: 'practice',
          network_id: id,
          first_response_kind: id === 'n3' ? 'cannot_solve' : 'layout',
          runs_used: 0,
          runs_max: 3,
        },
      });

      let view = m13sView(b.series);

      expect(view.header).toBe(`Network ${index + 1} of 3 — practice`);
      // The practice board starts from the board as it stood at the answer.
      expect(view.placements).toEqual(answerBoard);
      expect(view.editable).toBe(true);
      expect(view.controls).toMatchObject({
        test_flow: true,
        back_to_results: true,
        record_layout: false,
        cannot_solve: false,
        stop: false,
      });

      // Rebuild the board into a sealed run, then use the three runs.
      m13sAct(b.series, { kind: 'reset_board' }, 'typed', b.tick());

      const first = m13sPracticeTest(b.series, 'typed', b.tick());

      expect(first).toMatchObject({ recorded: true, run_index: 1 });
      expect(first.lines.at(-1)).toBe(
        'Practice test run 1 of 3. Your recorded answer is unchanged.',
      );
      seat(b, lay(KEYS.A[id].sealed));
      expect(m13sPracticeTest(b.series, 'pointer', b.tick())).toMatchObject({
        recorded: true,
        run_index: 2,
        lines: [
          'Run: feed → intake CONNECTED.',
          'Isolation valve: inline.',
          'Open branches on the run: 0.',
          'Practice test run 2 of 3. Your recorded answer is unchanged.',
        ],
      });
      expect(m13sPracticeTest(b.series, 'typed', b.tick()).run_index).toBe(3);

      // A fourth run is refused and unrecorded; the board is read-only.
      const runsBefore = count(b.series, 'practice_test_run');

      expect(m13sPracticeTest(b.series, 'typed', b.tick())).toEqual({
        recorded: false,
        run_index: null,
        lines: [],
      });
      expect(count(b.series, 'practice_test_run')).toBe(runsBefore);
      view = m13sView(b.series);
      expect(view.editable).toBe(false);
      expect(view.controls.test_flow).toBe(false);
      expect(
        m13sAct(b.series, { kind: 'reset_board' }, 'typed', b.tick()).ok,
      ).toBe(false);

      expect(m13sBackToResults(b.series, b.tick())).toBe(true);
      expect(firstResponses(b.series)).toBe(frozen);
    }

    const runs = b.series.events.filter(
      (event) => event.suffix === 'practice_test_run',
    );

    expect(
      runs.map((event) => [
        event.metadata.network_id,
        event.metadata.run_index,
      ]),
    ).toEqual([
      ['n1', 1],
      ['n1', 2],
      ['n1', 3],
      ['n2', 1],
      ['n2', 2],
      ['n2', 3],
      ['n3', 1],
      ['n3', 2],
      ['n3', 3],
    ]);
    // Sealing a network in practice after an unsealed layout or CANNOT SOLVE
    // leaves every first response as it was recorded.
    expect(m13sRecord(b.series).map((entry) => entry.practice)).toEqual([
      { opened: true, runs_used: 3, sealed_in_practice: true },
      { opened: true, runs_used: 3, sealed_in_practice: true },
      { opened: true, runs_used: 3, sealed_in_practice: true },
    ]);
    expect(
      JSON.stringify(m13sRecord(b.series).map((entry) => entry.first_response)),
    ).toBe(recordBefore);
    expect(
      m13sRecord(b.series).map((entry) => entry.first_response!.correct),
    ).toEqual([true, false, false]);
    expect(
      m13sView(b.series).controls.practise.map((control) => control.label),
    ).toEqual([
      'PRACTISE NETWORK 1 (0 test runs left)',
      'PRACTISE NETWORK 2 (0 test runs left)',
      'PRACTISE NETWORK 3 (0 test runs left)',
    ]);

    // FINISH ends practice; nothing reopens the scored phase.
    expect(m13sFinish(b.series, b.tick())).toBe(true);
    expect(b.series.events.at(-1)!).toMatchObject({
      suffix: 'practice_closed',
      metadata: { reason: 'finished', phase: 'closure' },
    });
    expect(b.series.status).toBe('completed');
    expect(firstResponses(b.series)).toBe(frozen);
    expect(count(b.series, 'first_response')).toBe(3);
    expect(count(b.series, 'first_responses_completed')).toBe(1);

    const closed = m13sView(b.series);

    expect(closed.record_lines).toEqual([
      'All three networks are recorded. The bench is closed.',
    ]);
    expect(closed.controls.practise).toEqual([]);
    expect(closed.controls.finish).toBe(false);
    expect(closed.results).toHaveLength(3);

    const events = b.series.events.length;

    expect(m13sOpenPractice(b.series, 'n1', b.tick())).toBe(false);
    expect(m13sFinish(b.series, b.tick())).toBe(false);
    expect(m13sOpen(b.series, b.tick(), NO_PRIOR)).toBe('record');
    expect(m13sRequestCommit(b.series, 'layout', 'typed', b.tick())).toBe(
      false,
    );
    expect(b.series.events.length).toBe(events);
  });

  test('leaving and reopening in practice preserves the view, the board and the runs used; a used run is never restored', () => {
    const b = completed(['cannot_solve', 'sealed', 'sealed']);

    m13sNext(b.series, b.tick());
    m13sOpenPractice(b.series, 'n1', b.tick());
    m13sAct(b.series, { kind: 'return_slot', slot: 'C2' }, 'typed', b.tick());
    m13sPracticeTest(b.series, 'typed', b.tick());

    const board = m13sView(b.series).placements;
    const frozen = firstResponses(b.series);

    m13sLeave(b.series, b.tick());
    expect(m13sOpen(b.series, b.tick(), NO_PRIOR)).toBe('reopened');

    const view = m13sView(b.series);

    expect(view.view).toBe('practice');
    expect(view.network?.network_id).toBe('n1');
    expect(view.placements).toEqual(board);
    expect(view.practice_runs).toEqual([
      { network_id: 'n1', runs_used: 1 },
      { network_id: 'n2', runs_used: 0 },
      { network_id: 'n3', runs_used: 0 },
    ]);
    expect(m13sPracticeTest(b.series, 'typed', b.tick()).run_index).toBe(2);

    // Leaving on the results view shows the results again on return.
    m13sBackToResults(b.series, b.tick());
    m13sLeave(b.series, b.tick());
    m13sOpen(b.series, b.tick(), NO_PRIOR);
    expect(m13sView(b.series).view).toBe('results');
    expect(b.series.events.at(-1)!).toMatchObject({
      suffix: 'results_shown',
      metadata: { trigger: 'reopened' },
    });
    expect(
      m13sView(b.series).controls.practise.map((control) => control.runs_left),
    ).toEqual([1, 3, 3]);

    // Reopening the practice board keeps its pieces and its used runs.
    m13sOpenPractice(b.series, 'n1', b.tick());
    expect(m13sView(b.series).placements).toEqual(board);
    expect(b.series.events.at(-1)!.metadata).toMatchObject({ runs_used: 2 });
    expect(firstResponses(b.series)).toBe(frozen);
    expect(count(b.series, 'network_presented')).toBe(3);
    expect(m13sSubmissionCount(b.series)).toBe(5);
  });

  test('the review and a fault during practice end practice only; the completed first-response result stands', () => {
    // Review while a practice board is open.
    const reviewed = completed(['sealed', 'sealed', 'unsealed']);

    m13sNext(reviewed.series, reviewed.tick());
    m13sOpenPractice(reviewed.series, 'n3', reviewed.tick());
    m13sPracticeTest(reviewed.series, 'typed', reviewed.tick());

    const frozen = firstResponses(reviewed.series);

    m13sCloseAtReview(reviewed.series, reviewed.tick());
    m13sCloseAtReview(reviewed.series, reviewed.tick());
    expect(reviewed.series.status).toBe('completed');
    expect(count(reviewed.series, 'series_closed_at_review')).toBe(0);
    expect(count(reviewed.series, 'practice_closed')).toBe(1);
    expect(reviewed.series.events.at(-1)!).toMatchObject({
      suffix: 'practice_closed',
      metadata: {
        reason: 'review',
        practice_runs: [
          { network_id: 'n1', opened: false, runs_used: 0 },
          { network_id: 'n2', opened: false, runs_used: 0 },
          { network_id: 'n3', opened: true, runs_used: 1 },
        ],
      },
    });
    expect(firstResponses(reviewed.series)).toBe(frozen);

    // Afterwards the bench records nothing; the results stay readable.
    const events = reviewed.series.events.length;

    expect(m13sOpen(reviewed.series, reviewed.tick(), NO_PRIOR)).toBe('record');

    const view = m13sView(reviewed.series);

    expect(view.view).toBe('results');
    expect(view.results).toHaveLength(3);
    expect(view.record_lines).toEqual([
      'Station record closed — the bench keeps its record.',
    ]);
    expect(view.controls.practise).toEqual([]);
    expect(view.controls.help).toBe(false);
    expect(m13sOpenPractice(reviewed.series, 'n1', reviewed.tick())).toBe(
      false,
    );
    expect(
      m13sPracticeTest(reviewed.series, 'typed', reviewed.tick()).recorded,
    ).toBe(false);
    expect(m13sHelp(reviewed.series, 'typed', reviewed.tick())).toEqual([]);
    expect(reviewed.series.events.length).toBe(events);

    // The review on a completed series that never opened its results.
    const quiet = completed(['sealed', 'cannot_solve', 'sealed']);

    m13sLeave(quiet.series, quiet.tick());
    m13sCloseAtReview(quiet.series, quiet.tick());
    expect(quiet.series.status).toBe('completed');
    expect(quiet.series.events.at(-1)!.metadata).toMatchObject({
      reason: 'review',
      results_view_reached: false,
    });

    // A fault during practice.
    const failed = completed(['sealed', 'sealed', 'cannot_solve']);

    m13sNext(failed.series, failed.tick());
    m13sOpenPractice(failed.series, 'n3', failed.tick());

    const before = firstResponses(failed.series);

    m13sFail(failed.series, failed.tick(), 'practice render');
    expect(failed.series.status).toBe('completed');
    expect(suffixes(failed.series).slice(-2)).toEqual([
      'technical_failure',
      'practice_closed',
    ]);
    expect(failed.series.events.at(-2)!.metadata).toMatchObject({
      phase: 'practice',
      detail: 'practice render',
    });
    expect(failed.series.events.at(-1)!.metadata).toMatchObject({
      reason: 'technical_failure',
    });
    expect(firstResponses(failed.series)).toBe(before);
    expect(m13sView(failed.series).results).toHaveLength(3);
  });
});

test.describe('M13 wording', () => {
  const FORBIDDEN =
    /proto_|\bM\d\d\b|\bQ\d\d\b|score|trait|puzzle|persist|grit|skill|ability|intelligen/i;

  test('no participant-facing string carries a forbidden token; the fixed lines are present', () => {
    const strings = m13ParticipantStrings();
    const all = [
      ...strings.first_responses,
      ...strings.results_and_practice,
      ...strings.records,
    ];

    expect(all.length).toBeGreaterThan(80);

    for (const value of all) {
      expect(value, value).not.toMatch(FORBIDDEN);
    }

    expect(M13N_TEXT.status_line).toBe(
      'Seat the pieces, then RECORD LAYOUT. One answer per network. Results for all three follow the third answer.',
    );
    expect(strings.first_responses).toContain(
      'Record this layout as your answer for network 2? It cannot be changed afterwards. Results are shown after all three networks.',
    );
    expect(strings.first_responses).toContain(
      'Record CANNOT SOLVE as your answer for network 3? It cannot be changed afterwards.',
    );
    expect(strings.first_responses).toContain('Answer recorded for network 1.');
    expect(strings.first_responses).toContain('RECORD ANSWER (ENTER)');
    expect(strings.first_responses).toContain('KEEP WORKING (ESC)');
    expect(strings.first_responses).toContain(
      'Stop the bench? Networks without a recorded answer stay unanswered, and no results are shown.',
    );
    expect(strings.results_and_practice).toContain(
      'Practice is optional. It changes nothing in your recorded answers and nothing else on the shift.',
    );
    expect(strings.results_and_practice).toContain(
      'Practice test run 2 of 3. Your recorded answer is unchanged.',
    );
    expect(strings.results_and_practice).toContain(
      'All three networks are recorded. The bench is closed.',
    );
    expect(M13N_PRACTICE_RUNS_MAX).toBe(3);
    expect(M13N_SETTLE_MS).toBe(400);
  });

  test('no first-response string and no closed-record string contains a structural result word', () => {
    const strings = m13ParticipantStrings();

    for (const value of [...strings.first_responses, ...strings.records]) {
      expect(value, value).not.toMatch(
        /connected|sealed|inline|open branch|test flow|test run/i,
      );
    }

    // CANNOT SOLVE is distinct from STOP TASK in wording.
    expect(M13N_TEXT.cannot_solve).not.toMatch(/stop/i);
    expect(M13N_TEXT.stop_task).not.toMatch(/solve|answer/i);
  });
});

/* ------------------------------------------------------------------ *
 * The extractor on synthetic logs
 * ------------------------------------------------------------------ */

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };

/** The series' events as the logger would number them (with gaps). */
function rawLog(
  events: readonly M13SeriesEvent[],
  pageLoadIndex = 1,
): RawGameEvent[] {
  return events.map((event, index) => ({
    session_id: 's',
    timestamp_ms: 1_000 + index,
    scene: 'information_processing_lab',
    object_id: 'ip_lattice_bench',
    event_type: `${M13N_FAMILY_PREFIX}${event.suffix}`,
    sequence: 40 + index * 3,
    page_load_index: pageLoadIndex,
    metadata: structuredClone(event.metadata),
  }));
}

function feature(events: readonly RawGameEvent[], context = CONTEXT) {
  return extractItemFeatures('M13', events, context)[0];
}

/** A deep copy of a log with an edit applied. */
function edited(
  events: readonly RawGameEvent[],
  edit: (copy: RawGameEvent[]) => RawGameEvent[] | void,
): RawGameEvent[] {
  const copy = structuredClone(events) as RawGameEvent[];

  return edit(copy) ?? copy;
}

const indexOf = (events: RawGameEvent[], suffix: string, nth = 0) =>
  events
    .map((event, index) => [event, index] as const)
    .filter(([event]) => event.event_type === `${M13N_FAMILY_PREFIX}${suffix}`)[
    nth
  ][1];

/** Renumbers a log in its array order (after an edit that moved events). */
function renumbered(events: RawGameEvent[]): RawGameEvent[] {
  events.forEach((event, index) => {
    event.sequence = 40 + index * 3;
  });

  return events;
}

test.describe('M13 extractor — values and the stability of the completed result', () => {
  test('3 / 3, 0 / 3 and a mixed series with CANNOT SOLVE are observed values over a denominator of three', () => {
    const cases: [[Answer, Answer, Answer], number][] = [
      [['sealed', 'sealed', 'sealed'], 3],
      [['unsealed', 'cannot_solve', 'empty'], 0],
      [['sealed', 'unsealed', 'cannot_solve'], 1],
      [['cannot_solve', 'sealed', 'sealed'], 2],
    ];

    for (const form of FORMS) {
      for (const [answers, value] of cases) {
        const row = feature(rawLog(completed(answers, form).series.events));

        expect(row).toMatchObject({
          item_id: 'M13',
          feature_id: 'm13_first_solutions',
          role: 'primary',
          disposition: 'observed',
          value,
          numerator: value,
          denominator: 3,
          planned_denominator: 3,
          closure_reason: 'completed',
          censored: false,
          censor_reason: null,
          missing_reason: null,
          included_ids: ['m13_network_n1', 'm13_network_n2', 'm13_network_n3'],
          independence: 'repeated_within_episode',
          coverage_label: 'performance_counterpart',
        });
        expect(row.components).toMatchObject({
          administration_version: 'm13-networks-v1',
          form_id: form,
          assigned_order: ['n1', 'n2', 'n3'],
          realised_order: ['n1', 'n2', 'n3'],
          observations_share_one_episode: true,
          first_response_phase_complete: true,
          practice_record_consistent: true,
        });
      }
    }

    // The companions sit beside the value, per network.
    const b = completed(['sealed', 'unsealed', 'cannot_solve']);
    const row = feature(rawLog(b.series.events));
    const networks = (row.components as { networks: Record<string, unknown>[] })
      .networks;

    expect(networks[0]).toMatchObject({
      network_id: 'n1',
      network_index: 1,
      content_version: 'm13-n1-opposite-v1',
      first_response: {
        response_kind: 'layout',
        sealed: true,
        endpoint_connected: true,
        valve_inline: true,
        open_branch_count: 0,
        constraints_satisfied: 3,
        input_mode: 'typed',
        help_consults_before: 0,
      },
      practice: { opened: false, runs_used: 0, sealed_in_practice: false },
    });
    expect(networks[1]).toMatchObject({
      first_response: {
        response_kind: 'layout',
        sealed: false,
        endpoint_connected: true,
        valve_inline: true,
        open_branch_count: 1,
        constraints_satisfied: 2,
      },
    });
    expect(networks[2]).toMatchObject({
      first_response: {
        response_kind: 'cannot_solve',
        sealed: false,
        endpoint_connected: null,
        valve_inline: null,
        open_branch_count: null,
        constraints_satisfied: null,
      },
    });
  });

  test('the completed result is the same observed row with no results opened, results opened, practice open, in progress, sealed later, finished, ended by the review and after a fault during practice', () => {
    const stages: Record<string, RawGameEvent[]> = {};
    const b = completed(['sealed', 'unsealed', 'cannot_solve']);
    const snap = (name: string) => {
      stages[name] = rawLog(b.series.events);
    };

    snap('no results opened');
    m13sHelp(b.series, 'typed', b.tick());
    m13sNext(b.series, b.tick());
    snap('results opened');
    m13sOpenPractice(b.series, 'n3', b.tick());
    snap('practice open');
    m13sAct(b.series, { kind: 'reset_board' }, 'typed', b.tick());
    m13sPracticeTest(b.series, 'typed', b.tick());
    snap('practice in progress');
    seat(b, lay(KEYS.A.n3.sealed));
    m13sPracticeTest(b.series, 'typed', b.tick());
    snap('practice sealed later');
    m13sLeave(b.series, b.tick());
    snap('left during practice');
    m13sOpen(b.series, b.tick(), NO_PRIOR);
    m13sBackToResults(b.series, b.tick());
    m13sOpenPractice(b.series, 'n2', b.tick());
    m13sPracticeTest(b.series, 'typed', b.tick());
    m13sBackToResults(b.series, b.tick());

    const beforeEnd = structuredClone(b.series);

    m13sFinish(b.series, b.tick());
    snap('practice finished');

    const reviewed = structuredClone(beforeEnd);

    m13sCloseAtReview(reviewed, b.tick());
    stages['practice ended by the review'] = rawLog(reviewed.events);

    const failed = structuredClone(beforeEnd);

    m13sFail(failed, b.tick(), 'practice render');
    stages['fault during practice'] = rawLog(failed.events);

    const core = (row: ReturnType<typeof feature>) => ({
      value: row.value,
      numerator: row.numerator,
      denominator: row.denominator,
      disposition: row.disposition,
      closure_reason: row.closure_reason,
      censored: row.censored,
      censor_reason: row.censor_reason,
      missing_reason: row.missing_reason,
      included_ids: row.included_ids,
      first: (
        row.components as { networks: { first_response: unknown }[] }
      ).networks.map((network) => network.first_response),
    });
    const reference = core(feature(stages['no results opened']));

    expect(reference).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 3,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });

    for (const [name, log] of Object.entries(stages)) {
      for (const context of [CONTEXT, OPEN_CONTEXT]) {
        const row = feature(log, context);

        expect(core(row), name).toEqual(reference);
        expect(row.disposition, name).not.toBe('pending');
        expect(
          (row.components as { practice_record_consistent: boolean })
            .practice_record_consistent,
          name,
        ).toBe(true);
      }
    }

    // Practice is described beside the value, never inside it.
    const final = feature(stages['practice finished']).components as {
      networks: { practice: Record<string, unknown> }[];
      practice_closure: string;
      help_consults: Record<string, number>;
    };

    expect(final.networks.map((network) => network.practice)).toEqual([
      { opened: false, runs_used: 0, sealed_in_practice: false },
      { opened: true, runs_used: 1, sealed_in_practice: false },
      { opened: true, runs_used: 2, sealed_in_practice: true },
    ]);
    expect(final.practice_closure).toBe('finished');
    expect(final.help_consults).toEqual({
      measurement: 0,
      feedback: 1,
      practice: 0,
    });
    expect(
      (
        feature(stages['practice ended by the review']).components as {
          practice_closure: string;
        }
      ).practice_closure,
    ).toBe('review');
    expect(
      (
        feature(stages['fault during practice']).components as {
          practice_closure: string;
        }
      ).practice_closure,
    ).toBe('technical_failure');
  });

  test('a defect confined to the practice records flags the components and leaves the row unchanged', () => {
    const b = completed(['sealed', 'sealed', 'unsealed']);

    m13sNext(b.series, b.tick());
    m13sOpenPractice(b.series, 'n3', b.tick());
    m13sPracticeTest(b.series, 'typed', b.tick());

    const log = rawLog(b.series.events);
    const sound = feature(log);
    const run = log[indexOf(log, 'practice_test_run')];
    const defects: Record<string, RawGameEvent[]> = {
      'a fourth run on one network': renumbered([
        ...log,
        ...[2, 3, 4].map((runIndex) => ({
          ...structuredClone(run),
          metadata: { ...run.metadata, run_index: runIndex },
        })),
      ]),
      'a run on a network whose practice was never opened': renumbered([
        ...log,
        {
          ...structuredClone(run),
          metadata: { ...run.metadata, network_id: 'n1', run_index: 1 },
        },
      ]),
      'a run that names no network': renumbered([
        ...log,
        {
          ...structuredClone(run),
          metadata: { ...run.metadata, network_id: 'n9' },
        },
      ]),
    };

    for (const [name, defective] of Object.entries(defects)) {
      const row = feature(defective);

      expect(row, name).toMatchObject({
        value: sound.value,
        numerator: 2,
        denominator: 3,
        disposition: 'observed',
        closure_reason: 'completed',
        censored: false,
      });
      expect(
        (row.components as { practice_record_consistent: boolean })
          .practice_record_consistent,
        name,
      ).toBe(false);
    }
  });
});

test.describe('M13 extractor — legitimate missingness', () => {
  test('one and two answers: incomplete with the value and its denominator when stopped or closed at the review; pending while still open', () => {
    for (const answeredCount of [1, 2]) {
      const build = () => {
        const b = bench('A');

        m13sOpen(b.series, b.tick(), NO_PRIOR);
        answer(b, 'sealed');

        if (answeredCount === 2) {
          m13sNext(b.series, b.tick());
          answer(b, 'cannot_solve');
        }

        m13sNext(b.series, b.tick());
        seat(b, lay('A1:el1@180'));

        return b;
      };
      const included = ['m13_network_n1', 'm13_network_n2'].slice(
        0,
        answeredCount,
      );

      // Still open: pending, the answers so far in the components.
      const open = build();
      const pending = feature(rawLog(open.series.events), OPEN_CONTEXT);

      expect(pending).toMatchObject({
        value: null,
        disposition: 'pending',
        numerator: null,
        denominator: null,
        closure_reason: null,
        included_ids: included,
      });
      expect(pending.components).toMatchObject({
        networks_answered: answeredCount,
        first_response_phase_complete: false,
      });

      // Stopped.
      const stopped = build();

      m13sStop(stopped.series, stopped.tick());
      expect(feature(rawLog(stopped.series.events))).toMatchObject({
        value: 1,
        numerator: 1,
        denominator: answeredCount,
        planned_denominator: 3,
        disposition: 'incomplete',
        censored: true,
        closure_reason: 'voluntary_stop',
        included_ids: included,
      });

      // Closed at the review.
      const reviewed = build();

      m13sLeave(reviewed.series, reviewed.tick());
      m13sCloseAtReview(reviewed.series, reviewed.tick());

      const row = feature(rawLog(reviewed.series.events));

      expect(row).toMatchObject({
        value: 1,
        numerator: 1,
        denominator: answeredCount,
        disposition: 'incomplete',
        censored: true,
        closure_reason: 'closed_at_review',
        included_ids: included,
      });
      // The unanswered networks are missing, never incorrect.
      expect(
        (row.components as { networks: { first_response: unknown }[] }).networks
          .slice(answeredCount)
          .every((network) => network.first_response === null),
      ).toBe(true);
    }
  });

  test('zero eligible evidence: never opened, never opened after a reload, opened and stopped, opened and closed at the review, still open, held back, and a fault in the first-response phase are distinct', () => {
    expect(feature([])).toMatchObject({
      value: null,
      disposition: 'not_presented',
      numerator: null,
      denominator: null,
    });
    expect(feature([], { ...CONTEXT, reloaded: true })).toMatchObject({
      value: null,
      disposition: 'interrupted',
    });

    const opened = () => {
      const b = bench('A');

      m13sOpen(b.series, b.tick(), NO_PRIOR);
      seat(b, lay('A2:el1@270'));
      m13sHelp(b.series, 'typed', b.tick());

      return b;
    };
    const stopped = opened();

    m13sStop(stopped.series, stopped.tick());
    expect(feature(rawLog(stopped.series.events))).toMatchObject({
      value: null,
      disposition: 'voluntary_stop',
      denominator: 0,
      numerator: null,
      closure_reason: 'voluntary_stop',
      censored: false,
    });

    const reviewed = opened();

    m13sCloseAtReview(reviewed.series, reviewed.tick());
    expect(feature(rawLog(reviewed.series.events))).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
      denominator: 0,
      closure_reason: 'closed_at_review',
      censored: true,
    });

    const open = opened();

    expect(feature(rawLog(open.series.events), OPEN_CONTEXT)).toMatchObject({
      value: null,
      disposition: 'pending',
    });

    const held = bench('A');

    m13sOpen(held.series, held.tick(), { priorAdministration: true });
    expect(
      feature(rawLog(held.series.events, 2), {
        finalCoreClosed: false,
        pageLoadIndex: 2,
        reloaded: true,
      }),
    ).toMatchObject({ value: null, disposition: 'interrupted' });

    const failed = opened();

    m13sFail(failed.series, failed.tick(), 'render: boom');
    expect(feature(rawLog(failed.series.events))).toMatchObject({
      value: null,
      disposition: 'technical_failure',
      closure_reason: 'technical_failure',
    });

    // A fault while the bench was opening (no series opening at all) is a
    // technical failure too — it is not a never-opened bench.
    const unopened = bench('A');

    m13sFail(unopened.series, unopened.tick(), 'open: boom');
    expect(suffixes(unopened.series)).toEqual(['technical_failure']);
    expect(feature(rawLog(unopened.series.events))).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });

    // Only the hold-back record is read as a hold-back: a fault whose
    // detail merely begins with "reload" stays a technical failure.
    const lookalike = opened();

    m13sFail(lookalike.series, lookalike.tick(), 'reload of the texture set');
    expect(
      feature(rawLog(lookalike.series.events), {
        finalCoreClosed: false,
        pageLoadIndex: 1,
        reloaded: true,
      }),
    ).toMatchObject({ value: null, disposition: 'technical_failure' });

    // A first-response phase without any closure record is still open —
    // `pending` — also in an export taken after the record closure.
    expect(feature(rawLog(open.series.events), CONTEXT)).toMatchObject({
      value: null,
      disposition: 'pending',
      closure_reason: null,
    });

    const openAnswered = bench('A');

    m13sOpen(openAnswered.series, openAnswered.tick(), NO_PRIOR);
    answer(openAnswered, 'sealed');
    expect(feature(rawLog(openAnswered.series.events), CONTEXT)).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'pending',
    });

    // A fault after one answer: no value; the answer stays in the components.
    const late = bench('A');

    m13sOpen(late.series, late.tick(), NO_PRIOR);
    answer(late, 'sealed');
    m13sFail(late.series, late.tick(), 'render: boom');

    const row = feature(rawLog(late.series.events));

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'technical_failure',
    });
    expect(row.components).toMatchObject({
      networks_answered: 1,
      first_response_phase_closure: 'technical_failure',
    });
    expect(
      (
        row.components as { networks: { first_response: unknown }[] }
      ).networks.map((network) => network.first_response),
    ).toMatchObject([{ response_kind: 'layout', sealed: true }, null, null]);
  });

  test('every legitimate-missingness case is NOT a technical failure', () => {
    const logs: Record<string, [RawGameEvent[], typeof CONTEXT]> = {
      'never opened': [[], CONTEXT],
    };
    const add = (
      name: string,
      steps: (b: Bench) => void,
      context = CONTEXT,
    ) => {
      const b = bench('B');

      m13sOpen(b.series, b.tick(), NO_PRIOR);
      steps(b);
      logs[name] = [rawLog(b.series.events), context];
    };

    add('opened without answers, still open', () => undefined, OPEN_CONTEXT);
    add('opened without answers, stopped', (b) => {
      m13sStop(b.series, b.tick());
    });
    add('opened without answers, closed at the review', (b) => {
      m13sCloseAtReview(b.series, b.tick());
    });
    add(
      'partly answered, still open',
      (b) => {
        answer(b, 'unsealed');
      },
      OPEN_CONTEXT,
    );
    add('partly answered, stopped on the acknowledgement', (b) => {
      answer(b, 'cannot_solve');
      m13sStop(b.series, b.tick());
    });
    add('partly answered, closed at the review', (b) => {
      answer(b, 'sealed');
      m13sNext(b.series, b.tick());
      answer(b, 'sealed');
      m13sCloseAtReview(b.series, b.tick());
    });
    add('complete without help, results or practice', (b) => {
      answer(b, 'sealed');
      m13sNext(b.series, b.tick());
      answer(b, 'sealed');
      m13sNext(b.series, b.tick());
      answer(b, 'sealed');
    });
    add('complete, results without practice', (b) => {
      answer(b, 'empty');
      m13sNext(b.series, b.tick());
      answer(b, 'empty');
      m13sNext(b.series, b.tick());
      answer(b, 'empty');
      m13sNext(b.series, b.tick());
      m13sFinish(b.series, b.tick());
    });
    add('cancelled confirmations and refused presses', (b) => {
      const opened = b.tick();

      m13sRequestCommit(b.series, 'cannot_solve', 'typed', opened);
      m13sConfirmCommit(
        b.series,
        { repeat: true, down_at_ms: opened },
        'typed',
        opened + 10,
      );
      m13sCancelCommit(b.series, 'typed', b.tick());
      m13sStop(b.series, b.tick());
    });

    for (const [name, [log, context]] of Object.entries(logs)) {
      expect(feature(log, context).disposition, name).not.toBe(
        'technical_failure',
      );
    }
  });

  test('reload: the new load is interrupted, with the earlier load untouched — also after a completed scored phase', () => {
    const earlier = completed(['sealed', 'sealed', 'cannot_solve']);
    const prior = rawLog(earlier.series.events, 1);
    const priorCopy = JSON.stringify(prior);
    const reloadContext = {
      finalCoreClosed: false,
      pageLoadIndex: 2,
      reloaded: true,
    };

    // Read in its own load the earlier record is the observed 2 / 3.
    expect(feature(prior, CONTEXT)).toMatchObject({
      value: 2,
      disposition: 'observed',
    });
    // The bench is not opened again in the new load.
    expect(feature(prior, reloadContext)).toMatchObject({
      value: null,
      disposition: 'interrupted',
    });

    // The bench is opened again: held back, never re-run.
    const held = bench('A');

    expect(m13PriorAdministration(prior)).toBe(true);
    m13sOpen(held.series, held.tick(), {
      priorAdministration: m13PriorAdministration(prior),
    });

    const second = rawLog(held.series.events, 2).map((event, index) => ({
      ...event,
      sequence: 500 + index,
    }));
    const row = feature([...prior, ...second], reloadContext);

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'interrupted',
    });
    expect(second.map((event) => event.event_type)).toEqual([
      'proto_m13_networks_technical_failure',
    ]);
    // The existing convention, asserted and not altered: the earlier load's
    // events are unchanged and are not carried into the new load's row.
    expect(JSON.stringify(prior)).toBe(priorCopy);
  });
});

test.describe('M13 extractor — contradictory or unverifiable scored evidence', () => {
  test('every integrity defect is a technical failure, never a value', () => {
    const b = completed(['sealed', 'unsealed', 'cannot_solve']);

    m13sNext(b.series, b.tick());
    m13sOpenPractice(b.series, 'n2', b.tick());
    m13sPracticeTest(b.series, 'typed', b.tick());

    const log = rawLog(b.series.events);

    expect(feature(log)).toMatchObject({ value: 1, disposition: 'observed' });

    const response = (nth: number) => indexOf(log, 'first_response', nth);
    const presented = (nth: number) => indexOf(log, 'network_presented', nth);
    const completion = indexOf(log, 'first_responses_completed');
    const setMeta =
      (index: number, key: string, value: unknown) =>
      (copy: RawGameEvent[]) => {
        copy[index].metadata = { ...copy[index].metadata, [key]: value };
      };
    const move = (from: number, to: number) => (copy: RawGameEvent[]) => {
      const [event] = copy.splice(from, 1);

      copy.splice(to, 0, event);

      return renumbered(copy);
    };
    const broken: Record<string, RawGameEvent[]> = {
      'duplicate first response': edited(log, (copy) => {
        copy.splice(response(0) + 1, 0, structuredClone(copy[response(0)]));

        return renumbered(copy);
      }),
      'unknown administration version': edited(
        log,
        setMeta(4, 'entry_state_version', 'm13-networks-v2'),
      ),
      'the v2 administration version on one event': edited(
        log,
        setMeta(response(1), 'entry_state_version', 'm13-lattice-v1'),
      ),
      'another opportunity id': edited(
        log,
        setMeta(
          response(1),
          'opportunity_id',
          'proto_m13_lattice_construction',
        ),
      ),
      'the form changes inside the series': edited(
        log,
        setMeta(response(2), 'form_id', 'B'),
      ),
      'an unknown form': edited(log, (copy) => {
        for (const event of copy) {
          event.metadata = { ...event.metadata, form_id: 'C' };
        }
      }),
      'unknown network on a first response': edited(
        log,
        setMeta(response(0), 'network_id', 'n4'),
      ),
      'content version of another network': edited(
        log,
        setMeta(response(1), 'content_version', 'm13-n1-opposite-v1'),
      ),
      'content version on a presentation': edited(
        log,
        setMeta(presented(2), 'content_version', 'm13-n3-same-side-v0'),
      ),
      'a network presented out of the assigned order': edited(log, (copy) => {
        copy[presented(1)].metadata = {
          ...copy[presented(1)].metadata,
          network_id: 'n3',
          content_version: 'm13-n3-same-side-v1',
        };
      }),
      'a network presented twice': edited(log, (copy) => {
        copy.splice(presented(0) + 1, 0, structuredClone(copy[presented(0)]));

        return renumbered(copy);
      }),
      'a network presented before the previous first response': edited(
        log,
        move(presented(1), response(0)),
      ),
      'a first response without its presentation': edited(log, (copy) => {
        copy.splice(presented(2), 1);
      }),
      'a first response before its presentation': edited(
        log,
        move(response(1), presented(1)),
      ),
      'a correct flag contradicting the recorded board (unsealed marked correct)':
        edited(log, setMeta(response(1), 'correct', true)),
      'a correct flag contradicting the recorded board (sealed marked incorrect)':
        edited(log, setMeta(response(0), 'correct', false)),
      'CANNOT SOLVE marked correct': edited(
        log,
        setMeta(response(2), 'correct', true),
      ),
      'a layout response without a board': edited(log, (copy) => {
        const rest = { ...copy[response(0)].metadata };

        delete rest.board;
        copy[response(0)].metadata = rest;
      }),
      'a layout response with a malformed board': edited(
        log,
        setMeta(response(0), 'board', {
          A2: { piece_id: 'el9', rotation: 45 },
        }),
      ),
      'a layout response with a piece on the fractured mount': edited(
        log,
        setMeta(response(0), 'board', {
          ...(log[response(0)].metadata!.board as object),
          B2: { piece_id: 'cap1', rotation: 0 },
        }),
      ),
      'a non-boolean correct flag': edited(
        log,
        setMeta(response(0), 'correct', 'true'),
      ),
      'a missing correct flag': edited(
        log,
        setMeta(response(0), 'correct', undefined),
      ),
      'an unknown response kind': edited(
        log,
        setMeta(response(0), 'response_kind', 'skipped'),
      ),
      'a first response outside the first-response phase': edited(
        log,
        setMeta(response(1), 'phase', 'practice'),
      ),
      'a first response after the completion snapshot': edited(
        log,
        move(response(2), completion),
      ),
      'three first responses without the completion snapshot': edited(
        log,
        (copy) => copy.slice(0, completion),
      ),
      'the completion snapshot with fewer than three first responses': edited(
        log,
        (copy) => {
          const snapshot = copy[completion];

          return renumbered([
            ...copy.slice(0, response(1) + 1),
            snapshot,
            ...copy.slice(response(1) + 1, completion),
            ...copy.slice(completion + 1),
          ]);
        },
      ),
      'a completion snapshot that disagrees on the count': edited(
        log,
        setMeta(completion, 'first_solutions', 2),
      ),
      'a completion snapshot that disagrees on one network': edited(
        log,
        (copy) => {
          const entries = structuredClone(
            copy[completion].metadata!.first_responses,
          ) as { correct: boolean }[];

          entries[1].correct = true;
          entries[0].correct = false;
          copy[completion].metadata = {
            ...copy[completion].metadata,
            first_responses: entries,
          };
        },
      ),
      'results shown before the third first response': edited(
        log,
        move(indexOf(log, 'results_shown'), response(2)),
      ),
      'practice opened before the third first response': edited(
        log,
        move(indexOf(log, 'practice_opened'), response(1) + 1),
      ),
      'a practice test run before the third first response': edited(
        log,
        move(indexOf(log, 'practice_test_run'), response(0) + 1),
      ),
      'a practice test run between the third response and its snapshot': edited(
        log,
        move(indexOf(log, 'practice_test_run'), completion),
      ),
      'a second series opening': edited(log, (copy) => {
        copy.splice(5, 0, structuredClone(copy[0]));

        return renumbered(copy);
      }),
      'series events without the series opening': edited(log, (copy) =>
        copy.slice(1),
      ),
      'a network index that does not match its network': edited(
        log,
        setMeta(response(1), 'network_index', 3),
      ),
      'a trial id that does not match its network': edited(
        log,
        setMeta(presented(0), 'trial_id', 'm13_network_n2'),
      ),
      'a stop after the completed scored phase': edited(log, (copy) => {
        copy.push({
          ...structuredClone(copy[completion]),
          event_type: `${M13N_FAMILY_PREFIX}series_stopped`,
          sequence: 9_000,
        });
      }),
    };

    for (const [name, defective] of Object.entries(broken)) {
      const row = feature(defective);

      expect(row.disposition, name).toBe('technical_failure');
      expect(row.value, name).toBeNull();
      expect(row.numerator, name).toBeNull();
      expect(row.missing_reason, name).toBeTruthy();
    }

    // A partial series with a closure snapshot that disagrees.
    const partial = bench('A');

    m13sOpen(partial.series, partial.tick(), NO_PRIOR);
    answer(partial, 'sealed');
    m13sStop(partial.series, partial.tick());

    const stoppedLog = rawLog(partial.series.events);

    expect(feature(stoppedLog)).toMatchObject({
      value: 1,
      disposition: 'incomplete',
    });
    expect(
      feature(
        edited(
          stoppedLog,
          setMeta(
            indexOf(stoppedLog, 'series_stopped'),
            'networks_answered',
            2,
          ),
        ),
      ).disposition,
    ).toBe('technical_failure');
    // A first response after the stop.
    expect(
      feature(
        edited(stoppedLog, (copy) => {
          const stop = copy.pop()!;
          const again = structuredClone(copy[indexOf(copy, 'first_response')]);

          again.metadata = {
            ...again.metadata,
            network_id: 'n2',
            content_version: 'm13-n2-adjacent-v1',
          };

          return renumbered([...copy, stop, again]);
        }),
      ).disposition,
    ).toBe('technical_failure');
  });

  test('event order is read only from usable, unique sequence numbers: missing, zero, negative, fractional, string and duplicated numbers are technical failures; gaps are normal', () => {
    const b = completed(['sealed', 'unsealed', 'cannot_solve']);
    const log = rawLog(b.series.events);
    const target = indexOf(log, 'first_response', 1);
    const bad: Record<string, unknown> = {
      missing: undefined,
      null: null,
      zero: 0,
      negative: -4,
      fractional: 61.5,
      string: '61',
      NaN: Number.NaN,
      infinite: Number.POSITIVE_INFINITY,
      'beyond the safe range': Number.MAX_SAFE_INTEGER + 2,
      duplicated: log[target - 1].sequence,
    };

    for (const [name, value] of Object.entries(bad)) {
      const defective = edited(log, (copy) => {
        (copy[target] as { sequence?: unknown }).sequence = value;
      });
      const row = feature(defective);

      expect(row.disposition, name).toBe('technical_failure');
      expect(row.value, name).toBeNull();
    }

    // The same defect on a series that is still open or was stopped early.
    const open = bench('A');

    m13sOpen(open.series, open.tick(), NO_PRIOR);
    answer(open, 'sealed');

    const openLog = rawLog(open.series.events);

    expect(feature(openLog, OPEN_CONTEXT).disposition).toBe('pending');
    expect(
      feature(
        edited(openLog, (copy) => {
          delete (copy[2] as { sequence?: number }).sequence;
        }),
        OPEN_CONTEXT,
      ).disposition,
    ).toBe('technical_failure');

    // Gaps and a log delivered out of array order are normal.
    const gapped = edited(log, (copy) => {
      copy.forEach((event, index) => {
        event.sequence = 7 + index * index * 5 + index;
      });

      return copy.reverse();
    });

    expect(feature(gapped)).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 3,
      disposition: 'observed',
    });

    // Events of other families and of other page loads are not read.
    const foreign: RawGameEvent[] = [
      {
        session_id: 's',
        timestamp_ms: 1,
        scene: 'records_workshop',
        event_type: 'proto_m13_lattice_submitted',
        page_load_index: 1,
        metadata: { valid: true },
      },
      {
        session_id: 's',
        timestamp_ms: 2,
        scene: 'information_processing_lab',
        event_type: 'proto_m13_networks_first_response',
        sequence: 3,
        page_load_index: 7,
        metadata: { correct: true },
      },
    ];

    expect(feature([...foreign, ...log])).toMatchObject({
      value: 1,
      disposition: 'observed',
    });
  });

  test('the extractor is deterministic, never mutates its input, and its row is the one the export carries', () => {
    const b = completed(['sealed', 'cannot_solve', 'sealed']);

    m13sNext(b.series, b.tick());

    const log = rawLog(b.series.events);
    const frozen = JSON.stringify(log);
    const first = feature(log);
    const second = feature(log);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(log)).toBe(frozen);
    expect(first).toMatchObject({ value: 2, denominator: 3 });

    // The page's export runs the same function over the same raw log.
    const exported = extractMeasurementFeatures(log, CONTEXT).filter(
      (row) => row.item_id === 'M13',
    );

    expect(exported).toHaveLength(1);
    expect(JSON.stringify(exported[0])).toBe(JSON.stringify(first));
    expect(exported[0].supporting_sequences).toEqual(
      log.map((event) => event.sequence),
    );
  });
});
