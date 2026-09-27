import { useEffect, useMemo, useState } from 'react';
import { MessageSquareWarning, ChevronRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { useComplaintStore } from '../../store/useComplaintStore';

// ─── Constants ───────────────────────────────────────────────────────────────

const statusConfig = {
  open: {
    label: 'กำลังตรวจสอบ',
    badgeClass: 'bg-muted text-muted-foreground',
    iconClass: 'bg-amber-50 text-amber-500',
    Icon: MessageSquareWarning,
  },
  resolved: {
    label: 'จัดการแล้ว',
    badgeClass: 'bg-primary text-white',
    iconClass: 'bg-primary/10 text-primary',
    Icon: CheckCircle2,
  },
  rejected: {
    label: 'ปฏิเสธ',
    badgeClass: 'bg-red-100 text-red-600',
    iconClass: 'bg-red-50 text-red-400',
    Icon: XCircle,
  },
} as const;

type FilterKey = 'all' | 'open' | 'resolved' | 'rejected';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: 'ทั้งหมด' },
  { key: 'open',     label: 'กำลังตรวจสอบ' },
  { key: 'resolved', label: 'จัดการแล้ว' },
  { key: 'rejected', label: 'ปฏิเสธ' },
];

// ─── Component ──────────────────────────────────────────────────────────────

const Complaints = () => {
  const { complaints, isLoading, fetchMyComplaints } = useComplaintStore();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    fetchMyComplaints();
  }, [fetchMyComplaints]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  const filtered = useMemo(
    () => filter === 'all' ? complaints : complaints.filter((c) => c.status === filter),
    [complaints, filter]
  );

  useEffect(() => setVisibleCount(5), [filter]);

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">การร้องเรียน</h1>
        <p className="text-sm text-muted-foreground mt-1">แจ้งปัญหาเกี่ยวกับโปรเจกต์ที่คุณลงทุน</p>
      </div>

      {/* Filter Tabs */}
      {!isLoading && complaints.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5">
          {FILTER_TABS.map((tab) => {
            const count = tab.key === 'all' ? complaints.length : complaints.filter((c) => c.status === tab.key).length;
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1.5 ${isActive ? 'opacity-80' : 'opacity-60'}`}>({count})</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MessageSquareWarning size={28} className="text-muted-foreground opacity-50" />
          </div>
          <p className="font-semibold text-foreground mb-1">ยังไม่มีคำร้องเรียน</p>
          <p className="text-sm text-muted-foreground">หากพบปัญหาเกี่ยวกับโปรเจกต์ที่คุณลงทุน สามารถแจ้งได้จากหน้ารายละเอียดโปรเจกต์</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">ไม่มีคำร้องเรียนในหมวดนี้</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.slice(0, visibleCount).map((item) => {
            const cfg = statusConfig[item.status] ?? statusConfig.open;
            const { Icon } = cfg;
            return (
              <Link
                key={item.id}
                to={`/booster/complaints/${item.id}`}
                className="bg-white border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/50 transition-colors group/card block"
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg.iconClass}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm group-hover/card:text-primary transition-colors">
                      {item.subject}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.project?.title ?? '—'} · {fmtDate(item.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className={`text-[11px] font-semibold px-3 py-1 rounded-full ${cfg.badgeClass}`}>
                    {cfg.label}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover/card:text-primary transition-colors">
                    รายละเอียด <ChevronRight size={14} className="group-hover/card:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
          {visibleCount < filtered.length && (
            <div className="flex justify-center pt-3">
              <button onClick={() => setVisibleCount((count) => count + 5)} className="rounded-lg bg-[#171525] px-7 py-3 text-sm font-semibold text-white hover:opacity-90">
                โหลดเพิ่มเติม
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Complaints;
