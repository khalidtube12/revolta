import { ref, onValue, off } from 'firebase/database';
import { db } from './firebase';
import { dbPush, dbUpdate, dbGet, dbRemove } from './db.service';
import type { Notification } from '../types';

export function listenToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const r = ref(db, 'notifs');
  onValue(r, (snap) => {
    const data = snap.val();
    const notifs = data
      ? Object.entries(data)
          .filter(([, n]) => (n as Notification).userId === userId)
          .map(([id, n]) => ({ id, ...(n as Omit<Notification, 'id'>) }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      : [];
    callback(notifs);
  });
  return () => off(r);
}

const MAX_NOTIFS_PER_USER = 5;

export async function createNotification(notification: Omit<Notification, 'id'>) {
  await dbPush('notifs', notification);

  // إذا تجاوز عدد إشعارات المستخدم الحد، احذف الكل
  const data = await dbGet<Record<string, Omit<Notification, 'id'>>>('notifs');
  if (!data) return;
  const userNotifs = Object.entries(data)
    .filter(([, n]) => n.userId === notification.userId)
    .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0));

  if (userNotifs.length > MAX_NOTIFS_PER_USER) {
    const toDelete = userNotifs.slice(MAX_NOTIFS_PER_USER);
    await Promise.all(toDelete.map(([id]) => dbRemove('notifs/' + id)));
  }
}

export async function markAllRead(notifications: Notification[]) {
  for (const n of notifications) {
    await dbRemove('notifs/' + n.id);
  }
}

export async function deleteUserNotifications(userId: string) {
  const data = await dbGet<Record<string, Omit<Notification, 'id'>>>('notifs');
  if (!data) return;
  for (const [id, n] of Object.entries(data)) {
    if (n.userId === userId) await dbRemove('notifs/' + id);
  }
}
