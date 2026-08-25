import type {
  CalendarEvent,
  PlannerProposal,
  PlannerTask,
  QuickAddPreview,
  Routine,
  UserPreferences,
} from '../types/domain';
import { addDays, addMinutes, localDateTime, toDateKey } from '../utils/date';
import { suggestFreeTime } from './calendarService';

const TWELVE_HOUR_TIME_PATTERN = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i;
const TWELVE_HOUR_TIME_REPLACEMENT_PATTERN = /\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm)\b/gi;

export interface PlannerContext {
  events: CalendarEvent[];
  tasks: PlannerTask[];
  routines: Routine[];
  preferences: UserPreferences;
}

export interface AIPlannerProvider {
  readonly providerId: string;
  parseQuickAdd(input: string, context: PlannerContext): Promise<QuickAddPreview>;
  proposePlan(prompt: string, context: PlannerContext): Promise<PlannerProposal>;
}

function parseRelativeDate(input: string): Date {
  const normalized = input.toLowerCase();
  if (normalized.includes('tomorrow')) return addDays(new Date(), 1);
  return new Date();
}

function parseTime(input: string): string {
  const match = input.match(TWELVE_HOUR_TIME_PATTERN);
  if (!match) return '09:00';
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  if (match[3].toLowerCase() === 'pm' && hour !== 12) hour += 12;
  if (match[3].toLowerCase() === 'am' && hour === 12) hour = 0;
  return `${`${hour}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}`;
}

function parseReminder(input: string): number | undefined {
  const match = input.match(/remind me\s+(\d+)\s*(minute|minutes|hour|hours|day|days)\s+before/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith('hour')) return amount * 60;
  if (unit.startsWith('day')) return amount * 1_440;
  return amount;
}

export class LocalRulesAIProvider implements AIPlannerProvider {
  readonly providerId = 'local-rules';

  async parseQuickAdd(input: string, _context: PlannerContext): Promise<QuickAddPreview> {
    const date = parseRelativeDate(input);
    const time = parseTime(input);
    const title = input
      .replace(/\btomorrow\b/gi, '')
      .replace(/\btoday\b/gi, '')
      .replace(TWELVE_HOUR_TIME_REPLACEMENT_PATTERN, '')
      .replace(/,?\s*remind me.*$/gi, '')
      .replace(/^\s+|\s+$/g, '') || 'New event';
    return {
      kind: 'event',
      title: title.charAt(0).toUpperCase() + title.slice(1),
      date: toDateKey(date),
      startTime: time,
      endTime: `${`${(Number(time.slice(0, 2)) + 1) % 24}`.padStart(2, '0')}:${time.slice(3)}`,
      reminderMinutes: parseReminder(input),
      confidence: 0.78,
      sourceText: input,
    };
  }

  async proposePlan(prompt: string, context: PlannerContext): Promise<PlannerProposal> {
    const candidates = context.tasks
      .filter((task) => task.status !== 'completed')
      .sort((left, right) => {
        const priority = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priority[right.priority] - priority[left.priority];
      })
      .slice(0, 3);
    const reserved = [...context.events];
    const items = candidates.flatMap((task) => {
      const slot = suggestFreeTime(reserved, task.estimatedMinutes, context.preferences, 'any')[0];
      if (!slot) return [];
      reserved.push({
        id: `proposal_hold_${task.id}`,
        userId: task.userId,
        calendarId: 'proposal',
        title: task.title,
        description: '',
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        timezone: context.preferences.timezone,
        allDay: false,
        location: '',
        color: '#e39a27',
        status: 'tentative',
        recurrenceRule: null,
        reminders: [],
        participants: [],
        attachments: [],
        notes: '',
        url: '',
        isImportant: false,
        countdown: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return [
        {
          id: `proposal_${task.id}`,
          kind: 'task' as const,
          sourceId: task.id,
          title: task.title,
          startDateTime: slot.startDateTime,
          endDateTime: slot.endDateTime,
          reason: `${task.priority} priority · ${task.estimatedMinutes} minutes`,
          movable: true,
        },
      ];
    });

    return {
      id: `plan_${Date.now()}`,
      prompt,
      summary: items.length
        ? `A balanced plan with ${items.length} focused blocks, ready for your approval.`
        : 'No safe free slot was found. Try changing your work hours or deadlines.',
      items,
      warnings: ['Nothing will be moved or saved until you select Apply plan.'],
      status: 'preview',
    };
  }
}

export function quickAddPreviewToDates(preview: QuickAddPreview): { start: string; end: string } {
  const start = localDateTime(preview.date, preview.startTime ?? '09:00');
  const startDate = new Date(start);
  const parsedEnd = preview.endTime
    ? new Date(localDateTime(preview.date, preview.endTime))
    : addMinutes(startDate, 60);
  const endDate = parsedEnd <= startDate ? addDays(parsedEnd, 1) : parsedEnd;
  return { start, end: endDate.toISOString() };
}
