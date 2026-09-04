/**
 * Pilot V3 Unit 1 — durable event store and logger sequencing (pure, no
 * browser). Proves the losslessness contract from the modules alone:
 *
 * - every logged event receives a monotonic `sequence` and the page load's
 *   `page_load_index`, assigned by the logger and never by a caller;
 * - a second page load of the same identity recovers every prior event,
 *   continues the sequence without reuse, and reports page load 2;
 * - one append rewrites at most one chunk (cost bounded by the chunk size,
 *   not the log length);
 * - a throwing / absent / quota-exhausted backend degrades to memory
 *   without losing the in-memory log or throwing into gameplay;
 * - a torn write (chunk persisted, meta not) and an unreadable meta with
 *   events present are both recovered from the events actually stored,
 *   never renumbered (scientific review F4 / F17);
 * - records carrying another identity are rejected and counted (F6);
 * - test and non-test launches of one identity never share a buffer (F15);
 * - the integrity block counts leading gaps, gaps and duplicates (F8);
 * - retention is bounded by count and by age (F7 / F15).
 */
import { expect, test } from '@playwright/test';

import type { RawGameEvent } from '../src/systems/EventLogger';
import { EventLogger } from '../src/systems/EventLogger';
import type { EventStoreBackend } from '../src/systems/EventStore';
import {
  computeEventIntegrity,
  DurableEventStore,
  EVENT_STORE_CHUNK_SIZE,
  EVENT_STORE_EXPIRY_MS,
  EVENT_STORE_PREFIX,
  identityKey,
  MAX_RETAINED_IDENTITIES,
} from '../src/systems/EventStore';

class MemoryBackend implements EventStoreBackend {
  readonly map = new Map<string, string>();
  writes = 0;
  bytesWritten = 0;
  failAfterWrites: number | null = null;

  getItem(key: string) {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failAfterWrites !== null && this.writes >= this.failAfterWrites) {
      throw new Error('QuotaExceededError (simulated)');
    }

    this.writes += 1;
    this.bytesWritten += value.length;
    this.map.set(key, value);
  }

  removeItem(key: string) {
    this.map.delete(key);
  }
}

const IDENTITY = {
  participant_id: 'P/1',
  game_session_id: 'S:1',
  launch_mode: 'test',
};
const T0 = 1_700_000_000_000;

function event(type: string, extra: Partial<RawGameEvent> = {}): RawGameEvent {
  return {
    session_id: 'S:1',
    timestamp_ms: 1,
    scene: 'test',
    event_type: type,
    participant_id: 'P/1',
    game_session_id: 'S:1',
    ...extra,
  };
}

function loggerWithStore(
  backend: EventStoreBackend | null,
  identity = IDENTITY,
  now: () => number = () => T0,
) {
  const store = new DurableEventStore(identity, backend, now);
  const opened = store.open();
  const logger = new EventLogger();

  logger.configureSequencing(opened.next_sequence, opened.page_load_index);
  logger.setSink((entry) => store.append(entry));

  return { store, opened, logger };
}

test.describe('event logger sequencing', () => {
  test('assigns monotonic sequence and page_load_index, ignoring caller values', () => {
    const logger = new EventLogger();

    logger.log(event('a', { sequence: 999, page_load_index: 7 }));
    logger.log(event('b'));
    logger.log(event('c'));

    const events = logger.getEvents();

    expect(events.map((e) => e.sequence)).toEqual([1, 2, 3]);
    expect(events.map((e) => e.page_load_index)).toEqual([1, 1, 1]);
    expect(logger.getNextSequence()).toBe(4);
  });

  test('configureSequencing never lowers the counter and a throwing sink never loses an event', () => {
    const logger = new EventLogger();

    logger.configureSequencing(10, 2);
    logger.configureSequencing(3, 1); // ignored: lower than current
    logger.setSink(() => {
      throw new Error('sink failure');
    });
    logger.log(event('a'));
    logger.log(event('b'));

    const events = logger.getEvents();

    expect(events.map((e) => e.sequence)).toEqual([10, 11]);
    expect(events.map((e) => e.page_load_index)).toEqual([1, 1]);
  });

  test('the sink receives a copy, not the stored object', () => {
    const logger = new EventLogger();
    const received: RawGameEvent[] = [];

    logger.setSink((entry) => received.push(entry));
    logger.log(event('a', { metadata: { nested: { value: 1 } } }));
    (received[0].metadata as { nested: { value: number } }).nested.value = 2;

    expect(
      (logger.getEvents()[0].metadata as { nested: { value: number } }).nested
        .value,
    ).toBe(1);
  });
});

test.describe('durable event store', () => {
  test('first open of an identity is page load 1 with an empty prior log', () => {
    const backend = new MemoryBackend();
    const { opened, store } = loggerWithStore(backend);

    expect(opened).toEqual({
      page_load_index: 1,
      next_sequence: 1,
      prior_page_load_events: [],
      health: 'durable',
      recovered_from_chunks: false,
      foreign_records_rejected: 0,
      expired_identities_removed: 0,
    });
    expect(store.getHealth()).toBe('durable');
    expect(backend.getItem(`${identityKey(IDENTITY)}:meta`)).not.toBeNull();
  });

  test('a second page load recovers every prior event and continues the sequence', () => {
    const backend = new MemoryBackend();
    const first = loggerWithStore(backend);

    for (let index = 0; index < 250; index += 1) {
      first.logger.log(event(`e${index}`));
    }

    expect(first.store.persistedCount()).toBe(250);

    // "Reload": a brand-new store + logger over the same backend/identity.
    const second = loggerWithStore(backend);

    expect(second.opened.page_load_index).toBe(2);
    expect(second.opened.next_sequence).toBe(251);
    expect(second.opened.prior_page_load_events).toHaveLength(250);
    expect(second.opened.prior_page_load_events.map((e) => e.sequence)).toEqual(
      Array.from({ length: 250 }, (_, i) => i + 1),
    );
    expect(
      second.opened.prior_page_load_events.every(
        (e) => e.page_load_index === 1,
      ),
    ).toBe(true);

    second.logger.log(event('after-reload'));

    const stored = second.logger.getEvents()[0];

    expect(stored.sequence).toBe(251);
    expect(stored.page_load_index).toBe(2);
    expect(second.store.persistedCount()).toBe(251);
    expect(second.store.readAll()).toHaveLength(251);

    // A third load sees both page loads, in order, without renumbering.
    const third = loggerWithStore(backend);

    expect(third.opened.page_load_index).toBe(3);
    expect(third.opened.next_sequence).toBe(252);
    expect(third.opened.prior_page_load_events.map((e) => e.sequence)).toEqual(
      Array.from({ length: 251 }, (_, i) => i + 1),
    );
  });

  test('one append rewrites only the tail chunk (bounded cost)', () => {
    const backend = new MemoryBackend();
    const { logger } = loggerWithStore(backend);

    for (let index = 0; index < EVENT_STORE_CHUNK_SIZE * 3; index += 1) {
      logger.log(event('e'));
    }

    const before = backend.bytesWritten;

    logger.log(event('e'));

    const newChunkCost = backend.bytesWritten - before;

    for (let index = 0; index < EVENT_STORE_CHUNK_SIZE / 2; index += 1) {
      logger.log(event('e'));
    }

    const mid = backend.bytesWritten;

    logger.log(event('e'));

    const midChunkCost = backend.bytesWritten - mid;
    const wholeLogBytes = JSON.stringify(logger.getEvents()).length;

    expect(newChunkCost).toBeLessThan(wholeLogBytes / 10);
    expect(midChunkCost).toBeLessThan(wholeLogBytes / 3);
    expect(backend.getItem(`${identityKey(IDENTITY)}:chunk:3`)).not.toBeNull();
    expect(backend.getItem(`${identityKey(IDENTITY)}:chunk:4`)).toBeNull();
  });

  test('absent backend keeps the in-memory log intact and reports memory_only', () => {
    const { store, opened, logger } = loggerWithStore(null);

    logger.log(event('a'));
    logger.log(event('b'));

    expect(opened.health).toBe('memory_only');
    expect(store.getHealth()).toBe('memory_only');
    expect(store.persistedCount()).toBe(0);
    expect(store.readAll()).toEqual([]);
    expect(logger.getEvents().map((e) => e.sequence)).toEqual([1, 2]);
  });

  test('a backend that starts throwing mid-session degrades without losing the in-memory log', () => {
    const backend = new MemoryBackend();
    const { store, logger } = loggerWithStore(backend);

    logger.log(event('a'));
    logger.log(event('b'));
    backend.failAfterWrites = backend.writes; // every further write throws

    logger.log(event('c'));
    logger.log(event('d'));

    expect(store.getHealth()).toBe('degraded');
    expect(logger.getEvents().map((e) => e.event_type)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(logger.getEvents().map((e) => e.sequence)).toEqual([1, 2, 3, 4]);
    expect(store.readAll().map((e) => e.event_type)).toEqual(['a', 'b']);
  });

  test('a quota failure first evicts other identities (counted), then retries', () => {
    const backend = new MemoryBackend();
    const otherIdentity = {
      participant_id: 'OTHER',
      game_session_id: 'S',
      launch_mode: 'test',
    };
    const other = new DurableEventStore(otherIdentity, backend, () => T0);

    other.open();
    other.append(
      event('x', {
        sequence: 1,
        participant_id: 'OTHER',
        game_session_id: 'S',
      }),
    );

    const { store, logger } = loggerWithStore(backend);
    const failing = backend.writes;
    let failed = false;

    backend.setItem = function (
      this: MemoryBackend,
      key: string,
      value: string,
    ) {
      if (!failed && this.writes === failing) {
        failed = true;
        throw new Error('QuotaExceededError (simulated once)');
      }

      this.writes += 1;
      this.map.set(key, value);
    } as MemoryBackend['setItem'];

    logger.log(event('a'));

    expect(failed).toBe(true);
    expect(store.getHealth()).toBe('durable');
    expect(store.evictionCount()).toBe(1);
    expect(store.readAll().map((e) => e.event_type)).toEqual(['a']);
    expect(backend.getItem(`${identityKey(otherIdentity)}:meta`)).toBeNull();
  });

  test('a torn write is recovered from the events present, never renumbered', () => {
    const backend = new MemoryBackend();
    const { logger } = loggerWithStore(backend);

    for (let index = 0; index < 5; index += 1) {
      logger.log(event('e'));
    }

    const metaKey = `${identityKey(IDENTITY)}:meta`;
    const meta = JSON.parse(backend.getItem(metaKey) ?? '{}') as Record<
      string,
      unknown
    >;

    backend.map.set(
      metaKey,
      JSON.stringify({ ...meta, event_count: 3, last_sequence: 3 }),
    );

    const reopened = loggerWithStore(backend);

    expect(reopened.opened.prior_page_load_events).toHaveLength(5);
    expect(reopened.opened.next_sequence).toBe(6);
    expect(reopened.opened.recovered_from_chunks).toBe(false);
  });

  test('an unreadable meta with events present recovers them from the chunks and reissues no sequence number (F4)', () => {
    const backend = new MemoryBackend();
    const { logger } = loggerWithStore(backend);

    for (let index = 0; index < EVENT_STORE_CHUNK_SIZE + 7; index += 1) {
      logger.log(event('e'));
    }

    backend.map.set(`${identityKey(IDENTITY)}:meta`, '{not json');

    const reopened = loggerWithStore(backend);

    expect(reopened.opened.recovered_from_chunks).toBe(true);
    expect(reopened.opened.prior_page_load_events).toHaveLength(
      EVENT_STORE_CHUNK_SIZE + 7,
    );
    expect(reopened.opened.next_sequence).toBe(EVENT_STORE_CHUNK_SIZE + 8);
    expect(reopened.opened.page_load_index).toBe(2);

    reopened.logger.log(event('after'));

    // The rebuilt meta is consistent: a third open sees everything.
    const third = loggerWithStore(backend);

    expect(third.opened.recovered_from_chunks).toBe(false);
    expect(third.opened.prior_page_load_events).toHaveLength(
      EVENT_STORE_CHUNK_SIZE + 8,
    );
    expect(third.opened.next_sequence).toBe(EVENT_STORE_CHUNK_SIZE + 9);
    expect(third.opened.page_load_index).toBe(3);
  });

  test('a corrupt chunk is skipped and the recorded high-water mark still advances the counter', () => {
    const backend = new MemoryBackend();
    const first = loggerWithStore(backend);

    first.logger.log(event('a'));
    backend.map.set(`${identityKey(IDENTITY)}:chunk:0`, '[1, "x", null]');

    const second = loggerWithStore(backend);

    expect(second.opened.page_load_index).toBe(2);
    expect(second.opened.prior_page_load_events).toEqual([]);
    expect(second.opened.next_sequence).toBe(2);
  });

  test('records carrying another identity are rejected and counted (F6)', () => {
    const backend = new MemoryBackend();
    const first = loggerWithStore(backend);

    first.logger.log(event('mine'));

    // A foreign record smuggled into this identity's chunk (shared device,
    // reused link): it must never surface as this participant's data.
    const chunkKey = `${identityKey(IDENTITY)}:chunk:0`;
    const chunk = JSON.parse(backend.getItem(chunkKey) ?? '[]') as unknown[];

    chunk.push(
      event('theirs', {
        sequence: 2,
        participant_id: 'SOMEONE_ELSE',
        game_session_id: 'S:1',
      }),
      event('unidentified', {
        sequence: 3,
        participant_id: undefined,
        game_session_id: undefined,
        session_id: undefined as unknown as string,
      }),
    );
    backend.map.set(chunkKey, JSON.stringify(chunk));

    const second = loggerWithStore(backend);

    expect(
      second.opened.prior_page_load_events.map((e) => e.event_type),
    ).toEqual(['mine']);
    expect(second.opened.foreign_records_rejected).toBe(2);
  });

  test('a test-mode dry run and a non-test launch of one identity use separate buffers (F15)', () => {
    const backend = new MemoryBackend();
    const production = { ...IDENTITY, launch_mode: 'production' };

    const dryRun = loggerWithStore(backend);

    dryRun.logger.log(event('dry'));

    const participant = loggerWithStore(backend, production);

    expect(participant.opened.page_load_index).toBe(1);
    expect(participant.opened.prior_page_load_events).toEqual([]);
    expect(identityKey(production)).not.toBe(identityKey(IDENTITY));

    participant.logger.log(event('real'));

    expect(dryRun.store.readAll().map((e) => e.event_type)).toEqual(['dry']);
    expect(participant.store.readAll().map((e) => e.event_type)).toEqual([
      'real',
    ]);
  });

  test('clear removes every key for the identity and only that identity', () => {
    const backend = new MemoryBackend();
    const otherIdentity = {
      participant_id: 'O',
      game_session_id: 'S',
      launch_mode: 'test',
    };
    const other = new DurableEventStore(otherIdentity, backend, () => T0);

    other.open();
    other.append(
      event('x', { sequence: 1, participant_id: 'O', game_session_id: 'S' }),
    );

    const { store, logger } = loggerWithStore(backend);

    for (let index = 0; index < EVENT_STORE_CHUNK_SIZE + 1; index += 1) {
      logger.log(event('e'));
    }

    store.clear();

    const remaining = [...backend.map.keys()];

    expect(remaining.some((key) => key.startsWith(identityKey(IDENTITY)))).toBe(
      false,
    );
    expect(
      backend.getItem(`${identityKey(otherIdentity)}:meta`),
    ).not.toBeNull();
    expect(store.persistedCount()).toBe(0);
  });

  test('retention is bounded to the most recent identities', () => {
    const backend = new MemoryBackend();
    let tick = 0;

    for (let index = 0; index < MAX_RETAINED_IDENTITIES + 3; index += 1) {
      const identity = {
        participant_id: `P${index}`,
        game_session_id: 'S',
        launch_mode: 'test',
      };
      const store = new DurableEventStore(
        identity,
        backend,
        () => T0 + tick++ * 1000,
      );

      store.open();
      store.append(
        event('x', {
          sequence: 1,
          participant_id: identity.participant_id,
          game_session_id: 'S',
        }),
      );
    }

    const index = JSON.parse(
      backend.getItem(`${EVENT_STORE_PREFIX}:index`) ?? '[]',
    ) as { key: string }[];

    expect(index).toHaveLength(MAX_RETAINED_IDENTITIES);
    expect(
      backend.getItem(
        `${identityKey({ participant_id: 'P0', game_session_id: 'S', launch_mode: 'test' })}:meta`,
      ),
    ).toBeNull();
    expect(
      backend.getItem(
        `${identityKey({
          participant_id: `P${MAX_RETAINED_IDENTITIES + 2}`,
          game_session_id: 'S',
          launch_mode: 'test',
        })}:meta`,
      ),
    ).not.toBeNull();
  });

  test('identities untouched for longer than the expiry are removed at open (F15 i)', () => {
    const backend = new MemoryBackend();
    const stale = {
      participant_id: 'STALE',
      game_session_id: 'S',
      launch_mode: 'test',
    };
    const fresh = {
      participant_id: 'FRESH',
      game_session_id: 'S',
      launch_mode: 'test',
    };

    const staleStore = new DurableEventStore(stale, backend, () => T0);

    staleStore.open();
    staleStore.append(
      event('old', {
        sequence: 1,
        participant_id: 'STALE',
        game_session_id: 'S',
      }),
    );

    const freshStore = new DurableEventStore(
      fresh,
      backend,
      () => T0 + EVENT_STORE_EXPIRY_MS - 1000,
    );

    freshStore.open();

    const later = loggerWithStore(
      backend,
      IDENTITY,
      () => T0 + EVENT_STORE_EXPIRY_MS + 1000,
    );

    expect(later.opened.expired_identities_removed).toBe(1);
    expect(backend.getItem(`${identityKey(stale)}:meta`)).toBeNull();
    expect(backend.getItem(`${identityKey(stale)}:chunk:0`)).toBeNull();
    expect(backend.getItem(`${identityKey(fresh)}:meta`)).not.toBeNull();
  });
});

test.describe('event integrity block', () => {
  test('reports a contiguous log as gap-free and counts gaps and duplicates otherwise', () => {
    const prior = [event('a', { sequence: 1 }), event('b', { sequence: 2 })];
    const current = [event('c', { sequence: 3 }), event('d', { sequence: 4 })];

    expect(
      computeEventIntegrity({
        current,
        prior,
        page_load_index: 2,
        durable_store: 'durable',
        durable_event_count: 4,
      }),
    ).toEqual({
      page_load_index: 2,
      first_sequence: 1,
      last_sequence: 4,
      event_count: 2,
      prior_page_load_event_count: 2,
      expected_event_count: 4,
      sequence_gap_count: 0,
      sequence_duplicate_count: 0,
      durable_store: 'durable',
      durable_event_count: 4,
      recovered_from_chunks: false,
      foreign_records_rejected: 0,
      store_evictions: 0,
    });

    const broken = computeEventIntegrity({
      current: [event('x', { sequence: 7 }), event('y', { sequence: 7 })],
      prior: [event('p', { sequence: 3 }), event('q', { sequence: 5 })],
      page_load_index: 2,
      durable_store: 'degraded',
      durable_event_count: 1,
      foreign_records_rejected: 2,
      store_evictions: 1,
    });

    // Leading gap 1,2 + gap 4 + gap 6 = 4 missing numbers (F8).
    expect(broken.sequence_gap_count).toBe(4);
    expect(broken.sequence_duplicate_count).toBe(1);
    expect(broken.first_sequence).toBe(3);
    expect(broken.last_sequence).toBe(7);
    expect(broken.expected_event_count).toBe(7);
    expect(broken.foreign_records_rejected).toBe(2);
    expect(broken.store_evictions).toBe(1);
  });

  test('an empty log reports null bounds and zero expected events', () => {
    expect(
      computeEventIntegrity({
        current: [],
        prior: [],
        page_load_index: 1,
        durable_store: 'memory_only',
        durable_event_count: 0,
      }),
    ).toMatchObject({
      first_sequence: null,
      last_sequence: null,
      expected_event_count: 0,
    });
  });
});

test.describe('batched writes (runtime mode)', () => {
  test('appends coalesce into one write per tick and flush synchronously on demand', async () => {
    const backend = new MemoryBackend();
    const store = new DurableEventStore(IDENTITY, backend, () => T0, true);

    store.open();

    const before = backend.writes;

    for (let index = 0; index < 5; index += 1) {
      store.append(event('e', { sequence: index + 1 }));
    }

    // Nothing written yet (pending), but the count is already authoritative.
    expect(backend.writes).toBe(before);
    expect(store.persistedCount()).toBe(5);

    await new Promise((resolve) => setTimeout(resolve, 5));

    // One chunk write + one meta write for five events.
    expect(backend.writes).toBe(before + 2);
    expect(store.readAll()).toHaveLength(5);

    store.append(event('f', { sequence: 6 }));
    store.flush();
    expect(store.readAll().map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
