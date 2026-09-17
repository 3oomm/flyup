import { useState, useRef } from "react";
import { Pencil, Camera, Phone, Mail, MapPin, X, Loader2, Save } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

const BoosterProfileTab = () => {
  const { authUser, uploadAvatar, updateProfile, isUploadingAvatar, isSavingProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: (authUser?.first_name as string) ?? "",
    last_name: (authUser?.last_name as string) ?? "",
    phone: (authUser?.phone as string) ?? "",
    address: (authUser?.address as string) ?? "",
    bio: (authUser?.bio as string) ?? "",
  });
  const [snapshot, setSnapshot] = useState({ ...form });
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
      bio: (authUser.bio as string) ?? "",
    });
  }

  const initials = `${form.first_name[0] ?? ""}${form.last_name[0] ?? ""}`.toUpperCase() || "?";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, phone }));
  };

  const handleEdit = () => {
    setSnapshot({ ...form });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm({ ...snapshot });
    setIsEditing(false);
  };

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    const ok = await updateProfile({
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      address: form.address || undefined,
      bio: form.bio || undefined,
    });
    if (ok) setIsEditing(false);
  };

  const inputCls = isEditing
    ? "border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors w-full"
    : "border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] bg-[#F8F9FA] text-muted-foreground cursor-not-allowed w-full";

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
          <input data-testid="profile-avatar-input" ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{authUser?.first_name as string} {authUser?.last_name as string}</p>
          <p className="text-[13px] text-muted-foreground">{authUser?.email as string}</p>
        </div>
        {!isEditing && (
          <button
            data-testid="profile-edit-btn"
            onClick={handleEdit}
            className="flex items-center gap-[6px] px-[12px] py-[7px] rounded-[8px] border border-border text-[13px] font-medium text-foreground hover:bg-[#F1F3F5] transition-colors cursor-pointer"
          >
            <Pencil size={13} />
            แก้ไขโปรไฟล์
          </button>
        )}
      </div>

      {/* ข้อมูลส่วนตัว */}
      <div className="bg-white border border-border rounded-[16px] p-[24px] flex flex-col gap-[20px]">
        <h2 className="font-semibold text-foreground">ข้อมูลส่วนตัว</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-medium text-foreground">ชื่อ <span className="text-error">*</span></label>
            <input name="first_name" value={form.first_name} onChange={handleChange} disabled={!isEditing} maxLength={30} required className={inputCls} />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-medium text-foreground">นามสกุล <span className="text-error">*</span></label>
            <input name="last_name" value={form.last_name} onChange={handleChange} disabled={!isEditing} maxLength={30} required className={inputCls} />
          </div>
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-foreground flex items-center gap-[6px]">
            <span><Mail size={14} /></span> อีเมล
          </label>
          <input value={(authUser?.email as string) ?? ""} disabled className="border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] bg-[#F8F9FA] text-muted-foreground cursor-not-allowed w-full" />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-foreground flex items-center gap-[6px]">
            <span><Phone size={14} /></span> เบอร์โทรศัพท์ <span className="text-error">*</span>
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handlePhoneChange}
            disabled={!isEditing}
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            pattern="[0-9]{10}"
            required
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-foreground flex items-center gap-[6px]">
            <span><MapPin size={14} /></span> ที่อยู่ <span className="text-error">*</span>
          </label>
          <input name="address" value={form.address} onChange={handleChange} disabled={!isEditing} maxLength={100} required placeholder="เช่น 123 ถนนสุขุมวิท กรุงเทพมหานคร" className={inputCls} />
        </div>
      </div>

      {isEditing && (
        <div className="flex gap-[8px] justify-end">
          <button
            data-testid="profile-cancel-btn"
            onClick={handleCancel}
            disabled={isSavingProfile}
            className="flex items-center gap-[6px] px-[16px] py-[9px] rounded-[8px] border border-border text-[13px] font-medium text-foreground hover:bg-[#F1F3F5] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={14} /> ยกเลิก
          </button>
          <button
            data-testid="profile-save-btn"
            onClick={handleSave}
            disabled={isSavingProfile}
            className="flex items-center gap-[6px] px-[16px] py-[9px] rounded-[8px] bg-primary hover:bg-primary-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSavingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSavingProfile ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      )}
    </div>
  );
};

export default BoosterProfileTab;
