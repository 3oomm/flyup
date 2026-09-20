import { useState, useRef } from 'react'
import { Upload, X, Plus, CheckCircle2, Circle, ExternalLink, Loader2, Send } from 'lucide-react'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'
import type { EvidenceLink, MilestoneData } from './types'
import { useMilestoneStore } from '../../../store/useMilestoneStore'
import { isValidHttpUrl } from '../../../lib/validation'

const MIN_SUMMARY_LENGTH = 50

interface EvidenceFormProps {
  criteria: MilestoneData['criteria']
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: (summary: string, files: File[], links: EvidenceLink[], checkedCriteria: string[]) => Promise<void>
}

const EvidenceForm = ({ criteria, isSubmitting, onCancel, onSubmit }: EvidenceFormProps) => {
  const uploadProgress = useMilestoneStore(s => s.uploadProgress) // บอกความคืบหน้าอัปโหลดไฟล์ทีละไฟล์ ระหว่างกำลังส่งหลักฐาน
  const [summary, setSummary] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [links, setLinks] = useState<EvidenceLink[]>([{ name: '', url: '' }])
  const [checkedCriteria, setCheckedCriteria] = useState<boolean[]>(criteria.map(() => false))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [summaryError, setSummaryError] = useState(false)
  const [criteriaError, setCriteriaError] = useState(false)
  const [filesError, setFilesError] = useState(false)
  const [linksError, setLinksError] = useState(false)

  const toggleCriteria = (i: number) => {
    setCheckedCriteria(prev => prev.map((v, idx) => idx === i ? !v : v))
    setCriteriaError(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setFiles(prev => [...prev, ...Array.from(e.target.files!)])
    setFilesError(false)
  }
  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const addLink = () => setLinks(prev => [...prev, { name: '', url: '' }])
  const removeLink = (i: number) => setLinks(prev => prev.filter((_, idx) => idx !== i))
  const updateLink = (i: number, field: 'name' | 'url', val: string) => {
    setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
    if (field === 'url') setLinksError(false)
  }

  const allCriteriaChecked = criteria.length === 0 || checkedCriteria.every(v => v)

  const handleSubmit = async () => {
    const validLinks = links.filter(l => l.url.trim())
    const summaryLength = Array.from(summary.trim()).length
    let hasError = false

    const isSummaryInvalid = summaryLength < MIN_SUMMARY_LENGTH
    const isCriteriaInvalid = !allCriteriaChecked
    const isFilesInvalid = files.length === 0
    const isLinksInvalid = validLinks.length === 0 || validLinks.some(link => !isValidHttpUrl(link.url))

    if (isSummaryInvalid) { setSummaryError(true); hasError = true }
    if (isCriteriaInvalid) { setCriteriaError(true); hasError = true }
    if (isFilesInvalid) { setFilesError(true); hasError = true }
    if (isLinksInvalid) {
      setLinksError(true)
      hasError = true
    }
    if (hasError) {
      if (isSummaryInvalid) {
        toast.error(`กรุณาสรุปผลงานอย่างน้อย ${MIN_SUMMARY_LENGTH} ตัวอักษร (ปัจจุบัน ${summaryLength} ตัวอักษร)`)
      } else if (isCriteriaInvalid) {
        toast.error('กรุณาติ๊กเกณฑ์การยอมรับให้ครบทุกข้อ')
      } else if (isFilesInvalid) {
        toast.error('กรุณาอัปโหลดไฟล์หลักฐานอย่างน้อย 1 ไฟล์')
      } else {
        toast.error('กรุณาใส่ลิงก์ HTTP/HTTPS ที่ถูกต้องอย่างน้อย 1 ลิงก์')
      }
      return
    }

    const result = await Swal.fire({
      title: 'ยืนยันการส่งหลักฐาน?',
      text: 'เมื่อส่งแล้วจะไม่สามารถแก้ไขหลักฐานได้ กรุณาตรวจสอบให้ครบถ้วนก่อนยืนยัน',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน ส่งหลักฐาน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#16A34A',
      cancelButtonColor: '#6B7280',
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    const checkedTexts = criteria.filter((_, i) => checkedCriteria[i])
    await onSubmit(summary.trim(), files, validLinks, checkedTexts)
  }

  return (
    <div className="border-t border-border px-[20px] py-[20px] flex flex-col gap-[20px]">

      {/* Summary */}
      <div>
        <p className="text-[13px] font-semibold text-foreground mb-[4px]">
          สรุปผลงาน <span className="text-[#EF4444]">*</span>
        </p>
        <p className="text-[12px] text-muted-foreground mb-[10px]">อธิบายสิ่งที่ทำสำเร็จใน Phase นี้โดยย่อ</p>
        <textarea
          value={summary}
          onChange={e => { setSummary(e.target.value); setSummaryError(false) }}
          rows={3}
          placeholder="เช่น พัฒนาระบบคลังข้อมูลเสร็จสมบูรณ์ พร้อมคู่มือแนะนำการใช้งาน..."
          className={`w-full px-[12px] py-[10px] rounded-[10px] border text-[13px] outline-none resize-none transition-colors ${summaryError ? 'border-[#EF4444]' : 'border-border focus:border-primary'}`}
        />
        <p className={`text-[11px] mt-[4px] text-right ${Array.from(summary.trim()).length < MIN_SUMMARY_LENGTH ? 'text-muted-foreground' : 'text-primary'}`}>
          {Array.from(summary.trim()).length}/{MIN_SUMMARY_LENGTH} ตัวอักษรขั้นต่ำ
        </p>
        {summaryError && (
          <p className="text-[12px] text-[#EF4444] mt-[4px]">กรุณาสรุปผลงานอย่างน้อย {MIN_SUMMARY_LENGTH} ตัวอักษร</p>
        )}
      </div>

      {/* Criteria */}
      {criteria.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-foreground mb-[4px]">
            เกณฑ์การยอมรับ <span className="text-[#EF4444]">*</span>
          </p>
          <p className="text-[12px] text-muted-foreground mb-[10px]">ติ๊กทุกข้อที่ทำเสร็จเรียบร้อยแล้ว</p>
          <div className="flex flex-col gap-[8px]">
            {criteria.map((c, i) => (
              <button
                key={i}
                onClick={() => toggleCriteria(i)}
                className="flex items-center gap-[10px] p-[12px] rounded-[10px] border border-border hover:bg-[#F8F9FA] transition-colors cursor-pointer text-left w-full"
              >
                {checkedCriteria[i]
                  ? <CheckCircle2 size={18} className="text-primary shrink-0" />
                  : <Circle size={18} className="text-muted-foreground shrink-0" />
                }
                <span className="text-[13px] text-foreground">{c}</span>
              </button>
            ))}
          </div>
          {criteriaError && (
            <p className="text-[12px] text-[#EF4444] mt-[4px]">กรุณาติ๊กเกณฑ์การยอมรับให้ครบทุกข้อก่อนส่งหลักฐาน</p>
          )}
        </div>
      )}

      {/* File upload */}
      <div>
        <p className="text-[13px] font-semibold text-foreground mb-[4px]">
          ไฟล์แนบ <span className="text-[#EF4444]">*</span>
        </p>
        <p className="text-[12px] text-muted-foreground mb-[10px]">รูปภาพ (≤10MB) หรือ PDF (≤50MB)</p>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full flex items-center justify-center gap-[8px] p-[20px] border-2 border-dashed rounded-[12px] cursor-pointer hover:bg-[#F8F9FA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${filesError ? 'border-[#EF4444]' : 'border-border hover:border-primary/50'}`}
        >
          <Upload size={16} className="text-muted-foreground" />
          <span className="text-[13px] text-muted-foreground">อัปโหลดไฟล์</span>
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
        {filesError && (
          <p className="text-[12px] text-[#EF4444] mt-[4px]">กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์</p>
        )}
        {files.length > 0 && (
          <div className="flex flex-col gap-[6px] mt-[10px]">
            {files.map((f, i) => {
              // สถานะการอัปโหลดของไฟล์นี้ตาม uploadProgress ที่ store รายงานมา (อัปโหลดทีละไฟล์ตามลำดับ)
              const fileStatus = !isSubmitting || !uploadProgress
                ? 'idle'
                : i < uploadProgress.current ? 'done'
                : i === uploadProgress.current ? 'uploading'
                : 'waiting'
              return (
                <div key={i} className="flex items-center justify-between px-[12px] py-[8px] rounded-[8px] bg-[#F8F9FA] border border-border">
                  <div className="flex items-center gap-[8px] min-w-0">
                    {fileStatus === 'uploading' && <Loader2 size={13} className="animate-spin text-primary shrink-0" />}
                    {fileStatus === 'done' && <CheckCircle2 size={13} className="text-[#2BA88E] shrink-0" />}
                    <span className={`text-[12px] truncate max-w-[220px] ${fileStatus === 'waiting' ? 'text-muted-foreground' : 'text-foreground'}`}>{f.name}</span>
                  </div>
                  {!isSubmitting && (
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-[#EF4444] transition-colors cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* External links */}
      <div>
        <p className="text-[13px] font-semibold text-foreground mb-[4px]">
          ลิงก์ภายนอก <span className="text-[#EF4444]">*</span>
        </p>
        <p className="text-[12px] text-muted-foreground mb-[10px]">GitHub, Figma, วิดีโอ หรือลิงก์อื่นๆ</p>
        <div className="flex flex-col gap-[8px]">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-[8px]">
              <input
                type="text"
                placeholder="ชื่อ (เช่น GitHub)"
                value={link.name}
                onChange={e => updateLink(i, 'name', e.target.value)}
                className="w-[140px] shrink-0 px-[10px] py-[8px] rounded-[8px] border border-border text-[13px] outline-none focus:border-primary"
              />
              <div className={`flex-1 flex items-center gap-[6px] px-[10px] py-[8px] rounded-[8px] border focus-within:border-primary ${linksError && !link.url.trim() ? 'border-[#EF4444]' : 'border-border'}`}>
                <ExternalLink size={14} className="text-muted-foreground shrink-0" />
                <input
                  type="url"
                  placeholder="https://..."
                  value={link.url}
                  onChange={e => updateLink(i, 'url', e.target.value)}
                  className="flex-1 text-[13px] outline-none bg-transparent"
                />
              </div>
              {links.length > 1 && (
                <button onClick={() => removeLink(i)} className="text-muted-foreground hover:text-[#EF4444] transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {linksError && (
            <p className="text-[12px] text-[#EF4444]">กรุณาใส่ลิงก์ HTTP/HTTPS ที่ถูกต้อง ไม่เกิน 2,048 ตัวอักษร และไม่มี username/password</p>
          )}
          <button
            onClick={addLink}
            className="flex items-center gap-[6px] text-[13px] text-primary hover:underline w-fit mt-[2px] cursor-pointer"
          >
            <Plus size={14} /> เพิ่มลิงก์
          </button>
        </div>
      </div>

      {/* Upload progress banner */}
      {isSubmitting && (
        <div className="flex items-center gap-[10px] px-[14px] py-[10px] rounded-[10px] bg-primary/5 border border-primary/20">
          <Loader2 size={16} className="animate-spin text-primary shrink-0" />
          <span className="text-[13px] text-primary font-medium">
            {uploadProgress
              ? `กำลังอัปโหลดไฟล์ ${uploadProgress.current}/${uploadProgress.total}...`
              : 'กำลังส่งหลักฐาน...'}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-[10px] pt-[4px]">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-[20px] py-[9px] rounded-[10px] border border-border text-[13px] font-medium text-foreground hover:bg-[#F8F9FA] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ยกเลิก
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-[6px] px-[20px] py-[9px] rounded-[10px] bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {isSubmitting
            ? (uploadProgress ? `กำลังอัปโหลด ${uploadProgress.current}/${uploadProgress.total}...` : 'กำลังส่ง...')
            : 'ส่งหลักฐาน'}
        </button>
      </div>
    </div>
  )
}

export default EvidenceForm
