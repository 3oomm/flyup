import { useEffect } from 'react'
import { NavLink, useNavigate } from "react-router"
import {
    HomeIcon, LogOut, SearchIcon, LayoutDashboard, UserRound,
    Files, Flag, CalendarClock, Banknote, TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { usePioneerBadgeStore, type PioneerBadgeCounts } from '../store/usePioneerBadgeStore'

type BadgeKey = keyof PioneerBadgeCounts

interface MenuItem {
    icon: React.ReactNode
    title: string
    path: string
    end?: boolean
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
            { icon: <HomeIcon size={18} />, title: 'หน้าหลัก', path: '/', end: true },
            { icon: <SearchIcon size={18} />, title: 'สำรวจโปรเจกต์', path: '/projects' },
            { icon: <LayoutDashboard size={18} />, title: 'แดชบอร์ด', path: '/pioneer/dashboard', end: true },
        ],
    },
    {
        label: 'โปรเจกต์',
        items: [
            { icon: <Files size={18} />, title: 'โปรเจกต์ของฉัน', path: '/pioneer/dashboard/projects' },
            { icon: <Flag size={18} />, title: 'Milestone', path: '/pioneer/dashboard/milestones', badge: 'active_milestones' },
            { icon: <CalendarClock size={18} />, title: 'การประชุม', path: '/pioneer/dashboard/meetings', badge: 'upcoming_meetings' },
        ],
    },
    {
        label: 'การเงิน',
        items: [
            { icon: <Banknote size={18} />, title: 'การรับเงิน', path: '/pioneer/dashboard/payouts', badge: 'pending_payouts' },
            { icon: <TrendingUp size={18} />, title: 'จ่ายปันผล', path: '/pioneer/dashboard/profit' },
        ],
    },
    {
        label: 'บัญชี',
        items: [
            { icon: <UserRound size={18} />, title: 'โปรไฟล์', path: '/pioneer/profile' },
        ],
    },
]

const SidebarPioneer = () => {
    const navigate = useNavigate()
    const { logout, authUser } = useAuthStore()
    const { counts, fetchBadges } = usePioneerBadgeStore()

    useEffect(() => {
        fetchBadges()
        const interval = setInterval(fetchBadges, 30_000)
        return () => clearInterval(interval)
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
                <span className="text-sidebar-primary text-[12px] px-2 py-0.5 rounded-full bg-sidebar-primary/20 font-semibold">Pioneer</span>
            </div>

            {/* Menu */}
            <div className="flex-1 overflow-y-auto px-2.5 pb-2 flex flex-col gap-4">
                {sections.map(section => (
                    <div key={section.label}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-light/40 px-2.5 mb-1">
                            {section.label}
                        </p>
                        <ul className="flex flex-col gap-0.5">
                            {section.items.map((m, idx) => {
                                const count = m.badge ? (counts[m.badge] ?? 0) : 0
                                return (
                                    <li key={idx}>
                                        <NavLink
                                            to={m.path}
                                            end={m.end ?? false}
                                            className={({ isActive }) =>
                                                `flex p-2.5 gap-2.5 text-[13.5px] items-center transition-all duration-200 ${isActive
                                                    ? 'text-sidebar-primary bg-sidebar-accent rounded-[10px]'
                                                    : 'hover:text-sidebar-primary hover:bg-sidebar-accent hover:rounded-[10px]'
                                                }`
                                            }
                                        >
                                            {m.icon}
                                            <span className="flex-1 leading-tight">{m.title}</span>
                                            {count > 0 && (
                                                <span className="min-w-5 h-5 bg-error text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
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

export default SidebarPioneer
