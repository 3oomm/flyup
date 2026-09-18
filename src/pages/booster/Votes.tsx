import { useEffect, useState, useMemo } from 'react';
import { CheckSquare, Loader2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { useBoosterStore } from '../../store/useBoosterStore';
import { useMilestoneStore, type ProjectMilestoneRaw } from '../../store/useMilestoneStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VoteMilestone {
  id: number;
  project_id: number;
  projectTitle: string;
  phase_no: number;
  title: string;
  voting_open: boolean;
  voting_opened_at: string | null;
  voting_closed_at: string | null;
  status: string;
  percent_release: number;
}

interface VoteProject {
  id: number;
  title: string;
  milestones: VoteMilestone[];
}

type TabKey = 'all' | 'open' | 'closed';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',    label: 'ทั้งหมด' },
  { key: 'open',   label: 'เปิดโหวต' },
  { key: 'closed', label: 'ปิดแล้ว' },
];

const PAGE_SIZE = 5;

// ─── Sub-components ──────────────────────────────────────────────────────────

function VoteRow({ vote, isOpen }: { vote: VoteMilestone; isOpen: boolean }) {
  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const isPassed = vote.status === 'approved' || vote.status === 'paid';
  const isFailed = vote.status === 'rejected' || vote.status === 'failed';

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h3 className="font-bold text-foreground text-base leading-tight">{vote.projectTitle}</h3>
          {isOpen ? (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-primary/5 text-primary border-primary/20">
              เปิดโหวต
            </span>
          ) : (
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              isPassed ? 'bg-green-50 text-green-700 border-green-200' :
              isFailed ? 'bg-red-50 text-red-600 border-red-200' :
              'bg-muted text-muted-foreground border-border'
            }`}>
              {isPassed ? 'โหวตผ่าน' : isFailed ? 'โหวตไม่ผ่าน' : 'ปิดแล้ว'}
            </span>
          )}
        </div>
        <p className="text-sm text-foreground mb-2">Phase {vote.phase_no}: {vote.title}</p>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium">
          {isOpen && vote.voting_opened_at && (
            <span>เปิดโหวตเมื่อ {fmtDate(vote.voting_opened_at)}</span>
          )}
          {!isOpen && vote.voting_closed_at && (
            <span>ปิดเมื่อ {fmtDate(vote.voting_closed_at)}</span>
          )}
          {!isOpen && (
            <span className={`font-semibold ${
              isPassed ? 'text-green-600' :
              isFailed ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              ผลโหวต: {
                isPassed ? 'ผ่าน' :
                isFailed ? 'ไม่ผ่าน' : 'รอสรุปผล'
              }
            </span>
          )}
          <span className="text-muted-foreground">ปล่อยเงิน {vote.percent_release}%</span>
        </div>
      </div>

      {isOpen ? (
        <Link
          to={`/booster/votes/${vote.id}`}
          className="shrink-0 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:opacity-90 transition-opacity"
        >
          โหวตเลย
        </Link>
      ) : (
        <Link
          to={`/booster/votes/${vote.id}`}
          className="shrink-0 px-6 py-2 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          ดูรายละเอียด
        </Link>
      )}
    </div>
  );
}

function ProjectRow({ project }: { project: VoteProject }) {
  const openCount = project.milestones.filter(m => m.voting_open).length;
  const closedCount = project.milestones.filter(m => !m.voting_open && m.voting_closed_at).length;

  return (
    <Link
      to={`/booster/votes?project=${project.id}`}
      className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="min-w-0">
        <h3 className="font-bold text-foreground text-base leading-tight mb-2">{project.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
            {project.milestones.length} Phase
          </span>
          {openCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20">
              เปิดโหวต {openCount}
            </span>
          )}
          {closedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
              ปิดแล้ว {closedCount}
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 px-6 py-2 rounded-xl text-sm font-semibold border border-border text-muted-foreground">
        ดูแต่ละ Phase
      </span>
    </Link>
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

const Votes = () => {
  const { investments, fetchMyInvestments, isLoading: investLoading } = useBoosterStore();
  const { fetchProjectMilestones } = useMilestoneStore();
  const [milestones, setMilestones] = useState<VoteMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);
  const [searchParams] = useSearchParams();
  const selectedProjectId = Number(searchParams.get('project')) || null;

  useEffect(() => { fetchMyInvestments(); }, [fetchMyInvestments]);

  useEffect(() => {
    if (investLoading) return;
    if (investments.length === 0) { setMilestones([]); setLoading(false); return; }

    const projectIds = [...new Set(investments.map(inv => inv.project_id).filter(Boolean))];

    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          projectIds.map(async (pid) => {
            try {
              const data = await fetchProjectMilestones(pid);
              return data.map((m: ProjectMilestoneRaw) => ({
                ...m,
                voting_open: m.voting_open ?? false,
                voting_opened_at: m.voting_opened_at ?? null,
                voting_closed_at: m.voting_closed_at ?? null,
                project_id: pid,
                projectTitle: investments.find(inv => inv.project_id === pid)?.project?.title ?? `โปรเจกต์ #${pid}`,
              })) as VoteMilestone[];
            } catch { return [] as VoteMilestone[]; }
          })
        );
        setMilestones(results.flat());
      } finally { setLoading(false); }
    };

    fetchAll();
  }, [investments, investLoading, fetchProjectMilestones]);

  const projects = useMemo(() => {
    const grouped = new Map<number, VoteProject>();
    milestones.forEach(milestone => {
      const project = grouped.get(milestone.project_id);
      if (project) project.milestones.push(milestone);
      else grouped.set(milestone.project_id, {
        id: milestone.project_id,
        title: milestone.projectTitle,
        milestones: [milestone],
      });
    });
    return Array.from(grouped.values());
  }, [milestones]);

  const openProjects = useMemo(
    () => projects.filter(project => project.milestones.some(m => m.voting_open)),
    [projects]
  );
  const closedProjects = useMemo(
    () => projects.filter(project => project.milestones.some(m => !m.voting_open && m.voting_closed_at)),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    if (activeTab === 'open') return openProjects;
    if (activeTab === 'closed') return closedProjects;
    return projects;
  }, [activeTab, projects, openProjects, closedProjects]);

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const paginated = filteredProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTabChange = (key: TabKey) => { setActiveTab(key); setPage(1); };

  const isPageLoading = loading || investLoading;

  return (
    <div className="w-full">
      <div className="mb-6">
        {selectedProjectId && (
          <Link to="/booster/votes" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft size={16} /> กลับไปโปรเจกต์ทั้งหมด
          </Link>
        )}
        <h1 className="text-2xl font-bold text-foreground">การโหวต</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedProject ? selectedProject.title : 'โหวตอนุมัติหรือปฏิเสธ Milestone ของโปรเจกต์ที่คุณลงทุน'}
        </p>
      </div>

      {isPageLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {!selectedProjectId && <div className="flex items-center gap-2 flex-wrap mb-5">
            {TABS.map(t => {
              const count = t.key === 'all' ? projects.length : t.key === 'open' ? openProjects.length : closedProjects.length;
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
          </div>}

          {/* List */}
          {selectedProject ? (
            <div className="space-y-4">
              {selectedProject.milestones
                .slice()
                .sort((a, b) => a.phase_no - b.phase_no)
                .map(vote => (
                <VoteRow key={vote.id} vote={vote} isOpen={vote.voting_open === true} />
              ))}
            </div>
          ) : selectedProjectId ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-xl">
              <CheckSquare size={32} className="mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">ไม่พบโปรเจกต์นี้</p>
            </div>
          ) : paginated.length > 0 ? (
            <div className="space-y-4">
              {paginated.map(project => <ProjectRow key={project.id} project={project} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-xl">
              <CheckSquare size={32} className="mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {activeTab === 'open' ? 'ไม่มี Milestone ที่เปิดให้โหวตในขณะนี้' :
                 activeTab === 'closed' ? 'ยังไม่มีโหวตที่ปิดแล้ว' : 'ยังไม่มีการโหวต'}
              </p>
            </div>
          )}

          {!selectedProjectId && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  );
};

export default Votes;
