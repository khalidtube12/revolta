import { ref, get, set, push, update, remove } from 'firebase/database';
import { db } from './firebase';

export async function dbGet<T = unknown>(path: string): Promise<T | null> {
  const snap = await get(ref(db, path));
  return snap.exists() ? (snap.val() as T) : null;
}

export async function dbSet(path: string, value: unknown): Promise<void> {
  await set(ref(db, path), value);
}

export async function dbPush(path: string, value: unknown): Promise<string | null> {
  const r = await push(ref(db, path), value);
  return r.key;
}

export async function dbUpdate(path: string, value: Record<string, unknown>): Promise<void> {
  console.log('[Firebase dbUpdate]', path, JSON.stringify(value));
  await update(ref(db, path), value);
  console.log('[Firebase dbUpdate] done:', path);
}

export async function dbRemove(path: string): Promise<void> {
  await remove(ref(db, path));
}
