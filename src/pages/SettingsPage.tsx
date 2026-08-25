import type { Language, PlannerSyncState, ThemePreference, UserPreferences } from '../types/domain';
import type { CopyKey } from '../i18n';

interface SettingsPageProps {
  preferences: UserPreferences;
  labels: Record<CopyKey, string>;
  sync: PlannerSyncState;
  persistentCache: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  onLanguage(language: Language): void;
  onTheme(theme: ThemePreference): void;
  onPreferences(preferences: UserPreferences): void;
  onEnableNotifications(): void;
}

const timezones = ['Asia/Tokyo', 'Asia/Kathmandu', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];

export function SettingsPage({
  preferences,
  labels,
  sync,
  persistentCache,
  notificationPermission,
  onLanguage,
  onTheme,
  onPreferences,
  onEnableNotifications,
}: SettingsPageProps) {
  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    onPreferences({ ...preferences, [key]: value });
  };

  return <div className="page simple-page settings-page">
    <header className="page-heading compact-heading"><div><p className="eyebrow">Make it yours</p><h1>{labels.settings}</h1><p>Locale, planning boundaries, notifications and Firebase sync.</p></div></header>
    <div className="settings-layout"><nav className="settings-nav"><button className="active" type="button">General</button><button type="button">Planning</button><button type="button">Notifications</button><button type="button">Connections</button></nav><section className="content-panel settings-panel">
      <div className="setting-group"><header><h2>General</h2><p>Language selection also changes the calendar system.</p></header>
        <label className="setting-row"><span><strong>{labels.language}</strong><small>English uses Gregorian (AD); Nepali uses Bikram Sambat (BS).</small></span><select value={preferences.language} onChange={(event) => onLanguage(event.target.value as Language)}><option value="en">English · Gregorian</option><option value="ne">नेपाली · विक्रम संवत्</option></select></label>
        <label className="setting-row"><span><strong>Time zone</strong><small>Used for reminders, routines and conflict checks.</small></span><select value={preferences.timezone} onChange={(event) => update('timezone', event.target.value)}>{!timezones.includes(preferences.timezone) && <option value={preferences.timezone}>{preferences.timezone}</option>}{timezones.map((timezone) => <option value={timezone} key={timezone}>{timezone}</option>)}</select></label>
        <label className="setting-row"><span><strong>{labels.theme}</strong><small>Choose light, dark or follow your device.</small></span><select value={preferences.theme} onChange={(event) => onTheme(event.target.value as ThemePreference)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>
      </div>

      <div className="setting-group"><header><h2>Planning boundaries</h2><p>The free-time finder now protects scheduled tasks and fixed routines.</p></header>
        <div className="setting-row"><span><strong>Work hours</strong><small>{preferences.workingDays.length} working days</small></span><span className="inline-fields"><input aria-label="Work day start" type="time" value={preferences.workDayStart} onChange={(event) => update('workDayStart', event.target.value)} /><input aria-label="Work day end" type="time" value={preferences.workDayEnd} onChange={(event) => update('workDayEnd', event.target.value)} /></span></div>
        <div className="setting-row"><span><strong>Sleep hours</strong><small>Protected by default</small></span><span className="inline-fields"><input aria-label="Sleep start" type="time" value={preferences.sleepStart} onChange={(event) => update('sleepStart', event.target.value)} /><input aria-label="Sleep end" type="time" value={preferences.sleepEnd} onChange={(event) => update('sleepEnd', event.target.value)} /></span></div>
        <label className="setting-row"><span><strong>Default task duration</strong><small>Used by scheduling suggestions.</small></span><select value={preferences.defaultTaskMinutes} onChange={(event) => update('defaultTaskMinutes', Number(event.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option></select></label>
      </div>

      <div className="setting-group"><header><h2>Notifications & offline</h2><p>In-app notifications are durable. Browser alerts work while the app is available.</p></header>
        <div className="setting-row"><span><strong>Browser alerts</strong><small>{notificationPermission === 'granted' ? 'Enabled for this browser' : notificationPermission === 'denied' ? 'Blocked in browser settings' : notificationPermission === 'unsupported' ? 'Not supported by this browser' : 'Permission has not been requested'}</small></span><button className="secondary-button" type="button" disabled={notificationPermission === 'granted' || notificationPermission === 'unsupported'} onClick={onEnableNotifications}>{notificationPermission === 'granted' ? 'Enabled' : 'Enable alerts'}</button></div>
        <div className="setting-row"><span><strong>Offline changes</strong><small>{persistentCache ? 'Browser storage queues changes until reconnect.' : 'Memory-only cache is active in this browser.'}</small></span><b>{persistentCache ? 'Ready' : 'Limited'}</b></div>
      </div>

      <div className="setting-group"><header><h2>Connections</h2><p>Your planner data is isolated by the signed-in Firebase user ID.</p></header>
        <div className="provider-row"><span className="provider-logo">F</span><span><strong>Firebase</strong><small>{sync.message}</small></span><b className={`connection-state ${sync.mode}`}>{sync.mode}</b></div>
        <div className="provider-row"><span className="provider-logo">G</span><span><strong>Google Calendar</strong><small>Two-way calendar sync remains a Phase 5 integration.</small></span><b>Not connected</b></div>
      </div>
    </section></div>
  </div>;
}
