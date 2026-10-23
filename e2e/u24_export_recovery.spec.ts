/**
 * U24 Part B — export, recovery and launch handling (V-5, V-12).
 *
 * - V-5 (a): the compact (keep-alive) and full envelopes of the SAME S1 end
 *   state, built by the real `ResearchExportClient` in the test process
 *   over the saved S1 export's payload (a harness read, labelled as such:
 *   a terminal session sends no keep-alive in the browser). The browser's
 *   own page-hide keep-alive is evidenced by S3's genuine reloads.
 * - V-5 (b), (c): the S3 exports (three genuine `page.reload()`s).
 * - V-12: scenario S6 — ordinary play with the synthetic launch, the
 *   ingest answering 500, the hand-off to an intercepted https survey host —
 *   plus the return-URL policy's refusal cases (pure). Every non-localhost
 *   request is intercepted; nothing reaches a real host.
 *
 * Reads and writes `$U24_EVIDENCE_DIR/B` (else `test-results/u24`); the S1
 * and S3 exports are produced by `u24_end_to_end.spec.ts`, which runs first.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  DEFAULT_RETURN_URL_ALLOWED_HOSTS,
  validateReturnUrl,
} from '../src/systems/QualtricsBridge';
import {
  KEEPALIVE_BODY_LIMIT_BYTES,
  ResearchExportClient,
  type ResearchExportPayload,
} from '../src/systems/ResearchExportClient';
import { captureErrors } from './journey';
import { keyActivate } from './returnHelpers';
import {
  bootU24,
  frame,
  FrameRecorder,
  installPipeline,
  scenarioS2,
  useFrames,
} from './u24Helpers';

const OUT = process.env.U24_EVIDENCE_DIR
  ? join(process.env.U24_EVIDENCE_DIR, 'B')
  : 'test-results/u24';

function readExport(name: string) {
  const path = join(OUT, 'exports', `${name}.json`);

  expect(existsSync(path), `${path} (produced by u24_end_to_end)`).toBe(true);

  const body = readFileSync(path, 'utf8');

  return { body, envelope: JSON.parse(body) as Record<string, unknown> };
}

function write(relative: string, content: string) {
  const path = join(OUT, relative);

  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
}

const SAME_KEYS = [
  'measurement_features',
  'measurement_protocol',
  'measurement_validity',
] as const;

test.describe('V-5 (a) — compact and full envelopes of the same S1 end state (harness)', () => {
  test('the real export client over the saved S1 800 × 600 payload: identical features, protocol and validity; the compact envelope marks what it omits', async () => {
    const saved = readExport('S1-800x600');
    const payload = (saved.envelope as { payload: ResearchExportPayload })
      .payload;
    const bodies: string[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
      bodies.push(String(init?.body ?? ''));

      return new Response(
        JSON.stringify({
          ok: true,
          acknowledged: true,
          duplicate: false,
          export_id: JSON.parse(String(init?.body)).export_id,
          server_received_at: '2026-10-22T00:00:00.000Z',
        }),
        { status: 201 },
      );
    }) as typeof fetch;

    try {
      const client = new ResearchExportClient({
        getContext: () => ({
          launch_mode: 'test',
          export_allowed: true,
          session_status: 'in_progress',
          completion_reason: null,
        }),
        getConfig: () => ({
          ingestUrl: 'http://localhost/__u24-harness__',
          publishableKey: 'sb_publishable_u24_harness',
        }),
        getSessionIdentity: () => ({
          participant_id: 'PT_U24_S1',
          game_session_id: 'GS_U24_S1',
          page_load_index: 1,
          last_sequence: (payload.raw_events as unknown[]).length,
        }),
        buildPayload: () => payload,
      });

      expect(client.submitKeepalive()).toBe(true);
      await client.submit({ attempts: 1 });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(bodies).toHaveLength(2);

    const compact = JSON.parse(bodies[0]) as {
      payload: Record<string, unknown>;
    };
    const full = JSON.parse(bodies[1]) as { payload: Record<string, unknown> };

    for (const key of SAME_KEYS) {
      expect(JSON.stringify(compact.payload[key]), key).toBe(
        JSON.stringify(full.payload[key]),
      );
      expect(full.payload[key], `${key} present`).toBeDefined();
    }

    const fullBytes = Buffer.byteLength(bodies[1]);
    const omitted = compact.payload.raw_events_omitted === true;

    write(
      'reproduction/V5a-compact-vs-full.json',
      JSON.stringify(
        {
          kind: 'HARNESS READ — the real ResearchExportClient in the test process over the saved S1 payload',
          full_envelope_bytes: fullBytes,
          compact_envelope_bytes: Buffer.byteLength(bodies[0]),
          keepalive_limit_bytes: KEEPALIVE_BODY_LIMIT_BYTES,
          raw_events_omitted: compact.payload.raw_events_omitted ?? false,
          raw_events_omitted_count:
            compact.payload.raw_events_omitted_count ?? 0,
          identical: SAME_KEYS,
        },
        null,
        1,
      ),
    );

    if (fullBytes > KEEPALIVE_BODY_LIMIT_BYTES) {
      expect(omitted).toBe(true);
      expect(Number(compact.payload.raw_events_omitted_count)).toBeGreaterThan(
        0,
      );
      // Only the full payload is used for L1 and layer R.
      expect(full.payload.raw_events_omitted ?? false).toBe(false);
    }
  });
});

test.describe('V-5 (b), (c) — the S3 reloads', () => {
  test('page_load_index increments; prior-load events are carried apart and never counted as current-load evidence; the store recovery is lossless', () => {
    const final = readExport('S3').envelope as {
      page_load_index: number;
      payload: {
        page_load_index: number;
        raw_events: { page_load_index?: number; sequence?: number }[];
        prior_page_load_events: { page_load_index?: number }[];
        event_integrity: Record<string, unknown>;
        measurement_features: {
          feature_id: string;
          role: string;
          disposition: string;
          value: unknown;
        }[];
      };
    };

    expect(final.page_load_index).toBe(4);
    expect(final.payload.page_load_index).toBe(4);
    expect(
      final.payload.raw_events.every(
        (event) =>
          event.page_load_index === undefined || event.page_load_index === 4,
      ),
    ).toBe(true);

    const priorLoads = new Set(
      final.payload.prior_page_load_events.map(
        (event) => event.page_load_index,
      ),
    );

    expect([...priorLoads].sort()).toEqual([1, 2, 3]);
    expect(final.payload.event_integrity).toMatchObject({
      page_load_index: 4,
      sequence_gap_count: 0,
    });

    // The reload guards held (U24-B review): no opportunity was answered by
    // the participant in more than one page load. S3's drivers decline an
    // offer shown again, so a re-run offer would otherwise pass silently.
    const answeredIn = new Map<string, Set<number>>();

    for (const event of [
      ...final.payload.prior_page_load_events,
      ...final.payload.raw_events,
    ] as {
      event_type?: string;
      page_load_index?: number;
      metadata?: { opportunity_id?: string; input_mode?: string } | null;
    }[]) {
      if (
        !(event.event_type ?? '').endsWith('_answered') ||
        event.metadata?.input_mode === 'system'
      ) {
        continue;
      }

      const key = `${event.metadata?.opportunity_id} ${event.event_type}`;
      const loads = answeredIn.get(key) ?? new Set<number>();

      loads.add(event.page_load_index ?? 4);
      answeredIn.set(key, loads);
    }

    const answeredTwice = [...answeredIn]
      .filter(([, loads]) => loads.size > 1)
      .map(([key, loads]) => `${key}: loads ${[...loads].join(', ')}`);

    expect(answeredTwice, 'an opportunity answered in two page loads').toEqual(
      [],
    );

    // U24 RL-1 (RELOAD-CORRECTION-SPEC-r3-exec.md §4 "Expected S3 load-4
    // readings" and §5): every station of M01, M02, M03, M04, M06, M12 and
    // M13 opened in load 1 is held at its availability in load 4 —
    // interrupted, no value (M01 HB + DEC, M03 HB + DEC, M04 HB + HB, M12
    // HB + HB) — and M08, never opened and presented again, is declined
    // under its established check. Each reloaded load writes one check per
    // family; a first load writes none.
    const RL1_S3_LOAD4: Record<string, string> = {
      m01_planned_jobs: 'interrupted',
      m02_correct_first_retrievals: 'interrupted',
      m03_tools_restored: 'interrupted',
      m04_undisposed_pieces: 'interrupted',
      m06_unique_correct_orders: 'interrupted',
      m08_work_choice_fraction: 'declined',
      m12_fields_verified: 'interrupted',
      m13_first_solutions: 'interrupted',
    };

    for (const [featureId, disposition] of Object.entries(RL1_S3_LOAD4)) {
      expect(
        final.payload.measurement_features.find(
          (feature) => feature.feature_id === featureId,
        ),
        featureId,
      ).toMatchObject({ disposition, value: null });
    }

    const everyEvent = [
      ...final.payload.prior_page_load_events,
      ...final.payload.raw_events,
    ] as {
      event_type?: string;
      page_load_index?: number;
      metadata?: Record<string, unknown> | null;
    }[];

    for (const family of [
      'proto_m01_batch_',
      'proto_m02_workspace_',
      'proto_m03tools_',
      'proto_m04_cutting_',
      'proto_m06_orders_',
      'proto_m08_effort_',
      'proto_m12_check_',
      'proto_m13_networks_',
    ]) {
      for (const load of [1, 2, 3, 4]) {
        expect(
          everyEvent.filter(
            (event) =>
              event.event_type === `${family}prior_load_checked` &&
              (event.page_load_index ?? 4) === load,
          ).length,
          `${family}prior_load_checked in load ${load}`,
        ).toBe(load === 1 ? 0 : 1);
      }
    }

    expect(
      everyEvent.find(
        (event) =>
          event.event_type === 'proto_m08_effort_prior_load_checked' &&
          (event.page_load_index ?? 4) === 4,
      )?.metadata,
    ).toMatchObject({
      prior_briefing_found: true,
      prior_opening_found: false,
      prior_opening_absence_established: true,
    });
    write(
      'reproduction/V5bc-S3-integrity.json',
      JSON.stringify(
        {
          page_load_index: final.page_load_index,
          prior_loads: [...priorLoads],
          prior_page_load_event_count:
            final.payload.prior_page_load_events.length,
          current_load_event_count: final.payload.raw_events.length,
          event_integrity: final.payload.event_integrity,
          primary_dispositions: final.payload.measurement_features
            .filter((feature) => feature.role === 'primary')
            .map((feature) => [
              feature.feature_id,
              feature.disposition,
              feature.value,
            ]),
          // Every feature row, companions included, as recorded (no
          // disposition clause is asserted: the V-5 (b) observations are
          // findings F-B2, F-B7 and F-B8 for the owner).
          all_feature_dispositions: final.payload.measurement_features.map(
            (feature) => [
              feature.feature_id,
              feature.role,
              feature.disposition,
              feature.value,
              (feature as { missing_reason?: string | null }).missing_reason ??
                null,
            ],
          ),
          participant_answers_by_load: [...answeredIn].map(([key, loads]) => [
            key,
            [...loads],
          ]),
        },
        null,
        1,
      ),
    );
  });
});

test.describe('V-12 — synthetic launch, return policy and export failure (S6)', () => {
  test('return-URL policy (pure): https on the allow-listed host accepted; a foreign host and plain http refused with the reason; localhost accepted in DEV only', () => {
    const dev = {
      allowedHosts: [...DEFAULT_RETURN_URL_ALLOWED_HOSTS],
      allowLocalhost: true,
    };
    const production = { ...dev, allowLocalhost: false };

    expect(
      validateReturnUrl(
        'https://study.au1.qualtrics.com/jfe/form/SV_U24',
        production,
      ).ok,
    ).toBe(true);
    expect(validateReturnUrl('https://evil.example/x', production)).toEqual({
      ok: false,
      reason: 'host_not_allowed',
    });
    expect(
      validateReturnUrl(
        'http://study.au1.qualtrics.com/jfe/form/SV_U24',
        production,
      ),
    ).toEqual({ ok: false, reason: 'scheme_not_allowed' });
    expect(validateReturnUrl('http://localhost:5187/survey', dev).ok).toBe(
      true,
    );
    expect(
      validateReturnUrl('http://localhost:5187/survey', production),
    ).toEqual({
      ok: false,
      reason: 'scheme_not_allowed',
    });
  });

  test('S6 (ordinary play, 800 × 600): the launch parameters reach the export; the ingest answers 500 — three attempts, export failed, no automatic navigation; the hand-off carries the summary and the status axes to the intercepted https survey host', async ({
    page,
  }) => {
    test.setTimeout(3_600_000);

    const errors = captureErrors(page);

    await page.setViewportSize({ width: 800, height: 600 });

    const pipeline = await installPipeline(page, {
      ingestStatus: 500,
      allowProductionInDev: true,
      autoNavigateDelayMs: 2_000,
    });
    const surveyHits: string[] = [];

    // The survey host is fulfilled locally (registered after the
    // catch-all, so it takes precedence): nothing reaches the real host.
    await page.route('https://study.au1.qualtrics.com/**', async (route) => {
      surveyHits.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>intercepted survey</title><p>survey</p>',
      });
    });
    useFrames(new FrameRecorder(page, join(OUT, 'frames', 'S6-800x600'), 'S6'));

    try {
      await bootU24(page, {
        participant_id: 'SYN-U24-001',
        game_session_id: 'SYN-U24-S6',
        launch_mode: 'production',
        extra: {
          condition: 'pilot',
          game_version: 'u24-check',
          return_url: 'https://study.au1.qualtrics.com/jfe/form/SV_U24?src=u24',
        },
      });
      await scenarioS2(page);
      await page.waitForFunction(
        () =>
          ['settled', 'blocked'].includes(
            (window as unknown as { __handoffProbe?: { phase: string } | null })
              .__handoffProbe?.phase ?? '',
          ),
        undefined,
        { timeout: 120_000 },
      );
      await frame('s6-failed-export-notice');
    } finally {
      useFrames(null);
    }

    const handoff = await page.evaluate(
      () =>
        (
          window as unknown as {
            __handoffProbe?: Record<string, unknown> | null;
          }
        ).__handoffProbe ?? null,
    );

    // (d) three attempts with identical bytes; the export failed; the
    // participant is not carried past the notice automatically.
    expect(pipeline.exports.length).toBe(3);
    expect(new Set(pipeline.exports.map((e) => e.body)).size).toBe(1);
    expect(handoff).toMatchObject({ export_status: 'failed' });
    await page.waitForTimeout(3_000);
    expect(surveyHits).toEqual([]);

    // (a) the launch parameters in the export.
    const envelope = pipeline.exports[0].envelope as Record<string, unknown> & {
      payload: {
        raw_events: {
          metadata?: Record<string, unknown>;
          [k: string]: unknown;
        }[];
      };
    };

    expect(envelope).toMatchObject({
      participant_id: 'SYN-U24-001',
      game_session_id: 'SYN-U24-S6',
      launch_mode: 'production',
      session_status: 'completed',
    });

    const first = envelope.payload.raw_events[0] as Record<string, unknown>;

    write('exports/S6-ingest-500.json', pipeline.exports[0].body);

    // (c) the participant continues: the hand-off URL carries the summary
    // and the status axes; the navigation is caught by interception.
    await keyActivate(page, 'continue_survey');
    await expect.poll(() => surveyHits.length, { timeout: 30_000 }).toBe(1);

    const url = new URL(surveyHits[0]);
    const axes = Object.fromEntries(
      [
        'session_status',
        'completion_reason',
        'export_status',
        'return_status',
        'export_id',
        'page_load_index',
        'launch_mode',
      ].map((key) => [key, url.searchParams.get(key)]),
    );

    write(
      'reproduction/V12-S6.json',
      JSON.stringify(
        {
          launch: {
            participant_id: envelope.participant_id,
            game_session_id: envelope.game_session_id,
            launch_mode: envelope.launch_mode,
            first_event_fields: Object.fromEntries(
              [
                'participant_id',
                'game_session_id',
                'condition',
                'game_version',
              ].map((key) => [key, first[key] ?? null]),
            ),
          },
          ingest_attempts: pipeline.exports.length,
          handoff,
          survey_url: surveyHits[0],
          axes,
          blocked_non_localhost: pipeline.blocked,
        },
        null,
        1,
      ),
    );

    for (const key of ['condition', 'game_version']) {
      expect(first[key], `${key} on the first event`).toBe(
        key === 'condition' ? 'pilot' : 'u24-check',
      );
    }

    expect(url.hostname).toBe('study.au1.qualtrics.com');
    expect(url.searchParams.get('src')).toBe('u24');
    expect(axes).toMatchObject({
      session_status: 'completed',
      completion_reason: 'terminal_room_reached',
      export_status: 'failed',
      page_load_index: '1',
      launch_mode: 'production',
    });
    expect(axes.export_id).toMatch(/^[0-9a-f-]{36}$/);
    // The three designed 500 answers each log the browser's own resource
    // line; nothing else may reach the console.
    expect(errors.pageErrors).toEqual([]);
    expect(
      errors.consoleErrors.filter((line) => /status of 500/.test(line)),
    ).toHaveLength(3);
    expect(
      errors.consoleErrors.filter((line) => !/status of 500/.test(line)),
    ).toEqual([]);
  });
});
