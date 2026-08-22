/**
 * Station Concourse — pilot zone 1 (professional pilot route).
 *
 * The central hub: arrival from the Dock (south), Vale at the operations
 * desk, the Records & Logistics work area (west), the north door to the
 * Diagnostics Laboratory and the east door to the Utility & Core Deck.
 *
 * Records & Logistics (Unit 3) hosts the accepted interactive inventory
 * unchanged at the domain level: the Incident Filing Workstation (M02
 * overlay mode, `proto_m02_incident_filing`), the two Label Press stations
 * (M03 occasions A/B, `proto_m03_reset_a/b`), the Component Locker
 * (storage transfer), the Assembly Bench (recipes) and three incoming
 * supply bundles (recoverable world items). Ambient inventory handling is
 * secondary telemetry only; the M02/M03 windows own their own disjoint
 * families. Every door is bidirectional; nothing gates on performance.
 */
import { key } from '../constants';
import { ensureInventoryIconTextures } from '../inventory/inventoryTextures';
import {
  declareM02Opportunity,
  M02_OPPORTUNITY_ID,
  m02Status,
} from '../inventory/m02Filing';
import type { M03OccasionId } from '../inventory/m03Reset';
import {
  declareM03Opportunities,
  M03_OPPORTUNITY_IDS,
  m03OccasionStatus,
} from '../inventory/m03Reset';
import { ensureLabStorageSeeded } from '../inventory/store';
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

  create(data?: { spawn?: string }) {
    // Inventory foundation wiring (InventoryLabScene precedent): icons,
    // secondary telemetry bridge, the Component Locker's one-time seed and
    // the M02/M03 declarations (register: declared + offered; idempotent).
    ensureInventoryIconTextures(this);
    installInventoryTelemetry();
    setInventoryTelemetryScene(key.scene.stationConcourse);
    ensureLabStorageSeeded();
    declareM02Opportunity();
    declareM03Opportunities();
    stampContaminationNotes();

    super.create(data);

    refreshPilotCoverageProbe();
  }

  protected populateRoom(): void {
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

  /**
   * Records & Logistics: incoming items (bundles) → visible destinations
   * (locker / bench), the filing surface (M02) and the two press benches
   * (M03 A/B). Explicit submit/leave controls live inside the overlays.
   */
  private populateRecordsArea() {
    const S = CONCOURSE_STATIONS;

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
    this.addSignageText(5.5 * TILE, 4.2 * TILE, 'INCOMING SUPPLIES');

    // Incident Filing Workstation — M02 (own overlay mode, own family).
    this.addStation({
      interactionKey: 'pilotStation',
      label: 'Incident Filing Workstation',
      texture: 'proc-desk-closure',
      x: S.filingDesk.x,
      y: S.filingDesk.y,
      onPromptOpened: () => {
        this.logStationOpened('filing_desk');
        openInventoryOverlay(this, { mode: 'm02', allowWorldDrop: true });
        return false;
      },
    });
    registerPilotStation({
      id: 'filing_desk',
      zone: 'station_concourse',
      x: S.filingDesk.x,
      y: S.filingDesk.y,
      label: 'Incident Filing Workstation',
      stages: ['records'],
      isDone: () => m02Status() === 'committed',
      order: 1,
    });

    // Label Press A / B — M03 occasions (own overlay mode, own family).
    this.addPressStation('a', 'Label Press A', S.pressA, 2);
    this.addPressStation('b', 'Label Press B', S.pressB, 3);

    // Component Locker — storage transfer (ordinary inventory, secondary).
    this.addStation({
      interactionKey: 'pilotStation',
      label: 'Component Locker',
      texture: 'proc-crate-components',
      x: S.storageLocker.x,
      y: S.storageLocker.y,
      onPromptOpened: () => {
        this.logStationOpened('storage_locker');
        openInventoryOverlay(this, { mode: 'container', allowWorldDrop: true });
        return false;
      },
    });

    // Assembly Bench — recipes (ordinary inventory, secondary).
    this.addStation({
      interactionKey: 'pilotStation',
      label: 'Assembly Bench',
      texture: 'proc-bench-prep',
      x: S.assemblyBench.x,
      y: S.assemblyBench.y,
      onPromptOpened: () => {
        this.logStationOpened('assembly_bench');
        openInventoryOverlay(this, { mode: 'workbench', allowWorldDrop: true });
        return false;
      },
    });
    this.addSignageText(6 * TILE, 12.6 * TILE, 'STORAGE  ·  ASSEMBLY');
  }

  private addPressStation(
    occasion: M03OccasionId,
    label: string,
    at: { x: number; y: number },
    order: number,
  ) {
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

        // Coded prior exposure (REV-MIN-6): M02 committed or the other
        // occasion closed before this occasion opens.
        if (m03OccasionStatus(occasion) === 'idle') {
          if (m02Status() === 'committed') {
            recordPriorExposure(
              M03_OPPORTUNITY_IDS[occasion],
              `exposure:${M02_OPPORTUNITY_ID}_committed_before`,
            );
          }

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
      zone: 'station_concourse',
      x: at.x,
      y: at.y,
      label,
      stages: ['records'],
      isDone: () => m03OccasionStatus(occasion) === 'closed',
      order,
    });
  }

  private logStationOpened(stationId: string) {
    this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
      metadata: { station_id: stationId, zone: this.zoneKey },
    });
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
            'Start in Records & Logistics, west side: file the incident sheets at the desk and run both label press batches. Incoming supplies can go in the locker or to the bench. Come back to me when you are done there.',
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
                'Vale: West side of this hall — the desk, the two presses, the locker and the bench.',
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
