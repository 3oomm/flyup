import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import api from '../services/api'
import { addDays } from '../components/pioneer/milestone/types'
import type { MilestoneData, MilestoneStatus, EvidenceLink } from '../components/pioneer/milestone/types'

const PHASE_PERCENTS = [0.15, 0.20, 0.30, 0.35]

// แปลง status จาก backend (draft/waiting/active/submitted/approved/paid/rejected/failed)
// เป็น status ที่ frontend ใช้ใน STATUS_CONFIG
const mapBackendStatus = (s: string | undefined): MilestoneStatus => {
  switch (s) {
    case 'active':            return 'in_progress'
    case 'submitted':         return 'submitted'
    case 'approved':          return 'approved'
    case 'paid':              return 'completed'
    case 'rejected':          return 'rejected'
    case 'failed':            return 'failed'
    case 'draft':
    case 'waiting':
    default:                  return 'pending'
  }
}

export interface VoterItem {
  user_id: number
  first_name: string
  last_name: string
  picture?: string | null
  voted: boolean
  choice: string
}

export interface MeetingBrief {
  id: number
  milestone_id: number
  date: string
  time: string
  status: string
}

export interface ProjectMilestoneRaw {
  id: number
  project_id?: number
  phase_no: number
  title: string
  description?: string | null
  acceptance_criteria?: string | null
  percent_release: number
  status: string
  submission_summary?: string | null
  submission_criteria?: string[]
  submission_attachments?: string[]
  submission_links?: string[]
  submitted_at?: string | null
  voting_open?: boolean
  voting_opened_at?: string | null
  voting_closed_at?: string | null
  due_date?: string | null
}

interface MilestoneStore {
  milestones: MilestoneData[]
  projectTitle: string
  projectSuspended: boolean
  isLoading: boolean
  isSubmitting: boolean
  uploadProgress: { current: number; total: number } | null // บอกความคืบหน้าอัปโหลดไฟล์ทีละไฟล์ตอนส่งหลักฐาน
  fetchMilestones: (projectId: string) => Promise<number | null> // returns index of first active phase
  fetchProjectMilestones: (projectId: number | string) => Promise<ProjectMilestoneRaw[]>
  fetchProjectMeetings: (projectId: number | string) => Promise<MeetingBrief[]>
  fetchMilestoneVoters: (milestoneId: number) => Promise<VoterItem[]>
  submitEvidence: (
    milestoneId: number,
    projectId: string,
    summary: string,
    files: File[],
    links: EvidenceLink[],
    checkedCriteria: string[]
  ) => Promise<boolean>
  recallEvidence: (milestoneId: number) => Promise<boolean>
  isOpeningVoting: boolean
  openVoting: (milestoneId: number, projectId: string) => Promise<boolean>
}

export const useMilestoneStore = create<MilestoneStore>((set) => ({
  milestones: [],
  projectTitle: '',
  projectSuspended: false,
  isLoading: false,
  isSubmitting: false,
  uploadProgress: null,
  isOpeningVoting: false,

  fetchMilestones: async (projectId) => {
    set({ isLoading: true })
    try {
      const [projRes, msRes] = await Promise.all([
        api.get(`/pioneer/projects/${projectId}`),
        api.get(`/projects/${projectId}/milestones`),
      ])

      const proj = projRes.data?.data ?? {}
      const fundingGoal: number = proj.funding_goal ?? 0
      const baseDateStr: string | null = proj.funded_at ?? proj.funding_at ?? null
      const baseDate: Date | null = baseDateStr ? new Date(baseDateStr) : null

      const raw: {
        id?: number
        phase_no?: number
        title?: string
        description?: string
        duration?: number
        due_date?: string | null
        funding_goal?: number
        acceptance_criteria?: string
        status?: MilestoneStatus
        progress_pct?: number
        admin_note?: string
        voting_open?: boolean
        voting_opened_at?: string | null
        meetings?: { id: number; date: string; time: string; status: string }[]
      }[] = msRes.data?.data ?? []

      const milestones: MilestoneData[] = Array.from({ length: 4 }, (_, i) => {
        const bm = raw.find(m => (m.phase_no ?? 0) === i + 1) ?? {}
        const duration = bm.duration ?? 0

        let startDate: Date | null = null
        let endDate: Date | null = null
        if (baseDate && duration > 0) {
          const prevDays = raw
            .filter(m => (m.phase_no ?? 0) < i + 1)
            .reduce((sum, m) => sum + (m.duration ?? 0), 0)
          startDate = addDays(baseDate, prevDays)
          endDate = addDays(startDate, duration)
        } else if (bm.due_date) {
          endDate = new Date(bm.due_date)
          if (duration > 0) startDate = addDays(endDate, -duration)
        }

        return {
          id: bm.id,
          phase_no: i + 1,
          title: bm.title ?? `Phase ${i + 1}`,
          description: bm.description ?? '',
          duration,
          startDate,
          endDate,
          amount: bm.funding_goal ?? Math.round(fundingGoal * PHASE_PERCENTS[i]),
          criteria: bm.acceptance_criteria
            ? bm.acceptance_criteria.split('\n').filter(Boolean)
            : [],
          status: mapBackendStatus(bm.status),
          progress_pct: mapBackendStatus(bm.status) === 'completed' ? 100 : (bm.progress_pct ?? 0),
          admin_note: bm.admin_note,
          voting_open: bm.voting_open ?? false,
          voting_opened_at: bm.voting_opened_at ?? null,
          meetings: bm.meetings ?? [],
        }
      })

      const projectSuspended = proj.state === 'suspended' || proj.status === 'failed'
      set({ projectTitle: proj.title ?? '', milestones, projectSuspended })

      const firstActive = milestones.findIndex(
        m => m.status === 'in_progress' || m.status === 'rejected'
      )
      return firstActive !== -1 ? firstActive : null
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูล Milestone ได้')
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  fetchProjectMilestones: async (projectId) => {
    try {
      const res = await api.get(`/projects/${projectId}/milestones`)
      return res.data?.data ?? []
    } catch {
      return []
    }
  },

  fetchProjectMeetings: async (projectId) => {
    try {
      const res = await api.get(`/me/projects/${projectId}/meetings`, { params: { filter: 'all' } })
      return res.data?.data ?? []
    } catch {
      return []
    }
  },

  fetchMilestoneVoters: async (milestoneId) => {
    try {
      const res = await api.get(`/pioneer/investments/milestones/${milestoneId}/voters`)
      return res.data?.data ?? []
    } catch {
      return []
    }
  },

  submitEvidence: async (milestoneId, _projectId, summary, files, links, checkedCriteria) => {
    set({ isSubmitting: true, uploadProgress: files.length > 0 ? { current: 0, total: files.length } : null })
    try {
      const attachments: string[] = []
      for (const [i, file] of files.entries()) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await api.post('/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        })
        const url: string | undefined = res.data?.data?.url
        if (url) attachments.push(url)
        set({ uploadProgress: { current: i + 1, total: files.length } })
      }

      const body = {
        summary,
        criteria: checkedCriteria,
        attachments,
        links: links.map(l => l.url.trim()).filter(Boolean),
      }

      await api.patch(
        `/pioneer/projects/milestones/${milestoneId}/submit`,
        body
      )

      toast.success('ส่งหลักฐานเรียบร้อยแล้ว รอ Admin ตรวจสอบ')

      set(state => ({
        milestones: state.milestones.map(m =>
          m.id === milestoneId ? { ...m, status: 'submitted' as MilestoneStatus } : m
        ),
      }))

      return true
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (msg === 'previous milestone payment has not been transferred yet') {
        toast.error('ยังไม่สามารถส่งได้ เนื่องจาก Milestone ก่อนหน้ายังไม่ได้รับการโอนเงิน')
      } else {
        toast.error('เกิดข้อผิดพลาดในการส่งหลักฐาน')
      }
      return false
    } finally {
      set({ isSubmitting: false, uploadProgress: null })
    }
  },

  openVoting: async (milestoneId, projectId) => {
    set({ isOpeningVoting: true })
    try {
      await api.patch(`/pioneer/projects/milestones/${milestoneId}/open-vote`)
      toast.success('เปิดการโหวตเรียบร้อยแล้ว')
      // refetch จาก server เพื่อให้ voting_opened_at อัปเดต ซึ่ง trigger re-fetch voters ใน PhaseCard
      await useMilestoneStore.getState().fetchMilestones(projectId)
      return true
    } catch {
      toast.error('ไม่สามารถเปิดการโหวตได้')
      return false
    } finally {
      set({ isOpeningVoting: false })
    }
  },

  recallEvidence: async (milestoneId) => {
    try {
      await api.patch(`/pioneer/projects/milestones/${milestoneId}/cancel`)
      toast.success('ยกเลิกการส่งหลักฐานเรียบร้อยแล้ว')
      set(state => ({
        milestones: state.milestones.map(m =>
          m.id === milestoneId ? { ...m, status: 'in_progress' as MilestoneStatus } : m
        ),
      }))
      return true
    } catch {
      toast.error('ไม่สามารถยกเลิกได้')
      return false
    }
  },
}))
