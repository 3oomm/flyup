import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw } from "lucide-react";

type LiveCameraProps = {
  facingMode: "user" | "environment";
  label: string;
  onCapture: (file: File) => void;
  mode?: "card" | "selfie";
};

const CARD_ASPECT_RATIO = 1.586;

export default function LiveCamera({ facingMode, label, onCapture, mode = "selfie" }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const [activeFacingMode, setActiveFacingMode] = useState(facingMode);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState("");

  const startCamera = useCallback(async () => {
    const request = ++requestRef.current;
    streamRef.current?.getTracks().forEach(track => track.stop());
    setStarting(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: mode === "card"
          ? { facingMode: { ideal: activeFacingMode }, width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: { ideal: CARD_ASPECT_RATIO } }
          : { facingMode: { ideal: activeFacingMode }, width: { ideal: 1080 }, height: { ideal: 1920 }, aspectRatio: { ideal: 0.75 } },
        audio: false,
      });
      if (request !== requestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      if (request !== requestRef.current) return;
      setError("เปิดกล้องไม่ได้ กรุณาอนุญาตการใช้กล้องและเปิดหน้านี้ผ่าน HTTPS");
    } finally { if (request === requestRef.current) setStarting(false); }
  }, [activeFacingMode, mode]);

  useEffect(() => {
    const requestCounter = requestRef;
    startCamera();
    return () => {
      ++requestCounter.current;
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
    // เริ่ม stream ใหม่เมื่อเปลี่ยนจากกล้องหลังเป็นกล้องหน้า
  }, [startCamera]);

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    if (mode === "card") {
      const sourceAspectRatio = video.videoWidth / video.videoHeight;
      let sourceWidth = video.videoWidth;
      let sourceHeight = video.videoHeight;

      if (sourceAspectRatio > CARD_ASPECT_RATIO) {
        sourceWidth = video.videoHeight * CARD_ASPECT_RATIO;
      } else {
        sourceHeight = video.videoWidth / CARD_ASPECT_RATIO;
      }

      const sourceX = (video.videoWidth - sourceWidth) / 2;
      const sourceY = (video.videoHeight - sourceHeight) / 2;
      canvas.width = Math.round(sourceWidth);
      canvas.height = Math.round(sourceHeight);
      canvas.getContext("2d")?.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    } else {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
    }
    canvas.toBlob(blob => {
      if (!blob) return;
      onCapture(new File([blob], `kyc-${Date.now()}.jpg`, { type: "image/jpeg" }));
      streamRef.current?.getTracks().forEach(track => track.stop());
    }, "image/jpeg", 0.9);
  };

  return (
    <div>
      <div className={`relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-slate-950 ${mode === "card" ? "aspect-[1.586/1]" : "aspect-[3/4]"}`}>
        <video ref={videoRef} playsInline muted className={`h-full w-full ${mode === "card" ? "object-cover" : "object-contain"}`} />
        {mode === "card" ? (
          <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-white/90" />
        ) : (
          <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-white/90" />
        )}
        {starting && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-white"><Loader2 className="size-8 animate-spin" /></div>}
        {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-sm text-white"><p>{error}</p><button onClick={startCamera} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-slate-900"><RefreshCw size={16} /> ลองใหม่</button></div>}
      </div>
      {mode === "selfie" && <>
        <p className="mt-3 text-sm text-muted-foreground">ให้เห็นใบหน้าและบัตรครบทั้งใบ ไม่บังหน้า ตัวหนังสือบนบัตรต้องอ่านได้ ภาพนี้ไม่กลับซ้าย–ขวา</p>
        <button type="button" disabled={starting} onClick={() => setActiveFacingMode(current => current === "user" ? "environment" : "user")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium disabled:opacity-50"><RefreshCw size={16} /> สลับกล้องหน้า / หลัง</button>
      </>}
      <button onClick={capture} disabled={starting || !!error} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"><Camera size={18} />{label}</button>
    </div>
  );
}
