import { create } from 'zustand';
import * as ideasService from '../services/ideas.service';
import { updateTask } from '../services/tasks.service';
import { useAuthStore } from './authStore';
import type { Idea } from '../types';

interface IdeasState {
  ideas: Idea[];
  loading: boolean;
  newIdeasCount: number;

  loadIdeas: () => Promise<void>;
  addIdea: (idea: Omit<Idea, 'id'>) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  assignIdea: (ideaId: string, userId: string) => Promise<void>;
  claimIdea: (ideaId: string, userId: string) => Promise<void>;
  unclaimIdea: (ideaId: string) => Promise<void>;
  linkIdeaToTask: (ideaId: string, taskId: string) => Promise<void>;
  updateNewIdeasCount: (userId: string) => void;
  markIdeasSeen: (userId: string) => void;
}

export const useIdeasStore = create<IdeasState>((set, get) => ({
  ideas: [],
  loading: false,
  newIdeasCount: 0,

  loadIdeas: async () => {
    set({ loading: true });
    const ideas = await ideasService.fetchAllIdeas();
    set({ ideas, loading: false });
  },

  addIdea: async (idea) => {
    await ideasService.createIdea(idea);
    await get().loadIdeas();
  },

  deleteIdea: async (id) => {
    const { profile, firebaseUser } = useAuthStore.getState();
    const idea = get().ideas.find(i => i.id === id);
    if (!idea) return;
    if (!profile?.isAdmin && idea.createdBy !== firebaseUser?.uid) {
      throw new Error('لا يمكنك حذف فكرة لم تنشئها');
    }
    if (idea.linkedTaskId) {
      await updateTask(idea.linkedTaskId, { linkedIdeaId: null } as never);
    }
    await ideasService.deleteIdea(id);
    await get().loadIdeas();
  },

  assignIdea: async (ideaId, userId) => {
    const { profile } = useAuthStore.getState();
    if (!profile?.isAdmin) {
      throw new Error('فقط الأدمن يمكنه إسناد الأفكار للآخرين');
    }
    await ideasService.updateIdea(ideaId, { ownerId: userId });
    await get().loadIdeas();
  },

  claimIdea: async (ideaId, userId) => {
    const { firebaseUser } = useAuthStore.getState();
    if (userId !== firebaseUser?.uid) {
      throw new Error('لا يمكنك المطالبة بفكرة لشخص آخر');
    }
    const idea = get().ideas.find(i => i.id === ideaId);
    if (idea?.ownerId) {
      throw new Error('هذه الفكرة مسندة بالفعل');
    }
    await ideasService.updateIdea(ideaId, { ownerId: userId });
    await get().loadIdeas();
  },

  unclaimIdea: async (ideaId) => {
    const { profile, firebaseUser } = useAuthStore.getState();
    const idea = get().ideas.find(i => i.id === ideaId);
    if (!idea) return;
    if (!profile?.isAdmin && idea.ownerId !== firebaseUser?.uid) {
      throw new Error('لا يمكنك إلغاء إسناد فكرة لست صاحبها');
    }
    if (idea.linkedTaskId) {
      await updateTask(idea.linkedTaskId, { linkedIdeaId: null } as never);
    }
    await ideasService.updateIdea(ideaId, { ownerId: null, linkedTaskId: null });
    await get().loadIdeas();
  },

  linkIdeaToTask: async (ideaId, taskId) => {
    const { profile, firebaseUser } = useAuthStore.getState();
    const idea = get().ideas.find(i => i.id === ideaId);
    if (!idea) return;
    if (!profile?.isAdmin && idea.ownerId !== firebaseUser?.uid) {
      throw new Error('لا يمكنك ربط فكرة لست صاحبها بمهمة');
    }
    await ideasService.updateIdea(ideaId, { linkedTaskId: taskId });
    await updateTask(taskId, { linkedIdeaId: ideaId } as never);
    await get().loadIdeas();
  },

  updateNewIdeasCount: (userId) => {
    const lastSeen = parseInt(localStorage.getItem('ideas_last_seen_' + userId) || '0');
    const count = get().ideas.filter(i => (i.createdAt || 0) > lastSeen).length;
    set({ newIdeasCount: count });
  },

  markIdeasSeen: (userId) => {
    localStorage.setItem('ideas_last_seen_' + userId, String(Date.now()));
    set({ newIdeasCount: 0 });
  },
}));
