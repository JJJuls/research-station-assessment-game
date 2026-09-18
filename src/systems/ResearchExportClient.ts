import type { DataQualityMetrics } from './DataQualityTracker';
import type { RawGameEvent } from './EventLogger';
import type { EventIntegrity } from './EventStore';
import type { MissionState } from './SessionState';
import type {
  CompletionReason,
  LaunchMode,
  SessionStatus,
} from './SessionStatus';
import type { ScopedSummaryValue, SummaryDisposition } from './SummaryScope';

/**
 * Research-session export client (development ingestion unit; extended by
 * Pilot V3 Unit 2 for participant completion — PROVISIONAL(INT-2)).
 *
 * Sends one session envelope to the ingestion Edge Function
 * (`ingest-research-session`) and nothing else. This module is a TRANSPORT
 * layer only:
 *
 * - it never creates, mutates, or removes raw events, summary variables,
 *   or data-quality metrics — it serialises what existing instrumentation
 *   already assembled;
 * - its results are client-side transport status, kept deliberately OUT of
 *   the raw event log and the scoring surface, so transport state can
 *   never be conflated with research data-quality state. The status axes
 *   it carries (PROVISIONAL(INT-5)) are envelope metadata, never events;
 * - it refuses to send unless the resolved launch mode is allowed to export
 *   (`test` always; `production` only from a participant bundle or an
 *   explicit DEV test hook; `development` never), so a developer session
 *   can never submit a production row by accident.
 *
 * Idempotency (PROVISIONAL(INT-2.5)): the first envelope built for a
 * (participant_id, game_session_id, page_load_index, session_status)
 * combination is frozen (serialised) into `sessionStorage`; every retry of
 * that combination resends the SAME bytes with the SAME `export_id`, so
 * the server acknowledges duplicates (200) instead of storing a second row
 * or raising a content conflict (409). A changed session status or a new
 * page load is a NEW export with a new `export_id`.
 */

export interface ResearchExportPayload {
  /** Explicit payload contract version (SummaryScope.EXPORT_SCHEMA_VERSION). */
  export_schema_version: string;
  game_version: string;
  asset_set_version: string;
  /**
   * The scoring-plan summary, SCOPED: a field that was not observed is
   * `null` and its reason is in `summary_dispositions` — never a zero.
   */
  summary: Record<string, ScopedSummaryValue>;
  summary_dispositions: Record<string, SummaryDisposition>;
  /** Scope label ('legacy_full' when the route offers every family). */
  summary_scope: string;
  summary_scope_version: string;
  raw_events: RawGameEvent[];
  data_quality: DataQualityMetrics;
  /**
   * The existing capture (DataQualityTracker) deliberately records a COUNT
   * only — never error content — so no message/stack detail exists to
   * export.
   */
  technical_errors: { technical_error_count: number };
  /**
   * Pilot V3 (Unit 1) — losslessness fields, additive. PROVISIONAL(INT-2 /
   * P0-3 / P1-9): payload-contract additions pending the research owner's
   * event-schema ruling. `raw_events` stays the current page load's log
   * (what the summary is computed from); `prior_page_load_events` are
   * events an earlier page load of the same identity persisted in the
   * durable store, carried separately so nothing is lost and nothing is
   * double-counted. `event_integrity` lets a reader verify sequence
   * continuity without trusting the client.
   */
  page_load_index: number;
  prior_page_load_events: RawGameEvent[];
  event_integrity: EventIntegrity;
  /**
   * Pilot V3 (Unit 2) — PROVISIONAL(INT-2): mission state and environment
   * controls ride with the raw events so every derived variable is
   * reproducible from the export alone. `raw_events_omitted` is set only
   * on the size-bounded keep-alive export sent at page hide (the events
   * remain in the device buffer and in any later export).
   */
  mission_state: MissionState;
  environment: { prefers_reduced_motion: boolean | null };
  raw_events_omitted?: boolean;
  /**
   * Audit 2026-09 B2 — PROVISIONAL: the measurement validity register
   * (per-opportunity dispositions) and pilot coverage snapshot, installed
   * by the pilot layer via the export augmenter. Absent on routes that
   * install no augmenter.
   */
  measurement_validity?: unknown;
  pilot_coverage?: unknown;
  /** How many of the current page load's events the compact export dropped. */
  raw_events_omitted_count?: number;
}

export interface ResearchExportEnvelope {
  export_id: string;
  participant_id: string;
  game_session_id: string;
  launch_mode: LaunchMode;
  /** PROVISIONAL(INT-5) status axes at the moment the envelope was frozen. */
  session_status: SessionStatus;
  completion_reason: CompletionReason | null;
  /** 1-based count of exports this page load has frozen (audit trail). */
  export_sequence: number;
  /**
   * Pilot V3 (Unit 1), PROVISIONAL(INT-2.5): the frozen envelope is scoped
   * to one page load, so a reload of the same identity submits a NEW
   * export (new export_id, carrying the earlier events as
   * `prior_page_load_events`) instead of resending the stale pre-reload
   * bytes. Duplicate detection stays per export_id.
   */
  page_load_index: number;
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
  /** Page load the envelope belongs to (1 = first load). */
  page_load_index: number;
  /**
   * Sequence of the last recorded event (keep-alive freshness, P12): a
   * compact keep-alive envelope is frozen per sequence, so a later
   * pagehide that has NEW events builds a fresh envelope, while a retry
   * with no new event still re-sends the identical bytes (server dedupe).
   */
  last_sequence?: number;
}

/** Everything the transport needs to decide and label one submission. */
export interface ResearchExportContext {
  launch_mode: LaunchMode;
  export_allowed: boolean;
  session_status: SessionStatus;
  completion_reason: CompletionReason | null;
}

export type ResearchExportRefusalReason =
  | 'launch_mode_not_allowed'
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
      attempts: number;
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
      attempts: number;
    };

export interface ResearchExportClientOptions {
  getContext: () => ResearchExportContext;
  getConfig: () => ResearchExportConfig;
  getSessionIdentity: () => ResearchExportSessionIdentity;
  /** `compact` = size-bounded keep-alive payload for page hide. */
  buildPayload: (kind: 'full' | 'compact') => ResearchExportPayload;
}

export type ResearchExportKind = 'full' | 'compact' | 'debug';

export interface ResearchExportSubmitOptions {
  /**
   * Envelope family: `full` for the participant pipeline, `debug` for the
   * developer console completion — separate frozen envelopes, so a debug
   * completion can never make a later participant completion resend stale
   * bytes (scientific review finding 6).
   */
  kind?: 'full' | 'debug';
  /** Total attempts for retryable failures (network, timeout, 5xx). */
  attempts?: number;
  /** Backoff between attempts (ms), multiplied by the attempt number. */
  backoffMs?: number;
  /** Progress hook, called before each attempt (1-based, of total). */
  onAttempt?: (attempt: number, of: number) => void;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_BACKOFF_MS = 1_000;
const MAX_ID_LENGTH = 128;
const STORAGE_KEY_PREFIX = 'research-export:v2';
/** Browsers cap in-flight keep-alive bodies at 64 KiB; stay under it. */
export const KEEPALIVE_BODY_LIMIT_BYTES = 60_000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RETRYABLE_FAILURES: ReadonlySet<ResearchExportFailureReason> = new Set([
  'timeout',
  'network_error',
  'unexpected_status',
]);

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
  private exportSequence = 0;

  constructor(private readonly options: ResearchExportClientOptions) {}

  getLastResult(): ResearchExportResult | null {
    return this.lastResult;
  }

  /** Exports frozen by this page load so far. */
  getExportSequence(): number {
    return this.exportSequence;
  }

  /**
   * Submits the frozen export envelope for the current session identity
   * and status, building and freezing it on first call. Never rejects —
   * every outcome is a typed `ResearchExportResult`.
   */
  submit(
    submitOptions: ResearchExportSubmitOptions = {},
  ): Promise<ResearchExportResult> {
    if (this.inFlight !== null) {
      return this.inFlight;
    }

    const request = this.performSubmit(submitOptions)
      .catch(
        (): ResearchExportResult => ({
          status: 'failed',
          reason: 'unexpected_status',
          http_status: null,
          error_code: null,
          export_id: null,
          attempts: 1,
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

  /**
   * Best-effort, size-bounded submission for page hide (`keepalive`): the
   * browser finishes the request after the page is gone, so nothing can be
   * awaited or retried. Returns whether a request was started. Never throws.
   */
  submitKeepalive(
    statusOverride: Pick<
      ResearchExportContext,
      'session_status' | 'completion_reason'
    > | null = null,
  ): boolean {
    try {
      const baseContext = this.options.getContext();
      // The early-exit signal is carried on the envelope only; the caller's
      // status machine is never mutated by a page hide (scientific review
      // finding 1: a backgrounded tab is not an abandoned session).
      const context =
        statusOverride === null
          ? baseContext
          : { ...baseContext, ...statusOverride };

      if (!context.export_allowed) {
        return false;
      }

      const config = this.options.getConfig();
      const ingestUrl = normaliseConfigValue(config.ingestUrl);
      const publishableKey = normaliseConfigValue(config.publishableKey);
      const identity = this.options.getSessionIdentity();

      if (
        ingestUrl === null ||
        publishableKey === null ||
        !isValidIdentifier(identity.participant_id) ||
        !isValidIdentifier(identity.game_session_id)
      ) {
        return false;
      }

      const envelopeJson = this.getOrFreezeEnvelope(
        identity,
        context,
        'compact',
      );

      if (typeof fetch !== 'function') {
        return false;
      }

      void fetch(ingestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: publishableKey,
        },
        body: envelopeJson,
        keepalive: true,
      }).catch(() => undefined);

      return true;
    } catch {
      return false;
    }
  }

  private async performSubmit(
    submitOptions: ResearchExportSubmitOptions,
  ): Promise<ResearchExportResult> {
    // Gate order matters: the mode check runs before anything else, so a
    // session that may not export never even builds an envelope.
    const context = this.options.getContext();

    if (!context.export_allowed) {
      return { status: 'refused', reason: 'launch_mode_not_allowed' };
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

    const envelopeJson = this.getOrFreezeEnvelope(
      identity,
      context,
      submitOptions.kind ?? 'full',
    );
    const exportId = readExportId(envelopeJson);
    const attempts = Math.max(1, Math.floor(submitOptions.attempts ?? 1));
    const backoffMs = Math.max(
      0,
      submitOptions.backoffMs ?? DEFAULT_BACKOFF_MS,
    );
    let result: ResearchExportResult | null = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      if (attempt > 1) {
        await sleep(backoffMs * (attempt - 1));
      }

      try {
        submitOptions.onAttempt?.(attempt, attempts);
      } catch {
        // A progress listener can never affect the transport.
      }

      result = await this.send(
        ingestUrl,
        publishableKey,
        config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        envelopeJson,
        exportId,
        attempt,
      );

      if (
        result.status === 'acknowledged' ||
        (result.status === 'failed' && !RETRYABLE_FAILURES.has(result.reason))
      ) {
        return result;
      }
    }

    return (
      result ?? {
        status: 'failed',
        reason: 'unexpected_status',
        http_status: null,
        error_code: null,
        export_id: exportId,
        attempts,
      }
    );
  }

  /**
   * Returns the frozen envelope for this identity + status, building and
   * persisting it on first use. A stored envelope is reused ONLY when it
   * still parses and matches; anything corrupt is replaced by a fresh
   * envelope with a fresh `export_id`.
   */
  private getOrFreezeEnvelope(
    identity: ResearchExportSessionIdentity,
    context: ResearchExportContext,
    kind: ResearchExportKind,
  ): string {
    const key = storageKeyFor(identity, context.session_status, kind);
    const stored = this.readStored(key);

    if (stored !== null && isReusableEnvelope(stored, identity, context)) {
      return stored;
    }

    this.exportSequence += 1;

    let payload = this.options.buildPayload(
      kind === 'compact' ? 'compact' : 'full',
    );
    let envelope: ResearchExportEnvelope = {
      export_id: generateUuidV4(),
      participant_id: identity.participant_id,
      game_session_id: identity.game_session_id,
      launch_mode: context.launch_mode,
      session_status: context.session_status,
      completion_reason: context.completion_reason,
      export_sequence: this.exportSequence,
      page_load_index: identity.page_load_index,
      client_created_at: new Date().toISOString(),
      payload,
    };
    let envelopeJson = JSON.stringify(envelope);

    if (
      kind === 'compact' &&
      byteLength(envelopeJson) > KEEPALIVE_BODY_LIMIT_BYTES
    ) {
      // Keep-alive bodies are capped by the browser. Keep as many of the
      // MOST RECENT current-page-load events as fit (prior page loads are
      // dropped first — they were exported by their own page load or stay
      // in the device buffer), and say exactly how many were omitted; the
      // full log stays on the device for any later export.
      const total = payload.raw_events.length;
      let kept = payload.raw_events;

      payload = { ...payload, prior_page_load_events: [] };
      envelope = { ...envelope, payload };
      envelopeJson = JSON.stringify(envelope);

      while (
        byteLength(envelopeJson) > KEEPALIVE_BODY_LIMIT_BYTES &&
        kept.length > 0
      ) {
        kept = kept.slice(Math.max(1, Math.ceil(kept.length * 0.25)));
        payload = {
          ...payload,
          raw_events: kept,
          raw_events_omitted: true,
          raw_events_omitted_count: total - kept.length,
        };
        envelope = { ...envelope, payload };
        envelopeJson = JSON.stringify(envelope);
      }
    }

    // A fresher keep-alive envelope supersedes the previous one: only the
    // latest compact envelope is kept (bounded storage).
    if (kind === 'compact') {
      if (this.lastCompactKey !== null && this.lastCompactKey !== key) {
        this.removeStored(this.lastCompactKey);
      }

      this.lastCompactKey = key;
    }

    this.writeStored(key, envelopeJson);

    return envelopeJson;
  }

  private async send(
    ingestUrl: string,
    publishableKey: string,
    timeoutMs: number,
    envelopeJson: string,
    exportId: string | null,
    attempt: number,
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

      return mapResponse(response.status, bodyText, exportId, attempt);
    } catch (error) {
      return {
        status: 'failed',
        reason: isAbortError(error) ? 'timeout' : 'network_error',
        http_status: null,
        error_code: null,
        export_id: exportId,
        attempts: attempt,
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

  private lastCompactKey: string | null = null;

  private removeStored(key: string): void {
    this.memoryFallback.delete(key);

    try {
      sessionStorage.removeItem(key);
    } catch {
      // Unavailable storage: nothing to remove.
    }
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function byteLength(text: string): number {
  return typeof TextEncoder === 'function'
    ? new TextEncoder().encode(text).byteLength
    : text.length;
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

function storageKeyFor(
  identity: ResearchExportSessionIdentity,
  sessionStatus: SessionStatus,
  kind: ResearchExportKind,
): string {
  // encodeURIComponent keeps the identity components unambiguous even if
  // an id itself contains the separator character.
  return `${STORAGE_KEY_PREFIX}:${encodeURIComponent(
    identity.participant_id,
  )}:${encodeURIComponent(identity.game_session_id)}:${
    identity.page_load_index
  }:${sessionStatus}:${kind}${
    kind === 'compact' && identity.last_sequence !== undefined
      ? `:seq${identity.last_sequence}`
      : ''
  }`;
}

function isReusableEnvelope(
  storedJson: string,
  identity: ResearchExportSessionIdentity,
  context: ResearchExportContext,
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
    parsed.page_load_index === identity.page_load_index &&
    parsed.launch_mode === context.launch_mode &&
    parsed.session_status === context.session_status &&
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
  attempts: number,
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
        attempts,
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
      attempts,
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
      attempts,
    };
  }

  if (httpStatus === 401) {
    return {
      status: 'failed',
      reason: 'unauthorized',
      http_status: 401,
      error_code: errorCode,
      export_id: exportId,
      attempts,
    };
  }

  if (httpStatus === 403) {
    return {
      status: 'failed',
      reason: 'forbidden',
      http_status: 403,
      error_code: errorCode,
      export_id: exportId,
      attempts,
    };
  }

  return {
    status: 'failed',
    reason: 'unexpected_status',
    http_status: httpStatus,
    error_code: errorCode,
    export_id: exportId,
    attempts,
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
  // Edge Function enforces on export_id.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

  const part = (from: number, to?: number) => hex.slice(from, to);

  return `${part(0, 8)}-${part(8, 12)}-${part(12, 16)}-${part(16, 20)}-${part(20)}`;
}
