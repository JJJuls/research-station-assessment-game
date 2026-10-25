/**
 * M20 feature extractor (Unit 22): `m20_cued_resumptions` (primary,
 * `exploratory`) = cued-eligible channels with a cued credit, over the
 * cued-eligible channels, planned denominator 2, recounted read-only from
 * the `proto_m20_feed_` events of the current page load alone. Per channel
 * (research-owner decision D-U22-1 of 14 October 2026, as selected): released
 * = `channel_released`; the spontaneous resumption = the first executed
 * `align_attempt` with a sequence after the release and before the
 * channel's `cue_presented` (or with no notice) — the channel is EXCLUDED from
 * the cued denominator and counted in `spontaneous_resumptions` (item 12, the
 * silent-release alternative); the cued credit = the first executed attempt
 * after `cue_presented`. Cued-eligible ⇔ released AND not resumed before its
 * notice AND the notice validly presented AND not excluded (item 7); a
 * noticed channel without a credit counts 0 at the sign-off, is censored at
 * the review and excluded by a fault (items 6 and 9). Owner amendment of 14
 * October 2026 (register §5.359 (3)): a runtime fault after the result was
 * final (both channels resumed) changes nothing scored and is flagged
 * (`fault_after_final_result`); a void row (an integrity defect) exports no
 * spontaneous count and no per-channel outcome — the recount stays only
 * under `invalid_diagnostic`, marked invalid. The value is the
 * NUMERATOR COUNT with the eligible denominator beside it; a conditional
 * denominator of 1 is complete; a zero denominator exports `numerator: null`,
 * `denominator: 0` with the disposition of contract §3.8 (`technical_only` >
 * `censored_only` > `resumed_before_cue` > `cue_not_presented` > `no_hold` >
 * `not_begun`). The spontaneous count is a companion beside the value, never
 * added to it; the cued outcome is conditional on no spontaneous resumption
 * and is no ranking across participants (the owner's recorded limitation).
 *
 * Dispositions (contract §3.8): never presented and never opened ⇒
 * `not_presented` (`interrupted` after a reload); presented, never opened ⇒
 * `pending`, after `closed_unopened` or the absence record
 * `no_eligible_event` (`not_opened`), never `declined`; opened, not
 * terminal, some channel not resumed either way ⇒ `pending`; the reload
 * hold-back ⇒ `interrupted`. Precedence: `interrupted` > `technical_failure`
 * (integrity defect) > `pending` > the closed outcomes.
 *
 * Field classification (contract §9.4): SCORED fields are integrity-checked
 * by the rules S1–S7 — a contradiction makes the row null `technical_failure`
 * with the defect named, never a silent repair; every stored `differ` and
 * `aligned` is checked against the content rule, every protocol time
 * (`held_at_ms`, `released_at_ms`, `presented_at_ms`, A's `ended_at_ms`)
 * against the timing rules (a release other than hold + 30 000, a notice
 * before release + 30 000, a notice after the channel's resumption — the
 * double count — B within 8 000 ms of A's actual end, B while A's notice was
 * due and undelivered, a notice end after the terminal record all void).
 * DESCRIPTIVE fields (input modes, latencies, clocks, the notice's deferral,
 * display and end reason, the distance, cell edits, refused ALIGNs, visits,
 * `cue_cancelled`, console records, help, `after_cue`, `in_silent_window`,
 * the outdoor preparation) never change the value or the disposition; an
 * inconsistency sets a named flag. Event order is read only from usable,
 * unique sequence numbers. Read-only; current page load only; the legacy
 * family `proto_m20_antenna_*` is never read; no total across items;
 * `difficulty_established: false` on every row.
 */
import {
  isM20ChannelId,
  M20_CELLS_PER_STEP,
  M20_CHANNEL_ORDER,
  M20_CHANNELS,
  M20_CHANNELS_PLANNED,
  M20_CONTENT_VERSION,
  M20_ENTRY_STATE_VERSION,
  M20_FAMILY,
  M20_FORM_ID,
  M20_HOLD_AFTER_STEP,
  M20_NOTICE_AFTER_RELEASE_MS,
  M20_NOTICE_MS,
  M20_OPPORTUNITY_ID,
  M20_RELEASE_MS,
  M20_SPACING_MS,
  M20_STEPS_PER_CHANNEL,
  m20AsLoaded,
  type M20ChannelId,
  m20Differ,
  m20IsCells,
  m20SameCells,
} from '../../pilot/windows/m20FeedContent';
import type { RawGameEvent } from '../../systems/EventLogger';
import type { ClosureReason } from '../protocol';
import { registerEntry } from '../registerV3';
import { reloadHoldBackClass } from '../reloadCheck';
import {
  absentFeature,
  emptyFeature,
  fractionFeature,
  meta,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureDisposition, FeatureRecord } from './types';

const FAMILY = M20_FAMILY;

/** The scored suffixes (contract §9.4). */
const SCORED = new Set([
  'opportunity_opened',
  'step_presented',
  'align_attempt',
  'step_aligned',
  'channel_held',
  'channel_released',
  'cue_presented',
  'cue_notice_ended',
  'channel_aligned',
  'project_completed',
  'project_closed',
  'technical_failure',
  'window_closed',
  'closed_unopened',
  'prior_load_checked',
]);
/** Records that are work: illegitimate without an opening (S3). */
const WORK = new Set([
  'intro_acknowledged',
  'channel_started',
  'step_presented',
  'cell_changed',
  'align_attempt',
  'align_refused',
  'step_aligned',
  'channel_held',
  'channel_released',
  'cue_presented',
  'cue_notice_ended',
  'cue_cancelled',
  'channel_aligned',
  'project_completed',
  'project_closed',
  'console_left',
  'console_reopened',
  'held_visit',
  'released_visit',
  'help_consulted',
]);
/** Scored records that carry the form and content stamp (S1). */
const STAMPED = new Set([
  'step_presented',
  'align_attempt',
  'step_aligned',
  'channel_held',
  'channel_released',
  'cue_presented',
  'cue_notice_ended',
  'channel_aligned',
  'project_completed',
  'project_closed',
]);
const KIND_PRECEDENCE = [
  'resumed_before_cue',
  'cue_not_presented',
  'no_hold',
  'not_begun',
] as const;

type NonresponseKind =
  | 'not_presented'
  | 'not_opened'
  | 'not_begun'
  | 'no_hold'
  | 'cue_not_presented'
  | 'resumed_before_cue'
  | 'censored_only'
  | 'technical_only'
  | 'reload_hold_back'
  | 'reload_no_current_evidence'
  | null;

type ChannelStatus =
  | 'not_begun'
  | 'begun_not_held'
  | 'held'
  | 'released_awaiting'
  | 'cue_not_presented'
  | 'resumed_spontaneously'
  | 'resumed'
  | 'not_resumed'
  | 'censored_review'
  | 'excluded_technical_failure'
  | 'awaiting_return';

interface Defect {
  rule: string;
  kind: string;
  sequence: number | null;
  channel_id: string | null;
}

interface AttemptRecord {
  index: number;
  position: number;
  sequence: number;
  step_index: number;
  cells: number[];
  differ: unknown;
  aligned: unknown;
  after_cue: unknown;
  in_silent_window: unknown;
  input_mode: string | null;
  work_focused_ms: number | null;
  release_to_align_wall_ms: number | null;
  release_to_align_focused_ms: number | null;
  cue_to_align_wall_ms: number | null;
  cue_to_align_console_closed_ms: number | null;
}

interface CueRecord {
  position: number;
  sequence: number;
  presented_at_ms: number | null;
  due_at_ms: number | null;
  deferred_ms: number | null;
  page_visible: unknown;
  page_focused: unknown;
  distance_to_console_px: number | null;
  ended_at_ms: number | null;
  ended_position: number | null;
  ended_reason: string | null;
  displayed_ms: number | null;
  focus_lost_during_display: boolean | null;
  end_count: number;
}

interface ChannelRecord {
  id: M20ChannelId;
  index: number;
  started: boolean;
  /** The step presented (0 before the first). */
  step: number;
  steps_done: number;
  attempts: AttemptRecord[];
  /** The last executed vector per step index (the `repeat` rule). */
  last_executed: Map<number, number[]>;
  held: {
    position: number;
    sequence: number;
    held_at_ms: number | null;
  } | null;
  hold_count: number;
  released: {
    position: number;
    sequence: number;
    released_at_ms: number | null;
  } | null;
  release_count: number;
  cue: CueRecord | null;
  cue_count: number;
  cue_cancelled: boolean;
  aligned: { position: number; sequence: number } | null;
  held_visits: number;
  released_visits: number;
  refused: Record<string, number>;
  refused_in_silent_window: number;
  refused_after_cue_before_credit: Record<string, number>;
  arrived_after_cue_without_credit: boolean;
  post_resumption_reentries: number;
  steps_after_cue: number;
  aligns_after_cue: number;
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

function sameNumberList(value: unknown, expected: readonly number[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    expected.every((number, index) => value[index] === number)
  );
}

function sameStringList(value: unknown, expected: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    expected.every((id, index) => value[index] === id)
  );
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

registerFeatureExtractor('M20', (events, context) => {
  const entry = registerEntry('M20');
  const spec = entry.features.find(
    (candidate) => candidate.feature_id === 'm20_cued_resumptions',
  )!;
  const family = events.filter(
    (event) =>
      (event.page_load_index === undefined ||
        event.page_load_index === context.pageLoadIndex) &&
      event.event_type.startsWith(FAMILY),
  );
  const suffixOf = (event: RawGameEvent) =>
    event.event_type.slice(FAMILY.length);
  const outdoor = family.filter((event) =>
    suffixOf(event).startsWith('outdoor_'),
  );
  const opp = family.filter((event) => !suffixOf(event).startsWith('outdoor_'));
  const supporting = sequencesOf(family);
  const outdoorPrepared = {
    brief_presented: outdoor.some(
      (event) => suffixOf(event) === 'outdoor_brief_presented',
    ),
    accepted: outdoor.some((event) => suffixOf(event) === 'outdoor_accepted'),
    stages_done: outdoor.filter(
      (event) => suffixOf(event) === 'outdoor_stage_completed',
    ).length,
    outdoor_faults: outdoor.filter(
      (event) => suffixOf(event) === 'outdoor_technical_failure',
    ).length,
  };

  // ——— The reload check of this load (the M18 / M19 precedent) ———
  const checks = opp.filter(
    (event) => suffixOf(event) === 'prior_load_checked',
  );
  const checkFlag = (key: string) =>
    checks.length === 0
      ? null
      : checks.some((event) => meta<unknown>(event, key) === true);
  const checkCoherent = (event: RawGameEvent) => {
    const established =
      meta<unknown>(event, 'prior_opening_absence_established') === true;
    const continuous = meta<unknown>(event, 'history_continuous') === true;
    const notFound = meta<unknown>(event, 'prior_opening_found') === false;
    const count = meta<unknown>(event, 'prior_page_load_event_count');

    return (
      !established ||
      (continuous && notFound && typeof count === 'number' && count > 0)
    );
  };
  const checksCoherent = checks.every(checkCoherent);
  // Exactly ONE coherent record per load establishes the absence (U24 RL-4,
  // D-6 (i); §5.290 (a): "two checks … establish nothing", even when they
  // agree — the M07 rule, now applied to this family too).
  const absenceEstablished =
    checks.length === 1 &&
    checksCoherent &&
    meta<unknown>(checks[0], 'prior_opening_absence_established') === true;
  // The U reading's reason (r3 §8 RL-4: this family's existing wording is
  // kept; it differs from the newer families' "earlier history not
  // verified", which is stated, not unified).
  const notEstablishedReason =
    'no current-load console evidence after a reload: feed console not opened in this page load and the absence of an earlier opening not established';
  const reloadCheck = () => ({
    page_reloaded: context.reloaded,
    checked: checks.length > 0,
    prior_opening_found: checkFlag('prior_opening_found'),
    prior_presentation_found: checkFlag('prior_presentation_found'),
    history_continuous: checkFlag('history_continuous'),
    prior_opening_absence_established: absenceEstablished,
  });

  // ——— State ———
  let presented = false;
  let presentedSequence: number | null = null;
  let opened = false;
  let openedPosition: number | null = null;
  let openedSequence: number | null = null;
  let stageAtOpen: string | null = null;
  let introAcknowledged = false;
  let closedUnopened: { reason: string; sequence: number } | null = null;
  let closedUnopenedCount = 0;
  let absenceRecord = false;
  const channels = new Map<M20ChannelId, ChannelRecord>(
    M20_CHANNELS.map((def) => [
      def.id,
      {
        id: def.id,
        index: def.index,
        started: false,
        step: 0,
        steps_done: 0,
        attempts: [],
        last_executed: new Map(),
        held: null,
        hold_count: 0,
        released: null,
        release_count: 0,
        cue: null,
        cue_count: 0,
        cue_cancelled: false,
        aligned: null,
        held_visits: 0,
        released_visits: 0,
        refused: { as_loaded: 0, repeat: 0, settling: 0, held: 0 },
        refused_in_silent_window: 0,
        refused_after_cue_before_credit: {
          as_loaded: 0,
          repeat: 0,
          settling: 0,
          held: 0,
        },
        arrived_after_cue_without_credit: false,
        post_resumption_reentries: 0,
        steps_after_cue: 0,
        aligns_after_cue: 0,
      },
    ]),
  );
  let terminal: {
    kind: 'completed' | 'closed' | 'fault';
    reason: unknown;
    position: number;
    sequence: number;
    event: RawGameEvent;
  } | null = null;
  let terminalCount = 0;
  const faults: {
    position: number;
    sequence: number;
    channel_id: string | null;
    detail: string;
    after_closure: boolean;
  }[] = [];
  let help = 0;
  let leaves = 0;
  let reopenings = 0;
  const defects: Defect[] = [];
  const flags: string[] = [];
  const seq = (event: RawGameEvent) =>
    typeof event.sequence === 'number' ? event.sequence : null;
  const defect = (
    rule: string,
    kind: string,
    event: RawGameEvent | null,
    channelId: unknown = null,
  ) => {
    defects.push({
      rule,
      kind,
      sequence: event === null ? null : seq(event),
      channel_id: typeof channelId === 'string' ? channelId : null,
    });
  };
  const flag = (kind: string, event: RawGameEvent | null) => {
    const sequence = event === null ? null : seq(event);

    flags.push(sequence === null ? kind : `${kind} (sequence ${sequence})`);
  };

  // ——— The recount per channel (from the attempts alone) ———
  /** The spontaneous resumption: the first executed attempt after the release and before any notice. */
  const spontaneousOf = (record: ChannelRecord): AttemptRecord | null => {
    if (record.released === null) {
      return null;
    }

    const releaseSequence = record.released.sequence;
    const cueSequence = record.cue?.sequence ?? null;

    return (
      record.attempts.find(
        (attempt) =>
          attempt.sequence > releaseSequence &&
          (cueSequence === null || attempt.sequence < cueSequence),
      ) ?? null
    );
  };
  /** The cued credit: the first executed attempt after the notice. */
  const creditOf = (record: ChannelRecord): AttemptRecord | null => {
    if (record.cue === null) {
      return null;
    }

    const cueSequence = record.cue.sequence;

    return (
      record.attempts.find((attempt) => attempt.sequence > cueSequence) ?? null
    );
  };
  const statusOf = (record: ChannelRecord): ChannelStatus => {
    if (record.attempts.length === 0) {
      return 'not_begun';
    }

    if (record.held === null) {
      return 'begun_not_held';
    }

    if (spontaneousOf(record) !== null) {
      return 'resumed_spontaneously';
    }

    if (record.cue === null) {
      if (terminal !== null) {
        return 'cue_not_presented';
      }

      return record.released === null ? 'held' : 'released_awaiting';
    }

    if (creditOf(record) !== null) {
      return 'resumed';
    }

    if (terminal === null) {
      return 'awaiting_return';
    }

    if (terminal.kind === 'fault') {
      return 'excluded_technical_failure';
    }

    if (terminal.kind === 'closed' && terminal.reason === 'closed_at_review') {
      return 'censored_review';
    }

    return 'not_resumed';
  };

  // ——— Components ———
  const channelComponents = (
    record: ChannelRecord,
    snapshot: Record<string, unknown> | null,
  ): Record<string, unknown> => {
    const status = statusOf(record);
    const spontaneous = spontaneousOf(record);
    const credit = creditOf(record);
    const cue = record.cue;
    const snap = (key: string) =>
      snapshot === null ? null : numberOrNull(snapshot[key]);

    return {
      channel_id: record.id,
      occasion_id: record.id,
      channel_index: record.index,
      status,
      started: record.started,
      steps_done: record.steps_done,
      attempts: record.attempts.length,
      refused_aligns: { ...record.refused },
      held: record.held !== null,
      held_at_ms: record.held?.held_at_ms ?? null,
      released: record.released !== null,
      released_at_ms: record.released?.released_at_ms ?? null,
      noticed: cue !== null,
      cue_presented_at_ms: cue?.presented_at_ms ?? null,
      held_to_cue_ms:
        cue?.presented_at_ms != null && record.held?.held_at_ms != null
          ? cue.presented_at_ms - record.held.held_at_ms
          : null,
      cue_deferred_ms: cue?.deferred_ms ?? null,
      cue_displayed_ms: cue?.displayed_ms ?? null,
      cue_ended_reason: cue?.ended_reason ?? null,
      focus_lost_during_display: cue?.focus_lost_during_display ?? null,
      distance_to_console_at_cue_px: cue?.distance_to_console_px ?? null,
      cue_cancelled: record.cue_cancelled,
      held_visits: record.held_visits,
      released_visits: record.released_visits,
      refused_in_silent_window: record.refused_in_silent_window,
      spontaneous_attempt_index: spontaneous?.index ?? null,
      release_to_spontaneous_wall_ms:
        spontaneous?.release_to_align_wall_ms ?? null,
      release_to_spontaneous_focused_ms:
        spontaneous?.release_to_align_focused_ms ?? null,
      credited: credit !== null,
      credit_attempt_index: credit?.index ?? null,
      arrived_after_cue_without_credit:
        record.arrived_after_cue_without_credit && credit === null,
      refused_after_cue_before_credit: {
        ...record.refused_after_cue_before_credit,
      },
      steps_after_cue: record.steps_after_cue,
      aligns_after_cue: record.aligns_after_cue,
      post_resumption_reentries: record.post_resumption_reentries,
      aligned: record.aligned !== null,
      eligible: status === 'resumed' || status === 'not_resumed',
      excluded_reason:
        status === 'excluded_technical_failure'
          ? 'technical_failure'
          : status === 'censored_review'
            ? 'closed_at_review'
            : null,
      work_focused_ms: snap('work_focused_ms'),
      cue_to_credit_wall_ms: credit?.cue_to_align_wall_ms ?? null,
      cue_to_credit_console_closed_ms:
        credit?.cue_to_align_console_closed_ms ?? null,
      cue_to_closure_wall_ms:
        credit === null ? snap('cue_to_closure_wall_ms') : null,
      cue_to_closure_console_closed_ms:
        credit === null ? snap('cue_to_closure_console_closed_ms') : null,
    };
  };

  const snapshotChannel = (
    id: M20ChannelId,
  ): Record<string, unknown> | null => {
    if (terminal === null) {
      return null;
    }

    const list = meta<unknown>(terminal.event, 'channels');

    if (!Array.isArray(list)) {
      return null;
    }

    const item = (list as unknown[]).find(
      (candidate) => isRecord(candidate) && candidate.channel_id === id,
    );

    return isRecord(item) ? item : null;
  };

  const spontaneousCount = () =>
    [...channels.values()].filter(
      (record) => statusOf(record) === 'resumed_spontaneously',
    ).length;

  /**
   * The moment the result became final (contract §3.8 [O-6]): both channels
   * resumed, spontaneously or after their notice — the sequence of the later
   * resumption; null while a channel can still become cued-eligible.
   */
  const finalSequence = (): number | null => {
    let latest = 0;

    for (const record of channels.values()) {
      const resumption = spontaneousOf(record) ?? creditOf(record);

      if (resumption === null) {
        return null;
      }

      latest = Math.max(latest, resumption.sequence);
    }

    return latest;
  };
  /**
   * A runtime fault after the result was final changes nothing scored (owner
   * amendment of 14 October 2026, register §5.359 (3)): it is recorded
   * separately; integrity rules still apply to the evidence.
   */
  const faultAfterFinal = (): boolean => {
    if (terminal === null || terminal.kind !== 'fault') {
      return false;
    }

    const final = finalSequence();

    return final !== null && terminal.sequence > final;
  };

  const components = (
    nonresponse: NonresponseKind,
    extra: Record<string, unknown> = {},
    invalid = false,
  ): Record<string, unknown> => ({
    administration_version: M20_ENTRY_STATE_VERSION,
    form_id: M20_FORM_ID,
    content_version: M20_CONTENT_VERSION,
    presented_in_current_load: presented,
    presented_sequence: presentedSequence,
    opened,
    opened_sequence: openedSequence,
    stage_at_open: stageAtOpen,
    intro_acknowledged: introAcknowledged,
    observations_share_one_project: true,
    cued_outcome_conditional_on_no_spontaneous_resumption: true,
    difficulty_established: false,
    // A whole-row integrity failure (owner amendment §5.359 (3)): no
    // spontaneous count and no per-channel outcome is exported as a result;
    // the recount stays only under `invalid_diagnostic`, marked invalid.
    spontaneous_resumptions: invalid
      ? null
      : opened
        ? spontaneousCount()
        : null,
    channels: M20_CHANNELS.map((def) =>
      invalid
        ? {
            channel_id: def.id,
            occasion_id: def.id,
            channel_index: def.index,
            status: null,
            outcome_available: false,
          }
        : channelComponents(channels.get(def.id)!, snapshotChannel(def.id)),
    ),
    ...(invalid
      ? {
          invalid_diagnostic: {
            valid: false,
            note: 'a recount of evidence that failed an integrity rule; not a result',
            spontaneous_recount: opened ? spontaneousCount() : null,
            channels_recount: M20_CHANNELS.map((def) =>
              channelComponents(channels.get(def.id)!, snapshotChannel(def.id)),
            ),
            fault_after_final_result_recount: faultAfterFinal(),
          },
        }
      : {}),
    // Correction round 2 (scientific confirmation N2): derived from the
    // recount, so on a void row it is unavailable and kept only under
    // `invalid_diagnostic` (owner amendment §5.359 (3)).
    fault_after_final_result: invalid ? null : faultAfterFinal(),
    nonresponse_kind: nonresponse,
    help_consults: help,
    console_leaves: leaves,
    console_reopenings: reopenings,
    faults: faults.map((fault) => ({
      sequence: fault.sequence,
      channel_id: fault.channel_id,
      detail: fault.detail,
      after_closure: fault.after_closure,
    })),
    reload_check: reloadCheck(),
    closed_unopened: closedUnopened,
    outdoor_prepared: outdoorPrepared,
    // The project closure as the family wrote it (`shift_signed_off` is
    // exported on the row as the framework's `route_departure`).
    project_closure_reason:
      terminal === null
        ? null
        : terminal.kind === 'completed'
          ? 'completed'
          : terminal.kind === 'fault'
            ? 'technical_failure'
            : typeof terminal.reason === 'string'
              ? terminal.reason
              : null,
    flags: [...flags],
    ...extra,
  });

  const empty = (
    disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>,
    reason: string,
    nonresponse: NonresponseKind,
    extra: Partial<FeatureRecord> = {},
  ): FeatureRecord[] => [
    emptyFeature('M20', spec, disposition, reason, {
      supporting_sequences: supporting,
      components: components(nonresponse),
      ...extra,
    }),
  ];

  if (opp.length === 0) {
    return [
      absentFeature('M20', spec, context, 'feed console never presented', {
        supporting_sequences: supporting,
        components: components(
          context.reloaded ? 'reload_no_current_evidence' : 'not_presented',
        ),
      }),
    ];
  }

  if (
    checks.length > 1 ||
    (checks.length > 0 && !context.reloaded) ||
    !checksCoherent
  ) {
    flag('the reload check records are inconsistent', null);
  }

  // Held back after a reload (U24 RL-4, r3 §2): the kit's technical failure
  // with a detail beginning `reload` and no opening of its own in this
  // load. The detail's class prefix (RL-0) tells H — an earlier opening
  // found, the existing reading — from U / M — the earlier history not
  // verified or the check contradictory: the console was not administered,
  // and the row reads the existing not-established reason.
  const holdBackMarker = opp.find(
    (event) =>
      suffixOf(event) === 'technical_failure' &&
      String(meta<unknown>(event, 'detail') ?? '').startsWith('reload'),
  );
  const holdBackClass =
    holdBackMarker === undefined
      ? null
      : reloadHoldBackClass(meta<unknown>(holdBackMarker, 'detail'));
  const heldBack =
    holdBackMarker !== undefined &&
    !opp.some((event) => suffixOf(event) === 'opportunity_opened');

  for (const event of opp) {
    if (suffixOf(event) === 'presented') {
      presented = true;
      presentedSequence ??= event.sequence ?? null;
    }
  }

  if (heldBack) {
    return empty(
      'interrupted',
      holdBackClass === 'U' || holdBackClass === 'M'
        ? notEstablishedReason
        : 'feed console opened in an earlier page load; not re-run after the reload',
      'reload_hold_back',
      {
        components: components('reload_hold_back', {
          held_back_after_reload: true,
        }),
      },
    );
  }

  if (
    context.reloaded &&
    !opp.some((event) => suffixOf(event) === 'opportunity_opened')
  ) {
    // Contract §3.8: a later page load without an opening of its own is
    // `interrupted` unless this load presented the console itself AND the
    // absence of an earlier opening is established — only then does the
    // ordinary presented-never-opened reading apply.
    if (!absenceEstablished || !presented) {
      return empty(
        'interrupted',
        absenceEstablished
          ? 'no current-load console evidence after a reload: feed console neither presented nor opened in this page load (the absence of an earlier opening established)'
          : notEstablishedReason,
        'reload_no_current_evidence',
      );
    }
  }

  // Everything below compares positions.
  const order = orderDefect(opp);

  if (order !== null) {
    return empty('technical_failure', `integrity defect: ${order}`, null, {
      closure_reason: 'technical_failure',
      components: components(
        null,
        {
          integrity_defect: [
            { rule: 'S2', kind: order, sequence: null, channel_id: null },
          ],
        },
        true,
      ),
    });
  }

  const ordered = opp
    .slice()
    .sort((a, b) => (a.sequence as number) - (b.sequence as number));

  /** S1: the entry snapshot's declarations against the approved administration. */
  const validateSnapshot = (snapshot: unknown, event: RawGameEvent) => {
    if (!isRecord(snapshot)) {
      defect('S1', 'the entry snapshot is not a record', event);

      return;
    }

    const expectations: [string, unknown][] = [
      ['form_id', M20_FORM_ID],
      ['content_version', M20_CONTENT_VERSION],
      ['channels_planned', M20_CHANNELS_PLANNED],
      ['steps_per_channel', M20_STEPS_PER_CHANNEL],
      ['hold_after_step', M20_HOLD_AFTER_STEP],
      ['release_delay_ms', M20_RELEASE_MS],
      ['notice_after_release_ms', M20_NOTICE_AFTER_RELEASE_MS],
      ['notice_ms', M20_NOTICE_MS],
      ['notice_spacing_ms', M20_SPACING_MS],
      ['refusal_rule', 'vector_as_loaded_or_last_executed'],
      ['credit_rule', 'first_executed_align_after_cue'],
      ['spontaneous_rule', 'first_executed_align_after_release_before_cue'],
    ];

    for (const [key, expected] of expectations) {
      if (snapshot[key] !== expected) {
        defect(
          'S1',
          `the entry snapshot's ${key} is not ${String(expected)}`,
          event,
        );
      }
    }

    if (!sameStringList(snapshot.channel_order, M20_CHANNEL_ORDER)) {
      defect(
        'S1',
        "the entry snapshot's channel order disagrees with the content",
        event,
      );
    }

    if (!sameNumberList(snapshot.cells_per_step, M20_CELLS_PER_STEP)) {
      defect(
        'S1',
        "the entry snapshot's cells per step disagree with the content",
        event,
      );
    }
  };

  const noticedA = () => channels.get('m20_ch_a')!.cue;
  let previous: { suffix: string; event: RawGameEvent } | null = null;

  // ——— The walk ———
  for (const [position, event] of ordered.entries()) {
    const suffix = suffixOf(event);
    const closed = terminal !== null && terminal.position < position;

    if (
      meta<unknown>(event, 'entry_state_version') !== M20_ENTRY_STATE_VERSION
    ) {
      defect('S1', 'an event of the family carries an unknown version', event);
      previous = { suffix, event };
      continue;
    }

    if (meta<unknown>(event, 'opportunity_id') !== M20_OPPORTUNITY_ID) {
      defect(
        'S1',
        'an event of the family carries another opportunity id',
        event,
      );
      previous = { suffix, event };
      continue;
    }

    if (STAMPED.has(suffix)) {
      if (meta<unknown>(event, 'form_id') !== M20_FORM_ID) {
        defect('S1', `a ${suffix} record carries an unknown form`, event);
        previous = { suffix, event };
        continue;
      }

      if (meta<unknown>(event, 'content_version') !== M20_CONTENT_VERSION) {
        defect(
          'S1',
          `a ${suffix} record carries an unknown content version`,
          event,
        );
        previous = { suffix, event };
        continue;
      }
    }

    const channelId = meta<unknown>(event, 'channel_id');
    const known = isM20ChannelId(channelId) ? channels.get(channelId)! : null;
    const sequence = event.sequence as number;

    // S3: a scored record before the opening; S7: a scored record after the
    // terminal record (the kit's `window_closed` excepted).
    if (
      SCORED.has(suffix) &&
      suffix !== 'prior_load_checked' &&
      suffix !== 'opportunity_opened' &&
      suffix !== 'closed_unopened' &&
      suffix !== 'window_closed' &&
      !opened
    ) {
      defect('S3', `a ${suffix} record before the opening`, event, channelId);
    }

    if (closed && SCORED.has(suffix) && suffix !== 'window_closed') {
      if (suffix === 'technical_failure') {
        // A fault after the closure changes nothing scored (recorded in the
        // components; the model never reopens the project).
        faults.push({
          position,
          sequence,
          channel_id: stringOrNull(channelId),
          detail: String(meta<unknown>(event, 'detail') ?? 'technical failure'),
          after_closure: true,
        });
        flag('a fault record after the closure', event);
        previous = { suffix, event };
        continue;
      }

      defect(
        'S7',
        `a ${suffix} record after the terminal record`,
        event,
        channelId,
      );
    }

    // S5: step 2 aligned ⇒ `channel_held` immediately (the same handler).
    if (
      previous !== null &&
      previous.suffix === 'step_aligned' &&
      meta<unknown>(previous.event, 'step_index') === M20_HOLD_AFTER_STEP &&
      suffix !== 'channel_held'
    ) {
      defect(
        'S5',
        'the second step was aligned without its immediate hold',
        event,
        meta<unknown>(previous.event, 'channel_id'),
      );
    }

    if (channelId !== undefined && channelId !== null && known === null) {
      defect(
        'S3',
        `a ${suffix} record names an unknown channel`,
        event,
        channelId,
      );
      previous = { suffix, event };
      continue;
    }

    switch (suffix) {
      case 'presented':
        break;
      case 'opportunity_opened': {
        if (opened) {
          defect('S3', 'the console was opened twice', event);
          break;
        }

        opened = true;
        openedPosition = position;
        openedSequence = sequence;

        const snapshot = meta<unknown>(event, 'entry_state_snapshot');

        validateSnapshot(snapshot, event);
        stageAtOpen = isRecord(snapshot) ? stringOrNull(snapshot.stage) : null;
        break;
      }
      case 'closed_unopened': {
        closedUnopenedCount += 1;

        const reason = meta<unknown>(event, 'closure_reason');

        if (reason !== 'shift_signed_off' && reason !== 'closed_at_review') {
          defect(
            'S3',
            'a closed_unopened record without a known reason',
            event,
          );
        }

        if (closedUnopenedCount > 1) {
          defect('S3', 'the never-opened console was closed twice', event);
        }

        if (!presented) {
          defect('S3', 'closed_unopened without a presentation', event);
        }

        closedUnopened ??= {
          reason: typeof reason === 'string' ? reason : 'unknown',
          sequence,
        };
        break;
      }
      case 'intro_acknowledged':
        introAcknowledged = true;
        break;
      case 'console_reopened':
      case 'console_left': {
        if (!opened) {
          flag(`a ${suffix} record before the opening`, event);
        }

        if (suffix === 'console_reopened') {
          reopenings += 1;

          for (const record of channels.values()) {
            if (record.cue !== null && creditOf(record) === null) {
              record.arrived_after_cue_without_credit = true;
            }

            if (
              (creditOf(record) !== null || spontaneousOf(record) !== null) &&
              record.aligned === null
            ) {
              record.post_resumption_reentries += 1;
            }
          }
        } else {
          leaves += 1;
        }

        if (typeof meta<unknown>(event, 'view') !== 'string') {
          flag(`a ${suffix} record without a view`, event);
        }

        break;
      }
      case 'held_visit':
        if (known === null) {
          flag('a held_visit record names no channel', event);
        } else if (known.held !== null && known.released === null) {
          known.held_visits += 1;
        } else {
          flag('a held_visit record on a channel not held', event);
        }

        break;
      case 'released_visit':
        if (known === null) {
          flag('a released_visit record names no channel', event);
        } else if (
          known.released !== null &&
          known.cue === null &&
          spontaneousOf(known) === null
        ) {
          known.released_visits += 1;
        } else {
          flag('a released_visit record outside a silent window', event);
        }

        break;
      case 'channel_started':
        if (known === null) {
          flag('a channel_started record names no channel', event);
          break;
        }

        if (known.started) {
          flag('a channel was started twice', event);
        }

        known.started = true;
        break;
      case 'step_presented': {
        if (known === null) {
          defect(
            'S3',
            'a step presentation names no channel',
            event,
            channelId,
          );
          break;
        }

        const stepIndex = meta<unknown>(event, 'step_index');
        const resumed = meta<unknown>(event, 'resumed') === true;

        if (known.index === 2 && channels.get('m20_ch_a')!.held === null) {
          defect(
            'S3',
            'channel B was presented before channel A was ever held',
            event,
            channelId,
          );
        }

        if (known.aligned !== null) {
          defect(
            'S3',
            'a step was presented on an aligned channel',
            event,
            channelId,
          );
        }

        if (typeof stepIndex !== 'number') {
          defect(
            'S3',
            'a step presentation without a step index',
            event,
            channelId,
          );
          break;
        }

        if (resumed ? stepIndex !== known.step : stepIndex !== known.step + 1) {
          defect('S3', 'a step was presented out of order', event, channelId);
        }

        if (!resumed && stepIndex > 1 && known.steps_done !== stepIndex - 1) {
          defect(
            'S3',
            'a step was presented before the previous step was aligned',
            event,
            channelId,
          );
        }

        if (
          meta<unknown>(event, 'cells_n') !== M20_CELLS_PER_STEP[stepIndex - 1]
        ) {
          flag(
            "a step presentation's cell count disagrees with the content",
            event,
          );
        }

        known.step = stepIndex;
        break;
      }
      case 'cell_changed':
        if (known === null) {
          flag('a cell_changed record names no channel', event);
        }

        break;
      case 'align_refused': {
        if (known === null) {
          flag('an align_refused record names no channel', event);
          break;
        }

        const reason = meta<unknown>(event, 'reason');

        if (
          reason !== 'as_loaded' &&
          reason !== 'repeat' &&
          reason !== 'settling' &&
          reason !== 'held'
        ) {
          flag('a refused ALIGN without a known reason', event);
          break;
        }

        known.refused[reason] += 1;

        if (
          known.released !== null &&
          known.cue === null &&
          spontaneousOf(known) === null
        ) {
          known.refused_in_silent_window += 1;
        }

        if (known.cue !== null && creditOf(known) === null) {
          known.refused_after_cue_before_credit[reason] += 1;
        }

        break;
      }
      case 'align_attempt': {
        if (known === null) {
          defect('S4', 'an attempt names no channel', event, channelId);
          break;
        }

        const stepIndex = meta<unknown>(event, 'step_index');
        const cells = meta<unknown>(event, 'cells');
        const index = meta<unknown>(event, 'attempt_index');

        if (typeof stepIndex !== 'number' || !m20IsCells(cells, stepIndex)) {
          defect(
            'S4',
            'an attempt without a well-formed cell vector',
            event,
            channelId,
          );
          break;
        }

        if (index !== known.attempts.length + 1) {
          defect('S4', 'an attempt index out of sequence', event, channelId);
        }

        if (stepIndex !== known.step) {
          defect('S4', 'an attempt on a step not presented', event, channelId);
        }

        if (known.held !== null && known.released === null) {
          defect(
            'S4',
            'an attempt on a held channel before its release',
            event,
            channelId,
          );
        }

        if (known.aligned !== null) {
          defect(
            'S4',
            'an attempt after the channel was aligned',
            event,
            channelId,
          );
        }

        if (m20AsLoaded(cells)) {
          defect(
            'S4',
            'an executed ALIGN with every cell at its loading value',
            event,
            channelId,
          );
        }

        const last = known.last_executed.get(stepIndex) ?? null;

        if (m20SameCells(last, cells)) {
          defect(
            'S4',
            "an executed ALIGN repeating the step's last executed cells",
            event,
            channelId,
          );
        }

        const differ = m20Differ(known.id, stepIndex, cells);

        if (meta<unknown>(event, 'differ') !== differ) {
          defect(
            'S4',
            "an attempt's stored differ count contradicts the content rule",
            event,
            channelId,
          );
        }

        if (meta<unknown>(event, 'aligned') !== (differ === 0)) {
          defect(
            'S4',
            "an attempt's stored aligned flag contradicts the content rule",
            event,
            channelId,
          );
        }

        const afterCue = known.cue !== null;
        const silent =
          known.released !== null &&
          known.cue === null &&
          spontaneousOf(known) === null;

        if (meta<unknown>(event, 'after_cue') !== afterCue) {
          flag("an attempt's after_cue flag disagrees with the recount", event);
        }

        if (meta<unknown>(event, 'in_silent_window') !== silent) {
          flag(
            "an attempt's in_silent_window flag disagrees with the recount",
            event,
          );
        }

        known.last_executed.set(stepIndex, [...cells]);
        known.attempts.push({
          index: typeof index === 'number' ? index : known.attempts.length + 1,
          position,
          sequence,
          step_index: stepIndex,
          cells: [...cells],
          differ: meta<unknown>(event, 'differ'),
          aligned: meta<unknown>(event, 'aligned'),
          after_cue: meta<unknown>(event, 'after_cue'),
          in_silent_window: meta<unknown>(event, 'in_silent_window'),
          input_mode: stringOrNull(meta<unknown>(event, 'input_mode')),
          work_focused_ms: numberOrNull(
            meta<unknown>(event, 'work_focused_ms'),
          ),
          release_to_align_wall_ms: numberOrNull(
            meta<unknown>(event, 'release_to_align_wall_ms'),
          ),
          release_to_align_focused_ms: numberOrNull(
            meta<unknown>(event, 'release_to_align_focused_ms'),
          ),
          cue_to_align_wall_ms: numberOrNull(
            meta<unknown>(event, 'cue_to_align_wall_ms'),
          ),
          cue_to_align_console_closed_ms: numberOrNull(
            meta<unknown>(event, 'cue_to_align_console_closed_ms'),
          ),
        });

        if (afterCue) {
          known.aligns_after_cue += 1;
        }

        break;
      }
      case 'step_aligned': {
        if (known === null) {
          defect(
            'S4',
            'a step_aligned record names no channel',
            event,
            channelId,
          );
          break;
        }

        const stepIndex = meta<unknown>(event, 'step_index');
        const last = known.attempts[known.attempts.length - 1];

        if (
          previous === null ||
          previous.suffix !== 'align_attempt' ||
          meta<unknown>(previous.event, 'channel_id') !== known.id ||
          meta<unknown>(previous.event, 'aligned') !== true ||
          meta<unknown>(previous.event, 'step_index') !== stepIndex ||
          last === undefined ||
          last.position !== position - 1
        ) {
          defect(
            'S4',
            'a step_aligned record not immediately after its aligned attempt',
            event,
            channelId,
          );
        }

        known.steps_done += 1;

        if (stepIndex !== known.steps_done) {
          defect('S4', 'a step_aligned record out of order', event, channelId);
        }

        if (known.cue !== null) {
          known.steps_after_cue += 1;
        }

        break;
      }
      case 'channel_held': {
        if (known === null) {
          defect('S5', 'a hold names no channel', event, channelId);
          break;
        }

        known.hold_count += 1;

        if (known.held !== null) {
          defect('S5', 'a second hold on a channel', event, channelId);
          break;
        }

        if (
          previous === null ||
          previous.suffix !== 'step_aligned' ||
          meta<unknown>(previous.event, 'channel_id') !== known.id ||
          meta<unknown>(previous.event, 'step_index') !== M20_HOLD_AFTER_STEP ||
          known.steps_done !== M20_HOLD_AFTER_STEP
        ) {
          defect(
            'S5',
            'a hold not immediately after the aligned second step',
            event,
            channelId,
          );
        }

        known.held = {
          position,
          sequence,
          held_at_ms: numberOrNull(meta<unknown>(event, 'held_at_ms')),
        };

        if (known.held.held_at_ms === null) {
          defect('S5', 'a hold without a held_at_ms', event, channelId);
        }

        break;
      }
      case 'channel_released': {
        if (known === null) {
          defect('S6', 'a release names no channel', event, channelId);
          break;
        }

        known.release_count += 1;

        if (known.held === null || known.released !== null) {
          defect('S6', 'a release without a hold, or twice', event, channelId);
          break;
        }

        const releasedAt = numberOrNull(meta<unknown>(event, 'released_at_ms'));

        if (
          releasedAt === null ||
          known.held.held_at_ms === null ||
          releasedAt !== known.held.held_at_ms + M20_RELEASE_MS
        ) {
          defect(
            'S6',
            'a release time that is not the hold time + 30000 ms',
            event,
            channelId,
          );
        }

        known.released = { position, sequence, released_at_ms: releasedAt };
        break;
      }
      case 'cue_presented': {
        if (known === null) {
          defect('S6', 'a notice names no channel', event, channelId);
          break;
        }

        known.cue_count += 1;

        if (known.cue !== null) {
          defect('S6', 'a second notice for a channel', event, channelId);
          break;
        }

        if (known.held === null || known.released === null) {
          defect(
            'S6',
            'a notice for a channel without a hold or release',
            event,
            channelId,
          );
        }

        if (spontaneousOf(known) !== null || known.aligned !== null) {
          defect(
            'S6',
            'a notice for a channel already resumed before it (the double count)',
            event,
            channelId,
          );
        }

        const pageVisible = meta<unknown>(event, 'page_visible');
        const pageFocused = meta<unknown>(event, 'page_focused');

        if (pageVisible !== true || pageFocused !== true) {
          defect('S6', 'a notice recorded without exposure', event, channelId);
        }

        const presentedAt = numberOrNull(
          meta<unknown>(event, 'presented_at_ms'),
        );
        const releasedAt = known.released?.released_at_ms ?? null;

        if (
          presentedAt === null ||
          releasedAt === null ||
          presentedAt < releasedAt + M20_NOTICE_AFTER_RELEASE_MS
        ) {
          defect(
            'S6',
            'a notice before its due time (release + 30000 ms)',
            event,
            channelId,
          );
        }

        if (known.index === 2 && presentedAt !== null) {
          const a = channels.get('m20_ch_a')!;
          const cueA = noticedA();

          if (cueA !== null) {
            if (cueA.ended_at_ms === null) {
              defect(
                'S6',
                "channel B noticed while channel A's notice had not ended",
                event,
                channelId,
              );
            } else if (presentedAt < cueA.ended_at_ms + M20_SPACING_MS) {
              defect(
                'S6',
                "channel B noticed less than 8000 ms after channel A's notice ended",
                event,
                channelId,
              );
            }
          } else if (
            a.released !== null &&
            spontaneousOf(a) === null &&
            a.aligned === null &&
            a.released.released_at_ms !== null &&
            presentedAt >=
              a.released.released_at_ms + M20_NOTICE_AFTER_RELEASE_MS
          ) {
            defect(
              'S6',
              "channel B noticed while channel A's notice was due and undelivered",
              event,
              channelId,
            );
          }
        }

        known.cue = {
          position,
          sequence,
          presented_at_ms: presentedAt,
          due_at_ms: numberOrNull(meta<unknown>(event, 'due_at_ms')),
          deferred_ms: numberOrNull(meta<unknown>(event, 'deferred_ms')),
          page_visible: pageVisible,
          page_focused: pageFocused,
          distance_to_console_px: numberOrNull(
            meta<unknown>(event, 'distance_to_console_px'),
          ),
          ended_at_ms: null,
          ended_position: null,
          ended_reason: null,
          displayed_ms: null,
          focus_lost_during_display: null,
          end_count: 0,
        };
        break;
      }
      case 'cue_notice_ended': {
        if (known === null) {
          defect('S6', 'a notice end names no channel', event, channelId);
          break;
        }

        if (known.cue === null) {
          defect('S6', 'a notice end without its notice', event, channelId);
          break;
        }

        known.cue.end_count += 1;

        if (known.cue.end_count > 1) {
          defect('S6', 'a second end for one notice', event, channelId);
          break;
        }

        const endedAt = numberOrNull(meta<unknown>(event, 'ended_at_ms'));

        if (
          endedAt === null ||
          known.cue.presented_at_ms === null ||
          endedAt < known.cue.presented_at_ms
        ) {
          defect(
            'S6',
            'a notice ended before it was presented',
            event,
            channelId,
          );
        }

        known.cue.ended_at_ms = endedAt;
        known.cue.ended_position = position;
        known.cue.ended_reason = stringOrNull(
          meta<unknown>(event, 'ended_reason'),
        );
        known.cue.displayed_ms = numberOrNull(
          meta<unknown>(event, 'displayed_ms'),
        );
        known.cue.focus_lost_during_display = booleanOrNull(
          meta<unknown>(event, 'focus_lost_during_display'),
        );
        break;
      }
      case 'cue_cancelled':
        if (known === null) {
          flag('a cue_cancelled record names no channel', event);
          break;
        }

        known.cue_cancelled = true;

        if (meta<unknown>(event, 'reason') !== 'resumed_before_cue') {
          flag('a cue_cancelled record without a known reason', event);
        }

        break;
      case 'help_consulted':
        help += 1;

        if (typeof meta<unknown>(event, 'view') !== 'string') {
          flag('a help record without a view', event);
        }

        break;
      case 'channel_aligned': {
        if (known === null) {
          defect(
            'S7',
            'a channel_aligned record names no channel',
            event,
            channelId,
          );
          break;
        }

        if (known.aligned !== null) {
          defect('S7', 'a channel was aligned twice', event, channelId);
          break;
        }

        if (known.steps_done !== M20_STEPS_PER_CHANNEL) {
          defect('S7', 'a channel aligned before six steps', event, channelId);
        }

        known.aligned = { position, sequence };
        break;
      }
      case 'project_completed':
      case 'project_closed': {
        terminalCount += 1;

        if (terminalCount > 1) {
          defect('S7', 'a second terminal record', event);
          break;
        }

        const reason = meta<unknown>(event, 'closure_reason');

        if (suffix === 'project_completed') {
          if (reason !== 'completed') {
            defect(
              'S7',
              "a completion record's closure reason is not completed",
              event,
            );
          }

          if (
            [...channels.values()].some((record) => record.aligned === null)
          ) {
            defect(
              'S7',
              'project_completed before both channels aligned',
              event,
            );
          }
        } else if (
          reason !== 'shift_signed_off' &&
          reason !== 'closed_at_review'
        ) {
          defect('S7', 'a project closure without a known reason', event);
        }

        if (!opened) {
          defect('S7', 'the project closed before the opening', event);
        }

        terminal = {
          kind: suffix === 'project_completed' ? 'completed' : 'closed',
          reason,
          position,
          sequence,
          event,
        };
        break;
      }
      case 'technical_failure': {
        const detail = String(
          meta<unknown>(event, 'detail') ?? 'technical failure',
        );

        if (!opened) {
          // A fault before any opening leaves no scored evidence to void.
          flag('a fault record before the opening', event);
          break;
        }

        terminalCount += 1;

        if (terminalCount > 1) {
          defect('S7', 'a second terminal record', event);
          break;
        }

        faults.push({
          position,
          sequence,
          channel_id: stringOrNull(channelId),
          detail,
          after_closure: false,
        });
        terminal = {
          kind: 'fault',
          reason: 'technical_failure',
          position,
          sequence,
          event,
        };
        break;
      }
      case 'window_closed':
        if (
          meta<unknown>(event, 'exit_state') === 'closed_at_review' &&
          !opened
        ) {
          absenceRecord = true;
        }

        break;
      case 'prior_load_checked':
        break;
      default:
        flag(`an unknown record of the family: ${suffix}`, event);
        break;
    }

    previous = { suffix, event };
  }

  // ——— Post-walk integrity (S3, S5, S6, S7) ———
  if (previous !== null && previous.suffix === 'step_aligned') {
    if (meta<unknown>(previous.event, 'step_index') === M20_HOLD_AFTER_STEP) {
      defect(
        'S5',
        'the second step was aligned without its immediate hold',
        null,
        meta<unknown>(previous.event, 'channel_id'),
      );
    }
  }

  if (!opened) {
    for (const event of ordered) {
      if (WORK.has(suffixOf(event))) {
        defect(
          'S3',
          'a work record without an opening',
          event,
          meta<unknown>(event, 'channel_id'),
        );
      }
    }
  } else if (closedUnopened !== null) {
    defect('S3', 'closed_unopened together with an opening', null);
  }

  for (const def of M20_CHANNELS) {
    const record = channels.get(def.id)!;

    if (record.steps_done >= M20_HOLD_AFTER_STEP && record.held === null) {
      defect(
        'S5',
        'a channel aligned its second step without a hold',
        null,
        def.id,
      );
    }

    if (record.held !== null && record.steps_done < M20_HOLD_AFTER_STEP) {
      defect(
        'S5',
        'a hold on a channel whose second step was not aligned',
        null,
        def.id,
      );
    }

    // A notice end must precede the terminal record (S7, E45).
    if (
      record.cue !== null &&
      record.cue.ended_position !== null &&
      terminal !== null &&
      record.cue.ended_position > terminal.position
    ) {
      defect('S7', 'a notice end after the terminal record', null, def.id);
    }
  }

  // The closure snapshot against the recount (S7).
  if (terminal !== null && terminal.kind !== 'fault') {
    const event = terminal.event;
    const list = meta<unknown>(event, 'channels');

    if (meta<unknown>(event, 'channels_planned') !== M20_CHANNELS_PLANNED) {
      defect(
        'S7',
        "the closure snapshot's planned channel count is not 2",
        event,
      );
    }

    if (
      meta<unknown>(event, 'spontaneous_resumptions') !== spontaneousCount()
    ) {
      defect(
        'S7',
        "the closure snapshot's spontaneous count disagrees with the recount",
        event,
      );
    }

    if (!Array.isArray(list)) {
      defect('S7', 'the closure snapshot carries no channel list', event);
    } else {
      for (const def of M20_CHANNELS) {
        const record = channels.get(def.id)!;
        const item = (list as unknown[]).find(
          (candidate) => isRecord(candidate) && candidate.channel_id === def.id,
        );

        if (!isRecord(item)) {
          defect(
            'S7',
            `the closure snapshot lacks the record of ${def.id}`,
            event,
            def.id,
          );
          continue;
        }

        const spontaneous = spontaneousOf(record);
        const credit = creditOf(record);
        const expected: Record<string, unknown> = {
          steps_done: record.steps_done,
          attempts: record.attempts.length,
          held: record.held !== null,
          released: record.released !== null,
          noticed: record.cue !== null,
          resumption:
            spontaneous !== null
              ? 'spontaneous'
              : credit !== null
                ? 'cued'
                : null,
          aligned: record.aligned !== null,
        };

        for (const [key, value] of Object.entries(expected)) {
          if (item[key] !== value) {
            defect(
              'S7',
              `the closure snapshot's ${key} of ${def.id} disagrees with the recount`,
              event,
              def.id,
            );
          }
        }
      }
    }
  }

  // ——— The row ———
  if (defects.length > 0) {
    return empty(
      'technical_failure',
      `integrity defect: ${defects[0].kind}`,
      null,
      {
        closure_reason: 'technical_failure',
        components: components(
          null,
          {
            integrity_defect: defects.map((item) => ({ ...item })),
          },
          true,
        ),
      },
    );
  }

  if (faultAfterFinal()) {
    flag(
      'a runtime fault after the result was final (recorded, not scored)',
      terminal === null ? null : terminal.event,
    );
  }

  if (!opened) {
    if (closedUnopened !== null) {
      return empty('no_eligible_event', 'not_opened', 'not_opened', {
        closure_reason:
          closedUnopened.reason === 'closed_at_review'
            ? 'closed_at_review'
            : 'route_departure',
      });
    }

    if (!presented) {
      return empty(
        'not_presented',
        'feed console never presented and never opened',
        'not_presented',
        { closure_reason: absenceRecord ? 'closed_at_review' : null },
      );
    }

    if (absenceRecord) {
      return empty('no_eligible_event', 'not_opened', 'not_opened', {
        closure_reason: 'closed_at_review',
      });
    }

    return empty('pending', 'presented_not_opened', 'not_opened');
  }

  void openedPosition;

  const closureReason: ClosureReason | null =
    terminal === null
      ? null
      : terminal.kind === 'completed'
        ? 'completed'
        : terminal.kind === 'fault'
          ? 'technical_failure'
          : terminal.reason === 'closed_at_review'
            ? 'closed_at_review'
            : 'route_departure';
  const statuses = M20_CHANNELS.map((def) => ({
    def,
    record: channels.get(def.id)!,
    status: statusOf(channels.get(def.id)!),
  }));
  const pending =
    terminal === null &&
    statuses.some(
      (item) =>
        item.status !== 'resumed' && item.status !== 'resumed_spontaneously',
    );

  if (pending) {
    return empty('pending', 'project_open', null);
  }

  const eligible = statuses.filter(
    (item) => item.status === 'resumed' || item.status === 'not_resumed',
  );
  const excluded = statuses.filter(
    (item) =>
      item.status === 'excluded_technical_failure' ||
      item.status === 'censored_review',
  );
  const censored = excluded.length > 0;
  const censorReason = censored
    ? excluded
        .map((item) =>
          item.status === 'excluded_technical_failure'
            ? `technical failure before a return on ${item.def.id}`
            : `review closure before a return on ${item.def.id}`,
        )
        .join('; ')
    : null;
  const numerator = eligible.filter((item) => item.status === 'resumed').length;
  const denominator = eligible.length;
  const zero: {
    disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>;
    reason: string;
    kind: NonresponseKind;
  } =
    terminal !== null && terminal.kind === 'fault' && !faultAfterFinal()
      ? {
          disposition: 'technical_failure',
          reason: 'technical_only',
          kind: 'technical_only',
        }
      : statuses.some((item) => item.status === 'censored_review')
        ? {
            disposition: 'interrupted',
            reason: 'censored_only',
            kind: 'censored_only',
          }
        : (() => {
            const kinds = statuses.map((item) =>
              item.status === 'resumed_spontaneously'
                ? 'resumed_before_cue'
                : item.status === 'begun_not_held'
                  ? 'no_hold'
                  : item.status === 'cue_not_presented'
                    ? 'cue_not_presented'
                    : item.status === 'not_begun'
                      ? 'not_begun'
                      : null,
            );
            const kind =
              KIND_PRECEDENCE.find((candidate) => kinds.includes(candidate)) ??
              'not_begun';

            return { disposition: 'no_eligible_event', reason: kind, kind };
          })();

  return [
    fractionFeature(
      'M20',
      spec,
      numerator,
      denominator,
      eligible.map((item) => item.def.id),
      supporting,
      { disposition: zero.disposition, reason: zero.reason },
      {
        closure_reason: closureReason,
        censored,
        censor_reason: censorReason,
        components: components(denominator === 0 ? zero.kind : null),
      },
    ),
  ];
});
