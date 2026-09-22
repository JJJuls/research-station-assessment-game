import { ASSET_SET_VERSION } from '../constants';
import { DataQualityTracker } from './DataQualityTracker';
import type { RawGameEvent } from './EventLogger';
import { EventLogger } from './EventLogger';
import type { EventIntegrity } from './EventStore';
import { computeEventIntegrity, DurableEventStore } from './EventStore';
import type { ReturnUrlRefusal } from './QualtricsBridge';
import { parseAllowedHosts, QualtricsBridge } from './QualtricsBridge';
import type {
  ResearchExportConfig,
  ResearchExportPayload,
  ResearchExportResult,
} from './ResearchExportClient';
import { ResearchExportClient } from './ResearchExportClient';
import type { GameSummaryVariables } from './ScoringManager';
import { computeSummary } from './ScoringManager';
import type { SessionMetadata } from './SessionState';
import { SessionState } from './SessionState';
import type {
  ExportStatus,
  LaunchMode,
  ReturnStatus,
  SessionStatusAxes,
} from './SessionStatus';
import {
  exportAllowed,
  LAUNCH_MODE_PARAM,
  resolveLaunchMode,
  SessionStatusMachine,
} from './SessionStatus';
import type { SummaryScope } from './SummaryScope';
import {
  applySummaryScope,
  EXPORT_SCHEMA_VERSION,
  scopedSummaryForUrl,
} from './SummaryScope';

interface DebugCompletionResult {
  summary: GameSummaryVariables;
  returnUrl: string | null;
}

/**
 * Participant handoff state — PROVISIONAL(INT-1 / INT-5), Pilot V3 Unit 2.
 * Transport and navigation bookkeeping only; never a research variable.
 */
export interface HandoffState {
  phase: 'idle' | 'exporting' | 'settled' | 'navigating' | 'blocked';
  export_status: ExportStatus;
  export_attempts: number;
  last_export: ResearchExportResult | null;
  return_status: ReturnStatus;
  /** Why the launch-supplied return URL was refused, when it was. */
  return_refusal: ReturnUrlRefusal | null;
  /** The validated destination (with summary + status axes), or null. */
  return_url: string | null;
  /** Wall-clock at which automatic navigation fires, when scheduled. */
  auto_navigate_at_ms: number | null;
}

export type HandoffListener = (state: HandoffState) => void;

declare global {
  interface Window {
    researchRuntime?: {
      completeDebugSession: () => DebugCompletionResult;
      exportEventsJSON: () => string;
      getEventIntegrity: () => EventIntegrity;
      getEvents: () => RawGameEvent[];
      getHandoffState: () => HandoffState;
      getLastExportResult: () => ResearchExportResult | null;
      getMissionState: () => ReturnType<SessionState['getMissionState']>;
      getSessionStatus: () => SessionStatusAxes & {
        launch_mode_raw: string | null;
      };
      getSummary: () => GameSummaryVariables;
      printEvents: () => RawGameEvent[];
      printSummary: () => GameSummaryVariables;
      submitSessionExport: () => Promise<ResearchExportResult>;
    };
    /**
     * DEV-only test hook: lets browser tests inject the ingest URL/key for
     * the exporter without placing values in tracked env files, and opt a
     * DEV session into the production export path. Ignored entirely
     * outside `import.meta.env.DEV`.
     */
    __researchExportConfig?: {
      ingestUrl?: string;
      publishableKey?: string;
      timeoutMs?: number;
      allowProductionInDev?: boolean;
      /** Shortens the automatic-navigation delay for browser tests. */
      autoNavigateDelayMs?: number;
    };
    /** DEV-only, read-only handoff probe. */
    __handoffProbe?: HandoffState | null;
  }
}

/**
 * PROVISIONAL(INT-1): delay between "record settled" and the automatic
 * survey navigation (Option A). Long enough for an adult to read the
 * settled notice; the notice shows the countdown and offers an immediate
 * continue control. Never applied after a failed export (gameplay review
 * finding 3): then the participant continues deliberately.
 */
const AUTO_NAVIGATE_DELAY_MS = 20_000;
/** PROVISIONAL(INT-2.6): bounded retry before the handoff proceeds. */
const PARTICIPANT_EXPORT_ATTEMPTS = 3;

/**
 * Audit 2026-09 B2: the measurement layer (validity register, coverage)
 * documented that its dispositions reach "the raw export", but nothing
 * carried them — and the DEV window probes die with the tab in
 * production. The augmenter inverts the dependency (systems never
 * imports pilot code): the pilot layer installs a provider whose
 * read-only snapshot rides every export payload. Additive PROVISIONAL
 * fields under the INT-2 precedent; no event, name or formula changes.
 */
export type ExportAugmenter = () => {
  measurement_validity: unknown;
  pilot_coverage: unknown;
  /**
   * The summary scope of the active route (SummaryScope.ts): which legacy
   * room families the route can offer at all. Null / omitted → the
   * summary is exported in full, exactly as before (legacy / developer).
   */
  summary_scope?: SummaryScope | null;
  /**
   * Station 080 M01–M26 (Unit 1) — PROVISIONAL, additive: the protocol
   * versions and the read-only feature extraction of the raw log. Absent
   * on routes that install no augmenter. Never consulted by the summary.
   */
  measurement_protocol?: unknown;
  measurement_features?: unknown;
};

let exportAugmenter: ExportAugmenter | null = null;

export function installExportAugmenter(augmenter: ExportAugmenter | null) {
  exportAugmenter = augmenter;
}

class ResearchRuntime {
  readonly dataQualityTracker = new DataQualityTracker();
  readonly eventLogger = new EventLogger();
  // PROVISIONAL(INT-4): the return-URL policy is fixed at build time —
  // https to an allow-listed host (default qualtrics.com), plus localhost
  // in DEV builds only, for browser tests.
  readonly qualtricsBridge = new QualtricsBridge(undefined, {
    allowedHosts: parseAllowedHosts(
      import.meta.env.VITE_RETURN_URL_ALLOWED_HOSTS,
    ),
    allowLocalhost: import.meta.env.DEV,
  });
  readonly sessionState = new SessionState();

  private exportClient: ResearchExportClient | null = null;
  private eventStore: DurableEventStore | null = null;
  private priorPageLoadEvents: RawGameEvent[] = [];
  private pageLoadIndex = 1;
  private storeOpenFacts = {
    recovered_from_chunks: false,
    foreign_records_rejected: 0,
  };
  private launchMode: LaunchMode = 'development';
  private launchModeRaw: string | null = null;
  private status = new SessionStatusMachine('development');
  private handoff: HandoffState = idleHandoff();
  private handoffListeners: HandoffListener[] = [];
  private completion: Promise<HandoffState> | null = null;
  private autoNavigateTimer: ReturnType<typeof setTimeout> | null = null;
  private navigated = false;
  private hasStarted = false;

  start() {
    if (this.hasStarted) {
      return;
    }

    this.hasStarted = true;
    this.dataQualityTracker.start();

    const metadata = this.sessionState.getMetadata();
    const resolved = resolveLaunchMode(readLaunchMode(), import.meta.env.DEV);

    this.launchMode = resolved.launch_mode;
    this.launchModeRaw = resolved.launch_mode_raw;
    this.status = new SessionStatusMachine(resolved.launch_mode);

    // Pilot V3 (Unit 1): durable mirror of the raw log, opened BEFORE the
    // first event so session_start itself is persisted and numbered after
    // anything an earlier page load of the same identity already stored.
    this.openEventStore(metadata);

    this.eventLogger.log({
      session_id: metadata.game_session_id,
      timestamp_ms: metadata.started_at_ms,
      scene: 'runtime',
      event_type: 'session_start',
      ...this.buildContextFields(metadata),
    });

    this.installPageHideExport();
    this.installDeveloperHelper();
    this.publishHandoff();
  }

  logSceneStart(scene: string) {
    const metadata = this.sessionState.getMetadata();

    this.eventLogger.log({
      session_id: metadata.game_session_id,
      timestamp_ms: Date.now(),
      scene,
      event_type: 'scene_start',
      ...this.buildContextFields(metadata),
    });
  }

  logInteraction(event: {
    scene: string;
    object_id: string;
    episode?: string;
    event_type?: string;
    x?: number;
    y?: number;
    state_before?: string;
    state_after?: string;
    score_delta?: Record<string, number>;
    room_id?: string;
    task_id?: string;
    construct_id?: string;
    study_item_ids?: string[];
    choice_value?: string | number | null;
    attempt_number?: number;
    previous_state?: string;
    new_state?: string;
    success?: boolean | null;
    metadata?: Record<string, unknown>;
  }) {
    const metadata = this.sessionState.getMetadata();

    // Caller-supplied event-specific fields (event_type, scene, object_id,
    // room_id, task_id, ...) are spread first so ResearchRuntime's own
    // session-context fields always win on any key collision — session_id,
    // timestamp_ms, and the buildContextFields() context are authoritative
    // and must never be overridable by a caller.
    this.eventLogger.log({
      event_type: 'interaction',
      ...event,
      session_id: metadata.game_session_id,
      timestamp_ms: Date.now(),
      ...this.buildContextFields(metadata),
    });
  }

  getSummary(completed = false) {
    return computeSummary({
      metadata: this.sessionState.getMetadata(),
      elapsed_seconds: this.sessionState.getElapsedSeconds(),
      completed,
      events: this.eventLogger.getEvents(),
      data_quality: this.dataQualityTracker.getMetrics(),
    });
  }

  /**
   * Canonical launch/session context (V3 §3.2) that ResearchRuntime can
   * always populate reliably from SessionState, regardless of caller — does
   * not invent room_id/task_id/construct_id/study_item_ids/success/choice
   * fields, which only the calling site (Main.tsx / future room code) knows.
   */
  private buildContextFields(metadata: SessionMetadata) {
    return {
      participant_id: metadata.participant_id,
      game_session_id: metadata.game_session_id,
      condition: metadata.condition,
      game_version: metadata.game_version,
      elapsed_seconds: this.sessionState.getElapsedSeconds(),
    };
  }

  printSummary() {
    const summary = this.getSummary();
    const developerConsole = globalThis['console'];

    if (developerConsole !== undefined) {
      developerConsole.table(summary);
    }

    return summary;
  }

  getEvents() {
    return this.eventLogger.getEvents();
  }

  printEvents() {
    const events = this.getEvents();
    const developerConsole = globalThis['console'];

    if (developerConsole !== undefined) {
      developerConsole.table(events);
    }

    return events;
  }

  exportEventsJSON() {
    return this.eventLogger.toJSON();
  }

  /** PROVISIONAL(INT-5) status axes plus the raw launch value for audit. */
  getSessionStatus(): SessionStatusAxes & { launch_mode_raw: string | null } {
    return { ...this.status.snapshot(), launch_mode_raw: this.launchModeRaw };
  }

  getHandoffState(): HandoffState {
    return {
      ...this.handoff,
      last_export:
        this.handoff.last_export === null
          ? null
          : { ...this.handoff.last_export },
    };
  }

  subscribeHandoff(listener: HandoffListener): () => void {
    this.handoffListeners.push(listener);

    return () => {
      this.handoffListeners = this.handoffListeners.filter(
        (entry) => entry !== listener,
      );
    };
  }

  completeDebugSession(): DebugCompletionResult {
    const metadata = this.sessionState.getMetadata();

    this.eventLogger.log({
      session_id: metadata.game_session_id,
      timestamp_ms: Date.now(),
      scene: 'runtime',
      event_type: 'objective_completed',
      ...this.buildContextFields(metadata),
    });

    // The debug completion is a completed session for the status axes too
    // (legacy Final Core / developer console path).
    this.status.markCompleted('terminal_room_reached');

    const summary = this.getSummary(true);
    const returnUrl = this.qualtricsBridge.buildReturnUrl(summary);
    const developerConsole = globalThis['console'];

    if (developerConsole !== undefined) {
      developerConsole.table(summary);

      if (returnUrl !== null) {
        // Preview ONLY — the debug completion never navigates; the
        // participant pipeline (completeParticipantSession) does.
        developerConsole.info('Qualtrics return URL:', returnUrl);
      }
    }

    // Fire-and-forget so the completion result stays synchronous.
    // submitSessionExport never rejects (every outcome is a typed result),
    // and it refuses immediately unless the launch mode may export.
    void this.submitSessionExport()
      .then((result) => {
        if (import.meta.env.DEV && developerConsole !== undefined) {
          developerConsole.info('[research-export]', result);
        }
      })
      // Belt-and-braces: a rejection here would surface as an unhandled
      // rejection and pollute DataQualityTracker's technical-error count.
      .catch(() => undefined);

    return { summary, returnUrl };
  }

  /**
   * Sends the session envelope to the ingestion endpoint once (no retry —
   * the developer/manual path). Transport results are debug information —
   * they are never logged as research events and never mutate raw events,
   * summaries, or data-quality metrics.
   */
  submitSessionExport(): Promise<ResearchExportResult> {
    // Separate envelope family from the participant pipeline: a developer
    // console completion never makes a later participant completion resend
    // its stale bytes (scientific review finding 6).
    return this.getExportClient()
      .submit({ attempts: 1, kind: 'debug' })
      .then((result) => {
        this.noteExportResult(result);

        return result;
      });
  }

  /**
   * The participant completion pipeline — PROVISIONAL(INT-1 / INT-2 /
   * INT-4 / INT-5). Idempotent: called once when the shift's terminal
   * state is reached; later calls return the same promise.
   *
   *   1. session_status → completed (terminal_room_reached);
   *   2. export the full envelope with bounded retry; on acknowledgement
   *      clear the device buffer for this identity;
   *   3. build the validated return URL (summary + status axes) and, when
   *      it passes policy, schedule automatic navigation (Option A); the
   *      participant may also continue immediately (Option D control).
   *      When the URL is absent or refused, nothing navigates and the
   *      notice keeps the participant informed (Option D fallback).
   *
   * A failed export never blocks the survey: the return URL then carries
   * `export_status=failed` and the events stay in the device buffer.
   */
  completeParticipantSession(): Promise<HandoffState> {
    if (this.completion !== null) {
      return this.completion;
    }

    this.completion = this.runCompletion().catch(() => {
      this.updateHandoff({ phase: 'blocked' });

      return this.getHandoffState();
    });

    return this.completion;
  }

  /**
   * Manual "continue to survey" (Option D control). Navigates immediately
   * when a validated return URL exists; returns whether navigation began.
   */
  continueToSurvey(): boolean {
    if (this.handoff.return_url === null || this.navigated) {
      return false;
    }

    if (this.handoff.phase !== 'settled' && this.handoff.phase !== 'blocked') {
      return false;
    }

    return this.navigateToSurvey();
  }

  /**
   * The participant chose to stay (closed the notice): automatic
   * navigation is withdrawn; the survey stays reachable through the
   * notice's continue control. Returns whether a scheduled navigation
   * was cancelled.
   */
  cancelAutoNavigate(): boolean {
    if (this.autoNavigateTimer === null) {
      return false;
    }

    clearTimeout(this.autoNavigateTimer);
    this.autoNavigateTimer = null;
    this.updateHandoff({ auto_navigate_at_ms: null });

    return true;
  }

  getLastExportResult(): ResearchExportResult | null {
    return this.exportClient?.getLastResult() ?? null;
  }

  /**
   * Losslessness evidence for the current identity: sequence continuity
   * across prior and current page loads plus the durable store's health.
   * Transport/integrity metadata only — never a research variable.
   */
  /** 1-based page-load counter of this identity (durable store). */
  getPageLoadIndex(): number {
    return this.pageLoadIndex;
  }

  getEventIntegrity(): EventIntegrity {
    return computeEventIntegrity({
      current: this.eventLogger.getEvents(),
      prior: this.priorPageLoadEvents,
      page_load_index: this.pageLoadIndex,
      durable_store: this.eventStore?.getHealth() ?? 'memory_only',
      durable_event_count: this.eventStore?.persistedCount() ?? 0,
      recovered_from_chunks: this.storeOpenFacts.recovered_from_chunks,
      foreign_records_rejected: this.storeOpenFacts.foreign_records_rejected,
      store_evictions: this.eventStore?.evictionCount() ?? 0,
    });
  }

  private async runCompletion(): Promise<HandoffState> {
    this.status.markCompleted('terminal_room_reached');
    this.updateHandoff({ phase: 'exporting' });

    const result = await this.getExportClient().submit({
      attempts: PARTICIPANT_EXPORT_ATTEMPTS,
      // Progress for the notice: the participant sees which attempt is in
      // flight instead of a frozen "sending…" for up to a minute.
      onAttempt: (attempt) => this.updateHandoff({ export_attempts: attempt }),
    });

    this.noteExportResult(result);

    // The device buffer is deliberately NOT cleared on acknowledgement:
    // clearing would drop the sequence high-water mark, so a later page
    // load of the same identity (e.g. Back from the survey) would restart
    // numbering at 1 and look lossless while missing everything before it
    // (scientific review finding 5). Count/age retention bounds the store
    // instead; the retention policy itself is open (report OD-4).

    // One derivation for both channels: the envelope summary and the
    // return-URL summary use the same status-derived `completed` flag, so
    // the survey record and the ingestion row can never disagree.
    const built = this.qualtricsBridge.buildValidatedReturnUrl(
      scopedSummaryForUrl(
        this.scopedSummary(
          this.status.snapshot().session_status === 'completed',
        ),
      ),
      this.returnUrlAxes(result),
    );

    if (built.validation.ok && built.url !== null) {
      // A failed export is never auto-navigated past: the participant
      // must see the "kept on this device" line and continue deliberately.
      const automatic = result.status !== 'failed';

      this.status.setReturnStatus('pending');
      this.updateHandoff({
        phase: 'settled',
        return_url: built.url,
        return_refusal: null,
        auto_navigate_at_ms: automatic
          ? Date.now() + this.autoNavigateDelayMs()
          : null,
      });

      if (automatic) {
        this.scheduleAutoNavigate();
      }
    } else {
      const refusal = built.validation.ok ? null : built.validation.reason;

      this.status.setReturnStatus(
        refusal === 'absent' ? 'not_applicable' : 'failed',
      );
      this.updateHandoff({
        phase: 'settled',
        return_url: null,
        return_refusal: refusal,
        auto_navigate_at_ms: null,
      });
    }

    return this.getHandoffState();
  }

  private noteExportResult(result: ResearchExportResult) {
    if (result.status === 'acknowledged') {
      this.status.setExportStatus('acknowledged');
    } else if (result.status === 'failed') {
      this.status.setExportStatus('failed');
    } else {
      this.status.setExportStatus('not_applicable');
    }

    this.updateHandoff({
      last_export: result,
      export_attempts: result.status === 'refused' ? 0 : result.attempts,
    });
  }

  /**
   * PROVISIONAL(INT-5 / OD-1): the status axes and the page-load index
   * ride on the return URL so the survey record can tell a completed
   * session, a failed export and a reloaded session apart.
   */
  private returnUrlAxes(
    result: ResearchExportResult,
  ): Record<string, string | number | boolean> {
    const axes = this.status.snapshot();

    return {
      launch_mode: axes.launch_mode,
      session_status: axes.session_status,
      completion_reason: axes.completion_reason ?? '',
      export_status: axes.export_status,
      return_status: 'returned',
      export_id:
        result.status === 'acknowledged'
          ? result.export_id
          : result.status === 'failed' && result.export_id !== null
            ? result.export_id
            : '',
      // Why nothing was sent, when nothing was (development launch, no
      // endpoint configured, no identity) — so `not_applicable` never
      // hides a misconfigured bundle.
      export_refusal: result.status === 'refused' ? result.reason : '',
      page_load_index: this.pageLoadIndex,
    };
  }

  private scheduleAutoNavigate() {
    if (this.autoNavigateTimer !== null) {
      clearTimeout(this.autoNavigateTimer);
    }

    this.autoNavigateTimer = setTimeout(() => {
      this.autoNavigateTimer = null;
      this.navigateToSurvey();
    }, this.autoNavigateDelayMs());
  }

  private navigateToSurvey(): boolean {
    const url = this.handoff.return_url;

    if (url === null || this.navigated || typeof window === 'undefined') {
      return false;
    }

    if (this.autoNavigateTimer !== null) {
      clearTimeout(this.autoNavigateTimer);
      this.autoNavigateTimer = null;
    }

    this.navigated = true;
    this.status.setReturnStatus('returned');
    this.updateHandoff({ phase: 'navigating', auto_navigate_at_ms: null });

    try {
      window.location.assign(url);

      return true;
    } catch {
      this.navigated = false;
      this.status.setReturnStatus('failed');
      this.updateHandoff({ phase: 'blocked' });

      return false;
    }
  }

  private autoNavigateDelayMs(): number {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const override = window.__researchExportConfig?.autoNavigateDelayMs;

      if (typeof override === 'number' && Number.isFinite(override)) {
        return Math.max(0, override);
      }
    }

    return AUTO_NAVIGATE_DELAY_MS;
  }

  private updateHandoff(patch: Partial<HandoffState>) {
    this.handoff = { ...this.handoff, ...patch };
    this.handoff.export_status = this.status.snapshot().export_status;
    this.handoff.return_status = this.status.snapshot().return_status;
    this.publishHandoff();
  }

  private publishHandoff() {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      window.__handoffProbe = this.getHandoffState();
    }

    for (const listener of this.handoffListeners) {
      try {
        listener(this.getHandoffState());
      } catch {
        // A listener failure must never break the pipeline.
      }
    }
  }

  /**
   * Early-exit signal (PROVISIONAL(INT-5) `incomplete`, OD-3): when the page
   * is hidden before the session reached a terminal state, a size-bounded
   * keep-alive export labelled `incomplete` / `participant_exit` is sent.
   * The label rides on that envelope only — the session's own status
   * machine is never moved by a page hide, because a backgrounded or
   * bfcache-restored tab is not an abandoned session and must still be
   * able to complete (scientific review finding 1). Pages restored from
   * the back/forward cache (`persisted`) are not exits at all. The full
   * event log stays in the device buffer.
   */
  private installPageHideExport() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('pagehide', (event) => {
      // Batched store writes are flushed synchronously before the page goes.
      this.eventStore?.flush();

      if (event.persisted || this.status.isTerminal()) {
        return;
      }

      this.getExportClient().submitKeepalive({
        session_status: 'incomplete',
        completion_reason: 'participant_exit',
      });
    });
  }

  private openEventStore(metadata: SessionMetadata) {
    try {
      const store = new DurableEventStore(
        {
          participant_id: metadata.participant_id,
          game_session_id: metadata.game_session_id,
          // PROVISIONAL(PS-2): a `launch_mode=test` dry run and a participant
          // launch of the same identity never share one buffer.
          launch_mode: this.launchMode,
        },
        undefined,
        Date.now,
        true,
      );
      const opened = store.open();

      this.eventStore = store;
      this.priorPageLoadEvents = opened.prior_page_load_events;
      this.pageLoadIndex = opened.page_load_index;
      this.storeOpenFacts = {
        recovered_from_chunks: opened.recovered_from_chunks,
        foreign_records_rejected: opened.foreign_records_rejected,
      };
      this.eventLogger.configureSequencing(
        opened.next_sequence,
        opened.page_load_index,
      );
      this.eventLogger.setSink((event) => store.append(event));
    } catch {
      // The store is a safety net; the in-memory log still runs unchanged.
      this.eventStore = null;
      this.priorPageLoadEvents = [];
      this.pageLoadIndex = 1;
    }
  }

  private getExportClient(): ResearchExportClient {
    if (this.exportClient === null) {
      this.exportClient = new ResearchExportClient({
        getContext: () => {
          const axes = this.status.snapshot();

          return {
            launch_mode: axes.launch_mode,
            export_allowed: exportAllowed(
              axes.launch_mode,
              import.meta.env.DEV,
              allowProductionInDev(),
            ),
            session_status: axes.session_status,
            completion_reason: axes.completion_reason,
          };
        },
        getConfig: resolveExportConfig,
        getSessionIdentity: () => {
          const metadata = this.sessionState.getMetadata();

          return {
            participant_id: metadata.participant_id,
            game_session_id: metadata.game_session_id,
            page_load_index: this.pageLoadIndex,
            last_sequence: this.eventLogger.getNextSequence() - 1,
          };
        },
        buildPayload: () => this.buildExportPayload(),
      });
    }

    return this.exportClient;
  }

  /**
   * Assembles the export payload exclusively from existing instrumentation
   * (read-only copies) — nothing here invents scoring values or mutates
   * the append-only raw event log.
   */
  private buildExportPayload(): ResearchExportPayload {
    const metadata = this.sessionState.getMetadata();
    // Station 080 M01–M26 (Unit 1, review 15): the augmenter runs ONCE per
    // payload build (it extracts every register feature from the whole
    // log) and a failure is counted as a technical error BEFORE the
    // data-quality metrics are read, so a lost augmentation is recorded
    // in the very payload that lacks it.
    const augmented = this.augmented();
    const dataQuality = this.dataQualityTracker.getMetrics();
    const completed = this.status.snapshot().session_status === 'completed';

    const scoped = this.scopedSummary(completed, augmented);

    return {
      export_schema_version: EXPORT_SCHEMA_VERSION,
      game_version: metadata.game_version,
      asset_set_version: ASSET_SET_VERSION,
      // Absent is never zero: a field the active route cannot offer, or
      // that was not observed, is null with an explicit disposition.
      summary: scoped.summary,
      summary_dispositions: scoped.summary_dispositions,
      summary_scope: scoped.summary_scope,
      summary_scope_version: scoped.summary_scope_version,
      raw_events: this.eventLogger.getEvents(),
      data_quality: dataQuality,
      technical_errors: {
        technical_error_count: dataQuality.technical_error_count,
      },
      // Pilot V3 (Unit 1) — additive losslessness fields, PROVISIONAL(INT-2
      // / P0-3 / P1-9). Prior-page-load events are carried SEPARATELY from
      // raw_events so the summary (which reads raw_events only) never
      // double-counts a restarted page load.
      page_load_index: this.pageLoadIndex,
      prior_page_load_events: this.priorPageLoadEvents.map((event) => ({
        ...event,
      })),
      event_integrity: this.getEventIntegrity(),
      // Pilot V3 (Unit 2) — PROVISIONAL(INT-2): reproducibility context.
      mission_state: this.sessionState.getMissionState(),
      environment: { prefers_reduced_motion: readReducedMotion() },
      // Audit 2026-09 B2 — PROVISIONAL: opportunity/validity dispositions
      // and pilot coverage, exported in production too (previously DEV
      // window probes only, dying with the tab). Explicit fields — never
      // a spread — so an augmenter can never override a payload key; and
      // an augmenter failure must never break an export (missing
      // dispositions are recoverable from raw events, a lost export is
      // not).
      measurement_validity: augmented?.measurement_validity,
      pilot_coverage: augmented?.pilot_coverage,
      // Station 080 M01–M26 (Unit 1) — PROVISIONAL, additive, read-only.
      measurement_protocol: augmented?.measurement_protocol,
      measurement_features: augmented?.measurement_features,
    };
  }

  /**
   * The scoring-plan summary masked at the export boundary
   * (SummaryScope.ts). `getSummary()` itself stays numeric.
   */
  private scopedSummary(
    completed: boolean,
    augmented: ReturnType<ExportAugmenter> | undefined = this.augmented(),
  ) {
    const status = this.status.snapshot().session_status;

    return applySummaryScope({
      summary: this.getSummary(completed),
      scope: augmented?.summary_scope ?? null,
      eventTypes: this.eventLogger.getEvents().map((event) => event.event_type),
      terminal: status === 'completed' || status === 'error',
      reloaded: this.pageLoadIndex > 1,
    });
  }

  private augmented(): ReturnType<ExportAugmenter> | undefined {
    try {
      return exportAugmenter?.() ?? undefined;
    } catch {
      // Never break an export; the loss is recorded as a technical error
      // (count only, never content) so it is visible in the payload.
      this.dataQualityTracker.recordTechnicalError();

      return undefined;
    }
  }

  private installDeveloperHelper() {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    window.researchRuntime = {
      completeDebugSession: () => this.completeDebugSession(),
      exportEventsJSON: () => this.exportEventsJSON(),
      // Additive (Pilot V3 Unit 1): losslessness probe — sequence
      // continuity and durable-store health for runtime verification.
      getEventIntegrity: () => this.getEventIntegrity(),
      getEvents: () => this.getEvents(),
      // Additive (Pilot V3 Unit 2): handoff/transport probe.
      getHandoffState: () => this.getHandoffState(),
      // Additive (test-only ingestion unit): transport-status probe for the
      // development export path. Debug info only — never research data.
      getLastExportResult: () => this.getLastExportResult(),
      // Additive (Wave 1B): read-only mission-state probe for runtime
      // verification — returns SessionState's defensive copy, so console/
      // test code can never mutate live mission state through it. The six
      // baseline methods above are unchanged (baseline-e8a8994 invariant
      // is a minimum surface, additive extension is allowed dev-only).
      getMissionState: () => this.sessionState.getMissionState(),
      // Additive (Pilot V3 Unit 2): PROVISIONAL(INT-5) status axes.
      getSessionStatus: () => this.getSessionStatus(),
      getSummary: () => this.getSummary(),
      printEvents: () => this.printEvents(),
      printSummary: () => this.printSummary(),
      // Additive (test-only ingestion unit): manual retry entry point for
      // the export — reuses the frozen envelope/export_id.
      submitSessionExport: () => this.submitSessionExport(),
    };
  }
}

function idleHandoff(): HandoffState {
  return {
    phase: 'idle',
    export_status: 'pending',
    export_attempts: 0,
    last_export: null,
    return_status: 'pending',
    return_refusal: null,
    return_url: null,
    auto_navigate_at_ms: null,
  };
}

/**
 * Client-side launch-mode source (PROVISIONAL(INT-5 / PS-2)): read
 * straight from the launch URL, like the other Qualtrics launch params.
 */
function readLaunchMode(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return new URLSearchParams(window.location.search).get(LAUNCH_MODE_PARAM);
}

function allowProductionInDev(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.__researchExportConfig?.allowProductionInDev === true
  );
}

/**
 * Environment control (V2 report U8-3): whether the participant's browser
 * asked for reduced motion, which changes the rendered stimulus of the
 * measured exterior windows. Recorded once so it can be modelled; null when
 * the media query is unavailable.
 */
function readReducedMotion(): boolean | null {
  try {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return null;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return null;
  }
}

function resolveExportConfig(): ResearchExportConfig {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const override = window.__researchExportConfig;

    if (override !== undefined) {
      return {
        ingestUrl: override.ingestUrl,
        publishableKey: override.publishableKey,
        timeoutMs: override.timeoutMs,
      };
    }
  }

  return {
    ingestUrl: import.meta.env.VITE_RESEARCH_INGEST_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export const researchRuntime = new ResearchRuntime();
