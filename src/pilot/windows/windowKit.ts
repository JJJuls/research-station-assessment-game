/**
 * Window kit — the shared plumbing of every evidence-led pilot v2 item
 * window (Unit 2+).
 *
 * One `ItemWindow` per ledger opportunity binds together the SA-13 validity
 * register (declare / offer / enter / complete / invalid / missing), the
 * item-owned provisional event family, and the REQUIRED per-opportunity
 * fields of the mission contract, stamped on every event:
 *
 *   item id · opportunity id · window/version id · form/counterbalance ·
 *   entry-state snapshot · presented timestamp · comprehension state ·
 *   start/end/exit state · input mode · item-owned raw components ·
 *   validity status + reason · missing/invalid/technical-failure handling ·
 *   NO computed trait score.
 *
 * Scientific boundary: every identifier here is provisional (`proto_*`),
 * never a canonical event name; events ride the unmapped
 * `researchRuntime.logInteraction` path with no canonical context, no
 * study item, no construct id and no success flag. A window that is never
 * opened, stopped, or hit by a technical failure records absence /
 * censoring / invalidity — never a low value. Nothing here aggregates,
 * weights or scores.
 */
import {
  declareOpportunity,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityInvalid,
  markOpportunityOffered,
  type OpportunityInvalidReason,
  opportunityValidity,
  recordPriorExposure,
  refreshValidityProbe,
  serializeOpportunities,
} from '../../measurement/validity';
import { researchRuntime } from '../../systems';
import type { LedgerItemId } from '../evidenceLedger';
import { refreshPilotCoverageProbe } from '../pilotCoverage';

export type InputMode = 'pointer' | 'keyboard' | 'system';

export type WindowExitState =
  | 'completed'
  | 'stopped'
  | 'departed'
  | 'closed_at_review'
  | 'technical_failure';

export type ComprehensionState =
  | 'not_required'
  | 'pending'
  | 'passed'
  | 'failed'
  | 'skipped';

export interface ItemWindowSpec {
  item: LedgerItemId;
  opportunityId: string;
  windowId: string;
  entryStateVersion: string;
  /** Event-family prefix, e.g. `proto_m01_board_` (ledger family). */
  family: string;
  /** Host scene key / object id written on every event. */
  scene: string;
  objectId: string;
  /** Parallel form (null when the module has one form). */
  form?: string | null;
  /** Counterbalance assignment (recorded, deterministic per session). */
  counterbalance?: string | null;
  /** Occasion tag for repeated-occasion items (o1/o2/check1/…). */
  occasion?: string | null;
}

export type WindowStatus = 'unopened' | 'open' | 'closed';

export class ItemWindow {
  readonly spec: ItemWindowSpec;
  private status: WindowStatus = 'unopened';
  private presentedAtMs: number | null = null;
  private openedAtMs: number | null = null;
  private activeMs = 0;
  private comprehension: ComprehensionState = 'not_required';
  private entrySnapshot: Record<string, unknown> = {};
  private exitState: WindowExitState | null = null;
  private declared = false;

  constructor(spec: ItemWindowSpec) {
    this.spec = spec;
  }

  // ——— register ————————————————————————————————————————————————————————

  /** Declares + offers the opportunity (idempotent; call at zone entry). */
  declare() {
    if (this.declared) {
      return;
    }

    declareOpportunity({
      opportunity_id: this.spec.opportunityId,
      owner: this.spec.item,
      entry_state_version: this.spec.entryStateVersion,
      form: this.spec.form ?? undefined,
      counterbalance: this.spec.counterbalance ?? undefined,
    });
    markOpportunityOffered(this.spec.opportunityId);
    this.declared = true;
    refreshValidityProbe();
    refreshPilotCoverageProbe();
  }

  recordPriorExposure(note: string) {
    this.declare();
    recordPriorExposure(this.spec.opportunityId, note);
    refreshValidityProbe();
  }

  // ——— lifecycle ————————————————————————————————————————————————————————

  windowStatus(): WindowStatus {
    return this.status;
  }

  isOpen(): boolean {
    return this.status === 'open';
  }

  isClosed(): boolean {
    return this.status === 'closed';
  }

  exit(): WindowExitState | null {
    return this.exitState;
  }

  setComprehension(state: ComprehensionState) {
    this.comprehension = state;
  }

  comprehensionState(): ComprehensionState {
    return this.comprehension;
  }

  /** The window was PRESENTED (visible/available) — before entry. */
  present(nowMs: number, snapshot: Record<string, unknown> = {}) {
    this.declare();

    if (this.presentedAtMs === null) {
      this.presentedAtMs = nowMs;
      this.entrySnapshot = { ...snapshot };
      this.log('presented', { input_mode: 'system' });
    }
  }

  /**
   * Opens the window (participant entered it). Records the entry-state
   * snapshot and the presented timestamp; idempotent while open.
   */
  open(nowMs: number, snapshot: Record<string, unknown> = {}) {
    this.declare();

    if (this.status === 'closed') {
      return false;
    }

    if (this.presentedAtMs === null) {
      this.presentedAtMs = nowMs;
    }

    if (this.status === 'unopened') {
      this.status = 'open';
      this.entrySnapshot = { ...this.entrySnapshot, ...snapshot };
      markOpportunityEntered(this.spec.opportunityId);
      refreshValidityProbe();
      refreshPilotCoverageProbe();
      this.log('opportunity_opened', {
        entry_state_snapshot: this.entrySnapshot,
        input_mode: 'system',
      });
    }

    this.openedAtMs = nowMs;

    return true;
  }

  /** Active-time bookkeeping: the surface/panel was hidden without closing. */
  pause(nowMs: number) {
    if (this.openedAtMs !== null) {
      this.activeMs += Math.max(0, nowMs - this.openedAtMs);
      this.openedAtMs = null;
    }
  }

  resume(nowMs: number) {
    if (this.status === 'open') {
      this.openedAtMs = nowMs;
    }
  }

  activeTimeMs(nowMs: number): number {
    return (
      this.activeMs +
      (this.openedAtMs === null ? 0 : Math.max(0, nowMs - this.openedAtMs))
    );
  }

  /**
   * Completes the window with its item-owned raw components. Raw
   * components are state descriptions — never a score. Unit 4: a window
   * whose observation is complete although the task itself was stopped
   * (an explicit neutral stop is itself the recorded behaviour, e.g. M19
   * `stop_choice`) passes `exitState: 'stopped'`; the register still
   * records a completed observation.
   */
  complete(
    nowMs: number,
    raw: Record<string, unknown>,
    inputMode: InputMode,
    options?: { exitState?: 'completed' | 'stopped' },
  ) {
    if (this.status !== 'open') {
      return false;
    }

    const exitState = options?.exitState ?? 'completed';

    this.pause(nowMs);
    this.status = 'closed';
    this.exitState = exitState;
    markOpportunityCompleted(this.spec.opportunityId);
    refreshValidityProbe();
    refreshPilotCoverageProbe();
    this.log('window_closed', {
      exit_state: exitState,
      raw_components: raw,
      active_ms: this.activeMs,
      input_mode: inputMode,
    });

    return true;
  }

  /**
   * Explicit stop / departure with the window open. `absent` codes the
   * register as `participant_absent` (missing); `censored` codes an
   * entered-unfinished departure (missing). Raw components so far are
   * recorded as context — never a low value.
   */
  stop(
    nowMs: number,
    exit: 'stopped' | 'departed' | 'closed_at_review',
    raw: Record<string, unknown>,
    inputMode: InputMode,
    reason:
      | 'participant_absent'
      | 'censored'
      | 'insufficient_opportunity' = 'censored',
  ) {
    if (this.status === 'closed') {
      return false;
    }

    this.pause(nowMs);
    this.status = 'closed';
    this.exitState = exit;
    // The register detail carries the substantive reason when the caller
    // supplies one (e.g. `depletion_not_acknowledged`), else the exit code.
    markOpportunityInvalid(
      this.spec.opportunityId,
      reason,
      typeof raw.invalid_detail === 'string' ? raw.invalid_detail : exit,
    );
    refreshValidityProbe();
    refreshPilotCoverageProbe();
    this.log('window_closed', {
      exit_state: exit,
      raw_components_partial: raw,
      active_ms: this.activeMs,
      input_mode: inputMode,
    });

    return true;
  }

  /** Never-entered closure at the review (missing, never low). */
  markAbsent(detail: string) {
    this.declare();

    if (this.status === 'closed') {
      return;
    }

    this.status = 'closed';
    this.exitState = 'closed_at_review';
    markOpportunityInvalid(
      this.spec.opportunityId,
      'participant_absent',
      detail,
    );
    refreshValidityProbe();
    refreshPilotCoverageProbe();
    this.log('window_closed', {
      exit_state: 'closed_at_review',
      input_mode: 'system',
    });
  }

  /** Technical failure — invalid, never behaviour. */
  technicalFailure(detail: string) {
    this.declare();
    this.status = 'closed';
    this.exitState = 'technical_failure';
    markOpportunityInvalid(
      this.spec.opportunityId,
      'technical_failure',
      detail,
    );
    refreshValidityProbe();
    refreshPilotCoverageProbe();
    this.log('technical_failure', { detail, input_mode: 'system' });
  }

  /** Invalid entry state (e.g. tutorial skipped) — invalid, never low. */
  invalidate(reason: OpportunityInvalidReason, detail: string) {
    this.declare();
    markOpportunityInvalid(this.spec.opportunityId, reason, detail);
    refreshValidityProbe();
    refreshPilotCoverageProbe();
    this.log('invalidated', { reason, detail, input_mode: 'system' });
  }

  // ——— telemetry ————————————————————————————————————————————————————————

  /** Logs `${family}${suffix}` with the required per-opportunity fields. */
  log(suffix: string, metadata: Record<string, unknown> = {}) {
    const record = serializeOpportunities().find(
      (candidate) => candidate.opportunity_id === this.spec.opportunityId,
    );

    researchRuntime.logInteraction({
      scene: this.spec.scene,
      object_id: this.spec.objectId,
      episode: `proto_${this.spec.item.toLowerCase()}`,
      event_type: `${this.spec.family}${suffix}`,
      metadata: {
        measure_id: this.spec.item,
        opportunity_id: this.spec.opportunityId,
        window_id: this.spec.windowId,
        entry_state_version: this.spec.entryStateVersion,
        form: this.spec.form ?? null,
        counterbalance: this.spec.counterbalance ?? null,
        occasion: this.spec.occasion ?? null,
        presented_at_ms: this.presentedAtMs,
        comprehension_state: this.comprehension,
        window_status: this.status,
        validity_status: record ? opportunityValidity(record) : 'pending',
        validity_reason: record?.invalid_reason ?? null,
        ...metadata,
      },
    });
  }

  /** Test-only escape hatch. */
  reset() {
    this.status = 'unopened';
    this.presentedAtMs = null;
    this.openedAtMs = null;
    this.activeMs = 0;
    this.comprehension = 'not_required';
    this.entrySnapshot = {};
    this.exitState = null;
    this.declared = false;
  }
}

/**
 * Deterministic per-session form assignment helper (validity.ts
 * `assignCounterbalance` precedent) — re-exported name kept local so
 * window modules import one kit.
 */
export { assignCounterbalance } from '../../measurement/validity';

/** Session id for counterbalance slots. */
export function currentSessionId(): string {
  return researchRuntime.sessionState.getMetadata().game_session_id;
}
