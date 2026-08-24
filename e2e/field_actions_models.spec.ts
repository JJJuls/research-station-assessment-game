/**
 * Field-actions foundation — pure module tests (no browser).
 *
 * Playwright test blocks that never touch `page` (repository convention
 * for domain-invariant tests): the signal model's exact boundary and
 * monotonicity guarantees, hidden-target resolution, the deterministic
 * dig-surface registry (once-only cells, item conservation), the finite
 * counterbalanced magnet deck (composition equivalence, depletion
 * finality), the three provisional opportunity adapters, and the static
 * event-family separation guarantees (pairwise-disjoint families, no
 * canonical/scoring contact).
 *
 * Imports deliberately avoid the src/fieldActions barrel: the barrel
 * re-exports Phaser-coupled controllers, and these tests run in Node.
 */

import { expect, test } from '@playwright/test';

import type { DigRecord } from '../src/fieldActions/digController';
import { DigSurfaceRegistry } from '../src/fieldActions/digSurfaceRegistry';
import type { FieldActionLogPayload } from '../src/fieldActions/fieldActionLog';
import {
  installFieldActionLogSink,
  resetFieldActionLogSink,
} from '../src/fieldActions/fieldActionLog';
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
import type { MagnetCycleRecord } from '../src/fieldActions/magnetWinchController';
import {
  closeM23FieldRecoveryWindow,
  m23FieldRecoveryState,
  m23FieldRecoverySummary,
  M23FR_EVENT_TYPES,
  M23FR_FORMS,
  markM23FieldRecoveryCompleted,
  noteM23FieldRecoveryDig,
  noteM23FieldRecoveryScan,
  openM23FieldRecoveryWindow,
  resetM23FieldRecoveryState,
} from '../src/fieldActions/opportunities/m23FieldRecovery';
import {
  closeM24MagnetUtilityWindow,
  m24MagnetUtilityState,
  m24MagnetUtilitySummary,
  M24MU_EVENT_TYPES,
  markM24MagnetUtilityDepletionAcknowledged,
  markM24MagnetUtilityDepletionShown,
  noteM24MagnetUtilityCycle,
  openM24MagnetUtilityWindow,
  resetM24MagnetUtilityState,
} from '../src/fieldActions/opportunities/m24MagnetUtility';
import {
  closeM26DepletedSearchWindow,
  m26DepletedSearchState,
  m26DepletedSearchSummary,
  M26DS_EVENT_TYPES,
  markM26DepletedSearchControlCompleted,
  markM26DepletedSearchFutilityAcknowledged,
  markM26DepletedSearchFutilityShown,
  noteM26DepletedSearchDig,
  noteM26DepletedSearchScan,
  openM26DepletedSearchWindow,
  resetM26DepletedSearchState,
} from '../src/fieldActions/opportunities/m26DepletedSearch';
import type { ScanRecord } from '../src/fieldActions/scanController';
import {
  categorizeSignal,
  compareSignalTrend,
  computeSignalStrength,
} from '../src/fieldActions/signalModel';
import { CANONICAL_EVENT_CONTEXT } from '../src/world/CanonicalEventContext';

const scanRecord = (overrides: Partial<ScanRecord> = {}): ScanRecord => ({
  context_id: 'm23_field_recovery',
  player_x: 500,
  player_y: 400,
  target_id: 'm23fr_target',
  form_id: 'form_a',
  zone_id: 'm23_plot',
  distance: 80,
  detection_radius: 160,
  strength: 50,
  category: 'moderate',
  trend: null,
  ...overrides,
});

const digRecord = (overrides: Partial<DigRecord> = {}): DigRecord => ({
  col: 15,
  row: 12,
  zone_id: 'm23_plot',
  outcome: 'empty',
  object_id: null,
  item_id: null,
  ...overrides,
});

const cycleRecord = (
  overrides: Partial<MagnetCycleRecord> = {},
): MagnetCycleRecord => ({
  completed: true,
  cancelled: false,
  hook_set: true,
  locked_in_band: true,
  lock_source: 'keyboard',
  outcome_tier: 'scrap',
  item_id: 'scrap_plate',
  item_delivery: 'inventory',
  pull_position: 1,
  deck_form: 'A',
  post_depletion: false,
  depleted_now: false,
  cycle_duration_ms: 1500,
  ...overrides,
});

test.describe('signal model', () => {
  test('exact boundaries, clamping and rounding', () => {
    expect(computeSignalStrength(0, 240)).toBe(100);
    expect(computeSignalStrength(240, 240)).toBe(0);
    expect(computeSignalStrength(300, 240)).toBe(0);
    expect(computeSignalStrength(120, 240)).toBe(50);
    // Defensive clamp: a (theoretical) negative distance reads as 0.
    expect(computeSignalStrength(-5, 240)).toBe(100);
    // Invalid radius is a programming error, loudly.
    expect(() => computeSignalStrength(10, 0)).toThrow();
  });

  test('monotonic non-increasing in distance', () => {
    let previous = Number.POSITIVE_INFINITY;

    for (let distance = 0; distance <= 320; distance += 4) {
      const strength = computeSignalStrength(distance, 240);

      expect(strength).toBeLessThanOrEqual(previous);
      expect(strength).toBeGreaterThanOrEqual(0);
      expect(strength).toBeLessThanOrEqual(100);
      previous = strength;
    }
  });

  test('equal distances produce equal strengths (determinism)', () => {
    for (const distance of [0, 37, 119.5, 200, 239]) {
      expect(computeSignalStrength(distance, 240)).toBe(
        computeSignalStrength(distance, 240),
      );
    }
  });

  test('category bands are exact', () => {
    expect(categorizeSignal(0)).toBe('none');
    expect(categorizeSignal(1)).toBe('faint');
    expect(categorizeSignal(33)).toBe('faint');
    expect(categorizeSignal(34)).toBe('moderate');
    expect(categorizeSignal(66)).toBe('moderate');
    expect(categorizeSignal(67)).toBe('strong');
    expect(categorizeSignal(100)).toBe('strong');
  });

  test('trend calculation: stronger / weaker / unchanged / no baseline', () => {
    expect(compareSignalTrend(null, 50)).toBeNull();
    expect(compareSignalTrend(40, 50)).toBe('stronger');
    expect(compareSignalTrend(60, 50)).toBe('weaker');
    expect(compareSignalTrend(50, 50)).toBe('unchanged');
  });

  test('forms are fixed and deterministic', () => {
    expect(M23FR_FORMS.form_a).toEqual({ col: 14, row: 12 });
    expect(M23FR_FORMS.form_b).toEqual({ col: 17, row: 14 });

    const multiset = (form: 'A' | 'B') =>
      MAGNET_DECK_FORMS[form]
        .map((outcome) => `${outcome.tier}:${outcome.item_id}`)
        .sort();

    // Same outcome multiset, different fixed orders — equivalent total
    // outcome opportunity per form.
    expect(multiset('A')).toEqual(multiset('B'));
    expect(MAGNET_DECK_FORMS.A.map((o) => o.tier).join(',')).not.toBe(
      MAGNET_DECK_FORMS.B.map((o) => o.tier).join(','),
    );
    expect(MAGNET_DECK_FORMS.A).toHaveLength(6);
  });
});

test.describe('field target registry', () => {
  test('resolves the strongest eligible reading deterministically', () => {
    const registry = new FieldTargetRegistry();

    registry.register({
      target_id: 'far_big',
      x: 0,
      y: 0,
      detection_radius: 400,
      form_id: 'fixed',
      zone_id: 'a',
      active: true,
      recovered: false,
    });
    registry.register({
      target_id: 'near_small',
      x: 300,
      y: 0,
      detection_radius: 100,
      form_id: 'fixed',
      zone_id: 'a',
      active: true,
      recovered: false,
    });

    // At (280, 0): far_big is 280/400 → 30; near_small is 20/100 → 80.
    const reading = registry.resolveReading(280, 0);

    expect(reading?.target.target_id).toBe('near_small');
    expect(reading?.strength).toBe(80);
  });

  test('inactive and recovered targets never signal; empty → null', () => {
    const registry = new FieldTargetRegistry();

    registry.register({
      target_id: 't1',
      x: 0,
      y: 0,
      detection_radius: 200,
      form_id: 'fixed',
      zone_id: 'a',
      active: false,
      recovered: false,
    });
    expect(registry.resolveReading(10, 0)).toBeNull();

    registry.setActive('t1', true);
    expect(registry.resolveReading(10, 0)?.target.target_id).toBe('t1');

    registry.markRecovered('t1');
    expect(registry.resolveReading(10, 0)).toBeNull();
  });

  test('equal distances to the same target give equal strengths', () => {
    const registry = new FieldTargetRegistry();

    registry.register({
      target_id: 't1',
      x: 100,
      y: 100,
      detection_radius: 240,
      form_id: 'fixed',
      zone_id: 'a',
      active: true,
      recovered: false,
    });

    const east = registry.resolveReading(180, 100);
    const north = registry.resolveReading(100, 20);

    expect(east?.strength).toBe(north?.strength);
  });
});

test.describe('dig surface registry', () => {
  const build = () => {
    const registry = new DigSurfaceRegistry();

    registry.registerZone({
      zone_id: 'open',
      minCol: 2,
      maxCol: 11,
      minRow: 10,
      maxRow: 15,
    });
    registry.registerZone({
      zone_id: 'gated',
      minCol: 14,
      maxCol: 19,
      minRow: 10,
      maxRow: 15,
      enabled: false,
    });
    registry.registerBuried({
      object_id: 'rock',
      item_id: 'core_sample',
      col: 4,
      row: 12,
      zone_id: 'open',
    });

    return registry;
  };

  test('cell resolution matches the 32px grid', () => {
    const registry = build();

    expect(registry.resolveCell(144, 400)).toEqual({ col: 4, row: 12 });
    expect(registry.resolveCell(159.9, 415.9)).toEqual({ col: 4, row: 12 });
    expect(registry.resolveCell(160, 416)).toEqual({ col: 5, row: 13 });
  });

  test('refusals: outside zones, disabled zones, already dug, blocked', () => {
    const registry = build();

    expect(registry.refusalReason(0, 0)).toBe('not_diggable');
    expect(registry.refusalReason(15, 12)).toBe('zone_inactive');
    expect(registry.dig(15, 12)).toEqual({
      result: 'refused',
      reason: 'zone_inactive',
    });

    registry.blockCell(3, 11);
    expect(registry.refusalReason(3, 11)).toBe('not_diggable');

    expect(registry.dig(2, 10).result).toBe('empty');
    expect(registry.refusalReason(2, 10)).toBe('already_dug');
    expect(registry.dig(2, 10)).toEqual({
      result: 'refused',
      reason: 'already_dug',
    });
  });

  test('buried objects come only from their exact cell; no duplication', () => {
    const registry = build();

    // Adjacent cell: empty, and the ground stays persistently dug.
    expect(registry.dig(5, 12).result).toBe('empty');
    expect(registry.stateOf(5, 12)).toBe('dug_empty');

    // The actual cell yields the object exactly once.
    const first = registry.dig(4, 12);

    expect(first.result).toBe('buried');

    if (first.result === 'buried') {
      expect(first.object.object_id).toBe('rock');
    }

    registry.markUnearthed('rock');
    expect(registry.stateOf(4, 12)).toBe('dug_recovered');
    expect(registry.dig(4, 12)).toEqual({
      result: 'refused',
      reason: 'already_dug',
    });
  });

  test('explicit zone reset never duplicates an unearthed object', () => {
    const registry = build();
    const first = registry.dig(4, 12);

    expect(first.result).toBe('buried');
    registry.markUnearthed('rock');

    registry.resetZone('open');
    expect(registry.stateOf(4, 12)).toBe('untouched');

    // Re-dig after reset: the object already left the ground → empty.
    expect(registry.dig(4, 12).result).toBe('empty');
  });

  test('zone enable gating flips diggability', () => {
    const registry = build();

    expect(registry.isDiggable(15, 12)).toBe(false);
    registry.setZoneEnabled('gated', true);
    expect(registry.isDiggable(15, 12)).toBe(true);
  });
});

test.describe('magnet deck', () => {
  test.beforeEach(() => resetMagnetDeck());

  test('deterministic order, depletion finality, post-depletion emptiness', () => {
    expect(ensureMagnetDeckForm('A')).toBe('A');
    // Counterbalance assignment is one-shot per session.
    expect(ensureMagnetDeckForm('B')).toBe('A');

    const tiers: string[] = [];

    for (let pull = 1; pull <= 6; pull++) {
      const result = drawMagnetPull();

      tiers.push(result.outcome.tier);
      expect(result.pull_position).toBe(pull);
      expect(result.post_depletion).toBe(false);
      expect(result.depleted_now).toBe(pull === 6);
    }

    expect(tiers).toEqual([
      'scrap',
      'empty',
      'material',
      'scrap',
      'rare',
      'empty',
    ]);
    expect(magnetDeckDepleted()).toBe(true);

    // No later pull may secretly produce a reward.
    for (let extra = 0; extra < 5; extra++) {
      const result = drawMagnetPull();

      expect(result.outcome.tier).toBe('empty');
      expect(result.outcome.item_id).toBeNull();
      expect(result.post_depletion).toBe(true);
    }

    expect(magnetDeckState.total_pulls).toBe(11);
  });
});

test.describe('event-family separation (static)', () => {
  const families: Record<string, readonly string[]> = {
    secondary: SECONDARY_FIELD_ACTION_EVENT_TYPES,
    m23: M23FR_EVENT_TYPES,
    m24: M24MU_EVENT_TYPES,
    m26: M26DS_EVENT_TYPES,
  };

  test('the four families are pairwise disjoint', () => {
    const names = Object.entries(families);

    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const overlap = names[i][1].filter((event) =>
          names[j][1].includes(event),
        );

        expect(overlap).toEqual([]);
      }
    }
  });

  test('every family member carries its own prefix', () => {
    for (const event of M23FR_EVENT_TYPES) {
      expect(event.startsWith('proto_m23_field_recovery_')).toBe(true);
    }

    for (const event of M24MU_EVENT_TYPES) {
      expect(event.startsWith('proto_m24_magnet_utility_')).toBe(true);
    }

    for (const event of M26DS_EVENT_TYPES) {
      expect(event.startsWith('proto_m26_depleted_search_')).toBe(true);
    }

    for (const event of SECONDARY_FIELD_ACTION_EVENT_TYPES) {
      expect(event.startsWith('secondary_field_action_')).toBe(true);
    }
  });

  test('no canonical event registry contact (ScoringManager-invisible)', () => {
    const prefixes = [
      'proto_m23_field_recovery',
      'proto_m24_magnet_utility',
      'proto_m26_depleted_search',
      'secondary_field_action',
      'proto_field_lab',
    ];

    for (const key of Object.keys(CANONICAL_EVENT_CONTEXT)) {
      for (const prefix of prefixes) {
        expect(key.startsWith(prefix)).toBe(false);
      }
    }
  });
});

test.describe('provisional opportunity adapters', () => {
  let emitted: FieldActionLogPayload[] = [];

  test.beforeEach(() => {
    resetM23FieldRecoveryState();
    resetM24MagnetUtilityState();
    resetM26DepletedSearchState();
    emitted = [];
    installFieldActionLogSink((payload) => emitted.push(payload));
  });

  test.afterEach(() => resetFieldActionLogSink());

  const emittedTypes = () => emitted.map((payload) => payload.event_type);

  test('M23: closed windows ignore actions; open windows capture raw process', () => {
    // Pre-open actions leave no trace (never invented values).
    noteM23FieldRecoveryScan(scanRecord(), 1000);
    noteM23FieldRecoveryDig(digRecord(), 1100);
    expect(m23FieldRecoveryState.scan_count).toBe(0);
    expect(m23FieldRecoveryState.dig_attempt_count).toBe(0);

    openM23FieldRecoveryWindow(2000, 'form_a');
    noteM23FieldRecoveryScan(scanRecord({ strength: 30 }), 3000);
    noteM23FieldRecoveryScan(scanRecord({ strength: 55 }), 4000);
    noteM23FieldRecoveryScan(
      scanRecord({ strength: 20, target_id: null }),
      5000,
    );
    noteM23FieldRecoveryDig(digRecord(), 6000);
    noteM23FieldRecoveryDig(
      digRecord({ col: 16, outcome: 'recovered', object_id: 'm23fr_object' }),
      7000,
    );
    markM23FieldRecoveryCompleted(7000);
    closeM23FieldRecoveryWindow(7100, 'reset');

    const summary = m23FieldRecoverySummary();

    expect(summary.scan_count).toBe(3);
    expect(summary.valid_scan_count).toBe(2);
    expect(summary.best_signal_strength).toBe(55);
    expect(summary.direction_improving_transitions).toBe(1);
    expect(summary.dig_attempt_count).toBe(2);
    expect(summary.unique_cells_excavated).toBe(2);
    expect(summary.completed).toBe(true);
    expect(summary.completion_time_ms).toBe(5000);
    expect(summary.exit_status).toBe('completed');
    expect(summary.active_time_ms).toBeGreaterThan(0);

    // Every emitted event belongs to the M23 family alone, and the
    // pre-open actions emitted nothing.
    const types = emittedTypes();

    expect(types.length).toBeGreaterThan(0);

    for (const type of types) {
      expect(M23FR_EVENT_TYPES.includes(type as never)).toBe(true);
    }

    expect(
      types.filter((t) => t === 'proto_m23_field_recovery_scan'),
    ).toHaveLength(3);
    expect(
      types.filter((t) => t === 'proto_m23_field_recovery_dig'),
    ).toHaveLength(2);
    expect(types).toContain('proto_m23_field_recovery_completed');
    expect(types).toContain('proto_m23_field_recovery_closed');

    // One-shot per session: a closed window never reopens.
    openM23FieldRecoveryWindow(9000, 'form_a');
    expect(m23FieldRecoveryState.window_open).toBe(false);
  });

  test('M24: pre/post-signal separation, ack gating, close-independence', () => {
    openM24MagnetUtilityWindow(1000, 'A');

    // Acknowledgement before display is refused (comprehension gate).
    markM24MagnetUtilityDepletionAcknowledged(1100);
    expect(m24MagnetUtilityState.depletion_signal_acknowledged).toBe(false);

    noteM24MagnetUtilityCycle(cycleRecord(), 2000);
    noteM24MagnetUtilityCycle(
      cycleRecord({ item_id: null, outcome_tier: 'empty' }),
      3000,
    );
    // A cancelled cycle is recorded but never counted as a pull.
    noteM24MagnetUtilityCycle(
      cycleRecord({ cancelled: true, hook_set: false, locked_in_band: false }),
      3500,
    );
    expect(m24MagnetUtilityState.cycle_count_pre_signal).toBe(2);

    markM24MagnetUtilityDepletionShown(4000);
    markM24MagnetUtilityDepletionAcknowledged(4500);
    expect(m24MagnetUtilityState.depletion_signal_acknowledged).toBe(true);

    noteM24MagnetUtilityCycle(
      cycleRecord({
        post_depletion: true,
        item_id: null,
        outcome_tier: 'empty',
      }),
      6000,
    );

    const summary = m24MagnetUtilitySummary();

    expect(summary.cycle_count_pre_signal).toBe(2);
    expect(summary.cycle_count_post_signal).toBe(1);
    expect(summary.useful_outcomes).toBe(1);
    expect(summary.empty_outcomes).toBe(2);
    expect(summary.time_post_signal_ms).toBe(2000);

    // Close is independent of the participant's stop/continue choice.
    closeM24MagnetUtilityWindow(7000, 'reset');
    expect(m24MagnetUtilityState.window_open).toBe(false);
    expect(m24MagnetUtilitySummary().exit_status).toBe('reset');

    // One-shot per session: a closed window never reopens.
    openM24MagnetUtilityWindow(8000, 'A');
    expect(m24MagnetUtilityState.window_open).toBe(false);

    // Every emitted event belongs to the M24 family alone (non-empty).
    expect(emittedTypes().length).toBeGreaterThan(0);

    for (const type of emittedTypes()) {
      expect(M24MU_EVENT_TYPES.includes(type as never)).toBe(true);
    }
  });

  test('M26: control and futile phases stay separable; pre-ack acts distinct', () => {
    openM26DepletedSearchWindow(1000);
    expect(m26DepletedSearchState.phase).toBe('control');

    noteM26DepletedSearchScan(scanRecord(), 2000, 'control');
    noteM26DepletedSearchDig(digRecord(), 3000, 'control');
    // Depleted-plot acts during the CONTROL phase count nowhere.
    noteM26DepletedSearchDig(digRecord(), 3100, 'depleted');
    expect(m26DepletedSearchState.control_scan_count).toBe(1);
    expect(m26DepletedSearchState.control_dig_count).toBe(1);
    expect(m26DepletedSearchState.post_futility_dig_count).toBe(0);

    markM26DepletedSearchControlCompleted(4000);
    expect(m26DepletedSearchState.phase).toBe('futile');

    // Futility ack refused before display; pre-ack acts counted apart.
    markM26DepletedSearchFutilityAcknowledged(4100);
    expect(m26DepletedSearchState.futility_signal_acknowledged).toBe(false);
    noteM26DepletedSearchDig(digRecord(), 4200, 'depleted');
    expect(m26DepletedSearchState.pre_ack_act_count).toBe(1);
    expect(m26DepletedSearchState.post_futility_dig_count).toBe(0);

    markM26DepletedSearchFutilityShown(5000);
    markM26DepletedSearchFutilityAcknowledged(5500);
    noteM26DepletedSearchScan(scanRecord({ strength: 0 }), 6000, 'depleted');
    noteM26DepletedSearchDig(digRecord(), 7000, 'depleted');
    // Control-plot acts after the control phase count nowhere.
    noteM26DepletedSearchScan(scanRecord(), 7500, 'control');

    const summary = m26DepletedSearchSummary();

    expect(summary.control_scan_count).toBe(1);
    expect(summary.control_dig_count).toBe(1);
    expect(summary.pre_ack_act_count).toBe(1);
    expect(summary.post_futility_scan_count).toBe(1);
    expect(summary.post_futility_dig_count).toBe(1);
    expect(summary.post_futility_active_time_ms).toBe(1000);

    closeM26DepletedSearchWindow(8000, 'scene_exit');
    expect(m26DepletedSearchState.phase).toBe('closed');

    // One-shot per session: a closed window never reopens.
    openM26DepletedSearchWindow(9000);
    expect(m26DepletedSearchState.phase).toBe('closed');

    // Control-phase and futile-phase events carry distinct names, and
    // every emitted event belongs to the M26 family alone.
    const types = emittedTypes();

    for (const type of types) {
      expect(M26DS_EVENT_TYPES.includes(type as never)).toBe(true);
    }

    expect(types).toContain('proto_m26_depleted_search_control_dig');
    expect(types).toContain('proto_m26_depleted_search_pre_ack_act');
    expect(types).toContain('proto_m26_depleted_search_search_dig');
    expect(types).toContain('proto_m26_depleted_search_search_scan');
  });
});
