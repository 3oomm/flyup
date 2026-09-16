import { useEffect, useState } from 'react'
import {
    Loader2, TrendingUp, CheckCircle, Clock, X, Plus,
    ChevronLeft, Users, Banknote, Building2,
} from 'lucide-react'
import { useAdminProfitPoolStore, type ProfitPoolDetail, type InvestorPayoutDetail } from '../../store/useAdminProfitPoolStore'
import PageHeader from '../../components/admin/PageHeader'
import StatusBadge from '../../components/admin/StatusBadge'
import SearchBar from '../../components/admin/SearchBar'
import FilterTabs from '../../components/admin/FilterTabs'

// ── helpers ──────────────────────────────────────────────────────────────────

const fmtBaht = (v: number) =>
    `฿${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

const STATUS_POOL = {
    pending:   { label: 'กำลังดำเนินการ', className: 'bg-amber-50 text-amber-600 border border-amber-200', icon: <Clock size={12} /> },
    completed: { label: 'เสร็จสิ้น',       className: 'bg-green-50 text-green-600 border border-green-200', icon: <CheckCircle size={12} /> },
} as const

const STATUS_PAYOUT = {
    pending:   { label: 'รอโอน',    className: 'bg-amber-50 text-amber-600 border border-amber-200', icon: <Clock size={12} /> },
    confirmed: { label: 'โอนแล้ว', className: 'bg-green-50 text-green-600 border border-green-200', icon: <CheckCircle size={12} /> },
} as const

// ── Create Pool Modal ─────────────────────────────────────────────────────────

function CreatePoolModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const { createPool, isCreating } = useAdminProfitPoolStore()
    const [projectId, setProjectId] = useState('')
    const [quarterNo, setQuarterNo] = useState<number>(0)
    const [totalAmount, setTotalAmount] = useState('')
    const [transferRef, setTransferRef] = useState('')
    const [adminNote, setAdminNote] = useState('')

    const handleSubmit = async () => {
        const ok = await createPool(Number(projectId), Number(totalAmount), transferRef, adminNote, quarterNo)
        if (ok) { onCreated(); onClose() }
    }

    const valid = projectId && Number(totalAmount) > 0 && transferRef.trim()

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">บันทึกกำไรที่รับจาก Pioneer</h2>
                        <p className="text-xs text-muted-foreground mt-1">ระบบจะคำนวณสัดส่วนให้นักลงทุนอัตโนมัติ</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={18} /></button>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium">รหัสโปรเจกต์ <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            placeholder="Project ID"
                            className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium">ไตรมาส</label>
                        <div className="flex gap-2">
                            {[0, 1, 2, 3, 4].map(q => (
                                <button
                                    key={q}
                                    onClick={() => setQuarterNo(q)}
                                    className={`flex-1 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors cursor-pointer ${
                                        quarterNo === q
                                            ? 'bg-primary text-white border-primary'
                                            : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                                    }`}
                                >
                                    {q === 0 ? '-' : `Q${q}`}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium">ยอดที่รับจาก Pioneer (บาท) <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                            placeholder="0.00"
                            className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium">เลขอ้างอิงการโอนจาก Pioneer <span className="text-red-500">*</span></label>
                        <input
                            value={transferRef}
                            onChange={(e) => setTransferRef(e.target.value)}
                            placeholder="เช่น TXN-20260430-001"
                            className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium">หมายเหตุ</label>
                        <textarea
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            rows={2}
                            className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-2 mt-5 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border hover:bg-gray-50 cursor-pointer">ยกเลิก</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!valid || isCreating}
                        className="px-4 py-2 text-[13px] rounded-lg bg-primary hover:bg-primary/90 text-white disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                        {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        สร้างรายการ
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Confirm Payout Modal ──────────────────────────────────────────────────────

function ConfirmPayoutModal({
    poolId,
    payout,
    onClose,
}: {
    poolId: number
    payout: InvestorPayoutDetail
    onClose: () => void
}) {
    const { confirmPayout, isConfirming } = useAdminProfitPoolStore()
    const [transferRef, setTransferRef] = useState('')
    const [note, setNote] = useState('')

    const handleConfirm = async () => {
        const ok = await confirmPayout(poolId, payout.id, transferRef, note)
        if (ok) onClose()
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">ยืนยันการโอนกำไร</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            {payout.first_name} {payout.last_name}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4 flex flex-col gap-2 text-[13px]">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">นักลงทุน</span>
                        <span className="font-medium">{payout.first_name} {payout.last_name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">ทุนที่ลงทุน</span>
                        <span>{fmtBaht(payout.principal_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">สัดส่วน</span>
                        <span>{payout.share_pct.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">จำนวนที่ได้รับ</span>
                        <span className="font-bold text-primary text-[15px]">{fmtBaht(payout.amount)}</span>
                    </div>
                    {payout.bank_account && (
                        <>
                            <hr className="border-border" />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">ธนาคาร</span>
                                <span>{payout.bank_account.bank_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">ชื่อบัญชี</span>
                                <span>{payout.bank_account.account_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">เลขบัญชี</span>
                                <span className="font-mono">{payout.bank_account.account_number}</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium">เลขอ้างอิงการโอน <span className="text-red-500">*</span></label>
                        <input
                            value={transferRef}
                            onChange={(e) => setTransferRef(e.target.value)}
                            placeholder="เช่น TXN-20260430-001"
                            className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium">หมายเหตุ</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-2 mt-5 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border hover:bg-gray-50">ยกเลิก</button>
                    <button
                        onClick={handleConfirm}
                        disabled={!transferRef.trim() || isConfirming}
                        className="px-4 py-2 text-[13px] rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex items-center gap-2"
                    >
                        {isConfirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        ยืนยันการโอน
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Pool Detail View ──────────────────────────────────────────────────────────

function PoolDetailView({ pool, onBack }: { pool: ProfitPoolDetail; onBack: () => void }) {
    const [selectedPayout, setSelectedPayout] = useState<InvestorPayoutDetail | null>(null)
    const { detail } = useAdminProfitPoolStore()
    const current = detail ?? pool

    const confirmedCount = current.payouts.filter(p => p.status === 'confirmed').length
    const totalConfirmed = current.payouts.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0)
    const pendingAmount = current.total_amount - totalConfirmed

    return (
        <div className="flex flex-col gap-5">
            <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground w-fit cursor-pointer">
                <ChevronLeft size={15} /> กลับ
            </button>

            {/* pool summary */}
            <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h2 className="text-[16px] font-bold text-foreground">{current.project_title}</h2>
                            {current.quarter_no > 0 && (
                                <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Q{current.quarter_no}</span>
                            )}
                        </div>
                        <p className="text-[12px] text-muted-foreground">Pioneer: {current.pioneer_name}</p>
                    </div>
                    <StatusBadge
                        label={STATUS_POOL[current.status]?.label ?? current.status}
                        className={STATUS_POOL[current.status]?.className ?? ''}
                        icon={STATUS_POOL[current.status]?.icon}
                    />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-0.5">ยอดรวมจาก Pioneer</p>
                        <p className="font-bold text-[15px] text-foreground">{fmtBaht(current.total_amount)}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-green-600 mb-0.5">โอนแล้ว</p>
                        <p className="font-bold text-[15px] text-green-700">{fmtBaht(totalConfirmed)}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-amber-600 mb-0.5">รอโอน ({confirmedCount}/{current.payouts.length} คน)</p>
                        <p className="font-bold text-[15px] text-amber-700">{fmtBaht(pendingAmount)}</p>
                    </div>
                </div>
                <div className="text-[12px] text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>Ref จาก Pioneer: </span>
                    <span className="font-mono font-medium">{current.transfer_ref}</span>
                    <span>·</span>
                    <span>สร้าง {fmtDate(current.created_at)}</span>
                </div>
            </div>

            {/* investor table */}
            <div className="bg-white rounded-xl border border-border overflow-hidden text-[13px]">
                <div className="grid grid-cols-[2fr_1fr_90px_1fr_100px_80px] bg-[#f8f9fc] px-4 py-3 font-medium text-gray-500 border-b border-border">
                    <div>นักลงทุน</div>
                    <div className="text-center">ทุนที่ลงทุน</div>
                    <div className="text-center">สัดส่วน</div>
                    <div className="text-center">กำไรที่ได้รับ</div>
                    <div className="text-center">สถานะ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {current.payouts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                        <Users size={24} className="opacity-40" />
                        <p className="text-sm">ไม่มีนักลงทุน</p>
                    </div>
                ) : (
                    current.payouts.map((p) => {
                        const payStatus = STATUS_PAYOUT[p.status] ?? STATUS_PAYOUT['pending']
                        return (
                            <div key={p.id} className="grid grid-cols-[2fr_1fr_90px_1fr_100px_80px] border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                                <div className="h-14 flex flex-col justify-center px-4">
                                    <span className="font-medium truncate">{p.first_name} {p.last_name}</span>
                                    <span className="text-[11px] text-muted-foreground truncate">{p.email}</span>
                                </div>
                                <div className="h-14 flex justify-center items-center text-foreground">
                                    {fmtBaht(p.principal_amount)}
                                </div>
                                <div className="h-14 flex justify-center items-center">
                                    <span className="bg-primary/10 text-primary text-[12px] font-semibold px-2 py-0.5 rounded-full">
                                        {p.share_pct.toFixed(2)}%
                                    </span>
                                </div>
                                <div className="h-14 flex justify-center items-center font-bold text-primary">
                                    {fmtBaht(p.amount)}
                                </div>
                                <div className="h-14 flex justify-center items-center">
                                    <StatusBadge label={payStatus.label} className={payStatus.className} icon={payStatus.icon} />
                                </div>
                                <div className="h-14 flex justify-center items-center">
                                    {p.status === 'pending' ? (
                                        <button
                                            onClick={() => setSelectedPayout(p)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[12px] font-medium cursor-pointer"
                                        >
                                            <CheckCircle size={12} /> ยืนยัน
                                        </button>
                                    ) : (
                                        <span className="text-[11px] text-muted-foreground">{fmtDate(p.confirmed_at)}</span>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {selectedPayout && (
                <ConfirmPayoutModal
                    poolId={current.id}
                    payout={selectedPayout}
                    onClose={() => setSelectedPayout(null)}
                />
            )}
        </div>
    )
}

type FilterTab = 'all' | 'pending' | 'completed'

const FILTER_TABS: { value: FilterTab; label: string }[] = [
    { value: 'all',       label: 'ทั้งหมด' },
    { value: 'pending',   label: 'รอดำเนินการ' },
    { value: 'completed', label: 'เสร็จสิ้น' },
]

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminProfitDistribution = () => {
    const { pools, isLoading, fetchPools, fetchDetail, detail } = useAdminProfitPoolStore()
    const [search, setSearch] = useState('')
    const [filterTab, setFilterTab] = useState<FilterTab>('all')
    const [showCreate, setShowCreate] = useState(false)
    const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null)

    useEffect(() => { fetchPools() }, [fetchPools])

    const handleOpenDetail = async (id: number) => {
        await fetchDetail(id)
        setSelectedPoolId(id)
    }

    const handleBack = () => {
        setSelectedPoolId(null)
        fetchPools() // refresh list เมื่อกลับจาก detail
    }

    if (selectedPoolId !== null && detail) {
        return (
            <div className="flex flex-col gap-4">
                <PageHeader title="โอนกำไรคืนนักลงทุน" subtitle="ยืนยันการโอนกำไรให้นักลงทุนแต่ละคน" />
                <PoolDetailView pool={detail} onBack={handleBack} />
            </div>
        )
    }

    const filtered = pools.filter((p) => {
        const q = search.toLowerCase()
        const matchSearch = p.project_title.toLowerCase().includes(q) || p.pioneer_name.toLowerCase().includes(q)
        const matchTab = filterTab === 'all' || p.status === filterTab
        return matchSearch && matchTab
    })

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
                <PageHeader title="โอนกำไรคืนนักลงทุน" subtitle="บริหารการแจกจ่ายกำไรจากโปรเจกต์ที่เสร็จสิ้นแล้วให้นักลงทุน" />
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-medium hover:bg-primary/90 shrink-0"
                >
                    <Plus size={15} /> บันทึกกำไรใหม่
                </button>
            </div>

            <div className="flex items-center justify-between gap-2 sm:gap-3">
                <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาโปรเจกต์หรือ Pioneer..." resultCount={filtered.length} />
                <FilterTabs
                    active={filterTab}
                    onChange={(k) => setFilterTab(k as FilterTab)}
                    tabs={FILTER_TABS.map(t => ({
                        key: t.value,
                        label: t.label,
                        count: t.value === 'all' ? pools.length : pools.filter(p => p.status === t.value).length,
                    }))}
                />
            </div>

            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                <div className="grid grid-cols-[2fr_1fr_80px_1fr_1fr_100px_80px] bg-[#f8f9fc] px-4 py-3 font-medium text-gray-500 border-b border-border">
                    <div>โปรเจกต์</div>
                    <div className="text-center">Pioneer</div>
                    <div className="text-center">ไตรมาส</div>
                    <div className="text-center">ยอดรวม</div>
                    <div className="text-center">นักลงทุน</div>
                    <div className="text-center">สถานะ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                        <Banknote size={28} className="opacity-40" />
                        <p className="text-sm">{search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการ'}</p>
                    </div>
                ) : (
                    filtered.map((pool) => {
                        const st = STATUS_POOL[pool.status] ?? STATUS_POOL['pending']
                        return (
                            <div key={pool.id} className="grid grid-cols-[2fr_1fr_80px_1fr_1fr_100px_80px] border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                                <div className="h-14 flex flex-col justify-center px-4">
                                    <span className="font-medium text-[13px] truncate">{pool.project_title}</span>
                                    <span className="text-[11px] text-muted-foreground">{fmtDate(pool.created_at)}</span>
                                </div>
                                <div className="h-14 flex items-center justify-center">
                                    <span className="text-[13px]">{pool.pioneer_name}</span>
                                </div>
                                <div className="h-14 flex items-center justify-center">
                                    {pool.quarter_no > 0 ? (
                                        <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Q{pool.quarter_no}</span>
                                    ) : (
                                        <span className="text-[11px] text-muted-foreground">—</span>
                                    )}
                                </div>
                                <div className="h-14 flex items-center justify-center font-semibold text-primary">
                                    {fmtBaht(pool.total_amount)}
                                </div>
                                <div className="h-14 flex items-center justify-center gap-1 text-[13px]">
                                    <Building2 size={13} className="text-muted-foreground" />
                                    {pool.confirmed_count}/{pool.investor_count} คน
                                </div>
                                <div className="h-14 flex items-center justify-center">
                                    <StatusBadge label={st.label} className={st.className} icon={st.icon} />
                                </div>
                                <div className="h-14 flex items-center justify-center">
                                    <button
                                        onClick={() => handleOpenDetail(pool.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[12px] font-medium cursor-pointer"
                                    >
                                        <TrendingUp size={12} /> ดู
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {showCreate && (
                <CreatePoolModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => fetchPools()}
                />
            )}
        </div>
    )
}

export default AdminProfitDistribution
