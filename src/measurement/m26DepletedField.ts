/**
 * M26 depleted-sector search module state (action-assessment rebuild,
 * Unit 2).
 *
 * The 26-measure developmental battery's M26 ("continued search after
 * verified knowledge that a bounded area is depleted"): the Reclaimed
 * Sector of the Coolant Yard — a small, visibly bounded, staked-off
 * area that is objectively empty.
 *
 * Window rules implemented here (Q28-analogue structure):
 * - Successful scanner/dig use is demonstrated FIRST in the main survey
 *   sector (route order guarantees the demonstration; the module records
 *   it as an entry-state fact, never as M26 evidence).
 * - The depletion is stated explicitly and credibly (a certificate
 *   readout naming the sector as reclaimed and certified empty) AND
 *   verified by the participant's own scanner pass showing no return.
 * - Comprehension is evidenced by an explicit acknowledgement act; the
 *   PRIMARY WINDOW opens only at that acknowledgement.
 * - A useful alternative is always visible and free to take, and leaving
 *   immediately is a fully valid outcome.
 * - ONLY post-acknowledgement scan/dig acts INSIDE the sector bounds
 *   belong to M26. Pre-acknowledgement searching, whole-map wandering
 *   and navigation mistakes are secondary or invalid, never primary.
 *
 * OWNERSHIP: own state container, own proto_m26_* family; reads/writes
 * nothing of any other module. All identifiers provisional; no scoring.
 */

export const M26_OPPORTUNITY_ID = 'proto_m26_reclaimed_sector';
export const M26_ENTRY_STATE_VERSION = 'm26-reclaimed-sector-v1';

/** The standardised depletion certificate (identical for everyone). */
export const M26_DEPLETION_CERTIFICATE =
  'RECLAIMED SECTOR 4C — salvage certificate: all deposits recovered and the ground certified empty. No scan target, dig yield or material of any kind remains inside the staked bounds.';

export interface M26State {
  /** Entry-state facts: successful scan/dig demonstrated beforehand. */
  demo_scan_done: boolean;
  demo_dig_done: boolean;
  /** Certificate readout displayed. */
  certificate_shown: boolean;
  /** Participant ran their own verifying scan inside the sector. */
  verification_scan_done: boolean;
  /** Explicit acknowledgement — the primary window opens here. */
  acknowledged: boolean;
  /** Post-acknowledgement in-sector search acts (the raw M26 record). */
  post_ack_scans: number;
  post_ack_digs: number;
  /** The useful alternative was taken / the sector was left. */
  alternative_taken: boolean;
  closed: boolean;
}

function createInitialM26State(): M26State {
  return {
    demo_scan_done: false,
    demo_dig_done: false,
    certificate_shown: false,
    verification_scan_done: false,
    acknowledged: false,
    post_ack_scans: 0,
    post_ack_digs: 0,
    alternative_taken: false,
    closed: false,
  };
}

export const m26State: M26State = createInitialM26State();

export function markM26DemoScan() {
  m26State.demo_scan_done = true;
}

export function markM26DemoDig() {
  m26State.demo_dig_done = true;
}

export function markM26CertificateShown() {
  m26State.certificate_shown = true;
}

export function markM26VerificationScan() {
  m26State.verification_scan_done = true;
}

/**
 * The acknowledgement is valid comprehension evidence only when the
 * certificate was actually shown first; the host must refuse otherwise.
 */
export function acknowledgeM26Depletion(): boolean {
  if (!m26State.certificate_shown) {
    return false;
  }

  m26State.acknowledged = true;

  return true;
}

export function m26WindowOpen(): boolean {
  return m26State.acknowledged && !m26State.closed;
}

/** Records one post-acknowledgement in-sector scan. Returns the count. */
export function recordM26PostAckScan(): number {
  m26State.post_ack_scans += 1;

  return m26State.post_ack_scans;
}

/** Records one post-acknowledgement in-sector dig. Returns the count. */
export function recordM26PostAckDig(): number {
  m26State.post_ack_digs += 1;

  return m26State.post_ack_digs;
}

export function markM26AlternativeTaken() {
  m26State.alternative_taken = true;
}

export function closeM26Window() {
  m26State.closed = true;
}

export function m26Summary() {
  return {
    entry_demo_complete: m26State.demo_scan_done && m26State.demo_dig_done,
    certificate_shown: m26State.certificate_shown,
    verification_scan_done: m26State.verification_scan_done,
    acknowledged: m26State.acknowledged,
    post_ack_scans: m26State.post_ack_scans,
    post_ack_digs: m26State.post_ack_digs,
    alternative_taken: m26State.alternative_taken,
    closed: m26State.closed,
  };
}

/** Test-only escape hatch. */
export function resetM26State() {
  Object.assign(m26State, createInitialM26State());
}
