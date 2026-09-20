import { useEffect, useState } from "react";
import { CheckCircle, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router";
import toast from "react-hot-toast";
import { useSelfVerificationStore } from "../../store/useSelfVerificationStore";
import LiveCamera from "../../components/verification/LiveCamera";
import { useAuthStore } from "../../store/useAuthStore";

export default function MobileKyc() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const requestedReturnTo = params.get("return_to") ?? "";
  const authUser = useAuthStore(state => state.authUser);
  const { uploadVerificationDocument, submitIdVerify } = useSelfVerificationStore();
  const [idCard, setIdCard] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState<"id" | "selfie" | "review">("id");

  const safeReturnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : authUser?.role === "booster"
      ? "/booster/profile"
      : authUser?.role === "pioneer"
        ? "/pioneer/profile"
        : "";

  useEffect(() => {
    if (!done || !safeReturnTo) return;
    const timer = window.setTimeout(() => window.location.replace(safeReturnTo), 1800);
    return () => window.clearTimeout(timer);
  }, [done, safeReturnTo]);

  const submit = async () => {
    if (!token) return toast.error("ลิงก์ยืนยันตัวตนไม่ถูกต้อง");
    if (!idCard || !selfie) return toast.error("กรุณาถ่ายรูปให้ครบทั้ง 2 รายการ");
    setSaving(true);
    try {
      const [idCardUrl, selfieUrl] = await Promise.all([
        uploadVerificationDocument(idCard),
        uploadVerificationDocument(selfie),
      ]);
      if (!idCardUrl || !selfieUrl) return;
      const result = await submitIdVerify({ id_card_url: idCardUrl, selfie_url: selfieUrl, declare_truth: true }, token);
      if (result) setDone(true);
    } finally { setSaving(false); }
  };

  if (done) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm"><CheckCircle className="mx-auto size-14 text-green-500" /><h1 className="mt-4 text-xl font-bold">ส่งข้อมูลสำเร็จ</h1><p className="mt-2 text-sm text-muted-foreground">{safeReturnTo ? "กำลังกลับไปยังหน้าโปรไฟล์..." : "กลับไปที่คอมพิวเตอร์เพื่อดำเนินการต่อได้เลย"}</p>{safeReturnTo && <button onClick={() => window.location.replace(safeReturnTo)} className="mt-5 w-full rounded-xl bg-primary py-3 font-medium text-white">กลับหน้าโปรไฟล์</button>}</div></main>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 py-8">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <ShieldCheck className="mb-3 size-9 text-primary" />
        <h1 className="text-2xl font-bold">ยืนยันตัวตน</h1>
        <p className="mt-1 text-sm text-muted-foreground">ใช้กล้องถ่ายบัตรประชาชนและเซลฟี่แบบสด ไม่รองรับการเลือกรูปจากคลังภาพ</p>
        {!token && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">ลิงก์นี้ไม่ถูกต้อง กรุณาสแกน QR Code ใหม่</p>}
        <div className="mt-6">
          {step === "id" && <><p className="mb-3 text-sm font-semibold">ขั้นตอนที่ 1 จาก 2 — ถ่ายบัตรประชาชน</p><LiveCamera facingMode="environment" label="ถ่ายรูปบัตรประชาชน" onCapture={file => { setIdCard(file); setStep("selfie"); }} /></>}
          {step === "selfie" && <><p className="mb-3 text-sm font-semibold">ขั้นตอนที่ 2 จาก 2 — ถ่ายเซลฟี่พร้อมถือบัตร</p><LiveCamera facingMode="user" label="ถ่ายรูปเซลฟี่" onCapture={file => { setSelfie(file); setStep("review"); }} /></>}
          {step === "review" && idCard && selfie && <div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-2 text-xs font-medium">บัตรประชาชน</p><img src={URL.createObjectURL(idCard)} className="aspect-square w-full rounded-xl object-cover" alt="ภาพบัตรประชาชนที่ถ่าย" /></div>
              <div><p className="mb-2 text-xs font-medium">ภาพเซลฟี่</p><img src={URL.createObjectURL(selfie)} className="aspect-square w-full rounded-xl object-cover" alt="ภาพเซลฟี่ที่ถ่าย" /></div>
            </div>
            <button onClick={() => { setIdCard(null); setSelfie(null); setStep("id"); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium"><RotateCcw size={16} /> ถ่ายใหม่</button>
            <button onClick={submit} disabled={saving || !token} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-white hover:bg-primary-hover disabled:opacity-50">
              {saving && <Loader2 size={18} className="animate-spin" />}{saving ? "กำลังส่งข้อมูล..." : "ยืนยันและส่งข้อมูล"}
            </button>
          </div>}
        </div>
      </div>
    </main>
  );
}
