import { apiJson, apiBaseUrl } from './client';

export type PreferencesBody = {
  jobTitles?: string[];
  targetCountries?: string[];
  baseLocation?: string;
  workLocations?: string[];
  workMode?: string[];
  jobTypes?: string[];
  experienceLevel?: string[];
  onboardingStep?: number;
  gender?: 'female' | 'male' | 'nonbinary';
};

export async function savePreferences(preferences: PreferencesBody, token: string) {
  return apiJson<{ preferences: unknown; onboardingStep?: number }>('/api/onboarding/preferences', {
    method: 'POST',
    body: JSON.stringify(preferences),
    token,
  });
}

/** Upload PDF resume — backend accepts PDF only, max 5MB, field name `resume`. */
export async function extractResumePdf(file: File, token: string) {
  const url = `${apiBaseUrl}/api/onboarding/resume-extract`;
  const fd = new FormData();
  fd.append('resume', file);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: fd,
  });
  const json = (await res.json()) as
    | { success: true; message?: string; data: unknown }
    | { success: false; message?: string };
  return { ok: res.ok, status: res.status, json };
}
