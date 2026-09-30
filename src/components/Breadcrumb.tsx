import { useEffect, useRef } from 'react'
import { Link, useParams, useLocation } from "react-router"
import { ChevronRight, Eye, CloudCheck, Loader2 } from 'lucide-react'
import { useProjectStore } from '../store/useProjectStore'
import toast from 'react-hot-toast'

interface BreadcrumbItems {
    title: string;
}

const stepItems: BreadcrumbItems[] = [
    { title: 'ภาพรวมโปรเจกต์' },
    { title: 'ข้อมูลพื้นฐาน' },
    { title: 'เรื่องราว' },
    { title: 'ไมล์สโตน' },
    { title: 'ข้อตกลง' },
]

const Breadcrumb = () => {

    const { projectId } = useParams()
    const location = useLocation()
    const saveStatus = useProjectStore(s => s.saveStatus)
    const savingToastId = useRef<string | undefined>(undefined)

    useEffect(() => {
        if (saveStatus === 'saving') {
            savingToastId.current = toast.loading('กำลังบันทึก...', { id: 'save-status' })
        } else if (saveStatus === 'saved') {
            toast.success('บันทึกแล้ว', { id: 'save-status', duration: 2000 })
        } else {
            toast.dismiss('save-status')
        }
    }, [saveStatus])

    const currentStepNum = location.pathname.includes('/step/') ? Number(location.pathname.split('/').pop()) : 0;

    // 2. กรองข้อมูล: เอาตั้งแต่ index 0 จนถึง index ปัจจุบัน
    // เช่น ถ้า current = 3, มันจะดึง 0, 1, 2, 3 มาทั้งหมด
    const activeStepItems = stepItems.filter((_, i) => i <= currentStepNum);

    return (
        <div className="flex min-w-0 flex-col gap-3 p-[10px] lg:flex-row lg:items-center lg:justify-between">
            <ul className="flex w-full min-w-0 overflow-x-auto whitespace-nowrap lg:w-auto">
                {
                    activeStepItems.map((item, idx) => {
                        const isLastItem = idx === activeStepItems.length - 1;
                        return (
                            <li key={idx} className="flex shrink-0 text-[14px] text-muted-foreground items-center">
                                {
                                    !isLastItem ? (
                                        <Link to={idx === 0 ? `/project/overview/${projectId}` : `/project/overview/${projectId}/step/${idx}`} className="hover:text-foreground transition-all duration-200">
                                            {item.title}
                                        </Link>
                                    ) : (
                                        <span>
                                            {item.title}
                                        </span>
                                    )
                                }
                                {!isLastItem && <ChevronRight className="text-foreground mx-[4px]" size={16} />}
                            </li>
                        )
                    })
                }
            </ul>
            <div className="flex w-full items-center justify-end gap-[12px] lg:w-auto lg:shrink-0">
                {saveStatus === 'saving' && (
                    <div className="flex items-center gap-[6px] text-muted-foreground text-[13px]">
                        <Loader2 size={14} className="animate-spin" />
                        <span>กำลังบันทึก...</span>
                    </div>
                )}
                {saveStatus === 'saved' && (
                    <div className="flex items-center gap-[6px] text-green-600 text-[13px]">
                        <CloudCheck size={14} />
                        <span>บันทึกแล้ว</span>
                    </div>
                )}
                {saveStatus === 'idle' && <CloudCheck size={16} className="text-muted-foreground" />}
                <Link to={`/preview/${projectId}`} state={{ from: location.pathname }} className="border border-border bg-white-foreground text-foreground rounded-[4px] flex shrink-0 gap-[10px] p-[8px] w-[165px] h-[38px] items-center justify-center hover:bg-white-foreground/50 transition-all duration-200">
                    <Eye size={16} />
                    <span className="text-[14px] font-medium">ดูตัวอย่าง</span>
                </Link>
            </div>
        </div>
    )
}

export default Breadcrumb
