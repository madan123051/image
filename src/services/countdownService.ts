import type { CalendarEvent } from '../types/domain';

const DAY_MS = 86_400_000;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CountdownStatus = 'future' | 'today' | 'past';

export interface CalendarDayCountdown {
  /** Positive for a future date, zero today, and negative for a past date. */
  daysRemaining: number;
  absoluteDays: number;
  status: CountdownStatus;
  todayDateKey: string;
  targetDateKey: string;
  timeZone: string;
}

function toValidDate(value: string | Date, name: string): Date {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError(`${name} must be a valid date`);
  return date;
}

/** Returns the YYYY-MM-DD calendar date visible in the requested IANA timezone. */
export function calendarDateKey(value: string | Date, timeZone: string): string {
  if (typeof value === 'string') {
    const dateOnly = DATE_KEY_PATTERN.exec(value);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]);
      const day = Number(dateOnly[3]);
      const validation = new Date(Date.UTC(year, month - 1, day));
      if (
        validation.getUTCFullYear() !== year ||
        validation.getUTCMonth() !== month - 1 ||
        validation.getUTCDate() !== day
      ) throw new RangeError('value must be a valid calendar date');
      // A date-only value already represents a calendar date, not a UTC instant.
      return value;
    }
  }
  const date = toValidDate(value, 'value');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKeyEpochDay(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

/**
 * Counts calendar boundaries rather than elapsed 24-hour periods, so the result
 * remains correct across DST changes and for users near the international date line.
 */
export function calendarDaysUntil(
  targetDateTime: string | Date,
  timeZone: string,
  now: Date = new Date(),
): number {
  const validNow = toValidDate(now, 'now');
  const todayKey = calendarDateKey(validNow, timeZone);
  const targetKey = calendarDateKey(targetDateTime, timeZone);
  return dateKeyEpochDay(targetKey) - dateKeyEpochDay(todayKey);
}

export function getCalendarDayCountdown(
  targetDateTime: string | Date,
  timeZone: string,
  now: Date = new Date(),
): CalendarDayCountdown {
  const validNow = toValidDate(now, 'now');
  const todayDateKey = calendarDateKey(validNow, timeZone);
  const targetDateKey = calendarDateKey(targetDateTime, timeZone);
  const daysRemaining = dateKeyEpochDay(targetDateKey) - dateKeyEpochDay(todayDateKey);
  return {
    daysRemaining,
    absoluteDays: Math.abs(daysRemaining),
    status: daysRemaining > 0 ? 'future' : daysRemaining < 0 ? 'past' : 'today',
    todayDateKey,
    targetDateKey,
    timeZone,
  };
}

/** Uses the event timezone, with an explicit fallback for imported legacy events. */
export function getEventCalendarDayCountdown(
  event: Pick<CalendarEvent, 'startDateTime' | 'timezone'>,
  now: Date = new Date(),
  fallbackTimeZone = 'UTC',
): CalendarDayCountdown {
  return getCalendarDayCountdown(event.startDateTime, event.timezone || fallbackTimeZone, now);
}
