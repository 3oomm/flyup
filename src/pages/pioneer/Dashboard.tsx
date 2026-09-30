import { useEffect, useMemo } from "react"
import { Plus, Loader2, TrendingUp, TrendingDown, FolderOpen, Rocket, BadgeDollarSign, Target } from 'lucide-react'
import { useProjectStore } from "../../store/useProjectStore"
import useCreateProjectGuard from "../../hooks/useCreateProjectGuard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts"

// ---- helpers ----
const formatBaht = (v: number) =>
  v >= 1_000_000
    ? `฿${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `฿${(v / 1_000).toFixed(0)}K`
    : `฿${v.toLocaleString()}`

const STATE_COLORS: Record<string, string> = {
  funding:        "#7C4DDB",
  closed:         "#2BA88E",
  pending_review: "#F5A623",
  draft:          "#CFCFCF",
  cancelled:      "#DC2626",
}

const STATE_LABELS: Record<string, string> = {
  funding:        "กำลังระดมทุน",
  closed:         "เสร็จสิ้น",
  pending_review: "รอตรวจสอบ",
  draft:          "แบบร่าง",
  cancelled:      "ถูกยกเลิก",
}

// ---- custom tooltip ----
const FundingTooltip = ({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-[10px] shadow-lg px-[14px] py-[10px]">
      <p className="text-[12px] text-muted-foreground mb-[4px]">{label}</p>
      <p className="text-[14px] font-semibold text-foreground">{formatBaht(payload[0].value)}</p>
    </div>
  )
}

// ---- stat card ----
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  trend?: number
}

const StatCard = ({ icon, label, value, sub, trend }: StatCardProps) => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardDescription className="text-[13px] font-medium">{label}</CardDescription>
        <div className="w-[36px] h-[36px] rounded-[10px] bg-primary-light flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <CardTitle className="text-[28px] font-bold text-foreground">{value}</CardTitle>
      <div className="flex items-center gap-[6px] mt-[6px]">
        {trend !== undefined && (
          trend >= 0
            ? <TrendingUp size={14} className="text-success" />
            : <TrendingDown size={14} className="text-error" />
        )}
        <span className="text-[12px] text-muted-foreground">{sub}</span>
      </div>
    </CardContent>
  </Card>
)

// ---- main ----
const Dashboard = () => {
  const { projects, isLoading, fetchMyProjects } = useProjectStore()
  const { createWithGuard, isCreating } = useCreateProjectGuard()

  useEffect(() => { fetchMyProjects() }, [fetchMyProjects])

  const handleCreateProject = () => createWithGuard()

  // ---- derived stats ----
  const totalProjects   = projects.length
  const fundingCount    = projects.filter(p => p.state === 'funding').length
  const totalRaised     = projects.reduce((s, p) => s + (p.current_funding ?? 0), 0)
  const totalGoal       = projects.reduce((s, p) => s + (p.funding_goal ?? 0), 0)

  // bar chart: funding per project (top 6)
  const fundingBarData = useMemo(() =>
    [...projects]
      .filter(p => p.funding_goal > 0)
      .sort((a, b) => b.current_funding - a.current_funding)
      .slice(0, 6)
      .map(p => ({
        name: p.title.length > 12 ? p.title.slice(0, 12) + "…" : p.title,
        raised: p.current_funding,
        goal: p.funding_goal,
      })),
    [projects]
  )

  // area chart: cumulative funding (mock monthly distribution from existing data)
  const areaData = useMemo(() => {
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย."]
    if (totalRaised === 0) {
      return months.map(m => ({ month: m, raised: 0, goal: 0 }))
    }
    // distribute funding across 6 months with a growth curve
    const weights = [0.06, 0.10, 0.18, 0.20, 0.22, 0.24]
    return months.map((m, i) => ({
      month: m,
      raised: Math.round(totalRaised * weights[i]),
      goal:   Math.round(totalGoal   * weights[i]),
    }))
  }, [totalRaised, totalGoal])

  // donut-like: state breakdown for bar
  const stateData = useMemo(() => {
    const counts: Record<string, number> = {}
    projects.forEach(p => { counts[p.state] = (counts[p.state] ?? 0) + 1 })
    return Object.entries(counts).map(([state, count]) => ({ state, count, label: STATE_LABELS[state] ?? state }))
  }, [projects])

  return (
    <div className="flex flex-col gap-[24px]">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] text-foreground font-semibold">แดชบอร์ด Pioneer</h1>
          <p className="text-[13px] text-muted-foreground mt-[2px]">ภาพรวมโปรเจกต์และการระดมทุนของคุณ</p>
        </div>
        <button
          onClick={handleCreateProject}
          disabled={isCreating}
          className="bg-primary min-h-[42px] w-full lg:w-auto shrink-0 inline-flex justify-center items-center gap-[10px] px-[16px] py-2 rounded-[10px] text-white-foreground hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer text-[14px] font-medium whitespace-nowrap"
        >
          {isCreating ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Plus size={20} className="shrink-0" />
              <span>สร้างโปรเจกต์ใหม่</span>
            </>
          )}
        </button>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="flex justify-center py-[40px]">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[16px]">
            <StatCard
              icon={<FolderOpen size={18} />}
              label="โปรเจกต์ทั้งหมด"
              value={totalProjects}
              sub="โปรเจกต์ที่สร้างไว้ทั้งหมด"
            />
            <StatCard
              icon={<Rocket size={18} />}
              label="กำลังระดมทุน"
              value={fundingCount}
              sub={`จาก ${totalProjects} โปรเจกต์`}
              trend={fundingCount}
            />
            <StatCard
              icon={<BadgeDollarSign size={18} />}
              label="ระดมทุนได้แล้ว"
              value={formatBaht(totalRaised)}
              sub="ยอดรวมจากทุกโปรเจกต์"
              trend={totalRaised}
            />
            <StatCard
              icon={<Target size={18} />}
              label="เป้าหมายรวม"
              value={formatBaht(totalGoal)}
              sub={totalGoal > 0 ? `${Math.round((totalRaised / totalGoal) * 100)}% บรรลุเป้าหมาย` : "ยังไม่มีเป้าหมาย"}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px]">

            {/* Area chart - funding activity */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-[16px]">กิจกรรมการระดมทุน</CardTitle>
                <CardDescription>ยอดระดมทุนรายเดือน (โดยประมาณ)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={areaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRaised" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#7C4DDB" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#7C4DDB" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradGoal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2BA88E" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#2BA88E" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBEBF0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6E6E7A" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => formatBaht(v as number)} tick={{ fontSize: 11, fill: "#6E6E7A" }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<FundingTooltip />} />
                    <Area type="monotone" dataKey="goal"   stroke="#2BA88E" strokeWidth={2} fill="url(#gradGoal)"   name="เป้าหมาย" />
                    <Area type="monotone" dataKey="raised" stroke="#7C4DDB" strokeWidth={2} fill="url(#gradRaised)" name="ระดมทุนได้" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-[16px] mt-[12px]">
                  <div className="flex items-center gap-[6px] text-[12px] text-muted-foreground">
                    <span className="w-[10px] h-[10px] rounded-full bg-primary inline-block" /> ระดมทุนได้
                  </div>
                  <div className="flex items-center gap-[6px] text-[12px] text-muted-foreground">
                    <span className="w-[10px] h-[10px] rounded-full bg-success inline-block" /> เป้าหมาย
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bar chart - state breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[16px]">สถานะโปรเจกต์</CardTitle>
                <CardDescription>จำนวนโปรเจกต์แต่ละสถานะ</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stateData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBEBF0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6E6E7A" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6E6E7A" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => [v, "โปรเจกต์"]}
                      contentStyle={{ borderRadius: 10, border: "1px solid #DDDDE6", fontSize: 13 }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {stateData.map(entry => (
                        <Cell key={entry.state} fill={STATE_COLORS[entry.state] ?? "#CFCFCF"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* legend */}
                <div className="flex flex-col gap-[8px] mt-[16px]">
                  {stateData.map(entry => (
                    <div key={entry.state} className="flex items-center justify-between">
                      <div className="flex items-center gap-[8px]">
                        <span className="w-[8px] h-[8px] rounded-full flex-shrink-0" style={{ background: STATE_COLORS[entry.state] ?? "#CFCFCF" }} />
                        <span className="text-[12px] text-muted-foreground">{entry.label}</span>
                      </div>
                      <span className="text-[13px] font-semibold text-foreground">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top funded projects */}
          {fundingBarData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[16px]">ความคืบหน้าการระดมทุน</CardTitle>
                <CardDescription>โปรเจกต์ที่มียอดระดมทุนสูงสุด</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={fundingBarData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBEBF0" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => formatBaht(v as number)} tick={{ fontSize: 11, fill: "#6E6E7A" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#6E6E7A" }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip
                      formatter={(v, name) => [formatBaht(v as number), name === "raised" ? "ระดมทุนได้" : "เป้าหมาย"]}
                      contentStyle={{ borderRadius: 10, border: "1px solid #DDDDE6", fontSize: 13 }}
                    />
                    <Bar dataKey="goal"   fill="#E9D5FF" radius={[0, 6, 6, 0]} name="goal" />
                    <Bar dataKey="raised" fill="#7C4DDB" radius={[0, 6, 6, 0]} name="raised" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {totalProjects === 0 && (
            <div className="flex flex-col items-center justify-center py-[60px] bg-white border border-dashed border-border rounded-[16px] gap-[12px]">
              <div className="w-[56px] h-[56px] rounded-full bg-primary-light flex items-center justify-center">
                <Rocket size={24} className="text-primary" />
              </div>
              <p className="text-[15px] font-semibold text-foreground">เริ่มต้นโปรเจกต์แรกของคุณ</p>
              <p className="text-[13px] text-muted-foreground">กด "สร้างโปรเจกต์ใหม่" เพื่อเริ่มระดมทุน</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Dashboard
