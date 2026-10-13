/**
 * Pilot route — Exterior Recovery episode (evidence-led pilot v2, Unit 4).
 *
 * Real participant navigation from the Dock (no developer boots):
 *
 * 1. The complete recovery operation: M05 occasion 2 presented
 *    independently and initiated; M19 worked to completion through
 *    icing/thaw cycles; M20 accepted and both outdoor stages started
 *    (start window stays open); M23 with real scanner feedback
 *    (none / faint / actionable), an empty dig and the exact-cell
 *    recovery; M24 finite deck to explicit depletion, a pre-knowledge
 *    cast, acknowledgement, an identical post-knowledge cast and the
 *    alternative; M26 first ACK, the scripted disconnect, pre-knowledge
 *    attempt, acknowledgement, excluded confirmation probe, post-knowledge
 *    attempt and the backup post; Noor's shift end; item-owned timing.
 * 2. Stops, departures and persistence: explicit stops are complete
 *    observations; leaving the yard pauses open windows (departed, never
 *    terminal) and re-entry restores the coupling, mast, deck and uplink
 *    state; unacknowledged depletion / disconnect close INVALID (never
 *    low); the M20 obligation survives the return inside.
 * 3. Belt-full recovery is lossless (crate spares → cache → collect),
 *    the inventory / map overlays freeze and resume the world, F outside
 *    the pad and a held E never double-act.
 *
 * All checks read DEV probes and the research event buffer; input is real
 * keyboard traffic. Retries 0, workers 1.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  acceptMast,
  answerOpenCheck,
  answerRigCheck,
  answerUplinkCheck,
  APPROACH,
  beginExcavation,
  captureErrors,
  continueUplinkExplanation,
  depleteDeck,
  digFacing,
  doMastStage,
  enterYard,
  eventsByPrefix,
  eventsByType,
  expectNoRuntimeErrors,
  exteriorProbe,
  faceCell,
  faProbe,
  finishAtRig,
  finishOutside,
  itemStatus,
  lastFeedback,
  leaveYard,
  magnetCycle,
  openSite,
  OPPORTUNITY,
  powerUpUplink,
  reenterYard,
  scanAt,
  standOnPad,
  startAntenna,
  startSalvageTally,
  stopExcavation,
  transmitAt,
  useSortingBench,
  validityRecord,
  waitContinuationClosed,
  waitDisconnect,
  YARD,
} from './exteriorHelpers';
import {
  frameProbe,
  getDriverStats,
  getEvents,
  hold,
  press,
  resetDriverStats,
  selectPromptOption,
} from './helpers';
import {
  interactAt,
  labApproach,
  PILOT,
  pilotProbe,
  useDoor,
  walkTo,
  yardVia,
} from './pilotHelpers';
import { surface, waitSurface } from './returnHelpers';

/** M19 (Unit 21): the coupling panel's new identity. */
const M19_OPPORTUNITY = 'proto_m19_lines_series';
const PANEL_SETTLE_MS = 450;

/** Walks to the coupling's audited approach and opens the panel (SPACE at the station). */
async function openCouplingPanel(page: Page) {
  await yardVia(
    page,
    YARD.coupling.x + APPROACH.coupling.x,
    YARD.coupling.y + APPROACH.coupling.y,
  );
  await interactAt(page, YARD.coupling, { approachOffset: APPROACH.coupling });
  await waitSurface(page, true, 'm19_coupling_panel');
}

/** ESC on the panel after its view settled (the same path as LEAVE). */
async function leaveCouplingPanel(page: Page) {
  await page.waitForTimeout(PANEL_SETTLE_MS);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/**
 * Keyboard input on the panel: a hotkey, ENTER, or `Tab-<id>` (TAB to the
 * element, then ENTER) — each after the current view settled.
 */
async function panelKeys(page: Page, keys: string[]) {
  for (const key of keys) {
    await page.waitForTimeout(PANEL_SETTLE_MS);

    if (key.startsWith('Tab-')) {
      const id = key.slice(4);

      for (
        let step = 0;
        step < 20 && (await surface(page))?.focus !== id;
        step += 1
      ) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(60);
      }

      expect((await surface(page))?.focus, `TAB reaches ${id}`).toBe(id);
      await page.keyboard.press('Enter');
    } else {
      await page.keyboard.press(key);
    }

    await page.waitForTimeout(150);
  }
}

/**
 * Works the panel to completion by real keyboard input: the check right
 * first; line 1 H1, H2, H3, TRY (its obstacle), FEED, H2 off, TRY
 * (restored); line 2 dial 4 TRY, dial 5 TRY (its obstacle), SET ASIDE
 * confirmed; FINISH.
 */
async function workCouplingPanel(page: Page) {
  await openCouplingPanel(page);
  await panelKeys(page, [
    'Tab-continue',
    '2',
    'r',
    'Tab-start',
    '1',
    '2',
    '3',
    't',
    '4',
    '2',
    't',
    'Tab-next',
    '2',
    '2',
    '2',
    't',
    '2',
    't',
    'n',
    'Enter',
    'Tab-finish',
  ]);
  await waitSurface(page, false);
}

/** The page's own M19 feature row (the runtime's export builder). */
async function m19Row(page: Page): Promise<Record<string, unknown> | null> {
  const json = await page.evaluate(`(async () => {
    const mod = await import('/src/systems/index.ts');
    const payload = mod.researchRuntime.buildExportPayload();

    return JSON.stringify(
      (payload.measurement_features ?? []).find((row) => row.item_id === 'M19') ?? null,
    );
  })()`);

  return JSON.parse(json as string);
}

test.describe('pilot route — Exterior Recovery (Unit 4)', () => {
  test('1. the complete recovery operation: six item windows, one route, honest closures, item-owned timing', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);
    const startedAt = Date.now();
    // Timing marks (V3 verification): wall time per phase, driver ledger
    // deltas and the DEV frame probe — read-only, nothing behavioural.
    let lastMark = startedAt;
    let lastStats = getDriverStats();
    const mark = async (label: string) => {
      const now = Date.now();
      const stats = getDriverStats();
      const frames = await frameProbe(page);

      // eslint-disable-next-line no-console
      console.log(
        `[yard-timing] ${label}: +${((now - lastMark) / 1000).toFixed(1)} s (wall ${((now - startedAt) / 1000).toFixed(1)} s) · driver hold ${((stats.holdMs - lastStats.holdMs) / 1000).toFixed(1)} s settle ${((stats.settleMs - lastStats.settleMs) / 1000).toFixed(1)} s legs ${stats.legs - lastStats.legs} bursts ${stats.bursts - lastStats.bursts} no-motion ${stats.noMotionBursts - lastStats.noMotionBursts} stalls ${stats.stallAborts - lastStats.stallAborts} · frames ${frames === null ? 'n/a' : `${frames.fps.toFixed(1)} fps avg ${frames.avgMs.toFixed(0)} ms max ${frames.maxMs.toFixed(0)} ms long ${frames.longFrames}/${frames.frames}`}`,
      );
      lastMark = now;
      lastStats = stats;
    };

    resetDriverStats();
    await enterYard(page, 'ops');
    await mark('route to the yard');

    // ——— Guidance: one objective line, the beacon on the first site. ———
    let probe = await pilotProbe(page);

    expect(probe?.objective).toContain('coupling');
    expect(probe?.beacon?.label).toBe('Frozen Coolant Coupling');
    expect(probe?.objective).not.toMatch(/proto_|\bM\d{2}\b|persist/i);

    // ——— M05 occasion 2 (Unit 6): Noor's extra flag job was offered right
    // after "Ready" and declined by the spine (labToYardBriefed) — a
    // completed observation outside the set, independent of occasion 1
    // (declined at Vale's handover by the same spine). The accept / start
    // / defer / cap paths are exercised by e2e/m05_start_route.spec.ts. ———
    const o1 = await validityRecord(page, 'proto_m05_start_o1');

    expect(o1.completed).toBe(true); // declined: complete, outside the set

    let ext = await exteriorProbe(page);

    expect(ext.m05.offered).toBe(true);
    expect(ext.m05.accepted).toBe(false);
    expect(ext.m05.started).toBe(false);

    const o2Answered = (
      await eventsByType(page, 'proto_m05_start_offer_answered')
    ).find((e) => e.metadata?.occasion === 'o2');

    expect(o2Answered?.metadata).toMatchObject({
      accepted: false,
      option_position: 2,
      window_id: 'm05_start_o2',
    });

    const o2 = await validityRecord(page, OPPORTUNITY.m05o2);

    expect(o2.completed).toBe(true);
    expect(o2.validity).toBe('valid');

    const o2Closed = (
      await eventsByType(page, 'proto_m05_start_window_closed')
    ).find((e) => e.metadata?.occasion === 'o2');
    const o2Raw = o2Closed?.metadata?.raw_components as Record<string, unknown>;

    expect(o2Raw.occasion).toBe('o2');
    expect(o2Raw.accepted).toBe(false);
    expect(o2Raw.status).toBeNull();
    expect(o2Raw.latency_focused_ms).toBeNull();
    expect(o2Raw.closure_reason).toBe('declined');
    expect(JSON.stringify(o2Raw)).not.toMatch(/aggregate|score|o1/);
    await mark('M05 flag job declined');

    // ——— M19 (Unit 21): the coupling panel worked to completion by real
    // keyboard input — the check right first, line 1 to its obstacle then
    // restored, line 2 to its obstacle then set aside. ———
    await workCouplingPanel(page);
    await mark('M19 coupling panel');
    ext = await exteriorProbe(page);
    expect(ext.m19_panel.window).toBe('closed');
    expect(ext.m19_panel.exit).toBe('completed');
    expect(ext.m19_panel.line_in_work).toBeNull();
    expect(await itemStatus(page, 'M19')).toBe('completed');
    expect((await validityRecord(page, M19_OPPORTUNITY)).completed).toBe(true);

    const m19Events = await eventsByPrefix(page, 'proto_m19_lines_');
    const m19Types = new Set(m19Events.map((e) => e.event_type));

    for (const required of [
      'proto_m19_lines_presented',
      'proto_m19_lines_opportunity_opened',
      'proto_m19_lines_check_recorded',
      'proto_m19_lines_line_presented',
      'proto_m19_lines_attempt',
      'proto_m19_lines_difficulty_boundary',
      'proto_m19_lines_line_finished',
      'proto_m19_lines_series_completed',
      'proto_m19_lines_window_closed',
    ]) {
      expect(m19Types, required).toContain(required);
    }

    for (const event of m19Events) {
      expect(event.metadata?.measure_id).toBe('M19');
      expect(event.metadata?.opportunity_id).toBe(M19_OPPORTUNITY);
      expect(event.metadata?.window_id).toBe('m19_lines_w1');
      expect(event.metadata?.entry_state_version).toBe('m19-lines-v2');
      expect(['keyboard', 'pointer', 'system']).toContain(
        event.metadata?.input_mode,
      );
    }

    const m19Closed = (
      await eventsByType(page, 'proto_m19_lines_window_closed')
    )[0];

    expect(m19Closed.metadata?.validity_status).toBe('valid');
    expect(m19Closed.metadata?.exit_state).toBe('completed');
    expect(
      (await eventsByType(page, 'proto_m19_lines_difficulty_boundary')).length,
    ).toBe(2);
    expect(await m19Row(page)).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
    });
    // The retired v2 coupling family is never written on the route.
    expect((await eventsByPrefix(page, 'proto_m19_valve_')).length).toBe(0);
    probe = await pilotProbe(page);
    expect(probe?.beacon?.label).toBe('Mast 04');
    expect(probe?.objective).toContain('Mast 04');

    // ——— M20: accept + both outdoor stages; the start window stays open. ———
    await startAntenna(page);
    await mark('M20 mast stages');
    ext = await exteriorProbe(page);
    expect(ext.m20.accepted).toBe(true);
    expect(ext.m20.stages_done).toEqual(['clear_base_clamp', 'seat_feed_line']);
    expect(ext.m20.outdoor_complete).toBe(true);
    expect(ext.m20.window).toBe('open');
    expect(ext.m20.completion).toBeNull();
    expect(ext.m20.returned).toBeNull();
    expect(await itemStatus(page, 'M20')).toBe('open');
    expect(
      (await eventsByType(page, 'proto_m20_antenna_stage_completed')).length,
    ).toBe(2);
    expect(
      await eventsByType(page, 'proto_m20_antenna_window_closed'),
    ).toHaveLength(0);
    // The task itself never ends here: no closure, no resume, no return.
    for (const event of await eventsByPrefix(page, 'proto_m20_antenna_')) {
      expect(event.event_type).not.toMatch(
        /window_closed|resum|return|task_complet/,
      );
    }
    probe = await pilotProbe(page);
    expect(probe?.mission_log.map((entry) => entry.text).join(' ')).toContain(
      'Mast 04',
    );
    expect(probe?.mission_log.map((entry) => entry.text).join(' ')).not.toMatch(
      /proto_|\bM\d{2}\b/,
    );
    expect(probe?.beacon?.label).toBe('Excavation Field Stake');

    // ——— M23: real scanner feedback, an empty dig, the exact cell. ———
    ext = await exteriorProbe(page);

    const form = ext.m23_form;
    const spots = YARD.scanSpots[form];
    const cell = YARD.targetCells[form];

    await beginExcavation(page);
    expect((await faProbe(page)).scan.context).toBe('m23_excavation');

    const none = await scanAt(page, spots.none);

    expect(none.category).toBe('none');
    expect(none.target_id).toBeNull();

    const faint = await scanAt(page, spots.faint);

    expect(faint.category).toBe('faint');
    expect(faint.strength).toBeGreaterThan(0);
    expect(faint.strength).toBeLessThanOrEqual(33);

    const actionable = await scanAt(page, spots.actionable);

    expect(['moderate', 'strong']).toContain(actionable.category);
    expect(actionable.trend).toBe('stronger');

    // An empty dig on the neighbouring cell, then the exact cell.
    await faceCell(page, cell.x + 32, cell.y);
    await digFacing(page, 'empty');
    ext = await exteriorProbe(page);
    expect(ext.m23.exact_dig_attempts).toBe(1);
    expect(ext.m23.recovery_complete).toBe(false);
    await faceCell(page, cell.x, cell.y);
    await digFacing(page, 'recovered');
    ext = await exteriorProbe(page);
    expect(ext.m23.recovery_complete).toBe(true);
    expect(ext.m23.recovery_delivery).toBe('inventory');
    expect(ext.m23.exact_dig_attempts).toBe(2);
    expect(ext.m23.on_signal_scans).toBe(2);
    expect(ext.m23.first_actionable_signal_ms).not.toBeNull();
    expect(ext.m23.window).toBe('closed');
    expect(await itemStatus(page, 'M23')).toBe('completed');
    expect(await lastFeedback(page)).toContain('Metal Recovery Yard');
    await mark('M23 excavation');

    const m23Closed = (
      await eventsByType(page, 'proto_m23_field_recovery_window_closed')
    )[0];
    const m23Raw = m23Closed.metadata?.raw_components as Record<
      string,
      unknown
    >;

    expect(Object.keys(m23Raw)).toEqual(
      expect.arrayContaining([
        'informative_scan_moves',
        'signal_strength_changes',
        'exact_dig_attempts',
        'useful_strategy_shifts',
        'recovery_complete',
      ]),
    );
    expect(m23Closed.metadata?.form).toBe(form);
    expect(JSON.stringify(m23Raw)).not.toMatch(/target_x|target_y|"x":|"y":/); // no coordinates
    expect(
      (await eventsByType(page, 'proto_m23_field_recovery_scan')).length,
    ).toBe(3);
    expect(
      (await eventsByType(page, 'proto_m23_field_recovery_dig')).length,
    ).toBe(2);
    expect(
      (await eventsByType(page, 'proto_m23_field_recovery_recovered')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'secondary_field_action_scan')).length,
    ).toBeGreaterThanOrEqual(3);
    expect((await faProbe(page)).scan.context).toBe('free');
    expect((await pilotProbe(page))?.beacon?.label).toBe('Magnet Recovery Rig');

    // ——— M24 (Unit 12): the finite deck to explicit depletion, the
    // expected-outcome check (a right first answer), the continuation. ———
    await startSalvageTally(page);
    await depleteDeck(page);
    ext = await exteriorProbe(page);
    expect(ext.m24.depletion_reached).toBe(true);
    expect(ext.m24.knowledge).toBe('depleted_untested');
    expect(ext.m24.depletion_shown_count).toBeGreaterThanOrEqual(1);
    expect(await lastFeedback(page)).toContain('CATCHMENT DEPLETED');

    // One post-depletion cast BEFORE the check (pre-knowledge, unqualified).
    await standOnPad(page);
    await magnetCycle(page, true);
    ext = await exteriorProbe(page);
    expect(ext.m24.casts_pre_knowledge).toBe(1);
    expect(ext.m24.postknowledge_casts).toBe(0);
    expect((await faProbe(page)).magnet.deckPosition).toBe(6);

    // The check at the rig panel: a right first answer passes and opens the
    // 30 s focused continuation; nothing tells the participant what to do.
    await answerRigCheck(page, 'correct');
    ext = await exteriorProbe(page);
    expect(ext.m24.knowledge).toBe('depleted_passed');
    expect(ext.m24.knowledge_status).toBe('pass_first');
    expect(ext.m24.continuation_open).toBe(true);
    expect(await lastFeedback(page)).not.toMatch(/correct|wrong|well done/i);
    await standOnPad(page);
    await magnetCycle(page, false);
    ext = await exteriorProbe(page);
    expect(ext.m24.postknowledge_casts).toBe(1); // the first included
    expect(ext.m24.postdepletion_casts).toBe(2);
    expect((await faProbe(page)).magnet.deckPosition).toBe(6);
    expect((await faProbe(page)).magnet.totalPulls).toBe(8);

    await useSortingBench(page);
    ext = await exteriorProbe(page);
    expect(ext.m24.alternative_used).toBe(true);
    await finishAtRig(page);
    await mark('M24 magnet deck');
    ext = await exteriorProbe(page);
    expect(ext.m24).toMatchObject({
      window: 'closed',
      exit: 'stopped',
      exited: true,
      continuation_closure: 'voluntary_stop',
      cap_reached: false,
    });

    const cycles = (await eventsByType(page, 'proto_m24_rig_cycle')).filter(
      (e) => e.metadata?.cancelled === false,
    );

    expect(cycles.map((e) => e.metadata?.pull_position)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(cycles.slice(6).every((e) => e.metadata?.item_id === null)).toBe(
      true,
    );
    expect(cycles.some((e) => e.metadata?.locked_in_band === false)).toBe(true);
    // The depleting sixth cycle logs the state AFTER its resolution.
    expect(cycles.map((e) => e.metadata?.knowledge_state)).toEqual([
      ...Array(5).fill('not_depleted'),
      'depleted_untested',
      'depleted_untested',
      'depleted_passed',
    ]);
    expect(cycles.slice(6).map((e) => e.metadata?.classification)).toEqual([
      'pre_knowledge',
      'postknowledge',
    ]);
    expect(
      (await eventsByType(page, 'proto_m24_rig_depletion_reached')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m24_rig_understanding_answered')).map(
        (e) => [e.metadata?.attempt, e.metadata?.correct, e.metadata?.form],
      ),
    ).toEqual([[1, true, 'a']]);
    expect(
      (await eventsByType(page, 'proto_m24_rig_continuation_opened')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m24_rig_postknowledge_cast')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m24_rig_alternative_used')).length,
    ).toBe(1);
    expect((await eventsByType(page, 'proto_m24_rig_exit')).length).toBe(1);
    // With the rig's window closed the beacon moves to the next listed job:
    // the support console (the fifth job since the console was added; the
    // earlier expectation of Post A predated it).
    expect((await pilotProbe(page))?.beacon?.label).toBe(
      'Station Support Console',
    );

    // ——— M26 (Unit 12): ACK → scripted disconnect → the check (a wrong
    // answer, the explanation, the rotated recheck) → the continuation. ———
    await powerUpUplink(page);
    await transmitAt(page, 'uplinkA');
    expect(await lastFeedback(page)).toContain('ACK');
    await waitDisconnect(page);
    expect(await lastFeedback(page)).toContain('LINE OPEN');
    ext = await exteriorProbe(page);
    expect(ext.m26.knowledge).toBe('disconnected_untested');

    // Post A IS the check while it is due: a wrong first answer chains the
    // one explanation, whose Continue chains the recheck.
    await answerUplinkCheck(page, 'wrong');
    ext = await exteriorProbe(page);
    expect(ext.m26.knowledge).toBe('disconnected_testing');
    await continueUplinkExplanation(page);
    await answerOpenCheck(page, 'M26', 'correct');
    ext = await exteriorProbe(page);
    expect(ext.m26.knowledge_status).toBe('pass_after_explanation');
    expect(ext.m26.explanation_shown).toBe(true);
    expect(ext.m26.continuation_open).toBe(true);
    expect(ext.m26.pre_knowledge_attempts).toBe(0);

    await transmitAt(page, 'uplinkA'); // post-knowledge retry 1 (included)
    expect(await lastFeedback(page)).toContain('NO CARRIER');
    await transmitAt(page, 'uplinkA'); // post-knowledge retry 2
    ext = await exteriorProbe(page);
    expect(ext.m26.postknowledge_retries).toBe(2);
    expect(ext.m26.postknowledge_retries_minus_first).toBe(1);
    expect(ext.m26.alternative_used).toBe(false);

    await transmitAt(page, 'uplinkB');
    ext = await exteriorProbe(page);
    expect(ext.m26.alternative_used).toBe(true);
    expect(ext.m26.all_reports_delivered).toBe(true);
    expect(await lastFeedback(page)).toContain('Post B');

    // The hidden 30 s focused cap closes the continuation and the window.
    await waitContinuationClosed(page, 'm26', 45_000);
    await mark('M26 uplink');
    ext = await exteriorProbe(page);
    expect(ext.m26).toMatchObject({
      window: 'closed',
      exit: 'completed',
      continuation_closure: 'cap',
      cap_reached: true,
      postknowledge_retries: 2,
    });

    const transmissions = await eventsByType(
      page,
      'proto_m26_uplink_transmission',
    );

    expect(transmissions.map((e) => e.metadata?.classification)).toEqual([
      'delivered',
      'postknowledge',
      'postknowledge',
      'delivered',
    ]);
    expect(
      (await eventsByType(page, 'proto_m26_uplink_disconnect_demonstrated'))
        .length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m26_uplink_evidence_viewed')).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      (await eventsByType(page, 'proto_m26_uplink_understanding_answered')).map(
        (e) => [e.metadata?.attempt, e.metadata?.correct, e.metadata?.form],
      ),
    ).toEqual([
      [1, false, 'a'],
      [2, true, 'b'],
    ]);
    expect(
      (await eventsByType(page, 'proto_m26_uplink_explanation_shown')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m26_uplink_postknowledge_retry')).length,
    ).toBe(2);
    expect(
      (await eventsByType(page, 'proto_m26_uplink_alternative_used')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m26_uplink_cap_reached')).length,
    ).toBe(1);
    // M24 and M26 never share an event: no cycle carries a channel, no
    // transmission carries a pull position.
    expect(
      (await eventsByPrefix(page, 'proto_m24_')).some(
        (e) => 'channel' in (e.metadata ?? {}),
      ),
    ).toBe(false);
    expect(
      (await eventsByPrefix(page, 'proto_m26_')).some(
        (e) => 'pull_position' in (e.metadata ?? {}),
      ),
    ).toBe(false);
    // This route never opens the support console or the sensor post, so
    // the objective line names the console next (the earlier expectation
    // of Noor predated both stations).
    expect((await pilotProbe(page))?.objective).toContain('support console');

    // ——— Noor: the shift ends outside; honest closures. ———
    await finishOutside(page);
    await mark('Noor shift end');
    ext = await exteriorProbe(page);
    expect(ext.shift_ended).toBe(true);
    expect(await itemStatus(page, 'M05')).toBe('completed');
    expect(await itemStatus(page, 'M19')).toBe('completed');
    expect(await itemStatus(page, 'M23')).toBe('completed');
    expect(await itemStatus(page, 'M24')).toBe('completed');
    expect(await itemStatus(page, 'M26')).toBe('completed');
    expect(await itemStatus(page, 'M20')).toBe('open');
    expect(ext.m20.interruption_recorded).toBe(true);
    expect(ext.m20.progress_pre_interruption).toBe(2);
    expect(
      await eventsByType(page, 'proto_m20_antenna_window_closed'),
    ).toHaveLength(0);
    expect(
      (await eventsByType(page, 'proto_m20_antenna_interruption_recorded'))
        .length,
    ).toBe(1);

    // Every item-owned event carries the required fields; no item id or
    // validity word reaches the participant (feedback / objective).
    for (const family of [
      'proto_m19_lines_',
      'proto_m23_field_recovery_',
      'proto_m24_rig_',
      'proto_m26_uplink_',
    ]) {
      for (const event of await eventsByPrefix(page, family)) {
        const m = event.metadata ?? {};

        expect(m.measure_id, event.event_type).toMatch(/^M(19|23|24|26)$/);
        expect(typeof m.opportunity_id).toBe('string');
        expect(typeof m.window_id).toBe('string');
        expect(typeof m.entry_state_version).toBe('string');
        expect(typeof m.comprehension_state).toBe('string');
        expect(typeof m.window_status).toBe('string');
        expect(typeof m.validity_status).toBe('string');
        expect(typeof m.input_mode).toBe('string');
      }
    }

    // ——— Timing: item-owned active time vs the 300 s planning envelope. ———
    const closed = (await getEvents(page)).filter(
      (e) =>
        e.event_type.endsWith('_window_closed') &&
        /^proto_m(05|19|23|24|26)_/.test(e.event_type) &&
        (e.metadata as { occasion?: string } | undefined)?.occasion !== 'o1',
    );
    const activeMs = closed.reduce(
      (sum, e) =>
        sum + Number((e.metadata as { active_ms?: number }).active_ms ?? 0),
      0,
    );
    const m20Events = await eventsByPrefix(page, 'proto_m20_antenna_');
    const m20StageMs = Number(
      m20Events.find(
        (e) =>
          e.event_type === 'proto_m20_antenna_stage_completed' &&
          e.metadata?.stage === 'seat_feed_line',
      )?.metadata?.elapsed_ms ?? 0,
    );

    const totals = getDriverStats();
    const perWindow = closed.map(
      (e) =>
        `${e.event_type.replace('proto_', '').replace('_window_closed', '')} ${Math.round(Number((e.metadata as { active_ms?: number }).active_ms ?? 0) / 1000)} s`,
    );

    // eslint-disable-next-line no-console
    console.log(
      `exterior recovery: item-owned active ${Math.round((activeMs + m20StageMs) / 1000)} s (M20 start ${Math.round(m20StageMs / 1000)} s); wall ${Math.round((Date.now() - startedAt) / 1000)} s from the Dock · per window: ${perWindow.join(', ')} · driver totals: hold ${Math.round(totals.holdMs / 1000)} s settle ${Math.round(totals.settleMs / 1000)} s legs ${totals.legs} bursts ${totals.bursts} no-motion ${totals.noMotionBursts} stalls ${totals.stallAborts}`,
    );
    expect(activeMs + m20StageMs).toBeLessThanOrEqual(300_000);

    // The return route: airlock → laboratory; the yard state persisted.
    await leaveYard(page);
    expect((await pilotProbe(page))?.zone).toBe('diagnostics_laboratory');
    expectNoRuntimeErrors(errors);
  });

  test('2. stops are observations, departures never terminal, state persists across re-entry, unacknowledged signals close invalid, the antenna obligation survives the return', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);

    await enterYard(page, 'stops');

    // M19 (Unit 21): the panel opened, line 1 worked to its obstacle and
    // SET ASIDE confirmed, line 2 left in work (ESC) — a departure is never
    // terminal; nothing is presented again on re-entry.
    await openCouplingPanel(page);
    await panelKeys(page, [
      'Tab-continue',
      '2',
      'r',
      'Tab-start',
      '1',
      '2',
      '3',
      't',
      'n',
      'Enter',
      'Tab-next',
    ]);
    await leaveCouplingPanel(page);

    let ext = await exteriorProbe(page);

    expect(ext.m19_panel.window).toBe('open');
    expect(ext.m19_panel.line_in_work).toBe('m19_l2');
    expect(await itemStatus(page, 'M19')).toBe('open');

    const m19Finished = await eventsByType(
      page,
      'proto_m19_lines_line_finished',
    );

    expect(m19Finished).toHaveLength(1);
    expect(m19Finished[0].metadata?.finish).toBe('set_aside');
    expect(m19Finished[0].metadata?.boundary_attempt_index).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m19_lines_line_presented')).length,
    ).toBe(2);
    expect(
      (await eventsByType(page, 'proto_m19_lines_window_closed')).length,
    ).toBe(0);

    // M20: accept + ONE stage.
    await acceptMast(page);
    await doMastStage(page, 1);

    // M23: begin, one sweep, explicit stop (a complete observation).
    await beginExcavation(page);
    await scanAt(
      page,
      YARD.scanSpots[(await exteriorProbe(page)).m23_form].faint,
    );
    await stopExcavation(page);
    ext = await exteriorProbe(page);
    expect(ext.m23.window).toBe('closed');
    expect(ext.m23.exit).toBe('stopped');
    expect(ext.m23.recovery_complete).toBe(false);
    expect(ext.m23.stop_choice).toBe('stopped');
    expect(await itemStatus(page, 'M23')).toBe('completed');

    // Sweeping inside the closed field is refused, never faked.
    await walkTo(
      page,
      YARD.scanSpots[ext.m23_form].actionable.x,
      YARD.scanSpots[ext.m23_form].actionable.y,
      { yFirst: true },
    );

    const scansBefore = (
      await eventsByType(page, 'proto_m23_field_recovery_scan')
    ).length;

    await press(page, 'C');
    await page.waitForTimeout(700);
    expect(await lastFeedback(page)).toContain('closed for this shift');
    expect(
      (await eventsByType(page, 'proto_m23_field_recovery_scan')).length,
    ).toBe(scansBefore);

    // M24: start, two cycles, then leave the yard with the window open.
    await startSalvageTally(page);
    await standOnPad(page);
    await magnetCycle(page, true);
    await magnetCycle(page, true);
    expect((await faProbe(page)).magnet.deckPosition).toBe(2);

    await leaveYard(page);

    const departedM24 = await eventsByType(page, 'proto_m24_rig_departed');
    const departedM20 = await eventsByType(page, 'proto_m20_antenna_departed');

    expect(departedM24).toHaveLength(1);
    expect(departedM20).toHaveLength(1);
    expect(
      await eventsByType(page, 'proto_m24_rig_window_closed'),
    ).toHaveLength(0);
    expect(await itemStatus(page, 'M24')).toBe('open');
    expect(await itemStatus(page, 'M20')).toBe('open');
    // M05 occasion 2 (Unit 6) was declined at the briefing: exactly one
    // closure (the decline) exists for it, and the departure adds none.
    expect(
      (await eventsByType(page, 'proto_m05_start_window_closed')).filter(
        (e) => e.metadata?.occasion === 'o2',
      ),
    ).toHaveLength(1);

    // Re-entry: everything persisted (scene recreated).
    await reenterYard(page);
    ext = await exteriorProbe(page);
    expect(ext.zone_entries).toBe(2);
    expect(ext.m19_panel.window).toBe('open');
    expect(ext.m19_panel.line_in_work).toBe('m19_l2');
    expect(ext.m20.accepted).toBe(true);
    expect(ext.m20.stages_done).toEqual(['clear_base_clamp']);
    expect(ext.m20.departures).toBe(1);
    expect(ext.m24.open).toBe(true);
    expect((await faProbe(page)).magnet.deckPosition).toBe(2);
    expect((await faProbe(page)).windows.m24_open).toBe(true);
    expect(await lastFeedback(page)).not.toContain('Mast'); // no antenna reminder on re-entry
    // M19 (Unit 21): the panel reopens on the same state (line 2 in work);
    // nothing is presented again.
    await openCouplingPanel(page);
    expect((await surface(page))?.status).toBe('Working on line 2 of 2.');
    expect(
      (await eventsByType(page, 'proto_m19_lines_series_reopened')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m19_lines_line_presented')).length,
    ).toBe(2);
    await leaveCouplingPanel(page);

    // Finish the deck WITHOUT taking the check; disconnect the uplink
    // WITHOUT taking the check (Unit 12: knowledge unverified ⇒ invalid).
    await standOnPad(page);

    for (let position = 3; position <= 6; position++) {
      await magnetCycle(page, true);
    }

    expect((await faProbe(page)).magnet.depleted).toBe(true);
    ext = await exteriorProbe(page);
    expect(ext.m24.knowledge).toBe('depleted_untested');

    await powerUpUplink(page);
    await transmitAt(page, 'uplinkA');
    await waitDisconnect(page);
    ext = await exteriorProbe(page);
    expect(ext.m26.knowledge).toBe('disconnected_untested');
    expect(ext.m26.check_due).toBe('attempt_1');

    await finishOutside(page);

    const m24 = await validityRecord(page, OPPORTUNITY.m24);
    const m26 = await validityRecord(page, OPPORTUNITY.m26);

    expect(m24.validity).toBe('invalid');
    expect(m24.invalid_reason).toBe('insufficient_opportunity');
    expect(m24.invalid_detail).toBe('understanding_not_tested');
    expect(m26.validity).toBe('invalid');
    expect(m26.invalid_detail).toBe('understanding_not_tested');
    expect(await itemStatus(page, 'M24')).toBe('invalid');
    expect(await itemStatus(page, 'M26')).toBe('invalid');
    expect(m24.completed).toBe(false);
    expect(m26.completed).toBe(false);

    const m24Closed = (
      await eventsByType(page, 'proto_m24_rig_window_closed')
    )[0];

    expect(m24Closed.metadata?.exit_state).toBe('departed');
    expect(
      (
        m24Closed.metadata?.raw_components_partial as {
          postdepletion_casts: number;
        }
      ).postdepletion_casts,
    ).toBe(0);

    // M20: interruption recorded with progress 1; no closure, no outcome.
    ext = await exteriorProbe(page);
    expect(ext.m20.progress_pre_interruption).toBe(1);
    expect(ext.m20.window).toBe('open');
    expect(
      await eventsByType(page, 'proto_m20_antenna_window_closed'),
    ).toHaveLength(0);

    // Return inside: the obligation is still in the mission log.
    await leaveYard(page);
    await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
      approachOffset: await labApproach(page, PILOT.lab.southDoor),
    });

    const inside = await pilotProbe(page);

    expect(inside?.stage).toBe('return_hub');
    expect(inside?.mission_log.map((entry) => entry.text).join(' ')).toContain(
      'Mast 04',
    );
    expect(await itemStatus(page, 'M20')).toBe('open');
    expectNoRuntimeErrors(errors);
  });

  test('3. belt-full recovery is lossless; overlays freeze and resume; F off the pad and a held E never double-act', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYard(page, 'belt');

    // Fill the belt with crate spares (scanner + spade + 8 spares = 10).
    for (let take = 0; take < 8; take++) {
      await openSite(page, 'crate');
      await selectPromptOption(page, 1);
      await page.waitForTimeout(250);
    }

    await openSite(page, 'crate');
    await selectPromptOption(page, 1);
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toContain('Belt full');

    // Recover the coupling with a full belt → a field cache at the cell.
    const form = (await exteriorProbe(page)).m23_form;
    const cell = YARD.targetCells[form];

    await beginExcavation(page);
    await faceCell(page, cell.x, cell.y);
    await digFacing(page, 'cached');

    const ext = await exteriorProbe(page);

    expect(ext.m23.recovery_complete).toBe(true);
    expect(ext.m23.recovery_delivery).toBe('cache');
    expect(ext.caches).toHaveLength(1);
    expect(ext.caches[0].item_id).toBe('relay_coupling');
    expect((await faProbe(page)).caches).toHaveLength(1);
    expect(await itemStatus(page, 'M23')).toBe('completed');

    // The cache survives leaving and re-entering the yard.
    await leaveYard(page);
    await reenterYard(page);
    expect((await exteriorProbe(page)).caches).toHaveLength(1);
    expect((await faProbe(page)).caches).toHaveLength(1);
    expect((await exteriorProbe(page)).dug_cells).toHaveLength(1);

    // Belt still full → the cache stays; return the spares → collect it.
    // World V2 yard: the re-entry spawn is on the west half; the cache cell
    // lies on the east half's staked field (rows 3–8). The pass-aware
    // driver crosses the drift pass and stands one cell north of the cache
    // (inside the 56 px collection reach). The former "row 10 lane" was
    // the 25×19 yard's — rows 9–11 of the strip are the hull band.
    await yardVia(page, cell.x, cell.y - 28);
    await press(page, 'Space');
    await page.waitForTimeout(400);
    expect(await lastFeedback(page)).toContain('Belt still full');
    expect((await exteriorProbe(page)).caches).toHaveLength(1);

    await openSite(page, 'crate');
    await selectPromptOption(page, 3);
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toContain('returned');
    await yardVia(page, cell.x, cell.y - 28);
    await press(page, 'Space');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __exteriorProbe?: { caches: unknown[] } | null;
          }
        ).__exteriorProbe?.caches.length === 0,
      undefined,
      { timeout: 5000 },
    );
    expect((await faProbe(page)).caches).toHaveLength(0);
    expect(
      (await eventsByType(page, 'secondary_field_action_cache_created')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'secondary_field_action_cache_recovered'))
        .length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m23_field_recovery_recovered')).length,
    ).toBe(1);

    // Overlays: I freezes the world and resumes it; M likewise. (Back to
    // the west half through the drift pass — pass-aware driver.)
    await yardVia(page, 600, 400);

    const before = await page.evaluate(
      () =>
        (window as unknown as { __playerProbe?: { x: number } }).__playerProbe
          ?.x ?? 0,
    );

    await press(page, 'i');
    await page.waitForFunction(
      () => {
        const probe = (
          window as unknown as { __inventoryUiProbe?: unknown | null }
        ).__inventoryUiProbe;

        return probe !== null && probe !== undefined;
      },
      undefined,
      { timeout: 8000 },
    );
    await hold(page, 'ArrowRight', 400);

    const frozen = await page.evaluate(
      () =>
        (window as unknown as { __playerProbe?: { x: number } }).__playerProbe
          ?.x ?? 0,
    );

    expect(Math.abs(frozen - before)).toBeLessThan(2);
    await press(page, 'Escape');
    await page.waitForTimeout(500);
    await hold(page, 'ArrowRight', 400);

    const moved = await page.evaluate(
      () =>
        (window as unknown as { __playerProbe?: { x: number } }).__playerProbe
          ?.x ?? 0,
    );

    expect(moved).toBeGreaterThan(frozen + 20);

    await press(page, 'm');
    await page.waitForFunction(
      () =>
        (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
          .__pilotMapProbe?.open === true,
      undefined,
      { timeout: 5000 },
    );
    await press(page, 'Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
          .__pilotMapProbe?.open === false,
      undefined,
      { timeout: 5000 },
    );

    // F away from the rig: nothing happens (no phase, no event).
    const cyclesBefore = (
      await eventsByType(page, 'secondary_field_action_magnet_cycle')
    ).length;

    await press(page, 'f');
    await page.waitForTimeout(600);
    expect((await faProbe(page)).magnet.phase).toBe('idle');
    expect(
      (await eventsByType(page, 'secondary_field_action_magnet_cycle')).length,
    ).toBe(cyclesBefore);

    // M19 (Unit 21): a held E at the coupling opens the panel ONCE and
    // executes no TRY (E is not bound on the panel; repeats are dropped).
    await walkTo(page, YARD.coupling.x + APPROACH.coupling.x, YARD.coupling.y, {
      yFirst: true,
    });
    await hold(page, 'e', 700);
    await waitSurface(page, true, 'm19_coupling_panel');
    await page.waitForTimeout(400);
    expect(
      (await eventsByType(page, 'proto_m19_lines_opportunity_opened')).length,
    ).toBe(1);
    expect((await eventsByType(page, 'proto_m19_lines_attempt')).length).toBe(
      0,
    );
    // A held SPACE on the panel's neutral landing executes nothing either.
    await hold(page, 'Space', 900);
    await page.waitForTimeout(300);
    expect((await eventsByType(page, 'proto_m19_lines_attempt')).length).toBe(
      0,
    );
    expect(
      (await eventsByType(page, 'proto_m19_lines_opportunity_opened')).length,
    ).toBe(1);
    await leaveCouplingPanel(page);
    expectNoRuntimeErrors(errors);
  });
});
