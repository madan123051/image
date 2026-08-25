import type { ReactNode } from 'react';
import type { AppSection, Language } from '../types/domain';
import type { CopyKey } from '../i18n';

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
  searchQuery: string;
  onNavigate(section: AppSection): void;
  onAdd(): void;
  onSearch(query: string): void;
  onToggleLanguage(): void;
  children: ReactNode;
}

export function AppShell({
  activeSection,
  language,
  labels,
  searchQuery,
  onNavigate,
  onAdd,
  onSearch,
  onToggleLanguage,
  children,
}: AppShellProps) {
  const mobileItems = navigation.slice(0, 4);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span>
            <strong>Wildsaura</strong>
            <small>Life planner</small>
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
        <div className="sidebar-foot">
          <div className="storage-note">
            <span className="status-dot" />
            <span><strong>Demo workspace</strong><small>Provider-ready architecture</small></span>
          </div>
        </div>
      </aside>

      <div className="app-stage">
        <header className="topbar">
          <button className="mobile-brand" type="button" onClick={() => onNavigate('today')} aria-label="Open Today">
            <span className="brand-mark">W</span><strong>Wildsaura</strong>
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
            <button className="language-button" type="button" onClick={onToggleLanguage}>
              {language === 'en' ? 'EN · AD' : 'ने · बि.सं.'}
            </button>
            <button className="icon-button notification-button" type="button" aria-label="Notifications">
              ♧<span className="notification-badge">2</span>
            </button>
            <span className="avatar" aria-label="Madan profile">M</span>
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
          onClick={() => onNavigate('settings')}
        >
          <span aria-hidden="true">•••</span><small>More</small>
        </button>
      </nav>
    </div>
  );
}
