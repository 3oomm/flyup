import { create } from 'zustand'
import api from '../services/api'
import toast from 'react-hot-toast'

export interface RefundRequest {
    investment_id: number
    reference_number: string
    booster_user_id: number
    booster_name: string
    booster_email: string
    project_title: string
    refund_amount: number
    total_paid: number
    status: string
    requested_at: string
    bank_account?: { bank_name: string; account_name: string; account_number: string }
}

interface RefundStore {
    refunds: RefundRequest[]
    isLoading: boolean
    fetchRefunds: () => Promise<void>
    approveRefund: (id: number) => Promise<void>
}

export const useRefundStore = create<RefundStore>((set) => ({
    refunds: [],
    isLoading: false,

    fetchRefunds: async () => {
        set({ isLoading: true })
        try {
            const res = await api.get('/admin/investments/refund-requests')
            set({ refunds: res.data.data ?? [] })
        } catch {
            toast.error('โหลดข้อมูลไม่สำเร็จ')
        } finally {
            set({ isLoading: false })
        }
    },

    approveRefund: async (id) => {
        await api.patch(`/admin/investments/${id}/approve-refund`)
        toast.success('อนุมัติการคืนเงินสำเร็จ')
        set((state) => ({
            refunds: state.refunds.filter((r) => r.investment_id !== id),
        }))
    },
}))
