import type { CalendarEvent, FreeSlot, PlannerTask, Routine, UserPreferences } from '../types/domain';
import { suggestFreeTime, type FreeTimeSearchOptions } from './calendarService';

export interface TaskScheduleSuggestionOptions
  extends Omit<FreeTimeSearchOptions, 'tasks' | 'routines'> {
  /** All tasks in the planner; the task currently being scheduled is excluded automatically. */
  tasks?: PlannerTask[];
  routines?: Routine[];
}

export function getTaskScheduleSuggestions(
  task: PlannerTask,
  events: CalendarEvent[],
  preferences: UserPreferences,
  options: TaskScheduleSuggestionOptions = {},
): FreeSlot[] {
  return suggestFreeTime(events, task.estimatedMinutes, preferences, 'any', {
    ...options,
    tasks: (options.tasks ?? []).filter((candidate) => candidate.id !== task.id),
    routines: options.routines,
  });
}

export function isMissedTask(task: PlannerTask, now = new Date()): boolean {
  return Boolean(
    task.status !== 'completed' &&
      task.scheduledEnd &&
      new Date(task.scheduledEnd).getTime() < now.getTime(),
  );
}
