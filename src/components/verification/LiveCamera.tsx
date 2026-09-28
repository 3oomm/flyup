import { useEffect, useRef, useState } from "react";
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
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState("");

  const startCamera = async () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    setStarting(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: mode === "card"
          ? { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: { ideal: CARD_ASPECT_RATIO } }
          : { facingMode: { ideal: facingMode }, width: { ideal: 1080 }, height: { ideal: 1920 }, aspectRatio: { ideal: 0.75 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("เปิดกล้องไม่ได้ กรุณาอนุญาตการใช้กล้องและเปิดหน้านี้ผ่าน HTTPS");
    } finally { setStarting(false); }
  };

  useEffect(() => {
    startCamera();
    return () => streamRef.current?.getTracks().forEach(track => track.stop());
    // เริ่ม stream ใหม่เมื่อเปลี่ยนจากกล้องหลังเป็นกล้องหน้า
  }, [facingMode, mode]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`} />
        {mode === "card" ? (
          <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-white/90" />
        ) : (
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/90" />
        )}
        {starting && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-white"><Loader2 className="size-8 animate-spin" /></div>}
        {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-sm text-white"><p>{error}</p><button onClick={startCamera} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-slate-900"><RefreshCw size={16} /> ลองใหม่</button></div>}
      </div>
      <button onClick={capture} disabled={starting || !!error} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"><Camera size={18} />{label}</button>
    </div>
  );
}
