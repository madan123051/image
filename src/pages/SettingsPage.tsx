import { useState } from 'react';
import type { Language, PlannerSyncState, ThemePreference, User, UserPreferences } from '../types/domain';
import type { CopyKey } from '../i18n';

type SettingsTab = 'general' | 'planning' | 'notifications' | 'shared';

interface SettingsPageProps {
  preferences: UserPreferences;
  labels: Record<CopyKey, string>;
  sync: PlannerSyncState;
  persistentCache: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  user: User;
  isAnonymous: boolean;
  sharedCalendarCount: number;
  onLanguage(language: Language): void;
  onTheme(theme: ThemePreference): void;
  onPreferences(preferences: UserPreferences): void;
  onEnableNotifications(): void;
  onOpenAccount(): void;
}

const timezones = ['Asia/Tokyo', 'Asia/Kathmandu', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];
const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function SettingsPage({ preferences, labels, sync, persistentCache, notificationPermission, user, isAnonymous, sharedCalendarCount, onLanguage, onTheme, onPreferences, onEnableNotifications, onOpenAccount }: SettingsPageProps) {
  const [tab, setTab] = useState<SettingsTab>('general');
  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => onPreferences({ ...preferences, [key]: value });
  const toggleWorkingDay = (day: number) => {
    const workingDays = preferences.workingDays.includes(day)
      ? preferences.workingDays.filter((item) => item !== day)
      : [...preferences.workingDays, day].sort();
    if (workingDays.length) update('workingDays', workingDays);
  };

  return <div className="page simple-page settings-page">
    <header className="page-heading compact-heading"><div><p className="eyebrow">Make it yours</p><h1>{labels.settings}</h1><p>Every control below saves to your private cloud workspace.</p></div></header>
    <div className="settings-layout"><nav className="settings-nav" aria-label="Settings sections">
      {(['general', 'planning', 'notifications', 'shared'] as SettingsTab[]).map((item) => <button className={tab === item ? 'active' : ''} type="button" key={item} onClick={() => setTab(item)}>{item === 'shared' ? 'Shared & account' : `${item.charAt(0).toUpperCase()}${item.slice(1)}`}</button>)}
    </nav><section className="content-panel settings-panel">
      {tab === 'general' ? <div className="setting-group"><header><h2>General</h2><p>Language selection also changes the calendar system.</p></header>
        <label className="setting-row"><span><strong>{labels.language}</strong><small>English uses Gregorian (AD); Nepali uses Bikram Sambat (BS).</small></span><select value={preferences.language} onChange={(event) => onLanguage(event.target.value as Language)}><option value="en">English · Gregorian</option><option value="ne">नेपाली · विक्रम संवत्</option></select></label>
        <label className="setting-row"><span><strong>Time zone</strong><small>Used for reminders, routines and conflict checks.</small></span><select value={preferences.timezone} onChange={(event) => update('timezone', event.target.value)}>{!timezones.includes(preferences.timezone) ? <option value={preferences.timezone}>{preferences.timezone}</option> : null}{timezones.map((timezone) => <option value={timezone} key={timezone}>{timezone}</option>)}</select></label>
        <label className="setting-row"><span><strong>{labels.theme}</strong><small>Choose light, dark or follow your device.</small></span><select value={preferences.theme} onChange={(event) => onTheme(event.target.value as ThemePreference)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>
        <label className="setting-row"><span><strong>Date format</strong><small>Controls dates shown in planner details.</small></span><select value={preferences.dateFormat} onChange={(event) => update('dateFormat', event.target.value as UserPreferences['dateFormat'])}><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></select></label>
        <label className="setting-row"><span><strong>Time format</strong><small>Use a 12-hour or 24-hour clock.</small></span><select value={preferences.timeFormat} onChange={(event) => update('timeFormat', event.target.value as UserPreferences['timeFormat'])}><option value="12h">12 hour</option><option value="24h">24 hour</option></select></label>
      </div> : null}

      {tab === 'planning' ? <div className="setting-group"><header><h2>Planning boundaries</h2><p>Free-time suggestions protect these limits, scheduled tasks, and fixed routines.</p></header>
        <div className="setting-row"><span><strong>Working days</strong><small>Choose at least one day.</small></span><span className="working-day-picker">{dayLabels.map((label, day) => <button className={preferences.workingDays.includes(day) ? 'active' : ''} type="button" key={`${label}-${day}`} onClick={() => toggleWorkingDay(day)}>{label}</button>)}</span></div>
        <div className="setting-row"><span><strong>Work hours</strong><small>{preferences.workingDays.length} working days</small></span><span className="inline-fields"><input aria-label="Work day start" type="time" value={preferences.workDayStart} onChange={(event) => update('workDayStart', event.target.value)} /><input aria-label="Work day end" type="time" value={preferences.workDayEnd} onChange={(event) => update('workDayEnd', event.target.value)} /></span></div>
        <div className="setting-row"><span><strong>Sleep hours</strong><small>Protected by default</small></span><span className="inline-fields"><input aria-label="Sleep start" type="time" value={preferences.sleepStart} onChange={(event) => update('sleepStart', event.target.value)} /><input aria-label="Sleep end" type="time" value={preferences.sleepEnd} onChange={(event) => update('sleepEnd', event.target.value)} /></span></div>
        <label className="setting-row"><span><strong>Default event duration</strong><small>Used by new events and AI proposals.</small></span><select value={preferences.defaultEventMinutes} onChange={(event) => update('defaultEventMinutes', Number(event.target.value))}>{[15,30,45,60,90,120].map((minutes) => <option value={minutes} key={minutes}>{minutes} minutes</option>)}</select></label>
        <label className="setting-row"><span><strong>Default task duration</strong><small>Used by scheduling suggestions.</small></span><select value={preferences.defaultTaskMinutes} onChange={(event) => update('defaultTaskMinutes', Number(event.target.value))}>{[15,30,45,60,90,120].map((minutes) => <option value={minutes} key={minutes}>{minutes} minutes</option>)}</select></label>
      </div> : null}

      {tab === 'notifications' ? <div className="setting-group"><header><h2>Notifications & offline</h2><p>In-app notifications are durable. Browser alerts fire when Aayoj is available.</p></header>
        <div className="setting-row"><span><strong>Browser alerts</strong><small>{notificationPermission === 'granted' ? 'Enabled for this browser' : notificationPermission === 'denied' ? 'Blocked in browser settings' : notificationPermission === 'unsupported' ? 'Not supported by this browser' : 'Permission has not been requested'}</small></span><button className="secondary-button" type="button" disabled={notificationPermission === 'granted' || notificationPermission === 'unsupported'} onClick={onEnableNotifications}>{notificationPermission === 'granted' ? 'Enabled' : 'Enable alerts'}</button></div>
        <div className="setting-row"><span><strong>Offline changes</strong><small>{persistentCache ? 'Browser storage queues changes until reconnect.' : 'Memory-only cache is active in this browser.'}</small></span><b>{persistentCache ? 'Ready' : 'Limited'}</b></div>
        <div className="provider-row"><span className="provider-logo">F</span><span><strong>Firebase sync</strong><small>{sync.message}</small></span><b className={`connection-state ${sync.mode}`}>{sync.mode === 'demo' ? 'local' : sync.mode}</b></div>
      </div> : null}

      {tab === 'shared' ? <div className="setting-group"><header><h2>Shared & account</h2><p>Manage the identity and collaboration layer behind your planner.</p></header>
        <div className="account-setting-card"><span className="account-avatar small">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.displayName.charAt(0).toUpperCase()}</span><span><strong>{user.displayName}</strong><small>{user.email || 'Guest workspace · add an email to secure it'}</small></span><button className="primary-button" type="button" onClick={onOpenAccount}>{isAnonymous ? 'Secure account' : 'Manage profile'}</button></div>
        <div className="setting-row"><span><strong>Shared calendars</strong><small>Member emails, invitations, and roles persist in Firebase.</small></span><b>{sharedCalendarCount}</b></div>
        <div className="setting-row"><span><strong>Data ownership</strong><small>Planner writes are checked against your authenticated Firebase user ID.</small></span><b>Private</b></div>
      </div> : null}
    </section></div>
  </div>;
}
