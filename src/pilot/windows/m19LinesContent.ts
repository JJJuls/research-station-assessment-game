/**
 * M19 — the approved content of the two coupling lines at the Exterior
 * Recovery Yard coupling panel (Station 080 M01–M26 run, Unit 21;
 * administration `m19-lines-v2`).
 *
 * PURE module (no Phaser, no runtime, no `import.meta`): the administration
 * of `U21-OWNER-PREVIEW.md` (revision r2) exactly as approved by the research
 * owner's decision D-U21-1 of 13 October 2026 — the first-opening card, the
 * panel check (two questions, their options, keys and the one explanation),
 * both line sheets (fixed lines), the controls, readouts, TRY rows, readings,
 * refusals, dialogs, finished views, help, closed records, footers and
 * statuses; and, as data, each line's settings, value rule, target, key and
 * designed-obstacle rule (the listed evidence settings).
 *
 * Nothing here is re-authored by the implementer: a defect found in a key, a
 * rule or a string is recorded for the owner, never corrected here. The pure
 * spec re-derives every reading, both keys and both obstacle rules with its
 * own transcription, never by importing them. Their logical correctness does
 * not establish empirical validity; the two lines are clustered observations
 * of one yard visit and one panel, never two independent situations; a line
 * restored proves nothing about the line not restored. No questionnaire
 * wording appears anywhere in this file.
 */

export const M19_FAMILY = 'proto_m19_lines_';
export const M19_OPPORTUNITY_ID = 'proto_m19_lines_series';
export const M19_WINDOW_ID = 'm19_lines_w1';
export const M19_ENTRY_STATE_VERSION = 'm19-lines-v2';
export const M19_FORM_ID = 'm19-form-1';
export const M19_CONTENT_VERSION = 'm19-content-v2';
export const M19_OBJECT_ID = 'm19_coupling_panel';
export const M19_SCENE = 'exterior_recovery_yard';
export const M19_LINES_PLANNED = 2;
/** A press inside this window after a view or a dialog appeared changes nothing. */
export const M19_SETTLE_MS = 400;
/** The TRY list shows at most this many rows … */
export const M19_LOG_ROWS = 9;
/** … and, above that, the newest this many under the "earlier TRYs" line. */
export const M19_LOG_TAIL = 8;

export type M19LineId = 'm19_l1' | 'm19_l2';
export type M19Reading = 'LOW' | 'OK' | 'HIGH';
export type M19Feed = 'SINGLE' | 'DOUBLE';
export type M19Bypass = 'SHUT' | 'OPEN';
export type M19CheckId = 'm19_chk_q1' | 'm19_chk_q2';
export type M19Line1Control = 'h1' | 'h2' | 'h3' | 'feed';
export type M19Line2Control = 'dial_down' | 'dial_up' | 'bypass';
export type M19Control = M19Line1Control | M19Line2Control;

export interface M19Line1Setting {
  h1: boolean;
  h2: boolean;
  h3: boolean;
  feed: M19Feed;
}

export interface M19Line2Setting {
  dial: number;
  bypass: M19Bypass;
}

export type M19Setting = M19Line1Setting | M19Line2Setting;

export interface M19CheckOption {
  id: string;
  index: 1 | 2 | 3;
  text: string;
  /** The tile text (`<text>  [k]`). */
  label: string;
}

export interface M19Check {
  id: M19CheckId;
  attempt: 1 | 2;
  question: string;
  options: readonly [M19CheckOption, M19CheckOption, M19CheckOption];
  key_option_id: string;
}

export interface M19Line<S extends M19Setting = M19Setting> {
  id: M19LineId;
  /** 1 or 2. */
  index: number;
  /** The sheet, fixed lines. */
  sheet_lines: readonly string[];
  /** The hotkey names of the setting controls, in control order. */
  controls: readonly M19Control[];
  start: S;
  /** The gauge target the value is read against. */
  target: number;
  /** The value rule (preview §4 / §5). */
  value: (setting: S) => number;
  /** The one setting that reads OK (approved data, never derived here). */
  key: S;
  /**
   * The designed obstacle: the listed evidence settings. The obstacle is
   * established when ALL of them have been executed (decision D-U21-1 item
   * 2, Option B); any other route by which it could be inferred does not
   * establish it.
   */
  evidence: readonly S[];
  /** The second control (changing it after the boundary is a companion). */
  second_control_changed: (setting: S) => boolean;
  /** A canonical key of a setting (equality of executed settings). */
  settingKey: (setting: S) => string;
  isSetting: (value: unknown) => value is S;
  readout: (setting: S) => string;
  /** The TRY row (`TRY n  <setting>   <reading>`). */
  row: (index: number, setting: S, reading: M19Reading) => string;
  /** The setting as it is written into an event (a plain copy). */
  serialise: (setting: S) => Record<string, unknown>;
  footer: string;
}

const names = (setting: M19Line1Setting) =>
  (['H1', 'H2', 'H3'] as const)
    .filter((_, at) => [setting.h1, setting.h2, setting.h3][at])
    .join(' ') || 'none';

export function m19Line1Value(setting: M19Line1Setting): number {
  return (
    ((setting.h1 ? 1 : 0) + (setting.h2 ? 2 : 0) + (setting.h3 ? 4 : 0)) *
    (setting.feed === 'DOUBLE' ? 2 : 1)
  );
}

export function m19Line2Value(setting: M19Line2Setting): number {
  return 2 * setting.dial - (setting.bypass === 'OPEN' ? 1 : 0);
}

function isLine1Setting(value: unknown): value is M19Line1Setting {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const s = value as Record<string, unknown>;

  return (
    typeof s.h1 === 'boolean' &&
    typeof s.h2 === 'boolean' &&
    typeof s.h3 === 'boolean' &&
    (s.feed === 'SINGLE' || s.feed === 'DOUBLE')
  );
}

function isLine2Setting(value: unknown): value is M19Line2Setting {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const s = value as Record<string, unknown>;

  return (
    typeof s.dial === 'number' &&
    Number.isInteger(s.dial) &&
    s.dial >= 1 &&
    s.dial <= 9 &&
    (s.bypass === 'SHUT' || s.bypass === 'OPEN')
  );
}

const line1: M19Line<M19Line1Setting> = {
  id: 'm19_l1',
  index: 1,
  sheet_lines: [
    'LINE 1 — HEATER BANK',
    'Three heaters: H1 adds 1 unit of heat, H2 adds 2, H3 adds 4.',
    'Each heater is ON or OFF. The FEED is SINGLE or DOUBLE.',
    'FEED DOUBLE doubles the heat of the heaters that are ON.',
    'TRY runs the line; the gauge reads LOW, OK or HIGH.',
    'The line is restored when the gauge reads OK.',
  ],
  controls: ['h1', 'h2', 'h3', 'feed'],
  start: { h1: false, h2: false, h3: false, feed: 'SINGLE' },
  target: 10,
  value: m19Line1Value,
  key: { h1: true, h2: false, h3: true, feed: 'DOUBLE' },
  evidence: [{ h1: true, h2: true, h3: true, feed: 'SINGLE' }],
  second_control_changed: (setting) => setting.feed === 'DOUBLE',
  settingKey: (setting) =>
    `${setting.h1 ? 1 : 0}${setting.h2 ? 1 : 0}${setting.h3 ? 1 : 0}${setting.feed[0]}`,
  isSetting: isLine1Setting,
  readout: (setting) => `ON: ${names(setting)} · FEED ${setting.feed}`,
  row: (index, setting, reading) =>
    `${`TRY ${index}`.padEnd(7)}${names(setting)} · ${setting.feed.padEnd(6)}   ${reading}`,
  serialise: (setting) => ({
    h1: setting.h1,
    h2: setting.h2,
    h3: setting.h3,
    feed: setting.feed,
  }),
  footer:
    '1-3 heater · 4 feed · T try · N set aside · H help · TAB · ESC leave',
};

const line2: M19Line<M19Line2Setting> = {
  id: 'm19_l2',
  index: 2,
  sheet_lines: [
    'LINE 2 — PRESSURE TRIM',
    'A pressure dial (1 to 9) and a bypass valve (SHUT or OPEN).',
    'A higher dial setting gives a higher pressure.',
    'The bypass, when OPEN, lowers the pressure a little.',
    'TRY runs the line; the gauge reads LOW, OK or HIGH.',
    'The line is restored when the gauge reads OK.',
  ],
  controls: ['dial_down', 'dial_up', 'bypass'],
  start: { dial: 1, bypass: 'SHUT' },
  target: 9,
  value: m19Line2Value,
  key: { dial: 5, bypass: 'OPEN' },
  evidence: [
    { dial: 4, bypass: 'SHUT' },
    { dial: 5, bypass: 'SHUT' },
  ],
  second_control_changed: (setting) => setting.bypass === 'OPEN',
  settingKey: (setting) => `${setting.dial}${setting.bypass[0]}`,
  isSetting: isLine2Setting,
  readout: (setting) => `DIAL ${setting.dial} · BYPASS ${setting.bypass}`,
  row: (index, setting, reading) =>
    `${`TRY ${index}`.padEnd(7)}dial ${setting.dial} · ${setting.bypass.padEnd(4)}   ${reading}`,
  serialise: (setting) => ({ dial: setting.dial, bypass: setting.bypass }),
  footer:
    '1 down · 2 up · 3 bypass · T try · N set aside · H help · TAB · ESC leave',
};

/** The two lines in their fixed order (decision D-U21-1 item 6). */
export const M19_LINES: readonly [
  M19Line<M19Line1Setting>,
  M19Line<M19Line2Setting>,
] = [line1, line2];

export const M19_LINE_ORDER: readonly M19LineId[] = M19_LINES.map(
  (line) => line.id,
);

export function isM19LineId(value: unknown): value is M19LineId {
  return value === 'm19_l1' || value === 'm19_l2';
}

export function m19Line(id: M19LineId): M19Line {
  return M19_LINES.find((line) => line.id === id)! as M19Line;
}

/** The reading of a setting under its line's rule (truthful; never rigged). */
export function m19Reading(line: M19Line, setting: M19Setting): M19Reading {
  const value = (line.value as (setting: M19Setting) => number)(setting);

  return value < line.target ? 'LOW' : value > line.target ? 'HIGH' : 'OK';
}

export function m19SettingKey(line: M19Line, setting: M19Setting): string {
  return (line.settingKey as (setting: M19Setting) => string)(setting);
}

/** The dial limits of line 2. */
export const M19_DIAL_MIN = 1;
export const M19_DIAL_MAX = 9;

/**
 * The designed obstacle: true once the executed settings include every
 * listed evidence setting of the line (Option B; inferred routes never
 * count).
 */
export function m19ObstacleEstablished(
  line: M19Line,
  executed: readonly M19Setting[],
): boolean {
  const keys = new Set(executed.map((setting) => m19SettingKey(line, setting)));

  return (line.evidence as readonly M19Setting[]).every((setting) =>
    keys.has(m19SettingKey(line, setting)),
  );
}

/**
 * The 1-based indices of the executed attempts that satisfy the obstacle
 * rule (one per listed evidence setting; the first execution of each).
 */
export function m19EvidenceAttemptIndices(
  line: M19Line,
  executed: readonly M19Setting[],
): number[] {
  const out: number[] = [];

  for (const evidence of line.evidence as readonly M19Setting[]) {
    const key = m19SettingKey(line, evidence);
    const at = executed.findIndex(
      (setting) => m19SettingKey(line, setting) === key,
    );

    if (at >= 0) {
      out.push(at + 1);
    }
  }

  return out.sort((a, b) => a - b);
}

function option(
  checkId: M19CheckId,
  index: 1 | 2 | 3,
  text: string,
): M19CheckOption {
  return {
    id: `${checkId}_o${index}`,
    index,
    text,
    label: `${text}  [${index}]`,
  };
}

/** The panel check: question 1, then (after a wrong answer) question 2. */
export const M19_CHECKS: readonly [M19Check, M19Check] = [
  {
    id: 'm19_chk_q1',
    attempt: 1,
    question: 'After a TRY, the line is not restored. What can you do next?',
    options: [
      option('m19_chk_q1', 1, 'Only LEAVE; the line then starts again.'),
      option(
        'm19_chk_q1',
        2,
        'Change the settings and TRY, or SET ASIDE the line.',
      ),
      option('m19_chk_q1', 3, 'Nothing; the line is now locked.'),
    ],
    key_option_id: 'm19_chk_q1_o2',
  },
  {
    id: 'm19_chk_q2',
    attempt: 2,
    question: 'A TRY has just left a line not restored. Which is true?',
    options: [
      option(
        'm19_chk_q2',
        1,
        'The line now locks until the outside work ends.',
      ),
      option('m19_chk_q2', 2, 'The line goes back to its first setting.'),
      option(
        'm19_chk_q2',
        3,
        'A new setting can be tried, or the line set aside.',
      ),
    ],
    key_option_id: 'm19_chk_q2_o3',
  },
];

export function m19Check(id: M19CheckId): M19Check {
  return M19_CHECKS.find((check) => check.id === id)!;
}

export function m19CheckOption(
  checkId: M19CheckId,
  optionId: unknown,
): M19CheckOption | undefined {
  return m19Check(checkId).options.find(
    (candidate) => candidate.id === optionId,
  );
}

/** Every participant-facing string of the panel (preview §4). */
export const M19_TEXT = {
  title: 'COOLANT COUPLING',
  subtitle_card: 'Two lines',
  subtitle_check: 'Panel check',
  subtitle_line: (n: number) => `Line ${n} of 2`,
  status_card: 'Read the card, then CONTINUE.',
  status_check: 'One short check of how the panel works.',
  status_line: (n: number) => `Working on line ${n} of 2.`,
  status_finished_lines: (k: number) => `${k} of 2 lines finished.`,

  intro: [
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
  ],
  continue: 'CONTINUE',

  record_answer: 'RECORD ANSWER  [R]',
  choose_answer_first: 'Choose an answer first.',
  explanation: [
    'How the panel works:',
    'After any TRY you may change the settings and TRY again,',
    'or SET ASIDE the line. SET ASIDE finishes that line as it is;',
    'it stays finished; the next line comes up. Nothing resets or locks.',
  ],
  check_recorded: 'Check recorded. Line 1 is ready.',
  start_line_1: 'START LINE 1',

  heater_tile: (k: number) => `H${k}  [${k}]`,
  feed: 'FEED  [4]',
  dial_down: 'DIAL DOWN  [1]',
  dial_up: 'DIAL UP  [2]',
  bypass: 'BYPASS  [3]',
  try: 'TRY  [T]',
  set_aside: 'SET ASIDE  [N]',
  dial_limit: (dial: number) => `The dial is at ${dial}.`,

  try_feedback: (n: number, reading: M19Reading, line: number) =>
    reading === 'OK'
      ? `TRY ${n}: the gauge reads OK. Line ${line} is restored.`
      : `TRY ${n}: the gauge reads ${reading}. Line ${line} is not restored.`,
  already_tried: (n: number) =>
    `That setting was tried at TRY ${n}; it is not run again.`,

  log_header: 'TRIES (newest last)',
  log_none: 'No TRY yet.',
  log_earlier: (k: number) => `… ${k} earlier TRYs not shown`,

  aside: (line: number) => [
    `Set line ${line} aside?`,
    'It finishes as it is and stays finished.',
    line === 1 ? 'Line 2 comes next.' : 'It is the last line.',
  ],
  aside_confirm: 'SET ASIDE  [ENTER]',
  aside_back: 'BACK  [ESC]',

  line_finished: (n: number, how: 'restored' | 'set aside') =>
    `Line ${n} finished: ${how}.`,
  next_line: 'NEXT LINE',
  both_finished: 'Both lines finished.',
  finish: 'FINISH',
  final_record: 'Both lines are finished. The panel takes no further settings.',

  help: 'HELP  [H]',
  leave: 'LEAVE  [ESC]',
  help_title: 'PANEL HELP',
  help_lines: [
    "Set a line's settings, then TRY. Each TRY is listed with its reading.",
    'Line 1: H1-H3 [1-3] switch a heater; FEED [4] SINGLE or DOUBLE.',
    'Line 2: DIAL DOWN [1], DIAL UP [2]; BYPASS [3] opens or shuts it.',
    'TRY [T] runs the setting. A setting already tried is not run again.',
    'SET ASIDE [N] finishes a line as it is; it stays finished.',
    'LEAVE or ESC keeps everything as it is while you are outside.',
    'Telling Noor you are finished outside closes the panel as it is.',
    'TAB moves between controls; ENTER or SPACE uses the one in focus.',
  ],
  close_help: 'CLOSE HELP  [H]',

  closed_shift: 'The coupling panel closed when the outside work ended.',
  closed_review: 'The coupling panel was closed at the station review.',
  held_back:
    'This panel was opened earlier in the session. It stays closed now.',

  footer_card: 'TAB move · ENTER or SPACE use · H help · ESC leave',
  footer_check: '1-3 choose · R record · H help · TAB move · ESC leave',
  footer_finished: 'TAB move · ENTER or SPACE use · H help · ESC leave',
  footer_dialog: 'ENTER set aside · ESC back',
  footer_help: 'H or ESC close help',
  footer_record: 'ESC leave',
} as const;

/** Every participant-facing string (the wording audit of the pure spec). */
export function m19ParticipantStrings(): string[] {
  const t = M19_TEXT;
  const out: string[] = [
    t.title,
    t.subtitle_card,
    t.subtitle_check,
    t.subtitle_line(1),
    t.subtitle_line(2),
    t.status_card,
    t.status_check,
    t.status_line(1),
    t.status_line(2),
    t.status_finished_lines(1),
    t.status_finished_lines(2),
    ...t.intro,
    t.continue,
    ...M19_CHECKS.flatMap((check) => [
      check.question,
      ...check.options.map((entry) => entry.label),
    ]),
    t.record_answer,
    t.choose_answer_first,
    ...t.explanation,
    t.check_recorded,
    t.start_line_1,
    ...M19_LINES.flatMap((line) => [...line.sheet_lines, line.footer]),
    line1.readout(line1.start),
    line1.readout({ h1: true, h2: true, h3: true, feed: 'DOUBLE' }),
    line2.readout(line2.start),
    t.heater_tile(1),
    t.heater_tile(2),
    t.heater_tile(3),
    t.feed,
    t.dial_down,
    t.dial_up,
    t.bypass,
    t.try,
    t.set_aside,
    t.dial_limit(1),
    t.dial_limit(9),
    t.try_feedback(3, 'LOW', 1),
    t.try_feedback(2, 'HIGH', 2),
    t.try_feedback(11, 'OK', 1),
    t.try_feedback(9, 'OK', 2),
    t.already_tried(2),
    t.log_header,
    t.log_none,
    t.log_earlier(2),
    line1.row(1, { h1: false, h2: false, h3: true, feed: 'SINGLE' }, 'LOW'),
    line1.row(11, line1.key, 'OK'),
    line2.row(1, line2.start, 'LOW'),
    line2.row(9, line2.key, 'OK'),
    ...t.aside(1),
    ...t.aside(2),
    t.aside_confirm,
    t.aside_back,
    t.line_finished(1, 'restored'),
    t.line_finished(1, 'set aside'),
    t.line_finished(2, 'restored'),
    t.line_finished(2, 'set aside'),
    t.next_line,
    t.both_finished,
    t.finish,
    t.final_record,
    t.help,
    t.leave,
    t.help_title,
    ...t.help_lines,
    t.close_help,
    t.closed_shift,
    t.closed_review,
    t.held_back,
    t.footer_card,
    t.footer_check,
    t.footer_finished,
    t.footer_dialog,
    t.footer_help,
    t.footer_record,
  ];

  return out;
}
