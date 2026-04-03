import { create } from 'zustand';
import * as notifService from '../services/notifications.service';
import type { Notification } from '../types';

interface NotificationsState {
  notifications: Notification[];
  panelOpen: boolean;
  unsubscribe: (() => void) | null;

  listen: (userId: string) => void;
  stopListening: () => void;
  togglePanel: () => void;
  closePanel: () => void;
  markAllRead: () => Promise<void>;
  hasUnread: () => boolean;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  panelOpen: false,
  unsubscribe: null,

  listen: (userId) => {
    const { unsubscribe } = get();
    if (unsubscribe) unsubscribe();

    const unsub = notifService.listenToNotifications(userId, (notifications) => {
      set({ notifications });
    });
    set({ unsubscribe: unsub });
  },

  stopListening: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },

  togglePanel: () => set(s => ({ panelOpen: !s.panelOpen })),
  closePanel: () => set({ panelOpen: false }),

  markAllRead: async () => {
    const { notifications } = get();
    await notifService.markAllRead(notifications);
  },

  hasUnread: () => {
    return get().notifications.some(n => !n.read);
  },
}));
