/**
 * M03 feature extractor (Unit 14): `m03_tools_restored` = tools in the
 * rack at the first departure, summed over the occasions that were
 * observed / 6 (three per occasion; a planned-observations denominator —
 * fewer than six ⇒ `incomplete`), plus `m03_object_states` (per occasion
 * and tool: location at the first departure, moves, exposure, the taught
 * movement). Read-only over the raw `proto_m03tools_*` events; the state
 * is RECOUNTED per occasion from the `tool_moved` events that lie between
 * the occasion's `opportunity_opened` and its `first_departure` and
 * compared with the recorded snapshot tool by tool. A completed occasion
 * is read only when its own `opportunity_opened` and `first_departure`
 * occur once each and in that order, when the tools that appeared and the
 * tools recorded are the three the occasion is defined with, and when
 * every recorded container is the one the raw moves lead to (U14-C);
 * anything else is a record that cannot be reproduced — a technical
 * failure, never a value. Every tool left where
 * it lay is an observed zero; an occasion whose tools could not be
 * reached, whose run was never completed, whose panel was closed by the
 * system, that was never opened or that was held back by a reload is
 * never a zero.
 */
import { M03_TOOLS } from '../../pilot/windows/m03RestoreModel';
import type { RawGameEvent } from '../../systems/EventLogger';
import { registerEntry } from '../registerV3';
import {
  absentFeature,
  currentLoadEvents,
  emptyFeature,
  eventsOfType,
  fractionFeature,
  meta,
  observedFeature,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureDisposition, FeatureRecord } from './types';

const FAMILY = 'proto_m03tools_';
const TOOLS_PER_OCCASION = 3;

type Occasion = 'o1' | 'o2';

const OCCASIONS: readonly Occasion[] = ['o1', 'o2'];
const WINDOW_ID: Record<Occasion, string> = {
  o1: 'm03_tools_o1',
  o2: 'm03_tools_o2',
};
const HOME: Record<Occasion, string> = {
  o1: 'm03t_rack_a',
  o2: 'm03t_rack_b',
};
/** Where the run leaves the tools: a tool that never moved lies here. */
const SURFACE: Record<Occasion, string> = {
  o1: 'm03t_bench_a',
  o2: 'm03t_bench_b',
};
/** The tools every occasion is DEFINED with. */
const EXPECTED_TOOLS: readonly string[] = M03_TOOLS.map(
  (tool) => tool.definitionId,
);

function sameIds(ids: readonly string[]): boolean {
  return (
    ids.length === EXPECTED_TOOLS.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => EXPECTED_TOOLS.includes(id))
  );
}

interface ToolRecord {
  object_id: string;
  location: string;
  container: string | null;
  slot_index: number | null;
  in_home: boolean;
  moves: number;
}

type Status =
  | 'observed'
  | 'mismatch'
  | 'technical'
  | 'interrupted'
  | 'censored'
  | 'pending'
  | 'unrun'
  | 'declined'
  | 'absent';

type Missing = Exclude<FeatureDisposition, 'observed' | 'incomplete'>;

function occasionOf(event: RawGameEvent): string | undefined {
  return meta<string>(event, 'occasion') ?? meta<string>(event, 'occasion_id');
}

registerFeatureExtractor('M03', (events, context) => {
  const entry = registerEntry('M03');
  const [primary, states] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) => e.event_type.startsWith(FAMILY));
  const supporting = sequencesOf(family);
  const of = (suffix: string, occasion: Occasion) =>
    eventsOfType(family, `${FAMILY}${suffix}`).filter(
      (event) => occasionOf(event) === occasion,
    );

  const perOccasion = OCCASIONS.map((occasion) => {
    const presentations = of('presented', occasion);
    const surfaces = of('surface_opened', occasion);
    const openings = of('opportunity_opened', occasion);
    const departures = of('first_departure', occasion);
    const presented = presentations.length > 0;
    const surfaced = surfaces.length > 0;
    const opened = openings[0] ?? null;
    const departure = departures[0] ?? null;
    const systemClose = of('state_at_system_close', occasion)[0] ?? null;
    const failures = of('technical_failure', occasion);
    const heldBack = failures.some((event) =>
      (meta<string>(event, 'detail') ?? '').startsWith('reload'),
    );
    const faulted = failures.some(
      (event) => !(meta<string>(event, 'detail') ?? '').startsWith('reload'),
    );
    const practice = of('practice_completed', occasion)[0] ?? null;
    const record = departure ?? systemClose;

    // Recount: the last container of every tool among the moves that lie
    // between the tools' appearance and the first departure; a tool that
    // never moved lies where the run left it (the work surface).
    const recorded = record ? (meta<ToolRecord[]>(record, 'tools') ?? []) : [];
    const openedSequence = opened?.sequence ?? Number.POSITIVE_INFINITY;
    const recordSequence = record?.sequence ?? Number.POSITIVE_INFINITY;
    const lastContainer = new Map<string, string>();
    const moveCounts = new Map<string, number>();
    let movesAgree = true;

    const moves = [...of('tool_moved', occasion)].sort(
      (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
    );

    for (const move of moves) {
      const objectId = meta<string>(move, 'object_id');
      const to = meta<string>(move, 'to_container');

      if (
        (move.sequence ?? 0) <= openedSequence ||
        (move.sequence ?? 0) >= recordSequence
      ) {
        continue;
      }

      // A move inside the window names one of the occasion's own tools
      // and one of its two trays.
      if (
        objectId === undefined ||
        to === undefined ||
        !EXPECTED_TOOLS.includes(objectId) ||
        (to !== HOME[occasion] && to !== SURFACE[occasion])
      ) {
        movesAgree = false;
        continue;
      }

      lastContainer.set(objectId, to);
      moveCounts.set(objectId, (moveCounts.get(objectId) ?? 0) + 1);
    }

    const movesInWindow = [...moveCounts.values()].reduce(
      (sum, count) => sum + count,
      0,
    );

    const appeared = opened
      ? ((meta<Record<string, unknown>>(opened, 'entry_state_snapshot') ?? {})
          .tools ?? null)
      : null;

    const recount = recorded.filter(
      (tool) => lastContainer.get(tool.object_id) === HOME[occasion],
    ).length;
    const recordedRestored = record
      ? (meta<number>(record, 'tools_restored') ?? null)
      : null;
    const agrees =
      record !== null &&
      opened !== null &&
      openings.length === 1 &&
      departures.length === 1 &&
      openedSequence < recordSequence &&
      movesAgree &&
      Array.isArray(appeared) &&
      sameIds(appeared as string[]) &&
      recorded.length === TOOLS_PER_OCCASION &&
      sameIds(recorded.map((tool) => tool.object_id)) &&
      recordedRestored === recount &&
      meta<number>(record, 'move_count') === movesInWindow &&
      recorded.every(
        (tool) =>
          tool.moves === (moveCounts.get(tool.object_id) ?? 0) &&
          tool.container ===
            (lastContainer.get(tool.object_id) ?? SURFACE[occasion]) &&
          tool.in_home ===
            (lastContainer.get(tool.object_id) === HOME[occasion]),
      );
    // Exposure order as the raw log holds it (U14-C): the presentation
    // and the first open of the panel, never inferred.
    const presentedSequence = presentations[0]?.sequence ?? null;
    const surfacedSequence = surfaces[0]?.sequence ?? null;

    const status: Status = heldBack
      ? 'interrupted'
      : faulted
        ? 'technical'
        : departure !== null
          ? agrees
            ? 'observed'
            : 'mismatch'
          : systemClose !== null
            ? 'censored'
            : opened !== null
              ? 'pending'
              : surfaced
                ? 'unrun'
                : presented
                  ? 'declined'
                  : context.reloaded
                    ? 'interrupted'
                    : 'absent';

    return {
      occasion,
      status,
      restored: status === 'observed' ? recount : null,
      state:
        status === 'absent'
          ? null
          : {
              occasion,
              status,
              tools: record ? recorded : null,
              tools_restored: departure ? recordedRestored : null,
              tools_restored_recount: departure ? recount : null,
              // A panel closed by the system: the state as it stood, kept
              // as context — no departure occurred.
              tools_in_home_at_system_close: systemClose
                ? recordedRestored
                : null,
              close_reason: record
                ? (meta<string>(record, 'close_reason') ?? null)
                : null,
              move_count: record
                ? (meta<number>(record, 'move_count') ?? null)
                : null,
              exposure_focused_ms: record
                ? (meta<number>(record, 'focused_ms') ?? null)
                : null,
              exposure_wall_ms: record
                ? (meta<number>(record, 'wall_ms') ?? null)
                : null,
              exposure_excluded_ms: record
                ? (meta<Record<string, number>>(record, 'excluded_ms') ?? null)
                : null,
              exposure_sufficient: record
                ? (meta<boolean>(record, 'exposure_sufficient') ?? null)
                : null,
              departure_input_mode: record
                ? (meta<string>(record, 'input_mode') ?? null)
                : null,
              reachability: opened
                ? ((
                    meta<Record<string, unknown>>(
                      opened,
                      'entry_state_snapshot',
                    ) ?? {}
                  ).reachability ?? null)
                : null,
              stage_at_open: opened
                ? ((
                    meta<Record<string, unknown>>(
                      opened,
                      'entry_state_snapshot',
                    ) ?? {}
                  ).stage ?? null)
                : null,
              presented_by: opened
                ? ((
                    meta<Record<string, unknown>>(
                      opened,
                      'entry_state_snapshot',
                    ) ?? {}
                  ).presented_by ?? null)
                : null,
              presented_before_panel_opened:
                presentedSequence === null || surfacedSequence === null
                  ? null
                  : presentedSequence < surfacedSequence,
              movement_taught: practice !== null,
              practice_moves: practice
                ? (meta<number>(practice, 'moves_needed') ?? null)
                : null,
              practice_input_mode: practice
                ? (meta<string>(practice, 'input_mode') ?? null)
                : null,
              press_cycles: of('press_cycle', occasion).length,
              surface_opens: of('surface_opened', occasion).length,
            },
    };
  });

  const by = (status: Status) =>
    perOccasion
      .filter((row) => row.status === status)
      .map((row) => row.occasion);
  const observed = perOccasion.filter((row) => row.status === 'observed');
  const statesValue = Object.fromEntries(
    perOccasion.map((row) => [row.occasion, row.state]),
  );
  const components = {
    occasions_observed: by('observed'),
    occasions_technically_invalid: by('technical'),
    occasions_interrupted: by('interrupted'),
    occasions_closed_by_system: by('censored'),
    occasions_pending: by('pending'),
    occasions_run_never_completed: by('unrun'),
    occasions_declined: by('declined'),
    restored_by_occasion: Object.fromEntries(
      perOccasion.map((row) => [row.occasion, row.restored]),
    ),
  };

  if (family.length === 0) {
    return [
      absentFeature('M03', primary, context, 'no press occasion presented'),
      absentFeature('M03', states, context, 'no press occasion presented'),
    ];
  }

  if (by('mismatch').length > 0) {
    // One disagreeing occasion voids the whole row: a record that cannot
    // be reproduced is not read beside one that can.
    const reason =
      'the recorded state at the first departure disagrees with the raw events';

    return [
      emptyFeature('M03', primary, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
        supporting_sequences: supporting,
        components: { ...components, occasions_disagreeing: by('mismatch') },
      }),
      observedFeature('M03', states, statesValue, {
        disposition: 'technical_failure',
        closure_reason: 'technical_failure',
        supporting_sequences: supporting,
      }),
    ];
  }

  if (by('pending').length > 0) {
    return [
      emptyFeature('M03', primary, 'pending', 'a press panel is still open', {
        supporting_sequences: supporting,
        components,
      }),
      observedFeature('M03', states, statesValue, {
        disposition: 'pending',
        supporting_sequences: supporting,
      }),
    ];
  }

  const interrupted = by('interrupted').length > 0;
  const systemClosed = by('censored').length > 0;
  const technical = by('technical').length > 0;
  const zero: { disposition: Missing; reason: string } = interrupted
    ? {
        disposition: 'interrupted',
        reason: 'a press occasion was held back after a reload',
      }
    : systemClosed
      ? {
          disposition: 'interrupted',
          reason:
            'every panel with its tools out was closed by the system before a departure occurred',
        }
      : technical
        ? {
            disposition: 'technical_failure',
            reason: 'the tools of every opened occasion could not be reached',
          }
        : by('unrun').length > 0
          ? {
              disposition: 'no_eligible_event',
              reason: 'no press run was completed, so no tool lay out',
            }
          : {
              disposition: 'declined',
              reason: 'press batches named on the route, never opened',
            };
  const numerator = observed.reduce((sum, row) => sum + (row.restored ?? 0), 0);
  const denominator = observed.length * TOOLS_PER_OCCASION;
  const censored = interrupted || systemClosed;
  const shared = {
    closure_reason:
      denominator > 0
        ? ('completed' as const)
        : systemClosed
          ? ('closed_at_review' as const)
          : technical && !interrupted
            ? ('technical_failure' as const)
            : null,
    censored,
    censor_reason: interrupted
      ? 'occasion held back after a reload'
      : systemClosed
        ? 'panel closed by the system before a departure'
        : null,
    supporting_sequences: supporting,
  };
  const row = fractionFeature(
    'M03',
    primary,
    numerator,
    denominator,
    observed.map((occasion) => WINDOW_ID[occasion.occasion]),
    supporting,
    zero,
    { ...shared, components },
  );
  // A held-back occasion beside an observed one: `interrupted` with the
  // value kept (review U3 S-F2 precedent), never a partial score.
  const primaryRow =
    interrupted && denominator > 0
      ? { ...row, disposition: 'interrupted' as const }
      : row;
  const described =
    denominator > 0 || by('unrun').length > 0 || technical || systemClosed;

  return [
    primaryRow,
    described
      ? observedFeature('M03', states, statesValue, {
          closure_reason: shared.closure_reason,
          censored,
          supporting_sequences: supporting,
        })
      : emptyFeature('M03', states, zero.disposition, zero.reason, {
          supporting_sequences: supporting,
        }),
  ] satisfies FeatureRecord[];
});
