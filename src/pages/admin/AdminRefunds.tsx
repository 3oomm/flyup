import { useEffect, useState } from 'react'
import { Loader2, RotateCcw, CheckCircle, Clock } from 'lucide-react'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import Swal from '../../lib/swal'
import { useRefundStore, type RefundRequest } from '../../store/useRefundStore'
import { useAdminBadgeStore } from '../../store/useAdminBadgeStore'
import SearchBar from '../../components/admin/SearchBar'
import StatusBadge from '../../components/admin/StatusBadge'
import PageHeader from '../../components/admin/PageHeader'

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    refund_pending: { label: 'รอดำเนินการ', className: 'bg-amber-50 text-amber-600 border border-amber-200', icon: <Clock size={12} /> },
    refunded:       { label: 'อนุมัติแล้ว', className: 'bg-green-50 text-green-600 border border-green-200', icon: <CheckCircle size={12} /> },
}

const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

const AdminRefunds = () => {
    const { refunds, isLoading, fetchRefunds, approveRefund } = useRefundStore()
    const fetchBadges = useAdminBadgeStore((s) => s.fetchBadges)
    const [search, setSearch] = useState('')
    const [approvingId, setApprovingId] = useState<number | null>(null)

    useEffect(() => {
        fetchRefunds()
    }, [fetchRefunds])

    const handleApprove = async (r: RefundRequest) => {
        const result = await Swal.fire({
            title: 'ยืนยันการอนุมัติคืนเงิน?',
            html: `อนุมัติคืนเงินให้ <b>${r.booster_name || '-'}</b><br/>โปรเจกต์ <b>${r.project_title || '-'}</b> จำนวน <b>฿${(r.refund_amount ?? 0).toLocaleString('th-TH')}</b><br/><span style="font-size:13px;color:#6b7280">การดำเนินการนี้ไม่สามารถยกเลิกได้</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน อนุมัติ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#16A34A',
            cancelButtonColor: '#6B7280',
            reverseButtons: true,
        })
        if (!result.isConfirmed) return

        setApprovingId(r.investment_id)
        try {
            await approveRefund(r.investment_id)
            fetchBadges()
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || 'เกิดข้อผิดพลาด')
        } finally {
            setApprovingId(null)
        }
    }

    const filtered = refunds.filter((r) => {
        const q = search.toLowerCase()
        return (
            (r.project_title ?? '').toLowerCase().includes(q) ||
            (r.booster_name ?? '').toLowerCase().includes(q) ||
            (r.booster_email ?? '').toLowerCase().includes(q)
        )
    })

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader title="การคืนเงิน" subtitle="รายการขอคืนเงินจาก Booster ที่รอการอนุมัติ" />

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="ค้นหาโปรเจกต์หรือ Booster..."
                resultCount={filtered.length}
            />

            {/* Table */}
            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                <div className="grid grid-cols-[44px_minmax(0,1fr)_84px_88px] xl:grid-cols-[60px_minmax(240px,2fr)_minmax(180px,1fr)_minmax(140px,1fr)_120px_160px] bg-surface-table px-2 xl:px-4 py-3 font-medium text-gray-500 border-b border-border text-[12px] xl:text-[13px]">
                    <div className="text-center">ลำดับ</div>
                    <div className="hidden xl:block">โปรเจกต์</div>
                    <div className="text-center">Booster</div>
                    <div className="text-center">จำนวนเงิน</div>
                    <div className="hidden xl:block text-center">สถานะ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-[10px] text-muted-foreground">
                        <RotateCcw size={28} className="opacity-40" />
                        <p className="text-sm">
                            {search ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีรายการขอคืนเงิน'}
                        </p>
                    </div>
                ) : (
                    filtered.map((r, idx) => {
                        const status = STATUS_CONFIG[r.status] ?? STATUS_CONFIG['refund_pending']
                        const isPending = r.status === 'refund_pending'
                        const isApproving = approvingId === r.investment_id

                        return (
                            <div
                                key={r.investment_id}
                                className="grid grid-cols-[44px_minmax(0,1fr)_84px_88px] xl:grid-cols-[60px_minmax(240px,2fr)_minmax(180px,1fr)_minmax(140px,1fr)_120px_160px] border-b border-border last:border-0 hover:bg-gray-50 transition-colors px-2 xl:px-4"
                            >
                                <div className="h-14 flex justify-center items-center text-muted-foreground text-[13px]">
                                    {idx + 1}
                                </div>
                                <div className="hidden xl:flex h-14 flex-col justify-center pr-3">
                                    <span className="font-medium text-[13px] truncate">{r.project_title || '-'}</span>
                                    <span className="text-[11px] text-muted-foreground">
                                        ขอคืน {fmtDate(r.requested_at)}
                                    </span>
                                </div>
                                <div className="h-14 min-w-0 flex flex-col justify-center items-center gap-[2px] px-1">
                                    <span className="block max-w-full text-[12px] xl:text-[13px] truncate">{r.booster_name || '-'}</span>
                                    <span className="block max-w-full text-[10px] xl:text-[11px] text-muted-foreground truncate">{r.booster_email}</span>
                                </div>
                                <div className="h-14 flex justify-center items-center font-semibold text-primary text-[11px] xl:text-[14px]">
                                    ฿{(r.refund_amount ?? 0).toLocaleString('th-TH')}
                                </div>
                                <div className="hidden xl:flex h-14 justify-center items-center">
                                    <StatusBadge label={status.label} className={status.className} icon={status.icon} />
                                </div>
                                <div className="h-14 flex justify-center items-center">
                                    {isPending ? (
                                        <button
                                            onClick={() => handleApprove(r)}
                                            disabled={isApproving}
                                            className="flex items-center gap-1 px-2.5 xl:px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[11px] xl:text-[12px] font-medium transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                                        >
                                            {isApproving ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <CheckCircle size={13} />
                                            )}
                                            อนุมัติ
                                        </button>
                                    ) : (
                                        <span className="text-[12px] text-muted-foreground">-</span>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default AdminRefunds
