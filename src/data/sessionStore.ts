import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { API_URL } from '../api/config';

export type Role = 'citizen' | 'admin';

export type Session = {
  name: string;
  email: string;
  role: Role;
  token: string;
};

type Listener = () => void;

const STORAGE_KEY = 'rahscan.session';

function canUseStorage(): boolean {
  return Platform.OS === 'web' && typeof localStorage !== 'undefined';
}

function readPersisted(): Session | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(session: Session | null) {
  if (!canUseStorage()) return;
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / quota */
  }
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    (candidate.role === 'citizen' || candidate.role === 'admin') &&
    typeof candidate.token === 'string' &&
    candidate.token.length > 0
  );
}

class SessionStore {
  private session: Session | null = readPersisted();
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSession = () => this.session;

  signIn(session: Session) {
    this.session = session;
    writePersisted(session);
    this.notify();
  }

  signOut() {
    this.session = null;
    writePersisted(null);
    this.notify();
  }

  async hydrate(): Promise<Session | null> {
    const stored = this.session ?? readPersisted();
    if (!stored?.token) {
      if (this.session) this.signOut();
      return null;
    }
    if (this.session !== stored) {
      this.session = stored;
      this.notify();
    }
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${stored.token}`,
        },
      });
      if (response.status === 401) {
        this.signOut();
        return null;
      }
      if (!response.ok) return stored;
      const me: unknown = await response.json();
      if (!me || typeof me !== 'object') return stored;
      const body = me as Record<string, unknown>;
      const next: Session = {
        name: typeof body.name === 'string' ? body.name : stored.name,
        email: typeof body.email === 'string' ? body.email : stored.email,
        role: body.role === 'admin' || body.role === 'citizen' ? body.role : stored.role,
        token: stored.token,
      };
      this.signIn(next);
      return next;
    } catch {
      return stored;
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const sessionStore = new SessionStore();

export function useSession(): Session | null {
  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSession,
    sessionStore.getSession,
  );
}
