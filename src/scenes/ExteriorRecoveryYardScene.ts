/**
 * Exterior Recovery Yard — episode 4 of the evidence-led pilot v2
 * (Unit 4: Exterior Recovery).
 *
 * One connected, storm-damaged exterior reached through the laboratory
 * airlock (the same airlock leads back — the only door, bidirectional,
 * never gated). One recovery operation with five legible subareas in a
 * fixed operational order (guidance only — every site is independently
 * enterable, no site's outcome gates another):
 *
 *   1  airlock apron        Noor, supply crate, the M05 occasion-2 cable flag
 *   2  frozen coupling      M19 progressive valve (west)
 *   3  Mast 04              M20 antenna restoration — START only (north)
 *   4  excavation field     M23 scanner-guided recovery (staked, east)
 *   5  Metal Recovery Yard  M24 finite magnet deck + depletion (north-east)
 *   6  uplink posts         M26 disconnected channel (north-west)
 *   7  the airlock          the marked return route
 *
 * Mechanics are the accepted field-actions foundation (scan C / dig D /
 * winch F, deck, caches); the item windows are the Unit 4 models bound in
 * src/pilot/windows/exteriorWindows.ts. C and D work anywhere as ordinary
 * gameplay (secondary_field_action_*); only the open M23 window turns
 * them into M23 evidence. F runs only on the rig's operating pad and only
 * inside the open M24 window. Leaving the yard pauses every open window
 * (persisted state re-renders on re-entry); Noor's "finished outside" is
 * the one interruption point. Nothing here scores anything.
 */
import Phaser from 'phaser';

import { Depth, DepthLayer, key, worldDepth } from '../constants';
import type {
  DigRecord,
  DigRefusal,
  MagnetCycleRecord,
  ScanRecord,
} from '../fieldActions';
import {
  DigController,
  DigSurfaceRegistry,
  drawMagnetPull,
  FieldCacheManager,
  FieldTargetRegistry,
  installFieldActionLogSink,
  logSecondaryFieldAction,
  magnetDeckDepleted,
  magnetDeckState,
  MagnetWinchController,
  ScanController,
  setFieldActionTelemetryScene,
} from '../fieldActions';
import {
  beginManualWorldAction,
  endManualWorldAction,
  isWorldActionActive,
  performWorldAction,
} from '../gameplay/actions';
import { sfxMachineOn, sfxUnavailable } from '../gameplay/audio';
import { FieldActionController } from '../gameplay/fieldActionKeys';
import {
  addInventoryItem,
  hasInventoryItem,
  removeInventoryItem,
} from '../gameplay/inventory';
import { playSheetEffect } from '../gameplay/sheetEffects';
import { prefersReducedMotion } from '../inventory/ui/theme';
import { refreshValidityProbe } from '../measurement/validity';
import {
  exteriorAddCache,
  exteriorNoteDug,
  exteriorRemoveCache,
} from '../pilot/exterior/exteriorEpisodeModel';
import {
  M19_THAW_MS,
  M19_TURN_MS,
  m19Completed,
  m19Readout,
} from '../pilot/exterior/m19CouplingModel';
import {
  M20_STAGE_LABELS,
  M20_STAGE_MS,
  m20Complete,
  m20MastStatus,
  m20NextStage,
  m20OutdoorComplete,
} from '../pilot/exterior/m20AntennaModel';
import {
  M23_DETECTION_RADIUS,
  M23_ITEM_ID,
  M23_OBJECT_ID,
  M23_PLOT,
  M23_SCAN_CONTEXT,
  M23_TARGET_ID,
  M23_ZONE_ID,
  m23CellInsidePlot,
  m23PositionInsidePlot,
} from '../pilot/exterior/m23ExcavationModel';
import {
  M24_DEPLETION_STATEMENT,
  M24_RIG_BRIEF,
  m24KnowledgeState,
  m24PanelLine,
} from '../pilot/exterior/m24MagnetRigModel';
import {
  M26_CARRIER_OK_NOTICE,
  M26_DISCONNECT_DELAY_MS,
  M26_DISCONNECT_NOTICE,
  M26_REPORT_LABELS,
  M26_TRANSMIT_MS,
  M26_UPLINK_BRIEF,
  m26Disconnected,
  m26Knowledge,
  m26PostStatus,
} from '../pilot/exterior/m26ChannelModel';
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
  declareExteriorWindows,
  dismissExteriorSite,
  endExteriorShift,
  exteriorDeparture,
  exteriorEpisode,
  exteriorObjectiveLine,
  exteriorProbeSnapshot,
  exteriorResume,
  exteriorTechnicalFailure,
  m19Act,
  m19Present,
  m19PromptBody,
  m19StepAway,
  M20_BRIEF,
  m20AcceptTask,
  m20DoStage,
  m20Present,
  M23_BRIEF,
  m23Begin,
  m23Dig,
  m23Invalid,
  m23Present,
  m23Scan,
  m23Stop,
  m23TargetActive,
  m23TargetCell,
  m23WindowOpen,
  m24AcknowledgeDepletion,
  m24Alternative,
  m24Begin,
  m24Cycle,
  m24DepletionShown,
  m24Present,
  m24WindowOpen,
  m26AcknowledgeDisconnect,
  m26Begin,
  m26DemonstrateDisconnect,
  m26DisconnectPending,
  m26Evidence,
  m26NextReportId,
  m26Present,
  m26Send,
  m26WindowOpen,
} from '../pilot/windows/exteriorWindows';
import {
  censorM05,
  completeM05Fix,
  declareM05,
  initiateM05,
  m05Open,
  m05Presented,
  m05State,
  presentM05,
} from '../pilot/windows/m05Initiation';
import { YARD_RIG_PAD, YARD_SITES } from '../pilot/zoneSites';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption } from '../world';

const TILE = 32;
const M05_FIX_MS = 2000;

declare global {
  interface Window {
    /** DEV-only, read-only exterior-episode probe (never read back). */
    __exteriorProbe?:
      | (ReturnType<typeof exteriorProbeSnapshot> & {
          m05: { presented: boolean; open: boolean; initiated: boolean };
          stage: string;
        })
      | null;
  }
}

export class ExteriorRecoveryYardScene extends PilotZoneScene {
  protected readonly roomId = 'exterior_recovery_yard';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'exterior_recovery_yard' as const;

  private actionController?: FieldActionController;
  private targets!: FieldTargetRegistry;
  private digRegistry!: DigSurfaceRegistry;
  private caches!: FieldCacheManager;
  private scanController!: ScanController;
  private digController!: DigController;
  private magnet!: MagnetWinchController;

  private couplingDial?: Phaser.GameObjects.Graphics;
  private couplingChip?: Phaser.GameObjects.Text;
  private frostOverlay?: Phaser.GameObjects.Rectangle;
  private mastChip?: Phaser.GameObjects.Text;
  private mastFeed?: Phaser.GameObjects.Graphics;
  /** Unit 7 (V19): the mast tower image (damaged → restored antenna art). */
  private mastTower?: Phaser.GameObjects.Image;
  private mastPulseMs = 0;
  private plotOverlay?: Phaser.GameObjects.Graphics;
  private rigChip?: Phaser.GameObjects.Text;
  private depletedBanner?: Phaser.GameObjects.Text;
  private conduit?: Phaser.GameObjects.Graphics;
  private lineAChip?: Phaser.GameObjects.Text;
  private lineBChip?: Phaser.GameObjects.Text;
  private cableFlag?: Phaser.GameObjects.Rectangle;
  private disconnectTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super(key.scene.exteriorRecoveryYard);
  }

  protected getLayout() {
    // 25×19 exterior. Rock ridges shape the subareas without a maze:
    // the Mast 04 footing (cols 11-13, rows 3-4), the Metal Recovery Yard
    // compound (west wall col 16 rows 2-5, south ridge row 7 cols 17-23;
    // entered from the west at rows 6-7), and the short ridge separating
    // the uplink posts from the coupling (row 7, cols 1-4). Airlock
    // doorway south (cols 11-12). Every area is reachable both ways.
    return {
      theme: 'exterior' as const,
      grid: [
        '#########################',
        '#########################',
        '#...............#.......#',
        '#..........###..#.......#',
        '#..........###..#.......#',
        '#.......................#',
        '#.......................#',
        '#####............########',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '###########--############',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    // Airlock apron, 95 px from the airlock and 140 px from Noor.
    return { x: 13.75 * TILE, y: 13.1 * TILE };
  }

  create(data?: { spawn?: string }) {
    // The fieldActions layer is runtime-import-free: install the real log
    // sink first so every secondary emission reaches EventLogger.
    installFieldActionLogSink((payload) =>
      researchRuntime.logInteraction(payload),
    );
    setFieldActionTelemetryScene('exterior_recovery_yard');

    // Declarations (declared + offered; idempotent) — every window is
    // declared at zone entry whether or not it is entered.
    declareM05('o2');
    declareExteriorWindows();
    stampContaminationNotes();

    super.create(data);

    const episode = exteriorEpisode();
    const now = Date.now();

    episode.zone_entries += 1;
    exteriorResume(now);

    // A scripted disconnect that was due when the yard was left happens
    // on re-entry (a world event, never lost with the scene).
    if (m26DisconnectPending()) {
      this.demonstrateDisconnect();
    }

    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.refreshAllVisuals();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.disconnectTimer?.remove();
      this.disconnectTimer = null;
      exteriorDeparture(Date.now());

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__fieldActionsProbe = null;
        window.__exteriorProbe = null;
      }
    });

    this.refreshAllVisuals();
    refreshValidityProbe();
    refreshPilotCoverageProbe();
    this.logScenarioEvent('pilotRoute', 'pilot_yard_entered', {
      metadata: {
        zone_entry_count: episode.zone_entries,
        m23_form: episode.m23_form,
        magnet_deck_form: episode.deck_form,
      },
    });
    logSecondaryFieldAction('lab_entered', {
      m23_form: episode.m23_form,
      magnet_deck_form: episode.deck_form,
      host: 'exterior_recovery_yard',
    });
  }

  /** ONE objective line: the current exterior site during the work stage. */
  protected buildRouteObjectiveText(): string {
    // World V1 (U2): the story card line for every stage; the site line
    // (existing exterior objective model) only while the yard work runs.
    return pilotStage() === 'exterior_work'
      ? exteriorObjectiveLine()
      : super.buildRouteObjectiveText();
  }

  protected populateRoom(): void {
    const episode = exteriorEpisode();

    this.addPilotDoor({
      to: 'diagnostics_laboratory',
      spawn: 'exterior_recovery_yard',
      // Unit 7 (V9): iris airlock art (PROVISIONAL strip, closed frame).
      texture: this.textures.exists('plv1-airlock-open')
        ? 'plv1-airlock-open'
        : undefined,
      textureFrame: 3,
    });

    // ——— Noor — the route anchor (order 0). ———
    const noor = YARD_SITES.noor;

    this.addNpc({
      interactionKey: 'pilotNoor',
      label: 'Noor',
      npcName: 'Noor — field recovery',
      texture: 'plv1-noor',
      workFrames: ['plv1-noor', 'plv1-noor-b'],
      x: noor.x,
      y: noor.y,
    });
    registerPilotStation({
      id: 'npc_noor',
      zone: 'exterior_recovery_yard',
      x: noor.x,
      y: noor.y,
      label: 'Noor',
      stages: ['exterior_briefing', 'exterior_work'],
      isDone: () => false,
      order: 0,
    });

    // ——— Field registries (fresh per scene; module state persists). ———
    this.targets = new FieldTargetRegistry();
    this.digRegistry = new DigSurfaceRegistry();
    this.caches = new FieldCacheManager(this);

    const cell = m23TargetCell();
    const centre = this.digRegistry.cellCenter(cell.col, cell.row);

    this.targets.register({
      target_id: M23_TARGET_ID,
      x: centre.x,
      y: centre.y,
      detection_radius: M23_DETECTION_RADIUS,
      form_id: episode.m23_form,
      zone_id: M23_ZONE_ID,
      active: m23TargetActive(),
      recovered: episode.m23.recovered,
    });
    this.digRegistry.registerZone({ zone_id: M23_ZONE_ID, ...M23_PLOT });

    if (!episode.m23.recovered) {
      this.digRegistry.registerBuried({
        object_id: M23_OBJECT_ID,
        item_id: M23_ITEM_ID,
        col: cell.col,
        row: cell.row,
        zone_id: M23_ZONE_ID,
      });
    }

    // Disturbed ground persists across scene creations (replayed while
    // the zone is enabled; a recovered object is never registered again,
    // so a replay can never duplicate it).
    for (const dug of episode.dug_cells) {
      this.digRegistry.dig(dug.col, dug.row);
      this.renderDugCell(dug.col, dug.row);
    }

    this.digRegistry.setZoneEnabled(M23_ZONE_ID, m23WindowOpen());

    // Belt-full recoveries left in the yard come back exactly where they
    // were (item conservation across scene creations).
    for (const cache of episode.caches) {
      this.caches.create(cache.item_id, cache.x, cache.y);
    }

    // ——— Controllers. ———
    this.scanController = new ScanController({
      scene: this,
      registry: this.targets,
      getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
      onResolved: (record) =>
        this.guard('M23', () => this.onScanResolved(record)),
      showFeedback: (message) => this.showFeedbackMessage(message),
    });

    if (m23WindowOpen()) {
      this.scanController.setContext(M23_SCAN_CONTEXT);
    }

    this.digController = new DigController({
      scene: this,
      registry: this.digRegistry,
      caches: this.caches,
      getProbePosition: () => ({
        x: this.player.selector.x + 8,
        y: this.player.selector.y + 8,
      }),
      onResolved: (record) =>
        this.guard('M23', () => this.onDigResolved(record)),
      onRefused: (refusal) => this.onDigRefused(refusal),
      onCellDug: (col, row) => {
        exteriorNoteDug(exteriorEpisode(), col, row);
        this.renderDugCell(col, row);
      },
      showFeedback: (message) => this.showFeedbackMessage(message),
    });
    this.magnet = new MagnetWinchController({
      scene: this,
      rig: YARD_SITES.magnetRig,
      tray: YARD_SITES.magnetTray,
      caches: this.caches,
      drawOutcome: () => drawMagnetPull(),
      onCycleResolved: (record) =>
        this.guard('M24', () => this.onMagnetCycleResolved(record)),
      showFeedback: (message) => this.showFeedbackMessage(message),
    });

    // ——— Sites (E stations) in operational order. ———
    this.buildCouplingSite();
    this.buildMastSite();
    this.buildExcavationSite();
    this.buildMetalYard();
    this.buildUplinkSite();
    this.buildApron();

    // ——— Tool issue at/after the briefing (a dropped tool never soft-locks). ———
    if (pilotStageAtOrAfter('exterior_briefing')) {
      this.ensureFieldTools();
    }

    // ——— C/D/F bindings (the shared field-action key language). ———
    this.actionController = new FieldActionController(this, () =>
      this.physicalInputEligible(),
    );
    this.actionController.setBindings([
      {
        key: 'C',
        label: 'Scan',
        getTarget: () => this.scanTarget(),
        perform: () => {
          if (this.scanController.performScan()) {
            this.player.playActionAnim('scan');
            playSheetEffect(
              this,
              'plv1-fx-scan-pulse',
              this.player.x,
              this.player.y - 8,
            );
          }
        },
        onIneligiblePress: () => this.onScanIneligiblePress(),
      },
      {
        key: 'D',
        label: 'Dig',
        getTarget: () => this.digController.getDigTarget(),
        perform: (target) => {
          if (this.digController.performDig(target)) {
            this.player.playActionAnim('dig');
            playSheetEffect(this, 'plv1-fx-dig-dust', target.x, target.y - 6);
          }
        },
        onIneligiblePress: () => this.onDigIneligiblePress(),
      },
      {
        key: 'F',
        label: 'Winch',
        getTarget: () => this.rigTarget(),
        perform: () => {
          this.magnet.startCycle();
        },
        onIneligiblePress: () => this.onRigIneligiblePress(),
      },
    ]);

    // ——— Dressing (V4): one static storm-recovery worksite. ———
    // No ambient snowfall (mission §5); the storm reads through static
    // drifts, debris and the cleared service path (buildWorksiteGrammar).
    this.buildWorksiteGrammar();
    this.addDecor(11 * TILE, 15.4 * TILE, 'proc-footprints');
    this.addDecor(15 * TILE, 12.2 * TILE, 'proc-footprints');
    this.addDecor(8.5 * TILE, 8.4 * TILE, 'proc-ground-disturbed');
    this.addDecor(6 * TILE, 12.6 * TILE, 'proc-wall-pipes');
  }

  // ————————————————————————————————— V4 worksite grammar ——

  /**
   * Presentation only: a cleared service path in packed snow that links
   * the airlock apron, the coupling, Mast 04, the excavation field, the
   * Metal Recovery Yard gate and the uplink posts; zone plates (compound
   * gravel, excavation ground, apron); static drift ridges and debris
   * groups along the ridges. Nothing here collides, moves or carries
   * text; every coordinate the field actions and route specs use is
   * unchanged.
   */
  private buildWorksiteGrammar() {
    const path = (x: number, y: number, w: number, h: number) =>
      // Review Y2: packed snow reads as a lane — darker token, 2 px edge.
      this.add
        .rectangle(x, y, w, h, 0x8fa3b6, 0.7)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0x6f8497, 0.8)
        .setDepth(DepthLayer.FloorDecal + 0.02);
    const ground = (
      x: number,
      y: number,
      w: number,
      h: number,
      color: number,
      alpha: number,
    ) =>
      this.add
        .rectangle(x, y, w, h, color, alpha)
        .setOrigin(0.5)
        .setStrokeStyle(1, 0x8195a9, 0.4)
        .setDepth(DepthLayer.FloorDecal);

    // Airlock apron (rows 12-15, cols 8-16) and the airlock threshold.
    ground(12.5 * TILE, 13.5 * TILE, 9 * TILE, 3 * TILE, 0xb9c9d7, 0.5);
    ground(12 * TILE, 15.5 * TILE, 3 * TILE, TILE, 0xa7bacb, 0.7);
    // Service path: spine north from the apron to the mast footing …
    path(12 * TILE, 9 * TILE, 2 * TILE, 8 * TILE);
    // … west spur to the coupling (row 11) …
    path(7 * TILE, 11 * TILE, 10 * TILE, TILE);
    // … east spur to the excavation stake and the compound gate column …
    path(13.5 * TILE, 10 * TILE, 5 * TILE, TILE);
    path(15.5 * TILE, 8 * TILE, TILE, 5 * TILE);
    // … the gate lane into the Metal Recovery Yard (row 6) …
    path(18.5 * TILE, 6 * TILE, 7 * TILE, TILE);
    // … and the north-west lane to the uplink posts (column 7, row 5).
    path(7.5 * TILE, 7.5 * TILE, TILE, 5 * TILE);
    path(5 * TILE, 5.5 * TILE, 6 * TILE, TILE);

    // Excavation field: cleared, darker ground inside the stakes.
    ground(
      ((M23_PLOT.minCol + M23_PLOT.maxCol + 1) / 2) * TILE,
      ((M23_PLOT.minRow + M23_PLOT.maxRow + 1) / 2) * TILE,
      (M23_PLOT.maxCol - M23_PLOT.minCol + 1) * TILE,
      (M23_PLOT.maxRow - M23_PLOT.minRow + 1) * TILE,
      0x9fb0be,
      0.6,
    );

    // Static storm aftermath (review Y3/Y8: no bright vector drifts —
    // the calmer floor, the disturbed ground, footprints and debris carry
    // it): debris at the wall bases.
    this.addDecor(2 * TILE, 12.2 * TILE, 'proc-icon-scrap-plate');
    this.addDecor(22.6 * TILE, 12.4 * TILE, 'proc-icon-scrap-plate');
  }

  // ————————————————————————————————— sites ——

  private buildCouplingSite() {
    const site = YARD_SITES.coupling;

    this.addStation({
      interactionKey: 'pilotCoupling',
      label: 'Frozen Coolant Coupling',
      texture: 'proc-valve-relief',
      x: site.x,
      y: site.y,
      onPromptOpened: () => {
        const state = exteriorEpisode().m19;

        this.logStationOpened('frozen_coupling', {
          progress: state.progress,
          bound: state.bound,
        });

        if (state.closed || m19Completed(state)) {
          this.showFeedbackMessage(m19Readout(state));

          return false;
        }

        m19Present(Date.now());

        return true;
      },
    });
    registerPilotStation({
      id: 'coupling',
      zone: 'exterior_recovery_yard',
      x: site.x,
      y: site.y,
      label: 'Frozen Coolant Coupling',
      stages: ['exterior_work'],
      isDone: () => {
        const state = exteriorEpisode().m19;

        return state.closed || m19Completed(state);
      },
      order: 1,
    });
    this.addDecor(
      YARD_SITES.thawRack.x,
      YARD_SITES.thawRack.y,
      'proc-rack-fieldtools',
    );
    this.addDecor(site.x + 46, site.y + 6, 'proc-pipe-straight');
    this.addDecor(site.x + 78, site.y + 6, 'proc-pipe-straight');
    this.addDecor(site.x - 2, site.y + 44, 'proc-pipe-straight');
    this.couplingDial = this.add.graphics().setDepth(DepthLayer.WorldReadout);
    this.frostOverlay = this.add
      .rectangle(site.x, site.y - 4, 44, 40, 0xcfe6ff, 0.42)
      .setStrokeStyle(1, 0xe8f4ff, 0.8)
      .setDepth(3)
      .setVisible(false);
    this.couplingChip = this.chip(site.x, site.y + 46, '');
  }

  private buildMastSite() {
    const site = YARD_SITES.mast;

    this.addStation({
      interactionKey: 'pilotMast',
      label: 'Mast 04',
      texture: 'proc-beacon-comms',
      x: site.x,
      y: site.y,
      onPromptOpened: () => {
        const state = exteriorEpisode().m20;

        this.logStationOpened('mast_04', {
          accepted: state.accepted,
          stages_done: state.stages_done.length,
        });
        m20Present(Date.now());

        return true;
      },
    });
    registerPilotStation({
      id: 'mast',
      zone: 'exterior_recovery_yard',
      x: site.x,
      y: site.y,
      label: 'Mast 04',
      stages: ['exterior_work'],
      isDone: () => {
        const state = exteriorEpisode().m20;

        return state.accepted && m20OutdoorComplete(state);
      },
      order: 2,
    });
    this.mastTower = this.add
      .image(
        YARD_SITES.mastTower.x,
        YARD_SITES.mastTower.y,
        'proc-antenna-damaged',
      )
      .setDepth(worldDepth(YARD_SITES.mastTower.y + 40));
    this.mastFeed = this.add.graphics().setDepth(DepthLayer.FloorMarking);
    this.mastChip = this.chip(YARD_SITES.mastTower.x, 1.85 * TILE, '');
  }

  private buildExcavationSite() {
    const site = YARD_SITES.plotStake;

    this.addStation({
      interactionKey: 'pilotPlotStake',
      label: 'Excavation Field Stake',
      texture: 'proc-survey-stake',
      x: site.x,
      y: site.y,
      onPromptOpened: () => {
        const state = exteriorEpisode().m23;

        this.logStationOpened('excavation_stake', {
          open: m23WindowOpen(),
          recovered: state.recovered,
        });

        if (state.closed) {
          this.showFeedbackMessage(
            state.recovered
              ? 'The relay coupling was recovered from this field.'
              : 'The excavation is closed for this shift.',
          );

          return false;
        }

        m23Present(Date.now());

        return true;
      },
    });
    registerPilotStation({
      id: 'excavation',
      zone: 'exterior_recovery_yard',
      x: site.x,
      y: site.y,
      label: 'Excavation Field Stake',
      stages: ['exterior_work'],
      isDone: () => {
        const state = exteriorEpisode().m23;

        return state.closed || state.recovered;
      },
      order: 3,
    });

    // Restrained boundary: corner stakes + a dashed outline.
    for (const [x, y] of [
      [M23_PLOT.minCol * TILE - 6, M23_PLOT.minRow * TILE - 6],
      [(M23_PLOT.maxCol + 1) * TILE + 6, M23_PLOT.minRow * TILE - 6],
      [M23_PLOT.minCol * TILE - 6, (M23_PLOT.maxRow + 1) * TILE + 6],
      [(M23_PLOT.maxCol + 1) * TILE + 6, (M23_PLOT.maxRow + 1) * TILE + 6],
    ] as const) {
      this.addDecor(x, y, 'proc-sector-post');
    }

    this.addDecor(21 * TILE, 14.6 * TILE, 'proc-crate-fieldkit');
    this.addDecor(17 * TILE, 14.8 * TILE, 'proc-dig-mound');
  }

  private buildMetalYard() {
    const rig = YARD_SITES.magnetRig;

    // Visibly different ground: a dark gravel/scrap floor under the
    // compound plus scattered scrap (pure presentation).
    // V4: compound ground on the decal layer (a figure is never drawn
    // under the yard floor) with an edge line; the rig pad under the rig.
    this.add
      .rectangle(17 * TILE, 2 * TILE, 7 * TILE, 5 * TILE, 0x1b1f24, 0.5)
      .setOrigin(0)
      .setStrokeStyle(1, 0x46586b, 0.8)
      .setDepth(DepthLayer.FloorDecal);
    this.add
      .ellipse(rig.x, rig.y + 30, 96, 30, 0x2a2f36, 0.9)
      .setStrokeStyle(1, 0x46586b, 0.8)
      .setDepth(DepthLayer.FloorDecal + 0.01);

    for (const [x, y] of [
      [17.8 * TILE, 2.6 * TILE],
      [22.6 * TILE, 2.4 * TILE],
      [23.2 * TILE, 5.9 * TILE],
      [17.5 * TILE, 6.4 * TILE],
    ] as const) {
      this.addDecor(x, y, 'proc-icon-scrap-plate');
    }

    this.addStation({
      interactionKey: 'pilotRigReadout',
      label: 'Magnet Recovery Rig',
      texture: 'proc-rig-recycler',
      x: rig.x,
      y: rig.y,
      onPromptOpened: () => {
        const state = exteriorEpisode().m24;

        this.logStationOpened('magnet_rig', {
          deck_position: magnetDeckState.position,
          depleted: magnetDeckDepleted(),
          knowledge: m24KnowledgeState(state),
        });

        if (state.closed) {
          this.showFeedbackMessage(
            magnetDeckDepleted()
              ? M24_DEPLETION_STATEMENT
              : 'The salvage tally is closed for this shift.',
          );

          return false;
        }

        m24Present(Date.now());

        // Opening the panel while depleted DISPLAYS the statement (the
        // prompt body is the statement) — recorded as an exposure.
        if (m24WindowOpen() && magnetDeckDepleted()) {
          m24DepletionShown(Date.now());
        }

        return true;
      },
    });
    registerPilotStation({
      id: 'rig',
      zone: 'exterior_recovery_yard',
      x: rig.x,
      y: rig.y,
      label: 'Magnet Recovery Rig',
      stages: ['exterior_work'],
      isDone: () => {
        const state = exteriorEpisode().m24;

        return state.closed || state.depletion_acknowledged_ms !== null;
      },
      order: 4,
    });
    this.addDecor(
      YARD_SITES.magnetTray.x,
      YARD_SITES.magnetTray.y,
      'proc-bin-consumables',
    );
    this.rigChip = this.chip(rig.x, rig.y - 68, '');

    // The equally visible useful alternative: the sorting bench.
    const bench = YARD_SITES.sortingBench;

    this.addStation({
      interactionKey: 'pilotSortingBench',
      label: 'Sorting Bench',
      texture: 'proc-bench-prep',
      x: bench.x,
      y: bench.y,
      onPromptOpened: () => {
        this.logStationOpened('sorting_bench', {});

        return true;
      },
    });
  }

  private buildUplinkSite() {
    const postA = YARD_SITES.uplinkA;
    const postB = YARD_SITES.uplinkB;
    const panel = YARD_SITES.linePanel;

    this.addStation({
      interactionKey: 'pilotUplinkA',
      label: 'Field Uplink Post A',
      texture: 'proc-beacon-comms',
      x: postA.x,
      y: postA.y,
      onPromptOpened: () => {
        const state = exteriorEpisode().m26;

        this.logStationOpened('uplink_post_a', {
          knowledge: m26Knowledge(state),
        });

        if (state.closed) {
          this.showFeedbackMessage('The uplink log is closed for this shift.');

          return false;
        }

        m26Present(Date.now());

        // The post's own status line IS evidence once the line is open.
        if (m26Disconnected(state)) {
          m26Evidence(Date.now(), 'post_a_status', 'keyboard');
        }

        return true;
      },
    });
    registerPilotStation({
      id: 'uplink',
      zone: 'exterior_recovery_yard',
      x: postA.x,
      y: postA.y,
      label: 'Field Uplink Post A',
      stages: ['exterior_work'],
      isDone: () => {
        const state = exteriorEpisode().m26;

        return state.closed || state.acknowledged_ms !== null;
      },
      order: 5,
    });

    this.addStation({
      interactionKey: 'pilotUplinkB',
      label: 'Field Uplink Post B',
      texture: 'proc-scan-node',
      x: postB.x,
      y: postB.y,
      onPromptOpened: () => {
        const state = exteriorEpisode().m26;

        this.logStationOpened('uplink_post_b', {
          knowledge: m26Knowledge(state),
        });

        if (state.closed) {
          this.showFeedbackMessage('The uplink log is closed for this shift.');

          return false;
        }

        m26Present(Date.now());

        return true;
      },
    });

    this.addStation({
      interactionKey: 'pilotLinePanel',
      label: 'Line Status Panel',
      texture: 'proc-panel-warning',
      x: panel.x,
      y: panel.y,
      onPromptOpened: () => {
        const state = exteriorEpisode().m26;

        this.logStationOpened('line_status_panel', {
          knowledge: m26Knowledge(state),
        });

        if (m26Disconnected(state)) {
          m26Evidence(Date.now(), 'line_status_panel', 'keyboard');
        }

        return true;
      },
    });

    this.conduit = this.add.graphics().setDepth(DepthLayer.FloorMarking);
    this.lineAChip = this.chip(postA.x, postA.y + 34, '');
    this.lineBChip = this.chip(postB.x, postB.y + 34, '');
  }

  private buildApron() {
    // Supply crate: neutral spares (also the participant path that can
    // fill the belt, so a full-belt recovery is reachable without any
    // developer action).
    const crate = YARD_SITES.supplyCrate;

    this.addStation({
      interactionKey: 'pilotStation',
      label: 'Yard Supply Crate',
      texture: 'proc-crate-supply',
      x: crate.x,
      y: crate.y,
      onPromptOpened: () => {
        this.logStationOpened('supply_crate', {});

        return true;
      },
    });

    // ——— Cable flag (M05 occasion 2) — never mentioned. ———
    const flag = YARD_SITES.cableFlag;

    this.addStation({
      interactionKey: 'pilotStation',
      label: 'Cable Flag',
      texture: 'proc-survey-stake-flagged',
      x: flag.x,
      y: flag.y,
      onPromptOpened: () => {
        this.logStationOpened('cable_flag', {});

        if (!m05Open('o2')) {
          this.showFeedbackMessage('Guy-line flag tied off.');

          return false;
        }

        if (initiateM05('o2', Date.now(), 'keyboard')) {
          // Manual world-action bracket for the 2 s neutral fix; ended on
          // the timer and on shutdown (D-V2-4 lesson).
          beginManualWorldAction();

          const endBracket = () => {
            endManualWorldAction();
            this.events.off('shutdown', endBracket);
          };

          this.events.once('shutdown', endBracket);
          this.time.delayedCall(M05_FIX_MS, () => {
            completeM05Fix('o2', Date.now(), 'keyboard');
            endBracket();
            this.cableFlag?.setVisible(false);
            this.showFeedbackMessage('Guy-line flag re-tied.');
          });
        }

        return false;
      },
    });
    this.cableFlag = this.add
      .rectangle(flag.x + 10, flag.y - 26, 12, 7, 0xe6c68f, 0.9)
      .setDepth(3)
      .setVisible(false);
  }

  private logStationOpened(stationId: string, extra: Record<string, unknown>) {
    this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
      metadata: { station_id: stationId, zone: this.zoneKey, ...extra },
    });
  }

  // ————————————————————————————————— prompts ——

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    const episode = exteriorEpisode();

    switch (interactionKey) {
      case 'pilotNoor':
        return this.noorBeat().body;
      case 'pilotCoupling':
        return m19PromptBody();
      case 'pilotMast':
        return episode.m20.accepted ? m20MastStatus(episode.m20) : M20_BRIEF;
      case 'pilotPlotStake': {
        const state = episode.m23;

        return state.entered
          ? `${M23_BRIEF}

Excavation in progress — ${state.scans} sweep${state.scans === 1 ? '' : 's'}, ${state.exact_dig_attempts} dig${state.exact_dig_attempts === 1 ? '' : 's'} inside the stakes.`
          : M23_BRIEF;
      }
      case 'pilotRigReadout': {
        const state = episode.m24;

        if (magnetDeckDepleted()) {
          return M24_DEPLETION_STATEMENT;
        }

        return state.entered ? m24PanelLine(state, false) : M24_RIG_BRIEF;
      }
      case 'pilotUplinkA': {
        const state = episode.m26;
        const status = m26PostStatus(state, 'A');
        const next = m26NextReportId();

        if (!state.entered) {
          return M26_UPLINK_BRIEF;
        }

        return `${status}\n${
          next === null
            ? 'Both recovery reports delivered.'
            : `Next report: ${M26_REPORT_LABELS[next]}.`
        }`;
      }
      case 'pilotUplinkB': {
        const state = episode.m26;
        const next = m26NextReportId();

        return `${m26PostStatus(state, 'B')}\n${
          next === null
            ? 'Both recovery reports delivered.'
            : `Next report: ${M26_REPORT_LABELS[next]}.`
        }`;
      }
      case 'pilotLinePanel':
        return m26Disconnected(episode.m26)
          ? M26_DISCONNECT_NOTICE
          : M26_CARRIER_OK_NOTICE;
      default:
        return undefined;
    }
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    switch (interactionKey) {
      case 'pilotNoor':
        return this.npcBeatOptions('pilotNoor', this.noorBeat());
      case 'pilotCoupling':
        return this.couplingOptions();
      case 'pilotMast':
        return this.mastOptions();
      case 'pilotPlotStake':
        return this.stakeOptions();
      case 'pilotRigReadout':
        return this.rigOptions();
      case 'pilotUplinkA':
        return this.uplinkOptions('A');
      case 'pilotUplinkB':
        return this.uplinkOptions('B');
      case 'pilotLinePanel':
        return this.linePanelOptions();
      case 'pilotSortingBench':
        return [
          this.option('Sort the recovered stock', () =>
            this.onSortingBenchUsed(),
          ),
          this.option('Step away'),
        ];
      case 'pilotStation':
        return this.crateOptions();
      default:
        return [];
    }
  }

  /** A neutral step-away that releases guidance for this site (never the register). */
  private stepAway(
    site: 'mast' | 'excavation' | 'rig' | 'uplink',
  ): PromptOption {
    return this.option('Step away', () => {
      dismissExteriorSite(site);
      this.refreshGuidance();
    });
  }

  private option(
    label: string,
    onSelected?: () => void,
    feedback = '',
  ): PromptOption {
    return { label, feedback, getEventTypes: () => [], onSelected };
  }

  // ——— M19 ———

  private couplingOptions(): PromptOption[] {
    const site = YARD_SITES.coupling;
    const timed = (label: string, durationMs: number, kind: 'turn' | 'thaw') =>
      this.option(label, () => {
        const started = performWorldAction({
          scene: this,
          x: site.x,
          y: site.y - 30,
          label: kind === 'turn' ? 'Turning the wheel…' : 'Thawing the collar…',
          durationMs,
          cancellable: true,
          onComplete: () =>
            this.guard('M19', () => {
              const outcome = m19Act(kind, Date.now(), 'keyboard');

              if (outcome !== null) {
                this.showFeedbackMessage(outcome.message);
                this.refreshCouplingVisuals();
                this.refreshGuidance();
                refreshPilotCoverageProbe();
              }
            }),
        });

        if (started) {
          this.player.playActionAnim(kind === 'turn' ? 'pickup' : 'scan');

          if (kind === 'thaw') {
            sfxMachineOn();
          }
        }
      });

    return [
      timed('Turn the wheel', M19_TURN_MS, 'turn'),
      timed('Thaw the collar (heat gun)', M19_THAW_MS, 'thaw'),
      this.option('Inspect the coupling', () => {
        const outcome = m19Act('inspect', Date.now(), 'keyboard');

        if (outcome !== null) {
          this.showFeedbackMessage(outcome.message);
        }
      }),
      this.option('Step away', () => {
        if (!exteriorEpisode().m19.entered) {
          dismissExteriorSite('coupling');
          this.refreshGuidance();
        }

        if (m19StepAway(Date.now(), 'keyboard')) {
          this.showFeedbackMessage(
            'You step back from the coupling; it stays as you left it.',
          );
          this.refreshGuidance();
          refreshPilotCoverageProbe();
        }
      }),
    ];
  }

  // ——— M20 (start only) ———

  private mastOptions(): PromptOption[] {
    const state = exteriorEpisode().m20;
    const site = YARD_SITES.mast;

    if (!state.accepted) {
      return [
        this.option('Accept the restoration', () => {
          if (m20AcceptTask(Date.now(), 'keyboard')) {
            this.showFeedbackMessage(
              'Mast 04 restoration accepted — start with the base clamp (E at the mast).',
            );
            this.refreshMastVisuals();
            this.refreshGuidance();
            refreshPilotCoverageProbe();
          }
        }),
        this.stepAway('mast'),
      ];
    }

    const next = m20NextStage(state);

    if (next === null) {
      return [
        this.option(
          'Step away',
          undefined,
          'Feed seated. Alignment is done from the station feed console inside.',
        ),
      ];
    }

    return [
      this.option(M20_STAGE_LABELS[next], () => {
        const started = performWorldAction({
          scene: this,
          x: site.x,
          y: site.y - 30,
          label:
            next === 'clear_base_clamp'
              ? 'Clearing the clamp…'
              : 'Seating the feed line…',
          durationMs: M20_STAGE_MS[next],
          cancellable: true,
          onComplete: () =>
            this.guard('M20', () => {
              if (m20DoStage(next, Date.now(), 'keyboard')) {
                this.showFeedbackMessage(
                  next === 'clear_base_clamp'
                    ? 'Base clamp cleared of ice. Next: seat the feed line.'
                    : 'Feed line seated. Alignment is done from the station feed console inside.',
                );
                this.refreshMastVisuals();
                this.refreshGuidance();
                refreshPilotCoverageProbe();
              }
            }),
        });

        if (started) {
          this.player.playActionAnim(
            next === 'clear_base_clamp' ? 'dig' : 'pickup',
          );
        }
      }),
      this.stepAway('mast'),
    ];
  }

  // ——— M23 ———

  private stakeOptions(): PromptOption[] {
    const state = exteriorEpisode().m23;

    if (!state.entered) {
      return [
        this.option('Begin the excavation', () => {
          if (m23Begin(Date.now(), 'keyboard')) {
            this.targets.setActive(M23_TARGET_ID, true);
            this.digRegistry.setZoneEnabled(M23_ZONE_ID, true);
            this.scanController.setContext(M23_SCAN_CONTEXT);
            this.redrawPlotOverlay();
            this.showFeedbackMessage(
              'Excavation open — sweep (C) inside the stakes, dig (D) the cell you face.',
            );
            this.refreshGuidance();
            refreshPilotCoverageProbe();
          }
        }),
        this.stepAway('excavation'),
      ];
    }

    return [
      this.option('Continue'),
      this.option('Stop the excavation', () => {
        if (m23Stop(Date.now(), 'keyboard')) {
          this.closeExcavationMechanics();
          this.showFeedbackMessage(
            'Excavation stopped; the field stays as it is.',
          );
          this.refreshGuidance();
          refreshPilotCoverageProbe();
        }
      }),
    ];
  }

  private closeExcavationMechanics() {
    this.targets.setActive(M23_TARGET_ID, false);
    this.digRegistry.setZoneEnabled(M23_ZONE_ID, false);
    this.scanController.setContext('free');
    this.redrawPlotOverlay();
  }

  // ——— M24 ———

  private rigOptions(): PromptOption[] {
    const state = exteriorEpisode().m24;

    if (!state.entered) {
      return [
        this.option('Start the salvage tally', () => {
          if (m24Begin(Date.now(), 'keyboard')) {
            this.showFeedbackMessage(
              'Tally open — stand on the operating pad and start a cycle with F.',
            );
            this.refreshRigVisuals();
            this.refreshGuidance();
            refreshPilotCoverageProbe();

            if (magnetDeckDepleted()) {
              // Depleted before the window (free play): the statement is
              // displayed and recorded inside the window at once.
              this.showDepletedBanner();
              this.showFeedbackMessage(M24_DEPLETION_STATEMENT);
              m24DepletionShown(Date.now());
            }
          }
        }),
        this.stepAway('rig'),
      ];
    }

    const options: PromptOption[] = [];

    if (m24KnowledgeState(state) === 'depleted_unacknowledged') {
      options.push(
        this.option('Acknowledge the depletion notice', () => {
          if (m24AcknowledgeDepletion(Date.now(), 'keyboard')) {
            this.showFeedbackMessage(
              'Depletion notice acknowledged. The rig and the sorting bench both remain available.',
            );
            this.refreshGuidance();
            refreshPilotCoverageProbe();
          }
        }),
      );
    } else {
      options.push(
        this.option('Check the panel', () => {
          this.showFeedbackMessage(
            magnetDeckDepleted()
              ? M24_DEPLETION_STATEMENT
              : `${m24PanelLine(state, false)} — cycles run from the operating pad (F).`,
          );
        }),
      );
    }

    options.push(this.stepAway('rig'));

    return options;
  }

  private onSortingBenchUsed(): void {
    const bench = YARD_SITES.sortingBench;
    const started = performWorldAction({
      scene: this,
      x: bench.x,
      y: bench.y - 30,
      label: 'Sorting salvage…',
      durationMs: 1200,
      cancellable: true,
      onComplete: () =>
        this.guard('M24', () => {
          m24Alternative(Date.now(), 'keyboard');
          this.showFeedbackMessage(
            'Recovered stock sorted — the bench log is up to date.',
          );
          refreshPilotCoverageProbe();
        }),
    });

    if (!started) {
      this.showFeedbackMessage('The bench is busy — one moment.');
    }
  }

  // ——— M26 ———

  private uplinkOptions(channel: 'A' | 'B'): PromptOption[] {
    const state = exteriorEpisode().m26;
    const site = channel === 'A' ? YARD_SITES.uplinkA : YARD_SITES.uplinkB;
    const options: PromptOption[] = [];

    if (!state.entered) {
      options.push(
        this.option('Power up the uplink', () => {
          if (m26Begin(Date.now(), 'keyboard')) {
            this.showFeedbackMessage(
              'Uplink powered — two recovery reports are queued. Transmit from a post (E).',
            );
            this.refreshUplinkVisuals();
            this.refreshGuidance();
            refreshPilotCoverageProbe();
          }
        }),
        this.stepAway('uplink'),
      );

      return options;
    }

    const next = m26NextReportId();

    if (next !== null) {
      options.push(
        this.option(`Transmit: ${M26_REPORT_LABELS[next]}`, () => {
          const started = performWorldAction({
            scene: this,
            x: site.x,
            y: site.y - 30,
            label: 'Transmitting…',
            durationMs: M26_TRANSMIT_MS,
            cancellable: false,
            onComplete: () =>
              this.guard('M26', () => this.resolveTransmission(channel)),
          });

          if (started) {
            this.player.playActionAnim('scan');
          }
        }),
      );
    } else {
      options.push(
        this.option(
          'Check the log',
          undefined,
          'Both recovery reports delivered.',
        ),
      );
    }

    if (
      channel === 'A' &&
      m26Knowledge(state) === 'disconnected_unacknowledged'
    ) {
      options.push(this.acknowledgeLineOption());
    }

    if (channel === 'A' && m26Disconnected(state)) {
      options.push(
        this.option('Inspect the line', () => {
          m26Evidence(Date.now(), 'post_a_inspection', 'keyboard');
          this.showFeedbackMessage(M26_DISCONNECT_NOTICE);
        }),
      );
    }

    options.push(this.stepAway('uplink'));

    return options.slice(0, 4);
  }

  private acknowledgeLineOption(): PromptOption {
    return this.option('Acknowledge: Line A is open', () => {
      if (m26AcknowledgeDisconnect(Date.now(), 'keyboard')) {
        this.showFeedbackMessage(
          'Line A open — acknowledged. Post B (backup) remains available.',
        );
        this.refreshGuidance();
        refreshPilotCoverageProbe();
      }
    });
  }

  private linePanelOptions(): PromptOption[] {
    const state = exteriorEpisode().m26;
    const options: PromptOption[] = [];

    if (
      m26WindowOpen() &&
      m26Knowledge(state) === 'disconnected_unacknowledged'
    ) {
      options.push(this.acknowledgeLineOption());
    }

    options.push(this.option('Close'));

    return options;
  }

  private resolveTransmission(channel: 'A' | 'B') {
    const transmission = m26Send(channel, Date.now(), 'keyboard');

    if (transmission === null) {
      return;
    }

    if (transmission.delivered) {
      sfxMachineOn();
      this.showFeedbackMessage(
        `ACK — ${M26_REPORT_LABELS[transmission.report!]} received by the station (Post ${channel}).`,
      );
    } else if (
      transmission.report === null &&
      transmission.classification === 'delivered'
    ) {
      this.showFeedbackMessage(`ACK — Post ${channel} carrier check received.`);
    } else {
      sfxUnavailable();
      this.showFeedbackMessage(
        'NO CARRIER — Line A is open at junction 2. Nothing sent from Post A reaches the station.',
      );
    }

    this.refreshUplinkVisuals();
    this.refreshGuidance();
    refreshPilotCoverageProbe();

    if (m26DisconnectPending() && this.disconnectTimer === null) {
      this.disconnectTimer = this.time.delayedCall(
        M26_DISCONNECT_DELAY_MS,
        () => {
          this.disconnectTimer = null;
          this.demonstrateDisconnect();
        },
      );
    }
  }

  /** The scripted, standardised conduit failure (visible world event). */
  private demonstrateDisconnect() {
    if (!m26DemonstrateDisconnect(Date.now())) {
      return;
    }

    sfxUnavailable();
    playSheetEffect(
      this,
      'plv1-fx-sparks',
      (YARD_SITES.uplinkA.x + YARD_SITES.linePanel.x) / 2,
      (YARD_SITES.uplinkA.y + YARD_SITES.linePanel.y) / 2,
    );
    this.showFeedbackMessage(
      'A gust drops the guy-line — the conduit to Post A tears open at junction 2. Post A reads LINE OPEN.',
    );
    this.refreshUplinkVisuals();
    refreshPilotCoverageProbe();
  }

  // ——— Supply crate ———

  private crateOptions(): PromptOption[] {
    return [
      this.option('Take a spare valve seal', () => {
        this.showFeedbackMessage(
          addInventoryItem('valve_seal')
            ? 'Spare valve seal taken.'
            : 'Belt full — no room for another spare.',
        );
      }),
      this.option('Take a heat canister', () => {
        this.showFeedbackMessage(
          addInventoryItem('heat_canister')
            ? 'Heat canister taken.'
            : 'Belt full — no room for another spare.',
        );
      }),
      this.option('Return spares to the crate', () => {
        let returned = 0;

        while (
          removeInventoryItem('valve_seal') ||
          removeInventoryItem('heat_canister')
        ) {
          returned += 1;
        }

        this.showFeedbackMessage(
          returned === 0
            ? 'No spares to return.'
            : `${returned} spare${returned === 1 ? '' : 's'} returned.`,
        );
      }),
      this.option('Close'),
    ];
  }

  // ————————————————————————————————— Noor ——

  private noorBeat(): PilotNpcBeat {
    switch (pilotStage()) {
      case 'exterior_briefing':
        return {
          body:
            'Noor: Storm damage, five sites — work them in this order: the frozen coolant coupling (west), Mast 04 (north), the staked excavation field (east), the magnet rig in the Metal Recovery Yard (north-east), then the uplink posts (north-west) for the two recovery reports.\n' +
            'Each site has its own panel (E). Scanner is C, spade is D, the rig is F. Come back to me when you are finished outside.',
          options: [
            {
              label: 'Ready.',
              tag: 'yard_brief_ack',
              onSelected: () => {
                advancePilotStage('exterior_work', Date.now());
                this.ensureFieldTools();
                this.refreshGuidance();
              },
            },
          ],
        };
      case 'exterior_work':
        return {
          body: 'Noor: How is it going out here? Anything you leave stays as you left it.',
          options: [
            {
              label: 'Still working.',
              tag: 'yard_continue',
              feedback: 'Noor: Go on.',
            },
            {
              label: 'I am finished outside.',
              tag: 'yard_done',
              feedback:
                'Noor: Logged. Back through the airlock — Vale is waiting at the incident desk.',
              onSelected: () => this.finishOutside(),
            },
          ],
        };
      case 'return_hub':
      case 'workshop_return':
      case 'deck_closure':
      case 'core_stabilise':
      case 'core_sync':
      case 'complete':
        return {
          body: 'Noor: Yard work is logged. Vale is waiting inside at the incident desk.',
          options: [{ label: 'Understood.', tag: 'redirect_inside' }],
        };
      default:
        return {
          body: 'Noor: Kai sends people out here once the laboratory work is through.',
          options: [{ label: 'Understood.', tag: 'redirect_lab' }],
        };
    }
  }

  /** The ONE interruption point: the required return duty begins. */
  private finishOutside() {
    const now = Date.now();

    if (m05Open('o2')) {
      censorM05('o2', now, 'stage_advanced');
      this.cableFlag?.setVisible(false);
    }

    endExteriorShift(now);
    this.closeExcavationMechanics();
    advancePilotStage('return_hub', now);
    this.refreshAllVisuals();
    refreshValidityProbe();
    refreshPilotCoverageProbe();
  }

  private ensureFieldTools(): void {
    if (!hasInventoryItem('field_scanner')) {
      addInventoryItem('field_scanner');
    }

    if (!hasInventoryItem('excavation_spade')) {
      addInventoryItem('excavation_spade');
    }
  }

  // ————————————————————————————————— field-action routing ——

  private scanTarget(): { x: number; y: number } | null {
    if (this.scanController.isCoolingDown()) {
      return null;
    }

    // Inside the staked field the survey is honest only while the window
    // is open (before it the target is inert; after a stop it stays
    // buried) — sweeps there are refused neutrally, never faked.
    if (
      m23PositionInsidePlot(this.player.x, this.player.y) &&
      !m23WindowOpen()
    ) {
      return null;
    }

    return { x: this.player.x, y: this.player.y };
  }

  private onScanIneligiblePress(): void {
    if (this.scanController.isCoolingDown()) {
      this.scanController.showCooldownFeedback();

      return;
    }

    if (
      m23PositionInsidePlot(this.player.x, this.player.y) &&
      !m23WindowOpen()
    ) {
      this.showFeedbackMessage(
        exteriorEpisode().m23.closed
          ? 'The excavation field is closed for this shift.'
          : 'The field is staked — read the stake panel (E) before surveying it.',
      );
      logSecondaryFieldAction('refusal', {
        action: 'scan',
        reason: 'plot_window_closed',
      });
    }
  }

  private onDigIneligiblePress(): void {
    const cell = this.digRegistry.resolveCell(
      this.player.selector.x + 8,
      this.player.selector.y + 8,
    );

    if (m23CellInsidePlot(cell.col, cell.row) && !m23WindowOpen()) {
      this.showFeedbackMessage(
        exteriorEpisode().m23.closed
          ? 'The excavation field is closed for this shift.'
          : 'The field is staked — read the stake panel (E) before digging.',
      );
      logSecondaryFieldAction('refusal', {
        action: 'dig',
        reason: 'plot_window_closed',
        col: cell.col,
        row: cell.row,
      });

      return;
    }

    this.digController.handleIneligiblePress();
  }

  private onScanResolved(record: ScanRecord): void {
    logSecondaryFieldAction('scan', { ...record });

    if (m23WindowOpen()) {
      m23Scan(record, Date.now());
    }
  }

  private onDigResolved(record: DigRecord): void {
    logSecondaryFieldAction('dig', { ...record });

    const now = Date.now();

    if (record.outcome === 'cached') {
      const centre = this.digRegistry.cellCenter(record.col, record.row);

      exteriorAddCache(exteriorEpisode(), {
        item_id: record.item_id!,
        x: centre.x,
        y: centre.y,
        source: 'dig',
      });
      logSecondaryFieldAction('cache_created', {
        item_id: record.item_id,
        source: 'dig',
      });
    }

    if (m23WindowOpen()) {
      const note = m23Dig(record, now, 'keyboard');

      if (note?.recovered) {
        this.targets.markRecovered(M23_TARGET_ID);
        this.closeExcavationMechanics();
        this.showFeedbackMessage(
          'Relay coupling recovered. Its tag lists a salvage tally for the Metal Recovery Yard rig — north-east.',
        );
        this.refreshGuidance();
      }
    }

    refreshPilotCoverageProbe();
  }

  private onDigRefused(refusal: DigRefusal): void {
    logSecondaryFieldAction('refusal', {
      action: 'dig',
      reason: refusal.reason,
      col: refusal.col,
      row: refusal.row,
    });

    if (m23WindowOpen()) {
      m23Invalid(Date.now(), {
        action: 'dig',
        reason: refusal.reason,
        col: refusal.col,
        row: refusal.row,
      });
    }
  }

  private onMagnetCycleResolved(record: MagnetCycleRecord): void {
    logSecondaryFieldAction('magnet_cycle', { ...record });

    const now = Date.now();

    if (!record.cancelled) {
      playSheetEffect(
        this,
        'plv1-fx-sparks',
        YARD_SITES.magnetRig.x,
        YARD_SITES.magnetRig.y + 22,
      );
    }

    if (record.item_delivery === 'cache') {
      exteriorAddCache(exteriorEpisode(), {
        item_id: record.item_id!,
        x: YARD_SITES.magnetTray.x,
        y: YARD_SITES.magnetTray.y,
        source: 'magnet',
      });
      logSecondaryFieldAction('cache_created', {
        item_id: record.item_id,
        source: 'magnet',
      });
    }

    if (m24WindowOpen()) {
      m24Cycle(record, now);
    }

    if (record.depleted_now || record.post_depletion) {
      this.showDepletedBanner();
      this.showFeedbackMessage(M24_DEPLETION_STATEMENT);

      if (m24WindowOpen()) {
        m24DepletionShown(now);
      }
    }

    this.refreshRigVisuals();
    refreshPilotCoverageProbe();
  }

  // ————————————————————————————————— rig eligibility ——

  private playerInsideRigPad(): boolean {
    return (
      this.player.x >= YARD_RIG_PAD.minX &&
      this.player.x <= YARD_RIG_PAD.maxX &&
      this.player.y >= YARD_RIG_PAD.minY &&
      this.player.y <= YARD_RIG_PAD.maxY
    );
  }

  private rigTarget(): { x: number; y: number } | null {
    if (
      !this.playerInsideRigPad() ||
      !this.magnet.canStart() ||
      !m24WindowOpen()
    ) {
      return null;
    }

    return { x: YARD_SITES.magnetRig.x, y: YARD_SITES.magnetRig.y };
  }

  private onRigIneligiblePress(): void {
    if (!this.playerInsideRigPad()) {
      return;
    }

    if (!m24WindowOpen()) {
      this.showFeedbackMessage(
        exteriorEpisode().m24.closed
          ? 'The salvage tally is closed for this shift.'
          : 'Read the rig panel (E) to start the salvage tally before running the winch.',
      );

      return;
    }

    if (!this.magnet.canStart()) {
      this.magnet.showCooldownFeedback();
    }
  }

  // ————————————————————————————————— M05 occasion 2 ——

  /** Presented at the first quiet moment after the briefing was acknowledged. */
  /** Unit 7 (V19): mast art follows the restoration state; a slow two-frame
   * signal pulse once the antenna is restored (reduced motion: held). */
  private refreshMastArt() {
    const tower = this.mastTower;

    if (tower === undefined || !this.textures.exists('plv1-antenna-signal')) {
      return;
    }

    // Restored art only once the WHOLE restoration (outdoor stages AND the
    // indoor alignment — every M20 raw component written) is complete;
    // never while the chip reads ALIGNMENT PENDING (scientific review S-M2).
    const state = exteriorEpisode().m20;
    const restored = state.accepted && m20Complete(state);

    if (!restored) {
      if (tower.texture.key !== 'proc-antenna-damaged') {
        tower.setTexture('proc-antenna-damaged');
      }

      return;
    }

    if (tower.texture.key !== 'plv1-antenna-signal') {
      tower.setTexture('plv1-antenna-signal', 0);
      this.mastPulseMs = 0;
    }

    if (prefersReducedMotion()) {
      return;
    }

    this.mastPulseMs = (this.mastPulseMs + this.game.loop.delta) % 2800;
    tower.setFrame(this.mastPulseMs < 2200 ? 0 : 3);
  }

  protected onPilotUpdate(): void {
    this.refreshMastArt();
    this.clampWorldReadouts([
      this.couplingChip ?? null,
      this.mastChip ?? null,
      this.rigChip ?? null,
      this.lineAChip ?? null,
      this.lineBChip ?? null,
    ]);

    if (
      !m05Presented('o2') &&
      pilotStageAtOrAfter('exterior_work') &&
      pilotStage() === 'exterior_work' &&
      this.physicalInputEligible()
    ) {
      const flag = YARD_SITES.cableFlag;

      presentM05('o2', Date.now(), {
        eligible: true,
        distance: Math.hypot(this.player.x - flag.x, this.player.y - flag.y),
        comprehension: 'passed',
      });
      this.cableFlag?.setVisible(true);
    }

    if (this.cableFlag?.visible && !prefersReducedMotion()) {
      // A loose flag flapping (glyph + motion, never colour-only).
      this.cableFlag.setScale(
        Math.floor(this.time.now / 220) % 2 === 0 ? 1 : 0.6,
        1,
      );
    }

    this.actionController?.update();

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      this.refreshProbes();
    }
  }

  protected onRoomExit(): void {
    if (m05Open('o2')) {
      censorM05('o2', Date.now(), 'left_zone');
      this.cableFlag?.setVisible(false);
    }
  }

  // ————————————————————————————————— interaction plumbing ——

  /** SPACE/E with no station in range: field caches are collected here. */
  protected onEmptyInteract(): void {
    const result = this.caches.tryCollectNearest(this.player.x, this.player.y);

    if (result.result === 'none_in_reach') {
      super.onEmptyInteract();

      return;
    }

    if (result.result === 'belt_full') {
      this.showFeedbackMessage(
        'Belt still full — free a slot, then collect the cache.',
      );

      return;
    }

    exteriorRemoveCache(
      exteriorEpisode(),
      result.entry.item_id,
      result.entry.x,
      result.entry.y,
    );
    this.player.playActionAnim('pickup');
    this.showFeedbackMessage('Cache collected.');
    logSecondaryFieldAction('cache_recovered', {
      cache_id: result.entry.cache_id,
      item_id: result.entry.item_id,
    });
    refreshPilotCoverageProbe();
  }

  /** Runtime errors inside a window become technical failures (invalid). */
  private guard(item: 'M19' | 'M20' | 'M23' | 'M24' | 'M26', fn: () => void) {
    try {
      fn();
    } catch (error) {
      exteriorTechnicalFailure(
        item,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  // ————————————————————————————————— presentation ——

  /**
   * State readout chip (task state, never a directive): environment
   * register, rasterised at 2× for the world zoom, sorted just below the
   * foot line of the prop it annotates so it never covers a figure.
   */
  private chip(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return (
      this.add
        .text(x, y, text, {
          backgroundColor: '#101820',
          color: '#c9d6e2',
          font: '10px monospace',
          padding: { x: 4, y: 2 },
          resolution: 2,
        })
        .setOrigin(0.5)
        .setAlpha(0.88)
        // Review Y1: the low-prop band — under every figure by construction;
        // chips are placed beside/under their props so nothing overlaps them.
        .setDepth(DepthLayer.LowProp)
    );
  }

  private renderDugCell(col: number, row: number): void {
    this.add
      .rectangle(col * TILE + 16, row * TILE + 16, 26, 26, 0x1a1410, 0.55)
      .setDepth(DepthLayer.FloorMarking);
  }

  private refreshAllVisuals() {
    this.refreshCouplingVisuals();
    this.refreshMastVisuals();
    this.redrawPlotOverlay();
    this.refreshRigVisuals();
    this.refreshUplinkVisuals();
  }

  private refreshCouplingVisuals() {
    const state = exteriorEpisode().m19;
    const site = YARD_SITES.coupling;

    if (this.couplingDial !== undefined) {
      const dial = this.couplingDial;
      const cx = site.x;
      const cy = site.y - 34;
      const fraction = state.progress / 100;
      const angle = -Math.PI * 0.75 + fraction * Math.PI * 1.5;

      dial.clear();
      dial.lineStyle(3, 0x33475a, 1);
      dial.arc(cx, cy, 13, -Math.PI * 0.75, Math.PI * 0.75, false);
      dial.strokePath();
      dial.lineStyle(3, 0x5fd3c4, 1);
      dial.beginPath();
      dial.arc(cx, cy, 13, -Math.PI * 0.75, angle, false);
      dial.strokePath();
      dial.lineStyle(2, 0xdce7f0, 1);
      dial.lineBetween(
        cx,
        cy,
        cx + Math.cos(angle - Math.PI / 2) * 11,
        cy + Math.sin(angle - Math.PI / 2) * 11,
      );
    }

    this.frostOverlay?.setVisible(state.bound);
    this.couplingChip?.setText(
      m19Completed(state)
        ? 'VALVE OPEN · flow restored'
        : `VALVE ${state.progress}% · ${state.bound ? '❄ COLLAR ICED' : 'collar free'}`,
    );
  }

  private refreshMastVisuals() {
    const state = exteriorEpisode().m20;
    const site = YARD_SITES.mast;
    const tower = YARD_SITES.mastTower;

    this.mastChip?.setText(m20MastStatus(state));

    if (this.mastFeed === undefined) {
      return;
    }

    this.mastFeed.clear();

    if (state.stages_done.includes('clear_base_clamp')) {
      this.mastFeed.lineStyle(2, 0x5fd3c4, 0.9);
      this.mastFeed.strokeCircle(tower.x, tower.y + 26, 9);
    }

    if (state.stages_done.includes('seat_feed_line')) {
      this.mastFeed.lineStyle(2, 0xe6c68f, 1);
      this.mastFeed.lineBetween(
        site.x - 8,
        site.y - 6,
        tower.x + 6,
        tower.y + 14,
      );
    }
  }

  private redrawPlotOverlay(): void {
    this.plotOverlay?.destroy();

    const active = m23WindowOpen();
    const graphics = this.add.graphics().setDepth(DepthLayer.FloorMarking);
    const x0 = M23_PLOT.minCol * TILE;
    const y0 = M23_PLOT.minRow * TILE;
    const w = (M23_PLOT.maxCol - M23_PLOT.minCol + 1) * TILE;
    const h = (M23_PLOT.maxRow - M23_PLOT.minRow + 1) * TILE;

    graphics.lineStyle(active ? 2 : 1, 0x5fd3c4, active ? 0.9 : 0.35);

    // Dashed outline (short segments) — restrained boundary marker.
    const dash = 10;

    for (let x = x0; x < x0 + w; x += dash * 2) {
      graphics.lineBetween(x, y0, Math.min(x + dash, x0 + w), y0);
      graphics.lineBetween(x, y0 + h, Math.min(x + dash, x0 + w), y0 + h);
    }

    for (let y = y0; y < y0 + h; y += dash * 2) {
      graphics.lineBetween(x0, y, x0, Math.min(y + dash, y0 + h));
      graphics.lineBetween(x0 + w, y, x0 + w, Math.min(y + dash, y0 + h));
    }

    this.plotOverlay = graphics;
  }

  private refreshRigVisuals() {
    const state = exteriorEpisode().m24;

    this.rigChip?.setText(m24PanelLine(state, magnetDeckDepleted()));

    if (magnetDeckDepleted()) {
      this.showDepletedBanner();
    }
  }

  private showDepletedBanner(): void {
    if (this.depletedBanner !== undefined) {
      return;
    }

    this.depletedBanner = this.add
      .text(
        YARD_SITES.magnetRig.x - 12,
        YARD_SITES.magnetRig.y + 52,
        '■ CATCHMENT DEPLETED',
        {
          backgroundColor: '#3a1f1f',
          color: '#ffb4a8',
          font: '12px monospace',
          padding: { x: 6, y: 3 },
        },
      )
      .setOrigin(0.5)
      .setDepth(Depth.AbovePlayer);
  }

  private refreshUplinkVisuals() {
    const state = exteriorEpisode().m26;
    const a = YARD_SITES.uplinkA;
    const panel = YARD_SITES.linePanel;

    this.lineAChip?.setText(m26PostStatus(state, 'A'));
    this.lineBChip?.setText(m26PostStatus(state, 'B'));

    if (this.conduit === undefined) {
      return;
    }

    this.conduit.clear();

    const midX = (a.x + panel.x) / 2;
    const midY = (a.y + panel.y) / 2 + 22;

    if (m26Disconnected(state)) {
      // Severed: two dangling segments with a gap and a hazard mark.
      this.conduit.lineStyle(3, 0x9fb2c1, 1);
      this.conduit.lineBetween(a.x + 14, a.y + 12, midX - 16, midY + 6);
      this.conduit.lineBetween(midX + 14, midY - 8, panel.x - 12, panel.y + 12);
      this.conduit.lineStyle(2, 0xffb4a8, 1);
      this.conduit.lineBetween(midX - 6, midY - 6, midX + 6, midY + 6);
      this.conduit.lineBetween(midX - 6, midY + 6, midX + 6, midY - 6);
    } else {
      this.conduit.lineStyle(3, 0x9fb2c1, 1);
      this.conduit.lineBetween(a.x + 14, a.y + 12, midX, midY);
      this.conduit.lineBetween(midX, midY, panel.x - 12, panel.y + 12);
    }
  }

  private refreshProbes() {
    const episode = exteriorEpisode();
    const m05 = m05State('o2');

    window.__fieldActionsProbe = {
      scene: this.scene.key,
      worldActionActive: isWorldActionActive(),
      scan: {
        cooling: this.scanController.isCoolingDown(),
        context: this.scanController.getContext(),
        last: this.scanController.lastRecord,
      },
      dig: {
        last: this.digController.lastRecord,
        probe: {
          x: this.player.selector.x + 8,
          y: this.player.selector.y + 8,
        },
        refusal: (() => {
          const cell = this.digRegistry.resolveCell(
            this.player.selector.x + 8,
            this.player.selector.y + 8,
          );

          return {
            ...cell,
            reason: this.digRegistry.refusalReason(cell.col, cell.row),
          };
        })(),
        target: (() => {
          const target = this.digController.getDigTarget();

          return target === null
            ? null
            : {
                col: Math.floor(target.x / 32),
                row: Math.floor(target.y / 32),
              };
        })(),
      },
      magnet: {
        phase: this.magnet.getPhase(),
        markerInBand: this.magnet.isMarkerInBand(),
        deckForm: magnetDeckState.form,
        deckPosition: magnetDeckState.position,
        totalPulls: magnetDeckState.total_pulls,
        depleted: magnetDeckDepleted(),
      },
      windows: {
        m23_open: m23WindowOpen(),
        m24_open: m24WindowOpen(),
        m26_phase: m26Knowledge(episode.m26),
      },
      caches: this.caches.serialize(),
    };
    window.__exteriorProbe = {
      ...exteriorProbeSnapshot(),
      stage: pilotStage(),
      m05: {
        presented: m05Presented('o2'),
        open: m05Open('o2'),
        initiated: m05.initiatedAtMs !== null,
      },
    };
  }
}
