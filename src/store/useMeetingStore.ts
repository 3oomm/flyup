import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { usePioneerBadgeStore } from './usePioneerBadgeStore';
import {
  MEETING_ELIGIBLE_MILESTONE_STATUS,
  type CreateMeetingPayload,
  type Meeting,
  type MilestoneOption,
} from '../components/pioneer/meeting/types';

interface ProjectRef {
  id: number;
  title: string;
}

interface MeetingStoreState {
  meetings: Meeting[];
  milestones: MilestoneOption[];
  meetingsLoading: boolean;
  milestonesLoading: boolean;
  isSubmitting: boolean;

  fetchMyMeetings: (projects: ProjectRef[]) => Promise<void>;
  fetchEligibleMilestones: (projects: ProjectRef[]) => Promise<void>;
  createMeeting: (payload: CreateMeetingPayload) => Promise<boolean>;
  editMeeting: (id: number, payload: CreateMeetingPayload) => Promise<boolean>;
  cancelMeeting: (id: number) => Promise<boolean>;
}

const BACKEND_ERROR_TH: Record<string, string> = {
  'meeting already exists for this milestone': 'มี Milestone นี้นัดหมายอยู่แล้ว ไม่สามารถสร้างซ้ำได้',
  'cannot create meeting: milestone is expired': 'ไม่สามารถนัดหมายได้ Milestone นี้หมดเวลาแล้ว',
  'cannot schedule meeting after milestone due date': 'ไม่สามารถนัดหมายหลังจากวันสิ้นสุด Milestone ได้',
  'cannot create meeting: milestone is not active': 'Milestone นี้ยังไม่พร้อมนัดหมาย',
  'forbidden: you cannot use this milestone': 'คุณไม่มีสิทธิ์ใช้ Milestone นี้',
}

function toThaiError(msg: string): string {
  return BACKEND_ERROR_TH[msg] ?? msg
}

export const useMeetingStore = create<MeetingStoreState>((set) => ({
  meetings: [],
  milestones: [],
  meetingsLoading: false,
  milestonesLoading: false,
  isSubmitting: false,

  fetchMyMeetings: async (projects) => {
    if (projects.length === 0) {
      set({ meetings: [] });
      return;
    }
    set({ meetingsLoading: true });
    try {
      const results = await Promise.all(
        projects.map(p =>
          api
            .get(`/me/projects/${p.id}/meetings`, { params: { filter: 'all' } })
            .then(r => (r.data?.data ?? []) as Meeting[])
            .catch(() => [] as Meeting[])
        )
      );
      set({ meetings: results.flat() });
    } finally {
      set({ meetingsLoading: false });
    }
  },

  fetchEligibleMilestones: async (projects) => {
    if (projects.length === 0) {
      set({ milestones: [] });
      return;
    }
    set({ milestonesLoading: true });
    try {
      const results = await Promise.all(
        projects.map(p =>
          api
            .get(`/projects/${p.id}/milestones`)
            .then(res => {
              const raw: { id: number; phase_no?: number; title?: string; status?: string; due_date?: string }[] =
                res.data?.data ?? [];
              return raw
                .filter(m => m.status === MEETING_ELIGIBLE_MILESTONE_STATUS)
                .map<MilestoneOption>(m => ({
                  id: m.id,
                  phase_no: m.phase_no,
                  title: m.title ?? `Phase ${m.phase_no ?? '?'}`,
                  status: m.status ?? '',
                  project_id: p.id,
                  project_title: p.title,
                  due_date: m.due_date,
                }));
            })
            .catch(() => [] as MilestoneOption[])
        )
      );
      set({ milestones: results.flat() });
    } finally {
      set({ milestonesLoading: false });
    }
  },

  createMeeting: async (payload) => {
    set({ isSubmitting: true });
    try {
      await api.post(`/pioneer/projects/meeting`, payload);
      void usePioneerBadgeStore.getState().fetchBadges();
      toast.success('ส่งนัดหมายเรียบร้อยแล้ว');
      return true;
    } catch (err: unknown) {
      const raw =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'เกิดข้อผิดพลาด กรุณาลองใหม่';
      toast.error(toThaiError(raw));
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  editMeeting: async (id, payload) => {
    set({ isSubmitting: true });
    try {
      await api.patch(`/pioneer/projects/meeting/${id}`, payload);
      toast.success('แก้ไขนัดหมายเรียบร้อยแล้ว');
      return true;
    } catch (err: unknown) {
      const raw =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'เกิดข้อผิดพลาด กรุณาลองใหม่';
      toast.error(toThaiError(raw));
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  cancelMeeting: async (id) => {
    set({ isSubmitting: true });
    try {
      await api.patch(`/pioneer/projects/cancel/meeting/${id}`);
      void usePioneerBadgeStore.getState().fetchBadges();
      toast.success('ยกเลิกนัดหมายเรียบร้อยแล้ว');
      return true;
    } catch (err: unknown) {
      const raw =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'เกิดข้อผิดพลาด กรุณาลองใหม่';
      toast.error(toThaiError(raw));
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },
}));
