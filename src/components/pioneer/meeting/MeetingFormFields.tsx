import { Video, MapPin } from 'lucide-react';
import type { MeetingFormValues } from './useMeetingForm';
import type { MeetingType, MilestoneOption } from './types';
import DateTimePicker from './DateTimePicker';

interface MeetingFormFieldsProps {
  values: MeetingFormValues;
  setField: <K extends keyof MeetingFormValues>(key: K, val: MeetingFormValues[K]) => void;
  milestones: MilestoneOption[];
  milestonesLoading: boolean;
  milestoneDisabled?: boolean;
}

export default function MeetingFormFields({
  values, setField, milestones, milestonesLoading, milestoneDisabled,
}: MeetingFormFieldsProps) {
  const { milestoneId, date, time, meetingType, meetingUrl, location, agenda } = values;
  const selectedMilestone = milestones.find(m => String(m.id) === String(milestoneId));
  const maxDate = (() => {
    if (selectedMilestone?.due_date) {
      return new Date(selectedMilestone.due_date).toISOString().split('T')[0];
    }
    // fallback: ไม่เกิน 1 ปีจากวันนี้ เผื่อ milestone ไม่มี due_date
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return oneYearFromNow.toISOString().split('T')[0];
  })();

  return (
    <>
      {/* Milestone */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground">
          Milestone ที่เกี่ยวข้อง <span className="text-error">*</span>
        </label>
        <select
          value={milestoneId}
          onChange={e => setField('milestoneId', e.target.value)}
          disabled={milestoneDisabled || milestonesLoading || milestones.length === 0}
          className="border border-border rounded-[8px] px-3 py-2.5 text-[14px] outline-none focus:border-primary transition-colors bg-white cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center]"
        >
          <option value="">
            {milestonesLoading ? 'กำลังโหลด...' : '-- เลือก Milestone --'}
          </option>
          {milestones.map(m => (
            <option key={m.id} value={m.id}>
              {m.project_title} — {m.phase_no ? `Phase ${m.phase_no}: ${m.title}` : m.title}
            </option>
          ))}
        </select>
        {!milestonesLoading && milestones.length === 0 && (
          <p className="text-[12px] text-muted-foreground">ยังไม่มี Milestone ที่นัดประชุมได้</p>
        )}
      </div>

      {/* Date + Time */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground">
          วันที่และเวลา <span className="text-error">*</span>
        </label>
        <DateTimePicker
          date={date}
          time={time}
          onDateChange={v => setField('date', v)}
          onTimeChange={v => setField('time', v)}
          maxDate={maxDate}
        />
      </div>

      {/* Meeting Type */}
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-foreground">
          รูปแบบการประชุม <span className="text-error">*</span>
        </label>
        <div className="flex flex-col gap-2">
          {([
            { value: 'online' as const, icon: <Video size={15} />, label: 'ออนไลน์' },
            { value: 'onsite' as const, icon: <MapPin size={15} />, label: 'ออนไซต์' },
            { value: 'hybrid' as const, icon: <Video size={15} />, label: 'ไฮบริด (ออนไลน์ + ออนไซต์)' },
          ]).map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setField('meetingType', opt.value as MeetingType)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${meetingType === opt.value ? 'border-primary' : 'border-border'}`}
              >
                {meetingType === opt.value && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="flex items-center gap-1.5 text-[14px] text-foreground">
                {opt.icon} {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Meeting URL */}
      {(meetingType === 'online' || meetingType === 'hybrid') && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground">
            ลิงก์ประชุม (Google Meet / Zoom) <span className="text-error">*</span>
          </label>
          <input
            type="url"
            value={meetingUrl}
            onChange={e => setField('meetingUrl', e.target.value)}
            placeholder="https://meet.google.com/..."
            maxLength={2048}
            className="border border-border rounded-[8px] px-3 py-2.5 text-[14px] outline-none focus:border-primary transition-colors"
          />
        </div>
      )}

      {/* Location */}
      {(meetingType === 'onsite' || meetingType === 'hybrid') && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground">
            สถานที่ <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={e => setField('location', e.target.value)}
            placeholder="ระบุสถานที่..."
            className="border border-border rounded-[8px] px-3 py-2.5 text-[14px] outline-none focus:border-primary transition-colors"
          />
        </div>
      )}

      {/* Agenda */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground">วาระการประชุม</label>
        <textarea
          value={agenda}
          onChange={e => setField('agenda', e.target.value)}
          placeholder="หัวข้อที่ต้องการพูด"
          rows={3}
          className="border border-border rounded-[8px] px-3 py-2.5 text-[14px] outline-none focus:border-primary transition-colors resize-none"
        />
      </div>
    </>
  );
}
