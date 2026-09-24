import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useMeetingStore } from '../../store/useMeetingStore';
import CreateMeetingForm from '../../components/pioneer/meeting/CreateMeetingForm';
import MeetingList from '../../components/pioneer/meeting/MeetingList';
import Swal from '../../lib/swal';
import EditMeetingModal from '../../components/pioneer/meeting/EditMeetingModal';
import {
  MEETING_ELIGIBLE_PROJECT_STATES,
  type FilterMode,
  type Meeting,
} from '../../components/pioneer/meeting/types';

const PioneerMeetings = () => {
  const { projects, fetchMyProjects } = useProjectStore();
  const {
    meetings, milestones,
    meetingsLoading, milestonesLoading,
    fetchMyMeetings, fetchEligibleMilestones, cancelMeeting,
  } = useMeetingStore();

  const [filter, setFilter] = useState<FilterMode>('all');
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [projectsReady, setProjectsReady] = useState(false);

  useEffect(() => {
    fetchMyProjects().then(() => setProjectsReady(true));
  }, [fetchMyProjects]);

  const eligibleProjects = useMemo(
    () => projects.filter(p => MEETING_ELIGIBLE_PROJECT_STATES.includes(p.state)),
    [projects],
  );
  const schedulableMilestones = useMemo(() => {
    const scheduledMilestoneIds = new Set(
      meetings
        // เฉพาะนัดที่ยังเปิดอยู่เท่านั้นที่กันการสร้างนัดใหม่
        .filter(meeting => meeting.status === 'open')
        .map(meeting => meeting.milestone_id),
    );
    return milestones.filter(milestone => !scheduledMilestoneIds.has(milestone.id));
  }, [meetings, milestones]);

  useEffect(() => {
    if (!projectsReady) return;
    fetchEligibleMilestones(eligibleProjects);
    fetchMyMeetings(eligibleProjects);
  }, [projectsReady, eligibleProjects, filter, fetchEligibleMilestones, fetchMyMeetings]);

  useEffect(() => {
    if (!projectsReady) return;
    const interval = window.setInterval(() => {
      fetchMyMeetings(eligibleProjects);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [projectsReady, eligibleProjects, fetchMyMeetings]);

  const handleCreated = () => {
    fetchMyMeetings(eligibleProjects);
  };

  const handleEdit = (m: Meeting) => {
    setEditingMeeting(m);
  };

  const handleCancel = async (m: Meeting) => {
    const result = await Swal.fire({
      title: 'ยกเลิกนัดหมาย?',
      html: `คุณต้องการยกเลิกนัดหมายนี้ใช่หรือไม่?<br/><span style="font-size:13px;color:#6b7280">การยกเลิกจะไม่สามารถกู้คืนได้</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'ยกเลิกนัดหมาย',
      cancelButtonText: 'ปิด',
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      const ok = await cancelMeeting(m.id);
      if (ok) {
        fetchMyMeetings(eligibleProjects);
      }
    }
  };

  return (
    <div className="flex flex-col gap-[24px]">
      <div>
        <h1 className="text-2xl font-bold text-foreground">นัดหมายประชุม</h1>
        <p className="text-sm text-muted-foreground mt-1">นัดประชุมกับ Booster เพื่อรายงานความคืบหน้าก่อนลงทุนต่อ</p>
      </div>

      <CreateMeetingForm
        milestones={schedulableMilestones}
        milestonesLoading={milestonesLoading}
        onCreated={handleCreated}
      />

      <MeetingList
        meetings={meetings}
        loading={meetingsLoading}
        filter={filter}
        onFilterChange={setFilter}
        milestones={milestones}
        onEdit={handleEdit}
        onCancel={handleCancel}
      />

      {editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          milestones={milestones}
          milestonesLoading={milestonesLoading}
          onClose={() => setEditingMeeting(null)}
          onSaved={() => {
            setEditingMeeting(null);
            fetchMyMeetings(eligibleProjects);
          }}
        />
      )}
    </div>
  );
};

export default PioneerMeetings;
