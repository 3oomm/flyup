import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Download, Loader2, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBoosterStore } from '../../store/useBoosterStore';
import { useInvestmentStore } from '../../store/useInvestmentStore';
import { useProjectDetailStore } from '../../store/useProjectDetailStore';
import { sanitizeStoryHtml } from '../../lib/sanitizeStoryHtml';
import { PreviewUpdate, PreviewQuestion, PreviewComment } from '../../components/preview/PreviewMisc';

// ─── Constants ───────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'รอชำระเงิน', color: 'bg-yellow-100 text-yellow-700' },
  verified: { label: 'กำลังดำเนินการ', color: 'bg-purple-100 text-purple-700' },
  funding: { label: 'กำลังดำเนินการ', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700' },
  refunded: { label: 'คืนเงิน', color: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700' },
};

const getMilestoneStatus = (s: string) => {
  switch (s) {
    case 'paid':       return { label: 'โอนเงินแล้ว',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'approved':   return { label: 'Admin อนุมัติแล้ว', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'active':     return { label: 'กำลังดำเนินการ',    cls: 'bg-accent/5 text-accent border-accent/20' };
    case 'submitted':  return { label: 'ส่งงานแล้ว',        cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'rejected':
    case 'failed':     return { label: 'ถูกปฏิเสธ',         cls: 'bg-red-50 text-red-600 border-red-200' };
    default:           return { label: 'รอดำเนินการ',        cls: 'bg-gray-50 text-gray-500 border-gray-200' };
  }
};
const isDone    = (s: string) => s === 'paid' || s === 'approved';
const isCurrent = (s: string) => s === 'active' || s === 'submitted';

// ─── Component ───────────────────────────────────────────────────────────────

type MediaItem = { type: 'video' | 'image'; url: string; name: string };

const InvestmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { currentInvestment, isDetailLoading: isInvLoading, fetchInvestmentById, requestRefund, profitPayouts, fetchProfitPayouts } = useBoosterStore();
  const getContractHtml = useInvestmentStore((state) => state.getContractHtml);
  const { updates, threads, faqs, fetchAll } = useProjectDetailStore();

  const [activeTab, setActiveTab] = useState<'story' | 'milestone' | 'update' | 'comment' | 'question'>('story');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [isPrintingPDF, setIsPrintingPDF] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const handleDownloadPDF = async () => {
    setIsPrintingPDF(true);
    try {
      const html = await getContractHtml(Number(id));
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) { toast.error('กรุณาอนุญาต popup เพื่อดาวน์โหลด PDF'); URL.revokeObjectURL(url); return; }
      win.addEventListener('load', () => { win.print(); URL.revokeObjectURL(url); });
    } catch {
      toast.error('ไม่สามารถโหลดสัญญาได้');
    } finally {
      setIsPrintingPDF(false);
    }
  };

  const handleRequestRefund = async () => {
    if (!refundReason.trim()) {
      toast.error('กรุณาระบุเหตุผลในการขอคืนเงิน');
      return;
    }
    setIsRefunding(true);
    const success = await requestRefund(Number(id), refundReason);
    setIsRefunding(false);
    if (success) {
      toast.success('ส่งคำร้องขอคืนเงินเรียบร้อยแล้ว');
      setShowRefundModal(false);
      fetchInvestmentById(Number(id));
    } else {
      toast.error('เกิดข้อผิดพลาดในการส่งคำร้อง');
    }
  };

  useEffect(() => {
    let active = true;
    if (!id || !/^\d+$/.test(id)) {
      setLoadedId(id ?? '');
      return;
    }
    fetchInvestmentById(Number(id)).finally(() => {
      if (active) setLoadedId(id);
    });
    return () => { active = false; };
  }, [id, fetchInvestmentById]);

  useEffect(() => {
    const projectId = currentInvestment?.project_id;
    if (projectId) fetchAll(projectId);
  }, [currentInvestment?.project_id, fetchAll]);

  useEffect(() => {
    fetchProfitPayouts();
  }, [fetchProfitPayouts]);

  if (loadedId !== id || isInvLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!currentInvestment || currentInvestment.id !== Number(id)) {
    return (
      <div className="py-24 text-center">
        <p className="mb-4 text-muted-foreground">ไม่พบรายการลงทุนนี้ หรือไม่สามารถโหลดข้อมูลได้</p>
        <Link to="/booster/investments" className="text-primary hover:underline">กลับไปรายการลงทุน</Link>
      </div>
    );
  }

  const inv = currentInvestment;
  const project = inv.project ?? null;
  const statusCfg = statusConfig[inv.status] || { label: inv.status, color: 'bg-gray-100 text-gray-600' };
  const dateStr = new Date(inv.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  const title = project?.title || '—';
  const rawCategory = project?.category;
  const category = typeof rawCategory === 'string'
    ? rawCategory
    : (rawCategory as { name?: string } | null)?.name || 'ไม่ระบุ';
  const description = project?.description || '';
  const milestones = [...(project?.milestones ?? [])].sort((a, b) => a.phase_no - b.phase_no);
  const profitShare = inv.profit_share_pct || project?.profit_share_pct || 0;
  const totalProfit = profitPayouts
    .filter(p => p.project_id === inv.project_id && p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0);
  const slug = (project as { slug?: string } | null)?.slug || inv.project_id;

  const getMediaType = (t: string | string[]): string => Array.isArray(t) ? t[0] : t;
  const mediaList: MediaItem[] = [...(project?.media ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(m => ({ type: getMediaType(m.type) as 'video' | 'image', url: m.url, name: 'media' }));
  const selectedMedia = mediaList[selectedIndex] ?? null;

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="flex flex-col gap-[10px] mb-[30px]">
        <button
          onClick={() => navigate('/booster/investments')}
          className="w-fit flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft size={16} /> กลับ
        </button>

        <div className="inline-flex w-fit items-center px-[12px] py-[4px] rounded-full border border-border bg-white text-[12px] font-medium text-foreground shadow-sm">
          {category}
        </div>
        <h1 className="text-[32px] sm:text-[36px] font-bold text-foreground leading-tight">
          {title}
        </h1>
        <p className="text-[14px] sm:text-[16px] text-muted-foreground w-full max-w-[800px]">
          {description || "กำลังโหลดรายละเอียดโปรเจกต์..."}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-[30px] pb-10">
        
        {/* ── Left Column (Project Details) ── */}
        <div className="flex-1 flex flex-col gap-[20px] min-w-0">
          
          {/* Main Media */}
          <div className="w-full aspect-[16/10] bg-white rounded-[16px] border border-border overflow-hidden shadow-sm">
            {selectedMedia ? (
              selectedMedia.type === 'video' ? (
                <video src={selectedMedia.url} controls className="w-full h-full object-cover" />
              ) : (
                <img src={selectedMedia.url} alt="media" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-muted-foreground">
                <span className="text-sm">กำลังโหลดรูปภาพ...</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {mediaList.length > 0 && (
            <div className="flex gap-[10px] overflow-x-auto pb-2 scrollbar-hide">
              {mediaList.map((media, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-[80px] h-[60px] flex-shrink-0 border-2 rounded-[8px] overflow-hidden cursor-pointer transition-colors ${selectedIndex === idx ? 'border-primary' : 'border-border hover:border-primary/50'}`}
                >
                  {media.type === 'video' ? (
                    <video src={media.url} className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <img src={media.url} alt="thumbnail" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="flex bg-[#f1f1f4] p-[4px] rounded-[10px] my-[10px] overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('story')}
              className={`flex-shrink-0 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[13px] font-medium transition-all cursor-pointer ${activeTab === 'story' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              เรื่องราว
            </button>
            <button
              onClick={() => setActiveTab('milestone')}
              className={`flex-shrink-0 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[13px] font-medium transition-all cursor-pointer ${activeTab === 'milestone' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Milestone ({milestones.length})
            </button>
            <button
              onClick={() => setActiveTab('update')}
              className={`flex-shrink-0 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[13px] font-medium transition-all cursor-pointer ${activeTab === 'update' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              อัปเดต ({updates.length})
            </button>
            <button
              onClick={() => setActiveTab('comment')}
              className={`flex-shrink-0 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[13px] font-medium transition-all cursor-pointer ${activeTab === 'comment' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ความคิดเห็น ({threads.length})
            </button>
            <button
              onClick={() => setActiveTab('question')}
              className={`flex-shrink-0 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[13px] font-medium transition-all cursor-pointer ${activeTab === 'question' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              คำถาม ({faqs.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="w-full bg-white border border-border p-6 rounded-[16px] shadow-sm min-h-[300px]">
             {activeTab === 'story' && (
                <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground">
                  {project?.stories && project.stories.length > 0
                      ? <div dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml([...project.stories].sort((a, b) => a.sort_order - b.sort_order).map(s => s.body).join('')) }} />
                      : "โปรเจกต์นี้ยังไม่ได้เขียนบรรยาย Story"}
                  {project?.risk && (
                      <div className="mt-8 p-4 bg-orange-50/50 border border-orange-200 rounded-xl">
                          <h4 className="font-bold text-orange-600 mb-2">ความเสี่ยงและความท้าทาย</h4>
                          <p className="text-sm">{project.risk}</p>
                      </div>
                  )}
                </div>
             )}
             {activeTab === 'milestone' && (
               milestones.length === 0
                 ? <p className="text-[13px] text-muted-foreground text-center py-8">ยังไม่มีข้อมูล Milestone</p>
                 : <div className="flex flex-col mt-[4px] w-full">
                     {milestones.map((m, index) => {
                       const phaseNumber = m.phase_no || (index + 1);
                       const criteria = (m.acceptance_criteria ?? '').split('\n').filter((c: string) => c.trim());
                       const done    = isDone(m.status);
                       const current = isCurrent(m.status);
                       const st      = getMilestoneStatus(m.status);
                       const isLast  = index === milestones.length - 1;
                       return (
                         <div key={m.id || index} className="flex gap-[16px] relative w-full">
                           <div className="hidden md:flex flex-col items-center shrink-0">
                             <div className={`w-[48px] h-[48px] rounded-2xl flex items-center justify-center font-bold text-[18px] shadow-sm transition-all z-10 ${
                               done    ? 'bg-emerald-500 text-white shadow-emerald-200' :
                               current ? 'bg-accent text-white shadow-accent/20 ring-4 ring-accent/10' :
                                         'bg-white border-2 border-border text-gray-400'
                             }`}>
                               {done ? <CheckCircle2 size={22} /> : phaseNumber}
                             </div>
                             {!isLast && (
                               <div className={`w-[2px] flex-1 min-h-[32px] mt-1 rounded-full ${done ? 'bg-emerald-300' : 'bg-border'}`} />
                             )}
                           </div>
                           <div className={`flex-1 mb-[20px] bg-white border rounded-[16px] p-[20px] shadow-sm flex flex-col gap-[16px] ${
                             current ? 'border-accent/30 shadow-accent/5' :
                             done    ? 'border-emerald-200' : 'border-border'
                           }`}>
                             <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-[12px]">
                               <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                                 <div className="flex items-center gap-[8px] flex-wrap">
                                   <h3 className="text-[15px] font-bold text-foreground">Phase {phaseNumber}: {m.title}</h3>
                                   <span className={`px-[10px] py-[3px] rounded-full text-[11px] font-semibold border ${st.cls}`}>{st.label}</span>
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
                                   ฿{((inv.amount || 0) * m.percent_release / 100).toLocaleString()} ({m.percent_release}%)
                                 </span>
                               </div>
                             </div>
                             <div className="flex justify-end">
                               <Link
                                 to={`/projects/${slug}/milestones`}
                                 className="text-[12px] text-primary hover:text-primary/70 transition-colors font-medium"
                               >
                                 ดูรายละเอียดเพิ่มเติม →
                               </Link>
                             </div>
                           </div>
                         </div>
                       );
                     })}
                   </div>
             )}
             {activeTab === 'update' && <PreviewUpdate updates={updates} />}
             {activeTab === 'comment' && <PreviewComment comments={threads} />}
             {activeTab === 'question' && <PreviewQuestion questions={faqs} />}
          </div>
        </div>

        {/* ── Right Column (Investment Sidebar) ── */}
        <div className="w-full lg:w-[360px] flex flex-col gap-[20px] flex-shrink-0">
          
          {/* Investment Snapshot */}
          <div className="bg-white border border-border rounded-[16px] p-[24px] shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-pink-500 to-purple-600"></div>
             
             <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-[28px] font-bold text-primary tracking-tight">฿{inv.amount?.toLocaleString()}</h2>
                    <p className="text-[13px] text-muted-foreground">ยอดลงทุนของคุณ</p>
                 </div>
                 <span className={`text-[12px] font-medium px-3 py-1 rounded-full ${statusCfg.color}`}>
                   {statusCfg.label}
                 </span>
             </div>

             <div className="flex flex-col gap-[12px] text-[13px] border-t border-border pt-[16px]">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">เลขอ้างอิง</span>
                    <span className="font-semibold text-foreground">{inv.reference_number ?? `INV-${inv.id}`}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">วันที่ทำรายการ</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5"><Calendar size={13} /> {dateStr}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">ส่วนแบ่งกำไร</span>
                    <span className="font-semibold text-foreground">{profitShare}%</span>
                </div>
                <div className="flex justify-between items-center mt-2 border-t border-dashed border-border pt-3">
                    <span className="text-muted-foreground">ค่าธรรมเนียมแพลตฟอร์ม</span>
                    <span className="font-semibold text-foreground text-error">฿{inv.platform_fee?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">VAT</span>
                    <span className="font-semibold text-foreground text-error">฿{inv.vat?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mt-2 bg-surface-soft p-3 rounded-xl border border-border">
                    <span className="text-muted-foreground font-semibold">ยอดชำระสุทธิ</span>
                    <span className="font-bold text-[16px] text-foreground">฿{(inv.net_amount || inv.amount)?.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-[6px] mt-2 border-t border-dashed border-border pt-3">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">กำไรที่ได้รับ</span>
                        <span className={`font-semibold ${totalProfit > 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                            ฿{totalProfit.toLocaleString()}
                        </span>
                    </div>
                    {totalProfit === 0 && (
                        <p className="text-[11px] text-muted-foreground text-right">ยังไม่มีกำไรจ่าย — รอโปรเจกต์สร้างรายได้</p>
                    )}
                </div>
             </div>

             <button
               onClick={handleDownloadPDF}
               disabled={isPrintingPDF}
               className="w-full mt-6 bg-background hover:bg-muted border border-border text-foreground h-11 rounded-[10px] flex justify-center items-center gap-2 font-medium transition-colors text-[14px] cursor-pointer disabled:opacity-60"
             >
               {isPrintingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
               <span>{isPrintingPDF ? 'กำลังเตรียม PDF...' : 'ดาวน์โหลดสัญญา (PDF)'}</span>
             </button>

             {inv.status === 'refund_pending' ? (
               <div className="w-full mt-3 bg-amber-50 border border-amber-200 text-amber-700 h-[44px] rounded-[10px] flex justify-center items-center gap-[8px] font-medium text-[14px]">
                   <Clock size={16} /> <span>กำลังดำเนินการขอคืนเงิน</span>
               </div>
             ) : (inv.status === 'funding' || (inv.status === 'verified' && (project?.state === 'failed' || project?.state === 'cancelled'))) && (
               <button
                 onClick={() => setShowRefundModal(true)}
                 className="w-full mt-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 h-[44px] rounded-[10px] flex justify-center items-center gap-[8px] font-medium transition-colors text-[14px] cursor-pointer"
               >
                   <AlertTriangle size={16} /> <span>แจ้งขอคืนเงิน (Refund)</span>
               </button>
             )}
          </div>

          {/* Project Progress Status */}
          <div className="bg-white border border-border rounded-[16px] p-[24px] shadow-sm">
              <h3 className="text-[14px] font-bold text-foreground mb-4">สถานะโปรเจกต์</h3>
              <div className="space-y-4">
                 {milestones.length > 0 ? milestones.map((m, idx) => {
                   const done    = isDone(m.status);
                   const current = isCurrent(m.status);
                   const isLast  = idx === milestones.length - 1;
                   return (
                     <div key={m.id} className="flex gap-3">
                       <div className="flex flex-col items-center mt-1">
                         <div className={`w-3 h-3 rounded-full flex-shrink-0 ${done ? 'bg-emerald-500' : current ? 'bg-accent' : 'bg-gray-300'}`} />
                         {!isLast && <div className="w-[1px] flex-1 bg-border mt-1" />}
                       </div>
                       <div className="flex-1 pb-4">
                         <p className={`text-[13px] font-medium leading-snug ${done ? 'text-emerald-600' : current ? 'text-accent' : 'text-foreground'}`}>
                           Phase {m.phase_no}: {m.title}
                         </p>
                         <p className="text-[12px] text-muted-foreground mt-1">
                           ฿{((inv.amount || 0) * m.percent_release / 100).toLocaleString()} ({m.percent_release}%)
                         </p>
                       </div>
                     </div>
                   );
                 }) : (
                    <p className="text-[13px] text-muted-foreground text-center py-4">โปรเจกต์นี้ยังไม่มีข้อมูล Milestone</p>
                 )}
              </div>
          </div>

        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-2">
                <AlertTriangle size={24} />
                <h3 className="font-bold text-xl">ขอคืนเงิน (Refund)</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                คุณกำลังส่งคำร้องขอคืนเงินสำหรับโปรเจกต์ <span className="font-semibold text-foreground">{title}</span> ยอดเงิน <span className="font-semibold text-foreground">฿{inv.amount?.toLocaleString()}</span>
                <br /><br />
                โปรดระบุเหตุผลในการขอคืนเงิน แอดมินจะทำการตรวจสอบคำร้องของคุณโดยเร็วที่สุด
              </p>
              
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="ระบุเหตุผลในการขอคืนเงิน..."
                className="w-full h-24 p-3 rounded-xl border border-border focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm resize-none bg-background"
              />
            </div>

            <div className="p-4 border-t border-border bg-background/50 flex gap-3">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-muted transition-colors text-sm cursor-pointer"
                disabled={isRefunding}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRequestRefund}
                disabled={isRefunding || !refundReason.trim()}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {isRefunding ? <Loader2 size={16} className="animate-spin" /> : null}
                ยืนยันการขอคืนเงิน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentDetail;
