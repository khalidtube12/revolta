import { dbGet, dbSet, dbRemove } from './db.service';
import { ref, onValue, off, type DataSnapshot } from 'firebase/database';
import { db } from './firebase';

export function getAnonId(): string {
  let id = localStorage.getItem('revolta_uid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('revolta_uid', id);
  }
  return id;
}

export async function getReviewLikes(reviewId: string): Promise<{ count: number; liked: boolean }> {
  const data = await dbGet<Record<string, boolean>>('reviewLikes/' + reviewId);
  return {
    count: data ? Object.keys(data).length : 0,
    liked: data ? !!data[getAnonId()] : false,
  };
}

export async function toggleReviewLike(reviewId: string): Promise<void> {
  const anonId = getAnonId();
  const path = `reviewLikes/${reviewId}/${anonId}`;
  const existing = await dbGet<boolean>(path);
  if (existing) await dbRemove(path);
  else await dbSet(path, true);
}

export function subscribeReviewLikes(
  reviewId: string,
  cb: (count: number, liked: boolean) => void
): () => void {
  const anonId = getAnonId();
  const r = ref(db, 'reviewLikes/' + reviewId);
  const handler = (snap: DataSnapshot) => {
    const data = snap.val() as Record<string, boolean> | null;
    cb(data ? Object.keys(data).length : 0, data ? !!data[anonId] : false);
  };
  onValue(r, handler);
  return () => off(r, 'value', handler);
}
