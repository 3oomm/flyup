import { useState, useEffect, useCallback } from 'react'
import { Loader2, UserX, RotateCcw, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'
import PageHeader from '../../components/admin/PageHeader'
import { useAdminStore, type AdminUserRow as UserRow } from '../../store/useAdminStore'

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
    pioneer: { label: 'Pioneer', cls: 'bg-primary/10 text-primary border border-primary/20' },
    booster: { label: 'Booster', cls: 'bg-rose-50 text-rose-600 border border-rose-200' },
    admin:   { label: 'Admin',   cls: 'bg-red-50 text-red-700 border border-red-200' },
}

const STATUS_BADGE: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border border-green-200',
    suspended: 'bg-red-50 text-red-700 border border-red-200',
}

const SuspendModal = ({
    userId,
    onClose,
    onConfirm,
    isSubmitting,
}: {
    userId: number
    onClose: () => void
    onConfirm: (reason: string) => Promise<void>
    isSubmitting: boolean
}) => {
    const [reason, setReason] = useState('')
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-[420px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-bold text-foreground">ระงับผู้ใช้ ID #{userId}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                </div>
                <div className="flex flex-col gap-1 mb-5">
                    <label className="text-[13px] font-medium">เหตุผล <span className="text-error">*</span></label>
                    <textarea
                        data-testid="user-suspend-reason-input"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        placeholder="ระบุเหตุผลในการระงับบัญชีผู้ใช้นี้"
                        className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary resize-none"
                    />
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border hover:bg-gray-50">ยกเลิก</button>
                    <button
                        data-testid="user-suspend-confirm-btn"
                        onClick={() => onConfirm(reason)}
                        disabled={!reason.trim() || isSubmitting}
                        className="px-4 py-2 text-[13px] rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                        ระงับ
                    </button>
                </div>
            </div>
        </div>
    )
}

const AdminUserManagement = () => {
    const { fetchAdminUsers, suspendUser, rollbackUser } = useAdminStore()
    const [users, setUsers] = useState<UserRow[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const pageSize = 15

    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const [isLoading, setIsLoading] = useState(false)
    const [suspendTarget, setSuspendTarget] = useState<number | null>(null)
    const [detailUser, setDetailUser] = useState<UserRow | null>(null)
    const [isSuspending, setIsSuspending] = useState(false)
    const [rollingBackId, setRollingBackId] = useState<number | null>(null)

    const totalPages = Math.ceil(total / pageSize)

    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        try {
            const { users: data, total: count } = await fetchAdminUsers({
                page, pageSize, search, role: roleFilter, status: statusFilter,
            })
            setUsers(data)
            setTotal(count)
        } catch {
            toast.error('โหลดรายชื่อผู้ใช้ไม่สำเร็จ')
        } finally {
            setIsLoading(false)
        }
    }, [page, search, roleFilter, statusFilter, fetchAdminUsers])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleSearch = () => {
        setSearch(searchInput)
        setPage(1)
    }

    const handleSuspend = async (reason: string) => {
        if (!suspendTarget) return
        setIsSuspending(true)
        try {
            await suspendUser(suspendTarget, reason)
            toast.success(`ระงับผู้ใช้ #${suspendTarget} สำเร็จ`)
            setSuspendTarget(null)
            fetchUsers()
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || 'ระงับไม่สำเร็จ')
        } finally {
            setIsSuspending(false)
        }
    }

    const handleRollback = async (id: number) => {
        setRollingBackId(id)
        try {
            await rollbackUser(id)
            toast.success(`คืนสถานะผู้ใช้ #${id} สำเร็จ`)
            fetchUsers()
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null
            toast.error(msg || 'คืนสถานะไม่สำเร็จ')
        } finally {
            setRollingBackId(null)
        }
    }

    return (
        <div className="flex flex-col gap-[16px]">
            <PageHeader title="จัดการผู้ใช้" subtitle="ระงับหรือคืนสถานะบัญชีผู้ใช้" />

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-border rounded-lg px-3 py-2 bg-white focus-within:border-primary">
                    <Search size={15} className="text-muted-foreground shrink-0" />
                    <input
                        data-testid="user-search-input"
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="ค้นหาชื่อ หรืออีเมล..."
                        className="flex-1 text-[13px] outline-none bg-transparent"
                    />
                    {searchInput && (
                        <button data-testid="user-search-clear-btn" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}>
                            <X size={14} className="text-muted-foreground" />
                        </button>
                    )}
                </div>
                <button
                    data-testid="user-search-btn"
                    onClick={handleSearch}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                >
                    ค้นหา
                </button>
                <select
                    data-testid="user-role-filter"
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
                    className="border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary bg-white cursor-pointer"
                >
                    <option value="">ทุก Role</option>
                    <option value="pioneer">Pioneer</option>
                    <option value="booster">Booster</option>
                    <option value="admin">Admin</option>
                </select>
                <select
                    data-testid="user-status-filter"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                    className="border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary bg-white cursor-pointer"
                >
                    <option value="">ทุกสถานะ</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                </select>
                <span className="text-[12px] text-muted-foreground ml-auto">{total} ผู้ใช้</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-border overflow-hidden text-[14px]">
                <div className="grid grid-cols-[44px_minmax(0,1fr)_72px_96px] md:grid-cols-[60px_1fr_1fr_90px_90px_120px] bg-surface-table px-2 md:px-4 py-3 font-medium text-gray-500 border-b border-border text-[12px] md:text-[13px]">
                    <div className="text-center">ลำดับ</div>
                    <div>ชื่อ</div>
                    <div className="hidden md:block">อีเมล</div>
                    <div className="text-center">Role</div>
                    <div className="hidden md:block text-center">สถานะ</div>
                    <div className="text-center">จัดการ</div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-muted-foreground" size={28} />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex justify-center items-center py-16 text-[13px] text-muted-foreground">
                        ไม่พบผู้ใช้
                    </div>
                ) : (
                    users.map((u, index) => (
                        <div
                            key={u.id}
                            className="grid grid-cols-[44px_minmax(0,1fr)_72px_96px] md:grid-cols-[60px_1fr_1fr_90px_90px_120px] border-b border-border last:border-0 hover:bg-gray-50 transition-colors px-2 md:px-4"
                        >
                            <div className="h-12 flex items-center justify-center text-[12px] text-muted-foreground">
                                {(page - 1) * pageSize + index + 1}
                            </div>
                            <div className="h-12 min-w-0 flex items-center pr-2 text-[12px] md:text-[13px] font-medium">
                                <span className="block min-w-0 truncate">{u.first_name} {u.last_name}</span>
                            </div>
                            <div className="hidden md:flex h-12 items-center text-[13px] text-muted-foreground truncate pr-2">
                                {u.email}
                            </div>
                            <div className="h-12 flex items-center justify-center">
                                <span className={`max-w-full truncate text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role]?.cls ?? 'bg-gray-100 text-gray-600'}`}>
                                    {ROLE_BADGE[u.role]?.label ?? u.role}
                                </span>
                            </div>
                            <div className="hidden md:flex h-12 items-center justify-center">
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[u.status] ?? ''}`}>
                                    {u.status === 'active' ? 'Active' : 'Suspended'}
                                </span>
                            </div>
                            <div className="h-12 flex items-center justify-center gap-1.5">
                                <button
                                    onClick={() => setDetailUser(u)}
                                    className="md:hidden px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[10px] font-medium whitespace-nowrap"
                                >
                                    ดูรายละเอียด
                                </button>
                                <div className="hidden md:block">
                                    {u.status === 'active' ? (
                                        <button
                                            data-testid={`user-suspend-open-btn-${u.id}`}
                                            onClick={() => setSuspendTarget(u.id)}
                                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                            title="ระงับบัญชี"
                                        >
                                            <UserX size={15} />
                                        </button>
                                    ) : (
                                        <button
                                            data-testid={`user-rollback-btn-${u.id}`}
                                            onClick={() => handleRollback(u.id)}
                                            disabled={rollingBackId === u.id}
                                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
                                            title="คืนสถานะ"
                                        >
                                            {rollingBackId === u.id
                                                ? <Loader2 size={15} className="animate-spin" />
                                                : <RotateCcw size={15} />
                                            }
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        data-testid="user-page-prev-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-[13px] text-muted-foreground">
                        หน้า {page} / {totalPages}
                    </span>
                    <button
                        data-testid="user-page-next-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {detailUser && (
                <div
                    className="fixed inset-y-0 left-0 right-0 lg:left-[230px] z-40 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setDetailUser(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold">รายละเอียดผู้ใช้</h2>
                                <p className="mt-1 text-[12px] text-muted-foreground">บัญชีผู้ใช้ #{detailUser.id}</p>
                            </div>
                            <button
                                onClick={() => setDetailUser(null)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="ปิด"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mb-5 divide-y divide-border rounded-xl border border-border text-[13px]">
                            <div className="grid grid-cols-[80px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">ชื่อ</span>
                                <span className="font-medium">{detailUser.first_name} {detailUser.last_name}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">อีเมล</span>
                                <span className="break-all font-medium">{detailUser.email}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">Role</span>
                                <span className="font-medium">{ROLE_BADGE[detailUser.role]?.label ?? detailUser.role}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-3 p-3">
                                <span className="text-muted-foreground">สถานะ</span>
                                <span className="font-medium">{detailUser.status === 'active' ? 'Active' : 'Suspended'}</span>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            {detailUser.status === 'active' ? (
                                <button
                                    onClick={() => {
                                        setDetailUser(null)
                                        setSuspendTarget(detailUser.id)
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 hover:bg-red-100"
                                >
                                    <UserX size={14} /> ระงับบัญชี
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        const userId = detailUser.id
                                        setDetailUser(null)
                                        handleRollback(userId)
                                    }}
                                    disabled={rollingBackId === detailUser.id}
                                    className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2 text-[13px] font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                    <RotateCcw size={14} /> คืนสถานะ
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {suspendTarget && (
                <SuspendModal
                    userId={suspendTarget}
                    onClose={() => setSuspendTarget(null)}
                    onConfirm={handleSuspend}
                    isSubmitting={isSuspending}
                />
            )}
        </div>
    )
}

export default AdminUserManagement
