import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { auth, secondaryAuth } from './firebase';
import { dbSet, dbGet } from './db.service';
import { syncPublicProfile } from './users.service';
import type { User } from '../types';
import { COLORS, DEFAULT_PERMISSIONS } from '../types';

export async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(name: string, jobRole: string, email: string, password: string, setupKey?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  const meta = await dbGet<{ hasAdmin?: boolean }>('meta');
  const hasAdmin = meta?.hasAdmin === true;
  const adminKey = (import.meta.env.VITE_ADMIN_SETUP_KEY as string) || '';
  // Only first registrant with matching setup key becomes admin
  const isAdmin = !hasAdmin && !!adminKey && setupKey === adminKey;

  const userData = {
    name,
    jobRole,
    email,
    isAdmin,
    approved: isAdmin,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    createdAt: Date.now(),
  };

  await dbSet('users/' + cred.user.uid, userData);

  if (isAdmin) {
    await dbSet('meta/hasAdmin', true);
    await syncPublicProfile(cred.user.uid, { name, jobRole, isLeader: true, photoURL: null });
  }
  return { user: cred.user, isAdmin, userData };
}

export async function logout() {
  return signOut(auth);
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function createMemberAccount(name: string, jobRole: string, email: string, password: string, colorIndex: number) {
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  await signOut(secondaryAuth);
  await dbSet('users/' + cred.user.uid, {
    name,
    jobRole,
    email,
    isAdmin: false,
    approved: true,
    color: COLORS[colorIndex % COLORS.length],
    createdAt: Date.now(),
    permissions: DEFAULT_PERMISSIONS,
  });
  await syncPublicProfile(cred.user.uid, { name, jobRole, isLeader: false, photoURL: null });
}

export async function updateUserProfile(uid: string, name: string, newEmail?: string, currentPassword?: string) {
  const updates: Record<string, unknown> = { name };
  if (newEmail && auth.currentUser && newEmail !== auth.currentUser.email) {
    if (!currentPassword) throw new Error('تغيير البريد يتطلب إدخال كلمة المرور الحالية');
    const cred = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await updateEmail(auth.currentUser, newEmail);
    updates.email = newEmail;
  }
  return updates;
}
