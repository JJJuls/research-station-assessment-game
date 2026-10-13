/**
 * M19 — the work-surface model of the coupling panel (Unit 21). Maps the
 * pure series state to a `WorkSurfaceModel` in the WIDE FRAME of
 * research-owner decision D-U17-2 (used as is): the panel over the whole
 * visible design area, a 714 px left column (the line sheet, then the TRY
 * list) and a 300 px right column (the readout, the setting controls, TRY
 * and SET ASIDE), 16 px design text everywhere. Every activation calls the
 * same adapter command with its input mode (pointer / keyboard parity); the
 * commands and the state reader are injected through the host
 * (`bindM19Surface` in `m19CouplingPanel.ts`), so this module is PURE (no
 * runtime import) and the pure spec renders every view.
 *
 * Presentation rules (decision D-U21-1): nothing on screen marks the
 * boundary — the truthful reading and the TRY list only; the finished view
 * is the same neutral view whether the line was restored or set aside; a
 * confirmation dialog and the help sheet are drawn alone with the header
 * and the status line, the confirm or close control first in the focus
 * order; the confirm control never sits where the control that opened the
 * dialog sat (every opener in the right column at x ≥ 738, every dialog
 * control at panel x 200–720); every view lands on a neutral, non-acting
 * first focusable element (the card text, the check question, the
 * explanation, the recorded line, the readout, the finished line, the closed
 * record), so no actionable control is focused until TAB or a hotkey. The
 * model's settle on every view transition refuses a carried press.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  M19_LINES,
  M19_TEXT,
  type M19Control,
  type M19Line,
  type M19Line1Setting,
  type M19Line2Setting,
  type M19Setting,
} from './m19LinesContent';
import {
  type M19ChangeOutcome,
  m19CheckOf,
  type M19ConfirmOutcome,
  type M19LineState,
  m19LogRows,
  m19RecordLine,
  type M19RecordOutcome,
  type M19Series,
  type M19TryOutcome,
} from './m19LinesModel';
import type { InputMode } from './windowKit';

/** The adapter commands the surface routes every activation to. */
export interface M19SurfaceCommands {
  continue: (mode: InputMode, nowMs: number) => boolean;
  draft: (optionId: string, mode: InputMode, nowMs: number) => boolean;
  recordAnswer: (mode: InputMode, nowMs: number) => M19RecordOutcome;
  continueExplanation: (mode: InputMode, nowMs: number) => boolean;
  startLine1: (mode: InputMode, nowMs: number) => boolean;
  change: (
    control: M19Control,
    mode: InputMode,
    nowMs: number,
  ) => M19ChangeOutcome;
  try: (mode: InputMode, nowMs: number) => M19TryOutcome;
  requestSetAside: (mode: InputMode, nowMs: number) => boolean;
  cancelSetAside: (mode: InputMode, nowMs: number) => boolean;
  confirmSetAside: (mode: InputMode, nowMs: number) => M19ConfirmOutcome;
  nextLine: (mode: InputMode, nowMs: number) => boolean;
  /** FINISH may close the surface only after the final view settled. */
  finish: (mode: InputMode, nowMs: number) => boolean;
  help: (mode: InputMode, nowMs: number) => boolean;
  closeHelp: (mode: InputMode, nowMs: number) => boolean;
}

export interface M19SurfaceHost {
  now: () => number;
  /** Closes the surface (LEAVE, FINISH — the same path as ESC). */
  close: () => void;
  /** Neutral feedback line on the surface. */
  feedback: (message: string) => void;
  /** The series state (read only). */
  series: () => Readonly<M19Series>;
  commands: M19SurfaceCommands;
}

/** Design text size of every element in the wide frame (D-U17-2). */
export const M19_TEXT_PX = 16;
const BOX_H = 34;
const GAP = 4;
const LEFT_X = 12;
const LEFT_W = 714;
const RIGHT_X = 738;
const RIGHT_W = 300;
const FULL_X = 12;
const FULL_W = 1026;
export const M19_CONTENT_TOP = 90;
const SHEET_H = 112;
const LOG_Y = M19_CONTENT_TOP + SHEET_H + 12;
const LOG_H = 176;
const CONTROL_Y = M19_CONTENT_TOP + BOX_H + 10;
const TRY_Y = 340;
const ASIDE_Y = 394;
export const M19_BOTTOM_ROW_Y = 462;
const HELP_X = FULL_X;
const HELP_W = 160;
const LEAVE_X = 184;
const LEAVE_W = 180;
const PRIMARY_X = 778;
const PRIMARY_W = 260;
const CLOSE_HELP_X = 388;
const OPTION_Y = 140;
const RECORD_Y = 270;
const RECORD_W = 300;
/**
 * The confirmation dialog: text and two controls. The controls end at
 * panel x 720, left of the right column (x 738) that holds every opener
 * (TRY, SET ASIDE), so the second click of a double click on an opener
 * lands on nothing.
 */
const DIALOG_TEXT_Y = 170;
const DIALOG_BUTTON_Y = 250;
const DIALOG_X = 200;
const DIALOG_W = 520;
const DIALOG_BUTTON_W = 254;
const HELP_SHEET_Y = 56;

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
    textPx: M19_TEXT_PX,
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
    textPx: M19_TEXT_PX,
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
  selected: boolean,
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
    textPx: M19_TEXT_PX,
    align: 'left',
    valign: 'top',
    state: selected ? 'selected' : 'idle',
    onActivate,
  };
}

export function m19HeaterTileId(index: number): string {
  return `heater_${index}`;
}

export function m19OptionTileId(index: number): string {
  return `option_${index}`;
}

function helpAndLeave(host: M19SurfaceHost): SurfaceElement[] {
  return [
    button(
      'help',
      M19_TEXT.help,
      HELP_X,
      M19_BOTTOM_ROW_Y,
      HELP_W,
      'h',
      (mode) => {
        host.commands.help(mode, host.now());
      },
    ),
    button(
      'leave',
      M19_TEXT.leave,
      LEAVE_X,
      M19_BOTTOM_ROW_Y,
      LEAVE_W,
      undefined,
      () => host.close(),
    ),
  ];
}

function primaryButton(
  id: string,
  label: string,
  onActivate: (mode: InputMode) => void,
): SurfaceElement {
  return button(
    id,
    label,
    PRIMARY_X,
    M19_BOTTOM_ROW_Y,
    PRIMARY_W,
    undefined,
    onActivate,
    'accent',
  );
}

function sheet(def: M19Line): SurfaceElement {
  return text(
    'sheet',
    def.sheet_lines.join('\n'),
    LEFT_X,
    M19_CONTENT_TOP,
    LEFT_W,
    SHEET_H,
  );
}

function log(line: M19LineState): SurfaceElement {
  return text('log', m19LogRows(line).join('\n'), LEFT_X, LOG_Y, LEFT_W, LOG_H);
}

function readoutOf(def: M19Line, setting: M19Setting): string {
  return (def.readout as (s: M19Setting) => string)(setting);
}

/** The right column of a line in work: the readout (a neutral landing), the controls, TRY, SET ASIDE. */
function lineControls(
  def: M19Line,
  line: M19LineState,
  host: M19SurfaceHost,
): SurfaceElement[] {
  const elements: SurfaceElement[] = [
    landing(
      'readout',
      readoutOf(def, line.setting),
      RIGHT_X,
      M19_CONTENT_TOP,
      RIGHT_W,
      BOX_H,
    ),
  ];
  const change = (control: M19Control) => (mode: InputMode) => {
    const outcome = host.commands.change(control, mode, host.now());

    if (outcome === 'limit') {
      host.feedback(
        M19_TEXT.dial_limit((line.setting as M19Line2Setting).dial),
      );
    }
  };

  if (def.index === 1) {
    const setting = line.setting as M19Line1Setting;
    const on = [setting.h1, setting.h2, setting.h3];

    for (const k of [1, 2, 3] as const) {
      elements.push(
        tile(
          m19HeaterTileId(k),
          M19_TEXT.heater_tile(k),
          RIGHT_X,
          CONTROL_Y + (k - 1) * (BOX_H + GAP),
          RIGHT_W,
          String(k),
          on[k - 1],
          change(`h${k}` as M19Control),
        ),
      );
    }

    elements.push(
      button(
        'feed',
        M19_TEXT.feed,
        RIGHT_X,
        CONTROL_Y + 3 * (BOX_H + GAP),
        RIGHT_W,
        '4',
        change('feed'),
      ),
    );
  } else {
    elements.push(
      button(
        'dial_down',
        M19_TEXT.dial_down,
        RIGHT_X,
        CONTROL_Y,
        RIGHT_W,
        '1',
        change('dial_down'),
      ),
      button(
        'dial_up',
        M19_TEXT.dial_up,
        RIGHT_X,
        CONTROL_Y + (BOX_H + GAP),
        RIGHT_W,
        '2',
        change('dial_up'),
      ),
      button(
        'bypass',
        M19_TEXT.bypass,
        RIGHT_X,
        CONTROL_Y + 2 * (BOX_H + GAP),
        RIGHT_W,
        '3',
        change('bypass'),
      ),
    );
  }

  elements.push(
    button(
      'try',
      M19_TEXT.try,
      RIGHT_X,
      TRY_Y,
      RIGHT_W,
      't',
      (mode) => {
        const outcome = host.commands.try(mode, host.now());

        if (outcome.kind === 'executed') {
          host.feedback(
            M19_TEXT.try_feedback(
              outcome.attempt.index,
              outcome.attempt.reading,
              def.index,
            ),
          );
        } else if (outcome.kind === 'already_tried') {
          host.feedback(M19_TEXT.already_tried(outcome.attempt_index));
        }
      },
      'accent',
    ),
    button(
      'set_aside',
      M19_TEXT.set_aside,
      RIGHT_X,
      ASIDE_Y,
      RIGHT_W,
      'n',
      (mode) => {
        host.commands.requestSetAside(mode, host.now());
      },
    ),
  );

  return elements;
}

function checkView(
  s: Readonly<M19Series>,
  host: M19SurfaceHost,
): SurfaceElement[] {
  const stage = s.check.stage === 'q2' ? 'q2' : 'q1';
  const check = m19CheckOf(stage);
  const elements: SurfaceElement[] = [
    landing('question', check.question, LEFT_X, M19_CONTENT_TOP, FULL_W, 40),
  ];

  check.options.forEach((option, at) => {
    elements.push(
      tile(
        m19OptionTileId(option.index),
        option.label,
        LEFT_X,
        OPTION_Y + at * (BOX_H + GAP),
        LEFT_W,
        String(option.index),
        s.check.draft === option.id,
        (mode) => {
          host.commands.draft(option.id, mode, host.now());
        },
      ),
    );
  });
  elements.push(
    button(
      'record',
      M19_TEXT.record_answer,
      LEFT_X,
      RECORD_Y,
      RECORD_W,
      'r',
      (mode) => {
        if (host.commands.recordAnswer(mode, host.now()) === 'no_draft') {
          host.feedback(M19_TEXT.choose_answer_first);
        }
      },
      s.check.draft === null ? undefined : 'accent',
    ),
  );
  elements.push(...helpAndLeave(host));

  return elements;
}

function dialog(line: number, host: M19SurfaceHost): SurfaceElement[] {
  return [
    button(
      'confirm',
      M19_TEXT.aside_confirm,
      DIALOG_X,
      DIALOG_BUTTON_Y,
      DIALOG_BUTTON_W,
      undefined,
      (mode) => {
        host.commands.confirmSetAside(mode, host.now());
      },
      'accent',
    ),
    button(
      'back',
      M19_TEXT.aside_back,
      DIALOG_X + DIALOG_BUTTON_W + 12,
      DIALOG_BUTTON_Y,
      DIALOG_BUTTON_W,
      undefined,
      (mode) => {
        host.commands.cancelSetAside(mode, host.now());
      },
    ),
    text(
      'dialog',
      M19_TEXT.aside(line).join('\n'),
      DIALOG_X,
      DIALOG_TEXT_Y,
      DIALOG_W,
      72,
    ),
  ];
}

export function m19SurfaceModel(host: M19SurfaceHost): WorkSurfaceModel {
  const s = host.series();
  const elements: SurfaceElement[] = [];
  const recordLine = m19RecordLine(s as M19Series);

  if (recordLine !== null) {
    // A closed record (or the final record of a completed series): the
    // line (a neutral landing) and LEAVE; nothing recorded.
    elements.push(
      landing('closed', recordLine, FULL_X, M19_CONTENT_TOP, FULL_W, BOX_H),
    );
    elements.push(
      button(
        'leave',
        M19_TEXT.leave,
        LEAVE_X,
        M19_BOTTOM_ROW_Y,
        LEAVE_W,
        undefined,
        () => host.close(),
      ),
    );

    return {
      title: M19_TEXT.title,
      subtitle: '',
      status: '',
      elements,
      help: M19_TEXT.footer_record,
    };
  }

  const lineNumber = s.line + 1;
  const inLines = s.status === 'lines' || s.status === 'completed';
  const headerSubtitle =
    s.status === 'intro'
      ? M19_TEXT.subtitle_card
      : s.status === 'check'
        ? M19_TEXT.subtitle_check
        : M19_TEXT.subtitle_line(lineNumber);
  const headerStatus =
    s.status === 'intro'
      ? M19_TEXT.status_card
      : s.status === 'check'
        ? M19_TEXT.status_check
        : s.view === 'finished'
          ? M19_TEXT.status_finished_lines(
              s.lines.filter((line) => line.finish !== null).length,
            )
          : M19_TEXT.status_line(lineNumber);

  if (s.help_open) {
    // The help sheet alone; CLOSE HELP is the first focusable element and
    // sits in the middle of the bottom row, where no other view holds a
    // control.
    elements.push(
      button(
        'close_help',
        M19_TEXT.close_help,
        CLOSE_HELP_X,
        M19_BOTTOM_ROW_Y,
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
        M19_TEXT.help_lines.join('\n'),
        FULL_X,
        HELP_SHEET_Y,
        FULL_W,
        186,
      ),
    );

    return {
      title: M19_TEXT.help_title,
      subtitle: '',
      status: '',
      elements,
      help: M19_TEXT.footer_help,
    };
  }

  if (s.pending_set_aside !== null) {
    elements.push(...dialog(s.pending_set_aside.line + 1, host));

    return {
      title: M19_TEXT.title,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M19_TEXT.footer_dialog,
    };
  }

  if (s.status === 'intro') {
    elements.push(
      landing(
        'intro',
        M19_TEXT.intro.join('\n'),
        FULL_X,
        M19_CONTENT_TOP,
        FULL_W,
        186,
      ),
    );
    elements.push(
      primaryButton('continue', M19_TEXT.continue, (mode) => {
        host.commands.continue(mode, host.now());
      }),
    );
    elements.push(...helpAndLeave(host));

    return {
      title: M19_TEXT.title,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M19_TEXT.footer_card,
    };
  }

  if (s.status === 'check') {
    if (s.view === 'explanation') {
      elements.push(
        landing(
          'explanation',
          M19_TEXT.explanation.join('\n'),
          FULL_X,
          M19_CONTENT_TOP,
          FULL_W,
          96,
        ),
      );
      elements.push(
        primaryButton('continue', M19_TEXT.continue, (mode) => {
          host.commands.continueExplanation(mode, host.now());
        }),
      );
      elements.push(...helpAndLeave(host));

      return {
        title: M19_TEXT.title,
        subtitle: headerSubtitle,
        status: headerStatus,
        elements,
        help: M19_TEXT.footer_card,
      };
    }

    if (s.view === 'recorded') {
      elements.push(
        landing(
          'recorded',
          M19_TEXT.check_recorded,
          FULL_X,
          M19_CONTENT_TOP,
          FULL_W,
          BOX_H,
        ),
      );
      elements.push(
        primaryButton('start', M19_TEXT.start_line_1, (mode) => {
          host.commands.startLine1(mode, host.now());
        }),
      );
      elements.push(...helpAndLeave(host));

      return {
        title: M19_TEXT.title,
        subtitle: headerSubtitle,
        status: headerStatus,
        elements,
        help: M19_TEXT.footer_card,
      };
    }

    return {
      title: M19_TEXT.title,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements: checkView(s, host),
      help: M19_TEXT.footer_check,
    };
  }

  if (!inLines) {
    // Unreachable in the build (the closed statuses return the record above).
    return {
      title: M19_TEXT.title,
      subtitle: '',
      status: '',
      elements: [],
      help: M19_TEXT.footer_record,
    };
  }

  const def = M19_LINES[s.line] as M19Line;
  const line = s.lines[s.line];

  if (s.view === 'finished') {
    const how = line.finish === 'restored' ? 'restored' : 'set aside';
    const finishedLine = M19_TEXT.line_finished(line.index, how);
    const last = s.status === 'completed';

    elements.push(
      landing(
        'finished_line',
        last ? `${finishedLine}\n${M19_TEXT.both_finished}` : finishedLine,
        RIGHT_X,
        M19_CONTENT_TOP,
        RIGHT_W,
        last ? 60 : BOX_H,
      ),
    );
    elements.push(
      last
        ? primaryButton('finish', M19_TEXT.finish, (mode) => {
            if (host.commands.finish(mode, host.now())) {
              host.close();
            }
          })
        : primaryButton('next', M19_TEXT.next_line, (mode) => {
            host.commands.nextLine(mode, host.now());
          }),
    );
    elements.push(sheet(def));
    elements.push(log(line));
    elements.push(...helpAndLeave(host));

    return {
      title: M19_TEXT.title,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M19_TEXT.footer_finished,
    };
  }

  // A line in work: the readout (a neutral landing) first in the focus
  // order, then the controls, TRY, SET ASIDE; the sheet and the TRY list.
  const [readout, ...controls] = lineControls(def, line, host);

  elements.push(readout);
  elements.push(sheet(def));
  elements.push(log(line));
  elements.push(...controls);
  elements.push(...helpAndLeave(host));

  return {
    title: M19_TEXT.title,
    subtitle: headerSubtitle,
    status: headerStatus,
    elements,
    help: def.footer,
  };
}
