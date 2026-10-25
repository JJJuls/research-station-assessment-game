/**
 * Station 080 M19 — the two coupling lines at the Exterior Recovery Yard
 * coupling panel (Unit 21, administration `m19-lines-v2`), pure tests.
 *
 * Playwright test blocks that never touch `page`:
 * - the INDEPENDENT ORACLE: this file carries its own transcription of both
 *   lines' rules, keys and obstacle rules, of the panel check and of every
 *   participant-facing string, written by hand from `U21-OWNER-PREVIEW.md`
 *   sections 4–5 — it imports nothing from `m19LinesContent.ts` or
 *   `m19LinesModel.ts` for the expected side. It evaluates all 16 and all
 *   18 settings with its own evaluator and compares the module's readings,
 *   keys and evidence settings with them; a cross-check then binds the
 *   module's text to the transcription;
 * - the series model under research-owner decision D-U21-1: the boundary
 *   exactly at the obstacle TRY, never earlier, never on a line restored
 *   without it, never moved or repeated; refusals; what is and is not a
 *   continuation; the check outcomes; the settle and the fresh-press rule;
 * - the read-only extractor on synthetic logs: the preview §7 rows and the
 *   derivation cases E1–E21 and W1–W5 (expected values written by hand),
 *   one case per integrity rule S1–S7, descriptive inconsistencies as flags;
 * - the clock policy with an injected clock;
 * - the register row and route, the legacy module's separation and the
 *   yard scene's integration (source checks);
 * - the wording of the panel.
 *
 * Nothing here establishes psychometric validity: the two lines are
 * clustered observations inside one yard visit and one panel, not two
 * independent situations; the lines are not equated in difficulty; a count
 * never proves a trait.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { REGISTER_V3, registerEntry } from '../src/measurement/registerV3';
import {
  classifyReload,
  reloadHoldBackClass,
} from '../src/measurement/reloadCheck';
import { PILOT_SCHEDULE } from '../src/pilot/coverageSchedule';
import {
  M19_CHECKS,
  M19_CONTENT_VERSION,
  M19_ENTRY_STATE_VERSION,
  M19_FAMILY,
  M19_FORM_ID,
  M19_LINES,
  M19_OPPORTUNITY_ID,
  M19_SETTLE_MS,
  M19_TEXT,
  M19_WINDOW_ID,
  type M19Line,
  type M19Line1Setting,
  type M19Line2Setting,
  m19ObstacleEstablished,
  m19ParticipantStrings,
  m19Reading,
} from '../src/pilot/windows/m19LinesContent';
import {
  createM19Series,
  M19_CONTRADICTORY_DETAIL,
  M19_EVENT_SUFFIXES,
  M19_RELOAD_DETAIL,
  M19_UNVERIFIED_DETAIL,
  m19ClosureSnapshot,
  m19EntrySnapshot,
  type M19LogSink,
  m19PriorAdministration,
  m19PriorHoldBackCarried,
  m19PriorLoadCheck,
  m19RecordLine,
  m19sCancelSetAside,
  m19sChange,
  m19sCloseAtReview,
  m19sCloseAtShiftEnd,
  m19sCloseHelp,
  m19sCloseUnopened,
  m19sConfirmSetAside,
  m19sContinue,
  m19sContinueExplanation,
  m19sDraft,
  type M19Series,
  m19sFail,
  m19sFinish,
  m19sHelp,
  m19sHoldBack,
  m19sLeave,
  m19sNextLine,
  m19sOpen,
  m19sRecordAnswer,
  m19sRequestSetAside,
  m19sStartLine1,
  m19sTry,
} from '../src/pilot/windows/m19LinesModel';
import {
  type M19SurfaceHost,
  m19SurfaceModel,
} from '../src/pilot/windows/m19SurfaceModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/* ------------------------------------------------------------------ *
 * 1. The transcription, by hand from the preview (§4–§5). Nothing below
 *    is imported from the content module.
 * ------------------------------------------------------------------ */

type Reading = 'LOW' | 'OK' | 'HIGH';
interface Hand1 {
  h1: boolean;
  h2: boolean;
  h3: boolean;
  feed: 'SINGLE' | 'DOUBLE';
}
interface Hand2 {
  dial: number;
  bypass: 'SHUT' | 'OPEN';
}

const handReading = (value: number, target: number): Reading =>
  value < target ? 'LOW' : value > target ? 'HIGH' : 'OK';

/** Line 1 HEATER BANK: heaters of 1, 2 and 4 units; FEED DOUBLE doubles the ON heat; gauge against 10. */
const HAND1 = {
  settings: (): Hand1[] => {
    const out: Hand1[] = [];

    for (const feed of ['SINGLE', 'DOUBLE'] as const) {
      for (let mask = 0; mask < 8; mask += 1) {
        out.push({
          h1: (mask & 1) !== 0,
          h2: (mask & 2) !== 0,
          h3: (mask & 4) !== 0,
          feed,
        });
      }
    }

    return out;
  },
  value: (s: Hand1) =>
    ((s.h1 ? 1 : 0) + (s.h2 ? 2 : 0) + (s.h3 ? 4 : 0)) *
    (s.feed === 'DOUBLE' ? 2 : 1),
  target: 10,
  key: { h1: true, h2: false, h3: true, feed: 'DOUBLE' } as Hand1,
  start: { h1: false, h2: false, h3: false, feed: 'SINGLE' } as Hand1,
  /** The obstacle: the all-ON SINGLE setting has been executed. */
  obstacleAt: (tries: Hand1[]): number | null => {
    const at = tries.findIndex(
      (t) => t.feed === 'SINGLE' && t.h1 && t.h2 && t.h3,
    );

    return at < 0 ? null : at + 1;
  },
  same: (a: Hand1, b: Hand1) =>
    a.h1 === b.h1 && a.h2 === b.h2 && a.h3 === b.h3 && a.feed === b.feed,
};

/** Line 2 PRESSURE TRIM: pressure 2 × dial, one less with the bypass OPEN; gauge against 9. */
const HAND2 = {
  settings: (): Hand2[] => {
    const out: Hand2[] = [];

    for (const bypass of ['SHUT', 'OPEN'] as const) {
      for (let dial = 1; dial <= 9; dial += 1) {
        out.push({ dial, bypass });
      }
    }

    return out;
  },
  value: (s: Hand2) => 2 * s.dial - (s.bypass === 'OPEN' ? 1 : 0),
  target: 9,
  key: { dial: 5, bypass: 'OPEN' } as Hand2,
  start: { dial: 1, bypass: 'SHUT' } as Hand2,
  /** The obstacle: dial 4 SHUT and dial 5 SHUT have both been executed (the later one). */
  obstacleAt: (tries: Hand2[]): number | null => {
    const a = tries.findIndex((t) => t.dial === 4 && t.bypass === 'SHUT');
    const b = tries.findIndex((t) => t.dial === 5 && t.bypass === 'SHUT');

    return a < 0 || b < 0 ? null : Math.max(a, b) + 1;
  },
  same: (a: Hand2, b: Hand2) => a.dial === b.dial && a.bypass === b.bypass,
};

const HAND_CHECK = {
  q1: {
    question: 'After a TRY, the line is not restored. What can you do next?',
    options: [
      'Only LEAVE; the line then starts again.',
      'Change the settings and TRY, or SET ASIDE the line.',
      'Nothing; the line is now locked.',
    ],
    key: 2,
  },
  q2: {
    question: 'A TRY has just left a line not restored. Which is true?',
    options: [
      'The line now locks until the outside work ends.',
      'The line goes back to its first setting.',
      'A new setting can be tried, or the line set aside.',
    ],
    key: 3,
  },
};

/** Every participant-facing string of preview §4, in the forms the panel shows. */
const HAND_STRINGS: string[] = [
  'COOLANT COUPLING',
  'Two lines',
  'Panel check',
  'Line 1 of 2',
  'Line 2 of 2',
  'Read the card, then CONTINUE.',
  'One short check of how the panel works.',
  'Working on line 1 of 2.',
  'Working on line 2 of 2.',
  '1 of 2 lines finished.',
  '2 of 2 lines finished.',
  'The coupling has two lines to restore, one after the other.',
  'Each line has its own settings. Set them, then press TRY.',
  'After each TRY the gauge reading is shown and the TRY is listed.',
  'A setting already tried is not run again.',
  'You may TRY as many different settings as you wish.',
  'SET ASIDE finishes a line as it is; it stays finished.',
  'LEAVE keeps everything as it is while you are outside.',
  'Telling Noor you are finished outside closes the panel as it is.',
  'Nothing else on the shift depends on either line.',
  'First, one short check of how the panel works.',
  'CONTINUE',
  HAND_CHECK.q1.question,
  ...HAND_CHECK.q1.options.map((o, k) => `${o}  [${k + 1}]`),
  HAND_CHECK.q2.question,
  ...HAND_CHECK.q2.options.map((o, k) => `${o}  [${k + 1}]`),
  'RECORD ANSWER  [R]',
  'Choose an answer first.',
  'How the panel works:',
  'After any TRY you may change the settings and TRY again,',
  'or SET ASIDE the line. SET ASIDE finishes that line as it is;',
  'it stays finished; the next line comes up. Nothing resets or locks.',
  'Check recorded. Line 1 is ready.',
  'START LINE 1',
  'LINE 1 — HEATER BANK',
  'Three heaters: H1 adds 1 unit of heat, H2 adds 2, H3 adds 4.',
  'Each heater is ON or OFF. The FEED is SINGLE or DOUBLE.',
  'FEED DOUBLE doubles the heat of the heaters that are ON.',
  'TRY runs the line; the gauge reads LOW, OK or HIGH.',
  'The line is restored when the gauge reads OK.',
  '1-3 heater · 4 feed · T try · N set aside · H help · TAB · ESC leave',
  'LINE 2 — PRESSURE TRIM',
  'A pressure dial (1 to 9) and a bypass valve (SHUT or OPEN).',
  'A higher dial setting gives a higher pressure.',
  'The bypass, when OPEN, lowers the pressure a little.',
  'TRY runs the line; the gauge reads LOW, OK or HIGH.',
  'The line is restored when the gauge reads OK.',
  '1 down · 2 up · 3 bypass · T try · N set aside · H help · TAB · ESC leave',
  'ON: none · FEED SINGLE',
  'ON: H1 H2 H3 · FEED DOUBLE',
  'DIAL 1 · BYPASS SHUT',
  'H1  [1]',
  'H2  [2]',
  'H3  [3]',
  'FEED  [4]',
  'DIAL DOWN  [1]',
  'DIAL UP  [2]',
  'BYPASS  [3]',
  'TRY  [T]',
  'SET ASIDE  [N]',
  'The dial is at 1.',
  'The dial is at 9.',
  'TRY 3: the gauge reads LOW. Line 1 is not restored.',
  'TRY 2: the gauge reads HIGH. Line 2 is not restored.',
  'TRY 11: the gauge reads OK. Line 1 is restored.',
  'TRY 9: the gauge reads OK. Line 2 is restored.',
  'That setting was tried at TRY 2; it is not run again.',
  'TRIES (newest last)',
  'No TRY yet.',
  '… 2 earlier TRYs not shown',
  'TRY 1  H3 · SINGLE   LOW',
  'TRY 11 H1 H3 · DOUBLE   OK',
  'TRY 1  dial 1 · SHUT   LOW',
  'TRY 9  dial 5 · OPEN   OK',
  'Set line 1 aside?',
  'It finishes as it is and stays finished.',
  'Line 2 comes next.',
  'Set line 2 aside?',
  'It finishes as it is and stays finished.',
  'It is the last line.',
  'SET ASIDE  [ENTER]',
  'BACK  [ESC]',
  'Line 1 finished: restored.',
  'Line 1 finished: set aside.',
  'Line 2 finished: restored.',
  'Line 2 finished: set aside.',
  'NEXT LINE',
  'Both lines finished.',
  'FINISH',
  'Both lines are finished. The panel takes no further settings.',
  'HELP  [H]',
  'LEAVE  [ESC]',
  'PANEL HELP',
  "Set a line's settings, then TRY. Each TRY is listed with its reading.",
  'Line 1: H1-H3 [1-3] switch a heater; FEED [4] SINGLE or DOUBLE.',
  'Line 2: DIAL DOWN [1], DIAL UP [2]; BYPASS [3] opens or shuts it.',
  'TRY [T] runs the setting. A setting already tried is not run again.',
  'SET ASIDE [N] finishes a line as it is; it stays finished.',
  'LEAVE or ESC keeps everything as it is while you are outside.',
  'Telling Noor you are finished outside closes the panel as it is.',
  'TAB moves between controls; ENTER or SPACE uses the one in focus.',
  'CLOSE HELP  [H]',
  'The coupling panel closed when the outside work ended.',
  'The coupling panel was closed at the station review.',
  'This panel was opened earlier in the session. It stays closed now.',
  // U24 RL-4 (r3 §9, owner decision D-5): the U / M hold's two lines.
  'The earlier state of this coupling panel could not be verified.',
  'It stays closed after this reload.',
  // The fault record (two lines) is not preview text: implementer wording in
  // the shape of the M14–M18 fault records, approved for addition by the
  // owner's closeout decision of 14 October 2026 (register §5.340 (b)).
  'The coupling panel has a fault and is closed.',
  'Its record is kept as it is.',
  'TAB move · ENTER or SPACE use · H help · ESC leave',
  '1-3 choose · R record · H help · TAB move · ESC leave',
  'TAB move · ENTER or SPACE use · H help · ESC leave',
  'ENTER set aside · ESC back',
  'H or ESC close help',
  'ESC leave',
];

/** The wording audit of preview §8 (the token list, case-insensitive). */
const FORBIDDEN: RegExp[] = [
  /proto_/i,
  /secondary_/i,
  /\bM\d\d\b/,
  /\bQ\d\d\b/,
  /score/i,
  /trait/i,
  /persist/i,
  /grit/i,
  /tough/i,
  /\bgoing\b/i,
  /difficult/i,
  /\bhard\b/i,
  /\bstick/i,
  /setback/i,
  /discourag/i,
  /give up|giving up|gave up/i,
  /\bquit/i,
  /\bfail/i,
  /success/i,
  /\bkeep (on|going|trying|at|working)\b/i,
  /trying/i,
  /even if/i,
  /no point/i,
  /worthless/i,
  /over and over/i,
  /normal/i,
  /challenge/i,
  /\btest/i,
  /skill/i,
  /abilit/i,
  /effort/i,
  /motivat/i,
  /determin/i,
  /patien/i,
  /well done/i,
  /\bgood\b/i,
  /great/i,
  /wrong/i,
  /correct/i,
  /mistake/i,
  /error/i,
  /puzzle/i,
  /solv/i,
  /solution/i,
  /\bhint/i,
  /resil/i,
  /should/i,
  /must\b/i,
  /\bhurry/i,
  /quick/i,
  /fast/i,
  /\btime\b/i,
];
/** The vocabulary of preview §4.1: no string calls a line open, closed or reopened. */
const VOCAB: RegExp[] = [
  /\bline\b[^.]*\b(is|are|stays?) (still )?(open|closed)\b/i,
  /\breopen/i,
  /\bline \d (open|closed)\b/i,
  /\blines? closed\b/i,
];

const L1 = M19_LINES[0] as M19Line;
const L2 = M19_LINES[1] as M19Line;

test.describe('M19 oracle: the two lines (Unit 21)', () => {
  test('line 1: all 16 settings read as the hand evaluator says; exactly one restores (H1 + H3 DOUBLE); every SINGLE setting reads LOW; the start reads LOW', () => {
    const all = HAND1.settings();

    expect(all).toHaveLength(16);
    expect(
      new Set(all.map((s) => `${+s.h1}${+s.h2}${+s.h3}${s.feed}`)).size,
    ).toBe(16);

    const ok = all.filter(
      (s) => handReading(HAND1.value(s), HAND1.target) === 'OK',
    );

    expect(ok).toHaveLength(1);
    expect(HAND1.same(ok[0], HAND1.key)).toBe(true);
    expect(
      all
        .filter((s) => s.feed === 'SINGLE')
        .every((s) => handReading(HAND1.value(s), HAND1.target) === 'LOW'),
    ).toBe(true);
    expect(handReading(HAND1.value(HAND1.start), HAND1.target)).toBe('LOW');

    for (const s of all) {
      expect(m19Reading(L1, s), JSON.stringify(s)).toBe(
        handReading(HAND1.value(s), HAND1.target),
      );
    }

    expect(HAND1.same(L1.key as Hand1, HAND1.key)).toBe(true);
    expect(HAND1.same(L1.start as Hand1, HAND1.start)).toBe(true);
    expect(L1.target).toBe(HAND1.target);
    // The listed evidence: the all-ON SINGLE setting, nothing else.
    expect(L1.evidence).toHaveLength(1);
    expect(
      HAND1.same(L1.evidence[0] as Hand1, {
        h1: true,
        h2: true,
        h3: true,
        feed: 'SINGLE',
      }),
    ).toBe(true);
  });

  test('line 2: all 18 settings read as the hand evaluator says; exactly one restores (dial 5 OPEN); no SHUT setting reads OK (dial 4 LOW, dial 5 HIGH); the start reads LOW', () => {
    const all = HAND2.settings();

    expect(all).toHaveLength(18);

    const ok = all.filter(
      (s) => handReading(HAND2.value(s), HAND2.target) === 'OK',
    );

    expect(ok).toHaveLength(1);
    expect(HAND2.same(ok[0], HAND2.key)).toBe(true);
    expect(
      all
        .filter((s) => s.bypass === 'SHUT')
        .every((s) => handReading(HAND2.value(s), HAND2.target) !== 'OK'),
    ).toBe(true);
    expect(handReading(HAND2.value({ dial: 4, bypass: 'SHUT' }), 9)).toBe(
      'LOW',
    );
    expect(handReading(HAND2.value({ dial: 5, bypass: 'SHUT' }), 9)).toBe(
      'HIGH',
    );
    expect(handReading(HAND2.value(HAND2.start), HAND2.target)).toBe('LOW');

    for (const s of all) {
      expect(m19Reading(L2, s), JSON.stringify(s)).toBe(
        handReading(HAND2.value(s), HAND2.target),
      );
    }

    expect(HAND2.same(L2.key as Hand2, HAND2.key)).toBe(true);
    expect(HAND2.same(L2.start as Hand2, HAND2.start)).toBe(true);
    expect(L2.target).toBe(HAND2.target);
    expect(L2.evidence).toHaveLength(2);
    expect(
      (L2.evidence as Hand2[])
        .map((s) => `${s.dial}${s.bypass}`)
        .sort()
        .join(','),
    ).toBe('4SHUT,5SHUT');
  });

  test('the obstacle rule of each line equals the hand rule on executed sequences (inferred routes never count)', () => {
    const seq1: Hand1[][] = [
      [{ h1: false, h2: false, h3: true, feed: 'SINGLE' }],
      [
        { h1: false, h2: false, h3: true, feed: 'DOUBLE' },
        { h1: true, h2: true, h3: false, feed: 'DOUBLE' },
      ],
      [
        { h1: false, h2: true, h3: true, feed: 'SINGLE' },
        { h1: true, h2: true, h3: true, feed: 'SINGLE' },
      ],
      [{ h1: true, h2: true, h3: true, feed: 'DOUBLE' }],
    ];

    for (const tries of seq1) {
      for (let n = 1; n <= tries.length; n += 1) {
        const executed = tries.slice(0, n);

        expect(m19ObstacleEstablished(L1, executed)).toBe(
          HAND1.obstacleAt(executed) !== null,
        );
      }
    }

    const seq2: Hand2[][] = [
      [
        { dial: 5, bypass: 'SHUT' },
        { dial: 4, bypass: 'SHUT' },
      ],
      [
        { dial: 4, bypass: 'SHUT' },
        { dial: 3, bypass: 'SHUT' },
        { dial: 5, bypass: 'SHUT' },
      ],
      [
        { dial: 4, bypass: 'OPEN' },
        { dial: 5, bypass: 'OPEN' },
      ],
      [{ dial: 4, bypass: 'SHUT' }],
    ];

    for (const tries of seq2) {
      for (let n = 1; n <= tries.length; n += 1) {
        const executed = tries.slice(0, n);

        expect(m19ObstacleEstablished(L2, executed)).toBe(
          HAND2.obstacleAt(executed) !== null,
        );
      }
    }
  });

  test('the check: two questions, three options each in the preview order, keys option 2 and option 3', () => {
    expect(M19_CHECKS.map((c) => c.id)).toEqual(['m19_chk_q1', 'm19_chk_q2']);
    expect(M19_CHECKS[0].question).toBe(HAND_CHECK.q1.question);
    expect(M19_CHECKS[0].options.map((o) => o.text)).toEqual(
      HAND_CHECK.q1.options,
    );
    expect(M19_CHECKS[0].key_option_id).toBe(
      `m19_chk_q1_o${HAND_CHECK.q1.key}`,
    );
    expect(M19_CHECKS[1].question).toBe(HAND_CHECK.q2.question);
    expect(M19_CHECKS[1].options.map((o) => o.text)).toEqual(
      HAND_CHECK.q2.options,
    );
    expect(M19_CHECKS[1].key_option_id).toBe(
      `m19_chk_q2_o${HAND_CHECK.q2.key}`,
    );
    expect(M19_CHECKS[0].options.map((o) => o.id)).toEqual([
      'm19_chk_q1_o1',
      'm19_chk_q1_o2',
      'm19_chk_q1_o3',
    ]);
  });

  test('every participant string of the module is in the transcription and every transcribed string in the module; none carries a forbidden token or calls a line open, closed or reopened', () => {
    const module = m19ParticipantStrings();
    const hand = new Set(HAND_STRINGS);

    for (const s of module) {
      expect(hand.has(s), `module string in the transcription: "${s}"`).toBe(
        true,
      );
    }

    const moduleSet = new Set(module);

    for (const s of HAND_STRINGS) {
      expect(moduleSet.has(s), `transcribed string in the module: "${s}"`).toBe(
        true,
      );
    }

    for (const s of module) {
      for (const rx of FORBIDDEN) {
        expect(rx.test(s), `${rx} in "${s}"`).toBe(false);
      }

      for (const rx of VOCAB) {
        expect(rx.test(s), `vocabulary ${rx} in "${s}"`).toBe(false);
      }
    }

    // The vocabulary rule's self-test (the r1 strings it exists to exclude).
    for (const bad of [
      'Line 1 of 2 is open.',
      'Line 1 closed.',
      'It closes as it is and does not reopen.',
      '2 of 2 lines closed.',
    ]) {
      expect(
        VOCAB.some((rx) => rx.test(bad)),
        bad,
      ).toBe(true);
    }

    expect(M19_TEXT.title).toBe('COOLANT COUPLING');
    expect(M19_TEXT.intro).toHaveLength(10);
    expect(M19_TEXT.help_lines).toHaveLength(8);
    expect(M19_TEXT.explanation).toHaveLength(4);
    expect(L1.sheet_lines).toHaveLength(6);
    expect(L2.sheet_lines).toHaveLength(6);
  });
});

/* ------------------------------------------------------------------ *
 * 2. The series model
 * ------------------------------------------------------------------ */

interface Logged {
  suffix: string;
  metadata: Record<string, unknown>;
  sequence: number;
}

interface Run {
  s: M19Series;
  events: Logged[];
  sink: M19LogSink;
  now: number;
  tick: (ms: number) => number;
  settle: () => number;
}

function run(): Run {
  let sequence = 100;
  const r: Run = {
    s: createM19Series(),
    events: [],
    sink: (suffix, metadata) => {
      sequence += 10;
      r.events.push({ suffix, metadata, sequence });

      return sequence;
    },
    now: 10_000,
    tick: (ms) => {
      r.now += ms;

      return r.now;
    },
    settle: () => r.tick(M19_SETTLE_MS + 50),
  };

  return r;
}

const suffixes = (r: Run) => r.events.map((e) => e.suffix);
const last = (r: Run, suffix: string) =>
  [...r.events].reverse().find((e) => e.suffix === suffix);
const count = (r: Run, suffix: string) =>
  r.events.filter((e) => e.suffix === suffix).length;
const ofLine = (r: Run, suffix: string, line: string) =>
  r.events.filter((e) => e.suffix === suffix && e.metadata.line_id === line);

function opened(): Run {
  const r = run();

  m19sOpen(r.s, r.now, r.sink);

  return r;
}

/** CONTINUE on the card: question 1 presented. */
function atCheck(): Run {
  const r = opened();

  expect(m19sContinue(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);

  return r;
}

type CheckPath = 'pass_first' | 'pass_after_explanation' | 'fail';

/** The check recorded by the path given (option 2 / option 3 keyed). */
function checked(path: CheckPath): Run {
  const r = atCheck();
  const answer = (option: number) => {
    expect(
      m19sDraft(
        r.s,
        `${r.s.check.stage === 'q2' ? 'm19_chk_q2' : 'm19_chk_q1'}_o${option}`,
        'keyboard',
        r.settle(),
        r.sink,
      ),
    ).toBe(true);
    expect(m19sRecordAnswer(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      'recorded',
    );
  };

  if (path === 'pass_first') {
    answer(2);
  } else {
    answer(1);
    expect(r.s.view).toBe('explanation');
    expect(m19sContinueExplanation(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    answer(path === 'pass_after_explanation' ? 3 : 1);
  }

  expect(r.s.check.status).toBe(path);
  expect(r.s.view).toBe('recorded');

  return r;
}

/** Line 1 presented. */
function line1(path: CheckPath = 'pass_first'): Run {
  const r = checked(path);

  expect(m19sStartLine1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
  expect(r.s.view).toBe('line');

  return r;
}

/** Sets line 1's draft to the target by toggling the controls that differ. */
function set1(r: Run, target: Hand1) {
  const current = () => r.s.lines[0].setting as M19Line1Setting;

  for (const control of ['h1', 'h2', 'h3'] as const) {
    if (current()[control] !== target[control]) {
      expect(m19sChange(r.s, control, 'keyboard', r.settle(), r.sink)).toBe(
        'changed',
      );
    }
  }

  if (current().feed !== target.feed) {
    expect(m19sChange(r.s, 'feed', 'keyboard', r.settle(), r.sink)).toBe(
      'changed',
    );
  }

  expect(HAND1.same(current(), target)).toBe(true);
}

/** Sets line 2's draft to the target with DIAL UP / DOWN and BYPASS. */
function set2(r: Run, target: Hand2) {
  const current = () => r.s.lines[1].setting as M19Line2Setting;

  while (current().dial < target.dial) {
    expect(m19sChange(r.s, 'dial_up', 'keyboard', r.settle(), r.sink)).toBe(
      'changed',
    );
  }

  while (current().dial > target.dial) {
    expect(m19sChange(r.s, 'dial_down', 'keyboard', r.settle(), r.sink)).toBe(
      'changed',
    );
  }

  if (current().bypass !== target.bypass) {
    expect(m19sChange(r.s, 'bypass', 'keyboard', r.settle(), r.sink)).toBe(
      'changed',
    );
  }

  expect(HAND2.same(current(), target)).toBe(true);
}

function tryNow(r: Run) {
  return m19sTry(r.s, 'keyboard', r.settle(), r.sink);
}

/** Line 1 at its obstacle (one TRY: all ON, SINGLE). */
function line1AtObstacle(path: CheckPath = 'pass_first'): Run {
  const r = line1(path);

  set1(r, { h1: true, h2: true, h3: true, feed: 'SINGLE' });
  expect(tryNow(r).kind).toBe('executed');
  expect(r.s.lines[0].boundary?.attempt_index).toBe(1);

  return r;
}

function setAside(r: Run) {
  expect(m19sRequestSetAside(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
  expect(m19sConfirmSetAside(r.s, 'keyboard', r.settle(), r.sink)).toBe(
    'finished',
  );
}

function nextLine(r: Run) {
  expect(m19sNextLine(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
  expect(r.s.line).toBe(1);
  expect(r.s.view).toBe('line');
}

const ALL_SINGLE: Hand1 = { h1: true, h2: true, h3: true, feed: 'SINGLE' };
const KEY1: Hand1 = { h1: true, h2: false, h3: true, feed: 'DOUBLE' };
const KEY2: Hand2 = { dial: 5, bypass: 'OPEN' };

test.describe('M19 model: boundary and continuation (Unit 21)', () => {
  test('line 1: the boundary appears exactly at the all-ON SINGLE TRY, never at an earlier unsuccessful TRY; its evidence is that attempt', () => {
    const r = line1();

    set1(r, { h1: false, h2: false, h3: true, feed: 'SINGLE' });
    expect(tryNow(r)).toMatchObject({ kind: 'executed', restored: false });
    expect(last(r, 'attempt')?.metadata).toMatchObject({
      attempt_index: 1,
      reading: 'LOW',
      restored: false,
      after_boundary: false,
      since_boundary_focused_ms: null,
    });
    expect(count(r, 'difficulty_boundary')).toBe(0);
    set1(r, { h1: false, h2: true, h3: true, feed: 'SINGLE' });
    expect(tryNow(r).kind).toBe('executed');
    expect(count(r, 'difficulty_boundary')).toBe(0);
    set1(r, ALL_SINGLE);
    expect(tryNow(r).kind).toBe('executed');
    expect(count(r, 'difficulty_boundary')).toBe(1);

    const boundary = last(r, 'difficulty_boundary')!;
    const attempt = last(r, 'attempt')!;

    expect(boundary.metadata).toMatchObject({
      line_id: 'm19_l1',
      attempt_index: 3,
      attempt_sequence: attempt.sequence,
      rule: 'designed_obstacle',
      evidence_attempt_indices: [3],
      input_mode: 'system',
    });
    // Immediately after its attempt: nothing between.
    expect(r.events.indexOf(boundary)).toBe(r.events.indexOf(attempt) + 1);
    // Nothing else happens at the boundary: the view, the controls and the
    // setting are as before.
    expect(r.s.view).toBe('line');
    expect(r.s.pending_set_aside).toBeNull();
  });

  test('line 2: the boundary is the later of dial 4 SHUT and dial 5 SHUT, in either order, with both attempts as evidence', () => {
    for (const order of [
      [4, 5],
      [5, 4],
    ]) {
      const r = line1();

      set1(r, KEY1);
      expect(tryNow(r)).toMatchObject({ kind: 'executed', restored: true });
      expect(r.s.lines[0].finish).toBe('restored');
      nextLine(r);
      set2(r, { dial: order[0], bypass: 'SHUT' });
      expect(tryNow(r).kind).toBe('executed');
      expect(ofLine(r, 'difficulty_boundary', 'm19_l2')).toHaveLength(0);
      set2(r, { dial: order[1], bypass: 'SHUT' });
      expect(tryNow(r).kind).toBe('executed');
      expect(ofLine(r, 'difficulty_boundary', 'm19_l2')).toHaveLength(1);
      expect(last(r, 'difficulty_boundary')?.metadata).toMatchObject({
        line_id: 'm19_l2',
        attempt_index: 2,
        evidence_attempt_indices: [1, 2],
      });
    }
  });

  test('a line restored without meeting its obstacle has no boundary; the restoring TRY finishes it immediately', () => {
    const r = line1();

    set1(r, KEY1);
    expect(tryNow(r)).toMatchObject({ kind: 'executed', restored: true });
    expect(count(r, 'difficulty_boundary')).toBe(0);
    expect(suffixes(r).slice(-2)).toEqual(['attempt', 'line_finished']);
    expect(last(r, 'line_finished')?.metadata).toMatchObject({
      line_id: 'm19_l1',
      finish: 'restored',
      attempts: 1,
      boundary_attempt_index: null,
      continued: null,
      restored_at_attempt: 1,
    });
    expect(r.s.view).toBe('finished');
    // A finished line accepts nothing.
    expect(m19sChange(r.s, 'h1', 'keyboard', r.settle(), r.sink)).toBe('none');
    expect(tryNow(r).kind).toBe('none');
    expect(m19sRequestSetAside(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
  });

  test('the boundary never moves or repeats: later unsuccessful TRYs, leaving, reopening, help, a cancelled SET ASIDE and the finish change nothing', () => {
    const r = line1AtObstacle();
    const boundary = { ...last(r, 'difficulty_boundary')!.metadata };

    set1(r, { h1: true, h2: true, h3: true, feed: 'DOUBLE' });
    expect(tryNow(r)).toMatchObject({ kind: 'executed', restored: false });
    expect(last(r, 'attempt')?.metadata).toMatchObject({
      attempt_index: 2,
      reading: 'HIGH',
      after_boundary: true,
    });
    m19sLeave(r.s, r.tick(1000), r.sink);
    m19sOpen(r.s, r.tick(1000), r.sink);
    expect(m19sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m19sCloseHelp(r.s, 'keyboard', r.settle())).toBe(true);
    expect(m19sRequestSetAside(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m19sCancelSetAside(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    set1(r, { h1: false, h2: true, h3: true, feed: 'DOUBLE' });
    expect(tryNow(r)).toMatchObject({ kind: 'executed', restored: false });
    setAside(r);
    expect(count(r, 'difficulty_boundary')).toBe(1);
    expect(last(r, 'difficulty_boundary')?.metadata).toEqual(boundary);
    expect(last(r, 'line_finished')?.metadata).toMatchObject({
      finish: 'set_aside',
      boundary_attempt_index: 1,
      continued: true,
      attempts: 3,
    });
  });

  test('an already-tried setting and a settling press are refused and are not attempts; a TRY of the key always restores', () => {
    const r = line1();

    set1(r, { h1: false, h2: false, h3: true, feed: 'SINGLE' });
    expect(tryNow(r).kind).toBe('executed');
    // The same setting again: refused, recorded, no attempt.
    expect(tryNow(r)).toEqual({ kind: 'already_tried', attempt_index: 1 });
    expect(last(r, 'try_refused')?.metadata).toMatchObject({
      reason: 'already_tried',
      tried_at_attempt: 1,
      after_boundary: false,
    });
    expect(count(r, 'attempt')).toBe(1);
    // A press inside the settle of a freshly shown view: refused, recorded.
    m19sLeave(r.s, r.tick(500), r.sink);
    m19sOpen(r.s, r.tick(500), r.sink);
    set1(r, { h1: true, h2: false, h3: false, feed: 'SINGLE' });
    m19sLeave(r.s, r.tick(500), r.sink);
    m19sOpen(r.s, r.tick(500), r.sink);
    expect(m19sTry(r.s, 'keyboard', r.tick(100), r.sink)).toEqual({
      kind: 'settling',
    });
    expect(last(r, 'try_refused')?.metadata).toMatchObject({
      reason: 'settling',
    });
    expect(count(r, 'attempt')).toBe(1);
    // A setting change inside the settle is dropped and not logged.
    m19sLeave(r.s, r.tick(500), r.sink);
    m19sOpen(r.s, r.tick(500), r.sink);
    const changes = count(r, 'setting_changed');

    expect(m19sChange(r.s, 'h2', 'keyboard', r.tick(100), r.sink)).toBe('none');
    expect(count(r, 'setting_changed')).toBe(changes);
    // The key restores from any state.
    set1(r, KEY1);
    expect(tryNow(r)).toMatchObject({ kind: 'executed', restored: true });
  });

  test('the dial stops at its limits (nothing changes, nothing logged); every setting change is logged with the setting after it', () => {
    const r = line1();

    set1(r, KEY1);
    tryNow(r);
    nextLine(r);

    const before = count(r, 'setting_changed');

    expect(m19sChange(r.s, 'dial_down', 'keyboard', r.settle(), r.sink)).toBe(
      'limit',
    );
    expect(count(r, 'setting_changed')).toBe(before);
    set2(r, { dial: 9, bypass: 'SHUT' });
    expect(m19sChange(r.s, 'dial_up', 'keyboard', r.settle(), r.sink)).toBe(
      'limit',
    );
    expect(last(r, 'setting_changed')?.metadata).toMatchObject({
      line_id: 'm19_l2',
      control: 'dial_up',
      setting_after: { dial: 9, bypass: 'SHUT' },
    });
  });
});

/** The row of a run's events (the walk of the extractor). */
function kitFields(options: LogOptions = {}): Record<string, unknown> {
  return {
    measure_id: 'M19',
    opportunity_id: options.opportunity ?? M19_OPPORTUNITY_ID,
    window_id: M19_WINDOW_ID,
    entry_state_version: options.version ?? M19_ENTRY_STATE_VERSION,
    form: null,
    counterbalance: null,
    occasion: null,
  };
}

interface LogOptions {
  briefed?: boolean;
  opened?: boolean;
  version?: string;
  opportunity?: string;
  pageLoadIndex?: number;
  sequence?: (index: number) => number | undefined;
  before?: Logged[];
}

function toEvents(list: Logged[], options: LogOptions = {}): RawGameEvent[] {
  return list.map((event, index) => ({
    session_id: 'GS',
    timestamp_ms: 1_000 + index,
    scene: 'exterior_recovery_yard',
    event_type: `${M19_FAMILY}${event.suffix}`,
    object_id: 'm19_coupling_panel',
    sequence: options.sequence ? options.sequence(index) : event.sequence,
    page_load_index: options.pageLoadIndex ?? 1,
    metadata: { ...kitFields(options), ...event.metadata },
  }));
}

/**
 * A raw log from a run: the kit's `presented` / `opportunity_opened`
 * records, then the model's events (the kit's `window_closed` after a
 * completion or a shift-end closure).
 */
function logOf(r: Run, options: LogOptions = {}): RawGameEvent[] {
  const kit: Logged[] = [...(options.before ?? [])];
  let sequence = 50;

  if (options.briefed !== false) {
    sequence += 1;
    kit.push({
      suffix: 'presented',
      metadata: { input_mode: 'system' },
      sequence,
    });
  }

  if (options.opened !== false) {
    sequence += 1;
    kit.push({
      suffix: 'opportunity_opened',
      metadata: {
        entry_state_snapshot: m19EntrySnapshot('exterior_work'),
        input_mode: 'system',
      },
      sequence,
    });
  }

  const events = [...r.events];

  if (
    (r.s.status === 'completed' || r.s.closure_reason === 'shift_ended') &&
    !events.some((e) => e.suffix === 'window_closed')
  ) {
    events.push({
      suffix: 'window_closed',
      metadata: {
        exit_state: r.s.status === 'completed' ? 'completed' : 'stopped',
        input_mode: 'system',
      },
      sequence: (events[events.length - 1]?.sequence ?? 100) + 10,
    });
  }

  return toEvents([...kit, ...events], options);
}

const CONTEXT = { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false };
const RELOADED = { finalCoreClosed: false, pageLoadIndex: 2, reloaded: true };

type Row = ReturnType<typeof extractItemFeatures>[number];
type Comp = Record<string, unknown>;

/** The one row; the input is never mutated. */
function rowOf(events: RawGameEvent[], context = CONTEXT): Row {
  const before = JSON.stringify(events);
  const out = extractItemFeatures('M19', events, context);

  expect(JSON.stringify(events)).toBe(before);
  expect(out).toHaveLength(1);
  expect(out[0].feature_id).toBe('m19_continuations');
  expect(out[0].planned_denominator).toBe(2);

  return out[0];
}

const lineOf = (row: Row, id: string) =>
  (row.components.lines as Comp[]).find((l) => l.line_id === id)!;

/** A fault from the adapter's path: the line in work finished by the model, then the kit-shaped record. */
function fault(r: Run, detail = 'try: boom') {
  const outcome = m19sFail(r.s, detail, r.settle(), r.sink);

  r.sink('technical_failure', {
    phase: 'closure',
    detail,
    line_id: outcome.kind === 'closed' ? outcome.line_id : null,
    input_mode: 'system',
  });

  return outcome;
}

test.describe('M19 model and extractor: what is and is not a continuation (Unit 21)', () => {
  test('setting changes without TRY, help, leaving, reopening, a cancelled SET ASIDE and elapsed time are not continuations (0 / 1 at the shift end); a further executed TRY is (1 / 1), whichever control it changes', () => {
    const r = line1AtObstacle();

    set1(r, { h1: true, h2: true, h3: false, feed: 'SINGLE' }); // no TRY
    expect(m19sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m19sCloseHelp(r.s, 'keyboard', r.settle())).toBe(true);
    m19sLeave(r.s, r.tick(1000), r.sink);
    m19sOpen(r.s, r.tick(60_000), r.sink);
    expect(m19sRequestSetAside(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m19sCancelSetAside(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    m19sLeave(r.s, r.tick(1000), r.sink);
    expect(m19sCloseAtShiftEnd(r.s, r.tick(1000), r.sink)).toBe(true);

    const before = rowOf(logOf(r));

    expect(before).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 1,
      disposition: 'observed',
      included_ids: ['m19_l1'],
      censored: false,
    });
    expect(lineOf(before, 'm19_l1')).toMatchObject({
      continued: false,
      eligible: true,
      finish: 'shift_ended',
      tries_after_boundary: 0,
      help_consults: 1,
      panel_leaves_after_boundary: 2,
    });

    // The same history with one further executed TRY (the feed changed).
    const r2 = line1AtObstacle();

    set1(r2, { h1: true, h2: true, h3: true, feed: 'DOUBLE' });
    expect(tryNow(r2)).toMatchObject({ kind: 'executed', restored: false });
    m19sLeave(r2.s, r2.tick(1000), r2.sink);
    expect(m19sCloseAtShiftEnd(r2.s, r2.tick(1000), r2.sink)).toBe(true);

    const after = rowOf(logOf(r2));

    expect(after).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
    });
    expect(lineOf(after, 'm19_l1')).toMatchObject({
      continued: true,
      changed_second_control_after_boundary: true,
      continued_after_leaving: false,
    });

    // A further TRY changing only a heater also counts (credited once).
    const r3 = line1AtObstacle();

    set1(r3, { h1: false, h2: true, h3: true, feed: 'SINGLE' });
    expect(tryNow(r3)).toMatchObject({ kind: 'executed', restored: false });
    set1(r3, { h1: true, h2: false, h3: true, feed: 'SINGLE' });
    expect(tryNow(r3)).toMatchObject({ kind: 'executed', restored: false });
    setAside(r3);
    nextLine(r3);
    setAside(r3);

    const once = rowOf(logOf(r3));

    expect(once).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      closure_reason: 'completed',
    });
    expect(lineOf(once, 'm19_l1')).toMatchObject({
      tries_after_boundary: 2,
      changed_second_control_after_boundary: false,
    });
    expect(lineOf(once, 'm19_l2')).toMatchObject({
      attempts: 0,
      eligible: false,
      finish: 'set_aside',
    });
  });

  test('a further executed TRY after leaving and returning qualifies, flagged continued_after_leaving; the Option A component is computed alongside', () => {
    const r = line1AtObstacle();

    m19sLeave(r.s, r.tick(1000), r.sink);
    m19sOpen(r.s, r.tick(5000), r.sink);
    set1(r, { h1: false, h2: false, h3: true, feed: 'DOUBLE' });
    expect(tryNow(r)).toMatchObject({ kind: 'executed', restored: false });
    expect(r.s.lines[0].continued_after_leaving).toBe(true);
    set1(r, KEY1);
    expect(tryNow(r)).toMatchObject({ kind: 'executed', restored: true });
    expect(last(r, 'line_finished')?.metadata).toMatchObject({
      finish: 'restored',
      continued: true,
      continued_after_leaving: true,
      panel_leaves_after_boundary: 1,
      restored_at_attempt: 3,
    });
    nextLine(r);
    setAside(r);

    const row = rowOf(logOf(r));

    expect(lineOf(row, 'm19_l1')).toMatchObject({
      continued_after_leaving: true,
      first_unsuccessful_try_index: 1,
      continued_after_first_unsuccessful: true,
    });
    expect(lineOf(row, 'm19_l2')).toMatchObject({
      first_unsuccessful_try_index: null,
      continued_after_first_unsuccessful: null,
    });
  });

  test('a line restored at its first TRY has no Option A indicator and is not eligible; two such lines export null, numerator null, denominator 0, no_eligible_event', () => {
    const r = line1();

    set1(r, KEY1);
    tryNow(r);
    nextLine(r);
    set2(r, KEY2);
    expect(tryNow(r)).toMatchObject({ kind: 'executed', restored: true });
    expect(r.s.status).toBe('completed');
    expect(suffixes(r).slice(-2)).toEqual([
      'line_finished',
      'series_completed',
    ]);

    const row = rowOf(logOf(r));

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      planned_denominator: 2,
      included_ids: [],
      disposition: 'no_eligible_event',
      missing_reason: 'obstacle_not_reached',
      censored: false,
      closure_reason: 'completed',
    });
    expect(row.components.nonresponse_kind).toBe('obstacle_not_reached');
    expect(lineOf(row, 'm19_l1')).toMatchObject({
      first_unsuccessful_try_index: null,
      eligible: false,
      restored: true,
    });
  });
});

test.describe('M19 model: the panel check (Unit 21)', () => {
  test('pass_first, pass_after_explanation and fail reached through the model; the explanation only after a wrong first answer; the recorded line identical for every status; lines administered whatever the status', () => {
    const paths: CheckPath[] = ['pass_first', 'pass_after_explanation', 'fail'];
    const recordedViews: string[] = [];

    for (const path of paths) {
      const r = checked(path);

      expect(last(r, 'check_recorded')?.metadata).toMatchObject({
        status: path,
      });
      expect(count(r, 'check_recorded')).toBe(1);
      expect(count(r, 'explanation_shown')).toBe(path === 'pass_first' ? 0 : 1);
      expect(count(r, 'check_answered')).toBe(path === 'pass_first' ? 1 : 2);

      const host: M19SurfaceHost = {
        now: () => r.now,
        close: () => undefined,
        feedback: () => undefined,
        series: () => r.s,
        commands: {} as M19SurfaceHost['commands'],
      };
      const model = m19SurfaceModel(host);

      recordedViews.push(
        JSON.stringify({
          status: model.status,
          subtitle: model.subtitle,
          elements: model.elements.map((e) => [e.id, e.label]),
        }),
      );
      // The line is administered whatever the status.
      expect(m19sStartLine1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
      expect(last(r, 'line_presented')?.metadata).toMatchObject({
        line_id: 'm19_l1',
        assigned_position: 1,
        realised_position: 1,
        starting_setting: { h1: false, h2: false, h3: false, feed: 'SINGLE' },
      });
    }

    expect(new Set(recordedViews).size).toBe(1);
    expect(recordedViews[0]).toContain('Check recorded. Line 1 is ready.');
  });

  test('a wrong first answer shows the explanation; a right first answer never does; answers are immutable; a draft toggles and clears; RECORD without a draft records nothing', () => {
    const r = atCheck();

    expect(m19sRecordAnswer(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      'no_draft',
    );
    expect(count(r, 'check_answered')).toBe(0);
    expect(
      m19sDraft(r.s, 'm19_chk_q1_o1', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(
      m19sDraft(r.s, 'm19_chk_q1_o1', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(r.s.check.draft).toBeNull();
    expect(last(r, 'option_drafted')?.metadata).toMatchObject({
      option_id: null,
      previous_option_id: 'm19_chk_q1_o1',
    });
    expect(
      m19sDraft(r.s, 'm19_chk_q1_o3', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(m19sRecordAnswer(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      'recorded',
    );
    expect(last(r, 'check_answered')?.metadata).toMatchObject({
      check_id: 'm19_chk_q1',
      attempt: 1,
      option_id: 'm19_chk_q1_o3',
      correct: false,
    });
    expect(r.s.view).toBe('explanation');
    // Nothing on the explanation records; a second RECORD finds no question.
    expect(m19sRecordAnswer(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');
    expect(m19sContinueExplanation(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(last(r, 'check_presented')?.metadata).toMatchObject({
      check_id: 'm19_chk_q2',
      attempt: 2,
    });
    // The recheck's options are its own; a question-1 option is refused.
    expect(
      m19sDraft(r.s, 'm19_chk_q1_o2', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(
      m19sDraft(r.s, 'm19_chk_q2_o3', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(m19sRecordAnswer(r.s, 'keyboard', r.settle(), r.sink)).toBe(
      'recorded',
    );
    expect(r.s.check.status).toBe('pass_after_explanation');
    expect(count(r, 'check_answered')).toBe(2);
    expect(count(r, 'check_recorded')).toBe(1);
    // Immutable: nothing more can be answered.
    expect(m19sRecordAnswer(r.s, 'keyboard', r.settle(), r.sink)).toBe('none');
    expect(count(r, 'check_answered')).toBe(2);
  });

  test('not_reached (closed at the card) and not_completed (a question shown, never answered) at a closure; pending before it', () => {
    const atCard = opened();

    expect(rowOf(logOf(atCard))).toMatchObject({
      value: null,
      disposition: 'pending',
      missing_reason: 'check_open',
    });
    m19sLeave(atCard.s, atCard.tick(500), atCard.sink);
    expect(m19sCloseAtShiftEnd(atCard.s, atCard.tick(500), atCard.sink)).toBe(
      true,
    );
    expect(last(atCard, 'series_closed')?.metadata).toMatchObject({
      closure_reason: 'shift_ended',
      check_status: null,
    });
    expect(count(atCard, 'line_finished')).toBe(0);

    const notReached = rowOf(logOf(atCard));

    expect(notReached).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'no_eligible_event',
      missing_reason: 'check_not_reached',
      closure_reason: 'route_departure',
    });
    expect(notReached.components.nonresponse_kind).toBe('check_not_reached');
    expect(notReached.components.series_closure_reason).toBe('shift_ended');

    const atQuestion = atCheck();

    m19sDraft(
      atQuestion.s,
      'm19_chk_q1_o2',
      'keyboard',
      atQuestion.settle(),
      atQuestion.sink,
    );
    m19sLeave(atQuestion.s, atQuestion.tick(500), atQuestion.sink);
    expect(
      m19sCloseAtReview(atQuestion.s, atQuestion.tick(500), atQuestion.sink),
    ).toBe(true);

    const notCompleted = rowOf(logOf(atQuestion));

    expect(notCompleted).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
      missing_reason: 'check_not_completed',
      closure_reason: 'closed_at_review',
    });
    expect(notCompleted.components.nonresponse_kind).toBe(
      'check_not_completed',
    );
  });

  test('a failed check exports understanding_failed with the line records in the components, stable after a later fault', () => {
    const r = line1AtObstacle('fail');

    setAside(r);
    nextLine(r);
    setAside(r);

    const row = rowOf(logOf(r));

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'understanding_failed',
      missing_reason: 'check_failed',
      closure_reason: 'completed',
    });
    expect(row.components.nonresponse_kind).toBe('check_failed');
    expect((row.components.check as Comp).status).toBe('fail');
    expect(lineOf(row, 'm19_l1')).toMatchObject({
      boundary_attempt_index: 1,
      finish: 'set_aside',
    });

    // E20: a failed check, then a fault between the lines: still understanding_failed.
    const r2 = line1AtObstacle('fail');

    setAside(r2);
    expect(fault(r2).kind).toBe('closed');
    expect(rowOf(logOf(r2))).toMatchObject({
      disposition: 'understanding_failed',
      missing_reason: 'check_failed',
    });
  });
});

/* ------------------------------------------------------------------ *
 * 3. The extractor on synthetic logs: the derivation cases
 * ------------------------------------------------------------------ */

test.describe('M19 extractor: the derivation cases (Unit 21)', () => {
  test('E1 not presented: not_presented on a first load; interrupted after a reload', () => {
    expect(rowOf([], CONTEXT)).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'not_presented',
    });
    expect(rowOf([], RELOADED)).toMatchObject({
      value: null,
      disposition: 'interrupted',
    });
  });

  test('E1b (review finding SC-3) a later page load whose own reload check establishes the absence of an earlier opening: no current-load presented and no opening ⇒ interrupted (contract §3.8 row 1), never not_presented; presented in this load and never opened ⇒ pending as usual', () => {
    const check = {
      suffix: 'prior_load_checked',
      metadata: {
        phase: 'closure',
        ...m19PriorLoadCheck(2, [{ event_type: `${M19_FAMILY}presented` }], {
          first_sequence: 1,
          sequence_gap_count: 0,
          sequence_duplicate_count: 0,
          recovered_from_chunks: false,
        }),
        input_mode: 'system',
      },
      sequence: 40,
    };
    const absent = rowOf(
      logOf(run(), {
        before: [check],
        briefed: false,
        opened: false,
        pageLoadIndex: 2,
      }),
      RELOADED,
    );

    expect(absent).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'interrupted',
    });
    expect(absent.components.presented_in_current_load).toBe(false);
    expect(
      (absent.components.reload_check as Comp)
        .prior_opening_absence_established,
    ).toBe(true);
    expect((absent.components.reload_check as Comp).prior_briefing_found).toBe(
      true,
    );

    const briefedAgain = rowOf(
      logOf(run(), { before: [check], opened: false, pageLoadIndex: 2 }),
      RELOADED,
    );

    expect(briefedAgain).toMatchObject({
      value: null,
      disposition: 'pending',
      missing_reason: 'presented_not_opened',
    });
    expect(briefedAgain.components.presented_in_current_load).toBe(true);
  });

  test('E2 presented, never opened: pending while the shift runs; after closed_unopened no_eligible_event (not_opened), never declined', () => {
    const r = run();
    const pending = rowOf(logOf(r, { opened: false }));

    expect(pending).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'pending',
      missing_reason: 'presented_not_opened',
    });
    expect(pending.components.nonresponse_kind).toBe('not_opened');
    expect(pending.components.presented_in_current_load).toBe(true);

    m19sCloseUnopened(r.s, 'shift_ended');
    r.sink('closed_unopened', {
      phase: 'closure',
      closure_reason: 'shift_ended',
      input_mode: 'system',
    });

    const closed = rowOf(logOf(r, { opened: false }));

    expect(closed).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'no_eligible_event',
      missing_reason: 'not_opened',
      closure_reason: 'route_departure',
    });
    expect(closed.disposition).not.toBe('declined');
    expect(closed.components.nonresponse_kind).toBe('not_opened');
    // The panel shows the shift-end record afterwards and accepts nothing.
    expect(m19sOpen(r.s, r.tick(500), r.sink)).toBe('record');
    expect(m19sContinue(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
  });

  test('E3 / E4 the check open (pending) and never reached at the shift end (no_eligible_event check_not_reached)', () => {
    const r = atCheck();

    expect(rowOf(logOf(r))).toMatchObject({
      disposition: 'pending',
      missing_reason: 'check_open',
    });
  });

  test('E5 check failed; lines still administered ⇒ understanding_failed with the records', () => {
    const r = line1AtObstacle('fail');

    set1(r, KEY1);
    tryNow(r);
    nextLine(r);
    set2(r, { dial: 4, bypass: 'SHUT' });
    tryNow(r);
    setAside(r);
    expect(rowOf(logOf(r))).toMatchObject({
      value: null,
      disposition: 'understanding_failed',
    });
  });

  test('E7 obstacle on both lines then a further TRY on each ⇒ 2 / 2 observed; E8 obstacle then SET ASIDE on both ⇒ 0 / 2 observed', () => {
    const r = line1();

    set1(r, { h1: true, h2: false, h3: false, feed: 'SINGLE' });
    tryNow(r);
    set1(r, ALL_SINGLE);
    tryNow(r);
    set1(r, KEY1);
    tryNow(r);
    nextLine(r);
    set2(r, { dial: 5, bypass: 'SHUT' });
    tryNow(r);
    set2(r, { dial: 4, bypass: 'SHUT' });
    tryNow(r);
    set2(r, KEY2);
    tryNow(r);
    expect(r.s.status).toBe('completed');

    const e7 = rowOf(logOf(r));

    expect(e7).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 2,
      planned_denominator: 2,
      included_ids: ['m19_l1', 'm19_l2'],
      disposition: 'observed',
      censored: false,
      closure_reason: 'completed',
    });
    expect(e7.components.nonresponse_kind).toBeNull();
    expect(lineOf(e7, 'm19_l1')).toMatchObject({
      boundary_attempt_index: 2,
      evidence_attempt_indices: [2],
      tries_before_boundary: 1,
      tries_after_boundary: 1,
      restored_at_attempt: 3,
    });
    expect(lineOf(e7, 'm19_l2')).toMatchObject({
      boundary_attempt_index: 2,
      evidence_attempt_indices: [1, 2],
    });

    const r8 = line1();

    set1(r8, { h1: true, h2: true, h3: false, feed: 'SINGLE' });
    tryNow(r8);
    set1(r8, ALL_SINGLE);
    tryNow(r8);
    setAside(r8);
    nextLine(r8);
    set2(r8, { dial: 5, bypass: 'SHUT' });
    tryNow(r8);
    set2(r8, { dial: 4, bypass: 'SHUT' });
    tryNow(r8);
    setAside(r8);
    expect(rowOf(logOf(r8))).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 2,
      disposition: 'observed',
      included_ids: ['m19_l1', 'm19_l2'],
    });
  });

  test('E9 early unsuccessful TRYs then restored without the obstacle, E10 one unsuccessful TRY then SET ASIDE before the obstacle ⇒ null, denominator 0, no_eligible_event (obstacle_not_reached)', () => {
    const r9 = line1();

    set1(r9, { h1: false, h2: true, h3: false, feed: 'SINGLE' });
    tryNow(r9);
    set1(r9, { h1: false, h2: true, h3: false, feed: 'DOUBLE' });
    tryNow(r9);
    set1(r9, KEY1);
    tryNow(r9);
    nextLine(r9);
    set2(r9, { dial: 3, bypass: 'SHUT' });
    tryNow(r9);
    set2(r9, KEY2);
    tryNow(r9);

    const e9 = rowOf(logOf(r9));

    expect(e9).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'no_eligible_event',
      missing_reason: 'obstacle_not_reached',
    });
    // Option A's indicator beside: both lines would have been eligible.
    expect(lineOf(e9, 'm19_l1')).toMatchObject({
      first_unsuccessful_try_index: 1,
      continued_after_first_unsuccessful: true,
      eligible: false,
    });

    const r10 = line1();

    tryNow(r10); // the starting setting, LOW
    setAside(r10);
    nextLine(r10);
    tryNow(r10);
    setAside(r10);
    expect(rowOf(logOf(r10))).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'no_eligible_event',
      missing_reason: 'obstacle_not_reached',
    });

    // No TRY at all: no_try.
    const none = line1();

    setAside(none);
    nextLine(none);
    setAside(none);

    const noTry = rowOf(logOf(none));

    expect(noTry).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'no_try',
    });
    expect(noTry.components.nonresponse_kind).toBe('no_try');
  });

  test('E11 line 1 obstacle, LEAVE, return, three more TRYs (counts once); line 2 restored first TRY ⇒ 1 / 1 observed, not censored', () => {
    const r = line1AtObstacle();

    m19sLeave(r.s, r.tick(1000), r.sink);
    m19sOpen(r.s, r.tick(1000), r.sink);
    set1(r, { h1: false, h2: false, h3: true, feed: 'DOUBLE' });
    tryNow(r);
    set1(r, { h1: true, h2: true, h3: false, feed: 'DOUBLE' });
    tryNow(r);
    set1(r, KEY1);
    tryNow(r);
    nextLine(r);
    set2(r, KEY2);
    tryNow(r);
    expect(rowOf(logOf(r))).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      censored: false,
      included_ids: ['m19_l1'],
    });
  });

  test('E12 obstacle then the outside work ended without a further TRY; line 2 never presented ⇒ 0 / 1 observed (shift_ended); E14 line 1 finished, line 2 not yet presented, series open ⇒ pending', () => {
    const r14 = line1AtObstacle();

    set1(r14, KEY1);
    tryNow(r14);
    expect(rowOf(logOf(r14))).toMatchObject({
      value: null,
      disposition: 'pending',
      missing_reason: 'lines_in_work',
    });

    const r12 = line1AtObstacle();

    m19sLeave(r12.s, r12.tick(1000), r12.sink);
    expect(m19sCloseAtShiftEnd(r12.s, r12.tick(1000), r12.sink)).toBe(true);
    expect(suffixes(r12).slice(-2)).toEqual(['line_finished', 'series_closed']);
    expect(last(r12, 'line_finished')?.metadata).toMatchObject({
      line_id: 'm19_l1',
      finish: 'shift_ended',
      continued: false,
    });

    const e12 = rowOf(logOf(r12));

    expect(e12).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 1,
      disposition: 'observed',
      censored: false,
      closure_reason: 'route_departure',
    });
    expect(e12.components.series_closure_reason).toBe('shift_ended');
    expect(lineOf(e12, 'm19_l2')).toMatchObject({
      presented: false,
      eligible: false,
    });
  });

  test('E13 obstacle then the review closure without a further TRY; line 2 never presented ⇒ null, denominator 0, interrupted (censored_only)', () => {
    const r = line1AtObstacle();

    m19sLeave(r.s, r.tick(1000), r.sink);
    expect(m19sCloseAtReview(r.s, r.tick(1000), r.sink)).toBe(true);

    const row = rowOf(logOf(r));

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'interrupted',
      missing_reason: 'censored_only',
      censored: true,
      censor_reason: 'review closed m19_l1 without a further TRY',
      closure_reason: 'closed_at_review',
      included_ids: [],
    });
    expect(row.components.nonresponse_kind).toBe('censored_only');
    expect(lineOf(row, 'm19_l1')).toMatchObject({
      finish: 'closed_at_review',
      eligible: false,
      censored: true,
      excluded_reason: 'closed_at_review',
    });
  });

  test('W1 line 1 continued and restored; line 2 meets its obstacle, then a runtime fault ⇒ 1 / 1 observed, censored (technical failure on m19_l2), closure technical_failure', () => {
    const r = line1AtObstacle();

    set1(r, KEY1);
    tryNow(r);
    nextLine(r);
    set2(r, { dial: 4, bypass: 'SHUT' });
    tryNow(r);
    set2(r, { dial: 5, bypass: 'SHUT' });
    tryNow(r);
    expect(fault(r)).toEqual({ kind: 'closed', line_id: 'm19_l2' });
    expect(last(r, 'line_finished')?.metadata).toMatchObject({
      line_id: 'm19_l2',
      finish: 'technical_failure',
      boundary_attempt_index: 2,
      continued: false,
    });
    expect(r.s.status).toBe('technical_failure');

    const row = rowOf(logOf(r));

    expect(row).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      censored: true,
      censor_reason: 'technical failure on m19_l2',
      closure_reason: 'technical_failure',
      included_ids: ['m19_l1'],
    });
    expect(lineOf(row, 'm19_l2')).toMatchObject({
      finish: 'technical_failure',
      boundary_attempt_index: 2,
      eligible: false,
      excluded_reason: 'technical_failure',
    });
    expect((row.components.faults as Comp[])[0]).toMatchObject({
      line_id: 'm19_l2',
      after_closure: false,
    });
  });

  test('E21 (the contrast to W1): line 1 obstacle, a further new TRY that does not restore it, then a fault while line 1 is unfinished ⇒ null, numerator null, denominator 0, technical_failure (technical_only), censored; the boundary and the further TRY kept in the components', () => {
    const r = line1AtObstacle();

    set1(r, { h1: false, h2: false, h3: true, feed: 'DOUBLE' });
    expect(tryNow(r)).toMatchObject({ kind: 'executed', restored: false });
    expect(fault(r)).toEqual({ kind: 'closed', line_id: 'm19_l1' });

    const row = rowOf(logOf(r));

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      planned_denominator: 2,
      included_ids: [],
      disposition: 'technical_failure',
      missing_reason: 'technical_only',
      censored: true,
      censor_reason: 'technical failure on m19_l1',
      closure_reason: 'technical_failure',
    });
    expect(row.components.nonresponse_kind).toBe('technical_only');
    expect(lineOf(row, 'm19_l1')).toMatchObject({
      boundary_attempt_index: 1,
      continued: true,
      tries_after_boundary: 1,
      eligible: false,
      excluded_reason: 'technical_failure',
      finish: 'technical_failure',
    });
    expect(lineOf(row, 'm19_l2')).toMatchObject({ presented: false });
    // E17: the same without the further TRY.
    const r17 = line1AtObstacle();

    fault(r17);
    expect(rowOf(logOf(r17))).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'technical_failure',
      missing_reason: 'technical_only',
      censored: true,
    });
  });

  test('E19 a fault during the check (no line in work) ⇒ technical_failure (technical_only) with null denominators; a fault between the lines with line 1 eligible ⇒ observed from line 1', () => {
    const r = atCheck();

    expect(fault(r, 'draft: boom')).toEqual({ kind: 'closed', line_id: null });

    const e19 = rowOf(logOf(r));

    expect(e19).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'technical_failure',
      closure_reason: 'technical_failure',
    });
    expect(e19.components.nonresponse_kind).toBe('technical_only');

    const between = line1AtObstacle();

    set1(between, KEY1);
    tryNow(between);
    expect(fault(between, 'next_line: boom')).toEqual({
      kind: 'closed',
      line_id: null,
    });
    expect(rowOf(logOf(between))).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      censored: false,
      closure_reason: 'technical_failure',
    });
  });

  test('E19b (review finding SC-1) a fault with no line in work after a passed check and no eligible line ⇒ technical_failure (technical_only), denominator 0, never a non-response: on the recorded view, and between the lines after line 1 restored before its obstacle', () => {
    const recorded = checked('pass_first');

    expect(fault(recorded, 'start: boom')).toEqual({
      kind: 'closed',
      line_id: null,
    });

    const onRecorded = rowOf(logOf(recorded));

    expect(onRecorded).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'technical_failure',
      missing_reason: 'technical_only',
      closure_reason: 'technical_failure',
      censored: false,
    });
    expect(onRecorded.components.nonresponse_kind).toBe('technical_only');
    expect(lineOf(onRecorded, 'm19_l1').presented).toBe(false);

    const between = line1();

    set1(between, KEY1);
    tryNow(between);
    expect(between.s.lines[0].finish).toBe('restored');
    expect(fault(between, 'next_line: boom')).toEqual({
      kind: 'closed',
      line_id: null,
    });

    const afterLine1 = rowOf(logOf(between));

    expect(afterLine1).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'technical_failure',
      missing_reason: 'technical_only',
      closure_reason: 'technical_failure',
      censored: false,
    });
    expect(afterLine1.components.nonresponse_kind).toBe('technical_only');
    expect(lineOf(afterLine1, 'm19_l1')).toMatchObject({
      finish: 'restored',
      boundary_attempt_index: null,
      eligible: false,
    });
    expect(lineOf(afterLine1, 'm19_l2').presented).toBe(false);
  });

  test('W3 line 2 unfinished at the review ⇒ 1 / 1 censored; W4 unfinished at the shift end ⇒ 1 / 2 observed; W5 before its obstacle at the shift end ⇒ 1 / 1', () => {
    const build = () => {
      const r = line1AtObstacle();

      set1(r, KEY1);
      tryNow(r);
      nextLine(r);
      set2(r, { dial: 4, bypass: 'SHUT' });
      tryNow(r);
      set2(r, { dial: 5, bypass: 'SHUT' });
      tryNow(r);
      m19sLeave(r.s, r.tick(1000), r.sink);

      return r;
    };
    const w3 = build();

    expect(m19sCloseAtReview(w3.s, w3.tick(1000), w3.sink)).toBe(true);
    expect(rowOf(logOf(w3))).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      censored: true,
      censor_reason: 'review closed m19_l2 without a further TRY',
      closure_reason: 'closed_at_review',
      included_ids: ['m19_l1'],
    });

    const w4 = build();

    expect(m19sCloseAtShiftEnd(w4.s, w4.tick(1000), w4.sink)).toBe(true);

    const row4 = rowOf(logOf(w4));

    expect(row4).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
      censored: false,
      closure_reason: 'route_departure',
      included_ids: ['m19_l1', 'm19_l2'],
    });
    expect(row4.components.series_closure_reason).toBe('shift_ended');

    const w5 = line1AtObstacle();

    set1(w5, KEY1);
    tryNow(w5);
    nextLine(w5);
    set2(w5, { dial: 3, bypass: 'SHUT' });
    tryNow(w5);
    m19sLeave(w5.s, w5.tick(1000), w5.sink);
    expect(m19sCloseAtShiftEnd(w5.s, w5.tick(1000), w5.sink)).toBe(true);
    expect(rowOf(logOf(w5))).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      included_ids: ['m19_l1'],
    });
  });

  test('W2 reload after an opening: the new load holds the check and the hold-back ⇒ interrupted; the earlier events are not counted; E18 an opening in a load without its presented record is read normally', () => {
    const r = run();

    m19sHoldBack(r.s);
    r.sink('prior_load_checked', {
      phase: 'closure',
      ...m19PriorLoadCheck(
        2,
        [{ event_type: `${M19_FAMILY}opportunity_opened` }],
        {
          first_sequence: 1,
          sequence_gap_count: 0,
          sequence_duplicate_count: 0,
          recovered_from_chunks: false,
        },
      ),
      input_mode: 'system',
    });
    r.sink('technical_failure', {
      detail: M19_RELOAD_DETAIL,
      input_mode: 'system',
    });

    const w2 = rowOf(
      logOf(r, { briefed: false, opened: false, pageLoadIndex: 2 }),
      RELOADED,
    );

    expect(w2).toMatchObject({ value: null, disposition: 'interrupted' });
    expect(w2.components.held_back_after_reload).toBe(true);
    expect((w2.components.reload_check as Comp).prior_opening_found).toBe(true);
    expect(
      m19PriorAdministration([
        { event_type: `${M19_FAMILY}opportunity_opened` },
      ]),
    ).toBe(true);
    expect(
      m19PriorAdministration([{ event_type: `${M19_FAMILY}presented` }]),
    ).toBe(false);

    // E18: briefed before the reload; the new load opens the panel.
    const e18 = line1AtObstacle();

    set1(e18, KEY1);
    tryNow(e18);
    nextLine(e18);
    set2(e18, { dial: 4, bypass: 'SHUT' });
    tryNow(e18);
    set2(e18, { dial: 5, bypass: 'SHUT' });
    tryNow(e18);
    setAside(e18);

    const row18 = rowOf(
      logOf(e18, { briefed: false, pageLoadIndex: 2 }),
      RELOADED,
    );

    expect(row18).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
    });
    expect(row18.components.presented_in_current_load).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * 4. Integrity rules S1–S7 and descriptive inconsistencies
 * ------------------------------------------------------------------ */

/** A complete 2 / 2 run (E7) as the base of the mutations. */
function fullRun(): Run {
  const r = line1AtObstacle();

  set1(r, KEY1);
  tryNow(r);
  nextLine(r);
  set2(r, { dial: 5, bypass: 'SHUT' });
  tryNow(r);
  set2(r, { dial: 4, bypass: 'SHUT' });
  tryNow(r);
  set2(r, KEY2);
  tryNow(r);
  expect(r.s.status).toBe('completed');

  return r;
}

const isType = (event: RawGameEvent, suffix: string, lineId?: string) =>
  event.event_type === `${M19_FAMILY}${suffix}` &&
  (lineId === undefined || event.metadata?.line_id === lineId);

function withMeta(
  events: RawGameEvent[],
  pick: (event: RawGameEvent) => boolean,
  patch: Record<string, unknown>,
): RawGameEvent[] {
  const copy = JSON.parse(JSON.stringify(events)) as RawGameEvent[];
  const target = copy.find(pick);

  expect(target, 'mutation target').toBeDefined();
  target!.metadata = { ...target!.metadata, ...patch };

  return copy;
}

function without(
  events: RawGameEvent[],
  pick: (event: RawGameEvent) => boolean,
): RawGameEvent[] {
  const copy = JSON.parse(JSON.stringify(events)) as RawGameEvent[];
  const at = copy.findIndex(pick);

  expect(at, 'removal target').toBeGreaterThanOrEqual(0);
  copy.splice(at, 1);

  return copy;
}

function expectVoided(row: Row, kind: RegExp) {
  expect(row.value).toBeNull();
  expect(row.disposition).toBe('technical_failure');
  expect(row.closure_reason).toBe('technical_failure');
  expect(row.missing_reason).toMatch(/^integrity defect: /);

  const defects = row.components.integrity_defect as Comp[];

  expect(defects.length).toBeGreaterThan(0);
  expect(
    defects.some((d) => kind.test(String(d.kind))),
    `a defect matching ${kind} among ${JSON.stringify(defects.map((d) => d.kind))}`,
  ).toBe(true);
}

test.describe('M19 extractor: integrity rules (Unit 21)', () => {
  test('S1 a wrong content_version on an attempt and an unknown version on any family event void the row', () => {
    const base = logOf(fullRun());

    expect(rowOf(base).value).toBe(2);
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'attempt', 'm19_l1'), {
          content_version: 'm19-content-v1',
        }),
      ),
      /unknown content version/,
    );
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'line_presented', 'm19_l2'), {
          entry_state_version: 'm19-coupling-v1',
        }),
      ),
      /unknown version/,
    );
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'opportunity_opened'), {
          entry_state_snapshot: {
            ...m19EntrySnapshot('exterior_work'),
            lines_planned: '2',
          },
        }),
      ),
      /lines_planned/,
    );
  });

  test('S2 two events sharing a sequence void the row', () => {
    const base = logOf(fullRun());
    const twins = JSON.parse(JSON.stringify(base)) as RawGameEvent[];

    twins[5].sequence = twins[4].sequence;
    expectVoided(rowOf(twins), /share a sequence/);
  });

  test("S3 line 2 presented before line 1's finish, a line presented twice, and closed_unopened with an opening void the row", () => {
    const r = line1AtObstacle();

    // Present line 2 by hand before line 1's finish.
    r.sink('line_presented', {
      phase: 'measurement',
      form_id: M19_FORM_ID,
      content_version: M19_CONTENT_VERSION,
      line_id: 'm19_l2',
      line_index: 2,
      assigned_position: 2,
      realised_position: 2,
      starting_setting: { dial: 1, bypass: 'SHUT' },
      input_mode: 'system',
    });
    expectVoided(rowOf(logOf(r)), /line 2 was presented before line 1/);

    const base = logOf(fullRun());
    const twice = JSON.parse(JSON.stringify(base)) as RawGameEvent[];
    const presentation = twice.find((e) =>
      isType(e, 'line_presented', 'm19_l1'),
    )!;

    twice.push({
      ...presentation,
      sequence: (twice[twice.length - 1].sequence as number) + 10,
    });
    expectVoided(rowOf(twice), /presented twice|after the series closed/);

    const unopened = JSON.parse(JSON.stringify(base)) as RawGameEvent[];

    unopened.push({
      ...unopened[0],
      event_type: `${M19_FAMILY}closed_unopened`,
      sequence: (unopened[unopened.length - 1].sequence as number) + 10,
      metadata: {
        ...unopened[0].metadata,
        closure_reason: 'shift_ended',
        input_mode: 'system',
      },
    });
    expectVoided(rowOf(unopened), /closed_unopened together with an opening/);
  });

  test('S4 an attempt index gap, a stored reading or restored flag contradicting the rule, a repeated setting and an attempt after the finish void the row', () => {
    const base = logOf(fullRun());

    expectVoided(
      rowOf(
        withMeta(
          base,
          (e) =>
            isType(e, 'attempt', 'm19_l2') && e.metadata?.attempt_index === 2,
          { attempt_index: 3 },
        ),
      ),
      /attempt index out of sequence/,
    );
    expectVoided(
      rowOf(
        withMeta(
          base,
          (e) =>
            isType(e, 'attempt', 'm19_l1') && e.metadata?.attempt_index === 1,
          { reading: 'OK' },
        ),
      ),
      /stored reading contradicts/,
    );
    expectVoided(
      rowOf(
        withMeta(
          base,
          (e) =>
            isType(e, 'attempt', 'm19_l1') && e.metadata?.attempt_index === 1,
          { restored: true },
        ),
      ),
      /stored restored flag contradicts/,
    );
    // The second line-2 attempt repeats the first's setting.
    expectVoided(
      rowOf(
        withMeta(
          base,
          (e) =>
            isType(e, 'attempt', 'm19_l2') && e.metadata?.attempt_index === 2,
          { setting: { dial: 5, bypass: 'SHUT' } },
        ),
      ),
      /executed twice/,
    );

    const after = JSON.parse(JSON.stringify(base)) as RawGameEvent[];
    const attempt = after.find((e) => isType(e, 'attempt', 'm19_l1'))!;

    after.push({
      ...attempt,
      sequence: (after[after.length - 1].sequence as number) + 10,
      metadata: {
        ...attempt.metadata,
        attempt_index: 3,
        setting: { h1: false, h2: false, h3: false, feed: 'DOUBLE' },
        reading: 'LOW',
        restored: false,
      },
    });
    expectVoided(rowOf(after), /after its line was finished/);
  });

  test('S5 a missing boundary, a second boundary, a boundary on the wrong attempt, with wrong evidence indices or a wrong attempt sequence void the row', () => {
    const base = logOf(fullRun());

    expectVoided(
      rowOf(without(base, (e) => isType(e, 'difficulty_boundary', 'm19_l1'))),
      /without a boundary record/,
    );

    const second = JSON.parse(JSON.stringify(base)) as RawGameEvent[];
    const boundary = second.find((e) =>
      isType(e, 'difficulty_boundary', 'm19_l1'),
    )!;
    const at = second.indexOf(boundary);

    second.splice(at + 1, 0, {
      ...boundary,
      sequence: (boundary.sequence as number) + 1,
    });
    expectVoided(rowOf(second), /second boundary/);
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'difficulty_boundary', 'm19_l2'), {
          attempt_index: 1,
        }),
      ),
      /attempt index is not the first attempt/,
    );
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'difficulty_boundary', 'm19_l2'), {
          evidence_attempt_indices: [2],
        }),
      ),
      /evidence indices disagree/,
    );
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'difficulty_boundary', 'm19_l1'), {
          attempt_sequence: 1,
        }),
      ),
      /attempt sequence is not/,
    );
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'difficulty_boundary', 'm19_l1'), {
          rule: 'first_unsuccessful_try',
        }),
      ),
      /rule is not designed_obstacle/,
    );
  });

  test('S6 a restored finish after an unsuccessful attempt, a shift_ended finish without the series closure, a technical finish without the kit record, and a contradicting snapshot void the row', () => {
    const base = logOf(fullRun());

    expectVoided(
      rowOf(
        withMeta(
          base,
          (e) =>
            isType(e, 'attempt', 'm19_l1') && e.metadata?.attempt_index === 2,
          {
            setting: { h1: true, h2: true, h3: true, feed: 'DOUBLE' },
            reading: 'HIGH',
            restored: false,
          },
        ),
      ),
      /restored without a restoring last attempt|restored_at_attempt|continued/,
    );
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'line_finished', 'm19_l2'), {
          finish: 'shift_ended',
        }),
      ),
      /without a series closure of the same reason|restoring attempt without/,
    );
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'line_finished', 'm19_l1'), {
          continued: false,
        }),
      ),
      /continued flag disagrees/,
    );
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'series_completed'), {
          lines: (
            base.find((e) => isType(e, 'series_completed'))!.metadata!
              .lines as Comp[]
          ).map((line) =>
            line.line_id === 'm19_l2' ? { ...line, continued: false } : line,
          ),
        }),
      ),
      /closure snapshot's continued/,
    );

    // A fault finish without the kit record naming the line.
    const w1 = line1AtObstacle();

    set1(w1, KEY1);
    tryNow(w1);
    nextLine(w1);
    set2(w1, { dial: 4, bypass: 'SHUT' });
    tryNow(w1);
    fault(w1);

    const faulted = logOf(w1);

    expect(rowOf(faulted).disposition).toBe('observed');
    expectVoided(
      rowOf(without(faulted, (e) => isType(e, 'technical_failure'))),
      /without the kit record naming the line/,
    );
    expectVoided(
      rowOf(
        withMeta(faulted, (e) => isType(e, 'technical_failure'), {
          line_id: null,
        }),
      ),
      /kit fault without a line while a line was in work|without the kit record/,
    );
  });

  test('S7 a check record contradicting the answers, a stored correct flag contradicting the key, and a recheck without the explanation void the row', () => {
    const base = logOf(fullRun());

    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'check_recorded'), { status: 'fail' }),
      ),
      /recorded check status disagrees/,
    );
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'check_answered'), { correct: false }),
      ),
      /stored outcome contradicts the key|recorded check status/,
    );
    expectVoided(
      rowOf(
        withMeta(base, (e) => isType(e, 'check_answered'), {
          option_id: 'm19_chk_q1_o9',
        }),
      ),
      /names no option/,
    );

    const r = checked('pass_after_explanation');
    const log = logOf(r);

    expectVoided(
      rowOf(without(log, (e) => isType(e, 'explanation_shown'))),
      /before the explanation/,
    );
  });

  test('descriptive inconsistencies — a help record without a view, a negative focused ms, a wrong after_boundary flag — set flags only; the value is unchanged', () => {
    const base = logOf(fullRun());
    const r = fullRun();

    r.sink('help_consulted', { phase: 'closure', input_mode: 'keyboard' });

    const noView = rowOf(logOf(r));

    expect(noView.value).toBe(2);
    expect(noView.disposition).toBe('observed');
    expect(noView.components.flags).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/help record without a view/),
      ]),
    );

    const negative = rowOf(
      withMeta(base, (e) => isType(e, 'line_finished', 'm19_l1'), {
        line_focused_ms: -5,
      }),
    );

    expect(negative.value).toBe(2);
    expect(negative.components.flags).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/negative focused interval/),
      ]),
    );

    const wrongFlag = rowOf(
      withMeta(
        base,
        (e) =>
          isType(e, 'attempt', 'm19_l1') && e.metadata?.attempt_index === 2,
        { after_boundary: false },
      ),
    );

    expect(wrongFlag.value).toBe(2);
    expect(wrongFlag.components.flags).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/after_boundary flag disagrees/),
      ]),
    );
    expect(rowOf(base).components.flags).toEqual([]);
  });

  test('determinism: the same log twice gives identical rows; the extractor never mutates the log', () => {
    const base = logOf(fullRun());
    const a = JSON.stringify(rowOf(base));
    const b = JSON.stringify(rowOf(base));

    expect(a).toBe(b);
  });
});

/* ------------------------------------------------------------------ *
 * 5. The clock policy (injected time)
 * ------------------------------------------------------------------ */

test.describe('M19 clock policy (Unit 21)', () => {
  test('help and the dialog do not pause; LEAVE pauses; the shift-end finish after LEAVE adds nothing (boundary_to_finish equals the time up to LEAVE)', () => {
    const r = line1(); // the clock starts at line_presented (r.now)
    const presentedAt = r.now;

    set1(r, ALL_SINGLE);
    r.tick(1000);
    expect(m19sTry(r.s, 'keyboard', r.now, r.sink).kind).toBe('executed');

    const boundaryAt = r.now;

    // Help: 2 s on the sheet count.
    expect(m19sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    r.tick(2000);
    expect(m19sCloseHelp(r.s, 'keyboard', r.now)).toBe(true);
    // The dialog: 3 s count.
    expect(m19sRequestSetAside(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    r.tick(3000);
    expect(m19sCancelSetAside(r.s, 'keyboard', r.now, r.sink)).toBe(true);
    // LEAVE: a minute away adds nothing.
    r.tick(500);

    const leftAt = r.now;

    m19sLeave(r.s, r.now, r.sink);
    r.tick(60_000);

    const reopenedAt = r.now;

    m19sOpen(r.s, r.now, r.sink);
    set1(r, { h1: true, h2: true, h3: true, feed: 'DOUBLE' });
    r.tick(700);

    const triedAt = r.now;

    expect(m19sTry(r.s, 'keyboard', r.now, r.sink).kind).toBe('executed');
    expect(last(r, 'attempt')?.metadata.since_boundary_focused_ms).toBe(
      leftAt - boundaryAt + (triedAt - reopenedAt),
    );
    // LEAVE again, the shift end a long time later: nothing added.
    r.tick(300);

    const leftAgainAt = r.now;

    m19sLeave(r.s, r.now, r.sink);
    r.tick(120_000);
    expect(m19sCloseAtShiftEnd(r.s, r.now, r.sink)).toBe(true);

    const focusedUntilLeave = leftAt - presentedAt + (leftAgainAt - reopenedAt);

    expect(last(r, 'line_finished')?.metadata).toMatchObject({
      finish: 'shift_ended',
      line_focused_ms: focusedUntilLeave,
      boundary_to_next_try_focused_ms:
        leftAt - boundaryAt + (triedAt - reopenedAt),
      boundary_to_finish_focused_ms:
        focusedUntilLeave - (boundaryAt - presentedAt),
    });
  });

  test("a line's clock starts at its presentation and stops at its finish; the second line has its own clock", () => {
    const r = line1();
    const presentedAt = r.now;

    set1(r, KEY1);
    r.tick(5000);
    expect(m19sTry(r.s, 'keyboard', r.now, r.sink).kind).toBe('executed');
    expect(last(r, 'line_finished')?.metadata.line_focused_ms).toBe(
      r.now - presentedAt,
    );
    r.tick(9000); // on the finished view: line 1 stopped, line 2 not started
    expect(m19sNextLine(r.s, 'keyboard', r.now, r.sink)).toBe(true);

    const line2At = r.now;

    set2(r, KEY2);
    r.tick(2500);
    expect(m19sTry(r.s, 'keyboard', r.now, r.sink).kind).toBe('executed');
    expect(last(r, 'line_finished')?.metadata).toMatchObject({
      line_id: 'm19_l2',
      line_focused_ms: r.now - line2At,
      boundary_to_finish_focused_ms: null,
    });
  });
});

/* ------------------------------------------------------------------ *
 * 6. Register, schedule, legacy separation and the yard's integration
 * ------------------------------------------------------------------ */

const root = (path: string) =>
  readFileSync(resolve(path), 'utf8').replace(/\r\n/g, '\n');

test.describe('M19 register and legacy separation (Unit 21)', () => {
  test('the M19 register entry: v3 route, implemented, the ids of the contract; the feature row unchanged; the schedule follows', () => {
    const entry = registerEntry('M19');

    expect(entry.route).toEqual({
      route_version: 'v3',
      opportunity_ids: ['proto_m19_lines_series'],
      windows: [
        {
          id: 'm19_lines_w1',
          occasion: null,
          zone: 'exterior_recovery_yard',
          episode: 4,
        },
      ],
      family_prefixes: ['proto_m19_lines_'],
      secondary_ids: [],
    });
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.features).toHaveLength(1);
    expect(entry.features[0]).toMatchObject({
      feature_id: 'm19_continuations',
      kind: 'fraction',
      planned_denominator: 2,
      denominator_kind: 'conditional_eligibility',
      range: '0–2',
      role: 'primary',
    });
    expect(entry.independence.kind).toBe('repeated_within_episode');
    expect(entry.operational_label).toBe('Valve coupling (Yard)');

    const scheduled = PILOT_SCHEDULE.find((item) => item.item === 'M19')!;

    expect(scheduled.opportunityIds).toEqual(['proto_m19_lines_series']);
    expect(scheduled.familyPrefixes).toEqual(['proto_m19_lines_']);
    expect(scheduled.zone).toBe('exterior_recovery_yard');
  });

  test('proto_m19_lines_ is disjoint from every other primary prefix and from the retired proto_m19_valve_', () => {
    for (const entry of REGISTER_V3) {
      if (entry.id === 'M19') {
        continue;
      }

      for (const prefix of entry.route.family_prefixes) {
        expect(
          prefix.startsWith(M19_FAMILY) || M19_FAMILY.startsWith(prefix),
          `${entry.id} ${prefix}`,
        ).toBe(false);
      }
    }

    expect(M19_FAMILY.startsWith('proto_m19_valve_')).toBe(false);
    expect('proto_m19_valve_'.startsWith(M19_FAMILY)).toBe(false);
    expect(M19_FAMILY).toBe('proto_m19_lines_');
    expect(M19_OPPORTUNITY_ID).toBe('proto_m19_lines_series');
    expect(M19_WINDOW_ID).toBe('m19_lines_w1');
    expect(M19_ENTRY_STATE_VERSION).toBe('m19-lines-v2');
    expect(M19_FORM_ID).toBe('m19-form-1');
    expect(M19_CONTENT_VERSION).toBe('m19-content-v2');
    expect([...M19_EVENT_SUFFIXES]).toEqual(
      expect.arrayContaining([
        'closed_unopened',
        'difficulty_boundary',
        'line_finished',
        'series_completed',
        'series_closed',
      ]),
    );
  });

  test('source: the yard scene no longer imports the legacy coupling or calls its acts; the ready factory presents M19; finishOutside closes it; no path reaches exteriorTechnicalFailure(M19); the station log carries no legacy fields; closeM19Surface runs from onClose', () => {
    const yard = root('src/scenes/ExteriorRecoveryYardScene.ts');

    expect(yard).not.toMatch(/m19CouplingModel/);
    expect(yard).not.toMatch(
      /\bm19Act\b|\bm19Present\b|\bm19StepAway\b|\bm19PromptBody\b/,
    );
    expect(yard).not.toMatch(/exteriorTechnicalFailure\(\s*'M19'/);
    expect(yard).not.toMatch(/guard\(item: '(M19|[^)]*'M19')/);
    expect(yard).toMatch(
      /private guard\(item: 'M20' \| 'M23' \| 'M24' \| 'M26'/,
    );

    const ready = yard.slice(
      yard.indexOf('const ready = (loan: boolean | null) => () => {'),
      yard.indexOf('this.refreshGuidance();', yard.indexOf('const ready = ')),
    );

    expect(ready).toContain('presentM08(now);');
    expect(ready).toContain('presentM19(now);');

    const finish = yard.slice(
      yard.indexOf('private finishOutside() {'),
      yard.indexOf("advancePilotStage('return_hub', now);"),
    );

    expect(finish).toContain('endExteriorShift(now);');
    expect(finish).toContain('closeM19AtShiftEnd(now);');

    const station = yard.slice(
      yard.indexOf("this.logStationOpened('frozen_coupling', {"),
      yard.indexOf('registerPilotStation({', yard.indexOf("'frozen_coupling'")),
    );

    expect(station).not.toMatch(/progress:|bound:/);
    expect(station).toMatch(
      /onClose: \(\) => \{[\s\S]*?closeM19Surface\(Date\.now\(\)\);[\s\S]*?\}/,
    );
    expect(station).toContain("dismissExteriorSite('coupling')");
    expect(station).toContain("frame: 'wide'");
    expect(station).toContain("surfaceId: 'm19_coupling_panel'");
    expect(yard).toContain(
      "isDone: () => m19Window.windowStatus() !== 'unopened'",
    );
    expect(yard).toContain('resumeM19Surface(now);');
    expect(yard).toContain('declareM19Lines();');
    expect(yard).toContain('guardM19Reload();');
  });

  test("source: exteriorWindows.ts no longer declares the legacy window or closes it absent at the review, and keeps exactly 8 setComprehension('passed') occurrences; reviewClosure calls closeM19AtReview", () => {
    const exterior = root('src/pilot/windows/exteriorWindows.ts');

    expect(exterior).not.toContain('w.m19.declare();');
    expect(exterior).not.toContain("'coupling never worked before the review'");
    expect(exterior.match(/setComprehension\('passed'\)/g) ?? []).toHaveLength(
      8,
    );
    // The legacy functions stay in the tree, unchanged in identity.
    expect(exterior).toContain('export function m19Act(');
    expect(exterior).toContain('export function m19Present(');

    const review = root('src/pilot/windows/reviewClosure.ts');

    expect(review).toContain(
      "import { closeM19AtReview } from './m19CouplingPanel';",
    );
    expect(review).toContain('closeM19AtReview(nowMs);');
  });
});

/* ------------------------------------------------------------------ *
 * 7. The surface model: neutral landings, HELP / LEAVE, the fixed text
 * ------------------------------------------------------------------ */

function hostOf(r: Run): M19SurfaceHost {
  return {
    now: () => r.now,
    close: () => undefined,
    feedback: () => undefined,
    series: () => r.s,
    commands: {} as M19SurfaceHost['commands'],
  };
}

const focusables = (r: Run) =>
  m19SurfaceModel(hostOf(r))
    .elements.filter(
      (e) => e.onActivate !== undefined && e.state !== 'disabled',
    )
    .map((e) => e.id);

test.describe('M19 surface model (Unit 21)', () => {
  test('every view lands on a neutral landing; the dialog on its confirm; the help sheet on CLOSE HELP; HELP and LEAVE on every non-dialog view', () => {
    const r = opened();

    expect(focusables(r)[0]).toBe('intro');
    expect(focusables(r)).toEqual([
      'intro',
      'continue',
      'help_intro',
      'leave_intro',
    ]);
    m19sContinue(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual([
      'question',
      'option_1',
      'option_2',
      'option_3',
      'record',
      'help_check_1',
      'leave_check_1',
    ]);
    m19sDraft(r.s, 'm19_chk_q1_o1', 'keyboard', r.settle(), r.sink);
    m19sRecordAnswer(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual([
      'explanation',
      'continue',
      'help_explanation',
      'leave_explanation',
    ]);
    m19sContinueExplanation(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)[0]).toBe('question');
    expect(focusables(r).slice(-2)).toEqual(['help_check_2', 'leave_check_2']);
    m19sDraft(r.s, 'm19_chk_q2_o3', 'keyboard', r.settle(), r.sink);
    m19sRecordAnswer(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual([
      'recorded',
      'start',
      'help_recorded',
      'leave_recorded',
    ]);
    m19sStartLine1(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual([
      'readout',
      'heater_1',
      'heater_2',
      'heater_3',
      'feed',
      'try',
      'set_aside',
      'help_line_1',
      'leave_line_1',
    ]);
    expect(m19sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(focusables(r)).toEqual(['close_help']);
    expect(m19SurfaceModel(hostOf(r)).title).toBe('PANEL HELP');
    m19sCloseHelp(r.s, 'keyboard', r.settle());
    m19sRequestSetAside(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual(['confirm', 'back']);

    const dialog = m19SurfaceModel(hostOf(r));

    expect(dialog.elements.find((e) => e.id === 'confirm')).toMatchObject({
      x: 200,
      y: 250,
    });
    expect(dialog.elements.find((e) => e.id === 'back')).toMatchObject({
      x: 466,
      y: 250,
    });
    expect(dialog.help).toBe('ENTER set aside · ESC back');
    m19sConfirmSetAside(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual([
      'finished_line',
      'next',
      'help_finished_1',
      'leave_finished_1',
    ]);
    expect(m19SurfaceModel(hostOf(r)).status).toBe('1 of 2 lines finished.');
    m19sNextLine(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual([
      'readout',
      'dial_down',
      'dial_up',
      'bypass',
      'try',
      'set_aside',
      'help_line_2',
      'leave_line_2',
    ]);
    expect(m19SurfaceModel(hostOf(r)).status).toBe('Working on line 2 of 2.');
    m19sRequestSetAside(r.s, 'keyboard', r.settle(), r.sink);
    m19sConfirmSetAside(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual([
      'finished_line',
      'finish',
      'help_finished_2',
      'leave_finished_2',
    ]);

    const final = m19SurfaceModel(hostOf(r));

    expect(final.status).toBe('2 of 2 lines finished.');
    expect(final.elements.find((e) => e.id === 'finished_line')?.label).toBe(
      'Line 2 finished: set aside.\nBoth lines finished.',
    );
    expect(m19sFinish(r.s, 'keyboard', r.settle())).toBe(true);
    m19sLeave(r.s, r.tick(100), r.sink);
    m19sOpen(r.s, r.tick(100), r.sink);
    expect(focusables(r)).toEqual(['closed', 'leave_record']);
    expect(m19SurfaceModel(hostOf(r)).elements[0].label).toBe(
      'Both lines are finished. The panel takes no further settings.',
    );
  });

  test('HELP and LEAVE carry the view name in their ids (review finding GP-1, fixed locally at the closeout): the views a hotkey can move between never share an id, so the frame lands on the neutral element', () => {
    const r = opened();
    const last = () => focusables(r).slice(-2);
    const seen: string[][] = [];
    const note = () => {
      const pair = last();

      expect(pair[0]).toMatch(/^help_/);
      expect(pair[1]).toMatch(/^leave_/);
      expect(pair[0].slice(5)).toBe(pair[1].slice(6));
      expect(seen).not.toContainEqual(pair);
      seen.push(pair);
    };

    note(); // intro
    m19sContinue(r.s, 'keyboard', r.settle(), r.sink);
    note(); // check_1 — R with a wrong draft moves to the explanation
    m19sDraft(r.s, 'm19_chk_q1_o1', 'keyboard', r.settle(), r.sink);
    m19sRecordAnswer(r.s, 'keyboard', r.settle(), r.sink);
    note(); // explanation
    m19sContinueExplanation(r.s, 'keyboard', r.settle(), r.sink);
    note(); // check_2 — R moves to the recorded line
    m19sDraft(r.s, 'm19_chk_q2_o3', 'keyboard', r.settle(), r.sink);
    m19sRecordAnswer(r.s, 'keyboard', r.settle(), r.sink);
    note(); // recorded
    m19sStartLine1(r.s, 'keyboard', r.settle(), r.sink);
    note(); // line_1 — a restoring T moves to the finished view
    set1(r, KEY1);
    expect(tryNow(r).kind).toBe('executed');
    note(); // finished_1
    m19sNextLine(r.s, 'keyboard', r.settle(), r.sink);
    note(); // line_2
    m19sRequestSetAside(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual(['confirm', 'back']);
    m19sConfirmSetAside(r.s, 'keyboard', r.settle(), r.sink);
    note(); // finished_2
    expect(seen).toHaveLength(9);
    // Every element id of a line view is unique within the view.
    expect(new Set(focusables(r)).size).toBe(focusables(r).length);
  });

  test('the TRY list shows at most nine rows, then the earlier-TRYs line above the newest eight; every opener sits at x ≥ 738', () => {
    const r = line1();
    const settings = HAND1.settings().filter((s) => !HAND1.same(s, KEY1));

    for (const s of settings.slice(0, 10)) {
      set1(r, s);
      expect(tryNow(r).kind).toBe('executed');
    }

    const log = m19SurfaceModel(hostOf(r)).elements.find(
      (e) => e.id === 'log',
    )!;
    const lines = log.label.split('\n');

    expect(lines[0]).toBe('TRIES (newest last)');
    expect(lines[1]).toBe('… 2 earlier TRYs not shown');
    expect(lines).toHaveLength(10);
    expect(lines[9]).toMatch(/^TRY 10 /);

    for (const element of m19SurfaceModel(hostOf(r)).elements) {
      if (element.id === 'try' || element.id === 'set_aside') {
        expect(element.x).toBeGreaterThanOrEqual(738);
      }
    }
  });

  test('the closed records: the shift-end, review and hold-back lines; the two-line fault record; the closure snapshot carries the per-line records', () => {
    const shift = opened();

    m19sLeave(shift.s, shift.tick(100), shift.sink);
    m19sCloseAtShiftEnd(shift.s, shift.tick(100), shift.sink);
    m19sOpen(shift.s, shift.tick(100), shift.sink);
    expect(m19SurfaceModel(hostOf(shift)).elements[0].label).toBe(
      'The coupling panel closed when the outside work ended.',
    );

    const review = opened();

    m19sLeave(review.s, review.tick(100), review.sink);
    m19sCloseAtReview(review.s, review.tick(100), review.sink);
    m19sOpen(review.s, review.tick(100), review.sink);
    expect(m19SurfaceModel(hostOf(review)).elements[0].label).toBe(
      'The coupling panel was closed at the station review.',
    );

    const held = run();

    m19sHoldBack(held.s);
    m19sOpen(held.s, held.tick(100), held.sink);
    expect(m19SurfaceModel(hostOf(held)).elements[0].label).toBe(
      'This panel was opened earlier in the session. It stays closed now.',
    );

    const faulted = line1AtObstacle();

    fault(faulted);
    expect(m19SurfaceModel(hostOf(faulted)).elements.map((e) => e.id)).toEqual([
      'closed',
      'leave_record',
    ]);
    expect(m19SurfaceModel(hostOf(faulted)).elements[0]).toMatchObject({
      label:
        'The coupling panel has a fault and is closed.\nIts record is kept as it is.',
      h: 60,
    });
    expect(m19SurfaceModel(hostOf(faulted)).help).toBe('ESC leave');
    expect(m19ClosureSnapshot(faulted.s)).toMatchObject({
      lines_planned: 2,
      check_status: 'pass_first',
      lines: [
        expect.objectContaining({
          line_id: 'm19_l1',
          finish: 'technical_failure',
          boundary_attempt_index: 1,
        }),
        expect.objectContaining({ line_id: 'm19_l2', presented: false }),
      ],
    });
  });
});

/* ------------------------------------------------------------------ *
 * U24 RL-4 — uncertain history (RELOAD-CORRECTION-SPEC-r3-exec.md §2, §3,
 * §8 RL-4, §9; D-6 (i), D-7 (i)): D-6 (i) in the extractor, D-7 (i) in the
 * check function, the U / M hold at the model and its reading. Expected
 * readings come from r3 §2 and §8 RL-4 (the existing not-established
 * reason is kept for this family).
 * ------------------------------------------------------------------ */

test.describe('U24 RL-4 — M19 under uncertain history (D-6 (i), D-7 (i), the U / M hold)', () => {
  const SOUND = {
    first_sequence: 1,
    sequence_gap_count: 0,
    sequence_duplicate_count: 0,
    recovered_from_chunks: false,
  };
  const NOT_ESTABLISHED =
    'no current-load panel evidence after a reload: coupling panel not opened in this page load and the absence of an earlier opening not established';
  const other = { event_type: 'proto_m08_effort_presented' };
  const U_LINES = [
    'The earlier state of this coupling panel could not be verified.',
    'It stays closed after this reload.',
  ];
  const CHECK = {
    phase: 'closure',
    page_load_index: 2,
    prior_page_load_event_count: 40,
    prior_opening_found: false,
    prior_briefing_found: true,
    history_continuous: true,
    prior_opening_absence_established: true,
    input_mode: 'system',
  };
  const check = (
    flags: Record<string, unknown> = {},
    sequence = 5,
  ): Logged => ({
    suffix: 'prior_load_checked',
    metadata: { ...CHECK, ...flags },
    sequence,
  });
  const marker = (detail: string, sequence = 7): Logged => ({
    suffix: 'technical_failure',
    metadata: { detail, input_mode: 'system' },
    sequence,
  });
  const presented: Logged = {
    suffix: 'presented',
    metadata: { input_mode: 'system' },
    sequence: 51,
  };

  test('F-A (D-6 (i)): two agreeing check records with distinct sequence numbers establish nothing — U, refused, the not-established reading', () => {
    const checks = [check({}, 5), check({}, 6)];
    const cls = classifyReload({
      pageLoadIndex: 2,
      checks: checks.map((event) => event.metadata),
    });

    expect(cls.occasions.row).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'duplicate_checks',
    });
    expect(cls.check_coherent).toBe(true);
    expect(cls.exposure_record_consistent).toBe(false);

    const read = rowOf(
      toEvents([...checks, presented], { pageLoadIndex: 2 }),
      RELOADED,
    );

    expect(read).toMatchObject({
      value: null,
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    expect(
      (read.components.reload_check as Comp).prior_opening_absence_established,
    ).toBe(false);
  });

  test('F-B (D-6 (i)): two conflicting check records ⇒ U, refused, coherence false; the not-established reading', () => {
    const checks = [
      check({}, 5),
      check(
        { history_continuous: false, prior_opening_absence_established: false },
        6,
      ),
    ];
    const cls = classifyReload({
      pageLoadIndex: 2,
      checks: checks.map((event) => event.metadata),
    });

    expect(cls.occasions.row).toMatchObject({
      class: 'U',
      administration_permitted: false,
    });
    expect(cls.check_coherent).toBe(false);
    expect(
      rowOf(toEvents([...checks, presented], { pageLoadIndex: 2 }), RELOADED),
    ).toMatchObject({
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
  });

  test('F-C (D-7 (i)): an earlier U / M hold-back of this family keeps the absence unestablished in a later load with a continuous history; an H marker, another family’s marker or no marker never does', () => {
    const priorU = [
      other,
      {
        event_type: `${M19_FAMILY}technical_failure`,
        metadata: { detail: M19_UNVERIFIED_DETAIL },
      },
    ];
    const priorM = [
      other,
      {
        event_type: `${M19_FAMILY}technical_failure`,
        metadata: { detail: M19_CONTRADICTORY_DETAIL },
      },
    ];
    const priorH = [
      other,
      {
        event_type: `${M19_FAMILY}technical_failure`,
        metadata: { detail: M19_RELOAD_DETAIL },
      },
    ];

    expect(m19PriorHoldBackCarried(priorU)).toBe(true);
    expect(m19PriorHoldBackCarried(priorM)).toBe(true);
    expect(m19PriorHoldBackCarried(priorH)).toBe(false);
    expect(m19PriorHoldBackCarried([other])).toBe(false);
    expect(
      m19PriorHoldBackCarried([
        {
          event_type: 'proto_m20_feed_technical_failure',
          metadata: { detail: M19_UNVERIFIED_DETAIL },
        },
      ]),
    ).toBe(false);

    const carried = m19PriorLoadCheck(3, priorU, SOUND);

    expect(carried).toMatchObject({
      page_load_index: 3,
      prior_opening_found: false,
      history_continuous: true,
      prior_opening_absence_established: false,
    });
    expect(
      m19PriorLoadCheck(3, priorM, SOUND).prior_opening_absence_established,
    ).toBe(false);
    expect(
      m19PriorLoadCheck(3, priorH, SOUND).prior_opening_absence_established,
    ).toBe(true);
    expect(
      classifyReload({ pageLoadIndex: 3, checks: [carried] }).occasions.row,
    ).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'absence_not_established',
    });
  });

  test('the U / M hold (direction c): the panel is never administered — held with the class detail, the record shows exactly the §9 lines and LEAVE, nothing is written; the H hold keeps its text; permission per class', () => {
    for (const [detail, cls] of [
      [M19_UNVERIFIED_DETAIL, 'U'],
      [M19_CONTRADICTORY_DETAIL, 'M'],
    ] as const) {
      const r = run();

      expect(reloadHoldBackClass(detail)).toBe(cls);
      expect(m19sHoldBack(r.s, detail)).toBe(true);
      expect(r.s.status).toBe('held_back');
      expect(r.s.failure_detail).toBe(detail);
      expect(m19RecordLine(r.s)).toBe(U_LINES.join('\n'));
      expect(m19sStartLine1(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
      expect(r.events).toEqual([]);

      const model = m19SurfaceModel(hostOf(r));

      expect(model.elements.map((element) => element.id)).toEqual([
        'closed',
        'leave_record',
      ]);
      expect(model.elements[0].label).toBe(U_LINES.join('\n'));
      expect(model.elements[0].label).not.toContain(M19_TEXT.held_back);
    }

    const h = createM19Series();

    expect(m19sHoldBack(h)).toBe(true);
    expect(m19RecordLine(h)).toBe(M19_TEXT.held_back);
    expect([...M19_TEXT.held_unverified]).toEqual(U_LINES);

    for (const line of U_LINES) {
      expect(m19ParticipantStrings()).toContain(line);
    }

    expect(
      classifyReload({
        pageLoadIndex: 2,
        checks: [
          m19PriorLoadCheck(2, [other], { ...SOUND, sequence_gap_count: 1 }),
        ],
      }).occasions.row,
    ).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'history_discontinuous',
    });
    expect(
      classifyReload({
        pageLoadIndex: 2,
        checks: [m19PriorLoadCheck(2, [other], SOUND)],
      }).occasions.row,
    ).toMatchObject({ class: 'A', administration_permitted: true });
    expect(
      classifyReload({ pageLoadIndex: 1, checks: [] }).occasions.row,
    ).toMatchObject({ class: null, administration_permitted: true });
  });

  test('the extractor reads a U / M marker: interrupted with the existing not-established reason (r3 §8 RL-4), held_back_after_reload; the H reading and the first load are unchanged', () => {
    const u = rowOf(
      toEvents(
        [
          check({
            history_continuous: false,
            prior_opening_absence_established: false,
          }),
          marker(M19_UNVERIFIED_DETAIL),
          presented,
        ],
        { pageLoadIndex: 2 },
      ),
      RELOADED,
    );

    expect(u).toMatchObject({
      value: null,
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    expect(u.components.held_back_after_reload).toBe(true);
    expect(
      (u.components.reload_check as Comp).prior_opening_absence_established,
    ).toBe(false);

    const m = rowOf(
      toEvents(
        [
          check({
            history_continuous: false,
            prior_opening_absence_established: true,
          }),
          marker(M19_CONTRADICTORY_DETAIL),
          presented,
        ],
        { pageLoadIndex: 2 },
      ),
      RELOADED,
    );

    expect(m).toMatchObject({
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    expect(m.components.held_back_after_reload).toBe(true);

    const h = rowOf(
      toEvents(
        [
          check({
            prior_opening_found: true,
            prior_opening_absence_established: false,
          }),
          marker(M19_RELOAD_DETAIL),
          presented,
        ],
        { pageLoadIndex: 2 },
      ),
      RELOADED,
    );

    expect(h).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'coupling panel opened in an earlier page load; not re-run after the reload',
    });
    expect(h.components.held_back_after_reload).toBe(true);

    // No marker, no check (the host never ran): unchanged.
    expect(
      rowOf(toEvents([presented], { pageLoadIndex: 2 }), RELOADED),
    ).toMatchObject({
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    // A first load writes no check and keeps its readings.
    expect(rowOf(toEvents([presented]))).toMatchObject({
      disposition: 'pending',
    });
  });
});
