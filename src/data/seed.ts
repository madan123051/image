import type { AppData, CalendarEvent, PlannerTask } from '../types/domain';
import { addDays, addMinutes, localDateTime, toDateKey } from '../utils/date';

export const DEMO_USER_ID = 'user_demo_madan';

function event(
  id: string,
  title: string,
  dayOffset: number,
  startTime: string,
  minutes: number,
  calendarId: string,
  color: string,
  options: Partial<CalendarEvent> = {},
): CalendarEvent {
  const now = new Date();
  const date = toDateKey(addDays(now, dayOffset));
  const start = localDateTime(date, startTime);
  const stamp = now.toISOString();
  return {
    id,
    userId: DEMO_USER_ID,
    calendarId,
    title,
    description: '',
    startDateTime: start,
    endDateTime: addMinutes(new Date(start), minutes).toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    allDay: false,
    location: '',
    color,
    status: 'confirmed',
    recurrenceRule: null,
    reminders: [{ id: `${id}_reminder`, minutesBefore: 15, channels: ['in-app'] }],
    participants: [],
    attachments: [],
    notes: '',
    url: '',
    isImportant: false,
    countdown: false,
    createdAt: stamp,
    updatedAt: stamp,
    ...options,
  };
}

function task(
  id: string,
  title: string,
  dueOffset: number,
  priority: PlannerTask['priority'],
  duration: number,
  options: Partial<PlannerTask> = {},
): PlannerTask {
  const now = new Date().toISOString();
  return {
    id,
    userId: DEMO_USER_ID,
    title,
    description: '',
    status: 'inbox',
    priority,
    dueDate: toDateKey(addDays(new Date(), dueOffset)),
    dueTime: '18:00',
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: duration,
    category: 'Personal',
    subtasks: [],
    recurrenceRule: null,
    reminderMinutes: 30,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...options,
  };
}

export function createSeedData(): AppData {
  const now = new Date();
  const today = toDateKey(now);
  const tomorrow = toDateKey(addDays(now, 1));
  const tripDate = addDays(now, 18);

  return {
    users: [
      {
        id: DEMO_USER_ID,
        email: 'demo@wildsaura.app',
        displayName: 'Madan',
        createdAt: now.toISOString(),
      },
    ],
    preferences: [
      {
        userId: DEMO_USER_ID,
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        firstDayOfWeek: 1,
        workDayStart: '08:00',
        workDayEnd: '20:00',
        workingDays: [1, 2, 3, 4, 5, 6, 0],
        sleepStart: '23:00',
        sleepEnd: '07:00',
        defaultEventMinutes: 60,
        defaultTaskMinutes: 45,
        theme: 'light',
      },
    ],
    calendars: [
      {
        id: 'cal_personal',
        userId: DEMO_USER_ID,
        name: 'Personal',
        color: '#e39a27',
        icon: '●',
        visible: true,
        isPrivate: true,
        role: 'owner',
      },
      {
        id: 'cal_work',
        userId: DEMO_USER_ID,
        name: 'Work',
        color: '#2d7c65',
        icon: '●',
        visible: true,
        isPrivate: true,
        role: 'owner',
      },
      {
        id: 'cal_family',
        userId: DEMO_USER_ID,
        name: 'Family',
        color: '#bd6a5c',
        icon: '●',
        visible: true,
        isPrivate: false,
        role: 'owner',
      },
    ],
    events: [
      event('evt_gym', 'Morning gym', 0, '08:00', 60, 'cal_personal', '#e39a27', {
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      }),
      event('evt_standup', 'Project stand-up', 0, '10:30', 45, 'cal_work', '#2d7c65', {
        location: 'Video call',
        participants: [
          { id: 'p1', name: 'Product team', email: 'team@example.com', response: 'accepted' },
        ],
      }),
      event('evt_lunch', 'Lunch break', 0, '13:00', 45, 'cal_personal', '#9b8f53'),
      event('evt_doctor', 'Doctor appointment', 0, '15:00', 60, 'cal_personal', '#bd6a5c', {
        location: 'City clinic',
        isImportant: true,
      }),
      event('evt_family', 'Family time', 0, '19:00', 90, 'cal_family', '#bd6a5c'),
      event('evt_review', 'Weekly review', 1, '10:00', 60, 'cal_work', '#2d7c65'),
      event('evt_photo', 'Photography walk', 2, '17:30', 90, 'cal_personal', '#e39a27'),
      event('evt_trip', 'Trip to Nepal', 18, '00:00', 1_439, 'cal_family', '#bd6a5c', {
        allDay: true,
        countdown: true,
        isImportant: true,
        startDateTime: tripDate.toISOString(),
        endDateTime: addDays(tripDate, 1).toISOString(),
      }),
    ],
    tasks: [
      task('task_photos', 'Edit travel photos', 0, 'high', 120, {
        category: 'Photography',
        status: 'planned',
        scheduledStart: localDateTime(today, '16:30'),
        scheduledEnd: localDateTime(today, '18:30'),
        subtasks: [
          { id: 'st1', title: 'Select best shots', completed: true },
          { id: 'st2', title: 'Color correction', completed: false },
        ],
      }),
      task('task_invoice', 'Pay electricity bill', 0, 'urgent', 20, { category: 'Bills' }),
      task('task_plan', 'Prepare weekly plan', 1, 'medium', 45, { category: 'Work', dueTime: '12:00' }),
      task('task_call', 'Call family', 0, 'medium', 30, { category: 'Family', dueTime: '20:00' }),
      task('task_backup', 'Back up camera files', 2, 'low', 60, { category: 'Photography' }),
      task('task_done', 'Book doctor appointment', -1, 'high', 10, {
        status: 'completed',
        completedAt: now.toISOString(),
      }),
    ],
    reminders: [
      {
        id: 'rem_bill',
        userId: DEMO_USER_ID,
        title: 'Electricity bill due',
        kind: 'bill',
        remindAt: localDateTime(today, '17:00'),
        important: true,
        completed: false,
        channels: ['in-app', 'push'],
      },
      {
        id: 'rem_medicine',
        userId: DEMO_USER_ID,
        title: 'Evening medicine',
        kind: 'medication',
        remindAt: localDateTime(today, '21:00'),
        important: false,
        completed: false,
        channels: ['in-app'],
      },
      {
        id: 'rem_renewal',
        userId: DEMO_USER_ID,
        title: 'Cloud storage renewal',
        kind: 'renewal',
        remindAt: localDateTime(tomorrow, '09:00'),
        important: false,
        completed: false,
        channels: ['in-app', 'email'],
      },
    ],
    routines: [
      {
        id: 'routine_reading',
        userId: DEMO_USER_ID,
        title: 'Reading',
        days: [1, 2, 3, 4, 5, 6, 0],
        startTime: '22:00',
        durationMinutes: 30,
        reminderMinutes: 10,
        flexibility: 'flexible',
        color: '#8c6ab1',
      },
      {
        id: 'routine_sleep',
        userId: DEMO_USER_ID,
        title: 'Sleep',
        days: [1, 2, 3, 4, 5, 6, 0],
        startTime: '23:00',
        durationMinutes: 480,
        reminderMinutes: 30,
        flexibility: 'fixed',
        color: '#536b8e',
      },
    ],
    notifications: [],
  };
}
