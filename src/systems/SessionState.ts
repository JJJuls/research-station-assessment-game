export interface SessionMetadata {
  participant_id: string;
  game_session_id: string;
  condition: string;
  game_version: string;
  started_at_ms: number;
}

export class SessionState {
  private metadata: SessionMetadata;

  constructor(
    searchParams = getCurrentSearchParams(),
    startedAtMs = Date.now(),
  ) {
    this.metadata = {
      participant_id:
        searchParams.get('participant_id') ?? createFallbackId('participant'),
      game_session_id:
        searchParams.get('game_session_id') ?? createFallbackId('session'),
      condition: searchParams.get('condition') ?? 'default',
      game_version:
        searchParams.get('game_version') ??
        import.meta.env.VITE_APP_VERSION ??
        'unknown',
      started_at_ms: startedAtMs,
    };
  }

  getMetadata() {
    return { ...this.metadata };
  }

  getElapsedSeconds(nowMs = Date.now()) {
    return Math.max(
      0,
      Math.floor((nowMs - this.metadata.started_at_ms) / 1000),
    );
  }
}

function getCurrentSearchParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function createFallbackId(prefix: string) {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${randomId}`;
}
