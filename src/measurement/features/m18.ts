/**
 * M18 feature extractor (Unit 20): `m18_correct_first_diagnoses` (primary)
 * = cases whose FIRST `diagnosis` response is the keyed part, over the
 * cases with a diagnosis first response (a part or CANNOT SOLVE) in the
 * current page load, planned denominator 3; and
 * `m18_correct_consequence_predictions` (companion, never combined with
 * the diagnosis count) = cases whose FIRST `prediction` response is the
 * keyed planned-step answer of the ACTUAL case (research-owner decision
 * D-U20-1 item 1), over the cases with a prediction first response,
 * planned denominator 3. Both are recounted from the
 * `proto_m18_cases_first_response` events alone: each response's
 * correctness is recomputed from the content module's key for that case
 * and slot and compared with the event's own `correct` flag and with the
 * closure snapshot. CANNOT SOLVE and a wrong answer are in the denominator
 * and not in the numerator; a case without a first response of a slot —
 * unpresented, presented and unanswered, or (for the step) never presented
 * — is missing, never incorrect, and is listed apart from CANNOT SOLVE;
 * tests run, drafts, help, time and input mode never change either count
 * and are reported beside the values as companions, never inside them.
 *
 * Dispositions (decision D-U20-1 items 8 and 9; contract §3.12 and §10):
 * six verified first responses and their completion snapshot make both
 * rows `observed` with `closure_reason: completed`, stable whatever
 * follows; while the series is open both rows are null `pending` with the
 * answers in the components — also with three parts recorded and a step
 * pending; at the review closure each row by its own count (3 ⇒
 * `observed`; 1–2 ⇒ `incomplete` with the value on its observed
 * denominator, censored; 0 ⇒ null `no_eligible_event`, the diagnosis row
 * `intro_only` | `case_presented_no_response`, the prediction row
 * `diagnosis_only` when parts exist); never briefed and never opened ⇒
 * `not_presented`; briefed and never opened ⇒ `pending` while open and null
 * `no_eligible_event` (`briefed_not_opened`) at the review closure; never
 * `declined`; held back after a reload ⇒ `interrupted`; a load after a
 * reload without an opening of its own ⇒ `interrupted` unless its own
 * `prior_load_checked` record ESTABLISHES the absence of an earlier
 * opening; a fault while the series is open ⇒ `technical_failure`.
 *
 * Defect scope (decision D-U20-1 item 11, the approved alternative;
 * contract §9.4): every failure condition carries a scope. A `shared`
 * defect (administration, content, sequencing, exposure, the shared
 * lifecycle) voids BOTH rows; a `slot` defect (a defect inside one response
 * slot's own records or that slot's closure-snapshot fields) voids ONLY
 * that slot's row when the isolation test I1–I4 passes, otherwise both rows
 * as `isolation_uncertain` with the failed condition named; an `uncertain`
 * record (not attributable to exactly one slot and case) voids both rows as
 * `isolation_uncertain`; a `flag` (an inconsistent descriptive record) sets
 * a consistency flag and leaves both rows unchanged. Both descriptive
 * indicators of EVERY case are null when the load's final scope is `shared`
 * or `isolation_uncertain` (owner clarification of 13 October 2026,
 * register §5.327); under genuine isolation each case keeps its own
 * treatment. A sequencing check that an earlier response would satisfy is
 * raised as `shared` unless an EARLIER uncertain record could be that
 * response (its possible case and slot cover the missing one); an
 * unrelated or later uncertain record never suppresses a proven ordering
 * defect, and a missing step presentation is never explained by a response
 * record. The raw log is read, never changed: a contradictory record is
 * never repaired and an uncertain response is never counted. The lifecycle
 * and each slot's `answered` are read from ATTRIBUTABLE response records
 * written before any closure (the earliest per case and slot), so a content
 * defect never moves completion.
 * Event order is read only from usable, unique sequence numbers (register
 * §5.259). Read-only; current page load only; the legacy families
 * `proto_m18_fault_*` and `proto_m18_pressure_*` are never read; no total
 * across slots or items.
 */
import {
  isM18CaseId,
  M18_ASSIGNED_CASE_ORDER,
  M18_CASES,
  M18_CASES_PLANNED,
  M18_CONTENT_VERSION,
  M18_ENTRY_STATE_VERSION,
  M18_FAMILY,
  M18_FORM_ID,
  M18_OPPORTUNITY_ID,
  M18_RESPONSES_PER_CASE,
  type M18Case,
  type M18CaseId,
  m18ConsistentParts,
  m18ImpliedStep,
  m18KeyOptionId,
  m18Option,
  m18OptionOfSeries,
  m18ResultFor,
  type M18Slot,
  m18TestOfSeries,
} from '../../pilot/windows/m18DiagnosisContent';
import type { RawGameEvent } from '../../systems/EventLogger';
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

const FAMILY = M18_FAMILY;
const SLOTS: readonly M18Slot[] = ['diagnosis', 'prediction'];

type DefectClass = 'shared' | 'slot' | 'uncertain' | 'flag' | 'note';
type RowLabel = 'shared' | 'diagnosis' | 'prediction' | 'isolation_uncertain';

interface Defect {
  /** The class of contract §9.4 "Defect scope" (`note`: a snapshot disagreement in a slot already voided). */
  scope: DefectClass;
  kind: string;
  sequence: number | null;
  slot: M18Slot | null;
  case_id: string | null;
}

interface ResponseRecord {
  sequence: number;
  /** Position in the ordered family events. */
  index: number;
  case_id: M18CaseId;
  slot: M18Slot;
  response_kind: unknown;
  option_id: unknown;
  correct: unknown;
  /** The recount against the content key (null when the record cannot be read). */
  recount: boolean | null;
  /** Written after a closure (never attributable for the lifecycle, never counted). */
  after_closure: boolean;
  /** The record's own slot defects. */
  defects: Defect[];
  /**
   * DETERMINATE: a valid kind and an option consistent with it (a part /
   * step option of the case for `option`; present and null for
   * `cannot_solve`) — the diagnosis the step view echoed is the one
   * recorded (contract §9.4 I4).
   */
  determinate: boolean;
  drafts_before: number | null;
  help_consults_before: number | null;
  active_ms: number | null;
  focused_ms: number | null;
  input_mode: string | null;
}

interface TestRun {
  index: number;
  test_id: string;
}

interface CaseRecord {
  def: M18Case;
  presented: boolean;
  presented_index: number | null;
  step_presented: boolean;
  step_presented_index: number | null;
  tests_closed_count: number;
  /** Position of the first `tests_closed` record of the case. */
  tests_closed_index: number | null;
  /** The reliable test runs (a known test of this case with the content's result). */
  runs: TestRun[];
  investigation_consistent: boolean;
  responses: Record<M18Slot, ResponseRecord[]>;
  /** The closure snapshot's per-case part / step fields disagreed with the record. */
  snapshot_disagreement: Record<M18Slot, boolean>;
}

/**
 * Ordering evidence (register §5.259): an outcome that depends on event
 * order is read only from events that each carry a usable, distinct
 * sequence number — a safe integer of at least 1. A missing or malformed
 * number is never read as zero; gaps are normal.
 */
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sameStringList(value: unknown, expected: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    new Set(value).size === value.length &&
    expected.every((id, index) => value[index] === id)
  );
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

registerFeatureExtractor('M18', (events, context) => {
  const entry = registerEntry('M18');
  const specs: Record<M18Slot, (typeof entry.features)[number]> = {
    diagnosis: entry.features.find(
      (spec) => spec.feature_id === 'm18_correct_first_diagnoses',
    )!,
    prediction: entry.features.find(
      (spec) => spec.feature_id === 'm18_correct_consequence_predictions',
    )!,
  };
  const family = events.filter(
    (event) =>
      (event.page_load_index === undefined ||
        event.page_load_index === context.pageLoadIndex) &&
      event.event_type.startsWith(FAMILY),
  );
  const suffixOf = (event: RawGameEvent) =>
    event.event_type.slice(FAMILY.length);
  const supporting = sequencesOf(family);

  // ——— The reload check of this load (decision D-U20-1 item 9; §5.290 (a)) ———
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
  let briefed = false;
  let briefedSequence: number | null = null;
  let opened = false;
  let openedSequence: number | null = null;
  let stageAtOpen: string | null = null;
  let priorM13: string | null = null;
  let introAcknowledged = false;
  let reviewClosedAbsent = false;
  const cases = new Map<M18CaseId, CaseRecord>(
    M18_CASES.map((def) => [
      def.id,
      {
        def,
        presented: false,
        presented_index: null,
        step_presented: false,
        step_presented_index: null,
        tests_closed_count: 0,
        tests_closed_index: null,
        runs: [],
        investigation_consistent: true,
        responses: { diagnosis: [], prediction: [] },
        snapshot_disagreement: { diagnosis: false, prediction: false },
      },
    ]),
  );
  const realised: M18CaseId[] = [];
  const help = { intro: 0, measurement: 0, feedback: 0, closure: 0 };
  const resultsShown: Record<1 | 2 | 3, boolean> = {
    1: false,
    2: false,
    3: false,
  };
  let completedIndex: number | null = null;
  let completedEvent: RawGameEvent | null = null;
  let closedAtReviewIndex: number | null = null;
  let closedAtReviewEvent: RawGameEvent | null = null;
  let failure: string | null = null;
  /** The position of the first closure (completion, review closure or a fault while open). */
  let closureIndex: number | null = null;
  let feedbackFaults = 0;
  let exposureConsistent = true;
  let investigationConsistent = true;
  const defects: Defect[] = [];
  /**
   * Response records not attributable to exactly one case and slot, each
   * with the (case, slot) pairs it could be (`null` = any).
   */
  const uncertainRecords: {
    sequence: number;
    kind: string;
    could_be: { case_id: M18CaseId | null; slot: M18Slot | null }[];
  }[] = [];

  const seq = (event: RawGameEvent) =>
    typeof event.sequence === 'number' ? event.sequence : null;
  const shared = (kind: string, event: RawGameEvent, caseId?: unknown) => {
    defects.push({
      scope: 'shared',
      kind,
      sequence: seq(event),
      slot: null,
      case_id: typeof caseId === 'string' ? caseId : null,
    });
  };
  const uncertain = (
    kind: string,
    event: RawGameEvent,
    couldBe: { case_id: M18CaseId | null; slot: M18Slot | null }[],
  ) => {
    defects.push({
      scope: 'uncertain',
      kind,
      sequence: seq(event),
      slot: null,
      case_id: null,
    });
    uncertainRecords.push({
      sequence: seq(event) ?? -1,
      kind,
      could_be: couldBe,
    });
  };
  /**
   * A sequencing check that an earlier response would satisfy. The missing
   * prerequisite is a response of one case and slot: the defect is raised
   * as `shared` unless an EARLIER uncertain record could be that response
   * (closeout of 13 October 2026, register §5.327) — such a record already
   * voids both rows as `isolation_uncertain`, and the ordering cannot be
   * established independently of it. An unrelated earlier record, a later
   * record (never seen here: the walk is in event order) or a prerequisite
   * that is not a response (`missing: null`, a step presentation) leaves the
   * proven defect shared.
   */
  const sequencing = (
    kind: string,
    event: RawGameEvent,
    caseId: unknown,
    missing: { case_id: M18CaseId; slot: M18Slot } | null,
  ) => {
    const explained =
      missing !== null &&
      uncertainRecords.some((record) =>
        record.could_be.some(
          (candidate) =>
            (candidate.case_id === null ||
              candidate.case_id === missing.case_id) &&
            (candidate.slot === null || candidate.slot === missing.slot),
        ),
      );

    if (!explained) {
      shared(kind, event, caseId);
    }
  };
  const flagExposure = (kind: string, event: RawGameEvent) => {
    exposureConsistent = false;
    defects.push({
      scope: 'flag',
      kind,
      sequence: seq(event),
      slot: null,
      case_id: null,
    });
  };
  const flagInvestigation = (
    kind: string,
    event: RawGameEvent,
    caseId: M18CaseId | null,
  ) => {
    investigationConsistent = false;

    if (caseId !== null) {
      cases.get(caseId)!.investigation_consistent = false;
    }

    defects.push({
      scope: 'flag',
      kind,
      sequence: seq(event),
      slot: null,
      case_id: caseId,
    });
  };

  /** The earliest attributable record of a case and slot written before any closure. */
  const earliest = (caseId: M18CaseId, slot: M18Slot): ResponseRecord | null =>
    cases
      .get(caseId)!
      .responses[slot].find((record) => !record.after_closure) ?? null;
  const earliestBefore = (
    caseId: M18CaseId,
    slot: M18Slot,
    index: number,
  ): ResponseRecord | null => {
    const record = earliest(caseId, slot);

    return record !== null && record.index < index ? record : null;
  };
  const answeredRecords = (slot: M18Slot): ResponseRecord[] =>
    M18_CASES.map((def) => earliest(def.id, slot)).filter(
      (record): record is ResponseRecord => record !== null,
    );
  /** The records a completion check counts: attributable earliest ones, plus uncertain records. */
  const presentCount = () =>
    SLOTS.reduce((sum, slot) => sum + answeredRecords(slot).length, 0) +
    uncertainRecords.length;

  const both = (
    disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>,
    reason: string,
    extra: (slot: M18Slot) => Partial<FeatureRecord>,
  ): FeatureRecord[] =>
    SLOTS.map((slot) =>
      emptyFeature('M18', specs[slot], disposition, reason, {
        supporting_sequences: supporting,
        ...extra(slot),
      }),
    );

  // ——— Components ———
  const caseComponents = (
    def: M18Case,
    trustworthy: boolean,
  ): Record<string, unknown> => {
    const record = cases.get(def.id)!;
    const part = earliest(def.id, 'diagnosis');
    const step = earliest(def.id, 'prediction');
    const runsBefore =
      part === null
        ? record.runs
        : record.runs.filter((run) => run.index < part.index);
    const idsBefore = def.tests
      .map((item) => item.id)
      .filter((id) => runsBefore.some((run) => run.test_id === id));
    const slotRecord = (response: ResponseRecord | null, slot: M18Slot) => ({
      answered: response !== null,
      response_kind:
        response === null
          ? null
          : response.response_kind === 'option' ||
              response.response_kind === 'cannot_solve'
            ? response.response_kind
            : null,
      option_id: response === null ? null : stringOrNull(response.option_id),
      // Independently recomputed correctness (the recount against the
      // content key); the record's own `correct` flag is compared during
      // the walk, never overwritten, and a disagreement is a defect of the
      // slot (listed in `integrity_defect`).
      correct: response?.recount ?? null,
      key_option_id: m18KeyOptionId(def.id, slot),
      drafts_before: response?.drafts_before ?? null,
      help_consults_before: response?.help_consults_before ?? null,
      active_ms: response?.active_ms ?? null,
      focused_ms: response?.focused_ms ?? null,
      input_mode: response?.input_mode ?? null,
    });
    // Null without an attributable diagnosis record, when that record
    // leaves the part undetermined (contract §10: an undetermined part fails
    // I4; an isolated defect of a DETERMINATE record does not), when the
    // case's investigation record is not trustworthy, or when the load's
    // final scope is `shared` or `isolation_uncertain` (`trustworthy`
    // false — then every case's indicators are null).
    const evidenceSufficient =
      part === null ||
      !part.determinate ||
      !record.investigation_consistent ||
      !trustworthy
        ? null
        : m18ConsistentParts(def.id, idsBefore).length === 1;
    const validOption = (response: ResponseRecord | null, slot: M18Slot) =>
      response !== null &&
      response.response_kind === 'option' &&
      record.responses[slot].every(
        (candidate) => candidate.defects.length === 0,
      ) &&
      m18Option(def.id, slot, response.option_id) !== undefined;
    const implied =
      trustworthy &&
      validOption(part, 'diagnosis') &&
      validOption(step, 'prediction') &&
      !record.snapshot_disagreement.diagnosis &&
      !record.snapshot_disagreement.prediction
        ? m18ImpliedStep(def.id, part!.option_id) === step!.option_id
        : null;

    return {
      case_id: def.id,
      case_index: def.index,
      presented: record.presented,
      step_presented: record.step_presented,
      part: slotRecord(part, 'diagnosis'),
      step: slotRecord(step, 'prediction'),
      tests_run_before_part: idsBefore,
      test_runs_before_part: runsBefore.length,
      repeated_test_runs: runsBefore.length - idsBefore.length,
      evidence_sufficient_before_part: evidenceSufficient,
      step_answer_implied_by_recorded_part: implied,
    };
  };

  const slotComponents = (slot: M18Slot) => {
    const answered = answeredRecords(slot);

    return {
      answered: answered.length,
      planned: M18_CASES_PLANNED,
      cannot_solve_count: answered.filter(
        (record) => record.response_kind === 'cannot_solve',
      ).length,
      unanswered_case_ids: M18_CASES.filter(
        (def) =>
          cases.get(def.id)!.presented && earliest(def.id, slot) === null,
      ).map((def) => def.id),
      unpresented_case_ids: M18_CASES.filter(
        (def) => !cases.get(def.id)!.presented,
      ).map((def) => def.id),
    };
  };

  const components = (trustworthy = true): Record<string, unknown> => ({
    administration_version: M18_ENTRY_STATE_VERSION,
    form_id: M18_FORM_ID,
    content_version: M18_CONTENT_VERSION,
    prediction_target: 'actual_case',
    assigned_case_order: [...M18_ASSIGNED_CASE_ORDER],
    realised_case_order: [...realised],
    observations_share_one_episode: true,
    exposure: {
      briefed,
      briefed_sequence: briefedSequence,
      board_opened: opened,
      board_opened_sequence: openedSequence,
      stage_at_open: stageAtOpen,
      intro_acknowledged: introAcknowledged,
      cases_presented: realised.length,
      steps_presented: M18_CASES.filter(
        (def) => cases.get(def.id)!.step_presented,
      ).length,
      never_opened_reason: opened
        ? null
        : briefed
          ? 'briefed_not_opened'
          : 'not_briefed_not_opened',
    },
    reload_check: reloadCheck(),
    first_response_phase_complete: completedIndex !== null,
    first_response_phase_closure:
      completedIndex !== null
        ? 'completed'
        : closedAtReviewIndex !== null
          ? 'closed_at_review'
          : failure === null
            ? null
            : 'technical_failure',
    slots: {
      diagnosis: slotComponents('diagnosis'),
      prediction: slotComponents('prediction'),
    },
    cases: M18_CASES.map((def) => caseComponents(def, trustworthy)),
    help_consults: { ...help },
    results_shown: { ...resultsShown },
    feedback_phase_faults: feedbackFaults,
    prior_m13_window_status: priorM13,
    investigation_record_consistent: {
      overall: investigationConsistent,
      ...Object.fromEntries(
        M18_CASES.map((def) => [
          def.id,
          cases.get(def.id)!.investigation_consistent,
        ]),
      ),
    },
    exposure_record_consistent: exposureConsistent,
  });

  if (family.length === 0) {
    return SLOTS.map((slot) =>
      absentFeature(
        'M18',
        specs[slot],
        context,
        'diagnostic board never presented',
        { components: components() },
      ),
    );
  }

  // More than one check record, one on a first page load, or one whose
  // flags contradict each other is a defect confined to unscored records:
  // flagged, never a change of the rows.
  if (
    checks.length > 1 ||
    (checks.length > 0 && !context.reloaded) ||
    !checksCoherent
  ) {
    exposureConsistent = false;
  }

  /** The never-opened dispositions (ruling item 9), order-free. */
  const neverOpened = (): FeatureRecord[] => {
    if (!briefed) {
      return both(
        'not_presented',
        'diagnostic board never briefed and never opened',
        () => ({ components: components() }),
      );
    }

    if (reviewClosedAbsent) {
      return both('no_eligible_event', 'briefed_not_opened', () => ({
        closure_reason: 'closed_at_review',
        censored: true,
        censor_reason: 'briefed_not_opened',
        components: components(),
      }));
    }

    return both('pending', 'briefed_not_opened', () => ({
      components: components(),
    }));
  };

  // Held back after a reload (register §5.14): the kit's technical failure
  // with a detail beginning `reload` and no opening of its own in this
  // load. Takes precedence over everything.
  const heldBack =
    family.some(
      (event) =>
        suffixOf(event) === 'technical_failure' &&
        String(meta<unknown>(event, 'detail') ?? '').startsWith('reload'),
    ) && !family.some((event) => suffixOf(event) === 'opportunity_opened');

  if (heldBack) {
    for (const event of family) {
      if (suffixOf(event) === 'presented') {
        briefed = true;
        briefedSequence = event.sequence ?? null;
      }
    }

    if (absenceEstablished) {
      exposureConsistent = false;
    }

    return both(
      'interrupted',
      'board opened in an earlier page load; not re-run after the reload',
      () => ({
        components: { ...components(), held_back_after_reload: true },
      }),
    );
  }

  // A load after a reload without an opening of its own and without an
  // ESTABLISHED absence of an earlier opening: `interrupted`, read before
  // any position is compared (precedence over `technical_failure`).
  if (
    context.reloaded &&
    !absenceEstablished &&
    !family.some((event) => suffixOf(event) === 'opportunity_opened')
  ) {
    for (const event of family) {
      if (suffixOf(event) === 'presented') {
        briefed = true;
        briefedSequence = event.sequence ?? null;
      }
    }

    return both(
      'interrupted',
      'no current-load board evidence after a reload: diagnostic board not opened in this page load and the absence of an earlier opening not established',
      () => ({ components: components() }),
    );
  }

  // Everything below compares positions.
  const order = orderDefect(family);

  if (order !== null) {
    const defect: Defect = {
      scope: 'shared',
      kind: order,
      sequence: null,
      slot: null,
      case_id: null,
    };

    return both('technical_failure', `shared defect: ${order}`, () => ({
      closure_reason: 'technical_failure',
      components: {
        ...components(false),
        integrity_defect: [defect],
        defect_scope: 'shared',
        records_unscorable: [],
      },
    }));
  }

  const ordered = family
    .slice()
    .sort((a, b) => (a.sequence as number) - (b.sequence as number));

  /** The entry snapshot's required declarations against the approved administration (every defect `shared`). */
  const validateSnapshot = (
    snapshot: Record<string, unknown> | null | undefined,
    event: RawGameEvent,
  ) => {
    if (!isRecord(snapshot)) {
      shared('the entry snapshot is not a record', event);

      return;
    }

    const declared: [string, unknown][] = [
      ['form_id', M18_FORM_ID],
      ['content_version', M18_CONTENT_VERSION],
      ['cases_planned', M18_CASES_PLANNED],
      ['responses_per_case', M18_RESPONSES_PER_CASE],
      ['prediction_target', 'actual_case'],
      ['tests', 'on_request_unlimited'],
      ['tests_close', 'at_part_record'],
      ['step_after', 'part_record'],
      ['cannot_solve_available', true],
      ['feedback', 'after_all_first_responses'],
      ['stop_control', false],
    ];

    for (const [key, expected] of declared) {
      if (snapshot[key] !== expected) {
        shared(
          `the entry snapshot's ${key} is not ${JSON.stringify(expected)}`,
          event,
        );
      }
    }

    if (
      !sameStringList(snapshot.assigned_case_order, M18_ASSIGNED_CASE_ORDER)
    ) {
      shared(
        "the entry snapshot's assigned case order disagrees with the content",
        event,
      );
    }

    const list = snapshot.cases;

    if (!Array.isArray(list)) {
      shared('the entry snapshot carries no case list', event);

      return;
    }

    if (list.length !== M18_CASES.length) {
      shared(
        `the entry snapshot declares ${list.length} case records, not ${M18_CASES.length}`,
        event,
      );

      return;
    }

    const seen = new Set<string>();

    for (const item of list as unknown[]) {
      if (!isRecord(item)) {
        shared(
          'the entry snapshot carries a case record that is not a record',
          event,
        );
        continue;
      }

      const def = M18_CASES.find((candidate) => candidate.id === item.case_id);

      if (def === undefined) {
        shared(
          'the entry snapshot declares a case the content does not have',
          event,
        );
        continue;
      }

      if (seen.has(def.id)) {
        shared('the entry snapshot declares a case twice', event);
        continue;
      }

      seen.add(def.id);

      if (
        !sameStringList(
          item.test_ids,
          def.tests.map((test) => test.id),
        ) ||
        !sameStringList(
          item.part_option_ids,
          def.parts.map((option) => option.id),
        ) ||
        !sameStringList(
          item.step_option_ids,
          def.steps.map((option) => option.id),
        )
      ) {
        shared(
          `the entry snapshot's tests or options of ${def.id} disagree with the content`,
          event,
        );
      }

      if (
        item.key_part_option_id !== def.key_part_option_id ||
        item.key_step_option_id !== def.key_step_option_id
      ) {
        shared(
          `the entry snapshot's keys of ${def.id} disagree with the content`,
          event,
        );
      }
    }
  };

  // ——— The walk ———
  for (const [index, event] of ordered.entries()) {
    const suffix = suffixOf(event);
    const closed = closureIndex !== null;

    if (
      meta<unknown>(event, 'entry_state_version') !== M18_ENTRY_STATE_VERSION
    ) {
      shared('an event of the family carries an unknown version', event);
      continue;
    }

    if (meta<unknown>(event, 'opportunity_id') !== M18_OPPORTUNITY_ID) {
      shared('an event of the family carries another opportunity id', event);
      continue;
    }

    const stamped =
      suffix === 'case_presented' ||
      suffix === 'test_run' ||
      suffix === 'step_presented' ||
      suffix === 'first_response' ||
      suffix === 'first_responses_completed';

    if (stamped) {
      if (meta<unknown>(event, 'form_id') !== M18_FORM_ID) {
        shared(`a ${suffix} record carries an unknown form`, event);
        continue;
      }

      if (meta<unknown>(event, 'content_version') !== M18_CONTENT_VERSION) {
        shared(`a ${suffix} record carries an unknown content version`, event);
        continue;
      }
    }

    const caseId = meta<unknown>(event, 'case_id');
    const known = isM18CaseId(caseId) ? cases.get(caseId)! : null;

    switch (suffix) {
      case 'presented':
        briefed = true;
        briefedSequence = event.sequence ?? null;
        break;
      case 'opportunity_opened': {
        if (opened) {
          shared('the board was opened twice', event);
          break;
        }

        opened = true;
        openedSequence = event.sequence ?? null;

        const snapshot = meta<Record<string, unknown>>(
          event,
          'entry_state_snapshot',
        );

        validateSnapshot(snapshot, event);
        stageAtOpen = stringOrNull(snapshot?.stage);
        priorM13 = stringOrNull(snapshot?.prior_m13_window_status);
        break;
      }
      case 'intro_acknowledged':
        introAcknowledged = true;
        break;
      case 'case_presented': {
        if (known === null) {
          shared('a case presentation names an unknown case', event, caseId);
          break;
        }

        if (!opened) {
          shared(
            'a case was presented before the board was opened',
            event,
            caseId,
          );
        }

        if (closed) {
          shared('a case was presented after a closure', event, caseId);
        }

        if (known.presented) {
          shared('a case was presented twice', event, caseId);
          break;
        }

        if (known.def.id !== M18_ASSIGNED_CASE_ORDER[realised.length]) {
          shared(
            'a case was presented out of the assigned order',
            event,
            caseId,
          );
        }

        if (meta<unknown>(event, 'realised_position') !== realised.length + 1) {
          shared(
            "a case presentation's realised position disagrees with its order",
            event,
            caseId,
          );
        }

        if (realised.length === 0 && !introAcknowledged) {
          shared(
            'case 1 was presented before the card was acknowledged',
            event,
            caseId,
          );
        }

        const previous = realised[realised.length - 1];

        if (
          previous !== undefined &&
          earliestBefore(previous, 'prediction', index) === null
        ) {
          sequencing(
            "a case was presented before the previous case's planned-step answer",
            event,
            caseId,
            { case_id: previous, slot: 'prediction' },
          );
        }

        known.presented = true;
        known.presented_index = index;
        realised.push(known.def.id);
        break;
      }
      case 'test_run': {
        if (known === null) {
          shared('a test run names an unknown case', event, caseId);
          break;
        }

        const testId = meta<unknown>(event, 'test_id');
        const ofSeries = m18TestOfSeries(testId);

        if (ofSeries === undefined) {
          flagInvestigation(
            'a test run names no test of the series',
            event,
            known.def.id,
          );
          break;
        }

        if (ofSeries.caseId !== known.def.id) {
          shared('a test of another case was run', event, caseId);
          break;
        }

        let defective = false;

        if (!known.presented) {
          shared('a test was run before its case was presented', event, caseId);
          defective = true;
        }

        if (earliestBefore(known.def.id, 'diagnosis', index) !== null) {
          shared("a test was run after its case's diagnosis", event, caseId);
          defective = true;
        }

        if (closed) {
          shared('a test was run after a closure', event, caseId);
          defective = true;
        }

        const resultId = meta<unknown>(event, 'result_id');

        if (
          typeof resultId !== 'string' ||
          !ofSeries.test.result_ids.includes(resultId)
        ) {
          shared('a test run carries no known result', event, caseId);
          defective = true;
        } else if (resultId !== m18ResultFor(known.def.id, ofSeries.test.id)) {
          shared(
            "a test run shows a result other than the content's for the case",
            event,
            caseId,
          );
          defective = true;
        }

        if (!defective) {
          known.runs.push({ index, test_id: ofSeries.test.id });
        }

        break;
      }
      case 'option_drafted':
      case 'commit_requested':
      case 'commit_cancelled':
      case 'commit_press_refused':
      case 'commit_without_draft': {
        if (closed) {
          flagExposure(`a ${suffix} record after a closure`, event);
        }

        if (known === null) {
          flagExposure(`a ${suffix} record names an unknown case`, event);
          break;
        }

        if (!known.presented) {
          shared(
            `a ${suffix} record names a case not yet presented`,
            event,
            caseId,
          );
        }

        const optionId = meta<unknown>(event, 'option_id');

        if (optionId === null || optionId === undefined) {
          break;
        }

        const option = m18OptionOfSeries(optionId);

        if (option === undefined) {
          flagExposure(`a ${suffix} record names an unknown option`, event);
          break;
        }

        const owner = cases.get(option.caseId)!;

        if (!owner.presented) {
          shared(
            `a ${suffix} record names an option of a case not yet presented`,
            event,
            caseId,
          );
        } else if (option.slot === 'prediction' && !owner.step_presented) {
          shared(
            `a ${suffix} record names a step option before its step was presented`,
            event,
            caseId,
          );
        } else if (option.caseId !== known.def.id) {
          flagExposure(
            `a ${suffix} record names an option of another case`,
            event,
          );
        }

        break;
      }
      case 'first_response': {
        const slot = meta<unknown>(event, 'slot');
        const optionId = meta<unknown>(event, 'option_id');
        const sequence = event.sequence as number;

        if (known === null) {
          uncertain('a first response without a known case', event, [
            {
              case_id: null,
              slot: slot === 'diagnosis' || slot === 'prediction' ? slot : null,
            },
          ]);
          break;
        }

        if (slot !== 'diagnosis' && slot !== 'prediction') {
          uncertain('a first response without a known slot', event, [
            { case_id: known.def.id, slot: null },
          ]);
          break;
        }

        if (typeof optionId === 'string') {
          const option = m18OptionOfSeries(optionId);

          if (
            option !== undefined &&
            (option.caseId !== known.def.id || option.slot !== slot)
          ) {
            uncertain(
              'a first response carries an option of another case or of the other slot',
              event,
              [
                { case_id: known.def.id, slot },
                { case_id: option.caseId, slot: option.slot },
              ],
            );
            break;
          }
        }

        if (!closed && meta<unknown>(event, 'phase') !== 'measurement') {
          uncertain('a first response outside the measurement phase', event, [
            { case_id: known.def.id, slot },
          ]);
          break;
        }

        const record: ResponseRecord = {
          sequence,
          index,
          case_id: known.def.id,
          slot,
          response_kind: meta<unknown>(event, 'response_kind'),
          option_id: optionId,
          correct: meta<unknown>(event, 'correct'),
          recount: null,
          after_closure: closed,
          defects: [],
          determinate: true,
          drafts_before: numberOrNull(meta<unknown>(event, 'drafts_before')),
          help_consults_before: numberOrNull(
            meta<unknown>(event, 'help_consults_before'),
          ),
          active_ms: numberOrNull(meta<unknown>(event, 'active_ms')),
          focused_ms: numberOrNull(meta<unknown>(event, 'focused_ms')),
          input_mode: stringOrNull(meta<unknown>(event, 'input_mode')),
        };
        const own = (kind: string) => {
          const defect: Defect = {
            scope: 'slot',
            kind,
            sequence,
            slot,
            case_id: known.def.id,
          };

          record.defects.push(defect);
          defects.push(defect);
        };

        // Order (shared): a diagnosis needs its case's presentation; a
        // prediction needs its case's diagnosis and its step presentation.
        if (!closed) {
          if (slot === 'diagnosis' && !known.presented) {
            shared(
              'a diagnosis without, or before, its case presentation',
              event,
              caseId,
            );
          }

          if (slot === 'prediction') {
            const diagnosisMissing =
              earliestBefore(known.def.id, 'diagnosis', index) === null;

            if (diagnosisMissing || !known.step_presented) {
              sequencing(
                'a planned-step answer without, or before, its diagnosis or its step presentation',
                event,
                caseId,
                // A missing step presentation is never a response record:
                // only a missing diagnosis beside a presented step can be
                // explained by an uncertain record.
                diagnosisMissing && known.step_presented
                  ? { case_id: known.def.id, slot: 'diagnosis' }
                  : null,
              );
            }
          }
        }

        const kind = record.response_kind;
        const key = m18KeyOptionId(known.def.id, slot);

        if (kind !== 'option' && kind !== 'cannot_solve') {
          own(
            'a first response whose response_kind is not option or cannot_solve',
          );
          record.determinate = false;
        } else if (kind === 'option') {
          if (typeof optionId !== 'string') {
            own('an option response without an option id');
            record.determinate = false;
          } else if (m18OptionOfSeries(optionId) === undefined) {
            own(
              'an option response with an id that is no option of the series',
            );
            record.determinate = false;
          } else {
            record.recount = optionId === key;
          }
        } else {
          if (!('option_id' in (event.metadata ?? {}))) {
            own('a CANNOT SOLVE response without the option_id field');
            record.determinate = false;
          } else if (optionId !== null) {
            own('a CANNOT SOLVE response carries an option');
            record.determinate = false;
          } else {
            record.recount = false;
          }

          if (record.correct === true) {
            own('a CANNOT SOLVE response is marked correct');
          }
        }

        if (typeof record.correct !== 'boolean') {
          own('a first response without a boolean outcome');
        } else if (
          record.recount !== null &&
          record.correct !== record.recount
        ) {
          own('a first response whose outcome contradicts the key');
        }

        if (meta<unknown>(event, 'key_option_id') !== key) {
          own('a first response whose key disagrees with the content');
        }

        if (known.responses[slot].length > 0) {
          own('a second first response for one case and slot');
        }

        if (closed) {
          own('a first response after a closure');
        }

        known.responses[slot].push(record);
        break;
      }
      case 'tests_closed': {
        if (known === null) {
          flagInvestigation(
            'a tests_closed record names an unknown case',
            event,
            null,
          );
          break;
        }

        known.tests_closed_count += 1;
        known.tests_closed_index ??= index;

        if (known.tests_closed_count > 1) {
          flagInvestigation(
            'the tests of a case were closed twice',
            event,
            known.def.id,
          );
        }

        const part = earliestBefore(known.def.id, 'diagnosis', index);

        if (part === null) {
          flagInvestigation(
            'the tests of a case were closed before its diagnosis',
            event,
            known.def.id,
          );
          break;
        }

        const runsBefore = known.runs.filter((run) => run.index < part.index);
        const ids = known.def.tests
          .map((item) => item.id)
          .filter((id) => runsBefore.some((run) => run.test_id === id));

        if (
          !sameStringList(meta<unknown>(event, 'tests_run'), ids) ||
          meta<unknown>(event, 'test_runs') !== runsBefore.length
        ) {
          flagInvestigation(
            "a tests_closed record's test use disagrees with the test runs",
            event,
            known.def.id,
          );
        }

        break;
      }
      case 'step_presented': {
        if (known === null) {
          shared('a step presentation names an unknown case', event, caseId);
          break;
        }

        if (closed) {
          shared('a step was presented after a closure', event, caseId);
        }

        if (known.step_presented) {
          shared('a step was presented twice', event, caseId);
          break;
        }

        if (earliestBefore(known.def.id, 'diagnosis', index) === null) {
          sequencing(
            'a step was presented before its diagnosis',
            event,
            caseId,
            { case_id: known.def.id, slot: 'diagnosis' },
          );
        }

        known.step_presented = true;
        known.step_presented_index = index;
        break;
      }
      case 'first_responses_completed':
        if (completedIndex !== null) {
          shared('the scored phase was completed twice', event);
          break;
        }

        if (closedAtReviewIndex !== null || failure !== null) {
          shared('the scored phase completed after the series closed', event);
          break;
        }

        if (presentCount() < M18_CASES_PLANNED * M18_RESPONSES_PER_CASE) {
          shared(
            'the completion snapshot precedes the sixth first response',
            event,
          );
        }

        completedIndex = index;
        completedEvent = event;
        closureIndex ??= index;
        break;
      case 'results_shown': {
        if (completedIndex === null) {
          shared('results shown before the sixth first response', event);
        }

        const page = meta<unknown>(event, 'page');

        if (page === 1 || page === 2 || page === 3) {
          if (resultsShown[page]) {
            flagExposure('a results page recorded as shown twice', event);
          }

          resultsShown[page] = true;
        } else {
          flagExposure('a results record without a page', event);
        }

        break;
      }
      case 'help_consulted': {
        const phase = meta<unknown>(event, 'phase');
        const view = meta<unknown>(event, 'view');

        if (
          typeof view === 'string' &&
          /^results_\d$/.test(view) &&
          completedIndex === null
        ) {
          shared('a results help view before the sixth first response', event);
        }

        if (phase === 'intro') {
          help.intro += 1;
        } else if (phase === 'measurement') {
          help.measurement += 1;

          if (known === null) {
            flagExposure('a measurement help record without its case', event);
          }
        } else if (phase === 'feedback') {
          help.feedback += 1;
        } else if (phase === 'closure') {
          help.closure += 1;
        } else {
          flagExposure('a help record without a phase', event);
        }

        break;
      }
      case 'series_closed_at_review':
        if (completedIndex !== null) {
          shared(
            'the series closed after the scored phase was complete',
            event,
          );
          break;
        }

        if (closedAtReviewIndex !== null || failure !== null) {
          shared('the series closed twice', event);
          break;
        }

        closedAtReviewIndex = index;
        closedAtReviewEvent = event;
        closureIndex ??= index;
        break;
      case 'technical_failure':
        if (!opened) {
          // A fault before any opening leaves no scored evidence to void.
          break;
        }

        if (closureIndex === null) {
          failure = String(
            meta<unknown>(event, 'detail') ?? 'technical failure',
          );
          closureIndex = index;
          shared(
            `technical failure while the series was open: ${failure}`,
            event,
          );
        } else {
          feedbackFaults += 1;
        }

        break;
      case 'window_closed':
        if (
          !opened &&
          meta<unknown>(event, 'exit_state') === 'closed_at_review'
        ) {
          reviewClosedAbsent = true;
        }

        break;
      default:
        break;
    }
  }

  // ——— Post-walk lifecycle checks ———
  if (
    completedIndex === null &&
    closedAtReviewIndex === null &&
    failure === null &&
    presentCount() >= M18_CASES_PLANNED * M18_RESPONSES_PER_CASE
  ) {
    defects.push({
      scope: 'shared',
      kind: 'six first responses without the completion snapshot',
      sequence: null,
      slot: null,
      case_id: null,
    });
  }

  for (const def of M18_CASES) {
    const record = cases.get(def.id)!;
    const part = earliest(def.id, 'diagnosis');

    if (part !== null && record.tests_closed_count === 0) {
      investigationConsistent = false;
      record.investigation_consistent = false;
      defects.push({
        scope: 'flag',
        kind: 'no tests_closed record after a diagnosis',
        sequence: part.sequence,
        slot: null,
        case_id: def.id,
      });
    }
  }

  /** A closure snapshot compared field by field, by scope (contract §9.4 "Closure snapshots"). */
  const compareSnapshot = (event: RawGameEvent, reason: string) => {
    const sequence = seq(event);
    const sharedField = (kind: string) => {
      defects.push({
        scope: 'shared',
        kind,
        sequence,
        slot: null,
        case_id: null,
      });
    };
    const slotField = (slot: M18Slot, kind: string, caseId: string | null) => {
      const voidedAlready = M18_CASES.some((def) =>
        cases
          .get(def.id)!
          .responses[slot].some((record) => record.defects.length > 0),
      );

      defects.push({
        scope: voidedAlready ? 'note' : 'slot',
        kind,
        sequence,
        slot,
        case_id: caseId,
      });
    };

    if (meta<unknown>(event, 'cases_planned') !== M18_CASES_PLANNED) {
      sharedField(
        "the closure snapshot's planned case count is not the number 3",
      );
    }

    if (meta<unknown>(event, 'cases_presented') !== realised.length) {
      sharedField(
        "the closure snapshot's presented count disagrees with the recount",
      );
    }

    if (meta<unknown>(event, 'closure_reason') !== reason) {
      sharedField(
        "the closure snapshot's closure reason disagrees with its event",
      );
    }

    const counts: Record<M18Slot, [string, string, string]> = {
      diagnosis: [
        'parts_recorded',
        'correct_first_diagnoses',
        'cannot_solve_parts',
      ],
      prediction: [
        'steps_recorded',
        'correct_consequence_predictions',
        'cannot_solve_steps',
      ],
    };

    for (const slot of SLOTS) {
      const answered = answeredRecords(slot);
      const [recorded, correct, cannot] = counts[slot];

      if (meta<unknown>(event, recorded) !== answered.length) {
        slotField(
          slot,
          `the closure snapshot's ${recorded} disagrees with the recount`,
          null,
        );
      }

      if (
        meta<unknown>(event, correct) !==
        answered.filter((record) => record.recount === true).length
      ) {
        slotField(
          slot,
          `the closure snapshot's ${correct} disagrees with the recount`,
          null,
        );
      }

      if (
        meta<unknown>(event, cannot) !==
        answered.filter((record) => record.response_kind === 'cannot_solve')
          .length
      ) {
        slotField(
          slot,
          `the closure snapshot's ${cannot} disagrees with the recount`,
          null,
        );
      }
    }

    const list = meta<unknown>(event, 'cases');

    if (!Array.isArray(list)) {
      sharedField('the closure snapshot carries no case list');

      return;
    }

    for (const def of M18_CASES) {
      const record = cases.get(def.id)!;
      const item = (list as unknown[]).find(
        (candidate) => isRecord(candidate) && candidate.case_id === def.id,
      );

      if (!isRecord(item)) {
        sharedField(`the closure snapshot lacks the record of ${def.id}`);
        continue;
      }

      if (item.presented !== record.presented) {
        sharedField(
          `the closure snapshot's presented flag of ${def.id} disagrees`,
        );
      }

      if (item.step_presented !== record.step_presented) {
        sharedField(
          `the closure snapshot's step_presented flag of ${def.id} disagrees`,
        );
      }

      for (const [slot, field] of [
        ['diagnosis', 'part'],
        ['prediction', 'step'],
      ] as const) {
        const response = earliest(def.id, slot);
        const stored = item[field];

        if (!isRecord(stored)) {
          slotField(
            slot,
            `the closure snapshot's ${field} record of ${def.id} is missing`,
            def.id,
          );
          record.snapshot_disagreement[slot] = true;
          continue;
        }

        if (response === null) {
          if (stored.answered !== false) {
            slotField(
              slot,
              `the closure snapshot's ${field} of ${def.id} claims an answer the log lacks`,
              def.id,
            );
            record.snapshot_disagreement[slot] = true;
          }

          continue;
        }

        if (stored.answered !== true) {
          slotField(
            slot,
            `the closure snapshot's ${field} of ${def.id} denies a recorded answer`,
            def.id,
          );
          record.snapshot_disagreement[slot] = true;
        }

        if (
          stored.response_kind !== response.response_kind ||
          stored.option_id !== response.option_id
        ) {
          slotField(
            slot,
            `the closure snapshot's ${field} response of ${def.id} disagrees with the record`,
            def.id,
          );
          record.snapshot_disagreement[slot] = true;
          record.responses[slot][0].determinate =
            slot === 'diagnosis'
              ? false
              : record.responses[slot][0].determinate;
        }

        if (response.recount !== null && stored.correct !== response.recount) {
          slotField(
            slot,
            `the closure snapshot's ${field} outcome of ${def.id} disagrees with the recount`,
            def.id,
          );
          record.snapshot_disagreement[slot] = true;
        }
      }

      const runsBefore =
        record.responses.diagnosis.length === 0 ||
        earliest(def.id, 'diagnosis') === null
          ? record.runs
          : record.runs.filter(
              (run) => run.index < earliest(def.id, 'diagnosis')!.index,
            );
      const ids = def.tests
        .map((test) => test.id)
        .filter((id) => runsBefore.some((run) => run.test_id === id));

      if (!sameStringList(item.tests_run, ids)) {
        investigationConsistent = false;
        record.investigation_consistent = false;
        defects.push({
          scope: 'flag',
          kind: `the closure snapshot's test use of ${def.id} disagrees with the test runs`,
          sequence,
          slot: null,
          case_id: def.id,
        });
      }
    }
  };

  if (completedEvent !== null) {
    compareSnapshot(completedEvent, 'completed');
  }

  if (closedAtReviewEvent !== null) {
    compareSnapshot(closedAtReviewEvent, 'closed_at_review');
  }

  if (!opened && !defects.some((defect) => defect.scope === 'shared')) {
    // No board evidence of its own in this load: a first load, or a
    // reloaded load whose check established the absence of an earlier
    // opening (a reloaded load without that returned above).
    return neverOpened();
  }

  // A check that found an earlier opening beside an opening of this load
  // contradicts the hold-back the guard would have applied: flagged.
  if (checkFlag('prior_opening_found') === true) {
    exposureConsistent = false;
  }

  // ——— Isolation (contract §9.4, decision D-U20-1 item 11) ———
  const sharedExists = defects.some((defect) => defect.scope === 'shared');
  const uncertainExists = defects.some(
    (defect) => defect.scope === 'uncertain',
  );
  const slotDefects = (slot: M18Slot) =>
    defects.filter((defect) => defect.scope === 'slot' && defect.slot === slot);
  const nextPresentedIndex = (caseId: M18CaseId): number | null => {
    const at = M18_ASSIGNED_CASE_ORDER.indexOf(caseId);
    const next = M18_ASSIGNED_CASE_ORDER[at + 1];

    return next === undefined ? null : cases.get(next)!.presented_index;
  };
  /** A duplicate's position: before the next case's presentation (if any) or after completion; never between. */
  const duplicateIsolable = (caseId: M18CaseId, duplicate: ResponseRecord) => {
    const next = nextPresentedIndex(caseId);

    if (next === null) {
      return true;
    }

    if (duplicate.index < next) {
      return true;
    }

    return completedIndex !== null && duplicate.index > completedIndex;
  };

  /** I4 for one slot; returns the failed condition or null. */
  const isolationFailure = (slot: M18Slot): string | null => {
    for (const def of M18_CASES) {
      const record = cases.get(def.id)!;
      const all = record.responses[slot];

      if (
        !all.some((response) => response.defects.length > 0) &&
        !record.snapshot_disagreement[slot]
      ) {
        continue;
      }

      const first = earliest(def.id, slot);

      if (first === null) {
        // Only responses written after a closure for a case and slot with
        // no earlier record: no part of the other slot's administration.
        continue;
      }

      if (slot === 'diagnosis') {
        if (!first.determinate) {
          return `the earliest diagnosis record of ${def.id} leaves the recorded part undetermined`;
        }

        const afterwards = (position: number | null) =>
          position !== null &&
          position > first.index &&
          !record.runs.some(
            (run) => run.index > first.index && run.index < position,
          );

        if (
          record.tests_closed_index !== null &&
          !afterwards(record.tests_closed_index)
        ) {
          return `the tests_closed record of ${def.id} does not follow its diagnosis without a test between`;
        }

        if (record.step_presented && !afterwards(record.step_presented_index)) {
          return `the step presentation of ${def.id} does not follow its diagnosis without a test between`;
        }

        const prediction = earliest(def.id, 'prediction');

        if (
          prediction !== null &&
          (record.step_presented_index === null ||
            prediction.index < record.step_presented_index)
        ) {
          return `the planned-step answer of ${def.id} does not follow its step presentation`;
        }

        for (const duplicate of all.slice(1)) {
          if (prediction !== null && duplicate.index < prediction.index) {
            return `a duplicate diagnosis of ${def.id} before its planned-step answer`;
          }

          if (!duplicateIsolable(def.id, duplicate)) {
            return `a duplicate diagnosis of ${def.id} between the next case's presentation and completion`;
          }
        }
      } else {
        const next = nextPresentedIndex(def.id);

        if (next !== null && next < first.index) {
          return `the next case was presented before the planned-step answer of ${def.id}`;
        }

        for (const duplicate of all.slice(1)) {
          if (!duplicateIsolable(def.id, duplicate)) {
            return `a duplicate planned-step answer of ${def.id} between the next case's presentation and completion`;
          }
        }
      }
    }

    return null;
  };

  const labels: Record<M18Slot, RowLabel | null> = {
    diagnosis: null,
    prediction: null,
  };
  let isolationFailed: string | null = null;

  if (sharedExists) {
    labels.diagnosis = 'shared';
    labels.prediction = 'shared';
  } else {
    if (uncertainExists) {
      isolationFailed = `I1: ${uncertainRecords[0]?.kind ?? 'an unattributable response'}`;
    } else {
      for (const slot of SLOTS) {
        if (slotDefects(slot).length === 0) {
          continue;
        }

        const failed = isolationFailure(slot);

        if (failed !== null) {
          isolationFailed = `I4: ${failed}`;
          break;
        }
      }
    }

    if (isolationFailed !== null) {
      labels.diagnosis = 'isolation_uncertain';
      labels.prediction = 'isolation_uncertain';
    } else {
      for (const slot of SLOTS) {
        if (slotDefects(slot).length > 0) {
          labels[slot] = slot;
        }
      }
    }
  }

  // The descriptive indicators are derived only when the load's final
  // scope leaves both rows retained or voids one slot in isolation: a
  // `shared` or `isolation_uncertain` scope — an uncertain record (I1), an
  // undetermined part or any other I4 failure — nulls both indicators of
  // EVERY case (owner clarification of 13 October 2026, register §5.327).
  const trustworthy = !sharedExists && isolationFailed === null;
  const integrityDefect = defects.map((defect) => ({ ...defect }));
  const unscorable = (slot: M18Slot) => [
    ...M18_CASES.flatMap((def) =>
      cases
        .get(def.id)!
        .responses[slot].filter((record) => record.defects.length > 0)
        .map((record) => record.sequence),
    ),
    ...uncertainRecords.map((record) => record.sequence),
  ];
  const row = (slot: M18Slot): FeatureRecord => {
    const spec = specs[slot];
    const label = labels[slot];
    const answered = answeredRecords(slot);
    const included = answered.map((record) => record.case_id);
    const base = components(trustworthy);

    if (label !== null) {
      const reason =
        label === 'shared'
          ? `shared defect: ${defects.find((defect) => defect.scope === 'shared')!.kind}`
          : label === 'isolation_uncertain'
            ? `isolation uncertain: ${isolationFailed}`
            : `${slot} slot defect: ${slotDefects(slot)[0].kind}`;

      return emptyFeature('M18', spec, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
        supporting_sequences: supporting,
        components: {
          ...base,
          integrity_defect: integrityDefect,
          defect_scope: label,
          ...(label === 'isolation_uncertain'
            ? { isolation_failed: isolationFailed }
            : {}),
          records_unscorable: unscorable(slot),
        },
      });
    }

    const other: M18Slot = slot === 'diagnosis' ? 'prediction' : 'diagnosis';
    const extra =
      labels[other] === null
        ? base
        : {
            ...base,
            other_row_defect: {
              defect_scope: labels[other],
              integrity_defect: integrityDefect,
            },
          };
    const numerator = answered.filter(
      (record) => record.recount === true,
    ).length;
    const denominator = answered.length;

    if (completedIndex !== null) {
      return fractionFeature(
        'M18',
        spec,
        numerator,
        denominator,
        included,
        supporting,
        { disposition: 'no_eligible_event', reason: 'no case answered' },
        {
          closure_reason: 'completed',
          censored: false,
          censor_reason: null,
          components: extra,
        },
      );
    }

    if (closedAtReviewIndex === null) {
      return emptyFeature(
        'M18',
        spec,
        'pending',
        'the first-response phase is still open',
        {
          included_ids: included,
          supporting_sequences: supporting,
          components: extra,
        },
      );
    }

    const diagnosisReason = !introAcknowledged
      ? 'intro_only'
      : 'case_presented_no_response';
    const reason =
      slot === 'prediction' && answeredRecords('diagnosis').length > 0
        ? 'diagnosis_only'
        : diagnosisReason;
    const detail = `series closed at the review after ${denominator} of ${M18_CASES_PLANNED} ${slot === 'diagnosis' ? 'parts' : 'planned-step answers'}`;

    return fractionFeature(
      'M18',
      spec,
      numerator,
      denominator,
      included,
      supporting,
      { disposition: 'no_eligible_event', reason },
      {
        closure_reason: 'closed_at_review',
        // A row with every planned case answered is fully observed; a short
        // count is censored by the closure (contract §3.12).
        censored: denominator < M18_CASES_PLANNED,
        // Not censored ⇒ no censor reason; the review-closure context stays
        // in `closure_reason` (closeout of 13 October 2026).
        censor_reason:
          denominator >= M18_CASES_PLANNED
            ? null
            : denominator === 0
              ? reason
              : detail,
        components: extra,
      },
    );
  };

  return SLOTS.map(row) satisfies FeatureRecord[];
});
