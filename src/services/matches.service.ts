import { dbGet, dbPush, dbRemove, dbUpdate } from './db.service';
import type { Match } from '../types';

export async function getMatchesByShow(showId: string): Promise<Match[]> {
  const data = await dbGet<Record<string, Omit<Match, 'id'>>>('matches');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, m]) => ({ id, ...m }))
    .filter(m => m.showId === showId)
    .sort((a, b) => a.order - b.order);
}

export async function getAllMatches(): Promise<Match[]> {
  const data = await dbGet<Record<string, Omit<Match, 'id'>>>('matches');
  if (!data) return [];
  return Object.entries(data).map(([id, m]) => ({ id, ...m }));
}

export async function createMatch(match: Omit<Match, 'id'>): Promise<string | null> {
  return dbPush('matches', match);
}

export async function updateMatch(id: string, data: Partial<Omit<Match, 'id'>>): Promise<void> {
  return dbUpdate('matches/' + id, data);
}

export async function deleteMatch(id: string): Promise<void> {
  return dbRemove('matches/' + id);
}
