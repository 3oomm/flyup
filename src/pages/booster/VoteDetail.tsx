import { useEffect, useState } from 'react';
import Swal from '../../lib/swal';
import { ArrowLeft, CheckCircle2, ChevronRight, FileText, Image as ImageIcon, Link2, XCircle, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'react-hot-toast';
import { useBoosterStore } from '../../store/useBoosterStore';
import { useMilestoneStore } from '../../store/useMilestoneStore';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MilestoneDetail {
  id: number;
  project_id: number;
  phase_no: number;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  percent_release: number;
  status: string;
  submission_summary?: string | null;
  submission_criteria?: string[];
  submission_attachments?: string[];
  submission_links?: string[];
  submitted_at?: string | null;
  voting_open?: boolean;
  voting_opened_at?: string | null;
  voting_closed_at?: string | null;
  due_date?: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

const VoteDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { voteOnMilestone, getMyVote, investments, fetchMyInvestments } = useBoosterStore();
  const { fetchProjectMilestones } = useMilestoneStore();

  const [milestone, setMilestone] = useState<MilestoneDetail | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const [voteValue, setVoteValue] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [isVoted, setIsVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Load investments if not loaded
  useEffect(() => {
    if (investments.length === 0) fetchMyInvestments();
  }, [investments.length, fetchMyInvestments]);

  // 2. Fetch milestone detail + check if already voted
  useEffect(() => {
    if (!id) return;

    const fetchMilestone = async () => {
      setLoading(true);
      try {
        const projectIds = [...new Set(investments.map(inv => inv.project_id).filter(Boolean))];

        let found: MilestoneDetail | null = null;
        for (const pid of projectIds) {
          try {
            const milestones = await fetchProjectMilestones(pid) as MilestoneDetail[];
            const m = milestones.find(m => m.id === Number(id));
            if (m) {
              found = { ...m, project_id: pid };
              setMilestone(found);
              const proj = investments.find(inv => inv.project_id === pid);
              setProjectTitle(proj?.project?.title || `โปรเจกต์ #${pid}`);
              break;
            }
          } catch {
            // continue to next project
          }
        }

        if (found?.voting_open) {
          const existingVote = await getMyVote(Number(id));
          if (existingVote) {
            setVoteValue(existingVote.choice as 'approve' | 'reject');
            setIsVoted(true);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    if (investments.length > 0) {
      fetchMilestone();
    }
  }, [id, investments, getMyVote, fetchProjectMilestones]);

  const handleVoteSubmit = async () => {
    if (!voteValue || !milestone) return;

    const label = voteValue === 'approve' ? 'ยอมรับ' : 'ไม่ยอมรับ'
    const color = voteValue === 'approve' ? '#16a34a' : '#dc2626'

    const result = await Swal.fire({
      title: 'ยืนยันการโหวต',
      html: `คุณต้องการโหวต <strong style="color:${color}">${label}</strong><br/>สำหรับ Phase ${milestone.phase_no}: ${milestone.title}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#16A34A',
      cancelButtonColor: '#6B7280',
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    setIsSubmitting(true)
    const voteResult = await voteOnMilestone(milestone.id, {
      choice: voteValue,
      comment: comment.trim() || undefined,
    })
    setIsSubmitting(false)

    if (voteResult === true) {
      toast.success('บันทึกการลงคะแนนสำเร็จ')
      setIsVoted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (voteResult === 'already_voted') {
      toast('คุณได้ลงคะแนนแล้ว', { icon: 'ℹ️' })
      setIsVoted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      toast.error('เกิดข้อผิดพลาดในการโหวต กรุณาลองใหม่')
    }
  };

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!milestone) {
    return (
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/booster/votes')} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer">
          <ArrowLeft size={16} /> กลับไปหน้าโหวต
        </button>
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">ไม่พบข้อมูล Milestone</p>
          <p className="text-sm">Milestone นี้อาจถูกลบหรือคุณไม่มีสิทธิ์เข้าถึง</p>
        </div>
      </div>
    );
  }

  // Parse criteria from acceptance_criteria string
  const criteria = milestone.acceptance_criteria
    ? milestone.acceptance_criteria.split('\n').filter(c => c.trim().length > 0)
    : [];

  // Evidence
  const evidence: { type: string; title: string; url?: string }[] = [];
  if (milestone.submission_attachments) {
    milestone.submission_attachments.forEach(a => {
      const ext = a.split('.').pop()?.toLowerCase();
      const type = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '') ? 'image' : 'pdf';
      evidence.push({ type, title: a.split('/').pop() || a, url: a });
    });
  }
  if (milestone.submission_links) {
    milestone.submission_links.forEach(l => {
      evidence.push({ type: 'link', title: l, url: l });
    });
  }

  return (
    <div className="max-w-5xl mx-auto relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/booster/votes')}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft size={16} /> กลับไปหน้าโหวต
      </button>

      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{projectTitle}</p>
        <h1 className="text-2xl font-bold text-foreground">Phase {milestone.phase_no}: {milestone.title}</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN: Info */}
        <div className="flex-1 space-y-6">

          {/* Details */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-foreground text-sm mb-4">รายละเอียดงาน</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {milestone.description || 'ไม่มีรายละเอียด'}
            </p>
            {milestone.submission_summary && (
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-bold">สรุปผล:</span> {milestone.submission_summary}
              </p>
            )}
          </div>

          {/* Criteria */}
          {criteria.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-foreground text-sm mb-4">เกณฑ์การยอมรับ</h3>
              <ul className="space-y-3">
                {criteria.map((c, i) => (
                  <li key={i} className="flex items-center gap-[10px] p-[12px] rounded-[10px] border border-green-200 bg-green-50">
                    <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                    <span className="text-[13px] font-medium text-green-800">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence */}
          {evidence.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-foreground text-sm mb-4">หลักฐานความสำเร็จ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {evidence.map((e, i) => (
                  <a
                    key={i}
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 p-3 border border-border rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-foreground truncate">
                      {e.type === 'image' && <ImageIcon size={16} className="text-primary" />}
                      {e.type === 'pdf' && <FileText size={16} className="text-pink-500" />}
                      {e.type === 'link' && <Link2 size={16} className="text-muted-foreground" />}
                      <span className="truncate">{e.title}</span>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Voting */}
        <div className="w-full lg:w-[380px] space-y-6 flex-shrink-0">

          {/* Stats Box */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-foreground text-sm mb-4">ข้อมูล Milestone</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">สถานะ</span>
                <span className={`font-semibold ${milestone.voting_open ? 'text-primary' : 'text-muted-foreground'}`}>
                  {milestone.voting_open ? 'กำลัง Vote อยู่' : milestone.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">เปอร์เซ็นต์ปล่อยเงิน</span>
                <span className="font-semibold">{milestone.percent_release}%</span>
              </div>
              {milestone.voting_opened_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">เปิดโหวตเมื่อ</span>
                  <span className="font-semibold">{fmtDate(milestone.voting_opened_at)}</span>
                </div>
              )}
              {milestone.due_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">กำหนดส่งงาน</span>
                  <span className="font-semibold">{fmtDate(milestone.due_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Vote Action Box */}
          {isVoted ? (
            <div className="bg-green-50/50 border border-green-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-bold text-green-800 text-lg mb-2">บันทึกการลงคะแนนสำเร็จ</h3>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                คุณโหวต: {voteValue === 'approve' ? 'ยอมรับ' : 'ไม่ยอมรับ'}
                {voteValue === 'approve' ? <CheckCircle2 size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
              </p>
            </div>
          ) : milestone.voting_open ? (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-foreground text-sm mb-4">ลงคะแนนของคุณ</h3>

              {/* Radio Buttons */}
              <div className="space-y-3 mb-5">
                <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${voteValue === 'approve' ? 'border-green-600 bg-green-50' : 'border-border hover:bg-muted'}`}>
                  <input
                    type="radio"
                    name="vote"
                    className="w-4 h-4 text-green-600 focus:ring-green-600 accent-green-600"
                    checked={voteValue === 'approve'}
                    onChange={() => setVoteValue('approve')}
                  />
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className={voteValue === 'approve' ? 'text-green-600' : 'text-muted-foreground'} />
                    <span className={`text-sm font-semibold ${voteValue === 'approve' ? 'text-foreground' : 'text-muted-foreground'}`}>ยอมรับ (Approve)</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${voteValue === 'reject' ? 'border-red-500 bg-red-50' : 'border-border hover:bg-muted'}`}>
                  <input
                    type="radio"
                    name="vote"
                    className="w-4 h-4 text-red-500 focus:ring-red-500 accent-red-500"
                    checked={voteValue === 'reject'}
                    onChange={() => setVoteValue('reject')}
                  />
                  <div className="flex items-center gap-2">
                    <XCircle size={16} className={voteValue === 'reject' ? 'text-red-500' : 'text-muted-foreground'} />
                    <span className={`text-sm font-semibold ${voteValue === 'reject' ? 'text-foreground' : 'text-muted-foreground'}`}>ไม่ยอมรับ (Reject)</span>
                  </div>
                </label>
              </div>

              {/* Comment Box */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-muted-foreground mb-2">ความเห็น (ไม่บังคับ)</label>
                <textarea
                  placeholder="ระบุความคิดเห็นหรือข้อเสนอแนะ"
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 200))}
                  maxLength={200}
                  className="w-full text-sm p-3 border border-border rounded-xl placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none h-24"
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {comment.length}/200
                </div>
              </div>

              <button
                onClick={handleVoteSubmit}
                disabled={!voteValue || isSubmitting}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                ยืนยันการโหวต
              </button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <p className="text-sm text-muted-foreground">Milestone นี้ปิดการโหวตแล้ว</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default VoteDetail;
