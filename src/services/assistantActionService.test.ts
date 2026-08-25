import { createSeedData, DEMO_USER_ID } from '../data/seed';
import type { AssistantAction } from './assistantSchema';
import { applyAssistantActions, type AssistantMutationPort } from './assistantActionService';

const emptyData: AssistantAction['data'] = {
  title: null,
  description: null,
  calendarId: null,
  startDateTime: null,
  endDateTime: null,
  timezone: null,
  allDay: null,
  location: null,
  eventStatus: null,
  recurrenceRule: null,
  reminderMinutes: null,
  isImportant: null,
  countdown: null,
  color: null,
  taskStatus: null,
  priority: null,
  dueDate: null,
  dueTime: null,
  scheduledStart: null,
  scheduledEnd: null,
  estimatedMinutes: null,
  category: null,
  reminderKind: null,
  remindAt: null,
  important: null,
  channels: null,
  notes: null,
  days: null,
  startTime: null,
  durationMinutes: null,
  flexibility: null,
  active: null,
};

function makePort(): AssistantMutationPort & { calls: string[] } {
  const data = createSeedData();
  const calls: string[] = [];
  return {
    data,
    userId: DEMO_USER_ID,
    calls,
    saveEvent: (event) => { calls.push(`save-event:${event.title}`); },
    deleteEvent: (id) => { calls.push(`delete-event:${id}`); },
    saveTask: (task) => { calls.push(`save-task:${task.title}:${task.status}`); },
    deleteTask: (id) => { calls.push(`delete-task:${id}`); },
    saveReminder: (reminder) => { calls.push(`save-reminder:${reminder.title}`); },
    deleteReminder: (id) => { calls.push(`delete-reminder:${id}`); },
    saveRoutine: (routine) => { calls.push(`save-routine:${routine.title}`); },
    deleteRoutine: (id) => { calls.push(`delete-routine:${id}`); },
  };
}

describe('assistant action service', () => {
  it('applies approved create actions through the planner mutation port', () => {
    const port = makePort();
    const action: AssistantAction = {
      id: 'proposal-1',
      operation: 'create',
      entity: 'reminder',
      targetId: null,
      label: 'Call family',
      reason: 'Requested by the user',
      data: { ...emptyData, title: 'Call family', remindAt: '2026-08-27T09:00:00.000Z' },
    };

    expect(applyAssistantActions([action], port)).toEqual({ applied: 1, errors: [] });
    expect(port.calls).toEqual(['save-reminder:Call family']);
  });

  it('rejects cross-user or invented update/delete targets', () => {
    const port = makePort();
    const action: AssistantAction = {
      id: 'proposal-2',
      operation: 'delete',
      entity: 'event',
      targetId: 'invented-event',
      label: 'Delete event',
      reason: 'Requested by the model',
      data: emptyData,
    };

    const result = applyAssistantActions([action], port);
    expect(result.applied).toBe(0);
    expect(result.errors[0]).toContain('Event was not found');
    expect(port.calls).toEqual([]);
  });

  it('updates only an existing owned task', () => {
    const port = makePort();
    const action: AssistantAction = {
      id: 'proposal-3',
      operation: 'update',
      entity: 'task',
      targetId: 'task_invoice',
      label: 'Complete electricity bill',
      reason: 'The user marked it complete',
      data: { ...emptyData, taskStatus: 'completed' },
    };

    expect(applyAssistantActions([action], port)).toEqual({ applied: 1, errors: [] });
    expect(port.calls).toEqual(['save-task:Pay electricity bill:completed']);
  });
});
