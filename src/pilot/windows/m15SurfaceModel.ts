/**
 * M15 — the work-surface model of the two relay boxes (Unit 18). Maps the
 * pure series state to a `WorkSurfaceModel` in the WIDE FRAME of
 * research-owner decision D-U17-2 (used as is): the panel over the whole
 * visible design area, a 714 px bench column (dials, tests, the test
 * record, the wiring options or the recorded wiring) and a 300 px right
 * column (the wiring instruction or the question with its options and
 * commit controls), 16 px design text everywhere. Every activation calls
 * the same adapter command with its input mode (pointer / keyboard
 * parity); the commands and the state reader are injected through the
 * host (`bindM15Surface` in `m15RelayBench.ts`), so this module is PURE
 * (no runtime import) and the pure spec renders every view.
 *
 * Presentation rules (decision D-U18-1): nothing on screen depends on the
 * correctness of any wiring or answer before the fourth first response;
 * the acknowledgement is identical for every response; a confirmation
 * dialog and the help sheet are drawn alone with the header and the
 * status line, the confirm or close control first in the focus order;
 * the confirm control never sits where the control that opened the
 * dialog sat; CANNOT SOLVE is never adjacent to LEAVE BENCH. The model's
 * settle on every view transition refuses a carried press; the positions
 * below additionally keep each view's primary control away from the
 * openers of the view before it.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  M15_BOXES,
  M15_TEXT,
  m15AnswerOption,
  type M15Box,
  type M15BoxId,
  m15DialLetter,
} from './m15SystemsContent';
import {
  m15AnsweredCount,
  type M15BoxState,
  type M15CommitKind,
  m15CurrentBox,
  m15CurrentBoxState,
  m15CurrentQuestion,
  m15CurrentQuestionState,
  m15RecordedWiringText,
  m15RecordLine,
  type M15RequestOutcome,
  type M15Series,
  type M15TestOutcome,
} from './m15SystemsModel';
import type { InputMode } from './windowKit';

/** The adapter commands the surface routes every activation to. */
export interface M15SurfaceCommands {
  start: (mode: InputMode, nowMs: number) => boolean;
  test: (dialId: string, mode: InputMode, nowMs: number) => M15TestOutcome;
  draft: (optionId: string, mode: InputMode, nowMs: number) => boolean;
  request: (
    kind: M15CommitKind,
    mode: InputMode,
    nowMs: number,
  ) => M15RequestOutcome;
  cancel: (mode: InputMode, nowMs: number) => boolean;
  confirm: (mode: InputMode, nowMs: number) => unknown;
  /** FINISH may close the results only after the view settled. */
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

export interface M15SurfaceHost {
  now: () => number;
  /** Closes the surface (LEAVE BENCH, FINISH — the same path as ESC). */
  close: () => void;
  /** Neutral feedback line on the surface. */
  feedback: (message: string) => void;
  /** The series state (read only). */
  series: () => Readonly<M15Series>;
  commands: M15SurfaceCommands;
}

/** Design text size of every element in the wide frame (D-U17-2). */
export const M15_TEXT_PX = 16;
const BOX_H = 34;
const GAP = 4;
/** The bench column and the right column (panel-relative). */
const BENCH_X = 12;
const BENCH_W = 714;
const TEST_W = 232;
const RIGHT_X = 738;
const RIGHT_W = 300;
const FULL_X = 12;
const FULL_W = 1026;
export const M15_CONTENT_TOP = 90;
/**
 * The bottom row: HELP and LEAVE BENCH at the left, the view's primary
 * control at the right, CLOSE HELP in the middle — each slot free in the
 * view that follows it, except where the model's settle guards it.
 */
export const M15_BOTTOM_ROW_Y = 462;
const HELP_X = FULL_X;
const HELP_W = 160;
const LEAVE_X = 184;
const LEAVE_W = 180;
const PRIMARY_X = 778;
const PRIMARY_W = 260;
const CLOSE_HELP_X = 388;
/**
 * The confirmation dialog: text and two controls. Its controls end at
 * panel x 720, left of the right column (x 738) that holds every opener
 * (RECORD WIRING, CANNOT TELL, RECORD ANSWER, CANNOT SOLVE), and sit at
 * y 250–284, clear of the bench column's controls (TEST at y 122, the
 * option tiles from y 298): the second click of a double click on an
 * opener lands on nothing.
 */
const DIALOG_TEXT_Y = 170;
const DIALOG_BUTTON_Y = 250;
const DIALOG_X = 200;
const DIALOG_W = 520;
const DIALOG_BUTTON_W = 254;

const LETTERS = ['A', 'B', 'C', 'D'] as const;

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
    textPx: M15_TEXT_PX,
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
    textPx: M15_TEXT_PX,
    state,
    onActivate,
  };
}

/** The probe / test id of a dial's TEST control (`test_f` …). */
export function m15TestId(dialId: string): string {
  return `test_${dialId.slice(3)}`;
}

/** The probe / test id of a wiring option tile (`wiring_a` …). */
export function m15WiringTileId(letter: string): string {
  return `wiring_${letter}`;
}

/** The probe / test id of an answer option tile (`option_a` …). */
export function m15OptionTileId(letter: string): string {
  return `option_${letter}`;
}

function helpAndLeave(host: M15SurfaceHost): SurfaceElement[] {
  return [
    button(
      'help',
      M15_TEXT.help,
      HELP_X,
      M15_BOTTOM_ROW_Y,
      HELP_W,
      'h',
      (mode) => {
        host.commands.help(mode, host.now());
      },
    ),
    button(
      'leave',
      M15_TEXT.leave,
      LEAVE_X,
      M15_BOTTOM_ROW_Y,
      LEAVE_W,
      undefined,
      () => host.close(),
    ),
  ];
}

/**
 * The bench column: the dials and units line, the two TEST controls (or
 * their disabled state beside "Tests closed"), the TEST RECORD and —
 * after the wiring — YOUR RECORDED WIRING.
 */
function benchColumn(
  box: M15Box,
  state: M15BoxState,
  host: M15SurfaceHost,
): { elements: SurfaceElement[]; bottom: number } {
  const elements: SurfaceElement[] = [];
  const testsOpen = state.wiring === null;
  let y = M15_CONTENT_TOP;

  elements.push(
    text('bench_parts', M15_TEXT.bench_parts(box), BENCH_X, y, BENCH_W, 28),
  );
  y += 32;

  box.dials.forEach((dial, position) => {
    elements.push(
      button(
        m15TestId(dial.id),
        M15_TEXT.test_dial(dial.letter, dial.hotkey),
        BENCH_X + position * (TEST_W + 8),
        y,
        TEST_W,
        testsOpen ? dial.hotkey : undefined,
        (mode) => {
          host.commands.test(dial.id, mode, host.now());
        },
        testsOpen ? undefined : 'disabled',
      ),
    );
  });

  if (!testsOpen) {
    elements.push(
      text('tests_closed', M15_TEXT.tests_closed, BENCH_X + 480, y, 230, BOX_H),
    );
  }

  y += BOX_H + 12;
  elements.push(
    text('record_title', M15_TEXT.record_title, BENCH_X, y, BENCH_W, 26),
  );
  y += 28;

  for (const dial of state.dials) {
    elements.push(
      text(
        `record_${dial.id.slice(3)}`,
        M15_TEXT.record_line(m15DialLetter(box, dial.id), dial.listing),
        BENCH_X,
        y,
        BENCH_W,
        30,
      ),
    );
    y += 32;
  }

  return { elements, bottom: y };
}

/** The wiring step's option tiles under the test record (bench column). */
function wiringTiles(
  box: M15Box,
  state: M15BoxState,
  host: M15SurfaceHost,
  top: number,
): SurfaceElement[] {
  const elements: SurfaceElement[] = [];
  let y = top + 10;

  elements.push(
    text(
      'wiring_heading',
      M15_TEXT.wiring_heading(box.index),
      BENCH_X,
      y,
      BENCH_W,
      26,
    ),
  );
  y += 28;

  box.wiring_options.forEach((option, position) => {
    elements.push({
      id: m15WiringTileId(option.letter),
      kind: 'tile',
      label: `${LETTERS[position]}  ${option.text}`,
      x: BENCH_X,
      y,
      w: BENCH_W,
      h: BOX_H,
      textPx: M15_TEXT_PX,
      align: 'left',
      hotkey: option.letter,
      state: state.wiring_draft === option.id ? 'selected' : 'idle',
      onActivate: (mode) => {
        host.commands.draft(option.id, mode, host.now());
      },
    });
    y += BOX_H + GAP;
  });

  return elements;
}

/** YOUR RECORDED WIRING under the test record (question views). */
function recordedWiring(
  box: M15Box,
  state: M15BoxState,
  top: number,
): SurfaceElement[] {
  const recorded = m15RecordedWiringText(box, state);

  if (recorded === null) {
    return [];
  }

  return [
    text(
      'recorded_wiring_title',
      M15_TEXT.recorded_wiring_title,
      BENCH_X,
      top + 10,
      BENCH_W,
      26,
    ),
    text('recorded_wiring', recorded, BENCH_X, top + 38, BENCH_W, 30),
  ];
}

/**
 * The wiring step's instruction: a neutral focus landing (its activation
 * does nothing), so that ENTER carried from START, NEXT BOX, KEEP WORKING
 * or CLOSE HELP never runs a test.
 */
function wiringLanding(): SurfaceElement {
  return {
    ...text(
      'wiring_instruction',
      M15_TEXT.wiring_instruction,
      RIGHT_X,
      M15_CONTENT_TOP,
      RIGHT_W,
      112,
    ),
    onActivate: () => undefined,
  };
}

/** The right column's two commit controls of the wiring step. */
function wiringControls(
  state: M15BoxState,
  host: M15SurfaceHost,
): SurfaceElement[] {
  return [
    button(
      'record_wiring',
      M15_TEXT.record_wiring,
      RIGHT_X,
      210,
      RIGHT_W,
      'r',
      (mode) => {
        if (host.commands.request('option', mode, host.now()) === 'no_draft') {
          host.feedback(M15_TEXT.choose_wiring_first);
        }
      },
      state.wiring_draft === null ? undefined : 'accent',
    ),
    button(
      'cannot_tell',
      M15_TEXT.cannot_tell,
      RIGHT_X,
      264,
      RIGHT_W,
      'n',
      (mode) => {
        host.commands.request('cannot', mode, host.now());
      },
    ),
  ];
}

/** The right column of a question: the question block, three options, the commit controls. */
function questionColumn(
  s: Readonly<M15Series>,
  host: M15SurfaceHost,
): SurfaceElement[] {
  const entry = m15CurrentQuestion(s as M15Series);
  const state = m15CurrentQuestionState(s as M15Series);
  const elements: SurfaceElement[] = [
    {
      ...text(
        'question',
        `${M15_TEXT.question_heading(entry.index)}\n${entry.text}`,
        RIGHT_X,
        M15_CONTENT_TOP,
        RIGHT_W,
        130,
      ),
      // A neutral landing: its activation does nothing.
      onActivate: () => undefined,
    },
  ];
  let y = M15_CONTENT_TOP + 134;

  entry.options.forEach((option, position) => {
    elements.push({
      id: m15OptionTileId(option.letter),
      kind: 'tile',
      label: `${LETTERS[position]}  ${option.label}`,
      x: RIGHT_X,
      y,
      w: RIGHT_W,
      h: BOX_H,
      textPx: M15_TEXT_PX,
      align: 'left',
      hotkey: option.letter,
      state: state.draft === option.id ? 'selected' : 'idle',
      onActivate: (mode) => {
        host.commands.draft(option.id, mode, host.now());
      },
    });
    y += BOX_H + GAP;
  });

  y += 8;
  elements.push(
    button(
      'record_answer',
      M15_TEXT.record_answer,
      RIGHT_X,
      y,
      RIGHT_W,
      'r',
      (mode) => {
        if (host.commands.request('option', mode, host.now()) === 'no_draft') {
          host.feedback(M15_TEXT.choose_answer_first);
        }
      },
      state.draft === null ? undefined : 'accent',
    ),
  );
  y += BOX_H + 20;
  elements.push(
    button(
      'cannot_solve',
      M15_TEXT.cannot_solve,
      RIGHT_X,
      y,
      RIGHT_W,
      'n',
      (mode) => {
        host.commands.request('cannot', mode, host.now());
      },
    ),
  );

  return elements;
}

/** The results view text of one box (only after the fourth answer). */
export function m15ResultsText(box: M15Box, s: Readonly<M15Series>): string {
  const state = s.boxes[box.index - 1];
  const stationWiring =
    box.wiring_options.find((option) => option.id === box.wiring_key_option_id)
      ?.text ?? '';
  const lines: string[] = [
    M15_TEXT.results_first_line,
    '',
    `${M15_TEXT.your_wiring} ${m15RecordedWiringText(box, state) ?? '—'}`,
    `${M15_TEXT.station_wiring} ${stationWiring}`,
    '',
  ];

  box.questions.forEach((entry, position) => {
    const response = state.questions[position].first_response;
    const recorded =
      response === null
        ? '—'
        : response.response_kind === 'cannot_solve'
          ? M15_TEXT.cannot_solve_answer
          : (m15AnswerOption(entry.id, response.option_id ?? '')?.label ?? '—');
    const key = m15AnswerOption(entry.id, entry.key_option_id)?.label ?? '';

    lines.push(
      M15_TEXT.results_question(entry.index, entry.short_title),
      `${M15_TEXT.your_answer} ${recorded}`,
      `${M15_TEXT.station_answer} ${key}`,
      entry.results_line,
      '',
    );
  });

  return lines.join('\n').trimEnd();
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
    M15_BOTTOM_ROW_Y,
    PRIMARY_W,
    undefined,
    onActivate,
    'accent',
  );
}

export function m15SurfaceModel(host: M15SurfaceHost): WorkSurfaceModel {
  const s = host.series();
  const answered = m15AnsweredCount(s as M15Series);
  const elements: SurfaceElement[] = [];
  const recordLine = m15RecordLine(s as M15Series);

  if (recordLine !== null || s.view === 'record') {
    // A closed record: the line and — except for the reload hold-back,
    // whose count belongs to the earlier page load — the recorded count;
    // no results, no help, nothing recorded.
    const heldBack = s.status === 'held_back';
    const line = recordLine ?? M15_TEXT.fault;

    elements.push(
      text(
        'record_text',
        heldBack ? line : `${line}\n\n${M15_TEXT.status_answers(answered)}`,
        FULL_X,
        M15_CONTENT_TOP,
        FULL_W,
        80,
      ),
    );
    elements.push(
      button(
        'leave',
        M15_TEXT.leave,
        LEAVE_X,
        M15_BOTTOM_ROW_Y,
        LEAVE_W,
        undefined,
        () => host.close(),
      ),
    );

    return {
      title: M15_TEXT.title,
      subtitle: '',
      status: '',
      elements,
      help: M15_TEXT.footer_record,
    };
  }

  const inFirstResponses = s.status === 'first_responses';
  const box = inFirstResponses ? m15CurrentBox(s as M15Series) : null;
  const boxState = inFirstResponses ? m15CurrentBoxState(s as M15Series) : null;
  const inWiring = s.view === 'wiring' || s.view === 'wiring_acknowledgement';
  const headerTitle = box?.title ?? M15_TEXT.title;
  const headerSubtitle = !inFirstResponses
    ? ''
    : inWiring
      ? M15_TEXT.subtitle_wiring
      : M15_TEXT.subtitle_question(m15CurrentQuestion(s as M15Series).index);
  const headerStatus = !inFirstResponses
    ? ''
    : s.view === 'wiring'
      ? M15_TEXT.status_wiring
      : s.view === 'wiring_acknowledgement'
        ? M15_TEXT.status_tests_closed
        : s.view === 'question'
          ? M15_TEXT.status_question
          : M15_TEXT.status_answers(answered);

  if (s.help_open) {
    // The help sheet alone with the header and the status line; CLOSE
    // HELP is the first focusable element (ENTER closes it) and sits in
    // the middle of the bottom row, where no other view holds a control.
    elements.push(
      button(
        'close_help',
        M15_TEXT.close_help,
        CLOSE_HELP_X,
        M15_BOTTOM_ROW_Y,
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
        `${M15_TEXT.help_title}\n\n${M15_TEXT.help_lines.join('\n')}`,
        FULL_X,
        M15_CONTENT_TOP,
        FULL_W,
        300,
      ),
    );

    return {
      title: headerTitle,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M15_TEXT.footer_help,
    };
  }

  if (s.status === 'orientation') {
    elements.push(
      primaryButton('start', M15_TEXT.start_box_1, (mode) => {
        host.commands.start(mode, host.now());
      }),
    );
    elements.push(
      text(
        'orientation',
        M15_TEXT.orientation.join('\n'),
        FULL_X,
        M15_CONTENT_TOP - 34,
        FULL_W,
        390,
      ),
    );
    elements.push(...helpAndLeave(host));

    return {
      title: M15_TEXT.title,
      subtitle: '',
      status: '',
      elements,
      help: M15_TEXT.footer_orientation,
    };
  }

  if (s.status === 'completed') {
    if (s.view === 'results') {
      const shown = M15_BOXES[s.results_box];

      elements.push(
        primaryButton(
          s.results_box === 0 ? 'results_next' : 'finish',
          s.results_box === 0 ? M15_TEXT.next_box : M15_TEXT.finish,
          (mode) => {
            if (s.results_box === 0) {
              host.commands.navigateResults('next', mode, host.now());
            } else if (host.commands.finish(host.now())) {
              host.close();
            }
          },
        ),
      );

      if (s.results_box === 0) {
        elements.push(
          button(
            'finish',
            M15_TEXT.finish,
            LEAVE_X,
            M15_BOTTOM_ROW_Y,
            LEAVE_W,
            undefined,
            () => {
              if (host.commands.finish(host.now())) {
                host.close();
              }
            },
          ),
        );
      } else {
        elements.push(
          button(
            'results_back',
            M15_TEXT.back,
            LEAVE_X,
            M15_BOTTOM_ROW_Y,
            LEAVE_W,
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
          M15_TEXT.help,
          HELP_X,
          M15_BOTTOM_ROW_Y,
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
          m15ResultsText(shown, s),
          FULL_X,
          M15_CONTENT_TOP,
          FULL_W,
          360,
        ),
      );

      return {
        title: M15_TEXT.results_title(shown.index),
        subtitle: '',
        status: M15_TEXT.results_status,
        elements,
        help: M15_TEXT.footer_results,
      };
    }

    // The acknowledgement after the fourth answer: the line and SHOW
    // RESULTS (the series is closed, so no bench controls are drawn).
    const last = M15_BOXES[1].questions[1];
    const lastBox = M15_BOXES[1];

    elements.push(
      primaryButton('next', M15_TEXT.show_results, (mode) => {
        host.commands.next(mode, host.now());
      }),
    );
    const lastBench = benchColumn(lastBox, s.boxes[1], host);

    elements.push(...lastBench.elements);
    elements.push(...recordedWiring(lastBox, s.boxes[1], lastBench.bottom));
    elements.push(
      text(
        'acknowledgement',
        M15_TEXT.acknowledgement_answer(last.index),
        RIGHT_X,
        M15_CONTENT_TOP,
        RIGHT_W,
        50,
      ),
    );
    elements.push(...helpAndLeave(host));

    return {
      title: lastBox.title,
      subtitle: M15_TEXT.subtitle_question(last.index),
      status: M15_TEXT.status_answers(answered),
      elements,
      help: M15_TEXT.footer,
    };
  }

  // The first-response phase.
  const currentBox = box!;
  const currentState = boxState!;
  const pending = s.pending_commit;

  if (pending !== null) {
    // A confirmation dialog alone with the header and the status line:
    // the confirm control is the first focusable element (ENTER
    // confirms); neither control overlaps the place of any opener.
    const cannot = pending.kind === 'cannot';
    let dialogText: string;
    let confirmLabel: string;

    if (pending.target === 'wiring') {
      const letterIndex = currentBox.wiring_options.findIndex(
        (option) => option.id === pending.option_id,
      );

      dialogText = cannot
        ? M15_TEXT.confirm_cannot_tell(currentBox.index)
        : M15_TEXT.confirm_wiring(LETTERS[letterIndex] ?? '', currentBox.index);
      confirmLabel = cannot
        ? M15_TEXT.confirm_record_control
        : M15_TEXT.confirm_wiring_control;
    } else {
      const entry = m15CurrentQuestion(s as M15Series);

      dialogText = cannot
        ? M15_TEXT.confirm_cannot_solve(entry.index)
        : M15_TEXT.confirm_answer(entry.index);
      confirmLabel = cannot
        ? M15_TEXT.confirm_record_control
        : M15_TEXT.confirm_answer_control;
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
        'keep_working',
        M15_TEXT.keep_working,
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
      help: M15_TEXT.footer_dialog,
    };
  }

  const bench = benchColumn(currentBox, currentState, host);

  if (s.view === 'wiring') {
    elements.push(wiringLanding());
    elements.push(...bench.elements);
    elements.push(...wiringTiles(currentBox, currentState, host, bench.bottom));
    elements.push(...wiringControls(currentState, host));
    elements.push(...helpAndLeave(host));

    return {
      title: headerTitle,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M15_TEXT.footer,
    };
  }

  if (s.view === 'wiring_acknowledgement' && s.acknowledgement !== null) {
    elements.push(
      primaryButton('next', M15_TEXT.first_question, (mode) => {
        host.commands.next(mode, host.now());
      }),
    );
    elements.push(...bench.elements);
    elements.push(...recordedWiring(currentBox, currentState, bench.bottom));
    elements.push(
      text(
        'acknowledgement',
        M15_TEXT.acknowledgement_wiring(currentBox.index),
        RIGHT_X,
        M15_CONTENT_TOP,
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
      help: M15_TEXT.footer,
    };
  }

  if (s.view === 'acknowledgement' && s.acknowledgement !== null) {
    const control = s.acknowledgement.next_control;
    const entry = m15CurrentQuestion(s as M15Series);

    elements.push(
      primaryButton(
        'next',
        control === 'next_box'
          ? M15_TEXT.next_box
          : control === 'show_results'
            ? M15_TEXT.show_results
            : M15_TEXT.next_question,
        (mode) => {
          host.commands.next(mode, host.now());
        },
      ),
    );
    elements.push(...bench.elements);
    elements.push(...recordedWiring(currentBox, currentState, bench.bottom));
    elements.push(
      text(
        'acknowledgement',
        M15_TEXT.acknowledgement_answer(entry.index),
        RIGHT_X,
        M15_CONTENT_TOP,
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
      help: M15_TEXT.footer,
    };
  }

  // A question view.
  elements.push(...questionColumn(s, host));
  elements.push(...bench.elements);
  elements.push(...recordedWiring(currentBox, currentState, bench.bottom));
  elements.push(...helpAndLeave(host));

  return {
    title: headerTitle,
    subtitle: headerSubtitle,
    status: headerStatus,
    elements,
    help: M15_TEXT.footer,
  };
}

/** The box id of the current view (tests). */
export function m15SurfaceBoxId(s: Readonly<M15Series>): M15BoxId | null {
  return s.status === 'first_responses'
    ? m15CurrentBox(s as M15Series).id
    : null;
}
