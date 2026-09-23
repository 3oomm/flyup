import { create } from 'zustand'
import api from '../services/api'

export interface AdminLogAdmin {
    id: number
    first_name: string
    last_name: string
    email: string
}

export interface AdminLogItem {
    id: number
    admin_id: number
    admin?: AdminLogAdmin
    action: string
    target_type: string
    target_id?: number
    note?: string
    created_at: string
}

export interface AdminLogMeta {
    total: number
    page: number
    page_size: number
}

export interface AdminLogFilter {
    page: number
    page_size: number
    admin_id?: number
    action?: string
    target_type?: string
    from?: string
    to?: string
}

interface AdminLogStore {
    logs: AdminLogItem[]
    meta: AdminLogMeta
    isLoading: boolean
    filter: AdminLogFilter
    setFilter: (f: Partial<AdminLogFilter>) => void
    fetchLogs: () => Promise<void>
    fetchChartLogs: (from: string, to: string) => Promise<AdminLogItem[]>
}

const DEFAULT_FILTER: AdminLogFilter = { page: 1, page_size: 20 }

export const useAdminLogStore = create<AdminLogStore>((set, get) => ({
    logs: [],
    meta: { total: 0, page: 1, page_size: 20 },
    isLoading: false,
    filter: DEFAULT_FILTER,

    setFilter: (f) => {
        set(s => ({ filter: { ...s.filter, ...f, page: f.page ?? 1 } }))
    },

    fetchChartLogs: async (from, to) => {
        const pageSize = 100 // The API caps page_size at 100.
        const all: AdminLogItem[] = []
        for (let page = 1; page <= 100; page++) {
            const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), from, to })
            const res = await api.get(`/admin/logs?${params.toString()}`)
            const data: AdminLogItem[] = res.data?.data ?? []
            all.push(...data)
            const total: number = res.data?.meta?.total ?? all.length
            if (data.length === 0 || all.length >= total) break
        }
        return all
    },

    fetchLogs: async () => {
        set({ isLoading: true })
        const { filter } = get()
        const params = new URLSearchParams()
        params.set('page', String(filter.page))
        params.set('page_size', String(filter.page_size))
        if (filter.admin_id) params.set('admin_id', String(filter.admin_id))
        if (filter.action) params.set('action', filter.action)
        if (filter.target_type) params.set('target_type', filter.target_type)
        if (filter.from) params.set('from', filter.from)
        if (filter.to) params.set('to', filter.to)
        try {
            const res = await api.get(`/admin/logs?${params.toString()}`)
            set({
                logs: res.data?.data ?? [],
                meta: res.data?.meta ?? { total: 0, page: 1, page_size: 20 },
            })
        } catch {
            set({ logs: [], meta: { total: 0, page: 1, page_size: 20 } })
        } finally {
            set({ isLoading: false })
        }
    },
}))
