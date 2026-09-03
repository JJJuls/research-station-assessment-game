import type { RawGameEvent } from './EventLogger';

/**
 * Durable, append-only mirror of the raw event log (Pilot V3, Unit 1).
 *
 * PROVISIONAL(INT-2) — "local durable append-only queue" (decision pack
 * §4.7); PROVISIONAL(P0-3) — persistence/reload recovery mechanism and its
 * payload effects; both remain open research-owner rulings. Audit refs:
 * P0-3 / P1-9 / PS-3 / PS-7.
 *
 * Every raw event the runtime logs is written synchronously into a chunked
 * `localStorage` layout keyed by launch mode and session identity
 * `(launch_mode, participant_id, game_session_id)`, so a reload, a closed
 * tab or a crashed renderer loses nothing that had already been logged on
 * the device. The store is a TRANSPORT-SIDE SAFETY NET only:
 *
 * - it never creates, edits or drops an event — it stores exactly what
 *   `EventLogger` appended, in order;
 * - it never feeds the in-memory log or the summary: `computeSummary` keeps
 *   seeing only the current page load's events, exactly as before. Events
 *   recovered from an earlier page load of the same identity are surfaced
 *   SEPARATELY as `prior_page_load_events` in the export payload, so an
 *   analyst can see them and no derived variable silently double-counts a
 *   restart;
 * - it is never a research signal: its health (`durable` / `memory_only` /
 *   `degraded`) is transport metadata, never a data-quality variable;
 * - recovered records are accepted only when their own identity fields
 *   match the store identity (threat model §7.5: no cross-participant
 *   bleed on a shared device); mismatches are counted and rejected.
 *
 * Layout (all keys prefixed `research-events:v1:<mode>:<enc(pid)>:<enc(sid)>`):
 *   `:meta`      — { page_load_count, event_count, chunk_count, last_sequence }
 *   `:chunk:<n>` — JSON array of up to CHUNK_SIZE events
 * Appending rewrites only the tail chunk, so the cost of one append is
 * bounded by CHUNK_SIZE, not by the log length. A small index key
 * (`research-events:v1:index`) bounds retention to the most recent
 * MAX_RETAINED_IDENTITIES identities and expires identities untouched for
 * EVENT_STORE_EXPIRY_MS, so a shared machine never accumulates old
 * sessions. `clear()` is the acknowledgement hook: the completion pipeline
 * removes a buffer once the server has acknowledged its export.
 *
 * Pure and Node-importable: no `window` access at import time; the browser
 * backend is resolved lazily and every storage call is wrapped, so a
 * throwing or absent storage degrades to memory without touching gameplay.
 */

export type DurableStoreHealth = 'durable' | 'memory_only' | 'degraded';

export interface EventStoreBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface EventStoreIdentity {
  participant_id: string;
  game_session_id: string;
  /**
   * Launch-mode class the buffer belongs to (test / development /
   * production). Part of the key so a dry run and a participant launch of
   * the same identity never share one buffer (PS-2 separation).
   */
  launch_mode?: string;
}

export interface EventStoreOpenResult {
  /** 1 for the first page load of this identity, 2 for the first reload… */
  page_load_index: number;
  /** The sequence number the next logged event must receive. */
  next_sequence: number;
  /** Events persisted by earlier page loads of the same identity, in order. */
  prior_page_load_events: RawGameEvent[];
  health: DurableStoreHealth;
  /** Meta was unreadable; events and the high-water mark came from chunks. */
  recovered_from_chunks: boolean;
  /** Stored records whose identity did not match this store (rejected). */
  foreign_records_rejected: number;
  /** Identities removed at open because they exceeded the expiry. */
  expired_identities_removed: number;
}

/**
 * Integrity block exported alongside the raw events so a reader can verify
 * losslessness without trusting the client: sequence numbers must run
 * without gaps from 1 to `last_sequence` across prior and current page
 * loads, `expected_event_count` (= `last_sequence`) must equal
 * `event_count + prior_page_load_event_count`, and rejections/evictions
 * must be zero.
 */
export interface EventIntegrity {
  page_load_index: number;
  first_sequence: number | null;
  last_sequence: number | null;
  /** Current-page-load events (the `raw_events` array). */
  event_count: number;
  /** Events recovered from earlier page loads (`prior_page_load_events`). */
  prior_page_load_event_count: number;
  /** What a lossless log would contain: `last_sequence`, or 0. */
  expected_event_count: number;
  /** Missing sequence numbers in 1..last_sequence (leading gap included). */
  sequence_gap_count: number;
  /** Duplicate sequence numbers across prior + current (must be 0). */
  sequence_duplicate_count: number;
  durable_store: DurableStoreHealth;
  /** Events the durable store currently holds for this identity. */
  durable_event_count: number;
  /** Meta was unreadable at open and events were recovered from chunks. */
  recovered_from_chunks: boolean;
  /** Stored records rejected at open because their identity mismatched. */
  foreign_records_rejected: number;
  /** Other identities' buffers this session evicted to stay durable. */
  store_evictions: number;
}

export const EVENT_STORE_PREFIX = 'research-events:v1';
export const EVENT_STORE_CHUNK_SIZE = 100;
export const MAX_RETAINED_IDENTITIES = 8;
/** Identities untouched for this long are removed at the next open. */
export const EVENT_STORE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CHUNK_PROBE = 10_000;

interface StoreMeta {
  version: 1;
  page_load_count: number;
  event_count: number;
  chunk_count: number;
  last_sequence: number;
  updated_at: string;
}

interface IndexEntry {
  key: string;
  updated_at: string;
}

export class DurableEventStore {
  private readonly baseKey: string;
  private health: DurableStoreHealth;
  private meta: StoreMeta = emptyMeta();
  private tail: RawGameEvent[] = [];
  private opened = false;
  private openResult: EventStoreOpenResult | null = null;
  private evictions = 0;

  constructor(
    private readonly identity: EventStoreIdentity,
    private readonly backend: EventStoreBackend | null = resolveLocalStorage(),
    private readonly now: () => number = Date.now,
  ) {
    this.baseKey = identityKey(identity);
    this.health = backend === null ? 'memory_only' : 'durable';
  }

  getHealth(): DurableStoreHealth {
    return this.health;
  }

  /** Number of events currently persisted for this identity. */
  persistedCount(): number {
    return this.meta.event_count;
  }

  /** Other identities' buffers evicted by this store instance (quota). */
  evictionCount(): number {
    return this.evictions;
  }

  /**
   * Loads whatever earlier page loads persisted for this identity, records
   * this page load and returns the sequencing state the logger must
   * continue from. Idempotent: a second call returns the first result.
   */
  open(): EventStoreOpenResult {
    if (this.openResult !== null) {
      return this.openResult;
    }

    this.opened = true;

    if (this.backend === null) {
      this.openResult = {
        page_load_index: 1,
        next_sequence: 1,
        prior_page_load_events: [],
        health: this.health,
        recovered_from_chunks: false,
        foreign_records_rejected: 0,
        expired_identities_removed: 0,
      };

      return this.openResult;
    }

    const expired = this.expireStaleIdentities();
    const storedMeta = this.readMeta();
    let recoveredFromChunks = false;
    let chunkCount: number;

    if (storedMeta !== null) {
      chunkCount = storedMeta.chunk_count;
    } else {
      // Meta unreadable or absent: never trust that to mean "empty". Probe
      // chunk keys so already-persisted events are recovered and no
      // sequence number is ever reissued (scientific review F4).
      chunkCount = this.probeChunkCount();
      recoveredFromChunks = chunkCount > 0;
    }

    const { events: prior, rejected } = this.readChunks(chunkCount);
    const highest = highestSequence(prior);
    const priorLoads = highestPageLoad(prior);

    if (storedMeta !== null) {
      this.meta = { ...storedMeta };

      if (prior.length !== storedMeta.event_count) {
        // Torn write (crash between chunk and meta): trust the events we
        // could read for the count, but never lower the high-water mark —
        // a chunk that could not be read back still consumed its numbers.
        this.meta.event_count = prior.length;
        this.meta.chunk_count = Math.max(
          storedMeta.chunk_count,
          Math.ceil(prior.length / EVENT_STORE_CHUNK_SIZE),
        );
      }

      this.meta.last_sequence = Math.max(storedMeta.last_sequence, highest);
      this.meta.page_load_count = Math.max(
        storedMeta.page_load_count,
        priorLoads,
      );
    } else {
      this.meta = {
        ...emptyMeta(),
        event_count: prior.length,
        chunk_count: chunkCount,
        last_sequence: highest,
        page_load_count: priorLoads,
      };
    }

    this.meta.page_load_count += 1;
    this.meta.updated_at = new Date(this.now()).toISOString();
    this.tail =
      this.meta.chunk_count === 0
        ? []
        : prior.slice((this.meta.chunk_count - 1) * EVENT_STORE_CHUNK_SIZE);

    if (!this.writeMeta()) {
      this.health = 'degraded';
    } else {
      this.touchIndex();
    }

    this.openResult = {
      page_load_index: this.meta.page_load_count,
      next_sequence: this.meta.last_sequence + 1,
      prior_page_load_events: prior,
      health: this.health,
      recovered_from_chunks: recoveredFromChunks,
      foreign_records_rejected: rejected,
      expired_identities_removed: expired,
    };

    return this.openResult;
  }

  /**
   * Persists one event. Never throws. On the first storage failure the
   * store evicts other retained identities once and retries; if the write
   * still fails the store marks itself `degraded` and stops writing (the
   * in-memory log is untouched and still exported).
   */
  append(event: RawGameEvent): void {
    if (this.backend === null || this.health === 'degraded' || !this.opened) {
      return;
    }

    if (this.tail.length >= EVENT_STORE_CHUNK_SIZE) {
      this.tail = [];
      this.meta.chunk_count += 1;
    } else if (this.meta.chunk_count === 0) {
      this.meta.chunk_count = 1;
    }

    this.tail.push(event);
    this.meta.event_count += 1;
    this.meta.last_sequence = Math.max(
      this.meta.last_sequence,
      event.sequence ?? 0,
    );
    this.meta.updated_at = new Date(this.now()).toISOString();

    const chunkKey = `${this.baseKey}:chunk:${this.meta.chunk_count - 1}`;
    const chunkJson = JSON.stringify(this.tail);

    if (!this.trySet(chunkKey, chunkJson)) {
      this.evictOtherIdentities();

      if (!this.trySet(chunkKey, chunkJson)) {
        this.health = 'degraded';
        return;
      }
    }

    if (!this.writeMeta()) {
      this.health = 'degraded';
    }
  }

  /** Every event persisted for this identity, all page loads, in order. */
  readAll(): RawGameEvent[] {
    if (this.backend === null) {
      return [];
    }

    const meta = this.readMeta();
    const chunkCount =
      meta === null ? this.probeChunkCount() : meta.chunk_count;

    return this.readChunks(chunkCount).events;
  }

  /**
   * Removes every key for this identity. The acknowledgement hook: called
   * once the server has acknowledged the export that carried this buffer.
   */
  clear(): void {
    if (this.backend === null) {
      return;
    }

    removeIdentity(this.backend, this.baseKey, this.meta.chunk_count);
    this.meta = {
      ...emptyMeta(),
      page_load_count: this.meta.page_load_count,
    };
    this.tail = [];
    this.removeFromIndex();
  }

  private readMeta(): StoreMeta | null {
    const raw = this.tryGet(`${this.baseKey}:meta`);

    if (raw === null) {
      return null;
    }

    const parsed = parseJson(raw);

    if (
      !isRecord(parsed) ||
      parsed.version !== 1 ||
      typeof parsed.page_load_count !== 'number' ||
      typeof parsed.event_count !== 'number' ||
      typeof parsed.chunk_count !== 'number' ||
      typeof parsed.last_sequence !== 'number'
    ) {
      return null;
    }

    return {
      version: 1,
      page_load_count: parsed.page_load_count,
      event_count: parsed.event_count,
      chunk_count: parsed.chunk_count,
      last_sequence: parsed.last_sequence,
      updated_at:
        typeof parsed.updated_at === 'string' ? parsed.updated_at : '',
    };
  }

  /** Number of contiguous chunk keys present, when meta cannot say. */
  private probeChunkCount(): number {
    let count = 0;

    while (
      count < MAX_CHUNK_PROBE &&
      this.tryGet(`${this.baseKey}:chunk:${count}`) !== null
    ) {
      count += 1;
    }

    return count;
  }

  private readChunks(chunkCount: number): {
    events: RawGameEvent[];
    rejected: number;
  } {
    const events: RawGameEvent[] = [];
    let rejected = 0;

    for (let index = 0; index < chunkCount; index += 1) {
      const raw = this.tryGet(`${this.baseKey}:chunk:${index}`);

      if (raw === null) {
        continue;
      }

      const parsed = parseJson(raw);

      if (!Array.isArray(parsed)) {
        continue;
      }

      for (const entry of parsed) {
        if (!isRecord(entry) || typeof entry.event_type !== 'string') {
          continue;
        }

        if (!this.matchesIdentity(entry)) {
          rejected += 1;
          continue;
        }

        events.push(entry as unknown as RawGameEvent);
      }
    }

    return { events, rejected };
  }

  /**
   * A stored record belongs to this buffer only if the identity fields it
   * carries agree with the store identity. Records without identity
   * fields cannot be verified and are rejected too.
   */
  private matchesIdentity(entry: Record<string, unknown>): boolean {
    const participant =
      typeof entry.participant_id === 'string' ? entry.participant_id : null;
    const session =
      typeof entry.game_session_id === 'string'
        ? entry.game_session_id
        : typeof entry.session_id === 'string'
          ? entry.session_id
          : null;

    return (
      participant === this.identity.participant_id &&
      session === this.identity.game_session_id
    );
  }

  private writeMeta(): boolean {
    return this.trySet(`${this.baseKey}:meta`, JSON.stringify(this.meta));
  }

  private touchIndex(): void {
    if (this.backend === null) {
      return;
    }

    const entries = readIndex(this.backend).filter(
      (entry) => entry.key !== this.baseKey,
    );

    entries.push({ key: this.baseKey, updated_at: this.meta.updated_at });
    entries.sort((a, b) => a.updated_at.localeCompare(b.updated_at));

    while (entries.length > MAX_RETAINED_IDENTITIES) {
      const oldest = entries.shift();

      if (oldest !== undefined) {
        removeIdentity(this.backend, oldest.key, null);
        this.evictions += 1;
      }
    }

    this.trySet(`${EVENT_STORE_PREFIX}:index`, JSON.stringify(entries));
  }

  /** Removes identities whose last activity is older than the expiry. */
  private expireStaleIdentities(): number {
    if (this.backend === null) {
      return 0;
    }

    const cutoff = this.now() - EVENT_STORE_EXPIRY_MS;
    const entries = readIndex(this.backend);
    const kept: IndexEntry[] = [];
    let removed = 0;

    for (const entry of entries) {
      const stamp = Date.parse(entry.updated_at);

      if (
        entry.key !== this.baseKey &&
        Number.isFinite(stamp) &&
        stamp < cutoff
      ) {
        removeIdentity(this.backend, entry.key, null);
        removed += 1;
      } else {
        kept.push(entry);
      }
    }

    if (removed > 0) {
      this.trySet(`${EVENT_STORE_PREFIX}:index`, JSON.stringify(kept));
    }

    return removed;
  }

  private evictOtherIdentities(): void {
    if (this.backend === null) {
      return;
    }

    for (const entry of readIndex(this.backend)) {
      if (entry.key !== this.baseKey) {
        removeIdentity(this.backend, entry.key, null);
        this.evictions += 1;
      }
    }

    this.trySet(
      `${EVENT_STORE_PREFIX}:index`,
      JSON.stringify([{ key: this.baseKey, updated_at: this.meta.updated_at }]),
    );
  }

  private removeFromIndex(): void {
    if (this.backend === null) {
      return;
    }

    const entries = readIndex(this.backend).filter(
      (entry) => entry.key !== this.baseKey,
    );

    this.trySet(`${EVENT_STORE_PREFIX}:index`, JSON.stringify(entries));
  }

  private tryGet(key: string): string | null {
    try {
      return this.backend?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private trySet(key: string, value: string): boolean {
    try {
      this.backend?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Computes the integrity block for an export: sequences across prior and
 * current page loads must be unique and contiguous from 1.
 */
export function computeEventIntegrity(input: {
  current: RawGameEvent[];
  prior: RawGameEvent[];
  page_load_index: number;
  durable_store: DurableStoreHealth;
  durable_event_count: number;
  recovered_from_chunks?: boolean;
  foreign_records_rejected?: number;
  store_evictions?: number;
}): EventIntegrity {
  const sequences = [...input.prior, ...input.current]
    .map((event) => event.sequence)
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);

  let gaps = 0;
  let duplicates = 0;

  if (sequences.length > 0) {
    // Leading gap: everything before the first observed sequence is lost.
    gaps += Math.max(0, sequences[0] - 1);
  }

  for (let index = 1; index < sequences.length; index += 1) {
    const step = sequences[index] - sequences[index - 1];

    if (step === 0) {
      duplicates += 1;
    } else if (step > 1) {
      gaps += step - 1;
    }
  }

  const last = sequences.length === 0 ? null : sequences[sequences.length - 1];

  return {
    page_load_index: input.page_load_index,
    first_sequence: sequences.length === 0 ? null : sequences[0],
    last_sequence: last,
    event_count: input.current.length,
    prior_page_load_event_count: input.prior.length,
    expected_event_count: last ?? 0,
    sequence_gap_count: gaps,
    sequence_duplicate_count: duplicates,
    durable_store: input.durable_store,
    durable_event_count: input.durable_event_count,
    recovered_from_chunks: input.recovered_from_chunks ?? false,
    foreign_records_rejected: input.foreign_records_rejected ?? 0,
    store_evictions: input.store_evictions ?? 0,
  };
}

/**
 * Resolves the browser's `localStorage` as a backend, or `null` when it is
 * absent or throws (private mode, storage disabled, non-browser runtime).
 * A write probe is performed so a quota-exhausted or read-only storage is
 * treated as unavailable from the start rather than failing mid-session.
 */
export function resolveLocalStorage(): EventStoreBackend | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    const storage = window.localStorage;
    const probeKey = `${EVENT_STORE_PREFIX}:probe`;

    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);

    return {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: (key) => storage.removeItem(key),
    };
  } catch {
    return null;
  }
}

export function identityKey(identity: EventStoreIdentity): string {
  return `${EVENT_STORE_PREFIX}:${encodeURIComponent(
    identity.launch_mode ?? 'unspecified',
  )}:${encodeURIComponent(identity.participant_id)}:${encodeURIComponent(
    identity.game_session_id,
  )}`;
}

function emptyMeta(): StoreMeta {
  return {
    version: 1,
    page_load_count: 0,
    event_count: 0,
    chunk_count: 0,
    last_sequence: 0,
    updated_at: '',
  };
}

function highestSequence(events: RawGameEvent[]): number {
  let highest = 0;

  for (const event of events) {
    if (typeof event.sequence === 'number' && event.sequence > highest) {
      highest = event.sequence;
    }
  }

  return highest;
}

function highestPageLoad(events: RawGameEvent[]): number {
  let highest = 0;

  for (const event of events) {
    if (
      typeof event.page_load_index === 'number' &&
      event.page_load_index > highest
    ) {
      highest = event.page_load_index;
    }
  }

  return highest;
}

function readIndex(backend: EventStoreBackend): IndexEntry[] {
  let raw: string | null;

  try {
    raw = backend.getItem(`${EVENT_STORE_PREFIX}:index`);
  } catch {
    return [];
  }

  const parsed = raw === null ? null : parseJson(raw);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(
    (entry): entry is IndexEntry =>
      isRecord(entry) &&
      typeof entry.key === 'string' &&
      typeof entry.updated_at === 'string',
  );
}

/**
 * Removes one identity's keys. When `chunkCount` is unknown (eviction of a
 * foreign identity) the meta record is consulted; if that is unreadable the
 * removal walks chunk indices until the first absent key.
 */
function removeIdentity(
  backend: EventStoreBackend,
  baseKey: string,
  chunkCount: number | null,
): void {
  let count = chunkCount;

  try {
    if (count === null) {
      const raw = backend.getItem(`${baseKey}:meta`);
      const parsed = raw === null ? null : parseJson(raw);

      count =
        isRecord(parsed) && typeof parsed.chunk_count === 'number'
          ? parsed.chunk_count
          : null;
    }

    backend.removeItem(`${baseKey}:meta`);

    if (count === null) {
      for (let index = 0; index < MAX_CHUNK_PROBE; index += 1) {
        const key = `${baseKey}:chunk:${index}`;

        if (backend.getItem(key) === null) {
          break;
        }

        backend.removeItem(key);
      }

      return;
    }

    for (let index = 0; index < count; index += 1) {
      backend.removeItem(`${baseKey}:chunk:${index}`);
    }
  } catch {
    // Best effort: a failing removal only leaves stale keys behind.
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
