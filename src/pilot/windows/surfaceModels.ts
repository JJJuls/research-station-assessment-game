/**
 * Work-surface model builders for the episode 1-2 item windows
 * (evidence-led pilot v2, Unit 2). Each builder maps a domain module's
 * state to a `WorkSurfaceModel` and routes every activation back into the
 * SAME domain command with its input mode (pointer/keyboard parity).
 *
 * Presentation rules: restrained, compact, operational copy only; state is
 * glyph + colour (never colour alone); no correctness preview, no reward
 * effects; every surface can be closed at any time (fail-forward).
 *
 * Station 080 Unit 17: the M14 incident-desk builder moved to
 * `m14SurfaceModel.ts` (the two-packet administration); the v2 one-packet
 * builder is retired from the route.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  advanceM07,
  M07_SETTLE_MS,
  M07_STAGES,
  m07Settling,
  m07State,
} from './m07Calibration';

interface SurfaceHost {
  now: () => number;
  /** Optional surface-clock scheduler (re-renders after the callback). */
  later?: (ms: number, fn: () => void) => void;
  /** Closes the surface (host resumes). */
  close: () => void;
  /** Neutral feedback line on the surface. */
  feedback: (message: string) => void;
}

// ——— M07 calibration bench ————————————————————————————————————————————

export function m07SurfaceModel(host: SurfaceHost): WorkSurfaceModel {
  const s = m07State();
  const now = host.now();
  const settling = m07Settling(now);
  const done = s.completed;
  const elements: SurfaceElement[] = [];

  for (let stage = 1; stage <= M07_STAGES; stage += 1) {
    const complete = stage <= s.stagesCompleted;
    const isNext = stage === s.stagesCompleted + 1;

    elements.push({
      id: `stage_${stage}`,
      kind: 'tile',
      label: `Stage ${stage} of ${M07_STAGES}`,
      detail: complete
        ? 'calibrated'
        : isNext
          ? settling
            ? 'settling…'
            : 'next'
          : 'pending',
      x: 16 + ((stage - 1) % 3) * 232,
      y: 80 + Math.floor((stage - 1) / 3) * 90,
      w: 222,
      h: 80,
      state: complete ? 'done' : isNext ? 'accent' : 'idle',
    });
  }

  elements.push({
    id: 'endpoint',
    kind: 'readout',
    label: `Endpoint: ${M07_STAGES} stages · ${s.stagesCompleted} done`,
    x: 16,
    y: 268,
    w: 690,
    h: 32,
  });

  elements.push({
    id: 'advance',
    kind: 'button',
    label: done
      ? 'Calibration complete'
      : settling
        ? 'Settling…'
        : 'Advance stage',
    x: 16,
    y: 380,
    w: 220,
    h: 34,
    hotkey: 'a',
    state: done || settling ? 'disabled' : 'accent',
    onActivate: done
      ? undefined
      : (mode) => {
          if (advanceM07(host.now(), mode)) {
            host.feedback('Stage advancing.');
            // Re-render once the settle ends (the host is paused under the
            // surface, so only the surface clock can do this).
            host.later?.(M07_SETTLE_MS + 60, () => undefined);
          }
        },
  });
  elements.push({
    id: 'leave',
    kind: 'button',
    label: done ? 'Close' : 'Leave bench',
    x: 566,
    y: 380,
    w: 140,
    h: 34,
    onActivate: () => host.close(),
  });

  return {
    title: 'CALIBRATION BENCH — ROUTINE PROJECT',
    subtitle: done ? 'complete' : `${s.stagesCompleted}/${M07_STAGES}`,
    status: done
      ? 'All six stages calibrated.'
      : 'Six routine stages. Progress is kept if you leave and come back.',
    elements,
    help: 'Arrows/TAB focus · ENTER/SPACE activate · click also works · A advance · ESC leave',
  };
}
