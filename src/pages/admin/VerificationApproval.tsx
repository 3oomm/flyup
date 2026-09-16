import { useEffect, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { AxiosError } from "axios"
import toast from "react-hot-toast"
import { useVerificationStore } from "../../store/useVerificationStore"
import PageHeader from "../../components/admin/PageHeader"
import ApproveRejectButtons from "../../components/admin/ApproveRejectButtons"
import ImagePreviewModal from "../../components/admin/ImagePreviewModal"
import FilterTabs from "../../components/admin/FilterTabs"
import SearchBar from "../../components/admin/SearchBar"

type Tab = "student" | "idcard"

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

            <div className="flex items-center justify-between gap-2 sm:gap-4">
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
                        <div className="grid grid-cols-7 bg-[#f8f9fc] px-[16px] py-[12px] font-medium text-gray-500 border-b border-border">
                            <div>User ID</div>
                            <div className="col-span-2">Email</div>
                            <div>Role</div>
                            <div>วันที่ส่ง</div>
                            <div>เอกสาร</div>
                            <div className="text-center">จัดการ</div>
                        </div>
                        {students.length === 0 ? (
                            <div className="py-[60px] text-center text-muted-foreground">ไม่มีรายการรออนุมัติ</div>
                        ) : (
                            students.map((s) => (
                                <div key={s.id} className="grid grid-cols-7 px-[16px] items-center border-b border-border last:border-0">
                                    <div className="py-[14px] text-muted-foreground">#{s.user_id}</div>
                                    <div className="py-[14px] col-span-2 text-[13px] truncate pr-[8px]">{s.User?.email ?? '-'}</div>
                                    <div className="py-[14px]">
                                        <span className="text-[12px] px-[8px] py-[2px] rounded-full border bg-primary/10 text-primary border-primary/20 font-medium">
                                            {s.User?.role ?? '-'}
                                        </span>
                                    </div>
                                    <div className="py-[14px] text-[13px]">{formatDate(s.CreatedAt)}</div>
                                    <div className="py-[14px]">
                                        <button
                                            onClick={() => setPreview({ url: s.document, label: "บัตรนักศึกษา" })}
                                            className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <ExternalLink size={13} /> ดูบัตร
                                        </button>
                                    </div>
                                    <div className="py-[14px]">
                                        <ApproveRejectButtons
                                            isLoading={actionLoading === s.user_id}
                                            onApprove={() => handleStudentAction(s.user_id, "approve")}
                                            onReject={() => handleStudentAction(s.user_id, "reject")}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-9 bg-[#f8f9fc] px-[16px] py-[12px] font-medium text-gray-500 border-b border-border">
                            <div>User ID</div>
                            <div className="col-span-2">Email</div>
                            <div>Role</div>
                            <div>วันที่ส่ง</div>
                            <div>บัตรประชาชน</div>
                            <div>เซลฟี่</div>
                            <div className="text-center">Face Score</div>
                            <div className="text-center">จัดการ</div>
                        </div>
                        {idCards.length === 0 ? (
                            <div className="py-[60px] text-center text-muted-foreground">ไม่มีรายการรออนุมัติ</div>
                        ) : (
                            idCards.map((c) => (
                                <div key={c.id} className="grid grid-cols-9 px-[16px] items-center border-b border-border last:border-0">
                                    <div className="py-[14px] text-muted-foreground">#{c.user_id}</div>
                                    <div className="py-[14px] col-span-2 text-[13px] truncate pr-[8px]">{c.User?.email ?? '-'}</div>
                                    <div className="py-[14px]">
                                        <span className="text-[12px] px-[8px] py-[2px] rounded-full border bg-primary/10 text-primary border-primary/20 font-medium">
                                            {c.User?.role ?? '-'}
                                        </span>
                                    </div>
                                    <div className="py-[14px] text-[13px]">{formatDate(c.CreatedAt)}</div>
                                    <div className="py-[14px]">
                                        <button
                                            onClick={() => setPreview({ url: c.document, label: "บัตรประชาชน" })}
                                            className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <ExternalLink size={13} /> ดูบัตร
                                        </button>
                                    </div>
                                    <div className="py-[14px]">
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
                                    <div className="py-[14px] flex justify-center">
                                        {c.face_score != null ? (
                                            <span className={`text-[12px] px-[10px] py-[2px] rounded-full font-medium border ${c.face_score >= 80 ? 'bg-green-50 text-green-600 border-green-200' : c.face_score >= 50 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                {c.face_score.toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </div>
                                    <div className="py-[14px]">
                                        <ApproveRejectButtons
                                            isLoading={actionLoading === c.user_id}
                                            onApprove={() => handleIDCardAction(c.user_id, "approve")}
                                            onReject={() => handleIDCardAction(c.user_id, "reject")}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>

            {preview && (
                <ImagePreviewModal url={preview.url} label={preview.label} onClose={() => setPreview(null)} />
            )}
        </div>
    )
}

export default VerificationApproval
