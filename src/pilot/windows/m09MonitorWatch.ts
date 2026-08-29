/**
 * M09 — Monitor watch with two scheduled gauge checks (evidence-led pilot
 * v2, Unit 2).
 *
 * Ledger (sheet 09): voluntarily accept a monitor watch with two scheduled
 * gauge checks at fixed route milestones, equal reminders and guaranteed
 * access; failures are distinguished from invalid presentation.
 *
 * Mechanic: Vale offers the watch at the incident handover (explicit
 * accept/decline — the offer is presented to everyone). Accepting
 * registers ONE obligation with two due windows on the Concourse monitor
 * gauge:
 *   check 1 — due before the participant first leaves the Concourse for
 *             the workshop (window: acceptance → first west-door exit);
 *   check 2 — due on the return (window: return_hub stage → the shift
 *             review on the deck).
 * Both checks use the same gauge, the same reminder (one mission-log line
 * and one neutral Vale mention), and the gauge is always reachable. A
 * check window that closes without a reading is a COMPLETED observation
 * (check_completed=false) — the opportunity was validly presented; only a
 * never-presented window is missing.
 *
 * Raw components: check1_completed, check2_completed, due_delta_1,
 * due_delta_2 (ms from the window's due milestone to the reading; null
 * when not read), reminder_exposure (log opened / Vale mention while due).
 */
import { registerMissionLogEntry } from '../pilotRoute';
import { phaseMetadata } from '../return/returnEpisodeModel';
import { type InputMode, ItemWindow } from './windowKit';

export const M09_OPPORTUNITY_ID = 'proto_m09_monitor_watch';
export const M09_ENTRY_STATE_VERSION = 'm09-monitor-watch-v1';
export const M09_FAMILY = 'proto_m09_watch_';
export const M09_WINDOW_IDS = {
  check1: 'm09_check_1',
  check2: 'm09_check_2',
} as const;

export type M09Check = 'check1' | 'check2';

interface M09CheckState {
  dueAtMs: number | null;
  readAtMs: number | null;
  closedAtMs: number | null;
  reminderLogViews: number;
  reminderNpcMentions: number;
}

interface M09State {
  offered: boolean;
  accepted: boolean | null;
  acceptedAtMs: number | null;
  checks: Record<M09Check, M09CheckState>;
  gaugeReadings: number;
}

function initialCheck(): M09CheckState {
  return {
    dueAtMs: null,
    readAtMs: null,
    closedAtMs: null,
    reminderLogViews: 0,
    reminderNpcMentions: 0,
  };
}

let state: M09State = {
  offered: false,
  accepted: null,
  acceptedAtMs: null,
  checks: { check1: initialCheck(), check2: initialCheck() },
  gaugeReadings: 0,
};

export const m09Window = new ItemWindow({
  item: 'M09',
  opportunityId: M09_OPPORTUNITY_ID,
  windowId: 'm09_monitor_watch',
  entryStateVersion: M09_ENTRY_STATE_VERSION,
  family: M09_FAMILY,
  scene: 'station_concourse',
  objectId: 'm09_monitor_gauge',
});

export function declareM09() {
  m09Window.declare();
}

/**
 * Unit 5: check events carry their phase (check 1 = start, check 2 = end)
 * and BOTH ledger window ids, so the two scheduled checks stay traceably
 * linked while each keeps its own window id and never shares a raw event.
 */
function checkPhase(check: M09Check) {
  return phaseMetadata('M09', check === 'check1' ? 'start' : 'end');
}

export function m09State(): Readonly<M09State> {
  return state;
}

/** The watch offer was presented (Vale's beat). */
export function presentM09Offer(nowMs: number) {
  declareM09();

  if (!state.offered) {
    state.offered = true;
    m09Window.present(nowMs, { offer: 'monitor_watch', checks: 2 });
  }
}

/** Explicit acceptance/decline (voluntary; declining is a valid observation). */
export function answerM09Offer(
  accepted: boolean,
  nowMs: number,
  inputMode: InputMode,
) {
  presentM09Offer(nowMs);

  if (state.accepted !== null) {
    return;
  }

  state.accepted = accepted;
  state.acceptedAtMs = nowMs;

  if (accepted) {
    // Phase 1 (check 1) owns the window id from acceptance; phase 2 takes
    // over at the return milestone (`openM09Check2`).
    m09Window.spec.windowId = M09_WINDOW_IDS.check1;
    m09Window.open(nowMs, { accepted: true });
    // Check 1 is due from acceptance (before leaving the Concourse); the
    // offer line itself is its one NPC mention (equal to check 2's).
    state.checks.check1.dueAtMs = nowMs;
    state.checks.check1.reminderNpcMentions += 1;
    m09Window.log('check_window_opened', {
      check: 'check1',
      window_id: M09_WINDOW_IDS.check1,
      ...checkPhase('check1'),
      input_mode: 'system',
    });
    registerMissionLogEntry({
      id: 'm09_check1',
      kind: 'obligation',
      order: 10,
      text: () =>
        'Monitor watch: read the gauge before you leave the Concourse.',
      isClosed: () => state.checks.check1.closedAtMs !== null,
    });
    registerMissionLogEntry({
      id: 'm09_check2',
      kind: 'obligation',
      order: 11,
      text: () =>
        'Monitor watch: read the gauge again when you are back inside.',
      isClosed: () =>
        state.checks.check2.dueAtMs === null ||
        state.checks.check2.closedAtMs !== null,
    });
  } else {
    m09Window.open(nowMs, { accepted: false });
    m09Window.complete(
      nowMs,
      {
        accepted: false,
        check1_completed: null,
        check2_completed: null,
        due_delta_1: null,
        due_delta_2: null,
        reminder_exposure: { check1: 0, check2: 0 },
      },
      inputMode,
    );
  }

  m09Window.log('offer_answered', { accepted, input_mode: inputMode });
}

export function m09Accepted(): boolean {
  return state.accepted === true;
}

/** Reminder exposure (mission log opened while a check is due). */
export function noteM09ReminderLogViewed() {
  for (const check of ['check1', 'check2'] as const) {
    const c = state.checks[check];

    if (c.dueAtMs !== null && c.closedAtMs === null) {
      c.reminderLogViews += 1;
    }
  }
}

export function noteM09NpcMention(check: M09Check) {
  const c = state.checks[check];

  if (c.dueAtMs !== null && c.closedAtMs === null) {
    c.reminderNpcMentions += 1;
  }
}

/** Return milestone reached: check 2 becomes due. */
export function openM09Check2(nowMs: number) {
  if (!m09Accepted() || state.checks.check2.dueAtMs !== null) {
    return;
  }

  state.checks.check2.dueAtMs = nowMs;
  m09Window.spec.windowId = M09_WINDOW_IDS.check2;
  m09Window.log('check_window_opened', {
    check: 'check2',
    window_id: M09_WINDOW_IDS.check2,
    ...checkPhase('check2'),
    input_mode: 'system',
  });
}

function activeCheck(): M09Check | null {
  for (const check of ['check1', 'check2'] as const) {
    const c = state.checks[check];

    if (c.dueAtMs !== null && c.closedAtMs === null) {
      return check;
    }
  }

  return null;
}

/** The gauge was read (E at the monitor gauge). Always available. */
export function readM09Gauge(nowMs: number, inputMode: InputMode) {
  state.gaugeReadings += 1;

  const check = activeCheck();

  if (!m09Accepted() || check === null) {
    // Reading outside a due window: gameplay only, recorded as context.
    m09Window.log('gauge_read_outside_window', {
      reading_count: state.gaugeReadings,
      input_mode: inputMode,
    });

    return;
  }

  const c = state.checks[check];

  if (c.readAtMs === null) {
    c.readAtMs = nowMs;
  }

  m09Window.log('check_completed', {
    check,
    window_id: M09_WINDOW_IDS[check],
    ...checkPhase(check),
    due_delta_ms: c.readAtMs - (c.dueAtMs ?? c.readAtMs),
    input_mode: inputMode,
  });
  closeM09Check(check, nowMs, 'read');
}

/** Milestone passed (left the Concourse / review reached): close the check. */
export function closeM09Check(
  check: M09Check,
  nowMs: number,
  reason: 'read' | 'milestone_passed' | 'review',
) {
  const c = state.checks[check];

  if (!m09Accepted() || c.dueAtMs === null || c.closedAtMs !== null) {
    return;
  }

  c.closedAtMs = nowMs;
  m09Window.log('check_window_closed', {
    check,
    window_id: M09_WINDOW_IDS[check],
    ...checkPhase(check),
    completed: c.readAtMs !== null,
    reason,
    reminder_exposure: {
      log_views: c.reminderLogViews,
      npc_mentions: c.reminderNpcMentions,
    },
    input_mode: 'system',
  });

  if (check === 'check2' || reason === 'review') {
    finishM09(nowMs);
  }
}

function finishM09(nowMs: number) {
  if (!m09Window.isOpen()) {
    return;
  }

  const { check1, check2 } = state.checks;

  // Check 2 never became due (review before the return): close it as a
  // presented-but-not-due window (null, not false).
  const check2Presented = check2.dueAtMs !== null;

  m09Window.complete(
    nowMs,
    {
      accepted: true,
      check1_completed: check1.readAtMs !== null,
      check2_completed: check2Presented ? check2.readAtMs !== null : null,
      due_delta_1:
        check1.readAtMs === null || check1.dueAtMs === null
          ? null
          : check1.readAtMs - check1.dueAtMs,
      due_delta_2:
        check2.readAtMs === null || check2.dueAtMs === null
          ? null
          : check2.readAtMs - check2.dueAtMs,
      reminder_exposure: {
        check1: check1.reminderLogViews + check1.reminderNpcMentions,
        check2: check2.reminderLogViews + check2.reminderNpcMentions,
      },
      gauge_readings: state.gaugeReadings,
    },
    'system',
  );
}

/** Deck review: close whatever is still open (never a low value). */
export function closeM09AtReview(nowMs: number) {
  if (!state.offered) {
    m09Window.markAbsent('offer never presented before the review');
    return;
  }

  if (state.accepted === null) {
    m09Window.open(nowMs, { accepted: null });
    m09Window.stop(
      nowMs,
      'closed_at_review',
      { offer_unanswered: true },
      'system',
    );
    return;
  }

  if (!m09Accepted()) {
    return;
  }

  const active = activeCheck();

  if (active !== null) {
    closeM09Check(active, nowMs, 'review');
  } else {
    finishM09(nowMs);
  }
}

/** Whether check 2 is currently due (the return opportunity is open). */
export function m09Check2Due(): boolean {
  const c = state.checks.check2;

  return m09Accepted() && c.dueAtMs !== null && c.closedAtMs === null;
}

/** Test-only escape hatch. */
export function resetM09State() {
  state = {
    offered: false,
    accepted: null,
    acceptedAtMs: null,
    checks: { check1: initialCheck(), check2: initialCheck() },
    gaugeReadings: 0,
  };
  m09Window.reset();
  m09Window.spec.windowId = 'm09_monitor_watch';
}
