import { ASSET_SET_VERSION } from '../constants';
import { DataQualityTracker } from './DataQualityTracker';
import type { RawGameEvent } from './EventLogger';
import { EventLogger } from './EventLogger';
import { QualtricsBridge } from './QualtricsBridge';
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

interface DebugCompletionResult {
  summary: GameSummaryVariables;
  returnUrl: string | null;
}

declare global {
  interface Window {
    researchRuntime?: {
      completeDebugSession: () => DebugCompletionResult;
      exportEventsJSON: () => string;
      getEvents: () => RawGameEvent[];
      getLastExportResult: () => ResearchExportResult | null;
      getMissionState: () => ReturnType<SessionState['getMissionState']>;
      getSummary: () => GameSummaryVariables;
      printEvents: () => RawGameEvent[];
      printSummary: () => GameSummaryVariables;
      submitSessionExport: () => Promise<ResearchExportResult>;
    };
    /**
     * DEV-only test hook: lets browser tests inject the ingest URL/key for
     * the test-mode exporter without placing values in tracked env files.
     * Ignored entirely outside `import.meta.env.DEV`.
     */
    __researchExportConfig?: {
      ingestUrl?: string;
      publishableKey?: string;
      timeoutMs?: number;
    };
  }
}

class ResearchRuntime {
  readonly dataQualityTracker = new DataQualityTracker();
  readonly eventLogger = new EventLogger();
  readonly qualtricsBridge = new QualtricsBridge();
  readonly sessionState = new SessionState();

  private exportClient: ResearchExportClient | null = null;
  private hasStarted = false;

  start() {
    if (this.hasStarted) {
      return;
    }

    this.hasStarted = true;
    this.dataQualityTracker.start();

    const metadata = this.sessionState.getMetadata();

    this.eventLogger.log({
      session_id: metadata.game_session_id,
      timestamp_ms: metadata.started_at_ms,
      scene: 'runtime',
      event_type: 'session_start',
      ...this.buildContextFields(metadata),
    });

    this.installDeveloperHelper();
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

  completeDebugSession(): DebugCompletionResult {
    const metadata = this.sessionState.getMetadata();

    this.eventLogger.log({
      session_id: metadata.game_session_id,
      timestamp_ms: Date.now(),
      scene: 'runtime',
      event_type: 'objective_completed',
      ...this.buildContextFields(metadata),
    });

    const summary = this.getSummary(true);
    const returnUrl = this.qualtricsBridge.buildReturnUrl(summary);
    const developerConsole = globalThis['console'];

    if (developerConsole !== undefined) {
      developerConsole.table(summary);

      if (returnUrl !== null) {
        // Preview ONLY — this unit never navigates to the Qualtrics return
        // URL; the final redirect remains a separate, unimplemented unit.
        developerConsole.info('Qualtrics return URL:', returnUrl);
      }
    }

    // Test-only ingestion hook (development endpoint unit): fire-and-forget
    // so the completion result stays synchronous. submitSessionExport never
    // rejects (every outcome is a typed result), and it refuses immediately
    // unless the session was launched with launch_mode=test, so ordinary
    // debug completions and participant sessions never touch the network.
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
   * Sends the completed synthetic session to the development ingestion
   * endpoint. Test-only by construction: production builds refuse before
   * the client is even constructed, and the client itself refuses unless
   * the launch mode is exactly `test`. Transport results are debug
   * information — they are never logged as research events (INT-5
   * `export_status` is an open decision) and never mutate raw events,
   * summaries, or data-quality metrics.
   */
  submitSessionExport(): Promise<ResearchExportResult> {
    if (!import.meta.env.DEV) {
      return Promise.resolve({
        status: 'refused',
        reason: 'not_development_build',
      });
    }

    return this.getExportClient().submit();
  }

  getLastExportResult(): ResearchExportResult | null {
    return this.exportClient?.getLastResult() ?? null;
  }

  private getExportClient(): ResearchExportClient {
    if (this.exportClient === null) {
      this.exportClient = new ResearchExportClient({
        getLaunchMode: readLaunchMode,
        getConfig: resolveExportConfig,
        getSessionIdentity: () => {
          const metadata = this.sessionState.getMetadata();

          return {
            participant_id: metadata.participant_id,
            game_session_id: metadata.game_session_id,
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
    const dataQuality = this.dataQualityTracker.getMetrics();

    return {
      game_version: metadata.game_version,
      asset_set_version: ASSET_SET_VERSION,
      summary: this.getSummary(true),
      raw_events: this.eventLogger.getEvents(),
      data_quality: dataQuality,
      technical_errors: {
        technical_error_count: dataQuality.technical_error_count,
      },
    };
  }

  private installDeveloperHelper() {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    window.researchRuntime = {
      completeDebugSession: () => this.completeDebugSession(),
      exportEventsJSON: () => this.exportEventsJSON(),
      getEvents: () => this.getEvents(),
      // Additive (test-only ingestion unit): transport-status probe for the
      // development export path. Debug info only — never research data.
      getLastExportResult: () => this.getLastExportResult(),
      // Additive (Wave 1B): read-only mission-state probe for runtime
      // verification — returns SessionState's defensive copy, so console/
      // test code can never mutate live mission state through it. The six
      // baseline methods above are unchanged (baseline-e8a8994 invariant
      // is a minimum surface, additive extension is allowed dev-only).
      getMissionState: () => this.sessionState.getMissionState(),
      getSummary: () => this.getSummary(),
      printEvents: () => this.printEvents(),
      printSummary: () => this.printSummary(),
      // Additive (test-only ingestion unit): manual retry entry point for
      // the development export — reuses the frozen envelope/export_id.
      submitSessionExport: () => this.submitSessionExport(),
    };
  }
}

/**
 * Client-side launch-mode source (INT-5 `launch_mode` dimension): read
 * straight from the launch URL, like the other Qualtrics launch params.
 * Only the exact value `test` ever enables the development exporter.
 */
function readLaunchMode(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return new URLSearchParams(window.location.search).get('launch_mode');
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
