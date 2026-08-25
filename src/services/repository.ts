import type {
  AppData,
  CalendarDefinition,
  CalendarEvent,
  PlannerTask,
  Reminder,
  Routine,
  UserPreferences,
} from '../types/domain';
import { assertOwnedBy } from './authService';

export interface LifePlannerRepository {
  getCalendars(userId: string): Promise<CalendarDefinition[]>;
  getEvents(userId: string): Promise<CalendarEvent[]>;
  saveEvent(userId: string, event: CalendarEvent): Promise<CalendarEvent>;
  deleteEvent(userId: string, eventId: string): Promise<void>;
  getTasks(userId: string): Promise<PlannerTask[]>;
  saveTask(userId: string, task: PlannerTask): Promise<PlannerTask>;
  getReminders(userId: string): Promise<Reminder[]>;
  getRoutines(userId: string): Promise<Routine[]>;
  getPreferences(userId: string): Promise<UserPreferences>;
}

export class InMemoryLifePlannerRepository implements LifePlannerRepository {
  constructor(private readonly data: AppData) {}

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

  async getReminders(userId: string): Promise<Reminder[]> {
    return this.data.reminders.filter((reminder) => reminder.userId === userId);
  }

  async getRoutines(userId: string): Promise<Routine[]> {
    return this.data.routines.filter((routine) => routine.userId === userId);
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const preferences = this.data.preferences.find((item) => item.userId === userId);
    if (!preferences) throw new Error('User preferences were not found.');
    return preferences;
  }
}
