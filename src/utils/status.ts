import type { Task, TaskStatus } from '../types';

export function getStatus(task: Task): TaskStatus {
  return task.status || (task.done ? 'done' : 'pending');
}
