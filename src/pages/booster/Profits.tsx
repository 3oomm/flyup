import { useEffect, useState } from 'react'
import { TrendingUp, LayoutGrid, Loader2, CheckCircle2, Clock, ChevronDown } from 'lucide-react'
import { useBoosterStore, type ProfitPayout } from '../../store/useBoosterStore'

const fmtBaht = (v: number) =>
    `฿${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

const Profits = () => {
    const { profitPayouts: items, isLoadingProfitPayouts: isLoading, fetchProfitPayouts } = useBoosterStore()
    const [expanded, setExpanded] = useState<Record<number, boolean>>({})
    const [visibleCount, setVisibleCount] = useState(5)

    useEffect(() => { fetchProfitPayouts() }, [fetchProfitPayouts])

    const totalProfit = items
        .filter(i => i.status === 'confirmed')
        .reduce((s, i) => s + i.amount, 0)

    const grouped = items.reduce<Record<number, { title: string; items: ProfitPayout[] }>>((acc, i) => {
        if (!acc[i.project_id]) acc[i.project_id] = { title: i.project_title, items: [] }
        acc[i.project_id].items.push(i)
        return acc
    }, {})

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 pb-10">
            <div>
                <h1 className="text-[22px] font-bold text-foreground">ประวัติกำไร</h1>
                <p className="text-[13px] text-muted-foreground mt-0.5">ส่วนแบ่งกำไรที่ได้รับจากโปรเจกต์ที่คุณลงทุน</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <TrendingUp size={22} className="text-primary" />
                    </div>
                    <div>
                        <p className="text-[11px] text-muted-foreground font-semibold mb-0.5">กำไรที่ได้รับแล้ว</p>
                        <p className="text-[22px] font-bold text-foreground">{fmtBaht(totalProfit)}</p>
                    </div>
                </div>
                <div className="bg-white border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center shrink-0">
                        <LayoutGrid size={22} className="text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-[11px] text-muted-foreground font-semibold mb-0.5">รายการทั้งหมด</p>
                        <p className="text-[22px] font-bold text-foreground">{items.length} รายการ</p>
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {items.length === 0 ? (
                <div className="bg-white border border-border rounded-2xl p-12 flex flex-col items-center gap-3 text-center shadow-sm">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                        <TrendingUp size={24} className="text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-foreground">ยังไม่มีประวัติกำไร</p>
                    <p className="text-[13px] text-muted-foreground max-w-xs">
                        กำไรจะปรากฏที่นี่เมื่อ Pioneer ส่งปันผลและ Admin ยืนยันการโอนแล้ว
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {Object.entries(grouped).slice(0, visibleCount).map(([projectId, { title, items: groupItems }]) => {
                        const pid = Number(projectId)
                        const isOpen = !!expanded[pid]
                        const totalConfirmed = groupItems.filter(i => i.status === 'confirmed').reduce((s, i) => s + i.amount, 0)
                        const totalPending   = groupItems.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
                        const confirmedCount = groupItems.filter(i => i.status === 'confirmed').length
                        const coverImage = groupItems[0]?.cover_image
                        return (
                            <div key={pid} className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm transition-all">
                                {/* Header row — คลิกเพื่อ expand */}
                                <button
                                    data-testid={`profit-group-toggle-${pid}`}
                                    onClick={() => setExpanded(prev => ({ ...prev, [pid]: !prev[pid] }))}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer text-left"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
                                            {coverImage
                                                ? <img src={coverImage} alt={title} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full bg-primary/10 flex items-center justify-center"><TrendingUp size={16} className="text-primary" /></div>
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-[14px] text-foreground truncate">{title}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {groupItems.length} ไตรมาส · {confirmedCount} โอนแล้ว
                                                {totalPending > 0 && <span className="text-amber-600"> · รอโอน {fmtBaht(totalPending)}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="font-bold text-[15px] text-primary">{fmtBaht(totalConfirmed)}</span>
                                        <ChevronDown
                                            size={16}
                                            className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                        />
                                    </div>
                                </button>

                                {/* Expandable quarter rows */}
                                {isOpen && (
                                    <div className="border-t border-border divide-y divide-border">
                                        {[...groupItems].sort((a, b) => a.quarter_no - b.quarter_no).map(item => (
                                            <div key={item.id} className="flex items-center justify-between px-5 py-3.5 bg-gray-50/30">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        {item.quarter_no > 0 && (
                                                            <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Q{item.quarter_no}</span>
                                                        )}
                                                        <span className="text-[13px] font-medium text-foreground">
                                                            สัดส่วน {item.share_pct.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        {item.status === 'confirmed'
                                                            ? `โอนแล้ว ${fmtDate(item.confirmed_at)}`
                                                            : `แจ้งเมื่อ ${fmtDate(item.created_at)} · รอ Admin โอน`
                                                        }
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold text-[15px] ${item.status === 'confirmed' ? 'text-primary' : 'text-amber-500'}`}>
                                                        +{fmtBaht(item.amount)}
                                                    </span>
                                                    {item.status === 'confirmed'
                                                        ? <CheckCircle2 size={15} className="text-green-600" />
                                                        : <Clock size={15} className="text-amber-500" />
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    {visibleCount < Object.keys(grouped).length && (
                        <div className="flex justify-center pt-3">
                            <button onClick={() => setVisibleCount(count => count + 5)} className="rounded-lg bg-[#171525] px-7 py-3 text-sm font-semibold text-white hover:opacity-90">
                                โหลดเพิ่มเติม
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default Profits
