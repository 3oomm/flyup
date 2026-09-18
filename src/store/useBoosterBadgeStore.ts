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

export const useBoosterBadgeStore = create<BoosterBadgeStore>((set) => ({
    counts: empty,
    fetchBadges: async () => {
        try {
            const [badgeRes, meetingsRes] = await Promise.all([
                api.get('/booster/badges'),
                api.get('/me/investor-meetings'),
            ])
            const meetings: { date: string; time: string; status: string }[] = meetingsRes.data?.data ?? []
            const now = new Date()
            const upcomingMeetings = meetings.filter((meeting) => {
                if (meeting.status !== 'open') return false
                const date = new Date(meeting.date)
                const time = new Date(meeting.time)
                if (Number.isNaN(date.getTime()) || Number.isNaN(time.getTime())) return false
                const startsAt = new Date(
                    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
                    time.getUTCHours(), time.getUTCMinutes(),
                )
                return startsAt > now
            }).length
            const counts = badgeRes.data?.data ?? empty
            set({ counts: { ...counts, upcoming_meetings: upcomingMeetings } })
        } catch {
            // ignore
        }
    },
}))
