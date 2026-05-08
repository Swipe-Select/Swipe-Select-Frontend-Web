import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OnboardingLocationMap, type OnboardingLocationMapHandle } from "../components/onboarding/OnboardingLocationMap";
import { mapboxForwardGeocode, mapboxReverseGeocode } from "../lib/mapboxGeocoding";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND_NAME } from "../brand";
import { onboardingAssets as ast } from "../figma/onboardingAssets";
import { extractResumePdf, savePreferences } from "../api/onboarding";
import { ONBOARDING_COMPLETE_STEP } from "../auth/onboardingStep";
import { asUserPreferences, asUserProfile } from "../auth/normalizeSession";
import { useAuth } from "../context/AuthContext";
import type { ProfileEducation, ProfileProject, ProfileCertification } from "../api/types";
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

const COUNTRY_OPTIONS = [
  "Argentina",
  "Australia",
  "Austria",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Canada",
  "Chile",
  "China",
  "Colombia",
  "Czech Republic",
  "Denmark",
  "Egypt",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hong Kong",
  "Hungary",
  "India",
  "Indonesia",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Kenya",
  "Malaysia",
  "Mexico",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Saudi Arabia",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
];

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

export function OnboardingPage() {
  const navigate = useNavigate();
  const { session, setSession } = useAuth();
  const mapboxEnvToken =
    import.meta.env.VITE_LOCATIONIQ_API_KEY?.trim() ??
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ??
    "";
  const locationMapRef = useRef<OnboardingLocationMapHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeErr, setResumeErr] = useState<string | null>(null);
  const [resumeOk, setResumeOk] = useState(false);
  const [entryMode, setEntryMode] = useState<OnboardingEntryMode>(null);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [gender, setGender] = useState<GenderId>("female");
  const [notif, setNotif] = useState({
    appStatus: true,
    jobRec: true,
    appInfo: false,
  });
  const [roles, setRoles] = useState<string[]>(["Software Engineer", "Product Manager"]);
  const [workPrefs, setWorkPrefs] = useState<WorkPrefId[]>(["hybrid"]);
  const [employment, setEmployment] = useState<string[]>(["Full Time"]);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [personalFullName, setPersonalFullName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [personalDialCode, setPersonalDialCode] = useState("+1");
  const [personalPhone, setPersonalPhone] = useState("");
  const [workExperiences, setWorkExperiences] = useState<WorkExperienceEntry[]>([]);

  // Resume Builder sections
  const [education, setEducation] = useState<ProfileEducation[]>([]);
  const [projects, setProjects] = useState<ProfileProject[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<ProfileCertification[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [activeBuildSection, setActiveBuildSection] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [newInterest, setNewInterest] = useState("");

  const [locationSearch, setLocationSearch] = useState("");
  const [selectedBaseLocation, setSelectedBaseLocation] = useState("New York, New York, US");
  const [baseMapLngLat, setBaseMapLngLat] = useState(DEFAULT_BASE_MAP_LNG_LAT);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationGeoBusy, setLocationGeoBusy] = useState(false);
  const [locationErr, setLocationErr] = useState<string | null>(null);
  const [locationResults, setLocationResults] = useState<LocationListRow[]>([]);
  const [targetLocations, setTargetLocations] = useState<Array<{ city: string; country: string }>>([]);
  const [targetLocationSearch, setTargetLocationSearch] = useState("");
  const [targetSuggestBusy, setTargetSuggestBusy] = useState(false);
  const [targetSuggestErr, setTargetSuggestErr] = useState<string | null>(null);
  const [targetSuggestRows, setTargetSuggestRows] = useState<LocationListRow[]>([]);
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
  // Auth errors are surfaced per-search inline; a background probe is not used.
  const hasValidMapbox = Boolean(mapboxEnvToken);

  // Pre-populate Resume Builder from extracted resume data (runs once when profile becomes available)
  const profileSeededRef = useRef(false);
  useEffect(() => {
    if (profileSeededRef.current) return;
    const profile = session?.profile;
    if (!profile) return;
    profileSeededRef.current = true;

    if (profile.workExperience?.length) {
      setWorkExperiences(
        profile.workExperience.map((we, i) => ({
          id: `seed-${i}`,
          title: we.title ?? "",
          employer: we.company ?? "",
          startMonth: toMonthStr(we.startDate),
          endMonth: we.endDate ? toMonthStr(we.endDate) : null,
          location: we.location ?? "",
        })),
      );
    }
    if (profile.education?.length)
      setEducation(profile.education.map((e) => ({ ...e, date: toMonthStr(e.date) })));
    if (profile.projects?.length)
      setProjects(profile.projects.map((p) => ({ ...p, date: toMonthStr(p.date) })));
    if (profile.skills?.length) setSkills(profile.skills);
    if (profile.certifications?.length) setCertifications(profile.certifications);
    if (profile.interests?.length) setInterests(profile.interests);

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

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationErr("This browser does not support location services.");
      return;
    }
    setLocationGeoBusy(true);
    setLocationErr(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude, latitude } = pos.coords;
        try {
          const place = await mapboxReverseGeocode(longitude, latitude, mapboxEnvToken);
          if (place) {
            setSelectedBaseLocation(place);
            setBaseMapLngLat({ lng: longitude, lat: latitude });
          } else {
            setLocationErr("Could not resolve this position to an address.");
          }
        } catch {
          setLocationErr("Could not resolve this position to an address.");
        } finally {
          setLocationGeoBusy(false);
        }
      },
      (geoErr) => {
        setLocationGeoBusy(false);
        const code = geoErr.code;
        if (code === geoErr.PERMISSION_DENIED) {
          setLocationErr("Location permission denied. Enable location in your browser settings.");
        } else if (code === geoErr.POSITION_UNAVAILABLE) {
          setLocationErr("Current position is unavailable.");
        } else if (code === geoErr.TIMEOUT) {
          setLocationErr("Location request timed out.");
        } else {
          setLocationErr("Could not read your current location.");
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [mapboxEnvToken]);

  const next = useCallback(() => {
    setStep((currentStep) => {
      if (currentStep === 1) {
        if (resumeBusy) {
          setStepError("Please wait until resume upload is complete.");
          return currentStep;
        }
        if (resumeOk) {
          setStepError(null);
          return 4; // Go to Resume Builder with pre-filled extracted data
        }
        if (entryMode === "manual") {
          setStepError(null);
          return 2;
        }
        setStepError("Upload and parse your resume, or choose fill out manually.");
        return currentStep;
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
      if (currentStep === 6) return 8;

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

      setStepError(null);
      return Math.min(currentStep + 1, 12);
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
  ]);
  const back = useCallback(() => {
    setStepError(null);
    setStep((s) => {
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
            if (profile.workExperience?.length) {
              setWorkExperiences(
                profile.workExperience.map((we, i) => ({
                  id: `extract-${i}`,
                  title: we.title ?? "",
                  employer: we.company ?? "",
                  startMonth: toMonthStr(we.startDate),
                  endMonth: we.endDate ? toMonthStr(we.endDate) : null,
                  location: we.location ?? "",
                })),
              );
            }
            if (profile.education?.length)
              setEducation(profile.education.map((e) => ({ ...e, date: toMonthStr(e.date) })));
            if (profile.projects?.length)
              setProjects(profile.projects.map((p) => ({ ...p, date: toMonthStr(p.date) })));
            if (profile.skills?.length) setSkills(profile.skills);
            if (profile.certifications?.length) setCertifications(profile.certifications);
            if (profile.interests?.length) setInterests(profile.interests);
            // Auto-open the first section that has data
            if (profile.workExperience?.length) setActiveBuildSection("work");
            else if (profile.education?.length) setActiveBuildSection("edu");
            else if (profile.projects?.length) setActiveBuildSection("proj");
            else if (profile.skills?.length) setActiveBuildSection("skills");
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

  const notificationSwitchRow = (
    icon: ReactNode,
    heading: string,
    line: string,
    key: keyof typeof notif,
  ) => (
    <div className="onb-notif-row onb-notif-row--prefs">
      <div className="onb-notif-pref-copy">
        <div className="onb-notif-icon-wrap" aria-hidden>
          {icon}
        </div>
        <div>
          <p className="onb-notif-heading">{heading}</p>
          <p className="onb-notif-line">{line}</p>
        </div>
      </div>
      <button
        type="button"
        className={`onb-switch ${notif[key] ? "onb-switch--on" : "onb-switch--off"}`}
        onClick={() => setNotif((n) => ({ ...n, [key]: !n[key] }))}
        aria-pressed={notif[key]}
        aria-label={heading}
      >
        <span className="onb-switch-knob" />
      </button>
    </div>
  );

  return (
    <div
      className={`onb page-fill${step === 8 ? " onb--loc-step" : ""}${step === 9 ? " onb--target-step" : ""}`}
      style={
        step === 8 || step === 9
          ? {
              height: "calc(100dvh - var(--app-navbar-height))",
              maxHeight: "calc(100dvh - var(--app-navbar-height))",
              overflow: "hidden",
            }
          : undefined
      }
    >
      {stepError ? (
        <div
          role="alert"
          style={{
            margin: "16px auto 0",
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
      <div key={step} className="onb-step-stage">
      {step === 0 && (
        <>
          <div className="onb-gender-layout">
            <div className="onb-gender-main">
              <div className="onb-gender-inner">
                <div>
                  <h1 className="onb-h1">How do you identify?</h1>
                  <p className="onb-sub" style={{ maxWidth: 600, marginTop: 12 }}>
                    This information helps us tailor your professional networking experience and ensure accurate representation. It will only be visible to you unless you choose to share it.
                  </p>
                </div>
                <div className="onb-identity-grid">
                  {(
                    [
                      ["male", "Male"],
                      ["female", "Female"],
                      ["nonbinary", "Non-binary"],
                    ] as const
                  ).map(([id, title]) => (
                    <button
                      key={id}
                      type="button"
                      className={`onb-id-card${gender === id ? " onb-id-card--selected" : ""}`}
                      onClick={() => setGender(id)}
                    >
                      <img src={gender === id ? ast.gender.radioOn : ast.gender.radioOff} alt="" />
                      <div>
                        <p className={`onb-id-title${gender === id ? " onb-id-title--selected" : ""}`}>{title}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="onb-btn-row">
                  <button type="button" className="onb-btn onb-btn-ghost" onClick={back} disabled>
                    Back
                  </button>
                  <button
                    type="button"
                    className="onb-btn onb-btn-primary onb-btn-primary--brand"
                    onClick={next}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
          {footer()}
        </>
      )}

      {step === 1 && (
        <>
          <div className="onb-resume-wrap">
            <div className="onb-resume-grid">
              <div className="onb-card">
                <div>
                  <h1 className="onb-h1">Upload your resume</h1>
                  <p className="onb-sub" style={{ marginTop: 8 }}>
                    We&apos;ll automatically extract your details and set up your professional profile.
                  </p>
                </div>
                <input
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
              <div className="onb-card">
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
          <div className="onb-resume-bottom">
            <div className="onb-resume-bottom-inner">
              <button type="button" className="onb-btn onb-flex-gap onb-btn-ghost" onClick={back}>
                <img src={ast.resume.backArrow} alt="" width={13} height={13} />
                Back
              </button>
              <button
                type="button"
                className="onb-btn onb-btn-primary onb-btn-primary--brand onb-flex-gap onb-btn-continue"
                disabled={resumeBusy || (!resumeOk && entryMode !== "manual")}
                onClick={next}
              >
                {resumeBusy ? "Uploading..." : "Continue"}
                <img src={ast.resume.forwardArrow} alt="" width={13} height={13} />
              </button>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="onb-personal">
            <div className="onb-personal-inner">
              <div className="onb-center" style={{ marginBottom: 40 }}>
                <h1 className="onb-h1">A little about you</h1>
                <p className="onb-sub" style={{ marginTop: 12 }}>
                  This helps us verify your professional profile and keep your account secure.
                </p>
              </div>
              <div className="onb-form-card">
                <div className="onb-divider">
                  <div className="onb-section-head">
                    <img src={ast.personal.userIcon} alt="" width={16} height={16} />
                    <h3>Basic Details</h3>
                  </div>
                  <div className="onb-personal-fields">
                    <div>
                      <label className="onb-label" htmlFor="onb-full-name">
                        Full name
                      </label>
                      <input
                        id="onb-full-name"
                        name="fullName"
                        className="onb-input"
                        type="text"
                        autoComplete="name"
                        placeholder="e.g. Jane Doe"
                        value={personalFullName}
                        onChange={(e) => setPersonalFullName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="onb-section-head">
                    <img src={ast.personal.mail} alt="" width={24} height={18} />
                    <h3>Contact Information</h3>
                  </div>
                  <div className="onb-personal-fields">
                    <div>
                      <label className="onb-label" htmlFor="onb-work-email">
                        Work Email
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          id="onb-work-email"
                          name="email"
                          className="onb-input"
                          style={{ paddingLeft: 41 }}
                          type="email"
                          autoComplete="email"
                          placeholder="name@company.com"
                          value={personalEmail}
                          onChange={(e) => setPersonalEmail(e.target.value)}
                        />
                        <img
                          src={ast.personal.mail}
                          alt=""
                          style={{
                            position: "absolute",
                            left: 16,
                            top: "50%",
                            transform: "translateY(-50%)",
                            pointerEvents: "none",
                          }}
                          width={17}
                          height={13}
                        />
                      </div>
                      <p className="onb-muted-sm" style={{ margin: "4px 0 0 8px" }}>
                        We&apos;ll send verification details here.
                      </p>
                    </div>
                    <div>
                      <label className="onb-label" htmlFor="onb-phone-local">
                        Phone Number
                      </label>
                      <div className="onb-phone-row">
                        <label htmlFor="onb-phone-dial" className="onb-visually-hidden">
                          Country dial code
                        </label>
                        <select
                          id="onb-phone-dial"
                          className="onb-input onb-select"
                          value={personalDialCode}
                          onChange={(e) => setPersonalDialCode(e.target.value)}
                          aria-label="Country dial code"
                        >
                          <option value="+1">US +1</option>
                          <option value="+44">UK +44</option>
                          <option value="+61">AU +61</option>
                          <option value="+91">IN +91</option>
                          <option value="+49">DE +49</option>
                          <option value="+33">FR +33</option>
                          <option value="+86">CN +86</option>
                          <option value="+81">JP +81</option>
                          <option value="+52">MX +52</option>
                          <option value="+55">BR +55</option>
                          <option value="+34">ES +34</option>
                          <option value="+39">IT +39</option>
                          <option value="+31">NL +31</option>
                          <option value="+46">SE +46</option>
                          <option value="+47">NO +47</option>
                          <option value="+65">SG +65</option>
                          <option value="+971">AE +971</option>
                          <option value="+966">SA +966</option>
                          <option value="+27">ZA +27</option>
                          <option value="+234">NG +234</option>
                          <option value="+254">KE +254</option>
                          <option value="+92">PK +92</option>
                          <option value="+880">BD +880</option>
                        </select>
                        <input
                          id="onb-phone-local"
                          name="phone"
                          className="onb-input onb-phone-row-input"
                          type="tel"
                          autoComplete="tel-national"
                          inputMode="tel"
                          placeholder="(555) 000-0000"
                          value={personalPhone}
                          onChange={(e) => setPersonalPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="onb-btn-row">
                  <button type="button" className="onb-btn onb-flex-gap onb-btn-ghost" onClick={back}>
                    <img src={ast.personal.back} alt="" width={13} height={13} />
                    Back
                  </button>
                  <button type="button" className="onb-btn onb-btn-primary onb-btn-primary--brand onb-flex-gap" onClick={next}>
                    Continue
                    <img src={ast.personal.forward} alt="" width={14} height={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {footer("narrow")}
        </>
      )}

      {step === 3 && (
        <>
          <div className="onb-notif-shell">
            <div className="onb-notif-card">
              <div className="onb-center" style={{ marginBottom: 32 }}>
                <h2 className="onb-h2" style={{ fontSize: 28, fontWeight: 400 }}>
                  Notification Settings
                </h2>
                <p className="onb-sub" style={{ marginTop: 8, maxWidth: 645, margin: "8px auto 0" }}>
                  Choose how {BRAND_NAME} keeps you updated.
                </p>
              </div>
              <div className="onb-notif-list">
                {notificationSwitchRow(
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path
                      d="M9 5H7a2 2 0 00-2 2v11a3 3 0 003 3h8a3 3 0 003-3V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      stroke="#6366f1"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>,
                  "Application Statuses",
                  "Stay informed about application statuses.",
                  "appStatus",
                )}
                {notificationSwitchRow(
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path
                      d="M7 10v12M7 11.5v-1a2.5 2.5 0 012.5-2.5H12a8 8 0 018 8 .5.5 0 01-.5.5H15a2 2 0 00-2-2v-5.5"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>,
                  "Job Recommendations",
                  "Receive job recommendations that fit your profile.",
                  "jobRec",
                )}
                {notificationSwitchRow(
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <circle cx={12} cy={12} r={10} stroke="#6366f1" strokeWidth={1.6} />
                    <path d="M12 16v-4M12 8h.02" stroke="#6366f1" strokeWidth={1.8} strokeLinecap="round" />
                  </svg>,
                  "Application Info Alerts",
                  "Get alerted if an application needs more info.",
                  "appInfo",
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, paddingTop: 25, borderTop: "1px solid #e2e8f0" }}>
                <button type="button" className="onb-btn onb-btn-ghost" style={{ fontSize: 14 }} onClick={back}>
                  Cancel
                </button>
                <button type="button" className="onb-btn onb-btn-primary onb-btn-primary--brand" style={{ padding: "10px 32px", fontSize: 14 }} onClick={next}>
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
          {footer()}
        </>
      )}

      {step === 4 && (
        <div className="onb-rb-shell">
          <div className="onb-rb-inner">
            <div className="onb-rb-header">
              <h1 className="onb-h1">Build Your Resume</h1>
              <p className="onb-sub" style={{ marginTop: 8 }}>
                {resumeOk
                  ? "Your resume data has been imported. Review and refine each section to ensure your profile is accurate."
                  : "Complete each section below to build a comprehensive professional profile."}
              </p>
            </div>

            <div className="onb-rb-sections" aria-label="Resume sections">

              {/* ── Work Experience ── */}
              <div className={`onb-rb-card${activeBuildSection === "work" ? " onb-rb-card--open" : ""}`}>
                <button type="button" className="onb-rb-card-row" onClick={() => setActiveBuildSection((s) => (s === "work" ? null : "work"))} aria-expanded={activeBuildSection === "work"}>
                  <span className="onb-rb-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="2" y="7" width="20" height="14" rx="2" stroke="#4648d4" strokeWidth="1.7"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="#4648d4" strokeWidth="1.7" strokeLinecap="round"/></svg>
                  </span>
                  <div className="onb-rb-card-text">
                    <span className="onb-rb-card-title">Work Experience</span>
                    <span className="onb-rb-card-desc">Professional roles and duties</span>
                  </div>
                  <span className="onb-rb-count">{workExperiences.length}</span>
                  <span className="onb-rb-toggle">{activeBuildSection === "work" ? "−" : "+"}</span>
                </button>
                {activeBuildSection === "work" && (
                  <div className="onb-rb-form">
                    {workExperiences.length === 0 && (
                      <p className="onb-rb-empty">No entries yet. Click Add Entry to get started.</p>
                    )}
                    {workExperiences.map((entry) => (
                      <div key={entry.id} className="onb-rb-edit-card">
                        <div className="onb-rb-edit-card-head">
                          <span className="onb-rb-edit-card-label">Work Experience</span>
                          <button type="button" className="onb-rb-remove" onClick={() => setWorkExperiences((c) => c.filter((x) => x.id !== entry.id))} aria-label="Remove entry">×</button>
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
                      </div>
                    ))}
                    <button type="button" className="onb-rb-add-btn" onClick={addBlankWorkExp}>+ Add Entry</button>
                  </div>
                )}
              </div>

              {/* ── Education ── */}
              <div className={`onb-rb-card${activeBuildSection === "edu" ? " onb-rb-card--open" : ""}`}>
                <button type="button" className="onb-rb-card-row" onClick={() => setActiveBuildSection((s) => (s === "edu" ? null : "edu"))} aria-expanded={activeBuildSection === "edu"}>
                  <span className="onb-rb-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M22 10L12 5 2 10l10 5 10-5z" stroke="#4648d4" strokeWidth="1.7" strokeLinejoin="round"/><path d="M6 12.5v4.5a9 9 0 0012 0v-4.5" stroke="#4648d4" strokeWidth="1.7" strokeLinecap="round"/></svg>
                  </span>
                  <div className="onb-rb-card-text">
                    <span className="onb-rb-card-title">Education</span>
                    <span className="onb-rb-card-desc">Academic background and degrees</span>
                  </div>
                  <span className="onb-rb-count">{education.length}</span>
                  <span className="onb-rb-toggle">{activeBuildSection === "edu" ? "−" : "+"}</span>
                </button>
                {activeBuildSection === "edu" && (
                  <div className="onb-rb-form">
                    {education.length === 0 && (
                      <p className="onb-rb-empty">No entries yet. Click Add Entry to get started.</p>
                    )}
                    {education.map((entry, i) => (
                      <div key={i} className="onb-rb-edit-card">
                        <div className="onb-rb-edit-card-head">
                          <span className="onb-rb-edit-card-label">Education</span>
                          <button type="button" className="onb-rb-remove" onClick={() => setEducation((c) => c.filter((_, j) => j !== i))} aria-label="Remove entry">×</button>
                        </div>
                        <div className="onb-we-card-grid">
                          <div className="onb-we-field">
                            <label className="onb-we-field-label">School / University</label>
                            <input className="onb-input onb-we-field-control" value={entry.school} onChange={(e) => updateEducation(i, "school", e.target.value)} placeholder="e.g. MIT" />
                          </div>
                          <div className="onb-we-field">
                            <label className="onb-we-field-label">Degree</label>
                            <input className="onb-input onb-we-field-control" value={entry.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} placeholder="e.g. B.Sc. Computer Science" />
                          </div>
                          <div className="onb-we-field">
                            <label className="onb-we-field-label">Graduation date</label>
                            <input className="onb-input onb-we-field-control" type="month" value={entry.date} onChange={(e) => updateEducation(i, "date", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="onb-rb-add-btn" onClick={() => setEducation((c) => [...c, { school: "", degree: "", date: "" }])}>+ Add Entry</button>
                  </div>
                )}
              </div>

              {/* ── Projects ── */}
              <div className={`onb-rb-card${activeBuildSection === "proj" ? " onb-rb-card--open" : ""}`}>
                <button type="button" className="onb-rb-card-row" onClick={() => setActiveBuildSection((s) => (s === "proj" ? null : "proj"))} aria-expanded={activeBuildSection === "proj"}>
                  <span className="onb-rb-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1" stroke="#4648d4" strokeWidth="1.7"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="#4648d4" strokeWidth="1.7"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="#4648d4" strokeWidth="1.7"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="#4648d4" strokeWidth="1.7"/></svg>
                  </span>
                  <div className="onb-rb-card-text">
                    <span className="onb-rb-card-title">Projects</span>
                    <span className="onb-rb-card-desc">Showcase your best work</span>
                  </div>
                  <span className="onb-rb-count">{projects.length}</span>
                  <span className="onb-rb-toggle">{activeBuildSection === "proj" ? "−" : "+"}</span>
                </button>
                {activeBuildSection === "proj" && (
                  <div className="onb-rb-form">
                    {projects.length === 0 && (
                      <p className="onb-rb-empty">No entries yet. Click Add Entry to get started.</p>
                    )}
                    {projects.map((entry, i) => (
                      <div key={i} className="onb-rb-edit-card">
                        <div className="onb-rb-edit-card-head">
                          <span className="onb-rb-edit-card-label">Project</span>
                          <button type="button" className="onb-rb-remove" onClick={() => setProjects((c) => c.filter((_, j) => j !== i))} aria-label="Remove entry">×</button>
                        </div>
                        <div className="onb-we-card-grid">
                          <div className="onb-we-field">
                            <label className="onb-we-field-label">Project name</label>
                            <input className="onb-input onb-we-field-control" value={entry.name} onChange={(e) => updateProject(i, "name", e.target.value)} placeholder="e.g. Portfolio Site" />
                          </div>
                          <div className="onb-we-field">
                            <label className="onb-we-field-label">Website / Link</label>
                            <input className="onb-input onb-we-field-control" type="url" value={entry.website} onChange={(e) => updateProject(i, "website", e.target.value)} placeholder="https://..." />
                          </div>
                          <div className="onb-we-field">
                            <label className="onb-we-field-label">Date</label>
                            <input className="onb-input onb-we-field-control" type="month" value={entry.date} onChange={(e) => updateProject(i, "date", e.target.value)} />
                          </div>
                          <div className="onb-we-field onb-we-field--full">
                            <label className="onb-we-field-label">Description</label>
                            <textarea className="onb-input onb-we-textarea" rows={2} value={entry.description} onChange={(e) => updateProject(i, "description", e.target.value)} placeholder="What did you build and how?" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="onb-rb-add-btn" onClick={() => setProjects((c) => [...c, { name: "", website: "", date: "", description: "" }])}>+ Add Entry</button>
                  </div>
                )}
              </div>

              {/* ── Skills ── */}
              <div className={`onb-rb-card${activeBuildSection === "skills" ? " onb-rb-card--open" : ""}`}>
                <button type="button" className="onb-rb-card-row" onClick={() => setActiveBuildSection((s) => (s === "skills" ? null : "skills"))} aria-expanded={activeBuildSection === "skills"}>
                  <span className="onb-rb-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="#4648d4" strokeWidth="1.7"/><path d="M9 12l2 2 4-4" stroke="#4648d4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <div className="onb-rb-card-text">
                    <span className="onb-rb-card-title">Skills</span>
                    <span className="onb-rb-card-desc">Technical &amp; soft skills</span>
                  </div>
                  <span className="onb-rb-count">{skills.length}</span>
                  <span className="onb-rb-toggle">{activeBuildSection === "skills" ? "−" : "+"}</span>
                </button>
                {activeBuildSection === "skills" && (
                  <div className="onb-rb-form">
                    {skills.length > 0 && (
                      <div className="onb-rb-tags" aria-live="polite">
                        {skills.map((skill, i) => (
                          <span key={i} className="onb-rb-tag">
                            {skill}
                            <button type="button" className="onb-rb-tag-remove" onClick={() => setSkills((c) => c.filter((_, j) => j !== i))} aria-label={`Remove ${skill}`}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="onb-rb-inline-add">
                      <input className="onb-input onb-rb-tag-input" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="e.g. React, Python, Leadership…" onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = newSkill.trim().replace(/,$/, "");
                          if (val && !skills.includes(val)) setSkills((c) => [...c, val]);
                          setNewSkill("");
                        }
                      }} />
                      <button type="button" className="onb-rb-add-btn" style={{ marginTop: 0 }} onClick={() => {
                        const val = newSkill.trim();
                        if (val && !skills.includes(val)) setSkills((c) => [...c, val]);
                        setNewSkill("");
                      }}>Add</button>
                    </div>
                    <p className="onb-muted-sm" style={{ marginTop: 4 }}>Press Enter or comma to add a skill</p>
                  </div>
                )}
              </div>

              {/* ── Certifications ── */}
              <div className={`onb-rb-card${activeBuildSection === "cert" ? " onb-rb-card--open" : ""}`}>
                <button type="button" className="onb-rb-card-row" onClick={() => setActiveBuildSection((s) => (s === "cert" ? null : "cert"))} aria-expanded={activeBuildSection === "cert"}>
                  <span className="onb-rb-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="#4648d4" strokeWidth="1.7" strokeLinejoin="round"/></svg>
                  </span>
                  <div className="onb-rb-card-text">
                    <span className="onb-rb-card-title">Certifications</span>
                    <span className="onb-rb-card-desc">Licenses and courses</span>
                  </div>
                  <span className="onb-rb-count">{certifications.length}</span>
                  <span className="onb-rb-toggle">{activeBuildSection === "cert" ? "−" : "+"}</span>
                </button>
                {activeBuildSection === "cert" && (
                  <div className="onb-rb-form">
                    {certifications.length === 0 && (
                      <p className="onb-rb-empty">No entries yet. Click Add Entry to get started.</p>
                    )}
                    {certifications.map((entry, i) => (
                      <div key={i} className="onb-rb-edit-card">
                        <div className="onb-rb-edit-card-head">
                          <span className="onb-rb-edit-card-label">Certification</span>
                          <button type="button" className="onb-rb-remove" onClick={() => setCertifications((c) => c.filter((_, j) => j !== i))} aria-label="Remove entry">×</button>
                        </div>
                        <div className="onb-we-card-grid">
                          <div className="onb-we-field">
                            <label className="onb-we-field-label">Certification name</label>
                            <input className="onb-input onb-we-field-control" value={entry.name} onChange={(e) => updateCertification(i, "name", e.target.value)} placeholder="e.g. AWS Certified Developer" />
                          </div>
                          <div className="onb-we-field">
                            <label className="onb-we-field-label">Link / URL</label>
                            <input className="onb-input onb-we-field-control" type="url" value={entry.link} onChange={(e) => updateCertification(i, "link", e.target.value)} placeholder="https://..." />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="onb-rb-add-btn" onClick={() => setCertifications((c) => [...c, { name: "", link: "" }])}>+ Add Entry</button>
                  </div>
                )}
              </div>

              {/* ── Interests ── */}
              <div className={`onb-rb-card${activeBuildSection === "interests" ? " onb-rb-card--open" : ""}`}>
                <button type="button" className="onb-rb-card-row" onClick={() => setActiveBuildSection((s) => (s === "interests" ? null : "interests"))} aria-expanded={activeBuildSection === "interests"}>
                  <span className="onb-rb-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 21C12 21 3 14 3 8.5A5.5 5.5 0 0112 5a5.5 5.5 0 019 3.5C21 14 12 21 12 21z" stroke="#4648d4" strokeWidth="1.7" strokeLinejoin="round"/></svg>
                  </span>
                  <div className="onb-rb-card-text">
                    <span className="onb-rb-card-title">Interests</span>
                    <span className="onb-rb-card-desc">Hobbies and passions</span>
                  </div>
                  <span className="onb-rb-count">{interests.length}</span>
                  <span className="onb-rb-toggle">{activeBuildSection === "interests" ? "−" : "+"}</span>
                </button>
                {activeBuildSection === "interests" && (
                  <div className="onb-rb-form">
                    {interests.length > 0 && (
                      <div className="onb-rb-tags" aria-live="polite">
                        {interests.map((item, i) => (
                          <span key={i} className="onb-rb-tag">
                            {item}
                            <button type="button" className="onb-rb-tag-remove" onClick={() => setInterests((c) => c.filter((_, j) => j !== i))} aria-label={`Remove ${item}`}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="onb-rb-inline-add">
                      <input className="onb-input onb-rb-tag-input" value={newInterest} onChange={(e) => setNewInterest(e.target.value)} placeholder="e.g. Open Source, Hiking, Design…" onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = newInterest.trim().replace(/,$/, "");
                          if (val && !interests.includes(val)) setInterests((c) => [...c, val]);
                          setNewInterest("");
                        }
                      }} />
                      <button type="button" className="onb-rb-add-btn" style={{ marginTop: 0 }} onClick={() => {
                        const val = newInterest.trim();
                        if (val && !interests.includes(val)) setInterests((c) => [...c, val]);
                        setNewInterest("");
                      }}>Add</button>
                    </div>
                    <p className="onb-muted-sm" style={{ marginTop: 4 }}>Press Enter or comma to add an interest</p>
                  </div>
                )}
              </div>

            </div>

            <div className="onb-rb-footer">
              <button type="button" className="onb-btn onb-btn-ghost onb-flex-gap" onClick={back}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M7.5 1.5L3 6l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back
              </button>
              <button type="button" className="onb-btn onb-btn-primary onb-btn-primary--brand onb-flex-gap onb-rb-continue" onClick={next}>
                Continue Building
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M4.5 1.5L9 6l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="onb-ready">
          <div className="onb-ready-grid">
            <div>
              <div className="onb-ready-check-wrap">
                <div className="onb-ready-check">
                  <img src={ast.ready.check} alt="" width={50} height={50} />
                </div>
              </div>
              <h2 className="onb-ready-title">
                You&apos;re almost ready
                <br />
                to swipe!
              </h2>
              <button type="button" className="onb-btn onb-btn-primary onb-btn-primary--brand" style={{ padding: "16px 64px", fontSize: 16 }} onClick={next}>
                Let&apos;s Go
              </button>
            </div>
            <div>
              <div className="onb-feature-card">
                <div className="onb-icon-64" style={{ background: "#e1e0ff" }}>
                  <img src={ast.ready.match} alt="" width={33} height={33} />
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 18 }}>Personalized Matches</p>
                  <p className="onb-muted-sm" style={{ lineHeight: 1.4 }}>
                    Curated professionals aligned with your career goals
                  </p>
                </div>
              </div>
              <div className="onb-feature-card" style={{ marginBottom: 0 }}>
                <div className="onb-icon-64" style={{ background: "#c9e6ff" }}>
                  <img src={ast.ready.chat} alt="" width={24} height={30} />
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 18 }}>Instant Connections</p>
                  <p className="onb-muted-sm" style={{ lineHeight: 1.4 }}>
                    Start meaningful conversations immediately upon matching
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 6 && (
        <>
          <div className="onb-roles">
            <div className="onb-roles-head">
              <div>
                <h1 className="onb-h1">What are you looking for?</h1>
                <p className="onb-sub" style={{ marginTop: 12 }}>
                  Select all the roles that align with your next career move.
                </p>
              </div>
              <button type="button" className="onb-btn onb-btn-primary onb-btn-primary--brand onb-flex-gap" onClick={next}>
                Continue
                <img src={ast.roles.continueArrow} alt="" width={13} height={13} />
              </button>
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
                    {title as string}
                    <img src={roles.includes(title as string) ? ast.roles.checkOn : ast.roles.checkOff} alt="" width={20} height={20} />
                  </div>
                  <p className="onb-muted-sm" style={{ margin: "0 0 24px", lineHeight: 1.45 }}>
                    {desc as string}
                  </p>
                  <div className="onb-flex-gap" style={{ color: roles.includes(title as string) ? "#4648d4" : "#64748b", fontSize: 14 }}>
                    Learn More
                    <img src={roles.includes(title as string) ? ast.roles.learnMoreOn : ast.roles.learnMoreOff} alt="" width={11} height={11} />
                  </div>
                </button>
              ))}
            </div>
          </div>
          <footer className="onb-footer" style={{ position: "relative" }}>
            <p className="onb-footer-copy" style={{ fontSize: 14 }}>
              © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
            </p>
            <nav className="onb-footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Contact Support</a>
            </nav>
          </footer>
        </>
      )}

      {step === 8 && (
        <div className="onb-loc-step-shell">
          <div className="onb-loc-split">
            <div className="onb-loc-side">
              <div className="onb-loc-side-scroll">
                <button
                  type="button"
                  className="onb-btn"
                  style={{ width: 40, height: 40, border: "1px solid #e2e8f0", borderRadius: 9999, marginBottom: 16 }}
                  onClick={back}
                  aria-label="Back"
                >
                  <img src={ast.location.backCircle} alt="" width={16} height={16} />
                </button>
                <h1 className="onb-h1">Where are you based?</h1>
                <p className="onb-sub" style={{ marginTop: 8 }}>
                  We use this to find relevant opportunities near you.
                </p>
                <div style={{ position: "relative", marginTop: 24 }}>
                  <input
                    className="onb-input"
                    style={{ borderRadius: 12, background: "#f1f5f9", padding: "17px 16px 17px 48px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", border: "none" }}
                    placeholder="Search city, area, or country"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                  />
                  <img src={ast.location.search} alt="" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} width={18} height={18} />
                </div>
                <p style={{ margin: "32px 0 16px", fontWeight: 700, fontSize: 16 }}>Popular locations</p>
                {filteredPopularLocations.map(({ city, region }) => {
                  const key = `${city}, ${region}`;
                  const sel = selectedBaseLocation === key;
                  const icon = sel
                    ? ast.location.pinSel
                    : region === "United Kingdom"
                      ? ast.location.pinAlt
                      : ast.location.pin;
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
                    <div className="onb-flex-gap">
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 32,
                          background: sel ? "rgba(70,72,212,0.2)" : "#efecf8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img src={icon as string} alt="" width={18} height={19} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 16, color: sel ? "#4648d4" : "#0f172a" }}>{city as string}</p>
                        <p style={{ margin: 0, fontSize: 14, color: sel ? "rgba(70,72,212,0.7)" : "#64748b" }}>{region as string}</p>
                      </div>
                    </div>
                    <img src={sel ? ast.location.checkSel : ast.location.checkCircle} alt="" width={16} height={16} />
                  </button>
                )})}
                {locationSearch.trim().length >= 2 ? (
                  <>
                    <p style={{ margin: "24px 0 12px", fontWeight: 700, fontSize: 16 }}>
                      Global location matches
                    </p>
                    {locationBusy ? (
                      <p className="onb-muted-sm" style={{ margin: "0 0 12px" }}>
                        Searching locations...
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className={`onb-loc-chip${selectedBaseLocation === locationSearch.trim() ? " onb-loc-chip--sel" : ""}`}
                      onClick={() => { void selectTypedLocation(); }}
                      aria-pressed={selectedBaseLocation === locationSearch.trim()}
                      disabled={!locationSearch.trim() || locationBusy}
                    >
                      <div className="onb-flex-gap">
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 32,
                            background: "rgba(70,72,212,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <img src={ast.location.pinSel} alt="" width={18} height={19} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 16, color: "#4648d4" }}>{locationSearch.trim()}</p>
                          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>Use exactly what I typed</p>
                        </div>
                      </div>
                      <img
                        src={selectedBaseLocation === locationSearch.trim() ? ast.location.checkSel : ast.location.checkCircle}
                        alt=""
                        width={16}
                        height={16}
                      />
                    </button>
                    {locationErr ? (
                      <p role="alert" style={{ margin: "0 0 12px", color: "#b91c1c", fontSize: 13 }}>
                        {locationErr}
                      </p>
                    ) : null}
                    {!locationBusy && !locationErr && locationResults.length === 0 ? (
                      <p className="onb-muted-sm" style={{ margin: "0 0 12px" }}>
                        No direct matches found for this query.
                      </p>
                    ) : null}
                    {locationResults.map((row, idx) => {
                      const { label, city, region } = row;
                      const key = `${city}, ${region}`;
                      const sel = selectedBaseLocation === key || selectedBaseLocation === label;
                      return (
                        <button
                          key={`${label}-${idx}`}
                          type="button"
                          className={`onb-loc-chip${sel ? " onb-loc-chip--sel" : ""}`}
                          onClick={() => {
                            setSelectedBaseLocation(label);
                            if (row.lngLat) {
                              setBaseMapLngLat({ lng: row.lngLat[0], lat: row.lngLat[1] });
                            }
                          }}
                          aria-pressed={sel}
                        >
                          <div className="onb-flex-gap">
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 32,
                                background: sel ? "rgba(70,72,212,0.2)" : "#efecf8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <img src={sel ? ast.location.pinSel : ast.location.pin} alt="" width={18} height={19} />
                            </div>
                            <div>
                              {row.source === "locationiq" ? (
                                <>
                                  <p style={{ margin: 0, fontSize: 16, color: sel ? "#4648d4" : "#0f172a" }}>{city}</p>
                                  <p style={{ margin: 0, fontSize: 14, color: sel ? "rgba(70,72,212,0.7)" : "#64748b" }}>{label}</p>
                                </>
                              ) : (
                                <>
                                  <p style={{ margin: 0, fontSize: 16, color: sel ? "#4648d4" : "#0f172a" }}>{city}</p>
                                  <p style={{ margin: 0, fontSize: 14, color: sel ? "rgba(70,72,212,0.7)" : "#64748b" }}>{region}</p>
                                </>
                              )}
                            </div>
                          </div>
                          <img src={sel ? ast.location.checkSel : ast.location.checkCircle} alt="" width={16} height={16} />
                        </button>
                      );
                    })}
                  </>
                ) : null}
              </div>
              <div className="onb-loc-side-actions">
                <button
                  type="button"
                  className="onb-btn onb-flex-gap onb-loc-action-secondary"
                  onClick={requestCurrentLocation}
                  disabled={locationGeoBusy}
                >
                  <img src={ast.location.locate} alt="" width={22} height={22} />
                  {locationGeoBusy ? "Locating…" : "Use current location"}
                </button>
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
        <div className="onb-target-shell">
          <div className="onb-target-split">
            <div className="onb-target-side">
              <div className="onb-target-side-scroll">
                <div className="onb-flex-gap" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <button
                    type="button"
                    className="onb-btn"
                    style={{ width: 40, height: 40, border: "1px solid #e2e8f0", borderRadius: 9999 }}
                    onClick={back}
                    aria-label="Back"
                  >
                    <img src={ast.location.backCircle} alt="" width={16} height={16} />
                  </button>
                </div>
                <h1 className="onb-h1">Where do you want to work next?</h1>
                <p className="onb-sub" style={{ marginTop: 8 }}>
                  These are your preferred opportunity locations, not your current base location.
                </p>

                <div style={{ position: "relative", marginTop: 24 }}>
                  <input
                    className="onb-input"
                    style={{ borderRadius: 12, background: "#f1f5f9", padding: "17px 16px 17px 48px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", border: "none" }}
                    placeholder="Search city or country"
                    value={targetLocationSearch}
                    onChange={(e) => setTargetLocationSearch(e.target.value)}
                    autoComplete="off"
                  />
                  <img src={ast.location.search} alt="" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} width={18} height={18} />
                </div>

                {targetLocationSearch.trim().length < 2 ? (
                  <>
                    <p style={{ margin: "28px 0 16px", fontWeight: 700, fontSize: 16 }}>Suggested targets</p>
                    {popularLocations.map(({ city, region }) => {
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
                          className={`onb-loc-chip${exists ? " onb-loc-chip--sel" : ""}`}
                          onClick={() => { if (!exists) addTargetLocation(city, normalizedCountry); }}
                          aria-pressed={exists}
                        >
                          <div className="onb-flex-gap">
                            <div
                              style={{
                                width: 40, height: 40, borderRadius: 32,
                                background: exists ? "rgba(70,72,212,0.2)" : "#efecf8",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              <img src={exists ? ast.location.pinSel : ast.location.pin} alt="" width={18} height={19} />
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 16, color: exists ? "#4648d4" : "#0f172a" }}>{city}</p>
                              <p style={{ margin: 0, fontSize: 14, color: exists ? "rgba(70,72,212,0.7)" : "#64748b" }}>{region}</p>
                            </div>
                          </div>
                          <img src={exists ? ast.location.checkSel : ast.location.checkCircle} alt="" width={16} height={16} />
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <p style={{ margin: "24px 0 12px", fontWeight: 700, fontSize: 16 }}>Location matches</p>
                    {targetSuggestBusy ? (
                      <p className="onb-muted-sm" style={{ margin: "0 0 12px" }}>Searching locations...</p>
                    ) : null}
                    {targetSuggestErr ? (
                      <p role="alert" style={{ margin: "0 0 12px", color: "#b91c1c", fontSize: 13 }}>{targetSuggestErr}</p>
                    ) : null}
                    {!targetSuggestBusy && !targetSuggestErr && targetSuggestRows.length === 0 ? (
                      <p className="onb-muted-sm" style={{ margin: "0 0 12px" }}>No matches found.</p>
                    ) : null}
                    {targetSuggestRows.map((r, idx) => {
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
                          className={`onb-loc-chip${exists ? " onb-loc-chip--sel" : ""}`}
                          onClick={() => { if (!exists) addTargetLocation(r.city, country); }}
                          aria-pressed={exists}
                        >
                          <div className="onb-flex-gap">
                            <div
                              style={{
                                width: 40, height: 40, borderRadius: 32,
                                background: exists ? "rgba(70,72,212,0.2)" : "#efecf8",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              <img src={exists ? ast.location.pinSel : ast.location.pin} alt="" width={18} height={19} />
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 16, color: exists ? "#4648d4" : "#0f172a" }}>{r.city}</p>
                              <p style={{ margin: 0, fontSize: 14, color: exists ? "rgba(70,72,212,0.7)" : "#64748b" }}>{r.label}</p>
                            </div>
                          </div>
                          <img src={exists ? ast.location.checkSel : ast.location.checkCircle} alt="" width={16} height={16} />
                        </button>
                      );
                    })}
                  </>
                )}

                <div style={{ marginTop: 22 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>Selected target locations</h3>
                  <p className="onb-muted-sm" style={{ marginBottom: 12 }}>
                    Add at least one location to continue.
                  </p>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                    {targetLocations.map(({ city, country }, i) => (
                      <div
                        key={`${city}-${country}`}
                        className="onb-target-list-row"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px 16px",
                          borderTop: i ? "1px solid #e2e8f0" : undefined,
                        }}
                      >
                        <div className="onb-flex-gap onb-target-list-main">
                          <img src={ast.target.pin} alt="" width={22} height={22} />
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{city}</p>
                            <p className="onb-muted-sm" style={{ margin: 0, fontSize: 12 }}>
                              {country}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="onb-btn"
                          style={{ padding: 6, borderRadius: 8 }}
                          onClick={() => removeTargetLocation(city, country)}
                          aria-label={`Remove ${city}, ${country}`}
                        >
                          <img src={ast.workExp.trash} alt="" width={12} height={14} />
                        </button>
                      </div>
                    ))}
                    {targetLocations.length === 0 ? (
                      <div style={{ padding: 16, color: "#64748b", fontSize: 14 }}>
                        No target locations yet. Add one city/country pair to continue.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="onb-target-actions">
                <button type="button" className="onb-btn onb-btn-ghost" onClick={back}>
                  Back
                </button>
                <button
                  type="button"
                  className="onb-btn onb-btn-primary onb-btn-primary--brand"
                  onClick={next}
                  disabled={targetLocations.length === 0}
                >
                  Continue
                </button>
              </div>
            </div>

            <div className="onb-target-visual">
              <div className="onb-target-visual-card">
                <h3 style={{ margin: "0 0 10px", fontSize: 22 }}>Target locations</h3>
                <p className="onb-sub" style={{ margin: 0 }}>
                  Choose cities where you want to receive opportunities. Your base location and target locations are used together to improve matching quality.
                </p>
                <div className="onb-target-visual-points">
                  <div className="onb-flex-gap">
                    <img src={ast.target.pin} alt="" width={18} height={18} />
                    <span>Add at least one preferred destination</span>
                  </div>
                  <div className="onb-flex-gap">
                    <img src={ast.target.pin} alt="" width={18} height={18} />
                    <span>Use suggestions for quick setup</span>
                  </div>
                  <div className="onb-flex-gap">
                    <img src={ast.target.pin} alt="" width={18} height={18} />
                    <span>Update this later from onboarding/profile</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 10 && (
        <>
          <div style={{ flex: 1, padding: "124px 24px 172px", display: "flex", justifyContent: "center" }}>
            <div className="onb-wpref-card">
              <div className="onb-center" style={{ marginBottom: 40 }}>
                <h1 className="onb-h1">How do you prefer to work?</h1>
                <p className="onb-sub" style={{ marginTop: 16, maxWidth: 672 }}>
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
                      style={{ position: "relative" }}
                    >
                      {popular && (
                        <span style={{ position: "absolute", top: 0, right: 0, background: "#6063ee", color: "#fffbff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderBottomLeftRadius: 48 }}>
                          Popular
                        </span>
                      )}
                      <div className="onb-flex-gap" style={{ justifyContent: "space-between", marginBottom: 16, paddingTop: popular ? 8 : 0 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 9999,
                            background: sel ? "#fff" : "#f1f5f9",
                            border: sel ? "1px solid rgba(96,99,238,0.2)" : "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: sel ? "0 1px 1px rgba(0,0,0,0.05)" : undefined,
                          }}
                        >
                          <img src={icon} alt="" width={20} height={18} />
                        </div>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 9999,
                            border: sel ? "2px solid #6063ee" : "2px solid #c7c4d7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {sel && <span style={{ width: 12, height: 12, borderRadius: 9999, background: "#6063ee" }} />}
                        </span>
                      </div>
                      <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: sel ? "#6063ee" : "#0f172a" }}>{title}</h3>
                      <p className="onb-muted-sm" style={{ margin: "0 0 8px", lineHeight: 1.4 }}>
                        {sub}
                      </p>
                      {bullets.map((b) => (
                        <div key={b} className="onb-flex-gap" style={{ marginTop: 8, alignItems: "flex-start" }}>
                          <img src={sel ? ast.workPref.bulletSel : ast.workPref.bullet} alt="" width={15} height={15} />
                          <span className="onb-muted-sm" style={{ fontSize: 16 }}>
                            {b}
                          </span>
                        </div>
                      ))}
                    </button>
                  );
                })}
              </div>
              <div className="onb-btn-row" style={{ marginTop: 48 }}>
                <button type="button" className="onb-btn onb-flex-gap onb-btn-ghost" onClick={back}>
                  <img src={ast.workPref.back} alt="" width={9} height={9} />
                  Back
                </button>
                <button type="button" className="onb-btn onb-btn-primary onb-btn-primary--brand onb-flex-gap" onClick={next}>
                  Save Preferences
                  <img src={ast.workPref.forward} alt="" width={9} height={9} />
                </button>
              </div>
            </div>
          </div>
          <footer className="onb-footer">
            <nav className="onb-footer-links" style={{ fontSize: 12 }}>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Contact Support</a>
              <a href="#">Help Center</a>
            </nav>
            <p className="onb-footer-copy" style={{ fontSize: 12 }}>
              © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
            </p>
          </footer>
        </>
      )}

      {step === 11 && (
        <>
          <div className="onb-emp-layout">
            <div style={{ flex: 1, maxWidth: 896 }}>
              <h1 className="onb-h1">Employment Models</h1>
              <p className="onb-sub" style={{ marginTop: 12 }}>
                Select the types of employment you are currently considering for your next career move. You can select multiple options.
              </p>
              <div className="onb-emp-grid" style={{ marginTop: 40 }}>
                {(
                  [
                    ["Full Time", ast.employment.iconFullTime, "Standard 40 hours a week roles. Typically includes comprehensive benefits packages, paid time off, and long-term career growth opportunities within the company.", ["Benefits included", "W2 Status"]],
                    ["Contract", ast.employment.iconContract, "Project-based or fixed-term engagements. Offers high flexibility and often higher hourly rates, but typically without standard employer benefits.", ["1099 or W2", "Flexible"]],
                    ["Part Time", ast.employment.iconPartTime, "Flexible roles under 40 hours a week. Ideal for balancing work with education, family responsibilities, or other concurrent employment.", ["< 40 hours", "Work-life balance"]],
                    ["Internship", ast.employment.iconIntern, "Short-term roles aimed at students or recent graduates. Focused on mentorship, learning, and gaining practical industry experience.", ["Learning focused", "Entry level"]],
                  ] as const
                ).map(([title, icon, desc, tags]) => {
                  const sel = employment.includes(title);
                  return (
                    <button key={title} type="button" className={`onb-emp-card${sel ? " onb-emp-card--sel" : ""}`} onClick={() => toggleEmployment(title)}>
                      <img src={sel ? ast.employment.cardCheckOn : ast.employment.cardCheckOff} alt="" width={20} height={20} style={{ position: "absolute", top: 16, right: 16 }} />
                      <div style={{ marginBottom: 16 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 9999,
                            background: sel ? "rgba(99,102,241,0.1)" : "#efecf8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <img src={icon} alt="" width={20} height={20} />
                        </div>
                      </div>
                      <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: sel ? "#6366f1" : "#0f172a" }}>{title}</h3>
                      <p className="onb-muted-sm" style={{ margin: "0 0 16px", lineHeight: 1.45 }}>
                        {desc}
                      </p>
                      <div className="onb-flex-gap" style={{ flexWrap: "wrap" }}>
                        {tags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              padding: "5px 11px",
                              borderRadius: 9999,
                              background: sel ? "#fff" : "#efecf8",
                              border: sel ? "1px solid rgba(99,102,241,0.2)" : "none",
                              color: sel ? "#6366f1" : "#64748b",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="onb-btn-row" style={{ marginTop: 32 }}>
                <button type="button" className="onb-btn onb-flex-gap onb-btn-ghost" onClick={back}>
                  <img src={ast.employment.back} alt="" width={9} height={9} />
                  Back
                </button>
                <button type="button" className="onb-btn onb-btn-primary onb-btn-primary--brand onb-flex-gap" onClick={next}>
                  Save & Continue
                  <img src={ast.employment.forward} alt="" width={9} height={9} />
                </button>
              </div>
            </div>
          </div>
          {footer()}
        </>
      )}

      {step === 12 && (
        <>
          <div className="onb-exp">
            <div style={{ maxWidth: 896, margin: "0 auto" }}>
              <h1 className="onb-h1">Define Your Experience Level</h1>
              <p className="onb-sub" style={{ marginTop: 16, maxWidth: 672 }}>
                Help us tailor your dashboard by providing more context about your professional background. Select the single level that best describes your current role.
              </p>
              {(
                [
                  ["Entry Level Professional", "0-2 years", "Just starting out or building foundational skills. You focus on executing tasks effectively under guidance and learning best practices."],
                  ["Mid-Level Professional", "3-5 years", "Solid experience executing complex projects independently. You contribute to strategy, mentor juniors, and handle broader responsibilities."],
                  ["Senior Level Expert", "5+ years", "Leading teams and driving strategic initiatives. You are responsible for high-level decision making, architecture, and driving overall business impact."],
                ] as const
              ).map(([title, years, desc]) => {
                const sel = experienceLevel === title;
                return (
                  <button key={title} type="button" className={`onb-exp-row${sel ? " onb-exp-row--sel" : ""}`} onClick={() => selectExperienceLevel(title)}>
                    <img src={sel ? ast.experience.radioOn : ast.experience.radioOff} alt="" width={18} height={22} />
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div className="onb-flex-gap" style={{ marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 20, fontWeight: 600, color: sel ? "#6366f1" : "#0f172a" }}>{title}</span>
                        <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 9999, background: sel ? "rgba(99,102,241,0.1)" : "#efecf8", color: sel ? "#6366f1" : "#64748b" }}>{years}</span>
                      </div>
                      <p className="onb-sub" style={{ margin: 0, lineHeight: 1.5 }}>
                        {desc}
                      </p>
                    </div>
                  </button>
                );
              })}
              <div className="onb-btn-row" style={{ marginTop: 48 }}>
                <button type="button" className="onb-btn onb-flex-gap onb-btn-ghost" onClick={back}>
                  <img src={ast.experience.back} alt="" width={16} height={16} />
                  Back
                </button>
                <button
                  type="button"
                  className="onb-btn onb-btn-primary onb-btn-primary--brand onb-flex-gap"
                  disabled={prefsBusy || !experienceLevel}
                  onClick={() => void finish()}
                >
                  {prefsBusy ? "Saving…" : "Continue to Profile"}
                  <img src={ast.experience.forward} alt="" width={16} height={16} />
                </button>
              </div>
            </div>
          </div>
          {footer()}
        </>
      )}
      </div>
    </div>
  );
}
