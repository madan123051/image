export type Language = 'en' | 'ne';
export type ThemePreference = 'light' | 'dark' | 'system';
export type AppSection =
  | 'today'
  | 'calendar'
  | 'tasks'
  | 'planner'
  | 'reminders'
  | 'shared'
  | 'insights'
  | 'settings';

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';
export type EventStatus = 'confirmed' | 'tentative' | 'completed' | 'cancelled';
export type TaskStatus = 'inbox' | 'planned' | 'in-progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReminderChannel = 'in-app' | 'push' | 'email';
export type ShareRole = 'owner' | 'editor' | 'viewer';
export type RoutineFlexibility = 'fixed' | 'flexible';
export type SyncMode = 'demo' | 'connecting' | 'synced' | 'saving' | 'offline' | 'error';

export interface PlannerSyncState {
  mode: SyncMode;
  message: string;
  hasPendingWrites: boolean;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserPreferences {
  userId: string;
  language: Language;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 0 | 1 | 6;
  workDayStart: string;
  workDayEnd: string;
  workingDays: number[];
  sleepStart: string;
  sleepEnd: string;
  defaultEventMinutes: number;
  defaultTaskMinutes: number;
  theme: ThemePreference;
}

export interface CalendarDefinition {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  visible: boolean;
  isPrivate: boolean;
  role: ShareRole;
}

export interface EventReminder {
  id: string;
  minutesBefore: number;
  channels: ReminderChannel[];
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  response: 'pending' | 'accepted' | 'declined';
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  calendarId: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  timezone: string;
  allDay: boolean;
  location: string;
  color: string;
  status: EventStatus;
  recurrenceRule: string | null;
  reminders: EventReminder[];
  participants: Participant[];
  attachments: Attachment[];
  notes: string;
  url: string;
  isImportant: boolean;
  countdown: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface PlannerTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  estimatedMinutes: number;
  category: string;
  subtasks: Subtask[];
  recurrenceRule: string | null;
  reminderMinutes: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  kind: 'bill' | 'birthday' | 'medication' | 'appointment' | 'renewal' | 'custom';
  remindAt: string;
  important: boolean;
  completed: boolean;
  channels: ReminderChannel[];
  notes: string;
  recurrenceRule: string | null;
  snoozedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Routine {
  id: string;
  userId: string;
  title: string;
  days: number[];
  startTime: string;
  durationMinutes: number;
  reminderMinutes: number;
  flexibility: RoutineFlexibility;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  sourceId: string;
  type: 'event' | 'task' | 'missed-task' | 'birthday' | 'bill' | 'countdown' | 'shared';
  title: string;
  message: string;
  scheduledAt: string;
  channels: ReminderChannel[];
  read: boolean;
  readAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface PlannerProposalItem {
  id: string;
  kind: 'task' | 'routine' | 'focus';
  sourceId?: string;
  title: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  movable: boolean;
}

export interface PlannerProposal {
  id: string;
  prompt: string;
  summary: string;
  items: PlannerProposalItem[];
  warnings: string[];
  status: 'preview' | 'applied' | 'cancelled';
}

export interface QuickAddPreview {
  kind: 'event' | 'task' | 'reminder' | 'routine';
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reminderMinutes?: number;
  confidence: number;
  sourceText: string;
}

export interface FreeSlot {
  startDateTime: string;
  endDateTime: string;
}

export interface SearchResult {
  id: string;
  type: 'event' | 'task' | 'reminder' | 'routine';
  title: string;
  subtitle: string;
  section: AppSection;
}

export interface AppData {
  users: User[];
  preferences: UserPreferences[];
  calendars: CalendarDefinition[];
  events: CalendarEvent[];
  tasks: PlannerTask[];
  reminders: Reminder[];
  routines: Routine[];
  notifications: NotificationItem[];
}
