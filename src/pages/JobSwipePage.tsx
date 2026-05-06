import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchRecommendedJobs,
  refreshJobs,
  swipeJob,
  type JobCard,
} from "../api/jobs";
import { readSession } from "../auth/storage";
import { ONBOARDING_COMPLETE_STEP } from "../auth/onboardingStep";
import { useAuth } from "../context/AuthContext";
import "./JobSwipePage.css";

function IconLocation({ className }: { className?: string }) {
  return (
    <svg className={className} width={11} height={14} viewBox="0 0 11 14" fill="none" aria-hidden>
      <path
        d="M5.5 0C2.46 0 0 2.35 0 5.25c0 3.92 5.5 8.75 5.5 8.75S11 9.17 11 5.25C11 2.35 8.54 0 5.5 0zm0 7.12a1.88 1.88 0 110-3.76 1.88 1.88 0 010 3.76z"
        fill="#64748b"
      />
    </svg>
  );
}

function IconMoney({ className }: { className?: string }) {
  return (
    <svg className={className} width={15} height={11} viewBox="0 0 15 11" fill="none" aria-hidden>
      <path
        d="M7.5 0C3.36 0 0 1.23 0 2.75v5.5C0 9.77 3.36 11 7.5 11S15 9.77 15 8.25v-5.5C15 1.23 11.64 0 7.5 0zm0 1.38c3.31 0 6 .62 6 1.37 0 .76-2.69 1.38-6 1.38S1.5 3.5 1.5 2.75c0-.75 2.69-1.37 6-1.37zm6 6.5c0 .75-2.69 1.37-6 1.37S1.5 8.5 1.5 7.75V5.9a13.9 13.9 0 006 1.22 13.9 13.9 0 006-1.22v1.85z"
        fill="#64748b"
      />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width={13} height={13} viewBox="0 0 13 13" fill="none" aria-hidden>
      <path
        d="M6.5 0a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm.54 2.17v4.02l2.6 1.56-.45.74-3.1-1.86V2.17h.95z"
        fill="#64748b"
      />
    </svg>
  );
}

function IconPass({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M12.5 3.5L3.5 12.5M3.5 3.5l9 9" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

function IconBookmark({ className }: { className?: string }) {
  return (
    <svg className={className} width={14} height={18} viewBox="0 0 14 18" fill="none" aria-hidden>
      <path
        d="M1 1.5h12v15L7 12.5 1 16.5v-15z"
        stroke="#64748b"
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={18} viewBox="0 0 20 18" fill="none" aria-hidden>
      <path d="M1 9l18-8-8 18-2-7-8-3z" fill="#fff" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={18} viewBox="0 0 20 18" fill="none" aria-hidden>
      <path
        d="M3 18V1h10v4h4v13H3zm4-8h2v2H7v-2zm0-4h2v2H7V6zm4 4h2v2h-2v-2zm0-4h2v2h-2V6zm-4 8h2v2H7v-2zm4 0h2v2h-2v-2z"
        fill="#4648d4"
      />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} width={15} height={15} viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M1 1l13 13M14 1L1 14" stroke="#64748b" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function formatJobType(jobType: string | null | undefined): string {
  if (!jobType) return "";
  const key = jobType.toLowerCase();
  const map: Record<string, string> = {
    fulltime: "Full-time",
    parttime: "Part-time",
    internship: "Internship",
    contract: "Contract",
  };
  return map[key] ?? jobType;
}

function formatPostedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadgeLabel(status: string): string | null {
  if (status === "queued") return "New";
  if (status === "seen") return "For you";
  return null;
}

export function JobSwipePage() {
  const navigate = useNavigate();
  const { session, logout, refreshSession } = useAuth();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [swipeBusy, setSwipeBusy] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

  const token = session?.token?.trim() || readSession()?.token?.trim();
  const onboardingStep =
    readSession()?.onboardingStep ?? session?.onboardingStep ?? 0;
  const current = jobs[0] ?? null;
  const upcoming = jobs.slice(1, 4);

  const loadRecommended = useCallback(async () => {
    const t = session?.token?.trim() || readSession()?.token?.trim();
    if (!t) {
      navigate("/login", { replace: true });
      return;
    }
    setFeedError(null);
    setBannerMessage(null);
    const result = await fetchRecommendedJobs(t);
    if (result.status === 401) {
      logout();
      navigate("/login", { replace: true });
      return;
    }
    setJobs(result.jobs);
    if (result.message) setBannerMessage(result.message);
    if (!result.success && result.message) setFeedError(result.message);
  }, [session?.token, navigate, logout]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshSession();
      if (cancelled) return;
      const t = readSession()?.token?.trim();
      if (!t) {
        setLoading(false);
        navigate("/login", { replace: true });
        return;
      }
      setFeedError(null);
      setBannerMessage(null);
      const result = await fetchRecommendedJobs(t);
      if (cancelled) return;
      if (result.status === 401) {
        logout();
        navigate("/login", { replace: true });
        setLoading(false);
        return;
      }
      setJobs(result.jobs);
      if (result.message) setBannerMessage(result.message);
      if (!result.success && result.message) setFeedError(result.message);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession, navigate, logout]);

  const handleRefresh = async () => {
    const t = token;
    if (!t) return;
    setRefreshBusy(true);
    setFeedError(null);
    const result = await refreshJobs(t);
    if (result.status === 401) {
      logout();
      navigate("/login", { replace: true });
      setRefreshBusy(false);
      return;
    }
    setJobs(result.jobs);
    if (result.message) setBannerMessage(result.message);
    if (!result.success && result.message) setFeedError(result.message);
    setRefreshBusy(false);
  };

  const removeTopCard = () => {
    setJobs((prev) => prev.slice(1));
  };

  const handleSwipe = async (action: "like" | "pass" | "apply") => {
    if (!current || swipeBusy) return;
    const t = token;
    if (!t) return;
    const openListingAfterApply = action === "apply" ? current.sourceUrl : null;
    setSwipeBusy(true);
    const { ok, status, json } = await swipeJob(current.id, action, t);
    if (status === 401) {
      logout();
      navigate("/login", { replace: true });
      setSwipeBusy(false);
      return;
    }
    if (!ok || !json || typeof json !== "object" || !("success" in json) || !json.success) {
      const msg =
        json && typeof json === "object" && "message" in json
          ? String((json as { message?: string }).message)
          : "Could not save swipe.";
      alert(msg);
      setSwipeBusy(false);
      return;
    }
    if (openListingAfterApply)
      window.open(openListingAfterApply, "_blank", "noopener,noreferrer");
    removeTopCard();
    setSwipeBusy(false);
    if (jobs.length <= 1) void loadRecommended();
  };

  const openListing = () => {
    if (current?.sourceUrl) window.open(current.sourceUrl, "_blank", "noopener,noreferrer");
  };

  const incompleteOnboarding = onboardingStep < ONBOARDING_COMPLETE_STEP;

  return (
    <div className="job-swipe page-fill" data-name="Html → Body">
      <div className="job-swipe-toolbar">
        <button
          type="button"
          className="job-swipe-refresh"
          disabled={refreshBusy || loading || !token}
          onClick={() => void handleRefresh()}
        >
          {refreshBusy ? "Refreshing…" : "Refresh feed"}
        </button>
      </div>

      {loading ? (
        <div className="job-swipe-loading">Loading recommendations…</div>
      ) : incompleteOnboarding ? (
        <div className="job-swipe-empty">
          <p className="job-swipe-empty-title">Finish onboarding first</p>
          <p className="job-swipe-empty-copy">
            Complete onboarding to receive job recommendations from the server.
          </p>
          <Link className="job-swipe-empty-cta" to="/onboarding">
            Continue onboarding
          </Link>
        </div>
      ) : feedError && jobs.length === 0 ? (
        <div className="job-swipe-empty">
          <p className="job-swipe-empty-title">Couldn’t load jobs</p>
          <p className="job-swipe-empty-copy">{feedError}</p>
          <button type="button" className="job-swipe-empty-cta job-swipe-empty-cta--btn" onClick={() => void loadRecommended()}>
            Try again
          </button>
        </div>
      ) : !current ? (
        <div className="job-swipe-empty">
          <p className="job-swipe-empty-title">You’re caught up</p>
          <p className="job-swipe-empty-copy">
            {bannerMessage?.trim() ||
              "No more recommendations right now. Try refreshing or check back later."}
          </p>
          <button type="button" className="job-swipe-empty-cta job-swipe-empty-cta--btn" onClick={() => void handleRefresh()}>
            Refresh feed
          </button>
        </div>
      ) : (
        <div className="job-swipe-layout">
          <div className="job-swipe-left">
            {bannerMessage && !feedError ? (
              <p className="job-swipe-banner" role="status">
                {bannerMessage}
              </p>
            ) : null}

            <article className="job-swipe-card">
              <header className="job-swipe-card-header">
                <div className="job-swipe-card-top">
                  <span className="job-swipe-company">{current.company}</span>
                  {statusBadgeLabel(current.status) ? (
                    <span className="job-swipe-badge">{statusBadgeLabel(current.status)}</span>
                  ) : null}
                </div>
                <h1 className="job-swipe-title">{current.title}</h1>
              </header>

              <div className="job-swipe-meta">
                {current.location ? (
                  <span className="job-swipe-chip">
                    <span className="job-swipe-chip-icon">
                      <IconLocation />
                    </span>
                    {current.location}
                  </span>
                ) : null}
                {current.salaryRange ? (
                  <span className="job-swipe-chip">
                    <span className="job-swipe-chip-icon">
                      <IconMoney />
                    </span>
                    {current.salaryRange}
                  </span>
                ) : null}
                {formatJobType(current.jobType) ? (
                  <span className="job-swipe-chip">
                    <span className="job-swipe-chip-icon">
                      <IconClock />
                    </span>
                    {formatJobType(current.jobType)}
                  </span>
                ) : null}
                {formatPostedAt(current.postedAt) ? (
                  <span className="job-swipe-chip">
                    <span className="job-swipe-chip-icon">
                      <IconClock />
                    </span>
                    Posted {formatPostedAt(current.postedAt)}
                  </span>
                ) : null}
              </div>

              {current.skills?.length ? (
                <div className="job-swipe-skills" aria-label="Skills">
                  {current.skills.map((s, i) => (
                    <span key={`${i}-${s}`} className="job-swipe-skill-pill">
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}

              <hr className="job-swipe-sep" />

              <p className="job-swipe-brief">{current.description}</p>
            </article>

            <div className="job-swipe-actions-wrap">
              <div className="job-swipe-actions">
                <button
                  type="button"
                  className="job-swipe-icon-btn"
                  aria-label="Pass on this job"
                  disabled={swipeBusy}
                  onClick={() => void handleSwipe("pass")}
                >
                  <IconPass />
                </button>
                <button
                  type="button"
                  className="job-swipe-icon-btn"
                  aria-label="Save this job"
                  disabled={swipeBusy}
                  onClick={() => void handleSwipe("like")}
                >
                  <IconBookmark />
                </button>
                <button
                  type="button"
                  className="job-swipe-apply"
                  disabled={swipeBusy}
                  onClick={() => void handleSwipe("apply")}
                >
                  <IconSend />
                  Apply Now
                </button>
              </div>
            </div>
          </div>

          <aside className="job-swipe-aside">
            <header className="job-swipe-aside-header">
              <h2 className="job-swipe-aside-title">Details</h2>
              <button type="button" className="job-swipe-aside-close" aria-label="Close" onClick={() => navigate("/")}>
                <IconClose />
              </button>
            </header>

            <div className="job-swipe-aside-scroll">
              <section>
                <h3 className="job-swipe-section-label">About the role</h3>
                <p className="job-swipe-prose">{current.description}</p>
              </section>

              <hr className="job-swipe-sep" />

              <section>
                <h3 className="job-swipe-section-label">Company info</h3>
                <div className="job-swipe-company-row">
                  <div className="job-swipe-company-avatar" aria-hidden>
                    <IconBuilding />
                  </div>
                  <div>
                    <p className="job-swipe-company-name">{current.company}</p>
                    <p className="job-swipe-company-meta">
                      {current.source ? `Source: ${current.source}` : "Job listing"}
                    </p>
                    {current.sourceUrl ? (
                      <button type="button" className="job-swipe-link" onClick={openListing}>
                        View original listing
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>

              {upcoming.length > 0 ? (
                <>
                  <hr className="job-swipe-sep" />
                  <section>
                    <h3 className="job-swipe-section-label">Up next</h3>
                    <div className="job-swipe-similar-stack">
                      {upcoming.map((j) => (
                        <div key={j.id} className="job-swipe-similar-card job-swipe-similar-card--static">
                          <p className="job-swipe-similar-title">{j.title}</p>
                          <p className="job-swipe-similar-meta">
                            {j.company}
                            {j.location ? ` · ${j.location}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
