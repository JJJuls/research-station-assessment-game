/**
 * Inventory overlay scene (interactive inventory foundation).
 *
 * The single participant-facing inventory surface: a centred modal
 * overlay launched over a paused host scene (Menu/ESC pause-and-launch
 * precedent, so world movement, world hotkeys and world pointer targets
 * are structurally inert while it is open). One scene serves five modes:
 *
 *   backpack   — personal stores (backpack + quick-access hotbar)
 *   container  — personal stores beside an opened storage container
 *   workbench  — personal stores beside the two-input assembly bench
 *   m02        — Incident Filing Workstation (M02 measurement prototype)
 *   m03        — press-bench work surface (M03 measurement prototype)
 *
 * Mouse drag/drop and the keyboard command set call EXACTLY the same
 * store commands, so both input paths produce identical final state.
 * Ordinary Sort exists only in ordinary contexts — never in m02/m03.
 */

import Phaser from 'phaser';

import { key } from '../../constants';
import {
  sfxPromptOpen,
  sfxUiMove,
  sfxUiSelect,
  sfxUnavailable,
} from '../../gameplay/audio';
import {
  closeM02CPanel,
  commitM02CWorkspace,
  M02C_CASES,
  M02C_TRAY_IDS,
  m02cCase,
  m02cPhase,
  m02cRequestedCase,
  m02cState,
  nextM02CTrayLabel,
  noteM02CRetrievalProbe,
  openM02CWorkspace,
  pickM02CRetrieval,
  setM02CTrayLabel,
} from '../../pilot/windows/m02CaseWorkspace';
import { ensureInventoryIconTextures } from '../inventoryTextures';
import { getItemDefinition, M02_DOCUMENTS } from '../itemDefs';
import {
  closeM02Panel,
  commitM02,
  m02Status,
  openM02Workstation,
  viewM02Reference,
} from '../m02Filing';
import type { M03OccasionId } from '../m03Reset';
import {
  closeM03Window,
  M03_CONTAINERS,
  M03_PRESS_CYCLES_REQUIRED,
  m03OccasionStatus,
  m03PressCycles,
  runM03PressCycle,
} from '../m03Reset';
import { CONTAINER_IDS, RECIPES } from '../model';
import type { InventoryChange } from '../store';
import {
  getInventoryState,
  invCancelHeld,
  invCommitRecipe,
  invConsolidate,
  invDiscard,
  invDropToWorld,
  invPickUp,
  invPlace,
  invQuickTransfer,
  invSortContainer,
} from '../store';
import {
  installInventoryTelemetry,
  logSecondaryInventoryEvent,
  setInventoryTelemetryScene,
} from '../telemetry';
import { guardKeyHandler } from './keyGuard';
import type { SlotAddress, SlotProbeEntry } from './SlotGridView';
import { SLOT_ADDRESS_KEY, SlotGridView } from './SlotGridView';
import { INV_COLORS, INV_FONT, INV_TEXT, prefersReducedMotion } from './theme';
import { UiButton } from './UiButton';

export type InventoryOverlayMode =
  | 'backpack'
  | 'container'
  | 'workbench'
  | 'm02'
  | 'm02case'
  | 'm03';

export interface InventoryOverlayLaunchData {
  resumeKey: string;
  mode?: InventoryOverlayMode;
  m03Occasion?: M03OccasionId;
  /** Host scene supports recoverable world drops (Inventory Lab). */
  allowWorldDrop?: boolean;
}

/* DEV-only, read-only UI probe (__playerProbe precedent): exposes slot
 * rects, focus, held stack, buttons and confirm state so Playwright can
 * drive REAL pointer/keyboard input against actual screen coordinates.
 * Never read back into gameplay; stripped from production builds. */
declare global {
  interface Window {
    __inventoryUiProbe?: {
      open: boolean;
      mode: string;
      focus: { container_id: string; slot_index: number } | null;
      held: { definition_id: string; quantity: number } | null;
      dragging: boolean;
      confirm_open: boolean;
      detail_text: string | null;
      feedback: string | null;
      slots: SlotProbeEntry[];
      buttons: {
        id: string;
        label: string;
        x: number;
        y: number;
        w: number;
        h: number;
        enabled: boolean;
      }[];
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__inventoryUiProbe = null;
}

const PANEL = { x: 40, y: 42, width: 720, height: 516 } as const;
const DEPTH = { dim: 18, panel: 20, grid: 22, ghost: 60, confirm: 70 } as const;

const FAILURE_TEXT: Record<string, string> = {
  occupied: 'Slot occupied.',
  not_accepted: 'That item does not go there.',
  target_full: 'No room there.',
  empty_slot: 'Nothing there.',
  holding: 'Hands full — place the held stack first.',
  not_holding: 'Nothing held.',
  sort_unavailable: 'Sort is not available here.',
  recipe_incomplete: 'Assembly incomplete — check the loadout.',
  recipe_output_blocked: 'Clear the output tray first.',
  not_discardable: 'This item cannot be discarded.',
  not_droppable: 'This item cannot be set down.',
};

interface GridSpec {
  containerId: string;
  label: string;
  x: number;
  y: number;
  cols: number;
  rows: number;
  hotbar?: boolean;
  sortable?: boolean;
  containerChrome?: boolean;
  codeBadges?: Record<string, string>;
}

export class InventoryOverlayScene extends Phaser.Scene {
  private resumeKey: string = key.scene.stationConcourse;
  private mode: InventoryOverlayMode = 'backpack';
  private m03Occasion: M03OccasionId = 'a';
  private allowWorldDrop = false;

  private grids: SlotGridView[] = [];
  private buttons: UiButton[] = [];
  private focus: SlotAddress | null = null;
  private hover: SlotAddress | null = null;
  private dropTarget: SlotAddress | null = null;
  private dropValid = false;
  private dragging = false;
  private ignoreGesture = false;
  private justDragged = false;
  private inputLocked = false;
  private lastClick: { addressKey: string; timeMs: number } | null = null;

  private ghost: Phaser.GameObjects.Container | null = null;
  private ghostFollowsPointer = false;
  private detailText!: Phaser.GameObjects.Text;
  private detailIcon: Phaser.GameObjects.Image | null = null;
  private feedbackText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private statusBanner: Phaser.GameObjects.Text | null = null;
  private m03CycleText: Phaser.GameObjects.Text | null = null;
  private m03PressButton: UiButton | null = null;
  private m02cLabelButtons: UiButton[] = [];
  private m02cBanner: Phaser.GameObjects.Text | null = null;
  private m02cHandOverButton: UiButton | null = null;
  private referencePanel: Phaser.GameObjects.Container | null = null;
  private referenceBackground: Phaser.GameObjects.Rectangle | null = null;

  private confirmOpen = false;
  private confirmObjects: Phaser.GameObjects.GameObject[] = [];
  private confirmAction: (() => void) | null = null;

  constructor() {
    super(key.scene.inventoryOverlay);
  }

  init(data?: InventoryOverlayLaunchData) {
    this.resumeKey = data?.resumeKey ?? key.scene.stationConcourse;
    this.mode = data?.mode ?? 'backpack';
    this.m03Occasion = data?.m03Occasion ?? 'a';
    this.allowWorldDrop = data?.allowWorldDrop ?? false;
  }

  create() {
    // Render ABOVE the paused host scene (StationMapScene / PilotOpeningScene
    // / the Information-Processing consoles precedent). Phaser draws active
    // scenes in SceneManager registration order, and this game registers
    // `Object.values(scenes)` — an ES module namespace, so the order is
    // alphabetical by export name. Without this, every host whose export name
    // sorts after `InventoryOverlayScene` (StationConcourseScene,
    // UtilityBay/UtilityCoreDeck, Ops Annex, Pump House, Repair, Side Repair,
    // InventoryScene) paused itself and then drew straight over the overlay:
    // the participant saw a frozen room and no panel.
    this.scene.bringToTop();

    // Per-instance resets (scene objects are reused across launches).
    this.grids = [];
    this.buttons = [];
    this.focus = null;
    this.hover = null;
    this.dropTarget = null;
    this.dragging = false;
    this.ignoreGesture = false;
    this.justDragged = false;
    this.inputLocked = false;
    this.lastClick = null;
    this.ghost = null;
    this.detailIcon = null;
    this.statusBanner = null;
    this.m03CycleText = null;
    this.m03PressButton = null;
    this.m02cLabelButtons = [];
    this.m02cBanner = null;
    this.m02cHandOverButton = null;
    this.referencePanel = null;
    this.referenceBackground = null;
    this.confirmOpen = false;
    this.confirmObjects = [];
    this.confirmAction = null;

    ensureInventoryIconTextures(this);
    installInventoryTelemetry();
    setInventoryTelemetryScene(this.resumeKey);

    this.input.mouse?.disableContextMenu();
    this.input.dragDistanceThreshold = 6;
    this.input.keyboard?.addCapture([
      'SPACE',
      'UP',
      'DOWN',
      'LEFT',
      'RIGHT',
      'TAB',
    ]);

    // Dimmer: interactive so pointer input can never reach anything
    // beneath the overlay (the host scene is paused anyway).
    this.add
      .rectangle(0, 0, 800, 600, INV_COLORS.dim, INV_COLORS.dimAlpha)
      .setOrigin(0)
      .setDepth(DEPTH.dim)
      .setInteractive();

    this.add
      .rectangle(
        PANEL.x,
        PANEL.y,
        PANEL.width,
        PANEL.height,
        INV_COLORS.panel,
        1,
      )
      .setOrigin(0)
      .setStrokeStyle(1, INV_COLORS.panelStroke)
      .setDepth(DEPTH.panel);

    this.titleText = this.add
      .text(PANEL.x + 16, PANEL.y + 14, this.titleFor(), {
        color: INV_TEXT.text,
        font: INV_FONT.title,
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.panel + 1);

    this.buttons.push(
      new UiButton({
        scene: this,
        id: 'close',
        x: PANEL.x + PANEL.width - 40,
        y: PANEL.y + 4,
        width: 32,
        label: 'X',
        onActivate: () => this.close(),
        depth: DEPTH.panel + 1,
      }),
    );

    this.feedbackText = this.add
      .text(400, PANEL.y + 384, '', {
        color: INV_TEXT.caution,
        font: INV_FONT.body,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 1);

    // Detail area (icon, name, category, quantity, description, combine
    // compatibility) — the tooltip surface for hover AND keyboard focus.
    this.add
      .rectangle(
        PANEL.x + 16,
        PANEL.y + 392,
        PANEL.width - 32,
        84,
        INV_COLORS.section,
        1,
      )
      .setOrigin(0)
      .setStrokeStyle(1, INV_COLORS.panelStroke)
      .setDepth(DEPTH.panel);

    this.detailText = this.add
      .text(PANEL.x + 64, PANEL.y + 400, '', {
        color: INV_TEXT.dim,
        font: INV_FONT.body,
        lineSpacing: 3,
        wordWrap: { width: PANEL.width - 120 },
      })
      .setOrigin(0)
      .setDepth(DEPTH.panel + 1);

    this.add
      .text(400, PANEL.y + PANEL.height - 16, this.helpLineFor(), {
        color: INV_TEXT.dim,
        font: INV_FONT.small,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 1);

    this.buildModePanels();
    this.wirePointerPipeline();
    this.wireKeyboard();

    // Default focus: first grid, first slot.
    if (this.grids.length > 0) {
      this.focus = { containerId: this.grids[0].containerId, slotIndex: 0 };
    }

    if (
      this.mode === 'backpack' ||
      this.mode === 'container' ||
      this.mode === 'workbench'
    ) {
      logSecondaryInventoryEvent('opened', { mode: this.mode });
    }

    sfxPromptOpen();
    this.refresh();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // Safety net for any close path: a held stack is always restored,
      // measurement windows capture their state (both calls are
      // idempotent no-ops after a normal close), and the probe reports
      // closed.
      if (getInventoryState().held !== null) {
        invCancelHeld();
      }

      if (this.mode === 'm02') {
        closeM02Panel(Date.now());
      } else if (this.mode === 'm02case') {
        closeM02CPanel(Date.now());
      } else if (this.mode === 'm03') {
        closeM03Window(this.m03Occasion, Date.now());
      }

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__inventoryUiProbe = {
          open: false,
          mode: this.mode,
          focus: null,
          held: null,
          dragging: false,
          confirm_open: false,
          detail_text: null,
          feedback: null,
          slots: [],
          buttons: [],
        };
      }
    });
  }

  /* ---------------------------------------------------------------- *
   * Mode layout
   * ---------------------------------------------------------------- */

  private titleFor(): string {
    switch (this.mode) {
      case 'backpack':
        return 'PERSONAL STORES';
      case 'container':
        return 'COMPONENT LOCKER — TRANSFER';
      case 'workbench':
        return 'ASSEMBLY BENCH';
      case 'm02':
        return 'INCIDENT FILING WORKSTATION';
      case 'm02case':
        return 'CASE WORKSPACE — HANDOVER';
      case 'm03':
        return `PRESS STATION ${this.m03Occasion.toUpperCase()} — WORK SURFACE`;
    }
  }

  private helpLineFor(): string {
    if (this.mode === 'm02') {
      return 'Drag or SPACE to move sheets • Arrows focus • C commit • V reference • I / ESC close';
    }

    if (this.mode === 'm02case') {
      return m02cPhase() === 'retrieve'
        ? 'Select the slot holding the requested case • SPACE/ENTER or click picks • I / ESC close'
        : 'Drag or SPACE to move cases • Arrows focus • L label focused tray • C hand over • I / ESC close';
    }

    if (this.mode === 'm03') {
      return 'Drag or SPACE to move parts • Arrows focus • C run press • I / ESC close';
    }

    if (this.mode === 'workbench') {
      return 'Arrows • SPACE pick/place • SHIFT+SPACE transfer • C assemble • S split • R sort • I/ESC close';
    }

    return 'Arrows • SPACE pick/place • SHIFT+SPACE transfer • S/RClick split • R sort • DEL discard • I/ESC close';
  }

  private addGrid(spec: GridSpec) {
    const grid = new SlotGridView({
      scene: this,
      containerId: spec.containerId,
      label: spec.label,
      x: spec.x,
      y: spec.y,
      cols: spec.cols,
      rows: spec.rows,
      hotbar: spec.hotbar,
      containerChrome: spec.containerChrome,
      codeBadges: spec.codeBadges,
      depth: DEPTH.grid,
    });

    this.grids.push(grid);

    if (spec.sortable) {
      this.buttons.push(
        new UiButton({
          scene: this,
          id: `sort_${spec.containerId}`,
          x: spec.x + spec.cols * 47 - 5 - 58,
          y: spec.y - 26,
          width: 58,
          label: 'SORT',
          onActivate: () => this.handleSort(spec.containerId),
          depth: DEPTH.grid,
        }),
      );
    }
  }

  private playerGrids() {
    this.addGrid({
      containerId: CONTAINER_IDS.playerBackpack,
      label: 'BACKPACK',
      x: 56,
      y: 112,
      cols: 5,
      rows: 4,
      sortable: true,
    });
    this.addGrid({
      containerId: CONTAINER_IDS.playerHotbar,
      label: 'QUICK ACCESS (1-0)',
      x: 56,
      y: 330,
      cols: 5,
      rows: 2,
      hotbar: true,
    });
  }

  private buildModePanels() {
    switch (this.mode) {
      case 'backpack': {
        this.playerGrids();
        this.add
          .text(
            560,
            200,
            'Personal stores.\n\nBackpack for haulage,\nquick access for the belt.\n\nOpen a locker or bench\nto transfer or assemble.',
            {
              color: INV_TEXT.faint,
              font: INV_FONT.body,
              lineSpacing: 4,
              align: 'center',
            },
          )
          .setOrigin(0.5)
          .setDepth(DEPTH.panel + 1);
        break;
      }

      case 'container': {
        this.playerGrids();
        this.addGrid({
          containerId: CONTAINER_IDS.labStorage,
          label: 'COMPONENT LOCKER',
          x: 402,
          y: 112,
          cols: 5,
          rows: 4,
          sortable: true,
          containerChrome: true,
        });
        break;
      }

      case 'workbench': {
        this.playerGrids();
        this.addGrid({
          containerId: CONTAINER_IDS.workbenchInput,
          label: 'INPUT',
          x: 420,
          y: 130,
          cols: 2,
          rows: 1,
          containerChrome: true,
        });
        this.addGrid({
          containerId: CONTAINER_IDS.workbenchOutput,
          label: 'OUTPUT',
          x: 640,
          y: 130,
          cols: 1,
          rows: 1,
          containerChrome: true,
        });
        this.add
          .text(575, 151, '→', {
            color: INV_TEXT.accent,
            font: '20px monospace',
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.grid);
        this.buttons.push(
          new UiButton({
            scene: this,
            id: 'assemble',
            x: 470,
            y: 210,
            width: 150,
            label: 'ASSEMBLE',
            kind: 'accent',
            onActivate: () => this.handleAssemble(),
            depth: DEPTH.grid,
          }),
        );

        const recipeLines = RECIPES.map((recipe) => {
          const inputs = Object.entries(recipe.inputs)
            .map(
              ([definitionId, quantity]) =>
                `${quantity}× ${getItemDefinition(definitionId).displayName}`,
            )
            .join(' + ');

          return `${recipe.displayName}\n   ${inputs}`;
        }).join('\n');

        this.add
          .text(410, 260, `KNOWN ASSEMBLIES\n${recipeLines}`, {
            color: INV_TEXT.faint,
            font: INV_FONT.body,
            lineSpacing: 4,
          })
          .setOrigin(0)
          .setDepth(DEPTH.grid);
        break;
      }

      case 'm02': {
        const codeBadges = Object.fromEntries(
          M02_DOCUMENTS.map((doc) => [doc.definitionId, doc.code]),
        );
        const status = openM02Workstation(Date.now());

        this.addGrid({
          containerId: CONTAINER_IDS.m02FolderIr7,
          label: 'CASE IR-7',
          x: 96,
          y: 128,
          cols: 2,
          rows: 2,
          codeBadges,
          containerChrome: true,
        });
        this.addGrid({
          containerId: CONTAINER_IDS.m02FolderIr12,
          label: 'CASE IR-12',
          x: 286,
          y: 128,
          cols: 2,
          rows: 2,
          codeBadges,
          containerChrome: true,
        });
        this.addGrid({
          containerId: CONTAINER_IDS.m02FolderIr19,
          label: 'CASE IR-19',
          x: 476,
          y: 128,
          cols: 2,
          rows: 2,
          codeBadges,
          containerChrome: true,
        });
        this.addGrid({
          containerId: CONTAINER_IDS.m02Desk,
          label: 'INTAKE DESK',
          x: 96,
          y: 280,
          cols: 6,
          rows: 2,
          codeBadges,
          containerChrome: true,
        });

        this.buildM02Reference();

        this.buttons.push(
          new UiButton({
            scene: this,
            id: 'm02_commit',
            x: 600,
            y: PANEL.y + 350,
            width: 144,
            label: 'COMMIT FILING',
            kind: 'accent',
            onActivate: () => this.handleM02Commit(),
            depth: DEPTH.grid,
          }),
        );

        if (status === 'committed') {
          this.lockAsCommitted();
        }
        break;
      }

      case 'm02case': {
        const codeBadges = Object.fromEntries(
          M02C_CASES.map((c) => [c.definitionId, c.code]),
        );
        const phase = openM02CWorkspace(Date.now());

        this.addGrid({
          containerId: CONTAINER_IDS.m02cDesk,
          label: 'INTAKE TRAY',
          x: 96,
          y: 112,
          cols: 6,
          rows: 1,
          codeBadges,
          containerChrome: true,
        });

        M02C_TRAY_IDS.forEach((trayId, index) => {
          const x = 96 + index * 162;

          this.addGrid({
            containerId: trayId,
            label: `TRAY ${index + 1}`,
            x,
            y: 204,
            cols: 2,
            rows: 2,
            codeBadges,
            containerChrome: true,
          });

          const button = new UiButton({
            scene: this,
            id: `m02c_label_${index + 1}`,
            x,
            y: 318,
            width: 120,
            label: this.m02cLabelText(trayId),
            onActivate: () => this.handleM02CLabel(trayId),
            depth: DEPTH.grid,
          });

          this.m02cLabelButtons.push(button);
          this.buttons.push(button);
        });

        this.m02cHandOverButton = new UiButton({
          scene: this,
          id: 'm02c_handover',
          x: 600,
          y: PANEL.y + 350,
          width: 144,
          label: 'HAND OVER',
          kind: 'accent',
          onActivate: () => this.handleM02CHandOver(),
          depth: DEPTH.grid,
        });
        this.buttons.push(this.m02cHandOverButton);

        this.m02cBanner = this.add
          .text(400, PANEL.y + 66, '', {
            backgroundColor: '#1c3b3a',
            color: INV_TEXT.accent,
            font: INV_FONT.section,
            padding: { x: 10, y: 4 },
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.grid + 2)
          .setVisible(false);

        if (phase === 'retrieve' || phase === 'closed') {
          this.refreshM02CPhase();
        }
        break;
      }

      case 'm03': {
        const occasion = this.m03Occasion;
        const { surface, store } = M03_CONTAINERS[occasion];

        this.addGrid({
          containerId: surface,
          label: 'WORK SURFACE',
          x: 320,
          y: 150,
          cols: 4,
          rows: 2,
          containerChrome: true,
        });
        this.addGrid({
          containerId: store,
          label: 'COMPONENT STORE',
          x: 550,
          y: 150,
          cols: 3,
          rows: 2,
          containerChrome: true,
        });

        this.add
          .rectangle(56, 112, 230, 150, INV_COLORS.section, 1)
          .setOrigin(0)
          .setStrokeStyle(1, INV_COLORS.panelStroke)
          .setDepth(DEPTH.panel);
        this.add
          .text(70, 124, 'LABEL PRESS', {
            color: INV_TEXT.dim,
            font: INV_FONT.section,
          })
          .setOrigin(0)
          .setDepth(DEPTH.panel + 1);

        this.m03CycleText = this.add
          .text(70, 148, '', {
            color: INV_TEXT.faint,
            font: INV_FONT.body,
            lineSpacing: 3,
            wordWrap: { width: 200 },
          })
          .setOrigin(0)
          .setDepth(DEPTH.panel + 1);

        this.m03PressButton = new UiButton({
          scene: this,
          id: 'm03_press',
          x: 70,
          y: 222,
          width: 160,
          label: 'RUN PRESS CYCLE',
          kind: 'accent',
          onActivate: () => this.handleM03Press(),
          depth: DEPTH.grid,
        });
        this.buttons.push(this.m03PressButton);
        this.updateM03ActivityPanel();
        break;
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * M02 open case workspace (evidence-led pilot v2)
   * ---------------------------------------------------------------- */

  private m02cLabelText(trayId: string): string {
    const label = m02cState().labels[trayId] ?? null;

    return label === null ? 'LABEL: none' : `LABEL: ${label}`;
  }

  private handleM02CLabel(
    trayId: string,
    inputMode: 'pointer' | 'keyboard' = 'pointer',
  ) {
    if (this.confirmOpen || m02cPhase() !== 'organise') {
      return;
    }

    const current = m02cState().labels[trayId] ?? null;

    if (setM02CTrayLabel(trayId, nextM02CTrayLabel(current), inputMode)) {
      sfxUiSelect();
      this.refresh();
    }
  }

  private handleM02CHandOver() {
    if (this.confirmOpen || m02cPhase() !== 'organise') {
      return;
    }

    if (getInventoryState().held !== null) {
      this.showFeedback(FAILURE_TEXT.holding);
      return;
    }

    if (commitM02CWorkspace(Date.now(), 'pointer')) {
      sfxUiSelect();
      this.refreshM02CPhase();
      this.refresh();
    }
  }

  /** Retrieval-phase pick: the case in the addressed slot is the answer. */
  private m02cRetrievalPick(
    address: SlotAddress,
    inputMode: 'pointer' | 'keyboard',
  ) {
    const stack =
      getInventoryState().containers[address.containerId]?.slots[
        address.slotIndex
      ] ?? null;

    noteM02CRetrievalProbe(address.containerId, inputMode);
    this.focus = address;

    if (stack === null) {
      this.showFeedback('Empty slot.');
      this.refresh();
      return;
    }

    const outcome = pickM02CRetrieval(
      stack.definitionId,
      inputMode,
      Date.now(),
    );

    if (outcome === 'correct') {
      sfxUiSelect();
      this.showFeedback(
        m02cPhase() === 'closed'
          ? 'Handed over. Workspace closed.'
          : `${m02cCase(stack.definitionId)?.label ?? 'Case'} handed over.`,
      );
    } else if (outcome === 'wrong') {
      this.showFeedback('Not the requested case.');
    }

    this.refreshM02CPhase();
    this.refresh();
  }

  /** Reflects the workspace phase on the banner and controls. */
  private refreshM02CPhase() {
    const phase = m02cPhase();

    if (this.m02cBanner === null) {
      return;
    }

    if (phase === 'retrieve') {
      const requested = m02cRequestedCase();

      this.m02cBanner
        .setText(
          requested === null
            ? 'RETRIEVAL'
            : `RETRIEVE: ${requested.label} — select the slot holding it`,
        )
        .setVisible(true);
      this.m02cHandOverButton?.setEnabled(false);

      for (const button of this.m02cLabelButtons) {
        button.setEnabled(false);
      }
    } else if (phase === 'closed') {
      this.m02cBanner.setText('HANDOVER COMPLETE — read-only').setVisible(true);
      this.inputLocked = true;
      this.m02cHandOverButton?.setEnabled(false);

      for (const button of this.m02cLabelButtons) {
        button.setEnabled(false);
      }
    } else {
      this.m02cBanner.setVisible(false);
    }
  }

  private m02cRetrieving(): boolean {
    return this.mode === 'm02case' && m02cPhase() === 'retrieve';
  }

  private buildM02Reference() {
    // Persistently visible filing reference; clicking it registers an
    // explicit consult (comprehension component).
    const lines = ['FILING REFERENCE', ''];

    for (const caseId of ['IR-7', 'IR-12', 'IR-19']) {
      const codes = M02_DOCUMENTS.filter((doc) => doc.caseId === caseId)
        .map((doc) => doc.code)
        .join('  ');

      lines.push(`Case ${caseId}:`, `  ${codes}`, '');
    }

    const background = this.add
      .rectangle(0, 0, 168, 170, INV_COLORS.section, 1)
      .setOrigin(0)
      .setStrokeStyle(1, INV_COLORS.panelStroke);
    const text = this.add
      .text(10, 10, lines.join('\n'), {
        color: INV_TEXT.dim,
        font: INV_FONT.small,
        lineSpacing: 2,
      })
      .setOrigin(0);

    this.referencePanel = this.add
      .container(576, PANEL.y + 86, [background, text])
      .setDepth(DEPTH.grid);

    this.referenceBackground = background;
    background.setInteractive({ useHandCursor: true });
    background.on('pointerup', () => this.consultM02Reference());
  }

  /** Explicit filing-reference consult (click or the V hotkey). */
  private consultM02Reference() {
    viewM02Reference();

    const background = this.referenceBackground;

    if (background !== null) {
      background.setStrokeStyle(1, INV_COLORS.accent);
      this.time.delayedCall(900, () =>
        background.setStrokeStyle(1, INV_COLORS.panelStroke),
      );
    }
  }

  private lockAsCommitted() {
    this.inputLocked = true;
    this.statusBanner = this.add
      .text(400, PANEL.y + 66, 'FILING RECORD COMMITTED — read-only', {
        backgroundColor: '#1c3b3a',
        color: INV_TEXT.accent,
        font: INV_FONT.section,
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.grid + 2);

    const commitButton = this.buttons.find((b) => b.id === 'm02_commit');

    commitButton?.setEnabled(false);
  }

  private updateM03ActivityPanel() {
    const status = m03OccasionStatus(this.m03Occasion);
    const cycles = m03PressCycles(this.m03Occasion);

    if (status === 'window_open' || status === 'closed') {
      this.m03CycleText?.setText(
        'Press run complete.\nBatch logged and sent\nto stores.',
      );
      this.m03PressButton?.setEnabled(false);
      this.m03PressButton?.setVisible(false);
    } else {
      this.m03CycleText?.setText(
        `Run the press to finish\nthis label batch.\n\nCycle ${cycles}/${M03_PRESS_CYCLES_REQUIRED}`,
      );
    }
  }

  /* ---------------------------------------------------------------- *
   * Pointer pipeline (Phaser native drag + drop zones)
   * ---------------------------------------------------------------- */

  private addressOf(
    gameObject: Phaser.GameObjects.GameObject,
  ): SlotAddress | null {
    const address = gameObject.getData?.(SLOT_ADDRESS_KEY) as
      | SlotAddress
      | undefined;

    return address ?? null;
  }

  private wirePointerPipeline() {
    this.input.on(
      Phaser.Input.Events.DRAG_START,
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
      ) => {
        const address = this.addressOf(gameObject);

        this.justDragged = true;

        if (
          address === null ||
          this.inputLocked ||
          this.confirmOpen ||
          this.m02cRetrieving() ||
          pointer.rightButtonDown() ||
          getInventoryState().held !== null
        ) {
          this.ignoreGesture = true;
          return;
        }

        const change = invPickUp(address.containerId, address.slotIndex, 'all');

        if (!change.ok) {
          this.ignoreGesture = true;
          this.showFailure(change);
          return;
        }

        this.ignoreGesture = false;
        this.dragging = true;
        this.focus = address;
        this.spawnGhost(pointer.x, pointer.y);
        this.refresh();
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
        _gameObject: Phaser.GameObjects.GameObject,
        zone: Phaser.GameObjects.GameObject,
      ) => {
        if (!this.dragging) {
          return;
        }

        const address = this.addressOf(zone);

        if (address !== null) {
          this.dropTarget = address;
          this.dropValid = this.canPlaceHeldOn(address);
          this.refresh();
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.DRAG_LEAVE,
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.GameObject,
        zone: Phaser.GameObjects.GameObject,
      ) => {
        if (!this.dragging) {
          return;
        }

        const address = this.addressOf(zone);

        if (
          address !== null &&
          this.dropTarget !== null &&
          address.containerId === this.dropTarget.containerId &&
          address.slotIndex === this.dropTarget.slotIndex
        ) {
          this.dropTarget = null;
          this.refresh();
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.DROP,
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.GameObject,
        zone: Phaser.GameObjects.GameObject,
      ) => {
        if (!this.dragging || this.ignoreGesture) {
          return;
        }

        const address = this.addressOf(zone);

        if (address === null) {
          return;
        }

        const change = invPlace(address.containerId, address.slotIndex);

        if (change.ok) {
          sfxUiSelect();
          this.focus = address;
        } else {
          this.showFailure(change);
        }
      },
    );

    this.input.on(Phaser.Input.Events.DRAG_END, () => {
      // A completed gesture must not double as a click, but a release
      // over the dimmer/panel produces no GAMEOBJECT_UP to consume the
      // flag — clear it on the next tick either way so the following
      // click is never silently eaten.
      this.time.delayedCall(0, () => {
        this.justDragged = false;
      });

      if (this.ignoreGesture) {
        this.ignoreGesture = false;
        return;
      }

      if (!this.dragging) {
        return;
      }

      this.dragging = false;
      this.dropTarget = null;

      // Anything still held after the drop resolution goes safely home
      // (invalid drop, drop outside every slot, merge remainder).
      const held = getInventoryState().held;

      if (held !== null) {
        this.animateGhostReturn(held.source);
        invCancelHeld();
      } else {
        this.destroyGhost();
      }

      this.refresh();
    });

    this.input.on(
      Phaser.Input.Events.GAMEOBJECT_DOWN,
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
      ) => {
        const address = this.addressOf(gameObject);

        if (address === null || this.inputLocked || this.confirmOpen) {
          return;
        }

        // Right-button stack controls are instant (never a drag).
        if (pointer.rightButtonDown()) {
          this.handleRightClick(address, pointer.event.shiftKey);
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.GAMEOBJECT_UP,
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
      ) => {
        const address = this.addressOf(gameObject);

        if (
          address === null ||
          this.inputLocked ||
          this.confirmOpen ||
          pointer.button !== 0
        ) {
          return;
        }

        if (this.justDragged) {
          // A completed drag gesture must not double as a click.
          this.justDragged = false;
          return;
        }

        this.handleLeftClick(address, pointer.event.shiftKey);
      },
    );

    this.input.on(
      Phaser.Input.Events.GAMEOBJECT_OVER,
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
      ) => {
        const address = this.addressOf(gameObject);

        if (address !== null) {
          this.hover = address;
          this.refresh();
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.GAMEOBJECT_OUT,
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
      ) => {
        const address = this.addressOf(gameObject);

        if (
          address !== null &&
          this.hover !== null &&
          this.hover.containerId === address.containerId &&
          this.hover.slotIndex === address.slotIndex
        ) {
          this.hover = null;
          this.refresh();
        }
      },
    );
  }

  private handleLeftClick(address: SlotAddress, shiftKey: boolean) {
    if (this.m02cRetrieving()) {
      this.m02cRetrievalPick(address, 'pointer');
      return;
    }

    const state = getInventoryState();

    if (state.held !== null) {
      // Keyboard-picked stack + mouse click: same place command.
      const change = invPlace(address.containerId, address.slotIndex);

      if (change.ok) {
        sfxUiSelect();
        this.syncGhostToHeld();
      } else {
        this.showFailure(change);
      }

      this.focus = address;
      this.refresh();
      return;
    }

    if (shiftKey) {
      this.handleQuickTransfer(address);
      return;
    }

    // Plain click: focus + detail; double-click consolidates partials.
    const addressKey = `${address.containerId}:${address.slotIndex}`;
    const now = this.time.now;

    if (
      this.lastClick !== null &&
      this.lastClick.addressKey === addressKey &&
      now - this.lastClick.timeMs < 350
    ) {
      const stack =
        state.containers[address.containerId]?.slots[address.slotIndex];

      if (stack != null) {
        const change = invConsolidate(address.containerId, stack.definitionId);

        if (change.ok && (change.detail?.merged as number) > 0) {
          sfxUiSelect();
        }
      }

      this.lastClick = null;
    } else {
      this.lastClick = { addressKey, timeMs: now };
    }

    this.focus = address;
    sfxUiMove();
    this.refresh();
  }

  private handleRightClick(address: SlotAddress, shiftKey: boolean) {
    if (this.m02cRetrieving()) {
      this.m02cRetrievalPick(address, 'pointer');
      return;
    }

    const state = getInventoryState();

    if (state.held !== null) {
      this.showFeedback(FAILURE_TEXT.holding);
      return;
    }

    const change = invPickUp(
      address.containerId,
      address.slotIndex,
      shiftKey ? 'half' : 'one',
    );

    if (change.ok) {
      sfxUiSelect();
      this.focus = address;
      const pointer = this.input.activePointer;

      this.spawnGhost(pointer.x, pointer.y);
      this.ghostFollowsPointer = true;
    } else if (change.reason !== 'empty_slot') {
      this.showFailure(change);
    }

    this.refresh();
  }

  /** Pointer-picked (not dragged) ghosts track the mouse each frame. */
  update() {
    if (
      this.ghost !== null &&
      !this.dragging &&
      this.ghostFollowsPointer &&
      getInventoryState().held !== null
    ) {
      const pointer = this.input.activePointer;

      this.ghost.setPosition(pointer.x, pointer.y);
    }
  }

  private quickTransferTargets(containerId: string): readonly string[] {
    const playerContainers = [
      CONTAINER_IDS.playerBackpack,
      CONTAINER_IDS.playerHotbar,
    ];
    const fromPlayer =
      containerId === CONTAINER_IDS.playerBackpack ||
      containerId === CONTAINER_IDS.playerHotbar;

    switch (this.mode) {
      case 'backpack':
        return containerId === CONTAINER_IDS.playerBackpack
          ? [CONTAINER_IDS.playerHotbar]
          : [CONTAINER_IDS.playerBackpack];
      case 'container':
        return fromPlayer ? [CONTAINER_IDS.labStorage] : playerContainers;
      case 'workbench':
        return fromPlayer ? [CONTAINER_IDS.workbenchInput] : playerContainers;
      default:
        // Measurement workstations: deliberate placement only.
        return [];
    }
  }

  private handleQuickTransfer(address: SlotAddress) {
    const targets = this.quickTransferTargets(address.containerId);

    if (targets.length === 0) {
      this.showFeedback('Quick transfer is not available here.');
      return;
    }

    const change = invQuickTransfer(
      address.containerId,
      address.slotIndex,
      targets,
    );

    if (change.ok) {
      sfxUiSelect();
    } else if (change.reason !== 'empty_slot') {
      this.showFailure(change);
    }

    this.refresh();
  }

  private handleSort(containerId: string) {
    if (this.inputLocked || this.confirmOpen) {
      return;
    }

    const change = invSortContainer(containerId);

    if (change.ok) {
      sfxUiSelect();
    } else {
      this.showFailure(change);
    }

    this.refresh();
  }

  private handleAssemble() {
    if (this.inputLocked || this.confirmOpen) {
      return;
    }

    // Deliberate confirmation: the participant loaded the bench and now
    // explicitly commits; the engine enforces exact-match atomicity.
    const state = getInventoryState();
    const loaded: Record<string, number> = {};

    for (const slot of state.containers[CONTAINER_IDS.workbenchInput].slots) {
      if (slot !== null) {
        loaded[slot.definitionId] =
          (loaded[slot.definitionId] ?? 0) + slot.quantity;
      }
    }

    const recipe = RECIPES.find((candidate) => {
      const ids = Object.keys(candidate.inputs);

      return (
        ids.length === Object.keys(loaded).length &&
        ids.every(
          (definitionId) =>
            loaded[definitionId] === candidate.inputs[definitionId],
        )
      );
    });

    if (recipe === undefined) {
      this.showFeedback(FAILURE_TEXT.recipe_incomplete);
      sfxUnavailable();
      return;
    }

    const change = invCommitRecipe(recipe.recipeId);

    if (change.ok) {
      sfxUiSelect();
      this.showFeedback(`${recipe.displayName} assembled.`, INV_TEXT.accent);
    } else {
      this.showFailure(change);
    }

    this.refresh();
  }

  private handleM02Commit() {
    if (this.inputLocked || this.confirmOpen || m02Status() !== 'open') {
      return;
    }

    if (getInventoryState().held !== null) {
      this.showFeedback(FAILURE_TEXT.holding);
      return;
    }

    if (commitM02(Date.now())) {
      sfxUiSelect();
      this.lockAsCommitted();
      this.refresh();
    }
  }

  private handleM03Press() {
    if (this.inputLocked || this.confirmOpen) {
      return;
    }

    const before = m03OccasionStatus(this.m03Occasion);

    if (before === 'window_open' || before === 'closed') {
      return;
    }

    runM03PressCycle(this.m03Occasion, Date.now());
    sfxUiSelect();
    this.updateM03ActivityPanel();
    this.refresh();
  }

  /* ---------------------------------------------------------------- *
   * Keyboard command set (full parity with the pointer path)
   * ---------------------------------------------------------------- */

  private wireKeyboard() {
    const keyboard = this.input.keyboard!;
    // Every handler is wrapped in the once-per-event guard: Phaser's
    // keyboard queue re-emits earlier events when several presses land
    // in one slow frame (see keyGuard.ts), and a doubled press must
    // never double a move/split/close.
    const on = (eventName: string, handler: (event: KeyboardEvent) => void) =>
      keyboard.on(eventName, guardKeyHandler(handler));

    on('keydown-ESC', (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      if (this.confirmOpen) {
        this.closeConfirm(false);
        return;
      }

      // Cancel a held stack FIRST; a second ESC closes the overlay.
      if (getInventoryState().held !== null) {
        invCancelHeld();
        this.dragging = false;
        this.dropTarget = null;
        this.destroyGhost();
        this.showFeedback('Held stack returned.');
        this.refresh();
        return;
      }

      this.close();
    });

    on('keydown-I', (event: KeyboardEvent) => {
      if (event.repeat || this.confirmOpen) {
        return;
      }

      this.close();
    });

    const moveFocus = (delta: number, vertical: boolean) => {
      if (this.grids.length === 0 || this.confirmOpen) {
        return;
      }

      const gridIndex = Math.max(
        0,
        this.grids.findIndex(
          (grid) => grid.containerId === this.focus?.containerId,
        ),
      );
      const grid = this.grids[gridIndex];
      const current = this.focus?.slotIndex ?? 0;

      if (vertical) {
        const next = current + delta * grid.cols;

        if (next >= 0 && next < grid.capacity) {
          this.focus = { containerId: grid.containerId, slotIndex: next };
        }
      } else {
        const next = current + delta;

        if (next >= 0 && next < grid.capacity) {
          this.focus = { containerId: grid.containerId, slotIndex: next };
        } else if (delta > 0 && gridIndex < this.grids.length - 1) {
          this.focus = {
            containerId: this.grids[gridIndex + 1].containerId,
            slotIndex: 0,
          };
        } else if (delta < 0 && gridIndex > 0) {
          const previous = this.grids[gridIndex - 1];

          this.focus = {
            containerId: previous.containerId,
            slotIndex: previous.capacity - 1,
          };
        }
      }

      // A keyboard-picked ghost travels with the focus ring.
      if (
        this.ghost !== null &&
        !this.dragging &&
        !this.ghostFollowsPointer &&
        this.focus !== null
      ) {
        const grid = this.grids.find(
          (candidate) => candidate.containerId === this.focus!.containerId,
        );

        if (grid !== undefined) {
          const center = grid.cellCenter(this.focus.slotIndex);

          this.ghost.setPosition(center.x, center.y - 28);
        }
      }

      sfxUiMove();
      this.refresh();
    };

    on('keydown-LEFT', () => moveFocus(-1, false));
    on('keydown-RIGHT', () => moveFocus(1, false));
    on('keydown-UP', () => moveFocus(-1, true));
    on('keydown-DOWN', () => moveFocus(1, true));

    const pickOrPlace = (event: KeyboardEvent) => {
      if (event.repeat || this.focus === null || this.inputLocked) {
        return;
      }

      if (this.confirmOpen) {
        // Only a deliberate ENTER confirms a destructive dialog; SPACE is
        // the highest-frequency overlay key and must never slip-confirm.
        if (event.key === 'Enter') {
          this.closeConfirm(true);
        }

        return;
      }

      if (event.shiftKey) {
        this.handleQuickTransfer(this.focus);
        return;
      }

      if (this.m02cRetrieving()) {
        this.m02cRetrievalPick(this.focus, 'keyboard');
        return;
      }

      const state = getInventoryState();

      if (state.held !== null) {
        const change = invPlace(this.focus.containerId, this.focus.slotIndex);

        if (change.ok) {
          sfxUiSelect();
          this.syncGhostToHeld();
        } else {
          this.showFailure(change);
        }
      } else {
        const change = invPickUp(
          this.focus.containerId,
          this.focus.slotIndex,
          'all',
        );

        if (change.ok) {
          sfxUiSelect();
          this.spawnGhostAtFocus();
        } else if (change.reason !== 'empty_slot') {
          this.showFailure(change);
        }
      }

      this.refresh();
    };

    on('keydown-SPACE', pickOrPlace);
    on('keydown-ENTER', pickOrPlace);

    on('keydown-S', (event: KeyboardEvent) => {
      if (
        event.repeat ||
        this.focus === null ||
        this.inputLocked ||
        this.confirmOpen
      ) {
        return;
      }

      if (getInventoryState().held !== null) {
        this.showFeedback(FAILURE_TEXT.holding);
        return;
      }

      const change = invPickUp(
        this.focus.containerId,
        this.focus.slotIndex,
        'half',
      );

      if (change.ok) {
        sfxUiSelect();
        this.spawnGhostAtFocus();
      } else if (change.reason !== 'empty_slot') {
        this.showFailure(change);
      }

      this.refresh();
    });

    on('keydown-R', (event: KeyboardEvent) => {
      if (
        event.repeat ||
        this.focus === null ||
        this.inputLocked ||
        this.confirmOpen
      ) {
        return;
      }

      this.handleSort(this.focus.containerId);
    });

    on('keydown-DELETE', (event: KeyboardEvent) => {
      if (
        event.repeat ||
        this.focus === null ||
        this.inputLocked ||
        this.confirmOpen
      ) {
        return;
      }

      this.openDiscardConfirm(this.focus);
    });

    // Mode-action hotkeys: full keyboard parity for the pointer buttons
    // (assemble / commit filing / run press, and the reference consult).
    on('keydown-L', (event: KeyboardEvent) => {
      if (
        event.repeat ||
        this.mode !== 'm02case' ||
        this.focus === null ||
        this.confirmOpen
      ) {
        return;
      }

      if (
        (M02C_TRAY_IDS as readonly string[]).includes(this.focus.containerId)
      ) {
        this.handleM02CLabel(this.focus.containerId, 'keyboard');
      }
    });

    on('keydown-C', (event: KeyboardEvent) => {
      if (event.repeat || this.confirmOpen) {
        return;
      }

      if (this.mode === 'workbench') {
        this.handleAssemble();
      } else if (this.mode === 'm02case') {
        this.handleM02CHandOver();
      } else if (this.mode === 'm02') {
        this.handleM02Commit();
      } else if (this.mode === 'm03') {
        this.handleM03Press();
      }
    });

    on('keydown-V', (event: KeyboardEvent) => {
      if (event.repeat || this.confirmOpen || this.mode !== 'm02') {
        return;
      }

      this.consultM02Reference();
    });
  }

  /* ---------------------------------------------------------------- *
   * Discard / world-drop confirmation (never an immediate destroy)
   * ---------------------------------------------------------------- */

  private openDiscardConfirm(address: SlotAddress) {
    const state = getInventoryState();
    const stack =
      state.containers[address.containerId]?.slots[address.slotIndex];

    if (stack == null) {
      return;
    }

    if (state.held !== null) {
      this.showFeedback(FAILURE_TEXT.holding);
      return;
    }

    const definition = getItemDefinition(stack.definitionId);
    const worldDrop = this.allowWorldDrop && definition.droppable;

    if (!worldDrop && !definition.discardable) {
      this.showFeedback(FAILURE_TEXT.not_discardable);
      sfxUnavailable();
      return;
    }

    const message = worldDrop
      ? `Set down ${definition.displayName} ×${stack.quantity}?\nIt becomes a bundle on the deck and can be picked up again.`
      : `Discard ${definition.displayName} ×${stack.quantity}?\nJettisoned items cannot be recovered.`;

    this.confirmOpen = true;
    this.confirmAction = () => {
      const change = worldDrop
        ? invDropToWorld(address.containerId, address.slotIndex)
        : invDiscard(address.containerId, address.slotIndex);

      if (change.ok) {
        sfxUiSelect();
        this.showFeedback(
          worldDrop ? 'Bundle set down on the deck.' : 'Item jettisoned.',
        );
      } else {
        this.showFailure(change);
      }
    };

    const dim = this.add
      .rectangle(0, 0, 800, 600, 0x000000, 0.55)
      .setOrigin(0)
      .setDepth(DEPTH.confirm)
      .setInteractive();
    const panel = this.add
      .rectangle(400, 280, 420, 130, INV_COLORS.panel, 1)
      .setStrokeStyle(
        1,
        worldDrop ? INV_COLORS.panelStroke : INV_COLORS.caution,
      )
      .setDepth(DEPTH.confirm + 1);
    const text = this.add
      .text(400, 252, message, {
        align: 'center',
        color: INV_TEXT.text,
        font: INV_FONT.body,
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.confirm + 2);
    const confirmButton = new UiButton({
      scene: this,
      id: 'confirm_yes',
      x: 250,
      y: 300,
      width: 130,
      label: worldDrop ? 'SET DOWN' : 'DISCARD',
      kind: worldDrop ? 'accent' : 'caution',
      onActivate: () => this.closeConfirm(true),
      depth: DEPTH.confirm + 2,
    });
    const cancelButton = new UiButton({
      scene: this,
      id: 'confirm_no',
      x: 420,
      y: 300,
      width: 130,
      label: 'CANCEL',
      onActivate: () => this.closeConfirm(false),
      depth: DEPTH.confirm + 2,
    });

    this.confirmObjects = [dim, panel, text];
    this.buttons.push(confirmButton, cancelButton);
    this.refresh();
  }

  private closeConfirm(confirmed: boolean) {
    if (!this.confirmOpen) {
      return;
    }

    this.confirmOpen = false;

    for (const object of this.confirmObjects) {
      object.destroy();
    }

    this.confirmObjects = [];
    this.buttons = this.buttons.filter((button) => {
      if (button.id === 'confirm_yes' || button.id === 'confirm_no') {
        button.destroy();
        return false;
      }

      return true;
    });

    if (confirmed) {
      this.confirmAction?.();
    }

    this.confirmAction = null;
    this.refresh();
  }

  /* ---------------------------------------------------------------- *
   * Ghost, feedback, detail, probe
   * ---------------------------------------------------------------- */

  private spawnGhostAtFocus() {
    if (this.focus === null) {
      return;
    }

    const grid = this.grids.find(
      (candidate) => candidate.containerId === this.focus!.containerId,
    );

    if (grid !== undefined) {
      const center = grid.cellCenter(this.focus.slotIndex);

      this.spawnGhost(center.x, center.y - 28);
    }
  }

  /** Translucent held-stack ghost, always above every other UI layer. */
  private spawnGhost(x: number, y: number) {
    this.destroyGhost();

    const held = getInventoryState().held;

    if (held === null) {
      return;
    }

    const definition = getItemDefinition(held.stack.definitionId);
    const parts: Phaser.GameObjects.GameObject[] = [];

    if (this.textures.exists(definition.icon)) {
      parts.push(this.add.image(0, 0, definition.icon));
    } else {
      parts.push(
        this.add
          .rectangle(0, 0, 24, 24, 0x3d4956, 1)
          .setStrokeStyle(1, 0x62788a),
      );
    }

    if (held.stack.quantity > 1) {
      parts.push(
        this.add
          .text(12, 12, `${held.stack.quantity}`, {
            color: INV_TEXT.text,
            font: INV_FONT.qty,
          })
          .setOrigin(1, 1),
      );
    }

    this.ghost = this.add
      .container(x, y, parts)
      .setDepth(DEPTH.ghost)
      .setAlpha(0.85);
  }

  private destroyGhost() {
    this.ghost?.destroy();
    this.ghost = null;
    this.ghostFollowsPointer = false;
  }

  /**
   * After a place: drop the ghost when the hand is empty, or rebuild it
   * with the remaining quantity when a partial merge left a remainder
   * held (the ghost must never vanish while HOLDING is still true).
   */
  private syncGhostToHeld() {
    const followed = this.ghostFollowsPointer;

    this.destroyGhost();

    if (getInventoryState().held === null) {
      return;
    }

    if (followed) {
      const pointer = this.input.activePointer;

      this.spawnGhost(pointer.x, pointer.y);
      this.ghostFollowsPointer = true;
    } else {
      this.spawnGhostAtFocus();
    }
  }

  /** Snap-back flight of the ghost to the source slot (display only —
   *  the domain restore already happened; reduced motion skips it). */
  private animateGhostReturn(source: {
    containerId: string;
    slotIndex: number;
  }) {
    const ghost = this.ghost;

    if (ghost === null || prefersReducedMotion()) {
      this.destroyGhost();
      return;
    }

    const grid = this.grids.find(
      (candidate) => candidate.containerId === source.containerId,
    );

    if (grid === undefined) {
      this.destroyGhost();
      return;
    }

    const center = grid.cellCenter(source.slotIndex);

    this.ghost = null;
    this.tweens.add({
      targets: ghost,
      x: center.x,
      y: center.y,
      alpha: 0.4,
      duration: 140,
      ease: 'Sine.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }

  private showFailure(change: InventoryChange) {
    sfxUnavailable();
    this.showFeedback(
      FAILURE_TEXT[change.reason ?? ''] ?? 'That does not work here.',
    );
  }

  private feedbackTimer: Phaser.Time.TimerEvent | null = null;
  private lastFeedback: string | null = null;

  private showFeedback(message: string, color: string = INV_TEXT.caution) {
    this.lastFeedback = message;
    this.feedbackText.setText(message).setColor(color);
    this.feedbackTimer?.remove();
    this.feedbackTimer = this.time.delayedCall(2400, () => {
      this.feedbackText.setText('');
      this.lastFeedback = null;
      this.refreshProbe();
    });
    this.refreshProbe();
  }

  /** Whether placing the held stack on this slot would succeed. */
  private canPlaceHeldOn(address: SlotAddress): boolean {
    const state = getInventoryState();
    const held = state.held;
    const container = state.containers[address.containerId];

    if (held === null || container === undefined || container.insertLocked) {
      return false;
    }

    const definition = getItemDefinition(held.stack.definitionId);
    const bound = definition.boundNamespace ?? 'general';

    if (bound !== container.namespace) {
      return false;
    }

    if (
      container.acceptTags !== undefined &&
      !container.acceptTags.some((tag) => definition.tags.includes(tag))
    ) {
      return false;
    }

    const target = container.slots[address.slotIndex];

    if (target === null) {
      return true;
    }

    if (
      target.definitionId === held.stack.definitionId &&
      target.quantity < definition.maxStack
    ) {
      return true;
    }

    // Swap requires the source slot to still be free.
    const source = state.containers[held.source.containerId];

    return (
      source !== undefined &&
      source.slots[held.source.slotIndex] === null &&
      !source.insertLocked
    );
  }

  private detailFor(address: SlotAddress | null): string | null {
    if (address === null) {
      return null;
    }

    const stack =
      getInventoryState().containers[address.containerId]?.slots[
        address.slotIndex
      ];

    if (stack == null) {
      return null;
    }

    const definition = getItemDefinition(stack.definitionId);
    const lines = [
      `${definition.displayName}   ·   ${definition.category.toUpperCase()}   ·   ×${stack.quantity}`,
      definition.description,
    ];

    const ingredientRoles = definition.recipeRoles.filter((role) =>
      role.startsWith('ingredient:'),
    );

    if (ingredientRoles.length > 0) {
      const names = ingredientRoles
        .map((role) => {
          const recipe = RECIPES.find(
            (candidate) => candidate.recipeId === role.split(':')[1],
          );

          return recipe?.displayName ?? role.split(':')[1];
        })
        .join(', ');

      lines.push(`Workbench: combines into ${names}.`);
    }

    return lines.join('\n');
  }

  private refreshDetail() {
    const address = this.hover ?? this.focus;
    const state = getInventoryState();
    const held = state.held;

    this.detailIcon?.destroy();
    this.detailIcon = null;

    let text: string | null;

    if (held !== null) {
      const definition = getItemDefinition(held.stack.definitionId);

      text = `HOLDING ${definition.displayName} ×${held.stack.quantity}\nPlace on a slot, or ESC to return it.`;

      if (this.textures.exists(definition.icon)) {
        this.detailIcon = this.add
          .image(PANEL.x + 38, PANEL.y + 430, definition.icon)
          .setDepth(DEPTH.panel + 1);
      }
    } else {
      text = this.detailFor(address);

      const stack =
        address === null
          ? null
          : (state.containers[address.containerId]?.slots[address.slotIndex] ??
            null);

      if (stack !== null) {
        const definition = getItemDefinition(stack.definitionId);

        if (this.textures.exists(definition.icon)) {
          this.detailIcon = this.add
            .image(PANEL.x + 38, PANEL.y + 430, definition.icon)
            .setDepth(DEPTH.panel + 1);
        }
      }
    }

    this.detailText.setText(text ?? 'Hover or focus a slot for details.');
  }

  private refresh() {
    const state = getInventoryState();
    const held = state.held;

    for (const grid of this.grids) {
      grid.refresh(state, {
        focusIndex:
          this.focus?.containerId === grid.containerId
            ? this.focus.slotIndex
            : null,
        reservedIndex:
          held?.source.containerId === grid.containerId
            ? held.source.slotIndex
            : null,
        dropIndex:
          this.dropTarget?.containerId === grid.containerId
            ? this.dropTarget.slotIndex
            : null,
        dropValid: this.dropValid,
        selectionIndex:
          grid.containerId === CONTAINER_IDS.playerHotbar
            ? state.hotbarSelection
            : null,
      });
    }

    if (this.mode === 'm03') {
      this.updateM03ActivityPanel();
    }

    if (this.mode === 'm02case') {
      M02C_TRAY_IDS.forEach((trayId, index) => {
        this.m02cLabelButtons[index]?.setLabel(this.m02cLabelText(trayId));
      });
      this.refreshM02CPhase();
    }

    this.refreshDetail();
    this.refreshProbe();
  }

  private refreshProbe() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const state = getInventoryState();
    const held = state.held;

    window.__inventoryUiProbe = {
      open: true,
      mode: this.mode,
      focus:
        this.focus === null
          ? null
          : {
              container_id: this.focus.containerId,
              slot_index: this.focus.slotIndex,
            },
      held:
        held === null
          ? null
          : {
              definition_id: held.stack.definitionId,
              quantity: held.stack.quantity,
            },
      dragging: this.dragging,
      confirm_open: this.confirmOpen,
      detail_text: this.detailText?.text ?? null,
      feedback: this.lastFeedback,
      slots: this.grids.flatMap((grid) => grid.probeEntries(state)),
      buttons: this.buttons.map((button) => {
        const bounds = button.bounds();

        return {
          id: button.id,
          label: button.label(),
          x: bounds.x,
          y: bounds.y,
          w: bounds.width,
          h: bounds.height,
          enabled: button.isEnabled(),
        };
      }),
    };
  }

  /* ---------------------------------------------------------------- *
   * Close
   * ---------------------------------------------------------------- */

  private close() {
    // A held stack always goes safely home before the overlay leaves.
    if (getInventoryState().held !== null) {
      invCancelHeld();
    }

    this.destroyGhost();

    if (this.mode === 'm02') {
      closeM02Panel(Date.now());
    } else if (this.mode === 'm02case') {
      closeM02CPanel(Date.now());
    } else if (this.mode === 'm03') {
      closeM03Window(this.m03Occasion, Date.now());
    } else {
      logSecondaryInventoryEvent('closed', { mode: this.mode });
    }

    sfxUiSelect();
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }
}
