import { useState, useEffect } from 'react'
import { CheckCircle2, Calendar, Undo2, Vote, Loader2, ChevronUp, ChevronDown, Users } from 'lucide-react'
import { useNavigate } from 'react-router'
import Swal from 'sweetalert2'
import { STATUS_CONFIG, fmtDateRange, fmtBaht } from './types'
import type { MilestoneData, EvidenceLink } from './types'
import EvidenceForm from './EvidenceForm'
import { useMilestoneStore, type VoterItem } from '../../../store/useMilestoneStore'

interface PhaseCardProps {
  milestone: MilestoneData
  isActive: boolean
  projectSuspended: boolean
  payoutStatus?: 'pending' | 'confirmed' // สถานะโอนเงินจริงของ Phase นี้ (ต่างจาก milestone.status='completed' ที่แปลว่าแค่อนุมัติแล้ว)
  blockedByPrevPayment?: boolean // true = เริ่ม Phase นี้ไม่ได้ เพราะ Phase ก่อนหน้ายังไม่ได้รับการยืนยันโอนเงิน
  onToggle: () => void
  onSubmit: (milestoneId: number, summary: string, files: File[], links: EvidenceLink[], checkedCriteria: string[]) => Promise<void>
  onRecall: (milestoneId: number) => Promise<void>
  onOpenVoting: (milestoneId: number) => Promise<void | boolean>
  isSubmitting: boolean
  isOpeningVoting: boolean
}

const PhaseCard = ({ milestone, isActive, projectSuspended, payoutStatus, blockedByPrevPayment, onToggle, onSubmit, onRecall, onOpenVoting, isSubmitting, isOpeningVoting }: PhaseCardProps) => {
  const navigate = useNavigate()
  const fetchMilestoneVoters = useMilestoneStore((s) => s.fetchMilestoneVoters)
  const cfg = STATUS_CONFIG[milestone.status] ?? STATUS_CONFIG['pending']
  const isFailed    = milestone.status === 'failed'
  const isLocked    = projectSuspended || isFailed
  // ยังกดเริ่มไม่ได้ถ้า Phase ก่อนหน้ายังไม่ได้รับเงินจริง แม้สถานะ Phase นี้จะพร้อมแล้วก็ตาม (backend บังคับไว้)
  const paymentBlocked = !!blockedByPrevPayment
  const canSubmit   = !isLocked && !paymentBlocked && (milestone.status === 'in_progress' || milestone.status === 'rejected')
  const isCompleted = milestone.status === 'completed'
  const isApproved  = milestone.status === 'approved' && !isLocked

  const [votersOpen, setVotersOpen] = useState(false)
  const [voters, setVoters] = useState<VoterItem[] | null>(null)

  useEffect(() => {
    if (!milestone.voting_open || !milestone.id) return
    const id = milestone.id
    setTimeout(() => setVoters(null), 0)
    fetchMilestoneVoters(id).then(setVoters)
  }, [milestone.voting_open, milestone.id, milestone.voting_opened_at, fetchMilestoneVoters])

  const now = new Date()

  const getMeetingDatetime = (m: { date: string; time: string }) => {
    try {
      const d = new Date(m.date)
      const t = new Date(m.time)
      // time ถูกเก็บเป็น UTC แต่แทนค่า local time จริงๆ ใช้ local date เพื่อให้ compare กับ now() ถูกต้อง
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), t.getUTCHours(), t.getUTCMinutes())
    } catch { return null }
  }

  // นัดเก่าที่ปิด/ยกเลิกแล้วห้ามนำมาใช้เปิดโหวตรอบใหม่
  const activeMeetings = (milestone.meetings ?? []).filter(m => m.status === 'open')
  const hasMeeting = activeMeetings.length > 0
  const meetingPassed = activeMeetings.some(m => {
    const dt = getMeetingDatetime(m)
    return dt !== null && dt <= now
  })
  const canOpenVoting = hasMeeting && meetingPassed
  const nextMeeting = !meetingPassed && hasMeeting
    ? [...activeMeetings].sort((a, b) => {
        const da = getMeetingDatetime(a)?.getTime() ?? 0
        const db = getMeetingDatetime(b)?.getTime() ?? 0
        return da - db
      })[0]
    : null
  const voteDisabledReason = !hasMeeting
    ? 'กรุณานัดประชุมก่อนเปิด Vote'
    : nextMeeting
    ? `ต้องรอถึงเวลาประชุม ${getMeetingDatetime(nextMeeting)?.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) ?? ''}`
    : ''

  const votedCount = (voters ?? []).filter(v => v.voted).length
  const totalVoters = (voters ?? []).length
  const votePct = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0
  const displayPct = milestone.voting_open && totalVoters > 0 ? votePct : milestone.progress_pct

  const handleEvidenceSubmit = async (
    summary: string,
    files: File[],
    links: EvidenceLink[],
    checkedCriteria: string[]
  ) => {
    if (!milestone.id) return
    await onSubmit(milestone.id, summary, files, links, checkedCriteria)
  }

  return (
    <div className={`rounded-[16px] border-2 bg-white overflow-hidden shadow-sm ${cfg.borderCls}`}>

      {/* ── Header ── */}
      <div className="px-[20px] pt-[18px] pb-[14px] flex items-start gap-[14px]">
        <div className={`shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center font-bold text-[15px] mt-[1px]
          ${isCompleted ? 'bg-[#2BA88E] text-white' : 'bg-primary/10 text-primary'}`}>
          {milestone.phase_no}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-[8px]">
            <span className="font-bold text-[15px] text-foreground">
              Phase {milestone.phase_no}: {milestone.title}
            </span>
            <span className={`shrink-0 text-[11px] font-medium px-[10px] py-[3px] rounded-full whitespace-nowrap ${cfg.badgeCls}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-[3px]">
            {fmtDateRange(milestone.startDate, milestone.endDate, milestone.duration)}
            <span className="ml-[8px] font-medium text-foreground">{fmtBaht(milestone.amount)}</span>
          </p>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="px-[20px]">
        <div className="h-[6px] rounded-full bg-surface-hover overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${milestone.voting_open ? 'bg-amber-400' : cfg.barCls}`}
            style={{ width: `${displayPct}%` }}
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-[20px] py-[12px] flex items-center justify-between">
        <span className={`text-[13px] font-medium ${isCompleted ? 'text-[#2BA88E]' : milestone.voting_open ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {milestone.voting_open && totalVoters > 0
            ? `${votedCount}/${totalVoters} โหวตแล้ว (${votePct}%)`
            : `${milestone.progress_pct}%${isCompleted ? ' สำเร็จ' : milestone.progress_pct > 0 ? ' กำลังดำเนินการ' : ''}`
          }
        </span>

        <div className="flex items-center gap-[8px]">
          {isCompleted && (
            <div className="flex items-center gap-[5px] text-[#2BA88E] text-[13px] font-medium">
              <CheckCircle2 size={16} />
              <span>อนุมัติแล้ว</span>
              {payoutStatus === 'pending' && (
                <span className="ml-[4px] flex items-center gap-[4px] text-amber-600 text-[12px] font-medium">
                  <Loader2 size={12} className="animate-spin" /> รอ Admin ยืนยันโอนเงิน
                </span>
              )}
            </div>
          )}
          {isApproved && (
            <>
              <div className="relative group">
                <button
                  onClick={() => !hasMeeting && navigate('/pioneer/dashboard/meetings')}
                  disabled={hasMeeting}
                  className={`flex items-center gap-[6px] px-[14px] py-[7px] rounded-[10px] border text-[13px] font-medium transition-colors ${
                    hasMeeting
                      ? 'border-border text-muted-foreground bg-surface-soft cursor-not-allowed opacity-60'
                      : 'border-border text-foreground hover:bg-surface-soft cursor-pointer'
                  }`}
                >
                  <Calendar size={14} className="text-muted-foreground" />
                  {hasMeeting ? 'นัดแล้ว' : 'นัดประชุม'}
                </button>
                {hasMeeting && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap bg-gray-800 text-white text-[11px] px-2 py-1 rounded-[6px] pointer-events-none">
                    มีนัดประชุมอยู่แล้ว ยกเลิกนัดก่อนจึงจะนัดใหม่ได้
                  </div>
                )}
              </div>
              {milestone.voting_open ? (
                <button
                  onClick={() => setVotersOpen(v => !v)}
                  className="flex items-center gap-[6px] px-[14px] py-[7px] rounded-[10px] bg-amber-50 border border-amber-200 text-[13px] font-medium text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <Vote size={14} />
                  กำลัง Vote อยู่...
                  {voters === null
                    ? <Loader2 size={12} className="animate-spin ml-1" />
                    : <ChevronDown size={12} className={`ml-1 transition-transform ${votersOpen ? 'rotate-180' : ''}`} />
                  }
                </button>
              ) : (
                <div className="relative group">
                  <button
                    onClick={() => canOpenVoting && milestone.id && onOpenVoting(milestone.id)}
                    disabled={isOpeningVoting || !canOpenVoting}
                    className="flex items-center gap-[6px] px-[14px] py-[7px] rounded-[10px] bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isOpeningVoting ? <Loader2 size={14} className="animate-spin" /> : <Vote size={14} />}
                    เปิด Vote
                  </button>
                  {!canOpenVoting && voteDisabledReason && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap bg-gray-800 text-white text-[11px] px-2 py-1 rounded-[6px] pointer-events-none">
                      {voteDisabledReason}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {milestone.status === 'submitted' && (
            <>
              <span className="text-[12px] text-muted-foreground">รอ Admin ตรวจสอบ...</span>
              <button
                onClick={async () => {
                  if (!milestone.id) return
                  const result = await Swal.fire({
                    title: 'ยืนยันการยกเลิกการส่ง?',
                    text: 'หลักฐานที่ส่งไปจะถูกยกเลิก และ Milestone จะกลับสู่สถานะกำลังดำเนินการ',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'ยืนยัน ยกเลิกการส่ง',
                    cancelButtonText: 'ไม่ยกเลิก',
                    confirmButtonColor: '#DC2626',
                    cancelButtonColor: '#6B7280',
                    reverseButtons: true,
                  })
                  if (result.isConfirmed) onRecall(milestone.id)
                }}
                className="flex items-center gap-[6px] px-[14px] py-[7px] rounded-[10px] border border-red-200 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Undo2 size={14} />
                ยกเลิกการส่ง
              </button>
            </>
          )}
          {canSubmit && (
            <button
              onClick={onToggle}
              className="flex items-center gap-[6px] px-[14px] py-[7px] rounded-[10px] bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            >
              {isActive ? <ChevronUp size={16} /> : 'จัดการ'}
            </button>
          )}
          {!isLocked && paymentBlocked && (milestone.status === 'in_progress' || milestone.status === 'rejected') && (
            <div className="relative group">
              <button
                disabled
                className="flex items-center gap-[6px] px-[14px] py-[7px] rounded-[10px] border border-border text-muted-foreground bg-surface-soft text-[13px] font-medium cursor-not-allowed opacity-60"
              >
                จัดการ
              </button>
              <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block z-10 whitespace-nowrap bg-gray-800 text-white text-[11px] px-2 py-1 rounded-[6px] pointer-events-none">
                รอ Admin ยืนยันการโอนเงิน Phase ก่อนหน้าก่อน จึงจะเริ่ม Phase นี้ได้
              </div>
            </div>
          )}
          {milestone.status === 'pending' && (
            <span className="text-[12px] text-muted-foreground">รอดำเนินการ</span>
          )}
        </div>
      </div>

      {/* ── Voter list panel ── */}
      {milestone.voting_open && votersOpen && (
        <div className="mx-[20px] mb-[12px] border border-amber-200 rounded-[12px] overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-800">
              <Users size={14} />
              รายชื่อผู้โหวต
            </div>
            <span className="text-[12px] font-medium text-amber-700">
              {(voters ?? []).filter(v => v.voted).length}/{(voters ?? []).length} โหวตแล้ว
            </span>
          </div>
          {/* list */}
          {(voters ?? []).length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">ไม่มีผู้ลงทุน</p>
          ) : (
            <ul className="divide-y divide-amber-100 bg-white">
              {(voters ?? []).map(v => (
                <li key={v.user_id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {v.picture ? (
                      <img src={v.picture} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                        {v.first_name?.[0]}{v.last_name?.[0]}
                      </div>
                    )}
                    <span className="text-[13px] text-foreground truncate">
                      {v.first_name} {v.last_name}
                    </span>
                  </div>
                  {v.voted ? (
                    <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      v.choice === 'approve'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {v.choice === 'approve' ? '✓ ยอมรับ' : '✕ ไม่ยอมรับ'}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                      ยังไม่โหวต
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Suspended / Failed banner ── */}
      {isLocked && (
        <div className="mx-[20px] mb-[12px] p-[14px] rounded-[10px] bg-gray-100 border border-gray-300 text-[13px] text-gray-700 flex items-start gap-[10px]">
          <span className="text-[18px] leading-none">🔒</span>
          <div>
            <p className="font-semibold text-gray-800">โปรเจกต์ถูกระงับ</p>
            <p className="mt-[2px] text-[12px]">Milestone นี้ไม่ผ่านการโหวตในรอบแก้ไข ไม่สามารถดำเนินการใดๆ ในโปรเจกต์นี้ได้อีก</p>
          </div>
        </div>
      )}

      {/* ── Admin rejection note ── */}
      {milestone.status === 'rejected' && milestone.admin_note && (
        <div className="mx-[20px] mb-[12px] p-[12px] rounded-[10px] bg-[#FEF2F2] border border-[#FCA5A5] text-[13px] text-[#DC2626]">
          <span className="font-semibold">หมายเหตุจาก Admin: </span>{milestone.admin_note}
        </div>
      )}

      {/* ── Evidence form (expanded) ── */}
      {isActive && canSubmit && (
        <EvidenceForm
          criteria={milestone.criteria}
          isSubmitting={isSubmitting}
          onCancel={onToggle}
          onSubmit={handleEvidenceSubmit}
        />
      )}
    </div>
  )
}

export default PhaseCard
