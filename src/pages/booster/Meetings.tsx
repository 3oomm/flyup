import { useState, useEffect, useMemo } from 'react';
import { Video, Clock, ChevronDown, ExternalLink, Calendar, MapPin, Ban, CheckCircle } from 'lucide-react';
import { useBoosterStore, type BoosterMeeting } from '../../store/useBoosterStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateThai(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.substring(0, 5);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function getMeetingDatetime(date: string, time: string): Date | null {
  try {
    const dateD = new Date(date);
    const timeD = new Date(time);
    if (isNaN(dateD.getTime()) || isNaN(timeD.getTime())) return null;
    return new Date(
      dateD.getUTCFullYear(), dateD.getUTCMonth(), dateD.getUTCDate(),
      timeD.getUTCHours(), timeD.getUTCMinutes()
    );
  } catch { return null; }
}

const TYPE_LABEL: Record<string, string> = { online: 'ออนไลน์', onsite: 'ออนไซต์', hybrid: 'ไฮบริด' };

// ─── Meeting Card ─────────────────────────────────────────────────────────────

const MEETING_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours after start time

function MeetingCard({ meeting, now }: { meeting: BoosterMeeting; now: Date }) {
  const [expanded, setExpanded] = useState(false);

  const isCancelled = meeting.status === 'cancelled' || meeting.status === 'canceled';
  const isClosed    = meeting.status === 'closed';
  const isOpen      = meeting.status === 'open';

  const meetingDatetime = getMeetingDatetime(meeting.date, meeting.time);
  const isOngoing  = isOpen && !!meetingDatetime && meetingDatetime <= now && now < new Date(meetingDatetime.getTime() + MEETING_WINDOW_MS);
  const isUpcoming = isOpen && (!meetingDatetime || meetingDatetime > now);

  const projectTitle = meeting.project?.title || 'โปรเจกต์';
  const phaseLabel   = meeting.milestone
    ? `Phase ${meeting.milestone.phase_no || ''}: ${meeting.milestone.title || ''}`
    : '';
  const typeStr = TYPE_LABEL[meeting.meeting_type ?? ''] ?? meeting.meeting_type ?? '';
  const agenda = meeting.about || meeting.description;
  const hasDetail = !!agenda || !!meeting.link || !!meeting.place;

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all ${expanded ? 'border-primary/30' : 'border-border'} ${isCancelled ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-4 p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isCancelled ? 'bg-muted text-muted-foreground' :
          isClosed    ? 'bg-muted text-muted-foreground' :
                        'bg-purple-100 text-primary'
        }`}>
          {isCancelled ? <Ban size={20} /> : isClosed ? <CheckCircle size={20} /> : <Video size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-sm truncate">
            {projectTitle}
            {phaseLabel && <span className="text-muted-foreground font-normal"> — {phaseLabel}</span>}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDateThai(meeting.date)} เวลา {formatTime(meeting.time)}
            {typeStr && <> · {typeStr}</>}
            {meeting.place && <> · <MapPin size={10} className="inline" /> {meeting.place}</>}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCancelled ? (
            <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">ยกเลิก</span>
          ) : isClosed ? (
            <span className="text-xs font-medium text-muted-foreground border border-border px-3 py-1.5 rounded-full">ปิดแล้ว</span>
          ) : isOngoing ? (
            <>
              <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full animate-pulse hidden sm:inline-block">กำลังประชุม</span>
              {meeting.link && (
                <a href={meeting.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity">
                  <Video size={14} /> เข้าร่วม
                </a>
              )}
            </>
          ) : isUpcoming ? (
            <>
              <span className="text-xs font-medium text-primary bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full hidden sm:inline-block">กำลังจะถึง</span>
              {meeting.link && (
                <a href={meeting.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity">
                  <Video size={14} /> เข้าร่วม
                </a>
              )}
            </>
          ) : (
            <span className="text-xs font-medium text-muted-foreground border border-border px-3 py-1.5 rounded-full">เสร็จสิ้น</span>
          )}

          {hasDetail && (
            <button onClick={() => setExpanded(!expanded)}
              className={`p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer ${expanded ? 'text-primary' : 'text-muted-foreground'}`}>
              <ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 bg-muted/30 flex flex-col sm:flex-row gap-6">
          {agenda && (
            <div className="flex-1">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">วาระการประชุม</h4>
              <ul className="space-y-2 list-disc pl-4">
                {agenda.split('\n').filter(l => l.trim()).map((a, i) => (
                  <li key={i} className="text-sm text-foreground">{a}</li>
                ))}
              </ul>
            </div>
          )}

          {meeting.link && (
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">ลิงก์ประชุม</h4>
              <a href={meeting.link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline font-medium break-all">
                {meeting.link} <ExternalLink size={14} />
              </a>
            </div>
          )}

          {meeting.place && (
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">สถานที่</h4>
              <p className="flex items-center gap-1.5 text-sm text-foreground">
                <MapPin size={14} className="text-muted-foreground shrink-0" /> {meeting.place}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Meetings = () => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'past'>('upcoming');
  const [now, setNow] = useState(() => new Date());
  const { boosterMeetings, fetchBoosterMeetings } = useBoosterStore();

  useEffect(() => {
    fetchBoosterMeetings();
    const interval = window.setInterval(() => {
      setNow(new Date());
      fetchBoosterMeetings();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [fetchBoosterMeetings]);

  const filtered = useMemo(() =>
    boosterMeetings.filter((m: BoosterMeeting) => {
      if (filter === 'all') return true;
      const isCancelled = m.status === 'cancelled' || m.status === 'canceled';
      const isClosed    = m.status === 'closed';
      const isOpen      = m.status === 'open';
      const dt = getMeetingDatetime(m.date, m.time);
      const ongoing  = isOpen && !!dt && dt <= now && now < new Date(dt.getTime() + MEETING_WINDOW_MS);
      const upcoming = isOpen && (!dt || dt > now);
      if (filter === 'ongoing')  return ongoing;
      if (filter === 'upcoming') return upcoming && !isCancelled;
      if (filter === 'past')     return isClosed || isCancelled || (!upcoming && !ongoing && isOpen);
      return true;
    }),
    [boosterMeetings, filter, now]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">การประชุม</h1>
        <p className="text-sm text-muted-foreground mt-1">นัดหมายประชุม Milestone กับทีมโปรเจกต์</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">รายการนัดหมาย</h2>
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
            className="text-sm bg-background border border-border rounded-lg px-2 py-1 outline-none focus:border-primary cursor-pointer">
            <option value="upcoming">กำลังจะถึง</option>
            <option value="ongoing">กำลังประชุม</option>
            <option value="past">ที่ผ่านมา</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((m: BoosterMeeting) => <MeetingCard key={m.id} meeting={m} now={now} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-2xl text-muted-foreground">
            <Calendar size={28} className="mb-2" />
            <p className="text-sm">ไม่มีนัดหมายที่ตรงกับเงื่อนไข</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Meetings;
