/**
 * M02 — provisional Incident Filing Workstation (interactive inventory
 * foundation).
 *
 * A standardised organisation opportunity: twelve document objects, three
 * case folders, a visible filing reference, counterbalanced starting
 * positions and one explicit "Commit filing state" action. The
 * participant physically files the documents with the shared drag/drop
 * engine — there are no answer buttons and no ordinary Sort control in
 * this context.
 *
 * SCIENTIFIC BOUNDARY:
 * - Every event here is in the `proto_m02_*` family ONLY (provisional,
 *   scenario_* / proto_* precedent — no canonical schema entry, no scoring).
 * - No M02 event name is shared with M03 or with secondary_inventory_*.
 * - No final M02 score is calculated anywhere — commit records raw
 *   placement components (misfiled/unfiled counts are state descriptions,
 *   not scores; interpretation belongs to the research owner).
 * - M02 items are namespace-bound: they can never enter the player
 *   inventory, and ordinary items can never enter the workstation.
 * - Aborts/technical failures mark the opportunity invalid/missing via
 *   the validity register — never "low".
 */

import {
  assignCounterbalance,
  declareOpportunity,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityInvalid,
  markOpportunityOffered,
  refreshValidityProbe,
} from '../measurement/validity';
import { researchRuntime } from '../systems';
import { M02_DOCUMENTS } from './itemDefs';
import { CONTAINER_IDS } from './model';
import type { InventoryChange } from './store';
import {
  getInventoryState,
  onInventoryStoreChange,
  seedContainerPositional,
} from './store';

export const M02_OPPORTUNITY_ID = 'proto_m02_incident_filing';
export const M02_ENTRY_STATE_VERSION = 'm02-incident-filing-v1';
export const M02_WINDOW_ID = 'm02_filing_window_1';

export type M02Counterbalance = 'layout_a' | 'layout_b';

/** Folder container per case id (the correct destinations). */
export const M02_CASE_FOLDERS: Record<string, string> = {
  'IR-7': CONTAINER_IDS.m02FolderIr7,
  'IR-12': CONTAINER_IDS.m02FolderIr12,
  'IR-19': CONTAINER_IDS.m02FolderIr19,
};

const M02_CONTAINER_IDS = [
  CONTAINER_IDS.m02Desk,
  CONTAINER_IDS.m02FolderIr7,
  CONTAINER_IDS.m02FolderIr12,
  CONTAINER_IDS.m02FolderIr19,
];

export type M02Status = 'unopened' | 'open' | 'committed';

interface M02State {
  status: M02Status;
  counterbalance: M02Counterbalance | null;
  panelOpen: boolean;
  panelOpenedAtMs: number | null;
  activeMs: number;
  referenceViews: number;
  moveCount: number;
  reversalCount: number;
  /** Container history per document (reversal detection). */
  history: Record<string, string[]>;
  observing: boolean;
  unsubscribe: (() => void) | null;
}

function createInitialM02State(): M02State {
  return {
    status: 'unopened',
    counterbalance: null,
    panelOpen: false,
    panelOpenedAtMs: null,
    activeMs: 0,
    referenceViews: 0,
    moveCount: 0,
    reversalCount: 0,
    history: {},
    observing: false,
    unsubscribe: null,
  };
}

let m02State = createInitialM02State();

function logM02(eventType: string, metadata: Record<string, unknown> = {}) {
  researchRuntime.logInteraction({
    scene: 'inventory_lab',
    object_id: 'm02_filing_workstation',
    episode: 'proto_m02',
    event_type: eventType,
    metadata: {
      measure_id: 'M02',
      opportunity_id: M02_OPPORTUNITY_ID,
      window_id: M02_WINDOW_ID,
      entry_state_version: M02_ENTRY_STATE_VERSION,
      counterbalance: m02State.counterbalance,
      ...metadata,
    },
  });
}

/** Current container of every document, by definition id. */
export function m02Placements(): Record<string, string> {
  const placements: Record<string, string> = {};
  const state = getInventoryState();

  for (const containerId of M02_CONTAINER_IDS) {
    for (const slot of state.containers[containerId].slots) {
      if (slot !== null) {
        placements[slot.definitionId] = containerId;
      }
    }
  }

  return placements;
}

/** Raw placement components — state description, never a score. */
export function m02PlacementSummary() {
  const placements = m02Placements();
  let misfiled = 0;
  let unfiled = 0;
  let untraceable = 0;
  const perDocument: Record<
    string,
    { code: string; case_id: string; container: string | null }
  > = {};

  for (const doc of M02_DOCUMENTS) {
    const container = placements[doc.definitionId] ?? null;

    perDocument[doc.definitionId] = {
      code: doc.code,
      case_id: doc.caseId,
      container,
    };

    if (container === null) {
      // A document outside every workstation container would be an
      // engine-invariant breach; recorded for validity, never as "low".
      untraceable += 1;
    } else if (container === CONTAINER_IDS.m02Desk) {
      unfiled += 1;
    } else if (container !== M02_CASE_FOLDERS[doc.caseId]) {
      misfiled += 1;
    }
  }

  return {
    per_document: perDocument,
    misfiled_count: misfiled,
    unfiled_count: unfiled,
    untraceable_count: untraceable,
  };
}

/** Counterbalanced starting order of the twelve documents on the desk. */
function deskSeedOrder(counterbalance: M02Counterbalance): string[] {
  const ids = M02_DOCUMENTS.map((doc) => doc.definitionId);

  return counterbalance === 'layout_a' ? ids : [...ids].reverse();
}

function observeMoves() {
  if (m02State.observing) {
    return;
  }

  m02State.observing = true;

  let lastPlacements = m02Placements();

  m02State.unsubscribe = onInventoryStoreChange((change: InventoryChange) => {
    if (!change.ok || change.namespace !== 'm02') {
      return;
    }

    if (change.op === 'seed_m02_desk') {
      lastPlacements = m02Placements();
      return;
    }

    // A held document is absent from the placement scan; keeping its last
    // REAL container in the baseline means pick-up/cancel cycles are not
    // counted as moves and move origins are preserved (a place records
    // from = the true source container, and returning a sheet to where it
    // came from is a no-op rather than a phantom move/reversal).
    const nextPlacements = m02Placements();

    for (const doc of M02_DOCUMENTS) {
      const from = lastPlacements[doc.definitionId] ?? null;
      const to = nextPlacements[doc.definitionId] ?? null;

      if (from === to || to === null) {
        continue;
      }

      if (m02State.status !== 'open') {
        continue;
      }

      m02State.moveCount += 1;

      const history = (m02State.history[doc.definitionId] ??= []);
      const isReversal = history.includes(to);

      history.push(to);
      logM02('proto_m02_item_moved', {
        document_id: doc.definitionId,
        document_code: doc.code,
        from_container: from,
        to_container: to,
      });

      if (isReversal) {
        m02State.reversalCount += 1;
        logM02('proto_m02_move_reversal', {
          document_id: doc.definitionId,
          document_code: doc.code,
          to_container: to,
        });
      }
    }

    lastPlacements = { ...lastPlacements, ...nextPlacements };
  });
}

export function m02Status(): M02Status {
  return m02State.status;
}

export function m02Counterbalance(): M02Counterbalance | null {
  return m02State.counterbalance;
}

/**
 * Declares the M02 opportunity (Lab scene create — the workstation is
 * offered by existing in the room, entered on first panel open).
 */
export function declareM02Opportunity() {
  const sessionId = researchRuntime.sessionState.getMetadata().game_session_id;
  const counterbalance =
    m02State.counterbalance ??
    assignCounterbalance<M02Counterbalance>(sessionId, 'm02_filing_start', [
      'layout_a',
      'layout_b',
    ]);

  m02State.counterbalance = counterbalance;
  declareOpportunity({
    opportunity_id: M02_OPPORTUNITY_ID,
    owner: 'M02',
    entry_state_version: M02_ENTRY_STATE_VERSION,
    counterbalance,
  });
  markOpportunityOffered(M02_OPPORTUNITY_ID);
  refreshValidityProbe();
}

/**
 * Opens the workstation panel. Seeds the counterbalanced desk layout on
 * first open; returns the status the panel should render ('committed'
 * renders the locked record view).
 */
export function openM02Workstation(nowMs: number): M02Status {
  declareM02Opportunity();

  if (m02State.status === 'committed') {
    logM02('proto_m02_reopened_after_commit');

    return 'committed';
  }

  if (m02State.status === 'unopened') {
    const seedChange = seedContainerPositional(
      CONTAINER_IDS.m02Desk,
      deskSeedOrder(m02State.counterbalance!).map((definitionId) => ({
        definitionId,
        quantity: 1,
      })),
      'seed_m02_desk',
    );

    if (!seedChange.ok) {
      markOpportunityInvalid(
        M02_OPPORTUNITY_ID,
        'technical_failure',
        `desk seed failed: ${seedChange.reason ?? 'unknown'}`,
      );
      refreshValidityProbe();
      logM02('proto_m02_technical_failure', {
        stage: 'seed',
        reason: seedChange.reason ?? 'unknown',
      });

      return m02State.status;
    }

    m02State.status = 'open';
    markOpportunityEntered(M02_OPPORTUNITY_ID);
    refreshValidityProbe();
    observeMoves();
    logM02('proto_m02_opportunity_opened', {
      desk_order: deskSeedOrder(m02State.counterbalance!),
    });
  }

  m02State.panelOpen = true;
  m02State.panelOpenedAtMs = nowMs;
  logM02('proto_m02_panel_opened');

  return m02State.status;
}

/** Marks the filing reference as read (comprehension component). */
export function viewM02Reference() {
  if (m02State.status !== 'open') {
    return;
  }

  m02State.referenceViews += 1;
  logM02('proto_m02_reference_viewed', {
    view_count: m02State.referenceViews,
  });
}

function accumulateActiveTime(nowMs: number) {
  if (m02State.panelOpen && m02State.panelOpenedAtMs !== null) {
    m02State.activeMs += Math.max(0, nowMs - m02State.panelOpenedAtMs);
    m02State.panelOpenedAtMs = null;
    m02State.panelOpen = false;
  }
}

/** Panel closed without commit: the window stays open for a later visit. */
export function closeM02Panel(nowMs: number) {
  if (!m02State.panelOpen) {
    return;
  }

  accumulateActiveTime(nowMs);

  if (m02State.status === 'open') {
    logM02('proto_m02_panel_closed_without_commit', {
      ...m02PlacementSummary(),
      elapsed_active_ms: m02State.activeMs,
    });
  }
}

/**
 * The single explicit "Commit filing state" action. Records the complete
 * final placement of every object plus process components; completes the
 * opportunity on the validity register. Idempotent after first commit.
 */
export function commitM02(nowMs: number): boolean {
  if (m02State.status !== 'open') {
    return false;
  }

  accumulateActiveTime(nowMs);
  m02State.status = 'committed';
  m02State.unsubscribe?.();
  m02State.unsubscribe = null;
  m02State.observing = false;

  logM02('proto_m02_committed', {
    ...m02PlacementSummary(),
    move_count: m02State.moveCount,
    reversal_count: m02State.reversalCount,
    reference_view_count: m02State.referenceViews,
    elapsed_active_ms: m02State.activeMs,
  });
  markOpportunityCompleted(M02_OPPORTUNITY_ID);
  refreshValidityProbe();

  return true;
}

/** Technical-failure contamination hook (never a low measurement). */
export function markM02TechnicalFailure(detail: string) {
  markOpportunityInvalid(M02_OPPORTUNITY_ID, 'technical_failure', detail);
  refreshValidityProbe();
  logM02('proto_m02_technical_failure', { detail });
}

/** Test-only escape hatch (resetGameplayInventory precedent). */
export function resetM02State() {
  m02State.unsubscribe?.();
  m02State = createInitialM02State();
}
