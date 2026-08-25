PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  date_format TEXT NOT NULL DEFAULT 'MMM d, yyyy',
  time_format TEXT NOT NULL DEFAULT '24h',
  first_day_of_week INTEGER NOT NULL DEFAULT 1 CHECK (first_day_of_week BETWEEN 0 AND 6),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  workday_start TEXT NOT NULL DEFAULT '09:00',
  workday_end TEXT NOT NULL DEFAULT '18:00',
  sleep_start TEXT NOT NULL DEFAULT '23:00',
  sleep_end TEXT NOT NULL DEFAULT '07:00',
  working_days_json TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  default_event_minutes INTEGER NOT NULL DEFAULT 60,
  default_task_minutes INTEGER NOT NULL DEFAULT 30,
  updated_at TEXT NOT NULL
);

CREATE TABLE calendars (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  provider TEXT NOT NULL DEFAULT 'local',
  external_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE calendar_members (
  calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (calendar_id, user_id)
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0 CHECK (all_day IN (0, 1)),
  location TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'completed', 'cancelled')),
  recurrence_rule TEXT,
  notes TEXT NOT NULL DEFAULT '',
  url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (end_at > start_at)
);

CREATE TABLE event_participants (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  response_status TEXT NOT NULL DEFAULT 'needs_action',
  PRIMARY KEY (event_id, email)
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'planned', 'in_progress', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_at TEXT,
  scheduled_start TEXT,
  scheduled_end TEXT,
  estimated_minutes INTEGER NOT NULL DEFAULT 30 CHECK (estimated_minutes > 0),
  category TEXT NOT NULL DEFAULT 'Personal',
  recurrence_rule TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (scheduled_end IS NULL OR scheduled_start IS NOT NULL),
  CHECK (scheduled_end IS NULL OR scheduled_end > scheduled_start)
);

CREATE TABLE subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  position INTEGER NOT NULL
);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('event', 'task', 'routine', 'standalone', 'countdown')),
  source_id TEXT,
  title TEXT NOT NULL,
  remind_at TEXT NOT NULL,
  channels_json TEXT NOT NULL DEFAULT '["in_app"]',
  delivered_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE routines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  days_json TEXT NOT NULL,
  start_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  reminder_minutes INTEGER,
  flexibility TEXT NOT NULL CHECK (flexibility IN ('fixed', 'flexible')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'task', 'reminder')),
  entity_id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE ai_planner_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('proposed', 'approved', 'rejected', 'applied', 'failed')),
  proposal_json TEXT,
  approved_at TEXT,
  applied_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_calendars_owner_user_id ON calendars(owner_user_id);
CREATE INDEX idx_calendar_members_user_id ON calendar_members(user_id, calendar_id);
CREATE INDEX idx_events_user_start ON events(user_id, start_at);
CREATE INDEX idx_events_calendar_start ON events(calendar_id, start_at);
CREATE INDEX idx_tasks_user_status_due ON tasks(user_id, status, due_at);
CREATE INDEX idx_tasks_user_scheduled ON tasks(user_id, scheduled_start) WHERE scheduled_start IS NOT NULL;
CREATE INDEX idx_reminders_user_due ON reminders(user_id, remind_at) WHERE delivered_at IS NULL;
CREATE INDEX idx_routines_user_active ON routines(user_id, active) WHERE active = 1;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at) WHERE read_at IS NULL;
CREATE INDEX idx_ai_planner_requests_user_created ON ai_planner_requests(user_id, created_at);

PRAGMA optimize;
