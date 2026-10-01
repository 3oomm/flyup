import { create } from 'zustand'
import toast from 'react-hot-toast'
import api from '../services/api'

export interface PioneerProfitItem {
    id: number
    project_id: number
    project_title: string
    total_amount: number
    transfer_ref: string
    status: 'pending' | 'completed'
    quarter_no: number
    investor_count: number
    confirmed_count: number
    created_at: string
}

export interface PioneerProjectBrief {
    id: number
    title: string
    state: string
}

interface PioneerProfitStore {
    pools: PioneerProfitItem[]
    isLoading: boolean
    isSubmitting: boolean
    fetchPools: () => Promise<void>
    submitProfit: (projectId: number, quarterNo: number, totalAmount: number, transferRef: string, slipImage?: string) => Promise<boolean>
    fetchPioneerProjects: () => Promise<PioneerProjectBrief[]>
    uploadFile: (file: File) => Promise<{ url: string; type?: string } | null>
}

export const usePioneerProfitStore = create<PioneerProfitStore>((set) => ({
    pools: [],
    isLoading: false,
    isSubmitting: false,

    fetchPools: async () => {
        set({ isLoading: true })
        try {
            const res = await api.get('/pioneer/profit-pools')
            set({ pools: res.data?.data ?? [] })
        } catch {
            toast.error('โหลดข้อมูลไม่สำเร็จ')
        } finally {
            set({ isLoading: false })
        }
    },

    submitProfit: async (projectId, quarterNo, totalAmount, transferRef, slipImage) => {
        set({ isSubmitting: true })
        try {
            await api.post(`/pioneer/profit-pools/${projectId}`, {
                quarter_no: quarterNo,
                total_amount: totalAmount,
                transfer_ref: transferRef,
                slip_image: slipImage ?? '',
            })
            toast.success(`แจ้งโอนกำไรไตรมาส ${quarterNo} เรียบร้อยแล้ว`)
            return true
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'เกิดข้อผิดพลาด')
            return false
        } finally {
            set({ isSubmitting: false })
        }
    },

    fetchPioneerProjects: async () => {
        try {
            const res = await api.get('/pioneer/projects')
            return res.data?.data ?? []
        } catch {
            return []
        }
    },

    uploadFile: async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        const res = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        const { url, type } = res.data?.data ?? {}
        return url ? { url, type } : null
    },
}))
