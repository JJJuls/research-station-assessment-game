/**
 * Station 080 M02 — six retrieval requests in a balanced order over the
 * participant's own layout (Unit 13), pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row and the
 * balanced request orders (a Williams square: every case once per order,
 * every position once per case, every ordered neighbour pair once); the
 * layout is described against the participant's own labels and frozen at
 * the handover; a WRONG first answer advances exactly as a right one does
 * and is never rewritten; "Cannot locate" is an incorrect first answer
 * inside the denominator; an empty slot and a press inside the settle
 * window answer nothing; nothing about correctness exists before the sixth
 * answer; the focused time of a request excludes a closed workspace and a
 * lost focus and a reopen presents the SAME request; and the extractor
 * over the raw family — 6/6, a mixed series, an interrupted series ⇒
 * `incomplete` with its denominator (an unanswered request is missing,
 * never incorrect), never handed over ≠ handed over and unanswered ≠ never
 * opened ≠ declined ≠ reload ≠ pending, a technically inaccessible request
 * excluded, a recount disagreement ⇒ technical failure.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { registerEntry } from '../src/measurement/registerV3';
import {
  createM02State,
  M02_CASES,
  M02_FAMILY,
  M02_INTAKE_ID,
  M02_OPPORTUNITY_ID,
  M02_ORDER_IDS,
  M02_REQUEST_COUNT,
  M02_REQUEST_ORDERS,
  M02_SETTLE_MS,
  M02_TRAY_IDS,
  m02AnswerPick,
  m02Begin,
  m02CannotLocate,
  m02CorrectFirstRetrievals,
  m02CurrentRequest,
  m02EmptySelection,
  m02EntrySnapshot,
  m02Feedback,
  m02FeedbackText,
  m02Finish,
  m02Freeze,
  m02HandOver,
  m02LayoutSummary,
  type M02LogSink,
  m02NoteMove,
  type M02Placements,
  m02PriorAdministration,
  m02RawComponents,
  m02RequestSequence,
  m02SetLabel,
  type M02State,
  m02SurfaceClosed,
  m02SurfaceReopened,
} from '../src/pilot/windows/m02RetrievalModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (suffix: string, metadata: Record<string, unknown>) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: 'records_workshop',
      event_type: `${M02_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: { opportunity_id: M02_OPPORTUNITY_ID, ...metadata },
    });
  };
  const sink: M02LogSink = (suffix, metadata) => push(suffix, metadata);

  return {
    events,
    sink,
    push,
    presented: () => push('presented', { input_mode: 'system' }),
    opened: () => push('opportunity_opened', { input_mode: 'system' }),
    heldBack: () =>
      push('technical_failure', {
        detail: 'reload after administration: workspace not re-run',
        input_mode: 'system',
      }),
    close: (
      s: M02State,
      exit: 'completed' | 'closed_at_review' = 'completed',
      layoutNow: ReturnType<typeof m02LayoutSummary> | null = null,
    ) =>
      push('window_closed', {
        exit_state: exit,
        [exit === 'closed_at_review'
          ? 'raw_components_partial'
          : 'raw_components']: m02RawComponents(s, exit, layoutNow),
      }),
    ofType: (suffix: string) =>
      events.filter((e) => e.event_type === `${M02_FAMILY}${suffix}`),
  };
}

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };
const T0 = 100_000;
const STEP = M02_SETTLE_MS + 600;

/** Every case in its own slot: two per tray over trays 1–3. */
function trayLayout(): M02Placements {
  return Object.fromEntries(
    M02_CASES.map((c, index) => [
      c.definitionId,
      {
        container_id: M02_TRAY_IDS[Math.floor(index / 2)],
        slot_index: index % 2,
      },
    ]),
  );
}

function started(order = M02_ORDER_IDS[0]) {
  const h = harness();
  const s = createM02State('form_a', order);

  h.presented();
  h.opened();
  expect(m02Begin(s)).toBe(true);

  return { h, s };
}

/** Answers the current request with the case in `caseId`'s slot. */
function pick(
  s: M02State,
  layout: M02Placements,
  caseId: string,
  at: number,
  log: M02LogSink,
  mode: 'pointer' | 'keyboard' = 'pointer',
) {
  const slot = layout[caseId];

  return m02AnswerPick(
    s,
    caseId,
    slot.container_id,
    slot.slot_index,
    at,
    mode,
    log,
  );
}

test.describe('M02 retrieval requests (pure)', () => {
  test('register row: v3 route with a filing and a requests window, a reverse-keyed fraction primary over six requests, latency and layout companions; six balanced orders form a Williams square', () => {
    const entry = registerEntry('M02');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual(['proto_m02_retrieval_series']);
    expect(entry.route.windows.map((w) => [w.id, w.zone, w.episode])).toEqual([
      ['m02_filing_w1', 'records_workshop', 2],
      ['m02_requests_w1', 'records_workshop', 2],
    ]);
    expect(entry.route.family_prefixes).toEqual(['proto_m02_workspace_']);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.source.reverse_keyed).toBe(true);
    expect(entry.target.occasions).toBe(1);
    expect(entry.independence.kind).toBe('single_episode');
    expect(entry.coverage_label).toBe('behavioural_counterpart');
    expect(
      entry.features.map((f) => [
        f.feature_id,
        f.kind,
        f.role,
        f.planned_denominator,
        f.denominator_kind,
      ]),
    ).toEqual([
      [
        'm02_correct_first_retrievals',
        'fraction',
        'primary',
        6,
        'planned_observations',
      ],
      [
        'm02_retrieval_latency',
        'count',
        'companion',
        null,
        'conditional_eligibility',
      ],
      [
        'm02_filing_layout',
        'count',
        'companion',
        null,
        'conditional_eligibility',
      ],
    ]);

    expect(M02_REQUEST_COUNT).toBe(6);
    expect(M02_CASES).toHaveLength(6);
    expect(M02_ORDER_IDS).toHaveLength(6);

    const orders = M02_ORDER_IDS.map((id) => M02_REQUEST_ORDERS[id]);

    // Every case is requested exactly once per order.
    for (const order of orders) {
      expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    }

    // Every case stands at every position exactly once across the orders.
    for (let position = 0; position < 6; position += 1) {
      expect(orders.map((order) => order[position]).sort()).toEqual([
        0, 1, 2, 3, 4, 5,
      ]);
    }

    // Every ordered pair of different cases is adjacent exactly once.
    const pairs = orders.flatMap((order) =>
      order.slice(0, -1).map((value, i) => `${value}>${order[i + 1]}`),
    );

    expect(pairs).toHaveLength(30);
    expect(new Set(pairs).size).toBe(30);

    // The sequence is the case ids, never a position in the layout.
    expect(m02RequestSequence('order_1')).toEqual([
      'm02c_case_s14',
      'm02c_case_r07',
      'm02c_case_r09',
      'm02c_case_k03',
      'm02c_case_s15',
      'm02c_case_i22',
    ]);
    expect(m02EntrySnapshot('form_b', 'order_3')).toMatchObject({
      form: 'form_b',
      request_order: 'order_3',
      requests_planned: 6,
      advance_on_first_answer: true,
      cannot_locate_available: true,
      feedback: 'deferred_to_end',
      layout_frozen_at_handover: true,
      contents_during_requests: 'concealed',
      participant_labels_during_requests: 'visible',
      time_limit: null,
    });
  });

  test("the layout is described against the participant's own labels and frozen at the handover; no request exists before it", () => {
    const { h, s } = started();

    // Own schema, deliberately imperfect: I-22 under SAMPLES, K-03 in an
    // unlabelled tray, SAMPLES used twice, two cases left on the intake.
    const layout: M02Placements = {
      m02c_case_s14: { container_id: M02_TRAY_IDS[0], slot_index: 0 },
      m02c_case_i22: { container_id: M02_TRAY_IDS[0], slot_index: 1 },
      m02c_case_r07: { container_id: M02_TRAY_IDS[1], slot_index: 0 },
      m02c_case_k03: { container_id: M02_TRAY_IDS[2], slot_index: 0 },
      m02c_case_s15: { container_id: M02_INTAKE_ID, slot_index: 4 },
      m02c_case_r09: { container_id: M02_INTAKE_ID, slot_index: 5 },
    };

    expect(
      m02NoteMove(
        s,
        'm02c_case_s14',
        M02_INTAKE_ID,
        M02_TRAY_IDS[0],
        'pointer',
        h.sink,
      ),
    ).toBe(true);
    expect(m02SetLabel(s, M02_TRAY_IDS[0], 'SAMPLES', 'pointer', h.sink)).toBe(
      true,
    );
    expect(m02SetLabel(s, M02_TRAY_IDS[1], 'REPAIRS', 'keyboard', h.sink)).toBe(
      true,
    );
    expect(m02SetLabel(s, M02_TRAY_IDS[3], 'SAMPLES', 'keyboard', h.sink)).toBe(
      true,
    );
    expect(m02SetLabel(s, 'not_a_tray', 'SAMPLES', 'pointer', h.sink)).toBe(
      false,
    );

    // Before the handover nothing is requested and nothing can be answered.
    expect(m02CurrentRequest(s)).toBeNull();
    expect(pick(s, layout, 'm02c_case_s14', T0, h.sink)).toBe('invalid');
    expect(m02CannotLocate(s, T0, 'pointer', h.sink)).toBe('invalid');
    expect(h.ofType('request_presented')).toEqual([]);

    expect(m02HandOver(s, layout, T0, 'keyboard', h.sink)).toBe('handed_over');
    expect(h.ofType('handed_over')[0].metadata).toMatchObject({
      untraceable_case_count: 1,
      misfile_count: 1,
      duplicate_count: 1,
      cases_left_on_intake: 2,
      move_count: 1,
      label_changes: 3,
      layout_frozen: true,
      input_mode: 'keyboard',
    });
    expect(s.layout?.case_location_at_close.m02c_case_i22).toMatchObject({
      container: M02_TRAY_IDS[0],
      label: 'SAMPLES',
      kind: 'incident',
    });

    // No field compares the layout with an expected arrangement.
    for (const key of Object.keys(h.ofType('handed_over')[0].metadata ?? {})) {
      expect(key).not.toMatch(/expected|designer|target|score/);
    }

    // Frozen: labels and moves are refused; a second handover is invalid.
    expect(m02SetLabel(s, M02_TRAY_IDS[2], 'SUPPLY', 'pointer', h.sink)).toBe(
      false,
    );
    expect(
      m02NoteMove(
        s,
        'm02c_case_k03',
        M02_TRAY_IDS[2],
        M02_TRAY_IDS[3],
        'pointer',
        h.sink,
      ),
    ).toBe(false);
    expect(m02HandOver(s, layout, T0 + 10, 'pointer', h.sink)).toBe('invalid');
    expect(s.labels[M02_TRAY_IDS[2]]).toBeNull();
    expect(h.ofType('request_presented')).toHaveLength(1);
    // Every presentation records the retrieval condition; the layout the
    // participant handed over is carried unchanged, labels included.
    expect(h.ofType('request_presented')[0].metadata).toMatchObject({
      contents_concealed: true,
      presented: true,
      accessible: true,
    });
    expect(s.layout?.tray_labels).toEqual({
      [M02_TRAY_IDS[0]]: 'SAMPLES',
      [M02_TRAY_IDS[1]]: 'REPAIRS',
      [M02_TRAY_IDS[2]]: null,
      [M02_TRAY_IDS[3]]: 'SAMPLES',
    });
    expect(s.layout?.case_location_at_close.m02c_case_s15).toMatchObject({
      container: M02_INTAKE_ID,
      slot_index: 4,
    });
    expect(m02CurrentRequest(s)).toMatchObject({
      index: 0,
      case_id: 'm02c_case_s14',
      accessible: true,
    });
  });

  test('a wrong first answer advances and is never rewritten; Cannot locate is an incorrect answer that advances; an empty slot and a press inside the settle window answer nothing; no correctness exists before the sixth answer', () => {
    const { h, s } = started('order_1');
    const layout = trayLayout();
    const sequence = m02RequestSequence('order_1');
    let t = T0;

    expect(m02HandOver(s, layout, t, 'pointer', h.sink)).toBe('handed_over');

    // A press carried over from the handover is refused, not an answer.
    expect(pick(s, layout, sequence[0], t + 100, h.sink, 'keyboard')).toBe(
      'refused',
    );
    expect(m02CannotLocate(s, t + 200, 'keyboard', h.sink)).toBe('refused');
    expect(h.ofType('request_answered')).toEqual([]);
    expect(h.ofType('press_refused').map((e) => e.metadata?.control)).toEqual([
      'select_slot',
      'cannot_locate',
    ]);
    expect(m02CurrentRequest(s)?.index).toBe(0);

    // An empty slot is recorded and answers nothing.
    expect(m02EmptySelection(s, M02_TRAY_IDS[3], 0, 'pointer', h.sink)).toBe(
      true,
    );
    expect(m02CurrentRequest(s)?.index).toBe(0);
    expect(h.ofType('request_answered')).toEqual([]);

    // Request 1: a WRONG case is selected — the request advances.
    t += STEP;
    expect(pick(s, layout, sequence[3], t, h.sink)).toBe('recorded');
    expect(m02CurrentRequest(s)?.index).toBe(1);
    expect(s.requests[0].answer).toMatchObject({
      kind: 'pick',
      picked_case: sequence[3],
      correct: false,
    });
    expect(h.ofType('request_answered')[0].metadata).toMatchObject({
      request_index: 0,
      requested_case: sequence[0],
      picked_case: sequence[3],
      correct: false,
      first_answer: true,
      feedback_shown: false,
      empty_selections: 1,
      refused_presses: 2,
    });

    // The first answer is the only one: request 1 can no longer be answered,
    // and a later selection of its case answers the CURRENT request.
    t += STEP;
    expect(pick(s, layout, sequence[0], t, h.sink)).toBe('recorded');
    expect(s.requests[0].answer?.picked_case).toBe(sequence[3]);
    expect(s.requests[1].answer).toMatchObject({
      picked_case: sequence[0],
      correct: false,
    });

    // Request 3: Cannot locate — incorrect, inside the denominator, advances.
    t += STEP;
    expect(m02CannotLocate(s, t, 'keyboard', h.sink)).toBe('recorded');
    expect(s.requests[2].answer).toMatchObject({
      kind: 'cannot_locate',
      picked_case: null,
      correct: false,
      input_mode: 'keyboard',
    });
    expect(m02CurrentRequest(s)?.index).toBe(3);

    // Nothing about correctness has been shown.
    expect(s.feedbackShown).toBe(false);
    expect(h.ofType('feedback_shown')).toEqual([]);
    expect(m02Finish(s, t, h.sink)).toBe(false);

    // Requests 4–6 answered correctly; the sixth ends the series.
    for (const index of [3, 4]) {
      t += STEP;
      expect(pick(s, layout, sequence[index], t, h.sink)).toBe('recorded');
    }

    t += STEP;
    expect(pick(s, layout, sequence[5], t, h.sink, 'keyboard')).toBe(
      'series_complete',
    );
    expect(m02CurrentRequest(s)).toBeNull();
    expect(m02CorrectFirstRetrievals(s)).toBe(3);
    expect(m02Finish(s, t, h.sink)).toBe(true);
    expect(s.phase).toBe('closed');
    expect(h.ofType('feedback_shown')).toHaveLength(1);

    // The deferred record states what was selected and where the case was.
    const record = m02Feedback(s).map(m02FeedbackText);

    expect(record).toEqual([
      '1. S-14: selected K-03 — it was in tray 1',
      '2. R-07: selected S-14 — it was in tray 1',
      '3. R-09: cannot locate — it was in tray 3',
      '4. K-03: selected K-03 — matched',
      '5. S-15: selected S-15 — matched',
      '6. I-22: selected I-22 — matched',
    ]);
    expect(record.join(' ')).not.toMatch(/well done|good|correct!|wrong|fail/i);

    // Closed: nothing more can be answered.
    expect(pick(s, layout, sequence[0], t + STEP, h.sink)).toBe('invalid');
    expect(h.ofType('request_answered')).toHaveLength(6);

    const raw = m02RawComponents(s, 'completed');

    expect(raw).toMatchObject({
      handed_over: true,
      requests_presented: 6,
      requests_answered: 6,
      correct_first_retrievals: 3,
      cannot_locate_count: 1,
      wrong_selection_count: 2,
      empty_selections: 1,
      refused_presses: 2,
      feedback_shown: true,
      realised_order: sequence,
      assigned_order: sequence,
    });
  });

  test('the focused time of a request excludes a closed workspace and a lost focus; a reopen presents the same request again and guards it with the settle window', () => {
    const { h, s } = started('order_2');
    const layout = trayLayout();
    const sequence = m02RequestSequence('order_2');

    expect(m02HandOver(s, layout, T0, 'pointer', h.sink)).toBe('handed_over');

    // 2 s focused, then the workspace is closed for 10 s.
    expect(
      m02SurfaceClosed(
        s,
        T0 + 2_000,
        m02LayoutSummary(layout, s.labels),
        h.sink,
      ),
    ).toBe(true);
    // Closed: nothing can be answered.
    expect(pick(s, layout, sequence[0], T0 + 3_000, h.sink)).toBe('invalid');
    expect(m02CannotLocate(s, T0 + 3_000, 'pointer', h.sink)).toBe('invalid');
    expect(m02SurfaceReopened(s, T0 + 12_000, h.sink)).toBe(true);
    expect(m02CurrentRequest(s)).toMatchObject({ index: 0, presentations: 2 });
    expect(
      h
        .ofType('request_presented')
        .map((e) => [
          e.metadata?.request_index,
          e.metadata?.presentation_number,
        ]),
    ).toEqual([
      [0, 1],
      [0, 2],
    ]);

    // A press carried over the reopen is refused.
    expect(pick(s, layout, sequence[0], T0 + 12_100, h.sink)).toBe('refused');

    // 1 s more focused, then 4 s of lost focus, then 1 s and the answer.
    s.clock!.pause('focus_loss', T0 + 13_000);
    s.clock!.resume('focus_loss', T0 + 17_000);
    expect(pick(s, layout, sequence[0], T0 + 18_000, h.sink)).toBe('recorded');
    expect(s.requests[0].answer).toMatchObject({
      correct: true,
      focused_ms: 4_000,
      wall_ms: 18_000,
      excluded_total_ms: 14_000,
    });
    expect(s.requests[0].answer!.excluded_ms).toMatchObject({
      surface_closed: 10_000,
      focus_loss: 4_000,
    });

    // The next request starts its own clock at its own presentation.
    expect(pick(s, layout, sequence[1], T0 + 18_000 + STEP, h.sink)).toBe(
      'recorded',
    );
    expect(s.requests[1].answer).toMatchObject({
      focused_ms: STEP,
      wall_ms: STEP,
      excluded_total_ms: 0,
    });

    // Closing during the organise phase is recorded with the layout as it stands.
    const organising = started();

    expect(
      m02SurfaceClosed(
        organising.s,
        T0,
        m02LayoutSummary({}, organising.s.labels),
        organising.h.sink,
      ),
    ).toBe(true);
    expect(organising.h.ofType('surface_closed')[0].metadata).toMatchObject({
      workspace_phase: 'organise',
      handed_over: false,
      request_index: null,
    });
  });

  test('extractor: 6/6 observed; a mixed series 3/6 with Cannot locate and wrong selections inside the denominator; latency and layout kept beside, never inside', () => {
    const { h, s } = started('order_1');
    const layout = trayLayout();
    const sequence = m02RequestSequence('order_1');
    let t = T0;

    m02HandOver(s, layout, t, 'pointer', h.sink);

    for (const caseId of sequence) {
      t += STEP;
      pick(s, layout, caseId, t, h.sink);
    }

    m02Finish(s, t, h.sink);
    h.close(s);

    const rows = extractItemFeatures('M02', h.events, CONTEXT);

    expect(rows.map((row) => row.feature_id)).toEqual([
      'm02_correct_first_retrievals',
      'm02_retrieval_latency',
      'm02_filing_layout',
    ]);
    expect(rows[0]).toMatchObject({
      value: 6,
      numerator: 6,
      denominator: 6,
      planned_denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
      role: 'primary',
    });
    expect(rows[0].included_ids).toEqual([
      'm02_request_1',
      'm02_request_2',
      'm02_request_3',
      'm02_request_4',
      'm02_request_5',
      'm02_request_6',
    ]);
    expect(rows[0].components).toMatchObject({
      recount_agrees: true,
      correct_recount: 6,
      cannot_locate_count: 0,
      realised_order: sequence,
    });
    expect(rows[1].disposition).toBe('observed');
    expect(
      (rows[1].value as Record<string, { focused_ms: number }>).request_1
        .focused_ms,
    ).toBe(STEP);
    expect(rows[2]).toMatchObject({
      disposition: 'observed',
      role: 'companion',
    });
    expect(rows[2].value).toMatchObject({
      cases_left_on_intake: 0,
      untraceable_case_count: 6,
      move_count: 0,
    });
    // The primary never contains a time or a layout description.
    expect(JSON.stringify(rows[0].value)).toBe('6');

    // Mixed: wrong, right, cannot locate, right, wrong, right → 3/6 observed.
    const mixed = started('order_4');
    const order = m02RequestSequence('order_4');

    t = T0;
    m02HandOver(mixed.s, layout, t, 'pointer', mixed.h.sink);

    const plan: (string | null)[] = [
      order[1],
      order[1],
      null,
      order[3],
      order[0],
      order[5],
    ];

    for (const answer of plan) {
      t += STEP;

      if (answer === null) {
        m02CannotLocate(mixed.s, t, 'keyboard', mixed.h.sink);
      } else {
        pick(mixed.s, layout, answer, t, mixed.h.sink);
      }
    }

    m02Finish(mixed.s, t, mixed.h.sink);
    mixed.h.close(mixed.s);

    const mixedRows = extractItemFeatures('M02', mixed.h.events, CONTEXT);

    expect(mixedRows[0]).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 6,
      disposition: 'observed',
      censored: false,
    });
    expect(mixedRows[0].components).toMatchObject({
      cannot_locate_count: 1,
      wrong_selection_count: 2,
      recount_agrees: true,
    });
    expect(
      (
        mixedRows[0].components.first_answers as {
          answer_kind: string;
          correct: boolean;
        }[]
      ).map((a) => [a.answer_kind, a.correct]),
    ).toEqual([
      ['pick', false],
      ['pick', true],
      ['cannot_locate', false],
      ['pick', true],
      ['pick', false],
      ['pick', true],
    ]);
    expect(JSON.stringify([...rows, ...mixedRows])).not.toMatch(
      /score|disorgani|tidy/i,
    );
  });

  test('extractor: an interrupted series is `incomplete` with its own denominator — an unanswered request is missing, never incorrect; no answer is never a zero', () => {
    // Two answered (one right, one Cannot locate), then the review closes.
    const { h, s } = started('order_3');
    const layout = trayLayout();
    const sequence = m02RequestSequence('order_3');

    m02HandOver(s, layout, T0, 'pointer', h.sink);
    pick(s, layout, sequence[0], T0 + STEP, h.sink);
    m02CannotLocate(s, T0 + 2 * STEP, 'pointer', h.sink);
    expect(m02CurrentRequest(s)?.index).toBe(2);
    m02Freeze(s, T0 + 3 * STEP, 'closed_at_review');
    // The time already spent on the open request is kept beside, censored:
    // it is never the latency of an answer.
    expect(s.requests[2]).toMatchObject({
      answer: null,
      open_focused_ms: STEP,
      open_wall_ms: STEP,
    });
    h.close(s, 'closed_at_review');

    const rows = extractItemFeatures('M02', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 2,
      planned_denominator: 6,
      disposition: 'incomplete',
      closure_reason: 'closed_at_review',
      censored: true,
    });
    expect(rows[0].included_ids).toEqual(['m02_request_1', 'm02_request_2']);
    expect(rows[0].components).toMatchObject({
      requests_presented: 3,
      requests_answered: 2,
      request_open_at_closure: 2,
      open_request_focused_ms: STEP,
      feedback_shown: false,
    });
    expect(rows[1].disposition).toBe('incomplete');
    expect(
      (rows[1].value as Record<string, { status: string }>).request_2.status,
    ).toBe('answered');
    expect((rows[1].value as Record<string, unknown>).request_3).toMatchObject({
      status: 'presented_not_answered',
      focused_ms: null,
    });
    expect((rows[1].value as Record<string, unknown>).request_6).toMatchObject({
      status: 'not_presented',
      focused_ms: null,
    });
    expect(rows[2].disposition).toBe('observed');

    // Handed over, nothing answered: null, a voluntary stop — never 0.
    const unanswered = started();

    m02HandOver(unanswered.s, layout, T0, 'pointer', unanswered.h.sink);
    m02Freeze(unanswered.s, T0 + STEP, 'closed_at_review');
    unanswered.h.close(unanswered.s, 'closed_at_review');

    const unansweredRows = extractItemFeatures(
      'M02',
      unanswered.h.events,
      CONTEXT,
    );

    expect(unansweredRows[0]).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'voluntary_stop',
      closure_reason: 'closed_at_review',
    });
    expect(unansweredRows[1]).toMatchObject({
      value: null,
      disposition: 'voluntary_stop',
      censored: true,
    });
    expect(unansweredRows[2].disposition).toBe('observed');

    // Never handed over: no request was ever presented.
    const organising = started();
    const layoutNow = m02LayoutSummary({}, organising.s.labels);

    m02Freeze(organising.s, T0, 'closed_at_review');
    organising.h.close(organising.s, 'closed_at_review', layoutNow);

    const organisingRows = extractItemFeatures(
      'M02',
      organising.h.events,
      CONTEXT,
    );

    expect(organisingRows[0]).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
    });
    expect(organisingRows[2]).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
      censored: true,
    });

    for (const row of [...unansweredRows, ...organisingRows]) {
      expect(row.value === 0).toBe(false);
    }
  });

  test('extractor: never opened ≠ declined ≠ reload ≠ pending; a technically inaccessible request is excluded; a recount disagreement is a technical failure', () => {
    // Never presented, never opened.
    expect(
      extractItemFeatures('M02', [], CONTEXT).map((row) => row.disposition),
    ).toEqual(['not_presented', 'not_presented', 'not_presented']);
    expect(
      extractItemFeatures('M02', [], { ...CONTEXT, reloaded: true }).map(
        (row) => row.disposition,
      ),
    ).toEqual(['interrupted', 'interrupted', 'interrupted']);

    // Presented, never opened.
    const declined = harness();

    declined.presented();
    expect(
      extractItemFeatures('M02', declined.events, CONTEXT).map(
        (row) => row.disposition,
      ),
    ).toEqual(['declined', 'declined', 'declined']);

    // Opened in an earlier page load, listed again in this one and not
    // reopened: interrupted, never declined.
    const relisted = harness();

    relisted.opened();
    relisted.events[0].page_load_index = 1;
    relisted.presented();
    relisted.events[1].page_load_index = 2;
    expect(
      extractItemFeatures('M02', relisted.events, {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      }).map((row) => [row.value, row.disposition]),
    ).toEqual([
      [null, 'interrupted'],
      [null, 'interrupted'],
      [null, 'interrupted'],
    ]);

    // Reload guard: held back.
    const reload = harness();

    reload.presented();
    reload.heldBack();
    expect(
      m02PriorAdministration([
        { event_type: `${M02_FAMILY}opportunity_opened` },
      ]),
    ).toBe(true);
    expect(
      m02PriorAdministration([{ event_type: `${M02_FAMILY}presented` }]),
    ).toBe(false);

    for (const row of extractItemFeatures('M02', reload.events, {
      ...CONTEXT,
      pageLoadIndex: 1,
      reloaded: true,
    })) {
      expect(row).toMatchObject({
        value: null,
        disposition: 'interrupted',
        closure_reason: 'technical_failure',
      });
    }

    // A fault of the workspace itself is a technical failure, not a reload.
    const fault = harness();

    fault.push('technical_failure', {
      detail: 'intake seed failed: target_full',
    });
    expect(
      extractItemFeatures('M02', fault.events, CONTEXT).map(
        (row) => row.disposition,
      ),
    ).toEqual(['technical_failure', 'technical_failure', 'technical_failure']);

    // Open, no closure yet.
    const pending = started('order_1');
    const layout = trayLayout();

    m02HandOver(pending.s, layout, T0, 'pointer', pending.h.sink);
    pick(
      pending.s,
      layout,
      m02RequestSequence('order_1')[0],
      T0 + STEP,
      pending.h.sink,
    );
    expect(
      extractItemFeatures('M02', pending.h.events, OPEN_CONTEXT).map((row) => [
        row.value,
        row.disposition,
      ]),
    ).toEqual([
      [null, 'pending'],
      [null, 'pending'],
      [null, 'pending'],
    ]);

    // A requested case the frozen layout does not hold: excluded, never incorrect.
    const missing = started('order_1');
    const sequence = m02RequestSequence('order_1');
    const partial = trayLayout();

    delete partial[sequence[1]];
    m02HandOver(missing.s, partial, T0, 'pointer', missing.h.sink);

    let t = T0;

    for (const caseId of sequence.filter((id) => id !== sequence[1])) {
      t += STEP;
      pick(missing.s, partial, caseId, t, missing.h.sink);
    }

    expect(missing.s.requests[1]).toMatchObject({
      accessible: false,
      answer: null,
    });
    expect(missing.h.ofType('request_inaccessible')).toHaveLength(1);
    expect(m02Finish(missing.s, t, missing.h.sink)).toBe(true);
    expect(m02FeedbackText(m02Feedback(missing.s)[1])).toBe(
      '2. R-07: not available',
    );
    missing.h.close(missing.s);

    const missingRows = extractItemFeatures('M02', missing.h.events, CONTEXT);

    expect(missingRows[0]).toMatchObject({
      value: 5,
      numerator: 5,
      denominator: 5,
      disposition: 'incomplete',
      censored: true,
      censor_reason: 'a requested case was technically inaccessible',
    });
    expect(missingRows[0].included_ids).not.toContain('m02_request_2');
    expect(
      (missingRows[1].value as Record<string, { status: string }>).request_2
        .status,
    ).toBe('inaccessible');

    // The window record disagrees with the raw answers: technical failure.
    const tampered = started('order_1');

    m02HandOver(tampered.s, layout, T0, 'pointer', tampered.h.sink);
    t = T0;

    for (const caseId of sequence) {
      t += STEP;
      pick(tampered.s, layout, caseId, t, tampered.h.sink);
    }

    m02Finish(tampered.s, t, tampered.h.sink);
    tampered.h.push('window_closed', {
      exit_state: 'completed',
      raw_components: {
        ...m02RawComponents(tampered.s, 'completed'),
        correct_first_retrievals: 2,
      },
    });

    // Totals that agree while a request does not: still a technical failure.
    const swapped = started('order_1');

    m02HandOver(swapped.s, layout, T0, 'pointer', swapped.h.sink);
    t = T0;

    for (const caseId of sequence) {
      t += STEP;
      pick(swapped.s, layout, caseId, t, swapped.h.sink);
    }

    m02Finish(swapped.s, t, swapped.h.sink);

    const honest = m02RawComponents(swapped.s, 'completed');

    swapped.h.push('window_closed', {
      exit_state: 'completed',
      raw_components: {
        ...honest,
        requests: honest.requests.map((request, index) =>
          index === 0
            ? { ...request, requested_case: sequence[1] }
            : index === 1
              ? { ...request, requested_case: sequence[0] }
              : request,
        ),
      },
    });
    expect(
      extractItemFeatures('M02', swapped.h.events, CONTEXT).map((row) => [
        row.value,
        row.disposition,
      ]),
    ).toEqual([
      [null, 'technical_failure'],
      [null, 'technical_failure'],
      [expect.anything(), 'observed'],
    ]);

    // A second answer to one request voids the row (the model cannot emit one).
    const doubled = started('order_1');

    m02HandOver(doubled.s, layout, T0, 'pointer', doubled.h.sink);
    t = T0;

    for (const caseId of sequence) {
      t += STEP;
      pick(doubled.s, layout, caseId, t, doubled.h.sink);
    }

    m02Finish(doubled.s, t, doubled.h.sink);
    doubled.h.push('request_answered', {
      ...doubled.h.ofType('request_answered')[0].metadata,
    });
    doubled.h.close(doubled.s);
    expect(
      extractItemFeatures('M02', doubled.h.events, CONTEXT)[0],
    ).toMatchObject({ value: null, disposition: 'technical_failure' });

    const tamperedRows = extractItemFeatures('M02', tampered.h.events, CONTEXT);

    expect(tamperedRows[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
    expect(tamperedRows[0].components).toMatchObject({
      recount_agrees: false,
      correct_recount: 6,
    });
    expect(tamperedRows[1]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
  });
});
