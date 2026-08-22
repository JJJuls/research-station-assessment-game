/**
 * Station Concourse — pilot zone 1 (professional pilot route).
 *
 * The central hub: arrival from the Dock (south), Vale at the operations
 * desk, the Records & Logistics work area (west: filing workstation, two
 * press stations, storage locker, assembly bench, supply pickups), the
 * north door to the Diagnostics Laboratory and the east door to the
 * Utility & Core Deck. Unit 2 builds the topology, guidance and NPC beats;
 * Unit 3 activates the Records & Logistics stations (inventory overlay
 * modes). Every door is bidirectional; nothing here gates on performance.
 */
import { key } from '../constants';
import {
  advancePilotStage,
  pilotStage,
  registerPilotStation,
} from '../pilot/pilotRoute';
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
    // 25×19 concourse: doorways north (Laboratory), south (Dock) and east
    // (Utility & Core Deck); two rail stubs frame the west work area and
    // the east operations area.
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
        '#.......................-',
        '#.......................-',
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
    // ≥80 px inside every door (72 px interaction radius; no bounce-back).
    switch (data?.spawn) {
      case 'diagnostics_laboratory':
        return { x: 12 * TILE, y: 4.2 * TILE };
      case 'utility_core_deck':
        return { x: 20.5 * TILE, y: 8.5 * TILE };
      case 'dock':
      default:
        return { x: 12 * TILE, y: 12.5 * TILE };
    }
  }

  protected populateRoom(): void {
    // ——— Doors (bidirectional by construction: declared in both zones) ———
    this.addPilotDoor({ to: 'dock', spawn: 'station_concourse' });
    this.addPilotDoor({
      to: 'diagnostics_laboratory',
      spawn: 'station_concourse',
    });
    this.addPilotDoor({ to: 'utility_core_deck', spawn: 'station_concourse' });

    // ——— Vale — operations desk (anchor NPC of the Concourse stages) ———
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
    this.addSignageText(vale.x, vale.y - 64, 'OPERATIONS');

    registerPilotStation({
      id: 'npc_vale',
      zone: 'station_concourse',
      x: vale.x,
      y: vale.y,
      label: 'Vale',
      stages: ['meet_vale', 'records', 'report_vale'],
      isDone: () => false,
      order: 0,
    });

    // ——— Records & Logistics (west) — Unit 3 activates these ———
    this.addSignageText(6 * TILE, 2 * TILE - 8, 'RECORDS & LOGISTICS');
    this.populateRecordsArea();

    // ——— Dressing ———
    this.addDecor(3 * TILE, 3.4 * TILE, 'proc-light-pool');
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
    this.addSignageText(20.5 * TILE, 12.2 * TILE, 'DUTY BOARDS');
    this.addSignageText(12 * TILE, 1.5 * TILE, 'DIAGNOSTICS LABORATORY  ▲');
    this.addSignageText(12 * TILE, 17.5 * TILE, '▼  DOCK');
    this.addSignageText(22.2 * TILE, 7.2 * TILE, 'UTILITY DECK  ▶');
  }

  /** Unit 2 placeholders; Unit 3 replaces the activations with overlays. */
  private populateRecordsArea() {
    const S = CONCOURSE_STATIONS;
    const place = (
      id: string,
      label: string,
      at: { x: number; y: number },
      texture: string,
      order: number,
    ) => {
      this.addStation({
        interactionKey: 'pilotStation',
        label,
        texture,
        x: at.x,
        y: at.y,
        onPromptOpened: () => {
          this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
            metadata: { station_id: id, zone: this.zoneKey },
          });
          this.showFeedbackMessage(
            `${label} — not yet connected in this build.`,
          );
          return false;
        },
      });
      registerPilotStation({
        id,
        zone: 'station_concourse',
        x: at.x,
        y: at.y,
        label,
        stages: ['records'],
        isDone: () => false,
        order,
      });
    };

    place(
      'filing_desk',
      'Incident Filing Workstation',
      S.filingDesk,
      'proc-desk-closure',
      1,
    );
    place('press_a', 'Label Press A', S.pressA, 'proc-rig-intake', 2);
    place('press_b', 'Label Press B', S.pressB, 'proc-rig-intake', 3);
    place(
      'storage_locker',
      'Component Locker',
      S.storageLocker,
      'proc-crate-components',
      4,
    );
    place(
      'assembly_bench',
      'Assembly Bench',
      S.assemblyBench,
      'proc-bench-prep',
      5,
    );
    this.addDecor(S.supplyA.x, S.supplyA.y, 'proc-crate-supply');
    this.addDecor(S.supplyB.x, S.supplyB.y, 'proc-crate-supply');
    this.addDecor(S.supplyC.x, S.supplyC.y, 'proc-crate-supply');
  }

  private addSignageText(x: number, y: number, text: string) {
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
  private valeBeat() {
    const stage = pilotStage();

    switch (stage) {
      case 'arrival':
      case 'meet_vale':
        return {
          body:
            'Vale: Good — you made it through the storm. Records are a mess and the coolant line is down.\n' +
            'Start in Records & Logistics, west side: file the incident sheets and run the two press batches. Come back to me when you are done there.',
          options: [
            {
              label: 'Understood.',
              tag: 'briefing_ack',
              onSelected: () => {
                advancePilotStage('records', Date.now());
              },
            },
            {
              label: 'Where exactly is Records & Logistics?',
              tag: 'briefing_where',
              feedback:
                'Vale: West side of this hall — the desk, the two presses and the locker.',
              onSelected: () => {
                advancePilotStage('records', Date.now());
              },
            },
          ],
        };
      case 'records':
        return {
          body: 'Vale: How is Records & Logistics going? Anything you leave open stays open until the core is synchronised.',
          options: [
            {
              label: 'I am done there — what is next?',
              tag: 'records_done',
              feedback:
                'Vale: Kai needs you in the Diagnostics Laboratory — north door.',
              onSelected: () => {
                advancePilotStage('lab_briefing', Date.now());
              },
            },
            {
              label: 'Still working on it.',
              tag: 'records_continue',
              feedback: 'Vale: Take your time.',
            },
          ],
        };
      case 'lab_briefing':
      case 'lab_work':
      case 'exterior_briefing':
      case 'exterior_work':
      case 'report_kai':
        return {
          body: 'Vale: Kai is waiting in the Diagnostics Laboratory, north door. Report back to me once the outside work is done.',
          options: [{ label: 'On my way.', tag: 'redirect_lab' }],
        };
      case 'report_vale':
        return {
          body: 'Vale: Outside work logged. Last stop: the Utility & Core Deck, east door — review completion at the Core console and synchronise.',
          options: [
            {
              label: 'Heading to the deck.',
              tag: 'report_ack',
              onSelected: () => {
                advancePilotStage('deck_review', Date.now());
              },
            },
          ],
        };
      case 'deck_review':
        return {
          body: 'Vale: The Core console is on the Utility & Core Deck, east door.',
          options: [{ label: 'Understood.', tag: 'redirect_deck' }],
        };
      case 'complete':
      default:
        return {
          body: 'Vale: Core synchronised. Thank you.',
          options: [{ label: 'Understood.', tag: 'complete_ack' }],
        };
    }
  }
}
