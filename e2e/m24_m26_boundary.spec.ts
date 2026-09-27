/**
 * Station 080 M24 / M26 — the knowledge boundary (Unit 12), pure tests.
 *
 * Playwright test blocks that never touch `page`: the register rows (v3
 * routes, a count + a sensitivity count + a companion per item); the two
 * expected-outcome questions (the key never the first card in either
 * form, no item wording, no preference); the shared understanding model
 * (settle refusal, pass_first, the one explanation and the equivalent
 * recheck, pass_after_explanation, fail); the rig model (pre-knowledge,
 * post-knowledge and after-fail casts, the focused continuation with its
 * cap, pause and explicit exit, the closure dispositions); the uplink
 * model (the first retry included, the switch inside the continuation, a
 * retry in flight at the cap); the extractors over the raw families
 * (observed with a recount, censored at the cap and the review,
 * understanding_failed, interrupted, no_eligible_event, declined,
 * not_presented, technical failure on a disagreeing record, pending).
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { PILOT_SETTINGS } from '../src/measurement/protocol';
import { registerEntry } from '../src/measurement/registerV3';
import {
  createM24State,
  M24_CAP_MS,
  M24_CHECK_RECORDED,
  M24_FAMILY,
  M24_OPPORTUNITY_ID,
  M24_UNDERSTANDING_QUESTION,
  m24Abort,
  m24AnswerTest,
  m24Close,
  m24ClosureDisposition,
  m24ContinuationOpen,
  m24ContinuationRemainingMs,
  m24Enter,
  m24Exit,
  m24Explained,
  m24KnowledgeState,
  m24NoteAlternative,
  m24NoteCycle,
  m24NoteDepletionShown,
  m24NoteStepAway,
  m24Pause,
  m24PresentTest,
  m24RawComponents,
  m24Resume,
  type M24State,
  m24TestDue,
  m24Tick,
} from '../src/pilot/exterior/m24MagnetRigModel';
import {
  createM26State,
  M26_CAP_MS,
  M26_CHECK_RECORDED,
  M26_FAMILY,
  M26_OPPORTUNITY_ID,
  M26_UNDERSTANDING_QUESTION,
  m26Abort,
  m26AnswerTest,
  m26Close,
  m26ClosureDisposition,
  m26ContinuationOpen,
  m26ContinuationRemainingMs,
  m26Demonstrate,
  m26Enter,
  m26Exit,
  m26Explained,
  m26Knowledge,
  m26NoteStepAway,
  m26PresentTest,
  m26RawComponents,
  type M26State,
  m26Tick,
  m26Transmit,
} from '../src/pilot/exterior/m26ChannelModel';
import {
  createUnderstandingState,
  UNDERSTANDING_SETTLE_MS,
  understandingAnswer,
  understandingDue,
  understandingExplained,
  understandingOptions,
  understandingPresent,
  understandingQuestionValid,
  understandingRaw,
} from '../src/pilot/exterior/outcomeUnderstanding';
import type { RawGameEvent } from '../src/systems/EventLogger';

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };
const FORBIDDEN =
  /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bQ\d{2}\b|score|trait|persist|valid|should|better|worth|pointless|give up/i;

/** A rig cycle record (the deck is not consulted: the flags are explicit). */
function cast(
  overrides: Partial<{
    post_depletion: boolean;
    depleted_now: boolean;
    item_id: string | null;
    cancelled: boolean;
  }> = {},
) {
  return {
    cancelled: false,
    hook_set: true,
    locked_in_band: true,
    lock_source: 'keyboard',
    outcome_tier: overrides.item_id === undefined ? 'scrap' : null,
    item_id:
      overrides.item_id === undefined ? 'scrap_plate' : overrides.item_id,
    item_delivery: 'inventory' as const,
    pull_position: 1,
    post_depletion: false,
    depleted_now: false,
    cycle_duration_ms: 4200,
    ...overrides,
  };
}

/** A depleted rig at t = 6000 with the statement shown and the check due. */
function depletedRig(): M24State {
  const s = createM24State('deck_form_A');

  m24Enter(s, 0, 0);

  for (let i = 0; i < 5; i++) {
    m24NoteCycle(s, cast(), 1000 + i * 1000);
  }

  m24NoteCycle(s, cast({ depleted_now: true, item_id: null }), 6000);
  m24NoteDepletionShown(s, 6100);

  return s;
}

/** A disconnected uplink at t = 3000 with the check due. */
function disconnectedUplink(): M26State {
  const s = createM26State();

  m26Enter(s, 0);
  m26Transmit(s, 'A', 1000);
  m26Demonstrate(s, 3000);

  return s;
}

/** A captured event stream shaped like the adapter's emissions. */
function harness(family: string, opportunity: string) {
  const events: RawGameEvent[] = [];
  const push = (suffix: string, metadata: Record<string, unknown> = {}) => {
    events.push({
      scene: 'exterior_recovery_yard',
      event_type: `${family}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: { opportunity_id: opportunity, ...metadata },
    });
  };

  return {
    events,
    push,
    presented: () => push('presented', { input_mode: 'system' }),
    opened: () => push('opportunity_opened', { input_mode: 'system' }),
    answered: (attempt: number, correct: boolean, status: string) =>
      push('understanding_answered', {
        attempt,
        correct,
        form: attempt === 1 ? 'a' : 'b',
        response: correct ? 'key' : 'other',
        position: correct ? 2 : 1,
        latency_ms: 900,
        refused_presses_before: 0,
        knowledge_status: status,
        input_mode: 'keyboard',
      }),
    acts: (suffix: string, count: number) => {
      for (let i = 1; i <= count; i++) {
        push(suffix, { count: i, input_mode: 'keyboard' });
      }
    },
    close: (
      raw: Record<string, unknown>,
      exit: 'completed' | 'stopped' | 'departed' | 'closed_at_review',
      partial = false,
    ) =>
      push('window_closed', {
        exit_state: exit,
        [partial ? 'raw_components_partial' : 'raw_components']: raw,
        input_mode: 'system',
      }),
    failed: () => push('technical_failure', { detail: 'boom' }),
  };
}

test.describe('M24 / M26 knowledge boundary (pure)', () => {
  test('register rows: v3 routes, a count + a sensitivity count + a companion each; the two questions keep the key off the first card in both forms and name no item', () => {
    for (const [id, opportunity, window, family] of [
      ['M24', 'proto_m24_rig_continuation', 'm24_rig_w1', 'proto_m24_rig_'],
      [
        'M26',
        'proto_m26_uplink_continuation',
        'm26_uplink_w1',
        'proto_m26_uplink_',
      ],
    ] as const) {
      const entry = registerEntry(id);

      expect(entry.route.route_version).toBe('v3');
      expect(entry.route.opportunity_ids).toEqual([opportunity]);
      expect(entry.route.windows.map((w) => [w.id, w.zone, w.episode])).toEqual(
        [[window, 'exterior_recovery_yard', 4]],
      );
      expect(entry.route.family_prefixes).toEqual([family]);
      expect(entry.implementation_status).toBe('implemented');
      expect(entry.features.map((f) => f.role)).toEqual([
        'primary',
        'sensitivity',
        'companion',
      ]);
    }

    expect(M24_OPPORTUNITY_ID).toBe('proto_m24_rig_continuation');
    expect(M26_OPPORTUNITY_ID).toBe('proto_m26_uplink_continuation');
    expect(M24_CAP_MS).toBe(PILOT_SETTINGS.m24_cap_ms);
    expect(M26_CAP_MS).toBe(PILOT_SETTINGS.m26_cap_ms);

    for (const question of [
      M24_UNDERSTANDING_QUESTION,
      M26_UNDERSTANDING_QUESTION,
    ]) {
      expect(understandingQuestionValid(question)).toBe(true);
      expect(understandingOptions(question, 'a').map((o) => o.id)).toEqual(
        question.options.map((o) => o.id),
      );
      // The recheck rotates the order: the same content, the key moved.
      expect(understandingOptions(question, 'b').map((o) => o.id)).toEqual([
        question.options[2]!.id,
        question.options[0]!.id,
        question.options[1]!.id,
      ]);
      expect(understandingOptions(question, 'b')[0]!.id).not.toBe(question.key);

      for (const text of [
        question.stem,
        question.explanation,
        ...question.options.map((o) => o.label),
      ]) {
        expect(text).not.toMatch(FORBIDDEN);
      }
    }

    // The line after the check is identical for a pass and a fail and
    // names no outcome.
    for (const line of [M24_CHECK_RECORDED, M26_CHECK_RECORDED]) {
      expect(line).not.toMatch(/correct|wrong|right|pass|fail|well done/i);
    }
  });

  test('understanding model: a press inside the settle window is refused; a right first answer is pass_first; a wrong one needs the explanation before the rotated recheck; a right recheck is pass_after_explanation; two wrong answers fail; nothing answers when no stage is open', () => {
    const q = M24_UNDERSTANDING_QUESTION;

    // pass_first
    {
      const s = createUnderstandingState();

      expect(understandingDue(s)).toBe('attempt_1');
      expect(understandingAnswer(s, q, q.key, 100).kind).toBe('refused'); // not presented
      expect(understandingPresent(s, 'attempt_2', 100)).toBe(false);
      expect(understandingPresent(s, 'attempt_1', 100)).toBe(true);
      expect(
        understandingAnswer(s, q, q.key, 100 + UNDERSTANDING_SETTLE_MS - 1),
      ).toEqual({ kind: 'refused', reason: 'settling' });
      expect(s.refused_presses).toBe(1);

      const result = understandingAnswer(
        s,
        q,
        q.key,
        100 + UNDERSTANDING_SETTLE_MS,
      );

      expect(result).toMatchObject({
        kind: 'answered',
        status: 'pass_first',
        explanation_due: false,
      });
      expect(result.kind === 'answered' && result.attempt).toMatchObject({
        attempt: 1,
        form: 'a',
        position: 2,
        correct: true,
        latency_ms: UNDERSTANDING_SETTLE_MS,
        refused_presses_before: 1,
      });
      expect(understandingDue(s)).toBeNull();
      expect(understandingAnswer(s, q, q.key, 5000).kind).toBe('refused');
    }

    // wrong → explanation → recheck → pass_after_explanation
    {
      const s = createUnderstandingState();

      understandingPresent(s, 'attempt_1', 0);
      expect(understandingAnswer(s, q, 'next_piece', 1000)).toMatchObject({
        kind: 'answered',
        status: 'unknown',
        explanation_due: true,
      });
      expect(understandingDue(s)).toBe('explanation');
      expect(understandingPresent(s, 'attempt_2', 1100)).toBe(false);
      expect(understandingExplained(s, 1100)).toBe(false); // not shown yet
      expect(understandingPresent(s, 'explanation', 1100)).toBe(true);
      expect(understandingAnswer(s, q, q.key, 2000).kind).toBe('refused'); // no attempt open
      // A carried press cannot skip the explanation (settle), and a
      // re-presentation keeps the FIRST presentation time.
      expect(
        understandingExplained(s, 1100 + UNDERSTANDING_SETTLE_MS - 1),
      ).toBe(false);
      expect(s.refused_presses).toBe(1);
      expect(understandingPresent(s, 'explanation', 1600)).toBe(true);
      expect(s.explanation_presented_at_ms).toBe(1100);
      expect(understandingExplained(s, 2100)).toBe(true);
      expect(understandingRaw(s)).toMatchObject({
        explanation_shown: true,
        explanation_presented_at_ms: 1100,
        explanation_dismissed_at_ms: 2100,
        explanation_reading_ms: 1000,
      });
      expect(understandingDue(s)).toBe('attempt_2');
      expect(understandingPresent(s, 'attempt_2', 2200)).toBe(true);

      const result = understandingAnswer(s, q, q.key, 3000);

      expect(result).toMatchObject({
        kind: 'answered',
        status: 'pass_after_explanation',
      });
      expect(result.kind === 'answered' && result.attempt).toMatchObject({
        attempt: 2,
        form: 'b',
        position: 3, // the key moved to the last card on the recheck
      });
    }

    // wrong twice → fail
    {
      const s = createUnderstandingState();

      understandingPresent(s, 'attempt_1', 0);
      understandingAnswer(s, q, 'depends_timing', 1000);
      understandingPresent(s, 'explanation', 1100);
      understandingExplained(s, 2000);
      understandingPresent(s, 'attempt_2', 2100);
      expect(understandingAnswer(s, q, 'next_piece', 3000)).toMatchObject({
        kind: 'answered',
        status: 'fail',
      });
      expect(s.failed_at_ms).toBe(3000);
      expect(understandingDue(s)).toBeNull();
    }
  });

  test('rig model: casts before the pass are pre-knowledge and after a fail after-fail; a pass opens the focused continuation where casts count (the first included), the bench is the switch and Finish the exit; the cap closes it on focused time; the closures are missing / invalid / completed', () => {
    // pass_first → casts, bench, exit
    {
      const s = depletedRig();

      expect(m24KnowledgeState(s)).toBe('depleted_untested');
      expect(m24TestDue(s)).toBe('attempt_1');
      expect(
        m24NoteCycle(s, cast({ post_depletion: true, item_id: null }), 7000)
          .classification,
      ).toBe('pre_knowledge');
      expect(m24NoteAlternative(s, 7100)).toBe('pre_knowledge');
      expect(m24ContinuationOpen(s)).toBe(false);
      expect(m24ClosureDisposition(s)).toEqual({
        kind: 'invalid',
        detail: 'understanding_not_tested',
      });

      expect(m24PresentTest(s, 'attempt_1', 8000)).toBe(true);
      expect(m24AnswerTest(s, 'nothing', 9000)).toMatchObject({
        kind: 'answered',
        status: 'pass_first',
      });
      expect(m24KnowledgeState(s)).toBe('depleted_passed');
      expect(m24ContinuationOpen(s)).toBe(true);
      expect(m24ContinuationRemainingMs(s, 9000)).toBe(M24_CAP_MS);

      const first = m24NoteCycle(
        s,
        cast({ post_depletion: true, item_id: null }),
        12_000,
      );

      expect(first).toMatchObject({
        classification: 'postknowledge',
        postknowledge_count: 1,
        continuation_focused_ms: 3000,
      });
      expect(m24NoteAlternative(s, 14_000)).toBe('postknowledge');
      expect(m24Tick(s, 20_000, false)).toBe('none');
      expect(m24Exit(s, 21_000)).toBe(true);
      expect(m24ContinuationOpen(s)).toBe(false);
      expect(m24Exit(s, 21_500)).toBe(false);
      expect(m24Tick(s, 60_000, false)).toBe('none'); // closed: no cap

      const raw = m24RawComponents(s);

      expect(raw).toMatchObject({
        knowledge_status: 'pass_first',
        casts_pre_knowledge: 1,
        casts_after_fail: 0,
        postknowledge_casts: 1,
        postknowledge_casts_minus_first: 0,
        postdepletion_casts: 2,
        continuation_closure: 'voluntary_stop',
        continuation_focused_ms: 12_000,
        cap_reached: false,
        exited: true,
        alternative_used: true,
        alternative_used_pre_knowledge: 1,
        alternative_used_postknowledge: 1,
      });
      expect(m24ClosureDisposition(s)).toEqual({ kind: 'completed' });
      expect(m24Close(s, 'ended_shift_outside', 22_000)).toBe(true);
      expect(m24RawComponents(s).continuation_closure).toBe('voluntary_stop');
    }

    // pass → the cap on FOCUSED time (a pause excludes its interval)
    {
      const s = depletedRig();

      m24PresentTest(s, 'attempt_1', 7000);
      m24AnswerTest(s, 'nothing', 8000);
      m24Pause(s, 'unusable_controls', 10_000);
      m24Resume(s, 'unusable_controls', 20_000); // 10 s away from the rig
      expect(m24Tick(s, 8000 + M24_CAP_MS, false)).toBe('none'); // wall cap, not focused
      expect(m24ContinuationRemainingMs(s, 8000 + M24_CAP_MS)).toBe(10_000);
      // "Step away" inside the continuation is telemetry: nothing closes.
      expect(m24NoteStepAway(s)).toBe(true);
      expect(m24ContinuationOpen(s)).toBe(true);
      expect(m24Tick(s, 18_000 + M24_CAP_MS, true, true)).toBe('cap');
      expect(m24NoteStepAway(s)).toBe(false);
      expect(m24RawComponents(s)).toMatchObject({
        continuation_closure: 'cap',
        cap_reached: true,
        cast_in_progress_at_cap: true,
        alternative_in_progress_at_cap: true,
        steps_away_in_continuation: 1,
        continuation_focused_ms: M24_CAP_MS,
        continuation_wall_ms: M24_CAP_MS + 10_000,
        postknowledge_casts: 0,
      });
      expect(m24ClosureDisposition(s)).toEqual({ kind: 'completed' });
    }

    // fail → casts after the fail; invalid understanding_failed
    {
      const s = depletedRig();

      m24PresentTest(s, 'attempt_1', 7000);
      m24AnswerTest(s, 'next_piece', 8000);
      m24PresentTest(s, 'explanation', 8100);
      expect(m24Explained(s, 9000)).toBe(true);
      m24PresentTest(s, 'attempt_2', 9100);
      expect(m24AnswerTest(s, 'depends_timing', 10_000)).toMatchObject({
        kind: 'answered',
        status: 'fail',
      });
      expect(m24KnowledgeState(s)).toBe('depleted_failed');
      expect(m24ContinuationOpen(s)).toBe(false);
      expect(
        m24NoteCycle(s, cast({ post_depletion: true, item_id: null }), 11_000)
          .classification,
      ).toBe('after_fail');
      expect(m24RawComponents(s)).toMatchObject({
        knowledge_status: 'fail',
        explanation_shown: true,
        casts_after_fail: 1,
        postknowledge_casts: 0,
        continuation_opened: false,
      });
      expect(m24ClosureDisposition(s)).toEqual({
        kind: 'invalid',
        detail: 'understanding_failed',
      });
    }

    // never depleted → missing; the route closes an open continuation
    {
      const s = createM24State('deck_form_B');

      m24Enter(s, 0, 0);
      m24NoteCycle(s, cast(), 1000);
      expect(m24TestDue(s)).toBeNull();
      expect(m24ClosureDisposition(s)).toEqual({
        kind: 'missing',
        detail: 'deck_never_depleted',
      });

      const open = depletedRig();

      m24PresentTest(open, 'attempt_1', 7000);
      m24AnswerTest(open, 'nothing', 8000);
      expect(m24Close(open, 'closed_at_review', 9000)).toBe(true);
      expect(m24RawComponents(open).continuation_closure).toBe(
        'closed_at_review',
      );
      expect(m24ContinuationOpen(open)).toBe(false);

      // A technical failure stops the continuation's clock with the window.
      const aborted = depletedRig();

      m24PresentTest(aborted, 'attempt_1', 7000);
      m24AnswerTest(aborted, 'nothing', 8000);
      m24Abort(aborted, 9000);
      expect(aborted.closed).toBe(true);
      expect(m24ContinuationOpen(aborted)).toBe(false);
      expect(aborted.continuation_focused_ms).toBe(1000);
      expect(m24Tick(aborted, 8000 + M24_CAP_MS, false)).toBe('none');
    }
  });

  test('uplink model: Post A attempts before the pass are pre-knowledge and after a fail after-fail; inside the continuation the FIRST retry counts, Post B is the switch, a transmission in flight at the cap is recorded and never counted; Finish is the exit', () => {
    // pass_after_explanation → retries, switch, cap with a retry in flight
    {
      const s = disconnectedUplink();

      expect(m26Knowledge(s)).toBe('disconnected_untested');
      expect(m26Transmit(s, 'A', 3500).classification).toBe('pre_knowledge');
      m26PresentTest(s, 'attempt_1', 4000);
      m26AnswerTest(s, 'reaches_after_gust', 5000);
      m26PresentTest(s, 'explanation', 5100);
      expect(m26Explained(s, 6000)).toBe(true);
      m26PresentTest(s, 'attempt_2', 6100);
      expect(m26AnswerTest(s, 'not_received', 7000)).toMatchObject({
        kind: 'answered',
        status: 'pass_after_explanation',
      });
      expect(m26ContinuationOpen(s)).toBe(true);
      expect(m26ContinuationRemainingMs(s, 7000)).toBe(M26_CAP_MS);
      expect(s.reports_delivered_at_open).toBe(1);
      expect(m26NoteStepAway(s)).toBe(true);

      const first = m26Transmit(s, 'A', 9000);

      expect(first).toMatchObject({
        classification: 'postknowledge',
        continuation_focused_ms: 2000,
      });
      expect(m26Transmit(s, 'A', 11_000).classification).toBe('postknowledge');
      expect(m26Transmit(s, 'B', 13_000)).toMatchObject({
        classification: 'delivered',
        report: 'salvage_tally',
      });
      expect(s.alternative_used_postknowledge).toBe(1);
      // A retry after both reports are delivered is still a retry.
      expect(m26Transmit(s, 'A', 15_000)).toMatchObject({
        classification: 'postknowledge',
        report: null,
      });
      expect(m26Tick(s, 7000 + M26_CAP_MS - 1, true)).toBe('none');
      expect(m26Tick(s, 7000 + M26_CAP_MS, true)).toBe('cap');
      expect(m26RawComponents(s)).toMatchObject({
        knowledge_status: 'pass_after_explanation',
        pre_knowledge_attempts: 1,
        postknowledge_retries: 3,
        postknowledge_retries_minus_first: 2,
        postknowledge_retries_after_delivery: 1,
        alternative_used: true,
        continuation_closure: 'cap',
        cap_reached: true,
        retry_in_progress_at_cap: true,
        switch_in_progress_at_cap: false,
        steps_away_in_continuation: 1,
        reports_delivered_at_open: 1,
        all_reports_delivered: true,
      });
      expect(() => {
        m26Close(s, 'ended_shift_outside', 40_000);
        m26Transmit(s, 'A', 41_000);
      }).toThrow(); // the window is closed
      expect(m26ClosureDisposition(s)).toEqual({ kind: 'completed' });
    }

    // fail → after-fail attempts; invalid understanding_failed
    {
      const s = disconnectedUplink();

      m26PresentTest(s, 'attempt_1', 4000);
      m26AnswerTest(s, 'reaches_delayed', 5000);
      m26PresentTest(s, 'explanation', 5100);
      m26Explained(s, 6000);
      m26PresentTest(s, 'attempt_2', 6100);
      m26AnswerTest(s, 'reaches_after_gust', 7000);
      expect(m26Knowledge(s)).toBe('disconnected_failed');
      expect(m26Transmit(s, 'A', 8000).classification).toBe('after_fail');
      expect(m26RawComponents(s)).toMatchObject({
        knowledge_status: 'fail',
        attempts_after_fail: 1,
        postknowledge_retries: 0,
        continuation_opened: false,
      });
      expect(m26ClosureDisposition(s)).toEqual({
        kind: 'invalid',
        detail: 'understanding_failed',
      });
    }

    // pass_first → exit
    {
      const s = disconnectedUplink();

      m26PresentTest(s, 'attempt_1', 4000);
      m26AnswerTest(s, 'not_received', 5000);
      expect(m26Exit(s, 6000)).toBe(true);
      expect(m26RawComponents(s)).toMatchObject({
        knowledge_status: 'pass_first',
        continuation_closure: 'voluntary_stop',
        exited: true,
        postknowledge_retries: 0,
        report_pending_at_close: false, // the window object is still open here
      });
      m26Close(s, 'ended_shift_outside', 7000);
      // The second report was never delivered: on the record, never silent.
      expect(m26RawComponents(s).report_pending_at_close).toBe(true);

      // A Post B transmission in flight at the cap is recorded apart.
      const switching = disconnectedUplink();

      m26PresentTest(switching, 'attempt_1', 4000);
      m26AnswerTest(switching, 'not_received', 5000);
      expect(m26Tick(switching, 5000 + M26_CAP_MS, false, true)).toBe('cap');
      expect(m26RawComponents(switching)).toMatchObject({
        retry_in_progress_at_cap: false,
        switch_in_progress_at_cap: true,
      });

      // A technical failure stops the continuation's clock with the window.
      const aborted = disconnectedUplink();

      m26PresentTest(aborted, 'attempt_1', 4000);
      m26AnswerTest(aborted, 'not_received', 5000);
      m26Abort(aborted, 6000);
      expect(aborted.closed).toBe(true);
      expect(m26ContinuationOpen(aborted)).toBe(false);
      expect(m26ClosureDisposition(s)).toEqual({ kind: 'completed' });
    }

    // never disconnected → missing; untested → invalid
    {
      const s = createM26State();

      m26Enter(s, 0);
      expect(m26ClosureDisposition(s)).toEqual({
        kind: 'missing',
        detail: 'channel_never_disconnected',
      });

      const untested = disconnectedUplink();

      expect(m26ClosureDisposition(untested)).toEqual({
        kind: 'invalid',
        detail: 'understanding_not_tested',
      });
    }
  });

  test('extractors: observed counts with a recount and the sensitivity beside; censored at the cap and the review; understanding_failed, interrupted, no_eligible_event, declined, not_presented / interrupted after a reload, pending; a disagreeing record fails the count but keeps the companion', () => {
    // M24: pass_first, two casts, exit → observed 2, sensitivity 1.
    {
      const s = depletedRig();

      m24PresentTest(s, 'attempt_1', 7000);
      m24AnswerTest(s, 'nothing', 8000);
      m24NoteCycle(s, cast({ post_depletion: true, item_id: null }), 10_000);
      m24NoteCycle(s, cast({ post_depletion: true, item_id: null }), 14_000);
      m24Exit(s, 16_000);
      m24Close(s, 'ended_shift_outside', 20_000);

      const h = harness(M24_FAMILY, M24_OPPORTUNITY_ID);

      h.presented();
      h.opened();
      h.answered(1, true, 'pass_first');
      h.acts('postknowledge_cast', 2);
      h.close(m24RawComponents(s), 'stopped');

      const rows = extractItemFeatures('M24', h.events, CONTEXT);

      expect(rows.map((r) => r.feature_id)).toEqual([
        'm24_postknowledge_casts',
        'm24_postknowledge_casts_minus_first',
        'm24_unqualified_casts',
      ]);
      expect(rows[0]).toMatchObject({
        value: 2,
        numerator: 2,
        disposition: 'observed',
        closure_reason: 'voluntary_stop',
        censored: false,
      });
      expect(rows[0].included_ids).toEqual([
        'm24_postknowledge_cast_1',
        'm24_postknowledge_cast_2',
      ]);
      expect(rows[0].components).toMatchObject({
        pass_kind: 'first',
        exit: true,
        recount_agrees: true,
      });
      expect(rows[1]).toMatchObject({ value: 1, disposition: 'observed' });
      expect(rows[2]).toMatchObject({ disposition: 'observed' });
      expect(rows[2].value).toMatchObject({
        knowledge_status: 'pass_first',
        casts_pre_knowledge: 0,
        exit: true,
        cap: false,
      });
      expect(JSON.stringify(rows)).not.toMatch(/score|resilien|grit|persist/i);

      // A disagreeing record: the count and its sensitivity fail, the
      // companion stays.
      const bad = harness(M24_FAMILY, M24_OPPORTUNITY_ID);

      bad.presented();
      bad.opened();
      bad.answered(1, true, 'pass_first');
      bad.acts('postknowledge_cast', 1);
      bad.close(m24RawComponents(s), 'stopped');

      const badRows = extractItemFeatures('M24', bad.events, CONTEXT);

      expect(badRows[0]).toMatchObject({
        value: null,
        disposition: 'technical_failure',
      });
      expect(badRows[1]).toMatchObject({ disposition: 'technical_failure' });
      expect(badRows[2]).toMatchObject({ disposition: 'observed' });
    }

    // M24: the cap censors the count (its value kept); the review too.
    {
      const s = depletedRig();

      m24PresentTest(s, 'attempt_1', 7000);
      m24AnswerTest(s, 'nothing', 8000);
      m24NoteCycle(s, cast({ post_depletion: true, item_id: null }), 10_000);
      m24Tick(s, 8000 + M24_CAP_MS, false);

      const h = harness(M24_FAMILY, M24_OPPORTUNITY_ID);

      h.presented();
      h.opened();
      h.answered(1, true, 'pass_first');
      h.acts('postknowledge_cast', 1);
      h.close(m24RawComponents(s), 'completed');
      expect(extractItemFeatures('M24', h.events, CONTEXT)[0]).toMatchObject({
        value: 1,
        disposition: 'observed',
        closure_reason: 'cap',
        censored: true,
        censor_reason: 'focused cap reached',
      });

      const review = depletedRig();

      m24PresentTest(review, 'attempt_1', 7000);
      m24AnswerTest(review, 'nothing', 8000);
      m24Close(review, 'closed_at_review', 9000);

      const r = harness(M24_FAMILY, M24_OPPORTUNITY_ID);

      r.presented();
      r.opened();
      r.answered(1, true, 'pass_first');
      r.close(m24RawComponents(review), 'closed_at_review', true);
      expect(extractItemFeatures('M24', r.events, CONTEXT)[0]).toMatchObject({
        value: 0,
        disposition: 'observed',
        closure_reason: 'closed_at_review',
        censored: true,
      });
    }

    // M24: fail → understanding_failed (companion observed with the casts after the fail).
    {
      const s = depletedRig();

      m24PresentTest(s, 'attempt_1', 7000);
      m24AnswerTest(s, 'next_piece', 8000);
      m24PresentTest(s, 'explanation', 8100);
      m24Explained(s, 9000);
      m24PresentTest(s, 'attempt_2', 9100);
      m24AnswerTest(s, 'depends_timing', 10_000);
      m24NoteCycle(s, cast({ post_depletion: true, item_id: null }), 11_000);
      m24Close(s, 'ended_shift_outside', 12_000);

      const h = harness(M24_FAMILY, M24_OPPORTUNITY_ID);

      h.presented();
      h.opened();
      h.answered(1, false, 'unknown');
      h.answered(2, false, 'fail');
      h.close(
        { ...m24RawComponents(s), invalid_detail: 'understanding_failed' },
        'departed',
        true,
      );

      const rows = extractItemFeatures('M24', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: null,
        disposition: 'understanding_failed',
        censored: false,
      });
      expect(rows[1]).toMatchObject({ disposition: 'understanding_failed' });
      expect(rows[2]).toMatchObject({ disposition: 'observed' });
      expect(rows[2].value).toMatchObject({
        knowledge_status: 'fail',
        casts_after_fail: 1,
        explanation_shown: true,
      });
    }

    // M24: untested → interrupted; never depleted → no_eligible_event.
    {
      const untested = depletedRig();

      m24Close(untested, 'ended_shift_outside', 9000);

      const h = harness(M24_FAMILY, M24_OPPORTUNITY_ID);

      h.presented();
      h.opened();
      h.close(
        {
          ...m24RawComponents(untested),
          invalid_detail: 'understanding_not_tested',
        },
        'departed',
        true,
      );
      const untestedRows = extractItemFeatures('M24', h.events, CONTEXT);

      expect(untestedRows[0]).toMatchObject({
        value: null,
        disposition: 'interrupted',
        censored: true,
        closure_reason: 'route_departure', // never "completed"
      });
      expect(untestedRows[0].components).toMatchObject({
        boundary: 'untested',
        window_detail: 'understanding_not_tested',
      });
      expect(untestedRows[1].components).toMatchObject({
        boundary: 'untested',
      });

      // A check left part-way (first answer wrong, recheck never taken).
      const partial = depletedRig();

      m24PresentTest(partial, 'attempt_1', 7000);
      m24AnswerTest(partial, 'next_piece', 8000);
      m24Close(partial, 'ended_shift_outside', 9000);

      const p = harness(M24_FAMILY, M24_OPPORTUNITY_ID);

      p.presented();
      p.opened();
      p.answered(1, false, 'unknown');
      p.close(
        {
          ...m24RawComponents(partial),
          invalid_detail: 'understanding_not_tested',
        },
        'departed',
        true,
      );
      expect(
        extractItemFeatures('M24', p.events, CONTEXT)[0].components,
      ).toMatchObject({ boundary: 'check_incomplete' });

      // A check record that disagrees with its events fails all three rows.
      const d = harness(M24_FAMILY, M24_OPPORTUNITY_ID);

      d.presented();
      d.opened();
      d.close(
        {
          ...m24RawComponents(partial),
          invalid_detail: 'understanding_not_tested',
        },
        'departed',
        true,
      );
      expect(
        extractItemFeatures('M24', d.events, CONTEXT).map((r) => r.disposition),
      ).toEqual([
        'technical_failure',
        'technical_failure',
        'technical_failure',
      ]);

      const fresh = createM24State('deck_form_A');

      m24Enter(fresh, 0, 0);
      m24NoteCycle(fresh, cast(), 1000);
      m24Close(fresh, 'ended_shift_outside', 2000);

      const n = harness(M24_FAMILY, M24_OPPORTUNITY_ID);

      n.presented();
      n.opened();
      n.close(
        { ...m24RawComponents(fresh), invalid_detail: 'deck_never_depleted' },
        'departed',
        true,
      );
      expect(extractItemFeatures('M24', n.events, CONTEXT)[0]).toMatchObject({
        value: null,
        disposition: 'no_eligible_event',
        censored: true,
        closure_reason: 'route_departure',
      });
    }

    // Presented never opened → declined; nothing → not_presented; reload
    // → interrupted; open → pending; technical failure → all three.
    {
      const h = harness(M24_FAMILY, M24_OPPORTUNITY_ID);

      h.presented();
      expect(extractItemFeatures('M24', h.events, CONTEXT)[0]).toMatchObject({
        disposition: 'declined',
      });
      expect(extractItemFeatures('M24', [], CONTEXT)[0]).toMatchObject({
        disposition: 'not_presented',
      });
      expect(
        extractItemFeatures('M24', [], { ...CONTEXT, reloaded: true })[0],
      ).toMatchObject({ disposition: 'interrupted' });
      h.opened();
      expect(
        extractItemFeatures('M24', h.events, OPEN_CONTEXT).map(
          (r) => r.disposition,
        ),
      ).toEqual(['pending', 'pending', 'pending']);
      h.failed();
      expect(
        extractItemFeatures('M24', h.events, CONTEXT).map((r) => r.disposition),
      ).toEqual([
        'technical_failure',
        'technical_failure',
        'technical_failure',
      ]);
    }

    // M26: pass_after_explanation, three retries incl. the first, the switch, the cap.
    {
      const s = disconnectedUplink();

      m26PresentTest(s, 'attempt_1', 4000);
      m26AnswerTest(s, 'reaches_delayed', 5000);
      m26PresentTest(s, 'explanation', 5100);
      m26Explained(s, 6000);
      m26PresentTest(s, 'attempt_2', 6100);
      m26AnswerTest(s, 'not_received', 7000);
      m26Transmit(s, 'A', 9000);
      m26Transmit(s, 'A', 11_000);
      m26Transmit(s, 'B', 13_000);
      m26Transmit(s, 'A', 15_000);
      m26Tick(s, 7000 + M26_CAP_MS, false);

      const h = harness(M26_FAMILY, M26_OPPORTUNITY_ID);

      h.presented();
      h.opened();
      h.answered(1, false, 'unknown');
      h.answered(2, true, 'pass_after_explanation');
      h.acts('postknowledge_retry', 3);
      h.close(m26RawComponents(s), 'completed');

      const rows = extractItemFeatures('M26', h.events, CONTEXT);

      expect(rows.map((r) => r.feature_id)).toEqual([
        'm26_postknowledge_retries',
        'm26_postknowledge_retries_minus_first',
        'm26_unqualified_retries',
      ]);
      expect(rows[0]).toMatchObject({
        value: 3,
        disposition: 'observed',
        closure_reason: 'cap',
        censored: true,
      });
      expect(rows[0].components).toMatchObject({
        pass_kind: 'after_explanation',
        switch: true,
        retries_after_delivery: 1,
        reports_delivered_at_open: 1,
        switch_in_progress_at_cap: false,
      });
      expect(rows[1]).toMatchObject({ value: 2, disposition: 'observed' });
      expect(rows[2].value).toMatchObject({
        knowledge_status: 'pass_after_explanation',
        pre_knowledge_attempts: 0,
        switch: true,
        cap: true,
      });
    }

    // M26: never disconnected → no_eligible_event; untested → interrupted.
    {
      const s = createM26State();

      m26Enter(s, 0);
      m26Close(s, 'ended_shift_outside', 1000);

      const h = harness(M26_FAMILY, M26_OPPORTUNITY_ID);

      h.presented();
      h.opened();
      h.close(
        {
          ...m26RawComponents(s),
          invalid_detail: 'channel_never_disconnected',
        },
        'departed',
        true,
      );
      expect(extractItemFeatures('M26', h.events, CONTEXT)[0]).toMatchObject({
        value: null,
        disposition: 'no_eligible_event',
      });

      const untested = disconnectedUplink();

      m26Close(untested, 'ended_shift_outside', 4000);

      const u = harness(M26_FAMILY, M26_OPPORTUNITY_ID);

      u.presented();
      u.opened();
      u.close(
        {
          ...m26RawComponents(untested),
          invalid_detail: 'understanding_not_tested',
        },
        'departed',
        true,
      );
      expect(extractItemFeatures('M26', u.events, CONTEXT)[0]).toMatchObject({
        value: null,
        disposition: 'interrupted',
      });
    }
  });
});
