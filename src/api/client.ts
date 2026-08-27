import { sessionStore } from '../data/sessionStore';
import { API_URL } from './config';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function detailMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object' && 'msg' in detail[0]) {
      return String((detail[0] as { msg: unknown }).msg);
    }
  }
  return fallback;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStore.getSession()?.token;
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body && !headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      message = detailMessage(await response.json(), message);
    } catch {
      /* ignore non-JSON errors */
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
