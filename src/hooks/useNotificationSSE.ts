import { useCallback, useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useNotificationStore, type Notification } from '../store/useNotificationStore'
import { useBoosterStore } from '../store/useBoosterStore'
import { useProjectStore } from '../store/useProjectStore'
import { usePublicProjectStore } from '../store/usePublicProjectStore'
import { useAdminBadgeStore } from '../store/useAdminBadgeStore'
import { usePioneerBadgeStore } from '../store/usePioneerBadgeStore'
import { useBoosterBadgeStore } from '../store/useBoosterBadgeStore'
import { useAdminStore } from '../store/useAdminStore'
import { useMilestoneStore } from '../store/useMilestoneStore'
import { useComplaintStore } from '../store/useComplaintStore'

const useNotificationSSE = () => {
    const { authUser, checkAuth } = useAuthStore()
    const { addNotification } = useNotificationStore()

    const handleRefresh = useCallback((notif: Notification) => {
        switch (notif.type) {

            case 'verification_approved':
            case 'verification_rejected':
            case 'user_status':
                checkAuth()
                break

            case 'project_status': {
                const pid = notif.related_id
                if (!pid) break
                const pubState = usePublicProjectStore.getState()
                if (pubState.currentPublicProject?.id === pid) {
                    pubState.fetchPublicProjectById(pid)
                }
                const pioneerState = useProjectStore.getState()
                if ((pioneerState.currentProject.id ?? 0) === pid) {
                    pioneerState.loadCurrentProject(pid)
                }
                useProjectStore.getState().fetchMyProjects()
                break
            }

            case 'new_investment': {
                const pid = notif.related_id
                if (pid) {
                    const pubState = usePublicProjectStore.getState()
                    if (pubState.currentPublicProject?.id === pid) {
                        pubState.fetchPublicProjectById(pid)
                    }
                }
                useBoosterStore.getState().fetchMyInvestments()
                break
            }

            case 'milestone_submitted': {
                useAdminStore.getState().fetchPendingMilestones()
                break
            }

            case 'milestone':
            case 'milestone_rejected': {
                const pid = notif.related_id
                if (!pid) break
                const pubState = usePublicProjectStore.getState()
                if (pubState.currentPublicProject?.id === pid) {
                    pubState.fetchPublicProjectById(pid)
                }
                const pioneerState = useProjectStore.getState()
                if ((pioneerState.currentProject.id ?? 0) === pid) {
                    pioneerState.loadCurrentProject(pid)
                }
                const milestoneState = useMilestoneStore.getState()
                if (milestoneState.milestones.length > 0) {
                    useMilestoneStore.getState().fetchMilestones(String(pid))
                }
                break
            }

            case 'profit': {
                useBoosterStore.getState().fetchMyInvestments()
                useProjectStore.getState().fetchMyProjects()
                break
            }

            case 'vote': {
                const pid = notif.related_id
                if (!pid) break
                const pubState = usePublicProjectStore.getState()
                if (pubState.currentPublicProject?.id === pid) {
                    pubState.fetchPublicProjectById(pid)
                }
                useBoosterStore.getState().fetchMyInvestments()
                break
            }

            case 'complaint': {
                useComplaintStore.getState().fetchMyComplaints()
                break
            }
        }
    }, [checkAuth])

    useEffect(() => {
        if (!authUser) return

        let es: EventSource | null = null
        let cancelled = false
        let retryTimer: ReturnType<typeof setTimeout> | null = null

        const connect = () => {
            useNotificationStore.getState().issueSseToken()
                .then((sseToken) => {
                    if (cancelled) return

                    const url = `${import.meta.env.VITE_BASE_URL}/notifications/stream?sse_token=${encodeURIComponent(sseToken)}`
                    es = new EventSource(url)

                    es.onmessage = (e: MessageEvent) => {
                        try {
                            const notif = JSON.parse(e.data) as Notification
                            if (!notif?.id) return
                            addNotification(notif)
                            handleRefresh(notif)
                            if (authUser?.role === 'admin') {
                                useAdminBadgeStore.getState().fetchBadges()
                            } else if (authUser?.role === 'pioneer') {
                                usePioneerBadgeStore.getState().fetchBadges()
                            } else if (authUser?.role?.toLowerCase() === 'booster') {
                                useBoosterBadgeStore.getState().fetchBadges()
                            }
                        } catch {
                            // ignore ping / non-JSON events
                        }
                    }

                    es.onerror = () => {
                        es?.close()
                        es = null
                        if (!cancelled && !retryTimer) {
                            retryTimer = setTimeout(() => {
                                retryTimer = null
                                connect()
                            }, 3000)
                        }
                    }
                })
                .catch(() => {
                    if (!cancelled && !retryTimer) {
                        retryTimer = setTimeout(() => {
                            retryTimer = null
                            connect()
                        }, 5000)
                    }
                })
        }

        connect()

        return () => {
            cancelled = true
            if (retryTimer) clearTimeout(retryTimer)
            es?.close()
        }
    }, [authUser, addNotification, handleRefresh])
}

export default useNotificationSSE
