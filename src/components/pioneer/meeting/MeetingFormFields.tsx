import { useEffect, useId, useRef, useState } from 'react';
import { Video, MapPin, ChevronDown } from 'lucide-react';
import type { MeetingFormErrors, MeetingFormValues } from './useMeetingForm';
import type { MilestoneOption } from './types';
import DateTimePicker from './DateTimePicker';

interface MeetingFormFieldsProps {
  values: MeetingFormValues;
  errors: MeetingFormErrors;
  setField: <K extends keyof MeetingFormValues>(key: K, val: MeetingFormValues[K]) => void;
  milestones: MilestoneOption[];
  milestonesLoading: boolean;
  milestoneDisabled?: boolean;
}

export default function MeetingFormFields({
  values, errors, setField, milestones, milestonesLoading, milestoneDisabled,
}: MeetingFormFieldsProps) {
  const { milestoneId, date, time, meetingType, meetingUrl, location, agenda } = values;
  const selectedMilestone = milestones.find(m => String(m.id) === String(milestoneId));
  const [milestoneMenuOpen, setMilestoneMenuOpen] = useState(false);
  const milestoneMenuRef = useRef<HTMLDivElement>(null);
  const milestoneTriggerRef = useRef<HTMLButtonElement>(null);
  const milestoneOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const milestoneLabelId = useId();
  const milestoneListId = useId();
  const errorId = useId();
  const milestoneSelectDisabled = milestoneDisabled || milestonesLoading || milestones.length === 0;

  useEffect(() => {
    if (!milestoneMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!milestoneMenuRef.current?.contains(event.target as Node)) setMilestoneMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [milestoneMenuOpen]);

  useEffect(() => {
    if (milestoneSelectDisabled) setMilestoneMenuOpen(false);
  }, [milestoneSelectDisabled]);

  const focusMilestoneOption = (index: number) => {
    milestoneOptionRefs.current[index]?.focus();
  };
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
      <div className="flex flex-col gap-1.5 min-w-0">
        <label id={milestoneLabelId} className="text-[13px] font-medium text-foreground">
          Milestone ที่เกี่ยวข้อง <span className="text-error">*</span>
        </label>
        <div ref={milestoneMenuRef} className="relative min-w-0">
          <button
            ref={milestoneTriggerRef}
            type="button"
            aria-labelledby={milestoneLabelId}
            aria-haspopup="listbox"
            aria-expanded={milestoneMenuOpen}
            aria-controls={milestoneMenuOpen ? milestoneListId : undefined}
            aria-invalid={!!errors.milestoneId}
            aria-describedby={errors.milestoneId ? `${errorId}-milestone` : undefined}
            disabled={milestoneSelectDisabled}
            onClick={() => setMilestoneMenuOpen(open => !open)}
            onKeyDown={event => {
              if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !milestoneSelectDisabled) {
                event.preventDefault();
                setMilestoneMenuOpen(true);
                requestAnimationFrame(() => focusMilestoneOption(event.key === 'ArrowDown' ? 0 : milestones.length - 1));
              } else if (event.key === 'Escape') {
                setMilestoneMenuOpen(false);
              }
            }}
            className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-[8px] border bg-white px-3 py-2.5 text-left text-[14px] outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${errors.milestoneId ? 'border-error' : 'border-border'}`}
          >
            <span className="min-w-0 truncate">
              {selectedMilestone
                ? `${selectedMilestone.project_title} — ${selectedMilestone.phase_no ? `Phase ${selectedMilestone.phase_no}: ${selectedMilestone.title}` : selectedMilestone.title}`
                : milestonesLoading ? 'กำลังโหลด...' : '-- เลือก Milestone --'}
            </span>
            <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${milestoneMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {milestoneMenuOpen && (
            <div id={milestoneListId} role="listbox" aria-labelledby={milestoneLabelId} className="absolute z-30 left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-[8px] border border-border bg-white p-1 shadow-lg">
              {milestones.map((milestone, index) => (
                <button
                  key={milestone.id}
                  ref={element => { milestoneOptionRefs.current[index] = element; }}
                  type="button"
                  role="option"
                  aria-selected={String(milestone.id) === String(milestoneId)}
                  onClick={() => {
                    setField('milestoneId', String(milestone.id));
                    setMilestoneMenuOpen(false);
                    milestoneTriggerRef.current?.focus();
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Escape') {
                      setMilestoneMenuOpen(false);
                      milestoneTriggerRef.current?.focus();
                    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      focusMilestoneOption((index + (event.key === 'ArrowDown' ? 1 : -1) + milestones.length) % milestones.length);
                    }
                  }}
                  className={`block w-full min-w-0 rounded-md px-3 py-2 text-left text-[13px] hover:bg-primary/10 focus:bg-primary/10 focus:outline-none cursor-pointer ${String(milestone.id) === String(milestoneId) ? 'bg-primary/5 text-primary' : 'text-foreground'}`}
                >
                  <span className="block min-w-0 break-words [overflow-wrap:anywhere] font-medium">{milestone.project_title}</span>
                  <span className="block min-w-0 break-words [overflow-wrap:anywhere] text-muted-foreground">{milestone.phase_no ? `Phase ${milestone.phase_no}: ${milestone.title}` : milestone.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.milestoneId && <p id={`${errorId}-milestone`} role="alert" className="text-[12px] text-error">{errors.milestoneId}</p>}
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
          error={errors.dateTime}
          errorId={`${errorId}-date-time`}
        />
        {errors.dateTime && <p id={`${errorId}-date-time`} role="alert" className="text-[12px] text-error">{errors.dateTime}</p>}
      </div>

      {/* Meeting Type */}
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-foreground">
          รูปแบบการประชุม <span className="text-error">*</span>
        </label>
        <div className={`flex flex-col gap-2 rounded-[8px] ${errors.meetingType ? 'border border-error p-2' : ''}`} aria-invalid={!!errors.meetingType}>
          {([
            { value: 'online' as const, icon: <Video size={15} />, label: 'ออนไลน์' },
            { value: 'onsite' as const, icon: <MapPin size={15} />, label: 'ออนไซต์' },
            { value: 'hybrid' as const, icon: <Video size={15} />, label: 'ไฮบริด (ออนไลน์ + ออนไซต์)' },
          ]).map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name={`${errorId}-meeting-type`}
                value={opt.value}
                checked={meetingType === opt.value}
                onChange={() => setField('meetingType', opt.value)}
                className="sr-only peer"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${meetingType === opt.value ? 'border-primary' : 'border-border'}`}
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
        {errors.meetingType && <p role="alert" className="text-[12px] text-error">{errors.meetingType}</p>}
      </div>

      {/* Meeting URL */}
      {(meetingType === 'online' || meetingType === 'hybrid') && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${errorId}-meeting-url`} className="text-[13px] font-medium text-foreground">
            ลิงก์ประชุม (Google Meet / Zoom) <span className="text-error">*</span>
          </label>
          <input
            id={`${errorId}-meeting-url`}
            type="url"
            value={meetingUrl}
            onChange={e => setField('meetingUrl', e.target.value)}
            placeholder="https://meet.google.com/..."
            maxLength={2048}
            aria-invalid={!!errors.meetingUrl}
            aria-describedby={errors.meetingUrl ? `${errorId}-meeting-url-error` : undefined}
            className={`border rounded-[8px] px-3 py-2.5 text-[14px] outline-none focus:border-primary transition-colors ${errors.meetingUrl ? 'border-error' : 'border-border'}`}
          />
          {errors.meetingUrl && <p id={`${errorId}-meeting-url-error`} role="alert" className="text-[12px] text-error">{errors.meetingUrl}</p>}
        </div>
      )}

      {/* Location */}
      {(meetingType === 'onsite' || meetingType === 'hybrid') && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${errorId}-location`} className="text-[13px] font-medium text-foreground">
            สถานที่ <span className="text-error">*</span>
          </label>
          <input
            id={`${errorId}-location`}
            type="text"
            value={location}
            onChange={e => setField('location', e.target.value)}
            placeholder="ระบุสถานที่..."
            aria-invalid={!!errors.location}
            aria-describedby={errors.location ? `${errorId}-location-error` : undefined}
            className={`border rounded-[8px] px-3 py-2.5 text-[14px] outline-none focus:border-primary transition-colors ${errors.location ? 'border-error' : 'border-border'}`}
          />
          {errors.location && <p id={`${errorId}-location-error`} role="alert" className="text-[12px] text-error">{errors.location}</p>}
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
