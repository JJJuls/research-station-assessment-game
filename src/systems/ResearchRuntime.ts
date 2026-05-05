import { DataQualityTracker } from './DataQualityTracker';
import { EventLogger } from './EventLogger';
import { QualtricsBridge } from './QualtricsBridge';
import type { GameSummaryVariables } from './ScoringManager';
import { computeSummary } from './ScoringManager';
import { SessionState } from './SessionState';

declare global {
  interface Window {
    researchRuntime?: {
      getSummary: () => GameSummaryVariables;
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
    x?: number;
    y?: number;
    state_before?: string;
    state_after?: string;
  }) {
    const metadata = this.sessionState.getMetadata();

    this.eventLogger.log({
      session_id: metadata.game_session_id,
      timestamp_ms: Date.now(),
      event_type: 'interaction',
      ...event,
    });
  }

  getSummary() {
    return computeSummary({
      metadata: this.sessionState.getMetadata(),
      elapsed_seconds: this.sessionState.getElapsedSeconds(),
      events: this.eventLogger.getEvents(),
      data_quality: this.dataQualityTracker.getMetrics(),
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

  private installDeveloperHelper() {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    window.researchRuntime = {
      getSummary: () => this.getSummary(),
      printSummary: () => this.printSummary(),
    };
  }
}

export const researchRuntime = new ResearchRuntime();
