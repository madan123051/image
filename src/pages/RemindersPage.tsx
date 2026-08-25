import type { Reminder, Routine } from '../types/domain';
import type { CopyKey } from '../i18n';

interface RemindersPageProps {
  reminders: Reminder[];
  routines: Routine[];
  labels: Record<CopyKey, string>;
  onAddReminder(): void;
  onEditReminder(reminderId: string): void;
  onCompleteReminder(reminderId: string): void;
  onSnoozeReminder(reminderId: string): void;
  onAddRoutine(): void;
  onEditRoutine(routineId: string): void;
  onToggleRoutine(routineId: string): void;
}

const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function RemindersPage({
  reminders,
  routines,
  labels,
  onAddReminder,
  onEditReminder,
  onCompleteReminder,
  onSnoozeReminder,
  onAddRoutine,
  onEditRoutine,
  onToggleRoutine,
}: RemindersPageProps) {
  const upcoming = [...reminders]
    .filter((item) => !item.completed)
    .sort((left, right) => (left.snoozedUntil ?? left.remindAt).localeCompare(right.snoozedUntil ?? right.remindAt));

  return <div className="page simple-page reminders-page">
    <header className="page-heading compact-heading"><div><p className="eyebrow">Never miss what matters</p><h1>{labels.reminders} & routines</h1><p>Everything here is durable, user-scoped and available offline.</p></div><div className="heading-actions"><button className="secondary-button" type="button" onClick={onAddRoutine}>↻ New routine</button><button className="primary-button" type="button" onClick={onAddReminder}>＋ {labels.newReminder}</button></div></header>

    <div className="reminder-workspace">
      <section className="content-panel reminder-list">
        <header className="section-heading"><div><p className="eyebrow">Next up</p><h2>{upcoming.length} pending reminders</h2></div></header>
        {upcoming.length ? upcoming.map((reminder) => {
          const effectiveTime = reminder.snoozedUntil ?? reminder.remindAt;
          return <article className={`reminder-row ${reminder.important ? 'important' : ''}`} key={reminder.id}>
            <span className={`reminder-icon ${reminder.kind}`}>{reminder.kind === 'bill' ? '＄' : reminder.kind === 'medication' ? '✚' : '◷'}</span>
            <button className="reminder-main" type="button" onClick={() => onEditReminder(reminder.id)}><strong>{reminder.title}</strong><small>{new Date(effectiveTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}{reminder.snoozedUntil ? ' · snoozed' : ''}</small></button>
            <span className="channel-list">{reminder.channels.map((channel) => <b key={channel}>{channel === 'push' ? 'browser' : channel}</b>)}</span>
            <div className="row-actions"><button className="icon-button" type="button" aria-label={`Snooze ${reminder.title}`} onClick={() => onSnoozeReminder(reminder.id)}>＋10</button><button className="icon-button complete-action" type="button" aria-label={`Complete ${reminder.title}`} onClick={() => onCompleteReminder(reminder.id)}>✓</button></div>
          </article>;
        }) : <div className="empty-state"><span>✓</span><h3>All clear</h3><p>Add a reminder for something important.</p></div>}
      </section>

      <section className="content-panel routine-panel">
        <header className="section-heading"><div><p className="eyebrow">Protected rhythms</p><h2>{routines.filter((routine) => routine.active).length} active routines</h2></div><button className="text-button" type="button" onClick={onAddRoutine}>Add routine →</button></header>
        <div className="routine-list">{routines.length ? routines.map((routine) => <article className={routine.active ? 'routine-row' : 'routine-row inactive'} key={routine.id}>
          <button className="routine-main" type="button" onClick={() => onEditRoutine(routine.id)}><i style={{ background: routine.color }} /><span><strong>{routine.title}</strong><small>{routine.startTime} · {routine.durationMinutes} min · {routine.flexibility}</small><em>{routine.days.map((day) => dayNames[day]).join(' · ')}</em></span></button>
          <label className="switch-control"><input type="checkbox" checked={routine.active} onChange={() => onToggleRoutine(routine.id)} /><span /><small>{routine.active ? 'On' : 'Off'}</small></label>
        </article>) : <div className="empty-state"><span>↻</span><p>Create a routine to protect recurring time.</p></div>}</div>
      </section>
    </div>
  </div>;
}
