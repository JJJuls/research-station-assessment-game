import type { GameSummaryVariables } from './ScoringManager';

export interface QualtricsLaunchParams {
  participant_id: string | null;
  game_session_id: string | null;
  condition: string | null;
  return_url: string | null;
  game_version: string | null;
}

/**
 * Return-URL policy — PROVISIONAL(INT-4) / PS-0 (Pilot V3 Unit 2).
 *
 * Navigation back to the survey happens only to an `https:` URL whose host
 * equals, or is a subdomain of, an allow-listed host. The default list is
 * the survey platform's own domain; `VITE_RETURN_URL_ALLOWED_HOSTS`
 * (comma-separated) replaces it at build time. DEV builds additionally
 * accept `http://localhost` / `127.0.0.1` so browser tests can observe the
 * navigation without leaving the machine. Credentials in the URL are
 * always refused. This closes the open-redirect finding without deciding
 * the INT-4 ruling: the research owner sets the list.
 */
export interface ReturnUrlPolicy {
  allowedHosts: string[];
  allowLocalhost: boolean;
}

export type ReturnUrlRefusal =
  | 'absent'
  | 'unparseable'
  | 'scheme_not_allowed'
  | 'host_not_allowed'
  | 'credentials_present';

export type ReturnUrlValidation =
  | { ok: true; url: URL }
  | { ok: false; reason: ReturnUrlRefusal };

export const DEFAULT_RETURN_URL_ALLOWED_HOSTS: readonly string[] = [
  'qualtrics.com',
];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function parseAllowedHosts(configured: string | undefined): string[] {
  // A single-label entry (e.g. `com`) would allow an entire top-level
  // domain; only registrable hosts with at least one dot are accepted.
  const entries = (configured ?? '')
    .split(',')
    .map((entry) => normaliseHost(entry))
    .filter((entry) => entry.length > 0 && entry.includes('.'));

  return entries.length === 0 ? [...DEFAULT_RETURN_URL_ALLOWED_HOSTS] : entries;
}

function normaliseHost(entry: string): string {
  return entry.trim().toLowerCase().replace(/^\*\./, '').replace(/^\./, '');
}

export function hostAllowed(hostname: string, allowedHosts: string[]): boolean {
  const host = hostname.toLowerCase();

  return allowedHosts.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

export function validateReturnUrl(
  raw: string | null,
  policy: ReturnUrlPolicy,
  base = 'http://localhost/',
): ReturnUrlValidation {
  if (raw === null || raw.trim() === '') {
    return { ok: false, reason: 'absent' };
  }

  let url: URL;

  try {
    url = new URL(raw, base);
  } catch {
    return { ok: false, reason: 'unparseable' };
  }

  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: 'credentials_present' };
  }

  const local = LOCAL_HOSTS.has(url.hostname.toLowerCase());

  if (url.protocol === 'https:') {
    if (hostAllowed(url.hostname, policy.allowedHosts)) {
      return { ok: true, url };
    }

    if (policy.allowLocalhost && local) {
      return { ok: true, url };
    }

    return { ok: false, reason: 'host_not_allowed' };
  }

  if (url.protocol === 'http:' && policy.allowLocalhost && local) {
    return { ok: true, url };
  }

  return { ok: false, reason: 'scheme_not_allowed' };
}

/**
 * Production defaults (no build-time environment read here so the module
 * stays Node-importable): the runtime supplies the configured policy.
 */
export function defaultReturnUrlPolicy(): ReturnUrlPolicy {
  return {
    allowedHosts: [...DEFAULT_RETURN_URL_ALLOWED_HOSTS],
    allowLocalhost: false,
  };
}

/**
 * What the return URL serialises: the numeric summary, or its scoped form
 * in which a non-observed field carries its disposition word instead of a
 * value (SummaryScope.scopedSummaryForUrl — absent is never zero).
 */
export type ReturnUrlSummary =
  | GameSummaryVariables
  | Record<string, string | number | boolean>;

export class QualtricsBridge {
  private launchParams: QualtricsLaunchParams;

  constructor(
    searchParams = getCurrentSearchParams(),
    private readonly policy: ReturnUrlPolicy = defaultReturnUrlPolicy(),
  ) {
    this.launchParams = {
      participant_id: searchParams.get('participant_id'),
      game_session_id: searchParams.get('game_session_id'),
      condition: searchParams.get('condition'),
      return_url: searchParams.get('return_url'),
      game_version: searchParams.get('game_version'),
    };
  }

  getLaunchParams() {
    return { ...this.launchParams };
  }

  /**
   * Unchanged since the V1 slice: appends every summary variable to the
   * launch-supplied `return_url` (relative URLs resolve against the page).
   * `extra` (Pilot V3) appends the PROVISIONAL(INT-5) status axes; nothing
   * here validates the destination — see `buildValidatedReturnUrl`.
   */
  buildReturnUrl(
    summaryVariables: ReturnUrlSummary,
    extra: Record<string, string | number | boolean> = {},
  ) {
    const { return_url: returnUrl } = this.launchParams;

    if (returnUrl === null || returnUrl.trim() === '') {
      return null;
    }

    try {
      const url = new URL(returnUrl, getCurrentHref());

      for (const [key, value] of Object.entries(summaryVariables)) {
        url.searchParams.set(key, String(value));
      }

      for (const [key, value] of Object.entries(extra)) {
        url.searchParams.set(key, String(value));
      }

      return url.toString();
    } catch {
      return null;
    }
  }

  /** Policy check of the launch-supplied destination (no parameters added). */
  validateReturnUrl(): ReturnUrlValidation {
    return validateReturnUrl(
      this.launchParams.return_url,
      this.policy,
      getCurrentHref(),
    );
  }

  /**
   * The only URL the participant pipeline may navigate to: the fully
   * built return URL, and only when the launch destination passes policy.
   */
  buildValidatedReturnUrl(
    summaryVariables: ReturnUrlSummary,
    extra: Record<string, string | number | boolean> = {},
  ): { url: string | null; validation: ReturnUrlValidation } {
    const validation = this.validateReturnUrl();

    if (!validation.ok) {
      return { url: null, validation };
    }

    return { url: this.buildReturnUrl(summaryVariables, extra), validation };
  }
}

function getCurrentSearchParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function getCurrentHref() {
  if (typeof window === 'undefined') {
    return 'http://localhost/';
  }

  return window.location.href;
}
