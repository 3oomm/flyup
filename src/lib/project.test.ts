import { describe, expect, it } from 'vitest';
import { getDaysLeft } from './project';

describe('getDaysLeft', () => {
  const now = Date.parse('2026-10-02T00:00:00Z');

  it.each([null, undefined, '', '0001-01-01T00:00:00Z', 'invalid'])
    ('uses campaign duration when the deadline is unset: %s', end_date => {
      expect(getDaysLeft({ end_date, duration_days: 30 }, now)).toBe(30);
    });

  it('counts remaining days from a real deadline', () => {
    expect(getDaysLeft({ end_date: '2026-10-03T12:00:00Z', duration_days: 30 }, now)).toBe(2);
  });

  it('keeps an expired campaign at zero instead of using its duration', () => {
    expect(getDaysLeft({ end_date: '2026-10-01T00:00:00Z', duration_days: 30 }, now)).toBe(0);
  });
});
