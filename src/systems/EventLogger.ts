export interface RawGameEvent {
  // Legacy prototype fields — retained during the canonical migration period.
  // Do not remove or globally rename; rooms migrate off these one at a time.
  session_id: string;
  timestamp_ms: number;
  scene: string;
  episode?: string;
  event_type: string;
  object_id?: string;
  x?: number;
  y?: number;
  state_before?: string;
  state_after?: string;
  score_delta?: Record<string, number>;

  // Canonical V3 §3.2 fields — additive, optional during the migration period.
  participant_id?: string;
  game_session_id?: string;
  condition?: string;
  game_version?: string;
  elapsed_seconds?: number;
  room_id?: string;
  task_id?: string;
  study_item_ids?: string[];
  construct_id?: string;
  choice_value?: string | number | null;
  attempt_number?: number;
  previous_state?: string;
  new_state?: string;
  success?: boolean | null;
  metadata?: Record<string, unknown>;
}

export class EventLogger {
  private events: RawGameEvent[] = [];

  log(event: RawGameEvent) {
    this.events.push(copyEvent(event));
  }

  getEvents() {
    return this.events.map(copyEvent);
  }

  clear() {
    this.events = [];
  }

  toJSON() {
    return JSON.stringify(this.events);
  }
}

function copyEvent(event: RawGameEvent): RawGameEvent {
  return {
    ...event,
    score_delta:
      event.score_delta === undefined ? undefined : { ...event.score_delta },
    study_item_ids:
      event.study_item_ids === undefined
        ? undefined
        : [...event.study_item_ids],
    metadata: deepCopyMetadata(event.metadata),
  };
}

/**
 * Deep-copies `metadata` so nested arrays/objects never share a reference
 * with a previously stored raw event. Intentionally scoped to JSON-compatible
 * values only (plain objects, arrays, strings, numbers, booleans, null) —
 * does not special-case Map/Set/Date/class instances/DOM objects. Event
 * metadata is expected to stay JSON-compatible (it is exported via
 * exportEventsJSON()); anything else passed in is copied by reference at
 * that position, not cloned.
 */
function deepCopyMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (metadata === undefined) {
    return undefined;
  }

  return deepCopyValue(metadata) as Record<string, unknown>;
}

function deepCopyValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(deepCopyValue);
  }

  if (value !== null && typeof value === 'object') {
    const copy: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      copy[key] = deepCopyValue(nestedValue);
    }

    return copy;
  }

  return value;
}
