import { useEffect } from 'react';
import { Save, Loader2, X } from 'lucide-react';
import { useMeetingStore } from '../../../store/useMeetingStore';
import MeetingFormFields from './MeetingFormFields';
import { useMeetingForm } from './useMeetingForm';
import type { Meeting, MilestoneOption } from './types';

interface EditMeetingModalProps {
  meeting: Meeting;
  milestones: MilestoneOption[];
  milestonesLoading: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditMeetingModal({
  meeting, milestones, milestonesLoading, onClose, onSaved,
}: EditMeetingModalProps) {
  const { editMeeting, isSubmitting } = useMeetingStore();
  const form = useMeetingForm(meeting);

  useEffect(() => {
    form.setFromMeeting(meeting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    const payload = form.buildPayload();
    if (!payload) return;
    const ok = await editMeeting(meeting.id, payload);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">แก้ไขนัดหมาย</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <MeetingFormFields
          values={form.values}
          errors={form.errors}
          setField={form.setField}
          milestones={milestones}
          milestonesLoading={milestonesLoading}
          milestoneDisabled
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-[10px] text-[14px] font-semibold border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-white py-3 rounded-[10px] text-[14px] font-semibold transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}
