import type { CalendarEvent, PlannerTask, Routine, UserPreferences } from '../types/domain';
import { findConflicts, suggestFreeTime } from './calendarService';

const preferences: UserPreferences = {
  userId: 'user',
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  firstDayOfWeek: 1,
  workDayStart: '08:00',
  workDayEnd: '20:00',
  workingDays: [0, 1, 2, 3, 4, 5, 6],
  sleepStart: '23:00',
  sleepEnd: '07:00',
  defaultEventMinutes: 60,
  defaultTaskMinutes: 45,
  theme: 'system',
};

function makeEvent(
  id: string,
  startDateTime: string,
  endDateTime: string,
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id,
    userId: 'user',
    calendarId: 'calendar',
    title: id,
    description: '',
    startDateTime,
    endDateTime,
    timezone: 'UTC',
    allDay: false,
    location: '',
    color: '#000000',
    status: 'confirmed',
    recurrenceRule: null,
    reminders: [],
    participants: [],
    attachments: [],
    notes: '',
    url: '',
    isImportant: false,
    countdown: false,
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    ...overrides,
  };
}

function makeTask(
  id: string,
  scheduledStart: string | null,
  scheduledEnd: string | null,
  overrides: Partial<PlannerTask> = {},
): PlannerTask {
  return {
    id,
    userId: 'user',
    title: id,
    description: '',
    status: 'planned',
    priority: 'medium',
    dueDate: null,
    dueTime: null,
    scheduledStart,
    scheduledEnd,
    estimatedMinutes: 60,
    category: 'Test',
    subtasks: [],
    recurrenceRule: null,
    reminderMinutes: null,
    completedAt: null,
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    ...overrides,
  };
}

function makeRoutine(
  id: string,
  startTime: string,
  durationMinutes: number,
  overrides: Partial<Routine> = {},
): Routine {
  return {
    id,
    userId: 'user',
    title: id,
    days: [1],
    startTime,
    durationMinutes,
    reminderMinutes: 0,
    flexibility: 'fixed',
    color: '#000000',
    active: true,
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    ...overrides,
  };
}

describe('calendar service', () => {
  it('detects overlapping events but excludes the event being edited', () => {
    const existing = makeEvent('existing', '2026-08-24T10:00:00.000Z', '2026-08-24T11:00:00.000Z');
    const candidate = makeEvent('candidate', '2026-08-24T10:30:00.000Z', '2026-08-24T11:30:00.000Z');
    expect(findConflicts(candidate, [existing])).toEqual([existing]);
    expect(findConflicts(existing, [existing])).toEqual([]);
  });

  it('excludes past time, scheduled tasks and fixed routines while merging overlapping busy time', () => {
    const events = [
      makeEvent('meeting-a', '2026-08-24T10:00:00.000Z', '2026-08-24T11:00:00.000Z'),
      makeEvent('meeting-b', '2026-08-24T10:30:00.000Z', '2026-08-24T12:00:00.000Z'),
    ];
    const tasks = [makeTask('scheduled', '2026-08-24T12:00:00.000Z', '2026-08-24T13:00:00.000Z')];
    const routines = [
      makeRoutine('fixed', '13:00', 60),
      makeRoutine('flexible', '14:00', 120, { flexibility: 'flexible' }),
    ];

    const slots = suggestFreeTime(events, 60, preferences, 'any', {
      tasks,
      routines,
      now: new Date('2026-08-24T10:15:00.000Z'),
      rangeStart: new Date('2026-08-24T08:00:00.000Z'),
      rangeEnd: new Date('2026-08-24T20:00:00.000Z'),
      limit: 1,
    });

    expect(slots).toEqual([
      {
        startDateTime: '2026-08-24T14:00:00.000Z',
        endDateTime: '2026-08-24T15:00:00.000Z',
      },
    ]);
  });

  it('handles overnight work, routines and overlapping cross-midnight busy intervals', () => {
    const overnightPreferences: UserPreferences = {
      ...preferences,
      workDayStart: '22:00',
      workDayEnd: '04:00',
      workingDays: [1],
    };
    const events = [
      makeEvent('late-event', '2026-08-24T22:00:00.000Z', '2026-08-24T23:45:00.000Z'),
      // Invalid reversed intervals are ignored instead of looping or moving the cursor backwards.
      makeEvent('invalid', '2026-08-25T03:00:00.000Z', '2026-08-25T02:00:00.000Z'),
    ];
    const tasks = [makeTask('night-task', '2026-08-25T01:00:00.000Z', '2026-08-25T02:00:00.000Z')];
    const routines = [makeRoutine('night-routine', '23:30', 120)];

    const slots = suggestFreeTime(events, 60, overnightPreferences, 'any', {
      tasks,
      routines,
      now: new Date('2026-08-24T21:30:00.000Z'),
      rangeStart: new Date('2026-08-24T21:30:00.000Z'),
      rangeEnd: new Date('2026-08-25T04:00:00.000Z'),
      limit: 1,
    });

    expect(slots[0]).toEqual({
      startDateTime: '2026-08-25T02:00:00.000Z',
      endDateTime: '2026-08-25T03:00:00.000Z',
    });
  });

  it('keeps the previous working day overnight shift available after midnight', () => {
    const overnightPreferences: UserPreferences = {
      ...preferences,
      workDayStart: '22:00',
      workDayEnd: '04:00',
      workingDays: [1],
    };
    const slots = suggestFreeTime([], 60, overnightPreferences, 'any', {
      routines: [makeRoutine('sleep-prep', '23:30', 120)],
      now: new Date('2026-08-25T00:30:00.000Z'),
      rangeStart: new Date('2026-08-25T00:30:00.000Z'),
      rangeEnd: new Date('2026-08-25T04:00:00.000Z'),
      limit: 1,
    });
    expect(slots[0]).toEqual({
      startDateTime: '2026-08-25T01:30:00.000Z',
      endDateTime: '2026-08-25T02:30:00.000Z',
    });
  });

  it('uses exact injected range boundaries and rounds a sub-minute now forward', () => {
    const slots = suggestFreeTime([], 30, preferences, 'any', {
      now: new Date('2026-08-24T15:00:20.000Z'),
      rangeStart: new Date('2026-08-24T08:00:00.000Z'),
      rangeEnd: new Date('2026-08-24T15:31:00.000Z'),
      limit: 1,
    });
    expect(slots[0]).toEqual({
      startDateTime: '2026-08-24T15:01:00.000Z',
      endDateTime: '2026-08-24T15:31:00.000Z',
    });
  });

  it('interprets work hours and today in the preference timezone', () => {
    const nepalPreferences: UserPreferences = {
      ...preferences,
      timezone: 'Asia/Kathmandu',
      workDayStart: '08:00',
      workDayEnd: '10:00',
      workingDays: [1],
    };
    const slots = suggestFreeTime([], 30, nepalPreferences, 'any', {
      // 08:30 Monday in Nepal; the 08:00-08:30 local window is already past.
      now: new Date('2026-08-24T02:45:00.000Z'),
      rangeStart: new Date('2026-08-23T18:15:00.000Z'),
      rangeEnd: new Date('2026-08-24T04:15:00.000Z'),
      limit: 1,
    });
    expect(slots[0]).toEqual({
      startDateTime: '2026-08-24T02:45:00.000Z',
      endDateTime: '2026-08-24T03:15:00.000Z',
    });
  });
});
