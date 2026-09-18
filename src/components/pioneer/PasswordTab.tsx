import { useState } from "react";
import { Lock, Eye, EyeOff, CheckCircle, Circle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import { unicodeLength, utf8ByteLength } from "../../lib/validation";

const PasswordTab = () => {
  const { authUser, addPassword, changePassword, isSavingPassword } = useAuthStore();
  // Fallback when backend doesn't send has_password: assume Google-only users
  // (google_sub set, no has_password field) still need to set a password.
  const hasPassword = authUser?.has_password ?? !authUser?.google_sub;
  const hasGoogleSub = !!authUser?.google_sub;
  const isSettingPassword = !hasPassword && hasGoogleSub;

  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const newPass = form.newPass;
  const checks = [
    { label: "ตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว", ok: /[A-Z]/.test(newPass) },
    { label: "พิมพ์เล็ก 1 ตัว", ok: /[a-z]/.test(newPass) },
    { label: "ตัวเลข 1 ตัว", ok: /[0-9]/.test(newPass) },
    { label: "อักษรพิเศษ 1 ตัว", ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(newPass) },
    { label: "8 ตัวอักษรขึ้นไป", ok: unicodeLength(newPass) >= 8 },
    { label: "ไม่เกิน 72 ไบต์ UTF-8", ok: utf8ByteLength(newPass) <= 72 },
  ];
  const allChecksPass = checks.every((c) => c.ok);

  const handleSubmit = async () => {
    if (!allChecksPass) {
      toast.error("รหัสผ่านใหม่ยังไม่ผ่านเงื่อนไขที่กำหนด");
      return;
    }
    if (form.newPass !== form.confirm) {
      toast.error("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    const ok = isSettingPassword
      ? await addPassword(form.newPass)
      : await changePassword(form.current, form.newPass);
    if (ok) setForm({ current: "", newPass: "", confirm: "" });
  };

  const fields: { key: keyof typeof form; label: string }[] = isSettingPassword
    ? [
        { key: "newPass", label: "รหัสผ่านใหม่" },
        { key: "confirm", label: "ยืนยันรหัสผ่านใหม่" },
      ]
    : [
        { key: "current", label: "รหัสผ่านปัจจุบัน" },
        { key: "newPass", label: "รหัสผ่านใหม่" },
        { key: "confirm", label: "ยืนยันรหัสผ่านใหม่" },
      ];

  const title = isSettingPassword ? "ตั้งรหัสผ่าน" : "เปลี่ยนรหัสผ่าน";

  return (
    <div className="bg-white border border-border rounded-[16px] p-[24px] flex flex-col gap-[20px]">
      <div className="flex items-center gap-[8px]">
        <Lock size={18} className="text-foreground" />
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>

      {isSettingPassword && (
        <p className="text-[13px] text-muted-foreground -mt-[8px]">
          บัญชีของคุณใช้ Google เข้าสู่ระบบ คุณสามารถตั้งรหัสผ่านเพื่อใช้เข้าสู่ระบบด้วยอีเมลได้
        </p>
      )}

      {fields.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-foreground">{label}</label>
          <div className="relative">
            <input
              data-testid={`password-input-${key}`}
              name={key}
              type={show[key] ? "text" : "password"}
              value={form[key]}
              onChange={handleChange}
              className="w-full border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors pr-[40px]"
            />
            <button
              type="button"
              onClick={() => setShow((prev) => ({ ...prev, [key]: !prev[key] }))}
              className="absolute right-[12px] top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {show[key] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {key === "newPass" && newPass.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[10px] gap-y-[6px] mt-[4px] bg-muted/30 p-[12px] rounded-[8px] border border-border/50">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-[6px]">
                  {c.ok ? (
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                  ) : (
                    <Circle size={14} className="text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={`text-[12px] leading-tight ${
                      c.ok ? "text-green-500" : "text-muted-foreground"
                    }`}
                  >
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        data-testid="password-submit-btn"
        onClick={handleSubmit}
        disabled={isSavingPassword}
        className="w-full bg-primary hover:bg-primary-hover text-white py-[12px] rounded-[10px] text-[14px] font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-[8px]"
      >
        <Lock size={16} />
        {isSavingPassword ? "กำลังบันทึก..." : title}
      </button>
    </div>
  );
};

export default PasswordTab;
