import type { GameSummaryVariables } from './ScoringManager';

export interface QualtricsLaunchParams {
  participant_id: string | null;
  game_session_id: string | null;
  condition: string | null;
  return_url: string | null;
  game_version: string | null;
}

export class QualtricsBridge {
  private launchParams: QualtricsLaunchParams;

  constructor(searchParams = getCurrentSearchParams()) {
    this.launchParams = {
      participant_id: searchParams.get('participant_id'),
      game_session_id: searchParams.get('game_session_id'),
      condition: searchParams.get('condition'),
      return_url: searchParams.get('return_url'),
      game_version: searchParams.get('game_version'),
    };
  }

  getLaunchParams() {
    return { ...this.launchParams };
  }

  buildReturnUrl(summaryVariables: GameSummaryVariables) {
    const { return_url: returnUrl } = this.launchParams;

    if (returnUrl === null || returnUrl.trim() === '') {
      return null;
    }

    try {
      const url = new URL(returnUrl, getCurrentHref());

      for (const [key, value] of Object.entries(summaryVariables)) {
        url.searchParams.set(key, String(value));
      }

      return url.toString();
    } catch {
      return null;
    }
  }
}

function getCurrentSearchParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function getCurrentHref() {
  if (typeof window === 'undefined') {
    return 'http://localhost/';
  }

  return window.location.href;
}
