/**
 * Signal Terminal overlay (Information Processing foundation).
 *
 * The reusable analysis terminal: incoming signal panel, compact
 * codebook, command palette, ordered program buffer, live output
 * preview, validation console, explicit submission, reversible editing
 * before submission, contextual help, and neutral feedback. One scene
 * serves the common tutorial and the M14–M17 opportunities through a
 * TerminalTaskAdapter; it holds NO task state of its own.
 *
 * Input model (mouse and keyboard are semantically equivalent):
 * - Drag a fragment chip onto a destination (or another chip) → the
 *   adapter's drop verb is composed and committed (`pointer`).
 * - Click chips / palette tokens → tokens join the command line; ENTER
 *   or ADD commits it (`pointer`, or `typed` when every token was typed).
 * - Type a command and press ENTER (`typed`). Meta words REMOVE n,
 *   CLEAR, SUBMIT, HELP, STOP and the stage action (READY/NEXT) are
 *   accepted both typed and as buttons.
 * Both paths hand the SAME raw `{verb, args}` to the adapter, which runs
 * the single validation path (commands.ts → programEngine.ts).
 *
 * Modal safety: launched over a PAUSED host (openIpOverlay), dimmer is
 * interactive, keys are captured; ESC clears a non-empty line first and
 * otherwise leaves (the window stays open — inventory precedent). `I`
 * is NOT a close key here because typed commands need letters.
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
import { normalizeToken, tokenizeCommandText } from '../commands';
import type { InputMode, TerminalTaskAdapter, TerminalView } from '../model';
import { refreshIpProbe } from '../probe';
import { getTerminalAdapter } from '../terminalAdapters';
import {
  IP_COLORS,
  IP_DEPTH,
  IP_FONT,
  IP_LEAVE_HINT,
  IP_PANEL,
  IP_TEXT,
  IP_TONES,
  prefersReducedMotion,
} from './ipTheme';
import type { IpOverlayLaunchData } from './openIpOverlay';

interface ProbeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TerminalProbe {
  open: boolean;
  task: string | null;
  stage: string;
  closed: boolean;
  chips: (ProbeRect & { id: string; label: string; state: string })[];
  bins: (ProbeRect & { id: string })[];
  palette: (ProbeRect & { token: string })[];
  buffer: (ProbeRect & {
    index: number;
    text: string;
    input_mode: InputMode;
    remove: ProbeRect | null;
  })[];
  buttons: (ProbeRect & { id: string; label: string; enabled: boolean })[];
  line: string;
  console: string[];
  output: string[];
  codebook: string[];
  submit_enabled: boolean;
  dragging: boolean;
  drop_target: string | null;
  drop_valid: boolean;
  help_open: boolean;
  confirm_open: boolean;
}

declare global {
  interface Window {
    /** DEV-only, read-only terminal UI probe (__inventoryUiProbe precedent). */
    __ipTerminalProbe?: TerminalProbe | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__ipTerminalProbe = null;
}

const KIND_KEY = 'ipTerminalKind';

interface ChipTarget {
  kind: 'chip' | 'bin' | 'token' | 'remove';
  id: string;
  index?: number;
}

/* Layout (absolute 800×600 coordinates inside IP_PANEL). */
const L = {
  titleY: 56,
  instrY: 72,
  bandY: 130,
  col1: { x: 56, w: 240 },
  col2: { x: 306, w: 234 },
  col3: { x: 550, w: 194 },
  chipW: 114,
  chipH: 28,
  chipGap: 6,
  binsY: 366,
  binH: 34,
  codebookY: 146,
  outputTitleY: 262,
  outputY: 276,
  paletteY: 146,
  bufferTitleY: 236,
  bufferY: 252,
  bufferLineH: 15,
  composerY: 436,
  consoleY: 466,
  buttonsY: 506,
  helpLineY: 544,
} as const;

const MAX_LINE_CHARS = 40;
const META_WORDS = new Set(['REMOVE', 'CLEAR', 'SUBMIT', 'HELP', 'STOP']);
/** Typed aliases for the optional reference control. */
const REFERENCE_WORDS = new Set(['CODEBOOK', 'REFERENCE', 'TABLE']);

export class SignalTerminalScene extends Phaser.Scene {
  private resumeKey: string = key.scene.stationConcourse;
  private taskId = 'tutorial';
  private adapter: TerminalTaskAdapter | null = null;

  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private buttons: UiButton[] = [];
  private primaryButton: UiButton | null = null;
  private referenceButton: UiButton | null = null;
  private submitButton: UiButton | null = null;
  private addButton: UiButton | null = null;

  private lineText = '';
  private pointerTokens = 0;
  private typedChars = 0;
  private composerText!: Phaser.GameObjects.Text;
  private caretTween: Phaser.Tweens.Tween | null = null;

  private dragging = false;
  private dragChipId: string | null = null;
  private ghost: Phaser.GameObjects.Container | null = null;
  private dropTarget: ChipTarget | null = null;
  private dropValid = false;
  private pendingDrop: { chipId: string; target: ChipTarget } | null = null;
  private justDragged = false;

  private helpOpen = false;
  private helpObjects: Phaser.GameObjects.GameObject[] = [];
  private confirmOpen = false;
  private confirmObjects: Phaser.GameObjects.GameObject[] = [];
  private lastView: TerminalView | null = null;
  /** Live chip/bin rectangles for in-place restyling during a drag
   *  (rebuilding mid-drag would destroy the dragged object). */
  private chipRects = new Map<string, Phaser.GameObjects.Rectangle>();
  private binRects = new Map<string, Phaser.GameObjects.Rectangle>();

  constructor() {
    super(key.scene.ipSignalTerminal);
  }

  init(data?: IpOverlayLaunchData) {
    this.resumeKey = data?.resumeKey ?? key.scene.stationConcourse;
    this.taskId = data?.taskId ?? 'tutorial';
  }

  create() {
    this.dynamic = [];
    this.buttons = [];
    this.primaryButton = null;
    this.referenceButton = null;
    this.submitButton = null;
    this.addButton = null;
    this.lineText = '';
    this.pointerTokens = 0;
    this.typedChars = 0;
    this.dragging = false;
    this.dragChipId = null;
    this.ghost = null;
    this.dropTarget = null;
    this.dropValid = false;
    this.pendingDrop = null;
    this.justDragged = false;
    this.helpOpen = false;
    this.helpObjects = [];
    this.confirmOpen = false;
    this.confirmObjects = [];
    this.lastView = null;
    this.chipRects = new Map();
    this.binRects = new Map();

    this.adapter = getTerminalAdapter(this.taskId);

    // Render above the host no matter where this class sorts in the
    // alphabetical scene registry (src/index.ts spreads Object.values of
    // the barrel, and module namespaces enumerate exports sorted by name;
    // a scene that sorts before its host would otherwise render beneath it).
    this.scene.bringToTop();

    this.input.mouse?.disableContextMenu();
    this.input.dragDistanceThreshold = 6;
    this.input.keyboard?.addCapture([
      'SPACE',
      'UP',
      'DOWN',
      'LEFT',
      'RIGHT',
      'TAB',
      'BACKSPACE',
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

    // Section surfaces (static): incoming, codebook, output, palette,
    // buffer, composer, console.
    this.section(L.col1.x, L.bandY, L.col1.w, 222);
    this.section(L.col1.x, L.binsY - 16, L.col1.w, 62);
    this.section(L.col2.x, L.bandY, L.col2.w, 122);
    this.section(L.col2.x, L.outputTitleY - 14, L.col2.w, 170);
    this.section(L.col3.x, L.bandY, L.col3.w, 90);
    this.section(L.col3.x, L.bufferTitleY - 14, L.col3.w, 194);
    this.section(L.col1.x, L.composerY - 6, 688, 26);
    this.section(L.col1.x, L.consoleY - 6, 688, 36);

    this.add
      .text(L.col1.x, L.composerY + 7, 'CMD>', {
        color: IP_TEXT.accent,
        font: IP_FONT.section,
      })
      .setOrigin(0, 0.5)
      .setDepth(IP_DEPTH.content);
    this.composerText = this.add
      .text(L.col1.x + 44, L.composerY + 7, '', {
        color: IP_TEXT.text,
        font: IP_FONT.section,
      })
      .setOrigin(0, 0.5)
      .setDepth(IP_DEPTH.content);

    this.addButton = new UiButton({
      scene: this,
      id: 'add',
      x: L.col1.x + 630,
      y: L.composerY - 5,
      width: 56,
      label: 'ADD ↵',
      kind: 'accent',
      depth: IP_DEPTH.content,
      onActivate: () => this.commitLine(),
    });
    this.buttons.push(this.addButton);

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
    );
    this.buttons.push(
      new UiButton({
        scene: this,
        id: 'help',
        x: L.col1.x,
        y: L.buttonsY,
        width: 64,
        label: 'HELP',
        depth: IP_DEPTH.content,
        onActivate: () => this.openHelp('pointer'),
      }),
    );
    this.buttons.push(
      new UiButton({
        scene: this,
        id: 'clear',
        x: L.col1.x + 72,
        y: L.buttonsY,
        width: 70,
        label: 'CLEAR',
        depth: IP_DEPTH.content,
        onActivate: () => this.clearBuffer('pointer'),
      }),
    );
    this.buttons.push(
      new UiButton({
        scene: this,
        id: 'stop',
        x: L.col1.x + 150,
        y: L.buttonsY,
        width: 94,
        label: 'STOP TASK',
        kind: 'caution',
        depth: IP_DEPTH.content,
        onActivate: () => this.openStopConfirm(),
      }),
    );
    this.submitButton = new UiButton({
      scene: this,
      id: 'submit',
      x: L.col1.x + 588,
      y: L.buttonsY,
      width: 100,
      label: 'SUBMIT',
      kind: 'accent',
      depth: IP_DEPTH.content,
      onActivate: () => this.submit('pointer'),
    });
    this.buttons.push(this.submitButton);

    this.add
      .text(
        400,
        L.helpLineY,
        `Type a command + ENTER • drag fragment → destination • ✕ removes a line • HELP • ${IP_LEAVE_HINT}`,
        { color: IP_TEXT.dim, font: IP_FONT.small },
      )
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.content);

    this.wirePointer();
    this.wireKeyboard();

    const now = Date.now();

    if (this.adapter === null) {
      // Unknown task id: report and leave rather than trapping the modal.
      this.add
        .text(400, 300, `No terminal task registered for "${this.taskId}".`, {
          color: IP_TEXT.caution,
          font: IP_FONT.section,
        })
        .setOrigin(0.5)
        .setDepth(IP_DEPTH.content);
      this.time.delayedCall(600, () => this.leave());

      return;
    }

    try {
      this.adapter.open(now);
    } catch (error) {
      this.adapter.fail(now, `open: ${String(error)}`);
    }

    sfxPromptOpen();
    this.refresh();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.adapter?.leave(Date.now());
      this.destroyGhost();

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__ipTerminalProbe = {
          ...this.emptyProbe(),
          open: false,
          task: this.taskId,
        };
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

  private tone(tone: keyof typeof IP_TONES) {
    return IP_TONES[tone] ?? IP_TONES.neutral;
  }

  private refresh() {
    if (this.adapter === null) {
      return;
    }

    for (const object of this.dynamic) {
      object.destroy();
    }

    this.dynamic = [];
    this.chipRects.clear();
    this.binRects.clear();

    const view = this.adapter.view();

    this.lastView = view;

    // Title + stage.
    this.text(IP_PANEL.x + 16, L.titleY, view.title, {
      color: IP_TEXT.text,
      font: IP_FONT.title,
    }).setOrigin(0, 0.5);
    this.text(IP_PANEL.x + IP_PANEL.width - 56, L.titleY, view.stageLabel, {
      color: view.closed ? IP_TEXT.dim : IP_TEXT.accent,
      font: IP_FONT.section,
    }).setOrigin(1, 0.5);

    // Instructions strip (3 lines max; full text under HELP).
    this.text(L.col1.x, L.instrY, view.instructions.join(' '), {
      color: IP_TEXT.dim,
      font: IP_FONT.small,
      lineSpacing: 2,
      wordWrap: { width: 688 },
    });

    // — Incoming chips.
    this.text(L.col1.x + 6, L.bandY + 4, view.incomingTitle, {
      color: IP_TEXT.dim,
      font: IP_FONT.small,
    });
    view.chips.forEach((chip, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = L.col1.x + 6 + col * (L.chipW + L.chipGap);
      const y = L.bandY + 20 + row * (L.chipH + L.chipGap);
      const tone = this.tone(chip.tone);
      const isDrop =
        this.dropTarget?.kind === 'chip' && this.dropTarget.id === chip.id;
      const fill = isDrop
        ? this.dropValid
          ? IP_COLORS.dropValidFill
          : IP_COLORS.invalid
        : chip.state === 'handled'
          ? IP_COLORS.slot
          : tone.fill;
      const stroke = isDrop
        ? this.dropValid
          ? IP_COLORS.accent
          : IP_COLORS.invalid
        : tone.stroke;
      const rect = this.add
        .rectangle(x, y, L.chipW, L.chipH, fill, 1)
        .setOrigin(0)
        .setStrokeStyle(1, stroke)
        .setDepth(IP_DEPTH.chip);

      rect.setData(KIND_KEY, {
        kind: 'chip',
        id: chip.id,
      } satisfies ChipTarget);
      rect.setData('baseFill', fill);
      rect.setData('baseStroke', stroke);

      if (view.editing && !view.closed) {
        rect.setInteractive({
          useHandCursor: true,
          draggable: true,
          dropZone: view.chipPairVerb !== null,
        });
      }

      this.dynamic.push(rect);
      this.chipRects.set(chip.id, rect);
      this.text(
        x + 6,
        y + 4,
        chip.label,
        {
          color: chip.state === 'handled' ? IP_TEXT.dim : tone.text,
          font: IP_FONT.section,
        },
        IP_DEPTH.chip + 1,
      );

      if (chip.sub !== undefined) {
        this.text(
          x + 6,
          y + 16,
          chip.sub,
          { color: IP_TEXT.faint, font: '10px monospace' },
          IP_DEPTH.chip + 1,
        );
      }

      if (chip.state === 'handled') {
        this.text(
          x + L.chipW - 8,
          y + 4,
          '✓',
          { color: IP_TEXT.dim, font: IP_FONT.small },
          IP_DEPTH.chip + 1,
        ).setOrigin(1, 0);
      } else if (chip.state === 'flagged') {
        this.text(
          x + L.chipW - 8,
          y + 4,
          '!',
          { color: IP_TEXT.caution, font: IP_FONT.small },
          IP_DEPTH.chip + 1,
        ).setOrigin(1, 0);
      }

      if (this.dragChipId === chip.id && this.dragging) {
        rect.setFillStyle(IP_COLORS.reserved, 1);
      }
    });

    // — Destination bins.
    if (view.bins.length > 0) {
      this.text(L.col1.x + 6, L.binsY - 12, 'DESTINATIONS', {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
      });

      const binW = Math.floor(
        (L.col1.w - 12 - (view.bins.length - 1) * 6) / view.bins.length,
      );

      view.bins.forEach((bin, index) => {
        const x = L.col1.x + 6 + index * (binW + 6);
        const y = L.binsY + 2;
        const isDrop =
          this.dropTarget?.kind === 'bin' && this.dropTarget.id === bin.id;
        const rect = this.add
          .rectangle(
            x,
            y,
            binW,
            L.binH,
            isDrop
              ? this.dropValid
                ? IP_COLORS.dropValidFill
                : IP_COLORS.invalid
              : IP_COLORS.containerSlot,
            1,
          )
          .setOrigin(0)
          .setStrokeStyle(
            1,
            isDrop && this.dropValid
              ? IP_COLORS.accent
              : IP_COLORS.containerStroke,
          )
          .setDepth(IP_DEPTH.chip);

        rect.setData(KIND_KEY, {
          kind: 'bin',
          id: bin.id,
        } satisfies ChipTarget);
        rect.setData('baseFill', IP_COLORS.containerSlot);
        rect.setData('baseStroke', IP_COLORS.containerStroke);

        if (view.editing && !view.closed) {
          rect.setInteractive({ useHandCursor: true, dropZone: true });
        }

        this.dynamic.push(rect);
        this.binRects.set(bin.id, rect);
        this.text(
          x + binW / 2,
          y + L.binH / 2,
          bin.label,
          { color: IP_TEXT.text, font: IP_FONT.section },
          IP_DEPTH.chip + 1,
        ).setOrigin(0.5);
      });
    }

    // — Codebook.
    let cy = L.codebookY - 12;

    for (const panel of view.codebook) {
      this.text(L.col2.x + 6, cy, panel.title, {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
      });
      cy += 14;
      this.text(L.col2.x + 6, cy, panel.lines.join('\n'), {
        color: IP_TEXT.text,
        font: IP_FONT.small,
        lineSpacing: 2,
      });
      cy += panel.lines.length * 13 + 8;
    }

    // — Output preview.
    this.text(L.col2.x + 6, L.outputTitleY - 10, view.outputTitle, {
      color: IP_TEXT.dim,
      font: IP_FONT.small,
    });
    this.text(L.col2.x + 6, L.outputY - 2, view.output.join('\n'), {
      color: IP_TEXT.accent,
      font: '10px monospace',
      lineSpacing: 1,
    });

    // — Palette tokens.
    this.text(L.col3.x + 6, L.bandY + 4, 'PALETTE', {
      color: IP_TEXT.dim,
      font: IP_FONT.small,
    });

    let px = L.col3.x + 6;
    let py = L.paletteY + 2;

    for (const group of view.palette) {
      for (const value of group.values) {
        const w = Math.max(34, value.length * 7 + 12);

        if (px + w > L.col3.x + L.col3.w - 4) {
          px = L.col3.x + 6;
          py += 20;
        }

        const rect = this.add
          .rectangle(px, py, w, 17, IP_COLORS.slot, 1)
          .setOrigin(0)
          .setStrokeStyle(1, IP_COLORS.slotStroke)
          .setDepth(IP_DEPTH.chip);

        rect.setData(KIND_KEY, {
          kind: 'token',
          id: value,
        } satisfies ChipTarget);

        if (view.editing && !view.closed) {
          rect.setInteractive({ useHandCursor: true });
        }

        this.dynamic.push(rect);
        this.text(
          px + w / 2,
          py + 8,
          value,
          { color: IP_TEXT.text, font: '10px monospace' },
          IP_DEPTH.chip + 1,
        ).setOrigin(0.5);
        px += w + 4;
      }

      px = L.col3.x + 6;
      py += 22;
    }

    // — Program buffer.
    this.text(L.col3.x + 6, L.bufferTitleY - 10, 'PROGRAM BUFFER', {
      color: IP_TEXT.dim,
      font: IP_FONT.small,
    });

    const maxLines = 11;
    const start = Math.max(0, view.buffer.length - maxLines);

    view.buffer.slice(start).forEach((line, offset) => {
      const index = start + offset;
      const y = L.bufferY + offset * L.bufferLineH;

      this.text(
        L.col3.x + 6,
        y,
        `${String(index + 1).padStart(2, ' ')} ${line.text}`,
        {
          color: IP_TEXT.text,
          font: '10px monospace',
        },
      );

      if (view.editing && !view.closed) {
        const remove = this.add
          .rectangle(L.col3.x + L.col3.w - 20, y - 1, 14, 13, IP_COLORS.slot, 1)
          .setOrigin(0)
          .setStrokeStyle(1, IP_COLORS.slotStroke)
          .setDepth(IP_DEPTH.chip)
          .setInteractive({ useHandCursor: true });

        remove.setData(KIND_KEY, {
          kind: 'remove',
          id: String(index),
          index,
        } satisfies ChipTarget);
        this.dynamic.push(remove);
        this.text(
          L.col3.x + L.col3.w - 13,
          y + 5,
          '✕',
          { color: IP_TEXT.caution, font: '9px monospace' },
          IP_DEPTH.chip + 1,
        ).setOrigin(0.5);
      }
    });

    if (start > 0) {
      this.text(L.col3.x + 6, L.bufferY - 12, `… ${start} earlier line(s)`, {
        color: IP_TEXT.faint,
        font: '9px monospace',
      });
    }

    // — Console.
    this.text(
      L.col1.x + 6,
      L.consoleY,
      view.consoleLines.slice(0, 2).join('\n'),
      {
        color: IP_TEXT.caution,
        font: IP_FONT.small,
        lineSpacing: 2,
        wordWrap: { width: 676 },
      },
    );

    // — Buttons.
    this.submitButton?.setEnabled(view.submitEnabled && !view.closed);
    this.addButton?.setEnabled(view.editing && !view.closed);

    for (const button of this.buttons) {
      if (button.id === 'clear') {
        button.setEnabled(
          view.editing && !view.closed && view.buffer.length > 0,
        );
      } else if (button.id === 'stop') {
        button.setEnabled(!view.closed);
      }
    }

    this.primaryButton?.destroy();
    this.primaryButton = null;
    this.referenceButton?.destroy();
    this.referenceButton = null;

    if (
      view.reference !== null &&
      view.reference !== undefined &&
      !view.closed
    ) {
      const reference = view.reference;

      this.referenceButton = new UiButton({
        scene: this,
        id: 'reference',
        x: L.col1.x + 252,
        y: L.buttonsY,
        width: 96,
        label: reference.label,
        depth: IP_DEPTH.content,
        onActivate: () => this.openReference('pointer'),
      });
    }

    if (view.primaryAction !== null && !view.closed) {
      this.primaryButton = new UiButton({
        scene: this,
        id: view.primaryAction.id,
        x: L.col1.x + 470,
        y: L.buttonsY,
        width: 110,
        label: view.primaryAction.label,
        kind: view.primaryAction.kind,
        depth: IP_DEPTH.content,
        onActivate: () => this.primary(view.primaryAction!.id, 'pointer'),
      });
    }

    this.composerText.setText(
      view.editing && !view.closed ? `${this.lineText}▮` : '',
    );
    this.writeProbe(view);
  }

  /**
   * In-place restyle of chips/bins for drag feedback (reserved source,
   * valid/invalid target). Never rebuilds objects — a rebuild during a
   * drag would destroy the dragged object and silently end the gesture.
   */
  private restyleTargets() {
    const paint = (
      rect: Phaser.GameObjects.Rectangle,
      kind: 'chip' | 'bin',
      id: string,
    ) => {
      const isDrop =
        this.dropTarget !== null &&
        this.dropTarget.kind === kind &&
        this.dropTarget.id === id;
      const baseFill = rect.getData('baseFill') as number;
      const baseStroke = rect.getData('baseStroke') as number;

      if (isDrop) {
        rect.setFillStyle(
          this.dropValid ? IP_COLORS.dropValidFill : IP_COLORS.invalid,
          1,
        );
        rect.setStrokeStyle(
          1,
          this.dropValid ? IP_COLORS.accent : IP_COLORS.invalid,
        );
      } else if (kind === 'chip' && this.dragging && this.dragChipId === id) {
        rect.setFillStyle(IP_COLORS.reserved, 1);
        rect.setStrokeStyle(1, baseStroke);
      } else {
        rect.setFillStyle(baseFill, 1);
        rect.setStrokeStyle(1, baseStroke);
      }
    };

    for (const [id, rect] of this.chipRects) {
      paint(rect, 'chip', id);
    }

    for (const [id, rect] of this.binRects) {
      paint(rect, 'bin', id);
    }

    if (this.lastView !== null) {
      this.writeProbe(this.lastView);
    }
  }

  private emptyProbe(): TerminalProbe {
    return {
      open: false,
      task: null,
      stage: '',
      closed: false,
      chips: [],
      bins: [],
      palette: [],
      buffer: [],
      buttons: [],
      line: '',
      console: [],
      output: [],
      codebook: [],
      submit_enabled: false,
      dragging: false,
      drop_target: null,
      drop_valid: false,
      help_open: false,
      confirm_open: false,
    };
  }

  private writeProbe(view: TerminalView) {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const probe: TerminalProbe = {
      ...this.emptyProbe(),
      open: true,
      task: this.taskId,
      stage: view.stageLabel,
      closed: view.closed,
      line: this.lineText,
      console: [...view.consoleLines],
      output: [...view.output],
      codebook: view.codebook.flatMap((panel) => [panel.title, ...panel.lines]),
      submit_enabled: view.submitEnabled && !view.closed,
      dragging: this.dragging,
      drop_target: this.dropTarget?.id ?? null,
      drop_valid: this.dropValid,
      help_open: this.helpOpen,
      confirm_open: this.confirmOpen,
    };

    for (const object of this.dynamic) {
      const target = object.getData(KIND_KEY) as ChipTarget | undefined;

      if (
        target === undefined ||
        !(object instanceof Phaser.GameObjects.Rectangle)
      ) {
        continue;
      }

      const rect = {
        x: object.x,
        y: object.y,
        w: object.width,
        h: object.height,
      };

      if (target.kind === 'chip') {
        const chip = view.chips.find((candidate) => candidate.id === target.id);

        probe.chips.push({
          ...rect,
          id: target.id,
          label: chip?.label ?? target.id,
          state: chip?.state ?? 'pending',
        });
      } else if (target.kind === 'bin') {
        probe.bins.push({ ...rect, id: target.id });
      } else if (target.kind === 'token') {
        probe.palette.push({ ...rect, token: target.id });
      }
    }

    view.buffer.forEach((line, index) => {
      const remove = this.dynamic.find((object) => {
        const target = object.getData(KIND_KEY) as ChipTarget | undefined;

        return target?.kind === 'remove' && target.index === index;
      }) as Phaser.GameObjects.Rectangle | undefined;

      probe.buffer.push({
        index,
        text: line.text,
        input_mode: line.input_mode,
        x: L.col3.x,
        y: L.bufferY + index * L.bufferLineH,
        w: L.col3.w,
        h: L.bufferLineH,
        remove:
          remove === undefined
            ? null
            : { x: remove.x, y: remove.y, w: remove.width, h: remove.height },
      });
    });

    const buttons = [...this.buttons];

    if (this.primaryButton !== null) {
      buttons.push(this.primaryButton);
    }

    if (this.referenceButton !== null) {
      buttons.push(this.referenceButton);
    }

    for (const button of buttons) {
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

    window.__ipTerminalProbe = probe;
    refreshIpProbe();
  }

  /* ---------------------------------------------------------------- *
   * Command line
   * ---------------------------------------------------------------- */

  private appendToken(token: string) {
    if (!this.canEdit()) {
      return;
    }

    const next = `${this.lineText}${this.lineText.length > 0 && !this.lineText.endsWith(' ') ? ' ' : ''}${token} `;

    if (next.length > MAX_LINE_CHARS + 8) {
      sfxUnavailable();
      return;
    }

    this.lineText = next;
    this.pointerTokens += 1;
    sfxUiMove();
    this.refresh();
  }

  private typeChar(char: string) {
    if (!this.canEdit() || this.lineText.length >= MAX_LINE_CHARS) {
      return;
    }

    this.lineText += char;
    this.typedChars += 1;
    this.refresh();
  }

  private backspace() {
    if (!this.canEdit() || this.lineText.length === 0) {
      return;
    }

    this.lineText = this.lineText.replace(/\s+$/, '').slice(0, -1);
    this.refresh();
  }

  private resetLine() {
    this.lineText = '';
    this.pointerTokens = 0;
    this.typedChars = 0;
  }

  private lineMode(): InputMode {
    return this.pointerTokens > 0 ? 'pointer' : 'typed';
  }

  private canEdit(): boolean {
    return (
      this.adapter !== null &&
      this.lastView !== null &&
      this.lastView.editing &&
      !this.lastView.closed &&
      !this.helpOpen &&
      !this.confirmOpen
    );
  }

  /** ENTER / ADD: dispatch the command line (meta words or a command). */
  private commitLine() {
    if (this.adapter === null || this.helpOpen || this.confirmOpen) {
      return;
    }

    const tokens = tokenizeCommandText(this.lineText).map(normalizeToken);
    const mode = this.lineMode();

    if (tokens.length === 0) {
      return;
    }

    const [head, ...rest] = tokens;

    this.resetLine();

    if (META_WORDS.has(head)) {
      this.runMeta(head, rest, mode);
      return;
    }

    if (REFERENCE_WORDS.has(head) && this.lastView?.reference) {
      this.openReference(mode);
      return;
    }

    const primary = this.lastView?.primaryAction;

    if (primary !== null && primary !== undefined && head === primary.id) {
      this.primary(primary.id, mode);
      return;
    }

    this.dispatchAppend(head, rest, mode);
  }

  private runMeta(word: string, args: string[], mode: InputMode) {
    switch (word) {
      case 'REMOVE': {
        const index = Number.parseInt(args[0] ?? '', 10) - 1;

        this.removeLineAt(Number.isNaN(index) ? -1 : index, mode);
        break;
      }
      case 'CLEAR':
        this.clearBuffer(mode);
        break;
      case 'SUBMIT':
        this.submit(mode);
        break;
      case 'HELP':
        this.openHelp(mode);
        break;
      case 'STOP':
        this.openStopConfirm();
        break;
      default:
        break;
    }
  }

  private dispatchAppend(verb: string, args: string[], mode: InputMode) {
    if (this.adapter === null) {
      return;
    }

    const result = this.safely(() =>
      this.adapter!.append({ verb, args }, mode, Date.now()),
    );

    if (result?.ok) {
      sfxUiSelect();
    } else {
      sfxUnavailable();
    }

    this.refresh();
  }

  private removeLineAt(index: number, mode: InputMode) {
    if (this.adapter === null) {
      return;
    }

    const result = this.safely(() =>
      this.adapter!.remove(index, mode, Date.now()),
    );

    if (result?.ok) {
      sfxUiSelect();
    } else {
      sfxUnavailable();
    }

    this.refresh();
  }

  private clearBuffer(mode: InputMode) {
    if (this.adapter === null || !this.canEdit()) {
      return;
    }

    this.safely(() => this.adapter!.clear(mode, Date.now()));
    sfxUiSelect();
    this.refresh();
  }

  private submit(mode: InputMode) {
    if (this.adapter === null || this.helpOpen || this.confirmOpen) {
      return;
    }

    const result = this.safely(() => this.adapter!.submit(mode, Date.now()));

    // Neutral: the same soft tick for any recorded submission, the same
    // soft "unavailable" cue for a refused one. Never a success fanfare.
    if (result?.ok) {
      sfxUiSelect();
    } else {
      sfxUnavailable();
    }

    this.refresh();
  }

  private primary(actionId: string, mode: InputMode) {
    if (this.adapter === null || this.helpOpen || this.confirmOpen) {
      return;
    }

    const result = this.safely(() =>
      this.adapter!.primary(actionId, mode, Date.now()),
    );

    if (result?.ok) {
      sfxUiSelect();
    } else {
      sfxUnavailable();
    }

    this.resetLine();
    this.refresh();
  }

  /** Runs an adapter action; a thrown error becomes a technical failure. */
  private safely<T>(action: () => T): T | null {
    try {
      return action();
    } catch (error) {
      this.adapter?.fail(Date.now(), String(error));

      return null;
    }
  }

  /* ---------------------------------------------------------------- *
   * Help + stop confirm
   * ---------------------------------------------------------------- */

  /** Opens the optional in-task reference (codebook table); counted. */
  private openReference(mode: InputMode) {
    const reference = this.lastView?.reference;

    if (
      this.adapter === null ||
      this.helpOpen ||
      this.confirmOpen ||
      reference === null ||
      reference === undefined
    ) {
      return;
    }

    const lines =
      this.safely(() =>
        this.adapter!.consultReference
          ? this.adapter!.consultReference(mode, Date.now())
          : reference.lines,
      ) ?? reference.lines;

    this.showReferencePanel(reference.title, [...lines]);
  }

  private showReferencePanel(title: string, lines: string[]) {
    this.helpOpen = true;

    const backdrop = this.add
      .rectangle(400, 300, 520, 300, IP_COLORS.panel, 1)
      .setStrokeStyle(1, IP_COLORS.accent)
      .setDepth(IP_DEPTH.confirm)
      .setInteractive();
    const heading = this.add
      .text(400, 168, title, { color: IP_TEXT.accent, font: IP_FONT.section })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);
    const body = this.add
      .text(156, 190, lines.join('\n'), {
        color: IP_TEXT.text,
        font: IP_FONT.body,
        lineSpacing: 4,
        wordWrap: { width: 488 },
      })
      .setDepth(IP_DEPTH.confirm + 1);
    const footer = this.add
      .text(400, 432, 'ENTER / ESC / click — close', {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);

    backdrop.on('pointerup', () => this.closeHelp());
    this.helpObjects = [backdrop, heading, body, footer];
    this.refresh();
  }

  private openHelp(mode: InputMode) {
    if (this.adapter === null || this.helpOpen || this.confirmOpen) {
      return;
    }

    const lines = this.safely(() => this.adapter!.help(mode, Date.now())) ?? [];
    const view = this.lastView;

    this.helpOpen = true;

    const backdrop = this.add
      .rectangle(400, 300, 560, 340, IP_COLORS.panel, 1)
      .setStrokeStyle(1, IP_COLORS.accent)
      .setDepth(IP_DEPTH.confirm)
      .setInteractive();
    const title = this.add
      .text(400, 148, 'HELP — THIS TASK', {
        color: IP_TEXT.accent,
        font: IP_FONT.section,
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);
    const body = this.add
      .text(
        136,
        170,
        [...(view?.instructions ?? []), '', ...lines].join('\n'),
        {
          color: IP_TEXT.text,
          font: IP_FONT.small,
          lineSpacing: 3,
          wordWrap: { width: 528 },
        },
      )
      .setDepth(IP_DEPTH.confirm + 1);
    const footer = this.add
      .text(400, 452, 'ENTER / ESC / click — close help', {
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
    if (this.adapter === null || this.confirmOpen || this.helpOpen) {
      return;
    }

    if (this.lastView?.closed) {
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
        'Stop this task? It closes without a submission and cannot be reopened.',
        {
          color: IP_TEXT.text,
          font: IP_FONT.body,
          align: 'center',
          wordWrap: { width: 420 },
        },
      )
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);
    const confirm = new UiButton({
      scene: this,
      id: 'confirm_stop',
      x: 250,
      y: 318,
      width: 130,
      label: 'STOP (ENTER)',
      kind: 'caution',
      depth: IP_DEPTH.confirm + 1,
      onActivate: () => this.closeStopConfirm(true),
    });
    const cancel = new UiButton({
      scene: this,
      id: 'cancel_stop',
      x: 420,
      y: 318,
      width: 130,
      label: 'KEEP (ESC)',
      depth: IP_DEPTH.confirm + 1,
      onActivate: () => this.closeStopConfirm(false),
    });

    this.confirmObjects = [backdrop, body];
    this.buttons.push(confirm, cancel);
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
      this.safely(() => this.adapter!.stop(Date.now()));
      sfxUiSelect();
    }

    this.refresh();
  }

  /* ---------------------------------------------------------------- *
   * Pointer pipeline
   * ---------------------------------------------------------------- */

  private targetOf(object: Phaser.GameObjects.GameObject): ChipTarget | null {
    return (object.getData(KIND_KEY) as ChipTarget | undefined) ?? null;
  }

  private dropVerbFor(target: ChipTarget): string | null {
    if (this.lastView === null) {
      return null;
    }

    if (target.kind === 'bin') {
      return this.lastView.chipDropVerb;
    }

    if (target.kind === 'chip' && target.id !== this.dragChipId) {
      return this.lastView.chipPairVerb;
    }

    return null;
  }

  private wirePointer() {
    this.input.on(
      Phaser.Input.Events.DRAG_START,
      (
        pointer: Phaser.Input.Pointer,
        object: Phaser.GameObjects.GameObject,
      ) => {
        const target = this.targetOf(object);

        this.justDragged = true;

        if (
          target === null ||
          target.kind !== 'chip' ||
          !this.canEdit() ||
          pointer.rightButtonDown()
        ) {
          return;
        }

        this.dragging = true;
        this.dragChipId = target.id;
        this.spawnGhost(target.id, pointer.x, pointer.y);
        this.restyleTargets();
      },
    );

    this.input.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer) => {
      if (this.dragging) {
        this.ghost?.setPosition(pointer.x, pointer.y);
      }
    });

    this.input.on(
      Phaser.Input.Events.DRAG_ENTER,
      (
        _pointer: Phaser.Input.Pointer,
        _object: Phaser.GameObjects.GameObject,
        zone: Phaser.GameObjects.GameObject,
      ) => {
        if (!this.dragging) {
          return;
        }

        const target = this.targetOf(zone);

        if (target !== null) {
          this.dropTarget = target;
          this.dropValid = this.dropVerbFor(target) !== null;
          this.restyleTargets();
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.DRAG_LEAVE,
      (
        _pointer: Phaser.Input.Pointer,
        _object: Phaser.GameObjects.GameObject,
        zone: Phaser.GameObjects.GameObject,
      ) => {
        if (!this.dragging) {
          return;
        }

        const target = this.targetOf(zone);

        if (
          target !== null &&
          this.dropTarget !== null &&
          target.kind === this.dropTarget.kind &&
          target.id === this.dropTarget.id
        ) {
          this.dropTarget = null;
          this.dropValid = false;
          this.restyleTargets();
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.DROP,
      (
        _pointer: Phaser.Input.Pointer,
        _object: Phaser.GameObjects.GameObject,
        zone: Phaser.GameObjects.GameObject,
      ) => {
        if (!this.dragging || this.dragChipId === null) {
          return;
        }

        const target = this.targetOf(zone);

        if (target !== null) {
          this.pendingDrop = { chipId: this.dragChipId, target };
        }
      },
    );

    this.input.on(Phaser.Input.Events.DRAG_END, () => {
      this.time.delayedCall(0, () => {
        this.justDragged = false;
      });

      if (!this.dragging) {
        return;
      }

      const drop = this.pendingDrop;
      const verb = drop === null ? null : this.dropVerbFor(drop.target);

      this.dragging = false;
      this.dropTarget = null;
      this.dropValid = false;
      this.pendingDrop = null;

      if (drop !== null && verb !== null) {
        this.destroyGhost();
        this.dragChipId = null;
        this.dispatchAppend(verb, [drop.chipId, drop.target.id], 'pointer');

        return;
      }

      // Invalid or no target: the chip "returns" (ghost snaps home).
      this.animateGhostHome(this.dragChipId);
      this.dragChipId = null;

      if (drop !== null) {
        sfxUnavailable();
      }

      this.refresh();
    });

    this.input.on(
      Phaser.Input.Events.GAMEOBJECT_UP,
      (
        pointer: Phaser.Input.Pointer,
        object: Phaser.GameObjects.GameObject,
      ) => {
        const target = this.targetOf(object);

        if (target === null || pointer.button !== 0) {
          return;
        }

        if (this.justDragged) {
          this.justDragged = false;
          return;
        }

        if (this.helpOpen || this.confirmOpen) {
          return;
        }

        switch (target.kind) {
          case 'chip':
          case 'bin':
          case 'token':
            this.appendToken(target.id);
            break;
          case 'remove':
            this.removeLineAt(target.index ?? -1, 'pointer');
            break;
          default:
            break;
        }
      },
    );
  }

  private spawnGhost(chipId: string, x: number, y: number) {
    this.destroyGhost();

    const chip = this.lastView?.chips.find(
      (candidate) => candidate.id === chipId,
    );
    const tone = this.tone(chip?.tone ?? 'neutral');
    const rect = this.add
      .rectangle(0, 0, L.chipW, L.chipH, tone.fill, 0.92)
      .setStrokeStyle(1, IP_COLORS.accent);
    const label = this.add
      .text(0, 0, chip?.label ?? chipId, {
        color: tone.text,
        font: IP_FONT.section,
      })
      .setOrigin(0.5);

    this.ghost = this.add
      .container(x, y, [rect, label])
      .setDepth(IP_DEPTH.ghost)
      .setAlpha(0.9);
  }

  private animateGhostHome(chipId: string | null) {
    if (this.ghost === null) {
      return;
    }

    const home = this.dynamic.find((object) => {
      const target = this.targetOf(object);

      return target?.kind === 'chip' && target.id === chipId;
    }) as Phaser.GameObjects.Rectangle | undefined;

    if (home === undefined || prefersReducedMotion()) {
      this.destroyGhost();

      return;
    }

    const ghost = this.ghost;

    this.ghost = null;
    this.tweens.add({
      targets: ghost,
      x: home.x + L.chipW / 2,
      y: home.y + L.chipH / 2,
      alpha: 0.2,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }

  private destroyGhost() {
    this.ghost?.destroy();
    this.ghost = null;
  }

  /* ---------------------------------------------------------------- *
   * Keyboard
   * ---------------------------------------------------------------- */

  private wireKeyboard() {
    this.input.keyboard!.on(
      'keydown',
      guardKeyHandler((event: KeyboardEvent) => {
        if (event.repeat && event.key !== 'Backspace') {
          return;
        }

        if (this.confirmOpen) {
          if (event.key === 'Enter') {
            this.closeStopConfirm(true);
          } else if (event.key === 'Escape') {
            this.closeStopConfirm(false);
          }

          return;
        }

        if (this.helpOpen) {
          if (event.key === 'Enter' || event.key === 'Escape') {
            this.closeHelp();
          }

          return;
        }

        switch (event.key) {
          case 'Escape':
            if (this.dragging) {
              return;
            }

            if (this.lineText.length > 0) {
              this.resetLine();
              this.refresh();
            } else {
              this.leave();
            }

            return;
          case 'Enter':
            this.commitLine();

            return;
          case 'Backspace':
            this.backspace();

            return;
          case 'Tab':
            return;
          default:
            break;
        }

        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          const char = event.key;

          if (/[A-Za-z0-9 \-_.]/.test(char)) {
            this.typeChar(char.toUpperCase());
          }
        }
      }),
    );
  }

  /* ---------------------------------------------------------------- *
   * Leave (ESC / X): the window stays open, the host resumes
   * ---------------------------------------------------------------- */

  private leave() {
    this.destroyGhost();
    this.adapter?.leave(Date.now());
    sfxUiSelect();
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }
}
