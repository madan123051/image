import { useEffect, useMemo, useState } from 'react';
import type { CalendarDefinition, CalendarEvent } from '../types/domain';
import type { CopyKey } from '../i18n';

interface SharedPageProps {
  calendars: CalendarDefinition[];
  events: CalendarEvent[];
  labels: Record<CopyKey, string>;
  userId: string;
  onNewShared(): void;
  onManage(calendarId: string): void;
  onJoin(calendar: CalendarDefinition): void;
}

function getInviteLink(calendar: CalendarDefinition): string {
  const inviteCode = calendar.inviteCode || `invite_${calendar.id}`;
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('invite', inviteCode);
  url.searchParams.set('calendar', calendar.name);
  url.hash = '/shared';
  return url.toString();
}

export function SharedPage({ calendars, events, labels, userId, onNewShared, onManage, onJoin }: SharedPageProps) {
  const shared = calendars.filter((calendar) => !calendar.isPrivate);
  const [selectedId, setSelectedId] = useState(shared[0]?.id ?? '');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [notice, setNotice] = useState('');
  const [inviteHandled, setInviteHandled] = useState(false);
  const selected = shared.find((calendar) => calendar.id === selectedId) ?? shared[0];
  const inviteLink = useMemo(() => selected ? getInviteLink(selected) : '', [selected]);
  const incomingInvite = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    const name = params.get('calendar');
    return code && name ? { code, name } : null;
  }, []);
  const alreadyJoined = incomingInvite ? shared.some((calendar) => calendar.inviteCode === incomingInvite.code) : false;

  useEffect(() => {
    let active = true;
    if (!inviteLink) {
      setQrDataUrl('');
      return () => { active = false; };
    }
    void import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(inviteLink, {
        width: 420,
        margin: 2,
        color: { dark: '#123c30', light: '#fffdf7' },
        errorCorrectionLevel: 'M',
      })).then((value) => {
        if (active) setQrDataUrl(value);
      });
    return () => { active = false; };
  }, [inviteLink]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setNotice('Invite link copied');
    } catch {
      setNotice('Copy was blocked. Press and hold the link to copy it.');
    }
  };

  const shareLink = async () => {
    if (!selected) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${selected.name} · Aayoj`, text: `Join my ${selected.name} calendar on Aayoj.`, url: inviteLink });
        setNotice('Share sheet opened');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copyLink();
  };

  const downloadQr = () => {
    if (!qrDataUrl || !selected) return;
    const anchor = document.createElement('a');
    anchor.href = qrDataUrl;
    anchor.download = `${selected.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'aayoj'}-invite-qr.png`;
    anchor.click();
    setNotice('QR code downloaded');
  };

  const joinCalendar = () => {
    if (!incomingInvite || alreadyJoined) return;
    onJoin({
      id: `joined_${incomingInvite.code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)}`,
      userId,
      name: incomingInvite.name.slice(0, 120),
      color: '#cb725f',
      icon: '↗',
      visible: true,
      isPrivate: false,
      role: 'viewer',
      members: [],
      inviteCode: incomingInvite.code,
    });
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('invite');
    cleanUrl.searchParams.delete('calendar');
    window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}#/shared`);
    setInviteHandled(true);
    setNotice(`${incomingInvite.name} added to your calendars`);
  };

  return <div className="page simple-page shared-page">
    <header className="page-heading compact-heading">
      <div><p className="eyebrow">Share in one scan</p><h1>{labels.shared}</h1><p>Create a calendar, then invite anyone with a private link or QR code—no email list needed.</p></div>
      <button className="primary-button" type="button" onClick={onNewShared}>＋ New shared calendar</button>
    </header>

    {incomingInvite && !inviteHandled ? <section className="incoming-invite" aria-label="Calendar invitation">
      <span aria-hidden="true">↗</span><div><p className="eyebrow">Calendar invitation</p><h2>{incomingInvite.name}</h2><p>{alreadyJoined ? 'This calendar is already in your Aayoj workspace.' : 'You received a link to join this shared calendar.'}</p></div>
      {alreadyJoined ? <strong>✓ Joined</strong> : <button className="primary-button" type="button" onClick={joinCalendar}>Join calendar</button>}
    </section> : null}

    {selected ? <section className="content-panel share-hub" aria-label="Calendar invite link and QR code">
      <div className="share-hub-copy">
        <span className="share-symbol" aria-hidden="true">↗</span>
        <p className="eyebrow">Quick invite</p>
        <h2>Share {selected.name}</h2>
        <p>Send the link anywhere or let someone scan the QR code from your screen.</p>
        {shared.length > 1 ? <div className="share-calendar-tabs" aria-label="Choose calendar">{shared.map((calendar) => <button className={calendar.id === selected.id ? 'active' : ''} type="button" key={calendar.id} onClick={() => { setSelectedId(calendar.id); setNotice(''); }}><i style={{ background: calendar.color }} />{calendar.name}</button>)}</div> : null}
        <label className="share-link-field"><span>Invite link</span><div><input readOnly value={inviteLink} aria-label="Invite link" /><button type="button" onClick={() => void copyLink()}>Copy</button></div></label>
        <div className="share-actions"><button className="primary-button" type="button" onClick={() => void shareLink()}>↗ Share link</button><button className="secondary-button" type="button" onClick={downloadQr}>↓ Download QR</button></div>
        {notice ? <p className="share-notice" role="status">✓ {notice}</p> : null}
      </div>
      <div className="qr-card">
        {qrDataUrl ? <img src={qrDataUrl} alt={`QR code for the ${selected.name} calendar invite`} /> : <span className="qr-loading">Creating QR…</span>}
        <strong>Scan to join</strong><small>{selected.name} · Aayoj</small>
      </div>
    </section> : null}

    <div className="shared-grid">
      {shared.map((calendar) => {
        const upcoming = events.filter((event) => event.calendarId === calendar.id && new Date(event.endDateTime) >= new Date()).length;
        return <article className="content-panel shared-card" key={calendar.id}>
          <header><span style={{ background: calendar.color }}>{calendar.name.charAt(0)}</span><div><h2>{calendar.name}</h2><p>Private link enabled · you are {calendar.role}</p></div><button className="icon-button" type="button" onClick={() => onManage(calendar.id)} aria-label={`Manage ${calendar.name}`}>•••</button></header>
          <div className="shared-link-status"><span aria-hidden="true">↗</span><div><strong>Link & QR ready</strong><small>Anyone you send it to can open the invite.</small></div></div>
          <footer><span><i style={{ background: calendar.color }} />{upcoming} upcoming event{upcoming === 1 ? '' : 's'}</span><button className="secondary-button" type="button" onClick={() => { setSelectedId(calendar.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Share</button></footer>
        </article>;
      })}
      {!shared.length ? <article className="content-panel shared-card shared-empty-card"><span>↗</span><h2>No shared calendars yet</h2><p>Create one for family, a trip, a project, or any group schedule. Its invite link and QR code will be ready instantly.</p><button className="primary-button" type="button" onClick={onNewShared}>Create your first shared calendar</button></article> : null}
    </div>
  </div>;
}
