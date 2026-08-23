import { dbGet, dbPush, dbRemove, dbUpdate } from './db.service';

export interface ReviewPoint {
  text: string;
  positive: boolean;
}

export interface Review {
  id: string;
  eventName: string;
  eventSubtitle: string;
  posterUrl: string;
  points: ReviewPoint[];
  description?: string | null;
  verdict: string;
  rating: number;
  createdAt: number;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string | null;
  authorTwitter?: string | null;
}

export async function getAllReviews(): Promise<Review[]> {
  const data = await dbGet<Record<string, Omit<Review, 'id'>>>('reviews');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createReview(review: Omit<Review, 'id'>): Promise<string | null> {
  return dbPush('reviews', review);
}

export async function deleteReview(id: string): Promise<void> {
  return dbRemove('reviews/' + id);
}

export async function updateReview(id: string, data: Partial<Omit<Review, 'id'>>): Promise<void> {
  return dbUpdate('reviews/' + id, data);
}
