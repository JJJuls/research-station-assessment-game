/**
 * M06 — work-surface model of the dispatch console's timed work period
 * (Unit 7). Maps the pure M06 model to a `WorkSurfaceModel`; every
 * activation calls the same domain command with its input mode (pointer /
 * keyboard parity). Copy is operational and neutral: no praise, no race
 * framing, no reward; the time left is stated as a plain readout because
 * the participant is told the period is bounded.
 *
 * Layout and input rules (U2-R / U4 / U5 / U6 precedent, review U7): the
 * status line is one short line; the token rows keep the v2 positions and
 * the ACTIVE row (the next token the buffer needs) carries the digit
 * hotkeys 1–4, so a keyboard order costs three digits and D — the
 * pointer's four clicks; Back (Z) removes one token, Clear (X) the whole
 * buffer; the last dispatch stays readable under the buffer; Dispatch (D),
 * Skip order (K) and Stop work (Q — a letter that appears in no token)
 * have distinct hotkeys; Stop is two presses (arm, then confirm); the
 * ready screen's Begin is refused inside its settle window; the budget
 * keeps ticking on a wall-clock timer while the surface is open and pauses
 * when it is closed. No typing exists on this surface.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  beginM06Period,
  clearM06Buffer,
  consultM06Reference,
  dispatchM06,
  M06_BUDGET_MS,
  M06_ORDER_COUNT,
  M06_PRACTICE_LINES,
  M06_TARGETS,
  M06_VALUES,
  M06_VERBS,
  m06ActiveRow,
  m06AdministeredBefore,
  m06CurrentLine,
  m06RemainingMs,
  m06State,
  m06StopArmed,
  m06UniqueCorrect,
  m06Window,
  pressM06Token,
  removeM06Token,
  skipM06Order,
  stopM06,
  tickM06,
} from './m06RoutineDispatch';

export interface M06SurfaceHost {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
  /** Schedules ONE re-render on a wall-clock timer (coalesced by the host). */
  later: (ms: number, fn: () => void) => void;
}

const TICK_MS = 250;
const CONTROL_Y = 380;
const SECONDS = (ms: number) => Math.ceil(ms / 1000);
const orders = (n: number) => `${n} ${n === 1 ? 'order' : 'orders'}`;

export function m06SurfaceModel(host: M06SurfaceHost): WorkSurfaceModel {
  const s = m06State();
  const now = host.now();
  const done = m06Window.isClosed() || s.phase === 'done';
  const elements: SurfaceElement[] = [];
  const current = m06CurrentLine(s);
  const unique = m06UniqueCorrect(s);
  const armed = s.phase === 'work' && m06StopArmed(s, now);
  const ended = () =>
    `The work period has ended — ${orders(m06UniqueCorrect(m06State()))} sent correctly.`;

  if (s.phase === 'work') {
    host.later(TICK_MS, () => {
      if (tickM06(host.now()) === 'budget') {
        host.feedback(ended());
      }
    });
  }

  // ——— reference ————————————————————————————————————————————————————
  if (s.phase === 'practice') {
    elements.push({
      id: 'reference_title',
      kind: 'text',
      label: 'PRACTICE LINES (not scored)',
      x: 16,
      y: 64,
      w: 690,
      h: 18,
      small: true,
    });
    M06_PRACTICE_LINES.forEach((line, index) => {
      const active = index === s.practiceSent;

      elements.push({
        id: `ref_${index}`,
        kind: 'readout',
        label: `${index + 1}. ${line.join('  ')}`,
        glyph: index < s.practiceSent ? '✓' : active ? '▶' : undefined,
        x: 16 + (index % 2) * 348,
        y: 86,
        w: 340,
        h: 30,
        small: true,
        state: index < s.practiceSent ? 'done' : 'idle',
        onActivate: (mode) => consultM06Reference(mode),
      });
    });
  } else if (s.phase === 'work' && current !== null) {
    const remaining = m06RemainingMs(s, now) ?? 0;

    elements.push({
      id: 'order',
      kind: 'readout',
      label: `ORDER ${s.current + 1} of ${M06_ORDER_COUNT}  ·  ${current.join('  ')}`,
      glyph: '▶',
      x: 16,
      y: 64,
      w: 450,
      h: 52,
      detail: 'send it exactly as written',
      onActivate: (mode) => consultM06Reference(mode),
    });
    elements.push({
      id: 'tally',
      kind: 'readout',
      label: `SENT CORRECTLY: ${unique}`,
      x: 476,
      y: 64,
      w: 230,
      h: 24,
      small: true,
    });
    elements.push({
      id: 'time_left',
      kind: 'readout',
      label: `TIME LEFT: ${SECONDS(remaining)} s`,
      x: 476,
      y: 92,
      w: 230,
      h: 24,
      small: true,
    });
  } else if (s.phase === 'ready') {
    elements.push({
      id: 'ready_note',
      kind: 'text',
      label:
        `Practice complete. The work period is ${M06_BUDGET_MS / 1000} seconds of console time. ` +
        `${M06_ORDER_COUNT} orders arrive one at a time — send each exactly as written; only a matching line counts. ` +
        'A line that does not match can be rebuilt, or the order skipped (a skipped order does not come back). ' +
        'You may stop work early. Leaving the console pauses the period.',
      x: 16,
      y: 64,
      w: 690,
      h: 110,
      align: 'left',
    });
  } else {
    elements.push({
      id: 'summary',
      kind: 'readout',
      label: m06AdministeredBefore()
        ? 'CONSOLE RECORD HELD'
        : `WORK PERIOD ENDED — ${unique} of ${M06_ORDER_COUNT} ORDERS SENT CORRECTLY`,
      x: 16,
      y: 64,
      w: 690,
      h: 52,
    });
  }

  // ——— buffer and tokens (practice and work) ———————————————————————
  const composing = (s.phase === 'practice' || s.phase === 'work') && !done;

  if (composing) {
    elements.push({
      id: 'buffer',
      kind: 'readout',
      label:
        s.buffer.length === 0
          ? 'BUFFER: (empty)'
          : `BUFFER: ${s.buffer.join('  ')}`,
      detail:
        s.lastDispatch === null
          ? undefined
          : `last sent: ${s.lastDispatch.line.join(' ')} — ${
              s.lastDispatch.correct ? 'matched' : 'no match'
            }`,
      x: 16,
      y: 150,
      w: 690,
      h: 44,
    });

    const tokenRows: readonly (readonly string[])[] = [
      M06_VERBS,
      M06_TARGETS,
      M06_VALUES,
    ];
    const rowLabels = ['VERB', 'TARGET', 'VALUE'];
    const activeRow = m06ActiveRow(s);

    tokenRows.forEach((row, rowIndex) => {
      const active = activeRow === rowIndex;

      elements.push({
        id: `row_${rowIndex}`,
        kind: 'text',
        label: active ? `${rowLabels[rowIndex]} ▶` : rowLabels[rowIndex],
        x: 16,
        y: 206 + rowIndex * 54,
        w: 60,
        h: 18,
        small: true,
      });
      row.forEach((token, index) => {
        elements.push({
          id: `token_${token}`,
          kind: 'button',
          label: active ? `${index + 1} · ${token}` : token,
          x: 86 + index * 156,
          y: 200 + rowIndex * 54,
          w: 146,
          h: 40,
          hotkey: active ? `${index + 1}` : undefined,
          onActivate: (mode) => {
            pressM06Token(token, mode);
          },
        });
      });
    });

    elements.push({
      id: 'back',
      kind: 'button',
      label: 'Back  (Z)',
      x: 16,
      y: CONTROL_Y,
      w: 94,
      h: 34,
      hotkey: 'z',
      state: s.buffer.length === 0 ? 'disabled' : 'idle',
      onActivate: (mode) => {
        removeM06Token(mode);
      },
    });
    elements.push({
      id: 'clear',
      kind: 'button',
      label: 'Clear  (X)',
      x: 116,
      y: CONTROL_Y,
      w: 94,
      h: 34,
      hotkey: 'x',
      state: s.buffer.length === 0 ? 'disabled' : 'idle',
      onActivate: (mode) => {
        clearM06Buffer(mode);
      },
    });
    elements.push({
      id: 'dispatch',
      kind: 'button',
      label: 'Dispatch  (D)',
      x: 216,
      y: CONTROL_Y,
      w: 130,
      h: 34,
      hotkey: 'd',
      state: s.buffer.length === 3 ? 'accent' : 'disabled',
      onActivate: (mode) => {
        const before = m06State().buffer.join(' ');
        const result = dispatchM06(host.now(), mode);
        const after = m06State();

        switch (result) {
          case 'practice_correct':
            host.feedback('Practice line sent — it matches.');
            break;
          case 'practice_incorrect':
            host.feedback(
              `Sent ${before} — does not match practice line ${after.practiceSent + 1}. Try again.`,
            );
            break;
          case 'correct':
            host.feedback('Order sent.');
            break;
          case 'incorrect':
            host.feedback(
              `Sent ${before} — does not match order ${after.current + 1}. Rebuild the line or skip the order.`,
            );
            break;
          case 'all_orders':
            host.feedback(
              `All ${M06_ORDER_COUNT} orders handled — ${orders(m06UniqueCorrect(after))} sent correctly.`,
            );
            break;
          case 'budget':
            host.feedback(ended());
            break;
          default:
            break;
        }
      },
    });

    if (s.phase === 'work') {
      elements.push({
        id: 'skip',
        kind: 'button',
        label: 'Skip order  (K)',
        x: 356,
        y: CONTROL_Y,
        w: 118,
        h: 34,
        hotkey: 'k',
        onActivate: (mode) => {
          const skipped = m06State().current + 1;
          const result = skipM06Order(host.now(), mode);

          if (result === 'skipped') {
            host.feedback(`Order ${skipped} skipped.`);
          } else if (result === 'all_orders') {
            host.feedback(
              `All ${M06_ORDER_COUNT} orders handled — ${orders(m06UniqueCorrect(m06State()))} sent correctly.`,
            );
          }
        },
      });
      elements.push({
        id: 'stop',
        kind: 'button',
        label: armed ? 'Confirm stop  (Q)' : 'Stop work  (Q)',
        x: 484,
        y: CONTROL_Y,
        w: 118,
        h: 34,
        hotkey: 'q',
        state: armed ? 'accent' : 'idle',
        onActivate: (mode) => {
          const result = stopM06(host.now(), mode);

          if (result === 'armed') {
            host.feedback('Press Stop again to end the work period.');
          } else if (result === 'stopped') {
            host.feedback(
              `Work stopped — ${orders(m06UniqueCorrect(m06State()))} sent correctly.`,
            );
          }
        },
      });
    }
  } else if (s.phase === 'ready') {
    elements.push({
      id: 'begin',
      kind: 'button',
      label: 'Begin the work period  (B)',
      x: 216,
      y: 300,
      w: 290,
      h: 54,
      hotkey: 'b',
      onActivate: (mode) => {
        beginM06Period(host.now(), mode);
      },
    });
  }

  elements.push({
    id: 'leave',
    kind: 'button',
    label: done ? 'Close  (ESC)' : 'Leave  (ESC)',
    x: 612,
    y: CONTROL_Y,
    w: 94,
    h: 34,
    onActivate: () => host.close(),
  });

  let status: string;
  let help = 'Arrows/TAB focus · ENTER press · click also works · ';

  if (m06AdministeredBefore()) {
    status =
      'This console was already used earlier in this session. Its record is held; it does not run again.';
    help += 'ESC close';
  } else if (done) {
    status =
      s.stopKind === 'explicit'
        ? 'Work stopped. The console record is held as it stands.'
        : s.stopKind === 'all_orders' || s.stopKind === 'all_skipped'
          ? 'Every order was handled. The console record is held.'
          : 'The work period has ended. The console record is held.';
    help += 'ESC close';
  } else if (s.phase === 'practice') {
    status =
      'Compose the marked practice line from the tokens (1–4 pick from the marked row), then dispatch.';
    help += '1–4 token · Z back · X clear · D dispatch · ESC leave';
  } else if (s.phase === 'ready') {
    status = 'Begin when you are ready.';
    help += 'B begin · ESC leave';
  } else {
    status = armed
      ? 'Stop armed — press Stop again to end the work period, or carry on.'
      : 'Compose the order from the tokens and dispatch it. A line that does not match stays for correction.';
    help +=
      '1–4 token · Z back · X clear · D dispatch · K skip · Q stop · ESC pause';
  }

  return {
    title: 'DISPATCH CONSOLE — ROUTINE ORDERS',
    subtitle: done
      ? 'closed'
      : s.phase === 'practice'
        ? 'practice'
        : s.phase === 'ready'
          ? 'ready'
          : `order ${s.current + 1} of ${M06_ORDER_COUNT}`,
    status,
    elements,
    help,
  };
}
