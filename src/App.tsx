import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { AppShell } from './components/AppShell';
import { AIAssistant } from './components/AIAssistant';
import { EventDialog } from './components/EventDialog';
import { QuickAddDialog } from './components/QuickAddDialog';
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
import type { AppSection, SearchResult } from './types/domain';
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

  const user = store.data.users.find((item) => item.id === store.userId);
  const preferences = store.data.preferences.find((item) => item.userId === store.userId);
  if (!user || !preferences) throw new Error('Unable to initialize the current workspace.');

  const calendars = store.data.calendars.filter((calendar) => calendar.userId === store.userId);
  const events = store.data.events.filter((event) => event.userId === store.userId);
  const tasks = store.data.tasks.filter((task) => task.userId === store.userId);
  const reminders = store.data.reminders.filter((reminder) => reminder.userId === store.userId);
  const routines = store.data.routines.filter((routine) => routine.userId === store.userId);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const results = useMemo(() => searchAll(store.data, store.userId, searchQuery), [store.data, store.userId, searchQuery]);

  useEffect(() => {
    const onHashChange = () => setSection(sectionFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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

  const selectSearchResult = (result: SearchResult) => {
    setSearchQuery('');
    navigate(result.section);
    if (result.type === 'event') editEvent(result.id);
    if (result.type === 'task') editTask(result.id);
  };

  const page = (() => {
    if (section === 'today') return <TodayPage data={store.data} userId={store.userId} language={store.language} labels={labels} onOpenCalendar={() => navigate('calendar')} onOpenTasks={() => navigate('tasks')} onEditEvent={editEvent} onToggleTask={store.toggleTask} />;
    if (section === 'calendar') return <CalendarPage events={events} calendars={calendars} preferences={preferences} language={store.language} labels={labels} anchor={anchor} onAnchorChange={setAnchor} onNewEvent={newEvent} onEditEvent={editEvent} onSaveEvent={store.saveEvent} />;
    if (section === 'tasks') return <TasksPage tasks={tasks} events={events} preferences={preferences} labels={labels} onNewTask={newTask} onEditTask={editTask} onToggleTask={store.toggleTask} onSaveTask={store.saveTask} />;
    if (section === 'planner') return <PlannerPage events={events} tasks={tasks} routines={routines} preferences={preferences} labels={labels} onApply={store.applyProposal} />;
    if (section === 'reminders') return <RemindersPage reminders={reminders} labels={labels} onAdd={() => setQuickAddOpen(true)} />;
    if (section === 'shared') return <SharedPage calendars={calendars} labels={labels} />;
    if (section === 'insights') return <InsightsPage events={events} tasks={tasks} routines={routines} labels={labels} />;
    return <SettingsPage preferences={preferences} labels={labels} onLanguage={store.setLanguage} onTheme={store.setTheme} />;
  })();

  return <>
    <AppShell activeSection={section} language={store.language} labels={labels} searchQuery={searchQuery} onNavigate={navigate} onAdd={() => setQuickAddOpen(true)} onSearch={setSearchQuery} onToggleLanguage={() => store.setLanguage(store.language === 'en' ? 'ne' : 'en')}>
      {page}
      <SearchResults query={searchQuery} results={results} onSelect={selectSearchResult} onClose={() => setSearchQuery('')} />
    </AppShell>
    <EventDialog open={eventDialogOpen} event={selectedEvent} defaultDate={eventDate} userId={store.userId} timezone={preferences.timezone} calendars={calendars} events={events} language={store.language} labels={labels} onClose={() => setEventDialogOpen(false)} onSave={store.saveEvent} onDelete={store.deleteEvent} />
    <TaskDialog open={taskDialogOpen} task={selectedTask} userId={store.userId} labels={labels} onClose={() => setTaskDialogOpen(false)} onSave={store.saveTask} />
    <QuickAddDialog open={quickAddOpen} userId={store.userId} labels={labels} events={events} tasks={tasks} routines={routines} preferences={preferences} calendars={calendars} onClose={() => setQuickAddOpen(false)} onOpenEvent={() => newEvent()} onOpenTask={newTask} onOpenReminders={() => navigate('reminders')} onOpenRoutines={() => navigate('planner')} onSaveEvent={store.saveEvent} />
    <AIAssistant events={events} tasks={tasks} onOpenPlanner={() => navigate('planner')} />
  </>;
}

export default App;
