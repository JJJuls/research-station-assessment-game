# Isolated Supabase write / read / idempotency round-trip (Pilot V3 Unit 3)

**Date:** 2026-09-04. **Stack:** the Supabase CLI local stack (CLI 2.116.0
binary run from a scratch directory; Docker Desktop 29.6.1 with the WSL 2
backend) started from this repository's `supabase/` directory, so the two
committed migrations were applied by the CLI and the committed
`ingest-research-session` function was served by the CLI's edge runtime.
Project id `research-station-assessment-game`, API on `127.0.0.1:54321`,
database on `:54322`. No remote project was involved at any point; every
key used is the CLI's local default and none is committed.

## What was proven

### A. Transport contract (`scripts/pilot/supabase-roundtrip.mjs`, Node, no dependencies)

Report: `SUPABASE-ROUNDTRIP-2026-09-04.json` (identity `AUTO-RT-2026-09-04-…`,
no keys). 13/13 steps:

| Step | Assertion                                                                                                    | Result |
| ---- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 1    | first `completed` production envelope → HTTP 201, `duplicate:false`, same `export_id`                        | PASS   |
| 2    | byte-identical retry → HTTP 200, `duplicate:true`                                                            | PASS   |
| 3    | same `export_id`, changed payload → HTTP 409 `export_id_conflict`                                            | PASS   |
| 4    | `launch_mode=test` envelope for the same identity → 201 (separate row)                                       | PASS   |
| 5    | `incomplete` keep-alive-shaped envelope (`raw_events_omitted`) → 201                                         | PASS   |
| 6    | `launch_mode=development` → HTTP 403 `launch_mode_not_accepted` (never stored)                               | PASS   |
| 7a   | exactly one row for the completed export (read back via PostgREST, service role)                             | PASS   |
| 7b   | projected columns `launch_mode`, `session_status`, `completion_reason`, `export_sequence`, `page_load_index` | PASS   |
| 7c   | payload stored verbatim (structural comparison; jsonb normalises key order)                                  | PASS   |
| 7d   | stored `payload_hash` == SHA-256 of the payload JSON the client sent                                         | PASS   |
| 7e   | the test row is separate and labelled `test`                                                                 | PASS   |
| 7f   | the incomplete row is labelled `incomplete` with `raw_events_omitted: true`                                  | PASS   |

### B. The real client (`e2e/supabase_roundtrip_live.spec.ts`)

Env-gated (`SUPABASE_LOCAL_INGEST_URL`, `SUPABASE_LOCAL_ANON_KEY`,
`SUPABASE_LOCAL_SERVICE_KEY`; loopback host enforced; skips otherwise — 1
skipped without the variables, 1 passed with them, 50 s). The DEV server's
completion pipeline, with its export config pointed at the live local Edge
Function, drove the Core synchronisation (developer inspection launch,
`launch_mode=test`) and:

- exported once → HTTP 201, `attempts: 1`, `export_status: acknowledged`;
- a developer-console retry (separate envelope family) → its own 201; a
  second console retry → HTTP 200 `duplicate: true` with the same id;
- PostgREST read-back (service role): exactly one row for the pipeline's
  `export_id`, `launch_mode=test`, `session_status=completed`,
  `completion_reason=terminal_room_reached`, `export_sequence=1`,
  `page_load_index=1`, more than five raw events, zero sequence gaps and
  duplicates, and `payload_hash` equal to the SHA-256 of the client's own
  frozen envelope payload (read from `sessionStorage`);
- the POST was cross-origin (dev server → stack), so the CORS preflight had
  to pass; a direct `OPTIONS` check confirmed 204 with
  `Access-Control-Allow-Origin: *` and `apikey` in the allowed headers.

### C. Participant bundle audit (`CI=true npm run bundle`)

Built in 2.21 s. `dist/index.html`: zero external hosts, zero
`dataLayer|gtag`, title `Remote Outpost Assessment`. `dist/assets`: no
`researchRuntime`, `__lastRoomFeedbackText`, `__playerProbe`,
`allowProductionInDev`, `__handoffProbe` or `__researchExportConfig` string;
no `*.map`. `dist/` is gitignored and was not committed.

## Two defects the round-trip exposed (both fixed before commit)

1. **The original function could not boot in an isolated stack.** Its only
   import, `npm:@supabase/server@^1`, is fetched from the npm registry at
   cold start; behind this machine's TLS interception the edge runtime
   reported `invalid peer certificate: UnknownIssuer` and every request
   returned 503 `BOOT_ERROR`. The function was rewritten dependency-free
   (plain `fetch` to PostgREST with the platform-injected service role, an
   explicit constant-time publishable-key check). Committed in Unit 2.
2. **No CORS handling.** A participant bundle is served from a static host
   and posts cross-origin; without an `OPTIONS` handler the browser's
   preflight fails and no export ever leaves the browser. Added in this
   unit (`OPTIONS` → 204; CORS headers on every response). This would have
   been invisible to the mocked-network browser tests and to a same-origin
   Node script — only the real cross-origin client showed it.

## Reproduction

```sh
# stack (from the repository root; CLI binary anywhere on PATH)
supabase start
# A — transport contract, report to docs/verification/professional-pilot-v3/
node scripts/pilot/supabase-roundtrip.mjs \
  --ingest http://127.0.0.1:54321/functions/v1/ingest-research-session \
  --rest   http://127.0.0.1:54321/rest/v1 \
  --anon   <local anon key> --service <local service_role key> \
  --out docs/verification/professional-pilot-v3/SUPABASE-ROUNDTRIP-<date>.json
# B — real client
SUPABASE_LOCAL_INGEST_URL=http://127.0.0.1:54321/functions/v1/ingest-research-session \
SUPABASE_LOCAL_ANON_KEY=<local anon key> SUPABASE_LOCAL_SERVICE_KEY=<local service_role key> \
PW_DEV_PORT=5352 npx playwright test e2e/supabase_roundtrip_live.spec.ts --retries=0
supabase stop
```

## Environment notes (honest record)

- Docker Desktop's WSL VM creation timed out on first launch
  (`Wsl/Service/RegisterDistro/CreateVm/0x800705b4`); `wsl --shutdown` and
  a relaunch cleared it. The privileged `com.docker.service` cannot be
  started without administrator rights on this machine; the stack ran
  without it.
- `supabase start` took ~25 minutes, almost all image pulls (the `-x`
  exclusions were not honoured for every service).
- The first stack start applied the pre-review version of the Unit 2
  migration (column `attempt_index`); `supabase db reset` re-applied the
  committed migrations before the recorded runs.

## Not claimed

Nothing here validates a hosted Supabase project, its region, retention,
access controls or DPIA (X4 / X5 / X10 / X11 remain external). The keys and
project are the CLI's local defaults. Real participant data was not
involved.
