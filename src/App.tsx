import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { AppShell } from './components/AppShell';
import { AccountDialog } from './components/AccountDialog';
import { AIAssistant } from './components/AIAssistant';
import { CalendarDialog } from './components/CalendarDialog';
import { EventDialog } from './components/EventDialog';
import { QuickAddDialog } from './components/QuickAddDialog';
import { ReminderDialog } from './components/ReminderDialog';
import { RoutineDialog } from './components/RoutineDialog';
import { SearchResults } from './components/SearchResults';
import { TaskDialog } from './components/TaskDialog';
import { usePlannerStore } from './hooks/usePlannerStore';
import { getCopy } from './i18n';
import { CalendarPage } from './pages/CalendarPage';
import { InsightsPage } from './pages/InsightsPage';
import { PlannerPage } from './pages/PlannerPage';
import { RemindersPage } from './pages/RemindersPage';
import { SettingsPage } from './pages/SettingsPage';
import { SharedPage } from './pages/SharedPage';
import { TasksPage } from './pages/TasksPage';
import { TodayPage } from './pages/TodayPage';
import { searchAll } from './services/searchService';
import { applyAssistantActions } from './services/assistantActionService';
import type { AssistantAction } from './services/assistantSchema';
import type { AppSection, NotificationItem, SearchResult } from './types/domain';
import { toDateKey } from './utils/date';

const sections: AppSection[] = ['today', 'calendar', 'tasks', 'planner', 'reminders', 'shared', 'insights', 'settings'];

function sectionFromHash(): AppSection {
  const candidate = window.location.hash.replace('#/', '') as AppSection;
  return sections.includes(candidate) ? candidate : 'today';
}

function App() {
  const store = usePlannerStore();
  const labels = getCopy(store.language);
  const [section, setSection] = useState<AppSection>(sectionFromHash);
  const [anchor, setAnchor] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventDate, setEventDate] = useState(toDateKey(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [newCalendarShared, setNewCalendarShared] = useState(false);

  const user = store.data.users.find((item) => item.id === store.userId) ?? store.data.users[0];
  const preferences = store.data.preferences.find((item) => item.userId === store.userId) ?? store.data.preferences[0];
  if (!user || !preferences) throw new Error('Unable to initialize the current workspace.');

  const calendars = store.data.calendars.filter((calendar) => calendar.userId === store.userId);
  const events = store.data.events.filter((event) => event.userId === store.userId);
  const tasks = store.data.tasks.filter((task) => task.userId === store.userId);
  const reminders = store.data.reminders.filter((reminder) => reminder.userId === store.userId);
  const routines = store.data.routines.filter((routine) => routine.userId === store.userId);
  const notifications = store.data.notifications.filter((notification) => notification.userId === store.userId);
  const markNotificationDelivered = store.markNotificationDelivered;
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedReminder = reminders.find((reminder) => reminder.id === selectedReminderId) ?? null;
  const selectedRoutine = routines.find((routine) => routine.id === selectedRoutineId) ?? null;
  const selectedCalendar = calendars.find((calendar) => calendar.id === selectedCalendarId) ?? null;
  const results = useMemo(() => searchAll(store.data, store.userId, searchQuery), [store.data, store.userId, searchQuery]);

  useEffect(() => {
    const onHashChange = () => setSection(sectionFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (notificationPermission !== 'granted') return;
    const dispatchDueNotifications = () => {
      notifications
        .filter((item) => !item.deliveredAt && item.channels.includes('push') && new Date(item.scheduledAt) <= new Date())
        .forEach((item) => {
          new Notification(item.title, { body: item.message, icon: '/icons/wildsaura-icon.svg', tag: item.id });
          markNotificationDelivered(item.id);
        });
    };
    dispatchDueNotifications();
    const interval = window.setInterval(dispatchDueNotifications, 30_000);
    return () => window.clearInterval(interval);
  }, [markNotificationDelivered, notificationPermission, notifications]);

  useEffect(() => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective = store.theme === 'system' ? (systemDark ? 'dark' : 'light') : store.theme;
    document.documentElement.dataset.theme = effective;
    document.documentElement.lang = store.language === 'ne' ? 'ne' : 'en';
  }, [store.theme, store.language]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('.search-box input')?.focus();
      }
      if (event.key === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
        setQuickAddOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navigate = (next: AppSection) => {
    setSection(next);
    window.location.hash = `/${next}`;
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const newEvent = (dateKey = toDateKey(anchor)) => {
    setEventDate(dateKey);
    setSelectedEventId(null);
    setEventDialogOpen(true);
  };

  const editEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setEventDialogOpen(true);
  };

  const newTask = () => {
    setSelectedTaskId(null);
    setTaskDialogOpen(true);
  };

  const editTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskDialogOpen(true);
  };

  const newReminder = () => {
    setSelectedReminderId(null);
    setReminderDialogOpen(true);
  };

  const editReminder = (reminderId: string) => {
    setSelectedReminderId(reminderId);
    setReminderDialogOpen(true);
  };

  const newRoutine = () => {
    setSelectedRoutineId(null);
    setRoutineDialogOpen(true);
  };

  const editRoutine = (routineId: string) => {
    setSelectedRoutineId(routineId);
    setRoutineDialogOpen(true);
  };

  const newCalendar = (shared = false) => {
    setSelectedCalendarId(null);
    setNewCalendarShared(shared);
    setCalendarDialogOpen(true);
  };

  const manageCalendar = (calendarId: string) => {
    setSelectedCalendarId(calendarId);
    setNewCalendarShared(false);
    setCalendarDialogOpen(true);
  };

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    setNotificationPermission(await Notification.requestPermission());
  };

  const selectSearchResult = (result: SearchResult) => {
    setSearchQuery('');
    navigate(result.section);
    if (result.type === 'event') editEvent(result.id);
    if (result.type === 'task') editTask(result.id);
  };

  const openNotification = (notification: NotificationItem) => {
    if (notification.type === 'shared') {
      navigate('shared');
      return;
    }
    if (events.some((event) => event.id === notification.sourceId)) {
      navigate('calendar');
      editEvent(notification.sourceId);
      return;
    }
    if (tasks.some((task) => task.id === notification.sourceId)) {
      navigate('tasks');
      editTask(notification.sourceId);
      return;
    }
    if (reminders.some((reminder) => reminder.id === notification.sourceId)) {
      navigate('reminders');
      editReminder(notification.sourceId);
      return;
    }
    navigate('reminders');
  };

  const applyAIChanges = (actions: AssistantAction[]) => applyAssistantActions(actions, {
    data: store.data,
    userId: store.userId,
    saveEvent: store.saveEvent,
    deleteEvent: store.deleteEvent,
    saveTask: store.saveTask,
    deleteTask: store.deleteTask,
    saveReminder: store.saveReminder,
    deleteReminder: store.deleteReminder,
    saveRoutine: store.saveRoutine,
    deleteRoutine: store.deleteRoutine,
  });

  const page = (() => {
    if (section === 'today') return <TodayPage data={store.data} userId={store.userId} language={store.language} labels={labels} onOpenCalendar={() => navigate('calendar')} onOpenTasks={() => navigate('tasks')} onEditEvent={editEvent} onToggleTask={store.toggleTask} />;
    if (section === 'calendar') return <CalendarPage events={events} calendars={calendars} preferences={preferences} language={store.language} labels={labels} anchor={anchor} onAnchorChange={setAnchor} onNewEvent={newEvent} onEditEvent={editEvent} onSaveEvent={store.saveEvent} onAddCalendar={() => newCalendar(false)} />;
    if (section === 'tasks') return <TasksPage tasks={tasks} events={events} routines={routines} preferences={preferences} labels={labels} onNewTask={newTask} onEditTask={editTask} onToggleTask={store.toggleTask} onSaveTask={store.saveTask} />;
    if (section === 'planner') return <PlannerPage data={store.data} userId={store.userId} labels={labels} onApply={applyAIChanges} />;
    if (section === 'reminders') return <RemindersPage reminders={reminders} routines={routines} labels={labels} onAddReminder={newReminder} onEditReminder={editReminder} onCompleteReminder={store.completeReminder} onSnoozeReminder={store.snoozeReminder} onAddRoutine={newRoutine} onEditRoutine={editRoutine} onToggleRoutine={store.toggleRoutine} />;
    if (section === 'shared') return <SharedPage calendars={calendars} events={events} labels={labels} onNewShared={() => newCalendar(true)} onManage={manageCalendar} />;
    if (section === 'insights') return <InsightsPage events={events} tasks={tasks} routines={routines} calendars={calendars} labels={labels} />;
    return <SettingsPage preferences={preferences} labels={labels} sync={store.sync} persistentCache={store.persistentCache} notificationPermission={notificationPermission} user={user} isAnonymous={store.isAnonymous} sharedCalendarCount={calendars.filter((calendar) => !calendar.isPrivate).length} onLanguage={store.setLanguage} onTheme={store.setTheme} onPreferences={store.savePreferences} onEnableNotifications={enableNotifications} onOpenAccount={() => setAccountDialogOpen(true)} />;
  })();

  return <>
    <AppShell activeSection={section} language={store.language} labels={labels} notifications={notifications} userName={user.displayName} avatarUrl={user.avatarUrl} isAnonymous={store.isAnonymous} searchQuery={searchQuery} onNavigate={navigate} onAdd={() => setQuickAddOpen(true)} onSearch={setSearchQuery} onToggleLanguage={() => store.setLanguage(store.language === 'en' ? 'ne' : 'en')} onMarkNotificationRead={store.markNotificationRead} onMarkAllNotificationsRead={store.markAllNotificationsRead} onOpenNotification={openNotification} onOpenAccount={() => setAccountDialogOpen(true)}>
      {page}
      <SearchResults query={searchQuery} results={results} onSelect={selectSearchResult} onClose={() => setSearchQuery('')} />
    </AppShell>
    <EventDialog open={eventDialogOpen} event={selectedEvent} defaultDate={eventDate} userId={store.userId} timezone={preferences.timezone} calendars={calendars} events={events} language={store.language} labels={labels} onClose={() => setEventDialogOpen(false)} onSave={store.saveEvent} onDelete={store.deleteEvent} />
    <TaskDialog open={taskDialogOpen} task={selectedTask} userId={store.userId} labels={labels} onClose={() => setTaskDialogOpen(false)} onSave={store.saveTask} />
    <QuickAddDialog open={quickAddOpen} userId={store.userId} labels={labels} events={events} tasks={tasks} routines={routines} preferences={preferences} calendars={calendars} onClose={() => setQuickAddOpen(false)} onOpenEvent={() => newEvent()} onOpenTask={newTask} onOpenReminders={newReminder} onOpenRoutines={newRoutine} onSaveEvent={store.saveEvent} />
    <ReminderDialog open={reminderDialogOpen} reminder={selectedReminder} userId={store.userId} timezone={preferences.timezone} onClose={() => setReminderDialogOpen(false)} onSave={store.saveReminder} onDelete={store.deleteReminder} />
    <RoutineDialog open={routineDialogOpen} routine={selectedRoutine} userId={store.userId} onClose={() => setRoutineDialogOpen(false)} onSave={store.saveRoutine} onDelete={store.deleteRoutine} />
    <CalendarDialog open={calendarDialogOpen} calendar={selectedCalendar} defaultShared={newCalendarShared} userId={store.userId} eventCount={selectedCalendar ? events.filter((event) => event.calendarId === selectedCalendar.id).length : 0} onClose={() => setCalendarDialogOpen(false)} onSave={store.saveCalendar} onDelete={store.deleteCalendar} />
    <AccountDialog open={accountDialogOpen} user={user} isAnonymous={store.isAnonymous} data={store.data} onClose={() => setAccountDialogOpen(false)} />
    <AIAssistant data={store.data} userId={store.userId} language={store.language} onApply={applyAIChanges} onOpenPlanner={() => navigate('planner')} />
  </>;
}

export default App;
