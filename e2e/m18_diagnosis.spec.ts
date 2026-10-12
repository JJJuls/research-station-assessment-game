/**
 * Station 080 M18 — the three diagnosis cases at the diagnostic board
 * (Unit 20, administration `m18-cases-v1`), pure tests.
 *
 * Playwright test blocks that never touch `page`:
 * - the INDEPENDENT ORACLE: this file carries its own transcription of the
 *   three unit sheets, their tests, options and planned steps, written by
 *   hand from `U20-STIMULUS-PREVIEW.md` §4, and its own simulator per case
 *   (three small functions from the rules) — it imports nothing from
 *   `m18DiagnosisContent.ts` or `m18DiagnosisModel.ts` for the expected
 *   side. It derives every table cell, the consistent sets, the sufficient
 *   pairs, both keys of every case and the implied-by table, checks the
 *   symptom, the margins and the key positions, REPORTS (never asserts as a
 *   ceiling) the shortcut table of preview §5.3, and rejects mutated cases
 *   (the approved row's "ambiguity check rejects"); a cross-check then binds
 *   the module's text to the transcription;
 * - the register rows and route, and the legacy module's separation;
 * - the series model under research-owner decision D-U20-1: no correctness
 *   information before the sixth first response, first responses written
 *   once and never changed, tests closed at the part, the step never before
 *   the part, the fresh-press rule, the settle on every view transition,
 *   drafts that never count, the results controls;
 * - the read-only extractor on synthetic logs: values, companions,
 *   legitimate missingness, the defect scopes of §9.4 (X1–X6), determinism;
 * - the wording of the board.
 *
 * Nothing here establishes psychometric validity: the six responses are
 * clustered observations of three independently designed cases inside one
 * board episode, not six independent situations; the cases are not claimed
 * to be equal in difficulty; a correct answer never proves understanding.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  extractItemFeatures,
  extractMeasurementFeatures,
} from '../src/measurement/features';
import { REGISTER_V3, registerEntry } from '../src/measurement/registerV3';
import { PILOT_SCHEDULE } from '../src/pilot/coverageSchedule';
import {
  M18_ASSIGNED_CASE_ORDER,
  M18_CASES,
  M18_CONTENT_VERSION,
  M18_ENTRY_STATE_VERSION,
  M18_FAMILY,
  M18_FORM_ID,
  M18_OPPORTUNITY_ID,
  M18_SETTLE_MS,
  M18_TEXT,
  M18_WINDOW_ID,
  type M18CaseId,
  m18IntroAndHelpStrings,
  m18ParticipantStrings,
  m18PreCompletionStrings,
  m18ResultsLines,
  type M18Slot,
} from '../src/pilot/windows/m18DiagnosisContent';
import {
  createM18Series,
  M18_ACK_LINE_ID,
  M18_EVENT_SUFFIXES,
  M18_RELOAD_DETAIL,
  m18AnsweredCount,
  m18EntrySnapshot,
  type M18LogSink,
  m18PriorAdministration,
  m18PriorLoadCheck,
  m18sCancelCommit,
  m18sCloseAtReview,
  m18sCloseHelp,
  m18sCloseUnopenedAtReview,
  m18sConfirmCommit,
  m18sDraft,
  type M18Series,
  m18sFail,
  m18sFinish,
  m18sHelp,
  m18sHoldBack,
  m18sLeave,
  m18sNext,
  m18sOpen,
  m18sRequestCommit,
  m18sResultsNavigate,
  m18sRunTest,
  m18sStartCase1,
} from '../src/pilot/windows/m18DiagnosisModel';
import {
  type M18SurfaceHost,
  m18SurfaceModel,
} from '../src/pilot/windows/m18SurfaceModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/* ------------------------------------------------------------------ *
 * 1. The transcription, by hand from the preview (§3–§4). Nothing below
 *    is imported from the content module.
 * ------------------------------------------------------------------ */

type Letter = 'A' | 'B' | 'C';
type Idx = 1 | 2 | 3 | 4;

interface HandTest {
  id: string;
  letter: Letter;
  button: string;
  label: string;
  /** result id → the line shown. */
  lines: Record<string, string>;
}

interface HandCase {
  id: M18CaseId;
  index: number;
  sheet: string[];
  tests: [HandTest, HandTest, HandTest];
  parts: [string, string, string, string];
  /** The authored fault (the preview's bold row). */
  fault: string;
  keyPart: Idx;
  stepText: string;
  steps: [string, string, string, string];
  keyStep: Idx;
  /** The results page (six lines; {part} / {step} substituted). */
  results: [string, string, string, string, string, string];
  /** The simulator: the result id each test shows if `part` is at fault. */
  sim: (part: string, test: Letter) => string;
  /** The simulator: the step outcome (an option text) if `part` is at fault. */
  stepSim: (part: string) => string;
  /** The symptom holds under this fault (null = no fault). */
  symptom: (part: string | null) => boolean;
}

const C1: HandCase = {
  id: 'm18_c1',
  index: 1,
  sheet: [
    'MAST RECEIVER',
    'Path: 1 MAST ▶ 2 CABLE ▶ 3 AMPLIFIER ▶ 4 FILTER ▶ SPEAKER',
    'Now: the SPEAKER is silent. The SPEAKER itself works.',
    'Exactly one of MAST, CABLE, AMPLIFIER, FILTER is at fault.',
    'At fault: the part passes no tone on.',
    '1  The tone runs along the path in the order shown.',
    '2  A working part passes the tone on.',
    '3  Probe P1 is after part 2, P2 after part 3, P3 after part 4.',
    '4  A probe reads TONE if the tone reaches it; otherwise SILENT.',
    '5  A spare part is never at fault; it is taken out after its test.',
  ],
  tests: [
    {
      id: 'm18_c1_ta',
      letter: 'A',
      button: 'PROBE P1  [A]',
      label: 'A  PROBE P1',
      lines: { tone: 'P1 reads TONE.', silent: 'P1 reads SILENT.' },
    },
    {
      id: 'm18_c1_tb',
      letter: 'B',
      button: 'PROBE P2  [B]',
      label: 'B  PROBE P2',
      lines: { tone: 'P2 reads TONE.', silent: 'P2 reads SILENT.' },
    },
    {
      id: 'm18_c1_tc',
      letter: 'C',
      button: 'SPARE FILTER  [C]',
      label: 'C  SPARE FILTER',
      lines: {
        tone: 'Spare FILTER in: the SPEAKER plays the tone.',
        silent: 'Spare FILTER in: the SPEAKER stays silent.',
      },
    },
  ],
  parts: ['MAST', 'CABLE', 'AMPLIFIER', 'FILTER'],
  fault: 'AMPLIFIER',
  keyPart: 3,
  stepText:
    'Planned step: the crew swaps the AMPLIFIER and the FILTER, so the FILTER is part 3 and the AMPLIFIER part 4. The probes stay put. What will they read then?',
  steps: [
    'P1, P2, P3 read TONE',
    'Only P1, P2 read TONE',
    'Only P1 reads TONE',
    'No probe reads TONE',
  ],
  keyStep: 2,
  results: [
    'CASE 1 — MAST RECEIVER',
    'Part at fault: AMPLIFIER · Your recorded part: {part}',
    'P1 read TONE, so the MAST and the CABLE work. P2 read SILENT, so the tone stops at part 3.',
    'The spare FILTER left the SPEAKER silent, so the FILTER is not the part at fault.',
    'After the swap: Only P1, P2 read TONE · Your recorded answer: {step}',
    'The AMPLIFIER becomes part 4, so the tone reaches P1 and P2 but not P3.',
  ],
  sim: (part, letter) => {
    // Rules 1–5: the tone runs MAST(1) → CABLE(2) → AMPLIFIER(3) →
    // FILTER(4) → SPEAKER; a part at fault passes no tone on; a probe after
    // part p reads TONE iff the fault lies after p; the spare FILTER (never
    // at fault) replaces the FILTER for its test.
    const position = ['MAST', 'CABLE', 'AMPLIFIER', 'FILTER'].indexOf(part) + 1;
    const probeAfter = letter === 'A' ? 2 : 3;

    if (letter === 'C') {
      // With the spare FILTER in, the SPEAKER plays iff no fault among
      // parts 1–3, i.e. iff the FILTER was the part at fault.
      return position === 4 ? 'tone' : 'silent';
    }

    return position > probeAfter ? 'tone' : 'silent';
  },
  stepSim: (part) => {
    // After the swap: MAST(1), CABLE(2), FILTER(3), AMPLIFIER(4); the
    // probes stay after positions 2, 3 and 4.
    const position = ['MAST', 'CABLE', 'FILTER', 'AMPLIFIER'].indexOf(part) + 1;
    const reads = [2, 3, 4].map((after) => position > after);

    if (reads[0] && reads[1] && reads[2]) {
      return 'P1, P2, P3 read TONE';
    }

    if (reads[0] && reads[1]) {
      return 'Only P1, P2 read TONE';
    }

    if (reads[0]) {
      return 'Only P1 reads TONE';
    }

    return 'No probe reads TONE';
  },
  // Rules 1–4: the SPEAKER sits after part 4 and plays iff the fault lies
  // after it — so it is silent iff one of parts 1–4 is at fault.
  symptom: (part) => {
    const position =
      ['MAST', 'CABLE', 'AMPLIFIER', 'FILTER'].indexOf(part ?? '') + 1;

    return position >= 1 && position <= 4;
  },
};

const C2: HandCase = {
  id: 'm18_c2',
  index: 2,
  sheet: [
    'COOLING BAY',
    'Air path: FAN ▶ DUCT ▶ RACK. HEATER and GAUGE sit on the RACK.',
    'Now: the FAN is on NORMAL and the GAUGE shows HOT.',
    'Exactly one of FAN, DUCT, GAUGE, HEATER is at fault.',
    'At fault: FAN worn, DUCT blocked, GAUGE faulty, HEATER stuck.',
    '1  The FAN gives 6 units of air on NORMAL and 12 on HIGH.',
    '2  A worn FAN gives only 1 unit, whatever its setting.',
    '3  A blocked DUCT lets no air through to the RACK.',
    "4  The RACK's heat is 3 units in all; with a stuck HEATER, 9 in all.",
    '5  The RACK is COOL if its air is more than its heat; else HOT.',
    '6  The GAUGE shows the RACK. A faulty GAUGE always shows HOT.',
  ],
  tests: [
    {
      id: 'm18_c2_ta',
      letter: 'A',
      button: 'AIR AT FAN  [A]',
      label: 'A  AIR AT FAN',
      lines: {
        air_6: 'Air at the FAN outlet: 6 units.',
        air_1: 'Air at the FAN outlet: 1 unit.',
      },
    },
    {
      id: 'm18_c2_tb',
      letter: 'B',
      button: 'AIR AT RACK  [B]',
      label: 'B  AIR AT RACK',
      lines: {
        air_6: 'Air at the RACK inlet: 6 units.',
        air_1: 'Air at the RACK inlet: 1 unit.',
        air_0: 'Air at the RACK inlet: 0 units.',
      },
    },
    {
      id: 'm18_c2_tc',
      letter: 'C',
      button: 'SPARE GAUGE  [C]',
      label: 'C  SPARE GAUGE',
      lines: {
        hot: 'A spare GAUGE (never at fault) shows HOT.',
        cool: 'A spare GAUGE (never at fault) shows COOL.',
      },
    },
  ],
  parts: ['FAN', 'DUCT', 'GAUGE', 'HEATER'],
  fault: 'HEATER',
  keyPart: 4,
  stepText:
    'Planned step: the crew will set the FAN to HIGH. Any spare is out and nothing else changes. What will the air at the RACK inlet and the GAUGE show then?',
  steps: [
    'AIR 12 · GAUGE COOL',
    'AIR 12 · GAUGE HOT',
    'AIR 1 · GAUGE HOT',
    'AIR 0 · GAUGE HOT',
  ],
  keyStep: 1,
  results: [
    'CASE 2 — COOLING BAY',
    'Part at fault: HEATER · Your recorded part: {part}',
    'Air was 6 at the FAN and 6 at the RACK, so the FAN and the DUCT work.',
    'The spare GAUGE (never at fault) also showed HOT, so the GAUGE is not at fault: the HEATER is stuck.',
    'After HIGH: AIR 12 · GAUGE COOL · Your recorded answer: {step}',
    '12 units of air is more than 9 units of heat, so the RACK becomes COOL.',
  ],
  sim: (part, letter) => {
    const { fan, rack, cool } = c2Physics(part, 'NORMAL');

    if (letter === 'A') {
      return `air_${fan}`;
    }

    if (letter === 'B') {
      return `air_${rack}`;
    }

    // The spare GAUGE (never at fault) shows the RACK.
    return cool ? 'cool' : 'hot';
  },
  stepSim: (part) => {
    const { rack, cool } = c2Physics(part, 'HIGH');
    // The original GAUGE is back (the spare is out): a faulty one shows HOT.
    const gauge = part === 'GAUGE' ? 'HOT' : cool ? 'COOL' : 'HOT';

    return `AIR ${rack} · GAUGE ${gauge}`;
  },
  // On NORMAL the GAUGE shows HOT: a faulty GAUGE, or the RACK HOT.
  symptom: (part) => part === 'GAUGE' || !c2Physics(part, 'NORMAL').cool,
};

/** Rules 1–5 of case 2: the air at the FAN and at the RACK, and the RACK's state. */
function c2Physics(part: string | null, setting: 'NORMAL' | 'HIGH') {
  const fan = part === 'FAN' ? 1 : setting === 'NORMAL' ? 6 : 12;
  const rack = part === 'DUCT' ? 0 : fan;
  const heat = part === 'HEATER' ? 9 : 3;

  return { fan, rack, heat, cool: rack > heat };
}

const C3: HandCase = {
  id: 'm18_c3',
  index: 3,
  sheet: [
    'HATCH WINCH',
    'Chain: SENSOR ▶ LOCK ▶ WINCH. The SENSOR watches the HATCH.',
    'Now: the HATCH looks shut. Started, the WINCH does not move.',
    'Exactly one of HATCH, SENSOR, LOCK, WINCH is at fault.',
    'At fault: HATCH not fully shut, SENSOR never reports SHUT,',
    '          LOCK sends no power, WINCH cannot move.',
    '1  A working SENSOR reports SHUT exactly when the HATCH is fully shut.',
    '2  The SENSOR lamp is lit while the SENSOR reports SHUT.',
    '3  Every LOCK powers the WINCH only while the SENSOR reports SHUT.',
    '4  A FEELER at the seal reads GAP if the HATCH is not fully shut.',
    '5  A spare part is never at fault.',
  ],
  tests: [
    {
      id: 'm18_c3_ta',
      letter: 'A',
      button: 'FEELER AT SEAL  [A]',
      label: 'A  FEELER AT SEAL',
      lines: {
        no_gap: 'The FEELER at the seal reads NO GAP.',
        gap: 'The FEELER at the seal reads GAP.',
      },
    },
    {
      id: 'm18_c3_tb',
      letter: 'B',
      button: 'POWER AT WINCH  [B]',
      label: 'B  POWER AT WINCH',
      lines: {
        none: 'Power at the WINCH: NONE.',
        on: 'Power at the WINCH: ON.',
      },
    },
    {
      id: 'm18_c3_tc',
      letter: 'C',
      button: 'SENSOR LAMP  [C]',
      label: 'C  SENSOR LAMP',
      lines: { off: 'The SENSOR lamp is OFF.', lit: 'The SENSOR lamp is LIT.' },
    },
  ],
  parts: ['HATCH', 'SENSOR', 'LOCK', 'WINCH'],
  fault: 'SENSOR',
  keyPart: 2,
  stepText:
    'Planned step: the crew will fit a spare LOCK and start the WINCH. Nothing else changes. What will the SENSOR lamp and the WINCH do then?',
  steps: [
    'LAMP LIT · WINCH MOVES',
    'LAMP LIT · WINCH STILL',
    'LAMP OFF · WINCH MOVES',
    'LAMP OFF · WINCH STILL',
  ],
  keyStep: 4,
  results: [
    'CASE 3 — HATCH WINCH',
    'Part at fault: SENSOR · Your recorded part: {part}',
    'The FEELER read NO GAP, so the HATCH is fully shut. A working SENSOR would then report SHUT,',
    'but its lamp was OFF: the SENSOR is the part at fault.',
    'After a spare LOCK: LAMP OFF · WINCH STILL · Your recorded answer: {step}',
    'The SENSOR still never reports SHUT, so the spare LOCK sends no power and the WINCH stays still.',
  ],
  sim: (part, letter) => {
    const { shutReported, powered } = c3Physics(part, false);

    if (letter === 'A') {
      return part === 'HATCH' ? 'gap' : 'no_gap';
    }

    if (letter === 'B') {
      return powered ? 'on' : 'none';
    }

    return shutReported ? 'lit' : 'off';
  },
  stepSim: (part) => {
    const { shutReported, powered } = c3Physics(part, true);
    const moves = powered && part !== 'WINCH';

    return `LAMP ${shutReported ? 'LIT' : 'OFF'} · WINCH ${moves ? 'MOVES' : 'STILL'}`;
  },
  // Started, the WINCH does not move.
  symptom: (part) => {
    const { powered } = c3Physics(part, false);

    return !(powered && part !== 'WINCH');
  },
};

/** Rules 1–5 of case 3: whether the SENSOR reports SHUT and whether the LOCK powers the WINCH. */
function c3Physics(part: string | null, spareLock: boolean) {
  const fullyShut = part !== 'HATCH';
  const shutReported = part !== 'SENSOR' && fullyShut;
  const lockWorks = spareLock || part !== 'LOCK';
  // Rule 3 binds EVERY lock, the spare too: power only while SHUT is reported.
  const powered = lockWorks && shutReported;

  return { fullyShut, shutReported, powered };
}

const HAND: HandCase[] = [C1, C2, C3];
const LETTERS: Letter[] = ['A', 'B', 'C'];

/** The preview §5.1 consistent sets and sufficient sets. */
const CONSISTENT_AFTER: Record<M18CaseId, Record<string, string[]>> = {
  m18_c1: {
    A: ['AMPLIFIER', 'FILTER'],
    B: ['MAST', 'CABLE', 'AMPLIFIER'],
    C: ['MAST', 'CABLE', 'AMPLIFIER'],
    AB: ['AMPLIFIER'],
    AC: ['AMPLIFIER'],
    BC: ['MAST', 'CABLE', 'AMPLIFIER'],
    ABC: ['AMPLIFIER'],
  },
  m18_c2: {
    A: ['DUCT', 'GAUGE', 'HEATER'],
    B: ['GAUGE', 'HEATER'],
    C: ['FAN', 'DUCT', 'HEATER'],
    AB: ['GAUGE', 'HEATER'],
    AC: ['DUCT', 'HEATER'],
    BC: ['HEATER'],
    ABC: ['HEATER'],
  },
  m18_c3: {
    A: ['SENSOR', 'LOCK', 'WINCH'],
    B: ['HATCH', 'SENSOR', 'LOCK'],
    C: ['HATCH', 'SENSOR'],
    AB: ['SENSOR', 'LOCK'],
    AC: ['SENSOR'],
    BC: ['HATCH', 'SENSOR'],
    ABC: ['SENSOR'],
  },
};
const SUFFICIENT: Record<M18CaseId, string[]> = {
  m18_c1: ['AB', 'AC', 'ABC'],
  m18_c2: ['BC', 'ABC'],
  m18_c3: ['AC', 'ABC'],
};
/** The preview §5.2 implied-by table (part → step option index). */
const IMPLIED: Record<M18CaseId, Record<string, Idx>> = {
  m18_c1: { MAST: 4, CABLE: 4, AMPLIFIER: 2, FILTER: 3 },
  m18_c2: { FAN: 3, DUCT: 4, GAUGE: 2, HEATER: 1 },
  m18_c3: { HATCH: 4, SENSOR: 4, LOCK: 1, WINCH: 2 },
};
const IMPLIED_BY_NO_PART: Record<M18CaseId, Idx[]> = {
  m18_c1: [1],
  m18_c2: [],
  m18_c3: [3],
};

/** The fixed strings of preview §3.3, transcribed by hand. */
const HAND_TEXT = {
  title: 'DIAGNOSTIC BOARD',
  card: [
    'The storm left three units of the test rig with one part at fault each.',
    'They are three separate cases. You take them one at a time.',
    "In each case, run the board's tests as often as you like, then record the part you think is at fault.",
    'Then answer one question: what will a planned step on that unit show?',
    "A case's tests close when its part is recorded. Each recorded answer is final.",
    'Results come after all three cases.',
  ],
  statusCase: 'Run any tests, then choose the part at fault and record it.',
  statusStep: (part: string) =>
    `Recorded part: ${part}. The tests are closed; the record stays.`,
  statusRecorded: (n: number) => `${n} of 3 cases recorded.`,
  statusResults: 'Your answers are fixed. This view only shows them.',
  statusRecord: (p: number, s: number) =>
    `Parts recorded: ${p} of 3 · planned steps recorded: ${s} of 3.`,
  question: (n: number) =>
    `Which part is at fault in case ${n}? Choose one, then record it.`,
  controls: [
    'RECORD PART  [R]',
    'RECORD ANSWER  [R]',
    'CANNOT SOLVE  [N]',
    'HELP  [H]',
    'LEAVE BOARD',
    'START CASE 1',
    'NEXT CASE',
    'SHOW RESULTS',
    'NEXT',
    'BACK',
    'FINISH',
    'CLOSE HELP  [H]',
    'RECORD PART  [ENTER]',
    'RECORD ANSWER  [ENTER]',
    'RECORD  [ENTER]',
    'KEEP WORKING  [ESC]',
  ],
  choosePart: 'Choose a part first.',
  chooseAnswer: 'Choose an answer first.',
  confirmPart: (part: string, n: number) =>
    `Record ${part} as the part at fault in case ${n}?\nThe tests then close; the test record stays.\nIt cannot be changed afterwards.`,
  confirmCannotSolvePart: (n: number) =>
    `Record CANNOT SOLVE for the part in case ${n}?\nThe tests then close; the test record stays.\nIt cannot be changed afterwards.`,
  confirmAnswer: (answer: string, n: number) =>
    `Record this answer for case ${n}'s planned step?\n${answer}\nIt cannot be changed afterwards.`,
  confirmCannotSolveStep: (n: number) =>
    `Record CANNOT SOLVE for case ${n}'s planned step?\nIt cannot be changed afterwards.`,
  ack: (n: number) => `Case ${n} recorded.`,
  helpTitle: 'HOW THE BOARD WORKS',
  help: [
    'Each case: run any of its tests (A-C) as often as you like; every result stays in the test record.',
    'Then choose the part at fault (1-4) and RECORD PART, or CANNOT SOLVE, and confirm.',
    "Recording the part closes that case's tests; the test record stays on screen.",
    'Then the planned step: choose an answer (1-4) and RECORD ANSWER, or CANNOT SOLVE, and confirm.',
    'Only confirming records an answer. A recorded answer cannot be changed.',
    'Results come after all three cases; FINISH or ESC closes them.',
    'TAB moves focus. ENTER selects the focused control.',
    'Keys: A-C test · 1-4 choose · R record · N cannot solve · H help · ESC leaves (work kept).',
  ],
  resultsTitle: (n: number) => `RESULTS — CASE ${n} OF 3`,
  resultsFirst: 'All three cases are recorded.',
  closedAtReview: 'Station record closed — the board keeps its record.',
  heldBack:
    'This board was already used in this session. Its record is kept; no further answers can be given here.',
  fault: 'The board has a fault and is closed. Recorded answers are kept.',
  footers: [
    'TAB moves focus · ENTER selects · H help · ESC leaves (work kept)',
    'A-C test · 1-4 choose · R record · N cannot solve · TAB focus · H help · ESC leaves (work kept)',
    '1-4 choose · R record · N cannot solve · TAB focus · H help · ESC leaves (work kept)',
    'ENTER records · ESC keeps working',
    'H or ESC closes the help',
    'ESC leaves',
  ],
  notRunYet: 'not run yet',
  notRun: 'not run',
};

/* ------------------------------------------------------------------ *
 * 2. The derivation from the simulators
 * ------------------------------------------------------------------ */

/** The parts consistent with the authored fault's results of the named tests. */
function consistent(hand: HandCase, letters: Letter[]): string[] {
  return hand.parts.filter((part) =>
    letters.every(
      (letter) => hand.sim(part, letter) === hand.sim(hand.fault, letter),
    ),
  );
}

const SUBSETS: Letter[][] = [
  ['A'],
  ['B'],
  ['C'],
  ['A', 'B'],
  ['A', 'C'],
  ['B', 'C'],
  ['A', 'B', 'C'],
];

/**
 * The generic uniqueness checker (the approved row's "ambiguity check
 * rejects"): problems found in a case as a table of results per part and
 * test, the authored fault, the step outcome per part and the option list.
 */
function ambiguity(
  parts: string[],
  table: (part: string, letter: Letter) => string,
  fault: string,
  stepOutcome: (part: string) => string,
  options: string[],
  equalityPairs: [number, number][] = [],
): string[] {
  const problems: string[] = [];
  const consistentWith = (letters: Letter[]) =>
    parts.filter((part) =>
      letters.every((letter) => table(part, letter) === table(fault, letter)),
    );

  if (consistentWith(LETTERS).length !== 1) {
    problems.push('more than one part consistent with all three tests');
  }

  for (const letter of LETTERS) {
    if (consistentWith([letter]).length === 1) {
      problems.push(`test ${letter} alone is sufficient`);
    }
  }

  if (options.filter((option) => option === stepOutcome(fault)).length !== 1) {
    problems.push('two options match the actual outcome');
  }

  for (const [air, heat] of equalityPairs) {
    if (air === heat) {
      problems.push(`a comparison at equality (${air} / ${heat})`);
    }
  }

  return problems;
}

/** Case 2's air-against-heat comparisons (rule 6) under a physics table. */
const c2Pairs = (physics: typeof c2Physics): [number, number][] =>
  C2.parts.flatMap((part) =>
    (['NORMAL', 'HIGH'] as const).map((setting): [number, number] => {
      const { rack, heat } = physics(part, setting);

      return [rack, heat];
    }),
  );

test.describe('M18 oracle — keys derived independently of the implementation', () => {
  test('(i) every table cell, the authored results, exactly one consistent part, both keys and the content module agree', () => {
    for (const hand of HAND) {
      const entry = M18_CASES.find((candidate) => candidate.id === hand.id)!;

      expect(entry).toBeDefined();
      expect(entry.index).toBe(hand.index);
      expect(entry.parts.map((part) => part.name)).toEqual(hand.parts);
      expect(entry.steps.map((step) => step.name)).toEqual(hand.steps);

      for (const part of hand.parts) {
        const partId = entry.parts.find((option) => option.name === part)!.id;

        for (const letter of LETTERS) {
          const testId = hand.tests[LETTERS.indexOf(letter)].id;

          expect(
            entry.fault_table[partId][testId],
            `${hand.id} ${part} ${letter}`,
          ).toBe(hand.sim(part, letter));
        }
      }

      const only = consistent(hand, LETTERS);

      expect(only).toEqual([hand.fault]);
      expect(hand.parts.indexOf(hand.fault) + 1).toBe(hand.keyPart);
      expect(entry.key_part_option_id).toBe(entry.parts[hand.keyPart - 1].id);
      expect(hand.steps.indexOf(hand.stepSim(hand.fault)) + 1).toBe(
        hand.keyStep,
      );
      expect(entry.key_step_option_id).toBe(entry.steps[hand.keyStep - 1].id);

      for (const [at, test] of hand.tests.entries()) {
        const item = entry.tests[at];

        expect(item.id).toBe(test.id);
        expect(item.letter).toBe(test.letter);
        expect(item.button).toBe(test.button);
        expect(item.record_label).toBe(test.label);
        expect({ ...item.lines }).toEqual(test.lines);
        expect([...item.result_ids].sort()).toEqual(
          Object.keys(test.lines).sort(),
        );
      }
    }
  });

  test('(ii) every candidate produces the symptom and a healthy unit does not', () => {
    for (const hand of HAND) {
      for (const part of hand.parts) {
        expect(hand.symptom(part), `${hand.id} ${part}`).toBe(true);
      }

      expect(hand.symptom(null), hand.id).toBe(false);
    }
  });

  test('(iii) no single test is sufficient; the consistent sets and the sufficient sets are those of preview §5.1', () => {
    for (const hand of HAND) {
      for (const subset of SUBSETS) {
        const key = subset.join('');

        expect(consistent(hand, subset), `${hand.id} ${key}`).toEqual(
          CONSISTENT_AFTER[hand.id][key],
        );
      }

      for (const letter of LETTERS) {
        expect(consistent(hand, [letter]).length).toBeGreaterThan(1);
      }

      expect(
        SUBSETS.filter((subset) => consistent(hand, subset).length === 1).map(
          (subset) => subset.join(''),
        ),
      ).toEqual(SUFFICIENT[hand.id]);
    }
  });

  test('(iv) the planned-step options are distinct, exactly one matches the actual case, and the implied-by table equals preview §5.2; the module agrees', () => {
    for (const hand of HAND) {
      const entry = M18_CASES.find((candidate) => candidate.id === hand.id)!;

      expect(new Set(hand.steps).size).toBe(4);
      expect(
        hand.steps.filter((step) => step === hand.stepSim(hand.fault)),
      ).toHaveLength(1);

      const implied: Record<string, Idx> = {};

      for (const part of hand.parts) {
        const outcome = hand.stepSim(part);

        expect(hand.steps, `${hand.id} ${part} outcome listed`).toContain(
          outcome,
        );
        implied[part] = (hand.steps.indexOf(outcome) + 1) as Idx;
      }

      expect(implied).toEqual(IMPLIED[hand.id]);
      expect(
        ([1, 2, 3, 4] as Idx[]).filter(
          (index) => !Object.values(implied).includes(index),
        ),
      ).toEqual(IMPLIED_BY_NO_PART[hand.id]);

      for (const part of hand.parts) {
        const partId = entry.parts.find((option) => option.name === part)!.id;

        expect(entry.implied_step[partId]).toBe(
          entry.steps[implied[part] - 1].id,
        );
      }

      // The wrong parts implying the key: HATCH in case 3 only.
      expect(
        hand.parts.filter(
          (part) => part !== hand.fault && implied[part] === hand.keyStep,
        ),
      ).toEqual(hand.id === 'm18_c3' ? ['HATCH'] : []);
    }
  });

  test('(v) every air / heat comparison of case 2 is at least 2 units apart', () => {
    const margins: number[] = [];

    for (const part of C2.parts) {
      for (const setting of ['NORMAL', 'HIGH'] as const) {
        const { rack, heat } = c2Physics(part, setting);

        margins.push(Math.abs(rack - heat));
      }
    }

    expect(Math.min(...margins)).toBeGreaterThanOrEqual(2);
  });

  test('(vi) part keys at positions 3, 4, 2 and step keys at 2, 1, 4; within each case the two differ', () => {
    expect(HAND.map((hand) => hand.keyPart)).toEqual([3, 4, 2]);
    expect(HAND.map((hand) => hand.keyStep)).toEqual([2, 1, 4]);

    for (const hand of HAND) {
      expect(hand.keyPart).not.toBe(hand.keyStep);
    }
  });

  test('(vii) the shortcut table of preview §5.3 is computed and REPORTED (reproduced, never a ceiling)', () => {
    const expectedKeys = (candidates: (hand: HandCase) => string[]) =>
      HAND.reduce((sum, hand) => {
        const list = candidates(hand);

        return list.length === 0
          ? sum
          : sum +
              list.filter((part) => part === hand.fault).length / list.length;
      }, 0);
    const named = (hand: HandCase, text: string) =>
      hand.parts.filter((part) => new RegExp(`\\b${part}\\b`).test(text));
    const nowLine = (hand: HandCase) => hand.sheet[2];
    const abnormalLines = (hand: HandCase) =>
      hand.tests
        .map((test) => {
          const authored = hand.sim(hand.fault, test.letter);
          const healthyLine = ['tone', 'air_6', 'cool', 'no_gap', 'on', 'lit'];

          return healthyLine.includes(authored) ? '' : test.lines[authored];
        })
        .join(' ');
    const report: Record<string, number> = {
      'always option 1': expectedKeys((hand) => [hand.parts[0]]),
      'always option 2': expectedKeys((hand) => [hand.parts[1]]),
      'always option 3': expectedKeys((hand) => [hand.parts[2]]),
      'always option 4': expectedKeys((hand) => [hand.parts[3]]),
      'a part named in the Now line': expectedKeys((hand) =>
        named(hand, nowLine(hand)),
      ),
      'the part named on test button A': expectedKeys((hand) =>
        named(hand, hand.tests[0].button),
      ),
      'the part named on test button B': expectedKeys((hand) =>
        named(hand, hand.tests[1].button),
      ),
      'the part named on test button C': expectedKeys((hand) =>
        named(hand, hand.tests[2].button),
      ),
      'a part named on no button and not in Now': expectedKeys((hand) =>
        hand.parts.filter(
          (part) =>
            !named(
              hand,
              `${nowLine(hand)} ${hand.tests.map((t) => t.button).join(' ')}`,
            ).includes(part),
        ),
      ),
      'a part named in an abnormal-looking result line': expectedKeys((hand) =>
        named(hand, abnormalLines(hand)),
      ),
      'symptom only (uniform pick)': expectedKeys((hand) => hand.parts),
      'one test only (A) then a uniform pick': expectedKeys((hand) =>
        consistent(hand, ['A']),
      ),
      'one test only (B) then a uniform pick': expectedKeys((hand) =>
        consistent(hand, ['B']),
      ),
      'one test only (C) then a uniform pick': expectedKeys((hand) =>
        consistent(hand, ['C']),
      ),
    };
    const stepKeys = (pick: (hand: HandCase) => string | null) =>
      HAND.filter((hand) => pick(hand) === hand.steps[hand.keyStep - 1]).length;
    const stepReport: Record<string, number> = {
      'the step repairs everything': stepKeys((hand) => hand.steps[0]),
      'nothing changes (the reading before the step)': stepKeys((hand) =>
        hand.id === 'm18_c1'
          ? 'Only P1 reads TONE'
          : hand.id === 'm18_c3'
            ? 'LAMP OFF · WINCH STILL'
            : null,
      ),
      'always option 1': stepKeys((hand) => hand.steps[0]),
      'always option 2': stepKeys((hand) => hand.steps[1]),
      'always option 3': stepKeys((hand) => hand.steps[2]),
      'always option 4': stepKeys((hand) => hand.steps[3]),
    };

    // eslint-disable-next-line no-console
    console.log(
      `[M18 oracle] shortcut strategies (parts, expected keys of 3): ${Object.entries(
        report,
      )
        .map(([name, value]) => `${name} = ${value.toFixed(2)}`)
        .join('; ')}. Planned steps (keys of 3): ${Object.entries(stepReport)
        .map(([name, value]) => `${name} = ${value}`)
        .join('; ')}. Reported, never a ceiling.`,
    );
    // Reproduced against the preview's figures (§5.3).
    expect(report['always option 1']).toBe(0);
    expect(report['always option 2']).toBe(1);
    expect(report['always option 3']).toBe(1);
    expect(report['always option 4']).toBe(1);
    expect(report['a part named in the Now line']).toBe(0);
    expect(report['the part named on test button A']).toBe(0);
    expect(report['the part named on test button B']).toBe(0);
    expect(report['the part named on test button C']).toBe(1);
    expect(report['a part named on no button and not in Now']).toBeCloseTo(
      0.83,
      2,
    );
    expect(report['a part named in an abnormal-looking result line']).toBe(0.5);
    expect(report['symptom only (uniform pick)']).toBe(0.75);

    for (const letter of LETTERS) {
      expect(
        report[`one test only (${letter}) then a uniform pick`],
      ).toBeCloseTo(1.17, 2);
    }

    expect(stepReport['the step repairs everything']).toBe(1);
    expect(stepReport['nothing changes (the reading before the step)']).toBe(1);
    expect(stepReport['always option 1']).toBe(1);
    expect(stepReport['always option 2']).toBe(1);
    expect(stepReport['always option 3']).toBe(0);
    expect(stepReport['always option 4']).toBe(1);
  });

  test('(viii) the uniqueness checker accepts the three genuine cases and rejects mutated ones', () => {
    for (const hand of HAND) {
      expect(
        ambiguity(
          hand.parts,
          hand.sim,
          hand.fault,
          hand.stepSim,
          hand.steps,
          hand.id === 'm18_c2' ? c2Pairs(c2Physics) : [],
        ),
        hand.id,
      ).toEqual([]);
    }

    // Case 1 with tests B and C replaced by copies of A: two consistent parts.
    expect(
      ambiguity(
        C1.parts,
        (part) => C1.sim(part, 'A'),
        C1.fault,
        C1.stepSim,
        C1.steps,
      ),
    ).toContain('more than one part consistent with all three tests');
    // Case 3 with test C replaced by a test naming the fault alone: a single
    // sufficient test.
    expect(
      ambiguity(
        C3.parts,
        (part, letter) =>
          letter === 'C'
            ? part === C3.fault
              ? 'named'
              : 'other'
            : C3.sim(part, letter),
        C3.fault,
        C3.stepSim,
        C3.steps,
      ),
    ).toContain('test C alone is sufficient');
    // Case 3 with two options equal to the actual outcome.
    expect(
      ambiguity(C3.parts, C3.sim, C3.fault, C3.stepSim, [
        C3.steps[0],
        C3.steps[1],
        'LAMP OFF · WINCH STILL',
        C3.steps[3],
      ]),
    ).toContain('two options match the actual outcome');
    // Case 2 with a stuck HEATER giving 12 units of heat: on HIGH the
    // comparison of rule 6 sits at equality (12 / 12).
    expect(
      ambiguity(
        C2.parts,
        C2.sim,
        C2.fault,
        C2.stepSim,
        C2.steps,
        c2Pairs((part, setting) => {
          const physics = c2Physics(part, setting);

          return part === 'HEATER'
            ? { ...physics, heat: 12, cool: physics.rack > 12 }
            : physics;
        }),
      ),
    ).toContain('a comparison at equality (12 / 12)');
  });
});

/* ------------------------------------------------------------------ *
 * 3. The content cross-check and the laboratory scene's handlers
 * ------------------------------------------------------------------ */

test.describe('M18 content cross-check', () => {
  test('every sheet line, test button, record label, result line, option, planned step, confirmation, acknowledgement, help line, results line, closed-record line and footer occurs exactly as transcribed', () => {
    const strings = m18ParticipantStrings();
    const has = (value: string) => expect(strings, value).toContain(value);

    for (const hand of HAND) {
      const entry = M18_CASES.find((candidate) => candidate.id === hand.id)!;

      expect(entry.sheet_lines).toEqual(hand.sheet);
      expect(entry.step_text).toBe(hand.stepText);
      hand.sheet.forEach(has);
      has(hand.stepText);
      has(HAND_TEXT.question(hand.index));

      for (const test of hand.tests) {
        has(test.button);
        has(test.label);
        Object.values(test.lines).forEach(has);
      }

      hand.parts.forEach((part, at) => {
        has(`${part}  [${at + 1}]`);
        has(HAND_TEXT.confirmPart(part, hand.index));
        has(HAND_TEXT.statusStep(part));
      });
      hand.steps.forEach((step, at) => {
        has(`${step}  [${at + 1}]`);
        has(HAND_TEXT.confirmAnswer(step, hand.index));
      });
      has(HAND_TEXT.confirmCannotSolvePart(hand.index));
      has(HAND_TEXT.confirmCannotSolveStep(hand.index));
      has(HAND_TEXT.ack(hand.index));
      has(HAND_TEXT.resultsTitle(hand.index));

      const key = hand.parts[hand.keyPart - 1];
      const step = hand.steps[hand.keyStep - 1];
      const expected = hand.results.map((line) =>
        line.replace('{part}', key).replace('{step}', step),
      );

      expect(m18ResultsLines(entry, key, step)).toEqual(expected);
      expected.forEach(has);
      expect(m18ResultsLines(entry, 'CANNOT SOLVE', 'CANNOT SOLVE')).toEqual(
        hand.results.map((line) =>
          line
            .replace('{part}', 'CANNOT SOLVE')
            .replace('{step}', 'CANNOT SOLVE'),
        ),
      );
    }

    has(HAND_TEXT.title);
    HAND_TEXT.card.forEach(has);
    expect([...M18_TEXT.intro]).toEqual(HAND_TEXT.card);
    has(HAND_TEXT.statusCase);
    has(HAND_TEXT.statusStep('CANNOT SOLVE'));
    has(HAND_TEXT.statusResults);
    HAND_TEXT.controls.forEach(has);
    has(HAND_TEXT.choosePart);
    has(HAND_TEXT.chooseAnswer);
    has(HAND_TEXT.helpTitle);
    HAND_TEXT.help.forEach(has);
    expect([...M18_TEXT.help_lines]).toEqual(HAND_TEXT.help);
    has(HAND_TEXT.resultsFirst);
    has(HAND_TEXT.closedAtReview);
    has(HAND_TEXT.heldBack);
    has(HAND_TEXT.fault);
    HAND_TEXT.footers.forEach(has);
    has(HAND_TEXT.notRunYet);
    has(HAND_TEXT.notRun);

    for (let n = 0; n <= 3; n += 1) {
      has(HAND_TEXT.statusRecorded(n));

      for (let s = 0; s <= n; s += 1) {
        has(HAND_TEXT.statusRecord(n, s));
      }
    }

    // The fixed-line limits of preview §3.1 / §6.
    for (const entry of M18_CASES) {
      expect(entry.sheet_lines.length).toBeLessThanOrEqual(11);
      entry.sheet_lines.forEach((line) =>
        expect(line.length, line).toBeLessThanOrEqual(70),
      );
      entry.tests.forEach((item) => {
        expect(item.button.length).toBeLessThanOrEqual(22);
        expect(item.record_label.length).toBeLessThanOrEqual(22);
        Object.values(item.lines).forEach((line) =>
          expect(line.length, line).toBeLessThanOrEqual(46),
        );
      });
      [...entry.parts, ...entry.steps].forEach((option) =>
        expect(option.label.length, option.label).toBeLessThanOrEqual(28),
      );
    }

    for (const dialog of [
      M18_TEXT.confirm_part('AMPLIFIER', 1),
      M18_TEXT.confirm_cannot_solve_part(1),
      M18_TEXT.confirm_answer('Only P1, P2 read TONE', 1),
      M18_TEXT.confirm_answer('LAMP OFF · WINCH STILL', 3),
      M18_TEXT.confirm_cannot_solve_step(3),
    ]) {
      dialog
        .split('\n')
        .forEach((line) => expect(line.length, line).toBeLessThanOrEqual(52));
    }
  });

  test('the first-opening card and the help sheet name no case and no correctness word', () => {
    for (const line of m18IntroAndHelpStrings()) {
      expect(line).not.toMatch(CORRECTNESS);
      expect(line).not.toMatch(/MAST RECEIVER|COOLING BAY|HATCH WINCH/);
    }
  });

  test('by source, each of the four lab_brief_ack* handlers of the laboratory scene calls presentM18 and still calls presentM15 and presentM16', () => {
    const source = readFileSync(
      'src/scenes/DiagnosticsLaboratoryScene.ts',
      'utf8',
    );
    const handlers = [
      ...source.matchAll(
        /tag: '(lab_brief_ack[a-z_]*)',\s*onSelected: \(\) => \{([\s\S]*?)\n\s{12,16}\},/g,
      ),
    ].map((match) => ({ tag: match[1], body: match[2] }));

    expect(handlers.map((handler) => handler.tag)).toEqual([
      'lab_brief_ack',
      'lab_brief_ack',
      'lab_brief_ack_loan_accept',
      'lab_brief_ack_loan_decline',
    ]);

    for (const handler of handlers) {
      expect(handler.body, handler.tag).toContain(
        "advancePilotStage('lab_work', now)",
      );
      expect(handler.body, handler.tag).toContain('presentM15(now)');
      expect(handler.body, handler.tag).toContain('presentM16(now)');
      expect(handler.body, handler.tag).toContain('presentM18(now)');
    }
  });
});

/* ------------------------------------------------------------------ *
 * 4. The register rows, the route and the legacy module
 * ------------------------------------------------------------------ */

/** SHA-256 of the base blobs (`git show 6e934d6:<path>`, LF). */
const LEGACY_SHA256: Record<string, string> = {
  'src/informationProcessing/m18FaultDiagnosis.ts':
    '844962315f0797218caebbb719e95cf2236ff0aedd1114c83bb3cb55f8f34398',
  'src/informationProcessing/faultForms.ts':
    '51f2859868fd193fec9bd373f3c8664d9d5ba1e729927812ebd2580050f8359f',
  'src/informationProcessing/ui/DiagnosisConsoleScene.ts':
    '2734bfe94608581ec09ff90739965dfa0c0035cb44019dd46c2abae362df4e0a',
  'src/measurement/m18Diagnosis.ts':
    'ab9ed2c1ea5e66af0c6c72f93c42363184fdbf5325e6df062e8f2db8a2355cf9',
};

function sourceFiles(dir: string): string[] {
  const out: string[] = [];

  for (const name of readdirSync(dir)) {
    const path = join(dir, name).replace(/\\/g, '/');

    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (path.endsWith('.ts')) {
      out.push(path);
    }
  }

  return out;
}

test.describe('M18 register rows, route and the legacy module', () => {
  test('M18 is on an explicit v3 route, implemented, with the series opportunity, one window, one family and no secondary id', () => {
    const entry = registerEntry('M18');

    expect(entry.implementation_status).toBe('implemented');
    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([M18_OPPORTUNITY_ID]);
    expect(entry.route.windows).toEqual([
      {
        id: 'm18_cases_w1',
        occasion: null,
        zone: 'diagnostics_laboratory',
        episode: 3,
      },
    ]);
    expect(entry.route.family_prefixes).toEqual([M18_FAMILY]);
    expect(entry.route.secondary_ids).toEqual([]);
    expect(entry.independence.kind).toBe('repeated_within_episode');
    expect(M18_WINDOW_ID).toBe('m18_cases_w1');
    expect(M18_OPPORTUNITY_ID).toBe('proto_m18_cases_series');
    expect(M18_FAMILY).toBe('proto_m18_cases_');
    expect(M18_ENTRY_STATE_VERSION).toBe('m18-cases-v1');
    expect(M18_FORM_ID).toBe('m18-form-1');
    expect(M18_CONTENT_VERSION).toBe('m18-content-v1');
  });

  test('both feature rows are unchanged', () => {
    const entry = registerEntry('M18');

    expect(entry.features).toHaveLength(2);
    expect(entry.features[0]).toMatchObject({
      feature_id: 'm18_correct_first_diagnoses',
      role: 'primary',
      planned_denominator: 3,
      denominator_kind: 'planned_observations',
      range: '0–3',
      numerator:
        'cases whose first committed diagnosis is correct (Cannot solve = incorrect)',
      denominator: 'three cases',
      higher_means: 'stronger sampled diagnostic performance',
      missing_rule: 'no case answered → null',
    });
    expect(entry.features[1]).toMatchObject({
      feature_id: 'm18_correct_consequence_predictions',
      role: 'companion',
      planned_denominator: 3,
      denominator_kind: 'planned_observations',
      range: '0–3',
      numerator:
        'cases whose first committed consequence prediction is correct',
      denominator: 'three cases',
      higher_means: 'companion; never combined with the diagnosis count',
      missing_rule: 'no prediction answered → null',
    });
    expect(entry.coverage_label).toBe('performance_counterpart');
    expect(entry.direction).toBe('extend_occasions');
    expect(entry.target.occasions).toBe(3);
    expect(entry.source).toEqual({
      instrument: 'BESSI',
      item: '182',
      reverse_keyed: false,
    });
    expect(entry.target.summary).toBe(
      'Three independent fault cases with discriminating tests; for each, a first diagnosis and a keyed prediction of one observable consequence before feedback; independent truth key.',
    );
  });

  test('the schedule mirrors the register; primary prefixes stay pairwise disjoint; the cases family is disjoint from every legacy M18 family', () => {
    const scheduled = PILOT_SCHEDULE.find((entry) => entry.item === 'M18')!;

    expect(scheduled.opportunityIds).toEqual([M18_OPPORTUNITY_ID]);
    expect(scheduled.familyPrefixes).toEqual([M18_FAMILY]);
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

    for (const legacy of [
      'proto_m18_fault_',
      'proto_m18_pressure_',
      'proto_m18_evidence_',
      'proto_m18_diagnosis_',
    ]) {
      expect(M18_FAMILY.startsWith(legacy)).toBe(false);
      expect(legacy.startsWith(M18_FAMILY)).toBe(false);
      expect(
        prefixes.some((prefix) => legacy.startsWith(prefix)),
        `${legacy} covered by a primary prefix`,
      ).toBe(false);
    }

    expect(
      REGISTER_V3.filter((entry) =>
        entry.route.family_prefixes.includes(M18_FAMILY),
      ).map((entry) => entry.id),
    ).toEqual(['M18']);
  });

  test('a log containing only legacy proto_m18_fault_* events yields the M18 rows of a log with no M18 evidence', () => {
    const context = {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    };
    const legacy: RawGameEvent[] = [
      'window_opened',
      'panel_viewed',
      'test_run',
      'submitted',
      'completed',
    ].map((suffix, index) => ({
      session_id: 'GS',
      timestamp_ms: 1_000 + index,
      scene: 'information_processing_lab',
      event_type: `proto_m18_fault_${suffix}`,
      object_id: 'ip_diagnosis_console',
      sequence: 10 + index,
      page_load_index: 1,
      metadata: {
        opportunity_id: 'proto_m18_lattice_fault_diagnosis',
        window_id: 'm18_diagnosis_w1',
        measure_id: 'M18',
        entry_state_version: 'm18-fault-v1',
      },
    }));
    const none = extractItemFeatures('M18', [], context);

    expect(none).toHaveLength(2);
    expect(extractItemFeatures('M18', legacy, context)).toEqual(none);
    none.forEach((row) =>
      expect(row).toMatchObject({ disposition: 'not_presented', value: null }),
    );
  });

  test('the laboratory scene no longer imports the legacy module; the series opportunity is declared by exactly one adapter; the legacy files are byte-identical to the base', () => {
    const lab = readFileSync(
      'src/scenes/DiagnosticsLaboratoryScene.ts',
      'utf8',
    );

    expect(lab).not.toContain("informationProcessing/m18FaultDiagnosis'");
    expect(lab).toContain("from '../pilot/windows/m18DiagnosticBoard'");
    expect(lab).toContain("surfaceId: 'm18_diagnostic_board'");
    expect(lab).toContain('closeM18Surface');
    expect(lab).toContain('resumeM18Surface(Date.now())');

    const files = sourceFiles('src');
    const literal = files.filter((file) =>
      readFileSync(file, 'utf8').includes("'proto_m18_cases_series'"),
    );

    expect(literal.sort()).toEqual([
      'src/measurement/registerV3.ts',
      'src/pilot/windows/m18DiagnosisContent.ts',
      'src/scenes/DiagnosticsLaboratoryScene.ts',
    ]);

    const declaring = files.filter((file) => {
      const source = readFileSync(file, 'utf8');

      return (
        source.includes('new ItemWindow(') &&
        source.includes('opportunityId: M18_OPPORTUNITY_ID')
      );
    });

    expect(declaring).toEqual(['src/pilot/windows/m18DiagnosticBoard.ts']);

    for (const [file, sha] of Object.entries(LEGACY_SHA256)) {
      const content = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

      expect(createHash('sha256').update(content).digest('hex'), file).toBe(
        sha,
      );
    }

    const legacy = readFileSync(
      'src/informationProcessing/m18FaultDiagnosis.ts',
      'utf8',
    );

    expect(legacy).toContain(
      "M18F_OPPORTUNITY_ID = 'proto_m18_lattice_fault_diagnosis'",
    );
    expect(legacy).toContain("M18F_ENTRY_STATE_VERSION = 'm18-fault-v1'");
    expect(legacy).not.toContain('proto_m18_cases');
    expect(
      readFileSync('src/scenes/InformationProcessingLabScene.ts', 'utf8'),
    ).toContain('m18FaultDiagnosis');
    expect(readFileSync('src/pilot/windows/reviewClosure.ts', 'utf8')).toMatch(
      /closeM16AtReview\(nowMs\);[\s\S]*closeM18AtReview\(nowMs\);[\s\S]*closeM20ResumeAtReview/,
    );
  });
});

/* ------------------------------------------------------------------ *
 * 5. The series model — harness
 * ------------------------------------------------------------------ */

interface Run {
  s: M18Series;
  events: { suffix: string; metadata: Record<string, unknown> }[];
  sink: M18LogSink;
  now: number;
  tick: (ms: number) => number;
  /** Past the settle of the current view. */
  settle: () => number;
}

function run(): Run {
  const r: Run = {
    s: createM18Series(),
    events: [],
    sink: (suffix, metadata) => {
      r.events.push({ suffix, metadata });
    },
    now: 10_000,
    tick: (ms) => {
      r.now += ms;

      return r.now;
    },
    settle: () => r.tick(M18_SETTLE_MS + 50),
  };

  return r;
}

const suffixes = (r: Run) => r.events.map((event) => event.suffix);
const last = (r: Run, suffix: string) =>
  [...r.events].reverse().find((event) => event.suffix === suffix);
const count = (r: Run, suffix: string) =>
  r.events.filter((event) => event.suffix === suffix).length;

/** Opens the board (the first-opening card). */
function opened(): Run {
  const r = run();

  m18sOpen(r.s, r.now, r.sink);

  return r;
}

/** START CASE 1: case 1 presented. */
function started(): Run {
  const r = opened();

  expect(m18sStartCase1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);

  return r;
}

type Choice = Idx | 'cannot_solve';

function currentCaseId(r: Run): M18CaseId {
  return M18_ASSIGNED_CASE_ORDER[r.s.case];
}

function runTest(
  r: Run,
  letter: Letter,
  mode: 'pointer' | 'keyboard' = 'keyboard',
) {
  const id = `${currentCaseId(r)}_t${letter.toLowerCase()}`;

  return m18sRunTest(r.s, id, mode, r.settle(), r.sink);
}

/** Records the part (slot diagnosis) of the current case: a tile or CANNOT SOLVE. */
function answerPart(
  r: Run,
  choice: Choice,
  mode: 'pointer' | 'keyboard' = 'keyboard',
) {
  const caseId = currentCaseId(r);

  if (choice === 'cannot_solve') {
    expect(
      m18sRequestCommit(r.s, 'cannot_solve', mode, r.settle(), r.sink),
    ).toBe('opened');
  } else {
    expect(
      m18sDraft(r.s, `${caseId}_p${choice}`, mode, r.settle(), r.sink),
    ).toBe(true);
    expect(m18sRequestCommit(r.s, 'option', mode, r.tick(100), r.sink)).toBe(
      'opened',
    );
  }

  expect(m18sConfirmCommit(r.s, mode, r.tick(M18_SETTLE_MS + 1), r.sink)).toBe(
    'recorded',
  );
  expect(r.s.view).toBe('step');
}

/** Records the planned-step answer (slot prediction) of the current case. */
function answerStep(
  r: Run,
  choice: Choice,
  mode: 'pointer' | 'keyboard' = 'keyboard',
) {
  const caseId = currentCaseId(r);

  if (choice === 'cannot_solve') {
    expect(
      m18sRequestCommit(r.s, 'cannot_solve', mode, r.settle(), r.sink),
    ).toBe('opened');
  } else {
    expect(
      m18sDraft(r.s, `${caseId}_s${choice}`, mode, r.settle(), r.sink),
    ).toBe(true);
    expect(m18sRequestCommit(r.s, 'option', mode, r.tick(100), r.sink)).toBe(
      'opened',
    );
  }

  expect(m18sConfirmCommit(r.s, mode, r.tick(M18_SETTLE_MS + 1), r.sink)).toBe(
    'recorded',
  );
  expect(r.s.view).toBe('acknowledgement');
}

/** NEXT CASE / SHOW RESULTS after the acknowledgement has settled. */
function next(r: Run) {
  return m18sNext(r.s, 'keyboard', r.settle(), r.sink);
}

/** [part, step] per case — the keys. */
const KEYS: [Choice, Choice][] = [
  [3, 2],
  [4, 1],
  [2, 4],
];
/** [part, step] per case — all wrong. */
const WRONG: [Choice, Choice][] = [
  [1, 4],
  [2, 3],
  [3, 2],
];

/** A whole series from case 1: tests, part and step per case; SHOW RESULTS optionally. */
function completeSeries(
  r: Run,
  answers: [Choice, Choice][],
  options: { showResults?: boolean; tests?: Letter[][] } = {},
) {
  answers.forEach(([part, step], index) => {
    for (const letter of options.tests?.[index] ?? []) {
      expect(runTest(r, letter)).toBe('run');
    }

    answerPart(r, part);
    answerStep(r, step);

    if (index < answers.length - 1) {
      expect(next(r)).toBe('case_presented');
    }
  });

  if (options.showResults) {
    expect(next(r)).toBe('results_shown');
  }
}

/** Renders the surface model from a series with no-op commands. */
function render(s: M18Series) {
  const host: M18SurfaceHost = {
    now: () => 0,
    close: () => undefined,
    feedback: () => undefined,
    series: () => s,
    commands: {
      startCase1: () => false,
      runTest: () => 'none',
      draft: () => false,
      request: () => 'none',
      cancel: () => false,
      confirm: () => 'none',
      finish: () => false,
      next: () => 'none',
      navigateResults: () => false,
      help: () => false,
      closeHelp: () => false,
    },
  };
  const model = m18SurfaceModel(host);
  const text = [
    model.title,
    model.subtitle ?? '',
    model.status ?? '',
    model.help ?? '',
    ...model.elements.map((element) => element.label),
  ].join('\n');

  return { model, text, ids: model.elements.map((element) => element.id) };
}

const CORRECTNESS =
  /\bcorrect|incorrect|\bright\b|\bwrong\b|part at fault:|your recorded/i;
const FORBIDDEN =
  /proto_|secondary_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|puzzle|persist|grit|skill|ability|intelligen|information|process|learn|quick|\bnew\b|complex|make sense|handle|\bROUTE\b|fragment|destination|ARCHIVE|RELAY|ALPHA|BETA|codebook|channel|program|buffer|SUBMIT|logical|solution|problem|\bfind\b/i;
const SOLVE_OUTSIDE_CANNOT = /(?<!cannot )solve/i;

/* ------------------------------------------------------------------ *
 * 6. The series model — no correctness information before the sixth
 * ------------------------------------------------------------------ */

test.describe('M18 series model — no correctness information before the sixth first response', () => {
  test('at the card, in every case before and after tests, in every step and after a key, a wrong part, CANNOT SOLVE, a wrong answer and a step CANNOT SOLVE nothing on the surface says anything about correctness or offers results', () => {
    const states: M18Series[] = [];
    const r = opened();

    states.push(structuredClone(r.s));
    expect(m18sStartCase1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    states.push(structuredClone(r.s));
    expect(runTest(r, 'A')).toBe('run');
    expect(runTest(r, 'B')).toBe('run');
    states.push(structuredClone(r.s));
    answerPart(r, 3); // the key
    states.push(structuredClone(r.s));
    answerStep(r, 2); // the key
    states.push(structuredClone(r.s));
    expect(next(r)).toBe('case_presented');
    expect(runTest(r, 'C')).toBe('run');
    answerPart(r, 1); // wrong
    states.push(structuredClone(r.s));
    answerStep(r, 3); // wrong
    states.push(structuredClone(r.s));
    expect(next(r)).toBe('case_presented');
    answerPart(r, 'cannot_solve');
    states.push(structuredClone(r.s));
    answerStep(r, 'cannot_solve');
    states.push(structuredClone(r.s));

    for (const [index, state] of states.entries()) {
      const { text, ids } = render(state);

      expect(text, `state ${index}`).not.toMatch(CORRECTNESS);
      expect(text, `state ${index}`).not.toMatch(FORBIDDEN);
      expect(ids.filter((id) => id.startsWith('results_'))).toEqual([]);
      expect(ids).not.toContain('finish');
    }

    // The sixth response completed the series; the acknowledgement still
    // carries no correctness information.
    expect(r.s.status).toBe('completed');
    expect(count(r, 'results_shown')).toBe(0);
  });

  test('the acknowledgement line, status and controls are identical after the key, a wrong answer and CANNOT SOLVE; the step status echo is identical in form for every part', () => {
    const ack = (part: Choice, step: Choice) => {
      const r = started();

      answerPart(r, part);
      answerStep(r, step);

      const { model, ids } = render(r.s);

      return {
        ids,
        text: [
          model.title,
          model.subtitle,
          model.status,
          model.help,
          ...model.elements
            .filter(
              (element) =>
                ![
                  'sheet',
                  'test_a',
                  'test_b',
                  'test_c',
                  'result_a',
                  'result_b',
                  'result_c',
                ].includes(element.id),
            )
            .map(
              (element) =>
                `${element.id}:${element.label}:${element.state ?? ''}`,
            ),
        ].join('\n'),
        event: last(r, 'response_acknowledged')?.metadata,
      };
    };
    const key = ack(3, 2);
    const wrong = ack(1, 4);
    const cannot = ack('cannot_solve', 'cannot_solve');

    expect(wrong.text).toBe(key.text);
    expect(cannot.text).toBe(key.text);
    expect(key.ids).toEqual([
      'acknowledgement',
      'next',
      'sheet',
      'test_a',
      'result_a',
      'test_b',
      'result_b',
      'test_c',
      'result_c',
      'help',
      'leave',
    ]);
    expect(key.text).toContain('Case 1 recorded.');
    expect(key.text).toContain('NEXT CASE');
    expect(key.text).toContain('1 of 3 cases recorded.');

    for (const outcome of [key, wrong, cannot]) {
      expect(outcome.event).toMatchObject({
        line_id: M18_ACK_LINE_ID,
        next_control: 'next_case',
        cases_recorded: 1,
      });
      expect(Object.keys(outcome.event!).sort()).toEqual(
        Object.keys(key.event!).sort(),
      );
    }

    // The step view's status line echoes the recorded part in one form.
    for (const part of [1, 2, 3, 4, 'cannot_solve'] as Choice[]) {
      const r = started();

      answerPart(r, part);

      const name =
        part === 'cannot_solve' ? 'CANNOT SOLVE' : C1.parts[part - 1];
      const { model, ids } = render(r.s);

      expect(model.status).toBe(
        `Recorded part: ${name}. The tests are closed; the record stays.`,
      );
      expect(ids).toEqual([
        'step_text',
        'answer_1',
        'answer_2',
        'answer_3',
        'answer_4',
        'record_answer',
        'cannot_solve',
        'sheet',
        'test_a',
        'result_a',
        'test_b',
        'result_b',
        'test_c',
        'result_c',
        'help',
        'leave',
      ]);
    }
  });

  test('a results request is refused before the sixth answer and writes no results_shown; a review-closed partial series never exposes results', () => {
    const r = started();

    answerPart(r, 3);
    answerStep(r, 2);
    expect(
      m18sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(m18sFinish(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    expect(next(r)).toBe('case_presented');
    expect(count(r, 'results_shown')).toBe(0);
    expect(render(r.s).ids).not.toContain('results_text');
    answerPart(r, 4);
    answerStep(r, 1);
    expect(next(r)).toBe('case_presented');
    answerPart(r, 2);
    expect(
      m18sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(count(r, 'results_shown')).toBe(0);
    // Closed at the review with three parts and two steps: a closed record.
    expect(m18sCloseAtReview(r.s, r.tick(10), r.sink)).toBe(true);
    m18sLeave(r.s, r.tick(10), r.sink);
    expect(m18sOpen(r.s, r.tick(10), r.sink)).toBe('record');

    const { text, ids } = render(r.s);

    expect(ids).toEqual(['record_text', 'leave']);
    expect(text).toContain(HAND_TEXT.closedAtReview);
    expect(text).toContain(
      'Parts recorded: 3 of 3 · planned steps recorded: 2 of 3.',
    );
    expect(text).not.toMatch(CORRECTNESS);
    expect(
      m18sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(m18sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    expect(count(r, 'results_shown')).toBe(0);
  });

  test('results follow only the sixth first response: page 1 → NEXT → 2 → NEXT → 3 → BACK → 2; FINISH and ESC close from any page; results_shown once per displayed page; HELP / CLOSE HELP restore the page; reopening shows page 1 read-only', () => {
    const r = started();

    completeSeries(r, KEYS, { showResults: true });
    expect(r.s.status).toBe('completed');
    expect(count(r, 'first_responses_completed')).toBe(1);
    expect(count(r, 'results_shown')).toBe(1);
    expect(last(r, 'results_shown')?.metadata).toMatchObject({
      page: 1,
      case_id: 'm18_c1',
      phase: 'feedback',
    });

    let view = render(r.s);

    expect(view.model.title).toBe('RESULTS — CASE 1 OF 3');
    expect(view.ids).toEqual([
      'results_text',
      'help',
      'finish',
      'results_next_1',
    ]);
    expect(view.text).toContain('All three cases are recorded.');
    expect(view.text).toContain(
      'Part at fault: AMPLIFIER · Your recorded part: AMPLIFIER',
    );
    expect(view.text).toContain(
      'After the swap: Only P1, P2 read TONE · Your recorded answer: Only P1, P2 read TONE',
    );
    expect(view.text).not.toMatch(FORBIDDEN);
    // A carried press inside the settle changes nothing.
    expect(
      m18sResultsNavigate(r.s, 'next', 'keyboard', r.tick(100), r.sink),
    ).toBe(false);
    expect(last(r, 'press_refused')?.metadata).toMatchObject({
      target: 'view',
      reason: 'settling',
      control: 'results_next',
    });
    expect(
      m18sResultsNavigate(r.s, 'back', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(
      m18sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(r.s.results_page).toBe(2);
    expect(count(r, 'results_shown')).toBe(2);
    view = render(r.s);
    expect(view.model.title).toBe('RESULTS — CASE 2 OF 3');
    expect(view.ids).toEqual([
      'results_text',
      'help',
      'finish',
      'results_back_2',
      'results_next_2',
    ]);
    expect(view.text).not.toContain('All three cases are recorded.');
    expect(view.text).toContain(
      'Part at fault: HEATER · Your recorded part: HEATER',
    );
    expect(
      m18sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(r.s.results_page).toBe(3);
    view = render(r.s);
    expect(view.model.title).toBe('RESULTS — CASE 3 OF 3');
    expect(view.ids).toEqual([
      'results_text',
      'help',
      'finish',
      'results_back_3',
    ]);
    expect(
      m18sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(false);
    expect(
      m18sResultsNavigate(r.s, 'back', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(r.s.results_page).toBe(2);
    expect(count(r, 'results_shown')).toBe(3);
    // HELP over page 2 and back.
    expect(m18sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')?.metadata).toMatchObject({
      phase: 'feedback',
      view: 'results_2',
    });
    expect(render(r.s).ids).toEqual(['close_help', 'help_text']);
    expect(m18sCloseHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m18sCloseHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(render(r.s).model.title).toBe('RESULTS — CASE 2 OF 3');
    expect(count(r, 'results_shown')).toBe(3);
    // FINISH only after the settle; the results close through the leave path.
    expect(m18sFinish(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m18sFinish(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    m18sLeave(r.s, r.tick(10), r.sink);
    expect(last(r, 'panel_left')?.metadata).toMatchObject({ view: 'results' });
    // Reopen: page 1 read-only, no new results_shown, nothing recorded.
    expect(m18sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(r.s.results_page).toBe(1);
    expect(count(r, 'results_shown')).toBe(3);
    expect(m18sDraft(r.s, 'm18_c1_p1', 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(
      m18sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(runTest(r, 'A')).toBe('none');
    expect(count(r, 'first_response')).toBe(6);
    // FINISH from page 1 leaves pages 2 and 3 as they were.
    expect(m18sFinish(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    m18sLeave(r.s, r.tick(10), r.sink);
    expect(r.s.results_shown).toEqual({ 1: true, 2: true, 3: true });
  });
});

/* ------------------------------------------------------------------ *
 * 7. The series model — order, tests, immutability, commitment
 * ------------------------------------------------------------------ */

test.describe('M18 series model — order, tests, immutability, commitment', () => {
  test('card → case 1 → step → … → case 3 → results; tests deterministic, repeatable, logged with their run index; a same-test repeat inside 400 ms refused; tests closed after the part; the step never visible before the part; fixed order; case k only after case k − 1 planned-step answer', () => {
    const r = opened();

    expect(render(r.s).ids).toEqual([
      'intro_text',
      'start_case',
      'help',
      'leave',
    ]);
    expect(m18sRunTest(r.s, 'm18_c1_ta', 'keyboard', r.now, r.sink)).toBe(
      'none',
    );
    expect(m18sStartCase1(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(last(r, 'press_refused')?.metadata).toMatchObject({
      target: 'view',
      reason: 'settling',
      control: 'start_case_1',
    });
    expect(m18sStartCase1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(suffixes(r)).toEqual([
      'press_refused',
      'intro_acknowledged',
      'case_presented',
    ]);
    expect(last(r, 'case_presented')?.metadata).toMatchObject({
      case_id: 'm18_c1',
      case_index: 1,
      assigned_position: 1,
      realised_position: 1,
      test_ids: ['m18_c1_ta', 'm18_c1_tb', 'm18_c1_tc'],
      part_option_ids: ['m18_c1_p1', 'm18_c1_p2', 'm18_c1_p3', 'm18_c1_p4'],
      phase: 'measurement',
      form_id: 'm18-form-1',
      content_version: 'm18-content-v1',
    });

    let view = render(r.s);

    expect(view.ids).toEqual([
      'question',
      'sheet',
      'test_a',
      'result_a',
      'test_b',
      'result_b',
      'test_c',
      'result_c',
      'part_1',
      'part_2',
      'part_3',
      'part_4',
      'record_part',
      'cannot_solve',
      'help',
      'leave',
    ]);
    expect(view.model.subtitle).toBe('Case 1 of 3');
    expect(view.text).toContain('not run yet');
    expect(view.text).not.toContain('Planned step');
    expect(view.text).not.toContain('not run\n');
    // Tests: A, then A again inside 400 ms (refused), A again later (repeat).
    expect(m18sRunTest(r.s, 'm18_c1_ta', 'keyboard', r.tick(100), r.sink)).toBe(
      'refused',
    );
    expect(last(r, 'press_refused')?.metadata).toMatchObject({
      target: 'view',
      reason: 'settling',
      control: 'test',
    });
    expect(runTest(r, 'A')).toBe('run');
    expect(last(r, 'test_run')?.metadata).toMatchObject({
      test_id: 'm18_c1_ta',
      result_id: 'tone',
      run_index: 1,
      case_test_runs: 1,
      repeat: false,
      input_mode: 'keyboard',
    });
    expect(m18sRunTest(r.s, 'm18_c1_ta', 'keyboard', r.tick(200), r.sink)).toBe(
      'refused',
    );
    expect(last(r, 'press_refused')?.metadata).toMatchObject({
      target: 'test',
      reason: 'repeat_within_settle',
      test_id: 'm18_c1_ta',
    });
    expect(count(r, 'test_run')).toBe(1);
    expect(m18sRunTest(r.s, 'm18_c1_tb', 'keyboard', r.tick(50), r.sink)).toBe(
      'run',
    );
    expect(runTest(r, 'A')).toBe('run');
    expect(last(r, 'test_run')?.metadata).toMatchObject({
      test_id: 'm18_c1_ta',
      result_id: 'tone',
      run_index: 2,
      case_test_runs: 3,
      repeat: true,
    });
    // A test of another case does nothing.
    expect(m18sRunTest(r.s, 'm18_c2_ta', 'keyboard', r.settle(), r.sink)).toBe(
      'none',
    );
    view = render(r.s);
    expect(view.text).toContain('P1 reads TONE.');
    expect(view.text).toContain('P2 reads SILENT.');
    expect(view.text).toContain('not run yet');
    answerPart(r, 3);
    expect(suffixes(r).slice(-3)).toEqual([
      'first_response',
      'tests_closed',
      'step_presented',
    ]);
    expect(last(r, 'tests_closed')?.metadata).toMatchObject({
      tests_run: ['m18_c1_ta', 'm18_c1_tb'],
      test_runs: 3,
    });
    expect(last(r, 'step_presented')?.metadata).toMatchObject({
      step_option_ids: ['m18_c1_s1', 'm18_c1_s2', 'm18_c1_s3', 'm18_c1_s4'],
    });
    expect(last(r, 'first_response')?.metadata).toMatchObject({
      slot: 'diagnosis',
      tests_run_before: ['m18_c1_ta', 'm18_c1_tb'],
      test_runs_before: 3,
      drafts_before: 1,
    });
    // The tests are closed: a test command does nothing and writes nothing.
    const before = r.events.length;

    expect(runTest(r, 'C')).toBe('none');
    expect(r.events.length).toBe(before);
    view = render(r.s);
    expect(view.text).toContain('Planned step: the crew swaps');
    expect(view.text).toContain('C  SPARE FILTER');
    expect(view.text).toContain('not run');
    expect(view.text).not.toContain('not run yet');
    expect(
      view.model.elements.find((e) => e.id === 'test_a')?.onActivate,
    ).toBeUndefined();
    // No next case before the step answer.
    expect(next(r)).toBe('none');
    answerStep(r, 2);
    expect(last(r, 'first_response')?.metadata).toMatchObject({
      slot: 'prediction',
      option_id: 'm18_c1_s2',
      correct: true,
      key_option_id: 'm18_c1_s2',
      tests_run_before: ['m18_c1_ta', 'm18_c1_tb'],
    });
    expect(m18sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(next(r)).toBe('case_presented');
    expect(last(r, 'case_presented')?.metadata).toMatchObject({
      case_id: 'm18_c2',
      assigned_position: 2,
      realised_position: 2,
    });
    expect(render(r.s).text).not.toContain('MAST RECEIVER');
    answerPart(r, 'cannot_solve');
    answerStep(r, 1);
    expect(next(r)).toBe('case_presented');
    expect(currentCaseId(r)).toBe('m18_c3');
    answerPart(r, 4);
    answerStep(r, 'cannot_solve');
    expect(r.s.status).toBe('completed');
    expect(count(r, 'case_presented')).toBe(3);
    expect(count(r, 'first_response')).toBe(6);
    expect(last(r, 'first_responses_completed')?.metadata).toMatchObject({
      closure_reason: 'completed',
      cases_planned: 3,
      cases_presented: 3,
      parts_recorded: 3,
      steps_recorded: 3,
      correct_first_diagnoses: 1,
      correct_consequence_predictions: 2,
      cannot_solve_parts: 1,
      cannot_solve_steps: 1,
    });
    expect(render(r.s).text).toContain('SHOW RESULTS');
    expect(next(r)).toBe('results_shown');
  });

  test('a first response is written once: a doubled confirmation, a second RECORD, CANNOT SOLVE after an answer and an answer after CANNOT SOLVE never create a second one', () => {
    const r = started();

    expect(m18sDraft(r.s, 'm18_c1_p3', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m18sRequestCommit(r.s, 'option', 'keyboard', r.tick(50), r.sink),
    ).toBe('opened');
    expect(
      m18sConfirmCommit(r.s, 'keyboard', r.tick(M18_SETTLE_MS + 1), r.sink),
    ).toBe('recorded');
    expect(m18sConfirmCommit(r.s, 'keyboard', r.tick(10), r.sink)).toBe('none');
    expect(
      m18sRequestCommit(r.s, 'cannot_solve', 'keyboard', r.settle(), r.sink),
    ).toBe('opened');
    // The step's CANNOT SOLVE opens a step dialog; its confirm records the
    // step, not a second part.
    expect(
      m18sConfirmCommit(r.s, 'keyboard', r.tick(M18_SETTLE_MS + 1), r.sink),
    ).toBe('recorded');
    expect(
      r.events
        .filter((e) => e.suffix === 'first_response')
        .map((e) => e.metadata.slot),
    ).toEqual(['diagnosis', 'prediction']);
    expect(
      m18sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(
      m18sRequestCommit(r.s, 'cannot_solve', 'keyboard', r.settle(), r.sink),
    ).toBe('none');
    expect(m18sDraft(r.s, 'm18_c1_s1', 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(count(r, 'first_response')).toBe(2);

    // CANNOT SOLVE part, then an answer attempt on the part: refused.
    const q = started();

    answerPart(q, 'cannot_solve');
    expect(m18sDraft(q.s, 'm18_c1_p2', 'keyboard', q.settle(), q.sink)).toBe(
      false,
    );
    expect(count(q, 'first_response')).toBe(1);
    expect(last(q, 'first_response')?.metadata).toMatchObject({
      response_kind: 'cannot_solve',
      option_id: null,
      correct: false,
      key_option_id: 'm18_c1_p3',
    });
  });

  test('the fresh-press rule on both confirmations: a press inside 400 ms is refused and recorded once per dialog, the count carried on the record; a cancelled confirmation leaves no record; RECORD without a draft; the opener / confirm distinction', () => {
    const r = started();

    expect(
      m18sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('no_draft');
    expect(last(r, 'commit_without_draft')?.metadata).toMatchObject({
      slot: 'diagnosis',
    });
    expect(count(r, 'commit_requested')).toBe(0);
    expect(m18sDraft(r.s, 'm18_c1_p1', 'pointer', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m18sRequestCommit(r.s, 'option', 'pointer', r.tick(50), r.sink),
    ).toBe('opened');
    // The opener's second click lands inside the dialog's 400 ms: a second
    // request finds the dialog and does nothing; a confirm is refused.
    expect(
      m18sRequestCommit(r.s, 'option', 'pointer', r.tick(60), r.sink),
    ).toBe('none');
    expect(m18sConfirmCommit(r.s, 'pointer', r.tick(100), r.sink)).toBe(
      'refused',
    );
    expect(m18sConfirmCommit(r.s, 'pointer', r.tick(100), r.sink)).toBe(
      'refused',
    );
    expect(count(r, 'commit_press_refused')).toBe(1);
    expect(last(r, 'commit_press_refused')?.metadata).toMatchObject({
      slot: 'diagnosis',
      kind: 'option',
      reason: 'dialog_settling',
      settle_ms: 400,
    });
    expect(count(r, 'first_response')).toBe(0);
    // KEEP WORKING inside the settle is ignored; after it the dialog closes.
    expect(m18sCancelCommit(r.s, 'pointer', r.tick(50), r.sink)).toBe(false);
    expect(
      m18sCancelCommit(r.s, 'pointer', r.tick(M18_SETTLE_MS), r.sink),
    ).toBe(true);
    expect(last(r, 'commit_cancelled')?.metadata).toMatchObject({
      slot: 'diagnosis',
      kind: 'option',
      option_id: 'm18_c1_p1',
      reason: 'keep_working',
      refused_presses: 2,
    });
    expect(count(r, 'first_response')).toBe(0);
    expect(r.s.cases[0].diagnosis.draft).toBe('m18_c1_p1');
    // A fresh confirm records exactly one; a duplicate press right after
    // lands on the step view inside its settle and changes nothing.
    expect(
      m18sRequestCommit(r.s, 'option', 'pointer', r.settle(), r.sink),
    ).toBe('opened');
    expect(
      m18sConfirmCommit(r.s, 'pointer', r.tick(M18_SETTLE_MS + 1), r.sink),
    ).toBe('recorded');
    expect(m18sConfirmCommit(r.s, 'pointer', r.tick(5), r.sink)).toBe('none');
    expect(m18sDraft(r.s, 'm18_c1_s1', 'pointer', r.tick(5), r.sink)).toBe(
      false,
    );
    expect(count(r, 'first_response')).toBe(1);
    expect(last(r, 'first_response')?.metadata).toMatchObject({
      refused_presses: 0,
      input_mode: 'pointer',
      draft_at_commit: 'm18_c1_p1',
    });
    // The step: RECORD ANSWER without a draft; the dialog's refused press.
    expect(
      m18sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('no_draft');
    expect(last(r, 'commit_without_draft')?.metadata).toMatchObject({
      slot: 'prediction',
    });
    expect(
      m18sRequestCommit(r.s, 'cannot_solve', 'keyboard', r.settle(), r.sink),
    ).toBe('opened');
    expect(m18sConfirmCommit(r.s, 'keyboard', r.tick(100), r.sink)).toBe(
      'refused',
    );
    expect(
      m18sConfirmCommit(r.s, 'keyboard', r.tick(M18_SETTLE_MS), r.sink),
    ).toBe('recorded');
    expect(last(r, 'first_response')?.metadata).toMatchObject({
      slot: 'prediction',
      response_kind: 'cannot_solve',
      refused_presses: 1,
    });
    // The dialog view: only the header, the status and the dialog.
    const q = started();

    expect(m18sDraft(q.s, 'm18_c1_p2', 'keyboard', q.settle(), q.sink)).toBe(
      true,
    );
    expect(
      m18sRequestCommit(q.s, 'option', 'keyboard', q.tick(50), q.sink),
    ).toBe('opened');

    const dialog = render(q.s);

    expect(dialog.ids).toEqual(['confirm', 'keep_working', 'dialog_text']);
    expect(dialog.text).toContain(
      'Record CABLE as the part at fault in case 1?',
    );
    expect(dialog.text).toContain('RECORD PART  [ENTER]');
    expect(dialog.model.help).toBe('ENTER records · ESC keeps working');

    const confirm = dialog.model.elements.find((e) => e.id === 'confirm')!;
    const keep = dialog.model.elements.find((e) => e.id === 'keep_working')!;

    expect(confirm.x + confirm.w).toBeLessThanOrEqual(738);
    expect(keep.x + keep.w).toBeLessThanOrEqual(738);
    expect(m18sHelp(q.s, 'keyboard', q.settle(), q.sink)).toBe(false);
    expect(runTest(q, 'A')).toBe('none');
    expect(m18sDraft(q.s, 'm18_c1_p1', 'keyboard', q.settle(), q.sink)).toBe(
      false,
    );
  });

  test('the settle on every view transition: a press inside 400 ms of START CASE 1, a case view, a step view, the acknowledgement, NEXT CASE, SHOW RESULTS, the results NEXT / BACK / FINISH / HELP, HELP and CLOSE HELP changes nothing and is recorded; a later one acts', () => {
    const r = opened();

    expect(m18sHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m18sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m18sCloseHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m18sCloseHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m18sStartCase1(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m18sStartCase1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    // The case's first view.
    expect(m18sDraft(r.s, 'm18_c1_p3', 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    expect(m18sRunTest(r.s, 'm18_c1_ta', 'keyboard', r.tick(50), r.sink)).toBe(
      'refused',
    );
    expect(
      m18sRequestCommit(r.s, 'cannot_solve', 'keyboard', r.tick(50), r.sink),
    ).toBe('none');
    expect(count(r, 'option_drafted')).toBe(0);
    expect(count(r, 'test_run')).toBe(0);
    expect(count(r, 'commit_requested')).toBe(0);
    answerPart(r, 3);
    // The step's first view.
    expect(m18sDraft(r.s, 'm18_c1_s2', 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    expect(m18sHelp(r.s, 'keyboard', r.tick(50), r.sink)).toBe(false);
    answerStep(r, 2);
    // The acknowledgement.
    expect(m18sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(m18sHelp(r.s, 'keyboard', r.tick(50), r.sink)).toBe(false);
    expect(next(r)).toBe('case_presented');
    // NEXT CASE: the new case settles.
    expect(m18sDraft(r.s, 'm18_c2_p4', 'keyboard', r.tick(100), r.sink)).toBe(
      false,
    );
    completeSeries(r, KEYS.slice(1), { showResults: true });
    // SHOW RESULTS: page 1 settles.
    expect(m18sFinish(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m18sHelp(r.s, 'keyboard', r.tick(50), r.sink)).toBe(false);
    expect(
      m18sResultsNavigate(r.s, 'next', 'keyboard', r.tick(50), r.sink),
    ).toBe(false);
    expect(
      m18sResultsNavigate(r.s, 'next', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(
      m18sResultsNavigate(r.s, 'back', 'keyboard', r.tick(50), r.sink),
    ).toBe(false);
    expect(
      m18sResultsNavigate(r.s, 'back', 'keyboard', r.settle(), r.sink),
    ).toBe(true);
    expect(m18sHelp(r.s, 'keyboard', r.tick(50), r.sink)).toBe(false);
    expect(m18sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m18sCloseHelp(r.s, 'keyboard', r.tick(50), r.sink)).toBe(false);
    expect(m18sCloseHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m18sFinish(r.s, 'keyboard', r.tick(50), r.sink)).toBe(false);
    expect(m18sFinish(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);

    const refused = r.events.filter(
      (e) => e.suffix === 'press_refused' && e.metadata.reason === 'settling',
    );

    expect(refused.length).toBeGreaterThanOrEqual(16);
    expect(new Set(refused.map((e) => e.metadata.control))).toEqual(
      new Set([
        'help',
        'close_help',
        'start_case_1',
        'draft',
        'test',
        'cannot_solve',
        'next',
        'finish',
        'results_next',
        'results_back',
      ]),
    );
    expect(count(r, 'results_shown')).toBe(2);
    expect(count(r, 'first_response')).toBe(6);
  });

  test('help is refused during a dialog and recorded with the phase and the view; the per-slot help counts travel on the responses; leaving in a dialog cancels it with no response', () => {
    const r = opened();

    expect(m18sHelp(r.s, 'pointer', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')?.metadata).toMatchObject({
      phase: 'intro',
      view: 'intro',
      input_mode: 'pointer',
    });
    expect(render(r.s).ids).toEqual(['close_help', 'help_text']);
    expect(render(r.s).text).toContain('HOW THE BOARD WORKS');
    expect(m18sCloseHelp(r.s, 'pointer', r.settle(), r.sink)).toBe(true);
    expect(m18sStartCase1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m18sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')?.metadata).toMatchObject({
      phase: 'measurement',
      view: 'case_1',
      case_id: 'm18_c1',
    });
    expect(m18sCloseHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    answerPart(r, 3);
    expect(last(r, 'first_response')?.metadata).toMatchObject({
      help_consults_before: 1,
    });
    expect(m18sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')?.metadata).toMatchObject({
      view: 'step_1',
    });
    expect(m18sCloseHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m18sDraft(r.s, 'm18_c1_s3', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m18sRequestCommit(r.s, 'option', 'keyboard', r.tick(50), r.sink),
    ).toBe('opened');
    expect(m18sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    // Leaving in the dialog cancels it; nothing recorded; the draft kept.
    m18sLeave(r.s, r.tick(10), r.sink);
    expect(last(r, 'commit_cancelled')?.metadata).toMatchObject({
      slot: 'prediction',
      reason: 'panel_left',
    });
    expect(count(r, 'first_response')).toBe(1);
    expect(m18sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(r.s.pending_commit).toBeNull();
    expect(r.s.cases[0].prediction.draft).toBe('m18_c1_s3');
    expect(
      m18sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('opened');
    expect(
      m18sConfirmCommit(r.s, 'keyboard', r.tick(M18_SETTLE_MS + 1), r.sink),
    ).toBe('recorded');
    expect(last(r, 'first_response')?.metadata).toMatchObject({
      slot: 'prediction',
      option_id: 'm18_c1_s3',
      help_consults_before: 1,
      drafts_before: 1,
    });
    expect(m18sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')?.metadata).toMatchObject({
      view: 'ack_1',
    });
    expect(r.s.help_consults).toEqual({
      intro: 1,
      measurement: 3,
      feedback: 0,
      closure: 0,
    });
  });

  test('leaving keeps the card, the case, the test record, the draft, the step and the answers; returning never presents again, never re-runs a test and never starts a new trial; leaving before START CASE 1 shows the card again', () => {
    const r = opened();

    m18sLeave(r.s, r.tick(10), r.sink);
    expect(last(r, 'panel_left')?.metadata).toMatchObject({
      view: 'intro',
      phase: 'intro',
    });
    expect(m18sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(render(r.s).ids).toContain('start_case');
    expect(count(r, 'intro_acknowledged')).toBe(0);
    expect(m18sStartCase1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(runTest(r, 'A')).toBe('run');
    expect(runTest(r, 'C')).toBe('run');
    expect(m18sDraft(r.s, 'm18_c1_p4', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    m18sLeave(r.s, r.tick(10), r.sink);
    expect(m18sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(count(r, 'case_presented')).toBe(1);
    expect(count(r, 'test_run')).toBe(2);
    expect(r.s.cases[0].diagnosis.draft).toBe('m18_c1_p4');

    const view = render(r.s);

    expect(view.text).toContain('P1 reads TONE.');
    expect(view.text).toContain('Spare FILTER in: the SPEAKER stays silent.');
    expect(view.model.elements.find((e) => e.id === 'part_4')?.state).toBe(
      'selected',
    );
    expect(
      m18sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('opened');
    expect(
      m18sConfirmCommit(r.s, 'keyboard', r.tick(M18_SETTLE_MS + 1), r.sink),
    ).toBe('recorded');
    expect(last(r, 'first_response')?.metadata).toMatchObject({
      option_id: 'm18_c1_p4',
      correct: false,
    });
    expect(m18sDraft(r.s, 'm18_c1_s1', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    m18sLeave(r.s, r.tick(10), r.sink);
    expect(last(r, 'panel_left')?.metadata).toMatchObject({ view: 'step' });
    expect(m18sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(count(r, 'step_presented')).toBe(1);
    expect(count(r, 'first_response')).toBe(1);
    expect(r.s.view).toBe('step');
    expect(r.s.cases[0].prediction.draft).toBe('m18_c1_s1');
    // Leaving never records CANNOT SOLVE.
    expect(
      r.events.filter(
        (e) =>
          e.suffix === 'first_response' &&
          e.metadata.response_kind === 'cannot_solve',
      ),
    ).toEqual([]);
    expect(
      m18sRequestCommit(r.s, 'option', 'keyboard', r.settle(), r.sink),
    ).toBe('opened');
    expect(
      m18sConfirmCommit(r.s, 'keyboard', r.tick(M18_SETTLE_MS + 1), r.sink),
    ).toBe('recorded');
    expect(last(r, 'first_response')?.metadata).toMatchObject({
      slot: 'prediction',
      option_id: 'm18_c1_s1',
    });
    m18sLeave(r.s, r.tick(10), r.sink);
    expect(m18sOpen(r.s, r.tick(10), r.sink)).toBe('reopened');
    expect(r.s.view).toBe('acknowledgement');
    expect(m18sNext(r.s, 'keyboard', r.tick(100), r.sink)).toBe('refused');
    expect(next(r)).toBe('case_presented');
    expect(count(r, 'series_reopened')).toBe(4);
  });

  test('the review closure of a board never opened: the series becomes the closed record; a later opening shows it, accepts nothing and writes no event', () => {
    const r = run();

    expect(m18sCloseUnopenedAtReview(r.s)).toBe(true);
    expect(m18sCloseUnopenedAtReview(r.s)).toBe(false);
    expect(r.s.status).toBe('closed_at_review');
    expect(m18sOpen(r.s, r.tick(10), r.sink)).toBe('record');
    expect(r.s.view).toBe('record');
    expect(render(r.s).text).toContain(
      'Parts recorded: 0 of 3 · planned steps recorded: 0 of 3.',
    );
    expect(m18sStartCase1(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    expect(m18sRunTest(r.s, 'm18_c1_ta', 'keyboard', r.settle(), r.sink)).toBe(
      'none',
    );
    m18sLeave(r.s, r.tick(10), r.sink);
    expect(r.events).toEqual([]);

    // An opened series is never closed this way.
    const opened = run();

    expect(m18sOpen(opened.s, opened.tick(10), opened.sink)).toBe('opened');
    expect(m18sCloseUnopenedAtReview(opened.s)).toBe(false);

    // The adapter closes the series right after the kit's absence record.
    const adapter = readFileSync(
      'src/pilot/windows/m18DiagnosticBoard.ts',
      'utf8',
    );

    expect(adapter).toMatch(
      /markAbsent\([\s\S]{0,160}?\);\s*m18sCloseUnopenedAtReview\(s\);/,
    );
  });

  test('the review closure: the card only, a case with tests and no part, a part without its step, a partial series and a completed series (not reclosed)', () => {
    const card = opened();

    expect(m18sCloseAtReview(card.s, card.tick(10), card.sink)).toBe(true);
    expect(last(card, 'series_closed_at_review')?.metadata).toMatchObject({
      phase: 'closure',
      closure_reason: 'closed_at_review',
      intro_acknowledged: false,
      cases_presented: 0,
      parts_recorded: 0,
      steps_recorded: 0,
    });
    expect(m18sCloseAtReview(card.s, card.tick(10), card.sink)).toBe(false);
    expect(render(card.s).text).toContain(
      'Parts recorded: 0 of 3 · planned steps recorded: 0 of 3.',
    );

    const tests = started();

    expect(runTest(tests, 'A')).toBe('run');
    expect(runTest(tests, 'B')).toBe('run');
    expect(m18sCloseAtReview(tests.s, tests.tick(10), tests.sink)).toBe(true);
    expect(last(tests, 'series_closed_at_review')?.metadata).toMatchObject({
      cases_presented: 1,
      parts_recorded: 0,
    });

    const snapshot = last(tests, 'series_closed_at_review')?.metadata.cases as {
      case_id: string;
      tests_run: string[];
      test_runs: number;
      part: { answered: boolean };
    }[];

    expect(snapshot[0]).toMatchObject({
      case_id: 'm18_c1',
      tests_run: ['m18_c1_ta', 'm18_c1_tb'],
      test_runs: 2,
      part: { answered: false },
    });

    const part = started();

    answerPart(part, 3);
    expect(m18sCloseAtReview(part.s, part.tick(10), part.sink)).toBe(true);
    expect(last(part, 'series_closed_at_review')?.metadata).toMatchObject({
      parts_recorded: 1,
      steps_recorded: 0,
      correct_first_diagnoses: 1,
    });
    expect(render(part.s).text).toContain(
      'Parts recorded: 1 of 3 · planned steps recorded: 0 of 3.',
    );

    const partial = started();

    completeSeries(partial, KEYS.slice(0, 2));
    expect(next(partial)).toBe('case_presented');
    expect(m18sCloseAtReview(partial.s, partial.tick(10), partial.sink)).toBe(
      true,
    );
    expect(last(partial, 'series_closed_at_review')?.metadata).toMatchObject({
      cases_presented: 3,
      parts_recorded: 2,
      steps_recorded: 2,
      correct_first_diagnoses: 2,
      correct_consequence_predictions: 2,
    });
    expect(partial.s.status).toBe('closed_at_review');
    expect(
      m18sDraft(
        partial.s,
        'm18_c3_p2',
        'keyboard',
        partial.settle(),
        partial.sink,
      ),
    ).toBe(false);

    const complete = started();

    completeSeries(complete, KEYS);
    expect(
      m18sCloseAtReview(complete.s, complete.tick(10), complete.sink),
    ).toBe(false);
    expect(complete.s.status).toBe('completed');
  });

  test("the reload predicate reads an earlier load's opportunity_opened; a held-back board is a closed record; the reload check establishes absence only from a continuous history without an opening", () => {
    expect(m18PriorAdministration([])).toBe(false);
    expect(
      m18PriorAdministration([{ event_type: `${M18_FAMILY}presented` }]),
    ).toBe(false);
    expect(
      m18PriorAdministration([{ event_type: 'proto_m18_fault_window_opened' }]),
    ).toBe(false);
    expect(
      m18PriorAdministration([
        { event_type: `${M18_FAMILY}opportunity_opened` },
      ]),
    ).toBe(true);

    const r = run();

    expect(m18sHoldBack(r.s)).toBe(true);
    expect(m18sHoldBack(r.s)).toBe(false);
    expect(m18sOpen(r.s, r.now, r.sink)).toBe('record');

    const view = render(r.s);

    expect(view.ids).toEqual(['record_text', 'leave']);
    expect(view.text).toContain(HAND_TEXT.heldBack);
    expect(view.model.status).toBe('');
    expect(m18sStartCase1(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    expect(suffixes(r)).toEqual([]);

    const continuous = {
      first_sequence: 1,
      sequence_gap_count: 0,
      sequence_duplicate_count: 0,
      recovered_from_chunks: false,
    };

    expect(
      m18PriorLoadCheck(
        2,
        [{ event_type: `${M18_FAMILY}presented` }],
        continuous,
      ),
    ).toEqual({
      page_load_index: 2,
      prior_page_load_event_count: 1,
      prior_opening_found: false,
      prior_briefing_found: true,
      history_continuous: true,
      prior_opening_absence_established: true,
    });
    expect(
      m18PriorLoadCheck(
        2,
        [{ event_type: `${M18_FAMILY}opportunity_opened` }],
        continuous,
      ),
    ).toMatchObject({
      prior_opening_found: true,
      prior_opening_absence_established: false,
    });
    expect(m18PriorLoadCheck(2, [], continuous)).toMatchObject({
      history_continuous: false,
      prior_opening_absence_established: false,
    });
    expect(
      m18PriorLoadCheck(2, [{ event_type: 'x' }], {
        ...continuous,
        sequence_gap_count: 1,
      }),
    ).toMatchObject({
      history_continuous: false,
      prior_opening_absence_established: false,
    });
    expect(
      m18PriorLoadCheck(2, [{ event_type: 'x' }], {
        ...continuous,
        recovered_from_chunks: true,
      }),
    ).toMatchObject({ prior_opening_absence_established: false });
    expect(
      m18PriorLoadCheck(2, [{ event_type: 'x' }], {
        ...continuous,
        first_sequence: 2,
      }),
    ).toMatchObject({ prior_opening_absence_established: false });
  });

  test('a fault closes an open series (card, case, step); after completion it is recorded without touching the scored phase', () => {
    const card = opened();

    expect(m18sFail(card.s, 'boom')).toBe('scored_phase');
    expect(card.s.status).toBe('technical_failure');
    expect(render(card.s).text).toContain(HAND_TEXT.fault);
    expect(render(card.s).text).toContain(
      'Parts recorded: 0 of 3 · planned steps recorded: 0 of 3.',
    );

    const step = started();

    answerPart(step, 3);
    expect(m18sFail(step.s, 'boom')).toBe('scored_phase');
    expect(
      m18sDraft(step.s, 'm18_c1_s1', 'keyboard', step.settle(), step.sink),
    ).toBe(false);

    const complete = started();

    completeSeries(complete, KEYS);
    expect(m18sFail(complete.s, 'late')).toBe('feedback');
    expect(complete.s.status).toBe('completed');
    expect(complete.s.view).toBe('record');
    expect(m18sFail(card.s, 'again')).toBe('none');
  });

  test("the entry snapshot and the event suffixes are the contract's", () => {
    const snapshot = m18EntrySnapshot('lab_work', 'unopened');

    expect(snapshot).toMatchObject({
      cases_planned: 3,
      responses_per_case: 2,
      form_id: 'm18-form-1',
      content_version: 'm18-content-v1',
      assigned_case_order: ['m18_c1', 'm18_c2', 'm18_c3'],
      prediction_target: 'actual_case',
      tests: 'on_request_unlimited',
      tests_close: 'at_part_record',
      step_after: 'part_record',
      cannot_solve_available: true,
      feedback: 'after_all_first_responses',
      stop_control: false,
      settle_ms: 400,
      stage: 'lab_work',
      prior_m13_window_status: 'unopened',
    });
    expect(snapshot.cases.map((c) => c.case_id)).toEqual([
      'm18_c1',
      'm18_c2',
      'm18_c3',
    ]);
    expect(snapshot.cases[0]).toEqual({
      case_id: 'm18_c1',
      test_ids: ['m18_c1_ta', 'm18_c1_tb', 'm18_c1_tc'],
      part_option_ids: ['m18_c1_p1', 'm18_c1_p2', 'm18_c1_p3', 'm18_c1_p4'],
      key_part_option_id: 'm18_c1_p3',
      step_option_ids: ['m18_c1_s1', 'm18_c1_s2', 'm18_c1_s3', 'm18_c1_s4'],
      key_step_option_id: 'm18_c1_s2',
    });
    expect(snapshot.cases[1].key_part_option_id).toBe('m18_c2_p4');
    expect(snapshot.cases[1].key_step_option_id).toBe('m18_c2_s1');
    expect(snapshot.cases[2].key_part_option_id).toBe('m18_c3_p2');
    expect(snapshot.cases[2].key_step_option_id).toBe('m18_c3_s4');

    for (const suffix of [
      'presented',
      'opportunity_opened',
      'intro_acknowledged',
      'series_reopened',
      'panel_left',
      'prior_load_checked',
      'case_presented',
      'test_run',
      'press_refused',
      'option_drafted',
      'commit_requested',
      'commit_cancelled',
      'commit_press_refused',
      'commit_without_draft',
      'first_response',
      'tests_closed',
      'step_presented',
      'response_acknowledged',
      'first_responses_completed',
      'results_shown',
      'help_consulted',
      'series_closed_at_review',
      'technical_failure',
      'window_closed',
    ]) {
      expect(M18_EVENT_SUFFIXES).toContain(suffix);
    }

    expect(M18_RELOAD_DETAIL).toBe(
      'reload after administration: board not re-run',
    );
    expect(m18AnsweredCount(createM18Series())).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * 8. The extractor on synthetic logs
 * ------------------------------------------------------------------ */

type Step = (r: Run) => void;

interface LogOptions {
  /** Omit the kit's `opportunity_opened` (the board never opened). */
  opened?: boolean;
  /** Add the kit's `presented` (the briefing acknowledged) first. */
  briefed?: boolean;
  /** Add the kit's review-closure `window_closed` for a never-opened board. */
  absentAtReview?: boolean;
  version?: string;
  opportunity?: string;
  pageLoadIndex?: number;
  /** Rewrites each event's sequence (default: 100, 110, …). */
  sequence?: (index: number) => number | undefined;
  /** Extra kit records placed before the model's events. */
  before?: { suffix: string; metadata: Record<string, unknown> }[];
}

function kitFields(options: LogOptions = {}): Record<string, unknown> {
  return {
    measure_id: 'M18',
    opportunity_id: options.opportunity ?? M18_OPPORTUNITY_ID,
    window_id: M18_WINDOW_ID,
    entry_state_version: options.version ?? M18_ENTRY_STATE_VERSION,
    form: null,
    counterbalance: null,
    occasion: null,
  };
}

function toEvents(
  list: { suffix: string; metadata: Record<string, unknown> }[],
  options: LogOptions = {},
): RawGameEvent[] {
  return list.map((event, index) => ({
    session_id: 'GS',
    timestamp_ms: 1_000 + index,
    scene: 'diagnostics_laboratory',
    event_type: `${M18_FAMILY}${event.suffix}`,
    object_id: 'm18_diagnostic_board',
    sequence: options.sequence ? options.sequence(index) : 100 + index * 10,
    page_load_index: options.pageLoadIndex ?? 1,
    metadata: { ...kitFields(options), ...event.metadata },
  }));
}

/**
 * Builds a raw log: the kit's `presented` / `opportunity_opened` records,
 * then the model's events of the steps (the kit's `window_closed` after a
 * completion), each stamped with the kit's fields and a sequence number.
 */
function log(steps: Step[], options: LogOptions = {}): RawGameEvent[] {
  const r = run();
  const kit: { suffix: string; metadata: Record<string, unknown> }[] = [
    ...(options.before ?? []),
  ];

  if (options.briefed) {
    kit.push({ suffix: 'presented', metadata: { input_mode: 'system' } });
  }

  if (options.opened !== false) {
    kit.push({
      suffix: 'opportunity_opened',
      metadata: {
        entry_state_snapshot: m18EntrySnapshot('lab_work', 'unopened'),
        input_mode: 'system',
      },
    });
    m18sOpen(r.s, r.now, r.sink);
  }

  for (const step of steps) {
    step(r);

    if (
      r.s.status === 'completed' &&
      r.events.filter((event) => event.suffix === 'first_responses_completed')
        .length === 1 &&
      !r.events.some((event) => event.suffix === 'window_closed')
    ) {
      r.events.push({
        suffix: 'window_closed',
        metadata: { exit_state: 'completed', input_mode: 'system' },
      });
    }
  }

  if (options.absentAtReview) {
    r.events.push({
      suffix: 'window_closed',
      metadata: { exit_state: 'closed_at_review', input_mode: 'system' },
    });
  }

  return toEvents([...kit, ...r.events], options);
}

const CONTEXT = { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false };
const CLOSED = { ...CONTEXT, finalCoreClosed: true };
const RELOADED = { finalCoreClosed: false, pageLoadIndex: 2, reloaded: true };

type Row = ReturnType<typeof extractItemFeatures>[number];
type Comp = Record<string, unknown>;

/** Both rows; the input is never mutated. */
function rows(events: RawGameEvent[], context = CONTEXT) {
  const before = JSON.stringify(events);
  const out = extractItemFeatures('M18', events, context);

  expect(JSON.stringify(events)).toBe(before);
  expect(out).toHaveLength(2);
  expect(out[0].feature_id).toBe('m18_correct_first_diagnoses');
  expect(out[1].feature_id).toBe('m18_correct_consequence_predictions');
  expect(out[0].planned_denominator).toBe(3);
  expect(out[1].planned_denominator).toBe(3);

  return { diagnosis: out[0], prediction: out[1] };
}

const caseOf = (row: Row, id: M18CaseId) =>
  (row.components.cases as Comp[]).find((entry) => entry.case_id === id)!;
const slotOf = (row: Row, slot: M18Slot) =>
  (row.components.slots as Record<M18Slot, Comp>)[slot];

const start: Step = (r) => {
  expect(m18sStartCase1(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
};
const test_ =
  (letter: Letter): Step =>
  (r) => {
    expect(runTest(r, letter)).toBe('run');
  };
const part =
  (choice: Choice): Step =>
  (r) => {
    answerPart(r, choice);
  };
const step =
  (choice: Choice): Step =>
  (r) => {
    answerStep(r, choice);
  };
const nextCase: Step = (r) => {
  expect(next(r)).toBe('case_presented');
};
const series =
  (
    answers: [Choice, Choice][],
    options: { showResults?: boolean; tests?: Letter[][] } = {},
  ): Step =>
  (r) => {
    completeSeries(r, answers, options);
  };
const closeAtReview: Step = (r) => {
  m18sCloseAtReview(r.s, r.tick(10), r.sink);
};
const leave: Step = (r) => {
  m18sLeave(r.s, r.tick(10), r.sink);
  m18sOpen(r.s, r.tick(10), r.sink);
};
const help: Step = (r) => {
  expect(m18sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
  expect(m18sCloseHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
};
const fault: Step = (r) => {
  m18sFail(r.s, 'boom');
  r.events.push({
    suffix: 'technical_failure',
    metadata: { detail: 'boom', input_mode: 'system' },
  });
};
const SUFFICIENT_TESTS: Letter[][] = [
  ['A', 'B'],
  ['B', 'C'],
  ['A', 'C'],
];
/** The complete keyed series with sufficient tests, results shown. */
const full = () =>
  log([start, series(KEYS, { tests: SUFFICIENT_TESTS, showResults: true })]);

const isResponse = (event: RawGameEvent, caseId: M18CaseId, slot: M18Slot) =>
  event.event_type === `${M18_FAMILY}first_response` &&
  event.metadata?.case_id === caseId &&
  event.metadata?.slot === slot;
const isSuffix = (event: RawGameEvent, suffix: string, caseId?: M18CaseId) =>
  event.event_type === `${M18_FAMILY}${suffix}` &&
  (caseId === undefined || event.metadata?.case_id === caseId);

function copyOf(events: RawGameEvent[]): RawGameEvent[] {
  return events.map((event) => ({
    ...event,
    metadata: { ...event.metadata },
  }));
}

/** Rewrites the sequences 100, 110, … in list order. */
function renumber(events: RawGameEvent[]): RawGameEvent[] {
  return events.map((event, index) => ({
    ...event,
    sequence: 100 + index * 10,
  }));
}

/** Mutates one event's metadata in a copied log. */
function withMeta(
  events: RawGameEvent[],
  find: (event: RawGameEvent) => boolean,
  patch: Record<string, unknown>,
  which: 'first' | 'last' = 'last',
): RawGameEvent[] {
  const copy = copyOf(events);
  const own = copy.filter(find);
  const target = which === 'first' ? own[0] : own[own.length - 1];

  expect(target, 'the event to patch').toBeDefined();
  Object.assign(target.metadata as Record<string, unknown>, patch);

  return copy;
}

/** Removes fields from one event's metadata in a copied log. */
function withoutFields(
  events: RawGameEvent[],
  find: (event: RawGameEvent) => boolean,
  fields: string[],
): RawGameEvent[] {
  const copy = copyOf(events);
  const target = copy.find(find);

  expect(target, 'the event to strip').toBeDefined();

  for (const field of fields) {
    delete (target!.metadata as Record<string, unknown>)[field];
  }

  return copy;
}

const response =
  (caseId: M18CaseId, slot: M18Slot, patch: Record<string, unknown>) =>
  (events: RawGameEvent[]) =>
    withMeta(
      events,
      (event) => isResponse(event, caseId, slot),
      patch,
      'first',
    );

/** Inserts a copy of an event right after an anchor (or at the end), renumbered. */
function duplicateAfter(
  events: RawGameEvent[],
  find: (event: RawGameEvent) => boolean,
  anchor: ((event: RawGameEvent) => boolean) | 'end',
  patch: Record<string, unknown> = {},
): RawGameEvent[] {
  const copy = copyOf(events);
  const source = copy.find(find);

  expect(source, 'the event to duplicate').toBeDefined();

  const duplicate = { ...source!, metadata: { ...source!.metadata, ...patch } };
  const at = anchor === 'end' ? copy.length - 1 : copy.findIndex(anchor);

  expect(at, 'the anchor').toBeGreaterThanOrEqual(0);
  copy.splice(at + 1, 0, duplicate);

  return renumber(copy);
}

function without(
  events: RawGameEvent[],
  find: (event: RawGameEvent) => boolean,
): RawGameEvent[] {
  const target = events.find(find);

  expect(target, 'the event to remove').toBeDefined();

  return events.filter((event) => event !== target);
}

/** Patches the closure snapshot (the completion or the review closure). */
function withSnapshot(
  events: RawGameEvent[],
  suffix: 'first_responses_completed' | 'series_closed_at_review',
  mutate: (snapshot: Record<string, unknown>) => void,
): RawGameEvent[] {
  const copy = copyOf(events);
  const target = copy.find((event) => isSuffix(event, suffix));

  expect(target, suffix).toBeDefined();

  const metadata = JSON.parse(JSON.stringify(target!.metadata)) as Record<
    string,
    unknown
  >;

  mutate(metadata);
  target!.metadata = metadata;

  return copy;
}

const snapshotCase = (snapshot: Record<string, unknown>, id: M18CaseId) =>
  (snapshot.cases as Comp[]).find((entry) => entry.case_id === id)!;

function expectObserved(row: Row, value: number, denominator = 3) {
  expect(row).toMatchObject({
    value,
    numerator: value,
    denominator,
    planned_denominator: 3,
    disposition: denominator === 3 ? 'observed' : 'incomplete',
  });
}

function expectVoided(row: Row, scope: string) {
  expect(row.disposition).toBe('technical_failure');
  expect(row.value).toBeNull();
  expect(row.numerator).toBeNull();
  expect(row.included_ids).toEqual([]);
  expect(row.components.defect_scope).toBe(scope);
  expect((row.components.integrity_defect as Comp[]).length).toBeGreaterThan(0);
}

const outcomeOf = (row: Row) => ({
  value: row.value,
  numerator: row.numerator,
  denominator: row.denominator,
  disposition: row.disposition,
  included_ids: row.included_ids,
});

test.describe('M18 extractor — values and companions', () => {
  test('3 / 3 and 3 / 3, 0 / 3 and 0 / 3, mixed with CANNOT SOLVE in each slot, a wrong part with a keyed step and a keyed part with a wrong step; omissions apart from CANNOT SOLVE; versions and test use; the indicators', () => {
    const keyed = rows(full());

    expectObserved(keyed.diagnosis, 3);
    expectObserved(keyed.prediction, 3);

    for (const row of [keyed.diagnosis, keyed.prediction]) {
      expect(row.closure_reason).toBe('completed');
      expect(row.censored).toBe(false);
      expect(row.included_ids).toEqual(['m18_c1', 'm18_c2', 'm18_c3']);
      expect(row.components).toMatchObject({
        administration_version: 'm18-cases-v1',
        form_id: 'm18-form-1',
        content_version: 'm18-content-v1',
        prediction_target: 'actual_case',
        assigned_case_order: ['m18_c1', 'm18_c2', 'm18_c3'],
        realised_case_order: ['m18_c1', 'm18_c2', 'm18_c3'],
        observations_share_one_episode: true,
        first_response_phase_complete: true,
        first_response_phase_closure: 'completed',
        prior_m13_window_status: 'unopened',
        exposure_record_consistent: true,
        results_shown: { 1: true, 2: false, 3: false },
      });
      expect(row.components.investigation_record_consistent).toEqual({
        overall: true,
        m18_c1: true,
        m18_c2: true,
        m18_c3: true,
      });
      expect(slotOf(row, 'diagnosis')).toEqual({
        answered: 3,
        planned: 3,
        cannot_solve_count: 0,
        unanswered_case_ids: [],
        unpresented_case_ids: [],
      });
      expect(slotOf(row, 'prediction')).toMatchObject({
        answered: 3,
        cannot_solve_count: 0,
      });
      expect(caseOf(row, 'm18_c1')).toMatchObject({
        tests_run_before_part: ['m18_c1_ta', 'm18_c1_tb'],
        test_runs_before_part: 2,
        repeated_test_runs: 0,
        evidence_sufficient_before_part: true,
        step_answer_implied_by_recorded_part: true,
        part: {
          response_kind: 'option',
          option_id: 'm18_c1_p3',
          correct: true,
          key_option_id: 'm18_c1_p3',
        },
        step: {
          response_kind: 'option',
          option_id: 'm18_c1_s2',
          correct: true,
          key_option_id: 'm18_c1_s2',
        },
      });
      expect(caseOf(row, 'm18_c3')).toMatchObject({
        tests_run_before_part: ['m18_c3_ta', 'm18_c3_tc'],
        evidence_sufficient_before_part: true,
        step_answer_implied_by_recorded_part: true,
      });
      expect(row.components.other_row_defect).toBeUndefined();
      expect(row.components.integrity_defect).toBeUndefined();
    }

    expect(keyed.diagnosis.components).toEqual(keyed.prediction.components);

    const wrong = rows(log([start, series(WRONG, { showResults: true })]));

    expectObserved(wrong.diagnosis, 0);
    expectObserved(wrong.prediction, 0);
    expect(caseOf(wrong.diagnosis, 'm18_c1')).toMatchObject({
      // No test run: four parts stay consistent.
      evidence_sufficient_before_part: false,
      // MAST implies option 4: consistent, yet keyed wrong.
      step_answer_implied_by_recorded_part: true,
      part: { option_id: 'm18_c1_p1', correct: false },
      step: { option_id: 'm18_c1_s4', correct: false },
    });

    const mixed = rows(
      log([
        start,
        series(
          [
            [3, 2],
            ['cannot_solve', 1],
            [4, 'cannot_solve'],
          ],
          { tests: [['A', 'B'], ['B', 'C'], []], showResults: true },
        ),
      ]),
    );

    expectObserved(mixed.diagnosis, 1);
    expectObserved(mixed.prediction, 2);
    expect(slotOf(mixed.diagnosis, 'diagnosis')).toMatchObject({
      answered: 3,
      cannot_solve_count: 1,
      unanswered_case_ids: [],
    });
    expect(slotOf(mixed.diagnosis, 'prediction')).toMatchObject({
      answered: 3,
      cannot_solve_count: 1,
      unanswered_case_ids: [],
    });
    expect(caseOf(mixed.diagnosis, 'm18_c2')).toMatchObject({
      part: { response_kind: 'cannot_solve', option_id: null, correct: false },
      step: { response_kind: 'option', option_id: 'm18_c2_s1', correct: true },
      evidence_sufficient_before_part: true,
      step_answer_implied_by_recorded_part: null,
    });
    expect(caseOf(mixed.diagnosis, 'm18_c3')).toMatchObject({
      part: { option_id: 'm18_c3_p4', correct: false },
      step: { response_kind: 'cannot_solve', correct: false },
      evidence_sufficient_before_part: false,
      step_answer_implied_by_recorded_part: null,
    });

    // Case 3 HATCH with the keyed step (the shared key); case 1 the key
    // with a wrong step.
    const dependent = rows(
      log([
        start,
        series(
          [
            [3, 4],
            [4, 1],
            [1, 4],
          ],
          { tests: [['A', 'B'], ['B', 'C'], ['C']], showResults: true },
        ),
      ]),
    );

    expectObserved(dependent.diagnosis, 2);
    expectObserved(dependent.prediction, 2);
    expect(caseOf(dependent.diagnosis, 'm18_c3')).toMatchObject({
      part: { option_id: 'm18_c3_p1', correct: false },
      step: { option_id: 'm18_c3_s4', correct: true },
      step_answer_implied_by_recorded_part: true,
      evidence_sufficient_before_part: false,
    });
    expect(caseOf(dependent.diagnosis, 'm18_c1')).toMatchObject({
      part: { correct: true },
      step: { option_id: 'm18_c1_s4', correct: false },
      step_answer_implied_by_recorded_part: false,
    });
  });

  test('the completed rows are stable: results unopened, opened, after leaving, after HELP and after the review give the identical observed rows', () => {
    const base = log([start, series(KEYS, { tests: SUFFICIENT_TESTS })]);
    const variants = [
      base,
      log([
        start,
        series(KEYS, { tests: SUFFICIENT_TESTS, showResults: true }),
      ]),
      log([
        start,
        series(KEYS, { tests: SUFFICIENT_TESTS, showResults: true }),
        leave,
      ]),
      log([
        start,
        series(KEYS, { tests: SUFFICIENT_TESTS, showResults: true }),
        help,
      ]),
      log([
        start,
        series(KEYS, { tests: SUFFICIENT_TESTS, showResults: true }),
        closeAtReview,
      ]),
    ];
    const strip = (row: Row) => ({
      ...outcomeOf(row),
      closure_reason: row.closure_reason,
      censored: row.censored,
      cases: row.components.cases,
      slots: row.components.slots,
    });
    const reference = rows(base);

    for (const variant of variants) {
      const out = rows(variant, CLOSED);

      expect(strip(out.diagnosis)).toEqual(strip(reference.diagnosis));
      expect(strip(out.prediction)).toEqual(strip(reference.prediction));
      expect(out.diagnosis.disposition).toBe('observed');
    }
  });

  test('one to five responses closed at the review ⇒ each row by its own count (incomplete, censored, closed_at_review); still open ⇒ both pending — also with three parts and a step pending', () => {
    // Case 1 complete, case 2's part recorded, its step left.
    const partial = log([
      start,
      series([[3, 2]], { tests: [['A', 'B']] }),
      nextCase,
      part(4),
      closeAtReview,
    ]);
    const closed = rows(partial, CLOSED);

    expectObserved(closed.diagnosis, 2, 2);
    expectObserved(closed.prediction, 1, 1);

    for (const row of [closed.diagnosis, closed.prediction]) {
      expect(row).toMatchObject({
        censored: true,
        closure_reason: 'closed_at_review',
        disposition: 'incomplete',
      });
      expect(row.components.first_response_phase_closure).toBe(
        'closed_at_review',
      );
    }

    expect(closed.diagnosis.included_ids).toEqual(['m18_c1', 'm18_c2']);
    expect(closed.prediction.included_ids).toEqual(['m18_c1']);
    expect(slotOf(closed.diagnosis, 'diagnosis')).toMatchObject({
      answered: 2,
      unanswered_case_ids: [],
      unpresented_case_ids: ['m18_c3'],
    });
    expect(slotOf(closed.diagnosis, 'prediction')).toMatchObject({
      answered: 1,
      unanswered_case_ids: ['m18_c2'],
      unpresented_case_ids: ['m18_c3'],
    });
    expect(closed.diagnosis.censor_reason).toBe(
      'series closed at the review after 2 of 3 parts',
    );
    expect(closed.prediction.censor_reason).toBe(
      'series closed at the review after 1 of 3 planned-step answers',
    );

    // The same series still open: both pending with the answers in the components.
    const open = rows(log([start, series([[3, 2]]), nextCase, part(4)]));

    for (const row of [open.diagnosis, open.prediction]) {
      expect(row).toMatchObject({
        value: null,
        numerator: null,
        denominator: null,
        disposition: 'pending',
        missing_reason: 'the first-response phase is still open',
      });
    }

    expect(open.diagnosis.included_ids).toEqual(['m18_c1', 'm18_c2']);
    expect(open.prediction.included_ids).toEqual(['m18_c1']);
    expect(slotOf(open.prediction, 'prediction').answered).toBe(1);

    // Three parts recorded, the third step pending: both pending [O-9].
    const threeParts = rows(
      log([start, series(KEYS.slice(0, 2)), nextCase, part(2)]),
    );

    expect(threeParts.diagnosis.disposition).toBe('pending');
    expect(threeParts.prediction.disposition).toBe('pending');
    expect(slotOf(threeParts.diagnosis, 'diagnosis').answered).toBe(3);
    expect(slotOf(threeParts.diagnosis, 'prediction').answered).toBe(2);

    // Five responses closed at the review: diagnoses 3 observed, steps 2 incomplete.
    const five = rows(
      log([start, series(KEYS.slice(0, 2)), nextCase, part(2), closeAtReview]),
      CLOSED,
    );

    expectObserved(five.diagnosis, 3);
    expect(five.diagnosis).toMatchObject({
      disposition: 'observed',
      censored: false,
      closure_reason: 'closed_at_review',
    });
    expectObserved(five.prediction, 2, 2);
    expect(five.prediction.censored).toBe(true);
  });
});

test.describe('M18 extractor — zero evidence and legitimate missingness (never technical_failure)', () => {
  test('never briefed and never opened ⇒ not_presented (also at the review); briefed and never opened ⇒ pending, then no_eligible_event with briefed_not_opened; never declined', () => {
    for (const context of [CONTEXT, CLOSED]) {
      const none = rows([], context);

      for (const row of [none.diagnosis, none.prediction]) {
        expect(row).toMatchObject({
          disposition: 'not_presented',
          value: null,
          numerator: null,
          denominator: null,
        });
        expect((row.components.exposure as Comp).never_opened_reason).toBe(
          'not_briefed_not_opened',
        );
      }
    }

    const briefed = rows(log([], { opened: false, briefed: true }));

    for (const row of [briefed.diagnosis, briefed.prediction]) {
      expect(row).toMatchObject({
        disposition: 'pending',
        missing_reason: 'briefed_not_opened',
        value: null,
      });
      expect(row.components.exposure).toMatchObject({
        briefed: true,
        board_opened: false,
        never_opened_reason: 'briefed_not_opened',
      });
    }

    const atReview = rows(
      log([], { opened: false, briefed: true, absentAtReview: true }),
      CLOSED,
    );

    for (const row of [atReview.diagnosis, atReview.prediction]) {
      expect(row).toMatchObject({
        disposition: 'no_eligible_event',
        missing_reason: 'briefed_not_opened',
        censored: true,
        censor_reason: 'briefed_not_opened',
        closure_reason: 'closed_at_review',
      });
      expect(row.denominator).toBeNull();
    }

    for (const events of [[], full(), log([start, closeAtReview])]) {
      rows(events, CLOSED);
      expect(
        extractMeasurementFeatures(events, CLOSED)
          .filter((row) => row.item_id === 'M18')
          .map((row) => row.disposition),
      ).not.toContain('declined');
    }
  });

  test('opened and unanswered at the review ⇒ no_eligible_event with the stage reached (intro_only / case_presented_no_response / diagnosis_only); still open ⇒ pending', () => {
    const card = rows(
      log([start === start ? closeAtReview : closeAtReview]),
      CLOSED,
    );

    for (const row of [card.diagnosis, card.prediction]) {
      expect(row).toMatchObject({
        disposition: 'no_eligible_event',
        missing_reason: 'intro_only',
        denominator: 0,
        numerator: null,
        value: null,
        censored: true,
        closure_reason: 'closed_at_review',
      });
    }

    const presented = rows(log([start, test_('A'), closeAtReview]), CLOSED);

    expect(presented.diagnosis).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'case_presented_no_response',
      denominator: 0,
    });
    expect(presented.prediction).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'case_presented_no_response',
      denominator: 0,
    });
    expect(slotOf(presented.diagnosis, 'diagnosis')).toMatchObject({
      answered: 0,
      unanswered_case_ids: ['m18_c1'],
      unpresented_case_ids: ['m18_c2', 'm18_c3'],
    });
    expect(caseOf(presented.diagnosis, 'm18_c1')).toMatchObject({
      tests_run_before_part: ['m18_c1_ta'],
      evidence_sufficient_before_part: null,
    });

    const partOnly = rows(log([start, part(3), closeAtReview]), CLOSED);

    expectObserved(partOnly.diagnosis, 1, 1);
    expect(partOnly.prediction).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'diagnosis_only',
      denominator: 0,
      numerator: null,
    });

    const open = rows(log([start, test_('A')]));

    expect(open.diagnosis.disposition).toBe('pending');
    expect(open.prediction.disposition).toBe('pending');
  });

  test('held back after a reload ⇒ interrupted (also after a completed earlier load); a fault while open ⇒ technical_failure (shared) with the answers kept; the reload check establishes a first load', () => {
    const held = rows(
      toEvents(
        [
          { suffix: 'presented', metadata: { input_mode: 'system' } },
          {
            suffix: 'prior_load_checked',
            metadata: {
              phase: 'closure',
              page_load_index: 2,
              prior_page_load_event_count: 40,
              prior_opening_found: true,
              prior_briefing_found: true,
              history_continuous: true,
              prior_opening_absence_established: false,
              input_mode: 'system',
            },
          },
          {
            suffix: 'technical_failure',
            metadata: { detail: M18_RELOAD_DETAIL, input_mode: 'system' },
          },
        ],
        { pageLoadIndex: 2 },
      ),
      RELOADED,
    );

    for (const row of [held.diagnosis, held.prediction]) {
      expect(row).toMatchObject({ disposition: 'interrupted', value: null });
      expect(row.components).toMatchObject({
        held_back_after_reload: true,
        exposure_record_consistent: true,
      });
      expect(row.components.reload_check).toMatchObject({
        checked: true,
        prior_opening_found: true,
        prior_opening_absence_established: false,
      });
    }

    // Without a check: interrupted; with an established absence: a first load.
    const noCheck = rows(
      toEvents([{ suffix: 'presented', metadata: { input_mode: 'system' } }], {
        pageLoadIndex: 2,
      }),
      RELOADED,
    );

    expect(noCheck.diagnosis.disposition).toBe('interrupted');
    expect(noCheck.prediction.disposition).toBe('interrupted');

    const check = {
      suffix: 'prior_load_checked',
      metadata: {
        phase: 'closure',
        page_load_index: 2,
        prior_page_load_event_count: 30,
        prior_opening_found: false,
        prior_briefing_found: true,
        history_continuous: true,
        prior_opening_absence_established: true,
        input_mode: 'system',
      },
    };
    const established = rows(toEvents([check], { pageLoadIndex: 2 }), RELOADED);

    expect(established.diagnosis.disposition).toBe('not_presented');
    expect(established.diagnosis.components.reload_check).toMatchObject({
      page_reloaded: true,
      checked: true,
      prior_opening_absence_established: true,
    });

    const establishedBriefed = rows(
      toEvents(
        [check, { suffix: 'presented', metadata: { input_mode: 'system' } }],
        { pageLoadIndex: 2 },
      ),
      RELOADED,
    );

    expect(establishedBriefed.prediction).toMatchObject({
      disposition: 'pending',
      missing_reason: 'briefed_not_opened',
    });

    const broken = rows(
      toEvents(
        [
          {
            ...check,
            metadata: {
              ...check.metadata,
              history_continuous: false,
              prior_opening_absence_established: false,
            },
          },
        ],
        { pageLoadIndex: 2 },
      ),
      RELOADED,
    );

    expect(broken.diagnosis.disposition).toBe('interrupted');

    const opened = rows(
      log([start, series([[3, 2]])], { pageLoadIndex: 2, before: [check] }),
      RELOADED,
    );

    expect(opened.diagnosis.disposition).toBe('pending');
    expect(opened.diagnosis.components.exposure_record_consistent).toBe(true);

    // A fault while open: shared, both rows, the answers kept.
    const faulted = rows(log([start, series([[3, 2]]), nextCase, fault]));

    expectVoided(faulted.diagnosis, 'shared');
    expectVoided(faulted.prediction, 'shared');
    expect(faulted.diagnosis.missing_reason).toContain(
      'technical failure while the series was open: boom',
    );
    expect(slotOf(faulted.diagnosis, 'diagnosis').answered).toBe(1);
    expect(caseOf(faulted.prediction, 'm18_c1').step).toMatchObject({
      option_id: 'm18_c1_s2',
    });
  });

  test('every legitimate-missingness case is not a technical failure', () => {
    const logs = [
      log([], { opened: false, briefed: true }),
      log([]),
      log([start]),
      log([start, test_('A'), test_('A')]),
      log([start, part('cannot_solve')]),
      log([start, part(3), leave]),
      log([start, series([[3, 2]]), nextCase]),
      log([start, series([[3, 2]]), nextCase, part(4), closeAtReview]),
      log([start, series(KEYS.slice(0, 2)), nextCase, part(2), closeAtReview]),
      log([
        start,
        series([
          ['cannot_solve', 'cannot_solve'],
          ['cannot_solve', 'cannot_solve'],
          ['cannot_solve', 'cannot_solve'],
        ]),
      ]),
      full(),
    ];

    for (const [index, events] of logs.entries()) {
      for (const context of [CONTEXT, CLOSED]) {
        const out = rows(events, context);

        expect(out.diagnosis.disposition, `log ${index}`).not.toBe(
          'technical_failure',
        );
        expect(out.prediction.disposition, `log ${index}`).not.toBe(
          'technical_failure',
        );
      }
    }
  });
});

/* The integrity table (§9.4) — every condition with its scope. */
test.describe('M18 extractor — integrity (defect scopes of contract §9.4)', () => {
  const expectShared = (
    events: RawGameEvent[],
    label: string,
    context = CONTEXT,
  ) => {
    const out = rows(events, context);

    expectVoided(out.diagnosis, 'shared');
    expectVoided(out.prediction, 'shared');
    expect(out.diagnosis.missing_reason, label).toContain('shared defect');
  };
  const expectUncertain = (
    events: RawGameEvent[],
    label: string,
    context = CONTEXT,
  ) => {
    const out = rows(events, context);

    expectVoided(out.diagnosis, 'isolation_uncertain');
    expectVoided(out.prediction, 'isolation_uncertain');
    expect(typeof out.diagnosis.components.isolation_failed, label).toBe(
      'string',
    );
    expect(out.prediction.components.isolation_failed).toBe(
      out.diagnosis.components.isolation_failed,
    );
  };

  test('administration and content: version, opportunity, form and content stamps; the required declarations missing, malformed and contradictory; the case list; storage order and additive fields valid; two answers valid partial evidence', () => {
    const events = full();

    expectShared(
      log([start, series(KEYS)], { version: 'm18-cases-v0' }),
      'unknown version',
    );
    expectShared(
      withMeta(events, (e) => isResponse(e, 'm18_c2', 'prediction'), {
        entry_state_version: 'other',
      }),
      'mismatched version on a response',
    );
    expectShared(
      log([start, series(KEYS)], {
        opportunity: 'proto_m18_lattice_fault_diagnosis',
      }),
      'another opportunity',
    );
    expectShared(
      withMeta(events, (e) => isSuffix(e, 'case_presented', 'm18_c2'), {
        form_id: 'm18-form-2',
      }),
      'form on a presentation',
    );
    expectShared(
      withoutFields(events, (e) => isSuffix(e, 'test_run'), [
        'content_version',
      ]),
      'content version absent on a test run',
    );
    expectShared(
      withMeta(events, (e) => isSuffix(e, 'step_presented', 'm18_c1'), {
        content_version: 'x',
      }),
      'content version on a step presentation',
    );
    expectShared(
      withMeta(events, (e) => isResponse(e, 'm18_c1', 'diagnosis'), {
        form_id: 'x',
      }),
      'form on a response',
    );

    const snapshot = m18EntrySnapshot('lab_work', 'unopened') as Record<
      string,
      unknown
    >;
    const withEntry = (patch: Record<string, unknown>) =>
      withMeta(events, (e) => isSuffix(e, 'opportunity_opened'), {
        entry_state_snapshot: { ...snapshot, ...patch },
      });
    const withoutEntryField = (field: string) => {
      const copy = { ...snapshot };

      delete copy[field];

      return withMeta(events, (e) => isSuffix(e, 'opportunity_opened'), {
        entry_state_snapshot: copy,
      });
    };

    for (const [field, bad] of [
      ['form_id', 'other'],
      ['content_version', 'm18-content-v2'],
      ['cases_planned', '3'],
      ['cases_planned', 2],
      ['cases_planned', null],
      ['responses_per_case', 1],
      ['responses_per_case', '2'],
      ['prediction_target', 'recorded_part'],
      ['tests', 'budgeted'],
      ['tests_close', 'never'],
      ['step_after', 'part_draft'],
      ['cannot_solve_available', false],
      ['cannot_solve_available', 'true'],
      ['feedback', 'after_each_case'],
      ['stop_control', true],
      ['assigned_case_order', ['m18_c1', 'm18_c3', 'm18_c2']],
      ['assigned_case_order', ['m18_c1', 'm18_c2']],
      ['assigned_case_order', ['m18_c1', 'm18_c2', 'm18_c2']],
      ['assigned_case_order', 'm18_c1,m18_c2,m18_c3'],
    ] as [string, unknown][]) {
      expectShared(
        withEntry({ [field]: bad }),
        `${field} = ${JSON.stringify(bad)}`,
      );
      expectShared(withoutEntryField(field), `${field} absent`);
    }

    const cases = snapshot.cases as Comp[];

    expectShared(withEntry({ cases: cases.slice(0, 2) }), 'two case records');
    expectShared(withEntry({ cases: [...cases, cases[0]] }), 'a case twice');
    expectShared(
      withEntry({
        cases: [cases[0], cases[1], { ...cases[2], case_id: 'm18_c9' }],
      }),
      'an unknown case',
    );
    expectShared(
      withEntry({
        cases: [
          cases[0],
          cases[1],
          { ...cases[2], key_part_option_id: 'm18_c3_p1' },
        ],
      }),
      'a part key not the content',
    );
    expectShared(
      withEntry({
        cases: [
          cases[0],
          cases[1],
          { ...cases[2], key_step_option_id: 'm18_c3_s1' },
        ],
      }),
      'a step key not the content',
    );
    expectShared(
      withEntry({
        cases: [
          {
            ...cases[0],
            part_option_ids: [
              'm18_c1_p4',
              'm18_c1_p3',
              'm18_c1_p2',
              'm18_c1_p1',
            ],
          },
          cases[1],
          cases[2],
        ],
      }),
      'options out of order',
    );
    expectShared(
      withEntry({
        cases: [
          { ...cases[0], test_ids: ['m18_c1_ta', 'm18_c1_tb'] },
          cases[1],
          cases[2],
        ],
      }),
      'two tests',
    );
    expectShared(
      withEntry({ cases: [cases[0], cases[1], 'm18_c3'] }),
      'a non-record',
    );
    expectShared(withEntry({ cases: 'none' }), 'not a list');
    expectShared(withoutEntryField('cases'), 'no case list');
    expectShared(
      withMeta(events, (e) => isSuffix(e, 'opportunity_opened'), {
        entry_state_snapshot: null,
      }),
      'no snapshot',
    );

    // Another storage order and additive fields: VALID.
    const reordered = rows(
      withEntry({
        cases: [cases[2], cases[0], cases[1]].map((c) => ({
          ...c,
          note: 'additive',
        })),
        extra: true,
      }),
    );

    expectObserved(reordered.diagnosis, 3);
    expectObserved(reordered.prediction, 3);

    // Three planned cases with two answers: valid partial evidence.
    const two = rows(log([start, series([[3, 2]]), closeAtReview]), CLOSED);

    expectObserved(two.diagnosis, 1, 1);
    expectObserved(two.prediction, 1, 1);
  });

  test('sequencing and exposure (shared): case presentations, test runs, step presentations, response order, results, help views, closures, sequences; the board opened twice', () => {
    const events = full();
    const c1Diag = (e: RawGameEvent) => isResponse(e, 'm18_c1', 'diagnosis');
    const c1Pred = (e: RawGameEvent) => isResponse(e, 'm18_c1', 'prediction');

    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'opportunity_opened'),
        (e) => isSuffix(e, 'intro_acknowledged'),
      ),
      'opened twice',
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'case_presented', 'm18_c2'),
        (e) => isSuffix(e, 'case_presented', 'm18_c1'),
      ),
      'a case presented twice / out of order',
    );
    expectShared(
      withMeta(events, (e) => isSuffix(e, 'case_presented', 'm18_c2'), {
        realised_position: 3,
      }),
      'realised position',
    );
    expectShared(
      withMeta(events, (e) => isSuffix(e, 'case_presented', 'm18_c2'), {
        case_id: 'm18_c9',
      }),
      'an unknown case presented',
    );
    expectShared(
      without(events, (e) => isSuffix(e, 'intro_acknowledged')),
      'case 1 before the card was acknowledged',
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'case_presented', 'm18_c2'),
        c1Diag,
      ),
      "case 2 before case 1's planned-step answer",
    );
    expectShared(
      duplicateAfter(events, (e) => isSuffix(e, 'test_run', 'm18_c1'), c1Diag),
      "a test after its case's diagnosis",
    );
    expectShared(
      duplicateAfter(events, (e) => isSuffix(e, 'test_run', 'm18_c1'), 'end'),
      'a test after the completion',
    );
    expectShared(
      withMeta(
        events,
        (e) => isSuffix(e, 'test_run', 'm18_c1'),
        { test_id: 'm18_c2_ta' },
        'first',
      ),
      'a test of another case during case 1',
    );
    expectShared(
      withMeta(
        events,
        (e) => isSuffix(e, 'test_run', 'm18_c1'),
        { result_id: 'silent' },
        'first',
      ),
      'another result',
    );
    expectShared(
      withMeta(
        events,
        (e) => isSuffix(e, 'test_run', 'm18_c1'),
        { result_id: 'loud' },
        'first',
      ),
      'an unknown result',
    );
    expectShared(
      withoutFields(events, (e) => isSuffix(e, 'test_run', 'm18_c1'), [
        'result_id',
      ]),
      'a result absent',
    );
    expectShared(
      withMeta(
        events,
        (e) => isSuffix(e, 'test_run', 'm18_c1'),
        { case_id: 'm18_c9' },
        'first',
      ),
      'a test run of an unknown case',
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'step_presented', 'm18_c1'),
        (e) => isSuffix(e, 'case_presented', 'm18_c1'),
      ),
      'a step before its diagnosis',
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'step_presented', 'm18_c1'),
        (e) => isSuffix(e, 'step_presented', 'm18_c1'),
      ),
      'a step twice',
    );
    expectShared(
      withMeta(events, (e) => isSuffix(e, 'step_presented', 'm18_c1'), {
        case_id: 'm18_c9',
      }),
      'a step of an unknown case',
    );
    expectShared(
      duplicateAfter(events, c1Diag, (e) => isSuffix(e, 'intro_acknowledged')),
      'a diagnosis before its case presentation',
    );
    expectShared(
      without(events, (e) => isSuffix(e, 'case_presented', 'm18_c1')),
      'a diagnosis without its presentation',
    );
    expectShared(
      duplicateAfter(events, c1Pred, (e) =>
        isSuffix(e, 'case_presented', 'm18_c1'),
      ),
      'a prediction before its diagnosis and step',
    );
    expectShared(
      without(events, (e) => isSuffix(e, 'step_presented', 'm18_c1')),
      'a prediction without its step presentation',
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'option_drafted', 'm18_c1'),
        (e) => isSuffix(e, 'case_presented', 'm18_c1'),
        {
          slot: 'prediction',
          option_id: 'm18_c1_s2',
          previous_option_id: null,
        },
      ),
      "a draft naming case 1's step option before its step",
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'option_drafted', 'm18_c2'),
        (e) => isSuffix(e, 'case_presented', 'm18_c1'),
      ),
      'a draft naming case 2 before its presentation',
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'results_shown'),
        (e) => isSuffix(e, 'response_acknowledged', 'm18_c1'),
      ),
      'results before the sixth response',
    );
    expectShared(
      log([
        start,
        series([[3, 2]], { showResults: false }),
        (r) => {
          r.events.push({
            suffix: 'results_shown',
            metadata: {
              phase: 'feedback',
              form_id: 'm18-form-1',
              content_version: 'm18-content-v1',
              page: 1,
              case_id: 'm18_c1',
              input_mode: 'system',
            },
          });
        },
      ]),
      'results in a series that never completes',
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'intro_acknowledged'),
        (e) => isSuffix(e, 'response_acknowledged', 'm18_c1'),
        { phase: 'measurement', view: 'results_1' },
      ).map((e) =>
        e.metadata?.view === 'results_1'
          ? { ...e, event_type: `${M18_FAMILY}help_consulted` }
          : e,
      ),
      'a results help view before completion',
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'first_responses_completed'),
        'end',
      ),
      'completed twice',
    );
    expectShared(
      without(events, (e) => isSuffix(e, 'first_responses_completed')),
      'six responses without the completion snapshot',
    );
    expectShared(
      log(
        [
          start,
          series(KEYS.slice(0, 2)),
          nextCase,
          part(2),
          step(4),
          closeAtReview,
        ].map((s, i) =>
          i === 4
            ? (r: Run) => {
                s(r);
                r.events.pop();
              }
            : s,
        ),
      ),
      'the completion snapshot missing',
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'first_responses_completed'),
        (e) => isSuffix(e, 'response_acknowledged', 'm18_c1'),
      ),
      'the completion before the sixth response',
    );
    expectShared(
      log(
        [start, series(KEYS, { showResults: true }), closeAtReview].map(
          (s, i) =>
            i === 2
              ? (r: Run) => {
                  r.s.status = 'measurement';
                  s(r);
                }
              : s,
        ),
      ),
      'closed at the review after completion',
    );
    expectShared(
      log([
        start,
        series([[3, 2]]),
        closeAtReview,
        (r: Run) => {
          r.s.status = 'measurement';
          m18sCloseAtReview(r.s, r.tick(10), r.sink);
        },
      ]),
      'closed twice',
    );
    expectShared(
      duplicateAfter(
        events,
        (e) => isSuffix(e, 'case_presented', 'm18_c1'),
        'end',
      ),
      'a case presented after a closure',
    );
    expectShared(
      log([start, series(KEYS, { tests: SUFFICIENT_TESTS })], {
        sequence: (index) => (index === 4 ? 130 : 100 + index * 10),
      }),
      'two events share a sequence',
    );
    expectShared(
      log([start, series(KEYS)], {
        sequence: (index) => (index === 2 ? undefined : 100 + index * 10),
      }),
      'a sequence absent',
    );
    expectShared(
      log([start, series(KEYS)], {
        sequence: (index) => (index === 2 ? 0 : 100 + index * 10),
      }),
      'a zero sequence',
    );
    expectShared(
      log([start, series(KEYS)], {
        sequence: (index) => (index === 2 ? 2.5 : 100 + index * 10),
      }),
      'a fractional sequence',
    );
    expectShared(
      withMeta(
        events,
        (e) => isSuffix(e, 'presented') || isSuffix(e, 'opportunity_opened'),
        { opportunity_id: 'proto_m18_fault' },
        'first',
      ),
      'the opening of another opportunity',
    );
    // The closure snapshot's shared fields.
    expectShared(
      withSnapshot(events, 'first_responses_completed', (s) => {
        s.cases_presented = 2;
      }),
      'cases_presented disagreeing',
    );
    expectShared(
      withSnapshot(events, 'first_responses_completed', (s) => {
        s.cases_planned = 4;
      }),
      'cases_planned',
    );
    expectShared(
      withSnapshot(events, 'first_responses_completed', (s) => {
        snapshotCase(s, 'm18_c2').step_presented = false;
      }),
      'step_presented flag',
    );
    expectShared(
      withSnapshot(events, 'first_responses_completed', (s) => {
        s.closure_reason = 'closed_at_review';
      }),
      'closure reason',
    );
    expectShared(
      withSnapshot(events, 'first_responses_completed', (s) => {
        s.cases = (s.cases as Comp[]).slice(0, 2);
      }),
      'a case record missing',
    );
  });

  test('uncertain attribution (both rows, isolation_uncertain): an option of another case or of the other slot, no slot, an unknown case, a response outside measurement before a closure', () => {
    const events = full();

    expectUncertain(
      response('m18_c2', 'prediction', { option_id: 'm18_c2_p4' })(events),
      'a part option in the prediction slot',
    );
    expectUncertain(
      response('m18_c1', 'diagnosis', { option_id: 'm18_c1_s2' })(events),
      'a step option in the diagnosis slot',
    );
    expectUncertain(
      response('m18_c1', 'diagnosis', { option_id: 'm18_c2_p3' })(events),
      'an option of another case',
    );
    expectUncertain(
      withoutFields(events, (e) => isResponse(e, 'm18_c2', 'diagnosis'), [
        'slot',
      ]),
      'no slot',
    );
    expectUncertain(
      response('m18_c2', 'diagnosis', { slot: 'answer' })(events),
      'an unknown slot',
    );
    expectUncertain(
      withoutFields(events, (e) => isResponse(e, 'm18_c2', 'diagnosis'), [
        'case_id',
      ]),
      'no case',
    );
    expectUncertain(
      response('m18_c2', 'diagnosis', { case_id: 'm18_c9' })(events),
      'an unknown case',
    );
    expectUncertain(
      response('m18_c3', 'prediction', { case_id: 'm18_c9' })(events),
      'an unknown case as the sixth response',
    );
    expectUncertain(
      response('m18_c1', 'diagnosis', { phase: 'feedback' })(events),
      'phase feedback before completion',
    );

    const sixth = rows(
      response('m18_c3', 'prediction', { case_id: 'm18_c9' })(events),
    );

    expect(
      (sixth.diagnosis.components.integrity_defect as Comp[]).some(
        (d) => d.scope === 'shared',
      ),
    ).toBe(false);
    expect(sixth.diagnosis.components.isolation_failed).toContain('I1');
  });
});

/* ------------------------------------------------------------------ *
 * 8b. Defect scope and indicators (contract §12 P1, X1–X6)
 * ------------------------------------------------------------------ */

test.describe('M18 extractor — defect scope and indicators (X1–X6)', () => {
  const clean = () => full();
  const expectIsolated = (
    mutated: RawGameEvent[],
    reference: RawGameEvent[],
    slot: M18Slot,
    label: string,
    context = CONTEXT,
  ) => {
    const out = rows(mutated, context);
    const ref = rows(reference, context);
    const other: M18Slot = slot === 'diagnosis' ? 'prediction' : 'diagnosis';

    expectVoided(out[slot], slot);
    expect(out[slot].missing_reason, label).toContain(`${slot} slot defect`);
    expect(outcomeOf(out[other]), label).toEqual(outcomeOf(ref[other]));
    expect(out[other].components.other_row_defect, label).toMatchObject({
      defect_scope: slot,
    });
    expect(out[other].disposition, label).toBe(ref[other].disposition);

    return out;
  };

  test('X1 — an isolated PREDICTION defect voids the prediction row only; the diagnosis row keeps its value; the case indicator is null', () => {
    const base = clean();
    const c2 = (patch: Record<string, unknown>) =>
      response('m18_c2', 'prediction', patch)(base);
    const cases: [string, RawGameEvent[], M18CaseId][] = [
      [
        '(a) response_kind absent',
        withoutFields(base, (e) => isResponse(e, 'm18_c2', 'prediction'), [
          'response_kind',
        ]),
        'm18_c2',
      ],
      ["(b) response_kind 'guess'", c2({ response_kind: 'guess' }), 'm18_c2'],
      [
        '(c) option with option_id null',
        c2({ option_id: null, correct: false }),
        'm18_c2',
      ],
      [
        '(d) cannot_solve with an option id',
        c2({ response_kind: 'cannot_solve', correct: false }),
        'm18_c2',
      ],
      [
        '(e) cannot_solve with correct true',
        c2({ response_kind: 'cannot_solve', option_id: null, correct: true }),
        'm18_c2',
      ],
      ['(f) correct contradicting the key', c2({ correct: false }), 'm18_c2'],
      ['(g) key not the content', c2({ key_option_id: 'm18_c2_s2' }), 'm18_c2'],
      [
        '(h) a duplicate before case 3',
        duplicateAfter(
          base,
          (e) => isResponse(e, 'm18_c2', 'prediction'),
          (e) => isResponse(e, 'm18_c2', 'prediction'),
        ),
        'm18_c2',
      ],
      [
        "(h') a duplicate case-3 prediction after completion",
        duplicateAfter(
          base,
          (e) => isResponse(e, 'm18_c3', 'prediction'),
          'end',
        ),
        'm18_c3',
      ],
      [
        "(h'') a duplicate case-1 prediction after completion",
        duplicateAfter(
          base,
          (e) => isResponse(e, 'm18_c1', 'prediction'),
          'end',
        ),
        'm18_c1',
      ],
    ];

    for (const [label, mutated, affected] of cases) {
      const out = expectIsolated(mutated, base, 'prediction', label);

      expectObserved(out.diagnosis, 3);
      expect(
        caseOf(out.prediction, affected).step_answer_implied_by_recorded_part,
        label,
      ).toBeNull();
      expect(
        caseOf(out.diagnosis, affected).step_answer_implied_by_recorded_part,
        label,
      ).toBeNull();

      for (const other of M18_ASSIGNED_CASE_ORDER.filter(
        (id) => id !== affected,
      )) {
        expect(
          caseOf(out.diagnosis, other).step_answer_implied_by_recorded_part,
          `${label} ${other}`,
        ).toBe(true);
      }

      expect(out.prediction.components.records_unscorable, label).toHaveLength(
        1,
      );
      expect(slotOf(out.prediction, 'prediction').answered, label).toBe(3);
    }

    // (i) the completion snapshot's case 2 step field and count disagreeing.
    const snapshotOnly = withSnapshot(
      base,
      'first_responses_completed',
      (s) => {
        snapshotCase(s, 'm18_c2').step = {
          answered: true,
          response_kind: 'option',
          option_id: 'm18_c2_s1',
          correct: false,
        };
        s.correct_consequence_predictions = 2;
      },
    );
    const out = expectIsolated(
      snapshotOnly,
      base,
      'prediction',
      '(i) snapshot',
    );

    expect(out.prediction.components.records_unscorable).toEqual([]);
    expect(
      (out.prediction.components.integrity_defect as Comp[]).map((d) => d.kind),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('correct_consequence_predictions'),
        expect.stringContaining('step outcome of m18_c2'),
      ]),
    );
    expect(
      caseOf(out.prediction, 'm18_c2').step_answer_implied_by_recorded_part,
    ).toBeNull();

    // The same defect (a) in an OPEN series stopped at case 2's acknowledgement.
    const open = log([
      start,
      series(KEYS.slice(0, 2), { tests: SUFFICIENT_TESTS.slice(0, 2) }),
    ]);
    const openMutated = withoutFields(
      open,
      (e) => isResponse(e, 'm18_c2', 'prediction'),
      ['response_kind'],
    );
    const openOut = rows(openMutated);

    expectVoided(openOut.prediction, 'prediction');
    expect(openOut.diagnosis.disposition).toBe('pending');
    expect(openOut.diagnosis.components.other_row_defect).toMatchObject({
      defect_scope: 'prediction',
    });

    // The same series closed at the review.
    const closed = log([
      start,
      series(KEYS.slice(0, 2), { tests: SUFFICIENT_TESTS.slice(0, 2) }),
      closeAtReview,
    ]);
    const closedOut = rows(
      withoutFields(closed, (e) => isResponse(e, 'm18_c2', 'prediction'), [
        'response_kind',
      ]),
      CLOSED,
    );

    expectVoided(closedOut.prediction, 'prediction');
    expectObserved(closedOut.diagnosis, 2, 2);
    expect(closedOut.diagnosis.censored).toBe(true);
  });

  test('X2 — an isolated DIAGNOSIS defect where prediction validity is established voids the diagnosis row only; a response after the review closure for a never-answered case is never counted', () => {
    // Case 1's part MAST (wrong), its step the key (2): the base for (a).
    const wrongPart = log([
      start,
      series(
        [
          [1, 2],
          [4, 1],
          [2, 4],
        ],
        { tests: SUFFICIENT_TESTS, showResults: true },
      ),
    ]);
    const a = expectIsolated(
      response('m18_c1', 'diagnosis', { correct: true })(wrongPart),
      wrongPart,
      'diagnosis',
      '(a) correct true on a non-key part',
    );

    expectObserved(a.prediction, 3);
    expect(caseOf(a.prediction, 'm18_c1')).toMatchObject({
      step_answer_implied_by_recorded_part: null,
      evidence_sufficient_before_part: true,
    });

    const cannot = log([
      start,
      series(
        [
          ['cannot_solve', 2],
          [4, 1],
          [2, 4],
        ],
        { tests: SUFFICIENT_TESTS, showResults: true },
      ),
    ]);
    const b = expectIsolated(
      response('m18_c1', 'diagnosis', { correct: true })(cannot),
      cannot,
      'diagnosis',
      '(b) cannot_solve marked correct',
    );

    expect(caseOf(b.prediction, 'm18_c1').evidence_sufficient_before_part).toBe(
      true,
    );

    const base = clean();
    const c = expectIsolated(
      duplicateAfter(
        base,
        (e) => isResponse(e, 'm18_c1', 'diagnosis'),
        (e) => isResponse(e, 'm18_c1', 'prediction'),
      ),
      base,
      'diagnosis',
      "(c) a duplicate after case 1's prediction, before case 2",
    );

    expect(c.diagnosis.components.records_unscorable).toHaveLength(1);
    expect(caseOf(c.diagnosis, 'm18_c1').evidence_sufficient_before_part).toBe(
      true,
    );
    expectIsolated(
      duplicateAfter(base, (e) => isResponse(e, 'm18_c1', 'diagnosis'), 'end'),
      base,
      'diagnosis',
      "(c') a duplicate case-1 diagnosis after completion",
    );

    const d = expectIsolated(
      withSnapshot(base, 'first_responses_completed', (s) => {
        snapshotCase(s, 'm18_c1').part = {
          answered: true,
          response_kind: 'option',
          option_id: 'm18_c1_p3',
          correct: false,
        };
        s.correct_first_diagnoses = 2;
      }),
      base,
      'diagnosis',
      '(d) the snapshot part.correct and count',
    );

    expect(d.diagnosis.components.records_unscorable).toEqual([]);
    expect(caseOf(d.diagnosis, 'm18_c1').evidence_sufficient_before_part).toBe(
      true,
    );
    expect(
      caseOf(d.prediction, 'm18_c1').step_answer_implied_by_recorded_part,
    ).toBeNull();

    // (e) closed at the review after case 1 complete and case 2 presented; a case-2 diagnosis written afterwards.
    const closed = log([
      start,
      series([[3, 2]], { tests: [['A', 'B']] }),
      nextCase,
      closeAtReview,
    ]);
    const late = duplicateAfter(
      closed,
      (e) => isResponse(e, 'm18_c1', 'diagnosis'),
      'end',
      {
        case_id: 'm18_c2',
        case_index: 2,
        option_id: 'm18_c2_p4',
        key_option_id: 'm18_c2_p4',
        correct: true,
        phase: 'closure',
      },
    );
    const e = rows(late, CLOSED);

    expectVoided(e.diagnosis, 'diagnosis');
    expect(e.diagnosis.components.records_unscorable).toEqual([
      late[late.length - 1].sequence,
    ]);
    expectObserved(e.prediction, 1, 1);
    expect(e.prediction.disposition).toBe('incomplete');
    expect(slotOf(e.prediction, 'diagnosis').answered).toBe(1);
  });

  test('X3 — a SHARED defect voids both rows; a prediction defect beside a shared one is listed under its own class and both rows read shared', () => {
    const base = clean();
    const combined = rows(
      withSnapshot(
        withoutFields(base, (e) => isResponse(e, 'm18_c2', 'prediction'), [
          'response_kind',
        ]),
        'first_responses_completed',
        (s) => {
          s.cases_presented = 2;
        },
      ),
    );

    expectVoided(combined.diagnosis, 'shared');
    expectVoided(combined.prediction, 'shared');

    const classes = (
      combined.diagnosis.components.integrity_defect as Comp[]
    ).map((d) => d.scope);

    expect(classes).toContain('shared');
    expect(classes).toContain('slot');
    expect(combined.diagnosis.components.integrity_defect).toEqual(
      combined.prediction.components.integrity_defect,
    );
    // The X3 conditions themselves are exercised in the integrity section.
  });

  test('X4 — isolation that cannot be established voids both rows as isolation_uncertain with the reason; two determinate slot defects void both rows each with its own label', () => {
    const base = clean();
    // The indicators of case 1 (the case every diagnosis mutation touches):
    // null with an uncertain record in the load or an undetermined part;
    // evidence sufficiency still derived after an isolated defect of a
    // determinate record (a snapshot disagreement, a duplicate) — the
    // consistency indicator is then null because its responses are
    // defective (contract §10).
    const uncertain = (
      events: RawGameEvent[],
      label: string,
      reason: string,
      indicators: 'null' | 'derived',
    ) => {
      const out = rows(events);

      expectVoided(out.diagnosis, 'isolation_uncertain');
      expectVoided(out.prediction, 'isolation_uncertain');
      expect(
        String(out.diagnosis.components.isolation_failed),
        label,
      ).toContain(reason);

      const c1 = caseOf(out.diagnosis, 'm18_c1');

      if (indicators === 'null') {
        expect(c1.evidence_sufficient_before_part, label).toBeNull();
        expect(c1.step_answer_implied_by_recorded_part, label).toBeNull();
      } else {
        expect(typeof c1.evidence_sufficient_before_part, label).toBe(
          'boolean',
        );
        expect(c1.step_answer_implied_by_recorded_part, label).toBeNull();
      }
    };

    uncertain(
      response('m18_c2', 'prediction', { option_id: 'm18_c2_p4' })(base),
      'slot / option contradiction',
      'I1',
      'null',
    );
    uncertain(
      withoutFields(base, (e) => isResponse(e, 'm18_c2', 'prediction'), [
        'slot',
      ]),
      'no slot',
      'I1',
      'null',
    );
    uncertain(
      response('m18_c1', 'diagnosis', { case_id: 'm18_c9' })(base),
      'unknown case',
      'I1',
      'null',
    );
    uncertain(
      response('m18_c3', 'prediction', { case_id: 'm18_c9' })(base),
      'unknown case as the sixth',
      'I1',
      'null',
    );
    uncertain(
      response('m18_c1', 'diagnosis', { phase: 'feedback' })(base),
      'phase feedback',
      'I1',
      'null',
    );
    uncertain(
      withoutFields(base, (e) => isResponse(e, 'm18_c1', 'diagnosis'), [
        'response_kind',
      ]),
      'kind absent beside a valid option',
      'undetermined',
      'null',
    );
    uncertain(
      response('m18_c1', 'diagnosis', { option_id: 'm18_c1_p9' })(base),
      'an unknown option id',
      'undetermined',
      'null',
    );
    uncertain(
      withSnapshot(base, 'first_responses_completed', (s) => {
        snapshotCase(s, 'm18_c1').part = {
          answered: true,
          response_kind: 'option',
          option_id: 'm18_c1_p2',
          correct: true,
        };
      }),
      'the snapshot part.option_id',
      'undetermined',
      'null',
    );
    uncertain(
      duplicateAfter(
        base,
        (e) => isResponse(e, 'm18_c1', 'diagnosis'),
        (e) => isSuffix(e, 'tests_closed', 'm18_c1'),
      ),
      'a duplicate diagnosis before the prediction',
      'before its planned-step answer',
      'derived',
    );
    uncertain(
      duplicateAfter(
        base,
        (e) => isResponse(e, 'm18_c1', 'diagnosis'),
        (e) => isSuffix(e, 'case_presented', 'm18_c2'),
      ),
      "a duplicate diagnosis after case 2's presentation",
      "between the next case's presentation and completion",
      'derived',
    );
    uncertain(
      duplicateAfter(
        base,
        (e) => isResponse(e, 'm18_c1', 'prediction'),
        (e) => isSuffix(e, 'case_presented', 'm18_c2'),
      ),
      "a duplicate prediction after case 2's presentation",
      "between the next case's presentation and completion",
      'derived',
    );

    // Both slots defective, nothing else: each row by its own defect.
    const wrongPart = log([
      start,
      series(
        [
          [1, 2],
          [4, 1],
          [2, 4],
        ],
        { tests: SUFFICIENT_TESTS, showResults: true },
      ),
    ]);
    const both = rows(
      response('m18_c3', 'prediction', { key_option_id: 'm18_c3_s1' })(
        response('m18_c1', 'diagnosis', { correct: true })(wrongPart),
      ),
    );

    expectVoided(both.diagnosis, 'diagnosis');
    expectVoided(both.prediction, 'prediction');
    expect(both.diagnosis.components.isolation_failed).toBeUndefined();
  });

  test('X5 — legitimate missingness and well-formed CANNOT SOLVE stay distinct from technical failure; the indicators null where a response is missing or CANNOT SOLVE', () => {
    const partial = rows(
      log([
        start,
        series([[3, 2]], { tests: [['A', 'B']] }),
        nextCase,
        part(4),
        closeAtReview,
      ]),
      CLOSED,
    );

    expect(partial.diagnosis.disposition).toBe('incomplete');
    expect(partial.prediction.disposition).toBe('incomplete');
    expect(caseOf(partial.prediction, 'm18_c2')).toMatchObject({
      step_answer_implied_by_recorded_part: null,
      evidence_sufficient_before_part: false,
    });
    expect(caseOf(partial.prediction, 'm18_c3')).toMatchObject({
      step_answer_implied_by_recorded_part: null,
      evidence_sufficient_before_part: null,
      presented: false,
    });
    expect(slotOf(partial.prediction, 'prediction')).toMatchObject({
      answered: 1,
      cannot_solve_count: 0,
      unanswered_case_ids: ['m18_c2'],
      unpresented_case_ids: ['m18_c3'],
    });

    const cannot = rows(
      log([
        start,
        series(
          [
            ['cannot_solve', 'cannot_solve'],
            [4, 1],
            ['cannot_solve', 4],
          ],
          {
            tests: [
              ['A', 'B'],
              ['B', 'C'],
              ['A', 'C'],
            ],
            showResults: true,
          },
        ),
      ]),
    );

    expectObserved(cannot.diagnosis, 1);
    expectObserved(cannot.prediction, 2);
    expect(slotOf(cannot.diagnosis, 'diagnosis')).toMatchObject({
      answered: 3,
      cannot_solve_count: 2,
      unanswered_case_ids: [],
    });
    expect(slotOf(cannot.diagnosis, 'prediction')).toMatchObject({
      answered: 3,
      cannot_solve_count: 1,
      unanswered_case_ids: [],
    });
    expect(cannot.diagnosis.included_ids).toEqual([
      'm18_c1',
      'm18_c2',
      'm18_c3',
    ]);
    expect(caseOf(cannot.diagnosis, 'm18_c1')).toMatchObject({
      step_answer_implied_by_recorded_part: null,
      evidence_sufficient_before_part: true,
    });
    expect(caseOf(cannot.diagnosis, 'm18_c3')).toMatchObject({
      step_answer_implied_by_recorded_part: null,
      evidence_sufficient_before_part: true,
      step: { correct: true },
    });
  });

  test('X6 — the indicators on clean logs; an unknown test id and a draft after completion flag the components and leave both rows unchanged', () => {
    const indicator = (
      answers: [Choice, Choice][],
      tests: Letter[][],
      caseId: M18CaseId,
    ) => {
      const out = rows(
        log([start, series(answers, { tests, showResults: true })]),
      );
      const entry = caseOf(out.diagnosis, caseId);

      return [
        entry.step_answer_implied_by_recorded_part,
        entry.evidence_sufficient_before_part,
        (entry.step as Comp).correct,
      ];
    };

    expect(
      indicator(
        [
          [3, 2],
          [4, 1],
          [2, 4],
        ],
        [
          ['A', 'B'],
          ['B', 'C'],
          ['A', 'C'],
        ],
        'm18_c1',
      ),
    ).toEqual([true, true, true]);
    expect(
      indicator(
        [
          [1, 4],
          [4, 1],
          [2, 4],
        ],
        [['B'], ['B', 'C'], ['A', 'C']],
        'm18_c1',
      ),
    ).toEqual([true, false, false]);
    expect(
      indicator(
        [
          [3, 2],
          [4, 1],
          [1, 4],
        ],
        [['A', 'B'], ['B', 'C'], ['C']],
        'm18_c3',
      ),
    ).toEqual([true, false, true]);
    expect(
      indicator(
        [
          [3, 2],
          [3, 3],
          [2, 4],
        ],
        [
          ['A', 'B'],
          ['B', 'C'],
          ['A', 'C'],
        ],
        'm18_c2',
      ),
    ).toEqual([false, true, false]);
    expect(
      indicator(
        [
          [3, 1],
          [4, 1],
          [2, 4],
        ],
        [
          ['A', 'B'],
          ['B', 'C'],
          ['A', 'C'],
        ],
        'm18_c1',
      ),
    ).toEqual([false, true, false]);

    const base = full();
    const unknownTest = rows(
      withoutFields(
        withMeta(
          base,
          (e) => isSuffix(e, 'test_run', 'm18_c2'),
          { test_id: 'm18_c2_tz' },
          'first',
        ),
        (e) => e.metadata?.test_id === 'm18_c2_tz',
        ['result_id'],
      ),
    );

    expectObserved(unknownTest.diagnosis, 3);
    expectObserved(unknownTest.prediction, 3);
    expect(
      unknownTest.diagnosis.components.investigation_record_consistent,
    ).toMatchObject({
      overall: false,
      m18_c1: true,
      m18_c2: false,
      m18_c3: true,
    });
    expect(
      caseOf(unknownTest.diagnosis, 'm18_c2').evidence_sufficient_before_part,
    ).toBeNull();
    expect(
      caseOf(unknownTest.diagnosis, 'm18_c1').evidence_sufficient_before_part,
    ).toBe(true);

    const lateDraft = rows(
      duplicateAfter(
        base,
        (e) => isSuffix(e, 'option_drafted', 'm18_c3'),
        'end',
      ),
    );

    expectObserved(lateDraft.diagnosis, 3);
    expectObserved(lateDraft.prediction, 3);
    expect(lateDraft.diagnosis.components.exposure_record_consistent).toBe(
      false,
    );

    const lateRequest = rows(
      duplicateAfter(
        base,
        (e) => isSuffix(e, 'commit_requested', 'm18_c3'),
        'end',
      ),
    );

    expectObserved(lateRequest.prediction, 3);
    expect(lateRequest.prediction.components.exposure_record_consistent).toBe(
      false,
    );
  });

  test('flags: a results page twice or without a page, a help record without a phase or without its case, a tests_closed anomaly, a snapshot test-use disagreement, a check on a first load; none changes a row', () => {
    const base = full();
    const flagged = (
      events: RawGameEvent[],
      key: 'exposure_record_consistent' | 'investigation',
      label: string,
    ) => {
      const out = rows(events);

      expectObserved(out.diagnosis, 3);
      expectObserved(out.prediction, 3);

      if (key === 'exposure_record_consistent') {
        expect(out.diagnosis.components.exposure_record_consistent, label).toBe(
          false,
        );
      } else {
        expect(
          (out.diagnosis.components.investigation_record_consistent as Comp)
            .overall,
          label,
        ).toBe(false);
      }
    };

    flagged(
      duplicateAfter(base, (e) => isSuffix(e, 'results_shown'), 'end'),
      'exposure_record_consistent',
      'a page twice',
    );
    flagged(
      withoutFields(base, (e) => isSuffix(e, 'results_shown'), ['page']),
      'exposure_record_consistent',
      'no page',
    );
    flagged(
      duplicateAfter(
        base,
        (e) => isSuffix(e, 'intro_acknowledged'),
        'end',
        {},
      ).map((e, i, all) =>
        i === all.length - 1
          ? {
              ...e,
              event_type: `${M18_FAMILY}help_consulted`,
              metadata: { ...e.metadata, phase: undefined },
            }
          : e,
      ),
      'exposure_record_consistent',
      'help without a phase',
    );
    flagged(
      duplicateAfter(base, (e) => isSuffix(e, 'intro_acknowledged'), 'end').map(
        (e, i, all) =>
          i === all.length - 1
            ? {
                ...e,
                event_type: `${M18_FAMILY}help_consulted`,
                metadata: { ...e.metadata, phase: 'measurement' },
              }
            : e,
      ),
      'exposure_record_consistent',
      'measurement help without a case',
    );
    flagged(
      withMeta(
        base,
        (e) => isSuffix(e, 'option_drafted', 'm18_c1'),
        { option_id: 'm18_c1_p9' },
        'first',
      ),
      'exposure_record_consistent',
      'an unknown draft option',
    );
    flagged(
      duplicateAfter(
        base,
        (e) => isSuffix(e, 'tests_closed', 'm18_c1'),
        (e) => isSuffix(e, 'tests_closed', 'm18_c1'),
      ),
      'investigation',
      'tests closed twice',
    );
    flagged(
      withMeta(base, (e) => isSuffix(e, 'tests_closed', 'm18_c1'), {
        tests_run: ['m18_c1_ta'],
      }),
      'investigation',
      'tests_closed disagreeing',
    );
    flagged(
      without(base, (e) => isSuffix(e, 'tests_closed', 'm18_c2')),
      'investigation',
      'no tests_closed after a diagnosis',
    );
    flagged(
      withSnapshot(base, 'first_responses_completed', (s) => {
        snapshotCase(s, 'm18_c3').tests_run = ['m18_c3_ta'];
      }),
      'investigation',
      'snapshot test use',
    );
    flagged(
      log(
        [start, series(KEYS, { tests: SUFFICIENT_TESTS, showResults: true })],
        {
          before: [
            {
              suffix: 'prior_load_checked',
              metadata: {
                phase: 'closure',
                page_load_index: 1,
                prior_page_load_event_count: 0,
                prior_opening_found: false,
                prior_briefing_found: false,
                history_continuous: false,
                prior_opening_absence_established: false,
                input_mode: 'system',
              },
            },
          ],
        },
      ),
      'exposure_record_consistent',
      'a check on a first load',
    );
  });

  test("determinism: the same log gives identical rows; the input is not mutated; the rows equal the full extraction's rows; the value is always the numerator count", () => {
    const events = full();
    const first = rows(events);
    const second = rows(events);

    expect(second).toEqual(first);
    expect(
      extractMeasurementFeatures(events, CONTEXT).filter(
        (row) => row.item_id === 'M18',
      ),
    ).toEqual([first.diagnosis, first.prediction]);

    for (const [answers, expected] of [
      [KEYS, [3, 3]],
      [WRONG, [0, 0]],
      [
        [
          [3, 1],
          [1, 1],
          [2, 2],
        ],
        [2, 1],
      ],
    ] as [[Choice, Choice][], [number, number]][]) {
      const out = rows(log([start, series(answers)]));

      expect([out.diagnosis.value, out.prediction.value]).toEqual(expected);
      expect(out.diagnosis.value).toBe(out.diagnosis.numerator);
      expect(out.prediction.value).toBe(out.prediction.numerator);
      expect(out.diagnosis.denominator).toBe(3);
    }
  });
});

/* ------------------------------------------------------------------ *
 * 9. Wording
 * ------------------------------------------------------------------ */

test.describe('M18 wording', () => {
  test('no participant-facing string carries a forbidden token; "solve" only inside CANNOT SOLVE', () => {
    for (const line of m18ParticipantStrings()) {
      expect(line).not.toMatch(FORBIDDEN);
      expect(line).not.toMatch(SOLVE_OUTSIDE_CANNOT);
    }
  });

  test('no string shown before the sixth first response contains a correctness word; no string claims that nothing is recorded', () => {
    for (const line of m18PreCompletionStrings()) {
      expect(line).not.toMatch(CORRECTNESS);
      expect(line).not.toMatch(/nothing is recorded|not recorded/i);
    }
  });

  test('every view the model renders before completion is free of correctness words and forbidden tokens, and every footer is one line', () => {
    const r = started();

    expect(runTest(r, 'A')).toBe('run');
    expect(m18sDraft(r.s, 'm18_c1_p2', 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m18sRequestCommit(r.s, 'option', 'keyboard', r.tick(50), r.sink),
    ).toBe('opened');

    const dialog = render(r.s);

    expect(dialog.text).not.toMatch(CORRECTNESS);
    expect(m18sCancelCommit(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m18sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(render(r.s).text).not.toMatch(CORRECTNESS);
    expect(m18sCloseHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);

    for (const footer of [
      M18_TEXT.footer_card,
      M18_TEXT.footer_case,
      M18_TEXT.footer_step,
      M18_TEXT.footer_dialog,
      M18_TEXT.footer_help,
      M18_TEXT.footer_record,
    ]) {
      expect(footer).not.toContain('\n');
    }

    expect(HAND_TEXT.footers).toEqual([
      M18_TEXT.footer_card,
      M18_TEXT.footer_case,
      M18_TEXT.footer_step,
      M18_TEXT.footer_dialog,
      M18_TEXT.footer_help,
      M18_TEXT.footer_record,
    ]);
  });
});
