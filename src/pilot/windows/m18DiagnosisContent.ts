/**
 * M18 — the approved content of the three diagnosis cases at the diagnostic
 * board (Station 080 M01–M26 run, Unit 20; administration `m18-cases-v1`).
 *
 * PURE module (no Phaser, no runtime, no `import.meta`): the administration
 * of `U20-STIMULUS-PREVIEW.md` (revision r2) exactly as approved by the
 * research owner's decision D-U20-1 of 12 October 2026 — the first-opening
 * card, the three unit sheets (fixed lines), the three tests of each case
 * with their buttons, record labels and the line for every possible result,
 * each case's "if at fault" table as data, the four part options, the
 * planned step with its four answer options, the keys (the step key is the
 * outcome in the ACTUAL case, whatever part was recorded — item 1), the
 * step each part would imply (the descriptive indicator's table), the
 * results lines and every participant-facing string of the board
 * (confirmations, acknowledgement, help, closed records, footers).
 *
 * Nothing here is re-authored by the implementer: a defect found in a key, a
 * result line, a rule or a planned step is recorded for the owner, never
 * corrected here. The keys and tables are stored as approved data; the pure
 * spec re-derives them with its own transcription and simulators (contract
 * §12 P1), never by importing them. Their logical correctness does not
 * establish empirical validity; the six responses are clustered observations
 * of three independently designed cases inside one board episode, never
 * three or six independent situations; a keyed step answer never proves a
 * correct diagnosis. No questionnaire wording appears anywhere in this file.
 */

export const M18_FAMILY = 'proto_m18_cases_';
export const M18_OPPORTUNITY_ID = 'proto_m18_cases_series';
export const M18_WINDOW_ID = 'm18_cases_w1';
export const M18_ENTRY_STATE_VERSION = 'm18-cases-v1';
export const M18_FORM_ID = 'm18-form-1';
export const M18_CONTENT_VERSION = 'm18-content-v1';
export const M18_OBJECT_ID = 'm18_diagnostic_board';
export const M18_SCENE = 'diagnostics_laboratory';
export const M18_CASES_PLANNED = 3;
export const M18_RESPONSES_PER_CASE = 2;
/** A press inside this window after a view or a dialog appeared changes nothing. */
export const M18_SETTLE_MS = 400;

export type M18CaseId = 'm18_c1' | 'm18_c2' | 'm18_c3';
export type M18TestLetter = 'A' | 'B' | 'C';
export type M18Slot = 'diagnosis' | 'prediction';
export type M18ResponseKind = 'option' | 'cannot_solve';
export type M18OptionIndex = 1 | 2 | 3 | 4;

export interface M18Test {
  id: string;
  letter: M18TestLetter;
  /** The button in a case view (`PROBE P1  [A]`). */
  button: string;
  /** The record label once the tests are closed (`A  PROBE P1`). */
  record_label: string;
  /** The result ids in the content's order, each with the line it shows. */
  result_ids: readonly string[];
  lines: Readonly<Record<string, string>>;
}

export interface M18Option {
  id: string;
  index: M18OptionIndex;
  /** The part name (`AMPLIFIER`) or the answer text (`Only P1, P2 read TONE`). */
  name: string;
  /** The tile text (`AMPLIFIER  [3]`). */
  label: string;
}

export interface M18Case {
  id: M18CaseId;
  /** 1–3. */
  index: number;
  title: string;
  /** The unit sheet, fixed lines (≤ 70 characters, ≤ 11 lines). */
  sheet_lines: readonly string[];
  tests: readonly [M18Test, M18Test, M18Test];
  parts: readonly [M18Option, M18Option, M18Option, M18Option];
  key_part_option_id: string;
  /** Per part option id, the result id each test shows IF that part were at fault. */
  fault_table: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** The planned-step text (prose; may wrap inside its box). */
  step_text: string;
  steps: readonly [M18Option, M18Option, M18Option, M18Option];
  /** The outcome in the ACTUAL case (decision D-U20-1, item 1). */
  key_step_option_id: string;
  /** Per part option id, the step option that part would imply (preview §5.2). */
  implied_step: Readonly<Record<string, string>>;
  results: {
    heading: string;
    /** `Part at fault: AMPLIFIER` — completed with the recorded part. */
    part_line_prefix: string;
    part_explanation: readonly [string, string];
    /** `After the swap: Only P1, P2 read TONE` — completed with the recorded answer. */
    step_line_prefix: string;
    step_explanation: string;
  };
}

function test(
  caseId: M18CaseId,
  letter: M18TestLetter,
  name: string,
  results: readonly [string, string][],
): M18Test {
  const lines: Record<string, string> = {};

  for (const [id, line] of results) {
    lines[id] = line;
  }

  return {
    id: `${caseId}_t${letter.toLowerCase()}`,
    letter,
    button: `${name}  [${letter}]`,
    record_label: `${letter}  ${name}`,
    result_ids: results.map(([id]) => id),
    lines,
  };
}

function options(
  caseId: M18CaseId,
  slot: 'p' | 's',
  names: readonly [string, string, string, string],
): [M18Option, M18Option, M18Option, M18Option] {
  return names.map((name, at) => {
    const index = (at + 1) as M18OptionIndex;

    return {
      id: `${caseId}_${slot}${index}`,
      index,
      name,
      label: `${name}  [${index}]`,
    };
  }) as [M18Option, M18Option, M18Option, M18Option];
}

/** Keys a table by the option ids of a case (`[name → value]` → `[id → value]`). */
function byOptionId<T>(
  entries: readonly M18Option[],
  table: Readonly<Record<string, T>>,
): Record<string, T> {
  const out: Record<string, T> = {};

  for (const option of entries) {
    out[option.id] = table[option.name];
  }

  return out;
}

const C1_PARTS = options('m18_c1', 'p', [
  'MAST',
  'CABLE',
  'AMPLIFIER',
  'FILTER',
]);
const C1_STEPS = options('m18_c1', 's', [
  'P1, P2, P3 read TONE',
  'Only P1, P2 read TONE',
  'Only P1 reads TONE',
  'No probe reads TONE',
]);
const C2_PARTS = options('m18_c2', 'p', ['FAN', 'DUCT', 'GAUGE', 'HEATER']);
const C2_STEPS = options('m18_c2', 's', [
  'AIR 12 · GAUGE COOL',
  'AIR 12 · GAUGE HOT',
  'AIR 1 · GAUGE HOT',
  'AIR 0 · GAUGE HOT',
]);
const C3_PARTS = options('m18_c3', 'p', ['HATCH', 'SENSOR', 'LOCK', 'WINCH']);
const C3_STEPS = options('m18_c3', 's', [
  'LAMP LIT · WINCH MOVES',
  'LAMP LIT · WINCH STILL',
  'LAMP OFF · WINCH MOVES',
  'LAMP OFF · WINCH STILL',
]);

const C1_TESTS: [M18Test, M18Test, M18Test] = [
  test('m18_c1', 'A', 'PROBE P1', [
    ['tone', 'P1 reads TONE.'],
    ['silent', 'P1 reads SILENT.'],
  ]),
  test('m18_c1', 'B', 'PROBE P2', [
    ['tone', 'P2 reads TONE.'],
    ['silent', 'P2 reads SILENT.'],
  ]),
  test('m18_c1', 'C', 'SPARE FILTER', [
    ['tone', 'Spare FILTER in: the SPEAKER plays the tone.'],
    ['silent', 'Spare FILTER in: the SPEAKER stays silent.'],
  ]),
];
const C2_TESTS: [M18Test, M18Test, M18Test] = [
  test('m18_c2', 'A', 'AIR AT FAN', [
    ['air_6', 'Air at the FAN outlet: 6 units.'],
    ['air_1', 'Air at the FAN outlet: 1 unit.'],
  ]),
  test('m18_c2', 'B', 'AIR AT RACK', [
    ['air_6', 'Air at the RACK inlet: 6 units.'],
    ['air_1', 'Air at the RACK inlet: 1 unit.'],
    ['air_0', 'Air at the RACK inlet: 0 units.'],
  ]),
  test('m18_c2', 'C', 'SPARE GAUGE', [
    ['hot', 'A spare GAUGE (never at fault) shows HOT.'],
    ['cool', 'A spare GAUGE (never at fault) shows COOL.'],
  ]),
];
const C3_TESTS: [M18Test, M18Test, M18Test] = [
  test('m18_c3', 'A', 'FEELER AT SEAL', [
    ['no_gap', 'The FEELER at the seal reads NO GAP.'],
    ['gap', 'The FEELER at the seal reads GAP.'],
  ]),
  test('m18_c3', 'B', 'POWER AT WINCH', [
    ['none', 'Power at the WINCH: NONE.'],
    ['on', 'Power at the WINCH: ON.'],
  ]),
  test('m18_c3', 'C', 'SENSOR LAMP', [
    ['off', 'The SENSOR lamp is OFF.'],
    ['lit', 'The SENSOR lamp is LIT.'],
  ]),
];

/** `[part name → [test id → result id]]` → `[part id → …]`. */
function faultTable(
  parts: readonly M18Option[],
  tests: readonly M18Test[],
  rows: Readonly<Record<string, readonly [string, string, string]>>,
): Record<string, Readonly<Record<string, string>>> {
  const byName: Record<string, Record<string, string>> = {};

  for (const [name, results] of Object.entries(rows)) {
    byName[name] = {
      [tests[0].id]: results[0],
      [tests[1].id]: results[1],
      [tests[2].id]: results[2],
    };
  }

  return byOptionId(parts, byName);
}

/** `[part name → step option index]` → `[part id → step option id]`. */
function impliedSteps(
  parts: readonly M18Option[],
  steps: readonly M18Option[],
  rows: Readonly<Record<string, M18OptionIndex>>,
): Record<string, string> {
  const byName: Record<string, string> = {};

  for (const [name, index] of Object.entries(rows)) {
    byName[name] = steps[index - 1].id;
  }

  return byOptionId(parts, byName);
}

/** The three cases (`m18-content-v1`) in the fixed, assigned order. */
export const M18_CASES: readonly M18Case[] = [
  {
    id: 'm18_c1',
    index: 1,
    title: 'MAST RECEIVER',
    sheet_lines: [
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
    tests: C1_TESTS,
    parts: C1_PARTS,
    key_part_option_id: C1_PARTS[2].id,
    fault_table: faultTable(C1_PARTS, C1_TESTS, {
      MAST: ['silent', 'silent', 'silent'],
      CABLE: ['silent', 'silent', 'silent'],
      AMPLIFIER: ['tone', 'silent', 'silent'],
      FILTER: ['tone', 'tone', 'tone'],
    }),
    step_text:
      'Planned step: the crew swaps the AMPLIFIER and the FILTER, so the FILTER is part 3 and the AMPLIFIER part 4. The probes stay put. What will they read then?',
    steps: C1_STEPS,
    key_step_option_id: C1_STEPS[1].id,
    implied_step: impliedSteps(C1_PARTS, C1_STEPS, {
      MAST: 4,
      CABLE: 4,
      AMPLIFIER: 2,
      FILTER: 3,
    }),
    results: {
      heading: 'CASE 1 — MAST RECEIVER',
      part_line_prefix: 'Part at fault: AMPLIFIER',
      part_explanation: [
        'P1 read TONE, so the MAST and the CABLE work. P2 read SILENT, so the tone stops at part 3.',
        'The spare FILTER left the SPEAKER silent, so the FILTER is not the part at fault.',
      ],
      step_line_prefix: 'After the swap: Only P1, P2 read TONE',
      step_explanation:
        'The AMPLIFIER becomes part 4, so the tone reaches P1 and P2 but not P3.',
    },
  },
  {
    id: 'm18_c2',
    index: 2,
    title: 'COOLING BAY',
    sheet_lines: [
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
    tests: C2_TESTS,
    parts: C2_PARTS,
    key_part_option_id: C2_PARTS[3].id,
    fault_table: faultTable(C2_PARTS, C2_TESTS, {
      FAN: ['air_1', 'air_1', 'hot'],
      DUCT: ['air_6', 'air_0', 'hot'],
      GAUGE: ['air_6', 'air_6', 'cool'],
      HEATER: ['air_6', 'air_6', 'hot'],
    }),
    step_text:
      'Planned step: the crew will set the FAN to HIGH. Any spare is out and nothing else changes. What will the air at the RACK inlet and the GAUGE show then?',
    steps: C2_STEPS,
    key_step_option_id: C2_STEPS[0].id,
    implied_step: impliedSteps(C2_PARTS, C2_STEPS, {
      FAN: 3,
      DUCT: 4,
      GAUGE: 2,
      HEATER: 1,
    }),
    results: {
      heading: 'CASE 2 — COOLING BAY',
      part_line_prefix: 'Part at fault: HEATER',
      part_explanation: [
        'Air was 6 at the FAN and 6 at the RACK, so the FAN and the DUCT work.',
        'The spare GAUGE (never at fault) also showed HOT, so the GAUGE is not at fault: the HEATER is stuck.',
      ],
      step_line_prefix: 'After HIGH: AIR 12 · GAUGE COOL',
      step_explanation:
        '12 units of air is more than 9 units of heat, so the RACK becomes COOL.',
    },
  },
  {
    id: 'm18_c3',
    index: 3,
    title: 'HATCH WINCH',
    sheet_lines: [
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
    tests: C3_TESTS,
    parts: C3_PARTS,
    key_part_option_id: C3_PARTS[1].id,
    fault_table: faultTable(C3_PARTS, C3_TESTS, {
      HATCH: ['gap', 'none', 'off'],
      SENSOR: ['no_gap', 'none', 'off'],
      LOCK: ['no_gap', 'none', 'lit'],
      WINCH: ['no_gap', 'on', 'lit'],
    }),
    step_text:
      'Planned step: the crew will fit a spare LOCK and start the WINCH. Nothing else changes. What will the SENSOR lamp and the WINCH do then?',
    steps: C3_STEPS,
    key_step_option_id: C3_STEPS[3].id,
    implied_step: impliedSteps(C3_PARTS, C3_STEPS, {
      HATCH: 4,
      SENSOR: 4,
      LOCK: 1,
      WINCH: 2,
    }),
    results: {
      heading: 'CASE 3 — HATCH WINCH',
      part_line_prefix: 'Part at fault: SENSOR',
      part_explanation: [
        'The FEELER read NO GAP, so the HATCH is fully shut. A working SENSOR would then report SHUT,',
        'but its lamp was OFF: the SENSOR is the part at fault.',
      ],
      step_line_prefix: 'After a spare LOCK: LAMP OFF · WINCH STILL',
      step_explanation:
        'The SENSOR still never reports SHUT, so the spare LOCK sends no power and the WINCH stays still.',
    },
  },
];

export const M18_ASSIGNED_CASE_ORDER: readonly M18CaseId[] = M18_CASES.map(
  (entry) => entry.id,
);

export function isM18CaseId(value: unknown): value is M18CaseId {
  return (
    typeof value === 'string' &&
    M18_CASES.some((candidate) => candidate.id === value)
  );
}

export function m18Case(id: M18CaseId): M18Case {
  return M18_CASES.find((candidate) => candidate.id === id)!;
}

export function m18Test(
  caseId: M18CaseId,
  testId: string,
): M18Test | undefined {
  return m18Case(caseId).tests.find((entry) => entry.id === testId);
}

/** The test of the series with this id, if any (its case included). */
export function m18TestOfSeries(
  testId: unknown,
): { caseId: M18CaseId; test: M18Test } | undefined {
  for (const entry of M18_CASES) {
    const found = entry.tests.find((candidate) => candidate.id === testId);

    if (found !== undefined) {
      return { caseId: entry.id, test: found };
    }
  }

  return undefined;
}

export function m18PartOption(
  caseId: M18CaseId,
  optionId: unknown,
): M18Option | undefined {
  return m18Case(caseId).parts.find((option) => option.id === optionId);
}

export function m18StepOption(
  caseId: M18CaseId,
  optionId: unknown,
): M18Option | undefined {
  return m18Case(caseId).steps.find((option) => option.id === optionId);
}

/** The option of a case and slot with this id, if any. */
export function m18Option(
  caseId: M18CaseId,
  slot: M18Slot,
  optionId: unknown,
): M18Option | undefined {
  return slot === 'diagnosis'
    ? m18PartOption(caseId, optionId)
    : m18StepOption(caseId, optionId);
}

/** Whether an id is any option of the series (any case, either slot). */
export function m18OptionOfSeries(
  optionId: unknown,
): { caseId: M18CaseId; slot: M18Slot; option: M18Option } | undefined {
  for (const entry of M18_CASES) {
    const part = entry.parts.find((option) => option.id === optionId);

    if (part !== undefined) {
      return { caseId: entry.id, slot: 'diagnosis', option: part };
    }

    const step = entry.steps.find((option) => option.id === optionId);

    if (step !== undefined) {
      return { caseId: entry.id, slot: 'prediction', option: step };
    }
  }

  return undefined;
}

/** The content key of a case and slot (decision D-U20-1, items 1 and 2). */
export function m18KeyOptionId(caseId: M18CaseId, slot: M18Slot): string {
  const entry = m18Case(caseId);

  return slot === 'diagnosis'
    ? entry.key_part_option_id
    : entry.key_step_option_id;
}

/** The result a test shows under the case's authored fault (the key part). */
export function m18ResultFor(caseId: M18CaseId, testId: string): string {
  const entry = m18Case(caseId);

  return entry.fault_table[entry.key_part_option_id][testId];
}

/** The line a test shows for a result id (undefined for an unknown pair). */
export function m18ResultLine(
  caseId: M18CaseId,
  testId: string,
  resultId: string,
): string | undefined {
  return m18Test(caseId, testId)?.lines[resultId];
}

/**
 * The parts still consistent with the authored results of the tests named
 * (the "if at fault" table): a part is consistent when every named test
 * would show, were that part at fault, exactly what it shows in the case.
 */
export function m18ConsistentParts(
  caseId: M18CaseId,
  testIds: readonly string[],
): string[] {
  const entry = m18Case(caseId);
  const known = testIds.filter((id) =>
    entry.tests.some((candidate) => candidate.id === id),
  );

  return entry.parts
    .filter((part) =>
      known.every(
        (id) => entry.fault_table[part.id][id] === m18ResultFor(caseId, id),
      ),
    )
    .map((part) => part.id);
}

/** The step option a recorded part implies (preview §5.2); undefined for an unknown part. */
export function m18ImpliedStep(
  caseId: M18CaseId,
  partOptionId: unknown,
): string | undefined {
  return typeof partOptionId === 'string'
    ? m18Case(caseId).implied_step[partOptionId]
    : undefined;
}

/**
 * Every participant-facing string of the board other than the sheets, tests,
 * options and results lines (preview §3). Fixed in meaning; never shortened.
 */
export const M18_TEXT = {
  title: 'DIAGNOSTIC BOARD',
  subtitle: (index: number) => `Case ${index} of 3`,
  intro: [
    'The storm left three units of the test rig with one part at fault each.',
    'They are three separate cases. You take them one at a time.',
    "In each case, run the board's tests as often as you like, then record the part you think is at fault.",
    'Then answer one question: what will a planned step on that unit show?',
    "A case's tests close when its part is recorded. Each recorded answer is final.",
    'Results come after all three cases.',
  ],
  start_case_1: 'START CASE 1',
  status_case: 'Run any tests, then choose the part at fault and record it.',
  status_step: (part: string) =>
    `Recorded part: ${part}. The tests are closed; the record stays.`,
  status_recorded: (count: number) => `${count} of 3 cases recorded.`,
  results_status: 'Your answers are fixed. This view only shows them.',
  status_record: (parts: number, steps: number) =>
    `Parts recorded: ${parts} of 3 · planned steps recorded: ${steps} of 3.`,
  question: (index: number) =>
    `Which part is at fault in case ${index}? Choose one, then record it.`,
  not_run_yet: 'not run yet',
  not_run: 'not run',
  record_part: 'RECORD PART  [R]',
  record_answer: 'RECORD ANSWER  [R]',
  cannot_solve: 'CANNOT SOLVE  [N]',
  help: 'HELP  [H]',
  leave: 'LEAVE BOARD',
  next_case: 'NEXT CASE',
  show_results: 'SHOW RESULTS',
  next: 'NEXT',
  back: 'BACK',
  finish: 'FINISH',
  close_help: 'CLOSE HELP  [H]',
  choose_part_first: 'Choose a part first.',
  choose_answer_first: 'Choose an answer first.',
  confirm_part: (part: string, index: number) =>
    `Record ${part} as the part at fault in case ${index}?\nThe tests then close; the test record stays.\nIt cannot be changed afterwards.`,
  confirm_cannot_solve_part: (index: number) =>
    `Record CANNOT SOLVE for the part in case ${index}?\nThe tests then close; the test record stays.\nIt cannot be changed afterwards.`,
  confirm_answer: (answer: string, index: number) =>
    `Record this answer for case ${index}'s planned step?\n${answer}\nIt cannot be changed afterwards.`,
  confirm_cannot_solve_step: (index: number) =>
    `Record CANNOT SOLVE for case ${index}'s planned step?\nIt cannot be changed afterwards.`,
  confirm_part_control: 'RECORD PART  [ENTER]',
  confirm_answer_control: 'RECORD ANSWER  [ENTER]',
  confirm_record_control: 'RECORD  [ENTER]',
  keep_working: 'KEEP WORKING  [ESC]',
  acknowledgement: (index: number) => `Case ${index} recorded.`,
  help_title: 'HOW THE BOARD WORKS',
  help_lines: [
    'Each case: run any of its tests (A-C) as often as you like; every result stays in the test record.',
    'Then choose the part at fault (1-4) and RECORD PART, or CANNOT SOLVE, and confirm.',
    "Recording the part closes that case's tests; the test record stays on screen.",
    'Then the planned step: choose an answer (1-4) and RECORD ANSWER, or CANNOT SOLVE, and confirm.',
    'Only confirming records an answer. A recorded answer cannot be changed.',
    'Results come after all three cases; FINISH or ESC closes them.',
    'TAB moves focus. ENTER selects the focused control.',
    'Keys: A-C test · 1-4 choose · R record · N cannot solve · H help · ESC leaves (work kept).',
  ],
  results_title: (index: number) => `RESULTS — CASE ${index} OF 3`,
  results_first_line: 'All three cases are recorded.',
  cannot_solve_recorded: 'CANNOT SOLVE',
  results_part_line: (prefix: string, recorded: string) =>
    `${prefix} · Your recorded part: ${recorded}`,
  results_step_line: (prefix: string, recorded: string) =>
    `${prefix} · Your recorded answer: ${recorded}`,
  closed_at_review: 'Station record closed — the board keeps its record.',
  held_back:
    'This board was already used in this session. Its record is kept; no further answers can be given here.',
  fault: 'The board has a fault and is closed. Recorded answers are kept.',
  footer_card:
    'TAB moves focus · ENTER selects · H help · ESC leaves (work kept)',
  footer_case:
    'A-C test · 1-4 choose · R record · N cannot solve · TAB focus · H help · ESC leaves (work kept)',
  footer_step:
    '1-4 choose · R record · N cannot solve · TAB focus · H help · ESC leaves (work kept)',
  footer_dialog: 'ENTER records · ESC keeps working',
  footer_help: 'H or ESC closes the help',
  footer_record: 'ESC leaves',
} as const;

/** The six results lines of a case for a recorded part and answer (names or CANNOT SOLVE). */
export function m18ResultsLines(
  entry: M18Case,
  recordedPart: string,
  recordedStep: string,
): string[] {
  return [
    entry.results.heading,
    M18_TEXT.results_part_line(entry.results.part_line_prefix, recordedPart),
    entry.results.part_explanation[0],
    entry.results.part_explanation[1],
    M18_TEXT.results_step_line(entry.results.step_line_prefix, recordedStep),
    entry.results.step_explanation,
  ];
}

/** The strings of the cases (sheets, tests, record labels, result lines, options, steps). */
function caseStrings(withResults: boolean): string[] {
  const strings: string[] = [];

  for (const entry of M18_CASES) {
    strings.push(...entry.sheet_lines, M18_TEXT.question(entry.index));

    for (const item of entry.tests) {
      strings.push(item.button, item.record_label);

      for (const id of item.result_ids) {
        strings.push(item.lines[id]);
      }
    }

    for (const option of entry.parts) {
      strings.push(option.label);
      strings.push(M18_TEXT.confirm_part(option.name, entry.index));
      strings.push(M18_TEXT.status_step(option.name));
    }

    strings.push(entry.step_text);

    for (const option of entry.steps) {
      strings.push(option.label);
      strings.push(M18_TEXT.confirm_answer(option.name, entry.index));
    }

    if (withResults) {
      const key = entry.parts.find(
        (option) => option.id === entry.key_part_option_id,
      )!;
      const step = entry.steps.find(
        (option) => option.id === entry.key_step_option_id,
      )!;

      strings.push(
        ...m18ResultsLines(entry, key.name, step.name),
        ...m18ResultsLines(
          entry,
          M18_TEXT.cannot_solve_recorded,
          M18_TEXT.cannot_solve_recorded,
        ),
      );
    }
  }

  return strings;
}

/** The fixed strings shared by every view, before and after completion. */
function sharedStrings(): string[] {
  const T = M18_TEXT;
  const strings: string[] = [
    T.title,
    ...T.intro,
    T.start_case_1,
    T.status_case,
    T.status_step(T.cannot_solve_recorded),
    T.not_run_yet,
    T.not_run,
    T.record_part,
    T.record_answer,
    T.cannot_solve,
    T.help,
    T.leave,
    T.next_case,
    T.show_results,
    T.next,
    T.back,
    T.finish,
    T.close_help,
    T.choose_part_first,
    T.choose_answer_first,
    T.confirm_part_control,
    T.confirm_answer_control,
    T.confirm_record_control,
    T.keep_working,
    T.help_title,
    ...T.help_lines,
    T.closed_at_review,
    T.held_back,
    T.fault,
    T.footer_card,
    T.footer_case,
    T.footer_step,
    T.footer_dialog,
    T.footer_help,
    T.footer_record,
  ];

  for (let index = 1; index <= M18_CASES_PLANNED; index += 1) {
    strings.push(
      T.subtitle(index),
      T.confirm_cannot_solve_part(index),
      T.confirm_cannot_solve_step(index),
      T.acknowledgement(index),
    );
  }

  for (let count = 0; count <= M18_CASES_PLANNED; count += 1) {
    strings.push(T.status_recorded(count));

    for (let steps = 0; steps <= count; steps += 1) {
      strings.push(T.status_record(count, steps));
    }
  }

  return strings;
}

/**
 * Every participant-facing string of the board, for the wording tests: the
 * cases (sheets, tests, record labels, result lines, options, steps, results
 * lines) and the fixed strings.
 */
export function m18ParticipantStrings(): string[] {
  const strings = [...caseStrings(true), ...sharedStrings()];
  const T = M18_TEXT;

  for (let index = 1; index <= M18_CASES_PLANNED; index += 1) {
    strings.push(T.results_title(index));
  }

  strings.push(T.results_status, T.results_first_line);

  return strings;
}

/** The strings a participant can see before the sixth first response. */
export function m18PreCompletionStrings(): string[] {
  return [...caseStrings(false), ...sharedStrings()];
}

/** The strings of the first-opening card and the help sheet (they name no case). */
export function m18IntroAndHelpStrings(): string[] {
  return [
    M18_TEXT.title,
    ...M18_TEXT.intro,
    M18_TEXT.start_case_1,
    M18_TEXT.help_title,
    ...M18_TEXT.help_lines,
    M18_TEXT.close_help,
  ];
}
