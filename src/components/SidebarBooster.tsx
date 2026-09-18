import { useEffect } from 'react'
import { NavLink, useNavigate } from "react-router"
import {
    HomeIcon, LogOut, SearchIcon, LayoutDashboard, UserRound,
    Wallet, Video, Vote, TrendingUp, RotateCcw, MessageSquareWarning,
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useBoosterBadgeStore, type BoosterBadgeCounts } from '../store/useBoosterBadgeStore'

type BadgeKey = keyof BoosterBadgeCounts

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
            { icon: <LayoutDashboard size={18} />, title: 'แดชบอร์ด', path: '/booster/dashboard', end: true },
        ],
    },
    {
        label: 'การลงทุน',
        items: [
            { icon: <Wallet size={18} />, title: 'การลงทุน', path: '/booster/investments' },
            { icon: <Vote size={18} />, title: 'โหวต', path: '/booster/votes', badge: 'pending_votes' },
            { icon: <Video size={18} />, title: 'การประชุม', path: '/booster/meetings', badge: 'upcoming_meetings' },
        ],
    },
    {
        label: 'การเงิน',
        items: [
            { icon: <TrendingUp size={18} />, title: 'กำไร', path: '/booster/profits' },
            { icon: <RotateCcw size={18} />, title: 'คืนเงิน', path: '/booster/refunds', badge: 'pending_refunds' },
        ],
    },
    {
        label: 'การจัดการ',
        items: [
            { icon: <MessageSquareWarning size={18} />, title: 'คำร้องเรียน', path: '/booster/complaints', badge: 'open_complaints' },
        ],
    },
    {
        label: 'บัญชี',
        items: [
            { icon: <UserRound size={18} />, title: 'โปรไฟล์', path: '/booster/profile' },
        ],
    },
]

const SidebarBooster = () => {
    const navigate = useNavigate()
    const { logout, authUser } = useAuthStore()
    const { counts, fetchBadges } = useBoosterBadgeStore()

    useEffect(() => {
        fetchBadges()
        const interval = setInterval(fetchBadges, 10_000)
        const refreshOnVisible = () => {
            if (document.visibilityState === 'visible') fetchBadges()
        }
        window.addEventListener('focus', fetchBadges)
        document.addEventListener('visibilitychange', refreshOnVisible)
        return () => {
            clearInterval(interval)
            window.removeEventListener('focus', fetchBadges)
            document.removeEventListener('visibilitychange', refreshOnVisible)
        }
    }, [fetchBadges])

    const handleLogout = () => { logout(); navigate('/') }

    const initials = `${(authUser?.first_name as string)?.[0] ?? ''}${(authUser?.last_name as string)?.[0] ?? ''}`.toUpperCase() || '?'

    return (
        <aside className="bg-sidebar w-57.5 flex-none h-full text-primary-light flex flex-col pt-2.5 border-r border-sidebar-accent">

            {/* Profile */}
            <div className="w-full flex flex-col items-center gap-2 pb-4 px-3">
                {authUser?.picture ? (
                    <img src={authUser.picture as string} alt="profile" className="h-11 w-11 rounded-full border-2 border-sidebar-accent object-cover" />
                ) : (
                    <div className="h-11 w-11 rounded-full border-2 border-sidebar-accent bg-primary/20 flex items-center justify-center text-primary font-bold text-[15px]">
                        {initials}
                    </div>
                )}
                <span className="text-sidebar-primary text-[12px] px-2 py-0.5 rounded-full bg-sidebar-primary/20 font-semibold">
                    Booster
                </span>
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
                                                `flex p-2.5 gap-2.5 text-[13.5px] items-center transition-all duration-200 cursor-pointer ${isActive
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

export default SidebarBooster
