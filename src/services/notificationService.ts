import type { AppData, CalendarEvent, NotificationItem, PlannerTask, Reminder, Routine } from '../types/domain';
import { addMinutes } from '../utils/date';
import { zonedDateTime } from './calendarService';
import { calendarDateKey } from './countdownService';

function addDateKeyDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function weekdayForDateKey(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

export interface NotificationTransport {
  readonly channel: 'in-app' | 'push' | 'email';
  send(notification: NotificationItem): Promise<void>;
}

export class NotificationService {
  constructor(private readonly transports: NotificationTransport[] = []) {}

  fromEvent(event: CalendarEvent): NotificationItem[] {
    const createdAt = new Date().toISOString();
    return event.reminders.map((reminder) => ({
      id: `notification_event_${event.id}_${reminder.id}`,
      userId: event.userId,
      sourceId: event.id,
      type: event.countdown ? 'countdown' : 'event',
      title: event.title,
      message: `Event starts in ${reminder.minutesBefore} minutes.`,
      scheduledAt: new Date(new Date(event.startDateTime).getTime() - reminder.minutesBefore * 60_000).toISOString(),
      channels: reminder.channels,
      read: false,
      readAt: null,
      deliveredAt: null,
      createdAt,
    }));
  }

  fromTask(task: PlannerTask, timeZone: string): NotificationItem[] {
    if (!task.dueDate || task.reminderMinutes === null) return [];
    const due = zonedDateTime(task.dueDate, task.dueTime ?? '23:59', timeZone);
    const createdAt = new Date().toISOString();
    return [
      {
        id: `notification_task_${task.id}`,
        userId: task.userId,
        sourceId: task.id,
        type: 'task',
        title: task.title,
        message: 'Task deadline is approaching.',
        scheduledAt: new Date(due.getTime() - task.reminderMinutes * 60_000).toISOString(),
        channels: ['in-app'],
        read: false,
        readAt: null,
        deliveredAt: null,
        createdAt,
      },
    ];
  }

  fromReminder(reminder: Reminder): NotificationItem {
    return {
      id: `notification_reminder_${reminder.id}`,
      userId: reminder.userId,
      sourceId: reminder.id,
      type: reminder.kind === 'bill' ? 'bill' : reminder.kind === 'birthday' ? 'birthday' : 'event',
      title: reminder.title,
      message: 'Reminder due now.',
      scheduledAt: reminder.snoozedUntil ?? reminder.remindAt,
      channels: reminder.channels,
      read: false,
      readAt: null,
      deliveredAt: null,
      createdAt: reminder.createdAt,
    };
  }

  fromRoutine(routine: Routine, now = new Date(), timeZone = 'UTC'): NotificationItem | null {
    if (!routine.active) return null;
    const todayKey = calendarDateKey(now, timeZone);
    for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
      const occurrenceKey = addDateKeyDays(todayKey, dayOffset);
      if (!routine.days.includes(weekdayForDateKey(occurrenceKey))) continue;
      const occurrence = zonedDateTime(occurrenceKey, routine.startTime, timeZone);
      const scheduled = addMinutes(occurrence, -routine.reminderMinutes);
      if (scheduled < now) continue;
      return {
        id: `notification_routine_${routine.id}_${occurrenceKey}`,
        userId: routine.userId,
        sourceId: routine.id,
        type: 'event',
        title: routine.title,
        message: `Routine starts in ${routine.reminderMinutes} minutes.`,
        scheduledAt: scheduled.toISOString(),
        channels: ['in-app'],
        read: false,
        readAt: null,
        deliveredAt: null,
        createdAt: now.toISOString(),
      };
    }
    return null;
  }

  async dispatch(notification: NotificationItem): Promise<void> {
    await Promise.all(
      this.transports
        .filter((transport) => notification.channels.includes(transport.channel))
        .map((transport) => transport.send(notification)),
    );
  }
}

export function buildNotificationOutbox(data: AppData, now = new Date()): NotificationItem[] {
  const service = new NotificationService();
  const fallbackTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const timeZoneFor = (userId: string) => data.preferences.find((item) => item.userId === userId)?.timezone
    ?? fallbackTimeZone;
  const generated = [
    ...data.events
      .filter((event) => event.status !== 'cancelled' && new Date(event.endDateTime) >= now)
      .flatMap((event) => service.fromEvent(event)),
    ...data.tasks
      .filter((task) => task.status !== 'completed')
      .flatMap((task) => service.fromTask(task, timeZoneFor(task.userId))),
    ...data.reminders
      .filter((reminder) => !reminder.completed)
      .map((reminder) => service.fromReminder(reminder)),
    ...data.routines
      .map((routine) => service.fromRoutine(routine, now, timeZoneFor(routine.userId)))
      .filter((notification): notification is NotificationItem => Boolean(notification)),
  ];
  const existing = new Map(data.notifications.map((notification) => [notification.id, notification]));
  return generated.map((notification) => {
    const saved = existing.get(notification.id);
    return saved
      ? {
          ...notification,
          read: saved.read,
          readAt: saved.readAt,
          deliveredAt: saved.deliveredAt,
          createdAt: saved.createdAt,
        }
      : notification;
  });
}
