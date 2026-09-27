import { create } from 'zustand'
import api from '../services/api'

export interface BoosterBadgeCounts {
    pending_votes: number
    upcoming_meetings: number
    pending_refunds: number
    open_complaints: number
}

interface BoosterBadgeStore {
    counts: BoosterBadgeCounts
    fetchBadges: () => Promise<void>
}

const empty: BoosterBadgeCounts = {
    pending_votes: 0,
    upcoming_meetings: 0,
    pending_refunds: 0,
    open_complaints: 0,
}

let fetchInFlight: Promise<void> | null = null

export const useBoosterBadgeStore = create<BoosterBadgeStore>((set) => ({
    counts: empty,
    fetchBadges: async () => {
        if (fetchInFlight) return fetchInFlight

        fetchInFlight = (async () => {
            try {
                const [badgeRes, meetingsRes] = await Promise.all([
                    api.get('/booster/badges'),
                    api.get('/me/investor-meetings'),
                ])
                const meetings: { status: string }[] = meetingsRes.data?.data ?? []
                const upcomingMeetings = meetings.filter((meeting) => meeting.status === 'open').length
                const counts = badgeRes.data?.data ?? empty
                set({ counts: { ...counts, upcoming_meetings: upcomingMeetings } })
            } catch {
                // The auth interceptor retries expired sessions automatically.
            } finally {
                fetchInFlight = null
            }
        })()

        return fetchInFlight
    },
}))
