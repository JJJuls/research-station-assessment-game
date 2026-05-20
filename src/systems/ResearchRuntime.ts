import { DataQualityTracker } from './DataQualityTracker';
import type { RawGameEvent } from './EventLogger';
import { EventLogger } from './EventLogger';
import { QualtricsBridge } from './QualtricsBridge';
import type { GameSummaryVariables } from './ScoringManager';
import { computeSummary } from './ScoringManager';
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
      getSummary: () => GameSummaryVariables;
      printEvents: () => RawGameEvent[];
      printSummary: () => GameSummaryVariables;
    };
  }
}

class ResearchRuntime {
  readonly dataQualityTracker = new DataQualityTracker();
  readonly eventLogger = new EventLogger();
  readonly qualtricsBridge = new QualtricsBridge();
  readonly sessionState = new SessionState();

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
  }) {
    const metadata = this.sessionState.getMetadata();

    this.eventLogger.log({
      session_id: metadata.game_session_id,
      timestamp_ms: Date.now(),
      event_type: 'interaction',
      ...event,
    });
  }

  getSummary(completed = false) {
    return computeSummary({
      metadata: this.sessionState.getMetadata(),
      elapsed_seconds: this.sessionState.getElapsedSeconds(),
      completed,
      events: this.eventLogger.getEvents(),
    });
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
    });

    const summary = this.getSummary(true);
    const returnUrl = this.qualtricsBridge.buildReturnUrl(summary);
    const developerConsole = globalThis['console'];

    if (developerConsole !== undefined) {
      developerConsole.table(summary);

      if (returnUrl !== null) {
        developerConsole.info('Qualtrics return URL:', returnUrl);
      }
    }

    return { summary, returnUrl };
  }

  private installDeveloperHelper() {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    window.researchRuntime = {
      completeDebugSession: () => this.completeDebugSession(),
      exportEventsJSON: () => this.exportEventsJSON(),
      getEvents: () => this.getEvents(),
      getSummary: () => this.getSummary(),
      printEvents: () => this.printEvents(),
      printSummary: () => this.printSummary(),
    };
  }
}

export const researchRuntime = new ResearchRuntime();
