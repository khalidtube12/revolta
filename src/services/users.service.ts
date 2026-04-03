import { dbGet, dbSet, dbUpdate, dbRemove } from './db.service';
import type { User, UserPermissions } from '../types';

export interface PublicProfile {
  name: string;
  jobRole: string;
  photoURL?: string | null;
  isLeader?: boolean;
  twitterHandle?: string | null;
}

export async function syncPublicProfile(uid: string, data: PublicProfile) {
  await dbSet('publicProfiles/' + uid, data);
}

export async function removePublicProfile(uid: string) {
  await dbRemove('publicProfiles/' + uid);
}

export async function fetchPublicProfiles(): Promise<PublicProfile[]> {
  const data = await dbGet<Record<string, PublicProfile>>('publicProfiles');
  if (!data) return [];
  return Object.values(data);
}

// Syncs all users to publicProfiles — runs on every admin login, safe to re-run
export async function migratePublicProfiles() {
  const users = await dbGet<Record<string, Omit<User, 'id'>>>('users');
  const existing = await dbGet<Record<string, unknown>>('publicProfiles');

  const approvedIds = new Set(
    users ? Object.entries(users).filter(([, u]) => u.approved !== false).map(([id]) => id) : []
  );

  // أضف/حدّث الأعضاء الموافق عليهم
  if (users) {
    await Promise.all(
      Object.entries(users)
        .filter(([, u]) => u.approved !== false)
        .map(([id, u]) =>
          dbSet('publicProfiles/' + id, {
            name: u.name,
            jobRole: u.jobRole,
            isLeader: u.isAdmin ?? false,
            photoURL: u.photoURL ?? null,
            twitterHandle: u.twitterHandle ?? null,
          })
        )
    );
  }

  // احذف أي profile ليس له مستخدم موافق
  if (existing) {
    await Promise.all(
      Object.keys(existing)
        .filter(id => !approvedIds.has(id))
        .map(id => dbRemove('publicProfiles/' + id))
    );
  }
}

export async function fetchUsers(): Promise<User[]> {
  const data = await dbGet<Record<string, Omit<User, 'id'>>>('users');
  if (!data) return [];
  return Object.entries(data)
    .filter(([, u]) => u.approved !== false)
    .map(([id, u]) => ({ id, ...u } as User));
}

export async function fetchAllUsers(): Promise<User[]> {
  const data = await dbGet<Record<string, Omit<User, 'id'>>>('users');
  if (!data) return [];
  return Object.entries(data).map(([id, u]) => ({ id, ...u } as User));
}

export async function fetchPendingUsers(): Promise<User[]> {
  const data = await dbGet<Record<string, Omit<User, 'id'>>>('users');
  if (!data) return [];
  return Object.entries(data)
    .filter(([, u]) => u.approved === false)
    .map(([id, u]) => ({ id, ...u } as User))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const data = await dbGet<Omit<User, 'id'>>('users/' + uid);
  return data ? { id: uid, ...data } as User : null;
}

// TODO (Audit Log): log { action: 'approve_member', target: uid, by: adminUid, timestamp }
export async function approveUser(uid: string) {
  await dbUpdate('users/' + uid, { approved: true });
  const user = await dbGet<User>('users/' + uid);
  if (user) {
    await syncPublicProfile(uid, {
      name: user.name,
      jobRole: user.jobRole,
      isLeader: user.isAdmin ?? false,
      photoURL: user.photoURL ?? null,
    });
  }
}

// TODO (Audit Log): log { action: 'reject_member', target: uid, by: adminUid, timestamp }
export async function rejectUser(uid: string) {
  await dbRemove('users/' + uid);
  await dbRemove('publicProfiles/' + uid);
}

export async function changeUserRole(uid: string, role: string) {
  await dbUpdate('users/' + uid, { jobRole: role });
  await dbUpdate('publicProfiles/' + uid, { jobRole: role } as Record<string, unknown>);
}

// TODO (Audit Log): log { action: 'delete_member', target: uid, by: adminUid, timestamp }
export async function deleteUser(uid: string) {
  await dbRemove('users/' + uid);
  await dbRemove('publicProfiles/' + uid);
}

// TODO (Audit Log): log { action: 'update_permissions', target: uid, by: adminUid, timestamp }
export async function updatePermissions(uid: string, permissions: UserPermissions) {
  return dbUpdate('users/' + uid, { permissions } as Record<string, unknown>);
}
