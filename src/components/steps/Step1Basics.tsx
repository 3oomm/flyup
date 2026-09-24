import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router";
import { ChevronDown, X, ImageIcon, Upload, FileImage, Video, Loader2, Send } from "lucide-react";
import StepNavigation from "../StepNavigation";
import { useProjectStore, type Project } from "../../store/useProjectStore";
import toast from "react-hot-toast";

// backend validator บังคับ description ไม่เกิน 40 ตัวอักษร (PATCH คืน 400 ถ้าเกิน)
const DESCRIPTION_MAX_LENGTH = 40;
const MIN_FUNDING_GOAL = 1_000;

const Step1Basics = () => {
  const { projectId } = useParams();
  const {
    currentProject, updateProjectInfo, updateProject, setSaveStatus, loadCurrentProject,
    fetchCategories, uploadFile, attachProjectMedia, fetchProjectMedia, deleteProjectMedia,
  } = useProjectStore()

  // เปิด/ปิด dropdown เลือกหมวดหมู่
  const [isOpen, setIsOpen] = useState(false)
  // field ตัวเลขที่กำลัง focus อยู่ตอนนี้ (ใช้ตัดสินว่าจะโชว์ raw string หรือ format คอมม่า)
  const [activeField, setActiveField] = useState<string | null>(null)

  // format ตัวเลขเป็น string มีคอมม่า เช่น 10000 -> "10,000"
  const formatNum = (n: number) => n > 0 ? n.toLocaleString('th-TH') : '';
  // แปลง string ที่มีคอมม่ากลับเป็นตัวเลข
  const parseNum = (s: string) => Number(s.replace(/,/g, '')) || 0;
  // เลือกค่าที่จะแสดงใน input: ถ้ากำลังพิมพ์ field นี้อยู่ให้โชว์ raw number, ถ้าไม่ได้ focus ให้โชว์แบบ format แล้ว
  const numVal = (field: string, n: number) => activeField === field ? (n > 0 ? String(n) : '') : formatNum(n);

  // สถานะที่แก้ไขข้อมูลพื้นฐานไม่ได้เลย (backend ปฏิเสธ PATCH ตรงๆ)
  // draft/funding/executing/pending_edit_review แก้ได้หมด — ตอน funding/executing จะเข้าคิวรอ Admin อนุมัติก่อนมีผลจริง
  const NOT_EDITABLE_STATES = ['pending_review', 'closed', 'cancelled', 'suspended', 'pending_cancel'];
  const isLocked = !!currentProject.state && NOT_EDITABLE_STATES.includes(currentProject.state);
  const isPendingEditReview = currentProject.state === 'pending_edit_review';
  // ตอน funding/executing (รวมถึงตอนมีคำขอแก้ไขค้างอยู่แล้ว) ทุกการแก้ไขต้องผ่าน Admin อนุมัติก่อนมีผลจริง
  // เลยไม่ auto-save ทันทีเหมือน draft — เก็บไว้ในฟอร์มก่อน แล้วให้กดปุ่ม "ส่งการแก้ไข" เองทีเดียว
  const isReviewFlow = currentProject.state === 'funding' || currentProject.state === 'executing' || isPendingEditReview;
  // เงื่อนไขการระดมทุน (เป้าหมายเงินทุน, ระยะเวลา, Soft Cap, ส่วนแบ่งกำไร) เป็นข้อตกลงที่ Booster ใช้ตัดสินใจลงทุน
  // ล็อกถาวรทันทีที่พ้น draft ไปแล้ว ไม่ให้แก้ไขอีกเลยแม้จะผ่านระบบขอแก้ไข (ต่างจาก field อื่นในหน้านี้)
  const isFundingLocked = !!currentProject.state && currentProject.state !== 'draft';
  const lockedInputCls = 'border border-border bg-surface-disabled h-[38px] px-[12px] rounded-[6px] text-muted-foreground cursor-not-allowed opacity-70';

  // รายการหมวดหมู่ทั้งหมดที่ดึงมาจาก API สำหรับ dropdown
  const [allCategories, setAllCategories] = useState<{ id: number; name: string }[]>([]);

  // state ฟอร์มฉบับ local ที่ผูกกับ input ตรงๆ (แก้ไขได้ทันทีโดยไม่ต้องรอ API)
  // แล้วค่อย sync ขึ้น store/API ตอน blur ผ่าน handleAutoSave
  const [localData, setLocalData] = useState(() => ({
    title: currentProject.title || '',
    description: currentProject.description || '',
    category: currentProject.category || '',
    categoryId: currentProject.categoryId || 0,
    fundingGoal: currentProject.fundingGoal || 0,
    projectDuration: currentProject.projectDuration || 0,
    softCap: currentProject.softCap || 0,
    campaignDuration: currentProject.campaignDuration || 0,
    revenueShare: currentProject.revenueShare || 0,
    minInvestAmount: currentProject.minInvestAmount || 0,
    maxInvestAmount: currentProject.maxInvestAmount || 0,
  }));

  // baseline ของ localData ที่ "ยืนยันส่งแล้ว" — ใช้เทียบว่ามีอะไรแก้ไว้แล้วยังไม่ได้กดส่งบ้าง (โหมด isReviewFlow)
  const savedSnapshotRef = useRef(localData);
  // รูปปกใหม่ที่เลือกไว้แต่ยังไม่ได้ส่ง (โหมด isReviewFlow เท่านั้น): undefined = ไม่มีการแก้ไข, string = รูปใหม่, null = ลบรูป
  const [pendingCoverImage, setPendingCoverImage] = useState<string | null | undefined>(undefined);
  const [isSendingReview, setIsSendingReview] = useState(false);

  // Sync localData เมื่อ store โหลดข้อมูลจาก API เสร็จ (เช่น เปิดหน้าใหม่หลัง refresh)
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && currentProject.title) {
      hasInitializedRef.current = true;
      setTimeout(() => {
        const loaded = {
          title: currentProject.title,
          description: currentProject.description || '',
          category: currentProject.category || '',
          categoryId: currentProject.categoryId || 0,
          fundingGoal: currentProject.fundingGoal || 0,
          projectDuration: currentProject.projectDuration || 0,
          softCap: currentProject.softCap || 0,
          campaignDuration: currentProject.campaignDuration || 0,
          revenueShare: currentProject.revenueShare || 0,
          minInvestAmount: currentProject.minInvestAmount || 0,
          maxInvestAmount: currentProject.maxInvestAmount || 0,
        };
        setLocalData(loaded);
        savedSnapshotRef.current = loaded;
      }, 0);
    }
  }, [currentProject]);

  // fields ที่ต้องรอ Admin อนุมัติก่อนมีผลจริง (ตรงกับ payload ที่ updateProject ส่งจริง)
  // ไม่รวมกลุ่ม "การระดมทุน" (fundingGoal/softCap/projectDuration/campaignDuration/revenueShare) เพราะล็อกถาวร ไม่ให้แก้เลยหลัง draft
  const REVIEW_DIFF_FIELDS = ['title', 'description', 'categoryId'] as const;
  const hasPendingChanges = isReviewFlow && (
    REVIEW_DIFF_FIELDS.some(f => localData[f] !== savedSnapshotRef.current[f]) ||
    pendingCoverImage !== undefined
  );

  // ส่งข้อมูลที่แก้ไว้ทั้งหมดไปให้ Admin ตรวจสอบทีเดียว (ตอน isReviewFlow จะไม่ auto-save ทีละฟิลด์แล้ว)
  const handleSendForReview = async () => {
    if (!projectId || !hasPendingChanges) return;
    const payload: Partial<Project> = {};
    for (const f of REVIEW_DIFF_FIELDS) {
      if (localData[f] !== savedSnapshotRef.current[f]) (payload as Record<string, unknown>)[f] = localData[f];
    }
    if (pendingCoverImage !== undefined) payload.coverImage = pendingCoverImage ?? '';

    setIsSendingReview(true);
    // updateProject จัดการ toast.error ให้เองอยู่แล้วถ้าพัง (ดู useProjectStore.ts) แค่เช็ค boolean กลับมาว่าจะเคลียร์ draft ไหม
    const ok = await updateProject(Number(projectId), payload);
    if (ok) {
      await loadCurrentProject(Number(projectId)); // ดึง state ใหม่ (เช่น เปลี่ยนเป็น pending_edit_review) มาอัปเดตหน้าจอ
      savedSnapshotRef.current = { ...localData };
      setPendingCoverImage(undefined);
      toast.success('ส่งการแก้ไขให้ Admin ตรวจสอบแล้ว');
    }
    // ถ้าไม่สำเร็จ: เก็บ draft ไว้เหมือนเดิม ให้กดส่งใหม่ได้
    setIsSendingReview(false);
  };

  // resize description textarea เมื่อ localData.description เปลี่ยน (รวมถึงตอน load จาก API)
  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = descriptionRef.current.scrollHeight + 'px';
    }
  }, [localData.description]);

  // โหลดรายการหมวดหมู่ครั้งเดียวตอน mount
  useEffect(() => {
    fetchCategories().then(setAllCategories);
  }, [fetchCategories]);

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const coverImageRef = useRef<HTMLInputElement>(null);
  const additionalImagesRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // แสดงสถานะ "บันทึกแล้ว" ชั่วคราวแล้วเปลี่ยนกลับเป็น idle หลังจาก 2.5 วิ
  const triggerSaved = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  // auto-save field เดี่ยวๆ ตอน blur: เทียบค่าเก่า-ใหม่ก่อน ถ้าไม่เปลี่ยนก็ไม่ยิง request
  // อัปเดต store ทันที (optimistic) แล้วค่อยยิง API ถ้ามี projectId แล้ว (โปรเจกต์ถูกสร้างแล้ว)
  // ตอน isReviewFlow จะไม่ยิง API ทันที — เก็บไว้ในฟอร์มก่อน รอกดปุ่ม "ส่งการแก้ไข" ทีเดียว
  const handleAutoSave = async (field: keyof Project, newValue: string | number) => {
    const oldValue = currentProject?.[field as keyof typeof currentProject];
    const isSame = typeof newValue === 'string'
      ? newValue.trim() === (oldValue as string || '')
      : newValue === oldValue;

    if (isSame) return;

    updateProjectInfo({ [field]: newValue });
    if (isReviewFlow) return;

    setSaveStatus('saving');
    if (projectId) {
      await updateProject(Number(projectId), { [field]: newValue });
    }

    triggerSaved();
  };

  // upload ไฟล์สื่อ (รูป/วิดีโอ) ขึ้น server เป็น 3 ขั้นตอน: upload ไฟล์ -> ผูกกับโปรเจกต์ -> ดึง media list กลับมาเพื่อเอา id ใน DB
  const uploadMediaToServer = async (file: File): Promise<{ url: string; mediaId?: number } | null> => {
    if (!projectId) return null;
    try {
      // Step 1: upload file to Cloudinary via /upload
      const uploaded = await uploadFile(file);
      if (!uploaded?.url || !uploaded.type) return null;

      // Step 2: attach uploaded URL to project
      await attachProjectMedia(projectId, uploaded.url, uploaded.type);

      // Step 3: fetch media list to get the DB id of the newly attached item
      const mediaList = await fetchProjectMedia(projectId);
      const matched = mediaList.find((m) => m.url === uploaded.url);
      return { url: uploaded.url, mediaId: matched?.id };
    } catch (error) {
      console.error('upload media failed:', error);
      return null;
    }
  };

  // เลือกรูปปก: validate type/size -> โชว์ blob preview ทันที -> upload จริงใน background -> แทนที่ด้วย server URL
  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('อนุญาตเฉพาะไฟล์ PNG, JPEG และ WEBP เท่านั้น');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('รูปภาพต้องมีขนาดไม่เกิน 5MB');
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    updateProjectInfo({ coverImage: blobUrl });
    toast.loading('กำลังอัปโหลดรูปปก...', { id: 'upload-cover' });
    try {
      const uploaded = await uploadFile(file);
      const url = uploaded?.url;
      if (!url) throw new Error('no url');
      URL.revokeObjectURL(blobUrl);
      updateProjectInfo({ coverImage: url });
      if (isReviewFlow) {
        setPendingCoverImage(url);
        toast.success('อัปโหลดรูปปกสำเร็จ — กด "ส่งการแก้ไข" เพื่อยืนยัน', { id: 'upload-cover', duration: 3000 });
      } else {
        if (projectId) await updateProject(Number(projectId), { coverImage: url });
        toast.success('อัปโหลดรูปปกสำเร็จ', { id: 'upload-cover', duration: 2000 });
        triggerSaved();
      }
    } catch {
      URL.revokeObjectURL(blobUrl);
      updateProjectInfo({ coverImage: null });
      toast.error('อัปโหลดรูปปกไม่สำเร็จ กรุณาลองใหม่', { id: 'upload-cover' });
    } finally {
      if (coverImageRef.current) coverImageRef.current.value = '';
    }
  };

  // ลบรูปปก ทั้งใน state และยิงอัปเดตขึ้น server (ส่งค่าว่างไปเคลียร์) — ตอน isReviewFlow เก็บไว้ก่อน รอกดส่ง
  const removeCoverImage = async () => {
    updateProjectInfo({ coverImage: null });
    if (isReviewFlow) { setPendingCoverImage(null); return; }
    if (projectId) await updateProject(Number(projectId), { coverImage: '' });
    triggerSaved();
  };

  // เลือกรูปประกอบหลายรูป (สูงสุดรวม 5 รูป): validate type + จำกัดจำนวนที่เหลือ
  // โชว์ blob preview ของทุกไฟล์ก่อน แล้ว upload ทีละไฟล์ใน background
  const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentImages = currentProject?.files || [];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const typeValidFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));

    if (typeValidFiles.length !== files.length) {
      toast.error("อนุญาตเฉพาะไฟล์ PNG, JPEG และ WEBP เท่านั้น");
    }
    const validFiles = typeValidFiles.filter(file => file.size <= 5 * 1024 * 1024);
    if (validFiles.length !== typeValidFiles.length) {
      toast.error("รูปภาพต้องมีขนาดไม่เกิน 5MB");
    }
    if (validFiles.length === 0) return;

    const remainingSlots = 5 - currentImages.length;
    if (remainingSlots <= 0) {
      toast.error("คุณสามารถอัปโหลดได้สูงสุด 5 รูป");
      return;
    }

    const filesToUpload = validFiles.slice(0, remainingSlots);

    // แสดง blob preview ก่อนทันที แล้ว upload ใน background
    const previews = filesToUpload.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      file,
    }));
    updateProjectInfo({ files: [...currentImages, ...previews] });

    // Upload ทีละไฟล์แล้วแทนที่ blob URL ด้วย server URL
    toast.loading(`กำลังอัปโหลดรูปภาพ...`, { id: 'upload-images' })
    for (let i = 0; i < filesToUpload.length; i++) {
      const result = await uploadMediaToServer(filesToUpload[i]);
      if (result) {
        const isStillSelected = useProjectStore
          .getState()
          .currentProject.files
          .some(file => file.url === previews[i].url);

        if (isStillSelected) {
          set_replaceFileUrl(previews[i].url, result.url, filesToUpload[i].name, result.mediaId);
        } else if (result.mediaId) {
          // ผู้ใช้ลบรูปขณะกำลังอัปโหลด จึงลบ media ที่ API เพิ่งสร้างเสร็จด้วย
          await deleteProjectMedia(result.mediaId).catch(console.error);
        }
      }
    }
    toast.success('อัปโหลดรูปภาพสำเร็จ', { id: 'upload-images', duration: 2000 })

    triggerSaved();
    if (additionalImagesRef.current) additionalImagesRef.current.value = "";
  };

  // หลัง upload เสร็จ: เอา server URL + mediaId มาแทนที่ blob URL ตัวเดิมใน currentProject.files
  const set_replaceFileUrl = (blobUrl: string, serverUrl: string, name: string, mediaId?: number) => {
    URL.revokeObjectURL(blobUrl);
    useProjectStore.setState((state) => ({
      currentProject: {
        ...state.currentProject,
        files: state.currentProject.files.map(f =>
          f.url === blobUrl ? { id: mediaId, name, url: serverUrl } : f
        ),
      },
    }));
  };

  // ✅ จัดการวิดีโอ (คลิปเดียว)
  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supportedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!supportedVideoTypes.includes(file.type)) {
      toast.error("รองรับเฉพาะไฟล์ MP4, WebM, OGG, MOV เท่านั้น");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("วิดีโอต้องมีขนาดไม่เกิน 50MB");
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    updateProjectInfo({ video: { name: file.name, url: blobUrl, file } });

    toast.loading('กำลังอัปโหลดวิดีโอ...', { id: 'upload-video' })
    const result = await uploadMediaToServer(file);
    if (result) {
      URL.revokeObjectURL(blobUrl);
      useProjectStore.setState((state) => ({
        currentProject: { ...state.currentProject, video: { id: result.mediaId, name: file.name, url: result.url } },
      }));
      toast.success('อัปโหลดวิดีโอสำเร็จ', { id: 'upload-video', duration: 2000 })
      triggerSaved();
    } else {
      URL.revokeObjectURL(blobUrl);
      updateProjectInfo({ video: null });
      if (videoInputRef.current) videoInputRef.current.value = "";
      toast.error("อัปโหลดวิดีโอไม่สำเร็จ กรุณาลองใหม่", { id: 'upload-video' });
    }
  };

  // ลบรูปประกอบตาม index: revoke blob url, เอาออกจาก state, แล้วลบใน DB ถ้ามี media id แล้ว
  const removeImage = async (index: number) => {
    const currentImages = currentProject?.files || [];
    const targetImage = currentImages[index];
    if (!targetImage) return;

    if (targetImage.url) URL.revokeObjectURL(targetImage.url);
    updateProjectInfo({ files: currentImages.filter((_, i) => i !== index) });

    if (targetImage.id) {
      await deleteProjectMedia(targetImage.id).catch(console.error);
    }
    triggerSaved();
  };

  // ลบวิดีโอ: เคลียร์ state/input ก่อน แล้วลบใน DB ถ้ามี media id แล้ว
  const removeVideo = async () => {
    const vid = currentProject?.video;
    updateProjectInfo({ video: null });
    if (videoInputRef.current) videoInputRef.current.value = "";

    if (vid?.id) {
      await deleteProjectMedia(vid.id).catch(console.error);
    }
    triggerSaved();
  };

  return (
    <div className="flex flex-col gap-[40px] p-[10px]">
      {isPendingEditReview && (
        <div className="flex items-center gap-[10px] px-[16px] py-[12px] rounded-[10px] bg-amber-50 border border-amber-200 text-[13px] text-amber-800">
          <span className="text-[16px] leading-none">⏳</span>
          การแก้ไขล่าสุดกำลังรอ Admin ตรวจสอบ — แก้ไขต่อได้เรื่อยๆ จนกว่า Admin จะอนุมัติหรือปฏิเสธ
        </div>
      )}
      <div className="flex flex-col p-[30px] bg-white-foreground rounded-[12px] gap-[13px]">
        <h1 className="text-foreground text-[24px] font-semibold">ข้อมูลโปรเจกต์</h1>
        <form className="flex flex-col gap-[13px]">
          <div className="flex flex-col gap-[4px]">
            <label className="text-foreground text-[14px]">ชื่อโปรเจกต์ <span className="text-error">*</span></label>
            <input
              data-testid="basics-title-input"
              value={localData.title}
              onBlur={() => !isLocked && handleAutoSave('title', localData.title)}
              onChange={(e) => !isLocked && setLocalData({ ...localData, title: e.target.value.slice(0, 40) })}
              type="text"
              maxLength={40}
              disabled={isLocked}
              className={isLocked ? lockedInputCls : "border border-border bg-background h-[38px] px-[12px] rounded-[6px] focus:outline-none focus:border-primary transition-all duration-200 hover:border-primary/50"} />
            <p className="text-right text-[11px] text-muted-foreground">{localData.title.length}/40</p>
            {isLocked && <p className="text-[11px] text-amber-600">🔒 แก้ไขไม่ได้ในสถานะปัจจุบันของโปรเจกต์</p>}
          </div>
          <p className="text-[12px] text-muted-foreground">*การตั้งชื่อโปรเจกต์ควรเน้นความสั้นและจดจำง่ายในทันที่ เพื่อให้ชื่อโปรเจกต์ของคุณดูโดดเด่นและค้นหาได้รวดเร็ว*</p>
          <div className="flex flex-col gap-[4px]">
            <label className="text-foreground text-[14px]">คำอธิบาย <span className="text-error">*</span></label>
            <textarea
              data-testid="basics-description-input"
              ref={descriptionRef}
              value={localData.description}
              maxLength={DESCRIPTION_MAX_LENGTH}
              onBlur={() => handleAutoSave('description', localData.description)}
              onChange={(e) => {
                setLocalData({ ...localData, description: e.target.value });
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              rows={3}
              className="border border-border bg-background p-[12px] rounded-[8px] focus:outline-none focus:border-primary resize-none transition-all duration-200 hover:border-primary/50 overflow-hidden"
            />
            <p className={`text-[11px] text-right ${localData.description.length >= DESCRIPTION_MAX_LENGTH ? 'text-error' : 'text-muted-foreground'}`}>
              {localData.description.length}/{DESCRIPTION_MAX_LENGTH}
            </p>
          </div>
          <p className="text-[12px] text-muted-foreground">*ส่วนคำอธิบายคือพื้นที่สำหรับสรุปใจความสำคัญในประโยคเดียวว่าโปรเจกต์นี้ทำอะไร เพื่อให้ผู้ที่สนใจเข้าใจเป้าหมายหลักได้ทันทีโดยไม่ต้องอ่านยาว*</p>
          <div className="flex flex-col gap-[8px] relative">
            <label className="text-[14px] text-foreground">หมวดหมู่ <span className="text-error">*</span></label>
            <button
              type="button"
              data-testid="basics-category-dropdown-btn"
              onClick={() => setIsOpen(!isOpen)}
              className={`flex justify-between items-center w-full h-[38px] px-[12px] rounded-[6px] bg-background border transition-all duration-200 cursor-pointer ${isOpen ? 'border-primary' : 'border-border hover:border-primary/50'}`}>
              <span className={`text-[13px] ${localData.category ? 'text-foreground' : 'text-muted-foreground'}`}>{localData.category || 'เลือกหมวดหมู่'}</span>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute top-[70px] left-0 w-full bg-white border border-border rounded-[6px] shadow-lg z-10 overflow-hidden">
                <ul className="max-h-[240px] overflow-y-auto py-1">
                  {allCategories.length === 0 ? (
                    <li className="px-[12px] py-[8px] text-[13px] text-muted-foreground">กำลังโหลด...</li>
                  ) : null}
                  {allCategories.map((cat) => (
                    <li
                      key={cat.id}
                      data-testid={`basics-category-option-${cat.id}`}
                      onClick={() => {
                        setLocalData({ ...localData, category: cat.name, categoryId: cat.id });
                        updateProjectInfo({ category: cat.name, categoryId: cat.id });
                        if (!isReviewFlow && projectId) {
                          updateProject(Number(projectId), { categoryId: cat.id });
                        }
                        setIsOpen(false);
                      }}
                      className={`px-[12px] py-[8px] text-[14px] cursor-pointer transition-colors ${localData.category === cat.name ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-surface-field'}`}>
                      {cat.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground">*เลือกหมวดหมู่ที่ตรงกับประเภทของโปรเจกต์เพื่อให้ระบบแสดงผลในกลุ่มที่ถูกต้องและช่วยให้ผู้คนค้นหาโปรเจกต์ของคุณได้รวดเร็วขึ้น*</p>
        </form>
      </div>

      <div className="flex flex-col bg-white-foreground rounded-[12px] p-[30px] gap-[13px]">
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-[24px] font-semibold">การระดมทุน</h1>
          {isFundingLocked && (
            <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-[10px] py-[4px] rounded-full">
              🔒 ล็อกแล้ว — แก้ไขเงื่อนไขการระดมทุนไม่ได้หลังพ้นสถานะแบบร่าง
            </span>
          )}
        </div>
        <form className="flex flex-col gap-[20px]">
          <div className="flex flex-col gap-[4px]">
            <label className="text-foreground text-[14px]">เป้าหมายเงินทุน (บาท) <span className="text-error">*</span></label>
            <input
              data-testid="basics-funding-goal-input"
              type="text"
              value={numVal('fundingGoal', localData.fundingGoal)}
              onFocus={() => setActiveField('fundingGoal')}
              onChange={(e) => {
                if (isFundingLocked) return;
                const newGoal = parseNum(e.target.value);
                const autoSoftCap = Math.ceil(newGoal * 0.7);
                const autoMinInvest = Math.ceil(newGoal * 0.01);
                setLocalData({
                  ...localData,
                  fundingGoal: newGoal,
                  softCap: autoSoftCap,
                  minInvestAmount: autoMinInvest,
                  maxInvestAmount: newGoal,
                });
              }}
              onBlur={async () => {
                setActiveField(null);
                if (isFundingLocked) return;
                const fundingGoal = Math.max(localData.fundingGoal, MIN_FUNDING_GOAL);
                const softCap = Math.ceil(fundingGoal * 0.7);
                const minInvestAmount = Math.ceil(fundingGoal * 0.01);
                if (localData.fundingGoal < MIN_FUNDING_GOAL) {
                  toast.error('เป้าหมายเงินทุนขั้นต่ำ 1,000 บาท');
                  setLocalData({
                    ...localData,
                    fundingGoal,
                    softCap,
                    minInvestAmount,
                    maxInvestAmount: fundingGoal,
                  });
                }
                const goalChanged = fundingGoal !== currentProject.fundingGoal;
                const capChanged = softCap !== currentProject.softCap;
                const maxInvestChanged = fundingGoal !== currentProject.maxInvestAmount;
                if (!goalChanged && !capChanged && !maxInvestChanged) return;
                updateProjectInfo({
                  fundingGoal,
                  softCap,
                  minInvestAmount,
                  maxInvestAmount: fundingGoal,
                });
                setSaveStatus('saving');
                if (projectId) {
                  await updateProject(Number(projectId), {
                    fundingGoal,
                    softCap,
                    maxInvestAmount: fundingGoal,
                  });
                }
                triggerSaved();
              }}
              disabled={isFundingLocked}
              className={isFundingLocked ? lockedInputCls : "border border-border bg-background h-[38px] px-[12px] rounded-[6px] focus:outline-none focus:border-primary transition-all duration-200 hover:border-primary/50"} />
            <span className="text-[11px] text-muted-foreground">ขั้นต่ำ 1,000 บาท</span>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label className="text-foreground text-[14px]">ระยะเวลาโปรเจกต์ (เดือน) <span className="text-error">*</span></label>
            <input
              data-testid="basics-project-duration-input"
              type="text"
              value={numVal('projectDuration', localData.projectDuration)}
              onFocus={() => setActiveField('projectDuration')}
              onChange={(e) => !isFundingLocked && setLocalData({ ...localData, projectDuration: parseNum(e.target.value) })}
              onBlur={() => {
                setActiveField(null);
                if (isFundingLocked) return;
                const val = localData.projectDuration;
                if (val > 48) {
                  toast.error('ระยะเวลาโปรเจกต์ต้องไม่เกิน 48 เดือน (4 ปี)');
                  setLocalData({ ...localData, projectDuration: 48 });
                  handleAutoSave('projectDuration', 48);
                  return;
                }
                handleAutoSave('projectDuration', val);
              }}
              disabled={isFundingLocked}
              className={isFundingLocked ? lockedInputCls : "border border-border bg-background h-[38px] px-[12px] rounded-[6px] focus:outline-none focus:border-primary transition-all duration-200 hover:border-primary/50"} />
          </div>
          <div className="grid grid-cols-1 gap-[20px] md:grid-cols-3 md:gap-[20px]">
            <div className="flex flex-col gap-[4px]">
              <label className="text-foreground text-[14px]">Soft Cap (ได้รับทุนแม้ไม่ถึงเป้า) <span className="text-error">*</span></label>
              <input
                data-testid="basics-soft-cap-input"
                type="text"
                value={numVal('softCap', localData.softCap)}
                onFocus={() => setActiveField('softCap')}
                onChange={(e) => !isFundingLocked && setLocalData({ ...localData, softCap: parseNum(e.target.value) })}
                onBlur={() => {
                  setActiveField(null);
                  if (isFundingLocked) return;
                  const minSoftCap = Math.ceil(localData.fundingGoal * 0.7);
                  const maxSoftCap = localData.fundingGoal;
                  if (localData.softCap > 0 && localData.softCap < minSoftCap) {
                    toast.error(`Soft Cap ต้องไม่ต่ำกว่า 70% ของเป้าหมาย (${formatNum(minSoftCap)} บาท)`);
                    setLocalData({ ...localData, softCap: minSoftCap });
                    handleAutoSave('softCap', minSoftCap);
                    return;
                  }
                  if (localData.softCap > maxSoftCap) {
                    toast.error(`Soft Cap ต้องไม่เกินเป้าหมายเงินทุน (${formatNum(maxSoftCap)} บาท)`);
                    setLocalData({ ...localData, softCap: maxSoftCap });
                    handleAutoSave('softCap', maxSoftCap);
                    return;
                  }
                  handleAutoSave('softCap', localData.softCap);
                }}
                disabled={isFundingLocked}
              className={isFundingLocked ? lockedInputCls : "border border-border bg-background h-[38px] px-[12px] rounded-[6px] focus:outline-none focus:border-primary transition-all duration-200 hover:border-primary/50"} />
            </div>
            <div className="flex flex-col gap-[4px]">
              <label className="text-foreground text-[14px]">ระยะเวลาระดมทุน (1-60 วัน) <span className="text-error">*</span></label>
              <input
                data-testid="basics-campaign-duration-input"
                type="text"
                value={numVal('campaignDuration', localData.campaignDuration)}
                onFocus={() => setActiveField('campaignDuration')}
                onChange={(e) => !isFundingLocked && setLocalData({ ...localData, campaignDuration: parseNum(e.target.value) })}
                onBlur={() => {
                  setActiveField(null);
                  if (isFundingLocked) return;
                  const val = localData.campaignDuration;
                  if (val > 0 && (val < 1 || val > 60)) {
                    toast.error('ระยะเวลาระดมทุนต้องอยู่ระหว่าง 1-60 วัน');
                    const clamped = Math.min(Math.max(val, 1), 60);
                    setLocalData({ ...localData, campaignDuration: clamped });
                    handleAutoSave('campaignDuration', clamped);
                    return;
                  }
                  handleAutoSave('campaignDuration', val);
                }}
                disabled={isFundingLocked}
              className={isFundingLocked ? lockedInputCls : "border border-border bg-background h-[38px] px-[12px] rounded-[6px] focus:outline-none focus:border-primary transition-all duration-200 hover:border-primary/50"} />
            </div>
            <div className="flex flex-col gap-[4px]">
              <label className="text-foreground text-[14px]">ส่วนแบ่งกำไร (%) <span className="text-error">*</span></label>
              <input
                data-testid="basics-revenue-share-input"
                type="text"
                value={numVal('revenueShare', localData.revenueShare)}
                onFocus={() => setActiveField('revenueShare')}
                onChange={(e) => !isFundingLocked && setLocalData({ ...localData, revenueShare: parseNum(e.target.value) })}
                onBlur={() => {
                  setActiveField(null);
                  if (isFundingLocked) return;
                  const val = localData.revenueShare;
                  if (val > 50) {
                    toast.error('ส่วนแบ่งกำไรต้องไม่เกิน 50%');
                    setLocalData({ ...localData, revenueShare: 50 });
                    handleAutoSave('revenueShare', 50);
                    return;
                  }
                  if (val > 0 && val < 1) {
                    toast.error('ส่วนแบ่งกำไรต้องไม่ต่ำกว่า 1%');
                    setLocalData({ ...localData, revenueShare: 1 });
                    handleAutoSave('revenueShare', 1);
                    return;
                  }
                  handleAutoSave('revenueShare', val);
                }}
                disabled={isFundingLocked}
              className={isFundingLocked ? lockedInputCls : "border border-border bg-background h-[38px] px-[12px] rounded-[6px] focus:outline-none focus:border-primary transition-all duration-200 hover:border-primary/50"} />
            </div>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label className="text-foreground text-[14px]">ลงทุนขั้นต่ำ (บาท)</label>
            <input
              type="text"
              value={formatNum(localData.minInvestAmount)}
              disabled
              className="border border-border bg-background h-[38px] px-[12px] rounded-[6px] text-muted-foreground cursor-not-allowed opacity-60"
            />
          </div>
          <p className="text-[12px] text-muted-foreground"><span className="text-error">*</span> ระบุเป้าหมายเงินทุนและระยะเวลา ให้ชัดเจน พร้อมกำหนดเงื่อนไขการรับเงินทั้งแบบ Soft Cap รวมถึงสัดส่วนผลตอบแทนที่แน่นอน เพื่อใช้เป็นข้อตกลงในการระดมทุน*</p>
        </form>
      </div>

      {/* upload images */}
      <div className="flex flex-col bg-white-foreground rounded-[12px] p-[30px] gap-[13px]">
        <div className="grid grid-cols-1 gap-8">
          <h1 className="text-[24px] text-foreground font-semibold">สื่อประกอบ</h1>
          {/* รูปภาพปก */}
          <div className="space-y-3">
            <label className="text-foreground text-[14px] flex items-center gap-[10px]"><ImageIcon size={16} />รูปภาพปก <span className="text-muted-foreground text-[12px]">(แสดงที่หน้า home)</span> <span className="text-error">*</span></label>
            {currentProject.coverImage ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border">
                <img src={currentProject.coverImage} alt="cover" className="w-full h-full object-cover" />
                {!isLocked && (
                  <button
                    data-testid="basics-cover-image-remove-btn"
                    onClick={removeCoverImage}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div
                data-testid="basics-cover-image-dropzone"
                onClick={() => !isLocked && coverImageRef.current?.click()}
                aria-disabled={isLocked}
                className={`border-2 border-dashed border-purple-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-primary/10 transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-50 cursor-pointer'}`}
              >
                <input
                  data-testid="basics-cover-image-input"
                  type="file"
                  hidden
                  ref={coverImageRef}
                  onChange={handleCoverImageChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                />
                <div className="flex flex-col items-center gap-[14px] justify-center mb-3 text-primary text-[12px]">
                  <Upload size={24} />
                  <p>อัปโหลดรูปปกโปรเจกต์</p>
                  <p>JPG, PNG, JPEG, WEBP (สูงสุด 5MB)</p>
                </div>
              </div>
            )}
          </div>

          {/* รูปภาพประกอบ */}
          <div className="space-y-3">
            <label className="text-foreground text-[14px] flex items-center gap-[10px]"><FileImage size={16} />รูปภาพประกอบ (สูงสุด 5 รูป) <span className="text-error">*</span></label>
            <div
              data-testid="basics-additional-images-dropzone"
              onClick={() => !isLocked && additionalImagesRef.current?.click()}
              aria-disabled={isLocked}
              className={`border-2 border-dashed border-purple-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-primary/10 transition-all group ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-50 cursor-pointer'}`}
            >
              <input
                data-testid="basics-additional-images-input"
                type="file"
                multiple
                hidden
                ref={additionalImagesRef}
                onChange={handleMultipleFilesChange}
                accept="image/png, image/jpeg, image/jpg, image/webp"
              />
              <div className="flex flex-col items-center gap-[14px] justify-center mb-3 text-primary text-[12px]">
                <Upload className="" size={24} />
                <p>อัปโหลดรูปโปรเจกต์</p>
                <p>JPG, PNG, JPEG, WEBP (สูงสุด 5MB)</p>
              </div>
            </div>

            {/* Chip แสดงไฟล์ */}
            <div className="flex flex-wrap gap-2">
              {currentProject?.files?.map((f, i) => {
                const uploading = f.url.startsWith('blob:');
                return (
                  <div key={i} className="flex items-center gap-[10px] px-3 py-1.5 rounded-full text-xs">
                    <div className="relative w-[50px] h-[50px]">
                      <img src={f.url} alt={f.name} className="w-[50px] h-[50px] object-cover" />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                          <Loader2 size={18} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <span className={`max-w-[150px] truncate ${uploading ? 'text-muted-foreground' : ''}`}>{f.name}</span>
                    {!isLocked && (
                      <button
                        data-testid={`basics-additional-image-remove-btn-${i}`}
                        onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                        aria-label={uploading ? 'ยกเลิกและลบรูปที่กำลังอัปโหลด' : 'ลบรูปภาพ'}
                        className="ml-2 hover:text-error cursor-pointer">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* วิดีโอ */}
          <div className="space-y-3">
            <label className="text-[14px] text-foreground flex items-center gap-[10px]">
              <Video size={16} /> ไฟล์วิดีโอ (ไม่บังคับ)
            </label>
            <div
              data-testid="basics-video-dropzone"
              onClick={() => !isLocked && videoInputRef.current?.click()}
              aria-disabled={isLocked}
              className={`border-2 border-dashed border-purple-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-primary/10 transition-all group ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-50 cursor-pointer'}`}
            >
              <input
                data-testid="basics-video-input"
                type="file"
                accept="video/*"
                hidden
                ref={videoInputRef}
                onChange={handleVideoChange} />
              <div className="flex flex-col items-center gap-[14px] justify-center mb-3 text-primary text-[12px]">
                <Upload className="" size={24} />
                <p>อัปโหลดวีดีโอโปรเจกต์</p>
                <p>MP4 (สูงสุด 50MB)</p>
              </div>
            </div>
            {currentProject.video && (() => {
              const videoUploading = currentProject.video!.url.startsWith('blob:');
              return (
                <div className="flex items-center gap-[10px] text-foreground px-4 py-2 text-xs w-fit">
                  <div className="relative h-[50px] w-[50px]">
                    <video
                      src={currentProject.video!.url}
                      className="h-[50px] w-[50px] object-cover"
                      preload="metadata"
                      muted
                    />
                    {videoUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                        <Loader2 size={18} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <span className={videoUploading ? 'text-muted-foreground' : ''}>{currentProject.video!.name}</span>
                  {!videoUploading && !isLocked && (
                    <button
                      data-testid="basics-video-remove-btn"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeVideo(); }}
                      className="ml-2 cursor-pointer hover:text-error">
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {hasPendingChanges && (
        <div className="sticky bottom-[16px] z-20 flex items-center justify-between gap-[16px] bg-white border-2 border-primary/30 shadow-lg rounded-[14px] px-[20px] py-[14px]">
          <div className="flex items-center gap-[10px]">
            <span className="text-[16px] leading-none">✏️</span>
            <div>
              <p className="text-[13px] font-semibold text-foreground">มีการแก้ไขที่ยังไม่ได้ส่ง</p>
              <p className="text-[11px] text-muted-foreground">กด "ส่งการแก้ไข" เพื่อส่งให้ Admin ตรวจสอบก่อนมีผลจริง</p>
            </div>
          </div>
          <button
            onClick={handleSendForReview}
            disabled={isSendingReview}
            className="flex items-center gap-[8px] px-[20px] h-[38px] rounded-[12px] bg-primary hover:bg-primary-hover text-white text-[14px] font-medium transition-all duration-200 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            {isSendingReview ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isSendingReview ? 'กำลังส่ง...' : 'ส่งการแก้ไขให้ Admin ตรวจสอบ'}
          </button>
        </div>
      )}

      <StepNavigation disableNext={
        currentProject?.files?.some(f => f.url.startsWith('blob:')) ||
        !!currentProject?.video?.url.startsWith('blob:')
      } />
    </div>
  );
};

export default Step1Basics;
