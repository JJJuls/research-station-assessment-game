/**
 * Station 080 M20 — the two held channels of the Mast 04 feed at the
 * Records Workshop station feed console (Unit 22, administration
 * `m20-feed-returns-v2`), pure tests.
 *
 * Playwright test blocks that never touch `page`:
 * - the INDEPENDENT ORACLE: this file carries its own transcription of both
 *   channels' targets, the cell counts, the hold step, the protocol
 *   constants (30 000 / 30 000 / 6 000 / 8 000) and every participant-facing
 *   string, written by hand from `U22-OWNER-PREVIEW.md` sections 2 and 4 —
 *   it imports nothing from `m20FeedContent.ts` for the expected side. It
 *   evaluates the differ count of 200 vectors per step with its own
 *   evaluator and compares the module's counts with them; a cross-check then
 *   binds the module's text to the transcription;
 * - the project model under research-owner decision D-U22-1 as selected:
 *   the vector refusal rule (E31–E34), the hold at step 2, the SILENT release
 *   at exactly hold + 30 000 whatever the context, the spontaneous resumption
 *   (an executed ALIGN in the silent window; its notice cancelled), the
 *   notice's due time, delivery conditions, early end and spacing from A's
 *   ACTUAL end, the cued credit, the transitions of preview §4.12, the
 *   settle and the fresh-press rule;
 * - the read-only extractor on synthetic logs: the preview §7 cases E1–E61
 *   (72 cases, expected values written by hand, never imported from the
 *   derivation), at least one void case per integrity rule S1–S7,
 *   descriptive inconsistencies as flags;
 * - the clock policy with an injected clock;
 * - the register row and route, the legacy modules' separation and the
 *   Workshop / yard wiring (source checks);
 * - the wording of the console, the chip and the notice.
 *
 * Nothing here establishes psychometric validity: the two channels are
 * clustered observations inside one project, one room and one shift, not two
 * independent situations; longer remaining copying is not established
 * difficulty; the cued count is conditional on no spontaneous resumption and
 * is no ranking across participants; a count never proves a trait.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { REGISTER_V3, registerEntry } from '../src/measurement/registerV3';
import {
  classifyReload,
  reloadHoldBackClass,
} from '../src/measurement/reloadCheck';
import { PILOT_SCHEDULE } from '../src/pilot/coverageSchedule';
import {
  M20_CELLS_PER_STEP,
  M20_CHANNELS,
  M20_CONTENT_VERSION,
  M20_CUE_CHECK_MS,
  M20_ENTRY_STATE_VERSION,
  M20_FAMILY,
  M20_FORM_ID,
  M20_HOLD_AFTER_STEP,
  M20_NOTICE_AFTER_RELEASE_MS,
  M20_NOTICE_MS,
  M20_OPPORTUNITY_ID,
  M20_RELEASE_MS,
  M20_SETTLE_MS,
  M20_SPACING_MS,
  M20_TEXT,
  M20_WINDOW_ID,
  m20Aligned,
  type M20ChannelId,
  m20CycleCell,
  m20Differ,
  m20ParticipantStrings,
  m20Target,
} from '../src/pilot/windows/m20FeedContent';
import {
  createM20Project,
  M20_CONTRADICTORY_DETAIL,
  M20_EVENT_SUFFIXES,
  M20_RELOAD_DETAIL,
  M20_UNVERIFIED_DETAIL,
  m20ChannelButtons,
  m20ChannelWord,
  m20ChipText,
  m20ClosureSnapshot,
  type M20CueContext,
  m20EntrySnapshot,
  type M20LogSink,
  m20NoticeLines,
  m20PriorAdministration,
  m20PriorHoldBackCarried,
  m20PriorLoadCheck,
  type M20Project,
  m20RecordLine,
  m20ResultFinal,
  m20sAlign,
  m20sChangeCell,
  m20sChannels,
  m20sCloseAtReview,
  m20sCloseAtShiftEnd,
  m20sCloseHelp,
  m20sCloseUnopened,
  m20sContinue,
  m20sContinueChannel,
  m20sCueCheck,
  m20sEndCue,
  m20sFail,
  m20sHelp,
  m20sHoldBack,
  m20sLeave,
  m20sOpen,
  m20sStartB,
  m20sWriteDueReleases,
} from '../src/pilot/windows/m20FeedModel';
import {
  type M20SurfaceHost,
  m20SurfaceModel,
} from '../src/pilot/windows/m20SurfaceModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/* ------------------------------------------------------------------ *
 * 1. The transcription, by hand from the preview (§2, §4). Nothing below
 *    is imported from the content module.
 * ------------------------------------------------------------------ */

const HAND = {
  administration: 'm20-feed-returns-v2',
  form: 'm20-form-1',
  content: 'm20-content-v2',
  family: 'proto_m20_feed_',
  opportunity: 'proto_m20_feed_project',
  window: 'm20_feed_w1',
  channels: ['m20_ch_a', 'm20_ch_b'],
  cells_per_step: [3, 3, 4, 4, 5, 5],
  hold_after_step: 2,
  loading_value: 1,
  cell_max: 4,
  release_ms: 30_000,
  notice_after_release_ms: 30_000,
  notice_ms: 6_000,
  spacing_ms: 8_000,
  settle_ms: 400,
  check_ms: 250,
  targets: {
    m20_ch_a: [
      [2, 4, 3],
      [3, 1, 4],
      [4, 2, 1, 3],
      [1, 3, 4, 2],
      [3, 4, 2, 1, 4],
      [2, 1, 3, 4, 2],
    ],
    m20_ch_b: [
      [4, 1, 3],
      [2, 3, 1],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 2, 3, 1, 3],
      [1, 4, 2, 3, 4],
    ],
  } as Record<string, number[][]>,
  /** The differ count: cells unequal to the target. */
  differ: (channel: string, step: number, cells: number[]) =>
    HAND.targets[channel][step - 1].reduce(
      (n, t, i) => n + (t === cells[i] ? 0 : 1),
      0,
    ),
  cycle: (v: number) => (v === 4 ? 1 : v + 1),
};

/**
 * Every participant-facing string of preview §4.2–§4.9, in the forms the
 * console shows — as amended by the owner on 14 October 2026 (register
 * §5.359 (4), §5.360 (c)–(g)): the one-time hold sentence, the CHANNELS
 * control and help line, the pass-open hold lines, the labelled cell tile,
 * the last-ALIGN line and the state-dependent footers.
 */
const HAND_STRINGS: string[] = [
  'MAST 04 FEED',
  'Two channels',
  'Channel A · step 3 of 6',
  'Channel B · step 6 of 6',
  'Channel A held',
  'Channel B held',
  'Channel A · pass open',
  'Channel B · pass open',
  'Both channels',
  'Read the card, then CONTINUE.',
  'Working on channel A.',
  'Working on channel B.',
  'Channel A is held until its next pass.',
  'Channel B is held until its next pass.',
  'Channel A can be continued.',
  'Channel B can be continued.',
  'Choose a channel, or LEAVE.',
  'TAB move · ENTER or SPACE use · H help · ESC leave',
  '1-3 change a cell · G align · C channels · H help · ESC leave',
  '1-4 change a cell · G align · C channels · H help · ESC leave',
  '1-5 change a cell · G align · C channels · H help · ESC leave',
  'TAB move · ENTER or SPACE use · C channels · H help · ESC leave',
  'A / B choose · TAB move · H help · ESC leave',
  'A choose · TAB move · H help · ESC leave',
  'B choose · TAB move · H help · ESC leave',
  'TAB move · H help · ESC leave',
  'H or ESC close help',
  'ESC leave',
  'The Mast 04 feed has two channels, A and B. Each needs six steps.',
  'A step shows a TARGET row. Set each cell to match it, then ALIGN.',
  'After an ALIGN the console says how many cells still differ.',
  'Each channel is held once, after step 2. Its uplink pass then ends',
  'and the channel waits until its next pass opens.',
  "The console shows when a channel's pass is open again. If the",
  'channel is still waiting a while later, a station notice says so.',
  'Steps have no time limit. Channel A comes first.',
  'Signing off at the work order board closes this console for the shift.',
  'CONTINUE',
  'HELP  [H]',
  'LEAVE  [ESC]',
  'CLOSE HELP  [H]',
  'ALIGN  [G]',
  'CHANNELS  [C]',
  'TARGET   3  4  2  1  4',
  'CELLS    3  4  1  1  4',
  'Channel A: 4 of 6 steps done.',
  'CELL 1   value 3   [1]',
  'CELL 5   value 4   [5]',
  'Last ALIGN: 2 cells differed.',
  'Last ALIGN: 1 cell differed.',
  'Not aligned: 2 cells differ.',
  'Not aligned: 1 cell differs.',
  'Step 3 aligned.',
  'The cells are as loaded. Change a cell first.',
  'Same cells as the last ALIGN. Change a cell first.',
  'Channel A aligned.',
  'Pass ended. Channel A is held.',
  'Channel A: 2 of 6 steps done, 4 remain.',
  'Its next pass opens later. This console shows when it is open.',
  'Pass ended. Channel B is held.',
  'Channel B: 2 of 6 steps done, 4 remain.',
  'Its next pass opens later. This console shows when it is open.',
  'Pass open. Channel A can be continued.',
  'Channel A: 2 of 6 steps done, 4 remain.',
  'Pass open. Channel B can be continued.',
  'Channel B: 2 of 6 steps done, 4 remain.',
  'START CHANNEL B  [B]',
  'CONTINUE CHANNEL A  [A]',
  'CONTINUE CHANNEL B  [B]',
  'CHANNEL A   2 of 6 steps   held',
  'CHANNEL B   0 of 6 steps   not started',
  'CHANNEL A   2 of 6 steps   pass open',
  'CHANNEL B   1 of 6 steps   in work',
  'CHANNEL A   6 of 6 steps   aligned',
  'No channel can be worked until its next pass.',
  'Both channels are aligned. The feed is restored.',
  'HELP',
  'Each channel needs six steps. Set every cell to its TARGET, then ALIGN.',
  'A cell changes each time you use it: 1, 2, 3, 4, then 1 again.',
  'Each channel is held once, after step 2. Its uplink pass ends then.',
  'Once its next pass is open, the channel can be continued here.',
  'If it is still waiting a while later, a station notice says so.',
  'CHANNELS shows both channels without leaving the console.',
  'Leaving the console keeps everything as it is.',
  'Signing off at the work order board closes this console.',
  'The console closed when the shift was signed off.',
  'The console closed at the shift review.',
  'This console was opened earlier in the session. It stays closed now.',
  // U24 RL-4 (r3 §9, owner decision D-5): the U / M hold's two lines.
  'The earlier state of this feed console could not be verified.',
  'It stays closed after this reload.',
  'The feed console has a fault and is closed.',
  'Its record is kept as it is.',
  'FEED CONSOLE: the next pass for channel A is open.',
  'Channel A can be continued · 4 of 6 steps remain.',
  'FEED CONSOLE: the next pass for channel B is open.',
  'Channel B can be continued · 4 of 6 steps remain.',
  'MAST 04 FEED · 2 channels',
  'closed for the shift',
  'A 2/6 · B 0/6',
  'A 6/6 · B 3/6',
];

/** The wording audit of preview §8 (case-insensitive substrings). */
const FORBIDDEN: string[] = [
  'people',
  'describe',
  'someone',
  'stick',
  'task',
  'difficult',
  'difficulty',
  'hard',
  'persist',
  'persever',
  'grit',
  'determin',
  'resilien',
  'give up',
  'quit',
  'effort',
  'lazy',
  'good',
  'well done',
  'great',
  'fail',
  'score',
  'test',
  'measure',
  'rating',
  'must',
  'should',
  'need to',
  "don't forget",
  'remember',
  'hurry',
  'quick',
  'please',
  'return',
  'interrupt',
  'remind',
  'proto_',
];

const A: M20ChannelId = 'm20_ch_a';
const B: M20ChannelId = 'm20_ch_b';

test.describe('M20 oracle: the content (Unit 22)', () => {
  test('the identity, the constants and the targets equal the transcription', () => {
    expect(M20_ENTRY_STATE_VERSION).toBe(HAND.administration);
    expect(M20_FORM_ID).toBe(HAND.form);
    expect(M20_CONTENT_VERSION).toBe(HAND.content);
    expect(M20_FAMILY).toBe(HAND.family);
    expect(M20_OPPORTUNITY_ID).toBe(HAND.opportunity);
    expect(M20_WINDOW_ID).toBe(HAND.window);
    expect(M20_CHANNELS.map((c) => c.id)).toEqual(HAND.channels);
    expect([...M20_CELLS_PER_STEP]).toEqual(HAND.cells_per_step);
    expect(M20_HOLD_AFTER_STEP).toBe(HAND.hold_after_step);
    expect(M20_RELEASE_MS).toBe(HAND.release_ms);
    expect(M20_NOTICE_AFTER_RELEASE_MS).toBe(HAND.notice_after_release_ms);
    expect(M20_NOTICE_MS).toBe(HAND.notice_ms);
    expect(M20_SPACING_MS).toBe(HAND.spacing_ms);
    expect(M20_SETTLE_MS).toBe(HAND.settle_ms);
    expect(M20_CUE_CHECK_MS).toBe(HAND.check_ms);

    for (const channel of M20_CHANNELS) {
      expect(channel.targets.map((t) => [...t])).toEqual(
        HAND.targets[channel.id],
      );

      for (let step = 1; step <= 6; step += 1) {
        expect(m20Target(channel.id, step)).toEqual(
          HAND.targets[channel.id][step - 1],
        );
        expect(m20Target(channel.id, step)).toHaveLength(
          HAND.cells_per_step[step - 1],
        );
      }
    }
  });

  test('the differ count of 200 vectors per step equals the hand evaluator; only the target aligns; cycling runs 1 → 2 → 3 → 4 → 1', () => {
    let seed = 7;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;

      return seed;
    };

    for (const channel of HAND.channels) {
      for (let step = 1; step <= 6; step += 1) {
        const n = HAND.cells_per_step[step - 1];
        let alignedSeen = 0;

        for (let k = 0; k < 200; k += 1) {
          const cells = Array.from({ length: n }, () => 1 + (next() % 4));
          const hand = HAND.differ(channel, step, cells);

          expect(m20Differ(channel as M20ChannelId, step, cells)).toBe(hand);
          expect(m20Aligned(channel as M20ChannelId, step, cells)).toBe(
            hand === 0,
          );

          if (hand === 0) {
            alignedSeen += 1;
          }
        }

        expect(
          m20Aligned(
            channel as M20ChannelId,
            step,
            HAND.targets[channel][step - 1],
          ),
        ).toBe(true);
        expect(m20Differ(channel as M20ChannelId, step, Array(n).fill(1))).toBe(
          HAND.differ(channel, step, Array(n).fill(1)),
        );
        void alignedSeen;
      }
    }

    for (const v of [1, 2, 3, 4]) {
      expect(m20CycleCell(v)).toBe(HAND.cycle(v));
    }
  });

  test('every participant string of the module is in the transcription and every transcribed string in the module; none carries a forbidden token; the line budgets hold', () => {
    const module = m20ParticipantStrings();
    const hand = new Set(HAND_STRINGS);

    for (const s of module) {
      expect(hand.has(s), `module string in the transcription: "${s}"`).toBe(
        true,
      );
    }

    const moduleSet = new Set(module);

    for (const s of HAND_STRINGS) {
      expect(moduleSet.has(s), `transcribed string in the module: "${s}"`).toBe(
        true,
      );
    }

    for (const s of module) {
      const lower = s.toLowerCase();

      for (const token of FORBIDDEN) {
        expect(lower.includes(token), `${token} in "${s}"`).toBe(false);
      }

      expect(s.length, `line budget: "${s}"`).toBeLessThanOrEqual(72);
    }

    for (const letter of ['A', 'B'] as const) {
      for (const line of M20_TEXT.cue(letter)) {
        expect(line.length).toBeLessThanOrEqual(52);
      }
    }

    expect(M20_TEXT.card).toHaveLength(9);
    expect(M20_TEXT.help_lines).toHaveLength(8);
    // The owner's sentence (register §5.359 (4)), on the card and in help.
    expect(M20_TEXT.card.join(' ')).toContain(
      'Each channel is held once, after step 2.',
    );
    expect(M20_TEXT.help_lines.join(' ')).toContain(
      'Each channel is held once, after step 2.',
    );
    expect(M20_TEXT.held('A')).toHaveLength(3);
    // The chip never names held or pass open.
    for (const s of [
      M20_TEXT.chip_before,
      M20_TEXT.chip_closed,
      M20_TEXT.chip_counts(2, 2),
    ]) {
      expect(s).not.toMatch(/held|pass open/);
    }
  });
});

/* ------------------------------------------------------------------ *
 * 2. The project model (an injected clock, an injected context)
 * ------------------------------------------------------------------ */

interface Logged {
  suffix: string;
  metadata: Record<string, unknown>;
  sequence: number;
}

interface Run {
  s: M20Project;
  events: Logged[];
  sink: M20LogSink;
  now: number;
  tick: (ms: number) => number;
  settle: () => number;
  ctx: M20CueContext;
  check: () => ReturnType<typeof m20sCueCheck>;
}

const CLEAR: M20CueContext = {
  blocked: false,
  pause_causes: [],
  page_visible: true,
  page_focused: true,
  distance_to_console_px: 96,
};

function run(): Run {
  let sequence = 100;
  const r: Run = {
    s: createM20Project(),
    events: [],
    sink: (suffix, metadata) => {
      sequence += 10;
      r.events.push({ suffix, metadata, sequence });

      return sequence;
    },
    now: 1_000_000,
    tick: (ms) => {
      r.now += ms;

      return r.now;
    },
    settle: () => r.tick(M20_SETTLE_MS + 50),
    ctx: { ...CLEAR },
    check: () => m20sCueCheck(r.s, r.now, r.ctx, r.sink),
  };

  return r;
}

const suffixes = (r: Run) => r.events.map((e) => e.suffix);
const last = (r: Run, suffix: string) =>
  [...r.events].reverse().find((e) => e.suffix === suffix);
const count = (r: Run, suffix: string) =>
  r.events.filter((e) => e.suffix === suffix).length;
const ofChannel = (r: Run, suffix: string, id: string) =>
  r.events.filter((e) => e.suffix === suffix && e.metadata.channel_id === id);
const ch = (r: Run, id: M20ChannelId) => r.s.channels.find((c) => c.id === id)!;

function opened(): Run {
  const r = run();

  m20sOpen(r.s, r.now, r.sink);

  return r;
}

/** CONTINUE on the card: A step 1 presented. */
function atA1(): Run {
  const r = opened();

  expect(m20sContinue(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);

  return r;
}

/** Sets the current step's cells by cycling the tiles (settled presses). */
function set(r: Run, cells: number[]) {
  const channel = ch(r, r.s.current!);

  for (let i = 0; i < cells.length; i += 1) {
    let guard = 0;

    while (channel.cells[i] !== cells[i]) {
      expect(m20sChangeCell(r.s, i + 1, 'keyboard', r.settle(), r.sink)).toBe(
        true,
      );
      guard += 1;
      expect(guard).toBeLessThan(5);
    }
  }
}

function align(r: Run) {
  return m20sAlign(r.s, 'keyboard', r.settle(), r.sink);
}

/** Aligns the current step with its target. */
function solve(r: Run) {
  const channel = ch(r, r.s.current!);

  set(r, HAND.targets[channel.id][channel.step - 1]);

  const outcome = align(r);

  expect(outcome.kind).toBe('executed');
  expect(outcome.kind === 'executed' && outcome.aligned).toBe(true);

  return outcome;
}

/** A held: steps 1 and 2 of A aligned. */
function aHeld(): Run {
  const r = atA1();

  solve(r);
  solve(r);
  expect(r.s.view).toBe('held');
  expect(ch(r, A).held_at_ms).toBe(r.now);

  return r;
}

/** Both held: START B from A's hold view, B steps 1 and 2. */
function bothHeld(): Run {
  const r = aHeld();

  expect(m20sStartB(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
  solve(r);
  solve(r);
  expect(r.s.view).toBe('held');
  expect(ch(r, B).held_at_ms).toBe(r.now);
  m20sLeave(r.s, r.tick(200), r.sink);

  return r;
}

/** Waits until a channel's release is due and runs the check. */
function waitRelease(r: Run, id: M20ChannelId) {
  const channel = ch(r, id);

  r.now = Math.max(r.now, channel.held_at_ms! + M20_RELEASE_MS);

  return r.check();
}

/** Waits until a channel's notice is due and runs the check. */
function waitDue(r: Run, id: M20ChannelId) {
  const channel = ch(r, id);

  r.now = Math.max(
    r.now,
    channel.held_at_ms! + M20_RELEASE_MS + M20_NOTICE_AFTER_RELEASE_MS,
  );

  return r.check();
}

/** Reopens the console and CONTINUEs the channel (settled). */
function reopenContinue(r: Run, id: M20ChannelId) {
  m20sOpen(r.s, r.tick(200), r.sink);
  expect(m20sContinueChannel(r.s, id, 'keyboard', r.settle(), r.sink)).toBe(
    true,
  );
}

test.describe('M20 model: the card, the steps, the refusals (Unit 22)', () => {
  test('the first opening shows the card; CONTINUE starts A and presents step 1 with its cells loaded at 1; the hotkeys cycle a cell; ALIGN is refused as_loaded, executed on a changed vector, refused repeat on the same vector, executed on an older vector (E32, E33)', () => {
    const r = opened();

    expect(r.s.status).toBe('intro');
    expect(r.s.view).toBe('intro');
    expect(suffixes(r)).toEqual([]);
    // A press inside the settle changes nothing.
    expect(m20sContinue(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m20sContinue(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(suffixes(r)).toEqual([
      'intro_acknowledged',
      'channel_started',
      'step_presented',
    ]);
    expect(last(r, 'step_presented')?.metadata).toMatchObject({
      channel_id: A,
      occasion_id: A,
      step_index: 1,
      cells_n: 3,
      cells: [1, 1, 1],
      resumed: false,
    });
    expect(r.s.view).toBe('step');
    // ALIGN as loaded: refused, recorded, nothing else.
    expect(align(r)).toEqual({ kind: 'refused', reason: 'as_loaded' });
    expect(last(r, 'align_refused')?.metadata).toMatchObject({
      channel_id: A,
      step_index: 1,
      reason: 'as_loaded',
      cells: [1, 1, 1],
      after_cue: false,
      in_silent_window: false,
    });
    expect(count(r, 'align_attempt')).toBe(0);
    // A cell cycles 1 → 2 → 3 → 4 → 1 (descriptive records).
    for (const expected of [2, 3, 4, 1, 2]) {
      expect(m20sChangeCell(r.s, 1, 'pointer', r.settle(), r.sink)).toBe(true);
      expect(ch(r, A).cells[0]).toBe(expected);
    }

    expect(last(r, 'cell_changed')?.metadata).toMatchObject({
      cell: 1,
      value_before: 1,
      value_after: 2,
      input_mode: 'pointer',
    });
    // 2 1 1: executed, 2 cells differ.
    const first = align(r);

    expect(first).toMatchObject({ kind: 'executed', aligned: false });
    expect(last(r, 'align_attempt')?.metadata).toMatchObject({
      channel_id: A,
      step_index: 1,
      attempt_index: 1,
      cells: [2, 1, 1],
      differ: 2,
      aligned: false,
      after_cue: false,
      in_silent_window: false,
      resumption: null,
    });
    // The same vector again: refused repeat (E32 — cycled back to the same).
    set(r, [2, 2, 1]);
    set(r, [2, 1, 1]);
    expect(align(r)).toEqual({ kind: 'refused', reason: 'repeat' });
    expect(last(r, 'align_refused')?.metadata).toMatchObject({
      reason: 'repeat',
      cells: [2, 1, 1],
    });
    // A changed vector executes; then an OLDER vector (not the last) executes (E33).
    set(r, [2, 2, 1]);
    expect(align(r)).toMatchObject({ kind: 'executed', aligned: false });
    set(r, [2, 1, 1]);
    expect(align(r)).toMatchObject({ kind: 'executed', aligned: false });
    expect(count(r, 'align_attempt')).toBe(3);
    expect(last(r, 'align_attempt')?.metadata).toMatchObject({
      attempt_index: 3,
      cells: [2, 1, 1],
    });
    // The target aligns step 1 and presents step 2.
    set(r, [2, 4, 3]);
    expect(align(r)).toMatchObject({ kind: 'executed', aligned: true });
    expect(suffixes(r).slice(-3)).toEqual([
      'align_attempt',
      'step_aligned',
      'step_presented',
    ]);
    expect(last(r, 'step_presented')?.metadata).toMatchObject({
      step_index: 2,
      cells: [1, 1, 1],
      resumed: false,
    });
    expect(ch(r, A).steps_done).toBe(1);
  });

  test('a settling ALIGN is refused and recorded; any other press inside the settle is dropped; a double click executes once', () => {
    const r = atA1();

    set(r, [2, 1, 1]);
    // The view settled long ago: executed. A second click 100 ms later is a
    // repeat of the executed vector: refused, never a second attempt.
    expect(align(r).kind).toBe('executed');
    expect(m20sAlign(r.s, 'pointer', r.tick(100), r.sink)).toEqual({
      kind: 'refused',
      reason: 'repeat',
    });
    expect(count(r, 'align_attempt')).toBe(1);
    // Aligning step 1: the next step appears and settles; a carried press
    // inside the settle is refused `settling`.
    set(r, [2, 4, 3]);
    expect(align(r).kind).toBe('executed');
    expect(m20sAlign(r.s, 'keyboard', r.tick(100), r.sink)).toEqual({
      kind: 'refused',
      reason: 'settling',
    });
    expect(last(r, 'align_refused')?.metadata).toMatchObject({
      reason: 'settling',
      step_index: 2,
    });
    const edits = count(r, 'cell_changed');

    expect(m20sChangeCell(r.s, 1, 'keyboard', r.tick(50), r.sink)).toBe(false);
    expect(count(r, 'cell_changed')).toBe(edits);
    expect(ch(r, A).cells).toEqual([1, 1, 1]);
  });

  test('the hold: step 2 aligned ⇒ channel_held immediately, the hold view with START B; a held channel is never shown as a step (the held refusal is unreachable); START B from the hold view presents B step 1', () => {
    const r = aHeld();

    expect(suffixes(r).slice(-3)).toEqual([
      'align_attempt',
      'step_aligned',
      'channel_held',
    ]);
    expect(last(r, 'channel_held')?.metadata).toMatchObject({
      channel_id: A,
      held_at_ms: r.now,
      steps_done: 2,
      remaining_steps: 4,
    });
    expect(m20ChannelWord(ch(r, A))).toBe('held');
    expect(m20ChannelButtons(r.s)).toEqual({
      continue: [],
      start_b: true,
      none: false,
      both_aligned: false,
    });
    // No CONTINUE for a held channel; the step view cannot show.
    m20sLeave(r.s, r.tick(100), r.sink);
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(r.s.view).toBe('channels');
    expect(m20sContinueChannel(r.s, A, 'keyboard', r.settle(), r.sink)).toBe(
      false,
    );
    expect(count(r, 'held_visit')).toBe(1);
    expect(m20sStartB(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'channel_started')?.metadata).toMatchObject({
      channel_id: B,
      assigned_position: 2,
      realised_position: 2,
    });
    expect(r.s.view).toBe('step');
    expect(r.s.current).toBe(B);
    // B cannot be started twice; A cannot be continued while held.
    expect(m20sStartB(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
  });

  test('B never starts before A was held; leaving mid-step keeps the step and its cells (D-3); a reopening lands on the channel view with CONTINUE A and no START B', () => {
    const r = atA1();

    expect(m20sStartB(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    set(r, [2, 4, 1]);
    m20sLeave(r.s, r.tick(100), r.sink);
    expect(last(r, 'console_left')?.metadata).toMatchObject({
      view: 'step',
      channel_id: A,
    });
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(last(r, 'console_reopened')?.metadata).toMatchObject({
      view: 'channels',
    });
    expect(m20ChannelButtons(r.s)).toEqual({
      continue: [A],
      start_b: false,
      none: false,
      both_aligned: false,
    });
    expect(m20ChannelWord(ch(r, A))).toBe('in work');
    expect(m20sContinueChannel(r.s, A, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(last(r, 'step_presented')?.metadata).toMatchObject({
      step_index: 1,
      resumed: true,
      cells: [2, 4, 1],
    });
    expect(ch(r, A).cells).toEqual([2, 4, 1]);
  });

  test('the card is shown again when left before CONTINUE; help is exclusive and never work; ESC closes help first', () => {
    const r = opened();

    m20sLeave(r.s, r.tick(100), r.sink);
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(r.s.view).toBe('intro');
    expect(last(r, 'console_reopened')?.metadata).toMatchObject({
      view: 'intro',
    });
    expect(m20sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')?.metadata).toMatchObject({
      view: 'intro',
    });
    // A carried press inside the help sheet's settle closes nothing.
    expect(m20sCloseHelp(r.s, 'keyboard', r.tick(100), r.sink)).toBe(false);
    expect(m20sContinue(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    expect(m20sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
    expect(m20sCloseHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m20sContinue(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(m20sHelp(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    expect(last(r, 'help_consulted')?.metadata).toMatchObject({
      view: 'step_a_1',
      channel_id: A,
    });
    expect(align(r).kind).toBe('none');
    expect(count(r, 'align_refused')).toBe(0);
  });
});

test.describe('M20 model: the silent release, the notice and the resumptions (Unit 22)', () => {
  test('the release is written at exactly hold + 30 000 whatever the context — the console open, another surface open (blocked), outside the Workshop (no check until later), the page hidden — and before any view or work on the channel', () => {
    // Console open at the due time: the check (any opening) writes it.
    const r = bothHeld();
    const heldA = ch(r, A).held_at_ms!;

    r.now = heldA + M20_RELEASE_MS - 1;
    expect(r.check().released).toEqual([]);
    expect(count(r, 'channel_released')).toBe(0);
    r.now = heldA + M20_RELEASE_MS;
    expect(r.check().released).toEqual([A]);
    expect(last(r, 'channel_released')?.metadata).toMatchObject({
      channel_id: A,
      released_at_ms: heldA + M20_RELEASE_MS,
      written_at_ms: r.now,
      write_latency_ms: 0,
      check: 'tick',
    });
    expect(m20ChannelWord(ch(r, A))).toBe('pass open');
    expect(m20ChannelWord(ch(r, B))).toBe('held');

    // Blocked (another surface open): the release is still written on time.
    const r2 = bothHeld();

    r2.ctx = { ...CLEAR, blocked: true };
    r2.now = ch(r2, A).held_at_ms! + M20_RELEASE_MS + 5;
    expect(r2.check().released).toEqual([A]);
    expect(last(r2, 'channel_released')?.metadata).toMatchObject({
      released_at_ms: ch(r2, A).held_at_ms! + M20_RELEASE_MS,
      write_latency_ms: 5,
    });

    // Hidden page: written.
    const r3 = bothHeld();

    r3.ctx = { ...CLEAR, pause_causes: ['hidden'], page_visible: false };
    r3.now = ch(r3, B).held_at_ms! + M20_RELEASE_MS;
    expect(r3.check().released).toEqual([A, B]);

    // Outside the Workshop (no check ran): the opening writes it first,
    // with the protocol time unchanged, before the reopening record.
    const r4 = bothHeld();

    r4.now = ch(r4, B).held_at_ms! + M20_RELEASE_MS + 40_000;
    m20sWriteDueReleases(r4.s, r4.now, r4.sink, 'open');
    m20sOpen(r4.s, r4.now, r4.sink);
    expect(suffixes(r4).slice(-5)).toEqual([
      'channel_released',
      'channel_released',
      'console_reopened',
      'released_visit',
      'released_visit',
    ]);
    expect(ofChannel(r4, 'channel_released', A)[0].metadata).toMatchObject({
      released_at_ms: ch(r4, A).held_at_ms! + M20_RELEASE_MS,
      check: 'open',
    });
    // The sign-off writes a due release before the closure record.
    const r5 = bothHeld();

    r5.now = ch(r5, A).held_at_ms! + M20_RELEASE_MS;
    expect(m20sCloseAtShiftEnd(r5.s, r5.now, r5.sink)).toBe(true);
    expect(suffixes(r5).slice(-2)).toEqual([
      'channel_released',
      'project_closed',
    ]);
    expect(last(r5, 'channel_released')?.metadata).toMatchObject({
      channel_id: A,
      check: 'shift_end',
    });
  });

  test('the notice: never before release + 30 000; never while the console is open, something blocks or the page is unfocused or hidden; delivered at the first permitted moment with its records; one per channel, never repeated', () => {
    const r = bothHeld();
    const heldA = ch(r, A).held_at_ms!;
    const dueA = heldA + M20_RELEASE_MS + M20_NOTICE_AFTER_RELEASE_MS;

    r.now = dueA - 1;
    expect(r.check()).toMatchObject({ presented: null });
    r.now = dueA;
    // Console open: deferred.
    m20sOpen(r.s, r.now, r.sink);
    expect(r.check()).toMatchObject({ presented: null });
    m20sLeave(r.s, r.tick(100), r.sink);
    // Blocked: deferred.
    r.ctx = { ...CLEAR, blocked: true };
    expect(r.check()).toMatchObject({ presented: null });
    // Unfocused: deferred.
    r.ctx = { ...CLEAR, pause_causes: ['focus_loss'], page_focused: false };
    expect(r.check()).toMatchObject({ presented: null });
    // Hidden: deferred.
    r.ctx = { ...CLEAR, pause_causes: ['hidden'], page_visible: false };
    expect(r.check()).toMatchObject({ presented: null });
    expect(count(r, 'cue_presented')).toBe(0);
    // Clear: delivered now, with the deferral recorded.
    r.ctx = { ...CLEAR };
    r.tick(1_500);
    expect(r.check()).toMatchObject({ presented: A });
    expect(last(r, 'cue_presented')?.metadata).toMatchObject({
      channel_id: A,
      occasion_id: A,
      presented_at_ms: r.now,
      held_at_ms: heldA,
      released_at_ms: heldA + M20_RELEASE_MS,
      due_at_ms: dueA,
      deferred_ms: r.now - dueA,
      page_visible: true,
      page_focused: true,
      distance_to_console_px: 96,
      remaining_steps: 4,
    });
    expect(m20NoticeLines(r.s)).toEqual([
      'FEED CONSOLE: the next pass for channel A is open.',
      'Channel A can be continued · 4 of 6 steps remain.',
    ]);
    // While it shows nothing else is delivered; focus loss neither ends nor
    // extends it (recorded).
    r.ctx = { ...CLEAR, pause_causes: ['focus_loss'], page_focused: false };
    r.tick(2_000);
    expect(r.check()).toMatchObject({ ended: null, presented: null });
    expect(m20NoticeLines(r.s)).not.toBeNull();
    r.ctx = { ...CLEAR };
    r.tick(3_999);
    expect(r.check()).toMatchObject({ ended: null });
    r.tick(1);
    expect(r.check()).toMatchObject({ ended: A });
    expect(last(r, 'cue_notice_ended')?.metadata).toMatchObject({
      channel_id: A,
      ended_at_ms: r.now,
      ended_reason: 'timeout',
      displayed_ms: M20_NOTICE_MS,
      focus_lost_during_display: true,
    });
    expect(m20NoticeLines(r.s)).toBeNull();
    // Never repeated for A.
    r.tick(60_000);
    const later = r.check();

    expect(later.presented === A).toBe(false);
    expect(ofChannel(r, 'cue_presented', A)).toHaveLength(1);
  });

  test("B's notice: never while A's notice is due and undelivered; never within 8 000 ms of A's ACTUAL end (an early end counts from the early end); delivered once the spacing holds", () => {
    const r = bothHeld();
    const heldB = ch(r, B).held_at_ms!;
    const dueB = heldB + M20_RELEASE_MS + M20_NOTICE_AFTER_RELEASE_MS;

    // Both due, A blocked for a long time: B waits for A.
    r.ctx = { ...CLEAR, blocked: true };
    r.now = dueB + 20_000;
    expect(r.check()).toMatchObject({ presented: null });
    r.ctx = { ...CLEAR };
    expect(r.check()).toMatchObject({ presented: A });
    // A's notice ended early at +1 500 by a surface opening.
    r.tick(1_500);
    expect(m20sEndCue(r.s, 'surface_opened', r.now, r.sink)).toBe(true);
    expect(last(r, 'cue_notice_ended')?.metadata).toMatchObject({
      channel_id: A,
      ended_reason: 'surface_opened',
      displayed_ms: 1_500,
    });

    const endA = r.now;

    r.now = endA + M20_SPACING_MS - 1;
    expect(r.check()).toMatchObject({ presented: null });
    r.now = endA + M20_SPACING_MS;
    expect(r.check()).toMatchObject({ presented: B });
    expect(last(r, 'cue_presented')?.metadata).toMatchObject({
      channel_id: B,
      presented_at_ms: endA + M20_SPACING_MS,
    });
    expect(m20NoticeLines(r.s)).toEqual([
      'FEED CONSOLE: the next pass for channel B is open.',
      'Channel B can be continued · 4 of 6 steps remain.',
    ]);
  });

  test("B's notice comes without waiting when A will never get one (A resumed spontaneously or aligned)", () => {
    const r = bothHeld();

    waitRelease(r, B);
    // A resumed in its silent window: its notice is cancelled.
    reopenContinue(r, A);
    set(r, [4, 2, 1, 1]);
    expect(align(r)).toMatchObject({
      kind: 'executed',
      resumption: 'spontaneous',
    });
    m20sLeave(r.s, r.tick(100), r.sink);
    waitDue(r, B);
    expect(last(r, 'cue_presented')?.metadata).toMatchObject({ channel_id: B });
    expect(ofChannel(r, 'cue_presented', A)).toEqual([]);
    expect(ofChannel(r, 'cue_cancelled', A)).toHaveLength(1);
  });

  test('a spontaneous resumption: the first executed ALIGN after the release and before the notice sets resumed_spontaneously, cancels the notice (never shown), excludes nothing else; opening, CONTINUE, cell edits and refused ALIGNs are not resumptions (E53); a reopening after it creates no occasion, release or notice (E58)', () => {
    const r = bothHeld();

    waitRelease(r, A);
    // The silent-window visit: a released_visit, CONTINUE, an edit, an
    // as_loaded refusal — not a resumption; the notice stays due.
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(suffixes(r).slice(-3)).toEqual([
      'console_reopened',
      'released_visit',
      'held_visit',
    ]);
    expect(m20ChannelButtons(r.s).continue).toEqual([A]);
    expect(m20sContinueChannel(r.s, A, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    // The step the hold prepared and never showed: a fresh presentation.
    expect(last(r, 'step_presented')?.metadata).toMatchObject({
      step_index: 3,
      resumed: false,
      cells: [1, 1, 1, 1],
    });
    set(r, [2, 3, 4, 1]);
    set(r, [1, 1, 1, 1]);
    expect(align(r)).toEqual({ kind: 'refused', reason: 'as_loaded' });
    expect(last(r, 'align_refused')?.metadata).toMatchObject({
      in_silent_window: true,
      after_cue: false,
    });
    expect(ch(r, A).resumption).toBeNull();
    expect(ch(r, A).refused_in_silent_window).toBe(1);
    m20sLeave(r.s, r.tick(100), r.sink);
    expect(count(r, 'cue_cancelled')).toBe(0);
    // Still due: the notice follows (E53's cued path).
    waitDue(r, A);
    expect(last(r, 'cue_presented')?.metadata).toMatchObject({ channel_id: A });

    // A second run: an executed ALIGN in the silent window.
    const r2 = bothHeld();

    waitRelease(r2, A);
    reopenContinue(r2, A);
    set(r2, [4, 1, 1, 1]);

    const outcome = align(r2);

    expect(outcome).toMatchObject({
      kind: 'executed',
      aligned: false,
      resumption: 'spontaneous',
    });
    expect(last(r2, 'align_attempt')?.metadata).toMatchObject({
      in_silent_window: true,
      after_cue: false,
      resumption: 'spontaneous',
    });
    expect(suffixes(r2).slice(-2)).toEqual(['align_attempt', 'cue_cancelled']);
    expect(last(r2, 'cue_cancelled')?.metadata).toMatchObject({
      channel_id: A,
      reason: 'resumed_before_cue',
      attempt_index: 3,
    });
    expect(ch(r2, A).resumption).toBe('spontaneous');
    expect(ch(r2, A).resumption_attempt_index).toBe(3);
    // A further ALIGN is not a second resumption; no new hold / release /
    // notice / start / opening follows (E58).
    set(r2, [4, 2, 1, 1]);
    expect(align(r2)).toMatchObject({ kind: 'executed', resumption: null });
    m20sLeave(r2.s, r2.tick(100), r2.sink);
    m20sOpen(r2.s, r2.tick(100), r2.sink);
    expect(ch(r2, A).post_resumption_reentries).toBe(1);
    expect(count(r2, 'released_visit')).toBe(1); // only the first visit
    m20sLeave(r2.s, r2.tick(100), r2.sink);
    waitDue(r2, A);
    r2.tick(60_000);
    r2.check();
    expect(ofChannel(r2, 'cue_presented', A)).toEqual([]);
    expect(ofChannel(r2, 'channel_held', A)).toHaveLength(1);
    expect(ofChannel(r2, 'channel_released', A)).toHaveLength(1);
    expect(ofChannel(r2, 'channel_started', A)).toHaveLength(1);
    expect(count(r2, 'cue_cancelled')).toBe(1);
  });

  test('an ALIGN during a delayed notice (after the due time, before the presentation) is spontaneous (E51); a channel aligned in its silent window gets no notice (E50)', () => {
    const r = bothHeld();

    r.ctx = { ...CLEAR, blocked: true };
    waitDue(r, A);
    expect(count(r, 'cue_presented')).toBe(0);
    r.ctx = { ...CLEAR };
    reopenContinue(r, A);
    set(r, [4, 2, 1, 3]);
    expect(align(r)).toMatchObject({
      kind: 'executed',
      resumption: 'spontaneous',
    });
    expect(ofChannel(r, 'cue_cancelled', A)).toHaveLength(1);
    // Align A through step 6: no notice ever.
    for (let step = 4; step <= 6; step += 1) {
      solve(r);
    }

    expect(ch(r, A).aligned_at_ms).not.toBeNull();
    expect(suffixes(r).slice(-3)).toEqual([
      'align_attempt',
      'step_aligned',
      'channel_aligned',
    ]);
    expect(r.s.view).toBe('channels');
    m20sLeave(r.s, r.tick(100), r.sink);
    r.tick(120_000);
    r.check();
    expect(ofChannel(r, 'cue_presented', A)).toEqual([]);
  });

  test('the cued credit: the first executed ALIGN after the notice, walking back or closing and reopening in place; a refused ALIGN after the notice is not a credit (E16, E34); at most one credit; a resumed channel never gets another hold, release or notice', () => {
    const r = bothHeld();

    waitDue(r, A);
    expect(last(r, 'cue_presented')?.metadata).toMatchObject({ channel_id: A });
    // The notice ends when the console opens (surface_opened), then the
    // first executed ALIGN after the notice is the credit (E55).
    m20sEndCue(r.s, 'surface_opened', r.tick(1_200), r.sink);
    m20sOpen(r.s, r.now, r.sink);
    expect(ch(r, A).arrived_after_cue_without_credit).toBeFalsy();
    expect(m20sContinueChannel(r.s, A, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(align(r)).toEqual({ kind: 'refused', reason: 'as_loaded' });
    expect(last(r, 'align_refused')?.metadata).toMatchObject({
      after_cue: true,
      in_silent_window: false,
    });
    expect(ch(r, A).resumption).toBeNull();
    set(r, [4, 1, 1, 1]);

    const credit = align(r);

    expect(credit).toMatchObject({ kind: 'executed', resumption: 'cued' });
    expect(last(r, 'align_attempt')?.metadata).toMatchObject({
      after_cue: true,
      in_silent_window: false,
      resumption: 'cued',
    });
    expect(ch(r, A).resumption).toBe('cued');
    expect(ch(r, A).refused_after_cue_before_credit.as_loaded).toBe(1);
    // A later repeat refusal and a further ALIGN change nothing.
    expect(align(r)).toEqual({ kind: 'refused', reason: 'repeat' });
    set(r, [4, 2, 1, 1]);
    expect(align(r)).toMatchObject({ kind: 'executed', resumption: null });
    expect(ch(r, A).resumption_attempt_index).toBe(3);
    m20sLeave(r.s, r.tick(100), r.sink);
    r.tick(200_000);
    r.check();
    expect(ofChannel(r, 'cue_presented', A)).toHaveLength(1);
    expect(ofChannel(r, 'channel_held', A)).toHaveLength(1);
    expect(ofChannel(r, 'channel_released', A)).toHaveLength(1);
  });

  test('the transitions of preview §4.12 after the notice: A noticed and B not started ⇒ CONTINUE A and START B; after a resumption mid-step a reopening offers CONTINUE on the same step; both aligned ⇒ the restored line and project_completed', () => {
    const r = aHeld();

    m20sLeave(r.s, r.tick(100), r.sink);
    waitDue(r, A);
    m20sEndCue(r.s, 'surface_opened', r.tick(500), r.sink);
    m20sOpen(r.s, r.now, r.sink);
    expect(m20ChannelButtons(r.s)).toEqual({
      continue: [A],
      start_b: true,
      none: false,
      both_aligned: false,
    });
    expect(m20sContinueChannel(r.s, A, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    solve(r); // step 3 — the credit
    expect(ch(r, A).resumption).toBe('cued');
    set(r, [1, 3, 1, 1]); // mid-step 4
    m20sLeave(r.s, r.tick(100), r.sink);
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(ch(r, A).post_resumption_reentries).toBe(1);
    expect(m20sContinueChannel(r.s, A, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(last(r, 'step_presented')?.metadata).toMatchObject({
      step_index: 4,
      resumed: true,
      cells: [1, 3, 1, 1],
    });
    solve(r);
    solve(r);
    solve(r);
    expect(ch(r, A).aligned_at_ms).not.toBeNull();
    expect(r.s.view).toBe('channels');
    expect(m20ChannelButtons(r.s)).toEqual({
      continue: [],
      start_b: true,
      none: false,
      both_aligned: false,
    });
    expect(m20sStartB(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    solve(r);
    solve(r);
    expect(r.s.view).toBe('held');
    expect(m20ChannelButtons(r.s).start_b).toBe(false);
    m20sLeave(r.s, r.tick(100), r.sink);
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(m20ChannelButtons(r.s)).toEqual({
      continue: [],
      start_b: false,
      none: true,
      both_aligned: false,
    });
    m20sLeave(r.s, r.tick(100), r.sink);
    waitDue(r, B);
    expect(last(r, 'cue_presented')?.metadata).toMatchObject({ channel_id: B });
    m20sEndCue(r.s, 'surface_opened', r.tick(300), r.sink);
    m20sOpen(r.s, r.now, r.sink);
    expect(m20sContinueChannel(r.s, B, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    solve(r);
    solve(r);
    solve(r);
    solve(r);
    expect(r.s.status).toBe('completed');
    expect(suffixes(r).slice(-4)).toEqual([
      'align_attempt',
      'step_aligned',
      'channel_aligned',
      'project_completed',
    ]);
    expect(last(r, 'project_completed')?.metadata).toMatchObject({
      closure_reason: 'completed',
      channels_planned: 2,
      spontaneous_resumptions: 0,
    });
    expect(m20ChannelButtons(r.s)).toMatchObject({ both_aligned: true });
    expect(m20ChipText(r.s)).toBe('A 6/6 · B 6/6');
  });

  test('the chip shows counts only; the record lines; the never-opened closures; the hold-back', () => {
    const r = run();

    expect(m20ChipText(r.s)).toBe('MAST 04 FEED · 2 channels');
    m20sOpen(r.s, r.now, r.sink);
    expect(m20ChipText(r.s)).toBe('A 0/6 · B 0/6');
    m20sContinue(r.s, 'keyboard', r.settle(), r.sink);
    solve(r);
    solve(r);
    expect(m20ChipText(r.s)).toBe('A 2/6 · B 0/6');
    waitRelease(r, A);
    expect(m20ChipText(r.s)).toBe('A 2/6 · B 0/6');
    expect(m20RecordLine(r.s)).toBeNull();
    m20sLeave(r.s, r.tick(100), r.sink);
    expect(m20sCloseAtShiftEnd(r.s, r.tick(100), r.sink)).toBe(true);
    expect(m20ChipText(r.s)).toBe('closed for the shift');
    expect(m20RecordLine(r.s)).toBe(
      'The console closed when the shift was signed off.',
    );
    expect(m20sCloseAtShiftEnd(r.s, r.tick(100), r.sink)).toBe(false);
    expect(m20sCloseAtReview(r.s, r.tick(100), r.sink)).toBe(false);

    const r2 = run();

    expect(m20sCloseUnopened(r2.s, 'closed_at_review')).toBe(true);
    expect(m20RecordLine(r2.s)).toBe('The console closed at the shift review.');
    expect(m20sOpen(r2.s, r2.now, r2.sink)).toBe('record');
    expect(r2.events).toEqual([]);

    const r3 = run();

    expect(m20sHoldBack(r3.s)).toBe(true);
    expect(m20RecordLine(r3.s)).toBe(
      'This console was opened earlier in the session. It stays closed now.',
    );
    expect(m20sHoldBack(r3.s)).toBe(false);
    expect(m20sContinue(r3.s, 'keyboard', r3.settle(), r3.sink)).toBe(false);

    const r4 = aHeld();

    expect(m20sFail(r4.s, 'align: boom', r4.tick(100), r4.sink)).toEqual({
      kind: 'closed',
      channel_id: null,
      result_final: false,
    });
    expect(m20RecordLine(r4.s)).toBe(
      'The feed console has a fault and is closed.\nIts record is kept as it is.',
    );
    expect(m20ChipText(r4.s)).toBe('closed for the shift');
  });

  test('closures: the sign-off and the review write due releases and end an active notice BEFORE the terminal record (E44); the fault keeps earned resumptions and names the channel in work', () => {
    const r = aHeld();

    m20sLeave(r.s, r.tick(100), r.sink);
    waitDue(r, A);
    expect(m20NoticeLines(r.s)).not.toBeNull();
    r.tick(1_000);
    expect(m20sCloseAtShiftEnd(r.s, r.now, r.sink)).toBe(true);
    expect(suffixes(r).slice(-2)).toEqual([
      'cue_notice_ended',
      'project_closed',
    ]);
    expect(last(r, 'cue_notice_ended')?.metadata).toMatchObject({
      ended_reason: 'project_closed',
      displayed_ms: 1_000,
    });
    expect(last(r, 'project_closed')?.metadata).toMatchObject({
      closure_reason: 'shift_signed_off',
      channels_planned: 2,
      spontaneous_resumptions: 0,
    });
    expect(m20NoticeLines(r.s)).toBeNull();

    const r2 = bothHeld();

    waitRelease(r2, A);
    reopenContinue(r2, A);
    set(r2, [4, 2, 1, 1]);
    expect(align(r2)).toMatchObject({ resumption: 'spontaneous' });
    r2.now = ch(r2, B).held_at_ms! + M20_RELEASE_MS;
    expect(m20sFail(r2.s, 'align: boom', r2.now, r2.sink)).toEqual({
      kind: 'closed',
      channel_id: A,
      result_final: false,
    });
    expect(suffixes(r2).slice(-1)).toEqual(['channel_released']);
    expect(ch(r2, A).resumption).toBe('spontaneous');
    expect(r2.s.status).toBe('technical_failure');
    expect(m20sFail(r2.s, 'again', r2.tick(10), r2.sink)).toEqual({
      kind: 'none',
    });

    const r3 = aHeld();

    m20sLeave(r3.s, r3.tick(100), r3.sink);
    waitDue(r3, A);
    expect(m20sCloseAtReview(r3.s, r3.tick(500), r3.sink)).toBe(true);
    expect(suffixes(r3).slice(-2)).toEqual([
      'cue_notice_ended',
      'project_closed',
    ]);
    expect(last(r3, 'project_closed')?.metadata).toMatchObject({
      closure_reason: 'closed_at_review',
    });
  });

  test('the reload guard: the prior-administration predicate and the reload check', () => {
    expect(
      m20PriorAdministration([
        { event_type: 'proto_m20_feed_presented' },
        { event_type: 'proto_m20_feed_opportunity_opened' },
      ]),
    ).toBe(true);
    expect(
      m20PriorAdministration([{ event_type: 'proto_m20_feed_presented' }]),
    ).toBe(false);
    expect(
      m20PriorLoadCheck(2, [{ event_type: 'proto_m20_feed_presented' }], {
        first_sequence: 1,
        sequence_gap_count: 0,
        sequence_duplicate_count: 0,
        recovered_from_chunks: false,
      }),
    ).toEqual({
      page_load_index: 2,
      prior_page_load_event_count: 1,
      prior_opening_found: false,
      prior_presentation_found: true,
      history_continuous: true,
      prior_opening_absence_established: true,
    });
    expect(M20_RELOAD_DETAIL).toBe(
      'reload after administration: console not re-run',
    );
    expect([...M20_EVENT_SUFFIXES]).toEqual(
      expect.arrayContaining([
        'channel_held',
        'channel_released',
        'cue_presented',
        'cue_notice_ended',
        'cue_cancelled',
        'closed_unopened',
        'project_completed',
        'project_closed',
      ]),
    );
  });
});

/* ------------------------------------------------------------------ *
 * 3. The extractor: a synthetic-log DSL (the preview §7 cases, by hand)
 * ------------------------------------------------------------------ */

interface Synthetic {
  suffix: string;
  metadata: Record<string, unknown>;
  sequence: number;
  page_load_index?: number;
}

interface LogOptions {
  version?: string;
  opportunity?: string;
  pageLoadIndex?: number;
  sequence?: (index: number) => number | undefined;
}

function kitFields(options: LogOptions = {}): Record<string, unknown> {
  return {
    measure_id: 'M20',
    opportunity_id: options.opportunity ?? M20_OPPORTUNITY_ID,
    window_id: M20_WINDOW_ID,
    entry_state_version: options.version ?? M20_ENTRY_STATE_VERSION,
    form: null,
    counterbalance: null,
    occasion: null,
    form_id: M20_FORM_ID,
    content_version: M20_CONTENT_VERSION,
  };
}

function toEvents(list: Synthetic[], options: LogOptions = {}): RawGameEvent[] {
  return list.map((event, index) => ({
    session_id: 'GS',
    timestamp_ms: 1_000 + index,
    scene: 'records_workshop',
    event_type: `${M20_FAMILY}${event.suffix}`,
    object_id: 'm20_feed_console',
    sequence: options.sequence ? options.sequence(index) : event.sequence,
    page_load_index: event.page_load_index ?? options.pageLoadIndex ?? 1,
    metadata: { ...kitFields(options), ...event.metadata },
  }));
}

const CONTEXT = { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false };
const RELOADED = { finalCoreClosed: false, pageLoadIndex: 2, reloaded: true };

type Row = ReturnType<typeof extractItemFeatures>[number];
type Comp = Record<string, unknown>;

/** The one row; the input is never mutated. */
function rowOf(events: RawGameEvent[], context = CONTEXT): Row {
  const before = JSON.stringify(events);
  const out = extractItemFeatures('M20', events, context);

  expect(JSON.stringify(events)).toBe(before);
  expect(out).toHaveLength(1);
  expect(out[0].feature_id).toBe('m20_cued_resumptions');
  expect(out[0].planned_denominator).toBe(2);
  expect(out[0].coverage_label).toBe('exploratory');
  expect(out[0].components.difficulty_established).toBe(false);

  return out[0];
}

const channelOf = (row: Row, id: string) =>
  (row.components.channels as Comp[]).find((c) => c.channel_id === id)!;

/**
 * The synthetic-log DSL (every case of preview §7 written by hand). The
 * protocol times: a hold at the time of its record; the release at hold +
 * 30 000; a notice at or after hold + 60 000 and, for B, at or after A's
 * ACTUAL end + 8 000. The closure snapshot is built from the DSL's own
 * tracker (the recount rule, written here independently).
 */
function log() {
  let seq = 0;
  let t = 1_000_000;
  const ev: Synthetic[] = [];
  const att: Record<string, number> = { m20_ch_a: 0, m20_ch_b: 0 };
  interface Track {
    held: number | null;
    released: number | null;
    cueSeq: number | null;
    cueAt: number | null;
    end: number | null;
    releaseSeq: number | null;
    spont: number | null;
    credit: number | null;
    steps: number;
    attempts: number;
    aligned: boolean;
  }
  const st: Record<string, Track> = {
    m20_ch_a: {
      held: null,
      released: null,
      cueSeq: null,
      cueAt: null,
      end: null,
      releaseSeq: null,
      spont: null,
      credit: null,
      steps: 0,
      attempts: 0,
      aligned: false,
    },
    m20_ch_b: {
      held: null,
      released: null,
      cueSeq: null,
      cueAt: null,
      end: null,
      releaseSeq: null,
      spont: null,
      credit: null,
      steps: 0,
      attempts: 0,
      aligned: false,
    },
  };
  const put = (suffix: string, metadata: Record<string, unknown> = {}) => {
    t += 1_000;
    seq += 1;
    ev.push({
      suffix,
      metadata: { input_mode: 'system', ...metadata },
      sequence: seq,
    });

    return api;
  };
  const snapshot = () => ({
    channels_planned: 2,
    spontaneous_resumptions: Object.values(st).filter((c) => c.spont !== null)
      .length,
    channels: (['m20_ch_a', 'm20_ch_b'] as const).map((id) => ({
      channel_id: id,
      steps_done: st[id].steps,
      attempts: st[id].attempts,
      held: st[id].held !== null,
      released: st[id].released !== null,
      noticed: st[id].cueSeq !== null,
      resumption:
        st[id].spont !== null
          ? 'spontaneous'
          : st[id].credit !== null
            ? 'cued'
            : null,
      aligned: st[id].aligned,
    })),
  });
  const api = {
    ev,
    put,
    now: () => t,
    wait: (ms: number) => {
      t += ms;

      return api;
    },
    present: () => put('presented'),
    open: () =>
      put('opportunity_opened', {
        entry_state_snapshot: m20EntrySnapshot('workshop_return', {
          accepted: true,
          stages_done: ['clear_base_clamp', 'seat_feed_line'],
          outdoor_complete: true,
        }),
      }),
    reopen: () => put('console_reopened', { view: 'channels' }),
    leave: () => put('console_left', { view: 'channels' }),
    start: (c: string) => put('channel_started', { channel_id: c }),
    step: (c: string, k: number, resumed = false) =>
      put('step_presented', {
        channel_id: c,
        step_index: k,
        cells_n: HAND.cells_per_step[k - 1],
        resumed,
      }),
    tryCells: (c: string, k: number, cells: number[]) => {
      att[c] += 1;
      st[c].attempts += 1;

      const d = HAND.differ(c, k, cells);
      const afterCue = st[c].cueSeq !== null;
      const silent =
        st[c].released !== null &&
        st[c].cueSeq === null &&
        st[c].spont === null;

      put('align_attempt', {
        channel_id: c,
        step_index: k,
        attempt_index: att[c],
        cells,
        differ: d,
        aligned: d === 0,
        after_cue: afterCue,
        in_silent_window: silent,
        input_mode: 'keyboard',
      });

      if (silent) {
        st[c].spont = seq;
      } else if (afterCue && st[c].credit === null) {
        st[c].credit = seq;
      }

      return api;
    },
    refuse: (c: string, reason: string) =>
      put('align_refused', { channel_id: c, reason, input_mode: 'keyboard' }),
    solve: (c: string, k: number) => {
      api.tryCells(c, k, HAND.targets[c][k - 1]);
      st[c].steps += 1;
      put('step_aligned', { channel_id: c, step_index: k });

      if (k === HAND.hold_after_step) {
        const h = t + 1_000;

        put('channel_held', { channel_id: c, held_at_ms: h });
        st[c].held = h;
      }

      if (k === 6) {
        st[c].aligned = true;
        put('channel_aligned', { channel_id: c });
      }

      return api;
    },
    begin: (c: string) =>
      api.start(c).step(c, 1).solve(c, 1).step(c, 2).solve(c, 2),
    /** The silent release, logged at (or after) hold + 30 000. */
    release: (c: string, f: { at?: number } = {}) => {
      if (st[c].released !== null) {
        return api;
      }

      const at = st[c].held! + HAND.release_ms;

      t = Math.max(t, at - 1_000);
      st[c].released = f.at ?? at;
      put('channel_released', { channel_id: c, released_at_ms: f.at ?? at });
      st[c].releaseSeq = seq;

      return api;
    },
    /** A protocol-compliant notice (after the release; ≥ hold + 60 000; B ≥ A's actual end + 8 000). */
    cue: (
      c: string,
      f: {
        at?: number;
        endAt?: number;
        endAfter?: number;
        endReason?: string;
        extra?: Record<string, unknown>;
        skipEnd?: boolean;
      } = {},
    ) => {
      api.release(c);

      let at = Math.max(
        t + 1_000,
        st[c].held! + HAND.release_ms + HAND.notice_after_release_ms,
      );

      if (c === 'm20_ch_b' && st.m20_ch_a.end !== null) {
        at = Math.max(at, st.m20_ch_a.end + HAND.spacing_ms);
      }

      if (f.at !== undefined) {
        at = f.at;
      }

      t = at - 1_000;
      put('cue_presented', {
        channel_id: c,
        page_visible: true,
        page_focused: true,
        presented_at_ms: at,
        ...f.extra,
      });
      st[c].cueSeq = seq;
      st[c].cueAt = at;

      if (f.skipEnd) {
        return api;
      }

      const end = f.endAt ?? at + (f.endAfter ?? HAND.notice_ms);

      t = end - 1_000;
      put('cue_notice_ended', {
        channel_id: c,
        ended_at_ms: end,
        ended_reason: f.endReason ?? 'timeout',
      });
      st[c].end = end;

      return api;
    },
    /** The resumption of a held channel: step 3 presented afresh, one executed ALIGN. */
    resumeOnce: (c: string, wrong = false) =>
      wrong
        ? api.step(c, 3).tryCells(
            c,
            3,
            HAND.targets[c][2].map((v) => (v % 4) + 1),
          )
        : api.step(c, 3).solve(c, 3),
    /** A spontaneous resumption: released, the console reopened in the silent window, one executed ALIGN. */
    spont: (c: string, wrong = false) =>
      api
        .release(c)
        .reopen()
        .put('released_visit', { channel_id: c })
        .resumeOnce(c, wrong),
    finishChannel: (c: string, from = 3) => {
      for (let k = from; k <= 6; k += 1) {
        api.step(c, k).solve(c, k);
      }

      return api;
    },
    complete: () =>
      put('project_completed', { closure_reason: 'completed', ...snapshot() }),
    signOff: () =>
      put('project_closed', {
        closure_reason: 'shift_signed_off',
        ...snapshot(),
      }),
    review: () =>
      put('project_closed', {
        closure_reason: 'closed_at_review',
        ...snapshot(),
      }),
    fault: (c: string | null = null) =>
      put('technical_failure', { channel_id: c, detail: 'align: boom' }),
    windowClosed: (exit: string) => put('window_closed', { exit_state: exit }),
    snapshot,
    state: st,
  };

  return api;
}

type Expected = {
  value: number | null;
  num: number | null;
  den: number | null;
  disposition: string;
  kind?: string | null;
  a?: string;
  b?: string;
  spontaneous?: number | null;
  censored?: boolean;
  closure?: string | null;
  defect?: string;
};

/** The expectations of preview §7, transcribed by hand (never imported). */
const EXPECTED: Record<string, Expected> = {
  E1: {
    value: null,
    num: null,
    den: null,
    disposition: 'not_presented',
    kind: 'not_presented',
    closure: null,
  },
  E1b: {
    value: null,
    num: null,
    den: null,
    disposition: 'not_presented',
    kind: 'not_presented',
    closure: 'closed_at_review',
  },
  E1c: {
    value: null,
    num: null,
    den: null,
    disposition: 'not_presented',
    kind: 'not_presented',
    closure: null,
  },
  E2a: {
    value: null,
    num: null,
    den: null,
    disposition: 'pending',
    closure: null,
  },
  E2b: {
    value: null,
    num: null,
    den: null,
    disposition: 'no_eligible_event',
    kind: 'not_opened',
    closure: 'closed_at_review',
  },
  E2c: {
    value: null,
    num: null,
    den: null,
    disposition: 'no_eligible_event',
    kind: 'not_opened',
    closure: 'route_departure',
  },
  E2d: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S3',
  },
  E2e: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S3',
  },
  E2f: {
    value: null,
    num: null,
    den: null,
    disposition: 'no_eligible_event',
    kind: 'not_opened',
    closure: 'closed_at_review',
  },
  E3: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'not_begun',
    a: 'not_begun',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E4: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'no_hold',
    a: 'begun_not_held',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E5: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'cue_not_presented',
    a: 'cue_not_presented',
    b: 'cue_not_presented',
    closure: 'route_departure',
  },
  E6: {
    value: 0,
    num: 0,
    den: 2,
    disposition: 'observed',
    a: 'not_resumed',
    b: 'not_resumed',
    closure: 'route_departure',
  },
  E7: {
    value: 1,
    num: 1,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_resumed',
    closure: 'route_departure',
  },
  E8a: {
    value: 2,
    num: 2,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'resumed',
    closure: null,
  },
  E8b: {
    value: 2,
    num: 2,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'resumed',
    closure: 'completed',
  },
  E9: {
    value: 1,
    num: 1,
    den: 1,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E10: {
    value: 0,
    num: 0,
    den: 1,
    disposition: 'observed',
    a: 'not_resumed',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E11: {
    value: 1,
    num: 1,
    den: 1,
    disposition: 'observed',
    a: 'resumed',
    b: 'cue_not_presented',
    closure: 'route_departure',
  },
  E12: {
    value: 1,
    num: 1,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_resumed',
    closure: 'route_departure',
  },
  E13: {
    value: 0,
    num: 0,
    den: 2,
    disposition: 'observed',
    a: 'not_resumed',
    b: 'not_resumed',
    closure: 'route_departure',
  },
  E14: {
    value: 1,
    num: 1,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_resumed',
    closure: 'route_departure',
  },
  E15: {
    value: 1,
    num: 1,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_resumed',
    closure: 'route_departure',
  },
  E16: {
    value: 0,
    num: 0,
    den: 1,
    disposition: 'observed',
    a: 'not_resumed',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E17a: {
    value: null,
    num: null,
    den: 0,
    disposition: 'interrupted',
    kind: 'censored_only',
    a: 'censored_review',
    b: 'not_begun',
    censored: true,
    closure: 'closed_at_review',
  },
  E17b: {
    value: 1,
    num: 1,
    den: 1,
    disposition: 'observed',
    a: 'resumed',
    b: 'censored_review',
    censored: true,
    closure: 'closed_at_review',
  },
  E18: {
    value: 1,
    num: 1,
    den: 1,
    disposition: 'observed',
    a: 'resumed',
    b: 'excluded_technical_failure',
    censored: true,
    closure: 'technical_failure',
  },
  E19: {
    value: null,
    num: null,
    den: 0,
    disposition: 'technical_failure',
    kind: 'technical_only',
    a: 'excluded_technical_failure',
    b: 'excluded_technical_failure',
    censored: true,
    closure: 'technical_failure',
  },
  E20: {
    value: null,
    num: null,
    den: 0,
    disposition: 'technical_failure',
    kind: 'technical_only',
    a: 'cue_not_presented',
    b: 'cue_not_presented',
    censored: false,
    closure: 'technical_failure',
  },
  E21: {
    value: 2,
    num: 2,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'resumed',
    censored: false,
    closure: 'technical_failure',
  },
  E22: {
    value: null,
    num: null,
    den: null,
    disposition: 'interrupted',
    kind: 'reload_hold_back',
  },
  E23: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S4',
  },
  E24: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S6',
  },
  E25: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S4',
  },
  E26: {
    value: null,
    num: null,
    den: null,
    disposition: 'pending',
    a: 'resumed',
    b: 'awaiting_return',
    closure: null,
  },
  E27a: {
    value: 1,
    num: 1,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_resumed',
    closure: 'route_departure',
  },
  E27b: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S5',
  },
  E28: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S6',
  },
  E29: {
    value: null,
    num: null,
    den: null,
    disposition: 'interrupted',
    kind: 'reload_no_current_evidence',
  },
  E30: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S4',
  },
  E30b: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S4',
  },
  E31: {
    value: 0,
    num: 0,
    den: 1,
    disposition: 'observed',
    a: 'not_resumed',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E32: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'no_hold',
    a: 'begun_not_held',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E33: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'no_hold',
    a: 'begun_not_held',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E34: {
    value: 1,
    num: 1,
    den: 1,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E35: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'cue_not_presented',
    a: 'cue_not_presented',
    b: 'begun_not_held',
    closure: 'route_departure',
  },
  E36: {
    value: 0,
    num: 0,
    den: 1,
    disposition: 'observed',
    a: 'not_resumed',
    b: 'cue_not_presented',
    closure: 'route_departure',
  },
  E37: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S6',
  },
  E38: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S6',
  },
  E39: {
    value: 2,
    num: 2,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'resumed',
    closure: 'route_departure',
  },
  E44: {
    value: 0,
    num: 0,
    den: 1,
    disposition: 'observed',
    a: 'not_resumed',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E45: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S7',
  },
  E40: {
    value: 1,
    num: 1,
    den: 1,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E41: {
    value: 1,
    num: 1,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_resumed',
    closure: 'route_departure',
  },
  E42: {
    value: 1,
    num: 1,
    den: 2,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_resumed',
    closure: 'route_departure',
  },
  E43: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S3',
  },
  E46: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'resumed_before_cue',
    a: 'resumed_spontaneously',
    b: 'not_begun',
    spontaneous: 1,
    closure: 'route_departure',
  },
  E47: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'resumed_before_cue',
    a: 'resumed_spontaneously',
    b: 'resumed_spontaneously',
    spontaneous: 2,
    closure: 'route_departure',
  },
  E48: {
    value: 1,
    num: 1,
    den: 1,
    disposition: 'observed',
    a: 'resumed_spontaneously',
    b: 'resumed',
    spontaneous: 1,
    closure: 'route_departure',
  },
  E49: {
    value: 0,
    num: 0,
    den: 1,
    disposition: 'observed',
    a: 'resumed_spontaneously',
    b: 'not_resumed',
    spontaneous: 1,
    closure: 'route_departure',
  },
  E50: {
    value: 0,
    num: 0,
    den: 1,
    disposition: 'observed',
    a: 'resumed_spontaneously',
    b: 'not_resumed',
    spontaneous: 1,
    closure: 'route_departure',
  },
  E51: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'resumed_before_cue',
    a: 'resumed_spontaneously',
    b: 'not_begun',
    spontaneous: 1,
    closure: 'route_departure',
  },
  E52: {
    value: 1,
    num: 1,
    den: 1,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E53: {
    value: 1,
    num: 1,
    den: 1,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E54: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S6',
  },
  E55: {
    value: 1,
    num: 1,
    den: 1,
    disposition: 'observed',
    a: 'resumed',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E56: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S6',
  },
  E57: {
    value: null,
    num: null,
    den: null,
    disposition: 'technical_failure',
    defect: 'S6',
  },
  E58: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'resumed_before_cue',
    a: 'resumed_spontaneously',
    b: 'not_begun',
    spontaneous: 1,
    closure: 'route_departure',
  },
  E59: {
    value: null,
    num: null,
    den: 0,
    disposition: 'technical_failure',
    kind: 'technical_only',
    a: 'resumed_spontaneously',
    b: 'excluded_technical_failure',
    spontaneous: 1,
    censored: true,
    closure: 'technical_failure',
  },
  E60: {
    value: null,
    num: null,
    den: 0,
    disposition: 'no_eligible_event',
    kind: 'cue_not_presented',
    a: 'cue_not_presented',
    b: 'not_begun',
    closure: 'route_departure',
  },
  E61: {
    value: null,
    num: null,
    den: null,
    disposition: 'pending',
    a: 'resumed_spontaneously',
    b: 'released_awaiting',
    spontaneous: 1,
    closure: null,
  },
};

/** The case constructions (preview §7 situations, built by hand). */
function buildCase(id: string): {
  events: RawGameEvent[];
  context: typeof CONTEXT;
} {
  const L = log;
  const ctx = CONTEXT;
  const of = (list: Synthetic[], options?: LogOptions) =>
    toEvents(list, options);

  switch (id) {
    case 'E1':
      return { events: [], context: ctx };
    case 'E1b':
      return {
        events: of(L().windowClosed('closed_at_review').ev),
        context: ctx,
      };
    case 'E1c':
      return {
        events: of(
          L()
            .put('outdoor_brief_presented', { phase: 'outdoor' })
            .put('outdoor_accepted', { phase: 'outdoor' })
            .put('outdoor_stage_completed', { phase: 'outdoor' })
            .put('outdoor_stage_completed', { phase: 'outdoor' }).ev,
        ),
        context: ctx,
      };
    case 'E2a':
      return { events: of(L().present().ev), context: ctx };
    case 'E2b':
      return {
        events: of(L().present().windowClosed('closed_at_review').ev),
        context: ctx,
      };
    case 'E2c':
      return {
        events: of(
          L()
            .present()
            .put('closed_unopened', { closure_reason: 'shift_signed_off' })
            .windowClosed('closed_at_review').ev,
        ),
        context: ctx,
      };
    case 'E2d':
      return { events: of(L().present().step(A, 1).ev), context: ctx };
    case 'E2e':
      return {
        events: of(
          L()
            .present()
            .open()
            .put('closed_unopened', { closure_reason: 'shift_signed_off' }).ev,
        ),
        context: ctx,
      };
    case 'E2f':
      return {
        events: of(
          L()
            .present()
            .put('closed_unopened', { closure_reason: 'closed_at_review' })
            .windowClosed('closed_at_review').ev,
        ),
        context: ctx,
      };
    case 'E3':
      return {
        events: of(L().present().open().put('intro_acknowledged').signOff().ev),
        context: ctx,
      };
    case 'E4':
      return {
        events: of(
          L().present().open().start(A).step(A, 1).solve(A, 1).signOff().ev,
        ),
        context: ctx,
      };
    case 'E5':
      return {
        events: of(L().present().open().begin(A).begin(B).signOff().ev),
        context: ctx,
      };
    case 'E6':
      return {
        events: of(
          L().present().open().begin(A).begin(B).cue(A).cue(B).signOff().ev,
        ),
        context: ctx,
      };
    case 'E7':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .cue(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E8a':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .cue(B)
            .reopen()
            .resumeOnce(B).ev,
        ),
        context: ctx,
      };
    case 'E8b':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .finishChannel(A, 4)
            .cue(B)
            .reopen()
            .resumeOnce(B)
            .finishChannel(B, 4)
            .complete().ev,
        ),
        context: ctx,
      };
    case 'E9':
      return {
        events: of(
          L().present().open().begin(A).cue(A).reopen().resumeOnce(A).signOff()
            .ev,
        ),
        context: ctx,
      };
    case 'E10':
      return {
        events: of(L().present().open().begin(A).cue(A).signOff().ev),
        context: ctx,
      };
    case 'E11':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E12':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .reopen()
            .put('held_visit', { channel_id: A })
            .put('held_visit', { channel_id: B })
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .cue(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E13':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .step(A, 3)
            .put('cell_changed', {
              channel_id: A,
              cell: 1,
              value_before: 1,
              value_after: 2,
            })
            .leave()
            .cue(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E14': {
      const l = L()
        .present()
        .open()
        .begin(A)
        .begin(B)
        .cue(A)
        .reopen()
        .step(A, 3);

      for (let i = 0; i < 6; i += 1) {
        l.tryCells(A, 3, [2, 1, 1 + (i % 3), 1]);
      }

      l.solve(A, 3).finishChannel(A, 4).cue(B).signOff();

      return { events: of(l.ev), context: ctx };
    }
    case 'E15':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .resumeOnce(A, true)
            .leave()
            .cue(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E16':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .cue(A)
            .reopen()
            .step(A, 3)
            .refuse(A, 'as_loaded')
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E17a':
      return {
        events: of(L().present().open().begin(A).cue(A).review().ev),
        context: ctx,
      };
    case 'E17b':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .cue(B)
            .review().ev,
        ),
        context: ctx,
      };
    case 'E18':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .cue(B)
            .reopen()
            .resumeOnce(A)
            .step(A, 4)
            .fault(A).ev,
        ),
        context: ctx,
      };
    case 'E19':
      return {
        events: of(
          L().present().open().begin(A).begin(B).cue(A).cue(B).fault(null).ev,
        ),
        context: ctx,
      };
    case 'E20':
      return {
        events: of(L().present().open().begin(A).begin(B).fault(null).ev),
        context: ctx,
      };
    case 'E21':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .cue(B)
            .reopen()
            .resumeOnce(B)
            .fault(B).ev,
        ),
        context: ctx,
      };
    case 'E22':
      return {
        events: of(
          [
            {
              suffix: 'prior_load_checked',
              metadata: {
                page_load_index: 2,
                prior_page_load_event_count: 40,
                prior_opening_found: true,
                prior_presentation_found: true,
                history_continuous: true,
                prior_opening_absence_established: false,
              },
              sequence: 90,
            },
            {
              suffix: 'technical_failure',
              metadata: { detail: M20_RELOAD_DETAIL },
              sequence: 91,
            },
          ],
          { pageLoadIndex: 2 },
        ),
        context: RELOADED,
      };
    case 'E23':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .step(A, 3)
            .tryCells(A, 3, [4, 2, 1, 3])
            .cue(A)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E24':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .cue(A)
            .put('cue_presented', {
              channel_id: B,
              page_visible: true,
              page_focused: true,
              presented_at_ms: 9_000_000,
            })
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E25': {
      const l = L().present().open().start(A).step(A, 1);

      l.put('align_attempt', {
        channel_id: A,
        step_index: 1,
        attempt_index: 1,
        cells: [2, 4, 3],
        differ: 1,
        aligned: false,
        after_cue: false,
        in_silent_window: false,
      });
      l.signOff();

      return { events: of(l.ev), context: ctx };
    }
    case 'E26':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .cue(B).ev,
        ),
        context: ctx,
      };
    case 'E27a':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .leave()
            .reopen()
            .step(A, 4)
            .solve(A, 4)
            .cue(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E27b':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .put('channel_held', { channel_id: A, held_at_ms: 1 })
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E28':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .cue(A, { extra: { page_focused: false } })
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E29':
      return { events: [], context: RELOADED };
    case 'E30':
      return {
        events: of(
          L()
            .present()
            .open()
            .start(A)
            .step(A, 1)
            .tryCells(A, 1, [2, 1, 1])
            .tryCells(A, 1, [2, 1, 1])
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E30b':
      return {
        events: of(
          L()
            .present()
            .open()
            .start(A)
            .step(A, 1)
            .tryCells(A, 1, [1, 1, 1])
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E31':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .cue(A)
            .reopen()
            .step(A, 3)
            .put('cell_changed', {
              channel_id: A,
              cell: 1,
              value_before: 1,
              value_after: 2,
            })
            .put('cell_changed', {
              channel_id: A,
              cell: 1,
              value_before: 2,
              value_after: 3,
            })
            .put('cell_changed', {
              channel_id: A,
              cell: 1,
              value_before: 3,
              value_after: 4,
            })
            .put('cell_changed', {
              channel_id: A,
              cell: 1,
              value_before: 4,
              value_after: 1,
            })
            .refuse(A, 'as_loaded')
            .leave()
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E32':
      return {
        events: of(
          L()
            .present()
            .open()
            .start(A)
            .step(A, 1)
            .tryCells(A, 1, [2, 1, 1])
            .put('cell_changed', {
              channel_id: A,
              cell: 2,
              value_before: 1,
              value_after: 2,
            })
            .put('cell_changed', {
              channel_id: A,
              cell: 2,
              value_before: 2,
              value_after: 3,
            })
            .put('cell_changed', {
              channel_id: A,
              cell: 2,
              value_before: 3,
              value_after: 4,
            })
            .put('cell_changed', {
              channel_id: A,
              cell: 2,
              value_before: 4,
              value_after: 1,
            })
            .refuse(A, 'repeat')
            .solve(A, 1)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E33':
      return {
        events: of(
          L()
            .present()
            .open()
            .start(A)
            .step(A, 1)
            .tryCells(A, 1, [2, 1, 1])
            .tryCells(A, 1, [2, 2, 1])
            .tryCells(A, 1, [2, 1, 1])
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E34':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .cue(A)
            .reopen()
            .step(A, 3)
            .refuse(A, 'as_loaded')
            .tryCells(A, 3, [4, 1, 1, 1])
            .refuse(A, 'repeat')
            .tryCells(A, 3, [4, 2, 1, 1])
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E35':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .release(A)
            .start(B)
            .step(B, 1)
            .solve(B, 1)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E36':
      return {
        events: of(L().present().open().begin(A).begin(B).cue(A).signOff().ev),
        context: ctx,
      };
    case 'E37':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .release(A)
            .cue(A, { at: 1_000_000 + 1 })
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E38': {
      const l = L().present().open().begin(A).begin(B).cue(A);
      const aEnd = l.state.m20_ch_a.end!;

      l.cue(B, { at: aEnd + 4_000 }).signOff();

      return { events: of(l.ev), context: ctx };
    }
    case 'E39': {
      const l = L().present().open().begin(A).begin(B);

      l.cue(A, { endAfter: 2_000, endReason: 'surface_opened' });
      l.release(B);

      const aAt = l.state.m20_ch_a.cueAt!;
      const bHeld = l.state.m20_ch_b.held!;
      const bAt = aAt + 2_000 + 8_500;

      // The discriminating construction: before A's planned end + 8 000.
      expect(bAt).toBeGreaterThanOrEqual(bHeld + 60_000);
      expect(bAt).toBeLessThan(aAt + 6_000 + 8_000);
      l.reopen()
        .resumeOnce(A)
        .leave()
        .cue(B, { at: bAt })
        .reopen()
        .resumeOnce(B)
        .signOff();

      return { events: of(l.ev), context: ctx };
    }
    case 'E44':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .cue(A, { endReason: 'project_closed' })
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E45':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .release(A)
            .put('cue_presented', {
              channel_id: A,
              page_visible: true,
              page_focused: true,
              presented_at_ms: 9_999_999,
            })
            .signOff()
            .put('cue_notice_ended', {
              channel_id: A,
              ended_at_ms: 10_000_000,
              ended_reason: 'project_closed',
            }).ev,
        ),
        context: ctx,
      };
    case 'E40':
      return {
        events: of(
          L()
            .present()
            .open()
            .start(A)
            .step(A, 1)
            .leave()
            .reopen()
            .step(A, 1, true)
            .solve(A, 1)
            .step(A, 2)
            .leave()
            .reopen()
            .step(A, 2, true)
            .solve(A, 2)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E41':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .cue(A)
            .reopen()
            .begin(B)
            .leave()
            .reopen()
            .resumeOnce(A)
            .leave()
            .cue(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E42':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .cue(A)
            .reopen()
            .resumeOnce(A)
            .step(A, 4)
            .leave()
            .reopen()
            .step(A, 4, true)
            .solve(A, 4)
            .cue(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E43':
      return {
        events: of(
          L()
            .present()
            .open()
            .start(A)
            .step(A, 1)
            .solve(A, 1)
            .start(B)
            .step(B, 1)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E46':
      return {
        events: of(L().present().open().begin(A).spont(A).signOff().ev),
        context: ctx,
      };
    case 'E47':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .spont(A)
            .leave()
            .spont(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E48':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .spont(A)
            .leave()
            .cue(B)
            .reopen()
            .resumeOnce(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E49':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .spont(A)
            .leave()
            .cue(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E50':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .spont(A)
            .finishChannel(A, 4)
            .leave()
            .cue(B)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E51':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .release(A)
            .wait(40_000)
            .reopen()
            .put('released_visit', { channel_id: A })
            .resumeOnce(A)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E52': {
      const l = L().present().open().begin(A);
      const held = l.state.m20_ch_a.held!;

      l.cue(A, { at: held + 60_000 + 20_000 })
        .reopen()
        .resumeOnce(A)
        .signOff();

      return { events: of(l.ev), context: ctx };
    }
    case 'E53':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .release(A)
            .reopen()
            .put('released_visit', { channel_id: A })
            .step(A, 3)
            .put('cell_changed', {
              channel_id: A,
              cell: 1,
              value_before: 1,
              value_after: 2,
            })
            .put('cell_changed', {
              channel_id: A,
              cell: 1,
              value_before: 2,
              value_after: 3,
            })
            .put('cell_changed', {
              channel_id: A,
              cell: 1,
              value_before: 3,
              value_after: 4,
            })
            .put('cell_changed', {
              channel_id: A,
              cell: 1,
              value_before: 4,
              value_after: 1,
            })
            .refuse(A, 'as_loaded')
            .leave()
            .cue(A)
            .reopen()
            .step(A, 3, true)
            .solve(A, 3)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E54':
      return {
        events: of(
          L().present().open().begin(A).spont(A).leave().cue(A).signOff().ev,
        ),
        context: ctx,
      };
    case 'E55':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .cue(A, { endReason: 'surface_opened', endAfter: 1_500 })
            .reopen()
            .resumeOnce(A)
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E56':
      return {
        events: of(
          L().present().open().begin(A).release(A, { at: 5 }).signOff().ev,
        ),
        context: ctx,
      };
    case 'E57': {
      const l = L().present().open().begin(A).begin(B).release(A).release(B);
      const bHeld = l.state.m20_ch_b.held!;

      l.cue(B, { at: bHeld + 60_000 }).signOff();

      return { events: of(l.ev), context: ctx };
    }
    case 'E58':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .spont(A)
            .leave()
            .reopen()
            .step(A, 4)
            .leave()
            .signOff().ev,
        ),
        context: ctx,
      };
    case 'E59':
      return {
        events: of(
          L()
            .present()
            .open()
            .begin(A)
            .begin(B)
            .spont(A)
            .leave()
            .cue(B)
            .fault(null).ev,
        ),
        context: ctx,
      };
    case 'E60':
      return {
        events: of(L().present().open().begin(A).release(A).signOff().ev),
        context: ctx,
      };
    case 'E61':
      return {
        events: of(
          L().present().open().begin(A).begin(B).spont(A).leave().release(B).ev,
        ),
        context: ctx,
      };
    default:
      throw new Error(`unknown case ${id}`);
  }
}

test.describe('M20 extractor: the preview §7 cases E1–E61 (72 cases, hand-written expectations; Unit 22)', () => {
  const ids = Object.keys(EXPECTED);

  test('seventy-two cases are listed', () => {
    expect(ids).toHaveLength(72);
  });

  for (const id of ids) {
    const expected = EXPECTED[id];

    test(`${id}: ${expected.disposition}${expected.kind ? ` / ${expected.kind}` : ''} ${expected.value ?? 'null'} / ${expected.num ?? 'null'} / ${expected.den ?? 'null'}`, () => {
      const built = buildCase(id);
      const row = rowOf(built.events, built.context);

      expect(row.value).toBe(expected.value);
      expect(row.numerator).toBe(expected.num);
      expect(row.denominator).toBe(expected.den);
      expect(row.disposition).toBe(expected.disposition);
      expect(row.disposition).not.toBe('declined');

      if (expected.kind !== undefined) {
        expect(row.components.nonresponse_kind).toBe(expected.kind);
      }

      if (expected.defect !== undefined) {
        const defects = row.components.integrity_defect as { rule: string }[];

        expect(defects.length).toBeGreaterThan(0);
        expect(defects.map((d) => d.rule)).toContain(expected.defect);
        expect(row.closure_reason).toBe('technical_failure');
        expect(row.missing_reason).toContain('integrity defect');

        return;
      }

      expect(row.components.integrity_defect).toBeUndefined();

      if (expected.a !== undefined) {
        expect(channelOf(row, A).status).toBe(expected.a);
        expect(channelOf(row, B).status).toBe(expected.b);
      }

      if (expected.spontaneous !== undefined) {
        expect(row.components.spontaneous_resumptions).toBe(
          expected.spontaneous,
        );
      } else if (expected.a !== undefined) {
        expect(row.components.spontaneous_resumptions).toBe(0);
      }

      expect(row.censored).toBe(expected.censored ?? false);

      if (expected.closure !== undefined) {
        expect(row.closure_reason).toBe(expected.closure);
      }

      if (row.disposition === 'observed') {
        expect(row.included_ids).toEqual(
          [A, B].filter((c) =>
            ['resumed', 'not_resumed'].includes(
              String(channelOf(row, c).status),
            ),
          ),
        );
        expect(row.denominator).toBeGreaterThanOrEqual(1);
      } else if (row.denominator === 0) {
        expect(row.included_ids).toEqual([]);
        expect(row.numerator).toBeNull();
      }
    });
  }

  test('the companions beside the value: the spontaneous count is never added to the primary (E48: 1 / 1 cued with one spontaneous resumption); the cued outcome is conditional; the owner limitation flags are on every row', () => {
    const row = rowOf(buildCase('E48').events);

    expect(row.value).toBe(1);
    expect(row.denominator).toBe(1);
    expect(row.components.spontaneous_resumptions).toBe(1);
    expect(row.components.observations_share_one_project).toBe(true);
    expect(
      row.components.cued_outcome_conditional_on_no_spontaneous_resumption,
    ).toBe(true);
    expect(row.components.administration_version).toBe('m20-feed-returns-v2');
    expect(channelOf(row, A)).toMatchObject({
      status: 'resumed_spontaneously',
      spontaneous_attempt_index: 3,
      credited: false,
      eligible: false,
      released_visits: 1,
    });
    expect(channelOf(row, B)).toMatchObject({
      status: 'resumed',
      credited: true,
      credit_attempt_index: 3,
      eligible: true,
    });
    expect(row.independence).toBe('repeated_within_one_project');
    // E47: two spontaneous resumptions ⇒ null, denominator 0, 2 beside.
    const both = rowOf(buildCase('E47').events);

    expect(both).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
    });
    expect(both.components.spontaneous_resumptions).toBe(2);
    expect(both.components.nonresponse_kind).toBe('resumed_before_cue');
  });

  test('the companion records of the notice and the visits: E12 (blocked approaches), E13 (arrival after the notice without a credit), E16 and E34 (refusals after the notice), E27a (a post-resumption re-entry), E53 (a silent-window visit with an as_loaded refusal)', () => {
    const e12 = rowOf(buildCase('E12').events);

    expect(channelOf(e12, A).held_visits).toBe(1);
    expect(channelOf(e12, B).held_visits).toBe(1);

    const e13 = rowOf(buildCase('E13').events);

    expect(channelOf(e13, A)).toMatchObject({
      arrived_after_cue_without_credit: true,
      credited: false,
      aligns_after_cue: 0,
    });

    const e16 = rowOf(buildCase('E16').events);

    expect(channelOf(e16, A).refused_after_cue_before_credit).toMatchObject({
      as_loaded: 1,
    });

    const e34 = rowOf(buildCase('E34').events);

    expect(channelOf(e34, A)).toMatchObject({
      credit_attempt_index: 3,
      aligns_after_cue: 2,
    });
    expect(
      (channelOf(e34, A).refused_after_cue_before_credit as Comp).as_loaded,
    ).toBe(1);
    expect(
      (channelOf(e34, A).refused_after_cue_before_credit as Comp).repeat,
    ).toBe(0);

    const e27 = rowOf(buildCase('E27a').events);

    expect(channelOf(e27, A)).toMatchObject({
      post_resumption_reentries: 1,
      steps_after_cue: 2,
    });

    const e53 = rowOf(buildCase('E53').events);

    expect(channelOf(e53, A)).toMatchObject({
      released_visits: 1,
      refused_in_silent_window: 1,
      status: 'resumed',
    });
    expect(channelOf(e53, A).cue_presented_at_ms).not.toBeNull();
    expect(channelOf(e53, A).held_to_cue_ms).toBeGreaterThanOrEqual(60_000);
  });

  test('the cued outcome never counts a channel twice and never reads opening alone, CONTINUE, cell edits or refused ALIGNs as a return (E13, E16, E31, E53); the fault keeps the earned resumptions (E18, E21, E59)', () => {
    for (const id of ['E13', 'E16', 'E31']) {
      const row = rowOf(buildCase(id).events);

      expect(row.value).toBe(0);
      expect(channelOf(row, A).status).toBe('not_resumed');
    }

    const e18 = rowOf(buildCase('E18').events);

    expect(e18).toMatchObject({ value: 1, denominator: 1, censored: true });
    expect(e18.censor_reason).toContain(
      'technical failure before a return on m20_ch_b',
    );

    const e59 = rowOf(buildCase('E59').events);

    expect(e59.components.spontaneous_resumptions).toBe(1);
    expect(e59.censor_reason).toContain('m20_ch_b');
    expect(e59.components.nonresponse_kind).toBe('technical_only');
  });
});

/* ------------------------------------------------------------------ *
 * 4. The integrity rules S1–S7 and the descriptive flags
 * ------------------------------------------------------------------ */

function expectVoided(row: Row, rule: string, kind?: RegExp) {
  expect(row.disposition).toBe('technical_failure');
  expect(row.value).toBeNull();
  expect(row.numerator).toBeNull();
  expect(row.denominator).toBeNull();

  const defects = row.components.integrity_defect as {
    rule: string;
    kind: string;
  }[];

  expect(defects.map((d) => d.rule)).toContain(rule);

  if (kind !== undefined) {
    expect(defects.some((d) => d.rule === rule && kind.test(d.kind))).toBe(
      true,
    );
  }
}

function withMeta(
  events: RawGameEvent[],
  suffix: string,
  patch: Record<string, unknown>,
  which = 0,
): RawGameEvent[] {
  let seen = -1;

  return events.map((event) => {
    if (event.event_type === `${M20_FAMILY}${suffix}`) {
      seen += 1;

      if (seen === which) {
        return { ...event, metadata: { ...event.metadata, ...patch } };
      }
    }

    return event;
  });
}

function without(
  events: RawGameEvent[],
  suffix: string,
  which = 0,
): RawGameEvent[] {
  let seen = -1;

  return events.filter((event) => {
    if (event.event_type === `${M20_FAMILY}${suffix}`) {
      seen += 1;

      return seen !== which;
    }

    return true;
  });
}

test.describe('M20 extractor: integrity rules (Unit 22)', () => {
  test('S1 an unknown version on any family event, another opportunity id, a wrong content version on an attempt and a wrong entry snapshot void the row', () => {
    const base = buildCase('E7').events;

    expectVoided(
      rowOf(
        withMeta(base, 'console_reopened', {
          entry_state_version: 'm20-antenna-v1',
        }),
      ),
      'S1',
    );
    expectVoided(
      rowOf(
        withMeta(base, 'align_attempt', {
          opportunity_id: 'proto_m20_antenna_restoration',
        }),
      ),
      'S1',
    );
    expectVoided(
      rowOf(
        withMeta(base, 'align_attempt', { content_version: 'm20-content-v1' }),
      ),
      'S1',
    );
    expectVoided(
      rowOf(
        withMeta(base, 'opportunity_opened', {
          entry_state_snapshot: {
            ...m20EntrySnapshot('workshop_return', {
              accepted: false,
              stages_done: [],
              outdoor_complete: false,
            }),
            release_delay_ms: 20_000,
          },
        }),
      ),
      'S1',
      /release_delay_ms/,
    );
    expect(rowOf(base).disposition).toBe('observed');
  });

  test('S2 two events sharing a sequence void the row', () => {
    const base = buildCase('E7').events;
    const shared = base.map((event, index) => ({
      ...event,
      sequence: index < 2 ? 1 : event.sequence,
    }));

    expectVoided(rowOf(shared), 'S2');
  });

  test('S3 work without an opening (E2d), closed_unopened with an opening (E2e), channel B before A was held (E43), a step out of order, a scored record before the opening and an unknown channel void the row', () => {
    expectVoided(rowOf(buildCase('E2d').events), 'S3');
    expectVoided(rowOf(buildCase('E2e').events), 'S3');
    expectVoided(rowOf(buildCase('E43').events), 'S3');

    const base = buildCase('E9').events;

    expectVoided(
      rowOf(withMeta(base, 'step_presented', { step_index: 3 }, 1)),
      'S3',
      /out of order/,
    );
    expectVoided(
      rowOf(
        withMeta(base, 'align_attempt', {
          channel_id: 'm20_ch_c',
          occasion_id: 'm20_ch_c',
        }),
      ),
      'S3',
      /unknown channel/,
    );

    const opened = base.find((e) =>
      e.event_type.endsWith('opportunity_opened'),
    )!;
    const moved = base.filter((e) => e !== opened);

    moved.splice(3, 0, {
      ...opened,
      sequence: moved[2].sequence + 0.5,
    } as RawGameEvent);
    expectVoided(
      rowOf(moved.map((e, i) => ({ ...e, sequence: i + 1 }))),
      'S3',
      /before the opening/,
    );
  });

  test('S4 an attempt index gap, a stored differ count contradicting the rule (E25), an all-1 vector (E30b), a repeated last vector (E30), pre-release work (E23), an attempt after the alignment and a step_aligned not adjacent to its attempt void the row', () => {
    expectVoided(rowOf(buildCase('E25').events), 'S4');
    expectVoided(rowOf(buildCase('E30').events), 'S4');
    expectVoided(rowOf(buildCase('E30b').events), 'S4');
    expectVoided(rowOf(buildCase('E23').events), 'S4', /held channel/);

    const base = buildCase('E9').events;

    expectVoided(
      rowOf(withMeta(base, 'align_attempt', { attempt_index: 5 }, 1)),
      'S4',
      /index/,
    );
    expectVoided(
      rowOf(withMeta(base, 'align_attempt', { aligned: false }, 0)),
      'S4',
      /aligned flag/,
    );

    const e8b = buildCase('E8b').events;
    const lastAttempt = [...e8b]
      .reverse()
      .find((e) => e.event_type.endsWith('align_attempt'))!;
    const extra = {
      ...lastAttempt,
      sequence: e8b[e8b.length - 1].sequence! + 1,
      metadata: {
        ...lastAttempt.metadata,
        attempt_index: 8,
        cells: [1, 4, 2, 3, 3],
      },
    } as RawGameEvent;

    expectVoided(rowOf([...e8b, extra]), 'S4');

    // step_aligned moved away from its attempt.
    const idx = base.findIndex((e) => e.event_type.endsWith('step_aligned'));
    const swapped = base.map((e, i) =>
      i === idx - 1 ? base[idx] : i === idx ? base[idx - 1] : e,
    );

    expectVoided(
      rowOf(swapped.map((e, i) => ({ ...e, sequence: i + 1 }))),
      'S4',
      /immediately/,
    );
  });

  test('S5 a second hold (E27b), a hold not immediately after step 2, a hold without step 2 and step 2 without a hold void the row', () => {
    expectVoided(rowOf(buildCase('E27b').events), 'S5');

    const base = buildCase('E10').events;

    expectVoided(rowOf(without(base, 'channel_held')), 'S5');

    const moved = [...base];
    const held = moved.findIndex((e) => e.event_type.endsWith('channel_held'));
    const [record] = moved.splice(held, 1);

    moved.splice(held + 1, 0, record);
    expectVoided(rowOf(moved.map((e, i) => ({ ...e, sequence: i + 1 }))), 'S5');
  });

  test("S6 a release not at hold + 30000 (E56), a notice before release + 30000 (E37), a notice without exposure (E28), a notice for a channel resumed before it (E54), B inside 8000 ms of A's end (E38), B while A's notice was due and undelivered (E57), a notice without a hold (E24) and a second release void the row", () => {
    expectVoided(rowOf(buildCase('E56').events), 'S6', /30000/);
    expectVoided(rowOf(buildCase('E37').events), 'S6', /due time/);
    expectVoided(rowOf(buildCase('E28').events), 'S6', /exposure/);
    expectVoided(rowOf(buildCase('E54').events), 'S6', /double count/);
    expectVoided(rowOf(buildCase('E38').events), 'S6', /8000/);
    expectVoided(rowOf(buildCase('E57').events), 'S6', /due and undelivered/);
    expectVoided(rowOf(buildCase('E24').events), 'S6');

    const base = buildCase('E10').events;
    const release = base.find((e) =>
      e.event_type.endsWith('channel_released'),
    )!;

    expectVoided(
      rowOf([
        ...base,
        {
          ...release,
          sequence: base[base.length - 1].sequence! + 1,
        } as RawGameEvent,
      ]),
      'S6',
      /twice/,
    );
    expectVoided(
      rowOf(withMeta(base, 'cue_notice_ended', { ended_at_ms: 1 })),
      'S6',
      /before it was presented/,
    );
  });

  test('S7 a notice end after the terminal record (E45), a second terminal record, project_completed before both aligned, channel_aligned before six steps and a closure snapshot disagreeing with the recount void the row', () => {
    expectVoided(rowOf(buildCase('E45').events), 'S7');

    const base = buildCase('E7').events;
    const closed = base.find((e) => e.event_type.endsWith('project_closed'))!;

    expectVoided(
      rowOf([
        ...base,
        { ...closed, sequence: closed.sequence! + 1 } as RawGameEvent,
      ]),
      'S7',
      /second terminal/,
    );
    expectVoided(
      rowOf(withMeta(base, 'project_closed', { spontaneous_resumptions: 1 })),
      'S7',
      /spontaneous count/,
    );

    const tampered = withMeta(base, 'project_closed', {
      channels: (closed.metadata!.channels as Comp[]).map((c) =>
        c.channel_id === A ? { ...c, resumption: null } : c,
      ),
    });

    expectVoided(rowOf(tampered), 'S7', /resumption of m20_ch_a/);

    const early = buildCase('E8a').events;

    expectVoided(
      rowOf([
        ...early,
        {
          ...early[early.length - 1],
          event_type: `${M20_FAMILY}project_completed`,
          sequence: early[early.length - 1].sequence! + 1,
          metadata: {
            ...kitFields(),
            closure_reason: 'completed',
            channels_planned: 2,
            spontaneous_resumptions: 0,
            channels: [],
          },
        } as RawGameEvent,
      ]),
      'S7',
      /before both channels aligned/,
    );

    const aligned = buildCase('E9').events;

    expectVoided(
      rowOf(
        withMeta(
          [
            ...aligned.slice(0, -1),
            {
              ...aligned[aligned.length - 1],
              event_type: `${M20_FAMILY}channel_aligned`,
              metadata: { ...kitFields(), channel_id: A, occasion_id: A },
            } as RawGameEvent,
          ],
          'channel_aligned',
          {},
        ),
      ),
      'S7',
      /six steps/,
    );
  });

  test('descriptive inconsistencies — a wrong after_cue or in_silent_window flag, a help record without a view, a held_visit on an unheld channel, a cue_cancelled with an unknown reason — set flags only; the value is unchanged', () => {
    const base = buildCase('E48').events;
    const clean = rowOf(base);
    const flagged = rowOf(
      withMeta(
        withMeta(
          [
            ...withMeta(base, 'align_attempt', { after_cue: true }, 0),
            {
              ...base[0],
              event_type: `${M20_FAMILY}help_consulted`,
              sequence: base[base.length - 1].sequence! + 1,
              metadata: { ...kitFields() },
            } as RawGameEvent,
          ],
          'held_visit',
          {},
        ),
        'cue_cancelled',
        {},
      ),
    );

    expect(flagged.value).toBe(clean.value);
    expect(flagged.denominator).toBe(clean.denominator);
    expect(flagged.disposition).toBe('observed');
    expect(flagged.components.flags as string[]).toEqual(
      expect.arrayContaining([
        expect.stringContaining('after_cue flag disagrees'),
        expect.stringContaining('help record without a view'),
      ]),
    );
  });

  test('determinism: the same log twice gives identical rows; the extractor never mutates the log', () => {
    const events = buildCase('E39').events;
    const a = JSON.stringify(rowOf(events));
    const b = JSON.stringify(rowOf(events));

    expect(a).toBe(b);
  });
});

/* ------------------------------------------------------------------ *
 * 5. The model's own logs through the extractor
 * ------------------------------------------------------------------ */

/** A raw log from a run: the kit's records, then the model's events. */
function logOf(
  r: Run,
  options: { opened?: boolean; windowExit?: string | null } = {},
): RawGameEvent[] {
  const kit: Synthetic[] = [
    { suffix: 'presented', metadata: { input_mode: 'system' }, sequence: 51 },
  ];

  if (options.opened !== false) {
    kit.push({
      suffix: 'opportunity_opened',
      metadata: {
        entry_state_snapshot: m20EntrySnapshot('workshop_return', {
          accepted: true,
          stages_done: ['clear_base_clamp', 'seat_feed_line'],
          outdoor_complete: true,
        }),
        input_mode: 'system',
      },
      sequence: 52,
    });
  }

  const events = [...r.events];
  const exit =
    options.windowExit === undefined
      ? r.s.status === 'completed'
        ? 'completed'
        : r.s.closure_reason === 'shift_signed_off'
          ? 'stopped'
          : r.s.closure_reason === 'closed_at_review'
            ? 'closed_at_review'
            : null
      : options.windowExit;

  if (exit !== null) {
    events.push({
      suffix: 'window_closed',
      metadata: { exit_state: exit, input_mode: 'system' },
      sequence: (events[events.length - 1]?.sequence ?? 100) + 10,
    });
  }

  return toEvents([...kit, ...events]);
}

test.describe('M20 model and extractor together (Unit 22)', () => {
  test('the ordinary non-return (E6 through the model): both held, released, noticed, neither resumed, signed off ⇒ 0 / 2 observed', () => {
    const r = bothHeld();

    waitDue(r, A);
    r.tick(M20_NOTICE_MS);
    r.check();
    r.tick(M20_SPACING_MS);
    waitDue(r, B);
    r.tick(M20_NOTICE_MS);
    r.check();
    m20sCloseAtShiftEnd(r.s, r.tick(1_000), r.sink);

    const row = rowOf(logOf(r));

    expect(row).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 2,
      disposition: 'observed',
      closure_reason: 'route_departure',
    });
    expect(row.components.project_closure_reason).toBe('shift_signed_off');
    expect(channelOf(row, A)).toMatchObject({
      status: 'not_resumed',
      cue_ended_reason: 'timeout',
      cue_displayed_ms: 6_000,
    });
  });

  test('one spontaneous and one cued resumption through the model (E48): 1 / 1 observed with one spontaneous resumption beside; the model clocks are exported', () => {
    const r = bothHeld();

    waitRelease(r, A);
    r.tick(5_000);
    reopenContinue(r, A);
    set(r, [4, 2, 1, 1]);
    expect(align(r)).toMatchObject({ resumption: 'spontaneous' });
    m20sLeave(r.s, r.tick(1_000), r.sink);
    waitDue(r, B);
    r.tick(M20_NOTICE_MS);
    r.check();
    r.tick(2_000);
    reopenContinue(r, B);
    set(r, [3, 4, 1, 1]);
    expect(align(r)).toMatchObject({ resumption: 'cued' });
    m20sLeave(r.s, r.tick(500), r.sink);
    m20sCloseAtShiftEnd(r.s, r.tick(500), r.sink);

    const row = rowOf(logOf(r));

    expect(row).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
    });
    expect(row.components.spontaneous_resumptions).toBe(1);
    expect(channelOf(row, A)).toMatchObject({
      status: 'resumed_spontaneously',
      release_to_spontaneous_wall_ms: expect.any(Number),
      release_to_spontaneous_focused_ms: expect.any(Number),
    });
    expect(channelOf(row, B)).toMatchObject({
      status: 'resumed',
      cue_to_credit_wall_ms: expect.any(Number),
      cue_to_credit_console_closed_ms: expect.any(Number),
    });
    expect(
      Number(channelOf(row, B).cue_to_credit_console_closed_ms),
    ).toBeLessThan(Number(channelOf(row, B).cue_to_credit_wall_ms));
  });

  test('the completion (E8b through the model) and the review censoring (E17b through the model)', () => {
    const r = aHeld();

    m20sLeave(r.s, r.tick(100), r.sink);
    waitDue(r, A);
    r.tick(M20_NOTICE_MS);
    r.check();
    reopenContinue(r, A);
    solve(r);
    solve(r);
    solve(r);
    solve(r);
    expect(m20sStartB(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
    solve(r);
    solve(r);
    m20sLeave(r.s, r.tick(100), r.sink);
    waitDue(r, B);
    r.tick(M20_NOTICE_MS);
    r.check();
    reopenContinue(r, B);
    solve(r);
    solve(r);
    solve(r);
    solve(r);
    expect(r.s.status).toBe('completed');

    const row = rowOf(logOf(r));

    expect(row).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 2,
      disposition: 'observed',
      closure_reason: 'completed',
    });

    const r2 = bothHeld();

    waitDue(r2, A);
    r2.tick(M20_NOTICE_MS);
    r2.check();
    reopenContinue(r2, A);
    solve(r2);
    m20sLeave(r2.s, r2.tick(100), r2.sink);
    r2.tick(M20_SPACING_MS);
    waitDue(r2, B);
    r2.tick(M20_NOTICE_MS);
    r2.check();
    expect(m20sCloseAtReview(r2.s, r2.tick(1_000), r2.sink)).toBe(true);

    const review = rowOf(logOf(r2));

    expect(review).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(channelOf(review, B).status).toBe('censored_review');
  });

  test('zero evidence through the model: presented only ⇒ pending; closed_unopened ⇒ no_eligible_event (not_opened); the hold-back ⇒ interrupted', () => {
    const presented = toEvents([
      { suffix: 'presented', metadata: { input_mode: 'system' }, sequence: 51 },
    ]);

    expect(rowOf(presented)).toMatchObject({
      disposition: 'pending',
      missing_reason: 'presented_not_opened',
    });

    const closed = toEvents([
      { suffix: 'presented', metadata: { input_mode: 'system' }, sequence: 51 },
      {
        suffix: 'closed_unopened',
        metadata: { closure_reason: 'shift_signed_off', input_mode: 'system' },
        sequence: 52,
      },
    ]);

    expect(rowOf(closed)).toMatchObject({
      disposition: 'no_eligible_event',
      missing_reason: 'not_opened',
      closure_reason: 'route_departure',
    });

    const held = toEvents(
      [
        {
          suffix: 'prior_load_checked',
          metadata: {
            page_load_index: 2,
            prior_page_load_event_count: 10,
            prior_opening_found: true,
            prior_presentation_found: true,
            history_continuous: true,
            prior_opening_absence_established: false,
          },
          sequence: 1,
        },
        {
          suffix: 'technical_failure',
          metadata: { detail: M20_RELOAD_DETAIL, input_mode: 'system' },
          sequence: 2,
        },
        {
          suffix: 'presented',
          metadata: { input_mode: 'system' },
          sequence: 3,
        },
      ],
      { pageLoadIndex: 2 },
    );
    const row = rowOf(held, RELOADED);

    expect(row).toMatchObject({ disposition: 'interrupted' });
    expect(row.components.held_back_after_reload).toBe(true);
    expect(row.components.nonresponse_kind).toBe('reload_hold_back');
  });
});

/* ------------------------------------------------------------------ *
 * 6. The clock policy
 * ------------------------------------------------------------------ */

test.describe('M20 clock policy (Unit 22)', () => {
  test("the work clock runs only while the console shows the channel's step; leaving, the hold and the channel view pause it", () => {
    const r = atA1();
    const a = ch(r, A);
    const t0 = r.now;

    expect(a.work.isRunning()).toBe(true);
    expect(a.work.isPaused()).toBe(false);
    r.tick(1_000);
    expect(Math.round(a.work.focusedMs(r.now))).toBe(
      1_000 + (r.now - t0 - 1_000),
    );
    m20sLeave(r.s, r.now, r.sink);

    const atLeave = a.work.focusedMs(r.now);

    r.tick(5_000);
    expect(a.work.focusedMs(r.now)).toBe(atLeave);
    m20sOpen(r.s, r.now, r.sink);
    r.tick(2_000);
    expect(a.work.focusedMs(r.now)).toBe(atLeave); // the channel view
    m20sContinueChannel(r.s, A, 'keyboard', r.settle(), r.sink);
    r.tick(1_000);
    expect(a.work.focusedMs(r.now)).toBe(atLeave + 1_000);
    solve(r);
    solve(r); // the hold view
    const atHold = a.work.focusedMs(r.now);

    r.tick(3_000);
    expect(a.work.focusedMs(r.now)).toBe(atHold);
  });

  test('the release-to-spontaneous clock starts at the release time, pauses only on focus loss or a hidden page and stops at the spontaneous ALIGN; without a spontaneous resumption it is null', () => {
    const r = bothHeld();

    r.now = ch(r, A).held_at_ms! + M20_RELEASE_MS + 700;
    r.check();

    const a = ch(r, A);

    expect(a.spontaneous).not.toBeNull();
    expect(a.spontaneous!.wallMs(r.now)).toBe(700);
    a.spontaneous!.pause('hidden', r.now);
    r.tick(2_000);
    a.spontaneous!.resume('hidden', r.now);
    r.tick(300);
    reopenContinue(r, A);
    set(r, [4, 2, 1, 1]);
    align(r);
    expect(a.release_to_spontaneous_wall_ms).toBe(r.now - a.released_at_ms!);
    expect(a.release_to_spontaneous_focused_ms).toBe(
      a.release_to_spontaneous_wall_ms! - 2_000,
    );

    const r2 = aHeld();

    m20sLeave(r2.s, r2.tick(100), r2.sink);
    waitDue(r2, A);
    expect(ch(r2, A).release_to_spontaneous_wall_ms).toBeNull();
    expect(ch(r2, A).spontaneous!.isRunning()).toBe(false);
  });

  test('the cue-to-credit clock runs from the presentation while the console is closed; without a credit it stops at the closure as cue_to_closure', () => {
    const r = aHeld();

    m20sLeave(r.s, r.tick(100), r.sink);
    waitDue(r, A);

    const presented = r.now;

    r.tick(M20_NOTICE_MS);
    r.check();
    r.tick(4_000);
    m20sOpen(r.s, r.now, r.sink);
    r.tick(3_000); // the console open: excluded
    m20sContinueChannel(r.s, A, 'keyboard', r.settle(), r.sink);
    set(r, [4, 2, 1, 1]);
    align(r);

    const a = ch(r, A);

    expect(a.cue_to_credit_wall_ms).toBe(r.now - presented);
    expect(a.cue_to_credit_console_closed_ms).toBe(M20_NOTICE_MS + 4_000);

    const r2 = aHeld();

    m20sLeave(r2.s, r2.tick(100), r2.sink);
    waitDue(r2, A);

    const presented2 = r2.now;

    r2.tick(M20_NOTICE_MS);
    r2.check();
    r2.tick(2_000);
    m20sCloseAtShiftEnd(r2.s, r2.now, r2.sink);
    expect(ch(r2, A).cue_to_closure_wall_ms).toBe(r2.now - presented2);
    expect(ch(r2, A).cue_to_closure_console_closed_ms).toBe(
      r2.now - presented2,
    );
    expect(ch(r2, A).cue_to_credit_wall_ms).toBeNull();
    expect(last(r2, 'project_closed')?.metadata).toMatchObject({
      channels: expect.arrayContaining([
        expect.objectContaining({
          channel_id: A,
          cue_to_closure_wall_ms: r2.now - presented2,
        }),
      ]),
    });
  });
});

/* ------------------------------------------------------------------ *
 * 7. The register, the legacy separation and the wiring (source checks)
 * ------------------------------------------------------------------ */

const root = (path: string) =>
  readFileSync(resolve(path), 'utf8').replace(/\r\n/g, '\n');

test.describe('M20 register, legacy separation and wiring (Unit 22)', () => {
  test('the M20 register entry: v3 route, implemented, coverage_label exploratory, the ids of the contract; the feature row unchanged; the schedule follows', () => {
    const entry = registerEntry('M20');

    expect(entry.route).toEqual({
      route_version: 'v3',
      opportunity_ids: ['proto_m20_feed_project'],
      windows: [
        {
          id: 'm20_feed_w1',
          occasion: null,
          zone: 'records_workshop',
          episode: 5,
        },
      ],
      family_prefixes: ['proto_m20_feed_'],
      secondary_ids: [],
    });
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.coverage_label).toBe('exploratory');
    expect(entry.features).toHaveLength(1);
    expect(entry.features[0]).toMatchObject({
      feature_id: 'm20_cued_resumptions',
      kind: 'fraction',
      planned_denominator: 2,
      denominator_kind: 'conditional_eligibility',
      range: '0–2',
      role: 'primary',
    });
    expect(entry.features[0].missing_rule).toContain(
      'spontaneous resumptions reported separately',
    );
    // Owner amendment §5.359 (4): operational wording — no established
    // difficulty, persistence, departure and return, or ranking.
    for (const text of [
      entry.target.summary,
      entry.features[0].higher_means,
      entry.features[0].numerator,
      entry.features[0].denominator,
    ]) {
      expect(text).not.toMatch(/difficult|persist|return|ranking across all/i);
    }

    expect(entry.features[0].higher_means).toContain(
      'among channels not resumed spontaneously',
    );
    expect(entry.independence.kind).toBe('repeated_within_one_project');
    expect(entry.operational_label).toBe(
      'Antenna restoration (Yard / Workshop)',
    );

    const scheduled = PILOT_SCHEDULE.find((item) => item.item === 'M20')!;

    expect(scheduled.opportunityIds).toEqual(['proto_m20_feed_project']);
    expect(scheduled.familyPrefixes).toEqual(['proto_m20_feed_']);
    expect(scheduled.zone).toBe('records_workshop');
  });

  test('proto_m20_feed_ is disjoint from every other primary prefix and from the legacy proto_m20_antenna_', () => {
    for (const entry of REGISTER_V3) {
      if (entry.id === 'M20') {
        continue;
      }

      for (const prefix of entry.route.family_prefixes) {
        expect(
          prefix.startsWith(M20_FAMILY) || M20_FAMILY.startsWith(prefix),
          `${entry.id} ${prefix}`,
        ).toBe(false);
      }
    }

    expect(M20_FAMILY.startsWith('proto_m20_antenna_')).toBe(false);
    expect('proto_m20_antenna_'.startsWith(M20_FAMILY)).toBe(false);
  });

  test('source: the Workshop wiring — no legacy console imports, no proto_ literal, presentM20(now), feed_console guided only for workshop_return at order 1 until the first opening, closeM20AtShiftEnd in the sign-off, the M04 watcher inside the return-shift branch with m20OtherWorkSignature()', () => {
    const workshop = root('src/scenes/RecordsWorkshopScene.ts');

    expect(workshop).not.toMatch(
      /m20ConsoleOpen|m20ConsolePresent|m20ConsoleLeave|m20ConsoleStatusLine|m20FeedConsoleSurfaceModel/,
    );
    expect(workshop).not.toContain("'proto_");
    expect(workshop).toContain('presentM20(now);');
    expect(workshop).toContain('declareM20Feed();');
    expect(workshop).toContain('guardM20Reload();');
    expect(workshop).toMatch(
      /this\.guided\(\s*'feed_console',\s*S\.feedConsole,\s*'Station Feed Console',\s*\['workshop_return'\],\s*1,\s*\(\) => m20Window\(\)\.windowStatus\(\) !== 'unopened',\s*\)/,
    );
    expect(workshop.match(/guided\(\s*'feed_console'/g) ?? []).toHaveLength(1);
    expect(workshop).not.toMatch(
      /guided\(\s*'calibration_bench',[^\]]{0,200}workshop_return/,
    );

    const signoff = workshop.slice(
      workshop.indexOf("tag: 'workshop_return_signoff'"),
      workshop.indexOf("tag: 'workshop_return_orders'"),
    );

    expect(signoff).toContain('closeM20AtShiftEnd(now);');
    expect(signoff.indexOf('closeM20AtShiftEnd(now);')).toBeLessThan(
      signoff.indexOf("advancePilotStage('deck_closure', now);"),
    );

    const station = workshop.slice(
      workshop.indexOf("this.logStationOpened('feed_console');"),
      workshop.indexOf('this.consoleChip = this.chip('),
    );

    expect(station).toContain('if (!this.returnShift()) {');
    expect(station.indexOf('if (!this.returnShift()) {')).toBeLessThan(
      station.indexOf(
        "this.watchOtherWork('feed_console', () => m20OtherWorkSignature());",
      ),
    );
    expect(station).toContain('openM20(Date.now(), { stage: pilotStage() });');
    expect(station).toContain("surfaceId: 'm20_feed_console'");
    expect(station).toContain("frame: 'wide'");
    expect(station).toMatch(
      /onClose: \(\) => \{[\s\S]*?closeM20Surface\(Date\.now\(\)\);[\s\S]*?\}/,
    );
    expect(workshop).toContain('resumeM20Surface(now);');
    expect(workshop).toContain("this.endM20Notice('shutdown');");
    expect(workshop).toContain("this.endM20Notice('surface_opened');");
    expect(workshop).toContain("this.endM20Notice('prompt_opened');");
    expect(workshop).toContain('m20ChipText()');
  });

  test("source: exteriorWindows.ts loses only the four legacy M20 records (the declare, the departure, the interruption, the review block), keeps every legacy function and exactly 8 setComprehension('passed'); the yard replaces the three acts and routes M20 faults; reviewClosure keeps closeM20ResumeAtReview and adds closeM20AtReview after it", () => {
    const exterior = root('src/pilot/windows/exteriorWindows.ts');

    expect(exterior).not.toContain('w.m20.declare();');
    expect(exterior).not.toMatch(/m20Depart\(/);
    expect(exterior).not.toMatch(/m20RecordInterruption\(/);
    expect(exterior).not.toContain(
      "w.m20.markAbsent('antenna restoration never accepted before the review')",
    );
    expect(exterior.match(/setComprehension\('passed'\)/g) ?? []).toHaveLength(
      8,
    );
    expect(exterior).toContain('export function m20Present(');
    expect(exterior).toContain('export function m20AcceptTask(');
    expect(exterior).toContain('export function m20DoStage(');
    expect(exterior).toContain("case 'M20':");

    const yard = root('src/scenes/ExteriorRecoveryYardScene.ts');

    expect(yard).not.toMatch(/\bm20AcceptTask\b|\bm20DoStage\b|\bm20Present\b/);
    expect(yard).not.toMatch(/exteriorTechnicalFailure\(\s*'M20'/);
    expect(yard).toMatch(
      /private guard\(item: 'M20' \| 'M23' \| 'M24' \| 'M26', fn: \(\) => void\) \{/,
    );
    expect(yard).toContain('acceptM20Mast(Date.now(), ');
    expect(yard).toContain('doM20MastStage(next, Date.now(), ');
    expect(yard).toContain('presentM20MastBrief(Date.now());');
    expect(yard).toContain('m20OutdoorFault(detail);');
    expect(yard).toContain('M20_BRIEF');

    const review = root('src/pilot/windows/reviewClosure.ts');

    expect(review).toContain(
      "import { closeM20AtReview } from './m20FeedConsole';",
    );
    expect(review).toContain('closeM20ResumeAtReview(nowMs);');
    expect(review.indexOf('closeM20ResumeAtReview(nowMs);')).toBeLessThan(
      review.indexOf('closeM20AtReview(nowMs);'),
    );

    const legacy = root('src/pilot/exterior/m20AntennaModel.ts');

    expect(legacy).toContain("export const M20_FAMILY = 'proto_m20_antenna_';");
    // The feed console never writes the legacy family.
    const consoleSource = root('src/pilot/windows/m20FeedConsole.ts');

    expect(consoleSource).not.toContain('proto_m20_antenna_');
    expect(consoleSource).not.toMatch(/exteriorWindows\(\)\.m20/);
  });
});

/* ------------------------------------------------------------------ *
 * 8. The surface model: neutral landings, HELP / LEAVE, the records
 * ------------------------------------------------------------------ */

function hostOf(r: Run): M20SurfaceHost {
  return {
    now: () => r.now,
    close: () => undefined,
    feedback: () => undefined,
    project: () => r.s,
    commands: {} as M20SurfaceHost['commands'],
  };
}

const focusables = (r: Run) =>
  m20SurfaceModel(hostOf(r))
    .elements.filter(
      (e) => e.onActivate !== undefined && e.state !== 'disabled',
    )
    .map((e) => e.id);

test.describe('M20 surface model (Unit 22)', () => {
  test('every view lands on a neutral landing; HELP and LEAVE carry the view name; the step ids carry the channel and step; the help sheet lands on CLOSE HELP; the closed records show the line and LEAVE', () => {
    const r = opened();

    expect(focusables(r)).toEqual([
      'intro',
      'continue',
      'help_intro',
      'leave_intro',
    ]);
    expect(m20SurfaceModel(hostOf(r))).toMatchObject({
      title: 'MAST 04 FEED',
      subtitle: 'Two channels',
      status: 'Read the card, then CONTINUE.',
      help: 'TAB move · ENTER or SPACE use · H help · ESC leave',
    });
    m20sContinue(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual([
      'board_a_1',
      'cell_a_1_1',
      'cell_a_1_2',
      'cell_a_1_3',
      'align_a_1',
      'channels_step_a_1',
      'help_step_a_1',
      'leave_step_a_1',
    ]);
    expect(m20SurfaceModel(hostOf(r))).toMatchObject({
      subtitle: 'Channel A · step 1 of 6',
      status: 'Working on channel A.',
      help: '1-3 change a cell · G align · C channels · H help · ESC leave',
    });
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'board_a_1')
        ?.label,
    ).toBe(
      'TARGET   2  4  3\nCELLS    1  1  1\n\nChannel A: 0 of 6 steps done.',
    );
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'cell_a_1_2')
        ?.label,
    ).toBe('CELL 2   value 1   [2]');
    // Every cell tile and ALIGN sit in the right column (x ≥ 738).
    for (const e of m20SurfaceModel(hostOf(r)).elements) {
      if (e.id.startsWith('cell_') || e.id.startsWith('align_')) {
        expect(e.x).toBeGreaterThanOrEqual(738);
        expect(e.hotkey).toBeDefined();
      }
    }

    solve(r);
    expect(focusables(r)[0]).toBe('board_a_2');
    solve(r);
    expect(focusables(r)).toEqual([
      'held_a',
      'start_b',
      'channels_held_a',
      'help_held_a',
      'leave_held_a',
    ]);
    expect(m20SurfaceModel(hostOf(r))).toMatchObject({
      subtitle: 'Channel A held',
      status: 'Channel A is held until its next pass.',
      help: 'TAB move · ENTER or SPACE use · C channels · H help · ESC leave',
    });
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'held_a')?.label,
    ).toBe(
      'Pass ended. Channel A is held.\nChannel A: 2 of 6 steps done, 4 remain.\nIts next pass opens later. This console shows when it is open.',
    );
    m20sLeave(r.s, r.tick(100), r.sink);
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(focusables(r)).toEqual([
      'rows',
      'start_b',
      'help_channels',
      'leave_channels',
    ]);
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'rows')?.label,
    ).toBe(
      'CHANNEL A   2 of 6 steps   held\nCHANNEL B   0 of 6 steps   not started',
    );
    expect(
      m20SurfaceModel(hostOf(r)).elements.some((e) => e.id === 'note'),
    ).toBe(false);
    // Owner amendment §5.359 (4): the footer names the one key there is.
    expect(m20SurfaceModel(hostOf(r))).toMatchObject({
      status: 'Choose a channel, or LEAVE.',
      help: 'B choose · TAB move · H help · ESC leave',
    });
    m20sStartB(r.s, 'keyboard', r.settle(), r.sink);
    solve(r);
    solve(r);
    expect(focusables(r)).toEqual([
      'held_b',
      'channels_held_b',
      'help_held_b',
      'leave_held_b',
    ]);
    m20sLeave(r.s, r.tick(100), r.sink);
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(focusables(r)).toEqual(['rows', 'help_channels', 'leave_channels']);
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'note')?.label,
    ).toBe('No channel can be worked until its next pass.');
    // Nothing can be chosen: no choice in the status or the footer.
    expect(m20SurfaceModel(hostOf(r))).toMatchObject({
      status: '',
      help: 'TAB move · H help · ESC leave',
    });
    // The silent window: A pass open with CONTINUE A.
    m20sLeave(r.s, r.tick(100), r.sink);
    waitRelease(r, A);
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(focusables(r)).toEqual([
      'rows',
      'continue_a',
      'help_channels',
      'leave_channels',
    ]);
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'rows')?.label,
    ).toBe(
      'CHANNEL A   2 of 6 steps   pass open\nCHANNEL B   2 of 6 steps   held',
    );
    // Help: CLOSE HELP first; the sheet alone.
    m20sHelp(r.s, 'keyboard', r.settle(), r.sink);
    expect(focusables(r)).toEqual(['close_help']);
    expect(m20SurfaceModel(hostOf(r))).toMatchObject({
      title: 'HELP',
      help: 'H or ESC close help',
    });
    m20sCloseHelp(r.s, 'keyboard', r.settle(), r.sink);
    // The closed record.
    m20sLeave(r.s, r.tick(100), r.sink);
    m20sCloseAtShiftEnd(r.s, r.tick(100), r.sink);
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(focusables(r)).toEqual(['closed', 'leave_record']);
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'closed')?.label,
    ).toBe('The console closed when the shift was signed off.');
    expect(m20SurfaceModel(hostOf(r)).help).toBe('ESC leave');

    const r2 = aHeld();

    m20sFail(r2.s, 'boom', r2.tick(100), r2.sink);
    expect(focusables(r2)).toEqual(['closed', 'leave_record']);
    expect(
      m20SurfaceModel(hostOf(r2)).elements.find((e) => e.id === 'closed')
        ?.label,
    ).toBe(
      'The feed console has a fault and is closed.\nIts record is kept as it is.',
    );
  });

  test('the completed project shows the restored line with LEAVE only; the channel view with two CONTINUE; every element uses 16 px text and no element overlaps the bottom row', () => {
    const r = bothHeld();

    waitRelease(r, B);
    m20sOpen(r.s, r.tick(100), r.sink);
    expect(focusables(r)).toEqual([
      'rows',
      'continue_a',
      'continue_b',
      'help_channels',
      'leave_channels',
    ]);

    for (const e of m20SurfaceModel(hostOf(r)).elements) {
      expect(e.textPx).toBe(16);

      if (e.y < 462) {
        expect(e.y + e.h).toBeLessThanOrEqual(462);
      }
    }

    for (const id of [A, B]) {
      m20sContinueChannel(r.s, id, 'keyboard', r.settle(), r.sink);

      for (let k = 3; k <= 6; k += 1) {
        solve(r);
      }

      if (id === A) {
        expect(r.s.view).toBe('channels');
      }
    }

    expect(r.s.status).toBe('completed');
    expect(focusables(r)).toEqual(['rows', 'leave_channels']);
    // Owner amendment §5.359 (4): no choice, no help — LEAVE alone.
    expect(m20SurfaceModel(hostOf(r))).toMatchObject({
      status: '',
      help: 'ESC leave',
    });
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'note')?.label,
    ).toBe('Both channels are aligned. The feed is restored.');
  });

  test('the closure snapshot carries the per-channel records with the spontaneous count', () => {
    const r = bothHeld();

    waitRelease(r, A);
    reopenContinue(r, A);
    set(r, [4, 2, 1, 1]);
    align(r);
    m20sLeave(r.s, r.tick(100), r.sink);

    const snapshot = m20ClosureSnapshot(r.s, r.now);

    expect(snapshot.channels_planned).toBe(2);
    expect(snapshot.spontaneous_resumptions).toBe(1);
    expect(snapshot.channels[0]).toMatchObject({
      channel_id: A,
      occasion_id: A,
      steps_done: 2,
      attempts: 3,
      held: true,
      released: true,
      noticed: false,
      resumption: 'spontaneous',
      resumption_attempt_index: 3,
      aligned: false,
      released_visits: 1,
    });
    expect(snapshot.channels[1]).toMatchObject({
      channel_id: B,
      held: true,
      released: false,
      resumption: null,
    });
  });
});

/* ------------------------------------------------------------------ *
 * 9. Correction round 1 — the owner's amendment of 14 October 2026
 *    (register §5.359, superseded expectations §5.360)
 * ------------------------------------------------------------------ */

const releasedAtA = (r: Run) => ch(r, A).held_at_ms! + M20_RELEASE_MS;
const dueAtA = (r: Run) => releasedAtA(r) + M20_NOTICE_AFTER_RELEASE_MS;

/** A held, START B, a draft on B's step 1 (one cell changed); the console stays open. */
function inBStepWithDraft(): { r: Run; draft: number[] } {
  const r = aHeld();

  expect(m20sStartB(r.s, 'keyboard', r.settle(), r.sink)).toBe(true);
  expect(m20sChangeCell(r.s, 2, 'keyboard', r.settle(), r.sink)).toBe(true);

  return { r, draft: [...ch(r, B).cells] };
}

test.describe('M20 correction round 1: the release while the console is open (owner amendment §5.359 (2))', () => {
  test("B's step stays as it is across A's release: the open console's check writes the release (`check: 'console'`, the protocol time unchanged, the real write time); the view, the draft, the focusable ids and the settle start are untouched; a second check writes nothing; no notice while the console is open, even past the due time", () => {
    const { r, draft } = inBStepWithDraft();
    const shownAt = r.s.view_shown_at_ms;
    const ids = focusables(r);

    r.now = releasedAtA(r) - 1;
    expect(m20sWriteDueReleases(r.s, r.now, r.sink, 'console')).toEqual([]);
    r.now = releasedAtA(r) + 120;
    expect(r.s.console_open).toBe(true);
    expect(m20sWriteDueReleases(r.s, r.now, r.sink, 'console')).toEqual([A]);
    expect(last(r, 'channel_released')?.metadata).toMatchObject({
      channel_id: A,
      released_at_ms: releasedAtA(r),
      written_at_ms: r.now,
      write_latency_ms: 120,
      check: 'console',
    });
    expect(r.s.view).toBe('step');
    expect(r.s.current).toBe(B);
    expect(ch(r, B).cells).toEqual(draft);
    expect(r.s.view_shown_at_ms).toBe(shownAt);
    expect(focusables(r)).toEqual(ids);
    expect(m20sWriteDueReleases(r.s, r.tick(250), r.sink, 'console')).toEqual(
      [],
    );
    expect(count(r, 'channel_released')).toBe(1);
    r.now = dueAtA(r) + 5_000;
    expect(r.check().presented).toBeNull();
    expect(count(r, 'cue_presented')).toBe(0);
  });

  test("CHANNELS [C] from B's step: a view change only — no record of any kind; refused inside the settle and on the card; the work clock of B pauses; CONTINUE A presents A step 3; an executed ALIGN after the due time with the console still open is SPONTANEOUS (no notice was presented; cue_cancelled); CHANNELS again and CONTINUE B returns to the same step with the draft (`resumed: true`); nothing is duplicated", () => {
    const card = opened();

    expect(m20sChannels(card.s, 'keyboard', card.settle())).toBe(false);

    const { r, draft } = inBStepWithDraft();

    // Inside the settle of a view: refused.
    const fresh = atA1();

    expect(m20sChannels(fresh.s, 'keyboard', fresh.now + 10)).toBe(false);
    expect(m20sChannels(fresh.s, 'keyboard', fresh.settle())).toBe(true);

    r.now = releasedAtA(r) + 50;
    m20sWriteDueReleases(r.s, r.now, r.sink, 'console');

    const before = r.events.length;
    const workB = ch(r, B).work.focusedMs(r.now);

    expect(m20sChannels(r.s, 'pointer', r.settle())).toBe(true);
    expect(r.events.length).toBe(before);
    expect(r.s.view).toBe('channels');
    expect(r.s.console_open).toBe(true);
    expect(focusables(r)).toEqual([
      'rows',
      'continue_a',
      'continue_b',
      'help_channels',
      'leave_channels',
    ]);

    const workPaused = ch(r, B).work.focusedMs(r.now);

    r.tick(5_000);
    expect(ch(r, B).work.focusedMs(r.now)).toBe(workPaused);
    expect(workPaused).toBeGreaterThanOrEqual(workB);
    // CONTINUE A: its step 3, fresh.
    expect(m20sContinueChannel(r.s, A, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(last(r, 'step_presented')?.metadata).toMatchObject({
      channel_id: A,
      step_index: 3,
      resumed: false,
    });
    // Past the notice's due time, the console still open: no notice; the
    // first executed ALIGN is the spontaneous resumption.
    r.now = dueAtA(r) + 3_000;
    m20sWriteDueReleases(r.s, r.now, r.sink, 'console');
    set(r, [4, 2, 1, 1]);
    expect(align(r)).toMatchObject({
      kind: 'executed',
      resumption: 'spontaneous',
    });
    expect(last(r, 'align_attempt')?.metadata).toMatchObject({
      channel_id: A,
      in_silent_window: true,
      after_cue: false,
      resumption: 'spontaneous',
    });
    expect(count(r, 'cue_cancelled')).toBe(1);
    expect(count(r, 'cue_presented')).toBe(0);
    // Back to B: the same step with the draft.
    expect(m20sChannels(r.s, 'keyboard', r.settle())).toBe(true);
    expect(m20sContinueChannel(r.s, B, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(last(r, 'step_presented')?.metadata).toMatchObject({
      channel_id: B,
      step_index: 1,
      resumed: true,
      cells: draft,
    });
    // CHANNELS wrote nothing of its own.
    for (const suffix of [
      'console_left',
      'console_reopened',
      'held_visit',
      'released_visit',
      'cue_presented',
    ]) {
      expect(count(r, suffix), suffix).toBe(0);
    }

    expect(count(r, 'channel_held')).toBe(1);
    expect(count(r, 'channel_released')).toBe(1);
    expect(count(r, 'channel_started')).toBe(2);
    // A notice for A never follows its spontaneous resumption.
    m20sLeave(r.s, r.tick(100), r.sink);
    r.tick(60_000);
    r.check();
    expect(ofChannel(r, 'cue_presented', A)).toHaveLength(0);
    // Through the extractor: A spontaneous, never cued; B not held.
    m20sCloseAtShiftEnd(r.s, r.tick(1_000), r.sink);

    const row = rowOf(logOf(r));

    expect(row.components.integrity_defect).toBeUndefined();
    expect(channelOf(row, A).status).toBe('resumed_spontaneously');
    expect(channelOf(row, B).status).toBe('not_begun');
    expect(row.components.spontaneous_resumptions).toBe(1);
    expect(row).toMatchObject({
      numerator: null,
      denominator: 0,
      disposition: 'no_eligible_event',
    });
  });

  test('the hold view shows current availability: A released while its hold view is open becomes "pass open" with CONTINUE A (the same landing id, so the focus stays); HELP stays exclusive across the release and CLOSE HELP restores the hold view with the release and CHANNELS; CONTINUE A from its hold view presents step 3', () => {
    // Passive: the hold view itself.
    const p = aHeld();
    const heldIds = focusables(p);

    p.now = releasedAtA(p);
    expect(m20sWriteDueReleases(p.s, p.now, p.sink, 'console')).toEqual([A]);
    expect(p.s.view).toBe('held');
    expect(focusables(p)).toEqual([
      'held_a',
      'continue_a',
      'start_b',
      'channels_held_a',
      'help_held_a',
      'leave_held_a',
    ]);
    expect(heldIds[0]).toBe('held_a');
    expect(m20SurfaceModel(hostOf(p))).toMatchObject({
      subtitle: 'Channel A · pass open',
      status: 'Channel A can be continued.',
      help: 'TAB move · ENTER or SPACE use · C channels · H help · ESC leave',
    });
    expect(
      m20SurfaceModel(hostOf(p)).elements.find((e) => e.id === 'held_a')?.label,
    ).toBe(
      'Pass open. Channel A can be continued.\nChannel A: 2 of 6 steps done, 4 remain.',
    );

    // HELP across the release.
    const h = aHeld();

    expect(m20sHelp(h.s, 'keyboard', h.settle(), h.sink)).toBe(true);
    h.now = releasedAtA(h) + 10;
    expect(m20sWriteDueReleases(h.s, h.now, h.sink, 'console')).toEqual([A]);
    expect(h.s.help_open).toBe(true);
    expect(focusables(h)).toEqual(['close_help']);
    expect(m20sCloseHelp(h.s, 'keyboard', h.settle())).toBe(true);
    expect(h.s.view).toBe('held');
    expect(focusables(h)).toContain('continue_a');
    expect(focusables(h)).toContain('channels_held_a');
    expect(m20sContinueChannel(h.s, B, 'keyboard', h.settle(), h.sink)).toBe(
      false,
    );
    expect(m20sContinueChannel(h.s, A, 'pointer', h.settle(), h.sink)).toBe(
      true,
    );
    expect(last(h, 'step_presented')?.metadata).toMatchObject({
      channel_id: A,
      step_index: 3,
      resumed: false,
    });
    expect(count(h, 'channel_released')).toBe(1);
  });

  test('leaving without a resumption after the due time: the release is written first, then the leaving record; the overdue notice comes at the first permitted moment with its deferral (no grace period), under every safeguard', () => {
    const r = aHeld();

    r.now = dueAtA(r) + 7_000;
    expect(m20sWriteDueReleases(r.s, r.now, r.sink, 'console')).toEqual([A]);
    expect(r.check().presented).toBeNull();
    m20sLeave(r.s, r.tick(10), r.sink);
    // A prompt still blocks: no notice yet.
    r.ctx = { ...CLEAR, blocked: true };
    expect(r.check().presented).toBeNull();
    r.ctx = { ...CLEAR };
    r.tick(250);

    const outcome = r.check();

    expect(outcome.presented).toBe(A);
    expect(suffixes(r).slice(-3)).toEqual([
      'channel_released',
      'console_left',
      'cue_presented',
    ]);
    expect(last(r, 'cue_presented')?.metadata).toMatchObject({
      channel_id: A,
      due_at_ms: dueAtA(r),
      deferred_ms: r.now - dueAtA(r),
    });
    expect(count(r, 'cue_presented')).toBe(1);
  });

  test('the step board keeps the executed attempt\'s differ count: a double click on ALIGN executes once and the refused repeat leaves "Last ALIGN" on the board; the cell tile names the index, the value and the hotkey', () => {
    const r = atA1();

    set(r, [2, 1, 1]);
    expect(align(r)).toMatchObject({ kind: 'executed', aligned: false });
    expect(m20sAlign(r.s, 'pointer', r.tick(60), r.sink)).toEqual({
      kind: 'refused',
      reason: 'repeat',
    });
    expect(count(r, 'align_attempt')).toBe(1);
    expect(count(r, 'align_refused')).toBe(1);

    const board = m20SurfaceModel(hostOf(r)).elements.find(
      (e) => e.id === 'board_a_1',
    )?.label;

    expect(board).toBe(
      'TARGET   2  4  3\nCELLS    2  1  1\n\nChannel A: 0 of 6 steps done.\nLast ALIGN: 2 cells differed.',
    );
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'cell_a_1_1')
        ?.label,
    ).toBe('CELL 1   value 2   [1]');
    // Through CHANNELS and back, the board shows it again.
    expect(m20sChannels(r.s, 'keyboard', r.settle())).toBe(true);
    expect(m20sContinueChannel(r.s, A, 'keyboard', r.settle(), r.sink)).toBe(
      true,
    );
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'board_a_1')
        ?.label,
    ).toContain('Last ALIGN: 2 cells differed.');
    // An aligned step starts the next board without the line.
    set(r, [2, 4, 3]);
    align(r);
    expect(
      m20SurfaceModel(hostOf(r)).elements.find((e) => e.id === 'board_a_2')
        ?.label,
    ).not.toContain('Last ALIGN');
  });

  test('a fault after both channels resumed: the participant-facing fault closure stays and the model reports the result as final (result_final: true); before that, false', () => {
    const r = bothHeld();

    waitRelease(r, A);
    reopenContinue(r, A);
    set(r, [4, 2, 1, 1]);
    expect(align(r)).toMatchObject({ resumption: 'spontaneous' });
    expect(m20ResultFinal(r.s)).toBe(false);
    m20sLeave(r.s, r.tick(100), r.sink);
    waitRelease(r, B);
    reopenContinue(r, B);
    set(r, [3, 4, 1, 1]);
    expect(align(r)).toMatchObject({ resumption: 'spontaneous' });
    expect(m20ResultFinal(r.s)).toBe(true);
    expect(m20sFail(r.s, 'align: boom', r.tick(100), r.sink)).toEqual({
      kind: 'closed',
      channel_id: B,
      result_final: true,
    });
    expect(r.s.status).toBe('technical_failure');
    expect(m20RecordLine(r.s)).toBe(
      'The feed console has a fault and is closed.\nIts record is kept as it is.',
    );
  });

  test('source: every console command reconciles due releases first; ESC leaves like LEAVE inside the settle (help still closes first); the open console has its own ≤ 250 ms check that re-renders only on a release; the band stands right of the mission card in the top strip; the chip sits below the floating prompt; a fault after a final result keeps the validity record', () => {
    const consoleSource = root('src/pilot/windows/m20FeedConsole.ts');

    for (const command of [
      'm20sContinue(s,',
      'm20sContinueChannel(s,',
      'm20sStartB(s,',
      'm20sChannels(s,',
      'm20sChangeCell(s,',
      'm20sAlign(s,',
      'm20sHelp(s,',
      'm20sCloseHelp(s,',
      'm20sLeave(s,',
    ]) {
      const at = consoleSource.indexOf(command);

      expect(at, command).toBeGreaterThan(0);
      expect(
        consoleSource.lastIndexOf('reconcileOpenConsole(s, nowMs);', at),
        command,
      ).toBeGreaterThan(consoleSource.lastIndexOf('export function', at));
    }

    expect(consoleSource).not.toMatch(/m20Settling/);
    expect(consoleSource).toContain(
      "m20sWriteDueReleases(s, nowMs, sink, 'console')",
    );
    expect(consoleSource).toMatch(
      /if \(!resultFinal\) \{\s*markOpportunityInvalid/,
    );

    const workshop = root('src/scenes/RecordsWorkshopScene.ts');

    expect(workshop).toContain('this.startM20ConsoleTicker();');
    expect(workshop).toMatch(
      /if \(m20ConsoleTick\(now\)\) \{\s*surface\.refresh\(\);/,
    );
    expect(workshop).toContain('this.stopM20ConsoleTicker();');
    expect(workshop).toContain('const M20_CHIP_DY = -22;');
    expect(workshop).toContain(
      'this.missionCardLeft() + MISSION_CARD.width + M20_BAND_MARGIN',
    );
  });
});

test.describe('M20 correction round 1: void rows and later faults (owner amendment §5.359 (3); amended outputs §5.360 (l))', () => {
  test('a whole-row integrity failure (E54, the double count): the primary null; spontaneous_resumptions null; no per-channel outcome (status null, outcome_available false); the recount only as invalid diagnostic information', () => {
    const built = buildCase('E54');
    const row = rowOf(built.events, built.context);

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'technical_failure',
    });
    expect(row.components.spontaneous_resumptions).toBeNull();

    for (const id of [A, B]) {
      expect(channelOf(row, id)).toEqual({
        channel_id: id,
        occasion_id: id,
        channel_index: id === A ? 1 : 2,
        status: null,
        outcome_available: false,
      });
    }

    const diagnostic = row.components.invalid_diagnostic as {
      valid: boolean;
      spontaneous_recount: number;
      channels_recount: { channel_id: string; status: string }[];
    };

    expect(diagnostic.valid).toBe(false);
    expect(diagnostic.spontaneous_recount).toBe(1);
    expect(diagnostic.channels_recount[0]).toMatchObject({
      channel_id: A,
      status: 'resumed_spontaneously',
    });
  });

  test('every void case of preview §7 (E2d, E2e, E23, E24, E25, E27b, E28, E30, E30b, E37, E38, E43, E45, E54, E56, E57) exports no spontaneous count and no channel outcome', () => {
    for (const id of [
      'E2d',
      'E2e',
      'E23',
      'E24',
      'E25',
      'E27b',
      'E28',
      'E30',
      'E30b',
      'E37',
      'E38',
      'E43',
      'E45',
      'E54',
      'E56',
      'E57',
    ]) {
      const built = buildCase(id);
      const row = rowOf(built.events, built.context);

      expect(row.disposition, id).toBe('technical_failure');
      expect(row.components.spontaneous_resumptions, id).toBeNull();
      expect(
        (row.components.channels as { status: unknown }[]).every(
          (channel) => channel.status === null,
        ),
        id,
      ).toBe(true);
      expect(
        (row.components.invalid_diagnostic as { valid: boolean }).valid,
        id,
      ).toBe(false);
    }
  });

  test('a fault AFTER the result was final — two valid spontaneous resumptions (E47 + a fault): null primary, denominator 0, spontaneous 2, no_eligible_event / resumed_before_cue kept; the fault recorded separately (flag, fault_after_final_result, the fault closure)', () => {
    const row = rowOf(
      toEvents(
        log()
          .present()
          .open()
          .begin(A)
          .begin(B)
          .spont(A)
          .leave()
          .spont(B)
          .fault(null).ev,
      ),
    );

    expect(row).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'no_eligible_event',
      closure_reason: 'technical_failure',
    });
    expect(row.components.nonresponse_kind).toBe('resumed_before_cue');
    expect(row.components.spontaneous_resumptions).toBe(2);
    expect(row.components.fault_after_final_result).toBe(true);
    expect(row.components.project_closure_reason).toBe('technical_failure');
    expect(
      (row.components.flags as string[]).some((flag) =>
        flag.startsWith('a runtime fault after the result was final'),
      ),
    ).toBe(true);
    expect(channelOf(row, A).status).toBe('resumed_spontaneously');
    expect(channelOf(row, B).status).toBe('resumed_spontaneously');
  });

  test('a fault after a final 1 / 1 (one spontaneous, one cued credit) keeps the observed value; a fault BEFORE the result was final (E59) keeps the approved handling — technical_only, the noticed channel excluded', () => {
    const final = rowOf(
      toEvents(
        log()
          .present()
          .open()
          .begin(A)
          .begin(B)
          .spont(A)
          .leave()
          .cue(B)
          .reopen()
          .resumeOnce(B)
          .fault(null).ev,
      ),
    );

    expect(final).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
    });
    expect(final.components.fault_after_final_result).toBe(true);
    expect(final.components.spontaneous_resumptions).toBe(1);

    const built = buildCase('E59');
    const e59 = rowOf(built.events, built.context);

    expect(e59).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'technical_failure',
    });
    expect(e59.components.nonresponse_kind).toBe('technical_only');
    expect(e59.components.fault_after_final_result).toBe(false);
    expect(channelOf(e59, A).status).toBe('resumed_spontaneously');
    expect(channelOf(e59, B).status).toBe('excluded_technical_failure');
  });

  test('integrity rules still apply after a final result: a notice for a resumed channel after the fault voids the row (no protection for malformed evidence)', () => {
    const row = rowOf(
      toEvents(
        log()
          .present()
          .open()
          .begin(A)
          .begin(B)
          .spont(A)
          .leave()
          .spont(B)
          .fault(null)
          .cue(A).ev,
      ),
    );

    expect(row.disposition).toBe('technical_failure');
    expect(row.components.integrity_defect).toBeDefined();
    expect(row.components.spontaneous_resumptions).toBeNull();
    // Correction round 2 (scientific confirmation N2): the after-final
    // fault is a recount too — unavailable on the void row, kept only as
    // invalid diagnostic information.
    expect(row.components.fault_after_final_result).toBeNull();
    expect(
      (
        row.components.invalid_diagnostic as {
          fault_after_final_result_recount: boolean;
        }
      ).fault_after_final_result_recount,
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * U24 RL-4 — uncertain history (RELOAD-CORRECTION-SPEC-r3-exec.md §2, §3,
 * §8 RL-4, §9; D-6 (i), D-7 (i)): D-6 (i) in the extractor, D-7 (i) in the
 * check function, the U / M hold at the model and its reading. Expected
 * readings come from r3 §2 and §8 RL-4 (the existing not-established
 * reason is kept for this family).
 * ------------------------------------------------------------------ */

test.describe('U24 RL-4 — M20 under uncertain history (D-6 (i), D-7 (i), the U / M hold)', () => {
  const SOUND = {
    first_sequence: 1,
    sequence_gap_count: 0,
    sequence_duplicate_count: 0,
    recovered_from_chunks: false,
  };
  const NOT_ESTABLISHED =
    'no current-load console evidence after a reload: feed console not opened in this page load and the absence of an earlier opening not established';
  const other = { event_type: 'proto_m21_case_presented' };
  const U_LINES = [
    'The earlier state of this feed console could not be verified.',
    'It stays closed after this reload.',
  ];
  const CHECK = {
    phase: 'closure',
    page_load_index: 2,
    prior_page_load_event_count: 40,
    prior_opening_found: false,
    prior_presentation_found: true,
    history_continuous: true,
    prior_opening_absence_established: true,
    input_mode: 'system',
  };
  const check = (
    flags: Record<string, unknown> = {},
    sequence = 5,
  ): Synthetic => ({
    suffix: 'prior_load_checked',
    metadata: { ...CHECK, ...flags },
    sequence,
  });
  const marker = (detail: string, sequence = 7): Synthetic => ({
    suffix: 'technical_failure',
    metadata: { detail, input_mode: 'system' },
    sequence,
  });
  const presented: Synthetic = {
    suffix: 'presented',
    metadata: { input_mode: 'system' },
    sequence: 51,
  };

  test('F-A (D-6 (i)): two agreeing check records with distinct sequence numbers establish nothing — U, refused, the not-established reading', () => {
    const checks = [check({}, 5), check({}, 6)];
    const cls = classifyReload({
      pageLoadIndex: 2,
      checks: checks.map((event) => event.metadata),
    });

    expect(cls.occasions.row).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'duplicate_checks',
    });
    expect(cls.check_coherent).toBe(true);
    expect(cls.exposure_record_consistent).toBe(false);

    const read = rowOf(
      toEvents([...checks, presented], { pageLoadIndex: 2 }),
      RELOADED,
    );

    expect(read).toMatchObject({
      value: null,
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    expect(read.components.nonresponse_kind).toBe('reload_no_current_evidence');
    expect(
      (read.components.reload_check as Comp).prior_opening_absence_established,
    ).toBe(false);
  });

  test('F-B (D-6 (i)): two conflicting check records ⇒ U, refused, coherence false; the not-established reading', () => {
    const checks = [
      check({}, 5),
      check(
        { history_continuous: false, prior_opening_absence_established: false },
        6,
      ),
    ];
    const cls = classifyReload({
      pageLoadIndex: 2,
      checks: checks.map((event) => event.metadata),
    });

    expect(cls.occasions.row).toMatchObject({
      class: 'U',
      administration_permitted: false,
    });
    expect(cls.check_coherent).toBe(false);
    expect(
      rowOf(toEvents([...checks, presented], { pageLoadIndex: 2 }), RELOADED),
    ).toMatchObject({
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
  });

  test('F-C (D-7 (i)): an earlier U / M hold-back of this family keeps the absence unestablished in a later load with a continuous history; an H marker, another family’s marker or no marker never does', () => {
    const priorU = [
      other,
      {
        event_type: `${M20_FAMILY}technical_failure`,
        metadata: { detail: M20_UNVERIFIED_DETAIL },
      },
    ];
    const priorM = [
      other,
      {
        event_type: `${M20_FAMILY}technical_failure`,
        metadata: { detail: M20_CONTRADICTORY_DETAIL },
      },
    ];
    const priorH = [
      other,
      {
        event_type: `${M20_FAMILY}technical_failure`,
        metadata: { detail: M20_RELOAD_DETAIL },
      },
    ];

    expect(m20PriorHoldBackCarried(priorU)).toBe(true);
    expect(m20PriorHoldBackCarried(priorM)).toBe(true);
    expect(m20PriorHoldBackCarried(priorH)).toBe(false);
    expect(m20PriorHoldBackCarried([other])).toBe(false);
    expect(
      m20PriorHoldBackCarried([
        {
          event_type: 'proto_m19_lines_technical_failure',
          metadata: { detail: M20_UNVERIFIED_DETAIL },
        },
      ]),
    ).toBe(false);

    const carried = m20PriorLoadCheck(3, priorU, SOUND);

    expect(carried).toMatchObject({
      page_load_index: 3,
      prior_opening_found: false,
      history_continuous: true,
      prior_opening_absence_established: false,
    });
    expect(
      m20PriorLoadCheck(3, priorM, SOUND).prior_opening_absence_established,
    ).toBe(false);
    expect(
      m20PriorLoadCheck(3, priorH, SOUND).prior_opening_absence_established,
    ).toBe(true);
    expect(
      classifyReload({ pageLoadIndex: 3, checks: [carried] }).occasions.row,
    ).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'absence_not_established',
    });
  });

  test('the U / M hold (direction c): the console is never administered — held with the class detail, the record shows exactly the §9 lines and LEAVE, CONTINUE is refused, nothing is written; the H hold keeps its text; permission per class', () => {
    for (const [detail, cls] of [
      [M20_UNVERIFIED_DETAIL, 'U'],
      [M20_CONTRADICTORY_DETAIL, 'M'],
    ] as const) {
      const r = run();

      expect(reloadHoldBackClass(detail)).toBe(cls);
      expect(m20sHoldBack(r.s, detail)).toBe(true);
      expect(r.s.status).toBe('held_back');
      expect(r.s.failure_detail).toBe(detail);
      expect(m20RecordLine(r.s)).toBe(U_LINES.join('\n'));
      expect(m20sContinue(r.s, 'keyboard', r.settle(), r.sink)).toBe(false);
      expect(r.events).toEqual([]);

      const model = m20SurfaceModel(hostOf(r));

      expect(model.elements).toHaveLength(2);
      expect(model.elements[0].id).toBe('closed');
      expect(model.elements[0].label).toBe(U_LINES.join('\n'));
      expect(model.elements[0].label).not.toContain(M20_TEXT.held_back);
    }

    const h = createM20Project();

    expect(m20sHoldBack(h)).toBe(true);
    expect(m20RecordLine(h)).toBe(M20_TEXT.held_back);
    expect([...M20_TEXT.held_unverified]).toEqual(U_LINES);

    for (const line of U_LINES) {
      expect(m20ParticipantStrings()).toContain(line);
    }

    expect(
      classifyReload({
        pageLoadIndex: 2,
        checks: [
          m20PriorLoadCheck(2, [other], { ...SOUND, sequence_gap_count: 1 }),
        ],
      }).occasions.row,
    ).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'history_discontinuous',
    });
    expect(
      classifyReload({
        pageLoadIndex: 2,
        checks: [m20PriorLoadCheck(2, [other], SOUND)],
      }).occasions.row,
    ).toMatchObject({ class: 'A', administration_permitted: true });
    expect(
      classifyReload({ pageLoadIndex: 1, checks: [] }).occasions.row,
    ).toMatchObject({ class: null, administration_permitted: true });
  });

  test('the extractor reads a U / M marker: interrupted with the existing not-established reason (r3 §8 RL-4), held_back_after_reload, nonresponse_kind reload_hold_back; the H reading and the first load are unchanged', () => {
    const u = rowOf(
      toEvents(
        [
          check({
            history_continuous: false,
            prior_opening_absence_established: false,
          }),
          marker(M20_UNVERIFIED_DETAIL),
          presented,
        ],
        { pageLoadIndex: 2 },
      ),
      RELOADED,
    );

    expect(u).toMatchObject({
      value: null,
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    expect(u.components.held_back_after_reload).toBe(true);
    expect(u.components.nonresponse_kind).toBe('reload_hold_back');
    expect(
      (u.components.reload_check as Comp).prior_opening_absence_established,
    ).toBe(false);

    const m = rowOf(
      toEvents(
        [
          check({
            history_continuous: false,
            prior_opening_absence_established: true,
          }),
          marker(M20_CONTRADICTORY_DETAIL),
          presented,
        ],
        { pageLoadIndex: 2 },
      ),
      RELOADED,
    );

    expect(m).toMatchObject({
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    expect(m.components.held_back_after_reload).toBe(true);

    const h = rowOf(
      toEvents(
        [
          check({
            prior_opening_found: true,
            prior_opening_absence_established: false,
          }),
          marker(M20_RELOAD_DETAIL),
          presented,
        ],
        { pageLoadIndex: 2 },
      ),
      RELOADED,
    );

    expect(h).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'feed console opened in an earlier page load; not re-run after the reload',
    });
    expect(h.components.held_back_after_reload).toBe(true);

    // No marker, no check (the host never ran): unchanged.
    expect(
      rowOf(toEvents([presented], { pageLoadIndex: 2 }), RELOADED),
    ).toMatchObject({
      disposition: 'interrupted',
      missing_reason: NOT_ESTABLISHED,
    });
    // A first load writes no check and keeps its readings.
    expect(rowOf(toEvents([presented]))).toMatchObject({
      disposition: 'pending',
    });
  });
});
