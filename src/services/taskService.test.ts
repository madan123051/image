import type { PlannerTask, Routine, UserPreferences } from '../types/domain';
import { getTaskScheduleSuggestions, isMissedTask } from './taskService';

const preferences: UserPreferences = {
  userId: 'user',
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  firstDayOfWeek: 1,
  workDayStart: '08:00',
  workDayEnd: '12:00',
  workingDays: [1],
  sleepStart: '23:00',
  sleepEnd: '07:00',
  defaultEventMinutes: 60,
  defaultTaskMinutes: 60,
  theme: 'system',
};

function makeTask(id: string, overrides: Partial<PlannerTask> = {}): PlannerTask {
  return {
    id,
    userId: 'user',
    title: id,
    description: '',
    status: 'planned',
    priority: 'medium',
    dueDate: null,
    dueTime: null,
    scheduledStart: null,
    scheduledEnd: null,
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

describe('task service', () => {
  it('passes planner context through while excluding the task being rescheduled', () => {
    const target = makeTask('target', {
      scheduledStart: '2026-08-24T08:00:00.000Z',
      scheduledEnd: '2026-08-24T10:00:00.000Z',
    });
    const other = makeTask('other', {
      scheduledStart: '2026-08-24T10:00:00.000Z',
      scheduledEnd: '2026-08-24T11:00:00.000Z',
    });
    const completed = makeTask('completed', {
      status: 'completed',
      scheduledStart: '2026-08-24T09:00:00.000Z',
      scheduledEnd: '2026-08-24T10:00:00.000Z',
    });
    const routine: Routine = {
      id: 'routine',
      userId: 'user',
      title: 'Fixed routine',
      days: [1],
      startTime: '08:00',
      durationMinutes: 60,
      reminderMinutes: 0,
      flexibility: 'fixed',
      color: '#000000',
      active: true,
      createdAt: '2026-08-24T00:00:00.000Z',
      updatedAt: '2026-08-24T00:00:00.000Z',
    };

    const slots = getTaskScheduleSuggestions(target, [], preferences, {
      tasks: [target, other, completed],
      routines: [routine],
      now: new Date('2026-08-24T08:00:00.000Z'),
      rangeStart: new Date('2026-08-24T08:00:00.000Z'),
      rangeEnd: new Date('2026-08-24T12:00:00.000Z'),
      limit: 1,
    });

    expect(slots[0]).toEqual({
      startDateTime: '2026-08-24T09:00:00.000Z',
      endDateTime: '2026-08-24T10:00:00.000Z',
    });
  });

  it('marks only unfinished tasks whose scheduled end is before now as missed', () => {
    const now = new Date('2026-08-24T12:00:00.000Z');
    expect(isMissedTask(makeTask('past', { scheduledEnd: '2026-08-24T11:59:00.000Z' }), now)).toBe(true);
    expect(isMissedTask(makeTask('future', { scheduledEnd: '2026-08-24T12:01:00.000Z' }), now)).toBe(false);
    expect(
      isMissedTask(
        makeTask('done', { status: 'completed', scheduledEnd: '2026-08-24T11:59:00.000Z' }),
        now,
      ),
    ).toBe(false);
  });
});
