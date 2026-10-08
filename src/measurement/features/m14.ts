/**
 * M14 feature extractor (Unit 17): `m14_correct_first_integrations` =
 * decisions whose FIRST response is the keyed option of that decision,
 * over the decisions with a first response (option or Cannot solve) in
 * the current page load, planned denominator 6 — recounted from the
 * `proto_m14_integration_first_response` events alone: each response's
 * correctness is recomputed from the content module's key for that
 * decision and content version and compared with the event's own
 * `correct` flag and with the closure snapshot. CANNOT SOLVE and a wrong
 * option are in the denominator and not in the numerator; a decision
 * without a first response is missing, never incorrect; an answer counts
 * whatever sources were opened before it — source openings never
 * exclude, discount or weight an answer, and are reported beside the
 * value as what was opened, never as proof of reading.
 *
 * Dispositions (research-owner decision D-U17-1, item 6, and the
 * contract's §10): six verified first responses and their completion
 * snapshot make the row `observed` with `closure_reason: completed`,
 * stable whatever follows (results, leaving, the review); one to five
 * answered and closed at the review ⇒ `incomplete` with the value and
 * its denominator, censored; never briefed and never opened ⇒
 * `not_presented`; briefed and never opened ⇒ `pending` while open and
 * null `no_eligible_event` (`briefed_not_opened`) at the review closure;
 * never `declined`; held back after a reload ⇒ `interrupted`; a load after
 * a reload without an opening of its own ⇒ `interrupted` unless its own
 * `prior_load_checked` record ESTABLISHES the absence of an earlier opening
 * (a continuous recovered history without one — the research owner's
 * closeout ruling of 9 October 2026), in which case the never-opened
 * dispositions above apply; a fault in the first-response phase ⇒
 * `technical_failure` with the answers kept in the components. Contradictory, malformed or unverifiable SCORED
 * evidence is a `technical_failure`, never a value; a defect confined to
 * unscored records flags the components and never changes the row.
 * Event order is read only from usable, unique sequence numbers
 * (register §5.259 convention). Read-only; current page load only; no
 * total mixes source openings with correctness.
 */
import {
  isM14PacketId,
  M14_ASSIGNED_PACKET_ORDER,
  M14_CONTENT_VERSIONS,
  M14_DECISIONS_PLANNED,
  M14_ENTRY_STATE_VERSION,
  M14_FAMILY,
  M14_OPPORTUNITY_ID,
  M14_PACKET_IDS,
  type M14Decision,
  m14Decision,
  m14Decisions,
  m14Packet,
  type M14PacketId,
} from '../../pilot/windows/m14PacketContent';
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

const FAMILY = M14_FAMILY;

interface EstablishingSetRecord {
  sources: string[];
  size: number;
  opened_before: number;
  all_opened_before: boolean;
}

interface DecisionRecord {
  decision_id: string;
  packet_id: M14PacketId;
  decision_index: number;
  decision_global_index: number;
  presented: boolean;
  answered: boolean;
  response_kind: 'option' | 'cannot_solve' | null;
  option_id: string | null;
  /** The recount: the first response is the keyed option. */
  correct: boolean | null;
  key_option_id: string;
  /** Source ids opened at least once in the packet before the response. */
  sources_opened_before: string[] | null;
  establishing_sets: EstablishingSetRecord[] | null;
  any_establishing_set_fully_opened_before: boolean | null;
  drafts_before: number | null;
  help_consults_before: number | null;
  active_ms: number | null;
  focused_ms: number | null;
  input_mode: string | null;
}

interface PacketRecord {
  packet_id: M14PacketId;
  presented: boolean;
  sources_available: string[];
  sources_opened: string[];
  open_counts: Record<string, number>;
  results_shown: boolean;
}

interface SnapshotDecision {
  decision_id?: unknown;
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

function stringList(raw: unknown): string[] | null {
  return Array.isArray(raw) && raw.every((item) => typeof item === 'string')
    ? [...(raw as string[])]
    : null;
}

registerFeatureExtractor('M14', (events, context) => {
  const [primary] = registerEntry('M14').features;
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
    emptyFeature('M14', primary, disposition, reason, {
      supporting_sequences: supporting,
      ...extra,
    }),
  ];

  // The reload check of this load (closeout ruling of 9 October 2026):
  // the absence of an earlier opening counts as established only when
  // every check record of the load says so with its flags agreeing
  // (established, continuous, no opening found, at least one earlier
  // record); a load without a check, a discontinuous history or a found
  // opening never establishes it, and a self-contradictory record is a
  // flagged defect that establishes nothing.
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

  // Exposure stages, kept distinct: the briefing (`presented`), the desk
  // opening (`opportunity_opened`), the orientation, packets, decisions.
  let briefed = false;
  let briefedSequence: number | null = null;
  let opened = false;
  let openedSequence: number | null = null;
  let stageAtOpen: string | null = null;
  let orientationAcknowledged = false;
  let reviewClosedAbsent = false;
  const packets = new Map<M14PacketId, PacketRecord>(
    M14_PACKET_IDS.map((id) => [
      id,
      {
        packet_id: id,
        presented: false,
        sources_available: m14Packet(id).sources.map((source) => source.id),
        sources_opened: [],
        open_counts: {},
        results_shown: false,
      },
    ]),
  );
  const decisions = new Map<string, DecisionRecord>(
    m14Decisions().map((entry) => [
      entry.id,
      {
        decision_id: entry.id,
        packet_id: entry.packet_id,
        decision_index: entry.index,
        decision_global_index: entry.global_index,
        presented: false,
        answered: false,
        response_kind: null,
        option_id: null,
        correct: null,
        key_option_id: entry.key_option_id,
        sources_opened_before: null,
        establishing_sets: null,
        any_establishing_set_fully_opened_before: null,
        drafts_before: null,
        help_consults_before: null,
        active_ms: null,
        focused_ms: null,
        input_mode: null,
      },
    ]),
  );
  const realisedPackets: M14PacketId[] = [];
  const realisedDecisions: string[] = [];
  const help = { orientation: 0, measurement: 0, feedback: 0, closure: 0 };
  let completed = false;
  let closedAtReview = false;
  let failure: string | null = null;
  let exposureConsistent = true;
  let feedbackFaults = 0;

  const answered = () =>
    [...decisions.values()].filter((entry) => entry.answered);
  const correctCount = () =>
    answered().filter((entry) => entry.correct === true).length;
  const components = (integrityDefect: string | null = null) => {
    const all = m14Decisions().map((entry) => decisions.get(entry.id)!);
    const byPacket = Object.fromEntries(
      M14_PACKET_IDS.map((id) => {
        const own = all.filter((entry) => entry.packet_id === id);
        const packet = packets.get(id)!;

        return [
          id,
          {
            content_version: M14_CONTENT_VERSIONS[id],
            presented: packet.presented,
            numerator: own.filter((entry) => entry.correct === true).length,
            denominator: own.filter((entry) => entry.answered).length,
            planned: 3,
            unanswered_decision_ids: own
              .filter((entry) => entry.presented && !entry.answered)
              .map((entry) => entry.decision_id),
            unpresented_decision_ids: own
              .filter((entry) => !entry.presented)
              .map((entry) => entry.decision_id),
          },
        ];
      }),
    );

    return {
      administration_version: M14_ENTRY_STATE_VERSION,
      content_versions: { ...M14_CONTENT_VERSIONS },
      assigned_packet_order: [...M14_ASSIGNED_PACKET_ORDER],
      realised_packet_order: [...realisedPackets],
      assigned_decision_order: m14Decisions().map((entry) => entry.id),
      realised_decision_order: [...realisedDecisions],
      observations_share_one_episode: true,
      exposure: {
        briefed,
        briefed_sequence: briefedSequence,
        desk_opened: opened,
        desk_opened_sequence: openedSequence,
        stage_at_open: stageAtOpen,
        orientation_acknowledged: orientationAcknowledged,
        // The explicit never-opened reason (ruling item 6), also here.
        never_opened_reason: opened
          ? null
          : briefed
            ? 'briefed_not_opened'
            : 'not_briefed_not_opened',
        packets_presented: realisedPackets.length,
        decisions_presented: realisedDecisions.length,
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
      decisions_answered: answered().length,
      cannot_solve_count: answered().filter(
        (entry) => entry.response_kind === 'cannot_solve',
      ).length,
      by_packet: byPacket,
      omissions: {
        unanswered_decision_ids: all
          .filter((entry) => entry.presented && !entry.answered)
          .map((entry) => entry.decision_id),
        unpresented_decision_ids: all
          .filter((entry) => !entry.presented)
          .map((entry) => entry.decision_id),
      },
      // Openings — what was opened, never what was read, understood or
      // used; kept apart from objective access and from the response.
      source_openings: Object.fromEntries(
        M14_PACKET_IDS.map((id) => {
          const packet = packets.get(id)!;

          return [
            id,
            {
              sources_available: [...packet.sources_available],
              sources_opened: [...packet.sources_opened],
              open_counts: { ...packet.open_counts },
            },
          ];
        }),
      ),
      decisions: all.map((entry) => ({ ...entry })),
      help_consults: { ...help },
      results_shown: Object.fromEntries(
        M14_PACKET_IDS.map((id) => [id, packets.get(id)!.results_shown]),
      ),
      feedback_phase_faults: feedbackFaults,
      exposure_record_consistent: exposureConsistent,
      ...(integrityDefect === null
        ? {}
        : { integrity_defect: integrityDefect }),
    };
  };

  if (family.length === 0) {
    return [
      absentFeature('M14', primary, context, 'incident desk never presented', {
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

  /** The never-opened dispositions (ruling item 6), order-free. */
  const neverOpened = () => {
    if (!briefed) {
      return empty(
        'not_presented',
        'incident desk never briefed and never opened',
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

  // Held back after a reload (the existing convention, register §5.14):
  // the kit's technical failure with a detail beginning `reload` and no
  // opening of its own in this load. Takes precedence over everything.
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
      'desk opened in an earlier page load; not re-run after the reload',
      {
        components: { ...components(), held_back_after_reload: true },
      },
    );
  }

  // A load after a reload without an opening of its own and without an
  // ESTABLISHED absence of an earlier opening: `interrupted`, read before
  // any position is compared (precedence over `technical_failure`) — a
  // missing or broken history is never proof of no prior exposure. With
  // the absence established the load is read exactly as a first load:
  // through the same integrity checks below, ending in the never-opened
  // dispositions because nothing was opened.
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
      'no current-load desk evidence after a reload: incident desk not opened in this page load and the absence of an earlier opening not established',
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
      included_ids: answered().map((entry) => entry.decision_id),
      components: components(reason),
    });

  /** A closure snapshot must agree with the recount of the first responses. */
  const snapshotAgrees = (event: RawGameEvent): boolean => {
    const entries = meta<SnapshotDecision[]>(event, 'decisions');

    if (
      !Array.isArray(entries) ||
      meta<unknown>(event, 'decisions_answered') !== answered().length ||
      meta<unknown>(event, 'correct_first_decisions') !== correctCount()
    ) {
      return false;
    }

    return m14Decisions().every((def) => {
      const entry = entries.find(
        (candidate) => candidate.decision_id === def.id,
      );
      const record = decisions.get(def.id)!;

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

  const decisionOf = (
    event: RawGameEvent,
  ): { def: M14Decision; record: DecisionRecord } | null => {
    const id = meta<unknown>(event, 'decision_id');
    const def = typeof id === 'string' ? m14Decision(id) : undefined;

    if (def === undefined) {
      return null;
    }

    if (meta<unknown>(event, 'packet_id') !== def.packet_id) {
      return null;
    }

    return { def, record: decisions.get(def.id)! };
  };

  for (const event of ordered) {
    const suffix = suffixOf(event);

    if (
      meta<unknown>(event, 'entry_state_version') !== M14_ENTRY_STATE_VERSION
    ) {
      return fail('an event of the family carries an unknown version');
    }

    if (meta<unknown>(event, 'opportunity_id') !== M14_OPPORTUNITY_ID) {
      return fail('an event of the family carries another opportunity id');
    }

    const packetId = meta<unknown>(event, 'packet_id');
    const scored =
      suffix === 'packet_presented' ||
      suffix === 'decision_presented' ||
      suffix === 'first_response';

    if (scored) {
      if (!isM14PacketId(packetId)) {
        return fail('a scored event names an unknown packet');
      }

      if (
        meta<unknown>(event, 'content_version') !==
        M14_CONTENT_VERSIONS[packetId]
      ) {
        return fail('a content version does not match its packet');
      }

      if (!opened) {
        return fail('a scored event before the desk was opened');
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
          return fail('the desk was opened twice');
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
      case 'packet_presented': {
        const id = packetId as M14PacketId;
        const packet = packets.get(id)!;

        if (packet.presented) {
          return fail('a packet was presented twice');
        }

        if (id !== M14_ASSIGNED_PACKET_ORDER[realisedPackets.length]) {
          return fail('a packet was presented out of the assigned order');
        }

        const previous = realisedDecisions[realisedDecisions.length - 1];

        if (previous !== undefined && !decisions.get(previous)!.answered) {
          return fail(
            'a packet was presented before the previous first response',
          );
        }

        packet.presented = true;
        realisedPackets.push(id);
        break;
      }
      case 'decision_presented': {
        const found = decisionOf(event);

        if (found === null) {
          return fail(
            'a decision presentation names an unknown decision or a decision of another packet',
          );
        }

        const { def, record } = found;

        if (!packets.get(def.packet_id)!.presented) {
          return fail('a decision presented before its packet');
        }

        if (record.presented) {
          return fail('a decision was presented twice');
        }

        if (def.id !== m14Decisions()[realisedDecisions.length]?.id) {
          return fail('a decision was presented out of the assigned order');
        }

        const previous = realisedDecisions[realisedDecisions.length - 1];

        if (previous !== undefined && !decisions.get(previous)!.answered) {
          return fail(
            'a decision was presented before the previous first response',
          );
        }

        record.presented = true;
        realisedDecisions.push(def.id);
        break;
      }
      case 'source_opened':
      case 'source_closed': {
        // Unscored exposure records: a defect flags the components only.
        const sourceId = meta<unknown>(event, 'source_id');

        if (
          !isM14PacketId(packetId) ||
          typeof sourceId !== 'string' ||
          !packets.get(packetId)!.sources_available.includes(sourceId)
        ) {
          exposureConsistent = false;
          break;
        }

        const packet = packets.get(packetId)!;

        if (suffix === 'source_opened') {
          packet.open_counts[sourceId] =
            (packet.open_counts[sourceId] ?? 0) + 1;

          if (!packet.sources_opened.includes(sourceId)) {
            packet.sources_opened.push(sourceId);
          }
        } else if ((packet.open_counts[sourceId] ?? 0) === 0) {
          exposureConsistent = false;
        }

        break;
      }
      case 'option_drafted': {
        const found = decisionOf(event);

        if (found === null || !found.record.presented) {
          exposureConsistent = false;
        }

        break;
      }
      case 'first_response': {
        const found = decisionOf(event);

        if (found === null) {
          return fail(
            'a first response names an unknown decision or a decision of another packet',
          );
        }

        const { def, record } = found;

        if (!record.presented) {
          return fail('a first response without its decision presentation');
        }

        if (record.answered) {
          return fail('two first responses for one decision');
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
              'an option response without an option of its own decision',
            );
          }

          recount = optionId === def.key_option_id;
        }

        if (recount !== correct) {
          return fail('a first response whose outcome contradicts the key');
        }

        const openedBefore = stringList(
          meta<unknown>(event, 'sources_opened_before'),
        );

        if (openedBefore === null) {
          exposureConsistent = false;
        } else {
          const own = packets.get(def.packet_id)!.sources_opened;

          if (
            openedBefore.length !== own.length ||
            openedBefore.some((id) => !own.includes(id))
          ) {
            exposureConsistent = false;
          }
        }

        const sets = def.establishing_sets.map((set) => {
          const sources = [...set];
          const count =
            openedBefore === null
              ? 0
              : sources.filter((id) => openedBefore.includes(id)).length;

          return {
            sources,
            size: sources.length,
            opened_before: count,
            all_opened_before: count === sources.length,
          };
        });
        const drafts = meta<unknown>(event, 'drafts_before');
        const helpBefore = meta<unknown>(event, 'help_consults_before');
        const activeMs = meta<unknown>(event, 'active_ms');
        const focusedMs = meta<unknown>(event, 'focused_ms');
        const inputMode = meta<unknown>(event, 'input_mode');

        record.answered = true;
        record.response_kind = kind;
        record.option_id = kind === 'option' ? (optionId as string) : null;
        record.correct = recount;
        record.sources_opened_before = openedBefore ?? [];
        record.establishing_sets = sets;
        record.any_establishing_set_fully_opened_before = sets.some(
          (set) => set.all_opened_before,
        );
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

        if (answered().length < M14_DECISIONS_PLANNED) {
          return fail(
            'the completion snapshot precedes the sixth first response',
          );
        }

        if (!snapshotAgrees(event)) {
          return fail('the completion snapshot disagrees with the recount');
        }

        completed = true;
        break;
      case 'results_shown':
        // Correctness feedback before the scored phase was complete voids
        // the scored evidence — also in a series that never reaches six.
        if (!completed) {
          return fail('results shown before the sixth first response');
        }

        if (isM14PacketId(packetId)) {
          packets.get(packetId)!.results_shown = true;
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
        } else if (phase === 'measurement') {
          help.measurement += 1;

          if (decisionOf(event) === null) {
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
        // The kit's record: for a never-opened desk it is the review
        // closure's absence record, not desk evidence.
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

  if (answered().length === M14_DECISIONS_PLANNED && !completed) {
    return fail('six first responses without the completion snapshot');
  }

  if (!opened) {
    // No desk evidence of its own in this load: a first load, or a
    // reloaded load whose check established the absence of an earlier
    // opening (a reloaded load without that returned above).
    return neverOpened();
  }

  // A check that found an earlier opening beside an opening of this load
  // contradicts the hold-back the guard would have applied: flagged.
  if (checkFlag('prior_opening_found') === true) {
    exposureConsistent = false;
  }

  const included = answered().map((entry) => entry.decision_id);
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
    // Complete and stable from the sixth first response onward.
    return [
      fractionFeature(
        'M14',
        primary,
        numerator,
        denominator,
        included,
        supporting,
        { disposition: 'no_eligible_event', reason: 'no decision answered' },
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

  const reason =
    realisedDecisions.length === 0
      ? 'orientation_only'
      : 'opened_no_first_response';
  const detail = `series closed at the review after ${denominator} of ${M14_DECISIONS_PLANNED} first responses`;

  return [
    fractionFeature(
      'M14',
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
