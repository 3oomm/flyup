import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Loader2, ChevronRight, ChevronLeft, Flag } from 'lucide-react'
import { useProjectStore, type ProjectSummary } from '../../store/useProjectStore'

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 5

const STATE_LABEL: Record<string, string> = {
  funding:             'กำลังระดมทุน',
  executing:           'กำลังดำเนินการ',
  closed:              'เสร็จสิ้น',
  pending_review:      'รอตรวจสอบ',
  draft:               'แบบร่าง',
  cancelled:           'ถูกยกเลิก',
  suspended:           'ถูกระงับ',
  pending_cancel:      'รอยืนยันยกเลิก',
  pending_edit_review: 'รอตรวจสอบการแก้ไข',
}

const STATE_BADGE: Record<string, string> = {
  funding:             'bg-[#8B5CF6] text-white',
  executing:           'bg-[#3B82F6] text-white',
  closed:              'bg-[#2BA88E] text-white',
  pending_review:      'bg-[#F5A623] text-white',
  draft:               'bg-slate-100 text-slate-500',
  cancelled:           'bg-[#EF4444] text-white',
  suspended:           'bg-orange-100 text-orange-700',
  pending_cancel:      'bg-[#F5A623] text-white',
  pending_edit_review: 'bg-[#F5A623] text-white',
}

const MILESTONE_NAVIGABLE = ['funding', 'executing', 'closed', 'suspended', 'pending_review', 'pending_cancel', 'pending_edit_review']

// ไม่ใส่ 'draft'/'cancelled' — โปรเจกต์สถานะนี้ยังไม่มี milestone ที่ดำเนินการได้จริง (ดู MILESTONE_NAVIGABLE)
const TABS: { key: string; label: string }[] = [
  { key: 'all',           label: 'ทั้งหมด' },
  { key: 'executing',     label: 'กำลังดำเนินการ' },
  { key: 'funding',       label: 'กำลังระดมทุน' },
  { key: 'closed',        label: 'เสร็จสิ้น' },
  { key: 'pending_review',label: 'รอตรวจสอบ' },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

const ProjectRow = ({ project }: { project: ProjectSummary }) => {
  const navigate = useNavigate()
  const navigable = MILESTONE_NAVIGABLE.includes(project.state)
  const badge = STATE_BADGE[project.state] ?? 'bg-[#F1F3F5] text-[#6C757D]'
  const label = STATE_LABEL[project.state] ?? project.state
  const progress = project.funding_goal > 0
    ? Math.min(100, Math.round((project.current_funding / project.funding_goal) * 100))
    : 0

  return (
    <div
      className={`bg-white rounded-[14px] border border-border p-[18px] flex items-center gap-[14px] transition-all ${
        navigable ? 'hover:border-primary/50 hover:shadow-md cursor-pointer' : 'opacity-50 cursor-not-allowed'
      }`}
      onClick={() => navigable && navigate(`/pioneer/dashboard/projects/${project.id}/milestones`)}
    >
      <div className="shrink-0 w-14 h-14 rounded-[10px] bg-[#F1F3F5] overflow-hidden">
        {project.thumbnail_url
          ? <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Flag size={20} /></div>
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-[14px] text-foreground truncate">{project.title}</span>
          <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
          {project.category && (
            <span className="shrink-0 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{project.category.name}</span>
          )}
        </div>
        {project.description && (
          <p className="text-[12px] text-muted-foreground truncate mb-1.5">{project.description}</p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 h-1.5 rounded-full bg-[#F1F3F5] overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">{progress}%</span>
          </div>
          {project.funding_goal > 0 && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              ฿{project.current_funding.toLocaleString()} / ฿{project.funding_goal.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={16} className={`shrink-0 ${navigable ? 'text-muted-foreground' : 'opacity-30'}`} />
    </div>
  )
}

function Pagination({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg border border-border hover:bg-muted cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={15} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
            p === page ? 'bg-primary text-white' : 'border border-border hover:bg-muted text-foreground'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-lg border border-border hover:bg-muted cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const MilestoneListPage = () => {
  const { projects, isLoading, fetchMyProjects } = useProjectStore()
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => { fetchMyProjects() }, [fetchMyProjects])

  // แสดงเฉพาะโปรเจกต์ที่มี milestone ให้จัดการได้จริง (ตัดแบบร่าง/ถูกยกเลิกออก — กดเข้าไปก็ไม่มีอะไรให้ทำ)
  const manageableProjects = useMemo(() =>
    projects.filter(p => MILESTONE_NAVIGABLE.includes(p.state)),
    [projects]
  )

  const visibleTabs = useMemo(() =>
    TABS.filter(t => t.key === 'all' || manageableProjects.some(p => p.state === t.key)),
    [manageableProjects]
  )

  const filtered = useMemo(() => {
    if (activeTab === 'all') return manageableProjects
    return manageableProjects.filter(p => p.state === activeTab)
  }, [manageableProjects, activeTab])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleTabChange = (key: string) => { setActiveTab(key); setPage(1) }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[22px] font-bold text-foreground">Milestone</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">เลือกโปรเจกต์เพื่อจัดการ Milestone</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : manageableProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 border border-dashed border-border rounded-2xl bg-white text-muted-foreground">
          <Flag size={32} />
          <span className="text-[14px]">ยังไม่มีโปรเจกต์ที่ดำเนินการอยู่</span>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {visibleTabs.map(t => {
              const count = t.key === 'all'
                ? manageableProjects.length
                : manageableProjects.filter(p => p.state === t.key).length
              return (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
                    activeTab === t.key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-muted-foreground border-border hover:border-primary hover:text-foreground'
                  }`}
                >
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === t.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* List */}
          {paginated.length > 0 ? (
            <div className="flex flex-col gap-[10px]">
              {paginated.map(p => <ProjectRow key={p.id} project={p} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 border border-dashed border-border rounded-2xl bg-white text-muted-foreground">
              <Flag size={28} />
              <span className="text-[14px]">ไม่มีโปรเจกต์ในสถานะนี้</span>
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}

export default MilestoneListPage
