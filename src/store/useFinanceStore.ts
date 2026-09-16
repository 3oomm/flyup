import { create } from 'zustand'
import toast from 'react-hot-toast'
import api from '../services/api'

export interface FinancialSummary {
  stripe: { available: number; pending: number }
  disbursement: { total_confirmed: number; total_pending: number; count_confirmed: number; count_pending: number }
  refund: { total_pending: number; total_refunded: number; count_pending: number; count_refunded: number }
  platform: { total_fees: number; total_revenue: number }
}

export interface PhaseFinancial {
  phase_no: number
  title: string
  percent_release: number
  amount: number
  status: 'pending' | 'confirmed' | 'not_started'
  confirmed_at: string | null
}

export interface ProjectFinancial {
  project_id: number
  project_title: string
  state: string
  funding_goal: number
  current_funding: number
  phases: PhaseFinancial[]
}

interface FinanceStore {
  summary: FinancialSummary | null
  projects: ProjectFinancial[]
  isLoadingSummary: boolean
  isLoadingProjects: boolean
  fetchSummary: () => Promise<void>
  fetchProjects: () => Promise<void>
}

export const useFinanceStore = create<FinanceStore>((set) => ({
  summary: null,
  projects: [],
  isLoadingSummary: false,
  isLoadingProjects: false,

  fetchSummary: async () => {
    set({ isLoadingSummary: true })
    try {
      const res = await api.get('/admin/financial/summary')
      set({ summary: res.data?.data ?? null })
    } catch {
      toast.error('โหลดข้อมูลสรุปการเงินไม่สำเร็จ')
    } finally {
      set({ isLoadingSummary: false })
    }
  },

  fetchProjects: async () => {
    set({ isLoadingProjects: true })
    try {
      const res = await api.get('/admin/financial/projects')
      set({ projects: res.data?.data ?? [] })
    } catch {
      toast.error('โหลดข้อมูลการเงินของโปรเจกต์ไม่สำเร็จ')
    } finally {
      set({ isLoadingProjects: false })
    }
  },
}))
