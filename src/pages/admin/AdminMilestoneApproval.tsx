import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Loader2, Milestone } from 'lucide-react'
import { useAdminStore } from '../../store/useAdminStore'
import SearchBar from '../../components/admin/SearchBar'
import StatusBadge from '../../components/admin/StatusBadge'
import PageHeader from '../../components/admin/PageHeader'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    submitted: { label: 'รอตรวจสอบ', className: 'bg-amber-50 text-amber-600 border border-amber-200' },
    approved:  { label: 'อนุมัติแล้ว', className: 'bg-green-50 text-green-600 border border-green-200' },
    rejected:  { label: 'ถูกปฏิเสธ', className: 'bg-red-50 text-red-600 border border-red-200' },
}

const AdminMilestoneApproval = () => {
    const { pendingMilestones, isMilestoneLoading, fetchPendingMilestones } = useAdminStore()
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchPendingMilestones()
    }, [fetchPendingMilestones])

    const filtered = pendingMilestones.filter((m) => {
        const q = search.toLowerCase()
        const fullname = m.owner ? `${m.owner.first_name} ${m.owner.last_name}` : ''
        return (
            m.project_title.toLowerCase().includes(q) ||
            m.title.toLowerCase().includes(q) ||
            fullname.toLowerCase().includes(q)
        )
    })

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader title="ตรวจสอบ Milestone" subtitle="ตรวจสอบและอนุมัติหลักฐาน Milestone ที่ Pioneer ส่งเข้ามา" />

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="ค้นหาโปรเจกต์, Milestone หรือ Pioneer..."
                resultCount={filtered.length}
            />

            {/* Table */}
            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                {/* Header */}
                <div className="grid grid-cols-[44px_minmax(0,1fr)_76px_96px] md:grid-cols-[60px_minmax(240px,2fr)_minmax(150px,1fr)_minmax(140px,1fr)_120px_160px] bg-surface-table px-2 md:px-4 py-3 font-medium text-gray-500 border-b border-border text-[12px] md:text-[13px]">
                    <div className="text-center">ลำดับ</div>
                    <div>โปรเจกต์</div>
                    <div className="hidden md:block text-center">Pioneer</div>
                    <div className="text-center">Phase</div>
                    <div className="hidden md:block text-center">สถานะ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {/* Body */}
                {isMilestoneLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-[10px] text-muted-foreground">
                        <Milestone size={28} className="opacity-40" />
                        <p className="text-sm">
                            {search ? 'ไม่พบ Milestone ที่ค้นหา' : 'ไม่มี Milestone ที่รอตรวจสอบ'}
                        </p>
                    </div>
                ) : (
                    filtered.map((m, idx) => {
                        const fullname = m.owner
                            ? `${m.owner.first_name} ${m.owner.last_name}`.trim()
                            : '-'
                        const dateStr = m.submitted_at
                            ? new Date(m.submitted_at).toLocaleDateString('th-TH', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                              })
                            : '-'
                        const badge = STATUS_BADGE[m.status] ?? STATUS_BADGE['submitted']

                        return (
                            <div
                                key={m.id}
                                className="grid grid-cols-[44px_minmax(0,1fr)_76px_96px] md:grid-cols-[60px_minmax(240px,2fr)_minmax(150px,1fr)_minmax(140px,1fr)_120px_160px] border-b border-border last:border-0 hover:bg-gray-50 transition-colors px-2 md:px-4"
                            >
                                <div className="h-14 flex justify-center items-center text-muted-foreground text-[13px]">
                                    {idx + 1}
                                </div>
                                <div className="h-14 min-w-0 flex items-center pr-2 md:pr-3 font-medium">
                                    <span className="block min-w-0 truncate">{m.project_title}</span>
                                </div>
                                <div className="hidden md:flex h-14 justify-center items-center text-[13px]">
                                    {fullname}
                                </div>
                                <div className="h-14 flex flex-col justify-center items-center gap-[2px]">
                                    <span className="text-[11px] md:text-[13px] font-medium whitespace-nowrap">Phase {m.phase_no}</span>
                                    <span className="hidden md:block text-[11px] text-muted-foreground truncate max-w-[90px]">{m.title}</span>
                                </div>
                                <div className="hidden md:flex h-14 justify-center items-center">
                                    <StatusBadge label={badge.label} className={badge.className} />
                                </div>
                                <div className="h-14 flex justify-center items-center gap-[6px]">
                                    <span className="hidden md:inline text-[11px] text-muted-foreground">{dateStr}</span>
                                    <Link
                                        to={`/admin/milestones/${m.id}`}
                                        className="px-2.5 md:px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors text-[11px] md:text-[12px] font-medium whitespace-nowrap cursor-pointer"
                                    >
                                        ดูรายละเอียด
                                    </Link>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default AdminMilestoneApproval
