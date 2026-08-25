import type {
  AppData,
  CalendarEvent,
  PlannerTask,
  Reminder,
  Routine,
} from '../types/domain';
import type { AssistantAction } from './assistantSchema';
import { addMinutes } from '../utils/date';

export interface AssistantMutationPort {
  data: AppData;
  userId: string;
  saveEvent(event: CalendarEvent): void;
  deleteEvent(eventId: string): void;
  saveTask(task: PlannerTask): void;
  deleteTask(taskId: string): void;
  saveReminder(reminder: Reminder): void;
  deleteReminder(reminderId: string): void;
  saveRoutine(routine: Routine): void;
  deleteRoutine(routineId: string): void;
}

export interface AssistantApplyResult {
  applied: number;
  errors: string[];
}

function validDateTime(value: string | null): value is string {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

function generatedId(entity: AssistantAction['entity'], index: number): string {
  return `ai_${entity}_${Date.now()}_${index}`;
}

export function applyAssistantActions(
  actions: AssistantAction[],
  port: AssistantMutationPort,
): AssistantApplyResult {
  const preferences = port.data.preferences.find((item) => item.userId === port.userId);
  const calendars = port.data.calendars.filter((item) => item.userId === port.userId);
  const errors: string[] = [];
  let applied = 0;

  actions.forEach((action, index) => {
    try {
      const stamp = new Date().toISOString();
      if (action.entity === 'event') {
        if (action.operation === 'delete') {
          if (!action.targetId || !port.data.events.some((item) => item.id === action.targetId && item.userId === port.userId)) throw new Error('Event was not found.');
          port.deleteEvent(action.targetId);
        } else if (action.operation === 'update') {
          const current = port.data.events.find((item) => item.id === action.targetId && item.userId === port.userId);
          if (!current) throw new Error('Event was not found.');
          const next: CalendarEvent = {
            ...current,
            title: action.data.title ?? current.title,
            description: action.data.description ?? current.description,
            calendarId: action.data.calendarId && calendars.some((item) => item.id === action.data.calendarId) ? action.data.calendarId : current.calendarId,
            startDateTime: action.data.startDateTime ?? current.startDateTime,
            endDateTime: action.data.endDateTime ?? current.endDateTime,
            timezone: action.data.timezone ?? current.timezone,
            allDay: action.data.allDay ?? current.allDay,
            location: action.data.location ?? current.location,
            status: action.data.eventStatus ?? current.status,
            recurrenceRule: action.data.recurrenceRule ?? current.recurrenceRule,
            isImportant: action.data.isImportant ?? current.isImportant,
            countdown: action.data.countdown ?? current.countdown,
            color: action.data.color ?? current.color,
            updatedAt: stamp,
          };
          if (!validDateTime(next.startDateTime) || !validDateTime(next.endDateTime) || new Date(next.endDateTime) <= new Date(next.startDateTime)) throw new Error('Event time range is invalid.');
          port.saveEvent(next);
        } else {
          if (!action.data.title || !validDateTime(action.data.startDateTime) || !validDateTime(action.data.endDateTime)) throw new Error('New event needs a title, start, and end.');
          if (new Date(action.data.endDateTime) <= new Date(action.data.startDateTime)) throw new Error('Event must end after it starts.');
          const calendar = calendars.find((item) => item.id === action.data.calendarId) ?? calendars[0];
          if (!calendar || !preferences) throw new Error('A calendar and preferences are required.');
          const id = generatedId('event', index);
          port.saveEvent({
            id,
            userId: port.userId,
            calendarId: calendar.id,
            title: action.data.title,
            description: action.data.description ?? '',
            startDateTime: action.data.startDateTime,
            endDateTime: action.data.endDateTime,
            timezone: action.data.timezone ?? preferences.timezone,
            allDay: action.data.allDay ?? false,
            location: action.data.location ?? '',
            color: action.data.color ?? calendar.color,
            status: action.data.eventStatus ?? 'confirmed',
            recurrenceRule: action.data.recurrenceRule,
            reminders: action.data.reminderMinutes === null ? [] : [{ id: `${id}_reminder`, minutesBefore: action.data.reminderMinutes, channels: ['in-app'] }],
            participants: [],
            attachments: [],
            notes: action.data.notes ?? '',
            url: '',
            isImportant: action.data.isImportant ?? false,
            countdown: action.data.countdown ?? false,
            createdAt: stamp,
            updatedAt: stamp,
          });
        }
      } else if (action.entity === 'task') {
        if (action.operation === 'delete') {
          if (!action.targetId || !port.data.tasks.some((item) => item.id === action.targetId && item.userId === port.userId)) throw new Error('Task was not found.');
          port.deleteTask(action.targetId);
        } else if (action.operation === 'update') {
          const current = port.data.tasks.find((item) => item.id === action.targetId && item.userId === port.userId);
          if (!current) throw new Error('Task was not found.');
          const status = action.data.taskStatus ?? current.status;
          port.saveTask({
            ...current,
            title: action.data.title ?? current.title,
            description: action.data.description ?? current.description,
            status,
            priority: action.data.priority ?? current.priority,
            dueDate: action.data.dueDate ?? current.dueDate,
            dueTime: action.data.dueTime ?? current.dueTime,
            scheduledStart: action.data.scheduledStart ?? current.scheduledStart,
            scheduledEnd: action.data.scheduledEnd ?? current.scheduledEnd,
            estimatedMinutes: action.data.estimatedMinutes ?? current.estimatedMinutes,
            category: action.data.category ?? current.category,
            recurrenceRule: action.data.recurrenceRule ?? current.recurrenceRule,
            reminderMinutes: action.data.reminderMinutes ?? current.reminderMinutes,
            completedAt: status === 'completed' ? current.completedAt ?? stamp : null,
            updatedAt: stamp,
          });
        } else {
          if (!action.data.title) throw new Error('New task needs a title.');
          const estimatedMinutes = action.data.estimatedMinutes ?? preferences?.defaultTaskMinutes ?? 45;
          const scheduledStart = action.data.scheduledStart;
          const scheduledEnd = action.data.scheduledEnd
            ?? (validDateTime(scheduledStart) ? addMinutes(new Date(scheduledStart), estimatedMinutes).toISOString() : null);
          const status = action.data.taskStatus ?? (scheduledStart ? 'planned' : 'inbox');
          port.saveTask({
            id: generatedId('task', index),
            userId: port.userId,
            title: action.data.title,
            description: action.data.description ?? '',
            status,
            priority: action.data.priority ?? 'medium',
            dueDate: action.data.dueDate,
            dueTime: action.data.dueTime,
            scheduledStart,
            scheduledEnd,
            estimatedMinutes,
            category: action.data.category ?? 'Personal',
            subtasks: [],
            recurrenceRule: action.data.recurrenceRule,
            reminderMinutes: action.data.reminderMinutes,
            completedAt: status === 'completed' ? stamp : null,
            createdAt: stamp,
            updatedAt: stamp,
          });
        }
      } else if (action.entity === 'reminder') {
        if (action.operation === 'delete') {
          if (!action.targetId || !port.data.reminders.some((item) => item.id === action.targetId && item.userId === port.userId)) throw new Error('Reminder was not found.');
          port.deleteReminder(action.targetId);
        } else if (action.operation === 'update') {
          const current = port.data.reminders.find((item) => item.id === action.targetId && item.userId === port.userId);
          if (!current) throw new Error('Reminder was not found.');
          const remindAt = action.data.remindAt ?? current.remindAt;
          if (!validDateTime(remindAt)) throw new Error('Reminder time is invalid.');
          port.saveReminder({
            ...current,
            title: action.data.title ?? current.title,
            kind: action.data.reminderKind ?? current.kind,
            remindAt,
            important: action.data.important ?? current.important,
            channels: action.data.channels ?? current.channels,
            notes: action.data.notes ?? current.notes,
            recurrenceRule: action.data.recurrenceRule ?? current.recurrenceRule,
            completed: false,
            snoozedUntil: null,
            updatedAt: stamp,
          });
        } else {
          if (!action.data.title || !validDateTime(action.data.remindAt)) throw new Error('New reminder needs a title and valid time.');
          port.saveReminder({
            id: generatedId('reminder', index),
            userId: port.userId,
            title: action.data.title,
            kind: action.data.reminderKind ?? 'custom',
            remindAt: action.data.remindAt,
            important: action.data.important ?? false,
            completed: false,
            channels: action.data.channels ?? ['in-app'],
            notes: action.data.notes ?? '',
            recurrenceRule: action.data.recurrenceRule,
            snoozedUntil: null,
            createdAt: stamp,
            updatedAt: stamp,
          });
        }
      } else if (action.operation === 'delete') {
        if (!action.targetId || !port.data.routines.some((item) => item.id === action.targetId && item.userId === port.userId)) throw new Error('Routine was not found.');
        port.deleteRoutine(action.targetId);
      } else if (action.operation === 'update') {
        const current = port.data.routines.find((item) => item.id === action.targetId && item.userId === port.userId);
        if (!current) throw new Error('Routine was not found.');
        port.saveRoutine({
          ...current,
          title: action.data.title ?? current.title,
          days: action.data.days ?? current.days,
          startTime: action.data.startTime ?? current.startTime,
          durationMinutes: action.data.durationMinutes ?? current.durationMinutes,
          reminderMinutes: action.data.reminderMinutes ?? current.reminderMinutes,
          flexibility: action.data.flexibility ?? current.flexibility,
          color: action.data.color ?? current.color,
          active: action.data.active ?? current.active,
          updatedAt: stamp,
        });
      } else {
        if (!action.data.title || !action.data.days?.length || !action.data.startTime) throw new Error('New routine needs a title, days, and start time.');
        port.saveRoutine({
          id: generatedId('routine', index),
          userId: port.userId,
          title: action.data.title,
          days: [...new Set(action.data.days)].sort(),
          startTime: action.data.startTime,
          durationMinutes: action.data.durationMinutes ?? 30,
          reminderMinutes: action.data.reminderMinutes ?? 10,
          flexibility: action.data.flexibility ?? 'flexible',
          color: action.data.color ?? '#8c6ab1',
          active: action.data.active ?? true,
          createdAt: stamp,
          updatedAt: stamp,
        });
      }
      applied += 1;
    } catch (error) {
      errors.push(`${action.label}: ${error instanceof Error ? error.message : 'Could not apply action.'}`);
    }
  });

  return { applied, errors };
}
