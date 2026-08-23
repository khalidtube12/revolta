import { dbGet, dbPush, dbRemove, dbUpdate } from './db.service';

export interface Application {
  id: string;
  name: string;
  twitterHandle: string;
  contentType: string;
  age: number;
  reason: string;
  submittedAt: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export async function submitApplication(data: Omit<Application, 'id' | 'submittedAt' | 'status'>): Promise<string | null> {
  return dbPush('applications', {
    ...data,
    submittedAt: Date.now(),
    status: 'pending',
  });
}

export async function getAllApplications(): Promise<Application[]> {
  const data = await dbGet<Record<string, Omit<Application, 'id'>>>('applications');
  if (!data) return [];
  return Object.entries(data)
    .map(([id, a]) => ({ id, ...a }))
    .sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function deleteApplication(id: string): Promise<void> {
  return dbRemove('applications/' + id);
}

export async function updateApplicationStatus(id: string, status: Application['status']): Promise<void> {
  return dbUpdate('applications/' + id, { status });
}
