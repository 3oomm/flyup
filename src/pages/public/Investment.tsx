import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Download,
  X,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { usePublicProjectStore } from "../../store/usePublicProjectStore";
import { useInvestmentStore } from "../../store/useInvestmentStore";

type Step = 1 | 2 | 3 | 4;
const PAYMENT_QR_LIFETIME_SECONDS = 5 * 60;

const ContractModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-foreground">สัญญาการลงทุน</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6 text-sm text-muted-foreground space-y-4 leading-relaxed">
          <p>1. ผู้สนับสนุน ("นักลงทุน") ตกลงที่จะลงทุนตามจำนวนเงินที่ระบุในโปรเจกต์ที่เลือก</p>
          <p>2. เงินลงทุนจะถูกเก็บรักษาไว้ในระบบ Escrow และจะถูกปล่อยตาม Milestone ที่ผ่านการตรวจสอบ</p>
          <p>3. ผู้สนับสนุนมีสิทธิ์โหวตยืนยันหรือปฏิเสธ Milestone ก่อนปล่อยเงินลงทุน</p>
          <p>4. ส่วนแบ่งกำไรจะเริ่มจ่ายเมื่อโปรเจกต์เริ่มสร้างรายได้ ตามเงื่อนไขที่ระบุ</p>
          <p>5. แพลตฟอร์ม FlyUp เป็นเพียงตัวกลาง ไม่รับประกันผลตอบแทนใดๆ</p>
          <p>6. หากโปรเจกต์ไม่ผ่าน Milestone ตามเงื่อนไข เงินที่เหลือจะถูกคืนให้กับนักลงทุนตามสัดส่วน</p>
          <p>7. การลงทุนมีความเสี่ยง ผู้สนับสนุนควรพิจารณาอย่างรอบคอบก่อนตัดสินใจ</p>
        </div>
        <div className="p-4 border-t border-border">
          <button onClick={onClose} className="w-full py-2.5 bg-primary text-white-foreground rounded-xl font-bold hover:opacity-90 transition-opacity cursor-pointer">
            รับทราบ
          </button>
        </div>
      </div>
    </div>
  );
};

const Investment = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [agreed, setAgreed] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [completedInvestmentId, setCompletedInvestmentId] = useState<number | null>(null);
  const [showContract, setShowContract] = useState(false);
  const [isPrintingPDF, setIsPrintingPDF] = useState(false);
  const [isSavingQr, setIsSavingQr] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PAYMENT_QR_LIFETIME_SECONDS);

  const pollingRef = useRef<number | null>(null);

  const { authUser, isCheckingAuth } = useAuthStore();
  const { currentPublicProject, fetchPublicProjectBySlug, fetchPublicProjectById } = usePublicProjectStore();
  const { createInvestment, getInvestmentById, getContractHtml, resumeInvestment, isSubmitting, investmentData, clearInvestmentData } = useInvestmentStore();

  const project = currentPublicProject;

  useEffect(() => {
    if (slug) {
      if (/^\d+$/.test(slug)) fetchPublicProjectById(Number(slug));
      else fetchPublicProjectBySlug(slug);
    }
  }, [slug, fetchPublicProjectBySlug, fetchPublicProjectById]);

  useEffect(() => {
    const investmentId = Number(searchParams.get('investmentId'));
    if (!investmentId) return;

    let cancelled = false;
    resumeInvestment(investmentId).then((restored) => {
      if (cancelled) return;
      if (!restored) {
        toast.error('ไม่พบรายการรอชำระเงิน หรือรายการนี้ไม่สามารถชำระต่อได้');
        return;
      }

      const remainingSeconds = restored.expires_at
        ? Math.max(0, Math.floor((new Date(restored.expires_at).getTime() - Date.now()) / 1000))
        : PAYMENT_QR_LIFETIME_SECONDS;
      if (remainingSeconds <= 0) {
        toast.error('QR Code หมดอายุแล้ว กรุณาสร้างรายการลงทุนใหม่');
        clearInvestmentData();
        return;
      }

      setAmount(String(restored.total_amount));
      setTimeLeft(remainingSeconds);
      setStep(3);
    });

    return () => { cancelled = true; };
  }, [searchParams, resumeInvestment, clearInvestmentData]);

  // Guard direct URLs as well as navigation from the project detail page.
  useEffect(() => {
    if (isCheckingAuth) return;
    if (!authUser) {
      toast.error('กรุณาเข้าสู่ระบบก่อนลงทุน', { id: 'investment-login-required' });
      navigate('/login', { replace: true });
      return;
    }
    const isAdmin = authUser.role === 'admin';
    const isPioneer = authUser.role === 'pioneer';
    const isOwner = !!project?.owner_user_id && authUser.id === project.owner_user_id;
    const kycApproved = authUser.id_card_verification?.status === 'approved';

    if (isAdmin || isPioneer) {
      toast.error(isAdmin ? 'ผู้ดูแลระบบไม่สามารถลงทุนได้' : 'บัญชี Pioneer ไม่สามารถลงทุนได้');
      navigate(`/projects/${slug}`, { replace: true });
    } else if (isOwner) {
      toast.error('เจ้าของโปรเจกต์ไม่สามารถลงทุนในโปรเจกต์ของตัวเองได้');
      navigate(`/projects/${slug}`, { replace: true });
    } else if (!kycApproved) {
      toast.error('กรุณายืนยันตัวตนด้วยบัตรประชาชนก่อนลงทุน', { duration: 4000 });
      navigate('/booster/profile?tab=verify', { replace: true });
    }
  }, [project, authUser, isCheckingAuth, slug, navigate]);

  // Timer countdown
  useEffect(() => {
    if (step === 3 && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (step === 3 && timeLeft === 0) {
      toast.error('หมดเวลาทำรายการ');
      navigate(-1);
    }
  }, [step, timeLeft, navigate]);

  // Polling for investment status
  useEffect(() => {
    if (step === 3 && investmentData?.investment_id) {
      pollingRef.current = window.setInterval(async () => {
        try {
          const response = await getInvestmentById(investmentData.investment_id);
          const status = response?.data?.investment?.status || response?.data?.status;
          if (status === 'verified') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setCompletedInvestmentId(investmentData.investment_id);
            setStep(4);
            clearInvestmentData();
          } else if (status === 'rejected') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            toast.error('การชำระเงินไม่สำเร็จ หรือ QR Code หมดอายุ กรุณาทำรายการใหม่');
            clearInvestmentData();
            setTimeLeft(PAYMENT_QR_LIFETIME_SECONDS);
            setStep(2);
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 5000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [step, investmentData, getInvestmentById, clearInvestmentData]);

  // Project data
  const projectTitle = project?.title || "กำลังโหลด...";
  const revenueShare = project?.profit_share_pct || 0;
  const minAmount = project?.min_invest_amount || 1000;
  const remaining = Math.max(0, (project?.funding_goal || 0) - (project?.current_funding || 0));
  // ถ้าระดมทุนถึง softcap แล้ว → ยกเว้นขั้นต่ำ เพื่อให้ลงทุน remaining ที่เหลือได้
  const softcap = project?.softcap || 0;
  const currentFunding = project?.current_funding || 0;
  const isSoftcapReached = softcap > 0 && currentFunding >= softcap;
  const MIN_PAYMENT_GATEWAY = 20; // PromptPay QR ต้องการขั้นต่ำ 20 บาท
  const effectiveMinAmount = Math.max(isSoftcapReached ? 1 : minAmount, MIN_PAYMENT_GATEWAY);
  // เพดานต่อรายการของ payment gateway (Stripe จำกัดที่ ~999,999.99 — ตั้ง 500,000 ตามมาตรฐาน fintech ไทย)
  const MAX_PER_TRANSACTION = 500_000;
  const maxAmount = Math.min(
    MAX_PER_TRANSACTION,
    project?.max_invest_amount && project.max_invest_amount > 0
      ? Math.min(project.max_invest_amount, remaining)
      : remaining
  );
  const canInvest = project?.state === 'funding' && maxAmount >= effectiveMinAmount;
  const platformFeeRate = (project?.platform_fee || 5) / 100;
  const vatRate = 0.07;

  const presetAmounts = (() => {
    // Palette of round numbers covering common investment scales
    const NICE = [500, 1000, 2000, 3000, 5000, 7000, 10000, 15000, 20000, 30000, 50000, 70000, 100000, 150000, 200000, 300000, 500000];
    const candidates = NICE.filter(v => v > effectiveMinAmount && v < maxAmount);
    const COUNT = 3; // presets after minAmount (total = 4 + สูงสุด)

    let picks: number[];
    if (candidates.length >= COUNT) {
      // Evenly distributed by index across the candidate list
      picks = Array.from({ length: COUNT }, (_, i) =>
        candidates[Math.round((i + 1) * (candidates.length - 1) / COUNT)]
      );
      picks = [...new Set(picks)];
    } else if (candidates.length > 0) {
      picks = candidates;
    } else {
      // Range too tight — linear fallback rounded to sensible magnitude
      const rawStep = (maxAmount - effectiveMinAmount) / (COUNT + 1);
      const mag = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1))));
      const step = Math.max(1000, Math.round(rawStep / mag) * mag);
      const start = Math.ceil((effectiveMinAmount + 1) / step) * step;
      picks = [];
      for (let v = start; v < maxAmount && picks.length < COUNT; v += step) picks.push(v);
    }

    // แสดง minAmount เป็น preset แรกเฉพาะเมื่อ minAmount <= maxAmount
    // (กรณี softcap ถึงแล้วและ remaining < minAmount → ไม่แสดง minAmount)
    const leadingPreset = minAmount <= maxAmount ? minAmount : null;
    return leadingPreset ? [leadingPreset, ...picks] : picks;
  })();

  const parsedAmount = parseInt(amount.replace(/,/g, "")) || 0;
  const fee = parsedAmount * platformFeeRate;
  const vat = fee * vatRate;
  const investedValue = parsedAmount - fee - vat;

  const userName = (() => {
    if (!authUser) return "—";
    const fn = typeof authUser.first_name === 'string' ? authUser.first_name : '';
    const ln = typeof authUser.last_name === 'string' ? authUser.last_name : '';
    return `${fn} ${ln}`.trim() || (typeof authUser.name === 'string' ? authUser.name as string : '—');
  })();

  const handleDownloadContract = async () => {
    if (!completedInvestmentId) return;
    setIsPrintingPDF(true);
    try {
      const html = await getContractHtml(completedInvestmentId);
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

  const handleSaveQrCode = async () => {
    if (!investmentData) return;
  setIsSavingQr(true);
  const fileName = `promptpay-${investmentData?.reference_number}.png`;
  try {
    if (investmentData?.qr_code_base64) {
      const a = document.createElement('a');
      a.href = investmentData.qr_code_base64;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    const res = await fetch(investmentData.qr_code_image_url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(investmentData.qr_code_image_url, '_blank');
  } finally {
    setIsSavingQr(false);
  }
};

  const handleNextStep1 = () => {
    if (!canInvest) {
      toast.error('โปรเจกต์นี้ปิดรับการลงทุนแล้ว หรือยอดคงเหลือต่ำกว่าขั้นต่ำ');
      return;
    }
    if (!agreed) {
      toast.error("กรุณากด ยอมรับสัญญาการลงทุนและเงื่อนไข", {
        style: {
          borderRadius: "10px",
          background: "var(--color-navbar-2)",
          color: "var(--color-white-foreground)",
          fontSize: "14px",
        },
      });
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!canInvest) {
      toast.error('โปรเจกต์นี้ปิดรับการลงทุนแล้ว หรือยอดคงเหลือต่ำกว่าขั้นต่ำ');
      return;
    }
    if (parsedAmount < effectiveMinAmount) {
      toast.error(`จำนวนเงินขั้นต่ำคือ ฿${effectiveMinAmount.toLocaleString()}`);
      return;
    }
    if (parsedAmount > maxAmount) {
      toast.error(`จำนวนเงินสูงสุดคือ ฿${maxAmount.toLocaleString()}`);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmInvestment = async () => {
    if (!authUser || !project?.id || !canInvest || parsedAmount < effectiveMinAmount || parsedAmount > maxAmount) {
      toast.error('ไม่สามารถลงทุนด้วยจำนวนเงินนี้ได้ กรุณาตรวจสอบยอดคงเหลือ');
      setShowConfirm(false);
      return;
    }

    const success = await createInvestment({
      project_id: project.id,
      amount: parsedAmount,
    });

    if (success) {
      setShowConfirm(false);
      setStep(3);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="h-full min-h-screen w-full flex-1 bg-[url('/bg-investment.png')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col pt-24 relative before:absolute before:inset-0 before:bg-white/30 before:pointer-events-none">
      <Toaster position="top-center" containerStyle={{ top: 80 }} />
      <ContractModal isOpen={showContract} onClose={() => setShowContract(false)} />

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 text-center space-y-1">
              <h3 className="font-bold text-xl text-foreground">ยืนยันการลงทุน</h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="bg-background rounded-xl p-4 border border-border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">โปรเจกต์</span>
                  <span className="font-semibold text-sm">{projectTitle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ชื่อผู้สนับสนุน</span>
                  <span className="font-semibold text-sm">{userName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ยอดลงทุน</span>
                  <span className="font-semibold text-sm">฿{parsedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ส่วนแบ่งกำไร</span>
                  <span className="font-semibold text-primary text-sm">{revenueShare}%</span>
                </div>
              </div>

              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 flex justify-between items-center">
                <span className="font-bold text-foreground">ยอดชำระรวม</span>
                <span className="font-bold text-primary text-lg">฿{parsedAmount.toLocaleString()}</span>
              </div>

              <div className="text-center space-y-2 py-2">
                <p className="text-xs text-muted-foreground">เมื่อยืนยันแล้ว ระบบจะออกสัญญายืนยันการลงทุนให้อัตโนมัติ</p>
                <p className="text-[11px] font-bold text-error">**กรุณาเปิดแอปพลิเคชั่นธนาคารของท่านก่อนยืนยันการลงทุน เพื่อความรวดเร็ว**</p>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-background/50 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-muted transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmInvestment}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-primary text-white-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
                ยืนยันการลงทุน
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-3xl mx-auto w-full px-4 py-8 flex-1 flex flex-col">
        {step < 4 ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors mb-6 cursor-pointer"
              >
                <ArrowLeft size={18} /> กลับ
              </button>
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">ลงทุนใน {projectTitle}</h1>
                <p className="text-muted-foreground text-sm mt-1">กรุณาทำตามขั้นตอนเพื่อดำเนินการลงทุน</p>
              </div>
            </div>

            {/* Stepper */}
            <div className="mb-10 relative px-4 max-w-xl mx-auto w-full">
              <div className="absolute top-[20px] left-[15%] right-[15%] h-[2px] bg-border -z-10 rounded-full" />
              <div
                className="absolute top-[20px] left-[15%] h-[2px] bg-primary -z-10 transition-all duration-300 rounded-full"
                style={{ width: step === 1 ? '0%' : step === 2 ? '35%' : '70%' }}
              />

              <div className="flex justify-between text-xs sm:text-sm font-medium">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${step >= 1 ? 'bg-primary text-white shadow-lg' : 'bg-white text-muted-foreground border-2 border-border'}`}>
                    <FileText size={18} />
                  </div>
                  <span className={`font-bold ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>เงื่อนไข</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${step >= 2 ? 'bg-primary text-white shadow-lg' : 'bg-white text-muted-foreground border-2 border-border'}`}>
                    <CheckCircle2 size={18} />
                  </div>
                  <span className={`font-bold ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>จำนวนเงิน</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${step >= 3 ? 'bg-primary text-white shadow-lg' : 'bg-white text-muted-foreground border-2 border-border'}`}>
                    <QrCode size={18} />
                  </div>
                  <span className={`font-bold ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>ชำระเงิน</span>
                </div>
              </div>
            </div>

            {/* Content Cards */}
            <div className="bg-white w-full rounded-[32px] p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-white/60 relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />

              {/* Step 1: Conditions */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-6 text-primary">
                    <FileText size={24} />
                    <h2 className="text-xl font-bold text-foreground">เงื่อนไขการลงทุน</h2>
                  </div>

                  <div className="bg-surface-soft rounded-2xl p-5 sm:p-6 mb-6">
                    <div className="grid grid-cols-[1.2fr_0.3fr_1.5fr] gap-4 py-2 border-b border-border/50 items-center">
                      <span className="font-bold text-foreground text-sm">สัญญาการลงทุน</span>
                      <span className="text-muted-foreground text-center">—</span>
                      <span className="font-bold text-foreground text-sm text-right">โปรเจกต์ {projectTitle}</span>
                    </div>

                    <div className="divide-y divide-border/30 text-sm">
                      <div className="grid grid-cols-[1.2fr_0.3fr_1.5fr] gap-4 py-4 items-center">
                        <span className="text-muted-foreground">สัดส่วนกำไรที่จะได้รับ</span>
                        <span className="text-muted-foreground text-center"></span>
                        <span className="font-bold text-primary text-right">{revenueShare}%</span>
                      </div>
                      <div className="grid grid-cols-[1.2fr_0.3fr_1.5fr] gap-4 py-4 items-center">
                        <span className="text-muted-foreground">จำนวนเงินลงทุนขั้นต่ำ</span>
                        <span className="text-muted-foreground text-center"></span>
                        <span className="font-bold text-foreground text-right">฿{minAmount.toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-[1.2fr_0.3fr_1.5fr] gap-4 py-4 items-center">
                        <span className="text-muted-foreground">จำนวนเงินลงทุนสูงสุด</span>
                        <span className="text-muted-foreground text-center"></span>
                        <span className="font-bold text-foreground text-right">฿{maxAmount.toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-[1.2fr_0.3fr_1.5fr] gap-4 py-4 items-center">
                        <span className="text-muted-foreground">ค่าธรรมเนียมแพลตฟอร์ม</span>
                        <span className="text-muted-foreground text-center"></span>
                        <span className="font-bold text-foreground text-right">{(platformFeeRate * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-2xl p-4 mb-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-muted-foreground flex-shrink-0 mt-0.5 opacity-60" size={18} />
                      <div className="text-[13px] text-muted-foreground leading-relaxed">
                        <p>ผู้สนับสนุนทราบว่าการลงทุนมีความเสี่ยง และอาจสูญเสียเงินลงทุนทั้งหมด</p>
                        <p>แพลตฟอร์ม FlyUp ทำหน้าที่เป็นเพียงตัวกลางในการจัดการระบบและ</p>
                        <p>ไม่รับประกันผลตอบแทน และไม่เป็นคู่สัญญาในการลงทุน</p>
                        <p>เงินลงทุนจะถูกปล่อยตาม Milestone ที่ผ่านการตรวจสอบตามเงื่อนไขของโปรเจคต์เท่านั้น</p>
                        <button
                          onClick={() => setShowContract(true)}
                          className="mt-2 text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <FileText size={14} /> อ่านสัญญาเพิ่มเติม &gt;
                        </button>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-5 bg-surface-soft rounded-[18px] cursor-pointer hover:bg-surface-hover transition-all mb-8 group border border-transparent hover:border-primary/20">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="peer h-6 w-6 cursor-pointer appearance-none rounded-md border-2 border-border bg-white checked:bg-primary checked:border-primary transition-all"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                      />
                      {agreed && (
                        <div className="pointer-events-none absolute text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-foreground font-medium select-none">
                      ข้าพเจ้าได้อ่านและ<span className="font-bold text-foreground mx-1">ยอมรับสัญญาการลงทุนและเงื่อนไข</span>ข้างต้นแล้ว
                    </span>
                  </label>

                  {!canInvest && project && (
                    <p className="mb-4 text-center text-sm font-medium text-error">โปรเจกต์นี้ปิดรับการลงทุนแล้ว หรือยอดคงเหลือต่ำกว่าขั้นต่ำ</p>
                  )}
                  <button
                    onClick={handleNextStep1}
                    disabled={!canInvest}
                    className="w-full py-3.5 bg-primary text-white-foreground rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ยอมรับและดำเนินการต่อ
                  </button>
                </div>
              )}

              {/* Step 2: AmountInput */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                  <h2 className="text-xl font-bold text-foreground mb-6">ระบุจำนวนเงินลงทุน</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">จำนวนเงิน (บาท)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-foreground">฿</span>
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            if (!digits) {
                              setAmount("");
                              return;
                            }

                            const value = Number(digits);
                            const clampedValue = !Number.isSafeInteger(value) || value > maxAmount
                              ? maxAmount
                              : value;
                            setAmount(clampedValue.toLocaleString());
                           }}
                          inputMode="numeric"
                          placeholder={isSoftcapReached ? `สูงสุด ${maxAmount.toLocaleString()}` : `ขั้นต่ำ ${minAmount.toLocaleString()}`}
                          className="w-full pl-10 pr-4 py-5 rounded-[20px] border-2 border-surface-raised focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-[#ADB5BD] font-bold text-2xl text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {presetAmounts.map(val => (
                        <button
                          key={val}
                          onClick={() => setAmount(val.toLocaleString())}
                          className="px-6 py-3 border border-border rounded-[14px] font-bold text-foreground bg-white hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          ฿{val.toLocaleString()}
                        </button>
                      ))}
                      <button
                        onClick={() => setAmount(maxAmount.toLocaleString())}
                        disabled={!canInvest}
                        className="px-6 py-3 border border-primary/30 rounded-[14px] font-bold text-primary bg-primary/5 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        สูงสุด
                      </button>
                    </div>

                    {!canInvest && project && (
                      <p className="text-sm font-medium text-error">โปรเจกต์นี้ปิดรับการลงทุนแล้ว หรือยอดคงเหลือต่ำกว่าขั้นต่ำ</p>
                    )}

                    <div className="bg-surface-soft rounded-[24px] p-6 border border-border/40">
                      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-primary" /> สรุปรายการ
                      </h4>
                      <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>ลงทุน</span>
                          <span className="font-bold text-foreground">฿{(parsedAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>ค่าธรรมเนียมแพลตฟอร์ม</span>
                          <span className="font-bold text-foreground text-error">฿{fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>ภาษีมูลค่าเพิ่ม {(vatRate * 100).toFixed(0)}%(VAT)</span>
                          <span className="font-bold text-foreground text-error">฿{vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground pt-1 italic">
                          <span>มูลค่าที่โปรเจกต์จะได้รับ</span>
                          <span className="font-bold text-success/80">฿{investedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="pt-4 border-t border-border/50 flex justify-between items-center">
                          <span className="font-bold text-foreground">ยอดชำระรวม</span>
                          <span className="font-black text-primary text-2xl">฿{(parsedAmount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleNextStep2}
                      disabled={!canInvest}
                      className="w-full py-3.5 bg-primary text-white-foreground rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ดำเนินการชำระเงิน
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment UI */}
              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="flex flex-col items-center py-2">

                    {/* PromptPay QR Card */}
                    <div className="w-full max-w-[300px] rounded-2xl overflow-hidden shadow-xl border border-border">

                      {/* ── Header: THAI QR PAYMENT ── */}
                      <div className="bg-[#1a3a6b] px-4 py-3 flex items-center gap-3">
                        <div className="bg-white rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1a3a6b]">
                            <path d="M12 2L2 7h20L12 2zM4 9v9h2V9H4zm5 0v9h2V9H9zm4 0v9h2V9h-2zm5 0v9h2V9h-2zM2 20h20v2H2z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-black text-[12px] tracking-widest uppercase leading-none">THAI QR PAYMENT</p>
                        </div>
                      </div>

                      {/* ── PromptPay label ── */}
                      <div className="bg-white pt-4 pb-3 flex items-center justify-center">
                        <p className="text-[#003f9c] font-black text-[14px] tracking-wide">ชำระผ่าน PromptPay</p>
                      </div>

                      {/* ── QR Code ── */}
                      <div className="bg-white px-5 pb-3">
                        <div className="border border-[#1a3a6b]/15 rounded-xl overflow-hidden p-2 bg-white">
                          <img
                            src={investmentData?.qr_code_base64 || investmentData?.qr_code_image_url || '/img-payment-qr.png'}
                            alt="PromptPay QR Code"
                            className="w-full object-contain aspect-square"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2040%2040%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23f9fafb%22%2F%3E%3Crect%20x%3D%222%22%20y%3D%222%22%20width%3D%2214%22%20height%3D%2214%22%20rx%3D%222%22%20fill%3D%22none%22%20stroke%3D%22%231a3a6b%22%20stroke-width%3D%222%22%2F%3E%3Crect%20x%3D%225%22%20y%3D%225%22%20width%3D%228%22%20height%3D%228%22%20rx%3D%221%22%20fill%3D%22%231a3a6b%22%2F%3E%3Crect%20x%3D%2224%22%20y%3D%222%22%20width%3D%2214%22%20height%3D%2214%22%20rx%3D%222%22%20fill%3D%22none%22%20stroke%3D%22%231a3a6b%22%20stroke-width%3D%222%22%2F%3E%3Crect%20x%3D%2227%22%20y%3D%225%22%20width%3D%228%22%20height%3D%228%22%20rx%3D%221%22%20fill%3D%22%231a3a6b%22%2F%3E%3Crect%20x%3D%222%22%20y%3D%2224%22%20width%3D%2214%22%20height%3D%2214%22%20rx%3D%222%22%20fill%3D%22none%22%20stroke%3D%22%231a3a6b%22%20stroke-width%3D%222%22%2F%3E%3Crect%20x%3D%225%22%20y%3D%2227%22%20width%3D%228%22%20height%3D%228%22%20rx%3D%221%22%20fill%3D%22%231a3a6b%22%2F%3E%3C%2Fsvg%3E';
                            }}
                          />
                        </div>
                      </div>

                      {/* ── Merchant + Amount ── */}
                      <div className="bg-white px-5 pb-4 text-center space-y-0.5">
                        <p className="font-black text-[#1a3a6b] text-[15px] tracking-widest uppercase">FLYUP</p>
                        <p className="font-bold text-foreground text-[20px]">
                          {(investmentData?.total_amount || parsedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB
                        </p>
                      </div>

                      {/* ── Detail rows ── */}
                      <div className="bg-[#f5f7fa] border-t border-border px-5 py-3 space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">โปรเจกต์</span>
                          <span className="font-semibold text-foreground text-right max-w-[60%] truncate">{projectTitle}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">ผู้สนับสนุน</span>
                          <span className="font-semibold text-foreground text-right max-w-[60%] truncate">{userName}</span>
                        </div>
                        {investmentData?.reference_number && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Ref</span>
                            <span className="font-mono text-muted-foreground">{investmentData.reference_number}</span>
                          </div>
                        )}
                      </div>

                      {/* ── Status bar ── */}
                      <div className="bg-[#1a3a6b] px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Loader2 size={12} className="animate-spin text-blue-200" />
                          <span className="text-blue-200 text-[10px]">รอการชำระเงิน...</span>
                        </div>
                        <div>
                          <span className="text-blue-200 text-[10px]">หมดอายุใน </span>
                          <span className="text-white font-bold text-[12px]">{formatTime(timeLeft)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Save QR Code */}
                    <button
                      onClick={handleSaveQrCode}
                      disabled={isSavingQr}
                      className="w-full max-w-[300px] flex items-center justify-center gap-2 py-2.5 mt-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingQr ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      {isSavingQr ? 'กำลังบันทึก...' : 'บันทึก QR Code'}
                    </button>

                    {/* Escrow badge */}
                    <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full font-semibold mt-4">
                      <ShieldCheck size={14} /> ปลอดภัยด้วยระบบ Escrow
                    </div>

                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Step 4: Success */
          <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-700">
            <div className="bg-card w-full max-w-lg rounded-[32px] p-8 sm:p-12 shadow-2xl border border-white/50 text-center relative overflow-hidden backdrop-blur-sm bg-white/95">
              <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={50} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2 text-transparent bg-clip-text bg-[image:var(--gradient-primary)]">การลงทุนสำเร็จ!</h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 px-4">
                ขอบคุณที่ร่วมสนับสนุนโปรเจกต์ของนักศึกษา ระบบได้ส่งหลักฐานการยืนยันไปยังอีเมลของคุณเรียบร้อยแล้ว
              </p>

              <div className="bg-muted/50 rounded-2xl p-4 border border-border/50 text-left mb-8 space-y-2.5 text-sm mx-auto max-w-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ยอดลงทุน</span>
                  <span className="font-bold text-foreground">฿{parsedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">โปรเจกต์</span>
                  <span className="font-bold text-primary">{projectTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ส่วนแบ่งกำไร</span>
                  <span className="font-bold text-foreground">{revenueShare}%</span>
                </div>
              </div>

              <button
                onClick={() => navigate(`/projects/${slug}`)}
                className="w-full py-4 bg-primary text-white-foreground rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/30 uppercase tracking-widest text-sm cursor-pointer"
              >
                กลับสู่หน้าโปรเจกต์
              </button>

              {completedInvestmentId && (
                <button
                  onClick={handleDownloadContract}
                  disabled={isPrintingPDF}
                  className="w-full mt-3 py-3.5 bg-background hover:bg-muted border border-border text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isPrintingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {isPrintingPDF ? 'กำลังเตรียม PDF...' : 'ดาวน์โหลดสัญญา (PDF)'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Investment;
