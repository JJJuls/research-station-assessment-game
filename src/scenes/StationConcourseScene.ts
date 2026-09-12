/**
 * Station Concourse — the hub of the evidence-led pilot v2. Episode 1
 * (Storm Arrival & Incident Handover) and the return check-in of episode 5
 * happen here (Unit 2).
 *
 * Episode-1 windows (ledger): M01 plan board, M05 initiation occasion 1
 * (the flickering desk lamp — nobody mentions it), M09 monitor watch
 * (offered by Vale; two gauge checks), M10 component promise (offered by
 * Vale; standardised interruption), M12 quality packet 1, M14 incident
 * desk. Every packet is its own object on the work surface; completing one
 * never gates another. Doors are always bidirectional.
 *
 * World V2 rescue: a 22×12 painted-plate hall — the plate
 * (`w2-concourse-plate`) bakes the architecture, all four doorways, the
 * plan board, Vale's operations desk, the north-east work table (the
 * quality packet) and the reading table with its green lamp (the M05
 * fault). The incident desk and monitor gauge are layered sprites; the
 * status-wall sector lamps are a mounted panel. No window, event, form
 * or option changed.
 */
import Phaser from 'phaser';

import { DepthLayer, key, worldDepth } from '../constants';
import {
  beginManualWorldAction,
  endManualWorldAction,
} from '../gameplay/actions';
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
  type RestorationState,
  STATUS_WALL_SECTORS,
} from '../pilot/storyState';
import {
  activeWorkSurface,
  openWorkSurface,
} from '../pilot/ui/WorkSurfaceScene';
import {
  closeM01Surface,
  declareM01,
  m01Window,
  openM01,
  resumeM01Surface,
} from '../pilot/windows/m01PlanBoard';
import {
  censorM05,
  completeM05Fix,
  declareM05,
  initiateM05,
  m05Open,
  m05Presented,
  presentM05,
} from '../pilot/windows/m05Initiation';
import {
  answerM09Offer,
  closeM09Check,
  declareM09,
  m09Accepted,
  m09Check2Due,
  m09State,
  noteM09NpcMention,
  openM09Check2,
  presentM09Offer,
  readM09Gauge,
} from '../pilot/windows/m09MonitorWatch';
import {
  answerM10Offer,
  declareM10,
  handOverM10,
  M10_COMPONENT_LABEL,
  M10_INTERRUPTION_TEXT,
  m10Carrying,
  m10State,
  noteM10InterruptionAcknowledged,
  noteM10InterruptionShown,
  noteM10KaiEncounter,
  presentM10Offer,
} from '../pilot/windows/m10ComponentPromise';
import {
  closeM12Surface,
  declareM12,
  m12Windows,
  openM12,
  resumeM12Surface,
} from '../pilot/windows/m12QualityControl';
import {
  closeM14Surface,
  declareM14,
  m14Window,
  openM14,
  resumeM14Surface,
} from '../pilot/windows/m14IncidentDesk';
import {
  m01SurfaceModel,
  m12SurfaceModel,
  m14SurfaceModel,
} from '../pilot/windows/surfaceModels';
import { CONCOURSE_SPAWNS, CONCOURSE_STATIONS } from '../pilot/zoneSites';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
} from '../world';
import { KIT_INDICATOR } from '../world/kit/kitTextures';
import { CONCOURSE_LAYOUT } from '../world/layouts/concourse';

const TILE = 32;
const M05_FIX_MS = 2000;

/**
 * Monitor gauge readings (Unit 5): the monitored loop drifts while the
 * participant is outside, so the return reading is a visibly CHANGED
 * operational state — the physical consequence the second check reads.
 * Values only; no directive, no reminder. World V1: the reading is shown
 * on the gauge read (E), never as a permanent ribbon.
 */
const GAUGE_READING = {
  before: 'loop 1.6 bar · bus 26.8 V · relay LOCK',
  after: 'loop 1.4 bar ▼ · bus 26.1 V ▼ · relay LOCK',
} as const;

declare global {
  interface Window {
    /**
     * DEV-only, read-only restoration probe (U2): the lighting state and
     * the six status-wall sectors as the story state derives them.
     */
    __restorationProbe?: {
      lighting: RestorationState;
      sectors: Record<string, RestorationState>;
    } | null;
  }
}

/** Status-wall lamp colour per restoration state (plus a glyph — never colour alone). */
const RESTORATION_LAMP: Record<RestorationState, number> = {
  damaged: KIT_INDICATOR.inactive,
  recovering: KIT_INDICATOR.caution,
  restored: KIT_INDICATOR.restored,
};

export class StationConcourseScene extends PilotZoneScene {
  protected readonly roomId = 'station_concourse';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'station_concourse' as const;

  private lampFlicker: Phaser.GameObjects.Rectangle | null = null;
  private statusLamps: Phaser.GameObjects.Rectangle[] = [];
  /** Restored-sector tick bars under the lamps (glyph cue). */
  private statusTicks: Phaser.GameObjects.Rectangle[] = [];
  /** Work-area light pools (cold emergency → warm from act 3). */
  private workPools: Phaser.GameObjects.Image[] = [];
  /** Storm damage dressing (hidden once the utility feeds are restored). */
  private damageDressing: Phaser.GameObjects.GameObject[] = [];
  /** The repaired panel shown in its place. */
  private repairDressing: Phaser.GameObjects.GameObject[] = [];
  /** Restoration shape `operations-service-lamp`: the counter's back wall. */
  private statusPanel: Phaser.GameObjects.Image | null = null;
  private serviceLamps: Phaser.GameObjects.Image[] = [];
  private stripLights: Phaser.GameObjects.Image[] = [];

  /** The return leg of the route (episode 5) is live. */
  private returned(): boolean {
    return pilotStageAtOrAfter('return_hub');
  }

  private gaugeReading(): string {
    return this.returned() ? GAUGE_READING.after : GAUGE_READING.before;
  }

  constructor() {
    super(key.scene.stationConcourse);
  }

  protected getLayout(): RoomLayout {
    return {
      theme: 'hub',
      grid: [...CONCOURSE_LAYOUT],
      field: 'wide',
      plateTexture: 'w2-concourse-plate',
    };
  }

  protected bundleDropBounds(): { width: number; height: number } {
    return { width: 22 * TILE, height: 12 * TILE };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    switch (data?.spawn) {
      case 'diagnostics_laboratory':
        return CONCOURSE_SPAWNS.fromLaboratory;
      case 'utility_core_deck':
        return CONCOURSE_SPAWNS.fromDeck;
      case 'records_workshop':
        return CONCOURSE_SPAWNS.fromRecords;
      case 'dock':
      default:
        return CONCOURSE_SPAWNS.fromDock;
    }
  }

  create(data?: { spawn?: string }) {
    declareM01();
    declareM05('o1');
    declareM09();
    declareM10();
    declareM12('o1');
    declareM14();
    stampContaminationNotes();

    super.create(data);

    // Return milestone: the second gauge check becomes due on the return.
    if (pilotStageAtOrAfter('return_hub')) {
      openM09Check2(Date.now());
    }

    this.events.on('resume', () => {
      const now = Date.now();

      resumeM01Surface(now);
      resumeM12Surface('o1', now);
      resumeM14Surface(now);
    });
    refreshPilotCoverageProbe();
  }

  protected populateRoom(): void {
    // Scene instances are re-created on every entry (create() re-runs on
    // the same object): the presentation collections must start empty,
    // or a later stage change would drive destroyed objects (observed:
    // setTexture on a light pool from a previous visit threw on the route).
    this.statusLamps = [];
    this.statusTicks = [];
    this.workPools = [];
    this.damageDressing = [];
    this.repairDressing = [];
    this.statusPanel = null;
    this.serviceLamps = [];
    this.stripLights = [];
    this.lampFlicker = null;

    this.addPilotDoor({
      to: 'dock',
      spawn: 'station_concourse',
      registryId: 'concourse.door_dock',
    });
    this.addPilotDoor({
      to: 'records_workshop',
      spawn: 'station_concourse',
      registryId: 'concourse.door_records',
    });
    this.addPilotDoor({
      to: 'diagnostics_laboratory',
      spawn: 'station_concourse',
      registryId: 'concourse.door_lab',
    });
    this.addPilotDoor({
      to: 'utility_core_deck',
      spawn: 'station_concourse',
      registryId: 'concourse.door_deck',
    });

    const S = CONCOURSE_STATIONS;

    // ——— Architecture first (ROOM-BLOCKOUTS.md §2) ———
    this.buildArchitecture();

    // ——— Vale — operations desk (anchor NPC) ———
    this.addNpc({
      interactionKey: 'pilotVale',
      label: 'Vale',
      verb: 'Talk to',
      registryId: 'concourse.vale',
      npcName: 'Vale — operations',
      texture: 'plv1-vale',
      workFrames: ['plv1-vale', 'plv1-vale-b'],
      x: S.vale.x,
      y: S.vale.y,
    });
    registerPilotStation({
      id: 'npc_vale',
      zone: 'station_concourse',
      x: S.vale.x,
      y: S.vale.y,
      label: 'Vale',
      stages: ['handover_briefing', 'incident_handover', 'return_hub'],
      isDone: () => false,
      order: 0,
    });

    // ——— Kai on the return shift (handover recipient beside the desk) ———
    if (pilotStageAtOrAfter('return_hub')) {
      this.addNpc({
        interactionKey: 'pilotKai',
        label: 'Kai',
        verb: 'Talk to',
        registryId: 'concourse.kai_return',
        npcName: 'Kai — diagnostics',
        texture: 'plv1-kai',
        workFrames: ['plv1-kai-work-a', 'plv1-kai-work-b'],
        x: S.kaiReturn.x,
        y: S.kaiReturn.y,
      });
    }

    // ——— Episode-1 work surfaces, integrated into the architecture ———
    this.surfaceStation(
      'plan_board',
      'incident plan board',
      'Open',
      'concourse.plan_board',
      'w1-plan-board',
      S.planBoard,
      1,
      () => m01Window.isClosed(),
      () => {
        openM01(Date.now());
        openWorkSurface(this, {
          surfaceId: 'm01_plan_board',
          model: () => m01SurfaceModel(this.surfaceHost()),
          onClose: () => closeM01Surface(Date.now()),
        });
      },
    );
    this.surfaceStation(
      'qc_packet_o1',
      'quality packet',
      'Check the',
      'concourse.qc_packet_o1',
      'w1-qc-counter',
      S.qcPacket,
      2,
      () => m12Windows.o1.isClosed(),
      () => {
        openM12('o1', Date.now());
        openWorkSurface(this, {
          surfaceId: 'm12_qc_packet_o1',
          model: () => m12SurfaceModel('o1', this.surfaceHost()),
          onClose: () => closeM12Surface('o1', Date.now()),
        });
      },
    );
    this.surfaceStation(
      'incident_desk',
      'incident desk',
      'Work the',
      'concourse.incident_desk',
      'w1-evidence-desk',
      S.incidentDesk,
      3,
      () => m14Window.isClosed(),
      () => {
        openM14(Date.now());
        openWorkSurface(this, {
          surfaceId: 'm14_incident_desk',
          model: () => m14SurfaceModel(this.surfaceHost()),
          onClose: () => closeM14Surface(Date.now()),
        });
      },
    );

    // ——— Monitor gauge (M09 checks) — always readable ———
    this.addStation({
      interactionKey: 'pilotStation',
      label: 'monitor gauge',
      verb: 'Read the',
      registryId: 'concourse.monitor_gauge',
      texture: 'w1-gauge',
      x: S.monitorGauge.x,
      y: S.monitorGauge.y,
      onPromptOpened: () => {
        this.logStationOpened('monitor_gauge');
        readM09Gauge(Date.now(), 'keyboard');
        this.showFeedbackMessage(`Gauge read: ${this.gaugeReading()}.`);
        return false;
      },
    });

    // ——— Reading-desk lamp fault (M05 occasion 1) — never mentioned ———
    this.addStation({
      interactionKey: 'pilotStation',
      label: 'desk lamp',
      verb: 'Use',
      // A silent fault carries no standing indicator lamp (scientific review).
      indicator: 'none',
      registryId: 'concourse.reading_desk_lamp',
      texture: 'w1-reading-desk',
      x: S.concourseFault.x,
      y: S.concourseFault.y,
      onPromptOpened: () => {
        this.logStationOpened('desk_lamp');

        if (!m05Open('o1')) {
          this.showFeedbackMessage(
            m05Presented('o1') ? 'Lamp steady.' : 'Lamp steady.',
          );
          return false;
        }

        if (initiateM05('o1', Date.now(), 'keyboard')) {
          // Manual world-action bracket: the avatar holds still and no
          // prompt opens for the neutral 2 s fix. The bracket MUST be
          // ended (D-V2-4 fix: it never was, so every later interaction
          // and all movement on the Concourse stayed frozen) — on the
          // timer, and on scene shutdown if the participant leaves first.
          beginManualWorldAction();

          const endBracket = () => {
            endManualWorldAction();
            this.events.off('shutdown', endBracket);
          };

          this.events.once('shutdown', endBracket);
          this.time.delayedCall(M05_FIX_MS, () => {
            completeM05Fix('o1', Date.now(), 'keyboard');
            endBracket();
            this.lampFlicker?.setVisible(false);
            this.showFeedbackMessage('Lamp connector reseated.');
          });
        }

        return false;
      },
    });
    // The lamp head on the reading desk: the flicker IS the fault. The
    // green lamp is baked into the plate at (96, 238); the flicker
    // rectangle sits on its shade.
    this.lampFlicker = this.add
      .rectangle(
        S.concourseFault.x - 28,
        S.concourseFault.y - 2,
        10,
        5,
        0xe6c68f,
        0.9,
      )
      .setDepth(DepthLayer.WorldReadout)
      .setVisible(false);

    // World V2: the plan board, the quality-packet table and the reading
    // desk are baked into the painted plate — hide their sprite markers
    // (interactions, prompts and events untouched). The incident desk and
    // the monitor gauge remain layered sprites.
    for (const child of this.children.list) {
      if (
        child instanceof Phaser.GameObjects.Image &&
        ['w1-plan-board', 'w1-qc-counter', 'w1-reading-desk'].includes(
          child.texture.key,
        )
      ) {
        child.setVisible(false);
      }
    }

    this.refreshStatusWall();
  }

  /**
   * World V2 rescue hub: the painted plate IS the architecture — the
   * riveted walls, all four doorways (Lab recess and Dock hatch baked;
   * Records and Deck doors inpainted into the side walls), the plan
   * board, lockers, the north-east work table, the operations desk, the
   * reading table with its green lamp, hanging cone lamps and the worn
   * deck with its painted walkway lines. This method layers only the
   * DYNAMIC pieces: hidden marker art over baked interactables, the
   * status-wall lamps, the work-area light pools and the storm-damage
   * dressing. Presentation only — no interaction geometry beyond the
   * registry, no collision beyond the layout.
   */
  private buildArchitecture() {
    const lit = this.lightPoolTexture();

    // ——— Thresholds: every leaf is baked/inpainted into the plate ———
    for (const registryId of [
      'concourse.door_dock',
      'concourse.door_records',
      'concourse.door_lab',
      'concourse.door_deck',
    ]) {
      this.doorImage(registryId)?.setVisible(false);
    }

    // ——— Status wall (story landmark): a mounted sector panel on the
    // north wall face right of the Laboratory door — its own dark
    // backdrop so it reads over the baked pipework ———
    const statusWall = { x: 412, y: 78 };

    this.statusPanel = null;
    this.add
      .rectangle(statusWall.x, statusWall.y, 100, 34, 0x161e27, 1)
      .setStrokeStyle(1, 0x39465a)
      .setDepth(DepthLayer.WorldReadout - 0.02);
    this.add
      .text(statusWall.x - 42, statusWall.y - 13, 'STATION SECTORS', {
        color: '#8fa0af',
        font: '7px monospace',
        resolution: 3,
      })
      .setDepth(DepthLayer.WorldReadout - 0.01);
    for (let i = 0; i < STATUS_WALL_SECTORS.length; i += 1) {
      const x = statusWall.x - 33 + i * 13;
      const y = statusWall.y + 4;

      this.statusLamps.push(
        this.add
          .rectangle(x, y, 6, 4, KIT_INDICATOR.inactive, 1)
          .setDepth(DepthLayer.WorldReadout),
      );
      // Restored glyph: a short bar under the lamp (state never by colour alone).
      this.statusTicks.push(
        this.add
          .rectangle(x, y + 5, 6, 2, KIT_INDICATOR.restored, 1)
          .setDepth(DepthLayer.WorldReadout)
          .setVisible(false),
      );
    }

    // ——— Work-area light pools (cold emergency → warm from act 3),
    // under the plate's three baked cone lamps ———
    for (const [x, y, alpha] of [
      [168, 150, 0.55], // plan-board district lamp
      [340, 160, 0.5], // the crossing
      [512, 170, 0.7], // operations desk lamp
      // (no pool at the reading desk: the M05 lamp's surroundings keep
      // their pre-U2 salience — scientific review F2)
    ] as const) {
      const pool = this.addFloorDecal(x, y, lit, alpha);

      if (pool !== null) {
        this.workPools.push(pool);
      }
    }

    // ——— Storm evidence: a scorch and a fallen panel fragment by the
    // north wall, patched once the feeds are restored ———
    for (const decal of [
      this.addFloorDecal(248, 110, 'kit-scorch'),
      this.addFloorDecal(240, 122, 'w1-debris-panel'),
    ]) {
      if (decal !== null) {
        this.damageDressing.push(decal);
      }
    }

    const patch = this.addGroundInfra(248, 96, 'w1-junction-box');

    if (patch !== null) {
      patch.setVisible(false);
      this.repairDressing.push(patch);
    }
  }

  /**
   * Station-status wall (presentation; STORY-STATE-SPEC.md §4). U1 mirrors
   * the two states the V4 strip carried — storm recovery vs. the exterior
   * shift logged; U2 wires the full restoration model.
   */
  private refreshStatusWall() {
    this.onStoryStateChanged();
  }

  /**
   * Restoration presentation (STORY-STATE-SPEC §4, U2): every state is a
   * function of the route stage or a terminal disposition — the status
   * wall's six sectors (lamp colour + restored tick), the work-area light
   * pools (cold → warm) and the storm damage on the north wall (repaired
   * once the feeds are restored). Re-run on every stage change and resume.
   */
  protected onStoryStateChanged(): void {
    const sectors: Record<string, RestorationState> = {};

    STATUS_WALL_SECTORS.forEach((sector, index) => {
      const state = this.restoration(sector.element);

      sectors[sector.label] = state;
      this.statusLamps[index]?.setFillStyle(RESTORATION_LAMP[state], 1);
      this.statusTicks[index]?.setVisible(state === 'restored');
    });

    const pool = this.lightPoolTexture();
    const lit = this.restoration('lighting') === 'restored';
    const swap = (image: Phaser.GameObjects.Image | null, texture: string) => {
      if (
        image !== null &&
        image.active &&
        image.texture.key !== texture &&
        this.textures.exists(texture)
      ) {
        image.setTexture(texture);
      }
    };

    for (const image of this.workPools) {
      swap(image, pool);
    }

    // Restoration shape `operations-service-lamp` (world-layouts.json):
    // the counter's back wall on standby light until the crew service
    // phase (stage `workshop`), then steady — with the district service
    // lamps and strip lights. Stage-driven only; the M05 lamp, the M09
    // gauge, the QC error and every packet source are untouched.
    swap(
      this.statusPanel,
      lit ? 'w1-status-panel-steady' : 'w1-status-panel-standby',
    );

    for (const lamp of this.serviceLamps) {
      swap(lamp, lit ? 'w1-service-lamp-steady' : 'w1-service-lamp-standby');
    }

    for (const light of this.stripLights) {
      swap(light, lit ? 'w1-strip-light-steady' : 'w1-strip-light-standby');
    }

    const repaired = this.restoration('sector_feeds') === 'restored';

    for (const object of this.damageDressing) {
      (object as Phaser.GameObjects.Image).setVisible(!repaired);
    }

    for (const object of this.repairDressing) {
      (object as Phaser.GameObjects.Image).setVisible(repaired);
    }

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__restorationProbe = {
        lighting: this.restoration('lighting'),
        sectors,
      };
    }
  }

  private surfaceStation(
    id: string,
    label: string,
    verb: string,
    registryId: string,
    texture: string,
    at: { x: number; y: number },
    order: number,
    isDone: () => boolean,
    open: () => void,
  ) {
    this.addStation({
      interactionKey: 'pilotStation',
      label,
      verb,
      registryId,
      texture,
      x: at.x,
      y: at.y,
      onPromptOpened: () => {
        this.logStationOpened(id);
        open();
        return false;
      },
    });
    registerPilotStation({
      id,
      zone: 'station_concourse',
      x: at.x,
      y: at.y,
      label,
      stages: ['incident_handover'],
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

  /** M05 occasion 1: presented at the first quiet moment after comprehension. */
  protected onPilotUpdate(): void {
    if (
      !m05Presented('o1') &&
      pilotStageAtOrAfter('incident_handover') &&
      this.physicalInputEligible()
    ) {
      const S = CONCOURSE_STATIONS.concourseFault;

      presentM05('o1', Date.now(), {
        eligible: true,
        distance: Math.hypot(this.player.x - S.x, this.player.y - S.y),
        comprehension: 'passed',
      });
      this.lampFlicker?.setVisible(true);
    }

    if (this.lampFlicker?.visible) {
      this.lampFlicker.setAlpha(
        Math.floor(this.time.now / 260) % 3 === 0 ? 0.25 : 0.9,
      );
    }
  }

  protected onRoomExit(): void {
    const now = Date.now();

    if (m05Open('o1')) {
      censorM05('o1', now, 'left_zone');
      this.lampFlicker?.setVisible(false);
    }

    // Leaving the Concourse passes the first gauge-check milestone (the
    // check-1 window only; check 2 stays due until the deck review so the
    // return opportunity is never cut short by a detour).
    if (
      m09Accepted() &&
      m09State().checks.check1.closedAtMs === null &&
      !m09Check2Due()
    ) {
      closeM09Check('check1', now, 'milestone_passed');
    }
  }

  private logStationOpened(stationId: string) {
    this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
      metadata: { station_id: stationId, zone: this.zoneKey },
    });
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'pilotVale') {
      return this.valeBeat().body;
    }

    if (interactionKey === 'pilotKai') {
      noteM10KaiEncounter();

      // Neutral: Kai never asks for the component (the mission-log line
      // is the one authorised reminder); the handover is an option the
      // participant chooses while carrying it.
      return 'Kai: Back inside — the laboratory is quiet again. Vale has the return-shift orders.';
    }

    return undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'pilotVale') {
      return this.npcBeatOptions('pilotVale', this.valeBeat());
    }

    if (interactionKey === 'pilotKai') {
      return this.npcBeatOptions('pilotKai', {
        body: '',
        options: [
          ...(m10Carrying()
            ? [
                {
                  label: `Hand over the ${M10_COMPONENT_LABEL.toLowerCase()}.`,
                  tag: 'm10_handover',
                  feedback: 'Kai: Received — logged with the calibration set.',
                  onSelected: () => handOverM10(Date.now(), 'kai', 'keyboard'),
                },
              ]
            : []),
          { label: 'Understood.', tag: 'kai_return_ack' },
        ],
      });
    }

    return [];
  }

  /** Vale's beats depend only on the route stage — never on outcomes. */
  private valeBeat(): PilotNpcBeat {
    switch (pilotStage()) {
      case 'arrival':
      case 'handover_briefing':
        return {
          body:
            'Vale: You made it through the storm. This desk is the incident handover: the storm packet is on the work surface — plan board, quality packet, incident desk.\n' +
            'Work through it, then confirm the handover with me.',
          options: [
            {
              label: 'Understood.',
              tag: 'briefing_ack',
              onSelected: () => {
                advancePilotStage('incident_handover', Date.now());
                presentM09Offer(Date.now());
              },
              nextStage: () => this.watchOfferStage(),
            },
          ],
        };
      case 'incident_handover':
        // Equal reminder exposure (Unit 5): the same neutral "still yours"
        // line as the return beat; recorded for check 1 while it is due.
        noteM09NpcMention('check1');

        return {
          body: 'Vale: How is the handover going? Anything you leave open stays open for the shift.',
          options: [
            {
              label: 'Handover confirmed — what is next?',
              tag: 'handover_done',
              feedback:
                'Vale: The Records Workshop needs restoring — west door. The work orders are on the board.',
              onSelected: () => advancePilotStage('workshop', Date.now()),
            },
            {
              label: 'Still working on it.',
              tag: 'handover_continue',
              feedback: 'Vale: Take your time.',
            },
            ...(m09State().accepted === null
              ? [
                  {
                    label: 'About the monitor watch…',
                    tag: 'watch_offer_again',
                    nextStage: () => this.watchOfferStage(),
                  },
                ]
              : []),
            ...(m10State().accepted === null
              ? [
                  {
                    label: 'About the delivery…',
                    tag: 'promise_offer_again',
                    nextStage: () => this.promiseOfferStage(),
                  },
                ]
              : []),
          ],
        };
      case 'workshop':
      case 'workshop_work':
        return {
          body: 'Vale: The Records Workshop is through the west door — the work orders are on the board there.',
          options: [{ label: 'On my way.', tag: 'redirect_workshop' }],
        };
      case 'lab_briefing':
      case 'lab_work':
      case 'exterior_briefing':
      case 'exterior_work':
        return {
          body: 'Vale: Kai is waiting in the Diagnostics Laboratory, north door. Check in with me when you are back from outside.',
          options: [{ label: 'On my way.', tag: 'redirect_lab' }],
        };
      case 'return_hub':
        // Neutral, equal to the check-1 mention: no gauge named, no
        // directive — the registered form's one NPC mention per check.
        noteM09NpcMention('check2');

        return {
          body: 'Vale: Back inside — good. The exterior shift is logged. Anything you accepted earlier is still yours to close. The return shift finishes in the Records Workshop, west door.',
          options: [
            {
              label: 'Heading to the workshop.',
              tag: 'return_ack',
              onSelected: () =>
                advancePilotStage('workshop_return', Date.now()),
            },
          ],
        };
      case 'workshop_return':
        return {
          body: 'Vale: The return shift closes in the Records Workshop — west door. Sign the board there when you are done.',
          options: [{ label: 'Understood.', tag: 'redirect_workshop_return' }],
        };
      case 'deck_closure':
        return {
          body: 'Vale: The Utility Deck is through the east door — the shift review panel is there, then the Core.',
          options: [{ label: 'Understood.', tag: 'redirect_deck' }],
        };
      case 'core_stabilise':
        return {
          body: 'Vale: The record is closed. Bring the feeds up on the Utility Deck — east door — coolant, calibration, then distribution.',
          options: [{ label: 'Understood.', tag: 'redirect_feeds' }],
        };
      case 'core_sync':
        return {
          body: 'Vale: The feeds are up. The Core Chamber is off the Utility Deck — east door, then north.',
          options: [{ label: 'Understood.', tag: 'redirect_core' }],
        };
      case 'complete':
      default:
        return {
          body: 'Vale: Core stable. Thank you.',
          options: [{ label: 'Understood.', tag: 'complete_ack' }],
        };
    }
  }

  /** M09: explicit, voluntary watch offer (accept or decline — both valid). */
  private watchOfferStage(): PromptStage | null {
    if (m09State().accepted !== null) {
      return null;
    }

    presentM09Offer(Date.now());

    return {
      body: 'Vale: One more thing — would you take the monitor watch this shift? Two gauge readings: one before you leave the Concourse, one when you are back inside. The gauge is on the work surface.',
      options: this.npcBeatOptions('pilotVale', {
        body: '',
        options: [
          {
            label: 'I will take the watch.',
            tag: 'watch_accept',
            onSelected: () => answerM09Offer(true, Date.now(), 'keyboard'),
            nextStage: () => this.promiseOfferStage(),
          },
          {
            label: 'Not this shift.',
            tag: 'watch_decline',
            onSelected: () => answerM09Offer(false, Date.now(), 'keyboard'),
            nextStage: () => this.promiseOfferStage(),
          },
          {
            label: 'Ask me again later.',
            tag: 'watch_defer',
            nextStage: () => this.promiseOfferStage(),
          },
        ],
      }),
    };
  }

  /** M10: explicit, voluntary delivery promise; acceptance is followed by the standardised interruption. */
  private promiseOfferStage(): PromptStage | null {
    if (m10State().accepted !== null) {
      return null;
    }

    presentM10Offer(Date.now());

    return {
      body: `Vale: Kai asked for the ${M10_COMPONENT_LABEL.toLowerCase()}. Would you carry it and hand it to Kai when you see them?`,
      options: this.npcBeatOptions('pilotVale', {
        body: '',
        options: [
          {
            label: 'I will hand it to Kai.',
            tag: 'promise_accept',
            onSelected: () => answerM10Offer(true, Date.now(), 'keyboard'),
            nextStage: () => this.interruptionStage(),
          },
          {
            label: 'Better ask someone else.',
            tag: 'promise_decline',
            onSelected: () => answerM10Offer(false, Date.now(), 'keyboard'),
          },
          { label: 'Ask me again later.', tag: 'promise_defer' },
        ],
      }),
    };
  }

  /** The identical, non-choice interruption shown right after acceptance. */
  private interruptionStage(): PromptStage {
    noteM10InterruptionShown(Date.now());

    return {
      body: M10_INTERRUPTION_TEXT,
      options: this.npcBeatOptions('pilotVale', {
        body: '',
        options: [
          {
            label: 'Alarm cleared — continue.',
            tag: 'interruption_ack',
            onSelected: () =>
              noteM10InterruptionAcknowledged(Date.now(), 'keyboard'),
          },
        ],
      }),
    };
  }

  /** Foot-line depth for chamber props (kept for parity with sibling zones). */
  protected propDepth(footY: number): number {
    return worldDepth(footY);
  }
}

// Keep the spawn book referenced from one place (pure) for the specs.
void CONCOURSE_SPAWNS;
