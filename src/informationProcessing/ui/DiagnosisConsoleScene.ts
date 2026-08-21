/**
 * Fault Diagnosis Console overlay (M18 — Information Processing
 * foundation).
 *
 * A standardised reference lattice, a fault brief, four evidence panels,
 * three reversible diagnostic tests, the full interpretation rule set,
 * four hypotheses with reversible SELECT / RULE OUT toggles, and one
 * explicit SUBMIT DIAGNOSIS. Mouse: click panels, RUN buttons, toggles.
 * Keyboard: arrows move a focus ring through panels → tests →
 * hypotheses → submit; ENTER activates; X rules the focused hypothesis
 * out; 1–4 select a hypothesis; R opens the rules. Both paths call
 * exactly `m18FaultAct` / `m18FaultSubmit`.
 *
 * The console reads NOTHING from the lattice bench: every reading is a
 * constant of the M18 form. Modal pause-and-launch; ESC / I leave (the
 * window stays open until submitted or explicitly stopped).
 */

import Phaser from 'phaser';

import { key } from '../../constants';
import {
  sfxPromptOpen,
  sfxUiMove,
  sfxUiSelect,
  sfxUnavailable,
} from '../../gameplay/audio';
import { guardKeyHandler } from '../../inventory/ui/keyGuard';
import { UiButton } from '../../inventory/ui/UiButton';
import type { DiagnosisAction, DiagnosisView } from '../m18FaultDiagnosis';
import {
  m18FaultAct,
  m18FaultFail,
  m18FaultHelp,
  m18FaultLeave,
  m18FaultOpen,
  m18FaultStop,
  m18FaultSubmit,
  m18FaultView,
} from '../m18FaultDiagnosis';
import type { InputMode } from '../model';
import { refreshIpProbe } from '../probe';
import { IP_COLORS, IP_DEPTH, IP_FONT, IP_PANEL, IP_TEXT } from './ipTheme';
import type { IpOverlayLaunchData } from './openIpOverlay';

interface ProbeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiagnosisProbe {
  open: boolean;
  form: string | null;
  closed: boolean;
  panels: (ProbeRect & { id: string; viewed: boolean })[];
  tests: (ProbeRect & { id: string; runs: number; run_button: ProbeRect })[];
  hypotheses: (ProbeRect & {
    id: string;
    selected: boolean;
    rejected: boolean;
    select: ProbeRect;
    reject: ProbeRect;
  })[];
  buttons: (ProbeRect & { id: string; label: string; enabled: boolean })[];
  detail_title: string | null;
  detail_lines: string[];
  feedback: string[];
  focus: string | null;
  submit_enabled: boolean;
  help_open: boolean;
  rules_open: boolean;
  confirm_open: boolean;
}

declare global {
  interface Window {
    /** DEV-only, read-only diagnosis console UI probe. */
    __ipDiagnosisProbe?: DiagnosisProbe | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__ipDiagnosisProbe = null;
}

const KIND_KEY = 'ipDiagKind';

interface Target {
  kind: 'panel' | 'test' | 'hypothesis';
  id: string;
}

const L = {
  titleY: 56,
  instrY: 72,
  col1: { x: 56, w: 240 },
  col2: { x: 306, w: 234 },
  col3: { x: 550, w: 194 },
  bandY: 118,
  latticeY: 136,
  panelsTitleY: 262,
  panelsY: 278,
  panelRowH: 24,
  testsTitleY: 118,
  testsY: 136,
  testRowH: 26,
  detailTitleY: 228,
  detailY: 244,
  hypTitleY: 118,
  hypY: 136,
  hypRowH: 70,
  consoleY: 466,
  buttonsY: 506,
  helpLineY: 544,
} as const;

/** Reference lattice mini-board (constant of M18; independent of M13). */
const REFERENCE_PIECES: Record<string, { texture: string; angle: number }> = {
  A2: { texture: 'proc-pipe-elbow', angle: 270 },
  A1: { texture: 'proc-pipe-elbow', angle: 90 },
  B1: { texture: 'proc-pipe-valve', angle: 0 },
  C1: { texture: 'proc-pipe-elbow', angle: 180 },
  C2: { texture: 'proc-pipe-elbow', angle: 0 },
};

type FocusEntry = {
  kind: 'panel' | 'test' | 'hypothesis' | 'submit';
  id: string;
};

export class DiagnosisConsoleScene extends Phaser.Scene {
  private resumeKey: string = key.scene.stationConcourse;
  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private buttons: UiButton[] = [];
  private rowButtons: UiButton[] = [];
  private focusIndex = 0;
  private focusList: FocusEntry[] = [];
  private helpOpen = false;
  private helpObjects: Phaser.GameObjects.GameObject[] = [];
  private rulesOpen = false;
  private rulesObjects: Phaser.GameObjects.GameObject[] = [];
  private confirmOpen = false;
  private confirmObjects: Phaser.GameObjects.GameObject[] = [];
  private lastView: DiagnosisView | null = null;
  private rowRects = new Map<string, ProbeRect>();
  private toggleRects = new Map<string, ProbeRect>();

  constructor() {
    super(key.scene.ipDiagnosisConsole);
  }

  init(data?: IpOverlayLaunchData) {
    this.resumeKey = data?.resumeKey ?? key.scene.stationConcourse;
  }

  create() {
    this.dynamic = [];
    this.buttons = [];
    this.rowButtons = [];
    this.focusIndex = 0;
    this.focusList = [];
    this.helpOpen = false;
    this.helpObjects = [];
    this.rulesOpen = false;
    this.rulesObjects = [];
    this.confirmOpen = false;
    this.confirmObjects = [];
    this.lastView = null;
    this.rowRects = new Map();
    this.toggleRects = new Map();

    // Render above the host no matter where this class sorts in the
    // alphabetical scene registry (src/index.ts spreads Object.values of
    // the barrel, and module namespaces enumerate exports sorted by name;
    // a scene that sorts before its host would otherwise render beneath it).
    this.scene.bringToTop();

    this.input.mouse?.disableContextMenu();
    this.input.keyboard?.addCapture([
      'SPACE',
      'UP',
      'DOWN',
      'LEFT',
      'RIGHT',
      'TAB',
      'ENTER',
    ]);

    this.add
      .rectangle(0, 0, 800, 600, IP_COLORS.dim, IP_COLORS.dimAlpha)
      .setOrigin(0)
      .setDepth(IP_DEPTH.dim)
      .setInteractive();
    this.add
      .rectangle(
        IP_PANEL.x,
        IP_PANEL.y,
        IP_PANEL.width,
        IP_PANEL.height,
        IP_COLORS.panel,
        1,
      )
      .setOrigin(0)
      .setStrokeStyle(1, IP_COLORS.panelStroke)
      .setDepth(IP_DEPTH.panel);
    this.add
      .text(
        IP_PANEL.x + 16,
        L.titleY,
        'FAULT DIAGNOSIS CONSOLE — REFERENCE LATTICE',
        {
          color: IP_TEXT.text,
          font: IP_FONT.title,
        },
      )
      .setOrigin(0, 0.5)
      .setDepth(IP_DEPTH.content);

    // Static surfaces.
    this.section(L.col1.x, L.bandY, L.col1.w, 136); // reference lattice
    this.section(L.col1.x, L.panelsTitleY - 6, L.col1.w, 130); // panels
    this.section(L.col2.x, L.bandY, L.col2.w, 98); // tests
    this.section(L.col2.x, L.detailTitleY - 6, L.col2.w, 216); // readout
    this.section(L.col3.x, L.bandY, L.col3.w, 326); // hypotheses
    this.section(L.col1.x, L.consoleY - 6, 688, 36); // console

    this.buttons.push(
      new UiButton({
        scene: this,
        id: 'close',
        x: IP_PANEL.x + IP_PANEL.width - 40,
        y: IP_PANEL.y + 4,
        width: 32,
        label: 'X',
        depth: IP_DEPTH.panel + 1,
        onActivate: () => this.leave(),
      }),
      new UiButton({
        scene: this,
        id: 'help',
        x: 56,
        y: L.buttonsY,
        width: 64,
        label: 'HELP',
        depth: IP_DEPTH.content,
        onActivate: () => this.openHelp('pointer'),
      }),
      new UiButton({
        scene: this,
        id: 'rules',
        x: 128,
        y: L.buttonsY,
        width: 90,
        label: 'RULES (R)',
        depth: IP_DEPTH.content,
        onActivate: () => this.openRules('pointer'),
      }),
      new UiButton({
        scene: this,
        id: 'stop',
        x: 226,
        y: L.buttonsY,
        width: 94,
        label: 'STOP TASK',
        kind: 'caution',
        depth: IP_DEPTH.content,
        onActivate: () => this.openStopConfirm(),
      }),
      new UiButton({
        scene: this,
        id: 'submit',
        x: 584,
        y: L.buttonsY,
        width: 160,
        label: 'SUBMIT DIAGNOSIS',
        kind: 'accent',
        depth: IP_DEPTH.content,
        onActivate: () => this.submit('pointer'),
      }),
    );

    this.add
      .text(
        400,
        L.helpLineY,
        'Click a panel to read it • RUN a test (repeatable) • RULES • SELECT / RULE OUT hypotheses • arrows + ENTER • X rules out • 1–4 select • ESC leaves (work stays)',
        {
          color: IP_TEXT.dim,
          font: IP_FONT.small,
          wordWrap: { width: 700 },
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.content);

    this.wirePointer();
    this.wireKeyboard();

    try {
      m18FaultOpen(Date.now());
    } catch (error) {
      m18FaultFail(Date.now(), `open: ${String(error)}`);
    }

    sfxPromptOpen();
    this.refresh();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      m18FaultLeave(Date.now());

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__ipDiagnosisProbe = { ...this.emptyProbe(), open: false };
      }

      refreshIpProbe();
    });
  }

  /* ---------------------------------------------------------------- *
   * Rendering
   * ---------------------------------------------------------------- */

  private section(x: number, y: number, w: number, h: number) {
    this.add
      .rectangle(x, y, w, h, IP_COLORS.section, 1)
      .setOrigin(0)
      .setStrokeStyle(1, IP_COLORS.panelStroke)
      .setDepth(IP_DEPTH.panel + 1);
  }

  private text(
    x: number,
    y: number,
    value: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    depth: number = IP_DEPTH.content,
  ) {
    const object = this.add.text(x, y, value, style).setDepth(depth);

    this.dynamic.push(object);

    return object;
  }

  private refresh() {
    for (const object of this.dynamic) {
      object.destroy();
    }

    for (const button of this.rowButtons) {
      button.destroy();
    }

    this.dynamic = [];
    this.rowButtons = [];
    this.rowRects.clear();
    this.toggleRects.clear();

    const view = m18FaultView();

    this.lastView = view;
    this.focusList = [
      ...view.panels.map((panel) => ({ kind: 'panel' as const, id: panel.id })),
      ...view.tests.map((test) => ({ kind: 'test' as const, id: test.id })),
      ...view.hypotheses.map((hypothesis) => ({
        kind: 'hypothesis' as const,
        id: hypothesis.id,
      })),
      { kind: 'submit' as const, id: 'submit' },
    ];
    this.focusIndex = Phaser.Math.Clamp(
      this.focusIndex,
      0,
      this.focusList.length - 1,
    );

    const closed = view.closed;
    const focused = this.focusList[this.focusIndex];

    this.text(
      IP_PANEL.x + IP_PANEL.width - 56,
      L.titleY,
      closed ? (view.status === 'completed' ? 'LOGGED' : 'CLOSED') : 'OPEN',
      { color: closed ? IP_TEXT.dim : IP_TEXT.accent, font: IP_FONT.section },
    ).setOrigin(1, 0.5);

    this.text(
      56,
      L.instrY,
      `${view.brief.join(' ')} Open panels, run tests (all reversible), consult RULES, rule hypotheses out, pick one working diagnosis, then SUBMIT DIAGNOSIS.`,
      {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
        lineSpacing: 2,
        wordWrap: { width: 688 },
      },
    );

    // — Reference lattice (mini-board) + caption.
    this.text(L.col1.x + 6, L.bandY + 4, 'REFERENCE LATTICE — TEST RIG', {
      color: IP_TEXT.dim,
      font: IP_FONT.small,
    });

    const mini = 30;
    const originX = L.col1.x + 14;
    const originY = L.latticeY + 8;

    for (const slot of ['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3']) {
      const col = slot.charCodeAt(0) - 65;
      const row = Number(slot[1]) - 1;
      const x = originX + col * (mini + 3);
      const y = originY + row * (mini + 3);
      const rect = this.add
        .rectangle(
          x,
          y,
          mini,
          mini,
          slot === 'B2' ? 0x1a1416 : IP_COLORS.slot,
          1,
        )
        .setOrigin(0)
        .setStrokeStyle(1, slot === 'B2' ? 0x5a3a3a : IP_COLORS.slotStroke)
        .setDepth(IP_DEPTH.content);

      this.dynamic.push(rect);

      const piece = REFERENCE_PIECES[slot];

      if (piece !== undefined && this.textures.exists(piece.texture)) {
        const image = this.add
          .image(x + mini / 2, y + mini / 2, piece.texture)
          .setScale(0.85)
          .setAngle(piece.angle)
          .setDepth(IP_DEPTH.chip);

        this.dynamic.push(image);
      }
    }

    this.text(originX - 10, originY + mini + 18, '▶', {
      color: IP_TEXT.accent,
      font: 'bold 10px monospace',
    }).setOrigin(1, 0.5);
    this.text(originX + 3 * (mini + 3) + 2, originY + mini + 18, '▶', {
      color: IP_TEXT.accent,
      font: 'bold 10px monospace',
    }).setOrigin(0, 0.5);
    this.text(
      originX + 3 * (mini + 3) + 14,
      L.latticeY + 4,
      view.reference.slice(1).join('\n'),
      {
        color: IP_TEXT.text,
        font: '9px monospace',
        lineSpacing: 2,
        wordWrap: { width: 118 },
      },
    );

    // — Evidence panels.
    this.text(
      L.col1.x + 6,
      L.panelsTitleY - 2,
      'EVIDENCE PANELS (click to read)',
      {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
      },
    );
    view.panels.forEach((panel, index) => {
      const y = L.panelsY + index * L.panelRowH;
      const isFocus = focused.kind === 'panel' && focused.id === panel.id;
      const rect = this.add
        .rectangle(
          L.col1.x + 6,
          y,
          L.col1.w - 12,
          L.panelRowH - 4,
          IP_COLORS.slot,
          1,
        )
        .setOrigin(0)
        .setStrokeStyle(1, isFocus ? IP_COLORS.accent : IP_COLORS.slotStroke)
        .setDepth(IP_DEPTH.content);

      rect.setData(KIND_KEY, { kind: 'panel', id: panel.id } satisfies Target);

      if (!closed) {
        rect.setInteractive({ useHandCursor: true });
      }

      this.dynamic.push(rect);
      this.rowRects.set(panel.id, {
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
      });
      this.text(
        L.col1.x + 12,
        y + 4,
        panel.title,
        {
          color: IP_TEXT.text,
          font: IP_FONT.small,
        },
        IP_DEPTH.content + 1,
      );

      if (panel.viewed) {
        this.text(
          L.col1.x + L.col1.w - 12,
          y + 4,
          'read ✓',
          {
            color: IP_TEXT.dim,
            font: '9px monospace',
          },
          IP_DEPTH.content + 1,
        ).setOrigin(1, 0);
      }
    });

    // — Tests.
    this.text(
      L.col2.x + 6,
      L.testsTitleY + 4,
      'DIAGNOSTIC TESTS (reversible)',
      {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
      },
    );
    view.tests.forEach((test, index) => {
      const y = L.testsY + 2 + index * L.testRowH;
      const isFocus = focused.kind === 'test' && focused.id === test.id;
      const rect = this.add
        .rectangle(
          L.col2.x + 6,
          y,
          L.col2.w - 12,
          L.testRowH - 4,
          IP_COLORS.slot,
          1,
        )
        .setOrigin(0)
        .setStrokeStyle(1, isFocus ? IP_COLORS.accent : IP_COLORS.slotStroke)
        .setDepth(IP_DEPTH.content);

      rect.setData(KIND_KEY, { kind: 'test', id: test.id } satisfies Target);

      if (!closed) {
        rect.setInteractive({ useHandCursor: true });
      }

      this.dynamic.push(rect);
      this.rowRects.set(test.id, {
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
      });
      this.text(
        L.col2.x + 12,
        y + 5,
        `${test.label}${test.runs > 0 ? `  ×${test.runs}` : ''}`,
        {
          color: IP_TEXT.text,
          font: IP_FONT.small,
        },
        IP_DEPTH.content + 1,
      );

      const run = new UiButton({
        scene: this,
        id: `run_${test.id}`,
        x: L.col2.x + L.col2.w - 56,
        y: y - 1,
        width: 44,
        label: 'RUN',
        kind: 'accent',
        depth: IP_DEPTH.chip,
        onActivate: () =>
          this.act({ kind: 'run_test', id: test.id }, 'pointer'),
      });

      run.setEnabled(!closed);
      this.rowButtons.push(run);
      this.toggleRects.set(`run_${test.id}`, {
        x: run.bounds().x,
        y: run.bounds().y,
        w: run.bounds().width,
        h: run.bounds().height,
      });
    });

    // — Readout / detail.
    this.text(L.col2.x + 6, L.detailTitleY - 2, 'READOUT', {
      color: IP_TEXT.dim,
      font: IP_FONT.small,
    });

    const detail = view.detail;

    this.text(
      L.col2.x + 6,
      L.detailY + 2,
      detail === null
        ? 'Open a panel, run a test or press RULES to see its content here.'
        : `${detail.title}\n${detail.lines.join('\n')}`,
      {
        color: detail === null ? IP_TEXT.faint : IP_TEXT.accent,
        font: '10px monospace',
        lineSpacing: 3,
        wordWrap: { width: L.col2.w - 12 },
      },
    );

    // — Hypotheses.
    this.text(L.col3.x + 6, L.hypTitleY + 4, 'HYPOTHESES — pick one', {
      color: IP_TEXT.dim,
      font: IP_FONT.small,
    });
    view.hypotheses.forEach((hypothesis, index) => {
      const y = L.hypY + 2 + index * L.hypRowH;
      const isFocus =
        focused.kind === 'hypothesis' && focused.id === hypothesis.id;
      const rect = this.add
        .rectangle(
          L.col3.x + 6,
          y,
          L.col3.w - 12,
          L.hypRowH - 6,
          hypothesis.selected
            ? 0x1c3b3a
            : hypothesis.rejected
              ? 0x1a1f24
              : IP_COLORS.slot,
          1,
        )
        .setOrigin(0)
        .setStrokeStyle(
          isFocus ? 2 : 1,
          hypothesis.selected
            ? IP_COLORS.accent
            : isFocus
              ? IP_COLORS.accent
              : IP_COLORS.slotStroke,
        )
        .setDepth(IP_DEPTH.content);

      rect.setData(KIND_KEY, {
        kind: 'hypothesis',
        id: hypothesis.id,
      } satisfies Target);

      if (!closed) {
        rect.setInteractive({ useHandCursor: true });
      }

      this.dynamic.push(rect);
      this.rowRects.set(hypothesis.id, {
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
      });
      this.text(
        L.col3.x + 12,
        y + 4,
        `H${index + 1}  ${hypothesis.label}`,
        {
          color: hypothesis.rejected ? IP_TEXT.faint : IP_TEXT.text,
          font: '10px monospace',
          lineSpacing: 1,
          wordWrap: { width: L.col3.w - 24 },
        },
        IP_DEPTH.content + 1,
      );

      const select = new UiButton({
        scene: this,
        id: `select_${hypothesis.id}`,
        x: L.col3.x + 12,
        y: y + L.hypRowH - 32,
        width: 70,
        label: hypothesis.selected ? 'SELECTED' : 'SELECT',
        kind: hypothesis.selected ? 'accent' : 'plain',
        depth: IP_DEPTH.chip,
        onActivate: () =>
          this.act({ kind: 'select', id: hypothesis.id }, 'pointer'),
      });
      const reject = new UiButton({
        scene: this,
        id: `reject_${hypothesis.id}`,
        x: L.col3.x + 90,
        y: y + L.hypRowH - 32,
        width: 86,
        label: hypothesis.rejected ? 'RULED OUT' : 'RULE OUT',
        kind: hypothesis.rejected ? 'caution' : 'plain',
        depth: IP_DEPTH.chip,
        onActivate: () =>
          this.act({ kind: 'reject', id: hypothesis.id }, 'pointer'),
      });

      select.setEnabled(!closed);
      reject.setEnabled(!closed);
      this.rowButtons.push(select, reject);
      this.toggleRects.set(`select_${hypothesis.id}`, {
        x: select.bounds().x,
        y: select.bounds().y,
        w: select.bounds().width,
        h: select.bounds().height,
      });
      this.toggleRects.set(`reject_${hypothesis.id}`, {
        x: reject.bounds().x,
        y: reject.bounds().y,
        w: reject.bounds().width,
        h: reject.bounds().height,
      });
    });

    // — Console + buttons.
    this.text(
      L.col1.x + 6,
      L.consoleY,
      view.feedback.length > 0
        ? view.feedback.join(' ')
        : view.hypotheses.some((hypothesis) => hypothesis.selected)
          ? 'Working diagnosis selected. Review the evidence, then SUBMIT DIAGNOSIS.'
          : 'No working diagnosis selected yet.',
      { color: IP_TEXT.caution, font: IP_FONT.small, wordWrap: { width: 676 } },
    );

    for (const button of this.buttons) {
      if (button.id === 'submit') {
        const isFocus = focused.kind === 'submit';

        button.setEnabled(view.submitEnabled && !closed);
        button.setLabel(isFocus ? '▸ SUBMIT DIAGNOSIS' : 'SUBMIT DIAGNOSIS');
      } else if (button.id === 'rules' || button.id === 'stop') {
        button.setEnabled(!closed);
      }
    }

    this.writeProbe(view);
  }

  private emptyProbe(): DiagnosisProbe {
    return {
      open: false,
      form: null,
      closed: false,
      panels: [],
      tests: [],
      hypotheses: [],
      buttons: [],
      detail_title: null,
      detail_lines: [],
      feedback: [],
      focus: null,
      submit_enabled: false,
      help_open: false,
      rules_open: false,
      confirm_open: false,
    };
  }

  private writeProbe(view: DiagnosisView) {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const focused = this.focusList[this.focusIndex];
    const probe: DiagnosisProbe = {
      ...this.emptyProbe(),
      open: true,
      form: view.form,
      closed: view.closed,
      detail_title: view.detail?.title ?? null,
      detail_lines: view.detail?.lines ?? [],
      feedback: [...view.feedback],
      focus: focused === undefined ? null : `${focused.kind}:${focused.id}`,
      submit_enabled: view.submitEnabled && !view.closed,
      help_open: this.helpOpen,
      rules_open: this.rulesOpen,
      confirm_open: this.confirmOpen,
    };

    for (const panel of view.panels) {
      const rect = this.rowRects.get(panel.id);

      if (rect !== undefined) {
        probe.panels.push({ ...rect, id: panel.id, viewed: panel.viewed });
      }
    }

    for (const test of view.tests) {
      const rect = this.rowRects.get(test.id);
      const run = this.toggleRects.get(`run_${test.id}`);

      if (rect !== undefined && run !== undefined) {
        probe.tests.push({
          ...rect,
          id: test.id,
          runs: test.runs,
          run_button: run,
        });
      }
    }

    for (const hypothesis of view.hypotheses) {
      const rect = this.rowRects.get(hypothesis.id);
      const select = this.toggleRects.get(`select_${hypothesis.id}`);
      const reject = this.toggleRects.get(`reject_${hypothesis.id}`);

      if (rect !== undefined && select !== undefined && reject !== undefined) {
        probe.hypotheses.push({
          ...rect,
          id: hypothesis.id,
          selected: hypothesis.selected,
          rejected: hypothesis.rejected,
          select,
          reject,
        });
      }
    }

    for (const button of this.buttons) {
      const bounds = button.bounds();

      probe.buttons.push({
        id: button.id,
        label: button.label(),
        x: bounds.x,
        y: bounds.y,
        w: bounds.width,
        h: bounds.height,
        enabled: button.isEnabled(),
      });
    }

    window.__ipDiagnosisProbe = probe;
    refreshIpProbe();
  }

  /* ---------------------------------------------------------------- *
   * Actions
   * ---------------------------------------------------------------- */

  private act(action: DiagnosisAction, mode: InputMode) {
    if (
      this.helpOpen ||
      this.rulesOpen ||
      this.confirmOpen ||
      this.lastView?.closed
    ) {
      return;
    }

    try {
      const result = m18FaultAct(action, mode, Date.now());

      if (result.ok) {
        sfxUiSelect();
      } else {
        sfxUnavailable();
      }
    } catch (error) {
      m18FaultFail(Date.now(), String(error));
    }

    this.refresh();
  }

  private submit(mode: InputMode) {
    if (this.helpOpen || this.confirmOpen || this.lastView?.closed) {
      return;
    }

    try {
      const outcome = m18FaultSubmit(mode, Date.now());

      if (outcome.ok) {
        sfxUiSelect();
      } else {
        sfxUnavailable();
      }
    } catch (error) {
      m18FaultFail(Date.now(), String(error));
    }

    this.refresh();
  }

  private activateFocused(mode: InputMode) {
    const entry = this.focusList[this.focusIndex];

    if (entry === undefined) {
      return;
    }

    switch (entry.kind) {
      case 'panel':
        this.act({ kind: 'view_panel', id: entry.id }, mode);
        break;
      case 'test':
        this.act({ kind: 'run_test', id: entry.id }, mode);
        break;
      case 'hypothesis':
        this.act({ kind: 'select', id: entry.id }, mode);
        break;
      case 'submit':
        this.submit(mode);
        break;
      default:
        break;
    }
  }

  /* ---------------------------------------------------------------- *
   * Help + stop confirm
   * ---------------------------------------------------------------- */

  /** The reopenable in-task reference: every interpretation rule. */
  private openRules(mode: InputMode) {
    if (this.helpOpen || this.rulesOpen || this.confirmOpen) {
      return;
    }

    if (this.lastView?.closed) {
      return;
    }

    // Record the consult through the module (raw count), then show.
    try {
      m18FaultAct({ kind: 'view_rules' }, mode, Date.now());
    } catch (error) {
      m18FaultFail(Date.now(), String(error));
    }

    const lines = this.lastView?.rules ?? [];

    this.rulesOpen = true;

    const backdrop = this.add
      .rectangle(400, 300, 600, 300, IP_COLORS.panel, 1)
      .setStrokeStyle(1, IP_COLORS.accent)
      .setDepth(IP_DEPTH.confirm)
      .setInteractive();
    const title = this.add
      .text(400, 168, 'INTERPRETATION RULES — reference', {
        color: IP_TEXT.accent,
        font: IP_FONT.section,
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);
    const body = this.add
      .text(116, 190, lines.join('\n'), {
        color: IP_TEXT.text,
        font: IP_FONT.small,
        lineSpacing: 4,
        wordWrap: { width: 568 },
      })
      .setDepth(IP_DEPTH.confirm + 1);
    const footer = this.add
      .text(400, 432, 'ENTER / ESC / click — close rules', {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);

    backdrop.on('pointerup', () => this.closeRules());
    this.rulesObjects = [backdrop, title, body, footer];
    this.refresh();
  }

  private closeRules() {
    if (!this.rulesOpen) {
      return;
    }

    this.rulesOpen = false;

    for (const object of this.rulesObjects) {
      object.destroy();
    }

    this.rulesObjects = [];
    this.refresh();
  }

  private openHelp(mode: InputMode) {
    if (this.helpOpen || this.rulesOpen || this.confirmOpen) {
      return;
    }

    const lines = m18FaultHelp(mode, Date.now());

    this.helpOpen = true;

    const backdrop = this.add
      .rectangle(400, 300, 560, 250, IP_COLORS.panel, 1)
      .setStrokeStyle(1, IP_COLORS.accent)
      .setDepth(IP_DEPTH.confirm)
      .setInteractive();
    const title = this.add
      .text(400, 192, 'HELP — DIAGNOSIS CONSOLE', {
        color: IP_TEXT.accent,
        font: IP_FONT.section,
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);
    const body = this.add
      .text(136, 214, lines.join('\n'), {
        color: IP_TEXT.text,
        font: IP_FONT.small,
        lineSpacing: 3,
        wordWrap: { width: 528 },
      })
      .setDepth(IP_DEPTH.confirm + 1);
    const footer = this.add
      .text(400, 408, 'ENTER / ESC / click — close help', {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);

    backdrop.on('pointerup', () => this.closeHelp());
    this.helpObjects = [backdrop, title, body, footer];
    this.refresh();
  }

  private closeHelp() {
    if (!this.helpOpen) {
      return;
    }

    this.helpOpen = false;

    for (const object of this.helpObjects) {
      object.destroy();
    }

    this.helpObjects = [];
    this.refresh();
  }

  private openStopConfirm() {
    if (this.confirmOpen || this.helpOpen || this.lastView?.closed) {
      return;
    }

    this.confirmOpen = true;

    const backdrop = this.add
      .rectangle(400, 300, 460, 120, IP_COLORS.panel, 1)
      .setStrokeStyle(1, IP_COLORS.caution)
      .setDepth(IP_DEPTH.confirm)
      .setInteractive();
    const body = this.add
      .text(
        400,
        284,
        'Stop this task? The console closes without a diagnosis and cannot be reopened.',
        {
          color: IP_TEXT.text,
          font: IP_FONT.body,
          align: 'center',
          wordWrap: { width: 420 },
        },
      )
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);

    this.buttons.push(
      new UiButton({
        scene: this,
        id: 'confirm_stop',
        x: 250,
        y: 318,
        width: 130,
        label: 'STOP (ENTER)',
        kind: 'caution',
        depth: IP_DEPTH.confirm + 1,
        onActivate: () => this.closeStopConfirm(true),
      }),
      new UiButton({
        scene: this,
        id: 'cancel_stop',
        x: 420,
        y: 318,
        width: 130,
        label: 'KEEP (ESC)',
        depth: IP_DEPTH.confirm + 1,
        onActivate: () => this.closeStopConfirm(false),
      }),
    );
    this.confirmObjects = [backdrop, body];
    this.refresh();
  }

  private closeStopConfirm(confirmed: boolean) {
    if (!this.confirmOpen) {
      return;
    }

    this.confirmOpen = false;

    for (const object of this.confirmObjects) {
      object.destroy();
    }

    this.confirmObjects = [];
    this.buttons = this.buttons.filter((button) => {
      if (button.id === 'confirm_stop' || button.id === 'cancel_stop') {
        button.destroy();

        return false;
      }

      return true;
    });

    if (confirmed) {
      m18FaultStop(Date.now());
      sfxUiSelect();
    }

    this.refresh();
  }

  /* ---------------------------------------------------------------- *
   * Pointer + keyboard
   * ---------------------------------------------------------------- */

  private wirePointer() {
    this.input.on(
      Phaser.Input.Events.GAMEOBJECT_UP,
      (
        pointer: Phaser.Input.Pointer,
        object: Phaser.GameObjects.GameObject,
      ) => {
        const target = (object.getData(KIND_KEY) as Target | undefined) ?? null;

        if (target === null || pointer.button !== 0) {
          return;
        }

        const index = this.focusList.findIndex(
          (entry) => entry.kind === target.kind && entry.id === target.id,
        );

        if (index >= 0) {
          this.focusIndex = index;
        }

        if (target.kind === 'panel') {
          this.act({ kind: 'view_panel', id: target.id }, 'pointer');
        } else if (target.kind === 'test') {
          this.act({ kind: 'run_test', id: target.id }, 'pointer');
        } else {
          // Clicking the hypothesis card body selects it (toggles).
          this.act({ kind: 'select', id: target.id }, 'pointer');
        }
      },
    );
  }

  private wireKeyboard() {
    const keyboard = this.input.keyboard!;
    const on = (eventName: string, handler: (event: KeyboardEvent) => void) =>
      keyboard.on(eventName, guardKeyHandler(handler));
    const move = (delta: number) => {
      if (this.confirmOpen || this.helpOpen) {
        return;
      }

      this.focusIndex = Phaser.Math.Clamp(
        this.focusIndex + delta,
        0,
        this.focusList.length - 1,
      );
      sfxUiMove();
      this.refresh();
    };

    on('keydown-ESC', (event) => {
      if (event.repeat) {
        return;
      }

      if (this.confirmOpen) {
        this.closeStopConfirm(false);
      } else if (this.helpOpen) {
        this.closeHelp();
      } else if (this.rulesOpen) {
        this.closeRules();
      } else {
        this.leave();
      }
    });
    on('keydown-I', (event) => {
      if (!event.repeat && !this.confirmOpen && !this.helpOpen) {
        this.leave();
      }
    });
    on('keydown-ENTER', (event) => {
      if (event.repeat) {
        return;
      }

      if (this.confirmOpen) {
        this.closeStopConfirm(true);
      } else if (this.helpOpen) {
        this.closeHelp();
      } else if (this.rulesOpen) {
        this.closeRules();
      } else {
        this.activateFocused('typed');
      }
    });
    on('keydown-SPACE', (event) => {
      if (!event.repeat && !this.confirmOpen && !this.helpOpen) {
        this.activateFocused('typed');
      }
    });
    on('keydown-UP', () => move(-1));
    on('keydown-DOWN', () => move(1));
    on('keydown-LEFT', () => move(-1));
    on('keydown-RIGHT', () => move(1));
    on('keydown-X', (event) => {
      const entry = this.focusList[this.focusIndex];

      if (!event.repeat && entry?.kind === 'hypothesis') {
        this.act({ kind: 'reject', id: entry.id }, 'typed');
      }
    });
    on('keydown-R', (event) => {
      if (!event.repeat) {
        this.openRules('typed');
      }
    });
    on('keydown-H', (event) => {
      if (!event.repeat) {
        this.openHelp('typed');
      }
    });
    on('keydown-Q', (event) => {
      if (!event.repeat) {
        this.openStopConfirm();
      }
    });

    for (let digit = 1; digit <= 4; digit++) {
      on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR'][digit - 1]}`, (event) => {
        const hypothesis = this.lastView?.hypotheses[digit - 1];

        if (!event.repeat && hypothesis !== undefined) {
          const index = this.focusList.findIndex(
            (entry) =>
              entry.kind === 'hypothesis' && entry.id === hypothesis.id,
          );

          if (index >= 0) {
            this.focusIndex = index;
          }

          this.act({ kind: 'select', id: hypothesis.id }, 'typed');
        }
      });
    }
  }

  private leave() {
    m18FaultLeave(Date.now());
    sfxUiSelect();
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }
}
