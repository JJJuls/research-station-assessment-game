/**
 * M20 — the approved content of the two held channels of the Mast 04 feed
 * at the Records Workshop station feed console (Station 080 M01–M26 run,
 * Unit 22; administration `m20-feed-returns-v2`).
 *
 * PURE module (no Phaser, no runtime, no `import.meta`): the administration
 * of `U22-OWNER-PREVIEW.md` (revision r3) exactly as approved by the research
 * owner's decision D-U22-1 of 14 October 2026 — recorded as the owner's
 * SPECIFIC selections (items 1–11 as recommended, item 12 the silent-release
 * alternative, item 13 the exploratory-label alternative) — the first-opening
 * card, the step view, the hold view, the channel view, help, the station
 * notice, the closed records, the chip, the footers and statuses; and, as
 * data, the targets of both channels, the cell counts, the loading value,
 * the cell cycle, the hold step and the protocol constants (hold → release
 * 30 000 ms, release → notice due 30 000 ms, notice 6 000 ms, spacing
 * 8 000 ms, settle 400 ms, check period 250 ms).
 *
 * Nothing here is re-authored by the implementer: a defect found in a target,
 * a rule or a string is recorded for the owner, never corrected here. The
 * pure spec re-derives every differ count with its own transcription, never
 * by importing it. Their logical correctness does not establish empirical
 * validity; the two channels are clustered observations of one project in
 * one room and one shift, never two independent situations; the task is a
 * provisional measure of re-engagement whose relation to the source item
 * requires empirical evaluation (`exploratory`); longer remaining copying is
 * not established difficulty. No questionnaire wording appears anywhere in
 * this file.
 */

export const M20_FAMILY = 'proto_m20_feed_';
export const M20_OPPORTUNITY_ID = 'proto_m20_feed_project';
export const M20_WINDOW_ID = 'm20_feed_w1';
export const M20_ENTRY_STATE_VERSION = 'm20-feed-returns-v2';
export const M20_FORM_ID = 'm20-form-1';
export const M20_CONTENT_VERSION = 'm20-content-v2';
export const M20_OBJECT_ID = 'm20_feed_console';
export const M20_SURFACE_ID = 'm20_feed_console';
export const M20_SCENE = 'records_workshop';
export const M20_CHANNELS_PLANNED = 2;
export const M20_STEPS_PER_CHANNEL = 6;
/** The cell count of each step (steps 1–6). */
export const M20_CELLS_PER_STEP: readonly number[] = [3, 3, 4, 4, 5, 5];
/** Cells load at this value on every step. */
export const M20_LOADING_VALUE = 1;
/** A tile cycles its cell 1 → 2 → 3 → 4 → 1. */
export const M20_CELL_MAX = 4;
/** The system holds a channel the moment this step is aligned. */
export const M20_HOLD_AFTER_STEP = 2;
/** Hold → the channel becomes workable (silently). */
export const M20_RELEASE_MS = 30_000;
/** Release → the notice becomes due. */
export const M20_NOTICE_AFTER_RELEASE_MS = 30_000;
/** The notice is shown this long unless ended early. */
export const M20_NOTICE_MS = 6_000;
/** B's notice comes at least this long after A's ACTUAL end. */
export const M20_SPACING_MS = 8_000;
/** A press inside this window after a view appeared changes nothing. */
export const M20_SETTLE_MS = 400;
/** The release / due check runs at most this often while the scene runs. */
export const M20_CUE_CHECK_MS = 250;

export type M20ChannelId = 'm20_ch_a' | 'm20_ch_b';
export type M20ChannelLetter = 'A' | 'B';
export type M20ChannelWord =
  | 'not started'
  | 'in work'
  | 'held'
  | 'pass open'
  | 'aligned';

export interface M20ChannelDef {
  id: M20ChannelId;
  letter: M20ChannelLetter;
  /** 1 or 2. */
  index: number;
  /** The targets of steps 1–6 (the approved data, never derived here). */
  targets: readonly (readonly number[])[];
}

/** The two channels in their fixed order (A first; B once A has ever been held). */
export const M20_CHANNELS: readonly [M20ChannelDef, M20ChannelDef] = [
  {
    id: 'm20_ch_a',
    letter: 'A',
    index: 1,
    targets: [
      [2, 4, 3],
      [3, 1, 4],
      [4, 2, 1, 3],
      [1, 3, 4, 2],
      [3, 4, 2, 1, 4],
      [2, 1, 3, 4, 2],
    ],
  },
  {
    id: 'm20_ch_b',
    letter: 'B',
    index: 2,
    targets: [
      [4, 1, 3],
      [2, 3, 1],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 2, 3, 1, 3],
      [1, 4, 2, 3, 4],
    ],
  },
];

export const M20_CHANNEL_ORDER: readonly M20ChannelId[] = M20_CHANNELS.map(
  (channel) => channel.id,
);

export function isM20ChannelId(value: unknown): value is M20ChannelId {
  return value === 'm20_ch_a' || value === 'm20_ch_b';
}

export function m20Channel(id: M20ChannelId): M20ChannelDef {
  return M20_CHANNELS.find((channel) => channel.id === id)!;
}

export function m20ChannelLetter(id: M20ChannelId): M20ChannelLetter {
  return m20Channel(id).letter;
}

/** The target vector of a step (1-based). */
export function m20Target(id: M20ChannelId, stepIndex: number): number[] {
  return [...(m20Channel(id).targets[stepIndex - 1] ?? [])];
}

/** The cell count of a step (1-based). */
export function m20CellsOf(stepIndex: number): number {
  return M20_CELLS_PER_STEP[stepIndex - 1] ?? 0;
}

/** The loading vector of a step. */
export function m20LoadingCells(stepIndex: number): number[] {
  return Array.from({ length: m20CellsOf(stepIndex) }, () => M20_LOADING_VALUE);
}

/** The number of cells that differ from the target (truthful; never rigged). */
export function m20Differ(
  id: M20ChannelId,
  stepIndex: number,
  cells: readonly number[],
): number {
  const target = m20Channel(id).targets[stepIndex - 1] ?? [];

  return target.reduce(
    (count, value, at) => count + (cells[at] === value ? 0 : 1),
    0,
  );
}

export function m20Aligned(
  id: M20ChannelId,
  stepIndex: number,
  cells: readonly number[],
): boolean {
  return (
    cells.length === m20CellsOf(stepIndex) &&
    m20Differ(id, stepIndex, cells) === 0
  );
}

/** The next value of a cycled cell. */
export function m20CycleCell(value: number): number {
  return value >= M20_CELL_MAX ? M20_LOADING_VALUE : value + 1;
}

/** True when every cell is at its loading value. */
export function m20AsLoaded(cells: readonly number[]): boolean {
  return cells.every((value) => value === M20_LOADING_VALUE);
}

export function m20SameCells(
  a: readonly number[] | null,
  b: readonly number[],
): boolean {
  return (
    a !== null &&
    a.length === b.length &&
    a.every((value, at) => value === b[at])
  );
}

/** A well-formed cell vector of a step (integers 1–4 of the step's length). */
export function m20IsCells(
  value: unknown,
  stepIndex: number,
): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === m20CellsOf(stepIndex) &&
    value.every(
      (cell) =>
        typeof cell === 'number' &&
        Number.isInteger(cell) &&
        cell >= M20_LOADING_VALUE &&
        cell <= M20_CELL_MAX,
    )
  );
}

/** Every participant-facing string of the console, the chip and the notice (preview §4.2–§4.9). */
export const M20_TEXT = {
  title: 'MAST 04 FEED',
  subtitle_card: 'Two channels',
  subtitle_step: (c: M20ChannelLetter, k: number) =>
    `Channel ${c} · step ${k} of 6`,
  subtitle_held: (c: M20ChannelLetter) => `Channel ${c} held`,
  subtitle_project: 'Both channels',
  status_card: 'Read the card, then CONTINUE.',
  status_step: (c: M20ChannelLetter) => `Working on channel ${c}.`,
  status_held: (c: M20ChannelLetter) =>
    `Channel ${c} is held until its next pass.`,
  /** A released hold view (owner amendment §5.359 (4)): the pass-open wording. */
  subtitle_open: (c: M20ChannelLetter) => `Channel ${c} · pass open`,
  status_open: (c: M20ChannelLetter) => `Channel ${c} can be continued.`,
  status_project: 'Choose a channel, or LEAVE.',
  footer_card: 'TAB move · ENTER or SPACE use · H help · ESC leave',
  /** Names only the cells the step has (1-3, 1-4 or 1-5). */
  footer_step: (cells: number) =>
    `1-${cells} change a cell · G align · C channels · H help · ESC leave`,
  footer_held:
    'TAB move · ENTER or SPACE use · C channels · H help · ESC leave',
  /** The channel view: the choice keys only when a channel can be chosen. */
  footer_project: (keys: readonly M20ChannelLetter[]) =>
    keys.length === 0
      ? 'TAB move · H help · ESC leave'
      : `${keys.join(' / ')} choose · TAB move · H help · ESC leave`,
  footer_help: 'H or ESC close help',
  footer_record: 'ESC leave',

  card: [
    'The Mast 04 feed has two channels, A and B. Each needs six steps.',
    'A step shows a TARGET row. Set each cell to match it, then ALIGN.',
    'After an ALIGN the console says how many cells still differ.',
    'Each channel is held once, after step 2. Its uplink pass then ends',
    'and the channel waits until its next pass opens.',
    "The console shows when a channel's pass is open again. If the",
    'channel is still waiting a while later, a station notice says so.',
    'Steps have no time limit. Channel A comes first.',
    'Signing off at the work order board closes this console for the shift.',
  ],
  continue: 'CONTINUE',
  help: 'HELP  [H]',
  leave: 'LEAVE  [ESC]',
  close_help: 'CLOSE HELP  [H]',
  align: 'ALIGN  [G]',
  channels: 'CHANNELS  [C]',

  target_row: (cells: readonly number[]) => `TARGET   ${cells.join('  ')}`,
  cells_row: (cells: readonly number[]) => `CELLS    ${cells.join('  ')}`,
  progress: (c: M20ChannelLetter, done: number) =>
    `Channel ${c}: ${done} of 6 steps done.`,
  /** The cell index, its current value and its hotkey, each labelled. */
  cell_tile: (k: number, v: number) => `CELL ${k}   value ${v}   [${k}]`,
  /** The step board keeps the last executed ALIGN's count of this step. */
  last_align: (n: number) =>
    n === 1
      ? 'Last ALIGN: 1 cell differed.'
      : `Last ALIGN: ${n} cells differed.`,
  not_aligned: (n: number) =>
    n === 1
      ? 'Not aligned: 1 cell differs.'
      : `Not aligned: ${n} cells differ.`,
  step_aligned: (k: number) => `Step ${k} aligned.`,
  refused_as_loaded: 'The cells are as loaded. Change a cell first.',
  refused_repeat: 'Same cells as the last ALIGN. Change a cell first.',
  channel_aligned: (c: M20ChannelLetter) => `Channel ${c} aligned.`,

  held: (c: M20ChannelLetter) => [
    `Pass ended. Channel ${c} is held.`,
    `Channel ${c}: 2 of 6 steps done, 4 remain.`,
    'Its next pass opens later. This console shows when it is open.',
  ],
  /** The hold view once the channel is released (replaces `held`). */
  held_open: (c: M20ChannelLetter) => [
    `Pass open. Channel ${c} can be continued.`,
    `Channel ${c}: 2 of 6 steps done, 4 remain.`,
  ],
  start_b: 'START CHANNEL B  [B]',
  continue_channel: (c: M20ChannelLetter) => `CONTINUE CHANNEL ${c}  [${c}]`,
  project_row: (c: M20ChannelLetter, done: number, word: M20ChannelWord) =>
    `CHANNEL ${c}   ${done} of 6 steps   ${word}`,
  none_workable: 'No channel can be worked until its next pass.',
  both_aligned: 'Both channels are aligned. The feed is restored.',

  help_title: 'HELP',
  help_lines: [
    'Each channel needs six steps. Set every cell to its TARGET, then ALIGN.',
    'A cell changes each time you use it: 1, 2, 3, 4, then 1 again.',
    'Each channel is held once, after step 2. Its uplink pass ends then.',
    'Once its next pass is open, the channel can be continued here.',
    'If it is still waiting a while later, a station notice says so.',
    'CHANNELS shows both channels without leaving the console.',
    'Leaving the console keeps everything as it is.',
    'Signing off at the work order board closes this console.',
  ],

  closed_signoff: 'The console closed when the shift was signed off.',
  closed_review: 'The console closed at the shift review.',
  held_back:
    'This console was opened earlier in the session. It stays closed now.',
  closed_fault: [
    'The feed console has a fault and is closed.',
    'Its record is kept as it is.',
  ],

  // World (Records Workshop): the station notice and the console chip.
  cue: (c: M20ChannelLetter) => [
    `FEED CONSOLE: the next pass for channel ${c} is open.`,
    `Channel ${c} can be continued · 4 of 6 steps remain.`,
  ],
  chip_before: 'MAST 04 FEED · 2 channels',
  chip_closed: 'closed for the shift',
  /** The chip shows step counts only — never `held` or `pass open`. */
  chip_channel: (c: M20ChannelLetter, done: number) => `${c} ${done}/6`,
  chip_counts: (doneA: number, doneB: number) =>
    `${M20_TEXT.chip_channel('A', doneA)} · ${M20_TEXT.chip_channel('B', doneB)}`,
} as const;

/** Every participant-facing string (the wording audit of the pure spec). */
export function m20ParticipantStrings(): string[] {
  const t = M20_TEXT;

  return [
    t.title,
    t.subtitle_card,
    t.subtitle_step('A', 3),
    t.subtitle_step('B', 6),
    t.subtitle_held('A'),
    t.subtitle_held('B'),
    t.subtitle_open('A'),
    t.subtitle_open('B'),
    t.subtitle_project,
    t.status_card,
    t.status_step('A'),
    t.status_step('B'),
    t.status_held('A'),
    t.status_held('B'),
    t.status_open('A'),
    t.status_open('B'),
    t.status_project,
    t.footer_card,
    t.footer_step(3),
    t.footer_step(4),
    t.footer_step(5),
    t.footer_held,
    t.footer_project(['A', 'B']),
    t.footer_project(['A']),
    t.footer_project(['B']),
    t.footer_project([]),
    t.footer_help,
    t.footer_record,
    ...t.card,
    t.continue,
    t.help,
    t.leave,
    t.close_help,
    t.align,
    t.channels,
    t.target_row([3, 4, 2, 1, 4]),
    t.cells_row([3, 4, 1, 1, 4]),
    t.progress('A', 4),
    t.cell_tile(1, 3),
    t.cell_tile(5, 4),
    t.last_align(2),
    t.last_align(1),
    t.not_aligned(2),
    t.not_aligned(1),
    t.step_aligned(3),
    t.refused_as_loaded,
    t.refused_repeat,
    t.channel_aligned('A'),
    ...t.held('A'),
    ...t.held('B'),
    ...t.held_open('A'),
    ...t.held_open('B'),
    t.start_b,
    t.continue_channel('A'),
    t.continue_channel('B'),
    t.project_row('A', 2, 'held'),
    t.project_row('B', 0, 'not started'),
    t.project_row('A', 2, 'pass open'),
    t.project_row('B', 1, 'in work'),
    t.project_row('A', 6, 'aligned'),
    t.none_workable,
    t.both_aligned,
    t.help_title,
    ...t.help_lines,
    t.closed_signoff,
    t.closed_review,
    t.held_back,
    ...t.closed_fault,
    ...t.cue('A'),
    ...t.cue('B'),
    t.chip_before,
    t.chip_closed,
    t.chip_counts(2, 0),
    t.chip_counts(6, 3),
  ];
}
