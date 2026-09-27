type MilestonePhase = {
  phase_no: number
  sort_order: number
  status: string
}

const CURRENT_MILESTONE_STATUSES = new Set(['active', 'submitted', 'rejected', 'failed'])
const FINISHED_MILESTONE_STATUSES = new Set(['paid', 'approved', 'cancelled'])

export const getCurrentProjectPhase = (milestones: MilestonePhase[] | undefined): number | null => {
  const orderedMilestones = [...(milestones ?? [])].sort((a, b) =>
    (a.sort_order - b.sort_order) || (a.phase_no - b.phase_no)
  )

  const currentMilestone = orderedMilestones.find(milestone =>
    CURRENT_MILESTONE_STATUSES.has(milestone.status)
  ) ?? orderedMilestones.find(milestone =>
    !FINISHED_MILESTONE_STATUSES.has(milestone.status)
  )

  if (!currentMilestone) return null
  return currentMilestone.phase_no || orderedMilestones.indexOf(currentMilestone) + 1
}
