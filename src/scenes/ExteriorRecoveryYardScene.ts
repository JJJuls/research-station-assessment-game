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
 *   2  frozen coupling      M19 coupling panel — two lines (west; Unit 21)
 *   3  Mast 04              M20 antenna restoration — START only (north)
 *   4  excavation field     M23 two-plot excavation protocol (staked, east; Unit 23)
 *   5  Metal Recovery Yard  M24 finite magnet deck + depletion (north-east)
 *   6  uplink posts         M26 disconnected channel (north-west)
 *   7  the airlock          the marked return route
 *
 * Mechanics are the accepted field-actions foundation (scan C / dig D /
 * winch F, deck, caches); the item windows are the Unit 4 models bound in
 * src/pilot/windows/exteriorWindows.ts. C and D work anywhere as ordinary
 * gameplay (secondary_field_action_*); inside the two staked plots and
 * while a plot is selected they are the M23 series' own actions (Unit 23,
 * src/pilot/windows/m23Plots.ts). F runs only on the rig's operating pad and only
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
  cancelActiveWorldAction,
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
  exteriorM23GuidanceAddressed,
  exteriorRemoveCache,
} from '../pilot/exterior/exteriorEpisodeModel';
import {
  M20_STAGE_LABELS,
  M20_STAGE_MS,
  m20Complete,
  m20MastStatus,
  m20NextStage,
  m20OutdoorComplete,
} from '../pilot/exterior/m20AntennaModel';
import {
  M24_CHECK_RECORDED,
  M24_DEPLETION_STATEMENT,
  M24_RIG_BRIEF,
  M24_UNDERSTANDING_QUESTION,
  m24KnowledgeState,
  m24PanelLine,
} from '../pilot/exterior/m24MagnetRigModel';
import {
  M26_CARRIER_OK_NOTICE,
  M26_CHECK_RECORDED,
  M26_DISCONNECT_DELAY_MS,
  M26_DISCONNECT_NOTICE,
  M26_REPORT_LABELS,
  M26_TRANSMIT_MS,
  M26_UNDERSTANDING_QUESTION,
  M26_UPLINK_BRIEF,
  m26Disconnected,
  m26Knowledge,
  m26PostStatus,
} from '../pilot/exterior/m26ChannelModel';
import {
  UNDERSTANDING_SETTLE_MS,
  type UnderstandingAnswer,
  type UnderstandingQuestion,
} from '../pilot/exterior/outcomeUnderstanding';
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
import { M23FieldControls } from '../pilot/ui/M23FieldControls';
import {
  activeWorkSurface,
  openWorkSurface,
} from '../pilot/ui/WorkSurfaceScene';
import {
  declareExteriorWindows,
  dismissExteriorSite,
  endExteriorShift,
  exteriorDeparture,
  exteriorEpisode,
  exteriorHostPaused,
  exteriorHostResumed,
  exteriorObjectiveLine,
  exteriorProbeSnapshot,
  exteriorResume,
  exteriorSteppedAway,
  exteriorTechnicalFailure,
  M20_BRIEF,
  m24Alternative,
  m24AnswerCheck,
  m24Begin,
  m24CheckDue,
  m24CheckOptions,
  m24ContinuationLive,
  m24Cycle,
  m24DepletionShown,
  m24DismissExplanation,
  m24Finish,
  m24Present,
  m24PresentCheck,
  m24TickContinuation,
  m24WindowOpen,
  m26AnswerCheck,
  m26Begin,
  m26CheckDue,
  m26CheckOptions,
  m26ContinuationLive,
  m26DemonstrateDisconnect,
  m26DisconnectPending,
  m26DismissExplanation,
  m26Evidence,
  m26Finish,
  m26NextReportId,
  m26Present,
  m26PresentCheck,
  m26RefuseTransmit,
  m26Send,
  m26TickContinuation,
  m26WindowOpen,
} from '../pilot/windows/exteriorWindows';
import {
  answerM05Offer,
  closeM05Surface,
  declareM05,
  exitM05,
  guardM05Reload,
  M05_JOBS,
  m05HostPaused,
  m05HostResumed,
  m05OfferAvailable,
  m05Probe,
  m05State,
  openM05Control,
  pollM05,
  presentM05Offer,
} from '../pilot/windows/m05Initiation';
import { m05SurfaceModel } from '../pilot/windows/m05SurfaceModel';
import {
  closeM08AtShiftEnd,
  closeM08Surface,
  declareM08,
  m08Window,
  openM08,
  presentM08,
} from '../pilot/windows/m08EffortChoice';
import { m08SurfaceModel } from '../pilot/windows/m08SurfaceModel';
import {
  declareM10,
  guardM10Reload,
  M10_D2_ANSWER_FEEDBACK,
  M10_D2_REASK_BODY,
  M10_D2_REASK_LABEL,
  M10_OFFER_BODY,
  type M10Delivery,
  type M10Person,
} from '../pilot/windows/m10ComponentPromise';
import {
  answerM11Offer,
  declareM11,
  departM11,
  lapseM11Offer,
  m11CarryingItem,
  m11OfferAvailable,
  noteM11OwnerAvailable,
  noteM11ReturnPointAvailable,
  presentM11Offer,
  resolveM11,
} from '../pilot/windows/m11Custody';
import {
  bindM19Surface,
  closeM19AtShiftEnd,
  closeM19Surface,
  declareM19Lines,
  guardM19Reload,
  m19ConsumesEsc,
  m19LineInWorkId,
  m19Window,
  openM19,
  presentM19,
  resumeM19Surface,
} from '../pilot/windows/m19CouplingPanel';
import { m19SurfaceModel } from '../pilot/windows/m19SurfaceModel';
import {
  acceptM20Mast,
  doM20MastStage,
  m20OutdoorFault,
  presentM20MastBrief,
} from '../pilot/windows/m20FeedConsole';
import {
  bindM23Surface,
  closeM23Surface,
  guardM23Reload,
  installM23Host,
  m23ActionPending,
  m23ConsumesEsc,
  m23FieldAdmit,
  m23FieldCancel,
  m23FieldCancelled,
  m23FieldDigResolved,
  m23FieldGoverns,
  m23FieldScanResolved,
  m23FieldStarted,
  m23FieldTick,
  m23GuidanceAddressed,
  type M23HostHooks,
  m23ObserveInput,
  m23PlotState,
  m23PresentationRecheck,
  m23SelectedPlot,
  m23Series,
  m23StakeClosedLine,
  noteM23ShiftEndSource,
  openM23FieldHelp,
  openM23Panel,
  pauseM23,
  publishM23Probe,
  uninstallM23Host,
} from '../pilot/windows/m23Plots';
import {
  M23_DETECTION_RADIUS,
  M23_PLOTS,
  M23_TEXT,
  m23CellCentre,
  m23CellOfPoint,
  M23P_SURFACE_ID,
  m23PlotCells,
  type M23PlotId,
  m23PlotRect,
  m23PointInsidePlot,
  m23RegionMember,
} from '../pilot/windows/m23PlotsContent';
import {
  m23DigLines,
  type M23PauseCause,
  m23ScannerLines,
  m23TrayLine,
} from '../pilot/windows/m23PlotsModel';
import { m23SurfaceModel } from '../pilot/windows/m23SurfaceModel';
import {
  closeM25LoopsAtShiftEnd,
  closeM25Surface,
  declareM25Loops,
  m25LoopsWindow,
  openM25Loops,
  presentM25Loops,
} from '../pilot/windows/m25Repetition';
import { m25SurfaceModel } from '../pilot/windows/m25SurfaceModel';
import {
  YARD_AIRLOCK,
  YARD_RIG_PAD,
  YARD_SITES,
  YARD_SPAWN,
} from '../pilot/zoneSites';
import { researchRuntime } from '../systems';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomStationConfig,
} from '../world';
import { bodyFits, gridOf } from '../world/layouts/grid';
import {
  YARD_COLS,
  YARD_LAYOUT,
  YARD_PROPS,
  YARD_ROWS,
  YARD_SOLIDS,
} from '../world/layouts/yard';

const TILE = 32;

/** Unit 23: the M23 field tools (independent of the belt; decision F). */
const M23_TOOLS = ['field_scanner', 'excavation_spade'] as const;
/**
 * Round 3 (amendment OD-8a): the pinned field-controls line shown verbatim
 * as two consecutive parts (split at the sentence boundary before
 * "P / PANEL"; the whole line wraps to four rows and crossed the plot's top
 * row inside the fixed frame), each for 4 s, on the series' first fixed-frame
 * entry by either route. Guidance only: nothing is blocked while a part
 * shows.
 */
const M23_CONTROLS_PARTS: readonly [string, string] = (() => {
  const full = M23_TEXT.field_controls;
  const at = full.indexOf(' P / PANEL');

  return [full.slice(0, at), full.slice(at + 1)];
})();
const M23_GUIDANCE_PART_MS = 4000;
/** Per page load (never per scene instance): parts completed, cell-label help shown. */
let m23GuidanceParts = 0;
let m23CellHelpShown = false;

declare global {
  interface Window {
    /** DEV-only, read-only: the floating station prompt's design-space bounds (round 4). */
    __yardPromptProbe?: {
      text: string | null;
      bounds: { x: number; y: number; w: number; h: number };
    } | null;
    /** DEV-only, read-only world-readout chips of the yard (Unit 23, V01–V06). */
    __yardChipProbe?:
      | {
          id: string;
          text: string;
          visible: boolean;
          bounds: {
            left: number;
            top: number;
            right: number;
            bottom: number;
          } | null;
        }[]
      | null;
    /** DEV-only, read-only exterior-episode probe (never read back). */
    __exteriorProbe?:
      | (ReturnType<typeof exteriorProbeSnapshot> & {
          m05: ReturnType<typeof m05Probe>;
          stage: string;
          m19_panel: {
            window: string;
            exit: string | null;
            line_in_work: string | null;
          };
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
  /** World V2: the crown beacon on the painted tower (restored → lit, pulsing). */
  private mastBeacon?: Phaser.GameObjects.Rectangle;
  private mastPulseMs = 0;
  private plotOverlay?: Phaser.GameObjects.Graphics;
  private rigChip?: Phaser.GameObjects.Text;
  private depletedBanner?: Phaser.GameObjects.Text;
  private conduit?: Phaser.GameObjects.Graphics;
  private lineAChip?: Phaser.GameObjects.Text;
  private lineBChip?: Phaser.GameObjects.Text;
  private cableFlag?: Phaser.GameObjects.Rectangle;
  private disconnectTimer: Phaser.Time.TimerEvent | null = null;
  /** A Post A / B transmission is running in the world (cap bookkeeping). */
  private transmitInFlight: 'A' | 'B' | null = null;
  /** When Post A's prompt last opened (the continuation's settle guard). */
  private postAPromptOpenedAt = 0;
  /** A Post A Transmit press was refused (settling): the post's options are shown again. */
  private postATransmitRefused = false;
  /** A bench sort is running in the world (cap bookkeeping). */
  private benchInFlight = false;
  /**
   * The expected-outcome check stage built when a rig / uplink / panel
   * prompt opened with the check due (Unit 12): its body joins the
   * station's own text and its options replace the station's options.
   */
  private checkPrompt: { item: 'M24' | 'M26'; stage: PromptStage } | null =
    null;

  // ——— Unit 23 (M23): the two-plot excavation's scene-local state. ———
  /** The field HUD (pad, scanner, last dig / tray, local feedback). */
  private m23Controls?: M23FieldControls;
  /** The yard's pure collision model for the qualifying-region predicate. */
  private readonly m23Grid = gridOf(YARD_LAYOUT, YARD_SOLIDS);
  /** The plot whose fixed frame this scene owns now (the mast-chip mask). */
  private m23FixedPlot: M23PlotId | null = null;
  /** The facing-cell highlight inside the active plot. */
  private m23Facing?: Phaser.GameObjects.Graphics;
  /** Set while this scene launches an M23 surface itself (no `overlay` pause). */
  private m23SurfaceOpening = false;
  /** When the current field-controls part began showing (null: none showing / suspended). */
  private m23GuidancePartAt: number | null = null;
  /** The last line routed to the HUD's feedback line and when it clears (pre-emption bookkeeping). */
  private m23HudLine: { text: string; until: number } | null = null;
  /** Wall time of the last ESC press (an ESC-caused pause of the yard). */
  private m23LastEscAt = 0;
  private m23Hooks: M23HostHooks | null = null;
  private readonly m23OnBlur = () => this.m23Environment('focus_loss');
  private readonly m23OnVisibility = () => {
    if (typeof document !== 'undefined' && document.hidden) {
      this.m23Environment('hidden');
    }
  };
  private readonly m23OnFocus = () => {
    m23PresentationRecheck();
  };

  constructor() {
    super(key.scene.exteriorRecoveryYard);
  }

  protected getLayout() {
    // World V2 rebuild: the 43×12 two-plate painted strip is the terrain
    // and every prop; collision is the audited logical grid.
    return {
      theme: 'exterior' as const,
      grid: [...YARD_LAYOUT],
      solids: YARD_SOLIDS,
      field: 'wide' as const,
      plateTexture: 'w3-yard-field',
    };
  }

  protected bundleDropBounds(): { width: number; height: number } {
    return { width: YARD_COLS * TILE, height: YARD_ROWS * TILE };
  }

  protected getSpawn(): { x: number; y: number } {
    // Inside the airlock, machine-audited: ≥ 80 px from the airlock and
    // outside every site's 72 px radius (V2 finding U8-8).
    return YARD_SPAWN;
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
    // M05 (Unit 6): a flag job answered in an earlier page load is never
    // re-offered (prior exposure recorded, technically incomplete).
    guardM05Reload('o2', Date.now());
    declareExteriorWindows();
    // M23 (Unit 23): a series whose selector was measured in an earlier
    // page load is never re-run (the reload check is written once per load).
    guardM23Reload(Date.now());
    // M19 (Unit 21): the coupling panel's one window is declared here; a
    // panel opened in an earlier page load is never re-run (the reload
    // check is written once per later load at this first guard run).
    declareM19Lines();
    guardM19Reload();
    declareM08();
    // M10 (Unit 15): the yard logbook is offered here; an offer presented
    // in an earlier page load is never re-run.
    declareM10('d2');
    guardM10Reload('d2');
    declareM11('yard');
    declareM25Loops();
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

    // M05 (Unit 6): another surface or an overlay pausing this scene makes
    // the start control unusable — the focused clock pauses (the flag
    // job's own surface is exempt inside the model).
    this.events.on(Phaser.Scenes.Events.PAUSE, () => {
      const now = Date.now();

      m05HostPaused('o2', now);
      // M24 / M26 (Unit 12): a paused yard makes the rig and the posts
      // unusable — the continuations' focused clocks pause.
      exteriorHostPaused(now);
      // M23 (Unit 23): an overlay or another surface over the yard pauses
      // the selected plot (its running action cancels); the ESC menu is
      // the participant's ESC; the M23 surfaces pause through the adapter.
      if (!this.m23SurfaceOpening) {
        pauseM23(
          now - this.m23LastEscAt < 80 ? 'esc' : 'overlay',
          'system',
          now,
        );
      }

      // U24 B-12 (DEV probe only): the prompt probe is refreshed by the
      // update loop, which stops while the yard is paused — clear it so a
      // paused frame never reports stale prompt bounds (U23 acceptance 4b).
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__yardPromptProbe = null;
      }
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      const now = Date.now();

      m05HostResumed('o2', now);
      exteriorHostResumed(now);
      // M19 (Unit 21): the kit window resumes only while the coupling
      // panel itself is open over the yard (never after LEAVE or ESC).
      resumeM19Surface(now);
      this.m23SurfaceOpening = false;
      this.refreshAllVisuals();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.disconnectTimer?.remove();
      this.disconnectTimer = null;
      // M23 (Unit 23): a running action is recorded cancelled
      // (`scene_shutdown`: the framework's cleanup calls no hook); the
      // fixed frame and the mast-chip mask are released; the window
      // listeners go.
      m23FieldCancel('scene_shutdown', Date.now());
      exteriorDeparture(Date.now());
      this.m23ReleaseFrame(false);
      this.mastChip?.setVisible(false);

      if (this.m23Hooks !== null) {
        uninstallM23Host(this.m23Hooks);
        this.m23Hooks = null;
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('blur', this.m23OnBlur);
        window.removeEventListener('focus', this.m23OnFocus);
        document.removeEventListener('visibilitychange', this.m23OnVisibility);
      }

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__fieldActionsProbe = null;
        window.__exteriorProbe = null;
        window.__yardChipProbe = null;
        window.__yardPromptProbe = null;
      }
    });

    // M23 (Unit 23): the host of the series — the world the adapter reads
    // and the presentation it drives (contract §12 M2 / §13 R2).
    this.m23Hooks = this.m23HostHooks();
    installM23Host(this.m23Hooks);

    // A reload hold-back found before the host was installed: the guidance
    // stays addressed (§12 M1, G04) — the later yard objectives are never
    // held behind a locked stake.
    if (m23Series().status === 'held_back') {
      exteriorM23GuidanceAddressed(exteriorEpisode());
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('blur', this.m23OnBlur);
      window.addEventListener('focus', this.m23OnFocus);
      document.addEventListener('visibilitychange', this.m23OnVisibility);
    }

    // P / PANEL: the plot panel (M23-only; a running M23 action cancels
    // first). Inert while a prompt is open or a transition runs.
    this.input.keyboard!.on('keydown-P', (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      const eligible =
        this.physicalInputEligible() ||
        (isWorldActionActive() &&
          m23ActionPending() &&
          !this.isTransitioning());

      // The panel belongs to the exterior work stage (never during Noor's
      // briefing or after the shift ended).
      if (
        !eligible ||
        activeWorkSurface(this) !== null ||
        pilotStage() !== 'exterior_work'
      ) {
        return;
      }

      this.m23OpenPanel('keyboard');
    });
    this.input.keyboard!.on('keydown-ESC', () => {
      this.m23LastEscAt = Date.now();
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
      registryId: 'yard.airlock_lab',
    });
    // World V2: the airlock is baked into the west half's south hull — the
    // leaf sprite would double it; its class lamp sits on the painted
    // lintel lamp.
    this.doorImage('yard.airlock_lab')?.setVisible(false);
    this.placeDoorIndicator('yard.airlock_lab', YARD_AIRLOCK.x, 634);

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
      verb: 'Talk to',
      registryId: 'yard.noor',
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

    // M23 (Unit 23): two independently keyed plots (A-adjusted), each its
    // own dig zone, hidden target and buried component; only the selected
    // searching plot's zone and target are active (the adapter's
    // `onChanged`). Dug cells persist in the series state across scene
    // creations (a recovered component is never registered again).
    for (const def of M23_PLOTS) {
      const plot = m23PlotState(def.id);
      const centre = m23CellCentre(plot.key);

      this.targets.register({
        target_id: def.target_id,
        x: centre.x,
        y: centre.y,
        detection_radius: M23_DETECTION_RADIUS,
        form_id: plot.form,
        zone_id: def.zone_id,
        active: false,
        recovered: plot.tray,
      });
      this.digRegistry.registerZone({
        zone_id: def.zone_id,
        ...def.bounds,
        enabled: false,
      });

      if (!plot.tray) {
        this.digRegistry.registerBuried({
          object_id: def.object_id,
          item_id: 'm23_component',
          col: plot.key.col,
          row: plot.key.row,
          zone_id: def.zone_id,
        });
      }
    }

    for (const def of M23_PLOTS) {
      this.digRegistry.setZoneEnabled(def.zone_id, true);

      for (const dug of m23PlotState(def.id).dug) {
        this.digRegistry.dig(dug.cell.col, dug.cell.row);
        this.renderDugCell(dug.cell.col, dug.cell.row);
      }

      this.digRegistry.setZoneEnabled(def.zone_id, false);
    }

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
      showFeedback: (message) => this.m23Feedback(message),
      // M23: the field HUD renders the pinned readable scanner while a
      // plot is in work; the default caption everywhere else.
      presentation: {
        readout: () => (m23ActionPending() ? 'none' : 'default'),
      },
      onCancelled: () => m23FieldCancelled(Date.now()),
    });

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
        this.renderDugCell(col, row);
      },
      showFeedback: (message) => this.m23Feedback(message),
      // M23 (decision F): a recovered component goes to the field tray (the
      // series records it on resolution); never the belt or a cache.
      deliverRecovery: () => undefined,
      onCancelled: () => m23FieldCancelled(Date.now()),
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
    this.buildSupportConsoleSite();
    this.buildSensorPostSite();
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
        perform: () => this.performScan('keyboard'),
        onIneligiblePress: () => this.onScanIneligiblePress('keyboard'),
      },
      {
        key: 'D',
        label: 'Dig',
        getTarget: () => this.digTarget(),
        perform: (target) => this.performDig(target, 'keyboard'),
        onIneligiblePress: () => this.onDigIneligiblePress('keyboard'),
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

    // ——— M23 (Unit 23): the field HUD — pointer equivalents of the arrow
    // keys, C, D, HELP and P, the scanner and last-dig readouts, the tray
    // line and the local feedback line (contract §10). Hidden until a plot
    // is selected.
    this.m23Controls = new M23FieldControls(this, {
      onMove: (intent) => this.player.setExternalMoveIntent(intent),
      onScan: () => {
        if (this.scanTarget() !== null) {
          this.performScan('pointer');
        } else {
          this.onScanIneligiblePress('pointer');
        }
      },
      onDig: () => {
        const target = this.digTarget();

        if (target !== null) {
          this.performDig(target, 'pointer');
        } else {
          this.onDigIneligiblePress('pointer');
        }
      },
      onHelp: () => this.m23OpenHelp('pointer'),
      onPanel: () => this.m23OpenPanel('pointer'),
      eligible: () =>
        !this.isTransitioning() &&
        activeWorkSurface(this) === null &&
        (this.physicalInputEligible() || m23ActionPending()),
    });
    this.m23Facing = this.add.graphics().setDepth(DepthLayer.FloorMarking);
    this.refreshM23();

    // ——— World V2: the painted strip IS the terrain and every prop —
    // hide every site marker sprite (interactions, prompts and events
    // untouched; the interior rooms' precedent). The V4 worksite grammar
    // (service path, zone plates, drifts, debris, footprints) is gone:
    // the plates' baked snow, footprints, lamp pools and wreckage carry
    // that reading. No ambient snowfall (mission §5).
    this.buildYardProps();

    for (const child of this.children.list) {
      if (
        child instanceof Phaser.GameObjects.Image &&
        [
          'proc-valve-relief',
          'proc-beacon-comms',
          // Unit 23: the relocated stake (1072, 488) has no painted prop
          // (the old stake-field prop left with §13 R1); the procedural
          // survey-stake sprite stays visible as the station's marker.
          'proc-rig-recycler',
          'proc-bench-prep',
          'proc-scan-node',
          'proc-panel-warning',
          'proc-crate-supply',
          'proc-survey-stake-flagged',
        ].includes(child.texture.key)
      ) {
        child.setVisible(false);
      }
    }
  }

  /**
   * World V3 open field: every prop is a free-standing sprite sorted at
   * its foot line (the avatar walks in front of and behind the mast, the
   * gantry and the rack); colliders come from YARD_SOLIDS. Work lamps get
   * a soft warm pool on the snow. Presentation only.
   */
  private buildYardProps() {
    const pool = 'yard-soft-pool';

    if (!this.textures.exists(pool)) {
      const canvas = this.textures.createCanvas(pool, 96, 48);

      if (canvas !== null) {
        const ctx = canvas.getContext();
        const gradient = ctx.createRadialGradient(48, 24, 2, 48, 24, 48);

        gradient.addColorStop(0, 'rgba(246,178,96,0.42)');
        gradient.addColorStop(0.6, 'rgba(246,178,96,0.2)');
        gradient.addColorStop(1, 'rgba(246,178,96,0)');
        ctx.setTransform(1, 0, 0, 0.5, 0, 12);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, -24, 96, 96);
        canvas.refresh();
      }
    }

    for (const prop of YARD_PROPS) {
      if (!this.textures.exists(prop.texture)) {
        continue;
      }

      const bases = prop.solids ?? [];
      const foot =
        bases.length > 0
          ? Math.max(...bases.map(([, y, , h]) => prop.y + y + h))
          : prop.y + prop.h * 0.5;
      const image = this.add
        .image(prop.x, prop.y, prop.texture)
        .setOrigin(0)
        .setDepth(bases.length > 0 ? worldDepth(foot) : DepthLayer.FloorDecal);

      image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

      if (prop.texture.startsWith('w3-yard-lamp')) {
        this.add
          .image(prop.x + 8, prop.y + prop.h - 2, pool)
          .setDepth(DepthLayer.FloorDecal + 0.02);
      }
    }
  }

  // ————————————————————————————————— sites ——

  /**
   * Station 080 M08 (Unit 2): the station support console — six 15-second
   * work-or-stand-by slots on a work surface. Never guided by the beacon
   * as a directive after first use; never gates anything.
   */
  private buildSupportConsoleSite() {
    const site = YARD_SITES.supportConsole;

    this.addStation({
      interactionKey: 'pilotStation',
      label: 'Station Support Console',
      texture: 'proc-console-scenario',
      x: site.x,
      y: site.y,
      verb: 'Use the',
      registryId: 'yard.support_console',
      onPromptOpened: () => {
        this.m23PauseForForeignStation();
        this.logStationOpened('support_console', {
          window_status: m08Window.windowStatus(),
        });

        if (activeWorkSurface(this) !== null) {
          return false;
        }

        openM08(Date.now());
        // Guidance only: the listed job is reached once the console opens.
        dismissExteriorSite('console');
        openWorkSurface(this, {
          surfaceId: 'm08_support_console',
          model: () => m08SurfaceModel(this.m08SurfaceHost()),
          onClose: () => {
            closeM08Surface(Date.now());
          },
          onClosed: () => {
            // Invalidate any pending tick: the reopen render schedules afresh.
            this.m08TickSerial += 1;
            this.m08TickPending = false;
            this.refreshGuidance();
          },
        });

        return false;
      },
    });
    registerPilotStation({
      id: 'support_console',
      zone: 'exterior_recovery_yard',
      x: site.x,
      y: site.y,
      label: 'Station Support Console',
      stages: ['exterior_work'],
      isDone: () => m08Window.windowStatus() !== 'unopened',
      // Sixth listed job: after the rig, before the uplink reports (the
      // beacon and Noor's list agree — review U2-R).
      order: 5,
    });
  }

  /** One pending surface tick at a time (review U2-R: no redraw pile-up). */
  private m08TickPending = false;
  /** Bumped on every close so a stale tick from the old surface is ignored. */
  private m08TickSerial = 0;

  private m08SurfaceHost() {
    return {
      now: () => Date.now(),
      // The Leave button and ESC take the SAME path: pause first (a running
      // slot or an open choice never counts unattended time), then close.
      close: () => {
        closeM08Surface(Date.now());
        activeWorkSurface(this)?.close();
      },
      feedback: (message: string) =>
        activeWorkSurface(this)?.showFeedback(message),
      // A wall-clock timer, deliberately NOT the surface scene's clock: the
      // reopen render runs inside the surface's create step, when the scene
      // is not yet "active" and its clock would not be reachable — a slot
      // resumed on reopen must still tick (a stand-by slot has no press to
      // re-render it). The callback bails when the surface is gone (the
      // model paused the clock at close) or the serial moved on.
      later: (ms: number, fn: () => void) => {
        if (this.m08TickPending) {
          return;
        }

        this.m08TickPending = true;

        const serial = this.m08TickSerial;

        window.setTimeout(() => {
          if (serial !== this.m08TickSerial) {
            return;
          }

          this.m08TickPending = false;

          if (activeWorkSurface(this) === null) {
            return;
          }

          fn();
          activeWorkSurface(this)?.refresh();
        }, ms);
      },
    };
  }

  /**
   * Station 080 M25 (Unit 4): the field sensor post — three required
   * calibration loops, then optional identical loops on a work surface.
   * Never guided by the beacon as a directive after first use; never
   * gates anything.
   */
  private buildSensorPostSite() {
    const site = YARD_SITES.sensorPost;

    this.addStation({
      interactionKey: 'pilotStation',
      label: 'Field Sensor Post',
      // Not `proc-scan-node`: that key is hidden by the World V2 marker
      // sweep below AND is uplink post B's sprite (review U4 — the post
      // must be visible and never look like M26's alternative).
      texture: 'proc-console-wall',
      x: site.x,
      y: site.y,
      verb: 'Use the',
      registryId: 'yard.sensor_post',
      onPromptOpened: () => {
        this.m23PauseForForeignStation();
        this.logStationOpened('sensor_post', {
          window_status: m25LoopsWindow.windowStatus(),
        });

        if (activeWorkSurface(this) !== null) {
          return false;
        }

        // After Noor's shift end a never-opened post is inert: the M24 /
        // M26 opportunities are closed and the belief question keyed to
        // that closure — no post-shift sweep can be started (review U4).
        if (
          exteriorEpisode().shift_ended_at_ms !== null &&
          m25LoopsWindow.windowStatus() === 'unopened'
        ) {
          this.showFeedbackMessage(
            'The yard shift is logged — the post is closed.',
          );

          return false;
        }

        openM25Loops(Date.now());
        // Guidance only: the listed job is reached once the post opens.
        dismissExteriorSite('sensor');
        openWorkSurface(this, {
          surfaceId: 'm25_field_sensor_post',
          model: () => m25SurfaceModel(this.m25SurfaceHost()),
          onClose: () => {
            closeM25Surface(Date.now());
          },
          onClosed: () => {
            this.m25TickSerial += 1;
            this.m25TickPending = false;
            this.refreshGuidance();
          },
        });

        return false;
      },
    });
    registerPilotStation({
      id: 'sensor_post',
      zone: 'exterior_recovery_yard',
      x: site.x,
      y: site.y,
      label: 'Field Sensor Post',
      stages: ['exterior_work'],
      isDone: () => m25LoopsWindow.windowStatus() !== 'unopened',
      // Seventh listed job: after the console, before the uplink reports
      // (the beacon and Noor's list agree).
      order: 6,
    });
  }

  private m25TickPending = false;
  private m25TickSerial = 0;

  private m25SurfaceHost() {
    return {
      now: () => Date.now(),
      // The Leave button and ESC take the SAME path: pause first, then close.
      close: () => {
        closeM25Surface(Date.now());
        activeWorkSurface(this)?.close();
      },
      feedback: (message: string) =>
        activeWorkSurface(this)?.showFeedback(message),
      // Wall-clock timer (see m08SurfaceHost): a reopened surface is not
      // yet "active" during its create step, and a running loop or the
      // optional window must keep ticking after a reopen.
      later: (ms: number, fn: () => void) => {
        if (this.m25TickPending) {
          return;
        }

        this.m25TickPending = true;

        const serial = this.m25TickSerial;

        window.setTimeout(() => {
          if (serial !== this.m25TickSerial) {
            return;
          }

          this.m25TickPending = false;

          if (activeWorkSurface(this) === null) {
            return;
          }

          fn();
          activeWorkSurface(this)?.refresh();
        }, ms);
      },
    };
  }

  private m05TickPending = false;
  private m05TickSerial = 0;

  /** M05 (Unit 6): the flag job's surface host — wall-clock tick (M25 precedent). */
  private m05SurfaceHost() {
    return {
      now: () => Date.now(),
      // The Leave button and ESC take the SAME path: pause first, then close.
      close: () => {
        closeM05Surface('o2', Date.now());
        activeWorkSurface(this)?.close();
      },
      feedback: (message: string) =>
        activeWorkSurface(this)?.showFeedback(message),
      later: (ms: number, fn: () => void) => {
        if (this.m05TickPending) {
          return;
        }

        this.m05TickPending = true;

        const serial = this.m05TickSerial;

        window.setTimeout(() => {
          if (serial !== this.m05TickSerial) {
            return;
          }

          this.m05TickPending = false;

          if (activeWorkSurface(this) === null) {
            return;
          }

          fn();
          activeWorkSurface(this)?.refresh();
        }, ms);
      },
    };
  }

  private buildCouplingSite() {
    const site = YARD_SITES.coupling;

    this.addStation({
      interactionKey: 'pilotCoupling',
      label: 'Frozen Coolant Coupling',
      texture: 'proc-valve-relief',
      x: site.x,
      y: site.y,
      onPromptOpened: () => {
        this.m23PauseForForeignStation();
        this.logStationOpened('frozen_coupling', {
          window_status: m19Window.windowStatus(),
        });

        if (activeWorkSurface(this) !== null) {
          return false;
        }

        // M19 (Unit 21): the station opens the coupling panel — the shared
        // work surface in the wide frame (decision D-U17-2) — as the M08
        // console opens its surface; no world prompt is shown.
        const first = m19Window.windowStatus() === 'unopened';

        openM19(Date.now(), { stage: pilotStage() });

        if (first) {
          // Guidance only: the listed job is reached once the panel opens;
          // nothing points back to an unfinished line afterwards.
          dismissExteriorSite('coupling');
        }

        openWorkSurface(this, {
          surfaceId: 'm19_coupling_panel',
          frame: 'wide',
          model: () => m19SurfaceModel(this.m19SurfaceHost()),
          onClose: () => {
            // ESC order: an open dialog, the help sheet, a carried press —
            // consumed; only then does ESC leave (the same path as LEAVE).
            if (m19ConsumesEsc(Date.now())) {
              return false;
            }

            closeM19Surface(Date.now());

            return true;
          },
          onClosed: () => {
            this.refreshCouplingVisuals();
            this.refreshGuidance();
          },
        });

        return false;
      },
    });
    registerPilotStation({
      id: 'coupling',
      zone: 'exterior_recovery_yard',
      x: site.x,
      y: site.y,
      label: 'Frozen Coolant Coupling',
      stages: ['exterior_work'],
      isDone: () => m19Window.windowStatus() !== 'unopened',
      order: 1,
    });
    // World V2: the pipe assembly, the heater rack and the valve wheel
    // are painted; the progress dial sits over the painted wheel, the
    // frost sheet over the collar, the chip on the pipe run's foot.
    this.couplingDial = this.add.graphics().setDepth(DepthLayer.WorldReadout);
    this.frostOverlay = this.add
      .rectangle(site.x - 48, site.y - 5, 60, 44, 0xcfe6ff, 0.42)
      .setStrokeStyle(1, 0xe8f4ff, 0.8)
      .setDepth(3)
      .setVisible(false);
    this.couplingChip = this.chip(site.x - 40, site.y + 52, '');
  }

  /** The coupling panel's host: the clock, the close path and the feedback line. */
  private m19SurfaceHost() {
    return bindM19Surface({
      now: () => Date.now(),
      // LEAVE, FINISH and ESC take the SAME path: the panel is left (the
      // window and the line's clock pause) before the surface closes.
      close: () => {
        closeM19Surface(Date.now());
        activeWorkSurface(this)?.close();
      },
      feedback: (message: string) =>
        activeWorkSurface(this)?.showFeedback(message),
    });
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
        this.m23PauseForForeignStation();
        const state = exteriorEpisode().m20;

        this.logStationOpened('mast_04', {
          accepted: state.accepted,
          stages_done: state.stages_done.length,
        });
        presentM20MastBrief(Date.now());

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
    // World V2: the lattice tower is painted; the restoration state is
    // carried by the crown beacon (dark until the whole restoration is
    // complete, then lit and slowly pulsing), the stage marks drawn on
    // the footing and up the tower, and the chip on the tower body.
    this.mastBeacon = this.add
      .rectangle(
        YARD_SITES.mastTower.x,
        YARD_SITES.mastTower.y,
        8,
        8,
        0x33475a,
        1,
      )
      .setStrokeStyle(1, 0x8fa4b8, 0.35)
      .setDepth(DepthLayer.WorldReadout);
    this.mastFeed = this.add.graphics().setDepth(DepthLayer.WorldReadout);
    // V3 native-size review: at the footing's foot (+72) the chip lay in
    // the apron lane at the arrival spawn, under the participant's own
    // figure (chips sit below every figure by construction). It now hangs
    // beside the footing under the mast lamp — clear of the spawn, of the
    // audited approach point and of the uplink chips.
    this.mastChip = this.chip(site.x + 148, site.y + 30, '');
  }

  /**
   * M23 (Unit 23): the Excavation Field Stake opens the series' panel — the
   * brief and the two static example pages before the first measured
   * opening, the plot selector afterwards; a closed or locked series answers
   * with its pinned line. No world prompt is shown.
   */
  private buildExcavationSite() {
    const site = YARD_SITES.plotStake;

    this.addStation({
      interactionKey: 'pilotPlotStake',
      label: 'Excavation Field Stake',
      texture: 'proc-survey-stake',
      x: site.x,
      y: site.y,
      onPromptOpened: () => {
        const series = m23Series();

        this.logStationOpened('excavation_stake', {
          series_status: series.status,
          opened: series.opened,
          selected: series.selected,
        });

        if (activeWorkSurface(this) !== null) {
          return false;
        }

        // The stake opens through the panel path: a plot in work pauses
        // first (a running action cancels), then the selector (§12 M2).
        const outcome = openM23Panel(
          this.observedInput().input_mode === 'pointer'
            ? 'pointer'
            : 'keyboard',
          Date.now(),
        );

        if (outcome === 'closed' || outcome === 'locked') {
          this.showFeedbackMessage(m23StakeClosedLine());

          return false;
        }

        this.openM23Surface();

        return false;
      },
    });
    registerPilotStation({
      id: 'excavation',
      zone: 'exterior_recovery_yard',
      x: site.x,
      y: site.y,
      label: 'Excavation Field Stake',
      stages: ['exterior_work'],
      // Guidance only (contract §12 M1): addressed on the first usable plot
      // selector; never by a plot's success, stop or failure.
      isDone: () => m23GuidanceAddressed(),
      order: 3,
    });

    // The two plot outlines are drawn by redrawPlotOutlines over the field.
  }

  private buildMetalYard() {
    const rig = YARD_SITES.magnetRig;

    // World V2: the gantry, the hanging magnet, the scrap catchment, the
    // control bench and the parts cart are painted.
    this.addStation({
      interactionKey: 'pilotRigReadout',
      label: 'Magnet Recovery Rig',
      texture: 'proc-rig-recycler',
      x: rig.x,
      y: rig.y,
      onPromptOpened: () => {
        this.m23PauseForForeignStation();
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

        // Unit 12: with the statement displayed the expected-outcome check
        // is due — the prompt IS the check (its options answer it).
        // Never while a cycle is still running: a cycle started before
        // the check must resolve (pre-knowledge) before the check is shown.
        this.checkPrompt = ['idle', 'cooldown'].includes(this.magnet.getPhase())
          ? this.buildCheckStage('M24', 'rig_panel')
          : null;

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

        // Guidance only: the site is done once the window closed or the
        // check failed — never at the depletion and never while the
        // continuation is open (a behaviour is being observed; the beacon
        // must not move on at the pass).
        return state.closed || state.understanding.status === 'fail';
      },
      order: 4,
    });
    // V3 native-size review: −68 stacked the readout directly on the
    // one-line prompt shown at the audited approach; −84 clears it.
    this.rigChip = this.chip(rig.x, rig.y - 84, '');

    // The equally visible useful alternative: the sorting bench.
    const bench = YARD_SITES.sortingBench;

    this.addStation({
      interactionKey: 'pilotSortingBench',
      label: 'Sorting Bench',
      texture: 'proc-bench-prep',
      x: bench.x,
      y: bench.y,
      onPromptOpened: () => {
        this.m23PauseForForeignStation();
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
        this.m23PauseForForeignStation();
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

        this.checkPrompt = this.buildCheckStage('M26', 'post_a');
        this.postAPromptOpenedAt = Date.now();

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

        return state.closed || state.understanding.status === 'fail';
      },
      // Eighth listed job (the sensor post is seventh — Unit 4).
      order: 7,
    });

    this.addStation({
      interactionKey: 'pilotUplinkB',
      label: 'Field Uplink Post B',
      texture: 'proc-scan-node',
      x: postB.x,
      y: postB.y,
      onPromptOpened: () => {
        this.m23PauseForForeignStation();
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
        this.m23PauseForForeignStation();
        const state = exteriorEpisode().m26;

        this.logStationOpened('line_status_panel', {
          knowledge: m26Knowledge(state),
        });

        if (m26Disconnected(state)) {
          m26Evidence(Date.now(), 'line_status_panel', 'keyboard');
        }

        this.checkPrompt = m26WindowOpen()
          ? this.buildCheckStage('M26', 'line_panel')
          : null;

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
        this.m23PauseForForeignStation();
        this.logStationOpened('supply_crate', {});
        // M11 (Unit 3): the crate is the yard loan's return point.
        noteM11ReturnPointAvailable('yard');

        return true;
      },
    });

    // ——— Cable flag (M05 occasion 2, Unit 6): the accepted extra job's
    // start control. Before acceptance the flag reads tied off. ———
    const flag = YARD_SITES.cableFlag;

    this.addStation({
      interactionKey: 'pilotStation',
      // One name everywhere (Noor's offer, the surface title, the prompt):
      // "E — Check the guy-line flag" (review U6 G-F4).
      label: 'guy-line flag',
      verb: 'Check the',
      texture: 'proc-survey-stake-flagged',
      x: flag.x,
      y: flag.y,
      onPromptOpened: () => {
        this.m23PauseForForeignStation();
        this.logStationOpened('cable_flag', {});

        if (activeWorkSurface(this) !== null) {
          return false;
        }

        if (openM05Control('o2', Date.now()) === 'not_accepted') {
          this.showFeedbackMessage(M05_JOBS.o2.idle);

          return false;
        }

        openWorkSurface(this, {
          surfaceId: 'm05_flag_job',
          model: () => m05SurfaceModel(this.m05SurfaceHost(), 'o2'),
          onClose: () => {
            closeM05Surface('o2', Date.now());
          },
          onClosed: () => {
            this.m05TickSerial += 1;
            this.m05TickPending = false;
          },
        });

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
      case 'pilotMast':
        return episode.m20.accepted ? m20MastStatus(episode.m20) : M20_BRIEF;
      case 'pilotRigReadout': {
        const state = episode.m24;

        if (magnetDeckDepleted()) {
          return this.withCheckBody('M24', M24_DEPLETION_STATEMENT);
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

        return this.withCheckBody(
          'M26',
          `${status}\n${
            next === null
              ? 'Both recovery reports delivered.'
              : `Next report: ${M26_REPORT_LABELS[next]}.`
          }`,
        );
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
          ? this.withCheckBody('M26', M26_DISCONNECT_NOTICE)
          : M26_CARRIER_OK_NOTICE;
      default:
        return undefined;
    }
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    switch (interactionKey) {
      case 'pilotNoor': {
        // M11 (Unit 3): Noor is available for the hand-back while carrying.
        noteM11OwnerAvailable('yard');

        const beat = this.noorBeat();

        if (m11CarryingItem('yard')) {
          beat.options = [
            ...beat.options,
            {
              label: 'Hand the torque driver back to Noor.',
              tag: pilotStageAtOrAfter('return_hub')
                ? 'm11_yard_return_owner_late'
                : 'm11_yard_return_owner',
              feedback: '',
              onSelected: () => {
                this.showFeedbackMessage(
                  resolveM11(
                    'yard',
                    'owner_handover',
                    'noor',
                    Date.now(),
                    'keyboard',
                  )
                    ? 'Noor: Thanks — got it.'
                    : 'The torque driver is not with you.',
                );
              },
            },
          ].slice(0, 4);
        }

        // M10 (Unit 15): "About the deliveries…" LAST, after the M11
        // option, once the briefing is through and while Noor can act on
        // a delivery (at most 2 route + 1 custody + this entry).
        beat.options = this.capNpcMenu('pilotNoor', [
          ...beat.options,
          ...this.deliveriesEntry('pilotNoor', 'noor'),
        ]);

        return this.npcBeatOptions('pilotNoor', beat);
      }
      case 'pilotMast':
        return this.mastOptions();
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
  private stepAway(site: 'mast' | 'rig' | 'uplink'): PromptOption {
    return this.option('Step away', () => {
      if (site === 'rig' || site === 'uplink') {
        exteriorSteppedAway(site, Date.now(), 'keyboard');
      }

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

  // ——— M20 (start only) ———

  private mastOptions(): PromptOption[] {
    const state = exteriorEpisode().m20;
    const site = YARD_SITES.mast;

    if (!state.accepted) {
      return [
        this.option('Accept the restoration', () => {
          if (acceptM20Mast(Date.now(), 'keyboard')) {
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
              if (doM20MastStage(next, Date.now(), 'keyboard')) {
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

  // ——— M23 (Unit 23) ———

  /** The world the series adapter reads and the presentation it drives. */
  private m23HostHooks(): M23HostHooks {
    return {
      origin: () => ({ x: this.player.x, y: this.player.y }),
      member: (plot, x, y) =>
        m23RegionMember(plot, x, y, (px, py) => bodyFits(this.m23Grid, px, py)),
      insidePlot: (x, y) =>
        M23_PLOTS.find((def) => m23PointInsidePlot(def.bounds, x, y))?.id ??
        null,
      // Amendment OD-4: every plot whose exact qualifying region (the
      // body-valid inverse-probe union, not the other plot) holds the point.
      regionPlots: (x, y) =>
        M23_PLOTS.filter(
          (def) =>
            m23RegionMember(def.id, x, y, (px, py) =>
              bodyFits(this.m23Grid, px, py),
            ).member,
        ).map((def) => def.id),
      tools: () => [...M23_TOOLS],
      stage: () => pilotStage(),
      usable: () =>
        typeof document === 'undefined' ||
        (!document.hidden &&
          (typeof document.hasFocus !== 'function' || document.hasFocus())),
      surface: {
        isOpen: () => activeWorkSurface(this) !== null,
        open: () => this.openM23Surface(),
        refresh: () => activeWorkSurface(this)?.refresh(),
        close: () => activeWorkSurface(this)?.close(),
      },
      onSearching: (plot) => this.m23EngageFrame(plot),
      onNotSearching: () => this.m23ReleaseFrame(true),
      onChanged: () => this.refreshM23(),
      onGuidanceAddressed: () => {
        exteriorM23GuidanceAddressed(exteriorEpisode());
        this.refreshGuidance();
        refreshPilotCoverageProbe();
      },
      feedback: (message) => this.m23Feedback(message),
      cancelWorldAction: () => cancelActiveWorldAction(),
    };
  }

  /**
   * Unit 23 amendment (OD-1): the yard hides ONLY its own stake's floating
   * prompt while it owns a fixed frame (the prompt crossed the highlighted
   * entry cell). Foreign stations keep their prompts; the stake stays the
   * active target, so E / Space still opens the panel path.
   */
  protected stationPromptSuppressed(station: RoomStationConfig): boolean {
    return (
      station.interactionKey === 'pilotPlotStake' && this.m23FixedPlot !== null
    );
  }

  /** The series' surface (the shared standard-frame work surface). */
  private openM23Surface() {
    if (activeWorkSurface(this) !== null) {
      return;
    }

    this.m23SurfaceOpening = true;
    openWorkSurface(this, {
      surfaceId: M23P_SURFACE_ID,
      model: () => m23SurfaceModel(bindM23Surface({ now: () => Date.now() })),
      onInput: (observation) => m23ObserveInput(observation),
      onClose: (mode) => {
        // ESC order: the STOP confirmation returns to the selector, HELP
        // returns to its origin; otherwise ESC pauses (STEP AWAY).
        if (m23ConsumesEsc(Date.now())) {
          return false;
        }

        closeM23Surface('esc', mode, Date.now());

        return true;
      },
      onClosed: () => {
        this.m23SurfaceOpening = false;
        this.refreshM23();
        this.refreshGuidance();
      },
    });
  }

  /**
   * A deliberate interaction with any OTHER yard station pauses a plot in
   * work before that station opens (§12 M2; the fixed frame ends with it).
   * Called first by every non-stake station's prompt hook.
   */
  private m23PauseForForeignStation() {
    const selected = m23SelectedPlot();

    if (
      selected !== null &&
      (selected.status === 'approaching' || selected.status === 'searching')
    ) {
      pauseM23(
        'overlay',
        this.observedInput().input_mode === 'pointer' ? 'pointer' : 'keyboard',
        Date.now(),
      );
    }
  }

  private m23OpenPanel(mode: 'keyboard' | 'pointer') {
    if (activeWorkSurface(this) !== null) {
      return;
    }

    const outcome = openM23Panel(mode, Date.now());

    if (outcome === 'closed' || outcome === 'locked') {
      this.m23Feedback(m23StakeClosedLine());

      return;
    }

    this.openM23Surface();
  }

  private m23OpenHelp(mode: 'keyboard' | 'pointer') {
    if (activeWorkSurface(this) !== null) {
      return;
    }

    openM23FieldHelp(mode, Date.now());
    this.openM23Surface();
  }

  /** The page lost focus / was hidden: the selected plot pauses (its action cancels). */
  private m23Environment(cause: M23PauseCause) {
    if (!this.scene.isActive() && !this.scene.isPaused()) {
      return;
    }

    pauseM23(cause, 'system', Date.now());
  }

  /** The selected plot is searching: its fixed frame (contract §10 / §13 R2). */
  private m23EngageFrame(plot: M23PlotId) {
    const def = M23_PLOTS.find((candidate) => candidate.id === plot)!;

    this.m23FixedPlot = plot;
    this.cameraHeld = true;
    this.plate.snapScroll(def.fixed_scroll.x, def.fixed_scroll.y);
    // Already-visible entry hides immediately; the clamp list omits the
    // chip on every masked frame (list omission alone is insufficient).
    this.mastChip?.setVisible(false);
    this.scanController.setContext(def.zone_id);
    this.refreshM23();
  }

  /** The fixed frame ends: ordinary follow; the chip list recomputed at once. */
  private m23ReleaseFrame(recompute: boolean) {
    if (this.m23FixedPlot === null) {
      return;
    }

    this.m23FixedPlot = null;
    this.cameraHeld = false;
    this.scanController.setContext('free');
    // The controls guidance suspends with the frame; a pending part is
    // shown again (from its start) at the next fixed-frame entry.
    this.m23GuidancePartAt = null;

    if (recompute && this.mastChip !== undefined && this.mastChip.active) {
      this.clampWorldReadouts(this.m23ChipList());
    }
  }

  /** The clamp candidates: the mast chip is excluded while a fixed frame is owned. */
  private m23ChipList(): (Phaser.GameObjects.Text | null)[] {
    return [
      this.couplingChip ?? null,
      this.m23FixedPlot === null ? (this.mastChip ?? null) : null,
      this.rigChip ?? null,
      this.lineAChip ?? null,
      this.lineBChip ?? null,
    ];
  }

  /** M23 feedback: the local line while the field HUD shows, else the room's. */
  private m23Feedback(message: string, durationMs = 2200) {
    // The HUD's own line carries a message only while the plot it belongs
    // to stays live; a closure line (recovery, stop) outlives the HUD, so
    // it goes to the room's feedback like every line outside a plot.
    const selected = m23SelectedPlot();
    const live =
      selected !== null &&
      (selected.status === 'approaching' ||
        selected.status === 'searching' ||
        selected.status === 'choice_pending');

    if (live && this.m23Controls?.isVisible()) {
      this.m23Controls.showFeedback(message, durationMs);
      // What the HUD line shows now and when it clears: a later line
      // pre-empts a controls-guidance part, which is shown again afterwards.
      this.m23HudLine = { text: message, until: Date.now() + durationMs };
    } else {
      this.showFeedbackMessage(message);
    }
  }

  /**
   * Round 3 (amendment OD-8a): on the first fixed-frame entry of the load the
   * two verbatim parts of the pinned field-controls line, 4 s each and in
   * order, then the pinned cell-label help once with the first facing label.
   * Another HUD line (a refusal, a cancellation, "Search resumed.") pre-empts
   * the current part, which is shown again from its start once that line
   * clears; the sequence suspends while the frame is released and resumes at
   * the next entry; nothing is blocked while a part shows.
   */
  private tickM23Guidance(digLines: readonly string[]) {
    const nowMs = Date.now();
    const line = this.m23HudLine;
    const lineClear = line === null || nowMs >= line.until;

    if (m23GuidanceParts < 2) {
      const part = M23_CONTROLS_PARTS[m23GuidanceParts];

      if (this.m23GuidancePartAt !== null) {
        if (line === null || line.text !== part) {
          // Pre-empted: wait for the other line, then show the part again.
          this.m23GuidancePartAt = null;
        } else if (nowMs - this.m23GuidancePartAt >= M23_GUIDANCE_PART_MS) {
          m23GuidanceParts += 1;
          this.m23GuidancePartAt = null;
        }
      }

      if (
        this.m23GuidancePartAt === null &&
        m23GuidanceParts < 2 &&
        lineClear
      ) {
        this.m23GuidancePartAt = nowMs;
        this.m23Feedback(
          M23_CONTROLS_PARTS[m23GuidanceParts],
          M23_GUIDANCE_PART_MS,
        );
      }

      return;
    }

    if (
      !m23CellHelpShown &&
      lineClear &&
      digLines.some((entry) => /Facing: C\d\d R\d\d/.test(entry))
    ) {
      m23CellHelpShown = true;
      this.m23Feedback(M23_TEXT.cell_label_help);
    }
  }

  /** Registries, outlines, HUD, guidance and probes follow the series state. */
  private refreshM23() {
    const selected = m23SelectedPlot();
    const searching = selected !== null && selected.status === 'searching';

    for (const def of M23_PLOTS) {
      const active = searching && selected.id === def.id;

      this.digRegistry.setZoneEnabled(def.zone_id, active);

      if (this.targets.has(def.target_id)) {
        this.targets.setActive(def.target_id, active);

        if (m23PlotState(def.id).tray) {
          this.targets.markRecovered(def.target_id);
        }
      }
    }

    if (!searching) {
      this.m23ReleaseFrame(true);
    }

    this.redrawPlotOutlines();
    this.renderM23Controls();
    this.refreshGuidance();
    refreshPilotCoverageProbe();
    publishM23Probe(Date.now());
  }

  private renderM23Controls() {
    const controls = this.m23Controls;

    if (controls === undefined) {
      return;
    }

    // The HUD belongs to a plot IN WORK (§12 M1: no standing reminder): it
    // hides on every pause and pending choice, wherever the avatar is.
    const selected = m23SelectedPlot();
    const show =
      selected !== null &&
      (selected.status === 'approaching' || selected.status === 'searching');

    controls.setVisible(show);

    if (selected === null) {
      return;
    }

    const facing = m23CellOfPoint(
      this.player.selector.x + 8,
      this.player.selector.y + 8,
    );

    const digLines = m23DigLines(selected, facing);

    controls.render({
      letter: selected.letter,
      approaching: selected.status === 'approaching',
      scanner: m23ScannerLines(selected),
      dig: digLines,
      tray: m23TrayLine(m23Series()),
    });

    // The controls guidance (the two pinned parts, then the cell-label help)
    // runs only while the selected plot is searching inside its fixed frame
    // (round 3, amendment OD-8a — either opening route reaches it).
    if (show && selected.status === 'searching' && this.m23FixedPlot !== null) {
      this.tickM23Guidance(digLines);
    }
  }

  private scanTarget(): { x: number; y: number } | null {
    if (m23FieldGoverns(this.player.x, this.player.y)) {
      const admission = m23FieldAdmit(
        'scan',
        {
          busy: isWorldActionActive(),
          cooling: this.scanController.isCoolingDown(),
          cell: null,
        },
        'keyboard',
        false,
      );

      return admission.admitted ? { x: this.player.x, y: this.player.y } : null;
    }

    if (this.scanController.isCoolingDown()) {
      return null;
    }

    return { x: this.player.x, y: this.player.y };
  }

  private digTarget(): { x: number; y: number } | null {
    const target = this.digController.getDigTarget();

    if (target === null) {
      return null;
    }

    if (m23FieldGoverns(this.player.x, this.player.y)) {
      const admission = m23FieldAdmit(
        'dig',
        {
          busy: isWorldActionActive(),
          cooling: false,
          cell: m23CellOfPoint(target.x, target.y),
        },
        'keyboard',
        false,
      );

      return admission.admitted ? target : null;
    }

    return target;
  }

  private performScan(mode: 'keyboard' | 'pointer') {
    const governs = m23FieldGoverns(this.player.x, this.player.y);

    if (this.scanController.performScan()) {
      this.player.playActionAnim('scan');
      playSheetEffect(
        this,
        'plv1-fx-scan-pulse',
        this.player.x,
        this.player.y - 8,
      );

      if (governs) {
        m23FieldStarted('scan', null, mode, Date.now());
      }
    }
  }

  private performDig(
    target: { x: number; y: number },
    mode: 'keyboard' | 'pointer',
  ) {
    const governs = m23FieldGoverns(this.player.x, this.player.y);

    if (this.digController.performDig(target)) {
      this.player.playActionAnim('dig');
      playSheetEffect(this, 'plv1-fx-dig-dust', target.x, target.y - 6);

      if (governs) {
        m23FieldStarted(
          'dig',
          m23CellOfPoint(target.x, target.y),
          mode,
          Date.now(),
        );
      }
    }
  }

  // ——— M24 / M26 — the expected-outcome check (Unit 12) ———

  /** The station's own text at the place the check is shown (the evidence above the stem). */
  private checkEvidence(source: 'rig_panel' | 'post_a' | 'line_panel'): string {
    switch (source) {
      case 'rig_panel':
        return M24_DEPLETION_STATEMENT;
      case 'post_a':
        return m26PostStatus(exteriorEpisode().m26, 'A');
      case 'line_panel':
        return M26_DISCONNECT_NOTICE;
    }
  }

  /** The station's body with the check's stem / explanation appended while it is the prompt. */
  private withCheckBody(item: 'M24' | 'M26', body: string): string {
    const check = this.checkPrompt;

    return check !== null &&
      check.item === item &&
      check.stage.body !== undefined
      ? `${body}\n\n${check.stage.body}`
      : body;
  }

  /**
   * Builds (and PRESENTS — the settle window starts) the check stage due
   * for an item: the question (attempt 1), the one explanation, or the
   * recheck (attempt 2, option order changed). Null when nothing is due.
   * Every option answers through the adapter; a press inside the settle
   * window is refused and the same stage re-presented in place; a wrong
   * first answer chains the explanation, whose "Continue" chains the
   * recheck; a decided check ends the prompt with one neutral line.
   */
  private buildCheckStage(
    item: 'M24' | 'M26',
    source: 'rig_panel' | 'post_a' | 'line_panel',
    chained = false,
  ): { item: 'M24' | 'M26'; stage: PromptStage } | null {
    const due = item === 'M24' ? m24CheckDue() : m26CheckDue();

    if (due === null) {
      return null;
    }

    const now = Date.now();
    const presented =
      item === 'M24'
        ? m24PresentCheck(due, now, source)
        : m26PresentCheck(due, now, source);

    if (!presented) {
      return null;
    }

    // A chained stage replaces the whole panel body, so an attempt stage
    // carries the station's own text itself (the first stage gets it from
    // the station's prompt body): every attempt shows the same evidence.
    const withEvidence = (text: string) =>
      chained ? `${this.checkEvidence(source)}\n\n${text}` : text;

    const question: UnderstandingQuestion =
      item === 'M24' ? M24_UNDERSTANDING_QUESTION : M26_UNDERSTANDING_QUESTION;
    const recorded = item === 'M24' ? M24_CHECK_RECORDED : M26_CHECK_RECORDED;
    const afterDecision = () => {
      this.refreshGuidance();
      this.refreshAllVisuals();
      refreshPilotCoverageProbe();
    };

    if (due === 'explanation') {
      return {
        item,
        stage: {
          body: question.explanation,
          options: [
            {
              label: 'Continue',
              feedback: '',
              getEventTypes: () => [],
              onSelected: () => {
                if (item === 'M24') {
                  m24DismissExplanation(Date.now(), 'keyboard');
                } else {
                  m26DismissExplanation(Date.now(), 'keyboard');
                }
              },
              nextStage: () =>
                this.buildCheckStage(item, source, true)?.stage ?? null,
            },
          ],
        },
      };
    }

    const options =
      item === 'M24' ? m24CheckOptions(due) : m26CheckOptions(due);
    let last: UnderstandingAnswer | null = null;

    return {
      item,
      stage: {
        body: withEvidence(question.stem),
        options: options.map((option) => ({
          label: option.label,
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            last =
              item === 'M24'
                ? m24AnswerCheck(option.id, Date.now(), 'keyboard')
                : m26AnswerCheck(option.id, Date.now(), 'keyboard');

            if (last.kind === 'answered' && !last.explanation_due) {
              this.showFeedbackMessage(recorded);
              afterDecision();
            }
          },
          // Refused (settling) → the same stage again; a wrong first answer
          // → the explanation; a decided check → the prompt ends.
          nextStage: () =>
            this.buildCheckStage(item, source, true)?.stage ?? null,
        })),
      },
    };
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

    // The check is the prompt while it is due (built at the open).
    if (this.checkPrompt?.item === 'M24') {
      return this.checkPrompt.stage.options;
    }

    const options: PromptOption[] = [];

    options.push(
      this.option('Check the panel', () => {
        this.showFeedbackMessage(
          magnetDeckDepleted()
            ? M24_DEPLETION_STATEMENT
            : `${m24PanelLine(state, false)} — cycles run from the operating pad (F).`,
        );
      }),
    );

    if (m24ContinuationLive()) {
      // The explicit exit of the continuation (never suggested).
      options.push(
        this.option('Finish at the rig', () => {
          this.showFeedbackMessage(
            m24Finish(Date.now(), 'keyboard')
              ? 'Salvage tally closed for this shift.'
              : 'The salvage tally is closed for this shift.',
          );
          this.refreshRigVisuals();
          this.refreshGuidance();
          refreshPilotCoverageProbe();
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
      onCancel: () => {
        this.benchInFlight = false;
      },
      onComplete: () => {
        this.benchInFlight = false;
        this.guard('M24', () => {
          m24Alternative(Date.now(), 'keyboard');
          this.showFeedbackMessage(
            'Recovered stock sorted — the bench log is up to date.',
          );
          refreshPilotCoverageProbe();
        });
      },
    });

    if (started) {
      this.benchInFlight = true;
    } else {
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

    // Post A: the check is the prompt while it is due (built at the open).
    if (channel === 'A' && this.checkPrompt?.item === 'M26') {
      return this.checkPrompt.stage.options;
    }

    const next = m26NextReportId();

    if (next !== null) {
      options.push(
        this.transmitOption(
          `Transmit: ${M26_REPORT_LABELS[next]}`,
          channel,
          site,
        ),
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

    if (channel === 'A' && m26ContinuationLive()) {
      // Another Post A transmission is offered at the post itself even
      // when both reports are delivered (a carrier check) — the choice to
      // retry, switch or finish is the participant's.
      if (next === null) {
        options.push(
          this.transmitOption('Transmit: carrier check', channel, site),
        );
      }

      options.push(
        this.option('Finish at the uplink', () => {
          this.showFeedbackMessage(
            m26Finish(Date.now(), 'keyboard')
              ? 'Uplink log closed for this shift.'
              : 'The uplink log is closed for this shift.',
          );
          this.refreshUplinkVisuals();
          this.refreshGuidance();
          refreshPilotCoverageProbe();
        }),
      );
    } else if (channel === 'A' && m26Disconnected(state)) {
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

  /**
   * A Transmit card. At Post A inside the continuation a press within the
   * settle window is refused; the post's options are then shown again in
   * place (never a silently closing prompt).
   */
  private transmitOption(
    label: string,
    channel: 'A' | 'B',
    site: { x: number; y: number },
  ): PromptOption {
    return {
      label,
      feedback: '',
      getEventTypes: () => [],
      onSelected: () => {
        this.postATransmitRefused = false;
        this.startTransmission(channel, site);
      },
      nextStage: () => {
        if (!this.postATransmitRefused) {
          return null;
        }

        this.postATransmitRefused = false;
        this.postAPromptOpenedAt = Date.now();

        return {
          body: this.getPromptBody('pilotUplinkA'),
          options: this.uplinkOptions('A'),
        };
      },
    };
  }

  /** The timed transmit act at a post (unchanged mechanics). */
  private startTransmission(
    channel: 'A' | 'B',
    site: { x: number; y: number },
  ) {
    if (!m26WindowOpen()) {
      // A stale card after the cap / the exit: nothing is sent.
      this.showFeedbackMessage('The uplink log is closed for this shift.');

      return;
    }

    if (
      channel === 'A' &&
      m26ContinuationLive() &&
      Date.now() - this.postAPromptOpenedAt < UNDERSTANDING_SETTLE_MS
    ) {
      // Transmit is the first (pre-focused) card: a carried or
      // double-tapped press inside the settle window is never an act.
      m26RefuseTransmit(Date.now(), 'prompt_settling', 'keyboard');
      this.postATransmitRefused = true;

      return;
    }

    const started = performWorldAction({
      scene: this,
      x: site.x,
      y: site.y - 30,
      label: 'Transmitting…',
      durationMs: M26_TRANSMIT_MS,
      cancellable: false,
      onComplete: () => {
        this.transmitInFlight = null;
        this.guard('M26', () => this.resolveTransmission(channel));
      },
    });

    if (started) {
      this.transmitInFlight = channel;
      this.player.playActionAnim('scan');
    }
  }

  private linePanelOptions(): PromptOption[] {
    if (this.checkPrompt?.item === 'M26') {
      return this.checkPrompt.stage.options;
    }

    return [this.option('Close')];
  }

  private resolveTransmission(channel: 'A' | 'B') {
    const transmission = m26Send(channel, Date.now(), 'keyboard');

    if (transmission === null) {
      // The window closed while the transmission ran (the cap): nothing
      // was recorded and nothing was sent — said plainly, never silent.
      this.showFeedbackMessage('The uplink log is closed for this shift.');
      this.refreshUplinkVisuals();

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

          // A Post A transmission started while the line was still up
          // resolves on the connected line: the disconnect waits for it
          // (it is rescheduled when that transmission resolves), so an
          // act begun before the boundary is never classified after it.
          if (this.transmitInFlight === 'A') {
            return;
          }

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
    // M11 (Unit 3): the torque driver's return point — after the three
    // spare options (their indices never move) and before Close.
    const custody: PromptOption[] = m11CarryingItem('yard')
      ? [
          this.option('Put the torque driver in the crate', () => {
            this.showFeedbackMessage(
              resolveM11(
                'yard',
                'return_point',
                'crate',
                Date.now(),
                'keyboard',
              )
                ? 'The torque driver is back in the crate.'
                : 'The torque driver is not with you.',
            );
          }),
        ]
      : [];

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
      ...custody,
      this.option('Close'),
    ];
  }

  // ————————————————————————————————— Noor ——

  private noorBeat(): PilotNpcBeat {
    switch (pilotStage()) {
      case 'exterior_briefing': {
        const body =
          // M23 (Unit 23, contract §13 R4): the excavation clause and ONE
          // appended neutral sentence; every other job's wording unchanged.
          `Noor: Storm damage, seven jobs — work them in this order: the frozen coolant coupling (west), Mast 04 (north), ${M23_TEXT.noor_clause}, the magnet rig in the Metal Recovery Yard (north-east), the station support console on the open field (south of the mast), the field sensor post (west field, south of the uplinks), then the uplink posts (north-west) for the two recovery reports.\n` +
          `Each site has its own panel (E). Scanner is C, spade is D, the rig is F. Come back to me when you are finished outside. ${M23_TEXT.noor_sentence}`;
        const ready = (loan: boolean | null) => () => {
          const now = Date.now();

          advancePilotStage('exterior_work', now);
          // M08 (U2-R): the console is presented by this briefing.
          presentM08(now);
          // M19 (Unit 21): so is the coupling panel — exposure only, never
          // an opening.
          presentM19(now);
          // M25 (Unit 4): so is the field sensor post.
          presentM25Loops(now);
          this.ensureFieldTools();

          // M11 (Unit 3): the plain "Ready." lets the loan lapse; taking or
          // refusing it are deliberate options (never the pre-focused one);
          // a full belt is told, never silent.
          if (loan === null) {
            lapseM11Offer('yard', now);
          } else {
            const result = answerM11Offer('yard', loan, now, 'keyboard');

            if (loan) {
              this.showFeedbackMessage(
                result === 'belt_full'
                  ? 'Belt full — the torque driver stays in the crate.'
                  : 'Torque driver taken — it is in your belt.',
              );
            }
          }

          this.refreshGuidance();
        };

        // M05 (Unit 6): every "Ready" is followed by the explicit offer of
        // the extra flag job (its own stage; the "Ready" options keep
        // their positions and meanings).
        const flagJob = () => this.flagJobOfferStage();

        if (!m11OfferAvailable('yard')) {
          return {
            body,
            options: [
              {
                label: 'Ready.',
                tag: 'yard_brief_ack',
                onSelected: ready(null),
                nextStage: flagJob,
              },
            ],
          };
        }

        presentM11Offer('yard', Date.now());

        return {
          body:
            body +
            '\nMy torque driver is in the supply crate on the apron — borrow it while you work out here if you like. It is mine: hand it back to me, or put it back in the supply crate, before you leave the yard.',
          options: [
            {
              label: 'Ready.',
              tag: 'yard_brief_ack',
              onSelected: ready(null),
              nextStage: flagJob,
            },
            {
              label: 'Ready — and I will take the driver.',
              tag: 'yard_brief_ack_loan_accept',
              onSelected: ready(true),
              nextStage: flagJob,
            },
            {
              label: 'Ready — no need for the driver.',
              tag: 'yard_brief_ack_loan_decline',
              onSelected: ready(false),
              nextStage: flagJob,
            },
          ],
        };
      }
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
              // M10 (Unit 15): once the shift end is recorded Noor asks
              // about the yard logbook (the plain feedback above is shown
              // only when the offer cannot run — held back after a reload).
              nextStage: () => this.logbookOfferStage(false),
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

  /**
   * M05 occasion 2 (Unit 6): the explicit offer of the extra flag job
   * right after Noor's "Ready" (the briefing chain's end), so acceptance
   * is followed by a usable start opportunity. Accepting and declining
   * are both deliberate; a press inside the settle window after the stage
   * appears is refused by the model and the stage re-presented in place.
   */
  private m05LastAnswer:
    | 'accepted'
    | 'declined'
    | 'refused'
    | 'invalid'
    | null = null;

  private flagJobOfferStage(): PromptStage | null {
    if (!m05OfferAvailable('o2') || !presentM05Offer('o2', Date.now())) {
      return null;
    }

    const answer = (accepted: boolean, position: number) => () => {
      this.m05LastAnswer = answerM05Offer(
        'o2',
        accepted,
        position,
        Date.now(),
        'keyboard',
        // Entry-state covariates (review U6 S-F3): the loan carried into
        // the window; the supply crate (its return point) stands beside
        // the flag.
        { m11_driver_carried: m11CarryingItem('yard') },
      );
    };
    const again = () =>
      this.m05LastAnswer === 'refused' ? this.flagJobOfferStage() : null;

    return {
      body: 'Noor: One small extra, if you want it — the guy-line flag on the airlock apron has come loose (east of the supply crate). It takes a moment at the flag. Will you take it?',
      options: this.npcBeatOptions('pilotNoor', {
        body: '',
        options: [
          {
            label: 'Yes — I will take the flag job.',
            tag: 'flag_job_accept',
            feedback: 'Noor: Thanks. The flag is east of the crate.',
            onSelected: answer(true, 1),
            nextStage: again,
          },
          {
            label: 'No — leave the flag job.',
            tag: 'flag_job_decline',
            feedback: 'Noor: Understood.',
            onSelected: answer(false, 2),
            nextStage: again,
          },
        ],
      }),
    };
  }

  /**
   * M10 delivery 2 (Unit 15): Noor's explicit, voluntary offer of the
   * yard logbook — accept, decline or later, all deliberate and
   * settle-guarded; every read answer sends the participant back inside.
   * Asked again (same terms) from Noor's deliveries menu while unanswered.
   */
  private logbookOfferStage(reask: boolean): PromptStage | null {
    return this.deliveryOfferStage('pilotNoor', 'd2', {
      body: reask ? M10_D2_REASK_BODY : M10_OFFER_BODY.d2,
      feedback: M10_D2_ANSWER_FEEDBACK,
      after: () => null,
    });
  }

  protected deliveryReask(
    delivery: M10Delivery,
  ): { label: string; stage: () => PromptStage | null } | null {
    return delivery === 'd2'
      ? {
          label: M10_D2_REASK_LABEL,
          stage: () => this.logbookOfferStage(true),
        }
      : null;
  }

  /**
   * M10 (Unit 15): Noor may agree to carry the key card, and asks again
   * about a deferred logbook, from the outside work onwards — never
   * inside her briefing.
   */
  protected deliveryPersonsHere(): M10Person[] {
    return pilotStageAtOrAfter('exterior_work') ? ['noor'] : [];
  }

  /** The ONE interruption point: the required return duty begins. */
  private finishOutside() {
    const now = Date.now();

    // M05 (Unit 6): the shift end exits an unstarted accepted flag job (a
    // started one keeps its latency; the work cycle as it stands).
    exitM05('o2', now, 'shift_ended');

    // M23 (Unit 23, decision D2): Noor's command is the participant's —
    // its device and the sequence of the beat record just written are the
    // source the series needs to resolve an informed shift-end response.
    const events = researchRuntime.getEvents();
    const beat = events[events.length - 1];
    const input = this.observedInput().input_mode;

    noteM23ShiftEndSource({
      participant_initiated: true,
      origin_input_mode: input === 'pointer' ? 'pointer' : 'keyboard',
      shift_end_command_id: 'noor_finished_outside',
      shift_end_sequence:
        beat !== undefined && typeof beat.sequence === 'number'
          ? beat.sequence
          : null,
    });
    endExteriorShift(now);
    // M19 (Unit 21): an opened, unfinished series closes as it stands
    // (`shift_ended`); a presented, never-opened panel records its closure.
    closeM19AtShiftEnd(now);
    closeM08AtShiftEnd(now);
    // M25 (Unit 4): the loops close with the shift — the belief question
    // becomes due once this recorded closure exists (never on a score).
    closeM25LoopsAtShiftEnd(now);
    this.refreshM23();
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

  /**
   * A C press with no eligible target. Where M23 governs (a plot is
   * selected, or the avatar stands inside a plot) the refusal is the
   * series' own record and copy; elsewhere the scanner's cooldown line.
   */
  private onScanIneligiblePress(mode: 'keyboard' | 'pointer'): void {
    if (m23FieldGoverns(this.player.x, this.player.y)) {
      const admission = m23FieldAdmit(
        'scan',
        {
          busy: isWorldActionActive(),
          cooling: this.scanController.isCoolingDown(),
          cell: null,
        },
        mode,
      );

      if (admission.copy !== null) {
        this.m23Feedback(admission.copy);
      }

      return;
    }

    if (this.scanController.isCoolingDown()) {
      this.scanController.showCooldownFeedback();
    }
  }

  private onDigIneligiblePress(mode: 'keyboard' | 'pointer'): void {
    const cell = this.digRegistry.resolveCell(
      this.player.selector.x + 8,
      this.player.selector.y + 8,
    );

    if (m23FieldGoverns(this.player.x, this.player.y)) {
      const admission = m23FieldAdmit(
        'dig',
        { busy: isWorldActionActive(), cooling: false, cell },
        mode,
      );

      if (admission.copy !== null) {
        this.m23Feedback(admission.copy);
      }

      return;
    }

    this.digController.handleIneligiblePress();
  }

  private onScanResolved(record: ScanRecord): void {
    logSecondaryFieldAction('scan', { ...record });

    // M23 (Unit 23): a scan the series started resolves on its own token;
    // the controller's reading is kept beside the recount.
    if (m23ActionPending()) {
      m23FieldScanResolved(record.strength, Date.now());
    }
  }

  private onDigResolved(record: DigRecord): void {
    logSecondaryFieldAction('dig', { ...record });

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

    // M23 (Unit 23): a dig the series started resolves on its own token —
    // the first empty new cell is the plot's genuine failure (its panel
    // opens), the keyed cell its recovery (the tray).
    if (m23ActionPending()) {
      m23FieldDigResolved(Date.now());
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

  /** Unit 7 (V19): mast art follows the restoration state; a slow two-frame
   * signal pulse once the antenna is restored (reduced motion: held). */
  private refreshMastArt() {
    const beacon = this.mastBeacon;

    if (beacon === undefined) {
      return;
    }

    // The crown beacon lights only once the WHOLE restoration (outdoor
    // stages AND the indoor alignment — every M20 raw component written)
    // is complete; never while the chip reads ALIGNMENT PENDING
    // (scientific review S-M2).
    const state = exteriorEpisode().m20;
    const restored = state.accepted && m20Complete(state);

    if (!restored) {
      beacon.setFillStyle(0x33475a, 1).setScale(1);

      return;
    }

    if (prefersReducedMotion()) {
      beacon.setFillStyle(0x5fd3c4, 1).setScale(1.25);

      return;
    }

    // A slow signal pulse (period 2.8 s; never a flash).
    this.mastPulseMs = (this.mastPulseMs + this.game.loop.delta) % 2800;
    beacon
      .setFillStyle(0x5fd3c4, 1)
      .setScale(this.mastPulseMs < 2200 ? 1.25 : 1.6);
  }

  protected onPilotUpdate(): void {
    this.tickContinuations();
    // M23 (Unit 23): the approach samples and the region entry / exit of
    // the selected plot, then the HUD readouts (the facing cell changes
    // every frame).
    m23FieldTick(Date.now());
    this.renderM23Controls();
    this.drawM23Facing();
    this.refreshMastArt();

    // Contract §13 R2: while this scene owns a fixed frame the mast chip is
    // explicitly hidden AND omitted from the clamp on every frame; after
    // the frame ends the full list and the current proximity decide.
    if (this.m23FixedPlot !== null) {
      this.mastChip?.setVisible(false);
    }

    this.clampWorldReadouts(this.m23ChipList());

    // M05 occasion 2 (Unit 6): the focused clock starts at the first
    // moment after acceptance with no prompt, transition or world action
    // holding the yard (a paused host is handled by the pause/resume
    // hooks), pauses while any returns, and the cap closes a non-start.
    const flag = YARD_SITES.cableFlag;
    const worldAction = isWorldActionActive();

    pollM05(
      'o2',
      Date.now(),
      {
        prompt: !this.physicalInputEligible() && !worldAction,
        worldAction,
      },
      Math.hypot(this.player.x - flag.x, this.player.y - flag.y),
    );

    const job = m05State('o2');

    this.cableFlag?.setVisible(
      job.accepted === true && job.work_completed_at_ms === null,
    );

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
    const now = Date.now();

    // M23 (Unit 23): a running scan or dig cancels (`yard_departure`)
    // before the transition; the departure itself pauses the selection.
    m23FieldCancel('yard_departure', now);
    this.m23Controls?.release();

    // M05 (Unit 6): leaving the yard exits an unstarted accepted flag job.
    exitM05('o2', now, 'room_left');

    // M11 (Unit 3): the first departure from the yard freezes the custody.
    departM11('yard', now);
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

  /**
   * M24 / M26 (Unit 12): the post-knowledge continuations run on focused
   * time; the cap is a censoring event the host notices here (a cycle or
   * a transmission still running at the cap is recorded, never counted).
   */
  private tickContinuations(): void {
    const now = Date.now();

    if (
      m24ContinuationLive() &&
      this.safeTick('M24', () =>
        m24TickContinuation(
          now,
          !['idle', 'cooldown'].includes(this.magnet.getPhase()),
          this.benchInFlight,
        ),
      )
    ) {
      this.showFeedbackMessage('The salvage tally is closed for this shift.');
      this.refreshRigVisuals();
      this.refreshGuidance();
      refreshPilotCoverageProbe();
    }

    if (
      m26ContinuationLive() &&
      this.safeTick('M26', () =>
        m26TickContinuation(
          now,
          this.transmitInFlight === 'A',
          this.transmitInFlight === 'B',
        ),
      )
    ) {
      this.showFeedbackMessage('The uplink log is closed for this shift.');
      this.refreshUplinkVisuals();
      this.refreshGuidance();
      refreshPilotCoverageProbe();
    }
  }

  /**
   * A per-frame tick must never throw: an uncaught error inside the frame
   * callback would stop the game loop. The window is closed as a technical
   * failure (which also ends its ticks) and the error is reported.
   */
  private safeTick(item: 'M24' | 'M26', fn: () => boolean): boolean {
    try {
      return fn();
    } catch (error) {
      exteriorTechnicalFailure(
        item,
        error instanceof Error ? error.message : String(error),
      );
      // eslint-disable-next-line no-console
      console.error(`[${item}] continuation tick failed`, error);

      return false;
    }
  }

  /** Runtime errors inside a window become technical failures (invalid). */
  private guard(item: 'M20' | 'M23' | 'M24' | 'M26', fn: () => void) {
    try {
      fn();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);

      if (item === 'M20') {
        // Unit 22: Mast 04 is unmeasured outdoor preparation of the Workshop
        // feed console — a fault here is recorded on the outdoor phase and
        // never invalidates the console's opportunity.
        m20OutdoorFault(detail);
      } else {
        exteriorTechnicalFailure(item, detail);
      }

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
    this.redrawPlotOutlines();
    this.refreshRigVisuals();
    this.refreshUplinkVisuals();
  }

  /**
   * M19 (Unit 21): the coupling's world readout is NEUTRAL — the painted
   * dial keeps its static arc without a progress needle, the frost sheet
   * stays hidden and the chip names the panel; nothing in the world shows
   * an unfinished, restored or evaluative state (no cue back to a line).
   */
  private refreshCouplingVisuals() {
    const site = YARD_SITES.coupling;

    if (this.couplingDial !== undefined) {
      const dial = this.couplingDial;
      // World V2: the dial sits over the painted valve wheel's crown.
      const cx = site.x - 52;
      const cy = site.y - 66;

      dial.clear();
      dial.lineStyle(3, 0x33475a, 1);
      dial.arc(cx, cy, 13, -Math.PI * 0.75, Math.PI * 0.75, false);
      dial.strokePath();
    }

    this.frostOverlay?.setVisible(false);
    this.couplingChip?.setText('COUPLING PANEL');
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

    // World V2: the stage marks sit on the painted footing (base clamp)
    // and run up the painted tower to its crown (feed line).
    if (state.stages_done.includes('clear_base_clamp')) {
      this.mastFeed.lineStyle(2, 0x5fd3c4, 0.9);
      this.mastFeed.strokeCircle(site.x - 18, site.y - 26, 9);
    }

    if (state.stages_done.includes('seat_feed_line')) {
      this.mastFeed.lineStyle(2, 0xe6c68f, 1);
      this.mastFeed.lineBetween(
        site.x - 18,
        site.y - 26,
        tower.x + 2,
        tower.y + 10,
      );
    }
  }

  /**
   * M23 (Unit 23): the two plot outlines — a dashed boundary per plot, the
   * selected searching plot's cells outlined so every one of its 42 cells
   * reads in the fixed frame; the other plot keeps its faint boundary.
   */
  private redrawPlotOutlines(): void {
    this.plotOverlay?.destroy();

    const graphics = this.add.graphics().setDepth(DepthLayer.FloorMarking);
    const selected = m23SelectedPlot();

    for (const def of M23_PLOTS) {
      const active =
        selected !== null &&
        selected.id === def.id &&
        selected.status === 'searching';
      // The selected plot's outline is emphasised while approaching too, so
      // the participant can tell which outline the opened plot is (the
      // gameplay review's M5; presentation only, no copy).
      const emphasised =
        active ||
        (selected !== null &&
          selected.id === def.id &&
          selected.status === 'approaching');
      const rect = m23PlotRect(def.bounds);
      const x0 = rect.x0;
      const y0 = rect.y0;
      const w = rect.x1 - rect.x0;
      const h = rect.y1 - rect.y0;

      graphics.lineStyle(emphasised ? 2 : 1, 0x5fd3c4, emphasised ? 0.9 : 0.35);

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

      if (active) {
        graphics.lineStyle(1, 0x5fd3c4, 0.3);

        for (const cell of m23PlotCells(def.bounds)) {
          graphics.strokeRect(cell.col * TILE, cell.row * TILE, TILE, TILE);
        }
      }
    }

    this.plotOverlay = graphics;
  }

  /** The highlighted facing cell inside the selected searching plot (every frame). */
  private drawM23Facing(): void {
    const graphics = this.m23Facing;

    if (graphics === undefined) {
      return;
    }

    graphics.clear();

    const selected = m23SelectedPlot();

    if (selected === null || selected.status !== 'searching') {
      return;
    }

    const cell = m23CellOfPoint(
      this.player.selector.x + 8,
      this.player.selector.y + 8,
    );
    const inside =
      cell.col >= selected.def.bounds.minCol &&
      cell.col <= selected.def.bounds.maxCol &&
      cell.row >= selected.def.bounds.minRow &&
      cell.row <= selected.def.bounds.maxRow;

    if (!inside) {
      return;
    }

    graphics.lineStyle(2, 0xe6c68f, 0.95);
    graphics.strokeRect(
      cell.col * TILE + 2,
      cell.row * TILE + 2,
      TILE - 4,
      TILE - 4,
    );
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
        // M23 (Unit 23): a plot is in work (the series' own probe is
        // `window.__m23PlotsProbe`).
        m23_open: m23SelectedPlot()?.status === 'searching',
        m24_open: m24WindowOpen(),
        m26_phase: m26Knowledge(episode.m26),
      },
      caches: this.caches.serialize(),
    };
    // Unit 23 (V01–V06): the world-readout chips' actual visibility and
    // bounds, read-only.
    const chips: [string, Phaser.GameObjects.Text | undefined][] = [
      ['coupling', this.couplingChip],
      ['mast', this.mastChip],
      ['rig', this.rigChip],
      ['line_a', this.lineAChip],
      ['line_b', this.lineBChip],
    ];

    // Round 4: the base scene's floating station prompt's ACTUAL
    // design-space bounds (the one visible HUD-space text carrying the
    // prompt probe's line), read-only, so the frames' sidecars can place a
    // foreign prompt against the field HUD and the plot.
    const promptText = window.__worldPromptProbe?.text ?? null;
    const promptObject =
      promptText === null
        ? undefined
        : (this.children.list.find(
            (object) =>
              object instanceof Phaser.GameObjects.Text &&
              object.visible &&
              object.depth === Depth.AboveWorld &&
              object.text === promptText,
          ) as Phaser.GameObjects.Text | undefined);
    const promptBounds = promptObject?.getBounds();

    window.__yardPromptProbe =
      promptBounds === undefined
        ? null
        : {
            text: promptText,
            bounds: {
              x: promptBounds.x,
              y: promptBounds.y,
              w: promptBounds.width,
              h: promptBounds.height,
            },
          };
    window.__yardChipProbe = chips.map(([id, chip]) => {
      const bounds = chip?.active ? chip.getBounds() : null;

      return {
        id,
        text: chip?.text ?? '',
        visible: chip?.active === true && chip.visible,
        bounds:
          bounds === null
            ? null
            : {
                left: bounds.left,
                top: bounds.top,
                right: bounds.right,
                bottom: bounds.bottom,
              },
      };
    });
    window.__exteriorProbe = {
      ...exteriorProbeSnapshot(),
      stage: pilotStage(),
      m05: m05Probe('o2'),
      // M19 (Unit 21): the coupling panel's window and the line in work
      // (read-only; the legacy `m19` block above is the untouched v2 state).
      m19_panel: {
        window: m19Window.windowStatus(),
        exit: m19Window.exit(),
        line_in_work: m19LineInWorkId(),
      },
    };
  }
}
