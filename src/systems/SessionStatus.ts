/**
 * Session status axes — PROVISIONAL(INT-5), Pilot V3 Unit 2.
 *
 * Implements decision-pack Model B (orthogonal dimensions,
 * `docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md` §5.2–5.3) as the
 * recorded, NOT-YET-AUTHORISED recommendation. Every axis is additive
 * metadata on the export envelope and the return URL; none is a research
 * variable, none is written into the raw event log, and the research owner
 * can rename or collapse any axis on the ruling form without touching raw
 * events.
 *
 * Deliberately NOT modelled (pack §5.2 item 6): `abandoned` — it needs a
 * study-supplied inactivity rule and is not invented here.
 *
 * Pure and Node-importable.
 */

export type LaunchMode = 'production' | 'test' | 'development';

export type SessionStatus =
  | 'in_progress'
  | 'completed'
  | 'incomplete'
  | 'error';

export type CompletionReason =
  | 'terminal_room_reached'
  | 'participant_exit'
  | 'technical_error';

export type ExportStatus =
  | 'pending'
  | 'acknowledged'
  | 'failed'
  | 'not_applicable';

export type ReturnStatus = 'pending' | 'returned' | 'failed' | 'not_applicable';

export interface SessionStatusAxes {
  launch_mode: LaunchMode;
  session_status: SessionStatus;
  completion_reason: CompletionReason | null;
  export_status: ExportStatus;
  return_status: ReturnStatus;
}

export const LAUNCH_MODE_PARAM = 'launch_mode';

/**
 * Resolves the launch-mode axis from the launch URL value —
 * PROVISIONAL(PS-2): `test` is the only explicit test signal; anything
 * else means `production` in a participant bundle and `development` in a
 * DEV build. The raw value is kept alongside so a typo (`launch_mode=tset`)
 * is auditable in the export rather than silently becoming production data.
 */
export function resolveLaunchMode(
  rawValue: string | null,
  isDevBuild: boolean,
): { launch_mode: LaunchMode; launch_mode_raw: string | null } {
  const trimmed = rawValue === null ? null : rawValue.trim();

  if (trimmed === 'test') {
    return { launch_mode: 'test', launch_mode_raw: trimmed };
  }

  if (trimmed === 'production') {
    return { launch_mode: 'production', launch_mode_raw: trimmed };
  }

  return {
    launch_mode: isDevBuild ? 'development' : 'production',
    launch_mode_raw: trimmed === '' ? null : trimmed,
  };
}

/**
 * Whether a session in this launch mode may submit to the ingestion
 * endpoint. `test` always may (DEV or bundle); `production` only from a
 * participant bundle unless a DEV test hook explicitly opts in (so a
 * developer's `.env.local` can never produce a production row by accident);
 * `development` never does.
 */
export function exportAllowed(
  launchMode: LaunchMode,
  isDevBuild: boolean,
  allowProductionInDev = false,
): boolean {
  if (launchMode === 'test') {
    return true;
  }

  if (launchMode === 'production') {
    return !isDevBuild || allowProductionInDev;
  }

  return false;
}

const SESSION_TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  in_progress: ['completed', 'incomplete', 'error'],
  completed: [],
  incomplete: [],
  error: [],
};

const EXPORT_TRANSITIONS: Record<ExportStatus, readonly ExportStatus[]> = {
  pending: ['acknowledged', 'failed', 'not_applicable'],
  failed: ['pending', 'acknowledged', 'failed'],
  acknowledged: [],
  not_applicable: [],
};

const RETURN_TRANSITIONS: Record<ReturnStatus, readonly ReturnStatus[]> = {
  pending: ['returned', 'failed', 'not_applicable'],
  failed: ['pending', 'returned', 'failed'],
  returned: [],
  not_applicable: [],
};

/**
 * Small state machine over the five axes. Every mutator returns whether
 * the transition was valid; invalid transitions are ignored (never thrown)
 * so status bookkeeping can never break gameplay or the export.
 */
export class SessionStatusMachine {
  private axes: SessionStatusAxes;

  constructor(launchMode: LaunchMode) {
    this.axes = {
      launch_mode: launchMode,
      session_status: 'in_progress',
      completion_reason: null,
      export_status: 'pending',
      return_status: 'pending',
    };
  }

  snapshot(): SessionStatusAxes {
    return { ...this.axes };
  }

  isTerminal(): boolean {
    return this.axes.session_status !== 'in_progress';
  }

  markCompleted(reason: CompletionReason = 'terminal_room_reached'): boolean {
    return this.transitionSession('completed', reason);
  }

  markIncomplete(reason: CompletionReason = 'participant_exit'): boolean {
    return this.transitionSession('incomplete', reason);
  }

  markError(): boolean {
    return this.transitionSession('error', 'technical_error');
  }

  setExportStatus(next: ExportStatus): boolean {
    if (!EXPORT_TRANSITIONS[this.axes.export_status].includes(next)) {
      return false;
    }

    this.axes.export_status = next;

    return true;
  }

  setReturnStatus(next: ReturnStatus): boolean {
    if (!RETURN_TRANSITIONS[this.axes.return_status].includes(next)) {
      return false;
    }

    this.axes.return_status = next;

    return true;
  }

  private transitionSession(
    next: SessionStatus,
    reason: CompletionReason,
  ): boolean {
    if (!SESSION_TRANSITIONS[this.axes.session_status].includes(next)) {
      return false;
    }

    this.axes.session_status = next;
    this.axes.completion_reason = reason;

    return true;
  }
}
