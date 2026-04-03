import { dbGet, dbPush, dbUpdate, dbRemove } from './db.service';
import type { Idea } from '../types';

export async function fetchAllIdeas(): Promise<Idea[]> {
  const data = await dbGet<Record<string, Omit<Idea, 'id'>>>('ideas');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, i]) => ({ id, ...i } as Idea))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function createIdea(idea: Omit<Idea, 'id'>) {
  return dbPush('ideas', idea);
}

export async function updateIdea(id: string, data: Partial<Idea>) {
  return dbUpdate('ideas/' + id, data as Record<string, unknown>);
}

export async function deleteIdea(id: string) {
  return dbRemove('ideas/' + id);
}

export async function getIdea(id: string): Promise<Idea | null> {
  const data = await dbGet<Omit<Idea, 'id'>>('ideas/' + id);
  return data ? { id, ...data } as Idea : null;
}
