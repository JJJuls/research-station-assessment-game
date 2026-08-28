/**
 * M02 — Open case workspace with functional retrieval (evidence-led pilot
 * v2, Unit 2). REPLACES the v1 "file sheets into the correct folder"
 * workstation on the participant route (mandatory correction C7).
 *
 * Ledger (sheet 09): open workspace — manage six heterogeneous cases with
 * optional folders/labels, then retrieve two counterbalanced cases before
 * committing the handover. Multiple valid organisation schemas; retrieval
 * probes fixed by form; no inventory carryover; keyboard/pointer
 * equivalence. Similarity to a designer-preferred layout is NEVER scored.
 *
 * Mechanic (inventory overlay mode 'm02case'): an intake tray holds six
 * case bundles of four visible kinds; four workspace trays can each be
 * given a label from a short list (or none). Cases move by drag/drop or
 * keyboard through the shared engine. HAND OVER commits the workspace;
 * the two retrieval probes then ask for one case each — the participant
 * points at the slot that holds it (any container). Retrieval success is
 * the functional criterion; positions, groupings, labels, moves, the
 * retrieval route and retrieval outcomes are the raw components.
 *
 * Raw components: case_location_at_close, untraceable_case_count (cases in
 * a tray that carries no label), misfile_count (cases in a tray whose
 * chosen label names a different kind — the participant's own schema,
 * not a designer key), duplicate_count (labels used on more than one
 * tray), retrieval_actions, retrieval_errors, retrieval_route, move_count,
 * label_changes.
 */
import { CONTAINER_IDS } from '../../inventory/model';
import type { InventoryChange } from '../../inventory/store';
import {
  getInventoryState,
  onInventoryStoreChange,
  seedContainerPositional,
} from '../../inventory/store';
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

export const M02C_OPPORTUNITY_ID = 'proto_m02_case_workspace';
export const M02C_WINDOW_IDS = {
  workspace: 'm02_workspace_w1',
  retrieval: 'm02_retrieval_w1',
} as const;
export const M02C_ENTRY_STATE_VERSION = 'm02-case-workspace-v1';
export const M02C_FAMILY = 'proto_m02_case_';

export type M02CForm = 'form_a' | 'form_b';
export type M02CKind = 'sample' | 'repair' | 'supply' | 'incident';

export interface M02CCase {
  definitionId: string;
  code: string;
  kind: M02CKind;
  label: string;
}

/** Six heterogeneous cases (identical set; form varies intake order + probes). */
export const M02C_CASES: readonly M02CCase[] = [
  {
    definitionId: 'm02c_case_s14',
    code: 'S-14',
    kind: 'sample',
    label: 'Sample case S-14',
  },
  {
    definitionId: 'm02c_case_r07',
    code: 'R-07',
    kind: 'repair',
    label: 'Repair ticket R-07',
  },
  {
    definitionId: 'm02c_case_k03',
    code: 'K-03',
    kind: 'supply',
    label: 'Supply note K-03',
  },
  {
    definitionId: 'm02c_case_i22',
    code: 'I-22',
    kind: 'incident',
    label: 'Incident sheet I-22',
  },
  {
    definitionId: 'm02c_case_s15',
    code: 'S-15',
    kind: 'sample',
    label: 'Sample case S-15',
  },
  {
    definitionId: 'm02c_case_r09',
    code: 'R-09',
    kind: 'repair',
    label: 'Repair ticket R-09',
  },
];

/** Tray labels the participant may choose (or none). */
export const M02C_LABELS = [
  'SAMPLES',
  'REPAIRS',
  'SUPPLY',
  'INCIDENTS',
  'PENDING',
  'MIXED',
] as const;

export type M02CLabel = (typeof M02C_LABELS)[number] | null;

const LABEL_KIND: Partial<Record<Exclude<M02CLabel, null>, M02CKind>> = {
  SAMPLES: 'sample',
  REPAIRS: 'repair',
  SUPPLY: 'supply',
  INCIDENTS: 'incident',
};

export const M02C_TRAY_IDS = [
  CONTAINER_IDS.m02cTray1,
  CONTAINER_IDS.m02cTray2,
  CONTAINER_IDS.m02cTray3,
  CONTAINER_IDS.m02cTray4,
] as const;

const M02C_CONTAINER_IDS = [CONTAINER_IDS.m02cDesk, ...M02C_TRAY_IDS];

/** Retrieval probes per form (two cases, fixed order). */
const RETRIEVAL_PROBES: Record<M02CForm, readonly string[]> = {
  form_a: ['m02c_case_s15', 'm02c_case_r07'],
  form_b: ['m02c_case_i22', 'm02c_case_s14'],
};

export type M02CPhase = 'unopened' | 'organise' | 'retrieve' | 'closed';

interface M02CState {
  form: M02CForm;
  phase: M02CPhase;
  labels: Record<string, M02CLabel>;
  moveCount: number;
  labelChanges: number;
  probeIndex: number;
  retrievalActions: number;
  retrievalErrors: number;
  retrievalRoute: string[];
  retrievals: { requested: string; picked: string; correct: boolean }[];
  observing: boolean;
  unsubscribe: (() => void) | null;
}

let state: M02CState | null = null;

function ensureState(): M02CState {
  if (state === null) {
    state = {
      form: assignCounterbalance<M02CForm>(
        currentSessionId(),
        'm02_case_workspace_form',
        ['form_a', 'form_b'],
      ),
      phase: 'unopened',
      labels: Object.fromEntries(M02C_TRAY_IDS.map((id) => [id, null])),
      moveCount: 0,
      labelChanges: 0,
      probeIndex: 0,
      retrievalActions: 0,
      retrievalErrors: 0,
      retrievalRoute: [],
      retrievals: [],
      observing: false,
      unsubscribe: null,
    };
  }

  return state;
}

export const m02cWindow = new ItemWindow({
  item: 'M02',
  opportunityId: M02C_OPPORTUNITY_ID,
  windowId: M02C_WINDOW_IDS.workspace,
  entryStateVersion: M02C_ENTRY_STATE_VERSION,
  family: M02C_FAMILY,
  scene: 'records_workshop',
  objectId: 'm02_case_workspace',
});

export function declareM02C() {
  const s = ensureState();

  m02cWindow.spec.form = s.form;
  m02cWindow.spec.counterbalance = s.form;
  m02cWindow.declare();
}

export function m02cState(): Readonly<M02CState> {
  return ensureState();
}

export function m02cPhase(): M02CPhase {
  return ensureState().phase;
}

export function m02cCase(definitionId: string): M02CCase | undefined {
  return M02C_CASES.find((c) => c.definitionId === definitionId);
}

/** Current container of every case, by definition id. */
export function m02cPlacements(): Record<string, string> {
  const placements: Record<string, string> = {};
  const inv = getInventoryState();

  for (const containerId of M02C_CONTAINER_IDS) {
    const container = inv.containers[containerId];

    if (container === undefined) {
      continue;
    }

    for (const slot of container.slots) {
      if (slot !== null) {
        placements[slot.definitionId] = containerId;
      }
    }
  }

  return placements;
}

function intakeOrder(form: M02CForm): string[] {
  const ids = M02C_CASES.map((c) => c.definitionId);

  return form === 'form_a' ? ids : [...ids].reverse();
}

function observeMoves() {
  const s = ensureState();

  if (s.observing) {
    return;
  }

  s.observing = true;

  let last = m02cPlacements();

  s.unsubscribe = onInventoryStoreChange((change: InventoryChange) => {
    if (!change.ok || change.namespace !== 'm02c') {
      return;
    }

    if (change.op === 'seed_m02c_desk') {
      last = m02cPlacements();
      return;
    }

    const next = m02cPlacements();

    for (const c of M02C_CASES) {
      const from = last[c.definitionId] ?? null;
      const to = next[c.definitionId] ?? null;

      if (from === to || to === null || s.phase !== 'organise') {
        continue;
      }

      s.moveCount += 1;
      m02cWindow.log('case_moved', {
        case_id: c.definitionId,
        case_code: c.code,
        from_container: from,
        to_container: to,
        move_number: s.moveCount,
        input_mode: 'pointer_or_keyboard',
      });
    }

    last = { ...last, ...next };
  });
}

/** Opens the workspace; seeds the intake tray on first open. */
export function openM02CWorkspace(nowMs: number): M02CPhase {
  declareM02C();

  const s = ensureState();

  if (s.phase === 'unopened') {
    const seed = seedContainerPositional(
      CONTAINER_IDS.m02cDesk,
      intakeOrder(s.form).map((definitionId) => ({
        definitionId,
        quantity: 1,
      })),
      'seed_m02c_desk',
    );

    if (!seed.ok) {
      m02cWindow.technicalFailure(
        `intake seed failed: ${seed.reason ?? 'unknown'}`,
      );

      return s.phase;
    }

    s.phase = 'organise';
    observeMoves();
    m02cWindow.open(nowMs, {
      intake_order: intakeOrder(s.form),
      trays: M02C_TRAY_IDS.length,
      labels_available: [...M02C_LABELS],
      retrieval_probes: RETRIEVAL_PROBES[s.form].length,
    });
  } else {
    m02cWindow.resume(nowMs);
    m02cWindow.log('panel_reopened', { phase: s.phase, input_mode: 'system' });
  }

  return s.phase;
}

/** Cycle/set a tray label (null clears). */
export function setM02CTrayLabel(
  trayId: string,
  label: M02CLabel,
  inputMode: InputMode,
): boolean {
  const s = ensureState();

  if (s.phase !== 'organise' || !(trayId in s.labels)) {
    return false;
  }

  const previous = s.labels[trayId];

  s.labels[trayId] = label;
  s.labelChanges += 1;
  m02cWindow.log('tray_labelled', {
    tray_id: trayId,
    label,
    previous,
    input_mode: inputMode,
  });

  return true;
}

export function nextM02CTrayLabel(current: M02CLabel): M02CLabel {
  if (current === null) {
    return M02C_LABELS[0];
  }

  const index = M02C_LABELS.indexOf(current);

  return index >= M02C_LABELS.length - 1 ? null : M02C_LABELS[index + 1];
}

/** Raw workspace description at commit (never a score). */
export function m02cWorkspaceSummary() {
  const s = ensureState();
  const placements = m02cPlacements();
  const perCase: Record<
    string,
    { code: string; kind: M02CKind; container: string | null; label: M02CLabel }
  > = {};
  let untraceable = 0;
  let misfiled = 0;

  for (const c of M02C_CASES) {
    const container = placements[c.definitionId] ?? null;
    const label =
      container !== null && container in s.labels ? s.labels[container] : null;

    perCase[c.definitionId] = { code: c.code, kind: c.kind, container, label };

    if (container !== null && container !== CONTAINER_IDS.m02cDesk) {
      if (label === null) {
        untraceable += 1;
      } else if (
        LABEL_KIND[label] !== undefined &&
        LABEL_KIND[label] !== c.kind
      ) {
        misfiled += 1;
      }
    }
  }

  const used = Object.values(s.labels).filter(
    (l): l is Exclude<M02CLabel, null> => l !== null,
  );
  const duplicate = used.length - new Set(used).size;

  return {
    case_location_at_close: perCase,
    tray_labels: { ...s.labels },
    untraceable_case_count: untraceable,
    misfile_count: misfiled,
    duplicate_count: duplicate,
    cases_left_on_intake: M02C_CASES.filter(
      (c) => placements[c.definitionId] === CONTAINER_IDS.m02cDesk,
    ).length,
  };
}

/** HAND OVER: commits the workspace and starts the retrieval probes. */
export function commitM02CWorkspace(
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const s = ensureState();

  if (s.phase !== 'organise') {
    return false;
  }

  s.phase = 'retrieve';
  m02cWindow.spec.windowId = M02C_WINDOW_IDS.retrieval;
  m02cWindow.log('workspace_committed', {
    ...m02cWorkspaceSummary(),
    move_count: s.moveCount,
    label_changes: s.labelChanges,
    input_mode: inputMode,
  });
  m02cWindow.log('retrieval_requested', {
    probe_index: 0,
    requested_case: RETRIEVAL_PROBES[s.form][0],
    input_mode: 'system',
  });

  return true;
}

/** The case currently requested by the retrieval probe (null when none). */
export function m02cRequestedCase(): M02CCase | null {
  const s = ensureState();

  if (s.phase !== 'retrieve') {
    return null;
  }

  const id = RETRIEVAL_PROBES[s.form][s.probeIndex];

  return id === undefined ? null : (m02cCase(id) ?? null);
}

/** A container was probed/opened during retrieval (route component). */
export function noteM02CRetrievalProbe(
  containerId: string,
  inputMode: InputMode,
) {
  const s = ensureState();

  if (s.phase !== 'retrieve') {
    return;
  }

  s.retrievalRoute.push(containerId);
  m02cWindow.log('retrieval_probe', {
    container_id: containerId,
    input_mode: inputMode,
  });
}

/** The participant points at a slot: the case there is the pick. */
export function pickM02CRetrieval(
  pickedDefinitionId: string,
  inputMode: InputMode,
  nowMs: number,
): 'correct' | 'wrong' | 'refused' {
  const s = ensureState();
  const requested = m02cRequestedCase();

  if (requested === null) {
    return 'refused';
  }

  s.retrievalActions += 1;

  const correct = pickedDefinitionId === requested.definitionId;

  if (!correct) {
    s.retrievalErrors += 1;
  }

  s.retrievals.push({
    requested: requested.definitionId,
    picked: pickedDefinitionId,
    correct,
  });
  m02cWindow.log('retrieval_pick', {
    probe_index: s.probeIndex,
    requested_case: requested.definitionId,
    picked_case: pickedDefinitionId,
    correct,
    input_mode: inputMode,
  });

  if (!correct) {
    return 'wrong';
  }

  s.probeIndex += 1;

  const next = RETRIEVAL_PROBES[s.form][s.probeIndex];

  if (next !== undefined) {
    m02cWindow.log('retrieval_requested', {
      probe_index: s.probeIndex,
      requested_case: next,
      input_mode: 'system',
    });
  } else {
    s.phase = 'closed';
    s.unsubscribe?.();
    s.unsubscribe = null;
    m02cWindow.complete(
      nowMs,
      {
        ...m02cWorkspaceSummary(),
        move_count: s.moveCount,
        label_changes: s.labelChanges,
        retrieval_actions: s.retrievalActions,
        retrieval_errors: s.retrievalErrors,
        retrieval_route: [...s.retrievalRoute],
        retrieval_success: s.retrievals.filter((r) => r.correct).length,
        retrievals: [...s.retrievals],
      },
      inputMode,
    );
  }

  return 'correct';
}

/** Panel closed without finishing: the window stays open (fail-forward). */
export function closeM02CPanel(nowMs: number) {
  const s = ensureState();

  if (s.phase === 'organise' || s.phase === 'retrieve') {
    m02cWindow.pause(nowMs);
    m02cWindow.log('panel_closed_without_handover', {
      phase: s.phase,
      ...m02cWorkspaceSummary(),
      input_mode: 'system',
    });
  }
}

/** Test-only escape hatch. */
export function resetM02CState() {
  state?.unsubscribe?.();
  state = null;
  m02cWindow.reset();
  m02cWindow.spec.windowId = M02C_WINDOW_IDS.workspace;
  m02cWindow.spec.form = null;
  m02cWindow.spec.counterbalance = null;
}
