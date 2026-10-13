/**
 * M19 feature extractor (Unit 21): `m19_continuations` (primary) = eligible
 * lines with a further executed TRY after their first difficulty boundary,
 * over the eligible lines, planned denominator 2, recounted read-only from
 * the `proto_m19_lines_` events of the current page load alone. Per line the
 * boundary is the first attempt after which the line's executed settings
 * include all of its listed evidence settings (research-owner decision
 * D-U21-1 item 2, Option B — line 1 the all-ON SINGLE setting, line 2 dial
 * 4 SHUT and dial 5 SHUT); `continued` = an attempt with a higher index
 * exists. Eligible ⇔ boundary AND finish not `technical_failure` AND
 * (continued OR finish `set_aside` OR finish `shift_ended`) [items 7 and 9];
 * a boundary line finished `closed_at_review` without a continuation is
 * censored (excluded); a line finished `technical_failure` is excluded
 * whether or not a continuation was recorded before the fault (its
 * boundary and attempts stay in the components; case E21), lines finished
 * before the fault keeping their outcome (W1). The value is the NUMERATOR
 * COUNT with the eligible denominator beside it; a conditional denominator
 * of 1 is complete; a zero denominator exports `numerator: null`,
 * `denominator: 0` with the disposition of contract §3.8.
 *
 * Dispositions (decision D-U21-1 items 5, 8 and 9; contract §3.8): never
 * presented and never opened ⇒ `not_presented` (`interrupted` after a
 * reload); presented, never opened ⇒ `pending`, after `closed_unopened`
 * `no_eligible_event` (`not_opened`), never `declined`; the check never
 * recorded ⇒ `pending` while open, `no_eligible_event` (`check_not_reached`
 * / `check_not_completed`) once the panel closed; the check failed ⇒
 * `understanding_failed` (stable); lines in work ⇒ `pending`; the series
 * complete or closed ⇒ `observed` with the count when at least one line is
 * eligible, otherwise `technical_failure` (`technical_only`) when a fault
 * excluded a line, `interrupted` (`censored_only`) when the review censored
 * one, else `no_eligible_event` (`obstacle_not_reached` / `no_try`); the
 * reload hold-back ⇒ `interrupted`; a fault with no line in work ⇒ as above
 * when an eligible line exists, otherwise `technical_failure`
 * (`technical_only`). Precedence: `interrupted` > `technical_failure`
 * (integrity defect) > `understanding_failed` > `pending` > the closed
 * outcomes.
 *
 * Field classification (contract §9.4): a field is SCORED when the value,
 * eligibility, order or disposition depends on it, and every scored field is
 * integrity-checked — the rules S1–S7 — a contradiction making the row null
 * `technical_failure` with the defect named, never a silent repair; the
 * stored `reading` and `restored` of every attempt are scored (each must
 * equal the content rule's reading for that setting). DESCRIPTIVE fields
 * (input modes, timing, help, leaving, setting changes, refused TRYs, the
 * set-aside dialog records) never change the value or the disposition; an
 * inconsistency sets a named flag. Event order is read only from usable,
 * unique sequence numbers (register §5.259). Read-only; current page load
 * only; the legacy family `proto_m19_valve_*` is never read; no total
 * across items.
 */
import {
  isM19LineId,
  M19_CHECKS,
  M19_CONTENT_VERSION,
  M19_ENTRY_STATE_VERSION,
  M19_FAMILY,
  M19_FORM_ID,
  M19_LINE_ORDER,
  M19_LINES,
  M19_LINES_PLANNED,
  M19_OPPORTUNITY_ID,
  type M19Check,
  m19CheckOption,
  m19EvidenceAttemptIndices,
  type M19Line,
  type M19LineId,
  m19ObstacleEstablished,
  m19Reading,
  type M19Setting,
  m19SettingKey,
} from '../../pilot/windows/m19LinesContent';
import type { RawGameEvent } from '../../systems/EventLogger';
import type { ClosureReason } from '../protocol';
import { registerEntry } from '../registerV3';
import {
  absentFeature,
  emptyFeature,
  fractionFeature,
  meta,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureDisposition, FeatureRecord } from './types';

const FAMILY = M19_FAMILY;
const FINISHES = [
  'restored',
  'set_aside',
  'shift_ended',
  'closed_at_review',
  'technical_failure',
] as const;

type Finish = (typeof FINISHES)[number];
type NonresponseKind =
  | 'not_presented'
  | 'not_opened'
  | 'check_not_reached'
  | 'check_not_completed'
  | 'check_failed'
  | 'obstacle_not_reached'
  | 'no_try'
  | 'censored_only'
  | 'technical_only'
  | null;

interface Defect {
  rule: string;
  kind: string;
  sequence: number | null;
  line_id: string | null;
}

interface AttemptRecord {
  index: number;
  position: number;
  sequence: number;
  setting: M19Setting;
  reading: unknown;
  restored: unknown;
  after_boundary: unknown;
  since_boundary_focused_ms: number | null;
  input_mode: string | null;
}

interface BoundaryRecord {
  position: number;
  sequence: number;
  attempt_index: unknown;
  attempt_sequence: unknown;
  rule: unknown;
  evidence: unknown;
}

interface FinishRecord {
  position: number;
  sequence: number;
  finish: unknown;
  boundary_attempt_index: unknown;
  continued: unknown;
  restored_at_attempt: unknown;
  line_focused_ms: number | null;
  boundary_to_next_try_focused_ms: number | null;
  boundary_to_finish_focused_ms: number | null;
  help_consults: number | null;
  panel_leaves_after_boundary: number | null;
  continued_after_leaving: boolean | null;
  refused_tries_after_boundary: Record<string, number> | null;
}

interface LineRecord {
  def: M19Line;
  presented: boolean;
  presented_position: number | null;
  attempts: AttemptRecord[];
  boundaries: BoundaryRecord[];
  finishes: FinishRecord[];
  help_consults: number;
  panel_leaves: number;
  refused: Record<string, number>;
  refused_after_boundary: Record<string, number>;
}

interface AnswerRecord {
  position: number;
  sequence: number;
  check: M19Check | null;
  attempt: unknown;
  option_id: unknown;
  correct: unknown;
  input_mode: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
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

/** Ordering evidence (register §5.259): usable, distinct sequence numbers only. */
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

registerFeatureExtractor('M19', (events, context) => {
  const entry = registerEntry('M19');
  const spec = entry.features.find(
    (candidate) => candidate.feature_id === 'm19_continuations',
  )!;
  const family = events.filter(
    (event) =>
      (event.page_load_index === undefined ||
        event.page_load_index === context.pageLoadIndex) &&
      event.event_type.startsWith(FAMILY),
  );
  const suffixOf = (event: RawGameEvent) =>
    event.event_type.slice(FAMILY.length);
  const supporting = sequencesOf(family);

  // ——— The reload check of this load (the M18 precedent) ———
  const checks = family.filter(
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
  const absenceEstablished =
    checks.length > 0 &&
    checksCoherent &&
    checks.every(
      (event) =>
        meta<unknown>(event, 'prior_opening_absence_established') === true,
    );
  const reloadCheck = () => ({
    page_reloaded: context.reloaded,
    checked: checks.length > 0,
    prior_opening_found: checkFlag('prior_opening_found'),
    prior_briefing_found: checkFlag('prior_briefing_found'),
    history_continuous: checkFlag('history_continuous'),
    prior_opening_absence_established: absenceEstablished,
  });

  // ——— State ———
  let presented = false;
  let presentedSequence: number | null = null;
  let opened = false;
  let openedSequence: number | null = null;
  let stageAtOpen: string | null = null;
  let introAcknowledged = false;
  let closedUnopened: { reason: string; sequence: number } | null = null;
  let closedUnopenedCount = 0;
  const check = {
    presented: [false, false] as [boolean, boolean],
    presentedPositions: [null, null] as [number | null, number | null],
    answers: [] as AnswerRecord[],
    explanationPosition: null as number | null,
    recorded: [] as { position: number; status: unknown; sequence: number }[],
  };
  const lines = new Map<M19LineId, LineRecord>(
    M19_LINES.map((def) => [
      def.id,
      {
        def: def as M19Line,
        presented: false,
        presented_position: null,
        attempts: [],
        boundaries: [],
        finishes: [],
        help_consults: 0,
        panel_leaves: 0,
        refused: { already_tried: 0, settling: 0 },
        refused_after_boundary: { already_tried: 0, settling: 0 },
      },
    ]),
  );
  const realised: M19LineId[] = [];
  let seriesClosure: {
    kind: 'completed' | 'closed';
    reason: unknown;
    position: number;
    event: RawGameEvent;
  } | null = null;
  let seriesClosureCount = 0;
  const faults: {
    position: number;
    sequence: number;
    line_id: unknown;
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
    lineId: unknown = null,
  ) => {
    defects.push({
      rule,
      kind,
      sequence: event === null ? null : seq(event),
      line_id: typeof lineId === 'string' ? lineId : null,
    });
  };
  const flag = (kind: string, event: RawGameEvent | null) => {
    const sequence = event === null ? null : seq(event);

    flags.push(sequence === null ? kind : `${kind} (sequence ${sequence})`);
  };

  /** The first closure of the series: a completion, a series closure or a fault while open. */
  const closurePosition = (): number | null => {
    const fault = faults.find((entry) => !entry.after_closure);
    const candidates = [
      seriesClosure?.position ?? null,
      fault?.position ?? null,
    ]
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);

    return candidates[0] ?? null;
  };

  // ——— The recount per line (from the attempts alone) ———
  const recountBoundary = (
    record: LineRecord,
  ): { attempt_index: number; evidence: number[] } | null => {
    const executed: M19Setting[] = [];

    for (const attempt of record.attempts) {
      executed.push(attempt.setting);

      if (m19ObstacleEstablished(record.def, executed)) {
        return {
          attempt_index: attempt.index,
          evidence: m19EvidenceAttemptIndices(record.def, executed),
        };
      }
    }

    return null;
  };
  const recountContinued = (record: LineRecord): boolean | null => {
    const boundary = recountBoundary(record);

    return boundary === null
      ? null
      : record.attempts.length > boundary.attempt_index;
  };
  const finishOf = (record: LineRecord): Finish | null => {
    const finish = record.finishes[0]?.finish;

    return (FINISHES as readonly unknown[]).includes(finish)
      ? (finish as Finish)
      : null;
  };
  const restoredAt = (record: LineRecord): number | null =>
    record.attempts.find((attempt) => attempt.restored === true)?.index ?? null;

  // ——— Components ———
  const lineComponents = (record: LineRecord): Record<string, unknown> => {
    const boundary = recountBoundary(record);
    const continued = recountContinued(record);
    const finish = finishOf(record);
    const finishRecord = record.finishes[0] ?? null;
    const outcome = lineOutcome(record);
    const firstUnsuccessful =
      record.attempts.find((attempt) => attempt.restored === false)?.index ??
      null;

    return {
      line_id: record.def.id,
      line_index: record.def.index,
      presented: record.presented,
      attempts: record.attempts.length,
      refused_tries: { ...record.refused },
      boundary_attempt_index: boundary?.attempt_index ?? null,
      evidence_attempt_indices: boundary?.evidence ?? [],
      continued,
      tries_before_boundary:
        boundary === null ? record.attempts.length : boundary.attempt_index - 1,
      tries_after_boundary:
        boundary === null ? 0 : record.attempts.length - boundary.attempt_index,
      refused_tries_after_boundary: { ...record.refused_after_boundary },
      changed_second_control_after_boundary:
        boundary === null
          ? null
          : record.attempts
              .filter((attempt) => attempt.index > boundary.attempt_index)
              .some((attempt) =>
                (
                  record.def.second_control_changed as (
                    s: M19Setting,
                  ) => boolean
                )(attempt.setting),
              ),
      restored: restoredAt(record) !== null,
      restored_at_attempt: restoredAt(record),
      finish,
      eligible: outcome.state === 'eligible',
      censored: outcome.state === 'censored' || outcome.state === 'technical',
      excluded_reason:
        outcome.state === 'technical'
          ? 'technical_failure'
          : outcome.state === 'censored'
            ? 'closed_at_review'
            : null,
      line_focused_ms: finishRecord?.line_focused_ms ?? null,
      boundary_to_next_try_focused_ms:
        finishRecord?.boundary_to_next_try_focused_ms ?? null,
      boundary_to_finish_focused_ms:
        finishRecord?.boundary_to_finish_focused_ms ?? null,
      help_consults: record.help_consults,
      panel_leaves_after_boundary: record.panel_leaves,
      continued_after_leaving: finishRecord?.continued_after_leaving ?? null,
      first_unsuccessful_try_index: firstUnsuccessful,
      continued_after_first_unsuccessful:
        firstUnsuccessful === null
          ? null
          : record.attempts.length > firstUnsuccessful,
    };
  };

  const checkStatus = (): string | null => {
    const status = check.recorded[0]?.status;

    return status === 'pass_first' ||
      status === 'pass_after_explanation' ||
      status === 'fail'
      ? status
      : null;
  };

  const components = (
    nonresponse: NonresponseKind,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    administration_version: M19_ENTRY_STATE_VERSION,
    form_id: M19_FORM_ID,
    content_version: M19_CONTENT_VERSION,
    presented_in_current_load: presented,
    presented_sequence: presentedSequence,
    opened,
    opened_sequence: openedSequence,
    stage_at_open: stageAtOpen,
    intro_acknowledged: introAcknowledged,
    observations_share_one_episode: true,
    check: {
      status: checkStatus(),
      questions_presented: check.presented.filter(Boolean).length,
      explanation_shown: check.explanationPosition !== null,
      answers: check.answers.map((answer) => ({
        check_id: answer.check?.id ?? null,
        attempt: numberOrNull(answer.attempt),
        option_id: stringOrNull(answer.option_id),
        correct: booleanOrNull(answer.correct),
        input_mode: answer.input_mode,
      })),
    },
    lines: M19_LINES.map((def) => lineComponents(lines.get(def.id)!)),
    nonresponse_kind: nonresponse,
    help_consults: help,
    panel_leaves: leaves,
    reopenings,
    faults: faults.map((fault) => ({
      sequence: fault.sequence,
      line_id: stringOrNull(fault.line_id),
      detail: fault.detail,
      after_closure: fault.after_closure,
    })),
    reload_check: reloadCheck(),
    closed_unopened: closedUnopened,
    // The series closure as the family wrote it (`shift_ended` is exported
    // on the row as the framework's `route_departure`).
    series_closure_reason:
      seriesClosure === null
        ? null
        : seriesClosure.kind === 'completed'
          ? 'completed'
          : typeof seriesClosure.reason === 'string'
            ? seriesClosure.reason
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
    emptyFeature('M19', spec, disposition, reason, {
      supporting_sequences: supporting,
      components: components(nonresponse),
      ...extra,
    }),
  ];

  if (family.length === 0) {
    return [
      absentFeature('M19', spec, context, 'coupling panel never presented', {
        components: components('not_presented'),
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

  // Held back after a reload: the kit's technical failure with a detail
  // beginning `reload` and no opening of its own in this load.
  const heldBack =
    family.some(
      (event) =>
        suffixOf(event) === 'technical_failure' &&
        String(meta<unknown>(event, 'detail') ?? '').startsWith('reload'),
    ) && !family.some((event) => suffixOf(event) === 'opportunity_opened');

  if (heldBack) {
    for (const event of family) {
      if (suffixOf(event) === 'presented') {
        presented = true;
        presentedSequence = event.sequence ?? null;
      }
    }

    return empty(
      'interrupted',
      'coupling panel opened in an earlier page load; not re-run after the reload',
      null,
      { components: components(null, { held_back_after_reload: true }) },
    );
  }

  if (
    context.reloaded &&
    !family.some((event) => suffixOf(event) === 'opportunity_opened')
  ) {
    for (const event of family) {
      if (suffixOf(event) === 'presented') {
        presented = true;
        presentedSequence = event.sequence ?? null;
      }
    }

    // Contract §3.8 row 1: a later page load without an opening of its own
    // is `interrupted` unless this load presented the panel itself AND the
    // absence of an earlier opening is established — only then does the
    // ordinary presented-never-opened reading apply.
    if (!absenceEstablished || !presented) {
      return empty(
        'interrupted',
        absenceEstablished
          ? 'no current-load panel evidence after a reload: coupling panel neither presented nor opened in this page load (the absence of an earlier opening established)'
          : 'no current-load panel evidence after a reload: coupling panel not opened in this page load and the absence of an earlier opening not established',
        null,
      );
    }
  }

  // Everything below compares positions.
  const order = orderDefect(family);

  if (order !== null) {
    return empty('technical_failure', `integrity defect: ${order}`, null, {
      closure_reason: 'technical_failure',
      components: components(null, {
        integrity_defect: [
          { rule: 'S2', kind: order, sequence: null, line_id: null },
        ],
      }),
    });
  }

  const ordered = family
    .slice()
    .sort((a, b) => (a.sequence as number) - (b.sequence as number));

  /** S1: the entry snapshot's declarations against the approved administration. */
  const validateSnapshot = (snapshot: unknown, event: RawGameEvent) => {
    if (!isRecord(snapshot)) {
      defect('S1', 'the entry snapshot is not a record', event);

      return;
    }

    if (snapshot.form_id !== M19_FORM_ID) {
      defect('S1', "the entry snapshot's form_id is not m19-form-1", event);
    }

    if (snapshot.content_version !== M19_CONTENT_VERSION) {
      defect(
        'S1',
        "the entry snapshot's content_version is not m19-content-v2",
        event,
      );
    }

    if (snapshot.lines_planned !== M19_LINES_PLANNED) {
      defect(
        'S1',
        "the entry snapshot's lines_planned is not the number 2",
        event,
      );
    }

    if (!sameStringList(snapshot.line_order, M19_LINE_ORDER)) {
      defect(
        'S1',
        "the entry snapshot's line order disagrees with the content",
        event,
      );
    }
  };

  // ——— The walk ———
  for (const [position, event] of ordered.entries()) {
    const suffix = suffixOf(event);
    const closedAt = closurePosition();
    const closed = closedAt !== null && closedAt < position;

    if (
      meta<unknown>(event, 'entry_state_version') !== M19_ENTRY_STATE_VERSION
    ) {
      defect('S1', 'an event of the family carries an unknown version', event);
      continue;
    }

    if (meta<unknown>(event, 'opportunity_id') !== M19_OPPORTUNITY_ID) {
      defect(
        'S1',
        'an event of the family carries another opportunity id',
        event,
      );
      continue;
    }

    const stamped =
      suffix === 'line_presented' ||
      suffix === 'attempt' ||
      suffix === 'difficulty_boundary' ||
      suffix === 'line_finished' ||
      suffix === 'check_answered';

    if (stamped) {
      if (meta<unknown>(event, 'form_id') !== M19_FORM_ID) {
        defect('S1', `a ${suffix} record carries an unknown form`, event);
        continue;
      }

      if (meta<unknown>(event, 'content_version') !== M19_CONTENT_VERSION) {
        defect(
          'S1',
          `a ${suffix} record carries an unknown content version`,
          event,
        );
        continue;
      }
    }

    const lineId = meta<unknown>(event, 'line_id');
    const known = isM19LineId(lineId) ? lines.get(lineId)! : null;
    const sequence = event.sequence as number;

    switch (suffix) {
      case 'presented':
        presented = true;
        presentedSequence = sequence;
        break;
      case 'opportunity_opened': {
        if (opened) {
          defect('S3', 'the panel was opened twice', event);
          break;
        }

        opened = true;
        openedSequence = sequence;

        const snapshot = meta<unknown>(event, 'entry_state_snapshot');

        validateSnapshot(snapshot, event);
        stageAtOpen = isRecord(snapshot) ? stringOrNull(snapshot.stage) : null;
        break;
      }
      case 'closed_unopened': {
        closedUnopenedCount += 1;

        const reason = meta<unknown>(event, 'closure_reason');

        if (reason !== 'shift_ended' && reason !== 'closed_at_review') {
          defect(
            'S3',
            'a closed_unopened record without a known reason',
            event,
          );
        }

        if (closedUnopenedCount > 1) {
          defect('S3', 'the never-opened panel was closed twice', event);
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
      case 'series_reopened':
      case 'panel_left': {
        if (!opened) {
          flag(`a ${suffix} record before the opening`, event);
        }

        if (suffix === 'series_reopened') {
          reopenings += 1;
        } else {
          leaves += 1;

          if (known !== null && recountBoundary(known) !== null) {
            known.panel_leaves += 1;
          }
        }

        if (typeof meta<unknown>(event, 'view') !== 'string') {
          flag(`a ${suffix} record without a view`, event);
        }

        break;
      }
      case 'check_presented': {
        const checkId = meta<unknown>(event, 'check_id');
        const attempt = meta<unknown>(event, 'attempt');
        const at =
          checkId === 'm19_chk_q1' ? 0 : checkId === 'm19_chk_q2' ? 1 : null;

        if (at === null || attempt !== at + 1) {
          defect('S7', 'a check presentation names no known question', event);
          break;
        }

        if (!opened) {
          defect('S7', 'the check was presented before the opening', event);
        }

        if (at === 1 && check.explanationPosition === null) {
          defect(
            'S7',
            'the recheck was presented before the explanation',
            event,
          );
        }

        check.presented[at] = true;
        check.presentedPositions[at] ??= position;
        break;
      }
      case 'option_drafted': {
        const checkId = meta<unknown>(event, 'check_id');
        const optionId = meta<unknown>(event, 'option_id');

        if (checkId !== 'm19_chk_q1' && checkId !== 'm19_chk_q2') {
          flag('a draft record names no known question', event);
        } else if (
          optionId !== null &&
          m19CheckOption(checkId, optionId) === undefined
        ) {
          flag('a draft record names no option of its question', event);
        }

        break;
      }
      case 'check_answered': {
        const checkId = meta<unknown>(event, 'check_id');
        const def =
          checkId === 'm19_chk_q1'
            ? M19_CHECKS[0]
            : checkId === 'm19_chk_q2'
              ? M19_CHECKS[1]
              : null;
        const record: AnswerRecord = {
          position,
          sequence,
          check: def,
          attempt: meta<unknown>(event, 'attempt'),
          option_id: meta<unknown>(event, 'option_id'),
          correct: meta<unknown>(event, 'correct'),
          input_mode: stringOrNull(meta<unknown>(event, 'input_mode')),
        };

        if (def === null) {
          defect('S7', 'an answer names no known question', event);
          check.answers.push(record);
          break;
        }

        if (record.attempt !== def.attempt) {
          defect(
            'S7',
            "an answer's attempt disagrees with its question",
            event,
          );
        }

        if (check.answers.length >= 2) {
          defect('S7', 'a third check answer', event);
        } else if (check.answers.length === 0 && def.attempt !== 1) {
          defect('S7', 'the recheck was answered before question 1', event);
        } else if (check.answers.length === 1) {
          const first = check.answers[0];

          if (def.attempt !== 2) {
            defect('S7', 'question 1 was answered twice', event);
          }

          if (first.correct !== false) {
            defect(
              'S7',
              'the recheck was answered after a right first answer',
              event,
            );
          }

          if (check.explanationPosition === null) {
            defect(
              'S7',
              'the recheck was answered before the explanation',
              event,
            );
          }
        }

        if (!check.presented[def.attempt - 1]) {
          defect('S7', 'an answer to a question never presented', event);
        }

        const option = m19CheckOption(def.id, record.option_id);

        if (option === undefined) {
          defect('S7', 'an answer names no option of its question', event);
        } else if (record.correct !== (option.id === def.key_option_id)) {
          defect('S7', "an answer's stored outcome contradicts the key", event);
        }

        if (check.recorded.length > 0) {
          defect('S7', 'an answer after the check was recorded', event);
        }

        if (closed) {
          defect('S7', 'an answer after the series closed', event);
        }

        check.answers.push(record);
        break;
      }
      case 'explanation_shown':
        if (check.explanationPosition !== null) {
          defect('S7', 'the explanation was shown twice', event);
          break;
        }

        if (check.answers.length !== 1 || check.answers[0].correct !== false) {
          defect(
            'S7',
            'the explanation was shown without a wrong first answer',
            event,
          );
        }

        check.explanationPosition = position;
        break;
      case 'check_recorded': {
        const status = meta<unknown>(event, 'status');

        if (check.recorded.length > 0) {
          defect('S7', 'the check was recorded twice', event);
        }

        const first = check.answers[0];
        const second = check.answers[1];
        const expected =
          first !== undefined && first.correct === true
            ? 'pass_first'
            : second !== undefined && second.correct === true
              ? 'pass_after_explanation'
              : second !== undefined && second.correct === false
                ? 'fail'
                : null;

        if (expected === null || status !== expected) {
          defect(
            'S7',
            'the recorded check status disagrees with the answers',
            event,
          );
        }

        check.recorded.push({ position, status, sequence });
        break;
      }
      case 'line_presented': {
        if (known === null) {
          defect(
            'S3',
            'a line presentation names an unknown line',
            event,
            lineId,
          );
          break;
        }

        if (!opened) {
          defect(
            'S3',
            'a line was presented before the opening',
            event,
            lineId,
          );
        }

        if (closed) {
          defect(
            'S3',
            'a line was presented after the series closed',
            event,
            lineId,
          );
        }

        if (known.presented) {
          defect('S3', 'a line was presented twice', event, lineId);
          break;
        }

        if (known.def.id !== M19_LINE_ORDER[realised.length]) {
          defect(
            'S3',
            'a line was presented out of the assigned order',
            event,
            lineId,
          );
        }

        if (meta<unknown>(event, 'realised_position') !== realised.length + 1) {
          defect(
            'S3',
            "a line presentation's realised position disagrees with its order",
            event,
            lineId,
          );
        }

        if (realised.length === 0 && check.recorded.length === 0) {
          defect(
            'S3',
            'line 1 was presented before the check was recorded',
            event,
            lineId,
          );
        }

        if (realised.length === 1) {
          const previous = lines.get(realised[0])!;

          if (previous.finishes.length === 0) {
            defect(
              'S3',
              "line 2 was presented before line 1's finish",
              event,
              lineId,
            );
          }
        }

        if (!known.def.isSetting(meta<unknown>(event, 'starting_setting'))) {
          flag(
            'a line presentation without a well-formed starting setting',
            event,
          );
        }

        known.presented = true;
        known.presented_position = position;
        realised.push(known.def.id);
        break;
      }
      case 'setting_changed':
      case 'try_refused': {
        if (known === null) {
          flag(`a ${suffix} record names no known line`, event);
          break;
        }

        if (suffix === 'try_refused') {
          const reason = meta<unknown>(event, 'reason');

          if (reason !== 'already_tried' && reason !== 'settling') {
            flag('a refused TRY without a known reason', event);
            break;
          }

          known.refused[reason] += 1;

          if (recountBoundary(known) !== null) {
            known.refused_after_boundary[reason] += 1;
          }

          if (
            meta<unknown>(event, 'after_boundary') !==
            (recountBoundary(known) !== null)
          ) {
            flag(
              "a refused TRY's after_boundary flag disagrees with the recount",
              event,
            );
          }
        }

        break;
      }
      case 'attempt': {
        if (known === null) {
          defect('S4', 'an attempt names an unknown line', event, lineId);
          break;
        }

        const setting = meta<unknown>(event, 'setting');

        if (!known.def.isSetting(setting)) {
          defect(
            'S4',
            'an attempt without a well-formed setting',
            event,
            lineId,
          );
          break;
        }

        const index = meta<unknown>(event, 'attempt_index');

        if (index !== known.attempts.length + 1) {
          defect('S4', 'an attempt index out of sequence', event, lineId);
        }

        if (!known.presented) {
          defect(
            'S4',
            'an attempt before its line was presented',
            event,
            lineId,
          );
        }

        if (known.finishes.length > 0) {
          defect('S6', 'an attempt after its line was finished', event, lineId);
        }

        if (closed) {
          defect('S6', 'an attempt after the series closed', event, lineId);
        }

        const key = m19SettingKey(known.def, setting as M19Setting);

        if (
          known.attempts.some(
            (attempt) => m19SettingKey(known.def, attempt.setting) === key,
          )
        ) {
          defect('S4', 'a setting was executed twice on a line', event, lineId);
        }

        const reading = m19Reading(known.def, setting as M19Setting);

        if (meta<unknown>(event, 'reading') !== reading) {
          defect(
            'S4',
            "an attempt's stored reading contradicts the content rule",
            event,
            lineId,
          );
        }

        if (meta<unknown>(event, 'restored') !== (reading === 'OK')) {
          defect(
            'S4',
            "an attempt's stored restored flag contradicts the content rule",
            event,
            lineId,
          );
        }

        const boundaryBefore = recountBoundary(known) !== null;

        if (meta<unknown>(event, 'after_boundary') !== boundaryBefore) {
          flag(
            "an attempt's after_boundary flag disagrees with the recount",
            event,
          );
        }

        const since = numberOrNull(
          meta<unknown>(event, 'since_boundary_focused_ms'),
        );

        if (since !== null && since < 0) {
          flag('a negative focused interval on an attempt', event);
        }

        known.attempts.push({
          index: typeof index === 'number' ? index : known.attempts.length + 1,
          position,
          sequence,
          setting: setting as M19Setting,
          reading: meta<unknown>(event, 'reading'),
          restored: meta<unknown>(event, 'restored'),
          after_boundary: meta<unknown>(event, 'after_boundary'),
          since_boundary_focused_ms: since,
          input_mode: stringOrNull(meta<unknown>(event, 'input_mode')),
        });
        break;
      }
      case 'difficulty_boundary': {
        if (known === null) {
          defect('S5', 'a boundary names an unknown line', event, lineId);
          break;
        }

        known.boundaries.push({
          position,
          sequence,
          attempt_index: meta<unknown>(event, 'attempt_index'),
          attempt_sequence: meta<unknown>(event, 'attempt_sequence'),
          rule: meta<unknown>(event, 'rule'),
          evidence: meta<unknown>(event, 'evidence_attempt_indices'),
        });
        break;
      }
      case 'set_aside_requested':
      case 'set_aside_cancelled':
        if (known === null) {
          flag(`a ${suffix} record names no known line`, event);
        }

        break;
      case 'help_consulted': {
        help += 1;

        if (typeof meta<unknown>(event, 'view') !== 'string') {
          flag('a help record without a view', event);
        }

        if (known !== null) {
          known.help_consults += 1;
        }

        break;
      }
      case 'line_finished': {
        if (known === null) {
          defect('S6', 'a line finish names an unknown line', event, lineId);
          break;
        }

        const finish = meta<unknown>(event, 'finish');

        if (!(FINISHES as readonly unknown[]).includes(finish)) {
          defect('S6', 'a line finish without a known kind', event, lineId);
        }

        if (!known.presented) {
          defect(
            'S6',
            'a line finished before it was presented',
            event,
            lineId,
          );
        }

        if (known.finishes.length > 0) {
          defect('S6', 'a line was finished twice', event, lineId);
        }

        if (
          closed &&
          finish !== 'shift_ended' &&
          finish !== 'closed_at_review'
        ) {
          defect(
            'S6',
            'a line finished after the series closed',
            event,
            lineId,
          );
        }

        const record: FinishRecord = {
          position,
          sequence,
          finish,
          boundary_attempt_index: meta<unknown>(
            event,
            'boundary_attempt_index',
          ),
          continued: meta<unknown>(event, 'continued'),
          restored_at_attempt: meta<unknown>(event, 'restored_at_attempt'),
          line_focused_ms: numberOrNull(
            meta<unknown>(event, 'line_focused_ms'),
          ),
          boundary_to_next_try_focused_ms: numberOrNull(
            meta<unknown>(event, 'boundary_to_next_try_focused_ms'),
          ),
          boundary_to_finish_focused_ms: numberOrNull(
            meta<unknown>(event, 'boundary_to_finish_focused_ms'),
          ),
          help_consults: numberOrNull(meta<unknown>(event, 'help_consults')),
          panel_leaves_after_boundary: numberOrNull(
            meta<unknown>(event, 'panel_leaves_after_boundary'),
          ),
          continued_after_leaving: booleanOrNull(
            meta<unknown>(event, 'continued_after_leaving'),
          ),
          refused_tries_after_boundary: isRecord(
            meta<unknown>(event, 'refused_tries_after_boundary'),
          )
            ? (meta<Record<string, number>>(
                event,
                'refused_tries_after_boundary',
              ) ?? null)
            : null,
        };

        for (const value of [
          record.line_focused_ms,
          record.boundary_to_next_try_focused_ms,
          record.boundary_to_finish_focused_ms,
        ]) {
          if (value !== null && value < 0) {
            flag('a negative focused interval on a line finish', event);
            break;
          }
        }

        known.finishes.push(record);
        break;
      }
      case 'series_completed':
      case 'series_closed': {
        seriesClosureCount += 1;

        if (seriesClosureCount > 1) {
          defect('S6', 'the series was closed twice', event);
          break;
        }

        const reason = meta<unknown>(event, 'closure_reason');

        if (suffix === 'series_completed' && reason !== 'completed') {
          defect(
            'S6',
            "a completion record's closure reason is not completed",
            event,
          );
        }

        if (
          suffix === 'series_closed' &&
          reason !== 'shift_ended' &&
          reason !== 'closed_at_review'
        ) {
          defect('S6', 'a series closure without a known reason', event);
        }

        if (!opened) {
          defect('S6', 'the series closed before the opening', event);
        }

        seriesClosure = {
          kind: suffix === 'series_completed' ? 'completed' : 'closed',
          reason,
          position,
          event,
        };
        break;
      }
      case 'technical_failure': {
        const detail = String(
          meta<unknown>(event, 'detail') ?? 'technical failure',
        );
        const after = closurePosition() !== null;

        if (!opened) {
          // A fault before any opening leaves no scored evidence to void.
          flag('a fault record before the opening', event);
          break;
        }

        faults.push({
          position,
          sequence,
          line_id: meta<unknown>(event, 'line_id'),
          detail,
          after_closure: after,
        });
        break;
      }
      case 'window_closed':
      case 'prior_load_checked':
        break;
      default:
        flag(`an unknown record of the family: ${suffix}`, event);
        break;
    }
  }

  // ——— Post-walk integrity (S3, S5, S6) ———
  if (closedUnopened !== null && opened) {
    defect('S3', 'closed_unopened together with an opening', null);
  }

  const openFault = faults.find((fault) => !fault.after_closure) ?? null;

  for (const def of M19_LINES) {
    const record = lines.get(def.id)!;
    const boundary = recountBoundary(record);
    const stored = record.boundaries;
    const finish = record.finishes[0] ?? null;

    // S5: exactly one boundary iff the obstacle rule holds.
    if (boundary === null) {
      if (stored.length > 0) {
        defect(
          'S5',
          'a boundary on a line whose executed settings never met the obstacle',
          null,
          def.id,
        );
      }
    } else {
      if (stored.length === 0) {
        defect(
          'S5',
          'a line met its obstacle without a boundary record',
          null,
          def.id,
        );
      } else if (stored.length > 1) {
        defect('S5', 'a second boundary on one line', null, def.id);
      } else {
        const only = stored[0];
        const attempt = record.attempts.find(
          (candidate) => candidate.index === boundary.attempt_index,
        )!;

        if (only.attempt_index !== boundary.attempt_index) {
          defect(
            'S5',
            "a boundary's attempt index is not the first attempt that completed the obstacle",
            null,
            def.id,
          );
        }

        if (only.attempt_sequence !== attempt.sequence) {
          defect(
            'S5',
            "a boundary's attempt sequence is not that attempt's sequence",
            null,
            def.id,
          );
        }

        if (only.rule !== 'designed_obstacle') {
          defect(
            'S5',
            "a boundary's rule is not designed_obstacle",
            null,
            def.id,
          );
        }

        if (!sameNumberList(only.evidence, boundary.evidence)) {
          defect(
            'S5',
            "a boundary's evidence indices disagree with the recount",
            null,
            def.id,
          );
        }

        if (only.position < attempt.position) {
          defect('S5', 'a boundary before its attempt', null, def.id);
        }

        const later = record.attempts.find(
          (candidate) => candidate.index > boundary.attempt_index,
        );

        if (later !== undefined && only.position > later.position) {
          defect('S5', 'a boundary after a later attempt', null, def.id);
        }

        if (finish !== null && only.position > finish.position) {
          defect('S5', "a boundary after its line's finish", null, def.id);
        }
      }
    }

    // S6: the finish against the attempts and the series closure.
    if (finish !== null) {
      const last = record.attempts[record.attempts.length - 1] ?? null;
      const lastRestored = last !== null && last.restored === true;

      if (finish.finish === 'restored') {
        if (!lastRestored) {
          defect(
            'S6',
            'a line finished restored without a restoring last attempt',
            null,
            def.id,
          );
        } else if (finish.position !== last.position + 1) {
          defect(
            'S6',
            'a restored finish not immediately after its attempt',
            null,
            def.id,
          );
        }
      } else if (lastRestored) {
        defect(
          'S6',
          'a restoring attempt without the restored finish',
          null,
          def.id,
        );
      }

      if (
        finish.finish === 'shift_ended' ||
        finish.finish === 'closed_at_review'
      ) {
        if (
          seriesClosure === null ||
          seriesClosure.kind !== 'closed' ||
          seriesClosure.reason !== finish.finish
        ) {
          defect(
            'S6',
            `a finish ${finish.finish} without a series closure of the same reason`,
            null,
            def.id,
          );
        } else if (finish.position > seriesClosure.position) {
          defect(
            'S6',
            'a closure finish after the series closure',
            null,
            def.id,
          );
        }

        if (last !== null && finish.position < last.position) {
          defect(
            'S6',
            'a closure finish before an attempt of its line',
            null,
            def.id,
          );
        }
      }

      if (finish.finish === 'technical_failure') {
        const named = faults.find(
          (fault) => fault.line_id === def.id && !fault.after_closure,
        );

        if (named === undefined) {
          defect(
            'S6',
            'a finish technical_failure without the kit record naming the line',
            null,
            def.id,
          );
        }
      }

      if (finish.boundary_attempt_index !== (boundary?.attempt_index ?? null)) {
        defect(
          'S6',
          "a finish's boundary index disagrees with the recount",
          null,
          def.id,
        );
      }

      if (finish.continued !== recountContinued(record)) {
        defect(
          'S6',
          "a finish's continued flag disagrees with the recount",
          null,
          def.id,
        );
      }

      if (finish.restored_at_attempt !== restoredAt(record)) {
        flag(
          `the restored_at_attempt of ${def.id} disagrees with the recount`,
          null,
        );
      }
    } else if (record.attempts.some((attempt) => attempt.restored === true)) {
      defect(
        'S6',
        'a restoring attempt without the restored finish',
        null,
        def.id,
      );
    }

    const named = faults.find(
      (fault) => fault.line_id === def.id && !fault.after_closure,
    );

    if (named !== undefined && finish?.finish !== 'technical_failure') {
      defect(
        'S6',
        "a kit fault naming a line without that line's finish technical_failure",
        null,
        def.id,
      );
    }
  }

  // The series closure snapshot against the recount (S6).
  if (seriesClosure !== null) {
    const event = seriesClosure.event;
    const list = meta<unknown>(event, 'lines');

    if (meta<unknown>(event, 'lines_planned') !== M19_LINES_PLANNED) {
      defect(
        'S6',
        "the closure snapshot's planned line count is not the number 2",
        event,
      );
    }

    if (meta<unknown>(event, 'check_status') !== checkStatus()) {
      defect(
        'S6',
        "the closure snapshot's check status disagrees with the recount",
        event,
      );
    }

    if (seriesClosure.kind === 'completed') {
      for (const def of M19_LINES) {
        const record = lines.get(def.id)!;

        if (
          record.finishes.length === 0 ||
          record.finishes[0].position > seriesClosure.position
        ) {
          defect('S6', 'the completion precedes a line finish', event, def.id);
        }
      }
    }

    if (!Array.isArray(list)) {
      defect('S6', 'the closure snapshot carries no line list', event);
    } else {
      for (const def of M19_LINES) {
        const record = lines.get(def.id)!;
        const item = (list as unknown[]).find(
          (candidate) => isRecord(candidate) && candidate.line_id === def.id,
        );

        if (!isRecord(item)) {
          defect(
            'S6',
            `the closure snapshot lacks the record of ${def.id}`,
            event,
            def.id,
          );
          continue;
        }

        const expected = {
          presented: record.presented,
          attempts: record.attempts.length,
          boundary_attempt_index:
            recountBoundary(record)?.attempt_index ?? null,
          continued: recountContinued(record),
          finish: finishOf(record),
        };

        for (const [key, value] of Object.entries(expected)) {
          if (item[key] !== value) {
            defect(
              'S6',
              `the closure snapshot's ${key} of ${def.id} disagrees with the recount`,
              event,
              def.id,
            );
          }
        }
      }
    }
  }

  // Every presented, unfinished line at a series closure must have been finished.
  if (seriesClosure !== null && seriesClosure.kind === 'closed') {
    for (const def of M19_LINES) {
      const record = lines.get(def.id)!;

      if (record.presented && record.finishes.length === 0) {
        defect(
          'S6',
          'a presented line without a finish at the series closure',
          seriesClosure.event,
          def.id,
        );
      }
    }
  }

  // A fault while a line was in work must name it (S6, the other direction).
  if (openFault !== null && openFault.line_id === null) {
    for (const def of M19_LINES) {
      const record = lines.get(def.id)!;

      if (
        record.presented &&
        (record.finishes.length === 0 ||
          record.finishes[0].position > openFault.position)
      ) {
        defect(
          'S6',
          'a kit fault without a line while a line was in work',
          null,
          def.id,
        );
      }
    }
  }

  // ——— Per-line outcomes ———
  function lineOutcome(record: LineRecord): {
    state:
      | 'not_presented'
      | 'open'
      | 'no_try'
      | 'no_boundary'
      | 'eligible'
      | 'censored'
      | 'technical';
    continued: 0 | 1 | null;
  } {
    if (!record.presented) {
      return { state: 'not_presented', continued: null };
    }

    const finish = finishOf(record);
    const boundary = recountBoundary(record);

    if (finish === 'technical_failure') {
      return { state: 'technical', continued: null };
    }

    if (boundary === null) {
      if (finish === null) {
        return { state: 'open', continued: null };
      }

      return {
        state: record.attempts.length === 0 ? 'no_try' : 'no_boundary',
        continued: null,
      };
    }

    if (recountContinued(record) === true) {
      return { state: 'eligible', continued: 1 };
    }

    if (finish === 'set_aside' || finish === 'shift_ended') {
      return { state: 'eligible', continued: 0 };
    }

    if (finish === 'closed_at_review') {
      return { state: 'censored', continued: null };
    }

    return { state: 'open', continued: null };
  }

  // ——— The row ———
  if (defects.length > 0) {
    return empty(
      'technical_failure',
      `integrity defect: ${defects[0].kind}`,
      null,
      {
        closure_reason: 'technical_failure',
        components: components(null, {
          integrity_defect: defects.map((entry) => ({ ...entry })),
        }),
      },
    );
  }

  if (!opened) {
    if (!presented) {
      return empty(
        'not_presented',
        'coupling panel never presented and never opened',
        'not_presented',
      );
    }

    if (closedUnopened !== null) {
      return empty('no_eligible_event', 'not_opened', 'not_opened', {
        closure_reason:
          closedUnopened.reason === 'closed_at_review'
            ? 'closed_at_review'
            : 'route_departure',
      });
    }

    return empty('pending', 'presented_not_opened', 'not_opened');
  }

  const closureReason: ClosureReason | null =
    seriesClosure !== null
      ? seriesClosure.kind === 'completed'
        ? 'completed'
        : seriesClosure.reason === 'closed_at_review'
          ? 'closed_at_review'
          : 'route_departure'
      : openFault !== null
        ? 'technical_failure'
        : null;
  const seriesFinal = seriesClosure !== null || openFault !== null;
  const status = checkStatus();

  if (status === 'fail') {
    return empty('understanding_failed', 'check_failed', 'check_failed', {
      closure_reason: closureReason,
    });
  }

  if (status === null) {
    if (openFault !== null) {
      return empty(
        'technical_failure',
        `technical_only: ${openFault.detail}`,
        'technical_only',
        {
          closure_reason: 'technical_failure',
          censored: false,
          censor_reason: null,
        },
      );
    }

    const reason = check.presented[0]
      ? 'check_not_completed'
      : 'check_not_reached';

    return seriesFinal
      ? empty('no_eligible_event', reason, reason, {
          closure_reason: closureReason,
        })
      : empty('pending', 'check_open', reason);
  }

  const outcomes = M19_LINES.map((def) => ({
    def,
    record: lines.get(def.id)!,
    ...lineOutcome(lines.get(def.id)!),
  }));

  if (!seriesFinal) {
    return empty('pending', 'lines_in_work', null);
  }

  const eligible = outcomes.filter((outcome) => outcome.state === 'eligible');
  const technical = outcomes.filter((outcome) => outcome.state === 'technical');
  const censoredLines = outcomes.filter(
    (outcome) => outcome.state === 'censored',
  );
  const excluded = [...technical, ...censoredLines].sort(
    (a, b) => a.def.index - b.def.index,
  );
  const censored = excluded.length > 0;
  const censorReason = censored
    ? excluded[0].state === 'technical'
      ? `technical failure on ${excluded[0].def.id}`
      : `review closed ${excluded[0].def.id} without a further TRY`
    : null;
  const numerator = eligible.reduce(
    (sum, outcome) => sum + (outcome.continued ?? 0),
    0,
  );
  const denominator = eligible.length;
  const anyTry = outcomes.some(
    (outcome) => outcome.record.presented && outcome.record.attempts.length > 0,
  );
  const zero: {
    disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>;
    reason: string;
    kind: NonresponseKind;
  } =
    // A fault — on a line in work or with no line in work (contract §3.8
    // "fault with no line in work": never a non-response disposition when
    // no eligible line exists).
    technical.length > 0 || openFault !== null
      ? {
          disposition: 'technical_failure',
          reason: 'technical_only',
          kind: 'technical_only',
        }
      : censoredLines.length > 0
        ? {
            disposition: 'interrupted',
            reason: 'censored_only',
            kind: 'censored_only',
          }
        : anyTry
          ? {
              disposition: 'no_eligible_event',
              reason: 'obstacle_not_reached',
              kind: 'obstacle_not_reached',
            }
          : {
              disposition: 'no_eligible_event',
              reason: 'no_try',
              kind: 'no_try',
            };

  return [
    fractionFeature(
      'M19',
      spec,
      numerator,
      denominator,
      eligible.map((outcome) => outcome.def.id),
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
