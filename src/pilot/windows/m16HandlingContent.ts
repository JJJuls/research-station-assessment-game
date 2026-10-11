/**
 * M16 — the approved content of the handling rule at the protocol console
 * (Station 080 M01–M26 run, Unit 19; administration `m16-handling-v1`).
 *
 * PURE module (no Phaser, no runtime, no `import.meta`): the administration
 * of `U19-STIMULUS-PREVIEW.md` (revision r3) exactly as approved by the
 * research owner's decision D-U19-1 of 11 October 2026 with amendment A1 —
 * the first-opening card, the rule card (nine fixed lines), the two passive
 * worked examples of identical structure, the boundary confirmation, the six
 * application vials with their labels as data (site, depth, marks), the four
 * drawer options in fixed order, the keys, the results explanation lines and
 * every participant-facing string of the console (confirmations,
 * acknowledgements, help, closed records).
 *
 * Nothing here is re-authored by the implementer: a defect found in a key, a
 * label or a worked step is recorded for the owner, never corrected here.
 * The keys are stored as approved data; the pure spec re-derives them with
 * its own transcription and rule function (contract §12 P1), never by
 * importing them. Their logical correctness does not establish empirical
 * validity, and the six applications are clustered observations of one rule
 * inside one console episode. No questionnaire wording appears anywhere in
 * this file.
 */

export const M16_FAMILY = 'proto_m16_handling_';
export const M16_OPPORTUNITY_ID = 'proto_m16_handling_series';
export const M16_WINDOW_ID = 'm16_handling_w1';
export const M16_ENTRY_STATE_VERSION = 'm16-handling-v1';
export const M16_FORM_ID = 'm16-form-1';
export const M16_RULE_VERSION = 'm16-rule-v1';
export const M16_EXAMPLES_VERSION = 'm16-examples-v1';
export const M16_OBJECT_ID = 'm16_protocol_console';
export const M16_SCENE = 'diagnostics_laboratory';
export const M16_VIALS_PLANNED = 6;
export const M16_EXAMPLES_PLANNED = 2;
/** A press inside this window after a view or a dialog appeared changes nothing. */
export const M16_SETTLE_MS = 400;

export type M16Site = 'ORLA' | 'VESK';
export type M16Marks = 'none' | 'STAR' | 'RING' | 'STAR, RING';
export type M16Drawer = 1 | 2 | 3 | 4;
export type M16ExampleId = 'm16_e1' | 'm16_e2';
export type M16VialId =
  | 'm16_v1'
  | 'm16_v2'
  | 'm16_v3'
  | 'm16_v4'
  | 'm16_v5'
  | 'm16_v6';

/** A label as data: the site, the depth in metres and the marks. */
export interface M16Label {
  site: M16Site;
  depth_m: number;
  marks: M16Marks;
}

export interface M16Option {
  id: string;
  drawer: M16Drawer;
  /** `DRAWER n  [n]` (the tile text). */
  label: string;
}

export interface M16Vial {
  id: M16VialId;
  /** 1–6. */
  index: number;
  label: M16Label;
  options: readonly M16Option[];
  key_option_id: string;
  key_drawer: M16Drawer;
  /** The two approved explanation lines (shown only after the sixth answer). */
  explanation: readonly [string, string];
}

export interface M16Example {
  id: M16ExampleId;
  /** 1–2. */
  index: number;
  label: M16Label;
  /** The seven approved lines of the example block (preview §4). */
  lines: readonly string[];
  result_drawer: M16Drawer;
}

/** The nine fixed lines of the rule card (preview §3.2). */
export const M16_RULE_CARD_LINES: readonly string[] = [
  'HANDLING RULE',
  '                ORLA column    VESK column',
  '   TOP row      DRAWER 1       DRAWER 2',
  '   BOTTOM row   DRAWER 3       DRAWER 4',
  "1  Column: the vial's site, ORLA or VESK.",
  '2  Row: depth under 40 m — TOP row. Depth 40 m or more — BOTTOM row.',
  '3  STAR mark: use the other row.',
  '4  RING mark: use the other column.',
  '   A vial with both marks: apply both.',
];

/** `site ORLA · depth 12 m · marks: none` — the label text without its prefix. */
export function m16LabelText(label: M16Label): string {
  return `site ${label.site} · depth ${label.depth_m} m · marks: ${label.marks}`;
}

/** `Label: site ORLA · depth 12 m · marks: none` — the label line of a block. */
export function m16LabelLine(label: M16Label): string {
  return `Label: ${m16LabelText(label)}`;
}

export const M16_DRAWERS: readonly M16Drawer[] = [1, 2, 3, 4];

function options(vialId: M16VialId): M16Option[] {
  return M16_DRAWERS.map((drawer) => ({
    id: `${vialId}_d${drawer}`,
    drawer,
    label: `DRAWER ${drawer}  [${drawer}]`,
  }));
}

function vial(
  id: M16VialId,
  index: number,
  label: M16Label,
  key: M16Drawer,
  explanation: [string, string],
): M16Vial {
  return {
    id,
    index,
    label,
    options: options(id),
    key_option_id: `${id}_d${key}`,
    key_drawer: key,
    explanation,
  };
}

/** The two worked examples (`m16-examples-v1`), identical seven-line structure. */
export const M16_EXAMPLES: readonly M16Example[] = [
  {
    id: 'm16_e1',
    index: 1,
    label: { site: 'ORLA', depth_m: 18, marks: 'STAR' },
    lines: [
      'WORKED EXAMPLE 1 OF 2',
      'Label: site ORLA · depth 18 m · marks: STAR',
      '1  Site ORLA — ORLA column.',
      '2  18 m is under 40 m — TOP row.',
      '3  STAR mark — other row: BOTTOM row.',
      '4  No RING mark — column stays ORLA.',
      'Result: BOTTOM row, ORLA column — DRAWER 3.',
    ],
    result_drawer: 3,
  },
  {
    id: 'm16_e2',
    index: 2,
    label: { site: 'VESK', depth_m: 63, marks: 'RING' },
    lines: [
      'WORKED EXAMPLE 2 OF 2',
      'Label: site VESK · depth 63 m · marks: RING',
      '1  Site VESK — VESK column.',
      '2  63 m is 40 m or more — BOTTOM row.',
      '3  No STAR mark — row stays BOTTOM.',
      '4  RING mark — other column: ORLA column.',
      'Result: BOTTOM row, ORLA column — DRAWER 3.',
    ],
    result_drawer: 3,
  },
];

/** The six application vials (`m16-form-1`) in the fixed, assigned order. */
export const M16_VIALS: readonly M16Vial[] = [
  vial('m16_v1', 1, { site: 'ORLA', depth_m: 12, marks: 'none' }, 1, [
    'ORLA column; 12 m is under 40 m — TOP row.',
    'No marks. DRAWER 1.',
  ]),
  vial('m16_v2', 2, { site: 'VESK', depth_m: 34, marks: 'STAR, RING' }, 3, [
    'VESK column; 34 m is under 40 m — TOP row.',
    'STAR — other row: BOTTOM. RING — other column: ORLA. DRAWER 3.',
  ]),
  vial('m16_v3', 3, { site: 'ORLA', depth_m: 46, marks: 'RING' }, 4, [
    'ORLA column; 46 m is 40 m or more — BOTTOM row.',
    'RING — other column: VESK. DRAWER 4.',
  ]),
  vial('m16_v4', 4, { site: 'VESK', depth_m: 71, marks: 'STAR, RING' }, 1, [
    'VESK column; 71 m is 40 m or more — BOTTOM row.',
    'STAR — other row: TOP. RING — other column: ORLA. DRAWER 1.',
  ]),
  vial('m16_v5', 5, { site: 'VESK', depth_m: 27, marks: 'STAR' }, 4, [
    'VESK column; 27 m is under 40 m — TOP row.',
    'STAR — other row: BOTTOM. DRAWER 4.',
  ]),
  vial('m16_v6', 6, { site: 'ORLA', depth_m: 58, marks: 'STAR, RING' }, 2, [
    'ORLA column; 58 m is 40 m or more — BOTTOM row.',
    'STAR — other row: TOP. RING — other column: VESK. DRAWER 2.',
  ]),
];

export const M16_ASSIGNED_VIAL_ORDER: readonly M16VialId[] = M16_VIALS.map(
  (entry) => entry.id,
);
export const M16_EXAMPLE_IDS: readonly M16ExampleId[] = M16_EXAMPLES.map(
  (entry) => entry.id,
);

export function isM16VialId(value: unknown): value is M16VialId {
  return (
    typeof value === 'string' &&
    M16_VIALS.some((candidate) => candidate.id === value)
  );
}

export function isM16ExampleId(value: unknown): value is M16ExampleId {
  return value === 'm16_e1' || value === 'm16_e2';
}

export function m16Vial(id: M16VialId): M16Vial {
  return M16_VIALS.find((candidate) => candidate.id === id)!;
}

export function m16Example(id: M16ExampleId): M16Example {
  return M16_EXAMPLES.find((candidate) => candidate.id === id)!;
}

export function m16Option(
  vialId: M16VialId,
  optionId: string,
): M16Option | undefined {
  return m16Vial(vialId).options.find((option) => option.id === optionId);
}

/** The key of a vial: the authored option (decision D-U19-1, item 2). */
export function m16KeyOptionId(vialId: M16VialId): string {
  return m16Vial(vialId).key_option_id;
}

/** The row of a drawer in the 2 × 2 grid. */
export function m16DrawerRow(drawer: M16Drawer): 'TOP' | 'BOTTOM' {
  return drawer <= 2 ? 'TOP' : 'BOTTOM';
}

/** The column of a drawer in the 2 × 2 grid. */
export function m16DrawerColumn(drawer: M16Drawer): M16Site {
  return drawer % 2 === 1 ? 'ORLA' : 'VESK';
}

export type M16ErrorKind = 'row' | 'column' | 'row_and_column';

/**
 * What a recorded drawer represents against the key (preview §5.3): the
 * row, the column or both differ. Null for the key and for an unknown
 * option; DON'T KNOW has no option and is null at the call site. A
 * companion, never part of the value.
 */
export function m16ErrorKind(
  vialId: M16VialId,
  optionId: string | null,
): M16ErrorKind | null {
  if (optionId === null) {
    return null;
  }

  const entry = m16Vial(vialId);
  const option = m16Option(vialId, optionId);

  if (option === undefined || option.id === entry.key_option_id) {
    return null;
  }

  const rowDiffers =
    m16DrawerRow(option.drawer) !== m16DrawerRow(entry.key_drawer);
  const columnDiffers =
    m16DrawerColumn(option.drawer) !== m16DrawerColumn(entry.key_drawer);

  return rowDiffers && columnDiffers
    ? 'row_and_column'
    : rowDiffers
      ? 'row'
      : 'column';
}

/**
 * Every participant-facing string of the console other than the rule card,
 * the examples and the vials (preview r3 §3). Fixed in meaning; never
 * shortened.
 */
export const M16_TEXT = {
  title: 'HANDLING RULE',
  intro: [
    'A handling rule came in with the storm sample vials.',
    'First: the rule and two worked examples. Read them at your own pace.',
    'Then: six vials you have not seen, one at a time. For each, choose its drawer.',
    'The rule stays on screen while you choose.',
    'The worked examples close when the six vials start.',
    'Each recorded answer is final.',
    'Results come after all six vials.',
  ],
  show_example_1: 'SHOW EXAMPLE 1',
  subtitle_example: (index: number) => `Worked example ${index} of 2`,
  status_teaching: 'Worked examples: read them at your own pace.',
  teaching_note:
    'Read how the rule places this vial. No answer is requested on this page.',
  next_example: 'NEXT EXAMPLE',
  back_to_example_1: 'BACK TO EXAMPLE 1',
  start_vials: 'START THE SIX VIALS',
  confirm_start:
    'Start the six vials?\nThe worked examples close and cannot be opened again.\nThe handling rule stays on screen.',
  confirm_start_control: 'START  [ENTER]',
  keep_reading: 'KEEP READING  [ESC]',
  subtitle_vial: (index: number) => `Vial ${index} of 6`,
  status_vial: 'Use the handling rule. Choose a drawer, then record it.',
  vial_heading: (index: number) => `VIAL ${index} OF 6`,
  question: (index: number) =>
    `Which drawer does vial ${index} go in? Choose a drawer, then record it.`,
  record_drawer: 'RECORD DRAWER  [R]',
  dont_know: "DON'T KNOW  [N]",
  choose_drawer_first: 'Choose a drawer first.',
  confirm_drawer: (drawer: number, index: number) =>
    `Record DRAWER ${drawer} for vial ${index}?\nIt cannot be changed afterwards.`,
  confirm_dont_know: (index: number) =>
    `Record DON'T KNOW for vial ${index}?\nIt cannot be changed afterwards.`,
  confirm_drawer_control: 'RECORD DRAWER  [ENTER]',
  confirm_record_control: 'RECORD  [ENTER]',
  keep_working: 'KEEP WORKING  [ESC]',
  acknowledgement: (index: number) => `Vial ${index} recorded.`,
  status_recorded: (count: number) => `${count} of 6 vials recorded.`,
  next_vial: 'NEXT VIAL',
  show_results: 'SHOW RESULTS',
  help: 'HELP  [H]',
  leave: 'LEAVE CONSOLE',
  help_title: 'HOW THE CONSOLE WORKS',
  help_lines: [
    'The handling rule stays on the left while you work.',
    'Worked examples: NEXT EXAMPLE and BACK TO EXAMPLE 1 move between them; no answer is requested there.',
    'START THE SIX VIALS closes the worked examples; they cannot be opened again.',
    "Each vial: choose a drawer (1-4), then RECORD DRAWER and confirm, or DON'T KNOW and confirm.",
    'Only confirming records your answer. A recorded answer cannot be changed.',
    'Results come after all six vials; FINISH or ESC closes them.',
    "Keys: 1-4 choose · R record · N don't know · H help · ESC leaves (work kept).",
  ],
  close_help: 'CLOSE HELP  [H]',
  results_title: (page: number) =>
    page === 1 ? 'RESULTS — VIALS 1-3 OF 6' : 'RESULTS — VIALS 4-6 OF 6',
  results_status: 'Your answers are fixed. This view only shows them.',
  results_first_line: 'All six vials are recorded.',
  results_vial_line: (index: number, label: M16Label) =>
    `VIAL ${index} — ${m16LabelText(label)}`,
  results_recorded_line: (recorded: string, key: number) =>
    `Your recorded drawer: ${recorded} · Rule's drawer: DRAWER ${key}`,
  dont_know_recorded: "DON'T KNOW",
  drawer_recorded: (drawer: number) => `DRAWER ${drawer}`,
  next: 'NEXT',
  back: 'BACK',
  finish: 'FINISH',
  closed_at_review: 'Station record closed — the console keeps its record.',
  held_back:
    'This console was already used in this session. Its record is kept; no further answers can be given here.',
  fault: 'The console has a fault and is closed. Recorded answers are kept.',
  footer_card: 'H help · ESC leaves (work kept)',
  footer_vial:
    "1-4 choose · R record · N don't know · H help · ESC leaves (work kept)",
  footer_results: 'H help · ESC leaves (work kept)',
  footer_start_dialog: 'ENTER starts · ESC keeps reading',
  footer_dialog: 'ENTER records · ESC keeps working',
  footer_help: 'H or ESC closes the help',
  footer_record: 'ESC leaves',
} as const;

/** The strings of the rule card, the examples and the vials (labels, options, explanations). */
function contentStrings(withResults: boolean): string[] {
  const strings: string[] = [...M16_RULE_CARD_LINES];

  for (const example of M16_EXAMPLES) {
    strings.push(...example.lines);
  }

  for (const entry of M16_VIALS) {
    strings.push(
      M16_TEXT.vial_heading(entry.index),
      m16LabelLine(entry.label),
      M16_TEXT.question(entry.index),
    );

    for (const option of entry.options) {
      strings.push(option.label);
    }

    if (withResults) {
      strings.push(
        M16_TEXT.results_vial_line(entry.index, entry.label),
        M16_TEXT.results_recorded_line(
          M16_TEXT.drawer_recorded(entry.key_drawer),
          entry.key_drawer,
        ),
        M16_TEXT.results_recorded_line(
          M16_TEXT.dont_know_recorded,
          entry.key_drawer,
        ),
        ...entry.explanation,
      );
    }
  }

  return strings;
}

/**
 * Every participant-facing string of the console, for the wording tests:
 * the rule card, the examples, the vials (headings, labels, question,
 * options, results lines, explanations) and the fixed strings.
 */
export function m16ParticipantStrings(): string[] {
  const strings = contentStrings(true);

  for (const value of Object.values(M16_TEXT)) {
    if (typeof value === 'string') {
      strings.push(value);
    } else if (Array.isArray(value)) {
      strings.push(...value);
    }
  }

  const T = M16_TEXT;

  for (let index = 1; index <= 2; index += 1) {
    strings.push(T.subtitle_example(index), T.results_title(index));
  }

  for (let index = 1; index <= 6; index += 1) {
    strings.push(
      T.subtitle_vial(index),
      T.confirm_dont_know(index),
      T.acknowledgement(index),
    );

    for (const drawer of M16_DRAWERS) {
      strings.push(T.confirm_drawer(drawer, index));
    }
  }

  for (let count = 0; count <= 6; count += 1) {
    strings.push(T.status_recorded(count));
  }

  return strings;
}

/** The strings a participant can see before the sixth first response. */
export function m16PreCompletionStrings(): string[] {
  const strings = contentStrings(false);
  const T = M16_TEXT;

  strings.push(
    T.title,
    ...T.intro,
    T.show_example_1,
    T.status_teaching,
    T.teaching_note,
    T.next_example,
    T.back_to_example_1,
    T.start_vials,
    T.confirm_start,
    T.confirm_start_control,
    T.keep_reading,
    T.status_vial,
    T.record_drawer,
    T.dont_know,
    T.choose_drawer_first,
    T.confirm_drawer_control,
    T.confirm_record_control,
    T.keep_working,
    T.next_vial,
    T.show_results,
    T.help,
    T.leave,
    T.help_title,
    ...T.help_lines,
    T.close_help,
    T.closed_at_review,
    T.held_back,
    T.fault,
    T.footer_card,
    T.footer_vial,
    T.footer_start_dialog,
    T.footer_dialog,
    T.footer_help,
    T.footer_record,
  );

  for (let index = 1; index <= 2; index += 1) {
    strings.push(T.subtitle_example(index));
  }

  for (let index = 1; index <= 6; index += 1) {
    strings.push(
      T.subtitle_vial(index),
      T.confirm_dont_know(index),
      T.acknowledgement(index),
    );

    for (const drawer of M16_DRAWERS) {
      strings.push(T.confirm_drawer(drawer, index));
    }
  }

  for (let count = 0; count <= 6; count += 1) {
    strings.push(T.status_recorded(count));
  }

  return strings;
}

/** The strings of the first-opening card and the help sheet (they name no vial). */
export function m16IntroAndHelpStrings(): string[] {
  return [
    M16_TEXT.title,
    ...M16_TEXT.intro,
    M16_TEXT.show_example_1,
    M16_TEXT.help_title,
    ...M16_TEXT.help_lines,
    M16_TEXT.close_help,
  ];
}
