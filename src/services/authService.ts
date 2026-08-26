import type { AppData, User } from '../types/domain';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseServices } from '../config/firebase';

export interface AuthSession {
  user: User;
  isAnonymous: boolean;
  accessToken?: string;
}

export interface AuthProvider {
  getSession(): Promise<AuthSession | null>;
  signInWithEmail(email: string, password: string): Promise<AuthSession>;
  signInWithOAuth(provider: 'google' | 'apple'): Promise<AuthSession>;
  signOut(): Promise<void>;
}

export class DemoAuthProvider implements AuthProvider {
  constructor(private readonly demoUser: User) {}

  async getSession(): Promise<AuthSession> {
    return { user: this.demoUser, isAnonymous: true };
  }

  async signInWithEmail(): Promise<AuthSession> {
    return { user: this.demoUser, isAnonymous: true };
  }

  async signInWithOAuth(): Promise<AuthSession> {
    return { user: this.demoUser, isAnonymous: true };
  }

  async signOut(): Promise<void> {
    return Promise.resolve();
  }
}

export function toDomainUser(user: FirebaseUser): User {
  const profile: User = {
    id: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? 'Madan',
    createdAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).toISOString()
      : new Date().toISOString(),
  };
  if (user.photoURL) profile.avatarUrl = user.photoURL;
  return profile;
}

function readInitialUser(auth: Auth): Promise<FirebaseUser | null> {
  return new Promise((resolve, reject) => {
    let unsubscribe: () => void = () => undefined;
    unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      },
    );
  });
}

export class FirebaseAnonymousAuthProvider implements AuthProvider {
  constructor(private readonly auth: Auth) {}

  async getSession(): Promise<AuthSession> {
    const existing = await readInitialUser(this.auth);
    const user = existing ?? (await signInAnonymously(this.auth)).user;
    return { user: toDomainUser(user), isAnonymous: user.isAnonymous };
  }

  async signInWithEmail(): Promise<AuthSession> {
    throw new Error('Email sign-in is not enabled for this release.');
  }

  async signInWithOAuth(): Promise<AuthSession> {
    throw new Error('OAuth sign-in is not enabled for this release.');
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }
}

async function saveAuthenticatedProfile(user: FirebaseUser): Promise<User> {
  const services = await getFirebaseServices();
  if (!services || services.auth.currentUser?.uid !== user.uid) throw new Error('Firebase session is unavailable.');
  const profile = toDomainUser(user);
  await setDoc(doc(services.db, 'users', user.uid), profile);
  return profile;
}

export function reassignWorkspaceToUser(data: AppData, user: User): AppData {
  const preferences = data.preferences[0];
  if (!preferences) throw new Error('Workspace preferences are missing.');
  return {
    users: [user],
    preferences: [{ ...preferences, userId: user.id }],
    calendars: data.calendars.map((item) => ({ ...item, userId: user.id })),
    events: data.events.map((item) => ({ ...item, userId: user.id })),
    tasks: data.tasks.map((item) => ({ ...item, userId: user.id })),
    reminders: data.reminders.map((item) => ({ ...item, userId: user.id })),
    routines: data.routines.map((item) => ({ ...item, userId: user.id })),
    notifications: data.notifications.map((item) => ({ ...item, userId: user.id })),
  };
}

async function migrateWorkspace(db: Firestore, data: AppData, user: User): Promise<void> {
  const collectionNames = ['calendars', 'events', 'tasks', 'reminders', 'routines', 'notifications'] as const;
  const stamp = new Date().toISOString();
  const migrated = reassignWorkspaceToUser(data, user);
  const writes: Array<{ path: string[]; value: unknown }> = [
    { path: ['users', user.id], value: user },
    {
      path: ['users', user.id, 'preferences', 'current'],
      value: migrated.preferences[0],
    },
    {
      path: ['users', user.id, 'metadata', 'workspace'],
      value: { userId: user.id, schemaVersion: 2, createdAt: stamp, updatedAt: stamp },
    },
  ];
  for (const name of collectionNames) {
    for (const item of migrated[name]) {
      writes.push({ path: ['users', user.id, name, item.id], value: item });
    }
  }
  for (let index = 0; index < writes.length; index += 400) {
    const batch = writeBatch(db);
    writes.slice(index, index + 400).forEach((write) => batch.set(doc(db, write.path.join('/')), write.value));
    await batch.commit();
  }
}

export async function createFirebaseAccount(displayName: string, email: string, password: string, workspace: AppData): Promise<AuthSession> {
  const services = await getFirebaseServices();
  if (!services) throw new Error('Firebase authentication is not configured.');
  const result = await createUserWithEmailAndPassword(services.auth, email.trim(), password);
  await updateProfile(result.user, { displayName: displayName.trim() });
  await result.user.reload();
  const user = toDomainUser(result.user);
  await migrateWorkspace(services.db, workspace, user);
  return { user, isAnonymous: false };
}

export async function signInToFirebase(email: string, password: string): Promise<AuthSession> {
  const services = await getFirebaseServices();
  if (!services) throw new Error('Firebase authentication is not configured.');
  const result = await signInWithEmailAndPassword(services.auth, email.trim(), password);
  return { user: toDomainUser(result.user), isAnonymous: false };
}

export async function signInWithGoogle(): Promise<AuthSession> {
  const services = await getFirebaseServices();
  if (!services) throw new Error('Firebase authentication is not configured.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const current = services.auth.currentUser;
  let firebaseUser: FirebaseUser;

  if (current?.isAnonymous) {
    try {
      firebaseUser = (await linkWithPopup(current, provider)).user;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== 'auth/credential-already-in-use') throw error;
      const credential = GoogleAuthProvider.credentialFromError(error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]);
      if (!credential) throw error;
      firebaseUser = (await signInWithCredential(services.auth, credential)).user;
    }
  } else {
    firebaseUser = (await signInWithPopup(services.auth, provider)).user;
  }

  const user = await saveAuthenticatedProfile(firebaseUser);
  return { user, isAnonymous: false };
}

export async function updateFirebaseProfile(displayName: string, avatarUrl: string): Promise<User> {
  const services = await getFirebaseServices();
  const current = services?.auth.currentUser;
  if (!current) throw new Error('Please reconnect your account.');
  await updateProfile(current, { displayName: displayName.trim(), photoURL: avatarUrl.trim() || null });
  await current.reload();
  return saveAuthenticatedProfile(current);
}

export async function uploadFirebaseAvatar(avatar: Blob): Promise<string> {
  const services = await getFirebaseServices();
  if (!services) throw new Error('Firebase storage is not configured.');
  const current = services.auth.currentUser;
  if (!current) throw new Error('Please reconnect your account.');
  if (!services.storage) throw new Error('Profile photo storage is not configured.');

  const avatarRef = ref(services.storage, `avatars/${current.uid}/profile.webp`);
  await uploadBytes(avatarRef, avatar, {
    cacheControl: 'public,max-age=300',
    contentType: 'image/webp',
  });
  const downloadUrl = await getDownloadURL(avatarRef);
  return `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
}

export async function requestFirebasePasswordReset(email: string): Promise<void> {
  const services = await getFirebaseServices();
  if (!services) throw new Error('Firebase authentication is not configured.');
  await sendPasswordResetEmail(services.auth, email.trim());
}

export async function signOutFirebaseAccount(): Promise<void> {
  const services = await getFirebaseServices();
  if (services) await firebaseSignOut(services.auth);
}

export function assertOwnedBy(userId: string, resourceUserId: string): void {
  if (userId !== resourceUserId) {
    throw new Error('You do not have access to this resource.');
  }
}
