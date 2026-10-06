/**
 * Conduit Lattice Bench overlay (M13 — the three-network series, Station
 * 080 Unit 16, administration `m13-networks-v1`).
 *
 * A genuine manipulable pipe-network board: 3×3 mounts, the complete
 * standardised piece set on a bench, feed and intake ports, fractured
 * mounts. Mouse: drag (or click to pick up) a piece, drop/click a mount to
 * seat it, right-click rotates, drop on the bench (or DEL) returns.
 * Keyboard: arrows move a focus ring across mounts and bench, SPACE/ENTER
 * pick/place, R rotates, DEL returns, U undoes, C clears. Both paths call
 * exactly `m13LatticeAct` with the same semantic actions.
 *
 * The series (research-owner ruling D-U16-1) is presented in two phases,
 * all of it read from the pure model's view (`m13LatticeView`):
 * - first responses: networks 1 → 2 → 3, each answered once — RECORD
 *   LAYOUT (T) or CANNOT SOLVE (N), each behind a neutral confirmation
 *   that only a fresh press confirms — and acknowledged by one identical
 *   neutral line with NEXT NETWORK / SHOW RESULTS. There is no flow test
 *   here and nothing on screen or in sound depends on correctness;
 * - results and optional practice, only after the third answer: the three
 *   recorded answers with their structural lines, a practice board per
 *   network with TEST FLOW (at most three runs each), FINISH.
 * A stopped, review-closed, held-back or failed series opens as a
 * read-only record. Modal pause-and-launch (inventory precedent); ESC
 * cancels a held piece first, then a dialog, then leaves (the bench keeps
 * its state); I leaves.
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
import { fitOverlayScene } from '../../world/viewport';
import type { M13NetworkId } from '../m13NetworkForms';
import {
  M13N_PIECE_SHORT,
  M13N_SETTLE_MS,
  M13N_TEXT,
} from '../m13NetworkSeries';
import type { M13SeriesView, PipeAction } from '../m13PipeNetwork';
import {
  m13LatticeAct,
  m13LatticeBackToResults,
  m13LatticeCancelCommit,
  m13LatticeConfirmCommit,
  m13LatticeFail,
  m13LatticeFinish,
  m13LatticeHelp,
  m13LatticeLeave,
  m13LatticeNext,
  m13LatticeOpen,
  m13LatticeOpenPractice,
  m13LatticePracticeTest,
  m13LatticeRequestCommit,
  m13LatticeStop,
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
  /** True when no board can be edited (answered, read-only or a record). */
  closed: boolean;
  /** The series as the bench shows it. */
  series: {
    status: string;
    view: string;
    phase: string;
    header: string;
    network_id: string | null;
    network_index: number | null;
    editable: boolean;
    answered: { network_id: string; answered: boolean }[];
    practice_runs: { network_id: string; runs_used: number }[];
    practice_closed: string | null;
  } | null;
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
  /** The controls currently on screen. */
  buttons: (ProbeRect & { id: string; label: string; enabled: boolean })[];
  /** Console lines of the current view. */
  feedback: string[];
  /** Every line of text currently rendered on the bench. */
  lines: string[];
  /** One-line neutral description of the last successful board act. */
  last_action: string | null;
  undo_available: boolean;
  seated_count: number;
  /** Mount currently showing the seat/rotate flash (null when none). */
  snap_slot: string | null;
  dragging: boolean;
  drop_target: string | null;
  drop_valid: boolean;
  help_open: boolean;
  confirm_open: boolean;
  /** Which confirmation is open. */
  dialog: 'stop' | 'layout' | 'cannot_solve' | null;
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
  consoleButtonY: 352,
  buttonsY: 506,
  helpLineY: 544,
  pieceScale: 1.5,
  resultsX: 64,
  resultsY: 104,
  resultsStep: 116,
  practiseX: 436,
} as const;

const DIRECTION_DELTA = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
] as const;

/** Flow arrows: the feed points into the board, the intake out of it. */
const ARROW_IN = ['▼', '◀', '▲', '▶'] as const;
const ARROW_OUT = ['▲', '▶', '▼', '◀'] as const;

const NETWORK_KEYS: readonly [string, M13NetworkId][] = [
  ['ONE', 'n1'],
  ['TWO', 'n2'],
  ['THREE', 'n3'],
];

function slotXY(slot: M13SlotId): { col: number; row: number } {
  return { col: slot.charCodeAt(0) - 65, row: Number(slot[1]) - 1 };
}

export class PipeBoardScene extends Phaser.Scene {
  private resumeKey: string = key.scene.stationConcourse;

  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private buttons: UiButton[] = [];
  /** Ids of the controls on screen in the current view. */
  private shownButtons = new Set<string>();
  /** Static board / bench / console surfaces (hidden on text-only views). */
  private surfaces: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text)[] =
    [];
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
  private helpLines: string[] = [];
  /** STOP TASK confirmation. */
  private confirmOpen = false;
  private confirmObjects: Phaser.GameObjects.GameObject[] = [];
  /** RECORD LAYOUT / CANNOT SOLVE confirmation (driven by the model). */
  private commitObjects: Phaser.GameObjects.GameObject[] = [];
  private commitShown: 'layout' | 'cannot_solve' | null = null;
  private lastView: M13SeriesView | null = null;
  /** What the board currently shows (focus resets when it changes). */
  private boardKey = '';
  /** When the last pointer press went down (fresh-press rule). */
  private pointerDownAt = 0;
  /** When the current acknowledgement appeared. */
  private acknowledgedAt = 0;
  private rendered: string[] = [];
  /** Seat/rotate flash: the mount that just changed (static highlight). */
  private snapSlot: M13SlotId | null = null;
  private snapTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super(key.scene.ipPipeBoard);
  }

  init(data?: IpOverlayLaunchData) {
    this.resumeKey = data?.resumeKey ?? key.scene.stationConcourse;
  }

  create() {
    this.dynamic = [];
    this.buttons = [];
    this.shownButtons = new Set();
    this.surfaces = [];
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
    this.helpLines = [];
    this.confirmOpen = false;
    this.confirmObjects = [];
    this.commitObjects = [];
    this.commitShown = null;
    this.lastView = null;
    this.boardKey = '';
    this.pointerDownAt = 0;
    this.acknowledgedAt = 0;
    this.rendered = [];
    this.snapSlot = null;
    this.snapTimer = null;

    // Render above the host no matter where this class sorts in the
    // alphabetical scene registry (src/index.ts spreads Object.values of
    // the barrel, and module namespaces enumerate exports sorted by name;
    // a scene that sorts before its host would otherwise render beneath it).
    this.scene.bringToTop();
    // V4: 800×600 design space on the 1280×720 canvas (viewport.ts).
    // Pointer hit-tests in this scene use pointer.worldX/Y — the pointer in
    // THIS camera's (design) space; pointer.x/y are canvas pixels.
    fitOverlayScene(this);

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
      .text(IP_PANEL.x + 16, L.titleY, M13N_TEXT.title, {
        color: IP_TEXT.text,
        font: IP_FONT.title,
      })
      .setOrigin(0, 0.5)
      .setDepth(IP_DEPTH.content);

    // Static surfaces: board frame, bench frame, console frame.
    this.surfaces.push(
      this.section(
        L.boardX - 28,
        L.boardY - 30,
        3 * (L.cell + L.gap) + 50,
        3 * (L.cell + L.gap) + 56,
      ),
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
    this.surfaces.push(
      this.benchRect,
      this.section(L.consoleX, L.consoleY - 6, L.consoleW, 366),
      this.add
        .text(L.benchX - 2, L.benchY - 22, M13N_TEXT.bench_label, {
          color: IP_TEXT.dim,
          font: IP_FONT.small,
        })
        .setDepth(IP_DEPTH.content),
      this.add
        .text(L.consoleX + 6, L.consoleY - 2, M13N_TEXT.console_label, {
          color: IP_TEXT.dim,
          font: IP_FONT.small,
        })
        .setDepth(IP_DEPTH.content),
    );

    const bottom = (
      id: string,
      x: number,
      width: number,
      label: string,
      onActivate: () => void,
      kind?: 'accent' | 'caution',
    ) =>
      new UiButton({
        scene: this,
        id,
        x,
        y: L.buttonsY,
        width,
        label,
        depth: IP_DEPTH.content,
        onActivate,
        ...(kind === undefined ? {} : { kind }),
      });
    const primaryX = 592;
    const primaryW = 152;
    const consoleButton = (id: string, label: string, onActivate: () => void) =>
      new UiButton({
        scene: this,
        id,
        x: L.consoleX + 6,
        y: L.consoleButtonY,
        width: L.consoleW - 12,
        label,
        depth: IP_DEPTH.content,
        onActivate,
      });

    this.buttons.push(
      new UiButton({
        scene: this,
        id: 'close',
        x: IP_PANEL.x + IP_PANEL.width - 40,
        y: IP_PANEL.y + 4,
        width: 32,
        label: M13N_TEXT.close,
        depth: IP_DEPTH.panel + 1,
        onActivate: () => this.leave(),
      }),
      // STOP TASK sits at the far end of the row from the answer controls.
      bottom(
        'stop',
        40,
        96,
        M13N_TEXT.stop_task,
        () => this.openStopConfirm(),
        'caution',
      ),
      bottom('rotate', 146, 92, M13N_TEXT.rotate, () =>
        this.rotateFocused('pointer'),
      ),
      bottom('return', 244, 100, M13N_TEXT.return_piece, () =>
        this.returnFocused('pointer'),
      ),
      bottom('undo', 350, 84, M13N_TEXT.undo, () => this.undoLast('pointer')),
      bottom('reset', 440, 88, M13N_TEXT.clear, () =>
        this.resetBoard('pointer'),
      ),
      bottom('help', 534, 50, M13N_TEXT.help, () => this.openHelp('pointer')),
      // One control position, four roles (never two at once).
      bottom(
        'record_layout',
        primaryX,
        primaryW,
        M13N_TEXT.record_layout,
        () => this.requestCommit('layout', 'pointer'),
        'accent',
      ),
      bottom(
        'next',
        primaryX,
        primaryW,
        M13N_TEXT.next_network,
        () => this.next(),
        'accent',
      ),
      bottom(
        'test_flow',
        primaryX,
        primaryW,
        M13N_TEXT.test_flow,
        () => this.practiceTest('pointer'),
        'accent',
      ),
      bottom(
        'finish',
        primaryX,
        primaryW,
        M13N_TEXT.finish,
        () => this.finish(),
        'accent',
      ),
      consoleButton('cannot_solve', M13N_TEXT.cannot_solve, () =>
        this.requestCommit('cannot_solve', 'pointer'),
      ),
      consoleButton('back_to_results', M13N_TEXT.back_to_results, () =>
        this.backToResults(),
      ),
      ...NETWORK_KEYS.map(
        ([, networkId], index) =>
          new UiButton({
            scene: this,
            id: `practise_${networkId}`,
            x: L.practiseX,
            y: L.resultsY + index * L.resultsStep,
            width: 300,
            label: '',
            depth: IP_DEPTH.content,
            onActivate: () => this.openPractice(networkId),
          }),
      ),
    );

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
    return this.add
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

    if (value !== '') {
      this.rendered.push(value);
    }

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

  /** True when the current view shows a board (network / answer / practice). */
  private boardShown(view: M13SeriesView): boolean {
    return view.network !== null;
  }

  private refresh() {
    for (const object of this.dynamic) {
      object.destroy();
    }

    this.dynamic = [];
    this.cellRects.clear();
    this.cellImages.clear();
    this.benchImages.clear();
    this.focusRing = null;
    this.rendered = [M13N_TEXT.title];

    let view: M13SeriesView;

    try {
      view = m13LatticeView();
    } catch (error) {
      this.fail(`view: ${String(error)}`);
      view = m13LatticeView();
    }

    const previous = this.lastView;

    this.lastView = view;

    const board = this.boardShown(view);
    const nextBoardKey = `${view.view}:${view.network?.network_id ?? ''}`;

    if (nextBoardKey !== this.boardKey) {
      // A new network or view: the focus starts at the first mount and no
      // flash or hover is carried over.
      this.boardKey = nextBoardKey;
      this.focus = { kind: 'cell', index: 0 };
      this.hoverSlot = null;
      this.snapSlot = null;
    }

    if (view.view === 'acknowledgement' && previous?.view !== view.view) {
      this.acknowledgedAt = Date.now();
    }

    for (const surface of this.surfaces) {
      surface.setVisible(board);
    }

    if (board) {
      this.rendered.push(M13N_TEXT.bench_label, M13N_TEXT.console_label);
    }

    // Which network (and, in practice, that it is practice).
    this.text(IP_PANEL.x + IP_PANEL.width - 56, L.titleY, view.header, {
      color: IP_TEXT.accent,
      font: IP_FONT.section,
    }).setOrigin(1, 0.5);

    this.text(56, L.instrY, view.instruction, {
      color: board ? IP_TEXT.dim : IP_TEXT.text,
      font: board ? IP_FONT.small : IP_FONT.body,
      lineSpacing: 2,
      wordWrap: { width: 688 },
    });

    if (!board) {
      this.destroyGhost();
    }

    if (board) {
      this.renderBoard(view);
    } else if (view.results !== null) {
      this.renderResults(view);
    } else {
      this.text(L.resultsX, L.resultsY, view.record_lines.join('\n\n'), {
        color: IP_TEXT.text,
        font: IP_FONT.body,
        lineSpacing: 4,
        wordWrap: { width: 660 },
      });
    }

    this.text(400, L.helpLineY, view.hint, {
      color: IP_TEXT.dim,
      font: IP_FONT.small,
      wordWrap: { width: 700 },
      align: 'center',
    }).setOrigin(0.5);

    this.reconcileCommitDialog(view);
    this.layoutButtons(view);
    this.writeProbe(view);
  }

  private renderBoard(view: M13SeriesView) {
    const network = view.network!;
    const config = network.config;
    const editable = view.editable;

    // — Board cells.
    for (const slot of M13_SLOT_IDS) {
      const { x, y } = this.cellOrigin(slot);
      const broken = network.blocked.includes(slot);
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
          this.snapSlot === slot ? 3 : 1,
          (isDrop && this.dropValid) || this.snapSlot === slot
            ? IP_COLORS.accent
            : broken
              ? 0x5a3a3a
              : IP_COLORS.slotStroke,
        )
        .setDepth(IP_DEPTH.content);

      rect.setData(KIND_KEY, { kind: 'cell', slot } satisfies Target);
      rect.setData('baseFill', broken ? 0x1a1416 : IP_COLORS.slot);
      rect.setData('baseStroke', broken ? 0x5a3a3a : IP_COLORS.slotStroke);

      if (editable) {
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
          M13N_TEXT.fractured,
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

        if (editable) {
          image.setInteractive({ draggable: true, useHandCursor: true });
        }

        this.cellImages.set(slot, image);
      }
    }

    // Ports (the board of each network differs in where they sit).
    const portLabel = (
      slot: M13SlotId,
      direction: number,
      label: string,
      arrow: string,
    ) => {
      const { x, y } = this.cellOrigin(slot);
      const delta = DIRECTION_DELTA[direction];
      const cx = x + L.cell / 2 + delta.dx * (L.cell / 2 + 26);
      const cy = y + L.cell / 2 + delta.dy * (L.cell / 2 + 16);

      this.text(cx, cy, `${label}\n${arrow}`, {
        color: IP_TEXT.accent,
        font: 'bold 10px monospace',
        align: 'center',
      }).setOrigin(0.5);
    };

    portLabel(
      config.source.slot,
      config.source.direction,
      M13N_TEXT.feed,
      ARROW_IN[config.source.direction],
    );
    portLabel(
      config.outlet.slot,
      config.outlet.direction,
      M13N_TEXT.intake,
      ARROW_OUT[config.outlet.direction],
    );

    // — Bench slots (stable home per piece).
    M13_PIECES.forEach((piece, index) => {
      const { x, y } = this.benchOrigin(index);
      const onBench = view.bench.includes(piece.piece_id);
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
        M13N_PIECE_SHORT[piece.type],
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

        if (editable) {
          image.setInteractive({ draggable: true, useHandCursor: true });
        }

        this.benchImages.set(piece.piece_id, image);
      }
    });

    // — Console: the view's own lines (status, acknowledgement or, in
    // practice only, the structural lines of a test run), last act, held.
    this.text(L.consoleX + 6, L.consoleY + 14, view.console_lines.join('\n'), {
      color: IP_TEXT.text,
      font: IP_FONT.small,
      lineSpacing: 3,
      wordWrap: { width: L.consoleW - 12 },
    });

    this.text(L.consoleX + 6, L.consoleY + 250, view.last_action ?? '', {
      color: IP_TEXT.accent,
      font: IP_FONT.small,
      wordWrap: { width: L.consoleW - 12 },
    });
    this.text(
      L.consoleX + 6,
      L.consoleY + 292,
      view.held === null
        ? M13N_TEXT.holding_nothing
        : `Holding: ${this.pieceById(view.held.piece_id).label} (${view.held.rotation}°)`,
      {
        color: IP_TEXT.accent,
        font: IP_FONT.small,
        wordWrap: { width: L.consoleW - 12 },
      },
    );
    this.text(
      L.consoleX + 6,
      L.consoleY + 326,
      `${config.feed_label} → ${config.intake_label}`,
      {
        color: IP_TEXT.faint,
        font: '9px monospace',
        wordWrap: { width: L.consoleW - 12 },
      },
    );

    // — Focus ring.
    const focusRect = this.focusRect();

    if (focusRect !== null && editable) {
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
  }

  /** The three recorded answers with their structural lines (phase two only). */
  private renderResults(view: M13SeriesView) {
    for (const [index, block] of (view.results ?? []).entries()) {
      const y = L.resultsY + index * L.resultsStep;

      this.text(L.resultsX, y, block.label, {
        color: IP_TEXT.accent,
        font: IP_FONT.section,
      });
      this.text(L.resultsX + 12, y + 24, block.lines.join('\n'), {
        color: IP_TEXT.text,
        font: IP_FONT.small,
        lineSpacing: 4,
      });
    }

    this.text(L.resultsX, 452, view.record_lines.join('\n'), {
      color: IP_TEXT.dim,
      font: IP_FONT.small,
      lineSpacing: 3,
      wordWrap: { width: 672 },
    });
  }

  /** Shows the controls of the current view and nothing else. */
  private layoutButtons(view: M13SeriesView) {
    const board = this.boardShown(view);
    const controls = view.controls;
    const shown = new Map<string, boolean>([['close', true]]);
    const blocked = this.helpOpen || this.confirmOpen || this.commitShown;

    if (board) {
      shown.set('rotate', view.editable);
      shown.set('return', view.editable);
      shown.set('undo', view.editable && view.undo_available);
      shown.set('reset', view.editable && view.seated_count > 0);
    }

    if (board || view.results !== null) {
      shown.set('help', controls.help);
    }

    if (view.view === 'network' || view.view === 'acknowledgement') {
      shown.set('stop', controls.stop);
    }

    if (view.view === 'network') {
      shown.set('record_layout', controls.record_layout);
      shown.set('cannot_solve', controls.cannot_solve);
    } else if (view.view === 'acknowledgement') {
      shown.set('next', controls.next !== null);
    } else if (view.view === 'practice') {
      shown.set('test_flow', controls.test_flow);
      shown.set('back_to_results', controls.back_to_results);
    } else if (view.view === 'results' && controls.finish) {
      shown.set('finish', true);
    }

    for (const practise of controls.practise) {
      shown.set(`practise_${practise.network_id}`, true);
    }

    this.shownButtons = new Set(shown.keys());

    for (const button of this.buttons) {
      if (
        button.id === 'confirm_stop' ||
        button.id === 'cancel_stop' ||
        button.id === 'confirm_commit' ||
        button.id === 'cancel_commit'
      ) {
        this.shownButtons.add(button.id);
        continue;
      }

      const visible = shown.has(button.id);

      button.setVisible(visible);
      button.setEnabled(visible && shown.get(button.id) === true && !blocked);

      if (button.id === 'next' && controls.next !== null) {
        button.setLabel(
          controls.next === 'show_results'
            ? M13N_TEXT.show_results
            : M13N_TEXT.next_network,
        );
      }

      const practise = controls.practise.find(
        (control) => `practise_${control.network_id}` === button.id,
      );

      if (practise !== undefined) {
        button.setLabel(practise.label);
      }
    }
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
      series: null,
      cells: [],
      bench: [],
      held: null,
      focus: null,
      buttons: [],
      feedback: [],
      lines: [],
      last_action: null,
      undo_available: false,
      seated_count: 0,
      snap_slot: null,
      dragging: false,
      drop_target: null,
      drop_valid: false,
      help_open: false,
      confirm_open: false,
      dialog: null,
    };
  }

  private writeProbe(view: M13SeriesView) {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const board = this.boardShown(view);
    const lines = [...this.rendered];
    const probe: PipeProbe = {
      ...this.emptyProbe(),
      open: true,
      form: view.form,
      closed: !view.editable,
      series: {
        status: view.status,
        view: view.view,
        phase: view.phase,
        header: view.header,
        network_id: view.network?.network_id ?? null,
        network_index: view.network?.network_index ?? null,
        editable: view.editable,
        answered: view.answered,
        practice_runs: view.practice_runs,
        practice_closed: view.practice_closed,
      },
      held: view.held === null ? null : { ...view.held },
      focus: !board
        ? null
        : this.focus.kind === 'cell'
          ? { kind: 'cell', id: M13_SLOT_IDS[this.focus.index] }
          : { kind: 'bench', id: String(this.focus.index) },
      feedback: [...view.console_lines],
      last_action: view.last_action,
      undo_available: view.undo_available,
      seated_count: view.seated_count,
      snap_slot: this.snapSlot,
      dragging: this.dragging,
      drop_target:
        this.dropTarget === null
          ? null
          : this.dropTarget.kind === 'cell'
            ? (this.dropTarget.slot ?? null)
            : 'bench',
      drop_valid: this.dropValid,
      help_open: this.helpOpen,
      confirm_open: this.confirmOpen || this.commitShown !== null,
      dialog: this.confirmOpen ? 'stop' : this.commitShown,
    };

    if (board) {
      const network = view.network!;

      for (const slot of M13_SLOT_IDS) {
        const { x, y } = this.cellOrigin(slot);
        const placement = view.placements[slot];
        const port =
          slot === network.config.source.slot
            ? 'feed'
            : slot === network.config.outlet.slot
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
          broken: network.blocked.includes(slot),
          port,
        });
      }

      M13_PIECES.forEach((piece, index) => {
        const { x, y } = this.benchOrigin(index);
        const onBench = view.bench.includes(piece.piece_id);

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
    }

    for (const button of this.buttons) {
      if (!this.shownButtons.has(button.id)) {
        continue;
      }

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
      lines.push(button.label());
    }

    if (this.helpOpen) {
      lines.push(
        M13N_TEXT.help_title,
        ...this.helpLines,
        M13N_TEXT.help_footer,
      );
    }

    if (this.confirmOpen) {
      lines.push(M13N_TEXT.stop_question);
    }

    if (view.pending_commit !== null) {
      lines.push(view.pending_commit.question);
    }

    probe.lines = lines;
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
   * Board actions (every path ends in m13LatticeAct)
   * ---------------------------------------------------------------- */

  /**
   * Closes the bench as a fault. If even that cannot be recorded the error
   * stops here: the overlay must still redraw and stay leavable.
   */
  private fail(detail: string) {
    try {
      m13LatticeFail(Date.now(), detail);
    } catch {
      // Nothing more can be recorded.
    }
  }

  /** Runs one store call; a throw closes the bench as a fault, never stuck. */
  private guarded<T>(fallback: T, run: () => T): T {
    try {
      return run();
    } catch (error) {
      this.fail(String(error));

      return fallback;
    }
  }

  private act(action: PipeAction, mode: InputMode): boolean {
    let ok = false;

    try {
      const result = m13LatticeAct(action, mode, Date.now());

      ok = result.ok;

      if (result.ok) {
        sfxUiSelect();

        // Snap / rotate feedback: the changed mount flashes (static
        // highlight — reduced-motion safe) for a short beat.
        if (action.kind === 'place' || action.kind === 'rotate_slot') {
          this.markSnap(action.slot as M13SlotId);
        } else if (action.kind === 'rotate_held') {
          this.markSnap(null);
        }
      } else if (
        result.reason !== 'not_holding' &&
        result.reason !== 'empty_slot'
      ) {
        sfxUnavailable();
      }
    } catch (error) {
      this.fail(String(error));
    }

    return ok;
  }

  private dialogOpen(): boolean {
    return this.helpOpen || this.confirmOpen || this.commitShown !== null;
  }

  private canEdit(): boolean {
    return (
      this.lastView !== null && this.lastView.editable && !this.dialogOpen()
    );
  }

  /**
   * Static seat/rotate highlight on one mount (700 ms), then cleared. The
   * timer never rebuilds the board while a drag is in flight (a rebuild
   * would destroy the dragged piece); the highlight then simply drops at
   * the next act-driven refresh.
   */
  private markSnap(slot: M13SlotId | null) {
    this.snapSlot = slot;
    this.snapTimer?.remove(false);
    this.snapTimer = null;

    if (slot !== null) {
      this.snapTimer = this.time.delayedCall(700, () => {
        this.snapTimer = null;

        if (this.snapSlot === slot) {
          this.snapSlot = null;

          // Restyle the mount in place — never rebuild from a timer.
          const rect = this.cellRects.get(slot);

          if (rect !== undefined && rect.active) {
            rect.setStrokeStyle(
              1,
              (rect.getData('baseStroke') as number | undefined) ??
                IP_COLORS.slotStroke,
            );
          }

          if (this.lastView !== null) {
            this.writeProbe(this.lastView);
          }
        }
      });
    }
  }

  /** UNDO (U / button): revert the last committed board change. */
  private undoLast(mode: InputMode) {
    if (!this.canEdit() || this.lastView === null) {
      return;
    }

    if (this.lastView.held !== null) {
      this.cancelHeld();
    }

    if (!this.act({ kind: 'undo' }, mode)) {
      sfxUnavailable();
    }

    this.destroyGhost();
    this.markSnap(null);
    this.refresh();
  }

  /** CLEAR (C / button): every seated piece returns to the bench. */
  private resetBoard(mode: InputMode) {
    if (!this.canEdit() || this.lastView === null) {
      return;
    }

    if (this.lastView.held !== null) {
      this.cancelHeld();
    }

    if (!this.act({ kind: 'reset_board' }, mode)) {
      sfxUnavailable();
    }

    this.destroyGhost();
    this.markSnap(null);
    this.refresh();
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

  private cancelHeld() {
    if (this.lastView?.held !== null && this.lastView?.held !== undefined) {
      this.act({ kind: 'cancel' }, 'pointer');
    }

    this.destroyGhost();
  }

  /* ---------------------------------------------------------------- *
   * The series: commitment, acknowledgement, results, practice
   * ---------------------------------------------------------------- */

  /** RECORD LAYOUT (T) / CANNOT SOLVE (N): opens the neutral confirmation. */
  private requestCommit(kind: 'layout' | 'cannot_solve', mode: InputMode) {
    if (
      this.dialogOpen() ||
      this.dragging ||
      this.lastView?.view !== 'network'
    ) {
      return;
    }

    this.destroyGhost();

    if (
      this.guarded(false, () => m13LatticeRequestCommit(kind, mode, Date.now()))
    ) {
      sfxPromptOpen();
    }

    this.refresh();
  }

  /** KEEP WORKING / ESC: the network stays open without an answer. */
  private cancelCommit(mode: InputMode) {
    this.guarded(undefined, () => m13LatticeCancelCommit(mode, Date.now()));
    this.refresh();
  }

  /**
   * RECORD ANSWER / RECORD. The store decides whether the press is fresh;
   * the tick is the same whatever was recorded.
   */
  private confirmCommit(mode: InputMode, repeat: boolean, downAt: number) {
    const outcome = this.guarded('none' as const, () =>
      m13LatticeConfirmCommit({ repeat, down_at_ms: downAt }, mode, Date.now()),
    );

    if (outcome === 'recorded') {
      sfxUiSelect();
    }

    this.refresh();
  }

  /** Builds or removes the commitment dialog to match the store. */
  private reconcileCommitDialog(view: M13SeriesView) {
    const pending = view.pending_commit;

    if (pending === null) {
      if (this.commitShown !== null) {
        this.destroyCommitDialog();
      }

      return;
    }

    this.rendered.push(pending.question);

    if (this.commitShown === pending.kind) {
      return;
    }

    this.destroyCommitDialog();
    this.commitShown = pending.kind;

    const scrim = this.add
      .rectangle(0, 0, 800, 600, 0x000000, 0.5)
      .setOrigin(0)
      .setDepth(IP_DEPTH.confirm - 1)
      .setInteractive();
    const backdrop = this.add
      .rectangle(400, 300, 540, 150, IP_COLORS.panel, 1)
      .setStrokeStyle(1, IP_COLORS.accent)
      .setDepth(IP_DEPTH.confirm)
      .setInteractive();
    const body = this.add
      .text(400, 274, pending.question, {
        color: IP_TEXT.text,
        font: IP_FONT.body,
        align: 'center',
        lineSpacing: 3,
        wordWrap: { width: 500 },
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);

    this.buttons.push(
      new UiButton({
        scene: this,
        id: 'confirm_commit',
        x: 200,
        y: 326,
        width: 196,
        label: pending.confirm_label,
        kind: 'accent',
        depth: IP_DEPTH.confirm + 1,
        onActivate: () =>
          this.confirmCommit('pointer', false, this.pointerDownAt),
      }),
      new UiButton({
        scene: this,
        id: 'cancel_commit',
        x: 416,
        y: 326,
        width: 184,
        label: pending.cancel_label,
        depth: IP_DEPTH.confirm + 1,
        onActivate: () => this.cancelCommit('pointer'),
      }),
    );
    this.commitObjects = [scrim, backdrop, body];
  }

  private destroyCommitDialog() {
    for (const object of this.commitObjects) {
      object.destroy();
    }

    this.commitObjects = [];
    this.commitShown = null;
    this.buttons = this.buttons.filter((button) => {
      if (button.id === 'confirm_commit' || button.id === 'cancel_commit') {
        button.destroy();

        return false;
      }

      return true;
    });
  }

  /** NEXT NETWORK / SHOW RESULTS (ENTER or the button). */
  private next() {
    if (this.dialogOpen() || this.lastView?.view !== 'acknowledgement') {
      return;
    }

    // The acknowledgement stays on screen for a beat whatever was pressed.
    if (Date.now() - this.acknowledgedAt < M13N_SETTLE_MS) {
      return;
    }

    if (
      this.guarded('none' as const, () => m13LatticeNext(Date.now())) !== 'none'
    ) {
      sfxUiSelect();
    }

    this.destroyGhost();
    this.refresh();
  }

  private openPractice(networkId: M13NetworkId) {
    if (this.dialogOpen() || this.lastView?.view !== 'results') {
      return;
    }

    if (
      this.guarded(false, () => m13LatticeOpenPractice(networkId, Date.now()))
    ) {
      sfxUiSelect();
    }

    this.refresh();
  }

  /** TEST FLOW (T) — exists on a practice board only. */
  private practiceTest(mode: InputMode) {
    if (
      this.dialogOpen() ||
      this.dragging ||
      this.lastView?.view !== 'practice'
    ) {
      return;
    }

    const outcome = this.guarded(null, () =>
      m13LatticePracticeTest(mode, Date.now()),
    );

    if (outcome?.recorded === true) {
      // Neutral tick whether the run was sealed or not.
      sfxUiSelect();
    }

    this.destroyGhost();
    this.refresh();
  }

  private backToResults() {
    if (this.dialogOpen() || this.lastView?.view !== 'practice') {
      return;
    }

    this.cancelHeld();

    if (this.guarded(false, () => m13LatticeBackToResults(Date.now()))) {
      sfxUiSelect();
    }

    this.refresh();
  }

  private finish() {
    if (this.dialogOpen() || this.lastView?.view !== 'results') {
      return;
    }

    if (this.guarded(false, () => m13LatticeFinish(Date.now()))) {
      sfxUiSelect();
    }

    this.refresh();
  }

  /* ---------------------------------------------------------------- *
   * Help + stop confirm
   * ---------------------------------------------------------------- */

  private openHelp(mode: InputMode) {
    if (
      this.dialogOpen() ||
      this.dragging ||
      this.lastView?.controls.help !== true
    ) {
      return;
    }

    // A held piece goes home first: nothing is left in the hand behind a
    // dialog (the commitment dialogs do the same in the store).
    this.cancelHeld();

    const lines = this.guarded([] as string[], () =>
      m13LatticeHelp(mode, Date.now()),
    );

    if (lines.length === 0) {
      this.refresh();

      return;
    }

    this.helpOpen = true;
    this.helpLines = lines;

    const scrim = this.add
      .rectangle(0, 0, 800, 600, 0x000000, 0.5)
      .setOrigin(0)
      .setDepth(IP_DEPTH.confirm - 1)
      .setInteractive();

    const backdrop = this.add
      .rectangle(400, 300, 580, 320, IP_COLORS.panel, 1)
      .setStrokeStyle(1, IP_COLORS.accent)
      .setDepth(IP_DEPTH.confirm)
      .setInteractive();
    const title = this.add
      .text(400, 158, M13N_TEXT.help_title, {
        color: IP_TEXT.accent,
        font: IP_FONT.section,
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);
    const body = this.add
      .text(126, 180, lines.join('\n'), {
        color: IP_TEXT.text,
        font: IP_FONT.small,
        lineSpacing: 3,
        wordWrap: { width: 548 },
      })
      .setDepth(IP_DEPTH.confirm + 1);
    const footer = this.add
      .text(400, 444, M13N_TEXT.help_footer, {
        color: IP_TEXT.dim,
        font: IP_FONT.small,
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);

    backdrop.on('pointerup', () => this.closeHelp());
    this.helpObjects = [scrim, backdrop, title, body, footer];
    this.refresh();
  }

  private closeHelp() {
    if (!this.helpOpen) {
      return;
    }

    this.helpOpen = false;
    this.helpLines = [];

    for (const object of this.helpObjects) {
      object.destroy();
    }

    this.helpObjects = [];
    this.refresh();
  }

  private openStopConfirm() {
    if (
      this.dialogOpen() ||
      this.dragging ||
      this.lastView?.controls.stop !== true
    ) {
      return;
    }

    this.cancelHeld();
    this.confirmOpen = true;

    const scrim = this.add
      .rectangle(0, 0, 800, 600, 0x000000, 0.5)
      .setOrigin(0)
      .setDepth(IP_DEPTH.confirm - 1)
      .setInteractive();
    const backdrop = this.add
      .rectangle(400, 300, 480, 130, IP_COLORS.panel, 1)
      .setStrokeStyle(1, IP_COLORS.caution)
      .setDepth(IP_DEPTH.confirm)
      .setInteractive();
    const body = this.add
      .text(400, 278, M13N_TEXT.stop_question, {
        color: IP_TEXT.text,
        font: IP_FONT.body,
        align: 'center',
        wordWrap: { width: 440 },
      })
      .setOrigin(0.5)
      .setDepth(IP_DEPTH.confirm + 1);

    this.buttons.push(
      new UiButton({
        scene: this,
        id: 'confirm_stop',
        x: 250,
        y: 318,
        width: 130,
        label: M13N_TEXT.stop_confirm,
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
        label: M13N_TEXT.stop_keep,
        depth: IP_DEPTH.confirm + 1,
        onActivate: () => this.closeStopConfirm(false),
      }),
    );
    this.confirmObjects = [scrim, backdrop, body];
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
      this.guarded(undefined, () => m13LatticeStop(Date.now()));
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
    if (this.lastView === null || this.lastView.network === null) {
      return false;
    }

    if (target.kind === 'cell' || target.kind === 'cell_piece') {
      const slot = target.slot!;

      return (
        !this.lastView.network.blocked.includes(slot) &&
        this.lastView.placements[slot] === undefined
      );
    }

    return target.kind === 'bench' || target.kind === 'bench_piece';
  }

  private wirePointer() {
    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer) => {
        if (pointer.button === 0) {
          this.pointerDownAt = Date.now();
        }
      },
    );

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
        this.ghost?.setPosition(pointer.worldX, pointer.worldY);
        this.restyleTargets();
      },
    );

    this.input.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer) => {
      if (this.dragging) {
        this.ghost?.setPosition(pointer.worldX, pointer.worldY);
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
          this.ghost.setPosition(pointer.worldX, pointer.worldY);
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
      Phaser.Input.Events.GAMEOBJECT_OUT,
      (_p: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject) => {
        const target = this.targetOf(object);

        if (
          (target?.kind === 'cell' || target?.kind === 'cell_piece') &&
          this.hoverSlot === target.slot
        ) {
          this.hoverSlot = null;
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      (pointer: Phaser.Input.Pointer) => {
        if (this.ghost !== null && this.ghostFollowsPointer && !this.dragging) {
          this.ghost.setPosition(pointer.worldX, pointer.worldY);
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

      // A held piece first, then a dialog, then leave.
      if (this.lastView?.held !== null && this.lastView?.held !== undefined) {
        this.cancelHeld();
        this.refresh();

        return;
      }

      if (this.confirmOpen) {
        this.closeStopConfirm(false);

        return;
      }

      if (this.commitShown !== null) {
        this.cancelCommit('typed');

        return;
      }

      if (this.helpOpen) {
        this.closeHelp();

        return;
      }

      this.leave();
    });
    on('keydown-I', (event) => {
      if (!event.repeat && !this.dialogOpen()) {
        this.leave();
      }
    });
    on('keydown-ENTER', (event) => {
      // The commitment dialog sees every press, repeats included: the store
      // refuses and records the ones that are not fresh.
      if (this.commitShown !== null) {
        this.confirmCommit('typed', event.repeat, Date.now());

        return;
      }

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

      if (this.lastView?.view === 'acknowledgement') {
        this.next();

        return;
      }

      this.pickOrPlaceAtFocus('typed');
    });
    on('keydown-SPACE', (event) => {
      if (!event.repeat && !this.dialogOpen()) {
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
    on('keydown-U', (event) => {
      if (!event.repeat) {
        this.undoLast('typed');
      }
    });
    on('keydown-C', (event) => {
      if (!event.repeat) {
        this.resetBoard('typed');
      }
    });
    on('keydown-T', (event) => {
      if (event.repeat) {
        return;
      }

      // T records the layout in the first-response phase and tests the flow
      // on a practice board; it does nothing anywhere else.
      if (this.lastView?.view === 'network') {
        this.requestCommit('layout', 'typed');
      } else if (this.lastView?.view === 'practice') {
        this.practiceTest('typed');
      }
    });
    on('keydown-N', (event) => {
      if (!event.repeat) {
        this.requestCommit('cannot_solve', 'typed');
      }
    });
    on('keydown-B', (event) => {
      if (!event.repeat) {
        this.backToResults();
      }
    });
    on('keydown-F', (event) => {
      if (!event.repeat) {
        this.finish();
      }
    });

    for (const [keyName, networkId] of NETWORK_KEYS) {
      on(`keydown-${keyName}`, (event) => {
        if (!event.repeat) {
          this.openPractice(networkId);
        }
      });
    }

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
    if (
      this.dialogOpen() ||
      this.dragging ||
      this.lastView === null ||
      !this.lastView.editable
    ) {
      return;
    }

    this.moveFocus(dx, dy);
  }

  /* ---------------------------------------------------------------- *
   * Leave (ESC / I / X): held piece goes home, the bench keeps its state
   * ---------------------------------------------------------------- */

  private leave() {
    this.cancelHeld();
    this.guarded(undefined, () => m13LatticeLeave(Date.now()));
    sfxUiSelect();
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }
}
