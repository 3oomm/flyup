import { useEffect, useState } from 'react'
import { Loader2, FolderX, CheckCircle, XCircle, Clock, X, ExternalLink, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import SearchBar from '../../components/admin/SearchBar'
import StatusBadge from '../../components/admin/StatusBadge'
import PageHeader from '../../components/admin/PageHeader'
import { useAdminBadgeStore } from '../../store/useAdminBadgeStore'
import { useAdminStore, type CancelProjectRequest as CancelProject, type CancelPreview } from '../../store/useAdminStore'

const STATE_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending_cancel:  { label: 'รอดำเนินการ', className: 'bg-amber-50 text-amber-600 border border-amber-200', icon: <Clock size={12} /> },
    cancelled:       { label: 'อนุมัติแล้ว',  className: 'bg-green-50 text-green-600 border border-green-200',  icon: <CheckCircle size={12} /> },
    cancel_rejected: { label: 'ปฏิเสธแล้ว',  className: 'bg-red-50 text-red-600 border border-red-200',         icon: <XCircle size={12} /> },
}

const FALLBACK_BADGE = { label: 'ไม่ทราบสถานะ', className: 'bg-gray-50 text-gray-500 border border-gray-200', icon: null }

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

const DetailModal = ({
    project,
    preview,
    isLoadingPreview,
    onClose,
    onApprove,
    onReject,
}: {
    project: CancelProject
    preview: CancelPreview | null
    isLoadingPreview: boolean
    onClose: () => void
    onApprove: () => void
    onReject: () => void
}) => {
    const navigate = useNavigate()
    const badge = STATE_CONFIG[project.state] ?? FALLBACK_BADGE
    const isPending = project.state === 'pending_cancel'

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
                            <StatusBadge label={badge.label} className={badge.className} icon={badge.icon} />
                        </div>
                        <p className="text-[12px] text-muted-foreground">ส่งเมื่อ {fmtDate(project.UpdatedAt)}</p>
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

                {/* Reason */}
                <div className="mb-4">
                    <p className="text-[13px] font-semibold text-foreground mb-2">เหตุผลที่ขอยกเลิก</p>
                    <p className="text-[13px] bg-white border border-border rounded-lg px-3 py-2">
                        {project.cancel_reason || '-'}
                    </p>
                </div>

                {project.cancel_description && (
                    <div className="mb-4">
                        <p className="text-[13px] font-semibold text-foreground mb-2">รายละเอียดเพิ่มเติม</p>
                        <p className="text-[13px] whitespace-pre-wrap leading-relaxed bg-white border border-border rounded-lg p-3">
                            {project.cancel_description}
                        </p>
                    </div>
                )}

                {/* Refund Preview */}
                <div className="border border-border rounded-xl overflow-hidden mb-4">
                    <div className="bg-surface-table px-4 py-2.5 flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-foreground">สรุปการคืนเงิน</p>
                        {isLoadingPreview && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                    </div>

                    {isLoadingPreview ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="animate-spin text-muted-foreground" size={24} />
                        </div>
                    ) : preview ? (
                        <div className="p-4 flex flex-col gap-4">
                            {/* Funding summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <p className="text-[11px] text-blue-600 mb-1">ทุนระดมได้ทั้งหมด</p>
                                    <p className="text-[14px] font-bold text-blue-700">฿{fmt(preview.total_funding)}</p>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-3 text-center">
                                    <p className="text-[11px] text-orange-600 mb-1">เบิกจ่ายไปแล้ว</p>
                                    <p className="text-[14px] font-bold text-orange-700">฿{fmt(preview.total_disbursed)}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <p className="text-[11px] text-green-600 mb-1">คืนให้นักลงทุน</p>
                                    <p className="text-[14px] font-bold text-green-700">฿{fmt(preview.refundable_amount)}</p>
                                </div>
                            </div>

                            {/* Milestones */}
                            {preview.milestones.length > 0 && (
                                <div>
                                    <p className="text-[12px] font-semibold text-muted-foreground mb-2">สถานะ Milestone</p>
                                    <div className="flex flex-col gap-1">
                                        {preview.milestones.map((m) => (
                                            <div key={m.phase_no} className="flex items-center justify-between text-[12px] py-1.5 px-3 rounded-lg bg-gray-50">
                                                <div className="flex items-center gap-2">
                                                    <ChevronRight size={12} className="text-muted-foreground" />
                                                    <span className="font-medium">Phase {m.phase_no}</span>
                                                    <span className="text-muted-foreground truncate max-w-[180px]">{m.title}</span>
                                                    <span className="text-muted-foreground">({m.percent_release}%)</span>
                                                </div>
                                                {m.is_confirmed ? (
                                                    <span className="text-orange-600 font-medium">เบิกแล้ว ฿{fmt(m.disbursed_amount)}</span>
                                                ) : (
                                                    <span className="text-green-600">ยังไม่เบิก</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Investors */}
                            {preview.investors.length > 0 && (
                                <div>
                                    <p className="text-[12px] font-semibold text-muted-foreground mb-2">รายการคืนเงินนักลงทุน ({preview.investors.length} ราย)</p>
                                    <div className="border border-border rounded-lg overflow-hidden">
                                        <div className="grid grid-cols-[60px_1fr_100px_100px] bg-surface-table px-3 py-2 text-[11px] font-medium text-gray-500 border-b border-border">
                                            <div className="text-center">ลำดับ</div>
                                            <div>นักลงทุน</div>
                                            <div className="text-right">ลงทุน</div>
                                            <div className="text-right">ได้คืน</div>
                                        </div>
                                        {preview.investors.map((inv, index) => (
                                            <div key={inv.user_id} className="grid grid-cols-[60px_1fr_100px_100px] px-3 py-2 border-b border-border last:border-0 text-[12px]">
                                                <div className="text-center text-muted-foreground">{index + 1}</div>
                                                <div>
                                                    <p className="font-medium">{inv.first_name} {inv.last_name}</p>
                                                    <p className="text-[11px] text-muted-foreground">{inv.email}</p>
                                                </div>
                                                <div className="text-right text-muted-foreground">฿{fmt(inv.total_amount)}</div>
                                                <div className="text-right font-medium text-green-700">฿{fmt(inv.refund_amount)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-[13px] text-muted-foreground text-center py-6">ไม่สามารถโหลดข้อมูลการคืนเงินได้</p>
                    )}
                </div>

                {isPending && (
                    <div className="flex gap-2 justify-end pt-2 border-t border-border">
                        <button
                            data-testid="cancel-request-reject-open-btn"
                            onClick={onReject}
                            className="px-4 py-2 text-[13px] rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center gap-2 cursor-pointer"
                        >
                            <XCircle size={14} /> ปฏิเสธ
                        </button>
                        <button
                            data-testid="cancel-request-approve-open-btn"
                            onClick={onApprove}
                            className="px-4 py-2 text-[13px] rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 cursor-pointer"
                        >
                            <CheckCircle size={14} /> อนุมัติ & คืนเงินนักลงทุน
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

const ConfirmModal = ({
    project,
    mode,
    onClose,
    onConfirm,
    isSubmitting,
}: {
    project: CancelProject
    mode: 'approve' | 'reject'
    onClose: () => void
    onConfirm: (note: string) => Promise<void>
    isSubmitting: boolean
}) => {
    const [note, setNote] = useState('')
    const isApprove = mode === 'approve'

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-[460px] p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-bold text-foreground">
                        {isApprove ? 'ยืนยันอนุมัติการยกเลิก' : 'ปฏิเสธคำขอยกเลิก'}
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
                        <X size={18} />
                    </button>
                </div>
                <p className="text-[13px] text-muted-foreground mb-1">
                    โปรเจกต์: <span className="font-medium text-foreground">{project.title}</span>
                </p>
                {isApprove && (
                    <p className="text-[12px] text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-4">
                        ระบบจะคืนเงินให้นักลงทุนทุกรายอัตโนมัติหลังอนุมัติ
                    </p>
                )}
                <div className="flex flex-col gap-1 mb-5">
                    <label className="text-[13px] font-medium">
                        หมายเหตุจาก Admin <span className="text-error">*</span>
                    </label>
                    <textarea
                        data-testid="cancel-request-note-input"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={4}
                        placeholder={isApprove ? 'ยืนยันการอนุมัติและแจ้งขั้นตอนต่อไป' : 'เหตุผลที่ปฏิเสธคำขอยกเลิก'}
                        className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary resize-none"
                    />
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border hover:bg-gray-50 cursor-pointer">
                        ยกเลิก
                    </button>
                    <button
                        data-testid="cancel-request-confirm-btn"
                        onClick={() => onConfirm(note)}
                        disabled={isSubmitting}
                        className={`px-4 py-2 text-[13px] rounded-lg text-white disabled:opacity-50 flex items-center gap-2 cursor-pointer ${
                            isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : isApprove ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {isApprove ? 'อนุมัติ' : 'ปฏิเสธ'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const AdminCancelRequests = () => {
    const { cancelRequests: projects, isCancelRequestsLoading: isLoading, fetchCancelRequests, fetchCancelPreview, resolveCancelRequest } = useAdminStore()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<CancelProject | null>(null)
    const [preview, setPreview] = useState<CancelPreview | null>(null)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)
    const [modalMode, setModalMode] = useState<'approve' | 'reject' | null>(null)

    const fetchBadges = useAdminBadgeStore((s) => s.fetchBadges)

    useEffect(() => {
        fetchCancelRequests().catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
    }, [fetchCancelRequests])

    const openDetail = async (project: CancelProject) => {
        setSelected(project)
        setPreview(null)
        setIsLoadingPreview(true)
        const data = await fetchCancelPreview(project.id)
        setPreview(data)
        setIsLoadingPreview(false)
    }

    const handleConfirm = async (note: string) => {
        if (!selected || !modalMode) return
        setIsSubmitting(true)
        try {
            const action = modalMode === 'approve' ? 'approve-cancel' : 'reject-cancel'
            await resolveCancelRequest(selected.id, action, note)
            toast.success(modalMode === 'approve' ? 'อนุมัติการยกเลิกและคืนเงินนักลงทุนแล้ว' : 'ปฏิเสธคำขอยกเลิกแล้ว')
            setModalMode(null)
            setSelected(null)
            setPreview(null)
            fetchCancelRequests()
            fetchBadges()
        } catch (err) {
            const msg = err instanceof AxiosError ? err.response?.data?.message : null
            toast.error(msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        } finally {
            setIsSubmitting(false)
        }
    }

    const filtered = projects.filter((r) => {
        const q = search.toLowerCase()
        return (
            (r.title ?? '').toLowerCase().includes(q) ||
            (r.cancel_reason ?? '').toLowerCase().includes(q)
        )
    })

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader
                title="คำขอยกเลิกโปรเจกต์"
                subtitle="ตรวจสอบและอนุมัติคำขอยกเลิกโปรเจกต์จาก Pioneer"
            />

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="ค้นหาชื่อโปรเจกต์ หรือเหตุผล..."
                resultCount={filtered.length}
            />

            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                <div className="grid grid-cols-[44px_minmax(0,1fr)_90px_96px] md:grid-cols-[60px_2fr_1fr_2fr_120px_120px] bg-surface-table px-2 md:px-4 py-3 font-medium text-gray-500 border-b border-border text-[12px] md:text-[13px]">
                    <div className="text-center">ลำดับ</div>
                    <div>โปรเจกต์</div>
                    <div className="text-center">เจ้าของโปรเจกต์</div>
                    <div className="hidden md:block">เหตุผล</div>
                    <div className="hidden md:block text-center">สถานะ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-[10px] text-muted-foreground">
                        <FolderX size={28} className="opacity-40" />
                        <p className="text-sm">
                            {search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีคำขอยกเลิกโปรเจกต์'}
                        </p>
                    </div>
                ) : (
                    filtered.map((r, index) => {
                        const badge = STATE_CONFIG[r.state] ?? FALLBACK_BADGE
                        return (
                            <div
                                key={r.id}
                                onClick={() => openDetail(r)}
                                className="grid grid-cols-[44px_minmax(0,1fr)_90px_96px] md:grid-cols-[60px_2fr_1fr_2fr_120px_120px] px-2 md:px-4 border-b border-border last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <div className="h-14 flex items-center justify-center text-[12px] text-muted-foreground">{index + 1}</div>
                                <div className="h-14 min-w-0 flex flex-col justify-center px-1 md:px-2">
                                    <span className="block min-w-0 font-medium text-[12px] md:text-[13px] truncate">{r.title}</span>
                                    <span className="hidden md:block text-[11px] text-muted-foreground">{fmtDate(r.UpdatedAt)}</span>
                                </div>
                                <div className="h-14 min-w-0 flex justify-center items-center px-1">
                                    <span className="block max-w-full truncate text-center text-[11px] md:text-[13px] text-muted-foreground">
                                        {r.owner ? `${r.owner.first_name} ${r.owner.last_name}`.trim() : `#${r.owner_user_id}`}
                                    </span>
                                </div>
                                <div className="hidden md:flex h-14 items-center px-2">
                                    <span className="text-[13px] truncate">{r.cancel_reason || '-'}</span>
                                </div>
                                <div className="hidden md:flex h-14 justify-center items-center">
                                    <StatusBadge label={badge.label} className={badge.className} icon={badge.icon} />
                                </div>
                                <div className="h-14 flex justify-center items-center">
                                    <button
                                        data-testid={`cancel-request-detail-btn-${r.id}`}
                                        onClick={(e) => { e.stopPropagation(); openDetail(r) }}
                                        className="px-2.5 md:px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-raised text-[11px] md:text-[12px] font-medium text-foreground cursor-pointer whitespace-nowrap"
                                    >
                                        ดูรายละเอียด
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {selected && !modalMode && (
                <DetailModal
                    project={selected}
                    preview={preview}
                    isLoadingPreview={isLoadingPreview}
                    onClose={() => { setSelected(null); setPreview(null) }}
                    onApprove={() => setModalMode('approve')}
                    onReject={() => setModalMode('reject')}
                />
            )}

            {selected && modalMode && (
                <ConfirmModal
                    project={selected}
                    mode={modalMode}
                    onClose={() => setModalMode(null)}
                    onConfirm={handleConfirm}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    )
}

export default AdminCancelRequests
