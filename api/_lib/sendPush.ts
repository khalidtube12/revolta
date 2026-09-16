import type { Database } from 'firebase-admin/database';
import type { Messaging } from 'firebase-admin/messaging';

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export async function sendPushToUser(
  db: Database,
  messaging: Messaging,
  userId: string,
  title: string,
  body: string,
): Promise<{ sent: number; failed: number }> {
  const tokensSnap = await db.ref(`fcmTokens/${userId}`).get();
  const tokens = tokensSnap.exists() ? Object.keys(tokensSnap.val() as Record<string, true>) : [];
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const result = await messaging.sendEachForMulticast({
    tokens,
    data: { title, body },
  });

  const deadTokens: string[] = [];
  result.responses.forEach((r, i) => {
    const code = r.error?.code;
    if (!r.success && code && DEAD_TOKEN_CODES.has(code)) {
      deadTokens.push(tokens[i]);
    }
  });
  if (deadTokens.length) {
    await Promise.all(deadTokens.map(t => db.ref(`fcmTokens/${userId}/${t}`).remove()));
  }

  return { sent: result.successCount, failed: result.failureCount };
}
