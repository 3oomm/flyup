import { useState, useRef } from "react";
import { ShieldCheck, Camera, Phone, Mail, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";

const normalizeThaiPhone = (value: string) => {
  const compact = value.trim().replace(/[^\d+]/g, "").replace(/^\+/, "");
  return compact.startsWith("66") && compact.length === 11
    ? `0${compact.slice(2)}`
    : compact;
};

const AdminProfileTab = () => {
  const { authUser, uploadAvatar, updateProfile, isUploadingAvatar, isSavingProfile } = useAuthStore();
  const [form, setForm] = useState({
    first_name: (authUser?.first_name as string) ?? "",
    last_name: (authUser?.last_name as string) ?? "",
    phone: (authUser?.phone as string) ?? "",
    address: (authUser?.address as string) ?? "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // sync ฟอร์มจาก authUser ครั้งแรกที่โหลดเสร็จ (เผื่อ mount ตอน authUser ยังเป็น null)
  // ตั้งค่า state ระหว่าง render ตามแนวทางของ React แทนการใช้ useEffect + setState
  const [hasSyncedForm, setHasSyncedForm] = useState(false);
  if (!hasSyncedForm && authUser) {
    setHasSyncedForm(true);
    setForm({
      first_name: (authUser.first_name as string) ?? "",
      last_name: (authUser.last_name as string) ?? "",
      phone: (authUser.phone as string) ?? "",
      address: (authUser.address as string) ?? "",
    });
  }

  const initials = `${form.first_name[0] ?? ""}${form.last_name[0] ?? ""}`.toUpperCase() || "?";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, phone }));
  };

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const phone = normalizeThaiPhone(form.phone);
    const address = form.address.trim();

    if (!firstName || !lastName) {
      toast.error("กรุณากรอกชื่อและนามสกุล");
      return;
    }
    if (!/^0[689]\d{8}$/.test(phone)) {
      toast.error("กรุณากรอกเบอร์มือถือไทย 10 หลัก เช่น 0812345678");
      return;
    }
    if (!address) {
      toast.error("กรุณากรอกที่อยู่");
      return;
    }

    await updateProfile({
      first_name: firstName,
      last_name: lastName,
      phone,
      address,
    });
  };

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Avatar */}
      <div className="bg-white border border-border rounded-[16px] p-[24px] flex items-center gap-[16px]">
        <div className="relative">
          {authUser?.picture ? (
            <img src={authUser.picture} alt="avatar" className="w-[72px] h-[72px] rounded-full object-cover" />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-primary/20 flex items-center justify-center text-primary text-[22px] font-bold">
              {initials}
            </div>
          )}
          <button
            data-testid="profile-avatar-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute bottom-0 right-0 w-[22px] h-[22px] bg-primary rounded-full flex items-center justify-center disabled:opacity-60 cursor-pointer"
          >
            <Camera size={12} className="text-white" />
          </button>
          <input
            data-testid="profile-avatar-input"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePictureChange}
          />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">
            {authUser?.first_name as string} {authUser?.last_name as string}
          </p>
          <p className="text-[13px] text-muted-foreground">{authUser?.email as string}</p>
          <span className="inline-block mt-[4px] px-[8px] py-[2px] bg-primary/10 text-primary text-[11px] font-medium rounded-full">
            Admin
          </span>
        </div>
      </div>

      {/* ข้อมูลส่วนตัว */}
      <div className="bg-white border border-border rounded-[16px] p-[24px] flex flex-col gap-[20px]">
        <h2 className="font-semibold text-foreground">ข้อมูลส่วนตัว</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-medium text-foreground">
              ชื่อ <span className="text-error">*</span>
            </label>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              maxLength={30}
              required
              className="border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-medium text-foreground">
              นามสกุล <span className="text-error">*</span>
            </label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              maxLength={30}
              required
              className="border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-foreground flex items-center gap-[6px]">
            <Mail size={14} /> อีเมล
          </label>
          <input
            value={(authUser?.email as string) ?? ""}
            disabled
            className="border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] bg-surface-soft text-muted-foreground cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-foreground flex items-center gap-[6px]">
            <Phone size={14} /> เบอร์โทรศัพท์ <span className="text-error">*</span>
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handlePhoneChange}
            inputMode="tel"
            autoComplete="tel"
            maxLength={10}
            pattern="[0-9]{10}"
            required
            placeholder="เช่น 0812345678"
            className="border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors"
          />
          <span className="text-[11px] text-muted-foreground">กรอกตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09</span>
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-foreground flex items-center gap-[6px]">
            <MapPin size={14} /> ที่อยู่ <span className="text-error">*</span>
          </label>
          <textarea
            name="address"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            rows={3}
            maxLength={100}
            required
            autoComplete="street-address"
            placeholder="เช่น 123 ถนนสุขุมวิท กรุงเทพมหานคร"
            className="border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors resize-y"
          />
        </div>

      </div>

      <button
        data-testid="profile-save-btn"
        onClick={handleSave}
        disabled={isSavingProfile}
        className="w-full bg-primary hover:bg-primary-hover text-white py-[12px] rounded-[10px] text-[14px] font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-[8px] cursor-pointer"
      >
        <ShieldCheck size={16} />
        {isSavingProfile ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
      </button>
    </div>
  );
};

export default AdminProfileTab;
