import { create } from 'zustand';
import * as usersService from '../services/users.service';
import * as authService from '../services/auth.service';
import * as tasksService from '../services/tasks.service';
import { deleteUserNotifications } from '../services/notifications.service';
import type { User } from '../types';

interface MembersState {
  members: User[];
  loading: boolean;
  pendingCount: number;

  loadMembers: () => Promise<void>;
  loadPendingCount: () => Promise<void>;
  addMember: (name: string, role: string, email: string, password: string) => Promise<void>;
  changeRole: (uid: string, role: string) => Promise<void>;
  deleteMember: (uid: string) => Promise<void>;
  approveUser: (uid: string) => Promise<void>;
  rejectUser: (uid: string) => Promise<void>;
}

export const useMembersStore = create<MembersState>((set, get) => ({
  members: [],
  loading: false,
  pendingCount: 0,

  loadMembers: async () => {
    set({ loading: true });
    const members = await usersService.fetchUsers();
    set({ members, loading: false });
  },

  loadPendingCount: async () => {
    const pending = await usersService.fetchPendingUsers();
    set({ pendingCount: pending.length });
  },

  addMember: async (name, role, email, password) => {
    const { members } = get();
    await authService.createMemberAccount(name, role, email, password, members.length);
    await get().loadMembers();
  },

  changeRole: async (uid, role) => {
    await usersService.changeUserRole(uid, role);
    await get().loadMembers();
  },

  deleteMember: async (uid) => {
    await tasksService.deleteUserTasks(uid);
    await deleteUserNotifications(uid).catch(() => {});
    await usersService.deleteUser(uid);
    await get().loadMembers();
  },

  approveUser: async (uid) => {
    await usersService.approveUser(uid);
    await get().loadPendingCount();
  },

  rejectUser: async (uid) => {
    await usersService.rejectUser(uid);
    await get().loadPendingCount();
  },
}));
