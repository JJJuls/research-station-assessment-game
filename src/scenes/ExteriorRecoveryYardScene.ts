/**
 * Exterior Recovery Yard — pilot zone 3 (professional pilot route).
 *
 * Storm-damaged exterior reached through the laboratory airlock (the
 * same airlock leads back — the only door, bidirectional). Unit 5
 * activates the exterior measurement work over the accepted
 * field-actions foundation (scan C / dig D / winch F):
 *
 * - M23 field recovery (east plot, counterbalanced target cell),
 * - M24 magnet utility (Metal Recovery Yard rig; corrected deck
 *   standardisation: every committed cycle consumes a position),
 * - M26 depleted search (control plot → verification post → fenced
 *   verified-empty plot),
 * - M22 relay housing seal and M25 yard coolant pump — AMBIENT fresh
 *   instances from the measurement-module factories (REV-BLOCK-3),
 *   orchestrated in src/pilot/yardJobs.ts.
 *
 * Noor calls the jobs in the session's counterbalanced order
 * (`exterior_job_order`: M23 first, then the {M22, M25} pair and the
 * {M24, M26} pair each counterbalanced, neutral check-in between the
 * last pair). Accepting a job is a BRIEF, never a gate: every station
 * stays reachable, nothing checks performance, "I am done outside" is
 * available at every step, and accepting the next job explicitly
 * closes the previous console-style window (one open window at a time
 * so a physical action can only ever notify one opportunity adapter).
 */
import Phaser from 'phaser';

import { key } from '../constants';
import type {
  DigRecord,
  DigRefusal,
  M23FieldRecoveryForm,
  MagnetCycleRecord,
  ScanRecord,
} from '../fieldActions';
import {
  closeM23FieldRecoveryWindow,
  closeM24MagnetUtilityWindow,
  closeM26DepletedSearchWindow,
  DigController,
  DigSurfaceRegistry,
  drawMagnetPull,
  ensureMagnetDeckForm,
  FieldCacheManager,
  FieldTargetRegistry,
  installFieldActionLogSink,
  logSecondaryFieldAction,
  m23FieldRecoveryState,
  m23FieldRecoveryWindowOpen,
  M23FR_DETECTION_RADIUS,
  M23FR_ENTRY_STATE_VERSION,
  M23FR_OPPORTUNITY_ID,
  M23FR_SCAN_CONTEXT,
  M23FR_TARGET_ID,
  m24MagnetUtilityState,
  m24MagnetUtilityWindowOpen,
  M24MU_DEPLETION_STATEMENT,
  M24MU_ENTRY_STATE_VERSION,
  M24MU_OPPORTUNITY_ID,
  m26DepletedSearchPhase,
  m26DepletedSearchState,
  m26DepletedSearchWindowOpen,
  M26DS_CONTROL_DETECTION_RADIUS,
  M26DS_CONTROL_FORM,
  M26DS_CONTROL_SCAN_CONTEXT,
  M26DS_CONTROL_TARGET_ID,
  M26DS_ENTRY_STATE_VERSION,
  M26DS_FUTILE_SCAN_CONTEXT,
  M26DS_FUTILITY_STATEMENT,
  M26DS_OPPORTUNITY_ID,
  magnetDeckDepleted,
  magnetDeckState,
  MagnetWinchController,
  markM23FieldRecoveryCompleted,
  markM24MagnetUtilityAlternativeActivity,
  markM24MagnetUtilityDepletionAcknowledged,
  markM24MagnetUtilityDepletionShown,
  markM26DepletedSearchAlternativeActivity,
  markM26DepletedSearchControlCompleted,
  markM26DepletedSearchFutilityAcknowledged,
  markM26DepletedSearchFutilityShown,
  noteM23FieldRecoveryDig,
  noteM23FieldRecoveryInterruption,
  noteM23FieldRecoveryInvalidAction,
  noteM23FieldRecoveryScan,
  noteM24MagnetUtilityCycle,
  noteM26DepletedSearchDig,
  noteM26DepletedSearchScan,
  openM23FieldRecoveryWindow,
  openM24MagnetUtilityWindow,
  openM26DepletedSearchWindow,
  ScanController,
  setFieldActionTelemetryScene,
} from '../fieldActions';
import { setM23FieldRecoveryHostScene } from '../fieldActions/opportunities/m23FieldRecovery';
import { setM24MagnetUtilityHostScene } from '../fieldActions/opportunities/m24MagnetUtility';
import { setM26DepletedSearchHostScene } from '../fieldActions/opportunities/m26DepletedSearch';
import { snowfall } from '../gameplay';
import { isWorldActionActive, performWorldAction } from '../gameplay/actions';
import { FieldActionController } from '../gameplay/fieldActionKeys';
import { addInventoryItem, hasInventoryItem } from '../gameplay/inventory';
import { M25_LOCK_STATEMENT } from '../measurement/m25PumpLock';
import {
  assignCounterbalance,
  declareOpportunity,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityInvalid,
  markOpportunityOffered,
  recordPriorExposure,
  refreshValidityProbe,
} from '../measurement/validity';
import {
  refreshPilotCoverageProbe,
  stampContaminationNotes,
} from '../pilot/pilotCoverage';
import {
  advancePilotStage,
  pilotStage,
  registerPilotStation,
} from '../pilot/pilotRoute';
import type { PilotNpcBeat } from '../pilot/PilotZoneScene';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import type { YardJobId } from '../pilot/yardJobs';
import {
  advanceYardJob,
  currentYardJob,
  ensureYardJobOrder,
  noteYardDeparture,
  noteYardZoneEntered,
  YARD_M22_ENTRY_STATE_VERSION,
  YARD_M22_OPPORTUNITY_ID,
  YARD_M25_ENTRY_STATE_VERSION,
  YARD_M25_OPPORTUNITY_ID,
  yardJobQueue,
  yardJobQueuePosition,
  yardM22Attempted,
  yardM22FetchSeal,
  yardM22SealFetched,
  yardM22SeatAttempt,
  yardM22Seated,
  yardM22Summary,
  yardM22WindowOpen,
  yardM25Attempted,
  yardM25Breaker,
  yardM25Prime,
  yardM25Reset,
  yardM25Summary,
  yardZoneEntryCount,
} from '../pilot/yardJobs';
import { YARD_SITES } from '../pilot/zoneSites';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

type ZoneRect = {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
};

/** East recovery plot (M23) — console-gated, counterbalanced cell. */
const M23_PLOT_ZONE: ZoneRect = {
  minCol: 16,
  maxCol: 22,
  minRow: 6,
  maxRow: 11,
};

/**
 * Yard target cells for the two counterbalanced M23 forms — both deep
 * in the plot so recovery difficulty is equivalent. (The lab host's
 * cells sit outside this room's grid; the form LABEL is the recorded
 * counterbalance, the cell is the host's realisation of it.)
 */
const YARD_M23_FORMS: Record<
  M23FieldRecoveryForm,
  { col: number; row: number }
> = {
  form_a: { col: 18, row: 8 },
  form_b: { col: 20, row: 10 },
};

/** M26 control plot (attainable) + fenced verified-empty plot. */
const M26_CONTROL_ZONE: ZoneRect = {
  minCol: 2,
  maxCol: 4,
  minRow: 3,
  maxRow: 5,
};
const YARD_M26_CONTROL_CELL = { col: 3, row: 4 };
const M26_DEPLETED_ZONE: ZoneRect = {
  minCol: 2,
  maxCol: 4,
  minRow: 10,
  maxRow: 12,
};

/** Metal Recovery Yard rig operating pad. */
const RIG_OPERATING_AREA = {
  minX: 18.5 * TILE,
  maxX: 23.5 * TILE,
  minY: 2 * TILE,
  maxY: 6 * TILE,
};

/** Alternative useful activity (visible while M24/M26 run). */
const SORTING_BENCH_POSITION = { x: 16 * TILE, y: 13.75 * TILE };

/** East plot stake (station marker just outside the dig zone). */
const PLOT_STAKE_POSITION = { x: 15 * TILE, y: 8.5 * TILE };

declare global {
  interface Window {
    /** DEV-only, read-only yard-job probe (never read back). */
    __yardJobsProbe?: {
      queue: readonly string[];
      current_job: string;
      zone_entries: number;
      m22: Record<string, unknown>;
      m25: Record<string, unknown>;
    } | null;
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
  private m23Form: M23FieldRecoveryForm = 'form_a';
  private deckForm: 'A' | 'B' = 'A';
  private plotOverlay?: Phaser.GameObjects.Graphics;
  private depletedBanner?: Phaser.GameObjects.Text;

  constructor() {
    super(key.scene.exteriorRecoveryYard);
  }

  protected getLayout(): RoomLayout {
    // 25×19 open yard: airlock doorway south (cols 11-12), a relay mast
    // block north-centre, work areas staked with posts.
    return {
      theme: 'exterior',
      grid: [
        '#########################',
        '#########################',
        '#..........###..........#',
        '#..........###..........#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
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
    // Apron, 95 px from the airlock and 140 px from Noor.
    return { x: 13.75 * TILE, y: 13.1 * TILE };
  }

  create(data?: { spawn?: string }) {
    // The fieldActions layer is runtime-import-free: install the real
    // log sink first so every emission reaches EventLogger, and re-home
    // the adapters' scene field to this host.
    installFieldActionLogSink((payload) =>
      researchRuntime.logInteraction(payload),
    );
    setFieldActionTelemetryScene('exterior_recovery_yard');
    setM23FieldRecoveryHostScene('exterior_recovery_yard');
    setM24MagnetUtilityHostScene('exterior_recovery_yard');
    setM26DepletedSearchHostScene('exterior_recovery_yard');

    // ——— Counterbalanced assignments (deterministic per session).
    const sessionId =
      researchRuntime.sessionState.getMetadata().game_session_id;

    this.m23Form = assignCounterbalance(sessionId, 'm23_field_recovery_form', [
      'form_a',
      'form_b',
    ] as const);
    this.deckForm = ensureMagnetDeckForm(
      assignCounterbalance(sessionId, 'field_magnet_deck_form', [
        'A',
        'B',
      ] as const),
    );

    const orderIndex = ensureYardJobOrder(
      assignCounterbalance(sessionId, 'exterior_job_order', [
        0, 1, 2, 3,
      ] as const),
    );

    // ——— SA-13 declarations (idempotent; windows open later).
    declareOpportunity({
      opportunity_id: M23FR_OPPORTUNITY_ID,
      owner: 'M23 (provisional, pilot yard)',
      entry_state_version: M23FR_ENTRY_STATE_VERSION,
      form: this.m23Form,
    });
    declareOpportunity({
      opportunity_id: M24MU_OPPORTUNITY_ID,
      owner: 'M24 (provisional, pilot yard)',
      entry_state_version: M24MU_ENTRY_STATE_VERSION,
      counterbalance: `deck_form_${this.deckForm}`,
    });
    declareOpportunity({
      opportunity_id: M26DS_OPPORTUNITY_ID,
      owner: 'M26 (provisional, pilot yard)',
      entry_state_version: M26DS_ENTRY_STATE_VERSION,
      form: M26DS_CONTROL_FORM,
    });
    declareOpportunity({
      opportunity_id: YARD_M22_OPPORTUNITY_ID,
      owner: 'M22 (provisional, pilot yard instance)',
      entry_state_version: YARD_M22_ENTRY_STATE_VERSION,
    });
    declareOpportunity({
      opportunity_id: YARD_M25_OPPORTUNITY_ID,
      owner: 'M25 (provisional, pilot yard instance)',
      entry_state_version: YARD_M25_ENTRY_STATE_VERSION,
    });

    const JOB_OPPORTUNITIES: Record<Exclude<YardJobId, 'checkin'>, string> = {
      m22: YARD_M22_OPPORTUNITY_ID,
      m23: M23FR_OPPORTUNITY_ID,
      m24: M24MU_OPPORTUNITY_ID,
      m25: YARD_M25_OPPORTUNITY_ID,
      m26: M26DS_OPPORTUNITY_ID,
    };

    for (const [job, opportunityId] of Object.entries(JOB_OPPORTUNITIES)) {
      markOpportunityOffered(opportunityId);

      const position = yardJobQueuePosition(job as YardJobId);

      if (position !== null) {
        recordPriorExposure(
          opportunityId,
          `control:exterior_job_order=${orderIndex};queue_position=${position}`,
        );
      }
    }

    stampContaminationNotes();
    super.create(data);

    const entries = noteYardZoneEntered();

    refreshValidityProbe();
    refreshPilotCoverageProbe();
    this.logScenarioEvent('pilotRoute', 'pilot_exterior_job_order', {
      metadata: {
        order_index: orderIndex,
        queue: [...yardJobQueue()],
        zone_entry_count: entries,
      },
    });
  }

  protected populateRoom(): void {
    this.addPilotDoor({
      to: 'diagnostics_laboratory',
      spawn: 'exterior_recovery_yard',
    });

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

    // ——— Field registries (fresh per entry; module state persists).
    this.targets = new FieldTargetRegistry();
    this.digRegistry = new DigSurfaceRegistry();
    this.caches = new FieldCacheManager(this);

    const m23Cell = YARD_M23_FORMS[this.m23Form];
    const m23Center = this.digRegistry.cellCenter(m23Cell.col, m23Cell.row);

    this.targets.register({
      target_id: M23FR_TARGET_ID,
      x: m23Center.x,
      y: m23Center.y,
      detection_radius: M23FR_DETECTION_RADIUS,
      form_id: this.m23Form,
      zone_id: 'm23_plot',
      active: m23FieldRecoveryWindowOpen(),
      recovered: m23FieldRecoveryState.completed,
    });

    const m26Center = this.digRegistry.cellCenter(
      YARD_M26_CONTROL_CELL.col,
      YARD_M26_CONTROL_CELL.row,
    );

    this.targets.register({
      target_id: M26DS_CONTROL_TARGET_ID,
      x: m26Center.x,
      y: m26Center.y,
      detection_radius: M26DS_CONTROL_DETECTION_RADIUS,
      form_id: M26DS_CONTROL_FORM,
      zone_id: 'm26_control',
      active: m26DepletedSearchPhase() === 'control',
      recovered: m26DepletedSearchState.control_completed,
    });

    this.digRegistry.registerZone({
      zone_id: 'm23_plot',
      ...M23_PLOT_ZONE,
      enabled: m23FieldRecoveryWindowOpen(),
    });
    this.digRegistry.registerZone({
      zone_id: 'm26_control',
      ...M26_CONTROL_ZONE,
      enabled: m26DepletedSearchPhase() === 'control',
    });
    this.digRegistry.registerZone({
      zone_id: 'm26_depleted',
      ...M26_DEPLETED_ZONE,
      enabled: m26DepletedSearchPhase() === 'futile',
    });
    // The fenced plot is verified empty BY CONSTRUCTION: no target and
    // no buried object is ever registered inside it.

    if (!m23FieldRecoveryState.completed) {
      this.digRegistry.registerBuried({
        object_id: 'm23fr_object',
        item_id: 'relay_coupling',
        col: m23Cell.col,
        row: m23Cell.row,
        zone_id: 'm23_plot',
      });
    }

    if (!m26DepletedSearchState.control_completed) {
      this.digRegistry.registerBuried({
        object_id: 'm26ds_control_object',
        item_id: 'core_sample',
        col: YARD_M26_CONTROL_CELL.col,
        row: YARD_M26_CONTROL_CELL.row,
        zone_id: 'm26_control',
      });
    }

    // ——— Controllers.
    this.scanController = new ScanController({
      scene: this,
      registry: this.targets,
      getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
      onResolved: (record) => this.onScanResolved(record),
      showFeedback: (message) => this.showFeedbackMessage(message),
    });

    if (m26DepletedSearchPhase() === 'control') {
      this.scanController.setContext(M26DS_CONTROL_SCAN_CONTEXT);
    } else if (m23FieldRecoveryWindowOpen()) {
      this.scanController.setContext(M23FR_SCAN_CONTEXT);
    }

    this.digController = new DigController({
      scene: this,
      registry: this.digRegistry,
      caches: this.caches,
      getProbePosition: () => ({
        x: this.player.selector.x + 8,
        y: this.player.selector.y + 8,
      }),
      onResolved: (record) => this.onDigResolved(record),
      onRefused: (refusal) => this.onDigRefused(refusal),
      onCellDug: (col, row) => this.renderDugCell(col, row),
      showFeedback: (message) => this.showFeedbackMessage(message),
    });
    this.magnet = new MagnetWinchController({
      scene: this,
      rig: YARD_SITES.magnetRig,
      tray: YARD_SITES.magnetTray,
      caches: this.caches,
      drawOutcome: () => drawMagnetPull(),
      onCycleResolved: (record) => this.onMagnetCycleResolved(record),
      showFeedback: (message) => this.showFeedbackMessage(message),
    });

    if (magnetDeckDepleted()) {
      this.showDepletedBanner();
    }

    // ——— Work stations (beacon order follows the counterbalanced
    // job queue; acceptance happens at Noor, never here).
    const queue = yardJobQueue();
    const orderOf = (job: YardJobId): number => {
      const index = queue.indexOf(job);

      return index >= 0 ? index + 1 : 90;
    };

    this.yardStation({
      id: 'recovery_plot',
      label: 'East Recovery Plot',
      texture: 'proc-sector-post',
      at: PLOT_STAKE_POSITION,
      order: orderOf('m23'),
      isDone: () => m23FieldRecoveryState.exit_status !== null,
      onUse: () => {
        if (m23FieldRecoveryWindowOpen()) {
          this.showFeedbackMessage(
            'Scan (C) inside the staked plot to localise the coupling, then dig (D) the facing cell.',
          );
        } else if (m23FieldRecoveryState.exit_status !== null) {
          this.showFeedbackMessage(
            'The recovery exercise is closed for this shift.',
          );
        } else {
          this.showFeedbackMessage('Take the work order from Noor first.');
        }
      },
    });

    this.yardStation({
      id: 'relay_housing',
      label: 'Relay Housing',
      texture: 'proc-housing-frozen',
      at: YARD_SITES.relayHousing,
      order: orderOf('m22'),
      isDone: () => yardM22Seated(),
      onUse: () => this.onHousingUsed(),
    });

    this.yardStation({
      id: 'yard_pump',
      label: 'Yard Coolant Pump — Prime Control',
      texture: 'proc-rig-intake',
      at: YARD_SITES.pumpPrime,
      order: orderOf('m25'),
      isDone: () => yardM25Reset(),
      onUse: () => this.onPumpPrimeUsed(),
    });

    this.yardStation({
      id: 'pump_breaker',
      label: 'Interlock Breaker',
      texture: 'proc-panel-warning',
      at: YARD_SITES.pumpBreaker,
      order: 91,
      register: false,
      isDone: () => yardM25Reset(),
      onUse: () => this.onPumpBreakerUsed(),
    });

    // Rig readout: an E-station for status + explicit acknowledgement;
    // the recovery cycle itself is F, embodied.
    this.addStation({
      interactionKey: 'pilotRigReadout',
      label: 'Magnet Recovery Rig',
      texture: 'proc-rig-recycler',
      x: YARD_SITES.magnetRig.x,
      y: YARD_SITES.magnetRig.y,
      onPromptOpened: () => {
        this.logScenarioEvent('pilotRigReadout', 'pilot_station_opened', {
          metadata: {
            station_id: 'magnet_rig',
            zone: this.zoneKey,
            deck_position: magnetDeckState.position,
            depleted: magnetDeckDepleted(),
          },
        });

        return true;
      },
    });
    registerPilotStation({
      id: 'magnet_rig',
      zone: 'exterior_recovery_yard',
      x: YARD_SITES.magnetRig.x,
      y: YARD_SITES.magnetRig.y,
      label: 'Magnet Recovery Rig',
      stages: ['exterior_work'],
      isDone: () =>
        m24MagnetUtilityState.exit_status !== null ||
        m24MagnetUtilityState.depletion_signal_acknowledged,
      order: orderOf('m24'),
    });

    this.addStation({
      interactionKey: 'pilotVerificationPost',
      label: 'Verification Post',
      texture: 'proc-reclamation-post',
      x: YARD_SITES.verificationPost.x,
      y: YARD_SITES.verificationPost.y,
      onPromptOpened: () => {
        this.logScenarioEvent('pilotVerificationPost', 'pilot_station_opened', {
          metadata: {
            station_id: 'verification_post',
            zone: this.zoneKey,
            m26_phase: m26DepletedSearchPhase(),
          },
        });

        // In the futile phase the prompt body IS the certificate, so
        // opening the prompt genuinely displays the futility statement.
        if (m26DepletedSearchPhase() === 'futile') {
          markM26DepletedSearchFutilityShown(Date.now());
        }

        return true;
      },
    });
    registerPilotStation({
      id: 'verification_post',
      zone: 'exterior_recovery_yard',
      x: YARD_SITES.verificationPost.x,
      y: YARD_SITES.verificationPost.y,
      label: 'Verification Post',
      stages: ['exterior_work'],
      isDone: () =>
        m26DepletedSearchState.exit_status !== null ||
        m26DepletedSearchState.futility_signal_acknowledged,
      order: orderOf('m26'),
    });

    this.yardStation({
      id: 'supply_crate',
      label: 'Yard Supply Crate',
      texture: 'proc-crate-supply',
      at: YARD_SITES.supplyCrate,
      order: 92,
      register: false,
      isDone: () => false,
      onUse: () => this.onSupplyCrateUsed(),
    });

    this.yardStation({
      id: 'sorting_bench',
      label: 'Sorting Bench',
      texture: 'proc-bench-prep',
      at: SORTING_BENCH_POSITION,
      order: 93,
      register: false,
      isDone: () => false,
      onUse: () => this.onSortingBenchUsed(),
    });

    // ——— Tool issue: Noor grants at the briefing; re-entry after the
    // briefing re-checks so a dropped tool can never soft-lock work.
    if (pilotStage() !== 'arrival' && pilotStage() !== 'meet_vale') {
      this.ensureFieldTools();
    }

    // ——— C/D/F bindings (the shared field-action key language).
    this.actionController = new FieldActionController(this, () =>
      this.physicalInputEligible(),
    );
    this.actionController.setBindings([
      {
        key: 'C',
        label: 'Scan',
        getTarget: () =>
          this.scanController.isCoolingDown()
            ? null
            : { x: this.player.x, y: this.player.y },
        perform: () => this.scanController.performScan(),
        onIneligiblePress: () => this.scanController.showCooldownFeedback(),
      },
      {
        key: 'D',
        label: 'Dig',
        getTarget: () => this.digController.getDigTarget(),
        perform: (target) => this.digController.performDig(target),
        onIneligiblePress: () => this.digController.handleIneligiblePress(),
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

    // ——— Window bookkeeping across pause and shutdown.
    this.events.on(Phaser.Scenes.Events.PAUSE, () => {
      noteM23FieldRecoveryInterruption();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // Departure first (ambient M22/M25 record the exit, then keep
      // their windows OPEN — returning and recovering stays valid);
      // console-style windows (M23/M24/M26) close per the crosswalk.
      noteYardDeparture(Date.now());
      this.closeOpenWindowsWithValidity('scene_exit');

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__fieldActionsProbe = null;
        window.__yardJobsProbe = null;
      }
    });

    // ——— Dressing.
    this.addDecor(
      YARD_SITES.relayMast.x,
      YARD_SITES.relayMast.y + 20,
      'proc-antenna-damaged',
    );
    this.signage(12 * TILE, 4.3 * TILE, 'RELAY MAST 04');
    this.signage(19.5 * TILE, 5.3 * TILE, 'EAST RECOVERY PLOT');
    this.signage(3 * TILE, 2.6 * TILE, 'CONTROL PLOT');
    this.signage(3 * TILE, 9.3 * TILE, 'RECLAIMED SECTOR — CERTIFIED EMPTY');
    this.signage(21 * TILE, 1.5 * TILE, 'METAL RECOVERY YARD');
    this.signage(12 * TILE, 17.5 * TILE, '▼  AIRLOCK — LABORATORY');
    this.signage(19 * TILE, 12.8 * TILE, 'SUPPLY CRATE');

    for (const [x, y] of [
      // Control plot stakes.
      [2 * TILE, 2.9 * TILE],
      [4.5 * TILE, 2.9 * TILE],
      [2 * TILE, 5.6 * TILE],
      [4.5 * TILE, 5.6 * TILE],
      // Reclaimed (verified-empty) plot stakes.
      [2 * TILE, 9.9 * TILE],
      [4.5 * TILE, 9.9 * TILE],
      [2 * TILE, 12.6 * TILE],
      [4.5 * TILE, 12.6 * TILE],
      // East recovery plot stakes.
      [16 * TILE, 5.9 * TILE],
      [22.5 * TILE, 5.9 * TILE],
      [16 * TILE, 11.6 * TILE],
      [22.5 * TILE, 11.6 * TILE],
    ] as const) {
      this.addDecor(x, y, 'proc-sector-post');
    }

    this.addDecor(6 * TILE, 6.6 * TILE, 'proc-ground-disturbed');
    this.addDecor(10 * TILE, 7 * TILE, 'proc-footprints');
    this.addDecor(12.5 * TILE, 10 * TILE, 'proc-footprints');
    this.addDecor(8 * TILE, 15.6 * TILE, 'proc-wall-pipes');

    this.redrawPlotOverlay();
    snowfall(this, { width: 800, height: 608, seed: 0x5eed4003, count: 26 });

    this.logScenarioEvent('pilotRoute', 'pilot_yard_entered', {
      metadata: {
        zone_entry_count: yardZoneEntryCount() + 1,
        m23_form: this.m23Form,
        magnet_deck_form: this.deckForm,
      },
    });
    logSecondaryFieldAction('lab_entered', {
      m23_form: this.m23Form,
      magnet_deck_form: this.deckForm,
      host: 'exterior_recovery_yard',
    });
  }

  // ————————————————————————————————— stations ——

  private yardStation(spec: {
    id: string;
    label: string;
    texture: string;
    at: { x: number; y: number };
    order: number;
    isDone: () => boolean;
    onUse: () => void;
    register?: boolean;
  }) {
    this.addStation({
      interactionKey: 'pilotStation',
      label: spec.label,
      texture: spec.texture,
      x: spec.at.x,
      y: spec.at.y,
      onPromptOpened: () => {
        this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
          metadata: { station_id: spec.id, zone: this.zoneKey },
        });
        spec.onUse();

        return false;
      },
    });

    if (spec.register !== false) {
      registerPilotStation({
        id: spec.id,
        zone: 'exterior_recovery_yard',
        x: spec.at.x,
        y: spec.at.y,
        label: spec.label,
        stages: ['exterior_work'],
        isDone: spec.isDone,
        order: spec.order,
      });
    }
  }

  /** M22: seating attempts at the relay housing. */
  private onHousingUsed(): void {
    if (!yardM22Attempted()) {
      markOpportunityEntered(YARD_M22_OPPORTUNITY_ID);
    }

    const result = yardM22SeatAttempt(Date.now());

    switch (result.kind) {
      case 'setback':
        this.showFeedbackMessage(result.explanation);
        break;
      case 'need_seal':
        this.showFeedbackMessage(
          'The cracked seal has to come out — collect the fresh seal from the yard supply crate (east side), then seat it here.',
        );
        break;
      case 'seated':
        markOpportunityCompleted(YARD_M22_OPPORTUNITY_ID);
        this.showFeedbackMessage(
          'Fresh seal seated — the relay housing is recovered and holding.',
        );
        break;
      case 'already_seated':
        this.showFeedbackMessage('The housing is sealed and holding.');
        break;
    }

    refreshValidityProbe();
    refreshPilotCoverageProbe();
  }

  private onSupplyCrateUsed(): void {
    if (yardM22WindowOpen() && !yardM22SealFetched()) {
      yardM22FetchSeal(Date.now());
      this.showFeedbackMessage(
        'Fresh seal collected — back to the relay housing to seat it.',
      );

      return;
    }

    if (yardM22SealFetched() && !yardM22Seated()) {
      this.showFeedbackMessage(
        'You already have the fresh seal — seat it at the relay housing.',
      );

      return;
    }

    this.showFeedbackMessage('Spare parts crate — nothing you need right now.');
  }

  /** M25: the prime control (each press is one prime). */
  private onPumpPrimeUsed(): void {
    if (!yardM25Attempted()) {
      markOpportunityEntered(YARD_M25_OPPORTUNITY_ID);
    }

    const result = yardM25Prime(Date.now());

    if (result.kind === 'cycle') {
      this.showFeedbackMessage(result.readout);
    } else if (result.kind === 'locked') {
      this.showFeedbackMessage(M25_LOCK_STATEMENT);
    } else {
      this.showFeedbackMessage(
        'The pump is running smoothly — nothing to prime.',
      );
    }

    refreshValidityProbe();
    refreshPilotCoverageProbe();
  }

  private onPumpBreakerUsed(): void {
    if (yardM25Breaker(Date.now())) {
      markOpportunityCompleted(YARD_M25_OPPORTUNITY_ID);
      this.showFeedbackMessage(
        'Interlock breaker reset — the pump spins up and holds pressure.',
      );
      refreshValidityProbe();
      refreshPilotCoverageProbe();

      return;
    }

    this.showFeedbackMessage(
      yardM25Reset()
        ? 'The pump is running.'
        : 'Interlock breaker panel — nothing to reset right now.',
    );
  }

  private onSortingBenchUsed(): void {
    const started = performWorldAction({
      scene: this,
      x: SORTING_BENCH_POSITION.x,
      y: SORTING_BENCH_POSITION.y,
      label: 'Sorting components…',
      durationMs: 1200,
      cancellable: true,
      onComplete: () => {
        const now = Date.now();

        markM24MagnetUtilityAlternativeActivity(now);
        markM26DepletedSearchAlternativeActivity(now);
        this.showFeedbackMessage(
          'Component stock sorted — the bench log is up to date.',
        );
      },
    });

    if (!started) {
      this.showFeedbackMessage('The bench is busy — one moment.');
    }
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

  private onScanResolved(record: ScanRecord): void {
    logSecondaryFieldAction('scan', { ...record });

    const now = Date.now();

    if (m23FieldRecoveryWindowOpen()) {
      noteM23FieldRecoveryScan(record, now);
    } else if (m26DepletedSearchWindowOpen()) {
      noteM26DepletedSearchScan(record, now, this.m26PlotOfPlayer());
    }
  }

  private m26PlotOfPlayer(): 'control' | 'depleted' | 'outside' {
    const col = Math.floor(this.player.x / TILE);
    const row = Math.floor(this.player.y / TILE);

    if (this.insideZone(M26_CONTROL_ZONE, col, row)) {
      return 'control';
    }

    if (this.insideZone(M26_DEPLETED_ZONE, col, row)) {
      return 'depleted';
    }

    return 'outside';
  }

  private insideZone(zone: ZoneRect, col: number, row: number): boolean {
    return (
      col >= zone.minCol &&
      col <= zone.maxCol &&
      row >= zone.minRow &&
      row <= zone.maxRow
    );
  }

  private onDigResolved(record: DigRecord): void {
    logSecondaryFieldAction('dig', { ...record });

    const now = Date.now();

    if (record.outcome === 'cached') {
      logSecondaryFieldAction('cache_created', {
        item_id: record.item_id,
        source: 'dig',
      });
    }

    if (m23FieldRecoveryWindowOpen()) {
      noteM23FieldRecoveryDig(record, now);
    } else if (m26DepletedSearchWindowOpen()) {
      noteM26DepletedSearchDig(
        record,
        now,
        record.zone_id === 'm26_control'
          ? 'control'
          : record.zone_id === 'm26_depleted'
            ? 'depleted'
            : 'outside',
      );
    }

    if (record.outcome === 'recovered' || record.outcome === 'cached') {
      if (record.object_id === 'm23fr_object') {
        this.targets.markRecovered(M23FR_TARGET_ID);
        markM23FieldRecoveryCompleted(now);
        markOpportunityCompleted(M23FR_OPPORTUNITY_ID);
        closeM23FieldRecoveryWindow(now, 'reset');
        this.scanController.setContext('free');
        this.digRegistry.setZoneEnabled('m23_plot', false);
        this.redrawPlotOverlay();
        refreshValidityProbe();
        refreshPilotCoverageProbe();
        this.showFeedbackMessage(
          'Relay coupling recovered — report back to Noor.',
        );
      }

      if (record.object_id === 'm26ds_control_object') {
        this.targets.markRecovered(M26DS_CONTROL_TARGET_ID);
        markM26DepletedSearchControlCompleted(now);
        this.digRegistry.setZoneEnabled('m26_control', false);
        this.digRegistry.setZoneEnabled('m26_depleted', true);
        this.scanController.setContext(M26DS_FUTILE_SCAN_CONTEXT);
        this.redrawPlotOverlay();
        this.showFeedbackMessage(
          'Control sample recovered — report to the Verification Post between the plots.',
        );
      }
    }
  }

  private onDigRefused(refusal: DigRefusal): void {
    logSecondaryFieldAction('refusal', {
      action: 'dig',
      reason: refusal.reason,
      col: refusal.col,
      row: refusal.row,
    });

    if (m23FieldRecoveryWindowOpen()) {
      noteM23FieldRecoveryInvalidAction(Date.now());
    }
  }

  private onMagnetCycleResolved(record: MagnetCycleRecord): void {
    logSecondaryFieldAction('magnet_cycle', { ...record });

    const now = Date.now();

    if (record.item_delivery === 'cache') {
      logSecondaryFieldAction('cache_created', {
        item_id: record.item_id,
        source: 'magnet',
      });
    }

    if (record.depleted_now) {
      this.showDepletedBanner();
      this.showFeedbackMessage(M24MU_DEPLETION_STATEMENT);

      if (m24MagnetUtilityWindowOpen()) {
        markM24MagnetUtilityDepletionShown(now);
      }
    }

    if (record.post_depletion) {
      this.showFeedbackMessage(
        'Nothing — the catchment is depleted. No recoverable material remains.',
      );
    }

    if (m24MagnetUtilityWindowOpen()) {
      noteM24MagnetUtilityCycle(record, now);
    }

    refreshPilotCoverageProbe();
  }

  // ————————————————————————————————— rig eligibility ——

  private playerInsideRigArea(): boolean {
    return (
      this.player.x >= RIG_OPERATING_AREA.minX &&
      this.player.x <= RIG_OPERATING_AREA.maxX &&
      this.player.y >= RIG_OPERATING_AREA.minY &&
      this.player.y <= RIG_OPERATING_AREA.maxY
    );
  }

  private rigTarget(): { x: number; y: number } | null {
    if (!this.playerInsideRigArea() || !this.magnet.canStart()) {
      return null;
    }

    // Post-depletion cycles stay available ONLY inside the M24 window
    // (outside it the rig refuses with the depleted notice).
    if (magnetDeckDepleted() && !m24MagnetUtilityWindowOpen()) {
      return null;
    }

    return { x: YARD_SITES.magnetRig.x, y: YARD_SITES.magnetRig.y };
  }

  private onRigIneligiblePress(): void {
    if (!this.playerInsideRigArea()) {
      return;
    }

    if (magnetDeckDepleted() && !m24MagnetUtilityWindowOpen()) {
      this.showFeedbackMessage(
        'The catchment is depleted — no recoverable material remains.',
      );

      return;
    }

    if (!this.magnet.canStart()) {
      this.magnet.showCooldownFeedback();
    }
  }

  // ————————————————————————————————— window closure ——

  /**
   * Shared close path (job hand-over / scene exit). Register semantics
   * (crosswalk REV-BLOCK-1): M24 counts as a completed observation only
   * when the depletion statement was DISPLAYED AND ACKNOWLEDGED (stop
   * and continue are both valid outcomes); closed with the signal never
   * displayed → missing (no_opportunity). M26 likewise requires the
   * recovered control AND the displayed-and-acknowledged certificate.
   * Displayed-but-unacknowledged stays pending (censored at Final
   * Core). Never a low value, never a performance check.
   */
  private closeOpenWindowsWithValidity(
    reason: 'next_job' | 'scene_exit',
  ): void {
    const now = Date.now();

    if (m23FieldRecoveryWindowOpen()) {
      closeM23FieldRecoveryWindow(now, reason);
      this.targets.setActive(M23FR_TARGET_ID, false);
      this.digRegistry.setZoneEnabled('m23_plot', false);
    }

    if (m24MagnetUtilityWindowOpen()) {
      const state = m24MagnetUtilityState;

      if (
        state.depletion_signal_displayed_at !== null &&
        state.depletion_signal_acknowledged
      ) {
        markOpportunityCompleted(M24MU_OPPORTUNITY_ID);
      } else if (state.depletion_signal_displayed_at === null) {
        markOpportunityInvalid(
          M24MU_OPPORTUNITY_ID,
          'no_opportunity',
          'depletion_signal_never_displayed',
        );
      }

      closeM24MagnetUtilityWindow(now, reason);
    }

    if (m26DepletedSearchWindowOpen()) {
      const state = m26DepletedSearchState;

      if (
        state.control_completed &&
        state.futility_signal_displayed_at !== null &&
        state.futility_signal_acknowledged
      ) {
        markOpportunityCompleted(M26DS_OPPORTUNITY_ID);
      } else if (state.futility_signal_displayed_at === null) {
        markOpportunityInvalid(
          M26DS_OPPORTUNITY_ID,
          'no_opportunity',
          state.control_completed
            ? 'futility_certificate_never_displayed'
            : 'control_never_recovered',
        );
      }

      closeM26DepletedSearchWindow(now, reason);
      this.targets.setActive(M26DS_CONTROL_TARGET_ID, false);
      this.digRegistry.setZoneEnabled('m26_control', false);
      this.digRegistry.setZoneEnabled('m26_depleted', false);
    }

    this.scanController.setContext('free');
    this.redrawPlotOverlay();
    refreshValidityProbe();
    refreshPilotCoverageProbe();
  }

  // ————————————————————————————————— Noor + jobs ——

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'pilotNoor') {
      return this.noorBeat().body;
    }

    if (
      interactionKey === 'pilotVerificationPost' &&
      m26DepletedSearchPhase() === 'futile'
    ) {
      return M26DS_FUTILITY_STATEMENT;
    }

    return undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    switch (interactionKey) {
      case 'pilotNoor':
        return this.npcBeatOptions('pilotNoor', this.noorBeat());
      case 'pilotRigReadout':
        return this.rigReadoutOptions();
      case 'pilotVerificationPost':
        return this.verificationPostOptions();
      default:
        return [];
    }
  }

  private rigReadoutOptions(): PromptOption[] {
    const options: PromptOption[] = [
      {
        label: 'Check the catchment readout',
        feedback: '',
        getEventTypes: () => ['pilot_rig_status'],
        onSelected: () => {
          if (magnetDeckDepleted()) {
            this.showFeedbackMessage(M24MU_DEPLETION_STATEMENT);

            if (m24MagnetUtilityWindowOpen()) {
              markM24MagnetUtilityDepletionShown(Date.now());
            }

            return;
          }

          this.showFeedbackMessage(
            'Rig operational. Stand on the marked operating pad and start a cycle with F.',
          );
        },
      },
    ];

    if (
      m24MagnetUtilityWindowOpen() &&
      m24MagnetUtilityState.depletion_signal_displayed_at !== null &&
      !m24MagnetUtilityState.depletion_signal_acknowledged
    ) {
      options.push({
        label: 'Acknowledge the depletion notice',
        feedback: '',
        getEventTypes: () => ['pilot_rig_status'],
        onSelected: () => {
          markM24MagnetUtilityDepletionAcknowledged(Date.now());
          this.showFeedbackMessage(
            'Depletion notice acknowledged. The rig and the sorting bench both remain available.',
          );
          refreshPilotCoverageProbe();
        },
      });
    }

    options.push({
      label: 'Step away',
      feedback: '',
      getEventTypes: () => [],
    });

    return options;
  }

  private verificationPostOptions(): PromptOption[] {
    const phase = m26DepletedSearchPhase();

    if (phase !== 'futile') {
      return [
        {
          label: 'Close',
          feedback:
            phase === 'control'
              ? 'Verification pending — recover the control sample from the staked control plot first.'
              : 'No verification job is active right now.',
          getEventTypes: () => [],
        },
      ];
    }

    const options: PromptOption[] = [
      {
        label: 'Review the sector verification certificate',
        feedback: '',
        getEventTypes: () => ['pilot_certificate_viewed'],
        onSelected: () => {
          this.showFeedbackMessage(M26DS_FUTILITY_STATEMENT);
        },
      },
    ];

    if (!m26DepletedSearchState.futility_signal_acknowledged) {
      options.push({
        label: 'Acknowledge the verification',
        feedback: '',
        getEventTypes: () => ['pilot_certificate_viewed'],
        onSelected: () => {
          markM26DepletedSearchFutilityAcknowledged(Date.now());
          this.showFeedbackMessage(
            'Verification acknowledged. The fenced plot stays open; the sorting bench remains available.',
          );
          refreshPilotCoverageProbe();
        },
      });
    }

    options.push({
      label: 'Step away',
      feedback: '',
      getEventTypes: () => [],
    });

    return options;
  }

  private noorBeat(): PilotNpcBeat {
    switch (pilotStage()) {
      case 'exterior_briefing':
        return {
          body:
            'Noor: Storm took the mast and buried half the yard. I have jobs for you — take them in the order I call them.\n' +
            'Scanner (C) and spade (D) are yours; the rig works with F. Come back to me between jobs.',
          options: [
            {
              label: 'Ready.',
              tag: 'yard_brief_ack',
              onSelected: () => {
                advancePilotStage('exterior_work', Date.now());
                this.ensureFieldTools();
              },
            },
          ],
        };
      case 'exterior_work':
        return this.noorJobBeat();
      case 'report_kai':
      case 'report_vale':
      case 'deck_review':
      case 'complete':
        return {
          body: 'Noor: Yard work is logged. Kai and Vale are inside.',
          options: [{ label: 'Understood.', tag: 'redirect_inside' }],
        };
      default:
        return {
          body: 'Noor: Kai sends people out here once the laboratory work is through.',
          options: [{ label: 'Understood.', tag: 'redirect_lab' }],
        };
    }
  }

  private noorJobBeat(): PilotNpcBeat {
    const job = currentYardJob();
    const doneOption: PilotNpcBeat['options'][number] = {
      label: 'I am done outside.',
      tag: 'yard_done',
      feedback:
        'Noor: Logged. Back through the airlock — Kai wants your report.',
      onSelected: () => {
        this.closeOpenWindowsWithValidity('next_job');
        advancePilotStage('report_kai', Date.now());
      },
    };

    const jobBeat = (
      body: string,
      tag: string,
      accepted: YardJobId,
      acceptLabel = 'On it.',
    ): PilotNpcBeat => ({
      body,
      options: [
        {
          label: acceptLabel,
          tag,
          onSelected: () => this.acceptJob(accepted),
        },
        doneOption,
      ],
    });

    switch (job) {
      case 'm23':
        return jobBeat(
          'Noor: First job — a relay coupling is buried somewhere in the staked east plot. Scan (C) to localise it, dig (D) the facing cell to recover it. It takes patience; the stakes mark the plot.',
          'job_m23',
          'm23',
        );
      case 'm22':
        return jobBeat(
          'Noor: The relay housing on the south-west side lost its seal in the storm. Seat a replacement seal at the housing.',
          'job_m22',
          'm22',
        );
      case 'm25':
        return jobBeat(
          'Noor: The yard coolant pump needs priming — the prime control is at the pump on the north side.',
          'job_m25',
          'm25',
        );
      case 'm24':
        return jobBeat(
          'Noor: Salvage next — run the magnet rig in the Metal Recovery Yard, north-east. The rig readout (E at the rig) shows the catchment status.',
          'job_m24',
          'm24',
        );
      case 'checkin':
        return jobBeat(
          'Noor: Good pace. Catch your breath — tell me when you are ready for the last job.',
          'job_checkin',
          'checkin',
          'Ready for the next.',
        );
      case 'm26':
        return jobBeat(
          'Noor: Last one — sector verification. Recover the control sample from the staked control plot in the north-west, then report to the Verification Post between the plots.',
          'job_m26',
          'm26',
        );
      case 'done':
      default:
        return {
          body: 'Noor: That is everything I had for out here. Tell me when you are finished.',
          options: [
            doneOption,
            {
              label: 'Still working.',
              tag: 'yard_continue',
              feedback: 'Noor: Go on.',
            },
          ],
        };
    }
  }

  /**
   * Noor called the next job. Acceptance is a brief: it closes the
   * previous console-style window (serialisation — one open window at a
   * time) and opens the accepted one. Ambient M22/M25 open at their own
   * stations, never here.
   */
  private acceptJob(job: YardJobId): void {
    const now = Date.now();

    this.closeOpenWindowsWithValidity('next_job');
    advanceYardJob();

    switch (job) {
      case 'm23':
        openM23FieldRecoveryWindow(now, this.m23Form);
        markOpportunityEntered(M23FR_OPPORTUNITY_ID);
        this.targets.setActive(
          M23FR_TARGET_ID,
          !m23FieldRecoveryState.completed,
        );
        this.digRegistry.setZoneEnabled('m23_plot', true);
        this.scanController.setContext(M23FR_SCAN_CONTEXT);
        break;
      case 'm24': {
        const deckPositionAtOpen = magnetDeckState.position;

        openM24MagnetUtilityWindow(now, this.deckForm, deckPositionAtOpen);
        markOpportunityEntered(M24MU_OPPORTUNITY_ID);

        if (deckPositionAtOpen > 0) {
          recordPriorExposure(
            M24MU_OPPORTUNITY_ID,
            `deck_position_at_open=${deckPositionAtOpen}`,
          );
        }

        if (m26DepletedSearchState.futility_signal_displayed_at !== null) {
          recordPriorExposure(
            M24MU_OPPORTUNITY_ID,
            'proto_m26_futility_signal_seen',
          );
        }

        if (magnetDeckDepleted()) {
          // The no-benefit statement must be DISPLAYED and recorded
          // inside the window even when depletion happened earlier.
          this.showDepletedBanner();
          this.showFeedbackMessage(M24MU_DEPLETION_STATEMENT);
          markM24MagnetUtilityDepletionShown(now);
        }

        break;
      }
      case 'm26':
        openM26DepletedSearchWindow(now);
        markOpportunityEntered(M26DS_OPPORTUNITY_ID);

        if (m24MagnetUtilityState.depletion_signal_displayed_at !== null) {
          recordPriorExposure(
            M26DS_OPPORTUNITY_ID,
            'proto_m24_depletion_signal_seen',
          );
        }

        this.targets.setActive(
          M26DS_CONTROL_TARGET_ID,
          !m26DepletedSearchState.control_completed,
        );
        this.digRegistry.setZoneEnabled('m26_control', true);
        this.scanController.setContext(M26DS_CONTROL_SCAN_CONTEXT);
        break;
      default:
        // m22 / m25 / checkin: ambient or neutral — no window action.
        break;
    }

    this.redrawPlotOverlay();
    refreshValidityProbe();
    refreshPilotCoverageProbe();
  }

  // ————————————————————————————————— presentation ——

  private signage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, { color: '#9fb2c1', font: '11px monospace' })
      .setOrigin(0.5)
      .setDepth(2);
  }

  private renderDugCell(col: number, row: number): void {
    this.add
      .rectangle(col * TILE + 16, row * TILE + 16, 26, 26, 0x1a1410, 0.55)
      .setDepth(1);
  }

  private redrawPlotOverlay(): void {
    this.plotOverlay?.destroy();

    const graphics = this.add.graphics().setDepth(1);
    const drawZone = (zone: ZoneRect, active: boolean, color: number) => {
      graphics.lineStyle(active ? 2 : 1, color, active ? 0.9 : 0.35);
      graphics.strokeRect(
        zone.minCol * TILE,
        zone.minRow * TILE,
        (zone.maxCol - zone.minCol + 1) * TILE,
        (zone.maxRow - zone.minRow + 1) * TILE,
      );
    };

    drawZone(M23_PLOT_ZONE, m23FieldRecoveryWindowOpen(), 0x5fd3c4);
    drawZone(
      M26_CONTROL_ZONE,
      m26DepletedSearchPhase() === 'control',
      0x5fd3c4,
    );
    drawZone(
      M26_DEPLETED_ZONE,
      m26DepletedSearchPhase() === 'futile',
      0xd9a066,
    );
    this.plotOverlay = graphics;
  }

  private showDepletedBanner(): void {
    if (this.depletedBanner !== undefined) {
      return;
    }

    this.depletedBanner = this.add
      .text(
        YARD_SITES.magnetRig.x,
        YARD_SITES.magnetRig.y - 58,
        'CATCHMENT DEPLETED',
        {
          backgroundColor: '#3a1f1f',
          color: '#ffb4a8',
          font: '12px monospace',
          padding: { x: 6, y: 3 },
        },
      )
      .setOrigin(0.5)
      .setDepth(6);
  }

  // ————————————————————————————————— interaction plumbing ——

  /** SPACE/E with no station in range: field caches are collected here. */
  protected onEmptyInteract(): void {
    const result = this.caches.tryCollectNearest(this.player.x, this.player.y);

    if (result.result === 'none_in_reach') {
      return;
    }

    if (result.result === 'belt_full') {
      this.showFeedbackMessage(
        'Belt still full — free a slot, then collect the cache.',
      );

      return;
    }

    this.showFeedbackMessage('Cache collected.');
    logSecondaryFieldAction('cache_recovered', {
      cache_id: result.entry.cache_id,
      item_id: result.entry.item_id,
    });
  }

  protected onRoomUpdate(): void {
    super.onRoomUpdate();
    this.actionController?.update();

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
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
          m23_open: m23FieldRecoveryWindowOpen(),
          m24_open: m24MagnetUtilityWindowOpen(),
          m26_phase: m26DepletedSearchPhase(),
        },
        caches: this.caches.serialize(),
      };
      window.__yardJobsProbe = {
        queue: yardJobQueue(),
        current_job: currentYardJob(),
        zone_entries: yardZoneEntryCount(),
        m22: yardM22Summary(),
        m25: yardM25Summary(),
      };
    }
  }
}
