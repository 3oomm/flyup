import { useState } from 'react';
import toast from 'react-hot-toast';
import { isValidHttpUrl } from '../../../lib/validation';
import type { CreateMeetingPayload, Meeting, MeetingType } from './types';

export interface MeetingFormValues {
  milestoneId: string;
  date: string;
  time: string;
  meetingType: MeetingType | '';
  meetingUrl: string;
  location: string;
  agenda: string;
}

const EMPTY: MeetingFormValues = {
  milestoneId: '',
  date: '',
  time: '',
  meetingType: '',
  meetingUrl: '',
  location: '',
  agenda: '',
};

function fromMeeting(m: Meeting): MeetingFormValues {
  const dateObj = new Date(m.date);
  const timeObj = new Date(m.time);
  const date = Number.isNaN(dateObj.getTime())
    ? ''
    : `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`;
  const time = Number.isNaN(timeObj.getTime())
    ? ''
    : `${String(timeObj.getUTCHours()).padStart(2, '0')}:${String(timeObj.getUTCMinutes()).padStart(2, '0')}`;
  return {
    milestoneId: String(m.milestone_id),
    date,
    time,
    meetingType: m.meeting_type,
    meetingUrl: m.link ?? '',
    location: m.place ?? '',
    agenda: m.about || m.description || '',
  };
}

export function useMeetingForm(initial?: Meeting) {
  const [values, setValues] = useState<MeetingFormValues>(
    initial ? fromMeeting(initial) : EMPTY,
  );

  const setField = <K extends keyof MeetingFormValues>(key: K, val: MeetingFormValues[K]) =>
    setValues(prev => ({ ...prev, [key]: val }));

  const reset = () => setValues(EMPTY);
  const setFromMeeting = (m: Meeting) => setValues(fromMeeting(m));

  const buildPayload = (): CreateMeetingPayload | null => {
    if (!values.milestoneId) { toast.error('กรุณาเลือก Milestone'); return null; }
    if (!values.date) { toast.error('กรุณาเลือกวันที่'); return null; }
    if (!values.time) { toast.error('กรุณาเลือกเวลา'); return null; }
    const meetingStartsAt = new Date(`${values.date}T${values.time}:00`);
    if (Number.isNaN(meetingStartsAt.getTime())) {
      toast.error('วันที่หรือเวลานัดหมายไม่ถูกต้อง');
      return null;
    }
    if (meetingStartsAt.getTime() <= Date.now()) {
      toast.error('ไม่สามารถนัดหมายในเวลาที่ผ่านมาแล้ว กรุณาเลือกเวลาในอนาคต');
      return null;
    }
    if (!values.meetingType) { toast.error('กรุณาเลือกรูปแบบการประชุม'); return null; }
    if ((values.meetingType === 'online' || values.meetingType === 'hybrid') && !values.meetingUrl.trim()) {
      toast.error('กรุณาระบุลิงก์ประชุม');
      return null;
    }
    if ((values.meetingType === 'online' || values.meetingType === 'hybrid') && !isValidHttpUrl(values.meetingUrl)) {
      toast.error('ลิงก์ประชุมไม่ถูกต้อง กรุณาใช้ URL ที่ขึ้นต้นด้วย http:// หรือ https://');
      return null;
    }
    if ((values.meetingType === 'onsite' || values.meetingType === 'hybrid') && !values.location.trim()) {
      toast.error('กรุณาระบุสถานที่');
      return null;
    }

    return {
      milestone_id: Number(values.milestoneId),
      date: values.date,
      time: values.time,
      meeting_type: values.meetingType,
      link: values.meetingType === 'online' || values.meetingType === 'hybrid' ? values.meetingUrl.trim() : undefined,
      place: values.meetingType === 'onsite' || values.meetingType === 'hybrid' ? values.location.trim() : undefined,
      description: values.agenda.trim(),
      about: values.agenda.trim(),
    };
  };

  return { values, setField, reset, setFromMeeting, buildPayload };
}
