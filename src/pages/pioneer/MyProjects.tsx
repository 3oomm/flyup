import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Search, Plus, SlidersHorizontal, ChevronDown, Eye, Edit3, Trash2, Loader2, ChevronLeft, ChevronRight, XCircle, Ban } from "lucide-react";
import { useProjectStore } from "../../store/useProjectStore";
import useCreateProjectGuard from "../../hooks/useCreateProjectGuard";
import Swal from "sweetalert2";

type StateType = "funding" | "pending_review" | "draft" | "closed" | "cancelled" | "executing" | "pending_cancel" | "suspended" | "pending_edit_review";

const stateLabels: { type: StateType | "all"; label: string }[] = [
  { type: "funding", label: "กำลังระดมทุน" },
  { type: "executing", label: "กำลังดำเนินการ" },
  { type: "pending_edit_review", label: "รอตรวจสอบการแก้ไข" },
  { type: "pending_review", label: "รอการตรวจสอบ" },
  { type: "draft", label: "แบบร่าง" },
  { type: "pending_cancel", label: "รอยืนยันยกเลิก" },
  { type: "cancelled", label: "ถูกยกเลิก" },
  { type: "suspended", label: "ถูกระงับ" },
  { type: "closed", label: "เสร็จสิ้น" },
];

const stateTextMap: Record<StateType, string> = {
  funding: "กำลังระดมทุน",
  pending_review: "รอการตรวจสอบ",
  draft: "แบบร่าง",
  closed: "เสร็จสิ้น",
  cancelled: "ถูกยกเลิก",
  executing: "กำลังดำเนินการ",
  pending_cancel: "รอยืนยันการยกเลิก",
  suspended: "ถูกระงับ",
  pending_edit_review: "รอตรวจสอบการแก้ไข",
};

// ลำดับความสำคัญตอนแสดงลิสต์: โปรเจกต์ที่ "ดำเนินการอยู่" (ระดมทุน/ดำเนินการ) ขึ้นก่อนเสมอ
// ตามด้วยที่รอการตรวจสอบ/รอยืนยันยกเลิก, แบบร่าง, แล้วค่อยเป็นสถานะปิดจบ/ถูกระงับ/ถูกยกเลิกไว้ท้ายสุด
const statePriority: Record<StateType, number> = {
  funding: 0,
  executing: 0,
  pending_edit_review: 0,
  pending_review: 1,
  pending_cancel: 1,
  draft: 2,
  closed: 3,
  suspended: 3,
  cancelled: 4,
};

const stateBadgeClass: Record<StateType, string> = {
  funding: "bg-[#8B5CF6] text-white",
  closed: "bg-[#8B5CF6] text-white",
  pending_review: "bg-[#F1F3F5] text-[#495057]",
  draft: "bg-slate-100 text-slate-500",
  cancelled: "bg-[#EF4444] text-white",
  executing: "bg-[#3B82F6] text-white",
  pending_cancel: "bg-[#F59E0B] text-white",
  suspended: "bg-orange-100 text-orange-700",
  pending_edit_review: "bg-[#F59E0B] text-white",
};

const MyProjects = () => {
  const navigate = useNavigate();
  const { projects, isLoading, fetchMyProjects, deleteProject, updateProjectStatus } = useProjectStore();
  const { createWithGuard, isCreating } = useCreateProjectGuard();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<StateType | "all">("all");
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false); // เปิด/ปิด dropdown filter สถานะ (กดเปิด แทนที่จะเป็น hover)
  const filterRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 5;

  useEffect(() => {
    fetchMyProjects();
  }, [fetchMyProjects]);

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    if (!isFilterOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  const stateCounts = useMemo(() => {
    const counts: Record<StateType, number> = {
      funding: 0, pending_review: 0, draft: 0, closed: 0, cancelled: 0, executing: 0, pending_cancel: 0, suspended: 0, pending_edit_review: 0
    };
    projects.forEach(p => {
      if (p.state in counts) counts[p.state]++;
    });
    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        const matchesFilter = activeFilter === "all" || p.state === activeFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = q === "" ||
          p.title.toLowerCase().includes(q) ||
          (p.category?.name ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
      })
      // sort แบบ stable: โปรเจกต์ที่ดำเนินการอยู่ขึ้นก่อน ภายใน priority เดียวกันคงลำดับเดิมไว้
      .sort((a, b) => statePriority[a.state] - statePriority[b.state]);
  }, [projects, searchQuery, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = filteredProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleView = (id: number, state: StateType, slug?: string) => {
    // pending_edit_review ไม่ใช่ public state (backend GetPublicProjectByID ไม่รองรับ → 404)
    // เจ้าของโปรเจกต์เลยต้องดูผ่านหน้า preview ของตัวเองแทน จนกว่า Admin จะอนุมัติ/ปฏิเสธการแก้ไข
    const useDetail = state === 'funding' || state === 'executing' || state === 'closed';
    if (useDetail) navigate(`/projects/${slug || id}`);
    else navigate(`/preview/${id}`, { state: { from: '/pioneer/dashboard/projects' } });
  };
  const handleEdit = (id: number) => navigate(`/project/overview/${id}`);
  const handleCreate = () => createWithGuard();
  const handleCancel = async (id: number, title: string) => {
    const result = await Swal.fire({
      title: 'ยกเลิกคำขอ?',
      html: `คุณต้องการถอนคำขอสร้างโปรเจกต์ <b>${title}</b> ใช่หรือไม่?<br/><span style="font-size:13px;color:#6b7280">โปรเจกต์จะกลับไปเป็นแบบร่าง</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'ยกเลิกคำขอ',
      cancelButtonText: 'ปิด',
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      try {
        await updateProjectStatus(id);
        await fetchMyProjects();
      } catch {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถยกเลิกได้ กรุณาลองใหม่', confirmButtonColor: '#16A34A' });
      }
    }
  };

  const handleDelete = async (id: number, title: string) => {
    const result = await Swal.fire({
      title: 'ลบโปรเจกต์?',
      html: `คุณต้องการลบ <b>${title}</b> ใช่หรือไม่?<br/><span style="font-size:13px;color:#6b7280">การลบจะไม่สามารถกู้คืนได้</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      await deleteProject(id);
    }
  };

  return (
    <div>

      {/* Header */}
      <div className="flex justify-between items-center mb-[24px]">
        <h1 className="text-[24px] font-bold text-foreground">โปรเจกต์ของฉัน</h1>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-[16px] py-[10px] rounded-[8px] flex items-center gap-[8px] text-[14px] font-medium transition-colors cursor-pointer"
        >
          {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          สร้างโปรเจกต์ใหม่
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-[16px] mb-[24px]">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-[16px] flex items-center pointer-events-none text-muted-foreground">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="ค้นหาชื่อโปรเจกต์..."
            className="w-full pl-[44px] pr-[16px] py-[10px] bg-white border border-border rounded-[100px] text-[14px] outline-none focus:border-primary transition-colors h-[44px]"
          />
        </div>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(prev => !prev)}
            className="flex items-center justify-between gap-[16px] bg-white border border-border px-[16px] py-[10px] rounded-[100px] text-[14px] font-medium text-foreground hover:bg-gray-50 h-[44px] min-w-[160px] cursor-pointer"
          >
            <div className="flex items-center gap-[8px]">
              <SlidersHorizontal size={16} />
              <span>{activeFilter === "all" ? "ทั้งหมด" : stateLabels.find(s => s.type === activeFilter)?.label}</span>
            </div>
            <ChevronDown size={16} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          {isFilterOpen && (
            <div className="absolute top-[48px] right-0 bg-white border border-border rounded-[12px] shadow-lg z-50 min-w-[180px] py-[4px]">
              <button
                onClick={() => { setActiveFilter("all"); setPage(1); setIsFilterOpen(false); }}
                className={`w-full text-left px-[16px] py-[10px] text-[13px] hover:bg-[#F1F3F5] transition-colors cursor-pointer ${activeFilter === "all" ? "text-primary font-semibold" : "text-foreground"}`}
              >
                ทั้งหมด
              </button>
              {stateLabels.map(s => (
                <button
                  key={s.type}
                  onClick={() => { setActiveFilter(s.type as StateType); setPage(1); setIsFilterOpen(false); }}
                  className={`w-full text-left px-[16px] py-[10px] text-[13px] hover:bg-[#F1F3F5] transition-colors cursor-pointer ${activeFilter === s.type ? "text-primary font-semibold" : "text-foreground"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-[16px] mb-[32px]">
        {stateLabels.map((stat) => {
          const isActive = activeFilter === stat.type;
          return (
            <button
              key={stat.type}
              onClick={() => { setActiveFilter(isActive ? "all" : stat.type as StateType); setPage(1); }}
              className={`bg-white border rounded-[12px] p-[16px] flex flex-col items-center justify-center text-center shadow-sm cursor-pointer transition-all hover:shadow-md ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
            >
              <span className={`text-[24px] font-bold leading-none mb-[4px] ${isActive ? "text-primary" : "text-foreground"}`}>
                {stateCounts[stat.type as StateType]}
              </span>
              <span className={`text-[13px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {stat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Project List */}
      {isLoading ? (
        <div className="flex justify-center py-[60px]">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-[60px] bg-white rounded-[16px] border border-dashed border-border">
          <p className="text-muted-foreground text-[14px]">
            {searchQuery ? `ไม่พบโปรเจกต์ที่ตรงกับ "${searchQuery}"` : "ไม่มีโปรเจกต์ในหมวดหมู่นี้"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[16px]">
          {pagedProjects.map((project) => {
            const hasEdit = project.state === 'draft' || project.state === 'funding' || project.state === 'executing' || project.state === 'pending_edit_review';
            const hasMilestone = project.state === 'funding' || project.state === 'executing' || project.state === 'pending_edit_review';
            const hasDelete = project.state === 'draft';
            const hasCancel = project.state === 'pending_review';
            const hasCancelRequest = project.state === 'funding' || project.state === 'closed' || project.state === 'executing' || project.state === 'pending_edit_review';
            const progress = project.funding_goal > 0
              ? Math.min(Math.round((project.current_funding / project.funding_goal) * 100), 100)
              : 0;

            return (
              <div
                key={project.id}
                className="bg-white border border-border rounded-[16px] p-[20px] flex gap-[20px] shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleView(project.id, project.state, project.slug)}
              >
                {/* Thumbnail */}
                <div className="w-[64px] h-[64px] bg-[#E1E4E8] rounded-[12px] shrink-0 mt-[4px] overflow-hidden">
                  {project.thumbnail_url && (
                    <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col">
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-[16px]">

                    {/* Left Info */}
                    <div className="flex flex-col gap-[8px] flex-1">
                      <div className="flex items-center gap-[8px] flex-wrap">
                        <h3 className="text-[16px] font-bold text-foreground">{project.title}</h3>
                        <span className={`px-[10px] py-[2px] rounded-full text-[11px] font-medium ${stateBadgeClass[project.state]}`}>
                          {stateTextMap[project.state]}
                        </span>
                        {project.category?.name && (
                          <span className="px-[10px] py-[2px] rounded-full text-[11px] font-medium bg-white border border-border text-[#495057]">
                            {project.category.name}
                          </span>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-[13px] text-muted-foreground line-clamp-2 lg:line-clamp-1">
                          {project.description}
                        </p>
                      )}

                      {/* Funding Progress */}
                      {project.state === 'funding' && project.funding_goal > 0 && (
                        <div className="flex flex-col gap-[6px] mt-[4px] max-w-[400px]">
                          <div className="flex items-center gap-[16px] text-[12px] font-medium text-muted-foreground">
                            <span>฿{project?.current_funding.toLocaleString()} / ฿{project?.funding_goal.toLocaleString()}</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-[6px] w-full bg-[#E9D5FF] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Pending edit review info */}
                      {project.state === 'pending_edit_review' && (
                        <div className="flex items-center gap-[6px] mt-[4px]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          <span className="text-[12px] text-[#F59E0B] font-medium">การแก้ไขล่าสุดกำลังรอ Admin ตรวจสอบ</span>
                        </div>
                      )}

                      {/* Pending cancel info */}
                      {project.state === 'pending_cancel' && (
                        <div className="flex items-center gap-[6px] mt-[4px]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          <span className="text-[12px] text-[#F59E0B] font-medium">อยู่ระหว่างรอ Admin ยืนยันการยกเลิก</span>
                        </div>
                      )}

                      {/* Cancelled warning */}
                      {project.state === 'cancelled' && (
                        <div className="flex items-center gap-[6px] mt-[4px]">
                          <div className="text-[#F59E0B] shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                          </div>
                          <span className="text-[12px] text-[#EF4444] font-medium">โปรเจกต์ถูกยกเลิก กรุณาติดต่อทีมสนับสนุน</span>
                        </div>
                      )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-[8px] shrink-0 mt-[10px] lg:mt-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleView(project.id, project.state); }}
                        className="flex items-center justify-center gap-[6px] px-[16px] py-[8px] bg-[#F1F3F5] hover:bg-[#E9ECEF] transition-colors rounded-[8px] text-[13px] font-medium text-foreground cursor-pointer"
                      >
                        <Eye size={16} /> ดู
                      </button>

                      {hasEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(project.id); }}
                          className="flex items-center justify-center gap-[6px] px-[16px] py-[8px] bg-[#F1F3F5] hover:bg-[#E9ECEF] transition-colors rounded-[8px] text-[13px] font-medium text-foreground cursor-pointer"
                        >
                          <Edit3 size={16} /> แก้ไข
                        </button>
                      )}

                      {hasMilestone && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/pioneer/dashboard/projects/${project.id}/milestones`); }}
                          className="flex items-center justify-center gap-[6px] px-[16px] py-[8px] bg-[#8B5CF6] hover:bg-[#7C3AED] transition-colors rounded-[8px] text-[13px] font-medium text-white shadow-sm cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                          Milestone
                        </button>
                      )}

                      {hasCancelRequest && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/pioneer/dashboard/projects/${project.id}/cancel-request`); }}
                          className="flex items-center justify-center gap-[6px] px-[16px] py-[8px] bg-red-50 hover:bg-red-100 transition-colors rounded-[8px] text-[13px] font-medium text-red-500 cursor-pointer"
                        >
                          <Ban size={16} /> ขอยกเลิก
                        </button>
                      )}

                      {hasCancel && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(project.id, project.title); }}
                          className="flex items-center justify-center gap-[6px] px-[16px] py-[8px] bg-red-50 hover:bg-red-100 transition-colors rounded-[8px] text-[13px] font-medium text-[#EF4444] cursor-pointer"
                        >
                          <XCircle size={16} /> ยกเลิกคำขอ
                        </button>
                      )}

                      {hasDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(project.id, project.title); }}
                          className="flex flex-col items-center justify-center w-[36px] h-[36px] text-[#EF4444] hover:bg-red-50 rounded-[8px] transition-colors ml-[4px] cursor-pointer"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-[8px] mt-[24px]">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] border border-border bg-white text-foreground hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-[36px] h-[36px] flex items-center justify-center rounded-[8px] text-[14px] font-medium transition-colors ${n === page
                ? 'bg-primary text-white border border-primary'
                : 'bg-white border border-border text-foreground hover:bg-gray-50'
                }`}
            >
              {n}
            </button>
          ))}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] border border-border bg-white text-foreground hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default MyProjects;
