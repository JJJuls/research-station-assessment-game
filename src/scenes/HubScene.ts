import { key } from '../constants';
import { priorityAllocationScenario, ScenarioController } from '../scenarios';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { getStationByRoomId, RoomScene, STATION_REGISTRY } from '../world';

/**
 * Station Hub — control/usability navigation area connecting the Dock to
 * the eight assessment rooms (approved plan §11). NOT a V3 assessment
 * room: every event here carries study_item_ids: [] and no construct_id,
 * and is excluded from construct scoring (event-schema.md §2,
 * "station_hub"). Re-entering the Hub never re-fires assessment-room
 * completion or Dock baseline events — those are guarded at session level.
 */
export class HubScene extends RoomScene {
  protected readonly roomId = 'station_hub';
  protected readonly roomInteractionKey: InteractionKey = 'stationHub';

  /**
   * Pilot Scenario B (priority allocation) — additive station driven by
   * the src/scenarios framework. Its scenario_* events are pilot telemetry
   * with study_item_ids/construct absent, so the Hub's "never Q-mapped"
   * rule is preserved. Recreated per scene instance; progress lives at
   * framework module scope.
   */
  private allocationScenario: ScenarioController | null = null;

  constructor() {
    super(key.scene.hub);
  }

  protected getLayout(): RoomLayout {
    // 26×16 radial hub: Dock airlock at the bottom, four doorways along
    // the top wall, one on each side wall at rows 6 and 9, central
    // console block.
    return {
      grid: [
        '##########################',
        '###--####--####--####--###',
        '#........................#',
        '#........................#',
        '#........................#',
        '#........................#',
        '-........................-',
        '#........................#',
        '#..........####..........#',
        '-........................-',
        '#........................#',
        '#........................#',
        '#........................#',
        '#........................#',
        '############--############',
        '##########################',
      ],
    };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    // Entering from a room door spawns just inside that door (registry
    // hubSpawn, placed outside the 72px interaction radius so an immediate
    // SPACE press cannot bounce the player back); default is the Dock
    // airlock at the bottom.
    const from =
      data?.spawn !== undefined ? getStationByRoomId(data.spawn) : undefined;

    return from?.hubSpawn ?? { x: 13 * 32, y: 11.5 * 32 };
  }

  protected populateRoom(): void {
    // Door ring, driven by the station registry (array order = door order,
    // mirroring the V3 world structure list). Only rooms that exist as
    // scenes get a target — everything else is a sealed bulkhead
    // (fiction-consistent, control/usability logging only).
    for (const station of STATION_REGISTRY) {
      const isOpen = station.sceneKey !== undefined;

      this.addDoor({
        x: station.hubDoor.x,
        y: station.hubDoor.y,
        label: station.label,
        interactionKey: 'stationHub',
        texture: isOpen ? 'prop-hub-door-frame' : 'prop-hub-locked-door',
        ...(isOpen
          ? {
              target: {
                sceneKey: station.sceneKey!,
                roomId: station.roomId,
                spawn: 'station_hub',
              },
            }
          : {
              eventType: 'station_hub_sealed_door_attempted',
              eventMetadata: { door: station.roomId },
              sealedMessage: `${station.label} section is sealed — pressurisation pending.`,
            }),
      });
    }

    // Door back to the Dock (always open, center of the bottom '--').
    this.addDoor({
      x: 13 * 32,
      y: 14 * 32 + 16,
      label: 'Dock / Arrival Bay',
      texture: 'prop-hub-door-frame',
      interactionKey: 'stationHub',
      target: {
        sceneKey: key.scene.dock,
        roomId: 'dock_arrival',
        spawn: 'station_hub',
      },
    });

    // Mission status board (allowed progress UI: checklist/status labels,
    // V3 §2 — no scores, no personality feedback). Mounted on the central
    // console block.
    // Central console dressing (decorative).
    this.addDecor(12 * 32, 8.5 * 32, 'prop-hub-console');
    this.addDecor(14 * 32, 8.5 * 32, 'prop-hub-console');

    this.addStation({
      interactionKey: 'stationHub',
      label: 'Status Board',
      texture: 'prop-hub-status-board',
      x: 13 * 32,
      y: 7.5 * 32,
      onPromptOpened: () => {
        this.logRoomEvent('stationHub', 'station_hub_status_board_viewed');
        this.showFeedbackMessage(this.buildStatusBoardText());
        return false;
      },
    });

    // Pilot Scenario B: priority allocation console on the SOUTH face of
    // the central console block, west end (11.5*32, 9.5*32) — 80 px from
    // the Dock-entry spawn (416, 368), keeping the registry rule that no
    // spawn lands inside a 72 px interaction radius, and 80+ px from the
    // status board (approached from the north), so each interactable stays
    // the strict nearest target on its own side. Clear of every door route
    // and of hubToStatusBoard's position-synced driving legs.
    this.allocationScenario = new ScenarioController(
      priorityAllocationScenario,
      {
        logScenarioEvent: (eventType, context) =>
          this.logScenarioEvent('hubPriorityAllocation', eventType, context),
        showFeedback: (message) => this.showFeedbackMessage(message),
      },
    );
    this.addStation(
      this.allocationScenario.buildStationConfig({
        x: 11.5 * 32,
        y: 9.5 * 32,
      }),
    );
  }

  protected onRoomEntered(): void {
    // Per-entry navigation event (documented in event-schema.md §2);
    // deliberately NOT once-per-session — re-entries are legitimate
    // navigation data. Assessment/baseline events are guarded elsewhere.
    this.logRoomEvent('stationHub', 'station_hub_entered');
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    // Pilot Scenario B prompt tree; the Status Board keeps short-circuiting
    // in its own onPromptOpened (no options ever render for it).
    if (interactionKey === 'hubPriorityAllocation') {
      return this.allocationScenario?.getRootOptions() ?? [];
    }

    return [];
  }

  protected onRoomExit(): void {
    // Leaving the Hub with the allocation scenario entered but uncommitted
    // is measured abandonment telemetry (framework logs once per departure).
    this.allocationScenario?.handleRoomExit();
  }

  private buildStatusBoardText(): string {
    const mission = researchRuntime.sessionState.getMissionState();
    const done = (roomId: string) =>
      mission.completed_rooms.includes(roomId) ? 'logged' : 'pending';

    // Registry-driven board (U5): one line per OPEN station (in door-ring
    // order), then a single collective line while any station stays sealed.
    // Output is byte-identical to the V1 slice while Archive is the only
    // open room. Allowed progress UI only: status labels, never scores.
    const lines = [
      'STATION STATUS',
      `Arrival check-in: ${done('dock_arrival')}`,
    ];
    let anySealed = false;

    for (const station of STATION_REGISTRY) {
      if (station.sceneKey !== undefined) {
        if (station.statusBoardLabel !== undefined) {
          lines.push(`${station.statusBoardLabel}: ${done(station.roomId)}`);
        }
      } else {
        anySealed = true;
      }
    }

    if (anySealed) {
      lines.push('Remaining sections: sealed — pressurisation pending.');
    }

    return lines.join('\n');
  }
}
