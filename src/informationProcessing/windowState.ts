/**
 * Shared opportunity-window lifecycle (Information Processing foundation).
 *
 * One `IpWindow` record per module (embedded in the module's own state
 * container — never shared between modules). It bridges to the SA-13
 * validity register (`src/measurement/validity.ts`) and carries the
 * common contextual raw fields every module reports: opportunity id,
 * entry-state id, form, window status, active time, help consults,
 * submission count and invalid reason.
 *
 * Closure semantics (docs/game/INFORMATION-PROCESSING-LAB.md §5.3):
 * - `completed`  valid/final submission            → register: completed
 * - `exhausted`  bounded submission count reached  → register: completed
 *                (a completed opportunity whose raw outcome is recorded)
 * - `exited`     participant explicitly stopped    → register: missing
 *                (participant_absent, entered=true distinguishes it)
 * - `technical_failure`                            → register: invalid
 * - `censored`   session/lab left with window open → register: missing
 *
 * Leaving the overlay (ESC) without stopping keeps the window `open`.
 * Nothing here is a score; a failure or absence is never "low".
 */

import type { OpportunityInvalidReason } from '../measurement/validity';
import {
  assignCounterbalance,
  declareOpportunity,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityInvalid,
  markOpportunityOffered,
  recordPriorExposure,
  refreshValidityProbe,
} from '../measurement/validity';
import type { FormId, WindowStatus } from './model';
import { ipSessionId } from './telemetry';

export interface IpWindow {
  opportunity_id: string;
  owner: string;
  entry_state_version: string;
  form_id: FormId | null;
  /** `${entry_state_version}:${form}` — the standardised entry state. */
  entry_state_id: string;
  status: WindowStatus;
  panel_open: boolean;
  panel_opened_at_ms: number | null;
  active_ms: number;
  submission_count: number;
  help_consults: number;
  /** Times the overlay was opened (first open + re-entries). */
  open_count: number;
  invalid_reason: string | null;
  closed_at_ms: number | null;
}

export function createIpWindow(init: {
  opportunity_id: string;
  owner: string;
  entry_state_version: string;
  form_id: FormId | null;
}): IpWindow {
  return {
    opportunity_id: init.opportunity_id,
    owner: init.owner,
    entry_state_version: init.entry_state_version,
    form_id: init.form_id,
    entry_state_id: `${init.entry_state_version}:${init.form_id ?? 'single'}`,
    status: 'unopened',
    panel_open: false,
    panel_opened_at_ms: null,
    active_ms: 0,
    submission_count: 0,
    help_consults: 0,
    open_count: 0,
    invalid_reason: null,
    closed_at_ms: null,
  };
}

/** DEV-only launch-parameter reader (`?ip_form=A`, `?module=m14`). */
export function readDevParam(name: string): string | null {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return null;
  }

  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Deterministic parallel-form assignment per session (recorded), with a
 * DEV-only override (`?ip_form=B` for every module, or
 * `?ip_form_m14=B` for one) so both forms can be verified.
 */
export function resolveForm(moduleKey: string): FormId {
  const override =
    readDevParam(`ip_form_${moduleKey}`) ?? readDevParam('ip_form');

  if (override === 'A' || override === 'B') {
    return override;
  }

  return assignCounterbalance<FormId>(ipSessionId(), `ip_form_${moduleKey}`, [
    'A',
    'B',
  ]);
}

/** Declares the opportunity on the register (idempotent) and offers it. */
export function declareIpWindow(window: IpWindow) {
  declareOpportunity({
    opportunity_id: window.opportunity_id,
    owner: window.owner,
    entry_state_version: window.entry_state_version,
    ...(window.form_id === null ? {} : { form: window.form_id }),
    counterbalance: `form_${window.form_id ?? 'single'}`,
  });
  markOpportunityOffered(window.opportunity_id);
  refreshValidityProbe();
}

export type WindowEntry = 'opened' | 'reopened' | 'closed';

/** Lab-level order of first openings (raw contextual data, never scored). */
const openedOrder: string[] = [];

export function ipWindowsOpenedBefore(window: IpWindow): string[] {
  const index = openedOrder.indexOf(window.opportunity_id);

  return index >= 0 ? openedOrder.slice(0, index) : [...openedOrder];
}

/** Test-only escape hatch. */
export function resetIpWindowOrder() {
  openedOrder.length = 0;
}

/**
 * The overlay opened for this window. First entry moves the window to
 * `open` and marks it entered on the register; later entries are
 * re-entries; a terminally closed window opens as a read-only record.
 */
export function enterIpWindow(window: IpWindow, nowMs: number): WindowEntry {
  window.open_count += 1;

  if (window.status === 'unopened') {
    window.status = 'open';
    openedOrder.push(window.opportunity_id);
    markOpportunityEntered(window.opportunity_id);
    refreshValidityProbe();
    window.panel_open = true;
    window.panel_opened_at_ms = nowMs;

    return 'opened';
  }

  if (window.status === 'open') {
    window.panel_open = true;
    window.panel_opened_at_ms = nowMs;

    return 'reopened';
  }

  return 'closed';
}

export function accumulateIpActive(window: IpWindow, nowMs: number) {
  if (window.panel_open && window.panel_opened_at_ms !== null) {
    window.active_ms += Math.max(0, nowMs - window.panel_opened_at_ms);
    window.panel_opened_at_ms = nowMs;
  }
}

/** The overlay closed while the window stays open (ESC / leave). */
export function leaveIpPanel(window: IpWindow, nowMs: number) {
  if (!window.panel_open) {
    return;
  }

  accumulateIpActive(window, nowMs);
  window.panel_open = false;
  window.panel_opened_at_ms = null;
}

export function ipWindowIsOpen(window: IpWindow): boolean {
  return window.status === 'open';
}

export function ipWindowIsClosed(window: IpWindow): boolean {
  return window.status !== 'unopened' && window.status !== 'open';
}

export type IpCloseStatus = Exclude<WindowStatus, 'unopened' | 'open'>;

/** Terminal closure; maps onto the validity register (header comment). */
export function closeIpWindow(
  window: IpWindow,
  status: IpCloseStatus,
  nowMs: number,
  detail?: string,
): boolean {
  if (ipWindowIsClosed(window)) {
    return false;
  }

  accumulateIpActive(window, nowMs);
  window.panel_open = false;
  window.panel_opened_at_ms = null;
  window.status = status;
  window.closed_at_ms = nowMs;

  switch (status) {
    case 'completed':
    case 'exhausted':
      markOpportunityCompleted(window.opportunity_id);
      break;
    case 'exited':
      window.invalid_reason = 'participant_absent';
      markOpportunityInvalid(
        window.opportunity_id,
        'participant_absent',
        detail ?? 'participant stopped the task before submission',
      );
      break;
    case 'technical_failure':
      window.invalid_reason = 'technical_failure';
      markOpportunityInvalid(
        window.opportunity_id,
        'technical_failure',
        detail ?? 'technical failure',
      );
      break;
    case 'censored':
      window.invalid_reason = 'censored';
      markOpportunityInvalid(
        window.opportunity_id,
        'censored',
        detail ?? 'window left open at session/lab exit',
      );
      break;
    default:
      break;
  }

  refreshValidityProbe();

  return true;
}

/** Non-terminal validity marker (comprehension / entry-state problems). */
export function flagIpWindow(
  window: IpWindow,
  reason: OpportunityInvalidReason,
  detail: string,
) {
  window.invalid_reason = reason;
  markOpportunityInvalid(window.opportunity_id, reason, detail);
  refreshValidityProbe();
}

export function noteIpPriorExposure(window: IpWindow, note: string) {
  recordPriorExposure(window.opportunity_id, note);
  refreshValidityProbe();
}

export function bumpIpSubmission(window: IpWindow): number {
  window.submission_count += 1;

  return window.submission_count;
}

export function bumpIpHelp(window: IpWindow): number {
  window.help_consults += 1;

  return window.help_consults;
}

/** The common contextual raw fields (events, probe, record view). */
export function ipWindowFields(window: IpWindow, nowMs?: number) {
  const active =
    nowMs !== undefined &&
    window.panel_open &&
    window.panel_opened_at_ms !== null
      ? window.active_ms + Math.max(0, nowMs - window.panel_opened_at_ms)
      : window.active_ms;

  return {
    opportunity_id: window.opportunity_id,
    entry_state_id: window.entry_state_id,
    form_id: window.form_id,
    window_status: window.status,
    active_ms: active,
    help_consults: window.help_consults,
    submission_count: window.submission_count,
    invalid_reason: window.invalid_reason,
    open_count: window.open_count,
    ip_windows_opened_before: ipWindowsOpenedBefore(window),
  };
}
