import { apiJson } from './client';
import type { AuthUserPayload } from './types';

export async function registerUser(payload: { name: string; email: string; password: string }) {
  return apiJson<AuthUserPayload>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: { email: string; password: string }) {
  return apiJson<AuthUserPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginWithGoogle(idToken: string) {
  return apiJson<AuthUserPayload>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

/** Current user document (no token in body). */
export async function fetchUserProfile(token: string) {
  return apiJson<Record<string, unknown>>('/api/auth/profile', {
    method: 'GET',
    token,
  });
}
