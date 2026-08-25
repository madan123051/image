import {
  calendarDateKey,
  calendarDaysUntil,
  getCalendarDayCountdown,
  getEventCalendarDayCountdown,
} from './countdownService';

describe('countdown service', () => {
  it('counts calendar days across a DST transition instead of rounding elapsed hours', () => {
    const now = new Date('2026-03-08T06:30:00.000Z'); // 01:30 on Mar 8 in New York
    const target = '2026-03-09T05:00:00.000Z'; // 01:00 on Mar 9 after the DST jump

    expect((new Date(target).getTime() - now.getTime()) / 3_600_000).toBeLessThan(24);
    expect(calendarDaysUntil(target, 'America/New_York', now)).toBe(1);
  });

  it('uses the requested timezone when an instant falls on different local dates', () => {
    const instant = '2026-08-24T23:30:00.000Z';
    expect(calendarDateKey(instant, 'America/Los_Angeles')).toBe('2026-08-24');
    expect(calendarDateKey(instant, 'Asia/Kathmandu')).toBe('2026-08-25');
  });

  it('keeps date-only targets as calendar dates rather than treating them as UTC instants', () => {
    const now = new Date('2026-08-24T12:00:00.000Z');
    expect(calendarDaysUntil('2026-08-25', 'America/Los_Angeles', now)).toBe(1);
    expect(() => calendarDateKey('2026-02-31', 'UTC')).toThrow(RangeError);
  });

  it('returns stable future, today and past metadata', () => {
    const now = new Date('2026-08-24T12:00:00.000Z');
    expect(getCalendarDayCountdown('2026-08-27T01:00:00.000Z', 'UTC', now)).toMatchObject({
      daysRemaining: 3,
      absoluteDays: 3,
      status: 'future',
      todayDateKey: '2026-08-24',
      targetDateKey: '2026-08-27',
    });
    expect(getCalendarDayCountdown('2026-08-24T23:59:00.000Z', 'UTC', now).status).toBe('today');
    expect(getCalendarDayCountdown('2026-08-22T23:59:00.000Z', 'UTC', now)).toMatchObject({
      daysRemaining: -2,
      absoluteDays: 2,
      status: 'past',
    });
  });

  it('uses an event timezone and supports legacy events with a missing timezone', () => {
    const now = new Date('2026-08-24T12:00:00.000Z');
    expect(
      getEventCalendarDayCountdown(
        { startDateTime: '2026-08-25T00:30:00.000Z', timezone: 'America/Los_Angeles' },
        now,
      ).status,
    ).toBe('today');
    expect(
      getEventCalendarDayCountdown(
        { startDateTime: '2026-08-25T00:30:00.000Z', timezone: '' },
        now,
        'UTC',
      ).daysRemaining,
    ).toBe(1);
  });

  it('rejects invalid dates and invalid IANA timezones', () => {
    expect(() => calendarDaysUntil('not-a-date', 'UTC')).toThrow(RangeError);
    expect(() => calendarDateKey(new Date(), 'Mars/Olympus_Mons')).toThrow(RangeError);
  });
});
