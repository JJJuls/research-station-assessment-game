/**
 * V4 visual-validity redesign — scientific regression projection (pure).
 *
 * Reduces a full participant-route session to a compact, deterministic,
 * machine-readable projection of everything the redesign must NOT change
 * (mission §7): route-stage / scene / zone sequences, opportunity ids,
 * window ids, the event-family sequence and counts, payload-KEY sets (never
 * values), counterbalance/form assignments, validity/disposition values,
 * terminality counts and the final completion state. Inherently variable
 * fields (timestamps, coordinates, durations, ids of the session) are
 * excluded by construction: only key NAMES are projected for payloads, and
 * time-like record fields are dropped.
 *
 * Pure module: importable by Node test runners and by Playwright specs.
 */

export interface ProjectionEventLike {
  event_type: string;
  scene?: string;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface OpportunityLike {
  opportunity_id: string;
  [key: string]: unknown;
}

export interface ProjectionInput {
  events: ProjectionEventLike[];
  opportunities: OpportunityLike[];
  coverage: unknown;
  finalStage: string | null;
  routeSummary: unknown;
}

export interface ScientificProjection {
  schema: 'v4-scientific-projection/1';
  final_stage: string | null;
  zone_sequence: string[];
  scene_sequence: string[];
  event_type_sequence: string[];
  event_counts: Record<string, number>;
  payload_keys: Record<string, string[]>;
  window_ids: string[];
  opportunity_ids: string[];
  opportunities: Record<string, Record<string, unknown>>;
  form_assignments: Record<string, unknown>;
  coverage: unknown;
  route_summary: unknown;
}

/** Record fields that vary run-to-run and carry no scientific identity. */
const TIME_LIKE = /(^at$|_at|_ms|_seconds|timestamp|duration|elapsed)$/i;

/** Deep copy with every time-like key removed (objects and arrays). */
function stripTimeLikeDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripTimeLikeDeep(entry)) as T;
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (TIME_LIKE.test(key)) {
        continue;
      }

      out[key] = stripTimeLikeDeep(entry);
    }

    return out as T;
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripTimeLike(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (TIME_LIKE.test(key)) {
      continue;
    }

    out[key] = value;
  }

  return out;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function collapseRuns(values: (string | undefined | null)[]): string[] {
  const out: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string' || value.length === 0) {
      continue;
    }

    if (out[out.length - 1] !== value) {
      out.push(value);
    }
  }

  return out;
}

function stableSortObject<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, record[key]]),
  );
}

export function buildScientificProjection(
  input: ProjectionInput,
): ScientificProjection {
  const { events } = input;
  const counts: Record<string, number> = {};
  const keys: Record<string, Set<string>> = {};
  const windowIds = new Set<string>();
  const forms: Record<string, Set<string>> = {};

  for (const event of events) {
    counts[event.event_type] = (counts[event.event_type] ?? 0) + 1;

    const keySet = (keys[event.event_type] ??= new Set<string>());

    for (const key of Object.keys(event)) {
      keySet.add(key);
    }

    if (isPlainObject(event.metadata)) {
      for (const [metaKey, metaValue] of Object.entries(event.metadata)) {
        keySet.add(`metadata.${metaKey}`);

        if (metaKey === 'window_id' && typeof metaValue === 'string') {
          windowIds.add(metaValue);
        }

        if (
          /^(form|counterbalance|allocation|variant|alternate_form)$/.test(
            metaKey,
          ) &&
          (typeof metaValue === 'string' || typeof metaValue === 'number')
        ) {
          (forms[`${event.event_type}.${metaKey}`] ??= new Set()).add(
            String(metaValue),
          );
        }
      }
    }
  }

  const opportunities: Record<string, Record<string, unknown>> = {};

  for (const record of input.opportunities) {
    const stripped = stripTimeLike(record);

    if (typeof record.window_id === 'string') {
      windowIds.add(record.window_id);
    }

    for (const formKey of ['form', 'counterbalance'] as const) {
      const value = record[formKey];

      if (typeof value === 'string') {
        (forms[`${record.opportunity_id}.${formKey}`] ??= new Set()).add(value);
      }
    }

    opportunities[record.opportunity_id] = stableSortObject(stripped);
  }

  const doorZones: string[] = [];

  for (const event of events) {
    if (
      event.event_type === 'pilot_door_used' &&
      isPlainObject(event.metadata)
    ) {
      const to = event.metadata.to;

      if (typeof to === 'string') {
        doorZones.push(to);
      }
    }
  }

  return {
    schema: 'v4-scientific-projection/1',
    final_stage: input.finalStage,
    zone_sequence: collapseRuns(doorZones),
    scene_sequence: collapseRuns(events.map((event) => event.scene)),
    event_type_sequence: events.map((event) => event.event_type),
    event_counts: stableSortObject(counts),
    payload_keys: stableSortObject(
      Object.fromEntries(
        Object.entries(keys).map(([type, set]) => [type, sortedUnique(set)]),
      ),
    ),
    window_ids: sortedUnique(windowIds),
    opportunity_ids: sortedUnique(Object.keys(opportunities)),
    opportunities: stableSortObject(opportunities),
    form_assignments: stableSortObject(
      Object.fromEntries(
        Object.entries(forms).map(([slot, set]) => [slot, sortedUnique(set)]),
      ),
    ),
    coverage: stripTimeLikeDeep(input.coverage),
    route_summary: stripTimeLikeDeep(input.routeSummary),
  };
}

export interface ProjectionDifference {
  field: string;
  detail: string;
}

function diffValue(
  path: string,
  a: unknown,
  b: unknown,
  out: ProjectionDifference[],
) {
  if (JSON.stringify(a) === JSON.stringify(b)) {
    return;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      out.push({
        field: path,
        detail: `length ${a.length} → ${b.length}`,
      });
    }

    const limit = Math.max(a.length, b.length);

    for (let index = 0; index < limit; index += 1) {
      if (JSON.stringify(a[index]) !== JSON.stringify(b[index])) {
        out.push({
          field: `${path}[${index}]`,
          detail: `${JSON.stringify(a[index])} → ${JSON.stringify(b[index])}`,
        });

        // The first divergence of a sequence is the actionable one; later
        // entries usually shift with it.
        if (Array.isArray(a) && typeof a[index] === 'string') {
          break;
        }
      }
    }

    return;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    for (const key of sortedUnique([...Object.keys(a), ...Object.keys(b)])) {
      diffValue(`${path}.${key}`, a[key], b[key], out);
    }

    return;
  }

  out.push({
    field: path,
    detail: `${JSON.stringify(a)} → ${JSON.stringify(b)}`,
  });
}

/** Field-by-field differences between two projections (empty = identical). */
export function compareProjections(
  baseline: ScientificProjection,
  current: ScientificProjection,
): ProjectionDifference[] {
  const out: ProjectionDifference[] = [];
  // Both sides are normalised again so a baseline written before a
  // time-like key was recognised still compares on scientific content.
  const a = stripTimeLikeDeep(baseline);
  const b = stripTimeLikeDeep(current);

  for (const field of Object.keys(a) as (keyof ScientificProjection)[]) {
    diffValue(String(field), a[field], b[field], out);
  }

  return out;
}
