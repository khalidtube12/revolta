import type { IncomingMessage, ServerResponse } from 'http';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';
import { getAdminApp } from '../lib/firebaseAdmin.js';
import { sendPushToUser } from '../lib/sendPush.js';

interface VercelRequest extends IncomingMessage {
  headers: IncomingMessage['headers'];
}

interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

interface StoredTask {
  memberId: string;
  title: string;
  deadline?: string;
  status?: string;
  done?: boolean;
  teamMemberIds?: string[] | Record<string, boolean>;
  overdueNotifiedAt?: number;
}

interface NotificationTypeSettings {
  enabled?: boolean;
  pushEnabled?: boolean;
}

const DONE_STATUSES = new Set(['done', 'published', 'cancelled']);

function getTeamIds(t: StoredTask): string[] {
  if (Array.isArray(t.teamMemberIds)) return t.teamMemberIds;
  if (t.teamMemberIds) return Object.keys(t.teamMemberIds);
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const app = getAdminApp();
  const db = getDatabase(app);

  const settingsSnap = await db.ref('settings/notifications/task_overdue').get();
  const typeSettings = (settingsSnap.val() as NotificationTypeSettings | null) ?? {};
  if (typeSettings.enabled === false) {
    res.status(200).json({ checked: 0, notified: 0, skipped: true });
    return;
  }

  const tasksSnap = await db.ref('tasks').get();
  const tasksData = (tasksSnap.val() as Record<string, StoredTask> | null) ?? {};

  const todayStr = new Date().toISOString().slice(0, 10);
  const messaging = getMessaging(app);

  let checkedCount = 0;
  let notifiedCount = 0;

  for (const [taskId, task] of Object.entries(tasksData)) {
    if (!task.deadline || task.deadline >= todayStr) continue;
    if (task.done || (task.status && DONE_STATUSES.has(task.status))) continue;
    if (task.overdueNotifiedAt) continue;
    checkedCount++;

    const recipients = [task.memberId, ...getTeamIds(task)].filter(Boolean);
    const title = '⏰ مهمة متأخرة: ' + task.title;
    const body = 'تجاوزت المهمة موعدها النهائي — يرجى المتابعة';

    await Promise.all(recipients.map(async userId => {
      await db.ref('notifs').push({
        userId,
        type: 'task_overdue',
        title,
        body,
        read: false,
        createdAt: Date.now(),
      });
      if (typeSettings.pushEnabled !== false) {
        await sendPushToUser(db, messaging, userId, title, body).catch(() => {});
      }
    }));

    await db.ref(`tasks/${taskId}/overdueNotifiedAt`).set(Date.now());
    notifiedCount++;
  }

  res.status(200).json({ checked: checkedCount, notified: notifiedCount });
}
