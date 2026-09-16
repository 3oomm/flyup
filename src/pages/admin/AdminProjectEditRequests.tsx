import { useEffect, useState } from 'react'
import { Loader2, FileEdit, CheckCircle, XCircle, X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import SearchBar from '../../components/admin/SearchBar'
import PageHeader from '../../components/admin/PageHeader'
import { useAdminStore, type PendingEditProject, type ProjectEditSnapshot } from '../../store/useAdminStore'
import { useAdminBadgeStore } from '../../store/useAdminBadgeStore'

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

// ฟิลด์ที่เทียบ "เดิม vs ใหม่" ได้ (ตรงกับที่ backend เก็บใน edit_snapshot)
const DIFF_FIELDS: { key: keyof ProjectEditSnapshot; label: string; fmt?: (v: unknown) => string }[] = [
    { key: 'title', label: 'ชื่อโปรเจกต์' },
    { key: 'description', label: 'คำอธิบาย' },
    { key: 'risk', label: 'ความเสี่ยง' },
    { key: 'funding_goal', label: 'เป้าหมายเงินทุน', fmt: (v) => `฿${fmt(Number(v))}` },
    { key: 'softcap', label: 'Soft Cap', fmt: (v) => `฿${fmt(Number(v))}` },
    { key: 'duration_days', label: 'ระยะเวลาระดมทุน (วัน)' },
    { key: 'duration_months', label: 'ระยะเวลาโปรเจกต์ (เดือน)' },
    { key: 'profit_share_pct', label: 'ส่วนแบ่งกำไร (%)' },
    { key: 'min_invest_amount', label: 'ลงทุนขั้นต่ำ', fmt: (v) => `฿${fmt(Number(v))}` },
    { key: 'max_invest_amount', label: 'ลงทุนสูงสุด', fmt: (v) => `฿${fmt(Number(v))}` },
]

const DetailModal = ({
    project,
    onClose,
    onApprove,
    onReject,
}: {
    project: PendingEditProject
    onClose: () => void
    onApprove: () => void
    onReject: () => void
}) => {
    const navigate = useNavigate()

    let snapshot: ProjectEditSnapshot | null = null
    try { snapshot = project.edit_snapshot ? JSON.parse(project.edit_snapshot) : null } catch { snapshot = null }

    const current: Record<string, unknown> = {
        title: project.title,
        description: project.description,
        risk: project.risk,
        funding_goal: project.funding_goal,
        softcap: project.softcap,
        duration_days: project.duration_days,
        duration_months: project.duration_months,
        profit_share_pct: project.profit_share_pct,
        min_invest_amount: project.min_invest_amount,
        max_invest_amount: project.max_invest_amount,
    }

    const changedFields = DIFF_FIELDS.filter(f => {
        if (!snapshot) return false
        const oldVal = snapshot[f.key]
        const newVal = current[f.key]
        return oldVal !== undefined && String(oldVal) !== String(newVal ?? '')
    })

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-[680px] max-h-[90vh] overflow-y-auto p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-lg font-bold text-foreground">{project.title}</h2>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                                รอตรวจสอบ
                            </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground">แก้ไขเมื่อ {fmtDate(project.UpdatedAt)}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {/* Project Info */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4 flex justify-between text-[13px]">
                    <div>
                        <span className="text-muted-foreground">เจ้าของโปรเจกต์</span>
                        <span className="font-medium ml-2">
                            {project.owner ? `${project.owner.first_name} ${project.owner.last_name}`.trim() : `#${project.owner_user_id}`}
                        </span>
                    </div>
                    <button
                        onClick={() => navigate(`/admin/projects/${project.id}`)}
                        className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                        ดูโปรเจกต์ <ExternalLink size={10} />
                    </button>
                </div>

                {/* Diff */}
                <div className="border border-border rounded-xl overflow-hidden mb-4">
                    <div className="bg-[#f8f9fc] px-4 py-2.5">
                        <p className="text-[13px] font-semibold text-foreground">การเปลี่ยนแปลง</p>
                    </div>
                    {!snapshot ? (
                        <p className="text-[13px] text-muted-foreground text-center py-6">ไม่พบข้อมูลเปรียบเทียบ</p>
                    ) : changedFields.length === 0 ? (
                        <p className="text-[13px] text-muted-foreground text-center py-6">ไม่มีฟิลด์ที่เปลี่ยนแปลง (อาจแก้แค่รูปภาพ/สื่อ)</p>
                    ) : (
                        <div className="divide-y divide-border">
                            {changedFields.map(f => {
                                const oldVal = snapshot![f.key]
                                const newVal = current[f.key]
                                const render = (v: unknown) => f.fmt ? f.fmt(v) : String(v ?? '-')
                                return (
                                    <div key={f.key} className="px-4 py-3 flex flex-col gap-1.5">
                                        <p className="text-[12px] font-semibold text-foreground">{f.label}</p>
                                        <div className="flex items-start gap-2 text-[12px]">
                                            <span className="flex-1 bg-red-50 text-red-600 rounded-lg px-2.5 py-1.5 line-through whitespace-pre-wrap break-words">{render(oldVal)}</span>
                                            <span className="flex-1 bg-green-50 text-green-700 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-words">{render(newVal)}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-border">
                    <button
                        onClick={onReject}
                        className="px-4 py-2 text-[13px] rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center gap-2 cursor-pointer"
                    >
                        <XCircle size={14} /> ปฏิเสธ (revert กลับเป็นเดิม)
                    </button>
                    <button
                        onClick={onApprove}
                        className="px-4 py-2 text-[13px] rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 cursor-pointer"
                    >
                        <CheckCircle size={14} /> อนุมัติการแก้ไข
                    </button>
                </div>
            </div>
        </div>
    )
}

const AdminProjectEditRequests = () => {
    const { pendingEditProjects: projects, isPendingEditLoading: isLoading, fetchPendingEditProjects, resolveProjectEdit } = useAdminStore()
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<PendingEditProject | null>(null)

    const fetchBadges = useAdminBadgeStore((s) => s.fetchBadges)

    useEffect(() => {
        fetchPendingEditProjects().catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
    }, [fetchPendingEditProjects])

    const handleResolve = async (action: 'approve-edit' | 'reject-edit') => {
        if (!selected) return
        const isApprove = action === 'approve-edit'
        const result = await Swal.fire({
            title: isApprove ? 'ยืนยันอนุมัติการแก้ไข?' : 'ยืนยันปฏิเสธการแก้ไข?',
            text: isApprove
                ? 'ข้อมูลที่ Pioneer แก้ไขจะถูกใช้จริง โปรเจกต์จะกลับสู่สถานะเดิม'
                : 'ข้อมูลจะถูก revert กลับเป็นเวอร์ชันก่อนแก้ไขทั้งหมด',
            icon: isApprove ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonText: isApprove ? 'ยืนยัน อนุมัติ' : 'ยืนยัน ปฏิเสธ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: isApprove ? '#16A34A' : '#DC2626',
            cancelButtonColor: '#6B7280',
            reverseButtons: true,
        })
        if (!result.isConfirmed) return

        try {
            await resolveProjectEdit(selected.id, action)
            toast.success(isApprove ? 'อนุมัติการแก้ไขแล้ว' : 'ปฏิเสธการแก้ไขแล้ว ข้อมูล revert กลับเป็นเดิม')
            setSelected(null)
            fetchPendingEditProjects()
            fetchBadges()
        } catch (err) {
            const msg = err instanceof AxiosError ? err.response?.data?.message : null
            toast.error(msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        }
    }

    const filtered = projects.filter((r) => (r.title ?? '').toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader
                title="คำขอแก้ไขโปรเจกต์"
                subtitle="ตรวจสอบการแก้ไขข้อมูลโปรเจกต์ที่กำลังระดมทุน/ดำเนินการอยู่ จาก Pioneer"
            />

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="ค้นหาชื่อโปรเจกต์..."
                resultCount={filtered.length}
            />

            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                <div className="grid grid-cols-[44px_minmax(0,1fr)_90px_96px] md:grid-cols-[60px_2fr_1fr_1fr_120px] bg-[#f8f9fc] px-2 md:px-4 py-3 font-medium text-gray-500 border-b border-border text-[12px] md:text-[13px]">
                    <div className="text-center">ลำดับ</div>
                    <div>โปรเจกต์</div>
                    <div className="text-center">เจ้าของโปรเจกต์</div>
                    <div className="hidden md:block text-center">แก้ไขเมื่อ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-[10px] text-muted-foreground">
                        <FileEdit size={28} className="opacity-40" />
                        <p className="text-sm">
                            {search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีคำขอแก้ไขโปรเจกต์'}
                        </p>
                    </div>
                ) : (
                    filtered.map((r, index) => (
                        <div
                            key={r.id}
                            onClick={() => setSelected(r)}
                            className="grid grid-cols-[44px_minmax(0,1fr)_90px_96px] md:grid-cols-[60px_2fr_1fr_1fr_120px] px-2 md:px-4 border-b border-border last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <div className="h-14 flex items-center justify-center text-[12px] text-muted-foreground">{index + 1}</div>
                            <div className="h-14 min-w-0 flex flex-col justify-center px-1 md:px-2">
                                <span className="block min-w-0 font-medium text-[12px] md:text-[13px] truncate">{r.title}</span>
                            </div>
                            <div className="h-14 min-w-0 flex justify-center items-center px-1">
                                <span className="block max-w-full truncate text-center text-[11px] md:text-[13px] text-muted-foreground">
                                    {r.owner ? `${r.owner.first_name} ${r.owner.last_name}`.trim() : `#${r.owner_user_id}`}
                                </span>
                            </div>
                            <div className="hidden md:flex h-14 justify-center items-center">
                                <span className="text-[13px] text-muted-foreground">{fmtDate(r.UpdatedAt)}</span>
                            </div>
                            <div className="h-14 flex justify-center items-center">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelected(r) }}
                                    className="px-2.5 md:px-3 py-1.5 rounded-lg bg-[#F1F3F5] hover:bg-[#E9ECEF] text-[11px] md:text-[12px] font-medium text-foreground cursor-pointer whitespace-nowrap"
                                >
                                    ดูรายละเอียด
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selected && (
                <DetailModal
                    project={selected}
                    onClose={() => setSelected(null)}
                    onApprove={() => handleResolve('approve-edit')}
                    onReject={() => handleResolve('reject-edit')}
                />
            )}
        </div>
    )
}

export default AdminProjectEditRequests
