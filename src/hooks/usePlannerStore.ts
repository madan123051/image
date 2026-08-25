import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFirebaseServices, isFirebaseConfigured } from '../config/firebase';
import { createSeedData, createSeedDataForUser, DEMO_USER_ID } from '../data/seed';
import type {
  AppData,
  CalendarDefinition,
  CalendarEvent,
  Language,
  NotificationItem,
  PlannerProposal,
  PlannerSyncState,
  PlannerTask,
  Reminder,
  Routine,
  ThemePreference,
  UserPreferences,
} from '../types/domain';
import { FirebaseAnonymousAuthProvider, assertOwnedBy } from '../services/authService';
import { FirestoreLifePlannerRepository } from '../services/firebaseRepository';
import { buildNotificationOutbox } from '../services/notificationService';
import { getNextReminderOccurrence } from '../services/reminderService';
import type { LifePlannerRepository } from '../services/repository';
import { addMinutes } from '../utils/date';

export interface PlannerStore {
  data: AppData;
  userId: string;
  language: Language;
  theme: ThemePreference;
  sync: PlannerSyncState;
  persistentCache: boolean;
  isAnonymous: boolean;
  saveCalendar(calendar: CalendarDefinition): void;
  deleteCalendar(calendarId: string): void;
  saveEvent(event: CalendarEvent): void;
  deleteEvent(eventId: string): void;
  saveTask(task: PlannerTask): void;
  deleteTask(taskId: string): void;
  toggleTask(taskId: string): void;
  saveReminder(reminder: Reminder): void;
  deleteReminder(reminderId: string): void;
  completeReminder(reminderId: string): void;
  snoozeReminder(reminderId: string, minutes?: number): void;
  saveRoutine(routine: Routine): void;
  deleteRoutine(routineId: string): void;
  toggleRoutine(routineId: string): void;
  markNotificationRead(notificationId: string): void;
  markNotificationDelivered(notificationId: string): void;
  markAllNotificationsRead(): void;
  setLanguage(language: Language): void;
  setTheme(theme: ThemePreference): void;
  savePreferences(preferences: UserPreferences): void;
  applyProposal(proposal: PlannerProposal): void;
}

const demoSync: PlannerSyncState = {
  mode: 'demo',
  message: 'Local fallback · connect Firebase to sync across devices',
  hasPendingWrites: false,
};

function mergeGeneratedNotifications(data: AppData): AppData {
  const generated = buildNotificationOutbox(data);
  const generatedIds = new Set(generated.map((item) => item.id));
  const managedSourceIds = new Set([
    ...data.events.map((item) => item.id),
    ...data.tasks.map((item) => item.id),
    ...data.reminders.map((item) => item.id),
    ...data.routines.map((item) => item.id),
  ]);
  return {
    ...data,
    notifications: [
      ...generated,
      ...data.notifications.filter((item) => !generatedIds.has(item.id) && !managedSourceIds.has(item.sourceId)),
    ],
  };
}

export function usePlannerStore(): PlannerStore {
  const initialData = useMemo(() => createSeedData(), []);
  const [data, setData] = useState<AppData>(initialData);
  const [userId, setUserId] = useState(DEMO_USER_ID);
  const [sync, setSync] = useState<PlannerSyncState>(isFirebaseConfigured ? {
    mode: 'connecting',
    message: 'Connecting to Firebase…',
    hasPendingWrites: false,
  } : demoSync);
  const [persistentCache, setPersistentCache] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const dataRef = useRef(data);
  const repositoryRef = useRef<LifePlannerRepository | null>(null);

  const commitData = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const reportError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Firebase synchronization failed.';
    setSync({ mode: 'error', message, hasPendingWrites: false });
  }, []);

  const persist = useCallback((operation: (repository: LifePlannerRepository) => Promise<unknown>) => {
    const repository = repositoryRef.current;
    if (!repository) return;
    const online = typeof navigator === 'undefined' || navigator.onLine;
    setSync({
      mode: online ? 'saving' : 'offline',
      message: online ? 'Saving changes…' : 'Saved offline · will sync automatically',
      hasPendingWrites: true,
    });
    void operation(repository).catch(reportError);
  }, [reportError]);

  const persistNotificationsForSources = useCallback((
    next: AppData,
    previousNotifications: NotificationItem[],
    sourceIds: string[],
  ) => {
    const sourceSet = new Set(sourceIds);
    const notifications = next.notifications.filter((item) => sourceSet.has(item.sourceId));
    const notificationIds = new Set(notifications.map((item) => item.id));
    const removed = previousNotifications.filter(
      (item) => sourceSet.has(item.sourceId) && !notificationIds.has(item.id),
    );
    persist((repository) => Promise.all(
      [
        ...notifications.map((notification) => repository.saveNotification(userId, notification)),
        ...removed.map((notification) => repository.deleteNotification(userId, notification.id)),
      ],
    ));
  }, [persist, userId]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let active = true;
    let unsubscribe: () => void = () => undefined;

    const initialize = async () => {
      try {
        const services = await getFirebaseServices();
        if (!services || !active) return;
        setPersistentCache(services.persistentCache);
        const session = await new FirebaseAnonymousAuthProvider(services.auth).getSession();
        if (!active) return;
        const repository = new FirestoreLifePlannerRepository(services.db);
        setIsAnonymous(session.isAnonymous);
        repositoryRef.current = repository;
        const seed = createSeedDataForUser(session.user);
        const stored = await repository.initializeWorkspace(session.user, seed);
        if (!active) return;
        const hydrated = mergeGeneratedNotifications(stored);
        commitData(hydrated);
        setUserId(session.user.id);
        unsubscribe = repository.subscribe(
          session.user.id,
          (snapshot) => {
            if (!active) return;
            commitData(snapshot.data);
            const online = typeof navigator === 'undefined' || navigator.onLine;
            setSync({
              mode: !online ? 'offline' : snapshot.hasPendingWrites ? 'saving' : snapshot.fromCache ? 'connecting' : 'synced',
              message: !online
                ? 'Offline · changes will sync automatically'
                : snapshot.hasPendingWrites
                  ? 'Saving changes…'
                  : snapshot.fromCache
                    ? 'Restoring saved planner…'
                    : 'Your planner is up to date',
              hasPendingWrites: snapshot.hasPendingWrites,
            });
          },
          reportError,
        );
        const hydratedIds = new Set(hydrated.notifications.map((notification) => notification.id));
        void Promise.all([
          ...hydrated.notifications.map((notification) => repository.saveNotification(session.user.id, notification)),
          ...stored.notifications
            .filter((notification) => !hydratedIds.has(notification.id))
            .map((notification) => repository.deleteNotification(session.user.id, notification.id)),
        ]).catch(reportError);
      } catch (error) {
        if (active) reportError(error);
      }
    };

    void initialize();
    return () => {
      active = false;
      repositoryRef.current = null;
      unsubscribe();
    };
  }, [commitData, reportError]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const updateNetworkState = () => {
      if (!navigator.onLine) {
        setSync((current) => ({ ...current, mode: 'offline', message: 'Offline · changes will sync automatically' }));
      } else {
        setSync((current) => ({
          ...current,
          mode: current.hasPendingWrites ? 'saving' : 'connecting',
          message: current.hasPendingWrites ? 'Reconnecting and saving…' : 'Reconnecting to Firebase…',
        }));
      }
    };
    window.addEventListener('online', updateNetworkState);
    window.addEventListener('offline', updateNetworkState);
    return () => {
      window.removeEventListener('online', updateNetworkState);
      window.removeEventListener('offline', updateNetworkState);
    };
  }, []);

  const saveCalendar = useCallback((calendar: CalendarDefinition) => {
    assertOwnedBy(userId, calendar.userId);
    const current = dataRef.current;
    commitData({
      ...current,
      calendars: current.calendars.some((item) => item.id === calendar.id)
        ? current.calendars.map((item) => (item.id === calendar.id ? calendar : item))
        : [...current.calendars, calendar],
    });
    persist((repository) => repository.saveCalendar(userId, calendar));
  }, [commitData, persist, userId]);

  const deleteCalendar = useCallback((calendarId: string) => {
    const current = dataRef.current;
    const calendar = current.calendars.find((item) => item.id === calendarId);
    if (!calendar) return;
    assertOwnedBy(userId, calendar.userId);
    if (current.events.some((item) => item.calendarId === calendarId)) {
      throw new Error('Move or delete this calendar’s events first.');
    }
    commitData({ ...current, calendars: current.calendars.filter((item) => item.id !== calendarId) });
    persist((repository) => repository.deleteCalendar(userId, calendarId));
  }, [commitData, persist, userId]);

  const saveEvent = useCallback((event: CalendarEvent) => {
    assertOwnedBy(userId, event.userId);
    const current = dataRef.current;
    const next = mergeGeneratedNotifications({
      ...current,
      events: current.events.some((item) => item.id === event.id)
        ? current.events.map((item) => (item.id === event.id ? event : item))
        : [...current.events, event],
    });
    commitData(next);
    persist((repository) => repository.saveEvent(userId, event));
    persistNotificationsForSources(next, current.notifications, [event.id]);
  }, [commitData, persist, persistNotificationsForSources, userId]);

  const deleteEvent = useCallback((eventId: string) => {
    const current = dataRef.current;
    const event = current.events.find((item) => item.id === eventId);
    if (event) assertOwnedBy(userId, event.userId);
    const removedNotifications = current.notifications.filter((item) => item.sourceId === eventId);
    const next = {
      ...current,
      events: current.events.filter((item) => item.id !== eventId),
      notifications: current.notifications.filter((item) => item.sourceId !== eventId),
    };
    commitData(next);
    persist(async (repository) => {
      await repository.deleteEvent(userId, eventId);
      await Promise.all(removedNotifications.map((item) => repository.deleteNotification(userId, item.id)));
    });
  }, [commitData, persist, userId]);

  const saveTask = useCallback((task: PlannerTask) => {
    assertOwnedBy(userId, task.userId);
    const current = dataRef.current;
    const next = mergeGeneratedNotifications({
      ...current,
      tasks: current.tasks.some((item) => item.id === task.id)
        ? current.tasks.map((item) => (item.id === task.id ? task : item))
        : [...current.tasks, task],
    });
    commitData(next);
    persist((repository) => repository.saveTask(userId, task));
    persistNotificationsForSources(next, current.notifications, [task.id]);
  }, [commitData, persist, persistNotificationsForSources, userId]);

  const deleteTask = useCallback((taskId: string) => {
    const current = dataRef.current;
    const task = current.tasks.find((item) => item.id === taskId);
    if (task) assertOwnedBy(userId, task.userId);
    const removedNotifications = current.notifications.filter((item) => item.sourceId === taskId);
    commitData({
      ...current,
      tasks: current.tasks.filter((item) => item.id !== taskId),
      notifications: current.notifications.filter((item) => item.sourceId !== taskId),
    });
    persist(async (repository) => {
      await repository.deleteTask(userId, taskId);
      await Promise.all(removedNotifications.map((item) => repository.deleteNotification(userId, item.id)));
    });
  }, [commitData, persist, userId]);

  const toggleTask = useCallback((taskId: string) => {
    const task = dataRef.current.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const completed = task.status !== 'completed';
    saveTask({
      ...task,
      status: completed ? 'completed' : 'inbox',
      completedAt: completed ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    });
  }, [saveTask]);

  const saveReminder = useCallback((reminder: Reminder) => {
    assertOwnedBy(userId, reminder.userId);
    const current = dataRef.current;
    const next = mergeGeneratedNotifications({
      ...current,
      reminders: current.reminders.some((item) => item.id === reminder.id)
        ? current.reminders.map((item) => (item.id === reminder.id ? reminder : item))
        : [...current.reminders, reminder],
    });
    commitData(next);
    persist((repository) => repository.saveReminder(userId, reminder));
    persistNotificationsForSources(next, current.notifications, [reminder.id]);
  }, [commitData, persist, persistNotificationsForSources, userId]);

  const deleteReminder = useCallback((reminderId: string) => {
    const current = dataRef.current;
    const reminder = current.reminders.find((item) => item.id === reminderId);
    if (reminder) assertOwnedBy(userId, reminder.userId);
    const removedNotifications = current.notifications.filter((item) => item.sourceId === reminderId);
    commitData({
      ...current,
      reminders: current.reminders.filter((item) => item.id !== reminderId),
      notifications: current.notifications.filter((item) => item.sourceId !== reminderId),
    });
    persist(async (repository) => {
      await repository.deleteReminder(userId, reminderId);
      await Promise.all(removedNotifications.map((item) => repository.deleteNotification(userId, item.id)));
    });
  }, [commitData, persist, userId]);

  const completeReminder = useCallback((reminderId: string) => {
    const reminder = dataRef.current.reminders.find((item) => item.id === reminderId);
    if (!reminder) return;
    const timezone = dataRef.current.preferences.find((item) => item.userId === reminder.userId)?.timezone
      ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nextOccurrence = getNextReminderOccurrence(reminder, timezone);
    saveReminder({
      ...reminder,
      completed: !nextOccurrence,
      remindAt: nextOccurrence ?? reminder.remindAt,
      snoozedUntil: null,
      updatedAt: new Date().toISOString(),
    });
  }, [saveReminder]);

  const snoozeReminder = useCallback((reminderId: string, minutes = 10) => {
    const reminder = dataRef.current.reminders.find((item) => item.id === reminderId);
    if (!reminder) return;
    saveReminder({
      ...reminder,
      completed: false,
      snoozedUntil: addMinutes(new Date(), minutes).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [saveReminder]);

  const saveRoutine = useCallback((routine: Routine) => {
    assertOwnedBy(userId, routine.userId);
    const current = dataRef.current;
    const next = mergeGeneratedNotifications({
      ...current,
      routines: current.routines.some((item) => item.id === routine.id)
        ? current.routines.map((item) => (item.id === routine.id ? routine : item))
        : [...current.routines, routine],
    });
    commitData(next);
    persist((repository) => repository.saveRoutine(userId, routine));
    persistNotificationsForSources(next, current.notifications, [routine.id]);
  }, [commitData, persist, persistNotificationsForSources, userId]);

  const deleteRoutine = useCallback((routineId: string) => {
    const current = dataRef.current;
    const routine = current.routines.find((item) => item.id === routineId);
    if (routine) assertOwnedBy(userId, routine.userId);
    const removedNotifications = current.notifications.filter((item) => item.sourceId === routineId);
    commitData({
      ...current,
      routines: current.routines.filter((item) => item.id !== routineId),
      notifications: current.notifications.filter((item) => item.sourceId !== routineId),
    });
    persist(async (repository) => {
      await repository.deleteRoutine(userId, routineId);
      await Promise.all(removedNotifications.map((item) => repository.deleteNotification(userId, item.id)));
    });
  }, [commitData, persist, userId]);

  const toggleRoutine = useCallback((routineId: string) => {
    const routine = dataRef.current.routines.find((item) => item.id === routineId);
    if (!routine) return;
    saveRoutine({ ...routine, active: !routine.active, updatedAt: new Date().toISOString() });
  }, [saveRoutine]);

  const updateNotification = useCallback((notificationId: string, updates: Partial<NotificationItem>) => {
    const current = dataRef.current;
    const notification = current.notifications.find((item) => item.id === notificationId);
    if (!notification) return;
    assertOwnedBy(userId, notification.userId);
    const updated = { ...notification, ...updates };
    commitData({
      ...current,
      notifications: current.notifications.map((item) => (item.id === notificationId ? updated : item)),
    });
    persist((repository) => repository.saveNotification(userId, updated));
  }, [commitData, persist, userId]);

  const markNotificationRead = useCallback((notificationId: string) => {
    updateNotification(notificationId, { read: true, readAt: new Date().toISOString() });
  }, [updateNotification]);

  const markNotificationDelivered = useCallback((notificationId: string) => {
    updateNotification(notificationId, { deliveredAt: new Date().toISOString() });
  }, [updateNotification]);

  const markAllNotificationsRead = useCallback(() => {
    const now = new Date().toISOString();
    const dueUnread = dataRef.current.notifications.filter(
      (item) => !item.read && new Date(item.scheduledAt) <= new Date(),
    );
    if (!dueUnread.length) return;
    const current = dataRef.current;
    const ids = new Set(dueUnread.map((item) => item.id));
    const updatedNotifications = current.notifications.map((item) => ids.has(item.id)
      ? { ...item, read: true, readAt: now }
      : item);
    commitData({ ...current, notifications: updatedNotifications });
    persist((repository) => Promise.all(
      updatedNotifications.filter((item) => ids.has(item.id)).map((item) => repository.saveNotification(userId, item)),
    ));
  }, [commitData, persist, userId]);

  const savePreferences = useCallback((preferences: UserPreferences) => {
    assertOwnedBy(userId, preferences.userId);
    const current = dataRef.current;
    commitData({
      ...current,
      preferences: current.preferences.some((item) => item.userId === userId)
        ? current.preferences.map((item) => (item.userId === userId ? preferences : item))
        : [...current.preferences, preferences],
    });
    persist((repository) => repository.savePreferences(userId, preferences));
  }, [commitData, persist, userId]);

  const setLanguage = useCallback((language: Language) => {
    const preferences = dataRef.current.preferences.find((item) => item.userId === userId);
    if (preferences) savePreferences({ ...preferences, language });
  }, [savePreferences, userId]);

  const setTheme = useCallback((theme: ThemePreference) => {
    const preferences = dataRef.current.preferences.find((item) => item.userId === userId);
    if (preferences) savePreferences({ ...preferences, theme });
  }, [savePreferences, userId]);

  const applyProposal = useCallback((proposal: PlannerProposal) => {
    const current = dataRef.current;
    const changedTasks: PlannerTask[] = [];
    const tasks = current.tasks.map((task) => {
      const item = proposal.items.find((proposalItem) => proposalItem.sourceId === task.id);
      if (!item) return task;
      const updated = {
        ...task,
        status: 'planned' as const,
        scheduledStart: item.startDateTime,
        scheduledEnd: item.endDateTime,
        updatedAt: new Date().toISOString(),
      };
      changedTasks.push(updated);
      return updated;
    });
    const next = mergeGeneratedNotifications({ ...current, tasks });
    commitData(next);
    persist((repository) => Promise.all(changedTasks.map((task) => repository.saveTask(userId, task))));
    persistNotificationsForSources(next, current.notifications, changedTasks.map((task) => task.id));
  }, [commitData, persist, persistNotificationsForSources, userId]);

  const preferences = data.preferences.find((item) => item.userId === userId)
    ?? data.preferences[0];
  if (!preferences) throw new Error('Planner preferences are missing.');

  return useMemo(
    () => ({
      data,
      userId,
      language: preferences.language,
      theme: preferences.theme,
      sync,
      persistentCache,
      isAnonymous,
      saveCalendar,
      deleteCalendar,
      saveEvent,
      deleteEvent,
      saveTask,
      deleteTask,
      toggleTask,
      saveReminder,
      deleteReminder,
      completeReminder,
      snoozeReminder,
      saveRoutine,
      deleteRoutine,
      toggleRoutine,
      markNotificationRead,
      markNotificationDelivered,
      markAllNotificationsRead,
      setLanguage,
      setTheme,
      savePreferences,
      applyProposal,
    }),
    [
      data,
      userId,
      preferences.language,
      preferences.theme,
      sync,
      persistentCache,
      isAnonymous,
      saveCalendar,
      deleteCalendar,
      saveEvent,
      deleteEvent,
      saveTask,
      deleteTask,
      toggleTask,
      saveReminder,
      deleteReminder,
      completeReminder,
      snoozeReminder,
      saveRoutine,
      deleteRoutine,
      toggleRoutine,
      markNotificationRead,
      markNotificationDelivered,
      markAllNotificationsRead,
      setLanguage,
      setTheme,
      savePreferences,
      applyProposal,
    ],
  );
}
