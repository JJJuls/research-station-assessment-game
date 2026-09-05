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
 * World V1 (docs/game/world-v1/ROOM-BLOCKOUTS.md §2): a 40×26 circulation
 * hub — one north–south spine crossing one east–west axis, every door
 * framed and signed, the operations desk island (Vale) under the
 * station-status wall as the landmark, and the work surfaces integrated
 * into the architecture (plan board on the north wall, incident console on
 * the east service counter, quality packet on the south-west side counter,
 * monitor gauge on the east wall, the faulty reading lamp in the
 * north-west nook). No window, event, form or option changed.
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

/** Station-status wall sectors (left → right) — presentation only. */
const STATUS_SECTORS = ['REC', 'SIG', 'EXT', 'LOG', 'FEED', 'CORE'] as const;

export class StationConcourseScene extends PilotZoneScene {
  protected readonly roomId = 'station_concourse';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'station_concourse' as const;

  private lampFlicker: Phaser.GameObjects.Rectangle | null = null;
  private statusLamps: Phaser.GameObjects.Rectangle[] = [];

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
    return { theme: 'hub', grid: [...CONCOURSE_LAYOUT] };
  }

  protected bundleDropBounds(): { width: number; height: number } {
    return { width: 40 * TILE, height: 26 * TILE };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    switch (data?.spawn) {
      case 'diagnostics_laboratory':
        return { x: 20 * TILE, y: 5 * TILE };
      case 'utility_core_deck':
        return { x: 35 * TILE, y: 13 * TILE };
      case 'records_workshop':
        // 112 px inside the west door (x 48): clear of the 72 px interaction
        // radius (V2 finding U8-8).
        return { x: 5 * TILE, y: 13 * TILE };
      case 'dock':
      default:
        return { x: 20 * TILE, y: 20 * TILE };
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
      'proc-board-workorders',
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
      'kit-side-counter',
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
      'kit-wall-console-wide',
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
      texture: 'kit-wall-gauge',
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
      texture: 'kit-reading-desk',
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
    // The lamp head on the reading desk: the flicker IS the fault.
    this.lampFlicker = this.add
      .rectangle(
        S.concourseFault.x + 17,
        S.concourseFault.y - 20,
        12,
        6,
        0xe6c68f,
        0.9,
      )
      .setDepth(DepthLayer.WorldReadout)
      .setVisible(false);

    this.refreshStatusWall();
  }

  /**
   * World V1 hub architecture (ROOM-BLOCKOUTS.md §2): door frames and
   * signs at the four exits, the painted spine and axis, the operations
   * desk island under the status wall, seating, storage, notice board,
   * light fixtures and pools. Presentation only — no collision beyond the
   * layout's wall cells, no interaction, no label over a prop.
   */
  private buildArchitecture() {
    // Door frames + wall signs beside each door.
    this.addDoorFrame(20 * TILE, 1 * TILE + 16, 'h');
    this.addWallSign(20 * TILE + 128, 1 * TILE + 18, 'Diagnostics laboratory');
    this.addDoorFrame(20 * TILE, 24 * TILE + 16, 'h');
    this.addWallSign(20 * TILE + 128, 24 * TILE + 14, 'Dock');
    this.addDoorFrame(0 * TILE + 16, 13 * TILE, 'v');
    this.addWallSign(2.5 * TILE, 10.5 * TILE, 'Records workshop');
    this.addDoorFrame(39 * TILE + 16, 13 * TILE, 'v');
    this.addWallSign(37.5 * TILE, 10.5 * TILE, 'Utility deck');

    // Painted circulation: the spine and the axis.
    this.addFloorLane(17, 2, 6, 22);
    this.addFloorLane(1, 11, 38, 4);

    // Operations desk island: status wall behind the counter, Vale in
    // front (the desk cells collide; the NPC is walk-around).
    this.addKitProp(28.5 * TILE, 10 * TILE, 'kit-status-wall');
    this.addKitProp(28.5 * TILE, 11 * TILE, 'kit-ops-counter');
    for (let i = 0; i < STATUS_SECTORS.length; i += 1) {
      const x = 28.5 * TILE - 96 + 21 + i * 30;
      const y = 8 * TILE + 5;

      this.statusLamps.push(
        this.add
          .rectangle(x, y, 10, 5, KIT_INDICATOR.inactive, 1)
          .setDepth(DepthLayer.WorldReadout),
      );
      this.add
        .text(x, y + 14, STATUS_SECTORS[i], {
          color: '#8497aa',
          font: '8px monospace',
          resolution: 2,
        })
        .setOrigin(0.5)
        .setDepth(DepthLayer.WorldReadout);
    }

    // East service counter (col 38, rows 5–9) carrying the incident console.
    for (let row = 5; row <= 9; row += 1) {
      if (row !== 7) {
        this.addKitProp(
          38 * TILE + 16,
          (row + 1) * TILE,
          'kit-cable-junction',
          {
            depth: DepthLayer.GroundInfra,
          },
        );
      }
    }

    // Plan board light and the reading nook.
    this.addGroundInfra(2 * TILE + 8, 6 * TILE + 16, 'kit-notice-board');

    // Quality side counter light.

    // Seating, lockers, crates.
    this.addKitProp(32 * TILE, 22 * TILE - 4, 'kit-bench');
    this.addKitProp(35.5 * TILE, 22 * TILE - 4, 'kit-bench');
    // South-centre plaza furniture off the spine and axis (review W6).
    this.addKitProp(14 * TILE, 18 * TILE, 'kit-bench');
    this.addKitProp(26 * TILE, 18 * TILE, 'kit-bench');
    this.addGroundInfra(14 * TILE, 16.5 * TILE, 'kit-notice-board');
    this.addKitProp(3 * TILE, 23 * TILE, 'kit-crate-stack');
    this.addKitProp(6.5 * TILE, 24 * TILE + 14, 'kit-locker-bank');
    this.addKitProp(11.5 * TILE, 24 * TILE + 14, 'kit-locker-bank');

    // Light fixtures and a cable tray on the north wall.
    for (const col of [6, 11, 28, 34]) {
      this.addGroundInfra(col * TILE + 16, 1 * TILE + 30, 'kit-light-fixture');
    }
    for (let col = 24; col < 38; col += 1) {
      this.addGroundInfra(col * TILE + 16, 1 * TILE + 12, 'kit-cable-tray');
    }
    this.addGroundInfra(38 * TILE + 8, 1 * TILE + 12, 'kit-cable-junction');

    // Wall dressing on the south wall (PROVISIONAL modules, tinted to the
    // steel register; procedural fallback).
    this.addKitProp(
      16 * TILE,
      25 * TILE + 8,
      this.textures.exists('plv1-arch-vent')
        ? 'plv1-arch-vent'
        : 'proc-wall-pipes',
      { tint: 0x9fb0c0 },
    );
    this.addKitProp(
      24 * TILE,
      25 * TILE + 8,
      this.textures.exists('plv1-arch-grille')
        ? 'plv1-arch-grille'
        : 'proc-wall-pipes',
      { tint: 0x9fb0c0 },
    );
  }

  /**
   * Station-status wall (presentation; STORY-STATE-SPEC.md §4). U1 mirrors
   * the two states the V4 strip carried — storm recovery vs. the exterior
   * shift logged; U2 wires the full restoration model.
   */
  private refreshStatusWall() {
    const lit = this.returned() ? new Set([2]) : new Set<number>();

    this.statusLamps.forEach((lamp, index) => {
      lamp.setFillStyle(
        lit.has(index) ? KIT_INDICATOR.restored : KIT_INDICATOR.inactive,
        1,
      );
    });
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
            'Vale: Good — you made it through the storm. This desk is the incident handover: the storm packet is on the work surface — plan board, quality packet, incident desk.\n' +
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
