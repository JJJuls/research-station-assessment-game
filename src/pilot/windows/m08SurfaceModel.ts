/**
 * M08 — work-surface model of the station support console (Unit 2).
 * Maps the pure M08 model to a `WorkSurfaceModel`; every activation calls
 * the same domain command with its input mode (pointer / keyboard parity).
 * Copy is operational and neutral: no reward effects, no praise, no race
 * framing, no evaluative word; the two options carry equal weight.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  chooseM08,
  M08_EPOCH_MS,
  M08_EPOCHS,
  M08_PRACTICE_ITEMS,
  M08_THRESHOLD,
  m08CurrentEpoch,
  m08CurrentReading,
  m08EpochRemainingMs,
  m08State,
  m08Window,
  sortM08Practice,
  sortM08Work,
  tickM08,
} from './m08EffortChoice';

export interface M08SurfaceHost {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
  /** Schedules a re-render on the surface clock (running slots tick). */
  later: (ms: number, fn: () => void) => void;
}

const TICK_MS = 250;

export function m08SurfaceModel(host: M08SurfaceHost): WorkSurfaceModel {
  const s = m08State();
  const now = host.now();
  const done = m08Window.isClosed();
  const elements: SurfaceElement[] = [];
  const epoch = m08CurrentEpoch();
  const tally = `STATION OUTPUT: ${s.outputUnitsTotal} unit${s.outputUnitsTotal === 1 ? '' : 's'}`;

  if (s.phase === 'work' || s.phase === 'rest') {
    // Keep the slot clock moving while the surface is open; the model
    // ends the slot on its own once the focused time is reached.
    host.later(TICK_MS, () => {
      if (tickM08(host.now())) {
        host.feedback('Slot complete.');
      }
    });
  }

  elements.push({
    id: 'tally',
    kind: 'readout',
    label: tally,
    x: 16,
    y: 64,
    w: 330,
    h: 30,
    small: true,
  });
  elements.push({
    id: 'slot',
    kind: 'readout',
    label:
      s.phase === 'practice'
        ? `PRACTICE  ${Math.min(s.practice.sorted + 1, M08_PRACTICE_ITEMS)} / ${M08_PRACTICE_ITEMS}`
        : done
          ? 'ALL SLOTS COMPLETE'
          : `SLOT ${s.current + 1} / ${M08_EPOCHS}`,
    x: 376,
    y: 64,
    w: 330,
    h: 30,
    small: true,
  });

  const sortButtons = (
    onSort: (bin: 'A' | 'B', mode: Parameters<typeof sortM08Work>[2]) => void,
  ) => {
    elements.push({
      id: 'reading',
      kind: 'readout',
      label: `READING  ${m08CurrentReading()}`,
      detail: `A: ${M08_THRESHOLD} and above  ·  B: below ${M08_THRESHOLD}`,
      x: 16,
      y: 160,
      w: 690,
      h: 60,
      state: 'accent',
    });
    elements.push({
      id: 'bin_a',
      kind: 'button',
      label: 'Bin A',
      x: 116,
      y: 250,
      w: 220,
      h: 54,
      hotkey: 'a',
      onActivate: (mode) => onSort('A', mode),
    });
    elements.push({
      id: 'bin_b',
      kind: 'button',
      label: 'Bin B',
      x: 386,
      y: 250,
      w: 220,
      h: 54,
      hotkey: 'b',
      onActivate: (mode) => onSort('B', mode),
    });
  };

  let status = '';

  switch (s.phase) {
    case 'practice':
      status = `Practice first: sort ${M08_PRACTICE_ITEMS} readings into the bins by the rule shown. Practice adds no output.`;
      sortButtons((bin, mode) => {
        sortM08Practice(bin, host.now(), mode);
      });
      break;
    case 'choice': {
      const units = epoch?.benefit_units ?? 0;

      status = `Six slots of 15 seconds each. This slot: sorting adds ${units} output unit${units === 1 ? '' : 's'} to the station tally; standing by adds none. Both last the full 15 seconds and end the same way. Pay and route are not affected.`;
      elements.push({
        id: 'offer',
        kind: 'readout',
        label: `THIS SLOT — sorting: +${units} unit${units === 1 ? '' : 's'}  ·  standing by: +0`,
        x: 16,
        y: 160,
        w: 690,
        h: 40,
        state: 'accent',
      });
      elements.push({
        id: 'choose_work',
        kind: 'button',
        label: 'Sort readings',
        x: 116,
        y: 240,
        w: 220,
        h: 54,
        hotkey: '1',
        onActivate: (mode) => {
          chooseM08('work', host.now(), mode);
        },
      });
      elements.push({
        id: 'choose_rest',
        kind: 'button',
        label: 'Stand by',
        x: 386,
        y: 240,
        w: 220,
        h: 54,
        hotkey: '2',
        onActivate: (mode) => {
          chooseM08('rest', host.now(), mode);
        },
      });
      break;
    }
    case 'work': {
      const remaining = m08EpochRemainingMs(now) ?? 0;

      status = `Sorting — ${Math.ceil(remaining / 1000)} s left in this slot.`;
      sortButtons((bin, mode) => {
        sortM08Work(bin, host.now(), mode);
      });
      break;
    }
    case 'rest': {
      const remaining = m08EpochRemainingMs(now) ?? 0;

      status = `Standing by — ${Math.ceil(remaining / 1000)} s left in this slot.`;
      elements.push({
        id: 'standby',
        kind: 'readout',
        label: 'Console idle',
        detail: 'nothing to do until the slot ends',
        x: 16,
        y: 160,
        w: 690,
        h: 60,
      });
      break;
    }
    case 'done':
      status = `All ${M08_EPOCHS} slots complete. The console is logged.`;
      break;
    default:
      break;
  }

  elements.push({
    id: 'leave',
    kind: 'button',
    label: done ? 'Close' : 'Leave console',
    x: 566,
    y: 380,
    w: 140,
    h: 34,
    onActivate: () => host.close(),
  });

  return {
    title: 'STATION SUPPORT CONSOLE',
    subtitle:
      s.phase === 'practice'
        ? 'practice'
        : done
          ? 'complete'
          : `slot ${s.current + 1} of ${M08_EPOCHS} · ${M08_EPOCH_MS / 1000} s`,
    status,
    elements,
    help: 'Arrows/TAB focus · ENTER/SPACE press · click also works · A/B bins · 1/2 choose · ESC leave',
  };
}
