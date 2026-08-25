import { getNextReminderOccurrence } from './reminderService';

describe('getNextReminderOccurrence', () => {
  it('keeps the reminder wall-clock time across daylight-saving changes', () => {
    expect(getNextReminderOccurrence(
      { remindAt: '2026-03-07T14:00:00.000Z', recurrenceRule: 'FREQ=DAILY' },
      'America/New_York',
      new Date('2026-03-07T15:00:00.000Z'),
    )).toBe('2026-03-08T13:00:00.000Z');
  });

  it('clamps a monthly occurrence to the last valid day', () => {
    expect(getNextReminderOccurrence(
      { remindAt: '2026-01-31T09:00:00.000Z', recurrenceRule: 'FREQ=MONTHLY' },
      'UTC',
      new Date('2026-01-31T10:00:00.000Z'),
    )).toBe('2026-02-28T09:00:00.000Z');
  });

  it('returns null for a one-time reminder', () => {
    expect(getNextReminderOccurrence(
      { remindAt: '2026-01-31T09:00:00.000Z', recurrenceRule: null },
      'UTC',
    )).toBeNull();
  });
});
