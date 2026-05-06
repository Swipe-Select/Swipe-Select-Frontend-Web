import type { AuthUserPayload } from '../api/types';

const KEY = 'swipe-select-session';

export function readSession(): AuthUserPayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthUserPayload | null;
    if (!data?.token || !data.email) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSession(data: AuthUserPayload) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
