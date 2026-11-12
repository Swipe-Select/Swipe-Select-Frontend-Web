import React, { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OnboardingLocationMap, type OnboardingLocationMapHandle } from "../components/onboarding/OnboardingLocationMap";
import { mapboxForwardGeocode } from "../lib/mapboxGeocoding";

import { useNavigate } from "react-router-dom";
import { BRAND_NAME } from "../brand";
import { onboardingAssets as ast } from "../figma/onboardingAssets";
import { extractResumePdf, savePreferences } from "../api/onboarding";
import { ONBOARDING_COMPLETE_STEP } from "../auth/onboardingStep";
import { asUserPreferences, asUserProfile } from "../auth/normalizeSession";
import { useAuth } from "../context/AuthContext";
import type { ProfileEducation, ProfileProject, ProfileCertification } from "../api/types";
import { readDraft, writeDraft, clearDraft } from "../auth/onboardingDraft";
import { User, Mail, Phone, ShieldCheck, Lock, CheckCircle2, Briefcase, GraduationCap, FolderGit2, Sparkles, Award, Heart, Plus, Edit2, Trash2, Check, ExternalLink, ArrowRight, X, Search, MapPin, MapPinOff, FileText, Clock } from "lucide-react";
import { OnboardingTopBar } from "../components/onboarding/OnboardingTopBar";
import "./OnboardingPage.css";

type GenderId = "female" | "male" | "nonbinary";
type OnboardingEntryMode = "resume" | "manual" | null;
type WorkPrefId = "remote" | "hybrid" | "office";
type WorkExperienceEntry = {
  id: string;
  title: string;
  employer: string;
  startMonth: string;
  endMonth: string | null;
  location: string;
};

function workPrefLabel(w: WorkPrefId) {
  if (w === "remote") return "Remote";
  if (w === "hybrid") return "Hybrid";
  return "In Person";
}

/** [lng, lat] for onboarding step 8 popular rows (matches `city` + `region` keys). */
const POPULAR_BASE_LOCATION_LNG_LAT: Record<string, [number, number]> = {
  "San Francisco, California, US": [-122.4194, 37.7749],
  "New York, New York, US": [-74.006, 40.7128],
  "London, United Kingdom": [-0.1278, 51.5074],
  "Austin, Texas, US": [-97.7431, 30.2672],
  "Seattle, Washington, US": [-122.3321, 47.6062],
};

const DEFAULT_BASE_MAP_LNG_LAT = { lng: -74.006, lat: 40.7128 };

type LocationSource = "locationiq" | "photon" | "nominatim";

type LocationListRow = {
  label: string;
  city: string;
  region: string;
  country?: string;
  source: LocationSource;
  lngLat?: [number, number];
};

const SOURCE_PRIORITY: Record<LocationSource, number> = {
  locationiq: 3,
  photon: 2,
  nominatim: 1,
};

/** Normalize Gemini date strings (YYYY-MM-DD, YYYY-MM, "May 2024", etc.) to the "YYYY-MM" format required by <input type="month">. */
function toMonthStr(raw: string | undefined | null): string {
  if (!raw) return "";
  const s = raw.trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 7);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  return "";
}

const DIAL_CODE_OPTIONS: { code: string; label: string }[] = [
  { code: "+1", label: "US +1" },
  { code: "+44", label: "UK +44" },
  { code: "+61", label: "AU +61" },
  { code: "+91", label: "IN +91" },
  { code: "+92", label: "PK +92" },
  { code: "+880", label: "BD +880" },
  { code: "+971", label: "AE +971" },
  { code: "+966", label: "SA +966" },
  { code: "+49", label: "DE +49" },
  { code: "+33", label: "FR +33" },
  { code: "+34", label: "ES +34" },
  { code: "+39", label: "IT +39" },
  { code: "+31", label: "NL +31" },
  { code: "+41", label: "CH +41" },
  { code: "+43", label: "AT +43" },
  { code: "+46", label: "SE +46" },
  { code: "+47", label: "NO +47" },
  { code: "+48", label: "PL +48" },
  { code: "+353", label: "IE +353" },
  { code: "+86", label: "CN +86" },
  { code: "+81", label: "JP +81" },
  { code: "+82", label: "KR +82" },
  { code: "+65", label: "SG +65" },
  { code: "+60", label: "MY +60" },
  { code: "+62", label: "ID +62" },
  { code: "+63", label: "PH +63" },
  { code: "+52", label: "MX +52" },
  { code: "+55", label: "BR +55" },
  { code: "+27", label: "ZA +27" },
  { code: "+234", label: "NG +234" },
  { code: "+254", label: "KE +254" },
  { code: "+20", label: "EG +20" },
  { code: "+90", label: "TR +90" },
];

/** Parse an incoming full or partial phone string into a known dial code and local number */
function parsePhoneAndDialCode(
  rawPhone: string | undefined | null,
  fallbackDial: string = "+1"
): { dialCode: string; localNumber: string } {
  if (!rawPhone || !rawPhone.trim()) {
    return { dialCode: fallbackDial, localNumber: "" };
  }

  let cleaned = rawPhone.trim();

  // If there are duplicate '+' from previous concatenated saves like "+1+923144210756"
  if (cleaned.includes("+")) {
    const parts = cleaned.split("+").filter(Boolean);
    if (parts.length > 1) {
      cleaned = "+" + parts[parts.length - 1];
    }
  }

  // If starts with 00 (e.g. 00923144210756), normalize to +923144210756
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  const sortedCodes = [...DIAL_CODE_OPTIONS].sort((a, b) => b.code.length - a.code.length);

  // Case 1: Has leading '+'
  if (cleaned.startsWith("+")) {
    const compact = "+" + cleaned.slice(1).replace(/[\s\-\(\)\.]/g, "");
    for (const opt of sortedCodes) {
      if (compact.startsWith(opt.code)) {
        let local = compact.slice(opt.code.length).replace(/^0+/, "");
        return { dialCode: opt.code, localNumber: local };
      }
    }
    const generic = compact.match(/^(\+\d{1,4})(\d{6,14})$/);
    if (generic) {
      return { dialCode: generic[1], localNumber: generic[2].replace(/^0+/, "") };
    }
    return { dialCode: fallbackDial, localNumber: compact.replace(/^\+/, "").replace(/^0+/, "") };
  }

  // Case 2: Pure digits without '+' (e.g. 923144210756)
  const digitsOnly = cleaned.replace(/\D/g, "");
  for (const opt of sortedCodes) {
    const rawCode = opt.code.replace("+", "");
    if (digitsOnly.startsWith(rawCode) && digitsOnly.length - rawCode.length >= 7) {
      let local = digitsOnly.slice(rawCode.length).replace(/^0+/, "");
      return { dialCode: opt.code, localNumber: local };
    }
  }

  // Case 3: Local format starting with 0 (e.g. 03144210756)
  let local = cleaned;
  if (fallbackDial === "+92" && local.startsWith("03") && local.length === 11) {
    local = local.slice(1);
  }

  return { dialCode: fallbackDial, localNumber: local };
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { session, setSession } = useAuth();
  const mapboxEnvToken =
    import.meta.env.VITE_LOCATIONIQ_API_KEY?.trim() ??
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ??
    "";
  const locationMapRef = useRef<OnboardingLocationMapHandle>(null);
  const targetMapRef = useRef<OnboardingLocationMapHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Live-data refs (always current, avoids stale closures) ──
  const workExperiencesRef = useRef<WorkExperienceEntry[]>([]);
  const educationRef = useRef<ProfileEducation[]>([]);
  const projectsRef = useRef<ProfileProject[]>([]);
  const skillsRef = useRef<string[]>([]);
  const certificationsRef = useRef<ProfileCertification[]>([]);
  const interestsRef = useRef<string[]>([]);
  const personalFullNameRef = useRef('');
  const personalPhoneRef = useRef('');
  const personalDialCodeRef = useRef('+1');
  const genderRef = useRef<GenderId>('female');
  const rolesRef = useRef<string[]>([]);
  const workPrefsRef = useRef<WorkPrefId[]>([]);
  const employmentRef = useRef<string[]>([]);
  const experienceLevelRef = useRef<string>('');
  const selectedBaseLocationRef = useRef<string>('');
  const targetLocationsRef = useRef<Array<{ city: string; country: string }>>([]);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeErr, setResumeErr] = useState<string | null>(null);
  const [resumeOk, setResumeOk] = useState(false);
  // ── Initialise all state from the localStorage draft (resume logic) ──────────
  const _draft = readDraft();

  const [entryMode, setEntryMode] = useState<OnboardingEntryMode>(() => _draft.entryMode ?? null);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [step, setStep] = useState<number>(() => {
    const initial = Math.max(_draft.step ?? 0, session?.onboardingStep ?? 0);
    return initial === 3 ? 4 : initial;
  });
  const [navDir, setNavDir] = useState<'forward' | 'back'>('forward');
  const [stepError, setStepError] = useState<string | null>(null);
  const [gender, setGender] = useState<GenderId>(() => _draft.gender ?? "female");
  const [roles, setRoles] = useState<string[]>(() => _draft.roles ?? ["Software Engineer", "Product Manager"]);
  const [workPrefs, setWorkPrefs] = useState<WorkPrefId[]>(() => (_draft.workPrefs as WorkPrefId[] | undefined) ?? ["hybrid"]);
  const [employment, setEmployment] = useState<string[]>(() => _draft.employment ?? ["Full Time"]);
  const [experienceLevel, setExperienceLevel] = useState<string>(() => _draft.experienceLevel ?? "");
  const initialPhoneInfo = useMemo(() => {
    const raw = _draft.personalPhone ?? "";
    const dial = _draft.personalDialCode ?? "+1";
    if (raw && (raw.includes("+") || raw.startsWith("00") || raw.length >= 11)) {
      return parsePhoneAndDialCode(raw, dial);
    }
    return { dialCode: dial, localNumber: raw };
  }, []);

  const [personalFullName, setPersonalFullName] = useState<string>(() => _draft.personalFullName ?? "");
  const [personalEmail, setPersonalEmail] = useState<string>(() => _draft.personalEmail ?? "");
  const [personalDialCode, setPersonalDialCode] = useState<string>(() => initialPhoneInfo.dialCode);
  const [personalPhone, setPersonalPhone] = useState<string>(() => initialPhoneInfo.localNumber);
  const personalInitials = useMemo(() => {
    const parts = personalFullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [personalFullName]);
  const [workExperiences, setWorkExperiences] = useState<WorkExperienceEntry[]>(() => _draft.workExperiences ?? []);

  // Resume Builder sections
  const [education, setEducation] = useState<ProfileEducation[]>(() => _draft.education ?? []);
  const [projects, setProjects] = useState<ProfileProject[]>(() => _draft.projects ?? []);
  const [skills, setSkills] = useState<string[]>(() => _draft.skills ?? []);
  const [certifications, setCertifications] = useState<ProfileCertification[]>(() => _draft.certifications ?? []);
  const [interests, setInterests] = useState<string[]>(() => _draft.interests ?? []);


  const [activeBuildSection, setActiveBuildSection] = useState<string | null>(null);

  const deriveCommittedKeys = useCallback((
    weList: WorkExperienceEntry[],
    eduList: ProfileEducation[],
    projList: ProfileProject[],
    certList: ProfileCertification[]
  ) => {
    const keys = new Set<string>();
    weList.forEach(w => { if (w.title?.trim() && w.employer?.trim()) keys.add(`we-${w.id}`); });
    eduList.forEach((e, i) => { if (e.school?.trim() || e.degree?.trim()) keys.add(`edu-${i}`); });
    projList.forEach((p, i) => { if (p.name?.trim()) keys.add(`proj-${i}`); });
    certList.forEach((c, i) => { if (c.name?.trim()) keys.add(`cert-${i}`); });
    return keys;
  }, []);

  const [committedKeys, setCommittedKeys] = useState<Set<string>>(() => {
    return deriveCommittedKeys(
      _draft.workExperiences ?? [],
      _draft.education ?? [],
      _draft.projects ?? [],
      _draft.certifications ?? []
    );
  });
  const [newSkill, setNewSkill] = useState("");
  const [skillJustAdded, setSkillJustAdded] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [interestJustAdded, setInterestJustAdded] = useState(false);

  const [locationSearch, setLocationSearch] = useState("");
  const [selectedBaseLocation, setSelectedBaseLocation] = useState<string>(() => _draft.selectedBaseLocation ?? "New York, New York, US");
  const [baseMapLngLat, setBaseMapLngLat] = useState(DEFAULT_BASE_MAP_LNG_LAT);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationErr, setLocationErr] = useState<string | null>(null);
  const [locationResults, setLocationResults] = useState<LocationListRow[]>([]);
  const [targetLocations, setTargetLocations] = useState<Array<{ city: string; country: string }>>(() => _draft.targetLocations ?? []);
  const [targetLocationSearch, setTargetLocationSearch] = useState("");
  const [targetSuggestBusy, setTargetSuggestBusy] = useState(false);
  const [targetSuggestErr, setTargetSuggestErr] = useState<string | null>(null);
  const [targetSuggestRows, setTargetSuggestRows] = useState<LocationListRow[]>([]);
  const [targetMapLngLat, setTargetMapLngLat] = useState(DEFAULT_BASE_MAP_LNG_LAT);

  // ── Keep refs in sync with state (runs every render) ──
  workExperiencesRef.current = workExperiences;
  educationRef.current = education;
  projectsRef.current = projects;
  skillsRef.current = skills;
  certificationsRef.current = certifications;
  interestsRef.current = interests;
  personalFullNameRef.current = personalFullName;
  personalPhoneRef.current = personalPhone;
  personalDialCodeRef.current = personalDialCode;
  genderRef.current = gender;
  rolesRef.current = roles;
  workPrefsRef.current = workPrefs;
  employmentRef.current = employment;
  experienceLevelRef.current = experienceLevel;
  selectedBaseLocationRef.current = selectedBaseLocation;
  targetLocationsRef.current = targetLocations;

  const popularLocations = useMemo(
    () => [
    { city: "San Francisco", region: "California, US" },
    { city: "New York", region: "New York, US" },
    { city: "London", region: "United Kingdom" },
    { city: "Austin", region: "Texas, US" },
    { city: "Seattle", region: "Washington, US" },
    ],
    [],
  );
  const filteredPopularLocations = useMemo(
    () =>
      popularLocations.filter(({ city, region }) => {
    const query = locationSearch.trim().toLowerCase();
    if (!query) return true;
    return city.toLowerCase().includes(query) || region.toLowerCase().includes(query);
      }),
    [locationSearch, popularLocations],
  );

  // Token is usable as long as it is present and has not been explicitly rejected with a 401/403.
  // "unknown" (still validating or network error) is treated as valid so features aren't blocked.
  // Location features are active whenever the key is present.

  // Pre-populate Resume Builder from extracted resume data (runs once when profile becomes available)
  const profileSeededRef = useRef(false);
  useEffect(() => {
    if (profileSeededRef.current) return;
    const profile = session?.profile;
    if (!profile) return;
    profileSeededRef.current = true;

    let newWe: WorkExperienceEntry[] = [];
    if (profile.workExperience?.length) {
      newWe = profile.workExperience.map((we, i) => ({
        id: `seed-${i}`,
        title: we.title ?? "",
        employer: we.company ?? "",
        startMonth: toMonthStr(we.startDate),
        endMonth: we.endDate ? toMonthStr(we.endDate) : null,
        location: we.location ?? "",
      }));
      setWorkExperiences(newWe);
    }
    const newEdu = profile.education ? profile.education.map((e) => ({ ...e, date: toMonthStr(e.date) })) : [];
    if (newEdu.length) setEducation(newEdu);

    const newProj = profile.projects ? profile.projects.map((p) => ({ ...p, date: toMonthStr(p.date) })) : [];
    if (newProj.length) setProjects(newProj);

    if (profile.skills?.length) setSkills(profile.skills);
    
    const newCert = profile.certifications ? profile.certifications : [];
    if (newCert.length) setCertifications(newCert);
    
    if (profile.interests?.length) setInterests(profile.interests);

    if (profile.phone?.trim() && !personalPhoneRef.current) {
      const { dialCode, localNumber } = parsePhoneAndDialCode(profile.phone.trim(), personalDialCodeRef.current || "+1");
      setPersonalDialCode(dialCode);
      setPersonalPhone(localNumber);
      personalDialCodeRef.current = dialCode;
      personalPhoneRef.current = localNumber;
    }

    setCommittedKeys((prev) => {
      const added = deriveCommittedKeys(newWe, newEdu, newProj, newCert);
      return new Set([...prev, ...added]);
    });

    // Auto-open the first section that has data so user sees their extracted info immediately
    let firstSection: string | null = null;
    if (profile.workExperience?.length) firstSection = "work";
    else if (profile.education?.length) firstSection = "edu";
    else if (profile.projects?.length) firstSection = "proj";
    else if (profile.skills?.length) firstSection = "skills";
    else if (profile.certifications?.length) firstSection = "cert";
    else if (profile.interests?.length) firstSection = "interests";
    if (firstSection) setActiveBuildSection(firstSection);
  }, [session?.profile]);

  // ── Debounced draft persistence (300 ms) — saves all form state to localStorage ──
  useEffect(() => {
    const tid = window.setTimeout(() => {
      writeDraft({
        step,
        entryMode,
        gender,
        roles,
        workPrefs,
        employment,
        experienceLevel,
        personalFullName,
        personalEmail,
        personalDialCode,
        personalPhone,
        workExperiences,
        education,
        projects,
        skills,
        certifications,
        interests,
        selectedBaseLocation,
        targetLocations,
      });
    }, 300);
    return () => window.clearTimeout(tid);
  }, [
    step, entryMode, gender,
    roles, workPrefs, employment, experienceLevel,
    personalFullName, personalEmail, personalDialCode, personalPhone,
    workExperiences, education, projects, skills, certifications, interests,
    selectedBaseLocation, targetLocations,
  ]);

  // Reads from refs so it ALWAYS gets the latest state, never a stale closure.
  const syncProfileToDb = useCallback(async (stepOverride?: number) => {
    if (!session?.token) return;
    const we = workExperiencesRef.current;
    const edu = educationRef.current;
    const proj = projectsRef.current;
    const sk = skillsRef.current;
    const cert = certificationsRef.current;
    const intr = interestsRef.current;
    const fullName = personalFullNameRef.current;
    const phone = personalPhoneRef.current;
    const dialCode = personalDialCodeRef.current;
    const g = genderRef.current;
    
    const normalizeList = (values: string[]) =>
      Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
      
    const workPrefLabel = (id: WorkPrefId) => id === 'remote' ? 'Remote' : id === 'hybrid' ? 'Hybrid' : 'On-site';

    const normalizedWorkLocations = normalizeList(
      targetLocationsRef.current.map(({ city, country }) => `${city.trim()}, ${country.trim()}`)
    );
    const normalizedBaseLocation = selectedBaseLocationRef.current.trim();

    const cleanPhone = phone.trim();
    const formattedPhone = cleanPhone
      ? cleanPhone.startsWith('+')
        ? cleanPhone
        : `${dialCode}${cleanPhone.replace(/^0+/, '')}`
      : '';

    const profilePayload = {
      gender: g,
      firstName: fullName.split(' ')[0] || '',
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      phone: formattedPhone,
      workExperience: we.map(w => ({
        title: w.title,
        company: w.employer,
        location: w.location,
        startDate: w.startMonth,
        endDate: w.endMonth || ''
      })),
      education: edu.map(e => ({
        school: e.school,
        degree: e.degree,
        date: e.date
      })),
      projects: proj,
      skills: sk,
      certifications: cert,
      interests: intr
    };
    
    const payload: any = {
      profile: profilePayload,
      jobTitles: normalizeList(rolesRef.current),
      targetCountries: [],
      baseLocation: normalizedBaseLocation,
      workLocations: normalizedWorkLocations,
      workMode: normalizeList(workPrefsRef.current.map((pref) => workPrefLabel(pref))),
      jobTypes: normalizeList(employmentRef.current),
      experienceLevel: experienceLevelRef.current ? [experienceLevelRef.current] : []
    };
    
    if (stepOverride !== undefined) {
      payload.onboardingStep = stepOverride;
    }

    console.log('[syncProfileToDb] Sending payload:', JSON.stringify(payload, null, 2));
    await savePreferences(payload, session.token).catch((err) => console.error('[syncProfileToDb] error:', err));
  }, [session?.token]); // only depends on the token — data comes from refs

  const scoreLocationMatch = useCallback(
    (query: string, candidate: LocationListRow) => {
      const city = candidate.city.toLowerCase();
      const label = candidate.label.toLowerCase();
      const qLower = query.toLowerCase();

      if (city === qLower) return 100;
      if (city.startsWith(qLower)) return 80;
      if (label.includes(qLower)) return 50;
      return 10;
    },
    [],
  );

  const finalizeLocationResults = useCallback(
    (query: string, rawResults: LocationListRow[]) => {
      const deduped = Array.from(
        new Map(rawResults.map((entry) => [entry.label.toLowerCase(), entry])).values(),
      );
      const scored = deduped
        .map((entry) => ({ entry, score: scoreLocationMatch(query, entry) }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const sourceDelta = SOURCE_PRIORITY[b.entry.source] - SOURCE_PRIORITY[a.entry.source];
          if (sourceDelta !== 0) return sourceDelta;
          return a.entry.label.length - b.entry.label.length;
        })
        .map((item) => item.entry);

      return scored.slice(0, 8);
    },
    [scoreLocationMatch],
  );

  const commitEntry = useCallback((key: string) => {
    setCommittedKeys((s) => { const n = new Set(s); n.add(key); return n; });
    // Small delay so React flushes the latest state into refs before we read them
    window.setTimeout(() => { void syncProfileToDb(); }, 50);
  }, [syncProfileToDb]);

  const uncommitEntry = useCallback((key: string) => {
    setCommittedKeys((s) => { const n = new Set(s); n.delete(key); return n; });
  }, []);

  const addBlankWorkExp = useCallback(() =>
    setWorkExperiences((c) => [
      ...c,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: "", employer: "", startMonth: "", endMonth: null, location: "" },
    ]), []);

  const updateWorkExp = useCallback((id: string, field: keyof Omit<WorkExperienceEntry, "id">, value: string | null) =>
    setWorkExperiences((c) => c.map((e) => (e.id === id ? { ...e, [field]: value } : e))), []);

  const updateEducation = useCallback((i: number, field: keyof ProfileEducation, value: string) =>
    setEducation((c) => c.map((e, j) => (j === i ? { ...e, [field]: value } : e))), []);

  const updateProject = useCallback((i: number, field: keyof ProfileProject, value: string) =>
    setProjects((c) => c.map((e, j) => (j === i ? { ...e, [field]: value } : e))), []);

  const updateCertification = useCallback((i: number, field: keyof ProfileCertification, value: string) =>
    setCertifications((c) => c.map((e, j) => (j === i ? { ...e, [field]: value } : e))), []);

  const removeWorkExp = useCallback((id: string) => {
    setWorkExperiences((c) => c.filter((x) => x.id !== id));
    setCommittedKeys((s) => { const n = new Set(s); n.delete(`we-${id}`); return n; });
  }, []);

  const removeEducation = useCallback((i: number) => {
    setEducation((c) => c.filter((_, j) => j !== i));
    setCommittedKeys((s) => { const n = new Set(s); n.delete(`edu-${i}`); return n; });
  }, []);

  const removeProject = useCallback((i: number) => {
    setProjects((c) => c.filter((_, j) => j !== i));
    setCommittedKeys((s) => { const n = new Set(s); n.delete(`proj-${i}`); return n; });
  }, []);

  const removeCertification = useCallback((i: number) => {
    setCertifications((c) => c.filter((_, j) => j !== i));
    setCommittedKeys((s) => { const n = new Set(s); n.delete(`cert-${i}`); return n; });
  }, []);

  useEffect(() => {
    const q = locationSearch.trim();
    if (q.length < 2) {
      setLocationResults([]);
      setLocationErr(null);
      setLocationBusy(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocationBusy(true);
      setLocationErr(null);
      try {
        let rows: LocationListRow[] = [];
        try {
          rows = await mapboxForwardGeocode(q, mapboxEnvToken, undefined, controller.signal);
        } catch (apiErr) {
          if (apiErr instanceof DOMException && apiErr.name === "AbortError") return;
          // LocationIQ key invalid or unavailable — fall back to Nominatim
          const params = new URLSearchParams({ format: "jsonv2", addressdetails: "1", limit: "8", q });
          const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          if (res.ok) {
            const json = (await res.json()) as Array<{
              display_name?: string; lat?: string; lon?: string;
              address?: { city?: string; town?: string; village?: string; county?: string; state?: string; country?: string };
            }>;
            rows = json.map((entry) => {
              const city = entry.address?.city || entry.address?.town || entry.address?.village || entry.address?.county || q;
              const region = [entry.address?.state, entry.address?.country].filter(Boolean).join(", ");
              const label = entry.display_name || `${city}, ${region}`;
              const lat = Number(entry.lat); const lon = Number(entry.lon);
              return { label, city, region, source: "nominatim" as const, lngLat: Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] as [number, number] : undefined };
            }).filter((r) => r.label.trim().length > 0);
          }
        }
        setLocationResults(finalizeLocationResults(q, rows));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLocationErr("Could not load locations right now. Type a location and select it directly.");
        setLocationResults([]);
      } finally {
        setLocationBusy(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [locationSearch, finalizeLocationResults, mapboxEnvToken]);

  const selectTypedLocation = useCallback(async () => {
    const q = locationSearch.trim();
    if (!q) return;
    setSelectedBaseLocation(q);
    setLocationBusy(true);
    setLocationErr(null);
    try {
      let rows: LocationListRow[] = [];
      try {
        rows = await mapboxForwardGeocode(q, mapboxEnvToken);
      } catch {
        // LocationIQ unavailable — try Nominatim for coordinates
        const params = new URLSearchParams({ format: "jsonv2", addressdetails: "1", limit: "1", q });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const json = (await res.json()) as Array<{ lat?: string; lon?: string }>;
          const first = json[0];
          if (first?.lat && first?.lon) {
            setBaseMapLngLat({ lng: Number(first.lon), lat: Number(first.lat) });
            setLocationBusy(false);
            return;
          }
        }
      }
      const first = rows[0];
      if (first?.lngLat) setBaseMapLngLat({ lng: first.lngLat[0], lat: first.lngLat[1] });
    } catch {
      // Map pin stays at current position — not a blocking error.
    } finally {
      setLocationBusy(false);
    }
  }, [locationSearch, mapboxEnvToken]);

  useEffect(() => {
    const q = targetLocationSearch.trim();
    if (q.length < 2) {
      setTargetSuggestBusy(false);
      setTargetSuggestErr(null);
      setTargetSuggestRows([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setTargetSuggestBusy(true);
      setTargetSuggestErr(null);
      try {
        let rows: LocationListRow[] = [];
        try {
          rows = await mapboxForwardGeocode(q, mapboxEnvToken, { limit: 6 }, controller.signal);
        } catch (apiErr) {
          if (apiErr instanceof DOMException && apiErr.name === "AbortError") return;
          // LocationIQ unavailable — fall back to Nominatim
          const params = new URLSearchParams({ format: "jsonv2", addressdetails: "1", limit: "6", q });
          const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          if (res.ok) {
            const json = (await res.json()) as Array<{
              display_name?: string; lat?: string; lon?: string;
              address?: { city?: string; town?: string; village?: string; county?: string; state?: string; country?: string };
            }>;
            rows = json.map((entry) => {
              const city = entry.address?.city || entry.address?.town || entry.address?.village || entry.address?.county || q;
              const region = [entry.address?.state, entry.address?.country].filter(Boolean).join(", ");
              const label = entry.display_name || `${city}, ${region}`;
              const lat = Number(entry.lat); const lon = Number(entry.lon);
              return { label, city, region, country: entry.address?.country, source: "nominatim" as const, lngLat: Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] as [number, number] : undefined };
            }).filter((r) => r.label.trim().length > 0);
          }
        }
        setTargetSuggestRows(rows);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setTargetSuggestErr("Could not load suggestions.");
        setTargetSuggestRows([]);
      } finally {
        setTargetSuggestBusy(false);
      }
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [targetLocationSearch, mapboxEnvToken]);

  const next = useCallback(() => {
    setStep((currentStep) => {
      if (currentStep === 1) {
        if (resumeBusy) {
          setStepError("Please wait until resume upload is complete.");
          return currentStep;
        }
        if (!resumeOk && entryMode !== "manual") {
          setStepError("Upload and parse your resume, or choose fill out manually.");
          return currentStep;
        }
      }

      if (currentStep === 2) {
        const hasName = personalFullName.trim().length > 1;
        const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail.trim());
        const hasPhone = personalPhone.trim().length >= 6;
        if (!hasName || !hasEmail || !hasPhone) {
          setStepError("Please complete your full name, valid email, and phone number before continuing.");
          return currentStep;
        }
      }

      if (currentStep === 6 && roles.length === 0) {
        setStepError("Select at least one role to continue.");
        return currentStep;
      }

      // Step 7 (Available Countries) removed — jump straight from 6 to 8.

      if (currentStep === 9 && targetLocations.length === 0) {
        setStepError("Add at least one target location before continuing.");
        return currentStep;
      }

      if (currentStep === 10 && workPrefs.length === 0) {
        setStepError("Select at least one work preference to continue.");
        return currentStep;
      }

      if (currentStep === 11 && employment.length === 0) {
        setStepError("Select at least one employment model to continue.");
        return currentStep;
      }

      if (currentStep === 12 && !experienceLevel) {
        setStepError("Select one experience level to continue.");
        return currentStep;
      }

      let nextStep = currentStep;
      if (currentStep === 1) {
        if (resumeOk || entryMode === "manual") nextStep = 2;
      } else if (currentStep === 2) {
        nextStep = 4; // Step 3 (notifications) removed
      } else if (currentStep === 3) {
        nextStep = 4;
      } else if (currentStep === 6) {
        nextStep = 8;
      } else {
        nextStep = Math.min(currentStep + 1, 12);
      }

      // Background save when progressing
      if (currentStep !== 12 && nextStep !== currentStep) {
        void syncProfileToDb(nextStep);
      }

      setStepError(null);
      setNavDir('forward');
      return nextStep;
    });
  }, [
    entryMode,
    resumeBusy,
    resumeOk,
    personalFullName,
    personalEmail,
    personalPhone,
    roles.length,
    targetLocations.length,
    employment.length,
    experienceLevel,
    workPrefs.length,
    syncProfileToDb,
  ]);
  const back = useCallback(() => {
    setStepError(null);
    setNavDir('back');
    setStep((s) => {
      if (s === 4) return 2; // step 3 (notifications) removed
      if (s === 8) return 6; // step 7 removed
      return Math.max(s - 1, 0);
    });
  }, []);

  const submitResumePdf = useCallback(
    async (file: File) => {
      if (!session?.token) {
        navigate("/login", { replace: true });
        return;
      }
      setResumeErr(null);
      const lowerName = file.name?.toLowerCase() ?? "";
      const okType =
        file.type === "application/pdf" ||
        file.type === "application/octet-stream" ||
        lowerName.endsWith(".pdf");
      if (!okType) {
        setResumeErr("Please upload a PDF file. DOCX/DOC support is planned; use PDF for extraction.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setResumeErr("File is too large. Maximum upload size is 5 MB.");
        return;
      }
      setResumeBusy(true);
      try {
        const { ok, json } = await extractResumePdf(file, session.token);
        if (!ok || !json.success || !("data" in json && json.data)) {
          const msg =
            json && typeof json === "object" && "message" in json
              ? String((json as { message?: string }).message)
              : "Upload failed";
          setResumeErr(msg);
          return;
        }
        setResumeOk(true);
        setEntryMode("resume");
        setStepError(null);
        if (session) {
          const profile = asUserProfile(json.data);
          setSession({
            ...session,
            onboardingStep: 1,
            ...(profile !== undefined ? { profile } : {}),
          });
          // Seed resume builder state directly so the data shows on step 4
          if (profile) {
            profileSeededRef.current = false; // allow effect to re-run with fresh data
            
            // Seed personal info
            const fName = profile.firstName?.trim() || "";
            const lName = profile.lastName?.trim() || "";
            if (fName || lName) setPersonalFullName(`${fName} ${lName}`.trim());
            if (profile.phone?.trim()) {
              const { dialCode, localNumber } = parsePhoneAndDialCode(profile.phone.trim(), personalDialCodeRef.current || "+1");
              setPersonalDialCode(dialCode);
              setPersonalPhone(localNumber);
              personalDialCodeRef.current = dialCode;
              personalPhoneRef.current = localNumber;
            }
            // Session email is fallback if profile doesn't have it parsed
            setPersonalEmail(session.email || "");

            let newWe: WorkExperienceEntry[] = [];
            if (profile.workExperience?.length) {
              newWe = profile.workExperience.map((we, i) => ({
                id: `extract-${i}`,
                title: we.title ?? "",
                employer: we.company ?? "",
                startMonth: toMonthStr(we.startDate),
                endMonth: we.endDate ? toMonthStr(we.endDate) : null,
                location: we.location ?? "",
              }));
              setWorkExperiences(newWe);
            }
            const newEdu = profile.education ? profile.education.map((e) => ({ ...e, date: toMonthStr(e.date) })) : [];
            if (newEdu.length) setEducation(newEdu);

            const newProj = profile.projects ? profile.projects.map((p) => ({ ...p, date: toMonthStr(p.date) })) : [];
            if (newProj.length) setProjects(newProj);

            if (profile.skills?.length) setSkills(profile.skills);
            
            const newCert = profile.certifications ? profile.certifications : [];
            if (newCert.length) setCertifications(newCert);

            if (profile.interests?.length) setInterests(profile.interests);

            setCommittedKeys((prev) => {
              const added = deriveCommittedKeys(newWe, newEdu, newProj, newCert);
              return new Set([...prev, ...added]);
            });
            // Auto-open the first section that has data
            if (profile.workExperience?.length) setActiveBuildSection("work");
            else if (profile.education?.length) setActiveBuildSection("edu");
            else if (profile.projects?.length) setActiveBuildSection("proj");
            else if (profile.skills?.length) setActiveBuildSection("skills");
            else if (profile.certifications?.length) setActiveBuildSection("cert");
          }
        }
      } catch {
        setResumeErr("Resume upload failed. Please try again.");
      } finally {
        setResumeBusy(false);
      }
    },
    [session, navigate, setSession],
  );

  const finish = useCallback(async () => {
    if (!session?.token) {
      navigate("/login", { replace: true });
      return;
    }
    const normalizeList = (values: string[]) =>
      Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
    const normalizedWorkLocations = normalizeList(
      targetLocations.map(({ city, country }) => `${city.trim()}, ${country.trim()}`),
    );
    const normalizedBaseLocation = selectedBaseLocation.trim();

    setPrefsBusy(true);

    const cleanPhoneFinal = personalPhoneRef.current.trim();
    const formattedPhoneFinal = cleanPhoneFinal
      ? cleanPhoneFinal.startsWith('+')
        ? cleanPhoneFinal
        : `${personalDialCodeRef.current}${cleanPhoneFinal.replace(/^0+/, '')}`
      : '';

    const profilePayload = {
      gender: genderRef.current,
      firstName: personalFullNameRef.current.split(' ')[0] || '',
      lastName: personalFullNameRef.current.split(' ').slice(1).join(' ') || '',
      phone: formattedPhoneFinal,
      workExperience: workExperiencesRef.current.map(w => ({
        title: w.title,
        company: w.employer,
        location: w.location,
        startDate: w.startMonth,
        endDate: w.endMonth || ''
      })),
      education: educationRef.current.map(e => ({
        school: e.school,
        degree: e.degree,
        date: e.date
      })),
      projects: projectsRef.current,
      skills: skillsRef.current,
      certifications: certificationsRef.current,
      interests: interestsRef.current
    };

    const { ok, json } = await savePreferences(
      {
        jobTitles: normalizeList(roles),
        targetCountries: [],
        baseLocation: normalizedBaseLocation,
        workLocations: normalizedWorkLocations,
        workMode: normalizeList(workPrefs.map((pref) => workPrefLabel(pref))),
        jobTypes: normalizeList(employment),
        experienceLevel: experienceLevel ? [experienceLevel] : [],
        onboardingStep: ONBOARDING_COMPLETE_STEP,
        profile: profilePayload,
      },
      session.token,
    );
    setPrefsBusy(false);
    if (!ok || !('success' in json) || !json.success) {
      const msg =
        json && typeof json === 'object' && 'message' in json
          ? String((json as { message?: string }).message)
          : 'Could not save your preferences.';
      alert(msg);
      return;
    }
    const prefsData =
      json.success && typeof json === 'object' && 'data' in json
        ? (json.data as { onboardingStep?: number; preferences?: unknown })
        : {};
    const nextStep = prefsData.onboardingStep ?? ONBOARDING_COMPLETE_STEP;
    const preferences = asUserPreferences(prefsData.preferences);
    if (session) {
      setSession({
        ...session,
        onboardingStep: nextStep,
        ...(preferences !== undefined ? { preferences } : {}),
      });
    }
    clearDraft();
    navigate('/onboarding/complete');
  }, [
    navigate,
    session,
    setSession,
    roles,
    workPrefs,
    employment,
    experienceLevel,
    selectedBaseLocation,
    targetLocations,
    gender,
    personalFullName,
    personalPhone,
    personalDialCode,
    workExperiences,
    education,
    projects,
    skills,
    certifications,
    interests,
  ]);

  const toggleRole = (name: string) => {
    setRoles((r) => (r.includes(name) ? r.filter((x) => x !== name) : [...r, name]));
  };

  const toggleEmployment = (name: string) => {
    setEmployment((r) => (r.includes(name) ? r.filter((x) => x !== name) : [...r, name]));
  };

  const selectExperienceLevel = (name: string) => {
    setExperienceLevel(name);
  };

  const addTargetLocation = (city: string, country: string) => {
    const cityRaw = city.trim();
    const countryRaw = country.trim();
    if (!cityRaw || !countryRaw) return;
    setTargetLocations((current) => {
      const exists = current.some(
        (entry) =>
          entry.city.toLowerCase() === cityRaw.toLowerCase() &&
          entry.country.toLowerCase() === countryRaw.toLowerCase(),
      );
      if (exists) return current;
      return [...current, { city: cityRaw, country: countryRaw }];
    });
    setTargetLocationSearch("");
    setTargetSuggestRows([]);
  };

  const removeTargetLocation = (city: string, country: string) => {
    setTargetLocations((current) =>
      current.filter(
        (entry) =>
          !(entry.city.toLowerCase() === city.toLowerCase() && entry.country.toLowerCase() === country.toLowerCase()),
      ),
    );
  };

  const footer = (variant: "default" | "narrow" = "default") => (
    <footer className={`onb-footer${variant === "narrow" ? " onb-footer--padded" : ""}`}>
      <p className="onb-footer-copy">
        © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
      </p>
      <nav className="onb-footer-links" aria-label="Legal">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Help Center</a>
      </nav>
    </footer>
  );

  // ── Derived navigation state for TopBar / BottomBar ──────────────────────────
  const isMapStep     = step === 8;
    const showBottomBar = !isMapStep && step !== 5;

  const continueLabel =
    step === 5 ? "Let's Go" :
    step === 10 ? 'Save Preferences' :
    step === 11 ? 'Save & Continue'  :
    step === 12 ? 'Continue to Profile' :
    'Continue';

  const continueDisabled =
    (step === 1 && (resumeBusy || (!resumeOk && entryMode !== 'manual'))) ||
    (step === 12 && (prefsBusy || !experienceLevel));

  const handleContinue = step === 12 ? () => { void finish(); } : next;

  return (
    <div
      className={`onb page-fill${step === 8 ? " onb--loc-step" : ""}`}
      style={
        step === 8
          ? {
              height: "calc(100dvh - var(--onb-topbar-height, 68px))",
              maxHeight: "calc(100dvh - var(--onb-topbar-height, 68px))",
              overflow: "hidden",
            }
          : undefined
      }
    >
      {/* ── Shared sticky Top Bar (Back button + progress dots) ── */}
      <OnboardingTopBar
        step={step}
        totalSteps={13}
        canGoBack={true}
        onBack={() => { if (step > 0) { back(); } else { navigate('/welcome'); } }}
      />

      {stepError ? (
        <div
          role="alert"
          style={{
            margin: "8px auto 0",
            maxWidth: 960,
            width: "calc(100% - 48px)",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 14,
          }}
        >
          {stepError}
        </div>
      ) : null}
      <div key={step} className={`onb-step-stage onb-step-stage--${navDir}`}>

      {step === 0 && (
        <div className="onb-step-wrapper">
          <div className="onb-step-card onb-step-card--identity">
            <div className="onb-step-card-header">
              <div className="onb-step-badge">
                <span className="onb-step-badge-dot" />
                <span>Step 1 of 11 • Identity</span>
              </div>
              <h1 className="onb-h1">How do you identify?</h1>
              <p className="onb-sub">
                This information helps us tailor your professional networking experience and ensure accurate representation. It will only be visible to you unless you choose to share it.
              </p>
            </div>

            <div className="onb-identity-grid">
              {(
                [
                  ["male", "Male", "👨"],
                  ["female", "Female", "👩"],
                  ["nonbinary", "Non-binary", "✨"],
                ] as const
              ).map(([id, title, emoji]) => {
                const isSelected = gender === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`onb-id-card${isSelected ? " onb-id-card--selected" : ""}`}
                    onClick={() => setGender(id)}
                    aria-pressed={isSelected}
                  >
                    <div className="onb-id-avatar-circle">
                      <span className="onb-id-avatar-emoji">{emoji}</span>
                    </div>
                    <div className="onb-id-text-wrap">
                      <p className={`onb-id-title${isSelected ? " onb-id-title--selected" : ""}`}>{title}</p>
                    </div>
                    <div className={`onb-id-radio${isSelected ? " onb-id-radio--sel" : ""}`}>
                      {isSelected && <div className="onb-id-radio-dot" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <>
          <div className="onb-resume-wrap">
            <div className="onb-resume-grid">
              <div className="onb-card onb-resume-upload-card">
                <div>
                  <h1 className="onb-h1">Upload your resume</h1>
                  <p className="onb-sub" style={{ marginTop: 8 }}>
                    We&apos;ll automatically extract your details and set up your professional profile.
                  </p>
                </div>
                <input
                  id="onboarding-resume-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void submitResumePdf(f);
                    e.target.value = "";
                  }}
                />
                <div
                  className="onb-dropzone"
                  onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
                  onDrop={(e: DragEvent<HTMLDivElement>) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) void submitResumePdf(f);
                  }}
                >
                  <div className="onb-drop-icon-wrap">
                    <img src={ast.resume.uploadCloud} alt="" width={37} height={27} />
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>Drag and drop your resume here</p>
                  <p className="onb-muted-sm" style={{ marginBottom: resumeErr ? 12 : resumeOk ? 12 : 32 }}>
                    PDF only — required for AI extraction (Max 5 MB, matches backend)
                  </p>
                  {resumeBusy ? (
                    <p style={{ margin: "0 0 12px", fontSize: 14, color: "#4648d4" }}>Uploading &amp; extracting…</p>
                  ) : null}
                  {resumeErr ? (
                    <p role="alert" style={{ margin: "0 0 16px", fontSize: 14, color: "#b91c1c" }}>
                      {resumeErr}
                    </p>
                  ) : null}
                  {resumeOk ? (
                    <p className="onb-resume-success-note">
                      Resume processed successfully. Click Continue when you are ready.
                    </p>
                  ) : null}
                  <div className="onb-or-row">
                    <div className="onb-or-line" />
                    <span className="onb-or-text">OR</span>
                    <div className="onb-or-line" />
                  </div>
                  <button
                    type="button"
                    disabled={resumeBusy}
                    className="onb-btn onb-btn-primary"
                    style={{ background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0" }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                  </button>
                </div>
                {!resumeOk ? (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 32,
                      padding: 17,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "auto",
                      flexShrink: 0,
                    }}
                  >
                    <div className="onb-flex-gap">
                      <img src={ast.resume.docPdf} alt="" width={18} height={19} />
                      <span className="onb-muted-sm" style={{ fontWeight: 500 }}>
                        Don&apos;t have a resume ready to upload?
                      </span>
                    </div>
                    <button
                      type="button"
                      className="onb-btn onb-flex-gap"
                      style={{ color: "#4648d4", fontSize: 14 }}
                      onClick={() => {
                        setEntryMode("manual");
                        setStepError(null);
                        setStep(2);
                      }}
                    >
                      Fill out manually
                      <img src={ast.resume.chevronLink} alt="" width={12} height={12} />
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="onb-card onb-resume-benefit-card">
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Why build your profile?</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                  <div className="onb-flex-gap" style={{ alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 9999,
                        background: "rgba(57,184,253,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <img src={ast.resume.iconFast} alt="" width={14} height={19} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 400 }}>Lightning Fast Setup</p>
                      <p className="onb-muted-sm" style={{ margin: "4px 0 0", lineHeight: 1.4 }}>
                        Save hours of manual data entry. Our AI parses your resume instantly.
                      </p>
                    </div>
                  </div>
                  <div className="onb-flex-gap" style={{ alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 9999,
                        background: "rgba(181,93,0,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <img src={ast.resume.iconVisibility} alt="" width={21} height={14} />
                    </div>
                    <div>
                      <p style={{ margin: 0 }}>Increased Visibility</p>
                      <p className="onb-muted-sm" style={{ margin: "4px 0 0", lineHeight: 1.4 }}>
                        Stand out to recruiters with a rich, structured professional profile.
                      </p>
                    </div>
                  </div>
                  <div className="onb-flex-gap" style={{ alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 9999,
                        background: "rgba(70,72,212,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <img src={ast.resume.iconMatch} alt="" width={20} height={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0 }}>Smart Matching</p>
                      <p className="onb-muted-sm" style={{ margin: "4px 0 0", lineHeight: 1.4 }}>
                        Get tailored job recommendations based on your skills and experience.
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 25, marginTop: 8 }}>
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #dcfce7",
                      borderRadius: 32,
                      padding: 17,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <img src={ast.resume.shield} alt="" width={13} height={16} />
                    <p style={{ margin: 0, fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
                      Your data is completely secure. We use enterprise-grade encryption and will never share your information without explicit permission.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </>
      )}

      {step === 2 && (
        <div className="onb-step-wrapper">
          <div className="onb-step-card onb-step-card--personal">
            <div className="onb-step-card-header">
              <div className="onb-step-badge">
                <span className="onb-step-badge-dot" />
                <span>Step 3 of 11 • Contact Information</span>
              </div>
              <h1 className="onb-h1">A little about you</h1>
              <p className="onb-sub">
                This helps us verify your professional profile and keep your account secure.
              </p>
            </div>

            <div className="onb-personal-form-body">
              {/* Section 1: Identity & Profile */}
              <div className="onb-rich-card">
                <div className="onb-rich-card-header">
                  <div className="onb-rich-card-title-wrap">
                    {personalInitials ? (
                      <div className="onb-section-avatar-circle" aria-hidden title={personalFullName}>
                        {personalInitials}
                      </div>
                    ) : (
                      <div className="onb-section-icon-wrap" aria-hidden>
                        <User size={15} strokeWidth={2.2} />
                      </div>
                    )}
                    <div>
                      <h3 className="onb-rich-card-title">Basic Details</h3>
                      <p className="onb-rich-card-subtitle">Your identity as shown to prospective employers</p>
                    </div>
                  </div>
                  <span className="onb-rich-card-badge">
                    <CheckCircle2 size={12} className="onb-badge-icon" />
                    Public Profile
                  </span>
                </div>

                <div className="onb-rich-card-body">
                  <div className="onb-field-group">
                    <label className="onb-label" htmlFor="onb-full-name">
                      Full name
                    </label>
                    <div className="onb-input-icon-wrap">
                      <User size={16} className="onb-input-icon" aria-hidden />
                      <input
                        id="onb-full-name"
                        name="fullName"
                        className="onb-input onb-input--with-icon"
                        type="text"
                        autoComplete="name"
                        placeholder="e.g. Jane Doe"
                        value={personalFullName}
                        onChange={(e) => setPersonalFullName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div className="onb-rich-card">
                <div className="onb-rich-card-header">
                  <div className="onb-rich-card-title-wrap">
                    <div className="onb-section-icon-wrap onb-section-icon-wrap--indigo" aria-hidden>
                      <Mail size={15} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 className="onb-rich-card-title">Contact & Communication</h3>
                      <p className="onb-rich-card-subtitle">Where verified companies deliver match updates</p>
                    </div>
                  </div>
                  <span className="onb-rich-card-badge onb-rich-card-badge--secure">
                    <Lock size={11} className="onb-badge-icon" />
                    Private & Secure
                  </span>
                </div>

                <div className="onb-rich-card-body">
                  <div className="onb-field-group">
                    <div className="onb-label-row">
                      <label className="onb-label" htmlFor="onb-work-email">
                        Work Email
                      </label>
                      <span className="onb-label-hint">Verification Required</span>
                    </div>
                    <div className="onb-input-icon-wrap">
                      <Mail size={15} className="onb-input-icon" aria-hidden />
                      <input
                        id="onb-work-email"
                        name="email"
                        className="onb-input onb-input--with-icon"
                        type="email"
                        autoComplete="email"
                        placeholder="name@company.com"
                        value={personalEmail}
                        onChange={(e) => setPersonalEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="onb-field-group">
                    <div className="onb-label-row">
                      <label className="onb-label" htmlFor="onb-phone-local">
                        Phone Number
                      </label>
                      <span className="onb-label-hint">Optional</span>
                    </div>
                    <div className="onb-phone-input-group">
                      <div className="onb-phone-select-wrap">
                        <label htmlFor="onb-phone-dial" className="onb-visually-hidden">
                          Country dial code
                        </label>
                        <select
                          id="onb-phone-dial"
                          className="onb-phone-dial-select"
                          value={personalDialCode}
                          onChange={(e) => setPersonalDialCode(e.target.value)}
                          aria-label="Country dial code"
                        >
                          {!DIAL_CODE_OPTIONS.some((o) => o.code === personalDialCode) && (
                            <option value={personalDialCode}>{personalDialCode}</option>
                          )}
                          {DIAL_CODE_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="onb-phone-input-wrap">
                        <Phone size={15} className="onb-phone-icon" aria-hidden />
                        <input
                          id="onb-phone-local"
                          name="phone"
                          className="onb-phone-local-input"
                          type="tel"
                          autoComplete="tel-national"
                          inputMode="tel"
                          placeholder="(555) 000-0000"
                          value={personalPhone}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.includes("+") || val.startsWith("00")) {
                              const parsed = parsePhoneAndDialCode(val, personalDialCode);
                              setPersonalDialCode(parsed.dialCode);
                              setPersonalPhone(parsed.localNumber);
                            } else {
                              setPersonalPhone(val);
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val) {
                              const parsed = parsePhoneAndDialCode(val, personalDialCode);
                              if (parsed.dialCode !== personalDialCode) {
                                setPersonalDialCode(parsed.dialCode);
                              }
                              setPersonalPhone(parsed.localNumber);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust & Privacy Guarantee Banner */}
              <div className="onb-privacy-banner">
                <div className="onb-privacy-icon-pill">
                  <ShieldCheck size={18} className="onb-privacy-shield" />
                </div>
                <div className="onb-privacy-content">
                  <p className="onb-privacy-headline">Enterprise-Grade Privacy</p>
                  <p className="onb-privacy-sub">
                    Your contact information is strictly protected. We never sell your personal data or reveal your direct phone number without your permission.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="onb-step-wrapper onb-step-wrapper--builder">
          <div className="onb-rb-header text-center">
            <div className="onb-step-badge">
              <span className="onb-step-badge-dot" />
              <span>Step 4 of 11 • Build Your Resume</span>
            </div>
            <h1 className="onb-h1">Build Your Resume</h1>
            <p className="onb-sub" style={{ marginTop: 8, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
              {resumeOk
                ? "Your resume data has been imported. Select any section below to review, edit, or add more details."
                : "Complete each section below to build a comprehensive professional profile."}
            </p>
          </div>

          <div className="onb-rb-layout">
            {/* ── Left Column: Master Section Navigator ── */}
            <aside className="onb-rb-master" aria-label="Resume sections">
              <div className="onb-rb-master-header">
                <span className="onb-rb-master-title">Sections</span>
                <span className="onb-rb-master-badge">6 Categories</span>
              </div>
              <div className="onb-rb-nav-list" role="tablist" aria-orientation="vertical">
                {/* 1. Work Experience */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={(activeBuildSection || "work") === "work"}
                  className={`onb-rb-nav-item ${(activeBuildSection || "work") === "work" ? "onb-rb-nav-item--active" : ""}`}
                  onClick={() => setActiveBuildSection("work")}
                >
                  <div className="onb-rb-nav-icon">
                    <Briefcase size={18} />
                  </div>
                  <div className="onb-rb-nav-text">
                    <span className="onb-rb-nav-label">Work Experience</span>
                    <span className="onb-rb-nav-sub">Professional roles</span>
                  </div>
                  <span className={`onb-rb-nav-count ${workExperiences.length > 0 ? "onb-rb-nav-count--has" : ""}`}>
                    {workExperiences.length}
                  </span>
                </button>

                {/* 2. Education */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={(activeBuildSection || "work") === "edu"}
                  className={`onb-rb-nav-item ${(activeBuildSection || "work") === "edu" ? "onb-rb-nav-item--active" : ""}`}
                  onClick={() => setActiveBuildSection("edu")}
                >
                  <div className="onb-rb-nav-icon">
                    <GraduationCap size={18} />
                  </div>
                  <div className="onb-rb-nav-text">
                    <span className="onb-rb-nav-label">Education</span>
                    <span className="onb-rb-nav-sub">Degrees &amp; schools</span>
                  </div>
                  <span className={`onb-rb-nav-count ${education.length > 0 ? "onb-rb-nav-count--has" : ""}`}>
                    {education.length}
                  </span>
                </button>

                {/* 3. Projects */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={(activeBuildSection || "work") === "proj"}
                  className={`onb-rb-nav-item ${(activeBuildSection || "work") === "proj" ? "onb-rb-nav-item--active" : ""}`}
                  onClick={() => setActiveBuildSection("proj")}
                >
                  <div className="onb-rb-nav-icon">
                    <FolderGit2 size={18} />
                  </div>
                  <div className="onb-rb-nav-text">
                    <span className="onb-rb-nav-label">Projects</span>
                    <span className="onb-rb-nav-sub">Portfolio work</span>
                  </div>
                  <span className={`onb-rb-nav-count ${projects.length > 0 ? "onb-rb-nav-count--has" : ""}`}>
                    {projects.length}
                  </span>
                </button>

                {/* 4. Skills */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={(activeBuildSection || "work") === "skills"}
                  className={`onb-rb-nav-item ${(activeBuildSection || "work") === "skills" ? "onb-rb-nav-item--active" : ""}`}
                  onClick={() => setActiveBuildSection("skills")}
                >
                  <div className="onb-rb-nav-icon">
                    <Sparkles size={18} />
                  </div>
                  <div className="onb-rb-nav-text">
                    <span className="onb-rb-nav-label">Skills</span>
                    <span className="onb-rb-nav-sub">Technical &amp; soft</span>
                  </div>
                  <span className={`onb-rb-nav-count ${skills.length > 0 ? "onb-rb-nav-count--has" : ""}`}>
                    {skills.length}
                  </span>
                </button>

                {/* 5. Certifications */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={(activeBuildSection || "work") === "cert"}
                  className={`onb-rb-nav-item ${(activeBuildSection || "work") === "cert" ? "onb-rb-nav-item--active" : ""}`}
                  onClick={() => setActiveBuildSection("cert")}
                >
                  <div className="onb-rb-nav-icon">
                    <Award size={18} />
                  </div>
                  <div className="onb-rb-nav-text">
                    <span className="onb-rb-nav-label">Certifications</span>
                    <span className="onb-rb-nav-sub">Licenses &amp; courses</span>
                  </div>
                  <span className={`onb-rb-nav-count ${certifications.length > 0 ? "onb-rb-nav-count--has" : ""}`}>
                    {certifications.length}
                  </span>
                </button>

                {/* 6. Interests */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={(activeBuildSection || "work") === "interests"}
                  className={`onb-rb-nav-item ${(activeBuildSection || "work") === "interests" ? "onb-rb-nav-item--active" : ""}`}
                  onClick={() => setActiveBuildSection("interests")}
                >
                  <div className="onb-rb-nav-icon">
                    <Heart size={18} />
                  </div>
                  <div className="onb-rb-nav-text">
                    <span className="onb-rb-nav-label">Interests</span>
                    <span className="onb-rb-nav-sub">Hobbies &amp; passions</span>
                  </div>
                  <span className={`onb-rb-nav-count ${interests.length > 0 ? "onb-rb-nav-count--has" : ""}`}>
                    {interests.length}
                  </span>
                </button>
              </div>
            </aside>

            {/* ── Right Column: Detail Editor ── */}
            <main className="onb-rb-detail" role="tabpanel">

              {/* 1. WORK EXPERIENCE PANE */}
              {(activeBuildSection || "work") === "work" && (
                <div className="onb-rb-pane">
                  <div className="onb-rb-pane-header">
                    <div>
                      <h2 className="onb-rb-pane-title">Work Experience</h2>
                      <p className="onb-rb-pane-desc">Review, edit, or add your previous and current professional roles.</p>
                    </div>
                    <button type="button" className="onb-rb-action-btn" onClick={addBlankWorkExp}>
                      <Plus size={15} />
                      <span>Add Role</span>
                    </button>
                  </div>

                  {workExperiences.length === 0 && (
                    <div className="onb-rb-empty-box">
                      <div className="onb-rb-empty-icon">
                        <Briefcase size={24} />
                      </div>
                      <p className="onb-rb-empty-title">No work experience added yet</p>
                      <p className="onb-rb-empty-sub">Highlight your background to unlock tailored career opportunities.</p>
                      <button type="button" className="onb-rb-empty-action" onClick={addBlankWorkExp}>
                        <Plus size={14} /> Add Role
                      </button>
                    </div>
                  )}

                  <div className="onb-rb-entries-stack">
                    {workExperiences.map((entry) => (
                      <React.Fragment key={entry.id}>
                        {committedKeys.has(`we-${entry.id}`) ? (
                          <div className="onb-rb-summary-card">
                            <div className="onb-rb-summary-avatar">
                              {entry.employer ? entry.employer.charAt(0).toUpperCase() : entry.title ? entry.title.charAt(0).toUpperCase() : "W"}
                            </div>
                            <div className="onb-rb-summary-main">
                              <strong>{entry.title || "Untitled Role"}</strong>
                              <span className="onb-rb-summary-sub">{entry.employer || "Unknown Employer"}</span>
                              <span className="onb-muted-sm">
                                {entry.startMonth || "?"} – {entry.endMonth === null ? "Present" : entry.endMonth || "?"} {entry.location ? `· ${entry.location}` : ""}
                              </span>
                            </div>
                            <div className="onb-rb-summary-actions">
                              <button
                                type="button"
                                className="onb-rb-icon-action-btn"
                                onClick={() => uncommitEntry(`we-${entry.id}`)}
                                title="Edit role"
                                aria-label="Edit role"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                className="onb-rb-icon-action-btn onb-rb-icon-action-btn--danger"
                                onClick={() => removeWorkExp(entry.id)}
                                title="Delete role"
                                aria-label="Delete role"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="onb-rb-edit-card">
                            <div className="onb-rb-edit-card-head">
                              <span className="onb-rb-edit-card-label">Edit Role</span>
                              <button type="button" className="onb-rb-close-btn" onClick={() => removeWorkExp(entry.id)} title="Discard role" aria-label="Discard role"><X size={15} /></button>
                            </div>
                            <div className="onb-we-card-grid">
                              <div className="onb-we-field">
                                <label className="onb-we-field-label">Job title</label>
                                <input className="onb-input onb-we-field-control" value={entry.title} onChange={(e) => updateWorkExp(entry.id, "title", e.target.value)} placeholder="e.g. Senior Frontend Developer" />
                              </div>
                              <div className="onb-we-field">
                                <label className="onb-we-field-label">Employer</label>
                                <input className="onb-input onb-we-field-control" value={entry.employer} onChange={(e) => updateWorkExp(entry.id, "employer", e.target.value)} placeholder="e.g. TechNova Solutions" />
                              </div>
                              <div className="onb-we-field">
                                <label className="onb-we-field-label">Start date</label>
                                <input className="onb-input onb-we-field-control" type="month" value={entry.startMonth} onChange={(e) => updateWorkExp(entry.id, "startMonth", e.target.value)} />
                              </div>
                              <div className="onb-we-field">
                                <span className="onb-we-field-label">End date</span>
                                <div className="onb-we-end-wrap">
                                  {entry.endMonth !== null && (
                                    <input type="month" className="onb-input onb-we-field-control onb-we-end-month" value={entry.endMonth} onChange={(e) => updateWorkExp(entry.id, "endMonth", e.target.value)} />
                                  )}
                                  <label className="onb-we-inline-check">
                                    <input type="checkbox" checked={entry.endMonth === null} onChange={(e) => updateWorkExp(entry.id, "endMonth", e.target.checked ? null : "")} />
                                    <span>I currently work here</span>
                                  </label>
                                </div>
                              </div>
                              <div className="onb-we-field onb-we-field--full">
                                <label className="onb-we-field-label">Location</label>
                                <input className="onb-input onb-we-field-control" value={entry.location} onChange={(e) => updateWorkExp(entry.id, "location", e.target.value)} placeholder="e.g. San Francisco, CA" />
                              </div>
                            </div>
                            <div className="onb-rb-edit-actions">
                              <button
                                type="button"
                                className="onb-btn onb-btn-primary onb-btn-primary--brand onb-rb-save-btn"
                                disabled={!entry.title.trim() && !entry.employer.trim()}
                                onClick={() => commitEntry(`we-${entry.id}`)}
                              >
                                Save Role
                              </button>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. EDUCATION PANE */}
              {(activeBuildSection || "work") === "edu" && (
                <div className="onb-rb-pane">
                  <div className="onb-rb-pane-header">
                    <div>
                      <h2 className="onb-rb-pane-title">Education</h2>
                      <p className="onb-rb-pane-desc">Academic background, universities, and degrees obtained.</p>
                    </div>
                    <button type="button" className="onb-rb-action-btn" onClick={() => setEducation((c) => [...c, { school: "", degree: "", date: "" }])}>
                      <Plus size={15} />
                      <span>Add Degree</span>
                    </button>
                  </div>

                  {education.length === 0 && (
                    <div className="onb-rb-empty-box">
                      <div className="onb-rb-empty-icon">
                        <GraduationCap size={24} />
                      </div>
                      <p className="onb-rb-empty-title">No education added yet</p>
                      <p className="onb-rb-empty-sub">Add your university, college, or degree program.</p>
                      <button type="button" className="onb-rb-empty-action" onClick={() => setEducation((c) => [...c, { school: "", degree: "", date: "" }])}>
                        <Plus size={14} /> Add Degree
                      </button>
                    </div>
                  )}

                  <div className="onb-rb-entries-stack">
                    {education.map((entry, i) => (
                      <React.Fragment key={i}>
                        {committedKeys.has(`edu-${i}`) ? (
                          <div className="onb-rb-summary-card">
                            <div className="onb-rb-summary-avatar">
                              {entry.school ? entry.school.charAt(0).toUpperCase() : entry.degree ? entry.degree.charAt(0).toUpperCase() : "E"}
                            </div>
                            <div className="onb-rb-summary-main">
                              <strong>{entry.degree || "Untitled Degree"}</strong>
                              <span className="onb-rb-summary-sub">{entry.school || "Unknown School"}</span>
                              <span className="onb-muted-sm">{entry.date || "Graduation date unspecified"}</span>
                            </div>
                            <div className="onb-rb-summary-actions">
                              <button
                                type="button"
                                className="onb-rb-icon-action-btn"
                                onClick={() => uncommitEntry(`edu-${i}`)}
                                title="Edit education"
                                aria-label="Edit education"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                className="onb-rb-icon-action-btn onb-rb-icon-action-btn--danger"
                                onClick={() => removeEducation(i)}
                                title="Delete education"
                                aria-label="Delete education"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="onb-rb-edit-card">
                            <div className="onb-rb-edit-card-head">
                              <span className="onb-rb-edit-card-label">Edit Education</span>
                              <button type="button" className="onb-rb-close-btn" onClick={() => removeEducation(i)} title="Discard education" aria-label="Discard education"><X size={15} /></button>
                            </div>
                            <div className="onb-we-card-grid">
                              <div className="onb-we-field">
                                <label className="onb-we-field-label">School / University</label>
                                <input className="onb-input onb-we-field-control" value={entry.school} onChange={(e) => updateEducation(i, "school", e.target.value)} placeholder="e.g. Stanford University" />
                              </div>
                              <div className="onb-we-field">
                                <label className="onb-we-field-label">Degree</label>
                                <input className="onb-input onb-we-field-control" value={entry.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} placeholder="e.g. B.Sc. Computer Science" />
                              </div>
                              <div className="onb-we-field onb-we-field--full">
                                <label className="onb-we-field-label">Graduation date</label>
                                <input className="onb-input onb-we-field-control" type="month" value={entry.date} onChange={(e) => updateEducation(i, "date", e.target.value)} />
                              </div>
                            </div>
                            <div className="onb-rb-edit-actions">
                              <button
                                type="button"
                                className="onb-btn onb-btn-primary onb-btn-primary--brand onb-rb-save-btn"
                                disabled={!entry.school.trim() && !entry.degree.trim()}
                                onClick={() => commitEntry(`edu-${i}`)}
                              >
                                Save Degree
                              </button>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. PROJECTS PANE */}
              {(activeBuildSection || "work") === "proj" && (
                <div className="onb-rb-pane">
                  <div className="onb-rb-pane-header">
                    <div>
                      <h2 className="onb-rb-pane-title">Projects</h2>
                      <p className="onb-rb-pane-desc">Showcase portfolio work, applications, or open-source software you built.</p>
                    </div>
                    <button type="button" className="onb-rb-action-btn" onClick={() => setProjects((c) => [...c, { name: "", website: "", date: "", description: "" }])}>
                      <Plus size={15} />
                      <span>Add Project</span>
                    </button>
                  </div>

                  {projects.length === 0 && (
                    <div className="onb-rb-empty-box">
                      <div className="onb-rb-empty-icon">
                        <FolderGit2 size={24} />
                      </div>
                      <p className="onb-rb-empty-title">No projects added yet</p>
                      <p className="onb-rb-empty-sub">Highlight projects to show real-world expertise to recruiters.</p>
                      <button type="button" className="onb-rb-empty-action" onClick={() => setProjects((c) => [...c, { name: "", website: "", date: "", description: "" }])}>
                        <Plus size={14} /> Add Project
                      </button>
                    </div>
                  )}

                  <div className="onb-rb-entries-stack">
                    {projects.map((entry, i) => (
                      <React.Fragment key={i}>
                        {committedKeys.has(`proj-${i}`) ? (
                          <div className="onb-rb-summary-card">
                            <div className="onb-rb-summary-avatar">
                              {entry.name ? entry.name.charAt(0).toUpperCase() : "P"}
                            </div>
                            <div className="onb-rb-summary-main">
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <strong>{entry.name || "Untitled Project"}</strong>
                                {entry.website && (
                                  <a href={entry.website} target="_blank" rel="noopener noreferrer" className="onb-rb-link-btn" title="Open project link">
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                              {entry.description && <span className="onb-rb-summary-sub">{entry.description}</span>}
                              <span className="onb-muted-sm">{entry.date || "Date unspecified"}</span>
                            </div>
                            <div className="onb-rb-summary-actions">
                              <button
                                type="button"
                                className="onb-rb-icon-action-btn"
                                onClick={() => uncommitEntry(`proj-${i}`)}
                                title="Edit project"
                                aria-label="Edit project"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                className="onb-rb-icon-action-btn onb-rb-icon-action-btn--danger"
                                onClick={() => removeProject(i)}
                                title="Delete project"
                                aria-label="Delete project"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="onb-rb-edit-card">
                            <div className="onb-rb-edit-card-head">
                              <span className="onb-rb-edit-card-label">Edit Project</span>
                              <button type="button" className="onb-rb-close-btn" onClick={() => removeProject(i)} title="Discard project" aria-label="Discard project"><X size={15} /></button>
                            </div>
                            <div className="onb-we-card-grid">
                              <div className="onb-we-field">
                                <label className="onb-we-field-label">Project name</label>
                                <input className="onb-input onb-we-field-control" value={entry.name} onChange={(e) => updateProject(i, "name", e.target.value)} placeholder="e.g. AI Portfolio Platform" />
                              </div>
                              <div className="onb-we-field">
                                <label className="onb-we-field-label">Website / Link</label>
                                <input className="onb-input onb-we-field-control" type="url" value={entry.website} onChange={(e) => updateProject(i, "website", e.target.value)} placeholder="https://github.com/..." />
                              </div>
                              <div className="onb-we-field onb-we-field--full">
                                <label className="onb-we-field-label">Date</label>
                                <input className="onb-input onb-we-field-control" type="month" value={entry.date} onChange={(e) => updateProject(i, "date", e.target.value)} />
                              </div>
                              <div className="onb-we-field onb-we-field--full">
                                <label className="onb-we-field-label">Description</label>
                                <textarea className="onb-input onb-we-textarea" rows={2} value={entry.description} onChange={(e) => updateProject(i, "description", e.target.value)} placeholder="What did you build, and which core tech stack did you use?" />
                              </div>
                            </div>
                            <div className="onb-rb-edit-actions">
                              <button
                                type="button"
                                className="onb-btn onb-btn-primary onb-btn-primary--brand onb-rb-save-btn"
                                disabled={!entry.name.trim()}
                                onClick={() => commitEntry(`proj-${i}`)}
                              >
                                Save Project
                              </button>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. SKILLS PANE */}
              {(activeBuildSection || "work") === "skills" && (
                <div className="onb-rb-pane">
                  <div className="onb-rb-pane-header">
                    <div>
                      <h2 className="onb-rb-pane-title">Skills &amp; Proficiencies</h2>
                      <p className="onb-rb-pane-desc">Add technical capabilities, frameworks, tools, and domain skills.</p>
                    </div>
                  </div>

                  <div className="onb-rb-skills-shell">
                    <div className="onb-rb-inline-add">
                      <input
                        className="onb-input onb-rb-tag-input"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Type a skill and press Enter or comma (e.g. React, Python, Figma)..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const val = newSkill.trim().replace(/,$/, "");
                            if (val && !skills.includes(val)) setSkills((c) => [...c, val]);
                            setNewSkill("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={`onb-rb-add-btn${skillJustAdded ? " onb-rb-add-btn--added" : ""}`}
                        style={{ marginTop: 0, flexShrink: 0 }}
                        disabled={!newSkill.trim()}
                        onClick={() => {
                          const val = newSkill.trim();
                          if (val && !skills.includes(val)) {
                            setSkills((c) => [...c, val]);
                            setSkillJustAdded(true);
                            setTimeout(() => setSkillJustAdded(false), 1200);
                          }
                          setNewSkill("");
                        }}
                      >
                        {skillJustAdded ? "✓ Added" : "Add Skill"}
                      </button>
                    </div>

                    {skills.length > 0 ? (
                      <div className="onb-rb-tags" aria-live="polite">
                        {skills.map((skill, i) => (
                          <span key={i} className="onb-rb-tag">
                            <span>{skill}</span>
                            <button
                              type="button"
                              className="onb-rb-tag-remove"
                              onClick={() => setSkills((c) => c.filter((_, j) => j !== i))}
                              aria-label={`Remove ${skill}`}
                              title={`Remove ${skill}`}
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="onb-rb-empty-box" style={{ padding: "32px 20px" }}>
                        <p className="onb-rb-empty-title">No skills added yet</p>
                        <p className="onb-rb-empty-sub">Add your top skills above or pick from popular suggestions below.</p>
                      </div>
                    )}

                    {/* Quick suggested skills */}
                    <div className="onb-rb-suggestions">
                      <span className="onb-rb-suggestions-label">Popular suggestions:</span>
                      <div className="onb-rb-suggestions-chips">
                        {["React", "TypeScript", "JavaScript", "Python", "Node.js", "SQL", "Git", "Figma", "UI/UX", "REST APIs", "Docker", "Tailwind CSS"]
                          .filter((s) => !skills.includes(s))
                          .slice(0, 8)
                          .map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              className="onb-rb-suggest-chip"
                              onClick={() => setSkills((c) => [...c, suggestion])}
                            >
                              <Plus size={12} /> {suggestion}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. CERTIFICATIONS PANE */}
              {(activeBuildSection || "work") === "cert" && (
                <div className="onb-rb-pane">
                  <div className="onb-rb-pane-header">
                    <div>
                      <h2 className="onb-rb-pane-title">Certifications &amp; Licenses</h2>
                      <p className="onb-rb-pane-desc">Accredited certifications, professional licenses, and verified courses.</p>
                    </div>
                    <button type="button" className="onb-rb-action-btn" onClick={() => setCertifications((c) => [...c, { name: "", link: "" }])}>
                      <Plus size={15} />
                      <span>Add Certification</span>
                    </button>
                  </div>

                  {certifications.length === 0 && (
                    <div className="onb-rb-empty-box">
                      <div className="onb-rb-empty-icon">
                        <Award size={24} />
                      </div>
                      <p className="onb-rb-empty-title">No certifications added yet</p>
                      <p className="onb-rb-empty-sub">Add any industry credentials (e.g. AWS, Google, Cisco, Coursera).</p>
                      <button type="button" className="onb-rb-empty-action" onClick={() => setCertifications((c) => [...c, { name: "", link: "" }])}>
                        <Plus size={14} /> Add Certification
                      </button>
                    </div>
                  )}

                  <div className="onb-rb-entries-stack">
                    {certifications.map((entry, i) => (
                      <React.Fragment key={i}>
                        {committedKeys.has(`cert-${i}`) ? (
                          <div className="onb-rb-summary-card">
                            <div className="onb-rb-summary-avatar">
                              {entry.name ? entry.name.charAt(0).toUpperCase() : "C"}
                            </div>
                            <div className="onb-rb-summary-main">
                              <strong>{entry.name || "Untitled Certification"}</strong>
                              {entry.link ? (
                                <a href={entry.link} target="_blank" rel="noopener noreferrer" className="onb-rb-summary-sub onb-flex-gap" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <span>Credential Link</span>
                                  <ExternalLink size={13} />
                                </a>
                              ) : (
                                <span className="onb-muted-sm">No credential URL provided</span>
                              )}
                            </div>
                            <div className="onb-rb-summary-actions">
                              <button
                                type="button"
                                className="onb-rb-icon-action-btn"
                                onClick={() => uncommitEntry(`cert-${i}`)}
                                title="Edit certification"
                                aria-label="Edit certification"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                className="onb-rb-icon-action-btn onb-rb-icon-action-btn--danger"
                                onClick={() => removeCertification(i)}
                                title="Delete certification"
                                aria-label="Delete certification"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="onb-rb-edit-card">
                            <div className="onb-rb-edit-card-head">
                              <span className="onb-rb-edit-card-label">Edit Certification</span>
                              <button type="button" className="onb-rb-close-btn" onClick={() => removeCertification(i)} title="Discard certification" aria-label="Discard certification"><X size={15} /></button>
                            </div>
                            <div className="onb-we-card-grid">
                              <div className="onb-we-field">
                                <label className="onb-we-field-label">Certification name</label>
                                <input className="onb-input onb-we-field-control" value={entry.name} onChange={(e) => updateCertification(i, "name", e.target.value)} placeholder="e.g. AWS Certified Solutions Architect" />
                              </div>
                              <div className="onb-we-field">
                                <label className="onb-we-field-label">Verification Link / URL</label>
                                <input className="onb-input onb-we-field-control" type="url" value={entry.link} onChange={(e) => updateCertification(i, "link", e.target.value)} placeholder="https://..." />
                              </div>
                            </div>
                            <div className="onb-rb-edit-actions">
                              <button
                                type="button"
                                className="onb-btn onb-btn-primary onb-btn-primary--brand onb-rb-save-btn"
                                disabled={!entry.name.trim()}
                                onClick={() => commitEntry(`cert-${i}`)}
                              >
                                Save Certification
                              </button>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. INTERESTS PANE */}
              {(activeBuildSection || "work") === "interests" && (
                <div className="onb-rb-pane">
                  <div className="onb-rb-pane-header">
                    <div>
                      <h2 className="onb-rb-pane-title">Interests &amp; Passions</h2>
                      <p className="onb-rb-pane-desc">Hobbies, passions, and topics that inspire your work outside the office.</p>
                    </div>
                  </div>

                  <div className="onb-rb-skills-shell">
                    <div className="onb-rb-inline-add">
                      <input
                        className="onb-input onb-rb-tag-input"
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        placeholder="Type an interest and press Enter (e.g. Open Source, AI, Hiking)..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const val = newInterest.trim().replace(/,$/, "");
                            if (val && !interests.includes(val)) setInterests((c) => [...c, val]);
                            setNewInterest("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={`onb-rb-add-btn${interestJustAdded ? " onb-rb-add-btn--added" : ""}`}
                        style={{ marginTop: 0, flexShrink: 0 }}
                        disabled={!newInterest.trim()}
                        onClick={() => {
                          const val = newInterest.trim();
                          if (val && !interests.includes(val)) {
                            setInterests((c) => [...c, val]);
                            setInterestJustAdded(true);
                            setTimeout(() => setInterestJustAdded(false), 1200);
                          }
                          setNewInterest("");
                        }}
                      >
                        {interestJustAdded ? "✓ Added" : "Add Interest"}
                      </button>
                    </div>

                    {interests.length > 0 ? (
                      <div className="onb-rb-tags" aria-live="polite">
                        {interests.map((item, i) => (
                          <span key={i} className="onb-rb-tag">
                            <span>{item}</span>
                            <button
                              type="button"
                              className="onb-rb-tag-remove"
                              onClick={() => setInterests((c) => c.filter((_, j) => j !== i))}
                              aria-label={`Remove ${item}`}
                              title={`Remove ${item}`}
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="onb-rb-empty-box" style={{ padding: "32px 20px" }}>
                        <p className="onb-rb-empty-title">No interests added yet</p>
                        <p className="onb-rb-empty-sub">Add what you're passionate about outside work.</p>
                      </div>
                    )}

                    {/* Quick suggested interests */}
                    <div className="onb-rb-suggestions">
                      <span className="onb-rb-suggestions-label">Popular topics:</span>
                      <div className="onb-rb-suggestions-chips">
                        {["Open Source", "Artificial Intelligence", "Design Systems", "Mentorship", "Public Speaking", "Writing", "Cloud Computing"]
                          .filter((item) => !interests.includes(item))
                          .slice(0, 6)
                          .map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              className="onb-rb-suggest-chip"
                              onClick={() => setInterests((c) => [...c, suggestion])}
                            >
                              <Plus size={12} /> {suggestion}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      )}
      {step === 5 && (
        <div className="onb-ready-wrapper">
          <div className="onb-ready-stage-card">
            {/* Top Centered Hero */}
            <div className="onb-step-badge">
              <span className="onb-step-badge-dot" />
              <span>Milestone • Step 5 of 11</span>
            </div>

            <div className="onb-ready-check-wrap">
              <div className="onb-ready-check">
                <img src={ast.ready.check} alt="" width={44} height={44} />
              </div>
            </div>

            <h1 className="onb-ready-title">You're almost ready to swipe!</h1>
            <p className="onb-ready-desc">
              Your professional profile has been saved. Next, we will calibrate your job search preferences—roles, target locations, and work models.
            </p>

            {/* Symmetrical 2-Column Feature Grid */}
            <div className="onb-ready-features-grid">
              <div className="onb-ready-feature-card">
                <div className="onb-ready-feature-icon onb-ready-feature-icon--indigo">
                  <img src={ast.ready.match} alt="" width={28} height={28} />
                </div>
                <div className="onb-ready-feature-content">
                  <h3 className="onb-ready-feature-title">Personalized Matches</h3>
                  <p className="onb-ready-feature-desc">
                    Curated job recommendations based on your verified skills, experience, and career trajectory.
                  </p>
                  <div className="onb-ready-feature-pills">
                    <span className="onb-ready-pill">Skill-Matched</span>
                    <span className="onb-ready-pill">AI Calibrated</span>
                  </div>
                </div>
              </div>

              <div className="onb-ready-feature-card">
                <div className="onb-ready-feature-icon onb-ready-feature-icon--cyan">
                  <img src={ast.ready.chat} alt="" width={26} height={30} />
                </div>
                <div className="onb-ready-feature-content">
                  <h3 className="onb-ready-feature-title">Instant Connections</h3>
                  <p className="onb-ready-feature-desc">
                    Swipe right to save and apply directly to matching hiring teams with zero friction.
                  </p>
                  <div className="onb-ready-feature-pills">
                    <span className="onb-ready-pill">Direct Inquiries</span>
                    <span className="onb-ready-pill">Instant Chat</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Centered Body CTA */}
            <div className="onb-ready-cta-wrap">
              <button
                type="button"
                className="onb-btn onb-btn-primary onb-btn-primary--brand onb-ready-cta"
                onClick={next}
              >
                <span>Let's Go</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
      {step === 6 && (
        <div className="onb-step-wrapper">
          <div className="onb-step-card onb-step-card--roles">
            <div className="onb-step-card-header">
              <div className="onb-step-badge">
                <span className="onb-step-badge-dot" />
                <span>Step 6 of 11 • Target Roles &amp; Titles</span>
              </div>
              <h1 className="onb-h1">What are you looking for?</h1>
              <p className="onb-sub">
                Select all the roles that align with your next career move.
              </p>
            </div>

            <div className="onb-role-grid">
            {[
              ["Software Engineer", "Design, develop, and maintain software applications and systems across various platforms. Build the technical foundation of products."],
              ["Product Designer", "Create intuitive, user-centric interfaces and experiences. Work closely with product and engineering to bring ideas to life."],
              ["Data Analyst", "Interpret complex data sets, generate insights, and help businesses make informed, data-driven decisions."],
              ["Product Manager", "Guide the success of a product and lead the cross-functional team responsible for improving it."],
              ["Marketing Director", "Develop overarching marketing strategies, manage campaigns, and oversee a team of marketing professionals."],
              ["UX Researcher", "Conduct user research, analyze behavior, and provide insights to inform product strategy and design decisions."],
            ].map(([title, desc]) => (
              <button
                key={title as string}
                type="button"
                className={`onb-role-card${roles.includes(title as string) ? " onb-role-card--selected" : ""}`}
                onClick={() => toggleRole(title as string)}
              >
                <div className={`onb-role-title${roles.includes(title as string) ? " onb-role-title--sel" : ""}`}>
                  <span>{title as string}</span>
                  <img src={roles.includes(title as string) ? ast.roles.checkOn : ast.roles.checkOff} alt="" width={20} height={20} />
                </div>
                <p className="onb-role-desc">
                  {desc as string}
                </p>
                <div className="onb-role-footer">
                  <span>Learn More</span>
                  <img src={roles.includes(title as string) ? ast.roles.learnMoreOn : ast.roles.learnMoreOff} alt="" width={11} height={11} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )}
      {step === 8 && (
        <div className="onb-loc-step-shell">
          <div className="onb-loc-split">
            <div className="onb-loc-side">
              <div className="onb-loc-side-scroll">
                <h1 className="onb-h1">Where are you based?</h1>
                <p className="onb-sub" style={{ marginTop: 8 }}>
                  We use this to find relevant opportunities near you.
                </p>
                <div className="onb-search-input-wrap">
                  <Search size={18} className="onb-search-icon" />
                  <input
                    className="onb-search-input"
                    placeholder="Search city, area, or country"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    autoComplete="off"
                  />
                  {locationSearch.trim().length > 0 && (
                    <button
                      type="button"
                      className="onb-search-clear-btn"
                      onClick={() => {
                        setLocationSearch("");
                        setLocationResults([]);
                      }}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {locationSearch.trim().length < 2 ? (
                  <>
                    <p style={{ margin: "28px 0 16px", fontWeight: 700, fontSize: 16 }}>Popular locations</p>
                    {filteredPopularLocations.map(({ city, region }) => {
                      const key = `${city}, ${region}`;
                      const sel = selectedBaseLocation === key;
                      return (
                        <button
                          key={city}
                          type="button"
                          className={`onb-loc-chip${sel ? " onb-loc-chip--sel" : ""}`}
                          onClick={() => {
                            setSelectedBaseLocation(key);
                            const coords = POPULAR_BASE_LOCATION_LNG_LAT[key];
                            if (coords) {
                              setBaseMapLngLat({ lng: coords[0], lat: coords[1] });
                            }
                          }}
                          aria-pressed={sel}
                        >
                          <div className="onb-flex-gap" style={{ minWidth: 0, flex: 1 }}>
                            <div className={`onb-loc-icon-badge${sel ? " onb-loc-icon-badge--sel" : ""}`}>
                              <MapPin size={18} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: sel ? "#4648d4" : "#0f172a" }}>{city as string}</p>
                              <p style={{ margin: 0, fontSize: 13.5, color: sel ? "rgba(70,72,212,0.8)" : "#64748b" }}>{region as string}</p>
                            </div>
                          </div>
                          <div className={`onb-loc-check-indicator${sel ? " onb-loc-check-indicator--sel" : ""}`}>
                            {sel && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <div style={{ marginTop: 24 }}>
                    {locationBusy ? (
                      <p className="onb-loc-status">Searching locations...</p>
                    ) : null}
                    {!locationBusy && locationResults.length === 0 ? (
                      <div className="onb-loc-not-found">
                        <MapPinOff size={22} className="onb-loc-not-found-icon" />
                        <p className="onb-loc-not-found-text">Location not found</p>
                      </div>
                    ) : null}
                    {!locationBusy && locationResults.length > 0 && (
                      <>
                        <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 16 }}>Location matches</p>
                        {locationResults.map((row, idx) => {
                          const { label, city, region } = row;
                          const country = row.country || region.split(",").slice(-1)[0]?.trim() || "";
                          const cleanLocation = country ? `${city}, ${country}` : city;
                          const key = `${city}, ${region}`;
                          const sel = selectedBaseLocation === key || selectedBaseLocation === label || selectedBaseLocation === cleanLocation;
                          return (
                            <button
                              key={`${label}-${idx}`}
                              type="button"
                              className={`onb-loc-chip${sel ? " onb-loc-chip--sel" : ""}`}
                              onClick={() => {
                                setSelectedBaseLocation(cleanLocation);
                                if (row.lngLat) {
                                  setBaseMapLngLat({ lng: row.lngLat[0], lat: row.lngLat[1] });
                                }
                              }}
                              aria-pressed={sel}
                            >
                              <div className="onb-flex-gap" style={{ minWidth: 0, flex: 1 }}>
                                <div className={`onb-loc-icon-badge${sel ? " onb-loc-icon-badge--sel" : ""}`}>
                                  <MapPin size={18} />
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: sel ? "#4648d4" : "#0f172a" }}>{city}</p>
                                  <p style={{ margin: 0, fontSize: 13, color: sel ? "rgba(70,72,212,0.8)" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {row.source === "locationiq" ? label : region}
                                  </p>
                                </div>
                              </div>
                              <div className={`onb-loc-check-indicator${sel ? " onb-loc-check-indicator--sel" : ""}`}>
                                {sel && <Check size={12} strokeWidth={3} />}
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="onb-loc-side-actions">
                <button
                  type="button"
                  className="onb-btn onb-btn-primary onb-btn-primary--brand onb-loc-action-primary"
                  onClick={next}
                  disabled={!selectedBaseLocation}
                >
                  Continue
                </button>
              </div>
            </div>
            <div className="onb-loc-map">
              <OnboardingLocationMap ref={locationMapRef} accessToken={mapboxEnvToken} lngLat={baseMapLngLat} />
              <div style={{ position: "absolute", bottom: 32, right: 32, display: "flex", flexDirection: "column", gap: 8, zIndex: 2 }}>
                <button
                  type="button"
                  className="onb-btn"
                  aria-label="Zoom in"
                  style={{ width: 40, height: 40, borderRadius: 32, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                  onClick={() => locationMapRef.current?.zoomIn()}
                >
                  <img src={ast.location.mapPlus} alt="" width={14} height={14} />
                </button>
                <button
                  type="button"
                  className="onb-btn"
                  aria-label="Zoom out"
                  style={{ width: 40, height: 40, borderRadius: 32, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                  onClick={() => locationMapRef.current?.zoomOut()}
                >
                  <img src={ast.location.mapMinus} alt="" width={14} height={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 9 && (
        <div className="onb-step-wrapper">
          <div className="onb-step-card onb-step-card--target">
            <div className="onb-step-card-header">
              <div className="onb-step-badge">
                <span className="onb-step-badge-dot" />
                <span>Step 8 of 11 • Target Job Locations</span>
              </div>
              <h1 className="onb-h1">Where do you want to work next?</h1>
              <p className="onb-sub">
                Select all the locations where you are open to career opportunities.
              </p>
            </div>

            <div className="onb-target-twin-grid">
              {/* Left Panel: Explore & Add Locations */}
              <div className="onb-target-panel">
                <div className="onb-target-panel-header">
                  <div>
                    <h3 className="onb-target-panel-title">Explore Locations</h3>
                    <p className="onb-target-panel-sub">
                      {targetLocationSearch.trim().length >= 2
                        ? "Search matches"
                        : "Popular destination hubs"}
                    </p>
                  </div>
                </div>

                <div className="onb-target-search-bar">
                  <div className="onb-search-input-wrap" style={{ marginTop: 0 }}>
                    <Search size={16} className="onb-search-icon" />
                    <input
                      className="onb-search-input"
                      placeholder="Search city or country"
                      value={targetLocationSearch}
                      onChange={(e) => setTargetLocationSearch(e.target.value)}
                      autoComplete="off"
                    />
                    {targetLocationSearch.trim().length > 0 && (
                      <button
                        type="button"
                        className="onb-search-clear-btn"
                        onClick={() => {
                          setTargetLocationSearch("");
                          setTargetSuggestRows([]);
                        }}
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="onb-target-scroll-list">
                  {targetLocationSearch.trim().length < 2 ? (
                    popularLocations.map(({ city, region }) => {
                      const normalizedCountry = region.split(",").slice(-1)[0]?.trim() || region.trim();
                      const exists = targetLocations.some(
                        (entry) =>
                          entry.city.toLowerCase() === city.toLowerCase() &&
                          entry.country.toLowerCase() === normalizedCountry.toLowerCase(),
                      );
                      return (
                        <button
                          key={`${city}-${region}`}
                          type="button"
                          className={`onb-target-opt-card${exists ? " onb-target-opt-card--sel" : ""}`}
                          onClick={() => {
                            if (!exists) {
                              addTargetLocation(city, normalizedCountry);
                            } else {
                              removeTargetLocation(city, normalizedCountry);
                            }
                          }}
                          aria-pressed={exists}
                        >
                          <div className="onb-flex-gap" style={{ minWidth: 0, flex: 1 }}>
                            <div className="onb-target-opt-pin">
                              <MapPin size={15} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p className="onb-target-opt-city">{city}</p>
                              <p className="onb-target-opt-region">{region}</p>
                            </div>
                          </div>
                          <div className="onb-target-opt-action-icon">
                            {exists ? <Check size={12} strokeWidth={3} /> : <Plus size={13} />}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <>
                      {targetSuggestBusy && (
                        <p className="onb-loc-status">Searching locations...</p>
                      )}
                      {!targetSuggestBusy && targetSuggestRows.length === 0 && (
                        <div className="onb-loc-not-found" style={{ margin: "auto 0" }}>
                          <MapPinOff size={22} className="onb-loc-not-found-icon" />
                          <p className="onb-loc-not-found-text">Location not found</p>
                        </div>
                      )}
                      {!targetSuggestBusy && targetSuggestRows.map((r, idx) => {
                        const country = r.country ?? r.region.split(",").slice(-1)[0]?.trim() ?? r.region;
                        const exists = targetLocations.some(
                          (entry) =>
                            entry.city.toLowerCase() === r.city.toLowerCase() &&
                            entry.country.toLowerCase() === country.toLowerCase(),
                        );
                        return (
                          <button
                            key={`${r.label}-${idx}`}
                            type="button"
                            className={`onb-target-opt-card${exists ? " onb-target-opt-card--sel" : ""}`}
                            onClick={() => {
                              if (!exists) {
                                addTargetLocation(r.city, country);
                              } else {
                                removeTargetLocation(r.city, country);
                              }
                            }}
                            aria-pressed={exists}
                          >
                            <div className="onb-flex-gap" style={{ minWidth: 0, flex: 1 }}>
                              <div className="onb-target-opt-pin">
                                <MapPin size={15} />
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p className="onb-target-opt-city">{r.city}</p>
                                <p className="onb-target-opt-region">{r.label}</p>
                              </div>
                            </div>
                            <div className="onb-target-opt-action-icon">
                              {exists ? <Check size={12} strokeWidth={3} /> : <Plus size={13} />}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Right Panel: Selected Targets (Identical geometry & height!) */}
              <div className="onb-target-panel">
                <div className="onb-target-panel-header">
                  <div>
                    <h3 className="onb-target-panel-title">Selected Targets</h3>
                    <p className="onb-target-panel-sub">
                      {targetLocations.length === 0
                        ? "Select at least 1 location to continue"
                        : `${targetLocations.length} location${targetLocations.length > 1 ? "s" : ""} added`}
                    </p>
                  </div>
                  {targetLocations.length > 0 && (
                    <span className="onb-target-badge-pill">
                      {targetLocations.length}
                    </span>
                  )}
                </div>

                <div className="onb-target-scroll-list">
                  {targetLocations.length === 0 ? (
                    <div className="onb-target-panel-empty">
                      <div className="onb-target-panel-empty-icon">
                        <MapPin size={22} />
                      </div>
                      <p className="onb-target-panel-empty-title">No locations selected yet</p>
                      <p className="onb-target-panel-empty-desc">
                        Click any location on the left or search to add your target preferences.
                      </p>
                    </div>
                  ) : (
                    targetLocations.map(({ city, country }) => (
                      <div key={`${city}-${country}`} className="onb-target-selected-card">
                        <div className="onb-flex-gap" style={{ minWidth: 0, flex: 1 }}>
                          <div className="onb-target-selected-pin">
                            <MapPin size={15} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p className="onb-target-selected-city">{city}</p>
                            <p className="onb-target-selected-country">{country}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="onb-target-remove-btn"
                          onClick={() => removeTargetLocation(city, country)}
                          aria-label={`Remove ${city}, ${country}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 10 && (
        <div className="onb-step-wrapper">
          <div className="onb-step-card onb-step-card--wpref">
            <div className="onb-step-card-header">
              <div className="onb-step-badge">
                <span className="onb-step-badge-dot" />
                <span>Step 9 of 11 • Work Mode Preference</span>
              </div>
              <h1 className="onb-h1">How do you prefer to work?</h1>
              <p className="onb-sub">
                Select the work environment that best suits your lifestyle and career goals. This helps us match you with the right opportunities.
              </p>
            </div>

            <div className="onb-wpref-grid">
              {(
                [
                  ["remote", "Remote", "Work from anywhere, 100% of the time.", ["Maximum flexibility", "Zero commute time", "Global opportunities"], ast.workPref.remote, false],
                  ["hybrid", "Hybrid", "A mix of home and office days.", ["Best of both worlds", "Regular team connection", "Structured flexibility"], ast.workPref.hybrid, true],
                  ["office", "In Person", "Full-time at the company office.", ["Dedicated workspace", "Spontaneous collaboration", "Clear work-life boundary"], ast.workPref.office, false],
                ] as const
              ).map(([id, title, sub, bullets, icon, popular]) => {
                const sel = workPrefs.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`onb-wpref-opt${sel ? " onb-wpref-opt--sel" : ""}`}
                    onClick={() =>
                      setWorkPrefs((current) =>
                        current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
                      )
                    }
                  >
                    <div className="onb-wpref-top-row">
                      <div className={`onb-wpref-icon-wrap${sel ? " onb-wpref-icon-wrap--sel" : ""}`}>
                        <img src={icon} alt="" width={18} height={17} />
                      </div>
                      <div className="onb-wpref-top-right">
                        {popular && (
                          <span className="onb-wpref-popular-pill">
                            Popular
                          </span>
                        )}
                        <span className={`onb-wpref-radio${sel ? " onb-wpref-radio--sel" : ""}`}>
                          {sel && <span className="onb-wpref-radio-dot" />}
                        </span>
                      </div>
                    </div>

                    <h3 className={`onb-wpref-title${sel ? " onb-wpref-title--sel" : ""}`}>{title}</h3>
                    <p className="onb-wpref-desc">{sub}</p>

                    <div className="onb-wpref-bullets">
                      {bullets.map((b) => (
                        <div key={b} className="onb-wpref-bullet-row">
                          <Check size={13} className={sel ? "text-indigo-600" : "text-slate-400"} strokeWidth={2.5} />
                          <span className="onb-wpref-bullet-text">{b}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 11 && (
        <div className="onb-step-wrapper">
          <div className="onb-step-card onb-step-card--emp">
            <div className="onb-step-card-header">
              <div className="onb-step-badge">
                <span className="onb-step-badge-dot" />
                <span>Step 10 of 11 • Employment Models</span>
              </div>
              <h1 className="onb-h1">Employment Models</h1>
              <p className="onb-sub">
                Select the types of employment you are currently considering for your next career move. You can select multiple options.
              </p>
            </div>
            <div className="onb-emp-grid">
              {(
                [
                  ["Full Time", Briefcase, "Standard 40 hrs/week with full benefits & stability.", ["Benefits Included", "W2 Status"]],
                  ["Contract", FileText, "Project-based flexibility with competitive hourly rates.", ["High Flexibility", "1099 / W2"]],
                  ["Part Time", Clock, "Flexible schedule under 40 hrs/week for work-life balance.", ["< 40 Hours", "Work-Life Balance"]],
                  ["Internship", GraduationCap, "Hands-on mentorship & practical industry experience.", ["Learning Focused", "Entry Level"]],
                ] as const
              ).map(([title, Icon, desc, tags]) => {
                const sel = employment.includes(title);
                return (
                  <button
                    key={title}
                    type="button"
                    className={`onb-emp-card${sel ? " onb-emp-card--sel" : ""}`}
                    onClick={() => toggleEmployment(title)}
                  >
                    <div className="onb-emp-top-row">
                      <div className={`onb-emp-icon-wrap${sel ? " onb-emp-icon-wrap--sel" : ""}`}>
                        <Icon size={19} color={sel ? "#4f46e5" : "#64748b"} strokeWidth={2} />
                      </div>
                      <div className={`onb-emp-check${sel ? " onb-emp-check--sel" : ""}`}>
                        {sel && <Check size={12} color="#ffffff" strokeWidth={3} />}
                      </div>
                    </div>

                    <h3 className={`onb-emp-title${sel ? " onb-emp-title--sel" : ""}`}>{title}</h3>
                    <p className="onb-emp-desc">{desc}</p>

                    <div className="onb-emp-tags">
                      {tags.map((t) => (
                        <span key={t} className={`onb-emp-tag${sel ? " onb-emp-tag--sel" : ""}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 12 && (
        <div className="onb-step-wrapper">
          <div className="onb-step-card onb-step-card--exp">
            <div className="onb-step-card-header">
              <div className="onb-step-badge">
                <span className="onb-step-badge-dot" />
                <span>Step 11 of 11 • Experience Level</span>
              </div>
              <h1 className="onb-h1">Define Your Experience Level</h1>
              <p className="onb-sub">
                Select the level that best reflects your current professional journey.
              </p>
            </div>

            <div className="onb-exp-grid">
              {(
                [
                  [
                    "Entry Level Professional",
                    "Entry Level",
                    "0–2 Years",
                    "Building core skills, learning industry standards, and executing with guidance.",
                    Sparkles,
                  ],
                  [
                    "Mid-Level Professional",
                    "Mid-Level",
                    "3–5 Years",
                    "Delivering complex features independently and contributing to team goals.",
                    Briefcase,
                  ],
                  [
                    "Senior Level Expert",
                    "Senior Expert",
                    "5+ Years",
                    "Architecting scalable systems, shaping technical vision, and leading initiatives.",
                    Award,
                  ],
                ] as const
              ).map(([fullTitle, shortTitle, years, desc, Icon]) => {
                const sel = experienceLevel === fullTitle;
                return (
                  <button
                    key={fullTitle}
                    type="button"
                    className={`onb-exp-card${sel ? " onb-exp-card--sel" : ""}`}
                    onClick={() => selectExperienceLevel(fullTitle)}
                  >
                    <div className="onb-exp-card-top">
                      <div className={`onb-exp-icon-wrap${sel ? " onb-exp-icon-wrap--sel" : ""}`}>
                        <Icon size={19} color={sel ? "#4f46e5" : "#64748b"} strokeWidth={2} />
                      </div>
                      <div className={`onb-exp-radio${sel ? " onb-exp-radio--sel" : ""}`}>
                        {sel && <div className="onb-exp-radio-dot" />}
                      </div>
                    </div>

                    <div className="onb-exp-title-row">
                      <h3 className={`onb-exp-title${sel ? " onb-exp-title--sel" : ""}`}>{shortTitle}</h3>
                      <span className={`onb-exp-years-badge${sel ? " onb-exp-years-badge--sel" : ""}`}>{years}</span>
                    </div>

                    <p className="onb-exp-desc">{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ── Unified Bottom Bar: Legal meta on left + Continue button aligned to cards on right ── */}
      {!isMapStep && (
        <footer className="onb-unified-bottom-bar" role="contentinfo">
          <div className="onb-unified-bottom-inner">
            <div className="onb-bottom-meta">
              <span className="onb-bottom-copy">
                © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
              </span>
              <span className="onb-bottom-sep" aria-hidden>•</span>
              <nav className="onb-bottom-links" aria-label="Footer links">
                <a href="#privacy">Privacy</a>
                <a href="#terms">Terms</a>
                <a href="#support">Support</a>
              </nav>
            </div>

            {showBottomBar && (
              <div className="onb-bottom-action">
                <button
                  id="onb-continue-btn"
                  type="button"
                  className="onb-footer-continue-btn"
                  disabled={continueDisabled || (step === 12 && prefsBusy)}
                  onClick={handleContinue}
                  aria-busy={step === 12 && prefsBusy}
                >
                  <span>{step === 12 && prefsBusy ? 'Saving…' : continueLabel}</span>
                  <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path
                      d="M3 7h8M8 4l3 3-3 3"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
