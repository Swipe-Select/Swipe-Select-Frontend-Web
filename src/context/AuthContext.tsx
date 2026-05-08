import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import type { AuthUserPayload } from '../api/types';
import { fetchUserProfile, loginUser, loginWithGoogle, registerUser } from '../api/auth';
import { mergeProfileIntoSession, normalizeAuthPayload } from '../auth/normalizeSession';
import { clearSession, readSession, writeSession } from '../auth/storage';
import { apiJson } from '../api/client';

type AuthCtx = {
  session: AuthUserPayload | null;
  setSession: (s: AuthUserPayload | null) => void;
  /** Re-fetch `GET /api/auth/profile` and merge into session (updates onboardingStep, name, etc.). */
  refreshSession: () => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
  }) => Promise<string | undefined>;
  login: (payload: { email: string; password: string }) => Promise<string | undefined>;
  googleLogin: (idToken: string) => Promise<string | undefined>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSessionState] = useState<AuthUserPayload | null>(() => readSession());

  /** Persist + sync React immediately so Navigate after OAuth/email auth sees token. */
  const commitPayload = useCallback((raw: unknown): string | undefined => {
    const next = normalizeAuthPayload(raw);
    if (!next) {
      return 'Invalid session from server. Please try signing in again.';
    }
    writeSession(next);
    flushSync(() => {
      setSessionState(next);
    });
    return undefined;
  }, []);

  const setSession = useCallback((s: AuthUserPayload | null) => {
    if (!s) {
      clearSession();
      setSessionState(null);
      return;
    }
    writeSession(s);
    setSessionState(s);
  }, []);

  const refreshSession = useCallback(async () => {
    const s = readSession();
    if (!s?.token?.trim()) return;
    const { ok, status, json } = await fetchUserProfile(s.token);
    if (status === 401) {
      clearSession();
      setSessionState(null);
      return;
    }
    if (!ok || !json || typeof json !== 'object' || !('success' in json)) return;
    if (!(json as { success: boolean }).success) return;
    const data = (json as { data?: unknown }).data;
    if (!data || typeof data !== 'object') return;
    const next = mergeProfileIntoSession(s, data);
    writeSession(next);
    setSessionState(next);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string }) => {
      const { ok, json } = await registerUser(payload);
      if (!ok || !('success' in json) || !json.success || !('data' in json)) {
        const msg =
          json && typeof json === 'object' && 'message' in json
            ? String((json as { message?: string }).message)
            : undefined;
        return msg ?? 'Registration failed';
      }
      return commitPayload(json.data);
    },
    [commitPayload],
  );

  const login = useCallback(
    async (payload: { email: string; password: string }) => {
      const { ok, json } = await loginUser(payload);
      if (!ok || !('success' in json) || !json.success || !('data' in json)) {
        const msg =
          json && typeof json === 'object' && 'message' in json
            ? String((json as { message?: string }).message)
            : undefined;
        return msg ?? 'Login failed';
      }
      return commitPayload(json.data);
    },
    [commitPayload],
  );

  const googleLoginFn = useCallback(
    async (idToken: string) => {
      const { ok, json } = await loginWithGoogle(idToken);
      if (!ok || !('success' in json) || !json.success || !('data' in json)) {
        const msg =
          json && typeof json === 'object' && 'message' in json
            ? String((json as { message?: string }).message)
            : undefined;
        return msg ?? 'Google sign-in failed';
      }
      return commitPayload(json.data);
    },
    [commitPayload],
  );

  const logout = useCallback(() => {
    // Tell the backend to clear its HttpOnly cookie — fire-and-forget, never blocks UI
    void apiJson('/api/auth/logout', { method: 'POST' });
    clearSession();
    setSessionState(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      setSession,
      refreshSession,
      register,
      login,
      googleLogin: googleLoginFn,
      logout,
    }),
    [session, setSession, refreshSession, register, login, googleLoginFn, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
