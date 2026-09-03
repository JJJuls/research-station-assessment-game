/**
 * Research-session ingestion — one table, one composite idempotency key.
 *
 * Pilot V3 Unit 2 (PROVISIONAL(INT-2/INT-5/PS-2)): accepts `launch_mode`
 * `test` (synthetic / dry-run sessions) and `production` (participant
 * bundle sessions) on one explicit axis, and projects the envelope's
 * session-status axes into indexed columns. Idempotency is unchanged:
 * unique (participant_id, game_session_id, export_id); an identical body
 * is acknowledged as a duplicate (200), a different body under the same id
 * is a conflict (409). Nothing here computes or stores a research score.
 *
 * Dependency-free by design (Pilot V3): the function talks to PostgREST
 * with the platform-injected service-role credentials over plain `fetch`,
 * so a cold start never fetches a package from a registry — the isolated
 * round-trip proved that a registry fetch at boot is a single point of
 * failure behind TLS-intercepting networks. The publishable-key check that
 * `@supabase/server`'s `auth: 'publishable'` mode performed is done here
 * explicitly: the `apikey` header must equal the project's publishable
 * (anon) key, otherwise 401.
 */

const MAX_BODY_BYTES = 6_000_000;
const MAX_ID_LENGTH = 128;
const ALLOWED_LAUNCH_MODES = new Set(['test', 'production']);
const ALLOWED_SESSION_STATUS = new Set(['completed', 'incomplete', 'error']);
const ALLOWED_COMPLETION_REASONS = new Set([
  'terminal_room_reached',
  'participant_exit',
  'technical_error',
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface StoredRow {
  payload_hash: string | null;
  server_received_at: string;
}

function env(name: string): string {
  const value = Deno.env.get(name);

  return typeof value === 'string' ? value.trim() : '';
}

function containsControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const characterCode = value.charCodeAt(index);

    if (characterCode <= 0x1f || characterCode === 0x7f) {
      return true;
    }
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readIdentifier(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.length === 0 ||
    trimmed.length > MAX_ID_LENGTH ||
    containsControlCharacter(trimmed)
  ) {
    return null;
  }

  return trimmed;
}

function readOptionalPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? value
    : null;
}

function readOptionalShortText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ||
    trimmed.length > 64 ||
    containsControlCharacter(trimmed)
    ? null
    : trimmed;
}

/**
 * CORS (Pilot V3 Unit 3): the participant bundle is served from a static
 * host and posts cross-origin, so the browser preflights with OPTIONS. The
 * response is not credentialed and carries no secret; the apikey check
 * still gates the POST itself.
 */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
  'Access-Control-Max-Age': '600',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return jsonResponse(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    status,
  );
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time string comparison for the publishable-key check. */
function keysMatch(supplied: string, expected: string): boolean {
  if (supplied.length !== expected.length || expected.length === 0) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < supplied.length; index += 1) {
    diff |= supplied.charCodeAt(index) ^ expected.charCodeAt(index);
  }

  return diff === 0;
}

function restHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
}

async function insertRow(
  restUrl: string,
  serviceRoleKey: string,
  row: Record<string, unknown>,
): Promise<
  | { kind: 'inserted'; server_received_at: string }
  | { kind: 'duplicate' }
  | { kind: 'error'; status: number; detail: string }
> {
  const response = await fetch(`${restUrl}/research_session_exports`, {
    method: 'POST',
    headers: {
      ...restHeaders(serviceRoleKey),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  const text = await response.text();

  if (response.status === 201) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    const first = Array.isArray(parsed) ? parsed[0] : parsed;

    return {
      kind: 'inserted',
      server_received_at:
        isRecord(first) && typeof first.server_received_at === 'string'
          ? first.server_received_at
          : new Date().toISOString(),
    };
  }

  // PostgREST reports a unique violation as 409 with the SQLSTATE code.
  if (response.status === 409 && text.includes('23505')) {
    return { kind: 'duplicate' };
  }

  return { kind: 'error', status: response.status, detail: text.slice(0, 200) };
}

async function lookupRow(
  restUrl: string,
  serviceRoleKey: string,
  participantId: string,
  gameSessionId: string,
  exportId: string,
): Promise<StoredRow | null> {
  const query = new URLSearchParams({
    select: 'payload_hash,server_received_at',
    participant_id: `eq.${participantId}`,
    game_session_id: `eq.${gameSessionId}`,
    export_id: `eq.${exportId}`,
    limit: '1',
  });
  const response = await fetch(
    `${restUrl}/research_session_exports?${query.toString()}`,
    { headers: restHeaders(serviceRoleKey) },
  );

  if (!response.ok) {
    return null;
  }

  const parsed: unknown = await response.json();

  if (!Array.isArray(parsed) || parsed.length === 0 || !isRecord(parsed[0])) {
    return null;
  }

  const row = parsed[0];

  return {
    payload_hash:
      typeof row.payload_hash === 'string' ? row.payload_hash : null,
    server_received_at:
      typeof row.server_received_at === 'string' ? row.server_received_at : '',
  };
}

async function handle(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return errorResponse(
      405,
      'method_not_allowed',
      'Only POST requests are accepted.',
    );
  }

  // Publishable-key gate (what `auth: 'publishable'` used to enforce).
  const publishableKey =
    env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY');
  const suppliedKey = (request.headers.get('apikey') ?? '').trim();

  if (!keysMatch(suppliedKey, publishableKey)) {
    return errorResponse(401, 'unauthorized', 'A valid apikey is required.');
  }

  const supabaseUrl = env('SUPABASE_URL');
  const serviceRoleKey =
    env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');

  if (supabaseUrl === '' || serviceRoleKey === '') {
    return errorResponse(
      500,
      'storage_unconfigured',
      'The ingestion function is not configured.',
    );
  }

  const restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;

  const contentType =
    request.headers.get('content-type')?.split(';')[0].trim() ?? '';

  if (contentType !== 'application/json') {
    return errorResponse(
      415,
      'unsupported_media_type',
      'Content-Type must be application/json.',
    );
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');

  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse(
      413,
      'payload_too_large',
      'Request body exceeds the size limit.',
    );
  }

  const rawBody = await request.text();
  const actualLength = new TextEncoder().encode(rawBody).byteLength;

  if (actualLength === 0) {
    return errorResponse(400, 'empty_body', 'A JSON request body is required.');
  }

  if (actualLength > MAX_BODY_BYTES) {
    return errorResponse(
      413,
      'payload_too_large',
      'Request body exceeds the size limit.',
    );
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(
      400,
      'invalid_json',
      'The request body is not valid JSON.',
    );
  }

  if (!isRecord(body)) {
    return errorResponse(
      422,
      'invalid_envelope',
      'The request body must be a JSON object.',
    );
  }

  const exportId =
    typeof body.export_id === 'string' ? body.export_id.trim() : '';

  if (!UUID_PATTERN.test(exportId)) {
    return errorResponse(
      422,
      'invalid_export_id',
      'export_id must be a valid UUID.',
    );
  }

  const participantId = readIdentifier(body.participant_id);
  const gameSessionId = readIdentifier(body.game_session_id);

  if (participantId === null) {
    return errorResponse(
      422,
      'invalid_participant_id',
      'participant_id is required and must be 1–128 characters.',
    );
  }

  if (gameSessionId === null) {
    return errorResponse(
      422,
      'invalid_game_session_id',
      'game_session_id is required and must be 1–128 characters.',
    );
  }

  const launchMode =
    typeof body.launch_mode === 'string' ? body.launch_mode.trim() : '';

  if (!ALLOWED_LAUNCH_MODES.has(launchMode)) {
    return errorResponse(
      403,
      'launch_mode_not_accepted',
      'This endpoint accepts only launch_mode "test" or "production".',
    );
  }

  const clientCreatedAt =
    typeof body.client_created_at === 'string'
      ? body.client_created_at.trim()
      : '';
  const clientTimestamp = Date.parse(clientCreatedAt);

  if (!clientCreatedAt || !Number.isFinite(clientTimestamp)) {
    return errorResponse(
      422,
      'invalid_client_created_at',
      'client_created_at must be a valid ISO-8601 timestamp.',
    );
  }

  if (!isRecord(body.payload)) {
    return errorResponse(
      422,
      'invalid_payload',
      'payload must be a JSON object.',
    );
  }

  // Status axes (PROVISIONAL(INT-5)): optional so the original test-only
  // client remains accepted; validated when present.
  const sessionStatus = readOptionalShortText(body.session_status);

  if (sessionStatus !== null && !ALLOWED_SESSION_STATUS.has(sessionStatus)) {
    return errorResponse(
      422,
      'invalid_session_status',
      'session_status must be completed, incomplete or error.',
    );
  }

  const completionReason = readOptionalShortText(body.completion_reason);

  if (
    completionReason !== null &&
    !ALLOWED_COMPLETION_REASONS.has(completionReason)
  ) {
    return errorResponse(
      422,
      'invalid_completion_reason',
      'completion_reason is not a recognised value.',
    );
  }

  const payloadJson = JSON.stringify(body.payload);
  const payloadHash = await sha256Hex(payloadJson);

  const row = {
    export_id: exportId,
    participant_id: participantId,
    game_session_id: gameSessionId,
    launch_mode: launchMode,
    payload: body.payload,
    payload_hash: payloadHash,
    client_created_at: new Date(clientTimestamp).toISOString(),
    session_status: sessionStatus,
    completion_reason: completionReason,
    export_sequence: readOptionalPositiveInteger(body.export_sequence),
    page_load_index: readOptionalPositiveInteger(body.page_load_index),
  };

  const inserted = await insertRow(restUrl, serviceRoleKey, row);

  if (inserted.kind === 'inserted') {
    return jsonResponse(
      {
        ok: true,
        acknowledged: true,
        duplicate: false,
        export_id: exportId,
        server_received_at: inserted.server_received_at,
      },
      201,
    );
  }

  if (inserted.kind === 'duplicate') {
    const existing = await lookupRow(
      restUrl,
      serviceRoleKey,
      participantId,
      gameSessionId,
      exportId,
    );

    if (existing === null) {
      return errorResponse(
        500,
        'duplicate_lookup_failed',
        'The export could not be acknowledged.',
      );
    }

    if (existing.payload_hash !== payloadHash) {
      return errorResponse(
        409,
        'export_id_conflict',
        'The export identifier already exists with different content.',
      );
    }

    return jsonResponse({
      ok: true,
      acknowledged: true,
      duplicate: true,
      export_id: exportId,
      server_received_at: existing.server_received_at,
    });
  }

  return errorResponse(
    500,
    'storage_failed',
    'The export could not be stored.',
  );
}

Deno.serve((request) =>
  handle(request).catch(() =>
    errorResponse(500, 'storage_failed', 'The export could not be stored.'),
  ),
);
