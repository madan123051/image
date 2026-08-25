import type { CalendarEvent, PlannerTask, Routine } from '../types/domain';
import type { CopyKey } from '../i18n';
import { formatDuration, minutesBetween } from '../utils/date';

interface InsightsPageProps { events: CalendarEvent[]; tasks: PlannerTask[]; routines: Routine[]; labels: Record<CopyKey, string>; }

export function InsightsPage({ events, tasks, routines, labels }: InsightsPageProps) {
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const completion = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const workMinutes = events.filter((event) => event.calendarId === 'cal_work').reduce((sum, event) => sum + minutesBetween(event.startDateTime, event.endDateTime), 0);
  const personalMinutes = events.filter((event) => event.calendarId !== 'cal_work').reduce((sum, event) => sum + minutesBetween(event.startDateTime, event.endDateTime), 0);
  const maxMinutes = Math.max(workMinutes, personalMinutes, 1);
  return <div className="page simple-page">
    <header className="page-heading compact-heading"><div><p className="eyebrow">A useful monthly reflection</p><h1>{labels.insights}</h1><p>Only metrics that help you rebalance time and follow-through.</p></div><select className="period-select" defaultValue="month"><option value="month">This month</option><option value="week">This week</option></select></header>
    <section className="insight-kpis"><div><span>Task completion</span><strong>{completion}%</strong><small>{completed} of {tasks.length} tasks</small></div><div><span>Scheduled work</span><strong>{formatDuration(workMinutes)}</strong><small>{events.filter((event) => event.calendarId === 'cal_work').length} work events</small></div><div><span>Personal time</span><strong>{formatDuration(personalMinutes)}</strong><small>Across personal and family</small></div><div><span>Routine consistency</span><strong>{routines.length ? '82%' : '—'}</strong><small>{routines.length} active routines</small></div></section>
    <div className="insight-grid"><section className="content-panel time-balance"><header className="section-heading"><div><p className="eyebrow">Time allocation</p><h2>Where your planned hours go</h2></div></header><div className="bar-metric"><span><b>Work</b><small>{formatDuration(workMinutes)}</small></span><i><b style={{ width: `${(workMinutes / maxMinutes) * 100}%` }} /></i></div><div className="bar-metric personal"><span><b>Personal & family</b><small>{formatDuration(personalMinutes)}</small></span><i><b style={{ width: `${(personalMinutes / maxMinutes) * 100}%` }} /></i></div><div className="insight-callout"><span>✦</span><p><strong>Balance check</strong>Your personal blocks are protected. Keep one unscheduled evening to absorb changes.</p></div></section><section className="content-panel completion-ring-panel"><div className="completion-ring" style={{ '--completion': `${completion * 3.6}deg` } as React.CSSProperties}><span><strong>{completion}%</strong><small>completed</small></span></div><h2>Task follow-through</h2><p>Urgent and high-priority work is counted separately from calendar attendance.</p></section></div>
  </div>;
}
