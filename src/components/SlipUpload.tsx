import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'

interface Props {
  value: string
  onChange: (url: string) => void
  onBusyChange: (busy: boolean) => void
  disabled?: boolean
}

export default function SlipUpload({ value, onChange, onBusyChange, disabled }: Props) {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState('')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const upload = async (file?: File) => {
    if (!file) return
    onChange('')
    setPreview('')
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      toast.error('เลือกสลิป JPG, PNG, GIF หรือ WebP ขนาดไม่เกิน 4 MB')
      return
    }
    setPreview(URL.createObjectURL(file))
    setBusy(true)
    onBusyChange(true)
    try {
      const data = new FormData()
      data.append('file', file)
      const res = await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 })
      if (!res.data?.data?.url) throw new Error('Missing upload URL')
      onChange(res.data.data.url)
    } catch {
      setPreview('')
      toast.error('อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setBusy(false)
      onBusyChange(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium">
        สลิปการโอน <span className="text-red-500">*</span>
        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" disabled={busy || disabled}
          onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }}
          className="mt-1 block w-full rounded-lg border border-border p-2 text-[12px]" />
      </label>
      {preview && <img src={preview} alt="สลิปที่เลือก" className="max-h-40 w-full rounded-lg border border-border object-contain" />}
      <p role="status" className="text-xs text-muted-foreground">
        {busy ? 'กำลังอัปโหลดสลิป…' : value ? 'แนบสลิปแล้ว ระบบจะตรวจยอด บัญชีผู้รับ และสลิปซ้ำเมื่อยืนยัน' : 'แนบรูปสลิปที่เห็น QR ชัดเจน ขนาดไม่เกิน 4 MB'}
      </p>
    </div>
  )
}
