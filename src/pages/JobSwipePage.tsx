import { useCallback, useEffect, useState, type PointerEvent, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  fetchRecommendedJobs, 
  refreshJobs, 
  swipeJob, 
  type JobCard 
} from "../api/jobs";
import { predictFakeJob, type FakeJobPrediction } from "../api/ml";
import { readSession } from "../auth/storage";
import { ONBOARDING_COMPLETE_STEP } from "../auth/onboardingStep";
import { useAuth } from "../context/AuthContext";
import { TailorResumeModal } from "../components/TailorResumeModal";
import {
  MapPin,
  DollarSign,
  Clock,
  Building2,
  ExternalLink,
  RefreshCw,
  Heart,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Keyboard,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import "./JobSwipePage.css";

const SWIPE_THRESHOLD = 90;
const MAX_DRAG = 240;

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
  if (status === "queued") return "New Match";
  if (status === "seen") return "Recommended";
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
  const [refreshOffset, setRefreshOffset] = useState(0);
  const [fakeJobResults, setFakeJobResults] = useState<Record<string, FakeJobPrediction>>({});
  const [fakeCheckBusy, setFakeCheckBusy] = useState(false);
  const [tailorModalOpen, setTailorModalOpen] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);

  // Drag / Swipe States for top card
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "up" | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);

  const token = session?.token?.trim() || readSession()?.token?.trim();
  const onboardingStep = readSession()?.onboardingStep ?? session?.onboardingStep ?? 0;
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

  // Run fake-job detection when jobs change
  const checkFakeJobs = useCallback(async (jobList: JobCard[]) => {
    const t = session?.token?.trim() || readSession()?.token?.trim();
    if (!t || jobList.length === 0) return;

    const unchecked = jobList.filter((j) => !fakeJobResults[j.id]);
    if (unchecked.length === 0) return;

    setFakeCheckBusy(true);
    try {
      const newResults: Record<string, FakeJobPrediction> = {};
      for (const job of unchecked.slice(0, 8)) {
        const res = await predictFakeJob(
          { title: job.title, company: job.company, description: job.description, location: job.location },
          t,
        );
        if (res.ok && res.data) {
          newResults[job.id] = res.data;
        }
      }
      setFakeJobResults((prev) => ({ ...prev, ...newResults }));
    } catch {
      // Gracefully continue
    }
    setFakeCheckBusy(false);
  }, [session?.token, fakeJobResults]);

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
      if (result.jobs.length > 0) void checkFakeJobs(result.jobs);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession, navigate, logout, checkFakeJobs]);

  const handleRefresh = async () => {
    const t = token;
    if (!t) return;
    setRefreshBusy(true);
    setFeedError(null);
    const result = await refreshJobs(t, refreshOffset);
    if (result.status === 401) {
      logout();
      navigate("/login", { replace: true });
      setRefreshBusy(false);
      return;
    }
    setJobs(result.jobs);
    if (result.message) setBannerMessage(result.message);
    if (!result.success && result.message) setFeedError(result.message);
    if (result.success) {
      setRefreshOffset(result.jobs.length === 0 ? 0 : refreshOffset + 20);
      if (result.jobs.length > 0) void checkFakeJobs(result.jobs);
    }
    setRefreshBusy(false);
  };

  const removeTopCard = () => {
    setJobs((prev) => prev.slice(1));
    setDragX(0);
    setSwipeDirection(null);
    setIsAnimating(false);
    setExpandedDesc(false);
  };

  const handleSwipe = async (action: "like" | "pass" | "apply") => {
    if (!current || swipeBusy || isAnimating) return;
    const t = token;
    if (!t) return;

    // Trigger visual swipe animation first
    setIsAnimating(true);
    if (action === "pass") setSwipeDirection("left");
    else if (action === "like") setSwipeDirection("right");
    else if (action === "apply") setSwipeDirection("up");

    const openListingAfterApply = action === "apply" ? current.sourceUrl : null;
    setSwipeBusy(true);

    try {
      const { status } = await swipeJob(current.id, action, t);
      if (status === 401) {
        logout();
        navigate("/login", { replace: true });
        setSwipeBusy(false);
        return;
      }
      if (openListingAfterApply) {
        window.open(openListingAfterApply, "_blank", "noopener,noreferrer");
      }
      setTimeout(() => {
        removeTopCard();
        setSwipeBusy(false);
        if (jobs.length <= 2) void loadRecommended();
      }, 240);
    } catch {
      setIsAnimating(false);
      setSwipeDirection(null);
      setSwipeBusy(false);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tailorModalOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        void handleSwipe("pass");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        void handleSwipe("like");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        void handleSwipe("apply");
      } else if (e.key === " " && current) {
        e.preventDefault();
        setTailorModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current, swipeBusy, isAnimating, tailorModalOpen]);

  // Touch / Pointer Drag handlers
  const handlePointerDown = (e: PointerEvent<HTMLElement>) => {
    if (isAnimating || !current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActivePointerId(e.pointerId);
    setDragStartX(e.clientX);
    setIsDragging(true);
    setIsReturning(false);
  };

  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!isDragging || isAnimating || dragStartX === null || (activePointerId !== null && e.pointerId !== activePointerId)) {
      return;
    }
    const deltaX = e.clientX - dragStartX;
    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, deltaX));
    setDragX(clamped);
  };

  const handlePointerEnd = (e: PointerEvent<HTMLElement>) => {
    if (!isDragging || isAnimating) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setDragStartX(null);
    setActivePointerId(null);

    if (dragX <= -SWIPE_THRESHOLD) {
      void handleSwipe("pass");
      return;
    }
    if (dragX >= SWIPE_THRESHOLD) {
      void handleSwipe("like");
      return;
    }

    setIsReturning(true);
    setDragX(0);
    setTimeout(() => setIsReturning(false), 200);
  };

  const openListing = () => {
    if (current?.sourceUrl) window.open(current.sourceUrl, "_blank", "noopener,noreferrer");
  };

  const incompleteOnboarding = onboardingStep < ONBOARDING_COMPLETE_STEP;
  const currentFake = current ? fakeJobResults[current.id] : null;

  return (
    <div className="job-swipe page-fill">
      {/* Top action toolbar */}
      <div className="job-swipe-toolbar">
        <div className="job-swipe-toolbar-left">
          <span className="job-swipe-feed-count">
            {jobs.length > 0 ? `${jobs.length} recommendations available` : "Feed queue"}
          </span>
        </div>
        <div className="job-swipe-toolbar-right">
          <button
            type="button"
            className="job-swipe-refresh"
            disabled={refreshBusy || loading || !token}
            onClick={() => void handleRefresh()}
            title="Fetch new jobs from JobSpy scraper"
          >
            <RefreshCw size={14} className={refreshBusy ? "animate-spin" : ""} />
            <span>{refreshBusy ? "Scraping fresh jobs…" : "Refresh Feed"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="job-swipe-loading">
          <div className="job-swipe-spinner" />
          <p>Curating personalized recommendations…</p>
        </div>
      ) : incompleteOnboarding ? (
        <div className="job-swipe-empty">
          <div className="job-swipe-empty-icon"><Sparkles size={40} className="text-indigo-500" /></div>
          <p className="job-swipe-empty-title">Finish Onboarding First</p>
          <p className="job-swipe-empty-copy">
            Complete your skill profile and job preferences so our matching engine can score roles.
          </p>
          <Link className="job-swipe-empty-cta" to="/onboarding">
            Continue Onboarding
          </Link>
        </div>
      ) : feedError && jobs.length === 0 ? (
        <div className="job-swipe-empty">
          <div className="job-swipe-empty-icon"><AlertTriangle size={40} className="text-amber-500" /></div>
          <p className="job-swipe-empty-title">Couldn’t Load Jobs</p>
          <p className="job-swipe-empty-copy">{feedError}</p>
          <button type="button" className="job-swipe-empty-cta job-swipe-empty-cta--btn" onClick={() => void loadRecommended()}>
            Try Again
          </button>
        </div>
      ) : !current ? (
        <div className="job-swipe-empty">
          <div className="job-swipe-empty-icon"><CheckCircle2 size={40} className="text-emerald-500" /></div>
          <p className="job-swipe-empty-title">You’re All Caught Up!</p>
          <p className="job-swipe-empty-copy">
            {bannerMessage?.trim() || "No more jobs in your current queue. Refresh to trigger the live scraper for new listings."}
          </p>
          <button type="button" className="job-swipe-empty-cta job-swipe-empty-cta--btn" onClick={() => void handleRefresh()}>
            <RefreshCw size={16} />
            <span>Fetch More Live Jobs</span>
          </button>
        </div>
      ) : (
        <div className="job-swipe-layout">
          {/* Main Swipe Center Column */}
          <div className="job-swipe-left">
            {bannerMessage && !feedError ? (
              <p className="job-swipe-banner" role="status">
                {bannerMessage}
              </p>
            ) : null}

            {/* Interactive Card with Drag Physics */}
            <article 
              className={`job-swipe-card ${isDragging ? "is-dragging" : ""} ${isReturning ? "is-returning" : ""} ${swipeDirection ? `swipe-out-${swipeDirection}` : ""}`}
              style={{
                "--dragX": `${dragX}px`,
                "--dragRotate": `${dragX * 0.06}deg`,
              } as CSSProperties}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
              {/* Directional Stamp Overlays */}
              <div 
                className="job-swipe-stamp job-swipe-stamp--pass"
                style={{ opacity: dragX < -20 ? Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD) : 0 }}
              >
                NOPE
              </div>
              <div 
                className="job-swipe-stamp job-swipe-stamp--like"
                style={{ opacity: dragX > 20 ? Math.min(1, dragX / SWIPE_THRESHOLD) : 0 }}
              >
                LIKE
              </div>

              <header className="job-swipe-card-header">
                <div className="job-swipe-card-top">
                  <div className="job-swipe-company-info">
                    <span className="job-swipe-company">{current.company}</span>
                    {statusBadgeLabel(current.status) ? (
                      <span className="job-swipe-badge job-swipe-badge--status">
                        {statusBadgeLabel(current.status)}
                      </span>
                    ) : null}
                  </div>

                  {/* ModernBERT Fake Job Detection Badge */}
                  {currentFake ? (
                    <div
                      className={`job-swipe-badge job-swipe-badge--${currentFake.label.toLowerCase()}`}
                      title={`ModernBERT Model: ${currentFake.label} with ${Math.round(currentFake.confidence * 100)}% confidence`}
                    >
                      {currentFake.label === "Real" ? (
                        <>
                          <ShieldCheck size={14} className="text-emerald-600" />
                          <span>Authentic ({Math.round(currentFake.confidence * 100)}%)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={14} className="text-rose-600" />
                          <span>Suspicious Posting</span>
                        </>
                      )}
                    </div>
                  ) : fakeCheckBusy ? (
                    <div className="job-swipe-badge job-swipe-badge--checking">
                      <span className="job-swipe-checking-dot" />
                      <span>Checking with ModernBERT…</span>
                    </div>
                  ) : null}
                </div>

                <h1 className="job-swipe-title">{current.title}</h1>
              </header>

              <div className="job-swipe-meta">
                {current.location ? (
                  <span className="job-swipe-chip">
                    <MapPin size={14} />
                    <span>{current.location}</span>
                  </span>
                ) : null}
                {current.salaryRange ? (
                  <span className="job-swipe-chip job-swipe-chip--salary">
                    <DollarSign size={14} />
                    <span>{current.salaryRange}</span>
                  </span>
                ) : null}
                {formatJobType(current.jobType) ? (
                  <span className="job-swipe-chip">
                    <Clock size={14} />
                    <span>{formatJobType(current.jobType)}</span>
                  </span>
                ) : null}
                {formatPostedAt(current.postedAt) ? (
                  <span className="job-swipe-chip">
                    <Clock size={14} />
                    <span>Posted {formatPostedAt(current.postedAt)}</span>
                  </span>
                ) : null}
              </div>

              {current.skills?.length ? (
                <div className="job-swipe-skills" aria-label="Skills required">
                  {current.skills.map((s, i) => (
                    <span key={`${i}-${s}`} className="job-swipe-skill-pill">
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}

              <hr className="job-swipe-sep" />

              <div className="job-swipe-brief-wrap">
                <p className={`job-swipe-brief ${expandedDesc ? "job-swipe-brief--expanded" : ""}`}>
                  {current.description}
                </p>
                {current.description && current.description.length > 280 && (
                  <button 
                    type="button" 
                    className="job-swipe-expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDesc((v) => !v);
                    }}
                  >
                    {expandedDesc ? (
                      <><span>Show Less</span><ChevronUp size={14} /></>
                    ) : (
                      <><span>Read Full Description</span><ChevronDown size={14} /></>
                    )}
                  </button>
                )}
              </div>
            </article>

            {/* Action Bar with Circular Buttons */}
            <div className="job-swipe-actions-wrap">
              <div className="job-swipe-actions">
                <button
                  type="button"
                  className="job-swipe-icon-btn job-swipe-icon-btn--pass"
                  aria-label="Pass on this job (Left Arrow)"
                  title="Pass [←]"
                  disabled={swipeBusy || isAnimating}
                  onClick={() => void handleSwipe("pass")}
                >
                  <X size={22} />
                </button>

                <button
                  type="button"
                  className="job-swipe-tailor-btn"
                  title="Tailor your resume for this position with AI [Space]"
                  onClick={() => setTailorModalOpen(true)}
                >
                  <Sparkles size={16} />
                  <span>Tailor Resume</span>
                </button>

                <button
                  type="button"
                  className="job-swipe-icon-btn job-swipe-icon-btn--like"
                  aria-label="Save this job (Right Arrow)"
                  title="Save / Match [→]"
                  disabled={swipeBusy || isAnimating}
                  onClick={() => void handleSwipe("like")}
                >
                  <Heart size={22} />
                </button>

                <button
                  type="button"
                  className="job-swipe-apply"
                  title="Apply and track [↑]"
                  disabled={swipeBusy || isAnimating}
                  onClick={() => void handleSwipe("apply")}
                >
                  <Send size={16} />
                  <span>Apply Now</span>
                </button>
              </div>

              {/* Keyboard Shortcut Legend */}
              <div className="job-swipe-shortcuts-legend">
                <Keyboard size={13} />
                <span>Shortcuts: <strong>[←]</strong> Pass · <strong>[→]</strong> Like · <strong>[↑]</strong> Apply · <strong>[Space]</strong> Tailor Resume</span>
              </div>
            </div>
          </div>

          {/* Right Details & Queue Column */}
          <aside className="job-swipe-aside">
            <header className="job-swipe-aside-header">
              <h2 className="job-swipe-aside-title">Target Analysis</h2>
              {current.sourceUrl && (
                <button 
                  type="button" 
                  className="job-swipe-external-btn"
                  onClick={openListing}
                  title="Open source listing on web"
                >
                  <ExternalLink size={15} />
                </button>
              )}
            </header>

            <div className="job-swipe-aside-scroll">
              <section className="job-swipe-aside-box">
                <div className="job-swipe-company-row">
                  <div className="job-swipe-company-avatar" aria-hidden>
                    <Building2 size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="job-swipe-company-name">{current.company}</p>
                    <p className="job-swipe-company-meta">
                      {current.source ? `Aggregated via ${current.source}` : "Direct Feed"}
                    </p>
                  </div>
                </div>

                {current.sourceUrl ? (
                  <button type="button" className="job-swipe-link" onClick={openListing}>
                    <span>View original job posting</span>
                    <ExternalLink size={13} />
                  </button>
                ) : null}
              </section>

              {/* ModernBERT Authenticity Explainer Box */}
              <section className="job-swipe-aside-box job-swipe-aside-box--ml">
                <div className="job-swipe-ml-header">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <h4>ModernBERT Security Analysis</h4>
                </div>
                <p className="job-swipe-ml-desc">
                  {currentFake?.label === "Real" ? (
                    `Confidence: ${Math.round(currentFake.confidence * 100)}%. The salary, description structure, and employer context match verified job patterns.`
                  ) : currentFake?.label === "Fake" ? (
                    `Flagged: ${Math.round(currentFake.confidence * 100)}% risk index. Contains typical scam hallmarks (atypical compensation, high-pressure urgency).`
                  ) : (
                    "Analyzing posting against 50k+ known fake job patterns using ModernBERT transformer weights on port 8000."
                  )}
                </p>
              </section>

              {upcoming.length > 0 ? (
                <section>
                  <h3 className="job-swipe-section-label">Next in Feed ({upcoming.length})</h3>
                  <div className="job-swipe-similar-stack">
                    {upcoming.map((j) => (
                      <div key={j.id} className="job-swipe-similar-card">
                        <p className="job-swipe-similar-title">{j.title}</p>
                        <p className="job-swipe-similar-meta">
                          {j.company}
                          {j.location ? ` · ${j.location}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      )}

      {current && (
        <TailorResumeModal
          job={current}
          isOpen={tailorModalOpen}
          onClose={() => setTailorModalOpen(false)}
        />
      )}
    </div>
  );
}
