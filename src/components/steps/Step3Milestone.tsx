import { useRef, useEffect, useState } from 'react'
import { useProjectStore, type Milestone } from '../../store/useProjectStore'
import { Plus, Trash2, Upload, Video, X, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import StepNavigation from "../StepNavigation"
import toast from 'react-hot-toast'
import { useParams, useSearchParams } from 'react-router'

const Step3Milestone = () => {
  const { projectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  // Phase ที่กำลังแก้ไข (1-4) เก็บไว้ใน query string (?phase=) เพื่อรีเฟรชหน้าแล้วยังอยู่ phase เดิม
  const phaseParam = Number(searchParams.get('phase') ?? '1')
  const activePhase = Math.min(Math.max(phaseParam - 1, 0), 3) // clamp ให้อยู่ในช่วง index 0-3 เสมอ
  const setActivePhase = (idx: number) => setSearchParams({ phase: String(idx + 1) }, { replace: true })
  const pendingFocusIdx = useRef<number | null>(null) // index ของ criteria input ที่ต้อง focus หลัง re-render (เช่นกด Enter เพิ่มบรรทัดใหม่)
  // snapshot ของแต่ละ phase ตอนโหลดครั้งแรก/บันทึกล่าสุด ใช้เทียบว่าข้อมูล phase นั้นเปลี่ยนจริงไหมก่อนยิง API
  const savedSnapshot = useRef<Record<number, string>>(
    Object.fromEntries(
      useProjectStore.getState().currentProject.milestones.map((m, i) => [i, JSON.stringify(m)])
    )
  )

  const storageKey = `milestone-touched-${projectId}`

  // เก็บว่า phase ไหนที่ผู้ใช้เคย "แตะ" แล้วบ้าง (ใช้โชว์ error สีแดงเฉพาะ phase ที่เคยเข้าไปแก้ แล้วข้อมูลยังไม่ครบ)
  // เก็บใน sessionStorage เพื่อให้จำสถานะได้แม้ผู้ใช้ refresh หน้า
  const [touchedPhases, setTouchedPhases] = useState<Set<number>>(() => {
    try {
      const stored = sessionStorage.getItem(`milestone-touched-${projectId}`)
      return stored ? new Set<number>(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  // บันทึกว่า phase นี้ถูกแตะแล้ว ทั้งใน state และ sessionStorage
  const markTouched = (idx: number) => {
    setTouchedPhases(prev => {
      const next = new Set(prev).add(idx)
      try { sessionStorage.setItem(storageKey, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  // เช็คว่า milestone นี้กรอกข้อมูลจำเป็นครบหรือยัง (title, description, duration, และมี criteria อย่างน้อย 1 ข้อ)
  const isPhaseIncomplete = (m: Milestone) =>
    !m.title?.trim() || !m.description?.trim() || !m.duration || m.criteria.every(c => !c.trim())

  // สลับ phase: mark ว่า phase เดิมถูกแตะแล้ว, save phase เดิมถ้ามีการแก้ไข, แล้วค่อยเปลี่ยนไป phase ใหม่
  const handlePhaseChange = (newIdx: number) => {
    markTouched(activePhase)
    savePhaseIfChanged(activePhase)
    setActivePhase(newIdx)
  }

  const fileInputRef = useRef<HTMLInputElement>(null) // input file ที่ซ่อนไว้ สำหรับไฟล์ประกอบ (รูป/pdf/excel)
  const videoInputRef = useRef<HTMLInputElement>(null) // input file ที่ซ่อนไว้ สำหรับวิดีโอ
  const uploadControllers = useRef(new Map<string, AbortController>())
  const descriptionRef = useRef<HTMLTextAreaElement>(null) // ใช้ปรับความสูง textarea คำอธิบายอัตโนมัติ
  const criteriaRefs = useRef<(HTMLInputElement | null)[]>([]) // เก็บ ref ของ input เกณฑ์แต่ละข้อ เพื่อ focus ข้อใหม่หลังกด Enter
  // ✅ ดึง currentProject มาก่อน แล้วค่อยเข้าถึง milestones
  const { currentProject, updateMilestone, saveMilestonePhase, setSaveStatus, uploadFile } = useProjectStore()

  // แสดงสถานะ "บันทึกแล้ว" ชั่วคราวแล้วเปลี่ยนกลับเป็น idle หลังจาก 2.5 วิ
  const triggerSaved = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  // บันทึก milestone phase ขึ้น backend เฉพาะเมื่อข้อมูลต่างจาก snapshot ล่าสุด (กันยิง API ซ้ำโดยไม่จำเป็น)
  const savePhaseIfChanged = async (phaseIndex: number) => {
    if (!projectId) return;
    const milestone = useProjectStore.getState().currentProject.milestones[phaseIndex]
    const current = JSON.stringify(milestone)
    if (savedSnapshot.current[phaseIndex] === current) return
    setSaveStatus('saving');
    const saved = await saveMilestonePhase(Number(projectId), phaseIndex);
    if (saved) {
      savedSnapshot.current[phaseIndex] = JSON.stringify(
        useProjectStore.getState().currentProject.milestones[phaseIndex]
      )
      triggerSaved();
    } else {
      setSaveStatus('idle');
    }
  };
  const fundingGoal = currentProject.fundingGoal || 0
  const phasePercents = [0.15, 0.20, 0.30, 0.35] // สัดส่วนงบประมาณคงที่ของแต่ละ phase (รวมกันได้ 100%)

  // Milestone แก้ไม่ได้แล้วเมื่อโปรเจกต์พ้นสถานะ draft/pending_review (เพิ่ม/ลบ/แก้ไขไม่ได้ทั้งหมด — read only)
  const isLocked = !!currentProject.state &&
    currentProject.state !== 'draft' &&
    currentProject.state !== 'pending_review'

  const currentData = currentProject.milestones[activePhase]

  // คำนวณวันเริ่ม/สิ้นสุดของแต่ละ phase (เหมือน PreviewMilestone)
  const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  const formatThDate = (d: Date) => `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`
  const activeMilestonesCount = currentProject.milestones.filter(m => m.title).length || 4
  const phaseDates = (() => {
    const result: { start: Date; end: Date }[] = []
    let cursor = new Date()
    cursor.setDate(cursor.getDate() + (currentProject.campaignDuration || 0))
    for (let i = 0; i < activeMilestonesCount; i++) {
      const duration = currentProject.milestones[i]?.duration || 0
      const start = new Date(cursor)
      const end = new Date(cursor)
      end.setDate(end.getDate() + duration)
      result.push({ start, end })
      cursor = new Date(end)
    }
    return result
  })()
  const activePhaseDates = phaseDates[activePhase]
  const showDates = (currentProject.campaignDuration || 0) > 0 && (currentData.duration || 0) > 0
  const maxTotalDays = (currentProject.projectDuration || 0) * 30 // แปลงระยะเวลาโปรเจกต์จากเดือนเป็นวัน (ประมาณ 30 วัน/เดือน)
  const usedDays = currentProject.milestones.reduce((sum, m) => sum + (m.duration || 0), 0) // รวมวันที่ทุก phase ใช้ไปแล้ว
  const remainingDays = maxTotalDays - usedDays
  const isOverLimit = maxTotalDays > 0 && usedDays > maxTotalDays

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto'
      descriptionRef.current.style.height = descriptionRef.current.scrollHeight + 'px'
    }
  }, [currentData.description])

  useEffect(() => {
    if (pendingFocusIdx.current !== null) {
      criteriaRefs.current[pendingFocusIdx.current]?.focus()
      pendingFocusIdx.current = null
    }
  }, [currentData.criteria])


  // 1. ฟังก์ชันอัปเดตข้อมูลทั่วไปของ Milestone
  const handleChange = <K extends keyof Milestone>(field: K, value: Milestone[K]) => {
    updateMilestone(activePhase, { [field]: value })
  }

  // อัปโหลดไฟล์เดียวผ่าน /upload (key: file) — คืน server URL
  const uploadOneFile = async (file: File, signal?: AbortSignal): Promise<string | null> => {
    const uploaded = await uploadFile(file, signal)
    return uploaded?.url ?? null
  }

  // แทนที่ blob URL ด้วย server URL ใน milestone files
  const replaceFileBlobUrl = (blobUrl: string, serverUrl: string, name: string, phase: number) => {
    URL.revokeObjectURL(blobUrl)
    useProjectStore.setState(state => ({
      currentProject: {
        ...state.currentProject,
        milestones: state.currentProject.milestones.map((m, idx) =>
          idx !== phase ? m : {
            ...m,
            files: (m.files || []).map(f => f.url === blobUrl ? { name, url: serverUrl } : f),
          }
        ),
      },
    }))
  }

  const removeFileBlobUrl = (blobUrl: string, phase: number) => {
    URL.revokeObjectURL(blobUrl)
    useProjectStore.setState(state => ({
      currentProject: {
        ...state.currentProject,
        milestones: state.currentProject.milestones.map((m, idx) =>
          idx !== phase ? m : { ...m, files: (m.files || []).filter(f => f.url !== blobUrl) }
        ),
      },
    }))
  }

  const replaceVideoBlobUrl = (blobUrl: string, serverUrl: string, name: string, phase: number) => {
    URL.revokeObjectURL(blobUrl)
    useProjectStore.setState(state => ({
      currentProject: {
        ...state.currentProject,
        milestones: state.currentProject.milestones.map((m, idx) =>
          idx !== phase ? m : {
            ...m,
            videos: (m.videos || []).map(v => v.url === blobUrl ? { name, url: serverUrl } : v),
          }
        ),
      },
    }))
  }

  const removeVideoBlobUrl = (blobUrl: string, phase: number) => {
    URL.revokeObjectURL(blobUrl)
    useProjectStore.setState(state => ({
      currentProject: {
        ...state.currentProject,
        milestones: state.currentProject.milestones.map((m, idx) =>
          idx !== phase ? m : { ...m, videos: (m.videos || []).filter(v => v.url !== blobUrl) }
        ),
      },
    }))
  }

  // 2. อัปโหลดหลายไฟล์ (append ต่อไฟล์เดิม)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    const phase = activePhase

    // ต้อง convert ก่อน clear — FileList เป็น live reference ถูกล้างเมื่อ value = ""
    const files = Array.from(fileList)
    e.target.value = ""
    const oversized = files.find(file => file.size > 5 * 1024 * 1024)
    if (oversized) {
      toast.error('รูปภาพ, PDF หรือ Excel ต้องมีขนาดไม่เกิน 5MB')
      return
    }
    const previews = files.map(file => ({ name: file.name, url: URL.createObjectURL(file) }))

    // append blob previews ต่อรายการปัจจุบัน (อ่านจาก store ผ่าน setState เพื่อหลีกเลี่ยง stale closure)
    useProjectStore.setState(state => ({
      currentProject: {
        ...state.currentProject,
        milestones: state.currentProject.milestones.map((m, idx) =>
          idx !== phase ? m : { ...m, files: [...(m.files || []), ...previews] }
        ),
      },
    }))

    // upload ทีละไฟล์แล้วแทนที่ blob URL
    toast.loading('กำลังอัปโหลดไฟล์...', { id: 'upload-milestone-files' })
    let uploadedCount = 0
    for (let i = 0; i < files.length; i++) {
      const isStillSelected = useProjectStore.getState().currentProject.milestones[phase]
        ?.files.some(item => item.url === previews[i].url)
      if (!isStillSelected) continue
      const controller = new AbortController()
      uploadControllers.current.set(previews[i].url, controller)
      const serverUrl = await uploadOneFile(files[i], controller.signal)
      uploadControllers.current.delete(previews[i].url)
      if (controller.signal.aborted) continue
      if (serverUrl) {
        replaceFileBlobUrl(previews[i].url, serverUrl, files[i].name, phase)
        uploadedCount++
      } else {
        removeFileBlobUrl(previews[i].url, phase)
        toast.error(`อัปโหลด ${files[i].name} ไม่สำเร็จ`, { id: 'upload-milestone-files' })
        return
      }
    }
    if (uploadedCount > 0) {
      toast.success('อัปโหลดไฟล์สำเร็จ', { id: 'upload-milestone-files', duration: 2000 })
    } else {
      toast.dismiss('upload-milestone-files')
    }
    await savePhaseIfChanged(phase)
  }

  // 3. อัปโหลดวิดีโอ (append ต่อรายการเดิม)
  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const phase = activePhase
    const supportedVideoExtensions = ['mp4', 'webm', 'mov', 'avi']
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!supportedVideoExtensions.includes(extension)) {
      toast.error(`ไม่รองรับไฟล์นี้ (รองรับ MP4, WebM, MOV, AVI)`)
      e.target.value = ""
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error(`วิดีโอต้องมีขนาดไม่เกิน 50MB`)
      e.target.value = ""
      return
    }
    e.target.value = ""

    const blobUrl = URL.createObjectURL(file)
    const controller = new AbortController()
    uploadControllers.current.set(blobUrl, controller)
    useProjectStore.setState(state => ({
      currentProject: {
        ...state.currentProject,
        milestones: state.currentProject.milestones.map((m, idx) =>
          idx !== phase ? m : { ...m, videos: [...(m.videos || []), { name: file.name, url: blobUrl }] }
        ),
      },
    }))

    toast.loading('กำลังอัปโหลดวิดีโอ...', { id: 'upload-milestone-video' })
    const serverUrl = await uploadOneFile(file, controller.signal)
    uploadControllers.current.delete(blobUrl)
    if (controller.signal.aborted) {
      toast.dismiss('upload-milestone-video')
      return
    }
    if (serverUrl) {
      replaceVideoBlobUrl(blobUrl, serverUrl, file.name, phase)
      toast.success('อัปโหลดวิดีโอสำเร็จ', { id: 'upload-milestone-video', duration: 2000 })
      await savePhaseIfChanged(phase)
    } else {
      removeVideoBlobUrl(blobUrl, phase)
      toast.error(`อัปโหลด ${file.name} ไม่สำเร็จ`, { id: 'upload-milestone-video' })
    }
  }

  // ลบไฟล์ แล้ว save เพื่ออัปเดต url ใน backend
  const removeImage = async (index: number) => {
    const files = currentData.files || []
    const f = files[index]
    if (!f) return
    if (f.url?.startsWith('blob:')) {
      uploadControllers.current.get(f.url)?.abort()
      uploadControllers.current.delete(f.url)
      URL.revokeObjectURL(f.url)
    }
    updateMilestone(activePhase, { files: files.filter((_, i) => i !== index) })
    await savePhaseIfChanged(activePhase)
  }

  // ลบวิดีโอ แล้ว save เพื่ออัปเดต url ใน backend
  const removeVideo = async (index: number) => {
    const videos = currentData.videos || []
    const v = videos[index]
    if (!v) return
    if (v.url?.startsWith('blob:')) {
      uploadControllers.current.get(v.url)?.abort()
      uploadControllers.current.delete(v.url)
      URL.revokeObjectURL(v.url)
      toast.dismiss('upload-milestone-video')
    }
    updateMilestone(activePhase, { videos: videos.filter((_, i) => i !== index) })
    await savePhaseIfChanged(activePhase)
  }

  return (
    <div className="flex flex-col gap-[40px] p-[10px]">

      {/* Container หลัก จัดเป็นรูปแบบการ์ดสีขาวแบบเต็มจอ มีขอบมน */}
      <div className="w-full flex flex-col bg-white-foreground rounded-[12px] p-[30px] gap-[30px] border border-border">

        {/* =========================================
            ส่วนที่ 1: เมนูนำทางเลือก Phase (Tabs)
            (ใช้วนลูปแสดง Phase 1 ถึง 4 เรียงต่อกันตรงกลางพร้อมเส้นใต้ตอน Active)
            ========================================= */}
        <div className="flex justify-center items-center space-x-6 md:space-x-10 border-b border-border pb-[10px]">
          {[1, 2, 3, 4].map((phase, idx) => {
            const isTouched = touchedPhases.has(idx)
            const incomplete = isPhaseIncomplete(currentProject.milestones[idx])
            const showError = isTouched && incomplete
            return (
              <button
                key={phase}
                onClick={() => handlePhaseChange(idx)}
                className={`pb-2 text-[14px] md:text-[15px] font-semibold transition-all relative cursor-pointer ${
                  activePhase === idx
                    ? showError ? 'text-red-500' : 'text-primary'
                    : showError ? 'text-red-400 hover:text-red-500' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Phase {phase}
                {activePhase === idx && (
                  <div className={`absolute -bottom-2.75 left-0 w-full h-0.5 ${showError ? 'bg-red-500' : 'bg-primary'}`} />
                )}
              </button>
            )
          })}
        </div>

        {/* =========================================
            เนื้อหาฟอร์ม ที่สลับไปตาม Tab ที่ผู้ใช้เลือก
            มีการใส่ effect ค่อยๆ ปรากฏ (fade-in)
            ========================================= */}
        <div className="flex flex-col gap-[24px] animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* ส่วนที่ 2: หัวข้อ Milestone (วงกลมแสดงเลขและตามด้วยชื่อ) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-[14px]">
                {activePhase + 1}
              </div>
              <h2 className="text-[16px] font-bold text-foreground">Milestone {activePhase + 1}</h2>
            </div>
            {isLocked && (
              <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-[10px] py-[4px] rounded-full">
                🔒 ล็อกแล้ว — แก้ไขไม่ได้หลังเข้าสู่การระดมทุน
              </span>
            )}
          </div>

          {/* ส่วนที่ 3: ฟอร์มระบุข้อมูลทั่วไปของ Milestone นี้ */}
          <div className="flex flex-col gap-[20px]">
            {/* กล่อง input สำหรับ ชื่อ Milestone */}
            <div className="flex flex-col gap-[8px]">
              <label className="text-[14px] font-semibold text-foreground">ชื่อ Milestone <span className="text-error">*</span></label>
              <input
                type="text"
                value={currentData.title}
                maxLength={50}
                readOnly={isLocked}
                onChange={(e) => !isLocked && handleChange('title', e.target.value)}
                onBlur={() => { if (!isLocked) savePhaseIfChanged(activePhase) }}
                className={isLocked
                  ? "w-full h-[40px] px-3 bg-surface-disabled border border-border-strong rounded-[8px] outline-none text-[14px] text-muted-foreground cursor-not-allowed opacity-70"
                  : "w-full h-[40px] px-3 bg-surface-field border border-border-strong rounded-[8px] focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-[14px]"
                }
              />
            </div>

            {/* กล่อง textarea สำหรับ คำอธิบายของ Milestone */}
            <div className="flex flex-col gap-[8px]">
              <label className="text-[14px] font-semibold text-foreground">คำอธิบาย <span className="text-error">*</span></label>
              <textarea
                ref={descriptionRef}
                rows={3}
                value={currentData.description}
                maxLength={5000}
                readOnly={isLocked}
                onChange={(e) => {
                  if (isLocked) return
                  handleChange('description', e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                onBlur={() => { if (!isLocked) savePhaseIfChanged(activePhase) }}
                className={isLocked
                  ? "w-full p-3 bg-surface-disabled border border-border-strong rounded-[8px] outline-none resize-none overflow-hidden text-[14px] text-muted-foreground cursor-not-allowed opacity-70"
                  : "w-full p-3 bg-surface-field border border-border-strong rounded-[8px] focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none overflow-hidden text-[14px]"
                }
              />
            </div>

            {/* กล่อง input ป้อน จำนวนเงินงบประมาณ (auto-calculated, disabled) */}
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center justify-between">
                <label className="text-[14px] font-semibold text-foreground">จำนวนเงิน</label>
                <span className="text-[12px] text-primary font-medium bg-primary/10 px-[8px] py-[2px] rounded-full">
                  {(phasePercents[activePhase] * 100).toFixed(0)}% ของเป้าหมาย
                </span>
              </div>
              <input
                type="text"
                disabled
                value={fundingGoal > 0 ? `฿${(fundingGoal * phasePercents[activePhase]).toLocaleString('th-TH')}` : 'กรุณากำหนดเป้าหมายเงินทุนก่อน'}
                className="w-full h-[40px] px-3 bg-surface-disabled border border-border-strong rounded-[8px] outline-none text-[14px] text-muted-foreground cursor-not-allowed"
              />
            </div>

            {/* ระยะเวลา (วัน) */}
            <div className="flex flex-col gap-[8px]">
              <label className="text-[14px] font-semibold text-foreground">ระยะเวลา (วัน) <span className="text-error">*</span></label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={currentData.duration || ''}
                disabled={isLocked}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 3)
                  handleChange('duration', digits ? Math.min(Number(digits), 365) : 0)
                }}
                onBlur={() => {
                  const maxDays = (currentProject.projectDuration || 0) * 30;
                  if (maxDays > 0) {
                    const otherDays = currentProject.milestones
                      .reduce((sum, m, i) => sum + (i !== activePhase ? (m.duration || 0) : 0), 0);
                    const maxForThisPhase = Math.max(1, maxDays - otherDays);
                    if ((currentData.duration || 0) > maxForThisPhase) {
                      toast.error(`ปรับ Phase ${activePhase + 1} เป็น ${maxForThisPhase} วัน (Phase อื่นใช้ไปแล้ว ${otherDays} วัน)`);
                      updateMilestone(activePhase, { duration: maxForThisPhase });
                      savePhaseIfChanged(activePhase);
                      return;
                    }
                  }
                  savePhaseIfChanged(activePhase);
                }}
                className={isLocked
                  ? "w-full h-[40px] px-3 bg-surface-disabled border border-border-strong rounded-[8px] outline-none text-[14px] text-muted-foreground cursor-not-allowed opacity-70"
                  : "w-full h-[40px] px-3 bg-surface-field border border-border-strong rounded-[8px] focus:ring-1 focus:ring-primary focus:border-primary outline-none text-[14px]"
                }
              />
              {isLocked && <p className="text-[11px] text-amber-600">🔒 วันที่/ระยะเวลาแก้ไม่ได้หลังเข้าสู่การระดมทุน</p>}
              {showDates && activePhaseDates && (
                <p className="text-[12px] text-muted-foreground">
                  เริ่ม {formatThDate(activePhaseDates.start)} — สิ้นสุด {formatThDate(activePhaseDates.end)}
                </p>
              )}
              {!currentProject.campaignDuration && (
                <p className="text-[12px] text-muted-foreground">กำหนดระยะเวลาระดมทุนใน Step 1 เพื่อคำนวณวันที่</p>
              )}
              {maxTotalDays > 0 && (
                <p className={`text-[12px] font-medium ${isOverLimit ? 'text-red-500' : remainingDays === 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  รวมทุก Phase: {usedDays} / {maxTotalDays} วัน
                  {isOverLimit
                    ? ` (เกิน ${usedDays - maxTotalDays} วัน)`
                    : remainingDays > 0
                    ? ` (เหลือ ${remainingDays} วัน)`
                    : ' (ครบแล้ว)'}
                </p>
              )}
            </div>
          </div>

          <hr className="border-border my-[10px]" />

          {/* =========================================
              ส่วนที่ 4: เกณฑ์การยอมรับ (Acceptance Criteria)
              เป็นรายการลิสต์ที่สามารถกดปุ่ม "เพิ่มเกณฑ์" ได้เรื่อยๆ สูงสุด 10 ข้อ
              ========================================= */}
          <div className="flex flex-col gap-[16px]">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-[4px]">
                <label className="text-[14px] font-semibold text-foreground">เกณฑ์การยอมรับ <span className="text-error">*</span></label>
                <span className="text-[12px] text-muted-foreground">ระบุสิ่งที่ต้องทำให้เสร็จใน Milestone นี้ (1-10 ข้อ)</span>
              </div>
              {!isLocked && (
                <button
                  onClick={() => {
                    if (currentData.criteria.length < 10) {
                      handleChange('criteria', [...currentData.criteria, ''])
                    } else {
                      toast.error('คุณสามารถระบุเกณฑ์การยอมรับได้สูงสุด 10 ข้อ')
                    }
                  }}
                  className="flex items-center space-x-2 bg-surface-disabled text-foreground hover:bg-border-strong px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>เพิ่มเกณฑ์</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-[12px]">
              {/* รายการเกณฑ์ที่เพิ่มแสดงเป็น input หลายพารากราฟ */}
              {currentData.criteria.map((item, cIdx) => (
                <div key={cIdx} className="flex items-center gap-[12px]">
                  <span className="text-[14px] font-bold text-foreground w-[16px]">{cIdx + 1}.</span>
                  <input
                    ref={el => { criteriaRefs.current[cIdx] = el }}
                    type="text"
                    value={item}
                    readOnly={isLocked}
                    onChange={(e) => {
                      if (isLocked) return
                      const newCriteria = [...currentData.criteria];
                      newCriteria[cIdx] = e.target.value;
                      handleChange('criteria', newCriteria);
                    }}
                    onKeyDown={(e) => {
                      if (isLocked) return
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (currentData.criteria.length < 10) {
                          const newCriteria = [...currentData.criteria];
                          newCriteria.splice(cIdx + 1, 0, '');
                          pendingFocusIdx.current = cIdx + 1;
                          handleChange('criteria', newCriteria);
                        } else {
                          toast.error('คุณสามารถระบุเกณฑ์การยอมรับได้สูงสุด 10 ข้อ');
                        }
                      }
                    }}
                    onPaste={(e) => {
                      if (isLocked) return
                      const text = e.clipboardData.getData('text');
                      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                      if (lines.length <= 1) return;
                      e.preventDefault();
                      const before = currentData.criteria.slice(0, cIdx);
                      const after = currentData.criteria.slice(cIdx + 1);
                      const merged = [...before, ...lines, ...after].slice(0, 10);
                      handleChange('criteria', merged);
                      if (before.length + lines.length + after.length > 10) {
                        toast.error('ตัดให้เหลือ 10 ข้อ (สูงสุดที่รองรับ)');
                      }
                    }}
                    onBlur={() => { if (!isLocked) savePhaseIfChanged(activePhase) }}
                    className={isLocked
                      ? "flex-grow h-[40px] px-3 bg-surface-disabled border border-border-strong rounded-[8px] outline-none text-[14px] text-muted-foreground cursor-not-allowed opacity-70"
                      : "flex-grow h-[40px] px-3 bg-surface-field border border-border-strong rounded-[8px] outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[14px]"
                    }
                  />
                  {/* ปุ่มลบเกณฑ์ถังขยะ (แสดงเฉพาะเมื่อมีมากกว่า 1 ข้อ ไม่งั้นให้เหลือ 1 ไว้เสมอ) */}
                  {currentData.criteria.length > 1 && !isLocked && (
                    <button
                      onClick={() => handleChange('criteria', currentData.criteria.filter((_, i) => i !== cIdx))}
                      className="p-2 text-muted-foreground hover:text-error transition-colors cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <hr className="border-border my-[10px]" />

          {/* =========================================
              ส่วนที่ 5: ไฟล์ประกอบและวิดีโอ (สื่อประกอบ)
              นำพื้นที่อัปโหลดแบบลากวางมาเรียงซ้อนกันแนวตั้ง (Stacked)
              ========================================= */}
          <div className="flex flex-col gap-[24px]">
            {/* 5.1 ไฟล์ประกอบ — เพิ่มไฟล์จะล้าง video อัตโนมัติ (backend รองรับ type เดียวต่อ milestone) */}
            <div className="flex flex-col gap-[8px]">
              <label className="text-[14px] font-semibold text-foreground">ไฟล์ประกอบ (ไม่บังคับ)</label>
              {!isLocked && (
                <>
                  <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*,.pdf,.xls,.xlsx" />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-[1.5px] border-dashed border-[#C084FC] rounded-[12px] p-[40px] flex flex-col items-center justify-center bg-[#F9F5FF] hover:bg-[#F3E8FF] transition-all cursor-pointer group"
                  >
                    <Upload className="text-muted-foreground mb-2 group-hover:-translate-y-1 transition-transform" size={24} />
                    <span className="text-[13px] text-muted-foreground">.jpg, .png, .gif, .webp, .pdf, .xls, .xlsx (สูงสุด 5MB ต่อไฟล์)</span>
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-2">
                {currentData.files?.map((f, i) => {
                  const uploading = f.url?.startsWith('blob:');
                  const lowerName = (f.name || '').toLowerCase();
                  const lowerUrl = (f.url || '').toLowerCase();
                  const isExcel = /\.(xlsx?|csv)$/i.test(lowerName);
                  const isPdf = /\.pdf$/i.test(lowerName);
                  const isDoc = /\.(docx?)$/i.test(lowerName);
                  // นามสกุลเอกสารชนะ Cloudinary path (PDF/Excel/Doc อาจถูก upload ผ่าน /image/upload/)
                  const isImage = !isExcel && !isPdf && !isDoc && (
                    /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(lowerName) ||
                    /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(lowerUrl) ||
                    lowerUrl.includes('/image/upload/') ||
                    lowerUrl.startsWith('blob:')
                  );
                  const fileIcon = isExcel ? '📊' : isPdf ? '📄' : isDoc ? '📝' : '📎';
                  return (
                    <div key={i} className="flex items-center gap-[10px] px-3 py-1.5 rounded-full text-xs">
                      <div className="relative w-[50px] h-[50px]">
                        {isImage && f.url ? (
                          <img src={f.url} className="w-[50px] h-[50px] object-cover rounded" alt="preview" />
                        ) : (
                          <div className="w-[50px] h-[50px] flex items-center justify-center bg-surface-field rounded text-[20px]">{fileIcon}</div>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                            <Loader2 size={18} className="text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <span className={`max-w-[150px] truncate ${uploading ? 'text-muted-foreground' : ''}`}>{f.name}</span>
                      {!isLocked && (
                        <button type="button" aria-label={`ลบ ${f.name}`} onClick={() => removeImage(i)} className="ml-2 hover:text-error cursor-pointer">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5.2 วิดีโอ — แสดงเฉพาะเมื่อไม่มีไฟล์ประกอบ */}
            <div className="flex flex-col gap-[8px]">
              <label className="text-[14px] font-semibold text-foreground flex items-center">
                <Video size={16} className="mr-2" /> ไฟล์วิดีโอ (ไม่บังคับ)
              </label>
              {!isLocked && (
                <>
                  <input type="file" accept=".mp4,.webm,.mov,.avi,video/mp4,video/webm,video/quicktime,video/x-msvideo" hidden ref={videoInputRef} onChange={handleVideoChange} />
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="border-[1.5px] border-dashed border-[#C084FC] rounded-[12px] p-[40px] flex flex-col items-center justify-center bg-[#F9F5FF] hover:bg-[#F3E8FF] transition-all cursor-pointer group"
                  >
                    <Upload className="text-muted-foreground mb-2 group-hover:-translate-y-1 transition-transform" size={24} />
                    <span className="text-[13px] text-muted-foreground">.mp4, .webm, .mov, .avi (สูงสุด 50MB)</span>
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-2">
                {(currentData.videos || []).map((vid, i) => {
                  const uploading = vid.url?.startsWith('blob:');
                  return (
                    <div key={i} className="flex items-center gap-[10px] px-3 py-1.5 rounded-full text-xs">
                      <div className="relative w-[50px] h-[50px]">
                        <video src={vid.url} className="w-[50px] h-[50px] object-cover rounded" muted preload="metadata" />
                        {uploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                            <Loader2 size={18} className="text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <span className={`max-w-[150px] truncate ${uploading ? 'text-muted-foreground' : ''}`}>{vid.name}</span>
                      {!isLocked && (
                        <button type="button" aria-label={`ลบ ${vid.name}`} onClick={() => removeVideo(i)} className="ml-2 hover:text-error cursor-pointer">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {(activePhase > 0 || activePhase < 3) && (
          <div className="flex justify-between pt-[4px]">
            {activePhase > 0 ? (
              <button
                type="button"
                onClick={() => handlePhaseChange(activePhase - 1)}
                className="flex items-center gap-[6px] px-[20px] py-[10px] border border-border text-foreground rounded-[10px] text-[14px] font-medium hover:bg-muted transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
                Phase {activePhase} ก่อนหน้า
              </button>
            ) : <div />}
            {activePhase < 3 && (
              <button
                type="button"
                onClick={() => handlePhaseChange(activePhase + 1)}
                className="flex items-center gap-[6px] px-[20px] py-[10px] bg-primary text-white rounded-[10px] text-[14px] font-medium hover:bg-primary/90 transition-all cursor-pointer"
              >
                Phase {activePhase + 2} ต่อไป
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ปุ่มถอยกลับ/จัดเก็บ/ถัดไป */}
      <StepNavigation disableNext={
        currentProject.milestones.some(m =>
          m.files?.some(f => f.url?.startsWith('blob:')) ||
          m.videos?.some(v => v.url?.startsWith('blob:'))
        )
      } />

    </div>
  )
}

export default Step3Milestone
