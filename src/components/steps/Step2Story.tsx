import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent, mergeAttributes } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import { SquarePlay, List, ImageIcon, Plus, ChevronDown, Check, X, Link as LinkIcon, Maximize, Unlink, HelpCircle, Trash2, Edit2 } from 'lucide-react'
import StepNavigation from "../StepNavigation"
import { useProjectStore } from '../../store/useProjectStore'
import { useParams } from 'react-router'
import toast from 'react-hot-toast'

// ✅ Custom Image Extension ที่รองรับการแนบลิงก์ (href) และจับรูปภาพจัด Align
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      href: {
        default: null,
        parseHTML: element => {
          // ถ้ามีลิงก์หุ้มอยู่ ให้ดึง href มา ถ้าไม่มีให้หาที่ data-href ของ span (ที่เราแอบสร้างไว้)
          const a = element.closest('a')
          const span = element.closest('span[data-href]')
          return a ? a.getAttribute('href') : (span ? span.getAttribute('data-href') : null)
        },
      },
      target: {
        default: '_blank',
      },
      align: {
        default: 'center',
      }
    }
  },
  renderHTML({ HTMLAttributes }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { href, target, align, ...imgAttributes } = HTMLAttributes

    let style = ''
    if (align === 'left') {
      style += 'float: left; margin: 0 1rem 1rem 0; width: 50%; max-width: 400px;'
    } else if (align === 'right') {
      style += 'float: right; margin: 0 0 1rem 1rem; width: 50%; max-width: 400px;'
    } else {
      style += 'display: block; margin: 0 auto; width: 100%;'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const img = ['img', mergeAttributes(this.options.HTMLAttributes, imgAttributes, { style })] as any

    if (href) {
      // ✅ ใช้ span ทรงเป็นลิงก์แทน a ตอนเรา render บน Editor จะได้ไม่ดื้อเด้งไปลิงก์จริงๆ
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ['span', { 'data-href': href, class: 'cursor-pointer block relative' }, img] as any
    }

    return img
  },
})

const Step2Story = () => {
  const { projectId } = useParams()
  const {
    currentProject, updateProjectInfo, updateProject, saveStory, setSaveStatus, loadCurrentProject,
    faqs, isSavingFaq, fetchFaqs, addFaq, editFaq, deleteFaq, uploadFile,
  } = useProjectStore()

  // FAQ ให้แก้ไขได้เฉพาะโปรเจกต์ที่ผ่านการอนุมัติแล้ว (draft/funding/executing เท่านั้น)
  const showFaqSection = ['draft', 'funding', 'executing'].includes(currentProject.state ?? '')

  // เรื่องราว (story content) แก้ไขได้เฉพาะตอน state เป็น 'draft' เป๊ะๆ เท่านั้น (backend เช็คตรงๆ ไม่มีข้อยกเว้น
  // ปฏิเสธด้วย "cannot edit stories unless project is in draft state") — ล็อกเป็น read-only แทนปล่อยให้กดแล้ว error
  const isLocked = !!currentProject.state && currentProject.state !== 'draft'

  // "ความเสี่ยง" (risks) ไม่ใช่ story — เป็นฟิลด์ของ project เอง ส่งผ่าน endpoint เดียวกับ Step1Basics
  // (PATCH /pioneer/projects/:id) เลยแก้ไขได้ระหว่าง funding/executing/pending_edit_review ได้เหมือนกัน
  // (ต้องผ่าน Admin อนุมัติก่อนมีผลจริง) ล็อกเฉพาะสถานะที่ backend ปฏิเสธ PATCH ตรงๆ เท่านั้น
  const RISKS_NOT_EDITABLE_STATES = ['pending_review', 'closed', 'cancelled', 'suspended', 'pending_cancel'];
  const isRisksLocked = !!currentProject.state && RISKS_NOT_EDITABLE_STATES.includes(currentProject.state);
  const isRisksReviewFlow = currentProject.state === 'funding' || currentProject.state === 'executing' || currentProject.state === 'pending_edit_review';
  const [risksSaved, setRisksSaved] = useState(currentProject.risks || '') // baseline ที่ "ส่งแล้ว" ไว้เทียบว่ามีแก้ที่ยังไม่ได้ส่งไหม
  const [isSendingRisks, setIsSendingRisks] = useState(false)

  // แสดงสถานะ "บันทึกแล้ว" ชั่วคราวแล้วเปลี่ยนกลับเป็น idle หลังจาก 2.5 วิ
  const triggerSaved = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  };
  const [isMenuExpanded, setIsMenuExpanded] = useState(false) // เปิด/ปิด floating toolbar เวลา cursor อยู่บรรทัดว่าง
  const [dropdownOpen, setDropdownOpen] = useState(false) // เปิด/ปิด dropdown เลือก block type (Paragraph/Heading/Subheading)
  const [mediaUrlInputOpen, setMediaUrlInputOpen] = useState(false) // เปิด/ปิดช่องกรอก URL สื่อ (รูป/youtube) ใน toolbar
  const [mediaUrl, setMediaUrl] = useState('') // ค่าที่พิมพ์ในช่องกรอก media URL
  const [risks, setRisks] = useState(currentProject.risks || '') // ข้อความ "ความเสี่ยงของโปรเจกต์" ผูกกับ textarea ด้านล่าง editor
  const risksRef = useRef<HTMLTextAreaElement>(null) // ใช้ปรับความสูง textarea ความเสี่ยงอัตโนมัติตามเนื้อหา
  const hasInitializedRef = useRef(false) // กันไม่ให้ sync risks/editor content จาก store ซ้ำมากกว่า 1 ครั้ง

  // ส่งค่า risks ที่แก้ไว้ให้ Admin ตรวจสอบ (ตอน isRisksReviewFlow จะไม่ auto-save ตอน blur แล้ว รอกดปุ่มนี้แทน)
  const handleSendRisks = async () => {
    if (!projectId || risks === risksSaved) return
    setIsSendingRisks(true)
    updateProjectInfo({ risks })
    const ok = await updateProject(Number(projectId), { risks })
    if (ok) {
      await loadCurrentProject(Number(projectId))
      setRisksSaved(risks)
      toast.success('ส่งการแก้ไขให้ Admin ตรวจสอบแล้ว')
    }
    setIsSendingRisks(false)
  }

  // FAQ state
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' }) // ฟอร์มเพิ่ม FAQ ใหม่
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null) // id ของ FAQ ที่กำลังแก้ไขอยู่ (null = ไม่มี)
  const [editFaqForm, setEditFaqForm] = useState({ question: '', answer: '' }) // ฟอร์มแก้ไข FAQ ที่เลือกไว้

  // โหลดรายการ FAQ จาก API เมื่อเงื่อนไข showFaqSection เป็นจริงและมี projectId แล้ว
  useEffect(() => {
    if (showFaqSection && projectId) {
      fetchFaqs(projectId)
    }
  }, [showFaqSection, projectId, fetchFaqs])

  // เพิ่ม FAQ ใหม่เข้าโปรเจกต์ แล้วเคลียร์ฟอร์มถ้าสำเร็จ
  const handleAddFaq = async () => {
    if (!projectId) return
    const ok = await addFaq(projectId, faqForm)
    if (ok) setFaqForm({ question: '', answer: '' })
  }

  // บันทึกการแก้ไข FAQ ตาม id แล้วปิดโหมดแก้ไขถ้าสำเร็จ
  const handleUpdateFaq = async (id: number) => {
    const ok = await editFaq(id, editFaqForm)
    if (ok) setEditingFaqId(null)
  }

  // ลบ FAQ ตาม id
  const handleDeleteFaq = async (id: number) => {
    await deleteFaq(id)
  }

  // ✅ State สำหรับลิงก์บนรูปภาพ
  const [imageLinkInputOpen, setImageLinkInputOpen] = useState(false)
  const [imageLinkUrl, setImageLinkUrl] = useState('')

  // ✅ State สำหรับ custom floating menu
  const [showFloatingMenu, setShowFloatingMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const editorContainerRef = useRef<HTMLDivElement>(null) // container ของ editor ทั้งก้อน ใช้คำนวณตำแหน่ง floating menu และเช็ค focus
  const fileInputRef = useRef<HTMLInputElement>(null) // input file ที่ซ่อนไว้ สำหรับอัปโหลดรูปเข้า editor
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null) // เก็บ timer ไว้ clear เวลา debounce การ save เนื้อหา story

  // ใช้ ref แทนตัวแปร isLocked ตรงๆ ใน onUpdate เพราะ debounce 500ms ด้านล่าง capture closure ไว้ตอน
  // onUpdate ถูกเรียก — ถ้า currentProject.state ยังโหลดไม่เสร็จตอนนั้น (isLocked=false ชั่วคราว) แล้วมา
  // true ทีหลัง save ที่ schedule ไว้แล้วจะยังยิงออกไปอยู่ดีถ้าไม่เช็คค่าล่าสุดจาก ref ตอน callback ทำงานจริง
  const isLockedRef = useRef(isLocked)
  useEffect(() => { isLockedRef.current = isLocked }, [isLocked])

  // สร้าง Tiptap editor instance พร้อม extension: StarterKit (พื้นฐาน), CustomImage (รูปที่ลิงก์/align ได้), Youtube, Placeholder
  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomImage.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      Youtube.configure({
        inline: false,
        HTMLAttributes: {
          class: 'w-full aspect-video rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder: 'Use text, images, videos, and audio to craft a compelling story.',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    // ทุกครั้งที่เนื้อหาเปลี่ยน: ปิดเมนูค้างๆ แล้ว debounce บันทึกเนื้อหาขึ้น store + backend (รอ 500ms หลังพิมพ์หยุด)
    onUpdate: ({ editor }) => {
      if (isLockedRef.current) return // กันไว้อีกชั้น เผื่อ update หลุดมาได้ตอน currentProject.state ยังโหลดไม่เสร็จ
      setIsMenuExpanded(false)
      setDropdownOpen(false)
      // debounce save story to store + backend
      setSaveStatus('saving')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        if (isLockedRef.current) return // เช็คค่าล่าสุดอีกครั้งตอน debounce ทำงานจริง (เผื่อ state เพิ่งโหลดเสร็จระหว่างรอ)
        const html = editor.getHTML()
        updateProjectInfo({ story: html })
        if (projectId) {
          await saveStory(Number(projectId), html)
        }
        triggerSaved()
      }, 500)
    },
    onSelectionUpdate: () => {
      setIsMenuExpanded(false)
      setDropdownOpen(false)
      setMediaUrlInputOpen(false)
    },
    content: currentProject.story || '',
    editable: !isLocked,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[400px] p-4 [&_img.ProseMirror-selectednode]:outline [&_img.ProseMirror-selectednode]:outline-4 [&_img.ProseMirror-selectednode]:outline-blue-500 [&_img.ProseMirror-selectednode]:outline-offset-2',
      },
    },
  })

  // sync editable state ทีหลังด้วย เพราะตอน editor ถูกสร้างครั้งแรก currentProject.state อาจยังโหลดไม่เสร็จ
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!isLocked)
  }, [editor, isLocked])

  // Sync risks และ editor content เมื่อ store โหลดข้อมูลจาก API เสร็จ
  useEffect(() => {
    if (!hasInitializedRef.current && (currentProject.risks || currentProject.story)) {
      hasInitializedRef.current = true
      if (currentProject.risks) setTimeout(() => { setRisks(currentProject.risks); setRisksSaved(currentProject.risks) }, 0)
      if (currentProject.story && editor) {
        editor.commands.setContent(currentProject.story, { emitUpdate: false })
      }
    }
  }, [currentProject.risks, currentProject.story, editor])

  // resize risks textarea เมื่อ risks state เปลี่ยน (รวมถึงตอน load จาก API)
  useEffect(() => {
    if (risksRef.current) {
      risksRef.current.style.height = 'auto'
      risksRef.current.style.height = risksRef.current.scrollHeight + 'px'
    }
  }, [risks])

  // ✅ ฟังก์ชันเช็คว่า cursor อยู่บนบรรทัดว่างหรือไม่ + คำนวณตำแหน่ง
  const updateFloatingMenu = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setShowFloatingMenu(false)
      return
    }

    const { state, view } = editor
    const { selection } = state
    const { $anchor, empty } = selection

    // ต้องเป็น empty selection และอยู่ root depth (ไม่เอาเงื่อนไข block ต้องว่างออก เพื่อให้โชว์ทุกบรรทัด)
    const isRootDepth = $anchor.depth === 1

    // ✅ อนุญาตให้โชว์เมนูต่อถ้า focus อยู่ใน editor หรือในเมนู (เช่นคลิกช่อง URL)
    const isFocusInside = view.hasFocus() || editorContainerRef.current?.contains(document.activeElement)

    if (!isFocusInside || !empty || !isRootDepth || isLocked) {
      setShowFloatingMenu(false)
      return
    }

    // คำนวณตำแหน่งของ cursor relative กับ editor container
    try {
      const coords = view.coordsAtPos(selection.from)
      const containerRect = editorContainerRef.current?.getBoundingClientRect()
      if (containerRect) {
        setMenuPosition({
          top: coords.top - containerRect.top,
          left: -40, // ✅ เลื่อนไปทางซ้ายสุด ให้อยู่นอก text area
        })
        setShowFloatingMenu(true)
      }
    } catch {
      setShowFloatingMenu(false)
    }
  }, [editor, isLocked])

  // ✅ ลงทะเบียน listener สำหรับ update/selection/focus/blur
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const handleUpdate = () => setTimeout(updateFloatingMenu, 0)
    const handleSelectionUpdate = () => setTimeout(updateFloatingMenu, 0)
    const handleFocus = () => setTimeout(updateFloatingMenu, 50)
    const handleBlur = () => {
      setTimeout(() => {
        // ✅ ไม่ปิดเมนูถ้า focus ย้ายมาอยู่ที่ input ภายใน editorContainer
        if (editorContainerRef.current?.contains(document.activeElement)) {
          return
        }
        setShowFloatingMenu(false)
        setIsMenuExpanded(false)
        setDropdownOpen(false)
      }, 200)
    }

    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleSelectionUpdate)
    editor.on('focus', handleFocus)
    editor.on('blur', handleBlur)

    // เรียกครั้งแรก
    setTimeout(updateFloatingMenu, 0)

    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleSelectionUpdate)
      editor.off('focus', handleFocus)
      editor.off('blur', handleBlur)
    }
  }, [editor, updateFloatingMenu])

  // ✅ ฟังก์ชันช่วยเช็คประเภท Block ปัจจุบัน
  const getCurrentBlockLabel = () => {
    if (editor?.isActive('heading', { level: 1 })) return 'Heading'
    if (editor?.isActive('heading', { level: 2 })) return 'Subheading'
    return 'Paragraph'
  }

  // ✅ ฟังก์ชันเพิ่มรูปภาพจากไฟล์
  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor || isLockedRef.current) return

    e.target.value = ''
    setIsMenuExpanded(false)

    // แสดง blob URL ก่อนทันทีเพื่อ UX
    const blobUrl = URL.createObjectURL(file)
    editor.chain().focus().setImage({ src: blobUrl, alt: file.name }).run()

    // Upload ขึ้น server แล้วแทนที่ blob URL ด้วย URL จริง
    try {
      const uploaded = await uploadFile(file)
      const serverUrl = uploaded?.url
      if (serverUrl) {
        const updatedHtml = editor.getHTML().replace(blobUrl, serverUrl)
        editor.commands.setContent(updatedHtml, { emitUpdate: false })
        updateProjectInfo({ story: updatedHtml })
        if (projectId) await saveStory(Number(projectId), updatedHtml)
      } else {
        throw new Error('upload failed')
      }
    } catch {
      toast.error('อัปโหลดรูปไม่สำเร็จ')
      // ลบรูปที่ยังเป็น blob URL ออกจาก editor
      const cleanedHtml = editor.getHTML().replace(/<img[^>]*src="blob:[^"]*"[^>]*>/g, '')
      editor.commands.setContent(cleanedHtml, { emitUpdate: false })
    } finally {
      URL.revokeObjectURL(blobUrl)
    }
  }, [editor, projectId, updateProjectInfo, saveStory, uploadFile])

  // ✅ ฟังก์ชันเพิ่ม media จาก URL
  const handleAddMediaUrl = useCallback(() => {
    const trimmedUrl = mediaUrl.trim()
    if (!trimmedUrl || !editor) return

    // ตรวจสอบว่าเป็น URL ของ Youtube หรือไม่
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/

    if (youtubeRegex.test(trimmedUrl)) {
      editor.chain().focus().setYoutubeVideo({ src: trimmedUrl }).run()
    } else {
      // ถ้าไม่ใช่ Youtube อนุมานว่าเป็นรูปภาพ
      editor.chain().focus().setImage({ src: trimmedUrl }).run()
    }

    setMediaUrl('')
    setMediaUrlInputOpen(false)
    setIsMenuExpanded(false)
  }, [editor, mediaUrl])

  return (
    <div className="flex flex-col gap-[40px] p-[10px]">
      <div className='flex flex-col p-[30px] bg-white-foreground rounded-[12px] gap-[15px]'>
        <div className="flex items-center justify-between mb-[10px]">
          <h1 className="text-[24px] font-semibold text-foreground">เรื่องราวของโปรเจกต์</h1>
          {isLocked && (
            <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-[10px] py-[4px] rounded-full">
              🔒 ล็อกแล้ว — แก้ไขเรื่องราวได้เฉพาะตอนโปรเจกต์ยังเป็นแบบร่างเท่านั้น
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* ✅ Container หลักต้องเป็น overflow-visible เพื่อให้เมนูเด้งออกมาได้ */}
          <p className='text-[14px] text-foreground'>ความเป็นมาของโปรเจกต์ <span className="text-error">*</span></p>
          <div
            tabIndex={0}
            ref={editorContainerRef}
            className="relative border border-border rounded-[6px] bg-background min-h-[450px] overflow-visible focus:outline-none focus-within:border-primary transition-all duration-200 hover:border-primary/50" // ✅ เพิ่ม margin left เพื่อเผื่อพื้นที่ให้ปุ่ม + ทางซ้าย
          >

            {/* ✅ Custom Floating Menu — แสดงเฉพาะบรรทัดว่างเท่านั้น */}
            {editor && showFloatingMenu && (
              <div
                className="absolute flex items-center space-x-2 z-50"
                style={{ top: menuPosition.top, left: menuPosition.left }} // ✅ ใช้ left ที่เซ็ตไว้เป็นติดลบ
              >
                {/* 1. ปุ่มบวก */}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsMenuExpanded(!isMenuExpanded)
                    if (!isMenuExpanded) { // ✅ ถ้ายำลังจะเปิดเมนู ให้รีเซ็ต state อื่นๆ
                      setDropdownOpen(false)
                      setMediaUrlInputOpen(false)
                      setMediaUrl('')
                    }
                  }}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all border border-gray-200 shadow-sm ${isMenuExpanded
                    ? 'bg-gray-100 text-gray-500' // ✅ สีเทาเมื่อเปิดเมนูแบบในรูป
                    : 'bg-[#e6fff5] text-[#00b374] hover:bg-[#cdffec] border-transparent'
                    }`}
                >
                  {isMenuExpanded ? <X size={18} strokeWidth={2.5} /> : <Plus size={20} />}
                </button>

                {/* 2. เมนูเครื่องมือ */}
                {isMenuExpanded && (
                  <div className="absolute top-full left-0 mt-2 flex items-center bg-white shadow-xl border border-gray-200 rounded-lg overflow-visible animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Dropdown Paragraph/Heading */}
                    <div className="relative flex border-r border-gray-100">
                      <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-w-[120px]"
                      >
                        <List size={16} className="text-gray-400" />
                        <span>{getCurrentBlockLabel()}</span>
                        <ChevronDown size={14} className="ml-auto text-gray-400" />
                      </button>

                      {dropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-44 bg-white shadow-2xl border border-gray-200 rounded-lg z-100 overflow-hidden">
                          <button
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); editor.chain().focus().setParagraph().run(); setDropdownOpen(false); setIsMenuExpanded(false); }}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50"
                          >
                            Paragraph
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); editor.chain().focus().toggleHeading({ level: 1 }).run(); setDropdownOpen(false); setIsMenuExpanded(false); }}
                            className="flex items-center w-full px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50 border-b border-gray-50"
                          >
                            Heading
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); editor.chain().focus().toggleHeading({ level: 2 }).run(); setDropdownOpen(false); setIsMenuExpanded(false); }}
                            className="flex items-center w-full px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                          >
                            Subheading
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Media & List Buttons */}
                    <div className="flex items-center">
                      <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleImageUpload(); }}
                        className="p-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-r border-gray-100 transition-colors"
                      >
                        <ImageIcon size={18} />
                      </button>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setMediaUrlInputOpen(true); }}
                        className="p-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-r border-gray-100 transition-colors"
                      >
                        <SquarePlay size={18} />
                      </button>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); editor.chain().focus().toggleBulletList().run(); setIsMenuExpanded(false); }}
                        className={`p-2.5 hover:bg-gray-50 transition-colors ${editor.isActive('bulletList') ? 'text-blue-600' : 'text-gray-500'}`}
                      >
                        <List size={18} />
                      </button>
                    </div>

                    {/* Input สำหรับ Media URL */}
                    {mediaUrlInputOpen && (
                      <div className="absolute inset-0 bg-white flex items-center px-2 z-110 rounded-lg">
                        <div className="flex items-center w-full bg-gray-50 rounded-md px-3 py-1 border border-gray-200">
                          <span className="text-xs font-semibold text-gray-400 mr-2 uppercase">Media URL</span>
                          <input
                            autoFocus
                            className="grow bg-transparent border-none outline-none text-sm text-gray-700 h-8"
                            placeholder="Paste the media URL in the input."
                            value={mediaUrl}
                            onChange={(e) => setMediaUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                e.stopPropagation()
                                handleAddMediaUrl()
                              }
                            }}
                            // ✅ stop propagation ทั้ง click และ mousedown เพื่อไม่ให้ editor ถือว่าโดน blur หรือ event ตีกัน
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          />
                          <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAddMediaUrl(); }} className="p-1 text-gray-400 hover:text-green-600"><Check size={18} /></button>
                          <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setMediaUrlInputOpen(false); }} className="p-1 text-gray-400 hover:text-red-500"><X size={18} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ✅ Hidden file input สำหรับ upload รูปภาพ */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* ✅ BubbleMenu จะปรากฏเมื่อคลิกที่รูปภาพเท่านั้น */}
            {editor && (
              <BubbleMenu
                pluginKey="imageBubbleMenu"
                editor={editor}
                shouldShow={({ state, editor }) => {
                  if (isLocked) return false
                  const { selection } = state
                  const isImage = (selection instanceof NodeSelection && selection.node.type.name === 'image') || editor.isActive('image')
                  return isImage
                }}
              >
                <div className="flex items-center bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 px-1 py-1 space-x-1 z-50">
                  {!imageLinkInputOpen ? (
                    // แถบไอคอนปกติ
                    <div className="flex items-center">
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const attrs = editor.getAttributes('image')
                          setImageLinkUrl(attrs.href || '')
                          setImageLinkInputOpen(true)
                        }}
                        className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${editor.getAttributes('image').href ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                        title="Add or edit link"
                      >
                        <LinkIcon size={18} />
                      </button>

                      {editor.getAttributes('image').href && (
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            editor.chain().focus().updateAttributes('image', { href: null }).run()
                          }}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                          title="Remove link"
                        >
                          <Unlink size={18} />
                        </button>
                      )}

                      <div className="w-px h-5 bg-gray-200 mx-1"></div>

                      <button
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          editor.chain().focus().updateAttributes('image', { align: 'center' }).run()
                        }}
                        className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${editor.getAttributes('image').align === 'center' || !editor.getAttributes('image').align ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}
                        title="Center & Full Width"
                      >
                        <Maximize size={18} />
                      </button>
                    </div>
                  ) : (
                    // ช่องกรอก URL สำหรับรูปภาพ
                    <div className="flex items-center bg-white px-2 py-1">
                      <LinkIcon size={14} className="text-gray-400 mr-2" />
                      <input
                        autoFocus
                        className="w-48 bg-transparent border-none outline-none text-sm text-gray-700 h-8"
                        placeholder="Paste link here..."
                        value={imageLinkUrl}
                        onChange={(e) => setImageLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            editor.chain().focus().updateAttributes('image', { href: imageLinkUrl }).run()
                            setImageLinkInputOpen(false)
                          }
                        }}
                      />
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault()
                          editor.chain().focus().updateAttributes('image', { href: imageLinkUrl }).run()
                          setImageLinkInputOpen(false)
                        }}
                        className="p-1 px-2 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setImageLinkInputOpen(false)
                        }}
                        className="p-1 px-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </BubbleMenu>
            )}
            <div
              onClickCapture={(e) => {
                // ✅ ดัก Event เพื่อป้องกันไม่ให้คลิกลิงก์แล้วหน้าเปลี่ยนขณะกำลังแก้ไข
                if ((e.target as Element).closest('a')) {
                  e.preventDefault()
                }
              }}
            >
              <EditorContent editor={editor} />
            </div>

          </div>
          <p className='text-[12px] text-muted-foreground'>*อธิบายความเป็นมาและรายละเอียด เชิงลึกเพื่อสร้างความเชื่อมั่น  *</p>
          <p className='text-[14px] text-foreground'>ความเสี่ยงของโปรเจกต์ <span className="text-error">*</span></p>
          <textarea
            ref={risksRef}
            value={risks}
            readOnly={isRisksLocked}
            onChange={(e) => {
              if (isRisksLocked) return
              setRisks(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onBlur={async () => {
              if (isRisksLocked) return
              if (risks === (currentProject.risks || '')) return;
              updateProjectInfo({ risks });
              if (isRisksReviewFlow) return; // ไม่ auto-save ทันที — รอกดปุ่ม "ส่งการแก้ไข" แทน
              setSaveStatus('saving');
              if (projectId) await updateProject(Number(projectId), { risks });
              triggerSaved();
            }}
            rows={3}
            className={`w-full border p-[12px] rounded-[8px] resize-none focus:outline-none transition-all duration-200 overflow-hidden ${isRisksLocked ? 'border-border bg-surface-disabled text-muted-foreground cursor-not-allowed opacity-70' : 'border-border bg-background focus:border-primary hover:border-primary/50'}`}/>
          <p className='text-[12px] text-muted-foreground'>*ระบุความเสี่ยงที่อาจเกิดขึ้น  เพื่อให้ผู้สนับสนุนได้รับทราบข้อมูลที่ครบถ้วน  *</p>
          {isRisksReviewFlow && risks !== risksSaved && (
            <div className="flex items-center justify-between gap-[12px] px-[16px] py-[12px] rounded-[10px] bg-amber-50 border border-amber-200">
              <p className="text-[12px] text-amber-800">✏️ แก้ไขความเสี่ยงยังไม่ได้ส่ง — ต้องกดส่งให้ Admin ตรวจสอบก่อนมีผลจริง</p>
              <button
                onClick={handleSendRisks}
                disabled={isSendingRisks}
                className="shrink-0 px-[14px] h-[32px] rounded-[8px] bg-primary hover:bg-primary-hover text-white text-[12px] font-medium transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSendingRisks ? 'กำลังส่ง...' : 'ส่งการแก้ไข'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FAQ Section */}
      {showFaqSection && (
        <div className='flex flex-col p-[30px] bg-white-foreground rounded-[12px] gap-[20px]'>
          <div className='flex items-center gap-[8px]'>
            <HelpCircle size={18} className='text-foreground' />
            <h2 className='text-[18px] font-semibold text-foreground'>คำถามที่พบบ่อย (FAQ)</h2>
          </div>
          <p className='text-[13px] text-muted-foreground -mt-[10px]'>ตอบคำถามที่ผู้สนับสนุนมักสงสัย เพื่อสร้างความเชื่อมั่น</p>

          {/* List existing FAQs */}
          {faqs.length > 0 && (
            <div className='flex flex-col gap-[12px]'>
              {faqs.map(faq => (
                <div key={faq.id} className='border border-border rounded-[10px] p-[16px] flex flex-col gap-[10px] bg-background'>
                  {editingFaqId === faq.id ? (
                    <>
                      <input
                        value={editFaqForm.question}
                        onChange={e => setEditFaqForm(p => ({ ...p, question: e.target.value }))}
                        placeholder='คำถาม'
                        className='border border-border rounded-[8px] px-[12px] py-[8px] text-[14px] outline-none focus:border-primary transition-colors bg-white'
                      />
                      <textarea
                        ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                        value={editFaqForm.answer}
                        onChange={e => setEditFaqForm(p => ({ ...p, answer: e.target.value }))}
                        onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                        placeholder='คำตอบ'
                        rows={3}
                        className='border border-border rounded-[8px] px-[12px] py-[8px] text-[14px] outline-none focus:border-primary transition-colors bg-white resize-none overflow-hidden'
                      />
                      <div className='flex gap-[8px]'>
                        <button
                          data-testid={`faq-edit-save-btn-${faq.id}`}
                          onClick={() => handleUpdateFaq(faq.id)}
                          className='flex items-center gap-[4px] text-[13px] text-green-600 hover:text-green-700 font-medium'
                        >
                          <Check size={14} /> บันทึก
                        </button>
                        <button
                          data-testid={`faq-edit-cancel-btn-${faq.id}`}
                          onClick={() => setEditingFaqId(null)}
                          className='flex items-center gap-[4px] text-[13px] text-muted-foreground hover:text-foreground'
                        >
                          <X size={14} /> ยกเลิก
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className='flex items-start justify-between gap-[8px]'>
                        <p className='font-semibold text-foreground text-[14px]'>Q: {faq.question}</p>
                        <div className='flex gap-[8px] shrink-0'>
                          <button
                            data-testid={`faq-edit-open-btn-${faq.id}`}
                            onClick={() => { setEditingFaqId(faq.id); setEditFaqForm({ question: faq.question, answer: faq.answer }) }}
                            className='text-muted-foreground hover:text-primary transition-colors'
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            data-testid={`faq-delete-btn-${faq.id}`}
                            onClick={() => handleDeleteFaq(faq.id)}
                            className='text-muted-foreground hover:text-error transition-colors'
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className='text-[14px] text-muted-foreground'>A: {faq.answer}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new FAQ */}
          <div className='flex flex-col gap-[10px] border border-dashed border-border rounded-[10px] p-[16px]'>
            <p className='text-[13px] font-medium text-foreground'>เพิ่มคำถามใหม่</p>
            <input
              data-testid="faq-question-input"
              value={faqForm.question}
              onChange={e => setFaqForm(p => ({ ...p, question: e.target.value }))}
              placeholder='คำถาม เช่น "โปรเจกต์จะเสร็จเมื่อไหร่?"'
              className='border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors bg-background'
            />
            <textarea
              data-testid="faq-answer-input"
              value={faqForm.answer}
              onChange={e => setFaqForm(p => ({ ...p, answer: e.target.value }))}
              onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
              placeholder='คำตอบ'
              rows={3}
              className='border border-border rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors bg-background resize-none overflow-hidden'
            />
            <button
              data-testid="faq-add-btn"
              onClick={handleAddFaq}
              disabled={isSavingFaq}
              className='self-start flex items-center gap-[6px] bg-primary hover:bg-primary-hover text-white px-[16px] py-[8px] rounded-[8px] text-[14px] font-medium transition-colors disabled:opacity-50'
            >
              <Plus size={15} />
              {isSavingFaq ? 'กำลังบันทึก...' : 'เพิ่ม FAQ'}
            </button>
          </div>
        </div>
      )}

      <StepNavigation />
    </div>
  )
}

export default Step2Story
