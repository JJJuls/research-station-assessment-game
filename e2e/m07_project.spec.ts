/**
 * Station 080 U24 Part A — M07, the six-stage calibration project
 * (administration `m07-calibration-v2`; owner ruling of 21 October 2026:
 * D-U24-1 M07-1 to M07-4 a, clarification 2, RA-1, RA-2).
 *
 * Groups (verification plan, Part A):
 * - "M07 pure" (A-5, A-6, the check function, the held-back copy): the
 *   window functions driven DIRECTLY in a freshly booted page through the
 *   dev server's module graph (`m07Calibration.ts` imports the runtime and
 *   cannot load in Node). Never ordinary-play evidence.
 * - "M07 extraction" (A-1 to A-4, A-6): the production extractor over named
 *   fixture streams.
 * - "M07 reload" (A-11): RX-1 to RX-8, and the closeout cases (owner
 *   amendment of 22 October 2026, register §5.378): RX-6 held back, RX-10
 *   an earlier review closure, RX-11 a later load after an unverified
 *   hold-back, RX-7k to RX-7m the check's own load and two hold-backs —
 *   each a SEPARATE named fixture stream.
 * - "M07 route" (A-7): S-M07a and S-M07b by ordinary input from the Dock,
 *   at 800 × 600 and 1280 × 720.
 * - "M07 settle" (A-7, §5.378 (2)): the settle refresh with the wall clock
 *   slowed in the page (the surface clock running ahead of it — the
 *   reported mismatch, induced) and an immediate reopening inside the
 *   settle. Fault-induced cases, never ordinary-play evidence.
 * - "M07 reload route" (A-12): S-M07c (keyboard LEAVE, to the review),
 *   S-M07c pointer (pointer LEAVE), the held-back frame at 1280 × 720,
 *   S-M07d (to the review), S-M07e (an earlier review closure; exported
 *   after the screen, because the replay cannot reach a second review once
 *   other items hold back after a completed load) and S-M07f (an
 *   unverified earlier state: the store's meta record removed before the
 *   reload — fault-injected; to the review), each with a genuine
 *   `page.reload()`.
 * - "M07 recount" (A-10, A-11): the independent recount (`m07Recount.ts`)
 *   — its static independence case, every fixture stream, and each saved
 *   Part A export in its own test (the four required, S-M07e and S-M07f).
 *
 * INPUT, stated plainly: walking, doors and station prompts are driven by
 * the existing route drivers with held keys and SPACE (navigation, not an
 * M07 response). Inside the bench S-M07b advances by keyboard (A) in
 * episode 2 and by pointer (clicks) on the return; S-M07d advances by
 * keyboard. The export is the runtime's own export builder read in the
 * page (`buildExportPayload()`) at the review — a HARNESS CAPTURE: the
 * participant export request is sent only at session completion, after
 * the review, so it does not exist at the point the plan names. The owner's
 * narrow evidence-method exception (§5.378 (5)) covers this capture
 * method only; it establishes no participant ingestion or delivery.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  extractItemFeatures,
  type FeatureRecord,
} from '../src/measurement/features';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { closeStationRecord } from './closureHelpers';
import { selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  type M07CheckFields,
  recomputeM07Checks,
  RECOUNT_SPEC,
  type RecountInput,
  recountM07,
  type RecountReason,
} from './m07Recount';
import {
  bootPilot,
  concourseToDeck,
  concourseToWorkshop,
  dockToConcourse,
  expectStage,
  openPromptAt,
  PILOT,
  pilotProbe,
  press,
  valeHandover,
  waitScene,
  walkTo,
  workshopToConcourse,
} from './pilotHelpers';
import {
  clickElement,
  closeSurface,
  exteriorShift,
  keyActivate,
  openWorkshopSurface,
  RETURN,
  returnInside,
  signOffReturnShift,
  surface,
  type SurfaceProbe,
  valeReturnCheckIn,
  waitSurface,
  workshopApproach,
} from './returnHelpers';

const ROOT = join(__dirname, '..');
const FAMILY = 'proto_m07_calibration_';
const OPP = 'proto_m07_calibration_project';
const V2 = 'm07-calibration-v2';
const V1 = 'm07-calibration-v1';
const SURFACE_ID = 'm07_calibration_bench';
const TITLE = 'CALIBRATION BENCH — ROUTINE PROJECT';
const HELD_BACK_LINES = [
  'This calibration bench was opened earlier in this session.',
  'It stays closed after a reload.',
];
const UNVERIFIED_LINES = [
  'The earlier state of this bench could not be verified.',
  'It stays closed after this reload.',
];
const REVIEW_CLOSED_LINES = [
  'This calibration bench was closed at the station review.',
  'It stays closed after a reload.',
];
const RELOAD_DETAIL = 'reload after administration: bench not re-run';
const UNVERIFIED_DETAIL =
  'reload with an unverified earlier state: bench not administered';
const REVIEW_CLOSURE_DETAIL =
  'reload after a review closure: bench not reopened';
/** Questionnaire wording never appears in participant-facing text. */
const FORBIDDEN =
  /works until the task is finished|persistent|neat and tidy|dependable|stick at a task|\bM\d{2}\b|\bQ\d{2}\b|proto_|score/i;

const EVIDENCE =
  process.env.U24_EVIDENCE_DIR ?? join(ROOT, 'test-results', 'u24-evidence');
const A_DIR = join(EVIDENCE, 'A');
const EXPORTS = join(A_DIR, 'exports');
const MANIFEST = join(EXPORTS, 'EXPORTS-SHA256SUMS.txt');

type Viewport = '800x600' | '1280x720';
const SIZE: Record<Viewport, { width: number; height: number }> = {
  '800x600': { width: 800, height: 600 },
  '1280x720': { width: 1280, height: 720 },
};

interface Envelope {
  raw_events: RawGameEvent[];
  prior_page_load_events: RawGameEvent[];
  page_load_index: number;
  event_integrity: { recovered_from_chunks: boolean };
  measurement_features?: FeatureRecord[];
  measurement_validity?: {
    opportunity_id: string;
    validity: string;
    invalid_reason: string | null;
    entry_state_version: string;
    prior_exposure: string[];
  }[];
  pilot_coverage?: { final_core_closed?: boolean };
}

function meta(event: { metadata?: Record<string, unknown> }) {
  return event.metadata ?? {};
}

/* ------------------------------------------------------------------ *
 * Fixture streams
 * ------------------------------------------------------------------ */

type Part =
  | 'filler'
  | [suffix: string, metadata?: Record<string, unknown>, sequence?: unknown];

/** One page load's log: consecutive sequence numbers from `start`. */
function log(load: number, start: number, parts: Part[]): RawGameEvent[] {
  return parts.map((part, index) => {
    const sequence = start + index;

    if (part === 'filler') {
      return {
        session_id: 'GS_FIXTURE',
        game_session_id: 'GS_FIXTURE',
        timestamp_ms: 1000 * sequence,
        scene: 'station_concourse',
        event_type: 'pilot_zone_entered',
        sequence,
        page_load_index: load,
        metadata: { zone: 'station_concourse' },
      };
    }

    const [suffix, metadata, explicit] = part;

    return {
      session_id: 'GS_FIXTURE',
      game_session_id: 'GS_FIXTURE',
      timestamp_ms: 1000 * sequence,
      scene: 'records_workshop',
      event_type: `${FAMILY}${suffix}`,
      sequence: (part.length > 2 ? explicit : sequence) as number,
      page_load_index: load,
      metadata: {
        measure_id: 'M07',
        opportunity_id: OPP,
        entry_state_version: V2,
        window_id: 'm07_calibration_start',
        input_mode: 'system',
        ...metadata,
      },
    };
  });
}

const fill = (count: number): Part[] =>
  Array.from({ length: count }, () => 'filler' as const);
const stage = (n: number): Part => [
  'stage_advanced',
  { stage: n, of: 6, input_mode: 'keyboard' },
];
const stages = (from: number, to: number): Part[] =>
  Array.from({ length: to - from + 1 }, (_, index) => stage(from + index));
const departed = (n: number): Part => ['departed', { stages_completed: n }];
const closedAbsent: Part = [
  'window_closed',
  { exit_state: 'closed_at_review' },
];
const closedWith = (n: number, returns: number): Part => [
  'window_closed',
  {
    exit_state: 'completed',
    raw_components: {
      stages_completed: n,
      completion: n === 6,
      voluntary_returns: returns,
    },
  },
];
const endPresented: Part = [
  'end_presented',
  { start_state: 'missing', stages_completed: 0 },
];
const holdBack: Part = ['technical_failure', { detail: RELOAD_DETAIL }];
const holdBackUnverified: Part = [
  'technical_failure',
  { detail: UNVERIFIED_DETAIL },
];
const holdBackReviewClosure: Part = [
  'technical_failure',
  { detail: REVIEW_CLOSURE_DETAIL },
];
const check = (fields: M07CheckFields, extra: Record<string, unknown> = {}) =>
  ['prior_load_checked', { ...fields, ...extra }] as Part;

/** An earlier page load without the bench (Dock / Concourse records). */
const priorNoBench = (count = 12) => log(1, 1, fill(count));
/** An earlier page load that opened the bench and left it at 2/6. */
const priorOpened2 = () =>
  log(1, 1, [
    ...fill(5),
    ['opportunity_opened'],
    ...stages(1, 2),
    departed(2),
    ...fill(2),
  ]);
/** An earlier page load that completed the bench (6/6, register §5.270). */
const priorCompleted = () =>
  log(1, 1, [
    ...fill(5),
    ['opportunity_opened'],
    ...stages(1, 6),
    closedWith(6, 0),
    'filler',
  ]);

/** An earlier page load whose review closed the bench unopened (§5.378 (4)). */
const priorReviewClosed = () =>
  log(1, 1, [...fill(5), endPresented, 'filler', closedAbsent, 'filler']);

/**
 * A faithful check record for a load after `prior` (§5.290 (a) fields; an
 * earlier hold-back no earlier review closure explains keeps the absence
 * unestablished, §5.379).
 */
function faithful(
  prior: RawGameEvent[],
  continuous: boolean,
  load = 2,
): M07CheckFields {
  const has = (suffix: string, test: (m: Record<string, unknown>) => boolean) =>
    prior.some(
      (event) => event.event_type === `${FAMILY}${suffix}` && test(meta(event)),
    );
  const found = has('opportunity_opened', () => true);
  // §5.381 (2): a review closure explains only the hold-back that names it.
  const reviewClosed = has(
    'window_closed',
    (m) => m.exit_state === 'closed_at_review',
  );
  const unexplained = has(
    'technical_failure',
    (m) =>
      String(m.detail).startsWith('reload') &&
      !(reviewClosed && m.detail === REVIEW_CLOSURE_DETAIL),
  );

  return {
    page_load_index: load,
    prior_page_load_event_count: prior.length,
    prior_opening_found: found,
    prior_end_presented_found: has('end_presented', () => true),
    history_continuous: continuous,
    prior_opening_absence_established: continuous && !found && !unexplained,
  };
}

interface Expectation {
  value: number | null;
  disposition: string;
  reason: RecountReason;
  returns: number | null;
}

interface Fixture {
  name: string;
  /** Plan row the fixture serves. */
  row: string;
  page_load_index: number;
  prior: RawGameEvent[];
  events: RawGameEvent[];
  recovered_from_chunks: boolean;
  expect: Expectation;
  /** The check record is a faithful record (true), deliberately contradictory (false), or absent (null). */
  check: boolean | null;
  /** Exposure-record flag expected on the production row (reload fixtures). */
  consistent?: boolean;
  /** The production row's hold-back kind (a held-back fixture). */
  holdBackKind?:
    | 'prior_opening'
    | 'unverified_history'
    | 'prior_review_closure';
}

const PRESENTED_NOT_ENTERED: Expectation = {
  value: null,
  disposition: 'no_eligible_event',
  reason: 'presented_not_entered',
  returns: null,
};
const NOT_PRESENTED: Expectation = {
  value: null,
  disposition: 'not_presented',
  reason: 'never_presented',
  returns: null,
};
const INTERRUPTED_EARLIER: Expectation = {
  value: null,
  disposition: 'interrupted',
  reason: 'earlier_opening_found',
  returns: null,
};
const INTERRUPTED_REVIEW_CLOSURE: Expectation = {
  value: null,
  disposition: 'interrupted',
  reason: 'earlier_review_closure',
  returns: null,
};
const INTERRUPTED_UNESTABLISHED: Expectation = {
  value: null,
  disposition: 'interrupted',
  reason: 'absence_not_established',
  returns: null,
};
const TECHNICAL: Expectation = {
  value: null,
  disposition: 'technical_failure',
  reason: 'integrity',
  returns: null,
};
const observed = (value: number, returns: number): Expectation => ({
  value,
  disposition: 'observed',
  reason: 'observed_at_milestone',
  returns,
});

function firstLoad(
  name: string,
  row: string,
  parts: Part[],
  expectation: Expectation,
): Fixture {
  return {
    name,
    row,
    page_load_index: 1,
    prior: [],
    events: log(1, 1, parts),
    recovered_from_chunks: false,
    expect: expectation,
    check: null,
  };
}

function reloaded(
  name: string,
  prior: RawGameEvent[],
  parts: Part[],
  expectation: Expectation,
  options: {
    check: boolean | null;
    consistent?: boolean;
    chunks?: boolean;
    start?: number;
    load?: number;
    holdBackKind?: Fixture['holdBackKind'];
  },
): Fixture {
  const load = options.load ?? 2;
  const start =
    options.start ??
    Math.max(
      0,
      ...prior.map((event) =>
        typeof event.sequence === 'number' ? event.sequence : 0,
      ),
    ) + 1;

  return {
    name,
    row: 'A-11',
    page_load_index: load,
    prior,
    events: log(load, start, parts),
    recovered_from_chunks: options.chunks ?? false,
    expect: expectation,
    check: options.check,
    consistent: options.consistent,
    holdBackKind: options.holdBackKind,
  };
}

/** A-1 to A-4: first page loads. */
const FIRST_LOAD: Fixture[] = [
  firstLoad(
    'A1_presented_never_opened',
    'A-1',
    [...fill(3), endPresented, 'filler', closedAbsent],
    PRESENTED_NOT_ENTERED,
  ),
  firstLoad('A1_never_presented', 'A-1', fill(3), NOT_PRESENTED),
  firstLoad(
    'A2_opened_left_at_zero',
    'A-2',
    [
      'filler',
      ['opportunity_opened'],
      departed(0),
      ['end_presented', { start_state: 'present', stages_completed: 0 }],
      closedWith(0, 0),
    ],
    observed(0, 0),
  ),
  firstLoad(
    'A3_three_of_six_two_returns',
    'A-3',
    [
      ['opportunity_opened'],
      stage(1),
      departed(1),
      ['returned', { visit: 2 }],
      stage(2),
      departed(2),
      ['end_presented', { start_state: 'present', stages_completed: 2 }],
      ['returned', { visit: 3 }],
      stage(3),
      departed(3),
      closedWith(3, 2),
    ],
    observed(3, 2),
  ),
  firstLoad(
    'A3_six_in_episode_2',
    'A-3',
    [['opportunity_opened'], ...stages(1, 6), closedWith(6, 0)],
    observed(6, 0),
  ),
  firstLoad(
    'A3_six_across_both_phases',
    'A-3',
    [
      ['opportunity_opened'],
      ...stages(1, 2),
      departed(2),
      ['end_presented', { start_state: 'present', stages_completed: 2 }],
      ['returned', { visit: 2 }],
      ...stages(3, 6),
      closedWith(6, 1),
    ],
    observed(6, 1),
  ),
  firstLoad(
    'A3_pending_project_open',
    'A-3',
    [['opportunity_opened'], stage(1)],
    {
      value: null,
      disposition: 'pending',
      reason: 'project_open',
      returns: null,
    },
  ),
  firstLoad('A3_pending_presented_not_entered', 'A-3', [endPresented], {
    value: null,
    disposition: 'pending',
    reason: 'presented_not_entered',
    returns: null,
  }),
  firstLoad(
    'A4_duplicate_stage',
    'A-4',
    [['opportunity_opened'], stage(1), stage(1), departed(1)],
    TECHNICAL,
  ),
  firstLoad(
    'A4_out_of_order_stage',
    'A-4',
    [['opportunity_opened'], stage(1), stage(3)],
    TECHNICAL,
  ),
  firstLoad(
    'A4_stage_above_six',
    'A-4',
    [['opportunity_opened'], ...stages(1, 6), stage(7), closedWith(6, 0)],
    TECHNICAL,
  ),
  firstLoad(
    'A4_missing_sequence',
    'A-4',
    [
      ['opportunity_opened'],
      stage(1),
      ['stage_advanced', { stage: 2, of: 6 }, undefined],
      closedWith(2, 0),
    ],
    TECHNICAL,
  ),
  firstLoad(
    'A4_malformed_sequence',
    'A-4',
    [
      ['opportunity_opened'],
      ['stage_advanced', { stage: 1, of: 6 }, '2'],
      closedWith(1, 0),
    ],
    TECHNICAL,
  ),
  firstLoad(
    'A4_shared_sequence',
    'A-4',
    [
      ['opportunity_opened', {}, 5],
      ['stage_advanced', { stage: 1, of: 6 }, 5],
      closedWith(1, 0),
    ],
    TECHNICAL,
  ),
  firstLoad(
    'A4_v1_administration',
    'A-4',
    [
      ['opportunity_opened', { entry_state_version: V1 }],
      ['stage_advanced', { stage: 1, of: 6, entry_state_version: V1 }],
      [
        'window_closed',
        {
          exit_state: 'completed',
          entry_state_version: V1,
          raw_components: {
            stages_completed: 1,
            completion: false,
            voluntary_returns: 0,
          },
        },
      ],
    ],
    TECHNICAL,
  ),
  firstLoad(
    'A4_unknown_version',
    'A-4',
    [
      ['opportunity_opened'],
      [
        'stage_advanced',
        { stage: 1, entry_state_version: 'm07-calibration-v9' },
      ],
      closedWith(1, 0),
    ],
    TECHNICAL,
  ),
  firstLoad(
    'A4_other_opportunity',
    'A-4',
    [
      ['opportunity_opened', { opportunity_id: 'proto_m07_other_project' }],
      closedWith(0, 0),
    ],
    TECHNICAL,
  ),
];

/** A-4 (load partitioning): another load's records in the stream are never counted. */
const OTHER_LOAD: Fixture = {
  ...firstLoad(
    'A4_other_load_records_excluded',
    'A-4',
    [...fill(3), endPresented, 'filler', closedAbsent],
    PRESENTED_NOT_ENTERED,
  ),
};
OTHER_LOAD.events = [
  ...OTHER_LOAD.events,
  ...log(2, 40, [['opportunity_opened'], ...stages(1, 3), closedWith(3, 0)]),
];

/** RX-1 to RX-8 (A-11): each a separate named fixture. */
const RELOAD: Fixture[] = [
  firstLoad('RX1_first_load_never_presented', 'A-11', fill(4), NOT_PRESENTED),
  firstLoad(
    'RX1_first_load_never_presented_closed_at_review',
    'A-11',
    [...fill(2), closedAbsent],
    NOT_PRESENTED,
  ),
  firstLoad(
    'RX2_first_load_presented_not_entered_closed_at_review',
    'A-11',
    [...fill(3), endPresented, 'filler', closedAbsent],
    PRESENTED_NOT_ENTERED,
  ),
  reloaded(
    'RX3_confirmed_absence_presented_closed_at_review',
    priorNoBench(),
    [
      ...fill(3),
      check(faithful(priorNoBench(), true)),
      'filler',
      endPresented,
      'filler',
      closedAbsent,
    ],
    PRESENTED_NOT_ENTERED,
    { check: true, consistent: true },
  ),
  reloaded(
    'RX3_confirmed_absence_never_presented',
    priorNoBench(),
    [...fill(3), check(faithful(priorNoBench(), true))],
    NOT_PRESENTED,
    { check: true, consistent: true },
  ),
  reloaded(
    'RX4_first_opening_after_confirmed_absence',
    priorNoBench(),
    [
      ...fill(3),
      check(faithful(priorNoBench(), true)),
      'filler',
      ['opportunity_opened'],
      ...stages(1, 4),
      departed(4),
      ['end_presented', { start_state: 'present', stages_completed: 4 }],
      closedWith(4, 0),
    ],
    observed(4, 0),
    { check: true, consistent: true },
  ),
  reloaded(
    'RX5a_earlier_opening_two_of_six',
    priorOpened2(),
    [...fill(3), check(faithful(priorOpened2(), true)), holdBack],
    INTERRUPTED_EARLIER,
    { check: true, consistent: true, holdBackKind: 'prior_opening' },
  ),
  reloaded(
    'RX5b_earlier_opening_completed',
    priorCompleted(),
    [...fill(3), check(faithful(priorCompleted(), true)), holdBack],
    INTERRUPTED_EARLIER,
    { check: true, consistent: true, holdBackKind: 'prior_opening' },
  ),
  ...rx6Variants(),
  ...rx7Variants(),
  ...rx10Variants(),
  ...rx11Variants(),
  reloaded(
    'RX8_reloaded_load_never_entering_the_workshop',
    priorNoBench(),
    fill(3),
    INTERRUPTED_UNESTABLISHED,
    { check: null, consistent: true },
  ),
];

/**
 * RX-6 (§5.378 (3), conservative hold-back): an incomplete history holds
 * the bench back — the check, then the hold-back record, and nothing else
 * of the bench in the load (no presentation, no review closure).
 */
function rx6Variants(): Fixture[] {
  const held: Part[] = [holdBackUnverified, ...fill(2)];
  const gap = priorNoBench().filter((event) => event.sequence !== 5);
  const lateStart = log(1, 3, fill(12));
  const duplicate = [...priorNoBench(), ...log(1, 4, ['filler'])];
  const unverified = {
    check: true,
    consistent: true,
    holdBackKind: 'unverified_history',
  } as const;

  return [
    reloaded(
      'RX6a_incomplete_history_sequence_gap',
      gap,
      [...fill(3), check(faithful(gap, false)), ...held],
      INTERRUPTED_UNESTABLISHED,
      { ...unverified, start: 13 },
    ),
    reloaded(
      'RX6b_incomplete_history_first_sequence_not_1',
      lateStart,
      [...fill(3), check(faithful(lateStart, false)), ...held],
      INTERRUPTED_UNESTABLISHED,
      unverified,
    ),
    reloaded(
      'RX6c_incomplete_history_duplicate',
      duplicate,
      [...fill(3), check(faithful(duplicate, false)), ...held],
      INTERRUPTED_UNESTABLISHED,
      { ...unverified, start: 13 },
    ),
    reloaded(
      'RX6d_incomplete_history_recovered_from_chunks',
      priorNoBench(),
      [...fill(3), check(faithful(priorNoBench(), false)), ...held],
      INTERRUPTED_UNESTABLISHED,
      { ...unverified, chunks: true },
    ),
    reloaded(
      'RX6e_incomplete_history_zero_earlier_records',
      [],
      [...fill(3), check(faithful([], false)), ...held],
      INTERRUPTED_UNESTABLISHED,
      unverified,
    ),
    // A log the amended runtime cannot write: the bench opened after an
    // unestablished absence. Never counted; it contradicts the hold-back.
    reloaded(
      'RX6f_opening_after_unestablished_absence_contradicts_the_hold_back',
      gap,
      [
        ...fill(3),
        check(faithful(gap, false)),
        'filler',
        ['opportunity_opened'],
        ...stages(1, 2),
        departed(2),
        ['end_presented', { start_state: 'present', stages_completed: 2 }],
        closedWith(2, 0),
      ],
      INTERRUPTED_UNESTABLISHED,
      { check: true, consistent: false, start: 13 },
    ),
  ];
}

/**
 * RX-10 (§5.378 (4)): an earlier review closure of the unopened bench is
 * terminal — verified only with the absence established.
 */
function rx10Variants(): Fixture[] {
  const closed = priorReviewClosed();
  const closedGap = closed.filter((event) => event.sequence !== 3);
  const thirdPrior = [
    ...closed,
    ...log(2, 10, [
      ...fill(3),
      check(faithful(closed, true)),
      holdBackReviewClosure,
      ...fill(2),
    ]),
  ];
  // §5.381 (2): load 2 could not verify its history (its store meta was
  // unreadable), so the older closure does not make load 3 "verified".
  const unverifiedThird = [
    ...closed,
    ...log(2, 10, [
      ...fill(3),
      check(faithful(closed, false)),
      holdBackUnverified,
      ...fill(2),
    ]),
  ];

  return [
    reloaded(
      'RX10a_earlier_review_closure_terminal',
      closed,
      [...fill(3), check(faithful(closed, true)), holdBackReviewClosure],
      INTERRUPTED_REVIEW_CLOSURE,
      {
        check: true,
        consistent: true,
        holdBackKind: 'prior_review_closure',
      },
    ),
    reloaded(
      'RX10b_earlier_review_closure_with_an_unverified_history',
      closedGap,
      [...fill(3), check(faithful(closedGap, false)), holdBackUnverified],
      INTERRUPTED_UNESTABLISHED,
      {
        check: true,
        consistent: true,
        start: 10,
        holdBackKind: 'unverified_history',
      },
    ),
    reloaded(
      'RX10c_third_load_after_a_review_closure_hold_back',
      thirdPrior,
      [...fill(2), check(faithful(thirdPrior, true, 3)), holdBackReviewClosure],
      INTERRUPTED_REVIEW_CLOSURE,
      {
        check: true,
        consistent: true,
        load: 3,
        holdBackKind: 'prior_review_closure',
      },
    ),
    reloaded(
      'RX10d_third_load_after_a_review_closure_then_an_unverified_hold_back',
      unverifiedThird,
      [
        ...fill(2),
        check(faithful(unverifiedThird, true, 3)),
        holdBackUnverified,
      ],
      INTERRUPTED_UNESTABLISHED,
      {
        check: true,
        consistent: true,
        load: 3,
        holdBackKind: 'unverified_history',
      },
    ),
  ];
}

/**
 * RX-11 (§5.379): a later load after an unverified hold-back — its history
 * now continuous — still cannot establish the absence before that load.
 */
function rx11Variants(): Fixture[] {
  const prior = [
    ...priorNoBench(),
    ...log(2, 13, [
      ...fill(3),
      check(faithful(priorNoBench(), false)),
      holdBackUnverified,
      ...fill(2),
    ]),
  ];

  return [
    reloaded(
      'RX11_later_load_after_an_unverified_hold_back',
      prior,
      [...fill(2), check(faithful(prior, true, 3)), holdBackUnverified],
      INTERRUPTED_UNESTABLISHED,
      {
        check: true,
        consistent: true,
        load: 3,
        holdBackKind: 'unverified_history',
      },
    ),
  ];
}

function rx7Variants(): Fixture[] {
  const tail: Part[] = ['filler', endPresented, 'filler', closedAbsent];
  const none = priorNoBench();
  const opened = priorOpened2();
  const established = faithful(none, true);

  return [
    reloaded(
      'RX7a_check_established_while_not_continuous',
      none,
      [
        ...fill(3),
        check({ ...established, history_continuous: false }),
        ...tail,
      ],
      INTERRUPTED_UNESTABLISHED,
      { check: false, consistent: false },
    ),
    reloaded(
      'RX7b_check_established_while_opening_found',
      opened,
      [
        ...fill(3),
        check({
          ...faithful(opened, true),
          prior_opening_absence_established: true,
        }),
        ...tail,
      ],
      INTERRUPTED_UNESTABLISHED,
      { check: false, consistent: false },
    ),
    reloaded(
      'RX7c_check_established_with_no_earlier_record',
      [],
      [
        ...fill(3),
        check({
          ...faithful([], false),
          history_continuous: true,
          prior_opening_absence_established: true,
        }),
        ...tail,
      ],
      INTERRUPTED_UNESTABLISHED,
      { check: false, consistent: false },
    ),
    reloaded(
      'RX7d_two_checks_in_one_load',
      none,
      [...fill(3), check(established), check(established), ...tail],
      INTERRUPTED_UNESTABLISHED,
      { check: true, consistent: false },
    ),
    {
      name: 'RX7e_check_on_a_first_page_load',
      row: 'A-11',
      page_load_index: 1,
      prior: [],
      events: log(1, 1, [...fill(3), check(faithful([], false, 1)), ...tail]),
      recovered_from_chunks: false,
      expect: PRESENTED_NOT_ENTERED,
      check: true,
      consistent: false,
    },
    // The check claims an established absence while the earlier load holds
    // an opening: the hold-back decides, the contradiction is flagged.
    reloaded(
      'RX7f_check_claiming_absence_beside_the_hold_back',
      opened,
      [
        ...fill(3),
        check({
          ...faithful(opened, true),
          prior_opening_found: false,
          prior_opening_absence_established: true,
        }),
        holdBack,
      ],
      INTERRUPTED_EARLIER,
      { check: false, consistent: false, holdBackKind: 'prior_opening' },
    ),
    reloaded(
      'RX7g_check_found_opening_beside_an_opening_of_this_load',
      opened,
      [
        ...fill(3),
        check(faithful(opened, true)),
        'filler',
        ['opportunity_opened'],
        stage(1),
        departed(1),
        closedWith(1, 0),
      ],
      INTERRUPTED_UNESTABLISHED,
      { check: true, consistent: false },
    ),
    reloaded(
      'RX7h_integrity_check_without_a_usable_sequence',
      none,
      [
        ...fill(3),
        ['prior_load_checked', { ...established }, undefined],
        ...tail,
      ],
      TECHNICAL,
      { check: null },
    ),
    reloaded(
      'RX7i_integrity_check_of_another_opportunity',
      none,
      [
        ...fill(3),
        check(established, { opportunity_id: 'proto_m07_other_project' }),
        ...tail,
      ],
      TECHNICAL,
      { check: null },
    ),
    reloaded(
      'RX7j_integrity_check_of_another_version',
      none,
      [
        ...fill(3),
        check(established, { entry_state_version: 'm07-calibration-v9' }),
        ...tail,
      ],
      TECHNICAL,
      { check: null },
    ),
    // §5.378 (6): the check's own page-load field names another load.
    reloaded(
      'RX7k_integrity_check_payload_names_another_load',
      none,
      [...fill(3), check({ ...established, page_load_index: 3 }), ...tail],
      TECHNICAL,
      { check: false },
    ),
    reloaded(
      'RX7l_integrity_check_payload_names_another_load_beside_the_hold_back',
      opened,
      [
        ...fill(3),
        check({ ...faithful(opened, true), page_load_index: 1 }),
        holdBack,
      ],
      TECHNICAL,
      { check: false },
    ),
    reloaded(
      'RX7m_integrity_two_hold_back_records',
      opened,
      [...fill(3), check(faithful(opened, true)), holdBack, holdBack],
      TECHNICAL,
      { check: true },
    ),
  ];
}

const ALL_FIXTURES: Fixture[] = [...FIRST_LOAD, OTHER_LOAD, ...RELOAD];

function production(fixture: Fixture) {
  const context = {
    finalCoreClosed: true,
    pageLoadIndex: fixture.page_load_index,
    reloaded: fixture.page_load_index > 1,
  };

  return extractItemFeatures('M07', fixture.events, context);
}

/** Production's reason, mapped to the recount's vocabulary (a marker per class). */
function reasonClass(row: FeatureRecord): RecountReason {
  const reason = row.missing_reason ?? '';

  if (row.disposition === 'observed') {
    return 'observed_at_milestone';
  }

  if (row.disposition === 'technical_failure') {
    return 'integrity';
  }

  if (reason === 'presented_not_entered') {
    return 'presented_not_entered';
  }

  if (reason.includes('still open')) {
    return 'project_open';
  }

  if (reason.includes('earlier page load; not re-run')) {
    return 'earlier_opening_found';
  }

  if (reason.includes('closed at the station review in an earlier page load')) {
    return 'earlier_review_closure';
  }

  if (reason.includes('absence of an earlier opening not established')) {
    return 'absence_not_established';
  }

  if (reason.includes('never presented')) {
    return 'never_presented';
  }

  throw new Error(`unmapped production reason: ${reason}`);
}

function expectRows(rows: FeatureRecord[], expectation: Expectation) {
  const [primary, returns] = rows;

  expect(primary.feature_id).toBe('m07_stages_completed');
  expect(returns.feature_id).toBe('m07_returns');
  expect(primary.value).toBe(expectation.value);
  expect(primary.disposition).toBe(expectation.disposition);
  expect(reasonClass(primary)).toBe(expectation.reason);
  expect(primary.numerator).toBe(expectation.value);
  expect(primary.denominator).toBe(expectation.value === null ? null : 6);
  expect(returns.value).toBe(expectation.returns);
  expect(returns.disposition).toBe(expectation.disposition);

  // Missingness is never a zero.
  if (expectation.disposition !== 'observed') {
    expect(primary.value).toBeNull();
    expect(returns.value).toBeNull();
  }
}

function recountInput(fixture: Fixture): RecountInput {
  return {
    raw_events: fixture.events,
    prior_page_load_events: fixture.prior,
    page_load_index: fixture.page_load_index,
    game_session_id: 'GS_FIXTURE',
  };
}

/* ------------------------------------------------------------------ *
 * Page helpers (route groups)
 * ------------------------------------------------------------------ */

/** The runtime's own export envelope, read in the page (harness read). */
async function pagePayload(page: Page): Promise<Envelope> {
  const json = await page.evaluate(`(async () => {
    const mod = await import('/src/systems/index.ts');
    return JSON.stringify(mod.researchRuntime.buildExportPayload());
  })()`);

  return JSON.parse(json as string) as Envelope;
}

function m07Rows(envelope: Envelope): FeatureRecord[] {
  return (envelope.measurement_features ?? []).filter(
    (row) => row.item_id === 'M07',
  );
}

/**
 * L1 (same code): the production extractor re-run in this process over
 * the exported raw events equals the export's own M07 rows — determinism
 * and log-only derivation, not independence.
 */
function reproduce(envelope: Envelope): FeatureRecord[] {
  const before = JSON.stringify(envelope.raw_events);
  const offline = JSON.parse(
    JSON.stringify(
      extractItemFeatures('M07', envelope.raw_events, {
        finalCoreClosed: envelope.pilot_coverage?.final_core_closed === true,
        pageLoadIndex: envelope.page_load_index,
        reloaded: envelope.page_load_index > 1,
      }),
    ),
  ) as FeatureRecord[];
  const own = m07Rows(envelope);

  expect(own, 'the export carries both M07 rows').toHaveLength(2);
  expect(offline, "offline extraction equals the export's M07 rows").toEqual(
    own,
  );
  expect(JSON.stringify(envelope.raw_events)).toBe(before);

  return own;
}

function family(events: readonly RawGameEvent[]): RawGameEvent[] {
  return events.filter((event) => event.event_type.startsWith(FAMILY));
}

function suffixes(events: readonly RawGameEvent[]): string[] {
  return family(events).map((event) => event.event_type.slice(FAMILY.length));
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Saves a full export; the 800 × 600 exports enter the pinned manifest. */
function saveExport(name: string, envelope: Envelope, viewport: Viewport) {
  const dir = viewport === '800x600' ? EXPORTS : join(EXPORTS, viewport);
  const text = JSON.stringify(envelope, null, 2);

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.json`), text);

  if (viewport !== '800x600') {
    return;
  }

  const lines = existsSync(MANIFEST)
    ? readFileSync(MANIFEST, 'utf8')
        .split('\n')
        .filter(
          (line) => line.trim() !== '' && !line.endsWith(` *${name}.json`),
        )
    : [];

  lines.push(`${sha256(text)} *${name}.json`);
  lines.sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
  writeFileSync(MANIFEST, `${lines.join('\n')}\n`);
}

/** The M07 rows without the two fields that index the run's own log. */
function runIndependent(rows: FeatureRecord[]) {
  return rows.map((row) => {
    const components = JSON.parse(JSON.stringify(row.components)) as {
      exposure?: { opened_sequence?: unknown };
    };

    if (components.exposure !== undefined) {
      delete components.exposure.opened_sequence;
    }

    return { ...row, supporting_sequences: [], components };
  });
}

/** A frame: the JSON sidecar is written immediately before the capture. */
async function frame(
  page: Page,
  viewport: Viewport,
  name: string,
  note: Record<string, unknown> = {},
) {
  const dir = join(A_DIR, 'frames', viewport);
  const probe = await surface(page);
  const pilot = await pilotProbe(page);

  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${name}.json`),
    JSON.stringify(
      {
        frame: name,
        viewport: SIZE[viewport],
        captured_at: new Date().toISOString(),
        stage: pilot?.stage ?? null,
        zone: pilot?.zone ?? null,
        surface: probe,
        ...note,
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: join(dir, `${name}.png`) });
}

/**
 * A wait budget, not an assertion: the post-settle re-render rides the
 * surface scene's Phaser timer, whose scene time runs far slower than wall
 * time under the software renderer at 1280 × 720 (a first development run
 * exceeded the helpers' 20 s; `returnHelpers.ts` records > 8 s at 800 × 600).
 */
const SETTLE_WAIT_MS = 60_000;

async function waitTileDone(page: Page, n: number) {
  await page.waitForFunction(
    (id) =>
      (
        window as unknown as {
          __workSurfaceProbe?: {
            elements: { id: string; state: string }[];
          } | null;
        }
      ).__workSurfaceProbe?.elements.find((e) => e.id === id)?.state === 'done',
    `stage_${n}`,
    { timeout: SETTLE_WAIT_MS },
  );
}

/**
 * Ready = the accent state: while settling ADVANCE is `idle` and focusable
 * (REG §5.381 (1)), and `disabled` only once the project is complete.
 */
async function waitAdvanceReady(page: Page) {
  await page
    .waitForFunction(
      () =>
        (
          window as unknown as {
            __workSurfaceProbe?: {
              elements: { id: string; state: string }[];
            } | null;
          }
        ).__workSurfaceProbe?.elements.find((e) => e.id === 'advance')
          ?.state === 'accent',
      undefined,
      { timeout: SETTLE_WAIT_MS },
    )
    .catch(async (error: Error) => {
      const state = await page.evaluate(`(async () => {
      const m07 = await import('/src/pilot/windows/m07Calibration.ts');
      const s = m07.m07State();
      return JSON.stringify({ now: Date.now(), state: s,
        probe: window.__workSurfaceProbe ?? null });
    })()`);

      throw new Error(`${error.message}\nM07 state at the timeout: ${state}`);
    });
}

/** Advances `count` stages by KEYBOARD (the bench's A hotkey). */
async function advanceByKeyboard(page: Page, from: number, count: number) {
  for (let index = 1; index <= count; index += 1) {
    await waitAdvanceReady(page);
    await press(page, 'a');
    await waitTileDone(page, from + index);
    await page.waitForTimeout(300);
  }
}

/** Advances `count` stages by POINTER (clicks on ADVANCE). */
async function advanceByPointer(page: Page, from: number, count: number) {
  for (let index = 1; index <= count; index += 1) {
    await waitAdvanceReady(page);
    await clickElement(page, 'advance');
    await waitTileDone(page, from + index);
    await page.waitForTimeout(300);
  }
}

async function openBench(page: Page) {
  await openWorkshopSurface(page, 'calibrationBench', SURFACE_ID);
}

/** Opening → Dock tutorial → Concourse → Vale → Records Workshop (stage `workshop`). */
async function dockToWorkshop(page: Page) {
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await valeHandover(page);
  await concourseToWorkshop(page);
}

/** Work Order Board: take the orders (→ workshop_work), then onto the lane. */
async function takeOrders(page: Page) {
  await workshopApproach(page, 'board');
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_work');
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
}

/** Board sign-off (→ lab_briefing), back to the Concourse. */
async function signOffFirstShift(page: Page) {
  await workshopApproach(page, 'board');
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'lab_briefing');
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
  await workshopToConcourse(page);
}

/** Laboratory → Yard → the ONE purposeful return → Vale → the Workshop (workshop_return). */
async function exteriorAndReturn(page: Page) {
  await exteriorShift(page, 'none');
  await returnInside(page);
  await valeReturnCheckIn(page);
}

/** Return-shift sign-off → Concourse → Utility Deck → the station-record closure. */
async function returnToReview(page: Page) {
  await signOffReturnShift(page);
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
  await workshopToConcourse(page);
  await concourseToDeck(page);
  await expectStage(page, 'deck_closure');
  await closeStationRecord(page);
}

async function reloadPage(page: Page) {
  await page.reload();
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __pilotOpeningProbe?: { open: boolean } | null;
        }
      ).__pilotOpeningProbe?.open === true,
    undefined,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(600);
  await press(page, 'Space');
  await waitScene(page, 'dock', 60_000);
  await page.waitForTimeout(1600);
}

/**
 * A held-back screen exactly as the owner words it (RA-2; §5.378 (3) / (4)):
 * the title, the kind's two lines, LEAVE only.
 */
function expectHeldBackScreen(
  probe: SurfaceProbe | null,
  lines: readonly string[] = HELD_BACK_LINES,
) {
  expect(probe?.open).toBe(true);
  expect(probe?.surface_id).toBe(SURFACE_ID);
  expect(probe?.title).toBe(TITLE);
  expect(probe?.status).toBe(lines.join('\n'));
  expect(probe?.elements.map((element) => element.id)).toEqual(['leave']);

  const text = [
    probe?.title,
    probe?.status,
    ...(probe?.elements ?? []).map((element) => element.label),
  ].join('\n');

  // No start, advance, resume, complete or reset action; no 0/6.
  expect(text).not.toMatch(/\d\s*\/\s*6|stage|advance|resume|complete|reset/i);
  expect(text).not.toMatch(FORBIDDEN);
}

/** The guidance predicate of the bench, read in the page (route flag). */
async function benchGuidanceDone(page: Page): Promise<boolean> {
  return (await page.evaluate(`(async () => {
    const route = await import('/src/pilot/pilotRoute.ts');
    const bench = route
      .pilotStationsInZone('records_workshop')
      .find((station) => station.id === 'calibration_bench');
    return bench === undefined ? null : bench.isDone();
  })()`)) as boolean;
}

/* ================================================================== *
 * M07 pure (A-5 and the window's own functions; in-page, never ordinary play)
 * ================================================================== */

test.describe('M07 pure', () => {
  /** Boots a fresh page to the opening overlay (no route state touched). */
  async function fresh(page: Page, tag: string) {
    await bootPilot(page, tag, { skipOpening: false });
  }

  async function run(page: Page, body: string): Promise<unknown> {
    const json = await page.evaluate(`(async () => {
      const m07 = await import('/src/pilot/windows/m07Calibration.ts');
      const validity = await import('/src/measurement/validity.ts');
      const systems = await import('/src/systems/index.ts');
      const record = () => validity.serializeOpportunities()
        .find((r) => r.opportunity_id === '${OPP}') ?? null;
      const events = () => systems.researchRuntime.getEvents()
        .filter((e) => e.event_type.startsWith('${FAMILY}'));
      const result = await (async () => { ${body} })();
      return JSON.stringify(result);
    })()`);

    return JSON.parse(json as string);
  }

  test('A-5: the review closes a presented, never-opened bench as absent — closed, closed_at_review, participant_absent; no opening, no completed closure, no value', async ({
    page,
  }) => {
    await fresh(page, 'u24a_p1');

    const out = (await run(
      page,
      `
      const now = Date.now();
      m07.declareM07();
      m07.presentM07End(now);
      m07.closeM07AtReview(now + 10);
      const advanced = m07.advanceM07(now + 20, 'keyboard');
      return {
        status: m07.m07Window.windowStatus(),
        exit: m07.m07Window.exit(),
        record: record(),
        events: events(),
        advanced,
        payload: systems.researchRuntime.buildExportPayload().measurement_features
          .filter((r) => r.item_id === 'M07'),
      };`,
    )) as {
      status: string;
      exit: string;
      record: { validity: string; invalid_reason: string; entered: boolean };
      events: RawGameEvent[];
      advanced: boolean;
      payload: FeatureRecord[];
    };

    expect(out.status).toBe('closed');
    expect(out.exit).toBe('closed_at_review');
    expect(out.record.validity).toBe('missing');
    expect(out.record.invalid_reason).toBe('participant_absent');
    expect(out.record.entered).toBe(false);
    expect(suffixes(out.events)).toEqual(['end_presented', 'window_closed']);
    expect(meta(out.events[1]).exit_state).toBe('closed_at_review');
    expect(meta(out.events[1]).raw_components).toBeUndefined();
    expect(
      out.events.every((event) => meta(event).entry_state_version === V2),
    ).toBe(true);
    expect(out.advanced).toBe(false);
    expectRows(out.payload, PRESENTED_NOT_ENTERED);
  });

  test('A-5: a bench never presented and never opened closes absent at the review (not_presented); an entered unfinished project closes as an observed value', async ({
    page,
  }) => {
    await fresh(page, 'u24a_p2');

    const absent = (await run(
      page,
      `
      m07.closeM07AtReview(Date.now());
      return { exit: m07.m07Window.exit(), events: events(),
        rows: systems.researchRuntime.buildExportPayload().measurement_features
          .filter((r) => r.item_id === 'M07') };`,
    )) as { exit: string; events: RawGameEvent[]; rows: FeatureRecord[] };

    expect(absent.exit).toBe('closed_at_review');
    expect(suffixes(absent.events)).toEqual(['window_closed']);
    expectRows(absent.rows, NOT_PRESENTED);
    expect(absent.rows[0].closure_reason).toBe('closed_at_review');

    // A fresh page load: the first case's records must not share the load
    // the outcome row below is read from.
    await fresh(page, 'u24a_p2b');

    const entered = (await run(
      page,
      `
      const now = Date.now();
      m07.openM07(now, 'workshop_work');
      m07.advanceM07(now + 5, 'pointer');
      m07.closeM07Surface(now + 2000);
      m07.closeM07AtReview(now + 3000);
      const closed = events().filter((e) => e.event_type === '${FAMILY}window_closed');
      return { exit: m07.m07Window.exit(), last: closed[closed.length - 1],
        rows: systems.researchRuntime.buildExportPayload().measurement_features
          .filter((r) => r.item_id === 'M07') };`,
    )) as { exit: string; last: RawGameEvent; rows: FeatureRecord[] };

    expect(entered.exit).toBe('completed');
    expect(meta(entered.last).exit_state).toBe('completed');
    expect(meta(entered.last).raw_components).toMatchObject({
      stages_completed: 1,
      completion: false,
      voluntary_returns: 0,
    });
    // The outcome row of the in-page closure (Fable finding 8): an entered,
    // unfinished project is the observed 1/6 at the review, not censored.
    expectRows(entered.rows, observed(1, 0));
    expect(entered.rows[0].closure_reason).toBe('closed_at_review');
    expect(entered.rows[0].censored).toBe(false);
  });

  test('the reload guard on a first page load writes no check and holds nothing back; the check function follows §5.290 (a) as adapted by RA-1', async ({
    page,
  }) => {
    await fresh(page, 'u24a_p3');

    const out = (await run(
      page,
      `
      const held = m07.guardM07Reload();
      const integrity = (first, gaps, dups, chunks) => ({
        first_sequence: first, sequence_gap_count: gaps,
        sequence_duplicate_count: dups, recovered_from_chunks: chunks });
      const prior = [{ event_type: 'pilot_zone_entered' },
        { event_type: '${FAMILY}end_presented' }];
      const opened = [...prior, { event_type: '${FAMILY}opportunity_opened' }];
      const completed = [...opened,
        { event_type: '${FAMILY}window_closed',
          metadata: { exit_state: 'completed' } }];
      const reviewClosed = [...prior,
        { event_type: '${FAMILY}window_closed',
          metadata: { exit_state: 'closed_at_review' } }];
      const unverifiedHold = { event_type: '${FAMILY}technical_failure',
        metadata: { detail: m07.M07_RELOAD_DETAILS.unverified_history } };
      const reviewHold = { event_type: '${FAMILY}technical_failure',
        metadata: { detail: m07.M07_RELOAD_DETAILS.prior_review_closure } };
      return {
        held, heldBack: m07.m07HeldBack(), events: events(),
        index: systems.researchRuntime.getPageLoadIndex(),
        continuous: m07.m07PriorLoadCheck(2, prior, integrity(1, 0, 0, false)),
        found: m07.m07PriorLoadCheck(3, opened, integrity(1, 0, 0, false)),
        gap: m07.m07PriorLoadCheck(2, prior, integrity(1, 1, 0, false)),
        late: m07.m07PriorLoadCheck(2, prior, integrity(2, 0, 0, false)),
        dup: m07.m07PriorLoadCheck(2, prior, integrity(1, 0, 1, false)),
        chunks: m07.m07PriorLoadCheck(2, prior, integrity(1, 0, 0, true)),
        empty: m07.m07PriorLoadCheck(2, [], integrity(1, 0, 0, false)),
        // §5.379: an earlier unverified hold-back keeps the absence
        // unestablished; one beside an earlier review closure does not.
        carried: m07.m07PriorLoadCheck(3, [...prior, unverifiedHold],
          integrity(1, 0, 0, false)),
        reviewed: m07.m07PriorLoadCheck(3, [...reviewClosed, reviewHold],
          integrity(1, 0, 0, false)),
        // §5.381 (2): an older closure never explains an intervening
        // unverified hold-back, and a closure detail without the closure
        // on record explains nothing.
        closedThenUnverified: m07.m07PriorLoadCheck(3,
          [...reviewClosed, unverifiedHold], integrity(1, 0, 0, false)),
        detailWithoutClosure: m07.m07PriorLoadCheck(3, [...prior, reviewHold],
          integrity(1, 0, 0, false)),
        // The hold-back decision (§5.14, §5.270, §5.378 (3) / (4)); RX-5b:
        // a completed earlier load holds the bench back like any opening.
        decide: Object.fromEntries(Object.entries({
          none: prior, opened, completed, reviewClosed,
          carried: [...prior, unverifiedHold],
          closedThenUnverified: [...reviewClosed, unverifiedHold],
          detailWithoutClosure: [...prior, reviewHold],
        }).map(([key, events]) => {
          const continuous = m07.m07PriorLoadCheck(2, events,
            integrity(1, 0, 0, false));
          const broken = m07.m07PriorLoadCheck(2, events,
            integrity(1, 1, 0, false));
          return [key, [m07.m07ReloadHoldBack(events, continuous),
            m07.m07ReloadHoldBack(events, broken)]];
        })),
      };`,
    )) as Record<string, unknown> & { events: RawGameEvent[] };

    expect(out.index).toBe(1);
    expect(out.held).toBe(false);
    expect(out.heldBack).toBe(false);
    expect(out.events).toEqual([]);
    expect(out.continuous).toEqual({
      page_load_index: 2,
      prior_page_load_event_count: 2,
      prior_opening_found: false,
      prior_end_presented_found: true,
      history_continuous: true,
      prior_opening_absence_established: true,
    });
    expect(out.found).toMatchObject({
      prior_opening_found: true,
      history_continuous: true,
      prior_opening_absence_established: false,
    });

    for (const key of ['gap', 'late', 'dup', 'chunks', 'empty']) {
      expect(out[key], key).toMatchObject({
        prior_opening_found: false,
        history_continuous: false,
        prior_opening_absence_established: false,
      });
    }

    expect(out.carried).toMatchObject({
      prior_opening_found: false,
      history_continuous: true,
      prior_opening_absence_established: false,
    });
    expect(out.reviewed).toMatchObject({
      prior_opening_found: false,
      history_continuous: true,
      prior_opening_absence_established: true,
    });

    for (const key of ['closedThenUnverified', 'detailWithoutClosure']) {
      expect(out[key], key).toMatchObject({
        prior_opening_found: false,
        history_continuous: true,
        prior_opening_absence_established: false,
      });
    }
    // [continuous history, broken history] per earlier record set.
    expect(out.decide).toEqual({
      none: [null, 'unverified_history'],
      opened: ['prior_opening', 'prior_opening'],
      completed: ['prior_opening', 'prior_opening'],
      reviewClosed: ['prior_review_closure', 'unverified_history'],
      carried: ['unverified_history', 'unverified_history'],
      closedThenUnverified: ['unverified_history', 'unverified_history'],
      detailWithoutClosure: ['unverified_history', 'unverified_history'],
    });
  });

  test('RA-2 / §5.378: each held-back screen is the title, the owner’s two lines exactly and LEAVE only; no participant-facing M07 text carries questionnaire wording', async ({
    page,
  }) => {
    await fresh(page, 'u24a_p4');

    const out = JSON.parse(
      (await page.evaluate(`(async () => {
        const surfaces = await import('/src/pilot/windows/surfaceModels.ts');
        let closed = 0;
        const host = { now: () => Date.now(), close: () => { closed += 1; },
          feedback: () => undefined };
        const screens = Object.fromEntries(
          ['prior_opening', 'unverified_history', 'prior_review_closure']
            .map((kind) => {
              const model = surfaces.m07HeldBackSurfaceModel(host, kind);
              model.elements.forEach((element) => element.onActivate?.('keyboard'));
              return [kind, { ...model, elements: model.elements.map(
                (element) => ({ id: element.id, label: element.label,
                  kind: element.kind, hotkey: element.hotkey ?? null })) }];
            }));
        return JSON.stringify({ closed, screens,
          lines: [surfaces.M07_HELD_BACK_LINES,
            surfaces.M07_UNVERIFIED_HISTORY_LINES,
            surfaces.M07_REVIEW_CLOSED_LINES] });
      })()`)) as string,
    ) as {
      closed: number;
      lines: string[][];
      screens: Record<
        string,
        {
          title: string;
          subtitle?: string;
          status: string;
          help: string;
          elements: { id: string; label: string; hotkey: string | null }[];
        }
      >;
    };

    expect(out.lines).toEqual([
      HELD_BACK_LINES,
      UNVERIFIED_LINES,
      REVIEW_CLOSED_LINES,
    ]);
    expect(out.closed).toBe(3);

    for (const [kind, lines] of [
      ['prior_opening', HELD_BACK_LINES],
      ['unverified_history', UNVERIFIED_LINES],
      ['prior_review_closure', REVIEW_CLOSED_LINES],
    ] as const) {
      const screen = out.screens[kind];

      expect(screen.title, kind).toBe(TITLE);
      expect(screen.subtitle, kind).toBeUndefined();
      expect(screen.status, kind).toBe(lines.join('\n'));
      expect(screen.elements, kind).toEqual([
        { id: 'leave', label: 'Leave bench', kind: 'button', hotkey: null },
      ]);
      expect(screen.help, kind).not.toMatch(/advance/i);
      expect(
        [screen.title, screen.status, screen.elements[0].label].join('\n'),
        kind,
      ).not.toMatch(/\d\s*\/\s*6|stage|advance|resume|complete|reset/i);
    }

    const source = readFileSync(
      join(ROOT, 'src/pilot/windows/surfaceModels.ts'),
      'utf8',
    );
    const m07Section = source.slice(
      source.indexOf('// ——— M07 calibration bench'),
    );

    for (const literal of m07Section.match(/'[^'\n]*'/g) ?? []) {
      expect(literal).not.toMatch(
        /works until the task is finished|persistent|\bQ\d{2}\b/i,
      );
    }
  });
});

/* ================================================================== *
 * M07 extraction (A-1 to A-4, A-6)
 * ================================================================== */

test.describe('M07 extraction', () => {
  for (const fixture of [...FIRST_LOAD, OTHER_LOAD]) {
    test(`${fixture.row} ${fixture.name} (fixture stream)`, () => {
      const rows = production(fixture);

      expectRows(rows, fixture.expect);

      if (fixture.expect.disposition === 'observed') {
        expect(rows[0].components).toMatchObject({
          errors: 'not_defined',
          administration_version: V2,
          stages_completed: fixture.expect.value,
        });
        expect(rows[0].closure_reason).toBe(
          fixture.expect.value === 6 ? 'completed' : 'closed_at_review',
        );
        expect(rows[0].censored).toBe(false);
        expect(rows[0].included_ids).toEqual([OPP]);
      }

      // Determinism; the raw stream is never changed.
      const before = JSON.stringify(fixture.events);

      expect(production(fixture)).toEqual(rows);
      expect(JSON.stringify(fixture.events)).toBe(before);
    });
  }

  test('A-4 production-only integrity (beyond the register’s stated rules; not part of the recount comparison): a closure or a departure snapshot that disagrees with the recount is a technical failure', () => {
    const closure = firstLoad(
      'A4p_closure_snapshot_disagrees',
      'A-4',
      [['opportunity_opened'], ...stages(1, 3), departed(3), closedWith(4, 0)],
      TECHNICAL,
    );
    const departure = firstLoad(
      'A4p_departure_snapshot_disagrees',
      'A-4',
      [['opportunity_opened'], stage(1), departed(2), closedWith(1, 0)],
      TECHNICAL,
    );

    for (const fixture of [closure, departure]) {
      expect(production(fixture)[0].disposition, fixture.name).toBe(
        'technical_failure',
      );
    }
  });

  test('A-6: errors are declared none — the register row says so and every row carries errors: not_defined', () => {
    const register = readFileSync(
      join(
        ROOT,
        'docs/verification/station-080-m26/M01-M26-IMPLEMENTATION-REGISTER.md',
      ),
      'utf8',
    );
    const row = register
      .split('\n')
      .find((line) => /^\| M07 +\| Retain with controls/.test(line));

    expect(row).toBeDefined();
    expect(row).toMatch(/errors: `not_defined`/);

    for (const fixture of [FIRST_LOAD[0], FIRST_LOAD[3]]) {
      expect(production(fixture)[0].components.errors).toBe('not_defined');
    }
  });
});

/* ================================================================== *
 * M07 reload (A-11: RX-1 to RX-8, separate named fixtures)
 * ================================================================== */

test.describe('M07 reload', () => {
  for (const fixture of RELOAD) {
    test(`A-11 ${fixture.name} (fixture stream)`, () => {
      const rows = production(fixture);

      expectRows(rows, fixture.expect);

      const components = rows[0].components as {
        reload_check?: Record<string, unknown>;
        exposure_record_consistent?: boolean;
        held_back_after_reload?: boolean;
        hold_back_kind?: string;
        opened_after_unestablished_absence?: boolean;
      };

      if (fixture.consistent !== undefined) {
        expect(components.exposure_record_consistent).toBe(fixture.consistent);
      }

      // Each held-back fixture names its kind; the row says the same, and
      // a row that is not held back says nothing of a hold-back.
      if (fixture.holdBackKind !== undefined) {
        expect(components.held_back_after_reload).toBe(true);
        expect(components.hold_back_kind).toBe(fixture.holdBackKind);
      } else if (fixture.expect.reason !== 'integrity') {
        expect(components.held_back_after_reload).toBeUndefined();
      }

      if (fixture.name.startsWith('RX6f')) {
        expect(components.opened_after_unestablished_absence).toBe(true);
      }

      if (
        fixture.page_load_index > 1 &&
        fixture.expect.reason !== 'integrity'
      ) {
        expect(components.reload_check).toMatchObject({
          page_reloaded: true,
          checked: fixture.check !== null,
        });
      }

      // Missing, broken or contradictory history never becomes an
      // established absence: every row read as "not established" says so
      // in its components too. (Where the hold-back or an integrity defect
      // decides the row, the component reports what the check claimed.)
      if (fixture.expect.reason === 'absence_not_established') {
        expect(components.reload_check?.prior_opening_absence_established).toBe(
          false,
        );
      }
    });
  }

  test('A-11 production-only integrity (not part of the recount comparison, which reads the hold-back reason from the earlier loads): a hold-back record of an unknown kind is a technical failure', () => {
    const fixture = reloaded(
      'RX7p_hold_back_record_of_an_unknown_kind',
      priorOpened2(),
      [
        ...fill(3),
        check(faithful(priorOpened2(), true)),
        ['technical_failure', { detail: 'reload of some other kind' }],
      ],
      TECHNICAL,
      { check: true },
    );
    const rows = production(fixture);

    expect(rows[0].disposition).toBe('technical_failure');
    expect(rows[0].missing_reason).toContain('unknown kind');
    expect(rows[0].value).toBeNull();
  });

  test('A-11: the absence of current-load events alone never decides the row — an empty reloaded load is interrupted, an empty first load is not_presented', () => {
    const empty = (load: number) =>
      extractItemFeatures('M07', [], {
        finalCoreClosed: true,
        pageLoadIndex: load,
        reloaded: load > 1,
      });

    expect(empty(1)[0].disposition).toBe('not_presented');
    expect(empty(2)[0].disposition).toBe('interrupted');
    expect(empty(2)[0].missing_reason).toContain(
      'absence of an earlier opening not established',
    );
  });
});

/* ================================================================== *
 * M07 route (A-7: S-M07a, S-M07b at both viewports)
 * ================================================================== */

test.describe('M07 route', () => {
  /** S-M07a: the bench is never opened in either phase → review → export. */
  async function scenarioA(page: Page, viewport: Viewport) {
    const errors = captureErrors(page);

    await page.setViewportSize(SIZE[viewport]);
    await bootPilot(page, `u24a_a_${viewport}`);
    await dockToWorkshop(page);
    await takeOrders(page);
    await signOffFirstShift(page);
    await exteriorAndReturn(page);
    await returnToReview(page);

    const envelope = await pagePayload(page);

    expect(envelope.page_load_index).toBe(1);
    expect(suffixes(envelope.raw_events)).toEqual([
      'end_presented',
      'window_closed',
    ]);
    expect(meta(family(envelope.raw_events)[1]).exit_state).toBe(
      'closed_at_review',
    );

    const validity = envelope.measurement_validity?.find(
      (record) => record.opportunity_id === OPP,
    );

    expect(validity).toMatchObject({
      validity: 'missing',
      invalid_reason: 'participant_absent',
      entry_state_version: V2,
    });

    const rows = reproduce(envelope);

    expectRows(rows, PRESENTED_NOT_ENTERED);
    expect(rows[0].closure_reason).toBe('closed_at_review');
    saveExport('S-M07a', envelope, viewport);
    expectNoRuntimeErrors(errors);

    return rows;
  }

  /** S-M07b: opened in episode 2, 2/6 by keyboard, left; resumed on the return to 5/6 by pointer; review → 5/6, returns 1. */
  async function scenarioB(page: Page, viewport: Viewport) {
    const errors = captureErrors(page);

    await page.setViewportSize(SIZE[viewport]);
    await bootPilot(page, `u24a_b_${viewport}`);
    await dockToWorkshop(page);
    await takeOrders(page);
    await openBench(page);

    const first = await surface(page);

    expect(first?.title).toBe(TITLE);
    expect(first?.elements.map((element) => element.id)).toEqual([
      'stage_1',
      'stage_2',
      'stage_3',
      'stage_4',
      'stage_5',
      'stage_6',
      'endpoint',
      'advance',
      'leave',
    ]);
    expect(first?.status).toBe(
      'Six routine stages. Progress is kept if you leave and come back.',
    );
    await frame(page, viewport, 'A7-bench-first-view', {
      scenario: 'S-M07b',
      stages_done: 0,
    });
    await advanceByKeyboard(page, 0, 2);
    await frame(page, viewport, 'A7-bench-mid-project', {
      scenario: 'S-M07b',
      stages_done: 2,
    });
    await closeSurface(page);
    await signOffFirstShift(page);
    await exteriorAndReturn(page);

    // The return: reopen the bench (2/6 kept) and advance to 5/6 by pointer.
    await openBench(page);
    await advanceByPointer(page, 2, 3);

    const resumed = await surface(page);

    await closeSurface(page);
    expect(
      resumed?.elements.filter(
        (element) =>
          element.id.startsWith('stage_') && element.state === 'done',
      ),
    ).toHaveLength(5);
    await returnToReview(page);

    const envelope = await pagePayload(page);
    const own = family(envelope.raw_events);

    expect(suffixes(envelope.raw_events).sort()).toEqual(
      [
        'opportunity_opened',
        'stage_advanced',
        'stage_advanced',
        'departed',
        'end_presented',
        'returned',
        'stage_advanced',
        'stage_advanced',
        'stage_advanced',
        'departed',
        'window_closed',
      ].sort(),
    );
    expect(own.every((event) => meta(event).entry_state_version === V2)).toBe(
      true,
    );
    expect(
      own
        .filter((event) => event.event_type === `${FAMILY}stage_advanced`)
        .map((event) => [meta(event).stage, meta(event).input_mode]),
    ).toEqual([
      [1, 'keyboard'],
      [2, 'keyboard'],
      [3, 'pointer'],
      [4, 'pointer'],
      [5, 'pointer'],
    ]);

    const rows = reproduce(envelope);

    expectRows(rows, observed(5, 1));
    expect(rows[0].closure_reason).toBe('closed_at_review');
    saveExport('S-M07b', envelope, viewport);
    expectNoRuntimeErrors(errors);

    return rows;
  }

  function sameAs800(name: string, rows: FeatureRecord[]) {
    const file = join(EXPORTS, `${name}.json`);

    expect(
      existsSync(file),
      `${name} at 800 × 600 must run first (${file})`,
    ).toBe(true);

    const reference = m07Rows(
      JSON.parse(readFileSync(file, 'utf8')) as Envelope,
    );

    expect(runIndependent(rows)).toEqual(runIndependent(reference));
  }

  test('A-7 S-M07a at 800 × 600: the bench never opened → review → null, no_eligible_event, presented_not_entered', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);
    await scenarioA(page, '800x600');
  });

  test('A-7 S-M07b at 800 × 600: 2/6 in episode 2 (keyboard), resumed to 5/6 on the return (pointer) → 5/6, returns 1; bench frames', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);
    await scenarioB(page, '800x600');
  });

  test('A-7 S-M07a at 1280 × 720: the M07 rows equal the 800 × 600 export’s', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);
    sameAs800('S-M07a', await scenarioA(page, '1280x720'));
  });

  test('A-7 S-M07b at 1280 × 720: the M07 rows equal the 800 × 600 export’s; bench frames', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);
    sameAs800('S-M07b', await scenarioB(page, '1280x720'));
  });

  test('A-7 L1 S-M07g at 800 × 600 (REG §5.383): S-M07b with LEAVE in place of ESC — left by KEYBOARD at 2/6, returned, left by POINTER at 5/6 and never reopened before the review → 5/6, returns 1, the same rows and bookkeeping as S-M07b; the time away is never active time', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);

    const errors = captureErrors(page);

    await page.setViewportSize(SIZE['800x600']);
    await bootPilot(page, 'u24a_g_800x600');
    await dockToWorkshop(page);
    await takeOrders(page);
    await openBench(page);
    await advanceByKeyboard(page, 0, 2);
    await waitAdvanceReady(page);
    // LEAVE by keyboard: from ADVANCE one arrow to LEAVE, then ENTER.
    await press(page, 'ArrowRight');
    expect((await surface(page))?.focus).toBe('leave');
    await press(page, 'Enter');
    await waitSurface(page, false);
    await signOffFirstShift(page);
    await exteriorAndReturn(page);
    await openBench(page);
    await advanceByPointer(page, 2, 3);
    await waitAdvanceReady(page);
    // LEAVE by pointer; the bench is not reopened before the review.
    await clickElement(page, 'leave');
    await waitSurface(page, false);
    await returnToReview(page);

    const envelope = await pagePayload(page);
    const own = family(envelope.raw_events);

    expect(suffixes(envelope.raw_events).sort()).toEqual(
      [
        'opportunity_opened',
        'stage_advanced',
        'stage_advanced',
        'departed',
        'end_presented',
        'returned',
        'stage_advanced',
        'stage_advanced',
        'stage_advanced',
        'departed',
        'window_closed',
      ].sort(),
    );

    const at = (suffix: string, nth = 0) =>
      own.filter((event) => event.event_type === `${FAMILY}${suffix}`)[nth];
    const departures = own.filter(
      (event) => event.event_type === `${FAMILY}departed`,
    );

    // One departure per LEAVE, each with its stage snapshot and visit.
    expect(departures.map((event) => meta(event).stages_completed)).toEqual([
      2, 5,
    ]);
    expect(departures.map((event) => meta(event).visit)).toEqual([1, 2]);

    // Active time = the two bench segments; the time away (between the
    // visits, and from the second LEAVE to the review) is never counted.
    const closed = at('window_closed');
    const segments =
      at('departed', 0).timestamp_ms -
      at('opportunity_opened').timestamp_ms +
      (at('departed', 1).timestamp_ms - at('returned').timestamp_ms);
    const awayToReview = closed.timestamp_ms - at('departed', 1).timestamp_ms;
    const activeMs = Number(meta(closed).active_ms);

    expect(awayToReview).toBeGreaterThan(5_000);
    expect(Math.abs(activeMs - segments)).toBeLessThanOrEqual(250);

    const rows = reproduce(envelope);

    expectRows(rows, observed(5, 1));
    expect(rows[0].closure_reason).toBe('closed_at_review');

    // The ESC path's bookkeeping (S-M07b at 800 × 600, the same route):
    // the same rows and the same closure raw components.
    const escFile = join(EXPORTS, 'S-M07b.json');

    expect(existsSync(escFile), `S-M07b must run first (${escFile})`).toBe(
      true,
    );

    const esc = JSON.parse(readFileSync(escFile, 'utf8')) as Envelope;
    const escClosed = family(esc.raw_events).find(
      (event) => event.event_type === `${FAMILY}window_closed`,
    )!;

    expect(runIndependent(rows)).toEqual(runIndependent(m07Rows(esc)));
    expect(meta(closed).raw_components).toEqual(meta(escClosed).raw_components);
    saveExport('S-M07g', envelope, '800x600');
    expectNoRuntimeErrors(errors);
  });
});

/* ================================================================== *
 * M07 settle (A-7; the settle-refresh correction, register §5.378 (2))
 * ================================================================== */

test.describe('M07 settle', () => {
  /** The bench's wall-clock state and the surface probe, read in the page. */
  async function benchClock(page: Page) {
    return JSON.parse(
      (await page.evaluate(`(async () => {
        const m07 = await import('/src/pilot/windows/m07Calibration.ts');
        const s = m07.m07State();
        return JSON.stringify({ now: Date.now(),
          settlingUntilMs: s.settlingUntilMs, stages: s.stagesCompleted,
          advance: window.__workSurfaceProbe?.elements
            .find((e) => e.id === 'advance')?.state ?? null });
      })()`)) as string,
    ) as {
      now: number;
      settlingUntilMs: number | null;
      stages: number;
      advance: string | null;
    };
  }

  /** Waits (bounded) for ADVANCE to be enabled again; never retries. */
  async function readyWithin(page: Page, timeoutMs: number) {
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __workSurfaceProbe?: {
              elements: { id: string; state: string }[];
            } | null;
          }
        ).__workSurfaceProbe?.elements.find((e) => e.id === 'advance')
          ?.state === 'accent',
      undefined,
      { timeout: timeoutMs },
    );
  }

  test('A-7 settle: the reported clock mismatch, induced — the wall clock the settle is measured on runs at half speed while the surface clock runs normally; ADVANCE re-enables without leaving, without an advance and never before the settle ends', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);

    await bootPilot(page, 'u24a_settle_clock');
    await dockToWorkshop(page);
    await takeOrders(page);
    await openBench(page);
    await waitAdvanceReady(page);
    // From here the page's Date.now() advances at half the real rate: the
    // surface clock's one 1.46 s refresh would fire while the bench still
    // read "Settling…" (the stall of scheduled command 09).
    await page.evaluate(`(() => {
      const real = Date.now.bind(Date);
      const origin = real();
      window.__m07RealNow = real;
      Date.now = () => origin + Math.floor((real() - origin) / 2);
    })()`);
    await press(page, 'a');
    await waitTileDone(page, 1);

    const atAdvance = await benchClock(page);

    expect(atAdvance.stages).toBe(1);
    expect(atAdvance.advance).toBe('idle');
    await readyWithin(page, 20_000);

    const atReady = await benchClock(page);

    // Never shortened: on the bench's own clock the settle had ended.
    expect(atReady.settlingUntilMs).not.toBeNull();
    expect(atReady.now).toBeGreaterThanOrEqual(atReady.settlingUntilMs!);
    // Never advanced by the refresh.
    expect(atReady.stages).toBe(1);
    await page.evaluate(`(() => { Date.now = window.__m07RealNow; })()`);

    // Readiness came back in the same visit: no departure, no return.
    expect(suffixes((await pagePayload(page)).raw_events)).toEqual([
      'opportunity_opened',
      'stage_advanced',
    ]);
    // The participant's own next advance works as before.
    await press(page, 'a');
    await waitTileDone(page, 2);
    await waitAdvanceReady(page);
    expect(suffixes((await pagePayload(page)).raw_events)).toEqual([
      'opportunity_opened',
      'stage_advanced',
      'stage_advanced',
    ]);
    await closeSurface(page);
    expectNoRuntimeErrors(errors);
  });

  test('A-7 settle: a view closed inside the settle discards its refresh, and a reopening inside the same settle arms its own — ADVANCE re-enables without a further departure', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);

    await bootPilot(page, 'u24a_settle_reopen');
    await dockToWorkshop(page);
    await takeOrders(page);
    await openBench(page);
    await waitAdvanceReady(page);
    // A slowed wall clock (a quarter of real speed) keeps the 1.4 s settle
    // open for about 5.6 s of real time, so the reopening below is
    // certainly inside it.
    await page.evaluate(`(() => {
      const real = Date.now.bind(Date);
      const origin = real();
      window.__m07RealNow = real;
      Date.now = () => origin + Math.floor((real() - origin) / 4);
    })()`);
    await press(page, 'a');
    await waitTileDone(page, 1);
    await closeSurface(page);
    await openBench(page);

    const reopened = await benchClock(page);

    // Inside the settle: the reopened bench reads "Settling…".
    expect(reopened.advance).toBe('idle');
    expect(reopened.now).toBeLessThan(reopened.settlingUntilMs!);
    await readyWithin(page, 30_000);

    const atReady = await benchClock(page);

    expect(atReady.now).toBeGreaterThanOrEqual(atReady.settlingUntilMs!);
    expect(atReady.stages).toBe(1);
    await page.evaluate(`(() => { Date.now = window.__m07RealNow; })()`);
    // The participant's own leave and reopening, and nothing more.
    expect(suffixes((await pagePayload(page)).raw_events)).toEqual([
      'opportunity_opened',
      'stage_advanced',
      'departed',
      'returned',
    ]);
    await closeSurface(page);
    expectNoRuntimeErrors(errors);
  });

  test('A-7 settle (G3, REG §5.381 (1)): ADVANCE keeps keyboard focus through the settle; ENTER, SPACE, A and a pointer press while settling do nothing; ENTER and SPACE after it advance exactly one stage each; LEAVE chosen deliberately still leaves', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);
    const look = async () => {
      const clock = await benchClock(page);
      const probe = await surface(page);
      const payload = await pagePayload(page);

      return {
        ...clock,
        focus: probe?.focus ?? null,
        label: probe?.elements.find((e) => e.id === 'advance')?.label ?? null,
        all: JSON.stringify(payload.raw_events),
        m07: suffixes(payload.raw_events),
      };
    };

    await bootPilot(page, 'u24a_settle_focus');
    await dockToWorkshop(page);
    await takeOrders(page);
    await openBench(page);
    await waitAdvanceReady(page);
    expect((await look()).focus).toBe('advance');
    // A quarter-speed wall clock keeps the 1.4 s settle open for about
    // 5.6 s of real time, so the four presses below fall inside it.
    await page.evaluate(`(() => {
      const real = Date.now.bind(Date);
      const origin = real();
      window.__m07RealNow = real;
      Date.now = () => origin + Math.floor((real() - origin) / 4);
    })()`);
    await press(page, 'Enter');
    await waitTileDone(page, 1);

    const settling = await look();

    expect(settling.stages).toBe(1);
    expect(settling.advance).toBe('idle');
    expect(settling.label).toBe('Settling…');
    expect(settling.focus).toBe('advance');
    expect(settling.m07).toEqual(['opportunity_opened', 'stage_advanced']);

    await press(page, 'Enter');
    await press(page, 'Space');
    await press(page, 'a');
    await clickElement(page, 'advance');

    const pressed = await look();

    // All four fell inside the settle and changed nothing.
    expect(pressed.now).toBeLessThan(settling.settlingUntilMs!);
    expect(pressed.settlingUntilMs).toBe(settling.settlingUntilMs);
    expect(pressed.stages).toBe(1);
    expect(pressed.all).toBe(settling.all);
    expect(pressed.focus).toBe('advance');
    await readyWithin(page, 30_000);

    const ready = await look();

    expect(ready.now).toBeGreaterThanOrEqual(settling.settlingUntilMs!);
    expect(ready.focus).toBe('advance');
    // Nothing was queued: the settle ended with stage 1 and no record.
    await page.waitForTimeout(2_000);
    expect((await look()).stages).toBe(1);
    expect((await look()).all).toBe(settling.all);
    await page.evaluate(`(() => { Date.now = window.__m07RealNow; })()`);

    // ENTER, then SPACE, after the settle: one stage each, focus kept.
    await press(page, 'Enter');
    await waitTileDone(page, 2);
    await waitAdvanceReady(page);
    expect((await look()).focus).toBe('advance');
    await press(page, 'Space');
    await waitTileDone(page, 3);
    await waitAdvanceReady(page);

    const advanced = await look();

    expect(advanced.stages).toBe(3);
    expect(advanced.focus).toBe('advance');
    expect(advanced.m07).toEqual([
      'opportunity_opened',
      'stage_advanced',
      'stage_advanced',
      'stage_advanced',
    ]);

    // LEAVE, chosen deliberately by the arrow keys, still leaves.
    await press(page, 'ArrowRight');
    expect((await look()).focus).toBe('leave');
    await press(page, 'Enter');
    await waitSurface(page, false);
    // What LEAVE records is finding L1's own test, next.
    expectNoRuntimeErrors(errors);
  });

  /** The bench's own bookkeeping and the window's active time, read in the page. */
  async function benchBook(page: Page) {
    return JSON.parse(
      (await page.evaluate(`(async () => {
        const m07 = await import('/src/pilot/windows/m07Calibration.ts');
        const s = m07.m07State();
        return JSON.stringify({
          active: m07.m07Window.activeTimeMs(Date.now()),
          surfaceOpen: s.surfaceOpen, visits: s.visits,
          returns: s.voluntaryReturns, useful: s.usefulReengagements,
          departures: s.departures, completed: s.completed });
      })()`)) as string,
    ) as {
      active: number;
      surfaceOpen: boolean;
      visits: number;
      returns: number;
      useful: number;
      departures: number[];
      completed: boolean;
    };
  }

  /** The window is paused: its active time does not grow over 1.5 s. */
  async function expectPaused(page: Page) {
    const before = (await benchBook(page)).active;

    await page.waitForTimeout(1_500);
    expect((await benchBook(page)).active).toBe(before);

    return before;
  }

  test('A-7 L1 (REG §5.383): LEAVE by KEYBOARD and by POINTER each write exactly one departure with its stage snapshot and pause the window; the reopening between them writes one return; the segment before each LEAVE is kept and the re-engagement bookkeeping is the ESC path’s', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);

    await bootPilot(page, 'u24a_l1_leave');
    await dockToWorkshop(page);
    await takeOrders(page);
    await openBench(page);
    await waitAdvanceReady(page);
    await press(page, 'a');
    await waitTileDone(page, 1);
    await waitAdvanceReady(page);

    const onBench = (await benchBook(page)).active;

    expect(onBench).toBeGreaterThan(0);
    // LEAVE by keyboard.
    await press(page, 'ArrowRight');
    expect((await surface(page))?.focus).toBe('leave');
    await press(page, 'Enter');
    await waitSurface(page, false);

    let events = family((await pagePayload(page)).raw_events);

    expect(suffixes(events)).toEqual([
      'opportunity_opened',
      'stage_advanced',
      'departed',
    ]);
    expect(meta(events[2])).toMatchObject({ stages_completed: 1, visit: 1 });

    const afterFirst = await expectPaused(page);

    expect(afterFirst).toBeGreaterThanOrEqual(onBench);
    expect(await benchBook(page)).toMatchObject({
      surfaceOpen: false,
      departures: [1],
      returns: 0,
      useful: 0,
    });

    // The reopening: one return; the window runs again.
    await openBench(page);
    expect(
      suffixes(family((await pagePayload(page)).raw_events)).filter(
        (suffix) => suffix === 'returned',
      ),
    ).toHaveLength(1);
    await page.waitForTimeout(500);
    expect((await benchBook(page)).active).toBeGreaterThan(afterFirst);
    await waitAdvanceReady(page);
    await press(page, 'a');
    await waitTileDone(page, 2);
    await waitAdvanceReady(page);
    // LEAVE by pointer.
    await clickElement(page, 'leave');
    await waitSurface(page, false);

    const envelope = await pagePayload(page);

    events = family(envelope.raw_events);
    expect(suffixes(events)).toEqual([
      'opportunity_opened',
      'stage_advanced',
      'departed',
      'returned',
      'stage_advanced',
      'departed',
    ]);
    expect(meta(events[5])).toMatchObject({ stages_completed: 2, visit: 2 });
    await expectPaused(page);
    // closeM07Surface's bookkeeping, as on the ESC path: a useful
    // re-engagement for the visit that advanced.
    expect(await benchBook(page)).toMatchObject({
      surfaceOpen: false,
      visits: 2,
      departures: [1, 2],
      returns: 1,
      useful: 1,
    });

    // Production and the independent recount agree on this log (the
    // project is still open: both rows pending).
    const recount = recountM07({
      raw_events: envelope.raw_events,
      prior_page_load_events: envelope.prior_page_load_events,
      page_load_index: envelope.page_load_index,
      game_session_id: String(
        envelope.raw_events[0]?.game_session_id ?? 'unknown',
      ),
    });

    for (const [index, row] of reproduce(envelope).entries()) {
      expect({
        value: recount.rows[index].value,
        disposition: recount.rows[index].disposition,
      }).toEqual({ value: row.value, disposition: row.disposition });
    }

    expectNoRuntimeErrors(errors);
  });

  test('A-7 L1 (REG §5.383): a rapid LEAVE followed at once by ESC writes one departure, not two', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);

    await bootPilot(page, 'u24a_l1_rapid');
    await dockToWorkshop(page);
    await takeOrders(page);
    await openBench(page);
    await waitAdvanceReady(page);
    await press(page, 'a');
    await waitTileDone(page, 1);
    await waitAdvanceReady(page);
    await press(page, 'ArrowRight');
    expect((await surface(page))?.focus).toBe('leave');
    // ENTER on LEAVE and ESC back to back, inside one frame's input.
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await waitSurface(page, false);
    await page.waitForTimeout(1_000);
    expect(suffixes((await pagePayload(page)).raw_events)).toEqual([
      'opportunity_opened',
      'stage_advanced',
      'departed',
    ]);
    expect(await benchBook(page)).toMatchObject({
      surfaceOpen: false,
      departures: [1],
    });
    expectNoRuntimeErrors(errors);
  });

  test('A-7 L1 (REG §5.383): a completed bench closed by its Close (keyboard), reopened and closed again (pointer) writes no departure and no return', async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);

    await bootPilot(page, 'u24a_l1_completed');
    await dockToWorkshop(page);
    await takeOrders(page);
    await openBench(page);
    await advanceByKeyboard(page, 0, 6);

    const completed = suffixes((await pagePayload(page)).raw_events);

    expect(completed).toEqual([
      'opportunity_opened',
      ...Array<string>(6).fill('stage_advanced'),
      'window_closed',
    ]);
    // A complete project: ADVANCE is disabled, so focus sits on Close.
    expect((await surface(page))?.focus).toBe('leave');
    expect(
      (await surface(page))?.elements.find((e) => e.id === 'leave')?.label,
    ).toBe('Close');
    await press(page, 'Enter');
    await waitSurface(page, false);
    await openBench(page);
    await clickElement(page, 'leave');
    await waitSurface(page, false);
    await page.waitForTimeout(500);
    expect(suffixes((await pagePayload(page)).raw_events)).toEqual(completed);
    expect(await benchBook(page)).toMatchObject({
      surfaceOpen: false,
      completed: true,
      departures: [],
      returns: 0,
    });
    expectNoRuntimeErrors(errors);
  });
});

/* ================================================================== *
 * M07 reload route (A-12: S-M07c, S-M07d, S-M07e, S-M07f; RX-9)
 * ================================================================== */

test.describe('M07 reload route', () => {
  /** First load: the bench opened in episode 2 and advanced to 2/6 (keyboard), left. */
  async function openedThenReloaded(page: Page, tag: string) {
    await bootPilot(page, tag);
    await dockToWorkshop(page);
    await takeOrders(page);
    await openBench(page);
    await advanceByKeyboard(page, 0, 2);
    await closeSurface(page);

    const before = await pagePayload(page);

    expect(before.page_load_index).toBe(1);
    expect(suffixes(before.raw_events)).toEqual([
      'opportunity_opened',
      'stage_advanced',
      'stage_advanced',
      'departed',
    ]);
    await reloadPage(page);

    const after = await pagePayload(page);

    expect(after.page_load_index).toBe(2);
    // Byte-identical: nothing rewritten, nothing renumbered.
    expect(JSON.stringify(after.prior_page_load_events)).toBe(
      JSON.stringify(before.raw_events),
    );
    expect(family(after.raw_events)).toEqual([]);
    // Before the Workshop: no check yet, so nothing is established (RX-8).
    expectRows(reproduce(after), INTERRUPTED_UNESTABLISHED);

    await dockToWorkshop(page);

    const atEntry = await pagePayload(page);
    const own = family(atEntry.raw_events);

    // Workshop entry wrote the check (an earlier opening found), then the
    // hold-back record — nothing else of the bench.
    expect(suffixes(atEntry.raw_events)).toEqual([
      'prior_load_checked',
      'technical_failure',
    ]);
    expect(meta(own[0])).toMatchObject({
      page_load_index: 2,
      prior_page_load_event_count: before.raw_events.length,
      prior_opening_found: true,
      prior_end_presented_found: false,
      history_continuous: true,
      prior_opening_absence_established: false,
      input_mode: 'system',
      entry_state_version: V2,
    });
    expect(String(meta(own[1]).detail)).toBe(RELOAD_DETAIL);
    expect(await benchGuidanceDone(page)).toBe(true);

    return { before, atEntry };
  }

  /** Opens the held-back screen (SPACE at the bench) and checks the record is untouched. */
  async function openHeldBack(
    page: Page,
    reference: Envelope,
    lines: readonly string[] = HELD_BACK_LINES,
  ) {
    await openBench(page);
    expectHeldBackScreen(await surface(page), lines);

    const shown = await pagePayload(page);

    expect(family(shown.raw_events)).toEqual(family(reference.raw_events));
  }

  test('A-12 S-M07c at 800 × 600: opened at 2/6, reload, replay — the check finds the opening, the bench is held back; the held-back screen left by KEYBOARD writes nothing; at the review the row is interrupted and the earlier load byte-identical', async ({
    page,
  }) => {
    test.setTimeout(2_400_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);
    const { before, atEntry } = await openedThenReloaded(page, 'u24a_c_kbd');
    const rowBefore = reproduce(atEntry);

    expectRows(rowBefore, INTERRUPTED_EARLIER);

    await takeOrders(page);
    await openHeldBack(page, atEntry);
    await frame(page, '800x600', 'A12-held-back-screen', {
      scenario: 'S-M07c',
    });
    // LEAVE by keyboard: focus LEAVE, ENTER.
    await keyActivate(page, 'leave');
    await waitSurface(page, false);
    // Again, and leave by ESC (the surface's keyboard convention).
    await openHeldBack(page, atEntry);
    await press(page, 'Escape');
    await waitSurface(page, false);

    const afterScreen = await pagePayload(page);

    expect(family(afterScreen.raw_events)).toEqual(family(atEntry.raw_events));
    expect(reproduce(afterScreen)).toEqual(rowBefore);

    await signOffFirstShift(page);
    await exteriorAndReturn(page);
    // The return shift presents nothing for a held-back bench.
    expect(family((await pagePayload(page)).raw_events)).toEqual(
      family(atEntry.raw_events),
    );
    await returnToReview(page);

    const envelope = await pagePayload(page);

    expect(family(envelope.raw_events)).toEqual(family(atEntry.raw_events));
    expect(JSON.stringify(envelope.prior_page_load_events)).toBe(
      JSON.stringify(before.raw_events),
    );

    const validity = envelope.measurement_validity?.find(
      (record) => record.opportunity_id === OPP,
    );

    expect(validity?.validity).toBe('invalid');
    expect(validity?.prior_exposure.length).toBeGreaterThan(0);

    const rows = reproduce(envelope);

    expectRows(rows, INTERRUPTED_EARLIER);
    expect(rows).toEqual(rowBefore);
    saveExport('S-M07c', envelope, '800x600');
    expectNoRuntimeErrors(errors);
  });

  test('A-12 S-M07c (second run) at 800 × 600: the held-back screen left by POINTER writes nothing', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);
    const { atEntry } = await openedThenReloaded(page, 'u24a_c_ptr');
    const rowBefore = reproduce(atEntry);

    await openHeldBack(page, atEntry);
    await clickElement(page, 'leave');
    await waitSurface(page, false);

    const after = await pagePayload(page);

    expect(family(after.raw_events)).toEqual(family(atEntry.raw_events));
    expect(reproduce(after)).toEqual(rowBefore);
    expectNoRuntimeErrors(errors);
  });

  test('A-12 held-back screen frame at 1280 × 720 (left by pointer)', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);
    await page.setViewportSize(SIZE['1280x720']);

    const errors = captureErrors(page);
    const { atEntry } = await openedThenReloaded(page, 'u24a_c_1280');

    // The orders taken first, as at 800 × 600 (the same route stage in
    // both frames' sidecars).
    await takeOrders(page);
    await openHeldBack(page, atEntry);
    await frame(page, '1280x720', 'A12-held-back-screen', {
      scenario: 'S-M07c',
    });
    await clickElement(page, 'leave');
    await waitSurface(page, false);
    expect(family((await pagePayload(page)).raw_events)).toEqual(
      family(atEntry.raw_events),
    );
    expectNoRuntimeErrors(errors);
  });

  test('A-12 S-M07d at 800 × 600: a reload before the Workshop is first entered; the check establishes the absence; the first opening runs normally; the row is the observed current-load value', async ({
    page,
  }) => {
    test.setTimeout(2_400_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);

    await bootPilot(page, 'u24a_d');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await valeHandover(page);

    const before = await pagePayload(page);

    expect(family(before.raw_events)).toEqual([]);
    await reloadPage(page);
    await dockToWorkshop(page);

    const atEntry = await pagePayload(page);
    const own = family(atEntry.raw_events);

    expect(suffixes(atEntry.raw_events)).toEqual(['prior_load_checked']);
    expect(meta(own[0])).toMatchObject({
      page_load_index: 2,
      prior_page_load_event_count: before.raw_events.length,
      prior_opening_found: false,
      prior_end_presented_found: false,
      history_continuous: true,
      prior_opening_absence_established: true,
    });
    expect(JSON.stringify(atEntry.prior_page_load_events)).toBe(
      JSON.stringify(before.raw_events),
    );
    // Read exactly as a first load: no presentation record yet.
    expectRows(reproduce(atEntry), NOT_PRESENTED);

    await takeOrders(page);
    await openBench(page);

    const normal = await surface(page);

    expect(normal?.status).not.toContain(HELD_BACK_LINES[0]);
    expect(normal?.elements.map((element) => element.id)).toContain('advance');
    await advanceByKeyboard(page, 0, 3);
    await closeSurface(page);
    await signOffFirstShift(page);
    await exteriorAndReturn(page);
    await returnToReview(page);

    const envelope = await pagePayload(page);

    expect(suffixes(envelope.raw_events)).toEqual([
      'prior_load_checked',
      'opportunity_opened',
      'stage_advanced',
      'stage_advanced',
      'stage_advanced',
      'departed',
      'end_presented',
      'window_closed',
    ]);

    const rows = reproduce(envelope);

    expectRows(rows, observed(3, 0));
    expect(rows[0].components).toMatchObject({
      reload_check: {
        page_reloaded: true,
        checked: true,
        prior_opening_found: false,
        history_continuous: true,
        prior_opening_absence_established: true,
      },
      exposure_record_consistent: true,
    });
    saveExport('S-M07d', envelope, '800x600');
    expectNoRuntimeErrors(errors);
  });

  /** The validity record of a held-back bench: invalid, never an invented earlier opening. */
  function expectHeldBackValidity(envelope: Envelope) {
    const validity = envelope.measurement_validity?.find(
      (record) => record.opportunity_id === OPP,
    );

    expect(validity?.validity).toBe('invalid');
    expect(validity?.invalid_reason).toBe('technical_failure');
    expect(
      (validity?.prior_exposure ?? []).filter((note) => /opened/.test(note)),
    ).toEqual([]);
  }

  /**
   * S-M07e, first load: the bench never opened; the review closes it as
   * absent. A reload and the replay to the Workshop: the check establishes
   * the absence and the earlier review closure is found, so the bench stays
   * closed (§5.378 (4)).
   */
  async function reviewClosedThenReloaded(page: Page, tag: string) {
    await bootPilot(page, tag);
    await dockToWorkshop(page);
    await takeOrders(page);
    await signOffFirstShift(page);
    await exteriorAndReturn(page);
    await returnToReview(page);

    const before = await pagePayload(page);

    expect(before.page_load_index).toBe(1);
    expect(suffixes(before.raw_events)).toEqual([
      'end_presented',
      'window_closed',
    ]);
    expect(meta(family(before.raw_events)[1]).exit_state).toBe(
      'closed_at_review',
    );
    await reloadPage(page);
    await dockToWorkshop(page);

    const atEntry = await pagePayload(page);
    const own = family(atEntry.raw_events);

    expect(atEntry.page_load_index).toBe(2);
    // The earlier absence record unchanged: nothing rewritten or renumbered.
    expect(JSON.stringify(atEntry.prior_page_load_events)).toBe(
      JSON.stringify(before.raw_events),
    );
    expect(suffixes(atEntry.raw_events)).toEqual([
      'prior_load_checked',
      'technical_failure',
    ]);
    expect(meta(own[0])).toMatchObject({
      page_load_index: 2,
      prior_page_load_event_count: before.raw_events.length,
      prior_opening_found: false,
      prior_end_presented_found: true,
      history_continuous: true,
      prior_opening_absence_established: true,
    });
    expect(String(meta(own[1]).detail)).toBe(REVIEW_CLOSURE_DETAIL);
    expect(await benchGuidanceDone(page)).toBe(true);
    expectRows(reproduce(atEntry), INTERRUPTED_REVIEW_CLOSURE);

    return { before, atEntry };
  }

  /**
   * S-M07f: a reload before the Workshop is first entered, with the store's
   * meta record removed on that navigation (FAULT-INJECTED: an unreadable
   * meta record, so the history is recovered from its chunks and cannot be
   * verified, §5.290 (a)). The bench is held back (§5.378 (3)).
   */
  async function unverifiedThenReloaded(page: Page, tag: string) {
    await bootPilot(page, tag);
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await valeHandover(page);

    const before = await pagePayload(page);

    expect(family(before.raw_events)).toEqual([]);
    await page.addInitScript(() => {
      if (sessionStorage.getItem('u24a-meta-removed') !== null) {
        return;
      }

      sessionStorage.setItem('u24a-meta-removed', '1');

      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('research-events:v1:') && key.endsWith(':meta')) {
          localStorage.removeItem(key);
        }
      }
    });
    await reloadPage(page);

    const after = await pagePayload(page);

    expect(after.page_load_index).toBe(2);
    expect(after.event_integrity.recovered_from_chunks).toBe(true);
    expect(JSON.stringify(after.prior_page_load_events)).toBe(
      JSON.stringify(before.raw_events),
    );
    await dockToWorkshop(page);

    const atEntry = await pagePayload(page);
    const own = family(atEntry.raw_events);

    expect(suffixes(atEntry.raw_events)).toEqual([
      'prior_load_checked',
      'technical_failure',
    ]);
    expect(meta(own[0])).toMatchObject({
      page_load_index: 2,
      prior_page_load_event_count: before.raw_events.length,
      prior_opening_found: false,
      history_continuous: false,
      prior_opening_absence_established: false,
    });
    expect(String(meta(own[1]).detail)).toBe(UNVERIFIED_DETAIL);
    expect(await benchGuidanceDone(page)).toBe(true);
    expectRows(reproduce(atEntry), INTERRUPTED_UNESTABLISHED);

    return { atEntry };
  }

  // The export of S-M07e is captured after the screen was left, NOT at the
  // second review: after a COMPLETED earlier load other items' own reload
  // guards hold their opportunities back too (M10's yard-logbook offer,
  // "reload after the offer: delivery not re-run"), so the route driver
  // cannot replay this load to the review (first development run,
  // `dev/r1-ef.log`). A held-back bench writes nothing at the review in any
  // kind (S-M07c, S-M07f).
  test('A-12 S-M07e at 800 × 600: never opened → review (absent) → reload, replay — the earlier review closure is found with the absence established; the closed screen left by KEYBOARD and ESC writes nothing; the row is interrupted (earlier review closure) and the earlier absence record byte-identical (export captured after the screen)', async ({
    page,
  }) => {
    test.setTimeout(3_000_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);
    const { before, atEntry } = await reviewClosedThenReloaded(page, 'u24a_e');
    const rowBefore = reproduce(atEntry);

    await takeOrders(page);
    await openHeldBack(page, atEntry, REVIEW_CLOSED_LINES);
    await frame(page, '800x600', 'A12-review-closed-screen', {
      scenario: 'S-M07e',
    });
    await keyActivate(page, 'leave');
    await waitSurface(page, false);
    await openHeldBack(page, atEntry, REVIEW_CLOSED_LINES);
    await press(page, 'Escape');
    await waitSurface(page, false);

    const envelope = await pagePayload(page);

    expect(family(envelope.raw_events)).toEqual(family(atEntry.raw_events));
    expect(JSON.stringify(envelope.prior_page_load_events)).toBe(
      JSON.stringify(before.raw_events),
    );
    expectHeldBackValidity(envelope);

    const rows = reproduce(envelope);

    expectRows(rows, INTERRUPTED_REVIEW_CLOSURE);
    expect(rows).toEqual(rowBefore);
    expect(rows[0].components).toMatchObject({
      hold_back_kind: 'prior_review_closure',
      exposure_record_consistent: true,
    });
    saveExport('S-M07e', envelope, '800x600');
    expectNoRuntimeErrors(errors);
  });

  test('A-12 S-M07e closed screen frame at 1280 × 720 (left by pointer)', async ({
    page,
  }) => {
    test.setTimeout(3_000_000);
    await page.setViewportSize(SIZE['1280x720']);

    const errors = captureErrors(page);
    const { atEntry } = await reviewClosedThenReloaded(page, 'u24a_e_1280');

    await takeOrders(page);
    await openHeldBack(page, atEntry, REVIEW_CLOSED_LINES);
    await frame(page, '1280x720', 'A12-review-closed-screen', {
      scenario: 'S-M07e',
    });
    await clickElement(page, 'leave');
    await waitSurface(page, false);
    expect(family((await pagePayload(page)).raw_events)).toEqual(
      family(atEntry.raw_events),
    );
    expectNoRuntimeErrors(errors);
  });

  test('A-12 S-M07f at 800 × 600 (fault-injected: the store meta record removed before the reload): the earlier state cannot be verified; the bench is held back; the screen left by KEYBOARD and ESC writes nothing; at the review the row is interrupted (absence not established) and no earlier opening is invented', async ({
    page,
  }) => {
    test.setTimeout(2_400_000);
    await page.setViewportSize(SIZE['800x600']);

    const errors = captureErrors(page);
    const { atEntry } = await unverifiedThenReloaded(page, 'u24a_f');
    const rowBefore = reproduce(atEntry);

    await takeOrders(page);
    await openHeldBack(page, atEntry, UNVERIFIED_LINES);
    await frame(page, '800x600', 'A12-unverified-screen', {
      scenario: 'S-M07f',
      fault_injected: 'store meta record removed before the reload',
    });
    await keyActivate(page, 'leave');
    await waitSurface(page, false);
    await openHeldBack(page, atEntry, UNVERIFIED_LINES);
    await press(page, 'Escape');
    await waitSurface(page, false);
    expect(reproduce(await pagePayload(page))).toEqual(rowBefore);

    await signOffFirstShift(page);
    await exteriorAndReturn(page);
    await returnToReview(page);

    const envelope = await pagePayload(page);

    expect(family(envelope.raw_events)).toEqual(family(atEntry.raw_events));
    expectHeldBackValidity(envelope);

    const rows = reproduce(envelope);

    expectRows(rows, INTERRUPTED_UNESTABLISHED);
    expect(rows).toEqual(rowBefore);
    expect(rows[0].components).toMatchObject({
      hold_back_kind: 'unverified_history',
      reload_check: {
        checked: true,
        history_continuous: false,
        prior_opening_absence_established: false,
      },
      exposure_record_consistent: true,
    });
    saveExport('S-M07f', envelope, '800x600');
    expectNoRuntimeErrors(errors);
  });

  test('A-12 S-M07f unverified screen frame at 1280 × 720 (fault-injected; left by pointer)', async ({
    page,
  }) => {
    test.setTimeout(1_800_000);
    await page.setViewportSize(SIZE['1280x720']);

    const errors = captureErrors(page);
    const { atEntry } = await unverifiedThenReloaded(page, 'u24a_f_1280');

    await takeOrders(page);
    await openHeldBack(page, atEntry, UNVERIFIED_LINES);
    await frame(page, '1280x720', 'A12-unverified-screen', {
      scenario: 'S-M07f',
      fault_injected: 'store meta record removed before the reload',
    });
    await clickElement(page, 'leave');
    await waitSurface(page, false);
    expect(family((await pagePayload(page)).raw_events)).toEqual(
      family(atEntry.raw_events),
    );
    expectNoRuntimeErrors(errors);
  });
});

/* ================================================================== *
 * M07 recount (A-10, A-11: the independent recount)
 * ================================================================== */

test.describe('M07 recount', () => {
  test('A-10 static independence: the recount imports only node: built-ins (here: none), never names a derived export block, and cites every rule', () => {
    const text = readFileSync(join(ROOT, 'e2e/m07Recount.ts'), 'utf8');
    const specifiers = [
      ...text.matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gms),
      ...text.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm),
      ...text.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g),
      ...text.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((match) => match[1]);

    expect(specifiers.filter((name) => !name.startsWith('node:'))).toEqual([]);
    expect(text).not.toMatch(
      /measurement_features|measurement_validity|measurement_protocol|raw_components|pilot_coverage|event_integrity|\bsummary\b/,
    );
    // No module reference to production code in any form (citations of
    // register files inside RECOUNT_SPEC strings are text, not imports).
    expect(text).not.toMatch(/(from|import\(|require\()\s*['"][^'"]*src\//);

    for (const [key, rule] of Object.entries(RECOUNT_SPEC)) {
      expect(typeof rule.cite, key).toBe('string');
      expect(rule.cite.length, key).toBeGreaterThan(10);
    }
  });

  for (const fixture of [...ALL_FIXTURES]) {
    test(`${fixture.row} recount ${fixture.name} (fixture stream)`, () => {
      const result = recountM07(recountInput(fixture));
      const rows = production(fixture);

      // Equal to the scripted expectation …
      expect(result.rows[0]).toMatchObject({
        value: fixture.expect.value,
        disposition: fixture.expect.disposition,
        reason: fixture.expect.reason,
      });
      expect(result.rows[1].value).toBe(fixture.expect.returns);

      // … and to the production rows (value, numerator, denominator, disposition).
      for (const [index, row] of rows.entries()) {
        expect(
          {
            value: result.rows[index].value,
            numerator: result.rows[index].numerator,
            denominator: result.rows[index].denominator,
            disposition: result.rows[index].disposition,
          },
          `${fixture.name} ${row.feature_id}`,
        ).toEqual({
          value: row.value,
          numerator: row.numerator,
          denominator: row.denominator,
          disposition: row.disposition,
        });
      }

      // The check consistency assertion: never changes the row.
      const comparisons = recomputeM07Checks(recountInput(fixture), {
        recovered_from_chunks: fixture.recovered_from_chunks,
      });

      if (fixture.check === true) {
        expect(comparisons.length).toBeGreaterThan(0);

        for (const comparison of comparisons) {
          expect(comparison.recomputed, fixture.name).toEqual(
            comparison.recorded,
          );
        }
      } else if (fixture.check === false) {
        // A deliberately contradictory record: the recomputation detects it.
        expect(comparisons.some((comparison) => !comparison.equal)).toBe(true);
      }
    });
  }

  /** The exports of the saved Part A scenarios and their scripted rows. */
  const SCRIPTED: Record<string, Expectation> = {
    'S-M07a.json': PRESENTED_NOT_ENTERED,
    'S-M07b.json': observed(5, 1),
    'S-M07c.json': INTERRUPTED_EARLIER,
    'S-M07d.json': observed(3, 0),
    'S-M07e.json': INTERRUPTED_REVIEW_CLOSURE,
    'S-M07f.json': INTERRUPTED_UNESTABLISHED,
    // REG §5.383: the LEAVE path, captured in a browser (S-M07b with LEAVE).
    'S-M07g.json': observed(5, 1),
  };
  /** The four exports plan A-7 / A-12 require; S-M07e and S-M07f are added by §5.378, S-M07g by §5.383. */
  const REQUIRED = ['S-M07a.json', 'S-M07b.json', 'S-M07c.json', 'S-M07d.json'];

  function pinnedHashes(): Map<string, string> {
    expect(existsSync(MANIFEST), MANIFEST).toBe(true);

    return new Map(
      readFileSync(MANIFEST, 'utf8')
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => [line.slice(66), line.slice(0, 64)]),
    );
  }

  test('A-10 the export manifest (harness captures): it pins every saved Part A export — the four required, S-M07e / S-M07f and S-M07g — and nothing else', () => {
    const pinned = pinnedHashes();

    for (const file of REQUIRED) {
      expect(pinned.has(file), `${file} pinned`).toBe(true);
    }

    expect([...pinned.keys()].sort()).toEqual(Object.keys(SCRIPTED).sort());
  });

  // One test per export (§5.378 (5)): a missing file never hides another
  // export's result.
  for (const [file, expectation] of Object.entries(SCRIPTED)) {
    test(`A-10 recount of the saved export ${file} (harness capture): the hash pinned; the recount equals the export’s M07 rows and the scripted expectation; the recomputed checks equal the recorded ones`, () => {
      const path = join(EXPORTS, file);

      expect(existsSync(path), path).toBe(true);

      const text = readFileSync(path, 'utf8');

      expect(sha256(text), `${file} hash`).toBe(pinnedHashes().get(file));

      const envelope = JSON.parse(text) as Envelope & {
        game_session_id?: string;
      };
      // Only the four raw inputs are copied out of the export (§R.1 rule 2).
      const input: RecountInput = {
        raw_events: envelope.raw_events,
        prior_page_load_events: envelope.prior_page_load_events,
        page_load_index: envelope.page_load_index,
        game_session_id: String(
          envelope.raw_events[0]?.game_session_id ?? 'unknown',
        ),
      };
      const result = recountM07(input);
      const rows = m07Rows(envelope);

      expect(result.rows[0], file).toMatchObject({
        value: expectation.value,
        disposition: expectation.disposition,
        reason: expectation.reason,
      });

      for (const [index, row] of rows.entries()) {
        expect(
          {
            value: result.rows[index].value,
            numerator: result.rows[index].numerator,
            denominator: result.rows[index].denominator,
            disposition: result.rows[index].disposition,
          },
          `${file} ${row.feature_id}`,
        ).toEqual({
          value: row.value,
          numerator: row.numerator,
          denominator: row.denominator,
          disposition: row.disposition,
        });
      }

      for (const comparison of recomputeM07Checks(input, {
        recovered_from_chunks: envelope.event_integrity.recovered_from_chunks,
      })) {
        expect(comparison.recomputed, `${file} check`).toEqual(
          comparison.recorded,
        );
      }
    });
  }
});
