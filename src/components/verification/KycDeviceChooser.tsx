import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, QrCode, Smartphone, X } from "lucide-react";
import QRCode from "qrcode";
import { useSelfVerificationStore, type KycSession } from "../../store/useSelfVerificationStore";
import toast from "react-hot-toast";

export default function KycDeviceChooser({ onCompleted, studentRequired = false }: { onCompleted: () => void; studentRequired?: boolean }) {
  const createKycSession = useSelfVerificationStore((state) => state.createKycSession);
  const getKycSessionStatus = useSelfVerificationStore((state) => state.getKycSessionStatus);
  const [step, setStep] = useState<"choose" | "qr">("choose");
  const [session, setSession] = useState<KycSession | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyMobileLink = async () => {
    if (!session) return;
    await navigator.clipboard.writeText(session.mobile_url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const startMobile = async () => {
    setLoading(true);
    try {
      const data = await createKycSession();
      const mobileUrl = new URL(data.mobile_url);
      if (studentRequired) mobileUrl.searchParams.set("role", "pioneer");
      data.mobile_url = mobileUrl.toString();

      // ถ้าเปิดหน้าโปรไฟล์อยู่บนมือถืออยู่แล้ว ให้เข้ากล้องโดยตรง
      // ไม่ต้องแสดง QR ที่ไม่สามารถสแกนจากอุปกรณ์เครื่องเดียวกันได้
      const isMobileDevice = window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 1024;
      if (isMobileDevice) {
        const cameraUrl = new URL("/mobile-kyc", window.location.origin);
        cameraUrl.searchParams.set("token", data.token);
        if (studentRequired) cameraUrl.searchParams.set("role", "pioneer");
        cameraUrl.searchParams.set("return_to", `${window.location.pathname}${window.location.search}`);
        window.location.assign(cameraUrl.toString());
        return;
      }

      setSession(data);
      setQrDataUrl(await QRCode.toDataURL(data.mobile_url, { width: 280, margin: 1, errorCorrectionLevel: "M" }));
      setStep("qr");
    } catch {
      toast.error("สร้างลิงก์สำหรับมือถือไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== "qr" || !session) return;
    const poll = window.setInterval(async () => {
      try {
        const status = await getKycSessionStatus(session.token);
        if (status === "approved") {
          window.clearInterval(poll);
          toast.success("รับข้อมูลยืนยันตัวตนจากมือถือแล้ว");
          onCompleted();
        }
      } catch { /* session อาจหมดอายุ ปล่อยให้ผู้ใช้สร้างใหม่ */ }
    }, 2500);
    return () => window.clearInterval(poll);
  }, [getKycSessionStatus, onCompleted, session, step]);

  if (step === "choose") return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="mb-5 text-center">
        <h3 className="text-lg font-semibold text-foreground">ยืนยันตัวตนของคุณ</h3>
        <p className="mt-1 text-sm text-muted-foreground">สแกน QR Code เพื่อยืนยันตัวตนด้วยกล้องมือถือ</p>
      </div>
      <div className="grid gap-3">
        <button onClick={startMobile} disabled={loading} className="group flex min-h-36 flex-col items-center justify-center rounded-xl border-2 border-border p-5 transition hover:border-primary hover:bg-primary/5 disabled:opacity-60">
          {loading ? <Loader2 className="mb-3 size-8 animate-spin text-primary" /> : <Smartphone className="mb-3 size-8 text-primary" />}
          <span className="font-semibold">สแกน QR Code</span>
          <span className="mt-1 text-xs text-muted-foreground">สแกน QR Code เพื่อใช้กล้อง</span>
        </button>

      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-white p-6 text-center">
      <button onClick={() => { setStep("choose"); setShowOtherOptions(false); }} className="float-right rounded-full p-1 text-muted-foreground hover:bg-gray-100" aria-label="กลับไปหน้ายืนยันตัวตน"><X size={20} /></button>
      <QrCode className="mx-auto mb-2 size-7 text-primary" />
      <h3 className="text-lg font-semibold">ทำต่อบนมือถือ</h3>
      <p className="mt-1 text-sm text-muted-foreground">สแกน QR Code ด้วยกล้องมือถือ แล้วทำตามขั้นตอนบนหน้าจอ</p>
      {qrDataUrl && <img src={qrDataUrl} alt="QR Code สำหรับยืนยันตัวตนบนมือถือ" className="mx-auto my-5 size-56 rounded-lg border bg-white p-2" />}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" /> กำลังรอข้อมูลจากมือถือ</div>
      <button onClick={() => setShowOtherOptions(value => !value)} aria-expanded={showOtherOptions} className="mt-4 text-sm font-medium text-primary underline underline-offset-4">Other option</button>
      {showOtherOptions && session && (
        <div className="mx-auto mt-4 max-w-md rounded-xl border border-border bg-slate-50 p-3 text-left">
          <p className="mb-2 text-xs text-muted-foreground">หากสแกน QR Code ไม่ได้ ให้ส่งลิงก์นี้ไปเปิดบนมือถือ</p>
          <div className="flex gap-2">
            <input readOnly value={session.mobile_url} className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-xs" onFocus={event => event.currentTarget.select()} />
            <button onClick={copyMobileLink} className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium hover:border-primary">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "คัดลอกแล้ว" : "คัดลอก"}</button>
          </div>
          <a href={session.mobile_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-border bg-white py-2 text-xs font-medium hover:border-primary"><ExternalLink size={14} /> เปิดลิงก์ยืนยันตัวตน</a>
        </div>
      )}
      <button onClick={startMobile} className="mt-4 block w-full text-sm font-medium text-primary hover:underline">สร้าง QR Code ใหม่</button>
    </div>
  );
}
