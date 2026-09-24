import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  CircleDot,
  Circle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
  DollarSign,
  Target,
  Milestone as MilestoneIcon,
  Download,
  Image,
  Film,
  File,
} from "lucide-react";
import { useNavigate, useParams, Link } from "react-router";
import { usePublicProjectStore } from "../../store/usePublicProjectStore";
import type { PublicMilestone } from "../../store/usePublicProjectStore";

// ─── Helpers ────────────────────────────────────────────────────────────────
const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const formatThDate = (d: Date) => `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`;

type StatusConfig = { label: string; color: string; bg: string; border: string; icon: React.ReactNode };

const getStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case "approved":
    case "paid":
      return { label: status === "paid" ? "จ่ายเงินแล้ว" : "อนุมัติแล้ว", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: <CheckCircle2 size={14} /> };
    case "active":
      return { label: "กำลังดำเนินการ", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: <CircleDot size={14} /> };
    case "submitted":
      return { label: "ส่งงานแล้ว", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: <AlertCircle size={14} /> };
    case "rejected":
    case "failed":
      return { label: status === "failed" ? "ไม่ผ่าน" : "ถูกปฏิเสธ", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: <XCircle size={14} /> };
    default:
      return { label: "รอดำเนินการ", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", icon: <Circle size={14} /> };
  }
};

const isCompleted = (status: string) => ["approved", "paid"].includes(status);
const isActive = (status: string) => status === "active";

// File type detection from URL
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".avif"];
const VIDEO_EXT = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
const DOC_EXT_MAP: Record<string, string> = {
  ".pdf": "PDF",
  ".doc": "Word",
  ".docx": "Word",
  ".xls": "Excel",
  ".xlsx": "Excel",
  ".csv": "CSV",
  ".ppt": "PowerPoint",
  ".pptx": "PowerPoint",
  ".zip": "ZIP",
  ".rar": "RAR",
  ".txt": "Text",
};

type FileKind = "image" | "video" | "document" | "unknown";

function detectFileKind(url: string): { kind: FileKind; ext: string; filename: string; docType?: string } {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/");
    const rawFilename = segments[segments.length - 1] || "file";
    const dotIndex = rawFilename.lastIndexOf(".");
    const ext = dotIndex >= 0 ? rawFilename.substring(dotIndex).toLowerCase() : "";
    const filename = decodeURIComponent(rawFilename);

    // นามสกุลไฟล์เชื่อถือได้กว่า Cloudinary URL path (PDF อาจถูก upload ผ่าน /image/upload/)
    if (IMAGE_EXT.includes(ext)) return { kind: "image", ext, filename };
    if (VIDEO_EXT.includes(ext)) return { kind: "video", ext, filename };
    const docType = DOC_EXT_MAP[ext];
    if (docType) return { kind: "document", ext, filename, docType };

    // Cloudinary fallback เมื่อไม่มี/ไม่รู้จักนามสกุล
    if (url.includes("cloudinary.com")) {
      if (url.includes("/video/upload/")) return { kind: "video", ext: ext || ".mp4", filename };
      if (url.includes("/image/upload/")) return { kind: "image", ext: ext || ".jpg", filename };
      if (url.includes("/raw/upload/")) {
        return { kind: "document", ext, filename, docType: ext.replace(".", "").toUpperCase() || "FILE" };
      }
    }

    return { kind: "unknown", ext, filename };
  } catch {
    return { kind: "unknown", ext: "", filename: "file" };
  }
}

// ─── Single Milestone Card ──────────────────────────────────────────────────
function MilestoneCard({
  milestone,
  index,
  totalPhases,
  fundingGoal,
  campaignDuration,
  fundingAt,
  defaultOpen,
}: {
  milestone: PublicMilestone;
  index: number;
  totalPhases: number;
  fundingGoal: number;
  campaignDuration: number;
  fundingAt: string | null;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const statusCfg = getStatusConfig(milestone.status);
  const completed = isCompleted(milestone.status);
  const active = isActive(milestone.status);
  const amount = fundingGoal > 0 ? (fundingGoal * milestone.percent_release) / 100 : 0;
  const criteria = (milestone.acceptance_criteria ?? "").split("\n").filter((c) => c.trim());

  // Compute estimated dates
  const estimatedDates = (() => {
    if (!fundingAt || campaignDuration <= 0) return null;
    const baseDate = new Date(fundingAt);
    baseDate.setDate(baseDate.getDate() + campaignDuration);
    // Add up durations of all preceding milestones — we only know this one's duration
    // so we approximate from sort_order
    // For simplicity, use due_date if provided from backend
    if (milestone.due_date) {
      return { end: new Date(milestone.due_date) };
    }
    return null;
  })();

  return (
    <div className="flex gap-4 sm:gap-6 relative z-10">
      {/* Phase circle */}
      <div className="flex flex-col items-center shrink-0 z-10">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold text-lg sm:text-xl 
          shadow-sm transition-all duration-300 ${
            completed
              ? "bg-emerald-500 text-white shadow-emerald-200"
              : active
              ? "bg-primary text-white shadow-primary/30 ring-4 ring-primary/10"
              : "bg-white border-2 border-gray-200 text-gray-400"
          }`}
        >
          {completed ? <CheckCircle2 size={24} /> : milestone.phase_no}
        </div>
        {/* Connector line */}
        {index < totalPhases - 1 && (
          <div className={`w-[2px] flex-1 min-h-[24px] mt-2 rounded-full transition-colors ${
            completed ? "bg-emerald-300" : "bg-gray-200"
          }`} />
        )}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-6 rounded-2xl border transition-all duration-300 overflow-hidden ${
        active ? "border-primary/30 shadow-md shadow-primary/5 bg-white" :
        completed ? "border-emerald-200 bg-white" :
        "border-gray-200 bg-white hover:shadow-sm"
      }`}>
        {/* Card Header — always visible */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-5 sm:p-6 text-left cursor-pointer focus:outline-none"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className={`text-base sm:text-lg font-bold ${completed ? "text-gray-900" : active ? "text-gray-900" : "text-gray-600"}`}>
                  Phase {milestone.phase_no}: {milestone.title}
                </h3>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                  {statusCfg.icon} {statusCfg.label}
                </span>
              </div>
              {milestone.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{milestone.description}</p>
              )}
              {/* Quick info row */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
                {milestone.duration && milestone.duration > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {milestone.duration} วัน
                  </span>
                )}
                {estimatedDates?.end && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} /> กำหนดส่ง {formatThDate(estimatedDates.end)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                  {amount > 0 ? `฿${amount.toLocaleString("th-TH")}` : `${milestone.percent_release}%`}
                </span>
                {amount > 0 && (
                  <p className="text-[11px] text-gray-400 font-medium">{milestone.percent_release}% ของเป้าหมาย</p>
                )}
              </div>
              <div className="p-1 text-gray-400">
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          </div>
        </button>

        {/* Card Body — expanded */}
        {isOpen && (
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">

            {/* Criteria / Deliverables */}
            {criteria.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Target size={15} className="text-primary" /> สิ่งที่ส่งมอบ
                </h4>
                <div className="flex flex-wrap gap-2">
                  {criteria.map((c, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        completed
                          ? "bg-green-50 text-green-800 border-green-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {completed && <CheckCircle2 size={12} className="text-green-600" />}
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Full description */}
            {milestone.description && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FileText size={15} className="text-primary" /> รายละเอียดเพิ่มเติม
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {milestone.description}
                </p>
              </div>
            )}

            {/* Funding breakdown */}
            {amount > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <DollarSign size={15} className="text-primary" /> การปล่อยเงินทุน
                </h4>
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
                  <div className="flex-1">
                    <div className="flex justify-between text-gray-500 mb-1.5">
                      <span>สัดส่วนเงินทุน</span>
                      <span className="font-semibold text-gray-800">{milestone.percent_release}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${completed ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ width: `${milestone.percent_release}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center sm:text-right sm:pl-4 sm:border-l sm:border-gray-200">
                    <span className="text-2xl font-black text-primary">
                      ฿{amount.toLocaleString("th-TH")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Attached files / URLs */}
            {milestone.urls && milestone.urls.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Link2 size={15} className="text-primary" /> ไฟล์แนบและสื่อ
                </h4>
                <div className="space-y-3">
                  {milestone.urls.map((url, i) => {
                    const file = detectFileKind(url);

                    if (file.kind === "image") {
                      return (
                        <div key={i} className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                          <img
                            src={url}
                            alt={file.filename}
                            className="w-full max-h-[400px] object-contain bg-white"
                            loading="lazy"
                          />
                          <div className="px-3 py-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
                            <span className="flex items-center gap-1.5 truncate">
                              <Image size={13} className="shrink-0 text-blue-500" />
                              {file.filename}
                            </span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 font-medium shrink-0 ml-2"
                            >
                              เปิดภาพเต็ม
                            </a>
                          </div>
                        </div>
                      );
                    }

                    if (file.kind === "video") {
                      return (
                        <div key={i} className="rounded-xl overflow-hidden border border-gray-200 bg-black">
                          <video
                            src={url}
                            controls
                            className="w-full max-h-[400px]"
                            preload="metadata"
                          />
                          <div className="px-3 py-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 bg-white">
                            <span className="flex items-center gap-1.5 truncate">
                              <Film size={13} className="shrink-0 text-purple-500" />
                              {file.filename}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (file.kind === "document") {
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={file.filename}
                          className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <File size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{file.filename}</p>
                            <p className="text-xs text-gray-400">ไฟล์ {file.docType || file.ext}</p>
                          </div>
                          <div className="shrink-0 text-gray-400 group-hover:text-primary transition-colors">
                            <Download size={18} />
                          </div>
                        </a>
                      );
                    }

                    // Unknown — render as link
                    return (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                          <Link2 size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{file.filename}</p>
                          <p className="text-xs text-gray-400 truncate">{url}</p>
                        </div>
                        <div className="shrink-0 text-gray-400 group-hover:text-primary transition-colors">
                          <Download size={18} />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submission info (if submitted) */}
            {milestone.submission_summary && (
              <div className="mt-5 p-4 border border-amber-200 bg-amber-50/50 rounded-xl">
                <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <AlertCircle size={15} /> สิ่งที่ Pioneer ส่งมอบ
                </h4>
                <p className="text-sm text-amber-700 leading-relaxed">{milestone.submission_summary}</p>
                {milestone.submitted_at && (
                  <p className="text-xs text-amber-500 mt-2">
                    ส่งเมื่อ {formatThDate(new Date(milestone.submitted_at))}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function MilestoneDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentPublicProject, isDetailLoading, fetchPublicProjectBySlug, fetchPublicProjectById } = usePublicProjectStore();

  useEffect(() => {
    if (slug) {
      if (/^\d+$/.test(slug)) fetchPublicProjectById(Number(slug));
      else fetchPublicProjectBySlug(slug);
      window.scrollTo(0, 0);
    }
  }, [slug, fetchPublicProjectBySlug, fetchPublicProjectById]);

  const project = currentPublicProject;
  const milestones = (project?.milestones ?? []).slice().sort((a, b) => a.phase_no - b.phase_no);
  const totalPhases = milestones.length;
  const completedCount = milestones.filter((m) => isCompleted(m.status)).length;
  const progressPct = totalPhases > 0 ? Math.round((completedCount / totalPhases) * 100) : 0;

  if (isDetailLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center mt-[100px]">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center mt-[100px] gap-4">
        <p className="text-gray-500">ไม่พบข้อมูลโปรเจกต์</p>
        <button onClick={() => navigate("/projects")} className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
          <ArrowLeft size={16} /> กลับไปหน้าโปรเจกต์
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mt-[100px]">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 pt-6 pb-16">

        {/* Back + Breadcrumb */}
        <Link
          to={`/projects/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium mb-6 group transition-colors"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          กลับไปหน้าโปรเจกต์
        </Link>

        {/* Project Title & Summary */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <MilestoneIcon size={20} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">แผนงาน Milestone</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
            {project.title}
          </h1>
          {project.description && (
            <p className="text-sm text-gray-500 max-w-2xl">{project.description}</p>
          )}
        </div>

        {/* Progress Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-bold text-gray-800">ความคืบหน้าโดยรวม</h2>
                <span className="text-xs font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                  {completedCount}/{totalPhases} Phase
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{progressPct}% เสร็จสมบูรณ์</p>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
              <div>
                <p className="text-2xl font-black text-primary">{totalPhases}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Phase ทั้งหมด</p>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600">{completedCount}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">เสร็จแล้ว</p>
              </div>
              <div>
                <p className="text-2xl font-black text-gray-800">
                  ฿{project.funding_goal > 0 ? project.funding_goal.toLocaleString("th-TH") : "—"}
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">เงินทุนรวม</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {milestones.length > 0 ? (
            milestones.map((m, idx) => (
              <MilestoneCard
                key={m.id || idx}
                milestone={m}
                index={idx}
                totalPhases={totalPhases}
                fundingGoal={project.funding_goal}
                campaignDuration={project.duration_days}
                fundingAt={project.funding_at}
                defaultOpen={false}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MilestoneIcon size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">ยังไม่มีข้อมูล Milestone สำหรับโปรเจกต์นี้</p>
            </div>
          )}
        </div>

        {/* CTA at bottom */}
        <div className="mt-8 flex justify-start">
          <Link
            to={`/projects/${slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/10"
          >
            <ArrowLeft size={16} />
            กลับไปหน้าโปรเจกต์
          </Link>
        </div>
      </div>
    </div>
  );
}
