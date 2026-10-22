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
  closeM07Surface,
  M07_STAGES,
  type M07HoldBackKind,
  m07HoldBackKind,
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

/**
 * U24 Part A (owner decision RA-2 of 21 October 2026): the bench opened in
 * an earlier page load is held back after a reload (register §5.14). The
 * screen keeps the bench title and shows the owner's two lines exactly,
 * with LEAVE only — no stage tiles, no ADVANCE, no 0/6 — and it is a
 * closed record: showing or leaving it writes nothing.
 */
export const M07_HELD_BACK_LINES = [
  'This calibration bench was opened earlier in this session.',
  'It stays closed after a reload.',
] as const;

/**
 * Closeout amendment of 22 October 2026 (register §5.378 (3) and (4)): the
 * owner's lines for a bench held back because its earlier state could not
 * be verified, and for one closed unopened at an earlier station review.
 * Same title, same LEAVE-only screen.
 */
export const M07_UNVERIFIED_HISTORY_LINES = [
  'The earlier state of this bench could not be verified.',
  'It stays closed after this reload.',
] as const;
export const M07_REVIEW_CLOSED_LINES = [
  'This calibration bench was closed at the station review.',
  'It stays closed after a reload.',
] as const;

const M07_HOLD_BACK_LINES: Readonly<
  Record<M07HoldBackKind, readonly string[]>
> = {
  prior_opening: M07_HELD_BACK_LINES,
  unverified_history: M07_UNVERIFIED_HISTORY_LINES,
  prior_review_closure: M07_REVIEW_CLOSED_LINES,
};

export function m07HeldBackSurfaceModel(
  host: SurfaceHost,
  kind: M07HoldBackKind,
): WorkSurfaceModel {
  return {
    // The existing bench title, unchanged.
    title: 'CALIBRATION BENCH — ROUTINE PROJECT',
    status: M07_HOLD_BACK_LINES[kind].join('\n'),
    elements: [
      {
        id: 'leave',
        kind: 'button',
        label: 'Leave bench',
        x: 566,
        y: 380,
        w: 140,
        h: 34,
        onActivate: () => host.close(),
      },
    ],
    help: 'Arrows/TAB focus · ENTER/SPACE activate · click also works · ESC leave',
  };
}

/**
 * The settle refresh (closeout amendment of 22 October 2026, register
 * §5.378 (2)). The bench re-renders after the 1.4 s settle on the surface
 * clock, but the settle is measured on the host's wall clock, and the
 * surface clock can run AHEAD of it (Phaser smooths its frame delta): one
 * refresh could fire while the bench still read "Settling…", and nothing
 * re-rendered it again. Every render of a settling bench arms one refresh
 * per visit and settle; a refresh that fires early re-arms for the
 * remaining settle. It never shortens the settle and never advances a
 * stage. The timer belongs to the surface, so closing the view discards
 * it, and a reopening (a new visit) arms its own: the first render of a
 * view runs inside the surface's `create()`, before the scene counts as
 * running, so the host cannot schedule yet — the arming is retried once
 * when the current task ends, for the same visit and settle only.
 */
const M07_REFRESH_MARGIN_MS = 60;
/** Bounds the re-arming (a wall clock moved backwards never loops). */
const M07_REFRESH_MAX_REARMS = 20;
let m07RefreshArmedFor: string | null = null;

function armM07SettleRefresh(
  host: SurfaceHost,
  visit: number,
  settlingUntilMs: number,
  retried = false,
) {
  const later = host.later;
  const key = `${visit}:${settlingUntilMs}`;

  if (later === undefined || m07RefreshArmedFor === key) {
    return;
  }

  m07RefreshArmedFor = key;

  const wait = (rearms: number) => {
    let scheduled = false;

    later(
      Math.max(0, settlingUntilMs - host.now()) + M07_REFRESH_MARGIN_MS,
      () => {
        if (!scheduled) {
          // No running surface to schedule on (the host ran the callback at
          // once): nothing to re-render now. Retry once after this task —
          // a view rendered from its `create()` is running by then.
          m07RefreshArmedFor = null;

          if (!retried) {
            queueMicrotask(() => {
              const s = m07State();

              if (
                s.visits === visit &&
                s.settlingUntilMs === settlingUntilMs &&
                m07Settling(host.now())
              ) {
                armM07SettleRefresh(host, visit, settlingUntilMs, true);
              }
            });
          }

          return;
        }

        if (m07Settling(host.now()) && rearms > 0) {
          wait(rearms - 1);
        }
      },
    );
    scheduled = true;
  };

  wait(M07_REFRESH_MAX_REARMS);
}

export function m07SurfaceModel(host: SurfaceHost): WorkSurfaceModel {
  const holdBack = m07HoldBackKind();

  if (holdBack !== null) {
    return m07HeldBackSurfaceModel(host, holdBack);
  }

  const s = m07State();
  const now = host.now();
  const settling = m07Settling(now);
  const done = s.completed;

  if (settling && s.settlingUntilMs !== null) {
    armM07SettleRefresh(host, s.visits, s.settlingUntilMs);
  }
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
    // Focusable while settling (owner ruling of 22 October 2026, REG §5.381
    // (1)): a disabled ADVANCE would hand focus to LEAVE. A press while
    // settling reaches advanceM07, which refuses it and writes nothing.
    state: done ? 'disabled' : settling ? 'idle' : 'accent',
    onActivate: done
      ? undefined
      : (mode) => {
          if (advanceM07(host.now(), mode)) {
            host.feedback('Stage advancing.');
            // The re-render once the settle ends is armed by the settling
            // render that follows (the host is paused under the surface, so
            // only the surface clock can do this).
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
    // LEAVE takes the ESC path (owner ruling of 22 October 2026, REG §5.383
    // (1)): the bench's close (pause, departure record), then the view.
    onActivate: () => {
      closeM07Surface(host.now());
      host.close();
    },
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
