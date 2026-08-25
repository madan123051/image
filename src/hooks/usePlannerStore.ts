import { useCallback, useMemo, useState } from 'react';
import { createSeedData, DEMO_USER_ID } from '../data/seed';
import type {
  AppData,
  CalendarEvent,
  Language,
  PlannerProposal,
  PlannerTask,
  ThemePreference,
} from '../types/domain';
import { assertOwnedBy } from '../services/authService';

export interface PlannerStore {
  data: AppData;
  userId: string;
  language: Language;
  theme: ThemePreference;
  saveEvent(event: CalendarEvent): void;
  deleteEvent(eventId: string): void;
  saveTask(task: PlannerTask): void;
  toggleTask(taskId: string): void;
  setLanguage(language: Language): void;
  setTheme(theme: ThemePreference): void;
  applyProposal(proposal: PlannerProposal): void;
}

export function usePlannerStore(): PlannerStore {
  const [data, setData] = useState<AppData>(() => createSeedData());

  const saveEvent = useCallback((event: CalendarEvent) => {
    assertOwnedBy(DEMO_USER_ID, event.userId);
    setData((current) => ({
      ...current,
      events: current.events.some((item) => item.id === event.id)
        ? current.events.map((item) => (item.id === event.id ? event : item))
        : [...current.events, event],
    }));
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setData((current) => {
      const event = current.events.find((item) => item.id === eventId);
      if (event) assertOwnedBy(DEMO_USER_ID, event.userId);
      return { ...current, events: current.events.filter((item) => item.id !== eventId) };
    });
  }, []);

  const saveTask = useCallback((task: PlannerTask) => {
    assertOwnedBy(DEMO_USER_ID, task.userId);
    setData((current) => ({
      ...current,
      tasks: current.tasks.some((item) => item.id === task.id)
        ? current.tasks.map((item) => (item.id === task.id ? task : item))
        : [...current.tasks, task],
    }));
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== taskId) return task;
        assertOwnedBy(DEMO_USER_ID, task.userId);
        const completed = task.status !== 'completed';
        return {
          ...task,
          status: completed ? 'completed' : 'inbox',
          completedAt: completed ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setData((current) => ({
      ...current,
      preferences: current.preferences.map((preferences) =>
        preferences.userId === DEMO_USER_ID ? { ...preferences, language } : preferences,
      ),
    }));
  }, []);

  const setTheme = useCallback((theme: ThemePreference) => {
    setData((current) => ({
      ...current,
      preferences: current.preferences.map((preferences) =>
        preferences.userId === DEMO_USER_ID ? { ...preferences, theme } : preferences,
      ),
    }));
  }, []);

  const applyProposal = useCallback((proposal: PlannerProposal) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        const item = proposal.items.find((proposalItem) => proposalItem.sourceId === task.id);
        return item
          ? {
              ...task,
              status: 'planned',
              scheduledStart: item.startDateTime,
              scheduledEnd: item.endDateTime,
              updatedAt: new Date().toISOString(),
            }
          : task;
      }),
    }));
  }, []);

  const preferences = data.preferences.find((item) => item.userId === DEMO_USER_ID);
  if (!preferences) throw new Error('Demo preferences are missing.');

  return useMemo(
    () => ({
      data,
      userId: DEMO_USER_ID,
      language: preferences.language,
      theme: preferences.theme,
      saveEvent,
      deleteEvent,
      saveTask,
      toggleTask,
      setLanguage,
      setTheme,
      applyProposal,
    }),
    [data, preferences.language, preferences.theme, saveEvent, deleteEvent, saveTask, toggleTask, setLanguage, setTheme, applyProposal],
  );
}
