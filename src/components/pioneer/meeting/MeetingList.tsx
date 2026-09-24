import { Loader2 } from 'lucide-react';
import MeetingCard from './MeetingCard';
import type { FilterMode, Meeting, MilestoneOption } from './types';
import { MEETING_WINDOW_MS } from './types';

interface MeetingListProps {
  meetings: Meeting[];
  loading: boolean;
  filter: FilterMode;
  onFilterChange: (f: FilterMode) => void;
  milestones: MilestoneOption[];
  onEdit?: (m: Meeting) => void;
  onCancel?: (m: Meeting) => void;
}

const FILTER_TABS: { value: FilterMode; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'upcoming', label: 'กำลังจะถึง' },
  { value: 'ongoing', label: 'กำลังประชุม' },
  { value: 'past', label: 'ผ่านมาแล้ว' },
];

function getMeetingDatetime(m: Meeting): Date | null {
  const d = new Date(m.date)
  const t = new Date(m.time)
  const datetime = new Date(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
    t.getUTCHours(), t.getUTCMinutes()
  )
  return Number.isNaN(datetime.getTime()) ? null : datetime
}

function isOngoingMeeting(m: Meeting): boolean {
  if (m.status !== 'open') return false
  const dt = getMeetingDatetime(m)
  if (!dt) return false
  const now = new Date()
  return dt <= now && now < new Date(dt.getTime() + MEETING_WINDOW_MS)
}

function isUpcomingMeeting(m: Meeting): boolean {
  if (m.status === 'cancelled' || m.status === 'closed') return false
  const dt = getMeetingDatetime(m)
  return !dt || dt > new Date()
}

export default function MeetingList({ meetings, loading, filter, onFilterChange, milestones, onEdit, onCancel }: MeetingListProps) {
  const findMilestone = (mid: number) => milestones.find(x => x.id === mid);

  const milestoneLabel = (mid: number): string | null => {
    const m = findMilestone(mid);
    if (!m) return null;
    return m.phase_no ? `Phase ${m.phase_no}` : m.title;
  };

  const projectTitleForMeeting = (meeting: Meeting): string => {
    return meeting.project_title ?? findMilestone(meeting.milestone_id)?.project_title ?? '';
  };

  const projectIdForMeeting = (meeting: Meeting): number | undefined => {
    return meeting.project_id ?? findMilestone(meeting.milestone_id)?.project_id;
  };

  const filtered = meetings.filter(m => {
    if (filter === 'ongoing')  return isOngoingMeeting(m)
    if (filter === 'upcoming') return isUpcomingMeeting(m)
    if (filter === 'past')     return !isUpcomingMeeting(m) && !isOngoingMeeting(m)
    return true
  }).sort((a, b) => {
    const aTime = getMeetingDatetime(a)?.getTime() ?? 0
    const bTime = getMeetingDatetime(b)?.getTime() ?? 0
    return bTime - aTime || b.id - a.id
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold text-foreground">การประชุมทั้งหมด</h2>

        <div className="inline-flex bg-muted rounded-[10px] p-1 gap-1">
          {FILTER_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => onFilterChange(t.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-colors cursor-pointer ${
                filter === t.value
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">ยังไม่มีการประชุม</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(m => (
            <MeetingCard
              key={m.id}
              meeting={m}
              projectId={projectIdForMeeting(m)}
              projectTitle={projectTitleForMeeting(m)}
              phaseLabel={milestoneLabel(m.milestone_id)}
              onEdit={onEdit}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
