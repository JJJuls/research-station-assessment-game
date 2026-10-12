/**
 * M16 feature extractor (Unit 19): `m16_correct_first_applications` =
 * vials whose FIRST response is the keyed drawer of that vial, over the
 * vials with a first response (a drawer or DON'T KNOW) in the current page
 * load, planned denominator 6 — recounted from the
 * `proto_m16_handling_first_response` events alone: each response's
 * correctness is recomputed from the content module's key for that vial
 * and compared with the event's own `correct` flag and with the closure
 * snapshot. DON'T KNOW and a wrong drawer are in the denominator and not in
 * the numerator; a vial without a first response — unpresented or
 * presented and unanswered — is missing, never incorrect, and is listed
 * apart from DON'T KNOW; teaching exposure, help, drafts, time and input
 * mode never change the numerator or the denominator and are reported
 * beside the value as companions, never inside it.
 *
 * Dispositions (research-owner decision D-U19-1, items 7 and 9, and the
 * contract's §10): six verified first responses and their completion
 * snapshot make the row `observed` with `closure_reason: completed`,
 * stable whatever follows; one to five answered and closed at the review
 * ⇒ `incomplete` with the value and its observed denominator, censored;
 * one to five answered and still open ⇒ `pending`; never briefed and never
 * opened ⇒ `not_presented`; briefed and never opened ⇒ `pending` while
 * open and null `no_eligible_event` (`briefed_not_opened`) at the review
 * closure; opened, nothing answered, closed at the review ⇒
 * `no_eligible_event` (`intro_only` | `teaching_only` |
 * `teaching_closed_no_first_response`); never `declined`; held back after
 * a reload ⇒ `interrupted`; a load after a reload without an opening of
 * its own ⇒ `interrupted` unless its own `prior_load_checked` record
 * ESTABLISHES the absence of an earlier opening, in which case the load is
 * read exactly as a first load; a fault while the series is open ⇒
 * `technical_failure` with the answers kept in the components.
 * Contradictory, malformed or unverifiable SCORED evidence is a
 * `technical_failure`, never a value; a defect confined to unscored
 * records (teaching, drafts, help, exposure) flags the components and
 * never changes the row. Event order is read only from usable, unique
 * sequence numbers (register §5.259). Read-only; current page load only;
 * the legacy family `proto_m16_protocol_*` is never read; no total mixes
 * teaching and application; no total across items.
 */
import {
  isM16ExampleId,
  isM16VialId,
  M16_ASSIGNED_VIAL_ORDER,
  M16_ENTRY_STATE_VERSION,
  M16_EXAMPLES_VERSION,
  M16_FAMILY,
  M16_FORM_ID,
  M16_OPPORTUNITY_ID,
  M16_RULE_VERSION,
  M16_VIALS,
  M16_VIALS_PLANNED,
  type M16ErrorKind,
  m16ErrorKind,
  type M16Vial,
  m16Vial,
  type M16VialId,
} from '../../pilot/windows/m16HandlingContent';
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

const FAMILY = M16_FAMILY;

interface VialRecord {
  vial_id: M16VialId;
  vial_index: number;
  presented: boolean;
  answered: boolean;
  response_kind: 'option' | 'dont_know' | null;
  option_id: string | null;
  /** The recount: the first response is the keyed drawer. */
  correct: boolean | null;
  key_option_id: string;
  /** What a wrong drawer represents (preview §5.3); null for the key and DON'T KNOW. */
  error_kind: M16ErrorKind | null;
  drafts_before: number | null;
  help_consults_before: number | null;
  active_ms: number | null;
  focused_ms: number | null;
  input_mode: string | null;
}

interface SnapshotVial {
  vial_id?: unknown;
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

function countRecord(raw: unknown): Record<string, number> | null {
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

registerFeatureExtractor('M16', (events, context) => {
  const [primary] = registerEntry('M16').features;
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
    emptyFeature('M16', primary, disposition, reason, {
      supporting_sequences: supporting,
      ...extra,
    }),
  ];

  // The reload check of this load (decision D-U19-1 item 8; the M14
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

  // Exposure stages, kept distinct: the briefing (`presented`), the console
  // opening (`opportunity_opened`), the card, the examples, the boundary,
  // the vials.
  let briefed = false;
  let briefedSequence: number | null = null;
  let opened = false;
  let openedSequence: number | null = null;
  let stageAtOpen: string | null = null;
  let introAcknowledged = false;
  let reviewClosedAbsent = false;
  const exampleViews: Record<string, number> = { m16_e1: 0, m16_e2: 0 };
  let backNavigations: number | null = null;
  let teachingActiveMs: number | null = null;
  let teachingClosed = false;
  const vials = new Map<M16VialId, VialRecord>(
    M16_VIALS.map((entry) => [
      entry.id,
      {
        vial_id: entry.id,
        vial_index: entry.index,
        presented: false,
        answered: false,
        response_kind: null,
        option_id: null,
        correct: null,
        key_option_id: entry.key_option_id,
        error_kind: null,
        drafts_before: null,
        help_consults_before: null,
        active_ms: null,
        focused_ms: null,
        input_mode: null,
      },
    ]),
  );
  const realisedVials: M16VialId[] = [];
  const help = {
    intro: 0,
    teaching: 0,
    measurement: 0,
    feedback: 0,
    closure: 0,
  };
  const resultsShown = { 1: false, 2: false };
  let completed = false;
  let closedAtReview = false;
  let failure: string | null = null;
  let exposureConsistent = true;
  let teachingConsistent = true;
  let feedbackFaults = 0;

  const answered = () => [...vials.values()].filter((entry) => entry.answered);
  const correctCount = () =>
    answered().filter((entry) => entry.correct === true).length;
  const components = (integrityDefect: string | null = null) => {
    const all = M16_VIALS.map((entry) => vials.get(entry.id)!);

    return {
      administration_version: M16_ENTRY_STATE_VERSION,
      form_id: M16_FORM_ID,
      rule_version: M16_RULE_VERSION,
      examples_version: M16_EXAMPLES_VERSION,
      assigned_vial_order: [...M16_ASSIGNED_VIAL_ORDER],
      realised_vial_order: [...realisedVials],
      observations_share_one_episode: true,
      exposure: {
        briefed,
        briefed_sequence: briefedSequence,
        console_opened: opened,
        console_opened_sequence: openedSequence,
        stage_at_open: stageAtOpen,
        intro_acknowledged: introAcknowledged,
        examples_viewed: { ...exampleViews },
        teaching_closed: teachingClosed,
        vials_presented: realisedVials.length,
        never_opened_reason: opened
          ? null
          : briefed
            ? 'briefed_not_opened'
            : 'not_briefed_not_opened',
      },
      // The teaching companion — exposure to the worked examples, never
      // part of the value.
      teaching: {
        examples_viewed: { ...exampleViews },
        back_navigations: backNavigations,
        teaching_active_ms: teachingActiveMs,
        teaching_closed: teachingClosed,
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
      vials_answered: answered().length,
      vials_planned: M16_VIALS_PLANNED,
      dont_know_count: answered().filter(
        (entry) => entry.response_kind === 'dont_know',
      ).length,
      omissions: {
        unanswered_vial_ids: all
          .filter((entry) => entry.presented && !entry.answered)
          .map((entry) => entry.vial_id),
        unpresented_vial_ids: all
          .filter((entry) => !entry.presented)
          .map((entry) => entry.vial_id),
      },
      vials: all.map((entry) => ({ ...entry })),
      help_consults: { ...help },
      results_shown: { ...resultsShown },
      feedback_phase_faults: feedbackFaults,
      exposure_record_consistent: exposureConsistent,
      teaching_record_consistent: teachingConsistent,
      ...(integrityDefect === null
        ? {}
        : { integrity_defect: integrityDefect }),
    };
  };

  if (family.length === 0) {
    return [
      absentFeature(
        'M16',
        primary,
        context,
        'protocol console never presented',
        { components: components() },
      ),
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

  /** The never-opened dispositions (ruling item 7), order-free. */
  const neverOpened = () => {
    if (!briefed) {
      return empty(
        'not_presented',
        'protocol console never briefed and never opened',
        { components: components() },
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
      'console opened in an earlier page load; not re-run after the reload',
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
      'no current-load console evidence after a reload: protocol console not opened in this page load and the absence of an earlier opening not established',
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
      included_ids: answered().map((entry) => entry.vial_id),
      components: components(reason),
    });

  /**
   * The entry snapshot's declared task definition against the content:
   * exactly six unique known vial records, each with exactly four unique
   * option ids in the content's order and the content's key. Returns the
   * defect, or null when the definition is complete and consistent.
   */
  const snapshotDefinitionDefect = (vials: unknown): string | null => {
    if (!Array.isArray(vials)) {
      return 'the entry snapshot carries no vial list';
    }

    if (vials.length !== M16_VIALS.length) {
      return `the entry snapshot declares ${vials.length} vial records, not ${M16_VIALS.length}`;
    }

    const seen = new Set<string>();

    for (const entry of vials as unknown[]) {
      if (typeof entry !== 'object' || entry === null) {
        return 'the entry snapshot carries a vial record that is not a record';
      }

      const record = entry as {
        vial_id?: unknown;
        key_option_id?: unknown;
        option_ids?: unknown;
      };
      const def = M16_VIALS.find(
        (candidate) => candidate.id === record.vial_id,
      );

      if (def === undefined) {
        return 'the entry snapshot declares a vial the content does not have';
      }

      if (seen.has(def.id)) {
        return 'the entry snapshot declares a vial twice';
      }

      seen.add(def.id);

      const optionIds = record.option_ids;

      if (
        !Array.isArray(optionIds) ||
        optionIds.length !== def.options.length ||
        new Set(optionIds).size !== optionIds.length ||
        !def.options.every((option, index) => optionIds[index] === option.id)
      ) {
        return "the entry snapshot's options disagree with the content";
      }

      if (record.key_option_id !== def.key_option_id) {
        return "the entry snapshot's key disagrees with the content";
      }
    }

    // Six records, none unknown, none twice: every content vial is declared.
    return null;
  };

  /** A closure snapshot must agree with the recount of the first responses. */
  const snapshotAgrees = (event: RawGameEvent): boolean => {
    const entries = meta<SnapshotVial[]>(event, 'vials');

    if (
      !Array.isArray(entries) ||
      meta<unknown>(event, 'vials_answered') !== answered().length ||
      meta<unknown>(event, 'correct_first_applications') !== correctCount()
    ) {
      return false;
    }

    return M16_VIALS.every((def) => {
      const entry = entries.find((candidate) => candidate.vial_id === def.id);
      const record = vials.get(def.id)!;

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

  const vialOf = (
    event: RawGameEvent,
  ): { def: M16Vial; record: VialRecord } | null => {
    const id = meta<unknown>(event, 'vial_id');

    if (!isM16VialId(id)) {
      return null;
    }

    return { def: m16Vial(id), record: vials.get(id)! };
  };

  for (const event of ordered) {
    const suffix = suffixOf(event);

    if (
      meta<unknown>(event, 'entry_state_version') !== M16_ENTRY_STATE_VERSION
    ) {
      return fail('an event of the family carries an unknown version');
    }

    if (meta<unknown>(event, 'opportunity_id') !== M16_OPPORTUNITY_ID) {
      return fail('an event of the family carries another opportunity id');
    }

    const scored = suffix === 'vial_presented' || suffix === 'first_response';

    if (scored) {
      if (meta<unknown>(event, 'form_id') !== M16_FORM_ID) {
        return fail('a scored event carries an unknown form');
      }

      if (!opened) {
        return fail('a scored event before the console was opened');
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
          return fail('the console was opened twice');
        }

        opened = true;
        openedSequence = event.sequence ?? null;

        const snapshot = meta<Record<string, unknown>>(
          event,
          'entry_state_snapshot',
        );

        if (
          snapshot?.form_id !== M16_FORM_ID ||
          snapshot?.rule_version !== M16_RULE_VERSION
        ) {
          return fail('the entry snapshot carries an unknown form or rule');
        }

        // The snapshot's declared task definition is scored evidence too
        // (contract §10; the closeout ruling of 12 October 2026, register
        // §5.314): the COMPLETE definition is validated — exactly the
        // content's six vial records, each once, each with its four option
        // ids in the fixed order and its key. A missing, duplicate,
        // conflicting or unknown record fails the row; one matching record
        // beside a conflicting one never passes. Task metadata only: the
        // responses keep their own rules below.
        const definitionDefect = snapshotDefinitionDefect(snapshot?.vials);

        if (definitionDefect !== null) {
          return fail(definitionDefect);
        }

        if (snapshot?.examples_version !== M16_EXAMPLES_VERSION) {
          teachingConsistent = false;
        }

        stageAtOpen =
          typeof snapshot?.stage === 'string' ? snapshot.stage : null;
        break;
      }
      case 'intro_acknowledged':
        introAcknowledged = true;
        break;
      case 'example_viewed': {
        // A teaching record, never a response: a defect flags the teaching
        // record only.
        const id = meta<unknown>(event, 'example_id');

        if (!isM16ExampleId(id) || teachingClosed || !opened) {
          teachingConsistent = false;
          break;
        }

        exampleViews[id] += 1;
        break;
      }
      case 'teaching_closed': {
        // The boundary record: it gates the vials (a vial before it voids
        // the row) but is itself a teaching record — a second one, one
        // before the opening or one with another form flags the teaching
        // record only.
        if (
          teachingClosed ||
          !opened ||
          meta<unknown>(event, 'form_id') !== M16_FORM_ID
        ) {
          teachingConsistent = false;
          break;
        }

        teachingClosed = true;

        const views = countRecord(meta<unknown>(event, 'example_views'));
        const back = meta<unknown>(event, 'back_navigations');
        const active = meta<unknown>(event, 'teaching_active_ms');

        if (
          views === null ||
          views.m16_e1 !== exampleViews.m16_e1 ||
          views.m16_e2 !== exampleViews.m16_e2
        ) {
          teachingConsistent = false;
        }

        backNavigations = typeof back === 'number' ? back : null;
        teachingActiveMs = typeof active === 'number' ? active : null;
        break;
      }
      case 'vial_presented': {
        const found = vialOf(event);

        if (found === null) {
          return fail('a vial presentation names an unknown vial');
        }

        const { def, record } = found;

        if (!teachingClosed) {
          return fail('a vial presented before teaching was closed');
        }

        if (record.presented) {
          return fail('a vial was presented twice');
        }

        if (def.id !== M16_ASSIGNED_VIAL_ORDER[realisedVials.length]) {
          return fail('a vial was presented out of the assigned order');
        }

        const previous = realisedVials[realisedVials.length - 1];

        if (previous !== undefined && !vials.get(previous)!.answered) {
          return fail(
            "a vial was presented before the previous vial's first response",
          );
        }

        record.presented = true;
        realisedVials.push(def.id);
        break;
      }
      case 'option_drafted': {
        const found = vialOf(event);

        if (found === null || !found.record.presented) {
          exposureConsistent = false;
        }

        break;
      }
      case 'first_response': {
        const found = vialOf(event);

        if (found === null) {
          return fail('a first response names an unknown vial');
        }

        const { def, record } = found;

        if (!record.presented) {
          return fail('a first response without its vial presentation');
        }

        if (record.answered) {
          return fail('two first responses for one vial');
        }

        if (meta<unknown>(event, 'phase') !== 'measurement') {
          return fail('a first response outside the measurement phase');
        }

        const kind = meta<unknown>(event, 'response_kind');
        const correct = meta<unknown>(event, 'correct');
        const optionId = meta<unknown>(event, 'option_id');

        if (kind !== 'option' && kind !== 'dont_know') {
          return fail('a first response of an unknown kind');
        }

        if (typeof correct !== 'boolean') {
          return fail('a first response without a boolean outcome');
        }

        if (meta<unknown>(event, 'key_option_id') !== def.key_option_id) {
          return fail('a first response whose key disagrees with the content');
        }

        let recount: boolean;

        if (kind === 'dont_know') {
          if (optionId !== null && optionId !== undefined) {
            return fail("a DON'T KNOW response carries an option");
          }

          if (correct) {
            return fail("a DON'T KNOW response is marked correct");
          }

          recount = false;
        } else {
          if (
            typeof optionId !== 'string' ||
            !def.options.some((option) => option.id === optionId)
          ) {
            return fail('an option response without an option of its own vial');
          }

          recount = optionId === def.key_option_id;
        }

        if (recount !== correct) {
          return fail('a first response whose outcome contradicts the key');
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
        record.error_kind =
          kind === 'option' ? m16ErrorKind(def.id, optionId as string) : null;
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

        if (answered().length < M16_VIALS_PLANNED) {
          return fail(
            'the completion snapshot precedes the sixth first response',
          );
        }

        if (!snapshotAgrees(event)) {
          return fail('the completion snapshot disagrees with the recount');
        }

        completed = true;
        break;
      case 'results_shown': {
        // Correctness feedback before the scored phase was complete voids
        // the scored evidence — also in a series that never reaches six.
        if (!completed) {
          return fail('results shown before the sixth first response');
        }

        const page = meta<unknown>(event, 'page');

        if (page === 1 || page === 2) {
          if (resultsShown[page]) {
            // A page recorded as shown twice: flagged, never the row.
            exposureConsistent = false;
          }

          resultsShown[page] = true;
        } else {
          exposureConsistent = false;
        }

        break;
      }
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

        if (phase === 'intro') {
          help.intro += 1;
        } else if (phase === 'teaching') {
          help.teaching += 1;
        } else if (phase === 'measurement') {
          help.measurement += 1;

          if (vialOf(event) === null) {
            exposureConsistent = false;
          }
        } else if (phase === 'feedback') {
          help.feedback += 1;
        } else if (phase === 'closure') {
          help.closure += 1;
        } else {
          // A help record without a phase: flagged, never the row.
          exposureConsistent = false;
        }

        break;
      }
      case 'window_closed':
        // The kit's record: for a never-opened console it is the review
        // closure's absence record, not console evidence.
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

  if (answered().length === M16_VIALS_PLANNED && !completed) {
    return fail('six first responses without the completion snapshot');
  }

  if (!opened) {
    // No console evidence of its own in this load: a first load, or a
    // reloaded load whose check established the absence of an earlier
    // opening (a reloaded load without that returned above).
    return neverOpened();
  }

  // A check that found an earlier opening beside an opening of this load
  // contradicts the hold-back the guard would have applied: flagged.
  if (checkFlag('prior_opening_found') === true) {
    exposureConsistent = false;
  }

  const included = answered().map((entry) => entry.vial_id);
  const numerator = correctCount();
  const denominator = answered().length;

  if (failure !== null) {
    return empty(
      'technical_failure',
      `technical failure while the series was open: ${failure}`,
      {
        closure_reason: 'technical_failure',
        included_ids: included,
        components: components(),
      },
    );
  }

  if (completed) {
    // Complete and stable from the sixth first response onward.
    return [
      fractionFeature(
        'M16',
        primary,
        numerator,
        denominator,
        included,
        supporting,
        { disposition: 'no_eligible_event', reason: 'no vial answered' },
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
  const reason = !introAcknowledged
    ? 'intro_only'
    : !teachingClosed
      ? 'teaching_only'
      : 'teaching_closed_no_first_response';
  const detail = `series closed at the review after ${denominator} of ${M16_VIALS_PLANNED} first responses`;

  return [
    fractionFeature(
      'M16',
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
