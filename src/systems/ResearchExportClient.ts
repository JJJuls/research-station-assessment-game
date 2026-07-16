import type { DataQualityMetrics } from './DataQualityTracker';
import type { RawGameEvent } from './EventLogger';
import type { GameSummaryVariables } from './ScoringManager';

/**
 * Test-only research-session export client (development ingestion unit).
 *
 * Sends one completed synthetic session to the development Supabase Edge
 * Function (`ingest-research-session`) and nothing else. This module is a
 * TRANSPORT layer only:
 *
 * - it never creates, mutates, or removes raw events, summary variables,
 *   or data-quality metrics — it serialises what existing instrumentation
 *   already assembled;
 * - its results are client-side transport status for local debugging, kept
 *   deliberately OUT of the raw event log and the scoring surface, so
 *   transport state can never be conflated with research data-quality
 *   state (the INT-5 `export_status` vocabulary remains an open
 *   research-owner decision — nothing here logs such an event);
 * - it refuses to send unless the launch mode is exactly `test`, so a
 *   participant session can never submit through this path.
 *
 * Idempotency: the first successful envelope build for a session identity
 * is frozen (serialised) into `sessionStorage`; every retry for the same
 * (participant_id, game_session_id) resends the SAME bytes with the SAME
 * `export_id`, so the server acknowledges duplicates (200) instead of
 * storing a second row or raising a content conflict (409).
 */

export interface ResearchExportPayload {
  game_version: string;
  asset_set_version: string;
  summary: GameSummaryVariables;
  raw_events: RawGameEvent[];
  data_quality: DataQualityMetrics;
  /**
   * The existing capture (DataQualityTracker) deliberately records a COUNT
   * only — never error content — so no message/stack detail exists to
   * export.
   */
  technical_errors: { technical_error_count: number };
}

export interface ResearchExportEnvelope {
  export_id: string;
  participant_id: string;
  game_session_id: string;
  launch_mode: 'test';
  client_created_at: string;
  payload: ResearchExportPayload;
}

export interface ResearchExportConfig {
  ingestUrl: string | undefined;
  publishableKey: string | undefined;
  /** Finite transport timeout; defaults to DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number;
}

export interface ResearchExportSessionIdentity {
  participant_id: string;
  game_session_id: string;
}

export type ResearchExportRefusalReason =
  | 'not_development_build'
  | 'launch_mode_not_test'
  | 'missing_configuration'
  | 'missing_session_identity';

export type ResearchExportFailureReason =
  | 'export_id_conflict'
  | 'unauthorized'
  | 'forbidden'
  | 'timeout'
  | 'network_error'
  | 'malformed_response'
  | 'unexpected_status';

/**
 * Discriminated transport result. `status` is TRANSPORT state only — it is
 * never a research data-quality signal and must never be merged into one.
 */
export type ResearchExportResult =
  | {
      status: 'acknowledged';
      duplicate: boolean;
      export_id: string;
      http_status: number;
      server_received_at: string | null;
    }
  | {
      status: 'refused';
      reason: ResearchExportRefusalReason;
    }
  | {
      status: 'failed';
      reason: ResearchExportFailureReason;
      http_status: number | null;
      error_code: string | null;
      export_id: string | null;
    };

export interface ResearchExportClientOptions {
  getLaunchMode: () => string | null;
  getConfig: () => ResearchExportConfig;
  getSessionIdentity: () => ResearchExportSessionIdentity;
  buildPayload: () => ResearchExportPayload;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_ID_LENGTH = 128;
const STORAGE_KEY_PREFIX = 'research-export:v1';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ResearchExportClient {
  /**
   * Documented safe fallback: when `sessionStorage` is unavailable or
   * throwing, frozen envelopes live here instead. Idempotency then holds
   * within the current page lifetime only; a reload builds a FRESH envelope
   * with a NEW `export_id` (a distinct row server-side — never a 409
   * content conflict, because an export_id is never reused for different
   * payload bytes).
   */
  private readonly memoryFallback = new Map<string, string>();

  /** Duplicate-submission race guard: concurrent calls share one request. */
  private inFlight: Promise<ResearchExportResult> | null = null;

  private lastResult: ResearchExportResult | null = null;

  constructor(private readonly options: ResearchExportClientOptions) {}

  getLastResult(): ResearchExportResult | null {
    return this.lastResult;
  }

  /**
   * Submits the frozen export envelope for the current session identity,
   * building and freezing it on first call. Never rejects — every outcome
   * is a typed `ResearchExportResult`.
   */
  submit(): Promise<ResearchExportResult> {
    if (this.inFlight !== null) {
      return this.inFlight;
    }

    const request = this.performSubmit()
      .catch(
        (): ResearchExportResult => ({
          status: 'failed',
          reason: 'unexpected_status',
          http_status: null,
          error_code: null,
          export_id: null,
        }),
      )
      .then((result) => {
        this.lastResult = result;
        return result;
      })
      .finally(() => {
        this.inFlight = null;
      });

    this.inFlight = request;

    return request;
  }

  private async performSubmit(): Promise<ResearchExportResult> {
    // Gate order matters: the mode check runs before anything else, so a
    // non-test session never even builds an envelope.
    if (this.options.getLaunchMode() !== 'test') {
      return { status: 'refused', reason: 'launch_mode_not_test' };
    }

    const config = this.options.getConfig();
    const ingestUrl = normaliseConfigValue(config.ingestUrl);
    const publishableKey = normaliseConfigValue(config.publishableKey);

    if (ingestUrl === null || publishableKey === null) {
      return { status: 'refused', reason: 'missing_configuration' };
    }

    const identity = this.options.getSessionIdentity();

    if (
      !isValidIdentifier(identity.participant_id) ||
      !isValidIdentifier(identity.game_session_id)
    ) {
      return { status: 'refused', reason: 'missing_session_identity' };
    }

    const envelopeJson = this.getOrFreezeEnvelope(identity);
    const exportId = readExportId(envelopeJson);

    return this.send(
      ingestUrl,
      publishableKey,
      config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      envelopeJson,
      exportId,
    );
  }

  /**
   * Returns the frozen envelope for this session identity, building and
   * persisting it on first use. A stored envelope is reused ONLY when it
   * still parses and matches the current identity; anything corrupt is
   * replaced by a fresh envelope with a fresh `export_id`.
   */
  private getOrFreezeEnvelope(identity: ResearchExportSessionIdentity): string {
    const key = storageKeyFor(identity);
    const stored = this.readStored(key);

    if (stored !== null && isReusableEnvelope(stored, identity)) {
      return stored;
    }

    const envelope: ResearchExportEnvelope = {
      export_id: generateUuidV4(),
      participant_id: identity.participant_id,
      game_session_id: identity.game_session_id,
      launch_mode: 'test',
      client_created_at: new Date().toISOString(),
      payload: this.options.buildPayload(),
    };

    const envelopeJson = JSON.stringify(envelope);

    this.writeStored(key, envelopeJson);

    return envelopeJson;
  }

  private async send(
    ingestUrl: string,
    publishableKey: string,
    timeoutMs: number,
    envelopeJson: string,
    exportId: string | null,
  ): Promise<ResearchExportResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(ingestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The publishable key rides ONLY in this header — it is never
          // logged, never echoed into results, never persisted.
          apikey: publishableKey,
        },
        body: envelopeJson,
        signal: controller.signal,
      });

      // The body read stays inside the abort window so a server that sends
      // headers but stalls the body still hits the finite timeout.
      const bodyText = await response.text();

      return mapResponse(response.status, bodyText, exportId);
    } catch (error) {
      return {
        status: 'failed',
        reason: isAbortError(error) ? 'timeout' : 'network_error',
        http_status: null,
        error_code: null,
        export_id: exportId,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private readStored(key: string): string | null {
    try {
      const value = sessionStorage.getItem(key);

      if (value !== null) {
        return value;
      }
    } catch {
      // Unavailable or throwing sessionStorage: fall through to memory.
    }

    return this.memoryFallback.get(key) ?? null;
  }

  private writeStored(key: string, value: string): void {
    // Memory first, so a storage quota/security throw can never lose the
    // frozen envelope for this page lifetime.
    this.memoryFallback.set(key, value);

    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Documented fallback: idempotency holds for this page lifetime only.
    }
  }
}

function normaliseConfigValue(value: string | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  return value.trim();
}

function isValidIdentifier(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_ID_LENGTH) {
    return false;
  }

  for (let index = 0; index < trimmed.length; index += 1) {
    const characterCode = trimmed.charCodeAt(index);

    if (characterCode <= 0x1f || characterCode === 0x7f) {
      return false;
    }
  }

  return true;
}

function storageKeyFor(identity: ResearchExportSessionIdentity): string {
  // encodeURIComponent keeps the two identity components unambiguous even
  // if an id itself contains the separator character.
  return `${STORAGE_KEY_PREFIX}:${encodeURIComponent(
    identity.participant_id,
  )}:${encodeURIComponent(identity.game_session_id)}`;
}

function isReusableEnvelope(
  storedJson: string,
  identity: ResearchExportSessionIdentity,
): boolean {
  let parsed: unknown;

  try {
    parsed = JSON.parse(storedJson);
  } catch {
    return false;
  }

  if (!isRecord(parsed)) {
    return false;
  }

  return (
    typeof parsed.export_id === 'string' &&
    UUID_PATTERN.test(parsed.export_id) &&
    parsed.participant_id === identity.participant_id &&
    parsed.game_session_id === identity.game_session_id &&
    parsed.launch_mode === 'test' &&
    isRecord(parsed.payload)
  );
}

function readExportId(envelopeJson: string): string | null {
  try {
    const parsed: unknown = JSON.parse(envelopeJson);

    if (isRecord(parsed) && typeof parsed.export_id === 'string') {
      return parsed.export_id;
    }
  } catch {
    // Unreachable for envelopes this module built; defensive only.
  }

  return null;
}

function mapResponse(
  httpStatus: number,
  bodyText: string,
  exportId: string | null,
): ResearchExportResult {
  const body = parseJson(bodyText);

  if (httpStatus === 201 || httpStatus === 200) {
    if (!isAcknowledgementBody(body)) {
      return {
        status: 'failed',
        reason: 'malformed_response',
        http_status: httpStatus,
        error_code: null,
        export_id: exportId,
      };
    }

    return {
      status: 'acknowledged',
      duplicate: body.duplicate === true,
      export_id: body.export_id,
      http_status: httpStatus,
      server_received_at:
        typeof body.server_received_at === 'string'
          ? body.server_received_at
          : null,
    };
  }

  const errorCode = readErrorCode(body);

  if (httpStatus === 409) {
    return {
      status: 'failed',
      reason: 'export_id_conflict',
      http_status: 409,
      error_code: errorCode,
      export_id: exportId,
    };
  }

  if (httpStatus === 401) {
    return {
      status: 'failed',
      reason: 'unauthorized',
      http_status: 401,
      error_code: errorCode,
      export_id: exportId,
    };
  }

  if (httpStatus === 403) {
    return {
      status: 'failed',
      reason: 'forbidden',
      http_status: 403,
      error_code: errorCode,
      export_id: exportId,
    };
  }

  return {
    status: 'failed',
    reason: 'unexpected_status',
    http_status: httpStatus,
    error_code: errorCode,
    export_id: exportId,
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

interface AcknowledgementBody extends Record<string, unknown> {
  ok: true;
  acknowledged: true;
  export_id: string;
}

function isAcknowledgementBody(body: unknown): body is AcknowledgementBody {
  return (
    isRecord(body) &&
    body.ok === true &&
    body.acknowledged === true &&
    typeof body.export_id === 'string'
  );
}

function readErrorCode(body: unknown): string | null {
  if (
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.code === 'string'
  ) {
    return body.error.code;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function generateUuidV4(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // RFC 4122 version (4) and variant (10xx) bits, matching the pattern the
  // development Edge Function enforces on export_id.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

  const part = (from: number, to?: number) => hex.slice(from, to);

  return `${part(0, 8)}-${part(8, 12)}-${part(12, 16)}-${part(16, 20)}-${part(20)}`;
}
