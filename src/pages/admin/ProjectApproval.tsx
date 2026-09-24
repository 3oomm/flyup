import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Loader2 } from 'lucide-react'
import { useAdminStore } from '../../store/useAdminStore'
import SearchBar from '../../components/admin/SearchBar'
import PageHeader from '../../components/admin/PageHeader'

const ProjectApproval = () => {
    const { pendingProjects, isLoading, fetchPendingProjects } = useAdminStore()
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchPendingProjects()

        const interval = setInterval(fetchPendingProjects, 30_000)

        const onVisible = () => {
            if (document.visibilityState === 'visible') fetchPendingProjects()
        }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [fetchPendingProjects])

    const filtered = pendingProjects.filter((p) => {
        const q = search.toLowerCase()
        const fullname = p.owner ? `${p.owner.first_name} ${p.owner.last_name}` : ''
        return p.title.toLowerCase().includes(q) || fullname.toLowerCase().includes(q)
    })

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader title="ตรวจสอบโปรเจกต์" subtitle="ตรวจสอบและอนุมัติโปรเจกต์ใหม่ที่ส่งเข้ามา" />

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="ค้นหาโปรเจกต์หรือ Pioneer..."
                resultCount={filtered.length}
            />

            {/* Table */}
            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                {/* Header */}
                <div className="grid grid-cols-[44px_minmax(0,1fr)_82px_96px] md:grid-cols-[60px_minmax(240px,2fr)_minmax(150px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_120px_140px] bg-surface-table px-2 md:px-4 py-3 font-medium text-gray-500 border-b border-border text-[12px] md:text-[13px]">
                    <div className="text-center">ลำดับ</div>
                    <div>โปรเจกต์</div>
                    <div className="hidden md:block text-center">Pioneer</div>
                    <div className="text-center">เป้าหมาย</div>
                    <div className="hidden md:block text-center">วันที่ส่ง</div>
                    <div className="hidden md:block text-center">สถานะ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {/* Body */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-sm text-muted-foreground">
                        {search ? 'ไม่พบโปรเจกต์ที่ค้นหา' : 'ไม่มีโปรเจกต์ที่รอตรวจสอบ'}
                    </div>
                ) : (
                    filtered.map((p, idx) => {
                        const fullname = p.owner
                            ? `${p.owner.first_name} ${p.owner.last_name}`.trim()
                            : '-'
                        const dateStr = p.CreatedAt
                            ? new Date(p.CreatedAt).toLocaleDateString('th-TH', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                              })
                            : '-'
                        return (
                            <div key={p.id} className="grid grid-cols-[44px_minmax(0,1fr)_82px_96px] md:grid-cols-[60px_minmax(240px,2fr)_minmax(150px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_120px_140px] border-b border-border last:border-0 hover:bg-gray-50 transition-colors px-2 md:px-4">
                                <div className="h-14 flex justify-center items-center text-muted-foreground text-[13px]">
                                    {idx + 1}
                                </div>
                                <div className="h-14 flex items-center pr-3 font-medium min-w-0">
                                    <span className="truncate">{p.title}</span>
                                </div>
                                <div className="hidden md:flex h-14 justify-center items-center text-[13px] min-w-0 px-1">
                                    <span className="truncate text-center">{fullname}</span>
                                </div>
                                <div className="flex h-14 justify-center items-center text-[12px] md:text-[13px]">
                                    ฿{p.funding_goal.toLocaleString()}
                                </div>
                                <div className="hidden md:flex h-14 justify-center items-center text-[13px]">{dateStr}</div>
                                <div className="hidden md:flex h-14 justify-center items-center">
                                    <span className="rounded-full px-2.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 text-[12px] font-medium whitespace-nowrap">
                                        <span className="md:hidden">รอ</span>
                                        <span className="hidden md:inline">รอตรวจสอบ</span>
                                    </span>
                                </div>
                                <div className="h-14 flex justify-center items-center">
                                    <Link
                                        to={`/admin/projects/${p.id}`}
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

export default ProjectApproval
