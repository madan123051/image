import type { CalendarEvent, FreeSlot, PlannerTask, UserPreferences } from '../types/domain';

export const DAY_MS = 86_400_000;

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function toDateKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localDateTime(dateKey: string, time: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

export function getMonthGrid(anchor: Date, firstDayOfWeek = 1): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = (first.getDay() - firstDayOfWeek + 7) % 7;
  const gridStart = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function getWeekDays(anchor: Date, firstDayOfWeek = 1): Date[] {
  const offset = (anchor.getDay() - firstDayOfWeek + 7) % 7;
  const start = addDays(startOfDay(anchor), -offset);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function isSameDay(left: Date | string, right: Date | string): boolean {
  return toDateKey(left) === toDateKey(right);
}

export function overlaps(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
): boolean {
  return new Date(leftStart) < new Date(rightEnd) && new Date(rightStart) < new Date(leftEnd);
}

export function eventConflicts(
  candidate: Pick<CalendarEvent, 'startDateTime' | 'endDateTime' | 'allDay'>,
  events: CalendarEvent[],
  excludeId?: string,
): CalendarEvent[] {
  if (candidate.allDay) return [];
  return events.filter(
    (event) =>
      event.id !== excludeId &&
      !event.allDay &&
      event.status !== 'cancelled' &&
      overlaps(candidate.startDateTime, candidate.endDateTime, event.startDateTime, event.endDateTime),
  );
}

export function minutesBetween(start: string | Date, end: string | Date): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function calculateFreeMinutes(
  date: Date,
  events: CalendarEvent[],
  preferences: UserPreferences,
): number {
  const key = toDateKey(date);
  const workStart = localDateTime(key, preferences.workDayStart);
  const workEnd = localDateTime(key, preferences.workDayEnd);
  const busy = events
    .filter((event) => !event.allDay && isSameDay(event.startDateTime, date))
    .reduce((sum, event) => sum + minutesBetween(event.startDateTime, event.endDateTime), 0);
  return Math.max(0, minutesBetween(workStart, workEnd) - busy);
}

export function findFreeSlots(
  events: CalendarEvent[],
  durationMinutes: number,
  rangeStart: Date,
  rangeEnd: Date,
  preferences: UserPreferences,
  preferred: 'morning' | 'afternoon' | 'evening' | 'any' = 'any',
  limit = 3,
): FreeSlot[] {
  const slots: FreeSlot[] = [];
  let cursor = startOfDay(rangeStart);

  while (cursor <= endOfDay(rangeEnd) && slots.length < limit) {
    if (preferences.workingDays.includes(cursor.getDay())) {
      const key = toDateKey(cursor);
      const bounds =
        preferred === 'morning'
          ? ['08:00', '12:00']
          : preferred === 'afternoon'
            ? ['12:00', '17:00']
            : preferred === 'evening'
              ? ['17:00', '21:00']
              : [preferences.workDayStart, preferences.workDayEnd];
      let slotStart = new Date(localDateTime(key, bounds[0]));
      const dayEnd = new Date(localDateTime(key, bounds[1]));
      const dayEvents = events
        .filter((event) => !event.allDay && event.status !== 'cancelled' && toDateKey(event.startDateTime) === key)
        .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));

      for (const event of dayEvents) {
        const eventStart = new Date(event.startDateTime);
        if (minutesBetween(slotStart, eventStart) >= durationMinutes) {
          slots.push({
            startDateTime: slotStart.toISOString(),
            endDateTime: addMinutes(slotStart, durationMinutes).toISOString(),
          });
          if (slots.length >= limit) return slots;
        }
        if (new Date(event.endDateTime) > slotStart) slotStart = new Date(event.endDateTime);
      }

      if (minutesBetween(slotStart, dayEnd) >= durationMinutes) {
        slots.push({
          startDateTime: slotStart.toISOString(),
          endDateTime: addMinutes(slotStart, durationMinutes).toISOString(),
        });
      }
    }
    cursor = addDays(cursor, 1);
  }
  return slots.slice(0, limit);
}

export function taskDueDate(task: PlannerTask): Date | null {
  if (!task.dueDate) return null;
  return new Date(`${task.dueDate}T${task.dueTime ?? '23:59'}:00`);
}

export function toDateInputValue(value: string): string {
  return toDateKey(value);
}

export function toTimeInputValue(value: string): string {
  const date = new Date(value);
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}
