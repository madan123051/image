import { useState, type ReactNode } from 'react';
import type { AppSection, Language, NotificationItem } from '../types/domain';
import type { CopyKey } from '../i18n';
import { BrandMark } from './BrandMark';
import { NotificationCenter } from './NotificationCenter';

const navigation: Array<{ id: AppSection; label: CopyKey; icon: string }> = [
  { id: 'today', label: 'today', icon: '⌂' },
  { id: 'calendar', label: 'calendar', icon: '▦' },
  { id: 'tasks', label: 'tasks', icon: '✓' },
  { id: 'planner', label: 'planner', icon: '✦' },
  { id: 'reminders', label: 'reminders', icon: '◷' },
  { id: 'shared', label: 'shared', icon: '♧' },
  { id: 'insights', label: 'insights', icon: '⌁' },
  { id: 'settings', label: 'settings', icon: '⚙' },
];

interface AppShellProps {
  activeSection: AppSection;
  language: Language;
  labels: Record<CopyKey, string>;
  notifications: NotificationItem[];
  userName: string;
  avatarUrl?: string;
  isAnonymous: boolean;
  searchQuery: string;
  onNavigate(section: AppSection): void;
  onAdd(): void;
  onSearch(query: string): void;
  onToggleLanguage(): void;
  onMarkNotificationRead(notificationId: string): void;
  onMarkAllNotificationsRead(): void;
  onOpenNotification(notification: NotificationItem): void;
  onOpenAccount(): void;
  children: ReactNode;
}

export function AppShell({
  activeSection,
  language,
  labels,
  notifications,
  userName,
  avatarUrl,
  isAnonymous,
  searchQuery,
  onNavigate,
  onAdd,
  onSearch,
  onToggleLanguage,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenNotification,
  onOpenAccount,
  children,
}: AppShellProps) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const mobileItems = navigation.slice(0, 4);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <BrandMark />
          <span>
            <strong>Aayoj</strong>
            <small>Designed by Wildsaura</small>
          </span>
        </div>
        <button className="add-button sidebar-add" type="button" onClick={onAdd}>
          <span aria-hidden="true">＋</span> {labels.add}
        </button>
        <nav className="side-navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              className={item.id === activeSection ? 'nav-item active' : 'nav-item'}
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {labels[item.label]}
            </button>
          ))}
        </nav>
      </aside>

      <div className="app-stage">
        <header className="topbar">
          <button className="mobile-brand" type="button" onClick={() => onNavigate('today')} aria-label="Open Today">
            <BrandMark />
            <span className="mobile-brand-copy"><strong>Aayoj</strong><small>Designed by Wildsaura</small></span>
          </button>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Global search"
              value={searchQuery}
              placeholder={labels.search}
              onChange={(event) => onSearch(event.target.value)}
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="top-actions">
            <button className="language-button" type="button" onClick={onToggleLanguage} aria-label={language === 'en' ? 'Switch to Nepali Bikram Sambat' : 'Switch to English Gregorian'}>
              <span>{language === 'en' ? 'EN' : 'ने'}</span><small>{language === 'en' ? 'AD' : 'बि.सं.'}</small>
            </button>
            <NotificationCenter notifications={notifications} onMarkRead={onMarkNotificationRead} onMarkAllRead={onMarkAllNotificationsRead} onOpen={onOpenNotification} />
            <button className="profile-button" type="button" onClick={onOpenAccount} aria-label={`Open ${userName} profile`}>
              <span className="avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : userName.charAt(0).toUpperCase()}</span>
              <span><strong>{userName}</strong><small>{isAnonymous ? 'Guest' : 'Account'}</small></span>
            </button>
          </div>
        </header>
        <main className="page-stage">{children}</main>
      </div>

      <button className="mobile-add" type="button" onClick={onAdd} aria-label={labels.add}>＋</button>
      <nav className="bottom-navigation" aria-label="Mobile navigation">
        {mobileItems.map((item) => (
          <button
            className={item.id === activeSection ? 'bottom-nav-item active' : 'bottom-nav-item'}
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            <small>{labels[item.label]}</small>
          </button>
        ))}
        <button
          className={['reminders', 'shared', 'insights', 'settings'].includes(activeSection) ? 'bottom-nav-item active' : 'bottom-nav-item'}
          type="button"
          onClick={() => setMobileMoreOpen((current) => !current)}
          aria-expanded={mobileMoreOpen}
        >
          <span aria-hidden="true">•••</span><small>More</small>
        </button>
      </nav>
      {mobileMoreOpen ? <div className="mobile-more-menu" role="menu">{navigation.slice(4).map((item) => <button type="button" role="menuitem" key={item.id} onClick={() => { onNavigate(item.id); setMobileMoreOpen(false); }}><span>{item.icon}</span>{labels[item.label]}</button>)}</div> : null}
    </div>
  );
}
