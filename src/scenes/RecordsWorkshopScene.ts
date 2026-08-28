/**
 * Records Workshop — pilot zone of episodes 2 (Records & Workshop
 * Restoration) and 5 (Return, Revision & Handover) of the evidence-led
 * pilot v2 (Unit 1: route shell).
 *
 * Entered through the Concourse west door; the only door leads back east
 * (bidirectional). Unit 1 hosts the accepted interactive-inventory
 * foundation unchanged at the domain level, moved here from the v1
 * Concourse: the Incident Filing Workstation (M02 overlay mode), the two
 * Label Press stations (M03 occasions A/B), the Component Locker, the
 * Assembly Bench and three incoming supply bundles. Unit 2 replaces the
 * filing workstation with the open case workspace and adds the remaining
 * episode-2 windows; Unit 4/5 add the return-shift stations.
 *
 * The Work Order Board is the stage anchor of both workshop stages: it is
 * how the participant signs off ("done here") — never a performance check.
 * Every `pilot_*` event is unmapped route telemetry.
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
import type { PilotNpcBeat } from '../pilot/PilotZoneScene';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import { WORKSHOP_STATIONS } from '../pilot/zoneSites';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

export class RecordsWorkshopScene extends PilotZoneScene {
  protected readonly roomId = 'records_workshop';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'records_workshop' as const;

  constructor() {
    super(key.scene.recordsWorkshop);
  }

  protected getLayout(): RoomLayout {
    // 25×19 workshop: the Concourse doorway on the EAST wall (rows 8-9),
    // two machinery blocks off the main lane so the y=272 lane from the
    // door to the west stations is always clear.
    return {
      theme: 'workshop',
      grid: [
        '#########################',
        '#########################',
        '#.......................#',
        '#.......................#',
        '#............####.......#',
        '#............####.......#',
        '#.......................#',
        '#.......................#',
        '#.......................-',
        '#.......................-',
        '#.......................#',
        '#.......................#',
        '#............####.......#',
        '#............####.......#',
        '#.......................#',
        '#.......................#',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    return { x: 21.5 * TILE, y: 8.5 * TILE };
  }

  create(data?: { spawn?: string }) {
    // Inventory foundation wiring (v1 Concourse precedent): icons, the
    // secondary telemetry bridge and the M02/M03 declarations (declared +
    // offered; idempotent). The Component Locker starts EMPTY on the route.
    ensureInventoryIconTextures(this);
    installInventoryTelemetry();
    setInventoryTelemetryScene(key.scene.recordsWorkshop);
    declareM02Opportunity();
    declareM03Opportunities();
    stampContaminationNotes();

    super.create(data);

    refreshPilotCoverageProbe();
  }

  protected populateRoom(): void {
    this.addPilotDoor({ to: 'station_concourse', spawn: 'records_workshop' });

    // ——— Work Order Board — the stage anchor of both workshop stages ———
    const board = WORKSHOP_STATIONS.workOrderBoard;

    this.addStation({
      interactionKey: 'pilotWorkOrderBoard',
      label: 'Work Order Board',
      texture: 'proc-board-workorders',
      x: board.x,
      y: board.y,
      onPromptOpened: () => {
        this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
          metadata: { station_id: 'work_order_board', zone: this.zoneKey },
        });

        return true;
      },
    });
    this.signage(board.x, board.y - 44, 'WORK ORDERS');
    registerPilotStation({
      id: 'work_order_board',
      zone: 'records_workshop',
      x: board.x,
      y: board.y,
      label: 'Work Order Board',
      stages: ['workshop', 'workshop_work', 'workshop_return'],
      isDone: () => false,
      order: 0,
    });

    this.signage(6 * TILE, 2 * TILE - 8, 'RECORDS & RESTORATION');
    this.populateRecordsArea();

    // ——— Dressing ———
    this.addDecor(3 * TILE, 3.4 * TILE, 'proc-light-pool');
    this.addDecor(14 * TILE, 3.2 * TILE, 'proc-light-pool');
    this.addDecor(20 * TILE, 8.2 * TILE, 'proc-light-pool');
    this.addDecor(5 * TILE, 16 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(20 * TILE, 16 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(14.5 * TILE, 4.6 * TILE, 'proc-console-wall');
    this.addDecor(14.5 * TILE, 12.6 * TILE, 'proc-cabinet-calibration');
    this.addDecor(18.5 * TILE, 13 * TILE, 'proc-cart-utility');
    this.signage(22.2 * TILE, 7.2 * TILE, 'CONCOURSE  ▶');
  }

  /**
   * Records & restoration stations: incoming items (bundles) → visible
   * destinations (locker / bench), the filing surface (M02) and the two
   * press benches (M03 A/B). Explicit submit/leave controls live inside
   * the overlays.
   */
  private populateRecordsArea() {
    const S = WORKSHOP_STATIONS;

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
    this.signage(5.5 * TILE, 4.2 * TILE, 'INCOMING SUPPLIES');

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
      zone: 'records_workshop',
      x: S.filingDesk.x,
      y: S.filingDesk.y,
      label: 'Incident Filing Workstation',
      stages: ['workshop_work'],
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
    this.signage(6 * TILE, 12.6 * TILE, 'STORAGE  ·  ASSEMBLY');
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

        // Coded prior exposure: M02 committed or the other occasion closed
        // before this occasion opens.
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
      zone: 'records_workshop',
      x: at.x,
      y: at.y,
      label,
      stages: ['workshop_work'],
      isDone: () => m03OccasionStatus(occasion) === 'closed',
      order,
    });
  }

  private logStationOpened(stationId: string) {
    this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
      metadata: { station_id: stationId, zone: this.zoneKey },
    });
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
    return interactionKey === 'pilotWorkOrderBoard'
      ? this.boardBeat().body
      : undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    return interactionKey === 'pilotWorkOrderBoard'
      ? this.npcBeatOptions('pilotWorkOrderBoard', this.boardBeat())
      : [];
  }

  /** The board's beat depends only on the route stage, never on outcomes. */
  private boardBeat(): PilotNpcBeat {
    switch (pilotStage()) {
      case 'workshop':
        return {
          body:
            'WORK ORDERS — RESTORATION SHIFT\n' +
            'Filing desk, both label press batches, locker and bench are listed. Incoming supplies can go in the locker or to the bench. Sign the board when you are done here.',
          options: [
            {
              label: 'Take the orders.',
              tag: 'workshop_orders_taken',
              onSelected: () => {
                advancePilotStage('workshop_work', Date.now());
              },
            },
          ],
        };
      case 'workshop_work':
        return {
          body: 'WORK ORDERS — RESTORATION SHIFT\nAnything you leave open stays open. Sign off when you are done here.',
          options: [
            {
              label: 'Sign off — done here.',
              tag: 'workshop_signoff',
              feedback:
                'Signed. Kai needs you in the Diagnostics Laboratory — Concourse north door.',
              onSelected: () => {
                advancePilotStage('lab_briefing', Date.now());
              },
            },
            {
              label: 'Still working.',
              tag: 'workshop_continue',
              feedback: '',
            },
          ],
        };
      case 'workshop_return':
        return {
          body: 'WORK ORDERS — RETURN SHIFT\nClose out what you can here. Sign the board to close the shift; the Utility Deck review follows.',
          options: [
            {
              label: 'Sign off — close the shift here.',
              tag: 'workshop_return_signoff',
              feedback:
                'Signed. The Utility Deck is through the Concourse, east door.',
              onSelected: () => {
                advancePilotStage('deck_closure', Date.now());
              },
            },
            {
              label: 'Still working.',
              tag: 'workshop_return_continue',
              feedback: '',
            },
          ],
        };
      case 'arrival':
      case 'handover_briefing':
      case 'incident_handover':
        return {
          body: 'WORK ORDERS\nNo orders issued yet — Vale briefs at the Concourse incident desk first.',
          options: [{ label: 'Understood.', tag: 'workshop_early' }],
        };
      default:
        return {
          body: 'WORK ORDERS\nNothing open on this board right now.',
          options: [{ label: 'Understood.', tag: 'workshop_idle' }],
        };
    }
  }
}
