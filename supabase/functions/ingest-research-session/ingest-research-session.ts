import { withSupabase } from 'npm:@supabase/server@^1';

const MAX_BODY_BYTES = 2_000_000;
const MAX_ID_LENGTH = 128;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
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

export default {
  fetch: withSupabase({ auth: 'publishable' }, async (request, context) => {
    if (request.method !== 'POST') {
      return errorResponse(
        405,
        'method_not_allowed',
        'Only POST requests are accepted.',
      );
    }

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
        'Request body exceeds the development size limit.',
      );
    }

    const rawBody = await request.text();
    const actualLength = new TextEncoder().encode(rawBody).byteLength;

    if (actualLength === 0) {
      return errorResponse(
        400,
        'empty_body',
        'A JSON request body is required.',
      );
    }

    if (actualLength > MAX_BODY_BYTES) {
      return errorResponse(
        413,
        'payload_too_large',
        'Request body exceeds the development size limit.',
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

    if (body.launch_mode !== 'test') {
      return errorResponse(
        403,
        'development_endpoint_only',
        'This endpoint accepts only launch_mode: "test".',
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

    const payloadJson = JSON.stringify(body.payload);
    const payloadHash = await sha256Hex(payloadJson);

    const row = {
      export_id: exportId,
      participant_id: participantId,
      game_session_id: gameSessionId,
      launch_mode: 'test',
      payload: body.payload,
      payload_hash: payloadHash,
      client_created_at: new Date(clientTimestamp).toISOString(),
    };

    const { data, error } = await context.supabaseAdmin
      .from('research_session_exports')
      .insert(row)
      .select('server_received_at')
      .single();

    if (!error) {
      return jsonResponse(
        {
          ok: true,
          acknowledged: true,
          duplicate: false,
          export_id: exportId,
          server_received_at: data.server_received_at,
        },
        201,
      );
    }

    if (error.code === '23505') {
      const { data: existing, error: lookupError } = await context.supabaseAdmin
        .from('research_session_exports')
        .select('payload_hash, server_received_at')
        .eq('participant_id', participantId)
        .eq('game_session_id', gameSessionId)
        .eq('export_id', exportId)
        .maybeSingle();

      if (lookupError || !existing) {
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
  }),
};
