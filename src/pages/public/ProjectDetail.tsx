import { useState, useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useSEO } from "../../hooks/useSEO";
import Swal from "sweetalert2";
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Flag,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Lock,
  Send,
} from "lucide-react";
import { useNavigate, Link, useParams } from "react-router";
import { usePublicProjectStore } from "../../store/usePublicProjectStore";
import { useProjectDetailStore } from "../../store/useProjectDetailStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBoosterStore } from "../../store/useBoosterStore";
import { useComplaintStore } from "../../store/useComplaintStore";
import ComplaintModal from "../../components/ComplaintModal";
import PreviewStory from "../../components/preview/PreviewStory";
import { PreviewUpdate, PreviewComment, PreviewQuestion } from "../../components/preview/PreviewMisc";
import { useCurrentTime } from "../../hooks/useCurrentTime";

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = "story" | "milestone" | "updates" | "comments" | "questions";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800";

function ProjectDetail() {
  const now = useCurrentTime();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("story");
  const [selectedImage, setSelectedImage] = useState(0);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showInvestorsModal, setShowInvestorsModal] = useState(false);

  const { currentPublicProject, isDetailLoading, fetchPublicProjectBySlug, fetchPublicProjectById } = usePublicProjectStore();
  const { updates, threads, faqs, investorCount: actualInvestorCount, investors, fetchAll, createThread } = useProjectDetailStore();
  const { authUser } = useAuthStore();
  const { investments, fetchMyInvestments } = useBoosterStore();
  const { complaints, fetchMyComplaints } = useComplaintStore();
  const [commentBody, setCommentBody] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoggedIn = !!authUser;
  const project = currentPublicProject;
  const projectId = project?.id;
  const authUserId = (authUser?.id ?? authUser?.user_id) as number | undefined;
  const isOwner = !!authUserId && !!project?.owner_user_id && authUserId === project.owner_user_id;
  const hasInvested = isLoggedIn && investments.some(
    inv => inv.project_id === projectId && inv.status === 'verified'
  );
  const hasComplained = isLoggedIn && complaints.some(c => c.project_id === projectId);

  // Dynamic SEO per project page
  useSEO({
    title: project?.title,
    description: project?.description
      ? project.description.slice(0, 160)
      : undefined,
    image: project?.cover_image ?? project?.thumbnail_url,
    url: `/projects/${slug}`,
    type: 'article',
  });

  useEffect(() => {
    if (slug) {
      if (/^\d+$/.test(slug)) fetchPublicProjectById(Number(slug));
      else fetchPublicProjectBySlug(slug);
      window.scrollTo(0, 0);
    }
    if (isLoggedIn) {
      fetchMyInvestments();
      fetchMyComplaints();
    }
  }, [slug, fetchPublicProjectBySlug, fetchPublicProjectById, fetchMyInvestments, fetchMyComplaints, isLoggedIn]);

  useEffect(() => {
    if (projectId) fetchAll(projectId, isLoggedIn);
  }, [projectId, fetchAll, isLoggedIn]);

  const handlePostComment = async () => {
    if (!commentBody.trim() || !projectId) return;
    setIsPosting(true);
    try {
      await createThread(projectId, commentBody.trim(), isOwner);
      setCommentBody('');
      toast.success('โพสต์ความคิดเห็นสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsPosting(false);
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────────

  type MediaItem = { type: 'video' | 'image'; url: string; };

  const mediaList: MediaItem[] = project?.media
    ? project.media
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(m => {
          const typeStr = Array.isArray(m.type) ? m.type[0] : m.type;
          return { type: typeStr as 'video' | 'image', url: m.url };
        })
    : [];

  const displayMedia = mediaList.length > 0 ? mediaList : [{ type: 'image' as const, url: PLACEHOLDER_IMG }];
  const selectedMedia = displayMedia[selectedImage] || displayMedia[0];

  const milestones = project?.milestones ?? [];
  const hasMilestones = milestones.length > 0;

  const storyHtml = project?.stories
    ? project.stories.sort((a, b) => a.sort_order - b.sort_order).map(s => s.body).join('')
    : '';

  const fundedAmount = project?.current_funding ?? 0;
  const targetAmount = project?.funding_goal ?? 0;
  const fundedPercent = targetAmount > 0 ? Math.min(Math.round((fundedAmount / targetAmount) * 100), 100) : 0;

  const daysLeft = (() => {
    if (!project?.end_date) return project?.duration_days ?? 0;
    const diff = new Date(project.end_date).getTime() - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const categoryName = typeof project?.category === 'string'
    ? project.category
    : (project?.category as unknown as { name?: string } | null)?.name ?? null;

  const isAdmin = authUser?.role === 'admin';
  const isPioneer = authUser?.role === 'pioneer';
  const isIdVerified = authUser?.id_card_verification?.status === 'approved';
  const hasBank = (authUser?.bank_accounts?.length ?? 0) > 0;
  const cannotInvestReason = isAdmin
    ? 'ผู้ดูแลระบบไม่สามารถลงทุนได้'
    : isOwner
    ? 'เจ้าของโปรเจกต์ไม่สามารถลงทุนในโปรเจกต์ของตัวเองได้'
    : isPioneer
    ? 'บัญชี Pioneer ไม่สามารถลงทุนได้'
    : '';

  const handleInvest = async () => {
    if (!isLoggedIn) {
      toast.error("กรุณาเข้าสู่ระบบก่อนลงทุน", {
        id: "login-required",
        position: "top-center",
        duration: 3000,
        style: {
          borderRadius: "10px",
          background: "var(--color-card)",
          color: "var(--color-foreground)",
          fontSize: "14px",
          border: "1px solid var(--color-border)",
        },
        iconTheme: { primary: "var(--color-error)", secondary: "var(--color-white-foreground)" },
      });
      return;
    }
    if (isAdmin || isOwner || isPioneer) {
      toast.error(cannotInvestReason, { id: "cannot-invest", position: "top-right", duration: 3000 });
      return;
    }
    if (!isIdVerified || !hasBank) {
      const missing: string[] = [];
      if (!isIdVerified) missing.push('ยืนยันตัวตนด้วยบัตรประชาชน');
      if (!hasBank) missing.push('ผูกบัญชีธนาคาร');
      const missingHtml = missing.map(m => `<div style="font-size:14px;color:#374151;margin:4px 0">✗ ${m}</div>`).join('');
      const result = await Swal.fire({
        icon: 'warning',
        title: 'ยังไม่ครบเงื่อนไขการลงทุน',
        html: `<p style="margin-bottom:8px">กรุณาดำเนินการให้ครบก่อนลงทุน:</p>${missingHtml}<p style="font-size:12px;color:#6b7280;margin-top:10px">ไปที่ <b>โปรไฟล์ของฉัน → แท็บยืนยันตัวตน</b></p>`,
        confirmButtonText: 'ไปยืนยันตัวตน',
        confirmButtonColor: '#16A34A',
        showCancelButton: true,
        cancelButtonText: 'ยกเลิก',
        cancelButtonColor: '#6B7280',
        reverseButtons: true,
      });
      if (result.isConfirmed) navigate('/booster/profile?tab=verify');
      return;
    }
    navigate(`/projects/${slug}/invest`);
  };

  const tabs = [
    { id: "story" as Tab, label: "เรื่องราว", count: undefined },
    { id: "milestone" as Tab, label: "Milestone", count: milestones.length || undefined },
    { id: "updates" as Tab, label: "อัปเดต", count: updates.length || undefined },
    { id: "comments" as Tab, label: "ความคิดเห็น", count: threads.length || undefined },
    { id: "questions" as Tab, label: "คำถาม", count: faqs.length || undefined },
  ];

  if (isDetailLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center mt-[100px]">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center mt-25 gap-4 text-center px-4">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-bold text-foreground">ไม่พบโปรเจกต์นี้</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          โปรเจกต์นี้อาจถูกปิด ยกเลิก หรือไม่มีอยู่ในระบบแล้ว
        </p>
        <Link to="/projects" className="mt-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
          สำรวจโปรเจกต์อื่น
        </Link>
      </div>
    );
  }

  const investorCount = actualInvestorCount;

  return (
    <div className="min-h-screen bg-surface-soft overflow-x-hidden w-full mt-[100px] pb-[100px]">
      <Toaster
        toastOptions={{ duration: 3000 }}
        position="top-center"
        containerStyle={{ top: 80 }}
      />

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-[20px] pt-[40px]">
        {/* Header */}
        <div className="flex flex-col gap-[10px] mb-[30px]">
          <div className="flex flex-wrap items-center gap-2">
            {categoryName && (
              <Link to={`/projects?category=${categoryName}`} className="inline-flex w-fit items-center px-[12px] py-[4px] rounded-full border border-border bg-white text-[12px] font-medium text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                {categoryName}
              </Link>
            )}
            {project?.state === 'funding' && (
              <span className="inline-flex items-center px-[12px] py-[4px] rounded-full text-white-foreground text-[12px] font-medium bg-[image:var(--gradient-primary)]">
                Funding
              </span>
            )}
          </div>
          <h1 className="text-[36px] font-bold text-foreground leading-tight">
            {project?.title || "กำลังโหลด..."}
          </h1>
          <p className="text-[16px] text-muted-foreground w-full max-w-[800px]">
            {project?.description || "รายละเอียดโปรเจกต์จะแสดงที่นี่เมื่อข้อมูลมาถึง"}
          </p>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-[30px] items-start">
          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 min-w-0 w-full lg:w-auto flex flex-col gap-[20px]">
            {/* Main image */}
            <div className="w-full aspect-[16/10] bg-white rounded-[16px] border border-border overflow-hidden">
              {selectedMedia.type === 'video' ? (
                <video
                  src={selectedMedia.url}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={selectedMedia.url}
                  alt="project media"
                  className="w-full h-full object-cover transition-all duration-300 ease-in-out"
                />
              )}
            </div>

            {/* Thumbnails */}
            {displayMedia.length > 1 && (
              <div className="flex gap-[10px] overflow-x-auto pb-2 scrollbar-hide">
                {displayMedia.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-[80px] h-[60px] flex-shrink-0 border-2 rounded-[8px] overflow-hidden cursor-pointer transition-colors ${selectedImage === i ? 'border-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    {img.type === 'video' ? (
                      <video src={img.url} className="w-full h-full object-cover pointer-events-none" />
                    ) : (
                      <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* ── Tabs Navigation ── */}
            <div className="flex flex-nowrap bg-surface-hover rounded-[8px] p-[4px] overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[12px] transition-colors cursor-pointer whitespace-nowrap ${activeTab === tab.id
                      ? "bg-white text-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground font-medium"
                      }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="ml-1 opacity-60">({tab.count})</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="w-full mt-[10px]">

                {/* ── Story Content ── */}
                {activeTab === "story" && (
                  <PreviewStory story={storyHtml || undefined} risks={project?.risk || undefined} />
                )}

                {/* ── Milestone Content ── */}
                {activeTab === "milestone" && (() => {
                  const getMilestoneStatus = (status: string) => {
                    switch (status) {
                      case 'paid':       return { label: 'จ่ายเงินแล้ว',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                      case 'approved':   return { label: 'Admin อนุมัติแล้ว', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                      case 'active':     return { label: 'กำลังดำเนินการ',    cls: 'bg-primary/5 text-primary border-primary/20' };
                      case 'submitted':  return { label: 'ส่งงานแล้ว',        cls: 'bg-amber-50 text-amber-700 border-amber-200' };
                      case 'rejected':
                      case 'failed':     return { label: 'ถูกปฏิเสธ',         cls: 'bg-red-50 text-red-600 border-red-200' };
                      default:           return { label: 'รอดำเนินการ',        cls: 'bg-gray-50 text-gray-500 border-gray-200' };
                    }
                  };
                  const isDone    = (s: string) => s === 'paid' || s === 'approved';
                  const isCurrent = (s: string) => s === 'active' || s === 'submitted';

                  return hasMilestones ? (
                    <div className="flex flex-col mt-[20px] w-full">
                      {milestones.map((m, index) => {
                        const phaseNumber = m.phase_no || (index + 1);
                        const criteria = (m.acceptance_criteria ?? '').split('\n').filter((c: string) => c.trim());
                        const done = isDone(m.status);
                        const current = isCurrent(m.status);
                        const st = getMilestoneStatus(m.status);
                        const isLast = index === milestones.length - 1;
                        return (
                          <div key={m.id || index} className="flex gap-[16px] relative w-full">
                            {/* Left: circle + connector */}
                            <div className="hidden md:flex flex-col items-center shrink-0">
                              <div className={`w-[48px] h-[48px] rounded-2xl flex items-center justify-center font-bold text-[18px] shadow-sm transition-all z-10 ${
                                done    ? 'bg-emerald-500 text-white shadow-emerald-200' :
                                current ? 'bg-primary text-white shadow-primary/20 ring-4 ring-primary/10' :
                                          'bg-white border-2 border-border text-gray-400'
                              }`}>
                                {done ? <CheckCircle2 size={22} /> : phaseNumber}
                              </div>
                              {!isLast && (
                                <div className={`w-[2px] flex-1 min-h-[32px] mt-1 rounded-full ${done ? 'bg-emerald-300' : 'bg-border'}`} />
                              )}
                            </div>
                            {/* Card */}
                            <div className={`flex-1 mb-[20px] bg-white border rounded-[16px] p-[20px] shadow-sm flex flex-col gap-[16px] ${
                              current ? 'border-primary/30 shadow-primary/5' :
                              done    ? 'border-emerald-200' :
                                        'border-border'
                            }`}>
                              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-[12px]">
                                <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                                  <div className="flex items-center gap-[8px] flex-wrap">
                                    <h3 className="text-[15px] font-bold text-foreground">Phase {phaseNumber}: {m.title}</h3>
                                    <span className={`px-[10px] py-[3px] rounded-full text-[11px] font-semibold border ${st.cls}`}>
                                      {st.label}
                                    </span>
                                  </div>
                                  {m.description && <p className="text-[13px] text-muted-foreground">{m.description}</p>}
                                  {m.duration && m.duration > 0 && (
                                    <p className="inline-flex items-center gap-[5px] text-[12px] text-muted-foreground">
                                      <Calendar size={12} /> ระยะเวลา {m.duration} วัน
                                    </p>
                                  )}
                                  {criteria.length > 0 && (
                                    <div className="flex flex-col gap-[6px] mt-[4px]">
                                      <span className="text-[12px] font-semibold text-foreground">สิ่งที่ส่งมอบ:</span>
                                      <div className="flex flex-wrap gap-[6px]">
                                        {criteria.map((c: string, i: number) => (
                                          <span key={i} className="px-[10px] py-[3px] border border-border rounded-full text-[12px] text-foreground bg-white whitespace-nowrap">{c}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-[8px] shrink-0">
                                  <span className={`text-[18px] font-bold ${done ? 'text-emerald-600' : 'text-primary'}`}>
                                    {targetAmount > 0 ? `฿${((targetAmount * m.percent_release) / 100).toLocaleString()}` : `${m.percent_release}%`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <Link to={`/projects/${slug}/milestones`} className="text-[12px] text-primary hover:text-primary/70 transition-colors font-medium">
                                  ดูรายละเอียดเพิ่มเติม →
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-center mt-2">
                        <Link to={`/projects/${slug}/milestones`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/5 text-primary rounded-xl font-semibold text-sm hover:bg-primary/10 transition-colors border border-primary/20">
                          ดูแผนงาน Milestone ทั้งหมด →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-[12px] mt-[40px] p-[40px] border border-dashed border-border rounded-[16px] bg-white">
                      <span className="text-muted-foreground text-[14px]">ยังไม่ได้กำหนด Milestone</span>
                    </div>
                  );
                })()}

                {/* ── Updates ── */}
                {activeTab === "updates" && (
                  <PreviewUpdate
                    updates={updates}
                    creatorName={project?.owner_profile ? `${project.owner_profile.first_name} ${project.owner_profile.last_name}`.trim() : undefined}
                    creatorAvatar={project?.owner_profile?.picture || undefined}
                    projectId={projectId ?? 0}
                    hasInvested={hasInvested}
                    isOwner={isOwner}
                  />
                )}

                {/* ── Comments ── */}
                {activeTab === "comments" && (
                  !isLoggedIn ? (
                    <div className="flex flex-col items-center justify-center gap-[12px] mt-[40px] p-[40px] border border-dashed border-border rounded-[16px] bg-white">
                      <Lock size={20} className="text-muted-foreground" strokeWidth={1.5} />
                      <p className="text-[13px] font-medium text-foreground">กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น</p>
                      <button onClick={() => navigate('/login')} className="text-[13px] text-primary font-medium hover:underline cursor-pointer">
                        เข้าสู่ระบบ
                      </button>
                    </div>
                  ) : !hasInvested && !isOwner ? (
                    <div className="flex flex-col items-center justify-center gap-[12px] mt-[40px] p-[40px] border border-dashed border-border rounded-[16px] bg-white">
                      <Lock size={20} className="text-muted-foreground" strokeWidth={1.5} />
                      <p className="text-[13px] font-medium text-foreground">เฉพาะผู้ลงทุนเท่านั้นที่สามารถแสดงความคิดเห็นได้</p>
                      <p className="text-[12px] text-muted-foreground text-center max-w-[260px] leading-relaxed">ลงทุนในโปรเจกต์นี้เพื่อร่วมสอบถามและติดตามความคืบหน้า</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[16px] mt-[16px]">
                      {/* Comment form */}
                      <div className="bg-white border border-border rounded-[16px] p-[20px] shadow-sm flex flex-col gap-[12px]">
                        <textarea
                          ref={textareaRef}
                          value={commentBody}
                          onChange={e => setCommentBody(e.target.value)}
                          placeholder="แสดงความคิดเห็น..."
                          rows={3}
                          className="w-full resize-none text-[14px] text-foreground placeholder:text-muted-foreground bg-transparent outline-none leading-relaxed"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handlePostComment}
                            disabled={isPosting || !commentBody.trim()}
                            className="flex items-center gap-[6px] px-[20px] py-[8px] bg-primary text-white rounded-[8px] text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            โพสต์
                          </button>
                        </div>
                      </div>
                      {/* Comment list */}
                      <PreviewComment comments={threads} canInteract={hasInvested || isOwner} isOwner={isOwner} />
                    </div>
                  )
                )}

                {/* ── Questions ── */}
                {activeTab === "questions" && (
                  <PreviewQuestion questions={faqs} />
                )}
              </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-[20px]">

            {/* ── Fund Card ── */}
            <div className="bg-white border border-border rounded-[16px] p-[24px] flex flex-col shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-pink-500 to-purple-600" />

              <h2 className="text-[32px] font-bold text-primary tracking-tight mt-[4px]">
                ฿{fundedAmount.toLocaleString()}
              </h2>
              <p className="text-[13px] text-muted-foreground mt-[2px]">
                {targetAmount > 0 ? `เป้าหมาย ฿${targetAmount.toLocaleString()} · ${fundedPercent}%` : 'ยังไม่ตั้งเป้าหมาย'}
              </p>

              <div className="flex items-center justify-between border-y border-border py-[16px] mt-[24px]">
                <button
                  onClick={() => {
                    if (!isLoggedIn) navigate('/login');
                    else if (investorCount !== null && investorCount > 0) setShowInvestorsModal(true);
                  }}
                  className={`flex flex-col items-center flex-1 border-r border-border ${!isLoggedIn || (investorCount !== null && investorCount > 0) ? 'cursor-pointer hover:text-primary transition-colors' : 'cursor-default'}`}
                >
                  <div className="flex items-center gap-[6px] text-foreground font-semibold text-[16px]">
                    <Users size={16} /> {investorCount ?? '—'}
                  </div>
                  <span className={`text-[12px] ${!isLoggedIn || (investorCount !== null && investorCount > 0) ? 'text-primary underline underline-offset-2' : 'text-muted-foreground'}`}>
                    {isLoggedIn ? 'ผู้สนับสนุน' : 'เข้าสู่ระบบเพื่อดู'}
                  </span>
                </button>
                <div className="flex flex-col items-center flex-1 border-r border-border">
                  <div className="flex items-center gap-[6px] text-foreground font-semibold text-[16px]">
                    <Clock size={16} /> {daysLeft}
                  </div>
                  <span className="text-[12px] text-muted-foreground">วันที่เหลือ</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className="flex items-center gap-[6px] text-foreground font-semibold text-[16px]">
                    <TrendingUp size={16} /> {project?.profit_share_pct || 0}%
                  </div>
                  <span className="text-[12px] text-muted-foreground">ส่วนแบ่งกำไร</span>
                </div>
              </div>

              <div className="flex flex-col gap-[12px] mt-[20px] mb-[24px]">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-muted-foreground">ลงทุนขั้นต่ำ</span>
                  <span className="font-semibold text-foreground">
                    {project?.min_invest_amount ? `${project.min_invest_amount.toLocaleString()}฿` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-muted-foreground">ลงทุนได้สูงสุด</span>
                  <span className="font-semibold text-foreground">{(() => {
                    const remaining = Math.max(0, targetAmount - fundedAmount);
                    const MAX_PER_TRANSACTION = 500_000;
                    const projectMax = project?.max_invest_amount && project.max_invest_amount > 0
                      ? Math.min(project.max_invest_amount, remaining)
                      : remaining;
                    const effectiveMax = Math.min(projectMax, MAX_PER_TRANSACTION);
                    return effectiveMax > 0 ? `${effectiveMax.toLocaleString()}฿` : '—';
                  })()}</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-muted-foreground">ค่าธรรมเนียม</span>
                  <span className="font-semibold text-foreground">{project?.platform_fee || 5}%</span>
                </div>
              </div>

              {(() => {
                const stateLabel: Record<string, { text: string; color: string }> = {
                  funding:        { text: 'กำลังระดมทุน',       color: 'text-primary' },
                  executing:      { text: 'กำลังดำเนินการ',      color: 'text-purple-600' },
                  closed:         { text: 'ปิดโครงการแล้ว',       color: 'text-green-600' },
                  cancelled:      { text: 'ยกเลิกแล้ว',           color: 'text-red-500' },
                  pending_cancel: { text: 'รอยืนยันการยกเลิก',   color: 'text-orange-500' },
                  suspended:      { text: 'ถูกระงับ',              color: 'text-gray-500' },
                  pending_edit_review: { text: 'กำลังปรับปรุงข้อมูล', color: 'text-amber-500' },
                };
                const s = stateLabel[project?.state ?? ''] ?? { text: project?.state ?? '', color: 'text-muted-foreground' };
                return (
                  <div className={`w-full flex justify-center font-bold text-[14px] mb-[12px] ${s.color}`}>
                    {s.text}
                  </div>
                );
              })()}

              <div className="flex gap-[12px]">
                <button
                  onClick={handleInvest}
                  disabled={isAdmin || isOwner || isPioneer || project?.state !== 'funding'}
                  title={cannotInvestReason || undefined}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white-foreground h-[44px] rounded-[10px] flex justify-center items-center gap-[8px] font-medium transition-colors cursor-pointer duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrendingUp size={18} />
                  <span>
                    {isAdmin ? 'ผู้ดูแลระบบลงทุนไม่ได้'
                      : isOwner ? 'โปรเจกต์ของคุณ'
                      : isPioneer ? 'บัญชี Pioneer ลงทุนไม่ได้'
                      : project?.state === 'pending_edit_review' ? 'กำลังปรับปรุงข้อมูล ลงทุนชั่วคราวไม่ได้'
                      : project?.state !== 'funding' ? 'ปิดรับการลงทุนแล้ว'
                      : 'ลงทุนโปรเจกต์นี้'}
                  </span>
                </button>
                <button
                  disabled={isAdmin || isOwner}
                  onClick={() => {
                    if (!isLoggedIn) {
                      navigate('/login')
                      return;
                    }
                    if (hasComplained) {
                      toast.error('คุณรายงานโปรเจกต์นี้ไปแล้ว', {
                        id: 'report-already',
                        position: 'top-center',
                        duration: 3000,
                        style: {
                          borderRadius: '10px',
                          background: 'var(--color-card)',
                          color: 'var(--color-foreground)',
                          fontSize: '14px',
                          border: '1px solid var(--color-border)',
                        },
                        iconTheme: { primary: 'var(--color-error)', secondary: 'var(--color-white-foreground)' },
                      });
                      return;
                    }
                    setShowComplaintModal(true);
                  }}
                  title={hasComplained ? 'คุณรายงานโปรเจกต์นี้ไปแล้ว' : 'ร้องเรียนโปรเจกต์นี้'}
                  className={`w-[44px] h-[44px] border border-border rounded-[10px] flex justify-center items-center transition-colors cursor-pointer duration-200 ${
                    hasComplained
                      ? 'bg-secondary/50 text-muted-foreground opacity-50 hover:bg-secondary/50'
                      : 'bg-secondary text-foreground hover:bg-muted'
                  }`}
                >
                  <Flag size={18} className={hasComplained ? 'fill-current' : undefined} />
                </button>
              </div>
            </div>

            {/* ── Creator Card ── */}
            <div className="bg-white border border-border rounded-[16px] p-[20px] shadow-sm flex flex-col gap-[14px]">
              <h3 className="text-[13px] text-foreground font-semibold">ผู้สร้างโปรเจกต์</h3>
              <div className="flex items-center gap-[14px]">
                <div className="w-[48px] h-[48px] rounded-full bg-gray-200 overflow-hidden border border-border flex-shrink-0 flex items-center justify-center">
                  {project?.owner_profile?.picture ? (
                    <img src={project.owner_profile.picture} alt="Creator" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-foreground font-bold text-[18px]">
                      {(project?.owner_profile?.first_name || '?').charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-[2px]">
                  <span className="text-[14px] font-bold text-foreground leading-tight">
                    {project?.owner_profile ? `${project.owner_profile.first_name} ${project.owner_profile.last_name}` : '—'}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{(typeof project?.owner_profile?.university === 'string' ? project.owner_profile.university : (project?.owner_profile?.university as unknown as { name_th?: string } | null)?.name_th) || '—'}</span>
                </div>
              </div>
              {project?.owner_profile?.bio && (
                <p className="max-w-full text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{project.owner_profile.bio}</p>
              )}
              <div className="flex gap-[20px]">
                <span className="inline-flex items-center gap-[5px] border border-primary text-primary px-[10px] py-[4px] rounded-full text-[11px] font-medium">
                  <CheckCircle2 size={13} />
                  {project?.owner_profile?.verify_status === 'verified' ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
                </span>
                {(project?.owner_profile?.project_count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-[5px] border border-green-500 text-green-600 px-[10px] py-[4px] rounded-full text-[11px] font-medium">
                    <CheckCircle2 size={13} />
                    {project?.owner_profile?.project_count} โปรเจกต์
                  </span>
                )}
              </div>
            </div>

            {/* ── Milestone Safety Card ── */}
            <div className="bg-[#FAF8FF] border border-[#E9D5FF] rounded-[16px] p-[20px] flex flex-col items-center justify-center text-center gap-[8px]">
              <ShieldCheck size={24} className="text-foreground" />
              <h4 className="text-[13px] font-bold text-foreground">ปลอดภัยด้วยระบบ Milestone</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">
                เงินลงทุนจะถูกปล่อยเป็นงวดตาม Milestone ที่ผ่านการโหวตจากผู้สนับสนุน
              </p>
            </div>
          </div>
        </div>
      </div>

      {showComplaintModal && project && (
        <ComplaintModal
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => setShowComplaintModal(false)}
          onSuccess={() => fetchMyComplaints()}
        />
      )}

      {showInvestorsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-[16px]"
          onClick={() => setShowInvestorsModal(false)}
        >
          <div
            className="bg-white rounded-[20px] w-full max-w-[480px] max-h-[80vh] flex flex-col shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-[24px] pt-[24px] pb-[16px] border-b border-border">
              <div>
                <h2 className="text-[18px] font-bold text-foreground">ผู้สนับสนุน</h2>
                <p className="text-[13px] text-muted-foreground mt-[2px]">{investorCount ?? '—'} คน · ฿{fundedAmount.toLocaleString()} รวมทั้งสิ้น</p>
              </div>
              <button
                onClick={() => setShowInvestorsModal(false)}
                className="w-[32px] h-[32px] rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 px-[24px] py-[16px] flex flex-col gap-[12px]">
              {investors.length === 0 ? (
                <p className="text-center text-muted-foreground text-[14px] py-[32px]">ยังไม่มีข้อมูลผู้สนับสนุน</p>
              ) : (
                [...investors].sort((a, b) => b.principal_amount - a.principal_amount).map((inv, idx) => {
                  const name = `${inv.first_name} ${inv.last_name}`.trim();
                  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
                  const pct = fundedAmount > 0 ? ((inv.principal_amount / fundedAmount) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={inv.user_id} className="flex items-center gap-[12px]">
                      {/* Rank */}
                      <span className="text-[12px] text-muted-foreground w-[18px] text-center flex-shrink-0">{idx + 1}</span>
                      {/* Avatar */}
                      <div className="w-[40px] h-[40px] rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[14px] flex-shrink-0 overflow-hidden">
                        {inv.picture
                          ? <img src={inv.picture} alt={name} className="w-full h-full object-cover" />
                          : initials
                        }
                      </div>
                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-foreground truncate">{name || 'ไม่ระบุชื่อ'}</p>
                      </div>
                      {/* Amount + % */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-[14px] font-bold text-foreground">฿{inv.principal_amount.toLocaleString()}</p>
                        <p className="text-[12px] text-primary font-medium">{pct}%</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetail;
