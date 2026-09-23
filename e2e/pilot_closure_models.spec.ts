/**
 * Utility & Core closure — pure domain tests (evidence-led pilot v2, Unit 6).
 *
 * Imports the Node-safe closure model directly (no browser, no import.meta):
 * readiness derives from the coverage registry on opportunity TERMINALITY
 * only, the three physical feeds are a deterministic state machine with
 * safe rejections, the Core lifecycle needs two distinct actions to
 * synchronise and reaches `stable` exactly once, and the finale touches no
 * score, no canonical context, no item event and no prior record.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  allFeedsReady,
  BREAKER_TARGET_INDEX,
  closureContext,
  type CoreCommand,
  coreCommand,
  type CoreState,
  createCoreLifecycle,
  createFeedsState,
  deriveRouteReadiness,
  engageBreaker,
  feedAvailability,
  feedsReadyCount,
  liftCoupler,
  moveBreaker,
  nextFeed,
  placeCoupler,
  returnCouplerToTray,
  sealedCoreReason,
  seatCoupler,
  setBreakerIndex,
  slideCoupler,
  turnValve,
  utilityState,
} from '../src/pilot/closure/utilityCoreClosure';
import type { CoverageRecordLike } from '../src/pilot/coverageSchedule';
import {
  deriveCoverage,
  PILOT_SCHEDULE,
  scheduledOpportunityIds,
} from '../src/pilot/coverageSchedule';

function record(
  overrides: Partial<CoverageRecordLike> & { opportunity_id: string },
): CoverageRecordLike {
  return {
    form: null,
    entered: false,
    completed: false,
    absent: false,
    censored: false,
    technical_failure: false,
    comprehension_failure: false,
    contaminated: false,
    invalid_reason: null,
    prior_exposure: [],
    validity: 'pending',
    ...overrides,
  };
}

const completed = (id: string) =>
  record({
    opportunity_id: id,
    entered: true,
    completed: true,
    validity: 'valid',
  });
const censored = (id: string) =>
  record({
    opportunity_id: id,
    entered: true,
    censored: true,
    invalid_reason: 'censored',
    validity: 'missing',
  });
const absent = (id: string) =>
  record({
    opportunity_id: id,
    absent: true,
    invalid_reason: 'participant_absent',
    validity: 'missing',
  });
const invalid = (id: string) =>
  record({
    opportunity_id: id,
    entered: true,
    invalid_reason: 'insufficient_opportunity',
    validity: 'invalid',
  });
const technical = (id: string) =>
  record({
    opportunity_id: id,
    entered: true,
    technical_failure: true,
    invalid_reason: 'technical_failure',
    validity: 'invalid',
  });
const open = (id: string) => record({ opportunity_id: id, entered: true });

const CLOSED_CONTEXT = {
  routeAtClosureStage: true,
  recordReviewed: true,
  closureErrors: [] as string[],
};

/** Every scheduled opportunity terminal, with a MIX of dispositions. */
function mixedTerminalRegistry(): CoverageRecordLike[] {
  const ids = scheduledOpportunityIds();
  const makers = [completed, censored, absent, invalid, technical];

  return ids.map((id, index) => makers[index % makers.length](id));
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }

  return out;
}

test.describe('Utility & Core closure model (pure)', () => {
  test('1. readiness derives from the coverage registry — one row per item, scheduled count from the schedule', () => {
    const readiness = deriveRouteReadiness(deriveCoverage([]), CLOSED_CONTEXT);

    expect(readiness.items).toHaveLength(26);
    expect(readiness.items.map((item) => item.item)).toEqual(
      PILOT_SCHEDULE.map((entry) => entry.item),
    );
    // Scheduled = every register item with a route window (Station 080:
    // M08 joined in Unit 2; M11 / M25 follow their units).
    expect(readiness.counts.scheduled).toBe(
      PILOT_SCHEDULE.filter((entry) => entry.opportunityIds.length > 0).length,
    );
    expect(
      readiness.items
        .filter((item) => item.class === 'not_scheduled')
        .map((i) => i.item),
    ).toEqual(
      PILOT_SCHEDULE.filter((entry) => entry.opportunityIds.length === 0).map(
        (entry) => entry.item,
      ),
    );
    // Nothing declared → every game window pending → not ready. (Station
    // 080 Unit 4: M25 now owns two in-game windows classified like every
    // other item; the v2 presentation window is no longer scheduled, so no
    // `external_pending` item remains on the schedule.)
    expect(readiness.ready).toBe(false);
    expect(readiness.counts.pending).toBe(readiness.counts.scheduled);
    expect(readiness.blockers.every((b) => b.kind === 'window_pending')).toBe(
      true,
    );
  });

  test('2. completed, missing, invalid, censored and technical states are all terminal and classified with the approved words', () => {
    const readiness = deriveRouteReadiness(
      deriveCoverage([
        // Station 080 Unit 5: M01 owns two batch windows (both recorded).
        completed('proto_m01_batch_o1'),
        completed('proto_m01_batch_o2'),
        absent('proto_m02_case_workspace'),
        invalid('proto_m04_debris_cleanup'),
        censored('proto_m06_routine_dispatch'),
        technical('proto_m07_calibration_project'),
      ]),
      CLOSED_CONTEXT,
    );
    const byItem = (item: string) =>
      readiness.items.find((i) => i.item === item)!;

    expect(byItem('M01')).toMatchObject({
      class: 'recorded',
      routeTerminal: true,
    });
    expect(byItem('M02')).toMatchObject({
      class: 'not_observed',
      routeTerminal: true,
    });
    expect(byItem('M04')).toMatchObject({
      class: 'recorded_limited',
      routeTerminal: true,
    });
    expect(byItem('M06')).toMatchObject({
      class: 'recorded_limited',
      routeTerminal: true,
    });
    expect(byItem('M07')).toMatchObject({
      class: 'technical',
      routeTerminal: true,
    });
    expect(readiness.counts).toMatchObject({
      recorded: 1,
      not_observed: 1,
      recorded_limited: 2,
      technical: 1,
    });

    // A fully terminal registry (every disposition mixed) is READY.
    const full = deriveRouteReadiness(
      deriveCoverage(mixedTerminalRegistry()),
      CLOSED_CONTEXT,
    );

    expect(full.ready).toBe(true);
    expect(full.blockers).toEqual([]);
    expect(full.counts.open + full.counts.pending).toBe(0);
  });

  test('3. a genuinely open window blocks readiness with a neutral location hint; stopping-rule windows are never named', () => {
    const registry = mixedTerminalRegistry().map((r) =>
      r.opportunity_id === 'proto_m02_case_workspace'
        ? open(r.opportunity_id)
        : r,
    );
    const readiness = deriveRouteReadiness(
      deriveCoverage(registry),
      CLOSED_CONTEXT,
    );

    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toEqual([
      { kind: 'window_open', hint: 'Case workspace (Workshop)' },
    ]);
    expect(sealedCoreReason(readiness)).toBe(
      'Core sealed — station work is still open: Case workspace (Workshop).',
    );
    expect(sealedCoreReason(readiness)).not.toMatch(
      /M\d{2}|proto_|valid|score/i,
    );

    // MAJ-9: an open stopping-rule window (M22) blocks but carries no hint.
    const stopping = mixedTerminalRegistry().map((r) =>
      r.opportunity_id === 'proto_m22_report_revision'
        ? open(r.opportunity_id)
        : r,
    );
    const stoppingReadiness = deriveRouteReadiness(
      deriveCoverage(stopping),
      CLOSED_CONTEXT,
    );

    expect(stoppingReadiness.ready).toBe(false);
    expect(stoppingReadiness.blockers).toEqual([
      { kind: 'window_open', hint: null },
    ]);
    expect(sealedCoreReason(stoppingReadiness)).toBe(
      'Core sealed — a station task is still open. Open the Shift Review Panel.',
    );
  });

  test('4. task correctness is never required — a censored/invalid/stopped registry is exactly as ready as an all-completed one', () => {
    const allCompleted = scheduledOpportunityIds().map(completed);
    const allLimited = scheduledOpportunityIds().map((id, i) =>
      i % 2 === 0 ? censored(id) : invalid(id),
    );
    const a = deriveRouteReadiness(
      deriveCoverage(allCompleted),
      CLOSED_CONTEXT,
    );
    const b = deriveRouteReadiness(deriveCoverage(allLimited), CLOSED_CONTEXT);

    expect(a.ready).toBe(true);
    expect(b.ready).toBe(true);
    expect(b.counts.recorded).toBe(0);
    expect(b.blockers).toEqual(a.blockers);
    // The model exposes no success/performance field anywhere.
    expect(JSON.stringify(b)).not.toMatch(/success|correct|score|trait/i);
  });

  test('5. M25 (Station 080 Unit 4) owns two in-game windows classified like every other item; the external questionnaire stays pending regardless; the v2 notice record is unscheduled', () => {
    const registry = mixedTerminalRegistry();
    const before = deriveRouteReadiness(deriveCoverage(registry), {
      ...CLOSED_CONTEXT,
      recordReviewed: false,
    });

    expect(before.blockers[0]).toEqual({
      kind: 'record_not_reviewed',
      hint: 'Shift Review Panel (Utility Deck)',
    });

    // Both M25 windows completed → recorded; one censored → recorded_limited;
    // the loops window open → not route-terminal (a window_pending blocker).
    const both = registry.filter(
      (r) => !r.opportunity_id.startsWith('proto_m25_'),
    );
    const recorded = deriveRouteReadiness(
      deriveCoverage([
        ...both,
        completed('proto_m25_calibration_loops'),
        completed('proto_m25_normality_belief'),
      ]),
      CLOSED_CONTEXT,
    );

    expect(recorded.items.find((i) => i.item === 'M25')).toMatchObject({
      class: 'recorded',
      routeTerminal: true,
    });
    expect(recorded.ready).toBe(true);
    expect(recorded.externalQuestionnairePending).toBe(true);
    expect(recorded.counts.external_pending).toBe(0);

    const limited = deriveRouteReadiness(
      deriveCoverage([
        ...both,
        censored('proto_m25_calibration_loops'),
        completed('proto_m25_normality_belief'),
      ]),
      CLOSED_CONTEXT,
    );

    expect(limited.items.find((i) => i.item === 'M25')?.class).toBe(
      'recorded_limited',
    );

    // A never-asked question (absent) is the most conservative terminal code.
    const unasked = deriveRouteReadiness(
      deriveCoverage([
        ...both,
        completed('proto_m25_calibration_loops'),
        absent('proto_m25_normality_belief'),
      ]),
      CLOSED_CONTEXT,
    );

    expect(unasked.items.find((i) => i.item === 'M25')).toMatchObject({
      class: 'not_observed',
      routeTerminal: true,
    });

    const stillOpen = deriveRouteReadiness(
      deriveCoverage([...both, open('proto_m25_calibration_loops')]),
      CLOSED_CONTEXT,
    );

    expect(stillOpen.items.find((i) => i.item === 'M25')?.routeTerminal).toBe(
      false,
    );
    expect(stillOpen.ready).toBe(false);

    // The v2 presentation window is no longer on the schedule: its record
    // changes nothing (legacy record, kept under its old version).
    const presented = deriveRouteReadiness(
      deriveCoverage([
        ...both,
        completed('proto_m25_calibration_loops'),
        completed('proto_m25_normality_belief'),
        completed('proto_m25_belief_probe'),
      ]),
      CLOSED_CONTEXT,
    );

    expect(presented.items.find((i) => i.item === 'M25')?.class).toBe(
      'recorded',
    );
    expect(presented.externalQuestionnairePending).toBe(true);
  });

  test('6. a direct launch fabricates nothing — before the sign-off or the review the Core stays sealed whatever the register says', () => {
    const registry = mixedTerminalRegistry();
    const unsigned = deriveRouteReadiness(deriveCoverage(registry), {
      routeAtClosureStage: false,
      recordReviewed: false,
      closureErrors: [],
    });

    expect(unsigned.ready).toBe(false);
    expect(unsigned.blockers[0].kind).toBe('route_not_signed_off');
    expect(sealedCoreReason(unsigned)).toContain('Work Order Board');

    const unreviewed = deriveRouteReadiness(deriveCoverage(registry), {
      routeAtClosureStage: true,
      recordReviewed: false,
      closureErrors: [],
    });

    expect(unreviewed.ready).toBe(false);
    expect(unreviewed.blockers[0].kind).toBe('record_not_reviewed');

    // A recorded closure error keeps the Core sealed (technical, neutral).
    const errored = deriveRouteReadiness(deriveCoverage(registry), {
      ...CLOSED_CONTEXT,
      closureErrors: ['proto_m13_lattice_construction'],
    });

    expect(errored.ready).toBe(false);
    expect(errored.blockers).toEqual([
      { kind: 'closure_error', hint: 'technical state recorded' },
    ]);
    expect(sealedCoreReason(errored)).not.toMatch(/M13|proto_/);
  });

  test('7. coolant valve — refused before the record closes, accumulates travel, latches OPEN exactly once', () => {
    const feeds = createFeedsState();

    expect(turnValve(feeds, 0.5, false)).toMatchObject({
      ok: false,
      reason: 'record_not_closed',
    });
    expect(feeds.coolant).toEqual({ travel: 0, open: false, actions: 0 });

    expect(turnValve(feeds, 0.4, true)).toMatchObject({
      ok: true,
      becameReady: false,
    });
    expect(feeds.coolant.travel).toBeCloseTo(0.4);
    expect(turnValve(feeds, -0.1, true).ok).toBe(true);
    expect(feeds.coolant.travel).toBeCloseTo(0.3);
    expect(turnValve(feeds, 0, true)).toMatchObject({
      ok: false,
      reason: 'no_change',
    });
    expect(turnValve(feeds, Number.NaN, true)).toMatchObject({
      ok: false,
      reason: 'no_change',
    });

    const latch = turnValve(feeds, 5, true);

    expect(latch).toMatchObject({ ok: true, becameReady: true });
    expect(feeds.coolant).toMatchObject({ travel: 1, open: true });
    expect(turnValve(feeds, 0.2, true)).toMatchObject({
      ok: false,
      reason: 'already_ready',
    });
    expect(turnValve(feeds, -0.2, true)).toMatchObject({
      ok: false,
      reason: 'already_ready',
    });
    expect(feeds.coolant.travel).toBe(1);
  });

  test('8. calibration breaker — order, index clamping, off-index engage refused neutrally, engaged once', () => {
    const feeds = createFeedsState();

    expect(moveBreaker(feeds, 1, true)).toMatchObject({
      ok: false,
      reason: 'out_of_order',
    });
    turnValve(feeds, 1, true);

    expect(moveBreaker(feeds, 3, true).ok).toBe(true);
    expect(feeds.calibration.index).toBe(3);
    expect(moveBreaker(feeds, -9, true).ok).toBe(true);
    expect(feeds.calibration.index).toBe(0);
    expect(moveBreaker(feeds, -1, true)).toMatchObject({
      ok: false,
      reason: 'no_change',
    });
    expect(setBreakerIndex(feeds, 99, true).ok).toBe(true);
    expect(feeds.calibration.index).toBe(10);
    expect(setBreakerIndex(feeds, 4.4, true).ok).toBe(true);
    expect(feeds.calibration.index).toBe(4);

    expect(engageBreaker(feeds, true)).toMatchObject({
      ok: false,
      reason: 'off_index',
    });
    expect(feeds.calibration).toMatchObject({
      index: 4,
      engaged: false,
      misaligned_attempts: 1,
    });

    setBreakerIndex(feeds, BREAKER_TARGET_INDEX, true);
    expect(engageBreaker(feeds, true)).toMatchObject({
      ok: true,
      becameReady: true,
    });
    expect(feeds.calibration.engaged).toBe(true);
    expect(engageBreaker(feeds, true)).toMatchObject({
      ok: false,
      reason: 'already_ready',
    });
    expect(moveBreaker(feeds, 1, true)).toMatchObject({
      ok: false,
      reason: 'already_ready',
    });
    expect(feeds.calibration.index).toBe(BREAKER_TARGET_INDEX);
  });

  test('9. distribution bus — lift, slide, seat only inside the socket; the single coupler is conserved', () => {
    const feeds = createFeedsState();

    turnValve(feeds, 1, true);
    setBreakerIndex(feeds, BREAKER_TARGET_INDEX, true);
    engageBreaker(feeds, true);

    expect(slideCoupler(feeds, 0.5, true)).toMatchObject({
      ok: false,
      reason: 'coupler_not_on_rail',
    });
    expect(seatCoupler(feeds, true)).toMatchObject({
      ok: false,
      reason: 'coupler_not_on_rail',
    });
    expect(liftCoupler(feeds, true).ok).toBe(true);
    expect(feeds.distribution.coupler).toBe('rail');
    expect(liftCoupler(feeds, true)).toMatchObject({
      ok: false,
      reason: 'no_change',
    });

    expect(slideCoupler(feeds, 0.5, true).ok).toBe(true);
    expect(seatCoupler(feeds, true)).toMatchObject({
      ok: false,
      reason: 'short_of_socket',
    });
    expect(feeds.distribution).toMatchObject({
      coupler: 'rail',
      seated: false,
      short_attempts: 1,
    });

    expect(placeCoupler(feeds, 0.97, true).ok).toBe(true);
    expect(seatCoupler(feeds, true)).toMatchObject({
      ok: true,
      becameReady: true,
    });
    expect(feeds.distribution).toMatchObject({
      coupler: 'seated',
      travel: 1,
      seated: true,
    });
    expect(returnCouplerToTray(feeds)).toBe(false);
    expect(seatCoupler(feeds, true)).toMatchObject({
      ok: false,
      reason: 'already_ready',
    });
    expect(feeds.distribution.coupler).toBe('seated');
  });

  test('10. invalid order, repeated and cancelled actions leave the state intact or roll back transactionally', () => {
    const feeds = createFeedsState();
    const snapshot = () => JSON.parse(JSON.stringify(feeds));

    // Out-of-order commands change nothing.
    const untouched = snapshot();

    expect(engageBreaker(feeds, true).ok).toBe(false);
    expect(liftCoupler(feeds, true).ok).toBe(false);
    expect(seatCoupler(feeds, true).ok).toBe(false);
    expect(snapshot()).toEqual(untouched);

    turnValve(feeds, 1, true);
    setBreakerIndex(feeds, BREAKER_TARGET_INDEX, true);
    engageBreaker(feeds, true);

    // Cancel with the coupler on the rail: it returns to the tray.
    liftCoupler(feeds, true);
    slideCoupler(feeds, 0.6, true);
    expect(returnCouplerToTray(feeds)).toBe(true);
    expect(feeds.distribution).toMatchObject({
      coupler: 'tray',
      travel: 0,
      seated: false,
      returns_to_tray: 1,
    });
    expect(feedAvailability(feeds, 'distribution', true)).toBe('ok');

    // Repeating completed feeds is refused and changes nothing.
    const afterCancel = snapshot();

    expect(turnValve(feeds, 1, true).ok).toBe(false);
    expect(engageBreaker(feeds, true).ok).toBe(false);
    expect(snapshot()).toEqual(afterCancel);
  });

  test('11. three-feed readiness progresses in order and the deck state is derived, never stored twice', () => {
    const feeds = createFeedsState();
    const context = { routeAtClosureStage: true, recordClosed: true };

    expect(
      utilityState(feeds, { routeAtClosureStage: false, recordClosed: false }),
    ).toBe('unavailable');
    expect(
      utilityState(feeds, { routeAtClosureStage: true, recordClosed: false }),
    ).toBe('ready_for_review');
    expect(utilityState(feeds, context)).toBe('ready_for_feeds');
    expect(nextFeed(feeds)).toBe('coolant');
    expect(feedAvailability(feeds, 'calibration', true)).toBe('out_of_order');

    turnValve(feeds, 1, true);
    expect(utilityState(feeds, context)).toBe('coolant_ready');
    expect(nextFeed(feeds)).toBe('calibration');
    expect(feedsReadyCount(feeds)).toBe(1);

    setBreakerIndex(feeds, BREAKER_TARGET_INDEX, true);
    engageBreaker(feeds, true);
    expect(utilityState(feeds, context)).toBe('calibration_ready');
    expect(nextFeed(feeds)).toBe('distribution');

    liftCoupler(feeds, true);
    placeCoupler(feeds, 1, true);
    seatCoupler(feeds, true);
    expect(allFeedsReady(feeds)).toBe(true);
    expect(nextFeed(feeds)).toBeNull();
    expect(utilityState(feeds, context)).toBe('core_access_ready');
    // Access still depends on the record having been closed.
    expect(
      utilityState(feeds, { routeAtClosureStage: true, recordClosed: false }),
    ).toBe('ready_for_review');
  });

  test('12. Core access transition — unseal only from sealed, re-seal only from accessible, review only when accessible', () => {
    const core = createCoreLifecycle();

    expect(core.state).toBe('sealed');
    expect(coreCommand(core, 'open_review', 1)).toMatchObject({
      ok: false,
      reason: 'invalid_from_state',
    });
    expect(coreCommand(core, 'unseal', 1)).toMatchObject({
      ok: true,
      from: 'sealed',
      to: 'accessible',
    });
    expect(coreCommand(core, 'unseal', 2).ok).toBe(false);
    expect(coreCommand(core, 'seal', 3)).toMatchObject({
      ok: true,
      to: 'sealed',
    });
    coreCommand(core, 'unseal', 4);
    expect(coreCommand(core, 'open_review', 5)).toMatchObject({
      ok: true,
      to: 'review_open',
    });
    expect(core.review_openings).toBe(1);
    expect(core.rejected).toBe(2);
  });

  test('13. two-step confirmation — confirm is refused until armed; arm then confirm synchronises', () => {
    const core = createCoreLifecycle();

    coreCommand(core, 'unseal', 1);
    coreCommand(core, 'open_review', 2);
    expect(coreCommand(core, 'confirm', 3)).toMatchObject({
      ok: false,
      reason: 'invalid_from_state',
    });
    expect(core.state).toBe('review_open');
    expect(coreCommand(core, 'arm', 4)).toMatchObject({
      ok: true,
      to: 'confirmation_armed',
    });
    expect(core.armed_at_ms).toBe(4);
    expect(coreCommand(core, 'confirm', 5)).toMatchObject({
      ok: true,
      to: 'synchronizing',
    });
    expect(core.confirmed_at_ms).toBe(5);
  });

  test('14. no single command reaches synchronising from an unarmed state — every path needs two distinct actions', () => {
    const commands: CoreCommand[] = [
      'unseal',
      'seal',
      'open_review',
      'close_review',
      'arm',
      'stand_down',
      'confirm',
      'finish',
    ];
    const unarmed: CoreState[] = ['sealed', 'accessible', 'review_open'];

    for (const from of unarmed) {
      for (const command of commands) {
        const core = createCoreLifecycle();

        core.state = from;

        const result = coreCommand(core, command, 1);

        expect(
          result.to,
          `${from} --${command}--> ${result.to} must not synchronise`,
        ).not.toBe('synchronizing');
        expect(result.to).not.toBe('stable');
      }
    }
  });

  test('15. ESC cancellation — an armed confirmation stands down, and closing an armed review records the stand-down', () => {
    const core = createCoreLifecycle();

    coreCommand(core, 'unseal', 1);
    coreCommand(core, 'open_review', 2);
    coreCommand(core, 'arm', 3);
    expect(coreCommand(core, 'stand_down', 4)).toMatchObject({
      ok: true,
      to: 'review_open',
    });
    expect(core).toMatchObject({ stand_downs: 1, armed_at_ms: null });

    coreCommand(core, 'arm', 5);
    expect(coreCommand(core, 'close_review', 6)).toMatchObject({
      ok: true,
      to: 'accessible',
    });
    expect(core.stand_downs).toBe(2);
    expect(core.armed_at_ms).toBeNull();
    // Re-entering the review starts unarmed.
    coreCommand(core, 'open_review', 7);
    expect(coreCommand(core, 'confirm', 8).ok).toBe(false);
  });

  test('16. synchronisation reaches stable exactly once, with its timestamps', () => {
    const core = createCoreLifecycle();

    coreCommand(core, 'unseal', 1);
    coreCommand(core, 'open_review', 2);
    coreCommand(core, 'arm', 3);
    coreCommand(core, 'confirm', 4);
    expect(coreCommand(core, 'finish', 9)).toMatchObject({
      ok: true,
      to: 'stable',
    });
    expect(core).toMatchObject({
      state: 'stable',
      confirmed_at_ms: 4,
      stable_at_ms: 9,
    });
  });

  test('17. repeated synchronisation is rejected — stable is final for every command', () => {
    const core = createCoreLifecycle();

    coreCommand(core, 'unseal', 1);
    coreCommand(core, 'open_review', 2);
    coreCommand(core, 'arm', 3);
    coreCommand(core, 'confirm', 4);
    coreCommand(core, 'finish', 5);

    const frozen = { ...core };

    for (const command of [
      'confirm',
      'arm',
      'open_review',
      'finish',
      'seal',
      'unseal',
    ] as CoreCommand[]) {
      expect(coreCommand(core, command, 6)).toMatchObject({
        ok: false,
        reason: 'already_final',
        to: 'stable',
      });
    }

    expect({ ...core, rejected: frozen.rejected }).toEqual(frozen);
    expect(core.rejected).toBe(frozen.rejected + 6);
  });

  test('18. readiness is a read — the coverage input is never mutated and the model imports no register', () => {
    const coverage = deriveCoverage(mixedTerminalRegistry());
    const frozen = JSON.parse(JSON.stringify(coverage));

    deriveRouteReadiness(coverage, CLOSED_CONTEXT);
    sealedCoreReason(
      deriveRouteReadiness(coverage, {
        ...CLOSED_CONTEXT,
        recordReviewed: false,
      }),
    );
    expect(coverage).toEqual(frozen);

    const source = readFileSync(
      join(__dirname, '..', 'src', 'pilot', 'closure', 'utilityCoreClosure.ts'),
      'utf8',
    );

    expect(source).not.toMatch(
      /measurement\/validity|markOpportunity|declareOpportunity/,
    );
    expect(source).not.toMatch(/researchRuntime|logInteraction|import Phaser/);
  });

  test('19. no score, canonical context, item family, questionnaire wording or Qualtrics call in the closure code; the context keeps four facts distinct', () => {
    const files = [
      join(__dirname, '..', 'src', 'pilot', 'closure'),
      join(__dirname, '..', 'src', 'pilot', 'ui', 'FeedPanelScene.ts'),
      join(__dirname, '..', 'src', 'scenes', 'UtilityCoreDeckScene.ts'),
      join(__dirname, '..', 'src', 'scenes', 'CoreChamberScene.ts'),
    ].flatMap((path) =>
      statSync(path).isDirectory() ? listTsFiles(path) : [path],
    );

    expect(files.length).toBeGreaterThanOrEqual(5);

    for (const file of files) {
      // Code only: comments explain the boundary and legitimately name
      // what must NOT exist here.
      const text = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');

      expect(text, file).not.toMatch(/['"`]proto_m\d{2}[a-z_]*['"`]/);
      expect(text, file).not.toMatch(
        /ScoringManager|CANONICAL_EVENT_CONTEXT|CanonicalEventContext/,
      );
      expect(text, file).not.toMatch(
        // Calls, not words: since Pilot V3 Unit 2 the Core Chamber delegates
        // completion to the runtime pipeline (completeParticipantSession /
        // continueToSurvey) and only READS its handoff state (return_url);
        // it must still never construct the bridge, build or navigate itself.
        /QualtricsBridge|buildReturnUrl\(|completeDebugSession\(|location\.assign\(/,
      );
      expect(text, file).not.toMatch(/\bQ\d{2}\b/);
      expect(text, file).not.toMatch(
        /cut[_ -]?score|trait_score|weight\s*[:=]\s*\d/i,
      );
    }

    const core = createCoreLifecycle();
    const readiness = deriveRouteReadiness(
      deriveCoverage(mixedTerminalRegistry()),
      CLOSED_CONTEXT,
    );

    expect(closureContext(core, readiness, true)).toEqual({
      gameplay_route_closed: false,
      research_record_closed: true,
      research_readiness_terminal: true,
      external_questionnaire_pending: true,
      qualtrics_completion_performed: false,
    });

    coreCommand(core, 'unseal', 1);
    coreCommand(core, 'open_review', 2);
    coreCommand(core, 'arm', 3);
    coreCommand(core, 'confirm', 4);
    coreCommand(core, 'finish', 5);
    expect(closureContext(core, readiness, true)).toMatchObject({
      gameplay_route_closed: true,
      external_questionnaire_pending: true,
      qualtrics_completion_performed: false,
    });
  });
});
