/**
 * Station 080 M22 — two setback reports with revision or exit and one
 * discouragement rating per report (Unit 11), pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row and the
 * pinned rating stem / options; the two report definitions (different
 * lines and requirements, shared structure, no answer leaked); the
 * extractor over the raw family — revision on both / 2 of 2; a revision
 * on one and an exit on the other / 1 of 2; one requirement presented ⇒
 * `incomplete` on 1; no requirement presented ⇒ null; a returned report
 * never acknowledged ⇒ excluded (invalid); a returned report left to the
 * review ⇒ censored; the ratings companion observed with recall delays,
 * null when declined or never answered; a disagreeing record ⇒ technical
 * failure. The engine's transactions and the rating rules are covered by
 * `pilot_return_models` test 10.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import {
  classifyM22Reload,
  m22PriorLoadCheck,
} from '../src/measurement/features/m22';
import {
  M22_DISCOURAGEMENT_OPTIONS,
  M22_DISCOURAGEMENT_PROMPT,
} from '../src/measurement/protocol';
import { registerEntry } from '../src/measurement/registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  RELOAD_HOLD_BACK_PREFIX,
  type ReloadEvent,
} from '../src/measurement/reloadCheck';
import {
  createM22RatingsState,
  createM22ReportState,
  M22_ENTRY_STATE_VERSION,
  M22_FAMILY,
  M22_OPPORTUNITY_IDS,
  M22_RATING_SETTLE_MS,
  M22_REPORT_DEFS,
  M22_REPORTS,
  m22Acknowledge,
  m22AttachCode,
  m22CanWithdraw,
  m22Close,
  m22Codes,
  m22Enter,
  m22PlaceLine,
  m22PresentRating,
  m22Rate,
  m22RatingSettling,
  m22RawComponents,
  type M22Report,
  type M22ReportState,
  m22Submit,
} from '../src/pilot/return/m22ReportModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };

/** A captured event stream shaped like the adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    report: M22Report,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: 'records_workshop',
      event_type: `${M22_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: M22_OPPORTUNITY_IDS[report],
        report,
        ...metadata,
      },
    });
  };

  return {
    events,
    push,
    presented: (report: M22Report) =>
      push(report, 'presented', { input_mode: 'system' }),
    opened: (report: M22Report) =>
      push(report, 'opportunity_opened', { input_mode: 'system' }),
    setback: (report: M22Report) =>
      push(report, 'setback_presented', { input_mode: 'system' }),
    acknowledged: (report: M22Report) =>
      push(report, 'setback_acknowledged', { input_mode: 'pointer' }),
    attached: (report: M22Report, code: string) =>
      push(report, 'code_attached', { code, input_mode: 'pointer' }),
    close: (
      s: M22ReportState,
      exit: 'completed' | 'stopped' | 'closed_at_review',
      invalidDetail?: string,
    ) =>
      push(s.report, 'window_closed', {
        exit_state: exit,
        [exit === 'closed_at_review'
          ? 'raw_components_partial'
          : 'raw_components']: m22RawComponents(s),
        ...(invalidDetail === undefined
          ? {}
          : { invalid_detail: invalidDetail }),
      }),
    rated: (report: M22Report, value: number | null, delay: number) =>
      push(report, value === null ? 'rating_declined' : 'rating_answered', {
        value,
        position:
          events.filter((e) => /rating_(answered|declined)$/.test(e.event_type))
            .length + 1,
        recall_delay_ms: delay,
        input_mode: 'keyboard',
      }),
    failed: (report: M22Report) =>
      push(report, 'technical_failure', { detail: 'boom' }),
  };
}

type Play =
  | 'revise_accept'
  | 'revise_withdraw'
  | 'revise_review'
  | 'exit'
  | 'unacknowledged_review'
  | 'acknowledged_review'
  | 'never_submitted';

/** A report played to a given outcome, its events pushed. */
function playReport(
  h: ReturnType<typeof harness>,
  report: M22Report,
  play: Play,
): M22ReportState {
  const s = createM22ReportState(report, 'form_a');
  const def = M22_REPORT_DEFS[report];
  const codes = m22Codes(def);

  h.presented(report);
  h.opened(report);
  m22Enter(s, 100);

  if (play === 'never_submitted') {
    m22Close(s, 'closed_at_review');
    h.close(s, 'closed_at_review');

    return s;
  }

  for (const [slot, line] of def.lines.slice(0, 3).entries()) {
    m22PlaceLine(s, slot, line.id, 200 + slot);
  }

  m22Submit(s, 300);
  h.setback(report);

  if (play === 'unacknowledged_review') {
    m22Close(s, 'closed_at_review');
    h.close(s, 'closed_at_review', 'setback_not_acknowledged');

    return s;
  }

  m22Acknowledge(s, 400);
  h.acknowledged(report);

  if (play === 'exit') {
    m22Close(s, 'withdrawn');
    h.close(s, 'stopped');

    return s;
  }

  if (play === 'acknowledged_review') {
    m22Close(s, 'closed_at_review');
    h.close(s, 'closed_at_review');

    return s;
  }

  for (const [slot, line] of def.lines.slice(0, 3).entries()) {
    void slot;
    m22AttachCode(s, line.id, line.code, 500);
    h.attached(report, line.code);
  }

  void codes;

  if (play === 'revise_accept') {
    m22Submit(s, 600);
    m22Close(s, 'accepted');
    h.close(s, 'completed');
  } else if (play === 'revise_review') {
    m22Close(s, 'closed_at_review');
    h.close(s, 'closed_at_review');
  } else {
    m22Close(s, 'withdrawn');
    h.close(s, 'stopped');
  }

  return s;
}

test.describe('M22 two setback reports (pure)', () => {
  test('register row: v3 route with two return-shift windows, a planned fraction and an ordinal companion; the pinned stem and five options; two report definitions with different requirements and a shared structure', () => {
    const entry = registerEntry('M22');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m22_returned_o1',
      'proto_m22_returned_o2',
    ]);
    expect(entry.route.windows.map((w) => [w.id, w.zone, w.episode])).toEqual([
      ['m22_returned_o1', 'records_workshop', 5],
      ['m22_returned_o2', 'records_workshop', 5],
    ]);
    expect(entry.route.family_prefixes).toEqual(['proto_m22_returned_']);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.features.map((f) => [f.feature_id, f.kind, f.role])).toEqual([
      ['m22_revisions_begun', 'fraction', 'primary'],
      ['m22_discouragement_ratings', 'ordinal', 'companion'],
    ]);
    expect(entry.features[0].planned_denominator).toBe(2);
    expect(M22_DISCOURAGEMENT_PROMPT).toBe(
      'How discouraged did you feel when that new requirement appeared?',
    );
    expect(M22_DISCOURAGEMENT_OPTIONS.map((o) => o.value)).toEqual([
      1, 2, 3, 4, 5,
    ]);

    for (const report of M22_REPORTS) {
      const def = M22_REPORT_DEFS[report];
      const codes = m22Codes(def);

      expect(def.lines.length).toBeGreaterThanOrEqual(def.min_lines + 1);
      expect(new Set(codes).size).toBe(codes.length);
      // The requirement text never states which code goes with which line.
      for (const line of def.lines) {
        expect(def.criterion_text).not.toContain(line.code);
      }
    }

    expect(
      M22_REPORT_DEFS.o1.lines.some((line) =>
        M22_REPORT_DEFS.o2.lines.some((other) => other.id === line.id),
      ),
    ).toBe(false);
    expect(m22Codes(M22_REPORT_DEFS.o1)).not.toEqual(
      m22Codes(M22_REPORT_DEFS.o2),
    );

    // Ratings are never a midpoint when declined.
    const reports = {
      o1: createM22ReportState('o1', 'form_a'),
      o2: createM22ReportState('o2', 'form_a'),
    };
    const ratings = createM22RatingsState();

    for (const report of M22_REPORTS) {
      const s = reports[report];

      m22Enter(s, 0);

      for (const [slot, line] of M22_REPORT_DEFS[report].lines
        .slice(0, 3)
        .entries()) {
        m22PlaceLine(s, slot, line.id, 1 + slot);
      }

      m22Submit(s, 10);
      m22Acknowledge(s, 20);
      m22Close(s, 'withdrawn');
    }

    // Each rating screen is presented once and settles before an answer
    // counts; an answer carries its order and its time since presentation.
    expect(m22RatingSettling(ratings, 'o1', 100)).toBe(true); // not presented yet
    expect(m22PresentRating(reports, ratings, 'o1', 100)).toBe(true);
    expect(m22PresentRating(reports, ratings, 'o1', 200)).toBe(false); // once
    expect(m22PresentRating(reports, ratings, 'o2', 200)).toBe(false); // not due yet (o1 first)
    expect(
      m22RatingSettling(ratings, 'o1', 100 + M22_RATING_SETTLE_MS - 1),
    ).toBe(true);
    expect(m22RatingSettling(ratings, 'o1', 100 + M22_RATING_SETTLE_MS)).toBe(
      false,
    );
    expect(m22Rate(reports, ratings, 'o1', null, 1_300)).toBe(true);
    expect(ratings.ratings.o1?.value).toBeNull();
    expect(ratings.ratings.o1?.declined).toBe(true);
    expect(ratings.ratings.o1).toMatchObject({
      position: 1,
      since_presented_ms: 1_200,
    });
    expect(m22PresentRating(reports, ratings, 'o2', 1_300)).toBe(true);
    expect(m22Rate(reports, ratings, 'o2', 5, 2_400)).toBe(true);
    expect(ratings.ratings.o2).toMatchObject({
      value: 5,
      position: 2,
      since_presented_ms: 1_100,
    });

    // Withdraw: offered while assembling and after the acknowledgement,
    // never on an unacknowledged returned note.
    const gate = createM22ReportState('o1', 'form_a');

    m22Enter(gate, 0);
    expect(m22CanWithdraw(gate)).toBe(true);

    for (const [slot, line] of M22_REPORT_DEFS.o1.lines.slice(0, 3).entries()) {
      m22PlaceLine(gate, slot, line.id, 1 + slot);
    }

    m22Submit(gate, 10);
    expect(m22CanWithdraw(gate)).toBe(false);
    m22Acknowledge(gate, 20);
    expect(m22CanWithdraw(gate)).toBe(true);
  });

  test('extractor: revisions on both reports 2 of 2 with two ratings; revision then exit 1 of 2; one requirement ⇒ incomplete on 1; none ⇒ null; unacknowledged ⇒ excluded; review-closed ⇒ censored; declined and missing ratings are null; a disagreeing record fails both rows', () => {
    // Both revised (one accepted, one withdrawn after the revision), both rated.
    {
      const h = harness();

      playReport(h, 'o1', 'revise_accept');
      playReport(h, 'o2', 'revise_withdraw');
      h.push('o1', 'rating_presented', { input_mode: 'system' });
      h.rated('o1', 2, 40_000);
      h.rated('o2', 4, 30_000);

      const rows = extractItemFeatures('M22', h.events, CONTEXT);

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        feature_id: 'm22_revisions_begun',
        value: 2,
        numerator: 2,
        denominator: 2,
        planned_denominator: 2,
        disposition: 'observed',
        censored: false,
        closure_reason: 'completed',
      });
      expect(rows[0].included_ids).toEqual([
        'm22_returned_o1',
        'm22_returned_o2',
      ]);
      expect(rows[1]).toMatchObject({
        feature_id: 'm22_discouragement_ratings',
        disposition: 'observed',
      });
      expect(rows[1].value).toEqual({
        o1: { value: 2, declined: false, recall_delay_ms: 40_000, position: 1 },
        o2: { value: 4, declined: false, recall_delay_ms: 30_000, position: 2 },
      });
      expect(JSON.stringify(rows)).not.toMatch(/score|resilien|grit|persist/i);
    }

    // Revision on report 1, exit on report 2: 1 of 2; one rating declined.
    {
      const h = harness();

      playReport(h, 'o1', 'revise_accept');
      playReport(h, 'o2', 'exit');
      h.rated('o1', 1, 20_000);
      h.rated('o2', null, 10_000);

      const rows = extractItemFeatures('M22', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: 1,
        numerator: 1,
        denominator: 2,
        disposition: 'observed',
      });
      expect(rows[1].value).toEqual({
        o1: { value: 1, declined: false, recall_delay_ms: 20_000, position: 1 },
        o2: {
          value: null,
          declined: true,
          recall_delay_ms: 10_000,
          position: 2,
        },
      });
    }

    // Only report 1 reached its requirement (report 2 never submitted): incomplete on 1.
    {
      const h = harness();

      playReport(h, 'o1', 'exit');
      playReport(h, 'o2', 'never_submitted');

      const rows = extractItemFeatures('M22', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: 0,
        numerator: 0,
        denominator: 1,
        disposition: 'incomplete',
      });
      expect(rows[1]).toMatchObject({ value: null });
    }

    // No requirement presented at all: null (no eligible event), no rating due.
    {
      const h = harness();

      playReport(h, 'o1', 'never_submitted');
      playReport(h, 'o2', 'never_submitted');

      const rows = extractItemFeatures('M22', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: null,
        disposition: 'no_eligible_event',
      });
      expect(rows[1]).toMatchObject({
        value: null,
        disposition: 'no_eligible_event',
      });
    }

    // Returned but never acknowledged (invalid) + returned and left to the
    // review (censored): both excluded; the row is null and censored.
    {
      const h = harness();

      playReport(h, 'o1', 'unacknowledged_review');
      playReport(h, 'o2', 'acknowledged_review');

      const rows = extractItemFeatures('M22', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: null,
        disposition: 'interrupted',
        censored: true,
        closure_reason: 'closed_at_review',
      });
      expect(rows[0].components).toMatchObject({
        censored_reports: ['o2'],
        invalid_reports: [{ report: 'o1', detail: 'setback_not_acknowledged' }],
      });
    }

    // Both returned and closed by the review unacknowledged: nothing was
    // understood — understanding_failed, not "no eligible event".
    {
      const h = harness();

      playReport(h, 'o1', 'unacknowledged_review');
      playReport(h, 'o2', 'unacknowledged_review');

      const rows = extractItemFeatures('M22', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: null,
        disposition: 'understanding_failed',
        censored: false,
      });
    }

    // A review-closed report whose revision had already begun keeps its
    // observed 1 (only a 0 can be censored): 1 of 1 with report 2 never
    // submitted ⇒ incomplete on 1; with report 2 exited ⇒ 1 of 2 observed.
    {
      const h = harness();

      playReport(h, 'o1', 'revise_review');
      playReport(h, 'o2', 'exit');

      const rows = extractItemFeatures('M22', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: 1,
        numerator: 1,
        denominator: 2,
        disposition: 'observed',
        censored: false,
        closure_reason: 'closed_at_review',
      });
      expect(rows[0].included_ids).toEqual([
        'm22_returned_o1',
        'm22_returned_o2',
      ]);
      expect(rows[1].components).toMatchObject({
        acknowledged_reports: ['o1', 'o2'],
      });
    }

    // Both decided, ratings never answered: null (interrupted at the record closure; pending before).
    {
      const h = harness();

      playReport(h, 'o1', 'revise_accept');
      playReport(h, 'o2', 'exit');

      expect(
        extractItemFeatures('M22', h.events, OPEN_CONTEXT)[1],
      ).toMatchObject({ value: null, disposition: 'pending' });
      expect(extractItemFeatures('M22', h.events, CONTEXT)[1]).toMatchObject({
        value: null,
        disposition: 'interrupted',
      });
    }

    // Presented and never opened: declined. Never presented: not_presented;
    // after a reload: interrupted.
    {
      const h = harness();

      h.presented('o1');
      h.presented('o2');
      expect(extractItemFeatures('M22', h.events, CONTEXT)[0]).toMatchObject({
        value: null,
        disposition: 'declined',
      });
      expect(extractItemFeatures('M22', [], CONTEXT)[0]).toMatchObject({
        disposition: 'not_presented',
      });
      expect(
        extractItemFeatures('M22', [], { ...CONTEXT, reloaded: true })[0],
      ).toMatchObject({ disposition: 'interrupted' });
    }

    // A report record that disagrees with the code_attached events fails both rows.
    {
      const h = harness();

      playReport(h, 'o1', 'exit');
      playReport(h, 'o2', 'exit');

      const closedEvent = h.events.find(
        (e) => e.event_type === `${M22_FAMILY}window_closed`,
      )!;
      const raw = closedEvent.metadata!.raw_components as Record<
        string,
        unknown
      >;

      raw.revision_begun = true;

      const rows = extractItemFeatures('M22', h.events, CONTEXT);

      expect(rows[0].disposition).toBe('technical_failure');
      expect(rows[1].disposition).toBe('technical_failure');
    }

    // A technical failure closes both rows.
    {
      const h = harness();

      h.presented('o1');
      h.opened('o1');
      h.failed('o1');

      const rows = extractItemFeatures('M22', h.events, CONTEXT);

      expect(rows[0].disposition).toBe('technical_failure');
      expect(rows[1].disposition).toBe('technical_failure');
    }
  });

  test('U24 I-1 = a: the outcome-neutral report-1 lines and the v4 administration; the Workshop handover names no recovered coupling', () => {
    // Owner ruling of 22 October 2026 (D-U24-1 §2 I-1 (a)): the exact
    // neutral strings; requirement logic, forms and formula unchanged.
    expect(M22_ENTRY_STATE_VERSION).toBe('m22-setbacks-v4');

    const lines = Object.fromEntries(
      M22_REPORT_DEFS.o1.lines.map((line) => [line.code, line.label]),
    );

    expect(lines['WO-11']).toBe('Coolant coupling — line check');
    expect(lines['WO-13']).toBe('Excavation field — survey record');

    const scene = readFileSync(
      path.resolve('src/scenes/RecordsWorkshopScene.ts'),
      'utf8',
    );

    expect(scene).toContain(
      "`Tray: relay unit ${tray.relay_unit ? 'placed' : '—'} · field components: see the field tray.`",
    );
    expect(scene).not.toContain('Place the recovered relay coupling');
    expect(scene).not.toContain('recovered relay coupling');
  });
});

/* ------------------------------------------------------------------ *
 * U24 RL-3 — the reload check for the desk's two reports (pure)
 *
 * Expected values come from RELOAD-CORRECTION-SPEC-r3-exec.md §2 (classes
 * and permission), §5 "M22" (the after column, owner decision D-2 (i)) and
 * §8 (fixtures F-D, F-E), and r1 §1's stage map (stage 1 `presented`,
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
  H: `${RELOAD_HOLD_BACK_PREFIX.H}: report not re-run`,
  U: `${RELOAD_HOLD_BACK_PREFIX.U}: report not administered`,
  M: `${RELOAD_HOLD_BACK_PREFIX.M}: report not administered`,
} as const;
const reportOfEvent = (event: ReloadEvent) =>
  event.metadata?.report ?? event.metadata?.occasion;
const RL3_STAGES = Object.fromEntries(
  M22_REPORTS.map((id) => [
    id,
    {
      briefing: (event: ReloadEvent) =>
        event.event_type === `${M22_FAMILY}presented` &&
        reportOfEvent(event) === id,
      opening: (event: ReloadEvent) =>
        event.event_type === `${M22_FAMILY}opportunity_opened` &&
        reportOfEvent(event) === id,
      holdBack: (event: ReloadEvent) =>
        event.event_type === `${M22_FAMILY}technical_failure` &&
        reportOfEvent(event) === id,
    },
  ]),
);

type Rl3Step = 'none' | 'presented' | Play;

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

function rl3Marker(
  h: ReturnType<typeof harness>,
  id: M22Report,
  cls: 'H' | 'U' | 'M',
) {
  h.push(id, 'technical_failure', {
    occasion: id,
    detail: RL3_DETAIL[cls],
    input_mode: 'system',
  });
}

/** One earlier page load built from per-report steps, renumbered. */
function rl3Prior(
  load: number,
  from: number,
  steps: Partial<Record<M22Report, Rl3Step | 'U'>>,
): RawGameEvent[] {
  const h = harness();

  h.events.push({
    session_id: 's',
    timestamp_ms: 0,
    scene: 'dock',
    event_type: 'session_start',
    metadata: {},
  });

  for (const id of M22_REPORTS) {
    const step = steps[id] ?? 'none';

    if (step === 'U') {
      h.presented(id);
      rl3Marker(h, id, 'U');
    } else if (step === 'presented') {
      h.presented(id);
    } else if (step !== 'none') {
      playReport(h, id, step);
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

/**
 * A reloaded load as the runtime writes it: the record at the return
 * shift's presentation (or `records`, to inject defects), both reports
 * presented, a report that is not A held there, each A report's step,
 * then the ratings given.
 */
function rl3Load(
  prior: RawGameEvent[],
  steps: Record<M22Report, Rl3Step>,
  options: {
    integrity?: typeof RL3_CONTINUOUS;
    pageLoadIndex?: number;
    records?: (record: Record<string, unknown>) => object[];
    presentation?: boolean;
    ratings?: Partial<Record<M22Report, number>>;
  } = {},
) {
  const pageLoadIndex = options.pageLoadIndex ?? 2;
  const record = rl3Record(pageLoadIndex, prior, options.integrity);
  const records = options.records?.(record) ?? [record];
  const reload = classifyReload({
    pageLoadIndex,
    checks: records,
    occasions: M22_REPORTS,
  });
  const h = harness();

  for (const id of M22_REPORTS) {
    const cls = reload.occasions[id].class;

    if (options.presentation === false) {
      continue;
    }

    if (cls !== 'A') {
      h.presented(id);
      rl3Marker(h, id, cls ?? 'U');
    } else if (steps[id] === 'presented') {
      h.presented(id);
    } else if (steps[id] !== 'none') {
      playReport(h, id, steps[id] as Play);
    }
  }

  for (const [id, value] of Object.entries(options.ratings ?? {})) {
    h.rated(id as M22Report, value, 5_000);
  }

  const from = (prior.at(-1)?.sequence ?? 0) + 1;
  const checks = records.map((r) => ({
    session_id: 's',
    timestamp_ms: 0,
    scene: 'records_workshop',
    event_type: `${M22_FAMILY}prior_load_checked`,
    metadata: {
      opportunity_id: M22_OPPORTUNITY_IDS.o1,
      occasion: 'o1',
      ...r,
      input_mode: 'system',
    },
  }));
  const current = rl3Number([...checks, ...h.events], pageLoadIndex, from);
  const rows = extractItemFeatures('M22', [...prior, ...current], {
    finalCoreClosed: true,
    pageLoadIndex,
    reloaded: true,
  });

  return { record, reload, primary: rows[0], companion: rows[1], current };
}

const rl3Permit = (reload: ReturnType<typeof classifyReload>) =>
  M22_REPORTS.map((id) => [
    id,
    reload.occasions[id].class,
    reload.occasions[id].administration_permitted,
  ]);

test.describe('M22 the reload check (U24 RL-3, pure)', () => {
  test('the extractor’s stage map is r1 §1’s (the same record for every history); a first load writes none; the same classes', () => {
    const histories = [
      rl3Prior(1, 1, { o1: 'revise_accept', o2: 'presented' }),
      rl3Prior(1, 1, { o1: 'presented', o2: 'presented' }),
      rl3Prior(1, 1, { o2: 'U' }),
      rl3Prior(1, 1, {}),
    ];

    for (const prior of histories) {
      expect(m22PriorLoadCheck(3, prior, RL3_CONTINUOUS)).toEqual(
        rl3Record(3, prior),
      );
      expect(classifyM22Reload(3, [rl3Record(3, prior)])).toEqual(
        classifyReload({
          pageLoadIndex: 3,
          checks: [rl3Record(3, prior)],
          occasions: M22_REPORTS,
        }),
      );
    }

    expect(m22PriorLoadCheck(1, [], RL3_CONTINUOUS)).toBeNull();
  });

  test('r3 §5 M22, A (established absence): OBS + OBS, OBS + DEC, DEC + DEC and NOP + NOP take the first-load readings', () => {
    const prior = rl3Prior(1, 1, {});
    const both = rl3Load(prior, { o1: 'revise_accept', o2: 'exit' });

    expect(rl3Permit(both.reload)).toEqual([
      ['o1', 'A', true],
      ['o2', 'A', true],
    ]);
    expect(both.primary).toMatchObject({
      disposition: 'observed',
      value: 1,
      numerator: 1,
      denominator: 2,
    });
    expect(
      rl3Load(prior, { o1: 'revise_accept', o2: 'presented' }).primary,
    ).toMatchObject({
      disposition: 'incomplete',
      value: 1,
      numerator: 1,
      denominator: 1,
    });

    const dec = rl3Load(prior, { o1: 'presented', o2: 'presented' });

    expect(dec.primary).toMatchObject({ disposition: 'declined', value: null });
    expect(dec.companion).toMatchObject({
      disposition: 'declined',
      value: null,
    });

    const nop = rl3Load(
      prior,
      { o1: 'none', o2: 'none' },
      { presentation: false },
    );

    expect(nop.primary).toMatchObject({
      disposition: 'not_presented',
      value: null,
      numerator: null,
      denominator: null,
    });
    expect(nop.companion.disposition).toBe('not_presented');
  });

  test('r3 §5 M22 under D-2 (i): a held report beside an observed report reads interrupted · x · x/1 (overriding incomplete), the ratings companion its own reading; beside a declined or held report both rows interrupted · null; F-E: an H report leaves its sibling A, administered and observed', () => {
    const prior = rl3Prior(1, 1, { o1: 'exit', o2: 'presented' });
    const obs = rl3Load(
      prior,
      { o1: 'none', o2: 'revise_accept' },
      { ratings: { o2: 4 } },
    );

    expect(rl3Permit(obs.reload)).toEqual([
      ['o1', 'H', false],
      ['o2', 'A', true],
    ]);
    expect(obs.primary).toMatchObject({
      disposition: 'interrupted',
      value: 1,
      numerator: 1,
      denominator: 1,
    });
    expect(obs.primary.included_ids).toEqual(['m22_returned_o2']);
    expect(obs.companion).toMatchObject({
      disposition: 'observed',
      value: { o1: null, o2: { value: 4, declined: false } },
    });
    expect(rl3Load(prior, { o1: 'none', o2: 'exit' }).primary).toMatchObject({
      disposition: 'interrupted',
      value: 0,
      numerator: 0,
      denominator: 1,
    });

    const dec = rl3Load(prior, { o1: 'none', o2: 'presented' });

    expect(dec.primary).toMatchObject({
      disposition: 'interrupted',
      value: null,
      numerator: null,
      denominator: null,
      missing_reason:
        'report opened in an earlier page load; not re-run after the reload',
    });
    expect(dec.companion).toMatchObject({
      disposition: 'interrupted',
      value: null,
    });

    const both = rl3Load(rl3Prior(1, 1, { o1: 'exit', o2: 'exit' }), {
      o1: 'none',
      o2: 'none',
    });

    expect(rl3Permit(both.reload)).toEqual([
      ['o1', 'H', false],
      ['o2', 'H', false],
    ]);
    expect(both.primary).toMatchObject({
      disposition: 'interrupted',
      value: null,
      denominator: null,
    });
  });

  test('F-D: an earlier U hold of one report, then a continuous history ⇒ it stays U and refused; its eligible A sibling is administered and observed — HB(U) + OBS(A) reads interrupted · x · x/1', () => {
    const load1 = rl3Prior(1, 1, {});
    const load2 = rl3Prior(2, load1.length + 1, { o1: 'U', o2: 'presented' });
    const fd = rl3Load(
      [...load1, ...load2],
      { o1: 'none', o2: 'revise_accept' },
      { pageLoadIndex: 3 },
    );

    expect(fd.record.history_continuous).toBe(true);
    expect(rl3Permit(fd.reload)).toEqual([
      ['o1', 'U', false],
      ['o2', 'A', true],
    ]);
    expect(fd.primary).toMatchObject({
      disposition: 'interrupted',
      value: 1,
      numerator: 1,
      denominator: 1,
    });
  });

  test('U (history-level): a discontinuous history holds both reports — nothing administered, both rows interrupted · null with the unverified reason (U + DEC)', () => {
    const u = rl3Load(
      rl3Prior(1, 1, {}),
      { o1: 'revise_accept', o2: 'revise_accept' },
      { integrity: RL3_GAP },
    );

    expect(rl3Permit(u.reload)).toEqual([
      ['o1', 'U', false],
      ['o2', 'U', false],
    ]);
    expect(
      u.current.filter(
        (event) => event.event_type === `${M22_FAMILY}opportunity_opened`,
      ),
    ).toEqual([]);
    expect(u.primary).toMatchObject({
      disposition: 'interrupted',
      value: null,
      denominator: null,
      missing_reason:
        'report not administered after a reload: earlier history not verified',
    });
    expect(u.companion.disposition).toBe('interrupted');
  });

  test('review round 1: beside a held report, a report that would read no_eligible_event (never submitted) reads interrupted · null · null / 0; one that would read understanding_failed (the note never acknowledged) keeps that invalidity', () => {
    const prior = rl3Prior(1, 1, { o1: 'exit', o2: 'presented' });
    const never = rl3Load(prior, { o1: 'none', o2: 'never_submitted' });

    expect(never.primary).toMatchObject({
      disposition: 'interrupted',
      value: null,
      numerator: null,
      denominator: 0,
      missing_reason:
        'report opened in an earlier page load; not re-run after the reload',
    });

    const unacknowledged = rl3Load(prior, {
      o1: 'none',
      o2: 'unacknowledged_review',
    });

    expect(unacknowledged.primary).toMatchObject({
      disposition: 'understanding_failed',
      value: null,
      denominator: 0,
    });
  });
  test('a malformed record (another load’s index) is a technical failure of both rows; a reload marker is never one, another fault still is', () => {
    const prior = rl3Prior(1, 1, {});
    const malformed = rl3Load(
      prior,
      { o1: 'presented', o2: 'presented' },
      { records: (record) => [{ ...record, page_load_index: 9 }] },
    );

    expect(malformed.reload.check_malformed).toBe(true);
    expect(malformed.primary.disposition).toBe('technical_failure');
    expect(malformed.companion.disposition).toBe('technical_failure');

    const h = harness();

    h.presented('o1');
    h.opened('o1');
    h.failed('o1');
    expect(
      extractItemFeatures('M22', rl3Number(h.events, 2, prior.length + 1), {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      })[0].disposition,
    ).toBe('technical_failure');
  });

  test('the record is never task evidence: absent from the supporting sequences', () => {
    const a = rl3Load(rl3Prior(1, 1, {}), {
      o1: 'revise_accept',
      o2: 'presented',
    });
    const check = a.current.find(
      (event) => event.event_type === `${M22_FAMILY}prior_load_checked`,
    )!;

    expect(a.primary.supporting_sequences).not.toContain(check.sequence);
  });

  test('RL-1C decision A: both reports presented and left unopened in a reloaded load without its check are U, refused, and read held; a first load keeps declined; a genuinely unreached reloaded load keeps the absentFeature reading', () => {
    const prior = rl3Prior(1, 1, {});
    const h = harness();

    h.presented('o1');
    h.presented('o2');
    expect(rl3Permit(classifyM22Reload(2, []))).toEqual([
      ['o1', 'U', false],
      ['o2', 'U', false],
    ]);

    const rows = extractItemFeatures(
      'M22',
      [...prior, ...rl3Number(h.events, 2, prior.length + 1)],
      { finalCoreClosed: true, pageLoadIndex: 2, reloaded: true },
    );

    expect(rows[0]).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'report not administered after a reload: earlier history not verified',
    });
    expect(rows[1].disposition).toBe('interrupted');
    expect(extractItemFeatures('M22', h.events, CONTEXT)[0].disposition).toBe(
      'declined',
    );
    expect(
      extractItemFeatures('M22', prior, {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      })[0],
    ).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'no current-load evidence after a reload: report desk never opened',
    });
  });
});
