import { create } from 'zustand'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from './useAuthStore'

export interface Notification {
    id: number
    user_id: number
    type: string
    title: string
    body: string
    is_read: boolean
    related_id?: number
    related_type?: string
    CreatedAt: string
    UpdatedAt: string
}

interface NotificationStore {
    notifications: Notification[]
    unread: number
    bellUnread: number
    total: number
    isLoading: boolean
    fetchNotifications: () => Promise<void>
    markAsRead: (id: number) => Promise<void>
    markAllAsRead: () => Promise<void>
    clearUnreadCount: () => void
    addNotification: (notif: Notification) => void
    fetchNotificationPreferences: () => Promise<Record<string, boolean> | null>
    updateNotificationPreferences: (prefs: Record<string, boolean>) => Promise<boolean>
}

function safeNotificationPrefs(raw: unknown): Record<string, boolean> | null {
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0) {
        return raw as Record<string, boolean>
    }
    return null
}

const bellSeenStorageKey = (userId: number) => `flyup:notification-bell-seen:${userId}`

function getLastSeenNotificationId(userId?: number): number {
    if (!userId) return 0
    try {
        return Number(localStorage.getItem(bellSeenStorageKey(userId))) || 0
    } catch {
        return 0
    }
}

function saveLastSeenNotificationId(userId: number, notificationId: number) {
    try {
        localStorage.setItem(bellSeenStorageKey(userId), String(notificationId))
    } catch {
        // The in-memory count still clears when storage is unavailable.
    }
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unread: 0,
    bellUnread: 0,
    total: 0,
    isLoading: false,

    fetchNotifications: async () => {
        set({ isLoading: true })
        try {
            const res = await api.get('/notifications', { params: { limit: 20, page: 1 } })
            const data = res.data?.data
            const notifications: Notification[] = data?.notifications ?? []
            const userId = notifications[0]?.user_id
            const lastSeenId = getLastSeenNotificationId(userId)
            set({
                notifications,
                unread: data?.unread ?? 0,
                bellUnread: lastSeenId > 0
                    ? notifications.filter((n) => !n.is_read && n.id > lastSeenId).length
                    : data?.unread ?? 0,
                total: data?.total ?? 0,
            })
        } catch {
            // ignore
        } finally {
            set({ isLoading: false })
        }
    },

    markAsRead: async (id: number) => {
        try {
            await api.patch(`/notifications/${id}/read`)
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, is_read: true } : n
                ),
                unread: Math.max(0, state.unread - 1),
                bellUnread: Math.max(0, state.bellUnread - 1),
            }))
        } catch {
            // ignore
        }
    },

    markAllAsRead: async () => {
        try {
            await api.patch('/notifications/read-all')
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
                unread: 0,
                bellUnread: 0,
            }))
        } catch {
            // ignore
        }
    },

    clearUnreadCount: () => {
        const latest = get().notifications.reduce<Notification | null>(
            (current, notif) => !current || notif.id > current.id ? notif : current,
            null,
        )
        if (latest) saveLastSeenNotificationId(latest.user_id, latest.id)
        set({ bellUnread: 0 })
    },

    addNotification: (notif: Notification) => {
        set((state) => {
            const exists = state.notifications.some((n) => n.id === notif.id)
            if (exists) return state
            return {
                notifications: [notif, ...state.notifications],
                unread: state.unread + 1,
                bellUnread: state.bellUnread + 1,
                total: state.total + 1,
            }
        })
    },

    fetchNotificationPreferences: async () => {
        try {
            const res = await api.get('/user/notification-preferences')
            const prefs = safeNotificationPrefs(res.data?.data)
            if (prefs) {
                useAuthStore.setState((state) => ({
                    authUser: state.authUser ? { ...state.authUser, notification_preferences: prefs } : state.authUser,
                }))
            }
            return prefs
        } catch {
            return null
        }
    },

    updateNotificationPreferences: async (prefs) => {
        try {
            await api.patch('/user/notification-preferences', { notification_preferences: prefs })
            useAuthStore.setState((state) => ({
                authUser: state.authUser ? { ...state.authUser, notification_preferences: prefs } : state.authUser,
            }))
            return true
        } catch {
            toast.error('บันทึกไม่สำเร็จ กรุณาลองใหม่')
            return false
        }
    },
}))
