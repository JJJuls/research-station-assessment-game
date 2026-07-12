import { key } from '../constants';
import { isSceneRouteRegistered, registerSceneRoute } from './SceneRouter';

/**
 * Single source of truth for the eight V3 assessment stations reachable from
 * the Station Hub door ring (V3 §2 world structure; canonical `room_id`
 * naming per docs/research/event-schema.md §2). Bringing a room online is
 * one registry change: set `sceneKey` when the room's scene exists — the Hub
 * door opens and the `?scene=` route registers from the same entry.
 *
 * The Dock and the Hub itself are deliberately NOT registry entries: they
 * are control/usability areas, not assessment stations, and their routes/
 * doors are fixed in SceneRouter/HubScene.
 *
 * Nothing here is scientific data: labels, route params, and coordinates
 * are presentation/routing constants. Scientific context (study_item_ids,
 * construct_id) lives only in CanonicalEventContext + researchInteractions.
 */
export interface StationRegistration {
  /** Canonical room_id (event-schema.md §2 naming table). */
  roomId: string;
  /** Player-facing Hub door label (in-fiction; no questionnaire wording). */
  label: string;
  /**
   * `?scene=` launch alias, registered only once `sceneKey` exists
   * (SceneRouter rule: unbuilt scenes are never routable).
   */
  routeParam: string;
  /** Phaser scene key; undefined = room not built yet (sealed bulkhead). */
  sceneKey?: string;
  /** Fixed slot in the Hub door ring (HubScene 26×16 grid, pixels). */
  hubDoor: { x: number; y: number };
  /**
   * Where the player appears in the Hub when returning from this room.
   * Placed 80px inside the door — just outside RoomScene's 72px interaction
   * radius, so an immediate SPACE press cannot bounce the player back
   * (Archive/V1 precedent). Each room's build beat re-verifies its value.
   */
  hubSpawn: { x: number; y: number };
  /**
   * Line label on the Hub status board once the room is open (allowed
   * progress UI: checklist/status labels only, V3 §2 — no scores, no
   * personality feedback). Defined per room build beat alongside sceneKey;
   * sealed rooms are never listed individually.
   */
  statusBoardLabel?: string;
}

/**
 * Order matters: this array IS the Hub door ring order (V3 world-structure
 * list, unchanged from the V1-slice HubScene). Do not reorder — door
 * placement is part of the frozen presentation participants see.
 */
export const STATION_REGISTRY: readonly StationRegistration[] = [
  // Top wall doorways, left to right:
  {
    roomId: 'archive_room',
    label: 'Archive',
    routeParam: 'archive',
    sceneKey: key.scene.archive,
    hubDoor: { x: 4 * 32, y: 1 * 32 + 16 },
    hubSpawn: { x: 4 * 32, y: 4 * 32 },
    statusBoardLabel: 'Archive access',
  },
  {
    roomId: 'systems_repair_room',
    label: 'Systems Repair',
    routeParam: 'repair',
    sceneKey: key.scene.repair,
    hubDoor: { x: 10 * 32, y: 1 * 32 + 16 },
    hubSpawn: { x: 10 * 32, y: 4 * 32 },
    statusBoardLabel: 'Systems repair',
  },
  {
    roomId: 'engineer_hub',
    label: 'Engineer Hub',
    routeParam: 'engineer',
    sceneKey: key.scene.engineer,
    hubDoor: { x: 16 * 32, y: 1 * 32 + 16 },
    hubSpawn: { x: 16 * 32, y: 4 * 32 },
    statusBoardLabel: 'Engineer report',
  },
  {
    roomId: 'inventory_prep_room',
    label: 'Inventory / Prep',
    routeParam: 'inventory',
    sceneKey: key.scene.inventory,
    hubDoor: { x: 22 * 32, y: 1 * 32 + 16 },
    hubSpawn: { x: 22 * 32, y: 4 * 32 },
    statusBoardLabel: 'Kit preparation',
  },
  // Left wall doorways (rows 6 and 9):
  {
    roomId: 'hazard_control_room',
    label: 'Hazard Control',
    routeParam: 'hazard',
    sceneKey: key.scene.hazard,
    hubDoor: { x: 24, y: 6 * 32 + 16 },
    hubSpawn: { x: 24 + 80, y: 6 * 32 + 16 },
    statusBoardLabel: 'Hazard control',
  },
  {
    roomId: 'optional_side_repair_bay',
    label: 'Side Repair Bay',
    routeParam: 'side_repair',
    sceneKey: key.scene.sideRepair,
    hubDoor: { x: 24, y: 9 * 32 + 16 },
    hubSpawn: { x: 24 + 80, y: 9 * 32 + 16 },
    statusBoardLabel: 'Stabiliser repair',
  },
  // Right wall doorways (rows 6 and 9):
  {
    roomId: 'interruption_corridor',
    label: 'Interruption Corridor',
    routeParam: 'interruption',
    sceneKey: key.scene.interruption,
    hubDoor: { x: 25 * 32 + 8, y: 6 * 32 + 16 },
    hubSpawn: { x: 25 * 32 + 8 - 80, y: 6 * 32 + 16 },
    statusBoardLabel: 'Comms interruption',
  },
  {
    roomId: 'final_core_room',
    label: 'Final Core',
    routeParam: 'final_core',
    sceneKey: key.scene.finalCore,
    hubDoor: { x: 25 * 32 + 8, y: 9 * 32 + 16 },
    hubSpawn: { x: 25 * 32 + 8 - 80, y: 9 * 32 + 16 },
    statusBoardLabel: 'Core synchronization',
  },
];

export function getStationByRoomId(
  roomId: string,
): StationRegistration | undefined {
  return STATION_REGISTRY.find((station) => station.roomId === roomId);
}

/**
 * Registers `?scene=` aliases for every built station whose route is not
 * already known to SceneRouter (the V1 static map keeps `archive`).
 * Idempotent; called from Boot before the start scene resolves.
 */
export function registerBuiltStationRoutes() {
  for (const station of STATION_REGISTRY) {
    if (
      station.sceneKey !== undefined &&
      !isSceneRouteRegistered(station.routeParam)
    ) {
      registerSceneRoute(station.routeParam, station.sceneKey);
    }
  }
}
