/**
 * Work-surface model builder for the signal-analysis incident, phase 1
 * (M15 causal model — evidence-led pilot v2, Unit 3).
 *
 * Maps the M15 module state to a `WorkSurfaceModel` and routes every
 * activation back into the SAME domain command with its input mode
 * (pointer/keyboard parity). Presentation: an evidence table on the left
 * (four compact source tiles + one readout), a model board in the centre
 * (five nodes joined by drawn links), the intervention / status column on
 * the right. State is glyph + colour, never colour alone; no correctness
 * preview; no reward effects; the surface can be closed at any time.
 */
import type { CausalAction } from '../../informationProcessing/m15CausalModel';
import {
  m15CausalAct,
  m15CausalFail,
  m15CausalHelp,
  m15CausalStop,
  m15CausalSubmit,
  m15CausalView,
} from '../../informationProcessing/m15CausalModel';
import type {
  SurfaceElement,
  SurfaceLink,
  WorkSurfaceModel,
} from '../ui/WorkSurfaceScene';
import type { InputMode } from './windowKit';

interface SurfaceHost {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
}

/** WorkSurface input modes map onto the IP kit's two modes. */
function ipMode(mode: InputMode): 'pointer' | 'typed' {
  return mode === 'pointer' ? 'pointer' : 'typed';
}

/** Node positions on the model board (panel-relative; ring of five). */
const NODE_SLOTS: { x: number; y: number }[] = [
  { x: 262, y: 118 },
  { x: 448, y: 118 },
  { x: 262, y: 262 },
  { x: 448, y: 262 },
  { x: 355, y: 356 },
];

const NODE_W = 92;
const NODE_H = 40;

/** STOP TASK is armed by a first activation and disarmed by any other act. */
let stopArmed = false;

export function m15CausalSurfaceModel(host: SurfaceHost): WorkSurfaceModel {
  const view = m15CausalView();
  const closed = view.closed;
  const elements: SurfaceElement[] = [];
  const act = (action: CausalAction, mode: InputMode) => {
    stopArmed = false;

    try {
      const result = m15CausalAct(action, ipMode(mode), host.now());

      if (result.message) {
        host.feedback(result.message);
      }
    } catch (error) {
      m15CausalFail(host.now(), String(error));
    }
  };

  // ——— Evidence table (left) ———
  elements.push({
    id: 'evidence_title',
    kind: 'text',
    label: 'EVIDENCE — always visible',
    x: 16,
    y: 62,
    w: 224,
    h: 18,
    small: true,
  });
  view.sources.forEach((source, index) => {
    elements.push({
      id: `source_${source.id}`,
      kind: 'tile',
      label: source.title,
      detail: source.summary,
      x: 16,
      y: 84 + index * 50,
      w: 224,
      h: 44,
      small: true,
      state: source.open ? 'selected' : closed ? 'disabled' : 'idle',
      onActivate: (mode) => act({ kind: 'open_source', id: source.id }, mode),
    });
  });
  elements.push({
    id: 'readout_title',
    kind: 'text',
    label: view.readoutTitle,
    x: 16,
    y: 290,
    w: 224,
    h: 18,
    small: true,
  });
  elements.push({
    id: 'readout',
    kind: 'text',
    label: view.readoutLines.join('\n'),
    x: 16,
    y: 308,
    w: 224,
    h: 150,
    small: true,
    align: 'left',
  });
  elements.push({
    id: 'guide',
    kind: 'button',
    label: 'EXAMPLE',
    x: 16,
    y: 436,
    w: 104,
    h: 26,
    small: true,
    hotkey: 'g',
    state: closed ? 'disabled' : 'idle',
    onActivate: (mode) => act({ kind: 'show_guide' }, mode),
  });
  elements.push({
    id: 'help',
    kind: 'button',
    label: 'HELP',
    x: 136,
    y: 436,
    w: 104,
    h: 26,
    small: true,
    hotkey: 'h',
    state: closed ? 'disabled' : 'idle',
    onActivate: (mode) => {
      try {
        host.feedback(m15CausalHelp(ipMode(mode), host.now()).join(' '));
      } catch (error) {
        m15CausalFail(host.now(), String(error));
      }
    },
  });

  // ——— Model board (centre) ———
  elements.push({
    id: 'board_title',
    kind: 'text',
    label:
      view.mode === 'model'
        ? 'MODEL BOARD — cause first, then its effect'
        : 'PREDICT — mark every node that changes',
    x: 256,
    y: 62,
    w: 296,
    h: 18,
    small: true,
  });
  view.nodes.forEach((node, index) => {
    const slot = NODE_SLOTS[index];

    elements.push({
      id: `node_${node.id}`,
      kind: 'tile',
      label: node.label,
      detail:
        view.mode === 'predict'
          ? node.marked
            ? 'changes'
            : 'unchanged'
          : node.linkSource
            ? 'linking from…'
            : undefined,
      glyph: view.mode === 'predict' ? (node.marked ? '● ' : '○ ') : undefined,
      x: slot.x,
      y: slot.y,
      w: NODE_W,
      h: NODE_H,
      small: true,
      state: closed
        ? 'disabled'
        : node.linkSource
          ? 'selected'
          : view.mode === 'predict' && node.marked
            ? 'accent'
            : 'idle',
      onActivate: (mode) => act({ kind: 'node', id: node.id }, mode),
    });
  });

  const links: SurfaceLink[] = view.edges.map((edge) => ({
    from: `node_${edge.from}`,
    to: `node_${edge.to}`,
    state: closed ? 'disabled' : 'idle',
  }));

  // ——— Intervention / status (right) ———
  elements.push({
    id: 'status_links',
    kind: 'readout',
    label: `Links drawn: ${view.edgesDrawn}`,
    detail:
      view.mode === 'predict'
        ? `Marked: ${view.markedCount}`
        : view.linkSource === null
          ? 'activate a node to start a link'
          : `from ${view.linkSource}`,
    x: 560,
    y: 84,
    w: 144,
    h: 48,
    small: true,
  });
  elements.push({
    id: 'intervention',
    kind: 'text',
    label: `INTERVENTION\n${view.intervention}`,
    x: 560,
    y: 140,
    w: 144,
    h: 96,
    small: true,
    align: 'left',
  });
  elements.push({
    id: 'mode_model',
    kind: 'button',
    label: 'EDIT MODEL',
    x: 560,
    y: 244,
    w: 144,
    h: 28,
    small: true,
    hotkey: '1',
    state: closed ? 'disabled' : view.mode === 'model' ? 'accent' : 'idle',
    onActivate: (mode) => act({ kind: 'set_mode', mode: 'model' }, mode),
  });
  elements.push({
    id: 'mode_predict',
    kind: 'button',
    label: 'PREDICT',
    x: 560,
    y: 278,
    w: 144,
    h: 28,
    small: true,
    hotkey: '2',
    state: closed ? 'disabled' : view.mode === 'predict' ? 'accent' : 'idle',
    onActivate: (mode) => act({ kind: 'set_mode', mode: 'predict' }, mode),
  });
  elements.push({
    id: 'submit',
    kind: 'button',
    label: closed ? 'RECORDED' : 'SUBMIT',
    x: 560,
    y: 400,
    w: 144,
    h: 30,
    hotkey: 's',
    state: closed ? 'done' : 'idle',
    onActivate: (mode) => {
      try {
        const outcome = m15CausalSubmit(ipMode(mode), host.now());

        host.feedback(outcome.message);
      } catch (error) {
        m15CausalFail(host.now(), String(error));
      }
    },
  });
  elements.push({
    id: 'stop',
    kind: 'button',
    label: stopArmed ? 'STOP — CONFIRM' : 'STOP TASK',
    x: 560,
    y: 436,
    w: 144,
    h: 26,
    small: true,
    hotkey: 'q',
    state: closed ? 'disabled' : 'flag',
    onActivate: () => {
      // Two-step stop (the terminal consoles' protection): the first
      // activation arms, any other act disarms, the second closes.
      if (!stopArmed) {
        stopArmed = true;
        host.feedback(
          'Activate STOP TASK again to close this table (record kept).',
        );

        return;
      }

      stopArmed = false;

      try {
        m15CausalStop(host.now());
        host.feedback('Evidence table closed. Record kept.');
      } catch (error) {
        m15CausalFail(host.now(), String(error));
      }
    },
  });

  return {
    title: 'SIGNAL CASE — PHASE 1 · CAUSAL MODEL',
    subtitle: closed
      ? view.status === 'completed'
        ? 'RECORDED'
        : 'CLOSED'
      : view.mode === 'model'
        ? 'MODEL'
        : 'PREDICT',
    status: view.brief.join(' '),
    elements,
    links,
    help: 'Arrows/TAB focus · ENTER or SPACE activate · click also works · G example · 1 model · 2 predict · S submit · Q stop (twice) · ESC leaves (work stays)',
    feedback: view.feedback,
  };
}
