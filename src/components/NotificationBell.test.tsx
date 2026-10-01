import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationStore } from '../store/useNotificationStore'
import NotificationBell, { getNotifPath } from './NotificationBell'

vi.mock('../hooks/useNotificationSSE', () => ({ default: () => {} }))

describe('admin notification destinations', () => {
    const notification = {
        id: 1,
        user_id: 1,
        type: 'milestone',
        title: 'Phase ผ่านการโหวต – รอโอนเงิน',
        body: '',
        is_read: false,
        related_id: 42,
        related_type: 'milestone',
        CreatedAt: '',
        UpdatedAt: '',
    }

    it('opens disbursements for a phase awaiting transfer', () => {
        expect(getNotifPath(notification, 'admin')).toBe('/admin/disbursements')
    })

    it('opens profit distribution when a pioneer transfers profit', () => {
        expect(getNotifPath({
            ...notification,
            type: 'profit',
            title: 'Pioneer โอนกำไรเข้าระบบ',
            related_type: 'profit_pool',
        }, 'admin')).toBe('/admin/profit-distribution')
    })

    it('opens the milestone detail for other milestone notifications', () => {
        expect(getNotifPath({ ...notification, title: 'Milestone ผ่านการโหวต' }, 'admin')).toBe('/admin/milestones/42')
    })
})

describe('mobile notifications', () => {
    afterEach(() => vi.unstubAllGlobals())
    beforeEach(() => {
        vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
        useNotificationStore.setState({
            notifications: [],
            unread: 0,
            bellUnread: 0,
            isLoading: false,
            fetchNotifications: vi.fn(async () => {}),
        })
    })

    it('keeps the panel on the viewport and closes it on an outside click', () => {
        render(<MemoryRouter><NotificationBell mobile /></MemoryRouter>)

        fireEvent.click(screen.getByRole('button', { name: 'การแจ้งเตือน' }))
        const panel = screen.getByText('ไม่มีการแจ้งเตือน').parentElement?.parentElement
        expect(panel).toHaveClass('fixed', 'left-4', 'right-4')
        expect(panel?.parentElement).toBe(document.body)

        fireEvent.mouseDown(document.body)
        expect(screen.queryByText('ไม่มีการแจ้งเตือน')).not.toBeInTheDocument()
    })

    it('keeps the mobile panel open when the hidden desktop bell is mounted', () => {
        function BothBells() {
            const [open, setOpen] = useState(false)
            return <>
                <NotificationBell open={open} onOpenChange={setOpen} desktopOnly />
                <NotificationBell open={open} onOpenChange={setOpen} mobile />
            </>
        }

        render(<MemoryRouter><BothBells /></MemoryRouter>)
        fireEvent.click(screen.getAllByRole('button', { name: 'การแจ้งเตือน' })[1])
        const emptyState = screen.getAllByText('ไม่มีการแจ้งเตือน')[1]
        fireEvent.mouseDown(emptyState)
        expect(emptyState).toBeInTheDocument()
    })
})
