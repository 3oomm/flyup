import { useEffect, useState } from "react"
import { ExternalLink, Loader2, X } from "lucide-react"
import { AxiosError } from "axios"
import toast from "react-hot-toast"
import {
    useVerificationStore,
    type StudentVerification,
    type IDCardVerification,
} from "../../store/useVerificationStore"
import PageHeader from "../../components/admin/PageHeader"
import ApproveRejectButtons from "../../components/admin/ApproveRejectButtons"
import ImagePreviewModal from "../../components/admin/ImagePreviewModal"
import FilterTabs from "../../components/admin/FilterTabs"
import SearchBar from "../../components/admin/SearchBar"

type Tab = "student" | "idcard"
type VerificationDetail =
    | { type: "student"; item: StudentVerification }
    | { type: "idcard"; item: IDCardVerification }

const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
}

const VerificationApproval = () => {
    const {
        studentVerifications,
        idCardVerifications,
        isLoading,
        fetchVerifications,
        approveStudentCard,
        rejectStudentCard,
        approveIdCard,
        rejectIdCard,
    } = useVerificationStore()

    const [tab, setTab] = useState<Tab>("student")
    const [search, setSearch] = useState("")
    const [actionLoading, setActionLoading] = useState<number | null>(null)
    const [preview, setPreview] = useState<{ url: string; label: string } | null>(null)
    const [detail, setDetail] = useState<VerificationDetail | null>(null)

    useEffect(() => {
        fetchVerifications()
    }, [fetchVerifications])

    const handleStudentAction = async (userId: number, action: "approve" | "reject") => {
        setActionLoading(userId)
        try {
            if (action === "approve") await approveStudentCard(userId)
            else await rejectStudentCard(userId)
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(null)
        }
    }

    const handleIDCardAction = async (userId: number, action: "approve" | "reject") => {
        setActionLoading(userId)
        try {
            if (action === "approve") await approveIdCard(userId)
            else await rejectIdCard(userId)
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(null)
        }
    }

    const q = search.toLowerCase()
    const students = studentVerifications.filter(s =>
        String(s.user_id).includes(q) || (s.User?.email ?? '').toLowerCase().includes(q)
    )
    const idCards = idCardVerifications.filter(c =>
        String(c.user_id).includes(q) || (c.User?.email ?? '').toLowerCase().includes(q)
    )

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader title="ตรวจสอบการยืนยันตัวตน" subtitle="อนุมัติหรือปฏิเสธการยืนยันตัวตนของผู้ใช้งาน (Pioneer และ Booster)" />

            <div className="flex items-center justify-between gap-2 xl:gap-4">
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="ค้นหา User ID หรือ Email..."
                    resultCount={tab === "student" ? students.length : idCards.length}
                />
                <FilterTabs
                    active={tab}
                    onChange={(k) => setTab(k as Tab)}
                    tabs={[
                        { key: "student", label: "บัตรนักศึกษา", count: studentVerifications.length },
                        { key: "idcard",  label: "บัตรประชาชน",  count: idCardVerifications.length },
                    ]}
                />
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                {isLoading ? (
                    <div className="flex items-center justify-center py-[60px]">
                        <Loader2 size={28} className="animate-spin text-primary" />
                    </div>
                ) : tab === "student" ? (
                    <>
                        <div className="grid grid-cols-[44px_minmax(0,1fr)_68px_96px] xl:grid-cols-[60px_minmax(220px,2fr)_minmax(90px,1fr)_minmax(120px,1fr)_minmax(100px,1fr)_200px] bg-surface-table px-2 xl:px-4 py-3 font-medium text-gray-500 border-b border-border text-[12px] xl:text-[13px]">
                            <div className="text-center">ลำดับ</div>
                            <div>Email</div>
                            <div>Role</div>
                            <div className="hidden xl:block">วันที่ส่ง</div>
                            <div className="hidden xl:block">เอกสาร</div>
                            <div className="text-center">จัดการ</div>
                        </div>
                        {students.length === 0 ? (
                            <div className="py-[60px] text-center text-muted-foreground">ไม่มีรายการรออนุมัติ</div>
                        ) : (
                            students.map((s, index) => (
                                <div key={s.id} className="grid grid-cols-[44px_minmax(0,1fr)_68px_96px] xl:grid-cols-[60px_minmax(220px,2fr)_minmax(90px,1fr)_minmax(120px,1fr)_minmax(100px,1fr)_200px] px-2 xl:px-4 items-center border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                                    <div className="h-14 flex items-center justify-center text-[12px] text-muted-foreground">{index + 1}</div>
                                    <div className="h-14 min-w-0 flex items-center pr-2 text-[11px] xl:text-[13px]">
                                        <span className="block min-w-0 truncate">{s.User?.email ?? '-'}</span>
                                    </div>
                                    <div className="h-14 flex items-center">
                                        <span className="text-[12px] px-[8px] py-[2px] rounded-full border bg-primary/10 text-primary border-primary/20 font-medium">
                                            {s.User?.role ?? '-'}
                                        </span>
                                    </div>
                                    <div className="hidden xl:flex h-14 items-center text-[13px]">{formatDate(s.CreatedAt)}</div>
                                    <div className="hidden xl:flex h-14 items-center">
                                        <button
                                            onClick={() => setPreview({ url: s.document, label: "บัตรนักศึกษา" })}
                                            className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <ExternalLink size={13} /> ดูบัตร
                                        </button>
                                    </div>
                                    <div className="h-14 flex items-center justify-center">
                                        <button
                                            onClick={() => setDetail({ type: "student", item: s })}
                                            className="xl:hidden px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
                                        >
                                            ดูรายละเอียด
                                        </button>
                                        <div className="hidden xl:block">
                                            <ApproveRejectButtons
                                                isLoading={actionLoading === s.user_id}
                                                onApprove={() => handleStudentAction(s.user_id, "approve")}
                                                onReject={() => handleStudentAction(s.user_id, "reject")}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-[44px_minmax(0,1fr)_68px_96px] xl:grid-cols-[60px_minmax(200px,2fr)_minmax(90px,1fr)_minmax(120px,1fr)_minmax(110px,1fr)_minmax(90px,1fr)_100px_200px] bg-surface-table px-2 xl:px-4 py-3 font-medium text-gray-500 border-b border-border text-[12px] xl:text-[13px]">
                            <div className="text-center">ลำดับ</div>
                            <div>Email</div>
                            <div>Role</div>
                            <div className="hidden xl:block">วันที่ส่ง</div>
                            <div className="hidden xl:block">บัตรประชาชน</div>
                            <div className="hidden xl:block">เซลฟี่</div>
                            <div className="hidden xl:block text-center">Face Score</div>
                            <div className="text-center">จัดการ</div>
                        </div>
                        {idCards.length === 0 ? (
                            <div className="py-[60px] text-center text-muted-foreground">ไม่มีรายการรออนุมัติ</div>
                        ) : (
                            idCards.map((c, index) => (
                                <div key={c.id} className="grid grid-cols-[44px_minmax(0,1fr)_68px_96px] xl:grid-cols-[60px_minmax(200px,2fr)_minmax(90px,1fr)_minmax(120px,1fr)_minmax(110px,1fr)_minmax(90px,1fr)_100px_200px] px-2 xl:px-4 items-center border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                                    <div className="h-14 flex items-center justify-center text-[12px] text-muted-foreground">{index + 1}</div>
                                    <div className="h-14 min-w-0 flex items-center pr-2 text-[11px] xl:text-[13px]">
                                        <span className="block min-w-0 truncate">{c.User?.email ?? '-'}</span>
                                    </div>
                                    <div className="h-14 flex items-center">
                                        <span className="text-[12px] px-[8px] py-[2px] rounded-full border bg-primary/10 text-primary border-primary/20 font-medium">
                                            {c.User?.role ?? '-'}
                                        </span>
                                    </div>
                                    <div className="hidden xl:flex h-14 items-center text-[13px]">{formatDate(c.CreatedAt)}</div>
                                    <div className="hidden xl:flex h-14 items-center">
                                        <button
                                            onClick={() => setPreview({ url: c.document, label: "บัตรประชาชน" })}
                                            className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <ExternalLink size={13} /> ดูบัตร
                                        </button>
                                    </div>
                                    <div className="hidden xl:flex h-14 items-center">
                                        {c.selfie_url ? (
                                            <button
                                                onClick={() => setPreview({ url: c.selfie_url!, label: "เซลฟี่" })}
                                                className="flex items-center gap-1 text-primary hover:underline"
                                            >
                                                <ExternalLink size={13} /> ดูรูป
                                            </button>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </div>
                                    <div className="hidden xl:flex h-14 items-center justify-center">
                                        {c.face_score != null ? (
                                            <span className={`text-[12px] px-[10px] py-[2px] rounded-full font-medium border ${c.face_score >= 80 ? 'bg-green-50 text-green-600 border-green-200' : c.face_score >= 50 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                {c.face_score.toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </div>
                                    <div className="h-14 flex items-center justify-center">
                                        <button
                                            onClick={() => setDetail({ type: "idcard", item: c })}
                                            className="xl:hidden px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
                                        >
                                            ดูรายละเอียด
                                        </button>
                                        <div className="hidden xl:block">
                                            <ApproveRejectButtons
                                                isLoading={actionLoading === c.user_id}
                                                onApprove={() => handleIDCardAction(c.user_id, "approve")}
                                                onReject={() => handleIDCardAction(c.user_id, "reject")}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>

            {detail && (
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setDetail(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold">รายละเอียดการยืนยันตัวตน</h2>
                                <p className="mt-1 text-[12px] text-muted-foreground">
                                    {detail.type === "student" ? "บัตรนักศึกษา" : "บัตรประชาชน"}
                                </p>
                            </div>
                            <button
                                onClick={() => setDetail(null)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="ปิด"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mb-5 divide-y divide-border rounded-xl border border-border text-[13px]">
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">Email</span>
                                <span className="break-all font-medium">{detail.item.User?.email ?? "-"}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">Role</span>
                                <span className="font-medium">{detail.item.User?.role ?? "-"}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">วันที่ส่ง</span>
                                <span className="font-medium">{formatDate(detail.item.CreatedAt)}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] items-center gap-3 p-3">
                                <span className="text-muted-foreground">เอกสาร</span>
                                <button
                                    onClick={() => setPreview({
                                        url: detail.item.document,
                                        label: detail.type === "student" ? "บัตรนักศึกษา" : "บัตรประชาชน",
                                    })}
                                    className="flex w-fit items-center gap-1 text-primary hover:underline"
                                >
                                    <ExternalLink size={13} /> ดูเอกสาร
                                </button>
                            </div>
                            {detail.type === "idcard" && (
                                <>
                                    <div className="grid grid-cols-[90px_1fr] items-center gap-3 p-3">
                                        <span className="text-muted-foreground">เซลฟี่</span>
                                        {detail.item.selfie_url ? (
                                            <button
                                                onClick={() => setPreview({ url: detail.item.selfie_url!, label: "เซลฟี่" })}
                                                className="flex w-fit items-center gap-1 text-primary hover:underline"
                                            >
                                                <ExternalLink size={13} /> ดูรูป
                                            </button>
                                        ) : (
                                            <span>-</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                        <span className="text-muted-foreground">Face Score</span>
                                        <span className="font-medium">
                                            {detail.item.face_score != null ? `${detail.item.face_score.toFixed(1)}%` : "-"}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        <ApproveRejectButtons
                            isLoading={actionLoading === detail.item.user_id}
                            onApprove={async () => {
                                if (detail.type === "student") await handleStudentAction(detail.item.user_id, "approve")
                                else await handleIDCardAction(detail.item.user_id, "approve")
                                setDetail(null)
                            }}
                            onReject={async () => {
                                if (detail.type === "student") await handleStudentAction(detail.item.user_id, "reject")
                                else await handleIDCardAction(detail.item.user_id, "reject")
                                setDetail(null)
                            }}
                        />
                    </div>
                </div>
            )}

            {preview && (
                <ImagePreviewModal url={preview.url} label={preview.label} onClose={() => setPreview(null)} />
            )}
        </div>
    )
}

export default VerificationApproval
