#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Isolated Supabase write / read / idempotency round-trip (Pilot V3 Unit 3).
 *
 * Exercises the REAL ingestion contract end to end against an ISOLATED
 * Supabase stack (the local CLI stack by default: API on :54321 with the
 * repository's migrations applied and the `ingest-research-session` Edge
 * Function served). Never pointed at a remote project by default; every
 * target must be given explicitly.
 *
 *   node scripts/pilot/supabase-roundtrip.mjs \
 *     --ingest http://127.0.0.1:54321/functions/v1/ingest-research-session \
 *     --rest   http://127.0.0.1:54321/rest/v1 \
 *     --anon   <publishable/anon key> \
 *     --service <service_role key>   # read-back only; never leaves this process
 *     [--identity AUTO-RT-<stamp>] [--out <json report path>]
 *
 * Steps (each asserted, all recorded in the JSON report):
 *   1. POST a `completed` production envelope           → 201, duplicate:false
 *   2. POST the byte-identical envelope again            → 200, duplicate:true
 *   3. POST the same export_id with a changed payload    → 409 export_id_conflict
 *   4. POST a `test` envelope for the same identity      → 201 (separate row)
 *   5. POST an `incomplete` compact envelope (keep-alive shape) → 201
 *   6. POST launch_mode `development`                     → 403 (never stored)
 *   7. Read back via PostgREST with the service role: exactly ONE row per
 *      export_id, launch_mode/session_status columns projected, and
 *      payload_hash == sha256(JSON.stringify(payload)) recomputed here.
 *
 * Node 20+ (global fetch, crypto). No dependencies. Exit 0 iff every step
 * holds; the report is written regardless.
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const ingestUrl = required('ingest');
const restUrl = required('rest').replace(/\/$/, '');
const anonKey = required('anon');
const serviceKey = required('service');
const identity = args.identity ?? `AUTO-RT-${Date.now()}`;
const outPath = args.out ?? null;

const report = {
  started_at: new Date().toISOString(),
  ingest_url: ingestUrl,
  rest_url: restUrl,
  identity,
  steps: [],
  ok: true,
};

function parseArgs(argv) {
  const out = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[index + 1];

      if (value === undefined || value.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = value;
        index += 1;
      }
    }
  }

  return out;
}

function required(name) {
  const value = args[name];

  if (typeof value !== 'string' || value.trim() === '') {
    console.error(`missing --${name}`);
    process.exit(2);
  }

  return value.trim();
}

function canonical(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function record(step, ok, detail) {
  report.steps.push({ step, ok, ...detail });
  report.ok = report.ok && ok;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${step}${ok ? '' : `  ${JSON.stringify(detail)}`}`,
  );
}

function envelope(overrides = {}) {
  const base = {
    export_id: randomUUID(),
    participant_id: identity,
    game_session_id: `${identity}-S1`,
    launch_mode: 'production',
    session_status: 'completed',
    completion_reason: 'terminal_room_reached',
    export_sequence: 1,
    page_load_index: 1,
    client_created_at: new Date().toISOString(),
    payload: {
      game_version: 'roundtrip',
      asset_set_version: 'outpost-assets-v5',
      summary: { completed: true, elapsed_seconds: 1 },
      raw_events: [
        { sequence: 1, page_load_index: 1, event_type: 'session_start' },
        { sequence: 2, page_load_index: 1, event_type: 'pilot_closure_stable' },
      ],
      data_quality: {
        focus_loss_count: 0,
        focus_loss_seconds: 0,
        technical_error_count: 0,
      },
      technical_errors: { technical_error_count: 0 },
      page_load_index: 1,
      prior_page_load_events: [],
      event_integrity: {
        page_load_index: 1,
        first_sequence: 1,
        last_sequence: 2,
        event_count: 2,
        prior_page_load_event_count: 0,
        expected_event_count: 2,
        sequence_gap_count: 0,
        sequence_duplicate_count: 0,
        durable_store: 'durable',
        durable_event_count: 2,
        recovered_from_chunks: false,
        foreign_records_rejected: 0,
        store_evictions: 0,
      },
      mission_state: { current_room_id: 'core_chamber' },
      environment: { prefers_reduced_motion: false },
    },
  };

  return { ...base, ...overrides };
}

async function post(bodyJson) {
  const response = await fetch(ingestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: bodyJson,
  });
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }

  return { status: response.status, body };
}

async function readRows(exportId) {
  const url = `${restUrl}/research_session_exports?export_id=eq.${encodeURIComponent(
    exportId,
  )}&select=export_id,participant_id,game_session_id,launch_mode,session_status,completion_reason,export_sequence,page_load_index,payload,payload_hash,server_received_at`;
  const response = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `read-back HTTP ${response.status}: ${await response.text()}`,
    );
  }

  return response.json();
}

async function main() {
  // 1. first completed production export
  const first = envelope();
  const firstJson = JSON.stringify(first);
  const r1 = await post(firstJson);

  record(
    '1 first completed export → 201 duplicate:false',
    r1.status === 201 &&
      r1.body?.duplicate === false &&
      r1.body?.export_id === first.export_id,
    {
      status: r1.status,
      body: r1.body,
    },
  );

  // 2. byte-identical retry
  const r2 = await post(firstJson);

  record(
    '2 identical retry → 200 duplicate:true',
    r2.status === 200 &&
      r2.body?.duplicate === true &&
      r2.body?.export_id === first.export_id,
    {
      status: r2.status,
      body: r2.body,
    },
  );

  // 3. same export_id, different payload
  const changed = {
    ...first,
    payload: {
      ...first.payload,
      summary: { completed: true, elapsed_seconds: 999 },
    },
  };
  const r3 = await post(JSON.stringify(changed));

  record(
    '3 same export_id, different bytes → 409 export_id_conflict',
    r3.status === 409 && r3.body?.error?.code === 'export_id_conflict',
    {
      status: r3.status,
      body: r3.body,
    },
  );

  // 4. test-mode row for the same identity is a separate record
  const testEnvelope = envelope({ launch_mode: 'test' });
  const r4 = await post(JSON.stringify(testEnvelope));

  record(
    '4 test-mode export for the same identity → 201',
    r4.status === 201 && r4.body?.duplicate === false,
    {
      status: r4.status,
      body: r4.body,
    },
  );

  // 5. incomplete keep-alive shape
  const incomplete = envelope({
    session_status: 'incomplete',
    completion_reason: 'participant_exit',
    export_sequence: 2,
  });

  incomplete.payload = {
    ...incomplete.payload,
    raw_events: [],
    prior_page_load_events: [],
    raw_events_omitted: true,
  };

  const r5 = await post(JSON.stringify(incomplete));

  record('5 incomplete keep-alive envelope → 201', r5.status === 201, {
    status: r5.status,
    body: r5.body,
  });

  // 6. development launches are refused server-side too
  const r6 = await post(
    JSON.stringify(envelope({ launch_mode: 'development' })),
  );

  record(
    '6 launch_mode development → 403',
    r6.status === 403 && r6.body?.error?.code === 'launch_mode_not_accepted',
    {
      status: r6.status,
      body: r6.body,
    },
  );

  // 7. read-back and hash verification
  const rows1 = await readRows(first.export_id);
  const rowsTest = await readRows(testEnvelope.export_id);
  const rowsInc = await readRows(incomplete.export_id);
  const expectedHash = sha256Hex(JSON.stringify(first.payload));

  record('7a exactly one row for the completed export', rows1.length === 1, {
    count: rows1.length,
  });
  record(
    '7b projected columns',
    rows1[0]?.launch_mode === 'production' &&
      rows1[0]?.session_status === 'completed' &&
      rows1[0]?.completion_reason === 'terminal_room_reached' &&
      rows1[0]?.export_sequence === 1 &&
      rows1[0]?.page_load_index === 1,
    {
      row: rows1[0] && { ...rows1[0], payload: '<omitted>' },
    },
  );
  // jsonb normalises key order, so compare structurally (the byte-level
  // identity is what payload_hash proves in 7d).
  record(
    '7c payload stored verbatim (structural)',
    canonical(rows1[0]?.payload) === canonical(first.payload),
    {},
  );
  record(
    '7d payload_hash == sha256(payload)',
    rows1[0]?.payload_hash === expectedHash,
    {
      stored: rows1[0]?.payload_hash,
      expected: expectedHash,
    },
  );
  record(
    '7e test row separate and labelled',
    rowsTest.length === 1 && rowsTest[0]?.launch_mode === 'test',
    {
      count: rowsTest.length,
      launch_mode: rowsTest[0]?.launch_mode,
    },
  );
  record(
    '7f incomplete row labelled',
    rowsInc.length === 1 &&
      rowsInc[0]?.session_status === 'incomplete' &&
      rowsInc[0]?.payload?.raw_events_omitted === true,
    {
      count: rowsInc.length,
      session_status: rowsInc[0]?.session_status,
    },
  );

  report.finished_at = new Date().toISOString();

  if (outPath !== null) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`report: ${outPath}`);
  }

  console.log(report.ok ? 'ROUND-TRIP OK' : 'ROUND-TRIP FAILED');
  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  report.ok = false;
  report.error = String(error);

  if (outPath !== null) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2));
  }

  console.error(error);
  process.exit(1);
});
