/**
 * M03 — Tool restoration: the press-occasion model (Station 080 M01–M26
 * run, Unit 14). PURE (no Phaser, no runtime import): the window adapter
 * (`m03ToolRestore.ts`) owns the register windows, reads the inventory
 * store and injects the log sink; the overlay calls the adapter with its
 * input mode.
 *
 * Approved design (register M03 row, "Retain and verify"): two occasions
 * with three tools each; movement taught beforehand; storage visible,
 * exit open; no cleanup instruction or reward; the state at the first
 * departure saved permanently.
 *
 * Mechanic: a label press with a roll supply slot, a press feed slot, a
 * work surface and a tool rack. The press states how to load it — the
 * label roll is moved from the supply to the feed with the same drag or
 * SPACE commands every other object of the panel uses (the taught
 * movement). Three press cycles finish the batch; the three tools used for
 * the run then lie at fixed slots of the work surface. The rack is
 * visible and empty; nothing names it. Closing the panel is the first
 * departure: the location of every tool is recorded once and the press is
 * idle afterwards. A panel closed by the system is not a departure: its
 * state is kept and censored.
 *
 * Measure (register `m03_tools_restored`): tools in the rack at the first
 * departure, summed over both occasions / 6 (three per occasion). An
 * occasion whose tools could not be reached is technically invalid and
 * excluded; an occasion whose run was never completed has no tools and no
 * observation. Leaving every tool where it lies is a fully valid
 * observation. Nothing here is a score.
 */
import { FocusedClock, type PauseCause } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';

export const M03_FAMILY = 'proto_m03tools_';
/**
 * `m03-tools-v2` (U14-C): a press opened before the work orders were
 * taken is presented at that open (`presented_by: 'station_direct'`),
 * the panel's layout at 800 × 600 and the line after a stopped panel
 * changed. `m03-tools-v1` is the administration of Unit 14.
 */
export const M03_ENTRY_STATE_VERSION = 'm03-tools-v2';
export const M03_PRESS_CYCLES = 3;
/**
 * Exposure floor of the v2 route, kept as a RECORDED fact
 * (`exposure_sufficient`) and never a validity marker: every departure is
 * a completed observation.
 */
export const M03_EXPOSURE_FLOOR_MS = 2000;
/** Both occasions share one fixed starting layout (recorded, not varied). */
export const M03_STARTING_CONDITION = 'fixed_identical_layout';
export const M03_PRIOR_ADMINISTRATION = 'prior_administration';

export type M03Occasion = 'a' | 'b';
export type M03InputMode = 'pointer' | 'keyboard' | 'system';
export type M03Phase =
  | 'unopened'
  | 'practice'
  | 'running'
  | 'tools_out'
  | 'departed'
  | 'failed';
/** Who closed the panel with the tools out. */
export type M03CloseReason =
  | 'panel_closed'
  | 'system_close'
  | 'closed_at_review';
/**
 * What presented the occasion: the work orders that list the press
 * batch, or the press itself, opened before any order named it. After a
 * reload the presentation of an earlier page load is named as such —
 * this load cannot know what it was and never claims a direct one.
 */
export type M03PresentedBy =
  | 'work_orders'
  | 'station_direct'
  | 'earlier_page_load';
export type M03LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export const M03_OCCASIONS: readonly M03Occasion[] = ['a', 'b'];

export interface M03OccasionSpec {
  occasion: M03Occasion;
  /** Occasion tag written on every event (o1 = episode 2, o2 = episode 5). */
  tag: 'o1' | 'o2';
  episode: 2 | 5;
  opportunity_id: string;
  window_id: string;
  object_id: string;
  containers: {
    bench: string;
    rack: string;
    supply: string;
    feed: string;
  };
}

export const M03_SPEC: Record<M03Occasion, M03OccasionSpec> = {
  a: {
    occasion: 'a',
    tag: 'o1',
    episode: 2,
    opportunity_id: 'proto_m03_tools_a',
    window_id: 'm03_tools_o1',
    object_id: 'm03_press_bench_a',
    containers: {
      bench: 'm03t_bench_a',
      rack: 'm03t_rack_a',
      supply: 'm03t_supply_a',
      feed: 'm03t_feed_a',
    },
  },
  b: {
    occasion: 'b',
    tag: 'o2',
    episode: 5,
    opportunity_id: 'proto_m03_tools_b',
    window_id: 'm03_tools_o2',
    object_id: 'm03_press_bench_b',
    containers: {
      bench: 'm03t_bench_b',
      rack: 'm03t_rack_b',
      supply: 'm03t_supply_b',
      feed: 'm03t_feed_b',
    },
  },
};

export interface M03Tool {
  definitionId: string;
  label: string;
  /** Fixed slot of the work surface the tool lies on after the run. */
  bench_slot: number;
}

/** Three tools per occasion (the same kinds on both presses). */
export const M03_TOOLS: readonly M03Tool[] = [
  { definitionId: 'm03t_platen_brush', label: 'Platen brush', bench_slot: 1 },
  { definitionId: 'm03t_alignment_key', label: 'Alignment key', bench_slot: 4 },
  { definitionId: 'm03t_feed_gauge', label: 'Feed gauge', bench_slot: 6 },
];

export const M03_TOOL_COUNT = M03_TOOLS.length;
export const M03_BENCH_CAPACITY = 8;
export const M03_RACK_CAPACITY = 3;
/** The practice object: the label roll the press is loaded with. */
export const M03_ROLL_ID = 'm03t_label_roll';

export function m03Tool(definitionId: string): M03Tool | undefined {
  return M03_TOOLS.find((tool) => tool.definitionId === definitionId);
}

/** The work surface's seed, by slot (null = empty). */
export function m03BenchSeed(): (string | null)[] {
  const slots: (string | null)[] = new Array<string | null>(
    M03_BENCH_CAPACITY,
  ).fill(null);

  for (const tool of M03_TOOLS) {
    slots[tool.bench_slot] = tool.definitionId;
  }

  return slots;
}

// ——— placements and reachability ———————————————————————————————————————

export interface M03Placement {
  container_id: string;
  slot_index: number;
}

export type M03Placements = Record<string, M03Placement>;

export interface M03RackFacts {
  capacity: number;
  free_slots: number;
  /** Whether the rack accepts the tool at all (namespace and tags). */
  accepts: Record<string, boolean>;
}

export interface M03Reachability {
  object_id: string;
  on_surface: boolean;
  slot_index: number | null;
  expected_slot: number;
  home_accepts: boolean;
  home_has_room: boolean;
  reachable: boolean;
}

/**
 * Reachability per object, checked when the tools appear: the tool lies
 * on the work surface at its fixed slot, the rack accepts it, and the
 * rack has room for every tool. An unreachable tool makes the occasion
 * technically invalid — never a tool "left out".
 */
export function m03Reachability(
  occasion: M03Occasion,
  placements: M03Placements,
  rack: M03RackFacts,
): M03Reachability[] {
  const { bench } = M03_SPEC[occasion].containers;
  const room = rack.free_slots >= M03_TOOL_COUNT;

  return M03_TOOLS.map((tool) => {
    const placement = placements[tool.definitionId] ?? null;
    const onSurface =
      placement !== null &&
      placement.container_id === bench &&
      placement.slot_index === tool.bench_slot;
    const accepts = rack.accepts[tool.definitionId] === true;

    return {
      object_id: tool.definitionId,
      on_surface: onSurface,
      slot_index: placement?.slot_index ?? null,
      expected_slot: tool.bench_slot,
      home_accepts: accepts,
      home_has_room: room,
      reachable: onSurface && accepts && room,
    };
  });
}

// ——— state ————————————————————————————————————————————————————————————

export type M03ToolLocation = 'home' | 'surface' | 'unknown';

export interface M03ToolRecord {
  object_id: string;
  location: M03ToolLocation;
  container: string | null;
  slot_index: number | null;
  in_home: boolean;
  moves: number;
}

export interface M03Departure {
  at_ms: number;
  close_reason: M03CloseReason;
  /** True when the PARTICIPANT closed the panel (a departure). */
  departed: boolean;
  tools: M03ToolRecord[];
  tools_restored: number;
  tools_left: number;
  tool_total: number;
  move_count: number;
  focused_ms: number;
  wall_ms: number;
  excluded_ms: Record<PauseCause, number>;
  excluded_total_ms: number;
  exposure_sufficient: boolean;
  input_mode: M03InputMode;
}

export interface M03State {
  spec: M03OccasionSpec;
  phase: M03Phase;
  surfaceOpens: number;
  surfaceClosures: number;
  practicePresentedAtMs: number | null;
  practiceMoves: number;
  practiceCompletedAtMs: number | null;
  practiceInputMode: M03InputMode | null;
  rollInFeed: boolean;
  cycles: number;
  runRefusals: number;
  moveRefusals: number;
  toolsOutAtMs: number | null;
  reachability: M03Reachability[] | null;
  moveCount: number;
  movesByTool: Record<string, number>;
  clock: FocusedClock | null;
  departure: M03Departure | null;
  closureReason: string | null;
}

export function createM03State(occasion: M03Occasion): M03State {
  return {
    spec: M03_SPEC[occasion],
    phase: 'unopened',
    surfaceOpens: 0,
    surfaceClosures: 0,
    practicePresentedAtMs: null,
    practiceMoves: 0,
    practiceCompletedAtMs: null,
    practiceInputMode: null,
    rollInFeed: false,
    cycles: 0,
    runRefusals: 0,
    moveRefusals: 0,
    toolsOutAtMs: null,
    reachability: null,
    moveCount: 0,
    movesByTool: Object.fromEntries(
      M03_TOOLS.map((tool) => [tool.definitionId, 0]),
    ),
    clock: null,
    departure: null,
    closureReason: null,
  };
}

export function m03EntrySnapshot(occasion: M03Occasion) {
  const spec = M03_SPEC[occasion];

  return {
    occasion_id: spec.tag,
    episode_number: spec.episode,
    starting_condition: M03_STARTING_CONDITION,
    tools: M03_TOOLS.map((tool) => tool.definitionId),
    tool_slots: M03_TOOLS.map((tool) => tool.bench_slot),
    tool_total: M03_TOOL_COUNT,
    home: spec.containers.rack,
    home_capacity: M03_RACK_CAPACITY,
    home_visible: true,
    movement_taught: 'label_roll_supply_to_feed',
    press_cycles: M03_PRESS_CYCLES,
    restoration_instructed: false,
    restoration_rewarded: false,
    exit_always_available: true,
    departure: 'panel_close',
    snapshot_at_first_departure: true,
    exposure_floor_ms: M03_EXPOSURE_FLOOR_MS,
    time_limit: null,
    payment_fixed: true,
    route_fixed: true,
  };
}

/** True when an earlier page load of this identity presented this occasion. */
export function m03PriorPresentation(
  priorLoadEvents: readonly {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[],
  occasion: M03Occasion,
): boolean {
  return priorLoadEvents.some(
    (event) =>
      event.event_type === `${M03_FAMILY}presented` &&
      event.metadata?.opportunity_id === M03_SPEC[occasion].opportunity_id,
  );
}

/**
 * True when an earlier page load of this identity opened this occasion's
 * panel (whatever happened in it): recorded as prior exposure; the
 * occasion is re-run only when its tools never lay out.
 */
export function m03PriorPanelExposure(
  priorLoadEvents: readonly {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[],
  occasion: M03Occasion,
): boolean {
  return priorLoadEvents.some(
    (event) =>
      event.event_type === `${M03_FAMILY}surface_opened` &&
      event.metadata?.opportunity_id === M03_SPEC[occasion].opportunity_id,
  );
}

/**
 * Reload guard (register §5.14): true when an earlier page load of this
 * identity already put this occasion's tools on the surface.
 */
export function m03PriorAdministration(
  priorLoadEvents: readonly {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[],
  occasion: M03Occasion,
): boolean {
  return priorLoadEvents.some(
    (event) =>
      event.event_type === `${M03_FAMILY}opportunity_opened` &&
      event.metadata?.opportunity_id === M03_SPEC[occasion].opportunity_id,
  );
}

// ——— readers ——————————————————————————————————————————————————————————

/** The roll is threaded once the first cycle ran: it no longer moves. */
export function m03RollLocked(s: M03State): boolean {
  return s.phase !== 'unopened' && s.phase !== 'practice';
}

/** Tools may be moved only while they lie out and the panel is open. */
export function m03ToolsMovable(s: M03State): boolean {
  return s.phase === 'tools_out';
}

export function m03PressRunnable(s: M03State): boolean {
  return (s.phase === 'practice' && s.rollInFeed) || s.phase === 'running';
}

export function m03Terminal(s: M03State): boolean {
  return s.phase === 'departed' || s.phase === 'failed';
}

// ——— the panel ————————————————————————————————————————————————————————

function base(s: M03State) {
  return { occasion_id: s.spec.tag, episode_number: s.spec.episode };
}

/**
 * The panel was opened. The first open presents the taught movement; a
 * later open resumes the activity where it stood. Never opens a terminal
 * occasion.
 */
export function m03SurfaceOpened(
  s: M03State,
  nowMs: number,
  inputMode: M03InputMode,
  log: M03LogSink,
  presentedBy: M03PresentedBy | null = null,
): M03Phase {
  if (m03Terminal(s)) {
    return s.phase;
  }

  s.surfaceOpens += 1;
  log('surface_opened', {
    ...base(s),
    presented_by: presentedBy,
    open_number: s.surfaceOpens,
    panel_phase: s.phase === 'unopened' ? 'practice' : s.phase,
    press_cycles_done: s.cycles,
    phase: 'practice',
    input_mode: inputMode,
  });

  if (s.phase === 'unopened') {
    s.phase = 'practice';
    s.practicePresentedAtMs = nowMs;
    log('practice_presented', {
      ...base(s),
      practice_object: M03_ROLL_ID,
      from_container: s.spec.containers.supply,
      to_container: s.spec.containers.feed,
      commands: ['drag', 'space_pick_and_place'],
      phase: 'practice',
      input_mode: 'system',
    });
  }

  return s.phase;
}

/** The label roll changed container (the taught movement). */
export function m03RollMoved(
  s: M03State,
  from: string | null,
  to: string,
  nowMs: number,
  inputMode: M03InputMode,
  log: M03LogSink,
): boolean {
  if (s.phase !== 'practice') {
    return false;
  }

  s.practiceMoves += 1;
  s.rollInFeed = to === s.spec.containers.feed;
  log('practice_move', {
    ...base(s),
    practice_object: M03_ROLL_ID,
    from_container: from,
    to_container: to,
    move_number: s.practiceMoves,
    roll_in_feed: s.rollInFeed,
    phase: 'practice',
    input_mode: inputMode,
  });

  if (s.rollInFeed && s.practiceCompletedAtMs === null) {
    s.practiceCompletedAtMs = nowMs;
    s.practiceInputMode = inputMode;
    log('practice_completed', {
      ...base(s),
      practice_object: M03_ROLL_ID,
      moves_needed: s.practiceMoves,
      since_presented_ms:
        s.practicePresentedAtMs === null
          ? null
          : Math.max(0, nowMs - s.practicePresentedAtMs),
      phase: 'practice',
      input_mode: inputMode,
    });
  }

  return true;
}

export type M03CycleResult = 'cycle' | 'run_complete' | 'refused' | 'invalid';

/**
 * One press cycle. Refused (and recorded) while the roll is not in the
 * feed; the third cycle completes the run — the adapter then seeds the
 * tools and calls `m03ToolsOut`.
 */
export function m03RunCycle(
  s: M03State,
  inputMode: M03InputMode,
  log: M03LogSink,
): M03CycleResult {
  if (
    (s.phase !== 'practice' && s.phase !== 'running') ||
    s.cycles >= M03_PRESS_CYCLES
  ) {
    return 'invalid';
  }

  if (!m03PressRunnable(s)) {
    s.runRefusals += 1;
    log('run_refused', {
      ...base(s),
      reason: 'roll_not_loaded',
      refusal_number: s.runRefusals,
      phase: 'practice',
      input_mode: inputMode,
    });

    return 'refused';
  }

  s.phase = 'running';
  s.cycles += 1;
  log('press_cycle', {
    ...base(s),
    cycle: s.cycles,
    of: M03_PRESS_CYCLES,
    phase: 'practice',
    input_mode: inputMode,
  });

  return s.cycles >= M03_PRESS_CYCLES ? 'run_complete' : 'cycle';
}

/**
 * The tools lie out. Returns false — and freezes the occasion as a
 * technical failure — when any tool cannot be reached.
 */
export function m03ToolsOut(
  s: M03State,
  reachability: M03Reachability[],
  nowMs: number,
): boolean {
  if (s.phase !== 'running' || s.cycles < M03_PRESS_CYCLES) {
    return false;
  }

  s.reachability = reachability;

  if (
    reachability.length !== M03_TOOL_COUNT ||
    reachability.some((row) => !row.reachable)
  ) {
    s.phase = 'failed';
    s.closureReason = 'technical_failure';

    return false;
  }

  const clock = new FocusedClock();

  clock.start(nowMs);
  registerFocusedClock(clock);
  s.clock = clock;
  s.toolsOutAtMs = nowMs;
  s.phase = 'tools_out';

  return true;
}

/** A tool changed slot or container while the tools lie out. */
export function m03ToolMoved(
  s: M03State,
  toolId: string,
  from: M03Placement | null,
  to: M03Placement,
  nowMs: number,
  inputMode: M03InputMode,
  log: M03LogSink,
): boolean {
  if (s.phase !== 'tools_out' || m03Tool(toolId) === undefined) {
    return false;
  }

  s.moveCount += 1;
  s.movesByTool[toolId] = (s.movesByTool[toolId] ?? 0) + 1;
  log('tool_moved', {
    ...base(s),
    object_id: toolId,
    from_container: from?.container_id ?? null,
    from_slot: from?.slot_index ?? null,
    to_container: to.container_id,
    to_slot: to.slot_index,
    to_home: to.container_id === s.spec.containers.rack,
    move_number: s.moveCount,
    focused_ms: s.clock?.focusedMs(nowMs) ?? null,
    phase: 'measurement',
    input_mode: inputMode,
  });

  return true;
}

/** A move the panel refused (the threaded roll, a tool before the run). */
export function m03MoveRefused(
  s: M03State,
  objectId: string | null,
  reason: string,
  inputMode: M03InputMode,
  log: M03LogSink,
) {
  s.moveRefusals += 1;
  log('move_refused', {
    ...base(s),
    object_id: objectId,
    reason,
    refusal_number: s.moveRefusals,
    phase: s.phase === 'tools_out' ? 'measurement' : 'practice',
    input_mode: inputMode,
  });
}

function toolRecords(s: M03State, placements: M03Placements): M03ToolRecord[] {
  const { rack, bench } = s.spec.containers;

  return M03_TOOLS.map((tool) => {
    const placement = placements[tool.definitionId] ?? null;
    const container = placement?.container_id ?? null;

    return {
      object_id: tool.definitionId,
      location:
        container === rack
          ? 'home'
          : container === bench
            ? 'surface'
            : 'unknown',
      container,
      slot_index: placement?.slot_index ?? null,
      in_home: container === rack,
      moves: s.movesByTool[tool.definitionId] ?? 0,
    };
  });
}

/**
 * The panel closed with the tools out. Closed by the participant this is
 * the FIRST DEPARTURE (`first_departure`); closed by the system it is not
 * a departure and is recorded apart (`state_at_system_close`). Either
 * way the location of every tool is recorded once and the occasion is
 * terminal afterwards.
 */
export function m03Depart(
  s: M03State,
  placements: M03Placements,
  nowMs: number,
  inputMode: M03InputMode,
  log: M03LogSink,
  closeReason: M03CloseReason = inputMode === 'system'
    ? 'system_close'
    : 'panel_closed',
): M03Departure | null {
  if (s.phase !== 'tools_out' || s.clock === null) {
    return null;
  }

  const clock = s.clock;

  clock.stop(nowMs);

  const snapshot = clock.snapshot(nowMs);

  releaseFocusedClock(clock);
  s.clock = null;

  const tools = toolRecords(s, placements);
  const restored = tools.filter((tool) => tool.in_home).length;

  const departed = closeReason === 'panel_closed';

  s.departure = {
    at_ms: nowMs,
    close_reason: closeReason,
    departed,
    tools,
    tools_restored: restored,
    tools_left: M03_TOOL_COUNT - restored,
    tool_total: M03_TOOL_COUNT,
    move_count: s.moveCount,
    focused_ms: snapshot.focused_ms,
    wall_ms: snapshot.wall_ms,
    excluded_ms: snapshot.excluded_ms,
    excluded_total_ms: snapshot.excluded_total_ms,
    exposure_sufficient: snapshot.focused_ms >= M03_EXPOSURE_FLOOR_MS,
    input_mode: inputMode,
  };
  s.phase = 'departed';
  s.closureReason = departed
    ? 'completed'
    : closeReason === 'closed_at_review'
      ? 'closed_at_review'
      : 'technical_failure';
  log(departed ? 'first_departure' : 'state_at_system_close', {
    ...base(s),
    ...s.departure,
    close_state: !departed
      ? 'closed_by_system'
      : s.departure.exposure_sufficient
        ? 'panel_closed'
        : 'panel_closed_early',
    snapshot_permanent: true,
    phase: 'closure',
    input_mode: inputMode,
  });

  return s.departure;
}

/** The panel closed before the tools lay out (the activity is kept). */
export function m03SurfaceClosed(
  s: M03State,
  inputMode: M03InputMode,
  log: M03LogSink,
): boolean {
  if (s.phase !== 'practice' && s.phase !== 'running') {
    return false;
  }

  s.surfaceClosures += 1;
  log('surface_closed', {
    ...base(s),
    closure_number: s.surfaceClosures,
    panel_phase: s.phase,
    practice_completed: s.practiceCompletedAtMs !== null,
    roll_in_feed: s.rollInFeed,
    press_cycles_done: s.cycles,
    phase: 'practice',
    input_mode: inputMode,
  });

  return true;
}

/**
 * What the press states once the occasion is over. Only a panel the
 * PARTICIPANT closed finished its batch; a panel stopped by the system, a
 * failed seed, an unreachable tool and a held-back occasion did not.
 */
export function m03IdleLine(s: M03State): string {
  return s.phase === 'departed' && s.departure?.departed === true
    ? 'Label press idle. The batch is done.'
    : 'Label press out of service.';
}

/** Freezes the occasion (technical failure, reload guard, reset). */
export function m03Freeze(s: M03State, nowMs: number, reason: string) {
  if (s.clock !== null) {
    s.clock.stop(nowMs);
    releaseFocusedClock(s.clock);
    s.clock = null;
  }

  if (s.phase !== 'departed') {
    s.phase = 'failed';
  }

  s.closureReason = reason;
}

/** Item-owned raw components of one occasion (state description, never a score). */
export function m03RawComponents(s: M03State, reason: string) {
  return {
    occasion: s.spec.tag,
    opportunity_id: s.spec.opportunity_id,
    window_id: s.spec.window_id,
    starting_condition: M03_STARTING_CONDITION,
    observed: s.departure !== null && s.departure.departed,
    close_reason: s.departure?.close_reason ?? null,
    tool_total: M03_TOOL_COUNT,
    tools_restored: s.departure?.tools_restored ?? null,
    tools_left: s.departure?.tools_left ?? null,
    tools: s.departure?.tools ?? null,
    move_count: s.moveCount,
    reachability: s.reachability,
    practice: {
      presented: s.practicePresentedAtMs !== null,
      completed: s.practiceCompletedAtMs !== null,
      moves: s.practiceMoves,
      input_mode: s.practiceInputMode,
    },
    press_cycles_done: s.cycles,
    run_refusals: s.runRefusals,
    move_refusals: s.moveRefusals,
    surface_opens: s.surfaceOpens,
    surface_closures_before_tools: s.surfaceClosures,
    exposure_focused_ms: s.departure?.focused_ms ?? null,
    exposure_wall_ms: s.departure?.wall_ms ?? null,
    exposure_excluded_ms: s.departure?.excluded_ms ?? null,
    exposure_sufficient: s.departure?.exposure_sufficient ?? null,
    closure_reason: reason,
  };
}
