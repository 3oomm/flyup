import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useAdminBadgeStore, type AdminBadgeCounts } from '@/store/useAdminBadgeStore'
import {
    House, Search, LayoutDashboard, UserRoundCheck, MailSearch, Milestone,
    Wallet, TrendingUp, MessageSquareWarning, ShieldBan, RotateCcw, FileText,
    Users, LogOut, UserRound, GraduationCap, Tag, FolderX, FileEdit,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router'

type BadgeKey = keyof AdminBadgeCounts

interface MenuItem {
    icon: React.ReactNode
    title: string
    path: string
    badge?: BadgeKey
}

interface MenuSection {
    label: string
    items: MenuItem[]
}

const sections: MenuSection[] = [
    {
        label: 'ทั่วไป',
        items: [
            { icon: <House size={18} />, title: 'หน้าหลัก', path: '/' },
            { icon: <Search size={18} />, title: 'สำรวจโปรเจกต์', path: '/projects' },
            { icon: <LayoutDashboard size={18} />, title: 'แดชบอร์ด', path: '/admin/dashboard' },
        ],
    },
    {
        label: 'การอนุมัติ',
        items: [
            { icon: <UserRoundCheck size={18} />, title: 'ยืนยันตัวตน', path: '/admin/verifications', badge: 'pending_verifications' },
            { icon: <MailSearch size={18} />, title: 'ตรวจสอบโปรเจกต์', path: '/admin/projects-approval', badge: 'pending_projects' },
            { icon: <Milestone size={18} />, title: 'ตรวจสอบ Milestone', path: '/admin/milestones', badge: 'submitted_milestones' },
        ],
    },
    {
        label: 'การเงิน',
        items: [
            { icon: <Wallet size={18} />, title: 'การปล่อยเงิน', path: '/admin/disbursements', badge: 'pending_disbursements' },
            { icon: <TrendingUp size={18} />, title: 'โอนกำไรนักลงทุน', path: '/admin/profit-distribution', badge: 'pending_profit_pools' },
            { icon: <RotateCcw size={18} />, title: 'คืนเงิน', path: '/admin/refunds', badge: 'pending_refunds' },
        ],
    },
    {
        label: 'การจัดการโปรเจกต์',
        items: [
            { icon: <MessageSquareWarning size={18} />, title: 'คำร้องเรียน', path: '/admin/complaints', badge: 'open_complaints' },
            { icon: <FolderX size={18} />, title: 'ยกเลิกโปรเจกต์', path: '/admin/cancel-requests', badge: 'pending_cancel_requests' },
            { icon: <FileEdit size={18} />, title: 'คำขอแก้ไขโปรเจกต์', path: '/admin/project-edit-requests', badge: 'pending_edit_requests' },
            { icon: <ShieldBan size={18} />, title: 'ระงับโปรเจกต์', path: '/admin/projects-suspension' },
        ],
    },
    {
        label: 'ข้อมูลและระบบ',
        items: [
            { icon: <FileText size={18} />, title: 'บันทึกการตรวจสอบ', path: '/admin/audit-logs' },
            { icon: <Users size={18} />, title: 'จัดการผู้ใช้', path: '/admin/users' },
            { icon: <GraduationCap size={18} />, title: 'จัดการมหาวิทยาลัย', path: '/admin/universities' },
            { icon: <Tag size={18} />, title: 'จัดการหมวดหมู่', path: '/admin/categories' },
        ],
    },
    {
        label: 'บัญชี',
        items: [
            { icon: <UserRound size={18} />, title: 'โปรไฟล์', path: '/admin/profile' },
        ],
    },
]

const SidebarAdmin = () => {
    const navigate = useNavigate()
    const { logout, authUser } = useAuthStore()
    const { counts, fetchBadges } = useAdminBadgeStore()

    useEffect(() => {
        const refresh = () => fetchBadges()
        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') refresh()
        }

        refresh()
        window.addEventListener('badges:refresh', refresh)
        window.addEventListener('focus', refresh)
        document.addEventListener('visibilitychange', refreshWhenVisible)

        // Fallback in case an SSE event is missed or the connection is reconnecting.
        const interval = setInterval(refresh, 15_000)
        return () => {
            clearInterval(interval)
            window.removeEventListener('badges:refresh', refresh)
            window.removeEventListener('focus', refresh)
            document.removeEventListener('visibilitychange', refreshWhenVisible)
        }
    }, [fetchBadges])

    const handleLogout = () => { logout(); navigate('/') }

    const initials = `${(authUser?.first_name as string)?.[0] ?? ''}${(authUser?.last_name as string)?.[0] ?? ''}`.toUpperCase() || '?'

    return (
        <aside className="bg-sidebar w-57.5 flex-none h-full text-primary-light flex flex-col pt-2.5 border-r border-sidebar-accent">

            {/* Profile */}
            <div className="w-full flex flex-col items-center gap-2 pb-4 px-3">
                {authUser?.picture ? (
                    <img src={authUser.picture as string} alt="profile" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                    <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[15px]">
                        {initials}
                    </div>
                )}
                <span className="text-error text-[12px] px-2 py-0.5 rounded-full bg-error/15 font-semibold">Admin</span>
            </div>

            {/* Menu */}
            <div className="flex-1 overflow-y-auto px-[10px] pb-2 flex flex-col gap-4">
                {sections.map(section => (
                    <div key={section.label}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-light/40 px-[10px] mb-1">
                            {section.label}
                        </p>
                        <ul className="flex flex-col gap-[2px]">
                            {section.items.map((m, idx) => {
                                const count = m.badge ? (counts[m.badge] ?? 0) : 0
                                return (
                                    <li key={idx}>
                                        <NavLink
                                            to={m.path}
                                            end={m.path === '/'}
                                            className={({ isActive }) =>
                                                `flex p-[9px] gap-[10px] text-[13.5px] items-center transition-all duration-200 ${isActive
                                                    ? 'text-sidebar-primary bg-sidebar-accent rounded-[10px]'
                                                    : 'hover:text-sidebar-primary hover:bg-sidebar-accent hover:rounded-[10px]'
                                                }`
                                            }
                                        >
                                            {m.icon}
                                            <span className="flex-1 leading-tight">{m.title}</span>
                                            {count > 0 && (
                                                <span className="min-w-[20px] h-[20px] bg-error text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                                                    {count > 99 ? '99+' : count}
                                                </span>
                                            )}
                                        </NavLink>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Logout */}
            <div className="w-full p-2.5 border-t border-sidebar-accent">
                <button
                    onClick={handleLogout}
                    className="flex w-full p-2.5 gap-3 text-[13.5px] items-center hover:text-error active:text-error hover:bg-sidebar-accent hover:rounded-xl transition-colors cursor-pointer"
                >
                    <LogOut size={17} /> ออกจากระบบ
                </button>
            </div>
        </aside>
    )
}

export default SidebarAdmin
