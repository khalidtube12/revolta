import { create } from 'zustand';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { ref, onValue, off } from 'firebase/database';
import { auth, db } from '../services/firebase';
import * as authService from '../services/auth.service';
import { getUserProfile, syncPublicProfile } from '../services/users.service';
import { dbUpdate } from '../services/db.service';
import type { User, UserPermissions } from '../types';
import { DEFAULT_PERMISSIONS } from '../types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  profile: User | null;
  loading: boolean;
  initialized: boolean;
  pendingApproval: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, role: string, email: string, password: string, setupKey?: string) => Promise<{ isAdmin: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (name: string, email?: string, password?: string, photoURL?: string, twitterHandle?: string) => Promise<void>;
  can: (permission: keyof UserPermissions) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  profile: null,
  loading: false,
  initialized: false,
  pendingApproval: false,

  login: async (email, password) => {
    await authService.login(email, password);
  },

  register: async (name, role, email, password, setupKey) => {
    isRegistering = true;
    try {
      const result = await authService.register(name, role, email, password, setupKey);
      if (!result.isAdmin) {
        await authService.logout();
      } else {
        // أدمن: حدّث الـ store يدوياً لأن الـ listener رجع مبكراً
        const currentUser = auth.currentUser;
        if (currentUser) {
          const profile = await getUserProfile(currentUser.uid);
          if (profile) {
            useAuthStore.setState({ firebaseUser: currentUser, profile, loading: false, initialized: true, pendingApproval: false });
          }
        }
      }
      return { isAdmin: result.isAdmin };
    } finally {
      isRegistering = false;
    }
  },

  logout: async () => {
    await authService.logout();
  },

  resetPassword: async (email) => {
    await authService.resetPassword(email);
  },

  refreshProfile: async () => {
    const { firebaseUser } = get();
    if (!firebaseUser) return;
    const profile = await getUserProfile(firebaseUser.uid);
    if (profile) {
      set({ profile });
    }
  },

  updateProfile: async (name, email, password, photoURL, twitterHandle) => {
    const { firebaseUser } = get();
    if (!firebaseUser) return;
    const updates = await authService.updateUserProfile(firebaseUser.uid, name, email, password);
    if (photoURL !== undefined) updates.photoURL = photoURL;
    if (twitterHandle !== undefined) updates.twitterHandle = twitterHandle;
    await dbUpdate('users/' + firebaseUser.uid, updates);
    const { profile } = get();
    if (profile) {
      await syncPublicProfile(firebaseUser.uid, {
        name: (updates.name as string) ?? profile.name,
        jobRole: profile.jobRole,
        isLeader: profile.isAdmin ?? false,
        photoURL: photoURL !== undefined ? photoURL : profile.photoURL ?? null,
        twitterHandle: twitterHandle !== undefined ? twitterHandle : profile.twitterHandle ?? null,
      });
    }
    await get().refreshProfile();
  },

  can: (permission) => {
    const { profile } = get();
    if (!profile) return false;
    if (profile.isAdmin) return true;
    const perms = profile.permissions ?? DEFAULT_PERMISSIONS;
    return perms[permission] ?? DEFAULT_PERMISSIONS[permission];
  },
}));

let profileUnsubscribe: (() => void) | null = null;
let isRegistering = false;

export function initAuthListener() {
  onAuthStateChanged(auth, async (user) => {
    // Clean up previous profile listener
    if (profileUnsubscribe) { profileUnsubscribe(); profileUnsubscribe = null; }

    if (user) {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        if (profile.approved === false) {
          await authService.logout();
          useAuthStore.setState({ firebaseUser: null, profile: null, loading: false, initialized: true, pendingApproval: true });
          return;
        }
        useAuthStore.setState({ firebaseUser: user, profile, loading: false, initialized: true, pendingApproval: false });

        // Real-time listener: auto-update profile when admin changes permissions or other fields
        const profileRef = ref(db, 'users/' + user.uid);
        const handler = onValue(profileRef, async (snap) => {
          if (!snap.exists()) {
            try { await user.delete(); } catch {}
            await authService.logout();
            useAuthStore.setState({ firebaseUser: null, profile: null, loading: false, initialized: true, pendingApproval: false });
            return;
          }
          const updated = { id: user.uid, ...snap.val() } as User;
          useAuthStore.setState({ profile: updated });
        });
        profileUnsubscribe = () => off(profileRef, 'value', handler);
      } else {
        // إذا كنا في منتصف عملية تسجيل، لا تسوي logout — التسجيل لسا يكتب البيانات
        if (isRegistering) return;
        try { await user.delete(); } catch {}
        await authService.logout();
        useAuthStore.setState({ firebaseUser: null, profile: null, loading: false, initialized: true, pendingApproval: false });
      }
    } else {
      useAuthStore.setState({ firebaseUser: null, profile: null, loading: false, initialized: true, pendingApproval: false });
    }
  });
}
