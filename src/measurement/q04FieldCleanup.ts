/**
 * Q04 standardised field work-site cleanup module state
 * (physical-mechanics session, Unit 2).
 *
 * The direct behavioural translation of Q04 (explicit physical cleanup /
 * restore-versus-leave), instantiated at the Survey Terrace feed-housing
 * work site: the moment the antenna install completes (a route milestone,
 * never another item's outcome), the SAME standardised disorder appears
 * for every participant — two packing wraps (waste), two mount clamps
 * (field tools) and two panel shims (displaced components) at fixed
 * positions — together with three fixed return points (disposal unit,
 * field tool rack, component crate). The operational objective is already
 * complete, the exit stays available at all times, and the participant
 * may leave, partially restore, or fully restore the site; the site state
 * is recorded at every exit.
 *
 * INDEPENDENCE (ruling §§1/4/6): this module's entry state is identical
 * regardless of how tidily the participant behaved in the Prep room or
 * anywhere else; its proto_q04_* raw events are its own family and feed
 * no other item; the legacy Inventory cleanup card stages and their
 * canonical events are untouched and remain where they were. All names
 * here are internal/provisional (proto_*), never canonical; no scoring
 * exists; a session that never reaches the install simply records
 * no-opportunity — never low tidiness.
 */

export const Q04_OPPORTUNITY_ID = 'proto_q04_field_cleanup';
export const Q04_ENTRY_STATE_VERSION = 'q04-field-mess-v1';

export type Q04Category = 'waste' | 'field_tool' | 'component';

export interface Q04MessObject {
  object_id: string;
  label: string;
  icon: string;
  category: Q04Category;
  x: number;
  y: number;
}

/**
 * The standardised mess: fixed set, fixed world positions (px), identical
 * for every participant (frozen-stimuli rule).
 */
export const Q04_MESS_OBJECTS: readonly Q04MessObject[] = [
  {
    object_id: 'q04_wrap_a',
    label: 'Packing Wrap',
    icon: 'proc-icon-packing-wrap',
    category: 'waste',
    x: 560,
    y: 296,
  },
  {
    object_id: 'q04_wrap_b',
    label: 'Packing Wrap',
    icon: 'proc-icon-packing-wrap',
    category: 'waste',
    x: 632,
    y: 312,
  },
  {
    object_id: 'q04_clamp_a',
    label: 'Mount Clamp',
    icon: 'proc-icon-mount-clamp',
    category: 'field_tool',
    x: 576,
    y: 248,
  },
  {
    object_id: 'q04_clamp_b',
    label: 'Mount Clamp',
    icon: 'proc-icon-mount-clamp',
    category: 'field_tool',
    x: 616,
    y: 336,
  },
  {
    object_id: 'q04_shim_a',
    label: 'Panel Shim',
    icon: 'proc-icon-panel-shim',
    category: 'component',
    x: 544,
    y: 328,
  },
  {
    object_id: 'q04_shim_b',
    label: 'Panel Shim',
    icon: 'proc-icon-panel-shim',
    category: 'component',
    x: 648,
    y: 240,
  },
] as const;

export interface Q04ReturnPoint {
  container_id: string;
  label: string;
  texture: string;
  accepts: Q04Category;
  x: number;
  y: number;
}

/** Fixed return points along the south path of the work site. */
export const Q04_RETURN_POINTS: readonly Q04ReturnPoint[] = [
  {
    container_id: 'q04_disposal',
    label: 'Disposal Unit',
    texture: 'proc-disposal-unit',
    accepts: 'waste',
    x: 384,
    y: 384,
  },
  {
    container_id: 'q04_tool_rack',
    label: 'Field Tool Rack',
    texture: 'proc-rack-fieldtools',
    accepts: 'field_tool',
    x: 464,
    y: 384,
  },
  {
    container_id: 'q04_component_crate',
    label: 'Component Crate',
    texture: 'proc-crate-components',
    accepts: 'component',
    x: 544,
    y: 384,
  },
] as const;

interface Q04State {
  /** The standardised mess has been placed (install completed). */
  mess_presented: boolean;
  /** object_id -> return-point container_id for each cleared object. */
  cleared: Record<string, string>;
  /** Physically carried mess object (transient; returns on room exit). */
  carried: string | null;
  /** The primary window closed (first terrace exit after presentation). */
  window_closed: boolean;
  /** Site state snapshot recorded at the window close. */
  exit_snapshot: { cleared: number; remaining: number } | null;
}

function createInitialQ04State(): Q04State {
  return {
    mess_presented: false,
    cleared: {},
    carried: null,
    window_closed: false,
    exit_snapshot: null,
  };
}

export const q04State: Q04State = createInitialQ04State();

export function presentQ04Mess() {
  q04State.mess_presented = true;
}

export function getQ04MessObject(objectId: string): Q04MessObject {
  const object = Q04_MESS_OBJECTS.find((entry) => entry.object_id === objectId);

  if (object === undefined) {
    throw new Error(`Unknown Q04 mess object: ${objectId}`);
  }

  return object;
}

export function getQ04ReturnPoint(containerId: string): Q04ReturnPoint {
  const point = Q04_RETURN_POINTS.find(
    (entry) => entry.container_id === containerId,
  );

  if (point === undefined) {
    throw new Error(`Unknown Q04 return point: ${containerId}`);
  }

  return point;
}

/** Mess objects still lying at the work site (not carried, not cleared). */
export function q04RemainingObjects(): Q04MessObject[] {
  return Q04_MESS_OBJECTS.filter(
    (object) =>
      q04State.cleared[object.object_id] === undefined &&
      q04State.carried !== object.object_id,
  );
}

export function q04ClearedCount(): number {
  return Object.keys(q04State.cleared).length;
}

export function q04SiteRestored(): boolean {
  return q04ClearedCount() === Q04_MESS_OBJECTS.length;
}

export function pickUpQ04Object(objectId: string): boolean {
  if (
    !q04State.mess_presented ||
    q04State.carried !== null ||
    q04State.cleared[objectId] !== undefined
  ) {
    return false;
  }

  q04State.carried = objectId;

  return true;
}

/** Drops the carried object back where it lay (room exit put-back). */
export function dropQ04Carried() {
  q04State.carried = null;
}

/**
 * Places the carried object at a return point. Returns false when the
 * point does not take this category (neutral mismatch; object stays in
 * hand) — category fit is fiction-transparent, and sorting accuracy is
 * deliberately NOT a Q04 measure (that construct belongs to Q01).
 */
export function placeQ04Object(objectId: string, containerId: string): boolean {
  if (q04State.carried !== objectId) {
    return false;
  }

  const object = getQ04MessObject(objectId);
  const point = getQ04ReturnPoint(containerId);

  if (object.category !== point.accepts) {
    return false;
  }

  q04State.carried = null;
  q04State.cleared[objectId] = containerId;

  return true;
}

/**
 * Closes the primary window at the FIRST terrace exit after presentation
 * and snapshots the site state; later exits return null (raw telemetry
 * may still be logged by the scene, but the primary record is closed).
 */
export function closeQ04WindowOnExit(): {
  cleared: number;
  remaining: number;
} | null {
  if (!q04State.mess_presented || q04State.window_closed) {
    return null;
  }

  q04State.window_closed = true;
  q04State.exit_snapshot = {
    cleared: q04ClearedCount(),
    remaining: Q04_MESS_OBJECTS.length - q04ClearedCount(),
  };

  return { ...q04State.exit_snapshot };
}

/** Test-only escape hatch (resetQ03State precedent). */
export function resetQ04State() {
  Object.assign(q04State, createInitialQ04State());
  q04State.cleared = {};
}
