/**
 * Station 080 M17 — the sixteen-trial learning series at the Training Rig
 * (Unit 9, browser). DEV laboratory launch (the orientation completed
 * first, as the entry-state gate requires), real typed AND pointer
 * composition through the Signal Terminal.
 *
 * Test 1 (full series): DEMONSTRATION → READY → two baseline probes (no
 * NOW preview, no feedback whatever the answer) → twelve learning trials
 * (preview; corrective feedback after SUBMIT; NEXT continues; the run of
 * three ends at learning trial 4; all twelve run on) → two transfer probes
 * (no preview, no feedback; the demonstration reviewed once) → closed as
 * completed; the raw family reproduces {criterion_trial 4, attained} with
 * the sequence companion apart.
 *
 * Test 2 (early stop): two learning responses without attainment, then
 * STOP TASK confirmed — the window closes `exited`, the feature is
 * `incomplete` (never non-attainment) with the partial sequence exported.
 *
 * No participant-visible study identifier or evaluative wording.
 */
import { expect, type Page, test } from '@playwright/test';

import { M17_FORMS } from '../src/informationProcessing/syntaxForms';
import { extractItemFeatures } from '../src/measurement/features';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { FORBIDDEN_TEXT } from './exteriorHelpers';
import {
  bootIpLab,
  clickTerminalButton,
  composeByClick,
  dragChipToBin,
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

const TRIALS = M17_FORMS.A.trials;

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

/** Types the reference solution of trial `index` (0-based). */
async function typeReference(page: Page, index: number) {
  for (const line of TRIALS[index].reference) {
    await typeCommand(page, line);
  }

  await waitBufferLength(page, 2);
}

/** A well-formed wrong answer (never a reference solution of any trial). */
async function typeWrong(page: Page) {
  await typeCommand(page, 'KAI A');
  await typeCommand(page, 'KAI B');
  await waitBufferLength(page, 2);
}

async function openRig(page: Page, session: string) {
  await bootIpLab(page, { game_session_id: session, ip_form: 'A' });
  await completeTutorial(page);
  await walkAndUseStation(page, 'm17');
  await waitTerminalOpen(page, true);
}

test.describe('M17 learning series on the training rig', () => {
  test('two uncoached baseline probes, twelve feedback learning trials with the run of three at trial 4, two transfer probes; reproduced criterion pair with the sequence apart', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await openRig(page, 'GS_M17_TRIALS_A');

    let probe = await terminalProbe(page);

    expect(probe.stage).toBe('DEMONSTRATION');
    expect(probe.output.join(' ')).toContain('VEK B RED');
    expect(probe.submit_enabled).toBe(false);
    expect(`${probe.console.join(' ')} ${probe.output.join(' ')}`).not.toMatch(
      FORBIDDEN_TEXT,
    );
    await clickTerminalButton(page, 'READY');
    probe = await terminalProbe(page);
    expect(probe.stage).toBe('BASELINE');
    expect(probe.chips.map((c) => c.id)).toEqual(['A', 'B', 'C']);
    // No NOW preview on a baseline probe.
    expect(probe.output.some((line) => line.startsWith('NOW'))).toBe(false);
    expect(probe.output.join(' ')).toContain('BASELINE 1 of 2');
    await page.screenshot({ path: 'test-results/m17-baseline-800x600.png' });

    // Baseline 1 correct (typed), baseline 2 wrong (pointer): no feedback either way.
    await typeReference(page, 0);
    await clickTerminalButton(page, 'submit');
    probe = await terminalProbe(page);
    expect(probe.console.join(' ')).not.toMatch(
      /matches GOAL|Reference sequence/,
    );
    expect(probe.output.join(' ')).toContain('BASELINE 2 of 2');
    await composeByClick(page, ['KAI', 'A']);
    await composeByClick(page, ['KAI', 'B']);
    await waitBufferLength(page, 2);
    await clickTerminalButton(page, 'submit');
    probe = await terminalProbe(page);
    expect(probe.stage).toBe('LEARNING');
    expect(probe.console.join(' ')).not.toMatch(
      /matches GOAL|Reference sequence/,
    );
    // The learning trials carry the NOW preview.
    expect(probe.output.some((line) => line.startsWith('NOW'))).toBe(true);

    // Learning: 1 wrong (reference shown), 2–4 correct (run of three ends
    // at 4), then the rest mixed — all twelve run.
    const plan = [
      false,
      true,
      true,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      true,
    ];

    for (const [i, correct] of plan.entries()) {
      if (correct) {
        await typeReference(page, 2 + i);
      } else {
        await typeWrong(page);
      }

      await clickTerminalButton(page, 'submit');
      probe = await terminalProbe(page);
      expect(probe.stage).toBe('FEEDBACK');
      expect(probe.console.join(' ')).toMatch(
        correct ? /matches GOAL/ : /does not match GOAL.*Reference sequence/,
      );
      expect(probe.console.join(' ')).not.toMatch(FORBIDDEN_TEXT);

      if (i === 0) {
        await page.screenshot({
          path: 'test-results/m17-learning-feedback-800x600.png',
        });
      }

      await clickTerminalButton(page, 'NEXT');
    }

    const events1 = await ipEvents(page);
    const reached = events1.filter(
      (e) => e.event_type === 'proto_m17_trials_criterion_run_reached',
    );

    expect(reached).toHaveLength(1);
    expect(reached[0].metadata).toMatchObject({ learning_trial: 4, run: 3 });

    // Transfer: no preview, no feedback; the demonstration reviewed once.
    probe = await terminalProbe(page);
    expect(probe.stage).toBe('TRANSFER');
    expect(probe.output.some((line) => line.startsWith('NOW'))).toBe(false);
    await clickTerminalButton(page, 'reference');
    await page.waitForTimeout(250);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await typeReference(page, 14);
    await clickTerminalButton(page, 'submit');
    probe = await terminalProbe(page);
    expect(probe.console.join(' ')).not.toMatch(
      /matches GOAL|Reference sequence/,
    );
    await typeWrong(page);
    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);
    probe = await terminalProbe(page);
    expect(probe.closed).toBe(true);
    expect(probe.console.join(' ')).toContain('All sixteen trials recorded');
    await page.keyboard.press('Escape');
    await waitTerminalOpen(page, false);

    const m17 = await ipModule(page, 'm17');
    const records = m17.trials as Record<string, unknown>[];

    expect(m17.window_status).toBe('completed');
    expect(m17.trials_completed).toBe(16);
    expect(m17.criterion_run_trial).toBe(4);
    expect(m17.sequence).toEqual({
      baseline: [true, false],
      learning: plan,
      transfer: [true, false],
    });
    expect(records.filter((t) => t.feedback_presented)).toHaveLength(12);
    expect(records[1].input_mode).toBe('pointer');
    expect(records[14].demonstration_reviews).toBe(1);
    expect(records.every((t) => (t.active_ms as number) >= 0)).toBe(true);
    expect(
      records
        .filter((t) => t.phase === 'learning')
        .every((t) => typeof t.feedback_read_ms === 'number'),
    ).toBe(true);
    expect(m17.demonstration_exposures).toBe(2);
    expect(Object.keys(m17).join(' ')).not.toMatch(/slope|score|speed/i);
    expect((await ipValidity(page, 'proto_m17_criterion')).validity).toBe(
      'valid',
    );

    // Independent reproduction from the raw family alone.
    const events = await ipEvents(page);
    const family = eventsOfFamily(events, 'proto_m17_trials');

    expectProvisionalOnly(family);
    expect(
      family.filter((e) => e.event_type === 'proto_m17_trials_trial_submitted'),
    ).toHaveLength(16);
    expect(
      family.filter(
        (e) => e.event_type === 'proto_m17_trials_feedback_presented',
      ),
    ).toHaveLength(12);
    expect(
      family.filter((e) => e.event_type === 'proto_m17_trials_phase_started'),
    ).toHaveLength(3);
    expect(eventsOfFamily(events, 'proto_m17_syntax')).toHaveLength(0);

    const rows = extractItemFeatures(
      'M17',
      family as unknown as RawGameEvent[],
      { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false },
    );

    expect(rows[0]).toMatchObject({
      feature_id: 'm17_criterion_trial',
      value: { criterion_trial: 4, attained: true },
      numerator: 4,
      disposition: 'observed',
      censored: false,
      closure_reason: 'completed',
    });
    expect(rows[0].components).toMatchObject({
      complete_sequence: true,
      recount_agrees: true,
      learning_responses: 12,
    });
    expect(rows[1].value).toMatchObject({
      baseline: [true, false],
      learning: plan,
      transfer: [true, false],
      feedback_exposures: 12,
      demonstration_reviews: 1,
    });
    expectNoRuntimeErrors(errors);
  });

  test('early stop after two learning responses without attainment: the window closes exited and the feature is incomplete with the partial sequence', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const errors = captureErrors(page);

    await openRig(page, 'GS_M17_TRIALS_B');
    await clickTerminalButton(page, 'READY');
    await typeWrong(page);
    await clickTerminalButton(page, 'submit');
    await typeReference(page, 1);
    await clickTerminalButton(page, 'submit');
    await typeReference(page, 2);
    await clickTerminalButton(page, 'submit');
    await clickTerminalButton(page, 'NEXT');
    await typeWrong(page);
    await clickTerminalButton(page, 'submit');
    await clickTerminalButton(page, 'NEXT');

    // An empty SUBMIT is refused without a record.
    await clickTerminalButton(page, 'submit');

    let probe = await terminalProbe(page);

    expect(probe.console.join(' ')).toContain('Add two operators');
    expect(probe.stage).toBe('LEARNING');

    // One line is refused as well (exactly two operators), and a stage
    // word typed mid-trial is refused without a syntax error.
    await typeCommand(page, 'KAI A');
    await waitBufferLength(page, 1);
    await clickTerminalButton(page, 'submit');
    probe = await terminalProbe(page);
    expect(probe.console.join(' ')).toContain('Exactly two operators');
    await typeCommand(page, 'NEXT');
    probe = await terminalProbe(page);
    expect(probe.console.join(' ')).toContain('NEXT is not available now');
    await typeCommand(page, 'CLEAR');

    // STOP TASK, confirmed with ENTER.
    await clickTerminalButton(page, 'stop');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    probe = await terminalProbe(page);
    expect(probe.closed).toBe(true);

    const m17 = await ipModule(page, 'm17');

    expect(m17.window_status).toBe('exited');
    expect(m17.trials_completed).toBe(4);
    expect(m17.criterion_run_trial).toBeNull();
    expect(m17.submit_refusals).toBe(2);

    const events = await ipEvents(page);
    const family = eventsOfFamily(events, 'proto_m17_trials');
    const rows = extractItemFeatures(
      'M17',
      family as unknown as RawGameEvent[],
      { finalCoreClosed: false, pageLoadIndex: 1, reloaded: false },
    );

    expect(rows[0]).toMatchObject({
      value: null,
      disposition: 'incomplete',
      censored: false,
      closure_reason: 'voluntary_stop',
    });
    expect(rows[0].components).toMatchObject({
      learning_correct: [true, false],
      learning_responses: 2,
      complete_sequence: false,
    });
    expect(rows[1].value).toMatchObject({
      baseline: [false, true],
      learning: [true, false],
      transfer: [],
    });
    expectNoRuntimeErrors(errors);
  });
});
