/**
 * Exterior Recovery — pure domain tests (evidence-led pilot v2, Unit 4).
 *
 * Playwright test blocks that never touch `page` (repository convention):
 * the scanner signal model and the counterbalanced target forms, dig
 * cell/reach and item conservation, belt-full cache persistence, the M19
 * standardised schedule and its terminal outcomes, M20 start persistence
 * (no end event, no manufactured outcome), the deterministic finite deck,
 * post-depletion zero reward, the M26 knowledge/exposure gate, event-family
 * disjointness, missing/invalid/technical-failure semantics, and the
 * static no-score/no-canonical guarantee.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { DigSurfaceRegistry } from '../src/fieldActions/digSurfaceRegistry';
import { SECONDARY_FIELD_ACTION_EVENT_TYPES } from '../src/fieldActions/fieldActionTelemetry';
import { FieldTargetRegistry } from '../src/fieldActions/fieldTargetRegistry';
import {
  drawMagnetPull,
  ensureMagnetDeckForm,
  MAGNET_DECK_FORMS,
  magnetDeckDepleted,
  magnetDeckState,
  resetMagnetDeck,
} from '../src/fieldActions/magnetDeck';
import { M23FR_EVENT_TYPES } from '../src/fieldActions/opportunities/m23FieldRecovery';
import { M24MU_EVENT_TYPES } from '../src/fieldActions/opportunities/m24MagnetUtility';
import { M26DS_EVENT_TYPES } from '../src/fieldActions/opportunities/m26DepletedSearch';
import {
  categorizeSignal,
  computeSignalStrength,
} from '../src/fieldActions/signalModel';
import { EVIDENCE_LEDGER, ledgerEntry } from '../src/pilot/evidenceLedger';
import {
  createExteriorEpisode,
  EXTERIOR_FAMILIES,
  EXTERIOR_OBJECTIVES,
  EXTERIOR_SITE_ORDER,
  exteriorAddCache,
  exteriorCurrentSite,
  exteriorEventTypes,
  exteriorNoteDug,
  exteriorRemoveCache,
} from '../src/pilot/exterior/exteriorEpisodeModel';
import {
  createM19State,
  M19_FAMILY,
  M19_OPPORTUNITY_ID,
  M19_SCHEDULES,
  M19_WINDOW_ID,
  m19Close,
  m19Depart,
  m19Enter,
  m19Inspect,
  m19RawComponents,
  m19Thaw,
  m19Turn,
} from '../src/pilot/exterior/m19CouplingModel';
import {
  createM20State,
  M20_FAMILY,
  M20_OPPORTUNITY_ID,
  M20_RESUME_WINDOW_ID,
  M20_START_EVENT_SUFFIXES,
  M20_START_WINDOW_ID,
  m20Accept,
  m20CompleteStage,
  m20MissionLogText,
  m20NextStage,
  m20RecordInterruption,
  m20Snapshot,
} from '../src/pilot/exterior/m20AntennaModel';
import {
  createM23State,
  M23_DETECTION_RADIUS,
  M23_FAMILY,
  M23_OBJECT_ID,
  M23_OPPORTUNITY_ID,
  M23_PLOT,
  M23_TARGET_CELLS,
  M23_TARGET_ID,
  M23_WINDOW_ID,
  M23_ZONE_ID,
  m23Actionable,
  m23CellInsidePlot,
  m23Close,
  m23Enter,
  m23NoteDig,
  m23NoteScan,
  m23RawComponents,
} from '../src/pilot/exterior/m23ExcavationModel';
import {
  createM24State,
  M24_FAMILY,
  M24_OPPORTUNITY_ID,
  M24_WINDOW_ID,
  m24Acknowledge,
  m24Close,
  m24ClosureDisposition,
  m24Enter,
  m24KnowledgeState,
  m24NoteAlternative,
  m24NoteCycle,
  m24NoteDepletionShown,
  m24RawComponents,
} from '../src/pilot/exterior/m24MagnetRigModel';
import {
  createM26State,
  M26_FAMILY,
  M26_OPPORTUNITY_ID,
  M26_WINDOW_ID,
  m26Acknowledge,
  m26Close,
  m26ClosureDisposition,
  m26Demonstrate,
  m26DisconnectDue,
  m26Enter,
  m26Knowledge,
  m26RawComponents,
  m26Transmit,
  m26ViewEvidence,
} from '../src/pilot/exterior/m26ChannelModel';
const REPO = join(__dirname, '..');

/** M05's family (ledger); the window module itself is browser-only. */
const M05_FAMILY = ledgerEntry('M05').route.family_prefixes[0];

function pull(
  record: Partial<ReturnType<typeof drawMagnetPull>> & { item?: string | null },
) {
  const drawn = drawMagnetPull();

  return {
    cancelled: false,
    hook_set: true,
    locked_in_band: true,
    lock_source: 'keyboard',
    outcome_tier: drawn.outcome.tier,
    item_id: drawn.outcome.item_id,
    item_delivery:
      drawn.outcome.item_id === null ? null : ('inventory' as const),
    pull_position: drawn.pull_position,
    post_depletion: drawn.post_depletion,
    depleted_now: drawn.depleted_now,
    cycle_duration_ms: 4200,
    ...record,
  };
}

test.describe('exterior recovery — pure models (Unit 4)', () => {
  test.beforeEach(() => {
    resetMagnetDeck();
  });

  test('1. scanner signal is monotone, band-fixed and form-controlled; both target cells are deep in the plot', () => {
    let previous = 101;

    for (let distance = 0; distance <= 200; distance += 4) {
      const strength = computeSignalStrength(distance, M23_DETECTION_RADIUS);

      expect(strength).toBeLessThanOrEqual(previous);
      expect(strength).toBeGreaterThanOrEqual(0);
      previous = strength;
    }

    expect(computeSignalStrength(0, M23_DETECTION_RADIUS)).toBe(100);
    expect(
      computeSignalStrength(M23_DETECTION_RADIUS, M23_DETECTION_RADIUS),
    ).toBe(0);
    expect(categorizeSignal(0)).toBe('none');
    expect(categorizeSignal(17)).toBe('faint');
    expect(m23Actionable('faint')).toBe(false);
    expect(m23Actionable('moderate')).toBe(true);
    expect(m23Actionable('strong')).toBe(true);

    // Forms differ; both cells sit strictly inside the plot (never on an
    // edge cell, so the search is genuine for either form).
    expect(M23_TARGET_CELLS.form_a).not.toEqual(M23_TARGET_CELLS.form_b);

    for (const cell of Object.values(M23_TARGET_CELLS)) {
      expect(m23CellInsidePlot(cell.col, cell.row)).toBe(true);
      expect(cell.col).toBeGreaterThan(M23_PLOT.minCol);
      expect(cell.col).toBeLessThan(M23_PLOT.maxCol);
      expect(cell.row).toBeGreaterThan(M23_PLOT.minRow);
      expect(cell.row).toBeLessThan(M23_PLOT.maxRow);
    }

    // The registry resolves the same reading for the same position
    // (no randomness) and no reading at all beyond the radius.
    const targets = new FieldTargetRegistry();
    const cell = M23_TARGET_CELLS.form_a;

    targets.register({
      target_id: M23_TARGET_ID,
      x: cell.col * 32 + 16,
      y: cell.row * 32 + 16,
      detection_radius: M23_DETECTION_RADIUS,
      form_id: 'form_a',
      zone_id: M23_ZONE_ID,
      active: true,
      recovered: false,
    });
    expect(
      targets.resolveReading(cell.col * 32 + 16, cell.row * 32 + 16 + 40)
        ?.strength,
    ).toBe(
      targets.resolveReading(cell.col * 32 + 16, cell.row * 32 + 16 + 40)
        ?.strength,
    );
    expect(
      targets.resolveReading(cell.col * 32 + 16 + 200, cell.row * 32 + 16),
    ).toBeNull();

    // Scan classification: a comparable sweep from a new spot is an
    // informative move; an empty dig followed by a sweep is a strategy
    // shift; the first MODERATE/STRONG reading is the actionable signal.
    // World V2 rebuild: every sweep position below is the original spot
    // translated with the plot (+320, −160 px) — the plot's size and the
    // cells' relative geometry are unchanged, so every classification is.
    // World V3 open field: translated again with the plot (+224, +160 px).
    const scanState = createM23State('form_a');

    m23Enter(scanState, 0);

    const far = m23NoteScan(
      scanState,
      {
        player_x: 1244,
        player_y: 440,
        target_id: null,
        strength: 0,
        category: 'none',
        trend: null,
      },
      100,
    );

    expect(far).toMatchObject({
      on_plot: true,
      informative: false,
      first_actionable: false,
    });

    const faint = m23NoteScan(
      scanState,
      {
        player_x: 1072,
        player_y: 420,
        target_id: M23_TARGET_ID,
        strength: 17,
        category: 'faint',
        trend: null,
      },
      200,
    );

    expect(faint.first_actionable).toBe(false);

    const closer = m23NoteScan(
      scanState,
      {
        player_x: 1136,
        player_y: 360,
        target_id: M23_TARGET_ID,
        strength: 65,
        category: 'moderate',
        trend: 'stronger',
      },
      300,
    );

    expect(closer).toMatchObject({ informative: true, first_actionable: true });
    m23NoteDig(
      scanState,
      {
        col: 18,
        row: 10,
        zone_id: M23_ZONE_ID,
        outcome: 'empty',
        object_id: null,
      },
      400,
    );
    expect(
      m23NoteScan(
        scanState,
        {
          player_x: 1136,
          player_y: 330,
          target_id: M23_TARGET_ID,
          strength: 84,
          category: 'strong',
          trend: 'stronger',
        },
        500,
      ).strategy_shift,
    ).toBe(true);
    expect(m23RawComponents(scanState)).toMatchObject({
      informative_scan_moves: 2,
      signal_strength_changes: {
        stronger: 2,
        weaker: 0,
        unchanged: 0,
        sequence: [17, 65, 84],
      },
      exact_dig_attempts: 1,
      useful_strategy_shifts: 1,
      first_actionable_signal_ms: 300,
      recovery_complete: false,
    });
  });

  test('2. dig cell / reach and item conservation: one cell digs once, the object leaves the ground exactly once', () => {
    const registry = new DigSurfaceRegistry();
    const cell = M23_TARGET_CELLS.form_b;

    registry.registerZone({ zone_id: M23_ZONE_ID, ...M23_PLOT });
    registry.registerBuried({
      object_id: M23_OBJECT_ID,
      item_id: 'relay_coupling',
      col: cell.col,
      row: cell.row,
      zone_id: M23_ZONE_ID,
    });

    // Outside the plot: not diggable; inside: diggable once.
    expect(registry.refusalReason(M23_PLOT.minCol - 1, cell.row)).toBe(
      'not_diggable',
    );
    expect(registry.dig(cell.col + 1, cell.row).result).toBe('empty');
    expect(registry.dig(cell.col + 1, cell.row)).toEqual({
      result: 'refused',
      reason: 'already_dug',
    });

    // Only the exact cell yields the object; a second dig can never repeat it.
    const first = registry.dig(cell.col, cell.row);

    expect(first.result).toBe('buried');
    registry.markUnearthed(M23_OBJECT_ID);
    expect(registry.dig(cell.col, cell.row)).toEqual({
      result: 'refused',
      reason: 'already_dug',
    });
    registry.resetZone(M23_ZONE_ID);
    expect(registry.dig(cell.col, cell.row).result).toBe('empty');

    // The M23 model records recovery once, whatever the delivery.
    const state = createM23State('form_b');

    m23Enter(state, 1000);
    m23NoteDig(
      state,
      {
        col: cell.col + 1,
        row: cell.row,
        zone_id: M23_ZONE_ID,
        outcome: 'empty',
        object_id: null,
      },
      2000,
    );
    expect(
      m23NoteDig(
        state,
        {
          col: cell.col,
          row: cell.row,
          zone_id: M23_ZONE_ID,
          outcome: 'recovered',
          object_id: M23_OBJECT_ID,
        },
        3000,
      ),
    ).toEqual({ exact: true, recovered: true });
    expect(state.recovery_delivery).toBe('inventory');
    expect(m23RawComponents(state).exact_dig_attempts).toBe(2);
    expect(m23RawComponents(state).recovery_complete).toBe(true);
  });

  test('3. belt-full recovery persists as a field cache and is removed exactly once when collected', () => {
    const episode = createExteriorEpisode({ m23Form: 'form_a', deckForm: 'A' });
    const cell = M23_TARGET_CELLS.form_a;

    m23Enter(episode.m23, 0);
    m23NoteDig(
      episode.m23,
      {
        col: cell.col,
        row: cell.row,
        zone_id: M23_ZONE_ID,
        outcome: 'cached',
        object_id: M23_OBJECT_ID,
      },
      500,
    );
    expect(episode.m23.recovered).toBe(true);
    expect(episode.m23.recovery_delivery).toBe('cache');

    const cache = exteriorAddCache(episode, {
      item_id: 'relay_coupling',
      x: 592,
      y: 304,
      source: 'dig',
    });

    expect(episode.caches).toHaveLength(1);
    expect(exteriorRemoveCache(episode, 'relay_coupling', 592, 304)?.id).toBe(
      cache.id,
    );
    expect(episode.caches).toHaveLength(0);
    expect(exteriorRemoveCache(episode, 'relay_coupling', 592, 304)).toBeNull();

    exteriorNoteDug(episode, cell.col, cell.row);
    exteriorNoteDug(episode, cell.col, cell.row);
    expect(episode.dug_cells).toHaveLength(1);
  });

  test('4. M19 standardised schedule: identical onsets, rising thaw effort, ineffective turns while iced, attainable completion, distinct terminal outcomes', () => {
    const schedule = M19_SCHEDULES.standard_v1;
    const state = createM19State();

    expect(m19Enter(state, 10_000)).toBe(true);
    expect(() => m19Turn(createM19State(), 0)).toThrow();

    // Three turns → 30 % → first icing (difficulty onset, explained).
    let onset = null;

    for (let turn = 0; turn < 3; turn++) {
      onset = m19Turn(state, 11_000 + turn * 1000);
    }

    expect(onset?.bind_engaged).toBe(true);
    expect(onset?.difficulty_onset).toBe(true);
    expect(state.difficulty_onset_progress).toBe(schedule.bind_thresholds[0]);
    expect(state.difficulty_onset_ms).toBe(3000);

    // Turning while iced is ineffective and counted separately.
    const stuck = m19Turn(state, 14_000);

    expect(stuck.effective).toBe(false);
    expect(state.turns_ineffective).toBe(1);
    expect(state.progress).toBe(30);

    // One thaw pass frees the first icing; the shift is recorded.
    const thaw = m19Thaw(state, 15_000);

    expect(thaw).toEqual({
      useful: true,
      thaw_remaining: 0,
      freed: true,
      strategy_shift: true,
    });
    expect(state.reengagement_ms).toBe(5000);
    expect(m19Thaw(state, 15_500).useful).toBe(false);

    // Second icing at 60 needs two passes; third at 80 needs three.
    let ms = 16_000;

    const finish = () => {
      for (let guard = 0; guard < 60; guard++) {
        if (state.completed_ms !== null) {
          return;
        }

        if (state.bound) {
          m19Thaw(state, (ms += 1000));
        } else {
          m19Turn(state, (ms += 1000));
        }
      }
    };

    finish();
    expect(state.completed_ms).not.toBeNull();
    expect(state.progress).toBe(100);
    expect(state.binds).toBe(3);
    expect(state.thaw_useful).toBe(1 + 2 + 3);
    expect(state.turns_effective).toBe(10);

    const raw = m19RawComponents(state);

    expect(raw.completion).toBe(true);
    expect(raw.useful_attempts).toBe(16);
    expect(raw.stop_choice).toBeNull();
    expect(raw.postdifficulty_reengagement).toBe(true);
    expect(Object.keys(raw)).toEqual(
      expect.arrayContaining(ledgerEntry('M19').candidate_raw_variables),
    );

    // Terminal outcomes are distinct: explicit stop, shift end, review.
    for (const choice of [
      'step_away',
      'ended_shift_outside',
      'closed_at_review',
    ] as const) {
      const other = createM19State();

      m19Enter(other, 0);
      m19Turn(other, 1);
      m19Inspect(other);
      expect(m19Depart(other)).toBe(true);
      expect(m19Close(other, choice)).toBe(true);
      expect(m19RawComponents(other)).toMatchObject({
        completion: false,
        stop_choice: choice,
        progress: 10,
        inspections: 1,
        departures: 1,
      });
      expect(m19Close(other, choice)).toBe(false);
    }
  });

  test('5. M20 start persists: fixed stage order, interruption freezes pre-interruption progress, and NO end-of-task field is ever written', () => {
    const state = createM20State();

    expect(m20NextStage(state)).toBeNull();
    expect(m20CompleteStage(state, 'clear_base_clamp', 0)).toBe(false);
    expect(m20Accept(state, 100)).toBe(true);
    expect(m20Accept(state, 200)).toBe(false);
    expect(m20CompleteStage(state, 'seat_feed_line', 300)).toBe(false); // out of order
    expect(m20CompleteStage(state, 'clear_base_clamp', 300)).toBe(true);
    expect(m20MissionLogText(state)).toContain('1/2');
    expect(m20CompleteStage(state, 'seat_feed_line', 400)).toBe(true);
    expect(m20NextStage(state)).toBeNull();
    expect(m20MissionLogText(state)).toContain('alignment pending');

    const snapshot = m20Snapshot(state);

    expect(snapshot.outdoor_complete).toBe(true);
    expect(snapshot.returned).toBeNull();
    expect(snapshot.completion).toBeNull();
    expect(snapshot.resume_latency).toBeNull();
    expect(snapshot.useful_resume_actions).toBeNull();
    // Unit 5 implemented the resume phase; before the return every
    // end-of-task field is still null (never written by the start phase).
    expect(snapshot.resume_window_implemented).toBe(true);
    expect(snapshot.resume_presented).toBe(false);

    expect(m20RecordInterruption(state, 900)).toBe(true);
    expect(state.progress_pre_interruption).toBe(2);
    expect(m20RecordInterruption(state, 950)).toBe(false);

    // No start-window suffix ends, resumes or completes the TASK (a stage
    // completing outdoors is a start action, never the M20 outcome).
    for (const suffix of M20_START_EVENT_SUFFIXES) {
      expect([
        'completed',
        'window_closed',
        'resumed',
        'returned',
        'finished',
        'task_completed',
      ]).not.toContain(suffix);
      expect(suffix).not.toMatch(/resum|return|finish/);
    }

    expect(M20_START_WINDOW_ID).toBe('m20_antenna_start');
    expect(M20_RESUME_WINDOW_ID).toBe('m20_antenna_resume');
    expect(ledgerEntry('M20').route.windows.map((w) => w.id)).toEqual([
      M20_START_WINDOW_ID,
      M20_RESUME_WINDOW_ID,
    ]);

    // A partial start (accepted, one stage) also persists honestly.
    const partial = createM20State();

    m20Accept(partial, 0);
    m20CompleteStage(partial, 'clear_base_clamp', 1);
    m20RecordInterruption(partial, 2);
    expect(m20Snapshot(partial).progress_pre_interruption).toBe(1);
    expect(m20Snapshot(partial).outdoor_complete).toBe(false);
  });

  test('6. the finite deck is deterministic: both forms hold one multiset in fixed orders, six positions, no RNG', () => {
    const multiset = (form: 'A' | 'B') =>
      [...MAGNET_DECK_FORMS[form]].map((outcome) => outcome.tier).sort();

    expect(multiset('A')).toEqual(multiset('B'));
    expect(MAGNET_DECK_FORMS.A.map((o) => o.tier)).not.toEqual(
      MAGNET_DECK_FORMS.B.map((o) => o.tier),
    );
    expect(MAGNET_DECK_FORMS.A).toHaveLength(6);

    for (const form of ['A', 'B'] as const) {
      resetMagnetDeck();
      ensureMagnetDeckForm(form);

      const run1 = Array.from(
        { length: 6 },
        () => drawMagnetPull().outcome.tier,
      );

      resetMagnetDeck();
      ensureMagnetDeckForm(form);

      const run2 = Array.from(
        { length: 6 },
        () => drawMagnetPull().outcome.tier,
      );

      expect(run1).toEqual(run2);
      expect(run1).toEqual(MAGNET_DECK_FORMS[form].map((o) => o.tier));
    }
  });

  test('7. every committed M24 resolution advances exactly one position; cancelled cycles advance nothing', () => {
    ensureMagnetDeckForm('B');

    const state = createM24State('deck_form_B');

    expect(m24Enter(state, 0, magnetDeckState.position)).toBe(true);
    expect(() =>
      m24NoteCycle(
        createM24State('x'),
        {
          cancelled: false,
          hook_set: true,
          locked_in_band: true,
          lock_source: 'keyboard',
          outcome_tier: 'empty',
          item_id: null,
          item_delivery: null,
          pull_position: 1,
          post_depletion: false,
          depleted_now: false,
          cycle_duration_ms: 1,
        },
        0,
      ),
    ).toThrow();

    for (let position = 1; position <= 6; position++) {
      const note = m24NoteCycle(
        state,
        pull({ locked_in_band: position % 2 === 0 }),
        position * 1000,
      );

      expect(magnetDeckState.position).toBe(position);
      expect(note.committed).toBe(true);
      expect(note.post_depletion).toBe(false);
      expect(note.depletion_reached_now).toBe(position === 6);
    }

    // A cancelled cycle (ESC before the lock) consumes nothing.
    const before = magnetDeckState.position;

    m24NoteCycle(
      state,
      { ...pull({}), cancelled: true, hook_set: false, pull_position: null },
      7000,
    );
    expect(state.cycles_cancelled).toBe(1);
    expect(state.cycles_committed).toBe(6);
    expect(magnetDeckState.position).toBe(before); // the deck never advances past its last position
    expect(magnetDeckState.total_pulls).toBe(7); // the pull() helper drew once (post-depletion, empty)
    expect(magnetDeckDepleted()).toBe(true);
    expect(state.depletion_reached_at_cycle).toBe(6);
    expect(state.in_band_locks + state.out_of_band_locks).toBe(6);
    expect(state.useful_outcomes).toBe(4);
    expect(state.empty_outcomes_pre_depletion).toBe(2);
  });

  test('8. no reward after depletion: every later pull is empty by construction and is classified pre-/post-acknowledgement', () => {
    ensureMagnetDeckForm('A');

    const state = createM24State('deck_form_A');

    m24Enter(state, 0, 0);

    for (let i = 0; i < 6; i++) {
      m24NoteCycle(state, pull({}), i * 1000);
    }

    expect(magnetDeckDepleted()).toBe(true);
    expect(m24KnowledgeState(state)).toBe('depleted_unacknowledged');

    // Post-depletion pulls: always empty, always identical.
    for (let i = 0; i < 4; i++) {
      const record = pull({});

      expect(record.item_id).toBeNull();
      expect(record.post_depletion).toBe(true);
      expect(m24NoteCycle(state, record, 10_000 + i * 1000).post_ack).toBe(
        false,
      );
    }

    expect(state.postdepletion_casts_pre_ack).toBe(4);
    expect(m24Acknowledge(state, 20_000)).toBe(false); // never shown yet
    expect(m24NoteDepletionShown(state, 20_100)).toBe(true);
    expect(m24Acknowledge(state, 20_200)).toBe(true);
    expect(m24KnowledgeState(state)).toBe('depleted_acknowledged');

    for (let i = 0; i < 3; i++) {
      expect(m24NoteCycle(state, pull({}), 21_000 + i * 1000).post_ack).toBe(
        true,
      );
    }

    expect(m24NoteAlternative(state, 25_000)).toBe(true);

    const raw = m24RawComponents(state);

    expect(raw.depletion_reached).toBe(true);
    expect(raw.depletion_acknowledged).toBe(true);
    expect(raw.postdepletion_casts).toBe(7);
    expect(raw.postdepletion_casts_pre_ack).toBe(4);
    expect(raw.identical_postdepletion_cycles).toBe(3);
    expect(raw.alternative_opened).toBe(true);
    expect(Object.keys(raw)).toEqual(
      expect.arrayContaining(ledgerEntry('M24').candidate_raw_variables),
    );
    expect(m24Close(state, 'ended_shift_outside')).toBe(true);
    expect(m24ClosureDisposition(state)).toEqual({ kind: 'completed' });
  });

  test('9. M26 knowledge/exposure gate: pre-knowledge attempts are never post-knowledge, the first post-ack probe is excluded, Post B is the recorded alternative', () => {
    const state = createM26State();

    expect(() => m26Transmit(state, 'A', 0)).toThrow();
    m26Enter(state, 0);
    expect(m26Demonstrate(state, 10)).toBe(false); // no success yet
    expect(m26Acknowledge(state, 10)).toBe(false);

    const first = m26Transmit(state, 'A', 1000);

    expect(first).toMatchObject({
      channel: 'A',
      report: 'coupling_recovery',
      delivered: true,
      classification: 'delivered',
    });
    expect(m26DisconnectDue(state)).toBe(true);
    expect(m26Demonstrate(state, 2400)).toBe(true);
    expect(m26Demonstrate(state, 2500)).toBe(false);
    expect(m26Knowledge(state)).toBe('disconnected_unacknowledged');

    // Attempts before the acknowledgement are pre-knowledge, never continuation.
    expect(m26Transmit(state, 'A', 3000).classification).toBe('pre_knowledge');
    expect(m26Transmit(state, 'A', 3500).classification).toBe('pre_knowledge');
    expect(state.postknowledge_transmissions).toBe(0);

    expect(m26ViewEvidence(state, 4000, 'line_status_panel')).toBe(true);
    expect(m26Acknowledge(state, 4100)).toBe(true);
    expect(m26Transmit(state, 'A', 5000).classification).toBe(
      'confirmation_probe',
    );
    expect(m26Transmit(state, 'A', 5500).classification).toBe('postknowledge');
    expect(m26Transmit(state, 'A', 6000).classification).toBe('postknowledge');

    const alternative = m26Transmit(state, 'B', 7000);

    expect(alternative).toMatchObject({
      channel: 'B',
      report: 'salvage_tally',
      delivered: true,
    });
    expect(state.alternative_used_ms).toBe(7000);

    const raw = m26RawComponents(state);

    expect(raw).toMatchObject({
      disconnect_acknowledged: true,
      confirmation_probe_excluded: true,
      postknowledge_transmissions: 2,
      alternative_used: true,
      pre_knowledge_attempts: 2,
      all_reports_delivered: true,
    });
    expect(Object.keys(raw)).toEqual(
      expect.arrayContaining(ledgerEntry('M26').candidate_raw_variables),
    );
    expect(m26Close(state, 'ended_shift_outside')).toBe(true);
    expect(m26ClosureDisposition(state)).toEqual({ kind: 'completed' });
  });

  test('10. M24 and M26 (and every Unit 4 family) are pairwise disjoint from each other, from M05, from the secondary family and from the foundation adapters', () => {
    const families = exteriorEventTypes();
    const all: [string, string[]][] = [
      ...Object.entries(families),
      [
        'M05',
        [
          `${M05_FAMILY}opportunity_opened`,
          `${M05_FAMILY}initiated`,
          `${M05_FAMILY}window_closed`,
        ],
      ],
      ['secondary', [...SECONDARY_FIELD_ACTION_EVENT_TYPES]],
      ['foundation_m26', [...M26DS_EVENT_TYPES]],
    ];

    // The developer-lab foundation adapters for M23/M24 share the LEDGER
    // prefixes by design (the ledger families were derived from them);
    // they are reachable only from a developer scene (contaminated
    // session) and never on the participant route. Recorded as an open
    // naming decision; asserted here so the overlap is explicit.
    expect(M23FR_EVENT_TYPES.every((t) => t.startsWith(M23_FAMILY))).toBe(true);
    expect(M24MU_EVENT_TYPES.every((t) => t.startsWith(M24_FAMILY))).toBe(true);

    for (const [nameA, typesA] of all) {
      for (const [nameB, typesB] of all) {
        if (nameA === nameB) {
          continue;
        }

        for (const type of typesA) {
          expect(typesB, `${nameA} ↔ ${nameB} share ${type}`).not.toContain(
            type,
          );
        }
      }
    }

    // M24 and M26 never share a prefix, an object or a raw attempt family.
    expect(M24_FAMILY.startsWith(M26_FAMILY)).toBe(false);
    expect(M26_FAMILY.startsWith(M24_FAMILY)).toBe(false);
    expect(families.M24.some((t) => t.includes('transmission'))).toBe(false);
    expect(families.M26.some((t) => t.includes('cycle'))).toBe(false);

    // Every prefix equals the frozen ledger's family prefix.
    for (const [item, family] of Object.entries(EXTERIOR_FAMILIES)) {
      expect(ledgerEntry(item as 'M19').route.family_prefixes).toEqual([
        family,
      ]);
    }

    // The foundation M26 family (depleted search) is NOT the ledger family.
    expect(ledgerEntry('M26').route.family_prefixes[0]).toBe(M26_FAMILY);
    expect(M26DS_EVENT_TYPES.some((t) => t.startsWith(M26_FAMILY))).toBe(false);
  });

  test('11. missing, invalid and technical failure stay distinct and never become a low value', () => {
    // M24: never depleted → missing; depleted but never shown → invalid;
    // shown but not acknowledged → invalid; shown + acknowledged → complete.
    ensureMagnetDeckForm('A');

    const never = createM24State('deck_form_A');

    m24Enter(never, 0, 0);
    m24NoteCycle(never, pull({}), 1);
    expect(m24ClosureDisposition(never)).toEqual({
      kind: 'missing',
      detail: 'deck_never_depleted',
    });

    for (let i = 0; i < 5; i++) {
      m24NoteCycle(never, pull({}), 2 + i);
    }

    expect(m24ClosureDisposition(never)).toEqual({
      kind: 'invalid',
      detail: 'depletion_statement_never_displayed',
    });
    m24NoteDepletionShown(never, 10);
    expect(m24ClosureDisposition(never)).toEqual({
      kind: 'invalid',
      detail: 'depletion_not_acknowledged',
    });
    m24Acknowledge(never, 11);
    expect(m24ClosureDisposition(never)).toEqual({ kind: 'completed' });

    // M26: no successful transmission → missing; disconnect without ack → invalid.
    const channel = createM26State();

    m26Enter(channel, 0);
    expect(m26ClosureDisposition(channel)).toEqual({
      kind: 'missing',
      detail: 'channel_never_disconnected',
    });
    m26Transmit(channel, 'B', 1);
    m26Demonstrate(channel, 2);
    expect(m26ClosureDisposition(channel)).toEqual({
      kind: 'invalid',
      detail: 'disconnect_not_acknowledged',
    });
    expect(channel.first_success_channel).toBe('B');

    // M23: a stop before recovery is a distinct terminal (never recovery=false as "low").
    const dig = createM23State('form_a');

    m23Enter(dig, 0);
    expect(m23Close(dig, 'stopped')).toBe(true);
    expect(m23RawComponents(dig)).toMatchObject({
      recovery_complete: false,
      stop_choice: 'stopped',
    });
    expect(m23Close(dig, 'stopped')).toBe(false);

    // The episode's guided site order never depends on an outcome: a
    // stopped coupling is terminal for the beacon exactly like a completed one.
    const episode = createExteriorEpisode({ m23Form: 'form_b', deckForm: 'B' });

    expect(exteriorCurrentSite(episode)).toBe('coupling');
    m19Enter(episode.m19, 0);
    m19Close(episode.m19, 'step_away');
    expect(exteriorCurrentSite(episode)).toBe('mast');
    // Station 080 M08 (U2-R): the support console is the sixth listed job,
    // between the rig and the uplink posts; guidance for it is released by
    // the scene when the console opens (the pure model never says done).
    expect(EXTERIOR_SITE_ORDER).toEqual([
      'coupling',
      'mast',
      'excavation',
      'rig',
      'console',
      'uplink',
    ]);

    for (const line of Object.values(EXTERIOR_OBJECTIVES)) {
      expect(line).not.toMatch(
        /proto_|\bM\d{2}\b|persist|score|keep going|give up/i,
      );
    }
  });

  test('12. no score, no canonical event, no questionnaire wording: static contact check', () => {
    const unitFiles = [
      'src/pilot/exterior/exteriorEpisodeModel.ts',
      'src/pilot/exterior/m19CouplingModel.ts',
      'src/pilot/exterior/m20AntennaModel.ts',
      'src/pilot/exterior/m23ExcavationModel.ts',
      'src/pilot/exterior/m24MagnetRigModel.ts',
      'src/pilot/exterior/m26ChannelModel.ts',
      'src/pilot/windows/exteriorWindows.ts',
      'src/scenes/ExteriorRecoveryYardScene.ts',
    ];

    for (const file of unitFiles) {
      const source = readFileSync(join(REPO, file), 'utf8');

      expect(source, file).not.toMatch(
        /ScoringManager|CANONICAL_EVENT_CONTEXT|computeSummary|score_delta|trait_(score|label|value)/,
      );
      expect(source, file).not.toMatch(
        /persistence score|item_score|cut ?score|weight:|\bscore\s*[:=]/i,
      );
      // Exact source wording of the five items (ledger JSON, internal only).
      expect(source, file).not.toMatch(
        /going gets tough|stick at a task|difficulty getting started/i,
      );
    }

    const families = Object.values(EXTERIOR_FAMILIES);

    for (const file of [
      'src/world/CanonicalEventContext.ts',
      'src/systems/ScoringManager.ts',
      'src/systems/EventLogger.ts',
      'src/systems/SessionState.ts',
      'src/systems/QualtricsBridge.ts',
      'docs/research/event-schema.md',
      'docs/research/scoring-plan.md',
    ]) {
      const source = readFileSync(join(REPO, file), 'utf8');

      for (const family of families) {
        expect(source, `${file} mentions ${family}`).not.toContain(family);
      }
    }

    // Identifiers equal the frozen ledger exactly.
    expect([
      M19_OPPORTUNITY_ID,
      M20_OPPORTUNITY_ID,
      M23_OPPORTUNITY_ID,
      M24_OPPORTUNITY_ID,
      M26_OPPORTUNITY_ID,
    ]).toEqual(
      ['M19', 'M20', 'M23', 'M24', 'M26'].map(
        (item) => ledgerEntry(item as 'M19').route.opportunity_ids[0],
      ),
    );
    expect([
      M19_WINDOW_ID,
      M23_WINDOW_ID,
      M24_WINDOW_ID,
      M26_WINDOW_ID,
    ]).toEqual(
      ['M19', 'M23', 'M24', 'M26'].map(
        (item) => ledgerEntry(item as 'M19').route.windows[0].id,
      ),
    );
    expect([
      M19_FAMILY,
      M20_FAMILY,
      M23_FAMILY,
      M24_FAMILY,
      M26_FAMILY,
    ]).toEqual(
      ['M19', 'M20', 'M23', 'M24', 'M26'].map(
        (item) => ledgerEntry(item as 'M19').route.family_prefixes[0],
      ),
    );
    expect(
      EVIDENCE_LEDGER.filter((e) =>
        e.route.windows.some((w) => w.episode === 4),
      ).map((e) => e.id),
    ).toEqual(['M05', 'M19', 'M20', 'M23', 'M24', 'M26']);
  });
});
