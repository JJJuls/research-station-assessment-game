/**
 * Pure proof (no browser): an absent measurement can never be exported as
 * an observed zero. `applySummaryScope` masks the scoring-plan summary at
 * the export boundary only; `computeSummary` itself is untouched.
 */
import { expect, test } from '@playwright/test';

import { computeSummary } from '../src/systems/ScoringManager';
import {
  applySummaryScope,
  familyOf,
  scopedSummaryForUrl,
  type SummaryScope,
} from '../src/systems/SummaryScope';

const PILOT: SummaryScope = {
  id: 'pilot_route_v1',
  applicable: ['session', 'dock_control'],
};

const summaryOf = (types: string[]) =>
  computeSummary({
    metadata: {
      participant_id: 'P',
      game_session_id: 'S',
      condition: 'test',
      game_version: 'v',
    } as never,
    elapsed_seconds: 10,
    completed: true,
    events: types.map((event_type) => ({ event_type })) as never,
    data_quality: undefined as never,
  });

test.describe('summary scope (pure)', () => {
  test('pilot scope, no events: 43 legacy fields are null / not_applicable, none numeric', () => {
    const scoped = applySummaryScope({
      summary: summaryOf([]),
      scope: PILOT,
      eventTypes: [],
      terminal: true,
      reloaded: false,
    });
    const notApplicable = Object.entries(scoped.summary_dispositions).filter(
      ([, d]) => d === 'not_applicable',
    );

    expect(notApplicable).toHaveLength(43);

    for (const [field, disposition] of Object.entries(
      scoped.summary_dispositions,
    )) {
      if (disposition !== 'observed') {
        expect(scoped.summary[field], field).toBeNull();
      }
    }

    // The never-offered Dock check-in is no_opportunity, not a false/0.
    expect(scoped.summary_dispositions.control_tutorial_count).toBe(
      'no_opportunity',
    );
    expect(scoped.summary.control_tutorial_completed).toBeNull();
    expect(scoped.summary.game_inappropriate_persistence).toBeNull();
    expect(scoped.summary_scope).toBe('pilot_route_v1');
  });

  test('dispositions: observed, censored, pending, interrupted', () => {
    const run = (types: string[], terminal: boolean, reloaded = false) =>
      applySummaryScope({
        summary: summaryOf(types),
        scope: PILOT,
        eventTypes: types,
        terminal,
        reloaded,
      });

    const skipped = run(
      ['dock_tutorial_opened', 'dock_tutorial_skipped'],
      true,
    );

    expect(skipped.summary_dispositions.control_tutorial_skipped).toBe(
      'observed',
    );
    expect(skipped.summary.control_tutorial_skipped).toBe(true);
    // A resolved check-in makes "not practised" a real observation.
    expect(skipped.summary.control_movement_practiced).toBe(false);

    expect(
      run(['dock_tutorial_opened'], true).summary_dispositions
        .control_tutorial_count,
    ).toBe('censored');
    expect(run([], false).summary_dispositions.control_tutorial_count).toBe(
      'pending',
    );
    expect(
      run([], true, true).summary_dispositions.control_tutorial_count,
    ).toBe('interrupted');
  });

  test('no scope (legacy / developer route): byte-identical to computeSummary', () => {
    const summary = summaryOf(['dock_tutorial_completed']);
    const scoped = applySummaryScope({
      summary,
      scope: null,
      eventTypes: [],
      terminal: true,
      reloaded: false,
    });

    expect(scoped.summary).toEqual(summary);
    expect(scoped.summary_scope).toBe('legacy_full');
    expect(new Set(Object.values(scoped.summary_dispositions))).toEqual(
      new Set(['observed']),
    );
  });

  test('return URL: a non-observed field carries its disposition word, never a number or "null"', () => {
    const url = scopedSummaryForUrl(
      applySummaryScope({
        summary: summaryOf([]),
        scope: PILOT,
        eventTypes: [],
        terminal: true,
        reloaded: false,
      }),
    );

    expect(url.game_inappropriate_persistence).toBe('not_applicable');
    expect(url.completed).toBe(true);
    expect(Object.values(url)).not.toContain(null);
    expect(Object.values(url).map(String)).not.toContain('null');
  });

  test('every summary field maps to a family; unknown fields are never session-observed', () => {
    for (const field of Object.keys(summaryOf([]))) {
      expect(familyOf(field), field).toBeTruthy();
    }

    expect(familyOf('some_future_trait_score')).not.toBe('session');
  });
});
