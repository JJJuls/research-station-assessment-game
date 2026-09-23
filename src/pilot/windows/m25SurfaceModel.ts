/**
 * M25 — work-surface model of the field sensor post (Unit 4). Maps the
 * pure M25 model to a `WorkSurfaceModel`; every activation calls the same
 * domain command with its input mode (pointer / keyboard parity). Copy is
 * operational and neutral: no reward, no praise, no countdown, no
 * evaluative word, no statement that further sweeps are pointless; running
 * more sweeps and finishing carry equal weight. Participant-facing name:
 * a "sensor sweep" (the specification's calibration loop) — "calibration"
 * is the Workshop bench's word (M07) and is not reused here (review U4).
 *
 * Layout rules (U2-R precedent, review U4): the status line is one short
 * line; the sweep button sits on its own row and STAYS FOCUSABLE while a
 * sweep runs (the model refuses and logs the press), so keyboard focus can
 * never fall through onto Leave or Finished; the completion screen's two
 * controls ("Run more sweeps" / "Finished") use different keys from the
 * sweep key, and the model refuses either inside its settle window, so no
 * press carried from the third sweep can enter the optional phase or stop.
 */
import {
  m25LoopElapsedMs,
  m25OptionalCompleted,
  m25RequiredCompleted,
  m25RunningLoop,
} from '../exterior/m25RepetitionModel';
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  closeM25Surface,
  enterM25Optional,
  M25_LOOP_MS,
  M25_REQUIRED_LOOPS,
  m25AdministeredBefore,
  m25LoopsWindow,
  m25State,
  startM25Loop,
  stopM25,
  tickM25,
} from './m25Repetition';

export interface M25SurfaceHost {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
  /** Schedules ONE re-render on a wall-clock timer (coalesced by the host). */
  later: (ms: number, fn: () => void) => void;
}

const TICK_MS = 250;
/** Sweep button row (required and optional phases). */
const SWEEP_Y = 300;
/** Completion / optional controls row. */
const CHOICE_Y = 300;
const SECONDS = (ms: number) => (ms / 1000).toFixed(1);

export function m25SurfaceModel(host: M25SurfaceHost): WorkSurfaceModel {
  const s = m25State();
  const now = host.now();
  const done = m25LoopsWindow.isClosed();
  const elements: SurfaceElement[] = [];
  const running = m25RunningLoop(s);
  const required = m25RequiredCompleted(s);
  const optional = m25OptionalCompleted(s);

  if (!done && (running !== null || s.phase === 'optional')) {
    // Keep the sweep cycle and the optional window moving while the
    // surface is open; the model ends a sweep (and the window) on focused
    // time by itself.
    host.later(TICK_MS, () => {
      const result = tickM25(host.now());

      if (result === 'required_complete') {
        host.feedback('Sensor check complete.');
      } else if (result === 'cap') {
        host.feedback('The post has closed its sweep input.');
      } else if (result === 'loop') {
        host.feedback('Sweep complete.');
      }
    });
  }

  elements.push({
    id: 'loops',
    kind: 'readout',
    label:
      s.phase === 'required'
        ? `SWEEP ${Math.min(required + 1, M25_REQUIRED_LOOPS)} / ${M25_REQUIRED_LOOPS}`
        : done && m25AdministeredBefore()
          ? 'POST RECORD HELD'
          : done && required < M25_REQUIRED_LOOPS
            ? `POST CLOSED — ${required} / ${M25_REQUIRED_LOOPS} SWEEPS`
            : 'SENSOR CHECK COMPLETE',
    x: 16,
    y: 64,
    w: 330,
    h: 30,
  });
  elements.push({
    id: 'tally',
    kind: 'readout',
    label:
      optional > 0
        ? `SWEEPS RECORDED: ${required} + ${optional} further`
        : `SWEEPS RECORDED: ${required}`,
    x: 376,
    y: 64,
    w: 330,
    h: 30,
  });

  const sweepReadout = (idle: string) => {
    const elapsed = m25LoopElapsedMs(s, now);

    elements.push({
      id: 'cycle',
      kind: 'readout',
      label:
        running !== null && elapsed !== null
          ? `SWEEP RUNNING — ${SECONDS(Math.min(elapsed, M25_LOOP_MS))} s of ${SECONDS(M25_LOOP_MS)} s`
          : 'SENSOR IDLE',
      detail: running !== null ? 'the sweep runs by itself' : idle,
      x: 16,
      y: 150,
      w: 690,
      h: 60,
    });
  };
  // The sweep button never leaves the surface while a sweep runs: the
  // model refuses (and logs) the press, and keyboard focus stays put.
  const sweepButton = (label: string, x: number) => {
    elements.push({
      id: 'run_loop',
      kind: 'button',
      label: running !== null ? 'Sweep running…  (R)' : label,
      x,
      y: SWEEP_Y,
      w: 220,
      h: 54,
      hotkey: 'r',
      onActivate: (mode) => {
        startM25Loop(host.now(), mode);
      },
    });
  };

  let status = '';
  let help = 'Arrows/TAB focus · ENTER/SPACE press · click also works · ';

  if (done) {
    status = m25AdministeredBefore()
      ? 'This post was already used earlier in this session. Its record is held; it does not run again.'
      : required < M25_REQUIRED_LOOPS
        ? `The post closed with ${required} of ${M25_REQUIRED_LOOPS} sweeps recorded. Its record is held as it stands.`
        : s.stop_kind === 'cap'
          ? 'The post has closed its sweep input. The sensor check stands complete.'
          : 'The post is closed. The sensor check stands complete.';
    help += 'ESC close';
  } else {
    switch (s.phase) {
      case 'required':
        status = `Sensor check: run ${M25_REQUIRED_LOOPS} sweeps. Each sweep is one press and runs for ${M25_LOOP_MS / 1000} seconds.`;
        sweepReadout('press Run to start the next sweep');
        sweepButton('Run sensor sweep  (R)', 250);
        help += 'R run sweep · ESC leave';
        break;
      case 'complete_marked':
        status = `Sensor check complete — ${M25_REQUIRED_LOOPS} sweeps recorded.`;
        elements.push({
          id: 'completion_note',
          kind: 'text',
          label:
            'You can run further sweeps at this post if you want to. Pay and route are not affected.',
          x: 16,
          y: 150,
          w: 690,
          h: 60,
          align: 'left',
        });
        elements.push({
          id: 'more_loops',
          kind: 'button',
          label: 'Run more sweeps  (C)',
          x: 116,
          y: CHOICE_Y,
          w: 220,
          h: 54,
          hotkey: 'c',
          onActivate: (mode) => {
            enterM25Optional(host.now(), mode);
          },
        });
        elements.push({
          id: 'finished',
          kind: 'button',
          label: 'Finished  (F)',
          x: 386,
          y: CHOICE_Y,
          w: 220,
          h: 54,
          hotkey: 'f',
          onActivate: (mode) => {
            stopM25(host.now(), mode);
          },
        });
        help += 'C more sweeps · F finished · ESC leave';
        break;
      case 'optional':
        status = 'Further sweeps run the same way as the three recorded.';
        sweepReadout('press Run for another sweep, or Finished to close');
        sweepButton('Run sweep again  (R)', 116);
        elements.push({
          id: 'finished',
          kind: 'button',
          label: 'Finished — close  (F)',
          x: 386,
          y: CHOICE_Y,
          w: 220,
          h: 54,
          hotkey: 'f',
          onActivate: (mode) => {
            stopM25(host.now(), mode);
          },
        });
        help += 'R sweep again · F finished · ESC leave';
        break;
      default:
        help += 'ESC leave';
        break;
    }
  }

  elements.push({
    id: 'leave',
    kind: 'button',
    label: done ? 'Close  (ESC)' : 'Leave post  (ESC)',
    x: 566,
    y: 380,
    w: 140,
    h: 34,
    onActivate: () => host.close(),
  });

  return {
    title: 'FIELD SENSOR POST',
    subtitle: done
      ? 'closed'
      : s.phase === 'required'
        ? 'sensor check'
        : s.phase === 'complete_marked'
          ? 'check complete'
          : 'further sweeps',
    status,
    elements,
    help,
  };
}

export { closeM25Surface };
