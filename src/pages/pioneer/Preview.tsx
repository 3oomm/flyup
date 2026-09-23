import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { useProjectStore } from "../../store/useProjectStore";
import { useProjectDetailStore } from "../../store/useProjectDetailStore";
import { useAuthStore } from "../../store/useAuthStore";
import { CheckCircle2, Users, Clock, Flag, Shield, HandCoins } from "lucide-react";
import PreviewStory from "../../components/preview/PreviewStory";
import PreviewMilestone from "../../components/preview/PreviewMilestone";
import { PreviewUpdate, PreviewQuestion, PreviewComment } from "../../components/preview/PreviewMisc";

const Preview = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { projectId } = useParams();
    // path ที่จะกลับไปตอนกด "ออกจากดูตัวอย่าง" — ถ้าไม่ได้ส่ง state.from มา ให้กลับไปหน้ารายการโปรเจกต์เป็นค่า default
    const fromPath = (location.state as { from?: string } | null)?.from ?? '/pioneer/dashboard/projects';
    const { currentProject, loadCurrentProject, projects, fetchMyProjects } = useProjectStore();
    const { updates, faqs, threads, investorCount, fetchAll } = useProjectDetailStore();
    const { authUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'story' | 'milestone' | 'update' | 'comment' | 'question'>('story'); // แท็บที่กำลังเปิดดูอยู่ในฝั่งซ้าย

    // โหลดข้อมูลโปรเจกต์ + ข้อมูลประกอบ (update/faq/comment/จำนวนผู้ลงทุน) เมื่อเข้าหน้านี้ หรือ projectId เปลี่ยน
    // และดึงรายการโปรเจกต์ของตัวเองมาด้วย เพื่อนับจำนวนโปรเจกต์ที่ทำสำเร็จแล้ว (แสดงในโปรไฟล์ผู้สร้าง)
    useEffect(() => {
        if (projectId) {
            loadCurrentProject(Number(projectId));
            fetchAll(Number(projectId));
        }
        fetchMyProjects();
    }, [projectId, loadCurrentProject, fetchAll, fetchMyProjects]);

    const completedProjects = projects.filter(p => p.status === 'completed');

    const formatCurrency = (amount: number) => new Intl.NumberFormat("th-TH").format(amount);

    const targetGoal = currentProject.fundingGoal || 0;
    const profitShare = currentProject.revenueShare || 0;
    const activeMilestones = currentProject.milestones?.filter(m => m.title) ?? [];

    const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const formatThDate = (d: Date) => `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear()}`;
    // คำนวณช่วงวันที่คาดว่าโปรเจกต์จะเริ่ม-จบ โดยประมาณจากวันนี้ + ระยะเวลาโปรเจกต์ (เดือน)
    // ใช้แค่แสดงตัวอย่างในหน้า preview เท่านั้น (โปรเจกต์จริงยังไม่เริ่มนับจนกว่าจะระดมทุนสำเร็จ)
    const getProjectDateRange = () => {
        if (!currentProject.projectDuration) return 'ยังไม่ได้กำหนด';
        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + currentProject.projectDuration);
        return `${formatThDate(start)} — ${formatThDate(end)}`;
    };

    // video นำหน้า แล้วตามด้วยรูปภาพ
    type MediaItem = { type: 'video' | 'image'; url: string; name: string };
    const mediaList: MediaItem[] = [
        ...(currentProject.video ? [{ type: 'video' as const, url: currentProject.video.url, name: currentProject.video.name }] : []),
        ...(currentProject.files ?? []).map(f => ({ type: 'image' as const, url: f.url, name: f.name })),
    ];
    const [selectedIndex, setSelectedIndex] = useState(0); // index ของสื่อ (รูป/วิดีโอ) ที่กำลังแสดงเป็นภาพหลัก
    const selected = mediaList[selectedIndex] ?? null;

    return (
        <div className="min-h-screen bg-surface-soft pb-[100px] pt-[100px]">
            {/* Header (Exit Preview Button) */}
            <div className="w-full flex justify-end p-[20px] max-w-7xl mx-auto">
                <button
                    onClick={() => navigate(fromPath)}
                    className="border border-border bg-white text-foreground px-[20px] py-[8px] rounded-[6px] text-[14px] font-medium hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                >
                    ออกจากดูตัวอย่าง
                </button>
            </div>

            <main className="max-w-7xl mx-auto px-[20px]">
                {/* Project Header Info */}
                <div className="flex flex-col gap-[10px] mb-[30px]">
                    <div className="inline-flex w-fit items-center px-[12px] py-[4px] rounded-full border border-border bg-white text-[12px] font-medium text-foreground">
                        {currentProject.category || "ไม่ได้ระบุหมวดหมู่"}
                    </div>
                    <h1 className="text-[36px] font-bold text-foreground leading-tight">
                        {currentProject.title || "ไม่ได้ระบุชื่อโปรเจกต์"}
                    </h1>
                    <p className="text-[16px] text-muted-foreground w-full max-w-[800px]">
                        {currentProject.description || "ไม่ได้ระบุคำอธิบายโปรเจกต์"}
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-[30px]">
                    {/* Left Column (Media & Tabs) */}
                    <div className="flex-1 flex flex-col gap-[20px]">
                        {/* Main Media */}
                        <div className="w-full aspect-[16/10] bg-white rounded-[16px] border border-border overflow-hidden">
                            {selected ? (
                                selected.type === 'video' ? (
                                    <video src={selected.url} controls className="w-full h-full object-cover" />
                                ) : (
                                    <img src={selected.url} alt={selected.name} className="w-full h-full object-cover" />
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-muted-foreground">
                                    ไม่มีรูปภาพ
                                </div>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {mediaList.length > 0 ? (
                            <div className="flex gap-[10px] overflow-x-auto pb-2">
                                {mediaList.map((media, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`w-[80px] h-[60px] flex-shrink-0 border-2 rounded-[8px] overflow-hidden cursor-pointer transition-colors ${selectedIndex === idx ? 'border-primary' : 'border-border hover:border-primary/50'}`}
                                    >
                                        {media.type === 'video' ? (
                                            <video src={media.url} className="w-full h-full object-cover pointer-events-none" />
                                        ) : (
                                            <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex gap-[10px]">
                                {[1, 2, 3, 4, 5].map((_, i) => (
                                    <div key={i} className="w-[80px] h-[60px] bg-white border border-border rounded-[8px]" />
                                ))}
                            </div>
                        )}

                        {/* Tabs Navigation */}
                        <div className="flex flex-wrap md:flex-nowrap bg-surface-hover rounded-[8px] p-[4px] mt-[10px] overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('story')}
                                className={`flex-1 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[12px] transition-colors cursor-pointer ${activeTab === 'story' ? 'bg-white text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground font-medium'}`}
                            >
                                เรื่องราว
                            </button>
                            <button
                                onClick={() => setActiveTab('milestone')}
                                className={`flex-1 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[12px] transition-colors cursor-pointer ${activeTab === 'milestone' ? 'bg-white text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground font-medium'}`}
                            >
                                Milestone ({activeMilestones.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('update')}
                                className={`flex-1 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[12px] transition-colors cursor-pointer ${activeTab === 'update' ? 'bg-white text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground font-medium'}`}
                            >
                                อัปเดต ({updates.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('comment')}
                                className={`flex-1 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[12px] transition-colors cursor-pointer ${activeTab === 'comment' ? 'bg-white text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground font-medium'}`}
                            >
                                ความคิดเห็น ({threads.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('question')}
                                className={`flex-1 min-w-[100px] flex justify-center py-[8px] px-[16px] rounded-[6px] text-[12px] transition-colors cursor-pointer ${activeTab === 'question' ? 'bg-white text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground font-medium'}`}
                            >
                                คำถาม ({faqs.length})
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="w-full mt-[10px]">
                            {activeTab === 'story' && <PreviewStory story={currentProject.story} risks={currentProject.risks} />}
                            {activeTab === 'milestone' && <PreviewMilestone milestones={currentProject.milestones ?? []} />}
                            {activeTab === 'update' && (
                                <PreviewUpdate
                                    updates={updates}
                                    creatorName={`${authUser?.first_name ?? ''} ${authUser?.last_name ?? ''}`.trim() || 'ผู้พัฒนาโปรเจกต์'}
                                    creatorAvatar={(authUser?.picture as string) || undefined}
                                />
                            )}
                            {activeTab === 'comment' && <PreviewComment comments={threads} />}
                            {activeTab === 'question' && <PreviewQuestion questions={faqs} />}
                        </div>
                    </div>

                    {/* Right Column (Sidebar Funding Info) */}
                    <div className="w-full lg:w-[380px] flex flex-col gap-[20px]">
                        {/* Funding Card */}
                        <div className="bg-white border border-border rounded-[16px] p-[24px] flex flex-col shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-pink-500 to-purple-600"></div>

                            <h2 className="text-[32px] font-bold text-primary tracking-tight">฿0</h2>
                            <p className="text-[13px] text-muted-foreground mt-[2px]">
                                {targetGoal > 0 ? `เป้าหมาย ฿${formatCurrency(targetGoal)} • 0%` : "ยังไม่ได้กำหนดเป้าหมาย • 0%"}
                            </p>

                            <div className="flex items-center justify-between border-y border-border py-[16px] mt-[24px]">
                                <div className="flex flex-col items-center flex-1 border-r border-border">
                                    <div className="flex items-center gap-[6px] text-foreground font-semibold text-[16px]">
                                        <Users size={16} /> {investorCount ?? '—'}
                                    </div>
                                    <span className="text-[12px] text-muted-foreground">ผู้สนับสนุน</span>
                                </div>
                                <div className="flex flex-col items-center flex-1 border-r border-border">
                                    <div className="flex items-center gap-[6px] text-foreground font-semibold text-[16px]">
                                        <Clock size={16} /> {currentProject.campaignDuration || 0}
                                    </div>
                                    <span className="text-[12px] text-muted-foreground">วันที่เหลือ</span>
                                </div>
                                <div className="flex flex-col items-center flex-1">
                                    <div className="flex items-center gap-[6px] text-foreground font-semibold text-[16px]">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                        {profitShare} %
                                    </div>
                                    <span className="text-[12px] text-muted-foreground">ส่วนแบ่งกำไร</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-[12px] mt-[20px] mb-[24px]">
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-muted-foreground">ลงทุนขั้นต่ำ</span>
                                    <span className="font-semibold text-foreground">
                                        {currentProject.minInvestAmount > 0 ? `฿${formatCurrency(currentProject.minInvestAmount)}` : 'ยังไม่ได้กำหนด'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-muted-foreground">ลงทุนได้สูงสุด</span>
                                    <span className="font-semibold text-foreground">
                                        {(() => {
                                            const remaining = targetGoal > 0 ? targetGoal : 0;
                                            const effectiveMax = currentProject.maxInvestAmount > 0
                                                ? Math.min(currentProject.maxInvestAmount, remaining)
                                                : remaining;
                                            return effectiveMax > 0 ? `฿${formatCurrency(effectiveMax)}` : 'ยังไม่ได้กำหนด';
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-muted-foreground">ระยะเวลา</span>
                                    <span className="font-semibold text-foreground text-right w-[150px] truncate">
                                        {getProjectDateRange()}
                                    </span>
                                </div>
                            </div>

                            <div className="w-full flex justify-center text-primary font-bold text-[14px] mb-[12px]">
                                กำลังสร้างโปรเจกต์
                            </div>

                            <div className="flex gap-[12px]">
                                <button className="flex-1 bg-primary hover:bg-primary-hover text-white h-[44px] rounded-[10px] flex justify-center items-center gap-[8px] font-medium transition-colors cursor-pointer duration-200">
                                    <HandCoins size={18} />
                                    <span>ลงทุนโปรเจกต์นี้</span>
                                </button>
                                <button className="w-[44px] h-[44px] bg-secondary border border-border rounded-[10px] flex justify-center items-center text-foreground hover:bg-mute transition-colors cursor-pointer duration-200">
                                    <Flag size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Creator Profile */}
                        <div className="bg-white border border-border rounded-[16px] p-[20px] shadow-sm flex flex-col gap-[14px]">
                            <h3 className="text-[13px] text-foreground font-semibold">ผู้สร้างโปรเจกต์</h3>
                            <div className="flex items-center gap-[14px]">
                                <div className="w-[48px] h-[48px] rounded-full bg-gray-200 overflow-hidden border border-border flex-shrink-0">
                                    {authUser?.picture ? (
                                        <img src={authUser?.picture as string} alt="Creator" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-foreground font-bold text-[18px]">
                                            {(authUser?.first_name as string)?.[0] ?? '?'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-[2px]">
                                    <span className="text-[14px] font-bold text-foreground leading-tight">{(authUser?.first_name + " " + authUser?.last_name)}</span>
                                    <span className="text-[12px] text-muted-foreground">{(authUser?.student_profile?.university?.name_th as string) || ""}</span>
                                </div>
                            </div>
                            <div className="min-w-0">
                                <p className="max-w-full text-[12px] text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{authUser?.student_profile?.bio as string}</p>
                            </div>
                            <div className="flex gap-[20px]">
                                <span className="inline-flex items-center gap-[5px] border border-primary text-primary px-[10px] py-[4px] rounded-full text-[11px] font-medium">
                                    {
                                        authUser?.student_card_verification?.status && <><CheckCircle2 size={13} /> ยืนยันแล้ว</>
                                    }
                                </span>
                                {completedProjects.length > 0 && (
                                    <span className="inline-flex items-center gap-1.25 border border-green-500 text-green-600 px-2.5 py-1 rounded-full text-[11px] font-medium ml-1.5">
                                        <CheckCircle2 size={13} />
                                        {completedProjects.length} โปรเจกต์เสร็จสิ้น
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Trust & Safety Banner */}
                        <div className="bg-[#FAF8FF] border border-[#E9D5FF] rounded-[16px] p-[20px] flex flex-col items-center justify-center text-center gap-[8px]">
                            <Shield className="text-foreground" size={24} />
                            <h4 className="text-[13px] font-bold text-foreground">ปลอดภัยด้วยระบบ Milestone</h4>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                                เงินลงทุนจะถูกปล่อยเป็นงวดตาม Milestone ที่ผ่านการโหวตจากผู้สนับสนุน
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Preview;
