import { ref, get, set, push, update, remove, onValue, increment, type Database } from 'firebase/database';
import { db } from './firebase';

import { uploadImage } from './cloudinary.service';

export interface PollOption {
  name: string;
  imageUrl: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  options: Record<string, PollOption>;
  maxChoices?: number; // 1 = single choice (default), >1 = multi-choice
}

export interface PollResults {
  counts: Record<string, number>;
  voters: Record<string, string>;
}

export function newPollId(): string {
  return push(ref(db, 'polls')).key!;
}

export async function createPoll(data: Omit<Poll, 'id'>): Promise<string> {
  const r = await push(ref(db, 'polls'), data);
  return r.key!;
}

export async function createPollWithId(pollId: string, data: Omit<Poll, 'id'>): Promise<void> {
  await set(ref(db, `polls/${pollId}`), data);
}

export async function getPoll(pollId: string): Promise<Poll | null> {
  const snap = await get(ref(db, `polls/${pollId}`));
  if (!snap.exists()) return null;
  return { id: pollId, ...snap.val() };
}

export function subscribeToPoll(pollId: string, cb: (poll: Poll | null) => void, database: Database = db) {
  return onValue(ref(database, `polls/${pollId}`), snap => {
    cb(snap.exists() ? { id: pollId, ...snap.val() } : null);
  });
}

export function subscribeToPollResults(pollId: string, cb: (results: PollResults) => void, database: Database = db) {
  return onValue(ref(database, `poll_votes/${pollId}`), snap => {
    cb(snap.exists() ? snap.val() : { counts: {}, voters: {} });
  });
}

export async function castVote(pollId: string, optionIds: string | string[], uid: string, database: Database = db): Promise<void> {
  const voterSnap = await get(ref(database, `poll_votes/${pollId}/voters/${uid}`));
  if (voterSnap.exists()) throw new Error('already_voted');
  const ids = Array.isArray(optionIds) ? optionIds : [optionIds];
  const updates: Record<string, unknown> = {};
  updates[`voters/${uid}`] = ids.join(',');
  for (const id of ids) {
    updates[`counts/${id}`] = increment(1);
  }
  await update(ref(database, `poll_votes/${pollId}`), updates);
}

export async function getAllPolls(): Promise<Poll[]> {
  const snap = await get(ref(db, 'polls'));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, data]) => ({ id, ...(data as Omit<Poll, 'id'>) }));
}

export async function deletePoll(pollId: string): Promise<void> {
  await Promise.all([
    remove(ref(db, `polls/${pollId}`)),
    remove(ref(db, `poll_votes/${pollId}`)),
  ]);
}

export async function uploadPollImage(file: File): Promise<string> {
  return uploadImage(file);
}
