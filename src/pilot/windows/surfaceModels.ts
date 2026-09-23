/**
 * Work-surface model builders for the episode 1-2 item windows
 * (evidence-led pilot v2, Unit 2). Each builder maps a domain module's
 * state to a `WorkSurfaceModel` and routes every activation back into the
 * SAME domain command with its input mode (pointer/keyboard parity).
 *
 * Presentation rules: restrained, compact, operational copy only; state is
 * glyph + colour (never colour alone); no correctness preview, no reward
 * effects; every surface can be closed at any time (fail-forward).
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  advanceM07,
  M07_SETTLE_MS,
  M07_STAGES,
  m07Settling,
  m07State,
} from './m07Calibration';
import {
  assignM14Subsystem,
  consultM14Source,
  flagM14Conflict,
  M14_GAUGES,
  M14_MESSAGES,
  M14_SUBSYSTEMS,
  m14MessageOrder,
  m14Omissions,
  m14State,
  m14Window,
  selectM14Message,
  setM14Priority,
  submitM14,
} from './m14IncidentDesk';
import type { InputMode } from './windowKit';

interface SurfaceHost {
  now: () => number;
  /** Optional surface-clock scheduler (re-renders after the callback). */
  later?: (ms: number, fn: () => void) => void;
  /** Closes the surface (host resumes). */
  close: () => void;
  /** Neutral feedback line on the surface. */
  feedback: (message: string) => void;
}

// ——— M14 incident desk ————————————————————————————————————————————————

export function m14SurfaceModel(host: SurfaceHost): WorkSurfaceModel {
  const s = m14State();
  const done = m14Window.isClosed();
  const elements: SurfaceElement[] = [];

  // Gauges (top strip) — always visible sources.
  M14_GAUGES.forEach((gauge, index) => {
    elements.push({
      id: gauge.id,
      kind: 'readout',
      label: gauge.label,
      detail: `${gauge.reading} · ${gauge.band}`,
      x: 16 + index * 236,
      y: 66,
      w: 226,
      h: 40,
      small: true,
      onActivate: done ? undefined : (mode) => consultM14Source(gauge.id, mode),
    });
  });

  // Messages (left column).
  m14MessageOrder().forEach((message, index) => {
    const assignment = s.assignments[message.id];
    const priority = s.priorities[message.id];
    const tag = [
      assignment
        ? M14_SUBSYSTEMS.find((n) => n.id === assignment)?.label
        : null,
      priority ? `P${priority}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    elements.push({
      id: message.id,
      kind: 'tile',
      label: `${message.from}: ${message.text}`,
      detail: tag.length > 0 ? tag : 'unassigned',
      x: 16,
      y: 114 + index * 52,
      w: 430,
      h: 48,
      small: true,
      state: done
        ? assignment && priority
          ? 'done'
          : 'disabled'
        : s.selectedMessage === message.id
          ? 'selected'
          : assignment && priority
            ? 'done'
            : 'idle',
      onActivate: done
        ? undefined
        : (mode) => selectM14Message(message.id, mode),
    });
  });

  // Station diagram nodes (right).
  elements.push({
    id: 'diagram_title',
    kind: 'text',
    label: 'STATION DIAGRAM — assign the selected message',
    x: 462,
    y: 112,
    w: 244,
    h: 18,
    small: true,
  });
  M14_SUBSYSTEMS.forEach((node, index) => {
    const count = Object.values(s.assignments).filter(
      (a) => a === node.id,
    ).length;

    elements.push({
      id: `node_${node.id}`,
      kind: 'tile',
      label: node.label,
      detail: `${count} assigned`,
      x: 462,
      y: 134 + index * 52,
      w: 244,
      h: 46,
      small: true,
      state: done
        ? 'disabled'
        : s.selectedMessage !== null &&
            s.assignments[s.selectedMessage] === node.id
          ? 'selected'
          : 'idle',
      onActivate: done
        ? undefined
        : (mode) => {
            consultM14Source(`diagram_${node.id}`, mode);

            if (!assignM14Subsystem(node.id, mode)) {
              host.feedback('Select a message first.');
            }
          },
    });
  });

  // Priority chips.
  elements.push({
    id: 'priority_title',
    kind: 'text',
    label: 'PRIORITY for the selected message',
    x: 462,
    y: 296,
    w: 244,
    h: 18,
    small: true,
  });
  ([1, 2, 3] as const).forEach((priority, index) => {
    elements.push({
      id: `priority_${priority}`,
      kind: 'button',
      label: `P${priority}`,
      x: 462 + index * 82,
      y: 318,
      w: 74,
      h: 32,
      hotkey: String(priority),
      state: done
        ? 'disabled'
        : s.selectedMessage !== null &&
            s.priorities[s.selectedMessage] === priority
          ? 'selected'
          : 'idle',
      onActivate: done
        ? undefined
        : (mode) => {
            if (!setM14Priority(priority, mode)) {
              host.feedback('Select a message first.');
            }
          },
    });
  });

  // Conflict flag: pairs the selected message with another selected next.
  elements.push({
    id: 'flag_conflict',
    kind: 'button',
    label: 'Flag conflict with…',
    x: 462,
    y: 360,
    w: 244,
    h: 32,
    hotkey: 'f',
    state: done ? 'disabled' : s.selectedMessage === null ? 'disabled' : 'idle',
    detail: undefined,
    onActivate: done
      ? undefined
      : (mode) => {
          // Flags the selected message against the most recently assigned
          // other message that mentions the same subsystem source; the
          // participant confirms by selecting the second message next.
          const first = s.selectedMessage;

          if (first === null) {
            return;
          }

          pendingConflictFirst = first;
          host.feedback('Now select the message it conflicts with.');
          void mode;
        },
  });

  // Submit / leave.
  elements.push({
    id: 'submit',
    kind: 'button',
    label: done ? 'Submitted' : 'Submit desk',
    x: 462,
    y: 428,
    w: 120,
    h: 34,
    hotkey: 's',
    state: done ? 'disabled' : 'accent',
    onActivate: done
      ? undefined
      : (mode) => {
          const result = submitM14(host.now(), mode);

          if (result === 'warned') {
            host.feedback(
              `${m14Omissions().length} message(s) still unassigned — submit again to send as is.`,
            );
          } else if (result === 'accepted') {
            host.feedback('Desk submitted.');
          }
        },
  });
  elements.push({
    id: 'leave',
    kind: 'button',
    label: done ? 'Close' : 'Leave desk',
    x: 590,
    y: 428,
    w: 116,
    h: 34,
    onActivate: () => host.close(),
  });

  return {
    title: 'INCIDENT DESK — STORM MESSAGES',
    subtitle: done
      ? 'submitted'
      : `${M14_MESSAGES.length - m14Omissions().length}/${M14_MESSAGES.length} assigned`,
    status: done
      ? 'Assignments recorded.'
      : 'Select a message, then a subsystem and a priority. Every source stays on the desk.',
    elements,
    help: 'Arrows/TAB focus · ENTER/SPACE activate · click also works · 1-3 priority · F flag · S submit · ESC leave',
  };
}

/** Pending first half of a conflict pair (surface-local, presentation state). */
let pendingConflictFirst: string | null = null;

/** Host hook: a message selected while a conflict flag is pending completes the pair. */
export function m14MaybeCompleteConflict(
  messageId: string,
  mode: InputMode,
): boolean {
  if (pendingConflictFirst === null || pendingConflictFirst === messageId) {
    return false;
  }

  const first = pendingConflictFirst;

  pendingConflictFirst = null;
  selectM14Message(first, mode);
  flagM14Conflict(messageId, mode);

  return true;
}

export function resetM14SurfaceState() {
  pendingConflictFirst = null;
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
