/**
 * M05 — work-surface model of the accepted extra job (Unit 6). Maps the
 * pure M05 model to a `WorkSurfaceModel`; every activation calls the same
 * domain command with its input mode (pointer / keyboard parity). Copy is
 * operational and neutral: no reward, no praise, no countdown, no
 * evaluative word, no hurrying; starting and deferring carry equal
 * weight and both sit on one row with distinct hotkeys.
 *
 * Layout rules (U2-R / U4 / U5 precedent): the status line is one short
 * line; the two decision controls share a row away from the Leave button;
 * a press inside the settle window after the surface appears is refused
 * by the model (a carried E / ENTER from the station prompt can never be
 * a start or a deferral); after a closure the start control stays (a late
 * start is a companion, never a rewrite) and "Not now" is not offered
 * again; a running work cycle keeps ticking on a wall-clock timer while
 * the surface is open and pauses when it is closed.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  closeM05Surface,
  deferM05,
  M05_JOBS,
  M05_WORK_MS,
  m05AdministeredBefore,
  type M05Occasion,
  m05State,
  pollM05,
  startM05,
  tickM05Work,
} from './m05Initiation';
import {
  m05Open,
  m05WorkDone,
  m05WorkElapsedMs,
  m05WorkRunning,
} from './m05StartModel';

export interface M05SurfaceHost {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
  /** Schedules ONE re-render on a wall-clock timer (coalesced by the host). */
  later: (ms: number, fn: () => void) => void;
}

const TICK_MS = 250;
const CONTROL_Y = 300;
const SECONDS = (ms: number) => (ms / 1000).toFixed(1);

export function m05SurfaceModel(
  host: M05SurfaceHost,
  occasion: M05Occasion,
): WorkSurfaceModel {
  const s = m05State(occasion);
  const job = M05_JOBS[occasion];
  const now = host.now();
  const running = m05WorkRunning(s);
  const done = m05WorkDone(s);
  const elements: SurfaceElement[] = [];

  if (running) {
    host.later(TICK_MS, () => {
      if (tickM05Work(occasion, host.now()) === 'work_completed') {
        host.feedback(job.done);
      }
    });
  } else if (m05Open(s) && s.clock !== null) {
    // The host scene is paused under this surface, so its per-frame poll
    // does not run: the surface keeps the eligibility clock's cap check
    // going itself (review U6 S-F1). The start control stays usable here,
    // so no block is reported.
    host.later(TICK_MS, () => {
      pollM05(occasion, host.now(), { prompt: false, worldAction: false });
    });
  }

  // "Not now" was pressed during THIS view of the surface: the panel stays
  // open and acknowledges it (review U6 G-F1 — a silently closing panel
  // read exactly like "Leave", although the two closures differ).
  const deferredHere =
    s.status === 'deferred' &&
    s.closed_at_ms !== null &&
    s.last_control_view_at_ms !== null &&
    s.closed_at_ms >= s.last_control_view_at_ms;

  elements.push({
    id: 'job',
    kind: 'readout',
    label: `JOB: ${job.job.toUpperCase()}`,
    detail: done
      ? job.done
      : running
        ? `${job.working} ${SECONDS(Math.min(m05WorkElapsedMs(s, now) ?? 0, M05_WORK_MS))} s of ${SECONDS(M05_WORK_MS)} s`
        : 'a moment once started',
    x: 16,
    y: 64,
    w: 690,
    h: 60,
  });

  let status: string;
  let help = 'Arrows/TAB focus · ENTER/SPACE press · click also works · ';

  if (m05AdministeredBefore(occasion)) {
    status =
      'This job was answered earlier in this session. Its record is held; it is not offered again.';
    help += 'ESC close';
  } else if (done) {
    status = `${job.done} The job is complete.`;
    help += 'ESC close';
  } else {
    status = running
      ? `${job.working} The job runs by itself; leaving pauses it.`
      : deferredHere
        ? 'Noted. The job stays open; you can start it from here later.'
        : s.status === null
          ? 'Start the job when you are ready, or choose Not now.'
          : 'Start the job when you are ready.';
    // The start control stays on the surface while the work runs (label
    // changed, press refused by the model), so keyboard focus never falls
    // through onto Leave (review U6 G-F2; the M25 sweep-button rule).
    elements.push({
      id: 'start',
      kind: 'button',
      label: running ? 'Job running…  (S)' : 'Start the job  (S)',
      x: s.status === null && !running ? 116 : 250,
      y: CONTROL_Y,
      w: 220,
      h: 54,
      hotkey: 's',
      onActivate: (mode) => {
        startM05(occasion, host.now(), mode);
      },
    });

    if (s.status === null && !running) {
      elements.push({
        id: 'defer',
        kind: 'button',
        label: 'Not now  (N)',
        x: 386,
        y: CONTROL_Y,
        w: 220,
        h: 54,
        hotkey: 'n',
        onActivate: (mode) => {
          deferM05(occasion, host.now(), mode);
        },
      });
      help += 'S start · N not now · ESC leave';
    } else if (!running) {
      help += 'S start · ESC leave';
    } else {
      help += 'ESC leave';
    }
  }

  elements.push({
    id: 'leave',
    kind: 'button',
    label: done ? 'Close  (ESC)' : 'Leave  (ESC)',
    x: 566,
    y: 380,
    w: 140,
    h: 34,
    onActivate: () => host.close(),
  });

  return {
    title: job.title,
    subtitle: done
      ? 'complete'
      : running
        ? 'in progress'
        : s.status === null
          ? 'accepted job'
          : 'job open',
    status,
    elements,
    help,
  };
}

export { closeM05Surface };
