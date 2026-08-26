import { useEffect, useMemo, useState } from 'react';
import type { NotificationItem } from '../types/domain';

interface NotificationCenterProps {
  notifications: NotificationItem[];
  onMarkRead(notificationId: string): void;
  onMarkAllRead(): void;
  onOpen(notification: NotificationItem): void;
}

export function NotificationCenter({ notifications, onMarkRead, onMarkAllRead, onOpen }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const due = useMemo(
    () => [...notifications]
      .filter((item) => new Date(item.scheduledAt).getTime() <= now)
      .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt))
      .slice(0, 10),
    [notifications, now],
  );
  const unread = due.filter((item) => !item.read).length;

  return <div className="notification-center">
    <button
      className={`icon-button notification-button ${open ? 'active' : ''}`}
      type="button"
      aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
    >
      <svg className="notification-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
        <path d="M10 21h4" />
      </svg>
      {unread > 0 && <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="notification-popover" aria-label="Notification center">
      <header><span><strong>Notifications</strong><small>Saved and synced across this workspace</small></span>{unread > 0 && <button type="button" onClick={onMarkAllRead}>Mark all read</button>}</header>
      <div className="notification-list">
        {due.length ? due.map((notification) => <button
          className={notification.read ? 'notification-row' : 'notification-row unread'}
          type="button"
          key={notification.id}
          onClick={() => { onMarkRead(notification.id); onOpen(notification); setOpen(false); }}
        >
          <i />
          <span><strong>{notification.title}</strong><small>{notification.message}</small><time>{new Date(notification.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></span>
        </button>) : <div className="notification-empty"><span>✓</span><p>You are all caught up.</p></div>}
      </div>
    </section>}
  </div>;
}
