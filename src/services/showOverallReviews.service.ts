import { dbGet, dbPush, dbRemove, dbUpdate } from './db.service';
import type { ShowOverallReview } from '../types';

export async function getAllShowOverallReviews(): Promise<ShowOverallReview[]> {
  const data = await dbGet<Record<string, Omit<ShowOverallReview, 'id'>>>('showOverallReviews');
  if (!data) return [];
  return Object.entries(data).map(([id, r]) => ({ id, ...r }));
}

export async function getOverallReviewsByShow(showId: string): Promise<ShowOverallReview[]> {
  const data = await dbGet<Record<string, Omit<ShowOverallReview, 'id'>>>('showOverallReviews');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, r]) => ({ id, ...r }))
    .filter(r => r.showId === showId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createShowOverallReview(review: Omit<ShowOverallReview, 'id'>): Promise<string | null> {
  return dbPush('showOverallReviews', review);
}

export async function updateShowOverallReview(id: string, data: Partial<Omit<ShowOverallReview, 'id'>>): Promise<void> {
  return dbUpdate('showOverallReviews/' + id, data);
}

export async function deleteShowOverallReview(id: string): Promise<void> {
  return dbRemove('showOverallReviews/' + id);
}
