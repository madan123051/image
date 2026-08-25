import type { AppData, Language } from '../types/domain';
import type { CopyKey } from '../i18n';
import { calculateFreeMinutes, formatDuration, isSameDay, minutesBetween, toDateKey } from '../utils/date';
import { getNepaliDate, NEPALI_MONTHS, toNepaliNumerals } from '../nepaliCalendar';
import { getEventCalendarDayCountdown } from '../services/countdownService';

interface TodayPageProps {
  data: AppData;
  userId: string;
  language: Language;
  labels: Record<CopyKey, string>;
  onOpenCalendar(): void;
  onOpenTasks(): void;
  onEditEvent(eventId: string): void;
  onToggleTask(taskId: string): void;
}

function formatTime(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function TodayPage({
  data,
  userId,
  language,
  labels,
  onOpenCalendar,
  onOpenTasks,
  onEditEvent,
  onToggleTask,
}: TodayPageProps) {
  const now = new Date();
  const user = data.users.find((item) => item.id === userId);
  const preferences = data.preferences.find((item) => item.userId === userId);
  if (!user || !preferences) return null;

  const events = data.events
    .filter((event) => event.userId === userId && isSameDay(event.startDateTime, now) && event.status !== 'cancelled')
    .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
  const tasks = data.tasks.filter(
    (task) => task.userId === userId && task.status !== 'completed' && (task.dueDate === toDateKey(now) || (task.scheduledStart && isSameDay(task.scheduledStart, now))),
  );
  const reminders = data.reminders.filter(
    (reminder) => reminder.userId === userId && !reminder.completed && isSameDay(reminder.remindAt, now),
  );
  const freeMinutes = calculateFreeMinutes(now, events, preferences);
  const countdowns = data.events
    .filter((event) => event.userId === userId && event.countdown && new Date(event.startDateTime) >= now)
    .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
  const nextEvent = events.find((event) => new Date(event.endDateTime) >= now) ?? events[events.length - 1];
  const timelineItems = [
    ...events.map((event) => ({
      id: event.id,
      kind: 'event' as const,
      title: event.title,
      start: event.startDateTime,
      end: event.endDateTime,
      color: event.color,
      status: event.status,
    })),
    ...tasks
      .filter((task) => task.scheduledStart && task.scheduledEnd)
      .map((task) => ({
        id: task.id,
        kind: 'task' as const,
        title: task.title,
        start: task.scheduledStart as string,
        end: task.scheduledEnd as string,
        color: '#9b7c38',
        status: task.status,
      })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const englishDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  const nepali = getNepaliDate(now);
  const displayedDate = language === 'ne'
    ? `${toNepaliNumerals(nepali.year)} ${NEPALI_MONTHS[nepali.month - 1]} ${toNepaliNumerals(nepali.day)}, ${new Intl.DateTimeFormat('ne-NP', { weekday: 'long' }).format(now)}`
    : englishDate;
  const plannerTime = new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', {
    timeZone: preferences.timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(now);
  const timezoneLabel = preferences.timezone.split('/').pop()?.replace(/_/g, ' ') ?? preferences.timezone;

  return (
    <div className="page today-page">
      <header className="page-heading today-heading">
        <div>
          <p className="eyebrow">{labels.today} · {displayedDate}</p>
          <h1>{labels.greeting}, {user.displayName}.</h1>
          <p>{labels.focus}</p>
        </div>
        <div className="weather-chip" title={`Planner time zone: ${preferences.timezone}`}>
          <span aria-hidden="true">◷</span>
          <span><strong>{plannerTime}</strong><small>{timezoneLabel} · planner time</small></span>
        </div>
      </header>

      <section className="summary-strip" aria-label="Today summary">
        <button type="button" onClick={onOpenCalendar}>
          <strong>{events.length}</strong><span>{labels.events}</span><small>{nextEvent ? `${formatTime(nextEvent.startDateTime, language)} · ${nextEvent.title}` : labels.noEvents}</small>
        </button>
        <button type="button" onClick={onOpenTasks}>
          <strong>{tasks.length}</strong><span>{labels.tasks}</span><small>{tasks.filter((task) => task.priority === 'urgent').length} urgent</small>
        </button>
        <div>
          <strong>{reminders.length}</strong><span>{labels.reminders}</span><small>{labels.pending}</small>
        </div>
        <div>
          <strong>{formatDuration(freeMinutes)}</strong><span>{labels.freeTime}</span><small>Within planning hours</small>
        </div>
      </section>

      <div className="today-grid">
        <section className="content-panel timeline-panel">
          <header className="section-heading">
            <div><p className="eyebrow">{labels.today}</p><h2>{labels.timeline}</h2></div>
            <button className="text-button" type="button" onClick={onOpenCalendar}>{labels.viewAll} →</button>
          </header>
          <div className="timeline-list">
            {timelineItems.length ? timelineItems.map((item) => (
              <button
                type="button"
                className="timeline-item"
                key={`${item.kind}_${item.id}`}
                onClick={() => item.kind === 'event' ? onEditEvent(item.id) : onToggleTask(item.id)}
              >
                <time>{formatTime(item.start, language)}</time>
                <span className="timeline-rail"><i style={{ background: item.color }} /></span>
                <span className="timeline-content">
                  <strong>{item.title}</strong>
                  <small>{formatDuration(minutesBetween(item.start, item.end))} · {item.kind === 'task' ? labels.tasks : labels.events}</small>
                </span>
                <span className={`status-pill ${item.status}`}>{item.status.replace('-', ' ')}</span>
              </button>
            )) : <div className="empty-state"><span>☘</span><p>{labels.noEvents}</p></div>}
          </div>
        </section>

        <aside className="today-aside">
          <section className="content-panel countdown-panel">
            <header className="section-heading"><div><p className="eyebrow">Life dates</p><h2>Countdowns</h2></div></header>
            {countdowns.length ? countdowns.slice(0, 3).map((event) => {
              const countdown = getEventCalendarDayCountdown(event, now, preferences.timezone);
              return (
                <button type="button" className="countdown-card" key={event.id} onClick={() => onEditEvent(event.id)}>
                  <span><strong>{event.title}</strong><small>{new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', { dateStyle: 'medium', timeZone: event.timezone || preferences.timezone }).format(new Date(event.startDateTime))}</small></span>
                  <b>{language === 'ne' ? toNepaliNumerals(countdown.daysRemaining) : countdown.daysRemaining}<small>{language === 'ne' ? 'दिन' : 'days'}</small></b>
                </button>
              );
            }) : <p className="muted-copy">Mark an important event as a countdown.</p>}
          </section>

          <section className="content-panel focus-panel">
            <span className="panel-icon">✦</span>
            <p className="eyebrow">Aayoj suggestion</p>
            <h3>Protect a 45-minute focus block</h3>
            <p>You have an open window after lunch. Preview it in the AI Planner before adding it.</p>
            <button className="secondary-button" type="button" onClick={() => onOpenTasks()}>Review tasks</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
