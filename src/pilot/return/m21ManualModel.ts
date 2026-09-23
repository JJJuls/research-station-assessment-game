/**
 * M21 — manual-based repair, two independent cases (Station 080 Unit 10).
 * PURE model (no Phaser, no runtime imports; Node-testable).
 *
 * Register M21 row ("Replace revisit score", MPS Appendix A 3, PDD): 240–320
 * manual words split into TWO independent cases; after an INCORRECT FIRST
 * APPLICATION the participant gets truthful feedback and may restudy the
 * relevant manual section and apply a revised configuration, try another
 * strategy, or exit. Measure `m21_restudy_revisions` = cases with relevant
 * restudy AND a revised application / cases whose first application was
 * incorrect (two first-time successes ⇒ no failure-conditioned score).
 *
 * Mechanic (relay bench, work surface): a unit sits on the bench with a
 * row of binary posts (jumpers / breakers) and a position selector (line
 * selector / range dial) and a plate that must be INSPECTED to read its
 * code. The bench-drawer manual has four short cross-referenced sections
 * (§1 identify → §2 post rule → §4 code table; §1 → §3 selector rule), each
 * in TEXT and an equivalent DIAGRAM mode. The correct configuration follows
 * from the plate code through the rules; nothing states it directly. FIT
 * is the APPLICATION (available once the plate has been read — the v2
 * gate "plate inspected to start"): a correct configuration is accepted
 * and the case closes; an incorrect one fails truthfully on the bench
 * ("<post group> mismatch" / "<selector> mismatch" — never which post) and
 * the unit stays for restudy, revision, another strategy or SET ASIDE. The
 * open manual section collapses after every application, so a restudy is
 * always an explicit, observable consult. There is no free
 * pre-application test (the v2 bench test would let every first
 * application be correct). Case 1 = the storm-damaged distribution relay
 * unit; case 2 = the pump controller — different rules, so the second case
 * is never solved by the first case's knowledge.
 *
 * Every action is a transaction: a refused action never mutates state.
 * Reading time is recorded by phase as context only. Nothing here is a
 * score; opening the manual alone is never the construct.
 */

export type M21Case = 'o1' | 'o2';
export type M21Form = 'form_a' | 'form_b';
export type M21ManualMode = 'text' | 'diagram';
export type M21Phase = 'manual' | 'unit';
export type M21Section =
  | 's1_identify'
  | 's2_post_rule'
  | 's3_selector_rule'
  | 's4_code_table';
export type M21Subsystem = 'posts' | 'selector';

export const M21_CASES: readonly M21Case[] = ['o1', 'o2'];
export const M21_FAMILY = 'proto_m21_case_';
export const M21_OPPORTUNITY_IDS: Record<M21Case, string> = {
  o1: 'proto_m21_case_o1',
  o2: 'proto_m21_case_o2',
};
export const M21_WINDOW_IDS: Record<M21Case, string> = {
  o1: 'm21_case_o1',
  o2: 'm21_case_o2',
};
export const M21_ENTRY_STATE_VERSION = 'm21-cases-v3';
export const M21_OBJECT_ID = 'm21_relay_bench';

export const M21_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'case_placed',
  'plate_inspected',
  'manual_opened',
  'section_consulted',
  'mode_switched',
  'post_set',
  'selector_set',
  'invalid_action',
  'press_refused',
  'applied',
  'feedback_presented',
  'restudy',
  'revised_application',
  'accepted',
  'set_aside',
  'reengagement',
  'departed',
  'window_closed',
  'technical_failure',
] as const;

/**
 * Settle window after the next unit is placed: a FIT or SET ASIDE press
 * carried over from the previous unit is refused (never a first application
 * or an exit of the new case).
 */
export const M21_PLACE_SETTLE_MS = 1500;

export const M21_SECTIONS: readonly M21Section[] = [
  's1_identify',
  's2_post_rule',
  's3_selector_rule',
  's4_code_table',
];

/** Cross-references offered inside each section (follow = one hop). */
export const M21_SECTION_REFERENCES: Record<M21Section, readonly M21Section[]> =
  {
    s1_identify: ['s2_post_rule', 's3_selector_rule'],
    s2_post_rule: ['s4_code_table'],
    s3_selector_rule: [],
    s4_code_table: [],
  };

/** Sections that bear on each subsystem (a restudy is RELEVANT when it reads one of them). */
export const M21_RELEVANT_SECTIONS: Record<
  M21Subsystem,
  readonly M21Section[]
> = {
  posts: ['s2_post_rule', 's4_code_table'],
  selector: ['s3_selector_rule'],
};

export interface M21FormSpec {
  plate_code: string;
  correct_posts: readonly string[];
  correct_selector: string;
}

export interface M21CaseDef {
  case: M21Case;
  /** Participant-facing unit name. */
  unit_name: string;
  manual_title: string;
  posts: readonly string[];
  /** Participant-facing name of one binary post ("jumper" / "breaker"). */
  post_name: string;
  /** Participant-facing "on" / "off" words for the posts. */
  post_on: string;
  post_off: string;
  selector_positions: readonly string[];
  /** Participant-facing selector name ("line selector" / "range dial"). */
  selector_name: string;
  initial_selector: string;
  /** Truthful fault wording per subsystem (never which post). */
  fault_labels: Record<M21Subsystem, string>;
  section_titles: Record<M21Section, string>;
  manual_text: Record<M21Section, string>;
  manual_diagram: Record<M21Section, string>;
  forms: Record<M21Form, M21FormSpec>;
}

export const M21_CASE_DEFS: Record<M21Case, M21CaseDef> = {
  o1: {
    case: 'o1',
    unit_name: 'distribution relay unit',
    manual_title: 'BENCH DRAWER MANUAL — RELAY UNITS',
    posts: ['J1', 'J2', 'J3', 'J4'],
    post_name: 'jumper',
    post_on: 'jumper fitted',
    post_off: 'open',
    selector_positions: ['L1', 'L2', 'L3'],
    selector_name: 'line selector',
    initial_selector: 'L2',
    fault_labels: { posts: 'jumper mismatch', selector: 'line class mismatch' },
    section_titles: {
      s1_identify: '§1 IDENTIFY THE UNIT',
      s2_post_rule: '§2 JUMPER RULE',
      s3_selector_rule: '§3 LINE SELECTOR RULE',
      s4_code_table: '§4 VARIANT TABLE',
    },
    manual_text: {
      s1_identify:
        'Read the plate on the unit (INSPECT PLATE). Plate form: RELAY <series><variant>/<class>. The variant letter before the slash sets the jumpers — see §2. The class letter after the slash sets the line selector — see §3. Both letters are needed.',
      s2_post_rule:
        'Jumper rule: fit a jumper on every post whose number is listed against the unit’s variant letter in §4. Every other post stays open. Posts are numbered J1 to J4 on the unit.',
      s3_selector_rule:
        'Line selector rule: class A → line L2 · class B → line L3 · class C → line L1. The selector follows the class letter on the plate, never the variant. Move the selector to that line.',
      s4_code_table:
        'Variant table — posts to fit: variant K → posts 1 and 3 · variant R → posts 2 and 4 · variant T → posts 1, 2 and 4.',
    },
    manual_diagram: {
      s1_identify:
        '[ PLATE ] RELAY 7?/?\n' +
        '            │  └─ class → §3 selector\n' +
        '            └──── variant → §2 jumpers',
      s2_post_rule:
        'variant ─▶ §4 table ─▶ listed posts\n' +
        '   listed post  ▶ ■ jumper fitted\n' +
        '   other post   ▶ □ open',
      s3_selector_rule:
        'class A ──▶ [ L2 ]\nclass B ──▶ [ L3 ]\nclass C ──▶ [ L1 ]',
      s4_code_table:
        'K ▶ ■J1 □J2 ■J3 □J4\n' +
        'R ▶ □J1 ■J2 □J3 ■J4\n' +
        'T ▶ ■J1 ■J2 □J3 ■J4',
    },
    forms: {
      form_a: {
        plate_code: 'RELAY 7K/B',
        correct_posts: ['J1', 'J3'],
        correct_selector: 'L3',
      },
      form_b: {
        plate_code: 'RELAY 7R/C',
        correct_posts: ['J2', 'J4'],
        correct_selector: 'L1',
      },
    },
  },
  o2: {
    case: 'o2',
    unit_name: 'pump controller',
    manual_title: 'BENCH DRAWER MANUAL — PUMP CONTROLLERS',
    posts: ['B1', 'B2'],
    post_name: 'breaker',
    post_on: 'breaker closed',
    post_off: 'open',
    selector_positions: ['R1', 'R2', 'R3', 'R4'],
    selector_name: 'range dial',
    initial_selector: 'R2',
    fault_labels: { posts: 'breaker mismatch', selector: 'range mismatch' },
    section_titles: {
      s1_identify: '§1 IDENTIFY THE CONTROLLER',
      s2_post_rule: '§2 BREAKER RULE',
      s3_selector_rule: '§3 RANGE DIAL RULE',
      s4_code_table: '§4 GRADE TABLE',
    },
    manual_text: {
      s1_identify:
        'Read the plate on the controller (INSPECT PLATE). Plate form: PUMP <series><grade>/<duty>. The grade letter before the slash sets the breakers — see §2. The duty letter after the slash sets the range dial — see §3. Both letters are needed.',
      s2_post_rule:
        'Breaker rule: close every breaker listed against the controller’s grade letter in §4; leave the other breaker open. Open means the breaker is out. Breakers are marked B1 and B2.',
      s3_selector_rule:
        'Range dial rule: duty M → range R1 · duty P → range R3 · duty S → range R4. The dial follows the duty letter on the plate, never the grade. Turn the dial to that range.',
      s4_code_table:
        'Grade table — breakers to close: grade X → B1 only · grade Y → B2 only · grade Z → B1 and B2.',
    },
    manual_diagram: {
      s1_identify:
        '[ PLATE ] PUMP 3?/?\n' +
        '            │  └─ duty → §3 range dial\n' +
        '            └──── grade → §2 breakers',
      s2_post_rule:
        'grade ─▶ §4 table ─▶ listed breakers\n' +
        '   listed breaker ▶ ■ closed\n' +
        '   other breaker  ▶ □ open',
      s3_selector_rule:
        'duty M ──▶ [ R1 ]\nduty P ──▶ [ R3 ]\nduty S ──▶ [ R4 ]',
      s4_code_table: 'X ▶ ■B1 □B2\n' + 'Y ▶ □B1 ■B2\n' + 'Z ▶ ■B1 ■B2',
    },
    forms: {
      form_a: {
        plate_code: 'PUMP 3Y/M',
        correct_posts: ['B2'],
        correct_selector: 'R1',
      },
      form_b: {
        plate_code: 'PUMP 3X/S',
        correct_posts: ['B1'],
        correct_selector: 'R4',
      },
    },
  },
};

/**
 * Lexical word count of a case's TEXT-mode manual (tokens containing a
 * letter or digit — arrows, dots and dashes are not words; review S-F7).
 * The register's 240–320 budget covers both cases.
 */
export function m21ManualWordCount(def: M21CaseDef): number {
  return M21_SECTIONS.reduce(
    (sum, section) =>
      sum +
      def.manual_text[section]
        .split(/\s+/)
        .filter((token) => /[A-Za-z0-9]/.test(token)).length,
    0,
  );
}

export interface M21SectionVisit {
  section: M21Section;
  via: 'tab' | 'reference';
  mode: M21ManualMode;
  at_ms: number;
  /** Visits after the first incorrect application are restudy. */
  after_application: number;
}

export interface M21Action {
  kind: 'post' | 'selector';
  target: string;
  value: boolean | string;
  at_ms: number;
  /** Applications already made when the action was taken. */
  after_application: number;
}

export interface M21Application {
  index: number;
  at_ms: number;
  correct: boolean;
  faults: M21Subsystem[];
  posts: Record<string, boolean>;
  selector: string;
  /** Configuration differs from the previous application (a REVISED application). */
  revised: boolean;
  /** Sections consulted since the previous application. */
  restudy_sections: M21Section[];
  /** At least one of them bears on a subsystem the previous application got wrong. */
  relevant_restudy: boolean;
  /**
   * A relevant restudy happened anywhere after the FIRST application and
   * before this one (an unchanged re-application in between does not
   * break the restudy → revision link).
   */
  relevant_restudy_since_first: boolean;
}

export type M21Strategy =
  | 'no_application'
  | 'first_correct'
  | 'restudy_and_revise'
  | 'revise_without_relevant_restudy'
  | 'restudy_then_exit'
  | 'exit'
  | 'unresolved';

export interface M21CaseState {
  case: M21Case;
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
  cross_reference_depth: number;
  current_chain: number;
  posts: Record<string, boolean>;
  selector: string;
  actions: M21Action[];
  invalid_actions: number;
  applications: M21Application[];
  accepted: boolean;
  accepted_at_ms: number | null;
  output_delivery: 'inventory' | 'bench_bundle' | 'released' | null;
  departures: number;
  reengagements: number;
  phase: M21Phase;
  phase_started_at_ms: number | null;
  time_by_phase_ms: Record<M21Phase, number>;
  technical_failure: string | null;
}

export function m21Def(state: M21CaseState): M21CaseDef {
  return M21_CASE_DEFS[state.case];
}

export function m21Spec(state: M21CaseState): M21FormSpec {
  return m21Def(state).forms[state.form];
}

export function createM21CaseState(
  caseId: M21Case,
  form: M21Form,
): M21CaseState {
  const def = M21_CASE_DEFS[caseId];

  return {
    case: caseId,
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
    posts: Object.fromEntries(def.posts.map((post) => [post, false])),
    selector: def.initial_selector,
    actions: [],
    invalid_actions: 0,
    applications: [],
    accepted: false,
    accepted_at_ms: null,
    output_delivery: null,
    departures: 0,
    reengagements: 0,
    phase: 'unit',
    phase_started_at_ms: null,
    time_by_phase_ms: { manual: 0, unit: 0 },
    technical_failure: null,
  };
}

export function m21Open(state: M21CaseState): boolean {
  return state.entered && !state.closed;
}

/** The bench surface was entered for this case (once). */
export function m21Enter(state: M21CaseState, nowMs: number): boolean {
  if (state.entered) {
    return false;
  }

  state.entered = true;
  state.opened_at_ms = nowMs;
  state.phase_started_at_ms = nowMs;

  return true;
}

function switchPhase(state: M21CaseState, phase: M21Phase, nowMs: number) {
  if (state.phase_started_at_ms !== null) {
    state.time_by_phase_ms[state.phase] += Math.max(
      0,
      nowMs - state.phase_started_at_ms,
    );
  }

  state.phase = phase;
  state.phase_started_at_ms = nowMs;
}

/** Bench reopened after a departure with the case unfinished (reengagement). */
export function m21Reopen(state: M21CaseState, nowMs: number): boolean {
  if (!m21Open(state) || state.departures === 0) {
    return false;
  }

  state.reengagements += 1;
  state.phase_started_at_ms = nowMs;

  return true;
}

export function m21InspectPlate(state: M21CaseState, nowMs: number): boolean {
  if (!m21Open(state)) {
    return false;
  }

  state.plate_inspected = true;
  state.inspections += 1;
  switchPhase(state, 'unit', nowMs);

  return true;
}

export function m21OpenManual(state: M21CaseState, nowMs: number): boolean {
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
 * offer is refused (never mutates). A consult after an incorrect
 * application is RESTUDY (relevant when the section bears on a failed
 * subsystem).
 */
export function m21Consult(
  state: M21CaseState,
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
  state.manual_opened = true;
  state.current_section = section;
  state.section_visits.push({
    section,
    via,
    mode: state.manual_mode,
    at_ms: nowMs,
    after_application: state.applications.length,
  });

  if (!state.sections_consulted.includes(section)) {
    state.sections_consulted.push(section);
  }

  switchPhase(state, 'manual', nowMs);

  return true;
}

export function m21SwitchMode(
  state: M21CaseState,
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

/** Set one binary post (same state / accepted unit / unknown post = invalid, refused). */
export function m21SetPost(
  state: M21CaseState,
  post: string,
  on: boolean,
  nowMs: number,
): boolean {
  if (
    !m21Open(state) ||
    state.accepted ||
    !(post in state.posts) ||
    state.posts[post] === on
  ) {
    if (m21Open(state)) {
      state.invalid_actions += 1;
    }

    return false;
  }

  state.posts[post] = on;
  state.actions.push({
    kind: 'post',
    target: post,
    value: on,
    at_ms: nowMs,
    after_application: state.applications.length,
  });
  switchPhase(state, 'unit', nowMs);

  return true;
}

/** Set the selector (same position / accepted unit / unknown position = invalid, refused). */
export function m21SetSelector(
  state: M21CaseState,
  position: string,
  nowMs: number,
): boolean {
  if (
    !m21Open(state) ||
    state.accepted ||
    !m21Def(state).selector_positions.includes(position) ||
    state.selector === position
  ) {
    if (m21Open(state)) {
      state.invalid_actions += 1;
    }

    return false;
  }

  state.selector = position;
  state.actions.push({
    kind: 'selector',
    target: position,
    value: position,
    at_ms: nowMs,
    after_application: state.applications.length,
  });
  switchPhase(state, 'unit', nowMs);

  return true;
}

export function m21PostsCorrect(state: M21CaseState): boolean {
  const spec = m21Spec(state);

  return m21Def(state).posts.every(
    (post) => state.posts[post] === spec.correct_posts.includes(post),
  );
}

export function m21SelectorCorrect(state: M21CaseState): boolean {
  return state.selector === m21Spec(state).correct_selector;
}

export function m21ConfigCorrect(state: M21CaseState): boolean {
  return m21PostsCorrect(state) && m21SelectorCorrect(state);
}

/** Sections consulted since the previous application (the restudy window). */
export function m21RestudySince(
  state: M21CaseState,
  applicationIndex: number,
): M21Section[] {
  const sections: M21Section[] = [];

  for (const visit of state.section_visits) {
    if (
      visit.after_application === applicationIndex &&
      !sections.includes(visit.section)
    ) {
      sections.push(visit.section);
    }
  }

  return sections;
}

function relevant(
  sections: readonly M21Section[],
  faults: readonly M21Subsystem[],
): boolean {
  return faults.some((fault) =>
    M21_RELEVANT_SECTIONS[fault].some((section) => sections.includes(section)),
  );
}

/** Faults known after applications 1..k (the union of their faults). */
export function m21FaultsKnownAfter(
  state: M21CaseState,
  applicationIndex: number,
): M21Subsystem[] {
  const known: M21Subsystem[] = [];

  for (const application of state.applications.slice(0, applicationIndex)) {
    for (const fault of application.faults) {
      if (!known.includes(fault)) {
        known.push(fault);
      }
    }
  }

  return known;
}

/**
 * A relevant restudy after the first application and before application
 * `before` (exclusive; Infinity = so far): a section read after application
 * k that bears on a fault known from applications 1..k (review S-F4 —
 * never a fault that appeared only later).
 */
export function m21RelevantRestudyBefore(
  state: M21CaseState,
  before = Number.POSITIVE_INFINITY,
): boolean {
  return state.section_visits.some(
    (visit) =>
      visit.after_application >= 1 &&
      visit.after_application < before &&
      relevant(
        [visit.section],
        m21FaultsKnownAfter(state, visit.after_application),
      ),
  );
}

/** FIT is available once the plate has been read (the v2 gate). */
export function m21CanApply(
  state: M21CaseState,
): 'ok' | 'closed' | 'accepted' | 'plate_not_inspected' {
  if (!m21Open(state)) {
    return 'closed';
  }

  if (state.accepted) {
    return 'accepted';
  }

  if (!state.plate_inspected) {
    return 'plate_not_inspected';
  }

  return 'ok';
}

/**
 * FIT = the APPLICATION. A correct configuration is accepted and the case
 * closes for the participant's part (the caller completes the window); an
 * incorrect one is recorded with its truthful faults and the unit stays.
 */
export function m21Apply(
  state: M21CaseState,
  nowMs: number,
): M21Application | null {
  if (m21CanApply(state) !== 'ok') {
    if (m21Open(state)) {
      state.invalid_actions += 1;
    }

    return null;
  }

  const faults: M21Subsystem[] = [];

  if (!m21PostsCorrect(state)) {
    faults.push('posts');
  }

  if (!m21SelectorCorrect(state)) {
    faults.push('selector');
  }

  const previous = state.applications[state.applications.length - 1] ?? null;
  const restudy =
    previous === null ? [] : m21RestudySince(state, previous.index);
  const configChanged =
    previous === null
      ? false
      : previous.selector !== state.selector ||
        m21Def(state).posts.some(
          (post) => previous.posts[post] !== state.posts[post],
        );
  const application: M21Application = {
    index: state.applications.length + 1,
    at_ms: nowMs,
    correct: faults.length === 0,
    faults,
    posts: { ...state.posts },
    selector: state.selector,
    revised: previous !== null && configChanged,
    restudy_sections: restudy,
    relevant_restudy: previous !== null && relevant(restudy, previous.faults),
    relevant_restudy_since_first:
      previous !== null && m21RelevantRestudyBefore(state),
  };

  state.applications.push(application);
  // The open section collapses: a restudy needs an explicit consult.
  state.current_section = null;
  state.current_chain = 0;

  if (application.correct) {
    state.accepted = true;
    state.accepted_at_ms = nowMs;
  }

  switchPhase(state, 'unit', nowMs);

  return application;
}

/** Truthful feedback line for an application (never which post). */
export function m21FeedbackLine(
  def: M21CaseDef,
  application: M21Application,
): string {
  if (application.correct) {
    return `${def.unit_name.charAt(0).toUpperCase()}${def.unit_name.slice(1)} accepted on the bench.`;
  }

  return `The unit fails on the bench: ${application.faults
    .map((fault) => def.fault_labels[fault])
    .join(' · ')}. It stays on the bench.`;
}

/** Where the accepted unit went. */
export function m21NoteOutput(
  state: M21CaseState,
  delivery: 'inventory' | 'bench_bundle' | 'released',
): void {
  state.output_delivery = delivery;
}

/** Surface left with the case unfinished (window stays open). */
export function m21Depart(state: M21CaseState, nowMs: number): boolean {
  if (!m21Open(state) || state.accepted) {
    return false;
  }

  state.departures += 1;
  switchPhase(state, state.phase, nowMs);

  return true;
}

/** Closes the observation (acceptance, explicit stop, or the review). Idempotent. */
export function m21Close(
  state: M21CaseState,
  reason: 'accepted' | 'set_aside' | 'closed_at_review',
  nowMs: number,
): boolean {
  if (state.closed) {
    return false;
  }

  switchPhase(state, state.phase, nowMs);
  state.closed = true;

  if (reason !== 'accepted') {
    state.stop_choice = reason;
  }

  return true;
}

/** The case's strategy after its first application (raw classification, not a score). */
export function m21Strategy(state: M21CaseState): M21Strategy {
  const first = state.applications[0];

  if (first === undefined) {
    return 'no_application';
  }

  if (first.correct) {
    return 'first_correct';
  }

  const later = state.applications.slice(1);
  const revised = later.find((application) => application.revised);
  const restudyAfterFirst = m21RestudySince(state, first.index);
  const anyRestudy =
    restudyAfterFirst.length > 0 ||
    later.some((application) => application.restudy_sections.length > 0);

  if (revised !== undefined) {
    return later.some((a) => a.revised && a.relevant_restudy_since_first)
      ? 'restudy_and_revise'
      : 'revise_without_relevant_restudy';
  }

  if (state.closed && state.stop_choice === 'set_aside') {
    return anyRestudy ? 'restudy_then_exit' : 'exit';
  }

  return 'unresolved';
}

/** Ledger raw components first; contextual counts after. Never a score. */
export function m21RawComponents(state: M21CaseState) {
  const first = state.applications[0] ?? null;
  const strategy = m21Strategy(state);
  const relevantRevision =
    first !== null &&
    !first.correct &&
    state.applications
      .slice(1)
      .some(
        (application) =>
          application.revised && application.relevant_restudy_since_first,
      );

  return {
    case: state.case,
    form: state.form,
    applications: state.applications.length,
    first_application_correct: first === null ? null : first.correct,
    first_application_faults: first === null ? null : [...first.faults],
    restudy_sections_after_first:
      first === null || first.correct
        ? []
        : m21RestudySince(state, first.index),
    relevant_restudy:
      first === null || first.correct ? null : m21RelevantRestudyBefore(state),
    revised_application:
      first === null || first.correct
        ? null
        : state.applications
            .slice(1)
            .some((application) => application.revised),
    /** The feature's per-case numerator fact: relevant restudy AND a revised application. */
    restudy_revision: first === null || first.correct ? null : relevantRevision,
    accepted: state.accepted,
    correct_rule_application: state.accepted
      ? true
      : state.applications.length > 0
        ? false
        : null,
    strategy,
    reference_sections_used: state.sections_consulted.length,
    cross_reference_depth: state.cross_reference_depth,
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
    application_records: state.applications.map((application) => ({
      ...application,
      posts: { ...application.posts },
      faults: [...application.faults],
      restudy_sections: [...application.restudy_sections],
    })),
    final_config: { posts: { ...state.posts }, selector: state.selector },
    output_delivery: state.output_delivery,
    time_by_phase_ms: { ...state.time_by_phase_ms },
    departures: state.departures,
    reengagement: state.reengagements,
    stop_choice: state.stop_choice,
  };
}

/** Participant-facing unit readout (operational; no item wording). */
export function m21UnitReadout(state: M21CaseState): string {
  const def = m21Def(state);
  const on = def.posts.filter((post) => state.posts[post]);

  return `${def.post_name}s ${def.post_on.split(' ').pop()}: ${on.length === 0 ? 'none' : on.join(' ')} · ${def.selector_name} ${state.selector}`;
}

/** Participant-facing readout of the last application. */
export function m21ApplicationReadout(state: M21CaseState): string {
  const last = state.applications[state.applications.length - 1] ?? null;

  if (last === null) {
    return 'FIT: not attempted';
  }

  if (last.correct) {
    return 'FIT: accepted';
  }

  return `FIT: fails — ${last.faults
    .map((fault) => m21Def(state).fault_labels[fault])
    .join(' · ')}`;
}
