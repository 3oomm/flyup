import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, Wallet, FolderOpen, Loader2, ArrowRight, X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useBoosterStore } from '../../store/useBoosterStore'

const MONTHS_TH = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('th-TH', { month: 'short' }).format(new Date(2000, i, 1))
)

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function fmtBaht(v: number) {
  return `฿${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const BoosterDashboard = () => {
  const { investments, isLoading, fetchMyInvestments, profitPayouts, fetchProfitPayouts } = useBoosterStore()
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [invTab, setInvTab] = useState('recent')

  useEffect(() => { fetchMyInvestments() }, [fetchMyInvestments])

  useEffect(() => { fetchProfitPayouts() }, [fetchProfitPayouts])

  const active = useMemo(
    () => investments.filter(inv => inv.status === 'verified'),
    [investments]
  )

  // portfolio by project (for pie + legend)
  const portfolioData = useMemo(() => {
    const portMap: Record<string, number> = {}
    active.forEach(inv => {
      const title = inv.project?.title ?? `Project ${inv.project_id}`
      portMap[title] = (portMap[title] ?? 0) + (inv.amount ?? 0)
    })
    return Object.entries(portMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  }, [active])

  // filtered data based on selectedProject
  const filteredActive = useMemo(() =>
    selectedProject
      ? active.filter(inv => (inv.project?.title ?? `Project ${inv.project_id}`) === selectedProject)
      : active,
    [active, selectedProject]
  )

  const filteredProfit = useMemo(() =>
    selectedProject
      ? profitPayouts.filter(p => p.project_title === selectedProject)
      : profitPayouts,
    [profitPayouts, selectedProject]
  )

  // stats
  const totalInvested = filteredActive.reduce((s, inv) => s + (inv.amount ?? 0), 0)
  const projectCount  = new Set(filteredActive.map(inv => inv.project_id)).size
  const totalProfit   = filteredProfit.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0)

  // monthly investment area chart
  const now = new Date()
  const monthMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthMap[`${d.getFullYear()}-${d.getMonth()}`] = 0
  }
  filteredActive.forEach(inv => {
    if (!inv.created_at) return
    const d = new Date(inv.created_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (key in monthMap) monthMap[key] += inv.amount ?? 0
  })
  const monthlyData = Object.entries(monthMap).map(([key, amount]) => {
    const [, m] = key.split('-').map(Number)
    return { month: MONTHS_TH[m], amount }
  })

const toggleProject = (name: string) =>
    setSelectedProject(prev => prev === name ? null : name)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[26px] font-bold text-foreground">แดชบอร์ด</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">ภาพรวมการลงทุนของคุณ</p>
        </div>
        {selectedProject && (
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5">
            <span className="text-[12px] font-semibold text-primary">{selectedProject}</span>
            <button
              onClick={() => setSelectedProject(null)}
              className="text-primary/60 hover:text-primary transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/booster/investments">
          <Card className="py-5 gap-2 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardDescription className="text-[13px]">ยอดลงทุนรวม</CardDescription>
                <FolderOpen size={16} className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[26px] font-bold text-foreground">{fmtBaht(totalInvested)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">เฉพาะที่ยืนยันแล้ว</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/booster/investments">
          <Card className="py-5 gap-2 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardDescription className="text-[13px]">
                  {selectedProject ? 'การลงทุนในโปรเจกต์' : 'โปรเจกต์ที่ลงทุน'}
                </CardDescription>
                <TrendingUp size={16} className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[26px] font-bold text-foreground">
                {selectedProject ? filteredActive.length : projectCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedProject ? 'รายการลงทุน' : 'โปรเจกต์ที่ active'}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/booster/profits">
          <Card className="py-5 gap-2 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardDescription className="text-[13px]">กำไรที่ได้รับ</CardDescription>
                <Wallet size={16} className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[26px] font-bold text-foreground">{fmtBaht(totalProfit)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">ดูรายละเอียด →</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Area Chart */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-[15px]">ยอดลงทุนรายเดือน</CardTitle>
            <CardDescription className="text-[12px]">
              {selectedProject ? `${selectedProject} · ` : ''}6 เดือนที่ผ่านมา
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.every(d => d.amount === 0) ? (
              <div className="flex items-center justify-center h-[200px] text-[13px] text-muted-foreground">
                {selectedProject ? `ไม่มีข้อมูลการลงทุนใน ${selectedProject}` : 'ยังไม่มีข้อมูลการลงทุน'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="boosterGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" style={{ stopColor: 'var(--chart-1)' }} stopOpacity={0.3} />
                      <stop offset="95%" style={{ stopColor: 'var(--chart-1)' }} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--chart-grid')} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `฿${(v % 1000 === 0 ? (v/1000).toFixed(0) : (v/1000).toFixed(1))}k` : `฿${v}`} />
                  <Tooltip
                    formatter={(v) => [fmtBaht(Number(v ?? 0)), 'ลงทุน']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke={cssVar('--chart-1')} strokeWidth={2} fill="url(#boosterGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-[15px]">สัดส่วนพอร์ต</CardTitle>
            <CardDescription className="text-[12px]">คลิกโปรเจกต์เพื่อ filter</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolioData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-[13px] text-muted-foreground">
                ยังไม่มีการลงทุน
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={portfolioData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      dataKey="value"
                      paddingAngle={3}
                      onClick={(d) => d.name && toggleProject(d.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      {portfolioData.map((d, i) => (
                        <Cell
                          key={i}
                          style={{ fill: `var(--chart-${(i % 6) + 1})` }}
                          opacity={selectedProject && selectedProject !== d.name ? 0.3 : 1}
                          stroke={selectedProject === d.name ? cssVar('--color-foreground') : 'none'}
                          strokeWidth={selectedProject === d.name ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [fmtBaht(Number(v ?? 0))]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-1">
                  {portfolioData.map((d, i) => {
                    const isSelected = selectedProject === d.name
                    const isDimmed = selectedProject && !isSelected
                    return (
                      <button
                        key={i}
                        onClick={() => toggleProject(d.name)}
                        className={`flex items-center justify-between text-[11px] w-full rounded-lg px-2 py-1 transition-all cursor-pointer text-left ${
                          isSelected ? 'bg-primary/5 ring-1 ring-primary/20' :
                          isDimmed ? 'opacity-40' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: `var(--chart-${(i % 6) + 1})` }} />
                          <span className={`truncate max-w-[120px] ${isSelected ? 'font-semibold text-primary' : 'text-foreground'}`}>
                            {d.name}
                          </span>
                        </div>
                        <span className={isSelected ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                          {fmtBaht(d.value)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Investment History with Tabs */}
      {(() => {
        const INV_TABS = [
          { key: 'recent',    label: 'ล่าสุด' },
          { key: 'all',       label: 'ทั้งหมด' },
          { key: 'funding',   label: 'กำลังระดมทุน' },
          { key: 'executing', label: 'กำลังดำเนินการ' },
          { key: 'refunded',  label: 'คืนเงินแล้ว' },
          { key: 'cancelled', label: 'ยกเลิก' },
        ]
        const getInvStatus = (inv: typeof investments[0]) => {
          if (inv.status === 'verified') return inv.project?.state ?? 'funding'
          if (inv.status === 'refunded') return 'refunded'
          if (inv.status === 'cancelled' || inv.status === 'rejected') return 'cancelled'
          return inv.status
        }
        const tabInvs = (key: string) => {
          const base = selectedProject
            ? investments.filter(i => (i.project?.title ?? `Project ${i.project_id}`) === selectedProject)
            : investments
          if (key === 'recent') return [...base].sort((a,b) => new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime()).slice(0,8)
          if (key === 'all')    return [...base].sort((a,b) => new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime())
          return base.filter(i => getInvStatus(i) === key)
        }
        const visibleInvTabs = INV_TABS.filter(t => t.key === 'recent' || t.key === 'all' || tabInvs(t.key).length > 0)

        return (
          <Card>
            <CardHeader className="flex-row items-center justify-between flex-wrap gap-3 pb-3">
              <div>
                <CardTitle className="text-[15px]">ประวัติการลงทุน</CardTitle>
                <CardDescription className="text-[12px] mt-0.5">
                  {selectedProject ? selectedProject : 'การลงทุนทั้งหมดของคุณ'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex bg-muted rounded-[10px] p-1 gap-0.5">
                  {visibleInvTabs.map(t => {
                    const count = t.key === 'recent' ? undefined : tabInvs(t.key).length
                    return (
                      <button
                        key={t.key}
                        onClick={() => setInvTab(t.key)}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                          invTab === t.key ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {t.label}
                        {count !== undefined && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            invTab === t.key ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10'
                          }`}>{count}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <Link to="/booster/investments" className="text-[12px] text-primary hover:underline flex items-center gap-0.5 shrink-0">
                  ดูทั้งหมด <ArrowRight size={13} />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_100px] px-6 py-2 text-[11px] font-semibold text-muted-foreground border-b border-border bg-muted/30">
                <span>โปรเจกต์</span>
                <span className="text-right">ยอดลงทุน</span>
                <span className="text-right">วันที่</span>
                <span className="text-right">สถานะ</span>
              </div>
              {tabInvs(invTab).length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-8">ไม่มีรายการ</p>
              ) : (
                <div className="divide-y divide-border">
                  {tabInvs(invTab).map(inv => {
                    const statusKey = getInvStatus(inv)
                    const statusCfg: Record<string, {label:string;cls:string}> = {
                      funding:   {label:'กำลังระดมทุน',   cls:'bg-purple-100 text-purple-700'},
                      executing: {label:'กำลังดำเนินการ', cls:'bg-blue-100 text-blue-700'},
                      closed:    {label:'เสร็จสิ้น',       cls:'bg-green-100 text-green-700'},
                      refunded:  {label:'คืนเงินแล้ว',    cls:'bg-gray-100 text-gray-600'},
                      cancelled: {label:'ยกเลิก',          cls:'bg-red-100 text-red-700'},
                      rejected:  {label:'ชำระเงินไม่สำเร็จ', cls:'bg-red-100 text-red-700'},
                      refund_pending: {label:'รอคืนเงิน', cls:'bg-orange-100 text-orange-700'},
                      pending:   {label:'รอชำระ',          cls:'bg-yellow-100 text-yellow-700'},
                      pending_payment: {label:'รอชำระเงิน', cls:'bg-yellow-100 text-yellow-700'},
                      expired: {label:'หมดเวลาชำระเงิน', cls:'bg-gray-100 text-gray-600'},
                    }
                    const st = statusCfg[statusKey] ?? {label: statusKey, cls: 'bg-gray-100 text-gray-600'}
                    const coverImage = inv.project?.cover_image ?? null
                    return (
                      <Link
                        key={inv.id}
                        to={statusKey === 'pending_payment'
                          ? `/projects/${inv.project?.slug || inv.project_id}/invest?investmentId=${inv.id}`
                          : `/booster/investments/${inv.id}`}
                        className="grid grid-cols-[2fr_1fr_1fr_100px] px-6 py-3 hover:bg-muted/20 transition-colors items-center"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-muted border border-border">
                            {coverImage
                              ? <img src={coverImage} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><TrendingUp size={12} className="text-muted-foreground" /></div>
                            }
                          </div>
                          <span className="text-[13px] font-medium text-foreground truncate">
                            {inv.project?.title ?? `Project ${inv.project_id}`}
                          </span>
                        </div>
                        <span className="text-[13px] font-semibold text-primary text-right">
                          {fmtBaht(inv.amount ?? 0)}
                        </span>
                        <span className="text-[11px] text-muted-foreground text-right">
                          {inv.created_at ? new Date(inv.created_at).toLocaleDateString('th-TH', {day:'numeric',month:'short',year:'numeric'}) : '-'}
                        </span>
                        <div className="flex justify-end">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}

export default BoosterDashboard
