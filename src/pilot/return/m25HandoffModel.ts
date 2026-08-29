/**
 * M25 — questionnaire-primary / hybrid handoff (evidence-led pilot v2,
 * Unit 5). PURE model (no Phaser, no runtime imports; Node-testable).
 *
 * Workbook (sheet 09): QUESTIONNAIRE-PRIMARY / HYBRID REQUIRED — the
 * source item contains a private belief that cannot be inferred from
 * repetition; "REMOVE primary game-only inference; retain exact
 * questionnaire item and optional hybrid research probe". Candidate raw
 * variables `secondary_unchanged_resubmits_after_lock`,
 * `direct_belief_probe`, `lock_comprehension`; validity gate: no game-only
 * score; direct belief measure stored separately.
 *
 * Repository governance authorises NO in-game wording for the probe
 * (CLAUDE.md forbids questionnaire wording in player-facing text and no
 * approved hybrid prompt exists in the tree), so this unit implements the
 * HANDOFF SHELL only: a transparent, plainly labelled notice that a short
 * questionnaire follows after the session, acknowledged by the
 * participant. The exact response stays in the external questionnaire
 * (Qualtrics); `direct_belief_probe` is recorded as PENDING EXTERNAL
 * ADMINISTRATION and is never inferred from M22, M24, M26 or any other
 * behaviour. No locked-command repetition task is hosted here. Nothing is
 * scored, rewarded or made to look desirable.
 */

export const M25_OPPORTUNITY_ID = 'proto_m25_belief_probe';
export const M25_WINDOW_ID = 'm25_probe_w1';
export const M25_ENTRY_STATE_VERSION = 'm25-handoff-shell-v1';
export const M25_FAMILY = 'proto_m25_probe_';
export const M25_SECONDARY_ID = 'secondary_m25_lock_resubmits';

export const M25_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'handoff_acknowledged',
  'window_closed',
] as const;

/** Administration state of the direct response (never a value). */
export const M25_ADMINISTRATION = 'questionnaire_primary_pending_external';

/** Transparent participant-facing notice (no item content, no cue). */
export const M25_HANDOFF_TEXT =
  'SHIFT QUESTIONNAIRE NOTICE\n' +
  'A short questionnaire about how you work follows after this session, outside the station. Nothing is answered here and nothing here affects it — this notice only confirms you have seen it.';

export type M25HandoffState = 'pending' | 'presented' | 'acknowledged';

export interface M25State {
  handoff: M25HandoffState;
  presented_at_ms: number | null;
  acknowledged_at_ms: number | null;
  notice_views: number;
}

export function createM25State(): M25State {
  return {
    handoff: 'pending',
    presented_at_ms: null,
    acknowledged_at_ms: null,
    notice_views: 0,
  };
}

/** The notice became available (once). */
export function m25Present(state: M25State, nowMs: number): boolean {
  if (state.handoff !== 'pending') {
    return false;
  }

  state.handoff = 'presented';
  state.presented_at_ms = nowMs;

  return true;
}

export function m25View(state: M25State): boolean {
  if (state.handoff === 'pending') {
    return false;
  }

  state.notice_views += 1;

  return true;
}

/** The participant confirmed seeing the notice (once). */
export function m25Acknowledge(state: M25State, nowMs: number): boolean {
  if (state.handoff !== 'presented') {
    return false;
  }

  state.handoff = 'acknowledged';
  state.acknowledged_at_ms = nowMs;

  return true;
}

/** Presentation record only — the response is external and never stored here. */
export function m25RawComponents(state: M25State) {
  return {
    direct_belief_probe: null,
    administration: M25_ADMINISTRATION,
    handoff_presented: state.presented_at_ms !== null,
    handoff_acknowledged: state.acknowledged_at_ms !== null,
    notice_views: state.notice_views,
    lock_comprehension: null,
    secondary_unchanged_resubmits_after_lock: null,
    in_game_response: null,
  };
}
