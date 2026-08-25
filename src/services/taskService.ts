import type { CalendarEvent, FreeSlot, PlannerTask, UserPreferences } from '../types/domain';
import { suggestFreeTime } from './calendarService';

export function getTaskScheduleSuggestions(
  task: PlannerTask,
  events: CalendarEvent[],
  preferences: UserPreferences,
): FreeSlot[] {
  return suggestFreeTime(events, task.estimatedMinutes, preferences, 'any');
}

export function isMissedTask(task: PlannerTask, now = new Date()): boolean {
  return Boolean(
    task.status !== 'completed' &&
      task.scheduledEnd &&
      new Date(task.scheduledEnd).getTime() < now.getTime(),
  );
}
