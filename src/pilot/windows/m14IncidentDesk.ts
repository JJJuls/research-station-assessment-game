/**
 * M14 — Multi-source incident desk (evidence-led pilot v2, Unit 2).
 *
 * Ledger (sheet 09): one incident desk combines six messages, three
 * gauges and one station diagram; assign faults and priorities while
 * every source remains externally visible; independent packet/window.
 *
 * Mechanic: a single spatial work surface — six message cards (left),
 * three live gauge readouts (top), the station diagram with three
 * subsystem nodes (right). For each message the participant assigns a
 * subsystem (fault) and a priority (1 = first). Two messages contradict
 * each other; the participant may flag a conflict pair. Explicit SUBMIT
 * (an incomplete first submission is warned once, the second accepted).
 * No memory requirement: every source stays on the surface.
 *
 * Raw components: source_case_links (message→subsystem), omissions,
 * unresolved_conflicts, final_assignments, source_consults (gauge and
 * diagram consults). Never a score.
 */
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

export const M14_OPPORTUNITY_ID = 'proto_m14_incident_desk';
export const M14_WINDOW_ID = 'm14_desk_w1';
export const M14_ENTRY_STATE_VERSION = 'm14-incident-desk-v1';
export const M14_FAMILY = 'proto_m14_desk_';

export type M14Form = 'form_a' | 'form_b';
export type M14Subsystem = 'coolant' | 'power' | 'comms';

export const M14_SUBSYSTEMS: readonly { id: M14Subsystem; label: string }[] = [
  { id: 'coolant', label: 'Coolant loop' },
  { id: 'power', label: 'Power bus' },
  { id: 'comms', label: 'Comms relay' },
];

export interface M14Message {
  id: string;
  from: string;
  text: string;
}

export interface M14Gauge {
  id: string;
  label: string;
  reading: string;
  band: 'normal' | 'high' | 'low';
}

/** Standardised packet (identical content; form changes card order only). */
export const M14_MESSAGES: readonly M14Message[] = [
  {
    id: 'msg_1',
    from: 'Pump bay',
    text: 'Loop pressure dropping since 04:10; seal weeping at joint 3.',
  },
  {
    id: 'msg_2',
    from: 'Comms shed',
    text: 'Uplink to base lost at 04:02. Relay lamp dark.',
  },
  {
    id: 'msg_3',
    from: 'Night watch',
    text: 'Bus voltage sagging when the heaters cycle.',
  },
  {
    id: 'msg_4',
    from: 'Comms shed',
    text: 'Relay lamp steady green at 04:15; uplink nominal.',
  },
  {
    id: 'msg_5',
    from: 'Galley',
    text: 'Hot water intermittent; loop temperature reads low.',
  },
  {
    id: 'msg_6',
    from: 'Night watch',
    text: 'Heater breaker tripped twice overnight.',
  },
];

/** The designed contradiction pair (comms lost vs comms nominal). */
export const M14_CONFLICT_PAIR: readonly [string, string] = ['msg_2', 'msg_4'];

export const M14_GAUGES: readonly M14Gauge[] = [
  { id: 'gauge_loop', label: 'Loop pressure', reading: '1.6 bar', band: 'low' },
  { id: 'gauge_bus', label: 'Bus voltage', reading: '26.8 V', band: 'low' },
  {
    id: 'gauge_relay',
    label: 'Relay carrier',
    reading: 'LOCK',
    band: 'normal',
  },
];

interface M14State {
  form: M14Form;
  assignments: Record<string, M14Subsystem | null>;
  priorities: Record<string, 1 | 2 | 3 | null>;
  conflictFlags: string[][];
  selectedMessage: string | null;
  sourceConsults: number;
  submitAttempts: number;
  assignmentActs: number;
}

let state: M14State | null = null;

function ensureState(): M14State {
  if (state === null) {
    const form = assignCounterbalance<M14Form>(
      currentSessionId(),
      'm14_incident_desk_form',
      ['form_a', 'form_b'],
    );

    state = {
      form,
      assignments: Object.fromEntries(M14_MESSAGES.map((m) => [m.id, null])),
      priorities: Object.fromEntries(M14_MESSAGES.map((m) => [m.id, null])),
      conflictFlags: [],
      selectedMessage: null,
      sourceConsults: 0,
      submitAttempts: 0,
      assignmentActs: 0,
    };
  }

  return state;
}

export const m14Window = new ItemWindow({
  item: 'M14',
  opportunityId: M14_OPPORTUNITY_ID,
  windowId: M14_WINDOW_ID,
  entryStateVersion: M14_ENTRY_STATE_VERSION,
  family: M14_FAMILY,
  scene: 'station_concourse',
  objectId: 'm14_incident_desk',
});

export function declareM14() {
  const s = ensureState();

  m14Window.spec.form = s.form;
  m14Window.spec.counterbalance = s.form;
  m14Window.declare();
}

export function m14State(): Readonly<M14State> {
  return ensureState();
}

/** Messages in this form's surface order. */
export function m14MessageOrder(): M14Message[] {
  return ensureState().form === 'form_a'
    ? [...M14_MESSAGES]
    : [...M14_MESSAGES].reverse();
}

export function openM14(nowMs: number) {
  declareM14();
  m14Window.open(nowMs, {
    messages: M14_MESSAGES.length,
    gauges: M14_GAUGES.length,
    subsystems: M14_SUBSYSTEMS.length,
    order: m14MessageOrder().map((m) => m.id),
  });
}

export function selectM14Message(messageId: string, inputMode: InputMode) {
  const s = ensureState();

  if (!m14Window.isOpen()) {
    return;
  }

  s.selectedMessage = s.selectedMessage === messageId ? null : messageId;
  m14Window.log('message_selected', {
    message_id: messageId,
    selected: s.selectedMessage === messageId,
    input_mode: inputMode,
  });
}

export function consultM14Source(sourceId: string, inputMode: InputMode) {
  const s = ensureState();

  if (!m14Window.isOpen()) {
    return;
  }

  s.sourceConsults += 1;
  m14Window.log('source_consulted', {
    source_id: sourceId,
    consult_count: s.sourceConsults,
    input_mode: inputMode,
  });
}

/** Assign the selected message to a subsystem node (toggle to clear). */
export function assignM14Subsystem(
  subsystem: M14Subsystem,
  inputMode: InputMode,
): boolean {
  const s = ensureState();

  if (!m14Window.isOpen() || s.selectedMessage === null) {
    return false;
  }

  const previous = s.assignments[s.selectedMessage];

  s.assignments[s.selectedMessage] = previous === subsystem ? null : subsystem;
  s.assignmentActs += 1;
  m14Window.log('fault_assigned', {
    message_id: s.selectedMessage,
    subsystem: s.assignments[s.selectedMessage],
    previous,
    input_mode: inputMode,
  });

  return true;
}

export function setM14Priority(
  priority: 1 | 2 | 3,
  inputMode: InputMode,
): boolean {
  const s = ensureState();

  if (!m14Window.isOpen() || s.selectedMessage === null) {
    return false;
  }

  const previous = s.priorities[s.selectedMessage];

  s.priorities[s.selectedMessage] = previous === priority ? null : priority;
  s.assignmentActs += 1;
  m14Window.log('priority_set', {
    message_id: s.selectedMessage,
    priority: s.priorities[s.selectedMessage],
    previous,
    input_mode: inputMode,
  });

  return true;
}

/** Flag the selected message as conflicting with another (pair). */
export function flagM14Conflict(
  otherId: string,
  inputMode: InputMode,
): boolean {
  const s = ensureState();

  if (!m14Window.isOpen() || s.selectedMessage === null) {
    return false;
  }

  const pair = [s.selectedMessage, otherId].sort();
  const existing = s.conflictFlags.findIndex(
    (flag) => flag[0] === pair[0] && flag[1] === pair[1],
  );

  if (existing >= 0) {
    s.conflictFlags.splice(existing, 1);
  } else {
    s.conflictFlags.push(pair);
  }

  m14Window.log('conflict_flagged', {
    pair,
    flagged: existing < 0,
    input_mode: inputMode,
  });

  return true;
}

export function m14Omissions(): string[] {
  const s = ensureState();

  return M14_MESSAGES.filter(
    (m) => s.assignments[m.id] === null || s.priorities[m.id] === null,
  ).map((m) => m.id);
}

export function m14UnresolvedConflicts(): number {
  const s = ensureState();
  const designed = [...M14_CONFLICT_PAIR].sort();
  const flagged = s.conflictFlags.some(
    (flag) => flag[0] === designed[0] && flag[1] === designed[1],
  );

  return flagged ? 0 : 1;
}

/**
 * Explicit submit. An incomplete first submission is warned (returns
 * 'warned'); the second submission is accepted regardless (never a
 * correctness gate).
 */
export function submitM14(
  nowMs: number,
  inputMode: InputMode,
): 'accepted' | 'warned' | 'refused' {
  const s = ensureState();

  if (!m14Window.isOpen()) {
    return 'refused';
  }

  s.submitAttempts += 1;

  const omissions = m14Omissions();

  if (omissions.length > 0 && s.submitAttempts === 1) {
    m14Window.log('submit_warned', {
      omissions,
      input_mode: inputMode,
    });

    return 'warned';
  }

  m14Window.complete(
    nowMs,
    {
      source_case_links: Object.entries(s.assignments)
        .filter(([, subsystem]) => subsystem !== null)
        .map(([message_id, subsystem]) => ({ message_id, subsystem })),
      final_assignments: M14_MESSAGES.map((m) => ({
        message_id: m.id,
        subsystem: s.assignments[m.id],
        priority: s.priorities[m.id],
      })),
      omissions,
      omission_count: omissions.length,
      conflict_flags: s.conflictFlags,
      unresolved_conflicts: m14UnresolvedConflicts(),
      source_consults: s.sourceConsults,
      assignment_acts: s.assignmentActs,
      submit_attempts: s.submitAttempts,
    },
    inputMode,
  );

  return 'accepted';
}

export function closeM14Surface(nowMs: number) {
  m14Window.pause(nowMs);
  m14Window.log('surface_closed', {
    omissions: m14Omissions(),
    input_mode: 'system',
  });
}

export function resumeM14Surface(nowMs: number) {
  m14Window.resume(nowMs);
}

/** Test-only escape hatch. */
export function resetM14State() {
  state = null;
  m14Window.reset();
  m14Window.spec.form = null;
  m14Window.spec.counterbalance = null;
}
