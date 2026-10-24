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
import {
  classifyM21Reload,
  m21PriorLoadCheck,
} from '../src/measurement/features/m21';
import { registerEntry } from '../src/measurement/registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  RELOAD_HOLD_BACK_PREFIX,
  type ReloadEvent,
} from '../src/measurement/reloadCheck';
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

/* ------------------------------------------------------------------ *
 * U24 RL-3 — the reload check for the bench's two cases (pure)
 *
 * Expected values come from RELOAD-CORRECTION-SPEC-r3-exec.md §2 (classes
 * and permission), §5 "M21" (the after column, owner decision D-2 (i)) and
 * §8 (fixtures F-A to F-E), and r1 §1's stage map (stage 1 `presented`,
 * stage 3 `opportunity_opened`); the records are computed by RL-0's helper
 * with that map written here, independently of the extractor's own map.
 * ------------------------------------------------------------------ */

const RL3_CONTINUOUS = {
  first_sequence: 1,
  sequence_gap_count: 0,
  sequence_duplicate_count: 0,
  recovered_from_chunks: false,
};
const RL3_GAP = { ...RL3_CONTINUOUS, sequence_gap_count: 1 };
const RL3_DETAIL = {
  H: `${RELOAD_HOLD_BACK_PREFIX.H}: bench unit not re-run`,
  U: `${RELOAD_HOLD_BACK_PREFIX.U}: bench unit not administered`,
  M: `${RELOAD_HOLD_BACK_PREFIX.M}: bench unit not administered`,
} as const;
const caseOfEvent = (event: ReloadEvent) =>
  event.metadata?.case ?? event.metadata?.occasion;
const RL3_STAGES = Object.fromEntries(
  M21_CASES.map((id) => [
    id,
    {
      briefing: (event: ReloadEvent) =>
        event.event_type === `${M21_FAMILY}presented` &&
        caseOfEvent(event) === id,
      opening: (event: ReloadEvent) =>
        event.event_type === `${M21_FAMILY}opportunity_opened` &&
        caseOfEvent(event) === id,
      holdBack: (event: ReloadEvent) =>
        event.event_type === `${M21_FAMILY}technical_failure` &&
        caseOfEvent(event) === id,
    },
  ]),
);

type Rl3Strategy = Parameters<typeof playCase>[2];
/** What one case does in a load: nothing, presented only, a played strategy. */
type Rl3Step = 'none' | 'presented' | Rl3Strategy;

function rl3Number(
  events: readonly RawGameEvent[],
  load: number,
  from: number,
): RawGameEvent[] {
  return events.map((event, i) => ({
    ...event,
    page_load_index: load,
    sequence: from + i,
  }));
}

/** One earlier page load built from per-case steps, renumbered. */
function rl3Prior(
  load: number,
  from: number,
  steps: Partial<Record<M21Case, Rl3Step | 'H' | 'U' | 'M'>>,
): RawGameEvent[] {
  const h = harness();

  h.events.push({
    session_id: 's',
    timestamp_ms: 0,
    scene: 'dock',
    event_type: 'session_start',
    metadata: {},
  });

  for (const id of M21_CASES) {
    const step = steps[id] ?? 'none';

    if (step === 'H' || step === 'U' || step === 'M') {
      h.presented(id);
      h.events.push({
        session_id: 's',
        timestamp_ms: 0,
        scene: 'records_workshop',
        event_type: `${M21_FAMILY}technical_failure`,
        metadata: { occasion: id, detail: RL3_DETAIL[step] },
      });
    } else if (step === 'presented') {
      h.presented(id);
    } else if (step !== 'none') {
      playCase(h, id, step);
    }
  }

  return rl3Number(h.events, load, from);
}

function rl3Record(
  pageLoadIndex: number,
  prior: readonly RawGameEvent[],
  integrity = RL3_CONTINUOUS,
) {
  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents: prior,
    integrity,
    occasions: RL3_STAGES,
  }) as unknown as Record<string, unknown>;
}

function rl3CheckEvent(record: object, load: number): RawGameEvent {
  return {
    session_id: 's',
    timestamp_ms: 0,
    scene: 'records_workshop',
    event_type: `${M21_FAMILY}prior_load_checked`,
    page_load_index: load,
    metadata: {
      opportunity_id: M21_OPPORTUNITY_IDS.o1,
      occasion: 'o1',
      ...record,
      input_mode: 'system',
    },
  };
}

/**
 * A reloaded load as the runtime writes it: the record (or `records`, to
 * inject defects) at the return shift's presentation, both cases
 * presented, a case that is not A held there (never opened), and each A
 * case's step.
 */
function rl3Load(
  prior: RawGameEvent[],
  steps: Record<M21Case, Rl3Step>,
  options: {
    integrity?: typeof RL3_CONTINUOUS;
    pageLoadIndex?: number;
    records?: (record: Record<string, unknown>) => object[];
    presentation?: boolean;
  } = {},
) {
  const pageLoadIndex = options.pageLoadIndex ?? 2;
  const record = rl3Record(pageLoadIndex, prior, options.integrity);
  const records = options.records?.(record) ?? [record];
  const reload = classifyReload({
    pageLoadIndex,
    checks: records,
    occasions: M21_CASES,
  });
  const h = harness();

  for (const id of M21_CASES) {
    const cls = reload.occasions[id].class;

    if (options.presentation === false) {
      continue;
    }

    if (cls !== 'A') {
      h.presented(id);
      h.events.push({
        session_id: 's',
        timestamp_ms: 0,
        scene: 'records_workshop',
        event_type: `${M21_FAMILY}technical_failure`,
        metadata: { occasion: id, detail: RL3_DETAIL[cls ?? 'U'] },
      });
    } else if (steps[id] === 'presented') {
      h.presented(id);
    } else if (steps[id] !== 'none') {
      playCase(h, id, steps[id] as Rl3Strategy);
    }
  }

  const from = (prior.at(-1)?.sequence ?? 0) + 1;
  const current = rl3Number(
    [...records.map((r) => rl3CheckEvent(r, pageLoadIndex)), ...h.events],
    pageLoadIndex,
    from,
  );
  const rows = extractItemFeatures('M21', [...prior, ...current], {
    finalCoreClosed: true,
    pageLoadIndex,
    reloaded: true,
  });

  return { record, reload, row: rows[0], current };
}

const rl3Permit = (reload: ReturnType<typeof classifyReload>) =>
  M21_CASES.map((id) => [
    id,
    reload.occasions[id].class,
    reload.occasions[id].administration_permitted,
  ]);

test.describe('M21 the reload check (U24 RL-3, pure)', () => {
  test('the extractor’s stage map is r1 §1’s (the same record for every history); a first load writes none; the same classes', () => {
    const histories = [
      rl3Prior(1, 1, { o1: 'restudy_and_revise', o2: 'presented' }),
      rl3Prior(1, 1, { o1: 'presented', o2: 'presented' }),
      rl3Prior(1, 1, { o1: 'U' }),
      rl3Prior(1, 1, {}),
    ];

    for (const prior of histories) {
      expect(m21PriorLoadCheck(2, prior, RL3_CONTINUOUS)).toEqual(
        rl3Record(2, prior),
      );
      expect(m21PriorLoadCheck(2, prior, RL3_GAP)).toEqual(
        rl3Record(2, prior, RL3_GAP),
      );
      expect(classifyM21Reload(2, [rl3Record(2, prior)])).toEqual(
        classifyReload({
          pageLoadIndex: 2,
          checks: [rl3Record(2, prior)],
          occasions: M21_CASES,
        }),
      );
    }

    expect(m21PriorLoadCheck(1, [], RL3_CONTINUOUS)).toBeNull();
    // A first load's readings are unchanged (no check, no class).
    const h = harness();

    playCase(h, 'o1', 'restudy_and_revise');
    playCase(h, 'o2', 'first_correct');
    expect(extractItemFeatures('M21', h.events, CONTEXT)[0]).toMatchObject({
      disposition: 'observed',
      value: 1,
      numerator: 1,
      denominator: 1,
    });
  });

  test('r3 §5 M21, A (established absence): OBS-inc + OBS-inc, OBS-inc + OBS-ok, OBS-ok + DEC, DEC + DEC and NOP + NOP take the first-load readings', () => {
    const prior = rl3Prior(1, 1, {});
    const both = rl3Load(prior, {
      o1: 'restudy_and_revise',
      o2: 'exit',
    });

    expect(rl3Permit(both.reload)).toEqual([
      ['o1', 'A', true],
      ['o2', 'A', true],
    ]);
    expect(both.row).toMatchObject({
      disposition: 'observed',
      value: 1,
      numerator: 1,
      denominator: 2,
    });
    expect(
      rl3Load(prior, { o1: 'restudy_and_revise', o2: 'first_correct' }).row,
    ).toMatchObject({
      disposition: 'observed',
      value: 1,
      numerator: 1,
      denominator: 1,
    });
    expect(
      rl3Load(prior, { o1: 'first_correct', o2: 'presented' }).row,
    ).toMatchObject({
      disposition: 'no_eligible_event',
      value: null,
      numerator: null,
      denominator: 0,
    });
    expect(
      rl3Load(prior, { o1: 'presented', o2: 'presented' }).row,
    ).toMatchObject({
      disposition: 'declined',
      value: null,
      numerator: null,
      denominator: null,
    });
    // NOP + NOP (A): the record without a presentation in the load.
    expect(
      rl3Load(prior, { o1: 'none', o2: 'none' }, { presentation: false }).row,
    ).toMatchObject({
      disposition: 'not_presented',
      value: null,
      numerator: null,
      denominator: null,
    });
  });

  test('r3 §5 M21 under D-2 (i): a held case beside an observed incorrect case reads interrupted · x · x/1 (overriding observed); beside a first-time success null / 0; beside a declined or held case null / null; never a zero; F-E: an H case leaves its sibling A, administered and observed', () => {
    // o1 opened in load 1 (H); o2 never opened (A).
    const prior = rl3Prior(1, 1, { o1: 'exit', o2: 'presented' });
    const inc = rl3Load(prior, { o1: 'none', o2: 'restudy_and_revise' });

    expect(rl3Permit(inc.reload)).toEqual([
      ['o1', 'H', false],
      ['o2', 'A', true],
    ]);
    expect(inc.row).toMatchObject({
      disposition: 'interrupted',
      value: 1,
      numerator: 1,
      denominator: 1,
    });
    expect(inc.row.included_ids).toEqual(['m21_case_o2']);
    expect(rl3Load(prior, { o1: 'none', o2: 'exit' }).row).toMatchObject({
      disposition: 'interrupted',
      value: 0,
      numerator: 0,
      denominator: 1,
    });
    expect(
      rl3Load(prior, { o1: 'none', o2: 'first_correct' }).row,
    ).toMatchObject({
      disposition: 'interrupted',
      value: null,
      numerator: null,
      denominator: 0,
    });

    const dec = rl3Load(prior, { o1: 'none', o2: 'presented' });

    expect(dec.row).toMatchObject({
      disposition: 'interrupted',
      value: null,
      numerator: null,
      denominator: null,
      missing_reason:
        'bench case opened in an earlier page load; not re-run after the reload',
    });

    // HB + HB: both cases opened earlier.
    const both = rl3Load(rl3Prior(1, 1, { o1: 'exit', o2: 'exit' }), {
      o1: 'none',
      o2: 'none',
    });

    expect(rl3Permit(both.reload)).toEqual([
      ['o1', 'H', false],
      ['o2', 'H', false],
    ]);
    expect(both.row).toMatchObject({
      disposition: 'interrupted',
      value: null,
      numerator: null,
      denominator: null,
    });
  });

  test('U (history-level): a discontinuous history holds both cases — nothing administered, interrupted · null · null / null with the unverified reason (U + DEC)', () => {
    const prior = rl3Prior(1, 1, {});
    const u = rl3Load(
      prior,
      { o1: 'restudy_and_revise', o2: 'restudy_and_revise' },
      { integrity: RL3_GAP },
    );

    expect(rl3Permit(u.reload)).toEqual([
      ['o1', 'U', false],
      ['o2', 'U', false],
    ]);
    expect(
      u.current.filter(
        (event) => event.event_type === `${M21_FAMILY}opportunity_opened`,
      ),
    ).toEqual([]);
    expect(u.row).toMatchObject({
      disposition: 'interrupted',
      value: null,
      numerator: null,
      denominator: null,
      missing_reason:
        'bench case not administered after a reload: earlier history not verified',
    });
  });

  test('F-A: two agreeing check records with distinct sequences ⇒ U for both, refused; the U reading', () => {
    const prior = rl3Prior(1, 1, {});
    const fa = rl3Load(
      prior,
      { o1: 'restudy_and_revise', o2: 'first_correct' },
      { records: (record) => [record, { ...record }] },
    );

    expect(fa.reload.check_count).toBe(2);
    expect(fa.reload.check_coherent).toBe(true);
    expect(rl3Permit(fa.reload)).toEqual([
      ['o1', 'U', false],
      ['o2', 'U', false],
    ]);
    expect(fa.row).toMatchObject({
      disposition: 'interrupted',
      value: null,
      denominator: null,
    });
  });

  test('F-B: conflicting duplicate checks ⇒ U, refused, coherence false', () => {
    const prior = rl3Prior(1, 1, {});
    const fb = rl3Load(
      prior,
      { o1: 'restudy_and_revise', o2: 'first_correct' },
      {
        records: (record) => [
          record,
          {
            ...record,
            prior_opening_found: true,
            prior_opening_absence_established: false,
          },
        ],
      },
    );

    expect(fb.reload.check_coherent).toBe(false);
    expect(rl3Permit(fb.reload)).toEqual([
      ['o1', 'U', false],
      ['o2', 'U', false],
    ]);
    expect(fb.row.disposition).toBe('interrupted');
  });

  test('F-C: an earlier U hold of one case, then a continuous history ⇒ that case stays U and refused; F-D: its eligible A sibling is administered and observed — HB(U) + OBS(A) reads interrupted · x · x/1', () => {
    const load1 = rl3Prior(1, 1, {});
    const load2 = rl3Prior(2, load1.length + 1, { o1: 'U', o2: 'presented' });
    const prior = [...load1, ...load2];
    const fc = rl3Load(
      prior,
      { o1: 'none', o2: 'restudy_and_revise' },
      { pageLoadIndex: 3 },
    );

    expect(fc.record.history_continuous).toBe(true);
    expect(rl3Permit(fc.reload)).toEqual([
      ['o1', 'U', false],
      ['o2', 'A', true],
    ]);
    expect(fc.row).toMatchObject({
      disposition: 'interrupted',
      value: 1,
      numerator: 1,
      denominator: 1,
    });
    expect(
      fc.current.some(
        (event) =>
          event.event_type === `${M21_FAMILY}opportunity_opened` &&
          event.metadata?.case === 'o1',
      ),
    ).toBe(false);
  });

  test('M: a self-contradictory record holds both cases (contradictory reason); a malformed record (another load’s index) is a technical failure', () => {
    const prior = rl3Prior(1, 1, {});
    const m = rl3Load(
      prior,
      { o1: 'presented', o2: 'presented' },
      {
        records: (record) => [{ ...record, prior_opening_found: true }],
      },
    );

    expect(rl3Permit(m.reload)).toEqual([
      ['o1', 'M', false],
      ['o2', 'M', false],
    ]);
    expect(m.row).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'bench case not administered after a reload: earlier check contradictory',
    });

    const malformed = rl3Load(
      prior,
      { o1: 'presented', o2: 'presented' },
      { records: (record) => [{ ...record, page_load_index: 7 }] },
    );

    expect(malformed.reload.check_malformed).toBe(true);
    expect(malformed.row.disposition).toBe('technical_failure');
  });

  test('a reload hold-back marker is never a technical failure of the row; any other fault still is (the existing rule)', () => {
    const prior = rl3Prior(1, 1, { o1: 'exit', o2: 'presented' });
    const marked = rl3Load(prior, { o1: 'none', o2: 'exit' });

    expect(marked.row.disposition).toBe('interrupted');

    const h = harness();

    h.presented('o1');
    h.opened('o1');
    h.failed('o1');
    expect(
      extractItemFeatures('M21', rl3Number(h.events, 2, prior.length + 1), {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      })[0].disposition,
    ).toBe('technical_failure');
  });

  test('the record is never task evidence: absent from the supporting sequences', () => {
    const prior = rl3Prior(1, 1, {});
    const a = rl3Load(prior, { o1: 'restudy_and_revise', o2: 'presented' });
    const check = a.current.find(
      (event) => event.event_type === `${M21_FAMILY}prior_load_checked`,
    )!;

    expect(a.row.supporting_sequences).not.toContain(check.sequence);
  });

  test('RL-1C decision A: both cases presented and left unopened in a reloaded load without its check are U (no_check), refused, and read held; a first load keeps declined; a genuinely unreached reloaded load keeps the absentFeature reading', () => {
    const prior = rl3Prior(1, 1, {});
    const h = harness();

    h.presented('o1');
    h.presented('o2');

    const reload = classifyM21Reload(2, []);

    expect(rl3Permit(reload)).toEqual([
      ['o1', 'U', false],
      ['o2', 'U', false],
    ]);
    expect(
      extractItemFeatures(
        'M21',
        [...prior, ...rl3Number(h.events, 2, prior.length + 1)],
        { finalCoreClosed: true, pageLoadIndex: 2, reloaded: true },
      )[0],
    ).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason:
        'bench case not administered after a reload: earlier history not verified',
    });
    expect(extractItemFeatures('M21', h.events, CONTEXT)[0].disposition).toBe(
      'declined',
    );
    expect(
      extractItemFeatures('M21', prior, {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      })[0],
    ).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'no current-load evidence after a reload: relay bench never opened',
    });
  });
});
