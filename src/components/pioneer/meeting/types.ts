export type MeetingType = 'online' | 'onsite' | 'hybrid';
export type MeetingStatus = 'open' | 'closed' | 'cancelled';
export type FilterMode = 'upcoming' | 'ongoing' | 'past' | 'all';

export const MEETING_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface Meeting {
  id: number;
  milestone_id: number;
  date: string;
  time: string;
  meeting_type: MeetingType;
  link?: string | null;
  place?: string | null;
  about: string;
  description?: string | null;
  status: MeetingStatus;
}

export interface MilestoneOption {
  id: number;
  phase_no?: number;
  title: string;
  status: string;
  project_id: number;
  project_title: string;
  due_date?: string;
}

export interface CreateMeetingPayload {
  milestone_id: number;
  date: string;
  time: string;
  meeting_type: MeetingType;
  link?: string;
  place?: string;
  description: string;
  about: string;
}

export const MEETING_TYPE_LABEL: Record<MeetingType, string> = {
  online: 'ออนไลน์',
  onsite: 'ออนไซต์',
  hybrid: 'ไฮบริด',
};

export const MEETING_ELIGIBLE_PROJECT_STATES = ['funding', 'executing', 'closed'];
export const MEETING_ELIGIBLE_MILESTONE_STATUS = 'approved';
