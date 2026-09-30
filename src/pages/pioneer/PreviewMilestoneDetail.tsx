import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
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
import { useNavigate, useParams } from "react-router";
import { useProjectStore, type Milestone as MilestoneType } from "../../store/useProjectStore";

// ─── File type detection ────────────────────────────────────────────────────
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".avif"];
const VIDEO_EXT = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
const DOC_EXT_MAP: Record<string, string> = {
  ".pdf": "PDF", ".doc": "Word", ".docx": "Word", ".xls": "Excel", ".xlsx": "Excel",
  ".csv": "CSV", ".ppt": "PowerPoint", ".pptx": "PowerPoint", ".zip": "ZIP", ".rar": "RAR", ".txt": "Text",
};

type FileKind = "image" | "video" | "document" | "unknown";

// เดาประเภทไฟล์จาก URL: เช็คนามสกุลไฟล์ก่อน (เชื่อถือได้สุด) แล้วค่อย fallback ไปดู path ของ Cloudinary
// (เพราะไฟล์ที่ไม่ใช่รูป เช่น PDF บางครั้งถูก upload ผ่าน endpoint /image/upload/ ของ Cloudinary ทำให้เดาจาก path เพียงอย่างเดียวผิดได้)
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

// ─── Date helpers ───────────────────────────────────────────────────────────
const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const formatThDate = (d: Date) => `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`;

// ─── Media Renderer ─────────────────────────────────────────────────────────
// แสดงไฟล์แนบให้เหมาะกับประเภท: รูป -> <img>, วิดีโอ -> <video>, เอกสาร -> การ์ดดาวน์โหลด, อื่นๆ -> ลิงก์ดาวน์โหลดทั่วไป
function MediaRenderer({ url }: { url: string }) {
  const file = detectFileKind(url);

  if (file.kind === "image") {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        <img src={url} alt={file.filename} className="w-full max-h-[400px] object-contain bg-white" loading="lazy" />
        <div className="px-3 py-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
          <span className="flex items-center gap-1.5 truncate"><Image size={13} className="shrink-0 text-blue-500" />{file.filename}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 font-medium shrink-0 ml-2">เปิดภาพเต็ม</a>
        </div>
      </div>
    );
  }
  if (file.kind === "video") {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-black">
        <video src={url} controls className="w-full max-h-[400px]" preload="metadata" />
        <div className="px-3 py-2 flex items-center text-xs text-gray-500 border-t border-gray-100 bg-white">
          <span className="flex items-center gap-1.5 truncate"><Film size={13} className="shrink-0 text-purple-500" />{file.filename}</span>
        </div>
      </div>
    );
  }
  if (file.kind === "document") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" download={file.filename}
        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors group">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><File size={20} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{file.filename}</p>
          <p className="text-xs text-gray-400">ไฟล์ {file.docType || file.ext}</p>
        </div>
        <div className="shrink-0 text-gray-400 group-hover:text-primary transition-colors"><Download size={18} /></div>
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors group">
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Link2 size={20} /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{file.filename}</p>
        <p className="text-xs text-gray-400 truncate">{url}</p>
      </div>
      <div className="shrink-0 text-gray-400 group-hover:text-primary transition-colors"><Download size={18} /></div>
    </a>
  );
}

// ─── Milestone Card ─────────────────────────────────────────────────────────
function PioneerMilestoneCard({
  milestone,
  phaseIndex,
  index,
  totalPhases,
  fundingGoal,
  campaignDuration,
  estimatedDates,
  defaultOpen,
}: {
  milestone: MilestoneType;
  phaseIndex: number;
  index: number;
  totalPhases: number;
  fundingGoal: number;
  campaignDuration: number;
  estimatedDates: { start: Date; end: Date } | null;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen); // เปิด/ปิดรายละเอียดของการ์ด phase นี้ (การ์ดแรกเปิดไว้เป็น default)
  const phasePercents = [0.15, 0.20, 0.30, 0.35]; // สัดส่วนงบประมาณคงที่ของแต่ละ phase (ต้องตรงกับ Step3Milestone.tsx)
  const amount = fundingGoal > 0 ? fundingGoal * phasePercents[phaseIndex] : 0;
  const criteria = (milestone.criteria ?? []).filter((c) => c.trim());
  const hasDates = estimatedDates && milestone.duration > 0 && campaignDuration > 0;

  // Collect all media URLs (non-blob) — ตัด blob: ออกเพราะเป็น preview ชั่วคราวที่ยัง upload ไม่เสร็จ ไม่ควรโชว์ในหน้า preview นี้
  const allMediaUrls: string[] = [
    ...(milestone.files ?? []).filter((f) => f.url && !f.url.startsWith("blob:")).map((f) => f.url),
    ...(milestone.videos ?? []).filter((v) => v.url && !v.url.startsWith("blob:")).map((v) => v.url),
  ];

  return (
    <div className="flex gap-4 sm:gap-6 relative z-10">
      {/* Phase circle */}
      <div className="flex flex-col items-center shrink-0 z-10">
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold text-lg sm:text-xl shadow-sm transition-all duration-300 ${index === 0
            ? "bg-primary text-white shadow-primary/30 ring-4 ring-primary/10"
            : "bg-white border-2 border-gray-200 text-gray-400"
          }`}>
          {phaseIndex + 1}
        </div>
        {index < totalPhases - 1 && (
          <div className="w-[2px] flex-1 min-h-[24px] mt-2 rounded-full bg-gray-200" />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 mb-6 rounded-2xl border border-gray-200 bg-white hover:shadow-sm transition-all duration-300 overflow-hidden">
        {/* Header */}
        <button onClick={() => setIsOpen(!isOpen)} className="w-full p-5 sm:p-6 text-left cursor-pointer focus:outline-none">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="min-w-0 break-words text-base sm:text-lg font-bold text-gray-900">Phase {phaseIndex + 1}: {milestone.title}</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-gray-50 text-gray-500 border-gray-200">
                  รอดำเนินการ
                </span>
              </div>
              {milestone.description && (
                <p className={`text-sm text-gray-500 mt-1 ${!isOpen ? "line-clamp-2" : ""}`}>{milestone.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
                {milestone.duration > 0 && (
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {milestone.duration} วัน</span>
                )}
                {hasDates && estimatedDates && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} /> กำหนดส่ง {formatThDate(estimatedDates.start)} — {formatThDate(estimatedDates.end)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0 text-right">
                <span className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight break-all">
                  {amount > 0 ? `฿${amount.toLocaleString("th-TH")}` : `${(phasePercents[phaseIndex] * 100).toFixed(0)}%`}
                </span>
                {amount > 0 && (
                  <p className="text-[11px] text-gray-400 font-medium">{(phasePercents[phaseIndex] * 100).toFixed(0)}% ของเป้าหมาย</p>
                )}
              </div>
              <div className="p-1 text-gray-400">{isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
            </div>
          </div>
        </button>

        {/* Expanded body */}
        {isOpen && (
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-gray-100">
            {/* Criteria */}
            {criteria.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Target size={15} className="text-primary" /> สิ่งที่ส่งมอบ
                </h4>
                <div className="flex flex-wrap gap-2">
                  {criteria.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-gray-50 text-gray-700 border-gray-200">{c}</span>
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
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{milestone.description}</p>
              </div>
            )}

            {/* Funding */}
            {amount > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <DollarSign size={15} className="text-primary" /> การปล่อยเงินทุน
                </h4>
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
                  <div className="flex-1">
                    <div className="flex justify-between text-gray-500 mb-1.5">
                      <span>สัดส่วนเงินทุน</span>
                      <span className="font-semibold text-gray-800">{(phasePercents[phaseIndex] * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${phasePercents[phaseIndex] * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-center sm:text-right sm:pl-4 sm:border-l sm:border-gray-200">
                    <span className="text-2xl font-black text-primary">฿{amount.toLocaleString("th-TH")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Media */}
            {allMediaUrls.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Link2 size={15} className="text-primary" /> ไฟล์แนบและสื่อ
                </h4>
                <div className="space-y-3">
                  {allMediaUrls.map((url, i) => <MediaRenderer key={i} url={url} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function PreviewMilestoneDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject, loadCurrentProject } = useProjectStore();

  // โหลดข้อมูลโปรเจกต์เข้า store เมื่อเข้าหน้านี้ แล้วเลื่อนกลับไปบนสุดของหน้า
  useEffect(() => {
    if (projectId) {
      loadCurrentProject(Number(projectId));
      window.scrollTo(0, 0);
    }
  }, [projectId, loadCurrentProject]);

  // เอาเฉพาะ milestone ที่กรอกชื่อไว้แล้ว (ยังไม่กรอกแปลว่ายังไม่ถูกใช้งาน) พร้อมจำ index (phase) เดิมไว้
  const activeMilestones = (currentProject.milestones ?? [])
    .map((m, i) => ({ m, phaseIndex: i }))
    .filter(({ m }) => m.title);

  const totalPhases = activeMilestones.length;
  const fundingGoal = currentProject.fundingGoal || 0;
  const campaignDuration = currentProject.campaignDuration || 0;

  // Compute phase dates — ประมาณวันเริ่ม/จบของแต่ละ phase ต่อเนื่องกันไป โดยเริ่มนับจากวันนี้ + ระยะเวลาระดมทุน
  const phaseDates = (() => {
    const result: { start: Date; end: Date }[] = [];
    let cursor = new Date();
    cursor.setDate(cursor.getDate() + campaignDuration);
    for (const { phaseIndex } of activeMilestones) {
      const duration = currentProject.milestones[phaseIndex]?.duration || 0;
      const start = new Date(cursor);
      const end = new Date(cursor);
      end.setDate(end.getDate() + duration);
      result.push({ start, end });
      cursor = new Date(end);
    }
    return result;
  })();

  return (
    <div className="min-h-screen bg-background mt-[100px]">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 pt-6 pb-16">
        {/* Back */}
        <button
          onClick={() => navigate(`/preview/${projectId}`)}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium mb-6 group transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          กลับไปหน้าดูตัวอย่าง
        </button>

        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <MilestoneIcon size={20} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">แผนงาน Milestone</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 break-words">
            {currentProject.title || "ไม่ได้ระบุชื่อโปรเจกต์"}
          </h1>
          {currentProject.description && (
            <p className="text-sm text-gray-500 max-w-2xl">{currentProject.description}</p>
          )}
        </div>

        {/* Progress Summary */}
        <div className="min-w-0 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-bold text-gray-800">ความคืบหน้าโดยรวม</h2>
                <span className="text-xs font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                  0/{totalPhases} Phase
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-1000 ease-out" style={{ width: "0%" }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">0% เสร็จสมบูรณ์ (ตัวอย่าง)</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 text-center min-w-0">
              <div>
                <p className="text-2xl font-black text-primary">{totalPhases}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Phase ทั้งหมด</p>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600">0</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">เสร็จแล้ว</p>
              </div>
              <div className="col-span-2 sm:col-span-1 min-w-0">
                <p className="text-xl sm:text-2xl font-black text-gray-800 break-all">
                  ฿{fundingGoal > 0 ? fundingGoal.toLocaleString("th-TH") : "—"}
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">เงินทุนรวม</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {totalPhases > 0 ? (
            activeMilestones.map(({ m, phaseIndex }, idx) => (
              <PioneerMilestoneCard
                key={phaseIndex}
                milestone={m}
                phaseIndex={phaseIndex}
                index={idx}
                totalPhases={totalPhases}
                fundingGoal={fundingGoal}
                campaignDuration={campaignDuration}
                estimatedDates={phaseDates[idx] ?? null}
                defaultOpen={idx === 0}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MilestoneIcon size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">ยังไม่มีข้อมูล Milestone สำหรับโปรเจกต์นี้</p>
            </div>
          )}
        </div>

        {/* Back bottom */}
        <div className="mt-8 flex justify-start">
          <button
            onClick={() => navigate(`/preview/${projectId}`)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/10 cursor-pointer"
          >
            <ArrowLeft size={16} />
            กลับไปหน้าดูตัวอย่าง
          </button>
        </div>
      </div>
    </div>
  );
}
