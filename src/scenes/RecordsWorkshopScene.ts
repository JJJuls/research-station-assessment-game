/**
 * Records Workshop — episodes 2 (Records & Workshop Restoration) and 5
 * (Return, Revision & Handover) of the evidence-led pilot v2 (Units 2, 5).
 *
 * Episode-2 windows (ledger): M02 open case workspace, M03 press occasion 1
 * (three tools), M04 two cutting jobs, M06 dispatch console, M07 calibration bench
 * (start), M11 seal log (secondary), M12 quality packet 2, M13 conduit
 * lattice bench. Episode 5 (Unit 5, the return shift): M03 occasion 2
 * (Press B), M07 end (the same bench), M20 resume/end (station feed
 * console), M21 manual-based repair (relay bench + drawer manual), M22
 * setback/revision (shift report desk), M25 questionnaire-primary handoff
 * (notice at the outbound handover desk). M08 secondary telemetry: the
 * locker stow and the optional filter swap on the board.
 *
 * Every window owns distinct objects, events and validity state; nothing
 * gates on performance; the east door is always open. The Work Order Board
 * is the stage anchor (sign-off only — never a check). The feed console
 * and the calibration bench are never guided on the return: both
 * opportunities must stay uncommanded.
 */
import Phaser from 'phaser';

import { Depth, key, worldDepth } from '../constants';
import {
  addInventoryItem,
  hasInventoryItem,
  isInventoryFull,
  removeInventoryItem,
} from '../gameplay/inventory';
import { PhysicalManipulationLayer } from '../gameplay/physical';
import {
  declareM13Lattice,
  m13LatticeProbe,
} from '../informationProcessing/m13PipeNetwork';
import { openIpOverlay } from '../informationProcessing/ui/openIpOverlay';
import { ensureInventoryIconTextures } from '../inventory/inventoryTextures';
import { CONTAINER_IDS } from '../inventory/model';
import { getInventoryState } from '../inventory/store';
import {
  installInventoryTelemetry,
  setInventoryTelemetryScene,
} from '../inventory/telemetry';
import { guardKeyHandler } from '../inventory/ui/keyGuard';
import { openInventoryOverlay } from '../inventory/ui/openOverlay';
import {
  refreshPilotCoverageProbe,
  stampContaminationNotes,
} from '../pilot/pilotCoverage';
import {
  advancePilotStage,
  pilotStage,
  pilotStageAtOrAfter,
  registerPilotStation,
} from '../pilot/pilotRoute';
import type { PilotNpcBeat } from '../pilot/PilotZoneScene';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import { M25_HANDOFF_TEXT } from '../pilot/return/m25HandoffModel';
import { RETURN_BOARD_BODY } from '../pilot/return/returnEpisodeModel';
import {
  activeWorkSurface,
  openWorkSurface,
} from '../pilot/ui/WorkSurfaceScene';
import {
  closeM01Surface,
  declareM01,
  m01State,
  m01Window,
  openM01,
  presentM01,
  resumeM01Surface,
} from '../pilot/windows/m01PlanBoard';
import { m01SurfaceModel } from '../pilot/windows/m01SurfaceModel';
import {
  declareM02C,
  m02cState,
  m02cWindow,
  noteM02CEntry,
  presentM02C,
} from '../pilot/windows/m02CaseWorkspace';
import type { M03Occasion } from '../pilot/windows/m03ToolRestore';
import {
  declareM03T,
  m03tIdleLine,
  m03tPhase,
  m03tPresentedBy,
  m03tState,
  m03tTerminal,
  m03tWindow,
  noteM03TEntry,
  presentM03T,
} from '../pilot/windows/m03ToolRestore';
import {
  createM04BinGate,
  declareM04,
  departM04,
  disposeM04,
  dropM04Carried,
  listM04,
  M04_SET_DOWN_LINE,
  M04_SET_DOWN_REFUSED_LINE,
  m04AnyProduced,
  type M04BinGate,
  m04BinGateStep,
  m04BinPointerAllowed,
  m04Carried,
  m04CutterIdleLine,
  m04JobOpen,
  m04JobPieces,
  m04NextJob,
  type M04PickupOrigin,
  type M04Piece,
  m04RemainingDebris,
  m04Settling,
  m04SiteStatus,
  noteM04Entry,
  noteM04Unavailable,
  pickUpM04,
  refuseM04SettlingPress,
  runM04SampleJob,
  setDownM04,
} from '../pilot/windows/m04Debris';
import {
  closeM06Surface,
  declareM06,
  m06State,
  m06Window,
  openM06,
  presentM06,
  resumeM06Surface,
} from '../pilot/windows/m06RoutineDispatch';
import { m06SurfaceModel } from '../pilot/windows/m06SurfaceModel';
import {
  closeM07Surface,
  declareM07,
  m07State,
  m07Window,
  openM07,
  presentM07End,
} from '../pilot/windows/m07Calibration';
import {
  closeM12Surface,
  declareM12,
  m12State,
  m12Windows,
  openM12,
  presentM12,
  resumeM12Surface,
} from '../pilot/windows/m12QualityControl';
import { m12SurfaceModel } from '../pilot/windows/m12SurfaceModel';
import {
  m20FeedConsoleSurfaceModel,
  m21RelayBenchSurfaceModel,
  m22ReportDeskSurfaceModel,
  type ReturnSurfaceHost,
} from '../pilot/windows/returnSurfaceModels';
import {
  declareReturnWindows,
  handoverTray,
  m20ConsoleLeave,
  m20ConsoleOpen,
  m20ConsolePresent,
  m20ConsoleStatusLine,
  m21AllClosed,
  m21BenchChipText,
  m21BenchLeave,
  m21BenchOpen,
  m21Present,
  m21State,
  m22DeskChipText,
  m22DeskDone,
  m22DeskLeave,
  m22DeskOpen,
  m22Present,
  m22Ratings,
  m22State,
  m25AcknowledgeNotice,
  m25PresentNotice,
  m25State,
  m25ViewNotice,
  noteHandoverPlaced,
  returnProbeSnapshot,
} from '../pilot/windows/returnWindows';
import {
  acknowledgeM11Obligation,
  noteM08JobEngaged,
  noteM08JobOffered,
  secondaryState,
} from '../pilot/windows/secondaryTelemetry';
import { m07SurfaceModel } from '../pilot/windows/surfaceModels';
import {
  WORKSHOP_SITES,
  WORKSHOP_SPAWN,
  WORKSHOP_STATIONS,
} from '../pilot/zoneSites';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
} from '../world';
import { promptText } from '../world/interactionRegistry';
import {
  VESTIBULE_FOREGROUND,
  VESTIBULE_OPENINGS,
  vestibuleSpan,
  WORKSHOP_COLS,
  WORKSHOP_LAYOUT,
  WORKSHOP_ROWS,
  WORKSHOP_SOLIDS,
} from '../world/layouts/workshop';
import type { InteractionNear, InteractionRedirect } from '../world/RoomScene';
import { worldToDesign } from '../world/viewport';

declare global {
  interface Window {
    /** DEV-only, read-only return-shift probe (Unit 5). */
    __returnProbe?: ReturnType<typeof returnProbeSnapshot> | null;
    /**
     * DEV-only, read-only probe of the set-down control (U14-D): shown
     * only while a piece is carried, beside the line that states what is
     * carried; the rectangle is the control's pointer target in the
     * 800 × 600 design space. Never read back into gameplay.
     */
    __m04SetDownProbe?: {
      visible: boolean;
      /** The control's own line. */
      text: string | null;
      /** The carried-item line shown beside it. */
      status: string | null;
      key: string;
      hovered: boolean;
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
    /**
     * DEV-only, read-only probe of the bin as a target (U14-D): the gate
     * of the carried piece, whether the avatar stands in the bin's range
     * and whether the bin's outline is shown. Never read back.
     */
    __m04BinProbe?: {
      carrying: string | null;
      released: boolean;
      been_outside: boolean;
      acquired: boolean;
      drag_held: boolean;
      in_range: boolean;
      outlined: boolean;
      /** The station whose recorded progress is watched (null = none). */
      watching: string | null;
    } | null;
  }
}

const TILE = 32;

const CUTTER_LABEL = 'Sample Cutter';
/**
 * ONE reach (px) for a loose piece and for the bin, by keyboard and by
 * pointer alike (U14-D2, `m04-cutting-v4`): the pointer layer is given
 * the same figure, so both input modes lift a piece and use the bin
 * from the same positions.
 */
const PIECE_REACH = 64;
const BIN_REACH = 64;
/** The key that sets a carried piece down (U14-D); the control states it. */
const SET_DOWN_KEY = 'X';
/** The set-down control's line. */
const SET_DOWN_TEXT = `${SET_DOWN_KEY} — Set down`;
/**
 * The carried-item line and the set-down control sit below the avatar's
 * feet (room px below the avatar's origin), side by side.
 */
const SET_DOWN_BELOW_PX = 44;
const SET_DOWN_GAP_PX = 4;
const SET_DOWN_FILL = '#1b2a36';
const SET_DOWN_FILL_TARGETED = '#2f6f66';

/**
 * What a press acts on instead of the station, bundle or floor in range
 * (U14-C): a piece to lift, a piece on open floor the full hands cannot
 * lift, or the bin for the carried piece.
 */
type DebrisTarget =
  | { kind: 'piece'; piece: M04Piece; origin: M04PickupOrigin }
  | { kind: 'hands_full'; piece: M04Piece }
  | { kind: 'bin'; carried: M04Piece; origin: M04PickupOrigin };

/**
 * World V2 rescue continuation: all workshop coordinates live in the
 * shared, machine-audited zone book (src/pilot/zoneSites.ts) — anchors
 * mapped to the painted two-bay plate, every approach ±12 px safe.
 */
const WS = WORKSHOP_SITES;

export class RecordsWorkshopScene extends PilotZoneScene {
  protected readonly roomId = 'records_workshop';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'records_workshop' as const;

  private physical: PhysicalManipulationLayer | null = null;
  private consoleChip: Phaser.GameObjects.Text | null = null;
  private benchChip: Phaser.GameObjects.Text | null = null;
  private deskChip: Phaser.GameObjects.Text | null = null;
  private trayChip: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(key.scene.recordsWorkshop);
  }

  /** The return shift is live: stage at or after the Concourse check-in. */
  private returnShift(): boolean {
    return pilotStageAtOrAfter('return_hub');
  }

  protected getLayout(): RoomLayout {
    return {
      theme: 'workshop',
      grid: [...WORKSHOP_LAYOUT],
      solids: WORKSHOP_SOLIDS,
      field: 'wide',
      plateTexture: 'w2-workshop-plate',
    };
  }

  protected bundleDropBounds(): { width: number; height: number } {
    return { width: WORKSHOP_COLS * TILE, height: WORKSHOP_ROWS * TILE };
  }

  protected getSpawn(): { x: number; y: number } {
    // Inside the east door, machine-audited: ≥80 px from the door anchor
    // and outside every interactable's 72 px radius, so a reflex SPACE on
    // arrival never re-triggers anything (V2 finding U8-8 precedent).
    return WORKSHOP_SPAWN;
  }

  create(data?: { spawn?: string }) {
    ensureInventoryIconTextures(this);
    installInventoryTelemetry();
    setInventoryTelemetryScene(key.scene.recordsWorkshop);
    // Declarations (register: declared + offered; idempotent).
    declareM02C();
    declareM03T();
    declareM04();
    declareM06();
    declareM07();
    declareM12('o2');
    declareM13Lattice();
    declareReturnWindows();
    stampContaminationNotes();

    super.create(data);
    this.buildVestibuleForeground();
    this.buildSetDownControl();

    noteM08JobOffered('stow_supplies');

    // The return shift (Unit 5): the end opportunities are PRESENTED on
    // entry — M07 end (bench available), M20 resume (feed console with the
    // persisted start), M21 / M22 surfaces. Never a reminder, never a gate.
    if (this.returnShift()) {
      const now = Date.now();

      // M03 (Unit 14): press batch B is presented once it can run (from
      // Vale's check-in on), never while the press would still refuse.
      if (pilotStageAtOrAfter('workshop_return')) {
        presentM03T('b', now);
      }

      presentM07End(now);
      m20ConsolePresent(now);
      m21Present(now);
      m22Present(now);
    }

    // M04 (U14-D): while another station's panel is open this scene is
    // paused, so the other task's recorded progress is read once per game
    // step — the first departure is written right after the accepted
    // action, never at the panel's opening or closing.
    const readOtherWork = () => this.checkOtherWork();

    this.otherWorkWatch = null;
    this.binGate = createM04BinGate();
    this.game.events.on(Phaser.Core.Events.POST_STEP, readOtherWork);

    this.events.on('resume', () => {
      const now = Date.now();

      // The panel is closed: whatever it recorded is read one last time.
      this.checkOtherWork();
      this.otherWorkWatch = null;
      resumeM06Surface(now);
      resumeM12Surface('o2', now);
      resumeM01Surface('o2', now);
      this.physical?.syncObjects(this.debrisEntries());
      this.refreshReturnChips();
    });
    this.events.once('shutdown', () => {
      this.game.events.off(Phaser.Core.Events.POST_STEP, readOtherWork);
      this.otherWorkWatch = null;

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__returnProbe = null;
        window.__m04SetDownProbe = null;
        window.__m04BinProbe = null;
      }
    });

    this.refreshReturnChips();
    refreshPilotCoverageProbe();
  }

  protected populateRoom(): void {
    this.addPilotDoor({
      to: 'station_concourse',
      spawn: 'records_workshop',
      registryId: 'workshop.door_concourse',
    });
    // The sliding door and its lintel lamp are baked into the plate's
    // east wall; the generic leaf sprite would double it.
    this.doorImage('workshop.door_concourse')?.setVisible(false);

    const S = WORKSHOP_STATIONS;

    // ——— Work Order Board (stage anchor) ———
    this.addStation({
      interactionKey: 'pilotWorkOrderBoard',
      label: 'Work Order Board',
      texture: 'proc-board-workorders',
      x: S.workOrderBoard.x,
      y: S.workOrderBoard.y,
      onPromptOpened: () => {
        // Reading the board is an inspection: it closes no cutting job
        // (U14-D). Only the optional filter swap is work done here.
        this.logStationOpened('work_order_board');
        noteM08JobOffered('filter_swap');
        return true;
      },
    });
    registerPilotStation({
      id: 'work_order_board',
      zone: 'records_workshop',
      x: S.workOrderBoard.x,
      y: S.workOrderBoard.y,
      label: 'Work Order Board',
      stages: ['workshop', 'workshop_work', 'workshop_return'],
      isDone: () => false,
      order: 0,
    });

    // Incoming supplies — recoverable world items (secondary telemetry only).
    this.bundles.spawn('Component bundle', S.supplyA.x, S.supplyA.y, [
      { definitionId: 'fuse_contact', quantity: 2 },
      { definitionId: 'relay_housing', quantity: 1 },
    ]);
    this.bundles.spawn('Sample kit', S.supplyB.x, S.supplyB.y, [
      { definitionId: 'sample_vial', quantity: 1 },
      { definitionId: 'seal_cap', quantity: 1 },
    ]);
    this.bundles.spawn('Wire and wrap', S.supplyC.x, S.supplyC.y, [
      { definitionId: 'wire_spool', quantity: 2 },
      { definitionId: 'insulation_wrap', quantity: 2 },
    ]);

    // ——— M02 case workspace (open organisation + retrieval) ———
    this.station(
      'case_workspace',
      'Case Workspace',
      'proc-desk-closure',
      S.filingDesk,
      () => {
        // Entry state (Unit 13): the route stage and the other Workshop
        // items' window states at the open.
        noteM02CEntry({
          stage: pilotStage(),
          m04_debris: m04SiteStatus(),
          m06_orders: m06Window.windowStatus(),
          m07_calibration: m07Window.windowStatus(),
          m12_packet_o2: m12Windows.o2.windowStatus(),
        });
        openInventoryOverlay(this, { mode: 'm02case', allowWorldDrop: false });
      },
      undefined,
      // Recorded work: a case moved to another tray, a tray labelled, the
      // workspace handed over, a request answered.
      () => {
        const s = m02cState();

        return [
          s.moveCount,
          s.labelChanges,
          s.handedOverAtMs !== null,
          s.requests.filter((request) => request.answer !== null).length,
        ].join('|');
      },
    );
    this.guided(
      'case_workspace',
      S.filingDesk,
      'Case Workspace',
      ['workshop_work'],
      1,
      () => m02cWindow.isClosed(),
    );

    // ——— M03 press occasions (Station 080 U14: three tools each): A in
    // episode 2, B on the return shift ———
    this.addPressStation('a', 'Label Press A', S.pressA, 2, ['workshop_work']);
    this.addPressStation('b', 'Label Press B', S.pressB, 2, [
      'workshop_return',
    ]);

    // ——— Component Locker / Assembly Bench (secondary inventory) ———
    this.station(
      'storage_locker',
      'Component Locker',
      'proc-crate-components',
      S.storageLocker,
      () => {
        // The locker's first use is the engagement with the optional
        // stowing job: the departure is written AFTER that transition
        // succeeded. A later opening engages nothing again; there the
        // first change of what the locker holds is the work.
        const engagedBefore = secondaryState().m08.stow_supplies.engaged;

        noteM08JobEngaged('stow_supplies', Date.now());

        if (!engagedBefore && secondaryState().m08.stow_supplies.engaged) {
          this.noteOtherWorkBegun('storage_locker');
        }

        openInventoryOverlay(this, { mode: 'container', allowWorldDrop: true });
      },
      undefined,
      () => this.containerContents([CONTAINER_IDS.labStorage]),
    );
    this.station(
      'assembly_bench',
      'Assembly Bench',
      'proc-bench-prep',
      S.assemblyBench,
      () => {
        openInventoryOverlay(this, { mode: 'workbench', allowWorldDrop: true });
      },
      undefined,
      // Opening the bench is no work: a part laid on it or an assembly is.
      () =>
        this.containerContents([
          CONTAINER_IDS.workbenchInput,
          CONTAINER_IDS.workbenchOutput,
        ]),
    );

    // ——— M04 sample cutter + disposal chute (Station 080 U14: two
    // cutting jobs of three pieces, each closed at its first departure) ———
    this.addStation({
      interactionKey: 'pilotStation',
      label: 'Sample Cutter',
      texture: 'proc-rig-intake',
      x: WS.sampleCutter.x,
      y: WS.sampleCutter.y,
      onPromptOpened: () => {
        this.logStationOpened('sample_cutter');
        this.useSampleCutter();
        return false;
      },
    });
    this.guided(
      'sample_cutter',
      WS.sampleCutter,
      'Sample Cutter',
      ['workshop_work'],
      3,
      // Done while no coupon is waiting to be cut (the second coupon
      // becomes available after the first job's departure).
      () => m04NextJob() === null,
    );
    // World V2: the cutter and the disposal bin are baked into the plate
    // in the cutting annex (U14-D2), the bin south of the cutter — no
    // chute sprite; the physical container sits on the painted bin.
    this.buildPhysicalLayer();

    // ——— M06 dispatch console (Station 080 U7: practice, then twelve
    // orders in one 60 s focused work budget) ———
    this.station(
      'dispatch_console',
      'Dispatch Console',
      'proc-console-scenario',
      WS.dispatchConsole,
      () => {
        // Entry state (review U7 S-F5 / S-F6): the route stage at every
        // open and the other Workshop items' window states at the first.
        openM06(Date.now(), {
          stage: pilotStage(),
          m02_case_workspace: m02cWindow.windowStatus(),
          m04_debris: m04SiteStatus(),
          m07_calibration: m07Window.windowStatus(),
          m12_packet_o2: m12Windows.o2.windowStatus(),
        });
        openWorkSurface(this, {
          surfaceId: 'm06_dispatch_console',
          model: () => m06SurfaceModel(this.m06SurfaceHost()),
          onClose: () => {
            closeM06Surface(Date.now());
          },
          onClosed: () => {
            this.m06TickSerial += 1;
            this.m06TickPending = false;
          },
        });
      },
      // A surface already open is not opened again (unchanged).
      () => activeWorkSurface(this) === null,
      // Recorded work: a token keyed or removed, the line cleared, a line
      // sent, the work period begun, the stop armed.
      () => {
        const s = m06State();

        return [
          s.tokenPresses,
          s.tokensRemoved,
          s.clears,
          s.practiceSent,
          s.typedLines,
          s.beganAtMs !== null,
          s.stopArmPresses,
        ].join('|');
      },
    );
    this.guided(
      'dispatch_console',
      WS.dispatchConsole,
      'Dispatch Console',
      ['workshop_work'],
      4,
      () => m06Window.isClosed(),
    );

    // ——— M07 calibration bench (start; natural return in episode 5) ———
    this.station(
      'calibration_bench',
      'Calibration Bench',
      'proc-cabinet-calibration',
      WS.calibrationBench,
      () => {
        const stage = pilotStage();

        openM07(
          Date.now(),
          stage === 'workshop_work'
            ? 'workshop_work'
            : stage === 'workshop_return'
              ? 'workshop_return'
              : 'other',
        );
        openWorkSurface(this, {
          surfaceId: 'm07_calibration_bench',
          model: () => m07SurfaceModel(this.returnSurfaceHost()),
          onClose: () => closeM07Surface(Date.now()),
        });
      },
      undefined,
      // Recorded work: a calibration stage carried out.
      () => String(m07State().stagesCompleted),
    );
    this.guided(
      'calibration_bench',
      WS.calibrationBench,
      'Calibration Bench',
      ['workshop_work'],
      5,
      () => m07State().visits > 0,
    );

    // ——— M12 quality packet (occasion 2) ———
    this.station(
      'qc_packet_o2',
      'Quality Packet',
      'proc-desk-reception',
      WS.qcPacket,
      () => {
        // Entry state (Unit 8): the route stage and the other Workshop
        // items' window states at the open.
        openM12('o2', Date.now(), {
          stage: pilotStage(),
          m02_case_workspace: m02cWindow.windowStatus(),
          m04_debris: m04SiteStatus(),
          m06_orders: m06Window.windowStatus(),
          m07_calibration: m07Window.windowStatus(),
        });
        openWorkSurface(this, {
          surfaceId: 'm12_qc_packet_o2',
          model: () => m12SurfaceModel('o2', this.m12SurfaceHost()),
          onClose: () => closeM12Surface('o2', Date.now()),
        });
      },
      undefined,
      // Recorded work: a field checked, judged or corrected; the packet
      // released.
      () => {
        const s = m12State('o2');

        return `${s.actions}|${s.released}`;
      },
    );
    this.guided(
      'qc_packet_o2',
      WS.qcPacket,
      'Quality Packet',
      ['workshop_work'],
      6,
      () => m12Windows.o2.isClosed(),
    );

    // ——— M13 conduit lattice bench (physical pipe board) ———
    this.station(
      'lattice_bench',
      'Conduit Lattice Bench',
      'proc-pipe-valve',
      WS.latticeBench,
      () => {
        openIpOverlay(this, key.scene.ipPipeBoard, 'm13', {});
      },
      undefined,
      // Recorded work: a piece seated, moved, turned or returned, a step
      // undone, the board reset, the lattice submitted. A piece only
      // lifted, and the help sheet, are not.
      () => {
        const s = m13LatticeProbe();

        return [
          s.placements,
          s.moves,
          s.rotations,
          s.returns,
          s.undos,
          s.resets,
          s.submission_count,
        ].join('|');
      },
    );
    this.guided(
      'lattice_bench',
      WS.latticeBench,
      'Conduit Lattice Bench',
      ['workshop_work'],
      7,
      () => false,
    );

    // ——— M11 seal log (secondary only) ———
    this.addStation({
      interactionKey: 'pilotSealLog',
      label: 'Sample Seal Log',
      texture: 'proc-board-portfolio',
      x: WS.sealLog.x,
      y: WS.sealLog.y,
      onPromptOpened: () => {
        this.logStationOpened('seal_log');
        return true;
      },
    });

    this.populateReturnShift();

    // ——— World V2: the painted plate IS the architecture and all the
    // furniture — hide every station marker sprite (interactions,
    // prompts and events untouched; the Concourse precedent). The old
    // functional-area floor plates, light pools and wall modules are
    // gone: the plate's baked lamps, wayfinding lines and machinery
    // carry that reading.
    for (const child of this.children.list) {
      if (
        child instanceof Phaser.GameObjects.Image &&
        [
          'proc-board-workorders',
          'proc-desk-closure',
          'proc-rig-intake',
          'proc-crate-components',
          'proc-bench-prep',
          'proc-console-scenario',
          'proc-cabinet-calibration',
          'proc-desk-reception',
          'proc-pipe-valve',
          'proc-board-portfolio',
          'proc-console-wall',
        ].includes(child.texture.key)
      ) {
        child.setVisible(false);
      }
    }
  }

  // ——— Return shift (Unit 5) ———————————————————————————————————————————

  /**
   * The four return-shift stations exist in every stage (one consistent
   * world); their windows open only on the return. Placement follows the
   * D-V2-1 rule (see zoneSites.ts). The feed console sits on the upper
   * machinery block and shows the PERSISTED antenna state on its chip —
   * visible state, never a reminder.
   */
  private populateReturnShift(): void {
    const S = WORKSHOP_STATIONS;

    // ——— M20 station feed console ———
    this.addStation({
      interactionKey: 'pilotFeedConsole',
      label: 'Station Feed Console',
      texture: 'proc-console-wall',
      x: S.feedConsole.x,
      y: S.feedConsole.y,
      onPromptOpened: () => {
        this.logStationOpened('feed_console');

        if (!this.returnShift()) {
          // Standby before the exterior shift is logged: a plain prompt,
          // no M20 event (the resume opportunity is not presented yet).
          return true;
        }

        const availability = m20ConsoleOpen(Date.now(), 'keyboard');

        if (!availability.available) {
          return true; // unavailable history: prompt states it, no surface
        }

        // Recorded work: the restoration resumed, an indoor stage done.
        // The console inspected is not.
        this.watchOtherWork('feed_console', () => {
          const m20 = returnProbeSnapshot().m20;

          return `${m20.returned}|${m20.useful_resume_actions}`;
        });
        this.openReturnSurface('m20_feed_console', () =>
          m20FeedConsoleSurfaceModel(this.returnSurfaceHost()),
        );
        return false;
      },
    });
    this.consoleChip = this.chip(S.feedConsole.x, S.feedConsole.y - 62, '');

    // ——— M21 relay bench (drawer manual) ———
    this.addStation({
      interactionKey: 'pilotRelayBench',
      label: 'Relay Bench',
      texture: 'proc-bench-prep',
      x: S.relayBench.x,
      y: S.relayBench.y,
      onPromptOpened: () => {
        this.logStationOpened('relay_bench');

        if (!this.returnShift()) {
          return true;
        }

        // Recorded work: a post or the selector set, the unit applied,
        // accepted or set aside. The plate and the manual read are not.
        this.watchOtherWork('relay_bench', () =>
          (['o1', 'o2'] as const)
            .map((caseId) => {
              const s = m21State(caseId);

              return [
                s.actions.length,
                s.applications.length,
                s.accepted,
                s.stop_choice ?? 'open',
              ].join(',');
            })
            .join('|'),
        );
        m21BenchOpen(Date.now(), 'keyboard');
        this.openReturnSurface('m21_relay_bench', () =>
          m21RelayBenchSurfaceModel(this.returnSurfaceHost()),
        );
        return false;
      },
    });
    this.benchChip = this.chip(S.relayBench.x, S.relayBench.y - 58, '');
    this.guided(
      'relay_bench',
      S.relayBench,
      'Relay Bench',
      ['workshop_return'],
      3,
      () => m21AllClosed(),
    );

    // ——— M22 shift report desk ———
    this.addStation({
      interactionKey: 'pilotReportDesk',
      label: 'Shift Report Desk',
      texture: 'proc-desk-closure',
      x: S.reportDesk.x,
      y: S.reportDesk.y,
      onPromptOpened: () => {
        this.logStationOpened('report_desk');

        if (!this.returnShift()) {
          return true;
        }

        // Recorded work: a line placed or coded, the report submitted or
        // withdrawn, the setback acknowledged, a rating given. A tray
        // line selected and the register read are not.
        this.watchOtherWork('report_desk', () =>
          [
            ...(['o1', 'o2'] as const).map((report) => {
              const s = m22State(report);

              return [
                s.slots.map((slot) => slot ?? '-').join('/'),
                Object.values(s.codes)
                  .map((code) => code ?? '-')
                  .join('/'),
                s.submissions.length,
                s.setback_acknowledged_at_ms !== null,
                s.stop_choice ?? 'open',
              ].join(',');
            }),
            (['o1', 'o2'] as const)
              .map((report) => m22Ratings().ratings[report] !== null)
              .join(','),
          ].join('|'),
        );
        m22DeskOpen(Date.now(), 'keyboard');
        this.openReturnSurface('m22_report_desk', () =>
          m22ReportDeskSurfaceModel(this.returnSurfaceHost()),
        );
        return false;
      },
    });
    this.deskChip = this.chip(S.reportDesk.x, S.reportDesk.y + 34, '');
    this.guided(
      'report_desk',
      S.reportDesk,
      'Shift Report Desk',
      ['workshop_return'],
      4,
      () => m22DeskDone(),
    );

    // ——— Outbound handover desk (tray + the M25 questionnaire notice) ———
    this.addStation({
      interactionKey: 'pilotHandoverDesk',
      label: 'Outbound Handover Desk',
      texture: 'proc-desk-reception',
      x: S.handoverDesk.x,
      y: S.handoverDesk.y,
      onPromptOpened: () => {
        this.logStationOpened('handover_desk');

        if (this.returnShift()) {
          m25PresentNotice(Date.now());
        }

        return true;
      },
    });
    this.trayChip = this.chip(S.handoverDesk.x, S.handoverDesk.y - 36, '');
    this.guided(
      'handover_desk',
      S.handoverDesk,
      'Outbound Handover Desk',
      ['workshop_return'],
      5,
      () => m25State().handoff === 'acknowledged',
    );
  }

  /** M01 (Unit 5): the return orders batch, opened from the board's beat. */
  private openReturnOrders() {
    if (activeWorkSurface(this) !== null) {
      return;
    }

    declareM01('o2');
    // Recorded work: a card placed or returned, a job worked. A card
    // only lifted is not.
    this.watchOtherWork('return_orders', () => {
      const s = m01State('o2');

      return [s.placements, s.returns, s.plan_locked, s.done.length].join('|');
    });
    openM01('o2', Date.now());
    openWorkSurface(this, {
      surfaceId: 'm01_return_orders',
      model: () => m01SurfaceModel(this.returnSurfaceHost(), 'o2'),
      onClose: () => closeM01Surface('o2', Date.now()),
    });
  }

  private openReturnSurface(
    surfaceId: 'm20_feed_console' | 'm21_relay_bench' | 'm22_report_desk',
    model: () => ReturnType<typeof m20FeedConsoleSurfaceModel>,
  ) {
    openWorkSurface(this, {
      surfaceId,
      // The host is paused under the surface, so the DEV probe is
      // refreshed from every model rebuild (each activation / timer).
      model: () => {
        const built = model();

        if (typeof window !== 'undefined' && import.meta.env.DEV) {
          window.__returnProbe = returnProbeSnapshot();
        }

        return built;
      },
      onClose: () => {
        const now = Date.now();

        if (surfaceId === 'm20_feed_console') {
          m20ConsoleLeave(now);
        } else if (surfaceId === 'm21_relay_bench') {
          m21BenchLeave(now);
        } else {
          m22DeskLeave(now);
        }
      },
      onClosed: () => this.refreshReturnChips(),
    });
  }

  private returnSurfaceHost(): ReturnSurfaceHost {
    return {
      ...this.surfaceHost(),
      later: (ms, fn) => {
        const surface = activeWorkSurface(this);

        if (surface === null) {
          fn();
          return;
        }

        surface.time.delayedCall(ms, () => {
          fn();
          activeWorkSurface(this)?.refresh();
        });
      },
      deliverRelayUnit: () => this.deliverRelayUnit(),
    };
  }

  /**
   * The fitted relay unit is a physical output: it goes to the belt, or —
   * belt full — becomes a recoverable bundle beside the bench (lossless).
   */
  private deliverRelayUnit(): 'inventory' | 'bench_bundle' {
    if (!isInventoryFull() && addInventoryItem('relay_unit')) {
      return 'inventory';
    }

    const at = WORKSHOP_STATIONS.relayBench;

    this.bundles.spawn('Relay unit', at.x + 48, at.y + 8, [
      { definitionId: 'relay_unit', quantity: 1 },
    ]);

    return 'bench_bundle';
  }

  /** World chips reflect participant state (persisted across creations). */
  private refreshReturnChips(): void {
    const live = this.returnShift();

    this.consoleChip?.setText(
      live
        ? m20ConsoleStatusLine().replace('FEED CONSOLE · ', '')
        : 'standby — exterior shift not logged',
    );

    this.benchChip?.setText(m21BenchChipText(live));

    this.deskChip?.setText(m22DeskChipText(live));

    const tray = handoverTray();
    const placed = [
      tray.relay_unit ? 'relay unit' : null,
      tray.relay_coupling ? 'relay coupling' : null,
    ].filter((entry): entry is string => entry !== null);

    this.trayChip?.setText(
      !live
        ? 'tray empty'
        : placed.length === 0
          ? 'outbound tray empty'
          : `outbound: ${placed.join(' · ')}`,
    );

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__returnProbe = returnProbeSnapshot();
    }
  }

  /**
   * Unit 2 review (C3/R3): state chips render in the environment register
   * (muted, translucent) and sort at their own foot line so a figure is
   * never covered by a readout.
   */
  private chip(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return (
      this.add
        .text(x, y, text, {
          backgroundColor: '#101820',
          color: '#9fb2c1',
          font: '10px monospace',
          padding: { x: 4, y: 2 },
          resolution: 2,
        })
        .setOrigin(0.5)
        .setAlpha(0.85)
        // Sorted just below the foot line of the prop it annotates (chips sit
        // on or under their console) so the chip is read over the prop and
        // under any figure standing south of it.
        .setDepth(worldDepth(y + 40))
    );
  }

  /** Handover desk prompt body: tray state (operational; no outcomes). */
  private handoverBody(): string {
    if (!this.returnShift()) {
      return 'OUTBOUND HANDOVER\nNothing goes out until the return shift.';
    }

    const tray = handoverTray();

    return (
      'OUTBOUND HANDOVER — RETURN SHIFT\n' +
      `Tray: relay unit ${tray.relay_unit ? 'placed' : '—'} · recovered relay coupling ${tray.relay_coupling ? 'placed' : '—'}.`
    );
  }

  private handoverOptions(): PromptOption[] {
    if (!this.returnShift()) {
      return [{ label: 'Step away', feedback: '', getEventTypes: () => [] }];
    }

    const tray = handoverTray();
    const options: PromptOption[] = [];

    if (!tray.relay_unit && hasInventoryItem('relay_unit')) {
      options.push({
        label: 'Place the relay unit in the outbound tray',
        feedback: 'Relay unit placed in the outbound tray.',
        getEventTypes: () => [],
        onSelected: () => {
          if (
            removeInventoryItem('relay_unit') &&
            noteHandoverPlaced('relay_unit')
          ) {
            this.noteOtherWorkBegun('handover_desk');
            this.logScenarioEvent(
              'pilotHandoverDesk',
              'pilot_handover_placed',
              {
                metadata: { item: 'relay_unit', zone: this.zoneKey },
              },
            );
            this.refreshReturnChips();
          }
        },
      });
    }

    if (!tray.relay_coupling && hasInventoryItem('relay_coupling')) {
      options.push({
        label: 'Place the recovered relay coupling in the tray',
        feedback: 'Relay coupling placed in the outbound tray.',
        getEventTypes: () => [],
        onSelected: () => {
          if (
            removeInventoryItem('relay_coupling') &&
            noteHandoverPlaced('relay_coupling')
          ) {
            this.noteOtherWorkBegun('handover_desk');
            this.logScenarioEvent(
              'pilotHandoverDesk',
              'pilot_handover_placed',
              {
                metadata: { item: 'relay_coupling', zone: this.zoneKey },
              },
            );
            this.refreshReturnChips();
          }
        },
      });
    }

    options.push({
      label:
        m25State().handoff === 'acknowledged'
          ? 'Read the questionnaire notice again'
          : 'Read the questionnaire notice',
      feedback: '',
      getEventTypes: () => [],
      onSelected: () => m25ViewNotice(),
      nextStage: () => this.questionnaireNoticeStage(),
    });
    options.push({ label: 'Step away', feedback: '', getEventTypes: () => [] });

    return options;
  }

  /** M25 handoff shell: the transparent notice with one acknowledgement. */
  private questionnaireNoticeStage(): PromptStage {
    const acknowledged = m25State().handoff === 'acknowledged';

    return {
      body: M25_HANDOFF_TEXT,
      options: [
        {
          label: acknowledged ? 'Close the notice' : 'Noted.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            if (!acknowledged) {
              m25AcknowledgeNotice(Date.now(), 'keyboard');
              this.refreshReturnChips();
            }
          },
        },
      ],
    };
  }

  // ——— helpers ————————————————————————————————————————————————————————

  /**
   * A station that opens a panel or a work surface. `opens` (default:
   * always) is the station's own refusal to open at all; `progress`
   * reads what the station's task has RECORDED of the participant's
   * accepted work (moves, answers, placements, decisions — never the
   * opening, a reading or a refusal). Opening and closing the panel
   * closes no cutting job: the first departure of a job still open is
   * written when that record first changes (U14-D).
   */
  private station(
    id: string,
    label: string,
    texture: string,
    at: { x: number; y: number },
    open: () => void,
    opens: () => boolean = () => true,
    progress: () => string,
  ) {
    this.addStation({
      interactionKey: 'pilotStation',
      label,
      texture,
      x: at.x,
      y: at.y,
      onPromptOpened: () => {
        this.logStationOpened(id);

        if (!opens()) {
          return false;
        }

        this.watchOtherWork(id, progress);
        open();
        return false;
      },
    });
    this.yieldingStations.set(label, id);
  }

  /**
   * What the named containers hold, slot by slot: the record of the
   * Component Locker and of the Assembly Bench (they keep no task state
   * of their own).
   */
  private containerContents(containerIds: readonly string[]): string {
    const { containers } = getInventoryState();

    return containerIds
      .map((containerId) =>
        (containers[containerId]?.slots ?? [])
          .map((stack) =>
            stack === null ? '-' : `${stack.definitionId}x${stack.quantity}`,
          )
          .join(','),
      )
      .join('|');
  }

  /**
   * The station whose panel is open and the record its task held when
   * the panel was opened (null: no panel of another station is open).
   */
  private otherWorkWatch: {
    stationId: string;
    recorded: string;
    progress: () => string;
  } | null = null;

  /**
   * A station's panel is about to open while a cutting job awaits its
   * departure: its task's record is kept, to be compared after every
   * game step. With no job open nothing is watched.
   */
  private watchOtherWork(stationId: string, progress: () => string) {
    this.otherWorkWatch =
      m04JobOpen() === null
        ? null
        : { stationId, recorded: progress(), progress };
  }

  /**
   * The watched task recorded accepted work: that is the first departure
   * of the cutting job still open. A panel only shown, a refusal, a
   * record that is closed or held back change nothing and close nothing.
   */
  private checkOtherWork() {
    const watch = this.otherWorkWatch;

    if (watch === null) {
      return;
    }

    if (m04JobOpen() === null) {
      this.otherWorkWatch = null;

      return;
    }

    if (watch.progress() !== watch.recorded) {
      this.otherWorkWatch = null;
      this.noteOtherWorkBegun(watch.stationId);
    }
  }

  /**
   * Stations that yield the press to a nearer bin while a piece is
   * carried (label → station id): the Case Workspace, the presses, the
   * Component Locker, the Assembly Bench and the benches of the first
   * shift. A station never yields to a loose piece (U14-D). The Work
   * Order Board, the seal log, the return-shift stations and the door
   * never yield.
   */
  private readonly yieldingStations = new Map<string, string>();

  private guided(
    id: string,
    at: { x: number; y: number },
    label: string,
    stages: ('workshop_work' | 'workshop_return')[],
    order: number,
    isDone: () => boolean,
  ) {
    registerPilotStation({
      id,
      zone: 'records_workshop',
      x: at.x,
      y: at.y,
      label,
      stages,
      isDone,
      order,
    });
  }

  private surfaceHost() {
    return {
      now: () => Date.now(),
      close: () => activeWorkSurface(this)?.close(),
      feedback: (message: string) =>
        activeWorkSurface(this)?.showFeedback(message),
    };
  }

  /** M12 (Unit 8): the Leave button and ESC take the SAME path — pause, then close. */
  private m12SurfaceHost() {
    return {
      now: () => Date.now(),
      close: () => {
        closeM12Surface('o2', Date.now());
        activeWorkSurface(this)?.close();
      },
      feedback: (message: string) =>
        activeWorkSurface(this)?.showFeedback(message),
    };
  }

  private m06TickPending = false;
  private m06TickSerial = 0;

  /** M06 (Unit 7): the dispatch console's host — wall-clock tick (M25 precedent). */
  private m06SurfaceHost() {
    return {
      now: () => Date.now(),
      // The Leave button and ESC take the SAME path: pause first, then close.
      close: () => {
        closeM06Surface(Date.now());
        activeWorkSurface(this)?.close();
      },
      feedback: (message: string) =>
        activeWorkSurface(this)?.showFeedback(message),
      later: (ms: number, fn: () => void) => {
        if (this.m06TickPending) {
          return;
        }

        this.m06TickPending = true;

        const serial = this.m06TickSerial;

        window.setTimeout(() => {
          if (serial !== this.m06TickSerial) {
            return;
          }

          this.m06TickPending = false;

          if (activeWorkSurface(this) === null) {
            return;
          }

          fn();
          activeWorkSurface(this)?.refresh();
        }, ms);
      },
    };
  }

  private addPressStation(
    occasion: M03Occasion,
    label: string,
    at: { x: number; y: number },
    order: number,
    stages: ('workshop_work' | 'workshop_return')[],
  ) {
    const scheduled = () =>
      occasion === 'a'
        ? !pilotStageAtOrAfter('return_hub')
        : pilotStageAtOrAfter('workshop_return');

    this.addStation({
      interactionKey: 'pilotStation',
      label,
      texture: 'proc-rig-intake',
      x: at.x,
      y: at.y,
      onPromptOpened: () => {
        this.logStationOpened(`press_${occasion}`);

        if (m03tTerminal(occasion)) {
          // Only a panel the participant closed finished its batch; a
          // panel stopped by the system did not (U14-C).
          this.showFeedbackMessage(m03tIdleLine(occasion));
          return false;
        }

        if (!scheduled()) {
          this.showFeedbackMessage(
            'No batch scheduled on this press right now.',
          );
          return false;
        }

        // The panel shown closes no cutting job (U14-D): the press's
        // recorded work does — the roll moved, a cycle run, a tool moved.
        // A press held back after a reload records none of them.
        this.watchOtherWork(`press_${occasion}`, () => {
          const s = m03tState(occasion);

          return `${s.practiceMoves}|${s.cycles}|${s.moveCount}`;
        });

        if (m03tPhase(occasion) === 'unopened') {
          const other: M03Occasion = occasion === 'a' ? 'b' : 'a';

          if (m03tPhase(other) === 'departed') {
            m03tWindow(occasion).recordPriorExposure(
              `exposure:${m03tWindow(other).spec.opportunityId}_closed_before`,
            );
          }
        }

        // U14-C: a press opened before any work order named its batch is
        // presented HERE, by the press itself and before the panel —
        // recorded once, never backdated to a listing that did not occur.
        if (m03tPresentedBy(occasion) === null) {
          presentM03T(occasion, Date.now(), 'station_direct');
        }

        // Entry state (Unit 14): the route stage and the other Workshop
        // items' window states at the open.
        noteM03TEntry(occasion, {
          stage: pilotStage(),
          m02_case_workspace: m02cWindow.windowStatus(),
          m04_debris: m04SiteStatus(),
          m06_orders: m06Window.windowStatus(),
          m07_calibration: m07Window.windowStatus(),
          m12_packet_o2: m12Windows.o2.windowStatus(),
        });
        openInventoryOverlay(this, {
          mode: 'm03tools',
          m03Occasion: occasion,
          allowWorldDrop: false,
        });
        return false;
      },
    });
    this.yieldingStations.set(label, `press_${occasion}`);
    registerPilotStation({
      id: `press_${occasion}`,
      zone: 'records_workshop',
      x: at.x,
      y: at.y,
      label,
      stages,
      isDone: () => m03tTerminal(occasion),
      order,
    });
  }

  /** The cutter cuts in the restoration shift only (register: one episode). */
  private cuttingScheduled(): boolean {
    return !pilotStageAtOrAfter('return_hub');
  }

  /**
   * One use of the Sample Cutter (a press while the prompt names the
   * cutter). A waiting coupon is cut. With none waiting, a press inside
   * the settle window of the cut is refused (a repeated press is never an
   * act on the pieces); otherwise the bench states that it has nothing to
   * cut. A press that names the cutter NEVER lifts or drops a piece
   * (U14-C): where the bin is what the press would act on, the prompt
   * names it and the press never reaches this method
   * (`interactionRedirect`); a piece is never named within the cutter's
   * range (U14-D).
   */
  private useSampleCutter() {
    if (m04NextJob() !== null && this.cuttingScheduled()) {
      // Entry state (Unit 14): the route stage and the other Workshop
      // items' window states at the cut.
      noteM04Entry({
        stage: pilotStage(),
        m02_case_workspace: m02cWindow.windowStatus(),
        m06_orders: m06Window.windowStatus(),
        m07_calibration: m07Window.windowStatus(),
        m12_packet_o2: m12Windows.o2.windowStatus(),
      });

      const result = runM04SampleJob(Date.now(), 'keyboard', (job) =>
        m04JobPieces(job).every((piece) => this.textures.exists(piece.icon)),
      );

      if (result.outcome === 'run') {
        this.player.playActionAnim('dig');
        // The same line after both cuts (U14-D): it states the cut and
        // nothing else — never a word about the pieces, about leaving or
        // about other work.
        this.showFeedbackMessage(`Sample coupon ${result.number} of 2 cut.`);
        this.physical?.syncObjects(this.debrisEntries());
        this.refreshGuidance();

        return;
      }

      if (result.outcome === 'technical_failure') {
        this.showFeedbackMessage('The cutter jammed. No coupon was cut.');
        this.refreshGuidance();

        return;
      }
    }

    if (refuseM04SettlingPress(Date.now(), 'keyboard')) {
      return;
    }

    if (m04NextJob() !== null) {
      noteM04Unavailable('not_scheduled', 'keyboard');
      this.showFeedbackMessage('No cutting scheduled on the cutter right now.');

      return;
    }

    noteM04Unavailable(
      m04JobOpen() !== null
        ? 'job_open'
        : m04AnyProduced()
          ? 'all_jobs_run'
          : 'out_of_service',
      'keyboard',
    );
    // "Both coupons cut" only when both were: never after a jam (U14-C).
    this.showFeedbackMessage(m04CutterIdleLine());
  }

  /**
   * THE target decision of a press (U14-C) — read once per frame by the
   * prompt and by the press (`interactionRedirect`), so both always
   * agree (one 64 px reach for a piece and for the bin, U14-D2):
   *
   * - a station or a door in range ALWAYS keeps the press against a
   *   loose piece (U14-D): a press meant for a station never lifts one.
   *   The pieces lie clear of every station's range, so each is lifted
   *   by keyboard from open floor, or by pointer;
   * - with a piece carried, the bin takes the press ONLY once it is the
   *   acquired target (`binGate`, U14-D): the press that lifted the piece
   *   is over and the avatar walked into the bin's range from outside
   *   it. Lifting a piece never names the bin. Acquired, the bin takes
   *   the press at the cutter (once no coupon is waiting and the settle
   *   window is over) and at a station that yields, while a cutting job
   *   awaits its departure, when it lies nearer than the station;
   * - on open floor: the acquired bin or the nearest piece, unless a
   *   supply bundle in reach lies nearer.
   *
   * Null = the station, the door or the bundle keeps the press. With the
   * hands full a piece in reach on OPEN FLOOR is still named, and the
   * press states why nothing is lifted.
   */
  private debrisTarget(
    near: { kind: 'station' | 'door'; label: string; distance: number } | null,
  ): DebrisTarget | null {
    let nearerThan = Number.POSITIVE_INFINITY;
    let origin: M04PickupOrigin = 'open_floor_press';
    let namesBlockedPiece = true;

    const carried = m04Carried();

    if (near !== null) {
      if (near.kind === 'door') {
        return null;
      }

      const stationId = this.yieldingStations.get(near.label);

      if (near.label === CUTTER_LABEL) {
        if (
          (m04NextJob() !== null && this.cuttingScheduled()) ||
          m04Settling(Date.now())
        ) {
          return null;
        }

        origin = 'cutter_press';
      } else if (stationId !== undefined) {
        if (m04JobOpen() === null) {
          return null;
        }

        nearerThan = near.distance;
        origin = `station_press:${stationId}`;
      } else {
        return null;
      }

      // The station keeps the press against every loose piece; only the
      // bin, for a piece already in the hands, may take it.
      if (carried === null) {
        return null;
      }

      const toBinHere = Math.hypot(
        this.player.x - WS.disposalChute.x,
        this.player.y - WS.disposalChute.y,
      );

      return this.binGate.acquired &&
        toBinHere <= BIN_REACH &&
        toBinHere < nearerThan
        ? { kind: 'bin', carried, origin }
        : null;
    }

    const bundle = this.bundles.nearest(this.player.x, this.player.y);

    if (bundle !== null) {
      nearerThan = Math.hypot(
        this.player.x - bundle.x,
        this.player.y - bundle.y,
      );
      namesBlockedPiece = false;
    }

    const piece = m04RemainingDebris()
      .map((candidate) => ({
        candidate,
        d: Math.hypot(
          this.player.x - (WS.cutterScatter.x + candidate.dx),
          this.player.y - (WS.cutterScatter.y + candidate.dy),
        ),
      }))
      .filter((c) => c.d <= PIECE_REACH && c.d < nearerThan)
      .sort((a, b) => a.d - b.d)[0]?.candidate;

    if (carried !== null) {
      const toBin = Math.hypot(
        this.player.x - WS.disposalChute.x,
        this.player.y - WS.disposalChute.y,
      );

      if (this.binGate.acquired && toBin <= BIN_REACH && toBin < nearerThan) {
        return { kind: 'bin', carried, origin };
      }

      return namesBlockedPiece && piece !== undefined
        ? { kind: 'hands_full', piece }
        : null;
    }

    return piece === undefined ? null : { kind: 'piece', piece, origin };
  }

  /**
   * The line is drawn 40 px above its anchor. A piece lies within arm's
   * reach, so that line can fall across the figure: it is then raised
   * above the figure's head. Presentation only.
   */
  private promptAnchorY(y: number): number {
    const line = y - 40;

    return line > this.player.y - 44 && line < this.player.y + 36
      ? this.player.y - 4
      : y;
  }

  protected interactionRedirect(
    near: InteractionNear | null,
  ): InteractionRedirect | null {
    const target = this.debrisTarget(near);

    if (target === null) {
      // The station's or the door's own line (above or below it), or the
      // line of the supply bundle in reach.
      const bundle =
        near === null
          ? this.bundles.nearest(this.player.x, this.player.y)
          : null;

      this.promptLines =
        near !== null
          ? [
              { x: near.x, y: near.y - 56 },
              { x: near.x, y: near.y + 56 },
            ]
          : bundle !== null
            ? [{ x: bundle.x, y: bundle.y - 40 }]
            : [];

      return null;
    }

    const named =
      target.kind === 'bin'
        ? WS.disposalChute
        : {
            x: WS.cutterScatter.x + target.piece.dx,
            y: WS.cutterScatter.y + target.piece.dy,
          };

    this.promptLines = [{ x: named.x, y: this.promptAnchorY(named.y) - 40 }];

    if (target.kind === 'bin') {
      return {
        text: promptText('Use', 'disposal bin', null),
        x: WS.disposalChute.x,
        y: this.promptAnchorY(WS.disposalChute.y),
        act: () => {
          if (
            disposeM04(
              target.carried.object_id,
              Date.now(),
              'keyboard',
              target.origin,
            ) !== 'invalid'
          ) {
            this.showFeedbackMessage('Disposed.');
            this.physical?.syncObjects(this.debrisEntries());
          }
        },
      };
    }

    const { piece } = target;

    return {
      text: promptText('Take', piece.label, null),
      x: WS.cutterScatter.x + piece.dx,
      y: this.promptAnchorY(WS.cutterScatter.y + piece.dy),
      act: () => {
        if (
          target.kind === 'piece' &&
          pickUpM04(piece.object_id, 'keyboard', target.origin)
        ) {
          // The bin is no target of this press, however long it is held.
          this.binGate = createM04BinGate();
          this.player.playActionAnim('pickup');
          this.physical?.syncObjects(this.debrisEntries());

          return;
        }

        // The same line the pointer shows.
        this.showFeedbackMessage('Hands full.');
      },
    };
  }

  /**
   * The bin as a target of the carried piece (U14-D, owner ruling 2):
   * renewed at every pick-up, stepped every frame.
   */
  private binGate: M04BinGate = createM04BinGate();
  /** Whether the bin's outline was shown in the last frame (DEV probe). */
  private binOutlined = false;
  /**
   * Where the line above the avatar's target was placed in this frame
   * (room px; none when no line is shown by this scene's own decision):
   * the set-down control keeps clear of it.
   */
  private promptLines: { x: number; y: number }[] = [];

  /**
   * U14-D: the set-down control. Shown ONLY while a piece is carried, in
   * the local action hierarchy: below the avatar, beside the line that
   * states what is carried. It takes X and a pointer press, and shows
   * that it is targeted (fill and outline) while the pointer is on it.
   * Neutral: it never names the bin, tidying or disposal, and it never
   * appears unasked (no piece in the hands, no control).
   */
  private setDownControl: Phaser.GameObjects.Text | null = null;
  private setDownStatus: Phaser.GameObjects.Text | null = null;
  private setDownOutline: Phaser.GameObjects.Rectangle | null = null;
  private setDownTargeted = false;
  /** A pointer press on the control is never also a press on the world. */
  private setDownPointerHeld = false;

  private buildSetDownControl() {
    this.setDownTargeted = false;
    this.setDownPointerHeld = false;
    this.setDownStatus = this.add
      .text(0, 0, '', {
        backgroundColor: '#101820',
        color: '#dce7f0',
        font: '13px monospace',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0)
      .setVisible(false);
    this.setDownControl = this.add
      .text(0, 0, SET_DOWN_TEXT, {
        backgroundColor: SET_DOWN_FILL,
        color: '#ffffff',
        font: 'bold 13px monospace',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0)
      .setVisible(false);
    this.setDownOutline = this.add
      .rectangle(0, 0, 10, 10, 0x000000, 0)
      .setOrigin(0)
      .setStrokeStyle(1, 0x5fd3c4, 0.95)
      .setDepth(Depth.AboveWorld + 1)
      .setScrollFactor(0)
      .setVisible(false);
    this.setDownControl.on('pointerover', () => {
      this.setDownTargeted = true;
      this.refreshSetDownControl();
    });
    this.setDownControl.on('pointerout', () => {
      this.setDownTargeted = false;
      this.refreshSetDownControl();
    });
    this.setDownControl.on('pointerdown', () => {
      // The physical layer reads the same press after this handler: it
      // is held off until the pointer is released, so the press can
      // neither lift the piece again nor reach an object under the
      // control.
      this.setDownPointerHeld = true;
      this.setDownCarried('pointer');
    });

    // Released inside the canvas or outside it: the pointer layer is
    // handed back either way.
    const released = () => {
      this.setDownPointerHeld = false;
    };

    this.input.on(Phaser.Input.Events.POINTER_UP, released);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, released);
    this.input.keyboard!.on(
      `keydown-${SET_DOWN_KEY}`,
      guardKeyHandler((event: KeyboardEvent) => {
        if (event.repeat) {
          return;
        }

        this.setDownCarried('keyboard');
      }),
    );
    this.refreshSetDownControl();
  }

  /**
   * Sets the carried piece down where it lay. It stays undisposed and no
   * record already made changes. A set-down that cannot be completed
   * keeps the piece in the hands and says so in one neutral line.
   */
  private setDownCarried(inputMode: 'keyboard' | 'pointer') {
    const carried = m04Carried();

    if (carried === null || !this.physicalInputEligible() || this.inputLocked) {
      return;
    }

    const result = setDownM04(inputMode, this.textures.exists(carried.icon));

    if (result === 'set_down') {
      this.showFeedbackMessage(M04_SET_DOWN_LINE);
      this.physical?.syncObjects(this.debrisEntries());
    } else if (result === 'refused') {
      this.showFeedbackMessage(M04_SET_DOWN_REFUSED_LINE);
    }

    this.refreshSetDownControl();
  }

  /**
   * Where the carried-item line and the control are drawn (design
   * space, top left). Always beside the avatar: below the feet, to the
   * right, to the left, farther below or above the head — the first of
   * these that covers no machine or bench, no piece, not the bin, not
   * the figure and not the line above the avatar's target; where the
   * room leaves none free, the one that covers least. Presentation only.
   */
  private setDownPlace(width: number, height: number) {
    const figure = worldToDesign(this, this.player.x, this.player.y);
    // Design px per room px.
    const k =
      worldToDesign(this, this.player.x + 1, this.player.y).x - figure.x;
    const rect = (x: number, y: number, w: number, h: number) => {
      const origin = worldToDesign(this, x, y);

      return { x: origin.x, y: origin.y, w: w * k, h: h * k };
    };
    const covered = [
      // The painted benches and machines rise above their footprints.
      ...WORKSHOP_SOLIDS.map(([x, y, w, h]) => rect(x, y - 28, w, h + 28)),
      ...m04RemainingDebris().map((piece) =>
        rect(
          WS.cutterScatter.x + piece.dx - 14,
          WS.cutterScatter.y + piece.dy - 14,
          28,
          28,
        ),
      ),
      rect(WS.disposalChute.x - 32, WS.disposalChute.y - 32, 64, 64),
      // The figure and the piece shown in its hands.
      rect(this.player.x - 18, this.player.y - 46, 50, 72),
      ...this.promptLines.map((line) => {
        const at = worldToDesign(this, line.x, line.y);

        return { x: at.x - 170, y: at.y - 14, w: 340, h: 28 };
      }),
    ];
    const places = [
      { x: figure.x - width / 2, y: figure.y + SET_DOWN_BELOW_PX * k },
      { x: figure.x + 36 * k, y: figure.y - height / 2, controlFirst: true },
      { x: figure.x - 22 * k - width, y: figure.y - height / 2 },
      { x: figure.x - width / 2, y: figure.y + (SET_DOWN_BELOW_PX + 30) * k },
      { x: figure.x - width / 2, y: figure.y - 50 * k - height },
    ].map((place) => ({
      x: Phaser.Math.Clamp(
        Math.round(place.x),
        2,
        Math.max(2, this.promptClampMaxX() - width - 2),
      ),
      y: Phaser.Math.Clamp(Math.round(place.y), 84, 600 - height - 2),
      controlFirst: place.controlFirst ?? false,
    }));
    const coveredBy = (place: { x: number; y: number }) =>
      covered.reduce(
        (sum, area) =>
          sum +
          Math.max(
            0,
            Math.min(place.x + width, area.x + area.w) -
              Math.max(place.x, area.x),
          ) *
            Math.max(
              0,
              Math.min(place.y + height, area.y + area.h) -
                Math.max(place.y, area.y),
            ),
        0,
      );

    return places.reduce((best, place) =>
      coveredBy(place) < coveredBy(best) ? place : best,
    );
  }

  private refreshSetDownControl() {
    const control = this.setDownControl;
    const status = this.setDownStatus;
    const outline = this.setDownOutline;

    if (control === null || status === null || outline === null) {
      return;
    }

    const carried = m04Carried();
    const shown = carried !== null;
    const line = carried === null ? '' : `Carrying: ${carried.label}`;

    if (status.text !== line) {
      status.setText(line);
    }

    if (control.visible !== shown) {
      control.setVisible(shown);

      if (shown) {
        control.setInteractive({ useHandCursor: true });
      } else {
        control.disableInteractive();
        this.setDownTargeted = false;
      }
    }

    status.setVisible(shown);

    const targeted = shown && this.setDownTargeted;

    control.setBackgroundColor(
      targeted ? SET_DOWN_FILL_TARGETED : SET_DOWN_FILL,
    );

    const height = Math.max(status.height, control.height);
    const place = this.setDownPlace(
      status.width + SET_DOWN_GAP_PX + control.width,
      height,
    );
    // The control is the element next to the avatar: to the avatar's
    // right it leads, elsewhere it follows the carried-item line.
    const controlX = place.controlFirst
      ? place.x
      : place.x + status.width + SET_DOWN_GAP_PX;

    status.setPosition(
      place.controlFirst ? place.x + control.width + SET_DOWN_GAP_PX : place.x,
      place.y,
    );
    control.setPosition(controlX, place.y);
    outline
      .setPosition(controlX, place.y)
      .setSize(control.width, control.height)
      .setVisible(targeted);

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__m04SetDownProbe = {
        visible: shown,
        text: shown ? control.text : null,
        status: shown ? status.text : null,
        key: SET_DOWN_KEY,
        hovered: targeted,
        x: controlX,
        y: place.y,
        width: control.width,
        height: control.height,
      };
    }
  }

  private debrisEntries() {
    // Pieces lie at the scatter origin (zoneSites) plus the window's
    // FIXED offsets — the same places for every participant, on open
    // floor clear of every station (U14-D).
    return m04RemainingDebris().map((d) => ({
      spec: {
        object_id: d.object_id,
        label: d.label,
        icon: d.icon,
        category: 'debris',
      },
      x: WS.cutterScatter.x + d.dx,
      y: WS.cutterScatter.y + d.dy,
    }));
  }

  private buildPhysicalLayer() {
    this.physical = new PhysicalManipulationLayer({
      scene: this,
      getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
      // The keyboard's reach (U14-D2): a click lifts a piece and uses the
      // bin from exactly the positions a press does.
      reachRadius: PIECE_REACH,
      isEnabled: () => this.physicalInputEligible() && !this.setDownPointerHeld,
      onPickup: (objectId) => {
        if (!pickUpM04(objectId, 'pointer', 'pointer')) {
          this.showFeedbackMessage('Hands full.');
          return false;
        }

        // A click lifts the piece when the pointer is released; a drag
        // lifts it with the pointer still held. Neither names the bin.
        this.binGate = createM04BinGate(this.input.activePointer.isDown);
        this.physical?.syncObjects(this.debrisEntries());
        return true;
      },
      onPlace: (objectId, containerId) => {
        // A press on the bin is a gesture of its own (the pointer is
        // down); the release of the drag that lifted the piece is the one
        // continuous gesture that may end in the bin (U14-D).
        if (
          containerId === 'm04_disposal' &&
          !m04BinPointerAllowed(
            this.binGate,
            this.input.activePointer.isDown ? 'press' : 'drag_release',
          )
        ) {
          const carried = m04Carried();

          return {
            outcome: 'unavailable',
            feedback:
              carried === null
                ? 'That does not go there.'
                : `Carrying the ${carried.label}.`,
          };
        }

        if (
          containerId === 'm04_disposal' &&
          disposeM04(objectId, Date.now(), 'pointer', 'pointer') !== 'invalid'
        ) {
          // The same line as the keyboard path shows.
          this.showFeedbackMessage('Disposed.');
          this.physical?.syncObjects(this.debrisEntries());
          return { outcome: 'accepted' };
        }

        return { outcome: 'unavailable', feedback: 'That does not go there.' };
      },
      getCarried: () => {
        const carried = m04Carried();

        return carried === null
          ? null
          : {
              object_id: carried.object_id,
              label: carried.label,
              icon: carried.icon,
              category: 'debris',
            };
      },
      onFeedback: (message) => this.showFeedbackMessage(message),
      // The bin is outlined once it is the acquired target, or while the
      // drag that lifted the piece is held over it — never because a
      // piece was lifted within its range.
      isContainerCued: (_containerId, gesture) => {
        this.binOutlined =
          this.binGate.acquired ||
          (this.binGate.dragHeld && gesture.dragging && gesture.pointerOver);

        return this.binOutlined;
      },
    });
    this.physical.syncContainers([
      {
        container_id: 'm04_disposal',
        label: 'disposal bin',
        x: WS.disposalChute.x,
        y: WS.disposalChute.y,
        accepts: ['debris'],
      },
    ]);
    this.physical.syncObjects(this.debrisEntries());
  }

  /** The wall mass between the bays, shown while the avatar is inside it. */
  private vestibuleForeground: Phaser.GameObjects.Image | null = null;

  /**
   * Doorway layering: the two bays join through painted SIDE-WALL doors.
   * Once the avatar's feet cross a door sill it stands behind that wall's
   * inner face — so the wall mass between the two sills (a crop of the
   * plate with everything outside the wall planes and both door openings
   * cut away) is drawn OVER the avatar exactly while it is between the
   * sills. The avatar shows through the door openings and is hidden by
   * the wall, instead of walking across the painting. Presentation only.
   */
  private buildVestibuleForeground() {
    const key = 'w2-workshop-vestibule-foreground';
    const { x0, x1 } = VESTIBULE_FOREGROUND;
    const height = 384;

    if (!this.textures.exists(key)) {
      const canvas = this.textures.createCanvas(key, x1 - x0, height);

      if (canvas === null) {
        return;
      }

      const ctx = canvas.getContext();
      const plate = this.textures
        .get('w2-workshop-plate')
        .getSourceImage() as HTMLImageElement;

      // Keep only what lies between the two sill lines…
      ctx.beginPath();

      for (let y = 0; y <= height; y += 4) {
        ctx.lineTo(vestibuleSpan(y).west - 10 - x0, y);
      }

      for (let y = height; y >= 0; y -= 4) {
        ctx.lineTo(vestibuleSpan(y).east + 10 - x0, y);
      }

      ctx.closePath();
      ctx.clip();
      ctx.drawImage(plate, x0, 0, x1 - x0, height, 0, 0, x1 - x0, height);
      // …minus the door openings, through which the avatar is seen.
      ctx.globalCompositeOperation = 'destination-out';

      for (const opening of VESTIBULE_OPENINGS) {
        ctx.beginPath();
        opening.forEach(([px, py], index) =>
          index === 0 ? ctx.moveTo(px - x0, py) : ctx.lineTo(px - x0, py),
        );
        ctx.closePath();
        ctx.fill();
      }

      canvas.refresh();
    }

    this.vestibuleForeground = this.add
      .image(x0, 0, key)
      .setOrigin(0)
      .setDepth(Depth.AbovePlayer)
      .setVisible(false);
    this.vestibuleForeground.texture.setFilter(
      Phaser.Textures.FilterMode.NEAREST,
    );
  }

  protected onPilotUpdate(): void {
    const span = vestibuleSpan(this.player.y + 24);

    const between = this.player.x > span.west && this.player.x < span.east;

    this.vestibuleForeground?.setVisible(between);

    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (
        window as unknown as { __vestibuleProbe?: { foreground: boolean } }
      ).__vestibuleProbe = {
        foreground: this.vestibuleForeground?.visible ?? false,
      };
    }
    this.stepBinGate();
    this.physical?.update();
    this.publishBinProbe();
    this.refreshSetDownControl();
    this.clampWorldReadouts([
      this.consoleChip,
      this.benchChip,
      this.deskChip,
      this.trayChip,
    ]);

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__returnProbe = returnProbeSnapshot();
    }
  }

  /**
   * One step of the bin's gate (U14-D): the interaction keys and the
   * pointer as they are held NOW, and whether the avatar stands within
   * the bin's range. No time is measured.
   */
  private stepBinGate() {
    // The outline is decided anew by the pointer layer's update.
    this.binOutlined = false;
    m04BinGateStep(this.binGate, {
      carrying: m04Carried() !== null,
      keysDown:
        this.player.cursors.space.isDown ||
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E).isDown,
      pointerDown: this.input.activePointer.isDown,
      inRange: this.inBinRange(),
    });
  }

  private inBinRange(): boolean {
    return (
      Math.hypot(
        this.player.x - WS.disposalChute.x,
        this.player.y - WS.disposalChute.y,
      ) <= BIN_REACH
    );
  }

  /** DEV probe of the gate, published after the outline was decided. */
  private publishBinProbe() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    window.__m04BinProbe = {
      carrying: m04Carried()?.object_id ?? null,
      released: this.binGate.released,
      been_outside: this.binGate.beenOutside,
      acquired: this.binGate.acquired,
      drag_held: this.binGate.dragHeld,
      in_range: this.inBinRange(),
      outlined: this.binOutlined,
      watching: this.otherWorkWatch?.stationId ?? null,
    };
  }

  /**
   * SPACE/E with nothing named by the prompt but, at most, a supply
   * bundle: the bundle in reach is collected. A piece or the bin never
   * takes this press (`interactionRedirect` names them first). With a
   * piece carried and nothing in reach the press states what is held —
   * it is never silent (U14-C).
   */
  protected onEmptyInteract(): void {
    const carried = m04Carried();

    if (
      carried !== null &&
      this.bundles.nearest(this.player.x, this.player.y) === null
    ) {
      this.showFeedbackMessage(`Carrying the ${carried.label}.`);

      return;
    }

    super.onEmptyInteract();
  }

  protected onRoomExit(): void {
    // M04 (Unit 14): leaving the room is the first departure of a job
    // still open. The state is recorded FIRST, with the piece still in
    // the hands (counted undisposed); only then is it put back.
    departM04('room_exit', null, Date.now());
    dropM04Carried();
  }

  /** A press reached a station (route telemetry; closes nothing, U14-D). */
  private logStationOpened(stationId: string) {
    this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
      metadata: { station_id: stationId, zone: this.zoneKey },
    });
  }

  /**
   * M04 (U14-D): an accepted action at ANOTHER station changed that
   * task's recorded state. This is the first departure of a cutting job
   * still open; it also releases the second coupon. Called AFTER the
   * other task's transition succeeded, never from a panel or a prompt that is
   * merely opened and never from a refusal.
   */
  private noteOtherWorkBegun(stationId: string) {
    if (departM04('other_station', stationId, Date.now()).length > 0) {
      this.refreshGuidance();
    }
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'pilotWorkOrderBoard') {
      // M01 (Unit 5): the return beat offers the return orders — the
      // second batch is presented when that beat is read (once).
      if (this.returnShift()) {
        presentM01('o2', Date.now());
      }

      return this.boardBeat().body;
    }

    if (interactionKey === 'pilotFeedConsole') {
      // Only reached when no surface opened: standby or an unavailable
      // start history (operational statement; no reminder, no directive).
      return this.returnShift()
        ? m20ConsoleStatusLine()
        : 'FEED CONSOLE · standby — nothing to align until the exterior shift is logged.';
    }

    if (interactionKey === 'pilotRelayBench') {
      return 'RELAY BENCH\nNo unit issued to this bench yet.';
    }

    if (interactionKey === 'pilotReportDesk') {
      return 'SHIFT REPORT DESK\nNo report is due before the return shift.';
    }

    if (interactionKey === 'pilotHandoverDesk') {
      return this.handoverBody();
    }

    if (interactionKey === 'pilotSealLog') {
      return secondaryState().m11.acknowledged
        ? 'SAMPLE SEAL LOG\nObligation acknowledged: sealed samples only leave through the locker.'
        : 'SAMPLE SEAL LOG\nStation rule: any sample stored or transferred must carry an intact seal. Acknowledge to sign the log.';
    }

    return undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'pilotWorkOrderBoard') {
      return this.npcBeatOptions('pilotWorkOrderBoard', this.boardBeat());
    }

    if (
      interactionKey === 'pilotFeedConsole' ||
      interactionKey === 'pilotRelayBench' ||
      interactionKey === 'pilotReportDesk'
    ) {
      return [{ label: 'Step away', feedback: '', getEventTypes: () => [] }];
    }

    if (interactionKey === 'pilotHandoverDesk') {
      return this.handoverOptions();
    }

    if (interactionKey === 'pilotSealLog') {
      return secondaryState().m11.acknowledged
        ? [{ label: 'Close log', feedback: '', getEventTypes: () => [] }]
        : [
            {
              label: 'Acknowledge the seal rule',
              feedback: 'Signed.',
              getEventTypes: () => [],
              onSelected: () => {
                // Signing the log is the log's accepted action (U14-D):
                // the departure is written after the log went from
                // unacknowledged to acknowledged, never for reading it.
                const before = secondaryState().m11.acknowledged;

                acknowledgeM11Obligation(Date.now(), 'keyboard');

                if (!before && secondaryState().m11.acknowledged) {
                  this.noteOtherWorkBegun('seal_log');
                }
              },
            },
            { label: 'Close log', feedback: '', getEventTypes: () => [] },
          ];
    }

    return [];
  }

  /** The board's beat depends only on the route stage, never on outcomes. */
  private boardBeat(): PilotNpcBeat {
    const optional = {
      label: 'Optional: swap the intake filter',
      tag: 'optional_filter_swap',
      feedback: 'Filter swapped.',
      onSelected: () => {
        // The one piece of work done at the board itself (U14-D): the
        // departure is written after the swap was accepted.
        const before = secondaryState().m08.filter_swap.engaged;

        noteM08JobEngaged('filter_swap', Date.now());

        if (!before && secondaryState().m08.filter_swap.engaged) {
          this.noteOtherWorkBegun('work_order_board');
        }
      },
    };

    switch (pilotStage()) {
      case 'workshop':
        return {
          body:
            'WORK ORDERS — RESTORATION SHIFT\n' +
            'Case workspace, press batch A, two sample coupons, dispatch lines, calibration bench, quality packet, conduit lattice. Sign the board when you are done here.',
          options: [
            {
              label: 'Take the orders.',
              tag: 'workshop_orders_taken',
              onSelected: () => {
                const now = Date.now();

                advancePilotStage('workshop_work', now);
                // M02 (Unit 13): the work orders list the case workspace —
                // it is presented here.
                presentM02C(now);
                // M03 / M04 (Unit 14): the work orders list press batch A
                // and the two sample coupons.
                presentM03T('a', now);
                listM04(now);
                // M06 (Unit 7): the work orders list the dispatch lines —
                // the console is presented here.
                presentM06(now);
                // M12 (Unit 8): the work orders list the quality packet —
                // occasion 2 is presented here.
                presentM12('o2', now);
              },
            },
          ],
        };
      case 'workshop_work':
        return {
          body: 'WORK ORDERS — RESTORATION SHIFT\nAnything you leave open stays open. Sign off when you are done here.',
          options: [
            {
              label: 'Sign off — done here.',
              tag: 'workshop_signoff',
              feedback:
                'Signed. Kai needs you in the Diagnostics Laboratory — Concourse north door.',
              onSelected: () => advancePilotStage('lab_briefing', Date.now()),
            },
            { label: 'Still working.', tag: 'workshop_continue', feedback: '' },
            ...(secondaryState().m08.filter_swap.engaged ? [] : [optional]),
          ],
        };
      case 'return_hub':
      case 'workshop_return':
        return {
          body: RETURN_BOARD_BODY,
          options: [
            {
              label: 'Sign off — close the shift here.',
              tag: 'workshop_return_signoff',
              feedback:
                'Signed. The Utility Deck is through the Concourse, east door.',
              onSelected: () => advancePilotStage('deck_closure', Date.now()),
            },
            // M01 (Unit 5): the second three-job batch, listed right after
            // the sign-off (never behind "Still working"). Never required
            // for the sign-off; opened from this beat like any other order.
            ...(m01Window('o2').isClosed()
              ? []
              : [
                  {
                    label: 'Open the return batch (three jobs).',
                    tag: 'workshop_return_orders',
                    feedback: '',
                    onSelected: () => this.openReturnOrders(),
                  },
                ]),
            {
              label: 'Still working.',
              tag: 'workshop_return_continue',
              feedback: '',
            },
          ],
        };
      case 'arrival':
      case 'handover_briefing':
      case 'incident_handover':
        return {
          body: 'WORK ORDERS\nNo orders issued yet — Vale briefs at the Concourse incident desk first.',
          options: [{ label: 'Understood.', tag: 'workshop_early' }],
        };
      default:
        return {
          body: 'WORK ORDERS\nNothing open on this board right now.',
          options: [{ label: 'Understood.', tag: 'workshop_idle' }],
        };
    }
  }
}
