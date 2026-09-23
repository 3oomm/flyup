import { useEffect, useState } from "react"
import { Loader2, Plus, Edit, Trash2, ArrowLeft, Globe, CheckCircle2, XCircle } from "lucide-react"
import { AxiosError } from "axios"
import toast from "react-hot-toast"
import { useAdminStore } from "../../store/useAdminStore"
import type { UniversityDomain, UniversityDomainRequest } from "../../store/useAdminStore"
import { useParams, useNavigate } from "react-router"

const AdminUniversityDetail = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const {
        universityDetail,
        isUniversitiesLoading,
        fetchUniversity,
        createUniversityDomain,
        updateUniversityDomain,
        deleteUniversityDomain
    } = useAdminStore()

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    
    const [selectedDomain, setSelectedDomain] = useState<UniversityDomain | null>(null)
    const [formData, setFormData] = useState<UniversityDomainRequest>({ domain: "", is_active: true })
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        if (id) {
            fetchUniversity(id)
        }
    }, [fetchUniversity, id])

    const handleCreate = async () => {
        if (!id) return
        if (!formData.domain) {
            toast.error("กรุณากรอกโดเมน")
            return
        }
        setActionLoading(true)
        try {
            await createUniversityDomain(id, formData)
            toast.success("เพิ่มโดเมนสำเร็จ")
            setIsCreateModalOpen(false)
            setFormData({ domain: "", is_active: true })
            fetchUniversity(id)
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleUpdate = async () => {
        if (!id || !selectedDomain) return
        if (!formData.domain) {
            toast.error("กรุณากรอกโดเมน")
            return
        }

        // If domain hasn't changed, we don't need to send it back to the server
        if (formData.domain === selectedDomain.domain) {
            setIsEditModalOpen(false)
            return
        }

        setActionLoading(true)
        try {
            await updateUniversityDomain(selectedDomain.id.toString(), { domain: formData.domain })
            toast.success("แก้ไขโดเมนสำเร็จ")
            setIsEditModalOpen(false)
            fetchUniversity(id)
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!id || !selectedDomain) return
        setActionLoading(true)
        try {
            await deleteUniversityDomain(selectedDomain.id.toString())
            toast.success("ลบโดเมนสำเร็จ")
            setIsDeleteModalOpen(false)
            fetchUniversity(id)
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const openEditModal = (domain: UniversityDomain) => {
        setSelectedDomain(domain)
        setFormData({
            domain: domain.domain || "",
            is_active: domain.is_active
        })
        setIsEditModalOpen(true)
    }

    const openDeleteModal = (domain: UniversityDomain) => {
        setSelectedDomain(domain)
        setIsDeleteModalOpen(true)
    }

    const toggleStatus = async (domain: UniversityDomain) => {
        if (!id) return
        try {
            // Only send the is_active flag to prevent the backend from checking the domain name constraints
            const updatedData = { is_active: !domain.is_active }
            await updateUniversityDomain(domain.id.toString(), updatedData)
            toast.success(`เปลี่ยนสถานะโดเมนสำเร็จ`)
            fetchUniversity(id)
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        }
    }

    if (isUniversitiesLoading && !universityDetail) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 size={32} className="animate-spin text-primary" />
            </div>
        )
    }

    if (!universityDetail && !isUniversitiesLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
                <p className="text-gray-500">ไม่พบข้อมูลมหาวิทยาลัย</p>
                <button onClick={() => navigate('/admin/universities')} className="text-primary hover:underline flex items-center gap-2">
                    <ArrowLeft size={16} /> กลับไปหน้ามหาวิทยาลัย
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-[16px]">
            <div className="flex justify-between items-start md:items-end flex-col md:flex-row gap-4 mb-2">
                <div className="flex flex-col gap-[8px]">
                    <button onClick={() => navigate('/admin/universities')} className="text-primary hover:underline flex items-center gap-1 text-[13px] font-medium w-fit">
                        <ArrowLeft size={14} /> กลับไปหน้าจัดการมหาวิทยาลัย
                    </button>
                    <div>
                        <h1 className="text-[24px] font-bold text-gray-900 leading-tight">จัดการโดเมน: {universityDetail?.name_th}</h1>
                        <p className="text-[14px] text-gray-500 mt-1">{universityDetail?.name_en} • {universityDetail?.province}</p>
                    </div>
                </div>
                <button
                    onClick={() => { setFormData({ domain: "", is_active: true }); setIsCreateModalOpen(true); }}
                    className="flex items-center gap-[8px] px-[16px] py-[8px] bg-primary text-white rounded-[10px] text-[14px] font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus size={18} />
                    เพิ่มโดเมน
                </button>
            </div>

            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                {isUniversitiesLoading ? (
                    <div className="flex items-center justify-center py-[60px]">
                        <Loader2 size={28} className="animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-table text-[13px] font-medium text-gray-500 border-b border-border">
                                        <th className="px-[16px] py-[12px] font-medium whitespace-nowrap w-[60px] text-center">ลำดับ</th>
                                        <th className="px-[16px] py-[12px] font-medium whitespace-nowrap min-w-[200px]">โดเมน (Domain)</th>
                                        <th className="px-[16px] py-[12px] font-medium whitespace-nowrap w-[150px]">สถานะการใช้งาน</th>
                                        <th className="px-[16px] py-[12px] font-medium whitespace-nowrap text-center w-[120px]">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!universityDetail?.domains || universityDetail.domains.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-[60px] text-center text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Globe size={48} className="text-gray-300" />
                                                    ไม่มีข้อมูลโดเมนสำหรับมหาวิทยาลัยนี้
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        universityDetail?.domains?.map((dom, index) => (
                                        <tr key={dom.id} className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                                            <td className="px-[16px] py-[14px] text-center">
                                                <span className="text-muted-foreground">{index + 1}</span>
                                            </td>
                                            <td className="px-[16px] py-[14px]">
                                                <div className="text-[14px] font-medium text-gray-800 break-all">{dom.domain}</div>
                                            </td>
                                            <td className="px-[16px] py-[14px]">
                                                <button 
                                                    onClick={() => toggleStatus(dom)}
                                                    className="flex items-center gap-1.5 focus:outline-none group cursor-pointer"
                                                    title="คลิกเพื่อเปลี่ยนสถานะ"
                                                >
                                                    {dom.is_active ? (
                                                        <span className="flex items-center gap-1.5 text-[12px] px-[10px] py-[4px] rounded-full border bg-green-50 text-green-700 border-green-200 font-medium group-hover:bg-green-100 transition-colors whitespace-nowrap">
                                                            <CheckCircle2 size={14} /> เปิดใช้งาน
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-[12px] px-[10px] py-[4px] rounded-full border bg-gray-50 text-gray-600 border-gray-200 font-medium group-hover:bg-gray-100 transition-colors whitespace-nowrap">
                                                            <XCircle size={14} /> ปิดใช้งาน
                                                        </span>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-[16px] py-[14px] text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button
                                                        onClick={() => openEditModal(dom)}
                                                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200 cursor-pointer"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(dom)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-[20px] border-b border-border flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-[16px] flex items-center gap-2 text-gray-800">
                                <Plus size={18} className="text-primary" />
                                เพิ่มโดเมน
                            </h3>
                        </div>
                        <div className="p-[20px] flex flex-col gap-4">
                            <div className="flex flex-col gap-[6px]">
                                <label className="text-[13px] font-medium text-gray-700">ชื่อโดเมน <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="p-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="เช่น student.mahidol.ac.th"
                                    value={formData.domain}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                />
                                <p className="text-[12px] text-gray-500">ไม่ต้องใส่ @ นำหน้า</p>
                            </div>
                        </div>
                        <div className="p-[16px] border-t border-border flex justify-end gap-[10px] bg-gray-50 shrink-0">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-[16px] py-[8px] text-[14px] font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-[8px] hover:bg-gray-50 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={actionLoading}
                                className="px-[16px] py-[8px] text-[14px] font-medium text-white bg-primary rounded-[8px] hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                                ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && selectedDomain && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-[20px] border-b border-border flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-[16px] flex items-center gap-2 text-gray-800">
                                <Edit size={18} className="text-amber-500" />
                                แก้ไขโดเมน
                            </h3>
                        </div>
                        <div className="p-[20px] flex flex-col gap-4">
                            <div className="flex flex-col gap-[6px]">
                                <label className="text-[13px] font-medium text-gray-700">ชื่อโดเมน <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="p-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.domain}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="p-[16px] border-t border-border flex justify-end gap-[10px] bg-gray-50 shrink-0">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-[16px] py-[8px] text-[14px] font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-[8px] hover:bg-gray-50 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={actionLoading}
                                className="px-[16px] py-[8px] text-[14px] font-medium text-white bg-primary rounded-[8px] hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                                บันทึกการแก้ไข
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && selectedDomain && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-[24px] flex flex-col items-center text-center gap-4">
                            <div className="w-[48px] h-[48px] rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[18px] text-gray-900 mb-2">ลบโดเมน</h3>
                                <p className="text-[14px] text-gray-500 leading-relaxed">
                                    คุณแน่ใจหรือไม่ที่จะลบโดเมน <strong>{selectedDomain.domain}</strong>?<br/> การกระทำนี้ไม่สามารถย้อนกลับได้
                                </p>
                            </div>
                        </div>
                        <div className="p-[16px] border-t border-border flex justify-end gap-[10px] bg-gray-50 shrink-0">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-[16px] py-[8px] text-[14px] font-medium text-gray-700 bg-white border border-gray-300 rounded-[8px] hover:bg-gray-50 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading}
                                className="flex-1 px-[16px] py-[8px] text-[14px] font-medium text-white bg-red-600 rounded-[8px] hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                                ยืนยันการลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminUniversityDetail
