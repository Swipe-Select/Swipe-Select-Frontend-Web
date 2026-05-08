import { Link } from "react-router-dom";
import "./MatchesPage.css";

function IllustrationMatches() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="#f5f2fe" />
      {/* Briefcase */}
      <rect x="34" y="52" width="52" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="44" y="46" width="32" height="14" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      <line x1="34" y1="64" x2="86" y2="64" stroke="#e2e8f0" strokeWidth="2" />
      <line x1="60" y1="60" x2="60" y2="68" stroke="#e2e8f0" strokeWidth="2" />
      {/* Heart badge */}
      <circle cx="80" cy="44" r="14" fill="#4648d4" />
      <path
        d="M80 50s-7-5.5-7-9a4 4 0 0 1 7-2.66A4 4 0 0 1 87 41c0 3.5-7 9-7 9z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function MatchesPage() {
  return (
    <div className="matches-page page-fill">
      <div className="matches-inner">
        <div className="matches-empty">
          <div className="matches-empty-art">
            <IllustrationMatches />
          </div>
          <h2 className="matches-empty-title">No matches yet</h2>
          <p className="matches-empty-copy">
            Jobs you like while swiping will appear here. Start discovering to find your next
            opportunity.
          </p>
          <Link className="matches-empty-cta" to="/dashboard/discover">
            Start Discovering
          </Link>
        </div>

        {/* Coming soon grid preview */}
        <div className="matches-preview-grid" aria-hidden>
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

        <p className="matches-coming-soon">
          Full match tracking &amp; filtering coming soon
        </p>
      </div>
    </div>
  );
}
