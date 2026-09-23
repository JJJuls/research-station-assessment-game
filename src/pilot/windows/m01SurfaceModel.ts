/**
 * M01 — work-surface model of a three-job batch (Unit 5). Maps the pure
 * batch model to a `WorkSurfaceModel`; every activation calls the same
 * domain command with its input mode (pointer / keyboard parity). Copy is
 * operational and neutral: the sequence board is presented as optional in
 * the same breath as direct work, no wording praises or discourages
 * either, and a refused job states its printed requirement factually.
 *
 * Layout (review U5): packet cards (left) — a lifted card STAYS in the
 * packet as a selected tile (activating it again puts it back), so
 * keyboard focus never jumps when a card is lifted; the optional sequence
 * board (right); the three job controls on their own row in the packet's
 * (counterbalanced) order, so the row never hands a direct worker the
 * canonical workable order; finished jobs stay focusable (the model
 * refuses the press with feedback), so focus never walks onto the next
 * job or onto Leave; a closed or held record shows every control
 * disabled.
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  M01_BATCHES,
  M01_JOBS,
  m01AdministeredBefore,
  m01Job,
  type M01Occasion,
  m01PacketOrder,
  m01State,
  m01Window,
  pickM01Card,
  placeM01Card,
  returnM01Card,
  workM01Job,
} from './m01PlanBoard';

export interface M01SurfaceHost {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
}

/** Job controls row — never where the packet cards or the slots sit. */
const JOB_Y = 330;

export function m01SurfaceModel(
  host: M01SurfaceHost,
  occasion: M01Occasion,
): WorkSurfaceModel {
  const s = m01State(occasion);
  const done = m01Window(occasion).isClosed();
  const batch = M01_BATCHES[occasion];
  const elements: SurfaceElement[] = [];
  const held = s.held === null ? null : m01Job(occasion, s.held);
  // The board is inert once locked (first job press) or once the record
  // is closed / held from an earlier load.
  const boardLocked = s.plan_locked || done;
  const packet = m01PacketOrder(occasion, s.form).filter(
    (id) => !s.slots.includes(id),
  );

  elements.push({
    id: 'packet_title',
    kind: 'text',
    label: 'JOB CARDS — requirements printed on each card',
    x: 16,
    y: 70,
    w: 330,
    h: 20,
    small: true,
  });

  packet.forEach((id, index) => {
    const card = m01Job(occasion, id);
    const isHeld = s.held === id;

    elements.push({
      id: `card_${card.id}`,
      kind: 'tile',
      label: isHeld ? `${card.label} — lifted` : card.label,
      detail: isHeld
        ? 'choose a slot, or activate again to put it back'
        : card.requires.length === 0
          ? 'no requirement'
          : `after: ${card.requires.map((r) => m01Job(occasion, r).label).join(', ')}`,
      x: 16,
      y: 96 + index * 54,
      w: 330,
      h: 48,
      small: true,
      state: boardLocked ? 'disabled' : isHeld ? 'selected' : 'idle',
      onActivate: boardLocked
        ? undefined
        : (mode) => {
            if (isHeld) {
              returnM01Card(occasion, mode);
              host.feedback(`${card.label} put back.`);
            } else if (held !== null) {
              host.feedback(`${held.label} is lifted — choose a slot first.`);
            } else if (pickM01Card(occasion, card.id, mode)) {
              host.feedback(`${card.label} lifted — choose a slot.`);
            }
          },
    });
  });

  elements.push({
    id: 'board_title',
    kind: 'text',
    label: s.plan_locked
      ? 'SEQUENCE — recorded as it stood when the first job started'
      : 'SEQUENCE (optional) — three slots, top to bottom',
    x: 366,
    y: 70,
    w: 340,
    h: 20,
    small: true,
  });

  s.slots.forEach((jobId, index) => {
    elements.push({
      id: `slot_${index}`,
      kind: 'tile',
      label:
        jobId === null
          ? `slot ${index + 1} — empty`
          : `${index + 1}. ${m01Job(occasion, jobId).label}`,
      x: 366,
      y: 96 + index * 54,
      w: 340,
      h: 48,
      small: true,
      state: boardLocked
        ? jobId !== null && s.done.includes(jobId)
          ? 'done'
          : 'disabled'
        : held !== null
          ? 'accent'
          : 'idle',
      onActivate: boardLocked
        ? undefined
        : (mode) => {
            if (held !== null) {
              placeM01Card(occasion, index, mode);
            } else if (jobId !== null) {
              pickM01Card(occasion, jobId, mode);
              host.feedback(
                `${m01Job(occasion, jobId).label} lifted — choose a slot.`,
              );
            } else {
              host.feedback('Lift a card first, then choose a slot.');
            }
          },
    });
  });

  // Job controls in the packet's order (never the canonical order): one
  // press does one job, or states its requirement. Finished jobs and the
  // closed state keep the control focusable but inert.
  m01PacketOrder(occasion, s.form).forEach((id, index) => {
    const job = m01Job(occasion, id);
    const isDone = s.done.includes(job.id);

    elements.push({
      id: `do_${job.id}`,
      kind: 'button',
      label: isDone
        ? `Done — ${job.label}`
        : `Do: ${job.label}  (${index + 1})`,
      x: 16 + index * 234,
      y: JOB_Y,
      w: 220,
      h: 54,
      hotkey: `${index + 1}`,
      state: isDone ? 'done' : done ? 'disabled' : undefined,
      onActivate: done
        ? undefined
        : (mode) => {
            if (isDone) {
              host.feedback(`${job.label} is already done.`);

              return;
            }

            const result = workM01Job(occasion, job.id, host.now(), mode);

            if (result === 'blocked') {
              host.feedback(
                `${job.label} needs ${job.requires
                  .map((r) => m01Job(occasion, r).label)
                  .join(' and ')} first.`,
              );
            } else if (result === 'done') {
              host.feedback(`${job.label} done.`);
            } else if (result === 'complete') {
              host.feedback('All three jobs done. The batch is recorded.');
            } else {
              host.feedback('One press per job — try again in a moment.');
            }
          },
    });
  });

  let status: string;

  if (done) {
    status = m01AdministeredBefore(occasion)
      ? 'This batch was already opened earlier in this session. Its record is held; it does not run again.'
      : s.done.length >= M01_JOBS
        ? 'All three jobs done. The batch is recorded.'
        : `The batch closed with ${s.done.length} of ${M01_JOBS} jobs done. Its record is held as it stands.`;
  } else if (s.plan_locked) {
    status = `${s.done.length} of ${M01_JOBS} jobs done. A job runs once its printed requirement is done.`;
  } else {
    status =
      'Three jobs. Sequence them on the board first if you want to, or start any job directly.';
  }

  elements.push({
    id: 'leave',
    kind: 'button',
    label: done ? 'Close  (ESC)' : 'Leave  (ESC)',
    x: 566,
    y: 428,
    w: 140,
    h: 34,
    onActivate: () => host.close(),
  });

  return {
    title: batch.title,
    subtitle: done
      ? 'recorded'
      : s.plan_locked
        ? `${s.done.length} / ${M01_JOBS} done`
        : 'three jobs',
    status,
    elements,
    help: 'Arrows/TAB focus · ENTER/SPACE press · click also works · 1/2/3 jobs · ESC leave',
  };
}
