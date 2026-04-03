import { dbGet, dbSet, dbRemove, dbPush } from './db.service';

export interface PublicWork {
  id: string;
  title: string;
  url: string;       // original YouTube URL
  embedUrl: string;  // https://www.youtube.com/embed/VIDEO_ID
}

function extractVideoId(url: string): string | null {
  // https://www.youtube.com/watch?v=ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  // https://youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  // https://www.youtube.com/embed/ID
  const embedMatch = url.match(/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];
  return null;
}

export function buildEmbedUrl(url: string): string | null {
  const id = extractVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export async function fetchPublicWorks(): Promise<PublicWork[]> {
  const data = await dbGet<Record<string, Omit<PublicWork, 'id'>>>('publicWorks');
  if (!data) return [];
  return Object.entries(data).map(([id, w]) => ({ id, ...w }));
}

export async function addPublicWork(title: string, url: string): Promise<void> {
  const embedUrl = buildEmbedUrl(url);
  if (!embedUrl) throw new Error('رابط يوتيوب غير صحيح');
  await dbPush('publicWorks', { title, url, embedUrl });
}

export async function removePublicWork(id: string): Promise<void> {
  await dbRemove('publicWorks/' + id);
}
