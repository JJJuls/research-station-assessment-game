/**
 * U24 RL-0 — the shared reload check and its H / A / U / M classifier,
 * pure tests (`src/measurement/reloadCheck.ts`;
 * `RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §3 and §8 RL-0, under the owner's
 * ruling of 23 October 2026, D-4, D-6 (i), D-7 (i) and clarification 2).
 *
 * Playwright test blocks that never touch `page`. Every expected value is
 * written by hand from r3 §2 / §3 / §8 and the ruling — never taken from a
 * run of the helper. Each fixture checks the class, the permission to
 * administer and the record's flags, not the label alone:
 * - the record's computation: a first load writes nothing; the five
 *   continuity conditions, each failing on its own; `store_evictions` never
 *   read; stage 1 / 2 / 3 kept distinct; the carry-forward of an earlier U
 *   or M hold-back of the same occasion only (D-7 (i));
 * - the classifier: every class; history-level and occasion-level U;
 *   coherent and self-contradictory records; malformed records; the
 *   acceptance fixtures F-A to F-E of clarification 2; M04's joint
 *   hold-back;
 * - the record is never task evidence; the module is pure.
 *
 * The families below (M01-shaped, M23-shaped, M04-shaped, M25-shaped) are
 * this file's own transcription of the r3 §4 / r1 stage map. Nothing is
 * wired into a row in RL-0: no row's behaviour changes here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  classifyReload,
  computePriorLoadCheck,
  type PriorLoadCheck,
  type ReloadEvent,
  type ReloadHistoryIntegrity,
  reloadHoldBackClass,
  reloadHoldBackDetail,
  type ReloadStageMap,
  withoutPriorLoadChecks,
} from '../src/measurement/reloadCheck';

const M01 = 'proto_m01_batch_';
const M23 = 'proto_m23_plots_';
const M04 = 'proto_m04_cutting_';
const M25 = 'proto_m25_loops_';

const CONTINUOUS: ReloadHistoryIntegrity = {
  first_sequence: 1,
  sequence_gap_count: 0,
  sequence_duplicate_count: 0,
  recovered_from_chunks: false,
};

function ev(
  sequence: number,
  event_type: string,
  metadata: Record<string, unknown> = {},
): ReloadEvent {
  return { sequence, event_type, metadata };
}

/** An occasion-attributed test of one family record. */
function of(family: string, suffix: string, occasion?: string) {
  return (event: ReloadEvent) =>
    event.event_type === `${family}${suffix}` &&
    (occasion === undefined || event.metadata?.occasion === occasion);
}

/** M01 o1 / o2: stage 1 `presented`, stage 2 none, stage 3 the opening. */
function m01Stages(occasion: string): ReloadStageMap {
  return {
    briefing: of(M01, 'presented', occasion),
    opening: of(M01, 'opportunity_opened', occasion),
    holdBack: of(M01, 'technical_failure', occasion),
  };
}

const M01_OCCASIONS = {
  o1: m01Stages('o1'),
  o2: m01Stages('o2'),
};

/** M23 (row): stage 1 the yard briefing beat, stage 2 `presented`. */
const M23_STAGES: ReloadStageMap = {
  briefing: (event) =>
    event.event_type === 'pilot_npc_beat' &&
    event.metadata?.beat === 'exterior_briefing',
  presentation: of(M23, 'presented'),
  opening: of(M23, 'opportunity_opened'),
  holdBack: of(M23, 'technical_failure'),
};

/** Load 1 of an M01 session: both batches named, nothing opened. */
const M01_LOAD1_BRIEFED: ReloadEvent[] = [
  ev(1, 'pilot_session_started'),
  ev(2, `${M01}presented`, { occasion: 'o1' }),
  ev(3, `${M01}presented`, { occasion: 'o2' }),
];

/** Load 1 with o1 opened (sequence 4). */
const M01_LOAD1_O1_OPENED: ReloadEvent[] = [
  ...M01_LOAD1_BRIEFED,
  ev(4, `${M01}opportunity_opened`, { occasion: 'o1' }),
];

/** The record a reloaded load writes; a missing one fails the fixture. */
function written(record: PriorLoadCheck | null): PriorLoadCheck {
  if (record === null) {
    throw new Error('no prior_load_checked record was computed');
  }

  return record;
}

function computeM01(
  pageLoadIndex: number,
  priorLoadEvents: ReloadEvent[],
  integrity: ReloadHistoryIntegrity = CONTINUOUS,
) {
  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents,
    integrity,
    occasions: M01_OCCASIONS,
  });
}

function check(
  pageLoadIndex: number,
  priorLoadEvents: ReloadEvent[],
  integrity: ReloadHistoryIntegrity = CONTINUOUS,
) {
  return written(computeM01(pageLoadIndex, priorLoadEvents, integrity));
}

function classifyM01(pageLoadIndex: number, checks: object[]) {
  return classifyReload({ pageLoadIndex, checks, occasions: ['o1', 'o2'] });
}

/** The class, permission and basis of each occasion, nothing else. */
function classes(result: ReturnType<typeof classifyReload>) {
  return Object.fromEntries(
    Object.entries(result.occasions).map(([id, entry]) => [
      id,
      [entry.class, entry.administration_permitted, entry.basis],
    ]),
  );
}

/** The M01 record of load 2 after an unopened load 1 (hand-written). */
const ESTABLISHED_M01_RECORD = {
  page_load_index: 2,
  prior_page_load_event_count: 3,
  history_continuous: true,
  prior_briefing_found: true,
  prior_opening_found: false,
  prior_opening_absence_established: true,
  prior_opening_sequences: [],
  occasions: {
    o1: {
      prior_briefing_found: true,
      prior_opening_found: false,
      prior_opening_absence_established: true,
      prior_opening_sequences: [],
    },
    o2: {
      prior_briefing_found: true,
      prior_opening_found: false,
      prior_opening_absence_established: true,
      prior_opening_sequences: [],
    },
  },
};

test.describe('RL-0 record: computation', () => {
  test('a first page load writes no record and keeps the first-load administration', () => {
    expect(computeM01(1, [])).toBeNull();
    expect(computeM01(1, M01_LOAD1_BRIEFED)).toBeNull();
    expect(computeM01(0, M01_LOAD1_BRIEFED)).toBeNull();

    const first = classifyM01(1, []);

    expect(first.page_reloaded).toBe(false);
    expect(first.check_count).toBe(0);
    expect(first.check_coherent).toBeNull();
    expect(first.exposure_record_consistent).toBe(true);
    expect(first.history_level_uncertain).toBe(false);
    expect(classes(first)).toEqual({
      o1: [null, true, 'first_load'],
      o2: [null, true, 'first_load'],
    });
  });

  test('a continuous history with no earlier opening establishes the absence (A)', () => {
    const record = check(2, M01_LOAD1_BRIEFED);

    expect(record).toEqual(ESTABLISHED_M01_RECORD);
    // No stage-2 record in M01's map: the field is absent, not false.
    expect(record).not.toHaveProperty('prior_presentation_found');
    expect(record?.occasions?.o1).not.toHaveProperty(
      'prior_presentation_found',
    );

    const result = classifyM01(2, [record]);

    expect(result.check_coherent).toBe(true);
    expect(result.exposure_record_consistent).toBe(true);
    expect(result.check_malformed).toBe(false);
    expect(result.history_level_uncertain).toBe(false);
    expect(classes(result)).toEqual({
      o1: ['A', true, 'absence_established'],
      o2: ['A', true, 'absence_established'],
    });
    expect(result.occasions.o1.reason).toBe(
      'absence of an earlier opening established',
    );
  });

  test('a host or extractor may classify a subset of the occasions; coherence is judged on the whole record', () => {
    // The record holds o1's earlier opening; a host of o2 alone asks.
    const record = check(2, M01_LOAD1_O1_OPENED);
    const result = classifyReload({
      pageLoadIndex: 2,
      checks: [record],
      occasions: ['o2'],
    });

    expect(result.check_coherent).toBe(true);
    expect(result.exposure_record_consistent).toBe(true);
    expect(classes(result)).toEqual({
      o2: ['A', true, 'absence_established'],
    });
  });

  const ALONE: [string, ReloadEvent[], ReloadHistoryIntegrity][] = [
    ['no earlier record', [], CONTINUOUS],
    [
      'first_sequence ≠ 1',
      M01_LOAD1_BRIEFED,
      { ...CONTINUOUS, first_sequence: 2 },
    ],
    [
      'first_sequence null',
      M01_LOAD1_BRIEFED,
      { ...CONTINUOUS, first_sequence: null },
    ],
    [
      'a sequence gap',
      M01_LOAD1_BRIEFED,
      { ...CONTINUOUS, sequence_gap_count: 1 },
    ],
    [
      'a duplicate sequence',
      M01_LOAD1_BRIEFED,
      { ...CONTINUOUS, sequence_duplicate_count: 1 },
    ],
    [
      'recovered from chunks',
      M01_LOAD1_BRIEFED,
      { ...CONTINUOUS, recovered_from_chunks: true },
    ],
  ];

  for (const [label, prior, integrity] of ALONE) {
    test(`continuity fails on its own: ${label} ⇒ history-level U, refused`, () => {
      const record = check(2, prior, integrity);

      expect(record?.history_continuous).toBe(false);
      expect(record?.prior_opening_found).toBe(false);
      expect(record?.prior_opening_absence_established).toBe(false);
      expect(record?.occasions?.o1.prior_opening_absence_established).toBe(
        false,
      );
      expect(record?.occasions?.o2.prior_opening_absence_established).toBe(
        false,
      );
      expect(record?.prior_page_load_event_count).toBe(prior.length);

      const result = classifyM01(2, [record]);

      expect(result.check_coherent).toBe(true);
      expect(result.history_level_uncertain).toBe(true);
      expect(classes(result)).toEqual({
        o1: ['U', false, 'history_discontinuous'],
        o2: ['U', false, 'history_discontinuous'],
      });
      expect(result.occasions.o1.reason).toBe('earlier history not verified');
    });
  }

  test('store_evictions is not a continuity condition (r3 §3, withdrawn)', () => {
    const integrity = { ...CONTINUOUS, store_evictions: 3 };
    const record = check(2, M01_LOAD1_BRIEFED, integrity);

    expect(record).toEqual(ESTABLISHED_M01_RECORD);
  });

  test('an earlier opening is found per occasion, with its sequence (P-1)', () => {
    const record = check(2, M01_LOAD1_O1_OPENED);

    expect(record).toEqual({
      page_load_index: 2,
      prior_page_load_event_count: 4,
      history_continuous: true,
      prior_briefing_found: true,
      prior_opening_found: true,
      prior_opening_absence_established: false,
      prior_opening_sequences: [4],
      occasions: {
        o1: {
          prior_briefing_found: true,
          prior_opening_found: true,
          prior_opening_absence_established: false,
          prior_opening_sequences: [4],
        },
        o2: {
          prior_briefing_found: true,
          prior_opening_found: false,
          prior_opening_absence_established: true,
          prior_opening_sequences: [],
        },
      },
    });
  });

  test('stages stay distinct: a briefing or presentation is never an opening (direction e)', () => {
    const prior = [
      ev(1, 'pilot_session_started'),
      ev(2, 'pilot_npc_beat', { beat: 'exterior_briefing' }),
      ev(3, `${M23}presented`),
    ];
    const record = written(
      computePriorLoadCheck({
        pageLoadIndex: 2,
        priorLoadEvents: prior,
        integrity: CONTINUOUS,
        stages: M23_STAGES,
      }),
    );

    expect(record).toEqual({
      page_load_index: 2,
      prior_page_load_event_count: 3,
      history_continuous: true,
      prior_briefing_found: true,
      prior_presentation_found: true,
      prior_opening_found: false,
      prior_opening_absence_established: true,
      prior_opening_sequences: [],
    });
    expect(record).not.toHaveProperty('occasions');

    const result = classifyReload({
      pageLoadIndex: 2,
      checks: [record],
    });

    expect(classes(result)).toEqual({
      row: ['A', true, 'absence_established'],
    });

    const opened = written(
      computePriorLoadCheck({
        pageLoadIndex: 2,
        priorLoadEvents: [...prior, ev(4, `${M23}opportunity_opened`)],
        integrity: CONTINUOUS,
        stages: M23_STAGES,
      }),
    );

    expect(opened.prior_opening_found).toBe(true);
    expect(opened.prior_opening_sequences).toEqual([4]);
    expect(
      classes(
        classifyReload({
          pageLoadIndex: 2,
          checks: [opened],
        }),
      ),
    ).toEqual({ row: ['H', false, 'opening_found'] });
  });

  test('named evidence flags are reported per occasion (M25 belief and probe fields, D-4)', () => {
    const record = computePriorLoadCheck({
      pageLoadIndex: 2,
      priorLoadEvents: [
        ev(1, `${M25}presented`),
        ev(2, `${M25}opportunity_opened`),
        ev(3, `${M25}required_complete`),
        ev(4, 'proto_m25_belief_question_presented'),
      ],
      integrity: CONTINUOUS,
      occasions: {
        loops: {
          briefing: of(M25, 'presented'),
          opening: of(M25, 'opportunity_opened'),
          holdBack: of(M25, 'technical_failure', 'loops'),
          evidence: { prior_required_complete: of(M25, 'required_complete') },
        },
        belief: {
          opening: of('proto_m25_belief_', 'question_presented'),
          holdBack: of(M25, 'technical_failure', 'belief'),
          evidence: {
            prior_belief_answered: of('proto_m25_belief_', 'question_answered'),
          },
        },
      },
    });

    expect(record?.occasions?.loops.evidence).toEqual({
      prior_required_complete: true,
    });
    expect(record?.occasions?.belief.evidence).toEqual({
      prior_belief_answered: false,
    });
    expect(record?.occasions?.belief.prior_opening_found).toBe(true);
    expect(record?.occasions?.belief.prior_opening_sequences).toEqual([4]);
  });
});

test.describe('RL-0 classifier: classes and permission', () => {
  test('no check on a reloaded load ⇒ history-level U, refused', () => {
    const result = classifyM01(2, []);

    expect(result.check_count).toBe(0);
    expect(result.check_coherent).toBeNull();
    expect(result.exposure_record_consistent).toBe(true);
    expect(result.history_level_uncertain).toBe(true);
    expect(classes(result)).toEqual({
      o1: ['U', false, 'no_check'],
      o2: ['U', false, 'no_check'],
    });
  });

  test('a self-contradictory record ⇒ M for every occasion, refused, coherence false', () => {
    const contradictions: [string, Record<string, unknown>][] = [
      [
        'established while not continuous',
        { ...ESTABLISHED_M01_RECORD, history_continuous: false },
      ],
      [
        'established while an opening was found',
        {
          ...ESTABLISHED_M01_RECORD,
          prior_opening_found: true,
          occasions: {
            ...ESTABLISHED_M01_RECORD.occasions,
            o1: {
              ...ESTABLISHED_M01_RECORD.occasions.o1,
              prior_opening_found: true,
              prior_opening_absence_established: false,
            },
          },
        },
      ],
      [
        'established without an earlier record',
        { ...ESTABLISHED_M01_RECORD, prior_page_load_event_count: 0 },
      ],
      [
        'the row denies an opening an occasion reports',
        {
          ...ESTABLISHED_M01_RECORD,
          prior_opening_absence_established: false,
          occasions: {
            ...ESTABLISHED_M01_RECORD.occasions,
            o1: {
              ...ESTABLISHED_M01_RECORD.occasions.o1,
              prior_opening_found: true,
              prior_opening_absence_established: false,
            },
          },
        },
      ],
      [
        'the row established while an occasion is not',
        {
          ...ESTABLISHED_M01_RECORD,
          occasions: {
            ...ESTABLISHED_M01_RECORD.occasions,
            o2: {
              ...ESTABLISHED_M01_RECORD.occasions.o2,
              prior_opening_absence_established: false,
            },
          },
        },
      ],
      [
        'the row not established while every occasion is',
        { ...ESTABLISHED_M01_RECORD, prior_opening_absence_established: false },
      ],
    ];

    for (const [label, record] of contradictions) {
      const result = classifyM01(2, [record]);

      expect(result.check_coherent, label).toBe(false);
      expect(result.exposure_record_consistent, label).toBe(false);
      expect(result.check_malformed, label).toBe(false);
      expect(classes(result), label).toEqual({
        o1: ['M', false, 'check_incoherent'],
        o2: ['M', false, 'check_incoherent'],
      });
      expect(result.occasions.o1.reason, label).toBe(
        'earlier check contradictory',
      );
    }
  });

  test('a self-contradictory record of a family without occasions ⇒ M, refused', () => {
    const result = classifyReload({
      pageLoadIndex: 2,
      checks: [
        {
          page_load_index: 2,
          prior_page_load_event_count: 3,
          history_continuous: false,
          prior_briefing_found: true,
          prior_presentation_found: true,
          prior_opening_found: false,
          prior_opening_absence_established: true,
          prior_opening_sequences: [],
        },
      ],
    });

    expect(result.check_coherent).toBe(false);
    expect(result.exposure_record_consistent).toBe(false);
    expect(classes(result)).toEqual({
      row: ['M', false, 'check_incoherent'],
    });
  });

  test('a malformed record (another load, or a missing occasion) ⇒ held, flagged, with its own reason', () => {
    const otherLoad = classifyM01(3, [ESTABLISHED_M01_RECORD]);

    expect(otherLoad.check_malformed).toBe(true);
    expect(otherLoad.check_coherent).toBe(false);
    expect(otherLoad.exposure_record_consistent).toBe(false);
    expect(classes(otherLoad)).toEqual({
      o1: ['U', false, 'malformed_check'],
      o2: ['U', false, 'malformed_check'],
    });
    expect(otherLoad.occasions.o1.reason).toBe('check record malformed');

    const missing = classifyM01(2, [
      {
        ...ESTABLISHED_M01_RECORD,
        occasions: { o1: ESTABLISHED_M01_RECORD.occasions.o1 },
      },
    ]);

    expect(missing.check_malformed).toBe(true);
    expect(classes(missing)).toEqual({
      o1: ['U', false, 'malformed_check'],
      o2: ['U', false, 'malformed_check'],
    });
  });

  test('a record on a first page load establishes nothing and changes no administration', () => {
    const result = classifyM01(1, [
      { ...ESTABLISHED_M01_RECORD, page_load_index: 1 },
    ]);

    expect(result.page_reloaded).toBe(false);
    expect(result.check_coherent).toBe(false);
    expect(result.exposure_record_consistent).toBe(false);
    expect(classes(result)).toEqual({
      o1: [null, true, 'first_load'],
      o2: [null, true, 'first_load'],
    });
  });

  test('an earlier opening found ⇒ H for that occasion, A for its sibling', () => {
    const record = check(2, M01_LOAD1_O1_OPENED);
    const result = classifyM01(2, [record]);

    expect(result.check_coherent).toBe(true);
    expect(classes(result)).toEqual({
      o1: ['H', false, 'opening_found'],
      o2: ['A', true, 'absence_established'],
    });
    expect(result.occasions.o1.reason).toBe('earlier opening found');
  });

  test('an opening found beside a discontinuous history stays H; its sibling is U (writer precedence, §5.379 (a))', () => {
    const record = check(2, M01_LOAD1_O1_OPENED, {
      ...CONTINUOUS,
      sequence_gap_count: 2,
    });

    expect(record?.history_continuous).toBe(false);
    expect(record?.occasions?.o1.prior_opening_found).toBe(true);

    const result = classifyM01(2, [record]);

    expect(result.history_level_uncertain).toBe(true);
    expect(classes(result)).toEqual({
      o1: ['H', false, 'opening_found'],
      o2: ['U', false, 'history_discontinuous'],
    });
  });

  test('M04: an earlier cut of one job holds both jobs (joint hold-back)', () => {
    const jobs = {
      o1: {
        briefing: of(M04, 'listed', 'o1'),
        presentation: of(M04, 'presented', 'o1'),
        opening: of(M04, 'opportunity_opened', 'o1'),
        holdBack: of(M04, 'technical_failure', 'o1'),
      },
      o2: {
        briefing: of(M04, 'listed', 'o2'),
        presentation: of(M04, 'presented', 'o2'),
        opening: of(M04, 'opportunity_opened', 'o2'),
        holdBack: of(M04, 'technical_failure', 'o2'),
      },
    };
    const record = written(
      computePriorLoadCheck({
        pageLoadIndex: 2,
        priorLoadEvents: [
          ev(1, `${M04}listed`, { occasion: 'o1' }),
          ev(2, `${M04}listed`, { occasion: 'o2' }),
          ev(3, `${M04}presented`, { occasion: 'o1' }),
          ev(4, `${M04}opportunity_opened`, { occasion: 'o1' }),
        ],
        integrity: CONTINUOUS,
        occasions: jobs,
      }),
    );

    expect(record.prior_presentation_found).toBe(true);
    expect(record.occasions?.o2.prior_presentation_found).toBe(false);
    expect(record.occasions?.o2.prior_opening_found).toBe(false);

    const checks = [record];

    expect(
      classes(
        classifyReload({
          pageLoadIndex: 2,
          checks,
          occasions: ['o1', 'o2'],
          jointHoldBack: [['o1', 'o2']],
        }),
      ),
    ).toEqual({
      o1: ['H', false, 'opening_found'],
      o2: ['H', false, 'joint_hold_back'],
    });
    // Without the joint rule the record's own reading would admit o2.
    expect(
      classes(
        classifyReload({ pageLoadIndex: 2, checks, occasions: ['o1', 'o2'] }),
      ),
    ).toEqual({
      o1: ['H', false, 'opening_found'],
      o2: ['A', true, 'absence_established'],
    });

    // Job 1 held as U (an earlier unverified hold-back carried forward):
    // job 2's start state is unknown too, so it is held as U.
    const carried = written(
      computePriorLoadCheck({
        pageLoadIndex: 3,
        priorLoadEvents: [
          ev(1, `${M04}listed`, { occasion: 'o1' }),
          ev(2, `${M04}listed`, { occasion: 'o2' }),
          ev(3, `${M04}technical_failure`, {
            occasion: 'o1',
            detail:
              'reload with an unverified earlier state: cutting job not run',
          }),
        ],
        integrity: CONTINUOUS,
        occasions: jobs,
      }),
    );

    expect(
      classes(
        classifyReload({
          pageLoadIndex: 3,
          checks: [carried],
          occasions: ['o1', 'o2'],
          jointHoldBack: [['o1', 'o2']],
        }),
      ),
    ).toEqual({
      o1: ['U', false, 'absence_not_established'],
      o2: ['U', false, 'joint_hold_back'],
    });
  });
});

test.describe('RL-0 acceptance fixtures (clarification 2)', () => {
  test('F-A: agreeing duplicate checks with distinct sequence numbers ⇒ U, refused (D-6 (i))', () => {
    const record = check(2, M01_LOAD1_BRIEFED);
    // The same payload logged twice (sequences 9 and 10): each, alone,
    // would establish the absence.
    const events = [
      ev(9, `${M01}prior_load_checked`, { ...record }),
      ev(10, `${M01}prior_load_checked`, { ...record }),
    ];

    expect(events.map((event) => event.sequence)).toEqual([9, 10]);
    expect(record.prior_opening_absence_established).toBe(true);

    const result = classifyM01(
      2,
      events.map((event) => event.metadata ?? {}),
    );

    expect(result.check_count).toBe(2);
    expect(result.check_coherent).toBe(true);
    // §5.290 (a): two checks are never a consistent exposure record.
    expect(result.exposure_record_consistent).toBe(false);
    expect(result.history_level_uncertain).toBe(true);
    expect(classes(result)).toEqual({
      o1: ['U', false, 'duplicate_checks'],
      o2: ['U', false, 'duplicate_checks'],
    });
    expect(result.occasions.o2.reason).toBe('earlier history not verified');
  });

  test('F-B: conflicting duplicate checks ⇒ U, refused, coherence false', () => {
    const established = check(2, M01_LOAD1_BRIEFED);
    const opened = check(2, M01_LOAD1_O1_OPENED);
    const result = classifyM01(2, [established, opened]);

    expect(established.prior_opening_found).toBe(false);
    expect(opened.prior_opening_found).toBe(true);
    expect(result.check_count).toBe(2);
    expect(result.check_coherent).toBe(false);
    expect(result.exposure_record_consistent).toBe(false);
    expect(classes(result)).toEqual({
      o1: ['U', false, 'duplicate_checks'],
      o2: ['U', false, 'duplicate_checks'],
    });
  });

  test('agreeing duplicates that each contradict themselves ⇒ U, refused, coherence false', () => {
    const contradictory = {
      ...ESTABLISHED_M01_RECORD,
      history_continuous: false,
    };
    const result = classifyM01(2, [contradictory, { ...contradictory }]);

    expect(result.check_count).toBe(2);
    expect(result.check_coherent).toBe(false);
    expect(result.exposure_record_consistent).toBe(false);
    expect(classes(result)).toEqual({
      o1: ['U', false, 'duplicate_checks'],
      o2: ['U', false, 'duplicate_checks'],
    });
  });

  for (const [cls, note] of [
    ['U', 'reload with an unverified earlier state: batch not administered'],
    ['M', 'reload with a contradictory earlier check: batch not administered'],
  ] as const) {
    test(`F-C: an earlier ${cls} hold-back, then a continuous history ⇒ that occasion stays U, refused (D-7 (i))`, () => {
      // Load 1 briefed; load 2 held o1 back as ${cls}; this is load 3, and
      // the recovered history is continuous by now.
      const prior = [
        ...M01_LOAD1_BRIEFED,
        ev(4, `${M01}prior_load_checked`),
        ev(5, `${M01}technical_failure`, { occasion: 'o1', detail: note }),
      ];
      const record = check(3, prior);

      expect(record?.history_continuous).toBe(true);
      expect(record?.prior_opening_found).toBe(false);
      expect(record?.prior_opening_absence_established).toBe(false);
      expect(record?.occasions?.o1).toEqual({
        prior_briefing_found: true,
        prior_opening_found: false,
        prior_opening_absence_established: false,
        prior_opening_sequences: [],
      });
      expect(record?.occasions?.o2.prior_opening_absence_established).toBe(
        true,
      );

      const result = classifyM01(3, [record]);

      expect(result.check_coherent).toBe(true);
      expect(result.history_level_uncertain).toBe(false);
      // F-D at the helper: the sibling is A and administered.
      expect(classes(result)).toEqual({
        o1: ['U', false, 'absence_not_established'],
        o2: ['A', true, 'absence_established'],
      });
    });
  }

  test('F-D: an A sibling beside an occasion-level M is administered; the M occasion is held', () => {
    const record = {
      ...ESTABLISHED_M01_RECORD,
      occasions: {
        ...ESTABLISHED_M01_RECORD.occasions,
        // o1's own flags contradict each other (established and found);
        // the row's own flags agree with the occasions.
        o1: {
          ...ESTABLISHED_M01_RECORD.occasions.o1,
          prior_opening_found: true,
        },
      },
      prior_opening_found: true,
      prior_opening_absence_established: false,
    };
    const result = classifyM01(2, [record]);

    expect(result.check_coherent).toBe(false);
    expect(result.exposure_record_consistent).toBe(false);
    expect(result.history_level_uncertain).toBe(false);
    expect(classes(result)).toEqual({
      o1: ['M', false, 'occasion_incoherent'],
      o2: ['A', true, 'absence_established'],
    });
  });

  test('F-E: an H marker of one occasion leaves an eligible sibling A and administered', () => {
    // Load 1 opened o1; load 2 held it back as H; this is load 3.
    const prior = [
      ...M01_LOAD1_O1_OPENED,
      ev(5, `${M01}prior_load_checked`),
      ev(6, `${M01}technical_failure`, {
        occasion: 'o1',
        detail: 'reload after administration: batch not re-run',
      }),
    ];
    const record = check(3, prior);

    expect(record?.occasions?.o1.prior_opening_found).toBe(true);
    expect(record?.occasions?.o2).toEqual({
      prior_briefing_found: true,
      prior_opening_found: false,
      prior_opening_absence_established: true,
      prior_opening_sequences: [],
    });

    const result = classifyM01(3, [record]);

    expect(classes(result)).toEqual({
      o1: ['H', false, 'opening_found'],
      o2: ['A', true, 'absence_established'],
    });
  });

  test('F-E (rule): an H marker never triggers the carry-forward, even on its own occasion', () => {
    const prior = [
      ...M01_LOAD1_BRIEFED,
      ev(4, `${M01}technical_failure`, {
        occasion: 'o2',
        detail: 'reload after administration: batch not re-run',
      }),
    ];
    const record = check(2, prior);

    expect(record?.occasions?.o2.prior_opening_absence_established).toBe(true);
    expect(classes(classifyM01(2, [record]))).toEqual({
      o1: ['A', true, 'absence_established'],
      o2: ['A', true, 'absence_established'],
    });
  });

  test('a U hold-back of another family or another occasion is never carried', () => {
    const prior = [
      ...M01_LOAD1_BRIEFED,
      ev(4, 'proto_m12_check_technical_failure', {
        occasion: 'o1',
        detail:
          'reload with an unverified earlier state: packet not administered',
      }),
      ev(5, `${M01}technical_failure`, {
        occasion: 'o2',
        detail:
          'reload with an unverified earlier state: batch not administered',
      }),
    ];
    const result = classifyM01(2, [check(2, prior)]);

    expect(classes(result)).toEqual({
      o1: ['A', true, 'absence_established'],
      o2: ['U', false, 'absence_not_established'],
    });
  });
});

test.describe('RL-0 helpers and boundaries', () => {
  test('hold-back details: the prefix names the class; anything else is none', () => {
    expect(reloadHoldBackDetail('H', 'batch not re-run')).toBe(
      'reload after administration: batch not re-run',
    );
    expect(reloadHoldBackDetail('U', 'batch not administered')).toBe(
      'reload with an unverified earlier state: batch not administered',
    );
    expect(reloadHoldBackDetail('M', 'batch not administered')).toBe(
      'reload with a contradictory earlier check: batch not administered',
    );
    // M07's existing details (`m07Calibration.ts`).
    expect(
      reloadHoldBackClass('reload after administration: bench not re-run'),
    ).toBe('H');
    expect(
      reloadHoldBackClass(
        'reload with an unverified earlier state: bench not administered',
      ),
    ).toBe('U');
    expect(
      reloadHoldBackClass('reload after a review closure: bench not reopened'),
    ).toBeNull();
    expect(reloadHoldBackClass('tutorial skipped')).toBeNull();
    expect(reloadHoldBackClass(undefined)).toBeNull();
  });

  test('the record is never task evidence: only the family check is removed', () => {
    const family = [
      ev(7, `${M01}prior_load_checked`),
      ev(8, `${M01}presented`, { occasion: 'o1' }),
      ev(9, `${M01}opportunity_opened`, { occasion: 'o1' }),
      ev(10, `${M23}prior_load_checked`),
    ];

    expect(
      withoutPriorLoadChecks(family, M01).map((event) => event.sequence),
    ).toEqual([8, 9, 10]);
  });

  test('the module is pure: it imports nothing', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'measurement', 'reloadCheck.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\brequire\(/);
  });
});
