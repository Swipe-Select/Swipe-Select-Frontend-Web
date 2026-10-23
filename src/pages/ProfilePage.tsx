import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { readSession } from "../auth/storage";
import { fetchUserStats, type UserStatsPayload } from "../api/jobs";
import { savePreferences } from "../api/onboarding";
import {
  saveBaseResume,
  getBaseResume,
  hasBaseResume,
  clearBaseResume,
  type ResumeMeta,
} from "../auth/resumeStorage";
import {
  Edit3,
  Sparkles,
  Briefcase,
  GraduationCap,
  Heart,
  Send,
  Layers,
  CheckCircle2,
  Mail,
  ShieldCheck,
  X,
  Plus,
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
} from "lucide-react";
import "./ProfilePage.css";

function StatCard({ 
  label, 
  value, 
  icon, 
  gradient 
}: Readonly<{ 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  gradient?: string; 
}>) {
  return (
    <div className="prof-stat-card">
      <div className="prof-stat-top">
        <span className="prof-stat-icon" style={{ background: gradient }}>
          {icon}
        </span>
        <span className="prof-stat-value">{value}</span>
      </div>
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProfilePage() {
  const { session, refreshSession } = useAuth();
  const activeSession = session ?? readSession();

  const name = activeSession?.name ?? "Candidate";
  const email = activeSession?.email ?? "";
  const profile = activeSession?.profile;
  const prefs = activeSession?.preferences;
  const initials = getInitials(name);

  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const workExp = profile?.workExperience ?? [];
  const education = profile?.education ?? [];
  const [jobTitles, setJobTitles] = useState<string[]>(prefs?.jobTitles ?? []);
  const [workModes, setWorkModes] = useState<string[]>(prefs?.workMode ?? []);

  // Live Stats State
  const [stats, setStats] = useState<UserStatsPayload>({
    swiped: 0,
    liked: 0,
    applied: 0,
    matches: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Resume Storage State
  const [resumeStored, setResumeStored] = useState(hasBaseResume());
  const [resumeMeta, setResumeMeta] = useState<ResumeMeta | null>(
    getBaseResume()?.meta ?? null
  );
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUploadSuccess, setResumeUploadSuccess] = useState(false);
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = activeSession?.token?.trim();
    if (!token) return;

    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      try {
        const res = await fetchUserStats(token);
        if (!cancelled && res.ok && res.json && res.json.data) {
          setStats(res.json.data);
        }
      } catch {
        // Fallback
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeSession?.token]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = activeSession?.token?.trim();
    if (!token) return;

    setSavingPrefs(true);
    setSaveSuccess(false);

    try {
      const res = await savePreferences({
        jobTitles,
        workMode: workModes,
      }, token);

      if (res.ok) {
        setSaveSuccess(true);
        await refreshSession();
        setTimeout(() => {
          setEditModalOpen(false);
          setSaveSuccess(false);
        }, 800);
      }
    } catch {
      // Failed
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    if (!skills.includes(newSkillInput.trim())) {
      setSkills([...skills, newSkillInput.trim()]);
    }
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const toggleWorkMode = (mode: string) => {
    if (workModes.includes(mode)) {
      setWorkModes(workModes.filter((m) => m !== mode));
    } else {
      setWorkModes([...workModes, mode]);
    }
  };

  // ── Resume Storage Handlers ──────────────────────────────────────────────

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Max 10 MB.");
      return;
    }

    setResumeUploading(true);
    setResumeUploadSuccess(false);

    try {
      await saveBaseResume(file);
      setResumeStored(true);
      setResumeMeta(getBaseResume()?.meta ?? null);
      setResumeUploadSuccess(true);
      setTimeout(() => setResumeUploadSuccess(false), 3000);
    } catch {
      alert("Failed to save resume. Please try again.");
    } finally {
      setResumeUploading(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  };

  const handleResumePreview = () => {
    const stored = getBaseResume();
    if (!stored) return;
    setResumePreviewUrl(stored.dataUrl);
  };

  const handleResumeDownload = () => {
    const stored = getBaseResume();
    if (!stored) return;
    const link = document.createElement("a");
    link.href = stored.dataUrl;
    link.download = stored.meta.fileName;
    link.click();
  };

  const handleResumeRemove = () => {
    if (!window.confirm("Remove your saved resume? You can upload a new one anytime.")) return;
    clearBaseResume();
    setResumeStored(false);
    setResumeMeta(null);
    setResumePreviewUrl(null);
  };

  return (
    <div className="prof-page page-fill">
      <div className="prof-inner">
        {/* Profile Header Card */}
        <div className="prof-header-card">
          <div className="prof-avatar-wrap">
            <div className="prof-avatar" aria-hidden>{initials}</div>
            <div className="prof-avatar-ring" aria-hidden />
          </div>

          <div className="prof-header-info">
            <div className="prof-header-top">
              <h2 className="prof-name">{name}</h2>
              <span className="prof-status-badge">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>ModernBERT Screened</span>
              </span>
            </div>

            <p className="prof-email">
              <Mail size={14} />
              <span>{email}</span>
            </p>

            {(profile?.gender || profile?.phone) && (
              <p className="prof-meta">
                {[profile?.gender, profile?.phone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          <div className="prof-header-actions">
            <button
              type="button"
              className="prof-edit-btn"
              onClick={() => setEditModalOpen(true)}
              aria-label="Edit job preferences"
            >
              <Edit3 size={15} />
              <span>Edit Preferences</span>
            </button>
            <Link to="/dashboard/ai-tools" className="prof-ai-tools-btn">
              <Sparkles size={15} />
              <span>Resume Studio</span>
            </Link>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="prof-stats-row">
          <StatCard 
            label="Jobs Evaluated" 
            value={statsLoading ? "…" : stats.swiped} 
            icon={<Layers size={18} />}
            gradient="rgba(79, 70, 229, 0.12)"
          />
          <StatCard 
            label="Saved / Liked" 
            value={statsLoading ? "…" : stats.liked} 
            icon={<Heart size={18} className="text-pink-500" />}
            gradient="rgba(236, 72, 153, 0.12)"
          />
          <StatCard 
            label="Applications" 
            value={statsLoading ? "…" : stats.applied} 
            icon={<Send size={18} className="text-emerald-500" />}
            gradient="rgba(16, 185, 129, 0.12)"
          />
          <StatCard 
            label="AI Matches" 
            value={statsLoading ? "…" : stats.matches} 
            icon={<Sparkles size={18} className="text-amber-500" />}
            gradient="rgba(245, 158, 11, 0.12)"
          />
        </div>

        {/* ─── Resume Storage Section ─── */}
        <div className="prof-section prof-resume-section">
          <div className="prof-section-header">
            <h3 className="prof-section-title">
              <FileText size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
              Base Resume (PDF)
            </h3>
            {resumeStored && (
              <span className="prof-resume-stored-badge">
                <CheckCircle2 size={13} />
                <span>Saved</span>
              </span>
            )}
          </div>

          <p className="prof-resume-desc">
            Upload your base resume once. It will be stored locally and used automatically 
            when you tailor resumes for specific jobs — no need to re-upload each time.
          </p>

          {resumeStored && resumeMeta ? (
            <div className="prof-resume-card">
              <div className="prof-resume-card-info">
                <div className="prof-resume-file-icon">
                  <FileText size={24} />
                </div>
                <div className="prof-resume-file-details">
                  <span className="prof-resume-file-name">{resumeMeta.fileName}</span>
                  <span className="prof-resume-file-meta">
                    {formatFileSize(resumeMeta.fileSize)} · Uploaded{" "}
                    {new Date(resumeMeta.uploadedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <div className="prof-resume-card-actions">
                <button
                  type="button"
                  className="prof-resume-action-btn"
                  onClick={handleResumePreview}
                  title="Preview resume"
                >
                  <Eye size={14} />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  className="prof-resume-action-btn"
                  onClick={handleResumeDownload}
                  title="Download resume"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  className="prof-resume-action-btn prof-resume-action-btn--replace"
                  onClick={() => resumeInputRef.current?.click()}
                  title="Replace with new resume"
                >
                  <Upload size={14} />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  className="prof-resume-action-btn prof-resume-action-btn--danger"
                  onClick={handleResumeRemove}
                  title="Remove saved resume"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="prof-resume-upload-zone"
              onClick={() => resumeInputRef.current?.click()}
            >
              <div className="prof-resume-upload-icon">
                <Upload size={28} />
              </div>
              <span className="prof-resume-upload-primary">
                {resumeUploading ? "Saving resume…" : "Click to upload your base resume (PDF)"}
              </span>
              <span className="prof-resume-upload-sub">
                Max 10 MB · Stored locally for instant tailoring
              </span>
            </div>
          )}

          <input
            ref={resumeInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleResumeUpload}
            style={{ display: "none" }}
          />

          {resumeUploadSuccess && (
            <div className="prof-resume-success-toast">
              <CheckCircle2 size={15} />
              <span>Resume saved successfully! It will be used for future tailoring.</span>
            </div>
          )}
        </div>

        {/* Details Sections */}
        <div className="prof-sections">
          {/* Target Preferences */}
          <div className="prof-section">
            <div className="prof-section-header">
              <h3 className="prof-section-title">Job Search Calibration</h3>
              <button
                type="button"
                className="prof-section-edit-link"
                onClick={() => setEditModalOpen(true)}
              >
                Modify
              </button>
            </div>

            <div className="prof-pref-grid">
              <div className="prof-pref-block">
                <span className="prof-pref-key">Target Job Titles</span>
                <div className="prof-pref-tags">
                  {jobTitles.length > 0 ? (
                    jobTitles.map((t, i) => (
                      <span key={`${i}-${t}`} className="prof-pref-tag prof-pref-tag--title">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="prof-text-muted">No titles selected yet.</span>
                  )}
                </div>
              </div>

              <div className="prof-pref-block">
                <span className="prof-pref-key">Preferred Work Mode</span>
                <div className="prof-pref-tags">
                  {workModes.length > 0 ? (
                    workModes.map((m, i) => (
                      <span key={`${i}-${m}`} className="prof-pref-tag prof-pref-tag--mode">
                        {m}
                      </span>
                    ))
                  ) : (
                    <span className="prof-text-muted">Any mode</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="prof-section">
            <div className="prof-section-header">
              <h3 className="prof-section-title">Verified Skills & Tools</h3>
              <span className="prof-section-count">{skills.length} skills listed</span>
            </div>

            {skills.length > 0 ? (
              <div className="prof-skills-wrap">
                {skills.map((skill, i) => (
                  <span key={`${i}-${skill}`} className="prof-skill-pill">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="prof-empty-hint">No skills on file. Complete onboarding or add some via edit.</p>
            )}
          </div>

          {/* Work Experience */}
          {workExp.length > 0 && (
            <div className="prof-section">
              <h3 className="prof-section-title">Work Experience</h3>
              <div className="prof-timeline">
                {workExp.map((w, i) => (
                  <div key={i} className="prof-timeline-item">
                    <div className="prof-timeline-icon"><Briefcase size={15} /></div>
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
          )}

          {/* Education */}
          {education.length > 0 && (
            <div className="prof-section">
              <h3 className="prof-section-title">Education</h3>
              <div className="prof-timeline">
                {education.map((e, i) => (
                  <div key={i} className="prof-timeline-item">
                    <div className="prof-timeline-icon"><GraduationCap size={15} /></div>
                    <div className="prof-timeline-content">
                      <p className="prof-timeline-role">{e.degree}</p>
                      <p className="prof-timeline-org">{e.school}</p>
                      {e.date ? <p className="prof-timeline-dates">{e.date}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resume Preview Modal */}
      {resumePreviewUrl && (
        <div className="prof-modal-backdrop" onClick={() => setResumePreviewUrl(null)}>
          <div className="prof-resume-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prof-modal-header">
              <h3>Resume Preview — {resumeMeta?.fileName}</h3>
              <button 
                type="button" 
                className="prof-modal-close"
                onClick={() => setResumePreviewUrl(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="prof-resume-preview-body">
              <iframe
                src={resumePreviewUrl}
                title="Resume preview"
                className="prof-resume-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Preferences Modal */}
      {editModalOpen && (
        <div className="prof-modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="prof-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="prof-modal-header">
              <h3>Edit Career Preferences</h3>
              <button 
                type="button" 
                className="prof-modal-close"
                onClick={() => setEditModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="prof-modal-form">
              <div className="prof-modal-field">
                <label>Job Titles (comma separated)</label>
                <input
                  type="text"
                  className="prof-modal-input"
                  value={jobTitles.join(", ")}
                  onChange={(e) => setJobTitles(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="e.g. Software Engineer, Frontend Developer"
                />
              </div>

              <div className="prof-modal-field">
                <label>Work Mode Preferences</label>
                <div className="prof-modal-mode-buttons">
                  {["Remote", "Hybrid", "In Person"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`prof-modal-mode-btn ${workModes.includes(mode) ? "prof-modal-mode-btn--active" : ""}`}
                      onClick={() => toggleWorkMode(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="prof-modal-field">
                <label>Add Skill</label>
                <div className="prof-modal-skill-row">
                  <input
                    type="text"
                    className="prof-modal-input"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    placeholder="e.g. React, Python, Figma"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <button type="button" className="prof-modal-add-skill-btn" onClick={handleAddSkill}>
                    <Plus size={16} />
                  </button>
                </div>
                <div className="prof-skills-wrap" style={{ marginTop: 8 }}>
                  {skills.slice(0, 10).map((s) => (
                    <span key={s} className="prof-skill-pill">
                      {s}
                      <button type="button" onClick={() => handleRemoveSkill(s)} className="prof-remove-skill-btn">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {saveSuccess && (
                <div className="prof-modal-success">
                  <CheckCircle2 size={16} />
                  <span>Preferences saved successfully!</span>
                </div>
              )}

              <div className="prof-modal-footer">
                <button 
                  type="button" 
                  className="prof-modal-cancel" 
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="prof-modal-save" 
                  disabled={savingPrefs}
                >
                  {savingPrefs ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
