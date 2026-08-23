import { dbGet, dbPush, dbRemove, dbUpdate } from './db.service';
import type { ShowReview } from '../types';

export async function getReviewsByMatch(matchId: string): Promise<ShowReview[]> {
  const data = await dbGet<Record<string, Omit<ShowReview, 'id'>>>('showReviews');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, r]) => ({ id, ...r }))
    .filter(r => r.matchId === matchId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getReviewsByShow(showId: string): Promise<ShowReview[]> {
  const data = await dbGet<Record<string, Omit<ShowReview, 'id'>>>('showReviews');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, r]) => ({ id, ...r }))
    .filter(r => r.showId === showId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAllShowReviews(): Promise<ShowReview[]> {
  const data = await dbGet<Record<string, Omit<ShowReview, 'id'>>>('showReviews');
  if (!data) return [];
  return Object.entries(data).map(([id, r]) => ({ id, ...r }));
}

export async function createShowReview(review: Omit<ShowReview, 'id'>): Promise<string | null> {
  return dbPush('showReviews', review);
}

export async function updateShowReview(id: string, data: Partial<Omit<ShowReview, 'id'>>): Promise<void> {
  return dbUpdate('showReviews/' + id, data);
}

export async function deleteShowReview(id: string): Promise<void> {
  return dbRemove('showReviews/' + id);
}
