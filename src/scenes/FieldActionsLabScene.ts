import Phaser from 'phaser';

import { key } from '../constants';
import type {
  DigRecord,
  DigRefusal,
  MagnetCycleRecord,
  ScanRecord,
} from '../fieldActions';
import type { M23FieldRecoveryForm } from '../fieldActions';
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
  M23FR_FORMS,
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
  M26DS_CONTROL_CELL,
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
import { isWorldActionActive, performWorldAction } from '../gameplay/actions';
import { FieldActionController } from '../gameplay/fieldActionKeys';
import {
  addInventoryItem,
  hasInventoryItem,
  isInventoryFull,
  removeInventoryItem,
} from '../gameplay/inventory';
import { wireInventoryOverlayKey } from '../inventory/ui/openOverlay';
import {
  assignCounterbalance,
  declareOpportunity,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityOffered,
  recordPriorExposure,
  refreshValidityProbe,
} from '../measurement/validity';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption } from '../world';
import { RoomScene } from '../world';
import type { RoomLayout } from '../world/StationMapBuilder';

/**
 * Field Actions Lab (field-actions foundation) — `?scene=field_actions_lab`.
 *
 * Developer proving ground for the reusable field-action subsystem
 * (src/fieldActions): position-dependent scanning (C), facing-cell
 * terrain digging (D) and the Metal Recovery Yard magnet rig (F),
 * plus the three PROVISIONAL measurement-window adapters (M23 field
 * recovery, M24 magnet utility, M26 depleted search) opened
 * independently from the range console. Never on the participant
 * route; direct-launch only (inventory-lab precedent).
 *
 * Measurement boundaries: generic action telemetry is
 * secondary_field_action_* (contextual only, never item evidence);
 * each opened window owns its own disjoint proto_* family. The range
 * console enforces at most ONE open window, so a physical action can
 * only ever notify one opportunity adapter.
 */

const TILE = 32;

/** Zone A — signal calibration range. */
const CAL_SOURCE = { x: 7.5 * TILE, y: 4.5 * TILE };
const CAL_RANGE_POSTS = [
  { x: 2 * TILE, y: 2 * TILE },
  { x: 11 * TILE, y: 2 * TILE },
  { x: 2 * TILE, y: 7.5 * TILE },
  { x: 11 * TILE, y: 7.5 * TILE },
];

/** Zone B — excavation field (open free-play dig zone). */
const OPEN_FIELD_ZONE = { minCol: 2, maxCol: 11, minRow: 10, maxRow: 15 };
const FIELD_ROCK_CELL = { col: 4, row: 12 };
const FIELD_SALVAGE_CELL = { col: 9, row: 14 };
// 130 px: the largest radius that cannot reach any M26 plot cell (the
// nearest plot corner is ~144 px away) — the verified-empty plots must
// never return a genuine signal from the free-play rock.
const FIELD_ROCK_DETECTION_RADIUS = 130;

/** M23 recovery plot (console-gated). */
const M23_PLOT_ZONE = { minCol: 13, maxCol: 18, minRow: 10, maxRow: 15 };

/** M26 plots (console-gated): matched control plot + verified-empty plot. */
const M26_CONTROL_ZONE = { minCol: 2, maxCol: 4, minRow: 17, maxRow: 21 };
const M26_DEPLETED_ZONE = { minCol: 7, maxCol: 10, minRow: 17, maxRow: 21 };

/** Zone C — Metal Recovery Yard (south-east block). */
const RIG_POSITION = { x: 16 * TILE, y: 18.5 * TILE };
const TRAY_POSITION = { x: 18 * TILE, y: 20 * TILE };
const RIG_OPERATING_AREA = {
  minX: 13.5 * TILE,
  maxX: 19.5 * TILE,
  minY: 18 * TILE,
  maxY: 22.5 * TILE,
};

/** Zone D/E — south work band. */
const SUPPLY_CRATE_POSITION = { x: 4 * TILE, y: 26 * TILE };
const RANGE_CONSOLE_POSITION = { x: 10 * TILE, y: 26 * TILE };
const MAINTENANCE_BENCH_POSITION = { x: 15 * TILE, y: 26 * TILE };
const VERIFICATION_POST_POSITION = { x: 5.5 * TILE, y: 16.5 * TILE };

const SPAWN = { x: 7 * TILE, y: 25.5 * TILE };

type LabZoneRect = {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
};

declare global {
  interface Window {
    /** DEV-only, read-only field-actions probe (never read back). */
    __fieldActionsProbe?: {
      scene: string;
      worldActionActive: boolean;
      scan: {
        cooling: boolean;
        context: string;
        last: ScanRecord | null;
      };
      dig: {
        last: DigRecord | null;
        /** The facing cell D would dig right now (null = ineligible). */
        target: { col: number; row: number } | null;
        /** Facing-probe centre (selector geometry, verification aid). */
        probe: { x: number; y: number };
        refusal: { col: number; row: number; reason: string | null };
      };
      magnet: {
        phase: string;
        markerInBand: boolean;
        deckForm: string | null;
        deckPosition: number;
        totalPulls: number;
        depleted: boolean;
      };
      windows: {
        m23_open: boolean;
        m24_open: boolean;
        m26_phase: string;
      };
      caches: { cache_id: string; item_id: string; x: number; y: number }[];
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__fieldActionsProbe = null;
}

export class FieldActionsLabScene extends RoomScene {
  protected readonly roomId = 'proto_field_actions_lab';
  protected readonly roomInteractionKey: InteractionKey = 'fieldLabArea';

  private actionController?: FieldActionController;
  private targets!: FieldTargetRegistry;
  private digRegistry!: DigSurfaceRegistry;
  private caches!: FieldCacheManager;
  private scanController!: ScanController;
  private digController!: DigController;
  private magnet!: MagnetWinchController;

  /** Zone-overlay graphics, redrawn when a plot's enabled state flips. */
  private zoneOverlay?: Phaser.GameObjects.Graphics;
  /** Persistent depleted-rig banner (created once, at depletion). */
  private depletedBanner?: Phaser.GameObjects.Text;
  private m23Form: M23FieldRecoveryForm = 'form_a';

  constructor() {
    super(key.scene.fieldActionsLab);
  }

  protected getLayout(): RoomLayout {
    // 25×30 exterior training ground, single-screen WIDTH (the room
    // convention every RoomScene UI element assumes: playable cols
    // 1-19, east cols 20-24 are wall mass under the right UI column —
    // CoolantYard viewport-filler precedent — and the camera scrolls
    // vertically only). Top-to-bottom: calibration range, excavation
    // field + staked recovery plot, verification plots + Metal
    // Recovery Yard, then the south work band. Plot boundaries are
    // marked with posts and ground tinting, not walls.
    return {
      theme: 'exterior',
      grid: [
        '#########################',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#...................#####',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    return SPAWN;
  }

  protected populateRoom(): void {
    // The fieldActions layer is runtime-import-free: install the real
    // log sink first so every subsequent emission reaches EventLogger.
    installFieldActionLogSink((payload) =>
      researchRuntime.logInteraction(payload),
    );
    setFieldActionTelemetryScene(this.scene.key);

    // ——— Counterbalanced forms (deterministic per session, recorded).
    const sessionId =
      researchRuntime.sessionState.getMetadata().game_session_id;

    this.m23Form = assignCounterbalance(sessionId, 'm23_field_recovery_form', [
      'form_a',
      'form_b',
    ] as const);

    const deckForm = ensureMagnetDeckForm(
      assignCounterbalance(sessionId, 'field_magnet_deck_form', [
        'A',
        'B',
      ] as const),
    );

    // ——— SA-13 opportunity declarations (idempotent; windows open
    // later). Register bookkeeping is scene-owned — the CoolantYard ↔
    // measurement-module division of responsibility.
    declareOpportunity({
      opportunity_id: M23FR_OPPORTUNITY_ID,
      owner: 'M23 (provisional, field-actions lab)',
      entry_state_version: M23FR_ENTRY_STATE_VERSION,
      form: this.m23Form,
    });
    declareOpportunity({
      opportunity_id: M24MU_OPPORTUNITY_ID,
      owner: 'M24 (provisional, field-actions lab)',
      entry_state_version: M24MU_ENTRY_STATE_VERSION,
      counterbalance: `deck_form_${deckForm}`,
    });
    declareOpportunity({
      opportunity_id: M26DS_OPPORTUNITY_ID,
      owner: 'M26 (provisional, field-actions lab)',
      entry_state_version: M26DS_ENTRY_STATE_VERSION,
      form: M26DS_CONTROL_FORM,
    });
    markOpportunityOffered(M23FR_OPPORTUNITY_ID);
    markOpportunityOffered(M24MU_OPPORTUNITY_ID);
    markOpportunityOffered(M26DS_OPPORTUNITY_ID);
    refreshValidityProbe();

    // ——— Field-action registries.
    this.targets = new FieldTargetRegistry();
    this.digRegistry = new DigSurfaceRegistry();
    this.caches = new FieldCacheManager(this);

    // Calibration source (zone A): fixed, never recoverable — pure
    // signal-gradient practice.
    this.targets.register({
      target_id: 'cal_source',
      x: CAL_SOURCE.x,
      y: CAL_SOURCE.y,
      detection_radius: 240,
      form_id: 'fixed',
      zone_id: 'calibration',
      active: true,
      recovered: false,
    });

    // Free-play buried space rock (zone B): scannable and recoverable.
    const rockCenter = this.digRegistry.cellCenter(
      FIELD_ROCK_CELL.col,
      FIELD_ROCK_CELL.row,
    );

    this.targets.register({
      target_id: 'field_rock',
      x: rockCenter.x,
      y: rockCenter.y,
      detection_radius: FIELD_ROCK_DETECTION_RADIUS,
      form_id: 'fixed',
      zone_id: 'open_field',
      active: true,
      recovered: false,
    });

    // M23 target: registered now (fixed by recorded form), ACTIVE only
    // while the M23 window is open.
    const m23Cell = M23FR_FORMS[this.m23Form];
    const m23Center = this.digRegistry.cellCenter(m23Cell.col, m23Cell.row);

    this.targets.register({
      target_id: M23FR_TARGET_ID,
      x: m23Center.x,
      y: m23Center.y,
      detection_radius: M23FR_DETECTION_RADIUS,
      form_id: this.m23Form,
      zone_id: 'm23_plot',
      active: false,
      recovered: false,
    });

    // M26 control target: fixed cell, active during the control phase.
    const m26Center = this.digRegistry.cellCenter(
      M26DS_CONTROL_CELL.col,
      M26DS_CONTROL_CELL.row,
    );

    this.targets.register({
      target_id: M26DS_CONTROL_TARGET_ID,
      x: m26Center.x,
      y: m26Center.y,
      detection_radius: M26DS_CONTROL_DETECTION_RADIUS,
      form_id: 'control_fixed',
      zone_id: 'm26_control',
      active: false,
      recovered: false,
    });
    // The M26 depleted plot is verified empty BY CONSTRUCTION: no
    // target and no buried object is ever registered inside it.

    // ——— Dig zones and buried objects.
    this.digRegistry.registerZone({
      zone_id: 'open_field',
      ...OPEN_FIELD_ZONE,
    });
    this.digRegistry.registerZone({
      zone_id: 'm23_plot',
      ...M23_PLOT_ZONE,
      enabled: false,
    });
    this.digRegistry.registerZone({
      zone_id: 'm26_control',
      ...M26_CONTROL_ZONE,
      enabled: false,
    });
    this.digRegistry.registerZone({
      zone_id: 'm26_depleted',
      ...M26_DEPLETED_ZONE,
      enabled: false,
    });
    this.digRegistry.registerBuried({
      object_id: 'field_rock_object',
      item_id: 'core_sample',
      col: FIELD_ROCK_CELL.col,
      row: FIELD_ROCK_CELL.row,
      zone_id: 'open_field',
    });
    this.digRegistry.registerBuried({
      object_id: 'field_salvage_object',
      item_id: 'scrap_plate',
      col: FIELD_SALVAGE_CELL.col,
      row: FIELD_SALVAGE_CELL.row,
      zone_id: 'open_field',
    });
    this.digRegistry.registerBuried({
      object_id: 'm23fr_object',
      item_id: 'relay_coupling',
      col: m23Cell.col,
      row: m23Cell.row,
      zone_id: 'm23_plot',
    });
    this.digRegistry.registerBuried({
      object_id: 'm26ds_control_object',
      item_id: 'core_sample',
      col: M26DS_CONTROL_CELL.col,
      row: M26DS_CONTROL_CELL.row,
      zone_id: 'm26_control',
    });

    // ——— Controllers.
    this.scanController = new ScanController({
      scene: this,
      registry: this.targets,
      getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
      onResolved: (record) => this.onScanResolved(record),
      showFeedback: (message) => this.showFeedbackMessage(message),
    });
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
      rig: RIG_POSITION,
      tray: TRAY_POSITION,
      caches: this.caches,
      drawOutcome: () => drawMagnetPull(),
      onCycleResolved: (record) => this.onMagnetCycleResolved(record),
      showFeedback: (message) => this.showFeedbackMessage(message),
    });

    // ——— World dressing.
    this.buildZoneDressing();
    this.redrawZoneOverlay();

    if (magnetDeckDepleted()) {
      this.showDepletedBanner();
    }

    // ——— Stations.
    this.addStation({
      interactionKey: 'fieldLabSupplyCrate',
      label: 'Supply Crate',
      texture: 'proc-crate-supply',
      x: SUPPLY_CRATE_POSITION.x,
      y: SUPPLY_CRATE_POSITION.y,
    });
    this.addStation({
      interactionKey: 'fieldLabRangeConsole',
      label: 'Range Control Console',
      texture: 'proc-console-scenario',
      x: RANGE_CONSOLE_POSITION.x,
      y: RANGE_CONSOLE_POSITION.y,
    });
    this.addStation({
      interactionKey: 'fieldLabMaintenanceBench',
      label: 'Maintenance Bench',
      texture: 'proc-bench-prep',
      x: MAINTENANCE_BENCH_POSITION.x,
      y: MAINTENANCE_BENCH_POSITION.y,
    });
    this.addStation({
      interactionKey: 'fieldLabRecoveryRig',
      label: 'Recovery Rig Readout',
      texture: 'proc-rig-recycler',
      x: RIG_POSITION.x,
      y: RIG_POSITION.y,
      onPromptOpened: () => this.onRigReadoutOpened(),
    });
    this.addStation({
      interactionKey: 'fieldLabVerificationPost',
      label: 'Verification Post',
      texture: 'proc-reclamation-post',
      x: VERIFICATION_POST_POSITION.x,
      y: VERIFICATION_POST_POSITION.y,
      onPromptOpened: () => this.onVerificationPostOpened(),
    });

    // ——— Field kit: the lab issues its own tools at the door
    // (ArtifactSurvey force-grant precedent; keeps the belt realistic).
    if (!hasInventoryItem('field_scanner')) {
      addInventoryItem('field_scanner');
    }

    if (!hasInventoryItem('excavation_spade')) {
      addInventoryItem('excavation_spade');
    }

    // ——— I opens the accepted inventory overlay (first RoomScene room
    // to wire it; the pause/launch pattern suppresses ALL world input
    // structurally while open, and resume resets latched keys).
    wireInventoryOverlayKey(this, {
      isEligible: () => this.physicalInputEligible(),
    });

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

    // ——— Window bookkeeping across pause (interruptions) and shutdown.
    this.events.on(Phaser.Scenes.Events.PAUSE, () => {
      noteM23FieldRecoveryInterruption();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeOpenWindowsWithValidity('scene_exit');

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__fieldActionsProbe = null;
      }
    });

    this.logScenarioEvent('fieldLabArea', 'proto_field_lab_entered');
    logSecondaryFieldAction('lab_entered', {
      m23_form: this.m23Form,
      magnet_deck_form: deckForm,
    });
  }

  // ————————————————————————————————— presentation helpers ——

  private buildZoneDressing(): void {
    // Zone A: calibration range posts (the source itself is hidden).
    for (const post of CAL_RANGE_POSTS) {
      this.addDecor(post.x, post.y, 'proc-sector-post');
    }

    // Plot corner posts (B, M23, M26 ×2).
    for (const zone of [
      OPEN_FIELD_ZONE,
      M23_PLOT_ZONE,
      M26_CONTROL_ZONE,
      M26_DEPLETED_ZONE,
    ]) {
      for (const corner of this.zoneCorners(zone)) {
        this.addDecor(corner.x, corner.y, 'proc-sector-post');
      }
    }

    // Metal Recovery Yard dressing: heaped scrap field around the rig.
    this.addDecor(13.5 * TILE, 18 * TILE, 'prop-dock-crates');
    this.addDecor(14 * TILE, 20.5 * TILE, 'proc-cart-utility');
    this.addDecor(15 * TILE, 21.5 * TILE, 'proc-dig-mound');
    this.addDecor(18 * TILE, 17.5 * TILE, 'proc-dig-mound');
    this.addDecor(18 * TILE, 22 * TILE, 'proc-dig-mound');
    this.addDecor(12.5 * TILE, 16.5 * TILE, 'proc-beacon-comms');

    // Calibration-range backdrop (east half of the north field).
    this.addDecor(15 * TILE, 2 * TILE, 'proc-station-module');
    this.addDecor(17.5 * TILE, 5 * TILE, 'proc-cart-utility');

    // Collection tray beside the rig (inventory-full caches land here).
    this.add
      .rectangle(TRAY_POSITION.x, TRAY_POSITION.y, 34, 22, 0x2b3a4a, 1)
      .setStrokeStyle(1, 0x5fd3c4, 0.8);
    this.add
      .text(TRAY_POSITION.x, TRAY_POSITION.y + 18, 'TRAY', {
        color: '#dce7f0',
        font: '10px monospace',
      })
      .setOrigin(0.5, 0);
  }

  private zoneCorners(zone: LabZoneRect): { x: number; y: number }[] {
    const minX = zone.minCol * TILE;
    const maxX = (zone.maxCol + 1) * TILE;
    const minY = zone.minRow * TILE;
    const maxY = (zone.maxRow + 1) * TILE;

    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
    ];
  }

  /** Ground tint per dig zone: workable soil vs. staked-closed plots. */
  private redrawZoneOverlay(): void {
    this.zoneOverlay?.destroy();
    this.zoneOverlay = this.add.graphics().setDepth(-0.4);

    const zones: { rect: LabZoneRect; zoneId: string }[] = [
      { rect: OPEN_FIELD_ZONE, zoneId: 'open_field' },
      { rect: M23_PLOT_ZONE, zoneId: 'm23_plot' },
      { rect: M26_CONTROL_ZONE, zoneId: 'm26_control' },
      { rect: M26_DEPLETED_ZONE, zoneId: 'm26_depleted' },
    ];

    for (const { rect, zoneId } of zones) {
      const enabled = this.zoneEnabled(zoneId);
      const fill = enabled ? 0x5a4f3c : 0x39465a;
      const alpha = enabled ? 0.35 : 0.18;

      for (let col = rect.minCol; col <= rect.maxCol; col++) {
        for (let row = rect.minRow; row <= rect.maxRow; row++) {
          this.zoneOverlay.fillStyle(fill, alpha);
          this.zoneOverlay.fillRect(
            col * TILE + 1,
            row * TILE + 1,
            TILE - 2,
            TILE - 2,
          );
        }
      }

      // Non-colour state cue (colour-only rule): closed plots carry a
      // diagonal hatch on top of the tint; open workable ground is
      // plain. Enabled/disabled never differ by hue alone.
      if (!enabled) {
        const minX = rect.minCol * TILE;
        const maxX = (rect.maxCol + 1) * TILE;
        const minY = rect.minRow * TILE;
        const maxY = (rect.maxRow + 1) * TILE;

        this.zoneOverlay.lineStyle(1, 0x33475a, 0.4);

        for (let x = minX - (maxY - minY); x < maxX; x += 24) {
          this.zoneOverlay.lineBetween(
            Math.max(minX, x),
            x < minX ? minY + (minX - x) : minY,
            Math.min(maxX, x + (maxY - minY)),
            x + (maxY - minY) > maxX ? minY + (maxX - x) : maxY,
          );
        }
      }
    }
  }

  private zoneEnabled(zoneId: string): boolean {
    switch (zoneId) {
      case 'open_field':
        return true;
      case 'm23_plot':
        return m23FieldRecoveryWindowOpen();
      case 'm26_control':
        return m26DepletedSearchPhase() === 'control';
      case 'm26_depleted':
        return m26DepletedSearchPhase() === 'futile';
      default:
        return false;
    }
  }

  /** Persistent disturbed-ground rendering for one excavated cell. */
  private renderDugCell(col: number, row: number): void {
    const center = this.digRegistry.cellCenter(col, row);

    this.addDecor(center.x - 2, center.y + 6, 'proc-ground-disturbed');
    this.addDecor(center.x + 12, center.y - 4, 'proc-dig-mound');
  }

  private showDepletedBanner(): void {
    if (this.depletedBanner !== undefined) {
      return;
    }

    this.depletedBanner = this.add
      .text(RIG_POSITION.x, RIG_POSITION.y - 96, 'CATCHMENT DEPLETED', {
        backgroundColor: '#3a1f1d',
        color: '#e8b4ae',
        font: 'bold 11px monospace',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  // ————————————————————————————————— action dispatch ——

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

  private insideZone(zone: LabZoneRect, col: number, row: number): boolean {
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

    // Recovery consequences (only ever once per object — the registry
    // guarantees a buried object leaves the ground exactly once).
    if (record.outcome === 'recovered' || record.outcome === 'cached') {
      if (record.object_id === 'field_rock_object') {
        this.targets.markRecovered('field_rock');
      }

      if (record.object_id === 'm23fr_object') {
        this.targets.markRecovered(M23FR_TARGET_ID);
        markM23FieldRecoveryCompleted(now);
        markOpportunityCompleted(M23FR_OPPORTUNITY_ID);
        refreshValidityProbe();
        closeM23FieldRecoveryWindow(now, 'reset');
        this.scanController.setContext('free');
        this.digRegistry.setZoneEnabled('m23_plot', false);
        this.redrawZoneOverlay();
        this.showFeedbackMessage(
          'Deep recovery complete — the exercise is closed at the console.',
        );
      }

      if (record.object_id === 'm26ds_control_object') {
        this.targets.markRecovered(M26DS_CONTROL_TARGET_ID);
        markM26DepletedSearchControlCompleted(now);
        this.digRegistry.setZoneEnabled('m26_control', false);
        this.digRegistry.setZoneEnabled('m26_depleted', true);
        this.scanController.setContext(M26DS_FUTILE_SCAN_CONTEXT);
        this.redrawZoneOverlay();
        this.showFeedbackMessage(
          'Control sample recovered — report to the Verification Post at the north edge of the plots.',
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

    return { x: RIG_POSITION.x, y: RIG_POSITION.y };
  }

  private onRigIneligiblePress(): void {
    if (!this.playerInsideRigArea()) {
      // F away from the rig is silent (no action concept here).
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

  // ————————————————————————————————— stations / prompts ——

  private onRigReadoutOpened(): boolean {
    // The readout is an E-station only for status + acknowledgement;
    // it never runs the recovery cycle (that is F, embodied).
    return true;
  }

  private onVerificationPostOpened(): boolean {
    // In the futile phase the prompt body IS the certificate (see
    // getPromptBody), so opening the prompt genuinely displays the
    // futility statement — only then is the display recorded.
    if (m26DepletedSearchPhase() === 'futile') {
      markM26DepletedSearchFutilityShown(Date.now());
    }

    return true;
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (
      interactionKey === 'fieldLabVerificationPost' &&
      m26DepletedSearchPhase() === 'futile'
    ) {
      return M26DS_FUTILITY_STATEMENT;
    }

    return undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    switch (interactionKey) {
      case 'fieldLabSupplyCrate':
        return this.supplyCrateOptions();
      case 'fieldLabRangeConsole':
        return this.rangeConsoleOptions();
      case 'fieldLabMaintenanceBench':
        return this.maintenanceBenchOptions();
      case 'fieldLabRecoveryRig':
        return this.rigReadoutOptions();
      case 'fieldLabVerificationPost':
        return this.verificationPostOptions();
      default:
        return [];
    }
  }

  private supplyCrateOptions(): PromptOption[] {
    return [
      {
        label: 'Take one scrap plate',
        feedback: '',
        getEventTypes: () => ['proto_field_lab_supply_taken'],
        onSelected: () => {
          if (addInventoryItem('scrap_plate')) {
            this.showFeedbackMessage('Scrap plate added to the belt.');
          } else {
            this.showFeedbackMessage(
              'Belt full — return something to the crate first.',
            );
          }
        },
      },
      {
        label: 'Load a full test batch (fills the belt)',
        feedback: '',
        getEventTypes: () => ['proto_field_lab_supply_taken'],
        onSelected: () => {
          let added = 0;

          while (!isInventoryFull()) {
            if (!addInventoryItem('scrap_plate')) {
              break;
            }

            added += 1;
          }

          this.showFeedbackMessage(
            added > 0
              ? `Test batch loaded — belt is full (${added} plates).`
              : 'Belt already full.',
          );
        },
      },
      {
        label: 'Return a scrap plate to the crate',
        feedback: '',
        getEventTypes: () => ['proto_field_lab_supply_returned'],
        onSelected: () => {
          if (removeInventoryItem('scrap_plate')) {
            this.showFeedbackMessage(
              'Scrap plate returned — belt space freed.',
            );
          } else {
            this.showFeedbackMessage('No scrap plate on the belt.');
          }
        },
      },
      {
        label: 'Leave it',
        feedback: '',
        getEventTypes: () => [],
      },
    ];
  }

  private rangeConsoleOptions(): PromptOption[] {
    const now = Date.now();
    const anyOpen =
      m23FieldRecoveryWindowOpen() ||
      m24MagnetUtilityWindowOpen() ||
      m26DepletedSearchWindowOpen();

    if (anyOpen) {
      return [
        {
          label: 'End the active exercise (reset the range)',
          feedback: '',
          getEventTypes: () => ['proto_field_lab_console_reset'],
          onSelected: () => this.closeAllWindows('reset'),
        },
        {
          label: 'Close console',
          feedback: '',
          getEventTypes: () => [],
        },
      ];
    }

    const alreadyRun = (exercise: string): PromptOption => ({
      label: `${exercise} — already run this session`,
      feedback:
        'Each exercise runs once per session. Reload for a fresh session.',
      getEventTypes: () => [],
    });
    const options: PromptOption[] = [];

    if (m23FieldRecoveryState.exit_status !== null) {
      options.push(alreadyRun('Exercise 1'));
    } else {
      options.push({
        label: 'Exercise 1 — deep recovery drill (east plot)',
        feedback: '',
        getEventTypes: () => ['proto_field_lab_console_exercise_opened'],
        onSelected: () => {
          openM23FieldRecoveryWindow(now, this.m23Form);
          markOpportunityEntered(M23FR_OPPORTUNITY_ID);
          refreshValidityProbe();
          this.targets.setActive(M23FR_TARGET_ID, true);
          this.digRegistry.setZoneEnabled('m23_plot', true);
          this.scanController.setContext(M23FR_SCAN_CONTEXT);
          this.redrawZoneOverlay();
          this.showFeedbackMessage(
            'Deep recovery drill open: one buried component is present in the staked east plot. Scan (C) to localise, dig (D) to recover.',
          );
        },
      });
    }

    if (m24MagnetUtilityState.exit_status !== null) {
      options.push(alreadyRun('Exercise 2'));
    } else {
      options.push({
        label: 'Exercise 2 — rig utility drill (recovery yard)',
        feedback: '',
        getEventTypes: () => ['proto_field_lab_console_exercise_opened'],
        onSelected: () => {
          const deckPositionAtOpen = magnetDeckState.position;

          openM24MagnetUtilityWindow(
            now,
            magnetDeckState.form ?? 'A',
            deckPositionAtOpen,
          );
          markOpportunityEntered(M24MU_OPPORTUNITY_ID);

          if (deckPositionAtOpen > 0) {
            // Pre-window free-play deck use is a non-standard entry
            // state — recorded, never silently normalised.
            recordPriorExposure(
              M24MU_OPPORTUNITY_ID,
              `deck_position_at_open=${deckPositionAtOpen}`,
            );
          }

          refreshValidityProbe();

          if (magnetDeckDepleted()) {
            // The no-benefit statement must be DISPLAYED and recorded
            // inside the window even when depletion happened earlier.
            this.showDepletedBanner();
            this.showFeedbackMessage(M24MU_DEPLETION_STATEMENT);
            markM24MagnetUtilityDepletionShown(now);

            return;
          }

          this.showFeedbackMessage(
            'Rig utility drill open: operate the recovery rig (F) at the yard. The maintenance bench remains available.',
          );
        },
      });
    }

    if (m26DepletedSearchPhase() !== 'inactive') {
      options.push(alreadyRun('Exercise 3'));
    } else {
      options.push({
        label: 'Exercise 3 — sector verification drill (south plots)',
        feedback: '',
        getEventTypes: () => ['proto_field_lab_console_exercise_opened'],
        onSelected: () => {
          openM26DepletedSearchWindow(now);
          markOpportunityEntered(M26DS_OPPORTUNITY_ID);
          refreshValidityProbe();
          this.targets.setActive(M26DS_CONTROL_TARGET_ID, true);
          this.digRegistry.setZoneEnabled('m26_control', true);
          this.scanController.setContext(M26DS_CONTROL_SCAN_CONTEXT);
          this.redrawZoneOverlay();
          this.showFeedbackMessage(
            'Sector verification drill open: recover the control sample from the western of the two staked south plots first.',
          );
        },
      });
    }

    options.push({
      label: 'Close console',
      feedback: '',
      getEventTypes: () => [],
    });

    return options;
  }

  /** Console reset: closes whichever window is open, no state leakage. */
  private closeAllWindows(reason: 'reset'): void {
    this.closeOpenWindowsWithValidity(reason);
    this.scanController.setContext('free');
    this.redrawZoneOverlay();
    this.showFeedbackMessage('Range reset — no exercise is active.');
  }

  /**
   * Shared close path (console reset / scene shutdown). Register
   * semantics: M24 counts as a completed observation once the depletion
   * signal was displayed (stop AND continue are both valid outcomes);
   * M26 once the control phase completed and the futility signal was
   * displayed. Anything less stays pending — never a low measurement.
   */
  private closeOpenWindowsWithValidity(reason: 'reset' | 'scene_exit'): void {
    const now = Date.now();

    if (m23FieldRecoveryWindowOpen()) {
      closeM23FieldRecoveryWindow(now, reason);
      this.targets.setActive(M23FR_TARGET_ID, false);
      this.digRegistry.setZoneEnabled('m23_plot', false);
    }

    if (m24MagnetUtilityWindowOpen()) {
      if (m24MagnetUtilityState.depletion_signal_displayed_at !== null) {
        markOpportunityCompleted(M24MU_OPPORTUNITY_ID);
      }

      closeM24MagnetUtilityWindow(now, reason);
    }

    if (m26DepletedSearchWindowOpen()) {
      if (
        m26DepletedSearchState.control_completed &&
        m26DepletedSearchState.futility_signal_displayed_at !== null
      ) {
        markOpportunityCompleted(M26DS_OPPORTUNITY_ID);
      }

      closeM26DepletedSearchWindow(now, reason);
      this.targets.setActive(M26DS_CONTROL_TARGET_ID, false);
      this.digRegistry.setZoneEnabled('m26_control', false);
      this.digRegistry.setZoneEnabled('m26_depleted', false);
    }

    refreshValidityProbe();
  }

  private maintenanceBenchOptions(): PromptOption[] {
    return [
      {
        label: 'Run a component sort cycle',
        feedback: '',
        getEventTypes: () => ['proto_field_lab_bench_used'],
        onSelected: () => {
          const started = performWorldAction({
            scene: this,
            x: MAINTENANCE_BENCH_POSITION.x,
            y: MAINTENANCE_BENCH_POSITION.y,
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
        },
      },
      {
        label: 'Step away',
        feedback: '',
        getEventTypes: () => [],
      },
    ];
  }

  private rigReadoutOptions(): PromptOption[] {
    const options: PromptOption[] = [
      {
        label: 'Check the catchment readout',
        feedback: '',
        getEventTypes: () => ['proto_field_lab_rig_status'],
        onSelected: () => {
          if (magnetDeckDepleted()) {
            this.showFeedbackMessage(M24MU_DEPLETION_STATEMENT);

            // Wherever the statement is displayed inside an open M24
            // window, the display is recorded.
            if (m24MagnetUtilityWindowOpen()) {
              markM24MagnetUtilityDepletionShown(Date.now());
            }

            return;
          }

          this.showFeedbackMessage(
            'Rig operational. Take the marked operating pad and start a cycle with F.',
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
        getEventTypes: () => ['proto_field_lab_rig_status'],
        onSelected: () => {
          markM24MagnetUtilityDepletionAcknowledged(Date.now());
          this.showFeedbackMessage(
            'Depletion notice acknowledged. The rig and the maintenance bench both remain available.',
          );
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
              ? 'Verification pending — recover the control sample from the western south plot first.'
              : 'No verification drill is active. The range console opens exercises.',
          // No certificate exists yet — nothing to log as viewed.
          getEventTypes: () => [],
        },
      ];
    }

    const options: PromptOption[] = [
      {
        label: 'Review the sector verification certificate',
        feedback: '',
        getEventTypes: () => ['proto_field_lab_certificate_viewed'],
        onSelected: () => {
          this.showFeedbackMessage(M26DS_FUTILITY_STATEMENT);
        },
      },
    ];

    if (!m26DepletedSearchState.futility_signal_acknowledged) {
      options.push({
        label: 'Acknowledge the verification',
        feedback: '',
        getEventTypes: () => ['proto_field_lab_certificate_viewed'],
        onSelected: () => {
          markM26DepletedSearchFutilityAcknowledged(Date.now());
          this.showFeedbackMessage(
            'Verification acknowledged. The eastern plot stays open; the maintenance bench remains available.',
          );
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
    }
  }
}
