/**
 * M16 — the work-surface model of the protocol console (Unit 19). Maps the
 * pure series state to a `WorkSurfaceModel` in the WIDE FRAME of
 * research-owner decision D-U17-2 (used as is): the panel over the whole
 * visible design area, a 714 px left column (the rule card, then the
 * worked example or the vial label) and a 300 px right column (the
 * teaching note, or the question with its four drawer tiles and the commit
 * controls), 16 px design text everywhere. Every activation calls the same
 * adapter command with its input mode (pointer / keyboard parity); the
 * commands and the state reader are injected through the host
 * (`bindM16Surface` in `m16ProtocolConsole.ts`), so this module is PURE
 * (no runtime import) and the pure spec renders every view.
 *
 * Presentation rules (decision D-U19-1 with amendment A1): nothing on
 * screen depends on the correctness of any answer before the sixth first
 * response; the acknowledgement is identical for every response and
 * carries HELP and LEAVE CONSOLE; the worked examples are never rendered
 * after the boundary; a confirmation dialog and the help sheet are drawn
 * alone with the header and the status line, the confirm or close control
 * first in the focus order; the confirm control never sits where the
 * control that opened the dialog sat; DON'T KNOW is never adjacent to
 * LEAVE CONSOLE; results page 1 carries HELP, FINISH and NEXT, page 2
 * HELP, FINISH and BACK, NEXT and BACK never sharing a position. The
 * model's settle on every view transition refuses a carried press; the
 * positions below additionally keep each view's primary control away from
 * the openers of the view before it.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  M16_RULE_CARD_LINES,
  M16_TEXT,
  m16LabelLine,
  m16Option,
  type M16Vial,
} from './m16HandlingContent';
import {
  m16AnsweredCount,
  type M16CommitKind,
  m16CurrentExample,
  m16CurrentVial,
  m16CurrentVialState,
  m16RecordLine,
  type M16RequestOutcome,
  type M16ResultsPage,
  m16ResultsVials,
  type M16Series,
} from './m16HandlingModel';
import type { InputMode } from './windowKit';

/** The adapter commands the surface routes every activation to. */
export interface M16SurfaceCommands {
  showExample1: (mode: InputMode, nowMs: number) => boolean;
  navigateExample: (
    direction: 'next' | 'back',
    mode: InputMode,
    nowMs: number,
  ) => boolean;
  requestTeachingClose: (mode: InputMode, nowMs: number) => boolean;
  draft: (optionId: string, mode: InputMode, nowMs: number) => boolean;
  request: (
    kind: M16CommitKind,
    mode: InputMode,
    nowMs: number,
  ) => M16RequestOutcome;
  cancel: (mode: InputMode, nowMs: number) => boolean;
  confirm: (mode: InputMode, nowMs: number) => unknown;
  /** FINISH may close the results only after the page settled. */
  finish: (nowMs: number) => boolean;
  next: (mode: InputMode, nowMs: number) => unknown;
  navigateResults: (
    direction: 'next' | 'back',
    mode: InputMode,
    nowMs: number,
  ) => boolean;
  help: (mode: InputMode, nowMs: number) => boolean;
  closeHelp: (nowMs: number) => boolean;
}

export interface M16SurfaceHost {
  now: () => number;
  /** Closes the surface (LEAVE CONSOLE, FINISH — the same path as ESC). */
  close: () => void;
  /** Neutral feedback line on the surface. */
  feedback: (message: string) => void;
  /** The series state (read only). */
  series: () => Readonly<M16Series>;
  commands: M16SurfaceCommands;
}

/** Design text size of every element in the wide frame (D-U17-2). */
export const M16_TEXT_PX = 16;
const BOX_H = 34;
const GAP = 4;
/** The left column and the right column (panel-relative; preview §10). */
const LEFT_X = 12;
const LEFT_W = 714;
const RIGHT_X = 738;
const RIGHT_W = 300;
const FULL_X = 12;
const FULL_W = 1026;
export const M16_CONTENT_TOP = 90;
const RULE_CARD_H = 196;
const BLOCK_Y = 294;
const EXAMPLE_BLOCK_H = 160;
const VIAL_BLOCK_H = 56;
const QUESTION_H = 72;
const TILES_Y = 170;
const RECORD_Y = 330;
const DONT_KNOW_Y = 384;
const BACK_TO_EXAMPLE_Y = 170;
/**
 * The bottom row: HELP and LEAVE CONSOLE at the left, the view's primary
 * control at the right, CLOSE HELP in the middle; on the results pages
 * FINISH at the left and NEXT (page 1) / BACK (page 2) at the right in
 * slots no other results control uses.
 */
export const M16_BOTTOM_ROW_Y = 462;
const HELP_X = FULL_X;
const HELP_W = 160;
const LEAVE_X = 184;
const LEAVE_W = 180;
const PRIMARY_X = 778;
const PRIMARY_W = 260;
const CLOSE_HELP_X = 388;
const FINISH_X = 184;
const FINISH_W = 180;
const BACK_X = 654;
const BACK_W = 112;
/**
 * The confirmation dialogs: text and two controls. The controls end at
 * panel x 720, left of the right column (x 738) that holds every opener
 * (RECORD DRAWER, DON'T KNOW) and clear of the bottom row (y 462) that
 * holds START THE SIX VIALS, so the second click of a double click on an
 * opener lands on nothing.
 */
const DIALOG_TEXT_Y = 170;
const DIALOG_BUTTON_Y = 250;
const DIALOG_X = 200;
const DIALOG_W = 520;
const DIALOG_BUTTON_W = 254;

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
    textPx: M16_TEXT_PX,
    align: 'left',
  };
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
    textPx: M16_TEXT_PX,
    state,
    onActivate,
  };
}

/** The probe / test id of a drawer tile (`option_1` …). */
export function m16OptionTileId(drawer: number): string {
  return `option_${drawer}`;
}

function helpAndLeave(host: M16SurfaceHost): SurfaceElement[] {
  return [
    button(
      'help',
      M16_TEXT.help,
      HELP_X,
      M16_BOTTOM_ROW_Y,
      HELP_W,
      'h',
      (mode) => {
        host.commands.help(mode, host.now());
      },
    ),
    button(
      'leave',
      M16_TEXT.leave,
      LEAVE_X,
      M16_BOTTOM_ROW_Y,
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
    M16_BOTTOM_ROW_Y,
    PRIMARY_W,
    undefined,
    onActivate,
    'accent',
  );
}

/** The rule card (left column, every example, vial and acknowledgement view). */
function ruleCard(): SurfaceElement {
  return text(
    'rule_card',
    M16_RULE_CARD_LINES.join('\n'),
    LEFT_X,
    M16_CONTENT_TOP,
    LEFT_W,
    RULE_CARD_H,
  );
}

/** The vial block under the rule card. */
function vialBlock(entry: M16Vial): SurfaceElement {
  return text(
    'vial_block',
    `${M16_TEXT.vial_heading(entry.index)}\n${m16LabelLine(entry.label)}`,
    LEFT_X,
    BLOCK_Y,
    LEFT_W,
    VIAL_BLOCK_H,
  );
}

/** The right column of a vial: the question (a neutral landing), four tiles, the commit controls. */
function vialColumn(
  s: Readonly<M16Series>,
  host: M16SurfaceHost,
): SurfaceElement[] {
  const entry = m16CurrentVial(s as M16Series);
  const state = m16CurrentVialState(s as M16Series);
  const elements: SurfaceElement[] = [
    {
      ...text(
        'question',
        M16_TEXT.question(entry.index),
        RIGHT_X,
        M16_CONTENT_TOP,
        RIGHT_W,
        QUESTION_H,
      ),
      // A neutral landing: its activation does nothing (the first drawer
      // tile is NOT pre-focused).
      onActivate: () => undefined,
    },
  ];
  let y = TILES_Y;

  for (const option of entry.options) {
    elements.push({
      id: m16OptionTileId(option.drawer),
      kind: 'tile',
      label: option.label,
      x: RIGHT_X,
      y,
      w: RIGHT_W,
      h: BOX_H,
      textPx: M16_TEXT_PX,
      align: 'left',
      hotkey: String(option.drawer),
      state: state.draft === option.id ? 'selected' : 'idle',
      onActivate: (mode) => {
        host.commands.draft(option.id, mode, host.now());
      },
    });
    y += BOX_H + GAP;
  }

  elements.push(
    button(
      'record_drawer',
      M16_TEXT.record_drawer,
      RIGHT_X,
      RECORD_Y,
      RIGHT_W,
      'r',
      (mode) => {
        if (host.commands.request('option', mode, host.now()) === 'no_draft') {
          host.feedback(M16_TEXT.choose_drawer_first);
        }
      },
      state.draft === null ? undefined : 'accent',
    ),
  );
  elements.push(
    button(
      'dont_know',
      M16_TEXT.dont_know,
      RIGHT_X,
      DONT_KNOW_Y,
      RIGHT_W,
      'n',
      (mode) => {
        host.commands.request('dont_know', mode, host.now());
      },
    ),
  );

  return elements;
}

/** The results page text (only after the sixth answer). */
export function m16ResultsText(
  page: M16ResultsPage,
  s: Readonly<M16Series>,
): string {
  const lines: string[] = [M16_TEXT.results_first_line, ''];

  for (const entry of m16ResultsVials(page)) {
    const state = s.vials[entry.index - 1];
    const response = state.first_response;
    const recorded =
      response === null
        ? '—'
        : response.response_kind === 'dont_know'
          ? M16_TEXT.dont_know_recorded
          : M16_TEXT.drawer_recorded(
              m16Option(entry.id, response.option_id ?? '')?.drawer ?? 0,
            );

    lines.push(
      M16_TEXT.results_vial_line(entry.index, entry.label),
      M16_TEXT.results_recorded_line(recorded, entry.key_drawer),
      entry.explanation[0],
      entry.explanation[1],
      '',
    );
  }

  return lines.join('\n').trimEnd();
}

export function m16SurfaceModel(host: M16SurfaceHost): WorkSurfaceModel {
  const s = host.series();
  const answered = m16AnsweredCount(s as M16Series);
  const elements: SurfaceElement[] = [];
  const recordLine = m16RecordLine(s as M16Series);

  if (recordLine !== null || s.view === 'record') {
    // A closed record: the line and — except for the reload hold-back,
    // whose count belongs to the earlier page load — the recorded count;
    // no results, no help, nothing recorded.
    const heldBack = s.status === 'held_back';
    const line = recordLine ?? M16_TEXT.fault;

    elements.push(
      text(
        'record_text',
        heldBack ? line : `${line}\n\n${M16_TEXT.status_recorded(answered)}`,
        FULL_X,
        M16_CONTENT_TOP,
        FULL_W,
        80,
      ),
    );
    elements.push(
      button(
        'leave',
        M16_TEXT.leave,
        LEAVE_X,
        M16_BOTTOM_ROW_Y,
        LEAVE_W,
        undefined,
        () => host.close(),
      ),
    );

    return {
      title: M16_TEXT.title,
      subtitle: '',
      status: '',
      elements,
      help: M16_TEXT.footer_record,
    };
  }

  const inTeaching = s.status === 'teaching';
  const inMeasurement = s.status === 'measurement';
  const inResults = s.status === 'completed' && s.view === 'results';
  const headerTitle = inResults
    ? M16_TEXT.results_title(s.results_page)
    : M16_TEXT.title;
  const headerSubtitle = inTeaching
    ? M16_TEXT.subtitle_example(m16CurrentExample(s as M16Series).index)
    : inMeasurement || (s.status === 'completed' && !inResults)
      ? M16_TEXT.subtitle_vial(m16CurrentVial(s as M16Series).index)
      : '';
  const headerStatus = inTeaching
    ? M16_TEXT.status_teaching
    : inResults
      ? M16_TEXT.results_status
      : s.view === 'vial'
        ? M16_TEXT.status_vial
        : s.view === 'acknowledgement'
          ? M16_TEXT.status_recorded(answered)
          : '';

  if (s.help_open) {
    // The help sheet alone with the header and the status line; CLOSE
    // HELP is the first focusable element (ENTER closes it) and sits in
    // the middle of the bottom row, where no other view holds a control.
    elements.push(
      button(
        'close_help',
        M16_TEXT.close_help,
        CLOSE_HELP_X,
        M16_BOTTOM_ROW_Y,
        PRIMARY_W,
        'h',
        () => {
          host.commands.closeHelp(host.now());
        },
        'accent',
      ),
    );
    elements.push(
      text(
        'help_text',
        `${M16_TEXT.help_title}\n\n${M16_TEXT.help_lines.join('\n')}`,
        FULL_X,
        M16_CONTENT_TOP,
        FULL_W,
        300,
      ),
    );

    return {
      title: headerTitle,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M16_TEXT.footer_help,
    };
  }

  const pending = s.pending_commit;

  if (pending !== null) {
    // A confirmation dialog alone with the header and the status line:
    // the confirm control is the first focusable element (ENTER
    // confirms); neither control overlaps the place of any opener.
    const teaching = pending.target === 'teaching_close';
    let dialogText: string;
    let confirmLabel: string;

    if (teaching) {
      dialogText = M16_TEXT.confirm_start;
      confirmLabel = M16_TEXT.confirm_start_control;
    } else {
      const entry = m16CurrentVial(s as M16Series);

      if (pending.kind === 'dont_know') {
        dialogText = M16_TEXT.confirm_dont_know(entry.index);
        confirmLabel = M16_TEXT.confirm_record_control;
      } else {
        // The dialog repeats the drafted drawer (decision D-U19-1 item 2,
        // selection (a)).
        const drawer =
          m16Option(entry.id, pending.option_id ?? '')?.drawer ?? 0;

        dialogText = M16_TEXT.confirm_drawer(drawer, entry.index);
        confirmLabel = M16_TEXT.confirm_drawer_control;
      }
    }

    elements.push(
      button(
        'confirm',
        confirmLabel,
        DIALOG_X,
        DIALOG_BUTTON_Y,
        DIALOG_BUTTON_W,
        undefined,
        (mode) => {
          host.commands.confirm(mode, host.now());
        },
        'accent',
      ),
    );
    elements.push(
      button(
        teaching ? 'keep_reading' : 'keep_working',
        teaching ? M16_TEXT.keep_reading : M16_TEXT.keep_working,
        DIALOG_X + DIALOG_BUTTON_W + 12,
        DIALOG_BUTTON_Y,
        DIALOG_BUTTON_W,
        undefined,
        (mode) => {
          host.commands.cancel(mode, host.now());
        },
      ),
    );
    elements.push(
      text('dialog_text', dialogText, DIALOG_X, DIALOG_TEXT_Y, DIALOG_W, 72),
    );

    return {
      title: headerTitle,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: teaching ? M16_TEXT.footer_start_dialog : M16_TEXT.footer_dialog,
    };
  }

  if (s.status === 'intro') {
    elements.push(
      primaryButton('show_example', M16_TEXT.show_example_1, (mode) => {
        host.commands.showExample1(mode, host.now());
      }),
    );
    elements.push(
      text(
        'intro_text',
        M16_TEXT.intro.join('\n'),
        FULL_X,
        M16_CONTENT_TOP,
        FULL_W,
        200,
      ),
    );
    elements.push(...helpAndLeave(host));

    return {
      title: M16_TEXT.title,
      subtitle: '',
      status: '',
      elements,
      help: M16_TEXT.footer_card,
    };
  }

  if (inTeaching) {
    const example = m16CurrentExample(s as M16Series);

    // The teaching note: a neutral focus landing (its activation does
    // nothing), so that ENTER carried from SHOW EXAMPLE 1, NEXT EXAMPLE,
    // BACK TO EXAMPLE 1, KEEP READING or CLOSE HELP presses no control.
    elements.push({
      ...text(
        'teaching_note',
        M16_TEXT.teaching_note,
        RIGHT_X,
        M16_CONTENT_TOP,
        RIGHT_W,
        QUESTION_H,
      ),
      onActivate: () => undefined,
    });
    elements.push(ruleCard());
    elements.push(
      text(
        'example_block',
        example.lines.join('\n'),
        LEFT_X,
        BLOCK_Y,
        LEFT_W,
        EXAMPLE_BLOCK_H,
      ),
    );

    if (example.index === 1) {
      elements.push(
        primaryButton('next_example', M16_TEXT.next_example, (mode) => {
          host.commands.navigateExample('next', mode, host.now());
        }),
      );
    } else {
      elements.push(
        primaryButton('start_vials', M16_TEXT.start_vials, (mode) => {
          host.commands.requestTeachingClose(mode, host.now());
        }),
      );
      elements.push(
        button(
          'back_to_example_1',
          M16_TEXT.back_to_example_1,
          RIGHT_X,
          BACK_TO_EXAMPLE_Y,
          RIGHT_W,
          undefined,
          (mode) => {
            host.commands.navigateExample('back', mode, host.now());
          },
        ),
      );
    }

    elements.push(...helpAndLeave(host));

    return {
      title: headerTitle,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M16_TEXT.footer_card,
    };
  }

  if (inResults) {
    const page = s.results_page;

    if (page === 1) {
      elements.push(
        primaryButton('results_next', M16_TEXT.next, (mode) => {
          host.commands.navigateResults('next', mode, host.now());
        }),
      );
    }

    elements.push(
      button(
        'finish',
        M16_TEXT.finish,
        FINISH_X,
        M16_BOTTOM_ROW_Y,
        FINISH_W,
        undefined,
        () => {
          if (host.commands.finish(host.now())) {
            host.close();
          }
        },
      ),
    );

    if (page === 2) {
      elements.push(
        button(
          'results_back',
          M16_TEXT.back,
          BACK_X,
          M16_BOTTOM_ROW_Y,
          BACK_W,
          undefined,
          (mode) => {
            host.commands.navigateResults('back', mode, host.now());
          },
        ),
      );
    }

    elements.push(
      button(
        'help',
        M16_TEXT.help,
        HELP_X,
        M16_BOTTOM_ROW_Y,
        HELP_W,
        'h',
        (mode) => {
          host.commands.help(mode, host.now());
        },
      ),
    );
    elements.push(
      text(
        'results_text',
        m16ResultsText(page, s),
        FULL_X,
        M16_CONTENT_TOP,
        FULL_W,
        360,
      ),
    );

    return {
      title: headerTitle,
      subtitle: '',
      status: headerStatus,
      elements,
      help: M16_TEXT.footer_results,
    };
  }

  // The measurement phase (and the acknowledgement after the sixth vial).
  const entry = m16CurrentVial(s as M16Series);

  if (s.view === 'acknowledgement' && s.acknowledgement !== null) {
    const control = s.acknowledgement.next_control;

    elements.push(
      primaryButton(
        'next',
        control === 'show_results' ? M16_TEXT.show_results : M16_TEXT.next_vial,
        (mode) => {
          host.commands.next(mode, host.now());
        },
      ),
    );
    elements.push(ruleCard());
    elements.push(vialBlock(entry));
    elements.push(
      text(
        'acknowledgement',
        M16_TEXT.acknowledgement(entry.index),
        RIGHT_X,
        M16_CONTENT_TOP,
        RIGHT_W,
        50,
      ),
    );
    elements.push(...helpAndLeave(host));

    return {
      title: headerTitle,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M16_TEXT.footer_vial,
    };
  }

  // A vial view.
  elements.push(...vialColumn(s, host));
  elements.push(ruleCard());
  elements.push(vialBlock(entry));
  elements.push(...helpAndLeave(host));

  return {
    title: headerTitle,
    subtitle: headerSubtitle,
    status: headerStatus,
    elements,
    help: M16_TEXT.footer_vial,
  };
}
