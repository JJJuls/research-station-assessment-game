/**
 * Station 080 M21 — two independent manual cases with truthful feedback,
 * relevant restudy and revised applications (Unit 10), pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row; the
 * two case definitions (different rules, matched load, the manual's total
 * word budget, no answer stated for a plate code); the restudy-relevance
 * mapping; the extractor over the raw family — restudy-and-revise / 1 of
 * 1 incorrect first application; two first-time successes ⇒ null
 * (`no_eligible_event`, never a zero); an exit after a failure ⇒ observed
 * 0/1; a review-closed unresolved failure ⇒ censored and excluded; both
 * cases eligible ⇒ 2 of 2; declined ≠ not presented ≠ interrupted ≠
 * pending; a disagreeing case record ⇒ technical failure. The engine's
 * transactions are covered by `pilot_return_models` test 9.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { registerEntry } from '../src/measurement/registerV3';
import {
  createM21CaseState,
  M21_CASE_DEFS,
  M21_CASES,
  M21_FAMILY,
  M21_OPPORTUNITY_IDS,
  M21_RELEVANT_SECTIONS,
  M21_SECTIONS,
  m21Apply,
  m21CanApply,
  type M21Case,
  type M21CaseState,
  m21Close,
  m21Consult,
  m21Enter,
  m21InspectPlate,
  m21ManualWordCount,
  m21RawComponents,
  m21SetPost,
  m21SetSelector,
} from '../src/pilot/return/m21ManualModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };

/** A captured event stream shaped like the adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    caseId: M21Case,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: 'records_workshop',
      event_type: `${M21_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: M21_OPPORTUNITY_IDS[caseId],
        case: caseId,
        ...metadata,
      },
    });
  };

  return {
    events,
    presented: (caseId: M21Case) =>
      push(caseId, 'presented', { input_mode: 'system' }),
    opened: (caseId: M21Case) =>
      push(caseId, 'opportunity_opened', { input_mode: 'system' }),
    applied: (s: M21CaseState) => {
      const last = s.applications[s.applications.length - 1];

      push(s.case, 'applied', { ...last, input_mode: 'pointer' });
    },
    consulted: (s: M21CaseState, section: string) => {
      push(s.case, 'section_consulted', {
        section,
        via: 'tab',
        after_application: s.applications.length,
        input_mode: 'pointer',
      });
    },
    close: (
      s: M21CaseState,
      exit: 'completed' | 'stopped' | 'closed_at_review',
    ) =>
      push(s.case, 'window_closed', {
        exit_state: exit,
        [exit === 'closed_at_review'
          ? 'raw_components_partial'
          : 'raw_components']: m21RawComponents(s),
      }),
    failed: (caseId: M21Case) =>
      push(caseId, 'technical_failure', { detail: 'boom' }),
  };
}

/** A case played to a given strategy, its events pushed. */
function playCase(
  h: ReturnType<typeof harness>,
  caseId: M21Case,
  strategy:
    | 'first_correct'
    | 'restudy_and_revise'
    | 'revise_without_relevant_restudy'
    | 'exit'
    | 'unresolved'
    | 'restudy_then_review',
  form: 'form_a' | 'form_b' = 'form_a',
): M21CaseState {
  const s = createM21CaseState(caseId, form);
  const def = M21_CASE_DEFS[caseId];
  const spec = def.forms[form];
  const wrong = def.posts.find((post) => !spec.correct_posts.includes(post))!;
  const correct = (at: number) => {
    for (const post of def.posts) {
      if (s.posts[post] !== spec.correct_posts.includes(post)) {
        m21SetPost(s, post, spec.correct_posts.includes(post), at);
      }
    }

    if (s.selector !== spec.correct_selector) {
      m21SetSelector(s, spec.correct_selector, at);
    }
  };

  h.presented(caseId);
  h.opened(caseId);
  m21Enter(s, 100);
  m21InspectPlate(s, 150);

  if (strategy === 'first_correct') {
    correct(200);
    m21Apply(s, 300);
    h.applied(s);
    m21Close(s, 'accepted', 400);
    h.close(s, 'completed');

    return s;
  }

  m21SetPost(s, wrong, true, 200);
  m21Apply(s, 300);
  h.applied(s);

  if (strategy === 'restudy_and_revise') {
    m21Consult(s, 's4_code_table', 'tab', 400);
    h.consulted(s, 's4_code_table');
    correct(500);
    m21Apply(s, 600);
    h.applied(s);
    m21Close(s, 'accepted', 700);
    h.close(s, 'completed');
  } else if (strategy === 'revise_without_relevant_restudy') {
    correct(500);
    m21Apply(s, 600);
    h.applied(s);
    m21Close(s, 'accepted', 700);
    h.close(s, 'completed');
  } else if (strategy === 'restudy_then_review') {
    // Relevant restudy and a revised (still failing) application observed,
    // then the review closes the case: the numerator fact stands.
    m21Consult(s, 's4_code_table', 'tab', 400);
    h.consulted(s, 's4_code_table');
    m21SetSelector(
      s,
      def.selector_positions.find((p) => p !== s.selector)!,
      450,
    );
    m21Apply(s, 500);
    h.applied(s);
    m21Close(s, 'closed_at_review', 600);
    h.close(s, 'closed_at_review');
  } else if (strategy === 'exit') {
    m21Close(s, 'set_aside', 500);
    h.close(s, 'stopped');
  } else {
    m21Consult(s, 's2_post_rule', 'tab', 400);
    h.consulted(s, 's2_post_rule');
    m21Close(s, 'closed_at_review', 500);
    h.close(s, 'closed_at_review');
  }

  return s;
}

test.describe('M21 two-case manual repair (pure)', () => {
  test('register row: v3 route with two return-shift windows and one conditional fraction; two cases with different rules, matched load and a 240–320-word manual', () => {
    const entry = registerEntry('M21');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m21_case_o1',
      'proto_m21_case_o2',
    ]);
    expect(entry.route.windows.map((w) => [w.id, w.zone, w.episode])).toEqual([
      ['m21_case_o1', 'records_workshop', 5],
      ['m21_case_o2', 'records_workshop', 5],
    ]);
    expect(entry.route.family_prefixes).toEqual(['proto_m21_case_']);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.features.map((f) => [f.feature_id, f.kind, f.role])).toEqual([
      ['m21_restudy_revisions', 'fraction', 'primary'],
    ]);
    expect(entry.features[0].denominator_kind).toBe('conditional_eligibility');

    let words = 0;

    for (const caseId of M21_CASES) {
      const def = M21_CASE_DEFS[caseId];

      words += m21ManualWordCount(def);
      expect(def.posts.length).toBeGreaterThanOrEqual(2);
      expect(def.selector_positions).toContain(def.initial_selector);

      for (const form of ['form_a', 'form_b'] as const) {
        const spec = def.forms[form];

        expect(spec.correct_selector).not.toBe(def.initial_selector);
        expect(
          spec.correct_posts.every((post) => def.posts.includes(post)),
        ).toBe(true);
        expect(def.selector_positions).toContain(spec.correct_selector);
      }

      for (const section of M21_SECTIONS) {
        expect(def.manual_text[section].length).toBeGreaterThan(0);
        expect(def.manual_diagram[section].length).toBeGreaterThan(0);
      }
    }

    expect(words).toBeGreaterThanOrEqual(240);
    expect(words).toBeLessThanOrEqual(320);
    // Different rules: no shared post id, selector id or plate prefix.
    expect(
      M21_CASE_DEFS.o1.posts.some((post) =>
        M21_CASE_DEFS.o2.posts.includes(post),
      ),
    ).toBe(false);
    expect(
      M21_CASE_DEFS.o1.selector_positions.some((position) =>
        M21_CASE_DEFS.o2.selector_positions.includes(position),
      ),
    ).toBe(false);
    expect(M21_RELEVANT_SECTIONS.posts).toEqual([
      's2_post_rule',
      's4_code_table',
    ]);
    expect(M21_RELEVANT_SECTIONS.selector).toEqual(['s3_selector_rule']);
  });

  test('extractor: restudy-and-revise counts 1 of 1; two first-time successes are null (no_eligible_event); an exit after a failure is 0 of 1; a review-closed failure is censored; two eligible cases sum to 2 of 2; declined ≠ not presented ≠ interrupted ≠ pending; a disagreeing record fails the row', () => {
    // Unit 1 wrong first → relevant restudy → revised (accepted); unit 2 first correct.
    {
      const h = harness();

      playCase(h, 'o1', 'restudy_and_revise');
      playCase(h, 'o2', 'first_correct');

      const rows = extractItemFeatures('M21', h.events, CONTEXT);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        feature_id: 'm21_restudy_revisions',
        value: 1,
        numerator: 1,
        denominator: 1,
        disposition: 'observed',
        censored: false,
        closure_reason: 'completed',
        independence: 'repeated_within_episode',
      });
      expect(rows[0].included_ids).toEqual(['m21_case_o1']);
      expect(rows[0].components).toMatchObject({
        first_time_successes: 1,
        strategies: { o1: 'restudy_and_revise', o2: 'first_correct' },
      });
      expect(JSON.stringify(rows)).not.toMatch(/score|persist|grit/i);
    }

    // Two first-time successes: no failure-conditioned score.
    {
      const h = harness();

      playCase(h, 'o1', 'first_correct');
      playCase(h, 'o2', 'first_correct', 'form_b');

      const rows = extractItemFeatures('M21', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: null,
        disposition: 'no_eligible_event',
      });
      expect(rows[0].missing_reason).toContain('first-time successes');
    }

    // Exit after a failure: an observed 0 of 1; revision without a relevant restudy: 0 of 1.
    {
      const h = harness();

      playCase(h, 'o1', 'exit');
      playCase(h, 'o2', 'revise_without_relevant_restudy');

      const rows = extractItemFeatures('M21', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: 0,
        numerator: 0,
        denominator: 2,
        disposition: 'observed',
      });
      expect(rows[0].components).toMatchObject({
        strategies: { o1: 'exit', o2: 'revise_without_relevant_restudy' },
      });
    }

    // A review-closed case whose relevant restudy and revised application
    // were already observed keeps its 1 (S-F2); the plate gate refuses a
    // blind FIT (S-F1).
    {
      const h = harness();

      playCase(h, 'o1', 'restudy_then_review');

      const rows = extractItemFeatures('M21', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: 1,
        denominator: 1,
        disposition: 'observed',
        censored: false,
        closure_reason: 'closed_at_review',
      });

      const blind = createM21CaseState('o1', 'form_a');

      m21Enter(blind, 0);
      expect(m21CanApply(blind)).toBe('plate_not_inspected');
      expect(m21Apply(blind, 10)).toBeNull();
      expect(blind.applications).toHaveLength(0);
      expect(blind.invalid_actions).toBe(1);
      m21InspectPlate(blind, 20);
      expect(m21CanApply(blind)).toBe('ok');
    }

    // Both cases restudied and revised: 2 of 2.
    {
      const h = harness();

      playCase(h, 'o1', 'restudy_and_revise');
      playCase(h, 'o2', 'restudy_and_revise', 'form_b');

      const rows = extractItemFeatures('M21', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({ value: 2, numerator: 2, denominator: 2 });
    }

    // A failure the review closed before any resolution: censored, excluded;
    // with no other eligible case the row is null (interrupted).
    {
      const h = harness();

      playCase(h, 'o1', 'unresolved');

      const rows = extractItemFeatures('M21', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: null,
        disposition: 'interrupted',
        censored: true,
        closure_reason: 'closed_at_review',
      });
      expect(rows[0].components).toMatchObject({ censored_cases: ['o1'] });
    }

    // One resolved and one review-censored: 1 of 1, censored flagged.
    {
      const h = harness();

      playCase(h, 'o1', 'restudy_and_revise');
      playCase(h, 'o2', 'unresolved');

      const rows = extractItemFeatures('M21', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: 1,
        denominator: 1,
        disposition: 'observed',
        censored: true,
      });
    }

    // Presented and never opened: declined. Never presented: not_presented;
    // after a reload: interrupted. Open with a failure and no closure: pending.
    {
      const h = harness();

      h.presented('o1');
      h.presented('o2');
      expect(extractItemFeatures('M21', h.events, CONTEXT)[0]).toMatchObject({
        value: null,
        disposition: 'declined',
      });
      expect(extractItemFeatures('M21', [], CONTEXT)[0]).toMatchObject({
        value: null,
        disposition: 'not_presented',
      });
      expect(
        extractItemFeatures('M21', [], { ...CONTEXT, reloaded: true })[0],
      ).toMatchObject({ disposition: 'interrupted' });

      const open = harness();
      const s = createM21CaseState('o1', 'form_a');

      open.presented('o1');
      open.opened('o1');
      m21Enter(s, 100);
      m21SetPost(s, 'J2', true, 200);
      m21Apply(s, 300);
      open.applied(s);
      expect(
        extractItemFeatures('M21', open.events, OPEN_CONTEXT)[0],
      ).toMatchObject({ value: null, disposition: 'pending' });
    }

    // A case record that disagrees with the applied events fails the row.
    {
      const h = harness();
      const s = playCase(h, 'o1', 'restudy_and_revise');

      void s;

      const closedEvent = h.events.find(
        (e) => e.event_type === `${M21_FAMILY}window_closed`,
      )!;
      const raw = closedEvent.metadata!.raw_components as Record<
        string,
        unknown
      >;

      raw.first_application_correct = true;

      const rows = extractItemFeatures('M21', h.events, CONTEXT);

      expect(rows[0].disposition).toBe('technical_failure');
    }

    // Technical failure closes the row.
    {
      const h = harness();

      h.presented('o1');
      h.opened('o1');
      h.failed('o1');
      expect(extractItemFeatures('M21', h.events, CONTEXT)[0].disposition).toBe(
        'technical_failure',
      );
    }
  });
});
