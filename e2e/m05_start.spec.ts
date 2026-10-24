/**
 * Station 080 M05 — two explicitly accepted extra jobs with a visible
 * start control and a 60-second focused cap (Unit 6), pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row; the
 * offer (settle window refuses a carried press and re-presents; accept /
 * decline are deliberate; a decline closes outside the set); eligibility
 * (no clock before acceptance or while a prompt, a paused host or a
 * world action blocks a usable start; the clock starts at the first
 * unblocked moment; blocks pause it under their causes; the job's own
 * surface never pauses it); the start (latency on FOCUSED time with the
 * excluded intervals by cause; the standard work cycle; a closed surface
 * pauses the work); the explicit deferral; the cap (never a start, never
 * a 60 s latency); the exit; the review and reload closures; late starts
 * as companions; and the extractor reproducing the per-occasion record —
 * started ≠ deferred ≠ exited ≠ cap ≠ interrupted, declined outside the
 * set, pending / not presented / interrupted distinct, no mean anywhere.
 *
 * U24 RL-2 (`RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4 G2, §5 M05, §8;
 * register §5.406 decision A, §5.407): every r3 §5 M05 row after a reload,
 * with each occasion's class and permission to administer as well as the
 * reading; F-A to F-E at row level; the RL-1C missing-check rule with its
 * first-load and unreached contrasts. The records are built here from r3
 * §4's stage map with the RL-0 helper (independent of the extractor's own
 * map, which is compared with it); the expected readings are written from
 * r3 §5, never from running the extractor. The last block runs in the
 * browser (genuine `page.reload()`s, ordinary input): r3 §8 R1–R4 for the
 * four offer rows M05, M09, M10 and M11 together, along one route, and R6
 * for M05's held screens.
 */
import { expect, type Page, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import {
  classifyM05Reload,
  m05PriorLoadCheck,
} from '../src/measurement/features/m05';
import { resetFocusMonitor } from '../src/measurement/focusMonitor';
import { PILOT_SETTINGS } from '../src/measurement/protocol';
import { registerEntry } from '../src/measurement/registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  type ReloadEvent,
} from '../src/measurement/reloadCheck';
import {
  createM05State,
  M05_FAMILY,
  M05_JOBS,
  M05_OPPORTUNITY_IDS,
  M05_SETTLE_MS,
  M05_START_CAP_MS,
  M05_WORK_MS,
  m05Answer,
  m05CapDue,
  m05ControlPresented,
  m05Defer,
  m05Eligible,
  m05Exit,
  m05Freeze,
  type M05LogSink,
  type M05Occasion,
  m05Open,
  m05Poll,
  m05Present,
  m05PriorAdministration,
  m05RawComponents,
  m05SetBlock,
  m05Start,
  type M05State,
  m05SurfaceClosed,
  m05SurfaceReopened,
  m05WorkTick,
} from '../src/pilot/windows/m05StartModel';
import { M09_OFFER_LABELS } from '../src/pilot/windows/m09WatchModel';
import { M10_OFFER_LABELS } from '../src/pilot/windows/m10DeliveryModel';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { APPROACH, ensureOutsideCompound, YARD } from './exteriorHelpers';
import { press, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToWorkshop,
  concourseVia,
  dockToConcourse,
  expectStage,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  promptLabels,
  registryApproach,
  selectPromptLabel,
  useDoor,
  workshopToConcourse,
  yardVia,
} from './pilotHelpers';
import { surface, waitSurface } from './returnHelpers';
import {
  boardFirstCard,
  concourseToLab,
  openKai,
  openNoor,
  openVale,
  reloadToDock,
} from './u24Helpers';

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    occasion: M05Occasion,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: occasion === 'o1' ? 'station_concourse' : 'exterior_recovery_yard',
      event_type: `${M05_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: M05_OPPORTUNITY_IDS[occasion],
        occasion,
        ...metadata,
      },
    });
  };
  const sink =
    (occasion: M05Occasion): M05LogSink =>
    (suffix, metadata) =>
      push(occasion, suffix, metadata);

  return {
    events,
    sink,
    presented: (occasion: M05Occasion) =>
      push(occasion, 'presented', { input_mode: 'system' }),
    opened: (occasion: M05Occasion) =>
      push(occasion, 'opportunity_opened', { input_mode: 'system' }),
    close: (
      s: M05State,
      reason: string,
      nowMs: number,
      exit: 'completed' | 'stopped' | 'closed_at_review' = 'completed',
    ) =>
      push(s.occasion, 'window_closed', {
        exit_state: exit,
        [exit === 'closed_at_review'
          ? 'raw_components_partial'
          : 'raw_components']: m05RawComponents(s, reason, nowMs),
      }),
  };
}

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };
const T0 = 100_000;

/** Offer presented at `at`, accepted a second later (past the settle window). */
function acceptAt(s: M05State, at: number, log: M05LogSink) {
  expect(m05Present(s, at, log)).toBe(true);
  expect(m05Answer(s, true, 1, at + 1_000, 'keyboard', log)).toBe('accepted');
}

/** Accepted at `at`, eligible one frame later. */
function eligibleAt(s: M05State, at: number, log: M05LogSink): number {
  acceptAt(s, at, log);
  expect(m05Poll(s, at + 1_016, log, 300)).toBe('eligible');

  return at + 1_016;
}

test.beforeEach(() => {
  resetFocusMonitor();
});

test.describe('M05 accepted extra jobs (pure)', () => {
  test('register row: v3 route with one window per occasion in different rooms, a latency-with-status primary and an acceptance/exposure companion, 60 s focused cap', () => {
    const entry = registerEntry('M05');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m05_start_o1',
      'proto_m05_start_o2',
    ]);
    expect(
      entry.route.windows.map((w) => [w.id, w.occasion, w.zone, w.episode]),
    ).toEqual([
      ['m05_start_o1', 'o1', 'station_concourse', 1],
      ['m05_start_o2', 'o2', 'exterior_recovery_yard', 4],
    ]);
    expect(entry.route.family_prefixes).toEqual(['proto_m05_start_']);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.independence.kind).toBe('independent_occasions');
    expect(entry.features.map((f) => [f.feature_id, f.kind, f.role])).toEqual([
      ['m05_start_latency', 'latency_with_status', 'primary'],
      ['m05_acceptance_exposure', 'count', 'companion'],
    ]);
    expect(entry.features[0].planned_denominator).toBeNull();
    expect(entry.features[0].missing_rule).toContain(
      'never a starter-only mean',
    );
    expect(entry.operational_label).toBe('Extra jobs (Concourse / Yard)');
    expect(M05_START_CAP_MS).toBe(PILOT_SETTINGS.m05_start_cap_ms);
    expect(M05_START_CAP_MS).toBe(60_000);
  });

  test('offer: a press inside the settle window is refused and the stage re-presented; accept and decline are deliberate; a decline closes outside the set; nothing answers twice', () => {
    const h = harness();
    const s = createM05State('o1');
    const log = h.sink('o1');

    expect(m05Answer(s, true, 1, T0, 'keyboard', log)).toBe('invalid'); // never presented
    expect(m05Present(s, T0, log)).toBe(true);
    expect(m05Answer(s, true, 1, T0 + 100, 'keyboard', log)).toBe('refused');
    expect(s.offer_refused_presses).toBe(1);
    expect(s.accepted).toBeNull();
    // Re-presented in place: the settle reference moves to the new presentation.
    expect(m05Present(s, T0 + 120, log)).toBe(true);
    expect(s.offer_presentations).toBe(2);
    expect(
      m05Answer(s, true, 1, T0 + 120 + M05_SETTLE_MS - 1, 'keyboard', log),
    ).toBe('refused');
    expect(
      m05Answer(s, true, 1, T0 + 120 + M05_SETTLE_MS, 'keyboard', log),
    ).toBe('accepted');
    expect(s.accepted).toBe(true);
    expect(s.offer_latency_ms).toBe(M05_SETTLE_MS);
    expect(m05Open(s)).toBe(true);
    expect(m05Answer(s, false, 2, T0 + 5_000, 'keyboard', log)).toBe('invalid');
    expect(m05Present(s, T0 + 5_000, log)).toBe(false);
    expect(
      h.events
        .filter((e) => e.event_type === 'proto_m05_start_offer_press_refused')
        .map((e) => e.metadata?.refused_presses),
    ).toEqual([1, 2]);
    expect(
      h.events.filter(
        (e) => e.event_type === 'proto_m05_start_offer_represented',
      ),
    ).toHaveLength(1);

    const answered = h.events.find(
      (e) => e.event_type === 'proto_m05_start_offer_answered',
    );

    expect(answered?.metadata).toMatchObject({
      accepted: true,
      option_position: 1,
      option_count: 2,
      focus_default_position: 1,
      refused_presses: 2,
    });

    // Decline: closed outside the set, never open, no clock ever.
    const d = createM05State('o2');
    const dlog = h.sink('o2');

    m05Present(d, T0, dlog);
    expect(m05Answer(d, false, 2, T0 + 1_000, 'pointer', dlog)).toBe(
      'declined',
    );
    expect(d.accepted).toBe(false);
    expect(m05Open(d)).toBe(false);
    expect(d.closureReason).toBe('declined');
    expect(m05Poll(d, T0 + 2_000, dlog)).toBe('none');
    expect(d.clock).toBeNull();
    expect(m05Start(d, T0 + 3_000, 'pointer', dlog)).toBe('invalid');
    expect(m05RawComponents(d, 'declined', T0 + 3_000)).toMatchObject({
      accepted: false,
      eligible: false,
      status: null,
      latency_focused_ms: null,
    });
  });

  test('eligibility: no clock before acceptance or while a prompt / paused host / world action blocks; the clock starts at the first unblocked moment; blocks pause it by cause; the own surface never pauses; a start records focused latency with the excluded time beside it', () => {
    const h = harness();
    const s = createM05State('o1');
    const log = h.sink('o1');

    // Before acceptance nothing polls into a clock.
    expect(m05Poll(s, T0, log)).toBe('none');
    m05Present(s, T0, log);
    expect(m05Poll(s, T0 + 500, log)).toBe('none');
    expect(m05Answer(s, true, 1, T0 + 1_000, 'keyboard', log)).toBe('accepted');
    // The offer prompt (and the M09 / M10 prompts after it) still hold the room.
    m05SetBlock(s, 'prompt', true, T0 + 1_000);
    expect(m05Poll(s, T0 + 1_016, log)).toBe('none');
    expect(m05Poll(s, T0 + 9_000, log)).toBe('none');
    expect(s.clock).toBeNull();
    expect(s.eligible_at_ms).toBeNull();
    // Prompt closes: the next poll starts the clock (the start control is usable).
    m05SetBlock(s, 'prompt', false, T0 + 10_000);
    expect(m05Poll(s, T0 + 10_016, log, 250)).toBe('eligible');
    expect(s.eligible_at_ms).toBe(T0 + 10_016);
    expect(m05Eligible(s)).toBe(true);

    const eligible = h.events.find(
      (e) => e.event_type === 'proto_m05_start_eligible',
    );

    expect(eligible?.metadata).toMatchObject({
      wait_before_eligible_ms: 9_016,
      start_cap_ms: 60_000,
      distance_px: 250,
    });

    const t = T0 + 10_016;

    // The M01 board opens (host paused under another surface): paused.
    m05SetBlock(s, 'host_paused', true, t + 2_000);
    expect(m05Eligible(s)).toBe(false);
    expect(s.clock!.activeCauses()).toEqual(['unusable_controls']);
    expect(s.clock!.focusedMs(t + 5_000)).toBe(2_000);
    expect(s.clock!.wallMs(t + 5_000)).toBe(5_000);
    m05SetBlock(s, 'host_paused', false, t + 6_000);
    expect(m05Eligible(s)).toBe(true);
    // A prompt (Vale's beat) and a world action: distinct causes.
    m05SetBlock(s, 'prompt', true, t + 7_000);
    m05SetBlock(s, 'world_action', true, t + 7_500);
    expect(new Set(s.clock!.activeCauses())).toEqual(
      new Set(['unusable_controls', 'animation_lock']),
    );
    m05SetBlock(s, 'prompt', false, t + 8_000);
    expect(s.clock!.activeCauses()).toEqual(['animation_lock']);
    m05SetBlock(s, 'world_action', false, t + 9_000);
    expect(m05Eligible(s)).toBe(true);
    // Focused so far: 2000 (t..t+2000) + 1000 (t+6000..t+7000) = 3000.
    expect(s.clock!.focusedMs(t + 9_000)).toBe(3_000);
    expect(m05Poll(s, t + 9_000, log)).toBe('none');

    // The job's own surface opens: the host pauses, which is NOT a block here.
    m05ControlPresented(s, t + 10_000, log);
    m05SetBlock(s, 'host_paused', true, t + 10_001);
    expect(m05Eligible(s)).toBe(true);
    expect(s.control_views).toBe(1);
    expect(s.first_control_view_focused_ms).toBe(4_000);
    // A press carried from the station prompt is refused.
    expect(m05Start(s, t + 10_100, 'keyboard', log)).toBe('refused');
    expect(s.refused_presses).toBe(1);
    expect(s.status).toBeNull();
    // Start: latency on FOCUSED time only.
    expect(m05Start(s, t + 10_500, 'pointer', log)).toBe('started');
    expect(s.status).toBe('started');
    expect(s.latency_focused_ms).toBe(4_500);
    expect(s.latency_wall_ms).toBe(10_500);
    expect(s.excluded_ms).toMatchObject({
      unusable_controls: 4_000 + 1_000,
      animation_lock: 1_500,
    });
    expect(s.excluded_total_ms).toBe(6_000);
    expect(s.clock!.isRunning()).toBe(false);
    expect(m05Start(s, t + 10_600, 'pointer', log)).toBe('invalid'); // work already runs

    const started = h.events.find(
      (e) => e.event_type === 'proto_m05_start_started',
    );

    expect(started?.metadata).toMatchObject({
      latency_focused_ms: 4_500,
      latency_wall_ms: 10_500,
      control_views: 1,
      input_mode: 'pointer',
      phase: 'measurement',
    });

    // The standard work cycle on focused time; a closed surface pauses it.
    expect(m05WorkTick(s, t + 11_500, log)).toBe('none');
    m05SurfaceClosed(s, t + 11_500, log);
    expect(m05WorkTick(s, t + 20_000, log)).toBe('none'); // paused: no unattended completion
    m05SurfaceReopened(s, t + 20_000, log);
    expect(m05WorkTick(s, t + 20_999, log)).toBe('none');
    expect(m05WorkTick(s, t + 21_000, log)).toBe('work_completed');
    expect(s.work_focused_ms).toBe(M05_WORK_MS);
    expect(s.work_wall_ms).toBe(10_500);
    expect(s.closureReason).toBe('completed');
    expect(m05RawComponents(s, 'completed', t + 21_000)).toMatchObject({
      accepted: true,
      eligible: true,
      wait_before_eligible_ms: 9_016,
      status: 'started',
      latency_focused_ms: 4_500,
      latency_wall_ms: 10_500,
      exposure_focused_ms: 4_500,
      control_views: 1,
      refused_presses: 1,
      work_completed: true,
      late_start: null,
      closure_reason: 'completed',
    });
  });

  test('deferral: "Not now" closes the occasion as deferred with its exposure and a null latency; a later start is a late start (companion) that never rewrites the primary', () => {
    const h = harness();
    const s = createM05State('o2');
    const log = h.sink('o2');
    const t = eligibleAt(s, T0, log);

    m05ControlPresented(s, t + 3_000, log);
    expect(m05Defer(s, t + 3_100, 'keyboard', log)).toBe('refused'); // settle
    expect(m05Defer(s, t + 3_500, 'keyboard', log)).toBe('deferred');
    expect(s.status).toBe('deferred');
    expect(s.closureReason).toBe('voluntary_stop');
    expect(s.latency_focused_ms).toBeNull();
    expect(s.exposure_focused_ms).toBe(3_500);
    expect(m05Open(s)).toBe(false);
    expect(m05Poll(s, t + 100_000, log)).toBe('none'); // no cap after a closure
    expect(m05Defer(s, t + 4_000, 'keyboard', log)).toBe('invalid');

    // Late start: recorded beside, the primary unchanged.
    m05ControlPresented(s, t + 30_000, log);
    expect(s.control_views).toBe(1); // views after the decision are not counted
    expect(m05Start(s, t + 30_500, 'pointer', log)).toBe('late');
    expect(s.status).toBe('deferred');
    expect(s.latency_focused_ms).toBeNull();
    expect(s.late_start).toMatchObject({
      after: 'deferred',
      since_closure_ms: 27_000,
      input_mode: 'pointer',
      work_completed: false,
    });
    expect(m05WorkTick(s, t + 30_500 + M05_WORK_MS, log)).toBe(
      'work_completed',
    );
    expect(s.late_start?.work_completed).toBe(true);
    expect(m05Start(s, t + 40_000, 'pointer', log)).toBe('invalid');

    const raw = m05RawComponents(s, 'voluntary_stop', t + 40_000);

    expect(raw).toMatchObject({
      status: 'deferred',
      latency_focused_ms: null,
      exposure_focused_ms: 3_500,
      work_completed: false,
      late_start: { after: 'deferred', work_completed: true },
    });
    expect(
      h.events
        .map((e) => e.event_type)
        .filter((type) => /deferred|late_start|work_completed/.test(type)),
    ).toEqual([
      'proto_m05_start_deferred',
      'proto_m05_start_late_start',
      'proto_m05_start_work_completed',
    ]);
    expect(
      h.events.find((e) => e.event_type === 'proto_m05_start_work_completed')
        ?.metadata?.late,
    ).toBe(true);
  });

  test('cap: 60 focused seconds without a start close the occasion as cap — censored, latency null, never a 60 s start; paused time never counts toward it; a start afterwards is late', () => {
    const h = harness();
    const s = createM05State('o1');
    const log = h.sink('o1');
    const t = eligibleAt(s, T0, log);

    // 20 s focused, then 100 s under a paused host, then the rest.
    expect(m05Poll(s, t + 20_000, log)).toBe('none');
    m05SetBlock(s, 'host_paused', true, t + 20_000);
    expect(m05Poll(s, t + 120_000, log)).toBe('none'); // paused: 20 s focused so far
    m05SetBlock(s, 'host_paused', false, t + 120_000);
    expect(m05Poll(s, t + 120_000 + 39_999, log)).toBe('none');
    expect(m05Poll(s, t + 160_000, log)).toBe('cap');
    expect(s.status).toBe('cap');
    expect(s.closureReason).toBe('cap');
    expect(s.latency_focused_ms).toBeNull();
    expect(s.exposure_focused_ms).toBe(M05_START_CAP_MS);
    expect(s.exposure_wall_ms).toBe(160_000);
    expect(s.excluded_ms?.unusable_controls).toBe(100_000);
    expect(m05Poll(s, t + 200_000, log)).toBe('none');

    const cap = h.events.find(
      (e) => e.event_type === 'proto_m05_start_cap_reached',
    );

    expect(cap?.metadata).toMatchObject({
      start_cap_ms: 60_000,
      focused_ms: 60_000,
      wall_ms: 160_000,
    });
    expect(
      h.events.some((e) => e.event_type === 'proto_m05_start_started'),
    ).toBe(false);

    m05ControlPresented(s, t + 170_000, log);
    expect(m05Start(s, t + 170_500, 'keyboard', log)).toBe('late');
    expect(s.status).toBe('cap');
    expect(m05RawComponents(s, 'cap', t + 171_000)).toMatchObject({
      status: 'cap',
      cap_reached: true,
      latency_focused_ms: null,
      exposure_focused_ms: 60_000,
      late_start: { after: 'cap' },
    });
  });

  test('exit, review and reload: leaving closes an unstarted occasion as exited; a started one keeps its latency with the work as it stands; the review interrupts an open occasion; the reload guard recognises the same occasion only', () => {
    const h = harness();
    const a = createM05State('o1');
    const alog = h.sink('o1');
    const ta = eligibleAt(a, T0, alog);

    expect(m05Exit(a, ta + 12_000, alog, 'room_left')).toBe(true);
    expect(a.status).toBe('exited');
    expect(a.closureReason).toBe('route_departure');
    expect(a.latency_focused_ms).toBeNull();
    expect(a.exposure_focused_ms).toBe(12_000);
    expect(m05Exit(a, ta + 13_000, alog)).toBe(false);
    expect(
      h.events.find((e) => e.event_type === 'proto_m05_start_exited')?.metadata,
    ).toMatchObject({
      detail: 'room_left',
      focused_ms: 12_000,
      eligible: true,
    });

    // Started, then the shift ends mid-work.
    const b = createM05State('o2');
    const blog = h.sink('o2');
    const tb = eligibleAt(b, T0, blog);

    m05ControlPresented(b, tb + 5_000, blog);
    expect(m05Start(b, tb + 5_500, 'pointer', blog)).toBe('started');
    expect(m05Exit(b, tb + 6_000, blog, 'shift_ended')).toBe(true);
    expect(b.status).toBe('started');
    expect(b.latency_focused_ms).toBe(5_500);
    expect(b.closureReason).toBe('route_departure');
    expect(m05RawComponents(b, 'route_departure', tb + 6_000)).toMatchObject({
      status: 'started',
      work_completed: false,
      work_focused_ms: 500,
    });

    // Accepted before eligibility (a prompt still open) and never eligible:
    // an exit records a non-start with no exposure.
    const c = createM05State('o1');
    const clog = h.sink('o1');

    acceptAt(c, T0, clog);
    m05SetBlock(c, 'prompt', true, T0 + 1_000);
    expect(m05Exit(c, T0 + 2_000, clog)).toBe(true);
    expect(c.status).toBe('exited');
    expect(c.eligible_at_ms).toBeNull();
    expect(c.exposure_focused_ms).toBeNull();

    // The review closes an open occasion as interrupted (kind review).
    const r = createM05State('o2');
    const rlog = h.sink('o2');

    eligibleAt(r, T0, rlog);
    m05Freeze(r, T0 + 30_000, 'closed_at_review', 'review');
    expect(r.status).toBe('interrupted');
    expect(r.interruption_kind).toBe('review');
    expect(r.exposure_focused_ms).toBe(30_000 - 1_016);

    // Reload guard: the same occasion only.
    const prior = [
      {
        event_type: 'proto_m05_start_opportunity_opened',
        metadata: { occasion: 'o1' },
      },
    ];

    expect(m05PriorAdministration(prior, 'o1')).toBe(true);
    expect(m05PriorAdministration(prior, 'o2')).toBe(false);
    expect(m05PriorAdministration([], 'o1')).toBe(false);

    const held = createM05State('o1');

    m05Freeze(held, T0, 'prior_administration', 'reload');
    expect(held.status).toBe('interrupted');
    expect(held.interruption_kind).toBe('reload');
    expect(m05Present(held, T0, h.sink('o1'))).toBe(true); // model-level; the adapter refuses via m05OfferAvailable
  });

  test('extractor: per-occasion record — started (latency) beside cap (censored, null) is observed with no mean; declined is outside the set; both declined ⇒ declined; open ⇒ pending; not presented ≠ interrupted; held-back beside observed ⇒ interrupted with the value kept; record/event disagreement ⇒ technical failure', () => {
    const h = harness();
    const a = createM05State('o1');
    const b = createM05State('o2');

    h.presented('o1');
    acceptAt(a, T0, h.sink('o1'));
    h.opened('o1');

    const ta = T0 + 1_016;

    expect(m05Poll(a, ta, h.sink('o1'), 200)).toBe('eligible');
    m05ControlPresented(a, ta + 11_000, h.sink('o1'));
    expect(m05Start(a, ta + 12_345, 'pointer', h.sink('o1'))).toBe('started');
    expect(m05WorkTick(a, ta + 12_345 + M05_WORK_MS, h.sink('o1'))).toBe(
      'work_completed',
    );
    h.close(a, 'completed', ta + 12_345 + M05_WORK_MS);

    h.presented('o2');
    acceptAt(b, T0 + 500_000, h.sink('o2'));
    h.opened('o2');

    const tb = T0 + 501_016;

    expect(m05Poll(b, tb, h.sink('o2'), 400)).toBe('eligible');
    expect(m05Poll(b, tb + 60_000, h.sink('o2'))).toBe('cap');
    h.close(b, 'cap', tb + 60_000, 'stopped');

    const rows = extractItemFeatures('M05', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      feature_id: 'm05_start_latency',
      disposition: 'observed',
      censored: true,
      censor_reason: 'an occasion reached the cap',
      closure_reason: 'completed',
      included_ids: ['m05_start_o1', 'm05_start_o2'],
      coverage_label: 'behavioural_counterpart',
      independence: 'independent_occasions',
      numerator: null,
      denominator: null,
      planned_denominator: null,
    });
    expect(rows[0].value).toEqual({
      o1: {
        occasion: 'o1',
        status: 'started',
        observed: true,
        latency_focused_ms: 12_345,
        latency_wall_ms: 12_345,
        exposure_focused_ms: 12_345,
        censored: false,
        censor_reason: null,
        start_cap_ms: 60_000,
        closure_reason: 'completed',
      },
      o2: {
        occasion: 'o2',
        status: 'cap',
        observed: true,
        latency_focused_ms: null,
        latency_wall_ms: null,
        exposure_focused_ms: 60_000,
        censored: true,
        censor_reason: 'focused cap reached without a start',
        start_cap_ms: 60_000,
        closure_reason: 'cap',
      },
    });
    expect(rows[0].components).toMatchObject({
      occasions_accepted: ['o1', 'o2'],
      occasions_observed: ['o1', 'o2'],
      occasions_declined: [],
      starters: ['o1'],
      non_starters: ['o2'],
      status_by_occasion: { o1: 'started', o2: 'cap' },
      started_event_agrees: true,
    });
    // No mean, average or total anywhere in the row.
    expect(JSON.stringify(rows[0])).not.toMatch(/mean|average|total_latency/i);
    expect(rows[1]).toMatchObject({
      feature_id: 'm05_acceptance_exposure',
      disposition: 'observed',
    });

    const exposure = rows[1].value as {
      o1: Record<string, unknown>;
      o2: Record<string, unknown>;
    };

    expect(exposure.o1).toMatchObject({
      accepted: true,
      answer_option_position: 1,
      eligible: true,
      wait_before_eligible_ms: 16,
      distance_px_at_eligibility: 200,
      control_views: 1,
      work_completed: true,
      late_start: null,
    });
    expect(exposure.o2).toMatchObject({
      accepted: true,
      eligible: true,
      exposure_focused_ms: 60_000,
      control_views: 0,
      work_completed: false,
    });

    // Declined beside a deferred one: the declined occasion is outside the set.
    const d = harness();
    const d1 = createM05State('o1');
    const d2 = createM05State('o2');

    d.presented('o1');
    m05Present(d1, T0, d.sink('o1'));
    expect(m05Answer(d1, false, 2, T0 + 1_000, 'keyboard', d.sink('o1'))).toBe(
      'declined',
    );
    d.opened('o1');
    d.close(d1, 'declined', T0 + 1_000, 'stopped');
    d.presented('o2');

    const td = eligibleAt(d2, T0 + 10_000, d.sink('o2'));

    d.opened('o2');
    m05ControlPresented(d2, td + 4_000, d.sink('o2'));
    expect(m05Defer(d2, td + 4_500, 'keyboard', d.sink('o2'))).toBe('deferred');
    d.close(d2, 'voluntary_stop', td + 4_500, 'stopped');

    const dRows = extractItemFeatures('M05', d.events, CONTEXT);

    expect(dRows[0]).toMatchObject({
      disposition: 'observed',
      censored: false,
      included_ids: ['m05_start_o2'],
    });
    expect(dRows[0].value).toMatchObject({
      o1: { occasion: 'o1', declined: true },
      o2: {
        status: 'deferred',
        latency_focused_ms: null,
        exposure_focused_ms: 4_500,
        censored: false,
        closure_reason: 'voluntary_stop',
      },
    });
    expect(dRows[0].components).toMatchObject({
      occasions_declined: ['o1'],
      occasions_observed: ['o2'],
      non_starters: ['o2'],
    });
    expect((dRows[1].value as { o1: { accepted: boolean } }).o1).toMatchObject({
      accepted: false,
      answer_option_position: 2,
    });

    // Both declined ⇒ declined, null; the companion still describes both.
    const n = harness();
    const n1 = createM05State('o1');
    const n2 = createM05State('o2');

    for (const [s, occ] of [
      [n1, 'o1'],
      [n2, 'o2'],
    ] as const) {
      n.presented(occ);
      m05Present(s, T0, n.sink(occ));
      m05Answer(s, false, 2, T0 + 1_000, 'keyboard', n.sink(occ));
      n.opened(occ);
      n.close(s, 'declined', T0 + 1_000, 'stopped');
    }

    const nRows = extractItemFeatures('M05', n.events, CONTEXT);

    expect(nRows[0]).toMatchObject({
      value: null,
      disposition: 'declined',
      included_ids: [],
    });
    expect(nRows[1].disposition).toBe('observed');

    // Accepted and open ⇒ pending; presented and unanswered ⇒ pending.
    const o = harness();

    o.presented('o1');
    expect(
      extractItemFeatures('M05', o.events, OPEN_CONTEXT)[0].disposition,
    ).toBe('pending');
    o.opened('o1');
    expect(extractItemFeatures('M05', o.events, OPEN_CONTEXT)[0]).toMatchObject(
      {
        disposition: 'pending',
        censored: true,
      },
    );

    // Nothing ⇒ not presented; after a reload ⇒ interrupted; held back ⇒ interrupted.
    expect(extractItemFeatures('M05', [], CONTEXT)[0].disposition).toBe(
      'not_presented',
    );
    expect(
      extractItemFeatures('M05', [], { ...CONTEXT, reloaded: true })[0]
        .disposition,
    ).toBe('interrupted');

    const held = harness();

    held.sink('o1')('technical_failure', {
      detail: 'reload after administration: job not re-offered',
      input_mode: 'system',
    });
    expect(
      extractItemFeatures('M05', held.events, CONTEXT)[0].disposition,
    ).toBe('interrupted');

    // Held back beside an observed exit: interrupted, value kept.
    const mixed = harness();
    const m2 = createM05State('o2');

    mixed.sink('o1')('technical_failure', {
      detail: 'reload after administration: job not re-offered',
      input_mode: 'system',
    });
    mixed.presented('o2');

    const tm = eligibleAt(m2, T0, mixed.sink('o2'));

    mixed.opened('o2');
    expect(m05Exit(m2, tm + 7_000, mixed.sink('o2'))).toBe(true);
    mixed.close(m2, 'route_departure', tm + 7_000, 'stopped');

    const mixedRows = extractItemFeatures('M05', mixed.events, {
      ...CONTEXT,
      reloaded: true,
    });

    expect(mixedRows[0]).toMatchObject({
      disposition: 'interrupted',
      censored: true,
      censor_reason: 'an accepted occasion was interrupted or held back',
    });
    expect(mixedRows[0].value).toMatchObject({
      o1: { occasion: 'o1', interrupted: true },
      o2: { status: 'exited', exposure_focused_ms: 7_000, censored: false },
    });
    expect(mixedRows[0].components).toMatchObject({
      occasions_interrupted: ['o1'],
      occasions_observed: ['o2'],
    });

    // A record claiming a start with no started event is a technical fault.
    const tampered = h.events.map((event) =>
      event.event_type === 'proto_m05_start_started' &&
      event.metadata?.occasion === 'o1'
        ? { ...event, event_type: 'proto_m05_start_started_removed' }
        : event,
    );

    expect(extractItemFeatures('M05', tampered, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
  });

  test('review fixes: the cap applies while the job surface is open (a press at the cap is a late start, "Not now" at the cap is the cap); focus loss is excluded from the latency; a never-eligible exit and an interrupted occasion are missing, never non-starts; an over-cap latency is a technical fault', () => {
    // Cap on the open surface: the poll ticks from the surface itself.
    const h = harness();
    const s = createM05State('o1');
    const log = h.sink('o1');
    const t = eligibleAt(s, T0, log);

    m05ControlPresented(s, t + 1_000, log);
    m05SetBlock(s, 'host_paused', true, t + 1_001); // the host pauses under the own surface — never a block
    expect(m05Poll(s, t + 59_999, log)).toBe('none');
    expect(m05CapDue(s, t + 59_999)).toBe(false);
    expect(m05Poll(s, t + 60_000, log)).toBe('cap');
    expect(s.status).toBe('cap');
    expect(
      h.events.find((e) => e.event_type === 'proto_m05_start_cap_reached')
        ?.metadata?.surface_open,
    ).toBe(true);
    expect(m05Start(s, t + 61_000, 'pointer', log)).toBe('late');
    expect(s.late_start?.after).toBe('cap');

    // A Start press that arrives at or past the cap (no tick in between).
    const p = createM05State('o2');
    const plog = h.sink('o2');
    const tp = eligibleAt(p, T0, plog);

    m05ControlPresented(p, tp + 59_000, plog);
    expect(m05Start(p, tp + 60_500, 'keyboard', plog)).toBe('late');
    expect(p.status).toBe('cap');
    expect(p.latency_focused_ms).toBeNull();
    expect(p.exposure_focused_ms).toBe(60_500);
    expect(
      h.events.some(
        (e) =>
          e.event_type === 'proto_m05_start_started' &&
          e.metadata?.occasion === 'o2',
      ),
    ).toBe(false);

    // "Not now" at the cap is the cap's closure, not a deferral.
    const d = createM05State('o1');
    const dlog = harness().sink('o1');
    const td = eligibleAt(d, T0, dlog);

    m05ControlPresented(d, td + 59_000, dlog);
    expect(m05Defer(d, td + 60_000, 'pointer', dlog)).toBe('invalid');
    expect(d.status).toBe('cap');

    // Documented loss of focus is excluded from the focused latency.
    const f = createM05State('o1');
    const flog = harness().sink('o1');
    const tf = eligibleAt(f, T0, flog);

    f.clock!.pause('focus_loss', tf + 1_000);
    f.clock!.resume('focus_loss', tf + 3_000);
    m05ControlPresented(f, tf + 3_000, flog);
    expect(m05Start(f, tf + 4_000, 'pointer', flog)).toBe('started');
    expect(f.latency_focused_ms).toBe(2_000);
    expect(f.latency_wall_ms).toBe(4_000);
    expect(f.excluded_ms?.focus_loss).toBe(2_000);

    // Extractor: a never-eligible exit (accepted, a prompt still held the
    // room, then the room was left) and an interrupted accepted occasion
    // are missing — never non-starts; a row with only such occasions is
    // never `observed`.
    const n = harness();
    const n1 = createM05State('o1');

    n.presented('o1');
    acceptAt(n1, T0, n.sink('o1'));
    n.opened('o1');
    m05SetBlock(n1, 'prompt', true, T0 + 1_000);
    expect(m05Exit(n1, T0 + 2_000, n.sink('o1'))).toBe(true);
    n.close(n1, 'route_departure', T0 + 2_000, 'stopped');

    const nRows = extractItemFeatures('M05', n.events, CONTEXT);

    expect(nRows[0]).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
      censored: true,
    });
    expect(nRows[0].components).toMatchObject({
      occasions_observed: [],
      occasions_never_eligible: ['o1'],
      non_starters: [],
    });

    const i = harness();
    const i1 = createM05State('o1');
    const i2 = createM05State('o2');

    i.presented('o1');
    const ti = eligibleAt(i1, T0, i.sink('o1'));
    i.opened('o1');
    m05Freeze(i1, ti + 5_000, 'closed_at_review', 'review');
    i.close(i1, 'closed_at_review', ti + 5_000, 'closed_at_review');
    i.presented('o2');
    const ti2 = eligibleAt(i2, T0 + 100_000, i.sink('o2'));
    i.opened('o2');
    m05ControlPresented(i2, ti2 + 2_000, i.sink('o2'));
    expect(m05Defer(i2, ti2 + 2_500, 'pointer', i.sink('o2'))).toBe('deferred');
    i.close(i2, 'voluntary_stop', ti2 + 2_500, 'stopped');

    const iRows = extractItemFeatures('M05', i.events, CONTEXT);

    expect(iRows[0]).toMatchObject({
      disposition: 'interrupted',
      closure_reason: 'closed_at_review',
      censored: true,
      included_ids: ['m05_start_o2'],
    });
    expect(iRows[0].value).toMatchObject({
      o1: { status: 'interrupted', observed: false, censored: true },
      o2: { status: 'deferred', observed: true, censored: false },
    });
    expect(iRows[0].components).toMatchObject({
      occasions_interrupted: ['o1'],
      occasions_observed: ['o2'],
      non_starters: ['o2'],
    });

    // A shared single closure names the row; an over-cap latency is a fault.
    const c = harness();
    const c1 = createM05State('o1');
    const tc = eligibleAt(c1, T0, c.sink('o1'));

    c.presented('o1');
    c.opened('o1');
    m05ControlPresented(c1, tc + 1_000, c.sink('o1'));
    expect(m05Start(c1, tc + 1_500, 'pointer', c.sink('o1'))).toBe('started');
    expect(m05WorkTick(c1, tc + 1_500 + M05_WORK_MS, c.sink('o1'))).toBe(
      'work_completed',
    );
    c.close(c1, 'completed', tc + 1_500 + M05_WORK_MS);
    expect(extractItemFeatures('M05', c.events, CONTEXT)[0]).toMatchObject({
      disposition: 'observed',
      closure_reason: 'completed',
    });

    const over = c.events.map((event) =>
      event.event_type === 'proto_m05_start_window_closed'
        ? {
            ...event,
            metadata: {
              ...event.metadata,
              raw_components: {
                ...(event.metadata!.raw_components as Record<string, unknown>),
                latency_focused_ms: 61_000,
              },
            },
          }
        : event.event_type === 'proto_m05_start_started'
          ? {
              ...event,
              metadata: { ...event.metadata, latency_focused_ms: 61_000 },
            }
          : event,
    );

    expect(extractItemFeatures('M05', over, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
  });
});

/* ================================================================== *
 * U24 RL-2: the logged reload check of the two jobs (pure)
 * ================================================================== */

const RL2_CONTINUOUS = {
  first_sequence: 1,
  sequence_gap_count: 0,
  sequence_duplicate_count: 0,
  recovered_from_chunks: false,
};
/** A history that cannot be verified (recovered from chunks). */
const RL2_UNVERIFIED = { ...RL2_CONTINUOUS, recovered_from_chunks: true };
/** The guard's marker details (H existing; U / M with the RL-0 prefixes). */
const RL2_DETAIL = {
  H: 'reload after administration: job not re-offered',
  U: 'reload with an unverified earlier state: job not administered',
  M: 'reload with a contradictory earlier check: job not administered',
} as const;
/** The rows' reasons (H existing; U / M with r3 §2's reasons). */
const RL2_REASON = {
  H: 'job answered in an earlier page load; not re-offered after the reload',
  U: 'job not administered after a reload: earlier history not verified',
  M: 'job not administered after a reload: earlier check contradictory',
} as const;
const RL2_OCCASIONS = ['o1', 'o2'] as const;

/**
 * r3 §4 G2's stage map as reconciled in register §5.407 reading (a) (a
 * writer's reconciliation, for the owner; the stage-3 predicate is the
 * row's existing guard rule from its read-only model): stage 1 the
 * offer's `presented`, no stage 2, stage 3 the existing guard's record (an
 * answer opens the window, accepted or declined), and the occasion's
 * markers.
 */
const RL2_STAGES = Object.fromEntries(
  RL2_OCCASIONS.map((occasion) => [
    occasion,
    {
      briefing: (event: ReloadEvent) =>
        event.event_type === `${M05_FAMILY}presented` &&
        event.metadata?.occasion === occasion,
      opening: (event: ReloadEvent) =>
        m05PriorAdministration([event], occasion),
      holdBack: (event: ReloadEvent) =>
        event.event_type === `${M05_FAMILY}technical_failure` &&
        event.metadata?.occasion === occasion,
    },
  ]),
);

function rl2Record(
  pageLoadIndex: number,
  prior: readonly RawGameEvent[],
  integrity = RL2_CONTINUOUS,
) {
  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents: prior,
    integrity,
    occasions: RL2_STAGES,
  });
}

type Rl2Prior = 'session' | 'offered' | 'answered' | 'H' | 'U' | 'M';
/** The current load: held at zone entry, or what the participant did. */
type Rl2Step = 'none' | 'offer' | 'decline' | 'exit';

/** One earlier page load: what it holds per occasion. */
function rl2Prior(
  index: number,
  from: number,
  steps: readonly [M05Occasion | null, Rl2Prior][],
): RawGameEvent[] {
  const h = harness();

  for (const [occasion, step] of steps) {
    if (occasion === null || step === 'session') {
      h.events.push({
        session_id: 's',
        timestamp_ms: 0,
        scene: 'dock',
        event_type: 'session_start',
        metadata: {},
      });
    } else if (step === 'offered' || step === 'answered') {
      h.presented(occasion);

      if (step === 'answered') {
        h.opened(occasion);
      }
    } else {
      h.sink(occasion)('technical_failure', {
        detail: RL2_DETAIL[step],
        input_mode: 'system',
      });
    }
  }

  return h.events.map((event, i) => ({
    ...event,
    page_load_index: index,
    sequence: from + i,
  }));
}

function rl2CheckEvent(record: object, loadIndex: number): RawGameEvent {
  return {
    session_id: 's',
    timestamp_ms: 0,
    scene: 'station_concourse',
    event_type: `${M05_FAMILY}prior_load_checked`,
    page_load_index: loadIndex,
    metadata: {
      opportunity_id: M05_OPPORTUNITY_IDS.o1,
      occasion: 'o1',
      ...record,
      input_mode: 'system',
    },
  };
}

/** An administered occasion's events, as `step` says. */
function rl2Step(
  h: ReturnType<typeof harness>,
  occasion: M05Occasion,
  step: Rl2Step,
) {
  const at = occasion === 'o1' ? T0 : T0 + 100_000;
  const s = createM05State(occasion);
  const log = h.sink(occasion);

  if (step === 'none') {
    return;
  }

  h.presented(occasion);

  if (step === 'offer') {
    expect(m05Present(s, at, log)).toBe(true);

    return;
  }

  if (step === 'decline') {
    m05Present(s, at, log);
    expect(m05Answer(s, false, 2, at + 1_000, 'keyboard', log)).toBe(
      'declined',
    );
    h.opened(occasion);
    h.close(s, 'declined', at + 1_000, 'stopped');

    return;
  }

  const t = eligibleAt(s, at, log);

  h.opened(occasion);
  expect(m05Exit(s, t + 7_000, log)).toBe(true);
  h.close(s, 'route_departure', t + 7_000, 'stopped');
}

/** The current load's events after the prior loads, renumbered. */
function rl2Current(
  prior: readonly RawGameEvent[],
  records: readonly object[],
  events: readonly RawGameEvent[],
  pageLoadIndex: number,
): RawGameEvent[] {
  const from = (prior.at(-1)?.sequence ?? 0) + 1;

  return [
    ...records.map((record) => rl2CheckEvent(record, pageLoadIndex)),
    ...events,
  ].map((event, i) => ({
    ...event,
    page_load_index: pageLoadIndex,
    sequence: from + i,
  }));
}

/**
 * A reloaded load as the runtime writes it: the record (or `records`, to
 * inject defects), then per reached occasion — not A ⇒ the guard's marker
 * at zone entry, never offered; A ⇒ the step.
 */
function rl2Load(
  prior: RawGameEvent[],
  steps: Record<M05Occasion, Rl2Step>,
  options: {
    integrity?: typeof RL2_CONTINUOUS;
    pageLoadIndex?: number;
    records?: (record: Record<string, unknown>) => object[];
  } = {},
) {
  const pageLoadIndex = options.pageLoadIndex ?? 2;
  const record = rl2Record(
    pageLoadIndex,
    prior,
    options.integrity,
  ) as unknown as Record<string, unknown>;
  const records = options.records?.(record) ?? [record];
  const reload = classifyReload({
    pageLoadIndex,
    checks: records,
    occasions: RL2_OCCASIONS,
  });
  const h = harness();

  for (const occasion of RL2_OCCASIONS) {
    const cls = reload.occasions[occasion].class;

    if (steps[occasion] === 'none') {
      continue;
    }

    if (cls !== 'A') {
      h.sink(occasion)('technical_failure', {
        detail: RL2_DETAIL[cls ?? 'U'],
        input_mode: 'system',
      });
      continue;
    }

    rl2Step(h, occasion, steps[occasion]);
  }

  const current = rl2Current(prior, records, h.events, pageLoadIndex);
  const rows = extractItemFeatures('M05', [...prior, ...current], {
    finalCoreClosed: true,
    pageLoadIndex,
    reloaded: true,
  });

  return { record, reload, rows, current };
}

/** A load exactly as given: records, then per occasion its marker and step. */
function rl2Raw(
  prior: RawGameEvent[],
  records: readonly object[],
  occasions: Record<M05Occasion, { marker?: 'H' | 'U' | 'M'; step?: Rl2Step }>,
  pageLoadIndex = 2,
) {
  const h = harness();

  for (const occasion of RL2_OCCASIONS) {
    const { marker, step = 'none' } = occasions[occasion];

    if (marker !== undefined) {
      h.sink(occasion)('technical_failure', {
        detail: RL2_DETAIL[marker],
        input_mode: 'system',
      });
    }

    rl2Step(h, occasion, step);
  }

  return extractItemFeatures(
    'M05',
    [...prior, ...rl2Current(prior, records, h.events, pageLoadIndex)],
    { finalCoreClosed: true, pageLoadIndex, reloaded: pageLoadIndex > 1 },
  );
}

const RL2_NEVER = rl2Prior(1, 1, [[null, 'session']]);
const RL2_O1_ANSWERED = rl2Prior(1, 1, [['o1', 'answered']]);
const RL2_O1_OFFERED = rl2Prior(1, 1, [['o1', 'offered']]);
const RL2_BOTH_ANSWERED = rl2Prior(1, 1, [
  ['o1', 'answered'],
  ['o2', 'answered'],
]);
const RL2_O1_EARLIER_U = rl2Prior(1, 1, [['o1', 'U']]);

const RL2_EXITED = { status: 'exited', observed: true, censored: false };

/** r3 §5 M05, every row after the correction: class, permission, reading. */
const RL2_CASES: readonly {
  name: string;
  prior: RawGameEvent[];
  steps: Record<M05Occasion, Rl2Step>;
  integrity?: typeof RL2_CONTINUOUS;
  classes: [string, string];
  row: Record<string, unknown>;
  /** The companion's disposition where it differs from the default. */
  companion?: string;
  reason?: string;
}[] = [
  {
    name: 'HB only (no current opening) ⇒ interrupted · null',
    prior: RL2_O1_ANSWERED,
    steps: { o1: 'offer', o2: 'none' },
    classes: ['H', 'A'],
    row: { disposition: 'interrupted', value: null },
    reason: RL2_REASON.H,
  },
  {
    name: 'HB + HB ⇒ interrupted · null',
    prior: RL2_BOTH_ANSWERED,
    steps: { o1: 'offer', o2: 'offer' },
    classes: ['H', 'H'],
    row: { disposition: 'interrupted', value: null },
    reason: RL2_REASON.H,
  },
  {
    name: 'HB + OBS ⇒ interrupted · {map}',
    prior: RL2_O1_ANSWERED,
    steps: { o1: 'offer', o2: 'exit' },
    classes: ['H', 'A'],
    row: {
      disposition: 'interrupted',
      value: { o1: { occasion: 'o1', interrupted: true }, o2: RL2_EXITED },
    },
  },
  {
    name: 'OBS + OBS ⇒ observed · {map}',
    prior: RL2_NEVER,
    steps: { o1: 'exit', o2: 'exit' },
    classes: ['A', 'A'],
    row: { disposition: 'observed', value: { o1: RL2_EXITED, o2: RL2_EXITED } },
  },
  {
    name: 'OBS + NOP (A) ⇒ observed · {map}, no longer interrupted (b)',
    prior: RL2_NEVER,
    steps: { o1: 'exit', o2: 'none' },
    classes: ['A', 'A'],
    row: { disposition: 'observed', value: { o1: RL2_EXITED, o2: null } },
  },
  {
    name: 'offered, never answered + NOP (A) ⇒ pending · null',
    prior: RL2_NEVER,
    steps: { o1: 'offer', o2: 'none' },
    classes: ['A', 'A'],
    row: { disposition: 'pending', value: null },
    reason: 'job offered, never answered (the stage was left open)',
  },
  {
    name: 'an offer presented and left unanswered in the earlier load is re-offered (A: the existing rule needs an answer)',
    prior: RL2_O1_OFFERED,
    steps: { o1: 'exit', o2: 'none' },
    classes: ['A', 'A'],
    row: { disposition: 'observed', value: { o1: RL2_EXITED, o2: null } },
  },
  {
    name: 'declined + NOP (A) ⇒ declined · null (the first-load reading)',
    prior: RL2_NEVER,
    steps: { o1: 'decline', o2: 'none' },
    classes: ['A', 'A'],
    row: { disposition: 'declined', value: null },
    // The first-load rule: a declined offer is described by the companion.
    companion: 'observed',
  },
  {
    name: 'NOP + NOP (A) ⇒ not_presented · null (b)',
    prior: RL2_NEVER,
    steps: { o1: 'none', o2: 'none' },
    classes: ['A', 'A'],
    row: { disposition: 'not_presented', value: null },
    reason: 'no job offered',
  },
  {
    name: 'U, history level (both occasions) ⇒ interrupted · null, reason unverified; nothing administered (c)',
    prior: RL2_NEVER,
    integrity: RL2_UNVERIFIED,
    steps: { o1: 'offer', o2: 'none' },
    classes: ['U', 'U'],
    row: { disposition: 'interrupted', value: null },
    reason: RL2_REASON.U,
  },
  {
    name: 'U, occasion level (an earlier U marker carried) + NOP ⇒ interrupted · null, reason unverified (c)',
    prior: RL2_O1_EARLIER_U,
    steps: { o1: 'offer', o2: 'none' },
    classes: ['U', 'A'],
    row: { disposition: 'interrupted', value: null },
    reason: RL2_REASON.U,
  },
  {
    name: 'F-D: HB(U) + OBS(A) ⇒ interrupted · {map}: the U job held, its A sibling administered and observed (clarification 1)',
    prior: RL2_O1_EARLIER_U,
    steps: { o1: 'offer', o2: 'exit' },
    classes: ['U', 'A'],
    row: {
      disposition: 'interrupted',
      value: { o1: { occasion: 'o1', interrupted: true }, o2: RL2_EXITED },
    },
  },
];

test.describe('M05 the logged reload check (U24 RL-2, pure)', () => {
  for (const c of RL2_CASES) {
    test(`r3 §5: ${c.name}`, () => {
      const { reload, rows } = rl2Load(c.prior, c.steps, {
        integrity: c.integrity,
      });

      expect([reload.occasions.o1.class, reload.occasions.o2.class]).toEqual(
        c.classes,
      );
      // Only A is administered (r3 §2).
      expect([
        reload.occasions.o1.administration_permitted,
        reload.occasions.o2.administration_permitted,
      ]).toEqual(c.classes.map((cls) => cls === 'A'));
      expect(rows[0]).toMatchObject(c.row);
      // The companion follows the primary's missing-data disposition
      // while nothing was answered in this load.
      expect(rows[1].disposition).toBe(
        c.companion ?? (c.row.value === null ? c.row.disposition : 'observed'),
      );

      if (c.reason !== undefined) {
        expect(rows[0].missing_reason).toBe(c.reason);
      }
    });
  }

  test('the extractor’s stage map is r3 §4’s: the same record for every history; a first load writes none; the same classes', () => {
    for (const prior of [
      RL2_NEVER,
      RL2_O1_ANSWERED,
      RL2_O1_OFFERED,
      RL2_BOTH_ANSWERED,
      RL2_O1_EARLIER_U,
    ]) {
      for (const integrity of [RL2_CONTINUOUS, RL2_UNVERIFIED]) {
        const record = rl2Record(2, prior, integrity);

        expect(m05PriorLoadCheck(2, prior, integrity)).toEqual(record);
        expect(classifyM05Reload(2, [record!])).toEqual(
          classifyReload({
            pageLoadIndex: 2,
            checks: [record!],
            occasions: RL2_OCCASIONS,
          }),
        );
      }
    }

    expect(m05PriorLoadCheck(1, [], RL2_CONTINUOUS)).toBeNull();
    // The record names the earlier answer's sequence (P-1).
    expect(rl2Record(2, RL2_O1_ANSWERED)).toMatchObject({
      prior_opening_found: true,
      prior_opening_sequences: [2],
      occasions: {
        o1: { prior_briefing_found: true, prior_opening_found: true },
        o2: {
          prior_briefing_found: false,
          prior_opening_found: false,
          prior_opening_absence_established: true,
        },
      },
    });
  });

  test('the record is never task evidence: absent from the supporting sequences', () => {
    const { rows, current } = rl2Load(RL2_NEVER, { o1: 'exit', o2: 'none' });
    const check = current.find((event) =>
      event.event_type.endsWith('prior_load_checked'),
    );

    expect(rows[0].disposition).toBe('observed');
    expect(rows[0].supporting_sequences).not.toContain(check!.sequence);
    expect(rows[0].supporting_sequences.length).toBeGreaterThan(0);
  });

  test('F-A: two agreeing check records with distinct sequences ⇒ U for both, refused; the U reading', () => {
    const { reload, rows, current } = rl2Load(
      RL2_NEVER,
      { o1: 'offer', o2: 'none' },
      { records: (record) => [record, { ...record }] },
    );

    expect(
      current
        .filter((event) => event.event_type.endsWith('prior_load_checked'))
        .map((event) => event.sequence),
    ).toEqual([2, 3]);
    expect(reload.check_count).toBe(2);
    expect(reload.check_coherent).toBe(true);
    expect(reload.occasions.o1).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'duplicate_checks',
    });
    expect(reload.occasions.o2.class).toBe('U');
    expect(rows[0]).toMatchObject({ disposition: 'interrupted', value: null });
    expect(rows[0].missing_reason).toBe(RL2_REASON.U);
  });

  test('F-B: conflicting duplicate checks ⇒ U, refused, coherence false', () => {
    const { reload, rows } = rl2Load(
      RL2_O1_ANSWERED,
      { o1: 'offer', o2: 'none' },
      {
        records: (record) => [
          record,
          { ...record, prior_opening_found: false },
        ],
      },
    );

    expect(reload.check_coherent).toBe(false);
    expect(reload.occasions.o1).toMatchObject({
      class: 'U',
      administration_permitted: false,
    });
    expect(reload.occasions.o2.administration_permitted).toBe(false);
    expect(rows[0]).toMatchObject({ disposition: 'interrupted', value: null });
    expect(rows[0].missing_reason).toBe(RL2_REASON.U);
  });

  test('F-C: an earlier U or M hold-back, then a continuous history ⇒ that job stays U and refused; its sibling stays A and is observed', () => {
    for (const earlier of ['U', 'M'] as const) {
      const prior = rl2Prior(1, 1, [['o1', earlier]]);
      const { record, reload, rows } = rl2Load(prior, {
        o1: 'offer',
        o2: 'exit',
      });

      expect(record.history_continuous).toBe(true);
      expect(reload.occasions.o1).toMatchObject({
        class: 'U',
        administration_permitted: false,
        basis: 'absence_not_established',
      });
      expect(reload.occasions.o2).toMatchObject({
        class: 'A',
        administration_permitted: true,
      });
      expect(rows[0]).toMatchObject({
        disposition: 'interrupted',
        value: { o1: { interrupted: true }, o2: RL2_EXITED },
      });
    }
  });

  test('F-E: an H marker of one job leaves its sibling A, administered and observed', () => {
    // Load 1 answered o1; load 2 held it (H marker) and offered o2.
    const prior = [
      ...RL2_O1_ANSWERED,
      ...rl2Prior(2, RL2_O1_ANSWERED.length + 1, [
        ['o1', 'H'],
        ['o2', 'offered'],
      ]),
    ];
    const { record, reload, rows } = rl2Load(
      prior,
      { o1: 'offer', o2: 'exit' },
      { pageLoadIndex: 3 },
    );

    expect(
      (record.occasions as Record<string, Record<string, unknown>>).o2,
    ).toMatchObject({
      prior_briefing_found: true,
      prior_opening_found: false,
      prior_opening_absence_established: true,
    });
    expect(reload.occasions.o1.class).toBe('H');
    expect(reload.occasions.o2).toMatchObject({
      class: 'A',
      administration_permitted: true,
    });
    expect(rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: { o1: { interrupted: true }, o2: RL2_EXITED },
    });
  });

  test('R-1: an earlier answer beside a discontinuous history stays H; the sibling is U; both reasons named', () => {
    const { record, reload, rows } = rl2Load(
      RL2_O1_ANSWERED,
      { o1: 'offer', o2: 'offer' },
      { integrity: RL2_UNVERIFIED },
    );

    expect(record).toMatchObject({
      history_continuous: false,
      prior_opening_found: true,
      prior_opening_absence_established: false,
    });
    expect(reload.occasions.o1).toMatchObject({
      class: 'H',
      basis: 'opening_found',
    });
    expect(reload.occasions.o2).toMatchObject({
      class: 'U',
      basis: 'history_discontinuous',
    });
    expect(rows[0]).toMatchObject({ disposition: 'interrupted', value: null });
    expect(rows[0].missing_reason).toBe(`${RL2_REASON.H}; ${RL2_REASON.U}`);
  });

  test('a malformed check (another load’s index) is a technical failure on both rows, never H', () => {
    const { reload, rows } = rl2Load(
      RL2_O1_ANSWERED,
      { o1: 'offer', o2: 'none' },
      { records: (record) => [{ ...record, page_load_index: 1 }] },
    );

    expect(reload.check_malformed).toBe(true);
    expect(reload.occasions.o1).toMatchObject({
      class: 'U',
      basis: 'malformed_check',
      administration_permitted: false,
    });
    expect(rows[0]).toMatchObject({
      disposition: 'technical_failure',
      value: null,
    });
    expect(rows[1].disposition).toBe('technical_failure');
  });

  test('M: a contradiction of the whole check holds both jobs as M; one confined to a job leaves its sibling A and observed', () => {
    const whole = rl2Load(
      RL2_NEVER,
      { o1: 'offer', o2: 'none' },
      {
        integrity: RL2_UNVERIFIED,
        records: (record) => [
          { ...record, prior_opening_absence_established: true },
        ],
      },
    );

    expect(whole.reload.check_coherent).toBe(false);
    expect(whole.reload.occasions.o1).toMatchObject({
      class: 'M',
      basis: 'check_incoherent',
      administration_permitted: false,
    });
    expect(whole.reload.occasions.o2.class).toBe('M');
    expect(whole.rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: null,
    });
    expect(whole.rows[0].missing_reason).toBe(RL2_REASON.M);

    const local = rl2Load(
      RL2_NEVER,
      { o1: 'offer', o2: 'exit' },
      {
        records: (record) => {
          const occasions = record.occasions as Record<
            string,
            Record<string, unknown>
          >;

          return [
            {
              ...record,
              prior_opening_found: true,
              prior_opening_absence_established: false,
              occasions: {
                ...occasions,
                o1: {
                  ...occasions.o1,
                  prior_opening_found: true,
                  prior_opening_absence_established: true,
                },
              },
            },
          ];
        },
      },
    );

    expect(local.reload.occasions.o1).toMatchObject({
      class: 'M',
      basis: 'occasion_incoherent',
      administration_permitted: false,
    });
    expect(local.reload.occasions.o2).toMatchObject({
      class: 'A',
      administration_permitted: true,
    });
    expect(local.rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: { o1: { interrupted: true }, o2: RL2_EXITED },
    });
  });

  test('RL-1C decision A: a job offered and left unanswered in a reloaded load without its check is U (no_check), refused, and reads held with the U reason', () => {
    const reload = classifyM05Reload(2, []);

    expect(reload).toMatchObject({
      check_count: 0,
      check_coherent: null,
      check_malformed: false,
      history_level_uncertain: true,
    });

    for (const occasion of RL2_OCCASIONS) {
      expect(reload.occasions[occasion]).toMatchObject({
        class: 'U',
        basis: 'no_check',
        administration_permitted: false,
      });
    }

    // o1 offered, o2 unreached; and both offered.
    for (const o2 of [{}, { step: 'offer' as const }]) {
      const rows = rl2Raw(RL2_NEVER, [], { o1: { step: 'offer' }, o2 });

      expect(rows[0]).toMatchObject({
        disposition: 'interrupted',
        value: null,
        missing_reason: RL2_REASON.U,
      });
      expect(rows[1]).toMatchObject({
        disposition: 'interrupted',
        value: null,
        missing_reason: RL2_REASON.U,
      });
    }
  });

  test('decision A contrasts: a first load keeps pending; a genuinely unreached reloaded load keeps the F5 / absentFeature reading', () => {
    const first = rl2Raw([], [], { o1: { step: 'offer' }, o2: {} }, 1);

    expect(first[0]).toMatchObject({
      disposition: 'pending',
      value: null,
      missing_reason: 'job offered, never answered (the stage was left open)',
    });

    const unreached = rl2Raw(RL2_NEVER, [], { o1: {}, o2: {} });

    expect(unreached[0]).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason: 'no current-load evidence after a reload: no job offered',
    });
  });

  test('decision A rule: without a check, a job offered and unanswered beside an observed one is held — interrupted · {map}, no longer observed', () => {
    const rows = rl2Raw(RL2_NEVER, [], {
      o1: { step: 'exit' },
      o2: { step: 'offer' },
    });

    expect(rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: { o1: RL2_EXITED, o2: { occasion: 'o2', interrupted: true } },
    });
    expect(rows[0].components).toMatchObject({
      occasions_interrupted: ['o2'],
      occasions_observed: ['o1'],
    });
  });

  test('with a check, a job whose class is not A reads held even where its zone was not reached in this load (its answer lies in an earlier load)', () => {
    // o1 answered in load 1; this load reached only the yard (o2 observed).
    const { reload, rows } = rl2Load(RL2_O1_ANSWERED, {
      o1: 'none',
      o2: 'exit',
    });

    expect(reload.occasions.o1.class).toBe('H');
    expect(rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: { o1: { occasion: 'o1', interrupted: true }, o2: RL2_EXITED },
    });
  });
});

/* ================================================================== *
 * U24 RL-2 — the offer rows after a genuine reload (browser;
 * `RELOAD-CORRECTION-SPEC-r3-exec.md` §8 R1–R4 and R6, §9). One route
 * reaches every host of M05 (Concourse, Yard), M09 (Concourse), M10
 * (Concourse, Yard) and M11 (Laboratory, Yard), each offer declined. R1:
 * offers answered in load 1 are held at their hosts after a reload — the
 * family's one check before its markers, nothing offered again, the
 * existing prior-exposure entries, M05's existing held line. R2: nothing
 * offered before the reload — each check establishes the absence and the
 * offers run as on a first load. R3: an earlier state that cannot be
 * verified (the store's meta record removed before the reload —
 * fault-injected, the RL-1 R3 mechanism) — every occasion held U, nothing
 * offered, no prior exposure, never absent; M05's two §9 lines. R4: a
 * second reload writes one check per family per load. Screenshots kept
 * with the run's output.
 * ================================================================== */

const RL2B_FAMILY = {
  M05: 'proto_m05_start_',
  M09: 'proto_m09_checks_',
  M10: 'proto_m10_delivery_',
  M11: 'proto_m11_custody_',
} as const;

type Rl2bItem = keyof typeof RL2B_FAMILY;

const RL2B_ITEMS = ['M05', 'M09', 'M10', 'M11'] as const;
/** Each row's occasions (M09 has none). */
const RL2B_OCCASIONS: Record<Rl2bItem, readonly (string | null)[]> = {
  M05: ['o1', 'o2'],
  M09: [null],
  M10: ['d1', 'd2'],
  M11: ['lab', 'yard'],
};
/** Each row's existing administration record (its guard's rule). */
const RL2B_ADMINISTERED: Record<Rl2bItem, string> = {
  M05: 'opportunity_opened',
  M09: 'presented',
  M10: 'presented',
  M11: 'offer_presented',
};
/** The offer's own records: none may follow a hold. */
const RL2B_OFFER_RECORDS = [
  'presented',
  'offer_presented',
  'offer_answered',
  'opportunity_opened',
];
const RL2B_H_DETAIL: Record<Rl2bItem, string> = {
  M05: 'reload after administration: job not re-offered',
  M09: 'reload after the offer: watch not re-run',
  M10: 'reload after the offer: delivery not re-run',
  M11: 'reload after the offer: custody not re-run',
};
const RL2B_U_DETAIL: Record<Rl2bItem, string> = {
  M05: 'reload with an unverified earlier state: job not administered',
  M09: 'reload with an unverified earlier state: watch not administered',
  M10: 'reload with an unverified earlier state: delivery not administered',
  M11: 'reload with an unverified earlier state: custody not administered',
};
const RL2B_FEATURE: Record<Rl2bItem, string> = {
  M05: 'm05_start_latency',
  M09: 'm09_due_checks_fulfilled',
  M10: 'm10_obligations_fulfilled',
  M11: 'm11_unresolved_custodies',
};
const RL2B_H_REASON: Record<Rl2bItem, string> = {
  M05: 'job answered in an earlier page load; not re-offered after the reload',
  M09: 'watch offered in an earlier page load; not re-run after the reload',
  M10: 'delivery offered in an earlier page load; not re-run after the reload',
  M11: 'loan offered in an earlier page load; not re-run after the reload',
};
const RL2B_U_REASON: Record<Rl2bItem, string> = {
  M05: 'job not administered after a reload: earlier history not verified',
  M09: 'watch not administered after a reload: earlier history not verified',
  M10: 'delivery not administered after a reload: earlier history not verified',
  M11: 'custody not administered after a reload: earlier history not verified',
};
const RL2B_OPPORTUNITIES = [
  'proto_m05_start_o1',
  'proto_m05_start_o2',
  'proto_m09_watch_duty',
  'proto_m10_delivery_d1',
  'proto_m10_delivery_d2',
  'proto_m11_custody_lab',
  'proto_m11_custody_yard',
] as const;
/** M05's existing held line (r3 §9: kept unchanged). */
const RL2B_H_STATUS =
  'This job was answered earlier in this session. Its record is held; it is not offered again.';
/** The owner's U / M lines (r3 §9, D-5), ⟨station⟩ = job. */
const RL2B_U_LINES = [
  'The earlier state of this job could not be verified.',
  'It stays closed after this reload.',
];

/** Every offer declined; the route's own beats. */
const RL2B_CARDS = [
  'Handover confirmed — what is next?',
  M09_OFFER_LABELS.decline,
  M10_OFFER_LABELS.d1.decline,
  'No — leave the lamp job.',
  'No — leave the flag job.',
  'Understood — no need for the probe.',
  'Ready — no need for the driver.',
  'Heading to the workshop.',
  'Understood.',
  'Ready.',
] as const;

interface Rl2bEvent {
  event_type: string;
  sequence?: number;
  page_load_index?: number;
  metadata?: Record<string, unknown>;
}

interface Rl2bEnvelope {
  page_load_index: number;
  raw_events: Rl2bEvent[];
  prior_page_load_events: Rl2bEvent[];
  event_integrity: Record<string, unknown>;
  measurement_validity: unknown;
  measurement_features: {
    feature_id: string;
    disposition: string;
    value: unknown;
    missing_reason?: string | null;
  }[];
}

/** The runtime's own export builder read in the page (a harness read). */
async function rl2bPayload(page: Page): Promise<Rl2bEnvelope> {
  const json = await page.evaluate(`(async () => {
    const mod = await import('/src/systems/index.ts');
    return JSON.stringify(mod.researchRuntime.buildExportPayload());
  })()`);

  return JSON.parse(json as string) as Rl2bEnvelope;
}

/** The validity record of one opportunity, wherever the export nests it. */
function rl2bValidity(
  envelope: Rl2bEnvelope,
  opportunityId: string,
): Record<string, unknown> | null {
  const seen: unknown[] = [envelope.measurement_validity];

  while (seen.length > 0) {
    const value = seen.pop();

    if (Array.isArray(value)) {
      seen.push(...value);
    } else if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>;

      if (record.opportunity_id === opportunityId) {
        return record;
      }

      seen.push(...Object.values(record));
    }
  }

  return null;
}

const rl2bOwn = (events: readonly Rl2bEvent[], item: Rl2bItem) =>
  events.filter((event) => event.event_type.startsWith(RL2B_FAMILY[item]));
const rl2bSuffix = (event: Rl2bEvent, item: Rl2bItem) =>
  event.event_type.slice(RL2B_FAMILY[item].length);
const rl2bOccasion = (event: Rl2bEvent) =>
  (event.metadata?.delivery ?? event.metadata?.occasion ?? null) as
    | string
    | null;
const rl2bChecks = (events: readonly Rl2bEvent[], item: Rl2bItem) =>
  rl2bOwn(events, item).filter(
    (event) => rl2bSuffix(event, item) === 'prior_load_checked',
  );

/**
 * R1 / R3: the family's ONE check of this load, written before every
 * marker; each occasion held with `detail`; no offer record in this load.
 * Returns the check's payload.
 */
function rl2bExpectHeld(
  events: readonly Rl2bEvent[],
  item: Rl2bItem,
  detail: string,
): Record<string, unknown> {
  const own = rl2bOwn(events, item);
  const checks = rl2bChecks(events, item);
  const markers = own.filter(
    (event) => rl2bSuffix(event, item) === 'technical_failure',
  );

  expect(checks, `${item}: one check in this load`).toHaveLength(1);
  expect(
    own.filter((event) => RL2B_OFFER_RECORDS.includes(rl2bSuffix(event, item))),
    `${item}: nothing offered in this load`,
  ).toEqual([]);
  expect(
    markers.map((event) => [rl2bOccasion(event), event.metadata?.detail]),
    `${item}: every occasion held at its host`,
  ).toEqual(RL2B_OCCASIONS[item].map((occasion) => [occasion, detail]));

  for (const marker of markers) {
    expect(marker.sequence ?? 0).toBeGreaterThan(checks[0].sequence ?? 0);
  }

  return checks[0].metadata ?? {};
}

function rl2bFeature(envelope: Rl2bEnvelope, item: Rl2bItem) {
  return envelope.measurement_features.find(
    (feature) => feature.feature_id === RL2B_FEATURE[item],
  );
}

async function rl2bStage(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __pilotProbe?: { stage: string } | null })
        .__pilotProbe?.stage ?? null,
  );
}

async function rl2bAnswerBy(page: Page, limit = 8) {
  for (let step = 0; step < limit; step += 1) {
    await page.waitForTimeout(450);

    const labels = await promptLabels(page);

    if (labels.length === 0) {
      return;
    }

    const choice = RL2B_CARDS.find((label) => labels.includes(label));

    if (choice === undefined) {
      throw new Error(`RL-2 route: no expected card among ${labels}`);
    }

    await selectPromptLabel(page, choice);
    await page.waitForTimeout(400);
  }
}

/**
 * From the Dock to the end of the yard shift (`return_hub`), reaching
 * every host of the four rows by ordinary input; every offer shown is
 * declined. `concourse` runs once the handover is confirmed, `yard` once
 * Noor's briefing is done.
 */
async function rl2bRoute(
  page: Page,
  hooks: {
    concourse?: () => Promise<void>;
    yard?: () => Promise<void>;
  } = {},
) {
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await rl2bAnswerBy(page);

  if ((await rl2bStage(page)) !== 'workshop') {
    await openVale(page);
    await rl2bAnswerBy(page);
  }

  await expectStage(page, 'workshop');
  await hooks.concourse?.();
  await concourseToWorkshop(page);
  await boardFirstCard(page, 'workshop_work');
  await boardFirstCard(page, 'lab_briefing');
  await workshopToConcourse(page);
  await concourseToLab(page);
  await openKai(page);
  await rl2bAnswerBy(page, 1);
  await expectStage(page, 'lab_work');
  await openKai(page);
  await selectPromptLabel(page, 'I am done here — what is next?');
  await expectStage(page, 'exterior_briefing');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await openNoor(page);
  await rl2bAnswerBy(page);
  await expectStage(page, 'exterior_work');
  await hooks.yard?.();
  await openNoor(page);
  await selectPromptLabel(page, 'I am finished outside.');
  await expectStage(page, 'return_hub');
  await page.waitForTimeout(450);

  // The logbook offer (M10 d2), when it is offered.
  if ((await promptLabels(page)).includes(M10_OFFER_LABELS.d2.decline)) {
    await selectPromptLabel(page, M10_OFFER_LABELS.d2.decline);
    await page.waitForTimeout(400);
  }
}

const RL2B_LAMP = registryApproach('concourse.reading_desk_lamp');

/** The lamp job's station (E at its approach point, retried). */
async function rl2bOpenLamp(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await concourseVia(page, RL2B_LAMP.x, RL2B_LAMP.y);
    await interactAt(page, RL2B_LAMP, { approachOffset: { x: 0, y: 0 } });

    if (
      await waitSurface(page, true, 'm05_lamp_job').then(
        () => true,
        () => false,
      )
    ) {
      await page.waitForTimeout(500);

      return;
    }
  }

  throw new Error('surface m05_lamp_job did not open');
}

/** The flag job's station in the yard (retried). */
async function rl2bOpenFlag(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await ensureOutsideCompound(page);
    await yardVia(
      page,
      YARD.flag.x + APPROACH.flag.x,
      YARD.flag.y + APPROACH.flag.y,
    );
    await interactAt(page, YARD.flag, { approachOffset: APPROACH.flag });

    if (
      await waitSurface(page, true, 'm05_flag_job').then(
        () => true,
        () => false,
      )
    ) {
      await page.waitForTimeout(500);

      return;
    }
  }

  throw new Error('surface m05_flag_job did not open');
}

interface Rl2bScreen {
  title: string | null;
  subtitle: string | null;
  status: string;
  elements: string[];
}

/**
 * The open held surface: its screenshot kept, the probe's title, status
 * and element ids, the subtitle read from its model in the page (the
 * probe carries none; a harness read), then ESC.
 */
async function rl2bReadHeld(
  page: Page,
  occasion: 'o1' | 'o2',
  shot: string,
): Promise<Rl2bScreen> {
  await page.screenshot({ path: test.info().outputPath(`${shot}.png`) });

  const probe = await surface(page);
  const subtitle = (await page.evaluate(`(async () => {
    const mod = await import('/src/pilot/windows/m05SurfaceModel.ts');
    const host = { now: () => Date.now(), close: () => {}, feedback: () => {}, later: () => {} };
    return mod.m05SurfaceModel(host, '${occasion}').subtitle ?? null;
  })()`)) as string | null;

  await press(page, 'Escape');
  await waitSurface(page, false);

  const screen = {
    title: probe?.title ?? null,
    subtitle,
    status: probe?.status ?? '',
    elements: (probe?.elements ?? []).map((element) => element.id),
  };

  test.info().annotations.push({
    type: `rl2-screen ${shot}`,
    description: JSON.stringify(screen),
  });

  return screen;
}

test.describe('U24 RL-2: the offer rows after a genuine reload (browser)', () => {
  test.describe.configure({ timeout: 1_800_000 });

  test('R1 + R4 + R6 (H): offers answered in load 1 are held at their hosts after a genuine reload — one check per family before its markers, nothing offered again, the prior-exposure entries, M05’s existing held line — and a second reload writes one check per family again', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL2H');
    // Load 1: every offer of the four rows presented and declined.
    await rl2bRoute(page);

    const before = await rl2bPayload(page);

    for (const item of RL2B_ITEMS) {
      expect(rl2bChecks(before.raw_events, item), `${item} load 1`).toEqual([]);
      expect(
        rl2bOwn(before.raw_events, item)
          .filter(
            (event) => rl2bSuffix(event, item) === RL2B_ADMINISTERED[item],
          )
          .map(rl2bOccasion),
        `${item} administered in load 1`,
      ).toEqual(RL2B_OCCASIONS[item]);
    }

    // Load 2.
    await reloadToDock(page);

    const screens: { lamp?: Rl2bScreen; flag?: Rl2bScreen } = {};

    await rl2bRoute(page, {
      concourse: async () => {
        await rl2bOpenLamp(page);
        screens.lamp = await rl2bReadHeld(page, 'o1', 'rl2-h-m05-o1');
      },
      yard: async () => {
        await rl2bOpenFlag(page);
        screens.flag = await rl2bReadHeld(page, 'o2', 'rl2-h-m05-o2');
      },
    });

    let now = await rl2bPayload(page);

    expect(now.page_load_index).toBe(2);

    for (const item of RL2B_ITEMS) {
      const check = rl2bExpectHeld(now.raw_events, item, RL2B_H_DETAIL[item]);

      expect(check, `${item} record`).toMatchObject({
        page_load_index: 2,
        history_continuous: true,
        prior_opening_found: true,
        prior_opening_absence_established: false,
      });

      for (const occasion of RL2B_OCCASIONS[item]) {
        if (occasion !== null) {
          expect(
            (check.occasions as Record<string, Record<string, unknown>>)[
              occasion
            ],
            `${item} ${occasion}`,
          ).toMatchObject({ prior_opening_found: true });
        }
      }

      expect(rl2bFeature(now, item), `${item} reading`).toMatchObject({
        disposition: 'interrupted',
        value: null,
        missing_reason: RL2B_H_REASON[item],
      });
    }

    // Opening the held lamp station ran nothing: M05's load-2 events are
    // its check and its two markers only.
    expect(
      rl2bOwn(now.raw_events, 'M05').map((event) => rl2bSuffix(event, 'M05')),
    ).toEqual(['prior_load_checked', 'technical_failure', 'technical_failure']);

    // R6 (H): the existing line, unchanged; the title kept; LEAVE only; no
    // job readout and no subtitle (register §5.407 reading (g)).
    for (const [screen, title] of [
      [screens.lamp, M05_JOBS.o1.title],
      [screens.flag, M05_JOBS.o2.title],
    ] as const) {
      expect(screen).toBeDefined();
      expect(screen!.status).toBe(RL2B_H_STATUS);
      expect(screen!.title).toBe(title);
      expect(screen!.subtitle).toBe('');
      expect(screen!.elements).toEqual(['leave']);
    }

    // The existing prior-exposure entry of an earlier offer (direction a).
    for (const id of RL2B_OPPORTUNITIES) {
      const record = rl2bValidity(now, id);

      expect(
        (record?.prior_exposure as unknown[] | undefined)?.length ?? 0,
        `${id} prior exposure`,
      ).toBeGreaterThan(0);
      expect(record?.absent ?? false, `${id} absent`).toBe(false);
    }

    // R4: a second genuine reload; load 3 writes one check per family,
    // load 2 keeps its one, load 1 has none.
    await reloadToDock(page);
    await rl2bRoute(page);
    now = await rl2bPayload(page);
    expect(now.page_load_index).toBe(3);

    for (const item of RL2B_ITEMS) {
      const inLoad = (load: number) =>
        rl2bChecks(
          now.prior_page_load_events.filter(
            (event) => event.page_load_index === load,
          ),
          item,
        ).length;

      expect(rl2bChecks(now.raw_events, item), `${item} load 3`).toHaveLength(
        1,
      );
      expect(inLoad(2), `${item} load 2`).toBe(1);
      expect(inLoad(1), `${item} load 1 (a first load writes none)`).toBe(0);
      rl2bExpectHeld(now.raw_events, item, RL2B_H_DETAIL[item]);
    }

    expectNoRuntimeErrors(capture);
  });

  test('R2: nothing offered before a genuine reload — each check establishes the absence and every offer runs as on a first load, after its check', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL2A');
    await completeDockTutorial(page, 1);
    await reloadToDock(page);
    // Load 2: the same route as a first load.
    await rl2bRoute(page);

    const now = await rl2bPayload(page);

    expect(now.page_load_index).toBe(2);

    for (const item of RL2B_ITEMS) {
      const own = rl2bOwn(now.raw_events, item);
      const checks = rl2bChecks(now.raw_events, item);
      const administered = own.filter(
        (event) => rl2bSuffix(event, item) === RL2B_ADMINISTERED[item],
      );

      expect(checks, `${item}: one check`).toHaveLength(1);
      expect(checks[0].metadata, `${item}: absence established`).toMatchObject({
        page_load_index: 2,
        history_continuous: true,
        prior_opening_found: false,
        prior_opening_absence_established: true,
      });
      expect(administered.map(rl2bOccasion), `${item}: administered`).toEqual(
        RL2B_OCCASIONS[item],
      );

      for (const event of administered) {
        expect(event.sequence ?? 0, `${item}: check first`).toBeGreaterThan(
          checks[0].sequence ?? 0,
        );
      }

      expect(
        own.filter((event) => rl2bSuffix(event, item) === 'technical_failure'),
        `${item}: no hold-back`,
      ).toEqual([]);
      // Every offer declined: each row's first-load reading.
      expect(rl2bFeature(now, item), `${item} reading`).toMatchObject({
        disposition: 'declined',
        value: null,
      });
    }

    expectNoRuntimeErrors(capture);
  });

  test('R3 + R6 (U): an earlier state that cannot be verified (store meta record removed before the reload — fault-injected) holds every occasion of the four rows, offers nothing, claims no prior exposure, and M05’s stations show the exact §9 lines', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL2U');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await page.addInitScript(() => {
      if (sessionStorage.getItem('rl2-meta-removed') !== null) {
        return;
      }

      sessionStorage.setItem('rl2-meta-removed', '1');

      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('research-events:v1:') && key.endsWith(':meta')) {
          localStorage.removeItem(key);
        }
      }
    });
    await reloadToDock(page);

    const screens: { lamp?: Rl2bScreen; flag?: Rl2bScreen } = {};

    await rl2bRoute(page, {
      concourse: async () => {
        await rl2bOpenLamp(page);
        screens.lamp = await rl2bReadHeld(page, 'o1', 'rl2-u-m05-o1');
      },
      yard: async () => {
        await rl2bOpenFlag(page);
        screens.flag = await rl2bReadHeld(page, 'o2', 'rl2-u-m05-o2');
      },
    });

    const now = await rl2bPayload(page);

    expect(now.page_load_index).toBe(2);
    expect(now.event_integrity.recovered_from_chunks).toBe(true);

    for (const item of RL2B_ITEMS) {
      expect(
        rl2bExpectHeld(now.raw_events, item, RL2B_U_DETAIL[item]),
        `${item} record`,
      ).toMatchObject({
        history_continuous: false,
        prior_opening_found: false,
        prior_opening_absence_established: false,
      });
      expect(rl2bFeature(now, item), `${item} reading`).toMatchObject({
        disposition: 'interrupted',
        value: null,
        missing_reason: RL2B_U_REASON[item],
      });
    }

    // Opening the held stations ran nothing.
    expect(
      rl2bOwn(now.raw_events, 'M05').map((event) => rl2bSuffix(event, 'M05')),
    ).toEqual(['prior_load_checked', 'technical_failure', 'technical_failure']);

    // R6 (U): the two approved lines; the title kept; LEAVE only; no job
    // readout and no subtitle (register §5.407 reading (g)).
    for (const [screen, title] of [
      [screens.lamp, M05_JOBS.o1.title],
      [screens.flag, M05_JOBS.o2.title],
    ] as const) {
      expect(screen).toBeDefined();
      expect(screen!.status).toBe(RL2B_U_LINES.join('\n'));
      expect(screen!.title).toBe(title);
      expect(screen!.subtitle).toBe('');
      expect(screen!.elements).toEqual(['leave']);
    }

    // No prior exposure claimed; never absent.
    for (const id of RL2B_OPPORTUNITIES) {
      const record = rl2bValidity(now, id);

      expect(record?.prior_exposure ?? [], `${id} prior exposure`).toEqual([]);
      expect(record?.absent ?? false, `${id} absent`).toBe(false);
    }

    expectNoRuntimeErrors(capture);
  });
});
