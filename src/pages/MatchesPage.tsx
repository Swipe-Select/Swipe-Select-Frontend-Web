import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchMatchedJobs, type JobCard } from "../api/jobs";
import { useAuth } from "../context/AuthContext";
import { readSession } from "../auth/storage";
import { TailorResumeModal } from "../components/TailorResumeModal";
import {
  Heart,
  Sparkles,
  ExternalLink,
  MapPin,
  CheckCircle2,
  DollarSign,
  Briefcase
} from "lucide-react";
import "./MatchesPage.css";

type TabFilter = "all" | "liked" | "applied";

function MatchCard({ 
  job, 
  onTailor
}: { 
  job: JobCard; 
  onTailor: (job: JobCard) => void;
}) {
  const isApplied = job.status === "applied";
  const openListing = () => {
    if (job.sourceUrl) window.open(job.sourceUrl, "_blank", "noopener,noreferrer");
  };

  const initials = (job.company || "SS")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`match-card ${isApplied ? "match-card--applied" : ""}`}>
      {/* Top Header: Company Avatar & Status Badge */}
      <div className="match-card-header">
        <div className="match-card-company-group">
          <div className="match-card-avatar" aria-hidden>
            {initials}
          </div>
          <div className="match-card-company-meta">
            <span className="match-card-company-name">{job.company}</span>
            {job.source && (
              <span className="match-card-source-tag">via {job.source}</span>
            )}
          </div>
        </div>

        <span className={`match-card-badge ${isApplied ? "match-card-badge--applied" : "match-card-badge--saved"}`}>
          {isApplied ? (
            <>
              <CheckCircle2 size={12} />
              <span>Applied</span>
            </>
          ) : (
            <>
              <Heart size={12} />
              <span>Saved</span>
            </>
          )}
        </span>
      </div>

      {/* Title */}
      <h3 className="match-card-title" title={job.title}>
        {job.title}
      </h3>

      {/* Metadata Chips: Salary, Location, Job Type */}
      <div className="match-card-meta-chips">
        {job.salaryRange && (
          <span className="match-chip match-chip--salary">
            <DollarSign size={11} />
            <span>{job.salaryRange}</span>
          </span>
        )}
        {job.location && (
          <span className="match-chip match-chip--location">
            <MapPin size={11} />
            <span>{job.location}</span>
          </span>
        )}
        {job.jobType && (
          <span className="match-chip match-chip--type">
            <Briefcase size={11} />
            <span>{job.jobType}</span>
          </span>
        )}
      </div>

      {/* Skills Tags */}
      {job.skills && job.skills.length > 0 && (
        <div className="match-card-skills">
          {job.skills.slice(0, 3).map((skill, idx) => (
            <span key={idx} className="match-card-skill-tag">
              {skill}
            </span>
          ))}
          {job.skills.length > 3 && (
            <span className="match-card-skill-tag match-card-skill-tag--more">
              +{job.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="match-card-footer">
        <button
          type="button"
          className="match-card-tailor-btn"
          onClick={() => onTailor(job)}
          title="Tailor ATS resume with AI"
        >
          <Sparkles size={14} />
          <span>Tailor Resume</span>
        </button>

        {job.sourceUrl && (
          <button
            type="button"
            className="match-card-view-btn"
            onClick={openListing}
            title="Open original job posting"
          >
            <span>View</span>
            <ExternalLink size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export function MatchesPage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tailorJob, setTailorJob] = useState<JobCard | null>(null);

  // Tab Filter state
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

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

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (activeTab === "liked") return job.status === "liked";
      if (activeTab === "applied") return job.status === "applied";
      return true;
    });
  }, [jobs, activeTab]);

  return (
    <div className="matches-page page-fill">
      <div className="matches-inner">
        {/* Header & Controls (Clean & Search-Bar Free) */}
        <div className="matches-header-wrap">
          <div className="matches-header-left">
            <h1 className="matches-title">Your Matches & Applications</h1>
            <p className="matches-sub">
              Roles you have swiped right on or applied to. Generate custom resumes or review employers.
            </p>
          </div>

          {/* Segmented Filter Tabs */}
          <div className="matches-tabs">
            <button
              type="button"
              className={`matches-tab ${activeTab === "all" ? "matches-tab--active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Matches ({jobs.length})
            </button>
            <button
              type="button"
              className={`matches-tab ${activeTab === "liked" ? "matches-tab--active" : ""}`}
              onClick={() => setActiveTab("liked")}
            >
              Saved ({jobs.filter((j) => j.status === "liked").length})
            </button>
            <button
              type="button"
              className={`matches-tab ${activeTab === "applied" ? "matches-tab--active" : ""}`}
              onClick={() => setActiveTab("applied")}
            >
              Applied ({jobs.filter((j) => j.status === "applied").length})
            </button>
          </div>
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
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="matches-empty">
            <div className="matches-empty-icon"><Heart size={36} className="text-rose-400" /></div>
            <h2 className="matches-empty-title">Couldn't load saved jobs</h2>
            <p className="matches-empty-copy">{error}</p>
            <Link className="matches-empty-cta" to="/dashboard/discover">Back to Discover</Link>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="matches-empty">
            <div className="matches-empty-icon"><Heart size={36} className="text-indigo-400" /></div>
            <h2 className="matches-empty-title">
              {activeTab === "applied" ? "No applications yet" : activeTab === "liked" ? "No saved jobs yet" : "No matches found"}
            </h2>
            <p className="matches-empty-copy">
              {activeTab === "applied"
                ? "Jobs you submit tailored applications for will show up here."
                : "Swipe right on job cards in Discover to save them to your matched queue."}
            </p>
            <Link className="matches-empty-cta" to="/dashboard/discover">
              Start Discovering Jobs
            </Link>
          </div>
        ) : (
          <div className="matches-grid">
            {filteredJobs.map((job) => (
              <MatchCard 
                key={job.id} 
                job={job} 
                onTailor={setTailorJob}
              />
            ))}
          </div>
        )}
      </div>

      <TailorResumeModal
        job={tailorJob}
        isOpen={Boolean(tailorJob)}
        onClose={() => setTailorJob(null)}
      />
    </div>
  );
}
