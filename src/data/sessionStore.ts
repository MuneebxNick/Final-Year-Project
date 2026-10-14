import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { API_URL } from '../api/config';

export type Role = 'citizen' | 'admin' | 'team';

export type Session = {
  name: string;
  email: string;
  role: Role;
  token: string;
  team: string | null;
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
    return normalizeSession(parsed);
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

function isRole(value: unknown): value is Role {
  return value === 'citizen' || value === 'admin' || value === 'team';
}

function isSession(value: unknown): value is Session & { team?: string | null } {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const teamOk =
    candidate.team === undefined || candidate.team === null || typeof candidate.team === 'string';
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    isRole(candidate.role) &&
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    teamOk
  );
}

function normalizeSession(value: Session & { team?: string | null }): Session {
  return {
    name: value.name,
    email: value.email,
    role: value.role,
    token: value.token,
    team: typeof value.team === 'string' ? value.team : null,
  };
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
      const role = isRole(body.role) ? body.role : stored.role;
      const team =
        body.team === null || typeof body.team === 'string' ? body.team : stored.team;
      const next: Session = {
        name: typeof body.name === 'string' ? body.name : stored.name,
        email: typeof body.email === 'string' ? body.email : stored.email,
        role,
        token: stored.token,
        team,
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
