import type { CalendarDefinition } from '../types/domain';
import type { CopyKey } from '../i18n';

interface SharedPageProps { calendars: CalendarDefinition[]; labels: Record<CopyKey, string>; }

export function SharedPage({ calendars, labels }: SharedPageProps) {
  const shared = calendars.filter((calendar) => !calendar.isPrivate);
  return <div className="page simple-page">
    <header className="page-heading compact-heading"><div><p className="eyebrow">Coordinate safely</p><h1>{labels.shared}</h1><p>Share only the calendars you choose. Private event data stays isolated.</p></div><button className="primary-button" type="button">＋ New shared calendar</button></header>
    <div className="shared-grid">
      {shared.map((calendar) => <article className="content-panel shared-card" key={calendar.id}><header><span style={{ background: calendar.color }}>{calendar.name.charAt(0)}</span><div><h2>{calendar.name}</h2><p>Your role · {calendar.role}</p></div><button className="icon-button" type="button">•••</button></header><div className="member-stack"><i>M</i><i>A</i><i>S</i><b>＋</b></div><footer><span><i style={{ background: calendar.color }} />3 upcoming events</span><button className="secondary-button" type="button">Manage</button></footer></article>)}
      <article className="content-panel shared-card invite-card"><span>♧</span><h2>Invite family or teammates</h2><p>Owners control members. Editors can update shared events; viewers are read-only.</p><button className="secondary-button" type="button">Create invitation</button></article>
    </div>
  </div>;
}
