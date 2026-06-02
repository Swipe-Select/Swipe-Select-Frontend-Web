import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchMatchedJobs, type JobCard } from "../api/jobs";
import { useAuth } from "../context/AuthContext";
import { readSession } from "../auth/storage";
import "./MatchesPage.css";

function IllustrationMatches() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="#f5f2fe" />
      <rect x="34" y="52" width="52" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="44" y="46" width="32" height="14" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      <line x1="34" y1="64" x2="86" y2="64" stroke="#e2e8f0" strokeWidth="2" />
      <line x1="60" y1="60" x2="60" y2="68" stroke="#e2e8f0" strokeWidth="2" />
      <circle cx="80" cy="44" r="14" fill="#4648d4" />
      <path d="M80 50s-7-5.5-7-9a4 4 0 0 1 7-2.66A4 4 0 0 1 87 41c0 3.5-7 9-7 9z" fill="#ffffff" />
    </svg>
  );
}

function IconLocation() {
  return (
    <svg width="11" height="13" viewBox="0 0 11 14" fill="none" aria-hidden>
      <path d="M5.5 0C2.46 0 0 2.35 0 5.25c0 3.92 5.5 8.75 5.5 8.75S11 9.17 11 5.25C11 2.35 8.54 0 5.5 0zm0 7.12a1.88 1.88 0 110-3.76 1.88 1.88 0 010 3.76z" fill="#94a3b8" />
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function statusLabel(status: string): string {
  if (status === "liked") return "Saved";
  if (status === "applied") return "Applied";
  return status;
}

function MatchCard({ job }: { job: JobCard }) {
  const isApplied = job.status === "applied";
  const openListing = () => {
    if (job.sourceUrl) window.open(job.sourceUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="match-card">
      <div className="match-card-top">
        <div className="match-card-avatar" aria-hidden>
          {job.company.slice(0, 2).toUpperCase()}
        </div>
        <span className={`match-card-badge${isApplied ? " match-card-badge--applied" : ""}`}>
          {statusLabel(job.status)}
        </span>
      </div>
      <p className="match-card-title">{job.title}</p>
      <p className="match-card-company">{job.company}</p>
      {job.location ? (
        <p className="match-card-location">
          <IconLocation />
          {job.location}
        </p>
      ) : null}
      {job.sourceUrl ? (
        <button type="button" className="match-card-link" onClick={openListing}>
          View listing
          <IconExternalLink />
        </button>
      ) : null}
    </div>
  );
}

export function MatchesPage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = session?.token?.trim() || readSession()?.token?.trim();
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }
      setLoading(true);
      setError(null);
      const result = await fetchMatchedJobs(token);
      if (cancelled) return;
      if (result.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!result.success && result.message) {
        setError(result.message);
      } else {
        setJobs(result.jobs);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session?.token, navigate, logout]);

  return (
    <div className="matches-page page-fill">
      <div className="matches-inner">
        <div className="matches-header">
          <h1 className="matches-title">Saved Jobs</h1>
          {!loading && jobs.length > 0 && (
            <span className="matches-count">{jobs.length} {jobs.length === 1 ? "job" : "jobs"}</span>
          )}
        </div>

        {loading ? (
          <div className="matches-preview-grid" aria-label="Loading saved jobs">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="matches-preview-card">
                <div className="matches-preview-logo" />
                <div className="matches-preview-lines">
                  <div className="matches-preview-line matches-preview-line--title" />
                  <div className="matches-preview-line matches-preview-line--sub" />
                </div>
                <div className="matches-preview-badge" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="matches-empty">
            <div className="matches-empty-art"><IllustrationMatches /></div>
            <h2 className="matches-empty-title">Couldn&apos;t load saved jobs</h2>
            <p className="matches-empty-copy">{error}</p>
            <Link className="matches-empty-cta" to="/dashboard/discover">Back to Discover</Link>
          </div>
        ) : jobs.length === 0 ? (
          <div className="matches-empty">
            <div className="matches-empty-art"><IllustrationMatches /></div>
            <h2 className="matches-empty-title">No saved jobs yet</h2>
            <p className="matches-empty-copy">
              Jobs you bookmark while swiping will appear here. Start discovering to find your next opportunity.
            </p>
            <Link className="matches-empty-cta" to="/dashboard/discover">Start Discovering</Link>
          </div>
        ) : (
          <div className="matches-grid">
            {jobs.map((job) => (
              <MatchCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
