import { create } from 'zustand'
import api from '../services/api'
import { MEETING_ELIGIBLE_MILESTONE_STATUS, MEETING_ELIGIBLE_PROJECT_STATES } from '../components/pioneer/meeting/types'

export interface PioneerBadgeCounts {
    active_milestones: number
    upcoming_meetings: number
    pending_payouts: number
}

interface PioneerBadgeStore {
    counts: PioneerBadgeCounts
    fetchBadges: () => Promise<void>
}

const empty: PioneerBadgeCounts = {
    active_milestones: 0,
    upcoming_meetings: 0,
    pending_payouts: 0,
}

export const usePioneerBadgeStore = create<PioneerBadgeStore>((set) => ({
    counts: empty,
    fetchBadges: async () => {
        try {
            const [badgeRes, projectsRes] = await Promise.all([
                api.get('/pioneer/badges'),
                api.get('/pioneer/projects'),
            ])
            const projects: { id: number; state: string }[] = projectsRes.data?.data ?? []
            const eligibleProjects = projects.filter((project) =>
                MEETING_ELIGIBLE_PROJECT_STATES.includes(project.state)
            )
            const actionableCounts = await Promise.all(
                eligibleProjects.map(async (project) => {
                    const [milestonesRes, meetingsRes] = await Promise.all([
                        api.get(`/projects/${project.id}/milestones`),
                        api.get(`/me/projects/${project.id}/meetings`, { params: { filter: 'all' } }),
                    ])
                    const milestones: { id: number; status?: string; voting_open?: boolean }[] = milestonesRes.data?.data ?? []
                    const meetings: { milestone_id: number; status?: string; date: string; time: string }[] = meetingsRes.data?.data ?? []
                    const scheduledMilestoneIds = new Set(
                        meetings
                            .filter((meeting) => meeting.status === 'open')
                            .map((meeting) => meeting.milestone_id)
                    )
                    const now = new Date()
                    const passedMeetingMilestoneIds = new Set(
                        meetings
                            .filter((meeting) => {
                                if (meeting.status === 'cancelled') return false
                                const date = new Date(meeting.date)
                                const time = new Date(meeting.time)
                                if (Number.isNaN(date.getTime()) || Number.isNaN(time.getTime())) return false
                                return new Date(
                                    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
                                    time.getUTCHours(), time.getUTCMinutes(),
                                ) <= now
                            })
                            .map((meeting) => meeting.milestone_id)
                    )

                    return {
                        schedulable: milestones.filter((milestone) =>
                            milestone.status === MEETING_ELIGIBLE_MILESTONE_STATUS &&
                            !scheduledMilestoneIds.has(milestone.id)
                        ).length,
                        voteReady: milestones.filter((milestone) =>
                            milestone.status === MEETING_ELIGIBLE_MILESTONE_STATUS &&
                            milestone.voting_open !== true &&
                            passedMeetingMilestoneIds.has(milestone.id)
                        ).length,
                    }
                })
            )
            const counts = badgeRes.data?.data ?? empty
            set({
                counts: {
                    ...counts,
                    active_milestones: actionableCounts.reduce((total, count) => total + count.voteReady, 0),
                    upcoming_meetings: actionableCounts.reduce((total, count) => total + count.schedulable, 0),
                },
            })
        } catch {
            // ignore
        }
    },
}))
