import { dbGet, dbPush, dbRemove } from './db.service';

export interface Suggestion {
  id: string;
  name: string;
  socialHandle: string;
  text: string;
  submittedAt: number;
}

export async function submitSuggestion(
  data: Omit<Suggestion, 'id' | 'submittedAt'>,
): Promise<string | null> {
  return dbPush('suggestions', {
    ...data,
    submittedAt: Date.now(),
  });
}

export async function getAllSuggestions(): Promise<Suggestion[]> {
  const data = await dbGet<Record<string, Omit<Suggestion, 'id'>>>('suggestions');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function deleteSuggestion(id: string): Promise<void> {
  return dbRemove('suggestions/' + id);
}
