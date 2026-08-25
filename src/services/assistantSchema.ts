import { z } from 'zod';

const shortString = z.string().trim().max(240);
const nullableShortString = shortString.nullable();
const nullableLongString = z.string().trim().max(4_000).nullable();

export const assistantActionDataSchema = z.object({
  title: nullableShortString,
  description: nullableLongString,
  calendarId: nullableShortString,
  startDateTime: nullableShortString,
  endDateTime: nullableShortString,
  timezone: nullableShortString,
  allDay: z.boolean().nullable(),
  location: nullableShortString,
  eventStatus: z.enum(['confirmed', 'tentative', 'completed', 'cancelled']).nullable(),
  recurrenceRule: nullableShortString,
  reminderMinutes: z.number().int().min(0).max(525_600).nullable(),
  isImportant: z.boolean().nullable(),
  countdown: z.boolean().nullable(),
  color: nullableShortString,
  taskStatus: z.enum(['inbox', 'planned', 'in-progress', 'completed']).nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).nullable(),
  dueDate: nullableShortString,
  dueTime: nullableShortString,
  scheduledStart: nullableShortString,
  scheduledEnd: nullableShortString,
  estimatedMinutes: z.number().int().min(1).max(10_080).nullable(),
  category: nullableShortString,
  reminderKind: z.enum(['bill', 'birthday', 'medication', 'appointment', 'renewal', 'custom']).nullable(),
  remindAt: nullableShortString,
  important: z.boolean().nullable(),
  channels: z.array(z.enum(['in-app', 'push', 'email'])).max(3).nullable(),
  notes: nullableLongString,
  days: z.array(z.number().int().min(0).max(6)).max(7).nullable(),
  startTime: nullableShortString,
  durationMinutes: z.number().int().min(1).max(1_440).nullable(),
  flexibility: z.enum(['fixed', 'flexible']).nullable(),
  active: z.boolean().nullable(),
});

export const assistantActionSchema = z.object({
  id: z.string().trim().min(1).max(128),
  operation: z.enum(['create', 'update', 'delete']),
  entity: z.enum(['event', 'task', 'reminder', 'routine']),
  targetId: z.string().trim().max(128).nullable(),
  label: z.string().trim().min(1).max(240),
  reason: z.string().trim().min(1).max(500),
  data: assistantActionDataSchema,
});

export const assistantResponseSchema = z.object({
  reply: z.string().trim().min(1).max(2_000),
  summary: z.string().trim().min(1).max(1_000),
  requiresConfirmation: z.boolean(),
  actions: z.array(assistantActionSchema).max(12),
  warnings: z.array(z.string().trim().min(1).max(500)).max(8),
});

const plannerEventSchema = z.object({
  id: z.string().max(128),
  calendarId: z.string().max(128),
  title: z.string().max(240),
  startDateTime: z.string().max(80),
  endDateTime: z.string().max(80),
  timezone: z.string().max(100),
  allDay: z.boolean(),
  location: z.string().max(500),
  status: z.enum(['confirmed', 'tentative', 'completed', 'cancelled']),
  isImportant: z.boolean(),
  countdown: z.boolean(),
});

const plannerTaskSchema = z.object({
  id: z.string().max(128),
  title: z.string().max(240),
  description: z.string().max(1_000),
  status: z.enum(['inbox', 'planned', 'in-progress', 'completed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueDate: z.string().max(32).nullable(),
  dueTime: z.string().max(16).nullable(),
  scheduledStart: z.string().max(80).nullable(),
  scheduledEnd: z.string().max(80).nullable(),
  estimatedMinutes: z.number().int().min(1).max(10_080),
  category: z.string().max(120),
});

const plannerReminderSchema = z.object({
  id: z.string().max(128),
  title: z.string().max(240),
  kind: z.enum(['bill', 'birthday', 'medication', 'appointment', 'renewal', 'custom']),
  remindAt: z.string().max(80),
  completed: z.boolean(),
  important: z.boolean(),
  recurrenceRule: z.string().max(500).nullable(),
  snoozedUntil: z.string().max(80).nullable(),
});

const plannerRoutineSchema = z.object({
  id: z.string().max(128),
  title: z.string().max(240),
  days: z.array(z.number().int().min(0).max(6)).max(7),
  startTime: z.string().max(16),
  durationMinutes: z.number().int().min(1).max(1_440),
  reminderMinutes: z.number().int().min(0).max(525_600),
  flexibility: z.enum(['fixed', 'flexible']),
  active: z.boolean(),
});

export const assistantContextSchema = z.object({
  now: z.string().max(80),
  language: z.enum(['en', 'ne']),
  timezone: z.string().min(1).max(100),
  calendars: z.array(z.object({ id: z.string().max(128), name: z.string().max(120), color: z.string().max(32) })).max(20),
  events: z.array(plannerEventSchema).max(100),
  tasks: z.array(plannerTaskSchema).max(100),
  reminders: z.array(plannerReminderSchema).max(60),
  routines: z.array(plannerRoutineSchema).max(40),
  preferences: z.object({
    workDayStart: z.string().max(16),
    workDayEnd: z.string().max(16),
    workingDays: z.array(z.number().int().min(0).max(6)).max(7),
    defaultEventMinutes: z.number().int().min(1).max(1_440),
    defaultTaskMinutes: z.number().int().min(1).max(1_440),
  }),
});

export const assistantRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(2_000),
  context: assistantContextSchema,
});

export type AssistantAction = z.infer<typeof assistantActionSchema>;
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
export type AssistantContext = z.infer<typeof assistantContextSchema>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
