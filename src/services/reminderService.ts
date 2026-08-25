import type { Reminder } from '../types/domain';
import { zonedDateTime } from './calendarService';

interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function wallClockParts(value: string, timeZone: string): WallClockParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const fields = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  return {
    year: fields.year,
    month: fields.month,
    day: fields.day,
    hour: fields.hour,
    minute: fields.minute,
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function increment(parts: WallClockParts, frequency: string): WallClockParts {
  if (frequency === 'DAILY' || frequency === 'WEEKLY') {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + (frequency === 'DAILY' ? 1 : 7)));
    return { ...parts, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  }
  if (frequency === 'MONTHLY') {
    const monthIndex = parts.month;
    const year = parts.year + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    return { ...parts, year, month, day: Math.min(parts.day, daysInMonth(year, month)) };
  }
  const year = parts.year + 1;
  return { ...parts, year, day: Math.min(parts.day, daysInMonth(year, parts.month)) };
}

function toInstant(parts: WallClockParts, timeZone: string): Date {
  const dateKey = `${parts.year}-${`${parts.month}`.padStart(2, '0')}-${`${parts.day}`.padStart(2, '0')}`;
  const time = `${`${parts.hour}`.padStart(2, '0')}:${`${parts.minute}`.padStart(2, '0')}`;
  return zonedDateTime(dateKey, time, timeZone);
}

export function getNextReminderOccurrence(
  reminder: Pick<Reminder, 'remindAt' | 'recurrenceRule'>,
  timeZone: string,
  now = new Date(),
): string | null {
  const frequency = reminder.recurrenceRule?.match(/(?:^|;)FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(?:;|$)/)?.[1];
  if (!frequency) return null;
  let parts = wallClockParts(reminder.remindAt, timeZone);
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    parts = increment(parts, frequency);
    const candidate = toInstant(parts, timeZone);
    if (candidate > now) return candidate.toISOString();
  }
  throw new RangeError('Unable to find the next reminder occurrence.');
}
