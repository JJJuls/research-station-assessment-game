export type { CanonicalEventContext } from './CanonicalEventContext';
export { CANONICAL_EVENT_CONTEXT } from './CanonicalEventContext';
export type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomDoorConfig,
  RoomStationConfig,
} from './RoomScene';
export { RoomScene, runOncePerSession } from './RoomScene';
export type { FailedTaskState, RoomTaskStateHandle } from './roomTaskState';
export {
  createFailedTaskState,
  createRoomTaskState,
  recordFailedAttempt,
  shouldLogAbandonedOnExit,
  shouldLogReturnedOnEnter,
} from './roomTaskState';
export type { RoomTransitionTarget } from './SceneRouter';
export {
  isSceneRouteRegistered,
  registerSceneRoute,
  resolveStartSceneKey,
  transitionToRoom,
} from './SceneRouter';
export type { BuiltRoomMap, RoomLayout } from './StationMapBuilder';
export {
  buildPlaceholderRoomMap,
  DOCK_PAD_TILESET_KEY,
  DOCK_PAD_TILESET_URL,
  WANG_TILESET_KEY,
  WANG_TILESET_URL,
} from './StationMapBuilder';
export type { StationRegistration } from './stationRegistry';
export {
  getStationByRoomId,
  registerBuiltStationRoutes,
  STATION_REGISTRY,
} from './stationRegistry';
