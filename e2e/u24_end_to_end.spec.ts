/**
 * U24 Part B — the connected route end to end (verification plan, Part B).
 *
 * S1 (engaged route) at 800 × 600 and 1280 × 720 and S2 (minimal route) at
 * 800 × 600 are ORDINARY PLAY from the Dock (real keyboard and pointer
 * input through `e2e/u24Helpers.ts`), with:
 * - V-1: the per-stage log (stage, zone, elapsed time, input counts);
 * - V-6: frames with a JSON sidecar written before each capture, the named
 *   U23 mast-prompt item included (S1 only);
 * - the participant export captured on the same-origin mock ingest (every
 *   non-localhost request aborted) and saved byte for byte;
 * - V-4 L1 (same code, determinism): the export's `raw_events` re-extracted
 *   in the test process must equal its `measurement_features`;
 * - V-4 L2 (SCENARIO expectation, not a raw-event reproduction): the
 *   primary rows against the expectation hand-derived in `u24Helpers.ts`.
 * Layer R (the independent raw-event recount) is Part C (RC-1 = a).
 *
 * Evidence goes to `$U24_EVIDENCE_DIR/B` when the launcher's variable is
 * set, otherwise to `test-results/u24`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { extractMeasurementFeatures } from '../src/measurement/features';
import { primaryFeatureIds } from '../src/measurement/registerV3';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import { untoleratedMeasurementEvents } from './pilotHelpers';
import {
  bootU24,
  type CapturedExport,
  compareL2,
  episode1Engaged,
  episode2Engaged,
  episode3Engaged,
  episode4Engaged,
  episode5Engaged,
  episode6Closure,
  frame,
  FrameRecorder,
  installPipeline,
  instrumentInput,
  type L2Expectation,
  type Pipeline,
  S1_EXPECTATION,
  S2_EXPECTATION,
  type S4Record,
  scenarioS2,
  scenarioS3,
  scenarioS4,
  scenarioS5,
  StageLog,
  useFrames,
} from './u24Helpers';

const OUT = process.env.U24_EVIDENCE_DIR
  ? join(process.env.U24_EVIDENCE_DIR, 'B')
  : 'test-results/u24';

function write(relative: string, content: string) {
  const path = join(OUT, relative);

  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
}

interface ExportedFeature {
  feature_id: string;
  role: string;
  value: unknown;
  numerator: number | null;
  denominator: number | null;
  disposition: string;
}

async function pilotStage(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __pilotProbe?: { stage: string } | null })
        .__pilotProbe?.stage ?? null,
  );
}

/** The completion export (full, terminal) among the captured requests. */
async function completionExport(pipeline: Pipeline): Promise<CapturedExport> {
  await expect
    .poll(
      () =>
        pipeline.exports.filter(
          (captured) => captured.envelope.session_status === 'completed',
        ).length,
      { timeout: 60_000 },
    )
    .toBeGreaterThanOrEqual(1);

  return pipeline.exports.find(
    (captured) => captured.envelope.session_status === 'completed',
  )!;
}

/**
 * Saves the export byte for byte and runs L1 and L2 on it. L1 re-extracts
 * the export's own raw events with the production extractor (same code:
 * determinism and log-only derivation — not independence); L2 compares
 * the primary rows with the scenario expectation.
 */
function reproduce(
  name: string,
  captured: CapturedExport,
  expectation: readonly L2Expectation[],
) {
  write(`exports/${name}.json`, captured.body);

  const payload = captured.envelope.payload as {
    raw_events: RawGameEvent[];
    raw_events_omitted?: boolean;
    page_load_index: number;
    measurement_features: ExportedFeature[];
  };

  expect(payload.raw_events_omitted ?? false, 'a full envelope').toBe(false);

  // L1 — the scenario ends after the station-record closure (the review),
  // so the extraction context is the closed record of this page load.
  const context = {
    finalCoreClosed: true,
    pageLoadIndex: payload.page_load_index,
    reloaded: payload.page_load_index > 1,
  };
  const again = extractMeasurementFeatures(payload.raw_events, context);
  const l1Equal =
    JSON.stringify(again) === JSON.stringify(payload.measurement_features);

  write(
    `reproduction/${name}-L1.json`,
    JSON.stringify(
      {
        layer:
          'L1 — same code (determinism, log-only derivation; NOT independence)',
        context,
        rows: payload.measurement_features.length,
        byte_equal: l1Equal,
        reextracted: again,
      },
      null,
      1,
    ),
  );

  // L2 — the scenario expectation against the exported primary rows.
  const primaries = payload.measurement_features.filter(
    (feature) => feature.role === 'primary',
  );
  const l2 = compareL2(expectation, primaries);

  write(
    `reproduction/${name}-L2.json`,
    JSON.stringify(
      {
        layer:
          'L2 — scenario expectation (hand-derived from the register formulas and the scripted choices; NOT a raw-event reproduction)',
        matched: l2.filter((row) => row.match).length,
        of: l2.length,
        rows: l2,
      },
      null,
      1,
    ),
  );

  expect(l1Equal, 'L1: re-extraction equals the exported features').toBe(true);

  for (const row of l2) {
    expect
      .soft(row.mismatches, `L2 ${row.feature_id}: ${row.expected.basis}`)
      .toEqual([]);
  }

  return { payload, l2 };
}

test.describe('U24 — pure checks', () => {
  test('B-8 negative probe: system records are tolerated only by exact type and system input; a participant-driven record still fails', () => {
    const system = (event_type: string) => ({
      event_type,
      metadata: { input_mode: 'system' },
    });

    expect(
      untoleratedMeasurementEvents([
        system('proto_m11_custody_offer_lapsed'),
        system('proto_m11_custody_opportunity_opened'),
        system('proto_m11_custody_window_closed'),
        system('proto_m19_lines_closed_unopened'),
        system('proto_m20_feed_closed_unopened'),
        system('proto_m04_cutting_listed'),
        { event_type: 'proto_m05_start_presented', metadata: {} },
      ]),
    ).toEqual([]);
    // A participant-driven record of a LISTED type (keyboard), a declined
    // job (the participant's answer), and an unlisted system record: each
    // still fails — nothing is tolerated by prefix.
    expect(
      untoleratedMeasurementEvents([
        {
          event_type: 'proto_m11_custody_window_closed',
          metadata: { input_mode: 'keyboard' },
        },
        {
          event_type: 'proto_m05_start_offer_answered',
          metadata: { input_mode: 'keyboard', accepted: false },
        },
        system('proto_m11_custody_resolved'),
        { event_type: 'proto_m19_lines_closed_unopened', metadata: {} },
      ]),
    ).toEqual([
      'proto_m11_custody_window_closed',
      'proto_m05_start_offer_answered',
      'proto_m11_custody_resolved',
      'proto_m19_lines_closed_unopened',
    ]);
  });

  test('L2 is a scenario expectation: u24Helpers imports nothing from src/measurement/features, and it names all 26 primary features once', () => {
    const source = readFileSync('e2e/u24Helpers.ts', 'utf8');
    const specifiers = [...source.matchAll(/from '([^']+)'/g)].map(
      (match) => match[1],
    );

    // Every import, static or dynamic, by its specifier (the module's own
    // comments may name the boundary).
    const dynamic = [
      ...source.matchAll(/(?:import|require)\(\s*'([^']+)'/g),
    ].map((match) => match[1]);

    expect(
      [...specifiers, ...dynamic].filter((s) => s.includes('measurement')),
    ).toEqual([]);

    const primaries = primaryFeatureIds();

    expect(primaries).toHaveLength(26);

    for (const expectation of [S1_EXPECTATION, S2_EXPECTATION]) {
      expect(expectation.map((row) => row.feature_id)).toEqual(primaries);
    }
  });
});

for (const viewport of [
  { width: 800, height: 600 },
  { width: 1280, height: 720 },
]) {
  const vp = `${viewport.width}x${viewport.height}`;

  test(`S1 engaged route at ${viewport.width} × ${viewport.height}: ordinary play from the Dock to the stable Core, every row worked; frames; the participant export; L1 and L2`, async ({
    page,
  }) => {
    test.setTimeout(10_800_000);

    const errors = captureErrors(page);

    await page.setViewportSize(viewport);

    const pipeline = await installPipeline(page);
    const counts = instrumentInput(page);
    const log = new StageLog(page, counts);

    useFrames(new FrameRecorder(page, join(OUT, 'frames', vp), vp));

    try {
      await bootU24(page, {
        participant_id: 'PT_U24_S1',
        game_session_id: 'GS_U24_S1',
      });
      await log.mark('boot (Dock)');

      for (const [name, run] of [
        ['episode 1 — Concourse', episode1Engaged],
        ['episode 2 — Records Workshop', episode2Engaged],
        ['episode 3 — Diagnostics Laboratory', episode3Engaged],
        ['episode 4 — Recovery Yard', episode4Engaged],
        ['episode 5 — return, revision, handover', episode5Engaged],
        ['episode 6 — Utility Deck and Core', episode6Closure],
      ] as const) {
        await run(page);
        await log.mark(name);
      }
    } finally {
      useFrames(null);
      write(
        `stage-logs/S1-${vp}.json`,
        JSON.stringify(
          { scenario: 'S1', viewport: vp, records: log.records },
          null,
          1,
        ),
      );
      write(
        `stage-logs/S1-${vp}-network.json`,
        JSON.stringify(
          {
            blocked_non_localhost: pipeline.blocked,
            exports_captured: pipeline.exports.length,
            survey_hits: pipeline.surveyHits,
          },
          null,
          1,
        ),
      );
    }

    expect(await pilotStage(page)).toBe('complete');

    const captured = await completionExport(pipeline);

    expect(captured.envelope).toMatchObject({
      participant_id: 'PT_U24_S1',
      game_session_id: 'GS_U24_S1',
      launch_mode: 'test',
      session_status: 'completed',
      completion_reason: 'terminal_room_reached',
      page_load_index: 1,
    });
    reproduce(`S1-${vp}`, captured, S1_EXPECTATION);
    expectNoRuntimeErrors(errors);
  });
}

test('S3 reloads at 800 × 600: three genuine page reloads (inside a lab window; at the return check-in with the M25 question open; after the Deck review) — the keep-alive exports, the replay by ordinary input, the final export; L1', async ({
  page,
}) => {
  test.setTimeout(7_200_000);

  const errors = captureErrors(page);

  await page.setViewportSize({ width: 800, height: 600 });

  const pipeline = await installPipeline(page);
  const counts = instrumentInput(page);
  const log = new StageLog(page, counts);
  let marks: unknown = null;
  // The page-hide keep-alive attempts, observed at the browser's network
  // layer (Chrome DevTools Protocol, read-only): a keep-alive request the
  // browser refuses never reaches `page.route`.
  const attempts: {
    request_id: string;
    url: string;
    body_bytes: number;
    response_status: number | null;
    failed: string | null;
  }[] = [];
  const cdp = await page.context().newCDPSession(page);

  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', (event) => {
    if (event.request.url.includes('ingest-research-session')) {
      attempts.push({
        request_id: event.requestId,
        url: event.request.url,
        body_bytes: Buffer.byteLength(event.request.postData ?? ''),
        response_status: null,
        failed: null,
      });
    }
  });
  cdp.on('Network.responseReceived', (event) => {
    const attempt = attempts.find((a) => a.request_id === event.requestId);

    if (attempt !== undefined) attempt.response_status = event.response.status;
  });
  cdp.on('Network.loadingFailed', (event) => {
    const attempt = attempts.find((a) => a.request_id === event.requestId);

    if (attempt !== undefined) attempt.failed = event.errorText;
  });

  useFrames(new FrameRecorder(page, join(OUT, 'frames', 'S3-800x600'), 'S3'));

  try {
    await bootU24(page, {
      participant_id: 'PT_U24_S3',
      game_session_id: 'GS_U24_S3',
    });
    await log.mark('boot (Dock)');
    marks = await scenarioS3(page, log);
  } finally {
    useFrames(null);
    write(
      'stage-logs/S3-800x600.json',
      JSON.stringify(
        { scenario: 'S3', viewport: '800x600', marks, records: log.records },
        null,
        1,
      ),
    );

    for (const [index, captured] of pipeline.exports
      .filter((e) => e.envelope.session_status === 'incomplete')
      .entries()) {
      write(`exports/S3-keepalive-${index + 1}.json`, captured.body);
    }

    write(
      'reproduction/S3-keepalive-attempts.json',
      JSON.stringify(
        {
          note: 'ingest requests seen at the browser network layer (CDP); delivered = intercepted by the mock ingest',
          attempts,
          delivered_incomplete: pipeline.exports
            .filter((e) => e.envelope.session_status === 'incomplete')
            .map((e) => e.envelope.page_load_index),
        },
        null,
        1,
      ),
    );
  }

  expect(await pilotStage(page)).toBe('complete');

  // V-12 (e) / V-5: the page attempts one keep-alive export per reload (the
  // three before the completion export). Whether each is DELIVERED is
  // reported from the record above, never assumed here.
  expect(
    attempts.length,
    'keep-alive attempts before the completion export',
  ).toBeGreaterThanOrEqual(3);

  const captured = await completionExport(pipeline);

  expect(captured.envelope.page_load_index).toBe(4);
  write('exports/S3.json', captured.body);

  const payload = captured.envelope.payload as {
    raw_events: RawGameEvent[];
    measurement_features: ExportedFeature[];
  };
  const again = extractMeasurementFeatures(payload.raw_events, {
    finalCoreClosed: true,
    pageLoadIndex: 4,
    reloaded: true,
  });
  const l1Equal =
    JSON.stringify(again) === JSON.stringify(payload.measurement_features);

  write(
    'reproduction/S3-L1.json',
    JSON.stringify(
      {
        layer:
          'L1 — same code (determinism, log-only derivation; NOT independence)',
        context: { finalCoreClosed: true, pageLoadIndex: 4, reloaded: true },
        byte_equal: l1Equal,
        primary: payload.measurement_features
          .filter((f) => f.role === 'primary')
          .map((f) => [f.feature_id, f.disposition, f.value]),
      },
      null,
      1,
    ),
  );
  expect(l1Equal, 'L1: re-extraction equals the exported features').toBe(true);
  expectNoRuntimeErrors(errors);
});

test('S4 focus and pause at 800 × 600: blur and hidden excluded from the M05 clock; the ESC menu pauses the world (RESUME by pointer recorded); HELP opens and closes by key and by pointer; a station is not entered by pointer; LEAVE and return keep the work', async ({
  page,
}) => {
  test.setTimeout(1_800_000);

  const errors = captureErrors(page);

  await page.setViewportSize({ width: 800, height: 600 });
  await installPipeline(page);
  useFrames(new FrameRecorder(page, join(OUT, 'frames', 'S4-800x600'), 'S4'));

  let record: S4Record | null = null;

  try {
    await bootU24(page, {
      participant_id: 'PT_U24_S4',
      game_session_id: 'GS_U24_S4',
    });
    record = await scenarioS4(page);
  } finally {
    useFrames(null);
    write('reproduction/S4.json', JSON.stringify(record, null, 1));
  }

  const excluded = (record!.m05_started.excluded_ms ?? {}) as Record<
    string,
    number
  >;

  expect(excluded.focus_loss ?? 0, 'blur excluded').toBeGreaterThanOrEqual(
    2_500,
  );
  expect(excluded.hidden ?? 0, 'hidden excluded').toBeGreaterThanOrEqual(2_500);
  expect(Math.abs(record!.esc_menu.moved_while_menu_open)).toBeLessThan(1);
  expect(Math.abs(record!.esc_menu.moved_after_resume)).toBeGreaterThan(4);
  expect(record!.help.opened).toContain('close_help');
  expect(record!.help.closed).not.toContain('close_help');
  // The pointer pairs (U24-B review). RESUME by pointer is recorded only:
  // the menu shows no Resume control at 43f12de either (report F-B9).
  expect(Math.abs(record!.esc_menu_pointer.moved_while_menu_open)).toBeLessThan(
    1,
  );
  expect(record!.help_pointer.opened).toContain('close_help');
  expect(record!.help_pointer.closed).not.toContain('close_help');
  expect(record!.station_pointer_entry).toEqual({
    prompt_visible: true,
    surface_opened: false,
    prompt_cards_opened: false,
  });
  expect(record!.leave_return.decision_after).toBe(
    record!.leave_return.decision_before,
  );
  expect(record!.leave_return.surface_closed_events).toBeGreaterThanOrEqual(1);
  expectNoRuntimeErrors(errors);
});

test('S5 pointer-only and keyboard-only passes at 800 × 600: an NPC dialog, a work surface, an overlay and the field HUD by each input alone', async ({
  page,
}) => {
  test.setTimeout(3_600_000);

  const errors = captureErrors(page);

  await page.setViewportSize({ width: 800, height: 600 });
  await installPipeline(page);
  useFrames(new FrameRecorder(page, join(OUT, 'frames', 'S5-800x600'), 'S5'));

  try {
    await bootU24(page, {
      participant_id: 'PT_U24_S5',
      game_session_id: 'GS_U24_S5',
    });
    await scenarioS5(page);
  } finally {
    useFrames(null);
  }

  const events = (await page.evaluate(() =>
    (
      window as unknown as {
        researchRuntime: { getEvents: () => unknown[] };
      }
    ).researchRuntime.getEvents(),
  )) as { event_type: string; metadata?: Record<string, unknown> }[];
  const modes = (prefix: string, types: readonly string[]) => [
    ...new Set(
      events
        .filter(
          (e) =>
            e.event_type.startsWith(prefix) &&
            types.some((type) => e.event_type.endsWith(type)),
        )
        .map((e) => e.metadata?.input_mode),
    ),
  ];
  const summary = {
    npc_vale_pointer: modes('proto_m09_checks_', ['offer_answered']),
    m12_pointer: modes('proto_m12_check_', [
      'field_checked',
      'field_judged',
      'released',
    ]),
    m14_keyboard: modes('proto_m14_integration_', ['first_response']),
    m02_keyboard: modes('proto_m02_workspace_', [
      'case_moved',
      'handed_over',
      'request_answered',
    ]),
    m03_pointer: modes('proto_m03tools_', ['tool_moved']),
    m23_pointer: modes('proto_m23_plots_', [
      'failure_choice',
      'stop_requested',
      'stop_confirmed',
    ]),
  };

  write('reproduction/S5-input-modes.json', JSON.stringify(summary, null, 1));
  expect(summary.npc_vale_pointer).toEqual(['pointer']);
  expect(summary.m12_pointer).toEqual(['pointer']);
  expect(summary.m14_keyboard).toEqual(['keyboard']);
  expect(summary.m02_keyboard).toEqual(['keyboard']);
  expect(summary.m03_pointer).toEqual(['pointer']);
  expect(summary.m23_pointer).toEqual(['pointer']);
  expectNoRuntimeErrors(errors);
});

/**
 * V-6 fallback-font pass: the canvas `monospace` family replaced by a
 * named Windows font before the game loads (the `forceMonospace` harness
 * of the M14–M20 route specs: presentation only, no input or state). The
 * S1 route at 800 × 600 with its frames, which include the text-dense
 * windows (M14, M15, M16, M18, M19, M20, M22, M23).
 */
async function forceMonospace(page: Page, family: string) {
  await page.addInitScript((wanted: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CanvasRenderingContext2D.prototype,
      'font',
    );

    if (descriptor?.set === undefined || descriptor.get === undefined) {
      return;
    }

    Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', {
      configurable: true,
      get() {
        return descriptor.get!.call(this);
      },
      set(value: string) {
        descriptor.set!.call(
          this,
          String(value).replace(/\bmonospace\b/g, wanted),
        );
      },
    });
  }, family);
}

for (const [label, family] of [
  ['courier-new', '"Courier New"'],
  ['lucida-console', '"Lucida Console"'],
] as const) {
  test(`V-6 fallback font ${family} at 800 × 600: the S1 route with its frames`, async ({
    page,
  }) => {
    test.setTimeout(5_400_000);

    const errors = captureErrors(page);

    await page.setViewportSize({ width: 800, height: 600 });
    await forceMonospace(page, family);
    await installPipeline(page);
    useFrames(
      new FrameRecorder(
        page,
        join(OUT, 'frames', `font-${label}-800x600`),
        `font ${family}`,
      ),
    );

    try {
      await bootU24(page, {
        participant_id: 'PT_U24_FONT',
        game_session_id: `GS_U24_FONT_${label}`,
      });

      for (const run of [
        episode1Engaged,
        episode2Engaged,
        episode3Engaged,
        episode4Engaged,
        episode5Engaged,
        episode6Closure,
      ]) {
        await run(page);
      }
    } finally {
      useFrames(null);
    }

    expect(await pilotStage(page)).toBe('complete');
    expectNoRuntimeErrors(errors);
  });
}

test('S2 minimal route at 800 × 600: every optional offer declined, every optional station unopened; no participant act beyond the route; the participant export; L1 and L2', async ({
  page,
}) => {
  test.setTimeout(3_600_000);

  const errors = captureErrors(page);

  await page.setViewportSize({ width: 800, height: 600 });

  const pipeline = await installPipeline(page);
  const counts = instrumentInput(page);
  const log = new StageLog(page, counts);

  useFrames(new FrameRecorder(page, join(OUT, 'frames', 'S2-800x600'), 'S2'));

  try {
    await bootU24(page, {
      participant_id: 'PT_U24_S2',
      game_session_id: 'GS_U24_S2',
    });
    await log.mark('boot (Dock)');
    await frame('s2-dock');
    await scenarioS2(page, log);
    await frame('s2-completion');
  } finally {
    useFrames(null);
    write(
      'stage-logs/S2-800x600.json',
      JSON.stringify(
        { scenario: 'S2', viewport: '800x600', records: log.records },
        null,
        1,
      ),
    );
  }

  expect(await pilotStage(page)).toBe('complete');

  const captured = await completionExport(pipeline);

  expect(captured.envelope).toMatchObject({
    session_status: 'completed',
    page_load_index: 1,
  });

  const { payload } = reproduce('S2', captured, S2_EXPECTATION);

  // The minimal route's records, classified by their own input mode: every
  // proto_* record that is not exposure is either SYSTEM-written (the
  // opportunity registrations, the shift-end and review closures) or one
  // of the participant's explicit DECLINES — an offer answered no, and the
  // declined window's closure in the answer's input mode (M05, M11). Any
  // other participant-mode record is a participant act the minimal route
  // must not contain.
  const events = payload.raw_events as unknown as {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[];
  const declinedFamilies = new Set(
    events
      .filter(
        (event) =>
          event.event_type.endsWith('_offer_answered') &&
          (event.metadata?.accepted === false ||
            event.metadata?.answer === 'decline'),
      )
      .map((event) => event.event_type.replace(/offer_answered$/, '')),
  );
  const classified = events
    .filter(
      (event) =>
        event.event_type.startsWith('proto_') &&
        !event.event_type.endsWith('_presented'),
    )
    .map((event) => {
      const mode = event.metadata?.input_mode;
      const kind =
        mode === 'system'
          ? 'system'
          : event.event_type.endsWith('_offer_answered') &&
              (event.metadata?.accepted === false ||
                event.metadata?.answer === 'decline')
            ? 'decline'
            : event.event_type.endsWith('_window_closed') &&
                [...declinedFamilies].some((f) =>
                  event.event_type.startsWith(f),
                )
              ? 'decline_closure'
              : 'participant_act';

      return { type: event.event_type, mode: mode ?? null, kind };
    });

  write(
    'reproduction/S2-record-classes.json',
    JSON.stringify(
      {
        untolerated_by_bare_route_check: untoleratedMeasurementEvents(events),
        classified,
      },
      null,
      1,
    ),
  );
  expect
    .soft(
      classified.filter((record) => record.kind === 'participant_act'),
      'no participant act beyond the explicit declines',
    )
    .toEqual([]);
  expectNoRuntimeErrors(errors);
});
