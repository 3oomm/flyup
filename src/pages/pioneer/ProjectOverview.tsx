import { useEffect, useState } from 'react';
import { type LucideIcon, CircleCheckBig, Send, BookOpen, ArrowLeft } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router'
import { useProjectStore, type Project } from '../../store/useProjectStore';

interface StageItems {
  icon: LucideIcon;
  title: string;
  des: string;
  isComplete: (p: Project, projectId?: string) => boolean;
}

// รายการการ์ดสรุปแต่ละ step (1-4) พร้อมเงื่อนไขเช็คว่ากรอกครบหรือยัง — ใช้แสดงไอคอนติ๊กเขียวในหน้า overview นี้
const step: StageItems[] = [
  {
    icon: CircleCheckBig,
    title: 'ข้อมูลพื้นฐาน',
    des: 'ตั้งชื่อโครงการของคุณ อัปโหลดรูปภาพหรือวิดีโอ และกำหนดรายละเอียดของโปรเจกต์',
    isComplete: (p) =>
      !!p.title && !!p.description && p.categoryId > 0 &&
      p.fundingGoal > 0 && p.projectDuration > 0 &&
      p.campaignDuration > 0 && p.revenueShare > 0 && p.files.length > 0,
  },
  {
    icon: CircleCheckBig,
    title: 'เรื่องราว',
    des: 'เพิ่มคำอธิบายโครงการโดยละเอียด พร้อมระบุถึงความเสี่ยงและความท้าทายที่อาจเกิดขึ้น',
    isComplete: (p) => !!p.story && p.story !== '<p></p>' && !!p.risks,
  },
  {
    icon: CircleCheckBig,
    title: 'Milestones',
    des: 'กำหนดช่วงเวลาและเป้าหมายหลักในแต่ละระยะของโครงการ เพื่อให้ผู้สนับสนุนเห็นแผนการดำเนินงานที่ชัดเจน (เช่น วันเริ่ม, วันเริ่มสิ้นสุด)',
    isComplete: (p) =>
      p.milestones?.length === 4 &&
      p.milestones.every(m => !!m.title && !!m.description && (m.duration ?? 0) > 0),
  },
  {
    icon: CircleCheckBig,
    title: 'ข้อตกลงและเงื่อนไข',
    des: 'ยอมรับข้อกำหนดในการให้บริการ นโยบายความเป็นส่วนตัว และยืนยันความรับผิดชอบในการดำเนินโครงการให้สำเร็จตามที่ระบุไว้',
    isComplete: (_, projectId) =>
      projectId ? localStorage.getItem(`agreed_${projectId}`) === 'true' : false,
  },
]

const ProjectOverview = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { currentProject, projects, loadCurrentProject, fetchMyProjects, submitProject } = useProjectStore()
  const [showModal, setShowModal] = useState(false) // เปิด/ปิด modal ยืนยันส่งโปรเจกต์
  const [isSubmitting, setIsSubmitting] = useState(false) // กันกดส่งซ้ำระหว่างรอ API ตอบกลับ

  // โหลดข้อมูลโปรเจกต์เข้า store ทุกครั้งที่ projectId เปลี่ยน (เช่น เข้าหน้านี้ครั้งแรก หรือรีเฟรชหน้า)
  useEffect(() => {
    if (projectId) loadCurrentProject(Number(projectId));
  }, [projectId, loadCurrentProject]);

  useEffect(() => {
    fetchMyProjects();
  }, [fetchMyProjects]);

  // ปุ่ม "ส่งคำขอสร้างโปรเจกต์" กดได้ก็ต่อเมื่อทั้ง 4 step กรอกข้อมูลครบทุกอัน
  const canSubmit = step.every(s => s.isComplete(currentProject, projectId))
  const hasPendingEditReview = projects.some(project =>
    project.id !== Number(projectId) && project.state === 'pending_edit_review'
  )

  // ยิง submit โปรเจกต์ไป backend เพื่อรอ Admin อนุมัติ แล้วพากลับไปหน้ารายการโปรเจกต์ถ้าสำเร็จ
  const handleSubmit = async () => {
    setIsSubmitting(true)
    const ok = await submitProject(projectId!)
    if (ok) {
      navigate('/pioneer/dashboard/projects')
      setShowModal(false)
    }
    // ถ้าส่งไม่สำเร็จ (เช่น มีโปรเจกต์ที่ดำเนินอยู่แล้ว) ให้เปิด Modal ค้างไว้
    // เพื่อให้ผู้ใช้เห็น toast แจ้งเตือนข้อผิดพลาดชัดเจน ไม่ใช่ Modal หายไปเฉยๆ
    setIsSubmitting(false)
  }

  return (
    <>
      <div className='w-full mx-auto max-w-[937px] py-[100px]'>
        <button
          onClick={() => navigate('/pioneer/dashboard/projects')}
          className='flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 px-2.5 cursor-pointer'
        >
          <ArrowLeft size={16} /> กลับไปยังโปรเจกต์ของฉัน
        </button>
        <div className='flex items-center justify-between p-2.5'>
          <h1 className='text-[24px] font-semibold text-foreground'>ภาพรวมของโปรเจกต์</h1>
          <Link
            to='/project/guide'
            className='flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors text-[13px] font-medium'
          >
            <BookOpen size={15} />
            อ่านคู่มือการสร้างโปรเจกต์
          </Link>
        </div>
        <div className='flex flex-col p-[10px] gap-[10px]'>
          <p className='text-[12px] text-primary'>กำลังสร้างโปรเจกต์</p>
          {step.map((s, idx) => {
            const Icon = s.icon;
            const done = s.isComplete(currentProject, projectId);
            return (
              <Link to={`/project/overview/${projectId}/step/${idx + 1}`} key={idx} className='flex border border-border bg-white-foreground px-[15px] py-[10px] gap-[5px] h-[90px] items-center rounded-[10px] cursor-pointer hover:bg-white-foreground/50 transition-all duration-200'>
                <Icon size={40} className={done ? 'text-green-500 shrink-0' : 'text-primary-light shrink-0'} strokeWidth={2} />
                <div className='flex flex-col p-[10px] gap-[4px]'>
                  <h2 className='text-foreground text-[18px] font-semibold'>{s.title}</h2>
                  <p className='text-muted-foreground text-[14px]'>{s.des}</p>
                </div>
              </Link>
            )
          })}
        </div>
        {currentProject.state === 'draft' && (
          <div className='flex justify-end p-[10px] mt-[10px]'>
            <button
              disabled={!canSubmit || hasPendingEditReview}
              onClick={() => setShowModal(true)}
              title={hasPendingEditReview ? 'มีโปรเจกต์ที่กำลังรอ Admin ตรวจสอบการแก้ไข' : undefined}
              className='flex h-[38px] bg-primary text-white-foreground rounded-[12px] w-[190px] justify-center items-center gap-[10px] hover:bg-primary-hover transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary cursor-pointer'>
              <Send size={16} strokeWidth={1} />
              <span className='text-[14px]'>ส่งคำขอสร้างโปรเจกต์</span>
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] p-[40px] w-[90%] max-w-[500px] shadow-2xl flex flex-col items-center">
            <h2 className="text-[24px] font-bold text-foreground mb-[24px]">ยืนยันส่งโปรเจกต์</h2>
            <div className="flex flex-col items-center gap-[8px] mb-[40px] text-[16px] text-muted-foreground text-center">
              <p>โปรเจกต์ <span className="font-semibold text-foreground">"{currentProject.title}"</span> จะถูกส่งไปยัง Admin เพื่อตรวจสอบ</p>
              <p>คุณจะได้รับแจ้งเตือนเมื่อได้รับการอนุมัติ</p>
            </div>
            <div className="grid grid-cols-2 gap-[16px] w-full">
              <button
                onClick={() => setShowModal(false)}
                className="h-[48px] rounded-[12px] border border-border text-foreground font-medium hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                data-testid="project-overview-submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || hasPendingEditReview}
                className="h-[48px] rounded-[12px] bg-primary text-white font-medium hover:bg-primary-hover flex items-center justify-center gap-[8px] transition-colors disabled:opacity-50"
              >
                <Send size={16} />
                {isSubmitting ? 'กำลังส่ง...' : 'ส่งคำขอ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProjectOverview
