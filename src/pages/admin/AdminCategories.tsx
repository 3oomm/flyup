import { useEffect, useState } from "react"
import { Loader2, Plus, Edit, Trash2, Tag, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { AxiosError } from "axios"
import toast from "react-hot-toast"
import { useAdminCategoryStore } from "../../store/useAdminCategoryStore"
import type { Category, CategoryFormData } from "../../store/useAdminCategoryStore"
import PageHeader from "../../components/admin/PageHeader"

const ITEMS_PER_PAGE = 8

// ─── Modals ──────────────────────────────────────────────────────────────────

interface CategoryFormModalProps {
    title: string
    icon: React.ReactNode
    formData: CategoryFormData
    onChange: (data: CategoryFormData) => void
    onConfirm: () => void
    onCancel: () => void
    confirmLabel: string
    loading: boolean
}

const CategoryFormModal = ({
    title, icon, formData, onChange, onConfirm, onCancel, confirmLabel, loading,
}: CategoryFormModalProps) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-[20px] border-b border-border flex items-center gap-2 bg-gray-50/50">
                {icon}
                <h3 className="font-semibold text-[16px] text-gray-800">{title}</h3>
            </div>
            <div className="p-[20px]">
                <div className="flex flex-col gap-[6px]">
                    <label className="text-[13px] font-medium text-gray-700">
                        ชื่อหมวดหมู่ <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        className="p-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="เช่น เทคโนโลยี, สิ่งแวดล้อม, การศึกษา"
                        value={formData.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                    />
                </div>
            </div>
            <div className="p-[16px] border-t border-border flex justify-end gap-[10px] bg-gray-50 shrink-0">
                <button
                    onClick={onCancel}
                    className="px-[16px] py-[8px] text-[14px] font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-[8px] hover:bg-gray-50 transition-colors"
                >
                    ยกเลิก
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="px-[16px] py-[8px] text-[14px] font-medium text-white bg-primary rounded-[8px] hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {confirmLabel}
                </button>
            </div>
        </div>
    </div>
)

interface DeleteModalProps {
    category: Category
    onConfirm: () => void
    onCancel: () => void
    loading: boolean
}

const DeleteModal = ({ category, onConfirm, onCancel, loading }: DeleteModalProps) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-[24px] flex flex-col items-center text-center gap-4">
                <div className="w-[48px] h-[48px] rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <Trash2 size={24} />
                </div>
                <div>
                    <h3 className="font-semibold text-[18px] text-gray-900 mb-2">ลบหมวดหมู่</h3>
                    <p className="text-[14px] text-gray-500 leading-relaxed">
                        คุณแน่ใจหรือไม่ที่จะลบ <strong>{category.name}</strong>?<br />
                        การกระทำนี้ไม่สามารถย้อนกลับได้
                    </p>
                </div>
            </div>
            <div className="p-[16px] border-t border-border flex gap-[10px] bg-gray-50 shrink-0">
                <button
                    onClick={onCancel}
                    className="flex-1 px-[16px] py-[8px] text-[14px] font-medium text-gray-700 bg-white border border-gray-300 rounded-[8px] hover:bg-gray-50 transition-colors"
                >
                    ยกเลิก
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 px-[16px] py-[8px] text-[14px] font-medium text-white bg-red-600 rounded-[8px] hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    ยืนยันการลบ
                </button>
            </div>
        </div>
    </div>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminCategories = () => {
    const { categories, isCategoriesLoading, fetchCategories, createCategory, updateCategory, deleteCategory } =
        useAdminCategoryStore()

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [selected, setSelected] = useState<Category | null>(null)
    const [formData, setFormData] = useState<CategoryFormData>({ name: "" })
    const [actionLoading, setActionLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    const filtered = categories.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast.error("กรุณากรอกชื่อหมวดหมู่")
            return
        }
        setActionLoading(true)
        try {
            await createCategory(formData)
            toast.success("เพิ่มหมวดหมู่สำเร็จ")
            setIsCreateOpen(false)
            setFormData({ name: "" })
            fetchCategories()
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleUpdate = async () => {
        if (!selected) return
        if (!formData.name.trim()) {
            toast.error("กรุณากรอกชื่อหมวดหมู่")
            return
        }
        setActionLoading(true)
        try {
            await updateCategory(selected.id, formData)
            toast.success("แก้ไขหมวดหมู่สำเร็จ")
            setIsEditOpen(false)
            fetchCategories()
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!selected) return
        setActionLoading(true)
        try {
            await deleteCategory(selected.id)
            toast.success("ลบหมวดหมู่สำเร็จ")
            setIsDeleteOpen(false)
            fetchCategories()
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const openEdit = (cat: Category) => {
        setSelected(cat)
        setFormData({ name: cat.name })
        setIsEditOpen(true)
    }

    const openDelete = (cat: Category) => {
        setSelected(cat)
        setIsDeleteOpen(true)
    }

    return (
        <div className="flex flex-col gap-[16px]">
            <div className="flex justify-between items-start md:items-end flex-col md:flex-row gap-4 mb-2">
                <PageHeader title="จัดการหมวดหมู่โปรเจกต์" subtitle="เพิ่ม ลบ แก้ไข หมวดหมู่ที่ใช้จัดกลุ่มโปรเจกต์ในระบบ" />
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-[260px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาหมวดหมู่..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                            className="w-full pl-9 pr-4 py-2 border border-border bg-white rounded-[8px] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-[38px]"
                        />
                    </div>
                    <button
                        onClick={() => { setFormData({ name: "" }); setIsCreateOpen(true) }}
                        className="flex items-center justify-center gap-[8px] px-[16px] py-[8px] bg-primary text-white rounded-[8px] text-[13px] font-medium hover:bg-primary/90 transition-colors whitespace-nowrap h-[38px]"
                    >
                        <Plus size={18} />
                        เพิ่มหมวดหมู่
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                {isCategoriesLoading ? (
                    <div className="flex items-center justify-center py-[60px]">
                        <Loader2 size={28} className="animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-table text-[13px] font-medium text-gray-500 border-b border-border">
                                    <th className="px-[16px] py-[12px] w-[60px] text-center">ลำดับ</th>
                                    <th className="px-[16px] py-[12px]">ชื่อหมวดหมู่</th>
                                    <th className="px-[16px] py-[12px] text-center w-[140px]">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-[60px] text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Tag size={48} className="text-gray-300" />
                                                {searchTerm ? "ไม่พบหมวดหมู่ที่ค้นหา" : "ยังไม่มีหมวดหมู่ในระบบ"}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((cat, index) => (
                                        <tr key={cat.id} className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                                            <td className="px-[16px] py-[14px] text-center text-muted-foreground">
                                                {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                            </td>
                                            <td className="px-[16px] py-[14px]">
                                                <div className="flex items-center gap-2">
                                                    <Tag size={14} className="text-primary shrink-0" />
                                                    <span className="font-medium">{cat.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-[16px] py-[14px]">
                                                <div className="flex justify-center gap-1">
                                                    <button
                                                        onClick={() => openEdit(cat)}
                                                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200 cursor-pointer"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => openDelete(cat)}
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
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] border border-border bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    {pageNumbers.map((page) => (
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
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] border border-border bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {isCreateOpen && (
                <CategoryFormModal
                    title="เพิ่มหมวดหมู่"
                    icon={<Plus size={18} className="text-primary" />}
                    formData={formData}
                    onChange={setFormData}
                    onConfirm={handleCreate}
                    onCancel={() => setIsCreateOpen(false)}
                    confirmLabel="ยืนยัน"
                    loading={actionLoading}
                />
            )}

            {isEditOpen && selected && (
                <CategoryFormModal
                    title="แก้ไขหมวดหมู่"
                    icon={<Edit size={18} className="text-amber-500" />}
                    formData={formData}
                    onChange={setFormData}
                    onConfirm={handleUpdate}
                    onCancel={() => setIsEditOpen(false)}
                    confirmLabel="บันทึกการแก้ไข"
                    loading={actionLoading}
                />
            )}

            {isDeleteOpen && selected && (
                <DeleteModal
                    category={selected}
                    onConfirm={handleDelete}
                    onCancel={() => setIsDeleteOpen(false)}
                    loading={actionLoading}
                />
            )}
        </div>
    )
}

export default AdminCategories
