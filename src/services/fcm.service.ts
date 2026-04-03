import { getToken, onMessage } from 'firebase/messaging';
import { ref, set } from 'firebase/database';
import { getMessagingInstance } from './firebase';
import { db } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// طلب إذن الإشعارات وحفظ التوكن
export async function initFCM(userId: string): Promise<void> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    });

    if (token) {
      await set(ref(db, `fcmTokens/${userId}`), { token, updatedAt: Date.now() });
    }

    // إشعارات المقدمة (لما التطبيق مفتوح)
    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (title) {
        new Notification(title, {
          body: body || '',
          icon: '/assets/apple-touch-icon.png',
          dir: 'rtl',
        });
      }
    });
  } catch (err) {
    console.warn('FCM init failed:', err);
  }
}
