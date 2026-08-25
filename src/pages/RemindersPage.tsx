import type { Reminder } from '../types/domain';
import type { CopyKey } from '../i18n';

interface RemindersPageProps { reminders: Reminder[]; labels: Record<CopyKey, string>; onAdd(): void; }

export function RemindersPage({ reminders, labels, onAdd }: RemindersPageProps) {
  const upcoming = [...reminders].filter((item) => !item.completed).sort((a, b) => a.remindAt.localeCompare(b.remindAt));
  return <div className="page simple-page">
    <header className="page-heading compact-heading"><div><p className="eyebrow">Never miss what matters</p><h1>{labels.reminders}</h1><p>One notification pipeline for bills, medication, renewals and important dates.</p></div><button className="primary-button" type="button" onClick={onAdd}>＋ {labels.newReminder}</button></header>
    <section className="content-panel reminder-list">
      <header className="section-heading"><div><p className="eyebrow">Next up</p><h2>{upcoming.length} pending reminders</h2></div></header>
      {upcoming.map((reminder) => <article className="reminder-row" key={reminder.id}><span className={`reminder-icon ${reminder.kind}`}>{reminder.kind === 'bill' ? '＄' : reminder.kind === 'medication' ? '✚' : '◷'}</span><span><strong>{reminder.title}</strong><small>{new Date(reminder.remindAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></span><span className="channel-list">{reminder.channels.map((channel) => <b key={channel}>{channel}</b>)}</span><button className="icon-button" type="button" aria-label={`Options for ${reminder.title}`}>•••</button></article>)}
    </section>
  </div>;
}
