import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SlipUpload from './SlipUpload'
import api from '../services/api'

vi.mock('../services/api', () => ({ default: { post: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))

describe('SlipUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  it('rejects unsupported and oversized images before uploading', () => {
    const onChange = vi.fn()
    render(<SlipUpload value="" onChange={onChange} onBusyChange={vi.fn()} />)
    const input = screen.getByLabelText(/สลิปการโอน/)
    fireEvent.change(input, { target: { files: [new File(['pdf'], 'slip.pdf', { type: 'application/pdf' })] } })
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })] } })
    expect(api.post).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('only exposes a saved URL after upload succeeds', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { url: 'https://res.cloudinary.com/flyup/image/upload/slip.png' } } })
    const onChange = vi.fn()
    const busy = vi.fn()
    render(<SlipUpload value="" onChange={onChange} onBusyChange={busy} />)
    fireEvent.change(screen.getByLabelText(/สลิปการโอน/), { target: { files: [new File(['image'], 'slip.png', { type: 'image/png' })] } })
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('https://res.cloudinary.com/flyup/image/upload/slip.png'))
    expect(busy.mock.calls).toEqual([[true], [false]])
    expect(vi.mocked(api.post).mock.calls[0][1]).toBeInstanceOf(FormData)
  })

  it('clears the old slip and busy state on upload failure', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('upload failed'))
    const onChange = vi.fn()
    const busy = vi.fn()
    render(<SlipUpload value="old-url" onChange={onChange} onBusyChange={busy} />)
    fireEvent.change(screen.getByLabelText(/สลิปการโอน/), { target: { files: [new File(['image'], 'slip.png', { type: 'image/png' })] } })
    await waitFor(() => expect(busy).toHaveBeenLastCalledWith(false))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('')
    expect(screen.queryByAltText('สลิปที่เลือก')).not.toBeInTheDocument()
  })
})
