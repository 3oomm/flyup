import { useEffect, useState } from "react"
import { Loader2, Plus, Edit, Trash2, Globe, GraduationCap, Search, ChevronLeft, ChevronRight, X } from "lucide-react"
import { AxiosError } from "axios"
import toast from "react-hot-toast"
import { useAdminStore } from "../../store/useAdminStore"
import type { University, CreateUniversityRequest } from "../../store/useAdminStore"
import PageHeader from "../../components/admin/PageHeader"
import { Link } from "react-router"

const AdminUniversities = () => {
    const {
        universities,
        isUniversitiesLoading,
        fetchUniversities,
        createUniversity,
        updateUniversity,
        deleteUniversity
    } = useAdminStore()

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    
    const [selectedUni, setSelectedUni] = useState<University | null>(null)
    const [detailUni, setDetailUni] = useState<University | null>(null)
    const [formData, setFormData] = useState<CreateUniversityRequest>({ name_th: "", name_en: "", province: "" })
    const [actionLoading, setActionLoading] = useState(false)
    
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5

    const filteredUniversities = universities.filter(uni => 
        (uni.name_th?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (uni.name_en?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (uni.province?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )

    const totalPages = Math.ceil(filteredUniversities.length / itemsPerPage)
    const paginatedUniversities = filteredUniversities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    useEffect(() => {
        fetchUniversities()
    }, [fetchUniversities])

    const handleCreate = async () => {
        if (!formData.name_th || !formData.name_en || !formData.province) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน")
            return
        }
        setActionLoading(true)
        try {
            await createUniversity(formData)
            toast.success("เพิ่มข้อมูลมหาวิทยาลัยสำเร็จ")
            setIsCreateModalOpen(false)
            setFormData({ name_th: "", name_en: "", province: "" })
            fetchUniversities()
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleUpdate = async () => {
        if (!selectedUni) return
        if (!formData.name_th || !formData.name_en || !formData.province) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน")
            return
        }
        setActionLoading(true)
        try {
            await updateUniversity(selectedUni.id.toString(), formData)
            toast.success("แก้ไขข้อมูลมหาวิทยาลัยสำเร็จ")
            setIsEditModalOpen(false)
            fetchUniversities()
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedUni) return
        setActionLoading(true)
        try {
            await deleteUniversity(selectedUni.id.toString())
            toast.success("ลบมหาวิทยาลัยสำเร็จ")
            setIsDeleteModalOpen(false)
            fetchUniversities()
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const openEditModal = (uni: University) => {
        setSelectedUni(uni)
        setFormData({
            name_th: uni.name_th || "",
            name_en: uni.name_en || "",
            province: uni.province || ""
        })
        setIsEditModalOpen(true)
    }

    const openDeleteModal = (uni: University) => {
        setSelectedUni(uni)
        setIsDeleteModalOpen(true)
    }

    return (
        <div className="flex flex-col gap-[16px]">
            <div className="flex justify-between items-start md:items-end flex-col md:flex-row gap-4 mb-2">
                <PageHeader title="จัดการมหาวิทยาลัย" subtitle="เพิ่ม ลบ แก้ไข ข้อมูลมหาวิทยาลัยที่อนุญาตในระบบ" />
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-[280px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหามหาวิทยาลัย (ชื่อ, จังหวัด)..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-9 pr-4 py-2 border border-border bg-white rounded-[8px] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-[38px]"
                        />
                    </div>
                    <button
                        onClick={() => { setFormData({ name_th: "", name_en: "", province: "" }); setIsCreateModalOpen(true); }}
                        className="flex items-center justify-center gap-[8px] px-[16px] py-[8px] bg-primary text-white rounded-[8px] text-[13px] font-medium hover:bg-primary/90 transition-colors whitespace-nowrap h-[38px]"
                    >
                        <Plus size={18} />
                        เพิ่มมหาวิทยาลัย
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                {isUniversitiesLoading ? (
                    <div className="flex items-center justify-center py-[60px]">
                        <Loader2 size={28} className="animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <div className="w-full overflow-x-auto">
                            <table className="w-full table-fixed md:table-auto text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f8f9fc] text-[13px] font-medium text-gray-500 border-b border-border">
                                        <th className="w-[44px] md:w-[60px] px-2 md:px-4 py-3 font-medium whitespace-nowrap text-center">ลำดับ</th>
                                        <th className="px-2 md:px-4 py-3 font-medium whitespace-nowrap md:min-w-[200px]">ชื่อมหาวิทยาลัย (TH)</th>
                                        <th className="hidden md:table-cell px-4 py-3 font-medium whitespace-nowrap min-w-[200px]">ชื่อมหาวิทยาลัย (EN)</th>
                                        <th className="w-[80px] md:w-auto px-2 md:px-4 py-3 font-medium whitespace-nowrap md:min-w-[120px]">จังหวัด</th>
                                        <th className="hidden md:table-cell px-4 py-3 font-medium whitespace-nowrap text-center w-[80px]">โดเมน</th>
                                        <th className="w-[100px] md:w-[150px] px-2 md:px-4 py-3 font-medium whitespace-nowrap text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUniversities.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-[60px] text-center text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <GraduationCap size={48} className="text-gray-300" />
                                                    {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีข้อมูลมหาวิทยาลัยในระบบ'}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedUniversities.map((uni, index) => (
                                        <tr key={uni.id} className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                                            <td className="px-2 md:px-4 py-3.5 text-center text-[12px]">
                                                <span className="text-muted-foreground">{((currentPage - 1) * itemsPerPage) + index + 1}</span>
                                            </td>
                                            <td className="min-w-0 px-2 md:px-4 py-3.5">
                                                <div className="block max-w-full md:max-w-[250px] truncate text-[12px] md:text-[13px] font-medium">{uni.name_th ?? '-'}</div>
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3.5">
                                                <div className="text-[13px] text-gray-600 truncate max-w-[250px]">{uni.name_en ?? '-'}</div>
                                            </td>
                                            <td className="min-w-0 px-2 md:px-4 py-3.5">
                                                <div className="block max-w-full truncate text-[11px] md:text-[13px] text-gray-600">{uni.province ?? '-'}</div>
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3.5 text-center">
                                                <span className="text-[12px] px-[8px] py-[2px] rounded-full border bg-blue-50 text-blue-600 border-blue-200 font-medium inline-block">
                                                    {uni.domains?.length || 0}
                                                </span>
                                            </td>
                                            <td className="px-2 md:px-4 py-3.5">
                                                <button
                                                    onClick={() => setDetailUni(uni)}
                                                    className="md:hidden mx-auto px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium whitespace-nowrap"
                                                >
                                                    ดูรายละเอียด
                                                </button>
                                                <div className="hidden md:flex justify-center gap-1">
                                                    <Link
                                                        to={`/admin/universities/${uni.id}`}
                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                        title="จัดการโดเมน"
                                                    >
                                                        <Globe size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => openEditModal(uni)}
                                                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200 cursor-pointer"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(uni)}
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

            {/* Pagination below the table box */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] border border-border bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    {pageNumbers.map(page => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-[36px] h-[36px] flex items-center justify-center rounded-[8px] border text-[14px] font-medium transition-colors cursor-pointer ${
                                currentPage === page
                                    ? "bg-primary border-primary text-white"
                                    : "bg-white border-border text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            {page}
                        </button>
                    ))}
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] border border-border bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {detailUni && (
                <div
                    className="fixed inset-y-0 left-0 right-0 lg:left-[230px] z-40 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setDetailUni(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold">รายละเอียดมหาวิทยาลัย</h2>
                                <p className="mt-1 text-[12px] text-muted-foreground">ข้อมูลมหาวิทยาลัยและโดเมนที่อนุญาต</p>
                            </div>
                            <button
                                onClick={() => setDetailUni(null)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="ปิด"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mb-5 divide-y divide-border rounded-xl border border-border text-[13px]">
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">ชื่อ (TH)</span>
                                <span className="font-medium">{detailUni.name_th ?? '-'}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">ชื่อ (EN)</span>
                                <span className="font-medium">{detailUni.name_en ?? '-'}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">จังหวัด</span>
                                <span className="font-medium">{detailUni.province ?? '-'}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">โดเมน</span>
                                <span className="font-medium">{detailUni.domains?.length || 0} รายการ</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                            <Link
                                to={`/admin/universities/${detailUni.id}`}
                                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-600 hover:bg-blue-100"
                            >
                                <Globe size={14} /> จัดการโดเมน
                            </Link>
                            <button
                                onClick={() => {
                                    const university = detailUni
                                    setDetailUni(null)
                                    openEditModal(university)
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-600 hover:bg-amber-100"
                            >
                                <Edit size={14} /> แก้ไข
                            </button>
                            <button
                                onClick={() => {
                                    const university = detailUni
                                    setDetailUni(null)
                                    openDeleteModal(university)
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600 hover:bg-red-100"
                            >
                                <Trash2 size={14} /> ลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-[20px] border-b border-border flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-[16px] flex items-center gap-2 text-gray-800">
                                <Plus size={18} className="text-primary" />
                                เพิ่มมหาวิทยาลัย
                            </h3>
                        </div>
                        <div className="p-[20px] flex flex-col gap-4">
                            <div className="flex flex-col gap-[6px]">
                                <label className="text-[13px] font-medium text-gray-700">ชื่อมหาวิทยาลัย (ภาษาไทย) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="p-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="เช่น มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ"
                                    value={formData.name_th}
                                    onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-[6px]">
                                <label className="text-[13px] font-medium text-gray-700">ชื่อมหาวิทยาลัย (ภาษาอังกฤษ) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="p-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="เช่น King Mongkut's University of Technology North Bangkok"
                                    value={formData.name_en}
                                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-[6px]">
                                <label className="text-[13px] font-medium text-gray-700">จังหวัด <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="p-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="เช่น กรุงเทพมหานคร"
                                    value={formData.province}
                                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                />
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
            {isEditModalOpen && selectedUni && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-[20px] border-b border-border flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-[16px] flex items-center gap-2 text-gray-800">
                                <Edit size={18} className="text-amber-500" />
                                แก้ไขข้อมูลมหาวิทยาลัย
                            </h3>
                        </div>
                        <div className="p-[20px] flex flex-col gap-4">
                            <div className="flex flex-col gap-[6px]">
                                <label className="text-[13px] font-medium text-gray-700">ชื่อมหาวิทยาลัย (ภาษาไทย) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="p-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.name_th}
                                    onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-[6px]">
                                <label className="text-[13px] font-medium text-gray-700">ชื่อมหาวิทยาลัย (ภาษาอังกฤษ) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="p-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.name_en}
                                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-[6px]">
                                <label className="text-[13px] font-medium text-gray-700">จังหวัด <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="p-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.province}
                                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
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
            {isDeleteModalOpen && selectedUni && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-[24px] flex flex-col items-center text-center gap-4">
                            <div className="w-[48px] h-[48px] rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[18px] text-gray-900 mb-2">ลบมหาวิทยาลัย</h3>
                                <p className="text-[14px] text-gray-500 leading-relaxed">
                                    คุณแน่ใจหรือไม่ที่จะลบ <strong>{selectedUni.name_th}</strong>?<br/> การกระทำนี้ไม่สามารถย้อนกลับได้
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

export default AdminUniversities
