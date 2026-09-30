import { useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useMeetingStore } from '../../../store/useMeetingStore';
import MeetingFormFields from './MeetingFormFields';
import { useMeetingForm } from './useMeetingForm';
import type { MilestoneOption } from './types';

interface CreateMeetingFormProps {
  milestones: MilestoneOption[];
  milestonesLoading: boolean;
  onCreated: () => void;
}

export default function CreateMeetingForm({ milestones, milestonesLoading, onCreated }: CreateMeetingFormProps) {
  const { createMeeting, isSubmitting } = useMeetingStore();
  const form = useMeetingForm();
  const [searchParams] = useSearchParams();
  const requestedMilestoneId = searchParams.get('milestoneId');

  useEffect(() => {
    if (milestonesLoading) return;
    const currentId = form.values.milestoneId;
    if (milestones.some(milestone => String(milestone.id) === currentId)) return;

    const preferred = milestones.find(milestone => String(milestone.id) === requestedMilestoneId);
    const nextId = String((preferred ?? milestones[0])?.id ?? '');
    if (currentId !== nextId) form.setField('milestoneId', nextId);
  }, [milestones, milestonesLoading, requestedMilestoneId, form.values.milestoneId, form.setField]);

  const handleSubmit = async () => {
    const payload = form.buildPayload();
    if (!payload) return;
    const ok = await createMeeting(payload);
    if (ok) {
      form.reset();
      onCreated();
    }
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-6 flex flex-col gap-5">
      <h2 className="text-base font-bold text-foreground">สร้างนัดหมายใหม่</h2>

      <MeetingFormFields
        values={form.values}
        errors={form.errors}
        setField={form.setField}
        milestones={milestones}
        milestonesLoading={milestonesLoading}
      />

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-white py-3 rounded-[10px] text-[14px] font-semibold transition-opacity disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {isSubmitting ? 'กำลังส่ง...' : 'ส่งนัดหมาย'}
      </button>
    </div>
  );
}
