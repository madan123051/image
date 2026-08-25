import { createSeedData } from '../data/seed';
import { buildNotificationOutbox, NotificationService } from './notificationService';

describe('NotificationService', () => {
  it('schedules task deadlines in the configured planner timezone', () => {
    const task = {
      ...createSeedData().tasks[0],
      dueDate: '2026-08-26',
      dueTime: '09:00',
      reminderMinutes: 60,
    };

    const [notification] = new NotificationService().fromTask(task, 'Asia/Kathmandu');

    expect(notification.scheduledAt).toBe('2026-08-26T02:15:00.000Z');
  });

  it('finds the next routine occurrence using timezone calendar days', () => {
    const routine = {
      ...createSeedData().routines[0],
      days: [3],
      startTime: '10:00',
      reminderMinutes: 10,
    };

    const notification = new NotificationService().fromRoutine(
      routine,
      new Date('2026-08-25T23:30:00.000Z'),
      'Asia/Tokyo',
    );

    expect(notification?.id).toBe(`notification_routine_${routine.id}_2026-08-26`);
    expect(notification?.scheduledAt).toBe('2026-08-26T00:50:00.000Z');
  });

  it('preserves durable read state while excluding completed and inactive sources', () => {
    const data = createSeedData();
    data.tasks = data.tasks.map((task) => ({ ...task, status: 'completed' }));
    data.routines = data.routines.map((routine) => ({ ...routine, active: false }));
    const reminder = data.reminders[0];
    data.notifications = [{
      ...new NotificationService().fromReminder(reminder),
      read: true,
      readAt: '2026-08-25T00:00:00.000Z',
      deliveredAt: '2026-08-25T00:01:00.000Z',
    }];

    const notifications = buildNotificationOutbox(data, new Date('2026-08-25T00:00:00.000Z'));
    const savedReminder = notifications.find((item) => item.sourceId === reminder.id);

    expect(notifications.some((item) => item.type === 'task')).toBe(false);
    expect(notifications.some((item) => item.id.startsWith('notification_routine_'))).toBe(false);
    expect(savedReminder).toMatchObject({
      read: true,
      readAt: '2026-08-25T00:00:00.000Z',
      deliveredAt: '2026-08-25T00:01:00.000Z',
    });
  });
});
