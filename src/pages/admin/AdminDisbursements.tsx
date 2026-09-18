import { useEffect, useState } from 'react'
import { Loader2, Wallet, CheckCircle, Clock, X } from 'lucide-react'
import { useDisbursementStore, type Disbursement } from '../../store/useDisbursementStore'
import SearchBar from '../../components/admin/SearchBar'
import FilterTabs from '../../components/admin/FilterTabs'
import StatusBadge from '../../components/admin/StatusBadge'
import PageHeader from '../../components/admin/PageHeader'

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending:   { label: 'รอโอนเงิน',  className: 'bg-amber-50 text-amber-600 border border-amber-200', icon: <Clock size={12} /> },
    confirmed: { label: 'โอนแล้ว',    className: 'bg-green-50 text-green-600 border border-green-200', icon: <CheckCircle size={12} /> },
}

const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

const ConfirmModal = ({
    item,
    onClose,
    onConfirm,
    isConfirming,
}: {
    item: Disbursement
    onClose: () => void
    onConfirm: (transferRef: string, note: string) => Promise<void>
    isConfirming: boolean
}) => {
    const [transferRef, setTransferRef] = useState('')
    const [note, setNote] = useState('')
    const isPending = item.status === 'pending'

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">
                            {isPending ? 'รายละเอียดการโอนเงิน' : 'รายละเอียดการปล่อยเงิน'}
                        </h2>
                        <p className="text-[12px] text-muted-foreground mt-1">{item.project_title} — Phase {item.phase_no}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4 flex flex-col gap-2 text-[13px]">
                    <div className="flex justify-between"><span className="text-muted-foreground">Pioneer</span><span className="font-medium">{item.pioneer_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">จำนวน</span><span className="font-bold text-primary">฿{item.amount.toLocaleString('th-TH')}</span></div>
                    {item.bank_account && (
                        <>
                            <div className="flex justify-between"><span className="text-muted-foreground">ธนาคาร</span><span>{item.bank_account.bank_name}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">เลขที่บัญชี</span><span className="font-mono">{item.bank_account.account_number}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">ชื่อบัญชี</span><span>{item.bank_account.account_name}</span></div>
                        </>
                    )}
                </div>

                {isPending ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[13px] font-medium">เลขอ้างอิงการโอน <span className="text-error">*</span></label>
                            <input
                                value={transferRef}
                                onChange={(e) => setTransferRef(e.target.value)}
                                placeholder="เช่น TXN-20260426-001"
                                className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[13px] font-medium">หมายเหตุ</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary resize-none"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-border divide-y divide-border text-[13px]">
                        <div className="flex justify-between gap-3 p-3">
                            <span className="text-muted-foreground">เลขอ้างอิง</span>
                            <span className="font-medium break-all text-right">{item.transfer_ref || '-'}</span>
                        </div>
                        <div className="flex justify-between gap-3 p-3">
                            <span className="text-muted-foreground">วันที่ยืนยัน</span>
                            <span className="font-medium">{fmtDate(item.confirmed_at)}</span>
                        </div>
                        <div className="flex justify-between gap-3 p-3">
                            <span className="text-muted-foreground">หมายเหตุ</span>
                            <span className="font-medium text-right">{item.admin_note || '-'}</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-2 mt-5 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border hover:bg-gray-50">ยกเลิก</button>
                    {isPending && (
                        <button
                            onClick={() => onConfirm(transferRef, note)}
                            disabled={!transferRef.trim() || isConfirming}
                            className="px-4 py-2 text-[13px] rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex items-center gap-2"
                        >
                            {isConfirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            ยืนยันการโอน
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

const AdminDisbursements = () => {
    const { disbursements, isLoading, fetchAll, fetchPending, confirm } = useDisbursementStore()
    const [tab, setTab] = useState<'pending' | 'all'>('pending')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<Disbursement | null>(null)
    const [isConfirming, setIsConfirming] = useState(false)

    useEffect(() => {
        if (tab === 'pending') fetchPending()
        else fetchAll()
    }, [tab, fetchPending, fetchAll])

    const handleConfirm = async (transferRef: string, note: string) => {
        if (!selected) return
        setIsConfirming(true)
        const ok = await confirm(selected.id, transferRef, note)
        setIsConfirming(false)
        if (ok) setSelected(null)
    }

    const filtered = disbursements.filter((d) => {
        const q = search.toLowerCase()
        return (
            d.project_title.toLowerCase().includes(q) ||
            d.pioneer_name.toLowerCase().includes(q) ||
            d.pioneer_email.toLowerCase().includes(q)
        )
    })

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader title="การปล่อยเงิน" subtitle="ยืนยันการโอนเงินทุนให้ pioneer ตามแต่ละ milestone" />

            <div className="flex items-center justify-between gap-2 sm:gap-4">
                <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาโปรเจกต์หรือ Pioneer..." resultCount={filtered.length} />
                <FilterTabs
                    active={tab}
                    onChange={(k) => setTab(k as 'pending' | 'all')}
                    tabs={[
                        { key: 'pending', label: 'รอโอนเงิน' },
                        { key: 'all',     label: 'ทั้งหมด' },
                    ]}
                />
            </div>

            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                <div className="grid grid-cols-[44px_minmax(0,1fr)_86px_88px] md:grid-cols-[60px_minmax(240px,2fr)_minmax(160px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_120px_160px] bg-[#f8f9fc] px-2 md:px-4 py-3 font-medium text-gray-500 border-b border-border text-[12px] md:text-[13px]">
                    <div className="text-center">ลำดับ</div>
                    <div>โปรเจกต์</div>
                    <div className="hidden md:block text-center">Pioneer</div>
                    <div className="hidden md:block text-center">Phase</div>
                    <div className="text-center">จำนวนเงิน</div>
                    <div className="hidden md:block text-center">สถานะ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-[10px] text-muted-foreground">
                        <Wallet size={28} className="opacity-40" />
                        <p className="text-sm">{search ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีรายการ'}</p>
                    </div>
                ) : (
                    filtered.map((d, index) => {
                        const status = STATUS_CONFIG[d.status] ?? STATUS_CONFIG['pending']
                        const isPending = d.status === 'pending'
                        return (
                            <div key={d.id} className="grid grid-cols-[44px_minmax(0,1fr)_86px_88px] md:grid-cols-[60px_minmax(240px,2fr)_minmax(160px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_120px_160px] border-b border-border last:border-0 hover:bg-gray-50 transition-colors px-2 md:px-4">
                                <div className="h-14 flex items-center justify-center text-[12px] text-muted-foreground">{index + 1}</div>
                                <div className="h-14 min-w-0 flex flex-col justify-center pr-2 md:pr-3">
                                    <span className="block min-w-0 font-medium text-[12px] md:text-[13px] truncate">{d.project_title}</span>
                                    <span className="hidden md:block text-[11px] text-muted-foreground">สร้าง {fmtDate(d.created_at)}</span>
                                </div>
                                <div className="hidden md:flex h-14 flex-col justify-center items-center gap-[2px]">
                                    <span className="text-[13px]">{d.pioneer_name}</span>
                                </div>
                                <div className="hidden md:flex h-14 justify-center items-center text-[13px]">
                                    Phase {d.phase_no} ({d.percent_release}%)
                                </div>
                                <div className="h-14 flex justify-center items-center font-semibold text-primary text-[12px] md:text-[14px]">
                                    ฿{d.amount.toLocaleString('th-TH')}
                                </div>
                                <div className="hidden md:flex h-14 justify-center items-center">
                                    <StatusBadge label={status.label} className={status.className} icon={status.icon} />
                                </div>
                                <div className="h-14 flex justify-center items-center">
                                    <button
                                        onClick={() => setSelected(d)}
                                        className={`flex items-center gap-1 px-2.5 md:px-3 py-1.5 rounded-lg text-[11px] md:text-[12px] font-medium cursor-pointer whitespace-nowrap transition-colors ${
                                            isPending
                                                ? 'bg-muted hover:bg-muted/70 text-foreground md:bg-green-600 md:hover:bg-green-700 md:text-white'
                                                : 'bg-muted hover:bg-muted/70 text-foreground'
                                        }`}
                                    >
                                        <span className="md:hidden">ดูรายละเอียด</span>
                                        <span className="hidden md:flex items-center gap-1">
                                            {isPending && <CheckCircle size={13} />}
                                            {isPending ? 'จัดการ' : 'ดูรายละเอียด'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {selected && (
                <ConfirmModal
                    item={selected}
                    onClose={() => setSelected(null)}
                    onConfirm={handleConfirm}
                    isConfirming={isConfirming}
                />
            )}
        </div>
    )
}

export default AdminDisbursements
