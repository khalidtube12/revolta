import type { IncomingMessage, ServerResponse } from 'http';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';
import { getAdminApp } from '../lib/firebaseAdmin.js';
import { sendPushToUser } from '../lib/sendPush.js';

interface VercelRequest extends IncomingMessage {
  method?: string;
  headers: IncomingMessage['headers'];
  body?: { notifId?: string };
}

interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

const MAX_NOTIF_AGE_MS = 2 * 60 * 1000;

interface StoredNotif {
  userId: string;
  title: string;
  body: string;
  createdAt: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) {
    res.status(401).json({ error: 'missing token' });
    return;
  }

  const notifId = req.body?.notifId;
  if (!notifId || typeof notifId !== 'string') {
    res.status(400).json({ error: 'missing notifId' });
    return;
  }

  const app = getAdminApp();

  try {
    await getAuth(app).verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: 'invalid token' });
    return;
  }

  const db = getDatabase(app);

  const notifSnap = await db.ref(`notifs/${notifId}`).get();
  if (!notifSnap.exists()) {
    res.status(404).json({ error: 'notification not found' });
    return;
  }

  const notif = notifSnap.val() as StoredNotif;

  if (!notif.userId || typeof notif.createdAt !== 'number' || Date.now() - notif.createdAt > MAX_NOTIF_AGE_MS) {
    res.status(410).json({ error: 'notification expired' });
    return;
  }

  const result = await sendPushToUser(db, getMessaging(app), notif.userId, notif.title, notif.body);
  res.status(200).json(result);
}
