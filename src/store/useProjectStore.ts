import { create } from 'zustand';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import { AxiosError } from 'axios';

export interface ProjectMedia {
    id?: number;    // backend media ID (มีเมื่อถูก save แล้ว)
    name: string;
    url: string;    // Blob URL สำหรับ Preview หรือ URL จริงจาก Server
    file?: File;    // ไฟล์จริงสำหรับส่งไป API
}

// ✅ สำหรับข้อมูลแต่ละ Milestone (Phase)
export interface Milestone {
    id?: number;          // backend ID (มีเมื่อถูก save แล้ว)
    title: string;
    description: string;
    amount: number;
    duration: number;     // ระยะเวลา (วัน)
    criteria: string[];
    files: ProjectMedia[];
    videos: ProjectMedia[];
}

export interface Project {
    id?: number;
    title: string;
    description: string;
    category: string;
    categoryId: number;
    storyId?: number;     // backend ID ของ story section
    state?: string;       // e.g. 'draft' | 'pending_review' | 'funding' | 'executing' | 'closed'
    fundingGoal: number;
    projectDuration: number;
    softCap: number;
    campaignDuration: number;
    revenueShare: number;
    minInvestAmount: number;
    maxInvestAmount: number;
    coverImage: string | null; // รูปปก (แสดงที่ home)
    files: ProjectMedia[]; // รองรับสูงสุด 5 รูป
    video: ProjectMedia | null;
    story: string;
    risks: string;
    milestones: Milestone[];
}

export interface FAQ {
    id: number;
    question: string;
    answer: string;
    sort_order: number;
}

export interface ProjectUpdate {
    id: number;
    title: string;
    body: string;
    visibility: string;
    created_at: string;
}

export interface ProjectSummary {
    id: number;
    slug: string;
    title: string;
    state: 'draft' | 'pending_review' | 'funding' | 'executing' | 'closed' | 'cancelled' | 'pending_cancel' | 'suspended' | 'pending_edit_review';
    status: 'active' | 'funded' | 'failed' | 'rejected' | 'completed' | 'cancelled';
    category: { id: number; name: string } | null;
    description: string | null;
    current_funding: number;
    funding_goal: number;
    cover_image?: string | null;
    thumbnail_url?: string;
}

interface ProjectState {
    projects: ProjectSummary[];
    currentProject: Project;
    isLoading: boolean;
    isCreating: boolean;
    isSaving: boolean;
    saveStatus: 'idle' | 'saving' | 'saved';
    setSaveStatus: (status: 'idle' | 'saving' | 'saved') => void;

    faqs: FAQ[];
    isSavingFaq: boolean;
    updates: ProjectUpdate[];
    isLoadingUpdates: boolean;
    isSavingUpdate: boolean;

    // Actions
    createProject: () => Promise<number | null>;
    loadCurrentProject: (id: number) => Promise<void>;
    fetchMyProjects: () => Promise<void>;
    updateProject: (id: number, data: Partial<Project>) => Promise<boolean>;
    deleteProject: (id: number) => Promise<boolean>;
    saveStory: (projectId: number, html?: string) => Promise<void>;
    saveMilestonePhase: (projectId: number, phaseIndex: number) => Promise<void>;
    updateProjectInfo: (data: Partial<Project>) => void;
    updateMilestone: (index: number, data: Partial<Milestone>) => void;
    updateProjectStatus: (projectId: number) => Promise<void>;
    submitProject: (projectId: number | string) => Promise<boolean>;
    submitCancelRequest: (projectId: number | string, data: { reason: string; description: string }) => Promise<boolean | 'description_required'>;

    fetchFaqs: (projectId: number | string) => Promise<void>;
    addFaq: (projectId: number | string, data: { question: string; answer: string }) => Promise<boolean>;
    editFaq: (id: number, data: { question: string; answer: string }) => Promise<boolean>;
    deleteFaq: (id: number) => Promise<boolean>;

    fetchProjectUpdates: (projectId: number | string) => Promise<void>;
    addProjectUpdate: (projectId: number | string, data: { title: string; content: string }) => Promise<boolean>;
    editProjectUpdate: (id: number, data: { title: string; content: string }) => Promise<boolean>;
    deleteProjectUpdate: (id: number) => Promise<boolean>;

    fetchCategories: () => Promise<{ id: number; name: string }[]>;
    uploadFile: (file: File) => Promise<{ url: string; type?: string } | null>;
    attachProjectMedia: (projectId: number | string, url: string, type: string) => Promise<void>;
    fetchProjectMedia: (projectId: number | string) => Promise<{ id: number; url: string }[]>;
    deleteProjectMedia: (mediaId: number) => Promise<void>;
}

const initialProject: Project = {
    title: '',
    description: '',
    category: '',
    categoryId: 0,
    fundingGoal: 0,
    projectDuration: 0,
    softCap: 0,
    campaignDuration: 0,
    revenueShare: 0,
    minInvestAmount: 0,
    maxInvestAmount: 0,
    coverImage: null,
    files: [],
    video: null,
    story: '',
    risks: '',
    milestones: Array.from({ length: 4 }, () => ({
        title: '',
        description: '',
        amount: 0,
        duration: 0,
        criteria: [''],
        files: [],
        videos: [],
    })),
};

let _savingStory = false;

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    currentProject: initialProject,
    isLoading: false,
    isCreating: false,
    isSaving: false,
    saveStatus: 'idle',
    setSaveStatus: (status) => set({ saveStatus: status }),

    faqs: [],
    isSavingFaq: false,
    updates: [],
    isLoadingUpdates: false,
    isSavingUpdate: false,

    // ✅ Action สำหรับอัปเดตข้อมูลทั่วไป (Step 1: Basics, Step 2: Story/Risks)
    updateProjectInfo: (data) => {
        set((state) => ({
            currentProject: {
                ...state.currentProject,
                ...data,
            },
        }));
    },

    // ✅ Action สำหรับอัปเดต Milestone (Step 3)
    updateMilestone: (index, data) => {
        try {
            set((state) => {
                const newMilestones = [...state.currentProject.milestones];

                if (index < 0 || index >= newMilestones.length) {
                    throw new Error('Index out of bounds');
                }

                newMilestones[index] = {
                    ...newMilestones[index],
                    ...data,
                };

                return {
                    currentProject: {
                        ...state.currentProject,
                        milestones: newMilestones,
                    },
                };
            });
        } catch (error) {
            console.error(`Failed to update milestone: ${error}`);
            toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล Milestone');
        }
    },

    // โหลดโปรเจกต์เดี่ยวจาก backend มาเติมลง currentProject ทั้งก้อน (ใช้ตอนเข้าหน้า Step 1-5 / Overview / Preview)
    // ต้อง map field name จาก backend (snake_case) เป็น store (camelCase) และแปลง media/stories/milestones ที่เก็บแยกตารางให้กลับมาเป็นรูปเดียวกับ currentProject
    loadCurrentProject: async (id) => {
        set({ isLoading: true });
        try {
            const res = await api.get(`/pioneer/projects/${id}`);
            const d = res.data?.data;
            if (!d) return;

            // Map media
            const media: { id: number; type: string | string[]; url: string; sort_order: number }[] = d.media ?? [];
            const getMediaType = (t: string | string[]) => (Array.isArray(t) ? t[0] ?? '' : t);
            const images = media
                .filter((m) => getMediaType(m.type) === 'image')
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((m) => ({ id: m.id, name: m.url.split('/').pop() ?? 'image', url: m.url }));
            const videoMedia = media.find((m) => getMediaType(m.type) === 'video');
            const video = videoMedia
                ? { id: videoMedia.id, name: videoMedia.url.split('/').pop() ?? 'video', url: videoMedia.url }
                : null;

            // Map stories → join body HTML เข้า story field + เก็บ storyId
            const stories: { id: number; body: string; sort_order: number }[] = d.stories ?? [];
            const sortedStories = stories.sort((a, b) => a.sort_order - b.sort_order);
            const story = sortedStories.map((s) => s.body).join('');
            const storyId = sortedStories[0]?.id;

            // Category บาง endpoint ส่งเป็น string บาง endpoint ส่งเป็น object {id, name} — normalize ให้เป็น string เสมอ
            const rawCategory = d.category as unknown;
            const categoryName = typeof rawCategory === 'string'
                ? rawCategory
                : (rawCategory as { name?: string } | null)?.name ?? '';

            // Resolve category id from name
            let categoryId = 0;
            try {
                const catRes = await api.get('/categories');
                const allCats: { id: number; name: string }[] = catRes.data?.data ?? [];
                const matched = allCats.find(c => c.name === categoryName);
                categoryId = matched?.id ?? 0;
            } catch { /* ignore */ }

            // Load milestones แยกจาก project เพื่อให้ได้ id ครบ
            let bms: {
                id?: number;
                title?: string;
                description?: string;
                acceptance_criteria?: string;
                duration?: number;
                urls?: string[];
                type?: string;
                phase_no?: number;
            }[] = [];
            try {
                const msRes = await api.get(`/projects/${id}/milestones`);
                const raw: typeof bms = msRes.data?.data ?? [];
                // เรียงตาม phase_no (1-4) แล้ว map ลง index 0-3
                bms = Array.from({ length: 4 }, (_, i) =>
                    raw.find(m => m.phase_no === i + 1) ?? {}
                );
            } catch { /* ignore */ }

            const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|avi)$/i.test(url);
            const milestones = Array.from({ length: 4 }, (_, i) => {
                const bm = bms[i] ?? {};
                const urls: string[] = bm.urls ?? [];
                const files: ProjectMedia[] = urls
                    .filter(url => !isVideoUrl(url))
                    .map(url => ({ name: url.split('/').pop() ?? 'file', url }));
                const videos: ProjectMedia[] = urls
                    .filter(url => isVideoUrl(url))
                    .map(url => ({ name: url.split('/').pop() ?? 'video', url }));
                return {
                    id: bm.id,
                    title: bm.title ?? '',
                    description: bm.description ?? '',
                    amount: 0,
                    duration: bm.duration ?? 0,
                    criteria: bm.acceptance_criteria
                        ? bm.acceptance_criteria.split('\n').filter(Boolean)
                        : [''],
                    files,
                    videos,
                };
            });

            set({
                currentProject: {
                    title: d.title ?? '',
                    description: d.description ?? '',
                    category: categoryName,
                    categoryId,
                    state: d.state ?? '',
                    fundingGoal: d.funding_goal ?? 0,
                    projectDuration: d.duration_months ?? 0,
                    softCap: d.softcap ?? 0,
                    campaignDuration: d.duration_days ?? 0,
                    revenueShare: d.profit_share_pct ?? 0,
                    minInvestAmount: d.min_invest_amount ?? 0,
                    maxInvestAmount: d.max_invest_amount ?? 0,
                    storyId,
                    coverImage: d.cover_image ?? null,
                    files: images,
                    video,
                    story,
                    risks: d.risk ?? '',
                    milestones,
                },
            });
        } catch (error) {
            console.error('loadCurrentProject:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    // auto-save partial update (patch) ขึ้น backend — ใช้ตอน blur ของ input ต่างๆ ใน Step1Basics/Step2Story
    updateProject: async (id, data) => {
        // map store field names → API field names
        const payload: Record<string, unknown> = {};
        if (data.title !== undefined) payload.title = data.title;
        if (data.description !== undefined) payload.description = data.description;
        if (data.risks !== undefined) payload.risk = data.risks;
        if (data.fundingGoal !== undefined) payload.funding_goal = data.fundingGoal;
        if (data.softCap !== undefined) payload.softcap = data.softCap;
        if (data.projectDuration !== undefined) payload.duration_months = data.projectDuration;
        if (data.campaignDuration !== undefined) payload.duration_days = data.campaignDuration;
        if (data.revenueShare !== undefined) payload.profit_share_pct = data.revenueShare;
        if (data.categoryId !== undefined && data.categoryId > 0) payload.category_id = data.categoryId;
        if (data.minInvestAmount !== undefined) payload.min_invest_amount = data.minInvestAmount;
        if (data.maxInvestAmount !== undefined) payload.max_invest_amount = data.maxInvestAmount;
        if (data.coverImage !== undefined) payload.cover_image = data.coverImage;

        if (Object.keys(payload).length === 0) return true;

        try {
            const res = await api.patch(`/pioneer/projects/${id}`, payload);
            const d = res.data?.data;
            if (d?.min_invest_amount !== undefined) {
                set((state) => ({
                    currentProject: {
                        ...state.currentProject,
                        minInvestAmount: d.min_invest_amount,
                    },
                }));
            }
            return true;
        } catch (error) {
            console.error('updateProject:', error);
            toast.error('บันทึกไม่สำเร็จ');
            return false;
        }
    },

    // ดึงรายการโปรเจกต์ทั้งหมดของ pioneer คนนี้ (ใช้ในหน้า MyProjects) โดยใช้รูปปกเป็น thumbnail
    fetchMyProjects: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get('/pioneer/projects');
            const projects: ProjectSummary[] = (res.data?.data ?? []).map((p: ProjectSummary) => ({
                ...p,
                thumbnail_url: p.cover_image ?? undefined,
            }));

            set({ projects });
        } catch (error) {
            console.error(error);
            toast.error('ไม่สามารถโหลดโปรเจกต์ได้');
        } finally {
            set({ isLoading: false });
        }
    },

    // ลบโปรเจกต์แบบ draft ทิ้งทั้งหมด — ต้องลบ milestones/stories/media (child records) ก่อน แล้วค่อยลบตัวโปรเจกต์เอง
    // เพื่อไม่ให้ backend ปฏิเสธการลบเพราะติด foreign key constraint
    deleteProject: async (id) => {
        try {
            // ลบ milestones ก่อน
            try {
                const msRes = await api.get(`/projects/${id}/milestones`);
                const milestones: { id?: number }[] = msRes.data?.data ?? [];
                await Promise.all(
                    milestones.filter(m => m.id).map(m => api.delete(`/pioneer/projects/milestones/${m.id}`))
                );
            } catch { /* ignore ถ้า milestone ไม่มีหรือลบไม่ได้ */ }

            // ลบ stories และ media ก่อน
            try {
                const projRes = await api.get(`/pioneer/projects/${id}`);
                const projData = projRes.data?.data ?? {};
                const stories: { id?: number }[] = projData.stories ?? [];
                const media: { id?: number }[] = projData.media ?? [];
                await Promise.all([
                    ...stories.filter(s => s.id).map(s => api.delete(`/pioneer/projects/stories/${s.id}`)),
                    ...media.filter(m => m.id).map(m => api.delete(`/pioneer/projects/media/${m.id}`)),
                ]);
            } catch { /* ignore ถ้า story/media ไม่มีหรือลบไม่ได้ */ }

            await api.delete(`/pioneer/projects/${id}`);
            set((state) => ({ projects: state.projects.filter(p => p.id !== id) }));
            toast.success('ลบโปรเจกต์สำเร็จ');
            return true;
        } catch (error) {
            console.error('deleteProject:', error);
            toast.error('ไม่สามารถลบโปรเจกต์ได้');
            return false;
        }
    },

    // บันทึกเนื้อหา story (เรื่องราวของโปรเจกต์): ถ้ามี storyId แล้วให้ patch อัปเดต ถ้ายังไม่มีให้สร้างใหม่ครั้งแรก
    // ป้องกันสร้างซ้ำซ้อนด้วย _savingStory flag เพราะ onUpdate ของ editor อาจยิงมาถี่ๆ ก่อนที่ storyId แรกจะเซ็ตเสร็จ
    saveStory: async (projectId, html?: string) => {
        const { currentProject } = get();
        const content = html ?? currentProject.story;
        if (!content || content === '<p></p>') return;
        try {
            if (currentProject.storyId) {
                await api.patch(`/pioneer/projects/stories/${currentProject.storyId}`, { body: content });
            } else {
                if (_savingStory) return;
                _savingStory = true;
                try {
                    const res = await api.post(`/pioneer/projects/${projectId}/stories`, {
                        title: 'Story',
                        body: content,
                        sort_order: 1,
                    });
                    const newId = res.data?.data?.id;
                    if (newId) {
                        set(state => ({ currentProject: { ...state.currentProject, storyId: newId } }));
                    }
                } finally {
                    _savingStory = false;
                }
            }
        } catch (error) {
            console.error('saveStory:', error);
            toast.error('บันทึก Story ไม่สำเร็จ');
        }
    },

    // บันทึก milestone phase เดียวขึ้น backend (ต้องมี id อยู่แล้วจาก pre-create ตอน createProject)
    saveMilestonePhase: async (_projectId, phaseIndex) => {
        const { currentProject } = get();
        const m = currentProject.milestones[phaseIndex];
        const phasePercents = [15, 20, 30, 35];

        const acceptanceCriteria = m.criteria.filter(c => c.trim()).join('\n') || undefined;

        // รวม URL จริง (ไม่ใช่ blob) จาก videos หรือ files
        const videoUrls = (m.videos ?? []).filter(v => v.url && !v.url.startsWith('blob:')).map(v => v.url);
        const fileUrls = (m.files ?? []).filter(f => f.url && !f.url.startsWith('blob:')).map(f => f.url);

        // ไม่ save ถ้ายังไม่มี id (milestone ยังไม่ถูก pre-create) หรือไม่มีข้อมูลอะไรเลย
        if (!m.id) return;
        const hasMedia = videoUrls.length > 0 || fileUrls.length > 0;
        const hasAnyData = !!(m?.title || m?.description || m?.duration || acceptanceCriteria || hasMedia);
        if (!hasAnyData) return;

        const allUrls = [...fileUrls, ...videoUrls];
        const mTypes: string[] = [];
        if (fileUrls.length > 0) {
            if (fileUrls.some(u => /\.(jpg|jpeg|png|gif|webp)$/i.test(u))) mTypes.push('image');
            if (fileUrls.some(u => !/\.(jpg|jpeg|png|gif|webp)$/i.test(u))) mTypes.push('raw');
        }
        if (videoUrls.length > 0) mTypes.push('video');

        try {
            await api.patch(`/pioneer/projects/milestones/${m.id}`, {
                title: m.title,
                description: m.description || undefined,
                phase_no: phaseIndex + 1,
                percent_release: phasePercents[phaseIndex],
                acceptance_criteria: acceptanceCriteria,
                duration: m.duration || undefined,
                urls: allUrls,
                type: mTypes.length > 0 ? mTypes : undefined,
            });
        } catch (error) {
            console.error('saveMilestonePhase:', error);
            toast.error('บันทึก Milestone ไม่สำเร็จ');
        }
    },

    // สร้างโปรเจกต์ draft ใหม่ในระบบ (เรียกจาก useCreateProjectGuard หลังผ่านการเช็คเงื่อนไข)
    // ถ้า backend บอกว่ายังไม่ยืนยันตัวตน จะเด้ง SweetAlert พาไปหน้ายืนยันตัวตนแทนการสร้าง error เฉยๆ
    createProject: async () => {
        set({ isCreating: true });
        try {
            const res = await api.post('/pioneer/projects');
            const projectId = res.data?.data?.id ?? res.data?.id;

            // Pre-create milestone ทั้ง 4 phase ทันที เพื่อให้มี id ครบ
            // ต้องสร้างทีละตัว (sequential) เพื่อให้ backend assign phase_no ถูกลำดับ
            const phasePercents = [15, 20, 30, 35];
            const milestoneIds: (number | undefined)[] = [undefined, undefined, undefined, undefined];
            for (let i = 0; i < phasePercents.length; i++) {
                try {
                    const mRes = await api.post(`/pioneer/projects/${projectId}/milestones`, {
                        phase_no: i + 1,
                        percent_release: phasePercents[i],
                    });
                    milestoneIds[i] = mRes.data?.data?.id;
                } catch { /* ignore */ }
            }

            const milestones = initialProject.milestones.map((m, i) => ({
                ...m,
                id: milestoneIds[i],
            }));
            set({ currentProject: { ...initialProject, milestones } });
            return projectId;
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const msg: string = err?.response?.data?.message ?? err?.message ?? '';
            const isNotVerified =
                msg.includes('not verified') ||
                msg.includes('id card not verified') ||
                msg.includes('student card not verified');

            if (isNotVerified) {
                const result = await Swal.fire({
                    icon: 'warning',
                    title: 'ยังไม่ได้ยืนยันตัวตน',
                    text: 'กรุณายืนยันตัวตนก่อนสร้างโปรเจกต์',
                    confirmButtonText: 'ไปยืนยันตัวตน',
                    confirmButtonColor: '#16A34A',
                    showCancelButton: true,
                    cancelButtonText: 'ยกเลิก',
                    cancelButtonColor: '#6B7280',
                    reverseButtons: true,
                });
                if (result.isConfirmed) {
                    window.location.href = '/pioneer/profile?tab=verify';
                }
            } else {
                toast.error('ไม่สามารถสร้างโปรเจกต์ได้');
            }
            return null;
        } finally {
            set({ isCreating: false });
        }
    },

    // ยกเลิกโปรเจกต์ draft ทันที (ต่างจาก submitCancelRequest ที่ใช้กับโปรเจกต์ที่เข้าสู่การระดมทุนแล้ว ต้องรอ Admin อนุมัติ)
    updateProjectStatus: async (projectId) => {
        try {
            await api.patch(`/pioneer/projects/${projectId}/cancel`);
            toast.success('ยกเลิกโปรเจกต์แล้ว');
        } catch (error) {
            console.error(error);
            toast.error('ไม่สามารถยกเลิกโปรเจกต์ได้');
        }
    },

    // ส่งโปรเจกต์ (state: draft) ไปรอ Admin ตรวจสอบ — จะ fail ถ้า pioneer มีโปรเจกต์ active อยู่แล้ว (รับได้ทีละโปรเจกต์)
    submitProject: async (projectId) => {
        try {
            await api.patch(`/pioneer/projects/${projectId}/submit`);
            return true;
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null;
            if (msg === 'you already have an active project') {
                toast.error('คุณมีโปรเจกต์ที่กำลังดำเนินอยู่แล้ว ไม่สามารถส่งโปรเจกต์ใหม่ได้ในขณะนี้');
            } else {
                toast.error(msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
            }
            return false;
        }
    },

    // ส่งคำขอยกเลิกโปรเจกต์ที่ผ่านการอนุมัติ/ระดมทุนไปแล้ว (ต้องรอ Admin พิจารณาอนุมัติการยกเลิกอีกที)
    submitCancelRequest: async (projectId, data) => {
        try {
            await api.patch(`/pioneer/projects/${projectId}/submit-cancel`, data);
            toast.success('ส่งคำขอยกเลิกเรียบร้อยแล้ว รอ Admin พิจารณา');
            return true;
        } catch (error) {
            const msg = error instanceof AxiosError ? error.response?.data?.message : null;
            if (msg === 'cancel request is already pending') {
                toast.error('คุณได้ส่งคำขอยกเลิกไปแล้ว กรุณารอ Admin พิจารณา');
            } else if (msg === 'project is already cancelled or state is draft') {
                toast.error('ไม่สามารถส่งคำขอได้ เนื่องจากโปรเจกต์ถูกยกเลิกแล้ว หรืออยู่ในสถานะแบบร่าง');
            } else if (msg === 'description is required') {
                return 'description_required';
            } else {
                toast.error(msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            }
            return false;
        }
    },

    // ─── FAQ: CRUD คำถามที่พบบ่อยของโปรเจกต์ (ใช้ใน Step2Story) ───
    fetchFaqs: async (projectId) => {
        try {
            const res = await api.get(`/projects/${projectId}/faqs`);
            set({ faqs: res.data?.data ?? [] });
        } catch {
            // ignore
        }
    },

    addFaq: async (projectId, data) => {
        if (!data.question.trim() || !data.answer.trim()) {
            toast.error('กรุณากรอกคำถามและคำตอบ');
            return false;
        }
        set({ isSavingFaq: true });
        try {
            const res = await api.post(`/pioneer/projects/${projectId}/faqs`, {
                question: data.question,
                answer: data.answer,
                sort_order: get().faqs.length + 1,
            });
            set((state) => ({ faqs: [...state.faqs, res.data?.data] }));
            toast.success('เพิ่ม FAQ สำเร็จ');
            return true;
        } catch {
            toast.error('เพิ่ม FAQ ไม่สำเร็จ');
            return false;
        } finally {
            set({ isSavingFaq: false });
        }
    },

    editFaq: async (id, data) => {
        if (!data.question.trim() || !data.answer.trim()) {
            toast.error('กรุณากรอกคำถามและคำตอบ');
            return false;
        }
        try {
            await api.patch(`/pioneer/projects/faqs/${id}`, {
                question: data.question,
                answer: data.answer,
            });
            set((state) => ({
                faqs: state.faqs.map(f => f.id === id ? { ...f, question: data.question, answer: data.answer } : f),
            }));
            toast.success('แก้ไข FAQ สำเร็จ');
            return true;
        } catch {
            toast.error('แก้ไข FAQ ไม่สำเร็จ');
            return false;
        }
    },

    deleteFaq: async (id) => {
        try {
            await api.delete(`/pioneer/projects/faqs/${id}`);
            set((state) => ({ faqs: state.faqs.filter(f => f.id !== id) }));
            toast.success('ลบ FAQ สำเร็จ');
            return true;
        } catch {
            toast.error('ลบ FAQ ไม่สำเร็จ');
            return false;
        }
    },

    // ─── Updates: CRUD ประกาศความคืบหน้าของโปรเจกต์ (ใช้ใน Step5Updates) ───
    fetchProjectUpdates: async (projectId) => {
        set({ isLoadingUpdates: true });
        try {
            const res = await api.get(`/projects/${projectId}/updates`);
            set({ updates: res.data?.data ?? [] });
        } catch {
            toast.error('โหลดข้อมูลอัปเดตไม่สำเร็จ');
        } finally {
            set({ isLoadingUpdates: false });
        }
    },

    addProjectUpdate: async (projectId, data) => {
        if (!data.title.trim() || !data.content.trim()) {
            toast.error('กรุณากรอกหัวข้อและเนื้อหา');
            return false;
        }
        set({ isSavingUpdate: true });
        try {
            await api.post(`/pioneer/projects/${projectId}/updates`, {
                title: data.title,
                content: data.content,
                visibility: 'public',
            });
            toast.success('เพิ่มอัปเดตสำเร็จ');
            await get().fetchProjectUpdates(projectId);
            return true;
        } catch {
            toast.error('เพิ่มอัปเดตไม่สำเร็จ');
            return false;
        } finally {
            set({ isSavingUpdate: false });
        }
    },

    editProjectUpdate: async (id, data) => {
        if (!data.title.trim() || !data.content.trim()) {
            toast.error('กรุณากรอกหัวข้อและเนื้อหา');
            return false;
        }
        try {
            await api.patch(`/pioneer/projects/updates/${id}`, {
                title: data.title,
                content: data.content,
            });
            set((state) => ({
                updates: state.updates.map(u => u.id === id ? { ...u, title: data.title, body: data.content } : u),
            }));
            toast.success('แก้ไขอัปเดตสำเร็จ');
            return true;
        } catch {
            toast.error('แก้ไขไม่สำเร็จ');
            return false;
        }
    },

    deleteProjectUpdate: async (id) => {
        try {
            await api.delete(`/pioneer/projects/updates/${id}`);
            set((state) => ({ updates: state.updates.filter(u => u.id !== id) }));
            toast.success('ลบอัปเดตสำเร็จ');
            return true;
        } catch {
            toast.error('ลบไม่สำเร็จ');
            return false;
        }
    },

    // ดึงรายการหมวดหมู่ทั้งหมดสำหรับ dropdown เลือกหมวดหมู่ใน Step1Basics
    fetchCategories: async () => {
        try {
            const res = await api.get('/categories');
            return res.data?.data ?? [];
        } catch {
            return [];
        }
    },

    // อัปโหลดไฟล์ดิบ (รูป/วิดีโอ/เอกสาร) ขึ้น Cloudinary ผ่าน backend endpoint /upload — คืน url + type ที่ backend ตรวจจับให้
    uploadFile: async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            });
            const { url, type } = res.data?.data ?? {};
            return url ? { url, type } : null;
        } catch {
            return null;
        }
    },

    // ผูก URL ของไฟล์ที่ upload แล้วเข้ากับโปรเจกต์ (บันทึกลง media table ของโปรเจกต์นี้)
    attachProjectMedia: async (projectId, url, type) => {
        await api.post(`/pioneer/projects/${projectId}/media`, [{ url, type: [type] }]);
    },

    // ดึงรายการ media ทั้งหมดของโปรเจกต์ — ใช้หา id ของ media ที่เพิ่ง attach ไป (attachProjectMedia ไม่คืน id กลับมาตรงๆ)
    fetchProjectMedia: async (projectId) => {
        const res = await api.get(`/pioneer/projects/${projectId}/media`);
        return res.data?.data ?? [];
    },

    // ลบ media ตาม id ออกจากโปรเจกต์ (ใช้ตอนผู้ใช้กดลบรูป/วิดีโอ)
    deleteProjectMedia: async (mediaId) => {
        await api.delete(`/pioneer/projects/media/${mediaId}`);
    },
}))
