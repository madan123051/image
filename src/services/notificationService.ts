import type { CalendarEvent, NotificationItem, PlannerTask, Reminder } from '../types/domain';

export interface NotificationTransport {
  readonly channel: 'in-app' | 'push' | 'email';
  send(notification: NotificationItem): Promise<void>;
}

export class NotificationService {
  constructor(private readonly transports: NotificationTransport[] = []) {}

  fromEvent(event: CalendarEvent): NotificationItem[] {
    return event.reminders.map((reminder) => ({
      id: `notification_event_${event.id}_${reminder.id}`,
      userId: event.userId,
      type: 'event',
      title: event.title,
      message: `Event starts in ${reminder.minutesBefore} minutes.`,
      scheduledAt: new Date(new Date(event.startDateTime).getTime() - reminder.minutesBefore * 60_000).toISOString(),
      channels: reminder.channels,
      read: false,
    }));
  }

  fromTask(task: PlannerTask): NotificationItem[] {
    if (!task.dueDate || task.reminderMinutes === null) return [];
    const due = new Date(`${task.dueDate}T${task.dueTime ?? '23:59'}:00`);
    return [
      {
        id: `notification_task_${task.id}`,
        userId: task.userId,
        type: 'task',
        title: task.title,
        message: 'Task deadline is approaching.',
        scheduledAt: new Date(due.getTime() - task.reminderMinutes * 60_000).toISOString(),
        channels: ['in-app'],
        read: false,
      },
    ];
  }

  fromReminder(reminder: Reminder): NotificationItem {
    return {
      id: `notification_reminder_${reminder.id}`,
      userId: reminder.userId,
      type: reminder.kind === 'bill' ? 'bill' : reminder.kind === 'birthday' ? 'birthday' : 'event',
      title: reminder.title,
      message: 'Reminder due now.',
      scheduledAt: reminder.remindAt,
      channels: reminder.channels,
      read: false,
    };
  }

  async dispatch(notification: NotificationItem): Promise<void> {
    await Promise.all(
      this.transports
        .filter((transport) => notification.channels.includes(transport.channel))
        .map((transport) => transport.send(notification)),
    );
  }
}
