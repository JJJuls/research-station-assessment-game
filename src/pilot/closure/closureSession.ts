/**
 * Utility & Core closure — runtime session (Unit 6).
 *
 * Session-scope holder for the pure closure model (feeds + Core lifecycle)
 * so the state persists across legitimate scene transitions (Utility Deck
 * ↔ Core Chamber ↔ Concourse) for the page lifetime — the same singleton
 * discipline as `pilotRoute.ts` (explicit accessors, one reset hatch for
 * tests, never mutated from outside this module's commands).
 *
 * This module is the ONLY place the finale touches the research register,
 * and it does so through the committed review closure exactly once, at the
 * participant's explicit confirmation on the Shift Review Panel
 * (`closeStationRecord`). Readiness is a READ of the live coverage.
 *
 * Every event emitted here rides the unmapped `pilot_closure_*` route
 * telemetry sink (no canonical context, no proto_* family, no score).
 *
 * DEV inspection (`?scene=<zone>&dev_closure=inspect`, developer launch
 * only, DEV builds only): lets a developer walk the deck/chamber in any
 * state WITHOUT touching the record — no window closes, no participant
 * evidence is written, readiness reports `dev_inspection: true`, and every
 * participant-facing surface carries a visible DEV label. The flag is read
 * from the launch URL once and can never be set from a participant launch.
 */
import { markOpportunityInvalid } from '../../measurement/validity';
import {
  closePilotCoverageAtFinalCore,
  type FinalCoreClosure,
  pilotCoverage,
  pilotFinalCoreClosed,
  pilotLaunchMode,
  refreshPilotCoverageProbe,
} from '../pilotCoverage';
import {
  advancePilotStage,
  pilotStageAtOrAfter,
  setMissionLogNotice,
} from '../pilotRoute';
import { closeEpisodeWindowsAtReview } from '../windows/reviewClosure';
import {
  finalizeYardAmbientWindows,
  YARD_M22_OPPORTUNITY_ID,
  YARD_M25_OPPORTUNITY_ID,
  yardM22WindowOpen,
  yardM25WindowOpen,
} from '../yardJobs';
import {
  allFeedsReady,
  type ClosureContext,
  closureContext,
  type CoreCommand,
  coreCommand,
  type CoreCommandResult,
  type CoreLifecycle,
  createCoreLifecycle,
  createFeedsState,
  deriveRouteReadiness,
  type FeedsState,
  type RouteReadiness,
  type UtilityState,
  utilityState,
} from './utilityCoreClosure';

export type ClosureLogSink = (
  eventType: string,
  metadata: Record<string, unknown>,
  /** Station attribution (researchInteractions key); default: the route. */
  interactionKey?: string,
) => void;

/** Station attribution for feed events (scientific review F5). */
const FEED_INTERACTION: Record<string, string> = {
  coolant: 'pilotCoolantValve',
  calibration: 'pilotCalibrationBreaker',
  distribution: 'pilotDistributionBus',
};

interface ClosureSessionState {
  feeds: FeedsState;
  core: CoreLifecycle;
  /** The explicit record review confirmed (committed closure ran). */
  recordClosedAtMs: number | null;
  lastClosure: FinalCoreClosure | null;
  /** Review panel armed for the record-closure confirmation. */
  reviewArmed: boolean;
  devInspection: boolean;
  devInspectionResolved: boolean;
}

function createSession(): ClosureSessionState {
  return {
    feeds: createFeedsState(),
    core: createCoreLifecycle(),
    recordClosedAtMs: null,
    lastClosure: null,
    reviewArmed: false,
    devInspection: false,
    devInspectionResolved: false,
  };
}

let session = createSession();
let logSink: ClosureLogSink | null = null;

/** Host installs the runtime logger (RoomScene.logScenarioEvent) per scene. */
export function installClosureLogSink(sink: ClosureLogSink | null) {
  logSink = sink;
}

function emit(
  eventType: string,
  metadata: Record<string, unknown> = {},
  interactionKey?: string,
) {
  logSink?.(
    eventType,
    {
      non_scored: true,
      closure_context_only: true,
      dev_inspection: devInspectionActive(),
      ...metadata,
    },
    interactionKey,
  );
}

// ——— DEV inspection ————————————————————————————————————————————————————

/**
 * Whether the developer inspection bypass is active. Resolved once from
 * the launch URL: only a DEV build, only a developer launch (never the
 * participant default), only with the explicit parameter. Participant
 * sessions cannot reach this branch.
 */
export function devInspectionActive(): boolean {
  if (!session.devInspectionResolved) {
    session.devInspectionResolved = true;
    session.devInspection = false;

    if (
      typeof window !== 'undefined' &&
      import.meta.env.DEV &&
      pilotLaunchMode() === 'developer'
    ) {
      session.devInspection =
        new URLSearchParams(window.location.search).get('dev_closure') ===
        'inspect';
    }
  }

  return session.devInspection;
}

// ——— Accessors ————————————————————————————————————————————————————————

export function closureFeeds(): FeedsState {
  return session.feeds;
}

export function closureCore(): CoreLifecycle {
  return session.core;
}

export function stationRecordClosed(): boolean {
  return session.recordClosedAtMs !== null || pilotFinalCoreClosed();
}

export function stationRecordClosedAtMs(): number | null {
  return session.recordClosedAtMs;
}

export function reviewArmed(): boolean {
  return session.reviewArmed;
}

export function lastRecordClosure(): FinalCoreClosure | null {
  return session.lastClosure;
}

/** The deck's derived explicit state (never stored twice). */
export function currentUtilityState(): UtilityState {
  if (devInspectionActive()) {
    return allFeedsReady(session.feeds)
      ? 'core_access_ready'
      : 'ready_for_feeds';
  }

  return utilityState(session.feeds, {
    routeAtClosureStage: pilotStageAtOrAfter('deck_closure'),
    recordClosed: stationRecordClosed(),
  });
}

/**
 * Route readiness from the LIVE coverage registry (a read, never a
 * mutation). Under DEV inspection the derivation still runs against the
 * real register (so a developer sees the truth) but access is granted by
 * the visible bypass — the returned object says so explicitly.
 */
export function currentRouteReadiness(): RouteReadiness & {
  dev_inspection: boolean;
} {
  const readiness = deriveRouteReadiness(pilotCoverage(), {
    routeAtClosureStage: pilotStageAtOrAfter('deck_closure'),
    recordReviewed: stationRecordClosed(),
    closureErrors:
      session.lastClosure?.errors.map((error) => error.opportunity_id) ?? [],
  });

  return { ...readiness, dev_inspection: devInspectionActive() };
}

/** Core access = readiness valid (or DEV bypass) + the three physical feeds. */
export function coreAccessReady(): boolean {
  const readiness = currentRouteReadiness();

  return (
    (readiness.ready || readiness.dev_inspection) &&
    allFeedsReady(session.feeds)
  );
}

export function currentClosureContext(): ClosureContext {
  return closureContext(
    session.core,
    currentRouteReadiness(),
    stationRecordClosed(),
  );
}

// ——— Record review (the explicit readiness step) ————————————————————————

export function armRecordReview(): boolean {
  if (stationRecordClosed() || session.reviewArmed) {
    return false;
  }

  session.reviewArmed = true;
  emit('pilot_closure_record_review_armed');

  return true;
}

export function disarmRecordReview(): boolean {
  if (!session.reviewArmed) {
    return false;
  }

  session.reviewArmed = false;
  emit('pilot_closure_record_review_stood_down');

  return true;
}

/**
 * The explicit, participant-confirmed closure of the station record — the
 * committed review-closure model unchanged (Units 2–5): every open window
 * closes with its honest disposition (censored / observation / absent),
 * never a low value; already-terminal records are never overwritten.
 * Refused (no mutation) under DEV inspection, before the route's closure
 * stage, or when already closed. Advances the route to `core_stabilise`.
 */
export function closeStationRecord(nowMs: number): FinalCoreClosure | null {
  if (
    devInspectionActive() ||
    stationRecordClosed() ||
    !pilotStageAtOrAfter('deck_closure')
  ) {
    return null;
  }

  // Legacy ambient yard windows (unhosted since Unit 4 — always closed on
  // the v2 route; kept for parity with the previous console closure).
  const m22Open = yardM22WindowOpen();
  const m25Open = yardM25WindowOpen();

  finalizeYardAmbientWindows(nowMs);

  if (m22Open) {
    markOpportunityInvalid(
      YARD_M22_OPPORTUNITY_ID,
      'censored',
      'closed_departed_without_recovery',
    );
  }

  if (m25Open) {
    markOpportunityInvalid(
      YARD_M25_OPPORTUNITY_ID,
      'censored',
      'closed_departed_without_reset',
    );
  }

  closeEpisodeWindowsAtReview(nowMs);

  const closure = closePilotCoverageAtFinalCore();

  session.recordClosedAtMs = nowMs;
  session.lastClosure = closure;
  session.reviewArmed = false;
  advancePilotStage('core_stabilise', nowMs);
  // Presentation only: the mission log no longer lists work the closed
  // record could not receive (scientific review F1 / owner decision OD-2).
  setMissionLogNotice('Station record closed — shift work is filed.');

  const readiness = currentRouteReadiness();

  emit('pilot_closure_record_closed', {
    censored: closure.censored.length,
    absent: closure.absent.length,
    no_opportunity: closure.noOpportunity.length,
    error_count: closure.errors.length,
    counts: readiness.counts,
    ready: readiness.ready,
  });
  refreshPilotCoverageProbe();

  return closure;
}

// ——— Feeds (physical) ——————————————————————————————————————————————————

export function noteFeedPanelOpened(feed: string, inputMode: string) {
  emit(
    'pilot_closure_feed_panel_opened',
    { feed, input_mode: inputMode },
    FEED_INTERACTION[feed],
  );
}

export function noteFeedRefused(
  feed: string,
  reason: string,
  inputMode: string,
) {
  emit(
    'pilot_closure_feed_refused',
    { feed, reason, input_mode: inputMode },
    FEED_INTERACTION[feed],
  );
}

export function noteFeedReady(feed: string, inputMode: string) {
  emit(
    'pilot_closure_feed_ready',
    {
      feed,
      input_mode: inputMode,
      feeds_ready: FEEDS_READY_SNAPSHOT(),
      utility_state: currentUtilityState(),
    },
    FEED_INTERACTION[feed],
  );
}

function FEEDS_READY_SNAPSHOT() {
  return {
    coolant: session.feeds.coolant.open,
    calibration: session.feeds.calibration.engaged,
    distribution: session.feeds.distribution.seated,
  };
}

// ——— Core lifecycle ————————————————————————————————————————————————————

/** Re-derives the sealed/accessible state from readiness + feeds (idempotent). */
export function syncCoreAccess(nowMs: number): CoreLifecycle['state'] {
  const core = session.core;
  const ready = coreAccessReady();

  if (core.state === 'sealed' && ready) {
    coreCommand(core, 'unseal', nowMs);
  } else if (core.state === 'accessible' && !ready) {
    coreCommand(core, 'seal', nowMs);
  }

  return core.state;
}

export function coreLifecycleCommand(
  command: CoreCommand,
  nowMs: number,
  inputMode: string,
): CoreCommandResult {
  const result = coreCommand(session.core, command, nowMs);

  emit(
    `pilot_closure_core_${command}`,
    {
      ok: result.ok,
      from: result.from,
      to: result.to,
      reason: result.reason,
      input_mode: inputMode,
    },
    'pilotCore',
  );

  if (result.ok && command === 'confirm') {
    emit(
      'pilot_closure_synchronised',
      {
        context: currentClosureContext(),
        feeds: FEEDS_READY_SNAPSHOT(),
      },
      'pilotCore',
    );
  }

  if (result.ok && command === 'finish') {
    advancePilotStage('complete', nowMs);
    emit(
      'pilot_closure_stable',
      { context: currentClosureContext() },
      'pilotCore',
    );
    refreshPilotCoverageProbe();
  }

  return result;
}

export function noteCoreDoor(open: boolean, reason: string | null) {
  emit('pilot_closure_core_door', { open, reason });
}

// ——— DEV probe ————————————————————————————————————————————————————————

declare global {
  interface Window {
    /** DEV-only, read-only closure probe (never read back into gameplay). */
    __closureProbe?: {
      utility_state: UtilityState;
      feeds: FeedsState;
      core: CoreLifecycle;
      record_closed: boolean;
      review_armed: boolean;
      readiness: RouteReadiness & { dev_inspection: boolean };
      context: ClosureContext;
      dev_inspection: boolean;
    } | null;
  }
}

export function refreshClosureProbe() {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  window.__closureProbe = {
    utility_state: currentUtilityState(),
    feeds: JSON.parse(JSON.stringify(session.feeds)) as FeedsState,
    core: { ...session.core },
    record_closed: stationRecordClosed(),
    review_armed: session.reviewArmed,
    readiness: currentRouteReadiness(),
    context: currentClosureContext(),
    dev_inspection: devInspectionActive(),
  };
}

/** Test-only escape hatch (page-session state otherwise). */
export function resetClosureSession() {
  session = createSession();
  logSink = null;
}
