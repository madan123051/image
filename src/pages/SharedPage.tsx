import type { CalendarDefinition, CalendarEvent } from '../types/domain';
import type { CopyKey } from '../i18n';

interface SharedPageProps {
  calendars: CalendarDefinition[];
  events: CalendarEvent[];
  labels: Record<CopyKey, string>;
  onNewShared(): void;
  onManage(calendarId: string): void;
}

export function SharedPage({ calendars, events, labels, onNewShared, onManage }: SharedPageProps) {
  const shared = calendars.filter((calendar) => !calendar.isPrivate);
  return <div className="page simple-page">
    <header className="page-heading compact-heading"><div><p className="eyebrow">Coordinate safely</p><h1>{labels.shared}</h1><p>Create focused calendars, invite people by email, and control who can edit.</p></div><button className="primary-button" type="button" onClick={onNewShared}>＋ New shared calendar</button></header>
    <div className="shared-grid">
      {shared.map((calendar) => {
        const members = calendar.members ?? [];
        const upcoming = events.filter((event) => event.calendarId === calendar.id && new Date(event.endDateTime) >= new Date()).length;
        return <article className="content-panel shared-card" key={calendar.id}>
          <header><span style={{ background: calendar.color }}>{calendar.name.charAt(0)}</span><div><h2>{calendar.name}</h2><p>{members.length} member{members.length === 1 ? '' : 's'} · you are {calendar.role}</p></div><button className="icon-button" type="button" onClick={() => onManage(calendar.id)} aria-label={`Manage ${calendar.name}`}>•••</button></header>
          <div className="member-stack">{members.slice(0, 4).map((member) => <i key={member.id} title={`${member.email} · ${member.role}`}>{member.name.charAt(0).toUpperCase()}</i>)}<button type="button" onClick={() => onManage(calendar.id)} aria-label="Add member">＋</button></div>
          <footer><span><i style={{ background: calendar.color }} />{upcoming} upcoming event{upcoming === 1 ? '' : 's'}</span><button className="secondary-button" type="button" onClick={() => onManage(calendar.id)}>Manage</button></footer>
        </article>;
      })}
      {!shared.length ? <article className="content-panel shared-card shared-empty-card"><span>♧</span><h2>No shared calendars yet</h2><p>Create one for family, a trip, a project, or any group schedule.</p><button className="primary-button" type="button" onClick={onNewShared}>Create your first shared calendar</button></article> : null}
      <article className="content-panel shared-card invite-card"><span>✉</span><h2>Invite family or teammates</h2><p>Add member emails and choose editor or viewer access. Aayoj keeps the invitation details with the calendar.</p><button className="secondary-button" type="button" onClick={onNewShared}>Create invitation</button></article>
    </div>
  </div>;
}
