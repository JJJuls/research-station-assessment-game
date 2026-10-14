/**
 * M20 — the work-surface model of the station feed console (Unit 22). Maps
 * the pure project state to a `WorkSurfaceModel` in the WIDE FRAME of
 * research-owner decision D-U17-2 (used as is): the console over the whole
 * visible design area, a 714 px left column (the step board) and a 300 px
 * right column (the cell tiles and ALIGN), 16 px design text everywhere.
 * Every activation calls the same adapter command with its input mode
 * (pointer / keyboard parity); the commands and the state reader are
 * injected through the host (`bindM20Surface` in `m20FeedConsole.ts`), so
 * this module is PURE (no runtime import) and the pure spec renders every
 * view.
 *
 * Presentation rules (decision D-U22-1): the chip outside names counts only;
 * inside, the channel view names `held` and `pass open` truthfully; nothing
 * on screen marks a resumption or a credit; the help sheet is drawn alone
 * with the header, CLOSE HELP first in the focus order; every view lands on a
 * neutral, non-acting first focusable element (the card text, the step
 * board, the hold text, the channel rows, the closed record), so no
 * actionable control is focused until TAB or a hotkey. The model's settle on
 * every view transition refuses a carried press. The shared frame keeps
 * focus on the same element id across refreshes, so HELP and LEAVE carry the
 * view's name in their ids (`help_<view>` / `leave_<view>`) and the step
 * view's ids carry the channel and step (`board_a_3`, `cell_a_3_1`,
 * `align_a_3`): a hotkey that changes the view finds no such id on the new
 * view and lands on its neutral element (U21 review finding GP-1 applied).
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import { M20_TEXT, type M20ChannelId, m20Target } from './m20FeedContent';
import {
  type M20AlignOutcome,
  m20ChannelButtons,
  m20ChannelOf,
  type M20ChannelState,
  m20ChannelWord,
  m20Current,
  m20HelpView,
  m20IsReleased,
  type M20Project,
  m20RecordLine,
} from './m20FeedModel';
import type { InputMode } from './windowKit';

/** The adapter commands the surface routes every activation to. */
export interface M20SurfaceCommands {
  continue: (mode: InputMode, nowMs: number) => boolean;
  continueChannel: (
    id: M20ChannelId,
    mode: InputMode,
    nowMs: number,
  ) => boolean;
  startB: (mode: InputMode, nowMs: number) => boolean;
  changeCell: (cell: number, mode: InputMode, nowMs: number) => boolean;
  align: (mode: InputMode, nowMs: number) => M20AlignOutcome;
  help: (mode: InputMode, nowMs: number) => boolean;
  closeHelp: (mode: InputMode, nowMs: number) => boolean;
  /** CHANNELS [C]: the channel view inside the open console (no record). */
  channels: (mode: InputMode, nowMs: number) => boolean;
}

export interface M20SurfaceHost {
  now: () => number;
  /** Closes the surface (LEAVE — the same path as ESC). */
  close: () => void;
  /** Neutral feedback line on the surface. */
  feedback: (message: string) => void;
  /** The project state (read only). */
  project: () => Readonly<M20Project>;
  commands: M20SurfaceCommands;
}

/** Design text size of every element in the wide frame (D-U17-2). */
export const M20_TEXT_PX = 16;
const BOX_H = 34;
const GAP = 4;
const LEFT_X = 12;
const LEFT_W = 714;
const RIGHT_X = 738;
const RIGHT_W = 300;
const FULL_X = 12;
const FULL_W = 1026;
export const M20_CONTENT_TOP = 90;
const BOARD_H = 100;
const CARD_H = 200;
const HELD_H = 70;
const ROWS_H = 50;
const NOTE_Y = 150;
const CHANNEL_BUTTON_Y = 200;
const CHANNEL_BUTTON_W = 400;
const CHANNEL_BUTTON_B_X = 440;
const ALIGN_Y = M20_CONTENT_TOP + 5 * (BOX_H + GAP) + 10;
export const M20_BOTTOM_ROW_Y = 462;
const HELP_X = FULL_X;
const HELP_W = 160;
const LEAVE_X = 184;
const LEAVE_W = 180;
const PRIMARY_X = 778;
const PRIMARY_W = 260;
const CLOSE_HELP_X = 388;
/** CHANNELS [C] in the free middle of the bottom row (step and hold views). */
const CHANNELS_X = 388;
const CHANNELS_W = 200;
const HELP_SHEET_Y = 56;
const HELP_SHEET_H = 160;

function text(
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
): SurfaceElement {
  return {
    id,
    kind: 'text',
    label,
    x,
    y,
    w,
    h,
    textPx: M20_TEXT_PX,
    align: 'left',
  };
}

/** A neutral focus landing: a text block whose activation does nothing. */
function landing(
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
): SurfaceElement {
  return { ...text(id, label, x, y, w, h), onActivate: () => undefined };
}

function button(
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  hotkey: string | undefined,
  onActivate: (mode: InputMode) => void,
  state?: SurfaceElement['state'],
): SurfaceElement {
  return {
    id,
    kind: 'button',
    label,
    x,
    y,
    w,
    h: BOX_H,
    hotkey,
    textPx: M20_TEXT_PX,
    state,
    onActivate,
  };
}

function tile(
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  hotkey: string,
  onActivate: (mode: InputMode) => void,
): SurfaceElement {
  return {
    id,
    kind: 'tile',
    label,
    x,
    y,
    w,
    h: BOX_H,
    hotkey,
    textPx: M20_TEXT_PX,
    align: 'left',
    valign: 'top',
    state: 'idle',
    onActivate,
  };
}

export function m20CellTileId(channel: M20ChannelState, cell: number): string {
  return `cell_${channel.letter.toLowerCase()}_${channel.step}_${cell}`;
}

export function m20AlignId(channel: M20ChannelState): string {
  return `align_${channel.letter.toLowerCase()}_${channel.step}`;
}

export function m20BoardId(channel: M20ChannelState): string {
  return `board_${channel.letter.toLowerCase()}_${channel.step}`;
}

/** HELP and LEAVE of a working view; `view` is the view's name (see the header). */
function helpAndLeave(host: M20SurfaceHost, view: string): SurfaceElement[] {
  return [
    button(
      `help_${view}`,
      M20_TEXT.help,
      HELP_X,
      M20_BOTTOM_ROW_Y,
      HELP_W,
      'h',
      (mode) => {
        host.commands.help(mode, host.now());
      },
    ),
    leaveButton(host, view),
  ];
}

function leaveButton(host: M20SurfaceHost, view: string): SurfaceElement {
  return button(
    `leave_${view}`,
    M20_TEXT.leave,
    LEAVE_X,
    M20_BOTTOM_ROW_Y,
    LEAVE_W,
    undefined,
    () => host.close(),
  );
}

function primaryButton(
  id: string,
  label: string,
  hotkey: string | undefined,
  onActivate: (mode: InputMode) => void,
): SurfaceElement {
  return button(
    id,
    label,
    PRIMARY_X,
    M20_BOTTOM_ROW_Y,
    PRIMARY_W,
    hotkey,
    onActivate,
    'accent',
  );
}

/** CHANNELS [C] of a working step or hold view (owner amendment §5.359 (2)). */
function channelsButton(host: M20SurfaceHost, view: string): SurfaceElement {
  return button(
    `channels_${view}`,
    M20_TEXT.channels,
    CHANNELS_X,
    M20_BOTTOM_ROW_Y,
    CHANNELS_W,
    'c',
    (mode) => {
      host.commands.channels(mode, host.now());
    },
  );
}

/**
 * The last EXECUTED attempt of the channel's current step that did not
 * align (its differ count stays on the board: a refused repeat never erases
 * it, and it is there again after CHANNELS; owner amendment §5.359 (5)).
 */
function lastMiss(channel: M20ChannelState): number | null {
  const last = channel.attempts[channel.attempts.length - 1];

  return last !== undefined && last.step_index === channel.step && !last.aligned
    ? last.differ
    : null;
}

/** The step board: the target row, the cells row, a blank line, the progress line, the last ALIGN. */
function boardText(channel: M20ChannelState): string {
  const miss = lastMiss(channel);

  return [
    M20_TEXT.target_row(m20Target(channel.id, channel.step)),
    M20_TEXT.cells_row(channel.cells),
    '',
    M20_TEXT.progress(channel.letter, channel.steps_done),
    ...(miss === null ? [] : [M20_TEXT.last_align(miss)]),
  ].join('\n');
}

function stepView(
  s: Readonly<M20Project>,
  channel: M20ChannelState,
  host: M20SurfaceHost,
  view: string,
): SurfaceElement[] {
  const elements: SurfaceElement[] = [
    landing(
      m20BoardId(channel),
      boardText(channel),
      LEFT_X,
      M20_CONTENT_TOP,
      LEFT_W,
      BOARD_H,
    ),
  ];

  channel.cells.forEach((value, at) => {
    const cell = at + 1;

    elements.push(
      tile(
        m20CellTileId(channel, cell),
        M20_TEXT.cell_tile(cell, value),
        RIGHT_X,
        M20_CONTENT_TOP + at * (BOX_H + GAP),
        RIGHT_W,
        String(cell),
        (mode) => {
          host.commands.changeCell(cell, mode, host.now());
        },
      ),
    );
  });

  elements.push(
    button(
      m20AlignId(channel),
      M20_TEXT.align,
      RIGHT_X,
      ALIGN_Y,
      RIGHT_W,
      'g',
      (mode) => {
        const outcome = host.commands.align(mode, host.now());

        if (outcome.kind === 'executed') {
          if (outcome.channel_aligned) {
            host.feedback(M20_TEXT.channel_aligned(channel.letter));
          } else if (outcome.aligned) {
            host.feedback(M20_TEXT.step_aligned(outcome.attempt.step_index));
          } else {
            host.feedback(M20_TEXT.not_aligned(outcome.attempt.differ));
          }
        } else if (outcome.kind === 'refused') {
          if (outcome.reason === 'as_loaded') {
            host.feedback(M20_TEXT.refused_as_loaded);
          } else if (outcome.reason === 'repeat') {
            host.feedback(M20_TEXT.refused_repeat);
          }
        }
      },
      'accent',
    ),
  );
  elements.push(channelsButton(host, view));
  elements.push(...helpAndLeave(host, view));
  void s;

  return elements;
}

function heldView(
  s: Readonly<M20Project>,
  channel: M20ChannelState,
  host: M20SurfaceHost,
  view: string,
): SurfaceElement[] {
  // Owner amendment §5.359 (4): once the channel's pass is open the hold
  // view says so and offers its CONTINUE (the same landing id, so a
  // refresh keeps the focus where it was).
  const open = m20IsReleased(channel);
  const elements: SurfaceElement[] = [
    landing(
      `held_${channel.letter.toLowerCase()}`,
      (open
        ? M20_TEXT.held_open(channel.letter)
        : M20_TEXT.held(channel.letter)
      ).join('\n'),
      FULL_X,
      M20_CONTENT_TOP,
      FULL_W,
      HELD_H,
    ),
  ];
  const buttons = m20ChannelButtons(s as M20Project);

  if (buttons.continue.includes(channel.id)) {
    const letter = channel.letter;

    elements.push(
      button(
        `continue_${letter.toLowerCase()}`,
        M20_TEXT.continue_channel(letter),
        channel.index === 1 ? FULL_X : CHANNEL_BUTTON_B_X,
        CHANNEL_BUTTON_Y,
        CHANNEL_BUTTON_W,
        letter.toLowerCase(),
        (mode) => {
          host.commands.continueChannel(channel.id, mode, host.now());
        },
        'accent',
      ),
    );
  }

  if (channel.index === 1 && buttons.start_b) {
    elements.push(
      primaryButton('start_b', M20_TEXT.start_b, 'b', (mode) => {
        host.commands.startB(mode, host.now());
      }),
    );
  }

  elements.push(channelsButton(host, view));
  elements.push(...helpAndLeave(host, view));

  return elements;
}

function channelsView(
  s: Readonly<M20Project>,
  host: M20SurfaceHost,
  view: string,
): SurfaceElement[] {
  const rows = s.channels
    .map((channel) =>
      M20_TEXT.project_row(
        channel.letter,
        channel.steps_done,
        m20ChannelWord(channel),
      ),
    )
    .join('\n');
  const elements: SurfaceElement[] = [
    landing('rows', rows, FULL_X, M20_CONTENT_TOP, FULL_W, ROWS_H),
  ];
  const buttons = m20ChannelButtons(s as M20Project);

  if (buttons.both_aligned) {
    elements.push(
      text('note', M20_TEXT.both_aligned, FULL_X, NOTE_Y, FULL_W, BOX_H),
    );
  } else if (buttons.none) {
    elements.push(
      text('note', M20_TEXT.none_workable, FULL_X, NOTE_Y, FULL_W, BOX_H),
    );
  }

  const [a, b] = s.channels;

  if (buttons.continue.includes(a.id)) {
    elements.push(
      button(
        'continue_a',
        M20_TEXT.continue_channel('A'),
        FULL_X,
        CHANNEL_BUTTON_Y,
        CHANNEL_BUTTON_W,
        'a',
        (mode) => {
          host.commands.continueChannel(a.id, mode, host.now());
        },
        'accent',
      ),
    );
  }

  if (buttons.continue.includes(b.id)) {
    elements.push(
      button(
        'continue_b',
        M20_TEXT.continue_channel('B'),
        CHANNEL_BUTTON_B_X,
        CHANNEL_BUTTON_Y,
        CHANNEL_BUTTON_W,
        'b',
        (mode) => {
          host.commands.continueChannel(b.id, mode, host.now());
        },
        'accent',
      ),
    );
  } else if (buttons.start_b) {
    elements.push(
      button(
        'start_b',
        M20_TEXT.start_b,
        CHANNEL_BUTTON_B_X,
        CHANNEL_BUTTON_Y,
        CHANNEL_BUTTON_W,
        'b',
        (mode) => {
          host.commands.startB(mode, host.now());
        },
        'accent',
      ),
    );
  }

  if (s.status === 'completed') {
    elements.push(leaveButton(host, view));
  } else {
    elements.push(...helpAndLeave(host, view));
  }

  return elements;
}

export function m20SurfaceModel(host: M20SurfaceHost): WorkSurfaceModel {
  const s = host.project();
  const elements: SurfaceElement[] = [];
  const recordLine = m20RecordLine(s as M20Project);
  const view = m20HelpView(s as M20Project);

  if (recordLine !== null) {
    // A closed record: the line (a neutral landing; the fault record has
    // two lines) and LEAVE; nothing recorded.
    elements.push(
      landing(
        'closed',
        recordLine,
        FULL_X,
        M20_CONTENT_TOP,
        FULL_W,
        recordLine.includes('\n') ? 60 : BOX_H,
      ),
    );
    elements.push(leaveButton(host, view));

    return {
      title: M20_TEXT.title,
      subtitle: '',
      status: '',
      elements,
      help: M20_TEXT.footer_record,
    };
  }

  if (s.help_open) {
    // The help sheet alone; CLOSE HELP is the first focusable element and
    // sits in the middle of the bottom row, where no other view holds a
    // control.
    elements.push(
      button(
        'close_help',
        M20_TEXT.close_help,
        CLOSE_HELP_X,
        M20_BOTTOM_ROW_Y,
        PRIMARY_W,
        'h',
        (mode) => {
          host.commands.closeHelp(mode, host.now());
        },
        'accent',
      ),
    );
    elements.push(
      text(
        'help_sheet',
        M20_TEXT.help_lines.join('\n'),
        FULL_X,
        HELP_SHEET_Y,
        FULL_W,
        HELP_SHEET_H,
      ),
    );

    return {
      title: M20_TEXT.help_title,
      subtitle: '',
      status: '',
      elements,
      help: M20_TEXT.footer_help,
    };
  }

  if (s.status === 'intro') {
    elements.push(
      landing(
        'intro',
        M20_TEXT.card.join('\n'),
        FULL_X,
        M20_CONTENT_TOP,
        FULL_W,
        CARD_H,
      ),
    );
    elements.push(
      primaryButton('continue', M20_TEXT.continue, undefined, (mode) => {
        host.commands.continue(mode, host.now());
      }),
    );
    elements.push(...helpAndLeave(host, view));

    return {
      title: M20_TEXT.title,
      subtitle: M20_TEXT.subtitle_card,
      status: M20_TEXT.status_card,
      elements,
      help: M20_TEXT.footer_card,
    };
  }

  const current =
    s.view === 'step' || s.view === 'held' ? m20Current(s as M20Project) : null;

  if (s.status === 'work' && s.view === 'step' && current !== null) {
    return {
      title: M20_TEXT.title,
      subtitle: M20_TEXT.subtitle_step(current.letter, current.step),
      status: M20_TEXT.status_step(current.letter),
      elements: stepView(s, current, host, view),
      help: M20_TEXT.footer_step(current.cells.length),
    };
  }

  if (s.status === 'work' && s.view === 'held' && current !== null) {
    const open = m20IsReleased(current);

    return {
      title: M20_TEXT.title,
      subtitle: open
        ? M20_TEXT.subtitle_open(current.letter)
        : M20_TEXT.subtitle_held(current.letter),
      status: open
        ? M20_TEXT.status_open(current.letter)
        : M20_TEXT.status_held(current.letter),
      elements: heldView(s, current, host, view),
      help: M20_TEXT.footer_held,
    };
  }

  // The channel view (work, or the completed project's restored line).
  // Owner amendment §5.359 (4): the status and the footer name only the
  // actions this state has — the choice keys only when a channel can be
  // chosen; the completed project keeps LEAVE alone.
  if (s.status === 'completed') {
    return {
      title: M20_TEXT.title,
      subtitle: M20_TEXT.subtitle_project,
      status: '',
      elements: channelsView(s, host, view),
      help: M20_TEXT.footer_record,
    };
  }

  const buttons = m20ChannelButtons(s as M20Project);
  const keys = s.channels
    .filter(
      (channel) =>
        buttons.continue.includes(channel.id) ||
        (channel.index === 2 && buttons.start_b),
    )
    .map((channel) => channel.letter);

  return {
    title: M20_TEXT.title,
    subtitle: M20_TEXT.subtitle_project,
    status: keys.length > 0 ? M20_TEXT.status_project : '',
    elements: channelsView(s, host, view),
    help: M20_TEXT.footer_project(keys),
  };
}

/** The channel state the surface shows on the step view (the spec's convenience). */
export function m20SurfaceChannel(
  s: Readonly<M20Project>,
  id: M20ChannelId,
): M20ChannelState {
  return m20ChannelOf(s as M20Project, id);
}
