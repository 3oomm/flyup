import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import CreateMeetingForm from './CreateMeetingForm';
import type { MilestoneOption } from './types';

const milestones: MilestoneOption[] = [
  { id: 21, phase_no: 2, title: 'สร้างตัวอย่างเกม', status: 'approved', project_id: 1, project_title: 'Siam Spirit' },
  { id: 22, phase_no: 3, title: 'ผลิตเนื้อหาหลัก', status: 'approved', project_id: 1, project_title: 'Siam Spirit' },
];

describe('meeting milestone default', () => {
  it('selects the requested eligible phase and allows a manual change', async () => {
    render(
      <MemoryRouter initialEntries={['/pioneer/dashboard/meetings?milestoneId=22']}>
        <CreateMeetingForm milestones={milestones} milestonesLoading={false} onCreated={() => {}} />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: /Milestone ที่เกี่ยวข้อง/ });
    await waitFor(() => expect(trigger).toHaveTextContent('Phase 3: ผลิตเนื้อหาหลัก'));

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /Phase 2: สร้างตัวอย่างเกม/ }));
    expect(trigger).toHaveTextContent('Phase 2: สร้างตัวอย่างเกม');
  });

  it('falls back to the first eligible phase when no phase was requested', async () => {
    render(
      <MemoryRouter>
        <CreateMeetingForm milestones={milestones} milestonesLoading={false} onCreated={() => {}} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: /Milestone ที่เกี่ยวข้อง/ }))
      .toHaveTextContent('Phase 2: สร้างตัวอย่างเกม'));
  });

  it('shows the validation error beside the date field', async () => {
    render(
      <MemoryRouter>
        <CreateMeetingForm milestones={milestones} milestonesLoading={false} onCreated={() => {}} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: /Milestone ที่เกี่ยวข้อง/ }))
      .toHaveTextContent('Phase 2: สร้างตัวอย่างเกม'));
    fireEvent.click(screen.getByRole('button', { name: 'ส่งนัดหมาย' }));

    expect(screen.getByText('กรุณาเลือกวันที่และเวลา')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick a date' })).toHaveAttribute('aria-invalid', 'true');
  });
});
