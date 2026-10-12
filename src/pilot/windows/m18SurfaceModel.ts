/**
 * M18 — the work-surface model of the diagnostic board (Unit 20). Maps the
 * pure series state to a `WorkSurfaceModel` in the WIDE FRAME of
 * research-owner decision D-U17-2 (used as is): the panel over the whole
 * visible design area, a 714 px left column (the unit sheet, then the test
 * table — three buttons with their result lines while the tests are open,
 * three labelled readouts once they are closed) and a 300 px right column
 * (the part question with its four part tiles and the commit controls, or
 * the planned-step text with its four answer tiles and the commit controls),
 * 16 px design text everywhere. Every activation calls the same adapter
 * command with its input mode (pointer / keyboard parity); the commands and
 * the state reader are injected through the host (`bindM18Surface` in
 * `m18DiagnosticBoard.ts`), so this module is PURE (no runtime import) and
 * the pure spec renders every view.
 *
 * Presentation rules (decision D-U20-1): nothing on screen depends on the
 * correctness of any answer before the sixth first response; the step
 * question is never rendered before the part is recorded; the recorded part
 * is echoed in the step view's status line in the same form for every part;
 * the acknowledgement is identical for every response and carries HELP and
 * LEAVE BOARD; a confirmation dialog and the help sheet are drawn alone with
 * the header and the status line, the confirm or close control first in the
 * focus order; the confirm control never sits where the control that opened
 * the dialog sat (every opener in the right column at x ≥ 738, every dialog
 * control at panel x 200–720); CANNOT SOLVE is never adjacent to LEAVE
 * BOARD; results page 1 carries HELP, FINISH and NEXT, page 2 HELP, FINISH,
 * BACK and NEXT, page 3 HELP, FINISH and BACK, NEXT and BACK never sharing a
 * position; every view lands on a neutral, non-acting first focusable
 * element (the card text, the question, the step text, the acknowledgement
 * line, the results text, the closed-record line), so no actionable control
 * is focused until TAB or a hotkey. The model's settle on every view
 * transition refuses a carried press.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  M18_TEXT,
  type M18Case,
  m18Option,
  m18ResultsLines,
} from './m18DiagnosisContent';
import {
  type M18CaseState,
  type M18CommitKind,
  m18CurrentCase,
  m18CurrentCaseState,
  m18PartsRecorded,
  m18RecordedPartName,
  m18RecordedStepName,
  m18RecordLine,
  type M18RequestOutcome,
  m18ResultsCase,
  type M18ResultsPage,
  type M18Series,
  m18StepsRecorded,
  type M18TestOutcome,
} from './m18DiagnosisModel';
import type { InputMode } from './windowKit';

/** The adapter commands the surface routes every activation to. */
export interface M18SurfaceCommands {
  startCase1: (mode: InputMode, nowMs: number) => boolean;
  runTest: (testId: string, mode: InputMode, nowMs: number) => M18TestOutcome;
  draft: (optionId: string, mode: InputMode, nowMs: number) => boolean;
  request: (
    kind: M18CommitKind,
    mode: InputMode,
    nowMs: number,
  ) => M18RequestOutcome;
  cancel: (mode: InputMode, nowMs: number) => boolean;
  confirm: (mode: InputMode, nowMs: number) => unknown;
  /** FINISH may close the results only after the page settled. */
  finish: (mode: InputMode, nowMs: number) => boolean;
  next: (mode: InputMode, nowMs: number) => unknown;
  navigateResults: (
    direction: 'next' | 'back',
    mode: InputMode,
    nowMs: number,
  ) => boolean;
  help: (mode: InputMode, nowMs: number) => boolean;
  closeHelp: (mode: InputMode, nowMs: number) => boolean;
}

export interface M18SurfaceHost {
  now: () => number;
  /** Closes the surface (LEAVE BOARD, FINISH — the same path as ESC). */
  close: () => void;
  /** Neutral feedback line on the surface. */
  feedback: (message: string) => void;
  /** The series state (read only). */
  series: () => Readonly<M18Series>;
  commands: M18SurfaceCommands;
}

/** Design text size of every element in the wide frame (D-U17-2). */
export const M18_TEXT_PX = 16;
const BOX_H = 34;
const GAP = 4;
/** The left column and the right column (panel-relative; preview §3.1). */
const LEFT_X = 12;
const LEFT_W = 714;
const RIGHT_X = 738;
const RIGHT_W = 300;
const FULL_X = 12;
const FULL_W = 1026;
export const M18_CONTENT_TOP = 90;
const SHEET_H = 204;
const TEST_ROW_Y = [302, 340, 378] as const;
const TEST_BUTTON_W = 232;
const RESULT_X = 256;
const RESULT_W = 470;
const QUESTION_H = 72;
const PART_TILES_Y = 170;
const RECORD_PART_Y = 330;
const CANNOT_SOLVE_PART_Y = 384;
const STEP_TEXT_H = 112;
const STEP_TILES_Y = 210;
const RECORD_ANSWER_Y = 368;
const CANNOT_SOLVE_STEP_Y = 412;
/**
 * The bottom row: HELP and LEAVE BOARD at the left, the view's primary
 * control at the right, CLOSE HELP in the middle; on the results pages
 * FINISH at the left, BACK and NEXT at the right in slots no other control
 * uses.
 */
export const M18_BOTTOM_ROW_Y = 462;
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
 * (RECORD PART, RECORD ANSWER, CANNOT SOLVE), so the second click of a
 * double click on an opener lands on nothing.
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
    textPx: M18_TEXT_PX,
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
    textPx: M18_TEXT_PX,
    state,
    onActivate,
  };
}

/** The probe / test id of a part tile (`part_1` …) or an answer tile (`answer_1` …). */
export function m18PartTileId(index: number): string {
  return `part_${index}`;
}

export function m18AnswerTileId(index: number): string {
  return `answer_${index}`;
}

/** The probe / test id of a test button or readout (`test_a` …) and its result line (`result_a` …). */
export function m18TestElementId(letter: string): string {
  return `test_${letter.toLowerCase()}`;
}

export function m18ResultElementId(letter: string): string {
  return `result_${letter.toLowerCase()}`;
}

function helpAndLeave(host: M18SurfaceHost): SurfaceElement[] {
  return [
    button(
      'help',
      M18_TEXT.help,
      HELP_X,
      M18_BOTTOM_ROW_Y,
      HELP_W,
      'h',
      (mode) => {
        host.commands.help(mode, host.now());
      },
    ),
    button(
      'leave',
      M18_TEXT.leave,
      LEAVE_X,
      M18_BOTTOM_ROW_Y,
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
    M18_BOTTOM_ROW_Y,
    PRIMARY_W,
    undefined,
    onActivate,
    'accent',
  );
}

/** The unit sheet (left column, every case, step and acknowledgement view). */
function sheet(entry: M18Case): SurfaceElement {
  return text(
    'sheet',
    entry.sheet_lines.join('\n'),
    LEFT_X,
    M18_CONTENT_TOP,
    LEFT_W,
    SHEET_H,
  );
}

/**
 * The test table: while the tests are open, three buttons (A–C) with the
 * result line of every test run (`not run yet` otherwise); once they are
 * closed, three labelled readouts with the result lines (`not run` for a
 * test never run).
 */
function testTable(
  entry: M18Case,
  state: M18CaseState,
  host: M18SurfaceHost,
  open: boolean,
): SurfaceElement[] {
  const elements: SurfaceElement[] = [];

  entry.tests.forEach((item, at) => {
    const run = state.tests.find((candidate) => candidate.id === item.id);
    const line =
      run?.result_id === null || run === undefined
        ? open
          ? M18_TEXT.not_run_yet
          : M18_TEXT.not_run
        : item.lines[run.result_id];

    if (open) {
      elements.push(
        button(
          m18TestElementId(item.letter),
          item.button,
          LEFT_X,
          TEST_ROW_Y[at],
          TEST_BUTTON_W,
          item.letter.toLowerCase(),
          (mode) => {
            host.commands.runTest(item.id, mode, host.now());
          },
        ),
      );
    } else {
      elements.push({
        id: m18TestElementId(item.letter),
        kind: 'readout',
        label: item.record_label,
        x: LEFT_X,
        y: TEST_ROW_Y[at],
        w: TEST_BUTTON_W,
        h: BOX_H,
        textPx: M18_TEXT_PX,
      });
    }

    elements.push(
      text(
        m18ResultElementId(item.letter),
        line,
        RESULT_X,
        TEST_ROW_Y[at],
        RESULT_W,
        BOX_H,
      ),
    );
  });

  return elements;
}

/** The right column of a case: the question (a neutral landing), four part tiles, the commit controls. */
function partColumn(
  entry: M18Case,
  state: M18CaseState,
  host: M18SurfaceHost,
): SurfaceElement[] {
  const elements: SurfaceElement[] = [
    landing(
      'question',
      M18_TEXT.question(entry.index),
      RIGHT_X,
      M18_CONTENT_TOP,
      RIGHT_W,
      QUESTION_H,
    ),
  ];
  let y = PART_TILES_Y;

  for (const option of entry.parts) {
    elements.push({
      id: m18PartTileId(option.index),
      kind: 'tile',
      label: option.label,
      x: RIGHT_X,
      y,
      w: RIGHT_W,
      h: BOX_H,
      textPx: M18_TEXT_PX,
      align: 'left',
      hotkey: String(option.index),
      state: state.diagnosis.draft === option.id ? 'selected' : 'idle',
      onActivate: (mode) => {
        host.commands.draft(option.id, mode, host.now());
      },
    });
    y += BOX_H + GAP;
  }

  elements.push(
    button(
      'record_part',
      M18_TEXT.record_part,
      RIGHT_X,
      RECORD_PART_Y,
      RIGHT_W,
      'r',
      (mode) => {
        if (host.commands.request('option', mode, host.now()) === 'no_draft') {
          host.feedback(M18_TEXT.choose_part_first);
        }
      },
      state.diagnosis.draft === null ? undefined : 'accent',
    ),
  );
  elements.push(
    button(
      'cannot_solve',
      M18_TEXT.cannot_solve,
      RIGHT_X,
      CANNOT_SOLVE_PART_Y,
      RIGHT_W,
      'n',
      (mode) => {
        host.commands.request('cannot_solve', mode, host.now());
      },
    ),
  );

  return elements;
}

/** The right column of a step: the planned-step text (a neutral landing), four answer tiles, the commit controls. */
function stepColumn(
  entry: M18Case,
  state: M18CaseState,
  host: M18SurfaceHost,
): SurfaceElement[] {
  const elements: SurfaceElement[] = [
    landing(
      'step_text',
      entry.step_text,
      RIGHT_X,
      M18_CONTENT_TOP,
      RIGHT_W,
      STEP_TEXT_H,
    ),
  ];
  let y = STEP_TILES_Y;

  for (const option of entry.steps) {
    elements.push({
      id: m18AnswerTileId(option.index),
      kind: 'tile',
      label: option.label,
      x: RIGHT_X,
      y,
      w: RIGHT_W,
      h: BOX_H,
      textPx: M18_TEXT_PX,
      align: 'left',
      hotkey: String(option.index),
      state: state.prediction.draft === option.id ? 'selected' : 'idle',
      onActivate: (mode) => {
        host.commands.draft(option.id, mode, host.now());
      },
    });
    y += BOX_H + GAP;
  }

  elements.push(
    button(
      'record_answer',
      M18_TEXT.record_answer,
      RIGHT_X,
      RECORD_ANSWER_Y,
      RIGHT_W,
      'r',
      (mode) => {
        if (host.commands.request('option', mode, host.now()) === 'no_draft') {
          host.feedback(M18_TEXT.choose_answer_first);
        }
      },
      state.prediction.draft === null ? undefined : 'accent',
    ),
  );
  elements.push(
    button(
      'cannot_solve',
      M18_TEXT.cannot_solve,
      RIGHT_X,
      CANNOT_SOLVE_STEP_Y,
      RIGHT_W,
      'n',
      (mode) => {
        host.commands.request('cannot_solve', mode, host.now());
      },
    ),
  );

  return elements;
}

/** The results page text (only after the sixth answer): page k shows case k. */
export function m18ResultsText(
  page: M18ResultsPage,
  s: Readonly<M18Series>,
): string {
  const entry = m18ResultsCase(page);
  const state = s.cases[entry.index - 1];
  const lines: string[] = page === 1 ? [M18_TEXT.results_first_line, ''] : [];

  lines.push(
    ...m18ResultsLines(
      entry,
      m18RecordedPartName(state) ?? '—',
      m18RecordedStepName(state) ?? '—',
    ),
  );

  return lines.join('\n');
}

export function m18SurfaceModel(host: M18SurfaceHost): WorkSurfaceModel {
  const s = host.series();
  const elements: SurfaceElement[] = [];
  const recordLine = m18RecordLine(s as M18Series);
  const parts = m18PartsRecorded(s as M18Series);
  const steps = m18StepsRecorded(s as M18Series);

  if (recordLine !== null || s.view === 'record') {
    // A closed record: the line (a neutral landing) and LEAVE BOARD; the
    // counts in the status line — except for the reload hold-back, whose
    // record belongs to the earlier page load; no results, no help, nothing
    // recorded.
    const heldBack = s.status === 'held_back';

    elements.push(
      landing(
        'record_text',
        recordLine ?? M18_TEXT.fault,
        FULL_X,
        M18_CONTENT_TOP,
        FULL_W,
        80,
      ),
    );
    elements.push(
      button(
        'leave',
        M18_TEXT.leave,
        LEAVE_X,
        M18_BOTTOM_ROW_Y,
        LEAVE_W,
        undefined,
        () => host.close(),
      ),
    );

    return {
      title: M18_TEXT.title,
      subtitle: '',
      status: heldBack ? '' : M18_TEXT.status_record(parts, steps),
      elements,
      help: M18_TEXT.footer_record,
    };
  }

  const inMeasurement = s.status === 'measurement';
  const inResults = s.status === 'completed' && s.view === 'results';
  const headerTitle = inResults
    ? M18_TEXT.results_title(s.results_page)
    : M18_TEXT.title;
  const headerSubtitle =
    inMeasurement || (s.status === 'completed' && !inResults)
      ? M18_TEXT.subtitle(m18CurrentCase(s as M18Series).index)
      : '';
  const headerStatus = inResults
    ? M18_TEXT.results_status
    : s.view === 'case'
      ? M18_TEXT.status_case
      : s.view === 'step'
        ? M18_TEXT.status_step(
            m18RecordedPartName(m18CurrentCaseState(s as M18Series)) ?? '',
          )
        : s.view === 'acknowledgement'
          ? M18_TEXT.status_recorded(steps)
          : '';

  if (s.help_open) {
    // The help sheet alone with the header and the status line; CLOSE HELP
    // is the first focusable element (ENTER closes it) and sits in the
    // middle of the bottom row, where no other view holds a control.
    elements.push(
      button(
        'close_help',
        M18_TEXT.close_help,
        CLOSE_HELP_X,
        M18_BOTTOM_ROW_Y,
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
        'help_text',
        `${M18_TEXT.help_title}\n\n${M18_TEXT.help_lines.join('\n')}`,
        FULL_X,
        M18_CONTENT_TOP,
        FULL_W,
        300,
      ),
    );

    return {
      title: headerTitle,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M18_TEXT.footer_help,
    };
  }

  const pending = s.pending_commit;

  if (pending !== null) {
    // A confirmation dialog alone with the header and the status line: the
    // confirm control is the first focusable element (ENTER confirms);
    // neither control overlaps the place of any opener.
    const entry = m18CurrentCase(s as M18Series);
    let dialogText: string;
    let confirmLabel: string;

    if (pending.kind === 'cannot_solve') {
      dialogText =
        pending.slot === 'diagnosis'
          ? M18_TEXT.confirm_cannot_solve_part(entry.index)
          : M18_TEXT.confirm_cannot_solve_step(entry.index);
      confirmLabel = M18_TEXT.confirm_record_control;
    } else {
      // The dialog repeats the drafted part or answer.
      const name =
        m18Option(entry.id, pending.slot, pending.option_id)?.name ?? '';

      if (pending.slot === 'diagnosis') {
        dialogText = M18_TEXT.confirm_part(name, entry.index);
        confirmLabel = M18_TEXT.confirm_part_control;
      } else {
        dialogText = M18_TEXT.confirm_answer(name, entry.index);
        confirmLabel = M18_TEXT.confirm_answer_control;
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
        'keep_working',
        M18_TEXT.keep_working,
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
      help: M18_TEXT.footer_dialog,
    };
  }

  if (s.status === 'intro') {
    elements.push(
      landing(
        'intro_text',
        M18_TEXT.intro.join('\n'),
        FULL_X,
        M18_CONTENT_TOP,
        FULL_W,
        200,
      ),
    );
    elements.push(
      primaryButton('start_case', M18_TEXT.start_case_1, (mode) => {
        host.commands.startCase1(mode, host.now());
      }),
    );
    elements.push(...helpAndLeave(host));

    return {
      title: M18_TEXT.title,
      subtitle: '',
      status: '',
      elements,
      help: M18_TEXT.footer_card,
    };
  }

  if (inResults) {
    const page = s.results_page;

    elements.push(
      landing(
        'results_text',
        m18ResultsText(page, s),
        FULL_X,
        M18_CONTENT_TOP,
        FULL_W,
        360,
      ),
    );
    elements.push(
      button(
        'help',
        M18_TEXT.help,
        HELP_X,
        M18_BOTTOM_ROW_Y,
        HELP_W,
        'h',
        (mode) => {
          host.commands.help(mode, host.now());
        },
      ),
    );
    elements.push(
      button(
        'finish',
        M18_TEXT.finish,
        FINISH_X,
        M18_BOTTOM_ROW_Y,
        FINISH_W,
        undefined,
        (mode) => {
          if (host.commands.finish(mode, host.now())) {
            host.close();
          }
        },
      ),
    );

    // The page controls carry the page in their id: the scene keeps the
    // focus on an element id across refreshes, so a page change (NEXT or
    // BACK) lands on the results text — the neutral landing of contract
    // §3.5 — instead of on the control that was pressed.
    if (page > 1) {
      elements.push(
        button(
          `results_back_${page}`,
          M18_TEXT.back,
          BACK_X,
          M18_BOTTOM_ROW_Y,
          BACK_W,
          undefined,
          (mode) => {
            host.commands.navigateResults('back', mode, host.now());
          },
        ),
      );
    }

    if (page < 3) {
      elements.push(
        primaryButton(`results_next_${page}`, M18_TEXT.next, (mode) => {
          host.commands.navigateResults('next', mode, host.now());
        }),
      );
    }

    return {
      title: headerTitle,
      subtitle: '',
      status: headerStatus,
      elements,
      help: M18_TEXT.footer_card,
    };
  }

  // The measurement phase (and the acknowledgement after the third case).
  const entry = m18CurrentCase(s as M18Series);
  const state = m18CurrentCaseState(s as M18Series);

  if (s.view === 'acknowledgement' && s.acknowledgement !== null) {
    const control = s.acknowledgement.next_control;

    elements.push(
      landing(
        'acknowledgement',
        M18_TEXT.acknowledgement(entry.index),
        RIGHT_X,
        M18_CONTENT_TOP,
        RIGHT_W,
        50,
      ),
    );
    elements.push(
      primaryButton(
        'next',
        control === 'show_results' ? M18_TEXT.show_results : M18_TEXT.next_case,
        (mode) => {
          host.commands.next(mode, host.now());
        },
      ),
    );
    elements.push(sheet(entry));
    elements.push(...testTable(entry, state, host, false));
    elements.push(...helpAndLeave(host));

    return {
      title: headerTitle,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M18_TEXT.footer_card,
    };
  }

  if (s.view === 'step') {
    // The planned step: the tests closed, the test record as labels.
    elements.push(...stepColumn(entry, state, host));
    elements.push(sheet(entry));
    elements.push(...testTable(entry, state, host, false));
    elements.push(...helpAndLeave(host));

    return {
      title: headerTitle,
      subtitle: headerSubtitle,
      status: headerStatus,
      elements,
      help: M18_TEXT.footer_step,
    };
  }

  // A case view: the question (a neutral landing), the test buttons in the
  // focus order before the part tiles (preview §3.2), the commit controls.
  const [question, ...partControls] = partColumn(entry, state, host);

  elements.push(question);
  elements.push(sheet(entry));
  elements.push(...testTable(entry, state, host, true));
  elements.push(...partControls);
  elements.push(...helpAndLeave(host));

  return {
    title: headerTitle,
    subtitle: headerSubtitle,
    status: headerStatus,
    elements,
    help: M18_TEXT.footer_case,
  };
}
