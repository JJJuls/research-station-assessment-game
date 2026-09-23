/**
 * Information Processing foundation — decoder opportunities M14 (Packet
 * Saturation) and M15 (Layered Cipher) (Unit 3).
 *
 * Part 1 (pure): form structure and matching, the stable M14 rules, the
 * M15 reconstruction engine (pairs, shifts, violations, revisability) and
 * the volume-versus-relational-complexity separation.
 *
 * Part 2 (browser): real drag / click-composition / typed input through
 * the Signal Terminal; practice → scored staging; omission vs misrouting;
 * revision; tutorial gating; event-family isolation.
 */

import { expect, type Page, test } from '@playwright/test';

import {
  M15_FORMS,
  M15_GRAMMAR,
  reconstructCipher,
} from '../src/informationProcessing/cipherForms';
import type { GrammarSpec } from '../src/informationProcessing/model';
import {
  M14_FORMS,
  M14_GRAMMAR,
  m14CorrectDestination,
} from '../src/informationProcessing/packetForms';
import {
  appendLine,
  createProgramState,
  removeLine,
} from '../src/informationProcessing/programEngine';
import {
  M16_FORMS,
  M16_GRAMMAR,
  m16BaseDestination,
  m16UpdatedDestination,
} from '../src/informationProcessing/protocolForms';
import {
  evaluateTrial,
  linesOf,
  M17_FORMS,
  M17_GRAMMAR,
} from '../src/informationProcessing/syntaxForms';
import {
  bootIpLab,
  clickTerminalButton,
  composeByClick,
  dragChipToBin,
  dragChipToChip,
  eventsOfFamily,
  expectProvisionalOnly,
  ipEvents,
  ipModule,
  ipValidity,
  terminalProbe,
  typeCommand,
  waitBufferLength,
  waitTerminalOpen,
  walkAndUseStation,
} from './ipHelpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';

/* ------------------------------------------------------------------ *
 * Part 1 — pure
 * ------------------------------------------------------------------ */

function verbCount(grammar: GrammarSpec) {
  return grammar.verbs.length;
}

test.describe('M14 forms and rules (pure)', () => {
  for (const formId of ['A', 'B'] as const) {
    test(`form ${formId}: 4 practice + 12 scored, 4 per channel, 3 urgent, unique ids`, () => {
      const form = M14_FORMS[formId];

      expect(form.practice).toHaveLength(4);
      expect(form.scored).toHaveLength(12);

      for (const channel of ['ALPHA', 'BETA', 'GAMMA']) {
        expect(form.scored.filter((p) => p.channel === channel)).toHaveLength(
          4,
        );
      }

      expect(
        form.scored.filter((p) => p.flags?.includes('URGENT')),
      ).toHaveLength(3);
      expect(new Set(form.scored.map((p) => p.id)).size).toBe(12);
      expect(new Set(form.practice.map((p) => p.id)).size).toBe(4);
    });
  }

  test('the stable rules: channel map with the URGENT override', () => {
    expect(
      m14CorrectDestination({ id: 'x', channel: 'ALPHA', payload: '' }),
    ).toBe('ARCHIVE');
    expect(
      m14CorrectDestination({ id: 'x', channel: 'BETA', payload: '' }),
    ).toBe('RELAY');
    expect(
      m14CorrectDestination({ id: 'x', channel: 'GAMMA', payload: '' }),
    ).toBe('HOLD');
    expect(
      m14CorrectDestination({
        id: 'x',
        channel: 'GAMMA',
        payload: '',
        flags: ['URGENT'],
      }),
    ).toBe('RELAY');
  });

  test('forms A and B are matched in structure and rule count', () => {
    const a = M14_FORMS.A;
    const b = M14_FORMS.B;

    expect(a.scored.length).toBe(b.scored.length);
    expect(a.practice.length).toBe(b.practice.length);
    expect(a.scored.filter((p) => p.flags?.includes('URGENT')).length).toBe(
      b.scored.filter((p) => p.flags?.includes('URGENT')).length,
    );
    // The practice and the scored run use the SAME rules (quantity only).
    expect(M14_GRAMMAR.verbs.map((v) => v.verb)).toEqual(['ROUTE']);
  });
});

test.describe('M15 reconstruction (pure)', () => {
  for (const formId of ['A', 'B'] as const) {
    test(`form ${formId}: six fragments, three keys, one required shift, valid target reachable`, () => {
      const form = M15_FORMS[formId];

      expect(form.fragments).toHaveLength(6);
      expect(form.codebook).toHaveLength(8);

      for (const key of ['K1', 'K2', 'K3']) {
        const members = form.fragments.filter((f) => f.key === key);

        expect(members).toHaveLength(2);
        expect(members.map((f) => f.role).sort()).toEqual([
          'header',
          'payload',
        ]);
      }

      expect(form.fragments.filter((f) => (f.shift ?? 0) > 0)).toHaveLength(1);

      // Build the correct program: PAIR each key's members, SHIFT the one.
      let state = createProgramState();
      const context = {
        sets: {
          fragment: form.fragments.map((f) => f.id),
          key: ['K1', 'K2', 'K3'],
          amount: ['1', '2', '3'],
        },
      };

      for (const key of ['K1', 'K2', 'K3']) {
        const [a, b] = form.fragments.filter((f) => f.key === key);

        state = appendLine(
          state,
          M15_GRAMMAR,
          context,
          { verb: 'PAIR', args: [a.id, b.id] },
          'typed',
        ).state;
      }

      const shifted = form.fragments.find((f) => (f.shift ?? 0) > 0)!;

      // Without the shift: complete but NOT valid (one word off by rows).
      const partial = reconstructCipher(form, state.lines);

      expect(partial.complete).toBe(true);
      expect(partial.valid).toBe(false);
      expect(partial.relations_required).toBe(4);
      expect(partial.relations_constructed).toBe(3);
      expect(partial.relations_correct).toBe(3);
      expect(partial.rule_violations).toBe(0);

      state = appendLine(
        state,
        M15_GRAMMAR,
        context,
        { verb: 'SHIFT', args: [shifted.key, String(shifted.shift)] },
        'typed',
      ).state;

      const full = reconstructCipher(form, state.lines);

      expect(full.valid).toBe(true);
      expect(full.message).toEqual([...form.target]);
      expect(full.relations_constructed).toBe(4);
      expect(full.relations_correct).toBe(4);
      expect(full.rule_violations).toBe(0);
    });
  }

  test('rule violations are counted and remain revisable before submission', () => {
    const form = M15_FORMS.A;
    const context = {
      sets: {
        fragment: form.fragments.map((f) => f.id),
        key: ['K1', 'K2', 'K3'],
        amount: ['1', '2', '3'],
      },
    };
    let state = createProgramState();

    // Two headers paired (same role) and a shift on a +0 key: 2 violations.
    state = appendLine(
      state,
      M15_GRAMMAR,
      context,
      { verb: 'PAIR', args: ['F1', 'F3'] },
      'pointer',
    ).state;
    state = appendLine(
      state,
      M15_GRAMMAR,
      context,
      { verb: 'SHIFT', args: ['K1', '1'] },
      'typed',
    ).state;

    let reconstruction = reconstructCipher(form, state.lines);

    expect(reconstruction.rule_violations).toBe(2);
    expect(reconstruction.relations_correct).toBe(0);
    expect(reconstruction.complete).toBe(false);

    // Revise: remove both lines, then re-pair correctly — no residue.
    state = removeLine(state, 1).state;
    state = removeLine(state, 0).state;
    reconstruction = reconstructCipher(form, state.lines);
    expect(reconstruction.rule_violations).toBe(0);
    expect(reconstruction.relations_constructed).toBe(0);

    // A later PAIR involving an already-paired fragment supersedes (revision).
    state = appendLine(
      state,
      M15_GRAMMAR,
      context,
      { verb: 'PAIR', args: ['F3', 'F1'] },
      'pointer',
    ).state;
    state = appendLine(
      state,
      M15_GRAMMAR,
      context,
      { verb: 'PAIR', args: ['F3', 'F2'] },
      'pointer',
    ).state;
    reconstruction = reconstructCipher(form, state.lines);
    expect(reconstruction.keys.find((k) => k.key === 'K1')?.pair_correct).toBe(
      true,
    );
    expect(reconstruction.rule_violations).toBe(0);
  });

  test('volume versus relational complexity: M14 many units / one verb, M15 few units / interdependent rules', () => {
    expect(M14_FORMS.A.scored.length).toBeGreaterThan(
      M15_FORMS.A.fragments.length * 1.5,
    );
    expect(verbCount(M14_GRAMMAR)).toBe(1);
    expect(verbCount(M15_GRAMMAR)).toBe(2);
    // M15 words depend on TWO fragments and a shift (relational); an M14
    // packet's destination depends only on itself.
    const m15 = reconstructCipher(M15_FORMS.A, []);

    expect(m15.relations_required).toBe(4);
    expect(
      M14_FORMS.A.scored.every((p) => m14CorrectDestination(p) !== undefined),
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Part 2 — browser
 * ------------------------------------------------------------------ */

/** Completes the terminal orientation quickly (drag + typed), then leaves. */
async function completeTutorial(page: Page) {
  await walkAndUseStation(page, 'tutorial');
  await waitTerminalOpen(page, true);
  await dragChipToBin(page, 'T1', 'ARCHIVE');
  await waitBufferLength(page, 1);
  await typeCommand(page, 'ROUTE T2 RELAY');
  await typeCommand(page, 'ROUTE T3 ARCHIVE');
  await waitBufferLength(page, 3);
  await typeCommand(page, 'SUBMIT');
  expect((await ipModule(page, 'tutorial')).status).toBe('complete');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);
}

test.describe('M14 packet saturation (browser)', () => {
  test('practice → intake with drag, click and typed routing; omission, misroute and revision are distinct', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const errors = captureErrors(page);

    await bootIpLab(page, { game_session_id: 'GS_IP_M14_MIX', ip_form: 'A' });
    await completeTutorial(page);
    await walkAndUseStation(page, 'm14');
    await waitTerminalOpen(page, true);

    let probe = await terminalProbe(page);

    expect(probe.task).toBe('m14');
    expect(probe.stage).toContain('PRACTICE');
    expect(probe.chips).toHaveLength(4);
    expect(probe.bins.map((b) => b.id)).toEqual(['ARCHIVE', 'RELAY', 'HOLD']);

    // Practice: route all four (one wrong on purpose — practice is never
    // intake evidence), submit, begin intake.
    const practice = M14_FORMS.A.practice;

    for (const unit of practice.slice(0, 3)) {
      await dragChipToBin(page, unit.id, m14CorrectDestination(unit));
    }

    await typeCommand(page, `ROUTE ${practice[3].id} HOLD`);
    await waitBufferLength(page, 4);
    await clickTerminalButton(page, 'submit');
    probe = await terminalProbe(page);
    expect(probe.console.join(' ')).toMatch(/Practice recorded/);
    expect(probe.buttons.find((b) => b.id === 'BEGIN')).toBeTruthy();
    await clickTerminalButton(page, 'BEGIN');
    probe = await terminalProbe(page);
    expect(probe.stage).toContain('INTAKE');
    expect(probe.chips).toHaveLength(12);
    expect(probe.buffer).toHaveLength(0);

    // A refused typed command never touches the buffer and is recorded.
    await typeCommand(page, 'LAUNCH P1 RELAY');
    await typeCommand(page, 'ROUTE P1 NOWHERE');
    probe = await terminalProbe(page);
    expect(probe.buffer).toHaveLength(0);
    expect(probe.console[0]).toMatch(/not a valid|not a command/);

    // Intake: drag 5, click-compose 3, type 3 (one of them deliberately
    // wrong), leave one unrouted.
    const scored = M14_FORMS.A.scored;

    for (const unit of scored.slice(0, 5)) {
      await dragChipToBin(page, unit.id, m14CorrectDestination(unit));
    }

    for (const unit of scored.slice(5, 8)) {
      await composeByClick(page, [
        'ROUTE',
        unit.id,
        m14CorrectDestination(unit),
      ]);
    }

    await typeCommand(
      page,
      `ROUTE ${scored[8].id} ${m14CorrectDestination(scored[8])}`,
    );
    await typeCommand(
      page,
      `ROUTE ${scored[9].id} ${m14CorrectDestination(scored[9])}`,
    );
    // Wrong on purpose (P11 GAMMA → ARCHIVE instead of HOLD).
    await typeCommand(page, `ROUTE ${scored[10].id} ARCHIVE`);
    await waitBufferLength(page, 11);

    // First SUBMIT with one omission warns; nothing closes.
    await clickTerminalButton(page, 'submit');
    probe = await terminalProbe(page);
    expect(probe.closed).toBe(false);
    expect(probe.console.join(' ')).toMatch(
      /1 packet\(s\) have no instruction/,
    );

    // Revise the wrong one (later instruction supersedes) and route the
    // last; final SUBMIT closes the intake.
    await dragChipToBin(page, scored[10].id, 'HOLD');
    await dragChipToBin(page, scored[11].id, m14CorrectDestination(scored[11]));
    await waitBufferLength(page, 13);
    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);
    probe = await terminalProbe(page);
    expect(probe.closed).toBe(true);

    const m14 = await ipModule(page, 'm14');

    expect(m14.window_status).toBe('completed');
    expect(m14.units_presented).toBe(12);
    expect(m14.units_processed).toBe(12);
    expect(m14.units_correctly_routed).toBe(12);
    expect(m14.units_misrouted).toBe(0);
    expect(m14.units_omitted).toBe(0);
    expect(m14.units_revised).toBe(1);
    expect(m14.channels_used).toEqual(['ARCHIVE', 'HOLD', 'RELAY']);
    expect(m14.submission_count).toBe(2);
    expect(m14.submission_complete).toBe(true);
    expect(m14.input_mode).toBe('mixed');
    expect(m14.command_sequence_length).toBe(13);
    expect(
      (await ipValidity(page, 'proto_m14_packet_saturation')).validity,
    ).toBe('valid');

    const events = await ipEvents(page);
    const family = eventsOfFamily(events, 'proto_m14_packet');
    const types = family.map((event) => event.event_type);

    expect(types).toContain('proto_m14_packet_practice_submitted');
    expect(types).toContain('proto_m14_packet_intake_started');
    expect(
      family.filter((e) => e.event_type === 'proto_m14_packet_command_refused'),
    ).toHaveLength(2);
    expect(types).toContain('proto_m14_packet_submission_incomplete_warned');
    expect(types).toContain('proto_m14_packet_completed');
    expect(
      family
        .filter(
          (event) => event.event_type === 'proto_m14_packet_command_added',
        )
        .filter((event) => event.metadata?.stage === 'practice'),
    ).toHaveLength(4);
    expect(family.every((event) => event.episode === 'proto_m14_packet')).toBe(
      true,
    );
    expectProvisionalOnly(family);
    expect(eventsOfFamily(events, 'proto_m15_cipher')).toHaveLength(0);
    expect(eventsOfFamily(events, 'proto_m16_protocol')).toHaveLength(0);
    expectNoRuntimeErrors(errors);
  });

  test('skipping the orientation flags the intake entry state (invalid, never low)', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M14_NOTUT',
      ip_form: 'B',
      module: 'm14',
    });
    await waitTerminalOpen(page, true);

    const validity = await ipValidity(page, 'proto_m14_packet_saturation');

    expect(validity.validity).toBe('invalid');
    expect(validity.invalid_reason).toBe('invalid_entry_state');
    expect(validity.prior_exposure).toContain(
      'terminal_orientation_not_completed',
    );

    const events = await ipEvents(page);

    expect(
      eventsOfFamily(events, 'proto_m14_packet').map((e) => e.event_type),
    ).toContain('proto_m14_packet_entry_state_flagged');

    // The window still runs (no gating) — typed-only lane on form B.
    const probe = await terminalProbe(page);

    expect(probe.chips).toHaveLength(4);
  });
});

test.describe('M15 layered cipher (browser)', () => {
  test('pairs by drag, click and typing; shift; codebook consult; violation revised; valid reconstruction', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const errors = captureErrors(page);

    await bootIpLab(page, { game_session_id: 'GS_IP_M15_MIX', ip_form: 'A' });
    await completeTutorial(page);
    await walkAndUseStation(page, 'm15');
    await waitTerminalOpen(page, true);

    let probe = await terminalProbe(page);

    expect(probe.task).toBe('m15');
    expect(probe.chips).toHaveLength(6);
    expect(probe.bins).toHaveLength(0);
    expect(probe.buttons.find((b) => b.id === 'reference')?.label).toBe(
      'CODEBOOK',
    );

    // Consult the codebook (counted).
    await clickTerminalButton(page, 'reference');
    probe = await terminalProbe(page);
    expect(probe.help_open).toBe(true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // A violating pair (two headers), then remove it.
    await dragChipToChip(page, 'F1', 'F3');
    await waitBufferLength(page, 1);
    probe = await terminalProbe(page);
    expect(probe.buffer[0].text).toBe('PAIR F1 F3');
    await clickTerminalButton(page, 'clear');
    await waitBufferLength(page, 0);

    // K1 by drag, K2 by click-composition, K3 typed.
    await dragChipToChip(page, 'F3', 'F2');
    await waitBufferLength(page, 1);
    await composeByClick(page, ['PAIR', 'F1', 'F5']);
    await waitBufferLength(page, 2);
    await typeCommand(page, 'PAIR F6 F4');
    await waitBufferLength(page, 3);
    probe = await terminalProbe(page);
    expect(probe.output.join(' ')).toContain('CORE');
    expect(probe.output.join(' ')).toContain('HOLDING');
    expect(probe.output.join(' ')).toContain('STABLE'); // K2 before the shift

    // Shift K2 by 2 → SEALED; message complete; submit.
    await composeByClick(page, ['SHIFT', 'K2', '2']);
    await waitBufferLength(page, 4);
    probe = await terminalProbe(page);
    expect(probe.output.join(' ')).toContain('MESSAGE: CORE SEALED HOLDING');
    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);
    probe = await terminalProbe(page);
    expect(probe.closed).toBe(true);

    const m15 = await ipModule(page, 'm15');

    expect(m15.window_status).toBe('completed');
    expect(m15.rules_presented).toBe(4);
    expect(m15.relations_required).toBe(4);
    expect(m15.relations_constructed).toBe(4);
    expect(m15.relations_correct_at_submission).toBe(4);
    expect(m15.rule_violations_at_submission).toBe(0);
    expect(m15.command_sequence_length).toBe(4);
    expect(m15.revisions).toBe(1); // the cleared violating pair
    expect(m15.codebook_consults).toBe(1);
    expect(m15.final_reconstruction_valid).toBe(true);
    expect(m15.final_message).toEqual(['CORE', 'SEALED', 'HOLDING']);
    expect(m15.input_mode).toBe('mixed');
    expect((await ipValidity(page, 'proto_m15_layered_cipher')).validity).toBe(
      'valid',
    );

    const events = await ipEvents(page);
    const family = eventsOfFamily(events, 'proto_m15_cipher');

    expect(family.map((e) => e.event_type)).toContain(
      'proto_m15_cipher_codebook_consulted',
    );
    expect(family.map((e) => e.event_type)).toContain(
      'proto_m15_cipher_completed',
    );
    expect(family.every((event) => event.episode === 'proto_m15_cipher')).toBe(
      true,
    );
    expectProvisionalOnly(family);
    expect(eventsOfFamily(events, 'proto_m14_packet')).toHaveLength(0);
    expectNoRuntimeErrors(errors);
  });

  test('typed-only lane on form B reaches the valid reconstruction; incomplete submission warns first', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M15_TYPED',
      ip_form: 'B',
      module: 'm15',
    });
    await waitTerminalOpen(page, true);

    await typeCommand(page, 'PAIR F5 F6');
    await typeCommand(page, 'PAIR F2 F3');
    await waitBufferLength(page, 2);

    // Incomplete: warned, not closed.
    await typeCommand(page, 'SUBMIT');

    let probe = await terminalProbe(page);

    expect(probe.closed).toBe(false);
    expect(probe.console.join(' ')).toMatch(/not complete/);

    await typeCommand(page, 'PAIR F4 F1');
    await typeCommand(page, 'SHIFT K3 2');
    await waitBufferLength(page, 4);
    probe = await terminalProbe(page);
    expect(probe.output.join(' ')).toContain('MESSAGE: ANCHOR FEED SOUTH');
    await typeCommand(page, 'SUBMIT');
    probe = await terminalProbe(page);
    expect(probe.closed).toBe(true);

    const m15 = await ipModule(page, 'm15');

    expect(m15.final_reconstruction_valid).toBe(true);
    expect(m15.input_mode).toBe('typed');
    expect(m15.submission_count).toBe(2);
    expect(
      (await ipValidity(page, 'proto_m15_layered_cipher')).invalid_reason,
    ).toBe('invalid_entry_state');
  });
});

/* ------------------------------------------------------------------ *
 * Unit 4 — M16 protocol update and M17 syntax acquisition
 * ------------------------------------------------------------------ */

test.describe('M16 / M17 forms (pure)', () => {
  test('M16 forms matched: 3 base, 6 application, 3 rule-governed; update differs from base', () => {
    for (const formId of ['A', 'B'] as const) {
      const form = M16_FORMS[formId];

      expect(form.base).toHaveLength(3);
      expect(form.apply).toHaveLength(6);
      expect(
        form.apply.filter((r) => r.flags?.includes('CRITICAL')),
      ).toHaveLength(3);
      expect(form.base.some((r) => r.flags?.includes('CRITICAL'))).toBe(false);

      const changed = form.apply.filter(
        (r) => m16BaseDestination(r) !== m16UpdatedDestination(r),
      );

      expect(changed.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('M17 has its own grammar and sixteen matched trials — two baseline, twelve learning, two transfer — two operators each (Station 080 Unit 9)', () => {
    const decoderVerbs = new Set([
      ...M14_GRAMMAR.verbs.map((v) => v.verb),
      ...M15_GRAMMAR.verbs.map((v) => v.verb),
      ...M16_GRAMMAR.verbs.map((v) => v.verb),
    ]);

    for (const verb of M17_GRAMMAR.verbs) {
      expect(decoderVerbs.has(verb.verb)).toBe(false);
    }

    for (const formId of ['A', 'B'] as const) {
      const trials = M17_FORMS[formId].trials;

      expect(trials).toHaveLength(16);
      expect(trials.filter((t) => t.phase === 'baseline')).toHaveLength(2);
      expect(trials.filter((t) => t.phase === 'learning')).toHaveLength(12);
      expect(trials.filter((t) => t.phase === 'transfer')).toHaveLength(2);

      for (const t of trials) {
        expect(t.reference).toHaveLength(2);
        expect(
          evaluateTrial(t, linesOf(t.reference)).goal_reached,
          `${formId} trial ${t.index}`,
        ).toBe(true);
        expect(evaluateTrial(t, []).goal_reached).toBe(false);
      }
    }

    // Operator mix matched trial by trial across forms.
    for (let i = 0; i < 16; i++) {
      const mixA = M17_FORMS.A.trials[i].reference
        .map((r) => r.split(' ')[0])
        .sort();
      const mixB = M17_FORMS.B.trials[i].reference
        .map((r) => r.split(' ')[0])
        .sort();

      expect(mixA).toEqual(mixB);
    }
  });
});

test.describe('M16 protocol update (browser)', () => {
  test('base familiarisation → READY → reveal → ACKNOWLEDGE → first application captured separately', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const errors = captureErrors(page);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M16',
      ip_form: 'A',
      module: 'm16',
    });
    await waitTerminalOpen(page, true);

    let probe = await terminalProbe(page);

    expect(probe.stage).toContain('FAMILIARISATION');
    expect(probe.chips).toHaveLength(3);
    // The new rule is absent before the reveal.
    expect(probe.codebook.join(' ')).not.toMatch(/CRITICAL|HOLD/);
    expect(probe.chips.some((c) => c.label.includes('CRITICAL'))).toBe(false);

    await dragChipToBin(page, 'B1', 'ARCHIVE');
    await typeCommand(page, 'ROUTE B2 RELAY');
    await typeCommand(page, 'ROUTE B3 ARCHIVE');
    await waitBufferLength(page, 3);
    await clickTerminalButton(page, 'submit');
    probe = await terminalProbe(page);
    expect(probe.console.join(' ')).toMatch(/Familiarisation recorded: 3 of 3/);
    await clickTerminalButton(page, 'READY');
    probe = await terminalProbe(page);
    expect(probe.stage).toBe('PROTOCOL UPDATE');
    expect(probe.codebook.join(' ')).toContain('!CRITICAL → HOLD');
    expect(probe.chips).toHaveLength(0);

    let m16 = await ipModule(page, 'm16');

    expect(m16.new_rule_presented).toBe(true);
    expect(m16.new_rule_acknowledged).toBe(false);

    // Commands are not accepted during the reveal.
    await typeCommand(page, 'ROUTE R1 HOLD');
    probe = await terminalProbe(page);
    expect(probe.buffer).toHaveLength(0);

    await clickTerminalButton(page, 'ACKNOWLEDGE');
    probe = await terminalProbe(page);
    expect(probe.stage).toBe('APPLY UPDATED PROTOCOL');
    expect(probe.chips).toHaveLength(6);
    expect(
      probe.chips.filter((c) => c.label.includes('!CRITICAL')),
    ).toHaveLength(3);

    // First application on a rule-governed report: deliberately the OLD
    // rule (wrong), then revised.
    await dragChipToBin(page, 'R2', 'ARCHIVE');
    await waitBufferLength(page, 1);
    m16 = await ipModule(page, 'm16');
    expect(m16.first_application_correct).toBe(false);
    expect(m16.new_rule_errors).toBe(1);
    await dragChipToBin(page, 'R2', 'HOLD');
    await typeCommand(page, 'ROUTE R1 RELAY');
    await typeCommand(page, 'ROUTE R3 ARCHIVE');
    await typeCommand(page, 'ROUTE R4 HOLD');
    await typeCommand(page, 'ROUTE R5 HOLD');
    await clickTerminalButton(page, 'reference'); // PROTOCOL consult (counted)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    await typeCommand(page, 'ROUTE R6 RELAY');
    await waitBufferLength(page, 7);
    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);
    probe = await terminalProbe(page);
    expect(probe.closed).toBe(true);

    m16 = await ipModule(page, 'm16');
    expect(m16.window_status).toBe('completed');
    expect(m16.base_protocol_complete).toBe(true);
    expect(m16.new_rule_id).toBe('critical_override_hold');
    expect(m16.new_rule_acknowledged).toBe(true);
    expect(m16.first_application_correct).toBe(false);
    expect(m16.final_applications_correct).toBe(3);
    expect(m16.applications_governed).toBe(3);
    expect(m16.new_rule_errors).toBe(1);
    expect(m16.revisions_after_rule_presentation).toBe(1);
    expect(m16.codebook_consults_after_rule_presentation).toBe(1);
    expect(m16.units_correct).toBe(6);
    expect(m16.input_mode).toBe('mixed');
    expect(m16.active_ms_after_ready as number).toBeGreaterThan(0);
    expect(m16.active_ms_after_ready as number).toBeLessThan(
      m16.active_ms as number,
    );

    const events = await ipEvents(page);
    const types = eventsOfFamily(events, 'proto_m16_protocol').map(
      (e) => e.event_type,
    );
    const order = [
      'proto_m16_protocol_base_submitted',
      'proto_m16_protocol_ready_acknowledged',
      'proto_m16_protocol_new_rule_presented',
      'proto_m16_protocol_new_rule_acknowledged',
      'proto_m16_protocol_first_application',
      'proto_m16_protocol_submitted',
      'proto_m16_protocol_completed',
    ].map((type) => types.indexOf(type));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expectProvisionalOnly(eventsOfFamily(events, 'proto_m16_protocol'));
    expect(eventsOfFamily(events, 'proto_m15_cipher')).toHaveLength(0);
    expect(eventsOfFamily(events, 'proto_m17_trials')).toHaveLength(0);
    expectNoRuntimeErrors(errors);
  });
});

// The M17 browser flow lives in e2e/m17_trials_route.spec.ts (Unit 9).
test.describe.skip('M17 syntax acquisition (browser, v2 — superseded)', () => {
  test('demonstration → READY → one practice case with feedback → one changed transfer case; attempt-level records preserved, no learning score', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const errors = captureErrors(page);

    await bootIpLab(page, { game_session_id: 'GS_IP_M17', ip_form: 'A' });
    await completeTutorial(page);
    await walkAndUseStation(page, 'm17');
    await waitTerminalOpen(page, true);

    let probe = await terminalProbe(page);

    expect(probe.stage).toBe('DEMONSTRATION');
    expect(probe.output.join(' ')).toContain('VEK B RED');
    expect(probe.submit_enabled).toBe(false);
    await clickTerminalButton(page, 'READY');
    probe = await terminalProbe(page);
    expect(probe.stage).toBe('PRACTICE');
    expect(probe.chips.map((c) => c.id)).toEqual(['A', 'B', 'C']);

    // Practice attempt 1: a syntax error first (refused, counted), then a
    // wrong second operator → corrective feedback with the reference.
    await typeCommand(page, 'VEK Q RED');
    await typeCommand(page, 'ZOR A B');
    await composeByClick(page, ['VEK', 'C', 'RED']);
    await waitBufferLength(page, 2);
    await clickTerminalButton(page, 'submit');
    probe = await terminalProbe(page);
    expect(probe.stage).toBe('PRACTICE');
    expect(probe.console.join(' ')).toMatch(
      /does not match GOAL.*Reference sequence/,
    );

    // Practice attempt 2: a correction, then the goal.
    await typeCommand(page, 'REMOVE 2');
    await typeCommand(page, 'VEK C GRN');
    await waitBufferLength(page, 2);
    probe = await terminalProbe(page);
    expect(probe.output.join(' ')).toContain('NOW    A:NUL  B:RED  C:GRN');
    await clickTerminalButton(page, 'submit');
    probe = await terminalProbe(page);
    expect(probe.console.join(' ')).toMatch(/matches GOAL/);
    expect(probe.stage).toBe('PRACTICE RECORDED');
    await clickTerminalButton(page, 'NEXT');

    // Transfer: the demonstration can be reviewed; no corrective feedback.
    probe = await terminalProbe(page);
    expect(probe.stage).toBe('TRANSFER');
    await clickTerminalButton(page, 'reference');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await typeCommand(page, 'ZOR A C');
    await typeCommand(page, 'KAI B');
    await waitBufferLength(page, 2);
    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);
    probe = await terminalProbe(page);
    expect(probe.closed).toBe(true);
    expect(probe.console.join(' ')).not.toMatch(/Reference sequence/);

    const m17 = await ipModule(page, 'm17');
    const attempts = m17.attempts as Record<string, unknown>[];

    expect(m17.window_status).toBe('completed');
    expect(m17.trials_completed).toBe(2);
    expect(attempts.map((t) => [t.trial_type, t.attempt])).toEqual([
      ['feedback', 1],
      ['feedback', 2],
      ['transfer', 1],
    ]);
    expect(attempts.map((t) => t.feedback_presented)).toEqual([
      true,
      true,
      false,
    ]);
    expect(attempts.map((t) => t.goal_reached)).toEqual([false, true, true]);
    expect(attempts[0].syntax_errors).toBe(1);
    expect(attempts[0].semantic_errors).toBe(1);
    expect(attempts[0].commands_correct).toBe(1);
    expect(attempts[0].input_mode).toBe('mixed');
    expect(attempts[1].corrections_before_submission).toBe(1);
    expect(attempts[2].demonstration_reviews).toBe(1);
    expect(m17.practice_attempts).toBe(2);
    expect(m17.practice_criterion_met).toBe(true);
    expect(m17.transfer_attempts).toBe(1);
    expect(m17.transfer_first_attempt_goal_reached).toBe(true);
    expect(m17.demonstration_exposures).toBe(2);
    expect(
      attempts.every(
        (t) => t.commands_required === 2 && t.trial_complete === true,
      ),
    ).toBe(true);
    expect(attempts.every((t) => (t.active_ms_after_ready as number) > 0)).toBe(
      true,
    );
    expect(Object.keys(m17).join(' ')).not.toMatch(/slope|score/i);
    expect(
      (await ipValidity(page, 'proto_m17_syntax_acquisition')).validity,
    ).toBe('valid');

    const events = await ipEvents(page);
    const family = eventsOfFamily(events, 'proto_m17_syntax');

    expect(
      family.filter((e) => e.event_type === 'proto_m17_syntax_trial_started'),
    ).toHaveLength(2);
    expect(
      family.filter((e) => e.event_type === 'proto_m17_syntax_trial_submitted'),
    ).toHaveLength(3);
    expect(
      family.filter(
        (e) => e.event_type === 'proto_m17_syntax_feedback_presented',
      ),
    ).toHaveLength(2);
    expect(
      family.filter(
        (e) => e.event_type === 'proto_m17_syntax_demonstration_viewed',
      ),
    ).toHaveLength(1);
    expect(
      family
        .filter((e) => e.event_type === 'proto_m17_syntax_trial_submitted')
        .map((e) => e.metadata?.trial_index),
    ).toEqual([1, 1, 2]);
    expectProvisionalOnly(family);
    expect(eventsOfFamily(events, 'proto_m16_protocol')).toHaveLength(0);
    expectNoRuntimeErrors(errors);
  });
});
