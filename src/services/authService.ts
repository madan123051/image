import type { User } from '../types/domain';

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

export function assertOwnedBy(userId: string, resourceUserId: string): void {
  if (userId !== resourceUserId) {
    throw new Error('You do not have access to this resource.');
  }
}
