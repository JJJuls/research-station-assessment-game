/**
 * M02 — window adapter of the case workspace (Station 080 M01–M26 run,
 * Unit 13). Owns the register window and the session-scope model state,
 * reads the workspace containers from the inventory store, and delegates
 * every command to the pure model (`m02RetrievalModel.ts`), logging
 * through the window's `proto_m02_workspace_*` family with the protocol
 * stamp.
 *
 * Mechanic (inventory overlay mode 'm02case'): an intake tray holds six
 * case bundles of four visible kinds; four trays can each be given a
 * label from a short list (or none). Cases move by drag / drop or the
 * keyboard through the shared engine. HAND OVER freezes the layout; six
 * requests follow in a balanced order, each advancing on its first answer
 * (a selected case, right or wrong) or on "Cannot locate"; the request
 * record is shown only after the sixth answer.
 *
 * Closure rules: the sixth answer completes the window; closing the
 * overlay keeps it open (fail-forward) and pauses the open request's
 * focused clock; the review closes an open workspace with the answers as
 * they stand and marks a never-opened one absent; a workspace opened in
 * an earlier page load is never re-run. The v2 two-probe family
 * (`proto_m02_case_*`) keeps its v2 meaning in the frozen ledger and is
 * retired from the route.
 */
import { CONTAINER_IDS } from '../../inventory/model';
import type { InventoryChange } from '../../inventory/store';
import {
  getInventoryState,
  onInventoryStoreChange,
  seedContainerPositional,
} from '../../inventory/store';
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import {
  createM02State,
  M02_CASES,
  M02_ENTRY_STATE_VERSION,
  M02_FAMILY,
  M02_OPPORTUNITY_ID,
  M02_ORDER_IDS,
  M02_TRAY_IDS,
  M02_WINDOW_IDS,
  m02AnswerPick,
  type M02AnswerResult,
  m02Begin,
  m02CannotLocate,
  type M02Case,
  m02Case,
  m02CurrentRequest,
  m02EmptySelection,
  m02EntrySnapshot,
  m02Feedback,
  m02FeedbackText,
  m02Finish,
  type M02Form,
  m02Freeze,
  m02HandOver,
  m02IntakeOrder,
  type M02Label,
  m02LayoutChangeRefused,
  m02LayoutSummary,
  type M02LogSink,
  m02NextLabel,
  m02NoteFeedbackReview,
  m02NoteMove,
  type M02OrderId,
  type M02Phase,
  type M02Placements,
  m02PriorAdministration,
  m02RawComponents,
  m02SetLabel,
  type M02State,
  m02SurfaceClosed,
  m02SurfaceReopened,
} from './m02RetrievalModel';
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

export {
  M02_FAMILY,
  M02_OPPORTUNITY_ID,
  M02_REQUEST_COUNT,
  M02_SETTLE_MS,
  M02_WINDOW_IDS,
} from './m02RetrievalModel';

export const M02C_OPPORTUNITY_ID = M02_OPPORTUNITY_ID;
export const M02C_WINDOW_IDS = M02_WINDOW_IDS;
export const M02C_ENTRY_STATE_VERSION = M02_ENTRY_STATE_VERSION;
export const M02C_FAMILY = M02_FAMILY;
export const M02C_CASES = M02_CASES;
export const M02C_TRAY_IDS = M02_TRAY_IDS;
export const M02C_PRIOR_ADMINISTRATION = 'prior_administration';

export type M02CForm = M02Form;
export type M02CLabel = M02Label;
export type M02CPhase = M02Phase;
export type M02CCase = M02Case;

const M02C_CONTAINER_IDS: readonly string[] = [
  CONTAINER_IDS.m02cDesk,
  ...M02_TRAY_IDS,
];

let state: M02State | null = null;
let unsubscribe: (() => void) | null = null;
let moveInputMode: InputMode = 'system';
let entryContext: Record<string, unknown> = {};

function ensureState(): M02State {
  if (state === null) {
    const session = currentSessionId();

    state = createM02State(
      assignCounterbalance<M02Form>(session, 'm02_case_workspace_form', [
        'form_a',
        'form_b',
      ]),
      assignCounterbalance<M02OrderId>(
        session,
        'm02_request_order',
        M02_ORDER_IDS,
      ),
    );
  }

  return state;
}

export const m02cWindow = new ItemWindow({
  item: 'M02',
  opportunityId: M02_OPPORTUNITY_ID,
  windowId: M02_WINDOW_IDS.filing,
  entryStateVersion: M02_ENTRY_STATE_VERSION,
  family: M02_FAMILY,
  scene: 'records_workshop',
  objectId: 'm02_case_workspace',
});

const sink: M02LogSink = (suffix, metadata) => {
  m02cWindow.log(suffix, { ...protocolStamp(), ...metadata });
};

export function declareM02C() {
  const s = ensureState();

  m02cWindow.spec.form = s.form;
  m02cWindow.spec.counterbalance = `${s.form}/${s.order}`;
  m02cWindow.declare();
}

export function m02cState(): Readonly<M02State> {
  return ensureState();
}

export function m02cPhase(): M02Phase {
  return ensureState().phase;
}

export function m02cCase(definitionId: string): M02Case | undefined {
  return m02Case(definitionId);
}

/** True when the workspace was administered in an earlier page load. */
export function m02cAdministeredBefore(): boolean {
  return ensureState().closureReason === M02C_PRIOR_ADMINISTRATION;
}

/** Current slot of every case, by definition id (read from the store). */
export function m02cPlacements(): M02Placements {
  const placements: M02Placements = {};
  const inv = getInventoryState();

  for (const containerId of M02C_CONTAINER_IDS) {
    const container = inv.containers[containerId];

    if (container === undefined) {
      continue;
    }

    container.slots.forEach((slot, slotIndex) => {
      if (slot !== null) {
        placements[slot.definitionId] = {
          container_id: containerId,
          slot_index: slotIndex,
        };
      }
    });
  }

  return placements;
}

/** Raw workspace description as it stands (never a score). */
export function m02cWorkspaceSummary() {
  return m02LayoutSummary(m02cPlacements(), ensureState().labels);
}

/**
 * The overlay states the input mode of the placement it is about to
 * issue, so the move observed on the store carries it.
 */
export function noteM02CMoveInput(inputMode: InputMode) {
  moveInputMode = inputMode;
}

/**
 * The host scene states what it knows at the open (the route stage and
 * the other Workshop items' window states); recorded in the entry
 * snapshot at the first open.
 */
export function noteM02CEntry(entry: Record<string, unknown>) {
  entryContext = { ...entry };
}

function observeMoves() {
  if (unsubscribe !== null) {
    return;
  }

  let last = m02cPlacements();

  unsubscribe = onInventoryStoreChange((change: InventoryChange) => {
    if (!change.ok || change.namespace !== 'm02c') {
      return;
    }

    if (change.op === 'seed_m02c_desk') {
      last = m02cPlacements();
      return;
    }

    // A held case is absent from the placement scan; keeping its last
    // real container in the baseline means a pick-up / cancel cycle is
    // never a move and a place records its true origin.
    const next = m02cPlacements();
    const s = ensureState();

    for (const c of M02_CASES) {
      const from = last[c.definitionId]?.container_id ?? null;
      const to = next[c.definitionId]?.container_id ?? null;

      if (from === to || to === null) {
        continue;
      }

      m02NoteMove(s, c.definitionId, from, to, moveInputMode, sink);
    }

    last = { ...last, ...next };
  });
}

function stopObserving() {
  unsubscribe?.();
  unsubscribe = null;
}

/**
 * The workspace was PRESENTED: the Work Order Board's briefing lists the
 * case workspace. Logged once; a presented-but-never-opened workspace is
 * `declined` at extraction.
 */
export function presentM02C(nowMs: number) {
  declareM02C();

  const s = ensureState();

  m02cWindow.present(nowMs, m02EntrySnapshot(s.form, s.order));
}

/** Opens (or reopens) the workspace; seeds the intake tray on first open. */
export function openM02CWorkspace(nowMs: number): M02Phase {
  declareM02C();

  const s = ensureState();

  if (s.phase === 'unopened') {
    // Reload guard (register §5.14): the raw log of an earlier page load
    // already holds an opened workspace. Never re-run it.
    if (m02PriorAdministration(researchRuntime.getPriorPageLoadEvents())) {
      m02Freeze(s, nowMs, M02C_PRIOR_ADMINISTRATION);
      m02cWindow.recordPriorExposure(
        'case workspace opened in an earlier page load of this identity',
      );
      m02cWindow.technicalFailure(
        'reload after administration: workspace not re-run',
      );

      return s.phase;
    }

    const seed = seedContainerPositional(
      CONTAINER_IDS.m02cDesk,
      m02IntakeOrder(s.form).map((definitionId) => ({
        definitionId,
        quantity: 1,
      })),
      'seed_m02c_desk',
    );

    if (!seed.ok) {
      m02Freeze(s, nowMs, 'technical_failure');
      m02cWindow.technicalFailure(
        `intake seed failed: ${seed.reason ?? 'unknown'}`,
      );

      return s.phase;
    }

    m02Begin(s);
    observeMoves();
    m02cWindow.setComprehension('not_required');
    m02cWindow.open(nowMs, {
      ...m02EntrySnapshot(s.form, s.order),
      ...entryContext,
    });

    return s.phase;
  }

  if (s.phase === 'closed') {
    m02NoteFeedbackReview(s, sink);

    return s.phase;
  }

  m02cWindow.resume(nowMs);
  m02SurfaceReopened(s, nowMs, sink);

  return s.phase;
}

/** Set a tray label (null clears). */
export function setM02CTrayLabel(
  trayId: string,
  label: M02Label,
  inputMode: InputMode,
): boolean {
  return m02SetLabel(ensureState(), trayId, label, inputMode, sink);
}

export function nextM02CTrayLabel(current: M02Label): M02Label {
  return m02NextLabel(current);
}

/** Completes the window once the model ended the series. */
function completeIfEnded(nowMs: number, inputMode: InputMode) {
  const s = ensureState();

  if (!m02Finish(s, nowMs, sink)) {
    return;
  }

  stopObserving();
  m02cWindow.complete(nowMs, m02RawComponents(s, 'completed'), inputMode);
}

/** HAND OVER: freezes the layout and presents the first request. */
export function commitM02CWorkspace(
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const s = ensureState();

  if (s.phase !== 'organise' || !m02cWindow.isOpen()) {
    return false;
  }

  // The handover belongs to the FILING window; the requests window id
  // applies from the first request onward.
  const placements = m02cPlacements();

  m02cWindow.spec.windowId = M02_WINDOW_IDS.requests;

  const result = m02HandOver(
    s,
    placements,
    nowMs,
    inputMode,
    (suffix, metadata) =>
      sink(suffix, {
        ...metadata,
        ...(suffix === 'handed_over'
          ? { window_id: M02_WINDOW_IDS.filing }
          : {}),
      }),
  );

  if (result === 'invalid') {
    m02cWindow.spec.windowId = M02_WINDOW_IDS.filing;

    return false;
  }

  if (result === 'series_complete') {
    // Every request was technically inaccessible: nothing to answer.
    m02Freeze(s, nowMs, 'technical_failure');
    stopObserving();
    m02cWindow.technicalFailure(
      'no requested case is held by the frozen layout',
    );
  }

  return true;
}

/** The case currently requested (null outside the series). */
export function m02cRequestedCase(): M02Case | null {
  const request = m02CurrentRequest(ensureState());

  return request === null ? null : (m02Case(request.case_id) ?? null);
}

/** 1-based position of the current request (null outside the series). */
export function m02cRequestNumber(): number | null {
  const request = m02CurrentRequest(ensureState());

  return request === null ? null : request.index + 1;
}

/** An empty slot was selected during the series (recorded, never an answer). */
export function noteM02CEmptySelection(
  containerId: string,
  slotIndex: number,
  inputMode: InputMode,
) {
  m02EmptySelection(ensureState(), containerId, slotIndex, inputMode, sink);
}

/** A drag was begun during the requests (the layout is frozen). */
export function noteM02CLayoutChangeRefused(
  containerId: string,
  slotIndex: number,
  inputMode: InputMode,
) {
  m02LayoutChangeRefused(
    ensureState(),
    containerId,
    slotIndex,
    inputMode,
    sink,
  );
}

/** The participant selected a slot that holds a case: the first answer. */
export function pickM02CRetrieval(
  pickedDefinitionId: string,
  containerId: string,
  slotIndex: number,
  inputMode: InputMode,
  nowMs: number,
): M02AnswerResult {
  if (!m02cWindow.isOpen()) {
    return 'invalid';
  }

  const result = m02AnswerPick(
    ensureState(),
    pickedDefinitionId,
    containerId,
    slotIndex,
    nowMs,
    inputMode,
    sink,
  );

  if (result === 'series_complete') {
    completeIfEnded(nowMs, inputMode);
  }

  return result;
}

/** "Cannot locate": an explicit answer without a selection. */
export function cannotLocateM02C(
  inputMode: InputMode,
  nowMs: number,
): M02AnswerResult {
  if (!m02cWindow.isOpen()) {
    return 'invalid';
  }

  const result = m02CannotLocate(ensureState(), nowMs, inputMode, sink);

  if (result === 'series_complete') {
    completeIfEnded(nowMs, inputMode);
  }

  return result;
}

/**
 * Owner ruling (28 September): the system-supplied case codes and
 * contents are not shown while a request is open — nor afterwards in a
 * workspace that was handed over and closed WITHOUT its request record
 * (the review, a fault): they return only with the record, the
 * authorised feedback point.
 */
export function m02cContentsConcealed(): boolean {
  const s = ensureState();

  return (
    s.phase === 'retrieve' ||
    (s.phase === 'closed' && s.handedOverAtMs !== null && !s.feedbackShown)
  );
}

/** The request record, in participant-facing lines (empty before the end). */
export function m02cFeedbackLines(): string[] {
  const s = ensureState();

  return s.feedbackShown ? m02Feedback(s).map(m02FeedbackText) : [];
}

/** Overlay closed without finishing: the window stays open (fail-forward). */
export function closeM02CPanel(nowMs: number) {
  const s = ensureState();

  if (!m02cWindow.isOpen()) {
    return;
  }

  if (m02SurfaceClosed(s, nowMs, m02cWorkspaceSummary(), sink)) {
    m02cWindow.pause(nowMs);
  }
}

/** Never opened → absent; open at the review → closed with the answers as they stand. */
export function closeM02CAtReview(nowMs: number) {
  const s = ensureState();

  if (m02cWindow.windowStatus() === 'unopened') {
    m02cWindow.markAbsent('case workspace never opened before the review');

    return;
  }

  if (m02cWindow.isOpen()) {
    const layoutNow = m02cWorkspaceSummary();

    m02Freeze(s, nowMs, 'closed_at_review');
    stopObserving();
    m02cWindow.stop(
      nowMs,
      'closed_at_review',
      m02RawComponents(s, 'closed_at_review', layoutNow),
      'system',
      'censored',
    );
  }
}

/** Test-only escape hatch. */
export function resetM02CState() {
  stopObserving();

  if (state !== null) {
    m02Freeze(state, 0, 'reset');
  }

  state = null;
  moveInputMode = 'system';
  entryContext = {};
  m02cWindow.reset();
  m02cWindow.spec.windowId = M02_WINDOW_IDS.filing;
  m02cWindow.spec.form = null;
  m02cWindow.spec.counterbalance = null;
}
