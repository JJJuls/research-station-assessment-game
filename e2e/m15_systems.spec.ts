/**
 * Station 080 M15 — two relay boxes with immutable first predictions
 * (Unit 18, administration `m15-systems-v1`), pure tests.
 *
 * Playwright test blocks that never touch `page`:
 * - the INDEPENDENT ORACLE: this file carries its own transcription of
 *   each box's links, the four question situations, the wiring options as
 *   link sets and the keys, written by hand from `U18-STIMULUS-PREVIEW.md`
 *   r5 §4–§5, and its own step simulator written from preview §2 (with
 *   the analysis conventions of §7.2) — it imports nothing from
 *   `m15SystemsContent.ts` or `m15SystemsModel.ts` for the expected side.
 *   It reproduces the test listings, enumerates every signed acyclic
 *   wiring (79 461 per box), derives every key, checks the test
 *   dependence over all wirings and among the four offered options, and
 *   REPORTS (never asserts) the surface cues of preview §7.5; a
 *   cross-check then binds the module's text to the transcription;
 * - the register row and route, and the cipher's secondary identity;
 * - the series model under research-owner decision D-U18-1: no
 *   correctness information before the fourth first response, wirings
 *   and first responses written once and never changed, the fresh-press
 *   rule, the settle on every view transition, tests closing at the
 *   wiring, drafts that never count;
 * - the read-only extractor on synthetic logs: values, companions,
 *   legitimate missingness, technical failure for contradictory or
 *   unverifiable scored evidence, determinism;
 * - the wording of the bench.
 *
 * Nothing here establishes psychometric validity: the four predictions
 * are repeated observations inside one bench episode, clustered in two
 * boxes, and are not claimed to be equal in difficulty; a correct answer
 * never proves testing or understanding.
 */
import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import {
  extractItemFeatures,
  extractMeasurementFeatures,
} from '../src/measurement/features';
import { REGISTER_V3, registerEntry } from '../src/measurement/registerV3';
import { PILOT_SCHEDULE } from '../src/pilot/coverageSchedule';
import {
  type M15SurfaceHost,
  m15SurfaceModel,
} from '../src/pilot/windows/m15SurfaceModel';
import {
  M15_ASSIGNED_BOX_ORDER,
  M15_BOXES,
  M15_ENTRY_STATE_VERSION,
  M15_FAMILY,
  M15_OPPORTUNITY_ID,
  M15_SETTLE_MS,
  M15_TEXT,
  M15_WINDOW_ID,
  type M15Box,
  m15Box,
  type M15BoxId,
  m15FirstResponsePhaseStrings,
  m15OrientationAndHelpStrings,
  m15ParticipantStrings,
  m15Questions,
  m15WiringText,
} from '../src/pilot/windows/m15SystemsContent';
import {
  createM15Series,
  M15_ACK_LINE_ID,
  M15_EVENT_SUFFIXES,
  M15_RELOAD_DETAIL,
  M15_WIRING_ACK_LINE_ID,
  m15AnsweredCount,
  m15AnswerUnder,
  m15EntrySnapshot,
  type M15LogSink,
  m15PriorAdministration,
  m15PriorLoadCheck,
  m15sCancelCommit,
  m15sCloseAtReview,
  m15sCloseHelp,
  m15sConfirmCommit,
  m15sDraft,
  type M15Series,
  m15sFail,
  m15sFinish,
  m15sHelp,
  m15sHoldBack,
  m15sLeave,
  m15sNext,
  m15sOpen,
  m15sRequestCommit,
  m15sResultsNavigate,
  m15sStart,
  m15sTest,
  m15TestListing,
  m15TestSituation,
} from '../src/pilot/windows/m15SystemsModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/* ------------------------------------------------------------------ *
 * 1. The transcription, by hand from the preview (r5 §4–§5). Letters are
 *    the preview's own; links are `FROM>TO` with +1 (raises) / −1
 *    (lowers). Nothing below is imported from the content module.
 * ------------------------------------------------------------------ */

type Sign = 1 | -1;
type Links = Record<string, Sign>;
type Word = 'up' | 'down' | 'no change';
type OptionLetter = 'a' | 'b' | 'c' | 'd';
type AnswerLetter = 'a' | 'b' | 'c';

interface HandSituation {
  lock: string[];
  boost: string[];
  turn: string[];
  ask: string;
}

interface HandQuestion {
  id: string;
  text: string;
  short: string;
  situation: HandSituation;
  key: AnswerLetter;
  results_line: string;
}

interface HandBox {
  id: 's1' | 's2';
  dials: [string, string];
  units: [string, string, string];
  links: Links;
  listings: Record<string, string>;
  options: Record<OptionLetter, { text: string; links: Links }>;
  wiring_key: OptionLetter;
  /** Which tests refute each wrong option (preview §4.3 / §5.3). */
  refuted_by: Record<OptionLetter, string[]>;
  questions: [HandQuestion, HandQuestion];
}

const WORD_OF_LETTER: Record<AnswerLetter, Word> = {
  a: 'up',
  b: 'down',
  c: 'no change',
};

const S1: HandBox = {
  id: 's1',
  dials: ['F', 'G'],
  units: ['P', 'Q', 'W'],
  links: { 'F>P': 1, 'G>P': 1, 'P>Q': -1, 'P>W': 1 },
  listings: {
    F: 'step 1: P up · step 2: Q down, W up',
    G: 'step 1: P up · step 2: Q down, W up',
  },
  options: {
    // The owner's selected alternative (decision D-U18-1, item 1).
    a: {
      text: 'F raises W. G raises W. P raises Q. W lowers P.',
      links: { 'F>W': 1, 'G>W': 1, 'P>Q': 1, 'W>P': -1 },
    },
    b: {
      text: 'F raises P. G raises P. P lowers Q. P raises W.',
      links: { 'F>P': 1, 'G>P': 1, 'P>Q': -1, 'P>W': 1 },
    },
    c: {
      text: 'F raises W. G raises P. P lowers Q. P raises W.',
      links: { 'F>W': 1, 'G>P': 1, 'P>Q': -1, 'P>W': 1 },
    },
    d: {
      text: 'F raises P. G raises W. P lowers Q. P raises W.',
      links: { 'F>P': 1, 'G>W': 1, 'P>Q': -1, 'P>W': 1 },
    },
  },
  wiring_key: 'b',
  refuted_by: { a: ['F', 'G'], b: [], c: ['F'], d: ['G'] },
  questions: [
    {
      id: 's1_q1',
      text: 'Unit P is LOCKED. Dials F and G are turned up together, one notch each. What does unit W do?',
      short: 'P locked; F and G up',
      situation: { lock: ['P'], boost: [], turn: ['F', 'G'], ask: 'W' },
      key: 'c',
      results_line:
        'With P locked, neither dial gets past P, and only P drives W. W does not move.',
    },
    {
      id: 's1_q2',
      text: 'Unit W is LOCKED and unit P is BOOSTED; no dial moves. What does unit Q do?',
      short: 'W locked; P boosted',
      situation: { lock: ['W'], boost: ['P'], turn: [], ask: 'Q' },
      key: 'b',
      results_line:
        'P lowers Q directly; W drives nothing, so locking W changes nothing for Q. Q goes down.',
    },
  ],
};

const S2: HandBox = {
  id: 's2',
  dials: ['S', 'T'],
  units: ['X', 'Y', 'Z'],
  links: { 'S>X': -1, 'X>Y': 1, 'Y>Z': -1, 'T>Y': -1 },
  listings: {
    S: 'step 1: X down · step 2: Y down · step 3: Z up',
    T: 'step 1: Y down · step 2: Z up',
  },
  options: {
    a: {
      text: 'S lowers X. X lowers Y. Y lowers Z. T lowers Y.',
      links: { 'S>X': -1, 'X>Y': -1, 'Y>Z': -1, 'T>Y': -1 },
    },
    b: {
      text: 'S lowers X. X lowers Y. Y lowers Z. T raises Z.',
      links: { 'S>X': -1, 'X>Y': -1, 'Y>Z': -1, 'T>Z': 1 },
    },
    c: {
      text: 'S lowers X. X raises Y. Y lowers Z. T raises Z.',
      links: { 'S>X': -1, 'X>Y': 1, 'Y>Z': -1, 'T>Z': 1 },
    },
    d: {
      text: 'S lowers X. X raises Y. Y lowers Z. T lowers Y.',
      links: { 'S>X': -1, 'X>Y': 1, 'Y>Z': -1, 'T>Y': -1 },
    },
  },
  wiring_key: 'd',
  refuted_by: { a: ['S'], b: ['S', 'T'], c: ['T'], d: [] },
  questions: [
    {
      id: 's2_q1',
      text: 'Nothing is locked and no dial moves. Unit X is BOOSTED. What does unit Z do?',
      short: 'X boosted',
      situation: { lock: [], boost: ['X'], turn: [], ask: 'Z' },
      key: 'b',
      results_line:
        'X raises Y, and Y lowers Z: when X goes up, Y goes up and then Z goes down.',
    },
    {
      id: 's2_q2',
      text: 'Unit Y is LOCKED. Dial T is turned up one notch. What does unit Z do?',
      short: 'Y locked; T up',
      situation: { lock: ['Y'], boost: [], turn: ['T'], ask: 'Z' },
      key: 'c',
      results_line:
        'T reaches Z only through Y. With Y locked, the change stops at Y. Z does not move.',
    },
  ],
};

const HAND: Record<'s1' | 's2', HandBox> = { s1: S1, s2: S2 };
const OPTION_LETTERS: readonly OptionLetter[] = ['a', 'b', 'c', 'd'];

/** Preview §7.1 — answers possible given no test / first dial / second dial / both. */
const ANSWERS_POSSIBLE: Record<string, [number, number, number, number]> = {
  s1_q1: [3, 3, 3, 1],
  s1_q2: [3, 1, 1, 1],
  s2_q1: [3, 1, 3, 1],
  s2_q2: [3, 3, 1, 1],
};

/** Preview §7.1 — the answer under the "each dial drives everything that moved" reading. */
const ASSOCIATION_ANSWER: Record<string, Word> = {
  s1_q1: 'up',
  s1_q2: 'no change',
  s2_q1: 'no change',
  s2_q2: 'up',
};

/** Preview §7.1 — answers under each wiring option (A / B / C / D). */
const ANSWERS_UNDER_OPTIONS: Record<string, [Word, Word, Word, Word]> = {
  s1_q1: ['up', 'no change', 'up', 'up'],
  s1_q2: ['up', 'down', 'down', 'down'],
  s2_q1: ['up', 'up', 'down', 'down'],
  s2_q2: ['no change', 'up', 'up', 'no change'],
};

/** Preview §7.4 — the offered options left after each test subset. */
const OFFERED_LEFT: Record<'s1' | 's2', Record<string, OptionLetter[]>> = {
  s1: {
    none: ['a', 'b', 'c', 'd'],
    F: ['b', 'd'],
    G: ['b', 'c'],
    'F+G': ['b'],
  },
  s2: {
    none: ['a', 'b', 'c', 'd'],
    S: ['c', 'd'],
    T: ['a', 'd'],
    'S+T': ['d'],
  },
};

/** Preview §7.4 — the answers among the options left (sorted). */
const OFFERED_ANSWERS: Record<string, Record<string, Word[]>> = {
  s1_q1: {
    none: ['no change', 'up'],
    F: ['no change', 'up'],
    G: ['no change', 'up'],
    'F+G': ['no change'],
  },
  s1_q2: { none: ['down', 'up'], F: ['down'], G: ['down'], 'F+G': ['down'] },
  s2_q1: {
    none: ['down', 'up'],
    S: ['down'],
    T: ['down', 'up'],
    'S+T': ['down'],
  },
  s2_q2: {
    none: ['no change', 'up'],
    S: ['no change', 'up'],
    T: ['no change'],
    'S+T': ['no change'],
  },
};

/* ------------------------------------------------------------------ *
 * 2. The oracle's own simulator (preview §2; analysis conventions §7.2).
 * ------------------------------------------------------------------ */

interface Trace {
  steps: { step: number; moves: [string, Word][] }[];
  totals: Record<string, number>;
  magnitude_dependent: boolean;
}

const word = (value: number): Word =>
  value > 0 ? 'up' : value < 0 ? 'down' : 'no change';

function simulate(box: HandBox, links: Links, situation: HandSituation): Trace {
  const locked = new Set(situation.lock);
  const totals: Record<string, number> = Object.fromEntries(
    box.units.map((unit) => [unit, 0]),
  );
  const movedAt = new Map<string, number>();
  let wave = new Map<string, number>();
  let magnitudeDependent = false;

  for (const node of [...situation.turn, ...situation.boost]) {
    wave.set(node, (wave.get(node) ?? 0) + 1);
  }

  const steps: Trace['steps'] = [];

  for (let step = 1; step <= 10 && wave.size > 0; step += 1) {
    const next = new Map<string, number>();
    const signs = new Map<string, Set<number>>();

    for (const [from, amount] of wave) {
      if (locked.has(from)) {
        continue;
      }

      for (const [key, sign] of Object.entries(links)) {
        const [a, b] = key.split('>');

        if (a !== from || locked.has(b)) {
          continue;
        }

        const change = sign * amount;

        next.set(b, (next.get(b) ?? 0) + change);
        signs.set(b, (signs.get(b) ?? new Set()).add(Math.sign(change)));
      }
    }

    for (const seen of signs.values()) {
      if (seen.size > 1) {
        magnitudeDependent = true;
      }
    }

    const moves: [string, Word][] = [];

    for (const unit of box.units) {
      const change = next.get(unit) ?? 0;

      if (change !== 0) {
        moves.push([unit, word(change)]);
        totals[unit] += change;
        movedAt.set(unit, (movedAt.get(unit) ?? 0) + 1);
      }
    }

    if (moves.length > 0) {
      steps.push({ step, moves });
    }

    wave = new Map([...next].filter(([, change]) => change !== 0));
  }

  for (const count of movedAt.values()) {
    if (count > 1) {
      magnitudeDependent = true;
    }
  }

  return { steps, totals, magnitude_dependent: magnitudeDependent };
}

const listingText = (trace: Trace) =>
  trace.steps
    .map(
      (step) =>
        `step ${step.step}: ` +
        step.moves
          .map(([unit, direction]) => `${unit} ${direction}`)
          .join(', '),
    )
    .join(' · ');

/** The listing with its first step removed and renumbered. */
const shiftedText = (trace: Trace) =>
  listingText({
    ...trace,
    steps: trace.steps
      .slice(1)
      .map((step, index) => ({ step: index + 1, moves: step.moves })),
  });

const testTrace = (box: HandBox, links: Links, dial: string) =>
  simulate(box, links, { lock: [], boost: [], turn: [dial], ask: '' });

/** What a set of tests shows under a wiring (the observation). */
const observe = (box: HandBox, links: Links, tests: string[]) =>
  tests.map((dial) => listingText(testTrace(box, links, dial))).join(' || ');

const answerWord = (box: HandBox, links: Links, question: HandQuestion) => {
  const trace = simulate(box, links, question.situation);

  return {
    word: word(trace.totals[question.situation.ask]),
    magnitude_dependent: trace.magnitude_dependent,
    trace,
  };
};

function acyclic(nodes: string[], links: Links): boolean {
  const adjacency = new Map<string, string[]>(nodes.map((node) => [node, []]));

  for (const key of Object.keys(links)) {
    const [a, b] = key.split('>');

    adjacency.get(a)!.push(b);
  }

  const state = new Map<string, 1 | 2>();
  const visit = (node: string): boolean => {
    if (state.get(node) === 1) {
      return false;
    }

    if (state.get(node) === 2) {
      return true;
    }

    state.set(node, 1);

    for (const next of adjacency.get(node) ?? []) {
      if (!visit(next)) {
        return false;
      }
    }

    state.set(node, 2);

    return true;
  };

  return nodes.every(visit);
}

/** Every signed acyclic wiring on the box's two dials and three units. */
function allWirings(box: HandBox): Links[] {
  const pairs: string[] = [];

  for (const dial of box.dials) {
    for (const unit of box.units) {
      pairs.push(`${dial}>${unit}`);
    }
  }

  for (const from of box.units) {
    for (const to of box.units) {
      if (from !== to) {
        pairs.push(`${from}>${to}`);
      }
    }
  }

  expect(pairs).toHaveLength(12);

  const nodes = [...box.dials, ...box.units];
  const out: Links[] = [];
  const total = 3 ** pairs.length;

  for (let code = 0; code < total; code += 1) {
    let rest = code;
    const links: Links = {};

    for (const pair of pairs) {
      const digit = rest % 3;

      rest = Math.floor(rest / 3);

      if (digit === 1) {
        links[pair] = 1;
      } else if (digit === 2) {
        links[pair] = -1;
      }
    }

    if (acyclic(nodes, links)) {
      out.push(links);
    }
  }

  return out;
}

const sameLinks = (a: Links, b: Links) => {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();

  return (
    keysA.length === keysB.length &&
    keysA.every((key, index) => key === keysB[index] && a[key] === b[key])
  );
};

const subsets = (dials: [string, string]) => [
  { label: 'none', tests: [] as string[] },
  { label: dials[0], tests: [dials[0]] },
  { label: dials[1], tests: [dials[1]] },
  { label: `${dials[0]}+${dials[1]}`, tests: [dials[0], dials[1]] },
];

/** The wirings cached per box (the enumeration takes a few seconds). */
const WIRINGS = new Map<string, Links[]>();

const wiringsOf = (box: HandBox) => {
  let cached = WIRINGS.get(box.id);

  if (cached === undefined) {
    cached = allWirings(box);
    WIRINGS.set(box.id, cached);
  }

  return cached;
};

/* ------------------------------------------------------------------ *
 * 3. The oracle: keys, test dependence, unseen-ness, offered options
 * ------------------------------------------------------------------ */

test.describe('M15 oracle — keys derived independently of the implementation', () => {
  test.setTimeout(300_000);

  for (const box of [S1, S2]) {
    test(`${box.id}: the simulator reproduces the preview's test listings and the module's listings equal them`, () => {
      for (const dial of box.dials) {
        const trace = testTrace(box, box.links, dial);

        expect(listingText(trace)).toBe(box.listings[dial]);
        expect(trace.magnitude_dependent).toBe(false);
      }

      // The implementation side: the model's simulator over the content.
      const module = m15Box(box.id);

      module.dials.forEach((dial, position) => {
        expect(m15TestListing(module, dial.id)).toBe(
          box.listings[box.dials[position]],
        );
      });
    });

    test(`${box.id}: of 79 461 signed acyclic wirings exactly one is consistent with both tests — the transcribed station wiring`, () => {
      const wirings = wiringsOf(box);

      expect(wirings).toHaveLength(79_461);

      const truth = observe(box, box.links, [...box.dials]);
      const consistent = wirings.filter(
        (links) => observe(box, links, [...box.dials]) === truth,
      );

      expect(consistent).toHaveLength(1);
      expect(sameLinks(consistent[0], box.links)).toBe(true);
    });

    test(`${box.id}: every key is the one answer over the consistent set, equals the hand key and the module's key, and needs no analysis convention`, () => {
      const module = m15Box(box.id);

      box.questions.forEach((question, position) => {
        const answer = answerWord(box, box.links, question);

        expect(answer.magnitude_dependent).toBe(false);
        expect(answer.word).toBe(WORD_OF_LETTER[question.key]);

        const entry = module.questions[position];

        expect(entry.id).toBe(question.id);
        expect(entry.key_option_id).toBe(`${question.id}_${question.key}`);
        // The module's own simulator agrees (the implementation side).
        expect(m15AnswerUnder(module, module.links, entry)).toBe(question.key);
      });
    });

    test(`${box.id}: the "answers possible" counts per test subset equal preview §7.1, so each dial's test is needed by a question of its box (over all wirings)`, () => {
      const wirings = wiringsOf(box);

      box.questions.forEach((question) => {
        const expected = ANSWERS_POSSIBLE[question.id];

        subsets(box.dials).forEach((subset, position) => {
          const seen = observe(box, box.links, subset.tests);
          const pool = wirings.filter(
            (links) => observe(box, links, subset.tests) === seen,
          );
          const answers = new Set(
            pool.map((links) => answerWord(box, links, question).word),
          );

          expect(answers.size, `${question.id} given ${subset.label}`).toBe(
            expected[position],
          );
        });
      });

      // Each dial's test is needed by at least one question of its box
      // (some question stays open when only the other dial was tested).
      for (const dial of box.dials) {
        const other = box.dials.find((candidate) => candidate !== dial)!;
        const otherIndex = box.dials.indexOf(other) + 1;

        expect(
          box.questions.some(
            (question) => ANSWERS_POSSIBLE[question.id][otherIndex] > 1,
          ),
          `TEST ${dial} needed`,
        ).toBe(true);
      }
    });

    test(`${box.id}: exactly one offered option is consistent with both tests (the key); each other option is refuted by exactly the tests the preview names`, () => {
      for (const letter of OPTION_LETTERS) {
        const option = box.options[letter];
        const refutedBy = box.dials.filter(
          (dial) =>
            listingText(testTrace(box, option.links, dial)) !==
            box.listings[dial],
        );

        expect(refutedBy, letter).toEqual(box.refuted_by[letter]);
        expect(refutedBy.length === 0, letter).toBe(letter === box.wiring_key);
      }

      expect(sameLinks(box.options[box.wiring_key].links, box.links)).toBe(
        true,
      );

      // No two options are the same wiring.
      for (const a of OPTION_LETTERS) {
        for (const b of OPTION_LETTERS) {
          if (a < b) {
            expect(sameLinks(box.options[a].links, box.options[b].links)).toBe(
              false,
            );
          }
        }
      }
    });

    test(`${box.id}: the answers under each option equal preview §7.1, and the association reading misses every key`, () => {
      // The "each dial drives directly everything that moved in its test" reading.
      const association: Links = {};

      for (const dial of box.dials) {
        for (const step of testTrace(box, box.links, dial).steps) {
          for (const [unit, direction] of step.moves) {
            association[`${dial}>${unit}`] = direction === 'up' ? 1 : -1;
          }
        }
      }

      for (const question of box.questions) {
        const expected = ANSWERS_UNDER_OPTIONS[question.id];

        OPTION_LETTERS.forEach((letter, position) => {
          const answer = answerWord(box, box.options[letter].links, question);

          expect(answer.magnitude_dependent, `${question.id} ${letter}`).toBe(
            false,
          );
          expect(answer.word, `${question.id} ${letter}`).toBe(
            expected[position],
          );
        });

        const assoc = answerWord(box, association, question);

        expect(assoc.word).toBe(ASSOCIATION_ANSWER[question.id]);
        expect(assoc.word).not.toBe(WORD_OF_LETTER[question.key]);
      }
    });

    test(`${box.id}: among the four OFFERED options (treated as equally plausible) the options left after each test subset and the answers they imply equal preview §7.4`, () => {
      for (const subset of subsets(box.dials)) {
        const left = OPTION_LETTERS.filter((letter) =>
          subset.tests.every(
            (dial) =>
              listingText(testTrace(box, box.options[letter].links, dial)) ===
              box.listings[dial],
          ),
        );

        expect(left, subset.label).toEqual(OFFERED_LEFT[box.id][subset.label]);

        for (const question of box.questions) {
          const answers = [
            ...new Set(
              left.map(
                (letter) =>
                  answerWord(box, box.options[letter].links, question).word,
              ),
            ),
          ].sort();

          expect(answers, `${question.id} after ${subset.label}`).toEqual(
            OFFERED_ANSWERS[question.id][subset.label],
          );
        }
      }
    });

    test(`${box.id}: under each of the four OFFERED options the module's own simulator gives the oracle's answer for both questions (eight cells per box)`, () => {
      const module = m15Box(box.id);

      OPTION_LETTERS.forEach((letter, position) => {
        const option = module.wiring_options[position];

        expect(option.letter).toBe(letter);

        box.questions.forEach((question, questionPosition) => {
          const oracle = answerWord(box, box.options[letter].links, question);
          const implemented = m15AnswerUnder(
            module,
            option.links,
            module.questions[questionPosition],
          );

          expect(
            oracle.magnitude_dependent,
            `${question.id} under ${letter}`,
          ).toBe(false);
          expect(implemented, `${question.id} under ${letter}`).not.toBeNull();
          expect(WORD_OF_LETTER[implemented!]).toBe(oracle.word);
          // … and the preview §7.1 table cell (sixteen cells over both boxes).
          expect(WORD_OF_LETTER[implemented!]).toBe(
            ANSWERS_UNDER_OPTIONS[question.id][position],
          );
        });
      });
    });

    test(`${box.id}: unseen — no question's trace equals a test listing or a shortened one; the bench offers only single-dial tests`, () => {
      for (const question of box.questions) {
        const trace = listingText(answerWord(box, box.links, question).trace);

        for (const dial of box.dials) {
          const testRun = testTrace(box, box.links, dial);

          expect(trace, `${question.id} vs TEST ${dial}`).not.toBe(
            listingText(testRun),
          );
          expect(trace, `${question.id} vs shifted TEST ${dial}`).not.toBe(
            shiftedText(testRun),
          );
        }

        // A question's situation is never an exploration act: it locks,
        // boosts, turns two dials, or turns one dial with a lock.
        const { lock, boost, turn } = question.situation;

        expect(lock.length + boost.length > 0 || turn.length > 1).toBe(true);
      }

      // The exploration API: one dial up one notch, nothing else.
      const module = m15Box(box.id);

      for (const dial of module.dials) {
        expect(m15TestSituation(dial.id)).toEqual({
          locked_unit_ids: [],
          boosted_unit_ids: [],
          dials_turned_ids: [dial.id],
        });
      }

      // A TEST request names a dial; a unit is refused and records nothing.
      const s = createM15Series();
      const events: string[] = [];
      const sink: M15LogSink = (suffix) => {
        events.push(suffix);
      };

      m15sOpen(s, 0, sink);
      m15sStart(s, 'keyboard', 500, sink);
      expect(m15sTest(s, module.units[0].id, 'keyboard', 1000, sink)).toBe(
        'none',
      );
      expect(events.filter((suffix) => suffix === 'test_run')).toEqual([]);
    });
  }

  test('no exported model or surface command locks, boosts or turns two dials (by source)', () => {
    for (const file of [
      'src/pilot/windows/m15SystemsModel.ts',
      'src/pilot/windows/m15SurfaceModel.ts',
      'src/pilot/windows/m15RelayBench.ts',
    ]) {
      const source = readFileSync(file, 'utf8');
      const commands = [...source.matchAll(/export function (m15s?[A-Z]\w*)/g)]
        .map((match) => match[1])
        .filter((name) => /lock|boost|joint|turn/i.test(name));

      expect(commands, file).toEqual([]);
    }
  });

  test('the §7.5 surface cues are computed and REPORTED (never asserted)', () => {
    const report: Record<string, unknown> = {};

    for (const box of [S1, S2]) {
      const signed = (links: Links) =>
        Object.entries(links).map(
          ([key, sign]) => `${key}${sign > 0 ? '+' : '-'}`,
        );
      const occurrences = new Map<string, number>();

      for (const letter of OPTION_LETTERS) {
        for (const key of signed(box.options[letter].links)) {
          occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
        }
      }

      const reach = (links: Links, from: string[]) => {
        const seen = new Set(from);
        let grew = true;

        while (grew) {
          grew = false;

          for (const key of Object.keys(links)) {
            const [a, b] = key.split('>');

            if (seen.has(a) && !seen.has(b)) {
              seen.add(b);
              grew = true;
            }
          }
        }

        return box.units.filter((unit) => seen.has(unit)).length;
      };
      const structure = Object.fromEntries(
        OPTION_LETTERS.map((letter) => {
          const links = box.options[letter].links;
          const keys = signed(links);
          const others = keys.map((key) => (occurrences.get(key) ?? 1) - 1);
          const swapped: Links = Object.fromEntries(
            Object.entries(links).map(([key, sign]) => [
              key
                .replace(box.dials[0], '#')
                .replace(box.dials[1], box.dials[0])
                .replace('#', box.dials[1]),
              sign,
            ]),
          );
          const distances = Object.fromEntries(
            OPTION_LETTERS.filter((other) => other !== letter).map((other) => {
              const a = new Set(keys);
              const b = new Set(signed(box.options[other].links));

              return [
                other,
                [...a].filter((x) => !b.has(x)).length +
                  [...b].filter((x) => !a.has(x)).length,
              ];
            }),
          );
          const values = Object.values(links);

          return [
            letter,
            {
              links: keys.length,
              unique_links: keys.filter((key) => occurrences.get(key) === 1),
              recurrence_sum: others.reduce((a, b) => a + b, 0),
              recurrence_mean:
                Math.round(
                  (others.reduce((a, b) => a + b, 0) / others.length) * 1000,
                ) / 1000,
              recurrence_min: Math.min(...others),
              dial_symmetric: sameLinks(swapped, links),
              all_units_reachable_from_dials:
                reach(links, [...box.dials]) === box.units.length,
              raises_count: values.filter((sign) => sign > 0).length,
              lowers_count: values.filter((sign) => sign < 0).length,
              single_verb:
                values.every((sign) => sign > 0) ||
                values.every((sign) => sign < 0),
              per_dial_reach: box.dials.reduce(
                (sum, dial) => sum + reach(links, [dial]),
                0,
              ),
              one_link_neighbours: Object.values(distances).filter(
                (distance) => distance === 2,
              ).length,
              distances,
            },
          ];
        }),
      );
      const answersUnder = (letter: OptionLetter, question: HandQuestion) =>
        answerWord(box, box.options[letter].links, question).word;
      const expectedKeys = (chosen: OptionLetter[]) =>
        chosen.length === 0
          ? null
          : Math.round(
              box.questions.reduce(
                (sum, question) =>
                  sum +
                  chosen.filter(
                    (letter) =>
                      answersUnder(letter, question) ===
                      WORD_OF_LETTER[question.key],
                  ).length /
                    chosen.length,
                0,
              ) * 1000,
            ) / 1000;
      const pick = (
        score: (entry: (typeof structure)[string]) => number,
        direction: 'max' | 'min',
      ) => {
        const values = OPTION_LETTERS.map((letter) => score(structure[letter]));
        const best =
          direction === 'max' ? Math.max(...values) : Math.min(...values);
        const chosen = OPTION_LETTERS.filter(
          (letter) => score(structure[letter]) === best,
        );

        return {
          chosen,
          singles_out_key: chosen.length === 1 && chosen[0] === box.wiring_key,
          includes_key: chosen.includes(box.wiring_key),
          expected_keys_without_test: expectedKeys(chosen),
        };
      };
      const filterRule = (keep: (letter: OptionLetter) => boolean) => {
        const chosen = OPTION_LETTERS.filter(keep);

        return {
          chosen,
          singles_out_key: chosen.length === 1 && chosen[0] === box.wiring_key,
          includes_key: chosen.includes(box.wiring_key),
          expected_keys_without_test: expectedKeys(chosen),
        };
      };
      const notSingleVerb = OPTION_LETTERS.filter(
        (letter) => !structure[letter].single_verb,
      );
      const maxReach = Math.max(
        ...notSingleVerb.map((letter) => structure[letter].per_dial_reach),
      );
      const rules = {
        no_unique_link: filterRule(
          (letter) => structure[letter].unique_links.length === 0,
        ),
        max_recurrence_sum: pick((entry) => entry.recurrence_sum, 'max'),
        max_recurrence_mean: pick((entry) => entry.recurrence_mean, 'max'),
        max_recurrence_min: pick((entry) => entry.recurrence_min, 'max'),
        fewest_links: pick((entry) => entry.links, 'min'),
        dial_symmetric: filterRule(
          (letter) => structure[letter].dial_symmetric,
        ),
        max_per_dial_reach: pick((entry) => entry.per_dial_reach, 'max'),
        most_one_link_neighbours: pick(
          (entry) => entry.one_link_neighbours,
          'max',
        ),
        single_verb_options: filterRule(
          (letter) => structure[letter].single_verb,
        ),
        drop_single_verb_then_max_reach: filterRule(
          (letter) =>
            !structure[letter].single_verb &&
            structure[letter].per_dial_reach === maxReach,
        ),
      };
      const majority = Object.fromEntries(
        box.questions.map((question) => {
          const counts: Record<string, number> = {};

          for (const letter of OPTION_LETTERS) {
            const answer = answersUnder(letter, question);

            counts[answer] = (counts[answer] ?? 0) + 1;
          }

          const best = Math.max(...Object.values(counts));
          const plurality = Object.keys(counts).filter(
            (answer) => counts[answer] === best,
          );

          return [
            question.id,
            {
              counts,
              plurality,
              plurality_is_key_alone:
                plurality.length === 1 &&
                plurality[0] === WORD_OF_LETTER[question.key],
            },
          ];
        }),
      );

      report[box.id] = { structure, rules, option_majority_answer: majority };
    }

    // Question-kind rules: every rule mapping the kind alone to an answer.
    const questions = [...S1.questions, ...S2.questions];
    const kindOf = (question: HandQuestion) =>
      question.situation.boost.length > 0 ? 'boost' : 'lock';
    const kindRules: { lock: Word; boost: Word; matches: number }[] = [];

    for (const lock of ['up', 'down', 'no change'] as Word[]) {
      for (const boost of ['up', 'down', 'no change'] as Word[]) {
        kindRules.push({
          lock,
          boost,
          matches: questions.filter(
            (question) =>
              (kindOf(question) === 'lock' ? lock : boost) ===
              WORD_OF_LETTER[question.key],
          ).length,
        });
      }
    }

    kindRules.sort((a, b) => b.matches - a.matches);
    report.question_kind_rules = {
      best: kindRules[0],
      intuitive_lock_stops_boost_raises: kindRules.find(
        (rule) => rule.lock === 'no change' && rule.boost === 'up',
      ),
    };
    report.key_distribution = Object.fromEntries(
      questions.map((question) => [question.id, WORD_OF_LETTER[question.key]]),
    );

    test.info().annotations.push({
      type: 'REPORTED (not asserted) — preview §7.5 cues',
      description: JSON.stringify(report),
    });
    // eslint-disable-next-line no-console
    console.log(`[M15 cues, reported, not asserted] ${JSON.stringify(report)}`);
    expect(Object.keys(report)).toContain('s1');
  });
});

/* ------------------------------------------------------------------ *
 * 4. The content cross-check: the module's text is the transcription
 * ------------------------------------------------------------------ */

test.describe('M15 content cross-check', () => {
  test('each box has two dials, three units, four links, four wiring options and two questions with three options each, with the transcribed letters', () => {
    expect(M15_BOXES.map((box) => box.id)).toEqual(['s1', 's2']);

    for (const box of M15_BOXES) {
      const hand = HAND[box.id];

      expect(box.dials.map((dial) => dial.letter)).toEqual(hand.dials);
      expect(box.units.map((unit) => unit.letter)).toEqual(hand.units);
      expect(box.dials.map((dial) => dial.hotkey)).toEqual(['1', '2']);
      expect(box.links).toHaveLength(4);
      expect(box.wiring_options).toHaveLength(4);
      expect(box.questions).toHaveLength(2);
      expect(box.content_version).toBe(`m15-${box.id}-v1`);
      expect(box.title).toBe(`RELAY BOX ${box.index} OF 2`);

      for (const entry of box.questions) {
        expect(entry.options.map((option) => option.letter)).toEqual([
          'a',
          'b',
          'c',
        ]);
        expect(entry.options.map((option) => option.id)).toEqual(
          ['a', 'b', 'c'].map((letter) => `${entry.id}_${letter}`),
        );
      }
    }
  });

  test('the station wiring, the wiring options (as link sets and as text) and the keys are the transcription', () => {
    const letterOf = (box: M15Box, id: string) =>
      [...box.dials, ...box.units].find((node) => node.id === id)!.letter;
    const asHand = (box: M15Box, links: readonly M15Box['links'][number][]) =>
      Object.fromEntries(
        links.map((link) => [
          `${letterOf(box, link.from)}>${letterOf(box, link.to)}`,
          link.kind === 'raises' ? 1 : -1,
        ]),
      ) as Links;

    for (const box of M15_BOXES) {
      const hand = HAND[box.id];

      expect(sameLinks(asHand(box, box.links), hand.links)).toBe(true);
      expect(box.wiring_key_option_id).toBe(`${box.id}_w_${hand.wiring_key}`);

      box.wiring_options.forEach((option, position) => {
        const letter = OPTION_LETTERS[position];

        expect(option.id).toBe(`${box.id}_w_${letter}`);
        expect(option.letter).toBe(letter);
        expect(option.text).toBe(hand.options[letter].text);
        expect(
          sameLinks(asHand(box, option.links), hand.options[letter].links),
        ).toBe(true);
        // The text is the link set's text — nothing is stored twice.
        expect(m15WiringText(box, option.links)).toBe(option.text);
      });
    }
  });

  test('the questions, situations, answer labels, short titles and results lines are the transcription', () => {
    const letterOf = (box: M15Box, id: string) =>
      [...box.dials, ...box.units].find((node) => node.id === id)!.letter;

    for (const box of M15_BOXES) {
      const hand = HAND[box.id];

      box.questions.forEach((entry, position) => {
        const question = hand.questions[position];

        expect(entry.id).toBe(question.id);
        expect(entry.text).toBe(question.text);
        expect(entry.short_title).toBe(question.short);
        expect(entry.results_line).toBe(question.results_line);
        expect(letterOf(box, entry.asked_unit_id)).toBe(question.situation.ask);
        expect(
          entry.situation.locked_unit_ids.map((id) => letterOf(box, id)),
        ).toEqual(question.situation.lock);
        expect(
          entry.situation.boosted_unit_ids.map((id) => letterOf(box, id)),
        ).toEqual(question.situation.boost);
        expect(
          entry.situation.dials_turned_ids.map((id) => letterOf(box, id)),
        ).toEqual(question.situation.turn);
        expect(entry.options.map((option) => option.label)).toEqual([
          `${question.situation.ask} goes up`,
          `${question.situation.ask} goes down`,
          `${question.situation.ask} does not move`,
        ]);
      });
    }
  });

  test('the orientation and the help sheet name no dial or unit of either box', () => {
    const letters = M15_BOXES.flatMap((box) => [
      ...box.dials.map((dial) => dial.letter),
      ...box.units.map((unit) => unit.letter),
    ]);

    expect(letters).toEqual(['F', 'G', 'P', 'Q', 'W', 'S', 'T', 'X', 'Y', 'Z']);

    for (const line of m15OrientationAndHelpStrings()) {
      for (const letter of letters) {
        expect(line, `${letter} in "${line}"`).not.toMatch(
          new RegExp(`(^|[^A-Za-z])${letter}([^A-Za-z]|$)`),
        );
      }
    }
  });

  test('by source, each of the four lab_brief_ack* handlers of the laboratory scene calls presentM15', () => {
    const source = readFileSync(
      'src/scenes/DiagnosticsLaboratoryScene.ts',
      'utf8',
    );
    const handlers = [
      ...source.matchAll(
        /tag: '(lab_brief_ack(?:_loan_accept|_loan_decline)?)',\s*onSelected: \(\) => \{([\s\S]*?)\n {14}\},/g,
      ),
    ];

    expect(handlers.map((match) => match[1])).toEqual([
      'lab_brief_ack',
      'lab_brief_ack',
      'lab_brief_ack_loan_accept',
      'lab_brief_ack_loan_decline',
    ]);

    for (const match of handlers) {
      expect(match[2], match[1]).toContain('presentM15(');
      expect(match[2], match[1]).toContain("advancePilotStage('lab_work'");
    }
  });
});

/* ------------------------------------------------------------------ *
 * 5. The register row, the route and the cipher
 * ------------------------------------------------------------------ */

test.describe('M15 register row, route and the cipher', () => {
  test('M15 is on an explicit v3 route, implemented, with the series opportunity, two box windows, one family and the cipher as a secondary id', () => {
    const entry = registerEntry('M15');

    expect(entry.implementation_status).toBe('implemented');
    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([M15_OPPORTUNITY_ID]);
    expect(entry.route.windows).toEqual([
      {
        id: 'm15_system_s1',
        occasion: 's1',
        zone: 'diagnostics_laboratory',
        episode: 3,
      },
      {
        id: 'm15_system_s2',
        occasion: 's2',
        zone: 'diagnostics_laboratory',
        episode: 3,
      },
    ]);
    expect(entry.route.family_prefixes).toEqual([M15_FAMILY]);
    expect(entry.route.secondary_ids).toEqual(['secondary_m15_layered_cipher']);
    expect(entry.independence.kind).toBe('repeated_within_episode');
    expect(M15_WINDOW_ID).toBe('m15_system_s1');
    expect(M15_OPPORTUNITY_ID).toBe('proto_m15_systems_series');
    expect(M15_ENTRY_STATE_VERSION).toBe('m15-systems-v1');
  });

  test('the feature row is unchanged', () => {
    const entry = registerEntry('M15');

    expect(entry.features).toHaveLength(1);
    expect(entry.features[0]).toMatchObject({
      feature_id: 'm15_correct_first_predictions',
      role: 'primary',
      planned_denominator: 4,
      denominator_kind: 'planned_observations',
      range: '0–4',
      numerator:
        'unseen intervention predictions whose first committed answer is correct',
      denominator: 'four predictions (two per system)',
      higher_means: 'better understanding of the sampled relations',
      missing_rule:
        'no prediction answered → null; model correctness kept separately',
    });
    expect(entry.coverage_label).toBe('performance_counterpart');
    expect(entry.target.occasions).toBe(2);
  });

  test('the schedule mirrors the register; primary prefixes stay pairwise disjoint and none covers the cipher’s secondary family', () => {
    const scheduled = PILOT_SCHEDULE.find((entry) => entry.item === 'M15')!;

    expect(scheduled.opportunityIds).toEqual([M15_OPPORTUNITY_ID]);
    expect(scheduled.familyPrefixes).toEqual([M15_FAMILY]);
    expect(scheduled.zone).toBe('diagnostics_laboratory');

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

    for (const other of ['proto_m15_cipher_', 'secondary_m15_cipher_']) {
      expect(M15_FAMILY.startsWith(other)).toBe(false);
      expect(other.startsWith(M15_FAMILY)).toBe(false);
      expect(
        prefixes.some((prefix) => other.startsWith(prefix)),
        `${other} covered by a primary prefix`,
      ).toBe(false);
    }

    expect(
      REGISTER_V3.filter((entry) =>
        entry.route.family_prefixes.includes(M15_FAMILY),
      ).map((entry) => entry.id),
    ).toEqual(['M15']);
  });

  test('the cipher module declares the secondary opportunity and family and no proto_m15_ literal', () => {
    const source = readFileSync(
      'src/informationProcessing/m15LayeredCipher.ts',
      'utf8',
    );

    expect(source).toContain(
      "M15_OPPORTUNITY_ID = 'secondary_m15_layered_cipher'",
    );
    expect(
      [...source.matchAll(/declareIpEvents\('([a-z0-9_]+)'/g)].map((m) => m[1]),
    ).toEqual(['secondary_m15_cipher']);
    expect(
      new Set(
        [...source.matchAll(/logIpEvent\('([a-z0-9_]+)'/g)].map((m) => m[1]),
      ),
    ).toEqual(new Set(['secondary_m15_cipher']));
    expect(source).not.toContain('proto_m15_');
    expect(source).toContain("M15_ENTRY_STATE_VERSION = 'm15-cipher-v1'");
  });

  test('a log holding only cipher events (old or new identity) yields the M15 row of a log with no M15 evidence', () => {
    const context = {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    };
    const cipherLog = (family: string, opportunity: string): RawGameEvent[] =>
      ['window_opened', 'command_added', 'submitted', 'completed'].map(
        (suffix, index) => ({
          session_id: 'GS',
          timestamp_ms: 1_000 + index,
          scene: 'information_processing_lab',
          event_type: `${family}_${suffix}`,
          object_id: 'ip_cipher_workstation',
          sequence: 10 + index,
          page_load_index: 1,
          metadata: { opportunity_id: opportunity, measure_id: 'M15' },
        }),
      );
    const none = extractItemFeatures('M15', [], context);

    for (const [family, opportunity] of [
      ['proto_m15_cipher', 'proto_m15_layered_cipher'],
      ['secondary_m15_cipher', 'secondary_m15_layered_cipher'],
    ]) {
      expect(
        extractItemFeatures('M15', cipherLog(family, opportunity), context),
      ).toEqual(none);
    }

    expect(none[0]).toMatchObject({
      disposition: 'not_presented',
      value: null,
    });
  });
});

/* ------------------------------------------------------------------ *
 * 6. The series model
 * ------------------------------------------------------------------ */

interface Run {
  s: M15Series;
  events: { suffix: string; metadata: Record<string, unknown> }[];
  sink: M15LogSink;
  now: number;
  tick: (ms: number) => number;
  /** Past the settle of the current view. */
  settle: () => number;
}

function run(): Run {
  const r: Run = {
    s: createM15Series(),
    events: [],
    sink: (suffix, metadata) => {
      r.events.push({ suffix, metadata });
    },
    now: 10_000,
    tick: (ms) => {
      r.now += ms;

      return r.now;
    },
    settle: () => r.tick(M15_SETTLE_MS + 50),
  };

  return r;
}

const suffixes = (r: Run) => r.events.map((event) => event.suffix);
const last = (r: Run, suffix: string) =>
  [...r.events].reverse().find((event) => event.suffix === suffix);
const count = (r: Run, suffix: string) =>
  r.events.filter((event) => event.suffix === suffix).length;

/** Opens the bench and starts box 1 (orientation acknowledged). */
function started(): Run {
  const r = run();

  m15sOpen(r.s, r.now, r.sink);
  expect(m15sStart(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);

  return r;
}

const dialId = (box: M15BoxId, letter: string) =>
  `${box}_${letter.toLowerCase()}`;

/** Runs TEST on the current box's dial (by letter). */
function testDial(r: Run, letter: string) {
  const box = M15_ASSIGNED_BOX_ORDER[r.s.box];

  expect(
    m15sTest(r.s, dialId(box, letter), 'keyboard', r.settle(), r.sink),
  ).toBe('run');
}

/** Records the current box's wiring: an option (by letter) or CANNOT TELL. */
function wiring(
  r: Run,
  choice: OptionLetter | 'cannot_tell',
  mode: 'pointer' | 'keyboard' = 'keyboard',
) {
  const box = M15_ASSIGNED_BOX_ORDER[r.s.box];

  if (choice === 'cannot_tell') {
    expect(m15sRequestCommit(r.s, 'cannot', mode, r.settle(), r.sink)).toBe(
      'opened',
    );
  } else {
    expect(m15sDraft(r.s, `${box}_w_${choice}`, mode, r.settle(), r.sink)).toBe(
      true,
    );
    expect(m15sRequestCommit(r.s, 'option', mode, r.tick(100), r.sink)).toBe(
      'opened',
    );
  }

  expect(m15sConfirmCommit(r.s, mode, r.tick(M15_SETTLE_MS + 1), r.sink)).toBe(
    'recorded',
  );
}

/** Answers the current question: an option (by letter) or CANNOT SOLVE. */
function answer(
  r: Run,
  choice: AnswerLetter | 'cannot_solve',
  mode: 'pointer' | 'keyboard' = 'keyboard',
) {
  const question = m15Questions()[m15AnsweredCount(r.s)];

  if (choice === 'cannot_solve') {
    expect(m15sRequestCommit(r.s, 'cannot', mode, r.settle(), r.sink)).toBe(
      'opened',
    );
  } else {
    expect(
      m15sDraft(r.s, `${question.id}_${choice}`, mode, r.settle(), r.sink),
    ).toBe(true);
    expect(m15sRequestCommit(r.s, 'option', mode, r.tick(100), r.sink)).toBe(
      'opened',
    );
  }

  expect(m15sConfirmCommit(r.s, mode, r.tick(M15_SETTLE_MS + 1), r.sink)).toBe(
    'recorded',
  );
}

/** NEXT after the acknowledgement has settled. */
function next(r: Run) {
  return m15sNext(r.s, 'keyboard', r.settle(), r.sink);
}

const KEY_LETTERS: Record<string, AnswerLetter> = Object.fromEntries(
  [...S1.questions, ...S2.questions].map((question) => [
    question.id,
    question.key,
  ]),
);
const WRONG_LETTERS: Record<string, AnswerLetter> = Object.fromEntries(
  [...S1.questions, ...S2.questions].map((question) => [
    question.id,
    (['a', 'b', 'c'] as AnswerLetter[]).find(
      (letter) => letter !== question.key,
    )!,
  ]),
);
const QUESTION_IDS = m15Questions().map((entry) => entry.id);

/** A whole series: box 1 (tests, wiring, two answers), box 2 likewise. */
function completeSeries(
  r: Run,
  plan: {
    s1?: { tests?: string[]; wiring: OptionLetter | 'cannot_tell' };
    s2?: { tests?: string[]; wiring: OptionLetter | 'cannot_tell' };
    answers: (AnswerLetter | 'cannot_solve')[];
    showResults?: boolean;
  },
) {
  const boxes = [plan.s1 ?? { wiring: 'b' }, plan.s2 ?? { wiring: 'd' }];

  boxes.forEach((box, index) => {
    if (index === 1 && plan.answers.length <= 2) {
      return;
    }

    for (const letter of box.tests ?? []) {
      testDial(r, letter);
    }

    wiring(r, box.wiring);
    expect(next(r)).toBe('question_presented');
    answer(r, plan.answers[index * 2]);

    if (plan.answers.length > index * 2 + 1) {
      expect(next(r)).toBe('question_presented');
      answer(r, plan.answers[index * 2 + 1]);

      if (index === 0 && plan.answers.length > 2) {
        expect(next(r)).toBe('box_presented');
      }
    }
  });

  if (plan.showResults) {
    expect(next(r)).toBe('results_shown');
  }
}

/** Renders the surface model from a series with no-op commands. */
function render(s: M15Series) {
  const host: M15SurfaceHost = {
    now: () => 0,
    close: () => undefined,
    feedback: () => undefined,
    series: () => s,
    commands: {
      start: () => true,
      test: () => 'none',
      draft: () => true,
      request: () => 'none',
      cancel: () => true,
      confirm: () => 'none',
      finish: () => true,
      next: () => 'none',
      navigateResults: () => true,
      help: () => true,
      closeHelp: () => true,
    },
  };
  const model = m15SurfaceModel(host);
  const lines = [
    model.title,
    model.subtitle ?? '',
    model.status ?? '',
    model.help ?? '',
    ...model.elements.map((element) => element.label),
  ].join('\n');

  return { model, lines, ids: model.elements.map((element) => element.id) };
}

const CORRECTNESS =
  /\bcorrect|incorrect|\bright\b|\bwrong\b|station answer|station wiring/i;
const FORBIDDEN =
  /proto_|secondary_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|puzzle|persist|grit|skill|ability|intelligen|information|complex|make sense|handle/i;

test.describe('M15 series model — no correctness information before the fourth first response', () => {
  test('before any record, after tests, after a wiring, after one to three answers nothing on the surface says anything about correctness', () => {
    const r = started();
    const check = () => {
      const view = render(r.s);

      expect(view.lines).not.toMatch(CORRECTNESS);
      expect(view.lines).not.toMatch(FORBIDDEN);
      expect(view.ids).not.toContain('results_text');
      expect(view.ids).not.toContain('results_next');
    };

    check();
    testDial(r, 'F');
    check();
    wiring(r, 'a'); // a wrong wiring
    check();
    expect(next(r)).toBe('question_presented');
    check();
    answer(r, 'c'); // correct
    check();
    expect(next(r)).toBe('question_presented');
    answer(r, 'a'); // wrong
    check();
    expect(next(r)).toBe('box_presented');
    check();
    wiring(r, 'cannot_tell');
    check();
    expect(next(r)).toBe('question_presented');
    answer(r, 'cannot_solve');
    check();
    expect(count(r, 'results_shown')).toBe(0);
  });

  test('the acknowledgement line and control are identical after a correct option, a wrong option and CANNOT SOLVE; the wiring acknowledgement is identical after the key, a wrong option and CANNOT TELL', () => {
    const wiringAcks: string[] = [];
    const answerAcks: string[] = [];

    for (const choice of ['b', 'a', 'cannot_tell'] as const) {
      const r = started();

      wiring(r, choice);

      const view = render(r.s);
      const ack = last(r, 'response_acknowledged')!.metadata;

      wiringAcks.push(
        JSON.stringify({
          line: ack.line_id,
          control: ack.next_control,
          ids: view.ids,
          lines: [
            view.model.title,
            view.model.status ?? '',
            ...view.model.elements
              .filter((element) => element.id !== 'recorded_wiring')
              .map((element) => element.label),
          ].join(' | '),
        }),
      );
    }

    expect(wiringAcks[1]).toBe(wiringAcks[0]);
    expect(wiringAcks[2]).toBe(wiringAcks[0]);
    expect(wiringAcks[0]).toContain(M15_WIRING_ACK_LINE_ID);
    expect(wiringAcks[0]).toContain(M15_TEXT.acknowledgement_wiring(1));
    expect(wiringAcks[0]).toContain(M15_TEXT.first_question);

    for (const choice of ['c', 'a', 'cannot_solve'] as const) {
      const r = started();

      wiring(r, 'b');
      expect(next(r)).toBe('question_presented');
      answer(r, choice);

      const view = render(r.s);
      const ack = last(r, 'response_acknowledged')!.metadata;

      // Only the recorded-wiring text can differ here (the same wiring B
      // was recorded in all three runs, so it does not).
      answerAcks.push(
        JSON.stringify({
          line: ack.line_id,
          control: ack.next_control,
          ids: view.ids,
          lines: [
            view.model.title,
            view.model.status ?? '',
            ...view.model.elements
              .filter((element) => element.id !== 'recorded_wiring')
              .map((element) => element.label),
          ].join(' | '),
        }),
      );
    }

    expect(new Set(answerAcks).size).toBe(1);
    expect(answerAcks[0]).toContain(M15_ACK_LINE_ID);
    expect(answerAcks[0]).toContain(M15_TEXT.acknowledgement_answer(1));
    expect(answerAcks[0]).toContain(M15_TEXT.next_question);
    expect(answerAcks[0]).not.toMatch(CORRECTNESS);
  });

  test('a results request is refused before the fourth answer and writes no results_shown; a review-closed partial series never exposes results', () => {
    const r = started();

    completeSeries(r, { answers: ['c', 'b', 'b'] });
    expect(m15AnsweredCount(r.s)).toBe(3);
    expect(
      m15sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(count(r, 'results_shown')).toBe(0);
    expect(render(r.s).ids).not.toContain('results_text');

    // The acknowledgement after the third answer leads to the fourth question.
    expect(next(r)).toBe('question_presented');
    expect(count(r, 'results_shown')).toBe(0);

    // Closed at the review with three answers: the record, no results.
    expect(m15sCloseAtReview(r.s, r.tick(10), r.sink)).toBe(true);
    expect(
      m15sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(m15sNext(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');
    m15sLeave(r.s, r.tick(10), r.sink);
    m15sOpen(r.s, r.tick(10), r.sink);

    const view = render(r.s);

    expect(view.ids).toEqual(['record_text', 'leave']);
    expect(view.lines).toContain(M15_TEXT.closed_at_review);
    expect(view.lines).toContain(M15_TEXT.status_answers(3));
    expect(view.lines).not.toMatch(CORRECTNESS);
    expect(count(r, 'results_shown')).toBe(0);
  });

  test('results follow only the fourth first response, once per box, with the recorded and station wirings and answers, and reopen read-only', () => {
    const r = started();

    completeSeries(r, {
      s1: { tests: ['F', 'G'], wiring: 'b' },
      s2: { tests: ['S'], wiring: 'cannot_tell' },
      answers: ['c', 'a', 'cannot_solve', 'c'],
    });
    expect(r.s.status).toBe('completed');
    expect(count(r, 'first_responses_completed')).toBe(1);
    expect(count(r, 'results_shown')).toBe(0);
    expect(render(r.s).ids).toContain('next');
    expect(render(r.s).lines).toContain(M15_TEXT.show_results);

    expect(next(r)).toBe('results_shown');
    expect(count(r, 'results_shown')).toBe(1);
    expect(last(r, 'results_shown')!.metadata).toMatchObject({
      phase: 'feedback',
      box_id: 's1',
      line_ids: ['s1_wiring_result', 's1_q1_result', 's1_q2_result'],
    });

    const box1 = render(r.s);

    expect(box1.model.title).toBe(M15_TEXT.results_title(1));
    expect(box1.lines).toContain(M15_TEXT.results_first_line);
    expect(box1.lines).toContain(
      `${M15_TEXT.your_wiring} ${S1.options.b.text}`,
    );
    expect(box1.lines).toContain(
      `${M15_TEXT.station_wiring} ${S1.options.b.text}`,
    );
    expect(box1.lines).toContain(`${M15_TEXT.your_answer} W does not move`);
    expect(box1.lines).toContain(`${M15_TEXT.station_answer} W does not move`);
    expect(box1.lines).toContain(`${M15_TEXT.your_answer} Q goes up`);
    expect(box1.lines).toContain(`${M15_TEXT.station_answer} Q goes down`);
    expect(box1.lines).toContain(S1.questions[0].results_line);
    expect(box1.lines).toContain(S1.questions[1].results_line);
    expect(box1.ids).toEqual([
      'results_next',
      'finish',
      'help',
      'results_text',
    ]);

    expect(
      m15sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(count(r, 'results_shown')).toBe(2);

    const box2 = render(r.s);

    expect(box2.model.title).toBe(M15_TEXT.results_title(2));
    expect(box2.lines).toContain(
      `${M15_TEXT.your_wiring} ${M15_TEXT.cannot_tell_recorded}`,
    );
    expect(box2.lines).toContain(
      `${M15_TEXT.station_wiring} ${S2.options.d.text}`,
    );
    expect(box2.lines).toContain(
      `${M15_TEXT.your_answer} ${M15_TEXT.cannot_solve_answer}`,
    );
    expect(box2.lines).toContain(`${M15_TEXT.station_answer} Z goes down`);
    expect(box2.lines).toContain(`${M15_TEXT.your_answer} Z does not move`);
    expect(box2.ids).toEqual([
      'finish',
      'results_back',
      'help',
      'results_text',
    ]);

    // Back, then forward again: no second results_shown for either box.
    expect(
      m15sResultsNavigate(r.s, 'back', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(
      m15sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(count(r, 'results_shown')).toBe(2);

    // Leave and reopen: the results again, read-only; nothing recorded.
    const before = JSON.stringify(
      r.events.filter(
        (event) =>
          event.suffix === 'first_response' ||
          event.suffix === 'wiring_recorded',
      ),
    );

    m15sLeave(r.s, r.tick(10), r.sink);
    m15sOpen(r.s, r.tick(10), r.sink);
    expect(r.s.view).toBe('results');
    expect(m15sDraft(r.s, 's2_q2_a', 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.tick(10), r.sink),
    ).toBe('none');
    expect(m15sTest(r.s, 's2_s', 'keyboard', r.tick(10), r.sink)).toBe('none');
    expect(count(r, 'first_response')).toBe(4);
    expect(count(r, 'wiring_recorded')).toBe(2);
    expect(count(r, 'results_shown')).toBe(2);
    expect(
      JSON.stringify(
        r.events.filter(
          (event) =>
            event.suffix === 'first_response' ||
            event.suffix === 'wiring_recorded',
        ),
      ),
    ).toBe(before);
  });
});

test.describe('M15 series model — order, exploration, immutability, commitment', () => {
  test("fixed box and question order; no question before its box's wiring; no question before the previous first response; the tests close at the wiring and a later test records nothing", () => {
    const r = started();

    expect(suffixes(r)).toEqual(['orientation_acknowledged', 'box_presented']);
    expect(last(r, 'box_presented')!.metadata).toMatchObject({
      box_id: 's1',
      box_index: 1,
      box_window_id: 'm15_system_s1',
      content_version: 'm15-s1-v1',
      assigned_position: 1,
      realised_position: 1,
      dials_available: ['s1_f', 's1_g'],
      phase: 'exploration',
    });
    expect(count(r, 'question_presented')).toBe(0);

    // A question cannot be drafted or requested before the wiring.
    expect(m15sDraft(r.s, 's1_q1_a', 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(m15sNext(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');

    // Tests: F twice, G once — identical listings, run indices 1, 2, 1.
    testDial(r, 'F');
    testDial(r, 'F');
    testDial(r, 'G');
    expect(
      r.events
        .filter((event) => event.suffix === 'test_run')
        .map((event) => [
          event.metadata.dial_id,
          event.metadata.run_index,
          event.metadata.listing,
          event.metadata.phase,
        ]),
    ).toEqual([
      ['s1_f', 1, S1.listings.F, 'exploration'],
      ['s1_f', 2, S1.listings.F, 'exploration'],
      ['s1_g', 1, S1.listings.G, 'exploration'],
    ]);

    wiring(r, 'b');
    expect(last(r, 'wiring_recorded')!.metadata).toMatchObject({
      phase: 'model',
      box_id: 's1',
      response_kind: 'option',
      option_id: 's1_w_b',
      correct: true,
      key_option_id: 's1_w_b',
      tests_before: { s1_f: 2, s1_g: 1 },
      dials_tested_before: ['s1_f', 's1_g'],
      drafts_before: 1,
      input_mode: 'keyboard',
    });
    expect(r.s.view).toBe('wiring_acknowledgement');
    expect(last(r, 'response_acknowledged')!.metadata).toMatchObject({
      line_id: M15_WIRING_ACK_LINE_ID,
      next_control: 'first_question',
    });

    // The tests are closed: a later request records nothing.
    const before = r.events.length;

    expect(m15sTest(r.s, 's1_f', 'keyboard', r.settle(), r.sink)).toBe(
      'closed',
    );
    expect(r.events.length).toBe(before);

    const closedView = render(r.s);

    expect(closedView.lines).toContain(M15_TEXT.tests_closed);
    expect(
      closedView.model.elements.find((element) => element.id === 'test_f')
        ?.state,
    ).toBe('disabled');
    expect(closedView.lines).toContain(
      M15_TEXT.record_line('F', S1.listings.F),
    );

    // FIRST QUESTION presents question 1 only now.
    expect(next(r)).toBe('question_presented');
    expect(last(r, 'question_presented')!.metadata).toMatchObject({
      question_id: 's1_q1',
      question_index: 1,
      question_global_index: 1,
      assigned_position: 1,
      realised_position: 1,
      option_ids: ['s1_q1_a', 's1_q1_b', 's1_q1_c'],
      phase: 'measurement',
    });

    // The test record and the recorded wiring stay visible.
    const questionView = render(r.s);

    expect(questionView.lines).toContain(
      M15_TEXT.record_line('F', S1.listings.F),
    );
    expect(questionView.lines).toContain(M15_TEXT.recorded_wiring_title);
    expect(questionView.lines).toContain(S1.options.b.text);
    expect(questionView.lines).toContain(M15_TEXT.question_heading(1));
    expect(m15sTest(r.s, 's1_g', 'keyboard', r.settle(), r.sink)).toBe(
      'closed',
    );

    // Question 2 only after question 1's first response.
    expect(m15sNext(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');
    answer(r, 'c');
    expect(next(r)).toBe('question_presented');
    expect(last(r, 'question_presented')!.metadata.question_id).toBe('s1_q2');
    answer(r, 'b');
    expect(last(r, 'response_acknowledged')!.metadata.next_control).toBe(
      'next_box',
    );
    expect(count(r, 'box_completed')).toBe(1);
    expect(next(r)).toBe('box_presented');
    expect(last(r, 'box_presented')!.metadata).toMatchObject({
      box_id: 's2',
      assigned_position: 2,
      realised_position: 2,
    });
    // Box 2 starts with nothing tested and no draft.
    expect(render(r.s).lines).toContain(M15_TEXT.record_line('S', null));
    expect(r.s.boxes[1].wiring_draft).toBeNull();

    wiring(r, 'd');
    expect(next(r)).toBe('question_presented');
    answer(r, 'b');
    expect(next(r)).toBe('question_presented');
    answer(r, 'c');
    expect(last(r, 'response_acknowledged')!.metadata.next_control).toBe(
      'show_results',
    );
    expect(
      r.events
        .filter((event) => event.suffix === 'question_presented')
        .map((event) => event.metadata.question_id),
    ).toEqual(QUESTION_IDS);
    expect(count(r, 'first_responses_completed')).toBe(1);
    expect(last(r, 'first_responses_completed')!.metadata).toMatchObject({
      phase: 'measurement',
      closure_reason: 'completed',
      predictions_answered: 4,
      correct_first_predictions: 4,
      models_recorded: 2,
      models_correct: 2,
    });
  });

  test('the wiring and the first response are each written once: a doubled confirmation, a second RECORD, CANNOT TELL after a wiring, CANNOT SOLVE after an answer and an answer after CANNOT SOLVE never create a second one', () => {
    const r = started();

    wiring(r, 'c');
    expect(count(r, 'wiring_recorded')).toBe(1);
    // A repeated confirmation finds no dialog.
    expect(m15sConfirmCommit(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');
    // A second RECORD WIRING / CANNOT TELL on the acknowledgement view.
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(
      m15sRequestCommit(r.s, 'cannot', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(m15sDraft(r.s, 's1_w_b', 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(count(r, 'wiring_recorded')).toBe(1);
    expect(last(r, 'wiring_recorded')!.metadata.option_id).toBe('s1_w_c');

    expect(next(r)).toBe('question_presented');
    answer(r, 'a');
    expect(count(r, 'first_response')).toBe(1);
    expect(m15sConfirmCommit(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(
      m15sRequestCommit(r.s, 'cannot', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(m15sDraft(r.s, 's1_q1_c', 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(count(r, 'first_response')).toBe(1);

    expect(next(r)).toBe('question_presented');
    answer(r, 'cannot_solve');
    expect(count(r, 'first_response')).toBe(2);
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(count(r, 'first_response')).toBe(2);
    expect(
      r.events
        .filter((event) => event.suffix === 'first_response')
        .map((event) => [
          event.metadata.question_id,
          event.metadata.response_kind,
          event.metadata.option_id,
          event.metadata.correct,
        ]),
    ).toEqual([
      ['s1_q1', 'option', 's1_q1_a', false],
      ['s1_q2', 'cannot_solve', null, false],
    ]);
  });

  test('the fresh-press rule on all four confirmations: a press inside 400 ms is refused and recorded once per dialog, the count carried on the record; a cancelled confirmation leaves no record', () => {
    const r = started();

    // Wiring: RECORD WIRING with a draft; two early presses; one settled.
    expect(m15sDraft(r.s, 's1_w_b', 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink),
    ).toBe('opened');
    expect(m15sConfirmCommit(r.s, 'keyboard', r.tick(50), r.sink)).toBe(
      'refused',
    );
    expect(m15sConfirmCommit(r.s, 'keyboard', r.tick(50), r.sink)).toBe(
      'refused',
    );
    expect(count(r, 'commit_press_refused')).toBe(1);
    expect(last(r, 'commit_press_refused')!.metadata).toMatchObject({
      target: 'wiring',
      kind: 'option',
      reason: 'dialog_settling',
      settle_ms: 400,
      phase: 'model',
    });
    expect(count(r, 'wiring_recorded')).toBe(0);

    // KEEP WORKING: no record; the draft stays.
    expect(m15sCancelCommit(r.s, 'keyboard', r.tick(400), r.sink)).toBe(true);
    expect(last(r, 'commit_cancelled')!.metadata).toMatchObject({
      target: 'wiring',
      kind: 'option',
      option_id: 's1_w_b',
      reason: 'keep_working',
      refused_presses: 2,
    });
    expect(count(r, 'wiring_recorded')).toBe(0);
    expect(r.s.boxes[0].wiring_draft).toBe('s1_w_b');

    // CANNOT TELL: an early press refused, then a settled press records.
    expect(
      m15sRequestCommit(r.s, 'cannot', 'keyboard', r.settle(), r.sink),
    ).toBe('opened');
    expect(m15sConfirmCommit(r.s, 'keyboard', r.tick(100), r.sink)).toBe(
      'refused',
    );
    expect(m15sConfirmCommit(r.s, 'keyboard', r.tick(400), r.sink)).toBe(
      'recorded',
    );
    expect(last(r, 'wiring_recorded')!.metadata).toMatchObject({
      response_kind: 'cannot_tell',
      option_id: null,
      correct: false,
      refused_presses: 1,
      draft_at_commit: 's1_w_b',
    });

    // Answer: the same for RECORD ANSWER and for CANNOT SOLVE.
    expect(next(r)).toBe('question_presented');
    expect(m15sDraft(r.s, 's1_q1_c', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink),
    ).toBe('opened');
    expect(m15sConfirmCommit(r.s, 'keyboard', r.tick(10), r.sink)).toBe(
      'refused',
    );
    expect(count(r, 'commit_press_refused')).toBe(3);
    expect(last(r, 'commit_press_refused')!.metadata).toMatchObject({
      target: 'question',
      kind: 'option',
      phase: 'measurement',
      question_id: 's1_q1',
    });
    expect(m15sCancelCommit(r.s, 'keyboard', r.tick(400), r.sink)).toBe(true);
    expect(count(r, 'first_response')).toBe(0);
    expect(
      m15sRequestCommit(r.s, 'cannot', 'keyboard', r.settle(), r.sink),
    ).toBe('opened');
    expect(m15sConfirmCommit(r.s, 'keyboard', r.tick(399), r.sink)).toBe(
      'refused',
    );
    expect(m15sConfirmCommit(r.s, 'keyboard', r.tick(1), r.sink)).toBe(
      'recorded',
    );
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      response_kind: 'cannot_solve',
      option_id: null,
      correct: false,
      refused_presses: 1,
      draft_at_commit: 's1_q1_c',
      recorded_wiring_option_id: 'cannot_tell',
      consistent_with_recorded_wiring: null,
    });
    expect(count(r, 'commit_press_refused')).toBe(4);
  });

  test('RECORD WIRING / RECORD ANSWER without a draft records commit_without_draft and nothing else; CANNOT SOLVE is incorrect whatever the draft; drafts never become responses', () => {
    const r = started();

    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('no_draft');
    expect(last(r, 'commit_without_draft')!.metadata).toMatchObject({
      target: 'wiring',
      box_id: 's1',
    });
    expect(r.s.pending_commit).toBeNull();

    // Drafts: choose, change, clear, choose — recorded, never a response.
    expect(m15sDraft(r.s, 's1_w_a', 'pointer', r.settle(), r.sink)).toBe(true);
    expect(m15sDraft(r.s, 's1_w_b', 'pointer', r.tick(100), r.sink)).toBe(true);
    expect(m15sDraft(r.s, 's1_w_b', 'pointer', r.tick(100), r.sink)).toBe(true);
    expect(
      r.events
        .filter((event) => event.suffix === 'wiring_drafted')
        .map((event) => [
          event.metadata.option_id,
          event.metadata.previous_option_id,
        ]),
    ).toEqual([
      ['s1_w_a', null],
      ['s1_w_b', 's1_w_a'],
      [null, 's1_w_b'],
    ]);
    expect(count(r, 'wiring_recorded')).toBe(0);
    expect(m15sDraft(r.s, 's1_w_b', 'pointer', r.tick(100), r.sink)).toBe(true);
    wiring(r, 'cannot_tell');
    expect(last(r, 'wiring_recorded')!.metadata).toMatchObject({
      response_kind: 'cannot_tell',
      correct: false,
      drafts_before: 4,
    });

    expect(next(r)).toBe('question_presented');
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('no_draft');
    expect(last(r, 'commit_without_draft')!.metadata).toMatchObject({
      target: 'question',
      question_id: 's1_q1',
    });
    // The key drafted, then CANNOT SOLVE: incorrect whatever the draft.
    expect(m15sDraft(r.s, 's1_q1_c', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    answer(r, 'cannot_solve');
    expect(last(r, 'first_response')!.metadata).toMatchObject({
      response_kind: 'cannot_solve',
      correct: false,
      draft_at_commit: 's1_q1_c',
      drafts_before: 1,
    });
    expect(count(r, 'first_response')).toBe(1);
  });

  test("the settle on every view transition: a press inside 400 ms of START, a box's first view, a question's first view, an acknowledgement, the results views, HELP and CLOSE HELP changes nothing; a later one acts", () => {
    const r = run();

    m15sOpen(r.s, r.now, r.sink);
    // START inside the opening's settle: nothing.
    expect(m15sStart(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m15sHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(count(r, 'orientation_acknowledged')).toBe(0);
    expect(m15sStart(r.s, 'keyboard', r.tick(300), r.sink)).toBe(true);

    // The box's first view: a test, a draft, a request inside 400 ms do nothing.
    expect(m15sTest(r.s, 's1_f', 'keyboard', r.tick(100), r.sink)).toBe('none');
    expect(m15sDraft(r.s, 's1_w_b', 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink),
    ).toBe('none');
    expect(count(r, 'test_run') + count(r, 'wiring_drafted')).toBe(0);
    expect(count(r, 'commit_without_draft')).toBe(0);
    expect(m15sTest(r.s, 's1_f', 'keyboard', r.tick(200), r.sink)).toBe('run');

    // HELP: a press inside 400 ms of the help sheet opening closes nothing;
    // a settled CLOSE HELP closes it and re-arms the restored view.
    expect(m15sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m15sCloseHelp(r.s, r.tick(100))).toBe(false);
    expect(r.s.help_open).toBe(true);
    expect(m15sCloseHelp(r.s, r.tick(400))).toBe(true);
    expect(m15sDraft(r.s, 's1_w_b', 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    expect(m15sHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m15sDraft(r.s, 's1_w_b', 'keyboard', r.tick(400), r.sink)).toBe(
      true,
    );

    // The wiring acknowledgement: FIRST QUESTION inside 400 ms is refused.
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink),
    ).toBe('opened');
    expect(m15sConfirmCommit(r.s, 'keyboard', r.tick(401), r.sink)).toBe(
      'recorded',
    );
    expect(m15sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(count(r, 'question_presented')).toBe(0);
    expect(m15sNext(r.s, 'keyboard', r.tick(400), r.sink)).toBe(
      'question_presented',
    );

    // The question's first view: a draft inside 400 ms does nothing.
    expect(m15sDraft(r.s, 's1_q1_c', 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    expect(count(r, 'option_drafted')).toBe(0);
    expect(m15sDraft(r.s, 's1_q1_c', 'keyboard', r.tick(400), r.sink)).toBe(
      true,
    );
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink),
    ).toBe('opened');
    expect(m15sConfirmCommit(r.s, 'keyboard', r.tick(401), r.sink)).toBe(
      'recorded',
    );

    // The answer acknowledgement: NEXT inside 400 ms is refused; a reopened
    // acknowledgement settles again.
    expect(m15sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    m15sLeave(r.s, r.tick(400), r.sink);
    m15sOpen(r.s, r.tick(10), r.sink);
    expect(m15sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(count(r, 'question_presented')).toBe(1);
    expect(m15sNext(r.s, 'keyboard', r.tick(400), r.sink)).toBe(
      'question_presented',
    );

    // Finish the series; the results views settle too.
    answer(r, 'b');
    expect(next(r)).toBe('box_presented');
    wiring(r, 'd');
    expect(next(r)).toBe('question_presented');
    answer(r, 'b');
    expect(next(r)).toBe('question_presented');
    answer(r, 'c');
    expect(m15sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(count(r, 'results_shown')).toBe(0);
    expect(m15sNext(r.s, 'keyboard', r.tick(400), r.sink)).toBe(
      'results_shown',
    );
    expect(
      m15sResultsNavigate(r.s, 'next', 'keyboard', r.tick(100), r.sink),
    ).toBe(false);
    // FINISH inside the settle of a results view closes nothing.
    expect(m15sFinish(r.s, r.tick(0))).toBe(false);
    expect(count(r, 'results_shown')).toBe(1);
    expect(
      m15sResultsNavigate(r.s, 'next', 'keyboard', r.tick(400), r.sink),
    ).toBe(true);
    expect(count(r, 'results_shown')).toBe(2);
    expect(
      m15sResultsNavigate(r.s, 'back', 'keyboard', r.tick(100), r.sink),
    ).toBe(false);
    expect(m15sFinish(r.s, r.tick(0))).toBe(false);
    expect(r.s.results_box).toBe(1);
    // A settled FINISH may close; the help sheet blocks it.
    expect(m15sFinish(r.s, r.tick(300))).toBe(true);

    // CLOSE HELP on the results re-arms the settle (the M14 closeout rule).
    expect(m15sHelp(r.s, 'keyboard', r.tick(400), r.sink)).toBe(true);
    expect(m15sFinish(r.s, r.tick(400))).toBe(false);
    expect(m15sCloseHelp(r.s, r.tick(0))).toBe(true);
    expect(
      m15sResultsNavigate(r.s, 'back', 'keyboard', r.tick(100), r.sink),
    ).toBe(false);
    expect(m15sFinish(r.s, r.tick(0))).toBe(false);
    expect(r.s.results_box).toBe(1);
    expect(
      m15sResultsNavigate(r.s, 'back', 'keyboard', r.tick(400), r.sink),
    ).toBe(true);
    expect(r.s.results_box).toBe(0);
    expect(count(r, 'results_shown')).toBe(2);
  });

  test('a cancelled confirmation re-arms the restored view; ESC order closes the dialog, then the help; help is refused during a dialog and recorded with the step', () => {
    const r = started();

    testDial(r, 'G');
    expect(m15sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')!.metadata).toMatchObject({
      phase: 'exploration',
      box_id: 's1',
      step: 'wiring',
      view: 'wiring',
    });
    // Nothing acts under the help sheet.
    expect(m15sTest(r.s, 's1_f', 'keyboard', r.settle(), r.sink)).toBe('none');
    expect(m15sDraft(r.s, 's1_w_b', 'keyboard', r.tick(10), r.sink)).toBe(
      false,
    );
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.tick(10), r.sink),
    ).toBe('none');
    expect(m15sCloseHelp(r.s, r.settle())).toBe(true);

    wiring(r, 'b');
    expect(next(r)).toBe('question_presented');
    expect(m15sDraft(r.s, 's1_q1_c', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m15sRequestCommit(r.s, 'option', 'keyboard', r.tick(100), r.sink),
    ).toBe('opened');
    // KEEP WORKING inside 400 ms of the dialog opening is ignored (the
    // second click of a double click on the opener); the dialog stays.
    expect(m15sCancelCommit(r.s, 'keyboard', r.tick(10), r.sink)).toBe(false);
    expect(r.s.pending_commit).not.toBeNull();
    expect(count(r, 'commit_cancelled')).toBe(0);
    // Help refused while the dialog is open; a settled KEEP WORKING cancels.
    expect(m15sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    expect(m15sCancelCommit(r.s, 'keyboard', r.tick(0), r.sink)).toBe(true);
    // The restored question view settles: a carried draft press does nothing.
    expect(m15sDraft(r.s, 's1_q1_a', 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    expect(r.s.boxes[0].questions[0].draft).toBe('s1_q1_c');
    expect(m15sHelp(r.s, 'keyboard', r.tick(400), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')!.metadata).toMatchObject({
      phase: 'measurement',
      question_id: 's1_q1',
      step: 'question',
    });
    expect(r.s.help_consults).toMatchObject({ exploration: 1, measurement: 1 });
    expect(r.s.boxes[0].questions[0].help_consults).toBe(1);
    expect(r.s.boxes[0].wiring_help_consults).toBe(1);
  });

  test('leaving keeps the box, the step, the test record, the draft, the recorded wiring and the answers; returning never presents again and never starts a new trial; leaving before START shows the orientation again', () => {
    const r = run();

    m15sOpen(r.s, r.now, r.sink);
    m15sLeave(r.s, r.settle(), r.sink);
    expect(last(r, 'panel_left')!.metadata).toMatchObject({
      view: 'orientation',
      phase: 'orientation',
    });
    m15sOpen(r.s, r.tick(10), r.sink);
    expect(r.s.view).toBe('orientation');
    expect(render(r.s).ids).toEqual(['start', 'orientation', 'help', 'leave']);
    expect(count(r, 'box_presented')).toBe(0);
    expect(count(r, 'series_reopened')).toBe(1);

    expect(m15sStart(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    testDial(r, 'F');
    expect(m15sDraft(r.s, 's1_w_d', 'pointer', r.settle(), r.sink)).toBe(true);
    m15sLeave(r.s, r.tick(10), r.sink);
    m15sOpen(r.s, r.tick(10), r.sink);
    expect(r.s.view).toBe('wiring');
    expect(r.s.boxes[0].dials[0].runs).toBe(1);
    expect(r.s.boxes[0].wiring_draft).toBe('s1_w_d');
    expect(count(r, 'box_presented')).toBe(1);
    expect(render(r.s).lines).toContain(
      M15_TEXT.record_line('F', S1.listings.F),
    );

    // The surviving draft D is replaced by C before the record.
    wiring(r, 'c');
    expect(next(r)).toBe('question_presented');
    expect(m15sDraft(r.s, 's1_q1_a', 'pointer', r.settle(), r.sink)).toBe(true);
    m15sLeave(r.s, r.tick(10), r.sink);
    m15sOpen(r.s, r.tick(10), r.sink);
    expect(r.s.view).toBe('question');
    expect(r.s.boxes[0].questions[0].draft).toBe('s1_q1_a');
    expect(r.s.boxes[0].wiring?.option_id).toBe('s1_w_c');
    expect(count(r, 'question_presented')).toBe(1);
    // The surviving draft A is replaced by B before the record.
    answer(r, 'b');
    m15sLeave(r.s, r.tick(10), r.sink);
    m15sOpen(r.s, r.tick(10), r.sink);
    expect(r.s.view).toBe('acknowledgement');
    expect(count(r, 'first_response')).toBe(1);
    expect(count(r, 'question_presented')).toBe(1);
  });

  test('the review closure: orientation only, tests only, wiring only, partial series each close with the record as it stands; a completed series is not reclosed', () => {
    // Orientation only.
    const orientation = run();

    m15sOpen(orientation.s, orientation.now, orientation.sink);
    expect(
      m15sCloseAtReview(orientation.s, orientation.tick(10), orientation.sink),
    ).toBe(true);
    expect(
      last(orientation, 'series_closed_at_review')!.metadata,
    ).toMatchObject({
      phase: 'closure',
      closure_reason: 'closed_at_review',
      boxes_presented: 0,
      models_recorded: 0,
      predictions_answered: 0,
    });
    expect(orientation.s.status).toBe('closed_at_review');

    // Tests only.
    const tests = started();

    testDial(tests, 'F');
    expect(m15sCloseAtReview(tests.s, tests.tick(10), tests.sink)).toBe(true);
    expect(last(tests, 'series_closed_at_review')!.metadata).toMatchObject({
      boxes_presented: 1,
      models_recorded: 0,
      questions_presented: 0,
    });

    // Wiring only.
    const model = started();

    wiring(model, 'b');
    expect(m15sCloseAtReview(model.s, model.tick(10), model.sink)).toBe(true);
    expect(last(model, 'series_closed_at_review')!.metadata).toMatchObject({
      models_recorded: 1,
      models_correct: 1,
      questions_presented: 0,
      predictions_answered: 0,
    });

    // Partial: three answers, the fourth presented.
    const partial = started();

    completeSeries(partial, { answers: ['c', 'b', 'cannot_solve'] });
    expect(next(partial)).toBe('question_presented');
    expect(m15sCloseAtReview(partial.s, partial.tick(10), partial.sink)).toBe(
      true,
    );
    expect(last(partial, 'series_closed_at_review')!.metadata).toMatchObject({
      predictions_answered: 3,
      correct_first_predictions: 2,
      cannot_solve_count: 1,
      questions_presented: 4,
    });
    expect(count(partial, 'first_response')).toBe(3);
    // Nothing more is recorded afterwards.
    const before = partial.events.length;

    expect(
      m15sDraft(
        partial.s,
        's2_q2_c',
        'keyboard',
        partial.settle(),
        partial.sink,
      ),
    ).toBe(false);
    expect(
      m15sRequestCommit(
        partial.s,
        'cannot',
        'keyboard',
        partial.tick(10),
        partial.sink,
      ),
    ).toBe('none');
    expect(partial.events.length).toBe(before);

    // Completed: not reclosed.
    const done = started();

    completeSeries(done, { answers: ['c', 'b', 'b', 'c'] });
    expect(m15sCloseAtReview(done.s, done.tick(10), done.sink)).toBe(false);
    expect(count(done, 'series_closed_at_review')).toBe(0);
    expect(done.s.status).toBe('completed');
  });

  test("the reload predicate reads an earlier load's opportunity_opened; a held-back bench is a closed record; the reload check establishes absence only from a continuous history without an opening", () => {
    expect(
      m15PriorAdministration([
        { event_type: `${M15_FAMILY}presented` },
        { event_type: 'proto_m14_integration_opportunity_opened' },
      ]),
    ).toBe(false);
    expect(
      m15PriorAdministration([
        { event_type: `${M15_FAMILY}opportunity_opened` },
      ]),
    ).toBe(true);

    const s = createM15Series();

    expect(m15sHoldBack(s)).toBe(true);
    expect(s.status).toBe('held_back');
    expect(m15sHoldBack(s)).toBe(false);

    const view = render(s);

    expect(view.ids).toEqual(['record_text', 'leave']);
    expect(view.lines).toContain(M15_TEXT.held_back);
    expect(view.lines).not.toContain('of 4 answers');
    expect(M15_RELOAD_DETAIL.startsWith('reload')).toBe(true);

    const continuous = {
      first_sequence: 1,
      sequence_gap_count: 0,
      sequence_duplicate_count: 0,
      recovered_from_chunks: false,
    };
    const briefedOnly = [{ event_type: `${M15_FAMILY}presented` }];

    expect(m15PriorLoadCheck(2, briefedOnly, continuous)).toEqual({
      page_load_index: 2,
      prior_page_load_event_count: 1,
      prior_opening_found: false,
      prior_briefing_found: true,
      history_continuous: true,
      prior_opening_absence_established: true,
    });
    expect(
      m15PriorLoadCheck(2, [], continuous).prior_opening_absence_established,
    ).toBe(false);
    expect(
      m15PriorLoadCheck(2, briefedOnly, {
        ...continuous,
        sequence_gap_count: 1,
      }).prior_opening_absence_established,
    ).toBe(false);
    expect(
      m15PriorLoadCheck(2, briefedOnly, { ...continuous, first_sequence: 2 })
        .history_continuous,
    ).toBe(false);
    expect(
      m15PriorLoadCheck(2, briefedOnly, {
        ...continuous,
        recovered_from_chunks: true,
      }).history_continuous,
    ).toBe(false);

    const opened = m15PriorLoadCheck(
      2,
      [...briefedOnly, { event_type: `${M15_FAMILY}opportunity_opened` }],
      continuous,
    );

    expect(opened).toMatchObject({
      prior_opening_found: true,
      prior_briefing_found: true,
      history_continuous: true,
      prior_opening_absence_established: false,
    });
  });

  test('a fault closes an open first-response phase; after completion it is recorded without touching the scored phase', () => {
    const r = started();

    wiring(r, 'b');
    expect(m15sFail(r.s, 'boom')).toBe('scored_phase');
    expect(r.s.status).toBe('technical_failure');
    expect(render(r.s).lines).toContain(M15_TEXT.fault);
    expect(m15sFail(r.s, 'again')).toBe('none');

    const done = started();

    completeSeries(done, { answers: ['c', 'b', 'b', 'c'] });
    expect(m15sFail(done.s, 'late')).toBe('feedback');
    expect(done.s.status).toBe('completed');
    expect(done.s.closure_reason).toBe('completed');
  });

  test("the entry snapshot and the event suffixes are the contract's; consistent_with_recorded_wiring follows the §7.1 table", () => {
    const snapshot = m15EntrySnapshot('lab_work');

    expect(snapshot).toMatchObject({
      boxes_planned: 2,
      predictions_planned: 4,
      assigned_box_order: ['s1', 's2'],
      exploration: 'single_dial_tests_close_at_wiring',
      model_commit: 'required_before_questions',
      cannot_solve_available: true,
      cannot_tell_available: true,
      feedback: 'after_all_first_predictions',
      stop_control: false,
      settle_ms: 400,
      stage: 'lab_work',
    });
    expect(snapshot.boxes.map((box) => box.content_version)).toEqual([
      'm15-s1-v1',
      'm15-s2-v1',
    ]);
    expect(snapshot.boxes[0]).toMatchObject({
      box_id: 's1',
      box_window_id: 'm15_system_s1',
      dial_ids: ['s1_f', 's1_g'],
      unit_ids: ['s1_p', 's1_q', 's1_w'],
      wiring_option_ids: ['s1_w_a', 's1_w_b', 's1_w_c', 's1_w_d'],
      wiring_key_option_id: 's1_w_b',
    });
    expect(snapshot.boxes[1].questions.map((q) => q.key_option_id)).toEqual([
      's2_q1_b',
      's2_q2_c',
    ]);

    for (const suffix of [
      'test_run',
      'wiring_drafted',
      'wiring_recorded',
      'box_presented',
      'commit_press_refused',
      'commit_without_draft',
      'prior_load_checked',
    ]) {
      expect(M15_EVENT_SUFFIXES).toContain(suffix);
    }

    // Under wiring A (box 1) the implied S1-Q1 answer is "up": an answer
    // "up" is consistent, the key "does not move" is not; under the key B
    // the key answer is consistent; CANNOT TELL and CANNOT SOLVE are null.
    const a = started();

    wiring(a, 'a');
    expect(next(a)).toBe('question_presented');
    answer(a, 'a');
    expect(last(a, 'first_response')!.metadata).toMatchObject({
      recorded_wiring_option_id: 's1_w_a',
      consistent_with_recorded_wiring: true,
      correct: false,
    });
    expect(next(a)).toBe('question_presented');
    answer(a, 'b');
    expect(last(a, 'first_response')!.metadata).toMatchObject({
      consistent_with_recorded_wiring: false,
      correct: true,
    });

    const b = started();

    wiring(b, 'b');
    expect(next(b)).toBe('question_presented');
    answer(b, 'c');
    expect(last(b, 'first_response')!.metadata).toMatchObject({
      recorded_wiring_option_id: 's1_w_b',
      consistent_with_recorded_wiring: true,
      correct: true,
    });
    expect(next(b)).toBe('question_presented');
    answer(b, 'cannot_solve');
    expect(last(b, 'first_response')!.metadata).toMatchObject({
      consistent_with_recorded_wiring: null,
      correct: false,
    });
  });
});

/* ------------------------------------------------------------------ *
 * 7. The extractor on synthetic logs
 * ------------------------------------------------------------------ */

type Step = (r: Run) => void;

interface LogOptions {
  /** Omit the kit's `opportunity_opened` (the bench never opened). */
  opened?: boolean;
  /** Add the kit's `presented` (the briefing acknowledged) first. */
  briefed?: boolean;
  /** Add the kit's review-closure `window_closed` for a never-opened bench. */
  absentAtReview?: boolean;
  version?: string;
  opportunity?: string;
  pageLoadIndex?: number;
  /** Rewrites each event's sequence (default: 100, 101, …). */
  sequence?: (index: number) => number | undefined;
}

function kitFields(options: LogOptions = {}): Record<string, unknown> {
  return {
    measure_id: 'M15',
    opportunity_id: options.opportunity ?? M15_OPPORTUNITY_ID,
    window_id: M15_WINDOW_ID,
    entry_state_version: options.version ?? M15_ENTRY_STATE_VERSION,
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
        entry_state_snapshot: m15EntrySnapshot('lab_work'),
        input_mode: 'system',
      },
    });
    m15sOpen(r.s, r.now, r.sink);
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
    scene: 'diagnostics_laboratory',
    event_type: `${M15_FAMILY}${event.suffix}`,
    object_id: 'm15_relay_bench',
    sequence: options.sequence ? options.sequence(index) : 100 + index * 10,
    page_load_index: options.pageLoadIndex ?? 1,
    metadata: { ...kitFields(options), ...event.metadata },
  }));
}

const CONTEXT = { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false };
const CLOSED = { ...CONTEXT, finalCoreClosed: true };
const RELOADED = { finalCoreClosed: false, pageLoadIndex: 2, reloaded: true };

function row(events: RawGameEvent[], context = CONTEXT) {
  const rows = extractItemFeatures('M15', events, context);

  expect(rows).toHaveLength(1);
  expect(rows[0].feature_id).toBe('m15_correct_first_predictions');
  expect(rows[0].planned_denominator).toBe(4);

  return rows[0];
}

const start: Step = (r) => {
  m15sStart(r.s, 'keyboard', r.settle(), r.sink);
};
const series =
  (plan: Parameters<typeof completeSeries>[1]): Step =>
  (r) => {
    completeSeries(r, plan);
  };
const closeAtReview: Step = (r) => {
  m15sCloseAtReview(r.s, r.tick(10), r.sink);
};
const leave: Step = (r) => {
  m15sLeave(r.s, r.tick(10), r.sink);
  m15sOpen(r.s, r.tick(10), r.sink);
};
const tests =
  (letters: string[]): Step =>
  (r) => {
    for (const letter of letters) {
      testDial(r, letter);
    }
  };
const record =
  (choice: OptionLetter | 'cannot_tell'): Step =>
  (r) => {
    wiring(r, choice);
  };
const firstQuestion: Step = (r) => {
  expect(next(r)).toBe('question_presented');
};
const fault: Step = (r) => {
  m15sFail(r.s, 'boom');
  r.events.push({
    suffix: 'technical_failure',
    metadata: { detail: 'boom', input_mode: 'system' },
  });
};

const ALL_KEYS = QUESTION_IDS.map((id) => KEY_LETTERS[id]);
const ALL_WRONG = QUESTION_IDS.map((id) => WRONG_LETTERS[id]);

/** Mutates one event's metadata in a copied log. */
function withMeta(
  events: RawGameEvent[],
  suffix: string,
  patch: Record<string, unknown>,
  which: 'first' | 'last' = 'last',
): RawGameEvent[] {
  const copy = events.map((event) => ({
    ...event,
    metadata: { ...event.metadata },
  }));
  const own = copy.filter(
    (event) => event.event_type === `${M15_FAMILY}${suffix}`,
  );
  const target = which === 'first' ? own[0] : own[own.length - 1];

  expect(target, suffix).toBeDefined();
  Object.assign(target.metadata as Record<string, unknown>, patch);

  return copy;
}

function without(
  events: RawGameEvent[],
  suffix: string,
  which: 'first' | 'last' = 'last',
) {
  const own = events.filter(
    (event) => event.event_type === `${M15_FAMILY}${suffix}`,
  );
  const target = which === 'first' ? own[0] : own[own.length - 1];

  return events.filter((event) => event !== target);
}

test.describe('M15 extractor — values and companions', () => {
  test('4 / 4, 0 / 4 and a mixed series with CANNOT SOLVE are observed on the planned four; by-box split', () => {
    const four = row(log([start, series({ answers: ALL_KEYS })]));

    expect(four).toMatchObject({
      value: 4,
      numerator: 4,
      denominator: 4,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
      included_ids: QUESTION_IDS,
    });
    expect(four.components.by_box).toMatchObject({
      s1: { numerator: 2, denominator: 2, planned: 2 },
      s2: { numerator: 2, denominator: 2, planned: 2 },
    });

    const zero = row(log([start, series({ answers: ALL_WRONG })]));

    expect(zero).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 4,
      disposition: 'observed',
    });

    const mixed = row(
      log([start, series({ answers: ['c', 'cannot_solve', 'a', 'c'] })]),
    );

    expect(mixed).toMatchObject({ value: 2, numerator: 2, denominator: 4 });
    expect(mixed.components.cannot_solve_count).toBe(1);
    expect(mixed.components.by_box).toMatchObject({
      s1: { numerator: 1, denominator: 2 },
      s2: { numerator: 1, denominator: 2 },
    });
    expect(
      (mixed.components.questions as { correct: boolean | null }[]).map(
        (q) => q.correct,
      ),
    ).toEqual([true, false, false, true]);
  });

  test('an answer counts whatever wiring was recorded (a wrong one or CANNOT TELL) and whatever tests were run; model and exploration are companions beside the value', () => {
    const events = log([
      start,
      series({
        s1: { tests: ['F', 'F', 'G'], wiring: 'a' },
        s2: { tests: ['S'], wiring: 'cannot_tell' },
        answers: ['c', 'b', 'cannot_solve', 'c'],
      }),
    ]);
    const result = row(events);

    expect(result).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 4,
      disposition: 'observed',
    });
    expect(result.components.model).toEqual({
      by_box: {
        s1: {
          wiring_recorded: true,
          recorded_wiring: 's1_w_a',
          wiring_correct: false,
          wiring_key_option_id: 's1_w_b',
        },
        s2: {
          wiring_recorded: true,
          recorded_wiring: 'cannot_tell',
          wiring_correct: false,
          wiring_key_option_id: 's2_w_d',
        },
      },
      models_recorded: 2,
      models_correct: 0,
      models_planned: 2,
    });
    expect(result.components.cannot_tell_count).toBe(1);
    expect(result.components.exploration).toEqual({
      s1: {
        dial_ids: ['s1_f', 's1_g'],
        runs_per_dial_before_wiring: { s1_f: 2, s1_g: 1 },
        dials_tested_before_wiring: ['s1_f', 's1_g'],
        both_dials_tested_before_wiring: true,
        total_runs_before_wiring: 3,
      },
      s2: {
        dial_ids: ['s2_s', 's2_t'],
        runs_per_dial_before_wiring: { s2_s: 1, s2_t: 0 },
        dials_tested_before_wiring: ['s2_s'],
        both_dials_tested_before_wiring: false,
        total_runs_before_wiring: 1,
      },
    });

    const questions = result.components.questions as Record<string, unknown>[];

    expect(questions.map((q) => q.consistent_with_recorded_wiring)).toEqual([
      false,
      false,
      null,
      null,
    ]);
    expect(questions.map((q) => q.recorded_wiring_option_id)).toEqual([
      's1_w_a',
      's1_w_a',
      'cannot_tell',
      'cannot_tell',
    ]);
    expect(questions[3].tests_before).toEqual({ s2_s: 1, s2_t: 0 });
    expect(result.components.model_record_consistent).toBe(true);
    expect(result.components.exposure_record_consistent).toBe(true);

    // No tests at all: the same row, the exploration companion empty.
    const none = row(
      log([
        start,
        series({ s1: { wiring: 'b' }, s2: { wiring: 'd' }, answers: ALL_KEYS }),
      ]),
    );

    expect(none.value).toBe(4);
    expect(
      (
        none.components.exploration as Record<
          string,
          { total_runs_before_wiring: number }
        >
      ).s1.total_runs_before_wiring,
    ).toBe(0);
    expect(
      (none.components.model as { models_correct: number }).models_correct,
    ).toBe(2);
  });

  test('the completed row is stable: results unopened, opened, after leaving and after the review give the identical observed row', () => {
    const base = log([start, series({ answers: ['c', 'a', 'b', 'c'] })]);
    const reference = row(base);

    expect(reference).toMatchObject({ value: 3, disposition: 'observed' });

    const shown = log([
      start,
      series({ answers: ['c', 'a', 'b', 'c'], showResults: true }),
      (r) => {
        m15sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink);
      },
      leave,
    ]);
    const afterResults = row(shown, CLOSED);

    const strip = (record: FeatureRecordLike) => ({
      ...record,
      supporting_sequences: [],
      components: {
        ...record.components,
        results_shown: undefined,
      },
    });

    expect(strip(afterResults)).toEqual(strip(reference));
    expect(afterResults.components.results_shown).toEqual({
      s1: true,
      s2: true,
    });

    const reviewed = row(
      log([start, series({ answers: ['c', 'a', 'b', 'c'] }), closeAtReview]),
    );

    expect(strip(reviewed)).toEqual(strip(reference));
  });

  test('one to three answered and closed at the review ⇒ incomplete with the value and denominator, censored; omissions listed apart; still open ⇒ pending with the answers in the components', () => {
    const three = row(
      log([
        start,
        series({ answers: ['c', 'b', 'cannot_solve'] }),
        firstQuestion,
        closeAtReview,
      ]),
      CLOSED,
    );

    expect(three).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 3,
      planned_denominator: 4,
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
      included_ids: ['s1_q1', 's1_q2', 's2_q1'],
    });
    expect(three.components.omissions).toEqual({
      unanswered_question_ids: ['s2_q2'],
      unpresented_question_ids: [],
    });

    const one = row(
      log([start, series({ answers: ['a'] }), closeAtReview]),
      CLOSED,
    );

    expect(one).toMatchObject({
      value: 0,
      denominator: 1,
      disposition: 'incomplete',
    });
    expect(one.components.omissions).toEqual({
      unanswered_question_ids: [],
      unpresented_question_ids: ['s1_q2', 's2_q1', 's2_q2'],
    });

    const open = row(log([start, series({ answers: ['c', 'b'] })]));

    expect(open).toMatchObject({
      value: null,
      numerator: null,
      disposition: 'pending',
      included_ids: ['s1_q1', 's1_q2'],
    });
    expect(open.components.predictions_answered).toBe(2);
    expect(
      (open.components.questions as { answered: boolean }[]).map(
        (q) => q.answered,
      ),
    ).toEqual([true, true, false, false]);
  });
});

interface FeatureRecordLike {
  supporting_sequences: number[];
  components: Record<string, unknown>;
  [key: string]: unknown;
}

test.describe('M15 extractor — zero evidence and legitimate missingness (never technical_failure)', () => {
  test('never briefed and never opened ⇒ not_presented (also at the review closure); briefed and never opened ⇒ pending, then no_eligible_event with briefed_not_opened', () => {
    expect(row([])).toMatchObject({
      disposition: 'not_presented',
      value: null,
    });
    expect(
      row(log([], { opened: false, absentAtReview: true }), CLOSED),
    ).toMatchObject({
      disposition: 'not_presented',
    });

    const briefed = row(log([], { opened: false, briefed: true }));

    expect(briefed).toMatchObject({
      disposition: 'pending',
      value: null,
      missing_reason: 'briefed_not_opened',
    });
    expect(briefed.components.exposure).toMatchObject({
      briefed: true,
      bench_opened: false,
      never_opened_reason: 'briefed_not_opened',
    });

    const closed = row(
      log([], { opened: false, briefed: true, absentAtReview: true }),
      CLOSED,
    );

    expect(closed).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'briefed_not_opened',
      censored: true,
      censor_reason: 'briefed_not_opened',
      closure_reason: 'closed_at_review',
    });
  });

  test('no log of any kind yields declined; the exposure stages are distinct', () => {
    const logs = [
      [],
      log([], { opened: false, briefed: true }),
      log([], { briefed: true }),
      log([start], { briefed: true }),
      log([start, series({ answers: ['c'] })], { briefed: true }),
      log([start, series({ answers: ALL_KEYS })], { briefed: true }),
      log([start, closeAtReview], { briefed: true }),
    ];

    for (const events of logs) {
      expect(row(events).disposition).not.toBe('declined');
      expect(row(events, CLOSED).disposition).not.toBe('declined');
    }

    expect(row(logs[2]).components.exposure).toMatchObject({
      briefed: true,
      bench_opened: true,
      orientation_acknowledged: false,
      boxes_presented: 0,
      questions_presented: 0,
      never_opened_reason: null,
    });
    expect(row(logs[3]).components.exposure).toMatchObject({
      orientation_acknowledged: true,
      boxes_presented: 1,
      questions_presented: 0,
    });
    expect(row(logs[4]).components.exposure).toMatchObject({
      boxes_presented: 1,
      questions_presented: 1,
    });
  });

  test('opened and unanswered at the review ⇒ no_eligible_event with the stage reached; still open ⇒ pending', () => {
    const orientation = row(log([closeAtReview]), CLOSED);

    expect(orientation).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'orientation_only',
      censored: true,
      closure_reason: 'closed_at_review',
    });

    const testsOnly = row(
      log([start, tests(['F', 'G']), closeAtReview]),
      CLOSED,
    );

    expect(testsOnly).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'no_wiring_recorded',
    });
    expect(
      (
        testsOnly.components.exploration as Record<
          string,
          { total_runs_before_wiring: number }
        >
      ).s1.total_runs_before_wiring,
    ).toBe(2);

    const wiringOnly = row(log([start, record('b'), closeAtReview]), CLOSED);

    expect(wiringOnly).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'wiring_only_no_first_response',
    });
    expect(
      (wiringOnly.components.model as { models_correct: number })
        .models_correct,
    ).toBe(1);

    const presentedOnly = row(
      log([start, record('b'), firstQuestion, closeAtReview]),
      CLOSED,
    );

    expect(presentedOnly).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'wiring_only_no_first_response',
    });
    expect(presentedOnly.components.omissions).toEqual({
      unanswered_question_ids: ['s1_q1'],
      unpresented_question_ids: ['s1_q2', 's2_q1', 's2_q2'],
    });

    expect(row(log([start, record('b')])).disposition).toBe('pending');
    expect(row(log([start, tests(['F'])])).disposition).toBe('pending');
  });

  test('held back after a reload ⇒ interrupted (also after a completed earlier load); a fault ⇒ technical_failure with the answers kept', () => {
    const held = row(
      [
        ...log([], { opened: false, briefed: true, pageLoadIndex: 2 }),
        {
          session_id: 'GS',
          timestamp_ms: 2_000,
          scene: 'diagnostics_laboratory',
          event_type: `${M15_FAMILY}technical_failure`,
          object_id: 'm15_relay_bench',
          sequence: 200,
          page_load_index: 2,
          metadata: {
            ...kitFields(),
            detail: M15_RELOAD_DETAIL,
            input_mode: 'system',
          },
        },
      ],
      RELOADED,
    );

    expect(held).toMatchObject({ disposition: 'interrupted', value: null });
    expect(held.components).toMatchObject({
      held_back_after_reload: true,
      exposure: { briefed: true, bench_opened: false },
    });

    const faulted = row(log([start, series({ answers: ['c', 'b'] }), fault]));

    expect(faulted).toMatchObject({
      disposition: 'technical_failure',
      value: null,
      closure_reason: 'technical_failure',
      included_ids: ['s1_q1', 's1_q2'],
    });
    expect(faulted.components.predictions_answered).toBe(2);
  });

  test('after a reload: without a check ⇒ interrupted; with an ESTABLISHED absence the load is read as a first load (not_presented, then pending); a broken history or a found opening never establishes it', () => {
    const check = (patch: Record<string, unknown>): RawGameEvent => ({
      session_id: 'GS',
      timestamp_ms: 1_500,
      scene: 'diagnostics_laboratory',
      event_type: `${M15_FAMILY}prior_load_checked`,
      object_id: 'm15_relay_bench',
      sequence: 95,
      page_load_index: 2,
      metadata: {
        ...kitFields(),
        phase: 'closure',
        page_load_index: 2,
        prior_page_load_event_count: 40,
        prior_opening_found: false,
        prior_briefing_found: true,
        history_continuous: true,
        prior_opening_absence_established: true,
        input_mode: 'system',
        ...patch,
      },
    });

    expect(row([], RELOADED)).toMatchObject({ disposition: 'interrupted' });
    expect(
      row(
        log([], { opened: false, briefed: true, pageLoadIndex: 2 }),
        RELOADED,
      ),
    ).toMatchObject({ disposition: 'interrupted' });

    const established = row([check({})], RELOADED);

    expect(established).toMatchObject({ disposition: 'not_presented' });
    expect(established.components.reload_check).toEqual({
      page_reloaded: true,
      checked: true,
      prior_opening_found: false,
      prior_briefing_found: true,
      history_continuous: true,
      prior_opening_absence_established: true,
    });

    const briefedAfter = row(
      [
        check({}),
        ...log([], { opened: false, briefed: true, pageLoadIndex: 2 }),
      ],
      RELOADED,
    );

    expect(briefedAfter).toMatchObject({
      disposition: 'pending',
      missing_reason: 'briefed_not_opened',
    });

    // Opened normally after the established check: the ordinary rows.
    const openedAfter = row(
      [
        check({}),
        ...log([start, series({ answers: ALL_KEYS })], { pageLoadIndex: 2 }),
      ],
      RELOADED,
    );

    expect(openedAfter).toMatchObject({ value: 4, disposition: 'observed' });

    for (const patch of [
      { history_continuous: false, prior_opening_absence_established: false },
      { prior_opening_found: true, prior_opening_absence_established: false },
      {
        prior_page_load_event_count: 0,
        prior_opening_absence_established: false,
      },
    ]) {
      expect(row([check(patch)], RELOADED).disposition).toBe('interrupted');
    }

    // A self-contradictory check establishes nothing and is flagged.
    const contradictory = row([check({ history_continuous: false })], RELOADED);

    expect(contradictory.disposition).toBe('interrupted');
    expect(contradictory.components.exposure_record_consistent).toBe(false);
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
      row(log([start, tests(['F'])])),
      row(log([start, record('cannot_tell'), closeAtReview]), CLOSED),
      row(log([start, series({ answers: ['a', 'b', 'c'] })])),
      row(
        log([start, series({ answers: ['a', 'b', 'c'] }), closeAtReview]),
        CLOSED,
      ),
      row([], RELOADED),
    ];

    for (const record of cases) {
      expect(record.disposition).not.toBe('technical_failure');
    }
  });
});

test.describe('M15 extractor — integrity (technical_failure for contradictory or unverifiable scored evidence)', () => {
  const complete = () =>
    log([
      start,
      series({ s1: { tests: ['F'], wiring: 'b' }, answers: ALL_KEYS }),
    ]);
  const partial = () => log([start, series({ answers: ['c', 'b'] })]);

  test('duplicate first response, unknown or mismatched version or opportunity, unknown ids, an option of another question, a wrong content version', () => {
    const events = complete();
    const duplicate = [
      ...events,
      {
        ...events.find((e) => e.event_type.endsWith('first_response'))!,
        sequence: 900,
      },
    ];

    expect(row(duplicate).disposition).toBe('technical_failure');
    expect(
      row(
        log([start, series({ answers: ALL_KEYS })], {
          version: 'm15-systems-v9',
        }),
      ).disposition,
    ).toBe('technical_failure');
    expect(
      row(
        log([start, series({ answers: ALL_KEYS })], {
          opportunity: 'proto_m15_layered_cipher',
        }),
      ).disposition,
    ).toBe('technical_failure');
    expect(
      row(withMeta(events, 'first_response', { question_id: 's9_q1' }))
        .disposition,
    ).toBe('technical_failure');
    expect(
      row(withMeta(events, 'first_response', { box_id: 's2' }, 'first'))
        .disposition,
    ).toBe('technical_failure');
    expect(
      row(withMeta(events, 'first_response', { option_id: 's2_q1_b' }, 'first'))
        .disposition,
    ).toBe('technical_failure');
    expect(
      row(withMeta(events, 'box_presented', { box_id: 's3' }, 'first'))
        .disposition,
    ).toBe('technical_failure');
    expect(
      row(
        withMeta(
          events,
          'question_presented',
          { content_version: 'm15-s2-v1' },
          'first',
        ),
      ).disposition,
    ).toBe('technical_failure');
  });

  test("out-of-order or doubled presentation of a question or box; a question before its box's wiring; a response without presentation", () => {
    const events = complete();
    const presentations = events.filter((e) =>
      e.event_type.endsWith('question_presented'),
    );

    // Doubled question presentation.
    expect(
      row([...events, { ...presentations[0], sequence: 901 }]).disposition,
    ).toBe('technical_failure');
    // Out of order: swap the sequences of the first two presentations.
    const swapped = events.map((event) => {
      if (event === presentations[0]) {
        return { ...event, sequence: presentations[1].sequence };
      }

      if (event === presentations[1]) {
        return { ...event, sequence: presentations[0].sequence };
      }

      return event;
    });

    expect(row(swapped).disposition).toBe('technical_failure');
    // A question presented before the box's wiring: move the first
    // presentation ahead of the wiring record.
    const wiringRecorded = events.find((e) =>
      e.event_type.endsWith('wiring_recorded'),
    )!;
    const early = events.map((event) =>
      event === presentations[0]
        ? { ...event, sequence: wiringRecorded.sequence! - 5 }
        : event,
    );

    expect(row(early).disposition).toBe('technical_failure');
    // A response without its presentation.
    expect(
      row(without(events, 'question_presented', 'first')).disposition,
    ).toBe('technical_failure');
    // Box 2 presented after box 1's first question only — its second
    // question never presented or answered — and the log stops right
    // there, so that no later question-order rule can catch it: a check
    // that compares only the last presented question reads this as an
    // open series (`pending`); the rule reads it as a technical failure.
    const s1q2 = events.find(
      (e) =>
        e.event_type.endsWith('question_presented') &&
        (e.metadata as { question_id?: string }).question_id === 's1_q2',
    )!;
    const s1q2Answer = events.find(
      (e) =>
        e.event_type.endsWith('first_response') &&
        (e.metadata as { question_id?: string }).question_id === 's1_q2',
    )!;
    const box2 = events.find(
      (e) =>
        e.event_type.endsWith('box_presented') &&
        (e.metadata as { box_id?: string }).box_id === 's2',
    )!;
    const skipped = events
      .slice(0, events.indexOf(box2) + 1)
      .filter((e) => e !== s1q2 && e !== s1q2Answer);

    expect(skipped[skipped.length - 1]).toBe(box2);
    expect(row(skipped).disposition).toBe('technical_failure');
    // A box presented twice / out of order.
    const boxes = events.filter((e) => e.event_type.endsWith('box_presented'));

    expect(row([...events, { ...boxes[0], sequence: 902 }]).disposition).toBe(
      'technical_failure',
    );
    expect(
      row(
        withMeta(
          events,
          'box_presented',
          { box_id: 's2', content_version: 'm15-s2-v1' },
          'first',
        ),
      ).disposition,
    ).toBe('technical_failure');
  });

  test('a correct flag contradicting the key, CANNOT SOLVE marked correct or with an option, a missing option id, a non-boolean correct, a key disagreeing with the content, a response outside measurement', () => {
    const events = complete();

    expect(
      row(withMeta(events, 'first_response', { correct: false }, 'first'))
        .disposition,
    ).toBe('technical_failure');
    expect(
      row(withMeta(events, 'first_response', { option_id: null }, 'first'))
        .disposition,
    ).toBe('technical_failure');
    expect(
      row(withMeta(events, 'first_response', { correct: 'yes' }, 'first'))
        .disposition,
    ).toBe('technical_failure');
    expect(
      row(
        withMeta(
          events,
          'first_response',
          { key_option_id: 's1_q1_a' },
          'first',
        ),
      ).disposition,
    ).toBe('technical_failure');
    expect(
      row(withMeta(events, 'first_response', { phase: 'model' }, 'first'))
        .disposition,
    ).toBe('technical_failure');
    expect(
      row(
        withMeta(events, 'first_response', { response_kind: 'guess' }, 'first'),
      ).disposition,
    ).toBe('technical_failure');

    const cannot = log([
      start,
      series({ answers: ['cannot_solve', 'b', 'b', 'c'] }),
    ]);

    expect(
      row(withMeta(cannot, 'first_response', { correct: true }, 'first'))
        .disposition,
    ).toBe('technical_failure');
    expect(
      row(withMeta(cannot, 'first_response', { option_id: 's1_q1_c' }, 'first'))
        .disposition,
    ).toBe('technical_failure');
  });

  test('a response after completion, four responses without the snapshot, a snapshot with fewer or disagreeing, results before the fourth response, a double closure', () => {
    const events = complete();
    const responses = events.filter((e) =>
      e.event_type.endsWith('first_response'),
    );
    const completion = events.find((e) =>
      e.event_type.endsWith('first_responses_completed'),
    )!;

    expect(row(without(events, 'first_responses_completed')).disposition).toBe(
      'technical_failure',
    );
    expect(
      row(
        withMeta(events, 'first_responses_completed', {
          predictions_answered: 3,
        }),
      ).disposition,
    ).toBe('technical_failure');
    expect(
      row(
        withMeta(events, 'first_responses_completed', {
          correct_first_predictions: 1,
        }),
      ).disposition,
    ).toBe('technical_failure');
    // The completion before the fourth response.
    const earlyCompletion = events.map((event) =>
      event === completion
        ? { ...event, sequence: responses[3].sequence! - 5 }
        : event,
    );

    expect(row(earlyCompletion).disposition).toBe('technical_failure');
    // A response after completion.
    expect(
      row([...events, { ...responses[3], sequence: 950 }]).disposition,
    ).toBe('technical_failure');
    // Results before the fourth response, also in a partial series.
    const resultsEvent: RawGameEvent = {
      session_id: 'GS',
      timestamp_ms: 5_000,
      scene: 'diagnostics_laboratory',
      event_type: `${M15_FAMILY}results_shown`,
      object_id: 'm15_relay_bench',
      sequence: 150.5,
      page_load_index: 1,
      metadata: { ...kitFields(), phase: 'feedback', box_id: 's1' },
    };

    expect(
      row([...partial(), { ...resultsEvent, sequence: 950 }]).disposition,
    ).toBe('technical_failure');
    expect(
      row([
        ...events,
        { ...resultsEvent, sequence: responses[1].sequence! + 5 },
      ]).disposition,
    ).toBe('technical_failure');
    // A closure snapshot that disagrees; a double closure.
    const closed = log([start, series({ answers: ['c', 'b'] }), closeAtReview]);

    expect(
      row(
        withMeta(closed, 'series_closed_at_review', {
          predictions_answered: 1,
        }),
        CLOSED,
      ).disposition,
    ).toBe('technical_failure');
    const closure = closed.find((e) =>
      e.event_type.endsWith('series_closed_at_review'),
    )!;

    expect(
      row([...closed, { ...closure, sequence: 960 }], CLOSED).disposition,
    ).toBe('technical_failure');
  });

  test('missing, zero, negative, fractional, string or duplicated sequence numbers; a presented or check record without a usable sequence or of another identity', () => {
    const base = log([start, series({ answers: ALL_KEYS })]);

    for (const rewrite of [
      (index: number) => (index === 3 ? undefined : 100 + index),
      (index: number) => (index === 3 ? 0 : 100 + index),
      (index: number) => (index === 3 ? -4 : 100 + index),
      (index: number) => (index === 3 ? 103.5 : 100 + index),
      (index: number) => (index === 3 ? 100 : 100 + index),
    ]) {
      expect(
        row(log([start, series({ answers: ALL_KEYS })], { sequence: rewrite }))
          .disposition,
      ).toBe('technical_failure');
    }

    expect(
      row(
        log([start, series({ answers: ALL_KEYS })], {
          sequence: (index) =>
            index === 2 ? ('x' as unknown as number) : 100 + index,
        }),
      ).disposition,
    ).toBe('technical_failure');
    expect(row(base).disposition).toBe('observed');

    // A presented record without a usable sequence, on a first load.
    const presented = log([], {
      opened: false,
      briefed: true,
      sequence: () => undefined,
    });

    expect(row(presented).disposition).toBe('technical_failure');
    // A presented record of another opportunity.
    expect(
      row(
        log([], {
          opened: false,
          briefed: true,
          opportunity: 'secondary_m15_layered_cipher',
        }),
      ).disposition,
    ).toBe('technical_failure');
    // On the established reload path the same integrity applies.
    const check: RawGameEvent = {
      session_id: 'GS',
      timestamp_ms: 1_500,
      scene: 'diagnostics_laboratory',
      event_type: `${M15_FAMILY}prior_load_checked`,
      object_id: 'm15_relay_bench',
      sequence: 150,
      page_load_index: 2,
      metadata: {
        ...kitFields(),
        prior_page_load_event_count: 10,
        prior_opening_found: false,
        prior_briefing_found: false,
        history_continuous: true,
        prior_opening_absence_established: true,
      },
    };

    expect(row([check], RELOADED).disposition).toBe('not_presented');
    expect(row([{ ...check, sequence: undefined }], RELOADED).disposition).toBe(
      'technical_failure',
    );
    expect(
      row(
        [
          {
            ...check,
            metadata: { ...check.metadata, entry_state_version: 'other' },
          },
        ],
        RELOADED,
      ).disposition,
    ).toBe('technical_failure');
  });

  test('an unscored-record defect flags the components and leaves the row unchanged', () => {
    const events = complete();
    const reference = row(events);

    expect(reference).toMatchObject({ value: 4, disposition: 'observed' });
    expect(reference.components.model_record_consistent).toBe(true);

    const stripFlags = (record: FeatureRecordLike) => ({
      ...record,
      supporting_sequences: [],
      components: {
        ...record.components,
        model_record_consistent: undefined,
        exposure_record_consistent: undefined,
      },
    });
    const flagged = (
      mutated: RawGameEvent[],
      flag: 'model_record_consistent' | 'exposure_record_consistent',
      ignore: string[] = [],
    ) => {
      const result = row(mutated);
      const prune = (record: FeatureRecordLike) => {
        const copy = { ...record, components: { ...record.components } };

        for (const key of ignore) {
          delete copy.components[key];
        }

        return copy;
      };

      expect(result.components[flag]).toBe(false);
      expect(prune(stripFlags(result))).toEqual(prune(stripFlags(reference)));
    };
    const wiringRecorded = events.find((e) =>
      e.event_type.endsWith('wiring_recorded'),
    )!;
    const testRun = events.find((e) => e.event_type.endsWith('test_run'))!;

    // A test after the box's wiring was recorded.
    flagged(
      [...events, { ...testRun, sequence: wiringRecorded.sequence! + 5 }],
      'model_record_consistent',
    );
    // Two wiring records for one box.
    flagged(
      [
        ...events,
        { ...wiringRecorded, sequence: wiringRecorded.sequence! + 2 },
      ],
      'model_record_consistent',
    );
    // A wiring record whose correct flag disagrees with the wiring key.
    flagged(
      withMeta(events, 'wiring_recorded', { correct: false }, 'first'),
      'model_record_consistent',
    );
    // An orphan draft (a question not yet presented).
    const draft: RawGameEvent = {
      ...events.find((e) => e.event_type.endsWith('option_drafted'))!,
      sequence: wiringRecorded.sequence! + 7,
      metadata: {
        ...events.find((e) => e.event_type.endsWith('option_drafted'))!
          .metadata,
        question_id: 's2_q2',
        box_id: 's2',
      },
    };

    flagged([...events, draft], 'exposure_record_consistent');
    // A help record without a box.
    const help: RawGameEvent = {
      session_id: 'GS',
      timestamp_ms: 3_000,
      scene: 'diagnostics_laboratory',
      event_type: `${M15_FAMILY}help_consulted`,
      object_id: 'm15_relay_bench',
      sequence: wiringRecorded.sequence! + 5,
      page_load_index: 1,
      metadata: { ...kitFields(), phase: 'model', input_mode: 'keyboard' },
    };

    // The help count changes with the record; the row does not.
    flagged([...events, help], 'exposure_record_consistent', ['help_consults']);
  });

  test("determinism: the same log gives identical rows; the input is not mutated; the row equals the full extraction's row", () => {
    const events = log([
      start,
      series({
        s1: { tests: ['F', 'G'], wiring: 'b' },
        s2: { tests: ['T'], wiring: 'c' },
        answers: ['c', 'b', 'a', 'c'],
      }),
    ]);
    const before = JSON.stringify(events);
    const first = row(events);
    const second = row(events);

    expect(JSON.stringify(events)).toBe(before);
    expect(second).toEqual(first);
    expect(first).toMatchObject({ value: 3, disposition: 'observed' });

    const full = extractMeasurementFeatures(events, CONTEXT).filter(
      (record) => record.item_id === 'M15',
    );

    expect(full).toEqual([first]);
    expect(JSON.stringify(events)).toBe(before);
  });
});

/* ------------------------------------------------------------------ *
 * 8. Wording
 * ------------------------------------------------------------------ */

test.describe('M15 wording', () => {
  test('no participant-facing string carries a forbidden token; "solve" only inside CANNOT SOLVE', () => {
    for (const line of m15ParticipantStrings()) {
      expect(line, line).not.toMatch(FORBIDDEN);

      const stripped = line.replace(/CANNOT SOLVE/g, '');

      expect(stripped, line).not.toMatch(/solve/i);
    }
  });

  test('the fixed strings of the preview are present exactly', () => {
    const strings = m15ParticipantStrings();

    for (const expected of [
      'Two relay boxes came in from the storm relay. Each has two dials and three units.',
      'Recorded answers cannot be changed. Results come after both boxes.',
      'START BOX 1',
      'Test the dials as often as you like, then record the wiring that fits.',
      'Tests closed. The test record stays on the bench.',
      'Use the test record and the wiring you recorded. Choose an answer, then record it.',
      '3 of 4 answers recorded.',
      'Dials F and G · units P, Q, W',
      'Dials S and T · units X, Y, Z',
      'TEST DIAL F  [1]',
      'TEST G  not run yet',
      'TEST RECORD',
      'WIRING OF BOX 2 — which one fits your tests?',
      'Choose the wiring (A-D) that fits your tests, then record it. Recording closes the tests; the test record stays.',
      'RECORD WIRING  [R]',
      'CANNOT TELL  [N]',
      'Choose a wiring first.',
      'YOUR RECORDED WIRING',
      'QUESTION 1 OF 2',
      'RECORD ANSWER  [R]',
      'CANNOT SOLVE  [N]',
      'Choose an answer first.',
      'HELP  [H]',
      'LEAVE BENCH',
      '1 2 test · A-D choose · R record · N cannot · H help · ESC leaves (work kept)',
      'Record wiring A for box 1?\nThe tests then close; the test record stays.\nIt cannot be changed afterwards.',
      'Record CANNOT TELL for box 2?\nThe tests then close; the test record stays.\nIt cannot be changed afterwards.',
      'Record this answer for question 1?\nIt cannot be changed afterwards.',
      'Record CANNOT SOLVE for question 2?\nIt cannot be changed afterwards.',
      'RECORD WIRING  [ENTER]',
      'RECORD  [ENTER]',
      'RECORD ANSWER  [ENTER]',
      'KEEP WORKING  [ESC]',
      'Wiring recorded for box 1.',
      'FIRST QUESTION',
      'Answer recorded for question 2.',
      'NEXT QUESTION',
      'NEXT BOX',
      'SHOW RESULTS',
      'HOW THE BENCH WORKS',
      'Only RECORD WIRING / RECORD ANSWER, or CANNOT TELL / CANNOT SOLVE, after confirming, records anything.',
      'CLOSE HELP  [H]',
      'RESULTS — RELAY BOX 1 OF 2',
      'Your answers are fixed. This view only shows them.',
      'All four answers are recorded.',
      'Your recorded wiring:',
      'Station wiring:',
      'QUESTION 1 — P locked; F and G up',
      'Your recorded answer:',
      'Station answer:',
      'Station record closed — the bench keeps its record.',
      'This bench was already used in this session. Its record is kept; nothing further is recorded here.',
      ...S1.questions.map((q) => q.text),
      ...S2.questions.map((q) => q.results_line),
    ]) {
      expect(strings, expected).toContain(expected);
    }
  });

  test('no first-response-phase string contains a correctness word', () => {
    for (const line of m15FirstResponsePhaseStrings()) {
      expect(line, line).not.toMatch(CORRECTNESS);
    }

    // "Station wiring" / "Station answer" appear only in the results.
    expect(m15ParticipantStrings().some((line) => CORRECTNESS.test(line))).toBe(
      true,
    );
  });
});
