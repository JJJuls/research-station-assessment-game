/**
 * Conduit Lattice Bench overlay (M13 — Information Processing foundation).
 *
 * A genuine manipulable pipe-network board: 3×3 mounts, the complete
 * standardised piece set on a bench, feed and intake ports, a fractured
 * centre mount. Mouse: drag (or click to pick up) a piece, drop/click a
 * mount to seat it, right-click rotates, drop on the bench (or DEL)
 * returns. Keyboard: arrows move a focus ring across mounts and bench,
 * SPACE/ENTER pick/place, R rotates, DEL returns, T tests the flow.
 * Both paths call exactly `m13LatticeAct` with the same semantic actions.
 *
 * Submission is explicit (TEST FLOW); the board never auto-completes.
 * Invalid runs get neutral structural feedback and can be revised; the
 * window closes on a valid run, on the bounded test-run count, or on an
 * explicit confirmed STOP. Modal pause-and-launch (inventory precedent);
 * ESC cancels a held piece first, then leaves (window stays open); I
 * leaves.
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
import type {
  M13Piece,
  M13PieceType,
  M13Rotation,
  M13SlotId,
} from '../../measurement/m13PipePuzzle';
import { M13_PIECES, M13_SLOT_IDS } from '../../measurement/m13PipePuzzle';
import type { LatticeView, PipeAction } from '../m13PipeNetwork';
import {
  m13LatticeAct,
  m13LatticeFail,
  m13LatticeHelp,
  m13LatticeLeave,
  m13LatticeOpen,
  m13LatticeStop,
  m13LatticeSubmit,
  m13LatticeView,
} from '../m13PipeNetwork';
import type { InputMode } from '../model';
import { refreshIpProbe } from '../probe';
import {
  IP_COLORS,
  IP_DEPTH,
  IP_FONT,
  IP_PANEL,
  IP_TEXT,
  prefersReducedMotion,
} from './ipTheme';
import type { IpOverlayLaunchData } from './openIpOverlay';

interface ProbeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PipeProbe {
  open: boolean;
  form: string | null;
  closed: boolean;
  cells: (ProbeRect & {
    slot: string;
    piece_id: string | null;
    rotation: number | null;
    broken: boolean;
    port: string | null;
  })[];
  bench: (ProbeRect & {
    index: number;
    piece_id: string | null;
    type: string | null;
  })[];
  held: { piece_id: string; rotation: number; source: string } | null;
  focus: { kind: 'cell' | 'bench'; id: string } | null;
  buttons: (ProbeRect & { id: string; label: string; enabled: boolean })[];
  feedback: string[];
  submissions_used: number;
  max_submissions: number;
  dragging: boolean;
  drop_target: string | null;
  drop_valid: boolean;
  help_open: boolean;
  confirm_open: boolean;
}

declare global {
  interface Window {
    /** DEV-only, read-only lattice bench UI probe. */
    __ipPipeProbe?: PipeProbe | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__ipPipeProbe = null;
}

const KIND_KEY = 'ipPipeKind';

interface Target {
  kind: 'cell' | 'cell_piece' | 'bench' | 'bench_piece';
  slot?: M13SlotId;
  piece_id?: string;
  index?: number;
}

const PIECE_TEXTURE: Record<M13PieceType, string> = {
  straight: 'proc-pipe-straight',
  elbow: 'proc-pipe-elbow',
  tee: 'proc-pipe-tee',
  valve: 'proc-pipe-valve',
  cap: 'proc-pipe-cap',
};

const PIECE_SHORT: Record<M13PieceType, string> = {
  straight: 'straight',
  elbow: 'elbow',
  tee: 'tee',
  valve: 'valve',
  cap: 'cap',
};

const L = {
  titleY: 56,
  instrY: 72,
  boardX: 84,
  boardY: 160,
  cell: 62,
  gap: 6,
  benchX: 334,
  benchY: 160,
  benchCell: 58,
  consoleX: 556,
  consoleW: 188,
  consoleY: 134,
  buttonsY: 506,
  helpLineY: 544,
  pieceScale: 1.5,
} as const;

const DIRECTION_DELTA = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
] as const;

function slotXY(slot: M13SlotId): { col: number; row: number } {
  return { col: slot.charCodeAt(0) - 65, row: Number(slot[1]) - 1 };
}

export class PipeBoardScene extends Phaser.Scene {
  private resumeKey: string = key.scene.stationConcourse;

  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private buttons: UiButton[] = [];
  private cellRects = new Map<M13SlotId, Phaser.GameObjects.Rectangle>();
  private cellImages = new Map<M13SlotId, Phaser.GameObjects.Image>();
  private benchRect: Phaser.GameObjects.Rectangle | null = null;
  private benchImages = new Map<string, Phaser.GameObjects.Image>();
  private focusRing: Phaser.GameObjects.Rectangle | null = null;

  private focus: { kind: 'cell' | 'bench'; index: number } = {
    kind: 'cell',
    index: 0,
  };
  private hoverSlot: M13SlotId | null = null;
  private dragging = false;
  private ghost: Phaser.GameObjects.Image | null = null;
  private ghostFollowsPointer = false;
  private dropTarget: Target | null = null;
  private dropValid = false;
  private pendingDrop: Target | null = null;
  private justDragged = false;
  private helpOpen = false;
  private helpObjects: Phaser.GameObjects.GameObject[] = [];
  private confirmOpen = false;
  private confirmObjects: Phaser.GameObjects.GameObject[] = [];
  private lastView: LatticeView | null = null;

  constructor() {
    super(key.scene.ipPipeBoard);
  }

  init(data?: IpOverlayLaunchData) {
    this.resumeKey = data?.resumeKey ?? key.scene.stationConcourse;
  }

  create() {
    this.dynamic = [];
    this.buttons = [];
    this.cellRects = new Map();
    this.cellImages = new Map();
    this.benchRect = null;
    this.benchImages = new Map();
    this.focusRing = null;
    this.focus = { kind: 'cell', index: 0 };
    this.hoverSlot = null;
    this.dragging = false;
    this.ghost = null;
    this.ghostFollowsPointer = false;
    this.dropTarget = null;
    this.dropValid = false;
    this.pendingDrop = null;
    this.justDragged = false;
    this.helpOpen = false;
    this.helpObjects = [];
    this.confirmOpen = false;
    this.confirmObjects = [];
    this.lastView = null;

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
      'DELETE',
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
        'CONDUIT LATTICE BENCH — RECONSTRUCTION',
        {
          color: IP_TEXT.text,
          font: IP_FONT.title,
        },
      )
      .setOrigin(0, 0.5)
      .setDepth(IP_DEPTH.content);

    // Static surfaces: board frame, bench frame, console frame.
    this.section(
      L.boardX - 28,
      L.boardY - 30,
      3 * (L.cell + L.gap) + 50,
      3 * (L.cell + L.gap) + 56,
    );
    this.benchRect = this.add
      .rectangle(
        L.benchX - 8,
        L.benchY - 26,
        3 * (L.benchCell + L.gap) + 10,
        3 * (L.benchCell + L.gap) + 30,
        IP_COLORS.section,
        1,
      )
      .setOrigin(0)
      .setStrokeStyle(1, IP_COLORS.panelStroke)
      .setDepth(IP_DEPTH.panel + 1);
    this.benchRect.setData(KIND_KEY, { kind: 'bench' } satisfies Target);
    this.benchRect.setInteractive({ dropZone: true });
    this.section(L.consoleX, L.consoleY - 6, L.consoleW, 366);

    this.add
      .text(L.benchX - 2, L.benchY - 22, 'BENCH — STANDARD PIECE SET', {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
      })
      .setDepth(IP_DEPTH.content);
    this.add
      .text(L.consoleX + 6, L.consoleY - 2, 'TEST CONSOLE', {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
      })
      .setDepth(IP_DEPTH.content);

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
        id: 'rotate',
        x: 56,
        y: L.buttonsY,
        width: 96,
        label: 'ROTATE (R)',
        depth: IP_DEPTH.content,
        onActivate: () => this.rotateFocused('pointer'),
      }),
      new UiButton({
        scene: this,
        id: 'return',
        x: 160,
        y: L.buttonsY,
        width: 104,
        label: 'RETURN (DEL)',
        depth: IP_DEPTH.content,
        onActivate: () => this.returnFocused('pointer'),
      }),
      new UiButton({
        scene: this,
        id: 'help',
        x: 272,
        y: L.buttonsY,
        width: 64,
        label: 'HELP',
        depth: IP_DEPTH.content,
        onActivate: () => this.openHelp('pointer'),
      }),
      new UiButton({
        scene: this,
        id: 'stop',
        x: 344,
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
        x: 630,
        y: L.buttonsY,
        width: 114,
        label: 'TEST FLOW (T)',
        kind: 'accent',
        depth: IP_DEPTH.content,
        onActivate: () => this.submit('pointer'),
      }),
    );

    this.add
      .text(
        400,
        L.helpLineY,
        'Drag / click to pick up • click a mount to seat • R or right-click rotates • DEL returns • arrows move focus • T test flow • ESC leaves (work stays)',
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
      m13LatticeOpen(Date.now());
    } catch (error) {
      m13LatticeFail(Date.now(), `open: ${String(error)}`);
    }

    sfxPromptOpen();
    this.refresh();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      m13LatticeLeave(Date.now());
      this.destroyGhost();

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__ipPipeProbe = { ...this.emptyProbe(), open: false };
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

  private cellOrigin(slot: M13SlotId) {
    const { col, row } = slotXY(slot);

    return {
      x: L.boardX + col * (L.cell + L.gap),
      y: L.boardY + row * (L.cell + L.gap),
    };
  }

  private benchOrigin(index: number) {
    return {
      x: L.benchX + (index % 3) * (L.benchCell + L.gap),
      y: L.benchY + Math.floor(index / 3) * (L.benchCell + L.gap),
    };
  }

  private pieceById(pieceId: string): M13Piece {
    return M13_PIECES.find((piece) => piece.piece_id === pieceId)!;
  }

  private pieceImage(
    x: number,
    y: number,
    pieceId: string,
    rotation: M13Rotation,
    scale: number,
  ) {
    const piece = this.pieceById(pieceId);
    const image = this.add
      .image(x, y, PIECE_TEXTURE[piece.type])
      .setScale(scale)
      .setAngle(rotation)
      .setDepth(IP_DEPTH.chip);

    this.dynamic.push(image);

    return image;
  }

  private refresh() {
    for (const object of this.dynamic) {
      object.destroy();
    }

    this.dynamic = [];
    this.cellRects.clear();
    this.cellImages.clear();
    this.benchImages.clear();

    const view = m13LatticeView();

    this.lastView = view;

    const config = view.config;
    const closed = view.closed;

    // Stage label.
    this.text(
      IP_PANEL.x + IP_PANEL.width - 56,
      L.titleY,
      closed
        ? view.status === 'completed'
          ? 'COMPLETE'
          : 'CLOSED'
        : `TEST RUNS ${view.submissions_used} / ${view.max_submissions}`,
      { color: closed ? IP_TEXT.dim : IP_TEXT.accent, font: IP_FONT.section },
    ).setOrigin(1, 0.5);

    this.text(
      56,
      L.instrY,
      'Reconstruct the core conduit: seat pieces from the bench so the FEED port reaches the INTAKE port as one sealed run, with the isolation valve inline and no open branch. The fractured centre mount seats nothing. TEST FLOW checks the run; you may revise and test again.',
      {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
        lineSpacing: 2,
        wordWrap: { width: 688 },
      },
    );

    // — Board cells.
    for (const slot of M13_SLOT_IDS) {
      const { x, y } = this.cellOrigin(slot);
      const broken = slot === config.broken;
      const placement = view.placements[slot];
      const isDrop =
        this.dropTarget?.kind === 'cell' && this.dropTarget.slot === slot;
      const rect = this.add
        .rectangle(
          x,
          y,
          L.cell,
          L.cell,
          isDrop
            ? this.dropValid
              ? IP_COLORS.dropValidFill
              : IP_COLORS.invalid
            : broken
              ? 0x1a1416
              : IP_COLORS.slot,
          1,
        )
        .setOrigin(0)
        .setStrokeStyle(
          1,
          isDrop && this.dropValid
            ? IP_COLORS.accent
            : broken
              ? 0x5a3a3a
              : IP_COLORS.slotStroke,
        )
        .setDepth(IP_DEPTH.content);

      rect.setData(KIND_KEY, { kind: 'cell', slot } satisfies Target);
      rect.setData('baseFill', broken ? 0x1a1416 : IP_COLORS.slot);
      rect.setData('baseStroke', broken ? 0x5a3a3a : IP_COLORS.slotStroke);

      if (!closed) {
        rect.setInteractive({ dropZone: true, useHandCursor: true });
      }

      this.dynamic.push(rect);
      this.cellRects.set(slot, rect);
      this.text(
        x + 3,
        y + 2,
        slot,
        { color: IP_TEXT.faint, font: '9px monospace' },
        IP_DEPTH.content + 1,
      );

      if (broken) {
        this.text(
          x + L.cell / 2,
          y + L.cell / 2,
          'FRACTURED',
          {
            color: '#8c6a6a',
            font: '9px monospace',
          },
          IP_DEPTH.content + 1,
        ).setOrigin(0.5);
      }

      if (placement !== undefined) {
        const image = this.pieceImage(
          x + L.cell / 2,
          y + L.cell / 2,
          placement.piece_id,
          placement.rotation,
          L.pieceScale,
        );

        image.setData(KIND_KEY, {
          kind: 'cell_piece',
          slot,
          piece_id: placement.piece_id,
        } satisfies Target);

        if (!closed) {
          image.setInteractive({ draggable: true, useHandCursor: true });
        }

        this.cellImages.set(slot, image);
      }
    }

    // Ports.
    const portLabel = (slot: M13SlotId, direction: number, label: string) => {
      const { x, y } = this.cellOrigin(slot);
      const delta = DIRECTION_DELTA[direction];
      const cx = x + L.cell / 2 + delta.dx * (L.cell / 2 + 26);
      const cy = y + L.cell / 2 + delta.dy * (L.cell / 2 + 16);
      const arrow =
        direction === 3
          ? '▶'
          : direction === 1
            ? '▶'
            : direction === 0
              ? '▼'
              : '▼';

      this.text(cx, cy, `${label}\n${arrow}`, {
        color: IP_TEXT.accent,
        font: 'bold 10px monospace',
        align: 'center',
      }).setOrigin(0.5);
    };

    portLabel(config.source.slot, config.source.direction, 'FEED');
    portLabel(config.outlet.slot, config.outlet.direction, 'INTAKE');

    // — Bench slots (stable home per piece).
    M13_PIECES.forEach((piece, index) => {
      const { x, y } = this.benchOrigin(index);
      const onBench = view.bench.some(
        (candidate) => candidate.piece_id === piece.piece_id,
      );
      const slotRect = this.add
        .rectangle(
          x,
          y,
          L.benchCell,
          L.benchCell,
          IP_COLORS.hotbarSlot,
          onBench ? 1 : 0.35,
        )
        .setOrigin(0)
        .setStrokeStyle(1, IP_COLORS.hotbarStroke)
        .setDepth(IP_DEPTH.content);

      slotRect.setData(KIND_KEY, { kind: 'bench', index } satisfies Target);
      this.dynamic.push(slotRect);
      this.text(
        x + L.benchCell / 2,
        y + L.benchCell - 7,
        PIECE_SHORT[piece.type],
        {
          color: IP_TEXT.faint,
          font: '9px monospace',
        },
        IP_DEPTH.content + 1,
      ).setOrigin(0.5);

      if (onBench) {
        const image = this.pieceImage(
          x + L.benchCell / 2,
          y + L.benchCell / 2 - 4,
          piece.piece_id,
          0,
          L.pieceScale - 0.2,
        );

        image.setData(KIND_KEY, {
          kind: 'bench_piece',
          piece_id: piece.piece_id,
          index,
        } satisfies Target);

        if (!closed) {
          image.setInteractive({ draggable: true, useHandCursor: true });
        }

        this.benchImages.set(piece.piece_id, image);
      }
    });

    // — Console: constraints + feedback + held.
    const consoleLines =
      view.feedback.length > 0
        ? view.feedback
        : [
            'Run: not yet tested.',
            'Isolation valve: —',
            'Open branches: —',
            '',
            'Seat the pieces, then TEST FLOW.',
          ];

    this.text(L.consoleX + 6, L.consoleY + 14, consoleLines.join('\n'), {
      color: IP_TEXT.text,
      font: IP_FONT.small,
      lineSpacing: 3,
      wordWrap: { width: L.consoleW - 12 },
    });

    this.text(
      L.consoleX + 6,
      L.consoleY + 300,
      view.held === null
        ? 'Holding: nothing'
        : `Holding: ${this.pieceById(view.held.piece_id).label} (${view.held.rotation}°)`,
      {
        color: IP_TEXT.accent,
        font: IP_FONT.small,
        wordWrap: { width: L.consoleW - 12 },
      },
    );
    this.text(
      L.consoleX + 6,
      L.consoleY + 330,
      `Form ${view.form} · ${config.feed_label} → ${config.intake_label}`,
      {
        color: IP_TEXT.faint,
        font: '9px monospace',
        wordWrap: { width: L.consoleW - 12 },
      },
    );

    // — Focus ring.
    const focusRect = this.focusRect();

    if (focusRect !== null && !closed) {
      const ring = this.add
        .rectangle(
          focusRect.x - 2,
          focusRect.y - 2,
          focusRect.w + 4,
          focusRect.h + 4,
          0x000000,
          0,
        )
        .setOrigin(0)
        .setStrokeStyle(2, IP_COLORS.accent)
        .setDepth(IP_DEPTH.chip + 2);

      this.dynamic.push(ring);
      this.focusRing = ring;
    }

    // — Keyboard-held ghost sits on the focus when not following the pointer.
    if (view.held !== null && this.ghost === null) {
      this.spawnGhost(view.held.piece_id, view.held.rotation, false);
    } else if (view.held === null && this.ghost !== null && !this.dragging) {
      this.destroyGhost();
    } else if (view.held !== null && this.ghost !== null) {
      this.ghost.setTexture(
        PIECE_TEXTURE[this.pieceById(view.held.piece_id).type],
      );
      this.ghost.setAngle(view.held.rotation);
    }

    if (this.ghost !== null && !this.ghostFollowsPointer && !this.dragging) {
      const rect = this.focusRect();

      if (rect !== null) {
        this.ghost.setPosition(rect.x + rect.w / 2, rect.y - 14);
      }
    }

    // — Buttons.
    for (const button of this.buttons) {
      if (button.id === 'submit') {
        button.setEnabled(!closed);
      } else if (
        button.id === 'rotate' ||
        button.id === 'return' ||
        button.id === 'stop'
      ) {
        button.setEnabled(!closed);
      }
    }

    this.writeProbe(view);
  }

  private focusRect(): ProbeRect | null {
    if (this.focus.kind === 'cell') {
      const slot = M13_SLOT_IDS[this.focus.index];
      const { x, y } = this.cellOrigin(slot);

      return { x, y, w: L.cell, h: L.cell };
    }

    const { x, y } = this.benchOrigin(this.focus.index);

    return { x, y, w: L.benchCell, h: L.benchCell };
  }

  private emptyProbe(): PipeProbe {
    return {
      open: false,
      form: null,
      closed: false,
      cells: [],
      bench: [],
      held: null,
      focus: null,
      buttons: [],
      feedback: [],
      submissions_used: 0,
      max_submissions: 0,
      dragging: false,
      drop_target: null,
      drop_valid: false,
      help_open: false,
      confirm_open: false,
    };
  }

  private writeProbe(view: LatticeView) {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const probe: PipeProbe = {
      ...this.emptyProbe(),
      open: true,
      form: view.form,
      closed: view.closed,
      held: view.held === null ? null : { ...view.held },
      focus:
        this.focus.kind === 'cell'
          ? { kind: 'cell', id: M13_SLOT_IDS[this.focus.index] }
          : { kind: 'bench', id: String(this.focus.index) },
      feedback: [...view.feedback],
      submissions_used: view.submissions_used,
      max_submissions: view.max_submissions,
      dragging: this.dragging,
      drop_target:
        this.dropTarget === null
          ? null
          : this.dropTarget.kind === 'cell'
            ? (this.dropTarget.slot ?? null)
            : 'bench',
      drop_valid: this.dropValid,
      help_open: this.helpOpen,
      confirm_open: this.confirmOpen,
    };

    for (const slot of M13_SLOT_IDS) {
      const { x, y } = this.cellOrigin(slot);
      const placement = view.placements[slot];
      const port =
        slot === view.config.source.slot
          ? 'feed'
          : slot === view.config.outlet.slot
            ? 'intake'
            : null;

      probe.cells.push({
        slot,
        x,
        y,
        w: L.cell,
        h: L.cell,
        piece_id: placement?.piece_id ?? null,
        rotation: placement?.rotation ?? null,
        broken: slot === view.config.broken,
        port,
      });
    }

    M13_PIECES.forEach((piece, index) => {
      const { x, y } = this.benchOrigin(index);
      const onBench = view.bench.some(
        (candidate) => candidate.piece_id === piece.piece_id,
      );

      probe.bench.push({
        index,
        x,
        y,
        w: L.benchCell,
        h: L.benchCell,
        piece_id: onBench ? piece.piece_id : null,
        type: piece.type,
      });
    });

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

    window.__ipPipeProbe = probe;
    refreshIpProbe();
  }

  /** In-place restyle of cells during a drag (never rebuild mid-drag). */
  private restyleTargets() {
    for (const [slot, rect] of this.cellRects) {
      const isDrop =
        this.dropTarget?.kind === 'cell' && this.dropTarget.slot === slot;

      if (isDrop) {
        rect.setFillStyle(
          this.dropValid ? IP_COLORS.dropValidFill : IP_COLORS.invalid,
          1,
        );
        rect.setStrokeStyle(
          1,
          this.dropValid ? IP_COLORS.accent : IP_COLORS.invalid,
        );
      } else {
        rect.setFillStyle(rect.getData('baseFill') as number, 1);
        rect.setStrokeStyle(1, rect.getData('baseStroke') as number);
      }
    }

    if (this.benchRect !== null) {
      const isDrop = this.dropTarget?.kind === 'bench';

      this.benchRect.setStrokeStyle(
        1,
        isDrop ? IP_COLORS.accent : IP_COLORS.panelStroke,
      );
    }

    if (this.lastView !== null) {
      this.writeProbe(this.lastView);
    }
  }

  /* ---------------------------------------------------------------- *
   * Actions (every path ends in m13LatticeAct / m13LatticeSubmit)
   * ---------------------------------------------------------------- */

  private act(action: PipeAction, mode: InputMode): boolean {
    let ok = false;

    try {
      const result = m13LatticeAct(action, mode, Date.now());

      ok = result.ok;

      if (result.ok) {
        sfxUiSelect();
      } else if (
        result.reason !== 'not_holding' &&
        result.reason !== 'empty_slot'
      ) {
        sfxUnavailable();
      }
    } catch (error) {
      m13LatticeFail(Date.now(), String(error));
    }

    return ok;
  }

  private canEdit(): boolean {
    return (
      this.lastView !== null &&
      !this.lastView.closed &&
      !this.helpOpen &&
      !this.confirmOpen
    );
  }

  /** SPACE / click semantics: pick up, or place/return the held piece. */
  private pickOrPlaceAtFocus(mode: InputMode) {
    if (!this.canEdit() || this.lastView === null) {
      return;
    }

    const view = this.lastView;

    if (view.held !== null) {
      if (this.focus.kind === 'cell') {
        if (
          this.act(
            { kind: 'place', slot: M13_SLOT_IDS[this.focus.index] },
            mode,
          )
        ) {
          this.destroyGhost();
        }
      } else if (this.act({ kind: 'return_held' }, mode)) {
        this.destroyGhost();
      }
    } else if (this.focus.kind === 'cell') {
      if (
        this.act(
          { kind: 'pick_slot', slot: M13_SLOT_IDS[this.focus.index] },
          mode,
        )
      ) {
        this.ghostFollowsPointer = false;
      }
    } else {
      const piece = M13_PIECES[this.focus.index];

      if (this.act({ kind: 'pick_bench', piece_id: piece.piece_id }, mode)) {
        this.ghostFollowsPointer = false;
      }
    }

    this.refresh();
  }

  private rotateFocused(mode: InputMode) {
    if (!this.canEdit() || this.lastView === null) {
      return;
    }

    if (this.lastView.held !== null) {
      this.act({ kind: 'rotate_held' }, mode);
    } else {
      const slot =
        mode === 'pointer' && this.hoverSlot !== null
          ? this.hoverSlot
          : this.focus.kind === 'cell'
            ? M13_SLOT_IDS[this.focus.index]
            : null;

      if (slot === null) {
        sfxUnavailable();
      } else {
        this.act({ kind: 'rotate_slot', slot }, mode);
      }
    }

    this.refresh();
  }

  private returnFocused(mode: InputMode) {
    if (!this.canEdit() || this.lastView === null) {
      return;
    }

    if (this.lastView.held !== null) {
      if (this.act({ kind: 'return_held' }, mode)) {
        this.destroyGhost();
      }
    } else if (this.focus.kind === 'cell') {
      this.act(
        { kind: 'return_slot', slot: M13_SLOT_IDS[this.focus.index] },
        mode,
      );
    } else {
      sfxUnavailable();
    }

    this.refresh();
  }

  private submit(mode: InputMode) {
    if (
      this.helpOpen ||
      this.confirmOpen ||
      this.lastView === null ||
      this.lastView.closed
    ) {
      return;
    }

    try {
      m13LatticeSubmit(mode, Date.now());
      // Neutral tick whether the run was valid or not.
      sfxUiSelect();
    } catch (error) {
      m13LatticeFail(Date.now(), String(error));
    }

    this.destroyGhost();
    this.refresh();
  }

  private cancelHeld() {
    if (this.lastView?.held !== null) {
      this.act({ kind: 'cancel' }, 'pointer');
    }

    this.destroyGhost();
  }

  /* ---------------------------------------------------------------- *
   * Help + stop confirm
   * ---------------------------------------------------------------- */

  private openHelp(mode: InputMode) {
    if (this.helpOpen || this.confirmOpen) {
      return;
    }

    const lines = m13LatticeHelp(mode, Date.now());

    this.helpOpen = true;

    const backdrop = this.add
      .rectangle(400, 300, 560, 280, IP_COLORS.panel, 1)
      .setStrokeStyle(1, IP_COLORS.accent)
      .setDepth(IP_DEPTH.confirm)
      .setInteractive();
    const title = this.add
      .text(400, 178, 'HELP — LATTICE BENCH', {
        color: IP_TEXT.accent,
        font: IP_FONT.section,
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);
    const body = this.add
      .text(136, 200, lines.join('\n'), {
        color: IP_TEXT.text,
        font: IP_FONT.small,
        lineSpacing: 3,
        wordWrap: { width: 528 },
      })
      .setDepth(IP_DEPTH.confirm + 1);
    const footer = this.add
      .text(400, 422, 'ENTER / ESC / click — close help', {
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
        'Stop this task? The bench closes without a test run and cannot be reopened.',
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
      m13LatticeStop(Date.now());
      this.destroyGhost();
      sfxUiSelect();
    }

    this.refresh();
  }

  /* ---------------------------------------------------------------- *
   * Pointer pipeline
   * ---------------------------------------------------------------- */

  private targetOf(object: Phaser.GameObjects.GameObject): Target | null {
    return (object.getData(KIND_KEY) as Target | undefined) ?? null;
  }

  private dropValidFor(target: Target): boolean {
    if (this.lastView === null) {
      return false;
    }

    if (target.kind === 'cell' || target.kind === 'cell_piece') {
      const slot = target.slot!;

      return (
        slot !== this.lastView.config.broken &&
        this.lastView.placements[slot] === undefined
      );
    }

    return target.kind === 'bench' || target.kind === 'bench_piece';
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

        if (target === null || !this.canEdit() || pointer.rightButtonDown()) {
          return;
        }

        if (this.lastView?.held !== null) {
          return;
        }

        let picked = false;

        if (target.kind === 'cell_piece') {
          picked = this.act(
            { kind: 'pick_slot', slot: target.slot! },
            'pointer',
          );
          this.focus = {
            kind: 'cell',
            index: M13_SLOT_IDS.indexOf(target.slot!),
          };
        } else if (target.kind === 'bench_piece') {
          picked = this.act(
            { kind: 'pick_bench', piece_id: target.piece_id! },
            'pointer',
          );
          this.focus = { kind: 'bench', index: target.index ?? 0 };
        }

        if (!picked) {
          return;
        }

        this.dragging = true;
        (object as Phaser.GameObjects.Image).setAlpha(0.25);

        const view = m13LatticeView();

        this.lastView = view;
        this.spawnGhost(view.held!.piece_id, view.held!.rotation, true);
        this.ghost?.setPosition(pointer.x, pointer.y);
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
        _p: Phaser.Input.Pointer,
        _o: Phaser.GameObjects.GameObject,
        zone: Phaser.GameObjects.GameObject,
      ) => {
        if (!this.dragging) {
          return;
        }

        const target = this.targetOf(zone);

        if (target !== null) {
          this.dropTarget = target;
          this.dropValid = this.dropValidFor(target);
          this.restyleTargets();
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.DRAG_LEAVE,
      (
        _p: Phaser.Input.Pointer,
        _o: Phaser.GameObjects.GameObject,
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
          target.slot === this.dropTarget.slot
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
        _p: Phaser.Input.Pointer,
        _o: Phaser.GameObjects.GameObject,
        zone: Phaser.GameObjects.GameObject,
      ) => {
        if (!this.dragging) {
          return;
        }

        const target = this.targetOf(zone);

        if (target !== null) {
          this.pendingDrop = target;
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

      this.dragging = false;
      this.dropTarget = null;
      this.dropValid = false;
      this.pendingDrop = null;

      let resolved = false;

      if (drop !== null) {
        if (drop.kind === 'cell' || drop.kind === 'cell_piece') {
          resolved = this.act({ kind: 'place', slot: drop.slot! }, 'pointer');
        } else {
          resolved = this.act({ kind: 'return_held' }, 'pointer');
        }
      }

      if (!resolved) {
        // Invalid / no target: the piece goes safely home.
        this.act({ kind: 'cancel' }, 'pointer');

        if (drop !== null) {
          sfxUnavailable();
        }
      }

      this.destroyGhost();
      this.refresh();
    });

    this.input.on(
      Phaser.Input.Events.GAMEOBJECT_DOWN,
      (
        pointer: Phaser.Input.Pointer,
        object: Phaser.GameObjects.GameObject,
      ) => {
        const target = this.targetOf(object);

        if (target === null || !this.canEdit() || !pointer.rightButtonDown()) {
          return;
        }

        // Right-click: rotate the held piece, else the seated piece under
        // the pointer (never starts a drag).
        if (this.lastView?.held !== null) {
          this.act({ kind: 'rotate_held' }, 'pointer');
        } else if (target.kind === 'cell_piece' || target.kind === 'cell') {
          this.act({ kind: 'rotate_slot', slot: target.slot! }, 'pointer');
        }

        this.refresh();
      },
    );

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

        if (!this.canEdit() || this.lastView === null) {
          return;
        }

        const held = this.lastView.held;

        if (held !== null) {
          if (target.kind === 'cell' || target.kind === 'cell_piece') {
            if (this.act({ kind: 'place', slot: target.slot! }, 'pointer')) {
              this.destroyGhost();
            }
          } else if (this.act({ kind: 'return_held' }, 'pointer')) {
            this.destroyGhost();
          }
        } else if (target.kind === 'cell_piece') {
          if (this.act({ kind: 'pick_slot', slot: target.slot! }, 'pointer')) {
            this.focus = {
              kind: 'cell',
              index: M13_SLOT_IDS.indexOf(target.slot!),
            };
            this.ghostFollowsPointer = true;
          }
        } else if (target.kind === 'bench_piece') {
          if (
            this.act(
              { kind: 'pick_bench', piece_id: target.piece_id! },
              'pointer',
            )
          ) {
            this.focus = { kind: 'bench', index: target.index ?? 0 };
            this.ghostFollowsPointer = true;
          }
        } else if (target.kind === 'cell') {
          this.focus = {
            kind: 'cell',
            index: M13_SLOT_IDS.indexOf(target.slot!),
          };
        }

        this.refresh();

        if (this.ghostFollowsPointer && this.ghost !== null) {
          this.ghost.setPosition(pointer.x, pointer.y);
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.GAMEOBJECT_OVER,
      (_p: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject) => {
        const target = this.targetOf(object);

        if (target?.kind === 'cell' || target?.kind === 'cell_piece') {
          this.hoverSlot = target.slot ?? null;
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      (pointer: Phaser.Input.Pointer) => {
        if (this.ghost !== null && this.ghostFollowsPointer && !this.dragging) {
          this.ghost.setPosition(pointer.x, pointer.y);
        }
      },
    );
  }

  private spawnGhost(
    pieceId: string,
    rotation: M13Rotation,
    followsPointer: boolean,
  ) {
    this.destroyGhost();

    const piece = this.pieceById(pieceId);

    this.ghost = this.add
      .image(0, 0, PIECE_TEXTURE[piece.type])
      .setScale(L.pieceScale)
      .setAngle(rotation)
      .setAlpha(0.85)
      .setDepth(IP_DEPTH.ghost);
    this.ghostFollowsPointer = followsPointer;

    if (!followsPointer) {
      const rect = this.focusRect();

      if (rect !== null) {
        this.ghost.setPosition(rect.x + rect.w / 2, rect.y - 14);
      }
    }

    if (!prefersReducedMotion()) {
      this.tweens.add({
        targets: this.ghost,
        alpha: 0.6,
        duration: 420,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private destroyGhost() {
    this.ghost?.destroy();
    this.ghost = null;
    this.ghostFollowsPointer = false;
  }

  /* ---------------------------------------------------------------- *
   * Keyboard
   * ---------------------------------------------------------------- */

  private moveFocus(dx: number, dy: number) {
    if (this.focus.kind === 'cell') {
      const col = this.focus.index % 3;
      const row = Math.floor(this.focus.index / 3);
      const nextCol = Phaser.Math.Clamp(col + dx, 0, 2);
      const nextRow = row + dy;

      if (nextRow > 2) {
        this.focus = { kind: 'bench', index: nextCol };
      } else if (nextRow >= 0) {
        this.focus = { kind: 'cell', index: nextRow * 3 + nextCol };
      }
    } else {
      const col = this.focus.index % 3;
      const row = Math.floor(this.focus.index / 3);
      const nextCol = Phaser.Math.Clamp(col + dx, 0, 2);
      const nextRow = row + dy;

      if (nextRow < 0) {
        this.focus = { kind: 'cell', index: 6 + nextCol };
      } else if (nextRow <= 2) {
        this.focus = { kind: 'bench', index: nextRow * 3 + nextCol };
      }
    }

    this.ghostFollowsPointer = false;
    sfxUiMove();
    this.refresh();
  }

  private wireKeyboard() {
    const keyboard = this.input.keyboard!;
    const on = (eventName: string, handler: (event: KeyboardEvent) => void) =>
      keyboard.on(eventName, guardKeyHandler(handler));

    on('keydown-ESC', (event) => {
      if (event.repeat) {
        return;
      }

      if (this.confirmOpen) {
        this.closeStopConfirm(false);

        return;
      }

      if (this.helpOpen) {
        this.closeHelp();

        return;
      }

      if (this.lastView?.held !== null && this.lastView?.held !== undefined) {
        this.cancelHeld();
        this.refresh();

        return;
      }

      this.leave();
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

        return;
      }

      if (this.helpOpen) {
        this.closeHelp();

        return;
      }

      this.pickOrPlaceAtFocus('typed');
    });
    on('keydown-SPACE', (event) => {
      if (!event.repeat && !this.confirmOpen && !this.helpOpen) {
        this.pickOrPlaceAtFocus('typed');
      }
    });
    on('keydown-LEFT', () => this.guardedMove(-1, 0));
    on('keydown-RIGHT', () => this.guardedMove(1, 0));
    on('keydown-UP', () => this.guardedMove(0, -1));
    on('keydown-DOWN', () => this.guardedMove(0, 1));
    on('keydown-R', (event) => {
      if (!event.repeat) {
        this.rotateFocused('typed');
      }
    });
    on('keydown-DELETE', (event) => {
      if (!event.repeat) {
        this.returnFocused('typed');
      }
    });
    on('keydown-BACKSPACE', (event) => {
      if (!event.repeat) {
        this.returnFocused('typed');
      }
    });
    on('keydown-T', (event) => {
      if (!event.repeat) {
        this.submit('typed');
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
  }

  private guardedMove(dx: number, dy: number) {
    if (this.confirmOpen || this.helpOpen || this.dragging) {
      return;
    }

    this.moveFocus(dx, dy);
  }

  /* ---------------------------------------------------------------- *
   * Leave (ESC / I / X): held piece goes home, window stays open
   * ---------------------------------------------------------------- */

  private leave() {
    this.cancelHeld();
    m13LatticeLeave(Date.now());
    sfxUiSelect();
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }
}
