import type { AuthUserPayload, UserPreferences, UserProfile } from '../api/types';

export function asUserProfile(value: unknown): UserProfile | undefined {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as UserProfile;
}

export function asUserPreferences(value: unknown): UserPreferences | undefined {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as UserPreferences;
}

/** Normalize API payloads before persisting — avoids stale React context vs Navigate race and bad _id/email shapes. */
export function normalizeAuthPayload(input: unknown): AuthUserPayload | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  const token = o.token;
  const email = o.email;

  if (typeof token !== 'string' || !token.trim()) return null;

  let emailOk = '';
  if (typeof email === 'string' && email.trim()) emailOk = email.trim();

  let name =
    typeof o.name === 'string'
      ? o.name
      : o.name !== undefined && o.name !== null
        ? String(o.name)
        : '';

  let _id =
    typeof o._id === 'string'
      ? o._id
      : o._id !== undefined && o._id !== null
        ? String(o._id)
        : '';

  const onboardingStep =
    typeof o.onboardingStep === 'number' && Number.isFinite(o.onboardingStep)
      ? o.onboardingStep
      : undefined;

  if (!emailOk) return null;

  const profile = asUserProfile(o.profile);
  const preferences = asUserPreferences(o.preferences);

  return {
    _id,
    name: name || '',
    email: emailOk,
    token: token.trim(),
    onboardingStep,
    ...(profile !== undefined ? { profile } : {}),
    ...(preferences !== undefined ? { preferences } : {}),
  };
}

/** Merge `GET /api/auth/profile` user payload into the stored session (keeps JWT). */
export function mergeProfileIntoSession(
  current: AuthUserPayload,
  profileBody: unknown,
): AuthUserPayload {
  if (!profileBody || typeof profileBody !== 'object') return current;
  const u = profileBody as Record<string, unknown>;
  const onboardingStep =
    typeof u.onboardingStep === 'number' && Number.isFinite(u.onboardingStep)
      ? u.onboardingStep
      : current.onboardingStep;
  const name = typeof u.name === 'string' ? u.name : current.name;
  const email =
    typeof u.email === 'string' && u.email.trim() ? u.email.trim() : current.email;
  const _id = u._id != null ? String(u._id) : current._id;

  const profile = asUserProfile(u.profile);
  const preferences = asUserPreferences(u.preferences);

  return {
    ...current,
    _id,
    name,
    email,
    onboardingStep,
    token: current.token,
    ...(profile !== undefined ? { profile } : {}),
    ...(preferences !== undefined ? { preferences } : {}),
  };
}
