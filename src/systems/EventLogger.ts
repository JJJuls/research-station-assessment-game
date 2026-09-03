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

  // Pilot V3 (Unit 1) integrity metadata — additive, assigned by the logger
  // itself, never by a caller. PROVISIONAL(P1-9): adding fields to the
  // canonical payload is an event-schema decision that stays open; these
  // two are integrity metadata only. `sequence` is monotonic per session
  // identity across page loads (the durable store hands the logger its
  // start value); `page_load_index` says which page load produced the
  // event — deliberately NOT named like `attempt_number`, the canonical
  // task-attempt measurement field, so the two can never be confused in
  // a persistence analysis. Neither is a measurement: they exist so an
  // exported log can be proven complete.
  sequence?: number;
  page_load_index?: number;
}

export type EventSink = (event: RawGameEvent) => void;

export class EventLogger {
  private events: RawGameEvent[] = [];
  private nextSequence = 1;
  private pageLoadIndex = 1;
  private sink: EventSink | null = null;

  /**
   * Continues numbering from an earlier page load of the same identity.
   * Only ever lowers nothing: a start below the current counter is ignored
   * so a sequence number can never be reused within a page lifetime.
   */
  configureSequencing(nextSequence: number, pageLoadIndex: number) {
    if (Number.isFinite(nextSequence) && nextSequence > this.nextSequence) {
      this.nextSequence = Math.floor(nextSequence);
    }

    if (Number.isFinite(pageLoadIndex) && pageLoadIndex >= 1) {
      this.pageLoadIndex = Math.floor(pageLoadIndex);
    }
  }

  /**
   * Installs the durable mirror. The sink receives a defensive copy of each
   * stored event AFTER it is in memory, and a throwing sink can never lose
   * or block the in-memory append.
   */
  setSink(sink: EventSink | null) {
    this.sink = sink;
  }

  getNextSequence() {
    return this.nextSequence;
  }

  log(event: RawGameEvent) {
    const stored = copyEvent(event);

    stored.sequence = this.nextSequence;
    stored.page_load_index = this.pageLoadIndex;
    this.nextSequence += 1;
    this.events.push(stored);

    if (this.sink !== null) {
      try {
        this.sink(copyEvent(stored));
      } catch {
        // The durable mirror is a safety net; its failure is reported via
        // the store's own health, never by breaking the append-only log.
      }
    }
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
