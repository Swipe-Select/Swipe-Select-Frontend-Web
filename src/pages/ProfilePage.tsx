import { useAuth } from "../context/AuthContext";
import { readSession } from "../auth/storage";
import "./ProfilePage.css";

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="prof-stat-card">
      <span className="prof-stat-value">{value}</span>
      <span className="prof-stat-label">{label}</span>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ProfilePage() {
  const { session } = useAuth();
  const activeSession = session ?? readSession();

  const name = activeSession?.name ?? "User";
  const email = activeSession?.email ?? "";
  const profile = activeSession?.profile;
  const prefs = activeSession?.preferences;
  const initials = getInitials(name);

  const skills = profile?.skills ?? [];
  const workExp = profile?.workExperience ?? [];
  const education = profile?.education ?? [];
  const jobTitles = prefs?.jobTitles ?? [];
  const workModes = prefs?.workMode ?? [];

  return (
    <div className="prof-page page-fill">
      <div className="prof-inner">
        {/* Profile header card */}
        <div className="prof-header-card">
          <div className="prof-avatar-wrap">
            <div className="prof-avatar" aria-hidden>{initials}</div>
            <div className="prof-avatar-ring" aria-hidden />
          </div>
          <div className="prof-header-info">
            <h2 className="prof-name">{name}</h2>
            <p className="prof-email">{email}</p>
            {(profile?.gender ?? profile?.phone) ? (
              <p className="prof-meta">
                {[profile?.gender, profile?.phone].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <button type="button" className="prof-edit-btn" disabled aria-label="Edit profile (coming soon)">
            <IconEdit />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Stats row */}
        <div className="prof-stats-row">
          <StatCard label="Jobs Swiped" value="—" />
          <StatCard label="Liked" value="—" />
          <StatCard label="Applied" value="—" />
          <StatCard label="Matches" value="—" />
        </div>

        <div className="prof-sections">
          {/* Skills */}
          {skills.length > 0 ? (
            <div className="prof-section">
              <h3 className="prof-section-title">Skills</h3>
              <div className="prof-skills-wrap">
                {skills.map((skill, i) => (
                  <span key={`${i}-${skill}`} className="prof-skill-pill">{skill}</span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Job preferences */}
          {(jobTitles.length > 0 || workModes.length > 0) ? (
            <div className="prof-section">
              <h3 className="prof-section-title">Job Preferences</h3>
              <div className="prof-pref-grid">
                {jobTitles.length > 0 ? (
                  <div className="prof-pref-block">
                    <span className="prof-pref-key">Seeking</span>
                    <div className="prof-pref-tags">
                      {jobTitles.map((t, i) => (
                        <span key={`${i}-${t}`} className="prof-pref-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {workModes.length > 0 ? (
                  <div className="prof-pref-block">
                    <span className="prof-pref-key">Work Mode</span>
                    <div className="prof-pref-tags">
                      {workModes.map((m, i) => (
                        <span key={`${i}-${m}`} className="prof-pref-tag">{m}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Work experience */}
          {workExp.length > 0 ? (
            <div className="prof-section">
              <h3 className="prof-section-title">Work Experience</h3>
              <div className="prof-timeline">
                {workExp.map((w, i) => (
                  <div key={i} className="prof-timeline-item">
                    <div className="prof-timeline-dot" aria-hidden />
                    <div className="prof-timeline-content">
                      <p className="prof-timeline-role">{w.title}</p>
                      <p className="prof-timeline-org">{w.company}{w.location ? ` · ${w.location}` : ""}</p>
                      <p className="prof-timeline-dates">
                        {[w.startDate, w.endDate].filter(Boolean).join(" → ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Education */}
          {education.length > 0 ? (
            <div className="prof-section">
              <h3 className="prof-section-title">Education</h3>
              <div className="prof-timeline">
                {education.map((e, i) => (
                  <div key={i} className="prof-timeline-item">
                    <div className="prof-timeline-dot" aria-hidden />
                    <div className="prof-timeline-content">
                      <p className="prof-timeline-role">{e.degree}</p>
                      <p className="prof-timeline-org">{e.school}</p>
                      {e.date ? <p className="prof-timeline-dates">{e.date}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Empty state for no profile data */}
          {skills.length === 0 && workExp.length === 0 && education.length === 0 && jobTitles.length === 0 ? (
            <div className="prof-empty">
              <p className="prof-empty-title">Your profile is bare</p>
              <p className="prof-empty-copy">
                Complete your onboarding to fill in your skills, experience, and preferences.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
