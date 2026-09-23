/**
 * M12 — work-surface model of a quality packet (Unit 8). Maps the pure
 * M12 model to a `WorkSurfaceModel`; every activation calls the same
 * domain command with its input mode (pointer / keyboard parity). Copy is
 * operational and neutral: no praise, no warning at release, no hint at
 * which field is faulty, no running completion count while the packet is
 * open (review S-5).
 *
 * Layout and input rules (U2-R … U7 precedent, U8 review): three field
 * rows — the printed value, the reference (hidden until checked:
 * "Packing list: —") and a Check control (hotkeys 1–3); one judgement row
 * for the field awaiting judgement ("Matches" M / "Differs" D — refused
 * inside the settle window after the reveal); a keypad (digits 0–9 with
 * digit hotkeys, Back Z, Clear X, Cancel C, Confirm V or ENTER once the
 * entry is full) while a correction is being entered; "Release packet"
 * (R) and Leave (ESC) apart on the bottom row.
 *
 * Focus discipline (review S-1 / G-M2): the surface keeps focus by
 * element id and otherwise falls to the FIRST focusable element, so the
 * first focusable element is always neutral — a revealed reference
 * (activation re-reads it, logged) or the keypad's entry line — never a
 * judgement control; Confirm leads the keypad group and is enabled only
 * when the entry is full, so ENTER confirms exactly then. Repeated ENTER
 * therefore never produces a judgement (a check, then nothing).
 */
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import {
  checkM12Field,
  confirmM12Correction,
  judgeM12Field,
  M12_PRODUCTS,
  m12AdministeredBefore,
  m12FieldsJudged,
  m12KeypadField,
  m12KeypadPress,
  type M12Occasion,
  m12State,
  m12Windows,
  releaseM12,
  reopenM12Keypad,
  rereadM12Reference,
} from './m12QualityControl';

export interface M12SurfaceHost {
  now: () => number;
  close: () => void;
  feedback: (message: string) => void;
}

const HEADER_Y = 64;
const ROW_Y = [84, 142, 200] as const;
const ROW_H = 50;
const JUDGE_Y = 258;
const KEYPAD_Y = 302;
const BOTTOM_Y = 428;
const fields = (n: number) => `${n} ${n === 1 ? 'field' : 'fields'}`;

export function m12SurfaceModel(
  occasion: M12Occasion,
  host: M12SurfaceHost,
): WorkSurfaceModel {
  const s = m12State(occasion);
  const product = M12_PRODUCTS[occasion];
  const heldBack = m12AdministeredBefore(occasion);
  const done = m12Windows[occasion].isClosed() || s.released;
  const elements: SurfaceElement[] = [];
  const keypad = m12KeypadField(s);
  const pending =
    s.pending === null
      ? null
      : (s.fields.find((field) => field.id === s.pending) ?? null);

  elements.push({
    id: 'product_title',
    kind: 'text',
    label: product.title.toUpperCase(),
    x: 16,
    y: HEADER_Y,
    w: 340,
    h: 16,
    small: true,
  });
  elements.push({
    id: 'reference_title',
    kind: 'text',
    label: `${product.referenceTitle.toUpperCase()} (shown per checked field)`,
    x: 356,
    y: HEADER_Y,
    w: 350,
    h: 16,
    small: true,
  });

  s.fields.forEach((field, index) => {
    const spec = product.fields[index];
    const checked = field.checked_at_ms !== null;
    const value = `${spec.prefix}${
      field.correction === null ? field.printed : field.correction.entered
    }`;
    const judgementText =
      field.judgement === null
        ? checked
          ? 'judgement pending'
          : 'not checked'
        : field.judgement === 'matches'
          ? 'judged: matches'
          : field.correction === null
            ? 'judged: differs — no correction entered'
            : `judged: differs — corrected to ${spec.prefix}${field.correction.entered}`;

    elements.push({
      id: `field_${field.id}`,
      kind: 'readout',
      label: `${spec.label}: ${value}`,
      detail: judgementText,
      glyph:
        field.judgement === null
          ? undefined
          : field.judgement === 'matches'
            ? '= '
            : '≠ ',
      x: 16,
      y: ROW_Y[index],
      w: 330,
      h: ROW_H,
      small: true,
      state: field.judgement === null ? 'idle' : 'done',
    });
    // A revealed reference is focusable and its activation only re-reads
    // it (logged): the neutral landing for focus after a Check.
    elements.push({
      id: `ref_${field.id}`,
      kind: 'readout',
      label: checked
        ? `${product.referenceTitle}: ${spec.prefix}${field.reference}`
        : `${product.referenceTitle}: —`,
      detail: checked ? undefined : 'check the field to show it',
      x: 356,
      y: ROW_Y[index],
      w: 210,
      h: ROW_H,
      small: true,
      onActivate:
        checked && !done && keypad === null
          ? (mode) => {
              rereadM12Reference(occasion, field.id, mode);
            }
          : undefined,
    });

    if (!done && !heldBack) {
      const canReopen =
        field.judgement === 'differs' &&
        field.correction === null &&
        !field.keypad_open &&
        keypad === null &&
        pending === null;
      // One field at a time: while a judgement is pending or the keypad is
      // open, the other Check controls rest (their digit hotkeys would
      // otherwise collide with the keypad's digits).
      const blocked =
        keypad !== null || (pending !== null && pending.id !== field.id);
      const disabled = blocked || (checked && !canReopen);

      elements.push({
        id: `check_${field.id}`,
        kind: 'button',
        label: canReopen
          ? `Correct  (${index + 1})`
          : disabled
            ? checked
              ? 'Checked'
              : 'Check'
            : `Check  (${index + 1})`,
        x: 576,
        y: ROW_Y[index] + 8,
        w: 130,
        h: 34,
        hotkey: disabled ? undefined : `${index + 1}`,
        state: disabled ? 'disabled' : 'idle',
        onActivate: (mode) => {
          if (canReopen) {
            reopenM12Keypad(occasion, field.id, mode);

            return;
          }

          const result = checkM12Field(occasion, field.id, host.now(), mode);

          if (result === 'checked') {
            host.feedback(
              `${spec.label}: the ${product.referenceTitle.toLowerCase()} value is shown. Does the printed ${product.valueName} match it?`,
            );
          }
        },
      });
    }
  });

  let status: string;
  let help = 'Arrows/TAB focus · ENTER/SPACE press · click also works · ';

  if (heldBack) {
    status =
      'This packet was opened earlier in this session. Its record is held; it does not run again.';
    help += 'ESC close';
  } else if (done) {
    status = `Packet released with ${fields(m12FieldsJudged(s))} checked and judged.`;
    help += 'ESC close';
  } else if (keypad !== null) {
    const spec = product.fields[keypad.index];
    const full = keypad.entry.length === spec.digits;

    // Confirm leads the group: enabled only when the entry is full, so
    // focus falls to it exactly then (ENTER confirms).
    elements.push({
      id: 'key_confirm',
      kind: 'button',
      label: 'Confirm  (V)',
      x: 566,
      y: JUDGE_Y,
      w: 140,
      h: 36,
      hotkey: 'v',
      state: full ? 'accent' : 'disabled',
      onActivate: (mode) => {
        const result = confirmM12Correction(occasion, host.now(), mode);

        if (result === 'entered') {
          host.feedback(`${spec.label}: the value you entered is recorded.`);
        } else if (result === 'empty') {
          host.feedback('Enter the value first.');
        }
      },
    });
    // The entry line is focusable with a no-op activation while the entry
    // is incomplete (the neutral landing for focus); once full it drops
    // out of the focus order so focus falls to Confirm (ENTER confirms).
    elements.push({
      id: 'entry',
      kind: 'readout',
      label: `${spec.label} — enter the ${product.valueName}: ${spec.prefix}${keypad.entry}${'_'.repeat(Math.max(0, spec.digits - keypad.entry.length))}`,
      x: 16,
      y: JUDGE_Y,
      w: 540,
      h: 36,
      onActivate: full ? undefined : () => undefined,
    });

    for (let digit = 0; digit <= 9; digit += 1) {
      elements.push({
        id: `key_${digit}`,
        kind: 'button',
        label: `${digit}`,
        x: 16 + digit * 69,
        y: KEYPAD_Y,
        w: 60,
        h: 40,
        hotkey: full ? undefined : `${digit}`,
        state: full ? 'disabled' : 'idle',
        onActivate: (mode) => {
          m12KeypadPress(occasion, `${digit}`, mode);
        },
      });
    }

    elements.push({
      id: 'key_back',
      kind: 'button',
      label: 'Back  (Z)',
      x: 16,
      y: KEYPAD_Y + 54,
      w: 120,
      h: 34,
      hotkey: 'z',
      state: keypad.entry.length === 0 ? 'disabled' : 'idle',
      onActivate: (mode) => {
        m12KeypadPress(occasion, 'back', mode);
      },
    });
    elements.push({
      id: 'key_clear',
      kind: 'button',
      label: 'Clear  (X)',
      x: 146,
      y: KEYPAD_Y + 54,
      w: 120,
      h: 34,
      hotkey: 'x',
      state: keypad.entry.length === 0 ? 'disabled' : 'idle',
      onActivate: (mode) => {
        m12KeypadPress(occasion, 'clear', mode);
      },
    });
    elements.push({
      id: 'key_cancel',
      kind: 'button',
      label: 'Cancel  (C)',
      x: 276,
      y: KEYPAD_Y + 54,
      w: 120,
      h: 34,
      hotkey: 'c',
      onActivate: (mode) => {
        if (m12KeypadPress(occasion, 'cancel', mode)) {
          host.feedback(
            'No correction entered — the field stays judged as differing.',
          );
        }
      },
    });
    status = `Enter the ${product.valueName} for ${spec.label} (${spec.digits} digits), then confirm.`;
    help =
      '0–9 digits · Z back · X clear · C cancel · V or ENTER confirm · ESC leave';
  } else if (pending !== null) {
    const spec = product.fields[pending.index];

    elements.push({
      id: 'judge_prompt',
      kind: 'text',
      label: `${spec.label}: does the printed ${product.valueName} match the ${product.referenceTitle.toLowerCase()}?`,
      x: 16,
      y: JUDGE_Y,
      w: 690,
      h: 24,
      align: 'left',
    });
    elements.push({
      id: 'judge_matches',
      kind: 'button',
      label: 'Matches  (M)',
      x: 116,
      y: JUDGE_Y + 34,
      w: 220,
      h: 44,
      hotkey: 'm',
      onActivate: (mode) => {
        if (
          judgeM12Field(occasion, pending.id, 'matches', host.now(), mode) ===
          'refused'
        ) {
          host.feedback('Judge once the reference value is showing.');
        }
      },
    });
    elements.push({
      id: 'judge_differs',
      kind: 'button',
      label: 'Differs  (D)',
      x: 386,
      y: JUDGE_Y + 34,
      w: 220,
      h: 44,
      hotkey: 'd',
      onActivate: (mode) => {
        if (
          judgeM12Field(occasion, pending.id, 'differs', host.now(), mode) ===
          'refused'
        ) {
          host.feedback('Judge once the reference value is showing.');
        }
      },
    });
    status = `Judge ${spec.label}: matches or differs.`;
    help += 'M matches · D differs · ESC leave';
  } else {
    status =
      'Check any field to compare it with the reference, or release the packet as it stands.';
    help += '1–3 check · R release · ESC leave';
  }

  if (!done && !heldBack) {
    elements.push({
      id: 'release',
      kind: 'button',
      label: 'Release packet  (R)',
      x: 376,
      y: BOTTOM_Y,
      w: 190,
      h: 34,
      hotkey: 'r',
      onActivate: (mode) => {
        const judged = m12FieldsJudged(m12State(occasion));

        if (releaseM12(occasion, host.now(), mode)) {
          host.feedback(
            `Packet released — ${fields(judged)} checked and judged.`,
          );
        }
      },
    });
  }

  elements.push({
    id: 'leave',
    kind: 'button',
    label: done || heldBack ? 'Close  (ESC)' : 'Leave  (ESC)',
    x: 576,
    y: BOTTOM_Y,
    w: 130,
    h: 34,
    onActivate: () => host.close(),
  });

  return {
    title:
      occasion === 'o1'
        ? 'QUALITY PACKET — SUPPLY MANIFEST'
        : 'QUALITY PACKET — CALIBRATION TAGS',
    subtitle: heldBack ? 'held' : done ? 'released' : 'open',
    status,
    elements,
    help,
  };
}
