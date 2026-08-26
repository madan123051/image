import { useMemo, useState } from 'react';
import type { CalendarDefinition, CalendarEvent, PlannerTask, Routine } from '../types/domain';
import type { CopyKey } from '../i18n';
import { formatDuration, minutesBetween } from '../utils/date';

type InsightPeriod = 'week' | 'month';

interface InsightsPageProps {
  events: CalendarEvent[];
  tasks: PlannerTask[];
  routines: Routine[];
  calendars: CalendarDefinition[];
  labels: Record<CopyKey, string>;
}

function periodRange(period: InsightPeriod): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  } else {
    start.setDate(1);
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 1);
  }
  return { start, end };
}

export function InsightsPage({ events, tasks, routines, calendars, labels }: InsightsPageProps) {
  const [period, setPeriod] = useState<InsightPeriod>('month');
  const { start, end } = useMemo(() => periodRange(period), [period]);
  const inPeriod = (value: string) => {
    const date = new Date(value);
    return date >= start && date < end;
  };
  const periodEvents = events.filter((event) => inPeriod(event.startDateTime));
  const periodTasks = tasks.filter((task) => {
    const value = task.completedAt ?? task.scheduledStart ?? (task.dueDate ? `${task.dueDate}T${task.dueTime ?? '23:59'}:00` : task.createdAt);
    return inPeriod(value);
  });
  const completed = periodTasks.filter((task) => task.status === 'completed').length;
  const completion = periodTasks.length ? Math.round((completed / periodTasks.length) * 100) : 0;
  const workCalendarIds = new Set(calendars.filter((calendar) => /work|office|काम/i.test(calendar.name)).map((calendar) => calendar.id));
  const workMinutes = periodEvents.filter((event) => workCalendarIds.has(event.calendarId)).reduce((sum, event) => sum + minutesBetween(event.startDateTime, event.endDateTime), 0);
  const personalMinutes = periodEvents.filter((event) => !workCalendarIds.has(event.calendarId)).reduce((sum, event) => sum + minutesBetween(event.startDateTime, event.endDateTime), 0);
  const maxMinutes = Math.max(workMinutes, personalMinutes, 1);
  const activeRoutines = routines.filter((routine) => routine.active).length;
  const routineConsistency = routines.length ? Math.round((activeRoutines / routines.length) * 100) : 0;

  return <div className="page simple-page">
    <header className="page-heading compact-heading"><div><p className="eyebrow">A useful {period === 'week' ? 'weekly' : 'monthly'} reflection</p><h1>{labels.insights}</h1><p>Live metrics from your current events, tasks, calendars, and routines.</p></div><select className="period-select" value={period} onChange={(event) => setPeriod(event.target.value as InsightPeriod)}><option value="month">This month</option><option value="week">This week</option></select></header>
    <section className="insight-kpis"><div><span>Task completion</span><strong>{completion}%</strong><small>{completed} of {periodTasks.length} tasks</small></div><div><span>Scheduled work</span><strong>{formatDuration(workMinutes)}</strong><small>{periodEvents.filter((event) => workCalendarIds.has(event.calendarId)).length} work events</small></div><div><span>Personal time</span><strong>{formatDuration(personalMinutes)}</strong><small>Across personal and shared calendars</small></div><div><span>Routine consistency</span><strong>{routines.length ? `${routineConsistency}%` : '—'}</strong><small>{activeRoutines} of {routines.length} routines active</small></div></section>
    <div className="insight-grid"><section className="content-panel time-balance"><header className="section-heading"><div><p className="eyebrow">Time allocation</p><h2>Where your planned hours go</h2></div></header><div className="bar-metric"><span><b>Work</b><small>{formatDuration(workMinutes)}</small></span><i><b style={{ width: `${(workMinutes / maxMinutes) * 100}%` }} /></i></div><div className="bar-metric personal"><span><b>Personal & shared</b><small>{formatDuration(personalMinutes)}</small></span><i><b style={{ width: `${(personalMinutes / maxMinutes) * 100}%` }} /></i></div><div className="insight-callout"><span>◎</span><p><strong>{periodEvents.length ? 'Balance check' : 'Start planning'}</strong>{periodEvents.length ? 'Use the split above to protect time that is being squeezed out.' : 'Add events and scheduled tasks to build a useful reflection.'}</p></div></section><section className="content-panel completion-ring-panel"><div className="completion-ring" style={{ '--completion': `${completion * 3.6}deg` } as React.CSSProperties}><span><strong>{completion}%</strong><small>completed</small></span></div><h2>Task follow-through</h2><p>Calculated from tasks active in this {period}, not sample percentages.</p></section></div>
  </div>;
}
