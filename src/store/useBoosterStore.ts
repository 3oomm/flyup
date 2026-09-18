import { create } from 'zustand';
import api from '../services/api';
import type { PublicProject } from './usePublicProjectStore';
import { useBoosterBadgeStore } from './useBoosterBadgeStore';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BoosterMeeting {
  id: number;
  milestone_id: number;
  about?: string;
  description?: string | null;
  meeting_type?: string;
  place?: string;
  date: string;
  time: string;
  link: string | null;
  status: string;
  created_at: string;
  project?: {
    id: number;
    title: string;
    cover_image?: string | null;
  };
  milestone?: {
    id: number;
    title: string;
    phase_no: number;
    project_id: number;
  };
}

export interface BoosterInvestment {
  id: number;
  project_id: number;
  booster_user_id: number;
  amount: number;
  total_amount?: number;
  fee_amount?: number;
  platform_fee?: number;
  vat?: number;
  net_amount?: number;
  reference_number?: string;
  status: string;
  profit_share_pct?: number;
  slip_image: string | null;
  payment_status: string;
  paid_at: string | null;
  refund_amount?: number;
  refund_note?: string;
  refunded_at?: string | null;
  created_at: string;
  updated_at: string;
  project?: PublicProject | null;
  milestones?: {
    id: number;
    title: string;
    description: string;
    percent_release: number;
    status: string;
  }[];
}

export interface ProfitPayout {
  id: number;
  project_id: number;
  project_title: string;
  cover_image?: string | null;
  quarter_no: number;
  amount: number;
  share_pct: number;
  status: 'pending' | 'confirmed';
  transfer_ref: string;
  confirmed_at?: string;
  created_at: string;
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface BoosterStoreState {
  investments: BoosterInvestment[];
  currentInvestment: BoosterInvestment | null;
  boosterMeetings: BoosterMeeting[];
  profitPayouts: ProfitPayout[];
  isLoading: boolean;
  isDetailLoading: boolean;
  isLoadingProfitPayouts: boolean;

  fetchMyInvestments: () => Promise<void>;
  fetchBoosterMeetings: () => Promise<void>;
  fetchInvestmentById: (id: number) => Promise<void>;
  fetchProfitPayouts: () => Promise<void>;
  requestRefund: (investmentId: number, reason: string) => Promise<boolean>;
  voteOnMilestone: (milestoneId: number, payload: { choice: 'approve' | 'reject', comment?: string }) => Promise<boolean | 'already_voted'>;
  getMyVote: (milestoneId: number) => Promise<{ choice: string; comment?: string } | null>;
}

// ─── Store Implementation ────────────────────────────────────────────────────

export const useBoosterStore = create<BoosterStoreState>((set) => ({
  investments: [],
  currentInvestment: null,
  boosterMeetings: [],
  profitPayouts: [],
  isLoading: false,
  isDetailLoading: false,
  isLoadingProfitPayouts: false,

  fetchBoosterMeetings: async () => {
    try {
      const res = await api.get('/me/investor-meetings');
      set({ boosterMeetings: res.data?.data ?? [] });
    } catch (error) {
      console.error('fetchBoosterMeetings:', error);
      set({ boosterMeetings: [] });
    }
  },

  fetchMyInvestments: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/investments');
      const data = res.data?.data ?? res.data?.investments ?? [];
      
      type RawInvestment = BoosterInvestment & { total_amount?: number; CreatedAt?: string; vat_amount?: number; principal_amount?: number };
      let investmentsArray = Array.isArray(data) ? data.map((inv: RawInvestment) => ({
        ...inv,
        amount: inv.amount ?? inv.total_amount ?? 0,
        created_at: inv.created_at ?? inv.CreatedAt ?? '',
        vat: inv.vat ?? inv.vat_amount ?? 0,
        net_amount: inv.net_amount ?? inv.principal_amount,
      })) : [];

      try {
        const myProjectsRes = await api.get('/investments/my-projects');
        const myProjects: Array<{ project_id: number; title: string; cover_image?: string | null; profit_share_pct?: number }> = myProjectsRes.data?.data ?? [];
        const projectMap = new Map<number, { title: string; cover_image?: string | null; profit_share_pct?: number }>();
        myProjects.forEach((p) => projectMap.set(p.project_id, p));

        investmentsArray = investmentsArray.map(inv => {
          const meta = projectMap.get(inv.project_id);
          if (meta) {
            inv.project = {
              ...(inv.project ?? {}),
              title: meta.title,
              cover_image: meta.cover_image ?? null,
              profit_share_pct: meta.profit_share_pct ?? inv.project?.profit_share_pct ?? 0,
            } as PublicProject;
          }
          return inv;
        });
      } catch (err) {
        console.error('Failed to fetch my projects for investments mapping', err);
      }

      set({ investments: investmentsArray });
    } catch (error) {
      console.error('fetchMyInvestments:', error);
      set({ investments: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchInvestmentById: async (id: number) => {
    set({ isDetailLoading: true, currentInvestment: null });
    try {
      const res = await api.get(`/investments/${id}`);
      let data = res.data?.data?.investment ?? res.data?.data ?? res.data?.investment ?? res.data;
      if (data) {
        data = {
          ...data,
          amount: data.amount ?? data.total_amount ?? 0,
          created_at: data.created_at ?? data.CreatedAt ?? '',
          vat: data.vat ?? data.vat_amount ?? 0,
          net_amount: data.net_amount ?? data.principal_amount,
        };
      }
      set({ currentInvestment: data });
    } catch (error) {
      console.error('fetchInvestmentById:', error);
      set({ currentInvestment: null });
    } finally {
      set({ isDetailLoading: false });
    }
  },

  fetchProfitPayouts: async () => {
    set({ isLoadingProfitPayouts: true });
    try {
      const res = await api.get('/me/profit-payouts');
      set({ profitPayouts: res.data?.data ?? [] });
    } catch (error) {
      console.error('fetchProfitPayouts:', error);
      set({ profitPayouts: [] });
    } finally {
      set({ isLoadingProfitPayouts: false });
    }
  },

  requestRefund: async (investmentId: number, reason: string) => {
    try {
      await api.post(`/investments/${investmentId}/refund`, { note: reason });
      return true;
    } catch (error) {
      console.error('requestRefund:', error);
      return false;
    }
  },

  voteOnMilestone: async (milestoneId: number, payload: { choice: 'approve' | 'reject', comment?: string }) => {
    try {
      await api.post(`/investments/milestones/${milestoneId}/vote`, payload);
      await useBoosterBadgeStore.getState().fetchBadges();
      return true;
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
      if (msg === 'you have already voted') {
        await useBoosterBadgeStore.getState().fetchBadges();
        return 'already_voted' as const;
      }
      console.error('voteOnMilestone:', error);
      return false;
    }
  },

  getMyVote: async (milestoneId: number) => {
    try {
      const res = await api.get(`/investments/milestones/${milestoneId}/my-vote`);
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },
}));
