import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { dbSet } from './db.service';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export type PushPermissionResult = 'granted' | 'denied' | 'unsupported';

export async function isPushSupported(): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export function getPushPermissionState(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function enablePushNotifications(userId: string): Promise<PushPermissionResult> {
  if (!(await isPushSupported())) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'unsupported';

  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return 'unsupported';

  await dbSet(`fcmTokens/${userId}/${token}`, true);
  return 'granted';
}
