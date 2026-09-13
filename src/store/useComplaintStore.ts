import { create } from 'zustand'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import api from '../services/api'

export type ComplaintStatus = 'open' | 'resolved' | 'rejected'

export interface Complaint {
    id: number
    complainant_id: number
    project_id: number
    subject: string
    body: string
    evidence?: string
    status: ComplaintStatus
    admin_note: string
    resolved_at?: string | null
    created_at: string
    total_reports: number
    resolved_reports: number
    complainant?: {
        id: number
        first_name: string
        last_name: string
        email: string
    } | null
    project?: {
        id: number
        title: string
        state: string
    } | null
}

export const COMPLAINT_THRESHOLD = 3

interface ComplaintStore {
    complaints: Complaint[]
    selected: Complaint | null
    isLoading: boolean
    isSubmitting: boolean

    // user-side
    fileComplaint: (projectId: number, subject: string, body: string, evidence?: string) => Promise<boolean>
    fetchMyComplaints: () => Promise<void>

    // admin-side
    fetchAdminList: (status?: ComplaintStatus | 'all') => Promise<void>
    fetchAdminDetail: (id: number) => Promise<void>
    resolveComplaint: (id: number, adminNote: string) => Promise<boolean>
    rejectComplaint: (id: number, adminNote: string) => Promise<boolean>
    clearSelected: () => void
}

export const useComplaintStore = create<ComplaintStore>((set, get) => ({
    complaints: [],
    selected: null,
    isLoading: false,
    isSubmitting: false,

    fileComplaint: async (projectId, subject, body, evidence) => {
        set({ isSubmitting: true })
        try {
            // evidence เป็น optional — backend รับเป็น URL เท่านั้น (validate:"omitempty,url") จึงส่งไปเฉพาะตอนมีค่า
            await api.post('/complaints', { project_id: projectId, subject, body, ...(evidence ? { evidence } : {}) })
            toast.success('ส่งคำร้องเรียนสำเร็จ ทีมงานจะตรวจสอบและติดต่อกลับ')
            return true
        } catch (error) {
            const status = error instanceof AxiosError ? error.response?.status : undefined
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            if (status === 409) {
                toast.error('คุณได้ร้องเรียนโปรเจกต์นี้ไปแล้ว')
            } else if (status === 401) {
                toast.error('กรุณาเข้าสู่ระบบก่อนร้องเรียน')
            } else {
                toast.error(msg || 'ส่งคำร้องเรียนไม่สำเร็จ')
            }
            return false
        } finally {
            set({ isSubmitting: false })
        }
    },

    fetchMyComplaints: async () => {
        set({ isLoading: true })
        try {
            const res = await api.get('/complaints/me')
            set({ complaints: res.data?.data ?? [] })
        } catch {
            toast.error('โหลดข้อมูลคำร้องเรียนไม่สำเร็จ')
            set({ complaints: [] })
        } finally {
            set({ isLoading: false })
        }
    },

    fetchAdminList: async (status) => {
        set({ isLoading: true })
        try {
            const params = status && status !== 'all' ? { status } : undefined
            const res = await api.get('/admin/complaints', { params })
            set({ complaints: res.data?.data ?? [] })
        } catch {
            toast.error('โหลดข้อมูลคำร้องเรียนไม่สำเร็จ')
        } finally {
            set({ isLoading: false })
        }
    },

    fetchAdminDetail: async (id) => {
        set({ isLoading: true })
        try {
            const res = await api.get(`/admin/complaints/${id}`)
            set({ selected: res.data?.data ?? null })
        } catch {
            toast.error('โหลดข้อมูลคำร้องเรียนไม่สำเร็จ')
        } finally {
            set({ isLoading: false })
        }
    },

    resolveComplaint: async (id, adminNote) => {
        set({ isSubmitting: true })
        try {
            await api.patch(`/admin/complaints/${id}/resolve`, { admin_note: adminNote })
            toast.success('ปิดคำร้องเรียนสำเร็จ')
            const updated = get().complaints.map((c) =>
                c.id === id ? { ...c, status: 'resolved' as const, admin_note: adminNote, resolved_at: new Date().toISOString() } : c
            )
            set({ complaints: updated, selected: null })
            return true
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || 'ปิดคำร้องเรียนไม่สำเร็จ')
            return false
        } finally {
            set({ isSubmitting: false })
        }
    },

    rejectComplaint: async (id, adminNote) => {
        set({ isSubmitting: true })
        try {
            await api.patch(`/admin/complaints/${id}/reject`, { admin_note: adminNote })
            toast.success('ปฏิเสธคำร้องเรียนสำเร็จ')
            const updated = get().complaints.map((c) =>
                c.id === id ? { ...c, status: 'rejected' as const, admin_note: adminNote, resolved_at: new Date().toISOString() } : c
            )
            set({ complaints: updated, selected: null })
            return true
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || 'ปฏิเสธคำร้องเรียนไม่สำเร็จ')
            return false
        } finally {
            set({ isSubmitting: false })
        }
    },

    clearSelected: () => set({ selected: null }),
}))
