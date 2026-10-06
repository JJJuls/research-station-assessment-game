/**
 * Station 080 M09 — the monitor watch: three due checks of one accepted
 * duty (Unit 15), pure tests.
 *
 * Playwright test blocks that never touch `page`: the offer, its explicit
 * answer and settle window; the three check windows (open at their
 * milestone once, close at the visit's first exit — the third included,
 * owner decision D-U15-1); the read-only extractor on 0–3 fulfilled
 * checks, on checks not reached, on an inaccessible check and on every
 * disposition; late and repeat readings; the CONDITIONAL invariants
 * (legitimate missingness is never a technical failure; contradictory
 * evidence is); immutability and determinism; the participant-facing copy;
 * and the input classifier.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { registerEntry } from '../src/measurement/registerV3';
import {
  classifyObservedInput,
  INPUT_OBSERVATION_MAX_AGE_MS,
  type ObservedInput,
} from '../src/pilot/inputObservation';
import { PILOT_STAGES } from '../src/pilot/pilotRoute';
import {
  createM09State,
  M09_CHECKS_PLANNED,
  M09_ENTRY_STATE_VERSION,
  M09_FAMILY,
  M09_LAB_PASS_STAGES,
  M09_LOG_LINES,
  M09_OFFER_BODY,
  M09_OFFER_LABELS,
  M09_OPPORTUNITY_ID,
  M09_READINGS,
  M09_REASK_LABEL,
  M09_RETURN_STAGES,
  M09_SETTLE_MS,
  M09_WINDOW_IDS,
  type M09Access,
  m09Answer,
  m09CloseAtReview,
  m09ConcourseEntered,
  m09ConcourseExited,
  m09Defer,
  m09GaugeFeedback,
  m09LogLine,
  type M09LogSink,
  m09NoteLogViewed,
  m09OpenAcceptanceCheck,
  m09OpenCheck,
  m09Present,
  m09PriorAdministration,
  m09RawComponents,
  m09ReadGauge,
  m09Reading,
  type M09State,
} from '../src/pilot/windows/m09WatchModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

const KEY: ObservedInput = {
  input_mode: 'keyboard',
  input_mode_basis: 'window_keydown',
};
const POINTER: ObservedInput = {
  input_mode: 'pointer',
  input_mode_basis: 'window_pointerdown',
};
const ACCESS: M09Access = {
  available: true,
  basis: 'gauge_station_in_scene',
  registry_id: 'concourse.monitor_gauge',
};
const NO_ACCESS: M09Access = { ...ACCESS, available: false, basis: 'test' };
const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const FORBIDDEN =
  /proto_|\bM\d{2}\b|\bQ\d{2}\b|score|trait|persist|valid|grit|resilien|dependable|reliable/i;

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const sink: M09LogSink = (suffix, metadata) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: 'station_concourse',
      event_type: `${M09_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: M09_OPPORTUNITY_ID,
        entry_state_version: M09_ENTRY_STATE_VERSION,
        ...metadata,
      },
    });
  };

  return {
    events,
    sink,
    opened: () => sink('opportunity_opened', { input_mode: 'system' }),
    close: (s: M09State, reason = 'completed') =>
      sink('window_closed', {
        exit_state:
          reason === 'closed_at_review' ? 'closed_at_review' : 'completed',
        raw_components: m09RawComponents(s, reason),
      }),
    closeUnanswered: (s: M09State) =>
      sink('window_closed', {
        exit_state: 'closed_at_review',
        raw_components_partial: {
          ...m09RawComponents(s, 'closed_at_review'),
          offer_unanswered: true,
        },
      }),
  };
}

type Harness = ReturnType<typeof harness>;

/** Offer shown at 1 000, accepted at 1 400 (past the settle window). */
function accept(h: Harness): M09State {
  const s = createM09State();

  m09Present(s, 1_000, h.sink);
  expect(m09Answer(s, 'accept', 1, 3, 1_400, KEY, h.sink)).toBe('accepted');
  h.opened();
  expect(
    m09OpenAcceptanceCheck(s, 'incident_handover', ACCESS, 1_400, h.sink),
  ).toBe(true);

  return s;
}

/**
 * The ordinary route: check 1 at acceptance, check 2 on the pass to the
 * laboratory, check 3 on the return — each read or left unread as asked.
 * `reach` = how many checks the route reached before the shift review.
 */
function route(
  reads: readonly [boolean, boolean, boolean],
  reach: 1 | 2 | 3 = 3,
  access: readonly [M09Access, M09Access, M09Access] = [ACCESS, ACCESS, ACCESS],
) {
  const h = harness();
  const s = createM09State();

  m09Present(s, 1_000, h.sink);
  m09Answer(s, 'accept', 1, 3, 1_400, KEY, h.sink);
  h.opened();
  m09OpenAcceptanceCheck(s, 'incident_handover', access[0], 1_400, h.sink);

  if (reads[0]) {
    m09ReadGauge(s, 'incident_handover', 2_000, KEY, h.sink);
  }

  m09ConcourseExited(s, 'records_workshop', 3_000, h.sink);

  if (reach >= 2) {
    m09ConcourseEntered(s, 'lab_briefing', access[1], 4_000, h.sink);

    if (reads[1]) {
      m09ReadGauge(s, 'lab_briefing', 4_500, POINTER, h.sink);
    }

    m09ConcourseExited(s, 'diagnostics_laboratory', 5_000, h.sink);
  }

  if (reach >= 3) {
    m09ConcourseEntered(s, 'return_hub', access[2], 6_000, h.sink);

    if (reads[2]) {
      m09ReadGauge(s, 'return_hub', 6_500, KEY, h.sink);
    }

    m09ConcourseExited(s, 'records_workshop', 7_000, h.sink);
    h.close(s, 'completed');
  } else {
    m09CloseAtReview(s, 9_000, h.sink);
    h.close(s, 'closed_at_review');
  }

  return { h, s };
}

function feature(events: readonly RawGameEvent[], context = CONTEXT) {
  return extractItemFeatures('M09', events, context)[0];
}

/** A copy of the log with one edit, renumbered like a real log. */
function rewrite(
  events: readonly RawGameEvent[],
  edit: (copy: RawGameEvent[]) => RawGameEvent[],
): RawGameEvent[] {
  const copy = JSON.parse(JSON.stringify(events)) as RawGameEvent[];

  return edit(copy).map((event, index) => ({ ...event, sequence: index + 1 }));
}

const typeOf = (suffix: string) => `${M09_FAMILY}${suffix}`;
const source = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8');

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }

    Object.freeze(value);
  }

  return value;
}

test.describe('M09 monitor watch (pure)', () => {
  test('register row: v3 route, one duty with three check windows, planned-observation denominator, unchanged feature', () => {
    const entry = registerEntry('M09');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([M09_OPPORTUNITY_ID]);
    expect(entry.route.windows.map((w) => w.id)).toEqual([
      M09_WINDOW_IDS[1],
      M09_WINDOW_IDS[2],
      M09_WINDOW_IDS[3],
    ]);
    expect(
      entry.route.windows.every((w) => w.zone === 'station_concourse'),
    ).toBe(true);
    expect(entry.route.family_prefixes).toEqual([M09_FAMILY]);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.disposition_override).toBeNull();
    expect(entry.coverage_label).toBe('behavioural_counterpart');
    expect(entry.independence.kind).toBe('repeated_within_one_project');
    expect(entry.features.map((f) => f.feature_id)).toEqual([
      'm09_due_checks_fulfilled',
    ]);
    expect(entry.features[0]).toMatchObject({
      planned_denominator: M09_CHECKS_PLANNED,
      denominator_kind: 'planned_observations',
      range: '0–3',
    });
    expect(entry.operational_label).toBe('Monitor watch (Concourse)');

    // The two milestone stage sets partition the route from the pass to
    // the laboratory onwards; nothing earlier opens a check.
    const laterStages = PILOT_STAGES.slice(
      PILOT_STAGES.indexOf('lab_briefing'),
    );

    expect([...M09_LAB_PASS_STAGES, ...M09_RETURN_STAGES]).toEqual([
      ...laterStages,
    ]);
  });

  test('offer, explicit answer and the 300 ms settle window: one presentation, one terminal answer, refused presses logged, a deferral is no answer', () => {
    const h = harness();
    const s = createM09State();

    expect(M09_SETTLE_MS).toBe(300);
    // Nothing before the offer.
    expect(m09Answer(s, 'accept', 1, 3, 10, KEY, h.sink)).toBe('invalid');
    expect(m09Defer(s, 3, 3, 10, h.sink)).toBe('invalid');
    expect(m09Present(s, 1_000, h.sink)).toBe(true);

    // A press inside the settle window is refused on every option.
    expect(m09Answer(s, 'accept', 1, 3, 1_100, KEY, h.sink)).toBe('refused');
    expect(m09Answer(s, 'decline', 2, 3, 1_299, KEY, h.sink)).toBe('refused');
    expect(m09Defer(s, 3, 3, 1_200, h.sink)).toBe('refused');
    expect(s.answer).toBeNull();
    expect(s.refused_presses).toBe(3);

    // The stage re-presented after a refusal moves the settle reference
    // and is NOT a second presentation.
    expect(m09Present(s, 1_300, h.sink)).toBe(false);
    expect(m09Answer(s, 'accept', 1, 3, 1_500, KEY, h.sink)).toBe('refused');
    expect(m09Defer(s, 3, 3, 1_700, h.sink)).toBe('deferred');
    expect(s.answer).toBeNull();

    // Asked again later: still one presentation; the read answer records.
    expect(m09Present(s, 50_000, h.sink)).toBe(false);
    expect(m09Answer(s, 'accept', 1, 3, 50_300, POINTER, h.sink)).toBe(
      'accepted',
    );
    expect(m09Answer(s, 'decline', 2, 3, 51_000, KEY, h.sink)).toBe('invalid');
    expect(m09Present(s, 52_000, h.sink)).toBe(false);

    const types = h.events.map((event) => event.event_type);

    expect(types.filter((t) => t === typeOf('presented'))).toHaveLength(1);
    expect(types.filter((t) => t === typeOf('offer_answered'))).toHaveLength(1);
    expect(
      types.filter((t) => t === typeOf('offer_press_refused')),
    ).toHaveLength(4);
    expect(
      h.events.find((e) => e.event_type === typeOf('presented'))?.metadata,
    ).toMatchObject({
      checks_planned: 3,
      milestones: ['acceptance', 'lab_pass', 'return_pass'],
      settle_ms: 300,
      option_count: 3,
    });
    expect(
      h.events.find((e) => e.event_type === typeOf('offer_answered'))?.metadata,
    ).toMatchObject({
      answer: 'accept',
      option_position: 1,
      option_count: 3,
      input_mode: 'pointer',
      input_mode_basis: 'window_pointerdown',
    });
    expect(
      h.events.find((e) => e.event_type === typeOf('offer_press_refused'))
        ?.metadata,
    ).toMatchObject({ option_position: 1, latency_ms: 100, settle_ms: 300 });
  });

  test('check windows: each opens once at its milestone and closes at that visit’s first exit — the third included (D-U15-1)', () => {
    const h = harness();
    const s = accept(h);

    // Check 1 is due from acceptance; the due line is in the log.
    expect(m09OpenCheck(s)?.check_index).toBe(1);
    expect(m09LogLine(s, 'incident_handover')?.line_id).toBe('m09_log_due');
    // An early exit closes it unread (a miss — with the door taken).
    expect(m09ConcourseExited(s, 'dock', 2_000, h.sink)).toEqual({
      closed: 1,
      duty_finished: false,
    });
    expect(s.checks[1]).toMatchObject({
      outcome: 'missed',
      reason: 'left_concourse',
      exit_to: 'dock',
    });

    // A detour back in before the laboratory pass opens nothing (wrong
    // stage), and its exit closes nothing.
    for (const stage of ['incident_handover', 'workshop', 'workshop_work']) {
      expect(m09ConcourseEntered(s, stage, ACCESS, 2_500, h.sink)).toBeNull();
      expect(m09OpenCheck(s)).toBeNull();
      expect(m09ConcourseExited(s, 'records_workshop', 2_600, h.sink)).toEqual({
        closed: null,
        duty_finished: false,
      });
    }

    expect(m09LogLine(s, 'workshop_work')?.line_id).toBe(
      'm09_log_next_lab_pass',
    );

    // The pass toward the laboratory opens check 2 — once.
    expect(m09ConcourseEntered(s, 'lab_briefing', ACCESS, 3_000, h.sink)).toBe(
      2,
    );
    expect(m09LogLine(s, 'lab_briefing')?.line_id).toBe('m09_log_due');
    expect(m09ReadGauge(s, 'lab_briefing', 3_400, KEY, h.sink)).toMatchObject({
      credited: true,
      check_index: 2,
      duty_finished: false,
    });
    expect(s.checks[2]).toMatchObject({
      outcome: 'fulfilled',
      reason: 'read',
      due_delta_ms: 400,
      reading_id: 'm09_reading_lab_pass',
    });
    m09ConcourseExited(s, 'diagnostics_laboratory', 3_500, h.sink);

    // Coming back through during the laboratory / yard stages never
    // re-opens it (single opening) and never opens check 3 early.
    for (const stage of ['lab_work', 'exterior_briefing', 'exterior_work']) {
      expect(m09ConcourseEntered(s, stage, ACCESS, 4_000, h.sink)).toBeNull();
      m09ConcourseExited(s, 'diagnostics_laboratory', 4_100, h.sink);
    }

    expect(m09LogLine(s, 'exterior_work')?.line_id).toBe(
      'm09_log_next_return_pass',
    );

    // The return from the yard opens check 3; its FIRST exit — through
    // any door — closes it and ends the duty (owner decision D-U15-1).
    expect(m09ConcourseEntered(s, 'return_hub', ACCESS, 5_000, h.sink)).toBe(3);
    expect(m09LogLine(s, 'return_hub')?.line_id).toBe('m09_log_due');
    expect(m09ConcourseExited(s, 'utility_core_deck', 5_500, h.sink)).toEqual({
      closed: 3,
      duty_finished: true,
    });
    expect(s.checks[3]).toMatchObject({
      outcome: 'missed',
      reason: 'left_concourse',
      exit_to: 'utility_core_deck',
    });
    expect(s.duty_closure).toBe('checks_complete');
    expect(m09LogLine(s, 'workshop_return')).toBeNull();
    h.close(s);

    // Nothing opens afterwards, and a later reading never changes the
    // third check's first outcome.
    expect(
      m09ConcourseEntered(s, 'deck_closure', ACCESS, 6_000, h.sink),
    ).toBeNull();
    expect(m09ReadGauge(s, 'deck_closure', 6_100, KEY, h.sink)).toEqual({
      credited: false,
      check_index: null,
      duty_finished: false,
    });
    expect(s.checks[3].outcome).toBe('missed');
    expect(m09CloseAtReview(s, 7_000, h.sink)).toBe(false);

    const opened = h.events.filter(
      (e) => e.event_type === typeOf('check_window_opened'),
    );

    expect(opened.map((e) => e.metadata?.check_index)).toEqual([1, 2, 3]);
    expect(opened.map((e) => e.metadata?.milestone)).toEqual([
      'acceptance',
      'lab_pass',
      'return_pass',
    ]);
    expect(opened[0]?.metadata?.access).toEqual(ACCESS);
    expect(
      h.events.filter(
        (e) => e.event_type === typeOf('gauge_read_uncredited'),
      )[0]?.metadata,
    ).toMatchObject({
      reason: 'duty_closed',
      last_closed_check_index: 3,
      last_closed_outcome: 'missed',
    });
    expect(feature(h.events)).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 3,
      disposition: 'observed',
    });
  });

  test('0, 1, 2 and 3 fulfilled checks reproduce from the raw events; a zero is an observed zero', () => {
    const patterns: [boolean, boolean, boolean][] = [
      [false, false, false],
      [true, false, false],
      [false, true, true],
      [true, true, true],
    ];

    for (const reads of patterns) {
      const { h, s } = route(reads);
      const row = feature(h.events);
      const expected = reads.filter(Boolean).length;

      expect(row, reads.join(',')).toMatchObject({
        feature_id: 'm09_due_checks_fulfilled',
        value: expected,
        numerator: expected,
        denominator: 3,
        planned_denominator: 3,
        disposition: 'observed',
        closure_reason: 'completed',
        censored: false,
        included_ids: [
          'm09_duty_check_1',
          'm09_duty_check_2',
          'm09_duty_check_3',
        ],
        independence: 'repeated_within_one_project',
      });
      expect(row.components).toMatchObject({
        administration_version: M09_ENTRY_STATE_VERSION,
        observations_share_one_duty: true,
        checks_planned: 3,
        checks_opened: 3,
        checks_eligible: 3,
        acceptance: { answer: 'accept', input_mode: 'keyboard' },
      });
      expect(m09RawComponents(s, 'completed').checks_fulfilled).toBe(expected);
    }

    // The input mode of each reading is kept per check (pointer on the
    // laboratory pass in this route).
    const all = feature(route([true, true, true]).h.events).components as {
      input_modes: { checks: (string | null)[] };
    };

    expect(all.input_modes.checks).toEqual(['keyboard', 'pointer', 'keyboard']);
  });

  test('checks not reached export an incomplete value; an inaccessible check and a censored check are excluded, never missed', () => {
    // Review after the first check only: 1 / 1, incomplete (three planned).
    const one = feature(route([true, false, false], 1).h.events);

    expect(one).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'incomplete',
      closure_reason: 'closed_at_review',
      included_ids: ['m09_duty_check_1'],
    });

    // Two reached, the second left unread: 1 / 2, incomplete.
    expect(feature(route([true, false, false], 2).h.events)).toMatchObject({
      value: 1,
      denominator: 2,
      disposition: 'incomplete',
    });

    // A check opened without access is outside the denominator.
    const blocked = feature(
      route([true, false, true], 3, [ACCESS, NO_ACCESS, ACCESS]).h.events,
    );

    expect(blocked).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 2,
      disposition: 'incomplete',
      included_ids: ['m09_duty_check_1', 'm09_duty_check_3'],
    });
    expect(blocked.components).toMatchObject({ checks_inaccessible: 1 });

    // A check still open at the review is censored (never a miss).
    const h = harness();
    const s = accept(h);

    m09ReadGauge(s, 'incident_handover', 2_000, KEY, h.sink);
    m09ConcourseExited(s, 'records_workshop', 3_000, h.sink);
    m09ConcourseEntered(s, 'lab_work', ACCESS, 4_000, h.sink);
    expect(m09CloseAtReview(s, 5_000, h.sink)).toBe(true);
    h.close(s, 'closed_at_review');
    expect(s.checks[2]).toMatchObject({
      outcome: 'censored',
      reason: 'review',
    });
    expect(feature(h.events)).toMatchObject({
      value: 1,
      denominator: 1,
      disposition: 'incomplete',
      censored: true,
      censor_reason: 'review reached with a check still open',
    });
  });

  test('dispositions: declined, unanswered, never presented, held back after a reload and pending are distinct — none is a zero', () => {
    // Never presented.
    expect(feature([])).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expect(feature([], { ...CONTEXT, reloaded: true }).disposition).toBe(
      'interrupted',
    );

    // A gauge reading before any offer is no presentation.
    const early = harness();
    const idle = createM09State();

    expect(
      m09ReadGauge(idle, 'handover_briefing', 500, KEY, early.sink).credited,
    ).toBe(false);
    expect(early.events[0]?.metadata).toMatchObject({
      reason: 'duty_not_accepted',
      last_closed_check_index: null,
    });
    expect(feature(early.events)).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });

    // Declined: a completed observation outside the denominator.
    const declined = harness();
    const d = createM09State();

    m09Present(d, 1_000, declined.sink);
    expect(m09Answer(d, 'decline', 2, 3, 1_400, KEY, declined.sink)).toBe(
      'declined',
    );
    declined.opened();
    declined.close(d, 'declined');
    expect(
      m09OpenAcceptanceCheck(
        d,
        'incident_handover',
        ACCESS,
        1_500,
        declined.sink,
      ),
    ).toBe(false);
    expect(
      m09ConcourseEntered(d, 'lab_briefing', ACCESS, 2_000, declined.sink),
    ).toBeNull();
    expect(feature(declined.events)).toMatchObject({
      value: null,
      disposition: 'declined',
      closure_reason: 'declined',
    });

    // Held back: the offer lies in an earlier page load.
    const held = harness();

    held.sink('technical_failure', {
      detail: 'reload after the offer: watch not re-run',
      input_mode: 'system',
    });
    expect(feature(held.events, { ...CONTEXT, reloaded: true })).toMatchObject({
      value: null,
      disposition: 'interrupted',
    });
    expect(m09PriorAdministration(route([true, true, true]).h.events)).toBe(
      true,
    );
    expect(m09PriorAdministration(early.events)).toBe(false);
    expect(m09PriorAdministration([])).toBe(false);

    // Pending: accepted, the duty still running.
    const open = harness();
    const o = accept(open);

    expect(feature(open.events)).toMatchObject({
      value: null,
      disposition: 'pending',
    });
    m09ReadGauge(o, 'incident_handover', 2_000, KEY, open.sink);
    m09ConcourseExited(o, 'records_workshop', 3_000, open.sink);
    expect(feature(open.events).disposition).toBe('pending');
  });

  test('late and repeat readings are recorded uncredited and never repair a missed check', () => {
    const h = harness();
    const s = accept(h);

    // Check 1 read; a second reading in the same visit is a repeat.
    m09ReadGauge(s, 'incident_handover', 2_000, KEY, h.sink);
    expect(
      m09ReadGauge(s, 'incident_handover', 2_100, KEY, h.sink).credited,
    ).toBe(false);
    m09ConcourseExited(s, 'records_workshop', 3_000, h.sink);

    // Check 2 left unread; a reading on a later visit is late — the miss
    // stands.
    m09ConcourseEntered(s, 'lab_briefing', ACCESS, 4_000, h.sink);
    m09ConcourseExited(s, 'diagnostics_laboratory', 5_000, h.sink);
    m09ConcourseEntered(s, 'exterior_work', ACCESS, 5_500, h.sink);
    expect(m09ReadGauge(s, 'exterior_work', 5_600, POINTER, h.sink)).toEqual({
      credited: false,
      check_index: null,
      duty_finished: false,
    });
    expect(s.checks[2].outcome).toBe('missed');
    m09ConcourseExited(s, 'diagnostics_laboratory', 5_700, h.sink);

    // Check 3 read: the duty finishes with the reading.
    m09ConcourseEntered(s, 'return_hub', ACCESS, 6_000, h.sink);
    expect(m09ReadGauge(s, 'return_hub', 6_200, KEY, h.sink)).toEqual({
      credited: true,
      check_index: 3,
      duty_finished: true,
    });
    h.close(s);
    expect(m09ReadGauge(s, 'return_hub', 6_300, KEY, h.sink).credited).toBe(
      false,
    );
    m09ConcourseExited(s, 'records_workshop', 6_400, h.sink);

    const uncredited = h.events
      .filter((e) => e.event_type === typeOf('gauge_read_uncredited'))
      .map((e) => [
        e.metadata?.reason,
        e.metadata?.last_closed_check_index,
        e.metadata?.last_closed_outcome,
      ]);

    expect(uncredited).toEqual([
      ['already_fulfilled', 1, 'fulfilled'],
      ['no_check_due', 2, 'missed'],
      ['already_fulfilled', 3, 'fulfilled'],
    ]);
    expect(
      h.events.filter((e) => e.event_type === typeOf('check_fulfilled')),
    ).toHaveLength(2);

    const row = feature(h.events);

    expect(row).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 3,
      disposition: 'observed',
    });
    expect(
      (row.components as { uncredited_reads: unknown[] }).uncredited_reads,
    ).toHaveLength(3);
  });

  test('conditional invariants: legitimate missingness is never a technical failure', () => {
    const cases: Record<string, RawGameEvent[]> = {};

    // (a) Presented and never answered — no terminal answer, no closure.
    const a = harness();
    const unanswered = createM09State();

    m09Present(unanswered, 1_000, a.sink);
    expect(m09Defer(unanswered, 3, 3, 1_400, a.sink)).toBe('deferred');
    // A reading while unanswered is uncredited, never a check.
    m09ReadGauge(unanswered, 'incident_handover', 1_500, KEY, a.sink);
    cases['unanswered, no closure'] = [...a.events];
    a.closeUnanswered(unanswered);
    cases['unanswered, closed at the review'] = a.events;

    // (b) Declined duty with no check events.
    const b = harness();
    const declined = createM09State();

    m09Present(declined, 1_000, b.sink);
    m09Answer(declined, 'decline', 2, 3, 1_400, KEY, b.sink);
    b.opened();
    b.close(declined, 'declined');
    cases['declined'] = b.events;

    // (c) Accepted, only check 1 observed (checks 2–3 absent).
    cases['only check 1'] = route([false, false, false], 1).h.events;

    // (d) Checks 1 and 3 observed, check 2 absent.
    const d = harness();
    const skipped = accept(d);

    m09ConcourseExited(skipped, 'records_workshop', 2_000, d.sink);
    expect(
      m09ConcourseEntered(skipped, 'return_hub', ACCESS, 3_000, d.sink),
    ).toBe(3);
    m09ReadGauge(skipped, 'return_hub', 3_200, KEY, d.sink);
    d.close(skipped);
    cases['checks 1 and 3, check 2 absent'] = d.events;

    // (e) A missed check with no reading.
    cases['a missed check'] = route([true, false, true]).h.events;

    // (f) A censored check closed at the review.
    const f = harness();
    const censored = accept(f);

    m09CloseAtReview(censored, 2_000, f.sink);
    f.close(censored, 'closed_at_review');
    cases['a censored check'] = f.events;

    const expected: Record<string, string> = {
      'unanswered, no closure': 'no_eligible_event',
      'unanswered, closed at the review': 'no_eligible_event',
      declined: 'declined',
      'only check 1': 'incomplete',
      'checks 1 and 3, check 2 absent': 'incomplete',
      'a missed check': 'observed',
      'a censored check': 'no_eligible_event',
    };

    for (const [name, events] of Object.entries(cases)) {
      const row = feature(events);

      expect(row.disposition, name).not.toBe('technical_failure');
      expect(row.disposition, name).toBe(expected[name]);
    }

    expect(feature(cases['unanswered, closed at the review'])).toMatchObject({
      value: null,
      closure_reason: 'closed_at_review',
      missing_reason: 'watch offer not answered',
    });
    expect(feature(cases['checks 1 and 3, check 2 absent'])).toMatchObject({
      value: 1,
      denominator: 2,
      included_ids: ['m09_duty_check_1', 'm09_duty_check_3'],
    });
    expect(feature(cases['a censored check'])).toMatchObject({
      value: null,
      denominator: 0,
      censored: true,
    });
  });

  test('conditional invariants: contradictory, malformed or unreproducible evidence is a technical failure', () => {
    const valid = route([true, true, true]).h.events;
    const index = (events: RawGameEvent[], suffix: string, check: number) =>
      events.findIndex(
        (e) =>
          e.event_type === typeOf(suffix) && e.metadata?.check_index === check,
      );

    expect(feature(valid).disposition).toBe('observed');

    const broken: Record<string, RawGameEvent[]> = {
      'check 2 opened twice': rewrite(valid, (copy) => {
        const at = index(copy, 'check_window_opened', 2);

        copy.splice(at + 1, 0, JSON.parse(JSON.stringify(copy[at])));

        return copy;
      }),
      'check 3 opened before check 2': rewrite(valid, (copy) => {
        const two = index(copy, 'check_window_opened', 2);
        const three = index(copy, 'check_window_opened', 3);

        [copy[two], copy[three]] = [copy[three], copy[two]];

        return copy;
      }),
      'a reading credited outside its window': rewrite(valid, (copy) => {
        const reading = index(copy, 'check_fulfilled', 2);
        const closure = index(copy, 'check_window_closed', 2);

        // The reading now lies after the window's closure.
        [copy[reading], copy[closure]] = [copy[closure], copy[reading]];

        return copy;
      }),
      'two credited readings of one check': rewrite(valid, (copy) => {
        const at = index(copy, 'check_fulfilled', 1);

        copy.splice(at + 1, 0, JSON.parse(JSON.stringify(copy[at])));

        return copy;
      }),
      'a closure snapshot disagreeing with the recount': rewrite(
        valid,
        (copy) => {
          const closed = copy.find(
            (e) => e.event_type === typeOf('window_closed'),
          )!;

          (
            closed.metadata!.raw_components as { checks_fulfilled: number }
          ).checks_fulfilled = 2;

          return copy;
        },
      ),
      'a missed closure with a reading': rewrite(valid, (copy) => {
        const closure = copy[index(copy, 'check_window_closed', 3)];

        closure.metadata = {
          ...closure.metadata,
          outcome: 'missed',
          reason: 'left_concourse',
        };

        return copy;
      }),
      'an unknown version': rewrite(valid, (copy) => {
        copy[2].metadata = {
          ...copy[2].metadata,
          entry_state_version: 'm09-monitor-watch-v1',
        };

        return copy;
      }),
      'a check opened before the acceptance': rewrite(valid, (copy) => {
        const answer = copy.findIndex(
          (e) => e.event_type === typeOf('offer_answered'),
        );
        const opening = index(copy, 'check_window_opened', 1);
        const [moved] = copy.splice(opening, 1);

        copy.splice(answer, 0, moved);

        return copy;
      }),
      'check events on a declined duty': rewrite(valid, (copy) => {
        const answer = copy.find(
          (e) => e.event_type === typeOf('offer_answered'),
        )!;

        answer.metadata = { ...answer.metadata, answer: 'decline' };

        return copy;
      }),
      'two terminal answers': rewrite(valid, (copy) => {
        const at = copy.findIndex(
          (e) => e.event_type === typeOf('offer_answered'),
        );

        copy.splice(at + 1, 0, JSON.parse(JSON.stringify(copy[at])));

        return copy;
      }),
    };

    for (const [name, events] of Object.entries(broken)) {
      const row = feature(events);

      expect(row.disposition, name).toBe('technical_failure');
      expect(row.value, name).toBeNull();
      expect(row.missing_reason, name).not.toBeNull();
    }
  });

  test('event-order integrity: an order that cannot be verified never yields an observed value', () => {
    // Research-owner ruling (register §5.259), checked for the watch: an
    // outcome that depends on event order must not be valued when the
    // ordering evidence is missing or malformed, and a missing sequence
    // number is never read as zero. The logger's convention: an integer
    // from 1, unique within the session; gaps are normal.
    type Outcome = {
      disposition: string;
      value: unknown;
      numerator: number | null;
      denominator: number | null;
      missing_reason: string | null;
    };
    const outcome = (events: readonly RawGameEvent[]): Outcome => {
      const row = feature(events);

      return {
        disposition: row.disposition,
        value: row.value,
        numerator: row.numerator,
        denominator: row.denominator,
        missing_reason: row.missing_reason,
      };
    };
    const clone = (events: readonly RawGameEvent[]) =>
      JSON.parse(JSON.stringify(events)) as RawGameEvent[];
    const eventOf = (events: RawGameEvent[], suffix: string, check?: number) =>
      events.find(
        (e) =>
          e.event_type === typeOf(suffix) &&
          (check === undefined || e.metadata?.check_index === check),
      )!;
    /** A copy whose one event carries this sequence value (undefined = none). */
    const resequenced = (
      events: readonly RawGameEvent[],
      suffix: string,
      value: unknown,
      check?: number,
    ) => {
      const copy = clone(events);
      const event = eventOf(copy, suffix, check) as { sequence?: unknown };

      if (value === undefined) {
        delete event.sequence;
      } else {
        event.sequence = value;
      }

      return copy;
    };

    // ——— Valid logs (every event numbered by the harness) ———
    const allRead = route([true, true, true]).h.events;
    const oneMissed = route([true, false, true]).h.events;

    const lateRead = harness();
    const duty = accept(lateRead);

    m09ReadGauge(duty, 'incident_handover', 2_000, KEY, lateRead.sink);
    m09ConcourseExited(duty, 'records_workshop', 3_000, lateRead.sink);
    m09ConcourseEntered(duty, 'lab_briefing', ACCESS, 4_000, lateRead.sink);
    m09ConcourseExited(duty, 'diagnostics_laboratory', 5_000, lateRead.sink);
    m09ConcourseEntered(duty, 'exterior_work', ACCESS, 5_500, lateRead.sink);
    // A late reading of the missed check: recorded, uncredited.
    m09ReadGauge(duty, 'exterior_work', 5_600, KEY, lateRead.sink);
    m09ConcourseExited(duty, 'diagnostics_laboratory', 5_700, lateRead.sink);
    m09ConcourseEntered(duty, 'return_hub', ACCESS, 6_000, lateRead.sink);
    m09ReadGauge(duty, 'return_hub', 6_200, KEY, lateRead.sink);
    lateRead.close(duty);

    const unanswered = harness();

    m09Present(createM09State(), 1_000, unanswered.sink);

    const declined = harness();
    const refused = createM09State();

    m09Present(refused, 1_000, declined.sink);
    m09Answer(refused, 'decline', 2, 3, 1_400, KEY, declined.sink);
    declined.opened();
    declined.close(refused, 'declined');

    const logs: Record<string, RawGameEvent[]> = {};

    // ——— The equivalent of register §5.258 for the watch ———
    {
      // Check 1 opened, read and closed BEFORE the acceptance in the log —
      // malformed. With the acceptance's sequence number missing, the
      // order can no longer be read at all.
      const moved = rewrite(allRead, (copy) => {
        const [answer] = copy.splice(
          copy.findIndex((e) => e.event_type === typeOf('offer_answered')),
          1,
        );
        const closure = copy.findIndex(
          (e) =>
            e.event_type === typeOf('check_window_closed') &&
            e.metadata?.check_index === 1,
        );

        copy.splice(closure + 1, 0, answer);

        return copy;
      });

      expect(outcome(moved).missing_reason).toBe(
        'check 1 was opened before the acceptance',
      );
      logs['the acceptance without a sequence number, check 1 before it'] =
        resequenced(moved, 'offer_answered', undefined);
    }

    // ——— Missing and malformed numbers on events the order is read from ———
    logs['a check opening without a sequence number'] = resequenced(
      allRead,
      'check_window_opened',
      undefined,
      2,
    );
    logs['a reading without a sequence number'] = resequenced(
      allRead,
      'check_fulfilled',
      undefined,
      3,
    );
    logs['the duty closure without a sequence number'] = resequenced(
      allRead,
      'window_closed',
      undefined,
    );
    logs['an uncredited reading without a sequence number'] = resequenced(
      lateRead.events,
      'gauge_read_uncredited',
      undefined,
    );

    // An accepted duty that is still open is inside the check: with a
    // defective number it is a technical failure, not `pending`.
    const openDuty = harness();

    accept(openDuty);
    logs['still open, the check opening unnumbered'] = resequenced(
      openDuty.events,
      'check_window_opened',
      undefined,
      1,
    );
    logs['valid, still open'] = openDuty.events;

    for (const [label, value] of [
      ['null', null],
      ['zero', 0],
      ['a negative number', -4],
      ['a fraction', 2.5],
      ['a string', '2'],
      ['an unsafe integer', 2 ** 53],
    ] as const) {
      logs[`the acceptance numbered with ${label}`] = resequenced(
        allRead,
        'offer_answered',
        value,
      );
    }

    // ——— Ambiguous: two events of the duty share a number ———
    logs['two events sharing a number'] = resequenced(
      allRead,
      'offer_answered',
      eventOf(clone(allRead), 'presented').sequence,
    );

    // ——— Valid records that must stay as they were ———
    // Gaps are normal: other events lie between the relevant ones.
    logs['valid, numbered with gaps'] = clone(oneMissed).map((event) => ({
      ...event,
      sequence: (event.sequence ?? 0) * 10 + 5,
    }));
    logs['valid, all three read'] = allRead;
    logs['valid, one check missed'] = oneMissed;
    logs['valid, a late reading after a miss'] = lateRead.events;
    // Dispositions that read no order are untouched by an unnumbered event.
    logs['unanswered, the presentation unnumbered'] = resequenced(
      unanswered.events,
      'presented',
      undefined,
    );
    logs['declined, the answer unnumbered'] = resequenced(
      declined.events,
      'offer_answered',
      undefined,
    );

    const before = Object.fromEntries(
      Object.entries(logs).map(([name, events]) => [
        name,
        JSON.stringify(events),
      ]),
    );
    const outcomes = Object.fromEntries(
      Object.keys(logs).map((name) => [
        name,
        outcome(deepFreeze(JSON.parse(before[name]) as RawGameEvent[])),
      ]),
    );
    const failed = (missing_reason: string): Outcome => ({
      disposition: 'technical_failure',
      value: null,
      numerator: null,
      denominator: null,
      missing_reason,
    });
    const unnumbered = 'an event without a usable sequence number';
    const observed = (value: number): Outcome => ({
      disposition: 'observed',
      value,
      numerator: value,
      denominator: 3,
      missing_reason: null,
    });

    expect(outcomes).toEqual({
      'the acceptance without a sequence number, check 1 before it':
        failed(unnumbered),
      'a check opening without a sequence number': failed(unnumbered),
      'a reading without a sequence number': failed(unnumbered),
      'the duty closure without a sequence number': failed(unnumbered),
      'an uncredited reading without a sequence number': failed(unnumbered),
      'still open, the check opening unnumbered': failed(unnumbered),
      'valid, still open': {
        disposition: 'pending',
        value: null,
        numerator: null,
        denominator: null,
        missing_reason: 'the watch duty is still open',
      },
      'the acceptance numbered with an unsafe integer': failed(unnumbered),
      'the acceptance numbered with null': failed(unnumbered),
      'the acceptance numbered with zero': failed(unnumbered),
      'the acceptance numbered with a negative number': failed(unnumbered),
      'the acceptance numbered with a fraction': failed(unnumbered),
      'the acceptance numbered with a string': failed(unnumbered),
      'two events sharing a number': failed(
        'two events share a sequence number',
      ),
      'valid, numbered with gaps': observed(2),
      'valid, all three read': observed(3),
      'valid, one check missed': observed(2),
      'valid, a late reading after a miss': observed(2),
      'unanswered, the presentation unnumbered': {
        disposition: 'no_eligible_event',
        value: null,
        numerator: null,
        denominator: null,
        missing_reason: 'watch offer not answered',
      },
      'declined, the answer unnumbered': {
        disposition: 'declined',
        value: null,
        numerator: null,
        denominator: null,
        missing_reason: 'watch duty declined',
      },
    });

    // Numbers that are not usable numbers at all (they cannot survive
    // JSON, so they are checked directly — the value itself unchanged).
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const copy = clone(allRead);
      const closure = eventOf(copy, 'check_window_closed', 2);

      closure.sequence = value;
      expect(outcome(copy), String(value)).toEqual(failed(unnumbered));
      expect(Object.is(closure.sequence, value), String(value)).toBe(true);
    }

    // The late reading is still recorded apart and never credited.
    expect(
      (
        feature(lateRead.events).components as {
          uncredited_reads: { reason: string }[];
        }
      ).uncredited_reads.map((read) => read.reason),
    ).toEqual(['no_check_due']);

    // Immutability: the rows above came from deeply frozen copies; the
    // original logs are extracted here and compared with their text from
    // before, and a second extraction gives the same row.
    for (const [name, events] of Object.entries(logs)) {
      const first = JSON.stringify(feature(events));

      expect(JSON.stringify(events), name).toBe(before[name]);
      expect(JSON.stringify(feature(events)), name).toBe(first);
      expect(JSON.stringify(events), name).toBe(before[name]);
    }
  });

  test('extraction is pure and deterministic: the raw log is byte-identical before and after, and prior page loads never count', () => {
    const { h } = route([true, false, true]);
    const before = JSON.stringify(h.events);
    const frozen = deepFreeze(JSON.parse(before) as RawGameEvent[]);
    const first = extractItemFeatures('M09', frozen, CONTEXT);
    const second = extractItemFeatures('M09', frozen, CONTEXT);

    expect(JSON.stringify(frozen)).toBe(before);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first[0]).toMatchObject({ value: 2, denominator: 3 });

    // The same events tagged as an earlier page load are not this load's
    // evidence: after a reload the feature is interrupted, never a value.
    const prior = h.events.map((event) => ({ ...event, page_load_index: 1 }));

    expect(
      feature(prior, {
        finalCoreClosed: false,
        pageLoadIndex: 2,
        reloaded: true,
      }),
    ).toMatchObject({ value: null, disposition: 'interrupted' });
  });

  test('station-log exposure: one identical due line for all three checks, counted per check only when rendered', () => {
    const h = harness();
    const s = createM09State();

    // No line and no record before acceptance.
    expect(
      m09NoteLogViewed(
        s,
        'incident_handover',
        { rendered: true, log_position: 1 },
        h.sink,
      ),
    ).toBe(false);
    m09Present(s, 1_000, h.sink);
    m09Answer(s, 'accept', 1, 3, 1_400, KEY, h.sink);
    h.opened();
    m09OpenAcceptanceCheck(s, 'incident_handover', ACCESS, 1_400, h.sink);

    const dueLines: string[] = [];
    const view = (stage: string, rendered = true) =>
      m09NoteLogViewed(
        s,
        stage,
        { rendered, log_position: rendered ? 1 : 9 },
        h.sink,
      );

    dueLines.push(m09LogLine(s, 'incident_handover')!.text);
    expect(view('incident_handover')).toBe(true);
    expect(view('incident_handover', false)).toBe(true);
    m09ReadGauge(s, 'incident_handover', 2_000, KEY, h.sink);
    // Between checks the log names the next reading (no check is due).
    expect(view('workshop')).toBe(true);
    m09ConcourseExited(s, 'records_workshop', 3_000, h.sink);
    m09ConcourseEntered(s, 'lab_briefing', ACCESS, 4_000, h.sink);
    dueLines.push(m09LogLine(s, 'lab_briefing')!.text);
    expect(view('lab_briefing')).toBe(true);
    expect(view('lab_briefing')).toBe(true);
    m09ConcourseExited(s, 'diagnostics_laboratory', 5_000, h.sink);
    m09ConcourseEntered(s, 'return_hub', ACCESS, 6_000, h.sink);
    dueLines.push(m09LogLine(s, 'return_hub')!.text);
    m09ConcourseExited(s, 'records_workshop', 7_000, h.sink);
    h.close(s);
    // The duty is over: no line, no record.
    expect(view('workshop_return')).toBe(false);

    expect(new Set(dueLines).size).toBe(1);
    expect(dueLines[0]).toBe(M09_LOG_LINES.m09_log_due);
    expect(
      h.events
        .filter((e) => e.event_type === typeOf('log_viewed'))
        .map((e) => [
          e.metadata?.due_check_index,
          e.metadata?.line_id,
          e.metadata?.rendered,
        ]),
    ).toEqual([
      [1, 'm09_log_due', true],
      [1, 'm09_log_due', false],
      [null, 'm09_log_next_lab_pass', true],
      [2, 'm09_log_due', true],
      [2, 'm09_log_due', true],
    ]);
    expect(s.checks[1].log_views_while_due).toBe(1);
    expect(s.checks[2].log_views_while_due).toBe(2);
    expect(s.checks[3].log_views_while_due).toBe(0);

    const checks = (
      feature(h.events).components as {
        checks: { log_views_while_due: number }[];
      }
    ).checks;

    expect(checks.map((check) => check.log_views_while_due)).toEqual([1, 2, 0]);
  });

  test('participant-facing copy: the approved wording, lines of at most 90 characters, no study wording', () => {
    expect(M09_OFFER_BODY).toBe(
      'Vale: One more thing — will you take the monitor watch this shift? Three gauge readings: one now, one when you come back through on your way to the laboratory, and one when you are back inside from the yard. Each is due before you leave the Concourse that time. Your station log (M) shows the watch.',
    );
    expect(M09_OFFER_LABELS).toEqual({
      accept: 'I will take the watch.',
      decline: 'Not this shift.',
      defer: 'Ask me again later.',
    });
    expect(M09_REASK_LABEL).toBe('About the monitor watch…');
    expect(M09_LOG_LINES).toEqual({
      m09_log_due:
        'Monitor watch: reading due — read the gauge before you leave the Concourse.',
      m09_log_next_lab_pass:
        'Monitor watch: next reading on your way through to the laboratory.',
      m09_log_next_return_pass:
        'Monitor watch: next reading when you are back inside from the yard.',
    });

    // Readings by route band; the credit is stated only when credited.
    expect(m09Reading('incident_handover')).toBe(M09_READINGS.outbound);
    expect(m09Reading('workshop_work')).toBe(M09_READINGS.outbound);
    expect(m09Reading('lab_briefing')).toBe(M09_READINGS.lab_pass);
    expect(m09Reading('exterior_work')).toBe(M09_READINGS.lab_pass);
    expect(m09Reading('return_hub')).toBe(M09_READINGS.return);
    expect(m09Reading('complete')).toBe(M09_READINGS.return);
    expect(m09GaugeFeedback('incident_handover', true)).toBe(
      'Gauge read: loop 1.6 bar · bus 26.8 V · relay LOCK. Watch reading logged.',
    );
    expect(m09GaugeFeedback('lab_work', false)).toBe(
      'Gauge read: loop 1.5 bar ▼ · bus 26.4 V ▼ · relay LOCK.',
    );
    expect(m09GaugeFeedback('return_hub', false)).toBe(
      'Gauge read: loop 1.4 bar ▼ · bus 26.1 V ▼ · relay LOCK.',
    );

    const copy = [
      M09_OFFER_BODY,
      M09_REASK_LABEL,
      ...Object.values(M09_OFFER_LABELS),
      ...Object.values(M09_LOG_LINES),
      ...PILOT_STAGES.flatMap((stage) => [
        m09GaugeFeedback(stage, true),
        m09GaugeFeedback(stage, false),
      ]),
    ];

    for (const text of copy) {
      expect(text, text).not.toMatch(FORBIDDEN);
    }

    for (const line of Object.values(M09_LOG_LINES)) {
      expect(line.length, line).toBeLessThanOrEqual(90);
    }
  });

  test('input classifier: keyboard, pointer or unobserved — a pointer press is never labelled keyboard', () => {
    expect(classifyObservedInput(null, 1_000)).toEqual({
      input_mode: 'unobserved',
      input_mode_basis: 'not_observed',
    });
    expect(
      classifyObservedInput({ device: 'keyboard', at: 990 }, 1_000),
    ).toEqual({ input_mode: 'keyboard', input_mode_basis: 'window_keydown' });
    expect(
      classifyObservedInput({ device: 'pointer', at: 990 }, 1_000),
    ).toEqual({
      input_mode: 'pointer',
      input_mode_basis: 'window_pointerdown',
    });
    // Too old, or from the future: not the press that caused the act.
    expect(
      classifyObservedInput(
        { device: 'keyboard', at: 1_000 },
        1_001 + INPUT_OBSERVATION_MAX_AGE_MS,
      ),
    ).toEqual({
      input_mode: 'unobserved',
      input_mode_basis: 'no_recent_press',
    });
    expect(
      classifyObservedInput({ device: 'pointer', at: 2_000 }, 1_000).input_mode,
    ).toBe('unobserved');
    // The boundary is inclusive.
    expect(
      classifyObservedInput(
        { device: 'pointer', at: 1_000 },
        1_000 + INPUT_OBSERVATION_MAX_AGE_MS,
      ).input_mode,
    ).toBe('pointer');

    for (let age = 0; age <= INPUT_OBSERVATION_MAX_AGE_MS + 500; age += 250) {
      expect(
        classifyObservedInput({ device: 'pointer', at: 0 }, age).input_mode,
      ).not.toBe('keyboard');
    }

    // The observed mode is what the acts record.
    const h = harness();
    const s = createM09State();
    const unobserved = classifyObservedInput(null, 0);

    m09Present(s, 1_000, h.sink);
    m09Answer(s, 'accept', 1, 3, 1_400, unobserved, h.sink);
    h.opened();
    m09OpenAcceptanceCheck(s, 'incident_handover', ACCESS, 1_400, h.sink);
    m09ReadGauge(s, 'incident_handover', 2_000, POINTER, h.sink);
    expect(
      h.events.find((e) => e.event_type === typeOf('offer_answered'))?.metadata,
    ).toMatchObject({
      input_mode: 'unobserved',
      input_mode_basis: 'not_observed',
    });
    expect(
      h.events.find((e) => e.event_type === typeOf('check_fulfilled'))
        ?.metadata,
    ).toMatchObject({ input_mode: 'pointer', basis: 'window_pointerdown' });
  });

  test('module boundaries: a pure model, an adapter on the new family only, observation read only by the M09 / M10 call sites', () => {
    const model = source('src/pilot/windows/m09WatchModel.ts');
    const adapter = source('src/pilot/windows/m09MonitorWatch.ts');
    const observation = source('src/pilot/inputObservation.ts');
    const imports = (text: string) =>
      [...text.matchAll(/from '([^']+)'/g)].map((match) => match[1]);

    expect(imports(model)).toEqual(['../inputObservation']);
    expect(imports(observation)).toEqual([]);
    expect(model).not.toMatch(
      /advancePilotStage|researchRuntime|import Phaser/,
    );

    for (const text of [model, adapter, observation]) {
      expect(text).not.toMatch(/score|dependab|reliab/i);
    }

    // The v2 family prefix appears only inside the new opportunity id.
    expect(M09_OPPORTUNITY_ID).toBe('proto_m09_watch_duty');
    expect(adapter).not.toMatch(/proto_m09_watch_(?!duty)/);
    expect(model).not.toMatch(/proto_m09_watch_(?!duty)/);
    expect(adapter).not.toContain('phaseMetadata');

    for (const name of [
      'closeM09AtReview',
      'noteM09ReminderLogViewed',
      'guardM09Reload',
    ]) {
      expect(adapter).toContain(`export function ${name}(`);
    }

    // The M10 model shares no identifier with the watch.
    expect(source('src/pilot/windows/m10DeliveryModel.ts')).not.toMatch(
      /m09|gauge|watch/i,
    );
    expect(model).not.toMatch(/m10|deliver|key card|logbook/i);
  });
});
