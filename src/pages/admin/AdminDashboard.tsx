import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  FolderOpen, Milestone, MessageSquareWarning,
  RotateCcw, ShieldCheck, UserRoundCheck, ArrowRight,
  CheckCircle2, Clock, XCircle, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAdminBadgeStore } from '@/store/useAdminBadgeStore'
import { useFinanceStore, type FinancialSummary, type ProjectFinancial } from '@/store/useFinanceStore'
import { useAdminLogStore, type AdminLogItem } from '@/store/useAdminLogStore'

// ─── กราฟรายเดือน: คำนวณจาก /admin/logs (audit log จริง) แทนข้อมูล mock ────────────

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const toDateParam = (d: Date) => d.toISOString().slice(0, 10) // YYYY-MM-DD

/** รวม log 6 เดือนล่าสุดเป็นข้อมูลกราฟ "กิจกรรมรายเดือน" และ "ผลการตรวจสอบ" */
function buildMonthlyCharts(logs: AdminLogItem[]) {
  const now = new Date()
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: THAI_MONTHS_SHORT[d.getMonth()] }
  })

  const counts = new Map<string, { projects: number; milestones: number; approved: number; rejected: number }>()
  for (const b of buckets) counts.set(b.key, { projects: 0, milestones: 0, approved: 0, rejected: 0 })

  for (const log of logs) {
    const d = new Date(log.created_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = counts.get(key)
    if (!bucket) continue // นอกช่วง 6 เดือนที่สนใจ
    if (log.action === 'approve_project') bucket.projects++
    if (log.action === 'approve_milestone') bucket.milestones++
    if (log.action.startsWith('approve_')) bucket.approved++
    if (log.action.startsWith('reject_')) bucket.rejected++
  }

  return {
    activityData: buckets.map(b => ({ month: b.label, projects: counts.get(b.key)!.projects, milestones: counts.get(b.key)!.milestones })),
    approvalData: buckets.map(b => ({ month: b.label, อนุมัติ: counts.get(b.key)!.approved, ปฏิเสธ: counts.get(b.key)!.rejected })),
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  href?: string
}

function StatCard({ title, value, subtitle, icon, href }: StatCardProps) {
  const navigate = useNavigate()
  return (
    <Card
      className={`gap-3 py-5 ${href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={href ? () => navigate(href) : undefined}
    >
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardDescription className="text-[13px]">{title}</CardDescription>
          <span className="text-muted-foreground">{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-[28px] font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['ภาพรวม', 'การเงิน'] as const
type Tab = typeof TABS[number]

// ─── Main ─────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const fetchChartLogs = useAdminLogStore((state) => state.fetchChartLogs)
  const { counts, fetchBadges } = useAdminBadgeStore()
  const { summary, projects, isLoadingSummary, isLoadingProjects, fetchSummary, fetchProjects } = useFinanceStore()
  const [tab, setTab] = useState<Tab>('ภาพรวม')
  const [charts, setCharts] = useState<{ activityData: { month: string; projects: number; milestones: number }[]; approvalData: { month: string; อนุมัติ: number; ปฏิเสธ: number }[] } | null>(null)
  const [isLoadingCharts, setIsLoadingCharts] = useState(true)

  useEffect(() => { fetchBadges() }, [fetchBadges])

  useEffect(() => {
    if (tab === 'การเงิน') {
      fetchSummary()
      fetchProjects()
    }
  }, [tab, fetchSummary, fetchProjects])

  // โหลด audit log 6 เดือนล่าสุดมาคำนวณกราฟ "กิจกรรมรายเดือน" / "ผลการตรวจสอบ" เอง (backend ไม่มี endpoint สรุปรายเดือนแยกไว้)
  useEffect(() => {
    const now = new Date()
    const from = toDateParam(new Date(now.getFullYear(), now.getMonth() - 5, 1))
    const to = toDateParam(now)
    fetchChartLogs(from, to)
      .then(logs => setCharts(buildMonthlyCharts(logs)))
      .catch(() => {
        setCharts(buildMonthlyCharts([]))
        toast.error('โหลดข้อมูลกิจกรรมสำหรับกราฟไม่สำเร็จ')
      })
      .finally(() => setIsLoadingCharts(false))
  }, [fetchChartLogs])

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold text-foreground">แดชบอร์ด</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">ภาพรวมระบบและรายการรอดำเนินการ</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'ภาพรวม' && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="โปรเจกต์รอตรวจสอบ"
              value={counts.pending_projects}
              subtitle="รอการอนุมัติจาก Admin"
              icon={<FolderOpen size={16} />}
              href="/admin/projects-approval"
            />
            <StatCard
              title="Milestone รอตรวจสอบ"
              value={counts.submitted_milestones}
              subtitle="หลักฐานรอการตรวจสอบ"
              icon={<Milestone size={16} />}
              href="/admin/milestones"
            />
            <StatCard
              title="คำร้องเรียนเปิดอยู่"
              value={counts.open_complaints}
              subtitle="รอการจัดการ"
              icon={<MessageSquareWarning size={16} />}
              href="/admin/complaints"
            />
            <StatCard
              title="รอยืนยันตัวตน"
              value={counts.pending_verifications}
              subtitle="KYC รอการอนุมัติ"
              icon={<ShieldCheck size={16} />}
              href="/admin/verifications"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

            {/* Area Chart */}
            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle className="text-[15px]">กิจกรรมรายเดือน</CardTitle>
                <CardDescription className="text-[12px]">โปรเจกต์และ Milestone ที่อนุมัติใน 6 เดือนที่ผ่านมา</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCharts ? (
                  <div className="flex items-center justify-center h-[220px]"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={charts?.activityData ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradProj" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradMile" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                      <Area type="monotone" dataKey="projects" name="โปรเจกต์" stroke="#7c3aed" strokeWidth={2} fill="url(#gradProj)" />
                      <Area type="monotone" dataKey="milestones" name="Milestone" stroke="#06b6d4" strokeWidth={2} fill="url(#gradMile)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-[15px]">ผลการตรวจสอบ</CardTitle>
                <CardDescription className="text-[12px]">อนุมัติ vs ปฏิเสธ รายเดือน</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCharts ? (
                  <div className="flex items-center justify-center h-[220px]"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={charts?.approvalData ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                      <Bar dataKey="อนุมัติ" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ปฏิเสธ" fill="#f87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

            {/* Pending Actions Table */}
            <Card className="xl:col-span-3">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[15px]">รายการรอดำเนินการ</CardTitle>
                  <CardDescription className="text-[12px] mt-0.5">งานที่ต้องจัดการ</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <PendingTable counts={counts} />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-[15px]">สถิติระบบ</CardTitle>
                <CardDescription className="text-[12px] mt-0.5">ตัวเลขสำคัญของระบบ</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <QuickStatRow icon={<FolderOpen size={15} className="text-violet-500" />} label="โปรเจกต์รอตรวจสอบ" value={counts.pending_projects} href="/admin/projects-approval" />
                <QuickStatRow icon={<Milestone size={15} className="text-cyan-500" />} label="Milestone รอตรวจสอบ" value={counts.submitted_milestones} href="/admin/milestones" />
                <QuickStatRow icon={<MessageSquareWarning size={15} className="text-amber-500" />} label="คำร้องเรียนเปิดอยู่" value={counts.open_complaints} href="/admin/complaints" />
                <QuickStatRow icon={<RotateCcw size={15} className="text-teal-500" />} label="การคืนเงินรอดำเนินการ" value={counts.pending_refunds} href="/admin/refunds" />
                <QuickStatRow icon={<ShieldCheck size={15} className="text-green-500" />} label="รอยืนยันตัวตน" value={counts.pending_verifications} href="/admin/verifications" />
                <QuickStatRow icon={<UserRoundCheck size={15} className="text-orange-500" />} label="คำขอยกเลิกโปรเจกต์" value={counts.pending_cancel_requests} href="/admin/cancel-requests" />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {tab === 'การเงิน' && (
        <FinanceTab
          summary={summary}
          projects={projects}
          isLoadingSummary={isLoadingSummary}
          isLoadingProjects={isLoadingProjects}
        />
      )}

    </div>
  )
}

// ─── Pending Table ────────────────────────────────────────────────────────────

interface BadgeCounts { pending_projects: number; submitted_milestones: number; open_complaints: number; pending_refunds: number; pending_verifications: number; pending_cancel_requests: number }

function PendingTable({ counts }: { counts: BadgeCounts }) {
  const navigate = useNavigate()
  const rows = [
    { label: 'โปรเจกต์รอตรวจสอบ', count: counts.pending_projects, dot: 'bg-violet-500', href: '/admin/projects-approval' },
    { label: 'Milestone รอตรวจสอบ', count: counts.submitted_milestones, dot: 'bg-cyan-500', href: '/admin/milestones' },
    { label: 'คำร้องเรียนเปิดอยู่', count: counts.open_complaints, dot: 'bg-amber-500', href: '/admin/complaints' },
    { label: 'การคืนเงินรอดำเนินการ', count: counts.pending_refunds, dot: 'bg-teal-500', href: '/admin/refunds' },
    { label: 'รอยืนยันตัวตน', count: counts.pending_verifications, dot: 'bg-green-500', href: '/admin/verifications' },
    { label: 'คำขอยกเลิกโปรเจกต์', count: counts.pending_cancel_requests, dot: 'bg-orange-500', href: '/admin/cancel-requests' },
  ]
  return (
    <div className="divide-y divide-border">
      {rows.map((r) => (
        <div
          key={r.label}
          onClick={() => navigate(r.href)}
          className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${r.dot}`} />
            <span className="text-[13px] text-foreground">{r.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[13px] font-semibold min-w-[24px] text-right ${r.count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {r.count}
            </span>
            {r.count > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                รอดำเนินการ
              </span>
            )}
            <ArrowRight size={14} className="text-muted-foreground" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Quick Stat Row ───────────────────────────────────────────────────────────

function QuickStatRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href: string }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(href)}
      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[13px] text-foreground">{label}</span>
      </div>
      <span className={`text-[13px] font-bold ${value > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Finance Tab ─────────────────────────────────────────────────────────────

function fmtBahtFin(v: number) {
  return `฿${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATE_LABEL: Record<string, { label: string; cls: string }> = {
  executing:  { label: 'กำลังดำเนินการ', cls: 'bg-blue-100 text-blue-700' },
  funded:     { label: 'ได้รับทุนแล้ว',  cls: 'bg-teal-100 text-teal-700' },
  completed:  { label: 'เสร็จสิ้น',      cls: 'bg-green-100 text-green-700' },
  cancelled:  { label: 'ยกเลิก',         cls: 'bg-red-100 text-red-700' },
}

const PHASE_STATUS: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  confirmed:   { icon: <CheckCircle2 size={14} />, cls: 'text-green-600', label: 'โอนแล้ว' },
  pending:     { icon: <Clock size={14} />,        cls: 'text-amber-500', label: 'รอโอน' },
  not_started: { icon: <XCircle size={14} />,      cls: 'text-muted-foreground', label: 'ยังไม่ถึง' },
}

function FinanceTab({ summary, projects, isLoadingSummary, isLoadingProjects }: {
  summary: FinancialSummary | null
  projects: ProjectFinancial[]
  isLoadingSummary: boolean
  isLoadingProjects: boolean
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-5">

      {/* Summary Cards */}
      {isLoadingSummary ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="py-5 gap-2">
            <CardHeader className="pb-0">
              <CardDescription className="text-[12px]">Stripe พร้อมใช้ได้</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[22px] font-bold text-emerald-600">{fmtBahtFin(summary?.stripe.available ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">รอดำเนินการ {fmtBahtFin(summary?.stripe.pending ?? 0)}</p>
            </CardContent>
          </Card>

          <Card className="py-5 gap-2">
            <CardHeader className="pb-0">
              <CardDescription className="text-[12px]">ปล่อยเงินให้ Pioneer แล้ว</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[22px] font-bold text-primary">{fmtBahtFin(summary?.disbursement.total_confirmed ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                รอโอน {fmtBahtFin(summary?.disbursement.total_pending ?? 0)} ({summary?.disbursement.count_pending ?? 0} รายการ)
              </p>
            </CardContent>
          </Card>

          <Card className="py-5 gap-2">
            <CardHeader className="pb-0">
              <CardDescription className="text-[12px]">คืนเงินนักลงทุนแล้ว</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[22px] font-bold text-red-500">{fmtBahtFin(summary?.refund.total_refunded ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                รอคืน {fmtBahtFin(summary?.refund.total_pending ?? 0)} ({summary?.refund.count_pending ?? 0} ราย)
              </p>
            </CardContent>
          </Card>

          <Card className="py-5 gap-2">
            <CardHeader className="pb-0">
              <CardDescription className="text-[12px]">Platform Fees รวม</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[22px] font-bold text-foreground">{fmtBahtFin(summary?.platform.total_fees ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">ยอดรับสุทธิ {fmtBahtFin(summary?.platform.total_revenue ?? 0)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Phase Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">สถานะ Phase แต่ละโปรเจกต์</CardTitle>
          <CardDescription className="text-[12px]">ว่าแต่ละโปรเจกต์ถึง Phase ไหน และโอนเงินไปแล้วกี่ Phase</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {isLoadingProjects ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
          ) : projects.length === 0 ? (
            <p className="text-center text-[13px] text-muted-foreground py-8">ไม่มีข้อมูล</p>
          ) : (
            <div className="divide-y divide-border">
              {projects.map((proj) => {
                const stateInfo = STATE_LABEL[proj.state] ?? { label: proj.state, cls: 'bg-gray-100 text-gray-600' }
                const paidCount = proj.phases.filter(p => p.status === 'confirmed').length
                const isOpen = expanded === proj.project_id

                return (
                  <div key={proj.project_id}>
                    {/* Row header */}
                    <button
                      onClick={() => setExpanded(isOpen ? null : proj.project_id)}
                      className="w-full flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${stateInfo.cls}`}>{stateInfo.label}</span>
                        <span className="text-[13px] font-medium text-foreground truncate">{proj.project_title}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-3">
                        <div className="flex gap-0.5">
                          {proj.phases.map((ph) => (
                            <span
                              key={ph.phase_no}
                              title={`Phase ${ph.phase_no}: ${PHASE_STATUS[ph.status]?.label}`}
                              className={`w-3 h-3 rounded-full ${ph.status === 'confirmed' ? 'bg-green-500' : ph.status === 'pending' ? 'bg-amber-400' : 'bg-gray-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-[12px] text-muted-foreground">{paidCount}/{proj.phases.length} phases</span>
                        {isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded phases */}
                    {isOpen && (
                      <div className="bg-muted/30 px-6 py-3 flex flex-col gap-2">
                        <div className="grid grid-cols-4 text-[11px] text-muted-foreground font-medium pb-1 border-b border-border">
                          <span>Phase</span>
                          <span>จำนวนเงิน</span>
                          <span>สถานะ</span>
                          <span>โอนเมื่อ</span>
                        </div>
                        {proj.phases.map((ph) => {
                          const ps = PHASE_STATUS[ph.status]
                          return (
                            <div key={ph.phase_no} className="grid grid-cols-4 text-[12px] items-center">
                              <span className="text-foreground font-medium">Phase {ph.phase_no}</span>
                              <span className="text-foreground">{ph.amount > 0 ? fmtBahtFin(ph.amount) : '-'}</span>
                              <span className={`flex items-center gap-1 ${ps.cls}`}>{ps.icon} {ps.label}</span>
                              <span className="text-muted-foreground text-[11px]">
                                {ph.confirmed_at ? new Date(ph.confirmed_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                              </span>
                            </div>
                          )
                        })}
                        <div className="pt-2 border-t border-border flex justify-between text-[12px] text-muted-foreground">
                          <span>ทุนรวม {fmtBahtFin(proj.current_funding)} / เป้า {fmtBahtFin(proj.funding_goal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminDashboard
