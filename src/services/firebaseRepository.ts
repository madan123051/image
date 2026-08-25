import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Firestore,
  type SnapshotMetadata,
} from 'firebase/firestore';
import type {
  AppData,
  CalendarDefinition,
  CalendarEvent,
  NotificationItem,
  PlannerTask,
  Reminder,
  Routine,
  User,
  UserPreferences,
} from '../types/domain';
import { assertOwnedBy } from './authService';
import type { LifePlannerRepository, RepositorySnapshot } from './repository';

type CollectionName = 'calendars' | 'events' | 'tasks' | 'reminders' | 'routines' | 'notifications';
type CollectionDataKey = Exclude<CollectionName, never>;

const collectionNames: CollectionName[] = [
  'calendars',
  'events',
  'tasks',
  'reminders',
  'routines',
  'notifications',
];

function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutUndefined) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, withoutUndefined(item)]),
    ) as T;
  }
  return value;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Firebase synchronization failed.');
}

export class FirestoreLifePlannerRepository implements LifePlannerRepository {
  constructor(private readonly db: Firestore) {}

  private userDocument(userId: string) {
    return doc(this.db, 'users', userId);
  }

  private preferencesDocument(userId: string) {
    return doc(this.db, 'users', userId, 'preferences', 'current');
  }

  private workspaceDocument(userId: string) {
    return doc(this.db, 'users', userId, 'metadata', 'workspace');
  }

  private userCollection(userId: string, name: CollectionName) {
    return collection(this.db, 'users', userId, name);
  }

  private ownedDocument(userId: string, name: CollectionName, id: string) {
    return doc(this.db, 'users', userId, name, id);
  }

  private async readCollection<T>(userId: string, name: CollectionName): Promise<T[]> {
    const snapshot = await getDocs(this.userCollection(userId, name));
    return snapshot.docs.map((item) => item.data() as T);
  }

  private async saveOwned<T extends { id: string; userId: string }>(
    userId: string,
    name: CollectionName,
    item: T,
  ): Promise<T> {
    assertOwnedBy(userId, item.userId);
    await setDoc(this.ownedDocument(userId, name, item.id), withoutUndefined(item));
    return item;
  }

  async initializeWorkspace(user: User, seedData: AppData): Promise<AppData> {
    const marker = await getDoc(this.workspaceDocument(user.id));
    if (!marker.exists()) {
      const batch = writeBatch(this.db);
      batch.set(this.userDocument(user.id), withoutUndefined(user));
      const preferences = seedData.preferences.find((item) => item.userId === user.id);
      if (!preferences) throw new Error('Seed preferences are missing.');
      batch.set(this.preferencesDocument(user.id), withoutUndefined(preferences));

      for (const name of collectionNames) {
        for (const item of seedData[name] as Array<{ id: string; userId: string }>) {
          assertOwnedBy(user.id, item.userId);
          batch.set(this.ownedDocument(user.id, name, item.id), withoutUndefined(item));
        }
      }

      const stamp = new Date().toISOString();
      batch.set(this.workspaceDocument(user.id), {
        userId: user.id,
        schemaVersion: 2,
        createdAt: stamp,
        updatedAt: stamp,
      });
      await batch.commit();
      return seedData;
    }

    const [userSnapshot, preferencesSnapshot, calendars, events, tasks, reminders, routines, notifications] = await Promise.all([
      getDoc(this.userDocument(user.id)),
      getDoc(this.preferencesDocument(user.id)),
      this.getCalendars(user.id),
      this.getEvents(user.id),
      this.getTasks(user.id),
      this.getReminders(user.id),
      this.getRoutines(user.id),
      this.getNotifications(user.id),
    ]);

    return {
      users: [userSnapshot.exists() ? (userSnapshot.data() as User) : user],
      preferences: preferencesSnapshot.exists()
        ? [preferencesSnapshot.data() as UserPreferences]
        : seedData.preferences,
      calendars,
      events,
      tasks,
      reminders,
      routines,
      notifications,
    };
  }

  subscribe(
    userId: string,
    onData: (snapshot: RepositorySnapshot) => void,
    onError: (error: Error) => void,
  ): () => void {
    const state: AppData = {
      users: [],
      preferences: [],
      calendars: [],
      events: [],
      tasks: [],
      reminders: [],
      routines: [],
      notifications: [],
    };
    const ready = new Set<keyof AppData>();
    const pending = new Map<keyof AppData, boolean>();
    const cache = new Map<keyof AppData, boolean>();
    const expected = new Set<keyof AppData>([
      'users',
      'preferences',
      'calendars',
      'events',
      'tasks',
      'reminders',
      'routines',
      'notifications',
    ]);

    const updateMetadata = (key: keyof AppData, metadata: SnapshotMetadata) => {
      ready.add(key);
      pending.set(key, metadata.hasPendingWrites);
      cache.set(key, metadata.fromCache);
      if ([...expected].every((item) => ready.has(item))) {
        onData({
          data: { ...state },
          hasPendingWrites: [...pending.values()].some(Boolean),
          fromCache: [...cache.values()].some(Boolean),
        });
      }
    };

    const unsubscribers = [
      onSnapshot(
        this.userDocument(userId),
        { includeMetadataChanges: true },
        (snapshot) => {
          state.users = snapshot.exists() ? [snapshot.data() as User] : [];
          updateMetadata('users', snapshot.metadata);
        },
        (error) => onError(toError(error)),
      ),
      onSnapshot(
        this.preferencesDocument(userId),
        { includeMetadataChanges: true },
        (snapshot) => {
          state.preferences = snapshot.exists() ? [snapshot.data() as UserPreferences] : [];
          updateMetadata('preferences', snapshot.metadata);
        },
        (error) => onError(toError(error)),
      ),
      ...collectionNames.map((name) => onSnapshot(
        this.userCollection(userId, name),
        { includeMetadataChanges: true },
        (snapshot) => {
          state[name as CollectionDataKey] = snapshot.docs.map((item) => item.data()) as never;
          updateMetadata(name as CollectionDataKey, snapshot.metadata);
        },
        (error) => onError(toError(error)),
      )),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  async getCalendars(userId: string): Promise<CalendarDefinition[]> {
    return this.readCollection(userId, 'calendars');
  }

  async getEvents(userId: string): Promise<CalendarEvent[]> {
    return this.readCollection(userId, 'events');
  }

  async saveEvent(userId: string, event: CalendarEvent): Promise<CalendarEvent> {
    return this.saveOwned(userId, 'events', event);
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    await deleteDoc(this.ownedDocument(userId, 'events', eventId));
  }

  async getTasks(userId: string): Promise<PlannerTask[]> {
    return this.readCollection(userId, 'tasks');
  }

  async saveTask(userId: string, task: PlannerTask): Promise<PlannerTask> {
    return this.saveOwned(userId, 'tasks', task);
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    await deleteDoc(this.ownedDocument(userId, 'tasks', taskId));
  }

  async getReminders(userId: string): Promise<Reminder[]> {
    return this.readCollection(userId, 'reminders');
  }

  async saveReminder(userId: string, reminder: Reminder): Promise<Reminder> {
    return this.saveOwned(userId, 'reminders', reminder);
  }

  async deleteReminder(userId: string, reminderId: string): Promise<void> {
    await deleteDoc(this.ownedDocument(userId, 'reminders', reminderId));
  }

  async getRoutines(userId: string): Promise<Routine[]> {
    return this.readCollection(userId, 'routines');
  }

  async saveRoutine(userId: string, routine: Routine): Promise<Routine> {
    return this.saveOwned(userId, 'routines', routine);
  }

  async deleteRoutine(userId: string, routineId: string): Promise<void> {
    await deleteDoc(this.ownedDocument(userId, 'routines', routineId));
  }

  async getNotifications(userId: string): Promise<NotificationItem[]> {
    return this.readCollection(userId, 'notifications');
  }

  async saveNotification(userId: string, notification: NotificationItem): Promise<NotificationItem> {
    return this.saveOwned(userId, 'notifications', notification);
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await deleteDoc(this.ownedDocument(userId, 'notifications', notificationId));
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const snapshot = await getDoc(this.preferencesDocument(userId));
    if (!snapshot.exists()) throw new Error('User preferences were not found.');
    return snapshot.data() as UserPreferences;
  }

  async savePreferences(userId: string, preferences: UserPreferences): Promise<UserPreferences> {
    assertOwnedBy(userId, preferences.userId);
    await setDoc(this.preferencesDocument(userId), withoutUndefined(preferences));
    return preferences;
  }
}
