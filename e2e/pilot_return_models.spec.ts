/**
 * Return, Revision & Handover — pure domain tests (evidence-led pilot v2,
 * Unit 5). Playwright test blocks that never touch `page` (repository
 * convention): M03 occasion separation and matched entry forms; M07 / M09
 * / M10 start-end linking against the frozen ledger and the source
 * modules; M09/M10 family disjointness; M20 start→resume linking through
 * `M20_RESUME_WINDOW_ID` and every start history; the M21 two-case
 * repair engine (Unit 10: FIT is the application, truthful faults,
 * restudy relevance, revised applications) and its rollback; the M22
 * standardised setback; M21/M22
 * independence; M25 questionnaire-primary semantics; missing / invalid /
 * technical-failure separation; the static no-score / no-canonical /
 * no-wording guarantee.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { ledgerEntry } from '../src/pilot/evidenceLedger';
import { EXTERIOR_FAMILIES } from '../src/pilot/exterior/exteriorEpisodeModel';
import {
  createM20State,
  M20_FAMILY,
  M20_INDOOR_STAGES,
  M20_OPPORTUNITY_ID,
  M20_RESUME_EVENT_SUFFIXES,
  M20_RESUME_WINDOW_ID,
  M20_START_EVENT_SUFFIXES,
  M20_START_WINDOW_ID,
  m20Accept,
  m20CloseResume,
  m20Complete,
  m20CompleteIndoorStage,
  m20CompleteStage,
  m20ConsoleStatus,
  m20LeaveConsole,
  m20MissionLogText,
  m20NextIndoorStage,
  m20PresentResume,
  m20RecordInterruption,
  m20ResumeAvailability,
  m20ResumeRawComponents,
  m20Return,
  m20Snapshot,
} from '../src/pilot/exterior/m20AntennaModel';
import {
  createM21CaseState,
  M21_CASE_DEFS,
  M21_EVENT_SUFFIXES,
  M21_FAMILY,
  M21_OPPORTUNITY_IDS,
  M21_SECTION_REFERENCES,
  M21_SECTIONS,
  M21_WINDOW_IDS,
  m21Apply,
  m21Close,
  m21ConfigCorrect,
  m21Consult,
  m21Depart,
  m21Enter,
  m21InspectPlate,
  m21ManualWordCount,
  m21RawComponents,
  m21Reopen,
  m21SetPost,
  m21SetSelector,
  m21Strategy,
  m21SwitchMode,
} from '../src/pilot/return/m21ManualModel';
import {
  createM22State,
  M22_CRITERION_TEXT,
  M22_EVENT_SUFFIXES,
  M22_FAMILY,
  M22_LINES,
  M22_OPPORTUNITY_ID,
  M22_WINDOW_ID,
  m22Acknowledge,
  m22AttachTag,
  m22ClosureDisposition,
  m22Depart,
  m22Enter,
  m22InspectRegister,
  m22OutcomeText,
  m22PlaceLine,
  m22Progress,
  m22RawComponents,
  m22RemoveLine,
  m22Submit,
  m22TrayOrder,
} from '../src/pilot/return/m22ReportModel';
import {
  createM25State,
  M25_ADMINISTRATION,
  M25_EVENT_SUFFIXES,
  M25_FAMILY,
  M25_HANDOFF_TEXT,
  M25_OPPORTUNITY_ID,
  M25_WINDOW_ID,
  m25Acknowledge,
  m25Present,
  m25RawComponents,
} from '../src/pilot/return/m25HandoffModel';
import {
  M03_MIN_EXPOSURE_MS,
  M03_WINDOW_IDS,
  m03ExposureSufficient,
  phaseMetadata,
  RETURN_BOARD_BODY,
  RETURN_FAMILIES,
  RETURN_GUIDED_ORDER,
  RETURN_LINKED_WINDOWS,
  RETURN_SINGLE_WINDOWS,
  returnEventTypes,
} from '../src/pilot/return/returnEpisodeModel';

const ROOT = join(__dirname, '..');

function source(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf8');
}

/** Source text with comments stripped (so a comment never satisfies a check). */
function code(relative: string): string {
  return source(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const FORBIDDEN =
  /neat and tidy|works until the task is finished|dependable, steady|counted on|stick at a task|read an entire book|Setbacks do not discourage|over and over/i;

const RETURN_SOURCES = [
  'src/pilot/return/returnEpisodeModel.ts',
  'src/pilot/return/m21ManualModel.ts',
  'src/pilot/return/m22ReportModel.ts',
  'src/pilot/return/m25HandoffModel.ts',
  'src/pilot/exterior/m20AntennaModel.ts',
  'src/pilot/windows/returnWindows.ts',
  'src/pilot/windows/returnSurfaceModels.ts',
  'src/pilot/windows/m07Calibration.ts',
  'src/pilot/windows/m09MonitorWatch.ts',
  'src/pilot/windows/m10ComponentPromise.ts',
  'src/inventory/m03Reset.ts',
  'src/scenes/RecordsWorkshopScene.ts',
  'src/scenes/StationConcourseScene.ts',
];

test.describe('return, revision & handover — pure domain (Unit 5)', () => {
  test('1. M03 occasion separation: two opportunity ids, two ledger window ids, occasion tags, own containers and objects', () => {
    const entry = ledgerEntry('M03');
    const row = RETURN_LINKED_WINDOWS.find((r) => r.item === 'M03')!;

    expect(entry.route.opportunity_ids).toEqual(row.opportunityIds);
    expect(entry.route.windows.map((w) => w.id)).toEqual([
      M03_WINDOW_IDS.a,
      M03_WINDOW_IDS.b,
    ]);
    expect(entry.route.windows.map((w) => w.episode)).toEqual([2, 5]);
    expect(row.windows.start).not.toBe(row.windows.end);
    expect(row.objects.start).not.toBe(row.objects.end);

    const m03 = code('src/inventory/m03Reset.ts');

    expect(m03).toContain(
      "a: { occasion: 'o1', episode: 2, window_id: M03_WINDOW_IDS.a }",
    );
    expect(m03).toContain(
      "b: { occasion: 'o2', episode: 5, window_id: M03_WINDOW_IDS.b }",
    );
    expect(m03).toContain('CONTAINER_IDS.m03SurfaceA');
    expect(m03).toContain('CONTAINER_IDS.m03SurfaceB');
    expect(m03).toContain('`m03_press_bench_${occasionId}`');
    // One occasion never writes the other: every mutation is keyed by
    // occasionId and the two occasion states are separate objects.
    expect(m03).toMatch(/occasions\[occasionId\]/);
    expect(m03).not.toMatch(/occasions\.a[\s\S]*occasions\.b/);
  });

  test('2. matched M03 entry forms: one fixed identical starting condition, the same five residuals in the same slots, exposure rule recorded', () => {
    const m03 = code('src/inventory/m03Reset.ts');

    expect(m03).toContain("M03_STARTING_CONDITION = 'fixed_identical_layout'");
    expect(m03).toContain('RESIDUAL_SURFACE_SLOTS = [0, 2, 3, 5, 7]');
    expect(m03).toMatch(/form: M03_STARTING_CONDITION/);
    expect(m03).toContain('objects_restored');
    expect(m03).toContain('homes_correct');
    expect(m03).toContain('close_state');
    expect(m03).not.toMatch(/preferred|neatness|tidy/i);
    expect(M03_MIN_EXPOSURE_MS).toBe(2000);
    expect(m03ExposureSufficient(1999)).toBe(false);
    expect(m03ExposureSufficient(2000)).toBe(true);
    expect(m03).toContain('exposure_sufficient');
  });

  test('3. M07 start/end linking: one opportunity, two ledger window ids, phase metadata on every event, missing start never low', () => {
    const entry = ledgerEntry('M07');
    const row = RETURN_LINKED_WINDOWS.find((r) => r.item === 'M07')!;

    expect(entry.route.opportunity_ids).toEqual(row.opportunityIds);
    expect(entry.route.windows.map((w) => w.id)).toEqual([
      row.windows.start,
      row.windows.end,
    ]);
    expect(phaseMetadata('M07', 'end')).toEqual({
      phase: 'end',
      start_window_id: 'm07_calibration_start',
      end_window_id: 'm07_calibration_end',
    });

    const m07 = code('src/pilot/windows/m07Calibration.ts');

    expect(m07).toContain("start: 'm07_calibration_start'");
    expect(m07).toContain("end: 'm07_calibration_end'");
    expect(m07).toContain('presentM07End');
    expect(m07).toContain("'end_presented'");
    expect(m07).toContain("'end_opened_without_start'");
    expect(m07).toMatch(/start_state: 'missing'/);
    expect(m07).toContain('rawComponents(false)');
    expect(m07).not.toMatch(/speed|words_per|score/i);
    // Raw actions are never shared with M09 / M10.
    expect(m07).not.toMatch(/m09|m10|gauge|promise/i);
  });

  test('4. M09 start/end linking: check 1 and check 2 carry their own ledger window ids and phases; equal reminder bookkeeping', () => {
    const entry = ledgerEntry('M09');
    const row = RETURN_LINKED_WINDOWS.find((r) => r.item === 'M09')!;

    expect(entry.route.windows.map((w) => w.id)).toEqual([
      row.windows.start,
      row.windows.end,
    ]);
    expect(entry.route.windows.map((w) => w.occasion)).toEqual([
      'check1',
      'check2',
    ]);

    const m09 = code('src/pilot/windows/m09MonitorWatch.ts');

    expect(m09).toContain("check1: 'm09_check_1'");
    expect(m09).toContain("check2: 'm09_check_2'");
    expect(m09).toMatch(/checkPhase\(check\)/);
    expect(m09).toContain("phaseMetadata('M09'");
    expect(m09).toContain('openM09Check2');
    expect(m09).toContain('m09Check2Due');
    expect(m09).toContain('noteM09NpcMention');
    expect(m09).not.toMatch(/dependab|score/i);
  });

  test('5. M10 start/end linking: accept and handover phases share one opportunity and never one raw event', () => {
    const entry = ledgerEntry('M10');
    const row = RETURN_LINKED_WINDOWS.find((r) => r.item === 'M10')!;

    expect(entry.route.windows.map((w) => w.id)).toEqual([
      row.windows.start,
      row.windows.end,
    ]);

    const m10 = code('src/pilot/windows/m10ComponentPromise.ts');

    expect(m10).toContain("windowId: 'm10_promise_accept'");
    expect(m10).toContain("'m10_promise_handover'");
    expect(m10).toContain('phaseMetadata(');
    expect(m10).toContain("logM10('handed_over'");
    expect(m10).toContain("logM10('recipient_available'");
    expect(m10).toContain("cutoff_state: 'unfulfilled_at_review'");
    expect(m10).not.toMatch(/reliab|score/i);
  });

  test('6. M09 / M10 disjointness: different families, objects, scenes of record and no shared raw event', () => {
    const m09 = code('src/pilot/windows/m09MonitorWatch.ts');
    const m10 = code('src/pilot/windows/m10ComponentPromise.ts');

    expect(RETURN_FAMILIES.M09).toBe('proto_m09_watch_');
    expect(RETURN_FAMILIES.M10).toBe('proto_m10_promise_');
    expect(RETURN_FAMILIES.M09.startsWith(RETURN_FAMILIES.M10)).toBe(false);
    expect(RETURN_FAMILIES.M10.startsWith(RETURN_FAMILIES.M09)).toBe(false);
    expect(m09).toContain("objectId: 'm09_monitor_gauge'");
    expect(m10).toContain("objectId: 'm10_component_promise'");
    expect(m09).not.toMatch(/m10|promise|kai/i);
    expect(m10).not.toMatch(/m09|gauge|watch/i);

    const concourseSource = code('src/scenes/StationConcourseScene.ts');
    // Body only (the import block lists both names side by side).
    const concourse = concourseSource.slice(
      concourseSource.indexOf('export class'),
    );

    // The gauge reads the watch; Kai's option hands the component over —
    // two stations, two handlers; neither calls the other's module.
    expect(concourse).toMatch(/readM09Gauge\(/);
    expect(concourse).toMatch(/handOverM10\(/);
    expect(concourse).not.toMatch(/readM09Gauge[\s\S]{0,200}handOverM10/);
    expect(concourse).not.toMatch(/handOverM10[\s\S]{0,200}readM09Gauge/);
  });

  test('7. M20 start → resume linking through M20_RESUME_WINDOW_ID: one opportunity, two windows, separate event phases, raw fields only from the resume', () => {
    expect(M20_RESUME_WINDOW_ID).toBe('m20_antenna_resume');
    expect(ledgerEntry('M20').route.windows.map((w) => w.id)).toEqual([
      M20_START_WINDOW_ID,
      M20_RESUME_WINDOW_ID,
    ]);
    expect(phaseMetadata('M20', 'end')).toEqual({
      phase: 'end',
      start_window_id: M20_START_WINDOW_ID,
      end_window_id: M20_RESUME_WINDOW_ID,
    });

    const state = createM20State();

    m20Accept(state, 100);
    m20CompleteStage(state, 'clear_base_clamp', 200);
    m20CompleteStage(state, 'seat_feed_line', 300);
    // Nothing resumes before the interruption (the required return duty).
    expect(m20ResumeAvailability(state)).toMatchObject({
      available: false,
      history: 'exited',
    });
    expect(m20PresentResume(state, 400)).toBe(false);
    expect(m20Return(state, 400)).toBe(false);
    m20RecordInterruption(state, 1000);
    expect(m20ResumeAvailability(state)).toMatchObject({
      available: true,
      history: 'valid',
    });
    expect(m20Return(state, 1500)).toBe(false); // never before the presentation
    expect(m20PresentResume(state, 2000)).toBe(true);
    expect(m20PresentResume(state, 2100)).toBe(false); // once
    expect(m20ConsoleStatus(state)).toContain('ALIGNMENT PENDING');
    expect(m20NextIndoorStage(state)).toBeNull(); // not returned yet
    expect(m20CompleteIndoorStage(state, 'power_feed', 2200)).toBe(false);
    expect(m20Return(state, 3500)).toBe(true);
    expect(m20Return(state, 3600)).toBe(false);

    let raw = m20ResumeRawComponents(state);

    expect(raw.returned).toBe(true);
    expect(raw.resume_latency).toBe(1500);
    expect(raw.interruption_to_return_ms).toBe(2500);
    expect(raw.useful_resume_actions).toBe(0);
    expect(raw.completion).toBe(false);
    expect(raw.progress_pre_interruption).toBe(2);

    // Fixed indoor order; a departure keeps everything; completion needs all.
    expect(m20CompleteIndoorStage(state, 'align_feed', 4000)).toBe(false);
    expect(m20CompleteIndoorStage(state, 'power_feed', 4000)).toBe(true);
    expect(m20LeaveConsole(state)).toBe(true);
    expect(m20MissionLogText(state)).toContain('1/3');
    expect(m20CompleteIndoorStage(state, 'align_feed', 5000)).toBe(true);
    expect(m20Complete(state)).toBe(false);
    expect(m20CompleteIndoorStage(state, 'lock_alignment', 6000)).toBe(true);
    expect(m20Complete(state)).toBe(true);
    expect(m20LeaveConsole(state)).toBe(false);
    raw = m20ResumeRawComponents(state);
    expect(raw.useful_resume_actions).toBe(M20_INDOOR_STAGES.length);
    expect(raw.completion).toBe(true);
    expect(m20MissionLogText(state)).toContain('complete');
    expect(m20Snapshot(state).completion).toBe(true);

    // Start and resume suffix sets are disjoint except for nothing:
    // `window_closed` exists only in the resume set.
    const start = new Set<string>(M20_START_EVENT_SUFFIXES);

    for (const suffix of M20_RESUME_EVENT_SUFFIXES) {
      expect(start.has(suffix)).toBe(false);
    }

    expect(M20_START_EVENT_SUFFIXES).not.toContain('window_closed');
    expect(M20_RESUME_EVENT_SUFFIXES).toContain('window_closed');
  });

  test('8. every M20 start history classifies honestly: valid, exited, missing, invalid, technical failure, closed — and none becomes a low value', () => {
    const missing = createM20State();

    expect(m20ResumeAvailability(missing)).toEqual({
      available: false,
      history: 'missing',
      reason: 'start_missing',
    });
    expect(m20ConsoleStatus(missing)).toContain('no feed-alignment job');
    expect(m20ResumeRawComponents(missing).returned).toBe(false);

    const exited = createM20State();

    m20Accept(exited, 0);
    expect(m20ResumeAvailability(exited)).toMatchObject({
      history: 'exited',
      reason: 'start_not_interrupted',
    });
    expect(m20ConsoleStatus(exited)).toContain('not yet logged');

    const technical = createM20State();

    m20Accept(technical, 0);
    technical.technical_failure = 'probe fault';
    expect(m20ResumeAvailability(technical)).toMatchObject({
      history: 'technical_failure',
    });
    expect(m20ConsoleStatus(technical)).toContain('offline');

    const invalid = createM20State();

    m20Accept(invalid, 0);
    m20RecordInterruption(invalid, 10);
    expect(m20ResumeAvailability(invalid, true)).toEqual({
      available: true,
      history: 'invalid',
      reason: 'start_invalid',
    });

    const partial = createM20State();

    m20Accept(partial, 0);
    m20CompleteStage(partial, 'clear_base_clamp', 1);
    m20RecordInterruption(partial, 2);
    expect(m20ResumeAvailability(partial).history).toBe('valid');
    expect(m20ConsoleStatus(partial)).toContain('1/2 outdoor stages');
    m20PresentResume(partial, 3);
    m20Return(partial, 4);
    m20CompleteIndoorStage(partial, 'power_feed', 5);
    m20CompleteIndoorStage(partial, 'align_feed', 6);
    m20CompleteIndoorStage(partial, 'lock_alignment', 7);
    // Indoor complete but an outdoor stage remains: never manufactured.
    expect(m20Complete(partial)).toBe(false);
    expect(m20ResumeRawComponents(partial)).toMatchObject({
      indoor_complete: true,
      outdoor_complete: false,
      completion: null,
      useful_resume_actions: 3,
    });

    // A presented-but-never-resumed window closes as an observation with
    // returned=false (the review decides); once closed it is unavailable.
    const presented = createM20State();

    m20Accept(presented, 0);
    m20RecordInterruption(presented, 1);
    m20PresentResume(presented, 2);
    expect(m20CloseResume(presented, 'closed_at_review')).toBe(true);
    expect(m20CloseResume(presented, 'completed')).toBe(false);
    expect(m20ResumeAvailability(presented)).toMatchObject({
      available: false,
      history: 'closed',
    });
    expect(m20ResumeRawComponents(presented)).toMatchObject({
      returned: false,
      completion: null, // no outdoor stage was ever done: unobservable
      resume_latency: null,
      resume_closed_reason: 'closed_at_review',
    });
    expect(m20Return(presented, 9)).toBe(false);

    // No score-like field anywhere in the raw components.
    for (const key of Object.keys(m20ResumeRawComponents(presented))) {
      expect(key).not.toMatch(/score|persist|grit|trait/i);
    }
  });

  test('9. M21 two-case repair engine (Unit 10): refused actions never mutate; FIT is the application with truthful faults; restudy after a failing application is relevant only when it bears on a failed subsystem; a revised application is a changed configuration; both cases matched and the manual within its word budget', () => {
    for (const caseId of ['o1', 'o2'] as const) {
      for (const form of ['form_a', 'form_b'] as const) {
        const s = createM21CaseState(caseId, form);
        const def = M21_CASE_DEFS[caseId];
        const spec = def.forms[form];

        // Nothing before entry.
        expect(m21InspectPlate(s, 0)).toBe(false);
        expect(m21SetPost(s, def.posts[0], true, 0)).toBe(false);
        expect(m21Apply(s, 0)).toBeNull();
        expect(s.actions).toHaveLength(0);
        expect(s.invalid_actions).toBe(0);

        expect(m21Enter(s, 100)).toBe(true);
        expect(m21Enter(s, 101)).toBe(false);
        // FIT needs the plate read first (the v2 gate).
        expect(m21Apply(s, 102)).toBeNull();
        expect(m21InspectPlate(s, 105)).toBe(true);

        // Reference chain: §1 → §2 → §4 (depth 2); a reference the section
        // does not offer is refused without mutating.
        expect(m21Consult(s, 's4_code_table', 'reference', 200)).toBe(false);
        expect(m21Consult(s, 's1_identify', 'tab', 200)).toBe(true);
        expect(m21Consult(s, 's4_code_table', 'reference', 210)).toBe(false);
        expect(s.section_visits).toHaveLength(1);
        expect(m21Consult(s, 's2_post_rule', 'reference', 220)).toBe(true);
        expect(m21Consult(s, 's4_code_table', 'reference', 230)).toBe(true);
        expect(s.cross_reference_depth).toBe(2);
        expect(m21Consult(s, 's3_selector_rule', 'tab', 240)).toBe(true);
        expect(s.sections_consulted).toHaveLength(4);
        expect(m21SwitchMode(s, 'diagram', 250)).toBe(true);
        expect(m21SwitchMode(s, 'diagram', 251)).toBe(false);

        // Same-state post / selector / unknown target = invalid, refused, counted.
        const snapshot = JSON.stringify(s.posts);

        expect(m21SetPost(s, def.posts[0], false, 300)).toBe(false);
        expect(m21SetPost(s, 'Z9', true, 300)).toBe(false);
        expect(JSON.stringify(s.posts)).toBe(snapshot);
        expect(m21SetSelector(s, def.initial_selector, 300)).toBe(false);
        expect(s.invalid_actions).toBe(4);
        expect(s.actions).toHaveLength(0);

        // A wrong post with the right selector, then FIT: the first
        // application fails truthfully on the posts only (never which post).
        const wrong = def.posts.find(
          (post) => !spec.correct_posts.includes(post),
        )!;

        expect(m21SetPost(s, wrong, true, 400)).toBe(true);
        expect(m21SetSelector(s, spec.correct_selector, 410)).toBe(true);

        const first = m21Apply(s, 500)!;

        expect(first).toMatchObject({
          index: 1,
          correct: false,
          faults: ['posts'],
          revised: false,
          relevant_restudy: false,
        });
        expect(s.accepted).toBe(false);
        expect(m21Strategy(s)).toBe('unresolved');
        // The open section collapsed with the application (S-F5).
        expect(s.current_section).toBeNull();

        // Restudy: §3 (selector) is not relevant to a posts fault; §4 is.
        expect(m21Consult(s, 's3_selector_rule', 'tab', 600)).toBe(true);
        expect(m21Consult(s, 's4_code_table', 'tab', 610)).toBe(true);
        // A second FIT without any change is NOT a revised application.
        const same = m21Apply(s, 650)!;

        expect(same).toMatchObject({
          index: 2,
          correct: false,
          revised: false,
          restudy_sections: ['s3_selector_rule', 's4_code_table'],
          relevant_restudy: true,
        });

        // Revise (remove the wrong post, fit the right ones) and FIT: accepted.
        expect(m21SetPost(s, wrong, false, 700)).toBe(true);

        for (const post of spec.correct_posts) {
          expect(m21SetPost(s, post, true, 800)).toBe(true);
        }

        expect(m21ConfigCorrect(s)).toBe(true);

        // Departure keeps the case open; reopening is a reengagement.
        expect(m21Depart(s, 900)).toBe(true);
        expect(m21Reopen(s, 1000)).toBe(true);
        expect(s.reengagements).toBe(1);

        const third = m21Apply(s, 1100)!;

        expect(third).toMatchObject({
          index: 3,
          correct: true,
          revised: true,
          restudy_sections: [],
          relevant_restudy: false,
        });
        expect(s.accepted).toBe(true);
        expect(m21Apply(s, 1101)).toBeNull();
        expect(m21SetPost(s, wrong, true, 1102)).toBe(false); // accepted: refused
        expect(m21Depart(s, 1103)).toBe(false);
        expect(m21Close(s, 'accepted', 1104)).toBe(true);

        const raw = m21RawComponents(s);

        expect(raw).toMatchObject({
          case: caseId,
          form,
          applications: 3,
          first_application_correct: false,
          first_application_faults: ['posts'],
          relevant_restudy: true,
          revised_application: true,
          accepted: true,
          correct_rule_application: true,
          strategy: 'restudy_and_revise',
          reference_sections_used: 4,
          cross_reference_depth: 2,
          diagram_mode_used: true,
          reengagement: 1,
        });
        // The numerator fact needs the relevant restudy to precede a
        // REVISED application: here the restudy preceded application 2
        // (unchanged) and the revision came in application 3 — the case's
        // fact is judged over the whole sequence after the first failure.
        expect(raw.restudy_revision).toBe(true);
        // Active time only: the 100 ms away from the bench is excluded.
        expect(raw.time_by_phase_ms.manual + raw.time_by_phase_ms.unit).toBe(
          1104 - 100 - 100,
        );

        for (const key of Object.keys(raw)) {
          expect(key).not.toMatch(/score|persist|grit|trait|reading_speed/i);
        }
      }
    }

    // A first-time success has no failure-conditioned facts; an exit after
    // a failure is an exit (restudy or not).
    {
      const s = createM21CaseState('o2', 'form_a');
      const spec = M21_CASE_DEFS.o2.forms.form_a;

      m21Enter(s, 0);
      m21InspectPlate(s, 5);

      for (const post of spec.correct_posts) {
        m21SetPost(s, post, true, 10);
      }

      m21SetSelector(s, spec.correct_selector, 20);
      expect(m21Apply(s, 30)!.correct).toBe(true);
      expect(m21Strategy(s)).toBe('first_correct');
      expect(m21RawComponents(s).restudy_revision).toBeNull();

      const exit = createM21CaseState('o1', 'form_b');

      m21Enter(exit, 0);
      m21InspectPlate(exit, 5);
      expect(m21Apply(exit, 10)!.correct).toBe(false);
      m21Close(exit, 'set_aside', 20);
      expect(m21Strategy(exit)).toBe('exit');
      expect(m21RawComponents(exit).restudy_revision).toBe(false);

      const restudyExit = createM21CaseState('o1', 'form_b');

      m21Enter(restudyExit, 0);
      m21InspectPlate(restudyExit, 5);
      m21Apply(restudyExit, 10);
      m21Consult(restudyExit, 's2_post_rule', 'tab', 20);
      m21Close(restudyExit, 'set_aside', 30);
      expect(m21Strategy(restudyExit)).toBe('restudy_then_exit');

      const blind = createM21CaseState('o1', 'form_b');
      const blindSpec = M21_CASE_DEFS.o1.forms.form_b;

      m21Enter(blind, 0);
      m21InspectPlate(blind, 5);
      m21Apply(blind, 10);

      for (const post of blindSpec.correct_posts) {
        m21SetPost(blind, post, true, 20);
      }

      m21SetSelector(blind, blindSpec.correct_selector, 30);
      expect(m21Apply(blind, 40)!.correct).toBe(true);
      expect(m21Strategy(blind)).toBe('revise_without_relevant_restudy');
      expect(m21RawComponents(blind).restudy_revision).toBe(false);
    }

    // Matched load per form and case; the manual never states an answer
    // for a plate code; the two cases' text totals 240–320 words.
    let words = 0;

    for (const caseId of ['o1', 'o2'] as const) {
      const def = M21_CASE_DEFS[caseId];

      expect(def.forms.form_a.correct_posts).toHaveLength(
        def.forms.form_b.correct_posts.length,
      );
      expect(def.forms.form_a.correct_selector).not.toBe(def.initial_selector);
      expect(def.forms.form_b.correct_selector).not.toBe(def.initial_selector);

      for (const section of M21_SECTIONS) {
        expect(def.manual_text[section]).not.toMatch(/7K|7R|3Y|3X/);
        expect(def.manual_diagram[section]).not.toMatch(/7K|7R|3Y|3X/);
      }

      // The §1 text and the offered references agree (S-F10).
      expect(def.manual_text.s1_identify).not.toMatch(/§4/);
      words += m21ManualWordCount(def);
    }

    expect(words).toBeGreaterThanOrEqual(240);
    expect(words).toBeLessThanOrEqual(320);
    expect(M21_SECTION_REFERENCES.s1_identify).toEqual([
      's2_post_rule',
      's3_selector_rule',
    ]);
    expect(M21_SECTION_REFERENCES.s2_post_rule).toEqual(['s4_code_table']);
  });

  test('10. M22 standardised setback: a valid first submission is returned with one fixed criterion; editing needs the acknowledgement; unchanged, useful and recovering resubmissions are distinct; no random success', () => {
    for (const form of ['form_a', 'form_b'] as const) {
      const s = createM22State(form);

      expect(m22Submit(s, 0)).toBe('rejected_incomplete'); // not entered
      expect(m22Enter(s, 100)).toBe(true);

      const tray = m22TrayOrder(form).map((line) => line.id);

      expect(new Set(tray)).toEqual(new Set(M22_LINES.map((l) => l.id)));

      // Fewer than three lines is a validity precondition, never the setback.
      expect(m22PlaceLine(s, 0, tray[0], 200)).toBe(true);
      expect(m22PlaceLine(s, 0, tray[1], 201)).toBe(false); // occupied
      expect(m22PlaceLine(s, 1, tray[0], 202)).toBe(false); // duplicate
      expect(m22PlaceLine(s, 1, tray[1], 203)).toBe(true);
      expect(m22Submit(s, 300)).toBe('rejected_incomplete');
      expect(s.setback_presented_at_ms).toBeNull();
      expect(m22PlaceLine(s, 2, tray[2], 310)).toBe(true);

      // The setback is standardised: same outcome and text for every form.
      expect(m22Submit(s, 400)).toBe('setback');
      expect(s.phase).toBe('returned');
      expect(s.setback_presented_at_ms).toBe(400);
      expect(s.initial_action_at_ms).toBe(400);
      expect(m22OutcomeText('setback', s)).toBe(M22_CRITERION_TEXT);

      // Editing before the acknowledgement is refused (comprehension gate);
      // a submit before it is counted, never classified as behaviour.
      expect(m22AttachTag(s, tray[0], 'WO-11', 500)).toBe(false);
      expect(m22Submit(s, 510)).toBe('refused_unacknowledged');
      expect(s.submit_before_ack).toBe(1);
      expect(m22Acknowledge(s, 600)).toBe(true);
      expect(m22Acknowledge(s, 601)).toBe(false);

      // Unchanged resubmission: same note, counted, no new information.
      expect(m22Submit(s, 700)).toBe('unchanged');
      expect(s.unchanged_resubmits).toBe(1);
      expect(s.resubmitted_at_ms).toBeNull();

      // Inspection, a mismatched tag (consistent edit, wrong value), a
      // non-consistent edit, then the matching tags → recovery.
      expect(m22InspectRegister(s)).toBe(true);
      const line0 = M22_LINES.find((l) => l.id === tray[0])!;
      const otherTag = M22_LINES.find((l) => l.id !== tray[0])!.tag;

      expect(m22AttachTag(s, tray[0], otherTag, 800)).toBe(true);
      expect(s.feedback_consistent_edits).toBe(1);
      expect(s.mismatched_tag_edits).toBe(1);
      expect(s.strategy_change_at_ms).toBe(800);
      expect(m22Submit(s, 810)).toBe('returned_again');
      expect(s.resubmitted_at_ms).toBe(810);
      expect(m22OutcomeText('returned_again', s)).toContain('3');
      expect(m22RemoveLine(s, 2, 820)).toBe(true); // other edit
      expect(s.other_edits).toBe(1);
      expect(m22PlaceLine(s, 2, tray[2], 830)).toBe(true);
      expect(m22AttachTag(s, tray[0], line0.tag, 900)).toBe(true);

      for (const lineId of [tray[1], tray[2]]) {
        expect(
          m22AttachTag(
            s,
            lineId,
            M22_LINES.find((l) => l.id === lineId)!.tag,
            910,
          ),
        ).toBe(true);
      }

      expect(m22Progress(s)).toEqual({ tagged: 3, placed: 3 });
      expect(m22Submit(s, 1000)).toBe('accepted');
      expect(s.phase).toBe('accepted');
      expect(m22Submit(s, 1001)).toBe('rejected_incomplete'); // closed to edits
      expect(m22Depart(s)).toBe(false);

      const raw = m22RawComponents(s);

      expect(raw).toMatchObject({
        setback_presented: true,
        revision_started: true,
        feedback_consistent_edits: 4,
        resubmitted: true,
        recovery_complete: true,
        setback_comprehension: true,
        inspections: 1,
        repeated_unchanged_action: 1,
        other_edits: 2,
        mismatched_tag_edits: 1,
        submissions: 4,
        form,
      });
      expect(raw.initial_action_ms).toBe(300);

      for (const key of Object.keys(raw)) {
        expect(key).not.toMatch(/score|resilien|grit|persist|trait/i);
      }
    }

    // Deterministic: identical inputs → identical outcome sequence.
    const a = createM22State('form_a');
    const b = createM22State('form_a');

    for (const s of [a, b]) {
      m22Enter(s, 0);
      m22PlaceLine(s, 0, 'l_loop', 1);
      m22PlaceLine(s, 1, 'l_uplink', 2);
      m22PlaceLine(s, 2, 'l_records', 3);
    }

    expect(m22Submit(a, 4)).toBe(m22Submit(b, 4));
    expect(m22RawComponents(a)).toEqual(m22RawComponents(b));
  });

  test('11. M21 and M22 are independent: different ids, families, objects and state; M22 presentable whatever M21 did; no shared counter', () => {
    expect(M21_OPPORTUNITY_IDS.o1).not.toBe(M22_OPPORTUNITY_ID);
    expect(M21_OPPORTUNITY_IDS.o2).not.toBe(M22_OPPORTUNITY_ID);
    expect(M21_WINDOW_IDS.o1).not.toBe(M22_WINDOW_ID);
    expect(M21_WINDOW_IDS.o2).not.toBe(M22_WINDOW_ID);
    expect(M21_FAMILY.startsWith(M22_FAMILY)).toBe(false);
    expect(M22_FAMILY.startsWith(M21_FAMILY)).toBe(false);

    const single = Object.fromEntries(
      RETURN_SINGLE_WINDOWS.map((row) => [row.item, row]),
    );

    expect(single.M21.object).not.toBe(single.M22.object);

    // Pure models never import each other.
    const m21 = code('src/pilot/return/m21ManualModel.ts');
    const m22 = code('src/pilot/return/m22ReportModel.ts');

    expect(m21).not.toMatch(/m22|report|setback/i);
    expect(m22).not.toMatch(/m21|manual|jumper|relay bench/i);

    // M22 runs to recovery with M21 never entered, exited, or set aside.
    for (const history of ['never', 'exited', 'set_aside'] as const) {
      const bench = createM21CaseState('o1', 'form_a');

      if (history !== 'never') {
        m21Enter(bench, 0);
        m21Depart(bench, 1);

        if (history === 'set_aside') {
          m21Close(bench, 'set_aside', 2);
        }
      }

      const desk = createM22State('form_b');

      m22Enter(desk, 10);
      m22PlaceLine(desk, 0, 'l_coupling', 11);
      m22PlaceLine(desk, 1, 'l_loop', 12);
      m22PlaceLine(desk, 2, 'l_metal', 13);
      expect(m22Submit(desk, 14)).toBe('setback');
      m22Acknowledge(desk, 15);
      m22AttachTag(desk, 'l_coupling', 'WO-11', 16);
      m22AttachTag(desk, 'l_loop', 'WO-12', 17);
      m22AttachTag(desk, 'l_metal', 'WO-14', 18);
      expect(m22Submit(desk, 19)).toBe('accepted');
      expect(m21RawComponents(bench).accepted).toBe(false);
      expect(m22RawComponents(desk).recovery_complete).toBe(true);
    }

    // The adapter binds separate ItemWindows and never reads one model's
    // state inside the other's functions.
    const adapter = code('src/pilot/windows/returnWindows.ts');
    const m21Block = adapter.slice(
      adapter.indexOf('// ——— M21'),
      adapter.indexOf('// ——— M22'),
    );
    const m22Block = adapter.slice(
      adapter.indexOf('// ——— M22'),
      adapter.indexOf('// ——— M25'),
    );

    expect(m21Block).not.toMatch(/\.m22\b|m22[A-Z]/);
    expect(m22Block).not.toMatch(/\.m21\b|m21[A-Z]/);
    expect(adapter).toContain("objectId: 'm21_relay_bench'");
    expect(adapter).toContain("objectId: 'm22_report_desk'");
  });

  test('12. M25 is questionnaire-primary: a handoff shell with no in-game response, no wording, no inference from behaviour', () => {
    expect(ledgerEntry('M25').disposition_class).toBe('questionnaire_primary');
    expect(ledgerEntry('M25').route.windows.map((w) => w.id)).toEqual([
      M25_WINDOW_ID,
    ]);
    expect(M25_OPPORTUNITY_ID).toBe('proto_m25_belief_probe');
    expect(M25_FAMILY).toBe('proto_m25_probe_');
    expect(M25_ADMINISTRATION).toBe('questionnaire_primary_pending_external');
    expect(M25_HANDOFF_TEXT).not.toMatch(FORBIDDEN);
    expect(M25_HANDOFF_TEXT).not.toMatch(
      /repeat|same thing|normal|belief|score/i,
    );
    expect(M25_HANDOFF_TEXT).toMatch(/questionnaire/i);
    expect(M25_HANDOFF_TEXT).toMatch(/Nothing is answered here/);

    const s = createM25State();

    expect(m25Acknowledge(s, 0)).toBe(false); // never before the presentation
    expect(m25Present(s, 10)).toBe(true);
    expect(m25Present(s, 11)).toBe(false);
    expect(m25Acknowledge(s, 20)).toBe(true);
    expect(m25Acknowledge(s, 21)).toBe(false);

    const raw = m25RawComponents(s);

    expect(raw).toEqual({
      direct_belief_probe: null,
      administration: M25_ADMINISTRATION,
      handoff_presented: true,
      handoff_acknowledged: true,
      notice_views: 0,
      lock_comprehension: null,
      secondary_unchanged_resubmits_after_lock: null,
      in_game_response: null,
    });
    expect(M25_EVENT_SUFFIXES).toEqual([
      'presented',
      'opportunity_opened',
      'handoff_acknowledged',
      'window_closed',
    ]);

    // No M25 module reads M22 / M24 / M26 or any repetition telemetry.
    const m25 = code('src/pilot/return/m25HandoffModel.ts');

    expect(m25).not.toMatch(/m22|m24|m26|resubmit\(|unchanged_resubmits\b/i);
  });

  test('13. missing, invalid and technical failure stay distinct for every return window and never become a low value', () => {
    // M22 closure dispositions.
    const never = createM22State('form_a');

    m22Enter(never, 0);
    expect(m22ClosureDisposition(never, 'closed_at_review')).toEqual({
      kind: 'missing',
    });

    const unacknowledged = createM22State('form_a');

    m22Enter(unacknowledged, 0);
    m22PlaceLine(unacknowledged, 0, 'l_coupling', 1);
    m22PlaceLine(unacknowledged, 1, 'l_loop', 2);
    m22PlaceLine(unacknowledged, 2, 'l_metal', 3);
    m22Submit(unacknowledged, 4);
    expect(m22ClosureDisposition(unacknowledged, 'closed_at_review')).toEqual({
      kind: 'invalid',
      detail: 'setback_not_acknowledged',
    });
    expect(m22ClosureDisposition(unacknowledged, 'withdrawn')).toEqual({
      kind: 'invalid',
      detail: 'setback_not_acknowledged',
    });

    const acknowledged = createM22State('form_a');

    m22Enter(acknowledged, 0);
    m22PlaceLine(acknowledged, 0, 'l_coupling', 1);
    m22PlaceLine(acknowledged, 1, 'l_loop', 2);
    m22PlaceLine(acknowledged, 2, 'l_metal', 3);
    m22Submit(acknowledged, 4);
    m22Acknowledge(acknowledged, 5);
    expect(m22ClosureDisposition(acknowledged, 'withdrawn')).toEqual({
      kind: 'completed',
    });
    expect(m22ClosureDisposition(acknowledged, 'closed_at_review')).toEqual({
      kind: 'missing',
    });
    expect(m22RawComponents(acknowledged).recovery_complete).toBe(false);

    // M21: set aside vs review vs accepted are different stop states.
    const aside = createM21CaseState('o1', 'form_b');

    m21Enter(aside, 0);
    m21Close(aside, 'set_aside', 1);
    expect(m21RawComponents(aside).stop_choice).toBe('set_aside');

    const review = createM21CaseState('o1', 'form_b');

    m21Enter(review, 0);
    m21Close(review, 'closed_at_review', 1);
    expect(m21RawComponents(review).stop_choice).toBe('closed_at_review');
    expect(m21RawComponents(review).accepted).toBe(false);
    expect(m21RawComponents(review).correct_rule_application).toBeNull();

    // The adapter routes each disposition to the register with the right
    // reason (source-level: the kit's stop/complete/technicalFailure).
    const adapter = code('src/pilot/windows/returnWindows.ts');

    expect(adapter).toContain("'insufficient_opportunity'");
    expect(adapter).toContain("'censored'");
    expect(adapter).toContain('markAbsent(');
    expect(adapter).toContain('technicalFailure(detail)');
    expect(adapter).toContain("exitState: 'stopped'");
    expect(adapter).toContain("'resume_unavailable'");
    expect(adapter).not.toMatch(/low|penal|fail_score/i);

    // M07: a missing start is a recorded fact, never a conversion.
    const m07 = code('src/pilot/windows/m07Calibration.ts');

    expect(m07).toMatch(/start_state: state\.startState/);
    expect(m07).not.toMatch(/stagesCompleted = 0[^;]*missing/);
  });

  test('14. no score, no canonical event, no questionnaire wording: static contact check; families pairwise disjoint; guided order never names the console or the bench', () => {
    for (const relative of RETURN_SOURCES) {
      const text = code(relative);

      expect(text, relative).not.toMatch(
        /ScoringManager|CanonicalEventContext|scoreEvent|computeScore/,
      );
      expect(text, relative).not.toMatch(
        /\bweight\b|cut[_ ]?score|trait[_ ]?label|\bgrit\b/i,
      );
      expect(source(relative), relative).not.toMatch(FORBIDDEN);
      expect(text, relative).not.toMatch(/study_item_ids|construct_id/);
    }

    // Canonical schema / scoring plan never mention a Unit 5 family.
    for (const doc of [
      'docs/research/event-schema.md',
      'docs/research/scoring-plan.md',
      'src/systems/ScoringManager.ts',
    ]) {
      const text = source(doc);

      for (const family of Object.values(RETURN_FAMILIES)) {
        expect(text, `${doc} mentions ${family}`).not.toContain(family);
      }
    }

    // Families pairwise disjoint (return + exterior + secondary).
    const families = [
      ...Object.values(RETURN_FAMILIES),
      ...Object.values(EXTERIOR_FAMILIES),
      'secondary_field_action_',
      'secondary_m08_',
      'secondary_m11_',
    ];

    for (const a of families) {
      for (const b of families) {
        if (a !== b) {
          expect(a.startsWith(b), `${a} vs ${b}`).toBe(false);
        }
      }
    }

    // Event types across the Unit 5 models are unique.
    const all = Object.values(returnEventTypes()).flat();

    expect(new Set(all).size).toBe(all.length);
    expect(
      M21_EVENT_SUFFIXES.length + M22_EVENT_SUFFIXES.length,
    ).toBeGreaterThan(20);
    expect(M20_FAMILY).toBe(RETURN_FAMILIES.M20);
    expect(M20_OPPORTUNITY_ID).toBe(
      ledgerEntry('M20').route.opportunity_ids[0],
    );

    // Guidance: the feed console (M20 resume) and the calibration bench
    // (M07 natural return) are never guided on the return shift; the
    // board copy carries no directive about either.
    expect(RETURN_GUIDED_ORDER).not.toContain('feed_console');
    expect(RETURN_GUIDED_ORDER).not.toContain('calibration_bench');
    expect(RETURN_BOARD_BODY).not.toMatch(
      /feed console|antenna|mast|calibration/i,
    );
    expect(RETURN_BOARD_BODY).not.toMatch(FORBIDDEN);

    const workshop = code('src/scenes/RecordsWorkshopScene.ts');

    expect(workshop).not.toMatch(/guided\(\s*'feed_console'/);
    expect(workshop).toMatch(
      /guided\(\s*'calibration_bench',[^\]]{0,200}\[\s*'workshop_work'\s*\]/,
    );
    expect(workshop).not.toMatch(
      /guided\(\s*'calibration_bench',[^\]]{0,200}workshop_return/,
    );
    expect(workshop).toMatch(/guided\(\s*'relay_bench'/);
    expect(workshop).toMatch(/guided\(\s*'report_desk'/);
  });
});
