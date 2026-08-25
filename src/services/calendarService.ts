import type { CalendarEvent, FreeSlot, UserPreferences } from '../types/domain';
import { addDays, eventConflicts, findFreeSlots } from '../utils/date';

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

export function suggestFreeTime(
  events: CalendarEvent[],
  durationMinutes: number,
  preferences: UserPreferences,
  preferred: 'morning' | 'afternoon' | 'evening' | 'any' = 'any',
): FreeSlot[] {
  const start = new Date();
  return findFreeSlots(events, durationMinutes, start, addDays(start, 7), preferences, preferred, 3);
}
