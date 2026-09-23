import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { useMilestoneStore, type MeetingBrief } from '../../store/useMilestoneStore'
import { usePioneerPayoutStore } from '../../store/usePioneerPayoutStore'
import PhaseCard from '../../components/pioneer/milestone/PhaseCard'
import type { EvidenceLink } from '../../components/pioneer/milestone/types'

const MilestonePage = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const { milestones, projectTitle, projectSuspended, isLoading, isSubmitting, isOpeningVoting, fetchMilestones, fetchProjectMeetings, submitEvidence, recallEvidence, openVoting } =
    useMilestoneStore()
  // สถานะการโอนเงินจริง (แยกจาก milestone.status='completed' ที่แปลว่าแค่ "อนุมัติแล้ว" ไม่ได้แปลว่าเงินโอนแล้ว)
  const { payouts, fetchPayouts } = usePioneerPayoutStore()

  const [activePhase, setActivePhase] = useState<number | null>(null)
  const [meetingsByMilestone, setMeetingsByMilestone] = useState<Record<number, MeetingBrief[]>>({})

  useEffect(() => {
    if (!projectId) return
    fetchMilestones(projectId).then(firstActive => {
      if (firstActive !== null) setActivePhase(firstActive)
    })
    // ดึง meetings ของ project นี้ เพื่อเช็คว่า milestone ไหนนัดแล้ว
    fetchProjectMeetings(projectId).then(meetings => {
      const byMilestone: Record<number, MeetingBrief[]> = {}
      meetings.forEach(m => {
        if (!byMilestone[m.milestone_id]) byMilestone[m.milestone_id] = []
        byMilestone[m.milestone_id].push(m)
      })
      setMeetingsByMilestone(byMilestone)
    })
    fetchPayouts()
  }, [projectId, fetchMilestones, fetchProjectMeetings, fetchPayouts])

  // สถานะโอนเงินจริงของแต่ละ milestone ใน "โปรเจกต์นี้" เท่านั้น (payouts มีของทุกโปรเจกต์ปน)
  const payoutStatusByMilestoneId = useMemo(() => {
    const map: Record<number, 'pending' | 'confirmed'> = {}
    payouts
      .filter(p => String(p.project_id) === String(projectId))
      .forEach(p => { map[p.milestone_id] = p.status })
    return map
  }, [payouts, projectId])

  const handleSubmit = async (
    milestoneId: number,
    summary: string,
    files: File[],
    links: EvidenceLink[],
    checkedCriteria: string[]
  ) => {
    const ok = await submitEvidence(milestoneId, projectId!, summary, files, links, checkedCriteria)
    if (ok) setActivePhase(null)
  }

  const handleRecall = async (milestoneId: number) => {
    await recallEvidence(milestoneId)
  }

  const handleOpenVoting = async (milestoneId: number) => {
    await openVoting(milestoneId, projectId!)
  }

  const completedCount = milestones.filter(m => m.status === 'completed').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[24px] pb-[40px]">

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-[6px] text-[14px] text-muted-foreground hover:text-foreground transition-colors w-fit cursor-pointer"
      >
        <ChevronLeft size={16} />
        กลับ
      </button>

      <div>
        <h1 className="text-[22px] font-bold text-foreground">จัดการ Milestone</h1>
        <p className="text-[13px] text-muted-foreground mt-[2px]">
          {projectTitle
            ? `โปรเจกต์ ${projectTitle} — ติดตามและส่งหลักฐานการดำเนินงาน`
            : 'ติดตามและส่งหลักฐานการดำเนินงาน'}
        </p>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-[16px] border border-border p-[20px] shadow-sm">
        <div className="flex items-center justify-between mb-[10px]">
          <span className="text-[13px] font-medium text-foreground">ความคืบหน้ารวม</span>
          <span className="text-[13px] font-semibold text-primary">{completedCount}/{milestones.length} สำเร็จ</span>
        </div>
        <div className="h-[8px] rounded-full bg-surface-hover overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Phase cards */}
      <div className="flex flex-col gap-[16px]">
        {milestones.map((m, idx) => {
          const prevMilestone = idx > 0 ? milestones[idx - 1] : null
          // เริ่ม Phase นี้ไม่ได้ ถ้า Phase ก่อนหน้ายังไม่ได้รับการยืนยันโอนเงินจาก Admin (backend บังคับไว้)
          const blockedByPrevPayment = !!prevMilestone &&
            (!prevMilestone.id || payoutStatusByMilestoneId[prevMilestone.id] !== 'confirmed')
          return (
            <PhaseCard
              key={m.phase_no}
              milestone={{ ...m, meetings: m.id ? (meetingsByMilestone[m.id] ?? m.meetings ?? []) : (m.meetings ?? []) }}
              isActive={activePhase === idx}
              projectSuspended={projectSuspended}
              payoutStatus={m.id ? payoutStatusByMilestoneId[m.id] : undefined}
              blockedByPrevPayment={blockedByPrevPayment}
              onToggle={() => setActivePhase(prev => prev === idx ? null : idx)}
              onSubmit={handleSubmit}
              onRecall={handleRecall}
              onOpenVoting={handleOpenVoting}
              isSubmitting={isSubmitting}
              isOpeningVoting={isOpeningVoting}
            />
          )
        })}
      </div>
    </div>
  )
}

export default MilestonePage
