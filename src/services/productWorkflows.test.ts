import { parseCalendarMembers } from '../components/CalendarDialog';
import { createSeedData, createSeedDataForUser } from '../data/seed';
import type { CalendarDefinition, User } from '../types/domain';
import { InMemoryLifePlannerRepository } from './repository';
import { reassignWorkspaceToUser } from './authService';

describe('completed product workflows', () => {
  it('parses unique shared members and preserves their access roles', () => {
    const members = parseCalendarMembers([
      'editor@example.com, editor',
      'viewer@example.com, viewer',
      'EDITOR@example.com, viewer',
      'not-an-email',
    ].join('\n'));

    expect(members).toHaveLength(2);
    expect(members.map(({ email, role, status }) => ({ email, role, status }))).toEqual([
      { email: 'editor@example.com', role: 'editor', status: 'invited' },
      { email: 'viewer@example.com', role: 'viewer', status: 'invited' },
    ]);
  });

  it('starts a new authenticated workspace without sample planner records', () => {
    const user: User = { id: 'new-user', email: 'user@example.com', displayName: 'New user', createdAt: '2026-08-26T00:00:00.000Z' };
    const data = createSeedDataForUser(user);

    expect(data.users).toEqual([user]);
    expect(data.calendars.every((calendar) => calendar.userId === user.id)).toBe(true);
    expect(data.events).toEqual([]);
    expect(data.tasks).toEqual([]);
    expect(data.reminders).toEqual([]);
    expect(data.routines).toEqual([]);
  });

  it('moves every guest workspace record to the secured account owner', () => {
    const guestData = createSeedData();
    const user: User = { id: 'secured-user', email: 'secure@example.com', displayName: 'Secure user', createdAt: '2026-08-26T00:00:00.000Z' };
    const migrated = reassignWorkspaceToUser(guestData, user);

    expect(migrated.users).toEqual([user]);
    expect(migrated.preferences[0].userId).toBe(user.id);
    for (const collection of ['calendars', 'events', 'tasks', 'reminders', 'routines', 'notifications'] as const) {
      expect(migrated[collection].every((item) => item.userId === user.id)).toBe(true);
    }
    expect(migrated.events).toHaveLength(guestData.events.length);
    expect(migrated.tasks).toHaveLength(guestData.tasks.length);
  });

  it('persists create, update, and delete calendar operations', async () => {
    const data = createSeedData();
    const userId = data.users[0].id;
    const repository = new InMemoryLifePlannerRepository(data);
    const calendar: CalendarDefinition = {
      id: 'calendar_shared_test',
      userId,
      name: 'Trip team',
      color: '#2d7c65',
      icon: '♧',
      visible: true,
      isPrivate: false,
      role: 'owner',
      members: parseCalendarMembers('friend@example.com, editor'),
      inviteCode: 'invite_test',
    };

    await repository.saveCalendar(userId, calendar);
    expect((await repository.getCalendars(userId)).find((item) => item.id === calendar.id)?.members).toHaveLength(1);
    await repository.saveCalendar(userId, { ...calendar, name: 'Trip planning' });
    expect((await repository.getCalendars(userId)).find((item) => item.id === calendar.id)?.name).toBe('Trip planning');
    await repository.deleteCalendar(userId, calendar.id);
    expect((await repository.getCalendars(userId)).some((item) => item.id === calendar.id)).toBe(false);
  });
});
