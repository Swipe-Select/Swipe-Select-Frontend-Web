import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND_NAME } from "../brand";
import { onboardingAssets as ast } from "../figma/onboardingAssets";
import { extractResumePdf, savePreferences } from "../api/onboarding";
import { useAuth } from "../context/AuthContext";
import "./OnboardingPage.css";

type GenderId = "female" | "male" | "nonbinary";
type OnboardingEntryMode = "resume" | "manual" | null;

function workPrefLabel(w: "remote" | "hybrid" | "office") {
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

const VISA_STATUS_OPTIONS = [
  "Citizen / Permanent Resident",
  "Requires Visa Sponsorship",
  "Work Visa Holder",
  "Student Visa",
  "Dependent Visa",
  "Other / Prefer not to say",
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { session, setSession } = useAuth();
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
  const [workPref, setWorkPref] = useState<"remote" | "hybrid" | "office">("hybrid");
  const [employment, setEmployment] = useState<string[]>(["Full Time"]);
  const [experience, setExperience] = useState<string[]>(["Entry Level Professional", "Mid-Level Professional"]);
  const [personalFullName, setPersonalFullName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [personalDialCode, setPersonalDialCode] = useState("+1");
  const [personalPhone, setPersonalPhone] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [workEmployer, setWorkEmployer] = useState("");
  const [workStartMonth, setWorkStartMonth] = useState("");
  const [workPresentRole, setWorkPresentRole] = useState(true);
  const [workEndMonth, setWorkEndMonth] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["United States", "United Kingdom"]);
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedBaseLocation, setSelectedBaseLocation] = useState("New York, New York, US");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationErr, setLocationErr] = useState<string | null>(null);
  const [locationResults, setLocationResults] = useState<
    Array<{ label: string; city: string; region: string; source: "photon" | "nominatim" }>
  >([]);
  const [targetLocations, setTargetLocations] = useState<Array<{ city: string; country: string }>>([
    { city: "Lahore", country: "Pakistan" },
    { city: "Dubai", country: "United Arab Emirates" },
  ]);
  const [showAddTargetLocationForm, setShowAddTargetLocationForm] = useState(false);
  const [newTargetCity, setNewTargetCity] = useState("");
  const [newTargetCountry, setNewTargetCountry] = useState("");
  const [countryVisaStatus, setCountryVisaStatus] = useState<Record<string, string>>({
    "United States": "Citizen / Permanent Resident",
    "United Kingdom": "Requires Visa Sponsorship",
  });
  const filteredCountries = COUNTRY_OPTIONS.filter((country) =>
    country.toLowerCase().includes(countrySearch.trim().toLowerCase()),
  );
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
  const sourcePriority: Record<"photon" | "nominatim", number> = {
    photon: 2,
    nominatim: 1,
  };

  const scoreLocationMatch = useCallback(
    (
      query: string,
      candidate: { label: string; city: string; region: string; source: "photon" | "nominatim" },
    ) => {
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
    (
      query: string,
      rawResults: Array<{
        label: string;
        city: string;
        region: string;
        source: "photon" | "nominatim";
      }>,
    ) => {
      const deduped = Array.from(
        new Map(rawResults.map((entry) => [entry.label.toLowerCase(), entry])).values(),
      );
      const scored = deduped
        .map((entry) => ({ entry, score: scoreLocationMatch(query, entry) }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const sourceDelta = sourcePriority[b.entry.source] - sourcePriority[a.entry.source];
          if (sourceDelta !== 0) return sourceDelta;
          return a.entry.label.length - b.entry.label.length;
        })
        .map((item) => item.entry);

      return scored.slice(0, 8);
    },
    [scoreLocationMatch],
  );

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
        const fetchPhoton = async (queryText: string) => {
          const photonParams = new URLSearchParams({ q: queryText, limit: "8" });
          const res = await fetch(`https://photon.komoot.io/api/?${photonParams.toString()}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          if (!res.ok) return [] as Array<{ label: string; city: string; region: string; source: "photon" }>;
          const json = (await res.json()) as {
            features?: Array<{
              properties?: {
                name?: string;
                city?: string;
                county?: string;
                state?: string;
                country?: string;
                postcode?: string;
              };
            }>;
          };
          return (json.features ?? [])
            .map((feature) => {
              const p = feature.properties;
              const city = p?.city || p?.name || p?.county || "Unknown City";
              const regionParts = [p?.state, p?.country, p?.postcode].filter(Boolean);
              const region = regionParts.length ? regionParts.join(", ") : "Unknown Region";
              const label = [city, region].filter(Boolean).join(", ");
              return { label, city, region, source: "photon" as const };
            })
            .filter((entry) => entry.label.trim().length > 0);
        };

        const fetchNominatim = async (queryText: string) => {
          const params = new URLSearchParams({
            format: "jsonv2",
            addressdetails: "1",
            limit: "8",
            q: queryText,
          });
          const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          if (!res.ok) return [] as Array<{ label: string; city: string; region: string; source: "nominatim" }>;
          const json = (await res.json()) as Array<{
            display_name?: string;
            address?: {
              city?: string;
              town?: string;
              village?: string;
              county?: string;
              state?: string;
              country?: string;
              postcode?: string;
            };
          }>;
          return json
            .map((entry) => {
              const city =
                entry.address?.city ||
                entry.address?.town ||
                entry.address?.village ||
                entry.address?.county ||
                "Unknown City";
              const regionParts = [entry.address?.state, entry.address?.country, entry.address?.postcode].filter(Boolean);
              const region = regionParts.length ? regionParts.join(", ") : "Unknown Region";
              const label = entry.display_name || `${city}, ${region}`;
              return { label, city, region, source: "nominatim" as const };
            })
            .filter((entry) => entry.label.trim().length > 0);
        };

        const combinedResults = [...(await fetchPhoton(q)), ...(await fetchNominatim(q))];
        setLocationResults(finalizeLocationResults(q, combinedResults));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLocationErr("Could not load locations right now. You can still use your typed location.");
        setLocationResults([]);
      } finally {
        setLocationBusy(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [locationSearch, finalizeLocationResults]);
  const next = useCallback(() => {
    setStep((currentStep) => {
      if (currentStep === 1) {
        if (resumeOk) {
          setStepError(null);
          return 5;
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

      if (currentStep === 4) {
        const hasTitle = workTitle.trim().length > 1;
        const hasEmployer = workEmployer.trim().length > 1;
        const hasStart = Boolean(workStartMonth);
        const hasEnd = workPresentRole || Boolean(workEndMonth);
        const hasLocation = workLocation.trim().length > 1;
        const hasDescription = workDescription.trim().length > 10;
        if (!hasTitle || !hasEmployer || !hasStart || !hasEnd || !hasLocation || !hasDescription) {
          setStepError("Please complete your work experience details before continuing.");
          return currentStep;
        }
      }

      if (currentStep === 6 && roles.length === 0) {
        setStepError("Select at least one role to continue.");
        return currentStep;
      }

      if (currentStep === 7 && selectedCountries.length === 0) {
        setStepError("Select at least one country to continue.");
        return currentStep;
      }

      if (currentStep === 9 && targetLocations.length === 0) {
        setStepError("Add at least one target location before continuing.");
        return currentStep;
      }

      if (currentStep === 11 && employment.length === 0) {
        setStepError("Select at least one employment model to continue.");
        return currentStep;
      }

      if (currentStep === 12 && experience.length === 0) {
        setStepError("Select at least one experience level to continue.");
        return currentStep;
      }

      setStepError(null);
      return Math.min(currentStep + 1, 12);
    });
  }, [
    entryMode,
    resumeOk,
    personalFullName,
    personalEmail,
    personalPhone,
    workTitle,
    workEmployer,
    workStartMonth,
    workPresentRole,
    workEndMonth,
    workLocation,
    workDescription,
    roles.length,
    selectedCountries.length,
    targetLocations.length,
    employment.length,
    experience.length,
  ]);
  const back = useCallback(() => {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
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
        setStep(5);
        if (session) {
          setSession({ ...session, onboardingStep: 1 });
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
        gender,
        jobTitles: normalizeList(roles),
        targetCountries: normalizeList(selectedCountries),
        baseLocation: normalizedBaseLocation,
        workLocations: normalizedWorkLocations,
        workMode: [workPrefLabel(workPref)],
        jobTypes: normalizeList(employment),
        experienceLevel: normalizeList(experience),
        onboardingStep: 2,
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
      json.success && typeof json === 'object' && 'data' in json ? (json.data as { onboardingStep?: number }) : {};
    const nextStep = prefsData.onboardingStep ?? 2;
    if (session) {
      setSession({
        ...session,
        onboardingStep: nextStep,
      });
    }
    navigate('/onboarding/complete');
  }, [
    navigate,
    session,
    setSession,
    gender,
    roles,
    workPref,
    employment,
    experience,
    selectedCountries,
    selectedBaseLocation,
    targetLocations,
  ]);

  const toggleRole = (name: string) => {
    setRoles((r) => (r.includes(name) ? r.filter((x) => x !== name) : [...r, name]));
  };

  const toggleEmployment = (name: string) => {
    setEmployment((r) => (r.includes(name) ? r.filter((x) => x !== name) : [...r, name]));
  };

  const toggleExperience = (name: string) => {
    setExperience((r) => (r.includes(name) ? r.filter((x) => x !== name) : [...r, name]));
  };

  const addCountry = (country: string) => {
    setSelectedCountries((current) => (current.includes(country) ? current : [...current, country]));
    setCountryVisaStatus((current) =>
      current[country] ? current : { ...current, [country]: "Requires Visa Sponsorship" },
    );
  };

  const removeCountry = (country: string) => {
    setSelectedCountries((current) => current.filter((entry) => entry !== country));
  };
  const addTargetLocation = () => {
    const cityRaw = newTargetCity.trim();
    const countryRaw = newTargetCountry.trim();
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
    setNewTargetCity("");
    setNewTargetCountry("");
    setShowAddTargetLocationForm(false);
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
    <div className="onb page-fill">
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
                    <p style={{ margin: "0 0 16px", fontSize: 14, color: "#15803d" }}>
                      Resume parsed and saved to your profile.
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
                className="onb-btn onb-btn-primary onb-btn-primary--brand onb-flex-gap"
                disabled={resumeBusy || (!resumeOk && entryMode !== "manual")}
                onClick={next}
              >
                Continue
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
        <div className="onb-we-layout">
          <div className="onb-we-main onb-scroll">
            <div className="onb-we-inner">
              <h2 className="onb-h2">Work Experience</h2>
              <p className="onb-sub onb-we-lead">
                Detail your professional roles, duties, and achievements.
              </p>

              <div className="onb-we-card">
                <div className="onb-we-card-toolbar">
                  <label className="onb-visually-hidden" htmlFor="work-exp-title-inline">
                    Job title
                  </label>
                  <div className="onb-flex-gap onb-we-job-title-row">
                    <img src={ast.workExp.grip} alt="" width={8} height={13} className="onb-we-grip-icon" aria-hidden />
                    <input
                      id="work-exp-title-inline"
                      className="onb-input onb-we-field-control onb-we-title-field"
                      value={workTitle}
                      onChange={(e) => setWorkTitle(e.target.value)}
                      placeholder="e.g. Senior Frontend Developer"
                      autoComplete="organization-title"
                    />
                  </div>
                </div>

                <div className="onb-we-card-grid">
                  <div className="onb-we-field">
                    <label className="onb-we-field-label" htmlFor="work-exp-employer">
                      Employer
                    </label>
                    <input
                      id="work-exp-employer"
                      className="onb-input onb-we-field-control"
                      value={workEmployer}
                      onChange={(e) => setWorkEmployer(e.target.value)}
                      placeholder="e.g. TechNova Solutions"
                      autoComplete="organization"
                    />
                  </div>

                  <div className="onb-we-field">
                    <label className="onb-we-field-label" htmlFor="work-exp-start">
                      Start date
                    </label>
                    <input
                      id="work-exp-start"
                      className="onb-input onb-we-field-control"
                      type="month"
                      value={workStartMonth}
                      onChange={(e) => setWorkStartMonth(e.target.value)}
                    />
                  </div>

                  <div className="onb-we-field">
                    <span className="onb-we-field-label">End date</span>
                    <div className="onb-we-end-wrap">
                      {!workPresentRole ? (
                        <>
                          <label className="onb-visually-hidden" htmlFor="work-exp-end">
                            End date month
                          </label>
                        <input
                          id="work-exp-end"
                          type="month"
                          className="onb-input onb-we-field-control onb-we-end-month"
                          value={workEndMonth}
                          onChange={(e) => setWorkEndMonth(e.target.value)}
                        />
                        </>
                      ) : null}
                      <label className="onb-we-inline-check">
                        <input
                          type="checkbox"
                          checked={workPresentRole}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setWorkPresentRole(next);
                            if (next) setWorkEndMonth("");
                          }}
                        />
                        <span>I currently work here</span>
                      </label>
                    </div>
                  </div>

                  <div className="onb-we-field onb-we-field--full">
                    <label className="onb-we-field-label" htmlFor="work-exp-location">
                      Location
                    </label>
                    <input
                      id="work-exp-location"
                      className="onb-input onb-we-field-control"
                      value={workLocation}
                      onChange={(e) => setWorkLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA (Remote)"
                      autoComplete="address-level2"
                    />
                  </div>

                  <div className="onb-we-field onb-we-field--full">
                    <label className="onb-we-field-label" htmlFor="work-exp-desc">
                      Description
                    </label>
                    <textarea
                      id="work-exp-desc"
                      className="onb-input onb-we-textarea"
                      rows={5}
                      value={workDescription}
                      onChange={(e) => setWorkDescription(e.target.value)}
                      placeholder="Briefly describe highlights, achievements, tech stack..."
                    />
                  </div>
                </div>
              </div>

              <button type="button" className="onb-btn onb-we-add">
                <img src={ast.workExp.add} alt="" width={14} height={14} />
                Add Work Experience
              </button>

              <div className="onb-btn-row onb-we-actions">
                <button type="button" className="onb-btn onb-btn-ghost" onClick={back}>
                  Back
                </button>
                <button type="button" className="onb-btn onb-btn-primary onb-btn-primary--brand" onClick={next}>
                  Continue
                </button>
              </div>
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

      {step === 7 && (
        <div className="onb-country">
          <div className="onb-country-head">
            <div className="onb-flex-gap">
              <button type="button" className="onb-btn" style={{ width: 40, height: 40, border: "1px solid #e2e8f0", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={back}>
                <img src={ast.country.back} alt="" width={13} height={13} />
              </button>
              <span style={{ fontWeight: 600, fontSize: 20, fontFamily: "Inter, sans-serif" }}>Application Setup</span>
            </div>
          </div>
          <div className="onb-country-body">
            <div className="onb-country-list onb-country-panel">
              <h3 style={{ margin: "0 0 4px", fontSize: 18, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Available Countries</h3>
              <p className="onb-muted-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                Select countries you are applying to.
              </p>
              <div style={{ position: "relative", marginTop: 12 }}>
                <input
                  className="onb-input"
                  style={{ borderRadius: 6, background: "#f1f5f9", paddingLeft: 40, fontFamily: "Inter, sans-serif", fontSize: 14 }}
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                />
                <img src={ast.country.search} alt="" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width={18} height={18} />
              </div>
              <div style={{ marginTop: 8, maxHeight: 280, overflowY: "auto" }}>
                {filteredCountries.map((c) => {
                  const isSelected = selectedCountries.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`onb-btn onb-flex-gap onb-country-select-row${isSelected ? " onb-country-select-row--selected" : ""}`}
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                        padding: 13,
                        borderRadius: 8,
                        border: isSelected ? "1px solid #c7d2fe" : "1px solid transparent",
                        background: isSelected ? "#eef2ff" : "transparent",
                      }}
                      onClick={() => (isSelected ? removeCountry(c) : addCountry(c))}
                      aria-pressed={isSelected}
                      aria-label={isSelected ? `Remove ${c}` : `Add ${c}`}
                    >
                      <span className="onb-flex-gap">
                        <span style={{ width: 32, height: 32, borderRadius: 9999, background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <img src={ast.country.flag} alt="" width={12} height={12} />
                        </span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500 }}>{c}</span>
                      </span>
                      <span className="onb-flex-gap" style={{ color: isSelected ? "#4648d4" : "#64748b", fontSize: 12, fontWeight: 600 }}>
                        {isSelected ? "Selected" : "Select"}
                        <img src={isSelected ? ast.country.done : ast.country.plus} alt="" width={14} height={14} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="onb-country-detail">
              <div className="onb-flex-gap" style={{ justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 24, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>Selected Countries</h2>
                  <p className="onb-muted-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                    Configure your visa requirements for each selection.
                  </p>
                </div>
                <div className="onb-flex-gap">
                  <button
                    type="button"
                    className="onb-btn onb-btn-primary onb-btn-primary--brand onb-country-cta"
                    style={{ borderRadius: 6, padding: "8px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, boxShadow: "0 1px 1px rgba(0,0,0,0.05)" }}
                    onClick={next}
                    disabled={selectedCountries.length === 0}
                  >
                    Save & Continue
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {selectedCountries.map((name) => {
                  const visa = countryVisaStatus[name] ?? "Requires Visa Sponsorship";
                  const isCitizen = visa === "Citizen / Permanent Resident";
                  const infoImg = isCitizen ? ast.country.infoBlue : ast.country.infoAmber;
                  const bg = isCitizen ? "#eff6ff" : "#fffbeb";
                  const border = isCitizen ? "#dbeafe" : "#fef3c7";
                  const color = isCitizen ? "#1e3a8a" : "#78350f";
                  return (
                  <div key={name} className="onb-country-selected-card" style={{ flex: "1 1 340px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 21, boxShadow: "0 1px 1px rgba(0,0,0,0.05)" }}>
                    <div className="onb-flex-gap" style={{ justifyContent: "space-between", marginBottom: 24 }}>
                      <div className="onb-flex-gap">
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <img src={ast.country.countryIcon} alt="" width={17} height={17} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 18, fontFamily: "Inter, sans-serif" }}>{name}</p>
                          <p className="onb-muted-sm" style={{ margin: 0, fontSize: 12 }}>
                            Added recently
                          </p>
                        </div>
                      </div>
                      <button type="button" className="onb-btn" style={{ width: 32, height: 32 }} onClick={() => removeCountry(name)} aria-label={`Remove ${name}`}>
                        <img src={ast.country.close} alt="" width={13} height={15} />
                      </button>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.6px", color: "#64748b", margin: "0 0 6px", fontFamily: "Inter, sans-serif" }}>VISA STATUS</p>
                    <div style={{ position: "relative", marginBottom: 16 }}>
                      <select
                        className="onb-input onb-select"
                        style={{ borderRadius: 6, background: "#f1f5f9", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, paddingRight: 36 }}
                        value={visa}
                        onChange={(e) =>
                          setCountryVisaStatus((current) => ({ ...current, [name]: e.target.value }))
                        }
                        aria-label={`${name} visa status`}
                      >
                        {VISA_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="onb-flex-gap" style={{ alignItems: "flex-start", background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: 13 }}>
                      <img src={infoImg} alt="" width={18} height={18} />
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color, fontFamily: "Inter, sans-serif" }}>
                        {isCitizen
                          ? `You marked ${name} as citizen/permanent resident, so your profile will show that sponsorship is not required there.`
                          : `You marked ${name} as requiring visa support or a non-citizen status, so employers can assess sponsorship eligibility accordingly.`}
                      </p>
                    </div>
                  </div>
                )})}
                {selectedCountries.length === 0 ? (
                  <div
                    style={{
                      width: "100%",
                      border: "1px dashed #cbd5e1",
                      borderRadius: 12,
                      padding: 16,
                      background: "#f8fafc",
                      color: "#64748b",
                      fontSize: 14,
                    }}
                  >
                    No countries selected yet. Add at least one country to continue.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 8 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            minHeight: 0,
            width: "100%",
          }}
        >
          <div
            className="onb-country-head"
            style={{
              boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
              justifyContent: "flex-end",
            }}
          >
            <button type="button" className="onb-btn" aria-label="Close" onClick={() => navigate("/onboarding/complete")}>
              <img src={ast.location.close} alt="" width={20} height={20} />
            </button>
          </div>
          <div className="onb-loc-split">
            <div className="onb-loc-side">
              <div style={{ padding: 32, flex: 1, overflowY: "auto" }}>
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
                    onClick={() => setSelectedBaseLocation(key)}
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
                      onClick={() => setSelectedBaseLocation(locationSearch.trim())}
                      aria-pressed={selectedBaseLocation === locationSearch.trim()}
                      disabled={!locationSearch.trim()}
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
                    {locationResults.map(({ label, city, region }, idx) => {
                      const key = `${city}, ${region}`;
                      const sel = selectedBaseLocation === key || selectedBaseLocation === label;
                      return (
                        <button
                          key={label}
                          type="button"
                          className={`onb-loc-chip${sel ? " onb-loc-chip--sel" : ""}`}
                          onClick={() => setSelectedBaseLocation(label)}
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
                              <p style={{ margin: 0, fontSize: 16, color: sel ? "#4648d4" : "#0f172a" }}>
                                {idx === 0 ? `Detected: ${city}` : city}
                              </p>
                              <p style={{ margin: 0, fontSize: 14, color: sel ? "rgba(70,72,212,0.7)" : "#64748b" }}>
                                {region}
                              </p>
                            </div>
                          </div>
                          <img src={sel ? ast.location.checkSel : ast.location.checkCircle} alt="" width={16} height={16} />
                        </button>
                      );
                    })}
                  </>
                ) : null}
              </div>
              <div style={{ borderTop: "1px solid #e2e8f0", padding: "33px 32px 32px" }}>
                <button
                  type="button"
                  className="onb-btn onb-flex-gap"
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 48, padding: "13px", marginBottom: 16, fontWeight: 600, justifyContent: "center" }}
                  onClick={() => setSelectedBaseLocation("Current Location")}
                >
                  <img src={ast.location.locate} alt="" width={22} height={22} />
                  Use current location
                </button>
                <button
                  type="button"
                  className="onb-btn onb-btn-primary onb-btn-primary--brand"
                  style={{ width: "100%", borderRadius: 48, padding: "13px" }}
                  onClick={next}
                  disabled={!selectedBaseLocation}
                >
                  Continue
                </button>
              </div>
            </div>
            <div className="onb-loc-map">
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(129.835deg, rgba(238, 242, 255, 0.8) 0%, rgba(240, 249, 255, 0.8) 100%)",
                }}
              />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 192, height: 192, borderRadius: 9999, background: "rgba(70,72,212,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 80, height: 80, borderRadius: 9999, background: "rgba(70,72,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 9999, background: "#4648d4", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 0 0 4px rgba(255,255,255,0.5), 0 20px 25px -5px rgba(0,0,0,0.1)" }}>
                      <img src={ast.location.mapPinCenter} alt="" width={13} height={17} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ position: "absolute", bottom: 32, right: 32, display: "flex", flexDirection: "column", gap: 8 }}>
                <button type="button" className="onb-btn" style={{ width: 40, height: 40, borderRadius: 32, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                  <img src={ast.location.mapPlus} alt="" width={14} height={14} />
                </button>
                <button type="button" className="onb-btn" style={{ width: 40, height: 40, borderRadius: 32, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                  <img src={ast.location.mapMinus} alt="" width={14} height={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 9 && (
        <>
          <div className="onb-step-help-bar">
            <button type="button" className="onb-btn" style={{ padding: 8, borderRadius: 8 }}>
              <img src={ast.target.help} alt="Help" width={17} height={17} />
            </button>
          </div>
          <div className="onb-target onb-main-pad">
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 25, marginBottom: 32 }}>
              <h1 className="onb-h1" style={{ fontSize: 24, letterSpacing: "-0.24px" }}>
                Target Locations
              </h1>
              <p className="onb-muted-sm" style={{ marginTop: 4, fontSize: 13, maxWidth: 420 }}>
                Manage the cities or regions where you&apos;re open to new opportunities.
              </p>
            </div>
            <div className="onb-target-grid">
              <div>
                <div className="onb-flex-gap onb-target-head-row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Selected Locations</h3>
                  <button
                    type="button"
                    className="onb-btn onb-flex-gap onb-target-add-btn"
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 13px", boxShadow: "0 1px 1px rgba(0,0,0,0.05)", color: "#4648d4", fontWeight: 600, fontSize: 14 }}
                    onClick={() => setShowAddTargetLocationForm((current) => !current)}
                    aria-expanded={showAddTargetLocationForm}
                  >
                    <img src={ast.target.add} alt="" width={9} height={9} />
                    Add location
                  </button>
                </div>
                {showAddTargetLocationForm ? (
                  <div className="onb-target-add-form">
                    <input
                      className="onb-input"
                      placeholder="City"
                      value={newTargetCity}
                      onChange={(e) => setNewTargetCity(e.target.value)}
                    />
                    <input
                      className="onb-input"
                      placeholder="Country"
                      value={newTargetCountry}
                      onChange={(e) => setNewTargetCountry(e.target.value)}
                    />
                    <div className="onb-flex-gap onb-target-add-actions">
                      <button type="button" className="onb-btn onb-btn-ghost" onClick={() => setShowAddTargetLocationForm(false)}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="onb-btn onb-btn-primary onb-btn-primary--brand"
                        style={{ borderRadius: 12, padding: "10px 18px" }}
                        onClick={addTargetLocation}
                        disabled={!newTargetCity.trim() || !newTargetCountry.trim()}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : null}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  {targetLocations.map(({ city, country }, i) => {
                    const badge = i === 0 ? "Primary" : null;
                    return (
                    <div key={`${city}-${country}`} className="onb-target-list-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: i ? "1px solid #e2e8f0" : undefined }}>
                      <div className="onb-flex-gap onb-target-list-main">
                        <img src={ast.target.pin} alt="" width={26} height={26} />
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{city}</p>
                          <p className="onb-muted-sm" style={{ margin: 0, fontSize: 12 }}>
                            {country}
                          </p>
                        </div>
                      </div>
                      <div className="onb-flex-gap onb-target-list-meta">
                        {badge && (
                          <span style={{ background: "#efecf8", borderRadius: 8, padding: "2px 8px", fontSize: 12, color: "#64748b" }}>
                            {badge}
                          </span>
                        )}
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
                    </div>
                  )})}
                  {targetLocations.length === 0 ? (
                    <div style={{ padding: 20, color: "#64748b", fontSize: 14 }}>No locations selected yet. Add one to continue.</div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="onb-btn-row" style={{ marginTop: 40 }}>
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
        </>
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
                  const sel = workPref === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`onb-wpref-opt${sel ? " onb-wpref-opt--sel" : ""}`}
                      onClick={() => setWorkPref(id)}
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
                  Save Preference
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
                Help us tailor your dashboard by providing more context about your professional background. Select the levels that best describe your current roles.
              </p>
              {(
                [
                  ["Entry Level Professional", "0-2 years", "Just starting out or building foundational skills. You focus on executing tasks effectively under guidance and learning best practices."],
                  ["Mid-Level Professional", "3-5 years", "Solid experience executing complex projects independently. You contribute to strategy, mentor juniors, and handle broader responsibilities."],
                  ["Senior Level Expert", "5+ years", "Leading teams and driving strategic initiatives. You are responsible for high-level decision making, architecture, and driving overall business impact."],
                ] as const
              ).map(([title, years, desc]) => {
                const sel = experience.includes(title);
                return (
                  <button key={title} type="button" className={`onb-exp-row${sel ? " onb-exp-row--sel" : ""}`} onClick={() => toggleExperience(title)}>
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
                  disabled={prefsBusy}
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
  );
}
