/**
 * Work-surface model builders for the return-shift item windows
 * (evidence-led pilot v2, Unit 5): the station feed console (M20 resume),
 * the relay bench with its drawer manual (M21) and the shift report desk
 * (M22). Each builder maps the window adapter's state to a
 * `WorkSurfaceModel` and routes every activation back into the SAME
 * adapter command with its input mode (pointer/keyboard parity: the
 * surface renderer converges both paths on `onActivate`).
 *
 * Presentation rules: restrained, compact, operational copy only; state
 * is glyph + colour (never colour alone); no correctness preview (the M21
 * bench has no pre-application test — FIT is the application); no reward
 * effects; every surface can be closed at any time (fail-forward).
 */
import type { M20IndoorStage } from '../exterior/m20AntennaModel';
import {
  M20_INDOOR_STAGE_LABELS,
  M20_INDOOR_STAGES,
  M20_OUTDOOR_STAGES,
  M20_STAGE_LABELS,
  m20Complete,
  m20MastStatus,
  m20NextIndoorStage,
  m20Returned,
} from '../exterior/m20AntennaModel';
import type { M21Section } from '../return/m21ManualModel';
import {
  M21_SECTION_REFERENCES,
  M21_SECTIONS,
  m21ApplicationReadout,
  m21Def,
  m21Spec,
  m21UnitReadout,
} from '../return/m21ManualModel';
import {
  M22_CRITERION_TEXT,
  M22_LINES,
  M22_MIN_LINES,
  M22_SLOTS,
  M22_TAGS,
  m22Acknowledged,
  m22Line,
  m22OutcomeText,
  m22Progress,
  m22TrayOrder,
} from '../return/m22ReportModel';
import type { SurfaceElement, WorkSurfaceModel } from '../ui/WorkSurfaceScene';
import { exteriorEpisode } from './exteriorWindows';
import {
  m20ConsoleAvailability,
  m20ConsoleBeginStage,
  m20ConsoleFinishStage,
  m20ConsoleResume,
  m20ConsoleSettling,
  m20ConsoleStatusLine,
  m21ActApply,
  m21ActConsult,
  m21ActInspectPlate,
  m21ActiveCase,
  m21ActOpenManual,
  m21ActPost,
  m21ActSelector,
  m21ActSetAside,
  m21ActSwitchMode,
  m21AllClosed,
  m21State,
  m22ActAcknowledge,
  m22ActAttachTag,
  m22ActInspectRegister,
  m22ActPlace,
  m22ActRemove,
  m22ActSubmit,
  m22ActWithdraw,
  m22State,
  m22Ui,
} from './returnWindows';
import type { InputMode } from './windowKit';

export interface ReturnSurfaceHost {
  now: () => number;
  /** Closes the surface (host resumes). */
  close: () => void;
  /** Neutral feedback line on the surface. */
  feedback: (message: string) => void;
  /** Schedules a callback on the SURFACE clock (the host is paused). */
  later: (ms: number, fn: () => void) => void;
  /** Delivers the fitted relay unit (inventory, or a bench bundle when full). */
  deliverRelayUnit: () => 'inventory' | 'bench_bundle';
}

// ——— M20 — station feed console ————————————————————————————————————————

export function m20FeedConsoleSurfaceModel(
  host: ReturnSurfaceHost,
): WorkSurfaceModel {
  const s = exteriorEpisode().m20;
  const now = host.now();
  const availability = m20ConsoleAvailability();
  const returned = m20Returned(s);
  const complete = m20Complete(s);
  const settling = m20ConsoleSettling(now);
  const next = m20NextIndoorStage(s);
  const elements: SurfaceElement[] = [];

  elements.push({
    id: 'mast_status',
    kind: 'readout',
    label: m20MastStatus(s),
    x: 16,
    y: 76,
    w: 690,
    h: 32,
  });

  M20_OUTDOOR_STAGES.forEach((stage, index) => {
    const done = s.stages_done.includes(stage);

    elements.push({
      id: `outdoor_${stage}`,
      kind: 'tile',
      label: `Outdoor ${index + 1}: ${M20_STAGE_LABELS[stage]}`,
      detail: done ? 'done outside' : 'not done — mast, outside',
      x: 16 + index * 348,
      y: 120,
      w: 340,
      h: 56,
      state: done ? 'done' : 'idle',
    });
  });

  M20_INDOOR_STAGES.forEach((stage: M20IndoorStage, index) => {
    const done = s.indoor_stages_done.includes(stage);
    const isNext = next === stage;

    elements.push({
      id: `indoor_${stage}`,
      kind: 'tile',
      label: `Console ${index + 1}: ${M20_INDOOR_STAGE_LABELS[stage]}`,
      detail: done
        ? 'done'
        : isNext
          ? settling === stage
            ? 'in progress…'
            : returned
              ? 'next'
              : 'pending'
          : 'pending',
      x: 16 + index * 232,
      y: 192,
      w: 222,
      h: 64,
      state: done ? 'done' : isNext && returned ? 'accent' : 'idle',
    });
  });

  elements.push({
    id: 'endpoint',
    kind: 'readout',
    label: complete
      ? 'Restoration complete — feed aligned.'
      : `Endpoint: ${M20_OUTDOOR_STAGES.length} outdoor + ${M20_INDOOR_STAGES.length} console stages · ${s.stages_done.length + s.indoor_stages_done.length} done`,
    x: 16,
    y: 272,
    w: 690,
    h: 32,
  });

  if (!returned && availability.available && !complete) {
    elements.push({
      id: 'resume',
      kind: 'button',
      label: 'Resume the restoration',
      x: 16,
      y: 380,
      w: 240,
      h: 34,
      hotkey: 'r',
      state: 'accent',
      onActivate: (mode: InputMode) => {
        if (m20ConsoleResume(host.now(), mode)) {
          host.feedback('Feed console live — console stages available.');
        }
      },
    });
  }

  if (returned && next !== null && !complete) {
    const busy = settling !== null;

    elements.push({
      id: 'stage_action',
      kind: 'button',
      label: busy
        ? `${M20_INDOOR_STAGE_LABELS[next]}…`
        : M20_INDOOR_STAGE_LABELS[next],
      x: 16,
      y: 380,
      w: 240,
      h: 34,
      hotkey: 'a',
      state: busy ? 'disabled' : 'accent',
      onActivate: busy
        ? undefined
        : (mode: InputMode) => {
            const begun = m20ConsoleBeginStage(host.now());

            if (begun === null) {
              return;
            }

            host.feedback(`${M20_INDOOR_STAGE_LABELS[begun.stage]} — working.`);
            host.later(begun.ms, () => {
              m20ConsoleFinishStage(begun.stage, host.now(), mode);
            });
          },
    });
  }

  elements.push({
    id: 'leave',
    kind: 'button',
    label: complete ? 'Close' : 'Leave console',
    x: 566,
    y: 380,
    w: 140,
    h: 34,
    onActivate: () => host.close(),
  });

  return {
    title: 'STATION FEED CONSOLE — MAST 04',
    subtitle: complete
      ? 'complete'
      : returned
        ? `${s.indoor_stages_done.length}/${M20_INDOOR_STAGES.length} console stages`
        : 'on file',
    status: m20ConsoleStatusLine(),
    elements,
    help: 'Arrows/TAB focus · ENTER/SPACE activate · click also works · R resume · A stage · ESC leave',
  };
}

// ——— M21 — relay bench + drawer manual (two cases) ————————————————————

const SECTION_SHORT: Record<M21Section, string> = {
  s1_identify: 'IDENTIFY',
  s2_post_rule: 'RULE',
  s3_selector_rule: 'SELECTOR',
  s4_code_table: 'TABLE',
};

export function m21RelayBenchSurfaceModel(
  host: ReturnSurfaceHost,
): WorkSurfaceModel {
  const s = m21State();
  const def = m21Def(s);
  const spec = m21Spec(s);
  const unitIndex = m21ActiveCase() === 'o1' ? 1 : 2;
  const closed = s.closed || m21AllClosed();
  const lastApplication = s.applications[s.applications.length - 1] ?? null;
  const elements: SurfaceElement[] = [];
  const capital = (text: string) =>
    text.charAt(0).toUpperCase() + text.slice(1);

  // ——— unit (left) ———
  elements.push({
    id: 'plate',
    kind: 'readout',
    label: s.plate_inspected
      ? `PLATE: ${spec.plate_code}`
      : 'PLATE: not read yet',
    x: 16,
    y: 76,
    w: 320,
    h: 32,
  });
  elements.push({
    id: 'inspect',
    kind: 'button',
    label: 'Inspect plate',
    x: 16,
    y: 114,
    w: 150,
    h: 30,
    hotkey: 'i',
    state: closed ? 'disabled' : 'idle',
    onActivate: closed
      ? undefined
      : (mode) => {
          if (m21ActInspectPlate(host.now(), mode)) {
            host.feedback(`Plate reads ${spec.plate_code}.`);
          }
        },
  });
  elements.push({
    id: 'unit_readout',
    kind: 'readout',
    label: m21UnitReadout(s),
    x: 176,
    y: 114,
    w: 160,
    h: 30,
    small: true,
  });

  def.posts.forEach((post, index) => {
    const on = s.posts[post];

    elements.push({
      id: `post_${post}`,
      kind: 'tile',
      label: `${capital(def.post_name)} ${post}`,
      detail: on ? `■ ${def.post_on}` : `□ ${def.post_off}`,
      x: 16 + (index % 2) * 164,
      y: 152 + Math.floor(index / 2) * 48,
      w: 156,
      h: 42,
      // 'selected', never 'done': a fitted post is a setting, not a
      // correctness mark (review G-F6).
      state: closed ? 'disabled' : on ? 'selected' : 'idle',
      onActivate: closed
        ? undefined
        : (mode) => {
            if (m21ActPost(post, !on, host.now(), mode)) {
              host.feedback(
                on ? `${post}: ${def.post_off}.` : `${post}: ${def.post_on}.`,
              );
            }
          },
    });
  });

  const selectorWidth = Math.floor(320 / def.selector_positions.length) - 4;

  def.selector_positions.forEach((position, index) => {
    const selected = s.selector === position;

    elements.push({
      id: `line_${position}`,
      kind: 'tile',
      label: position,
      detail: '',
      x: 16 + index * (selectorWidth + 4),
      y: 252,
      w: selectorWidth,
      h: 38,
      small: true,
      state: closed ? 'disabled' : selected ? 'selected' : 'idle',
      onActivate:
        closed || selected
          ? undefined
          : (mode) => {
              if (m21ActSelector(position, host.now(), mode)) {
                host.feedback(
                  `${capital(def.selector_name)} set to ${position}.`,
                );
              }
            },
    });
  });

  elements.push({
    id: 'fit_readout',
    kind: 'readout',
    label: m21ApplicationReadout(s),
    x: 16,
    y: 298,
    w: 320,
    h: 32,
    state:
      lastApplication !== null && !lastApplication.correct ? 'flag' : 'idle',
  });
  elements.push({
    id: 'fit',
    kind: 'button',
    label: s.accepted
      ? 'Unit accepted'
      : lastApplication === null
        ? 'Fit the unit'
        : 'Fit the unit again',
    x: 16,
    y: 338,
    w: 160,
    h: 32,
    hotkey: 'f',
    // Available once the plate has been read (the v2 gate; review S-F1).
    state: closed ? 'disabled' : s.plate_inspected ? 'accent' : 'disabled',
    onActivate: closed
      ? undefined
      : (mode) => {
          const line = m21ActApply(host.now(), mode, host.deliverRelayUnit);

          if (line !== null) {
            host.feedback(line);
          }

          if (m21AllClosed()) {
            host.later(1600, () => host.close());
          }
        },
  });
  elements.push({
    id: 'set_aside',
    kind: 'button',
    label: 'Set the unit aside',
    x: 186,
    y: 338,
    w: 150,
    h: 32,
    state: closed ? 'disabled' : 'idle',
    onActivate: closed
      ? undefined
      : (mode) => {
          const line = m21ActSetAside(host.now(), mode);

          if (line !== null) {
            host.feedback(line);

            if (m21AllClosed()) {
              host.later(1600, () => host.close());
            }
          }
        },
  });
  elements.push({
    id: 'leave',
    kind: 'button',
    label: closed ? 'Close' : 'Leave bench',
    x: 16,
    y: 380,
    w: 150,
    h: 30,
    onActivate: () => host.close(),
  });

  // ——— manual (right) ———
  const current = s.current_section;
  const mode = s.manual_mode;

  elements.push({
    id: 'manual_title',
    kind: 'readout',
    label: def.manual_title,
    x: 352,
    y: 76,
    w: 352,
    h: 26,
    small: true,
  });
  elements.push({
    id: 'mode_text',
    kind: 'button',
    label: 'TEXT',
    x: 352,
    y: 108,
    w: 80,
    h: 28,
    state: closed ? 'disabled' : mode === 'text' ? 'selected' : 'idle',
    onActivate:
      closed || mode === 'text'
        ? undefined
        : (input) => {
            m21ActSwitchMode('text', host.now(), input);
          },
  });
  elements.push({
    id: 'mode_diagram',
    kind: 'button',
    label: 'DIAGRAM',
    x: 440,
    y: 108,
    w: 100,
    h: 28,
    state: closed ? 'disabled' : mode === 'diagram' ? 'selected' : 'idle',
    onActivate:
      closed || mode === 'diagram'
        ? undefined
        : (input) => {
            m21ActSwitchMode('diagram', host.now(), input);
          },
  });

  M21_SECTIONS.forEach((section, index) => {
    elements.push({
      id: `section_${section}`,
      kind: 'tile',
      label: `§${index + 1}`,
      detail: SECTION_SHORT[section],
      x: 352 + index * 88,
      y: 144,
      w: 80,
      h: 40,
      small: true,
      state: closed ? 'disabled' : current === section ? 'selected' : 'idle',
      onActivate: closed
        ? undefined
        : (input) => {
            if (!s.manual_opened) {
              m21ActOpenManual(host.now(), input);
            }

            m21ActConsult(section, 'tab', host.now(), input);
          },
    });
  });

  elements.push({
    id: 'manual_body',
    kind: 'text',
    label:
      current === null
        ? 'Choose a section. Every section has a TEXT and a DIAGRAM version with the same content.'
        : `${def.section_titles[current]}\n\n${
            mode === 'text'
              ? def.manual_text[current]
              : def.manual_diagram[current]
          }`,
    x: 352,
    y: 192,
    w: 352,
    h: 190,
    align: 'left',
  });

  if (current !== null && !closed) {
    M21_SECTION_REFERENCES[current].forEach((reference, index) => {
      elements.push({
        id: `ref_${reference}`,
        kind: 'button',
        label: `Open ${def.section_titles[reference]} (referenced)`,
        x: 352,
        y: 388 + index * 34,
        w: 352,
        h: 30,
        small: true,
        onActivate: (input) => {
          m21ActConsult(reference, 'reference', host.now(), input);
        },
      });
    });
  }

  const allClosed = m21AllClosed();

  return {
    title: `RELAY BENCH — ${def.unit_name.toUpperCase()} (UNIT ${unitIndex} OF 2)`,
    subtitle: allClosed
      ? 'both units off the bench'
      : closed
        ? s.accepted
          ? 'accepted'
          : 'set aside'
        : `manual ${mode}`,
    status: allClosed
      ? 'Both units are off the bench.'
      : lastApplication !== null && !lastApplication.correct
        ? // Truthful, and no strategy is named (review S-F6 / G-F3).
          `The unit fails on the bench: ${lastApplication.faults
            .map((fault) => def.fault_labels[fault])
            .join(' · ')}. It stays on the bench.`
        : `${capital(def.unit_name)} on the bench (unit ${unitIndex} of 2). Read the plate, configure the ${def.post_name}s and the ${def.selector_name}, then fit the unit. The drawer manual is on the right.`,
    elements,
    help: 'Arrows/TAB focus · ENTER/SPACE activate · click also works · I plate · F fit · ESC leave',
  };
}

// ——— M22 — shift report desk ———————————————————————————————————————————

export function m22ReportDeskSurfaceModel(
  host: ReturnSurfaceHost,
): WorkSurfaceModel {
  const s = m22State();
  const ui = m22Ui();
  const phase = s.phase;
  const editable =
    phase === 'assemble' || (phase === 'returned' && m22Acknowledged(s));
  const elements: SurfaceElement[] = [];
  const placedIds = s.slots.filter((slot): slot is string => slot !== null);

  // ——— tray (left) ———
  elements.push({
    id: 'tray_title',
    kind: 'readout',
    label: 'REPORT LINES — shift systems',
    x: 16,
    y: 76,
    w: 320,
    h: 24,
    small: true,
  });

  m22TrayOrder(s.form).forEach((line, index) => {
    const placed = placedIds.includes(line.id);
    const selected = ui.selected?.kind === 'line' && ui.selected.id === line.id;

    elements.push({
      id: `line_${line.id}`,
      kind: 'tile',
      label: line.label,
      x: 16,
      y: 104 + index * 36,
      w: 320,
      h: 32,
      small: true,
      state: placed || !editable ? 'disabled' : selected ? 'selected' : 'idle',
      onActivate:
        placed || !editable
          ? undefined
          : () => {
              ui.selected = selected ? null : { kind: 'line', id: line.id };
            },
    });
  });

  // ——— tags (left, after the setback) ———
  if (phase !== 'assemble') {
    M22_TAGS.forEach((tag, index) => {
      const selected = ui.selected?.kind === 'tag' && ui.selected.id === tag;

      elements.push({
        id: `tag_${tag}`,
        kind: 'tile',
        label: tag,
        x: 16 + (index % 3) * 108,
        y: 324 + Math.floor(index / 3) * 34,
        w: 104,
        h: 30,
        small: true,
        state: !editable ? 'disabled' : selected ? 'selected' : 'idle',
        onActivate: !editable
          ? undefined
          : () => {
              ui.selected = selected ? null : { kind: 'tag', id: tag };
            },
      });
    });
  }

  // ——— report slots (right) ———
  for (let slot = 0; slot < M22_SLOTS; slot += 1) {
    const lineId = s.slots[slot];
    const line = lineId === null ? undefined : m22Line(lineId);
    const tag = lineId === null ? null : s.tags[lineId];

    elements.push({
      id: `slot_${slot}`,
      kind: 'tile',
      label: `${slot + 1}. ${line?.label ?? '— empty —'}`,
      detail:
        lineId === null
          ? ''
          : phase === 'assemble'
            ? ''
            : tag === null
              ? 'no tag'
              : `tag ${tag}`,
      x: 352,
      y: 76 + slot * 46,
      w: 352,
      h: 42,
      small: true,
      state: !editable
        ? 'disabled'
        : lineId !== null && phase !== 'assemble' && tag === line?.tag
          ? 'done'
          : 'idle',
      onActivate: !editable
        ? undefined
        : (mode) => {
            const selected = ui.selected;

            if (selected?.kind === 'line' && lineId === null) {
              if (m22ActPlace(slot, selected.id, host.now(), mode)) {
                ui.selected = null;
              }

              return;
            }

            if (selected?.kind === 'tag' && lineId !== null) {
              if (m22ActAttachTag(lineId, selected.id, host.now(), mode)) {
                ui.selected = null;
                host.feedback(
                  `Tag ${selected.id} attached to line ${slot + 1}.`,
                );
              }

              return;
            }

            if (selected === null && lineId !== null) {
              if (m22ActRemove(slot, host.now(), mode)) {
                host.feedback(`Line ${slot + 1} returned to the tray.`);
              }

              return;
            }

            host.feedback(
              selected === null
                ? 'Select a line (or a tag) first, then a slot.'
                : selected.kind === 'line'
                  ? 'That slot is taken — choose an empty slot.'
                  : 'Tags attach to a placed line — choose a filled slot.',
            );
          },
    });
  }

  // ——— note / register (right, after the setback) ———
  if (phase !== 'assemble') {
    elements.push({
      id: 'register_toggle',
      kind: 'button',
      label: ui.registerOpen ? 'Show the returned note' : 'Open the register',
      x: 352,
      y: 268,
      w: 200,
      h: 28,
      small: true,
      onActivate: (mode) => {
        ui.registerOpen = !ui.registerOpen;

        if (ui.registerOpen) {
          m22ActInspectRegister(host.now(), mode);
        }
      },
    });
    elements.push({
      id: ui.registerOpen ? 'register' : 'returned_note',
      kind: 'text',
      label: ui.registerOpen
        ? `WORK-ORDER REGISTER\n${M22_LINES.map((line) => `${line.tag} · ${line.label}`).join('\n')}`
        : phase === 'accepted'
          ? 'Report accepted by the receiving desk.'
          : M22_CRITERION_TEXT,
      x: 352,
      y: 300,
      w: 352,
      h: 118,
      align: 'left',
    });
  } else {
    elements.push({
      id: 'assemble_note',
      kind: 'text',
      label: `Assemble the handover report: place at least ${M22_MIN_LINES} of the shift's lines into the numbered slots (select a line, then a slot), then submit.`,
      x: 352,
      y: 268,
      w: 352,
      h: 80,
      align: 'left',
    });
  }

  // ——— buttons ———
  const canSubmit =
    phase === 'assemble' || (phase === 'returned' && m22Acknowledged(s));

  if (phase !== 'accepted' && phase !== 'closed') {
    elements.push({
      id: 'submit',
      kind: 'button',
      label: phase === 'assemble' ? 'Submit report' : 'Resubmit report',
      x: 16,
      y: 400,
      w: 150,
      h: 32,
      hotkey: 's',
      state: canSubmit ? 'accent' : 'disabled',
      onActivate: canSubmit
        ? (mode) => {
            const outcome = m22ActSubmit(host.now(), mode);

            host.feedback(
              outcome === 'setback'
                ? 'Report returned by the receiving desk — read the note.'
                : m22OutcomeText(outcome, m22State()),
            );
          }
        : undefined,
    });
  }

  if (phase === 'returned' && !m22Acknowledged(s)) {
    elements.push({
      id: 'acknowledge',
      kind: 'button',
      label: 'Acknowledge the note',
      x: 176,
      y: 400,
      w: 160,
      h: 32,
      hotkey: 'k',
      state: 'accent',
      onActivate: (mode) => {
        if (m22ActAcknowledge(host.now(), mode)) {
          host.feedback('Note acknowledged — the report can be edited.');
        }
      },
    });
  }

  if (phase !== 'accepted' && phase !== 'closed') {
    elements.push({
      id: 'withdraw',
      kind: 'button',
      label: 'Withdraw the report',
      x: 16,
      y: 440,
      w: 150,
      h: 28,
      small: true,
      onActivate: (mode) => {
        if (m22ActWithdraw(host.now(), mode)) {
          host.feedback('Report withdrawn as it stands.');
          host.later(1600, () => host.close());
        }
      },
    });
  }

  elements.push({
    id: 'leave',
    kind: 'button',
    label: phase === 'accepted' || phase === 'closed' ? 'Close' : 'Leave desk',
    x: 176,
    y: 440,
    w: 160,
    h: 28,
    small: true,
    onActivate: () => host.close(),
  });

  const progress = m22Progress(s);

  return {
    title: 'SHIFT REPORT DESK — HANDOVER REPORT',
    subtitle:
      phase === 'assemble'
        ? `${placedIds.length}/${M22_SLOTS} lines`
        : phase === 'returned'
          ? `returned · ${progress.tagged}/${progress.placed} lines tagged`
          : phase === 'accepted'
            ? 'accepted'
            : 'closed',
    status:
      phase === 'assemble'
        ? 'Return-shift handover report. Select a line, then a numbered slot to place it; select a placed line to return it.'
        : phase === 'returned'
          ? m22Acknowledged(s)
            ? 'Returned by the receiving desk — see the note. Select a tag, then a line, to attach it.'
            : 'Returned by the receiving desk — read the note and acknowledge it to continue.'
          : phase === 'accepted'
            ? 'Report accepted and logged for the shift.'
            : 'Report closed.',
    elements,
    help: 'Arrows/TAB focus · ENTER/SPACE activate · click also works · S submit · K acknowledge · ESC leave',
  };
}
