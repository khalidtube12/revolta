import type { IncomingMessage, ServerResponse } from 'http';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';

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

function getAdminApp() {
  const existing = getApps();
  if (existing.length) return existing[0]!;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string);
  return initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

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

  const tokensSnap = await db.ref(`fcmTokens/${notif.userId}`).get();
  const tokens = tokensSnap.exists() ? Object.keys(tokensSnap.val() as Record<string, true>) : [];
  if (tokens.length === 0) {
    res.status(200).json({ sent: 0 });
    return;
  }

  const result = await getMessaging(app).sendEachForMulticast({
    tokens,
    notification: { title: notif.title, body: notif.body },
  });

  const deadTokens: string[] = [];
  result.responses.forEach((r, i) => {
    const code = r.error?.code;
    if (!r.success && (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token')) {
      deadTokens.push(tokens[i]);
    }
  });
  if (deadTokens.length) {
    await Promise.all(deadTokens.map(t => db.ref(`fcmTokens/${notif.userId}/${t}`).remove()));
  }

  res.status(200).json({ sent: result.successCount });
}
