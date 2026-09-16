import { useEffect, useState } from 'react'
import { Loader2, ShieldBan, ShieldCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import SearchBar from '../../components/admin/SearchBar'
import FilterTabs from '../../components/admin/FilterTabs'
import StatusBadge from '../../components/admin/StatusBadge'
import PageHeader from '../../components/admin/PageHeader'
import { useAdminStore, type AdminProjectRow as ProjectRow } from '../../store/useAdminStore'

const STATE_LABEL: Record<string, string> = {
    funding:        'กำลังระดมทุน',
    executing:      'กำลังดำเนินการ',
    closed:         'เสร็จสิ้น',
    cancelled:      'ยกเลิกแล้ว',
    suspended:      'ถูกระงับ',
    pending_review: 'รอตรวจสอบ',
    pending_cancel: 'รอยกเลิก',
    draft:          'แบบร่าง',
}

const STATE_BADGE: Record<string, string> = {
    funding:        'bg-violet-50 text-violet-600 border border-violet-200',
    executing:      'bg-blue-50 text-blue-600 border border-blue-200',
    closed:         'bg-emerald-50 text-emerald-600 border border-emerald-200',
    cancelled:      'bg-gray-50 text-gray-500 border border-gray-200',
    suspended:      'bg-red-50 text-red-600 border border-red-200',
    pending_review: 'bg-amber-50 text-amber-600 border border-amber-200',
    pending_cancel: 'bg-orange-50 text-orange-600 border border-orange-200',
    draft:          'bg-gray-50 text-gray-400 border border-gray-200',
}

// states ที่ admin สามารถ suspend ได้
const SUSPENDABLE = new Set(['funding', 'executing'])
// states ที่เป็น terminal (ระงับไม่ได้ และ restore ไม่ได้)
const TERMINAL = new Set(['cancelled', 'closed'])

type Tab = 'active' | 'terminal'

const UnsuspendModal = ({
    project, onClose, onConfirm, isSubmitting,
}: { project: ProjectRow; onClose: () => void; onConfirm: () => Promise<void>; isSubmitting: boolean }) => (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-[420px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-bold text-foreground">ยกเลิกการระงับ?</h2>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="text-[13px] text-muted-foreground mb-1">โปรเจกต์ <span className="font-semibold text-foreground">{project.title}</span> จะถูกยกเลิกการระงับ</p>
            <p className="text-[12px] text-muted-foreground mb-5">สถานะจะเปลี่ยนกลับเป็น "กำลังดำเนินการ" และโปรเจกต์จะกลับมาทำงานตามปกติ</p>
            <div className="flex gap-2 justify-end">
                <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border hover:bg-gray-50">ยกเลิก</button>
                <button data-testid="project-unsuspend-confirm-btn" onClick={onConfirm} disabled={isSubmitting}
                    className="px-4 py-2 text-[13px] rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    ยกเลิกระงับ
                </button>
            </div>
        </div>
    </div>
)

const SuspendModal = ({
    project, onClose, onConfirm, isSubmitting,
}: { project: ProjectRow; onClose: () => void; onConfirm: () => Promise<void>; isSubmitting: boolean }) => (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-[420px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-bold text-foreground">ระงับโปรเจกต์?</h2>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="text-[13px] text-muted-foreground mb-1">โปรเจกต์ <span className="font-semibold text-foreground">{project.title}</span> จะถูกระงับ</p>
            <p className="text-[12px] text-muted-foreground mb-5">การระงับจะเปลี่ยนสถานะเป็น "ถูกระงับ" และผู้ใช้ทั่วไปจะไม่สามารถลงทุนเพิ่มได้</p>
            <div className="flex gap-2 justify-end">
                <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border hover:bg-gray-50">ยกเลิก</button>
                <button data-testid="project-suspend-confirm-btn" onClick={onConfirm} disabled={isSubmitting}
                    className="px-4 py-2 text-[13px] rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldBan size={14} />}
                    ระงับ
                </button>
            </div>
        </div>
    </div>
)

const AdminProjectSuspension = () => {
    const { allProjects: projects, isAllProjectsLoading: isLoading, fetchAllProjects, updateProjectStatus } = useAdminStore()
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState<Tab>('active')
    const [selected, setSelected] = useState<ProjectRow | null>(null)
    const [unsuspendTarget, setUnsuspendTarget] = useState<ProjectRow | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchAllProjects().catch(() => toast.error('โหลดข้อมูลโปรเจกต์ไม่สำเร็จ'))
    }, [fetchAllProjects])

    const handleUnsuspend = async () => {
        if (!unsuspendTarget) return
        setIsSubmitting(true)
        try {
            await updateProjectStatus(unsuspendTarget.id, 'executing', 'active')
            toast.success('ยกเลิกการระงับสำเร็จ')
            setUnsuspendTarget(null)
            fetchAllProjects()
        } catch {
            toast.error('ยกเลิกการระงับไม่สำเร็จ')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSuspend = async () => {
        if (!selected) return
        setIsSubmitting(true)
        try {
            await updateProjectStatus(selected.id, 'suspended', 'suspended')
            toast.success('ระงับโปรเจกต์สำเร็จ')
            setSelected(null)
            fetchAllProjects()
        } catch {
            toast.error('ระงับไม่สำเร็จ')
        } finally {
            setIsSubmitting(false)
        }
    }

    // active tab = ยังไม่ terminal และไม่ใช่ draft
    // terminal tab = cancelled / closed (ดูประวัติได้อย่างเดียว)
    const byTab = projects.filter((p) =>
        tab === 'terminal'
            ? TERMINAL.has(p.state)
            : !TERMINAL.has(p.state) && p.state !== 'draft'
    )

    const filtered = byTab.filter((p) => {
        const q = search.toLowerCase()
        const categoryName = typeof p.category === 'string' ? p.category : (p.category as unknown as { name?: string } | null)?.name ?? ''
        return p.title.toLowerCase().includes(q) || categoryName.toLowerCase().includes(q)
    })

    const activeCount   = projects.filter((p) => !TERMINAL.has(p.state) && p.state !== 'draft').length
    const terminalCount = projects.filter((p) => TERMINAL.has(p.state)).length

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: 'active',   label: 'โปรเจกต์ที่ใช้งานอยู่', count: activeCount },
        { key: 'terminal', label: 'ยกเลิก / ปิดแล้ว',      count: terminalCount },
    ]

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader title="ระงับโปรเจกต์" subtitle="จัดการสถานะและระงับโปรเจกต์ที่เข้าข่ายผิดเงื่อนไข" />

            <div className="flex items-center justify-between gap-2 sm:gap-4">
                <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาชื่อโปรเจกต์..." resultCount={filtered.length} />
                <FilterTabs active={tab} onChange={(k) => setTab(k as Tab)} tabs={tabs} />
            </div>

            {tab === 'terminal' && (
                <p className="text-[12px] text-muted-foreground px-2.5">
                    โปรเจกต์เหล่านี้ถูกยกเลิกหรือปิดแล้ว ไม่สามารถระงับหรือ restore ได้
                </p>
            )}

            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                <div className="grid grid-cols-6 bg-[#f8f9fc] px-4 py-3 font-medium text-gray-500 border-b border-border">
                    <div className="col-span-2">โปรเจกต์</div>
                    <div className="text-center">หมวดหมู่</div>
                    <div className="text-center">เป้าหมาย</div>
                    <div className="text-center">สถานะ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-[10px] text-muted-foreground">
                        <ShieldBan size={28} className="opacity-40" />
                        <p className="text-sm">{search ? 'ไม่พบโปรเจกต์ที่ค้นหา' : 'ไม่มีโปรเจกต์'}</p>
                    </div>
                ) : (
                    filtered.map((p) => {
                        const stateBadge = STATE_BADGE[p.state] ?? 'bg-gray-50 text-gray-500 border border-gray-200'
                        const stateLabel = STATE_LABEL[p.state] ?? p.state
                        const canSuspend   = SUSPENDABLE.has(p.state)
                        const isSuspended  = p.state === 'suspended'
                        const isTerminal   = TERMINAL.has(p.state)

                        return (
                            <div key={p.id} className="grid grid-cols-6 border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                                <div className="col-span-2 h-14 flex flex-col justify-center px-2">
                                    <span className="font-medium text-[13px] truncate">{p.title}</span>
                                    <span className="text-[11px] text-muted-foreground">ID: {p.id}</span>
                                </div>
                                <div className="h-14 flex justify-center items-center text-[12px] text-muted-foreground">
                                    {(typeof p.category === 'string' ? p.category : (p.category as unknown as { name?: string } | null)?.name) ?? '-'}
                                </div>
                                <div className="h-14 flex flex-col justify-center items-center text-[12px]">
                                    <span className="font-semibold text-primary">฿{(p.funding_goal ?? 0).toLocaleString('th-TH')}</span>
                                    <span className="text-muted-foreground text-[11px]">ระดมแล้ว ฿{(p.current_funding ?? 0).toLocaleString('th-TH')}</span>
                                </div>
                                <div className="h-14 flex justify-center items-center">
                                    <StatusBadge label={stateLabel} className={stateBadge} />
                                </div>
                                <div className="h-14 flex justify-center items-center">
                                    {isSuspended ? (
                                        <button data-testid={`project-unsuspend-open-btn-${p.id}`} onClick={() => setUnsuspendTarget(p)}
                                            className="flex items-center gap-[5px] px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-[12px] font-medium">
                                            <ShieldCheck size={13} /> ยกเลิกระงับ
                                        </button>
                                    ) : canSuspend ? (
                                        <button data-testid={`project-suspend-open-btn-${p.id}`} onClick={() => setSelected(p)}
                                            className="flex items-center gap-[5px] px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[12px] font-medium">
                                            <ShieldBan size={13} /> ระงับ
                                        </button>
                                    ) : isTerminal ? (
                                        <span className="text-[12px] text-muted-foreground">—</span>
                                    ) : (
                                        <span className="text-[12px] text-muted-foreground">ไม่สามารถระงับได้</span>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {selected && (
                <SuspendModal project={selected} onClose={() => setSelected(null)}
                    onConfirm={handleSuspend} isSubmitting={isSubmitting} />
            )}
            {unsuspendTarget && (
                <UnsuspendModal project={unsuspendTarget} onClose={() => setUnsuspendTarget(null)}
                    onConfirm={handleUnsuspend} isSubmitting={isSubmitting} />
            )}
        </div>
    )
}

export default AdminProjectSuspension
