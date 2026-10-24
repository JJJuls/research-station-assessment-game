/**
 * M23 feature extractor (Unit 23): `m23_continuations_after_failure`
 * (primary) = plots with another completed qualifying search act after
 * their first genuine failed dig, over the plots with a genuine failed dig
 * (planned denominator 2, `conditional_eligibility`), recounted read-only
 * from the `proto_m23_plots_` events of the current page load alone, under
 * research-owner decision D-U23-1 (16 October 2026, all nine rows approved):
 *
 * - the genuine failure of a plot (C) = the first completed `dig_resolved`
 *   with outcome `empty` in a new cell of that plot; a lucky first-dig
 *   recovery or a pre-failure selector stop is no post-failure observation;
 * - the response (D1 / D2): the first `failure_choice` (`continue` /
 *   `stop`); after CONTINUE the first completed qualifying act (a
 *   `scan_resolved` inside the plot's qualifying region, zero or unchanged
 *   readings included, or a `dig_resolved` in a new cell) is the credit (1);
 *   an explicit stop without a credit is 0; an informed participant-initiated
 *   shift-end (`plot_closed` `shift_end` with `participant_initiated`, a
 *   usable `failure_choice_presented` for the failure and an earlier
 *   `closure_explanation_presented`) without a credit is 0; a review, a
 *   reload, an uninformed or system shift-end and a never-presented choice
 *   leave the response UNKNOWN, never 0 (D2);
 * - a start after CONTINUE cancelled by `focus_loss` / `hidden` /
 *   `scene_shutdown` earns nothing and is the retained diagnostic
 *   `continuation_started_then_system_cancelled` (D3);
 * - E(c): every valid eligible plot is in the denominator; if ANY valid
 *   eligible response is unknown the value and the numerator are null
 *   (`interrupted`, censored, `eligible_response_unresolved`) with the known
 *   outcomes kept as components (`observed_count`, `denominator_resolved`,
 *   `known_outcomes_by_plot`); every eligible response resolved exports the
 *   COUNT 0–2 (one eligible plot is complete conditional evidence, never
 *   `incomplete`); a zero denominator is null (`no_eligible_event`, or
 *   `technical_failure` when only technically invalid evidence remains);
 *   the series still open is `pending` with its current denominator.
 *
 * Integrity: identity (S1: versions, opportunity id, the entry snapshot's
 * layout and keys), order (S2: usable, unique sequences) and a reload hold-
 * back are series-level; an impossible resolution (a resolution without its
 * start, a second terminal transition of one action, a resolution on a
 * terminal plot), a dig outcome contradicting the plot's key, a response
 * without a failure or a second response exclude the AFFECTED plot with the
 * exact reason (never a 0, never a silent repair); refusals never
 * invalidate; descriptive inconsistencies (a stored `credited` or
 * `first_failure` flag, a strength off the rule) set flags only. Snapshots
 * (`plot_closed`, `window_closed`) are compared with the recount and never
 * substitute for it. Read-only; the legacy family `proto_m23_field_recovery_*`
 * is never read; no total across items; no validity claim.
 *
 * Reload (U24 RL-3, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §3 and §4 G4):
 * the yard-entry guard's check is now logged as the provisional
 * `proto_m23_plots_prior_load_checked` record (stage 1 the yard briefing,
 * stage 2 `presented`, stage 3 `opportunity_opened`), which the extractor
 * reads: an established absence (A) reaches the first-load readings (the
 * existing `not_presented` branches) instead of the reload branch; a series
 * held as U or M reads `interrupted` with its class's reason, as H does with
 * the existing one. The record is never task evidence.
 */
import {
  isM23PlotId,
  M23_LAYOUT_ID,
  M23_PLOT_IDS,
  M23_PLOTS,
  m23Band,
  type M23Cell,
  m23CellCentre,
  m23CellInside,
  M23P_CONTENT_VERSION,
  M23P_ENTRY_STATE_VERSION,
  M23P_OPPORTUNITY_ID,
  type M23PlotId,
  m23Signal,
} from '../../pilot/windows/m23PlotsContent';
import type { RawGameEvent } from '../../systems/EventLogger';
import type { ClosureReason } from '../protocol';
import { registerEntry } from '../registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  PRIOR_LOAD_CHECK_SUFFIX,
  type PriorLoadCheck,
  type ReloadClassification,
  type ReloadEvent,
  type ReloadHistoryIntegrity,
  reloadHoldBackClass,
  ROW_OCCASION,
  withoutPriorLoadChecks,
} from '../reloadCheck';
import {
  absentFeature,
  emptyFeature,
  fractionFeature,
  meta,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureDisposition, FeatureRecord } from './types';

const FAMILY = 'proto_m23_plots_';
const SYSTEM_CANCEL = new Set(['focus_loss', 'hidden', 'scene_shutdown']);

/**
 * The load's reload check (U24 RL-3; r1 §1 stage map): stage 1 the yard
 * briefing (the route's advance to `exterior_work` — no M23 record), stage
 * 2 the stake brief's `presented`, stage 3 the measured `opportunity_opened`
 * (the existing F8 rule: a brief seen earlier is replayed), the series'
 * hold-back markers (`reload_blocked` and the kit's `technical_failure`).
 * Its head fields are those of the existing guard computation
 * (`m23PriorLoadCheck`); D-7 (i)'s carry-forward is added. Null on a first
 * load.
 */
export function m23PriorLoadRecord(
  pageLoadIndex: number,
  priorLoadEvents: readonly ReloadEvent[],
  integrity: ReloadHistoryIntegrity,
): PriorLoadCheck | null {
  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents,
    integrity,
    stages: {
      briefing: (event) =>
        event.event_type === 'pilot_stage_advanced' &&
        event.metadata?.to === 'exterior_work',
      presentation: (event) => event.event_type === `${FAMILY}presented`,
      opening: (event) => event.event_type === `${FAMILY}opportunity_opened`,
      holdBack: (event) =>
        event.event_type === `${FAMILY}reload_blocked` ||
        event.event_type === `${FAMILY}technical_failure`,
    },
  });
}

/** The series' class from the load's check records (r3 §2). */
export function classifyM23Reload(
  pageLoadIndex: number,
  checks: readonly object[],
): ReloadClassification {
  return classifyReload({ pageLoadIndex, checks });
}

/** The current-load reason of a held series, by its class. */
const HELD_REASON = {
  H: 'excavation selector measured in an earlier page load; not re-run after the reload',
  U: 'excavation not administered after a reload: earlier history not verified',
  M: 'excavation not administered after a reload: earlier check contradictory',
} as const;

type Outcome = 1 | 0 | null;

interface ActionRecord {
  id: string;
  plot_id: M23PlotId;
  kind: 'scan' | 'dig';
  started_sequence: number;
  started_at_ms: number | null;
  after_continue: boolean;
  cell: M23Cell | null;
  terminal: 'resolved' | 'cancelled' | null;
  terminal_sequence: number | null;
  outcome: 'empty' | 'recovered' | null;
  new_cell: boolean | null;
  qualifying: boolean | null;
  strength: number | null;
  target_distance_px: number | null;
  cancellation_reason: string | null;
  elapsed_action_ms: number | null;
  stored_credited: boolean | null;
}

interface PlotRecord {
  id: M23PlotId;
  form: string | null;
  key: M23Cell | null;
  opened: { sequence: number } | null;
  resumes: number;
  approaches: number;
  region_entries: number;
  actions: ActionRecord[];
  dug: { cell: M23Cell; sequence: number; outcome: string }[];
  first_failure: {
    action_id: string;
    sequence: number;
    at_ms: number | null;
    cell: M23Cell;
    player: { x: number; y: number } | null;
  } | null;
  presentations: {
    sequence: number;
    presentation_id: string | null;
    at_ms: number | null;
  }[];
  usable_presentation: boolean;
  response: {
    response: 'continue' | 'stop';
    source: string | null;
    sequence: number;
    at_ms: number | null;
    input_mode: string | null;
  } | null;
  responses: number;
  stop_requests: number;
  stop_cancellations: number;
  closure: {
    reason: string | null;
    sequence: number;
    participant_initiated: boolean | null;
    informed_snapshot: boolean | null;
    observed_snapshot: boolean | null;
    stopped_before_failure: boolean | null;
    confirmed_stop: boolean | null;
    source: string | null;
    shift_end_command_id: string | null;
  } | null;
  closures: number;
  fault: { sequence: number; detail: string | null } | null;
  refusals: number;
  pauses: number;
  invalid: string[];
}

interface Defect {
  rule: string;
  kind: string;
  sequence: number | null;
  plot_id: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function cellOrNull(value: unknown): M23Cell | null {
  if (
    isRecord(value) &&
    typeof value.col === 'number' &&
    typeof value.row === 'number'
  ) {
    return { col: value.col, row: value.row };
  }

  return null;
}

function sameCell(a: M23Cell | null, b: M23Cell | null): boolean {
  return a !== null && b !== null && a.col === b.col && a.row === b.row;
}

/** Ordering evidence: usable, distinct sequence numbers only. */
function orderDefect(events: readonly RawGameEvent[]): string | null {
  const numbers = events.map((event) => event.sequence);

  if (
    numbers.some(
      (value) =>
        typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1,
    )
  ) {
    return 'an event without a usable sequence number';
  }

  return new Set(numbers).size === numbers.length
    ? null
    : 'two events share a sequence number';
}

function plotRecord(id: M23PlotId): PlotRecord {
  return {
    id,
    form: null,
    key: null,
    opened: null,
    resumes: 0,
    approaches: 0,
    region_entries: 0,
    actions: [],
    dug: [],
    first_failure: null,
    presentations: [],
    usable_presentation: false,
    response: null,
    responses: 0,
    stop_requests: 0,
    stop_cancellations: 0,
    closure: null,
    closures: 0,
    fault: null,
    refusals: 0,
    pauses: 0,
    invalid: [],
  };
}

registerFeatureExtractor('M23', (events, context) => {
  const entry = registerEntry('M23');
  const spec = entry.features.find(
    (candidate) => candidate.feature_id === 'm23_continuations_after_failure',
  )!;
  // Identical duplicates (the same sequence, the same record) deduplicate;
  // two DIFFERENT records sharing a sequence are an order defect (S2).
  const seen = new Set<string>();
  const own = events.filter((event) => {
    if (
      !(
        event.page_load_index === undefined ||
        event.page_load_index === context.pageLoadIndex
      ) ||
      !event.event_type.startsWith(FAMILY)
    ) {
      return false;
    }

    const key = `${event.sequence}|${event.event_type}|${JSON.stringify(
      event.metadata ?? null,
    )}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
  // The check record is never task evidence (r3 §2).
  const family = withoutPriorLoadChecks(own, FAMILY);
  const reload = classifyM23Reload(
    context.pageLoadIndex,
    own
      .filter(
        (event) => event.event_type === `${FAMILY}${PRIOR_LOAD_CHECK_SUFFIX}`,
      )
      .map((event) => event.metadata ?? {}),
  );
  const cls = reload.occasions[ROW_OCCASION].class;
  const suffixOf = (event: RawGameEvent) =>
    event.event_type.slice(FAMILY.length);
  const supporting = sequencesOf(family);
  const seq = (event: RawGameEvent) =>
    typeof event.sequence === 'number' ? event.sequence : null;

  // ——— State ———
  let presented = false;
  let presentedSequence: number | null = null;
  let opened = false;
  let openedSequence: number | null = null;
  let snapshot: Record<string, unknown> | null = null;
  let explanationSequences: number[] = [];
  let exampleViews = { page_1: 0, page_2: 0 };
  let helpOpens = 0;
  let surfaceOpens = 0;
  let assignment: Record<string, unknown> = {};
  let seriesFault: { sequence: number; detail: string | null } | null = null;
  let windowClosed: {
    sequence: number;
    exit_state: string | null;
    raw: Record<string, unknown> | null;
  } | null = null;
  let windowClosedCount = 0;
  let reloadBlocked: Record<string, unknown> | null = null;
  const plots = new Map<M23PlotId, PlotRecord>(
    M23_PLOT_IDS.map((id) => [id, plotRecord(id)]),
  );
  const actionsById = new Map<string, ActionRecord>();
  const defects: Defect[] = [];
  const flags: string[] = [];
  const flag = (kind: string, event: RawGameEvent | null) => {
    const sequence = event === null ? null : seq(event);

    flags.push(sequence === null ? kind : `${kind} (sequence ${sequence})`);
  };
  const defect = (
    rule: string,
    kind: string,
    event: RawGameEvent | null,
    plotId: unknown = null,
  ) => {
    defects.push({
      rule,
      kind,
      sequence: event === null ? null : seq(event),
      plot_id: typeof plotId === 'string' ? plotId : null,
    });
  };
  /** A plot-scoped integrity conflict: the plot's evidence is excluded (never a 0). */
  const invalidate = (
    plot: PlotRecord,
    reason: string,
    event: RawGameEvent,
  ) => {
    const sequence = seq(event);

    plot.invalid.push(
      sequence === null ? reason : `${reason} (sequence ${sequence})`,
    );
  };

  const reloadCheck = () => ({
    page_reloaded: context.reloaded,
    reload_blocked: reloadBlocked !== null,
    prior_opening_found:
      reloadBlocked === null
        ? null
        : reloadBlocked.prior_opening_found === true,
    prior_opening_absence_established:
      snapshot !== null && isRecord(snapshot.prior_load_evidence)
        ? snapshot.prior_load_evidence.prior_opening_absence_established ===
          true
        : null,
  });

  // ——— The recount per plot ———
  const failureOf = (plot: PlotRecord) => plot.first_failure;
  const presentedOf = (plot: PlotRecord) => plot.usable_presentation;
  const creditOf = (plot: PlotRecord): ActionRecord | null => {
    const response = plot.response;

    if (response === null || response.response !== 'continue') {
      return null;
    }

    return (
      plot.actions.find(
        (action) =>
          action.terminal === 'resolved' &&
          action.started_sequence > response.sequence &&
          ((action.kind === 'scan' && action.qualifying === true) ||
            (action.kind === 'dig' && action.new_cell === true)),
      ) ?? null
    );
  };
  const systemCancelled = (plot: PlotRecord): ActionRecord[] =>
    plot.actions.filter(
      (action) =>
        action.terminal === 'cancelled' &&
        action.after_continue &&
        action.cancellation_reason !== null &&
        SYSTEM_CANCEL.has(action.cancellation_reason),
    );
  const informedShiftEnd = (plot: PlotRecord): boolean => {
    const closure = plot.closure;

    return (
      closure !== null &&
      closure.reason === 'shift_end' &&
      closure.participant_initiated === true &&
      presentedOf(plot) &&
      explanationSequences.some((sequence) => sequence < closure.sequence)
    );
  };
  /**
   * The outcome verified BEFORE a plot-scoped fault, if any: a credit
   * resolved or a stop response recorded earlier than the fault's record
   * keeps its 1 / 0 (contract E row, §6; fixtures T05 / T08 — a later
   * fault never erases a verified outcome).
   */
  const verifiedBeforeFault = (plot: PlotRecord): Outcome => {
    const fault = plot.fault;

    if (fault === null) {
      return null;
    }

    const credit = creditOf(plot);

    if (
      credit !== null &&
      credit.terminal_sequence !== null &&
      credit.terminal_sequence < fault.sequence
    ) {
      return 1;
    }

    if (
      plot.response?.response === 'stop' &&
      plot.response.sequence < fault.sequence
    ) {
      return 0;
    }

    return null;
  };
  const outcomeOf = (plot: PlotRecord): Outcome => {
    if (failureOf(plot) === null || plot.invalid.length > 0) {
      return null;
    }

    if (plot.fault !== null) {
      return verifiedBeforeFault(plot);
    }

    if (creditOf(plot) !== null) {
      return 1;
    }

    if (plot.response?.response === 'stop') {
      return 0;
    }

    if (
      plot.closure !== null &&
      plot.closure.reason === 'explicit_stop' &&
      presentedOf(plot)
    ) {
      // A confirmed selector stop after the usable choice was presented
      // (CONTINUE without a credit, or unanswered): the participant's own
      // stop. A stop of a failure whose choice was never presented stays
      // unknown (§5, D2).
      return 0;
    }

    if (informedShiftEnd(plot)) {
      return 0;
    }

    return null;
  };
  const eligible = (plot: PlotRecord) =>
    failureOf(plot) !== null &&
    plot.invalid.length === 0 &&
    (plot.fault === null || verifiedBeforeFault(plot) !== null);
  const excluded = (plot: PlotRecord) =>
    (plot.invalid.length > 0 ||
      (plot.fault !== null && verifiedBeforeFault(plot) === null)) &&
    (failureOf(plot) !== null || plot.opened !== null);

  const plotComponents = (plot: PlotRecord): Record<string, unknown> => {
    const failure = failureOf(plot);
    const credit = creditOf(plot);
    const cancelled = systemCancelled(plot);
    const target = plot.key === null ? null : m23CellCentre(plot.key);
    const lastScanBefore =
      failure === null
        ? null
        : (plot.actions
            .filter(
              (action) =>
                action.kind === 'scan' &&
                action.terminal === 'resolved' &&
                action.terminal_sequence !== null &&
                action.terminal_sequence < failure.sequence,
            )
            .pop() ?? null);

    return {
      plot_id: plot.id,
      occasion_id: plot.id,
      form: plot.form,
      opened: plot.opened !== null,
      opened_sequence: plot.opened?.sequence ?? null,
      resumes: plot.resumes,
      approaches: plot.approaches,
      region_entries: plot.region_entries,
      attempts: plot.actions.filter((action) => action.terminal === 'resolved')
        .length,
      scans: plot.actions.filter(
        (action) => action.kind === 'scan' && action.terminal === 'resolved',
      ).length,
      digs: plot.dug.length,
      cancelled: plot.actions.filter(
        (action) => action.terminal === 'cancelled',
      ).length,
      refusals: plot.refusals,
      pauses: plot.pauses,
      genuine_failure: failure !== null,
      failure_action_id: failure?.action_id ?? null,
      failure_sequence: failure?.sequence ?? null,
      failure_choice_presented: presentedOf(plot),
      presentations: plot.presentations.length,
      response: plot.response?.response ?? null,
      response_source: plot.response?.source ?? null,
      response_input_mode: plot.response?.input_mode ?? null,
      first_failure_to_choice_ms:
        failure?.at_ms != null && plot.response?.at_ms != null
          ? plot.response.at_ms - failure.at_ms
          : null,
      credited: credit !== null,
      credit_action_id: credit?.id ?? null,
      credit_kind: credit?.kind ?? null,
      outcome: outcomeOf(plot),
      eligible: eligible(plot),
      excluded: excluded(plot),
      invalid_reasons: [...plot.invalid],
      fault_detail: plot.fault?.detail ?? null,
      plot_closure_reason: plot.closure?.reason ?? null,
      stopped_before_failure:
        plot.closure?.reason === 'explicit_stop' && failure === null,
      recovered_without_failure:
        plot.closure?.reason === 'recovered' && failure === null,
      informed_shift_end:
        plot.closure?.reason === 'shift_end' ? informedShiftEnd(plot) : null,
      continuation_started_then_system_cancelled: cancelled.length > 0,
      system_cancelled_actions: cancelled.map((action) => ({
        action_id: action.id,
        kind: action.kind,
        cancellation_reason: action.cancellation_reason,
        elapsed_action_ms: action.elapsed_action_ms,
        started_at_ms: action.started_at_ms,
      })),
      // Research-only diagnostics (contract §5): never thresholds.
      first_failure_cell_target_distance_px:
        failure === null || target === null
          ? null
          : Math.round(
              Math.hypot(
                m23CellCentre(failure.cell).x - target.x,
                m23CellCentre(failure.cell).y - target.y,
              ) * 1000,
            ) / 1000,
      first_failure_player_target_distance_px:
        failure === null || target === null || failure.player === null
          ? null
          : Math.round(
              Math.hypot(
                failure.player.x - target.x,
                failure.player.y - target.y,
              ) * 1000,
            ) / 1000,
      last_scan_strength_before_failure: lastScanBefore?.strength ?? null,
      last_scan_action_id: lastScanBefore?.id ?? null,
    };
  };

  const components = (
    extra: Record<string, unknown> = {},
    invalid = false,
  ): Record<string, unknown> => {
    const list = [...plots.values()];
    const eligibleAll = list.filter((plot) => failureOf(plot) !== null);
    const valid = list.filter((plot) => eligible(plot));
    const known = valid.filter((plot) => outcomeOf(plot) !== null);
    const unknown = valid.filter((plot) => outcomeOf(plot) === null);

    return {
      administration_version: M23P_ENTRY_STATE_VERSION,
      content_version: M23P_CONTENT_VERSION,
      layout_id: M23_LAYOUT_ID,
      presented_in_current_load: presented,
      presented_sequence: presentedSequence,
      opened,
      opened_sequence: openedSequence,
      assignment: { ...assignment },
      example_views: { ...exampleViews },
      help_opens: helpOpens,
      surface_opens: surfaceOpens,
      closure_explanations_presented: explanationSequences.length,
      observations_share_one_episode: true,
      planned_denominator: 2,
      eligible_plots_total: eligibleAll.map((plot) => plot.id),
      included_ids: valid.map((plot) => plot.id),
      observed_count: invalid
        ? null
        : known.reduce((sum, plot) => sum + (outcomeOf(plot) ?? 0), 0),
      denominator_resolved: invalid ? null : known.length,
      known_outcomes_by_plot: invalid
        ? null
        : Object.fromEntries(known.map((plot) => [plot.id, outcomeOf(plot)])),
      resolved_eligible_ids: known.map((plot) => plot.id),
      unknown_eligible_ids: unknown.map((plot) => plot.id),
      // The technically EXCLUDED plots: an integrity defect, or a fault
      // while the outcome was still unknown (a fault after a verified 1 /
      // 0 keeps the plot; it is listed under `faulted_ids` instead).
      invalid_ids: list.filter((plot) => excluded(plot)).map((plot) => plot.id),
      faulted_ids: list
        .filter((plot) => plot.fault !== null)
        .map((plot) => plot.id),
      invalid_reasons: Object.fromEntries(
        list
          .filter((plot) => excluded(plot))
          .map((plot) => [
            plot.id,
            [
              ...plot.invalid,
              ...(plot.fault === null
                ? []
                : [`technical_failure: ${plot.fault.detail ?? 'fault'}`]),
            ],
          ]),
      ),
      unopened_ids: list
        .filter((plot) => plot.opened === null)
        .map((plot) => plot.id),
      recovered_without_failure_ids: list
        .filter(
          (plot) =>
            plot.closure?.reason === 'recovered' && failureOf(plot) === null,
        )
        .map((plot) => plot.id),
      stopped_before_failure_ids: list
        .filter(
          (plot) =>
            plot.closure?.reason === 'explicit_stop' &&
            failureOf(plot) === null,
        )
        .map((plot) => plot.id),
      searched_no_failure_ids: list
        .filter(
          (plot) =>
            plot.opened !== null &&
            failureOf(plot) === null &&
            plot.closure?.reason !== 'recovered' &&
            plot.closure?.reason !== 'explicit_stop',
        )
        .map((plot) => plot.id),
      failure_choice_unpresented_ids: eligibleAll
        .filter((plot) => !presentedOf(plot))
        .map((plot) => plot.id),
      shift_end_unresolved_ids: valid
        .filter(
          (plot) =>
            plot.closure?.reason === 'shift_end' && outcomeOf(plot) === null,
        )
        .map((plot) => plot.id),
      // An explicit stop of a failure whose choice was never presented:
      // eligible, unknown (§5, D2), never a 0.
      stopped_unpresented_ids: valid
        .filter(
          (plot) =>
            plot.closure?.reason === 'explicit_stop' &&
            failureOf(plot) !== null &&
            !presentedOf(plot),
        )
        .map((plot) => plot.id),
      shift_end_resolved_zero_ids: valid
        .filter(
          (plot) =>
            plot.closure?.reason === 'shift_end' &&
            outcomeOf(plot) === 0 &&
            plot.response?.response !== 'stop',
        )
        .map((plot) => plot.id),
      continuation_started_then_system_cancelled_ids: list
        .filter((plot) => systemCancelled(plot).length > 0)
        .map((plot) => plot.id),
      plots: list.map((plot) => plotComponents(plot)),
      series_fault: seriesFault,
      window_closed:
        windowClosed === null
          ? null
          : {
              sequence: windowClosed.sequence,
              exit_state: windowClosed.exit_state,
            },
      reload_check: reloadCheck(),
      flags: [...flags],
      ...extra,
    };
  };

  const empty = (
    disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>,
    reason: string,
    extra: Partial<FeatureRecord> = {},
  ): FeatureRecord[] => [
    // A row without a resolved count carries the conditional denominator
    // it established: zero eligible plots (fixtures O16, O17, R02, R03).
    emptyFeature('M23', spec, disposition, reason, {
      supporting_sequences: supporting,
      numerator: null,
      denominator: 0,
      components: components(),
      ...extra,
    }),
  ];

  // A malformed check record stays under the existing rule (r3 §2;
  // §5.290 (a)): a technical failure, never uncertain history.
  if (reload.check_malformed) {
    return empty(
      'technical_failure',
      'a reload check record describes another page load',
    );
  }

  if (family.length === 0) {
    // An established absence takes the first-load reading (r3 §5); a check
    // that does not establish it holds the series (U24 RL-3).
    if (cls === 'A') {
      return empty('not_presented', 'excavation field never presented');
    }

    if (reload.page_reloaded && reload.check_count > 0 && cls !== null) {
      return empty('interrupted', HELD_REASON[cls], {
        closure_reason: 'session_end',
      });
    }

    return [
      absentFeature('M23', spec, context, 'excavation field never presented', {
        supporting_sequences: supporting,
        numerator: null,
        denominator: 0,
        components: components(),
      }),
    ];
  }

  // ——— The reload hold-back of this load ———
  const heldBack =
    family.some((event) => suffixOf(event) === 'reload_blocked') &&
    !family.some((event) => suffixOf(event) === 'opportunity_opened');

  for (const event of family) {
    if (suffixOf(event) === 'presented') {
      presented = true;
      presentedSequence ??= event.sequence ?? null;
    }

    if (suffixOf(event) === 'reload_blocked') {
      reloadBlocked = event.metadata ?? {};
    }
  }

  if (heldBack) {
    // The marker's detail names the class (U24 RL-3); the existing H detail
    // ("reload after measured opening") carries none and keeps its reason.
    const marked = reloadHoldBackClass(reloadBlocked?.detail);

    return empty(
      'interrupted',
      HELD_REASON[marked === 'U' || marked === 'M' ? marked : 'H'],
      {
        closure_reason: 'session_end',
        components: components({ held_back_after_reload: true }),
      },
    );
  }

  const openedNow = family.some(
    (event) => suffixOf(event) === 'opportunity_opened',
  );

  // After a reload, an unopened series whose class is not A is held (U24
  // RL-3): with a check always; without one once its brief was presented in
  // this load (U, RL-1C decision A).
  if (
    reload.page_reloaded &&
    cls !== 'A' &&
    !openedNow &&
    (reload.check_count > 0 || presented)
  ) {
    return empty('interrupted', HELD_REASON[cls ?? 'U'], {
      closure_reason: 'session_end',
    });
  }

  // `absentFeature`'s reload reading only without an established check (r3
  // §5): under A the first-load branches below apply.
  if (context.reloaded && cls !== 'A' && !openedNow && !presented) {
    return empty(
      'interrupted',
      'no current-load excavation evidence after a reload: neither presented nor opened in this page load',
    );
  }

  // Everything below compares positions.
  const order = orderDefect(family);

  if (order !== null) {
    return empty('technical_failure', `integrity defect: ${order}`, {
      closure_reason: 'technical_failure',
      components: components(
        {
          integrity_defect: [
            { rule: 'S2', kind: order, sequence: null, plot_id: null },
          ],
        },
        true,
      ),
    });
  }

  const ordered = family
    .slice()
    .sort((a, b) => (a.sequence as number) - (b.sequence as number));

  /** S1: the entry snapshot's declarations against the approved administration. */
  const validateSnapshot = (value: unknown, event: RawGameEvent) => {
    if (!isRecord(value)) {
      defect('S1', 'the entry snapshot is not a record', event);

      return;
    }

    snapshot = value;

    if (value.layout_id !== M23_LAYOUT_ID) {
      defect(
        'S1',
        "the entry snapshot's layout is not the approved layout",
        event,
      );
    }

    if (value.content_version !== M23P_CONTENT_VERSION) {
      defect('S1', "the entry snapshot's content version is unknown", event);
    }

    if (value.plots_planned !== 2) {
      defect('S1', "the entry snapshot's planned plot count is not 2", event);
    }

    if (value.scanner_display_mode !== 'numeric') {
      defect('S1', "the entry snapshot's scanner mode is not numeric", event);
    }

    const list = value.plots;

    if (!Array.isArray(list) || list.length !== 2) {
      defect('S1', 'the entry snapshot carries no two-plot list', event);

      return;
    }

    for (const def of M23_PLOTS) {
      const item = (list as unknown[]).find(
        (candidate) => isRecord(candidate) && candidate.plot_id === def.id,
      );
      const plot = plots.get(def.id)!;

      if (!isRecord(item)) {
        defect('S1', `the entry snapshot lacks ${def.id}`, event, def.id);
        continue;
      }

      const bounds = item.bounds;
      const key = cellOrNull(item.key_cell);
      const form = stringOrNull(item.form);

      if (
        !isRecord(bounds) ||
        bounds.minCol !== def.bounds.minCol ||
        bounds.maxCol !== def.bounds.maxCol ||
        bounds.minRow !== def.bounds.minRow ||
        bounds.maxRow !== def.bounds.maxRow
      ) {
        defect(
          'S1',
          `${def.id}'s bounds disagree with the layout`,
          event,
          def.id,
        );
      }

      if (
        key === null ||
        form === null ||
        !(form in def.keys) ||
        def.keys[form as keyof typeof def.keys] === undefined ||
        !sameCell(key, def.keys[form as keyof typeof def.keys] ?? null)
      ) {
        defect('S1', `${def.id}'s key disagrees with its form`, event, def.id);
      }

      plot.form = form;
      plot.key = key;
    }

    assignment = {
      plot_order: value.assigned_plot_order ?? null,
      failure_option_order: value.failure_option_order ?? null,
      forms: isRecord(value.forms) ? { ...value.forms } : null,
    };
  };

  // ——— The walk ———
  for (const event of ordered) {
    const suffix = suffixOf(event);
    const sequence = event.sequence as number;

    if (
      meta<unknown>(event, 'entry_state_version') !== M23P_ENTRY_STATE_VERSION
    ) {
      defect('S1', 'an event of the family carries an unknown version', event);
      continue;
    }

    if (meta<unknown>(event, 'opportunity_id') !== M23P_OPPORTUNITY_ID) {
      defect(
        'S1',
        'an event of the family carries another opportunity id',
        event,
      );
      continue;
    }

    const plotId = meta<unknown>(event, 'plot_id');
    const plot = isM23PlotId(plotId) ? plots.get(plotId)! : null;

    if (plotId !== undefined && plotId !== null && plot === null) {
      defect('S3', `a ${suffix} record names an unknown plot`, event, plotId);
      continue;
    }

    switch (suffix) {
      case 'presented':
      case 'reload_blocked':
      case 'invalidated':
        break;
      case 'opportunity_opened': {
        if (opened) {
          defect('S3', 'the series was opened twice', event);
          break;
        }

        opened = true;
        openedSequence = sequence;
        validateSnapshot(meta<unknown>(event, 'entry_state_snapshot'), event);
        break;
      }
      case 'example_viewed': {
        const page = meta<unknown>(event, 'page');

        if (page === 1) {
          exampleViews = { ...exampleViews, page_1: exampleViews.page_1 + 1 };
        } else if (page === 2) {
          exampleViews = { ...exampleViews, page_2: exampleViews.page_2 + 1 };
        } else {
          flag('an example view without a known page', event);
        }

        break;
      }
      case 'closure_explanation_presented':
        if (meta<unknown>(event, 'usable') === true) {
          explanationSequences = [...explanationSequences, sequence];
        } else {
          flag('a closure explanation recorded without usability', event);
        }

        break;
      case 'surface_opened':
        surfaceOpens += 1;
        break;
      case 'surface_closed':
      case 'help_closed':
      case 'resumed':
        if (suffix === 'resumed' && plot !== null) {
          plot.resumes += 1;
        }

        break;
      case 'help_opened':
        helpOpens += 1;
        break;
      case 'plot_opened': {
        if (plot === null) {
          defect('S3', 'a plot opening names no plot', event, plotId);
          break;
        }

        if (!opened) {
          defect('S3', 'a plot opened before the series', event, plotId);
        }

        if (plot.opened !== null) {
          defect('S3', 'a plot was opened twice', event, plotId);
          break;
        }

        plot.opened = { sequence };
        plot.approaches += 1;
        break;
      }
      case 'approach_ended':
        break;
      case 'search_region_entered':
        if (plot !== null) {
          plot.region_entries += 1;
        }

        break;
      case 'paused':
        if (plot !== null) {
          plot.pauses += 1;
        }

        break;
      case 'action_refused':
        // A refusal never starts, resolves, credits or invalidates anything.
        if (plot !== null) {
          plot.refusals += 1;
        }

        break;
      case 'action_started': {
        const id = stringOrNull(meta<unknown>(event, 'action_id'));
        const kind = meta<unknown>(event, 'kind');

        if (
          plot === null ||
          id === null ||
          (kind !== 'scan' && kind !== 'dig')
        ) {
          defect(
            'S4',
            'an action start without a plot, an id or a kind',
            event,
            plotId,
          );
          break;
        }

        if (actionsById.has(id)) {
          invalidate(plot, `action ${id} started twice`, event);
          break;
        }

        if (plot.closure !== null) {
          invalidate(plot, `action ${id} started on a closed plot`, event);
        }

        const record: ActionRecord = {
          id,
          plot_id: plot.id,
          kind,
          started_sequence: sequence,
          started_at_ms: numberOrNull(meta<unknown>(event, 'started_at_ms')),
          after_continue: meta<unknown>(event, 'after_continue') === true,
          cell: cellOrNull(meta<unknown>(event, 'selected_cell')),
          terminal: null,
          terminal_sequence: null,
          outcome: null,
          new_cell: null,
          qualifying: null,
          strength: null,
          target_distance_px: null,
          cancellation_reason: null,
          elapsed_action_ms: null,
          stored_credited: null,
        };

        if (
          record.after_continue !==
          (plot.response?.response === 'continue')
        ) {
          flag(
            "an action start's after_continue flag disagrees with the recount",
            event,
          );
          record.after_continue = plot.response?.response === 'continue';
        }

        actionsById.set(id, record);
        plot.actions.push(record);
        break;
      }
      case 'scan_resolved':
      case 'dig_resolved':
      case 'action_cancelled': {
        const id = stringOrNull(meta<unknown>(event, 'action_id'));
        const record = id === null ? undefined : actionsById.get(id);

        if (plot === null || record === undefined) {
          if (plot !== null) {
            invalidate(
              plot,
              `${suffix} without its action start (missing link)`,
              event,
            );
          } else {
            defect('S4', `a ${suffix} record names no plot`, event, plotId);
          }

          break;
        }

        if (record.plot_id !== plot.id) {
          invalidate(plot, `${suffix} names another plot's action`, event);
          break;
        }

        if (record.terminal !== null) {
          // A second terminal transition of one action (the resolve / cancel race): the
          // first committed transition stands; the second is an impossible resolution.
          invalidate(
            plot,
            `action ${record.id} resolved or cancelled twice`,
            event,
          );
          break;
        }

        if (suffix === 'action_cancelled') {
          record.terminal = 'cancelled';
          record.terminal_sequence = sequence;
          record.cancellation_reason = stringOrNull(
            meta<unknown>(event, 'cancellation_reason'),
          );
          record.elapsed_action_ms = numberOrNull(
            meta<unknown>(event, 'elapsed_action_ms'),
          );
          break;
        }

        if (plot.closure !== null && plot.closure.sequence < sequence) {
          invalidate(
            plot,
            `${suffix} after the plot closed (impossible resolution)`,
            event,
          );
          break;
        }

        if (
          (suffix === 'scan_resolved' && record.kind !== 'scan') ||
          (suffix === 'dig_resolved' && record.kind !== 'dig')
        ) {
          invalidate(plot, `${suffix} on a ${record.kind} action`, event);
          break;
        }

        record.terminal = 'resolved';
        record.terminal_sequence = sequence;
        record.stored_credited = booleanOrNull(
          meta<unknown>(event, 'credited'),
        );

        if (suffix === 'scan_resolved') {
          record.qualifying = booleanOrNull(
            meta<unknown>(event, 'qualifying_continuation'),
          );
          record.strength = numberOrNull(meta<unknown>(event, 'strength'));
          record.target_distance_px = numberOrNull(
            meta<unknown>(event, 'target_distance_px'),
          );

          if (
            record.strength !== null &&
            record.target_distance_px !== null &&
            (record.strength !== m23Signal(record.target_distance_px) ||
              meta<unknown>(event, 'band') !== m23Band(record.strength))
          ) {
            flag(
              "a scan's stored strength or band is off the signal rule",
              event,
            );
          }

          break;
        }

        const cell = cellOrNull(meta<unknown>(event, 'cell')) ?? record.cell;
        const outcome = meta<unknown>(event, 'outcome');

        if (cell === null || (outcome !== 'empty' && outcome !== 'recovered')) {
          invalidate(
            plot,
            'a dig resolution without a cell or an outcome',
            event,
          );
          break;
        }

        const def = M23_PLOTS.find((candidate) => candidate.id === plot.id)!;

        if (!m23CellInside(def.bounds, cell)) {
          invalidate(plot, 'a dig resolved outside the plot', event);
          break;
        }

        const duplicate = plot.dug.some((entry) => sameCell(entry.cell, cell));
        const storedNew = meta<unknown>(event, 'new_cell');

        if (storedNew !== !duplicate) {
          flag("a dig's new_cell flag disagrees with the recount", event);
        }

        if (plot.key !== null) {
          const expected = sameCell(cell, plot.key) ? 'recovered' : 'empty';

          if (outcome !== expected) {
            invalidate(
              plot,
              `a dig outcome contradicts the plot's key (${outcome} at ${cell.col}:${cell.row})`,
              event,
            );
            break;
          }
        }

        record.outcome = outcome;
        record.new_cell = !duplicate;

        if (!duplicate) {
          plot.dug.push({ cell, sequence, outcome });
        }

        const firstFailure =
          !duplicate && outcome === 'empty' && plot.first_failure === null;

        if (meta<unknown>(event, 'first_failure') !== firstFailure) {
          flag("a dig's first_failure flag disagrees with the recount", event);
        }

        if (firstFailure) {
          const player =
            numberOrNull(meta<unknown>(event, 'player_x')) !== null &&
            numberOrNull(meta<unknown>(event, 'player_y')) !== null
              ? {
                  x: meta<number>(event, 'player_x')!,
                  y: meta<number>(event, 'player_y')!,
                }
              : null;

          plot.first_failure = {
            action_id: record.id,
            sequence,
            at_ms: numberOrNull(meta<unknown>(event, 'resolved_at_ms')),
            cell,
            player,
          };
        }

        break;
      }
      case 'failure_choice_presented': {
        if (plot === null) {
          defect('S5', 'a presentation names no plot', event, plotId);
          break;
        }

        const failure = plot.first_failure;
        const failureId = meta<unknown>(event, 'failure_action_id');

        if (failure === null || failureId !== failure.action_id) {
          invalidate(
            plot,
            "a presentation without (or not of) the plot's first failure",
            event,
          );
          break;
        }

        plot.presentations.push({
          sequence,
          presentation_id: stringOrNull(
            meta<unknown>(event, 'presentation_id'),
          ),
          at_ms: numberOrNull(meta<unknown>(event, 'presented_at_ms')),
        });

        if (
          meta<unknown>(event, 'visible') === true &&
          meta<unknown>(event, 'focused') === true &&
          meta<unknown>(event, 'operable') === true
        ) {
          plot.usable_presentation = true;
        } else {
          flag('a presentation recorded without usability', event);
        }

        break;
      }
      case 'failure_choice': {
        if (plot === null) {
          defect('S5', 'a response names no plot', event, plotId);
          break;
        }

        const response = meta<unknown>(event, 'response');
        const failure = plot.first_failure;

        plot.responses += 1;

        if (failure === null) {
          invalidate(plot, 'a response without a genuine failure', event);
          break;
        }

        if (meta<unknown>(event, 'failure_action_id') !== failure.action_id) {
          invalidate(plot, "a response not of the plot's first failure", event);
          break;
        }

        if (!plot.usable_presentation) {
          invalidate(plot, 'a response without a usable presentation', event);
          break;
        }

        if (plot.response !== null) {
          invalidate(plot, 'a second response for one failure', event);
          break;
        }

        if (response !== 'continue' && response !== 'stop') {
          invalidate(plot, 'a response without a known value', event);
          break;
        }

        plot.response = {
          response,
          source: stringOrNull(meta<unknown>(event, 'source')),
          sequence,
          at_ms: numberOrNull(meta<unknown>(event, 'chosen_at_ms')),
          input_mode: stringOrNull(meta<unknown>(event, 'input_mode')),
        };
        break;
      }
      case 'stop_requested':
        if (plot !== null) {
          plot.stop_requests += 1;
        }

        break;
      case 'stop_cancelled':
        if (plot !== null) {
          plot.stop_cancellations += 1;
        }

        break;
      case 'plot_closed': {
        if (plot === null) {
          defect('S6', 'a plot closure names no plot', event, plotId);
          break;
        }

        plot.closures += 1;

        if (plot.closure !== null) {
          invalidate(plot, 'a plot closed twice', event);
          break;
        }

        const reason = stringOrNull(
          meta<unknown>(event, 'plot_closure_reason'),
        );

        if (
          reason === null ||
          ![
            'recovered',
            'explicit_stop',
            'shift_end',
            'review',
            'technical_failure',
            'reload',
          ].includes(reason)
        ) {
          invalidate(plot, 'a plot closure without a known reason', event);
          break;
        }

        if (
          reason === 'explicit_stop' &&
          plot.first_failure !== null &&
          plot.response === null &&
          presentedOf(plot)
        ) {
          // A direct first-failure STOP writes its response in the same
          // transition; a confirmed selector stop after the usable choice
          // records the single stop. A stop of a failure whose choice was
          // never presented carries no response by rule (§5): eligible,
          // unknown, never a defect.
          invalidate(
            plot,
            'an explicit stop of a failed plot without its response',
            event,
          );
        }

        plot.closure = {
          reason,
          sequence,
          participant_initiated: booleanOrNull(
            meta<unknown>(event, 'participant_initiated'),
          ),
          informed_snapshot: booleanOrNull(
            meta<unknown>(event, 'informed_shift_end'),
          ),
          observed_snapshot: booleanOrNull(
            meta<unknown>(event, 'observed_continuation'),
          ),
          stopped_before_failure: booleanOrNull(
            meta<unknown>(event, 'stopped_before_failure'),
          ),
          confirmed_stop: booleanOrNull(meta<unknown>(event, 'confirmed_stop')),
          source: stringOrNull(meta<unknown>(event, 'source')),
          shift_end_command_id: stringOrNull(
            meta<unknown>(event, 'shift_end_command_id'),
          ),
        };

        if (reason === 'technical_failure') {
          plot.fault = {
            sequence,
            detail: stringOrNull(meta<unknown>(event, 'fault_detail')),
          };
        }

        break;
      }
      case 'technical_failure': {
        const scope = meta<unknown>(event, 'scope');
        const detail = stringOrNull(meta<unknown>(event, 'detail'));

        if (scope === 'plot' && plot !== null) {
          plot.fault ??= { sequence, detail };
        } else if (scope === 'after_closure') {
          flag('a fault record after the closure', event);
        } else if (String(detail ?? '').startsWith('reload')) {
          reloadBlocked ??= event.metadata ?? {};
        } else {
          seriesFault ??= { sequence, detail };
        }

        break;
      }
      case 'window_closed': {
        windowClosedCount += 1;

        if (windowClosedCount > 1) {
          defect('S6', 'the window closed twice', event);
          break;
        }

        const raw =
          meta<unknown>(event, 'raw_components') ??
          meta<unknown>(event, 'raw_components_partial');

        windowClosed = {
          sequence,
          exit_state: stringOrNull(meta<unknown>(event, 'exit_state')),
          raw: isRecord(raw) ? raw : null,
        };
        break;
      }
      default:
        flag(`an unknown record of the family: ${suffix}`, event);
        break;
    }
  }

  // ——— Post-walk integrity ———
  for (const plot of plots.values()) {
    for (const action of plot.actions) {
      if (action.terminal === 'resolved') {
        const recount = creditOf(plot)?.id === action.id;

        if (
          action.stored_credited !== null &&
          action.stored_credited !== recount
        ) {
          flag(
            `an action's stored credited flag disagrees with the recount (${action.id})`,
            null,
          );
        }
      }
    }

    if (plot.closure !== null) {
      const recount = outcomeOf(plot);
      const recountFlag = recount === null ? null : recount === 1;

      if (
        plot.invalid.length === 0 &&
        plot.fault === null &&
        plot.closure.observed_snapshot !== recountFlag
      ) {
        flag(
          `a plot closure's observed_continuation disagrees with the recount (${plot.id})`,
          null,
        );
      }
    }
  }

  if (windowClosed !== null && windowClosed.raw !== null) {
    const list = windowClosed.raw.plots;

    if (Array.isArray(list)) {
      for (const plot of plots.values()) {
        const item = (list as unknown[]).find(
          (candidate) => isRecord(candidate) && candidate.plot_id === plot.id,
        );
        const recount = outcomeOf(plot);
        const recountFlag = recount === null ? null : recount === 1;

        if (
          isRecord(item) &&
          plot.invalid.length === 0 &&
          plot.fault === null &&
          item.observed_continuation !== recountFlag
        ) {
          flag(
            `the closure snapshot's observed_continuation of ${plot.id} disagrees with the recount`,
            null,
          );
        }
      }
    }
  }

  // ——— The row ———
  if (defects.length > 0) {
    return empty('technical_failure', `integrity defect: ${defects[0].kind}`, {
      closure_reason: 'technical_failure',
      components: components(
        { integrity_defect: defects.map((item) => ({ ...item })) },
        true,
      ),
    });
  }

  const list = [...plots.values()];
  const anyPlotClosed = list.some((plot) => plot.closure !== null);
  const allTerminal = list.every((plot) => plot.closure !== null);
  const seriesClosed =
    windowClosed !== null || seriesFault !== null || allTerminal;

  if (!opened) {
    if (
      windowClosed !== null &&
      windowClosed.exit_state === 'closed_at_review'
    ) {
      return empty(
        'not_presented',
        presented ? 'presented_not_opened' : 'not_presented',
        { closure_reason: 'closed_at_review' },
      );
    }

    if (!presented) {
      return empty(
        'not_presented',
        'excavation field never presented and never opened',
      );
    }

    return empty('pending', 'presented_not_opened');
  }

  // The closure trigger from the evidence (never from a snapshot alone).
  const trigger: string | null =
    seriesFault !== null
      ? 'whole_series_fault'
      : list.some((plot) => plot.closure?.reason === 'shift_end')
        ? 'shift_end'
        : list.some((plot) => plot.closure?.reason === 'review')
          ? 'review'
          : list.some((plot) => plot.closure?.reason === 'reload')
            ? 'reload'
            : allTerminal
              ? 'both_plots_terminal'
              : null;
  const valid = list.filter((plot) => eligible(plot));
  // Contract §6: both_plots_terminal → voluntary_stop if any explicit stop,
  // otherwise completed; technical_failure only when the evidence is WHOLLY
  // invalid (round 3, amendment §3.7: two plots that faulted after verified
  // outcomes are complete, not a technical failure).
  const closureReason: ClosureReason | null =
    trigger === null
      ? null
      : trigger === 'whole_series_fault'
        ? 'technical_failure'
        : trigger === 'shift_end' || trigger === 'reload'
          ? 'session_end'
          : trigger === 'review'
            ? 'closed_at_review'
            : list.every((plot) => plot.fault !== null) && valid.length === 0
              ? 'technical_failure'
              : list.some((plot) => plot.closure?.reason === 'explicit_stop')
                ? 'voluntary_stop'
                : 'completed';
  const denominator = valid.length;
  const unknown = valid.filter((plot) => outcomeOf(plot) === null);
  const numerator = valid.reduce(
    (sum, plot) => sum + (outcomeOf(plot) ?? 0),
    0,
  );
  const anyExcluded = list.some((plot) => excluded(plot));

  if (!seriesClosed) {
    void anyPlotClosed;

    return empty('pending', 'excavation series open', {
      numerator: null,
      denominator,
      included_ids: valid.map((plot) => plot.id),
      components: components({ series_closure_trigger: null }),
    });
  }

  if (denominator === 0) {
    if (anyExcluded || seriesFault !== null) {
      return empty(
        'technical_failure',
        'only technically invalid relevant evidence',
        {
          closure_reason: 'technical_failure',
          numerator: null,
          denominator: 0,
          censored: true,
          censor_reason: 'technical exclusion of every failed plot',
          components: components({ series_closure_trigger: trigger }),
        },
      );
    }

    const recovered = list.filter(
      (plot) =>
        plot.closure?.reason === 'recovered' && failureOf(plot) === null,
    ).length;
    const stopped = list.filter(
      (plot) =>
        plot.closure?.reason === 'explicit_stop' && failureOf(plot) === null,
    ).length;
    const reason =
      recovered === 2
        ? 'recovered_without_failure'
        : stopped === 2
          ? 'stopped_before_failure'
          : recovered + stopped === 2
            ? 'mixed_no_eligible_event'
            : 'no_failed_dig';

    return empty('no_eligible_event', reason, {
      closure_reason: closureReason,
      numerator: null,
      denominator: 0,
      components: components({ series_closure_trigger: trigger }),
    });
  }

  if (unknown.length > 0) {
    return empty('interrupted', 'eligible_response_unresolved', {
      closure_reason: closureReason,
      numerator: null,
      denominator,
      included_ids: valid.map((plot) => plot.id),
      censored: true,
      censor_reason: `eligible response unresolved on ${unknown
        .map((plot) => plot.id)
        .join(', ')}`,
      components: components({ series_closure_trigger: trigger }),
    });
  }

  return [
    fractionFeature(
      'M23',
      spec,
      numerator,
      denominator,
      valid.map((plot) => plot.id),
      supporting,
      { disposition: 'no_eligible_event', reason: 'no_failed_dig' },
      {
        closure_reason: closureReason,
        censored: anyExcluded,
        censor_reason: anyExcluded
          ? `technical exclusion of ${list
              .filter((plot) => excluded(plot))
              .map((plot) => plot.id)
              .join(', ')}`
          : null,
        components: components({ series_closure_trigger: trigger }),
      },
    ),
  ];
});
