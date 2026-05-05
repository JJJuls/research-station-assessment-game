export interface RawGameEvent {
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
  };
}
