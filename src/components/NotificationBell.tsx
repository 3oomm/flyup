import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import {
    BellIcon,
    CheckSquare,
    TrendingUp,
    FileText,
    ThumbsUp,
    Banknote,
    CalendarDays,
    Clock,
} from 'lucide-react'
import { useNotificationStore, type Notification } from '../store/useNotificationStore'
import { useAuthStore } from '../store/useAuthStore'
import useNotificationSSE from '../hooks/useNotificationSSE'

// -------------------- helpers --------------------

function timeAgo(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr ?? '')
    if (!dateStr || isNaN(date.getTime())) return ''
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return 'เมื่อกี้'
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`
    if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`
    if (diffDay < 30) return `${diffDay} วันที่แล้ว`
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

function getNotifPath(notif: Notification, role: string): string {
    const { type, related_id, related_type } = notif

    if (role === 'pioneer') {
        switch (type) {
            case 'milestone':
            case 'milestone_submitted':
            case 'milestone_rejected':
                if (related_type === 'project' && related_id)
                    return `/pioneer/dashboard/projects/${related_id}/milestones`
                return '/pioneer/dashboard/milestones'
            case 'profit':   return '/pioneer/dashboard/profit'
            case 'meeting':  return '/pioneer/dashboard/meetings'
            case 'project_status': return '/pioneer/dashboard/projects'
            default:         return '/pioneer/dashboard'
        }
    }

    if (role === 'booster') {
        switch (type) {
            case 'new_investment':
                return related_type === 'investment' && related_id
                    ? `/booster/investments/${related_id}`
                    : '/booster/investments'
            case 'vote':
            case 'milestone':
            case 'milestone_submitted':
                return related_type === 'vote' && related_id
                    ? `/booster/votes/${related_id}`
                    : '/booster/votes'
            case 'milestone_rejected': return '/booster/investments'
            case 'project_status':     return '/booster/investments'
            case 'profit':             return '/booster/profits'
            case 'meeting':            return '/booster/meetings'
            default:                   return '/booster/dashboard'
        }
    }

    if (role === 'admin') {
        switch (type) {
            case 'milestone_submitted':
                return related_type === 'milestone' && related_id
                    ? `/admin/milestones/${related_id}`
                    : '/admin/milestones'
            case 'project_status': return '/admin/projects-approval'
            default:               return '/admin/dashboard'
        }
    }

    return '/'
}

const NOTIF_CONFIG: Record<string, { icon: React.ReactNode; bg: string }> = {
    new_investment:      { icon: <TrendingUp size={16} />, bg: 'bg-emerald-500' },
    milestone:           { icon: <CheckSquare size={16} />, bg: 'bg-violet-500' },
    milestone_submitted: { icon: <CheckSquare size={16} />, bg: 'bg-violet-600' },
    milestone_rejected:  { icon: <CheckSquare size={16} />, bg: 'bg-red-500' },
    vote:                { icon: <ThumbsUp size={16} />, bg: 'bg-blue-500' },
    project_status:      { icon: <FileText size={16} />, bg: 'bg-orange-500' },
    profit:              { icon: <Banknote size={16} />, bg: 'bg-teal-500' },
    meeting:             { icon: <CalendarDays size={16} />, bg: 'bg-sky-500' },
}

function NotifIcon({ type }: { type: string }) {
    const config = NOTIF_CONFIG[type]
    return (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${config?.bg ?? 'bg-primary'}`}>
            {config?.icon ?? <BellIcon size={16} />}
        </div>
    )
}

// -------------------- item --------------------

interface NotificationItemProps {
    notif: Notification
    path: string
    onRead: (id: number) => void
    onNavigate: (path: string) => void
}

function NotificationItem({ notif, path, onRead, onNavigate }: NotificationItemProps) {
    const handleClick = () => {
        if (!notif.is_read) onRead(notif.id)
        onNavigate(path)
    }

    return (
        <div
            onClick={handleClick}
            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
        >
            <NotifIcon type={notif.type} />
            <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-foreground leading-snug">{notif.title}</p>
                <p className="text-[12px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                    {notif.body}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                    <Clock size={11} />
                    <span>{timeAgo(notif.CreatedAt)}</span>
                </div>
            </div>
            {!notif.is_read && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1" />
            )}
        </div>
    )
}

// -------------------- main --------------------

interface NotificationBellProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const NotificationBell = ({ open: openProp, onOpenChange }: NotificationBellProps = {}) => {
    const { notifications, unread, bellUnread, isLoading, fetchNotifications, markAsRead, markAllAsRead, clearUnreadCount } =
        useNotificationStore()
    const { authUser } = useAuthStore()
    const navigate = useNavigate()

    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = openProp !== undefined
    const open = isControlled ? openProp : internalOpen
    const setOpen = (next: boolean) => {
        if (isControlled) onOpenChange?.(next)
        else setInternalOpen(next)
    }
    const panelRef = useRef<HTMLDivElement>(null)

    useNotificationSSE()

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isControlled, onOpenChange])

    const handleBellClick = () => {
        const next = !open
        setOpen(next)
        if (next && bellUnread > 0) clearUnreadCount()
    }

    const role = authUser?.role ?? ''

    const handleNavigate = (path: string) => {
        setOpen(false)
        navigate(path)
    }

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell button */}
            <button
                onClick={handleBellClick}
                className="p-2 text-foreground hover:bg-background rounded-full transition-colors relative cursor-pointer"
                aria-label="การแจ้งเตือน"
            >
                <BellIcon size={20} />
                {bellUnread > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                        {bellUnread > 99 ? '99+' : bellUnread}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-xl shadow-xl border border-border z-50 overflow-hidden font-kanit">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-[15px] text-foreground">
                                การแจ้งเตือน
                            </span>
                            {unread > 0 && (
                                <span className="bg-primary text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
                                    {unread} ใหม่
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unread > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[11px] text-primary hover:underline cursor-pointer"
                                >
                                    อ่านทั้งหมด
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                        {isLoading ? (
                            <div className="py-10 text-center text-[13px] text-muted-foreground">
                                กำลังโหลด...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-10 text-center text-[13px] text-muted-foreground">
                                ไม่มีการแจ้งเตือน
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <NotificationItem
                                    key={notif.id}
                                    notif={notif}
                                    path={getNotifPath(notif, role)}
                                    onRead={markAsRead}
                                    onNavigate={handleNavigate}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default NotificationBell
