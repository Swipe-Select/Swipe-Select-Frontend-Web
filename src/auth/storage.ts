import type { AuthUserPayload } from '../api/types';

const SESSION_KEY = 'swipe-select-session';
const EXPIRY_KEY = 'swipe-select-expiry';
const COOKIE_NAME = 'swipe-select-presence';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — matches JWT_EXPIRES_IN

// ─── Cookie helpers ───────────────────────────────────────────────────────────
// This is a lightweight "presence" cookie (not HttpOnly — that's set server-side).
// Its sole job is browser-native expiry: when it disappears, the session is stale.

function setPresenceCookie(): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=1; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}; Path=/${secure}`;
}

function hasPresenceCookie(): boolean {
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
}

function clearPresenceCookie(): void {
  document.cookie = `${COOKIE_NAME}=; SameSite=Strict; Max-Age=0; Path=/`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function readSession(): AuthUserPayload | null {
  try {
    // Presence cookie acts as the expiry gate — if it's gone, session is expired
    if (!hasPresenceCookie()) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(EXPIRY_KEY);
      return null;
    }

    // Double-check the explicit expiry timestamp (guards against localStorage not being cleared)
    const expiryRaw = localStorage.getItem(EXPIRY_KEY);
    if (expiryRaw && Date.now() > Number(expiryRaw)) {
      clearSession();
      return null;
    }

    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      clearPresenceCookie();
      return null;
    }

    const data = JSON.parse(raw) as AuthUserPayload | null;
    if (!data?.token || !data.email) {
      clearSession();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function writeSession(data: AuthUserPayload): void {
  setPresenceCookie();
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + SESSION_TTL_MS));
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession(): void {
  clearPresenceCookie();
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}
