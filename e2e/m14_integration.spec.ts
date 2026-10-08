/**
 * Station 080 M14 — two keyed packets with immutable first decisions
 * (Unit 17, administration `m14-integration-v1`), pure tests.
 *
 * Playwright test blocks that never touch `page`:
 * - the keys and their multi-source structure, checked INDEPENDENTLY of
 *   the implementation: this file carries its own structured
 *   transcription of the preview's facts (times, readings, bands,
 *   thresholds, counts, names, rules), written by hand from
 *   `U17-STIMULUS-PREVIEW.md` r4, and its own evaluator per decision
 *   (rule text → function) that enumerates the worlds consistent with a
 *   set of known sources; it imports nothing from `m14PacketContent.ts`
 *   for the expected side — the module's keys are compared with the
 *   hand-written keys afterwards, and a cross-check binds the module's
 *   participant text to this transcription;
 * - the register row and route;
 * - the series model under research-owner decision D-U17-1: no
 *   correctness information before the sixth first response, first
 *   responses written once and never changed, the fresh-press rule,
 *   drafts that never count, source openings kept apart from answering;
 * - the read-only extractor on synthetic logs: values, legitimate
 *   missingness, technical failure for contradictory or unverifiable
 *   scored evidence, determinism;
 * - typography T1 and the wording of the desk.
 *
 * Nothing here establishes psychometric validity: the six decisions are
 * repeated observations inside one desk episode, clustered in two
 * packets, and are not claimed to be equal in difficulty.
 */
import { expect, test } from '@playwright/test';

import {
  extractItemFeatures,
  extractMeasurementFeatures,
} from '../src/measurement/features';
import { REGISTER_V3, registerEntry } from '../src/measurement/registerV3';
import { PILOT_SCHEDULE } from '../src/pilot/coverageSchedule';
import {
  createM14Series,
  M14_ACK_LINE_ID,
  M14_EVENT_SUFFIXES,
  M14_RELOAD_DETAIL,
  m14AnsweredCount,
  m14ClosureSnapshot,
  m14EntrySnapshot,
  type M14LogSink,
  m14PriorAdministration,
  m14sCancelCommit,
  m14sCloseAtReview,
  m14sCloseHelp,
  m14sConfirmCommit,
  m14sDraft,
  type M14Series,
  m14sFail,
  m14sHelp,
  m14sHoldBack,
  m14sLeave,
  m14sNext,
  m14sOpen,
  m14sRequestCommit,
  m14sResultsNavigate,
  m14sStart,
  m14sToggleSource,
} from '../src/pilot/windows/m14IntegrationModel';
import {
  M14_ASSIGNED_PACKET_ORDER,
  M14_CONTENT_VERSIONS,
  M14_ENTRY_STATE_VERSION,
  M14_FAMILY,
  M14_OPPORTUNITY_ID,
  M14_PACKETS,
  M14_SETTLE_MS,
  M14_TEXT,
  M14_WINDOW_ID,
  m14Decision,
  m14Decisions,
  m14FirstResponsePhaseStrings,
  m14Packet,
  m14ParticipantStrings,
} from '../src/pilot/windows/m14PacketContent';
import {
  type M14SurfaceHost,
  m14SurfaceModel,
} from '../src/pilot/windows/m14SurfaceModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/* ------------------------------------------------------------------ *
 * 1. The facts, transcribed by hand from the preview (r4 §4–§5).
 *    Source ids are the preview's own labels. Nothing below is imported
 *    from the content module.
 * ------------------------------------------------------------------ */

type Letter = 'a' | 'b' | 'c' | 'd';
const ALL: readonly Letter[] = ['a', 'b', 'c', 'd'];

/** Packet 1 — Night packet: pump bay and power; readings at 04:00. */
const P1 = {
  M1: {
    time: '00:30',
    sender: 'Duty officer',
    rule: 'isolate a coolant loop that reads below its normal band unless the medical bay runs on it',
    bypass: 'loop B bypass may be opened while loop B is inside its band',
  },
  M2: { time: '01:10', sender: 'Night watch', medical_loop: 'A' },
  M3: { time: '01:20', sender: 'Stores', seals: 4 },
  M4: {
    time: '02:35',
    sender: 'Pump bay',
    medical_loop: 'B',
    switched_at: '02:30',
    heaters: 'galley heaters may be restarted while loop A is inside its band',
  },
  M5: {
    time: '03:10',
    sender: 'Pump bay',
    seals_used: 2,
    joint: 'Joint 7',
    pump_threshold_v: 27.5,
  },
  M6: {
    time: '03:40',
    sender: 'Workshop',
    seals_brought: 1,
    press: 'sample press may run while the main bus is inside its normal band',
  },
  G1: { label: 'Loop A pressure', reading: 1.6, band: [2.0, 2.6] as const },
  G2: { label: 'Loop B pressure', reading: 1.8, band: [2.0, 2.6] as const },
  G3: { label: 'Main bus', reading: 27.2, band: [26.5, 28.5] as const },
} as const;

/** Packet 2 — Morning packet: mast, yard and uplink; readings at 07:00. */
const P2 = {
  M1: {
    time: '04:10',
    sender: 'Comms lead',
    ticket_holders: ['Ansel', 'Corin'] as const,
    on_shift: ['Ansel', 'Corin'] as const,
    wind_rule: 'nobody climbs while the mast wind is over its limit',
  },
  M2: { time: '04:30', sender: 'Yard', generator_tank: 2, cleaned_tank: 1 },
  M3: { time: '04:45', sender: 'Comms', text: 10, voice: 30, video: 70 },
  M4: { time: '05:55', sender: 'Comms', voice: 40 },
  M5: {
    time: '06:05',
    sender: 'Yard',
    rule: 'run the generator on the emptiest tank that still holds at least 20 %',
    floor: 20,
  },
  M6: {
    time: '06:20',
    sender: 'Roster',
    out: 'Ansel',
    free: 'Dara',
  },
  G1: { label: 'Mast wind', reading: 31, limit: 40 },
  G2: { label: 'Fuel tanks', levels: { 1: 64, 2: 15, 3: 41 } as const },
  G3: { label: 'Uplink signal', reading: 34 },
} as const;

/** Hand-written keys and establishing sets (preview §4.3 / §5.3). */
const HAND = {
  p1_d1: { key: 'a' as Letter, sets: [['p1_m1', 'p1_g1', 'p1_m4']] },
  p1_d2: { key: 'b' as Letter, sets: [['p1_m3', 'p1_m5', 'p1_m6']] },
  p1_d3: {
    key: 'd' as Letter,
    sets: [
      ['p1_m6', 'p1_g3'],
      ['p1_m4', 'p1_g1', 'p1_m1', 'p1_g2', 'p1_m5', 'p1_g3'],
    ],
  },
  p2_d1: { key: 'b' as Letter, sets: [['p2_m1', 'p2_m6', 'p2_g1']] },
  p2_d2: { key: 'c' as Letter, sets: [['p2_m5', 'p2_g2']] },
  p2_d3: { key: 'c' as Letter, sets: [['p2_m3', 'p2_m4', 'p2_g3']] },
} as const;

type DecisionId = keyof typeof HAND;
const DECISION_IDS = Object.keys(HAND) as DecisionId[];

/**
 * The lure table (preview §4.3 / §5.3): every wrong option stays consistent
 * with a documented partial reading — a set of sources read as current
 * (the misreading itself is not modelled; register §5.289 (c)).
 */
const LURES: Record<DecisionId, { option: Letter; known: string[] }[]> = {
  p1_d1: [
    // P1-M2 taken as current, missing its replacement by P1-M4.
    { option: 'b', known: ['p1_m1', 'p1_m2', 'p1_g1', 'p1_g2'] },
    // The rule applied to both below-band gauges without the exception.
    { option: 'c', known: ['p1_m1', 'p1_g1', 'p1_g2'] },
    // Loop A taken to be inside its band (gauge unread).
    { option: 'd', known: ['p1_m1', 'p1_m4'] },
  ],
  p1_d2: [
    // The seal brought at 03:40 missed.
    { option: 'a', known: ['p1_m3', 'p1_m5'] },
    // The 01:20 stock without either change.
    { option: 'c', known: ['p1_m3'] },
    // The two seals used at 03:10 missed.
    { option: 'd', known: ['p1_m3', 'p1_m6'] },
  ],
  p1_d3: [
    // The heater condition not checked against P1-G1.
    { option: 'a', known: ['p1_m4'] },
    // The bypass condition not checked against P1-G2.
    { option: 'b', known: ['p1_m1'] },
    // "Inside the normal band" taken as enough for the pump (its own threshold missed).
    { option: 'c', known: ['p1_m5', 'p1_m6'] },
  ],
  p2_d1: [
    // P2-M6 missed.
    { option: 'a', known: ['p2_m1', 'p2_g1'] },
    // Availability taken as enough, missing the ticket requirement.
    { option: 'c', known: ['p2_m6', 'p2_g1'] },
    // The gauge not read against its limit.
    { option: 'd', known: ['p2_m1', 'p2_m6'] },
  ],
  p2_d2: [
    // "Use the fullest tank" from the gauge alone.
    { option: 'a', known: ['p2_g2'] },
    // P2-M2's arrangement taken as current.
    { option: 'b', known: ['p2_m2', 'p2_g2'] },
    // The floor misread (the gauge without the current rule).
    { option: 'd', known: ['p2_g2'] },
  ],
  p2_d3: [
    // The 70 % threshold not checked.
    { option: 'a', known: ['p2_m4', 'p2_g3'] },
    // P2-M3's voice threshold taken as current, missing P2-M4.
    { option: 'b', known: ['p2_m3', 'p2_g3'] },
    // The 40 % applied to every kind of contact.
    { option: 'd', known: ['p2_m4', 'p2_g3'] },
  ],
};

/* ------------------------------------------------------------------ *
 * The evaluators — written from the rule text, independent of the
 * implementation. Each takes the set of KNOWN sources, lets every
 * unknown fact range over a small stated domain (a gauge: below / inside
 * / above its band and either side of a threshold; a count: the option
 * values; a change not reported: it did not happen — "nothing happened
 * that a packet does not report"; a rule: its possible states) and
 * returns the options consistent with some world.
 * ------------------------------------------------------------------ */

type Known = ReadonlySet<string>;

function worlds<T extends Record<string, readonly unknown[]>>(
  domains: T,
): Record<keyof T, unknown>[] {
  const keys = Object.keys(domains) as (keyof T)[];
  let result: Record<keyof T, unknown>[] = [{} as Record<keyof T, unknown>];

  for (const key of keys) {
    const next: Record<keyof T, unknown>[] = [];

    for (const partial of result) {
      for (const value of domains[key]) {
        next.push({ ...partial, [key]: value });
      }
    }

    result = next;
  }

  return result;
}

const inside = (reading: number, band: readonly [number, number]) =>
  reading >= band[0] && reading <= band[1];

/** P1-D1: which loops to isolate under the standing order. */
function evalP1D1(known: Known): Set<Letter> {
  if (!known.has('p1_m1')) {
    return new Set(ALL); // the rule and its exception are unknown
  }

  const domains = {
    loopABelow: known.has('p1_g1')
      ? [P1.G1.reading < P1.G1.band[0]]
      : [true, false],
    loopBBelow: known.has('p1_g2')
      ? [P1.G2.reading < P1.G2.band[0]]
      : [true, false],
    medical: known.has('p1_m4')
      ? [P1.M4.medical_loop]
      : known.has('p1_m2')
        ? [P1.M2.medical_loop]
        : ['A', 'B', 'none'],
  };
  const out = new Set<Letter>();

  for (const w of worlds(domains)) {
    const isolateA = (w.loopABelow as boolean) && w.medical !== 'A';
    const isolateB = (w.loopBBelow as boolean) && w.medical !== 'B';

    out.add(isolateA && isolateB ? 'c' : isolateA ? 'a' : isolateB ? 'b' : 'd');
  }

  return out;
}

/** P1-D2: the spare seals on the shelf now. */
function evalP1D2(known: Known): Set<Letter> {
  const domains = {
    start: known.has('p1_m3') ? [P1.M3.seals] : [2, 3, 4, 5],
    used: known.has('p1_m5') ? [P1.M5.seals_used] : [0],
    brought: known.has('p1_m6') ? [P1.M6.seals_brought] : [0],
  };
  const byCount: Record<number, Letter> = { 2: 'a', 3: 'b', 4: 'c', 5: 'd' };
  const out = new Set<Letter>();

  for (const w of worlds(domains)) {
    const count =
      (w.start as number) - (w.used as number) + (w.brought as number);
    const letter = byCount[count];

    if (letter !== undefined) {
      out.add(letter);
    }
  }

  return out;
}

/** P1-D3: which ONE job is allowed now ("may … while X, and not otherwise"). */
function evalP1D3(known: Known): Set<Letter> {
  const tri = (ruleKnown: boolean, gaugeKnown: boolean, holds: boolean) =>
    ruleKnown && gaugeKnown ? [holds] : [true, false];
  const domains = {
    heaters: tri(
      known.has('p1_m4'),
      known.has('p1_g1'),
      inside(P1.G1.reading, P1.G1.band),
    ),
    bypass: tri(
      known.has('p1_m1'),
      known.has('p1_g2'),
      inside(P1.G2.reading, P1.G2.band),
    ),
    pump: tri(
      known.has('p1_m5'),
      known.has('p1_g3'),
      P1.G3.reading >= P1.M5.pump_threshold_v,
    ),
    press: tri(
      known.has('p1_m6'),
      known.has('p1_g3'),
      inside(P1.G3.reading, P1.G3.band),
    ),
  };
  const out = new Set<Letter>();

  for (const w of worlds(domains)) {
    const allowed = (['heaters', 'bypass', 'pump', 'press'] as const).filter(
      (job) => w[job] === true,
    );

    // The question's "one": a world with no or several allowed jobs
    // contradicts the premise and is excluded.
    if (allowed.length === 1) {
      out.add(
        allowed[0] === 'heaters'
          ? 'a'
          : allowed[0] === 'bypass'
            ? 'b'
            : allowed[0] === 'pump'
              ? 'c'
              : 'd',
      );
    }
  }

  return out;
}

/** P2-D1: who can be sent up the mast now. */
function evalP2D1(known: Known): Set<Letter> {
  const domains = {
    windOver: known.has('p2_g1')
      ? [P2.G1.reading > P2.G1.limit]
      : [true, false],
    anselOut: known.has('p2_m6') ? [true] : [false],
    daraFree: known.has('p2_m6') ? [true] : [false],
    ticketRule: known.has('p2_m1') ? [true] : [false],
  };
  const out = new Set<Letter>();

  for (const w of worlds(domains)) {
    if (w.windOver) {
      out.add('d');
      continue;
    }

    const candidates = w.ticketRule
      ? [...P2.M1.ticket_holders].filter((name) =>
          (P2.M1.on_shift as readonly string[]).includes(name),
        )
      : ['Ansel', 'Corin', ...(w.daraFree ? ['Dara'] : [])];
    const sendable = candidates.filter(
      (name) => !(w.anselOut && name === P2.M6.out),
    );

    for (const name of sendable) {
      out.add(name === 'Ansel' ? 'a' : name === 'Corin' ? 'b' : 'c');
    }
  }

  return out;
}

/** P2-D2: the tank the generator runs on under the yard rule. */
function evalP2D2(known: Known): Set<Letter> {
  const rule: ('emptiest_above_floor' | 'tank_2' | 'unknown')[] = known.has(
    'p2_m5',
  )
    ? ['emptiest_above_floor']
    : known.has('p2_m2')
      ? ['tank_2']
      : ['unknown'];
  const levelDomain = [15, 41, 64];
  const domains = {
    rule,
    t1: known.has('p2_g2') ? [P2.G2.levels[1]] : levelDomain,
    t2: known.has('p2_g2') ? [P2.G2.levels[2]] : levelDomain,
    t3: known.has('p2_g2') ? [P2.G2.levels[3]] : levelDomain,
  };
  const out = new Set<Letter>();

  for (const w of worlds(domains)) {
    if (w.rule === 'unknown') {
      return new Set(ALL);
    }

    if (w.rule === 'tank_2') {
      out.add('b');
      continue;
    }

    const levels = [w.t1, w.t2, w.t3] as number[];
    const eligible = levels
      .map((level, index) => ({ level, tank: index + 1 }))
      .filter((entry) => entry.level >= P2.M5.floor)
      .sort((x, y) => x.level - y.level);

    out.add(
      eligible.length === 0
        ? 'd'
        : eligible[0].tank === 1
          ? 'a'
          : eligible[0].tank === 2
            ? 'b'
            : 'c',
    );
  }

  return out;
}

/** P2-D3: the fullest contact the uplink allows now. */
function evalP2D3(known: Known): Set<Letter> {
  const domains = {
    text: known.has('p2_m3') ? [P2.M3.text] : [5, 35],
    voice: known.has('p2_m4')
      ? [P2.M4.voice]
      : known.has('p2_m3')
        ? [P2.M3.voice]
        : [5, 35, 50],
    video: known.has('p2_m3') ? [P2.M3.video] : [30, 80],
    signal: known.has('p2_g3') ? [P2.G3.reading] : [5, 20, 50, 80],
  };
  const out = new Set<Letter>();

  for (const w of worlds(domains)) {
    const signal = w.signal as number;

    out.add(
      signal >= (w.video as number)
        ? 'a'
        : signal >= (w.voice as number)
          ? 'b'
          : signal >= (w.text as number)
            ? 'c'
            : 'd',
    );
  }

  return out;
}

const EVALUATORS: Record<DecisionId, (known: Known) => Set<Letter>> = {
  p1_d1: evalP1D1,
  p1_d2: evalP1D2,
  p1_d3: evalP1D3,
  p2_d1: evalP2D1,
  p2_d2: evalP2D2,
  p2_d3: evalP2D3,
};

const PACKET_SOURCES: Record<'p1' | 'p2', string[]> = {
  p1: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'g1', 'g2', 'g3'].map(
    (id) => `p1_${id}`,
  ),
  p2: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'g1', 'g2', 'g3'].map(
    (id) => `p2_${id}`,
  ),
};

/** "The key is not fixed": two or more options, or exactly one that is not the key. */
function notFixed(set: Set<Letter>, key: Letter): boolean {
  return set.size >= 2 || (set.size === 1 && !set.has(key));
}

test.describe('M14 keys and their multi-source structure (independent transcription)', () => {
  for (const id of DECISION_IDS) {
    const { key, sets } = HAND[id];
    const evaluate = EVALUATORS[id];
    const packet = id.slice(0, 2) as 'p1' | 'p2';

    test(`${id}: every fact known fixes exactly the hand-written key, equal to the module's key`, () => {
      const all = evaluate(new Set(PACKET_SOURCES[packet]));

      expect([...all]).toEqual([key]);
      expect(m14Decision(id)?.key_option_id).toBe(`${id}_${key}`);
      expect(m14Decision(id)?.establishing_sets.map((set) => [...set])).toEqual(
        sets.map((set) => [...set]),
      );
    });

    test(`${id}: each establishing set fixes the key; leave-one-out never does`, () => {
      for (const set of sets) {
        expect([...evaluate(new Set(set))], set.join('+')).toEqual([key]);

        for (const removed of set) {
          const remaining = set.filter((source) => source !== removed);
          const consistent = evaluate(new Set(remaining));

          expect(
            notFixed(consistent, key),
            `${id} without ${removed}: ${[...consistent].join(',')}`,
          ).toBe(true);
        }
      }
    });

    test(`${id}: no single source alone (nor with the option list) fixes the key`, () => {
      for (const source of PACKET_SOURCES[packet]) {
        const consistent = evaluate(new Set([source]));

        expect(
          notFixed(consistent, key),
          `${id} with only ${source}: ${[...consistent].join(',')}`,
        ).toBe(true);
      }
    });

    test(`${id}: every wrong option is consistent with a documented partial reading`, () => {
      const wrong = ALL.filter((letter) => letter !== key);

      expect(LURES[id].map((lure) => lure.option).sort()).toEqual(wrong);

      for (const lure of LURES[id]) {
        const consistent = evaluate(new Set(lure.known));

        expect(
          consistent.has(lure.option),
          `${id} lure ${lure.option} under ${lure.known.join('+')}: ${[...consistent].join(',')}`,
        ).toBe(true);
      }
    });
  }

  test('P1-D3: the elimination set is a second establishing set and leave-one-out holds within it', () => {
    const [direct, elimination] = HAND.p1_d3.sets;

    expect(direct).toHaveLength(2);
    expect(elimination).toHaveLength(6);
    expect([...evalP1D3(new Set(elimination))]).toEqual(['d']);
    // Without the bus reading the pump and the press cannot be told apart.
    expect(
      [...evalP1D3(new Set(elimination.filter((s) => s !== 'p1_g3')))].sort(),
    ).toEqual(['c', 'd']);
  });

  test('P2-D3 (amendment A1, correction A): P2-M4 and P2-G3 alone do not fix the key even if text needs no more signal than voice', () => {
    const consistent = evalP2D3(new Set(['p2_m4', 'p2_g3']));

    // A text threshold of 35 % satisfies the assumption (35 ≤ 40) and
    // exceeds the 34 % reading, so (d) stays consistent: P2-M3 is necessary.
    expect(consistent.has('d')).toBe(true);
    expect(consistent.has('c')).toBe(true);
    expect(notFixed(consistent, 'c')).toBe(true);
    expect([...evalP2D3(new Set(['p2_m3', 'p2_m4', 'p2_g3']))]).toEqual(['c']);
  });
});

/* ------------------------------------------------------------------ *
 * 2. The cross-check: the module's participant text carries every
 *    number, time, threshold and name of this transcription (U+00A0 read
 *    as a space); the structure is 2 × (6 messages, 3 gauges, 3
 *    decisions, 4 options).
 * ------------------------------------------------------------------ */

const nbsp = (text: string) => text.replace(/\u00A0/g, ' ');

function sourceText(packet: 'p1' | 'p2', local: string): string {
  const source = m14Packet(packet).sources.find(
    (candidate) => candidate.id === `${packet}_${local}`,
  );

  expect(source, `${packet}_${local}`).toBeDefined();

  return nbsp(`${source!.header}\n${source!.text}`);
}

test.describe('M14 content cross-check and structure', () => {
  test('each packet has six messages, three gauges, three decisions and four options each', () => {
    expect(M14_PACKETS.map((packet) => packet.id)).toEqual(['p1', 'p2']);

    for (const packet of M14_PACKETS) {
      expect(packet.sources.filter((s) => s.kind === 'message')).toHaveLength(
        6,
      );
      expect(packet.sources.filter((s) => s.kind === 'gauge')).toHaveLength(3);
      expect(packet.sources.map((s) => s.index)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);
      expect(packet.decisions).toHaveLength(3);

      for (const decision of packet.decisions) {
        expect(decision.options).toHaveLength(4);
        expect(decision.options.map((o) => o.letter)).toEqual([
          'a',
          'b',
          'c',
          'd',
        ]);
        expect(decision.options.map((o) => o.id)).toEqual(
          ['a', 'b', 'c', 'd'].map((letter) => `${decision.id}_${letter}`),
        );
        expect(decision.options.map((o) => o.id)).toContain(
          decision.key_option_id,
        );
      }
    }
  });

  test('packet 1: the transcription occurs in the corresponding message, gauge and option text', () => {
    const m1 = sourceText('p1', 'm1');

    expect(m1).toContain(`${P1.M1.time} · ${P1.M1.sender}`);
    expect(m1).toMatch(/below its normal band, isolate it/);
    expect(m1).toMatch(/unless the medical bay is running on that loop/);
    expect(m1).toMatch(
      /bypass valve may be opened while loop B is inside its band, and not otherwise/,
    );
    expect(sourceText('p1', 'm2')).toContain(`${P1.M2.time} · ${P1.M2.sender}`);
    expect(sourceText('p1', 'm2')).toMatch(/running on loop A tonight/);
    expect(sourceText('p1', 'm3')).toContain(`${P1.M3.time} · ${P1.M3.sender}`);
    expect(sourceText('p1', 'm3')).toContain(`${P1.M3.seals} spare seals`);
    expect(sourceText('p1', 'm4')).toContain(`${P1.M4.time} · ${P1.M4.sender}`);
    expect(sourceText('p1', 'm4')).toContain(
      `switched to loop B at ${P1.M4.switched_at}`,
    );
    expect(sourceText('p1', 'm4')).toMatch(
      /galley heaters may be restarted while loop A is inside its band, and not otherwise/,
    );
    expect(sourceText('p1', 'm5')).toContain(`${P1.M5.time} · ${P1.M5.sender}`);
    expect(sourceText('p1', 'm5')).toContain(
      `${P1.M5.joint} re-sealed with ${P1.M5.seals_used} spare seals`,
    );
    expect(sourceText('p1', 'm5')).toContain(
      `reads ${P1.M5.pump_threshold_v} V or more, and not otherwise`,
    );
    expect(sourceText('p1', 'm6')).toContain(`${P1.M6.time} · ${P1.M6.sender}`);
    expect(sourceText('p1', 'm6')).toContain(
      `Brought ${P1.M6.seals_brought} new spare seal`,
    );
    expect(sourceText('p1', 'm6')).toMatch(
      /sample press may run while the main bus is inside its normal band, and not otherwise/,
    );
    expect(sourceText('p1', 'g1')).toContain(
      `${P1.G1.label}\n${P1.G1.reading} bar · normal band ${P1.G1.band[0].toFixed(1)}–${P1.G1.band[1].toFixed(1)} bar`,
    );
    expect(sourceText('p1', 'g2')).toContain(
      `${P1.G2.label}\n${P1.G2.reading} bar · normal band ${P1.G2.band[0].toFixed(1)}–${P1.G2.band[1].toFixed(1)} bar`,
    );
    expect(sourceText('p1', 'g3')).toContain(
      `${P1.G3.label}\n${P1.G3.reading} V · normal band ${P1.G3.band[0].toFixed(1)}–${P1.G3.band[1].toFixed(1)} V`,
    );
    expect(m14Decision('p1_d2')!.options.map((o) => o.label)).toEqual([
      '2',
      '3',
      '4',
      '5',
    ]);
    expect(m14Decision('p1_d1')!.options.map((o) => o.label)).toEqual([
      'Loop A only',
      'Loop B only',
      'Both loops',
      'Neither loop',
    ]);
    expect(m14Decision('p1_d3')!.options.map((o) => o.label)).toEqual([
      'Restart the galley heaters',
      "Open loop B's bypass valve",
      'Start the standby pump',
      'Run the sample press',
    ]);
    expect(nbsp(m14Decision('p1_d3')!.results_line)).toContain(
      `${P1.G3.reading} V`,
    );
    expect(nbsp(m14Decision('p1_d3')!.results_line)).toContain(
      `${P1.M5.pump_threshold_v} V or more`,
    );
    expect(nbsp(m14Decision('p1_d2')!.results_line)).toBe(
      '3: 4 on the shelf at 01:20, 2 used at 03:10, 1 brought at 03:40.',
    );
    expect(nbsp(m14Decision('p1_d1')!.results_line)).toContain(
      `(${P1.G1.reading} bar)`,
    );
    expect(nbsp(m14Decision('p1_d1')!.results_line)).toContain(
      `since ${P1.M4.switched_at}`,
    );
  });

  test('packet 2: the transcription occurs in the corresponding message, gauge and option text', () => {
    expect(sourceText('p2', 'm1')).toContain(`${P2.M1.time} · ${P2.M1.sender}`);
    expect(sourceText('p2', 'm1')).toContain(
      `Only ${P2.M1.ticket_holders[0]} and ${P2.M1.ticket_holders[1]} hold one, and both are on shift today`,
    );
    expect(sourceText('p2', 'm1')).toMatch(
      /Nobody climbs while the mast wind is over its limit/,
    );
    expect(sourceText('p2', 'm2')).toContain(`${P2.M2.time} · ${P2.M2.sender}`);
    expect(sourceText('p2', 'm2')).toContain(
      `moved to tank ${P2.M2.generator_tank} while tank ${P2.M2.cleaned_tank} is cleaned`,
    );
    expect(sourceText('p2', 'm3')).toContain(`${P2.M3.time} · ${P2.M3.sender}`);
    expect(sourceText('p2', 'm3')).toContain(
      `at least ${P2.M3.text} % signal for text bursts, ${P2.M3.voice} % for voice calls and ${P2.M3.video} % for video calls`,
    );
    expect(sourceText('p2', 'm4')).toContain(`${P2.M4.time} · ${P2.M4.sender}`);
    expect(sourceText('p2', 'm4')).toContain(
      `voice calls now need at least ${P2.M4.voice} % signal. The other thresholds are unchanged`,
    );
    expect(sourceText('p2', 'm5')).toContain(`${P2.M5.time} · ${P2.M5.sender}`);
    expect(sourceText('p2', 'm5')).toContain(
      `emptiest tank that still holds at least ${P2.M5.floor} %`,
    );
    expect(sourceText('p2', 'm6')).toContain(`${P2.M6.time} · ${P2.M6.sender}`);
    expect(sourceText('p2', 'm6')).toContain(
      `${P2.M6.out} sprained an ankle on the ice — no climbing today. ${P2.M6.free} is free all morning`,
    );
    expect(sourceText('p2', 'g1')).toContain(
      `${P2.G1.label}\n${P2.G1.reading} km/h · climbing limit ${P2.G1.limit} km/h`,
    );
    expect(sourceText('p2', 'g2')).toContain(
      `${P2.G2.label}\ntank 1: ${P2.G2.levels[1]} % · tank 2: ${P2.G2.levels[2]} % · tank 3: ${P2.G2.levels[3]} %`,
    );
    expect(sourceText('p2', 'g3')).toContain(
      `${P2.G3.label}\n${P2.G3.reading} %`,
    );
    expect(m14Decision('p2_d1')!.options.map((o) => o.label)).toEqual([
      'Ansel',
      'Corin',
      'Dara',
      'Nobody — the wind is over its limit',
    ]);
    expect(m14Decision('p2_d2')!.options.map((o) => nbsp(o.label))).toEqual([
      'Tank 1',
      'Tank 2',
      'Tank 3',
      'None of the tanks qualifies',
    ]);
    expect(m14Decision('p2_d3')!.options.map((o) => o.label)).toEqual([
      'Video call',
      'Voice call',
      'Text bursts only',
      'No contact is possible',
    ]);
    expect(nbsp(m14Decision('p2_d1')!.results_line)).toContain(
      `(${P2.G1.reading} km/h) is under its ${P2.G1.limit} km/h limit`,
    );
    expect(nbsp(m14Decision('p2_d2')!.results_line)).toBe(
      'Tank 3: tank 2 (15 %) is below 20 %; of tanks 1 and 3, tank 3 (41 %) is the emptier.',
    );
    expect(nbsp(m14Decision('p2_d3')!.results_line)).toBe(
      'Text bursts only: 34 % is enough for text (10 %) but not for voice (40 % since 05:55) or video (70 %).',
    );
  });

  test('the packet-start lines and the questions are the preview’s', () => {
    expect(m14Packet('p1').title).toBe(
      'PACKET 1 OF 2 — Night packet: pump bay and power',
    );
    expect(m14Packet('p1').readings_line).toBe(
      'Gauge readings taken at 04:00. Messages are listed in time order.',
    );
    expect(m14Packet('p2').title).toBe(
      'PACKET 2 OF 2 — Morning packet: mast, yard and uplink',
    );
    expect(m14Packet('p2').readings_line).toBe(
      'Gauge readings taken at 07:00. Messages are listed in time order.',
    );
    expect(m14Decision('p1_d1')!.question).toBe(
      'Under the standing order, which coolant loops, if any, do you isolate now?',
    );
    expect(m14Decision('p1_d2')!.question).toBe(
      'How many spare seals are on the pump bay shelf now?',
    );
    expect(m14Decision('p1_d3')!.question).toBe(
      'Which one of these jobs is allowed now?',
    );
    expect(m14Decision('p2_d1')!.question).toBe(
      'Who can be sent up the mast now?',
    );
    expect(m14Decision('p2_d2')!.question).toBe(
      'Under the yard rule, which tank should the generator run on now?',
    );
    expect(m14Decision('p2_d3')!.question).toBe(
      'Base asks for the fullest contact the uplink allows now (video is fuller than voice, voice is fuller than text). Which?',
    );
    expect(M14_CONTENT_VERSIONS).toEqual({ p1: 'm14-p1-v1', p2: 'm14-p2-v1' });
  });
});

/* ------------------------------------------------------------------ *
 * 3. Typography T1 and wording
 * ------------------------------------------------------------------ */

const FORBIDDEN =
  /proto_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|puzzle|persist|grit|skill|ability|intelligen|handle|information/i;
const CORRECTNESS = /\bcorrect|incorrect|\bright\b|\bwrong\b|station answer/i;

test.describe('M14 typography T1 and wording', () => {
  test('T1: "tank" + digit and the space before "%" use U+00A0 and no ASCII space remains there', () => {
    for (const text of m14ParticipantStrings()) {
      expect(text, text).not.toMatch(/\b[Tt]ank \d/);
      expect(text, text).not.toMatch(/\d %/);
    }

    const withNbsp = m14ParticipantStrings().filter((text) =>
      /\u00A0/.test(text),
    );

    expect(withNbsp.length).toBeGreaterThan(0);

    for (const text of withNbsp) {
      // Only inside "tank N" / "Tank N" and before "%".
      expect(
        text.replace(/[Tt]ank\u00A0\d/g, '').replace(/\d\u00A0%/g, ''),
        text,
      ).not.toMatch(/\u00A0/);
    }

    // With U+00A0 read as a space the strings equal the preview's wording.
    expect(nbsp(sourceText('p2', 'g2'))).toContain(
      'tank 1: 64 % · tank 2: 15 % · tank 3: 41 %',
    );
    expect(nbsp(m14Decision('p2_d2')!.options[2].label)).toBe('Tank 3');
  });

  test('no participant-facing string carries a forbidden token; "solve" only inside CANNOT SOLVE', () => {
    for (const text of m14ParticipantStrings()) {
      expect(text, text).not.toMatch(FORBIDDEN);

      for (const match of text.matchAll(/solve/gi)) {
        const around = text.slice(
          Math.max(0, match.index - 7),
          match.index + 5,
        );

        expect(around, text).toBe('CANNOT SOLVE');
      }
    }
  });

  test('the fixed strings of the preview are present exactly', () => {
    expect(M14_TEXT.title).toBe('INCIDENT DESK — STORM PACKETS');
    expect(M14_TEXT.orientation[0]).toBe(
      'Two packets from the storm are waiting. Each has six messages, three gauges and three decisions.',
    );
    expect(M14_TEXT.orientation[2]).toBe(
      '• Messages were accurate when they were sent. If a later message changes a fact or rule from an earlier one, go by the later message; everything else in the earlier message still holds.',
    );
    expect(M14_TEXT.orientation[3]).toBe(
      '• Nothing happened that a packet does not report.',
    );
    expect(M14_TEXT.status).toBe(
      'Open sources as needed. Choose an answer, then RECORD ANSWER. One answer per decision — it cannot be changed. Results follow the sixth answer.',
    );
    expect(M14_TEXT.confirm_answer(2)).toBe(
      'Record this answer for decision 2? It cannot be changed afterwards.',
    );
    expect(M14_TEXT.confirm_cannot_solve(3)).toBe(
      'Record CANNOT SOLVE for decision 3? It cannot be changed afterwards.',
    );
    expect(M14_TEXT.choose_first).toBe('Choose an answer first.');
    expect(M14_TEXT.acknowledgement(1)).toBe('Answer recorded for decision 1.');
    expect(M14_TEXT.results_heading).toBe('All six answers are recorded.');
    expect(M14_TEXT.closed_at_review).toBe(
      'Station record closed — the desk keeps its record.',
    );
    expect(M14_TEXT.held_back).toBe(
      'This desk was already used in this session. Its record is kept; nothing further is recorded here.',
    );
    expect(M14_TEXT.recorded_count(3)).toBe('3 of 6 recorded');
  });

  test('no first-response-phase string contains a correctness word', () => {
    for (const text of m14FirstResponsePhaseStrings()) {
      expect(text, text).not.toMatch(CORRECTNESS);
    }
  });
});

/* ------------------------------------------------------------------ *
 * 4. The register
 * ------------------------------------------------------------------ */

test.describe('M14 register row and route', () => {
  test('M14 is on an explicit v3 route, implemented, with the series opportunity, two packet windows and one family', () => {
    const entry = registerEntry('M14');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.route.opportunity_ids).toEqual([M14_OPPORTUNITY_ID]);
    expect(entry.route.windows).toEqual([
      {
        id: 'm14_packet_p1',
        occasion: 'p1',
        zone: 'station_concourse',
        episode: 1,
      },
      {
        id: 'm14_packet_p2',
        occasion: 'p2',
        zone: 'station_concourse',
        episode: 1,
      },
    ]);
    expect(entry.route.family_prefixes).toEqual([M14_FAMILY]);
    expect(entry.route.secondary_ids).toEqual([]);
    expect(entry.operational_label).toBe('Incident desk (Concourse)');
    expect(entry.independence).toEqual({
      kind: 'repeated_within_episode',
      note: 'six decisions clustered in two packets',
    });
    expect(entry.target.occasions).toBe(2);
    expect(entry.target.summary).toContain('sources open on demand');
    expect(entry.target.summary).toContain('D-U17-1, item 2');
  });

  test('the feature row is unchanged', () => {
    const entry = registerEntry('M14');

    expect(entry.features).toHaveLength(1);
    expect(entry.features[0]).toEqual({
      feature_id: 'm14_correct_first_integrations',
      feature_version: '1',
      kind: 'fraction',
      numerator:
        'keyed integration decisions whose first committed answer is correct',
      denominator: 'six decisions (three per packet)',
      planned_denominator: 6,
      denominator_kind: 'planned_observations',
      range: '0–6',
      higher_means: 'more accurate integration',
      missing_rule:
        'no decision answered → null; by-packet results exported separately',
      role: 'primary',
    });
  });

  test('the schedule mirrors the register; families stay pairwise disjoint; the retired and legacy M14 families are not the new one', () => {
    const scheduled = PILOT_SCHEDULE.find((entry) => entry.item === 'M14')!;

    expect(scheduled.opportunityIds).toEqual([M14_OPPORTUNITY_ID]);
    expect(scheduled.familyPrefixes).toEqual([M14_FAMILY]);
    expect(scheduled.zone).toBe('station_concourse');

    const prefixes = REGISTER_V3.flatMap(
      (entry) => entry.route.family_prefixes,
    );

    for (const a of prefixes) {
      for (const b of prefixes) {
        if (a !== b) {
          expect(a.startsWith(b), `${a} / ${b}`).toBe(false);
        }
      }
    }

    for (const other of ['proto_m14_packet_', 'proto_m14_desk_']) {
      expect(M14_FAMILY.startsWith(other)).toBe(false);
      expect(other.startsWith(M14_FAMILY)).toBe(false);
    }

    expect(
      REGISTER_V3.filter((entry) =>
        entry.route.family_prefixes.includes(M14_FAMILY),
      ).map((entry) => entry.id),
    ).toEqual(['M14']);
  });
});

/* ------------------------------------------------------------------ *
 * 5. The series model
 * ------------------------------------------------------------------ */

interface Run {
  s: M14Series;
  events: { suffix: string; metadata: Record<string, unknown> }[];
  sink: M14LogSink;
  now: number;
  /** Advances the clock. */
  tick: (ms: number) => number;
}

function run(): Run {
  const r: Run = {
    s: createM14Series(),
    events: [],
    sink: (suffix, metadata) => {
      r.events.push({ suffix, metadata });
    },
    now: 10_000,
    tick: (ms) => {
      r.now += ms;

      return r.now;
    },
  };

  return r;
}

const suffixes = (r: Run) => r.events.map((event) => event.suffix);
const last = (r: Run, suffix: string) =>
  [...r.events].reverse().find((event) => event.suffix === suffix);
const count = (r: Run, suffix: string) =>
  r.events.filter((event) => event.suffix === suffix).length;

/** Opens the desk and starts packet 1 (orientation acknowledged). */
function started(): Run {
  const r = run();

  m14sOpen(r.s, r.now, r.sink);
  m14sStart(r.s, 'keyboard', r.tick(M14_SETTLE_MS + 50), r.sink);

  return r;
}

/** Answers the current decision: an option (by letter) or Cannot solve. */
function answer(
  r: Run,
  choice: Letter | 'cannot_solve',
  mode: 'pointer' | 'keyboard' = 'keyboard',
) {
  const decision = m14Decisions()[m14AnsweredCount(r.s)];

  if (choice === 'cannot_solve') {
    expect(
      m14sRequestCommit(r.s, 'cannot_solve', mode, r.tick(100), r.sink),
    ).toBe('opened');
  } else {
    expect(
      m14sDraft(r.s, `${decision.id}_${choice}`, mode, r.tick(100), r.sink),
    ).toBe(true);
    expect(m14sRequestCommit(r.s, 'option', mode, r.tick(100), r.sink)).toBe(
      'opened',
    );
  }

  expect(m14sConfirmCommit(r.s, mode, r.tick(M14_SETTLE_MS + 1), r.sink)).toBe(
    'recorded',
  );
}

/** NEXT after the acknowledgement has settled. */
function next(r: Run) {
  return m14sNext(r.s, 'keyboard', r.tick(M14_SETTLE_MS + 1), r.sink);
}

const KEY_LETTERS: Record<string, Letter> = Object.fromEntries(
  DECISION_IDS.map((id) => [id, HAND[id].key]),
);
const WRONG_LETTERS: Record<string, Letter> = Object.fromEntries(
  DECISION_IDS.map((id) => [
    id,
    ALL.find((letter) => letter !== HAND[id].key)!,
  ]),
);

/** Renders the surface model from a series with no-op commands. */
function render(s: M14Series) {
  const host: M14SurfaceHost = {
    now: () => 0,
    close: () => undefined,
    feedback: () => undefined,
    series: () => s,
    commands: {
      start: () => true,
      toggleSource: () => 'none',
      draft: () => true,
      request: () => 'none',
      cancel: () => true,
      confirm: () => 'none',
      next: () => 'none',
      navigateResults: () => true,
      help: () => true,
      closeHelp: () => true,
    },
  };
  const model = m14SurfaceModel(host);
  const lines = [
    model.title,
    model.subtitle ?? '',
    model.status ?? '',
    model.help ?? '',
    ...model.elements.map((element) => element.label),
  ].join('\n');

  return { model, lines, ids: model.elements.map((element) => element.id) };
}

test.describe('M14 series model — no correctness information before the sixth first response', () => {
  test('before any answer and after one to five answers nothing on the surface says anything about correctness', () => {
    const r = started();
    const choices: (Letter | 'cannot_solve')[] = [
      'a',
      'c',
      'cannot_solve',
      'b',
      'd',
    ];

    for (let answered = 0; answered <= 5; answered += 1) {
      const view = render(r.s);

      expect(view.lines).not.toMatch(CORRECTNESS);
      expect(view.ids).not.toContain('results_text');
      expect(view.ids).not.toContain('results_next');
      expect(view.ids).not.toContain('finish');
      expect(view.model.subtitle).toContain(`${answered} of 6 recorded`);

      if (answered < 5) {
        answer(r, choices[answered]);

        const ack = render(r.s);

        expect(ack.lines).not.toMatch(CORRECTNESS);
        expect(ack.ids).not.toContain('results_text');
        expect(ack.ids[0]).toBe('next');
        expect(next(r)).toMatch(/decision_presented|packet_presented/);
      }
    }

    expect(suffixes(r)).not.toContain('results_shown');
  });

  test('the acknowledgement line and control are identical after a correct option, a wrong option and Cannot solve', () => {
    const views = (['a', 'b', 'cannot_solve'] as const).map((choice) => {
      const r = started();

      answer(r, choice);

      const ack = last(r, 'response_acknowledged')!.metadata;
      const view = render(r.s);

      return {
        ack: { line_id: ack.line_id, next_control: ack.next_control },
        lines: view.lines,
        ids: view.ids,
        correct: last(r, 'first_response')!.metadata.correct,
      };
    });

    expect(views.map((v) => v.correct)).toEqual([true, false, false]);
    expect(views[1].ack).toEqual(views[0].ack);
    expect(views[2].ack).toEqual(views[0].ack);
    expect(views[1].lines).toBe(views[0].lines);
    expect(views[2].lines).toBe(views[0].lines);
    expect(views[0].ack).toEqual({
      line_id: M14_ACK_LINE_ID,
      next_control: 'next_decision',
    });
    expect(views[0].lines).toContain('Answer recorded for decision 1.');
  });

  test('a results request is refused before the sixth answer and writes no results_shown; a review-closed partial series never exposes results', () => {
    const r = started();

    answer(r, 'a');
    expect(
      m14sResultsNavigate(r.s, 'next', 'keyboard', r.tick(500), r.sink),
    ).toBe(false);
    expect(next(r)).toBe('decision_presented');
    expect(m14sNext(r.s, 'keyboard', r.tick(500), r.sink)).toBe('none');
    expect(suffixes(r)).not.toContain('results_shown');

    expect(m14sCloseAtReview(r.s, r.tick(100), r.sink)).toBe(true);
    expect(r.s.view).toBe('record');

    const view = render(r.s);

    expect(view.ids).not.toContain('results_text');
    expect(view.lines).toContain(M14_TEXT.closed_at_review);
    expect(view.lines).toContain('1 of 6 recorded');
    expect(view.lines).not.toMatch(CORRECTNESS);
    expect(m14sNext(r.s, 'keyboard', r.tick(500), r.sink)).toBe('none');
    expect(
      m14sResultsNavigate(r.s, 'next', 'keyboard', r.tick(500), r.sink),
    ).toBe(false);
    expect(suffixes(r)).not.toContain('results_shown');
  });

  test('results follow only the sixth first response, once per packet, and reopen read-only', () => {
    const r = started();

    for (const id of DECISION_IDS) {
      answer(r, KEY_LETTERS[id]);
      next(r);
    }

    expect(r.s.status).toBe('completed');
    expect(suffixes(r).filter((s) => s === 'results_shown')).toHaveLength(1);
    expect(last(r, 'results_shown')!.metadata.packet_id).toBe('p1');
    // NEXT and BACK share one place: a press inside 400 ms of the last
    // change of view is a doubled press and changes nothing.
    expect(
      m14sResultsNavigate(r.s, 'next', 'pointer', r.tick(100), r.sink),
    ).toBe(false);
    expect(
      m14sResultsNavigate(
        r.s,
        'next',
        'pointer',
        r.tick(M14_SETTLE_MS),
        r.sink,
      ),
    ).toBe(true);
    expect(count(r, 'results_shown')).toBe(2);
    expect(
      m14sResultsNavigate(r.s, 'back', 'pointer', r.tick(100), r.sink),
    ).toBe(false);
    expect(r.s.results_packet).toBe(1);
    expect(
      m14sResultsNavigate(
        r.s,
        'back',
        'pointer',
        r.tick(M14_SETTLE_MS),
        r.sink,
      ),
    ).toBe(true);
    expect(
      m14sResultsNavigate(
        r.s,
        'next',
        'pointer',
        r.tick(M14_SETTLE_MS),
        r.sink,
      ),
    ).toBe(true);
    expect(count(r, 'results_shown')).toBe(2);

    const view = render(r.s);

    expect(view.lines).toContain(M14_TEXT.results_heading);
    expect(view.lines).toContain('Station answer: Text bursts only');
    expect(view.lines).toMatch(/Your recorded answer: Text bursts only/);

    m14sLeave(r.s, r.tick(100), r.sink);
    expect(m14sOpen(r.s, r.tick(100), r.sink)).toBe('reopened');
    expect(r.s.view).toBe('results');
    expect(count(r, 'results_shown')).toBe(2);
    expect(count(r, 'first_response')).toBe(6);
  });
});

test.describe('M14 series model — order, immutability, commitment', () => {
  test('fixed packet and decision order; no decision presented before the previous first response', () => {
    const r = started();

    expect(suffixes(r)).toEqual([
      'orientation_acknowledged',
      'packet_presented',
      'decision_presented',
    ]);
    expect(last(r, 'packet_presented')!.metadata).toMatchObject({
      packet_id: 'p1',
      packet_index: 1,
      assigned_position: 1,
      realised_position: 1,
      sources_available: PACKET_SOURCES.p1,
    });
    expect(last(r, 'decision_presented')!.metadata).toMatchObject({
      decision_id: 'p1_d1',
      decision_index: 1,
      decision_global_index: 1,
      assigned_position: 1,
      realised_position: 1,
      option_ids: ['p1_d1_a', 'p1_d1_b', 'p1_d1_c', 'p1_d1_d'],
    });
    expect(m14sNext(r.s, 'keyboard', r.tick(1000), r.sink)).toBe('none');
    expect(count(r, 'decision_presented')).toBe(1);

    const order: string[] = [];

    for (const id of DECISION_IDS) {
      order.push(last(r, 'decision_presented')!.metadata.decision_id as string);
      answer(r, 'a');

      const control = last(r, 'response_acknowledged')!.metadata.next_control;

      expect(control).toBe(
        id === 'p1_d3'
          ? 'next_packet'
          : id === 'p2_d3'
            ? 'show_results'
            : 'next_decision',
      );
      next(r);
    }

    expect(order).toEqual(DECISION_IDS);
    expect(
      r.events
        .filter((e) => e.suffix === 'packet_presented')
        .map((e) => e.metadata.packet_id),
    ).toEqual(['p1', 'p2']);
    expect(count(r, 'packet_completed')).toBe(2);
    expect(count(r, 'first_responses_completed')).toBe(1);
  });

  test('the first response is written once: a doubled confirmation, a second RECORD ANSWER, Cannot solve after an option and an option after Cannot solve never create a second one', () => {
    const r = started();

    answer(r, 'b');
    expect(count(r, 'first_response')).toBe(1);
    expect(m14sConfirmCommit(r.s, 'keyboard', r.tick(10), r.sink)).toBe('none');
    expect(
      m14sRequestCommit(r.s, 'option', 'keyboard', r.tick(10), r.sink),
    ).toBe('none');
    expect(
      m14sRequestCommit(r.s, 'cannot_solve', 'keyboard', r.tick(10), r.sink),
    ).toBe('none');
    expect(m14sDraft(r.s, 'p1_d1_a', 'keyboard', r.tick(10), r.sink)).toBe(
      false,
    );
    expect(count(r, 'first_response')).toBe(1);
    next(r);
    answer(r, 'cannot_solve');
    expect(m14sDraft(r.s, 'p1_d2_b', 'keyboard', r.tick(10), r.sink)).toBe(
      false,
    );
    expect(
      m14sRequestCommit(r.s, 'option', 'keyboard', r.tick(10), r.sink),
    ).toBe('none');
    expect(count(r, 'first_response')).toBe(2);
    expect(
      r.events
        .filter((e) => e.suffix === 'first_response')
        .map((e) => e.metadata.decision_id),
    ).toEqual(['p1_d1', 'p1_d2']);
  });

  test('the fresh-press rule: a press inside 400 ms is refused and recorded once per dialog, the count carried on the response; a cancelled confirmation leaves no response', () => {
    const r = started();

    m14sDraft(r.s, 'p1_d1_a', 'keyboard', r.tick(100), r.sink);
    expect(
      m14sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink),
    ).toBe('opened');
    expect(m14sConfirmCommit(r.s, 'keyboard', r.tick(100), r.sink)).toBe(
      'refused',
    );
    expect(m14sConfirmCommit(r.s, 'keyboard', r.tick(100), r.sink)).toBe(
      'refused',
    );
    expect(count(r, 'commit_press_refused')).toBe(1);
    expect(last(r, 'commit_press_refused')!.metadata).toMatchObject({
      kind: 'option',
      reason: 'dialog_settling',
      since_opened_ms: 100,
      settle_ms: M14_SETTLE_MS,
    });
    expect(count(r, 'first_response')).toBe(0);
    expect(m14sCancelCommit(r.s, 'keyboard', r.tick(100), r.sink)).toBe(true);
    expect(last(r, 'commit_cancelled')!.metadata).toMatchObject({
      kind: 'option',
      option_id: 'p1_d1_a',
      reason: 'keep_working',
      refused_presses: 2,
    });
    expect(count(r, 'first_response')).toBe(0);
    expect(r.s.pending_commit).toBeNull();
    expect(r.s.packets[0].decisions[0].draft).toBe('p1_d1_a');

    expect(
      m14sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink),
    ).toBe('opened');
    expect(m14sConfirmCommit(r.s, 'keyboard', r.tick(200), r.sink)).toBe(
      'refused',
    );
    expect(m14sConfirmCommit(r.s, 'keyboard', r.tick(300), r.sink)).toBe(
      'recorded',
    );
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      response_kind: 'option',
      option_id: 'p1_d1_a',
      correct: true,
      refused_presses: 1,
    });
  });

  test('RECORD ANSWER without a draft records commit_without_draft and nothing else; Cannot solve is incorrect whatever the draft; drafts never become answers', () => {
    const r = started();
    const before = r.events.length;

    expect(
      m14sRequestCommit(r.s, 'option', 'pointer', r.tick(100), r.sink),
    ).toBe('no_draft');
    expect(suffixes(r).slice(before)).toEqual(['commit_without_draft']);
    expect(r.s.pending_commit).toBeNull();

    // The key drafted, then Cannot solve: an incorrect first response.
    m14sDraft(r.s, 'p1_d1_a', 'pointer', r.tick(100), r.sink);
    expect(
      m14sRequestCommit(r.s, 'cannot_solve', 'pointer', r.tick(100), r.sink),
    ).toBe('opened');
    expect(
      m14sConfirmCommit(r.s, 'pointer', r.tick(M14_SETTLE_MS + 1), r.sink),
    ).toBe('recorded');
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      response_kind: 'cannot_solve',
      option_id: null,
      correct: false,
      draft_at_commit: 'p1_d1_a',
      input_mode: 'pointer',
    });
    next(r);
    // A draft left behind is never an answer.
    m14sDraft(r.s, 'p1_d2_b', 'pointer', r.tick(100), r.sink);
    m14sDraft(r.s, 'p1_d2_c', 'pointer', r.tick(100), r.sink);
    m14sDraft(r.s, 'p1_d2_c', 'pointer', r.tick(100), r.sink);
    expect(
      r.events
        .filter((e) => e.suffix === 'option_drafted')
        .map((e) => [e.metadata.option_id, e.metadata.previous_option_id]),
    ).toEqual([
      ['p1_d1_a', null],
      ['p1_d2_b', null],
      ['p1_d2_c', 'p1_d2_b'],
      [null, 'p1_d2_c'],
    ]);
    expect(count(r, 'first_response')).toBe(1);
    expect(m14ClosureSnapshot(r.s).decisions_answered).toBe(1);
  });
});

test.describe('M14 series model — sources, help, leaving, closures, reload', () => {
  test('source openings and closings are recorded apart from answering; opened tiles stay open across decisions and leaving; packet-2 sources start closed', () => {
    const r = started();

    expect(m14sToggleSource(r.s, 'p1_m1', 'keyboard', r.tick(10), r.sink)).toBe(
      'opened',
    );
    expect(m14sToggleSource(r.s, 'p1_g1', 'pointer', r.tick(10), r.sink)).toBe(
      'opened',
    );
    expect(m14sToggleSource(r.s, 'p1_g1', 'pointer', r.tick(10), r.sink)).toBe(
      'closed',
    );
    expect(m14sToggleSource(r.s, 'p1_g1', 'pointer', r.tick(10), r.sink)).toBe(
      'opened',
    );
    expect(m14sToggleSource(r.s, 'p2_m1', 'pointer', r.tick(10), r.sink)).toBe(
      'none',
    );
    expect(last(r, 'source_opened')!.metadata).toMatchObject({
      source_id: 'p1_g1',
      source_kind: 'gauge',
      open_count: 2,
      decision_id: 'p1_d1',
    });
    expect(count(r, 'first_response')).toBe(0);

    // Leaving and returning keeps the open tiles and the draft.
    m14sDraft(r.s, 'p1_d1_b', 'keyboard', r.tick(10), r.sink);
    m14sLeave(r.s, r.tick(10), r.sink);
    expect(last(r, 'panel_left')!.metadata).toMatchObject({
      view: 'decision',
      decision_id: 'p1_d1',
    });
    expect(m14sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(count(r, 'decision_presented')).toBe(1);
    expect(r.s.packets[0].open).toEqual(['p1_m1', 'p1_g1']);
    expect(r.s.packets[0].decisions[0].draft).toBe('p1_d1_b');

    answer(r, 'a');
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      sources_opened_before: ['p1_m1', 'p1_g1'],
      establishing_source_sets: [['p1_m1', 'p1_g1', 'p1_m4']],
      establishing_sets_opened_before: [2],
      sources_open_at_commit: ['p1_m1', 'p1_g1'],
      drafts_before: 2,
    });
    next(r);
    // Across decisions inside the packet the tiles stay open.
    expect(r.s.packets[0].open).toEqual(['p1_m1', 'p1_g1']);
    answer(r, 'b');
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      sources_opened_before: ['p1_m1', 'p1_g1'],
      establishing_sets_opened_before: [0],
    });
    next(r);
    answer(r, 'd');
    next(r);
    // Packet 2 starts closed.
    expect(r.s.packet).toBe(1);
    expect(r.s.packets[1].open).toEqual([]);
    expect(r.s.packets[1].opened_ever).toEqual([]);
    answer(r, 'b');
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      sources_opened_before: [],
      establishing_sets_opened_before: [0],
    });
  });

  test('help is recorded without effect and refused during a dialog; ESC order closes the dialog, then the help', () => {
    const r = run();

    m14sOpen(r.s, r.now, r.sink);
    expect(m14sHelp(r.s, 'keyboard', r.tick(10), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')!.metadata).toMatchObject({
      phase: 'orientation',
      view: 'orientation',
    });
    expect(m14sStart(r.s, 'keyboard', r.tick(10), r.sink)).toBe(false);
    expect(m14sCloseHelp(r.s, r.tick(10))).toBe(true);
    // CLOSE HELP settles START again: a doubled press starts nothing.
    expect(m14sStart(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m14sStart(r.s, 'keyboard', r.tick(M14_SETTLE_MS), r.sink)).toBe(
      true,
    );
    expect(m14sHelp(r.s, 'pointer', r.tick(10), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')!.metadata).toMatchObject({
      phase: 'measurement',
      packet_id: 'p1',
      decision_id: 'p1_d1',
    });
    expect(render(r.s).ids[0]).toBe('close_help');
    expect(m14sToggleSource(r.s, 'p1_m1', 'keyboard', r.tick(10), r.sink)).toBe(
      'none',
    );
    expect(m14sCloseHelp(r.s, r.tick(10))).toBe(true);
    m14sDraft(r.s, 'p1_d1_a', 'keyboard', r.tick(10), r.sink);
    m14sRequestCommit(r.s, 'option', 'keyboard', r.tick(10), r.sink);
    expect(m14sHelp(r.s, 'keyboard', r.tick(10), r.sink)).toBe(false);
    expect(render(r.s).ids).toEqual(['confirm', 'keep_working', 'dialog_text']);
    expect(m14sCancelCommit(r.s, 'keyboard', r.tick(10), r.sink)).toBe(true);
    expect(r.s.packets[0].decisions[0].help_consults).toBe(1);
    expect(r.s.help_consults).toEqual({
      orientation: 1,
      measurement: 1,
      feedback: 0,
      closure: 0,
    });
    expect(count(r, 'first_response')).toBe(0);
  });

  test('leaving before START shows the orientation card again; the review closes an orientation-only or partial series and never a completed one', () => {
    const orientationOnly = run();

    m14sOpen(orientationOnly.s, orientationOnly.now, orientationOnly.sink);
    m14sLeave(
      orientationOnly.s,
      orientationOnly.tick(10),
      orientationOnly.sink,
    );
    expect(
      m14sOpen(
        orientationOnly.s,
        orientationOnly.tick(10),
        orientationOnly.sink,
      ),
    ).toBe('reopened');
    expect(orientationOnly.s.view).toBe('orientation');
    expect(count(orientationOnly, 'packet_presented')).toBe(0);
    expect(
      m14sCloseAtReview(
        orientationOnly.s,
        orientationOnly.tick(10),
        orientationOnly.sink,
      ),
    ).toBe(true);
    expect(
      last(orientationOnly, 'series_closed_at_review')!.metadata,
    ).toMatchObject({
      phase: 'closure',
      closure_reason: 'closed_at_review',
      decisions_presented: 0,
      decisions_answered: 0,
    });
    expect(
      m14sCloseAtReview(
        orientationOnly.s,
        orientationOnly.tick(10),
        orientationOnly.sink,
      ),
    ).toBe(false);

    const partial = started();

    answer(partial, 'a');
    next(partial);
    answer(partial, 'c');
    next(partial);
    expect(m14sCloseAtReview(partial.s, partial.tick(10), partial.sink)).toBe(
      true,
    );
    expect(last(partial, 'series_closed_at_review')!.metadata).toMatchObject({
      decisions_presented: 3,
      decisions_answered: 2,
      correct_first_decisions: 1,
    });
    expect(
      m14sToggleSource(
        partial.s,
        'p1_m1',
        'keyboard',
        partial.tick(10),
        partial.sink,
      ),
    ).toBe('none');
    expect(
      m14sDraft(
        partial.s,
        'p1_d3_d',
        'keyboard',
        partial.tick(10),
        partial.sink,
      ),
    ).toBe(false);
    expect(
      m14sHelp(partial.s, 'keyboard', partial.tick(10), partial.sink),
    ).toBe(false);

    const completed = started();

    for (const id of DECISION_IDS) {
      answer(completed, KEY_LETTERS[id]);
      next(completed);
    }

    const eventsBefore = completed.events.length;

    expect(
      m14sCloseAtReview(completed.s, completed.tick(10), completed.sink),
    ).toBe(false);
    expect(completed.events.length).toBe(eventsBefore);
    expect(completed.s.status).toBe('completed');
  });

  test('the reload predicate reads an earlier load’s opportunity_opened; a held-back desk is a closed record', () => {
    expect(m14PriorAdministration([])).toBe(false);
    expect(
      m14PriorAdministration([{ event_type: `${M14_FAMILY}presented` }]),
    ).toBe(false);
    expect(
      m14PriorAdministration([
        { event_type: `${M14_FAMILY}opportunity_opened` },
      ]),
    ).toBe(true);

    const r = run();

    expect(m14sHoldBack(r.s)).toBe(true);
    expect(r.s.status).toBe('held_back');
    expect(m14sOpen(r.s, r.now, r.sink)).toBe('record');
    expect(render(r.s).lines).toContain(M14_TEXT.held_back);
    expect(m14sStart(r.s, 'keyboard', r.tick(10), r.sink)).toBe(false);
    expect(r.events).toEqual([]);
    expect(M14_RELOAD_DETAIL.startsWith('reload')).toBe(true);
  });

  test('a fault closes an open first-response phase; after completion it is recorded without touching the scored phase', () => {
    const r = started();

    answer(r, 'a');
    expect(m14sFail(r.s, 'boom')).toBe('scored_phase');
    expect(r.s.status).toBe('technical_failure');
    expect(render(r.s).lines).toContain(M14_TEXT.fault);
    expect(m14sNext(r.s, 'keyboard', r.tick(1000), r.sink)).toBe('none');

    const done = started();

    for (const id of DECISION_IDS) {
      answer(done, KEY_LETTERS[id]);
      next(done);
    }

    expect(m14sFail(done.s, 'later')).toBe('feedback');
    expect(done.s.status).toBe('completed');
    expect(m14sFail(done.s, 'again')).toBe('feedback');
  });

  test('START PACKET 1 settles against the opening; a reopened acknowledgement settles again; source events carry the view', () => {
    const r = run();

    m14sOpen(r.s, r.now, r.sink);
    expect(m14sStart(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(count(r, 'orientation_acknowledged')).toBe(0);
    expect(m14sStart(r.s, 'keyboard', r.tick(M14_SETTLE_MS), r.sink)).toBe(
      true,
    );
    expect(count(r, 'orientation_acknowledged')).toBe(1);

    answer(r, 'a');
    m14sLeave(r.s, r.tick(1000), r.sink);
    expect(m14sOpen(r.s, r.tick(1000), r.sink)).toBe('reopened');
    // Reopened on the acknowledgement: a press inside 400 ms is refused.
    expect(m14sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(count(r, 'decision_presented')).toBe(1);
    expect(next(r)).toBe('decision_presented');

    // A tile toggled in the acknowledgement view names that view.
    answer(r, 'b');
    expect(m14sToggleSource(r.s, 'p1_m3', 'pointer', r.tick(10), r.sink)).toBe(
      'opened',
    );
    expect(last(r, 'source_opened')!.metadata).toMatchObject({
      view: 'acknowledgement',
      decision_id: 'p1_d2',
    });
    next(r);
    expect(m14sToggleSource(r.s, 'p1_m3', 'pointer', r.tick(10), r.sink)).toBe(
      'closed',
    );
    expect(last(r, 'source_closed')!.metadata).toMatchObject({
      view: 'decision',
      decision_id: 'p1_d3',
    });
  });

  test('the entry snapshot and the event suffixes are the contract’s', () => {
    const snapshot = m14EntrySnapshot('incident_handover');

    expect(snapshot).toMatchObject({
      packets_planned: 2,
      decisions_planned: 6,
      assigned_packet_order: ['p1', 'p2'],
      commit: 'explicit_confirmation',
      cannot_solve_available: true,
      feedback: 'after_all_first_responses',
      source_presentation: 'on_demand_stay_open',
      stop_control: false,
      settle_ms: 400,
      stage: 'incident_handover',
    });
    expect(snapshot.packets.map((p) => p.content_version)).toEqual([
      'm14-p1-v1',
      'm14-p2-v1',
    ]);
    expect(snapshot.packets[0].decisions.map((d) => d.key_option_id)).toEqual([
      'p1_d1_a',
      'p1_d2_b',
      'p1_d3_d',
    ]);
    expect(M14_EVENT_SUFFIXES).toContain('commit_press_refused');
    expect(M14_EVENT_SUFFIXES).toContain('commit_without_draft');
    expect(M14_ASSIGNED_PACKET_ORDER).toEqual(['p1', 'p2']);
    expect(M14_WINDOW_ID).toBe('m14_packet_p1');
  });
});

/* ------------------------------------------------------------------ *
 * 6. The extractor on synthetic logs
 * ------------------------------------------------------------------ */

type Step = (r: Run) => void;

interface LogOptions {
  /** Omit the kit's `opportunity_opened` (the desk never opened). */
  opened?: boolean;
  /** Add the kit's `presented` (the briefing acknowledged) first. */
  briefed?: boolean;
  /** Add the kit's review-closure `window_closed` for a never-opened desk. */
  absentAtReview?: boolean;
  version?: string;
  opportunity?: string;
  pageLoadIndex?: number;
  /** Rewrites each event's sequence (default: 100, 101, …). */
  sequence?: (index: number) => number | undefined;
}

function kitFields(options: LogOptions = {}): Record<string, unknown> {
  return {
    measure_id: 'M14',
    opportunity_id: options.opportunity ?? M14_OPPORTUNITY_ID,
    window_id: M14_WINDOW_ID,
    entry_state_version: options.version ?? M14_ENTRY_STATE_VERSION,
    form: null,
    counterbalance: null,
    occasion: null,
  };
}

/**
 * Builds a raw log: the kit's `presented` / `opportunity_opened` records,
 * then the model's events of the steps, each stamped with the kit's
 * fields and a sequence number.
 */
function log(steps: Step[], options: LogOptions = {}): RawGameEvent[] {
  const r = run();
  const kit: { suffix: string; metadata: Record<string, unknown> }[] = [];

  if (options.briefed) {
    kit.push({ suffix: 'presented', metadata: { input_mode: 'system' } });
  }

  if (options.opened !== false) {
    kit.push({
      suffix: 'opportunity_opened',
      metadata: {
        entry_state_snapshot: m14EntrySnapshot('incident_handover'),
        input_mode: 'system',
      },
    });
    m14sOpen(r.s, r.now, r.sink);
  }

  for (const step of steps) {
    step(r);
  }

  if (options.absentAtReview) {
    r.events.push({
      suffix: 'window_closed',
      metadata: { exit_state: 'closed_at_review', input_mode: 'system' },
    });
  }

  return [...kit, ...r.events].map((event, index) => ({
    session_id: 'GS',
    timestamp_ms: 1_000 + index,
    scene: 'station_concourse',
    event_type: `${M14_FAMILY}${event.suffix}`,
    object_id: 'm14_incident_desk',
    sequence: options.sequence ? options.sequence(index) : 100 + index,
    page_load_index: options.pageLoadIndex ?? 1,
    metadata: { ...kitFields(options), ...event.metadata },
  }));
}

const CONTEXT = { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false };
const CLOSED = { ...CONTEXT, finalCoreClosed: true };

function row(events: RawGameEvent[], context = CONTEXT) {
  const rows = extractItemFeatures('M14', events, context);

  expect(rows).toHaveLength(1);
  expect(rows[0].feature_id).toBe('m14_correct_first_integrations');
  expect(rows[0].planned_denominator).toBe(6);

  return rows[0];
}

const start: Step = (r) => {
  m14sStart(r.s, 'keyboard', r.tick(M14_SETTLE_MS + 50), r.sink);
};
const answerAll =
  (choices: (Letter | 'cannot_solve')[]): Step =>
  (r) => {
    for (const choice of choices) {
      answer(r, choice);

      if (m14AnsweredCount(r.s) < 6 || r.s.status === 'completed') {
        next(r);
      }
    }
  };
const openSources =
  (ids: string[]): Step =>
  (r) => {
    for (const id of ids) {
      m14sToggleSource(r.s, id, 'keyboard', r.tick(10), r.sink);
    }
  };
const closeAtReview: Step = (r) => {
  m14sCloseAtReview(r.s, r.tick(10), r.sink);
};
const leave: Step = (r) => {
  m14sLeave(r.s, r.tick(10), r.sink);
  m14sOpen(r.s, r.tick(10), r.sink);
};

const ALL_KEYS = DECISION_IDS.map((id) => KEY_LETTERS[id]);
const ALL_WRONG = DECISION_IDS.map((id) => WRONG_LETTERS[id]);

/** Drops the NEXT that `answerAll` sends after the sixth answer (results stay unopened). */
const answerSixNoResults =
  (choices: (Letter | 'cannot_solve')[]): Step =>
  (r) => {
    choices.forEach((choice, index) => {
      answer(r, choice);

      if (index < 5) {
        next(r);
      }
    });
  };

test.describe('M14 extractor — values and companions', () => {
  test('6 / 6, 0 / 6 and a mixed series with Cannot solve are observed on the planned six', () => {
    const six = row(log([start, answerSixNoResults(ALL_KEYS)]));

    expect(six).toMatchObject({
      value: 6,
      numerator: 6,
      denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });
    expect(six.included_ids).toEqual(DECISION_IDS);

    const zero = row(log([start, answerSixNoResults(ALL_WRONG)]));

    expect(zero).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
    });

    const mixed = row(
      log([
        start,
        answerSixNoResults([
          'a',
          'cannot_solve',
          'd',
          'a',
          'cannot_solve',
          'c',
        ]),
      ]),
    );

    expect(mixed).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 6,
      disposition: 'observed',
    });
    expect(mixed.components).toMatchObject({
      cannot_solve_count: 2,
      decisions_answered: 6,
      first_response_phase_complete: true,
      observations_share_one_episode: true,
      administration_version: M14_ENTRY_STATE_VERSION,
      by_packet: {
        p1: {
          numerator: 2,
          denominator: 3,
          planned: 3,
          unanswered_decision_ids: [],
          unpresented_decision_ids: [],
        },
        p2: { numerator: 1, denominator: 3, planned: 3 },
      },
    });
    expect(
      (
        mixed.components.decisions as {
          response_kind: string;
          correct: boolean;
        }[]
      ).map((d) => [d.response_kind, d.correct]),
    ).toEqual([
      ['option', true],
      ['cannot_solve', false],
      ['option', true],
      ['option', false],
      ['cannot_solve', false],
      ['option', true],
    ]);
  });

  test('an answer given with none of its sources opened still counts, correct and incorrect; source use is reported beside the value', () => {
    const correct = row(log([start, answerSixNoResults(ALL_KEYS)]));
    const decisions = correct.components.decisions as {
      sources_opened_before: string[];
      establishing_sets: {
        opened_before: number;
        all_opened_before: boolean;
      }[];
      any_establishing_set_fully_opened_before: boolean;
    }[];

    expect(decisions.every((d) => d.sources_opened_before.length === 0)).toBe(
      true,
    );
    expect(
      decisions.every(
        (d) => d.any_establishing_set_fully_opened_before === false,
      ),
    ).toBe(true);
    expect(correct.value).toBe(6);

    const incorrect = row(log([start, answerSixNoResults(ALL_WRONG)]));

    expect(incorrect.value).toBe(0);
    expect(incorrect.denominator).toBe(6);

    const opened = row(
      log([
        start,
        openSources(['p1_m1', 'p1_g1', 'p1_m4', 'p1_g2']),
        answerSixNoResults(ALL_KEYS),
      ]),
    );
    const d = opened.components.decisions as typeof decisions;

    expect(d[0].sources_opened_before).toEqual([
      'p1_m1',
      'p1_g1',
      'p1_m4',
      'p1_g2',
    ]);
    expect(d[0].establishing_sets[0]).toMatchObject({
      opened_before: 3,
      all_opened_before: true,
    });
    expect(d[0].any_establishing_set_fully_opened_before).toBe(true);
    expect(d[1].establishing_sets[0]).toMatchObject({
      opened_before: 0,
      all_opened_before: false,
    });
    // P1-D3: two sets reported; the elimination set partly opened.
    expect(d[2].establishing_sets.map((set) => set.opened_before)).toEqual([
      0, 4,
    ]);
    expect(opened.components.source_openings).toMatchObject({
      p1: {
        sources_available: PACKET_SOURCES.p1,
        sources_opened: ['p1_m1', 'p1_g1', 'p1_m4', 'p1_g2'],
      },
      p2: { sources_available: PACKET_SOURCES.p2, sources_opened: [] },
    });
    expect(opened.value).toBe(6);
  });

  test('the completed row is stable: results unopened, opened, after leaving and after the review give the identical observed row', () => {
    const base = log([start, answerSixNoResults(ALL_KEYS)]);
    const withResults = log([
      start,
      answerAll(ALL_KEYS),
      (r) =>
        m14sResultsNavigate(
          r.s,
          'next',
          'pointer',
          r.tick(M14_SETTLE_MS + 10),
          r.sink,
        ),
    ]);
    const withLeave = log([
      start,
      answerAll(ALL_KEYS),
      leave,
      (r) => m14sLeave(r.s, r.tick(10), r.sink),
    ]);
    const strip = (record: ReturnType<typeof row>) => {
      const rest: Record<string, unknown> = { ...record };
      const comps = { ...(record.components as Record<string, unknown>) };

      delete rest.supporting_sequences;
      delete comps.results_shown;
      delete comps.help_consults;

      return { ...rest, components: comps };
    };
    const reference = strip(row(base));

    expect(reference.disposition).toBe('observed');
    expect(strip(row(withResults))).toEqual(reference);
    expect(strip(row(withLeave))).toEqual(reference);
    expect(strip(row(base, CLOSED))).toEqual(reference);
    expect(strip(row(withResults, CLOSED))).toEqual(reference);
    expect(row(withResults).components.results_shown).toEqual({
      p1: true,
      p2: true,
    });
  });

  test('one to five answered and closed at the review ⇒ incomplete with the value and denominator; omissions listed apart', () => {
    const r = row(
      log([start, answerAll(['a', 'cannot_solve']), closeAtReview]),
      CLOSED,
    );

    expect(r).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(r.included_ids).toEqual(['p1_d1', 'p1_d2']);
    expect(r.components.omissions).toEqual({
      unanswered_decision_ids: ['p1_d3'],
      unpresented_decision_ids: ['p2_d1', 'p2_d2', 'p2_d3'],
    });
    expect(r.components.by_packet).toMatchObject({
      p1: {
        numerator: 1,
        denominator: 2,
        unanswered_decision_ids: ['p1_d3'],
        unpresented_decision_ids: [],
      },
      p2: {
        numerator: 0,
        denominator: 0,
        unanswered_decision_ids: [],
        unpresented_decision_ids: ['p2_d1', 'p2_d2', 'p2_d3'],
      },
    });
    expect(
      (r.components.decisions as { correct: boolean | null }[]).map(
        (d) => d.correct,
      ),
    ).toEqual([true, false, null, null, null, null]);
    expect(
      row(log([start, answerAll(ALL_KEYS.slice(0, 5)), closeAtReview]), CLOSED),
    ).toMatchObject({ value: 5, denominator: 5, disposition: 'incomplete' });
  });

  test('open with answers ⇒ pending with the answers so far in the components', () => {
    const r = row(log([start, answerAll(['a', 'b', 'd'])]));

    expect(r).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'pending',
    });
    expect(r.included_ids).toEqual(['p1_d1', 'p1_d2', 'p1_d3']);
    expect(r.components.decisions_answered).toBe(3);
    expect(r.components.first_response_phase_complete).toBe(false);
    // The same under a terminal export without a closure record.
    expect(row(log([start, answerAll(['a'])]), CLOSED).disposition).toBe(
      'pending',
    );
  });
});

test.describe('M14 extractor — zero evidence and legitimate missingness (never technical_failure)', () => {
  test('never briefed, never opened ⇒ not_presented (also at the review closure); briefed and never opened ⇒ pending, then no_eligible_event with briefed_not_opened', () => {
    expect(row([])).toMatchObject({
      disposition: 'not_presented',
      value: null,
    });
    expect(row([], CLOSED).disposition).toBe('not_presented');
    expect(
      row(log([], { opened: false, absentAtReview: true }), CLOSED),
    ).toMatchObject({
      disposition: 'not_presented',
      value: null,
    });

    const pending = row(log([], { opened: false, briefed: true }));

    expect(pending).toMatchObject({
      disposition: 'pending',
      value: null,
      missing_reason: 'briefed_not_opened',
    });
    expect(pending.components.exposure).toMatchObject({
      briefed: true,
      desk_opened: false,
      decisions_presented: 0,
      packets_presented: 0,
    });

    const closed = row(
      log([], { opened: false, briefed: true, absentAtReview: true }),
      CLOSED,
    );

    expect(closed).toMatchObject({
      disposition: 'no_eligible_event',
      value: null,
      missing_reason: 'briefed_not_opened',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(closed.components.exposure).toMatchObject({
      briefed: true,
      desk_opened: false,
    });
  });

  test('no log of any kind yields declined', () => {
    const logs = [
      [],
      log([], { opened: false, briefed: true }),
      log([], { opened: false, briefed: true, absentAtReview: true }),
      log([]),
      log([start]),
      log([start, closeAtReview]),
      log([start, answerAll(['a']), closeAtReview]),
      log([start, answerSixNoResults(ALL_KEYS)]),
    ];

    for (const events of logs) {
      expect(row(events).disposition).not.toBe('declined');
      expect(row(events, CLOSED).disposition).not.toBe('declined');
    }
  });

  test('the exposure stages are distinct: briefed / opened / orientation / decisions presented', () => {
    const orientation = row(log([], { briefed: true }));

    expect(orientation.components.exposure).toMatchObject({
      briefed: true,
      desk_opened: true,
      orientation_acknowledged: false,
      decisions_presented: 0,
    });
    expect(orientation.disposition).toBe('pending');

    const presented = row(log([start], { briefed: true }));

    expect(presented.components.exposure).toMatchObject({
      briefed: true,
      desk_opened: true,
      orientation_acknowledged: true,
      packets_presented: 1,
      decisions_presented: 1,
      stage_at_open: 'incident_handover',
    });

    // A desk opened before the briefing: briefed false, a valid record.
    expect(row(log([start])).components.exposure).toMatchObject({
      briefed: false,
      desk_opened: true,
    });
  });

  test('never opened after a reload ⇒ interrupted; orientation only or presented-unanswered and closed at the review ⇒ no_eligible_event; still open ⇒ pending; held back ⇒ interrupted; a fault ⇒ technical_failure', () => {
    const reloaded = { ...CONTEXT, pageLoadIndex: 2, reloaded: true };

    expect(row([], reloaded)).toMatchObject({ disposition: 'interrupted' });
    expect(
      row(
        log([], { opened: false, briefed: true, pageLoadIndex: 2 }),
        reloaded,
      ),
    ).toMatchObject({ disposition: 'interrupted' });

    expect(row(log([closeAtReview]), CLOSED)).toMatchObject({
      disposition: 'no_eligible_event',
      value: null,
      missing_reason: 'orientation_only',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(row(log([start, closeAtReview]), CLOSED)).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'opened_no_first_response',
      censored: true,
    });
    expect(row(log([start, openSources(['p1_m1'])]), CLOSED)).toMatchObject({
      disposition: 'pending',
    });

    const heldBack = log([], { pageLoadIndex: 2 }).slice(0, 0);
    const holdBackEvent: RawGameEvent = {
      session_id: 'GS',
      timestamp_ms: 5,
      scene: 'station_concourse',
      event_type: `${M14_FAMILY}technical_failure`,
      sequence: 7,
      page_load_index: 2,
      metadata: {
        ...kitFields(),
        detail: M14_RELOAD_DETAIL,
        input_mode: 'system',
      },
    };

    expect(row([...heldBack, holdBackEvent], reloaded)).toMatchObject({
      disposition: 'interrupted',
      value: null,
    });
    expect(row([holdBackEvent], reloaded).components).toMatchObject({
      held_back_after_reload: true,
    });
    // A briefing acknowledged in the held-back load is still read.
    const presentedAfterHoldBack: RawGameEvent = {
      ...holdBackEvent,
      event_type: `${M14_FAMILY}presented`,
      sequence: 8,
      metadata: { ...kitFields(), input_mode: 'system' },
    };

    expect(
      row([holdBackEvent, presentedAfterHoldBack], reloaded),
    ).toMatchObject({ disposition: 'interrupted' });
    expect(
      row([holdBackEvent, presentedAfterHoldBack], reloaded).components,
    ).toMatchObject({
      held_back_after_reload: true,
      exposure: { briefed: true, never_opened_reason: 'briefed_not_opened' },
    });

    const fault = row(
      log([
        start,
        answerAll(['a']),
        (r) => {
          m14sFail(r.s, 'surface fault');
          r.events.push({
            suffix: 'technical_failure',
            metadata: { detail: 'surface fault', input_mode: 'system' },
          });
        },
      ]),
    );

    expect(fault).toMatchObject({
      disposition: 'technical_failure',
      value: null,
      closure_reason: 'technical_failure',
    });
    expect(fault.components.decisions_answered).toBe(1);
    expect(fault.included_ids).toEqual(['p1_d1']);
  });

  test('after a reload a load with no opening of its own is interrupted even when its presented record has no usable sequence; the never-opened reason is in the components', () => {
    const reloaded = { ...CONTEXT, pageLoadIndex: 2, reloaded: true };
    const presentedOnly = log([], {
      opened: false,
      briefed: true,
      pageLoadIndex: 2,
    }).map((event) => ({ ...event, sequence: undefined }));

    expect(row(presentedOnly, reloaded)).toMatchObject({
      disposition: 'interrupted',
      value: null,
    });
    expect(row(presentedOnly, reloaded).components.exposure).toMatchObject({
      briefed: true,
      never_opened_reason: 'briefed_not_opened',
    });

    expect(
      row(log([], { opened: false, briefed: true })).components.exposure,
    ).toMatchObject({
      never_opened_reason: 'briefed_not_opened',
    });
    expect(
      row(
        log([], { opened: false, briefed: true, absentAtReview: true }),
        CLOSED,
      ).components.exposure,
    ).toMatchObject({
      never_opened_reason: 'briefed_not_opened',
    });
    expect(row([]).components.exposure).toMatchObject({
      never_opened_reason: 'not_briefed_not_opened',
    });
    expect(row(log([start])).components.exposure).toMatchObject({
      never_opened_reason: null,
    });
  });

  test('a reload after a completed series ⇒ interrupted in the new load, the earlier events unchanged', () => {
    const earlier = log([start, answerAll(ALL_KEYS)]);
    const before = JSON.stringify(earlier);
    const reloaded = {
      finalCoreClosed: false,
      pageLoadIndex: 2,
      reloaded: true,
    };

    expect(row(earlier, reloaded)).toMatchObject({
      disposition: 'interrupted',
      value: null,
    });
    expect(JSON.stringify(earlier)).toBe(before);
    // The earlier load itself reads the completed row.
    expect(row(earlier)).toMatchObject({ disposition: 'observed', value: 6 });
  });

  test('every legitimate-missingness case is not a technical failure', () => {
    const cases = [
      row([]),
      row(log([], { opened: false, briefed: true })),
      row(
        log([], { opened: false, briefed: true, absentAtReview: true }),
        CLOSED,
      ),
      row(log([])),
      row(log([closeAtReview]), CLOSED),
      row(log([start])),
      row(log([start, closeAtReview]), CLOSED),
      row(log([start, answerAll(['a', 'b'])])),
      row(log([start, answerAll(['a', 'b']), closeAtReview]), CLOSED),
      row(log([start, answerSixNoResults(ALL_KEYS)])),
      row(log([start, answerAll(ALL_KEYS)])),
      row(log([start, openSources(['p1_m1', 'p1_m1', 'p1_m1'])])),
      row(log([start, (r) => m14sHelp(r.s, 'keyboard', r.tick(10), r.sink)])),
    ];

    for (const record of cases) {
      expect(record.disposition).not.toBe('technical_failure');
    }
  });
});

/** Rewrites one event's metadata (returns a new log). */
function patch(
  events: RawGameEvent[],
  suffix: string,
  change: (metadata: Record<string, unknown>) => Record<string, unknown>,
  which = 0,
): RawGameEvent[] {
  let seen = 0;

  return events.map((event) => {
    if (event.event_type !== `${M14_FAMILY}${suffix}`) {
      return event;
    }

    seen += 1;

    return seen - 1 === which
      ? { ...event, metadata: change({ ...(event.metadata ?? {}) }) }
      : event;
  });
}

test.describe('M14 extractor — integrity (technical_failure for contradictory or unverifiable scored evidence)', () => {
  const complete = () => log([start, answerSixNoResults(ALL_KEYS)]);
  const partial = () => log([start, answerAll(['a'])]);

  const expectFailure = (events: RawGameEvent[], context = CONTEXT) => {
    const record = row(events, context);

    expect(record.disposition).toBe('technical_failure');
    expect(record.value).toBeNull();

    return record;
  };

  test('duplicate first response, unknown or mismatched version, unknown ids, an option of another decision, a wrong content version', () => {
    const dup = partial();
    const response = dup.find(
      (e) => e.event_type === `${M14_FAMILY}first_response`,
    )!;

    expectFailure([...dup, { ...response, sequence: 999 }]);
    expectFailure(
      log([start, answerAll(['a'])], { version: 'm14-integration-v0' }),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({
        ...m,
        entry_state_version: 'other',
      })),
    );
    expectFailure(
      log([start, answerAll(['a'])], {
        opportunity: 'proto_m14_incident_desk',
      }),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({ ...m, packet_id: 'p9' })),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({
        ...m,
        decision_id: 'p1_d9',
      })),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({
        ...m,
        option_id: 'p1_d1_z',
      })),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({
        ...m,
        option_id: 'p1_d2_a',
      })),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({
        ...m,
        content_version: 'm14-p2-v1',
      })),
    );
    expectFailure(
      patch(partial(), 'packet_presented', (m) => ({
        ...m,
        content_version: 'm14-p1-v2',
      })),
    );
  });

  test('out-of-order or doubled presentation of a decision or packet; a response without presentation', () => {
    const events = log([start, answerAll(['a', 'b'])]);
    const presentations = events.filter(
      (e) => e.event_type === `${M14_FAMILY}decision_presented`,
    );

    expectFailure([...events, { ...presentations[0], sequence: 998 }]);
    expectFailure(
      patch(
        events,
        'decision_presented',
        (m) => ({
          ...m,
          decision_id: 'p1_d3',
          decision_index: 3,
          decision_global_index: 3,
        }),
        1,
      ),
    );
    expectFailure([
      ...events,
      {
        ...events.find(
          (e) => e.event_type === `${M14_FAMILY}packet_presented`,
        )!,
        sequence: 997,
      },
    ]);
    expectFailure(
      patch(log([start, answerAll(['a'])]), 'packet_presented', (m) => ({
        ...m,
        packet_id: 'p2',
        packet_index: 2,
        content_version: 'm14-p2-v1',
      })),
    );
    expectFailure(
      events.filter((e) => e.event_type !== `${M14_FAMILY}decision_presented`),
    );
    // A decision presented before the previous first response.
    const early = log([start, answerAll(['a'])]);
    const second = early.filter(
      (e) => e.event_type === `${M14_FAMILY}decision_presented`,
    )[1];
    const first = early.find(
      (e) => e.event_type === `${M14_FAMILY}first_response`,
    )!;

    const reordered = early.filter((e) => e !== second);

    reordered.splice(reordered.indexOf(first), 0, second);
    expectFailure(reordered.map((e, i) => ({ ...e, sequence: 100 + i })));
  });

  test('a correct flag contradicting the key, Cannot solve marked correct, a missing option id, a non-boolean correct, a key disagreeing with the content', () => {
    expectFailure(
      patch(partial(), 'first_response', (m) => ({ ...m, correct: false })),
    );
    expectFailure(
      patch(
        log([start, answerAll(['cannot_solve'])]),
        'first_response',
        (m) => ({ ...m, correct: true }),
      ),
    );
    expectFailure(
      patch(
        log([start, answerAll(['cannot_solve'])]),
        'first_response',
        (m) => ({ ...m, option_id: 'p1_d1_a' }),
      ),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({ ...m, option_id: null })),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({ ...m, correct: 'yes' })),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({
        ...m,
        key_option_id: 'p1_d1_b',
      })),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({
        ...m,
        response_kind: 'layout',
      })),
    );
    expectFailure(
      patch(partial(), 'first_response', (m) => ({ ...m, phase: 'feedback' })),
    );
  });

  test('a first response after completion, six responses without the snapshot, a disagreeing snapshot, results before the sixth response', () => {
    const done = complete();
    const sixth = [...done]
      .reverse()
      .find((e) => e.event_type === `${M14_FAMILY}first_response`)!;

    expectFailure([
      ...done,
      {
        ...sixth,
        sequence: 996,
        metadata: { ...sixth.metadata, decision_id: 'p2_d3' },
      },
    ]);
    expectFailure(
      done.filter(
        (e) => e.event_type !== `${M14_FAMILY}first_responses_completed`,
      ),
    );
    expectFailure(
      patch(done, 'first_responses_completed', (m) => ({
        ...m,
        correct_first_decisions: 5,
      })),
    );
    expectFailure(
      patch(done, 'first_responses_completed', (m) => ({
        ...m,
        decisions_answered: 5,
      })),
    );
    expectFailure(
      patch(
        log([start, answerAll(['a']), closeAtReview]),
        'series_closed_at_review',
        (m) => ({ ...m, correct_first_decisions: 0 }),
      ),
      CLOSED,
    );

    const early = log([start, answerAll(['a'])]);

    expectFailure([
      ...early,
      {
        ...early[0],
        event_type: `${M14_FAMILY}results_shown`,
        sequence: 995,
        metadata: {
          ...kitFields(),
          phase: 'feedback',
          packet_id: 'p1',
          line_ids: [],
          input_mode: 'keyboard',
        },
      },
    ]);
    // Also in a series that never reaches six and is closed at the review.
    const closed = log([start, answerAll(['a']), closeAtReview]);
    const resultsEvent = {
      ...closed[0],
      event_type: `${M14_FAMILY}results_shown`,
      sequence: 150,
      metadata: {
        ...kitFields(),
        phase: 'feedback',
        packet_id: 'p1',
        line_ids: [],
        input_mode: 'keyboard',
      },
    };
    const index = closed.findIndex(
      (e) => e.event_type === `${M14_FAMILY}series_closed_at_review`,
    );

    expectFailure(
      [...closed.slice(0, index), resultsEvent, ...closed.slice(index)].map(
        (e, i) => ({ ...e, sequence: 100 + i }),
      ),
      CLOSED,
    );
  });

  test('missing, zero, negative, fractional, string or duplicated sequence numbers', () => {
    const base = complete();
    const sequences = [undefined, 0, -3, 1.5, '12', 'dup'] as const;

    for (const bad of sequences) {
      const events = base.map((e, i) =>
        i === 4
          ? {
              ...e,
              sequence:
                bad === 'dup' ? base[3].sequence : (bad as number | undefined),
            }
          : e,
      );

      expectFailure(events as RawGameEvent[]);
    }

    // Gaps are normal.
    expect(
      row(base.map((e, i) => ({ ...e, sequence: 100 + i * 7 }))).disposition,
    ).toBe('observed');
  });

  test('an unscored-record defect flags the components and leaves the row unchanged', () => {
    const events = log([start, answerSixNoResults(ALL_KEYS)]);
    const orphanClose: RawGameEvent = {
      ...events[2],
      event_type: `${M14_FAMILY}source_closed`,
      sequence: 102.5 + 0.5,
      metadata: {
        ...kitFields(),
        phase: 'measurement',
        packet_id: 'p1',
        source_id: 'p1_m2',
        source_kind: 'message',
        input_mode: 'pointer',
      },
    };
    const renumbered = [
      ...events.slice(0, 3),
      orphanClose,
      ...events.slice(3),
    ].map((e, i) => ({ ...e, sequence: 100 + i }));
    const clean = row(events);
    const flagged = row(renumbered);

    expect(clean.components.exposure_record_consistent).toBe(true);
    expect(flagged.components.exposure_record_consistent).toBe(false);
    expect({
      ...flagged,
      components: null,
      supporting_sequences: null,
    }).toEqual({ ...clean, components: null, supporting_sequences: null });

    const orphanDraft = patch(events, 'first_response', (m) => ({
      ...m,
      sources_opened_before: ['p1_m9'],
    }));

    expect(row(orphanDraft)).toMatchObject({
      value: 6,
      disposition: 'observed',
    });
    expect(row(orphanDraft).components.exposure_record_consistent).toBe(false);
  });

  test('determinism: the same log gives identical rows; the input is not mutated; the row equals the full extraction’s row', () => {
    const events = log([
      start,
      openSources(['p1_m1']),
      answerAll(['a', 'cannot_solve']),
      closeAtReview,
    ]);
    const before = JSON.stringify(events);
    const first = row(events, CLOSED);
    const second = row(events, CLOSED);

    expect(second).toEqual(first);
    expect(JSON.stringify(events)).toBe(before);

    const full = extractMeasurementFeatures(events, CLOSED).filter(
      (r) => r.item_id === 'M14',
    );

    expect(full).toHaveLength(1);
    expect(full[0]).toEqual(first);
    expect(first.supporting_sequences).toEqual(events.map((e) => e.sequence));
  });
});
