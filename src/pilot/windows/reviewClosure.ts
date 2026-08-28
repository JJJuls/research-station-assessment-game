/**
 * Review closure — explicit terminal closure of the evidence-led pilot v2
 * item windows at the Utility Deck shift review (Unit 2+).
 *
 * Every window that is still open closes as `closed_at_review` (censored /
 * completed-observation per the module's own rule); every window that was
 * never presented/opened records absence. Missing and invalid are never
 * low values. The generic `PILOT_SCHEDULE` closure that follows this call
 * (`closePilotCoverageAtFinalCore`) never overwrites a terminal record.
 */
import { m01Window } from './m01PlanBoard';
import { closeM02CPanel, m02cWindow } from './m02CaseWorkspace';
import { closeM04AtReview } from './m04Debris';
import { closeM05AtReview } from './m05Initiation';
import { m06Window } from './m06RoutineDispatch';
import { closeM07AtReview } from './m07Calibration';
import { closeM09AtReview } from './m09MonitorWatch';
import { closeM10AtReview } from './m10ComponentPromise';
import { m12Windows } from './m12QualityControl';
import { m14Window } from './m14IncidentDesk';
import type { ItemWindow } from './windowKit';

function closeSurfaceWindow(window: ItemWindow, nowMs: number, detail: string) {
  if (window.windowStatus() === 'unopened') {
    window.markAbsent(detail);
  } else if (window.isOpen()) {
    window.stop(nowMs, 'closed_at_review', {}, 'system', 'censored');
  }
}

/** Closes every episode 1-2 window at the review (idempotent). */
export function closeEpisodeWindowsAtReview(nowMs: number) {
  closeSurfaceWindow(
    m01Window,
    nowMs,
    'plan board never opened before the review',
  );
  closeM02CPanel(nowMs);
  closeSurfaceWindow(
    m02cWindow,
    nowMs,
    'case workspace never opened before the review',
  );
  closeM04AtReview(nowMs);
  closeM05AtReview('o1', nowMs);
  closeM05AtReview('o2', nowMs);
  closeSurfaceWindow(
    m06Window,
    nowMs,
    'dispatch console never opened before the review',
  );
  closeM07AtReview(nowMs);
  closeM09AtReview(nowMs);
  closeM10AtReview(nowMs);
  closeSurfaceWindow(
    m12Windows.o1,
    nowMs,
    'quality packet 1 never opened before the review',
  );
  closeSurfaceWindow(
    m12Windows.o2,
    nowMs,
    'quality packet 2 never opened before the review',
  );
  closeSurfaceWindow(
    m14Window,
    nowMs,
    'incident desk never opened before the review',
  );
}
