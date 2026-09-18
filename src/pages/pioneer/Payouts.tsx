import { useEffect, useMemo, useState } from 'react'
import { Banknote, Clock, CheckCircle2, Loader2, Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePioneerPayoutStore, type PioneerPayoutItem } from '../../store/usePioneerPayoutStore'
import { useProjectStore } from '../../store/useProjectStore'

function fmtBaht(v: number) {
  return `฿${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ── Phase row (detail) ────────────────────────────────────────────────────────

function PayoutRow({ item }: { item: PioneerPayoutItem }) {
  const isConfirmed = item.status === 'confirmed'
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-gray-50 transition-colors">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm
        ${isConfirmed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
        {item.phase_no}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Phase {item.phase_no}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{item.percent_release}% ของทุนระดม</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{fmtDate(item.created_at)}</span>
          {item.transfer_ref && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground font-mono">{item.transfer_ref}</span>
            </>
          )}
        </div>
        {item.admin_note && (
          <p className="text-xs text-muted-foreground mt-1 italic">{item.admin_note}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-sm font-bold text-foreground">{fmtBaht(item.amount)}</span>
        {isConfirmed ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCircle2 size={11} /> โอนแล้ว {item.confirmed_at ? fmtDate(item.confirmed_at) : ''}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
            <Clock size={11} /> รอดำเนินการ
          </span>
        )}
      </div>
    </div>
  )
}

// ── Project summary card (list view) ─────────────────────────────────────────

function ProjectCard({
  title, items, thumbnailUrl, onClick,
}: { title: string; items: PioneerPayoutItem[]; thumbnailUrl?: string; onClick: () => void }) {
  const confirmed = items.filter(i => i.status === 'confirmed').reduce((s, i) => s + i.amount, 0)
  const pending   = items.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const allComplete = items[0]?.all_phases_complete ?? false

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-border rounded-2xl p-5 flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
        {thumbnailUrl
          ? <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
          : <Building2 size={18} className="text-primary" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-[15px] text-foreground leading-tight truncate">{title}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">{items.length} Milestone</span>
          {confirmed > 0 && (
            <span className="text-xs font-medium text-emerald-600">โอนแล้ว {fmtBaht(confirmed)}</span>
          )}
          {pending > 0 && (
            <span className="text-xs font-medium text-amber-600">รอ {fmtBaht(pending)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {allComplete ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={11} /> ครบ 4 Phase
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <Clock size={11} /> กำลังดำเนินการ
          </span>
        )}
        <ChevronRight size={16} className="text-muted-foreground" />
      </div>
    </button>
  )
}

// ── Detail view ───────────────────────────────────────────────────────────────

function ProjectDetail({
  title, items, thumbnailUrl, onBack,
}: { title: string; items: PioneerPayoutItem[]; thumbnailUrl?: string; onBack: () => void }) {
  const confirmed = items.filter(i => i.status === 'confirmed').reduce((s, i) => s + i.amount, 0)
  const pending   = items.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const allComplete = items[0]?.all_phases_complete ?? false

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit"
      >
        <ChevronLeft size={16} /> กลับ
      </button>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {thumbnailUrl
              ? <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
              : <Building2 size={16} className="text-primary" />
            }
          </div>
          <div>
            <p className="font-bold text-[17px] text-foreground leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">{items.length} Milestone</p>
          </div>
        </div>
        {allComplete ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <CheckCircle2 size={12} /> ครบ 4 Phase
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            <Clock size={12} /> กำลังดำเนินการ
          </span>
        )}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">โอนแล้ว</p>
            <p className="text-[15px] font-bold text-foreground">{fmtBaht(confirmed)}</p>
          </div>
        </div>
        {pending > 0 && (
          <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <Clock size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">รอดำเนินการ</p>
              <p className="text-[15px] font-bold text-foreground">{fmtBaht(pending)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Phase rows */}
      <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-3">
        {items.map(item => <PayoutRow key={item.id} item={item} />)}
      </div>

    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const Payouts = () => {
  const { payouts, isLoading, fetchPayouts } = usePioneerPayoutStore()
  // /pioneer/payouts ไม่ส่ง thumbnail มาด้วย ต้องดึงจาก useProjectStore แล้ว match ด้วย project_id เอาเอง
  const { projects, fetchMyProjects } = useProjectStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => { fetchPayouts() }, [fetchPayouts])
  useEffect(() => { fetchMyProjects() }, [fetchMyProjects])

  const thumbnailByProjectId = useMemo(() => {
    const map = new Map<number, string | undefined>()
    for (const p of projects) map.set(p.id, p.thumbnail_url)
    return map
  }, [projects])

  const grouped = useMemo(() => {
    const map = new Map<number, { title: string; items: PioneerPayoutItem[] }>()
    for (const p of payouts) {
      if (!map.has(p.project_id)) map.set(p.project_id, { title: p.project_title, items: [] })
      map.get(p.project_id)!.items.push(p)
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v, thumbnailUrl: thumbnailByProjectId.get(id) }))
  }, [payouts, thumbnailByProjectId])

  const totalConfirmed = payouts.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0)
  const totalPending   = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)

  const selected = grouped.find(g => g.id === selectedId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  // ── Detail view ──
  if (selected) {
    return (
      <ProjectDetail
        title={selected.title}
        items={selected.items}
        thumbnailUrl={selected.thumbnailUrl}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  // ── List view ──
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[22px] font-bold text-foreground">การรับเงิน</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          ยอดเงินที่ได้รับจากแต่ละ Milestone — ครบ 4 Phase ถึงจะได้รับเงินทั้งหมด
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <Banknote size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-0.5">โอนแล้วทั้งหมด</p>
            <p className="text-2xl font-bold text-foreground">{fmtBaht(totalConfirmed)}</p>
          </div>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-0.5">รอดำเนินการ</p>
            <p className="text-2xl font-bold text-foreground">{fmtBaht(totalPending)}</p>
          </div>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 flex flex-col items-center gap-3 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
            <Banknote size={24} className="text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">ยังไม่มีรายการ</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            รายการจ่ายเงินจะปรากฏเมื่อ Milestone ผ่านการโหวตจากนักลงทุน
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(g => (
            <ProjectCard key={g.id} title={g.title} items={g.items} thumbnailUrl={g.thumbnailUrl} onClick={() => setSelectedId(g.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Payouts
