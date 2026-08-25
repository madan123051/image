import { createSeedData, DEMO_USER_ID } from '../data/seed';
import { findConflicts, suggestFreeTime } from './calendarService';

describe('calendar service', () => {
  it('detects overlapping events but excludes the event being edited', () => {
    const data = createSeedData();
    const existing = data.events.find((event) => event.id === 'evt_doctor');
    expect(existing).toBeDefined();
    if (!existing) return;
    const candidate = { ...existing, id: 'new_event', title: 'Overlapping appointment' };
    expect(findConflicts(candidate, data.events).some((event) => event.id === existing.id)).toBe(true);
    expect(findConflicts(existing, data.events).some((event) => event.id === existing.id)).toBe(false);
  });

  it('returns user-configured free slots with the requested duration', () => {
    const data = createSeedData();
    const preferences = data.preferences.find((item) => item.userId === DEMO_USER_ID);
    expect(preferences).toBeDefined();
    if (!preferences) return;
    const slots = suggestFreeTime(data.events, 45, preferences);
    expect(slots.length).toBeGreaterThan(0);
    expect(new Date(slots[0].endDateTime).getTime() - new Date(slots[0].startDateTime).getTime()).toBe(45 * 60_000);
  });
});
