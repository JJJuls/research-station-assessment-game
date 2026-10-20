/**
 * M23 — the work-surface model of the excavation field panel (Unit 23).
 * Maps the pure series state to a `WorkSurfaceModel` in the STANDARD frame
 * (the 720 × 516 design panel; contract §10 modal coordinates): the brief,
 * the two static control-example pages, the plot selector, the first-failure
 * panel, the selector-only STOP confirmation and the closed record. Every
 * activation calls the same adapter command with its input mode (pointer /
 * keyboard parity); the commands and the state reader are injected through
 * the host (`bindM23Surface` in `m23Plots.ts`), so this module is PURE and
 * the pure spec renders every view.
 *
 * Focus rules (contract §12 M3, decision D1): every view lands on a neutral
 * `text` element whose activation is a strict no-op; the first-failure view
 * supplies exactly five focusables in the order neutral, physical RIGHT
 * option, HELP, STEP AWAY, physical LEFT option, so an unmodified Left
 * arrow reaches the left option by wrap (0 → 4) and Right the right option
 * (0 → 1); the two options are equal in size and style and keep their
 * assigned sides across both plots; a fresh view, a return from HELP and a
 * resumed unanswered choice carry new per-view element ids (the focus
 * epoch), so the renderer's missing-id fallback lands on neutral, while a
 * same-view refresh keeps its ids and therefore its focus. The static
 * examples are marked CONTROL EXAMPLE — NOT A SEARCH PLOT and create no
 * attempt. No questionnaire wording anywhere.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  M23_BEACON_GLYPH,
  M23_FIGURE_GLYPH,
  M23_MODAL,
  M23_TEXT,
  type M23PlotId,
  type M23PlotLetter,
} from './m23PlotsContent';
import {
  m23DisplayedPlots,
  m23FailureSides,
  type M23PlotState,
  m23PlotTerminal,
  type M23Response,
  m23SelectorStatus,
  type M23Series,
  m23TrayLine,
} from './m23PlotsModel';
import type { InputMode } from './windowKit';

/** The adapter commands the surface routes every activation to. */
export interface M23SurfaceCommands {
  /** CONTROL EXAMPLE / NEXT / BACK between the brief and the two pages. */
  showExample: (page: 1 | 2, mode: InputMode, nowMs: number) => void;
  backToBrief: (mode: InputMode, nowMs: number) => void;
  /** OPEN PLOT PANEL after page 2: the selector (the first time is the measured opening). */
  openSelector: (mode: InputMode, nowMs: number) => void;
  help: (mode: InputMode, nowMs: number) => void;
  closeHelp: (mode: InputMode, nowMs: number) => void;
  /** STEP AWAY (and ESC): the surface closes; work pauses. */
  stepAway: (mode: InputMode, nowMs: number) => void;
  openPlot: (plot: M23PlotId, mode: InputMode, nowMs: number) => void;
  requestStop: (plot: M23PlotId, mode: InputMode, nowMs: number) => void;
  cancelStop: (plot: M23PlotId, mode: InputMode, nowMs: number) => void;
  confirmStop: (plot: M23PlotId, mode: InputMode, nowMs: number) => void;
  choose: (
    plot: M23PlotId,
    response: M23Response,
    side: 'left' | 'right',
    mode: InputMode,
    nowMs: number,
  ) => void;
}

export interface M23SurfaceHost {
  now: () => number;
  series: () => Readonly<M23Series>;
  /** The current focus epoch (changes on every fresh view / return). */
  focusEpoch: () => string;
  commands: M23SurfaceCommands;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function text(
  id: string,
  label: string,
  box: Box,
  textPx: number,
  align: 'left' | 'center' = 'left',
): SurfaceElement {
  return { id, kind: 'text', label, ...box, textPx, align };
}

/** A neutral focus landing: a text block whose activation does nothing. */
function landing(
  id: string,
  label: string,
  box: Box,
  textPx: number,
): SurfaceElement {
  return { ...text(id, label, box, textPx), onActivate: () => undefined };
}

function button(
  id: string,
  label: string,
  box: Box,
  onActivate: (mode: InputMode) => void,
  state?: SurfaceElement['state'],
): SurfaceElement {
  return {
    id,
    kind: 'button',
    label,
    ...box,
    textPx: M23_MODAL.text_option_px,
    state,
    onActivate,
  };
}

/**
 * A static illustration piece (never focusable, never an attempt): a
 * highlighted cell tile (`flag`, the field's amber highlight family, distinct
 * from the teal accent buttons) or a plain readout (a figure or beacon glyph,
 * the pinned reading).
 */
function illustration(
  id: string,
  label: string,
  box: Box,
  highlighted: boolean,
  textPx: number,
): SurfaceElement {
  return {
    id,
    kind: highlighted ? 'tile' : 'readout',
    label,
    ...box,
    textPx,
    state: highlighted ? 'flag' : 'idle',
    glyph: highlighted ? '▣ ' : '',
  };
}

/** The pinned guidance line(s) at y 428 (contract §10). */
function guidance(id: string, lines: readonly string[]): SurfaceElement {
  return text(
    id,
    lines.join('\n'),
    M23_MODAL.guidance,
    M23_MODAL.text_guidance_px,
  );
}

function stepAwayButton(
  host: M23SurfaceHost,
  epoch: string,
  box: Box = M23_MODAL.step_away,
): SurfaceElement {
  return button(`step_away_${epoch}`, M23_TEXT.step_away, box, (mode) => {
    host.commands.stepAway(mode, host.now());
  });
}

function helpButton(host: M23SurfaceHost, epoch: string): SurfaceElement {
  return button(`help_${epoch}`, M23_TEXT.help, M23_MODAL.help, (mode) => {
    host.commands.help(mode, host.now());
  });
}

/* ------------------------------------------------------------------ *
 * Views
 * ------------------------------------------------------------------ */

function briefView(host: M23SurfaceHost, epoch: string): WorkSurfaceModel {
  const body = [
    M23_TEXT.brief,
    '',
    M23_TEXT.scanner_instruction,
    '',
    M23_TEXT.dig_instruction,
    '',
    M23_TEXT.closure_explanation,
  ].join('\n');

  return {
    title: M23_TEXT.title,
    subtitle: '',
    status: '',
    elements: [
      landing(
        `brief_${epoch}`,
        body,
        { x: 24, y: 72, w: 672, h: 264 },
        M23_MODAL.text_guidance_px,
      ),
      button(
        `control_example_${epoch}`,
        M23_TEXT.control_example,
        M23_MODAL.help,
        (mode) => {
          host.commands.showExample(1, mode, host.now());
        },
      ),
      stepAwayButton(host, epoch),
      guidance(`guidance_${epoch}`, [M23_TEXT.modal_guidance]),
    ],
    help: '',
  };
}

function exampleView(
  host: M23SurfaceHost,
  s: Readonly<M23Series>,
  page: 1 | 2,
  epoch: string,
): WorkSurfaceModel {
  const replay = s.help_replay;
  const elements: SurfaceElement[] = [
    landing(
      `example_heading_${page}_${epoch}`,
      M23_TEXT.example_heading,
      M23_MODAL.example_heading,
      M23_MODAL.text_heading_px,
    ),
    text(
      `example_body_${page}_${epoch}`,
      page === 1 ? M23_TEXT.example_1 : M23_TEXT.example_2,
      M23_MODAL.example_body,
      M23_MODAL.text_body_px,
    ),
  ];

  // The illustrations carry pinned copy and glyphs only (§4; round 3,
  // amendment OD-2 / 8c): page 1 the figure and the visible example beacon
  // 133.33 design px apart (80 world px at the field's scale) with the
  // pinned reading; page 2 the SAME figure facing an adjacent highlighted
  // cell in both versions — COMPONENT CELL and EMPTY CELL (decision B).
  if (page === 1) {
    elements.push(
      illustration(
        `example_figure_beacon_${epoch}`,
        M23_FIGURE_GLYPH,
        M23_MODAL.illustration_figure_left,
        false,
        M23_MODAL.text_figure_px,
      ),
      illustration(
        `example_beacon_${epoch}`,
        M23_BEACON_GLYPH,
        M23_MODAL.illustration_beacon,
        false,
        M23_MODAL.text_figure_px,
      ),
      illustration(
        `example_reading_${epoch}`,
        M23_TEXT.scanner_reading(50, 'MODERATE'),
        M23_MODAL.illustration_right,
        false,
        M23_MODAL.text_illustration_px,
      ),
    );
  } else {
    elements.push(
      illustration(
        `example_figure_component_${epoch}`,
        M23_FIGURE_GLYPH,
        M23_MODAL.illustration_figure_left,
        false,
        M23_MODAL.text_figure_px,
      ),
      illustration(
        `example_component_cell_${epoch}`,
        M23_TEXT.example_component_cell,
        M23_MODAL.illustration_cell_left,
        true,
        M23_MODAL.text_illustration_px,
      ),
      illustration(
        `example_figure_empty_${epoch}`,
        M23_FIGURE_GLYPH,
        M23_MODAL.illustration_figure_right,
        false,
        M23_MODAL.text_figure_px,
      ),
      illustration(
        `example_empty_cell_${epoch}`,
        M23_TEXT.example_empty_cell,
        M23_MODAL.illustration_cell_right,
        true,
        M23_MODAL.text_illustration_px,
      ),
    );
  }

  // Navigation: BACK / STEP AWAY / NEXT | OPEN PLOT PANEL | CLOSE HELP.
  if (page === 1 && !replay) {
    elements.push(
      button(`back_${epoch}`, M23_TEXT.back, M23_MODAL.nav_1, (mode) => {
        host.commands.backToBrief(mode, host.now());
      }),
    );
  }

  if (page === 2) {
    elements.push(
      button(`back_${epoch}`, M23_TEXT.back, M23_MODAL.nav_1, (mode) => {
        host.commands.showExample(1, mode, host.now());
      }),
    );
  }

  if (page === 1 && replay) {
    elements.push(
      button(
        `close_help_${epoch}`,
        M23_TEXT.close_help,
        M23_MODAL.nav_1,
        (mode) => {
          host.commands.closeHelp(mode, host.now());
        },
      ),
    );
  }

  elements.push(stepAwayButton(host, epoch, M23_MODAL.nav_2));

  if (page === 1) {
    elements.push(
      button(`next_${epoch}`, M23_TEXT.next, M23_MODAL.nav_3, (mode) => {
        host.commands.showExample(2, mode, host.now());
      }),
    );
  } else if (replay) {
    elements.push(
      button(
        `close_help_${epoch}`,
        M23_TEXT.close_help,
        M23_MODAL.nav_3,
        (mode) => {
          host.commands.closeHelp(mode, host.now());
        },
      ),
    );
  } else {
    elements.push(
      button(
        `open_plot_panel_${epoch}`,
        M23_TEXT.open_plot_panel,
        M23_MODAL.nav_3,
        (mode) => {
          host.commands.openSelector(mode, host.now());
        },
        'accent',
      ),
    );
  }

  elements.push(guidance(`guidance_${epoch}`, [M23_TEXT.modal_guidance]));

  return {
    title: M23_TEXT.title,
    subtitle: '',
    status: '',
    elements,
    help: '',
  };
}

function selectorRow(
  host: M23SurfaceHost,
  plot: M23PlotState,
  position: 1 | 2,
  epoch: string,
): SurfaceElement[] {
  const letter = plot.letter;
  const key = plot.id;
  const terminal = m23PlotTerminal(plot);
  const status =
    position === 1 ? M23_MODAL.selector_status_1 : M23_MODAL.selector_status_2;
  const openBox =
    position === 1 ? M23_MODAL.selector_open_1 : M23_MODAL.selector_open_2;
  const stopBox =
    position === 1 ? M23_MODAL.selector_stop_1 : M23_MODAL.selector_stop_2;

  return [
    text(
      `status_${key}_${epoch}`,
      `${M23_TEXT.plot(letter)} — ${m23SelectorStatus(plot)}`,
      status,
      M23_MODAL.text_body_px,
    ),
    button(
      `open_${key}_${epoch}`,
      plot.opened ? M23_TEXT.resume_plot(letter) : M23_TEXT.open_plot(letter),
      openBox,
      (mode) => {
        host.commands.openPlot(plot.id, mode, host.now());
      },
      terminal ? 'disabled' : undefined,
    ),
    button(
      `stop_${key}_${epoch}`,
      M23_TEXT.stop_plot(letter),
      stopBox,
      (mode) => {
        host.commands.requestStop(plot.id, mode, host.now());
      },
      terminal ? 'disabled' : undefined,
    ),
  ];
}

function selectorView(
  host: M23SurfaceHost,
  s: Readonly<M23Series>,
  epoch: string,
): WorkSurfaceModel {
  const [first, second] = m23DisplayedPlots(s as M23Series);

  return {
    title: M23_TEXT.title,
    subtitle: '',
    status: '',
    elements: [
      landing(
        `tray_${epoch}`,
        m23TrayLine(s as M23Series),
        M23_MODAL.heading,
        M23_MODAL.text_body_px,
      ),
      ...selectorRow(host, first, 1, epoch),
      ...selectorRow(host, second, 2, epoch),
      helpButton(host, epoch),
      stepAwayButton(host, epoch),
      guidance(`guidance_${epoch}`, [M23_TEXT.modal_guidance]),
    ],
    help: M23_TEXT.selector_footer,
  };
}

function firstFailureView(
  host: M23SurfaceHost,
  s: Readonly<M23Series>,
  plot: M23PlotState,
  epoch: string,
): WorkSurfaceModel {
  const sides = m23FailureSides(s as M23Series);
  const label = (response: M23Response) =>
    response === 'continue'
      ? M23_TEXT.continue_search
      : M23_TEXT.stop_this_plot;
  const option = (side: 'left' | 'right'): SurfaceElement =>
    button(
      `ff_${side}_${epoch}`,
      label(sides[side]),
      side === 'left' ? M23_MODAL.option_left : M23_MODAL.option_right,
      (mode) => {
        host.commands.choose(plot.id, sides[side], side, mode, host.now());
      },
    );

  // Model order = focus order: neutral, physical RIGHT, HELP, STEP AWAY,
  // physical LEFT (contract §12 M3). Rendering position is per element.
  return {
    title: M23_TEXT.title,
    subtitle: '',
    status: M23_TEXT.plot(plot.letter),
    elements: [
      landing(
        `ff_landing_${epoch}`,
        M23_TEXT.first_failure,
        M23_MODAL.body,
        M23_MODAL.text_body_px,
      ),
      option('right'),
      helpButton(host, epoch),
      stepAwayButton(host, epoch),
      option('left'),
      guidance(`guidance_${epoch}`, M23_TEXT.failure_guidance),
    ],
    help: '',
  };
}

function stopConfirmView(
  host: M23SurfaceHost,
  plot: M23PlotState,
  epoch: string,
): WorkSurfaceModel {
  return {
    title: M23_TEXT.title,
    subtitle: '',
    status: M23_TEXT.plot(plot.letter),
    elements: [
      landing(
        `confirm_landing_${epoch}`,
        M23_TEXT.stop_confirm(plot.letter),
        M23_MODAL.body,
        M23_MODAL.text_body_px,
      ),
      button(
        `confirm_stop_${plot.id}_${epoch}`,
        M23_TEXT.stop_plot(plot.letter),
        M23_MODAL.option_left,
        (mode) => {
          host.commands.confirmStop(plot.id, mode, host.now());
        },
      ),
      button(
        `confirm_back_${plot.id}_${epoch}`,
        M23_TEXT.back,
        M23_MODAL.option_right,
        (mode) => {
          host.commands.cancelStop(plot.id, mode, host.now());
        },
      ),
      guidance(`guidance_${epoch}`, [M23_TEXT.confirm_footer]),
    ],
    help: M23_TEXT.modal_guidance,
  };
}

function recordView(
  host: M23SurfaceHost,
  s: Readonly<M23Series>,
  epoch: string,
): WorkSurfaceModel {
  // A whole-series fault closed the excavation: the series-closed line (the
  // plot-fault line speaks of "the other plot", true only for a plot fault,
  // which the field's feedback line carries at the fault itself).
  const line =
    s.status === 'held_back' ? M23_TEXT.reload_lock : M23_TEXT.series_closed;

  return {
    title: M23_TEXT.title,
    subtitle: '',
    status: '',
    elements: [
      landing(`record_${epoch}`, line, M23_MODAL.body, M23_MODAL.text_body_px),
      stepAwayButton(host, epoch),
      guidance(`guidance_${epoch}`, [M23_TEXT.modal_guidance]),
    ],
    help: '',
  };
}

/** The plot a first-failure or confirmation view shows (the selected plot, or the one requesting). */
function viewPlot(s: Readonly<M23Series>): M23PlotState | null {
  const requesting = s.plots.find((plot) => plot.stop_request !== null);

  if (s.view === 'stop_confirm' && requesting !== undefined) {
    return requesting;
  }

  return s.selected === null
    ? null
    : (s.plots.find((plot) => plot.id === s.selected) ?? null);
}

export function m23SurfaceModel(host: M23SurfaceHost): WorkSurfaceModel {
  const s = host.series();
  const epoch = host.focusEpoch();

  switch (s.view) {
    case 'brief':
      return briefView(host, epoch);
    case 'example_1':
      return exampleView(host, s, 1, epoch);
    case 'example_2':
      return exampleView(host, s, 2, epoch);
    case 'selector':
      return selectorView(host, s, epoch);
    case 'first_failure': {
      const plot = viewPlot(s);

      return plot === null
        ? selectorView(host, s, epoch)
        : firstFailureView(host, s, plot, epoch);
    }
    case 'stop_confirm': {
      const plot = viewPlot(s);

      return plot === null
        ? selectorView(host, s, epoch)
        : stopConfirmView(host, plot, epoch);
    }
    case 'record':
    case 'none':
      return recordView(host, s, epoch);
  }
}

/** The visual side of a first-failure option id (`ff_left_…` / `ff_right_…`). */
export function m23OptionSide(id: string | null): 'left' | 'right' | null {
  if (id === null) {
    return null;
  }

  if (id.startsWith('ff_left_')) {
    return 'left';
  }

  if (id.startsWith('ff_right_')) {
    return 'right';
  }

  return null;
}

/** The letter shown in a selector row's status (the spec's convenience). */
export function m23RowLetter(plot: M23PlotState): M23PlotLetter {
  return plot.letter;
}
