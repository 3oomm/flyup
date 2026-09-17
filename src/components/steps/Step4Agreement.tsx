import { useEffect, useState } from "react";
import { Eye, Send } from "lucide-react";
import StepNavigation from "../StepNavigation";
import { useProjectStore } from "../../store/useProjectStore";
import { useNavigate, useParams } from "react-router";

const Step4Agreement = () => {
  const navigate = useNavigate()
  const { projectId } = useParams();
  const { currentProject, projects, fetchMyProjects, submitProject } = useProjectStore();

  useEffect(() => {
    fetchMyProjects();
  }, [fetchMyProjects]);

  const blockingStates = new Set(['funding', 'pending_review', 'executing', 'pending_cancel', 'pending_edit_review']);
  const hasBlockingProject = projects.some(project =>
    project.id !== Number(projectId) && blockingStates.has(project.state)
  );

  // ต้องมีครบ 4 milestone และแต่ละอันกรอก title/description/duration ครบ ถึงจะกดส่งคำขอได้
  const allMilestonesComplete = currentProject.milestones?.length === 4 &&
    currentProject.milestones.every(m => !!m.title && !!m.description && m.duration > 0);

  // ถ้าโปรเจกต์ผ่านสถานะ draft/pending_review ไปแล้ว แสดงว่ายอมรับข้อตกลงไปก่อนหน้านี้แล้ว
  const alreadySubmitted = !!currentProject.state &&
    currentProject.state !== 'draft' &&
    currentProject.state !== 'pending_review';

  // State สำหรับเก็บค่าการยอมรับข้อตกลงและเงื่อนไข — sync กับ localStorage
  const [localAgreed, setLocalAgreed] = useState(() =>
    projectId ? localStorage.getItem(`agreed_${projectId}`) === 'true' : false
  );

  // ถ้าโปรเจกต์ผ่าน draft/pending_review ไปแล้ว = ยอมรับไปก่อนหน้านี้แล้วเสมอ
  const isAgreed = alreadySubmitted || localAgreed;

  const handleAgreedChange = (checked: boolean) => {
    if (alreadySubmitted) return;
    setLocalAgreed(checked);
    if (projectId) localStorage.setItem(`agreed_${projectId}`, String(checked));
  };

  // State สำหรับเปิด/ปิด Modal ยืนยันการส่งโปรเจกต์
  const [showModal, setShowModal] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ฟังก์ชันจัดรูปแบบตัวเลข (เพื่อแสดงเป้าหมายเงินทุนให้อ่านง่ายขึ้น เช่น 10,000)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH").format(amount);
  };

  // ฟังก์ชันจัดการเมื่อกดยืนยันส่งโปรเจกต์ใน Modal
  const handleSubmitProject = async () => {
    setIsSubmitting(true);
    if (projectId) {
      const ok = await submitProject(projectId);
      if (ok) {
        setShowModal(false);
        navigate(`/pioneer/dashboard/projects`);
      }
      // ถ้าส่งไม่สำเร็จ (เช่น มีโปรเจกต์ที่ดำเนินอยู่แล้ว) ให้เปิด Modal ค้างไว้
      // เพื่อให้ผู้ใช้เห็น toast แจ้งเตือนข้อผิดพลาดชัดเจน ไม่ใช่ Modal หายไปเฉยๆ
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex flex-col gap-[40px] p-[10px]">
        {/* =========================================
            ส่วนที่ 1: สรุปข้อมูลโปรเจกต์ (Project Summary)
            ========================================= */}
        <div className="flex flex-col bg-white-foreground border border-border rounded-[12px] p-[30px] gap-[20px]">
          <h1 className="text-foreground text-[20px] font-semibold flex items-center gap-[10px]">
            <Eye size={24} /> สรุปข้อมูลโปรเจกต์
          </h1>

          <div className="flex flex-col gap-[20px] mt-[10px]">
            {/* ข้อมูลแบ่งเป็นสองคอลัมน์ (Grid 2 คอลัมน์บน Desktop, 1 คอลัมน์บน Mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-[20px] gap-x-[40px]">
              {/* ดึงข้อมูลจาก currentProject ใน Zustand Store มาแสดงผล */}
              <div className="flex flex-col gap-[8px]">
                <span className="text-[14px] text-foreground font-semibold">ชื่อโปรเจกต์:<span className="font-normal ml-2">{currentProject.title || '-'}</span></span>
              </div>
              <div className="flex flex-col gap-[8px]">
                <span className="text-[14px] text-foreground font-semibold">หมวดหมู่:<span className="font-normal ml-2">{currentProject.category || '-'}</span></span>
              </div>

              <div className="flex flex-col gap-[8px]">
                <span className="text-[14px] text-foreground font-semibold">เป้าหมาย:<span className="font-normal ml-2">{currentProject.fundingGoal ? `${formatCurrency(currentProject.fundingGoal)} บาท` : '-'}</span></span>
              </div>

              <div className="flex flex-col gap-[8px]">
                <span className="text-[14px] text-foreground font-semibold">ระยะเวลา:<span className="font-normal ml-2">{currentProject.projectDuration ? `${currentProject.projectDuration} เดือน` : '-'}</span></span>
              </div>
              <div className="flex flex-col gap-[8px]">
                <span className="text-[14px] text-foreground font-semibold">ส่วนแบ่งกำไร:<span className="font-normal ml-2">{currentProject.revenueShare ? `${currentProject.revenueShare}%` : '-'}</span></span>
              </div>
              <div className="flex flex-col gap-[8px]">
                <span className="text-[14px] text-foreground font-semibold">Milestone:<span className="font-normal ml-2">{currentProject.milestones?.filter(m => m.title).length || 0} ระยะ</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================
            ส่วนที่ 2: ข้อตกลงและเงื่อนไข (Terms & Conditions)
            ========================================= */}
        <div className="flex flex-col bg-white-foreground border border-border rounded-[12px] p-[30px] gap-[20px]">
          <h1 className="text-foreground text-[20px] font-semibold">ข้อตกลงและเงื่อนไข</h1>

          <div className="flex flex-col gap-[20px]">
            <h2 className="text-[16px] font-semibold text-foreground">ข้อตกลงการสร้างโปรเจกต์บนแพลตฟอร์ม FlyUp</h2>
            <hr className="border-border" />

            {/* รายการข้อตกลงต่างๆ */}
            <ul className="flex flex-col gap-[16px] text-[14px] text-foreground ml-2">
              <li>1. ผู้สร้างโปรเจกต์ (Pioneer) ยืนยันว่าข้อมูลทั้งหมดที่ให้ไว้เป็นความจริง</li>
              <li>2. Pioneer จะดำเนินโปรเจกต์ตาม Milestone ที่กำหนดอย่างสุจริต</li>
              <li>3. Pioneer ยินยอมให้ Admin ตรวจสอบและอนุมัติโปรเจกต์ก่อนเผยแพร่</li>
              <li>4. Pioneer จะแบ่งกำไรให้ผู้สนับสนุนตามสัดส่วนที่ตกลง</li>
              <li>5. FlyUp มีสิทธิ์ระงับโปรเจกต์ที่ละเมิดข้อตกลง</li>
              <li>6. ค่าธรรมเนียมแพลตฟอร์ม 5% จะถูกหักจากยอดระดมทุน</li>
              <li>7. หากโปรเจกต์ไม่ผ่าน Milestone เงินที่เหลือจะถูกคืนให้ Booster</li>
            </ul>

            {/* ปุ่ม Checkbox สำหรับกดยอมรับข้อตกลง */}
            <div className="mt-[20px]">
              <label className={`flex items-center gap-[12px] border border-border rounded-[8px] p-[16px] transition-colors ${alreadySubmitted ? 'bg-[#F3F4F6] cursor-not-allowed' : 'cursor-pointer hover:border-primary'}`}>
                <input
                  type="checkbox"
                  checked={isAgreed}
                  disabled={alreadySubmitted}
                  onChange={(e) => handleAgreedChange(e.target.checked)}
                  className="w-5 h-5 accent-primary rounded cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="text-[14px] text-foreground font-medium">
                  ข้าพเจ้าได้อ่านและยอมรับข้อตกลงและเงื่อนไขการสร้างโปรเจกต์บนแพลตฟอร์ม FlyUp แล้ว
                </span>
                {alreadySubmitted && (
                  <span className="ml-auto text-[11px] text-emerald-600 font-medium">✓ ยอมรับแล้ว</span>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* =========================================
            ส่วนที่ 3: ปุ่มนำทางไปยังขั้นตอนการส่งโปรเจกต์
            ส่ง props ให้ StepNavigation เพื่อควบคุมปุ่มส่งคำขอ
            ========================================= */}
        <StepNavigation
          onSubmit={() => setShowModal(true)}
          disableSubmit={!isAgreed || !allMilestonesComplete || hasBlockingProject}
        />

        {hasBlockingProject && (
          <p className="text-right text-[13px] text-amber-600">
            ไม่สามารถส่งคำขอได้ เนื่องจากมีโปรเจกต์อื่นที่กำลังดำเนินการหรือรอการตรวจสอบ
          </p>
        )}
      </div>

      {/* =========================================
          ส่วนที่ 4: Modal ยืนยันการส่งโปรเจกต์ 
          (จะป๊อปอัปขึ้นมาเมื่อกด ส่งคำขอสร้างโปรเจกต์)
          ========================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] p-[40px] w-[90%] max-w-[500px] shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200">
            <h2 className="text-[24px] font-bold text-foreground mb-[24px]">
              ยืนยันส่งโปรเจกต์
            </h2>

            <div className="flex flex-col items-center gap-[8px] mb-[40px] text-[16px] text-muted-foreground text-center">
              <p>โปรเจกต์ <span className="font-semibold text-foreground">"{currentProject.title || 'ของท่าน'}"</span> จะถูกส่งไปยัง Admin เพื่อตรวจสอบ</p>
              <p>คุณจะได้รับแจ้งเตือนเมื่อได้รับการอนุมัติ</p>
            </div>

            <div className="grid grid-cols-2 gap-[16px] w-full mt-auto">
              {/* ปุ่มยกเลิก */}
              <button
                onClick={() => setShowModal(false)}
                className="col-span-1 h-[48px] rounded-[12px] border border-border text-foreground font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>

              {/* ปุ่มส่งคำขออนุมัติจริง */}
              <button
                data-testid="step4-submit-btn"
                onClick={handleSubmitProject}
                disabled={isSubmitting || hasBlockingProject}
                className="col-span-1 h-[48px] rounded-[12px] bg-primary text-white font-medium hover:bg-primary-hover flex items-center justify-center gap-[8px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={16} />
                {isSubmitting ? 'กำลังส่ง...' : 'ส่งคำขอ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Step4Agreement;
