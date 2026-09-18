import { create } from 'zustand';
import api from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProjectUpdate {
  id: number;
  title: string;
  body: string;
  posted_by: number;
  created_at: string;
  comment_count?: number;
}

export interface ProjectThread {
  id: number;
  title: string;
  body: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
}

export interface ProjectThreadMessage {
  id: number;
  thread_id: number;
  body: string;
  created_by: number;
  user_name?: string;
  user_avatar?: string;
  created_at: string;
}

export interface ProjectFAQ {
  id: number;
  question: string;
  answer: string;
}

export interface ProjectInvestorItem {
  user_id: number;
  first_name: string;
  last_name: string;
  picture?: string;
  principal_amount: number;
  total_amount: number;
  investment_count: number;
  first_invested_at?: string;
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface ProjectDetailState {
  updates: ProjectUpdate[];
  threads: ProjectThread[];
  updateThreads: Record<number, ProjectThread[]>;
  threadMessages: Record<number, ProjectThreadMessage[]>;
  faqs: ProjectFAQ[];
  investorCount: number;
  investors: ProjectInvestorItem[];
  isLoading: boolean;
  fetchUpdates: (id: number) => Promise<void>;
  fetchThreads: (id: number) => Promise<void>;
  fetchFAQs: (id: number) => Promise<void>;
  fetchInvestorCount: (id: number) => Promise<void>;
  fetchAll: (id: number) => Promise<void>;
  createThread: (projectId: number, body: string, isOwner?: boolean) => Promise<void>;
  fetchUpdateThreads: (projectId: number, updateId: number) => Promise<void>;
  createUpdateThread: (projectId: number, updateId: number, body: string, isOwner: boolean) => Promise<void>;
  fetchThreadMessages: (threadId: number) => Promise<void>;
  createThreadMessage: (threadId: number, body: string, isOwner: boolean) => Promise<void>;
}

// ─── Store Implementation ────────────────────────────────────────────────────

export const useProjectDetailStore = create<ProjectDetailState>((set) => ({
  updates: [],
  threads: [],
  updateThreads: {},
  threadMessages: {},
  faqs: [],
  investorCount: 0,
  investors: [],
  isLoading: false,

  fetchUpdates: async (id: number) => {
    try {
      const res = await api.get(`/projects/${id}/updates`);
      const updates: ProjectUpdate[] = res.data?.data ?? [];
      const commentsByUpdate = await Promise.all(
        updates.map(async (update) => {
          try {
            const commentsRes = await api.get(`/projects/${id}/updates/${update.id}/threads`);
            const comments: ProjectThread[] = commentsRes.data?.data ?? [];
            return [update.id, comments] as const;
          } catch (error) {
            console.warn(`fetchUpdateThreads (${update.id}):`, error);
            return [update.id, [] as ProjectThread[]] as const;
          }
        })
      );
      const updateThreads = Object.fromEntries(commentsByUpdate) as Record<number, ProjectThread[]>;

      set({
        updates: updates.map((update) => ({
          ...update,
          comment_count: updateThreads[update.id]?.length ?? 0,
        })),
        updateThreads,
      });
    } catch (error) {
      console.warn('fetchUpdates:', error);
    }
  },

  fetchThreads: async (id: number) => {
    try {
      const res = await api.get(`/projects/${id}/threads`);
      set({ threads: res.data?.data ?? [] });
    } catch (error) {
      console.warn('fetchThreads:', error);
    }
  },

  fetchFAQs: async (id: number) => {
    try {
      const res = await api.get(`/projects/${id}/faqs`);
      set({ faqs: res.data?.data ?? [] });
    } catch (error) {
      console.warn('fetchFAQs:', error);
    }
  },

  fetchInvestorCount: async (id: number) => {
    try {
      const res = await api.get(`/investments/projects/${id}/investors`);
      set({ investorCount: res.data?.data?.total ?? 0 });
    } catch (error) {
      console.warn('fetchInvestorCount:', error);
      set({ investorCount: 0 });
    }
  },

  createThread: async (projectId: number, body: string, isOwner = false) => {
    const endpoint = isOwner
      ? `/pioneer/projects/${projectId}/threads`
      : `/booster/projects/${projectId}/threads`;
    await api.post(endpoint, { body });
    const res = await api.get(`/projects/${projectId}/threads`);
    set({ threads: res.data?.data ?? [] });
  },

  fetchUpdateThreads: async (projectId: number, updateId: number) => {
    try {
      const res = await api.get(`/projects/${projectId}/updates/${updateId}/threads`);
      set((state) => ({
        updateThreads: { ...state.updateThreads, [updateId]: res.data?.data ?? [] },
        updates: state.updates.map((update) =>
          update.id === updateId
            ? { ...update, comment_count: (res.data?.data ?? []).length }
            : update
        ),
      }));
    } catch (error) {
      console.warn('fetchUpdateThreads:', error);
    }
  },

  createUpdateThread: async (projectId: number, updateId: number, body: string, isOwner: boolean) => {
    const endpoint = isOwner
      ? `/pioneer/projects/${projectId}/updates/${updateId}/threads`
      : `/booster/projects/${projectId}/updates/${updateId}/threads`;
    await api.post(endpoint, { body });
    const res = await api.get(`/projects/${projectId}/updates/${updateId}/threads`);
    set((state) => ({
      updateThreads: { ...state.updateThreads, [updateId]: res.data?.data ?? [] },
      updates: state.updates.map((update) =>
        update.id === updateId
          ? { ...update, comment_count: (res.data?.data ?? []).length }
          : update
      ),
    }));
  },

  fetchThreadMessages: async (threadId: number) => {
    try {
      const res = await api.get(`/projects/threads/${threadId}/messages`);
      set((state) => ({
        threadMessages: { ...state.threadMessages, [threadId]: res.data?.data ?? [] },
      }));
    } catch (error) {
      console.warn('fetchThreadMessages:', error);
    }
  },

  createThreadMessage: async (threadId: number, body: string, isOwner: boolean) => {
    const endpoint = isOwner
      ? `/pioneer/projects/threads/${threadId}/messages`
      : `/booster/projects/threads/${threadId}/messages`;
    await api.post(endpoint, { body, thread_id: threadId, type: 'text' });
    const res = await api.get(`/projects/threads/${threadId}/messages`);
    set((state) => ({
      threadMessages: { ...state.threadMessages, [threadId]: res.data?.data ?? [] },
    }));
  },

  fetchAll: async (id: number) => {
    set({ isLoading: true });
    try {
      const [updatesRes, threadsRes, faqsRes, invCountRes] = await Promise.allSettled([
        api.get(`/projects/${id}/updates`),
        api.get(`/projects/${id}/threads`),
        api.get(`/projects/${id}/faqs`),
        api.get(`/investments/projects/${id}/investors`),
      ]);
      set({
        updates: updatesRes.status === 'fulfilled' ? updatesRes.value.data?.data ?? [] : [],
        threads: threadsRes.status === 'fulfilled' ? threadsRes.value.data?.data ?? [] : [],
        faqs: faqsRes.status === 'fulfilled' ? faqsRes.value.data?.data ?? [] : [],
        investorCount: invCountRes.status === 'fulfilled' ? invCountRes.value.data?.data?.total ?? 0 : 0,
        investors: invCountRes.status === 'fulfilled' ? invCountRes.value.data?.data?.investors ?? [] : [],
      });
    } catch (error) {
      console.warn('fetchAll:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
