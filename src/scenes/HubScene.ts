import { key } from '../constants';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { RoomScene } from '../world';

interface HubDoorSpec {
  label: string;
  roomId: string;
  x: number;
  y: number;
  /** Scene key once the room exists; sealed bulkhead until then. */
  targetSceneKey?: string;
  targetSpawn?: string;
}

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
    // Entering from a room door spawns just inside that door; default is
    // the Dock airlock at the bottom.
    // Spawns sit just OUTSIDE the 72px door interaction radius so an
    // immediate SPACE press cannot accidentally bounce the player back
    // through the door they came from.
    switch (data?.spawn) {
      case 'archive_room':
        return { x: 4 * 32, y: 4 * 32 };
      default:
        return { x: 13 * 32, y: 11.5 * 32 };
    }
  }

  protected populateRoom(): void {
    // Door ring. Order mirrors the V3 world structure list; only rooms
    // that exist as scenes get a target — everything else is a sealed
    // bulkhead (fiction-consistent, control/usability logging only).
    const doors: HubDoorSpec[] = [
      // Top wall doorways (centers of the '--' pairs), left to right:
      {
        label: 'Archive',
        roomId: 'archive_room',
        x: 4 * 32,
        y: 1 * 32 + 16,
        targetSceneKey: key.scene.archive,
      },
      {
        label: 'Systems Repair',
        roomId: 'systems_repair_room',
        x: 10 * 32,
        y: 1 * 32 + 16,
      },
      {
        label: 'Engineer Hub',
        roomId: 'engineer_hub',
        x: 16 * 32,
        y: 1 * 32 + 16,
      },
      {
        label: 'Inventory / Prep',
        roomId: 'inventory_prep_room',
        x: 22 * 32,
        y: 1 * 32 + 16,
      },
      // Left wall doorways (rows 6 and 9):
      {
        label: 'Hazard Control',
        roomId: 'hazard_control_room',
        x: 24,
        y: 6 * 32 + 16,
      },
      {
        label: 'Side Repair Bay',
        roomId: 'optional_side_repair_bay',
        x: 24,
        y: 9 * 32 + 16,
      },
      // Right wall doorways (rows 6 and 9):
      {
        label: 'Interruption Corridor',
        roomId: 'interruption_corridor',
        x: 25 * 32 + 8,
        y: 6 * 32 + 16,
      },
      {
        label: 'Final Core',
        roomId: 'final_core_room',
        x: 25 * 32 + 8,
        y: 9 * 32 + 16,
      },
    ];

    for (const spec of doors) {
      const isOpen = spec.targetSceneKey !== undefined;

      this.addDoor({
        x: spec.x,
        y: spec.y,
        label: spec.label,
        interactionKey: 'stationHub',
        texture: isOpen ? 'prop-hub-door-frame' : 'prop-hub-locked-door',
        ...(isOpen
          ? {
              target: {
                sceneKey: spec.targetSceneKey!,
                roomId: spec.roomId,
                spawn: 'station_hub',
              },
            }
          : {
              eventType: 'station_hub_sealed_door_attempted',
              eventMetadata: { door: spec.roomId },
              sealedMessage: `${spec.label} section is sealed — pressurisation pending.`,
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
  }

  protected onRoomEntered(): void {
    // Per-entry navigation event (documented in event-schema.md §2);
    // deliberately NOT once-per-session — re-entries are legitimate
    // navigation data. Assessment/baseline events are guarded elsewhere.
    this.logRoomEvent('stationHub', 'station_hub_entered');
  }

  protected getPromptOptions(): PromptOption[] {
    // The Hub has no choice prompts; its single station short-circuits in
    // onPromptOpened. Returning an empty list keeps the base class safe.
    return [];
  }

  private buildStatusBoardText(): string {
    const mission = researchRuntime.sessionState.getMissionState();
    const done = (roomId: string) =>
      mission.completed_rooms.includes(roomId) ? 'logged' : 'pending';

    return [
      'STATION STATUS',
      `Arrival check-in: ${done('dock_arrival')}`,
      `Archive access: ${done('archive_room')}`,
      'Remaining sections: sealed — pressurisation pending.',
    ].join('\n');
  }
}
