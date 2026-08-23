import { dbGet, dbPush, dbRemove, dbUpdate, dbSet } from './db.service';
import { uploadRawFile } from './cloudinary.service';

export interface Audition {
  id: string;
  name: string;
  age: number;
  platform: 'x' | 'tiktok' | 'instagram' | 'youtube';
  handle: string;
  videoLink: string;
  submittedAt: number;
  status: 'pending' | 'accepted' | 'rejected';
  notes?: string;
}

export interface ChallengeFile {
  url: string;
  fileName: string;
  updatedAt: number;
}

export interface ChallengeFiles {
  script: ChallengeFile | null;
  assets: ChallengeFile | null;
}

// ── Public ────────────────────────────────────────────────────────

export async function submitAudition(
  data: Omit<Audition, 'id' | 'submittedAt' | 'status'>
): Promise<void> {
  await dbPush('auditions', {
    ...data,
    submittedAt: Date.now(),
    status: 'pending',
  });
}

export async function getAuditionOpen(): Promise<boolean> {
  const v = await dbGet<boolean>('meta/auditionOpen');
  return v ?? false; // مغلق بالافتراضي حتى يفتحه الأدمن
}

export async function getChallengeFiles(): Promise<ChallengeFiles> {
  const [script, assets] = await Promise.all([
    dbGet<ChallengeFile>('meta/challengeScript'),
    dbGet<ChallengeFile>('meta/challengeAssets'),
  ]);
  return { script, assets };
}

// ── Admin ─────────────────────────────────────────────────────────

export async function getAllAuditions(): Promise<Audition[]> {
  const data = await dbGet<Record<string, Omit<Audition, 'id'>>>('auditions');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, a]) => ({ id, ...a }))
    .sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function updateAuditionStatus(
  id: string,
  status: Audition['status']
): Promise<void> {
  await dbUpdate('auditions/' + id, { status });
}

export async function deleteAudition(id: string): Promise<void> {
  await dbRemove('auditions/' + id);
}

export async function setAuditionOpen(open: boolean): Promise<void> {
  await dbUpdate('meta', { auditionOpen: open });
}

export async function uploadChallengeFile(
  type: 'script' | 'assets',
  file: File
): Promise<void> {
  const url = await uploadRawFile(file);
  const dbPath = type === 'script' ? 'meta/challengeScript' : 'meta/challengeAssets';
  await dbSet(dbPath, {
    url,
    fileName: file.name,
    updatedAt: Date.now(),
  });
}
