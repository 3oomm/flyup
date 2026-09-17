import { create } from 'zustand'
import api from '../services/api'

export interface AdminBadgeCounts {
    pending_projects: number
    submitted_milestones: number
    pending_cancel_requests: number
    open_complaints: number
    pending_refunds: number
    pending_verifications: number
    pending_disbursements: number
    pending_profit_pools: number
    pending_edit_requests: number
}

interface AdminBadgeStore {
    counts: AdminBadgeCounts
    fetchBadges: () => Promise<void>
}

const empty: AdminBadgeCounts = {
    pending_projects: 0,
    submitted_milestones: 0,
    pending_cancel_requests: 0,
    open_complaints: 0,
    pending_refunds: 0,
    pending_verifications: 0,
    pending_disbursements: 0,
    pending_profit_pools: 0,
    pending_edit_requests: 0,
}

export const useAdminBadgeStore = create<AdminBadgeStore>((set, get) => ({
    counts: empty,
    fetchBadges: async () => {
        const [badgeResult, editRequestResult] = await Promise.allSettled([
                api.get('/admin/badges'),
                api.get('/admin/projects/pending-edit-review'),
        ])

        const previous = get().counts
        const badgeCounts = badgeResult.status === 'fulfilled'
            ? badgeResult.value.data?.data ?? {}
            : {}
        const editRequests = editRequestResult.status === 'fulfilled'
            ? editRequestResult.value.data?.data ?? []
            : null

        set({
            counts: {
                ...previous,
                ...badgeCounts,
                pending_edit_requests: Array.isArray(editRequests)
                    ? editRequests.length
                    : previous.pending_edit_requests,
            },
        })
    },
}))
