/**
 * M15 feature extractor (Unit 18): `m15_correct_first_predictions` =
 * questions whose FIRST response is the keyed option of that question,
 * over the questions with a first response (option or CANNOT SOLVE) in
 * the current page load, planned denominator 4 — recounted from the
 * `proto_m15_systems_first_response` events alone: each response's
 * correctness is recomputed from the content module's key for that
 * question and content version and compared with the event's own
 * `correct` flag and with the closure snapshot. CANNOT SOLVE and a wrong
 * option are in the denominator and not in the numerator; a question
 * without a first response is missing, never incorrect; an answer counts
 * whatever wiring was recorded and whatever tests were run — the recorded
 * wiring, its correctness, the tests, help, drafts, time and input mode
 * never change the numerator or the denominator and are reported beside
 * the value as companions (model correctness, exploration), never inside
 * it.
 *
 * Dispositions (research-owner decision D-U18-1, items 5 and 8, and the
 * contract's §10): four verified first responses and their completion
 * snapshot make the row `observed` with `closure_reason: completed`,
 * stable whatever follows; one to three answered and closed at the review
 * ⇒ `incomplete` with the value and its denominator, censored; one to
 * three answered and still open ⇒ `pending`; never briefed and never
 * opened ⇒ `not_presented`; briefed and never opened ⇒ `pending` while
 * open and null `no_eligible_event` (`briefed_not_opened`) at the review
 * closure; opened, nothing answered, closed at the review ⇒
 * `no_eligible_event` (`orientation_only` | `no_wiring_recorded` |
 * `wiring_only_no_first_response`); never `declined`; held back after a
 * reload ⇒ `interrupted`; a load after a reload without an opening of its
 * own ⇒ `interrupted` unless its own `prior_load_checked` record
 * ESTABLISHES the absence of an earlier opening, in which case the load is
 * read exactly as a first load; a fault in the first-response phase ⇒
 * `technical_failure` with the answers kept in the components.
 * Contradictory, malformed or unverifiable SCORED evidence is a
 * `technical_failure`, never a value; a defect confined to unscored
 * records flags the components and never changes the row. Event order is
 * read only from usable, unique sequence numbers (register §5.259).
 * Read-only; current page load only; no total mixes model, exploration
 * and prediction correctness.
 */
import {
  isM15BoxId,
  M15_ASSIGNED_BOX_ORDER,
  M15_BOX_IDS,
  M15_CONTENT_VERSIONS,
  M15_ENTRY_STATE_VERSION,
  M15_FAMILY,
  M15_OPPORTUNITY_ID,
  M15_PREDICTIONS_PLANNED,
  m15Box,
  type M15BoxId,
  type M15Question,
  m15Question,
  m15Questions,
} from '../../pilot/windows/m15SystemsContent';
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

const FAMILY = M15_FAMILY;
const CANNOT_TELL = 'cannot_tell';

interface QuestionRecord {
  question_id: string;
  box_id: M15BoxId;
  question_index: number;
  question_global_index: number;
  presented: boolean;
  answered: boolean;
  response_kind: 'option' | 'cannot_solve' | null;
  option_id: string | null;
  /** The recount: the first response is the keyed option. */
  correct: boolean | null;
  key_option_id: string;
  recorded_wiring_option_id: string | null;
  consistent_with_recorded_wiring: boolean | null;
  tests_before: Record<string, number> | null;
  drafts_before: number | null;
  help_consults_before: number | null;
  active_ms: number | null;
  focused_ms: number | null;
  input_mode: string | null;
}

interface BoxRecord {
  box_id: M15BoxId;
  presented: boolean;
  dial_ids: string[];
  /** Runs per dial before the wiring (the model record). */
  test_runs: Record<string, number>;
  wiring_recorded: boolean;
  /** The recorded wiring: an option id, `cannot_tell`, or null when none. */
  recorded_wiring: string | null;
  wiring_correct: boolean | null;
  wiring_key_option_id: string;
  results_shown: boolean;
}

interface SnapshotQuestion {
  question_id?: unknown;
  answered?: unknown;
  response_kind?: unknown;
  option_id?: unknown;
  correct?: unknown;
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

function numberRecord(raw: unknown): Record<string, number> | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const out: Record<string, number> = {};

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'number') {
      return null;
    }

    out[key] = value;
  }

  return out;
}

registerFeatureExtractor('M15', (events, context) => {
  const [primary] = registerEntry('M15').features;
  const family = events.filter(
    (event) =>
      (event.page_load_index === undefined ||
        event.page_load_index === context.pageLoadIndex) &&
      event.event_type.startsWith(FAMILY),
  );
  const suffixOf = (event: RawGameEvent) =>
    event.event_type.slice(FAMILY.length);
  const supporting = sequencesOf(family);
  const empty = (
    disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>,
    reason: string,
    extra: Partial<FeatureRecord> = {},
  ) => [
    emptyFeature('M15', primary, disposition, reason, {
      supporting_sequences: supporting,
      ...extra,
    }),
  ];

  // The reload check of this load (decision D-U18-1 item 6; the M14
  // closeout ruling §5.290 (a)): the absence of an earlier opening counts
  // as established only when every check record of the load says so with
  // its flags agreeing (established, continuous, no opening found, at
  // least one earlier record); a load without a check, a discontinuous
  // history or a found opening never establishes it, and a
  // self-contradictory record is a flagged defect that establishes nothing.
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

  // Exposure stages, kept distinct: the briefing (`presented`), the bench
  // opening (`opportunity_opened`), the orientation, boxes, questions.
  let briefed = false;
  let briefedSequence: number | null = null;
  let opened = false;
  let openedSequence: number | null = null;
  let stageAtOpen: string | null = null;
  let orientationAcknowledged = false;
  let reviewClosedAbsent = false;
  const boxes = new Map<M15BoxId, BoxRecord>(
    M15_BOX_IDS.map((id) => [
      id,
      {
        box_id: id,
        presented: false,
        dial_ids: m15Box(id).dials.map((dial) => dial.id),
        test_runs: Object.fromEntries(
          m15Box(id).dials.map((dial) => [dial.id, 0]),
        ),
        wiring_recorded: false,
        recorded_wiring: null,
        wiring_correct: null,
        wiring_key_option_id: m15Box(id).wiring_key_option_id,
        results_shown: false,
      },
    ]),
  );
  const questions = new Map<string, QuestionRecord>(
    m15Questions().map((entry) => [
      entry.id,
      {
        question_id: entry.id,
        box_id: entry.box_id,
        question_index: entry.index,
        question_global_index: entry.global_index,
        presented: false,
        answered: false,
        response_kind: null,
        option_id: null,
        correct: null,
        key_option_id: entry.key_option_id,
        recorded_wiring_option_id: null,
        consistent_with_recorded_wiring: null,
        tests_before: null,
        drafts_before: null,
        help_consults_before: null,
        active_ms: null,
        focused_ms: null,
        input_mode: null,
      },
    ]),
  );
  const realisedBoxes: M15BoxId[] = [];
  const realisedQuestions: string[] = [];
  const help = {
    orientation: 0,
    exploration: 0,
    model: 0,
    measurement: 0,
    feedback: 0,
    closure: 0,
  };
  let completed = false;
  let closedAtReview = false;
  let failure: string | null = null;
  let exposureConsistent = true;
  let modelConsistent = true;
  let feedbackFaults = 0;

  const answered = () =>
    [...questions.values()].filter((entry) => entry.answered);
  const correctCount = () =>
    answered().filter((entry) => entry.correct === true).length;
  const components = (integrityDefect: string | null = null) => {
    const all = m15Questions().map((entry) => questions.get(entry.id)!);
    const byBox = Object.fromEntries(
      M15_BOX_IDS.map((id) => {
        const own = all.filter((entry) => entry.box_id === id);
        const box = boxes.get(id)!;

        return [
          id,
          {
            content_version: M15_CONTENT_VERSIONS[id],
            presented: box.presented,
            numerator: own.filter((entry) => entry.correct === true).length,
            denominator: own.filter((entry) => entry.answered).length,
            planned: 2,
            unanswered_question_ids: own
              .filter((entry) => entry.presented && !entry.answered)
              .map((entry) => entry.question_id),
            unpresented_question_ids: own
              .filter((entry) => !entry.presented)
              .map((entry) => entry.question_id),
          },
        ];
      }),
    );
    const model = Object.fromEntries(
      M15_BOX_IDS.map((id) => {
        const box = boxes.get(id)!;

        return [
          id,
          {
            wiring_recorded: box.wiring_recorded,
            recorded_wiring: box.recorded_wiring,
            wiring_correct: box.wiring_correct,
            wiring_key_option_id: box.wiring_key_option_id,
          },
        ];
      }),
    );
    const exploration = Object.fromEntries(
      M15_BOX_IDS.map((id) => {
        const box = boxes.get(id)!;
        const tested = box.dial_ids.filter(
          (dial) => (box.test_runs[dial] ?? 0) > 0,
        );

        return [
          id,
          {
            dial_ids: [...box.dial_ids],
            runs_per_dial_before_wiring: { ...box.test_runs },
            dials_tested_before_wiring: tested,
            both_dials_tested_before_wiring:
              tested.length === box.dial_ids.length,
            total_runs_before_wiring: Object.values(box.test_runs).reduce(
              (sum, runs) => sum + runs,
              0,
            ),
          },
        ];
      }),
    );
    const recordedBoxes = [...boxes.values()].filter(
      (box) => box.wiring_recorded,
    );

    return {
      administration_version: M15_ENTRY_STATE_VERSION,
      content_versions: { ...M15_CONTENT_VERSIONS },
      assigned_box_order: [...M15_ASSIGNED_BOX_ORDER],
      realised_box_order: [...realisedBoxes],
      assigned_question_order: m15Questions().map((entry) => entry.id),
      realised_question_order: [...realisedQuestions],
      observations_share_one_episode: true,
      exposure: {
        briefed,
        briefed_sequence: briefedSequence,
        bench_opened: opened,
        bench_opened_sequence: openedSequence,
        stage_at_open: stageAtOpen,
        orientation_acknowledged: orientationAcknowledged,
        never_opened_reason: opened
          ? null
          : briefed
            ? 'briefed_not_opened'
            : 'not_briefed_not_opened',
        boxes_presented: realisedBoxes.length,
        questions_presented: realisedQuestions.length,
      },
      reload_check: reloadCheck(),
      first_response_phase_complete: completed,
      first_response_phase_closure: completed
        ? 'completed'
        : closedAtReview
          ? 'closed_at_review'
          : failure === null
            ? null
            : 'technical_failure',
      predictions_answered: answered().length,
      predictions_planned: M15_PREDICTIONS_PLANNED,
      cannot_solve_count: answered().filter(
        (entry) => entry.response_kind === 'cannot_solve',
      ).length,
      cannot_tell_count: recordedBoxes.filter(
        (box) => box.recorded_wiring === CANNOT_TELL,
      ).length,
      by_box: byBox,
      omissions: {
        unanswered_question_ids: all
          .filter((entry) => entry.presented && !entry.answered)
          .map((entry) => entry.question_id),
        unpresented_question_ids: all
          .filter((entry) => !entry.presented)
          .map((entry) => entry.question_id),
      },
      // The model companion — the wiring record, never what was understood.
      model: {
        by_box: model,
        models_recorded: recordedBoxes.length,
        models_correct: recordedBoxes.filter(
          (box) => box.wiring_correct === true,
        ).length,
        models_planned: 2,
      },
      // The exploration companion — the tests run, never proof of reading.
      exploration,
      questions: all.map((entry) => ({ ...entry })),
      help_consults: { ...help },
      results_shown: Object.fromEntries(
        M15_BOX_IDS.map((id) => [id, boxes.get(id)!.results_shown]),
      ),
      feedback_phase_faults: feedbackFaults,
      exposure_record_consistent: exposureConsistent,
      model_record_consistent: modelConsistent,
      ...(integrityDefect === null
        ? {}
        : { integrity_defect: integrityDefect }),
    };
  };

  if (family.length === 0) {
    return [
      absentFeature('M15', primary, context, 'relay bench never presented', {
        components: components(),
      }),
    ];
  }

  // More than one check record, one on a first page load, or one whose
  // flags contradict each other is a defect confined to unscored records:
  // flagged, never a change of the row.
  if (
    checks.length > 1 ||
    (checks.length > 0 && !context.reloaded) ||
    !checksCoherent
  ) {
    exposureConsistent = false;
  }

  /** The never-opened dispositions (ruling item 5), order-free. */
  const neverOpened = () => {
    if (!briefed) {
      return empty(
        'not_presented',
        'relay bench never briefed and never opened',
        {
          components: components(),
        },
      );
    }

    if (reviewClosedAbsent) {
      return empty('no_eligible_event', 'briefed_not_opened', {
        closure_reason: 'closed_at_review',
        censored: true,
        censor_reason: 'briefed_not_opened',
        components: components(),
      });
    }

    return empty('pending', 'briefed_not_opened', { components: components() });
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
    // The briefing may still be acknowledged in this load after the
    // hold-back: the exposure stage stays accurate. A check record that
    // claims an established absence beside the hold-back contradicts it
    // (flagged; the hold-back — the evidence of an opening — wins).
    for (const event of family) {
      if (suffixOf(event) === 'presented') {
        briefed = true;
        briefedSequence = event.sequence ?? null;
      }
    }

    if (absenceEstablished) {
      exposureConsistent = false;
    }

    return empty(
      'interrupted',
      'bench opened in an earlier page load; not re-run after the reload',
      {
        components: { ...components(), held_back_after_reload: true },
      },
    );
  }

  // A load after a reload without an opening of its own and without an
  // ESTABLISHED absence of an earlier opening: `interrupted`, read before
  // any position is compared (precedence over `technical_failure`) — a
  // missing or broken history is never proof of no prior exposure. With
  // the absence established the load is read exactly as a first load.
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

    return empty(
      'interrupted',
      'no current-load bench evidence after a reload: relay bench not opened in this page load and the absence of an earlier opening not established',
      { components: components() },
    );
  }

  // Everything below compares positions.
  const defect = orderDefect(family);

  if (defect !== null) {
    return empty('technical_failure', defect, { components: components() });
  }

  const ordered = family
    .slice()
    .sort((a, b) => (a.sequence as number) - (b.sequence as number));
  const fail = (reason: string) =>
    empty('technical_failure', reason, {
      closure_reason: 'technical_failure',
      included_ids: answered().map((entry) => entry.question_id),
      components: components(reason),
    });

  /** A closure snapshot must agree with the recount of the first responses. */
  const snapshotAgrees = (event: RawGameEvent): boolean => {
    const entries = meta<SnapshotQuestion[]>(event, 'questions');

    if (
      !Array.isArray(entries) ||
      meta<unknown>(event, 'predictions_answered') !== answered().length ||
      meta<unknown>(event, 'correct_first_predictions') !== correctCount()
    ) {
      return false;
    }

    return m15Questions().every((def) => {
      const entry = entries.find(
        (candidate) => candidate.question_id === def.id,
      );
      const record = questions.get(def.id)!;

      if (entry === undefined) {
        return false;
      }

      return record.answered
        ? entry.answered === true &&
            entry.response_kind === record.response_kind &&
            entry.option_id === record.option_id &&
            entry.correct === record.correct
        : entry.answered === false;
    });
  };

  const questionOf = (
    event: RawGameEvent,
  ): { def: M15Question; record: QuestionRecord } | null => {
    const id = meta<unknown>(event, 'question_id');
    const def = typeof id === 'string' ? m15Question(id) : undefined;

    if (def === undefined) {
      return null;
    }

    if (meta<unknown>(event, 'box_id') !== def.box_id) {
      return null;
    }

    return { def, record: questions.get(def.id)! };
  };

  for (const event of ordered) {
    const suffix = suffixOf(event);

    if (
      meta<unknown>(event, 'entry_state_version') !== M15_ENTRY_STATE_VERSION
    ) {
      return fail('an event of the family carries an unknown version');
    }

    if (meta<unknown>(event, 'opportunity_id') !== M15_OPPORTUNITY_ID) {
      return fail('an event of the family carries another opportunity id');
    }

    const boxId = meta<unknown>(event, 'box_id');
    const scored =
      suffix === 'box_presented' ||
      suffix === 'question_presented' ||
      suffix === 'first_response';

    if (scored) {
      if (!isM15BoxId(boxId)) {
        return fail('a scored event names an unknown box');
      }

      if (
        meta<unknown>(event, 'content_version') !== M15_CONTENT_VERSIONS[boxId]
      ) {
        return fail('a content version does not match its box');
      }

      if (!opened) {
        return fail('a scored event before the bench was opened');
      }

      if (completed) {
        return fail(
          suffix === 'first_response'
            ? 'a first response after the scored phase was complete'
            : 'a presentation after the scored phase was complete',
        );
      }

      if (closedAtReview || failure !== null) {
        return fail('a scored event after the series closed');
      }
    }

    switch (suffix) {
      case 'presented':
        briefed = true;
        briefedSequence = event.sequence ?? null;
        break;
      case 'opportunity_opened': {
        if (opened) {
          return fail('the bench was opened twice');
        }

        opened = true;
        openedSequence = event.sequence ?? null;

        const snapshot = meta<Record<string, unknown>>(
          event,
          'entry_state_snapshot',
        );

        stageAtOpen =
          typeof snapshot?.stage === 'string' ? snapshot.stage : null;
        break;
      }
      case 'orientation_acknowledged':
        orientationAcknowledged = true;
        break;
      case 'box_presented': {
        const id = boxId as M15BoxId;
        const box = boxes.get(id)!;

        if (box.presented) {
          return fail('a box was presented twice');
        }

        if (id !== M15_ASSIGNED_BOX_ORDER[realisedBoxes.length]) {
          return fail('a box was presented out of the assigned order');
        }

        // Every question of every earlier box has its first response
        // before the next box appears (fixed order; nothing is skipped).
        const unansweredBefore = realisedBoxes.some((earlier) =>
          m15Box(earlier).questions.some(
            (question) => !questions.get(question.id)!.answered,
          ),
        );

        if (unansweredBefore) {
          return fail(
            'a box was presented before every first response of the previous box',
          );
        }

        box.presented = true;
        realisedBoxes.push(id);
        break;
      }
      case 'test_run': {
        // An exploration record, never a response: a defect flags the model
        // record only.
        const dialId = meta<unknown>(event, 'dial_id');

        if (
          !isM15BoxId(boxId) ||
          typeof dialId !== 'string' ||
          !boxes.get(boxId)!.dial_ids.includes(dialId) ||
          !boxes.get(boxId)!.presented
        ) {
          modelConsistent = false;
          break;
        }

        const box = boxes.get(boxId)!;

        if (box.wiring_recorded) {
          // A test after the box's wiring was recorded.
          modelConsistent = false;
          break;
        }

        box.test_runs[dialId] = (box.test_runs[dialId] ?? 0) + 1;
        break;
      }
      case 'wiring_drafted': {
        if (!isM15BoxId(boxId) || !boxes.get(boxId)!.presented) {
          exposureConsistent = false;
        }

        break;
      }
      case 'wiring_recorded': {
        // The model record (a companion): a defect flags the components.
        if (!isM15BoxId(boxId) || !boxes.get(boxId)!.presented) {
          modelConsistent = false;
          break;
        }

        const box = boxes.get(boxId)!;
        const def = m15Box(boxId);
        const kind = meta<unknown>(event, 'response_kind');
        const optionId = meta<unknown>(event, 'option_id');
        const correct = meta<unknown>(event, 'correct');

        if (box.wiring_recorded) {
          modelConsistent = false;
          break;
        }

        if (kind === 'cannot_tell') {
          box.wiring_recorded = true;
          box.recorded_wiring = CANNOT_TELL;
          box.wiring_correct = false;

          if (
            correct !== false ||
            (optionId !== null && optionId !== undefined)
          ) {
            modelConsistent = false;
          }
        } else if (
          kind === 'option' &&
          typeof optionId === 'string' &&
          def.wiring_options.some((option) => option.id === optionId)
        ) {
          const recount = optionId === def.wiring_key_option_id;

          box.wiring_recorded = true;
          box.recorded_wiring = optionId;
          box.wiring_correct = recount;

          if (correct !== recount) {
            modelConsistent = false;
          }
        } else {
          modelConsistent = false;
        }

        if (
          meta<unknown>(event, 'key_option_id') !== def.wiring_key_option_id
        ) {
          modelConsistent = false;
        }

        const testsBefore = numberRecord(meta<unknown>(event, 'tests_before'));

        if (
          testsBefore === null ||
          box.dial_ids.some(
            (dial) => (testsBefore[dial] ?? 0) !== (box.test_runs[dial] ?? 0),
          )
        ) {
          modelConsistent = false;
        }

        break;
      }
      case 'question_presented': {
        const found = questionOf(event);

        if (found === null) {
          return fail(
            'a question presentation names an unknown question or a question of another box',
          );
        }

        const { def, record } = found;
        const box = boxes.get(def.box_id)!;

        if (!box.presented) {
          return fail('a question presented before its box');
        }

        if (!box.wiring_recorded) {
          return fail(
            "a question presented before its box's wiring was recorded",
          );
        }

        if (record.presented) {
          return fail('a question was presented twice');
        }

        if (def.id !== m15Questions()[realisedQuestions.length]?.id) {
          return fail('a question was presented out of the assigned order');
        }

        const previous = realisedQuestions[realisedQuestions.length - 1];

        if (previous !== undefined && !questions.get(previous)!.answered) {
          return fail(
            'a question was presented before the previous first response',
          );
        }

        record.presented = true;
        realisedQuestions.push(def.id);
        break;
      }
      case 'option_drafted': {
        const found = questionOf(event);

        if (found === null || !found.record.presented) {
          exposureConsistent = false;
        }

        break;
      }
      case 'first_response': {
        const found = questionOf(event);

        if (found === null) {
          return fail(
            'a first response names an unknown question or a question of another box',
          );
        }

        const { def, record } = found;

        if (!record.presented) {
          return fail('a first response without its question presentation');
        }

        if (record.answered) {
          return fail('two first responses for one question');
        }

        if (meta<unknown>(event, 'phase') !== 'measurement') {
          return fail('a first response outside the first-response phase');
        }

        const kind = meta<unknown>(event, 'response_kind');
        const correct = meta<unknown>(event, 'correct');
        const optionId = meta<unknown>(event, 'option_id');

        if (kind !== 'option' && kind !== 'cannot_solve') {
          return fail('a first response of an unknown kind');
        }

        if (typeof correct !== 'boolean') {
          return fail('a first response without a boolean outcome');
        }

        if (meta<unknown>(event, 'key_option_id') !== def.key_option_id) {
          return fail('a first response whose key disagrees with the content');
        }

        let recount: boolean;

        if (kind === 'cannot_solve') {
          if (optionId !== null && optionId !== undefined) {
            return fail('a CANNOT SOLVE response carries an option');
          }

          if (correct) {
            return fail('a CANNOT SOLVE response is marked correct');
          }

          recount = false;
        } else {
          if (
            typeof optionId !== 'string' ||
            !def.options.some((option) => option.id === optionId)
          ) {
            return fail(
              'an option response without an option of its own question',
            );
          }

          recount = optionId === def.key_option_id;
        }

        if (recount !== correct) {
          return fail('a first response whose outcome contradicts the key');
        }

        // The model and exploration companions on the response: a
        // disagreement with the box's record flags the components only.
        const box = boxes.get(def.box_id)!;
        const recordedWiring = meta<unknown>(
          event,
          'recorded_wiring_option_id',
        );
        const consistent = meta<unknown>(
          event,
          'consistent_with_recorded_wiring',
        );
        const testsBefore = numberRecord(meta<unknown>(event, 'tests_before'));

        if (
          typeof recordedWiring !== 'string' ||
          recordedWiring !== box.recorded_wiring
        ) {
          modelConsistent = false;
        }

        if (
          consistent !== null &&
          consistent !== undefined &&
          typeof consistent !== 'boolean'
        ) {
          modelConsistent = false;
        }

        if (
          testsBefore === null ||
          box.dial_ids.some(
            (dial) => (testsBefore[dial] ?? 0) !== (box.test_runs[dial] ?? 0),
          )
        ) {
          modelConsistent = false;
        }

        const drafts = meta<unknown>(event, 'drafts_before');
        const helpBefore = meta<unknown>(event, 'help_consults_before');
        const activeMs = meta<unknown>(event, 'active_ms');
        const focusedMs = meta<unknown>(event, 'focused_ms');
        const inputMode = meta<unknown>(event, 'input_mode');

        record.answered = true;
        record.response_kind = kind;
        record.option_id = kind === 'option' ? (optionId as string) : null;
        record.correct = recount;
        record.recorded_wiring_option_id =
          typeof recordedWiring === 'string' ? recordedWiring : null;
        record.consistent_with_recorded_wiring =
          typeof consistent === 'boolean' ? consistent : null;
        record.tests_before = testsBefore ?? { ...box.test_runs };
        record.drafts_before = typeof drafts === 'number' ? drafts : null;
        record.help_consults_before =
          typeof helpBefore === 'number' ? helpBefore : null;
        record.active_ms = typeof activeMs === 'number' ? activeMs : null;
        record.focused_ms = typeof focusedMs === 'number' ? focusedMs : null;
        record.input_mode = typeof inputMode === 'string' ? inputMode : null;
        break;
      }
      case 'first_responses_completed':
        if (completed) {
          return fail('the scored phase was completed twice');
        }

        if (closedAtReview || failure !== null) {
          return fail('the scored phase completed after the series closed');
        }

        if (answered().length < M15_PREDICTIONS_PLANNED) {
          return fail(
            'the completion snapshot precedes the fourth first response',
          );
        }

        if (!snapshotAgrees(event)) {
          return fail('the completion snapshot disagrees with the recount');
        }

        completed = true;
        break;
      case 'results_shown':
        // Correctness feedback before the scored phase was complete voids
        // the scored evidence — also in a series that never reaches four.
        if (!completed) {
          return fail('results shown before the fourth first response');
        }

        if (isM15BoxId(boxId)) {
          boxes.get(boxId)!.results_shown = true;
        } else {
          exposureConsistent = false;
        }

        break;
      case 'series_closed_at_review':
        if (completed) {
          return fail('the series closed after the scored phase was complete');
        }

        if (closedAtReview || failure !== null) {
          return fail('the series closed twice');
        }

        if (!snapshotAgrees(event)) {
          return fail('the closure snapshot disagrees with the recount');
        }

        closedAtReview = true;
        break;
      case 'technical_failure':
        if (!opened) {
          // A fault before any opening leaves no scored evidence to void.
          break;
        }

        if (!completed && !closedAtReview) {
          failure ??= String(
            meta<unknown>(event, 'detail') ?? 'technical failure',
          );
        } else {
          feedbackFaults += 1;
        }

        break;
      case 'help_consulted': {
        const phase = meta<unknown>(event, 'phase');

        if (phase === 'orientation') {
          help.orientation += 1;
        } else if (phase === 'exploration') {
          help.exploration += 1;

          if (!isM15BoxId(boxId)) {
            exposureConsistent = false;
          }
        } else if (phase === 'model') {
          help.model += 1;

          if (!isM15BoxId(boxId)) {
            exposureConsistent = false;
          }
        } else if (phase === 'measurement') {
          help.measurement += 1;

          if (questionOf(event) === null) {
            exposureConsistent = false;
          }
        } else if (phase === 'closure') {
          help.closure += 1;
        } else {
          help.feedback += 1;
        }

        break;
      }
      case 'window_closed':
        // The kit's record: for a never-opened bench it is the review
        // closure's absence record, not bench evidence.
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

  if (answered().length === M15_PREDICTIONS_PLANNED && !completed) {
    return fail('four first responses without the completion snapshot');
  }

  if (!opened) {
    // No bench evidence of its own in this load: a first load, or a
    // reloaded load whose check established the absence of an earlier
    // opening (a reloaded load without that returned above).
    return neverOpened();
  }

  // A check that found an earlier opening beside an opening of this load
  // contradicts the hold-back the guard would have applied: flagged.
  if (checkFlag('prior_opening_found') === true) {
    exposureConsistent = false;
  }

  const included = answered().map((entry) => entry.question_id);
  const numerator = correctCount();
  const denominator = answered().length;

  if (failure !== null) {
    return empty(
      'technical_failure',
      `technical failure in the first-response phase: ${failure}`,
      {
        closure_reason: 'technical_failure',
        included_ids: included,
        components: components(),
      },
    );
  }

  if (completed) {
    // Complete and stable from the fourth first response onward.
    return [
      fractionFeature(
        'M15',
        primary,
        numerator,
        denominator,
        included,
        supporting,
        { disposition: 'no_eligible_event', reason: 'no question answered' },
        {
          closure_reason: 'completed',
          censored: false,
          censor_reason: null,
          components: components(),
        },
      ),
    ] satisfies FeatureRecord[];
  }

  if (!closedAtReview) {
    return empty('pending', 'the first-response phase is still open', {
      included_ids: included,
      components: components(),
    });
  }

  // Opened, nothing answered, closed at the review: the stage reached.
  const reason =
    realisedBoxes.length === 0
      ? 'orientation_only'
      : [...boxes.values()].every((box) => !box.wiring_recorded)
        ? 'no_wiring_recorded'
        : 'wiring_only_no_first_response';
  const detail = `series closed at the review after ${denominator} of ${M15_PREDICTIONS_PLANNED} first responses`;

  return [
    fractionFeature(
      'M15',
      primary,
      numerator,
      denominator,
      included,
      supporting,
      { disposition: 'no_eligible_event', reason },
      {
        closure_reason: 'closed_at_review',
        censored: true,
        censor_reason: denominator === 0 ? reason : detail,
        components: components(),
      },
    ),
  ] satisfies FeatureRecord[];
});
