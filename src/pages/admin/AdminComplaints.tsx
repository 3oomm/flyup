import { useEffect, useState } from 'react'
import { Loader2, MessageSquareWarning, CheckCircle, XCircle, Clock, X, ExternalLink, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useComplaintStore, type Complaint, type ComplaintStatus, COMPLAINT_THRESHOLD } from '../../store/useComplaintStore'
import { useAdminBadgeStore } from '../../store/useAdminBadgeStore'
import SearchBar from '../../components/admin/SearchBar'
import FilterTabs from '../../components/admin/FilterTabs'
import StatusBadge from '../../components/admin/StatusBadge'
import PageHeader from '../../components/admin/PageHeader'

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; className: string; icon: React.ReactNode }> = {
    open:     { label: 'รอดำเนินการ', className: 'bg-amber-50 text-amber-600 border border-amber-200',   icon: <Clock size={12} /> },
    resolved: { label: 'ปิดเรื่องแล้ว', className: 'bg-green-50 text-green-600 border border-green-200', icon: <CheckCircle size={12} /> },
    rejected: { label: 'ปฏิเสธแล้ว',  className: 'bg-red-50 text-red-600 border border-red-200',         icon: <XCircle size={12} /> },
}

const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

const ADMIN_NOTE_MAX_LENGTH = 2000

const ResolveModal = ({
    complaint,
    mode,
    onClose,
    onConfirm,
    isSubmitting,
}: {
    complaint: Complaint
    mode: 'resolve' | 'reject'
    onClose: () => void
    onConfirm: (note: string) => Promise<void>
    isSubmitting: boolean
}) => {
    const [note, setNote] = useState('')
    const isResolve = mode === 'resolve'
    const noteLength = Array.from(note.trim()).length
    const noteValid = noteLength >= 3 && noteLength <= ADMIN_NOTE_MAX_LENGTH
    return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-[460px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-bold text-foreground">
                        {isResolve ? 'ปิดคำร้องเรียน' : 'ปฏิเสธคำร้องเรียน'}
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                </div>
                <p className="text-[13px] text-muted-foreground mb-4">เรื่อง: <span className="font-medium text-foreground">{complaint.subject}</span></p>
                <div className="flex flex-col gap-1 mb-5">
                    <label className="text-[13px] font-medium">หมายเหตุจากผู้ตรวจ <span className="text-error">*</span></label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={4}
                        placeholder={isResolve ? 'อธิบายผลการตรวจสอบและการดำเนินการ' : 'เหตุผลที่ปฏิเสธคำร้องเรียนนี้'}
                        className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary resize-none"
                    />
                    <span className="self-end text-[11px] text-muted-foreground" aria-live="polite">
                        {noteLength}/{ADMIN_NOTE_MAX_LENGTH.toLocaleString()} ตัวอักษร (อย่างน้อย 3)
                    </span>
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border hover:bg-gray-50">ยกเลิก</button>
                    <button
                        onClick={() => onConfirm(note.trim())}
                        disabled={!noteValid || isSubmitting}
                        className={`px-4 py-2 text-[13px] rounded-lg text-white disabled:opacity-50 flex items-center gap-2 ${
                            isResolve ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : isResolve ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {isResolve ? 'ปิดเรื่อง' : 'ปฏิเสธ'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const DetailModal = ({
    complaint,
    onClose,
    onResolve,
    onReject,
}: {
    complaint: Complaint
    onClose: () => void
    onResolve: () => void
    onReject: () => void
}) => {
    const navigate = useNavigate()
    const status = STATUS_CONFIG[complaint.status]
    const fullName = complaint.complainant ? `${complaint.complainant.first_name} ${complaint.complainant.last_name}` : '-'
    const isOpen = complaint.status === 'open'
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-lg font-bold text-foreground">{complaint.subject}</h2>
                            <StatusBadge label={status.label} className={status.className} icon={status.icon} />
                        </div>
                        <p className="text-[12px] text-muted-foreground">ส่งเมื่อ {fmtDate(complaint.created_at)}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4 flex flex-col gap-2 text-[13px]">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">ผู้ร้องเรียน</span>
                        <div className="text-right">
                            <div className="font-medium">{fullName}</div>
                            <div className="text-[11px] text-muted-foreground">{complaint.complainant?.email ?? '-'}</div>
                        </div>
                    </div>
                    <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">โปรเจกต์</span>
                        <div className="text-right">
                            <div className="font-medium">{complaint.project?.title ?? `ID: ${complaint.project_id}`}</div>
                            {complaint.project_id > 0 && (
                                <button
                                    onClick={() => {
                                        const target = complaint.project?.state === 'pending_review'
                                            ? `/admin/projects/${complaint.project_id}`
                                            : `/projects/${(complaint.project as { slug?: string })?.slug || complaint.project_id}`;
                                        navigate(target);
                                    }}
                                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                                >
                                    เปิดหน้าโปรเจกต์ <ExternalLink size={10} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Report Stats */}
                {complaint.total_reports > 0 && (() => {
                    const resolved = complaint.resolved_reports ?? 0
                    const total = complaint.total_reports ?? 0
                    const pct = Math.min((resolved / COMPLAINT_THRESHOLD) * 100, 100)
                    const willSuspend = resolved >= COMPLAINT_THRESHOLD
                    const nearThreshold = !willSuspend && resolved >= COMPLAINT_THRESHOLD - 1
                    return (
                        <div className={`rounded-xl p-4 mb-4 border ${willSuspend ? 'bg-red-50 border-red-200' : nearThreshold ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-border'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                                    {(willSuspend || nearThreshold) && <TriangleAlert size={13} className={willSuspend ? 'text-red-500' : 'text-amber-500'} />}
                                    <span className={willSuspend ? 'text-red-700' : nearThreshold ? 'text-amber-700' : 'text-foreground'}>
                                        สถิติรายงานโปรเจกต์นี้
                                    </span>
                                </div>
                                <span className={`text-[12px] font-bold ${willSuspend ? 'text-red-600' : 'text-foreground'}`}>
                                    {resolved} / {COMPLAINT_THRESHOLD} อนุมัติ
                                </span>
                            </div>
                            <div className="w-full bg-white rounded-full h-2 border border-border overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${willSuspend ? 'bg-red-500' : nearThreshold ? 'bg-amber-400' : 'bg-primary'}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground">
                                <span>รายงานทั้งหมด {total} ครั้ง</span>
                                {willSuspend
                                    ? <span className="text-red-600 font-medium">โปรเจกต์ถูกระงับอัตโนมัติแล้ว</span>
                                    : <span>อีก {COMPLAINT_THRESHOLD - resolved} ครั้งจะระงับอัตโนมัติ</span>
                                }
                            </div>
                        </div>
                    )
                })()}

                <div className="mb-4">
                    <p className="text-[13px] font-semibold text-foreground mb-2">รายละเอียด</p>
                    <p className="text-[13px] text-foreground whitespace-pre-wrap leading-relaxed bg-white border border-border rounded-lg p-3">
                        {complaint.body}
                    </p>
                </div>

                {complaint.evidence && (
                    <div className="mb-4">
                        <p className="text-[13px] font-semibold text-foreground mb-2">หลักฐานประกอบ</p>
                        <a
                            href={complaint.evidence}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline bg-white border border-border rounded-lg px-3 py-2"
                        >
                            <ExternalLink size={13} /> เปิดดูหลักฐาน
                        </a>
                    </div>
                )}

                {complaint.admin_note && (
                    <div className="mb-4">
                        <p className="text-[13px] font-semibold text-foreground mb-2">หมายเหตุจากผู้ตรวจ</p>
                        <p className="text-[13px] text-foreground whitespace-pre-wrap leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">
                            {complaint.admin_note}
                        </p>
                        {complaint.resolved_at && (
                            <p className="text-[11px] text-muted-foreground mt-1">ดำเนินการเมื่อ {fmtDate(complaint.resolved_at)}</p>
                        )}
                    </div>
                )}

                {isOpen && (
                    <div className="flex gap-2 justify-end pt-2 border-t border-border">
                        <button
                            onClick={onReject}
                            className="px-4 py-2 text-[13px] rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center gap-2"
                        >
                            <XCircle size={14} /> ปฏิเสธ
                        </button>
                        <button
                            onClick={onResolve}
                            className="px-4 py-2 text-[13px] rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                        >
                            <CheckCircle size={14} /> ปิดเรื่อง
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

const AdminComplaints = () => {
    const { complaints, isLoading, isSubmitting, fetchAdminList, resolveComplaint, rejectComplaint } = useComplaintStore()
    const fetchBadges = useAdminBadgeStore((s) => s.fetchBadges)
    const [tab, setTab] = useState<ComplaintStatus | 'all'>('open')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<Complaint | null>(null)
    const [modalMode, setModalMode] = useState<'resolve' | 'reject' | null>(null)

    useEffect(() => {
        fetchAdminList(tab)
    }, [tab, fetchAdminList])

    const handleSubmitNote = async (note: string) => {
        if (!selected || !modalMode) return
        const ok = modalMode === 'resolve'
            ? await resolveComplaint(selected.id, note)
            : await rejectComplaint(selected.id, note)
        if (ok) {
            setModalMode(null)
            setSelected(null)
            // resolved_reports/total_reports are project-level aggregates from
            // the API. Refetch so the remaining rows update (e.g. 2/3 -> 3/3)
            // immediately after closing or rejecting a complaint.
            await Promise.all([
                fetchAdminList(tab),
                fetchBadges(),
            ])
        }
    }

    const filtered = complaints
        .filter((c) => tab === 'all' || c.status === tab)
        .filter((c) => {
            const q = search.toLowerCase()
            const fullname = c.complainant ? `${c.complainant.first_name} ${c.complainant.last_name}` : ''
            return (
                c.subject.toLowerCase().includes(q) ||
                c.body.toLowerCase().includes(q) ||
                fullname.toLowerCase().includes(q) ||
                (c.project?.title ?? '').toLowerCase().includes(q)
            )
        })

    const tabs: { key: ComplaintStatus | 'all'; label: string }[] = [
        { key: 'open', label: 'รอดำเนินการ' },
        { key: 'resolved', label: 'ปิดเรื่องแล้ว' },
        { key: 'rejected', label: 'ปฏิเสธแล้ว' },
        { key: 'all', label: 'ทั้งหมด' },
    ]

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader title="คำร้องเรียน" subtitle="รับเรื่องและจัดการคำร้องเรียนจากผู้ใช้" />

            <div className="flex items-center justify-between gap-2 sm:gap-4">
                <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาหัวข้อ ผู้ร้องเรียน หรือโปรเจกต์..." resultCount={filtered.length} />
                <FilterTabs active={tab} onChange={(k) => setTab(k as ComplaintStatus | 'all')} tabs={tabs} />
            </div>

            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                <div className="grid grid-cols-[60px_minmax(0,2fr)_minmax(0,1.5fr)_auto] sm:grid-cols-[60px_2fr_1.5fr_1.5fr_80px_120px_130px] px-4 py-3 bg-muted/40 font-medium text-[12px] text-muted-foreground border-b border-border">
                    <div className="text-center">ลำดับ</div>
                    <div>หัวข้อ</div>
                    <div className="hidden sm:block">ผู้ร้องเรียน</div>
                    <div>โปรเจกต์</div>
                    <div className="hidden sm:block text-center">รายงาน</div>
                    <div className="hidden sm:block text-center">สถานะ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                        <MessageSquareWarning size={28} className="opacity-40" />
                        <p className="text-sm">{search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการคำร้องเรียน'}</p>
                    </div>
                ) : (
                    filtered.map((c, index) => {
                        const status = STATUS_CONFIG[c.status]
                        const fullname = c.complainant ? `${c.complainant.first_name} ${c.complainant.last_name}` : '-'
                        return (
                            <div
                                key={c.id}
                                onClick={() => setSelected(c)}
                                className="grid grid-cols-[60px_minmax(0,2fr)_minmax(0,1.5fr)_auto] sm:grid-cols-[60px_2fr_1.5fr_1.5fr_80px_120px_130px] px-4 py-3 items-center border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                            >
                                <div className="text-center text-[12px] text-muted-foreground">{index + 1}</div>
                                <div className="flex flex-col gap-0.5 pr-3">
                                    <span className="font-medium text-[13px] truncate">{c.subject}</span>
                                    <span className="text-[11px] text-muted-foreground">{fmtDate(c.created_at)}</span>
                                </div>
                                <div className="hidden sm:flex flex-col gap-0.5 pr-3">
                                    <span className="text-[13px] truncate">{fullname}</span>
                                    <span className="text-[11px] text-muted-foreground truncate">{c.complainant?.email ?? ''}</span>
                                </div>
                                <div className="pr-3">
                                    <span className="text-[13px] truncate block">{c.project?.title ?? `ID: ${c.project_id}`}</span>
                                </div>
                                <div className="hidden sm:flex justify-center">
                                    {c.total_reports > 0 && (
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                            c.resolved_reports >= COMPLAINT_THRESHOLD
                                                ? 'bg-red-100 text-red-600'
                                                : c.resolved_reports >= COMPLAINT_THRESHOLD - 1
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {c.resolved_reports}/{COMPLAINT_THRESHOLD}
                                        </span>
                                    )}
                                </div>
                                <div className="hidden sm:flex justify-center">
                                    <StatusBadge label={status.label} className={status.className} icon={status.icon} />
                                </div>
                                <div className="flex justify-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelected(c) }}
                                        className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[12px] font-medium text-foreground transition-colors whitespace-nowrap"
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
                    complaint={selected}
                    onClose={() => setSelected(null)}
                    onResolve={() => setModalMode('resolve')}
                    onReject={() => setModalMode('reject')}
                />
            )}

            {selected && modalMode && (
                <ResolveModal
                    complaint={selected}
                    mode={modalMode}
                    onClose={() => setModalMode(null)}
                    onConfirm={handleSubmitNote}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    )
}

export default AdminComplaints
