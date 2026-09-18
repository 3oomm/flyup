import { useRef, useState } from 'react'
import { Loader2, Flag, X, Paperclip, XCircle } from 'lucide-react'
import { useComplaintStore } from '../store/useComplaintStore'
import { useProjectStore } from '../store/useProjectStore'
import { isValidHttpUrl } from '../lib/validation'

interface ComplaintModalProps {
    projectId: number
    projectTitle: string
    onClose: () => void
    onSuccess?: () => void
}

const ComplaintModal = ({ projectId, projectTitle, onClose, onSuccess }: ComplaintModalProps) => {
    const { fileComplaint, isSubmitting } = useComplaintStore()
    const { uploadFile } = useProjectStore()
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [evidence, setEvidence] = useState('')
    const [evidenceFileName, setEvidenceFileName] = useState('')
    const [isUploadingEvidence, setIsUploadingEvidence] = useState(false)
    const [evidenceError, setEvidenceError] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = '' // เคลียร์ input เพื่อให้เลือกไฟล์เดิมซ้ำได้
        if (!file) return
        setIsUploadingEvidence(true)
        setEvidenceError(false)
        const result = await uploadFile(file)
        setIsUploadingEvidence(false)
        if (result?.url) {
            setEvidence(result.url)
            setEvidenceFileName(file.name)
        } else {
            setEvidenceError(true)
        }
    }

    const clearEvidence = () => {
        setEvidence('')
        setEvidenceFileName('')
        setEvidenceError(false)
    }

    const handleSubmit = async () => {
        if (!subjectValid || !bodyValid || !evidenceValid) {
            if (!evidenceValid) setEvidenceError(true)
            return
        }
        const trimmedEvidence = evidence.trim()
        const ok = await fileComplaint(projectId, subject.trim(), body.trim(), trimmedEvidence || undefined)
        if (ok) {
            onSuccess?.()
            onClose()
        }
    }

    const subjectLength = Array.from(subject.trim()).length
    const bodyLength = Array.from(body.trim()).length
    const subjectValid = subjectLength >= 3 && subjectLength <= 200
    const bodyValid = bodyLength >= 10 && bodyLength <= 5000
    const evidenceValid = !evidence.trim() || isValidHttpUrl(evidence)
    const canSubmit = subjectValid && bodyValid && evidenceValid && !isSubmitting && !isUploadingEvidence

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-[520px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                            <Flag size={16} />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">ร้องเรียนโปรเจกต์</h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                </div>
                <p className="text-[12px] text-muted-foreground mb-4 ml-11">
                    โปรเจกต์: <span className="font-medium text-foreground">{projectTitle}</span>
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-[12px] text-amber-800">
                    คำร้องเรียนจะถูกส่งไปยังทีมงาน FlyUp เพื่อตรวจสอบ — คุณสามารถร้องเรียนโปรเจกต์นี้ได้เพียงครั้งเดียว
                </div>

                <div className="flex flex-col gap-3 mb-5">
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium">หัวข้อ <span className="text-error">*</span></label>
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="เช่น ข้อมูลโปรเจกต์ไม่ตรงกับความเป็นจริง"
                            className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                        />
                        <span className="text-[11px] text-muted-foreground">{subjectLength}/200</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium">รายละเอียด <span className="text-error">*</span></label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={6}
                            placeholder="อธิบายสิ่งที่ต้องการรายงานให้ละเอียด (อย่างน้อย 10 ตัวอักษร)"
                            className="border border-border rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary resize-none"
                        />
                        <span className="text-[11px] text-muted-foreground">{bodyLength}/5,000</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium">หลักฐานประกอบ (ถ้ามี)</label>
                        <p className="text-[11px] text-muted-foreground mb-1">แนบไฟล์ภาพหน้าจอหรือเอกสาร</p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingEvidence}
                                className="shrink-0 flex items-center gap-[6px] border border-border rounded-lg px-3 py-2 text-[13px] font-medium text-foreground hover:bg-gray-50 disabled:opacity-50"
                            >
                                {isUploadingEvidence ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                                แนบไฟล์
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                        {evidenceFileName && !isUploadingEvidence && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="truncate">แนบไฟล์แล้ว: {evidenceFileName}</span>
                                <button type="button" onClick={clearEvidence} className="shrink-0 hover:text-error" aria-label="ลบไฟล์แนบ">
                                    <XCircle size={14} />
                                </button>
                            </div>
                        )}
                        {evidenceError && (
                            <span className="text-[11px] text-error">
                                อัปโหลดไม่สำเร็จ หรือ URL หลักฐานไม่ถูกต้อง (ต้องเป็น HTTP/HTTPS และไม่เกิน 2,048 ตัวอักษร)
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border hover:bg-gray-50">ยกเลิก</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="px-4 py-2 text-[13px] rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
                        ส่งคำร้องเรียน
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ComplaintModal
