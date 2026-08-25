import type { CalendarEvent } from '../types/domain';
import { eventConflicts } from '../utils/date';

export { suggestFreeTime, zonedDateTime } from './freeTimeEngine';
export type { FreeTimeSearchOptions } from './freeTimeEngine';

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
