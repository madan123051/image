import type {
  AppData,
  CalendarDefinition,
  CalendarEvent,
  PlannerTask,
  Reminder,
  Routine,
  NotificationItem,
  User,
  UserPreferences,
} from '../types/domain';
import { assertOwnedBy } from './authService';

export interface LifePlannerRepository {
  initializeWorkspace(user: User, seedData: AppData): Promise<AppData>;
  subscribe(
    userId: string,
    onSnapshot: (snapshot: RepositorySnapshot) => void,
    onError: (error: Error) => void,
  ): () => void;
  getCalendars(userId: string): Promise<CalendarDefinition[]>;
  getEvents(userId: string): Promise<CalendarEvent[]>;
  saveEvent(userId: string, event: CalendarEvent): Promise<CalendarEvent>;
  deleteEvent(userId: string, eventId: string): Promise<void>;
  getTasks(userId: string): Promise<PlannerTask[]>;
  saveTask(userId: string, task: PlannerTask): Promise<PlannerTask>;
  deleteTask(userId: string, taskId: string): Promise<void>;
  getReminders(userId: string): Promise<Reminder[]>;
  saveReminder(userId: string, reminder: Reminder): Promise<Reminder>;
  deleteReminder(userId: string, reminderId: string): Promise<void>;
  getRoutines(userId: string): Promise<Routine[]>;
  saveRoutine(userId: string, routine: Routine): Promise<Routine>;
  deleteRoutine(userId: string, routineId: string): Promise<void>;
  getNotifications(userId: string): Promise<NotificationItem[]>;
  saveNotification(userId: string, notification: NotificationItem): Promise<NotificationItem>;
  deleteNotification(userId: string, notificationId: string): Promise<void>;
  getPreferences(userId: string): Promise<UserPreferences>;
  savePreferences(userId: string, preferences: UserPreferences): Promise<UserPreferences>;
}

export interface RepositorySnapshot {
  data: AppData;
  hasPendingWrites: boolean;
  fromCache: boolean;
}

export class InMemoryLifePlannerRepository implements LifePlannerRepository {
  constructor(private readonly data: AppData) {}

  async initializeWorkspace(): Promise<AppData> {
    return this.data;
  }

  subscribe(
    _userId: string,
    onSnapshot: (snapshot: RepositorySnapshot) => void,
  ): () => void {
    onSnapshot({ data: this.data, hasPendingWrites: false, fromCache: false });
    return () => undefined;
  }

  async getCalendars(userId: string): Promise<CalendarDefinition[]> {
    return this.data.calendars.filter((calendar) => calendar.userId === userId);
  }

  async getEvents(userId: string): Promise<CalendarEvent[]> {
    return this.data.events.filter((event) => event.userId === userId);
  }

  async saveEvent(userId: string, event: CalendarEvent): Promise<CalendarEvent> {
    assertOwnedBy(userId, event.userId);
    const existing = this.data.events.findIndex((item) => item.id === event.id);
    if (existing >= 0) this.data.events[existing] = event;
    else this.data.events.push(event);
    return event;
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const event = this.data.events.find((item) => item.id === eventId);
    if (!event) return;
    assertOwnedBy(userId, event.userId);
    this.data.events = this.data.events.filter((item) => item.id !== eventId);
  }

  async getTasks(userId: string): Promise<PlannerTask[]> {
    return this.data.tasks.filter((task) => task.userId === userId);
  }

  async saveTask(userId: string, task: PlannerTask): Promise<PlannerTask> {
    assertOwnedBy(userId, task.userId);
    const existing = this.data.tasks.findIndex((item) => item.id === task.id);
    if (existing >= 0) this.data.tasks[existing] = task;
    else this.data.tasks.push(task);
    return task;
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    const task = this.data.tasks.find((item) => item.id === taskId);
    if (!task) return;
    assertOwnedBy(userId, task.userId);
    this.data.tasks = this.data.tasks.filter((item) => item.id !== taskId);
  }

  async getReminders(userId: string): Promise<Reminder[]> {
    return this.data.reminders.filter((reminder) => reminder.userId === userId);
  }

  async saveReminder(userId: string, reminder: Reminder): Promise<Reminder> {
    assertOwnedBy(userId, reminder.userId);
    const existing = this.data.reminders.findIndex((item) => item.id === reminder.id);
    if (existing >= 0) this.data.reminders[existing] = reminder;
    else this.data.reminders.push(reminder);
    return reminder;
  }

  async deleteReminder(userId: string, reminderId: string): Promise<void> {
    const reminder = this.data.reminders.find((item) => item.id === reminderId);
    if (!reminder) return;
    assertOwnedBy(userId, reminder.userId);
    this.data.reminders = this.data.reminders.filter((item) => item.id !== reminderId);
  }

  async getRoutines(userId: string): Promise<Routine[]> {
    return this.data.routines.filter((routine) => routine.userId === userId);
  }

  async saveRoutine(userId: string, routine: Routine): Promise<Routine> {
    assertOwnedBy(userId, routine.userId);
    const existing = this.data.routines.findIndex((item) => item.id === routine.id);
    if (existing >= 0) this.data.routines[existing] = routine;
    else this.data.routines.push(routine);
    return routine;
  }

  async deleteRoutine(userId: string, routineId: string): Promise<void> {
    const routine = this.data.routines.find((item) => item.id === routineId);
    if (!routine) return;
    assertOwnedBy(userId, routine.userId);
    this.data.routines = this.data.routines.filter((item) => item.id !== routineId);
  }

  async getNotifications(userId: string): Promise<NotificationItem[]> {
    return this.data.notifications.filter((notification) => notification.userId === userId);
  }

  async saveNotification(userId: string, notification: NotificationItem): Promise<NotificationItem> {
    assertOwnedBy(userId, notification.userId);
    const existing = this.data.notifications.findIndex((item) => item.id === notification.id);
    if (existing >= 0) this.data.notifications[existing] = notification;
    else this.data.notifications.push(notification);
    return notification;
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = this.data.notifications.find((item) => item.id === notificationId);
    if (!notification) return;
    assertOwnedBy(userId, notification.userId);
    this.data.notifications = this.data.notifications.filter((item) => item.id !== notificationId);
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const preferences = this.data.preferences.find((item) => item.userId === userId);
    if (!preferences) throw new Error('User preferences were not found.');
    return preferences;
  }

  async savePreferences(userId: string, preferences: UserPreferences): Promise<UserPreferences> {
    assertOwnedBy(userId, preferences.userId);
    const existing = this.data.preferences.findIndex((item) => item.userId === userId);
    if (existing >= 0) this.data.preferences[existing] = preferences;
    else this.data.preferences.push(preferences);
    return preferences;
  }
}
