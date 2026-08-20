import { useSyncExternalStore } from 'react';

export type Session = {
  name: string;
  email: string;
};

type Listener = () => void;

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'there';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim() || 'there';
}

class SessionStore {
  private session: Session | null = null;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSession = () => this.session;

  signIn(email: string, name?: string) {
    const trimmedEmail = email.trim();
    this.session = {
      email: trimmedEmail,
      name: name?.trim() || nameFromEmail(trimmedEmail),
    };
    this.notify();
  }

  signOut() {
    this.session = null;
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const sessionStore = new SessionStore();

export function useSession(): Session | null {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getSession);
}
