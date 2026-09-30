import { useState } from 'react';
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

export type MeetingFormErrors = Partial<Record<'milestoneId' | 'dateTime' | 'meetingType' | 'meetingUrl' | 'location', string>>;

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
  const [errors, setErrors] = useState<MeetingFormErrors>({});

  const setField = <K extends keyof MeetingFormValues>(key: K, val: MeetingFormValues[K]) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setErrors(prev => {
      const next = { ...prev };
      if (key === 'date' || key === 'time') delete next.dateTime;
      else delete next[key as keyof MeetingFormErrors];
      if (key === 'meetingType') {
        delete next.meetingUrl;
        delete next.location;
      }
      return next;
    });
  };

  const reset = () => { setValues(EMPTY); setErrors({}); };
  const setFromMeeting = (m: Meeting) => { setValues(fromMeeting(m)); setErrors({}); };

  const buildPayload = (): CreateMeetingPayload | null => {
    const nextErrors: MeetingFormErrors = {};
    if (!values.milestoneId) nextErrors.milestoneId = 'กรุณาเลือก Milestone';
    if (!values.date || !values.time) {
      nextErrors.dateTime = 'กรุณาเลือกวันที่และเวลา';
    } else {
      const meetingStartsAt = new Date(`${values.date}T${values.time}:00`);
      if (Number.isNaN(meetingStartsAt.getTime())) nextErrors.dateTime = 'วันที่หรือเวลานัดหมายไม่ถูกต้อง';
      else if (meetingStartsAt.getTime() <= Date.now()) nextErrors.dateTime = 'เวลานี้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต';
    }
    if (!values.meetingType) nextErrors.meetingType = 'กรุณาเลือกรูปแบบการประชุม';
    if (values.meetingType === 'online' || values.meetingType === 'hybrid') {
      if (!values.meetingUrl.trim()) nextErrors.meetingUrl = 'กรุณาระบุลิงก์ประชุม';
      else if (!isValidHttpUrl(values.meetingUrl)) nextErrors.meetingUrl = 'กรุณาใช้ลิงก์ที่ขึ้นต้นด้วย http:// หรือ https://';
    }
    if ((values.meetingType === 'onsite' || values.meetingType === 'hybrid') && !values.location.trim()) {
      nextErrors.location = 'กรุณาระบุสถานที่';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    return {
      milestone_id: Number(values.milestoneId),
      date: values.date,
      time: values.time,
      meeting_type: values.meetingType as MeetingType,
      link: values.meetingType === 'online' || values.meetingType === 'hybrid' ? values.meetingUrl.trim() : undefined,
      place: values.meetingType === 'onsite' || values.meetingType === 'hybrid' ? values.location.trim() : undefined,
      description: values.agenda.trim(),
      about: values.agenda.trim(),
    };
  };

  return { values, errors, setField, reset, setFromMeeting, buildPayload };
}
