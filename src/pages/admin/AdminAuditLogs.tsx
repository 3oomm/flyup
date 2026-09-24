import { useEffect, useState } from 'react'
import { FileText, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import PageHeader from '../../components/admin/PageHeader'
import { useAdminLogStore, type AdminLogItem } from '../../store/useAdminLogStore'

// ─── Label Maps ──────────────────────────────────────────────────────────────

const ACTION_LABEL: Record<string, string> = {
    approve_student_card:   'อนุมัติบัตรนักศึกษา',
    reject_student_card:    'ปฏิเสธบัตรนักศึกษา',
    approve_id_card:        'อนุมัติบัตรประชาชน',
    reject_id_card:         'ปฏิเสธบัตรประชาชน',
    suspend_user:           'ระงับผู้ใช้',
    rollback_user:          'คืนสถานะผู้ใช้',
    approve_project:        'อนุมัติโปรเจกต์',
    reject_project:         'ปฏิเสธโปรเจกต์',
    approve_cancel:         'อนุมัติยกเลิก',
    reject_cancel:          'ปฏิเสธยกเลิก',
    approve_milestone:      'อนุมัติ Milestone',
    reject_milestone:       'ปฏิเสธ Milestone',
    approve_refund:         'อนุมัติคืนเงิน',
    resolve_complaint:      'แก้ไขร้องเรียน',
    reject_complaint:       'ปฏิเสธร้องเรียน',
    confirm_disbursement:   'ยืนยันการเบิกจ่าย',
    confirm_profit_payout:  'ยืนยันจ่ายกำไร',
    suspend_project:        'ระงับโปรเจกต์',
    unsuspend_project:      'ยกเลิกระงับโปรเจกต์',
}

const ACTION_BADGE: Record<string, string> = {
    approve_student_card:   'bg-green-50 text-green-700 border-green-200',
    approve_id_card:        'bg-green-50 text-green-700 border-green-200',
    approve_project:        'bg-green-50 text-green-700 border-green-200',
    approve_cancel:         'bg-green-50 text-green-700 border-green-200',
    approve_milestone:      'bg-green-50 text-green-700 border-green-200',
    approve_refund:         'bg-green-50 text-green-700 border-green-200',
    resolve_complaint:      'bg-green-50 text-green-700 border-green-200',
    confirm_disbursement:   'bg-green-50 text-green-700 border-green-200',
    confirm_profit_payout:  'bg-green-50 text-green-700 border-green-200',
    rollback_user:          'bg-blue-50 text-blue-700 border-blue-200',
    unsuspend_project:      'bg-blue-50 text-blue-700 border-blue-200',
    reject_student_card:    'bg-red-50 text-red-700 border-red-200',
    reject_id_card:         'bg-red-50 text-red-700 border-red-200',
    reject_project:         'bg-red-50 text-red-700 border-red-200',
    reject_cancel:          'bg-red-50 text-red-700 border-red-200',
    reject_milestone:       'bg-red-50 text-red-700 border-red-200',
    reject_complaint:       'bg-red-50 text-red-700 border-red-200',
    suspend_user:           'bg-orange-50 text-orange-700 border-orange-200',
    suspend_project:        'bg-orange-50 text-orange-700 border-orange-200',
}

const TARGET_LABEL: Record<string, string> = {
    user:           'ผู้ใช้',
    project:        'โปรเจกต์',
    investment:     'การลงทุน',
    milestone:      'Milestone',
    complaint:      'ร้องเรียน',
    disbursement:   'การเบิกจ่าย',
    profit_payout:  'กำไร',
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('th-TH', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })

// ─── Row ─────────────────────────────────────────────────────────────────────

const LogRow = ({ log, sequence, onView }: { log: AdminLogItem; sequence: number; onView: () => void }) => {
    const badgeClass = ACTION_BADGE[log.action] ?? 'bg-gray-50 text-gray-600 border-gray-200'
    const actionLabel = ACTION_LABEL[log.action] ?? log.action
    const targetLabel = TARGET_LABEL[log.target_type] ?? log.target_type
    const adminName = log.admin
        ? `${log.admin.first_name} ${log.admin.last_name}`.trim() || log.admin.email
        : `Admin #${log.admin_id}`

    return (
        <div className="grid grid-cols-[40px_92px_minmax(0,1fr)_92px] md:grid-cols-[60px_160px_180px_1fr_120px_80px_1fr] px-2 md:px-4 py-3 items-start border-b border-border last:border-0 hover:bg-muted/30 transition-colors text-[13px]">
            <div className="text-center text-muted-foreground text-[12px] pt-0.5">{sequence}</div>
            <div className="text-muted-foreground text-[12px] pt-0.5">{formatDate(log.created_at)}</div>
            <div className="hidden md:block">
                <p className="font-medium text-foreground">{adminName}</p>
                {log.admin?.email && (
                    <p className="text-[11px] text-muted-foreground truncate">{log.admin.email}</p>
                )}
            </div>
            <div className="min-w-0 overflow-hidden">
                <span className={`inline-block max-w-full truncate text-[10px] md:text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                    {actionLabel}
                </span>
            </div>
            <div className="hidden md:block text-muted-foreground">{targetLabel}</div>
            <div className="hidden md:block text-muted-foreground">
                {log.target_id ? `#${log.target_id}` : '—'}
            </div>
            <div className="hidden md:block text-muted-foreground text-[12px] wrap-break-word">
                {log.note ?? '—'}
            </div>
            <div className="flex md:hidden justify-center">
                <button
                    onClick={onView}
                    className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
                >
                    ดูรายละเอียด
                </button>
            </div>
        </div>
    )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const AdminAuditLogs = () => {
    const { logs, meta, isLoading, filter, setFilter, fetchLogs } = useAdminLogStore()
    const [selectedLog, setSelectedLog] = useState<AdminLogItem | null>(null)

    useEffect(() => { fetchLogs() }, [fetchLogs])

    const totalPages = Math.max(1, Math.ceil(meta.total / meta.page_size))

    const handleFilterChange = (key: string, value: string) => {
        setFilter({ [key]: value || undefined, page: 1 })
    }

    const applyFilters = () => fetchLogs()

    const handlePageChange = (p: number) => {
        setFilter({ page: p })
        fetchLogs()
    }

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader title="บันทึกการตรวจสอบ" subtitle="ประวัติการกระทำของ admin (อนุมัติ/ระงับ/แก้ไข)" />

            {/* Filters */}
            <div className="bg-white rounded-xl border border-border p-4 mx-2.5 flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Action</label>
                    <select
                        value={filter.action ?? ''}
                        onChange={e => handleFilterChange('action', e.target.value)}
                        className="h-9 px-3 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">ทั้งหมด</option>
                        {Object.entries(ACTION_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Target Type</label>
                    <select
                        value={filter.target_type ?? ''}
                        onChange={e => handleFilterChange('target_type', e.target.value)}
                        className="h-9 px-3 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">ทั้งหมด</option>
                        {Object.entries(TARGET_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground">ตั้งแต่วันที่</label>
                    <input
                        type="date"
                        value={filter.from ?? ''}
                        onChange={e => handleFilterChange('from', e.target.value)}
                        className="h-9 px-3 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground">ถึงวันที่</label>
                    <input
                        type="date"
                        value={filter.to ?? ''}
                        onChange={e => handleFilterChange('to', e.target.value)}
                        className="h-9 px-3 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                <button
                    onClick={applyFilters}
                    className="h-9 px-5 bg-primary text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                    ค้นหา
                </button>

                <button
                    onClick={() => { setFilter({ action: undefined, target_type: undefined, from: undefined, to: undefined, page: 1 }); fetchLogs() }}
                    className="h-9 px-4 border border-border rounded-lg text-[13px] text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                    ล้าง
                </button>

                <span className="ml-auto text-[12px] text-muted-foreground self-center">
                    ทั้งหมด {meta.total.toLocaleString()} รายการ
                </span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-border mx-2.5 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[40px_92px_minmax(0,1fr)_92px] md:grid-cols-[60px_160px_180px_1fr_120px_80px_1fr] px-2 md:px-4 py-3 bg-muted/40 font-medium text-[11px] md:text-[12px] text-muted-foreground border-b border-border">
                    <div className="text-center">ลำดับ</div>
                    <div>วันที่/เวลา</div>
                    <div className="hidden md:block">Admin</div>
                    <div>Action</div>
                    <div className="hidden md:block">ประเภท</div>
                    <div className="hidden md:block">ID</div>
                    <div className="hidden md:block">หมายเหตุ</div>
                    <div className="md:hidden text-center">จัดการ</div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={28} className="animate-spin text-primary" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                        <FileText size={32} className="opacity-30" />
                        <p className="text-[13px]">ไม่มีบันทึก</p>
                    </div>
                ) : (
                    logs.map((log, index) => (
                        <LogRow
                            key={log.id}
                            log={log}
                            sequence={(filter.page - 1) * meta.page_size + index + 1}
                            onView={() => setSelectedLog(log)}
                        />
                    ))
                )}
            </div>

            {selectedLog && (
                <div
                    className="fixed inset-y-0 left-0 right-0 lg:left-[230px] z-40 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold">รายละเอียดบันทึกการตรวจสอบ</h2>
                                <p className="mt-1 text-[12px] text-muted-foreground">{formatDate(selectedLog.created_at)}</p>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="ปิด"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="divide-y divide-border rounded-xl border border-border text-[13px]">
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">Admin</span>
                                <div className="min-w-0">
                                    <p className="font-medium">
                                        {selectedLog.admin
                                            ? `${selectedLog.admin.first_name} ${selectedLog.admin.last_name}`.trim() || selectedLog.admin.email
                                            : `Admin #${selectedLog.admin_id}`}
                                    </p>
                                    {selectedLog.admin?.email && (
                                        <p className="break-all text-[11px] text-muted-foreground">{selectedLog.admin.email}</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">Action</span>
                                <span className="font-medium">{ACTION_LABEL[selectedLog.action] ?? selectedLog.action}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">ประเภท</span>
                                <span className="font-medium">{TARGET_LABEL[selectedLog.target_type] ?? selectedLog.target_type}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">ID</span>
                                <span className="font-medium">{selectedLog.target_id ? `#${selectedLog.target_id}` : '—'}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">หมายเหตุ</span>
                                <span className="wrap-break-word font-medium">{selectedLog.note ?? '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pb-4">
                    <button
                        onClick={() => handlePageChange(filter.page - 1)}
                        disabled={filter.page <= 1}
                        className="p-2 rounded-lg border border-border hover:bg-muted cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={15} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        const p = totalPages <= 7 ? i + 1 : filter.page <= 4
                            ? i + 1
                            : filter.page >= totalPages - 3
                                ? totalPages - 6 + i
                                : filter.page - 3 + i
                        return (
                            <button
                                key={p}
                                onClick={() => handlePageChange(p)}
                                className={`w-8 h-8 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                                    p === filter.page ? 'bg-primary text-white' : 'border border-border hover:bg-muted text-foreground'
                                }`}
                            >
                                {p}
                            </button>
                        )
                    })}
                    <button
                        onClick={() => handlePageChange(filter.page + 1)}
                        disabled={filter.page >= totalPages}
                        className="p-2 rounded-lg border border-border hover:bg-muted cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>
            )}
        </div>
    )
}

export default AdminAuditLogs
