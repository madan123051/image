import type { AppData } from '../types/domain';
import { getFirebaseServices } from '../config/firebase';
import {
  assistantResponseSchema,
  type AssistantContext,
  type AssistantResponse,
} from './assistantSchema';

export function buildAssistantContext(data: AppData, userId: string, now = new Date()): AssistantContext {
  const preferences = data.preferences.find((item) => item.userId === userId);
  if (!preferences) throw new Error('Planner preferences are unavailable.');

  return {
    now: now.toISOString(),
    language: preferences.language,
    timezone: preferences.timezone,
    calendars: data.calendars
      .filter((item) => item.userId === userId)
      .slice(0, 20)
      .map(({ id, name, color }) => ({ id, name, color })),
    events: data.events
      .filter((item) => item.userId === userId)
      .sort((left, right) => left.startDateTime.localeCompare(right.startDateTime))
      .slice(-100)
      .map(({ id, calendarId, title, startDateTime, endDateTime, timezone, allDay, location, status, isImportant, countdown }) => ({
        id, calendarId, title, startDateTime, endDateTime, timezone, allDay, location, status, isImportant, countdown,
      })),
    tasks: data.tasks
      .filter((item) => item.userId === userId)
      .slice(0, 100)
      .map(({ id, title, description, status, priority, dueDate, dueTime, scheduledStart, scheduledEnd, estimatedMinutes, category }) => ({
        id, title, description, status, priority, dueDate, dueTime, scheduledStart, scheduledEnd, estimatedMinutes, category,
      })),
    reminders: data.reminders
      .filter((item) => item.userId === userId)
      .slice(0, 60)
      .map(({ id, title, kind, remindAt, completed, important, recurrenceRule, snoozedUntil }) => ({
        id, title, kind, remindAt, completed, important, recurrenceRule, snoozedUntil,
      })),
    routines: data.routines
      .filter((item) => item.userId === userId)
      .slice(0, 40)
      .map(({ id, title, days, startTime, durationMinutes, reminderMinutes, flexibility, active }) => ({
        id, title, days, startTime, durationMinutes, reminderMinutes, flexibility, active,
      })),
    preferences: {
      workDayStart: preferences.workDayStart,
      workDayEnd: preferences.workDayEnd,
      workingDays: preferences.workingDays,
      defaultEventMinutes: preferences.defaultEventMinutes,
      defaultTaskMinutes: preferences.defaultTaskMinutes,
    },
  };
}

export async function requestAayojAssistant(
  prompt: string,
  data: AppData,
  userId: string,
): Promise<AssistantResponse> {
  const services = await getFirebaseServices();
  const firebaseUser = services?.auth.currentUser;
  if (!firebaseUser) throw new Error('Firebase is still connecting. Please try again in a moment.');
  const token = await firebaseUser.getIdToken();
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, context: buildAssistantContext(data, userId) }),
  });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Aayoj Assistant could not complete that request.');
  return assistantResponseSchema.parse(payload);
}
