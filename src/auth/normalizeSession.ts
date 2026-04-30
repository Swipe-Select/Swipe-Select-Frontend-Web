import type { AuthUserPayload } from '../api/types';

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

  return { _id, name: name || '', email: emailOk, token: token.trim(), onboardingStep };
}
