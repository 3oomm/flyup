import { useState, useEffect, useMemo } from "react";
import { Lock, Upload, Clock, CheckCircle, XCircle, Pencil, X, Save, Loader2, Plus, Star } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useSelfVerificationStore } from "../../store/useSelfVerificationStore";
import toast from "react-hot-toast";
import KycDeviceChooser from "../verification/KycDeviceChooser";
import BoosterTermsModal from "./BoosterTermsModal";

const THAI_BANKS = [
  "ธนาคารกรุงเทพ (BBL)",
  "ธนาคารกสิกรไทย (KBANK)",
  "ธนาคารกรุงไทย (KTB)",
  "ธนาคารไทยพาณิชย์ (SCB)",
  "ธนาคารกรุงศรีอยุธยา (BAY)",
  "ธนาคารทหารไทยธนชาต (TTB)",
  "ธนาคารออมสิน",
  "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)",
  "ธนาคารอาคารสงเคราะห์ (GHB)",
  "ธนาคารซีไอเอ็มบีไทย (CIMB)",
  "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)",
  "ธนาคารยูโอบี (UOB)",
];

const SELECT_STYLE = "border border-border rounded-[8px] px-[12px] py-[10px] pr-[32px] text-[14px] outline-none focus:border-primary transition-colors bg-white cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center]";
const INPUT_STYLE = "border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors";

type BankFormState = { bank_name: string; account_name: string; account_number: string };

const sanitizeAccountName = (value: string) =>
  value.replace(/[^\p{L}\p{M}\s]/gu, "").slice(0, 30);

const BankFormFields = ({ form, setForm }: { form: BankFormState; setForm: React.Dispatch<React.SetStateAction<BankFormState>> }) => (
  <div className="flex flex-col gap-[12px]">
    <div className="flex flex-col gap-[6px]">
      <label className="text-[13px] font-medium text-foreground">ธนาคาร <span className="text-error">*</span></label>
      <select value={form.bank_name} onChange={(e) => setForm(p => ({ ...p, bank_name: e.target.value }))} className={SELECT_STYLE}>
        <option value="">-- เลือกธนาคาร --</option>
        {THAI_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
    </div>
    <div className="flex flex-col gap-[6px]">
      <label className="text-[13px] font-medium text-foreground">ชื่อบัญชี <span className="text-error">*</span></label>
      <input value={form.account_name} onChange={(e) => setForm(p => ({ ...p, account_name: sanitizeAccountName(e.target.value) }))} maxLength={30} required className={INPUT_STYLE} />
    </div>
    <div className="flex flex-col gap-[6px]">
      <label className="text-[13px] font-medium text-foreground">เลขบัญชี <span className="text-error">*</span></label>
      <input value={form.account_number} onChange={(e) => setForm(p => ({ ...p, account_number: e.target.value.replace(/\D/g, '').slice(0, 15) }))} inputMode="numeric" minLength={8} maxLength={15} pattern="[0-9]{8,15}" required className={INPUT_STYLE} />
      <span className="text-[11px] text-muted-foreground">กรอกตัวเลข 8–15 หลัก</span>
    </div>
  </div>
);

const BoosterVerifyTab = () => {
  const { authUser, checkAuth } = useAuthStore();
  const { uploadVerificationDocument, submitIdVerify, addBankAccount, updateBankAccount, setDefaultBankAccount } = useSelfVerificationStore();

  const idCardVerify = authUser?.id_card_verification;
  const storedIdCardUrl: string = idCardVerify?.document ?? "";
  const storedSelfieUrl: string = idCardVerify?.selfie_url ?? "";

  const idCardStatus = idCardVerify?.status ?? "";
  const idCardApproved = idCardStatus === "approved";
  const idCardPending = idCardStatus === "pending";
  const idCardRejected = idCardStatus === "rejected";
  const idCardLocked = idCardApproved || idCardPending;

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const emptyBankForm = { bank_name: "", account_name: "", account_number: "" };
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyBankForm);
  const [isSavingAdd, setIsSavingAdd] = useState(false);
  const [editingBankId, setEditingBankId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyBankForm);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(idCardLocked);
  const [acceptAccuracy, setAcceptAccuracy] = useState(idCardLocked);
  const [isSavingVerify, setIsSavingVerify] = useState(false);
  const [deviceChosen, setDeviceChosen] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (idCardVerify?.status) {
      setAcceptTerms(true);
      setAcceptAccuracy(true);
    }
  }, [authUser, idCardVerify?.status]);

  const baseRequired = {
    first_name: (authUser?.first_name as string) ?? "",
    last_name: (authUser?.last_name as string) ?? "",
    phone: (authUser?.phone as string) ?? "",
  };

  const handleVerifySubmit = async () => {
    if (!baseRequired.first_name || !baseRequired.last_name || !baseRequired.phone) {
      toast.error("กรุณากรอกข้อมูลส่วนตัว (ชื่อ นามสกุล เบอร์โทร) ในแท็บโปรไฟล์ก่อน");
      return;
    }
    if (!idCardFile && !storedIdCardUrl) {
      toast.error("กรุณาอัปโหลดบัตรประชาชน");
      return;
    }
    if (!selfieFile && !storedSelfieUrl) {
      toast.error("กรุณาอัปโหลดรูปเซลฟี่พร้อมบัตรประชาชน");
      return;
    }
    if (!acceptTerms || !acceptAccuracy) {
      toast.error("กรุณายอมรับข้อตกลงก่อน");
      return;
    }
    setIsSavingVerify(true);
    try {
      let idCardUrl = storedIdCardUrl;
      if (idCardFile) {
        const url = await uploadVerificationDocument(idCardFile);
        if (!url) return;
        idCardUrl = url;
      }

      let selfieUrl = storedSelfieUrl;
      if (selfieFile) {
        const url = await uploadVerificationDocument(selfieFile);
        if (!url) return;
        selfieUrl = url;
      }

      if (!idCardLocked) {
        const status = await submitIdVerify({
          id_card_url: idCardUrl,
          selfie_url: selfieUrl,
          declare_truth: acceptAccuracy,
        });
        if (!status) return;
        toast.success(status === "approved" ? "ยืนยันตัวตนสำเร็จ ระบบอนุมัติอัตโนมัติ" : "ส่งข้อมูลยืนยันตัวตนแล้ว รอ admin อนุมัติ");
      }
    } finally {
      setIsSavingVerify(false);
    }
  };

  const handleAddBank = async () => {
    if (!addForm.bank_name || !addForm.account_name.trim() || !addForm.account_number) {
      toast.error("กรุณากรอกข้อมูลให้ครบ"); return;
    }
    if (addForm.account_name.trim().length > 30) {
      toast.error("ชื่อบัญชีต้องไม่เกิน 30 ตัวอักษร"); return;
    }
    if (addForm.account_number.length < 8 || addForm.account_number.length > 15) {
      toast.error("เลขบัญชีต้องมี 8–15 หลัก"); return;
    }
    setIsSavingAdd(true);
    try {
      const ok = await addBankAccount(addForm);
      if (ok) {
        setAddForm(emptyBankForm);
        setShowAddForm(false);
      }
    } finally { setIsSavingAdd(false); }
  };

  const handleEditBank = async (id: number) => {
    if (!editForm.bank_name || !editForm.account_name.trim() || !editForm.account_number) {
      toast.error("กรุณากรอกข้อมูลให้ครบ"); return;
    }
    if (editForm.account_name.trim().length > 30) {
      toast.error("ชื่อบัญชีต้องไม่เกิน 30 ตัวอักษร"); return;
    }
    if (editForm.account_number.length < 8 || editForm.account_number.length > 15) {
      toast.error("เลขบัญชีต้องมี 8–15 หลัก"); return;
    }
    setIsSavingEdit(true);
    try {
      const ok = await updateBankAccount(id, editForm);
      if (ok) setEditingBankId(null);
    } finally { setIsSavingEdit(false); }
  };

  const handleSetDefault = async (id: number) => {
    setSettingDefaultId(id);
    try {
      await setDefaultBankAccount(id);
    } finally { setSettingDefaultId(null); }
  };

  const idCardPreview = useMemo(
    () => idCardFile ? URL.createObjectURL(idCardFile) : storedIdCardUrl || null,
    [idCardFile, storedIdCardUrl]
  );

  const selfiePreview = useMemo(
    () => selfieFile ? URL.createObjectURL(selfieFile) : storedSelfieUrl || null,
    [selfieFile, storedSelfieUrl]
  );

  const uploadBorderClass = (approved: boolean, pending: boolean, rejected: boolean, locked: boolean) =>
    `border-2 border-dashed rounded-xl overflow-hidden transition-colors block
      ${approved ? "border-green-300" : pending ? "border-amber-300" : rejected ? "border-red-300" : "border-border"}
      ${locked ? "cursor-default" : "cursor-pointer hover:border-primary"}`;

  return (
    <div className="flex flex-col gap-[16px]">
      {!idCardLocked && !deviceChosen && (
        <KycDeviceChooser
          onComputer={() => setDeviceChosen(true)}
          onCompleted={async () => { await checkAuth(); setDeviceChosen(true); }}
          liveOnly
        />
      )}
      {/* ยืนยันตัวตน */}
      <div className={`${!idCardLocked && !deviceChosen ? "hidden" : ""} bg-white border border-border rounded-[16px] p-[24px] flex flex-col gap-[20px]`}>
        <div className="flex items-center gap-[8px]">
          <Lock size={18} className="text-foreground" />
          <h2 className="font-semibold text-foreground">ยืนยันตัวตน</h2>
          {idCardApproved && (
            <span className="ml-auto flex items-center gap-[4px] text-[12px] text-green-600 bg-green-50 border border-green-200 px-[10px] py-[2px] rounded-full font-medium">
              <CheckCircle size={12} />
              อนุมัติแล้ว
            </span>
          )}
          {idCardRejected && (
            <span className="ml-auto flex items-center gap-[4px] text-[12px] text-red-600 bg-red-50 border border-red-200 px-[10px] py-[2px] rounded-full font-medium">
              <XCircle size={12} />
              ถูกปฏิเสธ
            </span>
          )}
          {!idCardApproved && !idCardRejected && idCardPending && (
            <span className="ml-auto flex items-center gap-[4px] text-[12px] text-amber-600 bg-amber-50 border border-amber-200 px-[10px] py-[2px] rounded-full font-medium">
              <Clock size={12} />
              รออนุมัติ
            </span>
          )}
        </div>

        {/* อัปโหลดบัตรประชาชน */}
        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-foreground">
            อัปโหลดบัตรประชาชน <span className="text-error">*</span>
          </label>
          <div className="relative">
            <label className={uploadBorderClass(idCardApproved, idCardPending, idCardRejected, idCardLocked)}>
              {idCardPreview ? (
                <img src={idCardPreview} alt="บัตรประชาชน" className="w-full max-h-[200px] object-contain" />
              ) : (
                <div className="p-8 flex flex-col items-center justify-center">
                  <Upload size={24} className="text-muted-foreground mb-2" />
                  <span className="text-[13px] text-muted-foreground">คลิกเพื่ออัปโหลด</span>
                </div>
              )}
              <input
                data-testid="verify-idcard-input"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                disabled={idCardLocked}
                onChange={(e) => setIdCardFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {idCardApproved && (
              <div className="absolute inset-0 rounded-xl bg-green-50/80 flex flex-col items-center justify-center pointer-events-none">
                <CheckCircle size={32} className="text-green-500" />
                <span className="text-green-600 font-semibold text-[13px] mt-[6px]">อนุมัติแล้ว</span>
              </div>
            )}
            {idCardPending && (
              <div className="absolute inset-0 rounded-xl bg-amber-50/70 flex flex-col items-center justify-center pointer-events-none">
                <Clock size={32} className="text-amber-500" />
                <span className="text-amber-600 font-semibold text-[13px] mt-[6px]">รออนุมัติ</span>
              </div>
            )}
            {idCardRejected && (
              <div className="absolute top-[8px] right-[8px] pointer-events-none">
                <span className="flex items-center gap-[4px] text-[11px] bg-red-100 text-red-600 border border-red-200 px-[8px] py-[3px] rounded-full font-medium">
                  <XCircle size={11} /> ถูกปฏิเสธ — อัปโหลดใหม่
                </span>
              </div>
            )}
          </div>
        </div>

        {/* รูปเซลฟี่พร้อมบัตรประชาชน */}
        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-foreground">
            รูปเซลฟี่พร้อมบัตรประชาชน <span className="text-error">*</span>
          </label>
          <p className="text-[12px] text-muted-foreground">ถ่ายรูปหน้าตัวเองพร้อมถือบัตรประชาชนให้เห็นชัดเจน</p>
          <div className="relative">
            <label className={uploadBorderClass(idCardApproved, idCardPending, idCardRejected, idCardLocked)}>
              {selfiePreview ? (
                <img src={selfiePreview} alt="เซลฟี่พร้อมบัตรประชาชน" className="w-full max-h-[200px] object-contain" />
              ) : (
                <div className="p-8 flex flex-col items-center justify-center">
                  <Upload size={24} className="text-muted-foreground mb-2" />
                  <span className="text-[13px] text-muted-foreground">คลิกเพื่ออัปโหลด</span>
                </div>
              )}
              <input
                data-testid="verify-selfie-input"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={idCardLocked}
                onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {idCardApproved && (
              <div className="absolute inset-0 rounded-xl bg-green-50/80 flex flex-col items-center justify-center pointer-events-none">
                <CheckCircle size={32} className="text-green-500" />
                <span className="text-green-600 font-semibold text-[13px] mt-[6px]">อนุมัติแล้ว</span>
              </div>
            )}
            {idCardPending && (
              <div className="absolute inset-0 rounded-xl bg-amber-50/70 flex flex-col items-center justify-center pointer-events-none">
                <Clock size={32} className="text-amber-500" />
                <span className="text-amber-600 font-semibold text-[13px] mt-[6px]">รออนุมัติ</span>
              </div>
            )}
            {idCardRejected && (
              <div className="absolute top-[8px] right-[8px] pointer-events-none">
                <span className="flex items-center gap-[4px] text-[11px] bg-red-100 text-red-600 border border-red-200 px-[8px] py-[3px] rounded-full font-medium">
                  <XCircle size={11} /> ถูกปฏิเสธ — อัปโหลดใหม่
                </span>
              </div>
            )}
          </div>
        </div>

        {/* checkboxes */}
        <div className="flex flex-col gap-[10px]">
          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              aria-label="ยอมรับข้อตกลงของ FlyUp Booster"
              onClick={() => !idCardLocked && (acceptTerms ? setAcceptTerms(false) : setShowTermsModal(true))}
              className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${acceptTerms ? "bg-primary border-primary" : "border-border"} ${idCardLocked ? "cursor-default" : "cursor-pointer"}`}
            >
              {acceptTerms && <span className="text-white text-[10px] font-bold">✓</span>}
            </button>
            <span className="text-[13px] text-foreground">
              ยอมรับ
              <button type="button" onClick={() => setShowTermsModal(true)} className="mx-1 font-medium text-primary underline underline-offset-2 hover:text-primary-hover cursor-pointer">
                ข้อตกลงและนโยบาย PDPA
              </button>
              ของ FlyUp Booster
            </span>
          </div>
          <label className={`flex items-center gap-[10px] ${idCardLocked ? "cursor-default" : "cursor-pointer"}`}>
            <div
              onClick={() => !idCardLocked && setAcceptAccuracy(!acceptAccuracy)}
              className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${acceptAccuracy ? "bg-primary border-primary" : "border-border"} ${idCardLocked ? "cursor-default" : "cursor-pointer"}`}
            >
              {acceptAccuracy && <span className="text-white text-[10px] font-bold">✓</span>}
            </div>
            <span className="text-[13px] text-foreground">ข้าพเจ้ายืนยันว่าข้อมูลทั้งหมดเป็นความจริง</span>
          </label>
        </div>

        {!idCardLocked && (
          <button
            data-testid="verify-submit-btn"
            onClick={handleVerifySubmit}
            disabled={isSavingVerify}
            className="w-full bg-primary hover:bg-primary-hover text-white py-[12px] rounded-[10px] text-[14px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSavingVerify ? "กำลังส่ง..." : "ยืนยันตัวตน"}
          </button>
        )}

        {idCardLocked && (
          <div className={`w-full py-[12px] rounded-[10px] text-[14px] font-medium text-center ${idCardApproved ? "bg-green-50 text-green-600 border border-green-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
            {idCardApproved ? "✓ ยืนยันตัวตนสำเร็จ" : "⏳ รอ admin อนุมัติ"}
          </div>
        )}
      </div>

      {showTermsModal && (
        <BoosterTermsModal
          locked={idCardLocked}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setAcceptTerms(true);
            setShowTermsModal(false);
          }}
        />
      )}

      {/* ยืนยันบัญชี */}
      <div className="bg-white border border-border rounded-[16px] p-[24px] flex flex-col gap-[16px]">
        <div className="flex items-center gap-[8px]">
          <Lock size={18} className="text-foreground" />
          <h2 className="font-semibold text-foreground">ยืนยันบัญชี</h2>
          <button
            data-testid="bank-add-open-btn"
            onClick={() => { setShowAddForm(true); setEditingBankId(null); }}
            className="ml-auto flex items-center gap-[6px] px-[12px] py-[6px] rounded-[8px] bg-primary hover:bg-primary-hover text-white text-[13px] font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> เพิ่มบัญชี
          </button>
        </div>

        {(authUser?.bank_accounts ?? []).length === 0 && !showAddForm && (
          <p className="text-[13px] text-muted-foreground text-center py-[8px]">ยังไม่มีบัญชีธนาคาร</p>
        )}

        {(authUser?.bank_accounts ?? []).map((acc) => (
          <div key={acc.id} className="border border-border rounded-[12px] p-[16px] flex flex-col gap-[12px]">
            {editingBankId === acc.id ? (
              <>
                <BankFormFields form={editForm} setForm={setEditForm} />
                <div className="flex gap-[8px] justify-end">
                  <button data-testid="bank-edit-cancel-btn" onClick={() => setEditingBankId(null)} disabled={isSavingEdit} className="flex items-center gap-[6px] px-[14px] py-[8px] rounded-[8px] border border-border text-[13px] font-medium hover:bg-surface-hover transition-colors disabled:opacity-50 cursor-pointer">
                    <X size={13} /> ยกเลิก
                  </button>
                  <button data-testid="bank-edit-save-btn" onClick={() => handleEditBank(acc.id!)} disabled={isSavingEdit} className="flex items-center gap-[6px] px-[14px] py-[8px] rounded-[8px] bg-primary hover:bg-primary-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50 cursor-pointer">
                    {isSavingEdit ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {isSavingEdit ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between gap-[12px]">
                <div className="flex flex-col gap-[4px] flex-1 min-w-0">
                  <div className="flex items-center gap-[6px]">
                    <span className="text-[14px] font-semibold text-foreground">{acc.bank_name}</span>
                    {acc.is_default && (
                      <span className="flex items-center gap-[3px] text-[11px] text-yellow-600 bg-yellow-50 border border-yellow-200 px-[8px] py-[2px] rounded-full font-medium">
                        <Star size={10} fill="currentColor" /> บัญชีหลัก
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] text-muted-foreground truncate max-w-full" title={acc.account_name}>{acc.account_name}</span>
                  <span className="text-[13px] text-muted-foreground">{acc.account_number}</span>
                </div>
                <div className="flex items-center gap-[6px] flex-shrink-0">
                  {!acc.is_default && (
                    <button
                      data-testid={`bank-set-default-btn-${acc.id}`}
                      onClick={() => handleSetDefault(acc.id!)}
                      disabled={settingDefaultId === acc.id}
                      className="flex items-center gap-[5px] px-[10px] py-[6px] rounded-[8px] border border-border text-[12px] font-medium text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {settingDefaultId === acc.id ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} />}
                      ตั้งเป็นหลัก
                    </button>
                  )}
                  <button
                    data-testid={`bank-edit-open-btn-${acc.id}`}
                    onClick={() => { setEditingBankId(acc.id!); setEditForm({ bank_name: acc.bank_name ?? "", account_name: acc.account_name ?? "", account_number: acc.account_number ?? "" }); setShowAddForm(false); }}
                    className="flex items-center gap-[5px] px-[10px] py-[6px] rounded-[8px] border border-border text-[12px] font-medium text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <Pencil size={12} /> แก้ไข
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {showAddForm && (
          <div className="border border-primary/30 rounded-[12px] p-[16px] flex flex-col gap-[12px] bg-primary/5">
            <p className="text-[13px] font-semibold text-foreground">บัญชีใหม่</p>
            <BankFormFields form={addForm} setForm={setAddForm} />
            <div className="flex gap-[8px] justify-end">
              <button data-testid="bank-add-cancel-btn" onClick={() => { setShowAddForm(false); setAddForm(emptyBankForm); }} disabled={isSavingAdd} className="flex items-center gap-[6px] px-[14px] py-[8px] rounded-[8px] border border-border text-[13px] font-medium hover:bg-surface-hover transition-colors disabled:opacity-50 cursor-pointer">
                <X size={13} /> ยกเลิก
              </button>
              <button data-testid="bank-add-save-btn" onClick={handleAddBank} disabled={isSavingAdd} className="flex items-center gap-[6px] px-[14px] py-[8px] rounded-[8px] bg-primary hover:bg-primary-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50 cursor-pointer">
                {isSavingAdd ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {isSavingAdd ? "กำลังเพิ่ม..." : "เพิ่มบัญชี"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoosterVerifyTab;
