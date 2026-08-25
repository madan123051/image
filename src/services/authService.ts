import type { User } from '../types/domain';
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut as firebaseSignOut,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';

export interface AuthSession {
  user: User;
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
    return { user: this.demoUser };
  }

  async signInWithEmail(): Promise<AuthSession> {
    return { user: this.demoUser };
  }

  async signInWithOAuth(): Promise<AuthSession> {
    return { user: this.demoUser };
  }

  async signOut(): Promise<void> {
    return Promise.resolve();
  }
}

function toDomainUser(user: FirebaseUser): User {
  return {
    id: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? 'Madan',
    avatarUrl: user.photoURL ?? undefined,
    createdAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).toISOString()
      : new Date().toISOString(),
  };
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
    return { user: toDomainUser(user) };
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

export function assertOwnedBy(userId: string, resourceUserId: string): void {
  if (userId !== resourceUserId) {
    throw new Error('You do not have access to this resource.');
  }
}
