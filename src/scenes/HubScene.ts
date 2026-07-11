import { key } from '../constants';
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
