export type { CanonicalEventContext } from './CanonicalEventContext';
export { CANONICAL_EVENT_CONTEXT } from './CanonicalEventContext';
export type {
  InteractionKey,
  PromptOption,
  RoomDoorConfig,
  RoomStationConfig,
} from './RoomScene';
export { RoomScene, runOncePerSession } from './RoomScene';
export type { RoomTransitionTarget } from './SceneRouter';
export {
  registerSceneRoute,
  resolveStartSceneKey,
  transitionToRoom,
} from './SceneRouter';
export type { BuiltRoomMap, RoomLayout } from './StationMapBuilder';
export { buildPlaceholderRoomMap } from './StationMapBuilder';
