import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calendar, ChevronDown, ChevronRight, Clock, MapPin, Video } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useBoosterStore, type BoosterMeeting } from '../../store/useBoosterStore'

const WINDOW_MS = 2 * 60 * 60 * 1000
const typeLabel: Record<string, string> = { online: 'ออนไลน์', onsite: 'ออนไซต์', hybrid: 'ไฮบริด' }

function dateTimeOf(meeting: BoosterMeeting) {
  const date = new Date(meeting.date)
  const time = new Date(meeting.time)
  if (Number.isNaN(date.getTime()) || Number.isNaN(time.getTime())) return null
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), time.getUTCHours(), time.getUTCMinutes())
}

function stateOf(meeting: BoosterMeeting, now: Date) {
  const cancelled = meeting.status === 'cancelled' || meeting.status === 'canceled'
  const closed = meeting.status === 'closed'
  const open = meeting.status === 'open'
  const at = dateTimeOf(meeting)
  const ongoing = open && !!at && at <= now && now < new Date(at.getTime() + WINDOW_MS)
  const upcoming = open && (!at || at > now)
  return { cancelled, closed, open, ongoing, upcoming }
}

function projectIdOf(meeting: BoosterMeeting) {
  return meeting.project?.id ?? meeting.milestone?.project_id ?? 0
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value.substring(0, 5) : `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

interface MeetingProject { id: number; title: string; cover: string | null; meetings: BoosterMeeting[] }

function ProjectCard({ project, now }: { project: MeetingProject; now: Date }) {
  const ongoing = project.meetings.filter(item => stateOf(item, now).ongoing).length
  const upcoming = project.meetings.filter(item => stateOf(item, now).upcoming).length
  const past = project.meetings.length - ongoing - upcoming
  return (
    <Link to={`/booster/meetings?project=${project.id}`} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:h-16 sm:w-16">{project.cover ? <img src={project.cover} alt={project.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Video size={22} /></div>}</div>
        <div className="min-w-0"><h3 className="mb-2 break-words text-sm font-bold sm:text-base">{project.title}</h3><div className="flex flex-wrap gap-2 text-xs font-medium"><span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{project.meetings.length} การประชุม</span>{ongoing > 0 && <span className="animate-pulse rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-green-700">กำลังประชุม {ongoing}</span>}{upcoming > 0 && <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-primary">กำลังจะถึง {upcoming}</span>}{past > 0 && <span className="rounded-full border border-border bg-white px-2.5 py-1 text-muted-foreground">ปิดแล้ว {past}</span>}</div></div>
      </div>
      <span className="w-full shrink-0 rounded-xl border border-border px-6 py-2 text-center text-sm font-semibold text-muted-foreground sm:w-auto">ดูการประชุม <ChevronRight size={15} className="inline" /></span>
    </Link>
  )
}

function MeetingCard({ meeting, now }: { meeting: BoosterMeeting; now: Date }) {
  const [expanded, setExpanded] = useState(false)
  const state = stateOf(meeting, now)
  const phase = meeting.milestone ? `Phase ${meeting.milestone.phase_no}: ${meeting.milestone.title}` : 'การประชุม'
  const detail = meeting.about || meeting.description
  const hasDetail = Boolean(detail || meeting.link || meeting.place)
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-start gap-3 p-4 sm:items-center sm:p-5">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">{meeting.project?.cover_image ? <img src={meeting.project.cover_image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Video size={20} /></div>}</div>
        <div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-bold">{phase}</h3><p className="mt-1 break-words text-xs text-muted-foreground">{formatDate(meeting.date)} เวลา {formatTime(meeting.time)}{meeting.meeting_type && ` · ${typeLabel[meeting.meeting_type] ?? meeting.meeting_type}`}{meeting.place && <> · <MapPin size={10} className="inline" /> {meeting.place}</>}</p></div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">{state.cancelled ? <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">ยกเลิก</span> : state.closed ? <span className="rounded-full border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground">ปิดแล้ว</span> : state.ongoing ? <><span className="hidden animate-pulse rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 sm:inline">กำลังประชุม</span>{meeting.link && <a href={meeting.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white"><Video size={14} /> เข้าร่วม</a>}</> : state.upcoming ? <><span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary">กำลังจะถึง</span>{meeting.link && <a href={meeting.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"><Video size={14} /> เข้าร่วม</a>}</> : <span className="rounded-full border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground">เสร็จสิ้น</span>}{hasDetail && <button type="button" onClick={() => setExpanded(value => !value)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><ChevronDown size={16} className={expanded ? 'rotate-180' : ''} /></button>}</div>
      </div>
      {expanded && <div className="flex flex-col gap-4 border-t border-border bg-muted/30 p-4 sm:flex-row sm:p-5">{detail && <div className="flex-1"><p className="mb-1 text-xs font-bold text-muted-foreground">วาระการประชุม</p><p className="whitespace-pre-wrap break-words text-sm">{detail}</p></div>}{meeting.link && <a href={meeting.link} target="_blank" rel="noreferrer" className="break-all text-sm font-medium text-primary hover:underline">{meeting.link}</a>}</div>}
    </div>
  )
}

const Meetings = () => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'past'>('all')
  const [visible, setVisible] = useState(5)
  const [now, setNow] = useState(() => new Date())
  const [params] = useSearchParams()
  const selectedId = Number(params.get('project')) || null
  const { boosterMeetings, fetchBoosterMeetings } = useBoosterStore()

  useEffect(() => { fetchBoosterMeetings(); const timer = window.setInterval(() => { setNow(new Date()); fetchBoosterMeetings() }, 30_000); return () => window.clearInterval(timer) }, [fetchBoosterMeetings])

  const projects = useMemo(() => {
    const map = new Map<number, MeetingProject>()
    boosterMeetings.forEach(meeting => { const id = projectIdOf(meeting); if (!id) return; const group = map.get(id); if (group) group.meetings.push(meeting); else map.set(id, { id, title: meeting.project?.title || `โปรเจกต์ #${id}`, cover: meeting.project?.cover_image ?? null, meetings: [meeting] }) })
    return [...map.values()].sort((a, b) => Number(b.meetings.some(item => stateOf(item, now).ongoing)) - Number(a.meetings.some(item => stateOf(item, now).ongoing)) || b.id - a.id)
  }, [boosterMeetings, now])
  const selected = projects.find(project => project.id === selectedId)
  const filtered = useMemo(() => (selected?.meetings ?? []).filter(meeting => { const state = stateOf(meeting, now); if (filter === 'all') return true; if (filter === 'ongoing') return state.ongoing; if (filter === 'upcoming') return state.upcoming && !state.cancelled; return state.closed || state.cancelled || (!state.upcoming && !state.ongoing && state.open) }).sort((a, b) => (dateTimeOf(b)?.getTime() ?? 0) - (dateTimeOf(a)?.getTime() ?? 0)), [selected, filter, now])
  useEffect(() => setVisible(5), [filter, selectedId])
  const total = selectedId ? filtered.length : projects.length

  return <div><div className="mb-6">{selectedId && <Link to="/booster/meetings" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} /> กลับไปโปรเจกต์ทั้งหมด</Link>}<h1 className="text-2xl font-bold">การประชุม</h1><p className="mt-1 text-sm text-muted-foreground">{selected?.title ?? 'นัดหมายประชุม Milestone กับทีมโปรเจกต์'}</p></div>{selected && <div className="mb-4 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between"><div className="flex items-center gap-2"><Clock size={16} /><b>รายการนัดหมาย</b></div><select value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-[420px]:w-auto"><option value="upcoming">กำลังจะถึง</option><option value="ongoing">กำลังประชุม</option><option value="past">ที่ผ่านมา</option><option value="all">ทั้งหมด</option></select></div>}<div className="space-y-3">{!selectedId && projects.slice(0, visible).map(project => <ProjectCard key={project.id} project={project} now={now} />)}{selected && filtered.slice(0, visible).map(meeting => <MeetingCard key={meeting.id} meeting={meeting} now={now} />)}{selectedId && !selected && <Empty text="ไม่พบโปรเจกต์นี้" />}{total === 0 && (!selectedId || !!selected) && <Empty text={selected ? 'ไม่มีนัดหมายที่ตรงกับเงื่อนไข' : 'ยังไม่มีรายการประชุม'} />}{visible < total && <div className="flex justify-center pt-2"><button type="button" onClick={() => setVisible(value => value + 5)} className="rounded-lg bg-[#171421] px-6 py-3 text-sm font-semibold text-white">โหลดเพิ่มเติม</button></div>}</div></div>
}

function Empty({ text }: { text: string }) { return <div className="flex flex-col items-center py-16 text-muted-foreground"><Calendar size={28} className="mb-2" /><p className="text-sm">{text}</p></div> }

export default Meetings
