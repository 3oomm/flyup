// Pure helpers for project funding display.
// Extracted from Home.tsx / Projects.tsx (where they were duplicated) so they
// can be shared and unit-tested in isolation.

export interface ProgressLike {
  funding_goal?: number
  current_funding?: number
}

export interface DaysLeftLike {
  end_date?: string | null
  duration_days?: number
}

export interface ProjectTimingLike extends DaysLeftLike {
  state?: string
  status?: string
}

/** Funding progress as a whole-number percentage, clamped to 0–100. */
export function getProgress(p: ProgressLike): number {
  if (!p.funding_goal || p.funding_goal === 0) return 0
  return Math.min(Math.round(((p.current_funding ?? 0) / p.funding_goal) * 100), 100)
}

/**
 * Days remaining until `end_date`. Falls back to `duration_days` when there's no
 * end date. Never negative. `now` is injectable so tests are deterministic.
 */
export function getDaysLeft(p: DaysLeftLike, now: number = Date.now()): number {
  if (!p.end_date) return p.duration_days || 0
  const diff = new Date(p.end_date).getTime() - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/** ข้อความด้านขวาของการ์ดตาม lifecycle ของโปรเจกต์ */
export function getProjectTimingDisplay(
  p: ProjectTimingLike,
  now: number = Date.now(),
): { caption: string; label: string } {
  if (p.state === 'executing') return { caption: 'สถานะ', label: 'กำลังดำเนินการ' }
  if (p.state === 'suspended' || p.status === 'suspended') return { caption: 'สถานะ', label: 'ระงับชั่วคราว' }
  if (p.state === 'cancelled' || p.status === 'cancelled') return { caption: 'สถานะ', label: 'ยกเลิกแล้ว' }
  if (p.state === 'pending_review') return { caption: 'สถานะ', label: 'รอตรวจสอบ' }
  if (p.state === 'pending_cancel') return { caption: 'สถานะ', label: 'รอพิจารณายกเลิก' }
  if (p.state === 'pending_edit_review') return { caption: 'สถานะ', label: 'รอตรวจสอบการแก้ไข' }
  if (p.state === 'closed' || p.status === 'completed' || p.status === 'failed') {
    if (p.status === 'completed') return { caption: 'สถานะ', label: 'สำเร็จแล้ว' }
    if (p.status === 'failed') return { caption: 'สถานะ', label: 'ไม่สำเร็จ' }
    return { caption: 'สถานะ', label: 'สิ้นสุดแล้ว' }
  }

  const daysLeft = getDaysLeft(p, now)
  return daysLeft > 0
    ? { caption: 'เหลือเวลา', label: `${daysLeft} วัน` }
    : { caption: 'สถานะ', label: 'สิ้นสุดระดมทุน' }
}
