import { useEffect, useState } from 'react';
import {
  Video, MapPin, ChevronDown, ExternalLink, CheckCircle, Pencil, Trash2, Ban,
} from 'lucide-react';
import { MEETING_TYPE_LABEL, MEETING_WINDOW_MS, type Meeting } from './types';

function formatDateThai(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}


interface MeetingCardProps {
  meeting: Meeting;
  projectTitle: string;
  phaseLabel: string | null;
  onEdit?: (m: Meeting) => void;
  onCancel?: (m: Meeting) => void;
}

export default function MeetingCard({
  meeting, projectTitle, phaseLabel, onEdit, onCancel,
}: MeetingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const typeLabel = MEETING_TYPE_LABEL[meeting.meeting_type] ?? meeting.meeting_type;
  const agenda = meeting.about || meeting.description;
  const hasDetail = !!agenda || !!meeting.link || !!meeting.place;
  const isCanceled = meeting.status === 'cancelled';
  const isClosed = meeting.status === 'closed';
  const isOpen = meeting.status === 'open';

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  // วันที่และเวลาจาก API เป็นคนละฟิลด์ และเวลาเป็นเวลาท้องถิ่นของผู้ใช้
  const meetingDatetime = (() => {
    try {
      const dateD = new Date(meeting.date)
      const timeD = new Date(meeting.time)
      const combined = new Date(
        dateD.getUTCFullYear(), dateD.getUTCMonth(), dateD.getUTCDate(),
        timeD.getUTCHours(), timeD.getUTCMinutes()
      )
      return combined
    } catch { return null }
  })()
  const isOngoing  = isOpen && !!meetingDatetime && meetingDatetime <= now && now < new Date(meetingDatetime.getTime() + MEETING_WINDOW_MS)
  const isUpcoming = isOpen && (!meetingDatetime || meetingDatetime > now)
  const canModify = isUpcoming;

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${expanded ? 'border-primary/40 shadow-sm' : 'border-border'} ${isCanceled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-4 p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCanceled || isClosed ? 'bg-muted text-muted-foreground' : 'bg-purple-100 text-primary'}`}>
          {isCanceled ? <Ban size={20} /> : isClosed ? <CheckCircle size={20} /> : <Video size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-sm">
            {projectTitle}
            {phaseLabel && (
              <span className="text-muted-foreground font-normal"> — {phaseLabel}</span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDateThai(meeting.date)} เวลา {formatTime(meeting.time)} · {typeLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCanceled ? (
            <span className="text-xs font-medium text-error border border-error/30 bg-error/5 px-3 py-1.5 rounded-full">
              ยกเลิก
            </span>
          ) : isClosed || (isOpen && !isUpcoming && !isOngoing) ? (
            <span className="text-xs font-medium text-muted-foreground border border-border px-3 py-1.5 rounded-full">
              เสร็จสิ้น
            </span>
          ) : isOngoing ? (
            <>
              <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full animate-pulse hidden sm:inline-block">
                กำลังประชุม
              </span>
              {meeting.link && (
                <a
                  href={meeting.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Video size={13} /> เข้าร่วม
                </a>
              )}
              {hasDetail && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={`p-2 rounded-lg hover:bg-muted transition-colors ${expanded ? 'text-primary' : 'text-muted-foreground'} cursor-pointer`}
                >
                  <ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-primary bg-purple-50 border border-primary/20 px-3 py-1.5 rounded-full hidden sm:inline-block">
                กำลังจะถึง
              </span>
              {meeting.link && (
                <a
                  href={meeting.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Video size={13} /> เข้าร่วม
                </a>
              )}
              {canModify && onEdit && (
                <button
                  onClick={() => onEdit(meeting)}
                  title="แก้ไข"
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary cursor-pointer"
                >
                  <Pencil size={15} />
                </button>
              )}
              {canModify && onCancel && (
                <button
                  onClick={() => onCancel(meeting)}
                  title="ยกเลิกนัดหมาย"
                  className="p-2 rounded-lg hover:bg-error/10 transition-colors text-muted-foreground hover:text-error cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              )}
              {hasDetail && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={`p-2 rounded-lg hover:bg-muted transition-colors ${expanded ? 'text-primary' : 'text-muted-foreground'} cursor-pointer`}
                >
                  <ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {expanded && hasDetail && (
        <div className="border-t border-border px-5 py-4 bg-muted/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row gap-6">
            {agenda && (
              <div className="flex-1">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">วาระการประชุม</h4>
                <p className="text-sm text-foreground whitespace-pre-line">{agenda}</p>
              </div>
            )}

            {meeting.link && (
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">ลิงก์ประชุม</h4>
                <a
                  href={meeting.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
                >
                  <ExternalLink size={13} /> {meeting.link}
                </a>
              </div>
            )}

            {meeting.place && (
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">สถานที่</h4>
                <p className="text-sm text-foreground flex items-center gap-1">
                  <MapPin size={13} className="text-muted-foreground" /> {meeting.place}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
