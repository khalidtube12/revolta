import { dbGet, dbPush, dbSet, dbRemove } from './db.service';
import type { Meeting } from '../types';

export const MEETING_POINTS = 100;

export async function loadAllMeetings(): Promise<Meeting[]> {
  const data = await dbGet<Record<string, Omit<Meeting, 'id'>>>('meetings');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, m]) => ({ ...m, id }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createMeeting(title: string, date: string, createdBy: string): Promise<string | null> {
  return dbPush('meetings', { title, date, createdBy, createdAt: Date.now(), attendees: {} });
}

export async function saveAttendance(meetingId: string, attendees: Record<string, boolean>): Promise<void> {
  await dbSet(`meetings/${meetingId}/attendees`, attendees);
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  await dbRemove(`meetings/${meetingId}`);
}
