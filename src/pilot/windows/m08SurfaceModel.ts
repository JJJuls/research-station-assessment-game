/**
 * M08 — work-surface model of the station support console (Unit 2 / U2-R).
 * Maps the pure M08 model to a `WorkSurfaceModel`; every activation calls
 * the same domain command with its input mode (pointer / keyboard parity).
 * Copy is operational and neutral: no reward effects, no praise, no race
 * framing, no evaluative word; the two options carry equal weight.
 *
 * Layout rules from the review (U2-R): the status line is one short line
 * (the row of readouts under it must never cover it); the interval
 * screen's Continue control and the two choice buttons sit on rows the
 * bins never use, so no in-flight press becomes a choice; the key
 * stimuli use the default readout fill (legible contrast) and the
 * standard text size; every button shows its key.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  chooseM08,
  continueM08,
  M08_EPOCH_MS,
  M08_EPOCHS,
  M08_PRACTICE_ITEMS,
  M08_THRESHOLD,
  m08AdministeredBefore,
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
  /**
   * Schedules ONE re-render on the surface clock while a slot runs (the
   * host coalesces requests: a second request while one is pending is a
   * no-op, so button presses never multiply the tick chain).
   */
  later: (ms: number, fn: () => void) => void;
}

const TICK_MS = 250;

/** Bin row (practice and work). */
const BIN_Y = 250;
/** Choice row — never where the bins are. */
const CHOICE_Y = 300;
/** Continue control — its own row and column, away from every other button. */
const CONTINUE = { x: 16, y: 380, w: 220, h: 34 } as const;

function units(n: number): string {
  return `${n} unit${n === 1 ? '' : 's'}`;
}

export function m08SurfaceModel(host: M08SurfaceHost): WorkSurfaceModel {
  const s = m08State();
  const now = host.now();
  const done = m08Window.isClosed();
  const elements: SurfaceElement[] = [];
  const epoch = m08CurrentEpoch();
  const completedSlots = s.epochs.filter((e) => e.completed).length;

  if (!done && (s.phase === 'work' || s.phase === 'rest')) {
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
    label: `STATION OUTPUT: ${units(s.outputUnitsTotal)}`,
    x: 16,
    y: 64,
    w: 330,
    h: 30,
  });
  elements.push({
    id: 'slot',
    kind: 'readout',
    label:
      s.phase === 'practice'
        ? `PRACTICE  ${Math.min(s.practice.sorted + 1, M08_PRACTICE_ITEMS)} / ${M08_PRACTICE_ITEMS}`
        : done
          ? m08AdministeredBefore()
            ? 'CONSOLE RECORD HELD'
            : `${completedSlots} / ${M08_EPOCHS} SLOTS RECORDED`
          : s.phase === 'interval' && s.intervalReason === 'practice'
            ? 'PRACTICE COMPLETE'
            : `SLOT ${s.current + 1} / ${M08_EPOCHS}`,
    x: 376,
    y: 64,
    w: 330,
    h: 30,
  });

  const sortButtons = (
    onSort: (bin: 'A' | 'B', mode: Parameters<typeof sortM08Work>[2]) => void,
  ) => {
    elements.push({
      id: 'reading',
      kind: 'readout',
      label: `READING  ${m08CurrentReading()}`,
      detail: `Bin A: ${M08_THRESHOLD} and above  ·  Bin B: below ${M08_THRESHOLD}`,
      x: 16,
      y: 150,
      w: 690,
      h: 60,
    });
    elements.push({
      id: 'bin_a',
      kind: 'button',
      label: 'Bin A  (A)',
      x: 116,
      y: BIN_Y,
      w: 220,
      h: 54,
      hotkey: 'a',
      onActivate: (mode) => onSort('A', mode),
    });
    elements.push({
      id: 'bin_b',
      kind: 'button',
      label: 'Bin B  (B)',
      x: 386,
      y: BIN_Y,
      w: 220,
      h: 54,
      hotkey: 'b',
      onActivate: (mode) => onSort('B', mode),
    });
  };

  let status = '';

  if (done) {
    status = m08AdministeredBefore()
      ? 'This console was already used in an earlier session load. Its record is held; it does not run again.'
      : completedSlots >= M08_EPOCHS
        ? `All ${M08_EPOCHS} slots ended. The console is recorded.`
        : `The console closed with ${completedSlots} of ${M08_EPOCHS} slots ended. Its record is held as it stands.`;
  } else {
    switch (s.phase) {
      case 'practice':
        status = `Practice first: sort ${M08_PRACTICE_ITEMS} readings by the rule shown. Practice adds no output.`;
        sortButtons((bin, mode) => {
          const result = sortM08Practice(bin, host.now(), mode);

          if (result !== null) {
            host.feedback(
              result.correct
                ? `Reading ${result.reading}: Bin ${result.bin} matches the rule.`
                : `Reading ${result.reading}: the rule puts it in Bin ${result.correctBin}.`,
            );
          }
        });
        break;
      case 'interval': {
        const previous = s.epochs[s.current - 1];

        status =
          s.intervalReason === 'practice'
            ? `Practice complete (${s.practice.correct} of ${s.practice.sorted} by the rule). Six slots of ${M08_EPOCH_MS / 1000} seconds follow.`
            : `Slot ${s.current} ended (${previous?.choice === 'work' ? 'sorting' : 'standing by'}; +${previous?.output_units ?? 0}).`;
        elements.push({
          id: 'interval_note',
          kind: 'text',
          label:
            'Each slot offers sorting or standing by. Both last the full 15 seconds and end the same way. Pay and route are not affected.',
          x: 16,
          y: 150,
          w: 690,
          h: 60,
          align: 'left',
        });
        elements.push({
          id: 'continue',
          kind: 'button',
          label:
            s.intervalReason === 'practice'
              ? 'Show slot 1  (C)'
              : `Show slot ${s.current + 1}  (C)`,
          ...CONTINUE,
          hotkey: 'c',
          onActivate: (mode) => {
            continueM08(host.now(), mode);
          },
        });
        break;
      }
      case 'choice': {
        const offer = epoch?.benefit_units ?? 0;

        status = `Slot ${s.current + 1}: sorting readings produces +${units(offer)}; standing by produces none.`;
        elements.push({
          id: 'offer',
          kind: 'readout',
          label: `THIS SLOT — sorting: +${units(offer)}  ·  standing by: +0`,
          x: 16,
          y: 150,
          w: 690,
          h: 40,
        });
        elements.push({
          id: 'offer_note',
          kind: 'text',
          label:
            'Both last the full 15 seconds and end the same way. Units come from readings actually sorted. Pay and route are not affected.',
          x: 16,
          y: 200,
          w: 690,
          h: 50,
          align: 'left',
        });
        elements.push({
          id: 'choose_work',
          kind: 'button',
          label: 'Sort readings  (1)',
          x: 116,
          y: CHOICE_Y,
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
          label: 'Stand by  (2)',
          x: 386,
          y: CHOICE_Y,
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
          y: 150,
          w: 690,
          h: 60,
        });
        break;
      }
      default:
        break;
    }
  }

  elements.push({
    id: 'leave',
    kind: 'button',
    label: done ? 'Close  (ESC)' : 'Leave console  (ESC)',
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
          ? 'closed'
          : s.phase === 'interval'
            ? 'between slots'
            : `slot ${s.current + 1} of ${M08_EPOCHS} · ${M08_EPOCH_MS / 1000} s`,
    status,
    elements,
    help: 'Arrows/TAB focus · ENTER/SPACE press · click also works · A/B bins · 1/2 choose · C continue · ESC leave',
  };
}
