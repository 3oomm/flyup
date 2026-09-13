import { useEffect } from 'react';
import { ArrowLeft, ExternalLink, Loader2, MessageSquareWarning } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useComplaintStore } from '../../store/useComplaintStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const statusConfig = {
  open: { label: 'กำลังตรวจสอบ', badgeClass: 'bg-muted text-muted-foreground border border-border' },
  resolved: { label: 'จัดการแล้ว', badgeClass: 'bg-primary/10 text-primary border border-primary/20' },
  rejected: { label: 'ปฏิเสธ', badgeClass: 'bg-red-50 text-red-600 border border-red-200' },
} as const;

// ─── Component ──────────────────────────────────────────────────────────────

const ComplaintDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { complaints, isLoading, fetchMyComplaints } = useComplaintStore();

  useEffect(() => {
    if (complaints.length === 0) fetchMyComplaints();
  }, [complaints.length, fetchMyComplaints]);

  const complaint = complaints.find((c) => c.id === Number(id));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoading && !complaint) {
    return (
      <div className="w-full">
        <button
          onClick={() => navigate('/booster/complaints')}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <div className="text-center py-20 text-muted-foreground">
          <MessageSquareWarning size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">ไม่พบคำร้องเรียนนี้</p>
        </div>
      </div>
    );
  }

  const cfg = statusConfig[complaint!.status] ?? statusConfig.open;
  const hasAdminNote = complaint!.admin_note && complaint!.admin_note.trim().length > 0;
  const isFinished = complaint!.status === 'resolved' || complaint!.status === 'rejected';

  return (
    <div className="w-full relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/booster/complaints')}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft size={16} /> กลับ
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{complaint!.subject}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {fmtDate(complaint!.created_at)}
            {complaint!.project?.title && <> · {complaint!.project.title}</>}
          </p>
        </div>
        <div className={`inline-flex items-center text-[12px] font-semibold px-3 py-1 rounded-full shrink-0 ${cfg.badgeClass}`}>
          {cfg.label}
        </div>
      </div>

      <div className="space-y-6">
        {/* Details Box */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold text-foreground text-sm mb-4">รายละเอียดการร้องเรียน</h3>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {complaint!.body}
          </p>
          {complaint!.evidence && (
            <a
              href={complaint!.evidence}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-4"
            >
              <ExternalLink size={14} /> ดูหลักฐานที่แนบ
            </a>
          )}
        </div>

        {/* Admin Response Box */}
        {hasAdminNote && (
          <div className="bg-muted border border-border rounded-2xl p-6">
            <h3 className="font-bold text-foreground text-sm mb-2">การตอบกลับจาก Admin</h3>
            <p className="text-sm text-foreground leading-relaxed mb-4 whitespace-pre-line">
              {complaint!.admin_note}
            </p>
            {complaint!.resolved_at && (
              <p className="text-[11px] text-muted-foreground font-medium">
                ตอบกลับเมื่อ {fmtDate(complaint!.resolved_at)}
              </p>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold text-foreground text-sm mb-6">ไทม์ไลน์</h3>

          <div className="relative border-l-2 border-muted ml-3 space-y-8 pb-2">
            {/* Submitted */}
            <div className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${isFinished ? 'bg-primary' : 'bg-muted'}`} />
              <h4 className="text-sm font-bold text-foreground">ส่งคำร้องเรียน</h4>
              <p className="text-xs text-muted-foreground mt-1">{fmtDateTime(complaint!.created_at)}</p>
            </div>

            {/* Under review */}
            <div className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${isFinished ? 'bg-primary' : 'bg-primary'}`} />
              <h4 className="text-sm font-bold text-foreground">รับเรื่องโดย Admin</h4>
              <p className="text-xs text-muted-foreground mt-1">ระบบได้รับเรื่องแล้ว</p>
            </div>

            {/* Resolved / Rejected */}
            {isFinished && (
              <div className="relative pl-6">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${complaint!.status === 'resolved' ? 'bg-primary' : 'bg-red-400'}`} />
                <h4 className="text-sm font-bold text-foreground">
                  {complaint!.status === 'resolved' ? 'จัดการเรียบร้อย' : 'ปฏิเสธคำร้องเรียน'}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {complaint!.resolved_at ? fmtDateTime(complaint!.resolved_at) : '—'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetail;
