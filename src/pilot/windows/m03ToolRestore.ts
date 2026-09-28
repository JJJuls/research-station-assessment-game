/**
 * M03 — window adapter of the two press occasions (Station 080 M01–M26
 * run, Unit 14). One register window per occasion (`m03_tools_o1` in the
 * restoration shift, `m03_tools_o2` on the return shift), one opportunity
 * id each; reads the occasion's containers from the inventory store and
 * delegates every command to the pure model (`m03RestoreModel.ts`),
 * logging through the occasion's window with the protocol stamp.
 *
 * Mechanic (inventory overlay mode 'm03tools'): the label roll is moved
 * from the supply slot to the press feed (the taught movement); three
 * press cycles finish the batch and leave three tools on the work
 * surface; a tool rack stands beside it. Nothing names the rack.
 *
 * Window lifecycle: presented when the work orders list the press batch
 * — or, when the press is opened before any order named it, at that open
 * and before the panel (U14-C: the presentation is recorded once, by
 * whichever came first, and never backdated); opened (entered) when the tools lie out and every tool is reachable;
 * completed at the FIRST DEPARTURE — the participant's close of the
 * panel — with the location of every tool; terminal afterwards. A panel
 * closed by the system with the tools out is not a departure: censored.
 * A panel closed before the run is complete keeps the activity and
 * records no observation; a failed seed or an unreachable tool is a
 * technical failure; an occasion whose tools lay out in an earlier page
 * load is never re-run (a panel merely opened in an earlier load is
 * recorded as prior exposure and run); the review marks a
 * never-completed occasion absent. The v2 five-residual route
 * (`proto_m03_*`, `src/inventory/m03Reset.ts`) keeps its v2 meaning in the
 * frozen ledger and stays with the Inventory Lab workstation.
 */
import { containerAccepts } from '../../inventory/engine';
import type { InventoryChange } from '../../inventory/store';
import {
  getInventoryState,
  onInventoryStoreChange,
  seedContainerPositional,
} from '../../inventory/store';
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import {
  createM03State,
  M03_ENTRY_STATE_VERSION,
  M03_FAMILY,
  M03_OCCASIONS,
  M03_PRIOR_ADMINISTRATION,
  M03_ROLL_ID,
  M03_SPEC,
  M03_STARTING_CONDITION,
  M03_TOOLS,
  m03BenchSeed,
  type M03CycleResult,
  m03Depart,
  m03EntrySnapshot,
  m03Freeze,
  m03IdleLine,
  type M03LogSink,
  m03MoveRefused,
  type M03Occasion,
  type M03Phase,
  type M03Placement,
  type M03Placements,
  type M03PresentedBy,
  m03PressRunnable,
  m03PriorAdministration,
  m03PriorPanelExposure,
  m03PriorPresentation,
  m03RawComponents,
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
} from './m03RestoreModel';
import { type InputMode, ItemWindow } from './windowKit';

export type { M03Occasion, M03Phase } from './m03RestoreModel';
export {
  M03_FAMILY,
  M03_OCCASIONS,
  M03_PRESS_CYCLES,
  M03_SPEC,
  M03_TOOLS,
} from './m03RestoreModel';

const NAMESPACE = 'm03t';
const SEED_ROLL = 'seed_m03t_supply';
const SEED_TOOLS = 'seed_m03t_bench';

function createWindow(occasion: M03Occasion): ItemWindow {
  const spec = M03_SPEC[occasion];

  return new ItemWindow({
    item: 'M03',
    opportunityId: spec.opportunity_id,
    windowId: spec.window_id,
    entryStateVersion: M03_ENTRY_STATE_VERSION,
    family: M03_FAMILY,
    scene: 'records_workshop',
    objectId: spec.object_id,
    // Not a counterbalance assignment: both occasions share one fixed
    // recorded starting condition.
    form: M03_STARTING_CONDITION,
    occasion: spec.tag,
  });
}

const windows: Record<M03Occasion, ItemWindow> = {
  a: createWindow('a'),
  b: createWindow('b'),
};

let states: Record<M03Occasion, M03State> = {
  a: createM03State('a'),
  b: createM03State('b'),
};

const unsubscribe: Record<M03Occasion, (() => void) | null> = {
  a: null,
  b: null,
};
const entryContext: Record<M03Occasion, Record<string, unknown>> = {
  a: {},
  b: {},
};
let moveInputMode: InputMode = 'system';
let presentedBy: Record<M03Occasion, M03PresentedBy | null> = {
  a: null,
  b: null,
};

function sink(occasion: M03Occasion): M03LogSink {
  return (suffix, metadata) =>
    windows[occasion].log(suffix, { ...protocolStamp(), ...metadata });
}

export function m03tWindow(occasion: M03Occasion): ItemWindow {
  return windows[occasion];
}

export function m03tState(occasion: M03Occasion): Readonly<M03State> {
  return states[occasion];
}

export function m03tPhase(occasion: M03Occasion): M03Phase {
  return states[occasion].phase;
}

/** The occasion is over (departed, or technically invalid): the press is idle. */
export function m03tTerminal(occasion: M03Occasion): boolean {
  return m03Terminal(states[occasion]);
}

export function m03tPressRunnable(occasion: M03Occasion): boolean {
  return m03PressRunnable(states[occasion]);
}

/** Declares both occasions (scene create; idempotent). */
export function declareM03T() {
  for (const occasion of M03_OCCASIONS) {
    windows[occasion].declare();
  }
}

/**
 * The occasion was PRESENTED: the work orders list the press batch, or
 * the press was opened before any order named it (`station_direct`).
 * Logged once, by whichever came first; a later listing never rewrites
 * it. A presented-but-never-opened press is `declined` at extraction.
 */
export function presentM03T(
  occasion: M03Occasion,
  nowMs: number,
  source: M03PresentedBy = 'work_orders',
) {
  if (presentedBy[occasion] !== null) {
    return;
  }

  const by: M03PresentedBy = m03PriorPresentation(
    researchRuntime.getPriorPageLoadEvents(),
    occasion,
  )
    ? 'earlier_page_load'
    : source;

  presentedBy[occasion] = by;
  windows[occasion].present(nowMs, {
    ...m03EntrySnapshot(occasion),
    presented_by: by,
  });
}

/** What presented the occasion (null = not presented yet). */
export function m03tPresentedBy(occasion: M03Occasion): M03PresentedBy | null {
  return presentedBy[occasion];
}

/** What the press states once the occasion is over. */
export function m03tIdleLine(occasion: M03Occasion): string {
  return m03IdleLine(states[occasion]);
}

/**
 * The host scene states what it knows at the open (the route stage and
 * the other Workshop items' window states); recorded in the entry
 * snapshot when the tools lie out.
 */
export function noteM03TEntry(
  occasion: M03Occasion,
  entry: Record<string, unknown>,
) {
  entryContext[occasion] = { ...entry };
}

/**
 * The overlay states the input mode of the placement it is about to
 * issue, so the move observed on the store carries it.
 */
export function noteM03TMoveInput(inputMode: InputMode) {
  moveInputMode = inputMode;
}

/** Current slot of the roll and of every tool of the occasion (from the store). */
export function m03tPlacements(occasion: M03Occasion): M03Placements {
  const placements: M03Placements = {};
  const inventory = getInventoryState();

  for (const containerId of Object.values(M03_SPEC[occasion].containers)) {
    const container = inventory.containers[containerId];

    if (container === undefined) {
      continue;
    }

    container.slots.forEach((slot, slotIndex) => {
      if (slot !== null) {
        placements[slot.definitionId] = {
          container_id: containerId,
          slot_index: slotIndex,
        };
      }
    });
  }

  return placements;
}

function samePlace(a: M03Placement | null, b: M03Placement | null): boolean {
  return (
    a !== null &&
    b !== null &&
    a.container_id === b.container_id &&
    a.slot_index === b.slot_index
  );
}

function observeMoves(occasion: M03Occasion) {
  if (unsubscribe[occasion] !== null) {
    return;
  }

  const owned = new Set<string>(Object.values(M03_SPEC[occasion].containers));
  let last = m03tPlacements(occasion);

  unsubscribe[occasion] = onInventoryStoreChange((change: InventoryChange) => {
    if (
      !change.ok ||
      change.namespace !== NAMESPACE ||
      !change.containerIds.some((containerId) => owned.has(containerId))
    ) {
      return;
    }

    if (change.op === SEED_ROLL || change.op === SEED_TOOLS) {
      last = m03tPlacements(occasion);

      return;
    }

    // A held object is absent from the placement scan; keeping its last
    // real slot in the baseline means a pick-up / cancel cycle is never a
    // move and a place records its true origin.
    const next = m03tPlacements(occasion);
    const s = states[occasion];
    const now = Date.now();

    for (const objectId of [
      M03_ROLL_ID,
      ...M03_TOOLS.map((t) => t.definitionId),
    ]) {
      const from = last[objectId] ?? null;
      const to = next[objectId] ?? null;

      if (to === null || samePlace(from, to)) {
        continue;
      }

      if (objectId === M03_ROLL_ID) {
        if (from?.container_id !== to.container_id) {
          m03RollMoved(
            s,
            from?.container_id ?? null,
            to.container_id,
            now,
            moveInputMode,
            sink(occasion),
          );
        }
      } else {
        m03ToolMoved(s, objectId, from, to, now, moveInputMode, sink(occasion));
      }
    }

    last = { ...last, ...next };
  });
}

function stopObserving(occasion: M03Occasion) {
  unsubscribe[occasion]?.();
  unsubscribe[occasion] = null;
}

function fail(occasion: M03Occasion, nowMs: number, detail: string) {
  m03Freeze(states[occasion], nowMs, 'technical_failure');
  stopObserving(occasion);
  windows[occasion].technicalFailure(detail);
}

/**
 * Opens (or reopens) the press panel; the first open places the label
 * roll in the supply slot and presents the taught movement.
 */
export function openM03TPanel(
  occasion: M03Occasion,
  nowMs: number,
  inputMode: InputMode,
): M03Phase {
  const s = states[occasion];
  const spec = M03_SPEC[occasion];

  windows[occasion].declare();

  if (m03Terminal(s)) {
    return s.phase;
  }

  if (s.phase === 'unopened') {
    // Reload guard (register §5.14): the raw log of an earlier page load
    // already holds this occasion's tools. Never re-run it.
    if (
      m03PriorAdministration(researchRuntime.getPriorPageLoadEvents(), occasion)
    ) {
      m03Freeze(s, nowMs, M03_PRIOR_ADMINISTRATION);
      windows[occasion].recordPriorExposure(
        'press occasion administered in an earlier page load of this identity',
      );
      windows[occasion].technicalFailure(
        'reload after administration: press occasion not re-run',
      );

      return s.phase;
    }

    // The panel was opened in an earlier page load and its tools never
    // lay out: the occasion runs, with the earlier exposure on record.
    if (
      m03PriorPanelExposure(researchRuntime.getPriorPageLoadEvents(), occasion)
    ) {
      windows[occasion].recordPriorExposure(
        'exposure:press_panel_opened_in_an_earlier_page_load',
      );
      entryContext[occasion] = {
        ...entryContext[occasion],
        panel_opened_in_earlier_page_load: true,
      };
    }

    const seed = seedContainerPositional(
      spec.containers.supply,
      [{ definitionId: M03_ROLL_ID, quantity: 1 }],
      SEED_ROLL,
    );

    if (!seed.ok) {
      fail(
        occasion,
        nowMs,
        `label roll seed failed: ${seed.reason ?? 'unknown'}`,
      );

      return s.phase;
    }

    observeMoves(occasion);
  }

  return m03SurfaceOpened(
    s,
    nowMs,
    inputMode,
    sink(occasion),
    presentedBy[occasion],
  );
}

/** One press cycle; the third seeds the tools and opens the window. */
export function runM03TPress(
  occasion: M03Occasion,
  nowMs: number,
  inputMode: InputMode,
): M03CycleResult {
  const s = states[occasion];
  const spec = M03_SPEC[occasion];
  const result = m03RunCycle(s, inputMode, sink(occasion));

  if (result !== 'run_complete') {
    return result;
  }

  const seed = seedContainerPositional(
    spec.containers.bench,
    m03BenchSeed().map((definitionId) =>
      definitionId === null ? null : { definitionId, quantity: 1 },
    ),
    SEED_TOOLS,
  );

  if (!seed.ok) {
    fail(occasion, nowMs, `tool seed failed: ${seed.reason ?? 'unknown'}`);

    return 'invalid';
  }

  const rack = getInventoryState().containers[spec.containers.rack];
  const reachability = m03Reachability(occasion, m03tPlacements(occasion), {
    capacity: rack?.capacity ?? 0,
    free_slots: rack?.slots.filter((slot) => slot === null).length ?? 0,
    accepts: Object.fromEntries(
      M03_TOOLS.map((tool) => [
        tool.definitionId,
        rack !== undefined && containerAccepts(rack, tool.definitionId),
      ]),
    ),
  });

  if (!m03ToolsOut(s, reachability, nowMs)) {
    sink(occasion)('technical_failure', {
      occasion_id: spec.tag,
      stage: 'reachability',
      reachability,
      detail: 'tool unreachable: see reachability',
      input_mode: 'system',
    });
    stopObserving(occasion);
    windows[occasion].technicalFailure(
      `tool unreachable: ${reachability
        .filter((row) => !row.reachable)
        .map((row) => row.object_id)
        .join(', ')}`,
    );

    return 'invalid';
  }

  windows[occasion].setComprehension('not_required');
  windows[occasion].open(nowMs, {
    ...m03EntrySnapshot(occasion),
    ...entryContext[occasion],
    reachability,
    practice_moves: s.practiceMoves,
    practice_input_mode: s.practiceInputMode,
    surface_opens_before_tools: s.surfaceOpens,
  });

  return result;
}

/**
 * Why the panel refuses to lift the object in this slot now (null = it
 * may be lifted). The roll is threaded once the first cycle ran.
 */
export function m03tPickupRefusal(
  occasion: M03Occasion,
  containerId: string,
  slotIndex: number,
): string | null {
  const stack =
    getInventoryState().containers[containerId]?.slots[slotIndex] ?? null;

  if (stack === null) {
    return null;
  }

  if (stack.definitionId === M03_ROLL_ID && m03RollLocked(states[occasion])) {
    return 'roll_threaded';
  }

  return null;
}

/** The panel refused a move (recorded; nothing changes). */
export function noteM03TMoveRefused(
  occasion: M03Occasion,
  containerId: string,
  slotIndex: number,
  reason: string,
  inputMode: InputMode,
) {
  const stack =
    getInventoryState().containers[containerId]?.slots[slotIndex] ?? null;

  m03MoveRefused(
    states[occasion],
    stack?.definitionId ?? null,
    reason,
    inputMode,
    sink(occasion),
  );
}

/** Closes the window after the tools' state was recorded. */
function closeWindow(
  occasion: M03Occasion,
  nowMs: number,
  inputMode: InputMode,
) {
  const s = states[occasion];
  const departure = s.departure;

  stopObserving(occasion);

  if (departure === null) {
    return;
  }

  if (departure.departed) {
    windows[occasion].complete(
      nowMs,
      m03RawComponents(s, 'completed'),
      inputMode,
    );

    return;
  }

  // Closed by the system: no departure occurred — the state as it stood
  // is kept as context, never a value. The review's closure is a
  // censoring one; a panel stopped any other way is a technical failure.
  if (departure.close_reason === 'closed_at_review') {
    windows[occasion].stop(
      nowMs,
      'closed_at_review',
      m03RawComponents(s, departure.close_reason),
      'system',
      'censored',
    );

    return;
  }

  windows[occasion].technicalFailure(
    'panel stopped by the system with the tools out: no departure',
  );
}

/**
 * The panel closed. With the tools out and closed by the PARTICIPANT this
 * is the FIRST DEPARTURE: the location of every tool is recorded once and
 * the window completes. Closed by the system (`inputMode: 'system'`) it
 * is not a departure. Before the tools lie out the activity is kept and
 * no observation is made.
 */
export function closeM03TPanel(
  occasion: M03Occasion,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const s = states[occasion];

  if (s.phase === 'tools_out') {
    const departure = m03Depart(
      s,
      m03tPlacements(occasion),
      nowMs,
      inputMode,
      sink(occasion),
    );

    if (departure === null) {
      return false;
    }

    closeWindow(occasion, nowMs, inputMode);

    return true;
  }

  return m03SurfaceClosed(s, inputMode, sink(occasion));
}

/** Never completed → absent (no tools lay out, so nothing was observed). */
export function closeM03TAtReview(nowMs: number) {
  for (const occasion of M03_OCCASIONS) {
    const s = states[occasion];
    const window = windows[occasion];

    if (window.windowStatus() === 'unopened') {
      window.markAbsent(
        s.phase === 'unopened'
          ? 'press panel never opened before the review'
          : 'press run never completed before the review',
      );
    } else if (window.isOpen()) {
      // Cannot arise on the route (the panel is modal and its close is the
      // departure); kept so an open window never survives the review.
      m03Depart(
        s,
        m03tPlacements(occasion),
        nowMs,
        'system',
        sink(occasion),
        'closed_at_review',
      );
      closeWindow(occasion, nowMs, 'system');
    }
  }
}

/** Test-only escape hatch. */
export function resetM03TState() {
  for (const occasion of M03_OCCASIONS) {
    stopObserving(occasion);
    m03Freeze(states[occasion], 0, 'reset');
    windows[occasion].reset();
    entryContext[occasion] = {};
  }

  states = { a: createM03State('a'), b: createM03State('b') };
  moveInputMode = 'system';
  presentedBy = { a: null, b: null };
}
