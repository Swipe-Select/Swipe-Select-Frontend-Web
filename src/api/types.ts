/** Mirrors backend `User.profile` (Mongoose schema). */
export type ProfileEducation = { school: string; degree: string; date: string };
export type ProfileWorkExperience = {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
};
export type ProfileProject = { name: string; website: string; date: string; description: string };
export type ProfileCertification = { name: string; link: string };

export type UserProfile = {
  gender?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  education?: ProfileEducation[];
  workExperience?: ProfileWorkExperience[];
  projects?: ProfileProject[];
  skills?: string[];
  certifications?: ProfileCertification[];
  interests?: string[];
};

/** Mirrors backend `User.preferences`. */
export type UserPreferences = {
  jobTitles?: string[];
  targetCountries?: string[];
  baseLocation?: string;
  workLocations?: string[];
  workMode?: string[];
  jobTypes?: string[];
  experienceLevel?: string[];
};

export type AuthUserPayload = {
  _id: string;
  name: string;
  email: string;
  onboardingStep?: number;
  token: string;
  /** From auth responses and `GET /api/auth/profile` — resume extraction fills this. */
  profile?: UserProfile;
  /** From auth responses, profile endpoint, and `POST /api/onboarding/preferences` response. */
  preferences?: UserPreferences;
};
