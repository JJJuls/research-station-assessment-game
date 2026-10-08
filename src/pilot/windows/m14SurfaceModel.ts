/**
 * M14 — the work-surface model of the two-packet incident desk (Unit 17).
 * Maps the pure series state to a `WorkSurfaceModel` in the WIDE FRAME of
 * research-owner decision D-U17-2 (8 October 2026): the panel over the
 * whole visible design area, two source columns in fixed slots, a 300 px
 * decision column, 16 px design text everywhere. Every activation calls
 * the same adapter command with its input mode (pointer / keyboard
 * parity); the commands and the state reader are injected through the
 * host (`bindM14Surface` in `m14IncidentDesk.ts`), so this module is PURE
 * (no runtime import) and the pure spec renders every view.
 *
 * Presentation rules (decision D-U17-1): open tiles differ from closed
 * ones by their text, never by colour alone; nothing on screen depends on
 * the correctness of any answer before the sixth; the acknowledgement is
 * identical for every response; a confirmation dialog and the help sheet
 * are drawn alone with the header and the status line, the confirm or
 * close control first in the focus order; the confirm control never sits
 * where the control that opened the dialog sat.
 *
 * Carried and doubled presses: every control that ends a view (the two
 * confirmation buttons, NEXT, START PACKET 1, CLOSE HELP) sits where the
 * view that follows holds nothing activatable at the same place, and the
 * first focusable element of a decision view is the question itself (a
 * neutral landing whose activation does nothing), so the second click of
 * a doubled click or a doubled ENTER lands on nothing — except on the
 * results view, where CLOSE HELP shares the place of NEXT / BACK and the
 * model's 400 ms settle (re-armed by the close) refuses the carried press.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  m14AnsweredCount,
  m14CurrentDecision,
  m14CurrentDecisionState,
  m14CurrentPacket,
  m14CurrentPacketState,
  m14RecordLine,
  type M14RequestOutcome,
  type M14ResponseKind,
  type M14Series,
} from './m14IntegrationModel';
import {
  M14_PACKETS,
  M14_TEXT,
  type M14Decision,
  m14Option,
  type M14Packet,
} from './m14PacketContent';
import type { InputMode } from './windowKit';

/** The adapter commands the surface routes every activation to. */
export interface M14SurfaceCommands {
  start: (mode: InputMode, nowMs: number) => boolean;
  toggleSource: (sourceId: string, mode: InputMode, nowMs: number) => unknown;
  draft: (optionId: string, mode: InputMode, nowMs: number) => boolean;
  request: (
    kind: M14ResponseKind,
    mode: InputMode,
    nowMs: number,
  ) => M14RequestOutcome;
  cancel: (mode: InputMode, nowMs: number) => boolean;
  confirm: (mode: InputMode, nowMs: number) => unknown;
  next: (mode: InputMode, nowMs: number) => unknown;
  navigateResults: (
    direction: 'next' | 'back',
    mode: InputMode,
    nowMs: number,
  ) => boolean;
  help: (mode: InputMode, nowMs: number) => boolean;
  closeHelp: (nowMs: number) => boolean;
}

export interface M14SurfaceHost {
  now: () => number;
  /** Closes the surface (LEAVE DESK, FINISH — the same path as ESC). */
  close: () => void;
  /** Neutral feedback line on the surface. */
  feedback: (message: string) => void;
  /** The series state (read only). */
  series: () => Readonly<M14Series>;
  commands: M14SurfaceCommands;
}

/** Design text size of every element in the wide frame (D-U17-2). */
export const M14_TEXT_PX = 16;
/** Option and button boxes: 2.1 × the text size. */
const BOX_H = 34;
const TALL_BOX_H = 46;
const GAP = 4;
const PAD = 6;
/** The two source columns and the decision column (panel-relative). */
const COL_X = [12, 374] as const;
const COL_W = 354;
export const M14_CONTENT_TOP = 90;
const DEC_X = 738;
const DEC_W = 300;
const FULL_X = 12;
const FULL_W = 1026;
const HALF_BUTTON_W = 145;
/**
 * The row below the source columns (the left column ends at panel y 494
 * with all nine slots; the decision column ends at 488 at most): the
 * controls that end a view sit here, where the next view holds nothing
 * activatable.
 */
export const M14_BOTTOM_ROW_Y = 496;
/** The text block of a view drawn under the status line (which ends by y 88). */
const BLOCK_TOP = 96;

/**
 * Fixed slot heights of the nine sources (messages 1–6, gauges 1–3),
 * sized for the longer open text of the two packets under the widest of
 * the three fonts measured in the preparation (Consolas, Courier New,
 * Lucida Console), so a tile never reflows when it opens.
 */
export const M14_SLOT_H = [150, 54, 86, 102, 102, 102, 38, 54, 38] as const;

/** Height of the question block per decision ("DECISION N OF 3" + question). */
const QUESTION_H: Record<string, number> = {
  p1_d1: 72,
  p1_d2: 54,
  p1_d3: 54,
  p2_d1: 54,
  p2_d2: 72,
  p2_d3: 108,
};

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
    textPx: M14_TEXT_PX,
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
    textPx: M14_TEXT_PX,
    state,
    onActivate,
  };
}

/** The probe / test id of a source tile (`tile_m1` … `tile_g3`). */
export function m14TileId(sourceId: string): string {
  return `tile_${sourceId.slice(3)}`;
}

/**
 * The status line of a first-response view names the decision before the
 * approved status text; the subtitle keeps the short count, so a wide
 * fallback font never runs the packet title into it.
 */
function firstResponseStatus(decision: M14Decision): string {
  return `${M14_TEXT.decision_subtitle(decision.index)} · ${M14_TEXT.status}`;
}

/** The nine source tiles of the current packet in their fixed slots. */
function sourceTiles(
  s: Readonly<M14Series>,
  packet: M14Packet,
  host: M14SurfaceHost,
): SurfaceElement[] {
  const state = m14CurrentPacketState(s as M14Series);
  const elements: SurfaceElement[] = [];
  const columnTop = [M14_CONTENT_TOP, M14_CONTENT_TOP];

  packet.sources.forEach((source, position) => {
    const column = position < 4 ? 0 : 1;
    const h = M14_SLOT_H[position];
    const y = columnTop[column];
    const open = state.open.includes(source.id);

    columnTop[column] = y + h + GAP;
    elements.push({
      id: m14TileId(source.id),
      kind: 'tile',
      // Open and closed tiles differ by text: the glyph and the open text.
      glyph: open ? '− ' : '+ ',
      label: open ? `${source.header}\n${source.text}` : source.header,
      x: COL_X[column],
      y,
      w: COL_W,
      h,
      textPx: M14_TEXT_PX,
      align: 'left',
      valign: 'top',
      hotkey: String(source.index),
      onActivate: (mode) => {
        host.commands.toggleSource(source.id, mode, host.now());
      },
    });
  });

  // The readings line of the packet-start text sits under the gauges.
  elements.push(
    text(
      'readings',
      packet.readings_line,
      COL_X[1],
      columnTop[1] + PAD - GAP,
      COL_W,
      40,
    ),
  );

  return elements;
}

/**
 * The question block: the first focusable element of a decision view and
 * a neutral landing — its activation does nothing, so a doubled ENTER
 * after NEXT (or after a cancelled dialog) opens nothing and drafts
 * nothing.
 */
function questionBlock(decision: M14Decision): SurfaceElement {
  return {
    ...text(
      'question',
      `${M14_TEXT.decision_heading(decision.index)}\n${decision.question}`,
      DEC_X,
      M14_CONTENT_TOP,
      DEC_W,
      QUESTION_H[decision.id] ?? 72,
    ),
    onActivate: () => undefined,
  };
}

/** The decision column: question, four options, the commit controls. */
function decisionColumn(
  s: Readonly<M14Series>,
  decision: M14Decision,
  host: M14SurfaceHost,
): SurfaceElement[] {
  const state = m14CurrentDecisionState(s as M14Series);
  const elements: SurfaceElement[] = [questionBlock(decision)];
  let y = M14_CONTENT_TOP + (QUESTION_H[decision.id] ?? 72) + 8;

  decision.options.forEach((option, position) => {
    const label = `${LETTERS[position]}  ${option.label}`;
    const h = label.length > 30 ? TALL_BOX_H : BOX_H;

    elements.push({
      id: `option_${option.letter}`,
      kind: 'tile',
      label,
      x: DEC_X,
      y,
      w: DEC_W,
      h,
      textPx: M14_TEXT_PX,
      align: 'left',
      hotkey: option.letter,
      state: state.draft === option.id ? 'selected' : 'idle',
      onActivate: (mode) => {
        host.commands.draft(option.id, mode, host.now());
      },
    });
    y += h + GAP;
  });

  y += 8;
  elements.push(
    button(
      'record_answer',
      M14_TEXT.record_answer,
      DEC_X,
      y,
      DEC_W,
      'r',
      (mode) => {
        if (host.commands.request('option', mode, host.now()) === 'no_draft') {
          host.feedback(M14_TEXT.choose_first);
        }
      },
      'accent',
    ),
  );
  y += BOX_H + GAP;
  elements.push(
    button(
      'cannot_solve',
      M14_TEXT.cannot_solve,
      DEC_X,
      y,
      DEC_W,
      'n',
      (mode) => {
        host.commands.request('cannot_solve', mode, host.now());
      },
    ),
  );
  y += BOX_H + 14;
  elements.push(...helpAndLeave(host, DEC_X, y));

  return elements;
}

function helpAndLeave(
  host: M14SurfaceHost,
  x: number,
  y: number,
): SurfaceElement[] {
  return [
    button('help', M14_TEXT.help, x, y, HALF_BUTTON_W, 'h', (mode) => {
      host.commands.help(mode, host.now());
    }),
    button(
      'leave',
      M14_TEXT.leave,
      x + HALF_BUTTON_W + 10,
      y,
      HALF_BUTTON_W,
      undefined,
      () => host.close(),
    ),
  ];
}

/** The results view text of one packet (only after the sixth answer). */
export function m14ResultsText(
  packet: M14Packet,
  s: Readonly<M14Series>,
): string {
  const state = s.packets[packet.index - 1];
  const lines: string[] = [packet.title, ''];

  packet.decisions.forEach((decision, position) => {
    const response = state.decisions[position].first_response;
    const recorded =
      response === null
        ? '—'
        : response.response_kind === 'cannot_solve'
          ? M14_TEXT.cannot_solve_answer
          : (m14Option(decision.id, response.option_id ?? '')?.label ?? '—');
    const key = m14Option(decision.id, decision.key_option_id)?.label ?? '';

    lines.push(
      `${decision.index}. ${decision.short_title} — ${M14_TEXT.your_answer} ${recorded}`,
      `   ${M14_TEXT.station_answer} ${key}`,
      `   ${decision.results_line}`,
      '',
    );
  });

  return lines.join('\n').trimEnd();
}

export function m14SurfaceModel(host: M14SurfaceHost): WorkSurfaceModel {
  const s = host.series();
  const answered = m14AnsweredCount(s as M14Series);
  const elements: SurfaceElement[] = [];
  const title: string = M14_TEXT.title;
  const recordLine = m14RecordLine(s as M14Series);

  if (recordLine !== null || s.view === 'record') {
    // A closed record: the line and — except for the reload hold-back,
    // whose count belongs to the earlier page load — the recorded count;
    // no results, no help, nothing recorded.
    const heldBack = s.status === 'held_back';
    const line = recordLine ?? M14_TEXT.fault;

    elements.push(
      text(
        'record_text',
        heldBack ? line : `${line}\n\n${M14_TEXT.recorded_count(answered)}`,
        FULL_X,
        BLOCK_TOP,
        FULL_W,
        80,
      ),
    );
    elements.push(
      button(
        'leave',
        M14_TEXT.leave,
        FULL_X,
        M14_BOTTOM_ROW_Y,
        DEC_W,
        undefined,
        () => host.close(),
      ),
    );

    return {
      title,
      subtitle: '',
      status: '',
      elements,
      help: M14_TEXT.footer_record,
    };
  }

  const inFirstResponses = s.status === 'first_responses';
  const packet = inFirstResponses ? m14CurrentPacket(s as M14Series) : null;
  const decision = inFirstResponses ? m14CurrentDecision(s as M14Series) : null;

  if (s.help_open) {
    // The help sheet alone with the header and the status line; CLOSE
    // HELP is the first focusable element (ENTER closes it) and sits in
    // the bottom row, where the view that follows holds nothing — on the
    // results view it holds NEXT / BACK, which the re-armed settle guards.
    elements.push(
      button(
        'close_help',
        M14_TEXT.close_help,
        FULL_X,
        M14_BOTTOM_ROW_Y,
        DEC_W,
        undefined,
        () => {
          host.commands.closeHelp(host.now());
        },
      ),
    );
    elements.push(
      text(
        'help_text',
        `${M14_TEXT.help_title}\n\n${M14_TEXT.orientation.join('\n')}\n\n${M14_TEXT.help_controls}`,
        FULL_X,
        BLOCK_TOP,
        FULL_W,
        380,
      ),
    );

    return {
      title: packet?.title ?? title,
      subtitle:
        s.status === 'orientation' ? '' : M14_TEXT.recorded_count(answered),
      status:
        decision !== null
          ? firstResponseStatus(decision)
          : s.status === 'orientation'
            ? ''
            : M14_TEXT.status,
      elements,
      help: M14_TEXT.footer_help,
    };
  }

  if (s.status === 'orientation') {
    elements.push(
      text(
        'orientation',
        M14_TEXT.orientation.join('\n'),
        FULL_X,
        52,
        FULL_W,
        300,
      ),
    );
    elements.push(
      button(
        'start',
        M14_TEXT.start_packet_1,
        FULL_X,
        M14_BOTTOM_ROW_Y,
        DEC_W,
        undefined,
        (mode) => {
          host.commands.start(mode, host.now());
        },
        'accent',
      ),
    );
    elements.push(...helpAndLeave(host, FULL_X + DEC_W + 10, M14_BOTTOM_ROW_Y));

    return {
      title,
      subtitle: '',
      status: '',
      elements,
      help: M14_TEXT.footer_orientation,
    };
  }

  if (s.status === 'completed') {
    const subtitle = M14_TEXT.recorded_count(answered);

    if (s.view === 'results') {
      const shown = M14_PACKETS[s.results_packet];
      const status = M14_TEXT.results_heading;

      elements.push(
        text(
          'results_text',
          m14ResultsText(shown, s),
          FULL_X,
          BLOCK_TOP,
          FULL_W,
          390,
        ),
      );

      if (s.results_packet === 0) {
        elements.push(
          button(
            'results_next',
            M14_TEXT.results_next,
            FULL_X,
            M14_BOTTOM_ROW_Y,
            DEC_W,
            undefined,
            (mode) => {
              host.commands.navigateResults('next', mode, host.now());
            },
            'accent',
          ),
        );
      } else {
        elements.push(
          button(
            'results_back',
            M14_TEXT.results_back,
            FULL_X,
            M14_BOTTOM_ROW_Y,
            DEC_W,
            'b',
            (mode) => {
              host.commands.navigateResults('back', mode, host.now());
            },
          ),
        );
      }

      elements.push(
        button(
          'finish',
          M14_TEXT.finish,
          FULL_X + DEC_W + 10,
          M14_BOTTOM_ROW_Y,
          DEC_W,
          'f',
          () => host.close(),
        ),
      );
      elements.push(
        button(
          'help',
          M14_TEXT.help,
          FULL_X + 2 * (DEC_W + 10),
          M14_BOTTOM_ROW_Y,
          HALF_BUTTON_W,
          'h',
          (mode) => {
            host.commands.help(mode, host.now());
          },
        ),
      );

      return {
        title,
        subtitle,
        status,
        elements,
        help:
          s.results_packet === 0
            ? M14_TEXT.footer_results_first
            : M14_TEXT.footer_results_second,
      };
    }

    // The acknowledgement after the sixth answer: the line and SHOW
    // RESULTS (the series is closed, so no tiles are drawn).
    const last = M14_PACKETS[1].decisions[2];

    elements.push(
      button(
        'next',
        M14_TEXT.show_results,
        FULL_X,
        M14_BOTTOM_ROW_Y,
        DEC_W,
        undefined,
        (mode) => {
          host.commands.next(mode, host.now());
        },
        'accent',
      ),
    );
    elements.push(
      text(
        'acknowledgement',
        M14_TEXT.acknowledgement(last.index),
        FULL_X,
        BLOCK_TOP,
        FULL_W,
        40,
      ),
    );
    elements.push(...helpAndLeave(host, FULL_X + DEC_W + 10, M14_BOTTOM_ROW_Y));

    return {
      title,
      subtitle,
      status: '',
      elements,
      help: M14_TEXT.footer_sixth_acknowledgement,
    };
  }

  // First-response phase: the title is the packet line and the subtitle
  // names the decision.
  const packetTitle = packet!.title;
  const current = decision!;
  const subtitle = M14_TEXT.recorded_count(answered);
  const status = firstResponseStatus(current);
  const pending = s.pending_commit;

  if (pending !== null) {
    // A confirmation dialog alone with the header and the status line:
    // the question just above its two controls in the bottom row, where
    // no decision view holds an opener and no acknowledgement view holds
    // anything activatable; the confirm control is the first focusable
    // element (ENTER confirms).
    const cannot = pending.kind === 'cannot_solve';
    const draftIndex = current.options.findIndex(
      (option) => option.id === pending.option_id,
    );
    const draftLabel =
      m14Option(current.id, pending.option_id ?? '')?.label ?? '';

    elements.push(
      button(
        'confirm',
        cannot
          ? M14_TEXT.confirm_cannot_solve_control
          : M14_TEXT.confirm_answer_control,
        FULL_X,
        M14_BOTTOM_ROW_Y,
        DEC_W,
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
        M14_TEXT.keep_working,
        FULL_X + DEC_W + 10,
        M14_BOTTOM_ROW_Y,
        DEC_W,
        undefined,
        (mode) => {
          host.commands.cancel(mode, host.now());
        },
      ),
    );
    elements.push(
      text(
        'dialog_text',
        cannot
          ? M14_TEXT.confirm_cannot_solve(current.index)
          : `${M14_TEXT.confirm_answer(current.index)}\n${LETTERS[draftIndex] ?? ''}  ${draftLabel}`,
        FULL_X,
        M14_BOTTOM_ROW_Y - 66,
        FULL_W,
        60,
      ),
    );

    return {
      title: packetTitle,
      subtitle,
      status,
      elements,
      help: M14_TEXT.footer_dialog,
    };
  }

  if (s.view === 'acknowledgement' && s.acknowledgement !== null) {
    const control = s.acknowledgement.next_control;

    // The next control leads the focus order (ENTER continues) and sits
    // in the bottom row of the decision column, below every element of
    // the decision view that follows; the tiles stay open and usable.
    elements.push(
      button(
        'next',
        control === 'next_packet'
          ? M14_TEXT.next_packet
          : control === 'show_results'
            ? M14_TEXT.show_results
            : M14_TEXT.next_decision,
        DEC_X,
        M14_BOTTOM_ROW_Y,
        DEC_W,
        undefined,
        (mode) => {
          host.commands.next(mode, host.now());
        },
        'accent',
      ),
    );
    elements.push(...sourceTiles(s, packet!, host));
    elements.push(
      text(
        'acknowledgement',
        M14_TEXT.acknowledgement(current.index),
        DEC_X,
        M14_CONTENT_TOP,
        DEC_W,
        40,
      ),
    );
    elements.push(...helpAndLeave(host, DEC_X, M14_CONTENT_TOP + 50));

    return {
      title: packetTitle,
      subtitle,
      status,
      elements,
      help: M14_TEXT.footer_acknowledgement,
    };
  }

  elements.push(...decisionColumn(s, current, host));
  elements.push(...sourceTiles(s, packet!, host));

  return {
    title: packetTitle,
    subtitle,
    status,
    elements,
    help: M14_TEXT.footer_decision,
  };
}
