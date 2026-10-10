/**
 * M15 — the approved content of the two relay boxes (Station 080 M01–M26
 * run, Unit 18; administration `m15-systems-v1`).
 *
 * PURE module (no Phaser, no runtime, no `import.meta`): the two boxes of
 * `U18-STIMULUS-PREVIEW.md` (revision r5) exactly as approved by the
 * research owner's decision D-U18-1 of 10 October 2026 — per box two
 * dials, three units, the station wiring (four directed links), four
 * offered wiring options, two keyed questions about situations the bench
 * never shows (one LOCK, one BOOST) with three options each, the keys and
 * the results lines — together with every participant-facing string of
 * the bench (orientation, status lines, help, confirmations,
 * acknowledgements, results, closed records).
 *
 * Nothing here is re-authored by the implementer: a defect found in a key
 * or a wiring option is recorded for the owner, never corrected here. The
 * test listings are NOT stored beside the wiring: the model's simulator
 * (`m15SystemsModel.ts`) derives them from the links, and the pure spec
 * checks them against the preview with its own simulator. The keys are
 * the authored content's answers under the rules the participant is
 * given; their logical correctness does not establish empirical validity,
 * and the four predictions are clustered observations inside one bench
 * episode. No questionnaire wording appears anywhere in this file.
 */

export const M15_FAMILY = 'proto_m15_systems_';
export const M15_OPPORTUNITY_ID = 'proto_m15_systems_series';
/** The kit's own window id (the first box's window). */
export const M15_WINDOW_ID = 'm15_system_s1';
export const M15_ENTRY_STATE_VERSION = 'm15-systems-v1';
export const M15_OBJECT_ID = 'm15_relay_bench';
export const M15_SCENE = 'diagnostics_laboratory';
export const M15_BOXES_PLANNED = 2;
export const M15_PREDICTIONS_PLANNED = 4;
/** A press inside this window after a view or a dialog appeared changes nothing. */
export const M15_SETTLE_MS = 400;

export type M15BoxId = 's1' | 's2';
export type M15LinkKind = 'raises' | 'lowers';
export type M15WiringLetter = 'a' | 'b' | 'c' | 'd';
export type M15AnswerLetter = 'a' | 'b' | 'c';
/** The three outcomes of one unit (the complete outcome space). */
export type M15Direction = 'up' | 'down' | 'none';

export const M15_BOX_IDS: readonly M15BoxId[] = ['s1', 's2'];
export const M15_BOX_WINDOW_IDS: Record<M15BoxId, string> = {
  s1: 'm15_system_s1',
  s2: 'm15_system_s2',
};
export const M15_WIRING_LETTERS: readonly M15WiringLetter[] = [
  'a',
  'b',
  'c',
  'd',
];
export const M15_ANSWER_LETTERS: readonly M15AnswerLetter[] = ['a', 'b', 'c'];
/** The fixed answer order: A goes up · B goes down · C does not move. */
export const M15_ANSWER_DIRECTIONS: Record<M15AnswerLetter, M15Direction> = {
  a: 'up',
  b: 'down',
  c: 'none',
};
export const M15_ANSWER_PHRASES: Record<M15AnswerLetter, string> = {
  a: 'goes up',
  b: 'goes down',
  c: 'does not move',
};

export interface M15Dial {
  id: string;
  /** The single capital letter shown to the participant. */
  letter: string;
  /** The TEST hotkey ('1' | '2'). */
  hotkey: string;
}

export interface M15Unit {
  id: string;
  letter: string;
}

/** A directed link from a dial or unit to a unit. */
export interface M15Link {
  from: string;
  to: string;
  kind: M15LinkKind;
}

export interface M15WiringOption {
  id: string;
  letter: M15WiringLetter;
  /** The approved one-line text (preview §4.3 / §5.3). */
  text: string;
  /** The same wiring as a link set (the text is derived from it). */
  links: readonly M15Link[];
}

/** A question's situation as data (never an exploration act). */
export interface M15Situation {
  locked_unit_ids: readonly string[];
  boosted_unit_ids: readonly string[];
  dials_turned_ids: readonly string[];
}

export interface M15AnswerOption {
  id: string;
  letter: M15AnswerLetter;
  /** "<unit> goes up" etc. */
  label: string;
}

export interface M15Question {
  id: string;
  box_id: M15BoxId;
  /** 1–2 inside the box. */
  index: number;
  /** 1–4 across the series. */
  global_index: number;
  short_title: string;
  text: string;
  asked_unit_id: string;
  situation: M15Situation;
  options: readonly M15AnswerOption[];
  key_option_id: string;
  /** The approved results line (shown only after the fourth answer). */
  results_line: string;
}

export interface M15Box {
  id: M15BoxId;
  /** 1–2. */
  index: number;
  content_version: string;
  title: string;
  dials: readonly M15Dial[];
  units: readonly M15Unit[];
  /** The station wiring. */
  links: readonly M15Link[];
  wiring_options: readonly M15WiringOption[];
  wiring_key_option_id: string;
  questions: readonly M15Question[];
}

function link(from: string, to: string, kind: M15LinkKind): M15Link {
  return { from, to, kind };
}

/** The one-line text of a link set, in the authored order. */
export function m15WiringText(
  box: Pick<M15Box, 'dials' | 'units'>,
  links: readonly M15Link[],
): string {
  const letter = (id: string) =>
    [...box.dials, ...box.units].find((node) => node.id === id)?.letter ?? id;

  return links
    .map((entry) => `${letter(entry.from)} ${entry.kind} ${letter(entry.to)}.`)
    .join(' ');
}

function wiring(
  box: Pick<M15Box, 'id' | 'dials' | 'units'>,
  letter: M15WiringLetter,
  links: readonly M15Link[],
): M15WiringOption {
  return {
    id: `${box.id}_w_${letter}`,
    letter,
    text: m15WiringText(box, links),
    links,
  };
}

function question(
  box: Pick<M15Box, 'id' | 'units'>,
  index: number,
  shortTitle: string,
  text: string,
  askedUnitId: string,
  situation: M15Situation,
  key: M15AnswerLetter,
  resultsLine: string,
): M15Question {
  const id = `${box.id}_q${index}`;
  const unit = box.units.find((entry) => entry.id === askedUnitId)!.letter;

  return {
    id,
    box_id: box.id,
    index,
    global_index: (box.id === 's1' ? 0 : 2) + index,
    short_title: shortTitle,
    text,
    asked_unit_id: askedUnitId,
    situation,
    options: M15_ANSWER_LETTERS.map((letter) => ({
      id: `${id}_${letter}`,
      letter,
      label: `${unit} ${M15_ANSWER_PHRASES[letter]}`,
    })),
    key_option_id: `${id}_${key}`,
    results_line: resultsLine,
  };
}

/** Box 1 — two dials converge on a hub that drives two units. */
const S1_NODES = {
  id: 's1' as const,
  dials: [
    { id: 's1_f', letter: 'F', hotkey: '1' },
    { id: 's1_g', letter: 'G', hotkey: '2' },
  ],
  units: [
    { id: 's1_p', letter: 'P' },
    { id: 's1_q', letter: 'Q' },
    { id: 's1_w', letter: 'W' },
  ],
};

const BOX_1: M15Box = {
  ...S1_NODES,
  index: 1,
  content_version: 'm15-s1-v1',
  title: 'RELAY BOX 1 OF 2',
  links: [
    link('s1_f', 's1_p', 'raises'),
    link('s1_g', 's1_p', 'raises'),
    link('s1_p', 's1_q', 'lowers'),
    link('s1_p', 's1_w', 'raises'),
  ],
  wiring_options: [
    // The owner's selected alternative (decision D-U18-1, item 1).
    wiring(S1_NODES, 'a', [
      link('s1_f', 's1_w', 'raises'),
      link('s1_g', 's1_w', 'raises'),
      link('s1_p', 's1_q', 'raises'),
      link('s1_w', 's1_p', 'lowers'),
    ]),
    wiring(S1_NODES, 'b', [
      link('s1_f', 's1_p', 'raises'),
      link('s1_g', 's1_p', 'raises'),
      link('s1_p', 's1_q', 'lowers'),
      link('s1_p', 's1_w', 'raises'),
    ]),
    wiring(S1_NODES, 'c', [
      link('s1_f', 's1_w', 'raises'),
      link('s1_g', 's1_p', 'raises'),
      link('s1_p', 's1_q', 'lowers'),
      link('s1_p', 's1_w', 'raises'),
    ]),
    wiring(S1_NODES, 'd', [
      link('s1_f', 's1_p', 'raises'),
      link('s1_g', 's1_w', 'raises'),
      link('s1_p', 's1_q', 'lowers'),
      link('s1_p', 's1_w', 'raises'),
    ]),
  ],
  wiring_key_option_id: 's1_w_b',
  questions: [
    question(
      S1_NODES,
      1,
      'P locked; F and G up',
      'Unit P is LOCKED. Dials F and G are turned up together, one notch each. What does unit W do?',
      's1_w',
      {
        locked_unit_ids: ['s1_p'],
        boosted_unit_ids: [],
        dials_turned_ids: ['s1_f', 's1_g'],
      },
      'c',
      'With P locked, neither dial gets past P, and only P drives W. W does not move.',
    ),
    question(
      S1_NODES,
      2,
      'W locked; P boosted',
      'Unit W is LOCKED and unit P is BOOSTED; no dial moves. What does unit Q do?',
      's1_q',
      {
        locked_unit_ids: ['s1_w'],
        boosted_unit_ids: ['s1_p'],
        dials_turned_ids: [],
      },
      'b',
      'P lowers Q directly; W drives nothing, so locking W changes nothing for Q. Q goes down.',
    ),
  ],
};

/** Box 2 — a three-step chain with inversions and a second dial entering mid-chain. */
const S2_NODES = {
  id: 's2' as const,
  dials: [
    { id: 's2_s', letter: 'S', hotkey: '1' },
    { id: 's2_t', letter: 'T', hotkey: '2' },
  ],
  units: [
    { id: 's2_x', letter: 'X' },
    { id: 's2_y', letter: 'Y' },
    { id: 's2_z', letter: 'Z' },
  ],
};

const BOX_2: M15Box = {
  ...S2_NODES,
  index: 2,
  content_version: 'm15-s2-v1',
  title: 'RELAY BOX 2 OF 2',
  links: [
    link('s2_s', 's2_x', 'lowers'),
    link('s2_x', 's2_y', 'raises'),
    link('s2_y', 's2_z', 'lowers'),
    link('s2_t', 's2_y', 'lowers'),
  ],
  wiring_options: [
    wiring(S2_NODES, 'a', [
      link('s2_s', 's2_x', 'lowers'),
      link('s2_x', 's2_y', 'lowers'),
      link('s2_y', 's2_z', 'lowers'),
      link('s2_t', 's2_y', 'lowers'),
    ]),
    wiring(S2_NODES, 'b', [
      link('s2_s', 's2_x', 'lowers'),
      link('s2_x', 's2_y', 'lowers'),
      link('s2_y', 's2_z', 'lowers'),
      link('s2_t', 's2_z', 'raises'),
    ]),
    wiring(S2_NODES, 'c', [
      link('s2_s', 's2_x', 'lowers'),
      link('s2_x', 's2_y', 'raises'),
      link('s2_y', 's2_z', 'lowers'),
      link('s2_t', 's2_z', 'raises'),
    ]),
    wiring(S2_NODES, 'd', [
      link('s2_s', 's2_x', 'lowers'),
      link('s2_x', 's2_y', 'raises'),
      link('s2_y', 's2_z', 'lowers'),
      link('s2_t', 's2_y', 'lowers'),
    ]),
  ],
  wiring_key_option_id: 's2_w_d',
  questions: [
    question(
      S2_NODES,
      1,
      'X boosted',
      'Nothing is locked and no dial moves. Unit X is BOOSTED. What does unit Z do?',
      's2_z',
      {
        locked_unit_ids: [],
        boosted_unit_ids: ['s2_x'],
        dials_turned_ids: [],
      },
      'b',
      'X raises Y, and Y lowers Z: when X goes up, Y goes up and then Z goes down.',
    ),
    question(
      S2_NODES,
      2,
      'Y locked; T up',
      'Unit Y is LOCKED. Dial T is turned up one notch. What does unit Z do?',
      's2_z',
      {
        locked_unit_ids: ['s2_y'],
        boosted_unit_ids: [],
        dials_turned_ids: ['s2_t'],
      },
      'c',
      'T reaches Z only through Y. With Y locked, the change stops at Y. Z does not move.',
    ),
  ],
};

/** The two boxes in the fixed, assigned order (decision D-U18-1, item 7). */
export const M15_BOXES: readonly M15Box[] = [BOX_1, BOX_2];
export const M15_ASSIGNED_BOX_ORDER: readonly M15BoxId[] = ['s1', 's2'];
export const M15_CONTENT_VERSIONS: Record<M15BoxId, string> = {
  s1: BOX_1.content_version,
  s2: BOX_2.content_version,
};

export function isM15BoxId(value: unknown): value is M15BoxId {
  return value === 's1' || value === 's2';
}

export function m15Box(id: M15BoxId): M15Box {
  return id === 's1' ? BOX_1 : BOX_2;
}

/** Every question in series order (`s1_q1` … `s2_q2`). */
export function m15Questions(): M15Question[] {
  return M15_BOXES.flatMap((box) => [...box.questions]);
}

export function m15Question(id: string): M15Question | undefined {
  return m15Questions().find((candidate) => candidate.id === id);
}

export function isM15QuestionId(value: unknown): boolean {
  return typeof value === 'string' && m15Question(value) !== undefined;
}

export function m15WiringOption(
  box: M15BoxId,
  optionId: string,
): M15WiringOption | undefined {
  return m15Box(box).wiring_options.find((option) => option.id === optionId);
}

export function m15AnswerOption(
  questionId: string,
  optionId: string,
): M15AnswerOption | undefined {
  return m15Question(questionId)?.options.find(
    (option) => option.id === optionId,
  );
}

/** The key of a question: the authored option (decision D-U18-1, item 1). */
export function m15KeyOptionId(questionId: string): string | undefined {
  return m15Question(questionId)?.key_option_id;
}

export function m15DialLetter(box: M15Box, dialId: string): string {
  return box.dials.find((dial) => dial.id === dialId)?.letter ?? dialId;
}

export function m15UnitLetter(box: M15Box, unitId: string): string {
  return box.units.find((unit) => unit.id === unitId)?.letter ?? unitId;
}

/**
 * Every participant-facing string of the bench other than the boxes
 * (preview r5 §3). Fixed in meaning; never shortened.
 */
export const M15_TEXT = {
  title: 'RELAY BOXES',
  orientation: [
    'Two relay boxes came in from the storm relay. Each has two dials and three units.',
    'TEST a dial: the bench turns it up one notch and shows, step by step, what moves.',
    'Whatever moves passes the change on, one step later, to each unit it drives.',
    '"J raises M": M moves the same way as J, one step later.',
    '"K lowers N": N moves the opposite way to K, one step later.',
    'Example (not one of the boxes) - TEST J: step 1: M up · step 2: N down',
    '   This means: J raises M, and M lowers N.',
    'For each box: test the dials, record the wiring that fits your tests, then answer two questions about situations the bench cannot test:',
    '   LOCK a unit - it is held still and does not move.',
    '   BOOST a unit - the unit itself goes up one notch.',
    'Recorded answers cannot be changed. Results come after both boxes.',
  ],
  start_box_1: 'START BOX 1',
  subtitle_wiring: 'Wiring',
  subtitle_question: (index: number) => `Question ${index} of 2`,
  status_wiring:
    'Test the dials as often as you like, then record the wiring that fits.',
  status_tests_closed: 'Tests closed. The test record stays on the bench.',
  status_question:
    'Use the test record and the wiring you recorded. Choose an answer, then record it.',
  status_answers: (count: number) => `${count} of 4 answers recorded.`,
  bench_parts: (box: M15Box) =>
    `Dials ${box.dials.map((dial) => dial.letter).join(' and ')} · units ${box.units.map((unit) => unit.letter).join(', ')}`,
  test_dial: (letter: string, hotkey: string) =>
    `TEST DIAL ${letter}  [${hotkey}]`,
  tests_closed: 'Tests closed',
  record_title: 'TEST RECORD',
  record_line: (letter: string, listing: string | null) =>
    `TEST ${letter}  ${listing ?? 'not run yet'}`,
  wiring_heading: (index: number) =>
    `WIRING OF BOX ${index} — which one fits your tests?`,
  wiring_instruction:
    'Choose the wiring (A-D) that fits your tests, then record it. Recording closes the tests; the test record stays.',
  record_wiring: 'RECORD WIRING  [R]',
  cannot_tell: 'CANNOT TELL  [N]',
  choose_wiring_first: 'Choose a wiring first.',
  recorded_wiring_title: 'YOUR RECORDED WIRING',
  cannot_tell_recorded: 'CANNOT TELL',
  question_heading: (index: number) => `QUESTION ${index} OF 2`,
  record_answer: 'RECORD ANSWER  [R]',
  cannot_solve: 'CANNOT SOLVE  [N]',
  choose_answer_first: 'Choose an answer first.',
  help: 'HELP  [H]',
  leave: 'LEAVE BENCH',
  footer:
    '1 2 test · A-D choose · R record · N cannot · H help · ESC leaves (work kept)',
  confirm_wiring: (letter: string, index: number) =>
    `Record wiring ${letter} for box ${index}?\nThe tests then close; the test record stays.\nIt cannot be changed afterwards.`,
  confirm_cannot_tell: (index: number) =>
    `Record CANNOT TELL for box ${index}?\nThe tests then close; the test record stays.\nIt cannot be changed afterwards.`,
  confirm_answer: (index: number) =>
    `Record this answer for question ${index}?\nIt cannot be changed afterwards.`,
  confirm_cannot_solve: (index: number) =>
    `Record CANNOT SOLVE for question ${index}?\nIt cannot be changed afterwards.`,
  confirm_wiring_control: 'RECORD WIRING  [ENTER]',
  confirm_record_control: 'RECORD  [ENTER]',
  confirm_answer_control: 'RECORD ANSWER  [ENTER]',
  keep_working: 'KEEP WORKING  [ESC]',
  acknowledgement_wiring: (index: number) =>
    `Wiring recorded for box ${index}.`,
  first_question: 'FIRST QUESTION',
  acknowledgement_answer: (index: number) =>
    `Answer recorded for question ${index}.`,
  next_question: 'NEXT QUESTION',
  next_box: 'NEXT BOX',
  show_results: 'SHOW RESULTS',
  help_title: 'HOW THE BENCH WORKS',
  help_lines: [
    'TEST a dial (1 or 2): it goes up one notch; the bench lists what moves at each step.',
    'Whatever moves passes the change on, one step later, to each unit it drives.',
    '"raises": same direction. "lowers": opposite direction.',
    'LOCK: the unit is held still and does not move. BOOST: the unit itself goes up one notch.',
    'Tests stay open until you record the wiring; the test record stays on the bench.',
    'Only RECORD WIRING / RECORD ANSWER, or CANNOT TELL / CANNOT SOLVE, after confirming, records anything.',
    'Keys: 1 2 test · A-D choose · R record · N cannot · H help · ESC leave (work kept).',
  ],
  close_help: 'CLOSE HELP  [H]',
  results_title: (index: number) => `RESULTS — RELAY BOX ${index} OF 2`,
  results_status: 'Your answers are fixed. This view only shows them.',
  results_first_line: 'All four answers are recorded.',
  your_wiring: 'Your recorded wiring:',
  station_wiring: 'Station wiring:',
  results_question: (index: number, shortTitle: string) =>
    `QUESTION ${index} — ${shortTitle}`,
  your_answer: 'Your recorded answer:',
  station_answer: 'Station answer:',
  cannot_solve_answer: 'CANNOT SOLVE',
  back: 'BACK',
  finish: 'FINISH',
  closed_at_review: 'Station record closed — the bench keeps its record.',
  held_back:
    'This bench was already used in this session. Its record is kept; nothing further is recorded here.',
  fault: 'The bench has a fault and is closed. Recorded answers are kept.',
  footer_dialog: 'ENTER records · ESC keeps working',
  footer_help: 'H or ESC closes the help',
  footer_orientation: 'ENTER starts · H help · ESC leaves',
  footer_results:
    'ENTER on the focused control · H help · ESC leaves (answers fixed)',
  footer_record: 'ESC leaves',
} as const;

/** The box strings: title, parts line, options, questions, answers, results lines. */
function boxStrings(box: M15Box, withResults: boolean): string[] {
  const strings: string[] = [box.title, M15_TEXT.bench_parts(box)];

  for (const dial of box.dials) {
    strings.push(
      M15_TEXT.test_dial(dial.letter, dial.hotkey),
      M15_TEXT.record_line(dial.letter, null),
    );
  }

  for (const option of box.wiring_options) {
    strings.push(option.text);
  }

  for (const entry of box.questions) {
    strings.push(entry.text);

    for (const option of entry.options) {
      strings.push(option.label);
    }

    if (withResults) {
      strings.push(entry.short_title, entry.results_line);
    }
  }

  return strings;
}

/**
 * Every participant-facing string of the bench, for the wording tests:
 * the boxes (titles, dial and unit lines, wiring options, questions,
 * answer options, short titles, results lines) and the fixed strings.
 */
export function m15ParticipantStrings(): string[] {
  const strings: string[] = [];

  for (const box of M15_BOXES) {
    strings.push(...boxStrings(box, true));
  }

  for (const value of Object.values(M15_TEXT)) {
    if (typeof value === 'string') {
      strings.push(value);
    } else if (Array.isArray(value)) {
      strings.push(...value);
    }
  }

  const T = M15_TEXT;

  for (let index = 1; index <= 2; index += 1) {
    strings.push(
      T.subtitle_question(index),
      T.wiring_heading(index),
      T.question_heading(index),
      T.confirm_wiring('A', index),
      T.confirm_wiring('D', index),
      T.confirm_cannot_tell(index),
      T.confirm_answer(index),
      T.confirm_cannot_solve(index),
      T.acknowledgement_wiring(index),
      T.acknowledgement_answer(index),
      T.results_title(index),
    );
  }

  for (let count = 0; count <= 4; count += 1) {
    strings.push(T.status_answers(count));
  }

  for (const box of M15_BOXES) {
    for (const entry of box.questions) {
      strings.push(T.results_question(entry.index, entry.short_title));
    }
  }

  return strings;
}

/** The strings of the first-response phase (before the fourth answer). */
export function m15FirstResponsePhaseStrings(): string[] {
  const strings: string[] = [];

  for (const box of M15_BOXES) {
    strings.push(...boxStrings(box, false));
  }

  const T = M15_TEXT;

  strings.push(
    T.title,
    ...T.orientation,
    T.start_box_1,
    T.subtitle_wiring,
    T.status_wiring,
    T.status_tests_closed,
    T.status_question,
    T.tests_closed,
    T.record_title,
    T.wiring_instruction,
    T.record_wiring,
    T.cannot_tell,
    T.choose_wiring_first,
    T.recorded_wiring_title,
    T.cannot_tell_recorded,
    T.record_answer,
    T.cannot_solve,
    T.choose_answer_first,
    T.help,
    T.leave,
    T.footer,
    T.confirm_wiring_control,
    T.confirm_record_control,
    T.confirm_answer_control,
    T.keep_working,
    T.first_question,
    T.next_question,
    T.next_box,
    T.show_results,
    T.help_title,
    ...T.help_lines,
    T.close_help,
    T.closed_at_review,
    T.held_back,
    T.fault,
    T.footer_dialog,
    T.footer_help,
    T.footer_orientation,
    T.footer_record,
  );

  for (let index = 1; index <= 2; index += 1) {
    strings.push(
      T.subtitle_question(index),
      T.wiring_heading(index),
      T.question_heading(index),
      T.confirm_wiring('A', index),
      T.confirm_wiring('B', index),
      T.confirm_wiring('C', index),
      T.confirm_wiring('D', index),
      T.confirm_cannot_tell(index),
      T.confirm_answer(index),
      T.confirm_cannot_solve(index),
      T.acknowledgement_wiring(index),
      T.acknowledgement_answer(index),
    );
  }

  for (let count = 0; count <= 4; count += 1) {
    strings.push(T.status_answers(count));
  }

  return strings;
}

/**
 * The strings of the orientation card and the help sheet — they must name
 * no dial or unit of either box (the wording test checks the standalone
 * letters F, G, P, Q, W, S, T, X, Y, Z).
 */
export function m15OrientationAndHelpStrings(): string[] {
  return [
    M15_TEXT.title,
    ...M15_TEXT.orientation,
    M15_TEXT.start_box_1,
    M15_TEXT.help_title,
    ...M15_TEXT.help_lines,
    M15_TEXT.close_help,
  ];
}
