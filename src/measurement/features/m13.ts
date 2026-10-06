/**
 * M13 feature extractor (Unit 16): `m13_first_solutions` = networks whose
 * FIRST response is a layout the shared validator accepts, over the
 * networks with a first response (planned denominator 3), recounted from
 * the `proto_m13_networks_first_response` events alone — each recorded
 * layout board is re-validated against the configuration of that event's
 * network and form and compared with the event's own `correct` flag and
 * with the closure snapshot. CANNOT SOLVE and an unsealed layout are in the
 * denominator and not in the numerator; a network without a first response
 * is missing, never incorrect.
 *
 * The scored phase and the practice are separate (research-owner ruling
 * D-U16-1): three verified first responses and their
 * `first_responses_completed` snapshot make the row `observed` with
 * `closure_reason: completed`, and nothing afterwards — results, practice
 * in any state, FINISH, the review, a bench fault during practice — changes
 * it. Results or practice BEFORE the third first response void the scored
 * evidence. Contradictory, malformed or unverifiable scored evidence is a
 * `technical_failure`, never a value; legitimate missingness never is.
 * Event order is read only from usable, unique sequence numbers (register
 * §5.259 convention). Read-only over the raw events; current page load
 * only; no total that mixes first responses with practice.
 */
import {
  isM13NetworkId,
  M13N_ASSIGNED_ORDER,
  M13N_ENTRY_STATE_VERSION,
  M13N_FAMILY_PREFIX,
  M13N_NETWORKS_PLANNED,
  M13N_OPPORTUNITY_ID,
  m13Network,
  type M13NetworkId,
} from '../../informationProcessing/m13NetworkForms';
import type { RawGameEvent } from '../../systems/EventLogger';
import {
  M13_PIECES,
  M13_SLOT_IDS,
  type M13Placement,
  type M13SlotId,
  validatePipePlacements,
} from '../m13PipePuzzle';
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

const FAMILY = M13N_FAMILY_PREFIX;
const PRACTICE_RUNS_MAX = 3;

type Form = 'A' | 'B';

interface FirstResponseRecord {
  response_kind: 'layout' | 'cannot_solve';
  /** The recount: a layout the validator accepts for this network and form. */
  sealed: boolean;
  /** Structural facts of a recorded layout (null for CANNOT SOLVE). */
  endpoint_connected: boolean | null;
  valve_inline: boolean | null;
  open_branch_count: number | null;
  constraints_satisfied: number | null;
  constraints_total: number;
  pieces_seated: number;
  help_consults_before: number | null;
  active_ms: number | null;
  input_mode: string | null;
}

interface NetworkRecord {
  network_id: M13NetworkId;
  network_index: number;
  trial_id: string;
  content_version: string;
  presented: boolean;
  first_response: FirstResponseRecord | null;
  practice: { opened: boolean; runs_used: number; sealed_in_practice: boolean };
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

/** A recorded board that the bench could have held, or null. */
function readBoard(
  raw: unknown,
  blocked: readonly M13SlotId[],
): Partial<Record<M13SlotId, M13Placement>> | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }

  const board: Partial<Record<M13SlotId, M13Placement>> = {};
  const used = new Set<string>();

  for (const [slot, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      !(M13_SLOT_IDS as readonly string[]).includes(slot) ||
      blocked.includes(slot as M13SlotId) ||
      typeof value !== 'object' ||
      value === null
    ) {
      return null;
    }

    const placement = value as Record<string, unknown>;
    const pieceId = placement.piece_id;
    const rotation = placement.rotation;

    if (
      typeof pieceId !== 'string' ||
      !M13_PIECES.some((piece) => piece.piece_id === pieceId) ||
      used.has(pieceId) ||
      (rotation !== 0 &&
        rotation !== 90 &&
        rotation !== 180 &&
        rotation !== 270)
    ) {
      return null;
    }

    used.add(pieceId);
    board[slot as M13SlotId] = { piece_id: pieceId, rotation };
  }

  return board;
}

interface SnapshotEntry {
  network_id?: unknown;
  answered?: unknown;
  response_kind?: unknown;
  correct?: unknown;
}

registerFeatureExtractor('M13', (events, context) => {
  const [primary] = registerEntry('M13').features;
  const family = events.filter(
    (event) =>
      (event.page_load_index === undefined ||
        event.page_load_index === context.pageLoadIndex) &&
      event.event_type.startsWith(FAMILY),
  );

  if (family.length === 0) {
    return [
      absentFeature('M13', primary, context, 'lattice bench never opened'),
    ];
  }

  const supporting = sequencesOf(family);
  const suffixOf = (event: RawGameEvent) =>
    event.event_type.slice(FAMILY.length);
  const empty = (
    disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>,
    reason: string,
    extra: Partial<FeatureRecord> = {},
  ) => [
    emptyFeature('M13', primary, disposition, reason, {
      supporting_sequences: supporting,
      ...extra,
    }),
  ];

  // Held back after a reload (the existing convention, register §5.14):
  // the bench was administered in an earlier page load and is not re-run.
  // Takes precedence over every other disposition of the new load.
  // The hold-back record carries both marks: a detail beginning `reload`
  // and `prior_exposure: true`. Another fault is never read as a hold-back.
  const heldBack = family.some(
    (event) =>
      suffixOf(event) === 'technical_failure' &&
      meta<unknown>(event, 'prior_exposure') === true &&
      String(meta<unknown>(event, 'detail') ?? '').startsWith('reload'),
  );

  if (heldBack) {
    return empty(
      'interrupted',
      'bench opened in an earlier page load; not re-run after the reload',
      {
        components: {
          administration_version: M13N_ENTRY_STATE_VERSION,
          held_back_after_reload: true,
        },
      },
    );
  }

  // Everything below compares positions.
  const defect = orderDefect(family);

  if (defect !== null) {
    return empty('technical_failure', defect);
  }

  const ordered = family
    .slice()
    .sort((a, b) => (a.sequence as number) - (b.sequence as number));

  let form: Form | null = null;
  const records = new Map<M13NetworkId, NetworkRecord>();
  const realised: M13NetworkId[] = [];
  const help = { measurement: 0, feedback: 0, practice: 0 };
  let opened = false;
  let completed = false;
  let phaseOneClosure: 'voluntary_stop' | 'closed_at_review' | null = null;
  let phaseOneFailure: string | null = null;
  let practiceClosure: string | null = null;
  let practiceConsistent = true;
  let resultsShown = 0;

  const record = (id: M13NetworkId): NetworkRecord => {
    const existing = records.get(id);

    if (existing !== undefined) {
      return existing;
    }

    const def = m13Network(id, form ?? 'A');
    const created: NetworkRecord = {
      network_id: id,
      network_index: def.network_index,
      trial_id: def.trial_id,
      content_version: def.content_version,
      presented: false,
      first_response: null,
      practice: { opened: false, runs_used: 0, sealed_in_practice: false },
    };

    records.set(id, created);

    return created;
  };
  const answered = () =>
    M13N_ASSIGNED_ORDER.filter((id) => records.get(id)?.first_response != null);
  const firstSolutions = () =>
    answered().filter((id) => records.get(id)!.first_response!.sealed).length;
  const components = (integrityDefect: string | null = null) => ({
    administration_version: M13N_ENTRY_STATE_VERSION,
    form_id: form,
    assigned_order: [...M13N_ASSIGNED_ORDER],
    realised_order: [...realised],
    observations_share_one_episode: true,
    first_response_phase_complete: completed,
    networks_answered: answered().length,
    first_response_phase_closure: completed
      ? 'completed'
      : (phaseOneClosure ??
        (phaseOneFailure === null ? null : 'technical_failure')),
    networks: M13N_ASSIGNED_ORDER.map((id) => record(id)),
    help_consults: { ...help },
    results_views: resultsShown,
    practice_closure: practiceClosure,
    practice_record_consistent: practiceConsistent,
    ...(integrityDefect === null ? {} : { integrity_defect: integrityDefect }),
  });
  const fail = (reason: string) =>
    empty('technical_failure', reason, { components: components(reason) });
  /** A closure snapshot must agree with the recount of the first responses. */
  const snapshotAgrees = (event: RawGameEvent): boolean => {
    const entries = meta<SnapshotEntry[]>(event, 'first_responses');

    if (
      !Array.isArray(entries) ||
      meta<unknown>(event, 'networks_answered') !== answered().length ||
      meta<unknown>(event, 'first_solutions') !== firstSolutions()
    ) {
      return false;
    }

    return M13N_ASSIGNED_ORDER.every((id) => {
      const entry = entries.find((candidate) => candidate.network_id === id);
      const response = records.get(id)?.first_response ?? null;

      if (entry === undefined) {
        return false;
      }

      return response === null
        ? entry.answered === false
        : entry.answered === true &&
            entry.response_kind === response.response_kind &&
            entry.correct === response.sealed;
    });
  };

  for (const [position, event] of ordered.entries()) {
    const suffix = suffixOf(event);

    if (
      meta<unknown>(event, 'entry_state_version') !== M13N_ENTRY_STATE_VERSION
    ) {
      return fail('an event of the family carries an unknown version');
    }

    if (meta<unknown>(event, 'opportunity_id') !== M13N_OPPORTUNITY_ID) {
      return fail('an event of the family carries another opportunity id');
    }

    const eventForm = meta<unknown>(event, 'form_id');

    if (eventForm !== 'A' && eventForm !== 'B') {
      return fail('an event of the family carries no known form');
    }

    if (form === null) {
      form = eventForm;
    } else if (form !== eventForm) {
      return fail('the form changes inside the series');
    }

    if (suffix === 'series_opened') {
      if (opened || position !== 0) {
        return fail('the series was opened twice or after other series events');
      }

      opened = true;
      continue;
    }

    if (!opened) {
      if (suffix === 'technical_failure') {
        phaseOneFailure = String(
          meta<unknown>(event, 'detail') ?? 'technical failure',
        );
        continue;
      }

      return fail('series events without the series opening');
    }

    const rawId = meta<unknown>(event, 'network_id');
    const scored =
      suffix === 'network_presented' || suffix === 'first_response';

    if (scored) {
      if (!isM13NetworkId(rawId)) {
        return fail('a scored event names an unknown network');
      }

      if (
        meta<unknown>(event, 'content_version') !==
        m13Network(rawId, form).content_version
      ) {
        return fail('a content version does not match its network');
      }

      const named = m13Network(rawId, form);

      if (
        meta<unknown>(event, 'network_index') !== named.network_index ||
        meta<unknown>(event, 'trial_id') !== named.trial_id
      ) {
        return fail('a network index or trial id does not match its network');
      }

      if (completed) {
        return fail(
          suffix === 'first_response'
            ? 'a first response after the scored phase was complete'
            : 'a network presented after the scored phase was complete',
        );
      }

      if (phaseOneClosure !== null || phaseOneFailure !== null) {
        return fail('a scored event after the series closed');
      }
    }

    switch (suffix) {
      case 'network_presented': {
        const id = rawId as M13NetworkId;

        if (records.get(id)?.presented === true) {
          return fail('a network was presented twice');
        }

        if (id !== M13N_ASSIGNED_ORDER[realised.length]) {
          return fail('a network was presented out of the assigned order');
        }

        const previous = realised[realised.length - 1];

        if (
          previous !== undefined &&
          records.get(previous)?.first_response == null
        ) {
          return fail(
            'a network was presented before the previous first response',
          );
        }

        record(id).presented = true;
        realised.push(id);
        break;
      }
      case 'first_response': {
        const id = rawId as M13NetworkId;
        const entry = record(id);

        if (!entry.presented) {
          return fail('a first response without its network presentation');
        }

        if (entry.first_response !== null) {
          return fail('two first responses for one network');
        }

        if (meta<unknown>(event, 'phase') !== 'measurement') {
          return fail('a first response outside the first-response phase');
        }

        const kind = meta<unknown>(event, 'response_kind');
        const correct = meta<unknown>(event, 'correct');

        if (kind !== 'layout' && kind !== 'cannot_solve') {
          return fail('a first response of an unknown kind');
        }

        if (typeof correct !== 'boolean') {
          return fail('a first response without a boolean outcome');
        }

        const def = m13Network(id, form);
        const board = readBoard(meta<unknown>(event, 'board'), def.blocked);
        let response: FirstResponseRecord;

        if (kind === 'cannot_solve') {
          if (correct) {
            return fail('a CANNOT SOLVE response is marked correct');
          }

          response = {
            response_kind: kind,
            sealed: false,
            endpoint_connected: null,
            valve_inline: null,
            open_branch_count: null,
            constraints_satisfied: null,
            constraints_total: 3,
            pieces_seated: board === null ? 0 : Object.keys(board).length,
            help_consults_before: null,
            active_ms: null,
            input_mode: null,
          };
        } else {
          if (board === null) {
            return fail('a layout response without a usable board');
          }

          const detail = validatePipePlacements(board, def.config);

          if (detail.valid !== correct) {
            return fail(
              'a layout response whose outcome contradicts its recorded board',
            );
          }

          response = {
            response_kind: kind,
            sealed: detail.valid,
            endpoint_connected: detail.endpoint_connected,
            valve_inline: detail.valve_inline,
            open_branch_count: detail.open_branch_count,
            constraints_satisfied:
              Number(detail.endpoint_connected) +
              Number(detail.valve_inline) +
              Number(detail.open_branch_count === 0 && detail.source_seated),
            constraints_total: 3,
            pieces_seated: Object.keys(board).length,
            help_consults_before: null,
            active_ms: null,
            input_mode: null,
          };
        }

        const helpBefore = meta<unknown>(event, 'help_consults_before');
        const activeMs = meta<unknown>(event, 'active_ms');
        const inputMode = meta<unknown>(event, 'input_mode');

        entry.first_response = {
          ...response,
          help_consults_before:
            typeof helpBefore === 'number' ? helpBefore : null,
          active_ms: typeof activeMs === 'number' ? activeMs : null,
          input_mode: typeof inputMode === 'string' ? inputMode : null,
        };
        break;
      }
      case 'first_responses_completed':
        if (completed) {
          return fail('the scored phase was completed twice');
        }

        if (phaseOneClosure !== null || phaseOneFailure !== null) {
          return fail('the scored phase completed after the series closed');
        }

        if (answered().length < M13N_NETWORKS_PLANNED) {
          return fail(
            'the completion snapshot precedes the third first response',
          );
        }

        if (!snapshotAgrees(event)) {
          return fail('the completion snapshot disagrees with the recount');
        }

        completed = true;
        break;
      case 'results_shown':
      case 'practice_opened':
      case 'practice_test_run':
      case 'practice_closed': {
        // Correctness feedback or practice before the scored phase was
        // complete voids the scored evidence.
        if (!completed) {
          return fail(
            'results or practice recorded before the third first response',
          );
        }

        if (practiceClosure !== null) {
          practiceConsistent = false;
        }

        if (suffix === 'results_shown') {
          resultsShown += 1;
          break;
        }

        if (suffix === 'practice_closed') {
          practiceClosure = String(meta<unknown>(event, 'reason') ?? 'unknown');
          break;
        }

        // A defect confined to the practice records never changes the row.
        if (!isM13NetworkId(rawId)) {
          practiceConsistent = false;
          break;
        }

        const practice = record(rawId).practice;

        if (suffix === 'practice_opened') {
          practice.opened = true;
          break;
        }

        if (
          !practice.opened ||
          practice.runs_used >= PRACTICE_RUNS_MAX ||
          meta<unknown>(event, 'run_index') !== practice.runs_used + 1
        ) {
          practiceConsistent = false;
        }

        practice.runs_used += 1;

        if (meta<unknown>(event, 'sealed') === true) {
          practice.sealed_in_practice = true;
        }

        break;
      }
      case 'series_stopped':
      case 'series_closed_at_review':
        if (completed) {
          return fail('the series closed after the scored phase was complete');
        }

        if (phaseOneClosure !== null || phaseOneFailure !== null) {
          return fail('the series closed twice');
        }

        if (!snapshotAgrees(event)) {
          return fail('the closure snapshot disagrees with the recount');
        }

        phaseOneClosure =
          suffix === 'series_stopped' ? 'voluntary_stop' : 'closed_at_review';
        break;
      case 'technical_failure':
        // A fault during practice ends practice only; in the first-response
        // phase it voids the row (the answers stay in the components).
        if (!completed && phaseOneClosure === null) {
          phaseOneFailure ??= String(
            meta<unknown>(event, 'detail') ?? 'technical failure',
          );
        }

        break;
      case 'help_consulted': {
        const phase = meta<unknown>(event, 'phase');

        if (phase === 'measurement') {
          help.measurement += 1;
        } else if (phase === 'practice') {
          help.practice += 1;
        } else {
          help.feedback += 1;
        }

        break;
      }
      default:
        break;
    }
  }

  if (answered().length === M13N_NETWORKS_PLANNED && !completed) {
    return fail('three first responses without the completion snapshot');
  }

  const included = answered().map((id) => records.get(id)!.trial_id);
  const numerator = firstSolutions();
  const denominator = answered().length;

  if (phaseOneFailure !== null) {
    return empty(
      'technical_failure',
      `technical failure in the first-response phase: ${phaseOneFailure}`,
      {
        closure_reason: 'technical_failure',
        included_ids: included,
        components: components(),
      },
    );
  }

  if (completed) {
    // Complete and stable from the third first response onward: results,
    // practice, FINISH, the review and a fault during practice never change it.
    return [
      fractionFeature(
        'M13',
        primary,
        numerator,
        denominator,
        included,
        supporting,
        { disposition: 'no_eligible_event', reason: 'no network answered' },
        {
          closure_reason: 'completed',
          censored: false,
          censor_reason: null,
          components: components(),
        },
      ),
    ] satisfies FeatureRecord[];
  }

  // Closed in the first-response phase by a stop or by the review; a phase
  // with no closure record is still open (`pending`), whatever the export.
  const cut: {
    closure: ClosureReason | null;
    zero: Exclude<FeatureDisposition, 'observed' | 'incomplete'>;
    reason: string;
    censored: boolean;
  } | null =
    phaseOneClosure === 'voluntary_stop'
      ? {
          closure: 'voluntary_stop',
          zero: 'voluntary_stop',
          reason: 'series stopped by the participant',
          censored: denominator > 0,
        }
      : phaseOneClosure === 'closed_at_review'
        ? {
            closure: 'closed_at_review',
            zero: 'no_eligible_event',
            reason: 'series closed at the review',
            censored: true,
          }
        : null;

  if (cut === null) {
    return empty('pending', 'the first-response phase is still open', {
      included_ids: included,
      components: components(),
    });
  }

  const detail = `${cut.reason} after ${denominator} of ${M13N_NETWORKS_PLANNED} first responses`;

  return [
    fractionFeature(
      'M13',
      primary,
      numerator,
      denominator,
      included,
      supporting,
      { disposition: cut.zero, reason: detail },
      {
        closure_reason: cut.closure,
        censored: cut.censored,
        censor_reason: cut.censored ? detail : null,
        components: components(),
      },
    ),
  ] satisfies FeatureRecord[];
});
