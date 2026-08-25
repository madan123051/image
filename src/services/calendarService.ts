import type {
  CalendarEvent,
  FreeSlot,
  PlannerTask,
  Routine,
  UserPreferences,
} from '../types/domain';
import { eventConflicts } from '../utils/date';

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'any';

interface BusyInterval {
  start: Date;
  end: Date;
}

export interface FreeTimeSearchOptions {
  /** Scheduled tasks are treated as busy. The task being scheduled can be omitted by the caller. */
  tasks?: PlannerTask[];
  /** Only fixed routines are treated as busy. */
  routines?: Routine[];
  /** Injectable clock for deterministic scheduling and tests. */
  now?: Date;
  /** Exact lower bound of the search window. Defaults to `now`. */
  rangeStart?: Date;
  /** Exact upper bound of the search window. Defaults to seven days after `now`. */
  rangeEnd?: Date;
  limit?: number;
}

export interface CalendarProviderEvent {
  externalId: string;
  title: string;
  startDateTime: string;
  endDateTime: string;
  etag?: string;
}

export interface CalendarProvider {
  readonly id: 'google' | 'outlook' | 'apple-ics' | string;
  connect(userId: string): Promise<void>;
  importEvents(userId: string, cursor?: string): Promise<CalendarProviderEvent[]>;
  exportEvent(userId: string, event: CalendarEvent): Promise<string>;
  resolveConflict(local: CalendarEvent, remote: CalendarProviderEvent): Promise<'local' | 'remote' | 'duplicate'>;
}

export function findConflicts(candidate: CalendarEvent, events: CalendarEvent[]): CalendarEvent[] {
  return eventConflicts(candidate, events, candidate.id);
}

function assertValidDate(value: Date, name: string): Date {
  if (Number.isNaN(value.getTime())) throw new RangeError(`${name} must be a valid date`);
  return value;
}

function datePartsInTimeZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const { year, month, day } = datePartsInTimeZone(date, timeZone);
  return `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;
}

function addDateKeyDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${result.getUTCFullYear()}-${`${result.getUTCMonth() + 1}`.padStart(2, '0')}-${`${result.getUTCDate()}`.padStart(2, '0')}`;
}

function weekdayForDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function zonedPartsAsUtc(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
}

function timeZoneOffset(date: Date, timeZone: string): number {
  const wholeSecondTimestamp = Math.floor(date.getTime() / 1_000) * 1_000;
  return zonedPartsAsUtc(date, timeZone) - wholeSecondTimestamp;
}

/** Converts a wall-clock date and time in an IANA timezone to an instant. */
export function zonedDateTime(dateKey: string, time: string, timeZone: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!dateMatch || !timeMatch) throw new RangeError(`Invalid local date/time: ${dateKey} ${time}`);

  const desired = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
  const firstGuess = new Date(desired);
  const firstOffset = timeZoneOffset(firstGuess, timeZone);
  let result = new Date(desired - firstOffset);
  const adjustedOffset = timeZoneOffset(result, timeZone);
  if (adjustedOffset !== firstOffset) result = new Date(desired - adjustedOffset);
  return result;
}

function validInterval(startValue: string, endValue: string): BusyInterval | null {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return { start, end };
}

function mergeBusyIntervals(intervals: BusyInterval[]): BusyInterval[] {
  const sorted = [...intervals].sort((left, right) => left.start.getTime() - right.start.getTime());
  const merged: BusyInterval[] = [];

  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.start > previous.end) {
      merged.push({ start: new Date(interval.start), end: new Date(interval.end) });
    } else if (interval.end > previous.end) {
      previous.end = new Date(interval.end);
    }
  }
  return merged;
}

function routineIntervals(
  routines: Routine[],
  rangeStart: Date,
  rangeEnd: Date,
  timeZone: string,
): BusyInterval[] {
  const intervals: BusyInterval[] = [];
  let dateKey = addDateKeyDays(dateKeyInTimeZone(rangeStart, timeZone), -1);
  const lastDateKey = dateKeyInTimeZone(rangeEnd, timeZone);

  while (dateKey <= lastDateKey) {
    const weekday = weekdayForDateKey(dateKey);
    for (const routine of routines) {
      if (
        routine.active === false ||
        routine.flexibility !== 'fixed' ||
        !routine.days.includes(weekday) ||
        routine.durationMinutes <= 0
      ) continue;
      const start = zonedDateTime(dateKey, routine.startTime, timeZone);
      const end = new Date(start.getTime() + routine.durationMinutes * MINUTE_MS);
      if (end > rangeStart && start < rangeEnd) intervals.push({ start, end });
    }
    dateKey = addDateKeyDays(dateKey, 1);
  }

  return intervals;
}

function preferredBounds(preferred: PreferredTime): [string, string] | null {
  if (preferred === 'morning') return ['08:00', '12:00'];
  if (preferred === 'afternoon') return ['12:00', '17:00'];
  if (preferred === 'evening') return ['17:00', '21:00'];
  return null;
}

function availabilityWindow(
  dateKey: string,
  preferences: UserPreferences,
  preferred: PreferredTime,
): BusyInterval | null {
  const nextDateKey = addDateKeyDays(dateKey, 1);
  const workStart = zonedDateTime(dateKey, preferences.workDayStart, preferences.timezone);
  let workEnd = zonedDateTime(dateKey, preferences.workDayEnd, preferences.timezone);
  if (workEnd <= workStart) workEnd = zonedDateTime(nextDateKey, preferences.workDayEnd, preferences.timezone);

  const bounds = preferredBounds(preferred);
  if (!bounds) return { start: workStart, end: workEnd };

  const preferenceStart = zonedDateTime(dateKey, bounds[0], preferences.timezone);
  const preferenceEnd = zonedDateTime(dateKey, bounds[1], preferences.timezone);
  const start = new Date(Math.max(workStart.getTime(), preferenceStart.getTime()));
  const end = new Date(Math.min(workEnd.getTime(), preferenceEnd.getTime()));
  return end > start ? { start, end } : null;
}

function ceilToMinute(date: Date): Date {
  return new Date(Math.ceil(date.getTime() / MINUTE_MS) * MINUTE_MS);
}

function busyIntervals(
  events: CalendarEvent[],
  tasks: PlannerTask[],
  routines: Routine[],
  rangeStart: Date,
  rangeEnd: Date,
  timeZone: string,
): BusyInterval[] {
  const eventIntervals = events.flatMap((event) => {
    if (event.allDay || event.status === 'cancelled') return [];
    const interval = validInterval(event.startDateTime, event.endDateTime);
    return interval ? [interval] : [];
  });
  const taskIntervals = tasks.flatMap((task) => {
    if (task.status === 'completed' || !task.scheduledStart || !task.scheduledEnd) return [];
    const interval = validInterval(task.scheduledStart, task.scheduledEnd);
    return interval ? [interval] : [];
  });
  return mergeBusyIntervals([
    ...eventIntervals,
    ...taskIntervals,
    ...routineIntervals(routines, rangeStart, rangeEnd, timeZone),
  ]);
}

/**
 * Finds the earliest usable gaps while respecting the user's timezone and schedule.
 * Existing four-argument calls remain valid; Phase 2 data is supplied in `options`.
 */
export function suggestFreeTime(
  events: CalendarEvent[],
  durationMinutes: number,
  preferences: UserPreferences,
  preferred: PreferredTime = 'any',
  options: FreeTimeSearchOptions = {},
): FreeSlot[] {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return [];

  const now = assertValidDate(new Date(options.now ?? new Date()), 'now');
  const requestedStart = assertValidDate(new Date(options.rangeStart ?? now), 'rangeStart');
  const rangeEnd = assertValidDate(
    new Date(options.rangeEnd ?? new Date(now.getTime() + 7 * DAY_MS)),
    'rangeEnd',
  );
  const rangeStart = ceilToMinute(new Date(Math.max(now.getTime(), requestedStart.getTime())));
  const limit = Math.max(0, Math.floor(options.limit ?? 3));
  if (!limit || rangeEnd <= rangeStart) return [];

  const busy = busyIntervals(
    events,
    options.tasks ?? [],
    options.routines ?? [],
    rangeStart,
    rangeEnd,
    preferences.timezone,
  );
  const slots: FreeSlot[] = [];
  // Start one calendar day earlier so a shift such as 22:00-04:00 remains
  // available when the search begins after midnight on its second date.
  let dateKey = addDateKeyDays(dateKeyInTimeZone(rangeStart, preferences.timezone), -1);
  const lastDateKey = dateKeyInTimeZone(rangeEnd, preferences.timezone);

  while (dateKey <= lastDateKey && slots.length < limit) {
    if (preferences.workingDays.includes(weekdayForDateKey(dateKey))) {
      const availability = availabilityWindow(dateKey, preferences, preferred);
      if (availability) {
        const windowStart = new Date(Math.max(availability.start.getTime(), rangeStart.getTime()));
        const windowEnd = new Date(Math.min(availability.end.getTime(), rangeEnd.getTime()));
        let cursor = windowStart;

        for (const interval of busy) {
          if (interval.end <= cursor) continue;
          if (interval.start >= windowEnd) break;

          const gapEnd = new Date(Math.min(interval.start.getTime(), windowEnd.getTime()));
          if (gapEnd.getTime() - cursor.getTime() >= durationMinutes * MINUTE_MS) {
            slots.push({
              startDateTime: cursor.toISOString(),
              endDateTime: new Date(cursor.getTime() + durationMinutes * MINUTE_MS).toISOString(),
            });
            if (slots.length >= limit) return slots;
          }
          if (interval.end > cursor) cursor = new Date(Math.min(interval.end.getTime(), windowEnd.getTime()));
        }

        if (
          slots.length < limit &&
          windowEnd.getTime() - cursor.getTime() >= durationMinutes * MINUTE_MS
        ) {
          slots.push({
            startDateTime: cursor.toISOString(),
            endDateTime: new Date(cursor.getTime() + durationMinutes * MINUTE_MS).toISOString(),
          });
        }
      }
    }
    dateKey = addDateKeyDays(dateKey, 1);
  }

  return slots;
}
