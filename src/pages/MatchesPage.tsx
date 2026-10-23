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
  Search,
  MapPin,
  CheckCircle2
} from "lucide-react";
import "./MatchesPage.css";

type TabFilter = "all" | "liked" | "applied";

function statusLabel(status: string): string {
  if (status === "liked") return "Saved";
  if (status === "applied") return "Applied";
  return status;
}

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

  return (
    <div className="match-card">
      <div className="match-card-top">
        <div className="match-card-avatar" aria-hidden>
          {job.company.slice(0, 2).toUpperCase()}
        </div>
        <span className={`match-card-badge${isApplied ? " match-card-badge--applied" : ""}`}>
          {isApplied ? <CheckCircle2 size={12} /> : <Heart size={12} />}
          <span>{statusLabel(job.status)}</span>
        </span>
      </div>

      <h3 className="match-card-title">{job.title}</h3>
      <p className="match-card-company">{job.company}</p>

      {job.location ? (
        <p className="match-card-location">
          <MapPin size={13} />
          <span>{job.location}</span>
        </p>
      ) : null}

      {job.skills?.length ? (
        <div className="match-card-skills">
          {job.skills.slice(0, 3).map((s, idx) => (
            <span key={idx} className="match-card-skill-tag">{s}</span>
          ))}
          {job.skills.length > 3 && (
            <span className="match-card-skill-tag">+{job.skills.length - 3}</span>
          )}
        </div>
      ) : null}
      
      <div className="match-card-footer">
        <button
          type="button"
          className="match-card-tailor-btn"
          onClick={() => onTailor(job)}
          title="Tailor resume with Qwen2.5-3B AI"
        >
          <Sparkles size={13} />
          <span>Tailor Resume</span>
        </button>

        {job.sourceUrl ? (
          <button type="button" className="match-card-link" onClick={openListing} title="Open listing">
            <ExternalLink size={14} />
            <span>View Listing</span>
          </button>
        ) : null}
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

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
      if (activeTab === "liked" && job.status !== "liked") return false;
      if (activeTab === "applied" && job.status !== "applied") return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        (job.location && job.location.toLowerCase().includes(q))
      );
    });
  }, [jobs, activeTab, searchQuery]);



  return (
    <div className="matches-page page-fill">
      <div className="matches-inner">
        {/* Header & Controls */}
        <div className="matches-header-wrap">
          <div className="matches-header-left">
            <h1 className="matches-title">Your Matches & Applications</h1>
            <p className="matches-sub">
              Roles you have swiped right on or applied to. Generate custom resumes or contact recruiters.
            </p>
          </div>

          {/* Search bar */}
          <div className="matches-search-wrap">
            <Search size={16} className="matches-search-icon" />
            <input
              type="text"
              className="matches-search-input"
              placeholder="Filter by title, company, or location…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="matches-tabs-bar">
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
            <h2 className="matches-empty-title">Couldn&apos;t load saved jobs</h2>
            <p className="matches-empty-copy">{error}</p>
            <Link className="matches-empty-cta" to="/dashboard/discover">Back to Discover</Link>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="matches-empty">
            <div className="matches-empty-icon"><Heart size={36} className="text-indigo-400" /></div>
            <h2 className="matches-empty-title">
              {searchQuery ? "No matching roles found" : "No saved jobs in this category yet"}
            </h2>
            <p className="matches-empty-copy">
              {searchQuery 
                ? `No jobs match "${searchQuery}". Try a different keyword or reset the filter.`
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
