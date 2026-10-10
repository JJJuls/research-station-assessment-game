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
import { closeM13AtReview } from '../../informationProcessing/m13PipeNetwork';
import { closeExteriorWindowsAtReview } from './exteriorWindows';
import { closeM01AtReview } from './m01PlanBoard';
import { closeM02CAtReview } from './m02CaseWorkspace';
import { closeM03TAtReview } from './m03ToolRestore';
import { closeM04AtReview } from './m04Debris';
import { closeM05AtReview } from './m05Initiation';
import { closeM06AtReview } from './m06RoutineDispatch';
import { closeM07AtReview } from './m07Calibration';
import { closeM08AtReview } from './m08EffortChoice';
import { closeM09AtReview } from './m09MonitorWatch';
import { closeM10AtReview } from './m10ComponentPromise';
import { closeM11AtReview } from './m11Custody';
import { closeM12AtReview } from './m12QualityControl';
import { closeM14AtReview } from './m14IncidentDesk';
import { closeM15AtReview } from './m15RelayBench';
import { closeM25BeliefAtReview, closeM25LoopsAtReview } from './m25Repetition';
import {
  closeM20ResumeAtReview,
  closeM21AtReview,
  closeM22AtReview,
  closeM25AtReview,
} from './returnWindows';

/** Closes every episode 1-5 window at the review (idempotent). */
export function closeEpisodeWindowsAtReview(nowMs: number) {
  // Station 080 M01 (Unit 5): a batch whose first job press snapshotted
  // the board is a complete observation; one left before any job press
  // censors; never opened → absent.
  closeM01AtReview(nowMs);
  // Station 080 M02 (Unit 13): an open workspace closes with the answers
  // as they stand (unanswered requests stay missing; never handed over →
  // no request); never opened → absent.
  closeM02CAtReview(nowMs);
  // Station 080 M03 (Unit 14): a press occasion is observed at its first
  // departure (the panel's close); one whose run was never completed has
  // no tools and no observation → absent.
  closeM03TAtReview(nowMs);
  // Station 080 M04 (Unit 14): a job still awaiting its first departure
  // had none — censored, its state kept apart; a job never run → absent.
  closeM04AtReview(nowMs);
  closeM05AtReview('o1', nowMs);
  closeM05AtReview('o2', nowMs);
  // Station 080 M06 (Unit 7): an open work period censors with the count
  // as it stands; never opened → absent.
  closeM06AtReview(nowMs);
  closeM07AtReview(nowMs);
  // Station 080 M08 (Unit 2): the support console (never opened → absent;
  // open → censored; slots without an explicit choice stay missing).
  closeM08AtReview(nowMs);
  // Station 080 M09 (Unit 15): a check still open is censored and the duty
  // ends with the checks reached; an unanswered offer closes as such;
  // never offered → absent.
  closeM09AtReview(nowMs);
  // Station 080 M10 (Unit 15): the review IS both deliveries' deadline —
  // one still carried closes unfulfilled (a completed observation); an
  // unanswered offer closes as such; never offered → absent.
  closeM10AtReview(nowMs);
  // Station 080 M11 (Unit 3): never offered → absent; accepted and never
  // departed → unresolved at review; declined / resolved already closed.
  closeM11AtReview(nowMs);
  // Station 080 M12 (Unit 8): a released packet is already closed; an
  // open packet is censored (no release, no observation); never opened →
  // absent.
  closeM12AtReview(nowMs);
  // Station 080 M13 (Unit 16): a series still in its first-response phase
  // closes with the answers as they stand (unanswered networks stay
  // missing); a completed scored phase is not reclosed — only an open
  // practice ends; never opened → left to the generic coverage closure.
  closeM13AtReview(nowMs);
  // Station 080 M14 (Unit 17): a series still in its orientation or
  // first-response phase closes with the answers as they stand (unanswered
  // decisions stay missing, no results follow); a completed series is not
  // reclosed; never opened → absent (`briefed_not_opened` when the briefing
  // was acknowledged, never `declined` — decision D-U17-1, item 6).
  closeM14AtReview(nowMs);
  // Station 080 M15 (Unit 18): a series still in its orientation,
  // exploration, wiring or question phase closes with the wirings and
  // answers as they stand (unanswered questions stay missing, no results
  // follow); a completed series is not reclosed; never opened → absent
  // (`briefed_not_opened` when Kai's briefing was acknowledged, never
  // `declined` — decision D-U18-1, item 5).
  closeM15AtReview(nowMs);
  // Episode 5 (Unit 5): a PRESENTED M20 resume opportunity closes as a
  // completed observation (returned / completion as they stand) BEFORE
  // the exterior closure, which censors only a never-resumed start.
  closeM20ResumeAtReview(nowMs);
  // Episode 4 (Unit 4): M19 / M23 / M24 / M26 close with their honest
  // dispositions; a still-open M20 start window censors.
  closeExteriorWindowsAtReview(nowMs);
  // Station 080 M25 (Unit 4): an open post censors, a never-opened one is
  // absent; a never-asked question is absent (not exposed, or never
  // reached Vale's check-in), an asked-unanswered one censors.
  closeM25LoopsAtReview(nowMs);
  closeM25BeliefAtReview(nowMs);
  closeM21AtReview(nowMs);
  closeM22AtReview(nowMs);
  // The v2 questionnaire notice keeps its own presentation record.
  closeM25AtReview(nowMs);
}
