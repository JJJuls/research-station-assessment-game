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
import { expect, test } from '@playwright/test';

import {
  acceptMast,
  acknowledgeDepletion,
  acknowledgeLineAtPostA,
  APPROACH,
  beginExcavation,
  captureErrors,
  completeCoupling,
  couplingAct,
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
  finishOutside,
  fixCableFlag,
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
  waitDisconnect,
  waitNoWorldAction,
  YARD,
} from './exteriorHelpers';
import { getEvents, hold, press, selectPromptOption } from './helpers';
import {
  interactAt,
  openPromptAt,
  PILOT,
  pilotProbe,
  useDoor,
  walkTo,
} from './pilotHelpers';

test.describe('pilot route — Exterior Recovery (Unit 4)', () => {
  test('1. the complete recovery operation: six item windows, one route, honest closures, item-owned timing', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);
    const startedAt = Date.now();

    await enterYard(page, 'ops');

    // ——— Guidance: one objective line, the beacon on the first site. ———
    let probe = await pilotProbe(page);

    expect(probe?.objective).toContain('coupling');
    expect(probe?.beacon?.label).toBe('Frozen Coolant Coupling');
    expect(probe?.objective).not.toMatch(/proto_|\bM\d{2}\b|persist/i);

    // ——— M05 occasion 2: presented silently after "Ready.", independent
    // of occasion 1 (which the spine left uninitiated and censored). ———
    const o1 = await validityRecord(page, 'proto_m05_initiation_o1');

    expect(o1.completed).toBe(true); // censored observation (initiated=false)

    let ext = await exteriorProbe(page);

    expect(ext.m05.presented).toBe(true);
    expect(ext.m05.initiated).toBe(false);

    const o2Opened = await eventsByType(
      page,
      'proto_m05_initiation_opportunity_opened',
    );
    const o2Open = o2Opened.find((e) => e.metadata?.occasion === 'o2');

    expect(o2Open).toBeDefined();
    expect(o2Open?.metadata?.window_id).toBe('m05_initiation_o2');
    expect(o2Open?.metadata?.comprehension_state).toBe('passed');
    expect(typeof o2Open?.metadata?.presented_at_ms).toBe('number');

    await fixCableFlag(page);

    const o2 = await validityRecord(page, OPPORTUNITY.m05o2);

    expect(o2.completed).toBe(true);
    expect(o2.validity).toBe('valid');

    const o2Closed = (
      await eventsByType(page, 'proto_m05_initiation_window_closed')
    ).find((e) => e.metadata?.occasion === 'o2');
    const o2Raw = o2Closed?.metadata?.raw_components as Record<string, unknown>;

    expect(o2Raw.occasion_id).toBe('o2');
    expect(o2Raw.initiated).toBe(true);
    expect(o2Raw.eligible_opportunity).toBe(true);
    expect(typeof o2Raw.initiation_latency_ms).toBe('number');
    expect(o2Raw.censored_reason).toBeNull();
    expect(JSON.stringify(o2Raw)).not.toMatch(/aggregate|score|o1/);

    // ——— M19: the frozen coupling to completion. ———
    await completeCoupling(page);
    ext = await exteriorProbe(page);
    expect(ext.m19.completion).toBe(true);
    expect(ext.m19.window).toBe('closed');
    expect(ext.m19.exit).toBe('completed');
    expect(ext.m19.difficulty_onset?.progress).toBe(30);
    expect(ext.m19.postdifficulty_reengagement).toBe(true);
    expect(ext.m19.useful_attempts).toBe(16);
    expect(ext.m19.strategy_shifts).toBe(0); // the driver thaws without ineffective turns
    expect(await itemStatus(page, 'M19')).toBe('completed');
    expect((await validityRecord(page, OPPORTUNITY.m19)).form).toBe(
      'standard_v1',
    );

    const m19Events = await eventsByPrefix(page, 'proto_m19_valve_');
    const m19Types = new Set(m19Events.map((e) => e.event_type));

    for (const required of [
      'proto_m19_valve_presented',
      'proto_m19_valve_opportunity_opened',
      'proto_m19_valve_turn',
      'proto_m19_valve_difficulty_onset',
      'proto_m19_valve_thaw',
      'proto_m19_valve_window_closed',
    ]) {
      expect(m19Types, required).toContain(required);
    }

    for (const event of m19Events) {
      expect(event.metadata?.measure_id).toBe('M19');
      expect(event.metadata?.opportunity_id).toBe(OPPORTUNITY.m19);
      expect(event.metadata?.window_id).toBe('m19_valve_w1');
      expect(event.metadata?.form).toBe('standard_v1');
      expect(['keyboard', 'pointer', 'system']).toContain(
        event.metadata?.input_mode,
      );
    }

    const m19Closed = (
      await eventsByType(page, 'proto_m19_valve_window_closed')
    )[0];
    const m19Raw = m19Closed.metadata?.raw_components as Record<
      string,
      unknown
    >;

    expect(Object.keys(m19Raw)).toEqual(
      expect.arrayContaining([
        'difficulty_onset',
        'postdifficulty_reengagement',
        'useful_attempts',
        'progress',
        'completion',
        'stop_choice',
      ]),
    );
    expect(m19Closed.metadata?.validity_status).toBe('valid');
    expect(m19Closed.metadata?.exit_state).toBe('completed');
    expect(
      (await eventsByType(page, 'proto_m19_valve_turn')).filter(
        (e) => e.metadata?.effective === true,
      ),
    ).toHaveLength(10);
    probe = await pilotProbe(page);
    expect(probe?.beacon?.label).toBe('Mast 04');
    expect(probe?.objective).toContain('Mast 04');

    // ——— M20: accept + both outdoor stages; the start window stays open. ———
    await startAntenna(page);
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

    // ——— M24: the finite deck to explicit depletion and beyond. ———
    await startSalvageTally(page);
    await depleteDeck(page);
    ext = await exteriorProbe(page);
    expect(ext.m24.depletion_reached).toBe(true);
    expect(ext.m24.knowledge).toBe('depleted_unacknowledged');
    expect(ext.m24.depletion_shown_count).toBeGreaterThanOrEqual(1);
    expect(await lastFeedback(page)).toContain('CATCHMENT DEPLETED');

    // One post-depletion cast BEFORE acknowledgement (pre-knowledge).
    await standOnPad(page);
    await magnetCycle(page, true);
    ext = await exteriorProbe(page);
    expect(ext.m24.postdepletion_casts_pre_ack).toBe(1);
    expect(ext.m24.identical_postdepletion_cycles).toBe(0);
    expect((await faProbe(page)).magnet.deckPosition).toBe(6);

    await acknowledgeDepletion(page);
    await standOnPad(page);
    await magnetCycle(page, false);
    ext = await exteriorProbe(page);
    expect(ext.m24.identical_postdepletion_cycles).toBe(1);
    expect(ext.m24.postdepletion_casts).toBe(2);
    expect((await faProbe(page)).magnet.deckPosition).toBe(6);
    expect((await faProbe(page)).magnet.totalPulls).toBe(8);

    await useSortingBench(page);
    ext = await exteriorProbe(page);
    expect(ext.m24.alternative_opened).toBe(true);

    const cycles = (
      await eventsByType(page, 'proto_m24_magnet_utility_cycle')
    ).filter((e) => e.metadata?.cancelled === false);

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
      'depleted_unacknowledged',
      'depleted_unacknowledged',
      'depleted_acknowledged',
    ]);
    expect(
      (await eventsByType(page, 'proto_m24_magnet_utility_depletion_reached'))
        .length,
    ).toBe(1);
    expect(
      (
        await eventsByType(
          page,
          'proto_m24_magnet_utility_depletion_acknowledged',
        )
      ).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m24_magnet_utility_alternative_opened'))
        .length,
    ).toBe(1);
    expect((await pilotProbe(page))?.beacon?.label).toBe('Field Uplink Post A');

    // ——— M26: ACK → scripted disconnect → knowledge gate → backup post. ———
    await powerUpUplink(page);
    await transmitAt(page, 'uplinkA');
    expect(await lastFeedback(page)).toContain('ACK');
    await waitDisconnect(page);
    expect(await lastFeedback(page)).toContain('LINE OPEN');
    ext = await exteriorProbe(page);
    expect(ext.m26.knowledge).toBe('disconnected_unacknowledged');

    await transmitAt(page, 'uplinkA'); // pre-knowledge attempt
    expect(await lastFeedback(page)).toContain('NO CARRIER');
    ext = await exteriorProbe(page);
    expect(ext.m26.pre_knowledge_attempts).toBe(1);
    expect(ext.m26.postknowledge_transmissions).toBe(0);

    await acknowledgeLineAtPostA(page);
    await transmitAt(page, 'uplinkA'); // excluded confirmation probe
    await transmitAt(page, 'uplinkA'); // post-knowledge continuation
    ext = await exteriorProbe(page);
    expect(ext.m26.confirmation_probe_excluded).toBe(true);
    expect(ext.m26.postknowledge_transmissions).toBe(1);
    expect(ext.m26.alternative_used).toBe(false);

    await transmitAt(page, 'uplinkB');
    ext = await exteriorProbe(page);
    expect(ext.m26.alternative_used).toBe(true);
    expect(ext.m26.all_reports_delivered).toBe(true);
    expect(await lastFeedback(page)).toContain('Post B');

    const transmissions = await eventsByType(
      page,
      'proto_m26_channel_transmission',
    );

    expect(transmissions.map((e) => e.metadata?.classification)).toEqual([
      'delivered',
      'pre_knowledge',
      'confirmation_probe',
      'postknowledge',
      'delivered',
    ]);
    expect(
      (await eventsByType(page, 'proto_m26_channel_disconnect_demonstrated'))
        .length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m26_channel_evidence_viewed')).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      (await eventsByType(page, 'proto_m26_channel_confirmation_probe')).length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m26_channel_postknowledge_transmission'))
        .length,
    ).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m26_channel_alternative_used')).length,
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
    expect((await pilotProbe(page))?.objective).toContain('Noor');

    // ——— Noor: the shift ends outside; honest closures. ———
    await finishOutside(page);
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
      'proto_m19_valve_',
      'proto_m23_field_recovery_',
      'proto_m24_magnet_utility_',
      'proto_m26_channel_',
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

    // eslint-disable-next-line no-console
    console.log(
      `exterior recovery: item-owned active ${Math.round((activeMs + m20StageMs) / 1000)} s (M20 start ${Math.round(m20StageMs / 1000)} s); wall ${Math.round((Date.now() - startedAt) / 1000)} s from the Dock`,
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

    // M19: two turns, an inspection, then the neutral stop.
    await couplingAct(page, 1);
    await couplingAct(page, 1);
    await couplingAct(page, 3);
    await couplingAct(page, 4);

    let ext = await exteriorProbe(page);

    expect(ext.m19.progress).toBe(20);
    expect(ext.m19.inspections).toBe(1);
    expect(ext.m19.stop_choice).toBe('step_away');
    expect(ext.m19.window).toBe('closed');
    expect(ext.m19.exit).toBe('stopped');
    expect(await itemStatus(page, 'M19')).toBe('completed');

    const m19Closed = (
      await eventsByType(page, 'proto_m19_valve_window_closed')
    )[0];

    expect(m19Closed.metadata?.exit_state).toBe('stopped');
    expect(
      (m19Closed.metadata?.raw_components as { completion: boolean })
        .completion,
    ).toBe(false);
    expect((await eventsByType(page, 'proto_m19_valve_inspect')).length).toBe(
      1,
    );

    // The closed coupling only reads its state now.
    await interactAt(page, YARD.coupling, {
      approachOffset: APPROACH.coupling,
    });
    await page.waitForTimeout(400);
    expect(await lastFeedback(page)).toContain('Valve 20%');

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

    const departedM24 = await eventsByType(
      page,
      'proto_m24_magnet_utility_departed',
    );
    const departedM20 = await eventsByType(page, 'proto_m20_antenna_departed');

    expect(departedM24).toHaveLength(1);
    expect(departedM20).toHaveLength(1);
    expect(
      await eventsByType(page, 'proto_m24_magnet_utility_window_closed'),
    ).toHaveLength(0);
    expect(await itemStatus(page, 'M24')).toBe('open');
    expect(await itemStatus(page, 'M20')).toBe('open');
    // M05 occasion 2 censored on departure (complete observation, initiated=false).
    expect(
      (await eventsByType(page, 'proto_m05_initiation_window_closed')).some(
        (e) =>
          e.metadata?.occasion === 'o2' &&
          (e.metadata?.raw_components as { censored_reason: string })
            .censored_reason === 'left_zone',
      ),
    ).toBe(true);

    // Re-entry: everything persisted (scene recreated).
    await reenterYard(page);
    ext = await exteriorProbe(page);
    expect(ext.zone_entries).toBe(2);
    expect(ext.m19.progress).toBe(20);
    expect(ext.m19.window).toBe('closed');
    expect(ext.m20.accepted).toBe(true);
    expect(ext.m20.stages_done).toEqual(['clear_base_clamp']);
    expect(ext.m20.departures).toBe(1);
    expect(ext.m24.open).toBe(true);
    expect((await faProbe(page)).magnet.deckPosition).toBe(2);
    expect((await faProbe(page)).windows.m24_open).toBe(true);
    expect(await lastFeedback(page)).not.toContain('Mast'); // no antenna reminder on re-entry

    // Finish the deck WITHOUT acknowledging; disconnect the uplink WITHOUT acknowledging.
    await standOnPad(page);

    for (let position = 3; position <= 6; position++) {
      await magnetCycle(page, true);
    }

    expect((await faProbe(page)).magnet.depleted).toBe(true);
    ext = await exteriorProbe(page);
    expect(ext.m24.knowledge).toBe('depleted_unacknowledged');

    await powerUpUplink(page);
    await transmitAt(page, 'uplinkA');
    await waitDisconnect(page);
    await transmitAt(page, 'uplinkA');
    ext = await exteriorProbe(page);
    expect(ext.m26.pre_knowledge_attempts).toBe(1);
    expect(ext.m26.knowledge).toBe('disconnected_unacknowledged');

    await finishOutside(page);

    const m24 = await validityRecord(page, OPPORTUNITY.m24);
    const m26 = await validityRecord(page, OPPORTUNITY.m26);

    expect(m24.validity).toBe('invalid');
    expect(m24.invalid_reason).toBe('insufficient_opportunity');
    expect(m24.invalid_detail).toBe('depletion_not_acknowledged');
    expect(m26.validity).toBe('invalid');
    expect(m26.invalid_detail).toBe('disconnect_not_acknowledged');
    expect(await itemStatus(page, 'M24')).toBe('invalid');
    expect(await itemStatus(page, 'M26')).toBe('invalid');
    expect(m24.completed).toBe(false);
    expect(m26.completed).toBe(false);

    const m24Closed = (
      await eventsByType(page, 'proto_m24_magnet_utility_window_closed')
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
    await walkTo(page, 240, 456, { yFirst: true });
    await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
      approachOffset: { x: 0, y: -40 },
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

    let ext = await exteriorProbe(page);

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
    await walkTo(page, cell.x, 340, { yFirst: true }); // row 10 lane clears the stake body
    await walkTo(page, cell.x, cell.y - 28, { yFirst: true });
    await press(page, 'Space');
    await page.waitForTimeout(400);
    expect(await lastFeedback(page)).toContain('Belt still full');
    expect((await exteriorProbe(page)).caches).toHaveLength(1);

    await openSite(page, 'crate');
    await selectPromptOption(page, 3);
    await page.waitForTimeout(300);
    expect(await lastFeedback(page)).toContain('returned');
    await walkTo(page, cell.x, 340, { yFirst: true }); // row 10 lane clears the stake body
    await walkTo(page, cell.x, cell.y - 28, { yFirst: true });
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

    // Overlays: I freezes the world and resumes it; M likewise.
    await walkTo(page, 400, 420, { yFirst: true });

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

    // A held E at the coupling opens ONE prompt; the act runs once.
    await walkTo(page, YARD.coupling.x + APPROACH.coupling.x, YARD.coupling.y, {
      yFirst: true,
    });
    await hold(page, 'e', 700);
    await page.waitForTimeout(400);
    await selectPromptOption(page, 1);
    await waitNoWorldAction(page);
    await page.waitForTimeout(300);
    ext = await exteriorProbe(page);
    expect(ext.m19.acts).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m19_valve_opportunity_opened')).length,
    ).toBe(1);
    expect((await eventsByType(page, 'proto_m19_valve_turn')).length).toBe(1);

    // Held SPACE during the act cannot double-submit.
    await openPromptAt(page, YARD.coupling, {
      approachOffset: APPROACH.coupling,
    });
    await selectPromptOption(page, 1);
    await hold(page, 'Space', 900);
    await waitNoWorldAction(page);
    await page.waitForTimeout(300);
    expect((await exteriorProbe(page)).m19.acts).toBe(2);
    expectNoRuntimeErrors(errors);
  });
});
