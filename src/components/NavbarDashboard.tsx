import { Menu } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import NotificationBell from './NotificationBell'

interface NavbarProps {
    onOpenSidebar: () => void;
}

const NavbarDashboard = ({ onOpenSidebar }: NavbarProps) => {
    const { authUser } = useAuthStore()

    const displayName = [authUser?.first_name, authUser?.last_name].filter(Boolean).join(' ') || authUser?.name || ''

    return (
        <header className="h-16 min-w-0 bg-white border-b border-border flex items-center justify-between px-3 sm:px-4 xl:px-8 sticky top-0 z-10 font-kanit">
            <div className="flex items-center">
                <button
                    onClick={onOpenSidebar}
                    className="lg:hidden p-2 hover:bg-background rounded-md mr-2 cursor-pointer"
                    aria-label="เปิดเมนู"
                >
                    <Menu size={20} className="text-foreground" />
                </button>
            </div>
            <div className="flex items-center gap-2 lg:gap-[17px]">
                <NotificationBell />
                <div className="flex items-center">
                    <div className="flex flex-col items-end hidden sm:flex">
                        <span className="text-[14px] text-foreground">{displayName}</span>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default NavbarDashboard
