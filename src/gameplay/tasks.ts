/**
 * Gameplay task/quest progression (overnight playable prototype, Unit 1).
 *
 * A compact typed task system for the embodied route: tasks are offered by
 * NPCs/stations, accepted, progress through objective-text updates, and
 * complete with visible consequences. Module-scope session lifetime
 * (roomTaskState precedent — survives scene.start() restarts; a page
 * reload starts a fresh session).
 *
 * Presentation only: task titles/objectives are in-fiction progress labels
 * (allowed progress UI — checklist/status text, never scores, never
 * personality feedback). Task state here is NOT a measurement variable;
 * measurement opportunity/validity state lives in src/measurement.
 */

export type GameTaskStatus =
  | 'hidden'
  | 'offered'
  | 'accepted'
  | 'completed'
  | 'declined'
  | 'failed';

export interface GameTaskDefinition {
  task_id: string;
  /** Short in-fiction title (task log display). */
  title: string;
  /** Objective line shown while the task is accepted but has no override. */
  initialObjective: string;
}

interface GameTaskRuntime {
  definition: GameTaskDefinition;
  status: GameTaskStatus;
  /** Current objective line (updated as substeps progress). */
  objective: string;
  /** Completed substep labels, in completion order (task log display). */
  completedSteps: string[];
}

type TaskListener = () => void;

const taskOrder: string[] = [];
const tasks = new Map<string, GameTaskRuntime>();
const listeners = new Set<TaskListener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/** Subscribe to task changes; returns an unsubscribe function. */
export function onTaskChange(listener: TaskListener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/**
 * Registers a task definition (idempotent — scenes re-register on
 * re-entry; the live runtime state is preserved).
 */
export function registerTask(definition: GameTaskDefinition) {
  if (tasks.has(definition.task_id)) {
    return;
  }

  taskOrder.push(definition.task_id);
  tasks.set(definition.task_id, {
    definition,
    status: 'hidden',
    objective: definition.initialObjective,
    completedSteps: [],
  });
}

function requireTask(taskId: string): GameTaskRuntime {
  const task = tasks.get(taskId);

  if (task === undefined) {
    throw new Error(`Unknown gameplay task: ${taskId}`);
  }

  return task;
}

export function getTaskStatus(taskId: string): GameTaskStatus {
  return requireTask(taskId).status;
}

export function offerTask(taskId: string) {
  const task = requireTask(taskId);

  if (task.status === 'hidden') {
    task.status = 'offered';
    notify();
  }
}

export function acceptTask(taskId: string) {
  const task = requireTask(taskId);

  if (task.status !== 'completed') {
    task.status = 'accepted';
    notify();
  }
}

export function declineTask(taskId: string) {
  const task = requireTask(taskId);

  if (task.status === 'offered') {
    task.status = 'declined';
    notify();
  }
}

export function completeTask(taskId: string) {
  const task = requireTask(taskId);

  if (task.status !== 'completed') {
    task.status = 'completed';
    notify();
  }
}

export function failTask(taskId: string) {
  const task = requireTask(taskId);

  if (task.status === 'accepted') {
    task.status = 'failed';
    notify();
  }
}

/** Updates the objective line of an accepted task (substep progression). */
export function setTaskObjective(taskId: string, objective: string) {
  const task = requireTask(taskId);

  if (task.objective !== objective) {
    task.objective = objective;
    notify();
  }
}

/** Records a completed substep label (task log display; append-once). */
export function recordTaskStep(taskId: string, stepLabel: string) {
  const task = requireTask(taskId);

  if (!task.completedSteps.includes(stepLabel)) {
    task.completedSteps.push(stepLabel);
    notify();
  }
}

export function isTaskAccepted(taskId: string): boolean {
  return tasks.get(taskId)?.status === 'accepted';
}

export function isTaskCompleted(taskId: string): boolean {
  return tasks.get(taskId)?.status === 'completed';
}

/**
 * The objective line for the HUD: the FIRST accepted task in registration
 * order (one clear direction at a time), or null when nothing is accepted.
 */
export function getActiveObjectiveLine(): string | null {
  for (const taskId of taskOrder) {
    const task = tasks.get(taskId)!;

    if (task.status === 'accepted') {
      return `${task.definition.title}: ${task.objective}`;
    }
  }

  return null;
}

/** Full task-log snapshot (DEV probe / tests). */
export function serializeTasks(): {
  task_id: string;
  status: GameTaskStatus;
  objective: string;
  completed_steps: string[];
}[] {
  return taskOrder.map((taskId) => {
    const task = tasks.get(taskId)!;

    return {
      task_id: taskId,
      status: task.status,
      objective: task.objective,
      completed_steps: [...task.completedSteps],
    };
  });
}

/**
 * Test-only escape hatch (resetAllRoomTaskStates precedent): resets every
 * registered task to hidden with its initial objective.
 */
export function resetGameplayTasks() {
  for (const task of tasks.values()) {
    task.status = 'hidden';
    task.objective = task.definition.initialObjective;
    task.completedSteps = [];
  }

  notify();
}
