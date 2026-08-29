/**
 * M21 — manual-based repair (evidence-led pilot v2, Unit 5). PURE model
 * (no Phaser, no runtime imports; Node-testable).
 *
 * Ledger (sheet 09): use a concise unfamiliar, cross-referenced manual
 * (text + equivalent diagram mode) to infer a rule and apply it to a novel
 * repair. Raw components `reference_sections_used`,
 * `cross_reference_depth`, `reengagement`, `correct_rule_application`,
 * `completion`. Validity gate: language calibrated; accessible equivalent
 * mode; application attainable; scrolling/reading duration never primary.
 *
 * Mechanic (relay bench, work surface): a storm-damaged distribution
 * relay unit sits on the bench with four jumper posts (J1–J4), a
 * three-position line selector (L1–L3) and a plate that must be INSPECTED
 * to read its code. The bench-drawer manual has four short cross-
 * referenced sections (§1 identify → §2 jumper rule → §4 variant table;
 * §1 → §3 selector rule), each in TEXT and an equivalent DIAGRAM mode.
 * The correct configuration follows from the plate code through the
 * rules; nothing states it directly. The participant may inspect, read,
 * set jumpers/selector in any order, run the BENCH TEST (informative:
 * jumper mismatch / line class mismatch / pass — never which post),
 * revise, and FIT the unit whenever they choose; SET ASIDE is the neutral
 * explicit stop. Two counterbalanced forms (matched load: two jumpers +
 * one selector change each; identical manual structure).
 *
 * Every action is a transaction: a refused action never mutates state.
 * Reading time is recorded by phase as context only. Nothing here is a
 * score; opening the manual alone is never the construct.
 */

export const M21_OPPORTUNITY_ID = 'proto_m21_manual_repair';
export const M21_WINDOW_ID = 'm21_manual_w1';
export const M21_ENTRY_STATE_VERSION = 'm21-manual-repair-v1';
export const M21_FAMILY = 'proto_m21_manual_';

export const M21_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'plate_inspected',
  'manual_opened',
  'section_consulted',
  'mode_switched',
  'jumper_set',
  'selector_set',
  'invalid_action',
  'bench_test',
  'revision',
  'reengagement',
  'fitted',
  'departed',
  'window_closed',
  'technical_failure',
] as const;

export type M21Form = 'form_a' | 'form_b';
export type M21Section =
  | 's1_identify'
  | 's2_jumper_rule'
  | 's3_selector_rule'
  | 's4_variant_table';
export type M21ManualMode = 'text' | 'diagram';
export type M21Post = 'J1' | 'J2' | 'J3' | 'J4';
export type M21Line = 'L1' | 'L2' | 'L3';
export type M21Phase = 'manual' | 'unit';

export const M21_SECTIONS: readonly M21Section[] = [
  's1_identify',
  's2_jumper_rule',
  's3_selector_rule',
  's4_variant_table',
];

export const M21_POSTS: readonly M21Post[] = ['J1', 'J2', 'J3', 'J4'];
export const M21_LINES: readonly M21Line[] = ['L1', 'L2', 'L3'];

/** The unit arrives with every post open and the selector on L2 (both forms). */
export const M21_INITIAL_SELECTOR: M21Line = 'L2';

export const M21_SECTION_TITLES: Record<M21Section, string> = {
  s1_identify: '§1 IDENTIFY THE UNIT',
  s2_jumper_rule: '§2 JUMPER RULE',
  s3_selector_rule: '§3 LINE SELECTOR RULE',
  s4_variant_table: '§4 VARIANT TABLE',
};

/** Cross-references offered inside each section (follow = one hop). */
export const M21_SECTION_REFERENCES: Record<M21Section, readonly M21Section[]> =
  {
    s1_identify: ['s2_jumper_rule', 's3_selector_rule'],
    s2_jumper_rule: ['s4_variant_table'],
    s3_selector_rule: [],
    s4_variant_table: [],
  };

/** Manual content — TEXT mode (concise, unfamiliar, no answer stated). */
export const M21_MANUAL_TEXT: Record<M21Section, string> = {
  s1_identify:
    'Read the plate on the unit (INSPECT PLATE). Plate form: RELAY <series><variant>/<class>. The variant letter before the slash sets the jumpers — see §2. The class letter after the slash sets the line selector — see §3.',
  s2_jumper_rule:
    'Jumper rule: fit a jumper on every post whose number is listed against the unit’s variant letter in §4. Every other post stays open. Posts are numbered J1 to J4 on the unit.',
  s3_selector_rule:
    'Line selector rule: class A → line L2 · class B → line L3 · class C → line L1. The selector follows the class letter on the plate, never the variant.',
  s4_variant_table:
    'Variant table — posts to fit: variant K → posts 1 and 3 · variant R → posts 2 and 4 · variant T → posts 1, 2 and 4.',
};

/** Manual content — DIAGRAM mode (equivalent information as a schematic). */
export const M21_MANUAL_DIAGRAM: Record<M21Section, string> = {
  s1_identify:
    '[ PLATE ] RELAY 7?/?\n' +
    '            │  └─ class → §3 selector\n' +
    '            └──── variant → §2 jumpers',
  s2_jumper_rule:
    'variant ─▶ §4 table ─▶ listed posts\n' +
    '   listed post  ▶ ■ jumper fitted\n' +
    '   other post   ▶ □ open',
  s3_selector_rule:
    'class A ──▶ [ L2 ]\nclass B ──▶ [ L3 ]\nclass C ──▶ [ L1 ]',
  s4_variant_table:
    'K ▶ ■J1 □J2 ■J3 □J4\n' + 'R ▶ □J1 ■J2 □J3 ■J4\n' + 'T ▶ ■J1 ■J2 □J3 ■J4',
};

export interface M21FormSpec {
  plate_code: string;
  variant: 'K' | 'R' | 'T';
  line_class: 'A' | 'B' | 'C';
  correct_jumpers: readonly M21Post[];
  correct_selector: M21Line;
}

export const M21_FORMS: Record<M21Form, M21FormSpec> = {
  form_a: {
    plate_code: 'RELAY 7K/B',
    variant: 'K',
    line_class: 'B',
    correct_jumpers: ['J1', 'J3'],
    correct_selector: 'L3',
  },
  form_b: {
    plate_code: 'RELAY 7R/C',
    variant: 'R',
    line_class: 'C',
    correct_jumpers: ['J2', 'J4'],
    correct_selector: 'L1',
  },
};

export interface M21SectionVisit {
  section: M21Section;
  via: 'tab' | 'reference';
  mode: M21ManualMode;
  at_ms: number;
}

export interface M21Action {
  kind: 'jumper' | 'selector';
  target: M21Post | M21Line;
  value: boolean | M21Line;
  at_ms: number;
  after_test: boolean;
}

export interface M21BenchTest {
  at_ms: number;
  pass: boolean;
  faults: ('jumper_mismatch' | 'line_class_mismatch')[];
}

export interface M21State {
  form: M21Form;
  entered: boolean;
  opened_at_ms: number | null;
  closed: boolean;
  stop_choice: 'set_aside' | 'closed_at_review' | null;
  plate_inspected: boolean;
  inspections: number;
  manual_opened: boolean;
  manual_opens: number;
  manual_mode: M21ManualMode;
  mode_switches: number;
  diagram_mode_used: boolean;
  current_section: M21Section | null;
  sections_consulted: M21Section[];
  section_visits: M21SectionVisit[];
  /** Longest chain of reference hops without returning to the tab bar. */
  cross_reference_depth: number;
  current_chain: number;
  jumpers: Record<M21Post, boolean>;
  selector: M21Line;
  actions: M21Action[];
  invalid_actions: number;
  /** Configuration changes after at least one bench test. */
  revisions: number;
  bench_tests: M21BenchTest[];
  /** Manual consulted after a failed test, or the bench reopened unfinished. */
  reengagements: number;
  fitted: boolean;
  fitted_at_ms: number | null;
  final_config_correct: boolean | null;
  output_delivery: 'inventory' | 'bench_bundle' | null;
  departures: number;
  phase: M21Phase;
  phase_started_at_ms: number | null;
  time_by_phase_ms: Record<M21Phase, number>;
  technical_failure: string | null;
}

export function createM21State(form: M21Form): M21State {
  return {
    form,
    entered: false,
    opened_at_ms: null,
    closed: false,
    stop_choice: null,
    plate_inspected: false,
    inspections: 0,
    manual_opened: false,
    manual_opens: 0,
    manual_mode: 'text',
    mode_switches: 0,
    diagram_mode_used: false,
    current_section: null,
    sections_consulted: [],
    section_visits: [],
    cross_reference_depth: 0,
    current_chain: 0,
    jumpers: { J1: false, J2: false, J3: false, J4: false },
    selector: M21_INITIAL_SELECTOR,
    actions: [],
    invalid_actions: 0,
    revisions: 0,
    bench_tests: [],
    reengagements: 0,
    fitted: false,
    fitted_at_ms: null,
    final_config_correct: null,
    output_delivery: null,
    departures: 0,
    phase: 'unit',
    phase_started_at_ms: null,
    time_by_phase_ms: { manual: 0, unit: 0 },
    technical_failure: null,
  };
}

export function m21Spec(state: M21State): M21FormSpec {
  return M21_FORMS[state.form];
}

export function m21Open(state: M21State): boolean {
  return state.entered && !state.closed;
}

/** The bench surface was entered (once). */
export function m21Enter(state: M21State, nowMs: number): boolean {
  if (state.entered) {
    return false;
  }

  state.entered = true;
  state.opened_at_ms = nowMs;
  state.phase_started_at_ms = nowMs;

  return true;
}

function switchPhase(state: M21State, phase: M21Phase, nowMs: number) {
  if (state.phase_started_at_ms !== null) {
    state.time_by_phase_ms[state.phase] += Math.max(
      0,
      nowMs - state.phase_started_at_ms,
    );
  }

  state.phase = phase;
  state.phase_started_at_ms = nowMs;
}

/** Bench reopened after a departure with the unit unfinished (reengagement). */
export function m21Reopen(state: M21State, nowMs: number): boolean {
  if (!m21Open(state) || state.departures === 0 || state.fitted) {
    return false;
  }

  state.reengagements += 1;
  state.phase_started_at_ms = nowMs;

  return true;
}

export function m21InspectPlate(state: M21State, nowMs: number): boolean {
  if (!m21Open(state)) {
    return false;
  }

  state.plate_inspected = true;
  state.inspections += 1;
  switchPhase(state, 'unit', nowMs);

  return true;
}

export function m21OpenManual(state: M21State, nowMs: number): boolean {
  if (!m21Open(state)) {
    return false;
  }

  state.manual_opened = true;
  state.manual_opens += 1;
  switchPhase(state, 'manual', nowMs);

  return true;
}

/**
 * Consult a section. `via: 'reference'` follows a cross-reference offered
 * INSIDE the current section (one hop deeper); `via: 'tab'` starts a new
 * chain from the tab bar. A reference that the current section does not
 * offer is refused (never mutates).
 */
export function m21Consult(
  state: M21State,
  section: M21Section,
  via: 'tab' | 'reference',
  nowMs: number,
): boolean {
  if (!m21Open(state)) {
    return false;
  }

  if (via === 'reference') {
    const from = state.current_section;

    if (from === null || !M21_SECTION_REFERENCES[from].includes(section)) {
      return false;
    }

    state.current_chain += 1;
  } else {
    state.current_chain = 1;
  }

  state.cross_reference_depth = Math.max(
    state.cross_reference_depth,
    via === 'reference' ? state.current_chain - 1 : 0,
  );

  const lastTest = state.bench_tests[state.bench_tests.length - 1];
  const lastVisit = state.section_visits[state.section_visits.length - 1];

  // Reengagement with the reference after an unsuccessful test: the first
  // consult after a failed bench test (once per test).
  if (
    lastTest !== undefined &&
    !lastTest.pass &&
    (lastVisit === undefined || lastVisit.at_ms < lastTest.at_ms)
  ) {
    state.reengagements += 1;
  }

  state.manual_opened = true;
  state.current_section = section;
  state.section_visits.push({
    section,
    via,
    mode: state.manual_mode,
    at_ms: nowMs,
  });

  if (!state.sections_consulted.includes(section)) {
    state.sections_consulted.push(section);
  }

  switchPhase(state, 'manual', nowMs);

  return true;
}

export function m21SwitchMode(
  state: M21State,
  mode: M21ManualMode,
  nowMs: number,
): boolean {
  if (!m21Open(state) || state.manual_mode === mode) {
    return false;
  }

  state.manual_mode = mode;
  state.mode_switches += 1;

  if (mode === 'diagram') {
    state.diagram_mode_used = true;
  }

  switchPhase(state, 'manual', nowMs);

  return true;
}

function noteAction(state: M21State, action: M21Action) {
  state.actions.push(action);

  if (action.after_test) {
    state.revisions += 1;
  }
}

/** Fit or open one jumper post (same state / fitted unit = invalid, refused). */
export function m21SetJumper(
  state: M21State,
  post: M21Post,
  fitted: boolean,
  nowMs: number,
): boolean {
  if (!m21Open(state) || state.fitted || state.jumpers[post] === fitted) {
    if (m21Open(state)) {
      state.invalid_actions += 1;
    }

    return false;
  }

  state.jumpers[post] = fitted;
  noteAction(state, {
    kind: 'jumper',
    target: post,
    value: fitted,
    at_ms: nowMs,
    after_test: state.bench_tests.length > 0,
  });
  switchPhase(state, 'unit', nowMs);

  return true;
}

/** Set the line selector (same position / fitted unit = invalid, refused). */
export function m21SetSelector(
  state: M21State,
  line: M21Line,
  nowMs: number,
): boolean {
  if (!m21Open(state) || state.fitted || state.selector === line) {
    if (m21Open(state)) {
      state.invalid_actions += 1;
    }

    return false;
  }

  state.selector = line;
  noteAction(state, {
    kind: 'selector',
    target: line,
    value: line,
    at_ms: nowMs,
    after_test: state.bench_tests.length > 0,
  });
  switchPhase(state, 'unit', nowMs);

  return true;
}

export function m21JumpersCorrect(state: M21State): boolean {
  const spec = m21Spec(state);

  return M21_POSTS.every(
    (post) => state.jumpers[post] === spec.correct_jumpers.includes(post),
  );
}

export function m21SelectorCorrect(state: M21State): boolean {
  return state.selector === m21Spec(state).correct_selector;
}

export function m21ConfigCorrect(state: M21State): boolean {
  return m21JumpersCorrect(state) && m21SelectorCorrect(state);
}

/** Bench test: observable evidence (which subsystem mismatches; never which post). */
export function m21BenchTest(
  state: M21State,
  nowMs: number,
): M21BenchTest | null {
  if (!m21Open(state) || state.fitted) {
    return null;
  }

  const faults: M21BenchTest['faults'] = [];

  if (!m21JumpersCorrect(state)) {
    faults.push('jumper_mismatch');
  }

  if (!m21SelectorCorrect(state)) {
    faults.push('line_class_mismatch');
  }

  const test: M21BenchTest = {
    at_ms: nowMs,
    pass: faults.length === 0,
    faults,
  };

  state.bench_tests.push(test);
  switchPhase(state, 'unit', nowMs);

  return test;
}

export function m21TestReadout(test: M21BenchTest | null): string {
  if (test === null) {
    return 'BENCH TEST: not run';
  }

  if (test.pass) {
    return 'BENCH TEST: PASS — relay within tolerance';
  }

  return `BENCH TEST: FAULT — ${test.faults
    .map((fault) =>
      fault === 'jumper_mismatch' ? 'jumper mismatch' : 'line class mismatch',
    )
    .join(' · ')}`;
}

/** FIT the unit as configured (the task finishes; correctness is a raw fact). */
export function m21Fit(state: M21State, nowMs: number): boolean {
  if (!m21Open(state) || state.fitted) {
    return false;
  }

  state.fitted = true;
  state.fitted_at_ms = nowMs;
  state.final_config_correct = m21ConfigCorrect(state);
  switchPhase(state, 'unit', nowMs);

  return true;
}

/** Where the fitted unit went (inventory, or a bench bundle when the belt is full). */
export function m21NoteOutput(
  state: M21State,
  delivery: 'inventory' | 'bench_bundle',
): void {
  state.output_delivery = delivery;
}

/** Surface left with the unit unfinished (window stays open). */
export function m21Depart(state: M21State, nowMs: number): boolean {
  if (!m21Open(state) || state.fitted) {
    return false;
  }

  state.departures += 1;
  switchPhase(state, state.phase, nowMs);

  return true;
}

/** Closes the observation (explicit stop, completion, or the review). Idempotent. */
export function m21Close(
  state: M21State,
  reason: 'fitted' | 'set_aside' | 'closed_at_review',
  nowMs: number,
): boolean {
  if (state.closed) {
    return false;
  }

  switchPhase(state, state.phase, nowMs);
  state.closed = true;

  if (reason !== 'fitted') {
    state.stop_choice = reason;
  }

  return true;
}

/** Ledger raw components first; contextual counts after. Never a score. */
export function m21RawComponents(state: M21State) {
  const lastTest = state.bench_tests[state.bench_tests.length - 1] ?? null;

  return {
    reference_sections_used: state.sections_consulted.length,
    cross_reference_depth: state.cross_reference_depth,
    reengagement: state.reengagements,
    correct_rule_application: state.final_config_correct,
    completion: state.fitted,
    form: state.form,
    sections_consulted: [...state.sections_consulted],
    section_visits: state.section_visits.length,
    reference_follows: state.section_visits.filter(
      (visit) => visit.via === 'reference',
    ).length,
    manual_opens: state.manual_opens,
    mode_switches: state.mode_switches,
    diagram_mode_used: state.diagram_mode_used,
    plate_inspected: state.plate_inspected,
    inspections: state.inspections,
    repair_actions: state.actions.length,
    invalid_actions: state.invalid_actions,
    revisions: state.revisions,
    bench_tests: state.bench_tests.length,
    first_test_pass:
      state.bench_tests.length === 0 ? null : state.bench_tests[0].pass,
    last_test_pass: lastTest === null ? null : lastTest.pass,
    jumpers_correct_at_close: m21JumpersCorrect(state),
    selector_correct_at_close: m21SelectorCorrect(state),
    final_config: { jumpers: { ...state.jumpers }, selector: state.selector },
    output_delivery: state.output_delivery,
    time_by_phase_ms: { ...state.time_by_phase_ms },
    departures: state.departures,
    stop_choice: state.stop_choice,
  };
}

/** Participant-facing unit readout (operational; no item wording). */
export function m21UnitReadout(state: M21State): string {
  const fitted = M21_POSTS.filter((post) => state.jumpers[post]);

  return `Jumpers fitted: ${fitted.length === 0 ? 'none' : fitted.join(' ')} · selector ${state.selector}`;
}
