import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMeetingForm } from './useMeetingForm';

describe('meeting form date validation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 1, 10, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('marks a past meeting time and clears the error when the time changes', () => {
    const { result } = renderHook(() => useMeetingForm());
    act(() => {
      result.current.setField('milestoneId', '21');
      result.current.setField('date', '2026-10-01');
      result.current.setField('time', '09:59');
      result.current.setField('meetingType', 'online');
      result.current.setField('meetingUrl', 'https://meet.google.com/abc-defg-hij');
    });

    act(() => expect(result.current.buildPayload()).toBeNull());
    expect(result.current.errors.dateTime).toBe('เวลานี้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต');

    act(() => result.current.setField('time', '10:10'));
    expect(result.current.errors.dateTime).toBeUndefined();
    act(() => expect(result.current.buildPayload()?.milestone_id).toBe(21));
  });
});
