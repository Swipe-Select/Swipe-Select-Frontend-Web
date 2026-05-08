/** Default assumes backend README `PORT=5000` when `.env` is not set */
export const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? 'http://localhost:5000';

export type ApiSuccess<T> = { success: true; message?: string | null; data: T };

export async function apiJson<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<{ ok: boolean; status: number; json: ApiSuccess<T> | { success: false; message?: string; data: null } }> {
  const url = `${apiBaseUrl}${path}`;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }
  const body = options.body;
  if (body && typeof body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, {
    ...options,
    headers,
    // Send the HttpOnly auth cookie on every request so the backend can
    // authenticate via cookie (web) or Bearer token (mobile/API clients).
    credentials: 'include',
  });
  const json = (await res.json()) as ApiSuccess<T> | { success: false; message?: string; data: null };
  return { ok: res.ok, status: res.status, json };
}
