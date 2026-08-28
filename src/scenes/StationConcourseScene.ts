/**
 * Station Concourse — the hub of the evidence-led pilot v2 (Unit 1: route
 * shell). Episode 1 (Storm Arrival & Incident Handover) and the return
 * check-in of episode 5 happen here.
 *
 * Doors (all bidirectional): south → Dock, west → Records Workshop,
 * north → Diagnostics Laboratory, east → Utility Deck. Vale at the incident
 * desk is the anchor NPC of the Concourse stages. Unit 2 adds the episode-1
 * windows (plan board, QC packet, incident desk, monitor watch, promise);
 * Unit 4 adds the return-shift obligations. Nothing gates on performance;
 * every beat offers "move on".
 */
import { key } from '../constants';
import { refreshPilotCoverageProbe } from '../pilot/pilotCoverage';
import {
  advancePilotStage,
  pilotStage,
  registerPilotStation,
} from '../pilot/pilotRoute';
import type { PilotNpcBeat } from '../pilot/PilotZoneScene';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import { CONCOURSE_STATIONS } from '../pilot/zoneSites';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

export class StationConcourseScene extends PilotZoneScene {
  protected readonly roomId = 'station_concourse';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'station_concourse' as const;

  constructor() {
    super(key.scene.stationConcourse);
  }

  protected getLayout(): RoomLayout {
    // 25×19 hub: doorways north (Laboratory), south (Dock), east (Utility
    // Deck) and west (Records Workshop) — rows 8-9 on both side walls.
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
    super.create(data);
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

    // ——— Vale — incident desk (anchor NPC of the Concourse stages) ———
    const vale = CONCOURSE_STATIONS.vale;

    this.addNpc({
      interactionKey: 'pilotVale',
      label: 'Vale',
      npcName: 'Vale — operations',
      texture: 'plv1-vale',
      workFrames: ['plv1-vale', 'plv1-vale-b'],
      x: vale.x,
      y: vale.y,
    });
    this.addDecor(vale.x, vale.y + 30, 'proc-desk-reception');
    this.signage(vale.x, vale.y - 64, 'INCIDENT DESK');
    registerPilotStation({
      id: 'npc_vale',
      zone: 'station_concourse',
      x: vale.x,
      y: vale.y,
      label: 'Vale',
      stages: ['handover_briefing', 'incident_handover', 'return_hub'],
      isDone: () => false,
      order: 0,
    });

    // ——— Dressing ———
    this.addDecor(4 * TILE, 3.4 * TILE, 'proc-light-pool');
    this.addDecor(12 * TILE, 3.2 * TILE, 'proc-light-pool');
    this.addDecor(15.5 * TILE, 8.2 * TILE, 'proc-light-pool');
    this.addDecor(19 * TILE, 1.4 * TILE, 'proc-window-exterior');
    this.addDecor(22 * TILE, 1.4 * TILE, 'proc-window-exterior');
    this.addDecor(5 * TILE, 16 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(20 * TILE, 16 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(19.5 * TILE, 13.5 * TILE, 'proc-board-workorders');
    this.addDecor(21.5 * TILE, 13.5 * TILE, 'proc-board-portfolio');
    this.addDecor(17.5 * TILE, 12 * TILE, 'proc-cart-utility');
    this.addDecor(13.5 * TILE, 4.6 * TILE, 'proc-console-wall');
    this.signage(20.5 * TILE, 12.2 * TILE, 'DUTY BOARDS');
    this.signage(12 * TILE, 1.5 * TILE, 'DIAGNOSTICS LABORATORY  ▲');
    this.signage(12 * TILE, 17.5 * TILE, '▼  DOCK');
    this.signage(22.2 * TILE, 7.2 * TILE, 'UTILITY DECK  ▶');
    this.signage(2.8 * TILE, 7.2 * TILE, '◀  RECORDS WORKSHOP');
  }

  private signage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, {
        color: '#7f95a8',
        font: '11px monospace',
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey !== 'pilotVale') {
      return undefined;
    }

    return this.valeBeat().body;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'pilotVale') {
      return [];
    }

    return this.npcBeatOptions('pilotVale', this.valeBeat());
  }

  /** Vale's beat depends only on the route stage (navigation), never on outcomes. */
  private valeBeat(): PilotNpcBeat {
    switch (pilotStage()) {
      case 'arrival':
      case 'handover_briefing':
        return {
          body:
            'Vale: Good — you made it through the storm. This desk is the incident handover: the storm packet is on the work surface.\n' +
            'Work through it, then confirm the handover with me.',
          options: [
            {
              label: 'Understood.',
              tag: 'briefing_ack',
              onSelected: () => {
                advancePilotStage('incident_handover', Date.now());
              },
            },
          ],
        };
      case 'incident_handover':
        return {
          body: 'Vale: How is the handover going? Anything you leave open stays open for the shift.',
          options: [
            {
              label: 'Handover confirmed — what is next?',
              tag: 'handover_done',
              feedback:
                'Vale: The Records Workshop needs restoring — west door. The work orders are on the board.',
              onSelected: () => {
                advancePilotStage('workshop', Date.now());
              },
            },
            {
              label: 'Still working on it.',
              tag: 'handover_continue',
              feedback: 'Vale: Take your time.',
            },
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
        return {
          body: 'Vale: Back inside — good. Anything you accepted earlier is still yours to close. The return shift finishes in the Records Workshop, west door.',
          options: [
            {
              label: 'Heading to the workshop.',
              tag: 'return_ack',
              onSelected: () => {
                advancePilotStage('workshop_return', Date.now());
              },
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
}
