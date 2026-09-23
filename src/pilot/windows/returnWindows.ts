/**
 * Return, Revision & Handover item windows (evidence-led pilot v2, Unit 5).
 *
 * Binds the Unit 5 PURE models (../return/*, ../exterior/m20AntennaModel)
 * to the ItemWindow kit. Every item-owned event carries the required
 * per-opportunity fields and rides the unmapped
 * `researchRuntime.logInteraction` path — never a canonical event, never a
 * score.
 *
 * - M20 RESUME/END continues the SAME opportunity the yard opened
 *   (`exteriorWindows().m20`): once the resume opportunity is presented the
 *   window id switches to the ledger's `m20_antenna_resume` and every
 *   later event carries `phase: 'end'` plus both window ids (M07/M10
 *   precedent). No start event is ever fabricated; a missing / exited /
 *   invalid / technical-failure start is classified and logged as
 *   `resume_unavailable` or ridden as invalid — never a low value.
 * - M21, M22 and M25 own their windows, objects, families and state;
 *   nothing is shared between them (no counter, no object, no event).
 * - M25 is a presentation window only (questionnaire-primary handoff).
 *
 * Session-scope singleton (page lifetime, like every pilot window).
 */
import {
  opportunityValidity,
  serializeOpportunities,
} from '../../measurement/validity';
import type { M20IndoorStage } from '../exterior/m20AntennaModel';
import {
  M20_INDOOR_STAGE_MS,
  M20_OPPORTUNITY_ID as M20_OPP,
  M20_RESUME_WINDOW_ID,
  m20CloseResume,
  m20Complete,
  m20CompleteIndoorStage,
  m20ConsoleStatus,
  m20InspectConsole,
  m20LeaveConsole,
  m20NextIndoorStage,
  m20PresentResume,
  m20ResumeAvailability,
  m20ResumePresented,
  m20ResumeRawComponents,
  m20Return,
  m20Returned,
} from '../exterior/m20AntennaModel';
import type {
  M21Case,
  M21CaseState,
  M21Form,
  M21ManualMode,
  M21Section,
} from '../return/m21ManualModel';
import {
  createM21CaseState,
  M21_CASE_DEFS,
  M21_CASES,
  M21_ENTRY_STATE_VERSION,
  M21_FAMILY,
  M21_OPPORTUNITY_IDS,
  M21_PLACE_SETTLE_MS,
  M21_RELEVANT_SECTIONS,
  M21_WINDOW_IDS,
  m21Apply,
  m21CanApply,
  m21Close,
  m21Consult,
  m21Depart,
  m21Enter,
  m21FaultsKnownAfter,
  m21FeedbackLine,
  m21InspectPlate,
  m21ManualWordCount,
  m21NoteOutput,
  m21Open,
  m21OpenManual,
  m21RawComponents,
  m21Reopen,
  m21SetPost,
  m21SetSelector,
  m21Strategy,
  m21SwitchMode,
} from '../return/m21ManualModel';
import type {
  M22Form,
  M22RatingsState,
  M22Report,
  M22ReportState,
  M22SubmitOutcome,
} from '../return/m22ReportModel';
import {
  createM22RatingsState,
  createM22ReportState,
  M22_ENTRY_STATE_VERSION,
  M22_FAMILY,
  M22_OPPORTUNITY_IDS,
  M22_PLACE_SETTLE_MS,
  M22_RATING_SETTLE_MS,
  M22_REPORT_DEFS,
  M22_REPORTS,
  M22_WINDOW_IDS,
  m22Acknowledge,
  m22AttachCode,
  m22CanWithdraw,
  m22Close,
  m22ClosureDisposition,
  m22Decided,
  m22Depart,
  m22DetachCode,
  m22Enter,
  m22InspectRegister,
  m22Open,
  m22PlaceLine,
  m22PresentRating,
  m22Progress,
  m22Rate,
  m22RatingsComplete,
  m22RatingsDue,
  m22RatingSettling,
  m22RawComponents,
  m22RemoveLine,
  m22Submit,
  m22UncodedLines,
} from '../return/m22ReportModel';
import type { M25State } from '../return/m25HandoffModel';
import {
  createM25State,
  M25_ADMINISTRATION,
  M25_ENTRY_STATE_VERSION,
  M25_FAMILY,
  M25_OPPORTUNITY_ID,
  M25_WINDOW_ID,
  m25Acknowledge,
  m25Present,
  m25RawComponents,
  m25View,
} from '../return/m25HandoffModel';
import { phaseMetadata } from '../return/returnEpisodeModel';
import { exteriorEpisode, exteriorWindows } from './exteriorWindows';
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

const SCENE = 'records_workshop';

export interface M22UiState {
  selected: { kind: 'line' | 'tag'; id: string } | null;
  registerOpen: boolean;
}

export interface ReturnEpisodeState {
  m21: Record<M21Case, M21CaseState>;
  m22: Record<M22Report, M22ReportState>;
  m22_ratings: M22RatingsState;
  m22_ui: M22UiState;
  m25: M25State;
  /** Feed-console indoor stage settling (timed action) — presentation. */
  m20_settling_until_ms: number | null;
  m20_settling_stage: M20IndoorStage | null;
  /** `resume_unavailable` reasons already logged (once each). */
  m20_unavailable_logged: string[];
  /** Outbound handover tray (route dressing; pilot telemetry only). */
  handover: { relay_unit: boolean; relay_coupling: boolean };
}

interface ReturnWindows {
  m21: Record<M21Case, ItemWindow>;
  m22: Record<M22Report, ItemWindow>;
  m25: ItemWindow;
}

let state: ReturnEpisodeState | null = null;
let windows: ReturnWindows | null = null;

function buildWindows(s: ReturnEpisodeState): ReturnWindows {
  return {
    m21: {
      o1: new ItemWindow({
        item: 'M21',
        opportunityId: M21_OPPORTUNITY_IDS.o1,
        windowId: M21_WINDOW_IDS.o1,
        entryStateVersion: M21_ENTRY_STATE_VERSION,
        family: M21_FAMILY,
        scene: SCENE,
        objectId: 'm21_relay_bench',
        occasion: 'o1',
        form: s.m21.o1.form,
        counterbalance: s.m21.o1.form,
      }),
      o2: new ItemWindow({
        item: 'M21',
        opportunityId: M21_OPPORTUNITY_IDS.o2,
        windowId: M21_WINDOW_IDS.o2,
        entryStateVersion: M21_ENTRY_STATE_VERSION,
        family: M21_FAMILY,
        scene: SCENE,
        objectId: 'm21_relay_bench',
        occasion: 'o2',
        form: s.m21.o2.form,
        counterbalance: s.m21.o2.form,
      }),
    },
    m22: {
      o1: new ItemWindow({
        item: 'M22',
        opportunityId: M22_OPPORTUNITY_IDS.o1,
        windowId: M22_WINDOW_IDS.o1,
        entryStateVersion: M22_ENTRY_STATE_VERSION,
        family: M22_FAMILY,
        scene: SCENE,
        objectId: 'm22_report_desk',
        occasion: 'o1',
        form: s.m22.o1.form,
        counterbalance: s.m22.o1.form,
      }),
      o2: new ItemWindow({
        item: 'M22',
        opportunityId: M22_OPPORTUNITY_IDS.o2,
        windowId: M22_WINDOW_IDS.o2,
        entryStateVersion: M22_ENTRY_STATE_VERSION,
        family: M22_FAMILY,
        scene: SCENE,
        objectId: 'm22_report_desk',
        occasion: 'o2',
        form: s.m22.o2.form,
        counterbalance: s.m22.o2.form,
      }),
    },
    m25: new ItemWindow({
      item: 'M25',
      opportunityId: M25_OPPORTUNITY_ID,
      windowId: M25_WINDOW_ID,
      entryStateVersion: M25_ENTRY_STATE_VERSION,
      family: M25_FAMILY,
      scene: SCENE,
      objectId: 'm25_shift_question_terminal',
    }),
  };
}

/** The session's return-episode state (deterministic counterbalanced forms). */
export function returnEpisode(): ReturnEpisodeState {
  if (state === null) {
    const sessionId = currentSessionId();

    state = {
      m21: {
        o1: createM21CaseState(
          'o1',
          assignCounterbalance<M21Form>(sessionId, 'm21_case_o1_form', [
            'form_a',
            'form_b',
          ]),
        ),
        o2: createM21CaseState(
          'o2',
          assignCounterbalance<M21Form>(sessionId, 'm21_case_o2_form', [
            'form_a',
            'form_b',
          ]),
        ),
      },
      m22: {
        o1: createM22ReportState(
          'o1',
          assignCounterbalance<M22Form>(sessionId, 'm22_report_o1_form', [
            'form_a',
            'form_b',
          ]),
        ),
        o2: createM22ReportState(
          'o2',
          assignCounterbalance<M22Form>(sessionId, 'm22_report_o2_form', [
            'form_a',
            'form_b',
          ]),
        ),
      },
      m22_ratings: createM22RatingsState(),
      m22_ui: { selected: null, registerOpen: false },
      m25: createM25State(),
      m20_settling_until_ms: null,
      m20_settling_stage: null,
      m20_unavailable_logged: [],
      handover: { relay_unit: false, relay_coupling: false },
    };
    windows = buildWindows(state);
  }

  return state;
}

export function returnWindows(): ReturnWindows {
  returnEpisode();

  return windows!;
}

/** Declares + offers the Unit 5 opportunities (workshop entry; idempotent). */
export function declareReturnWindows() {
  const w = returnWindows();

  w.m21.o1.declare();
  w.m21.o2.declare();
  w.m22.o1.declare();
  w.m22.o2.declare();
  w.m25.declare();
}

function elapsedSince(openedAt: number | null, nowMs: number): number {
  return Math.max(0, nowMs - (openedAt ?? nowMs));
}

// ——— M20 — resume / end at the feed console ————————————————————————————

function m20StartInvalid(): boolean {
  const record = serializeOpportunities().find(
    (candidate) => candidate.opportunity_id === M20_OPP,
  );

  return record !== undefined && opportunityValidity(record) === 'invalid';
}

function m20ResumeWindow(): ItemWindow {
  const w = exteriorWindows().m20;

  w.spec.windowId = M20_RESUME_WINDOW_ID;

  return w;
}

function m20Log(suffix: string, metadata: Record<string, unknown>) {
  m20ResumeWindow().log(suffix, {
    ...phaseMetadata('M20', 'end'),
    ...metadata,
  });
}

/** The console's availability, read-only (participant-facing text + probe). */
export function m20ConsoleAvailability() {
  return m20ResumeAvailability(exteriorEpisode().m20, m20StartInvalid());
}

export function m20ConsoleStatusLine(): string {
  return m20ConsoleStatus(exteriorEpisode().m20);
}

/**
 * The feed console is available inside on the return (workshop entry at
 * stage ≥ return_hub). A valid start PRESENTS the resume opportunity
 * (once); any other history logs `resume_unavailable` once per reason.
 * Never a reminder: the console's own chip is the only visible state.
 */
export function m20ConsolePresent(nowMs: number) {
  const s = exteriorEpisode().m20;
  const availability = m20ConsoleAvailability();

  if (availability.available) {
    if (m20PresentResume(s, nowMs)) {
      // Active time resumes only while the console is OPEN (console open /
      // leave); the presentation itself never counts walking time.
      m20Log('resume_presented', {
        start_history: availability.history,
        outdoor_stages_done: [...s.stages_done],
        progress_pre_interruption: s.progress_pre_interruption,
        input_mode: 'system',
      });
    }

    return availability;
  }

  const r = returnEpisode();

  if (!r.m20_unavailable_logged.includes(availability.reason)) {
    r.m20_unavailable_logged.push(availability.reason);
    // Logged on the START window (no resume window exists for this history).
    exteriorWindows().m20.log('resume_unavailable', {
      ...phaseMetadata('M20', 'end'),
      start_history: availability.history,
      reason: availability.reason,
      input_mode: 'system',
    });
  }

  return availability;
}

/** Console opened: a read of the persisted state (any availability). */
export function m20ConsoleOpen(nowMs: number, inputMode: InputMode) {
  const s = exteriorEpisode().m20;
  const availability = m20ConsoleAvailability();

  m20InspectConsole(s);

  if (m20ResumePresented(s)) {
    m20ResumeWindow().resume(nowMs);
    m20Log('console_inspected', {
      start_history: availability.history,
      returned: m20Returned(s),
      indoor_stages_done: [...s.indoor_stages_done],
      console_inspections: s.console_inspections,
      input_mode: inputMode,
    });
  }

  return availability;
}

/** "Resume the restoration" — the return act. */
export function m20ConsoleResume(nowMs: number, inputMode: InputMode): boolean {
  const s = exteriorEpisode().m20;

  if (!m20Return(s, nowMs)) {
    return false;
  }

  const raw = m20ResumeRawComponents(s);

  m20Log('returned', {
    resume_latency: raw.resume_latency,
    interruption_to_return_ms: raw.interruption_to_return_ms,
    outdoor_complete: raw.outdoor_complete,
    input_mode: inputMode,
  });

  return true;
}

export function m20ConsoleSettling(nowMs: number): M20IndoorStage | null {
  const r = returnEpisode();

  return r.m20_settling_until_ms !== null && nowMs < r.m20_settling_until_ms
    ? r.m20_settling_stage
    : null;
}

/** Begins the next indoor stage as a timed action; returns its duration. */
export function m20ConsoleBeginStage(nowMs: number): {
  stage: M20IndoorStage;
  ms: number;
} | null {
  const s = exteriorEpisode().m20;
  const r = returnEpisode();
  const stage = m20NextIndoorStage(s);

  if (stage === null || m20ConsoleSettling(nowMs) !== null) {
    return null;
  }

  r.m20_settling_stage = stage;
  r.m20_settling_until_ms = nowMs + M20_INDOOR_STAGE_MS[stage];

  return { stage, ms: M20_INDOOR_STAGE_MS[stage] };
}

/** Completes the indoor stage that just settled (host timer). */
export function m20ConsoleFinishStage(
  stage: M20IndoorStage,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const s = exteriorEpisode().m20;
  const r = returnEpisode();

  r.m20_settling_until_ms = null;
  r.m20_settling_stage = null;

  if (!m20CompleteIndoorStage(s, stage, nowMs)) {
    return false;
  }

  m20Log('indoor_stage_completed', {
    stage,
    indoor_stages_done: s.indoor_stages_done.length,
    outdoor_complete: s.stages_done.length === 2,
    restoration_complete: m20Complete(s),
    elapsed_ms: elapsedSince(s.returned_at_ms, nowMs),
    input_mode: inputMode,
  });

  if (m20Complete(s)) {
    // Raw components describe the observation BEFORE the closure marker
    // (start history stays `valid`); the closure reason is stamped.
    const raw = {
      ...phaseMetadata('M20', 'end'),
      ...m20ResumeRawComponents(s),
      resume_closed_reason: 'completed',
    };

    m20CloseResume(s, 'completed');
    m20ResumeWindow().complete(nowMs, raw, inputMode);
  }

  return true;
}

/** Console left with the restoration unfinished (window stays open). */
export function m20ConsoleLeave(nowMs: number) {
  const s = exteriorEpisode().m20;

  if (m20LeaveConsole(s)) {
    m20Log('console_left', {
      indoor_stages_done: s.indoor_stages_done.length,
      console_departures: s.console_departures,
      input_mode: 'system',
    });
  }

  if (m20ResumePresented(s)) {
    m20ResumeWindow().pause(nowMs);
  }
}

/**
 * Review closure of the resume phase: once the resume opportunity was
 * PRESENTED, a still-open window closes as a COMPLETED observation
 * (returned / completion as they stand — "did not resume" is the
 * observation). Never presented → the caller censors the start window.
 * Returns whether this function closed the window.
 */
export function closeM20ResumeAtReview(nowMs: number): boolean {
  const s = exteriorEpisode().m20;
  const w = exteriorWindows().m20;

  if (!m20ResumePresented(s) || !w.isOpen()) {
    return false;
  }

  const raw = {
    ...phaseMetadata('M20', 'end'),
    ...m20ResumeRawComponents(s),
    resume_closed_reason: 'closed_at_review',
  };

  m20CloseResume(s, 'closed_at_review');
  m20ResumeWindow().complete(nowMs, raw, 'system');

  return true;
}

// ——— M21 — manual-based repair (two independent cases) ——————————————————

function m21CaseState(caseId: M21Case): M21CaseState {
  return returnEpisode().m21[caseId];
}

function m21CaseWindow(caseId: M21Case): ItemWindow {
  return returnWindows().m21[caseId];
}

/** The case on the bench: unit 1 until it closes, then unit 2. */
export function m21ActiveCase(): M21Case {
  return returnEpisode().m21.o1.closed ? 'o2' : 'o1';
}

export function m21AllClosed(): boolean {
  const r = returnEpisode();

  return r.m21.o1.closed && r.m21.o2.closed;
}

function m21Snapshot(caseId: M21Case): Record<string, unknown> {
  const def = M21_CASE_DEFS[caseId];

  return {
    case: caseId,
    form: m21CaseState(caseId).form,
    unit: def.unit_name,
    posts: def.posts.length,
    selector_positions: def.selector_positions.length,
    selector_initial: def.initial_selector,
    manual_sections: 4,
    manual_modes: ['text', 'diagram'],
    manual_words: m21ManualWordCount(def),
    plate_hidden_until_inspected: true,
    application_is_fit: true,
    pre_application_test: false,
  };
}

/** Both cases are PRESENTED with the return shift's work orders. */
export function m21Present(nowMs: number) {
  for (const caseId of M21_CASES) {
    const w = m21CaseWindow(caseId);

    w.setComprehension('not_required');
    w.present(nowMs, m21Snapshot(caseId));
  }
}

export function m21State(
  caseId: M21Case = m21ActiveCase(),
): Readonly<M21CaseState> {
  return m21CaseState(caseId);
}

function m21EnterCase(caseId: M21Case, nowMs: number, inputMode: InputMode) {
  const s = m21CaseState(caseId);
  const w = m21CaseWindow(caseId);

  if (!m21Enter(s, nowMs)) {
    return false;
  }

  w.setComprehension('not_required');
  w.open(nowMs, {
    ...m21Snapshot(caseId),
    open_input_mode: inputMode,
    previous_case_strategy:
      caseId === 'o2' ? m21Strategy(m21CaseState('o1')) : null,
  });

  return true;
}

/** Bench surface opened: entry (once per case) or a reopening. */
export function m21BenchOpen(nowMs: number, inputMode: InputMode) {
  if (m21AllClosed()) {
    return;
  }

  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);
  const w = m21CaseWindow(caseId);

  if (m21EnterCase(caseId, nowMs, inputMode)) {
    return;
  }

  if (m21Reopen(s, nowMs)) {
    w.log('reengagement', {
      case: caseId,
      kind: 'bench_reopened',
      reengagements: s.reengagements,
      elapsed_ms: elapsedSince(s.opened_at_ms, nowMs),
      input_mode: inputMode,
    });
  }

  w.resume(nowMs);
}

/** After a case closes with the surface open, the next unit is placed at once. */
function m21PlaceNext(nowMs: number) {
  if (m21AllClosed()) {
    return;
  }

  const caseId = m21ActiveCase();

  if (m21EnterCase(caseId, nowMs, 'system')) {
    m21CaseWindow(caseId).log('case_placed', {
      case: caseId,
      unit: M21_CASE_DEFS[caseId].unit_name,
      input_mode: 'system',
    });
  }
}

function m21LogOrInvalid(
  caseId: M21Case,
  ok: boolean,
  suffix: string,
  metadata: Record<string, unknown>,
  nowMs: number,
): boolean {
  const s = m21CaseState(caseId);
  const w = m21CaseWindow(caseId);
  const elapsed = elapsedSince(s.opened_at_ms, nowMs);

  if (ok) {
    w.log(suffix, { case: caseId, elapsed_ms: elapsed, ...metadata });
  } else if (m21Open(s)) {
    w.log('invalid_action', {
      case: caseId,
      elapsed_ms: elapsed,
      attempted: suffix,
      ...metadata,
      invalid_actions: s.invalid_actions,
    });
  }

  return ok;
}

export function m21ActInspectPlate(nowMs: number, inputMode: InputMode) {
  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);

  return m21LogOrInvalid(
    caseId,
    m21InspectPlate(s, nowMs),
    'plate_inspected',
    { inspections: s.inspections, input_mode: inputMode },
    nowMs,
  );
}

export function m21ActOpenManual(nowMs: number, inputMode: InputMode) {
  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);

  return m21LogOrInvalid(
    caseId,
    m21OpenManual(s, nowMs),
    'manual_opened',
    {
      manual_opens: s.manual_opens,
      mode: s.manual_mode,
      input_mode: inputMode,
    },
    nowMs,
  );
}

export function m21ActConsult(
  section: M21Section,
  via: 'tab' | 'reference',
  nowMs: number,
  inputMode: InputMode,
) {
  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);
  const ok = m21Consult(s, section, via, nowMs);
  const last = s.applications[s.applications.length - 1] ?? null;

  // Restudy: a consult after an application (relevant when the section
  // bears on a subsystem the last application got wrong).
  if (ok && last !== null) {
    const relevantTo = m21FaultsKnownAfter(s, s.applications.length).filter(
      (fault) => M21_RELEVANT_SECTIONS[fault].includes(section),
    );

    m21CaseWindow(caseId).log('restudy', {
      case: caseId,
      section,
      via,
      after_application: last.index,
      relevant: relevantTo.length > 0,
      relevant_to: relevantTo,
      elapsed_ms: elapsedSince(s.opened_at_ms, nowMs),
      input_mode: inputMode,
    });
  }

  return m21LogOrInvalid(
    caseId,
    ok,
    'section_consulted',
    {
      section,
      via,
      mode: s.manual_mode,
      chain_depth: s.current_chain,
      cross_reference_depth: s.cross_reference_depth,
      sections_consulted: s.sections_consulted.length,
      after_application: s.applications.length,
      input_mode: inputMode,
    },
    nowMs,
  );
}

export function m21ActSwitchMode(
  mode: M21ManualMode,
  nowMs: number,
  inputMode: InputMode,
) {
  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);

  return m21LogOrInvalid(
    caseId,
    m21SwitchMode(s, mode, nowMs),
    'mode_switched',
    { mode, mode_switches: s.mode_switches, input_mode: inputMode },
    nowMs,
  );
}

export function m21ActPost(
  post: string,
  on: boolean,
  nowMs: number,
  inputMode: InputMode,
) {
  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);

  return m21LogOrInvalid(
    caseId,
    m21SetPost(s, post, on, nowMs),
    'post_set',
    {
      post,
      on,
      after_application: s.applications.length,
      repair_actions: s.actions.length,
      input_mode: inputMode,
    },
    nowMs,
  );
}

export function m21ActSelector(
  position: string,
  nowMs: number,
  inputMode: InputMode,
) {
  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);

  return m21LogOrInvalid(
    caseId,
    m21SetSelector(s, position, nowMs),
    'selector_set',
    {
      position,
      after_application: s.applications.length,
      repair_actions: s.actions.length,
      input_mode: inputMode,
    },
    nowMs,
  );
}

/**
 * Why a FIT / SET ASIDE press is refused right now: the plate unread (the
 * v2 gate — a first application is never blind), or the press landing
 * inside the settle window after the next unit was placed (review G-H1: a
 * carried double activation never becomes the new case's application or
 * exit). Null = no refusal.
 */
function m21Refusal(
  caseId: M21Case,
  nowMs: number,
  control: 'fit' | 'set_aside' = 'fit',
): 'plate_not_inspected' | 'placement_settling' | null {
  const s = m21CaseState(caseId);

  if (
    caseId === 'o2' &&
    s.opened_at_ms !== null &&
    nowMs - s.opened_at_ms < M21_PLACE_SETTLE_MS
  ) {
    return 'placement_settling';
  }

  if (control === 'fit' && m21CanApply(s) === 'plate_not_inspected') {
    return 'plate_not_inspected';
  }

  return null;
}

/** What the acceptance feedback says about where the unit went. */
function m21DeliveryClause(
  delivery: 'inventory' | 'bench_bundle' | 'released' | null,
): string {
  switch (delivery) {
    case 'inventory':
      return 'released to the belt';
    case 'bench_bundle':
      return 'belt full, so it is set beside the bench';
    default:
      return 'released from the bench';
  }
}

/** The line that names the next unit when one is placed. */
function m21NextUnitClause(): string {
  if (m21AllClosed()) {
    return 'Both units are now off the bench.';
  }

  const def = M21_CASE_DEFS[m21ActiveCase()];

  return `${def.unit_name.charAt(0).toUpperCase()}${def.unit_name.slice(1)} placed on the bench (unit 2 of 2).`;
}

/**
 * FIT = the APPLICATION. Correct ⇒ accepted, the case completes and the
 * next unit is placed; incorrect ⇒ truthful feedback, the unit stays.
 */
export function m21ActApply(
  nowMs: number,
  inputMode: InputMode,
  deliver: () => 'inventory' | 'bench_bundle',
): string | null {
  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);
  const w = m21CaseWindow(caseId);
  const refusal = m21Refusal(caseId, nowMs);

  if (refusal !== null) {
    w.log('press_refused', {
      case: caseId,
      control: 'fit',
      reason: refusal,
      elapsed_ms: elapsedSince(s.opened_at_ms, nowMs),
      input_mode: inputMode,
    });

    return refusal === 'plate_not_inspected'
      ? 'Read the plate first (Inspect plate).'
      : null;
  }

  const application = m21Apply(s, nowMs);

  if (application === null) {
    if (m21Open(s)) {
      w.log('invalid_action', {
        case: caseId,
        elapsed_ms: elapsedSince(s.opened_at_ms, nowMs),
        attempted: 'applied',
        invalid_actions: s.invalid_actions,
        input_mode: inputMode,
      });
    }

    return null;
  }

  const def = M21_CASE_DEFS[caseId];
  const line = m21FeedbackLine(def, application);

  w.log('applied', {
    case: caseId,
    ...application,
    elapsed_ms: elapsedSince(s.opened_at_ms, nowMs),
    input_mode: inputMode,
  });

  if (application.revised) {
    w.log('revised_application', {
      case: caseId,
      index: application.index,
      correct: application.correct,
      relevant_restudy: application.relevant_restudy,
      restudy_sections: application.restudy_sections,
      input_mode: inputMode,
    });
  }

  w.log('feedback_presented', {
    case: caseId,
    index: application.index,
    correct: application.correct,
    faults: application.faults,
    text: line,
    input_mode: 'system',
  });

  if (!application.correct) {
    return line;
  }

  m21NoteOutput(s, caseId === 'o1' ? deliver() : 'released');
  w.log('accepted', {
    case: caseId,
    applications: s.applications.length,
    strategy: m21Strategy(s),
    output_delivery: s.output_delivery,
    elapsed_ms: elapsedSince(s.opened_at_ms, nowMs),
    input_mode: inputMode,
  });
  m21Close(s, 'accepted', nowMs);
  w.complete(nowMs, m21RawComponents(s), inputMode);
  m21PlaceNext(nowMs);

  // Review G-M1 / G-M2: the delivery and the next unit are named.
  return `${def.unit_name.charAt(0).toUpperCase()}${def.unit_name.slice(1)} accepted — ${m21DeliveryClause(s.output_delivery)}. ${m21NextUnitClause()}`;
}

/** The neutral explicit stop: a completed observation (an exit). */
export function m21ActSetAside(
  nowMs: number,
  inputMode: InputMode,
): string | null {
  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);
  const w = m21CaseWindow(caseId);

  if (!m21Open(s) || s.accepted) {
    return null;
  }

  if (m21Refusal(caseId, nowMs, 'set_aside') !== null) {
    w.log('press_refused', {
      case: caseId,
      control: 'set_aside',
      reason: 'placement_settling',
      elapsed_ms: elapsedSince(s.opened_at_ms, nowMs),
      input_mode: inputMode,
    });

    return null;
  }

  const unit = M21_CASE_DEFS[caseId].unit_name;

  m21Close(s, 'set_aside', nowMs);
  w.log('set_aside', {
    case: caseId,
    applications: s.applications.length,
    strategy: m21Strategy(s),
    elapsed_ms: elapsedSince(s.opened_at_ms, nowMs),
    input_mode: inputMode,
  });
  w.complete(nowMs, m21RawComponents(s), inputMode, {
    exitState: 'stopped',
  });
  m21PlaceNext(nowMs);

  return `${unit.charAt(0).toUpperCase()}${unit.slice(1)} set aside as it stands. ${m21NextUnitClause()}`;
}

/** Surface closed with the case unfinished (window stays open). */
export function m21BenchLeave(nowMs: number) {
  if (m21AllClosed()) {
    return;
  }

  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);
  const w = m21CaseWindow(caseId);

  if (m21Depart(s, nowMs)) {
    w.log('departed', {
      case: caseId,
      departures: s.departures,
      elapsed_ms: elapsedSince(s.opened_at_ms, nowMs),
      input_mode: 'system',
    });
  }

  w.pause(nowMs);
}

/** Never opened → absent; open at the review → censored (no resolution, no observation). */
export function closeM21AtReview(nowMs: number) {
  for (const caseId of M21_CASES) {
    const s = m21CaseState(caseId);
    const w = m21CaseWindow(caseId);

    if (w.windowStatus() === 'unopened') {
      w.markAbsent(`bench unit ${caseId} never opened before the review`);
      continue;
    }

    if (w.isOpen()) {
      m21Close(s, 'closed_at_review', nowMs);
      w.stop(
        nowMs,
        'closed_at_review',
        m21RawComponents(s),
        'system',
        'censored',
      );
    }
  }
}

export function m21TechnicalFailure(detail: string) {
  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);

  s.technical_failure = detail;
  s.closed = true;
  m21CaseWindow(caseId).technicalFailure(detail);
}

/** The bench chip's operational text (no count, no item wording). */
export function m21BenchChipText(live: boolean): string {
  if (!live) {
    return 'no unit issued';
  }

  if (m21AllClosed()) {
    return 'both bench units off the bench';
  }

  const caseId = m21ActiveCase();
  const s = m21CaseState(caseId);
  const unit = caseId === 'o1' ? 'relay unit' : 'pump controller';

  return s.entered
    ? `${unit} on bench · in work`
    : caseId === 'o1'
      ? `${unit} on bench`
      : `${unit} on bench · unit 2 of 2`;
}

// ——— M22 — two setback reports + the discouragement ratings ———————————————

function m22ReportState(report: M22Report): M22ReportState {
  return returnEpisode().m22[report];
}

function m22ReportWindow(report: M22Report): ItemWindow {
  return returnWindows().m22[report];
}

/** The report on the desk: report 1 until it is decided, then report 2. */
export function m22ActiveReport(): M22Report {
  return m22Decided(returnEpisode().m22.o1) ? 'o2' : 'o1';
}

export function m22AllDecided(): boolean {
  const r = returnEpisode();

  return M22_REPORTS.every((report) => m22Decided(r.m22[report]));
}

export function m22Ratings(): Readonly<M22RatingsState> {
  return returnEpisode().m22_ratings;
}

/** The report whose rating is due now (both decided, requirement seen, unrated). */
export function m22RatingDue(): M22Report | null {
  const r = returnEpisode();

  return m22RatingsDue(r.m22, r.m22_ratings)[0] ?? null;
}

/** Both reports decided and every due rating answered or declined. */
export function m22DeskDone(): boolean {
  const r = returnEpisode();

  return m22RatingsComplete(r.m22, r.m22_ratings);
}

function m22Snapshot(report: M22Report): Record<string, unknown> {
  const def = M22_REPORT_DEFS[report];

  return {
    report,
    form: m22ReportState(report).form,
    name: def.name,
    slots: def.slots,
    lines: def.lines.length,
    min_lines: def.min_lines,
    criterion_hidden_until_first_submission: true,
    rating_after_both_decisions: true,
  };
}

/** Both reports are PRESENTED with the return shift's work orders. */
export function m22Present(nowMs: number) {
  for (const report of M22_REPORTS) {
    const w = m22ReportWindow(report);

    w.setComprehension('not_required');
    w.present(nowMs, m22Snapshot(report));
  }
}

export function m22State(
  report: M22Report = m22ActiveReport(),
): Readonly<M22ReportState> {
  return m22ReportState(report);
}

export function m22Ui(): M22UiState {
  return returnEpisode().m22_ui;
}

function m22Log(
  report: M22Report,
  suffix: string,
  metadata: Record<string, unknown>,
  nowMs: number,
) {
  const s = m22ReportState(report);

  m22ReportWindow(report).log(suffix, {
    report,
    elapsed_ms: elapsedSince(s.opened_at_ms, nowMs),
    phase: s.phase,
    ...metadata,
  });
}

function m22EnterReport(
  report: M22Report,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const s = m22ReportState(report);
  const w = m22ReportWindow(report);

  if (!m22Enter(s, nowMs)) {
    return false;
  }

  w.setComprehension('not_required');
  w.open(nowMs, {
    ...m22Snapshot(report),
    open_input_mode: inputMode,
    // Entry covariates: what else of the return shift is already done.
    bench_cases_closed: m21AllClosed(),
    previous_report_decision:
      report === 'o2'
        ? m22ReportState('o1').phase === 'accepted'
          ? 'accepted'
          : m22ReportState('o1').stop_choice
        : null,
  });

  return true;
}

/** The ratings are PRESENTED once, when both reports are decided. */
/** Present the rating screen that is due now (one screen per returned report, each logged once). */
function m22PresentRatings(nowMs: number) {
  const r = returnEpisode();
  const due = m22RatingsDue(r.m22, r.m22_ratings);
  const report = due[0];

  if (
    report === undefined ||
    !m22PresentRating(r.m22, r.m22_ratings, report, nowMs)
  ) {
    return;
  }

  const progress = m22RatingProgress();

  m22Log(
    report,
    'rating_presented',
    {
      reports_due: due,
      position: progress.position,
      total: progress.total,
      settle_ms: M22_RATING_SETTLE_MS,
      since_requirement_ms:
        nowMs - (m22ReportState(report).setback_presented_at_ms ?? nowMs),
      input_mode: 'system',
    },
    nowMs,
  );
}

/** The due rating's 1-based position among the ratings that will be asked, and their total. */
export function m22RatingProgress(): { position: number; total: number } {
  const r = returnEpisode();
  const answered = M22_REPORTS.filter(
    (report) => r.m22_ratings.ratings[report] !== null,
  ).length;
  const total = M22_REPORTS.filter(
    (report) =>
      m22Decided(r.m22[report]) &&
      r.m22[report].setback_presented_at_ms !== null,
  ).length;

  return { position: Math.min(answered + 1, Math.max(total, 1)), total };
}

/** Desk surface opened: entry (once per report) or a reopening. */
export function m22DeskOpen(nowMs: number, inputMode: InputMode) {
  returnEpisode().m22_ui.selected = null;

  if (m22AllDecided()) {
    m22PresentRatings(nowMs);

    return;
  }

  const report = m22ActiveReport();

  if (m22EnterReport(report, nowMs, inputMode)) {
    return;
  }

  m22ReportWindow(report).resume(nowMs);
}

/** After a report is decided with the desk open: the next report, or the ratings. */
function m22PlaceNext(nowMs: number) {
  returnEpisode().m22_ui.selected = null;
  returnEpisode().m22_ui.registerOpen = false;

  if (m22AllDecided()) {
    m22PresentRatings(nowMs);

    return;
  }

  const report = m22ActiveReport();

  if (m22EnterReport(report, nowMs, 'system')) {
    m22Log(
      report,
      'report_placed',
      { name: M22_REPORT_DEFS[report].name, input_mode: 'system' },
      nowMs,
    );
  }
}

/** A press carried over from the previous report is refused inside the settle window. */
function m22PlacementSettling(report: M22Report, nowMs: number): boolean {
  const s = m22ReportState(report);

  return (
    report === 'o2' &&
    s.opened_at_ms !== null &&
    nowMs - s.opened_at_ms < M22_PLACE_SETTLE_MS
  );
}

export function m22ActPlace(
  slot: number,
  lineId: string,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const report = m22ActiveReport();
  const s = m22ReportState(report);
  const afterSetback = s.phase === 'returned';

  if (!m22PlaceLine(s, slot, lineId, nowMs)) {
    return false;
  }

  m22Log(
    report,
    'line_placed',
    {
      slot,
      line_id: lineId,
      after_setback: afterSetback,
      feedback_consistent: false,
      input_mode: inputMode,
    },
    nowMs,
  );

  return true;
}

export function m22ActRemove(
  slot: number,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const report = m22ActiveReport();
  const s = m22ReportState(report);
  const lineId = s.slots[slot] ?? null;
  const afterSetback = s.phase === 'returned';

  if (!m22RemoveLine(s, slot, nowMs)) {
    return false;
  }

  m22Log(
    report,
    'line_removed',
    {
      slot,
      line_id: lineId,
      after_setback: afterSetback,
      feedback_consistent: false,
      input_mode: inputMode,
    },
    nowMs,
  );

  return true;
}

export function m22ActAttachCode(
  lineId: string,
  code: string,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const report = m22ActiveReport();
  const s = m22ReportState(report);
  const mismatchedBefore = s.mismatched_code_edits;
  const first = s.strategy_change_at_ms === null;

  if (!m22AttachCode(s, lineId, code, nowMs)) {
    return false;
  }

  m22Log(
    report,
    'code_attached',
    {
      line_id: lineId,
      code,
      matches_register: s.mismatched_code_edits === mismatchedBefore,
      feedback_consistent: true,
      revision_begun: first,
      feedback_consistent_edits: s.feedback_consistent_edits,
      progress: m22Progress(s),
      input_mode: inputMode,
    },
    nowMs,
  );

  return true;
}

export function m22ActDetachCode(
  lineId: string,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const report = m22ActiveReport();
  const s = m22ReportState(report);

  if (!m22DetachCode(s, lineId, nowMs)) {
    return false;
  }

  m22Log(
    report,
    'code_detached',
    { line_id: lineId, feedback_consistent: false, input_mode: inputMode },
    nowMs,
  );

  return true;
}

export function m22ActInspectRegister(nowMs: number, inputMode: InputMode) {
  const report = m22ActiveReport();
  const s = m22ReportState(report);

  if (!m22InspectRegister(s)) {
    return false;
  }

  m22Log(
    report,
    'register_inspected',
    { inspections: s.inspections, input_mode: inputMode },
    nowMs,
  );

  return true;
}

export function m22ActAcknowledge(nowMs: number, inputMode: InputMode) {
  const report = m22ActiveReport();
  const s = m22ReportState(report);

  if (!m22Acknowledge(s, nowMs)) {
    return false;
  }

  m22Log(
    report,
    'setback_acknowledged',
    {
      setback_to_acknowledgement_ms:
        nowMs - (s.setback_presented_at_ms ?? nowMs),
      input_mode: inputMode,
    },
    nowMs,
  );

  return true;
}

/** SUBMIT: classifies the submission; acceptance completes the report and places the next. */
export function m22ActSubmit(
  nowMs: number,
  inputMode: InputMode,
): M22SubmitOutcome {
  const report = m22ActiveReport();
  const s = m22ReportState(report);
  const w = m22ReportWindow(report);

  if (m22PlacementSettling(report, nowMs)) {
    m22Log(
      report,
      'press_refused',
      {
        control: 'submit',
        reason: 'placement_settling',
        input_mode: inputMode,
      },
      nowMs,
    );

    return 'rejected_incomplete';
  }

  const outcome = m22Submit(s, nowMs);

  m22Log(
    report,
    'submitted',
    {
      outcome,
      submission_number: s.submissions.length,
      lines_placed: s.slots.filter((slot) => slot !== null).length,
      uncoded_lines: m22UncodedLines(s),
      input_mode: inputMode,
    },
    nowMs,
  );

  switch (outcome) {
    case 'setback':
      m22Log(
        report,
        'setback_presented',
        {
          criterion:
            report === 'o1'
              ? 'work_order_tags_required'
              : 'destination_bays_required',
          input_mode: 'system',
        },
        nowMs,
      );
      break;
    case 'unchanged':
      m22Log(
        report,
        'unchanged_resubmit',
        {
          repeated_unchanged_action: s.unchanged_resubmits,
          input_mode: inputMode,
        },
        nowMs,
      );
      break;
    case 'returned_again':
      m22Log(
        report,
        'resubmitted',
        {
          accepted: false,
          uncoded_lines: m22UncodedLines(s),
          input_mode: inputMode,
        },
        nowMs,
      );
      break;
    case 'accepted':
      m22Log(
        report,
        'resubmitted',
        { accepted: true, input_mode: inputMode },
        nowMs,
      );
      m22Log(report, 'accepted', { input_mode: inputMode }, nowMs);
      m22Close(s, 'accepted');
      w.complete(nowMs, m22RawComponents(s), inputMode);
      m22PlaceNext(nowMs);
      break;
    default:
      break;
  }

  return outcome;
}

/** WITHDRAW: the neutral explicit exit (disposition by the pure rule). */
export function m22ActWithdraw(nowMs: number, inputMode: InputMode): boolean {
  const report = m22ActiveReport();
  const s = m22ReportState(report);
  const w = m22ReportWindow(report);

  if (!m22Open(s) || s.phase === 'accepted') {
    return false;
  }

  if (!m22CanWithdraw(s)) {
    m22Log(
      report,
      'press_refused',
      { control: 'withdraw', reason: 'unacknowledged', input_mode: inputMode },
      nowMs,
    );

    return false;
  }

  if (m22PlacementSettling(report, nowMs)) {
    m22Log(
      report,
      'press_refused',
      {
        control: 'withdraw',
        reason: 'placement_settling',
        input_mode: inputMode,
      },
      nowMs,
    );

    return false;
  }

  const disposition = m22ClosureDisposition(s, 'withdrawn');
  const raw = m22RawComponents(s);

  m22Log(
    report,
    'withdrawn',
    {
      disposition: disposition.kind,
      revision_begun: s.strategy_change_at_ms !== null,
      input_mode: inputMode,
    },
    nowMs,
  );
  m22Close(s, 'withdrawn');

  if (disposition.kind === 'completed') {
    w.complete(nowMs, raw, inputMode, { exitState: 'stopped' });
  } else if (disposition.kind === 'missing') {
    w.stop(nowMs, 'stopped', raw, inputMode, 'censored');
  } else {
    w.stop(
      nowMs,
      'stopped',
      { ...raw, invalid_detail: disposition.detail },
      inputMode,
      'insufficient_opportunity',
    );
  }

  m22PlaceNext(nowMs);

  return true;
}

/** Answer (1–5) or decline (null) the rating due now; logged through that report's window. */
export function m22ActRate(
  value: 1 | 2 | 3 | 4 | 5 | null,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const r = returnEpisode();
  const report = m22RatingDue();

  if (report === null) {
    return false;
  }

  if (m22RatingSettling(r.m22_ratings, report, nowMs)) {
    m22Log(
      report,
      'press_refused',
      {
        control: value === null ? 'rating_decline' : `rating_${value}`,
        reason: 'rating_settling',
        input_mode: inputMode,
      },
      nowMs,
    );

    return false;
  }

  if (!m22Rate(r.m22, r.m22_ratings, report, value, nowMs)) {
    return false;
  }

  const rating = r.m22_ratings.ratings[report]!;

  m22Log(
    report,
    value === null ? 'rating_declined' : 'rating_answered',
    {
      value,
      position: rating.position,
      recall_delay_ms: rating.recall_delay_ms,
      since_presented_ms: rating.since_presented_ms,
      input_mode: inputMode,
    },
    nowMs,
  );
  // The next screen (if any) is presented now — its own settle window starts.
  m22PresentRatings(nowMs);

  return true;
}

export function m22DeskLeave(nowMs: number) {
  const r = returnEpisode();

  r.m22_ui.selected = null;

  if (m22AllDecided()) {
    const due = m22RatingDue();

    if (due !== null) {
      const presentedAt = r.m22_ratings.presented_at_ms[due];

      m22Log(
        due,
        'rating_departed',
        {
          position: m22RatingProgress().position,
          since_presented_ms: presentedAt === null ? null : nowMs - presentedAt,
          input_mode: 'system',
        },
        nowMs,
      );
    }

    return;
  }

  const report = m22ActiveReport();
  const s = m22ReportState(report);
  const w = m22ReportWindow(report);

  if (m22Depart(s)) {
    m22Log(
      report,
      'departed',
      { departures: s.departures, input_mode: 'system' },
      nowMs,
    );
  }

  w.pause(nowMs);
}

export function closeM22AtReview(nowMs: number) {
  for (const report of M22_REPORTS) {
    const s = m22ReportState(report);
    const w = m22ReportWindow(report);

    if (w.windowStatus() === 'unopened') {
      w.markAbsent(`report desk: ${report} never opened before the review`);
      continue;
    }

    if (!w.isOpen()) {
      continue;
    }

    const disposition = m22ClosureDisposition(s, 'closed_at_review');
    const raw = m22RawComponents(s);

    m22Close(s, 'closed_at_review');

    if (disposition.kind === 'invalid') {
      w.stop(
        nowMs,
        'closed_at_review',
        { ...raw, invalid_detail: disposition.detail },
        'system',
        'insufficient_opportunity',
      );
    } else {
      w.stop(nowMs, 'closed_at_review', raw, 'system', 'censored');
    }
  }
}

export function m22TechnicalFailure(detail: string) {
  const report = m22ActiveReport();
  const s = m22ReportState(report);

  s.technical_failure = detail;
  s.phase = 'closed';
  m22ReportWindow(report).technicalFailure(detail);
}

/** The desk chip's operational text (no count, no item wording). */
export function m22DeskChipText(live: boolean): string {
  if (!live) {
    return 'no report due';
  }

  if (m22DeskDone()) {
    return 'shift reports closed';
  }

  if (m22AllDecided()) {
    return 'shift reports decided · a question waits';
  }

  const report = m22ActiveReport();
  const s = m22ReportState(report);
  const name = report === 'o1' ? 'handover report' : 'consignment note';

  return s.phase === 'returned'
    ? `${name} returned · open`
    : report === 'o2'
      ? `${name} due · report 2 of 2`
      : `${name} due`;
}

// ——— M25 — questionnaire-primary handoff shell ————————————————————————

export function m25State(): Readonly<M25State> {
  return returnEpisode().m25;
}

/** The notice is available (handover desk on the return shift; once). */
export function m25PresentNotice(nowMs: number) {
  const s = returnEpisode().m25;
  const w = returnWindows().m25;

  if (!m25Present(s, nowMs)) {
    return;
  }

  w.setComprehension('not_required');
  w.present(nowMs, { administration: M25_ADMINISTRATION });
  w.open(nowMs, {
    administration: M25_ADMINISTRATION,
    in_game_response: false,
  });
}

export function m25ViewNotice() {
  m25View(returnEpisode().m25);
}

export function m25AcknowledgeNotice(nowMs: number, inputMode: InputMode) {
  const s = returnEpisode().m25;
  const w = returnWindows().m25;

  if (!m25Acknowledge(s, nowMs)) {
    return false;
  }

  w.log('handoff_acknowledged', {
    administration: M25_ADMINISTRATION,
    input_mode: inputMode,
  });
  w.complete(nowMs, m25RawComponents(s), inputMode);

  return true;
}

/** Presentation record: an unacknowledged notice closes as presented-only. */
export function closeM25AtReview(nowMs: number) {
  const s = returnEpisode().m25;
  const w = returnWindows().m25;

  if (w.windowStatus() === 'unopened') {
    w.markAbsent('questionnaire notice never presented before the review');

    return;
  }

  if (w.isOpen()) {
    w.complete(nowMs, m25RawComponents(s), 'system');
  }
}

// ——— outbound handover tray (route dressing) ————————————————————————————

export type HandoverItem = 'relay_unit' | 'relay_coupling';

/** An item was placed in the outbound tray (once per item). */
export function noteHandoverPlaced(item: HandoverItem): boolean {
  const tray = returnEpisode().handover;

  if (tray[item]) {
    return false;
  }

  tray[item] = true;

  return true;
}

export function handoverTray() {
  return { ...returnEpisode().handover };
}

// ——— probe / reset ————————————————————————————————————————————————————

/** DEV probe snapshot (read-only; never read back into gameplay). */
export function returnProbeSnapshot() {
  const r = returnEpisode();
  const w = returnWindows();
  const m20 = exteriorEpisode().m20;

  return {
    m20: {
      availability: m20ConsoleAvailability(),
      status: m20ConsoleStatus(m20),
      window: exteriorWindows().m20.windowStatus(),
      window_id: exteriorWindows().m20.spec.windowId,
      exit: exteriorWindows().m20.exit(),
      settling: m20ConsoleSettling(Date.now()),
      ...m20ResumeRawComponents(m20),
    },
    m21: {
      active: m21ActiveCase(),
      all_closed: m21AllClosed(),
      o1: {
        window: w.m21.o1.windowStatus(),
        exit: w.m21.o1.exit(),
        entered: r.m21.o1.entered,
        closed: r.m21.o1.closed,
        manual_mode: r.m21.o1.manual_mode,
        current_section: r.m21.o1.current_section,
        ...m21RawComponents(r.m21.o1),
      },
      o2: {
        window: w.m21.o2.windowStatus(),
        exit: w.m21.o2.exit(),
        entered: r.m21.o2.entered,
        closed: r.m21.o2.closed,
        manual_mode: r.m21.o2.manual_mode,
        current_section: r.m21.o2.current_section,
        ...m21RawComponents(r.m21.o2),
      },
    },
    m22: {
      active: m22ActiveReport(),
      all_decided: m22AllDecided(),
      rating_due: m22RatingDue(),
      desk_done: m22DeskDone(),
      selected: r.m22_ui.selected,
      register_open: r.m22_ui.registerOpen,
      ratings: {
        o1: r.m22_ratings.ratings.o1,
        o2: r.m22_ratings.ratings.o2,
      },
      o1: {
        window: w.m22.o1.windowStatus(),
        exit: w.m22.o1.exit(),
        entered: r.m22.o1.entered,
        phase: r.m22.o1.phase,
        uncoded_lines: m22UncodedLines(r.m22.o1),
        ...m22RawComponents(r.m22.o1, r.m22_ratings.ratings.o1),
      },
      o2: {
        window: w.m22.o2.windowStatus(),
        exit: w.m22.o2.exit(),
        entered: r.m22.o2.entered,
        phase: r.m22.o2.phase,
        uncoded_lines: m22UncodedLines(r.m22.o2),
        ...m22RawComponents(r.m22.o2, r.m22_ratings.ratings.o2),
      },
    },
    m25: {
      window: w.m25.windowStatus(),
      exit: w.m25.exit(),
      handoff: r.m25.handoff,
      ...m25RawComponents(r.m25),
    },
    handover: { ...r.handover },
  };
}

/** Test-only escape hatch (page-session state otherwise). */
export function resetReturnEpisode() {
  state = null;
  windows = null;
}
