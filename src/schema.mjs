export const TASK_TYPES = ['plan', 'result', 'failed', 'progress'];

export function validateEnvelope(task) {
  if (!task.id || !task.from || !task.to) {
    throw new Error('id, from, to required');
  }
  if (!task.projectPath) {
    throw new Error('projectPath required');
  }
  if (!TASK_TYPES.includes(task.type)) {
    throw new Error(`type must be one of ${TASK_TYPES.join(', ')}`);
  }
  if (task.type === 'result' || task.type === 'failed') {
    if (!task.taskId) {
      throw new Error('taskId required for result/failed');
    }
  }
  return task;
}
