/**
 * onboardingDraft.ts
 *
 * Typed helpers for persisting onboarding wizard state to localStorage so that
 * users can refresh the page mid-flow without losing their progress.
 *
 * Key: "onb_draft_v1"  (versioned — bump to v2 if the schema changes)
 * Cleared: automatically when onboarding finishes successfully.
 */

import type { ProfileEducation, ProfileProject, ProfileCertification } from '../api/types';

const DRAFT_KEY = 'onb_draft_v1';

export type WorkExperienceEntry = {
  id: string;
  title: string;
  employer: string;
  startMonth: string;
  endMonth: string | null;
  location: string;
};

export type OnboardingDraft = {
  // Navigation
  step: number;
  entryMode: 'resume' | 'manual' | null;

  // Step 0 — identity
  gender: 'female' | 'male' | 'nonbinary';

  // Step 2 — personal
  personalFullName: string;
  personalEmail: string;
  personalDialCode: string;
  personalPhone: string;

  // Step 3 — notifications
  notifAppStatus: boolean;
  notifJobRec: boolean;
  notifAppInfo: boolean;

  // Step 4 — resume builder
  workExperiences: WorkExperienceEntry[];
  education: ProfileEducation[];
  projects: ProfileProject[];
  skills: string[];
  certifications: ProfileCertification[];
  interests: string[];

  // Step 6 — roles
  roles: string[];

  // Step 8 — base location
  selectedBaseLocation: string;

  // Step 9 — target locations
  targetLocations: Array<{ city: string; country: string }>;

  // Step 10 — work preference
  workPrefs: Array<'remote' | 'hybrid' | 'office'>;

  // Step 11 — employment
  employment: string[];

  // Step 12 — experience level
  experienceLevel: string;
};

/** Read the draft from localStorage. Returns a partial object — callers must supply defaults for missing keys. */
export function readDraft(): Partial<OnboardingDraft> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

/** Write (merge) fields into the draft. Merges with any existing draft to avoid overwriting unrelated keys. */
export function writeDraft(fields: Partial<OnboardingDraft>): void {
  try {
    const current = readDraft();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, ...fields }));
  } catch {
    // Quota exceeded or private-browsing restriction — fail silently.
  }
}

/** Remove the draft entirely. Call this after a successful onboarding finish. */
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore
  }
}
