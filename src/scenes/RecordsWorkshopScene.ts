/**
 * Records Workshop — episodes 2 (Records & Workshop Restoration) and 5
 * (Return, Revision & Handover) of the evidence-led pilot v2 (Unit 2).
 *
 * Episode-2 windows (ledger): M02 open case workspace, M03 press occasion 1,
 * M04 sample-cutter debris, M06 dispatch console, M07 calibration bench
 * (start), M11 seal log (secondary), M12 quality packet 2, M13 conduit
 * lattice bench. Episode 5 (Unit 4): M03 occasion 2, M07 end and the
 * return-shift stations. M08 secondary telemetry: the locker stow and the
 * optional filter swap on the board.
 *
 * Every window owns distinct objects, events and validity state; nothing
 * gates on performance; the east door is always open. The Work Order Board
 * is the stage anchor (sign-off only — never a check).
 */
import { key } from '../constants';
import { PhysicalManipulationLayer } from '../gameplay/physical';
import { declareM13Lattice } from '../informationProcessing/m13PipeNetwork';
import { openIpOverlay } from '../informationProcessing/ui/openIpOverlay';
import { ensureInventoryIconTextures } from '../inventory/inventoryTextures';
import type { M03OccasionId } from '../inventory/m03Reset';
import {
  declareM03Opportunities,
  M03_OPPORTUNITY_IDS,
  m03OccasionStatus,
} from '../inventory/m03Reset';
import {
  installInventoryTelemetry,
  setInventoryTelemetryScene,
} from '../inventory/telemetry';
import { openInventoryOverlay } from '../inventory/ui/openOverlay';
import { recordPriorExposure } from '../measurement/validity';
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
import {
  activeWorkSurface,
  openWorkSurface,
} from '../pilot/ui/WorkSurfaceScene';
import { declareM02C, m02cWindow } from '../pilot/windows/m02CaseWorkspace';
import {
  declareM04,
  disposeM04,
  dropM04Carried,
  M04_DEBRIS,
  m04Carried,
  m04JobRun,
  m04RemainingDebris,
  m04Window,
  pickUpM04,
  runM04SampleJob,
} from '../pilot/windows/m04Debris';
import {
  closeM06Surface,
  declareM06,
  m06Window,
  openM06,
  resumeM06Surface,
} from '../pilot/windows/m06RoutineDispatch';
import {
  closeM07Surface,
  declareM07,
  m07State,
  openM07,
} from '../pilot/windows/m07Calibration';
import {
  closeM12Surface,
  declareM12,
  m12Windows,
  openM12,
  resumeM12Surface,
} from '../pilot/windows/m12QualityControl';
import {
  acknowledgeM11Obligation,
  noteM08JobEngaged,
  noteM08JobOffered,
  secondaryState,
} from '../pilot/windows/secondaryTelemetry';
import {
  m06SurfaceModel,
  m07SurfaceModel,
  m12SurfaceModel,
} from '../pilot/windows/surfaceModels';
import { WORKSHOP_STATIONS } from '../pilot/zoneSites';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

/**
 * Episode-2 stations off the y=272 lane (the lane stays clear for walking).
 *
 * Placement rule (D-V2-1 root cause): a station's natural approach point
 * (44 px off its centre) must have NO other station nearer than the
 * station itself, even with a ±12 px landing error — otherwise SPACE/E
 * silently targets the neighbour. The cutter used to sit 86 px from
 * Press B and the lattice bench 71 px from the Work Order Board; both
 * approach points were contested. Stations also sit in columns clear of
 * the two machinery blocks (x 416-543; the 32 px body needs the column
 * centre ≥ 576 or ≤ 384) so x-then-y walks never stall.
 */
const WS = {
  sampleCutter: { x: 11 * TILE, y: 12 * TILE },
  disposalChute: { x: 13 * TILE, y: 10.75 * TILE },
  dispatchConsole: { x: 20 * TILE, y: 14 * TILE },
  calibrationBench: { x: 11 * TILE, y: 3 * TILE },
  qcPacket: { x: 17 * TILE, y: 14 * TILE },
  sealLog: { x: 22 * TILE, y: 5 * TILE },
  latticeBench: { x: 22 * TILE, y: 13 * TILE },
} as const;

export class RecordsWorkshopScene extends PilotZoneScene {
  protected readonly roomId = 'records_workshop';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'records_workshop' as const;

  private physical: PhysicalManipulationLayer | null = null;

  constructor() {
    super(key.scene.recordsWorkshop);
  }

  protected getLayout(): RoomLayout {
    return {
      theme: 'workshop',
      grid: [
        '#########################',
        '#########################',
        '#.......................#',
        '#.......................#',
        '#............####.......#',
        '#............####.......#',
        '#.......................#',
        '#.......................#',
        '#.......................-',
        '#.......................-',
        '#.......................#',
        '#.......................#',
        '#............####.......#',
        '#............####.......#',
        '#.......................#',
        '#.......................#',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    return { x: 21.5 * TILE, y: 8.5 * TILE };
  }

  create(data?: { spawn?: string }) {
    ensureInventoryIconTextures(this);
    installInventoryTelemetry();
    setInventoryTelemetryScene(key.scene.recordsWorkshop);
    // Declarations (register: declared + offered; idempotent).
    declareM02C();
    declareM03Opportunities();
    declareM04();
    declareM06();
    declareM07();
    declareM12('o2');
    declareM13Lattice();
    stampContaminationNotes();

    super.create(data);

    noteM08JobOffered('stow_supplies');
    this.events.on('resume', () => {
      const now = Date.now();

      resumeM06Surface(now);
      resumeM12Surface('o2', now);
      this.physical?.syncObjects(this.debrisEntries());
    });
    refreshPilotCoverageProbe();
  }

  protected populateRoom(): void {
    this.addPilotDoor({ to: 'station_concourse', spawn: 'records_workshop' });

    const S = WORKSHOP_STATIONS;

    // ——— Work Order Board (stage anchor) ———
    this.addStation({
      interactionKey: 'pilotWorkOrderBoard',
      label: 'Work Order Board',
      texture: 'proc-board-workorders',
      x: S.workOrderBoard.x,
      y: S.workOrderBoard.y,
      onPromptOpened: () => {
        this.logStationOpened('work_order_board');
        noteM08JobOffered('filter_swap');
        return true;
      },
    });
    this.signage(S.workOrderBoard.x, S.workOrderBoard.y - 44, 'WORK ORDERS');
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

    this.signage(6 * TILE, 2 * TILE - 8, 'RECORDS & RESTORATION');

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
    this.signage(5.5 * TILE, 4.2 * TILE, 'INCOMING SUPPLIES');

    // ——— M02 case workspace (open organisation + retrieval) ———
    this.station(
      'case_workspace',
      'Case Workspace',
      'proc-desk-closure',
      S.filingDesk,
      () => {
        openInventoryOverlay(this, { mode: 'm02case', allowWorldDrop: false });
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

    // ——— M03 press occasions: A in episode 2, B on the return shift ———
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
        noteM08JobEngaged('stow_supplies', Date.now());
        openInventoryOverlay(this, { mode: 'container', allowWorldDrop: true });
      },
    );
    this.station(
      'assembly_bench',
      'Assembly Bench',
      'proc-bench-prep',
      S.assemblyBench,
      () => {
        openInventoryOverlay(this, { mode: 'workbench', allowWorldDrop: true });
      },
    );
    this.signage(6 * TILE, 12.6 * TILE, 'STORAGE  ·  ASSEMBLY');

    // ——— M04 sample cutter + disposal chute (physical debris) ———
    this.addStation({
      interactionKey: 'pilotStation',
      label: 'Sample Cutter',
      texture: 'proc-rig-intake',
      x: WS.sampleCutter.x,
      y: WS.sampleCutter.y,
      onPromptOpened: () => {
        this.logStationOpened('sample_cutter');

        if (m04JobRun()) {
          // Keyboard parity: the debris lies inside the cutter's own
          // interaction radius, so SPACE/E here must act on the debris
          // (dispose at the chute / pick up the nearest piece) exactly as
          // it does with no station in range — never re-open the idle bench.
          if (!this.tryDebrisInteract('keyboard')) {
            this.showFeedbackMessage('Coupon cut. The cutter is idle.');
          }

          return false;
        }

        runM04SampleJob(Date.now(), 'keyboard');
        this.player.playActionAnim('dig');
        this.showFeedbackMessage('Test coupon cut.');
        this.physical?.syncObjects(this.debrisEntries());
        return false;
      },
    });
    this.signage(WS.sampleCutter.x, WS.sampleCutter.y - 40, 'SAMPLE CUTTER');
    this.guided(
      'sample_cutter',
      WS.sampleCutter,
      'Sample Cutter',
      ['workshop_work'],
      3,
      () => m04JobRun(),
    );
    this.addDecor(WS.disposalChute.x, WS.disposalChute.y, 'proc-disposal-unit');
    this.signage(WS.disposalChute.x, WS.disposalChute.y - 36, 'DISPOSAL');
    this.buildPhysicalLayer();

    // ——— M06 dispatch console ———
    this.station(
      'dispatch_console',
      'Dispatch Console',
      'proc-console-scenario',
      WS.dispatchConsole,
      () => {
        openM06(Date.now());
        openWorkSurface(this, {
          surfaceId: 'm06_dispatch_console',
          model: () => m06SurfaceModel(this.surfaceHost()),
          onClose: () => closeM06Surface(Date.now()),
        });
      },
    );
    this.signage(WS.dispatchConsole.x, WS.dispatchConsole.y - 40, 'DISPATCH');
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
          model: () => m07SurfaceModel(this.surfaceHost()),
          onClose: () => closeM07Surface(Date.now()),
        });
      },
    );
    this.signage(
      WS.calibrationBench.x,
      WS.calibrationBench.y - 40,
      'CALIBRATION',
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
        openM12('o2', Date.now());
        openWorkSurface(this, {
          surfaceId: 'm12_qc_packet_o2',
          model: () => m12SurfaceModel('o2', this.surfaceHost()),
          onClose: () => closeM12Surface('o2', Date.now()),
        });
      },
    );
    this.signage(WS.qcPacket.x, WS.qcPacket.y - 40, 'QUALITY');
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
    );
    this.signage(WS.latticeBench.x, WS.latticeBench.y - 40, 'CONDUIT LATTICE');
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
    this.signage(WS.sealLog.x, WS.sealLog.y - 40, 'SEAL LOG');

    // ——— Dressing ———
    this.addDecor(3 * TILE, 3.4 * TILE, 'proc-light-pool');
    this.addDecor(14 * TILE, 8.2 * TILE, 'proc-light-pool');
    this.addDecor(20 * TILE, 8.2 * TILE, 'proc-light-pool');
    this.addDecor(5 * TILE, 16 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(20 * TILE, 16 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(14.5 * TILE, 4.6 * TILE, 'proc-console-wall');
    this.addDecor(14.5 * TILE, 12.6 * TILE, 'proc-rack-tools');
    this.signage(22.2 * TILE, 7.2 * TILE, 'CONCOURSE  ▶');
  }

  // ——— helpers ————————————————————————————————————————————————————————

  private station(
    id: string,
    label: string,
    texture: string,
    at: { x: number; y: number },
    open: () => void,
  ) {
    this.addStation({
      interactionKey: 'pilotStation',
      label,
      texture,
      x: at.x,
      y: at.y,
      onPromptOpened: () => {
        this.logStationOpened(id);
        open();
        return false;
      },
    });
  }

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

  private addPressStation(
    occasion: M03OccasionId,
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

        if (m03OccasionStatus(occasion) === 'closed') {
          this.showFeedbackMessage('Press station idle. The batch is done.');
          return false;
        }

        if (!scheduled()) {
          this.showFeedbackMessage(
            'No batch scheduled on this press right now.',
          );
          return false;
        }

        if (m03OccasionStatus(occasion) === 'idle') {
          const other: M03OccasionId = occasion === 'a' ? 'b' : 'a';

          if (m03OccasionStatus(other) === 'closed') {
            recordPriorExposure(
              M03_OPPORTUNITY_IDS[occasion],
              `exposure:${M03_OPPORTUNITY_IDS[other]}_closed_before`,
            );
          }
        }

        openInventoryOverlay(this, {
          mode: 'm03',
          m03Occasion: occasion,
          allowWorldDrop: true,
        });
        return false;
      },
    });
    registerPilotStation({
      id: `press_${occasion}`,
      zone: 'records_workshop',
      x: at.x,
      y: at.y,
      label,
      stages,
      isDone: () => m03OccasionStatus(occasion) === 'closed',
      order,
    });
  }

  private debrisEntries() {
    return m04RemainingDebris().map((d) => ({
      spec: {
        object_id: d.object_id,
        label: d.label,
        icon: d.icon,
        category: 'debris',
      },
      x: WS.sampleCutter.x + d.dx,
      y: WS.sampleCutter.y + d.dy,
    }));
  }

  private buildPhysicalLayer() {
    this.physical = new PhysicalManipulationLayer({
      scene: this,
      getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
      isEnabled: () => this.physicalInputEligible(),
      onPickup: (objectId) => {
        if (!pickUpM04(objectId, 'pointer')) {
          this.showFeedbackMessage('Hands full.');
          return false;
        }

        this.physical?.syncObjects(this.debrisEntries());
        return true;
      },
      onPlace: (objectId, containerId) => {
        if (
          containerId === 'm04_disposal' &&
          disposeM04(objectId, Date.now(), 'pointer')
        ) {
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
    });
    this.physical.syncContainers([
      {
        container_id: 'm04_disposal',
        label: 'Disposal chute',
        x: WS.disposalChute.x,
        y: WS.disposalChute.y,
        accepts: ['debris'],
      },
    ]);
    this.physical.syncObjects(this.debrisEntries());
    void M04_DEBRIS;
  }

  protected onPilotUpdate(): void {
    this.physical?.update();
  }

  /** SPACE/E with nothing in range: carried debris drops at the chute if in reach, else pickup, else bundle pickup. */
  protected onEmptyInteract(): void {
    if (this.tryDebrisInteract('keyboard')) {
      return;
    }

    super.onEmptyInteract();
  }

  /**
   * One keyboard debris action (shared by the empty-interact path and the
   * idle cutter prompt): dispose the carried piece when the chute is in
   * reach, otherwise pick up the nearest loose piece within reach.
   */
  private tryDebrisInteract(inputMode: 'keyboard'): boolean {
    const carried = m04Carried();

    if (carried !== null) {
      const near =
        Math.hypot(
          this.player.x - WS.disposalChute.x,
          this.player.y - WS.disposalChute.y,
        ) <= 96;

      if (near && disposeM04(carried.object_id, Date.now(), inputMode)) {
        this.showFeedbackMessage('Disposed.');
        this.physical?.syncObjects(this.debrisEntries());
        return true;
      }

      return false;
    }

    // Keyboard debris pickup: nearest loose debris within reach.
    const nearest = this.debrisEntries()
      .map((entry) => ({
        entry,
        d: Math.hypot(this.player.x - entry.x, this.player.y - entry.y),
      }))
      .filter((c) => c.d <= 64)
      .sort((a, b) => a.d - b.d)[0];

    if (
      nearest !== undefined &&
      pickUpM04(nearest.entry.spec.object_id, inputMode)
    ) {
      this.player.playActionAnim('pickup');
      this.physical?.syncObjects(this.debrisEntries());
      return true;
    }

    return false;
  }

  protected onRoomExit(): void {
    const now = Date.now();

    // M04: the first exit after the debris appeared closes the window.
    if (m04Window.isOpen()) {
      void closeM04OnExitLazy(now);
    }

    dropM04Carried();
  }

  private logStationOpened(stationId: string) {
    this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
      metadata: { station_id: stationId, zone: this.zoneKey },
    });
  }

  private signage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, { color: '#7f95a8', font: '11px monospace' })
      .setOrigin(0.5)
      .setDepth(2);
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'pilotWorkOrderBoard') {
      return this.boardBeat().body;
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

    if (interactionKey === 'pilotSealLog') {
      return secondaryState().m11.acknowledged
        ? [{ label: 'Close log', feedback: '', getEventTypes: () => [] }]
        : [
            {
              label: 'Acknowledge the seal rule',
              feedback: 'Signed.',
              getEventTypes: () => [],
              onSelected: () =>
                acknowledgeM11Obligation(Date.now(), 'keyboard'),
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
      onSelected: () => noteM08JobEngaged('filter_swap', Date.now()),
    };

    switch (pilotStage()) {
      case 'workshop':
        return {
          body:
            'WORK ORDERS — RESTORATION SHIFT\n' +
            'Case workspace, press batch A, sample coupon, dispatch lines, calibration bench, quality packet, conduit lattice. Sign the board when you are done here.',
          options: [
            {
              label: 'Take the orders.',
              tag: 'workshop_orders_taken',
              onSelected: () => advancePilotStage('workshop_work', Date.now()),
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
      case 'workshop_return':
        return {
          body: 'WORK ORDERS — RETURN SHIFT\nClose out what you can here. Sign the board to close the shift; the Utility Deck review follows.',
          options: [
            {
              label: 'Sign off — close the shift here.',
              tag: 'workshop_return_signoff',
              feedback:
                'Signed. The Utility Deck is through the Concourse, east door.',
              onSelected: () => advancePilotStage('deck_closure', Date.now()),
            },
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

/** Deferred import guard (module order): the M04 exit closure. */
async function closeM04OnExitLazy(nowMs: number) {
  const { closeM04OnExit } = await import('../pilot/windows/m04Debris');

  closeM04OnExit(nowMs);
}
