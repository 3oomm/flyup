import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationStore } from '../store/useNotificationStore'
import NotificationBell from './NotificationBell'

vi.mock('../hooks/useNotificationSSE', () => ({ default: () => {} }))

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
