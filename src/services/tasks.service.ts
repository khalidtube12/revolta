import { dbGet, dbPush, dbUpdate, dbRemove } from './db.service';
import type { Task } from '../types';

export async function fetchAllTasks(): Promise<Task[]> {
  const data = await dbGet<Record<string, Omit<Task, 'id'>>>('tasks');
  if (!data) return [];
  return Object.entries(data).map(([id, t]) => ({ id, ...t } as Task));
}

export async function fetchUserTasks(userId: string): Promise<Task[]> {
  const data = await dbGet<Record<string, Omit<Task, 'id'>>>('tasks');
  if (!data) return [];
  return Object.entries(data)
    .filter(([, t]) => {
      if (t.memberId === userId) return true;
      const teamIds: string[] = Array.isArray(t.teamMemberIds)
        ? t.teamMemberIds
        : Object.values(t.teamMemberIds || {});
      return teamIds.includes(userId);
    })
    .map(([id, t]) => ({ id, ...t } as Task));
}

export async function createTask(task: Omit<Task, 'id'>) {
  return dbPush('tasks', task);
}

export async function updateTask(id: string, data: Partial<Task>) {
  return dbUpdate('tasks/' + id, data as Record<string, unknown>);
}

export async function deleteTask(id: string) {
  return dbRemove('tasks/' + id);
}

export async function deleteUserTasks(userId: string) {
  const data = await dbGet<Record<string, Omit<Task, 'id'>>>('tasks');
  if (!data) return;
  for (const [id, t] of Object.entries(data)) {
    if (t.memberId === userId) await dbRemove('tasks/' + id);
  }
}
