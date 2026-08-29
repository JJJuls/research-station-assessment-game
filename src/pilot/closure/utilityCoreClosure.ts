/**
 * Utility & Core closure — the NON-SCORED finale of the evidence-led pilot
 * v2 (decision workbook sheet 11 row 6; Unit 6).
 *
 * PURE module (no Phaser, no import.meta, no runtime imports beyond the
 * coverage-schedule types): a deterministic state machine for the three
 * physical utility feeds (coolant valve → calibration breaker →
 * distribution bus), the Core lifecycle (sealed → accessible → review →
 * armed → synchronising → stable) and the route-readiness derivation that
 * gates Core access on OPPORTUNITY TERMINALITY only.
 *
 * Scientific boundary (sheet 11 row 6 / row 16, build gate G2/G6):
 * - This module hosts NO item window and NO persistence trial. Nothing here
 *   reads task performance, correctness, magnet pulls, puzzle solutions or
 *   any raw M01–M26 component. Every transition is a physical/operational
 *   fact; every output is route/closure context, never evidence.
 * - Core access depends on every scheduled opportunity having a TERMINAL
 *   data-quality state (completed / missing with reason / invalid with
 *   reason / censored with reason / questionnaire-primary external pending)
 *   as recorded in the live register — never on desirable outcomes, and
 *   never on an assumed or forgotten closure. A still-open or still-pending
 *   window is NOT terminal and keeps the Core sealed (with a neutral
 *   location hint, never an item id, never a personality cue).
 * - The M25 questionnaire-primary presentation window is route-terminal
 *   once the record is reviewed; its RESEARCH state stays "pending external
 *   administration" — the two are reported separately and never merged.
 * - No score, weight, trait label, ranking or cut score exists here; no
 *   transition ever mutates a prior item record (readiness is a read).
 */
import type {
  PilotCoverageStatus,
  PilotItemCoverage,
} from '../coverageSchedule';

// ——— Feeds ————————————————————————————————————————————————————————————

export type FeedId = 'coolant' | 'calibration' | 'distribution';

/** Operational order of the three feeds (communicated by placards + objective). */
export const FEED_ORDER: readonly FeedId[] = [
  'coolant',
  'calibration',
  'distribution',
];

/** Breaker index the calibration placard names (fixed; identical for everyone). */
export const BREAKER_TARGET_INDEX = 7;
export const BREAKER_MAX_INDEX = 10;

/** Coupler travel at which the socket accepts a SEAT command. */
export const COUPLER_SOCKET_TRAVEL = 0.96;

/** Participant-facing feed names (operational only). */
export const FEED_LABELS: Record<FeedId, string> = {
  coolant: 'Coolant feed valve',
  calibration: 'Calibration breaker',
  distribution: 'Distribution bus',
};

export interface CoolantFeedState {
  /** Wheel travel 0..1 (0 = shut, 1 = fully open). */
  travel: number;
  open: boolean;
  /** Physical actions applied (context only). */
  actions: number;
}

export interface CalibrationFeedState {
  /** Lever index 0..BREAKER_MAX_INDEX. */
  index: number;
  engaged: boolean;
  /** ENGAGE attempts refused because the lever was off-index (context only). */
  misaligned_attempts: number;
  actions: number;
}

export type CouplerLocation = 'tray' | 'rail' | 'seated';

export interface DistributionFeedState {
  coupler: CouplerLocation;
  /** Rail travel 0..1 while on the rail (0 = tray end, 1 = socket). */
  travel: number;
  seated: boolean;
  /** SEAT commands refused because the coupler was short of the socket. */
  short_attempts: number;
  /** Releases that returned the coupler to the tray (transactional rollback). */
  returns_to_tray: number;
  actions: number;
}

export interface FeedsState {
  coolant: CoolantFeedState;
  calibration: CalibrationFeedState;
  distribution: DistributionFeedState;
}

export function createFeedsState(): FeedsState {
  return {
    coolant: { travel: 0, open: false, actions: 0 },
    calibration: {
      index: 0,
      engaged: false,
      misaligned_attempts: 0,
      actions: 0,
    },
    distribution: {
      coupler: 'tray',
      travel: 0,
      seated: false,
      short_attempts: 0,
      returns_to_tray: 0,
      actions: 0,
    },
  };
}

export function feedReady(feeds: FeedsState, feed: FeedId): boolean {
  switch (feed) {
    case 'coolant':
      return feeds.coolant.open;
    case 'calibration':
      return feeds.calibration.engaged;
    case 'distribution':
      return feeds.distribution.seated;
  }
}

export function feedsReadyCount(feeds: FeedsState): number {
  return FEED_ORDER.filter((feed) => feedReady(feeds, feed)).length;
}

export function allFeedsReady(feeds: FeedsState): boolean {
  return feedsReadyCount(feeds) === FEED_ORDER.length;
}

/** The feed the fiction expects next (null when all three are ready). */
export function nextFeed(feeds: FeedsState): FeedId | null {
  return FEED_ORDER.find((feed) => !feedReady(feeds, feed)) ?? null;
}

export type FeedCommandReason =
  | 'ok'
  | 'record_not_closed'
  | 'already_ready'
  | 'out_of_order'
  | 'off_index'
  | 'short_of_socket'
  | 'coupler_not_on_rail'
  | 'no_change';

export interface FeedCommandResult {
  ok: boolean;
  reason: FeedCommandReason;
  /** True when this command made the feed ready (exactly once per feed). */
  becameReady: boolean;
}

function refuse(reason: FeedCommandReason): FeedCommandResult {
  return { ok: false, reason, becameReady: false };
}

function accept(becameReady = false): FeedCommandResult {
  return { ok: true, reason: 'ok', becameReady };
}

/**
 * Whether a feed panel may be worked now: the record must be closed (the
 * review is the readiness step), the feed must not already be ready, and
 * the operational order must be respected. The refusal reasons feed
 * NEUTRAL participant copy (never a personality inference).
 */
export function feedAvailability(
  feeds: FeedsState,
  feed: FeedId,
  recordClosed: boolean,
): FeedCommandReason {
  if (!recordClosed) {
    return 'record_not_closed';
  }

  if (feedReady(feeds, feed)) {
    return 'already_ready';
  }

  const expected = nextFeed(feeds);

  if (expected !== feed) {
    return 'out_of_order';
  }

  return 'ok';
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Coolant valve: turn the wheel by `delta` travel (positive = open). The
 * valve latches OPEN at full travel; further turning is refused. Partial
 * travel is a recoverable physical state (ESC leaves it as it stands).
 */
export function turnValve(
  feeds: FeedsState,
  delta: number,
  recordClosed: boolean,
): FeedCommandResult {
  const availability = feedAvailability(feeds, 'coolant', recordClosed);

  if (availability !== 'ok') {
    return refuse(availability);
  }

  if (!Number.isFinite(delta) || delta === 0) {
    return refuse('no_change');
  }

  const valve = feeds.coolant;
  const next = clamp01(valve.travel + delta);

  if (next === valve.travel) {
    return refuse('no_change');
  }

  valve.travel = next;
  valve.actions += 1;

  if (valve.travel >= 1) {
    valve.open = true;

    return accept(true);
  }

  return accept();
}

/** Calibration breaker: move the lever by whole index steps. */
export function moveBreaker(
  feeds: FeedsState,
  step: number,
  recordClosed: boolean,
): FeedCommandResult {
  const availability = feedAvailability(feeds, 'calibration', recordClosed);

  if (availability !== 'ok') {
    return refuse(availability);
  }

  const breaker = feeds.calibration;
  const next = Math.max(
    0,
    Math.min(BREAKER_MAX_INDEX, breaker.index + Math.trunc(step)),
  );

  if (next === breaker.index) {
    return refuse('no_change');
  }

  breaker.index = next;
  breaker.actions += 1;

  return accept();
}

/** Calibration breaker: set the lever to an absolute index (pointer drag). */
export function setBreakerIndex(
  feeds: FeedsState,
  index: number,
  recordClosed: boolean,
): FeedCommandResult {
  const availability = feedAvailability(feeds, 'calibration', recordClosed);

  if (availability !== 'ok') {
    return refuse(availability);
  }

  const breaker = feeds.calibration;
  const next = Math.max(
    0,
    Math.min(BREAKER_MAX_INDEX, Math.round(Number.isFinite(index) ? index : 0)),
  );

  if (next === breaker.index) {
    return refuse('no_change');
  }

  breaker.index = next;
  breaker.actions += 1;

  return accept();
}

/**
 * Calibration breaker: ENGAGE. Accepted only at the placard index; an
 * off-index engage is refused neutrally and leaves the lever where it is.
 */
export function engageBreaker(
  feeds: FeedsState,
  recordClosed: boolean,
): FeedCommandResult {
  const availability = feedAvailability(feeds, 'calibration', recordClosed);

  if (availability !== 'ok') {
    return refuse(availability);
  }

  const breaker = feeds.calibration;

  if (breaker.index !== BREAKER_TARGET_INDEX) {
    breaker.misaligned_attempts += 1;

    return refuse('off_index');
  }

  breaker.engaged = true;
  breaker.actions += 1;

  return accept(true);
}

/** Distribution bus: lift the coupler from the tray onto the rail. */
export function liftCoupler(
  feeds: FeedsState,
  recordClosed: boolean,
): FeedCommandResult {
  const availability = feedAvailability(feeds, 'distribution', recordClosed);

  if (availability !== 'ok') {
    return refuse(availability);
  }

  const bus = feeds.distribution;

  if (bus.coupler !== 'tray') {
    return refuse('no_change');
  }

  bus.coupler = 'rail';
  bus.travel = 0;
  bus.actions += 1;

  return accept();
}

/** Distribution bus: slide the coupler along the rail (constrained 1-D). */
export function slideCoupler(
  feeds: FeedsState,
  delta: number,
  recordClosed: boolean,
): FeedCommandResult {
  const availability = feedAvailability(feeds, 'distribution', recordClosed);

  if (availability !== 'ok') {
    return refuse(availability);
  }

  const bus = feeds.distribution;

  if (bus.coupler !== 'rail') {
    return refuse('coupler_not_on_rail');
  }

  if (!Number.isFinite(delta) || delta === 0) {
    return refuse('no_change');
  }

  const next = clamp01(bus.travel + delta);

  if (next === bus.travel) {
    return refuse('no_change');
  }

  bus.travel = next;
  bus.actions += 1;

  return accept();
}

/** Distribution bus: set the coupler's rail travel directly (pointer drag). */
export function placeCoupler(
  feeds: FeedsState,
  travel: number,
  recordClosed: boolean,
): FeedCommandResult {
  const availability = feedAvailability(feeds, 'distribution', recordClosed);

  if (availability !== 'ok') {
    return refuse(availability);
  }

  const bus = feeds.distribution;

  if (bus.coupler !== 'rail') {
    return refuse('coupler_not_on_rail');
  }

  const next = clamp01(Number.isFinite(travel) ? travel : 0);

  if (next === bus.travel) {
    return refuse('no_change');
  }

  bus.travel = next;
  bus.actions += 1;

  return accept();
}

/**
 * Distribution bus: SEAT the coupler. Accepted only inside the socket
 * zone; short of it the command is refused and the coupler stays on the
 * rail (nothing consumed, nothing duplicated).
 */
export function seatCoupler(
  feeds: FeedsState,
  recordClosed: boolean,
): FeedCommandResult {
  const availability = feedAvailability(feeds, 'distribution', recordClosed);

  if (availability !== 'ok') {
    return refuse(availability);
  }

  const bus = feeds.distribution;

  if (bus.coupler !== 'rail') {
    return refuse('coupler_not_on_rail');
  }

  if (bus.travel < COUPLER_SOCKET_TRAVEL) {
    bus.short_attempts += 1;

    return refuse('short_of_socket');
  }

  bus.coupler = 'seated';
  bus.travel = 1;
  bus.seated = true;
  bus.actions += 1;

  return accept(true);
}

/**
 * Distribution bus: release / cancel with the coupler on the rail — the
 * coupler returns to the tray (transactional rollback; the single
 * component is conserved). A seated coupler is never released.
 */
export function returnCouplerToTray(feeds: FeedsState): boolean {
  const bus = feeds.distribution;

  if (bus.coupler !== 'rail') {
    return false;
  }

  bus.coupler = 'tray';
  bus.travel = 0;
  bus.returns_to_tray += 1;

  return true;
}

// ——— Utility deck derived state ——————————————————————————————————————————

export type UtilityState =
  | 'unavailable'
  | 'ready_for_review'
  | 'ready_for_feeds'
  | 'coolant_ready'
  | 'calibration_ready'
  | 'distribution_ready'
  | 'core_access_ready';

/**
 * The deck's single explicit state, derived (never stored twice):
 * - `unavailable`: the route has not reached its closure stage;
 * - `ready_for_review`: the review panel is live, the record still open;
 * - `ready_for_feeds` … `distribution_ready`: feeds progressing in order;
 * - `core_access_ready`: readiness valid + three feeds → the door opens.
 */
export function utilityState(
  feeds: FeedsState,
  context: { routeAtClosureStage: boolean; recordClosed: boolean },
): UtilityState {
  if (!context.routeAtClosureStage) {
    return 'unavailable';
  }

  if (!context.recordClosed) {
    return 'ready_for_review';
  }

  if (allFeedsReady(feeds)) {
    return 'core_access_ready';
  }

  if (feeds.calibration.engaged) {
    return 'calibration_ready';
  }

  if (feeds.coolant.open) {
    return 'coolant_ready';
  }

  return 'ready_for_feeds';
}

// ——— Route readiness (opportunity terminality) —————————————————————————

/**
 * Data-quality class of one scheduled item for the closure review — the
 * project's approved terminology ("recorded", "recorded with limited
 * evidence", "not observed", "technical state recorded", "questionnaire
 * handoff prepared"), never a validity word, score or item id on a
 * participant surface.
 */
export type ReadinessClass =
  | 'recorded'
  | 'recorded_limited'
  | 'not_observed'
  | 'technical'
  | 'external_pending'
  | 'not_scheduled'
  | 'open'
  | 'pending';

export interface ItemReadiness {
  item: string;
  status: PilotCoverageStatus;
  class: ReadinessClass;
  /** Route-terminal for Core access (research completeness is separate). */
  routeTerminal: boolean;
  /** Operational location label (never an item id). */
  label: string | null;
  /** Whether the review may NAME this window (MAJ-9 stopping-rule windows never). */
  nameable: boolean;
}

export interface ReadinessCounts {
  scheduled: number;
  recorded: number;
  recorded_limited: number;
  not_observed: number;
  technical: number;
  external_pending: number;
  open: number;
  pending: number;
}

export type ReadinessBlockerKind =
  | 'route_not_signed_off'
  | 'record_not_reviewed'
  | 'window_open'
  | 'window_pending'
  | 'closure_error';

export interface ReadinessBlocker {
  kind: ReadinessBlockerKind;
  /** Neutral operational hint (location / task class), or null. */
  hint: string | null;
}

export interface RouteReadiness {
  ready: boolean;
  blockers: ReadinessBlocker[];
  counts: ReadinessCounts;
  items: ItemReadiness[];
  /** Research-data completeness: pending until the external questionnaire is administered. */
  externalQuestionnairePending: boolean;
}

export interface ReadinessContext {
  /** The route reached the closure stage (Work Order Board sign-off). */
  routeAtClosureStage: boolean;
  /** The explicit record review was performed (committed closure ran). */
  recordReviewed: boolean;
  /** Opportunity ids whose closure threw (recorded, never dropped). */
  closureErrors: readonly string[];
}

function classify(
  item: PilotItemCoverage,
  recordReviewed: boolean,
): { klass: ReadinessClass; routeTerminal: boolean } {
  if (item.disposition === 'QUESTIONNAIRE-PRIMARY') {
    // M25 (presentation window) and the unscheduled questionnaire-primary
    // items: route-terminal once the record is reviewed; research state
    // pending external administration regardless of the presentation.
    return item.opportunities.length === 0
      ? { klass: 'not_scheduled', routeTerminal: true }
      : { klass: 'external_pending', routeTerminal: recordReviewed };
  }

  switch (item.status) {
    case 'not_applicable':
      return { klass: 'not_scheduled', routeTerminal: true };
    case 'completed':
      return { klass: 'recorded', routeTerminal: true };
    case 'censored':
      return { klass: 'recorded_limited', routeTerminal: true };
    case 'missing':
      return { klass: 'not_observed', routeTerminal: true };
    case 'invalid': {
      const technical = item.opportunities.some(
        (opportunity) => opportunity.invalid_reason === 'technical_failure',
      );

      return {
        klass: technical ? 'technical' : 'recorded_limited',
        routeTerminal: true,
      };
    }
    case 'open':
      return { klass: 'open', routeTerminal: false };
    case 'pending':
      return { klass: 'pending', routeTerminal: false };
  }
}

/**
 * Derives Core-access readiness from the live coverage registry. The
 * derivation is a READ: it never closes, marks or converts a window.
 *
 * Ready ⇔ the route reached its closure stage, the explicit review ran,
 * every scheduled opportunity is route-terminal in the register, and no
 * closure error is outstanding. Task success is never consulted.
 */
export function deriveRouteReadiness(
  coverage: readonly PilotItemCoverage[],
  context: ReadinessContext,
): RouteReadiness {
  const items: ItemReadiness[] = coverage.map((item) => {
    const { klass, routeTerminal } = classify(item, context.recordReviewed);

    return {
      item: item.item,
      status: item.status,
      class: klass,
      routeTerminal,
      label: item.operationalLabel,
      nameable: item.reviewNaming === 'never_entered_only',
    };
  });
  const scheduled = items.filter((item) => item.class !== 'not_scheduled');
  const count = (klass: ReadinessClass) =>
    scheduled.filter((item) => item.class === klass).length;
  const counts: ReadinessCounts = {
    scheduled: scheduled.length,
    recorded: count('recorded'),
    recorded_limited: count('recorded_limited'),
    not_observed: count('not_observed'),
    technical: count('technical'),
    external_pending: count('external_pending'),
    open: count('open'),
    pending: count('pending'),
  };
  const blockers: ReadinessBlocker[] = [];

  if (!context.routeAtClosureStage) {
    blockers.push({
      kind: 'route_not_signed_off',
      hint: 'Work Order Board (Records Workshop)',
    });
  } else if (!context.recordReviewed) {
    blockers.push({
      kind: 'record_not_reviewed',
      hint: 'Shift Review Panel (Utility Deck)',
    });
  }

  for (const item of scheduled) {
    if (item.routeTerminal) {
      continue;
    }

    if (item.class === 'external_pending') {
      // Only non-terminal before the review; covered by the review blocker.
      continue;
    }

    blockers.push({
      kind: item.class === 'open' ? 'window_open' : 'window_pending',
      // MAJ-9: stopping-rule windows are never named, even as a hint.
      hint: item.nameable ? item.label : null,
    });
  }

  for (const opportunityId of context.closureErrors) {
    void opportunityId;
    blockers.push({ kind: 'closure_error', hint: 'technical state recorded' });
  }

  return {
    ready: blockers.length === 0,
    blockers,
    counts,
    items,
    externalQuestionnairePending: true,
  };
}

/**
 * One concise, neutral operational sentence for a sealed Core — location
 * or task class only; never an item id, a validity word, a score or the
 * desired behaviour. Deduplicates hints and caps the list at three.
 */
export function sealedCoreReason(readiness: RouteReadiness): string {
  const first = readiness.blockers[0];

  if (first === undefined) {
    return 'Core Chamber access is ready.';
  }

  switch (first.kind) {
    case 'route_not_signed_off':
      return 'Core sealed — the shift has not been signed off at the Work Order Board (Records Workshop).';
    case 'record_not_reviewed':
      return 'Core sealed — close the station record at the Shift Review Panel first.';
    case 'closure_error':
      return 'Core sealed — a technical state is still being recorded. Open the Shift Review Panel again.';
    case 'window_open':
    case 'window_pending': {
      const hints = [
        ...new Set(
          readiness.blockers
            .map((blocker) => blocker.hint)
            .filter((hint): hint is string => hint !== null),
        ),
      ];
      const shown = hints.slice(0, 3);
      const more = hints.length - shown.length;

      if (shown.length === 0) {
        return 'Core sealed — a station task is still open. Open the Shift Review Panel.';
      }

      return `Core sealed — station work is still open: ${shown.join(', ')}${
        more > 0 ? ` and ${more} more` : ''
      }.`;
    }
  }
}

// ——— Core chamber lifecycle ——————————————————————————————————————————————

export type CoreState =
  | 'sealed'
  | 'accessible'
  | 'review_open'
  | 'confirmation_armed'
  | 'synchronizing'
  | 'stable';

export interface CoreLifecycle {
  state: CoreState;
  /** Times the review surface was opened (context only). */
  review_openings: number;
  /** Times the confirmation was armed then stood down (context only). */
  stand_downs: number;
  armed_at_ms: number | null;
  confirmed_at_ms: number | null;
  stable_at_ms: number | null;
  /** Rejected commands (repeated / out-of-state), for the probe only. */
  rejected: number;
}

export function createCoreLifecycle(): CoreLifecycle {
  return {
    state: 'sealed',
    review_openings: 0,
    stand_downs: 0,
    armed_at_ms: null,
    confirmed_at_ms: null,
    stable_at_ms: null,
    rejected: 0,
  };
}

export type CoreCommand =
  | 'unseal'
  | 'seal'
  | 'open_review'
  | 'close_review'
  | 'arm'
  | 'stand_down'
  | 'confirm'
  | 'finish';

export interface CoreCommandResult {
  ok: boolean;
  from: CoreState;
  to: CoreState;
  reason: 'ok' | 'invalid_from_state' | 'already_final';
}

/** Every transition validates its source state; a rejected command changes nothing. */
const CORE_TRANSITIONS: Record<
  CoreCommand,
  Partial<Record<CoreState, CoreState>>
> = {
  unseal: { sealed: 'accessible' },
  seal: { accessible: 'sealed' },
  open_review: { accessible: 'review_open' },
  close_review: { review_open: 'accessible', confirmation_armed: 'accessible' },
  arm: { review_open: 'confirmation_armed' },
  stand_down: { confirmation_armed: 'review_open' },
  confirm: { confirmation_armed: 'synchronizing' },
  finish: { synchronizing: 'stable' },
};

export function coreCommand(
  core: CoreLifecycle,
  command: CoreCommand,
  nowMs: number,
): CoreCommandResult {
  const from = core.state;

  if (from === 'stable') {
    core.rejected += 1;

    return { ok: false, from, to: from, reason: 'already_final' };
  }

  const to = CORE_TRANSITIONS[command][from];

  if (to === undefined) {
    core.rejected += 1;

    return { ok: false, from, to: from, reason: 'invalid_from_state' };
  }

  core.state = to;

  switch (command) {
    case 'open_review':
      core.review_openings += 1;
      break;
    case 'arm':
      core.armed_at_ms = nowMs;
      break;
    case 'stand_down':
      core.stand_downs += 1;
      core.armed_at_ms = null;
      break;
    case 'close_review':
      if (from === 'confirmation_armed') {
        core.stand_downs += 1;
        core.armed_at_ms = null;
      }
      break;
    case 'confirm':
      core.confirmed_at_ms = nowMs;
      break;
    case 'finish':
      core.stable_at_ms = nowMs;
      break;
    default:
      break;
  }

  return { ok: true, from, to, reason: 'ok' };
}

/** The participant may leave the chamber freely before the confirmation. */
export function coreExitAllowed(core: CoreLifecycle): boolean {
  return core.state !== 'synchronizing';
}

// ——— Completion context (non-scored) ————————————————————————————————————

/**
 * The four closure facts, kept DISTINCT (never one boolean):
 * gameplay route closure · research data-quality readiness · external
 * questionnaire pending · Qualtrics completion/redirect (future unit).
 */
export interface ClosureContext {
  gameplay_route_closed: boolean;
  research_record_closed: boolean;
  research_readiness_terminal: boolean;
  external_questionnaire_pending: boolean;
  qualtrics_completion_performed: false;
}

export function closureContext(
  core: CoreLifecycle,
  readiness: RouteReadiness,
  recordClosed: boolean,
): ClosureContext {
  return {
    gameplay_route_closed: core.state === 'stable',
    research_record_closed: recordClosed,
    research_readiness_terminal: readiness.ready,
    external_questionnaire_pending: readiness.externalQuestionnairePending,
    qualtrics_completion_performed: false,
  };
}
