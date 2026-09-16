import { dbGet, dbSet } from './db.service';
import type { NotificationType, NotificationTypeSettings } from '../types';

export type NotificationSettingsMap = Partial<Record<NotificationType, NotificationTypeSettings>>;

export async function loadNotificationTypeSettings(): Promise<NotificationSettingsMap> {
  const data = await dbGet<NotificationSettingsMap>('settings/notifications');
  return data ?? {};
}

export async function saveNotificationTypeSettings(
  type: NotificationType,
  settings: NotificationTypeSettings,
): Promise<void> {
  await dbSet(`settings/notifications/${type}`, settings);
}
