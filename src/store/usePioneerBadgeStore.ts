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
            const schedulableCounts = await Promise.all(
                eligibleProjects.map(async (project) => {
                    const [milestonesRes, meetingsRes] = await Promise.all([
                        api.get(`/projects/${project.id}/milestones`),
                        api.get(`/me/projects/${project.id}/meetings`, { params: { filter: 'all' } }),
                    ])
                    const milestones: { id: number; status?: string }[] = milestonesRes.data?.data ?? []
                    const meetings: { milestone_id: number; status?: string }[] = meetingsRes.data?.data ?? []
                    const scheduledMilestoneIds = new Set(
                        meetings
                            .filter((meeting) => meeting.status !== 'cancelled')
                            .map((meeting) => meeting.milestone_id)
                    )

                    return milestones.filter((milestone) =>
                        milestone.status === MEETING_ELIGIBLE_MILESTONE_STATUS &&
                        !scheduledMilestoneIds.has(milestone.id)
                    ).length
                })
            )
            const counts = badgeRes.data?.data ?? empty
            set({
                counts: {
                    ...counts,
                    upcoming_meetings: schedulableCounts.reduce((total, count) => total + count, 0),
                },
            })
        } catch {
            // ignore
        }
    },
}))
