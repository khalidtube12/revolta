import { create } from 'zustand';
import * as tasksService from '../services/tasks.service';
import { createNotification } from '../services/notifications.service';
import { useAuthStore } from './authStore';
import type { Task } from '../types';
import { DEFAULT_PERMISSIONS } from '../types';

interface TasksState {
  tasks: Task[];
  loading: boolean;
  filterMonth: string;
  filterPriority: string;

  loadAllTasks: () => Promise<void>;
  loadUserTasks: (userId: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>, notifyTitle?: string, notifyBody?: string, teamIds?: string[]) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setFilterMonth: (month: string) => void;
  setFilterPriority: (priority: string) => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,
  filterMonth: '',
  filterPriority: '',

  loadAllTasks: async () => {
    set({ loading: true });
    const tasks = await tasksService.fetchAllTasks();
    set({ tasks, loading: false });
  },

  loadUserTasks: async (userId) => {
    set({ loading: true });
    const tasks = await tasksService.fetchUserTasks(userId);
    set({ tasks, loading: false });
  },

  addTask: async (task, notifyTitle, notifyBody, teamIds = []) => {
    const { profile, firebaseUser } = useAuthStore.getState();
    const isAdmin = !!profile?.isAdmin;
    const canAddOthers = isAdmin || (profile?.permissions?.addTaskOthers ?? DEFAULT_PERMISSIONS.addTaskOthers);
    if (!canAddOthers && task.memberId !== firebaseUser?.uid) {
      throw new Error('ليس لديك صلاحية لإسناد مهام للآخرين');
    }
    await tasksService.createTask(task);
    if (notifyTitle) {
      const allRecipients = [task.memberId, ...teamIds];
      // Notifications are best-effort — don't block task creation if rules aren't set
      Promise.all(allRecipients.map(userId =>
        createNotification({
          userId,
          title: notifyTitle,
          body: notifyBody || '',
          read: false,
          createdAt: Date.now(),
        })
      )).catch(() => {});
    }
  },

  updateTask: async (id, data) => {
    await tasksService.updateTask(id, data);
    const { tasks } = get();
    set({ tasks: tasks.map(t => t.id === id ? { ...t, ...data } : t) });
  },

  deleteTask: async (id) => {
    await tasksService.deleteTask(id);
    const { tasks } = get();
    set({ tasks: tasks.filter(t => t.id !== id) });
  },

  setFilterMonth: (month) => set({ filterMonth: month }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),
}));
