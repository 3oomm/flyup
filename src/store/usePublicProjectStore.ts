import { create } from 'zustand';
import api from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OwnerProfile {
  first_name: string;
  last_name: string;
  university: string;
  faculty: string | null;
  major: string | null;
  bio: string | null;
  verify_status: string;
  project_count: number;
  picture?: string;
}

export interface PublicMilestone {
  id: number;
  project_id: number;
  phase_no: number;
  title: string;
  description: string | null;
  duration?: number;
  due_date?: string | null;
  acceptance_criteria: string | null;
  type?: string[];
  urls?: string[];
  sort_order: number;
  percent_release: number;
  status: string;
  // Submission info
  submission_summary?: string | null;
  submission_criteria?: string[];
  submission_attachments?: string[];
  submission_links?: string[];
  submitted_at?: string | null;
  // Voting info
  voting_open?: boolean;
  voting_opened_at?: string | null;
  voting_closed_at?: string | null;
}

export interface PublicProject {
  id: number;
  slug: string;
  owner_user_id: number;
  category: string | null;
  title: string;
  description: string | null;
  state: string;
  status: string;
  visibility: string;
  risk: string | null;
  funding_goal: number;
  softcap: number;
  current_funding: number;
  duration_days: number;
  duration_months: number;
  end_date: string | null;
  funding_at: string | null;
  created_at: string;
  updated_at: string;
  profit_share_pct: number;
  min_invest_amount: number;
  max_invest_amount: number;
  platform_fee: number;
  owner_profile: OwnerProfile | null;
  // These may come from detailed GET /projects/{id}
  cover_image?: string | null;
  media?: { id: number; type: string; url: string; sort_order: number }[];
  milestones?: PublicMilestone[];
  stories?: { id: number; title: string; body: string; sort_order: number }[];
  thumbnail_url?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface PlatformStats {
  funded_projects: number;
  total_funding: number;
  unique_boosters: number;
  passed_milestones: number;
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface PublicProjectState {
  publicProjects: PublicProject[];
  recommendedProjects: PublicProject[];
  newProjects: PublicProject[];
  endingProjects: PublicProject[];
  executingProjects: PublicProject[];
  currentPublicProject: PublicProject | null;
  categories: Category[];
  platformStats: PlatformStats | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  isFetchError: boolean;

  fetchPublicProjects: () => Promise<void>;
  fetchHomeProjects: () => Promise<void>;
  fetchPublicProjectById: (id: number) => Promise<void>;
  fetchPublicProjectBySlug: (slug: string) => Promise<void>;
  fetchProjectsByCategory: (categoryId: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchPlatformStats: () => Promise<void>;
}

// ─── Store Implementation ────────────────────────────────────────────────────

export const usePublicProjectStore = create<PublicProjectState>((set) => ({
  publicProjects: [],
  recommendedProjects: [],
  newProjects: [],
  endingProjects: [],
  executingProjects: [],
  currentPublicProject: null,
  categories: [],
  platformStats: null,
  isLoading: false,
  isDetailLoading: false,
  isFetchError: false,

  fetchPublicProjects: async () => {
    set({ isLoading: true, isFetchError: false });
    try {
      const res = await api.get('/projects');
      const projectsRaw: PublicProject[] = res.data?.data ?? [];
      const projects = projectsRaw.map((p) => ({
        ...p,
        thumbnail_url: p.cover_image ?? undefined,
      }));
      set({ publicProjects: projects });
    } catch (error) {
      console.error('fetchPublicProjects:', error);
      set({ isFetchError: true });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchHomeProjects: async () => {
    set({ isLoading: true, isFetchError: false });
    try {
      const [recRes, newRes, endRes, execRes] = await Promise.all([
        api.get('/projects/recommend'),
        api.get('/projects/new'),
        api.get('/projects/ending'),
        api.get('/projects/executing'),
      ]);

      const processProjects = (projectsRaw: PublicProject[]) =>
        projectsRaw.map((p) => ({ ...p, thumbnail_url: p.cover_image ?? undefined }));

      const recommended = processProjects(recRes.data?.data ?? []);
      const newP = processProjects(newRes.data?.data ?? []);
      const ending = processProjects(endRes.data?.data ?? []);
      const executing = processProjects(execRes.data?.data ?? []);

      set({
        recommendedProjects: recommended,
        newProjects: newP,
        endingProjects: ending,
        executingProjects: executing,
      });
    } catch (error) {
      console.error('fetchHomeProjects:', error);
      set({ isFetchError: true });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPublicProjectById: async (id: number) => {
    set({ isDetailLoading: true, currentPublicProject: null });
    try {
      const res = await api.get(`/projects/${id}`);
      set({ currentPublicProject: res.data?.data ?? null });
    } catch (error) {
      console.error('fetchPublicProjectById:', error);
    } finally {
      set({ isDetailLoading: false });
    }
  },

  fetchPublicProjectBySlug: async (slug: string) => {
    set({ isDetailLoading: true, currentPublicProject: null });
    try {
      // Project slugs always end with the project ID. Using that ID avoids
      // encoded Thai path parameters being compared directly with the
      // decoded slug stored in the database.
      const projectId = slug.match(/-(\d+)$/)?.[1];
      const endpoint = projectId
        ? `/projects/${projectId}`
        : `/projects/slug/${encodeURIComponent(slug)}`;
      const res = await api.get(endpoint);
      set({ currentPublicProject: res.data?.data ?? null });
    } catch (error) {
      console.error('fetchPublicProjectBySlug:', error);
    } finally {
      set({ isDetailLoading: false });
    }
  },

  fetchProjectsByCategory: async (categoryId: number) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/projects/category/${categoryId}`);
      const projectsRaw: PublicProject[] = res.data?.data ?? [];
      const projects = projectsRaw.map((p) => ({ ...p, thumbnail_url: p.cover_image ?? undefined }));
      set({ publicProjects: projects });
    } catch (error) {
      console.error('fetchProjectsByCategory:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const res = await api.get('/categories');
      const categories: Category[] = res.data?.data ?? [];
      set({ categories });
    } catch (error) {
      console.error('fetchCategories:', error);
    }
  },

  fetchPlatformStats: async () => {
    try {
      const res = await api.get('/stats');
      set({ platformStats: res.data?.data ?? null });
    } catch (error) {
      console.error('fetchPlatformStats:', error);
    }
  },
}));
