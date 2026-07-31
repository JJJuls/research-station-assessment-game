/**
 * Q32 Active Project Portfolio module state (SA-5 adopted design; Unit 3).
 *
 * A distinct portfolio module in the Operations Annex: four dormant annex
 * projects the participant may activate, advance (three visible steps
 * each), park, or leave entirely. Its own opportunity, window, state
 * container and proto_* event family; standardised entry (the board is
 * identical for everyone and independent of every other module).
 *
 * GOVERNANCE (SA-5): this is an EXPLORATORY short-session analogue only.
 * Q32 remains questionnaire-primary in Qualtrics; nothing here reuses
 * Q29/Q31, Side Repair, or any other item's evidence; no indicator here
 * is a validated item score, and no scoring exists.
 */

export const Q32_OPPORTUNITY_ID = 'proto_q32_project_portfolio';
export const Q32_ENTRY_STATE_VERSION = 'q32-annex-board-v1';

export const Q32_PROJECT_STEPS = 3;

export interface Q32Project {
  project_id: string;
  label: string;
}

/** Fixed, identical project list (standardised entry state). */
export const Q32_PROJECTS: readonly Q32Project[] = [
  { project_id: 'spectral_archive', label: 'Spectral archive re-index' },
  { project_id: 'greenhouse_trial', label: 'Greenhouse nutrient trial' },
  { project_id: 'antenna_survey', label: 'Antenna beam survey' },
  { project_id: 'core_log_digest', label: 'Core log digest' },
] as const;

export type Q32ProjectStatus = 'dormant' | 'active' | 'parked' | 'completed';

export interface Q32ProjectState {
  status: Q32ProjectStatus;
  steps_done: number;
}

interface Q32State {
  projects: Record<string, Q32ProjectState>;
  /** Highest simultaneous active-project count observed (raw fact). */
  max_concurrent_active: number;
  board_opened: boolean;
  board_closed: boolean;
}

function createInitialQ32State(): Q32State {
  const projects: Record<string, Q32ProjectState> = {};

  for (const project of Q32_PROJECTS) {
    projects[project.project_id] = { status: 'dormant', steps_done: 0 };
  }

  return {
    projects,
    max_concurrent_active: 0,
    board_opened: false,
    board_closed: false,
  };
}

export const q32State: Q32State = createInitialQ32State();

export function q32ActiveCount(): number {
  return Object.values(q32State.projects).filter(
    (project) => project.status === 'active',
  ).length;
}

export function markQ32BoardOpened() {
  q32State.board_opened = true;
}

export function activateQ32Project(projectId: string) {
  const project = q32State.projects[projectId];

  if (project !== undefined && project.status !== 'completed') {
    project.status = 'active';
    q32State.max_concurrent_active = Math.max(
      q32State.max_concurrent_active,
      q32ActiveCount(),
    );
  }
}

/** Advances one step; returns the new steps_done (completes at 3). */
export function advanceQ32Project(projectId: string): number {
  const project = q32State.projects[projectId];

  if (project === undefined || project.status !== 'active') {
    return project?.steps_done ?? 0;
  }

  project.steps_done += 1;

  if (project.steps_done >= Q32_PROJECT_STEPS) {
    project.status = 'completed';
  }

  return project.steps_done;
}

export function parkQ32Project(projectId: string) {
  const project = q32State.projects[projectId];

  if (project !== undefined && project.status === 'active') {
    project.status = 'parked';
  }
}

export function closeQ32Board() {
  q32State.board_closed = true;
}

export function q32Summary() {
  const statuses = Object.values(q32State.projects);

  return {
    activated: statuses.filter((p) => p.status !== 'dormant').length,
    active: q32ActiveCount(),
    parked: statuses.filter((p) => p.status === 'parked').length,
    completed: statuses.filter((p) => p.status === 'completed').length,
    max_concurrent_active: q32State.max_concurrent_active,
  };
}

/** Test-only escape hatch. */
export function resetQ32State() {
  Object.assign(q32State, createInitialQ32State());
}
