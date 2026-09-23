import { create } from 'zustand';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateInvestmentData {
  project_id: number;
  amount: number;
}

export interface InvestmentData {
  investment_id: number;
  reference_number: string;
  qr_code_image_url: string;
  qr_code_base64?: string;
  expires_at: string;
  total_amount: number;
  title: string;
}

export interface InvestmentStatusResponse {
  data?: {
    investment?: {
      id: number;
      status: string;
      amount?: number;
      total_amount?: number;
      reference_number?: string;
      project?: { title?: string };
    };
    transaction?: {
      qr_code_image_url?: string;
      qr_code_base64?: string;
      qr_code_base_64?: string;
      expires_at?: string;
    };
    status?: string;
  };
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface InvestmentStoreState {
  isSubmitting: boolean;
  investmentData: InvestmentData | null;

  createInvestment: (data: CreateInvestmentData) => Promise<boolean>;
  getInvestmentById: (id: number) => Promise<InvestmentStatusResponse>;
  getContractHtml: (id: number) => Promise<string>;
  resumeInvestment: (id: number) => Promise<InvestmentData | null>;
  clearInvestmentData: () => void;
}

// ─── Store Implementation ────────────────────────────────────────────────────

export const useInvestmentStore = create<InvestmentStoreState>((set) => ({
  isSubmitting: false,
  investmentData: null,

  createInvestment: async (data: CreateInvestmentData) => {
    set({ isSubmitting: true });
    try {
      const response = await api.post('/investments', data);
      const resData = response.data?.data;
      set({ isSubmitting: false, investmentData: resData });
      return true;
    } catch (error: unknown) {
      set({ isSubmitting: false });
      console.error('Error creating investment:', error);
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'เกิดข้อผิดพลาดในการสร้างรายการลงทุน');
      return false;
    }
  },

  getInvestmentById: async (id: number): Promise<InvestmentStatusResponse> => {
    try {
      const response = await api.get(`/investments/${id}`);
      return response.data as InvestmentStatusResponse;
    } catch (error) {
      console.error(`Error fetching investment ${id}:`, error);
      throw error;
    }
  },

  getContractHtml: async (id: number) => {
    const response = await api.get<string>(`/investments/${id}/contract`, { responseType: 'text' });
    return response.data;
  },

  resumeInvestment: async (id: number) => {
    try {
      const response = await api.get(`/investments/${id}`);
      const investment = response.data?.data?.investment;
      const transaction = response.data?.data?.transaction;
      if (!investment || !transaction || investment.status !== 'pending_payment') return null;

      const restored: InvestmentData = {
        investment_id: investment.id,
        reference_number: investment.reference_number ?? `INV-${investment.id}`,
        qr_code_image_url: transaction.qr_code_image_url ?? '',
        qr_code_base64: transaction.qr_code_base64 ?? transaction.qr_code_base_64,
        expires_at: transaction.expires_at ?? '',
        total_amount: investment.total_amount ?? investment.amount ?? 0,
        title: investment.project?.title ?? '',
      };
      set({ investmentData: restored });
      return restored;
    } catch (error) {
      console.error(`Error resuming investment ${id}:`, error);
      return null;
    }
  },

  clearInvestmentData: () => {
    set({ investmentData: null });
  },
}));
