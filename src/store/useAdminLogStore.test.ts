import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../services/api'
import { useAdminLogStore } from './useAdminLogStore'

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }))

describe('admin dashboard log pagination', () => {
    beforeEach(() => vi.mocked(api.get).mockReset())

    it('loads every page using the API maximum page size', async () => {
        vi.mocked(api.get).mockImplementation(async (url) => {
            const page = Number(new URLSearchParams(String(url).split('?')[1]).get('page'))
            return {
                data: {
                    data: Array.from({ length: page === 1 ? 100 : 35 }, (_, i) => ({ id: (page - 1) * 100 + i + 1 })),
                    meta: { total: 135 },
                },
            }
        })

        const logs = await useAdminLogStore.getState().fetchChartLogs('2026-01-01', '2026-06-30')

        expect(logs).toHaveLength(135)
        expect(logs[0].id).toBe(1)
        expect(logs[134].id).toBe(135)
        expect(api.get).toHaveBeenCalledTimes(2)
        expect(api.get).toHaveBeenNthCalledWith(1, '/admin/logs?page=1&page_size=100&from=2026-01-01&to=2026-06-30')
        expect(api.get).toHaveBeenNthCalledWith(2, '/admin/logs?page=2&page_size=100&from=2026-01-01&to=2026-06-30')
    })
})
