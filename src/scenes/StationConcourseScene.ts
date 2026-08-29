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
 */
import { key } from '../constants';
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
import { CONCOURSE_STATIONS } from '../pilot/zoneSites';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
} from '../world';

const TILE = 32;
const M05_FIX_MS = 2000;

/**
 * Monitor gauge readings (Unit 5): the monitored loop drifts while the
 * participant is outside, so the return reading is a visibly CHANGED
 * operational state — the physical consequence the second check reads.
 * Values only; no directive, no reminder.
 */
const GAUGE_READING = {
  before: 'loop 1.6 bar · bus 26.8 V · relay LOCK',
  after: 'loop 1.4 bar ▼ · bus 26.1 V ▼ · relay LOCK',
} as const;

export class StationConcourseScene extends PilotZoneScene {
  protected readonly roomId = 'station_concourse';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'station_concourse' as const;

  private lampFlicker: Phaser.GameObjects.Rectangle | null = null;

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
      grid: [
        '#########################',
        '###########--############',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#..####...........####..#',
        '#.......................#',
        '#.......................#',
        '-.......................-',
        '-.......................-',
        '#.......................#',
        '#..####...........####..#',
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

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    switch (data?.spawn) {
      case 'diagnostics_laboratory':
        return { x: 12 * TILE, y: 4.2 * TILE };
      case 'utility_core_deck':
        return { x: 20.5 * TILE, y: 8.5 * TILE };
      case 'records_workshop':
        return { x: 3.5 * TILE, y: 8.5 * TILE };
      case 'dock':
      default:
        return { x: 12 * TILE, y: 12.5 * TILE };
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
    this.addPilotDoor({ to: 'dock', spawn: 'station_concourse' });
    this.addPilotDoor({ to: 'records_workshop', spawn: 'station_concourse' });
    this.addPilotDoor({
      to: 'diagnostics_laboratory',
      spawn: 'station_concourse',
    });
    this.addPilotDoor({ to: 'utility_core_deck', spawn: 'station_concourse' });

    const S = CONCOURSE_STATIONS;

    // ——— Vale — incident desk (anchor NPC) ———
    this.addNpc({
      interactionKey: 'pilotVale',
      label: 'Vale',
      npcName: 'Vale — operations',
      texture: 'plv1-vale',
      workFrames: ['plv1-vale', 'plv1-vale-b'],
      x: S.vale.x,
      y: S.vale.y,
    });
    this.addDecor(S.vale.x, S.vale.y + 30, 'proc-desk-reception');
    this.signage(S.vale.x, S.vale.y - 64, 'INCIDENT DESK');
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
        npcName: 'Kai — diagnostics',
        texture: 'plv1-kai',
        workFrames: ['plv1-kai-work-a', 'plv1-kai-work-b'],
        x: S.kaiReturn.x,
        y: S.kaiReturn.y,
      });
    }

    // ——— Episode-1 work surface ———
    this.signage(6 * TILE, 3 * TILE, 'STORM PACKET — WORK SURFACE');
    this.surfaceStation(
      'plan_board',
      'Plan Board',
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
      'Quality Packet',
      'proc-desk-closure',
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
      'Incident Desk',
      'proc-console-scenario',
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
      label: 'Monitor Gauge',
      texture: 'proc-gauge-card',
      x: S.monitorGauge.x,
      y: S.monitorGauge.y,
      onPromptOpened: () => {
        this.logStationOpened('monitor_gauge');
        readM09Gauge(Date.now(), 'keyboard');
        this.showFeedbackMessage(`Gauge read: ${this.gaugeReading()}.`);
        return false;
      },
    });
    this.signage(S.monitorGauge.x, S.monitorGauge.y - 40, 'MONITOR');
    // Live reading beside the gauge (state, never a directive).
    this.add
      .text(S.monitorGauge.x, S.monitorGauge.y + 34, this.gaugeReading(), {
        backgroundColor: '#101820',
        color: '#dce7f0',
        font: '10px monospace',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(3);

    // Station status strip on the wall console: a concise operational
    // update that changes on the return (no item, no directive).
    this.add
      .text(
        14.4 * TILE,
        2.6 * TILE,
        this.returned()
          ? 'STATION STATUS · exterior shift logged · return shift open'
          : 'STATION STATUS · storm recovery in progress',
        {
          backgroundColor: '#101820',
          color: '#9fb2c1',
          font: '10px monospace',
          padding: { x: 4, y: 2 },
        },
      )
      .setOrigin(0.5)
      .setDepth(3);

    // ——— Desk lamp fault (M05 occasion 1) — never mentioned ———
    this.addStation({
      interactionKey: 'pilotStation',
      label: 'Desk Lamp',
      texture: 'proc-light-pool',
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
    this.lampFlicker = this.add
      .rectangle(
        S.concourseFault.x,
        S.concourseFault.y - 22,
        14,
        6,
        0xe6c68f,
        0.9,
      )
      .setDepth(3)
      .setVisible(false);

    // ——— Dressing ———
    this.addDecor(12 * TILE, 3.2 * TILE, 'proc-light-pool');
    this.addDecor(15.5 * TILE, 8.2 * TILE, 'proc-light-pool');
    this.addDecor(19 * TILE, 1.4 * TILE, 'proc-window-exterior');
    this.addDecor(22 * TILE, 1.4 * TILE, 'proc-window-exterior');
    this.addDecor(5 * TILE, 16 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(20 * TILE, 16 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(21.5 * TILE, 13.5 * TILE, 'proc-board-portfolio');
    this.addDecor(17.5 * TILE, 12 * TILE, 'proc-cart-utility');
    this.addDecor(13.5 * TILE, 4.6 * TILE, 'proc-console-wall');
    this.signage(12 * TILE, 1.5 * TILE, 'DIAGNOSTICS LABORATORY  ▲');
    this.signage(12 * TILE, 17.5 * TILE, '▼  DOCK');
    this.signage(22.2 * TILE, 7.2 * TILE, 'UTILITY DECK  ▶');
    this.signage(2.8 * TILE, 7.2 * TILE, '◀  RECORDS WORKSHOP');
  }

  private surfaceStation(
    id: string,
    label: string,
    texture: string,
    at: { x: number; y: number },
    order: number,
    isDone: () => boolean,
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
    this.signage(at.x, at.y - 40, label.toUpperCase());
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

  private signage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, { color: '#7f95a8', font: '11px monospace' })
      .setOrigin(0.5)
      .setDepth(2);
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
      case 'core_stabilise':
        return {
          body: 'Vale: The Utility Deck is through the east door — the shift review panel is there, then the Core.',
          options: [{ label: 'Understood.', tag: 'redirect_deck' }],
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
}
