import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Banknote, TrendingUp, Wallet, Eye, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useBoosterStore, type BoosterInvestment } from '../../store/useBoosterStore';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:        { label: 'รอชำระเงิน',      color: 'bg-yellow-100 text-yellow-700' },
  pending_payment:{ label: 'รอชำระเงิน',      color: 'bg-yellow-100 text-yellow-700' },
  expired:        { label: 'หมดเวลาชำระเงิน', color: 'bg-gray-100 text-gray-600' },
  refund_pending: { label: 'รอคืนเงิน',       color: 'bg-orange-100 text-orange-700' },
  refunded:       { label: 'คืนเงินแล้ว',     color: 'bg-orange-100 text-orange-700' },
  cancelled:      { label: 'ยกเลิก',          color: 'bg-red-100 text-red-700' },
  rejected:       { label: 'ชำระเงินไม่สำเร็จ', color: 'bg-red-100 text-red-700' },
};

// สถานะที่ดูจาก project.state เมื่อ investment = verified
const projectStateConfig: Record<string, { label: string; color: string }> = {
  funding:        { label: 'กำลังระดมทุน',    color: 'bg-purple-100 text-purple-700' },
  executing:      { label: 'กำลังดำเนินการ',  color: 'bg-blue-100 text-blue-700' },
  closed:         { label: 'โปรเจกต์เสร็จสิ้น', color: 'bg-green-100 text-green-700' },
  failed:         { label: 'ระดมทุนไม่สำเร็จ', color: 'bg-red-100 text-red-700' },
};

function getEffectiveStatus(inv: BoosterInvestment): { label: string; color: string } {
  if (inv.status === 'verified') {
    const projectState = inv.project?.state ?? 'funding';
    return projectStateConfig[projectState] ?? { label: 'กำลังระดมทุน', color: 'bg-purple-100 text-purple-700' };
  }
  return statusConfig[inv.status] ?? { label: inv.status, color: 'bg-gray-100 text-gray-600' };
}

function investmentDestination(inv: BoosterInvestment): string {
  if (inv.status === 'pending_payment' || inv.status === 'pending') {
    return `/projects/${inv.project?.slug || inv.project_id}/invest?investmentId=${inv.id}`;
  }
  return `/booster/investments/${inv.id}`;
}

function canRequestRefund(inv: BoosterInvestment): boolean {
  const projectState = inv.project?.state;
  return inv.status === 'verified' && projectState === 'funding';
}

function refundDestination(inv: BoosterInvestment): string {
  return `/booster/investments/${inv.id}?refund=1`;
}

const TABS: { key: string; label: string }[] = [
  { key: 'all',           label: 'ทั้งหมด' },
  { key: 'pending_payment', label: 'รอชำระเงิน' },
  { key: 'funding',       label: 'กำลังระดมทุน' },
  { key: 'executing',     label: 'กำลังดำเนินการ' },
  { key: 'closed',        label: 'เสร็จสิ้น' },
  { key: 'refund_pending',label: 'รอคืนเงิน' },
  { key: 'refunded',      label: 'คืนเงินแล้ว' },
  { key: 'cancelled',     label: 'ยกเลิก/หมดอายุ/ชำระไม่สำเร็จ' },
];

// ─── Grouping ─────────────────────────────────────────────────────────────────

interface GroupedInvestment {
  project_id: number;
  primary: BoosterInvestment;   // representative (most active)
  all: BoosterInvestment[];
  totalAmount: number;
}

// priority order: refund_pending > verified > pending > refunded > cancelled
const STATUS_PRIORITY: Record<string, number> = {
  refund_pending: 5, verified: 4, pending_payment: 3, pending: 3, refunded: 2, expired: 1, cancelled: 1, rejected: 1,
}

function groupInvestments(invs: BoosterInvestment[]): GroupedInvestment[] {
  const map = new Map<number, BoosterInvestment[]>()
  invs.forEach(inv => {
    if (!map.has(inv.project_id)) map.set(inv.project_id, [])
    map.get(inv.project_id)!.push(inv)
  })
  return [...map.entries()].map(([project_id, list]) => {
    const primary = [...list].sort((a, b) =>
      (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0)
    )[0]
    return {
      project_id,
      primary,
      all: list,
      totalAmount: list
        .filter(i => i.status === 'verified')
        .reduce((s, i) => s + (i.amount ?? 0), 0),
    }
  })
}

function matchesTabGroup(g: GroupedInvestment, tab: string): boolean {
  return matchesTab(g.primary, tab)
}

function matchesTab(inv: BoosterInvestment, tab: string): boolean {
  if (tab === 'all') return true;
  if (tab === 'pending_payment') return inv.status === 'pending_payment' || inv.status === 'pending';
  if (tab === 'refund_pending') return inv.status === 'refund_pending';
  if (tab === 'refunded') return inv.status === 'refunded';
  if (tab === 'cancelled') return inv.status === 'cancelled' || inv.status === 'rejected' || inv.status === 'expired';
  // tabs ที่ map จาก project.state
  if (inv.status === 'verified') return (inv.project?.state ?? 'funding') === tab;
  return false;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MultipleInvestmentsModal({ group, refundMode, onClose }: { group: GroupedInvestment; refundMode: boolean; onClose: () => void }) {
  const sorted = useMemo(() =>
    [...(refundMode ? group.all.filter(canRequestRefund) : group.all)]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [group, refundMode]
  );

  const dateStr = (d: string) => new Date(d).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground text-base">{group.primary.project?.title || '—'}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {refundMode ? `เลือกรายการที่ต้องการขอคืนเงิน (${sorted.length} รายการ)` : `การลงทุนทั้งหมด ${group.all.length} รายการ`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs w-10">#</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">เลขอ้างอิง</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">วันที่</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">สถานะ</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs">ยอดลงทุน</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((inv, i) => (
                <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 text-muted-foreground font-medium">{i + 1}</td>
                  <td className="px-4 py-4 font-semibold text-foreground">INV-{inv.id}</td>
                  <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">{dateStr(inv.created_at)}</td>
                  <td className="px-4 py-4"><StatusBadge inv={inv} /></td>
                  <td className="px-4 py-4 text-right font-bold text-primary">฿{(inv.amount ?? 0).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <Link
                      to={refundMode ? refundDestination(inv) : investmentDestination(inv)}
                      className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                    >
                      {refundMode
                        ? 'ขอเงินคืน →'
                        : inv.status === 'pending_payment' || inv.status === 'pending'
                          ? 'ชำระเงิน →'
                          : 'ดูรายละเอียด →'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-muted/30 flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{refundMode ? 'ยอดที่เลือกขอคืนได้' : 'ยอดลงทุนที่ชำระสำเร็จ'}</span>
          <span className="font-bold text-foreground">฿{group.totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ inv }: { inv: BoosterInvestment }) {
  const cfg = getEffectiveStatus(inv);
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function InvestmentRow({ group, onShowAll }: { group: GroupedInvestment; onShowAll: (g: GroupedInvestment, refundMode: boolean) => void }) {
  const inv = group.primary;
  const project = inv.project;
  const title = project?.title || '—';
  const coverImage =
    project?.cover_image ??
    project?.media?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url ??
    null;
  const progress =
    project && project.funding_goal > 0
      ? Math.min(Math.round((project.current_funding / project.funding_goal) * 100), 100)
      : 0;
  const sortedMilestones = [...(project?.milestones ?? [])].sort((a, b) => a.phase_no - b.phase_no);
  const totalMilestones = sortedMilestones.length;
  const milestoneCount = sortedMilestones.filter(m => m.status === 'paid' || m.status === 'approved').length;
  const currentMilestone = sortedMilestones.find(m => m.status === 'active' || m.status === 'submitted');
  const latestDate = [...group.all]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  const dateStr = new Date(latestDate.created_at).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const isMultiple = group.all.length > 1;
  const projectState = inv.project?.state
  const refundableInvestments = group.all.filter(canRequestRefund);
  const canRefund = refundableInvestments.length > 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-full sm:w-25 h-17.5 shrink-0 rounded-xl overflow-hidden bg-muted border border-border">
        {coverImage ? (
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">ไม่มีรูป</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
          <h3 className="font-bold text-foreground text-base leading-tight">{title}</h3>
          <StatusBadge inv={inv} />
          {isMultiple && (
            <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {group.all.length} รายการ
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          ลงทุนสำเร็จ ฿{group.totalAmount.toLocaleString()} · {dateStr}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-muted px-2.5 py-1 rounded-full">
            ส่วนแบ่งกำไร {inv.profit_share_pct || project?.profit_share_pct || 0}%
          </span>
          {currentMilestone ? (
            <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
              Phase {currentMilestone.phase_no}: {currentMilestone.title}
            </span>
          ) : totalMilestones > 0 ? (
            <span className="bg-muted px-2.5 py-1 rounded-full">
              Milestone {milestoneCount}/{totalMilestones} เสร็จแล้ว
            </span>
          ) : null}
        </div>
        {projectState === 'funding' && progress > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>ความคืบหน้าการระดมทุน</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={`/projects/${inv.project_id}`}
          className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Eye size={14} /> ดูโปรเจกต์
        </Link>
        {isMultiple ? (
          <button
            onClick={() => onShowAll(group, canRefund)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer ${
              canRefund
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-primary text-white-foreground'
            }`}
          >
            {canRefund ? 'ขอเงินคืน' : 'รายละเอียด'}
          </button>
        ) : (
          <Link
            to={canRefund ? refundDestination(refundableInvestments[0]) : investmentDestination(inv)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity ${
              canRefund
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-primary text-white-foreground'
            }`}
          >
            {inv.status === 'pending_payment' || inv.status === 'pending' ? 'ชำระเงิน' : canRefund ? 'ขอเงินคืน' : 'รายละเอียด'}
          </Link>
        )}
      </div>
    </div>
  );
}

function Pagination({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            p === page
              ? 'bg-primary text-white'
              : 'border border-border hover:bg-muted text-foreground'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const MyInvestments = () => {
  const { investments, isLoading, fetchMyInvestments, profitPayouts, fetchProfitPayouts } = useBoosterStore();
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [modalGroup, setModalGroup] = useState<GroupedInvestment | null>(null);
  const [refundMode, setRefundMode] = useState(false);

  useEffect(() => { fetchMyInvestments(); }, [fetchMyInvestments]);
  useEffect(() => { fetchProfitPayouts(); }, [fetchProfitPayouts]);

  const stats = useMemo(() => {
    const verified = investments.filter(i => i.status === 'verified');
    return {
      totalAmount: verified.reduce((s, i) => s + (i.amount || 0), 0),
      projectCount: new Set(verified.map(i => i.project_id)).size,
      totalProfit: profitPayouts
        .filter(p => p.status === 'confirmed')
        .reduce((s, p) => s + p.amount, 0),
    };
  }, [investments, profitPayouts]);

  const groups = useMemo(() => groupInvestments(investments), [investments])

  const filtered = useMemo(() =>
    groups.filter(g => matchesTabGroup(g, activeTab)),
    [groups, activeTab]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTabChange = (key: string) => { setActiveTab(key); setPage(1); };
  const handleShowAll = (group: GroupedInvestment, isRefundMode: boolean) => {
    setModalGroup(group);
    setRefundMode(isRefundMode);
  };

  const ALWAYS_SHOW = new Set(['all', 'funding', 'executing']);
  const visibleTabs = TABS.filter(t =>
    ALWAYS_SHOW.has(t.key) || groups.some(g => matchesTabGroup(g, t.key))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">การลงทุนของฉัน</h1>
        <p className="text-sm text-muted-foreground mt-1">ติดตามโปรเจกต์ที่คุณสนับสนุน</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">ลงทุนรวม</span>
            <Banknote size={16} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">฿{stats.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">โปรเจกต์ที่ลงทุน</span>
            <TrendingUp size={16} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.projectCount}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">กำไรที่ได้รับรวม</span>
            <Wallet size={16} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">฿{stats.totalProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {visibleTabs.map(t => {
          const count = t.key === 'all'
            ? groups.length
            : groups.filter(g => matchesTabGroup(g, t.key)).length;
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
                activeTab === t.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-foreground'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === t.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-4">
        {paginated.length > 0 ? (
          paginated.map(g => <InvestmentRow key={g.project_id} group={g} onShowAll={handleShowAll} />)
        ) : (
          <div className="text-center py-20 bg-card border border-border rounded-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Wallet size={28} className="text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">
              {activeTab === 'all' ? 'ยังไม่มีการลงทุน' : 'ไม่มีการลงทุนในสถานะนี้'}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {activeTab === 'all' ? 'เริ่มต้นสนับสนุนโปรเจกต์ที่คุณสนใจได้เลย' : 'ลองเลือกดูสถานะอื่น'}
            </p>
            {activeTab === 'all' && (
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                สำรวจโปรเจกต์เพื่อลงทุน →
              </Link>
            )}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {modalGroup && (
        <MultipleInvestmentsModal
          group={modalGroup}
          refundMode={refundMode}
          onClose={() => {
            setModalGroup(null);
            setRefundMode(false);
          }}
        />
      )}
    </div>
  );
};

export default MyInvestments;
