import { dbGet, dbPush, dbRemove, dbUpdate } from './db.service';
import type { Show } from '../types';

export async function getAllShows(): Promise<Show[]> {
  const data = await dbGet<Record<string, Omit<Show, 'id'>>>('shows');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPublishedShows(): Promise<Show[]> {
  const all = await getAllShows();
  return all.filter(s => s.published);
}

export async function createShow(show: Omit<Show, 'id'>): Promise<string | null> {
  return dbPush('shows', show);
}

export async function updateShow(id: string, data: Partial<Omit<Show, 'id'>>): Promise<void> {
  return dbUpdate('shows/' + id, data);
}

export async function deleteShow(id: string): Promise<void> {
  return dbRemove('shows/' + id);
}
