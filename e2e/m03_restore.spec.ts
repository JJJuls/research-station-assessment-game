/**
 * Station 080 M03 — tool restoration at the two press occasions (Unit 14),
 * pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row and the
 * `m03t` fixtures (three tools per occasion, a rack that accepts them, a
 * roll that belongs to the feed); the taught movement comes before the
 * run; the state at the first departure is recorded once and never
 * rewritten; an unreachable tool makes the occasion technically invalid;
 * and the extractor reproduces restored / 6 from the raw events with
 * untouched ≠ never completed ≠ declined ≠ pending ≠ interrupted ≠ not
 * presented ≠ technically invalid, plus the object-states companion.
 * U14-C: the adverse cases of the recount (tools that are not the
 * occasion's own, a container the moves do not lead to, a repeated or
 * late record), the exposure order of a press opened before the work
 * orders, the line after a stopped panel, and the raw log left untouched.
 */
import { expect, test } from '@playwright/test';

import {
  containerAccepts,
  createInitialInventoryState,
} from '../src/inventory/engine';
import { getItemDefinition } from '../src/inventory/itemDefs';
import { CONTAINER_IDS } from '../src/inventory/model';
import { extractItemFeatures } from '../src/measurement/features';
import { registerEntry } from '../src/measurement/registerV3';
import { ledgerEntry } from '../src/pilot/evidenceLedger';
import { M03_MIN_EXPOSURE_MS } from '../src/pilot/return/returnEpisodeModel';
import {
  createM03State,
  M03_BENCH_CAPACITY,
  M03_EXPOSURE_FLOOR_MS,
  M03_FAMILY,
  M03_PRESS_CYCLES,
  M03_RACK_CAPACITY,
  M03_ROLL_ID,
  M03_SPEC,
  M03_TOOLS,
  m03BenchSeed,
  m03Depart,
  m03EntrySnapshot,
  m03IdleLine,
  type M03LogSink,
  m03MoveRefused,
  type M03Occasion,
  type M03Placements,
  m03PressRunnable,
  m03PriorAdministration,
  m03PriorPanelExposure,
  m03PriorPresentation,
  m03RawComponents,
  type M03Reachability,
  m03Reachability,
  m03RollLocked,
  m03RollMoved,
  m03RunCycle,
  type M03State,
  m03SurfaceClosed,
  m03SurfaceOpened,
  m03Terminal,
  m03ToolMoved,
  m03ToolsOut,
} from '../src/pilot/windows/m03RestoreModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const [BRUSH, KEY, GAUGE] = M03_TOOLS.map((tool) => tool.definitionId);

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    occasion: M03Occasion,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: 'records_workshop',
      event_type: `${M03_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: M03_SPEC[occasion].opportunity_id,
        window_id: M03_SPEC[occasion].window_id,
        occasion: M03_SPEC[occasion].tag,
        ...metadata,
      },
    });
  };
  const sink =
    (occasion: M03Occasion): M03LogSink =>
    (suffix, metadata) =>
      push(occasion, suffix, metadata);

  return { events, push, sink };
}

/** The store's view of one occasion, reduced to what the model is told. */
function bench(occasion: M03Occasion): M03Placements {
  const placements: M03Placements = {};

  m03BenchSeed().forEach((definitionId, slotIndex) => {
    if (definitionId !== null) {
      placements[definitionId] = {
        container_id: M03_SPEC[occasion].containers.bench,
        slot_index: slotIndex,
      };
    }
  });

  return placements;
}

const RACK_OK = {
  capacity: M03_RACK_CAPACITY,
  free_slots: M03_RACK_CAPACITY,
  accepts: Object.fromEntries(
    M03_TOOLS.map((tool) => [tool.definitionId, true]),
  ),
};

/**
 * Runs one occasion the way the adapter does: panel open, taught
 * movement, three cycles, tools out, `restore` tools moved to the rack,
 * panel closed.
 */
function runOccasion(
  h: ReturnType<typeof harness>,
  occasion: M03Occasion,
  restore: string[],
  options: {
    reachability?: M03Reachability[];
    depart?: boolean;
    exposureMs?: number;
  } = {},
): { s: M03State; placements: M03Placements } {
  const s = createM03State(occasion);
  const log = h.sink(occasion);
  const spec = M03_SPEC[occasion];

  h.push(occasion, 'presented', { input_mode: 'system' });
  m03SurfaceOpened(s, 1_000, 'keyboard', log);
  m03RollMoved(
    s,
    spec.containers.supply,
    spec.containers.feed,
    2_000,
    'keyboard',
    log,
  );

  for (let cycle = 0; cycle < M03_PRESS_CYCLES; cycle += 1) {
    m03RunCycle(s, 'keyboard', log);
  }

  const placements = bench(occasion);
  const reachability =
    options.reachability ?? m03Reachability(occasion, placements, RACK_OK);

  if (!m03ToolsOut(s, reachability, 3_000)) {
    h.push(occasion, 'technical_failure', {
      detail: 'tool unreachable: see reachability',
      input_mode: 'system',
    });

    return { s, placements };
  }

  h.push(occasion, 'opportunity_opened', {
    entry_state_snapshot: { ...m03EntrySnapshot(occasion), reachability },
    input_mode: 'system',
  });

  restore.forEach((toolId, index) => {
    const to = { container_id: spec.containers.rack, slot_index: index };

    expect(
      m03ToolMoved(
        s,
        toolId,
        placements[toolId],
        to,
        3_500 + index,
        'pointer',
        log,
      ),
    ).toBe(true);
    placements[toolId] = to;
  });

  if (options.depart !== false) {
    const departure = m03Depart(
      s,
      placements,
      3_000 + (options.exposureMs ?? 5_000),
      'keyboard',
      log,
    );

    expect(departure).not.toBeNull();
    h.push(occasion, 'window_closed', {
      exit_state: 'completed',
      raw_components: m03RawComponents(s, 'completed'),
    });
  }

  return { s, placements };
}

test.describe('M03 tool restoration (pure)', () => {
  test('register row and fixtures: v3 route with two occasions, three tools each, a rack that accepts them and a roll that belongs to the feed', () => {
    const entry = registerEntry('M03');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m03_tools_a',
      'proto_m03_tools_b',
    ]);
    expect(entry.route.windows).toEqual([
      {
        id: 'm03_tools_o1',
        occasion: 'o1',
        zone: 'records_workshop',
        episode: 2,
      },
      {
        id: 'm03_tools_o2',
        occasion: 'o2',
        zone: 'records_workshop',
        episode: 5,
      },
    ]);
    expect(entry.route.family_prefixes).toEqual([M03_FAMILY]);
    // The v3 family is neither the frozen v2 family nor inside it.
    expect(
      M03_FAMILY.startsWith(ledgerEntry('M03').route.family_prefixes[0]!),
    ).toBe(false);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.coverage_label).toBe('retained_core');
    expect(entry.independence.kind).toBe('independent_occasions');
    expect(entry.source.reverse_keyed).toBe(false);
    expect(entry.features.map((f) => [f.feature_id, f.role])).toEqual([
      ['m03_tools_restored', 'primary'],
      ['m03_object_states', 'companion'],
    ]);
    expect(entry.features[0]).toMatchObject({
      planned_denominator: 6,
      denominator_kind: 'planned_observations',
    });
    expect(entry.operational_label).toBe('Press stations (Workshop)');

    // Three tools per occasion at fixed, distinct slots of the surface.
    expect(M03_TOOLS).toHaveLength(3);
    expect(new Set(M03_TOOLS.map((t) => t.bench_slot)).size).toBe(3);
    expect(m03BenchSeed()).toHaveLength(M03_BENCH_CAPACITY);
    expect(m03BenchSeed().filter((id) => id !== null)).toHaveLength(3);
    expect(M03_EXPOSURE_FLOOR_MS).toBe(M03_MIN_EXPOSURE_MS);

    // The model's container ids are the engine's.
    expect(M03_SPEC.a.containers).toEqual({
      bench: CONTAINER_IDS.m03tBenchA,
      rack: CONTAINER_IDS.m03tRackA,
      supply: CONTAINER_IDS.m03tSupplyA,
      feed: CONTAINER_IDS.m03tFeedA,
    });
    expect(M03_SPEC.b.containers).toEqual({
      bench: CONTAINER_IDS.m03tBenchB,
      rack: CONTAINER_IDS.m03tRackB,
      supply: CONTAINER_IDS.m03tSupplyB,
      feed: CONTAINER_IDS.m03tFeedB,
    });

    const state = createInitialInventoryState();

    for (const occasion of ['a', 'b'] as const) {
      const c = M03_SPEC[occasion].containers;

      expect(state.containers[c.bench].capacity).toBe(M03_BENCH_CAPACITY);
      expect(state.containers[c.rack].capacity).toBe(M03_RACK_CAPACITY);
      expect(state.containers[c.supply].capacity).toBe(1);
      expect(state.containers[c.feed].capacity).toBe(1);

      for (const tool of M03_TOOLS) {
        expect(
          containerAccepts(state.containers[c.bench], tool.definitionId),
        ).toBe(true);
        expect(
          containerAccepts(state.containers[c.rack], tool.definitionId),
        ).toBe(true);
        expect(
          containerAccepts(state.containers[c.feed], tool.definitionId),
        ).toBe(false);
        expect(
          containerAccepts(state.containers[c.supply], tool.definitionId),
        ).toBe(false);
      }

      expect(containerAccepts(state.containers[c.supply], M03_ROLL_ID)).toBe(
        true,
      );
      expect(containerAccepts(state.containers[c.feed], M03_ROLL_ID)).toBe(
        true,
      );
      expect(containerAccepts(state.containers[c.rack], M03_ROLL_ID)).toBe(
        false,
      );
      expect(containerAccepts(state.containers[c.bench], M03_ROLL_ID)).toBe(
        false,
      );
    }

    // Workstation objects: bound to their namespace, never carried away,
    // disjoint from the legacy residuals and from M04 / M11 objects.
    for (const id of [...M03_TOOLS.map((t) => t.definitionId), M03_ROLL_ID]) {
      const definition = getItemDefinition(id);

      expect(definition.boundNamespace).toBe('m03t');
      expect(definition.droppable).toBe(false);
      expect(definition.discardable).toBe(false);
      expect(definition.maxStack).toBe(1);
      expect(id.startsWith('m03t_')).toBe(true);
    }

    expect(
      M03_TOOLS.map((t) => getItemDefinition(t.definitionId).category),
    ).toEqual(['tool', 'tool', 'tool']);

    // No participant-facing name of a tool, the roll or the rack names
    // tidying.
    for (const id of [...M03_TOOLS.map((t) => t.definitionId), M03_ROLL_ID]) {
      const definition = getItemDefinition(id);

      expect(`${definition.displayName} ${definition.description}`).not.toMatch(
        /tidy|neat|clean up|put away|restore|mess/i,
      );
    }
  });

  test('the taught movement comes before the run; tools lie out after the third cycle; the first departure is recorded once and is permanent', () => {
    const h = harness();
    const s = createM03State('a');
    const log = h.sink('a');
    const { supply, feed, rack, bench: surface } = M03_SPEC.a.containers;

    // Nothing runs before the panel is opened.
    expect(m03RunCycle(s, 'keyboard', log)).toBe('invalid');
    expect(m03SurfaceOpened(s, 100, 'keyboard', log)).toBe('practice');
    expect(h.events.map((e) => e.event_type)).toEqual([
      `${M03_FAMILY}surface_opened`,
      `${M03_FAMILY}practice_presented`,
    ]);

    // The press refuses while the roll is not in the feed (recorded).
    expect(m03PressRunnable(s)).toBe(false);
    expect(m03RunCycle(s, 'pointer', log)).toBe('refused');
    expect(s.cycles).toBe(0);
    expect(s.runRefusals).toBe(1);

    // The roll is moved with the panel's ordinary commands.
    expect(m03RollMoved(s, supply, feed, 900, 'keyboard', log)).toBe(true);
    expect(s.rollInFeed).toBe(true);
    expect(s.practiceInputMode).toBe('keyboard');
    // Taken back out: the press refuses again; put back: it runs.
    m03RollMoved(s, feed, supply, 950, 'pointer', log);
    expect(m03PressRunnable(s)).toBe(false);
    m03RollMoved(s, supply, feed, 990, 'pointer', log);
    expect(
      h.events.filter(
        (e) => e.event_type === `${M03_FAMILY}practice_completed`,
      ),
    ).toHaveLength(1);
    expect(m03RollLocked(s)).toBe(false);

    // A panel closed mid-activity keeps the activity.
    expect(m03RunCycle(s, 'keyboard', log)).toBe('cycle');
    expect(m03RollLocked(s)).toBe(true);
    expect(m03RollMoved(s, feed, supply, 1_000, 'pointer', log)).toBe(false);
    expect(m03SurfaceClosed(s, 'keyboard', log)).toBe(true);
    expect(m03SurfaceOpened(s, 1_500, 'keyboard', log)).toBe('running');
    expect(s.cycles).toBe(1);
    // No tool can move before the tools lie out.
    expect(
      m03ToolMoved(
        s,
        BRUSH,
        null,
        { container_id: rack, slot_index: 0 },
        1_600,
        'pointer',
        log,
      ),
    ).toBe(false);
    expect(m03RunCycle(s, 'keyboard', log)).toBe('cycle');
    expect(m03RunCycle(s, 'keyboard', log)).toBe('run_complete');
    // The run is three cycles: a further press adds none.
    expect(m03RunCycle(s, 'keyboard', log)).toBe('invalid');
    expect(s.cycles).toBe(M03_PRESS_CYCLES);

    const placements = bench('a');
    const reachability = m03Reachability('a', placements, RACK_OK);

    expect(reachability.every((row) => row.reachable)).toBe(true);
    expect(m03ToolsOut(s, reachability, 2_000)).toBe(true);
    expect(s.phase).toBe('tools_out');
    // The press no longer runs once the tools lie out.
    expect(m03RunCycle(s, 'keyboard', log)).toBe('invalid');

    // One tool to the rack, one moved along the surface, one untouched.
    const home = { container_id: rack, slot_index: 0 };
    const aside = { container_id: surface, slot_index: 0 };

    expect(
      m03ToolMoved(s, BRUSH, placements[BRUSH], home, 2_500, 'pointer', log),
    ).toBe(true);
    placements[BRUSH] = home;
    expect(
      m03ToolMoved(s, KEY, placements[KEY], aside, 2_700, 'keyboard', log),
    ).toBe(true);
    placements[KEY] = aside;
    m03MoveRefused(s, M03_ROLL_ID, 'roll_threaded', 'pointer', log);

    const departure = m03Depart(s, placements, 9_000, 'keyboard', log)!;

    expect(departure).toMatchObject({
      close_reason: 'panel_closed',
      departed: true,
      tools_restored: 1,
      tools_left: 2,
      tool_total: 3,
      move_count: 2,
      focused_ms: 7_000,
      exposure_sufficient: true,
    });
    expect(departure.tools).toEqual([
      {
        object_id: BRUSH,
        location: 'home',
        container: rack,
        slot_index: 0,
        in_home: true,
        moves: 1,
      },
      {
        object_id: KEY,
        location: 'surface',
        container: surface,
        slot_index: 0,
        in_home: false,
        moves: 1,
      },
      {
        object_id: GAUGE,
        location: 'surface',
        container: surface,
        slot_index: 6,
        in_home: false,
        moves: 0,
      },
    ]);

    // Permanent: nothing after the first departure changes the record.
    expect(m03Terminal(s)).toBe(true);
    expect(
      m03ToolMoved(
        s,
        GAUGE,
        placements[GAUGE],
        { container_id: rack, slot_index: 1 },
        9_500,
        'pointer',
        log,
      ),
    ).toBe(false);
    expect(m03Depart(s, placements, 9_900, 'keyboard', log)).toBeNull();
    expect(m03SurfaceOpened(s, 10_000, 'keyboard', log)).toBe('departed');
    expect(s.departure).toEqual(departure);
    expect(
      h.events.filter((e) => e.event_type === `${M03_FAMILY}first_departure`),
    ).toHaveLength(1);

    // No event of the family names an evaluation.
    for (const event of h.events) {
      expect(JSON.stringify(event.metadata)).not.toMatch(
        /score|tidy|neat|correct|penalt/i,
      );
    }

    // A panel closed inside the exposure floor is recorded, never invalid.
    const quick = harness();
    const { s: early } = runOccasion(quick, 'b', [], { exposureMs: 600 });

    expect(early.departure).toMatchObject({
      tools_restored: 0,
      exposure_sufficient: false,
    });
    expect(extractItemFeatures('M03', quick.events, CONTEXT)[0]).toMatchObject({
      value: 0,
      denominator: 3,
      disposition: 'incomplete',
    });
  });

  test('the extractor reproduces restored / 6: untouched, partial and full occasions; an untouched surface is an observed zero', () => {
    const h = harness();

    runOccasion(h, 'a', [KEY]);
    runOccasion(h, 'b', [BRUSH, KEY, GAUGE]);

    const rows = extractItemFeatures('M03', h.events, CONTEXT);

    expect(rows.map((row) => row.feature_id)).toEqual([
      'm03_tools_restored',
      'm03_object_states',
    ]);
    expect(rows[0]).toMatchObject({
      value: 4,
      numerator: 4,
      denominator: 6,
      planned_denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
      included_ids: ['m03_tools_o1', 'm03_tools_o2'],
      coverage_label: 'retained_core',
      independence: 'independent_occasions',
    });
    expect(rows[0].components).toMatchObject({
      occasions_observed: ['o1', 'o2'],
      restored_by_occasion: { o1: 1, o2: 3 },
    });
    expect(rows[1]).toMatchObject({ disposition: 'observed' });

    const states = rows[1].value as Record<
      string,
      {
        status: string;
        tools_restored: number;
        movement_taught: boolean;
        press_cycles: number;
        tools: { object_id: string; in_home: boolean }[];
      }
    >;

    expect(states.o1).toMatchObject({
      status: 'observed',
      tools_restored: 1,
      movement_taught: true,
      press_cycles: 3,
    });
    expect(states.o1.tools.map((tool) => tool.in_home)).toEqual([
      false,
      true,
      false,
    ]);
    expect(states.o2.tools.every((tool) => tool.in_home)).toBe(true);

    // Both surfaces left exactly as the run left them: 0 / 6, observed.
    const untouched = harness();

    runOccasion(untouched, 'a', []);
    runOccasion(untouched, 'b', []);
    expect(
      extractItemFeatures('M03', untouched.events, CONTEXT)[0],
    ).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 6,
      disposition: 'observed',
    });

    // A tool taken to the rack and back out before the departure is left.
    const back = harness();
    const { s, placements } = runOccasion(back, 'a', [BRUSH], {
      depart: false,
    });
    const out = {
      container_id: M03_SPEC.a.containers.bench,
      slot_index: 2,
    };

    m03ToolMoved(
      s,
      BRUSH,
      placements[BRUSH],
      out,
      4_000,
      'keyboard',
      back.sink('a'),
    );
    placements[BRUSH] = out;
    m03Depart(s, placements, 8_000, 'pointer', back.sink('a'));

    expect(extractItemFeatures('M03', back.events, CONTEXT)[0]).toMatchObject({
      value: 0,
      denominator: 3,
      disposition: 'incomplete',
    });
  });

  test('an unreachable tool makes the occasion technically invalid and excluded — never tools left out', () => {
    const blocked: M03Placements = bench('a');

    delete blocked[GAUGE];

    const missing = m03Reachability('a', blocked, RACK_OK);

    expect(missing.map((row) => row.reachable)).toEqual([true, true, false]);
    expect(missing[2]).toMatchObject({ object_id: GAUGE, on_surface: false });
    // A rack without room, or one that refuses a tool, is unreachable too.
    expect(
      m03Reachability('a', bench('a'), { ...RACK_OK, free_slots: 2 }).some(
        (row) => row.reachable,
      ),
    ).toBe(false);
    expect(
      m03Reachability('a', bench('a'), {
        ...RACK_OK,
        accepts: { ...RACK_OK.accepts, [KEY]: false },
      }).map((row) => row.reachable),
    ).toEqual([true, false, true]);
    // A tool at the wrong slot is not where every participant finds it.
    expect(
      m03Reachability(
        'a',
        {
          ...bench('a'),
          [BRUSH]: {
            container_id: M03_SPEC.a.containers.bench,
            slot_index: 7,
          },
        },
        RACK_OK,
      )[0].reachable,
    ).toBe(false);

    // One invalid occasion beside an observed one: 2 / 3, incomplete.
    const h = harness();
    const { s } = runOccasion(h, 'a', [], { reachability: missing });

    expect(s.phase).toBe('failed');
    expect(s.departure).toBeNull();
    expect(m03Depart(s, blocked, 9_000, 'keyboard', h.sink('a'))).toBeNull();
    runOccasion(h, 'b', [BRUSH, GAUGE]);

    const rows = extractItemFeatures('M03', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 3,
      disposition: 'incomplete',
      included_ids: ['m03_tools_o2'],
    });
    expect(rows[0].components).toMatchObject({
      occasions_observed: ['o2'],
      occasions_technically_invalid: ['o1'],
    });

    // Both invalid: no value at all.
    const both = harness();

    runOccasion(both, 'a', [], { reachability: missing });
    runOccasion(both, 'b', [], {
      reachability: m03Reachability('b', {}, RACK_OK),
    });
    expect(extractItemFeatures('M03', both.events, CONTEXT)[0]).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'technical_failure',
      closure_reason: 'technical_failure',
    });
  });

  test('not presented, declined, run never completed, pending, interrupted and the reload guard are distinct; none is a zero', () => {
    expect(extractItemFeatures('M03', [], CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expect(
      extractItemFeatures('M03', [], { ...CONTEXT, reloaded: true })[0]
        .disposition,
    ).toBe('interrupted');

    // Listed on the work orders, never opened.
    const declined = harness();

    declined.push('a', 'presented', { input_mode: 'system' });
    expect(
      extractItemFeatures('M03', declined.events, CONTEXT)[0],
    ).toMatchObject({ value: null, denominator: 0, disposition: 'declined' });

    // Panel opened, the roll loaded, two cycles run, panel closed for good.
    const unrun = harness();
    const s = createM03State('a');
    const log = unrun.sink('a');

    unrun.push('a', 'presented', { input_mode: 'system' });
    m03SurfaceOpened(s, 10, 'pointer', log);
    m03RollMoved(
      s,
      M03_SPEC.a.containers.supply,
      M03_SPEC.a.containers.feed,
      20,
      'pointer',
      log,
    );
    m03RunCycle(s, 'pointer', log);
    m03RunCycle(s, 'pointer', log);
    m03SurfaceClosed(s, 'pointer', log);
    expect(m03RawComponents(s, 'closed_at_review')).toMatchObject({
      observed: false,
      tools_restored: null,
      press_cycles_done: 2,
    });

    const unrunRows = extractItemFeatures('M03', unrun.events, CONTEXT);

    expect(unrunRows[0]).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'no_eligible_event',
    });
    expect(unrunRows[0].components).toMatchObject({
      occasions_run_never_completed: ['o1'],
    });
    expect(
      (unrunRows[1].value as Record<string, { status: string } | null>).o1,
    ).toMatchObject({ status: 'unrun', movement_taught: true });

    // Tools out, panel still open (a non-terminal export).
    const open = harness();

    runOccasion(open, 'a', [BRUSH], { depart: false });
    expect(extractItemFeatures('M03', open.events, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'pending',
    });

    // The guard recognises the SAME occasion's earlier administration only.
    expect(m03PriorAdministration(open.events, 'a')).toBe(true);
    expect(m03PriorAdministration(open.events, 'b')).toBe(false);
    expect(m03PriorAdministration(declined.events, 'a')).toBe(false);
    expect(m03PriorAdministration([], 'a')).toBe(false);
    // A panel merely opened in an earlier load (its tools never lay out)
    // is prior exposure, never an administration.
    expect(m03PriorPanelExposure(unrun.events, 'a')).toBe(true);
    expect(m03PriorAdministration(unrun.events, 'a')).toBe(false);
    expect(m03PriorPanelExposure(unrun.events, 'b')).toBe(false);
    expect(m03PriorPanelExposure(declined.events, 'a')).toBe(false);

    // Held back after a reload beside an observed occasion: interrupted,
    // the observed value kept beside it.
    const mixed = harness();

    mixed.push('a', 'technical_failure', {
      detail: 'reload after administration: press occasion not re-run',
      input_mode: 'system',
    });
    runOccasion(mixed, 'b', [BRUSH, KEY, GAUGE]);

    const mixedRows = extractItemFeatures('M03', mixed.events, {
      ...CONTEXT,
      reloaded: true,
    });

    expect(mixedRows[0]).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 3,
      disposition: 'interrupted',
      censored: true,
    });
    expect(mixedRows[0].components).toMatchObject({
      occasions_interrupted: ['o1'],
    });

    // Events of an earlier page load are never counted in this one.
    const earlier = harness();

    runOccasion(earlier, 'a', [BRUSH, KEY, GAUGE]);

    const asPrior = earlier.events.map((event) => ({
      ...event,
      page_load_index: 1,
    }));

    expect(
      extractItemFeatures('M03', asPrior, {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      })[0],
    ).toMatchObject({ value: null, disposition: 'interrupted' });
  });

  test('a panel closed by the system is not a departure: a stop is a technical failure, the review censors; the state is kept, never a value', () => {
    // Tools out, one restored, then the panel is stopped by the system
    // (the adapter marks the window technically failed).
    const h = harness();
    const { s, placements } = runOccasion(h, 'a', [BRUSH], { depart: false });
    const record = m03Depart(s, placements, 9_000, 'system', h.sink('a'))!;

    h.push('a', 'technical_failure', {
      detail: 'panel stopped by the system with the tools out: no departure',
      input_mode: 'system',
    });

    expect(record).toMatchObject({
      close_reason: 'system_close',
      departed: false,
      tools_restored: 1,
    });
    expect(m03Terminal(s)).toBe(true);
    expect(m03RawComponents(s, 'system_close')).toMatchObject({
      observed: false,
      close_reason: 'system_close',
    });
    expect(h.events.map((e) => e.event_type)).toContain(
      `${M03_FAMILY}state_at_system_close`,
    );
    expect(h.events.map((e) => e.event_type)).not.toContain(
      `${M03_FAMILY}first_departure`,
    );

    const rows = extractItemFeatures('M03', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'technical_failure',
      closure_reason: 'technical_failure',
    });
    expect(rows[0].components).toMatchObject({
      occasions_technically_invalid: ['o1'],
      occasions_observed: [],
    });
    expect(
      (rows[1].value as Record<string, Record<string, unknown>>).o1,
    ).toMatchObject({
      status: 'technical',
      tools_restored: null,
      tools_in_home_at_system_close: 1,
      close_reason: 'system_close',
    });

    // The review's closure is recorded apart too, under its own reason,
    // and censors.
    const review = harness();
    const open = runOccasion(review, 'b', [], { depart: false });

    expect(
      m03Depart(
        open.s,
        open.placements,
        9_000,
        'system',
        review.sink('b'),
        'closed_at_review',
      ),
    ).toMatchObject({ close_reason: 'closed_at_review', departed: false });

    const reviewRows = extractItemFeatures('M03', review.events, CONTEXT);

    expect(reviewRows[0]).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'interrupted',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(reviewRows[0].components).toMatchObject({
      occasions_closed_by_system: ['o2'],
    });
    expect(
      (reviewRows[1].value as Record<string, Record<string, unknown>>).o2,
    ).toMatchObject({
      status: 'censored',
      tools_restored: null,
      tools_in_home_at_system_close: 0,
      close_reason: 'closed_at_review',
    });

    // Beside an observed occasion the censored one is excluded: 3 / 3.
    runOccasion(review, 'a', [BRUSH, KEY, GAUGE]);
    expect(extractItemFeatures('M03', review.events, CONTEXT)[0]).toMatchObject(
      {
        value: 3,
        denominator: 3,
        disposition: 'incomplete',
        censored: true,
        included_ids: ['m03_tools_o1'],
      },
    );
  });

  test('two tools swapped on the surface and a move inside the rack never change the count', () => {
    const h = harness();
    const { s, placements } = runOccasion(h, 'a', [KEY], { depart: false });
    const { bench: surface, rack } = M03_SPEC.a.containers;
    const log = h.sink('a');
    // The brush and the gauge change places (a swap is two moves).
    const brushAt = placements[BRUSH];
    const gaugeAt = placements[GAUGE];

    m03ToolMoved(s, BRUSH, brushAt, gaugeAt, 4_000, 'pointer', log);
    m03ToolMoved(s, GAUGE, gaugeAt, brushAt, 4_000, 'pointer', log);
    placements[BRUSH] = gaugeAt;
    placements[GAUGE] = brushAt;

    // The key moves along the rack.
    const along = { container_id: rack, slot_index: 2 };

    m03ToolMoved(s, KEY, placements[KEY], along, 4_500, 'keyboard', log);
    placements[KEY] = along;

    const departure = m03Depart(s, placements, 9_000, 'keyboard', log)!;

    expect(departure.tools_restored).toBe(1);
    expect(departure.move_count).toBe(4);
    expect(departure.tools.map((t) => [t.container, t.slot_index])).toEqual([
      [surface, 6],
      [rack, 2],
      [surface, 1],
    ]);
    expect(extractItemFeatures('M03', h.events, CONTEXT)[0]).toMatchObject({
      value: 1,
      denominator: 3,
      disposition: 'incomplete',
    });
  });

  test('a recorded state that disagrees with the raw moves is a technical failure, even when the totals agree', () => {
    const h = harness();

    runOccasion(h, 'a', [BRUSH]);

    // The snapshot names another tool in the rack: the count still reads
    // one, the raw moves say the brush.
    const tampered = h.events.map((event) =>
      event.event_type === `${M03_FAMILY}first_departure`
        ? {
            ...event,
            metadata: {
              ...event.metadata,
              tools: (event.metadata!.tools as { object_id: string }[]).map(
                (tool) => ({
                  ...tool,
                  in_home: tool.object_id === KEY,
                }),
              ),
            },
          }
        : event,
    );
    const rows = extractItemFeatures('M03', tampered, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
    expect(rows[0].components).toMatchObject({ occasions_disagreeing: ['o1'] });

    // A count that disagrees with the moves.
    const counted = h.events.map((event) =>
      event.event_type === `${M03_FAMILY}first_departure`
        ? { ...event, metadata: { ...event.metadata, tools_restored: 3 } }
        : event,
    );

    expect(extractItemFeatures('M03', counted, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });

    // A departure without the tools' appearance before it cannot be
    // reproduced: never an observation.
    const orphan = h.events.filter(
      (event) => event.event_type !== `${M03_FAMILY}opportunity_opened`,
    );

    expect(extractItemFeatures('M03', orphan, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });

    // A move logged AFTER the first departure never changes the value.
    const late = [
      ...h.events,
      {
        ...h.events[h.events.length - 1],
        event_type: `${M03_FAMILY}tool_moved`,
        sequence: h.events.length + 1,
        metadata: {
          occasion: 'o1',
          object_id: GAUGE,
          to_container: M03_SPEC.a.containers.rack,
        },
      },
    ];

    expect(extractItemFeatures('M03', late, CONTEXT)[0]).toMatchObject({
      value: 1,
      denominator: 3,
      disposition: 'incomplete',
    });
  });

  test('U14-C: a completed occasion is read only with its own three tools, containers the raw moves lead to, and its opening and departure once each and in that order; the raw log is never changed', () => {
    const h = harness();

    runOccasion(h, 'a', [BRUSH]);

    const type = (suffix: string) => `${M03_FAMILY}${suffix}`;
    const { rack, bench: surface } = M03_SPEC.a.containers;
    const before = JSON.stringify(h.events);
    const frozen = h.events.map((event) =>
      Object.freeze({
        ...event,
        metadata: Object.freeze({ ...event.metadata }),
      }),
    ) as unknown as RawGameEvent[];
    const failed = (events: RawGameEvent[]) => {
      const rows = extractItemFeatures('M03', events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: null,
        disposition: 'technical_failure',
        closure_reason: 'technical_failure',
      });
      expect(rows[0].components).toMatchObject({
        occasions_disagreeing: ['o1'],
      });
    };
    const departure = (change: (tools: Record<string, unknown>[]) => unknown) =>
      h.events.map((event) =>
        event.event_type === type('first_departure')
          ? {
              ...event,
              metadata: {
                ...event.metadata,
                tools: change(
                  (event.metadata!.tools as Record<string, unknown>[]).map(
                    (tool) => ({ ...tool }),
                  ),
                ),
              },
            }
          : event,
      ) as RawGameEvent[];

    expect(extractItemFeatures('M03', frozen, CONTEXT)[0]).toMatchObject({
      value: 1,
      denominator: 3,
      disposition: 'incomplete',
    });

    // A recorded tool that is not one of the occasion's three.
    failed(
      departure((tools) =>
        tools.map((tool) =>
          tool.object_id === GAUGE
            ? { ...tool, object_id: 'm03t_label_roll' }
            : tool,
        ),
      ),
    );
    // The same tool recorded twice (three records, two tools).
    failed(
      departure((tools) =>
        tools.map((tool) =>
          tool.object_id === GAUGE ? { ...tool, object_id: KEY } : tool,
        ),
      ),
    );
    // Two records only.
    failed(departure((tools) => tools.slice(0, 2)));
    // A container the raw moves do not lead to, with `in_home` untouched.
    failed(
      departure((tools) =>
        tools.map((tool) =>
          tool.object_id === KEY
            ? { ...tool, container: M03_SPEC.b.containers.bench }
            : tool,
        ),
      ),
    );
    failed(
      departure((tools) =>
        tools.map((tool) =>
          tool.object_id === BRUSH ? { ...tool, container: surface } : tool,
        ),
      ),
    );

    // Move counts that the raw moves do not give: the same move written
    // twice, or a count changed in the record.
    const written = h.events.find((e) => e.event_type === type('tool_moved'))!;

    failed(
      h.events.flatMap((event) =>
        event === written
          ? [event, { ...event, sequence: event.sequence! + 0.5 }]
          : [event],
      ) as RawGameEvent[],
    );
    failed(
      h.events.map((event) =>
        event.event_type === type('first_departure')
          ? { ...event, metadata: { ...event.metadata, move_count: 0 } }
          : event,
      ),
    );
    failed(
      departure((tools) =>
        tools.map((tool) =>
          tool.object_id === GAUGE ? { ...tool, moves: 2 } : tool,
        ),
      ),
    );

    // The tools that appeared are not the occasion's three.
    failed(
      h.events.map((event) =>
        event.event_type === type('opportunity_opened')
          ? {
              ...event,
              metadata: {
                ...event.metadata,
                entry_state_snapshot: {
                  ...(event.metadata!.entry_state_snapshot as object),
                  tools: [BRUSH, KEY, 'm03_residual_1'],
                },
              },
            }
          : event,
      ) as RawGameEvent[],
    );

    // A move inside the window that names another object or another tray.
    const moved = h.events.find((e) => e.event_type === type('tool_moved'))!;
    const withMove = (metadata: Record<string, unknown>) =>
      h.events.flatMap((event) =>
        event === moved
          ? [
              event,
              {
                ...event,
                sequence: event.sequence! + 0.5,
                metadata: { ...event.metadata, ...metadata },
              },
            ]
          : [event],
      ) as RawGameEvent[];

    failed(withMove({ object_id: 'm04_offcut_a', to_container: rack }));
    failed(
      withMove({
        object_id: GAUGE,
        to_container: M03_SPEC.b.containers.rack,
      }),
    );

    // The record and the opening occur once each, the opening first.
    for (const suffix of ['opportunity_opened', 'first_departure']) {
      const original = h.events.find((e) => e.event_type === type(suffix))!;

      failed([
        ...h.events,
        { ...original, sequence: h.events.length + 1 },
      ] as RawGameEvent[]);
    }

    failed(
      h.events.map((event) =>
        event.event_type === type('opportunity_opened')
          ? { ...event, sequence: h.events.length + 1 }
          : event,
      ),
    );
    // An opening that belongs to the OTHER occasion does not open this one.
    failed(
      h.events.map((event) =>
        event.event_type === type('opportunity_opened')
          ? { ...event, metadata: { ...event.metadata, occasion: 'o2' } }
          : event,
      ),
    );

    // Nothing above changed the log that was read.
    expect(JSON.stringify(h.events)).toBe(before);
    expect(JSON.stringify(frozen)).toBe(before);

    // A legitimate pending occasion is never turned into a failure by a
    // missing presentation: the presentation is an exposure record.
    const open = harness();

    runOccasion(open, 'a', [], { depart: false });
    expect(
      extractItemFeatures(
        'M03',
        open.events.filter((e) => e.event_type !== type('presented')),
        CONTEXT,
      )[0],
    ).toMatchObject({ value: null, disposition: 'pending' });
  });

  test('U14-C: a press opened before the work orders is presented by the press itself, before its panel; the line after a stopped panel states no finished batch', () => {
    // Direct access: the presentation is written first and names its
    // source; the panel's open repeats it.
    const direct = harness();
    const s = createM03State('a');
    const log = direct.sink('a');
    const spec = M03_SPEC.a;

    direct.push('a', 'presented', { input_mode: 'system' });
    m03SurfaceOpened(s, 1_000, 'keyboard', log, 'station_direct');
    expect(direct.events.map((e) => e.event_type)).toEqual([
      `${M03_FAMILY}presented`,
      `${M03_FAMILY}surface_opened`,
      `${M03_FAMILY}practice_presented`,
    ]);
    expect(direct.events[1].metadata).toMatchObject({
      presented_by: 'station_direct',
      open_number: 1,
    });
    m03RollMoved(
      s,
      spec.containers.supply,
      spec.containers.feed,
      2_000,
      'pointer',
      log,
    );

    for (let cycle = 0; cycle < M03_PRESS_CYCLES; cycle += 1) {
      m03RunCycle(s, 'pointer', log);
    }

    const placements = bench('a');
    const reachability = m03Reachability('a', placements, RACK_OK);

    expect(m03ToolsOut(s, reachability, 3_000)).toBe(true);
    direct.push('a', 'opportunity_opened', {
      entry_state_snapshot: {
        ...m03EntrySnapshot('a'),
        presented_by: 'station_direct',
        reachability,
      },
      input_mode: 'system',
    });
    m03Depart(s, placements, 9_000, 'pointer', log);

    const rows = extractItemFeatures('M03', direct.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: 0,
      denominator: 3,
      disposition: 'incomplete',
    });
    expect(
      (rows[1].value as Record<string, Record<string, unknown>>).o1,
    ).toMatchObject({
      status: 'observed',
      presented_by: 'station_direct',
      presented_before_panel_opened: true,
      practice_input_mode: 'pointer',
    });

    // The ordinary route names the work orders.
    const listed = harness();

    runOccasion(listed, 'b', []);
    expect(
      (
        extractItemFeatures('M03', listed.events, CONTEXT)[1].value as Record<
          string,
          Record<string, unknown>
        >
      ).o2,
    ).toMatchObject({
      presented_by: null,
      presented_before_panel_opened: true,
    });
    expect(listed.events[1].metadata).toMatchObject({ presented_by: null });

    // A presentation of an earlier page load is recognised per occasion.
    expect(m03PriorPresentation(direct.events, 'a')).toBe(true);
    expect(m03PriorPresentation(direct.events, 'b')).toBe(false);
    expect(m03PriorPresentation([], 'a')).toBe(false);

    // The line of the press once the occasion is over.
    expect(m03IdleLine(s)).toBe('Label press idle. The batch is done.');

    const stopped = harness();
    const open = runOccasion(stopped, 'a', [BRUSH], { depart: false });

    m03Depart(open.s, open.placements, 9_000, 'system', stopped.sink('a'));
    expect(open.s.phase).toBe('departed');
    expect(m03IdleLine(open.s)).toBe('Label press out of service.');

    const review = harness();
    const atReview = runOccasion(review, 'b', [], { depart: false });

    m03Depart(
      atReview.s,
      atReview.placements,
      9_000,
      'system',
      review.sink('b'),
      'closed_at_review',
    );
    expect(m03IdleLine(atReview.s)).toBe('Label press out of service.');

    const unreachable = harness();
    const failedRun = runOccasion(unreachable, 'a', [], {
      reachability: m03Reachability('a', {}, RACK_OK),
    });

    expect(failedRun.s.phase).toBe('failed');
    expect(m03IdleLine(failedRun.s)).toBe('Label press out of service.');
  });
});
