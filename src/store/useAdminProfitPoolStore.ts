import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import api from '../services/api'
import { useAdminBadgeStore } from './useAdminBadgeStore'

export interface BankAccount {
  bank_name: string
  account_name: string
  account_number: string
}

export interface InvestorPayoutDetail {
  id: number
  booster_user_id: number
  first_name: string
  last_name: string
  email: string
  principal_amount: number
  amount: number
  share_pct: number
  status: 'pending' | 'confirmed'
  transfer_ref: string
  admin_note: string
  confirmed_at?: string
  bank_account?: BankAccount
}

export interface ProfitPoolDetail {
  id: number
  project_id: number
  project_title: string
  pioneer_user_id: number
  pioneer_name: string
  total_amount: number
  transfer_ref: string
  slip_image?: string
  status: 'pending' | 'completed'
  admin_note: string
  quarter_no: number
  created_at: string
  payouts: InvestorPayoutDetail[]
}

export interface ProfitPoolListItem {
  id: number
  project_id: number
  project_title: string
  pioneer_name: string
  total_amount: number
  status: 'pending' | 'completed'
  investor_count: number
  confirmed_count: number
  quarter_no: number
  created_at: string
}

interface AdminProfitPoolStore {
  pools: ProfitPoolListItem[]
  detail: ProfitPoolDetail | null
  isLoading: boolean
  isCreating: boolean
  isConfirming: boolean
  fetchPools: () => Promise<void>
  fetchDetail: (id: number) => Promise<void>
  createPool: (projectId: number, totalAmount: number, transferRef: string, adminNote: string, quarterNo?: number) => Promise<boolean>
  confirmPayout: (poolId: number, payoutId: number, transferRef: string, note: string) => Promise<boolean>
}

export const useAdminProfitPoolStore = create<AdminProfitPoolStore>((set) => ({
  pools: [],
  detail: null,
  isLoading: false,
  isCreating: false,
  isConfirming: false,

  fetchPools: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get('/admin/profit-pools')
      set({ pools: res.data?.data ?? [] })
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      set({ isLoading: false })
    }
  },

  fetchDetail: async (id) => {
    set({ isLoading: true })
    try {
      const res = await api.get(`/admin/profit-pools/${id}`)
      set({ detail: res.data?.data ?? null })
    } catch {
      toast.error('โหลดรายละเอียดไม่สำเร็จ')
    } finally {
      set({ isLoading: false })
    }
  },

  createPool: async (projectId, totalAmount, transferRef, adminNote, quarterNo = 0) => {
    set({ isCreating: true })
    try {
      await api.post('/admin/profit-pools', {
        project_id: projectId,
        total_amount: totalAmount,
        transfer_ref: transferRef,
        admin_note: adminNote,
        quarter_no: quarterNo,
      })
      toast.success('สร้างรายการกำไรสำเร็จ')
      return true
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'สร้างรายการไม่สำเร็จ'
      toast.error(msg)
      return false
    } finally {
      set({ isCreating: false })
    }
  },

  confirmPayout: async (poolId, payoutId, transferRef, note) => {
    set({ isConfirming: true })
    try {
      await api.patch(`/admin/profit-pools/${poolId}/payouts/${payoutId}/confirm`, {
        transfer_ref: transferRef,
        note,
      })
      toast.success('ยืนยันการโอนกำไรสำเร็จ')
      set((state) => {
        const updatedPayouts = (state.detail?.payouts ?? []).map((p) =>
          p.id === payoutId
            ? { ...p, status: 'confirmed' as const, transfer_ref: transferRef, admin_note: note, confirmed_at: new Date().toISOString() }
            : p
        )
        const allConfirmed = updatedPayouts.length > 0 && updatedPayouts.every(p => p.status === 'confirmed')
        const confirmedCount = updatedPayouts.filter(p => p.status === 'confirmed').length
        return {
          detail: state.detail ? {
            ...state.detail,
            payouts: updatedPayouts,
            status: allConfirmed ? 'completed' : state.detail.status,
          } : null,
          pools: state.pools.map(pool =>
            pool.id === poolId
              ? { ...pool, confirmed_count: confirmedCount, status: allConfirmed ? 'completed' as const : pool.status }
              : pool
          ),
        }
      })
      // refresh sidebar badge ทันที
      useAdminBadgeStore.getState().fetchBadges()
      return true
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'ยืนยันการโอนไม่สำเร็จ'
      toast.error(msg)
      return false
    } finally {
      set({ isConfirming: false })
    }
  },
}))
