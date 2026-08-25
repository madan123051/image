import type { AppData, SearchResult } from '../types/domain';

export function searchAll(data: AppData, userId: string, query: string): SearchResult[] {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return [];
  const includes = (...values: string[]) => values.some((value) => value.toLocaleLowerCase().includes(term));

  return [
    ...data.events
      .filter((event) => event.userId === userId && includes(event.title, event.description, event.notes, event.location))
      .map((event) => ({
        id: event.id,
        type: 'event' as const,
        title: event.title,
        subtitle: new Date(event.startDateTime).toLocaleString(),
        section: 'calendar' as const,
      })),
    ...data.tasks
      .filter((task) => task.userId === userId && includes(task.title, task.description, task.category))
      .map((task) => ({
        id: task.id,
        type: 'task' as const,
        title: task.title,
        subtitle: `${task.priority} priority · ${task.status}`,
        section: 'tasks' as const,
      })),
    ...data.reminders
      .filter((reminder) => reminder.userId === userId && includes(reminder.title, reminder.kind))
      .map((reminder) => ({
        id: reminder.id,
        type: 'reminder' as const,
        title: reminder.title,
        subtitle: new Date(reminder.remindAt).toLocaleString(),
        section: 'reminders' as const,
      })),
    ...data.routines
      .filter((routine) => routine.userId === userId && includes(routine.title))
      .map((routine) => ({
        id: routine.id,
        type: 'routine' as const,
        title: routine.title,
        subtitle: `${routine.startTime} · ${routine.flexibility}`,
        section: 'planner' as const,
      })),
  ];
}
