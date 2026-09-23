/**
 * Pilot route — Return, Revision & Handover (evidence-led pilot v2, Unit 5).
 *
 * Real participant navigation from the Dock (no developer boots):
 *
 * 1. The complete return shift with every obligation accepted and a valid
 *    antenna start: the ONE purposeful return (yard → laboratory →
 *    Concourse), the changed station status, M10 handover to Kai and the
 *    M09 gauge check 2 as separate acts, Vale's neutral check-in, the
 *    workshop return shift — M03 occasion 2 (Press B, one residual
 *    stored), M07 end to completion, the persisted M20 feed console
 *    resumed and completed, M21 with a wrong-first application revised
 *    after a relevant restudy (unit 1) and a first-time success (unit 2),
 *    M22 with the standardised setback and a mismatched-tag
 *    revision, the M25 questionnaire handoff, the outbound handover, the
 *    board sign-off; item-owned timing against the 265 s envelope.
 * 2. Omissions and independence: watch accepted / promise declined,
 *    NO antenna start (missing start → resume unavailable, never a
 *    fabricated start), NO M07 start (end opportunity with a missing
 *    start), map + inventory opened between the obligation start and end,
 *    the core console locked before the sign-off, M21 exited early then
 *    M22 completed anyway, Press B left untouched (valid observation),
 *    repeated workshop entry preserving every state, the gauge read and
 *    Kai met without a handover.
 * 3. Handover with the gauge omitted, a partial antenna start resumed
 *    but not completable inside, M22 withdrawn after the setback (a
 *    completed observation with recovery false), an insufficient-exposure
 *    Press B (invalid, never low), held ENTER never double-submitting, the
 *    inventory-full relay unit delivered as a bench bundle.
 *
 * All checks read DEV probes and the research event buffer; input is real
 * keyboard/pointer traffic. Retries 0, workers 1.
 */
import { expect, test } from '@playwright/test';

import { getEvents, hold, press, selectPromptOption } from './helpers';
import {
  concourseToWorkshop,
  expectStage,
  pilotProbe,
  walkTo,
  workshopToConcourse,
} from './pilotHelpers';
import {
  acknowledgeQuestionnaireNotice,
  assembleReport,
  assertCoreLockedThenReturn,
  attachCode,
  calibrationReturn,
  captureErrors,
  clickElement,
  closeSurface,
  codeFor,
  enterConcourseWithOffers,
  eventsByPrefix,
  eventsByType,
  expectNoRuntimeErrors,
  exteriorShift,
  FORBIDDEN_TEXT,
  handOverToKai,
  itemStatus,
  keyActivate,
  lastFeedback,
  lastPromptBody,
  M22_TAG,
  meetKaiWithoutHandover,
  openFeedConsole,
  openHandoverDesk,
  openWorkshopPrompt,
  openWorkshopSurface,
  OPPORTUNITY,
  placeOutbound,
  placeThreeLines,
  pressBatchB,
  promptCardLabels,
  readGauge,
  repairRelay,
  resumeAntenna,
  RETURN,
  returnInside,
  returnProbe,
  signOffReturnShift,
  submitReport,
  surface,
  surfaceElement,
  uiProbe,
  valeReturnCheckIn,
  validityRecord,
  waitSurface,
  workshopRestorationShift,
} from './returnHelpers';

const RETURN_FAMILIES = [
  'proto_m03_',
  'proto_m07_calibration_',
  'proto_m09_watch_',
  'proto_m10_promise_',
  'proto_m20_antenna_',
  'proto_m21_case_',
  'proto_m22_returned_',
  'proto_m25_probe_',
];

function meta(event: { metadata?: Record<string, unknown> }) {
  return event.metadata ?? {};
}

test.describe('pilot route — Return, Revision & Handover (Unit 5)', () => {
  test('1. the complete return shift: one purposeful return, every obligation, the persisted antenna resumed, manual repair, setback revision, questionnaire handoff, item-owned timing', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);
    const startedAt = Date.now();

    await enterConcourseWithOffers(page, 'ret1', {
      watch: 'accept',
      promise: 'accept',
      readGauge1: true,
    });
    await workshopRestorationShift(page, { startCalibration: true });
    await exteriorShift(page, 'full');

    // ——— The ONE purposeful return: yard → laboratory → Concourse. ———
    await returnInside(page);

    let probe = await pilotProbe(page);

    expect(probe?.stage).toBe('return_hub');
    expect(probe?.objective).toContain('Vale');
    expect(probe?.objective).not.toMatch(FORBIDDEN_TEXT);
    // The obligation stays in the log neutrally; no reminder anywhere else.
    expect(probe?.mission_log.map((e) => e.text).join(' ')).toContain(
      'Mast 04',
    );
    expect(await lastFeedback(page)).not.toMatch(/Mast|gauge|card/);
    expect(await itemStatus(page, 'M20')).toBe('open');
    expect(
      (await eventsByType(page, 'proto_m09_watch_check_window_opened')).map(
        (e) => meta(e).check,
      ),
    ).toEqual(['check1', 'check2']);

    // ——— M10 handover to Kai (option chosen; Kai never asks). ———
    await handOverToKai(page);
    expect(await lastFeedback(page)).not.toMatch(/thank|good|well done/i);

    const m10 = await validityRecord(page, OPPORTUNITY.m10);

    expect(m10.completed).toBe(true);
    expect(m10.validity).toBe('valid');

    const m10Closed = (
      await eventsByType(page, 'proto_m10_promise_window_closed')
    )[0];
    const m10Raw = meta(m10Closed).raw_components as Record<string, unknown>;

    expect(m10Raw.promise_fulfilled).toBe(true);
    expect(m10Raw.interruption_exposure).toBe(true);
    expect(m10Raw.phase).toBe('end');
    expect(m10Raw.start_window_id).toBe('m10_promise_accept');
    expect(m10Raw.end_window_id).toBe('m10_promise_handover');
    expect(typeof m10Raw.handover_delay_ms).toBe('number');
    expect(meta(m10Closed).window_id).toBe('m10_promise_handover');

    // ——— M09 gauge check 2 (a separate act on a separate object). ———
    await readGauge(page);
    expect(await lastFeedback(page)).toContain('1.4 bar');

    const check2 = (
      await eventsByType(page, 'proto_m09_watch_check_completed')
    ).find((e) => meta(e).check === 'check2');

    expect(check2).toBeDefined();
    expect(meta(check2!).window_id).toBe('m09_check_2');
    expect(meta(check2!).phase).toBe('end');
    expect(meta(check2!).start_window_id).toBe('m09_check_1');
    expect(await itemStatus(page, 'M09')).toBe('completed');

    const m09Closed = (
      await eventsByType(page, 'proto_m09_watch_window_closed')
    )[0];
    const m09Raw = meta(m09Closed).raw_components as Record<string, unknown>;

    expect(m09Raw.check1_completed).toBe(true);
    expect(m09Raw.check2_completed).toBe(true);
    expect(typeof m09Raw.due_delta_2).toBe('number');
    expect(m09Raw).not.toHaveProperty('promise_fulfilled');
    expect(m10Raw).not.toHaveProperty('check2_completed');

    // ——— Vale's neutral check-in → the workshop return shift. ———
    await valeReturnCheckIn(page);
    probe = await pilotProbe(page);
    expect(probe?.stage).toBe('workshop_return');
    expect(probe?.zone).toBe('records_workshop');
    expect(probe?.objective).not.toMatch(FORBIDDEN_TEXT);
    expect(probe?.beacon?.label).toBe('Label Press B');

    let rp = await returnProbe(page);

    // The resume opportunity is PRESENTED on entry with the persisted start.
    expect(rp.m20.resume_presented).toBe(true);
    expect(rp.m20.availability).toMatchObject({
      available: true,
      history: 'valid',
    });
    expect(rp.m20.outdoor_stages_done).toEqual([
      'clear_base_clamp',
      'seat_feed_line',
    ]);
    expect(rp.m20.returned).toBe(false);
    expect(rp.m20.status).toContain('ALIGNMENT PENDING');
    expect(
      (await eventsByType(page, 'proto_m20_antenna_resume_presented')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m07_calibration_end_presented')).length,
    ).toBe(1);
    expect(
      meta((await eventsByType(page, 'proto_m07_calibration_end_presented'))[0])
        .start_state,
    ).toBe('present');

    // ——— M03 occasion 2: Press B, one residual stored, panel closed. ———
    await pressBatchB(page, { store: 1, exposureMs: 2600 });

    const m03b = await validityRecord(page, OPPORTUNITY.m03b);
    const m03a = await validityRecord(page, OPPORTUNITY.m03a);

    expect(m03b.completed).toBe(true);
    expect(m03b.validity).toBe('valid');
    expect(m03a.entered).toBe(false); // occasion A untouched by occasion B

    const m03Departure = (
      await eventsByType(page, 'proto_m03_surface_state_at_departure')
    ).find((e) => meta(e).occasion === 'o2')!;

    expect(meta(m03Departure).window_id).toBe('m03_reset_o2');
    expect(meta(m03Departure).opportunity_id).toBe(OPPORTUNITY.m03b);
    expect(meta(m03Departure).objects_restored).toBe(1);
    expect(meta(m03Departure).homes_correct).toBe(1);
    expect(meta(m03Departure).residual_total).toBe(5);
    expect(meta(m03Departure).close_state).toBe('panel_closed');
    expect(meta(m03Departure).exposure_sufficient).toBe(true);
    expect(
      (await eventsByPrefix(page, 'proto_m03_')).every(
        (e) => meta(e).occasion === 'o2',
      ),
    ).toBe(true);

    // ——— M07 end: the bench resumes at stage 1 and runs to completion. ———
    const benchProbe = await calibrationReturn(page, 5);

    expect(benchProbe?.elements.find((e) => e.id === 'stage_6')?.state).toBe(
      'done',
    );
    expect(await itemStatus(page, 'M07')).toBe('completed');

    const m07Closed = (
      await eventsByType(page, 'proto_m07_calibration_window_closed')
    )[0];
    const m07Raw = meta(m07Closed).raw_components as Record<string, unknown>;

    expect(m07Raw).toMatchObject({
      stages_completed: 6,
      voluntary_returns: 1,
      completion: true,
      start_state: 'present',
      end_presented: true,
      phase: 'end',
      start_window_id: 'm07_calibration_start',
      end_window_id: 'm07_calibration_end',
    });
    expect(meta(m07Closed).window_id).toBe('m07_calibration_end');
    expect(
      (await eventsByType(page, 'proto_m07_calibration_returned')).length,
    ).toBe(1);

    // ——— M20 resume at the feed console: resume, three console stages. ———
    await resumeAntenna(page, 3);
    rp = await returnProbe(page);
    expect(rp.m20.returned).toBe(true);
    expect(rp.m20.completion).toBe(true);
    expect(rp.m20.useful_resume_actions).toBe(3);
    expect(rp.m20.window).toBe('closed');
    expect(rp.m20.exit).toBe('completed');
    expect(rp.m20.window_id).toBe('m20_antenna_resume');
    expect(typeof rp.m20.resume_latency).toBe('number');
    expect(rp.m20.status).toContain('restoration complete');
    expect(await itemStatus(page, 'M20')).toBe('completed');
    expect(
      (await pilotProbe(page))?.mission_log.map((e) => e.text).join(' '),
    ).not.toContain('Mast 04');

    const m20Events = await eventsByPrefix(page, 'proto_m20_antenna_');
    const startEvents = m20Events.filter(
      (e) => meta(e).window_id === 'm20_antenna_start',
    );
    const resumeEvents = m20Events.filter(
      (e) => meta(e).window_id === 'm20_antenna_resume',
    );

    expect(startEvents.map((e) => e.event_type)).toEqual(
      expect.arrayContaining([
        'proto_m20_antenna_accepted',
        'proto_m20_antenna_stage_completed',
        'proto_m20_antenna_interruption_recorded',
      ]),
    );
    expect(
      startEvents.some((e) => e.event_type.endsWith('window_closed')),
    ).toBe(false);
    expect(resumeEvents.map((e) => e.event_type)).toEqual([
      'proto_m20_antenna_resume_presented',
      'proto_m20_antenna_console_inspected',
      'proto_m20_antenna_returned',
      'proto_m20_antenna_indoor_stage_completed',
      'proto_m20_antenna_indoor_stage_completed',
      'proto_m20_antenna_indoor_stage_completed',
      'proto_m20_antenna_window_closed',
    ]);

    for (const event of resumeEvents) {
      // The kit's closure carries the linking fields inside raw_components.
      const phase =
        meta(event).phase ??
        (meta(event).raw_components as { phase?: string } | undefined)?.phase;

      expect(phase, event.event_type).toBe('end');
      expect(meta(event).opportunity_id).toBe(OPPORTUNITY.m20);
    }

    const m20Raw = meta(resumeEvents[resumeEvents.length - 1])
      .raw_components as Record<string, unknown>;

    expect(Object.keys(m20Raw)).toEqual(
      expect.arrayContaining([
        'progress_pre_interruption',
        'returned',
        'resume_latency',
        'useful_resume_actions',
        'completion',
      ]),
    );
    expect(m20Raw.progress_pre_interruption).toBe(2);
    expect(m20Raw.start_history).toBe('valid');

    // ——— M21 (Unit 10): unit 1 — wrong jumper first, truthful fault, relevant
    // restudy, revised application accepted; unit 2 — first-time success. ———
    await repairRelay(page, { wrongFirst: true, fit: true });
    rp = await returnProbe(page);
    expect(rp.m21.all_closed).toBe(true);
    expect(rp.m21.o1).toMatchObject({
      window: 'closed',
      exit: 'completed',
      accepted: true,
      applications: 2,
      first_application_correct: false,
      first_application_faults: ['posts'],
      relevant_restudy: true,
      revised_application: true,
      restudy_revision: true,
      strategy: 'restudy_and_revise',
      correct_rule_application: true,
      reference_sections_used: 4,
      cross_reference_depth: 2,
      diagram_mode_used: true,
      plate_inspected: true,
      output_delivery: 'inventory',
    });
    expect(rp.m21.o2).toMatchObject({
      window: 'closed',
      exit: 'completed',
      accepted: true,
      applications: 1,
      first_application_correct: true,
      restudy_revision: null,
      strategy: 'first_correct',
      output_delivery: 'released',
    });
    expect(await itemStatus(page, 'M21')).toBe('completed');

    const m21Events = await eventsByPrefix(page, 'proto_m21_case_');
    const m21Types = new Set(m21Events.map((e) => e.event_type));

    for (const required of [
      'proto_m21_case_presented',
      'proto_m21_case_opportunity_opened',
      'proto_m21_case_case_placed',
      'proto_m21_case_plate_inspected',
      'proto_m21_case_section_consulted',
      'proto_m21_case_mode_switched',
      'proto_m21_case_post_set',
      'proto_m21_case_selector_set',
      'proto_m21_case_applied',
      'proto_m21_case_feedback_presented',
      'proto_m21_case_restudy',
      'proto_m21_case_revised_application',
      'proto_m21_case_accepted',
      'proto_m21_case_window_closed',
    ]) {
      expect(m21Types, required).toContain(required);
    }

    const applied = await eventsByType(page, 'proto_m21_case_applied');

    expect(
      applied.map((e) => [meta(e).case, meta(e).index, meta(e).correct]),
    ).toEqual([
      ['o1', 1, false],
      ['o1', 2, true],
      ['o2', 1, true],
    ]);
    expect(meta(applied[1]).relevant_restudy).toBe(true);
    expect(meta(applied[1]).revised).toBe(true);
    // Both input modes reached the same engine.
    expect(new Set(m21Events.map((e) => meta(e).input_mode))).toEqual(
      new Set(['system', 'keyboard', 'pointer']),
    ); // Both input modes reached the same engine.
    expect(new Set(m21Events.map((e) => meta(e).input_mode))).toEqual(
      new Set(['system', 'keyboard', 'pointer']),
    );

    // ——— M22 (Unit 11): report 1 — assemble, submit, requirement, acknowledge,
    // register, a mismatched tag, returned again, matching tags, accepted;
    // report 2 placed — submit, requirement, acknowledge, withdraw (exit);
    // then one rating per returned report. ———
    const placed = await assembleReport(page);

    expect(placed).toHaveLength(3);

    let feedback = await submitReport(page);

    expect(feedback).toMatch(/returned by the receiving desk/i);
    rp = await returnProbe(page);
    expect(rp.m22.active).toBe('o1');
    expect(rp.m22.o1.phase).toBe('returned');
    expect(rp.m22.o1.requirement_presented).toBe(true);
    expect((await surfaceElement(page, 'returned_note'))?.label).toContain(
      'work-order tag',
    );
    expect(await surfaceElement(page, 'code_WO-11')).not.toBeNull();
    // Editing before the acknowledgement is refused (comprehension first).
    expect((await surfaceElement(page, 'submit'))?.state).toBe('disabled');
    await press(page, 'k');
    await page.waitForTimeout(300);
    rp = await returnProbe(page);
    expect(rp.m22.o1.setback_comprehension).toBe(true);
    await clickElement(page, 'register_toggle');
    expect((await surfaceElement(page, 'register'))?.label).toContain(
      'WORK-ORDER REGISTER',
    );

    // A mismatched tag on line 1, then resubmit → returned again, actionable count.
    const wrongTag = Object.values(M22_TAG).find(
      (tag) => tag !== M22_TAG[placed[0]],
    )!;

    await attachCode(page, 0, wrongTag);
    feedback = await submitReport(page);
    expect(feedback).toContain(
      'lines still without a matching work-order tag: 3',
    );
    rp = await returnProbe(page);
    expect(rp.m22.o1.mismatched_code_edits).toBe(1);
    expect(rp.m22.o1.resubmitted).toBe(true);
    expect(rp.m22.o1.recovery_complete).toBe(false);

    for (const [slot, lineId] of placed.entries()) {
      await attachCode(page, slot, M22_TAG[lineId]);
    }

    rp = await returnProbe(page);
    expect(rp.m22.o1.progress).toEqual({ coded: 3, placed: 3 });
    feedback = await submitReport(page);
    expect(feedback).toContain('accepted');
    rp = await returnProbe(page);
    expect(rp.m22.o1).toMatchObject({
      phase: 'accepted',
      window: 'closed',
      exit: 'completed',
      revision_begun: true,
      resubmitted: true,
      recovery_complete: true,
      feedback_consistent_edits: 4,
      inspections: 1,
      repeated_unchanged_action: 0,
    });
    // Report 2 is placed at once (its window open); the item stays open.
    expect(rp.m22.active).toBe('o2');
    expect(rp.m22.o2.window).toBe('open');
    expect(await itemStatus(page, 'M22')).toBe('open');

    // Report 2: past the placement settle window, assemble, submit → its own
    // requirement, acknowledge, then WITHDRAW (an exit after the requirement).
    await page.waitForTimeout(1_600);
    const placed2 = await placeThreeLines(page);

    expect(placed2.every((id) => id.startsWith('c_'))).toBe(true);
    feedback = await submitReport(page);
    expect(feedback).toMatch(/returned by the outbound desk/i);
    expect((await surfaceElement(page, 'returned_note'))?.label).toContain(
      'destination bay',
    );
    expect(await surfaceElement(page, 'code_BAY-A')).not.toBeNull();
    await press(page, 'k');
    await page.waitForTimeout(300);
    await clickElement(page, 'withdraw_o2');
    await page.waitForTimeout(400);
    rp = await returnProbe(page);
    expect(rp.m22.o2).toMatchObject({
      phase: 'closed',
      window: 'closed',
      exit: 'stopped',
      stop_choice: 'withdrawn',
      requirement_presented: true,
      setback_comprehension: true,
      revision_begun: false,
      exited: true,
    });
    expect(rp.m22.all_decided).toBe(true);

    // The ratings: one per returned report, after both decisions.
    expect(rp.m22.rating_due).toBe('o1');
    expect((await surface(page))?.title).toContain('ONE QUESTION (1 OF 2)');
    await page.waitForTimeout(1_100); // the rating screen's settle window
    await press(page, '2');
    await page.waitForTimeout(300);
    rp = await returnProbe(page);
    expect(rp.m22.ratings.o1).toMatchObject({ value: 2, declined: false });
    expect(rp.m22.ratings.o1?.recall_delay_ms).toBeGreaterThan(0);
    expect(rp.m22.rating_due).toBe('o2');
    await page.waitForTimeout(1_100);
    await clickElement(page, 'rating_decline');
    await page.waitForTimeout(300);
    rp = await returnProbe(page);
    expect(rp.m22.ratings.o2).toMatchObject({ value: null, declined: true });
    expect(rp.m22.desk_done).toBe(true);
    await clickElement(page, 'leave');
    await waitSurface(page, false);
    expect(await itemStatus(page, 'M22')).toBe('completed');

    const m22Events = await eventsByPrefix(page, 'proto_m22_returned_');
    const m22Types = m22Events.map((e) => e.event_type);

    expect(m22Types).toEqual(
      expect.arrayContaining([
        'proto_m22_returned_line_placed',
        'proto_m22_returned_submitted',
        'proto_m22_returned_setback_presented',
        'proto_m22_returned_setback_acknowledged',
        'proto_m22_returned_register_inspected',
        'proto_m22_returned_code_attached',
        'proto_m22_returned_resubmitted',
        'proto_m22_returned_accepted',
        'proto_m22_returned_report_placed',
        'proto_m22_returned_withdrawn',
        'proto_m22_returned_rating_presented',
        'proto_m22_returned_rating_answered',
        'proto_m22_returned_rating_declined',
        'proto_m22_returned_window_closed',
      ]),
    );
    expect(
      m22Events
        .filter((e) => e.event_type === 'proto_m22_returned_submitted')
        .map((e) => [meta(e).report, meta(e).outcome]),
    ).toEqual([
      ['o1', 'setback'],
      ['o1', 'returned_again'],
      ['o1', 'accepted'],
      ['o2', 'setback'],
    ]);

    // M21 and M22 share no event, object or counter.
    expect(
      m21Events.some((e) => JSON.stringify(meta(e)).includes('report')),
    ).toBe(false);
    expect(
      m22Events.some((e) => JSON.stringify(meta(e)).includes('post_set')),
    ).toBe(false);
    expect(new Set(m21Events.map((e) => e.object_id))).toEqual(
      new Set(['m21_relay_bench']),
    );
    expect(new Set(m22Events.map((e) => e.object_id))).toEqual(
      new Set(['m22_report_desk']),
    );

    // ——— M25 handoff shell + the outbound handover. ———
    const notice = await acknowledgeQuestionnaireNotice(page);

    expect(notice).not.toMatch(/repeat|same thing|normal/i);
    rp = await returnProbe(page);
    expect(rp.m25).toMatchObject({
      window: 'closed',
      exit: 'completed',
      handoff: 'acknowledged',
      direct_belief_probe: null,
      in_game_response: null,
      administration: 'questionnaire_primary_pending_external',
    });
    expect(await itemStatus(page, 'M25')).toBe('completed');

    const m25Events = await eventsByPrefix(page, 'proto_m25_probe_');

    expect(m25Events.map((e) => e.event_type)).toEqual([
      'proto_m25_probe_presented',
      'proto_m25_probe_opportunity_opened',
      'proto_m25_probe_handoff_acknowledged',
      'proto_m25_probe_window_closed',
    ]);
    expect(
      JSON.stringify(meta(m25Events[m25Events.length - 1]).raw_components),
    ).not.toMatch(/"direct_belief_probe":[^n]/);

    const outbound = await placeOutbound(page);

    expect(outbound.some((label) => /relay unit/.test(label))).toBe(true);
    rp = await returnProbe(page);
    expect(rp.handover.relay_unit).toBe(true);
    expect(
      (await eventsByType(page, 'pilot_handover_placed')).map(
        (e) => meta(e).item,
      ),
    ).toContain('relay_unit');

    // ——— Every return family: required fields; no participant text leaks. ———
    for (const family of RETURN_FAMILIES) {
      for (const event of await eventsByPrefix(page, family)) {
        const m = meta(event);

        expect(typeof m.opportunity_id, event.event_type).toBe('string');
        expect(typeof m.window_id, event.event_type).toBe('string');

        // M03 rides the inventory module's own event shape (occasion +
        // starting condition); the kit contract applies to the others.
        if (family === 'proto_m03_') {
          expect(typeof m.occasion, event.event_type).toBe('string');
          expect(typeof m.starting_condition, event.event_type).toBe('string');
        } else {
          expect(typeof m.validity_status, event.event_type).toBe('string');
          expect(typeof m.input_mode, event.event_type).toBe('string');
        }

        expect(event.study_item_ids ?? undefined).toBeUndefined();
        expect(event.construct_id ?? undefined).toBeUndefined();
        expect(event.success ?? undefined).toBeUndefined();
      }
    }

    // ——— Sign-off → the route points at the Utility Deck; nothing closed. ———
    await signOffReturnShift(page);
    probe = await pilotProbe(page);
    // V4 story spine (f6e051f, storyState.ts): the displayed line narrows
    // the deck_closure objective to the zone's own wayfinding step — inside
    // the workshop it names the Concourse east door; "Utility Deck — east
    // door." appears once the participant stands in the Concourse. The
    // route stage carries the destination.
    expect(probe?.objective).toMatch(/Concourse — east door/);
    expect(probe?.objective).not.toMatch(FORBIDDEN_TEXT);
    expect((await pilotProbe(page))?.route.stage).toBe('deck_closure');
    expect(
      (await getEvents(page)).some(
        (e) => e.event_type === 'pilot_final_core_synchronised',
      ),
    ).toBe(false);

    // ——— Timing: item-owned active time vs the 265 s planning envelope.
    // Surface windows report `active_ms` (paused whenever their surface is
    // closed); M03 o2 is its exposure; M09 check 2 is its due→read delta;
    // the M10 handover is one prompt option (a few seconds, not measured
    // separately: its window spans the whole route by design). ———
    const closed = (await getEvents(page)).filter(
      (e) =>
        e.event_type.endsWith('_window_closed') &&
        /^proto_m(07|20|21|22|25)_/.test(e.event_type),
    );
    const activeMs = closed.reduce(
      (sum, e) =>
        sum + Number((e.metadata as { active_ms?: number }).active_ms ?? 0),
      0,
    );
    const m03Ms = Number(meta(m03Departure).exposure_ms ?? 0);
    const m09Ms = Number(m09Raw.due_delta_2 ?? 0);
    const total = activeMs + m03Ms + m09Ms;

    // eslint-disable-next-line no-console
    console.log(
      `return shift: item-owned active ${Math.round(total / 1000)} s (surfaces ${Math.round(activeMs / 1000)} s · M03 o2 ${Math.round(m03Ms / 1000)} s · M09 check 2 ${Math.round(m09Ms / 1000)} s); wall ${Math.round((Date.now() - startedAt) / 1000)} s from the Dock`,
    );
    expect(total).toBeLessThanOrEqual(265_000);
    expectNoRuntimeErrors(errors);
  });

  test('2. omissions and independence: missing antenna start, missing calibration start, promise declined, overlays between start and end, core locked, M21 exited then M22 completed, Press B untouched, repeated entry', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await enterConcourseWithOffers(page, 'ret2', {
      watch: 'accept',
      promise: 'decline',
      readGauge1: false,
    });
    await workshopRestorationShift(page, { startCalibration: false });
    await exteriorShift(page, 'none');
    await returnInside(page);

    // Map and inventory opened between the obligation start and end.
    await press(page, 'm');
    await page.waitForFunction(
      () =>
        (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
          .__pilotMapProbe?.open === true,
      undefined,
      { timeout: 5000 },
    );
    await press(page, 'Escape');
    await page.waitForTimeout(500);
    await press(page, 'i');
    await page.waitForFunction(
      () =>
        (window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
          .__inventoryUiProbe?.open === true,
      undefined,
      { timeout: 8000 },
    );
    await press(page, 'Escape');
    await page.waitForTimeout(500);

    // M09 check 2 completed (check 1 was skipped: a completed-false fact).
    await readGauge(page);

    const check1Closed = (
      await eventsByType(page, 'proto_m09_watch_check_window_closed')
    ).find((e) => meta(e).check === 'check1')!;

    expect(meta(check1Closed).completed).toBe(false);
    expect(meta(check1Closed).reason).toBe('milestone_passed');
    expect(await itemStatus(page, 'M09')).toBe('completed');

    const m09Raw = meta(
      (await eventsByType(page, 'proto_m09_watch_window_closed'))[0],
    ).raw_components as Record<string, unknown>;

    expect(m09Raw.check1_completed).toBe(false);
    expect(m09Raw.check2_completed).toBe(true);
    expect((await validityRecord(page, OPPORTUNITY.m09)).validity).toBe(
      'valid',
    );

    // The declined promise closed at acceptance; Kai offers nothing to hand over.
    const kaiLabels = await meetKaiWithoutHandover(page);

    expect(kaiLabels.some((label) => /Hand over/.test(label))).toBe(false);
    expect(await lastPromptBody(page)).not.toMatch(/card|hand/i);
    expect(
      (
        meta((await eventsByType(page, 'proto_m10_promise_window_closed'))[0])
          .raw_components as Record<string, unknown>
      ).cutoff_state,
    ).toBe('declined');
    expect((await validityRecord(page, OPPORTUNITY.m10)).validity).toBe(
      'valid',
    );

    await valeReturnCheckIn(page);

    // Missing antenna start: the console is unavailable, no start fabricated.
    let rp = await returnProbe(page);

    expect(rp.m20.availability).toMatchObject({
      available: false,
      history: 'missing',
    });
    expect(rp.m20.resume_presented).toBe(false);
    expect(
      (await eventsByType(page, 'proto_m20_antenna_resume_unavailable')).length,
    ).toBe(1);
    expect(
      meta(
        (await eventsByType(page, 'proto_m20_antenna_resume_unavailable'))[0],
      ).reason,
    ).toBe('start_missing');
    expect(await eventsByType(page, 'proto_m20_antenna_accepted')).toHaveLength(
      0,
    );
    expect(
      await eventsByType(page, 'proto_m20_antenna_resume_presented'),
    ).toHaveLength(0);
    await openWorkshopPrompt(page, 'feedConsole');
    expect(await lastPromptBody(page)).toContain('no feed-alignment job');
    expect(await promptCardLabels(page)).toEqual(['Step away']);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(300);
    expect(await eventsByType(page, 'proto_m20_antenna_returned')).toHaveLength(
      0,
    );
    expect((await returnProbe(page)).m20.returned).toBe(false);

    // Missing calibration start: the end opportunity is presented as such.
    const m07Presented = (
      await eventsByType(page, 'proto_m07_calibration_end_presented')
    )[0];

    expect(meta(m07Presented).start_state).toBe('missing');
    expect(meta(m07Presented).window_id).toBe('m07_calibration_end');

    // The core console is locked before the sign-off (route detour and back).
    await assertCoreLockedThenReturn(page);
    await expectStage(page, 'workshop_return');

    // M07 end with the missing start: open, one stage, leave (never low).
    await calibrationReturn(page, 1);
    expect(
      (
        await eventsByType(
          page,
          'proto_m07_calibration_end_opened_without_start',
        )
      ).length,
    ).toBe(1);
    expect(await itemStatus(page, 'M07')).toBe('open');
    expect((await validityRecord(page, OPPORTUNITY.m07)).validity).toBe(
      'pending',
    );

    // M21 exited early after one manual consult: unit 1's window stays open.
    await openWorkshopSurface(page, 'relayBench', 'm21_relay_bench');
    await clickElement(page, 'section_s1_identify');
    await closeSurface(page);
    rp = await returnProbe(page);
    expect(rp.m21.o1.window).toBe('open');
    expect(rp.m21.o1.departures).toBe(1);
    expect(rp.m21.o1.accepted).toBe(false);
    expect(rp.m21.o2.window).toBe('unopened');
    expect(await itemStatus(page, 'M21')).toBe('open');

    // M22 completes regardless of M21 (independence).
    const placed = await assembleReport(page);

    await submitReport(page);
    await press(page, 'k');
    await page.waitForTimeout(300);
    // An unchanged resubmission is counted and returns the same note.
    let feedback = await submitReport(page);

    expect(feedback).toContain('unchanged');
    rp = await returnProbe(page);
    expect(rp.m22.o1.repeated_unchanged_action).toBe(1);

    for (const [slot, lineId] of placed.entries()) {
      await attachCode(page, slot, codeFor(lineId));
    }

    feedback = await submitReport(page);
    expect(feedback).toContain('accepted');
    await clickElement(page, 'leave');
    await waitSurface(page, false);
    rp = await returnProbe(page);
    expect(rp.m22.o1.recovery_complete).toBe(true);
    expect(rp.m22.o2.window).toBe('open'); // report 2 placed, then left
    expect(rp.m21.o1.accepted).toBe(false);
    expect(await itemStatus(page, 'M22')).toBe('open');
    expect(await itemStatus(page, 'M21')).toBe('open');

    // Press B left untouched with sufficient exposure: a valid observation.
    await pressBatchB(page, { store: 0, exposureMs: 2600 });

    const m03b = await validityRecord(page, OPPORTUNITY.m03b);
    const departure = (
      await eventsByType(page, 'proto_m03_surface_state_at_departure')
    ).find((e) => meta(e).occasion === 'o2')!;

    expect(m03b.completed).toBe(true);
    expect(m03b.validity).toBe('valid');
    expect(meta(departure).objects_restored).toBe(0);
    expect(meta(departure).left_count).toBe(5);
    expect(meta(departure).move_count).toBe(0);
    expect(meta(departure).exposure_sufficient).toBe(true);
    // Occasion A was never run in this session: the item summary is the least
    // terminal of its two instances (`pending`), never a low value.
    expect(await itemStatus(page, 'M03')).toBe('pending');
    expect((await validityRecord(page, OPPORTUNITY.m03a)).entered).toBe(false);

    // The handover desk with nothing to hand over: a neutral equivalent
    // (no relay unit) — the notice is still offered.
    const labels = await openHandoverDesk(page);

    expect(labels.some((label) => /^Place the/.test(label))).toBe(false);
    expect(labels.some((label) => /questionnaire notice/i.test(label))).toBe(
      true,
    );
    await selectPromptOption(page, labels.length);
    await page.waitForTimeout(300);

    // Repeated workshop entry: every state persists across scene recreation.
    await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
    await workshopToConcourse(page);
    await concourseToWorkshop(page);
    rp = await returnProbe(page);
    expect(rp.m21.window).toBe('open');
    expect(rp.m21.sections_consulted).toEqual(['s1_identify']);
    expect(rp.m22.o1.phase).toBe('accepted');
    expect(rp.m20.availability.history).toBe('missing');
    expect(
      (await eventsByType(page, 'proto_m20_antenna_resume_unavailable')).length,
    ).toBe(1); // once
    expect(
      (await eventsByType(page, 'proto_m07_calibration_end_presented')).length,
    ).toBe(1);
    expect(await itemStatus(page, 'M07')).toBe('open');

    await openWorkshopSurface(
      page,
      'calibrationBench',
      'm07_calibration_bench',
    );
    expect((await surfaceElement(page, 'stage_1'))?.state).toBe('done');
    await closeSurface(page);

    // M21 reopened after the departure is a reengagement; set aside = explicit stop.
    await openWorkshopSurface(page, 'relayBench', 'm21_relay_bench');
    rp = await returnProbe(page);
    expect(rp.m21.o1.reengagement).toBe(1);
    await clickElement(page, 'set_aside');
    await waitSurface(page, false);
    rp = await returnProbe(page);
    expect(rp.m21.o1.window).toBe('closed');
    expect(rp.m21.o1.exit).toBe('stopped');
    expect(rp.m21.o1.stop_choice).toBe('set_aside');
    expect(rp.m21.o1.accepted).toBe(false);
    expect(await itemStatus(page, 'M21')).toBe('completed');
    expect((await validityRecord(page, OPPORTUNITY.m21o1)).validity).toBe(
      'valid',
    );

    // Route navigation without assessment success still advances.
    await signOffReturnShift(page);
    expect((await pilotProbe(page))?.stage).toBe('deck_closure');
    expectNoRuntimeErrors(errors);
  });

  test('3. handover with the gauge omitted, a partial antenna start resumed but not completable inside, M22 withdrawn after the setback, insufficient-exposure Press B, held ENTER, belt-full relay unit as a bench bundle', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await enterConcourseWithOffers(page, 'ret3', {
      watch: 'accept',
      promise: 'accept',
      readGauge1: true,
    });
    await workshopRestorationShift(page, { startCalibration: false });
    await exteriorShift(page, 'partial', { fillBelt: true });
    await returnInside(page);

    // M10 fulfilled, M09 check 2 omitted (stays due; never auto-closed).
    await handOverToKai(page);
    expect((await validityRecord(page, OPPORTUNITY.m10)).completed).toBe(true);
    expect(await itemStatus(page, 'M09')).toBe('open');
    expect(
      (await eventsByType(page, 'proto_m09_watch_check_completed')).map(
        (e) => meta(e).check,
      ),
    ).toEqual(['check1']);

    await valeReturnCheckIn(page);
    expect(await itemStatus(page, 'M09')).toBe('open'); // a detour never closes check 2

    // Partial start (one outdoor stage): resume is available; the console
    // stages can all be done, but completion is never manufactured.
    let rp = await returnProbe(page);

    expect(rp.m20.availability.history).toBe('valid');
    expect(rp.m20.outdoor_stages_done).toEqual(['clear_base_clamp']);
    expect(rp.m20.status).toContain('1/2 outdoor stages');
    await resumeAntenna(page, 3);
    rp = await returnProbe(page);
    expect(rp.m20.returned).toBe(true);
    expect(rp.m20.useful_resume_actions).toBe(3);
    expect(rp.m20.completion).toBeNull();
    expect(rp.m20.window).toBe('open');
    expect(rp.m20.console_departures).toBe(1);
    expect(await itemStatus(page, 'M20')).toBe('open');
    expect(
      await eventsByType(page, 'proto_m20_antenna_window_closed'),
    ).toHaveLength(0);
    expect(
      (await eventsByType(page, 'proto_m20_antenna_console_left')).length,
    ).toBe(1);

    // Reopening the console shows the persisted console stages (no resume button).
    const console = await openFeedConsole(page);

    expect(console.elements.some((e) => e.id === 'resume')).toBe(false);
    expect(
      console.elements.find((e) => e.id === 'indoor_lock_alignment')?.state,
    ).toBe('done');
    expect(
      console.elements.find((e) => e.id === 'outdoor_seat_feed_line')?.state,
    ).toBe('idle');
    await closeSurface(page);

    // Insufficient-exposure Press B: invalid, never low.
    await pressBatchB(page, { store: 0, exposureMs: 200 });

    const m03b = await validityRecord(page, OPPORTUNITY.m03b);

    // Recorded, never a validity marker (foundation contract).
    expect(m03b.completed).toBe(true);
    expect(m03b.validity).toBe('valid');
    expect(
      meta(
        (await eventsByType(page, 'proto_m03_surface_state_at_departure')).find(
          (e) => meta(e).occasion === 'o2',
        )!,
      ).exposure_sufficient,
    ).toBe(false);
    // The item summary stays `pending` (occasion A never run); the invalid
    // instance is visible on its own record above, never as a low value.
    expect(await itemStatus(page, 'M03')).toBe('pending');

    // The belt was filled outside (scanner + spade + eight crate spares):
    // the fitted relay unit cannot enter it and becomes a recoverable
    // bench bundle instead — lossless, recorded as `output_delivery`.
    await repairRelay(page, { wrongFirst: false, fit: true });
    rp = await returnProbe(page);
    expect(rp.m21.o1.accepted).toBe(true);
    expect(rp.m21.o1.output_delivery).toBe('bench_bundle');

    const fitted = (await eventsByType(page, 'proto_m21_case_accepted'))[0];

    expect(meta(fitted).output_delivery).toBe('bench_bundle');

    const bundles = await page.evaluate(
      () =>
        (
          window as unknown as {
            __pilotBundles?: { bundles: { label: string }[] } | null;
          }
        ).__pilotBundles?.bundles ?? [],
    );

    expect(bundles.some((bundle) => bundle.label === 'Relay unit')).toBe(true);
    // Nothing to hand over from the belt: the desk still offers the notice.
    expect(
      (await openHandoverDesk(page)).some((label) => /relay unit/.test(label)),
    ).toBe(false);
    await selectPromptOption(page, (await promptCardLabels(page)).length);
    await page.waitForTimeout(300);

    // M22: setback, acknowledged, one consistent edit, WITHDRAWN — a
    // completed observation with recovery false (never censored, never low).
    const placed = await assembleReport(page);

    await submitReport(page);
    await keyActivate(page, 'acknowledge');
    await attachCode(page, 0, codeFor(placed[0]));

    // Held ENTER on the focused submit activates ONCE (no double submission).
    const before = (await returnProbe(page)).m22.o1.submissions;

    await keyActivate(page, 'submit');
    await page.waitForTimeout(200);

    const afterOne = (await returnProbe(page)).m22.o1.submissions;

    expect(afterOne).toBe(before + 1);
    await hold(page, 'Enter', 900);
    await page.waitForTimeout(300);
    expect((await returnProbe(page)).m22.o1.submissions).toBeLessThanOrEqual(
      afterOne + 1,
    );
    expect(
      (await returnProbe(page)).m22.o1.repeated_unchanged_action,
    ).toBeLessThanOrEqual(1);

    // WITHDRAW report 1: a completed observation with recovery false; report
    // 2 is placed at once (the desk stays open on it).
    await clickElement(page, 'withdraw_o1');
    await page.waitForTimeout(400);
    rp = await returnProbe(page);
    expect(rp.m22.o1).toMatchObject({
      window: 'closed',
      exit: 'stopped',
      stop_choice: 'withdrawn',
      setback_presented: true,
      setback_comprehension: true,
      revision_begun: true,
      recovery_complete: false,
      exited: true,
    });
    expect(rp.m22.active).toBe('o2');
    expect((await validityRecord(page, OPPORTUNITY.m22o1)).validity).toBe(
      'valid',
    );
    await clickElement(page, 'leave');
    await waitSurface(page, false);
    expect(await itemStatus(page, 'M22')).toBe('open');

    // The M25 notice survives a surface open/close and reads the same.
    const noticeBody = await acknowledgeQuestionnaireNotice(page);

    expect(noticeBody).toContain('QUESTIONNAIRE NOTICE');

    // The world froze under every surface: a held arrow while the report
    // desk was open never moved the avatar (checked here on the console).
    await openFeedConsole(page);

    const frozenBefore = await page.evaluate(
      () =>
        (window as unknown as { __playerProbe?: { x: number } | null })
          .__playerProbe?.x ?? 0,
    );

    await hold(page, 'ArrowRight', 400);

    const frozenAfter = await page.evaluate(
      () =>
        (window as unknown as { __playerProbe?: { x: number } | null })
          .__playerProbe?.x ?? 0,
    );

    expect(Math.abs(frozenAfter - frozenBefore)).toBeLessThan(2);
    await closeSurface(page);
    await page.waitForTimeout(300);
    await hold(page, 'ArrowRight', 400);

    const moved = await page.evaluate(
      () =>
        (window as unknown as { __playerProbe?: { x: number } | null })
          .__playerProbe?.x ?? 0,
    );

    expect(moved).toBeGreaterThan(frozenAfter + 20);

    // Sign-off with the antenna unfinished and the gauge unread: the route
    // advances; nothing is auto-completed.
    await signOffReturnShift(page);
    expect(await itemStatus(page, 'M20')).toBe('open');
    expect(await itemStatus(page, 'M09')).toBe('open');
    expect((await surface(page))?.open ?? false).toBe(false);
    expect(await lastFeedback(page)).not.toMatch(FORBIDDEN_TEXT);
    // V4 story spine: zone-narrowed wayfinding line (see test 1).
    expect((await pilotProbe(page))?.objective).toMatch(
      /Concourse — east door/,
    );
    expect((await pilotProbe(page))?.route.stage).toBe('deck_closure');
    expect(await uiProbe(page)).toMatchObject({ open: false });
    expectNoRuntimeErrors(errors);
  });
});
