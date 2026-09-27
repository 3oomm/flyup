import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { CheckCircle2, Clock, Loader2, RotateCcw } from 'lucide-react'
import { useBoosterStore } from '../../store/useBoosterStore'

function fmtDate(d?: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtBaht(v?: number) {
  return `฿${(v ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
}

const Refunds = () => {
  const navigate = useNavigate()
  const { investments, isLoading, fetchMyInvestments } = useBoosterStore()
  const [visibleCount, setVisibleCount] = useState(5)

  useEffect(() => { fetchMyInvestments() }, [fetchMyInvestments])

  const refunds = investments.filter(inv =>
    inv.status === 'refund_pending' || inv.status === 'refunded'
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">การคืนเงิน</h1>
        <p className="text-sm text-muted-foreground mt-1">
          รายการคืนเงินจากโปรเจกต์ที่ Milestone ไม่ผ่านหรือถูกยกเลิก
        </p>
      </div>

      {refunds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <RotateCcw size={32} className="opacity-30" />
          <p className="text-sm">ไม่มีรายการคืนเงิน</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {refunds.slice(0, visibleCount).map(inv => {
            const isRefunded = inv.status === 'refunded'
            const projectTitle = inv.project?.title ?? `Project ${inv.project_id}`
            const amount = inv.refund_amount ?? inv.amount ?? 0

            return (
              <div
                key={inv.id}
                className="bg-white border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                    isRefunded ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-500'
                  }`}>
                    {isRefunded ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground text-[14px] truncate">{projectTitle}</h3>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {isRefunded
                        ? `คืนเงินเมื่อ ${fmtDate(inv.refunded_at)}`
                        : `ขอคืนเงิน ${fmtDate(inv.updated_at)}`}
                    </p>
                    {inv.refund_note && (
                      <p className="text-[11px] text-muted-foreground mt-1 italic">"{inv.refund_note}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-primary">{fmtBaht(amount)}</p>
                    <span className={`mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex ${
                      isRefunded
                        ? 'bg-primary text-white'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isRefunded ? 'คืนแล้ว' : 'กำลังดำเนินการ'}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/booster/investments/${inv.id}`)}
                    className="text-[12px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
                  >
                    รายละเอียด →
                  </button>
                </div>
              </div>
            )
          })}
          {visibleCount < refunds.length && (
            <div className="flex justify-center pt-3">
              <button onClick={() => setVisibleCount(count => count + 5)} className="rounded-lg bg-[#171525] px-7 py-3 text-sm font-semibold text-white hover:opacity-90">
                โหลดเพิ่มเติม
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Refunds
