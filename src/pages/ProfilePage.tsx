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
  Phone,
  SlidersHorizontal,
  Award,
} from "lucide-react";
import "./ProfilePage.css";

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

  // Active tab for right bottom card: "skills" or "experience"
  const [activeTab, setActiveTab] = useState<"skills" | "experience">("skills");

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
    <div className="prof-page">
      <div className="prof-container">
        {/* ─── Left Column: Profile Hero, Live Activity, Search Calibration ─── */}
        <div className="prof-col prof-col--left">
          {/* Executive Profile Card */}
          <div className="prof-card prof-card--user">
            <div className="prof-user-banner" aria-hidden />
            <div className="prof-user-body">
              <div className="prof-avatar-wrap">
                <div className="prof-avatar" aria-hidden>{initials}</div>
                <span className="prof-avatar-ring" aria-hidden />
                <span className="prof-avatar-dot" title="Active Account" />
              </div>

              <div className="prof-user-meta">
                <div className="prof-user-title-row">
                  <h2 className="prof-user-name">{name}</h2>
                  <span className="prof-verified-badge" title="Profile verified by ModernBERT AI screening">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    <span>ModernBERT Screened</span>
                  </span>
                </div>

                <div className="prof-user-contact">
                  <span className="prof-contact-item" title={email}>
                    <Mail size={13} />
                    <span>{email}</span>
                  </span>
                  {(profile?.gender || profile?.phone) && (
                    <span className="prof-contact-item">
                      <Phone size={13} />
                      <span>{[profile?.gender, profile?.phone].filter(Boolean).join(" · ")}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="prof-user-actions">
                <button
                  type="button"
                  className="prof-btn prof-btn--outline"
                  onClick={() => setEditModalOpen(true)}
                  aria-label="Edit job preferences"
                >
                  <Edit3 size={14} />
                  <span>Edit Preferences</span>
                </button>
                <Link to="/dashboard/ai-tools" className="prof-btn prof-btn--primary">
                  <Sparkles size={14} />
                  <span>Resume Studio</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Activity Metrics Grid */}
          <div className="prof-card prof-card--stats">
            <div className="prof-card-header prof-card-header--compact">
              <span className="prof-card-title-sm">Candidate Activity</span>
              <span className="prof-card-pill">Live Synced</span>
            </div>
            <div className="prof-stats-matrix">
              <div className="prof-stat-box prof-stat-box--indigo">
                <div className="prof-stat-icon-wrap">
                  <Layers size={17} />
                </div>
                <div className="prof-stat-info">
                  <span className="prof-stat-num">{statsLoading ? "…" : stats.swiped}</span>
                  <span className="prof-stat-sub">Evaluated</span>
                </div>
              </div>

              <div className="prof-stat-box prof-stat-box--pink">
                <div className="prof-stat-icon-wrap">
                  <Heart size={17} />
                </div>
                <div className="prof-stat-info">
                  <span className="prof-stat-num">{statsLoading ? "…" : stats.liked}</span>
                  <span className="prof-stat-sub">Saved / Liked</span>
                </div>
              </div>

              <div className="prof-stat-box prof-stat-box--emerald">
                <div className="prof-stat-icon-wrap">
                  <Send size={17} />
                </div>
                <div className="prof-stat-info">
                  <span className="prof-stat-num">{statsLoading ? "…" : stats.applied}</span>
                  <span className="prof-stat-sub">Applications</span>
                </div>
              </div>

              <div className="prof-stat-box prof-stat-box--amber">
                <div className="prof-stat-icon-wrap">
                  <Sparkles size={17} />
                </div>
                <div className="prof-stat-info">
                  <span className="prof-stat-num">{statsLoading ? "…" : stats.matches}</span>
                  <span className="prof-stat-sub">AI Matches</span>
                </div>
              </div>
            </div>
          </div>

          {/* Job Search Calibration Card */}
          <div className="prof-card prof-card--calibration">
            <div className="prof-card-header">
              <div className="prof-card-title-group">
                <SlidersHorizontal size={15} className="text-indigo-600" />
                <h3 className="prof-card-title">Job Search Calibration</h3>
              </div>
              <button
                type="button"
                className="prof-link-btn"
                onClick={() => setEditModalOpen(true)}
              >
                Modify
              </button>
            </div>

            <div className="prof-calib-grid">
              <div className="prof-calib-block">
                <span className="prof-calib-label">Target Job Titles</span>
                <div className="prof-tag-list">
                  {jobTitles.length > 0 ? (
                    jobTitles.map((t, i) => (
                      <span key={`${i}-${t}`} className="prof-tag prof-tag--title">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="prof-empty-text">No target titles selected</span>
                  )}
                </div>
              </div>

              <div className="prof-calib-block">
                <span className="prof-calib-label">Preferred Work Mode</span>
                <div className="prof-tag-list">
                  {workModes.length > 0 ? (
                    workModes.map((m, i) => (
                      <span key={`${i}-${m}`} className="prof-tag prof-tag--mode">
                        {m}
                      </span>
                    ))
                  ) : (
                    <span className="prof-empty-text">Any work mode</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Column: Base Resume & Credentials Hub ─── */}
        <div className="prof-col prof-col--right">
          {/* Base Resume Command Center */}
          <div className="prof-card prof-card--resume">
            <div className="prof-card-header">
              <div className="prof-card-title-group">
                <FileText size={16} className="text-indigo-600" />
                <h3 className="prof-card-title">Base Resume (PDF)</h3>
              </div>
              {resumeStored && (
                <span className="prof-status-pill prof-status-pill--ready">
                  <CheckCircle2 size={13} />
                  <span>AI Tailoring Ready</span>
                </span>
              )}
            </div>

            <p className="prof-resume-hint">
              Stored locally to power 1-click tailoring in AI Resume Studio. Your original formatting
              is preserved while targeted role keywords are seamlessly synthesized.
            </p>

            {resumeStored && resumeMeta ? (
              <div className="prof-resume-badge-card">
                <div className="prof-resume-badge-left">
                  <div className="prof-pdf-icon-badge">
                    <FileText size={22} />
                    <span className="prof-pdf-label">PDF</span>
                  </div>
                  <div className="prof-resume-meta-info">
                    <span className="prof-resume-file-name" title={resumeMeta.fileName}>
                      {resumeMeta.fileName}
                    </span>
                    <span className="prof-resume-meta-sub">
                      {formatFileSize(resumeMeta.fileSize)} · Uploaded{" "}
                      {new Date(resumeMeta.uploadedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="prof-resume-badge-actions">
                  <button
                    type="button"
                    className="prof-resume-btn prof-resume-btn--preview"
                    onClick={handleResumePreview}
                    title="Preview resume"
                  >
                    <Eye size={14} />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    className="prof-resume-btn"
                    onClick={handleResumeDownload}
                    title="Download resume"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    className="prof-resume-btn prof-resume-btn--accent"
                    onClick={() => resumeInputRef.current?.click()}
                    title="Replace with new PDF"
                  >
                    <Upload size={14} />
                    <span>Replace</span>
                  </button>
                  <button
                    type="button"
                    className="prof-resume-btn prof-resume-btn--danger"
                    onClick={handleResumeRemove}
                    title="Remove saved resume"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="prof-resume-dropzone"
                onClick={() => resumeInputRef.current?.click()}
              >
                <div className="prof-dropzone-icon">
                  <Upload size={24} />
                </div>
                <div className="prof-dropzone-text">
                  <span className="prof-dropzone-main">
                    {resumeUploading ? "Saving base resume…" : "Upload Base Resume (PDF)"}
                  </span>
                  <span className="prof-dropzone-sub">
                    Max 10 MB · Stored locally for instant tailoring
                  </span>
                </div>
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
              <div className="prof-resume-toast">
                <CheckCircle2 size={14} />
                <span>Base resume saved! Ready for instant 1-click tailoring.</span>
              </div>
            )}
          </div>

          {/* Credentials & Profile Hub (Skills & Experience) */}
          <div className="prof-card prof-card--credentials">
            <div className="prof-cred-tabs">
              <button
                type="button"
                className={`prof-cred-tab ${activeTab === "skills" ? "prof-cred-tab--active" : ""}`}
                onClick={() => setActiveTab("skills")}
              >
                <Award size={14} />
                <span>Verified Skills</span>
                <span className="prof-tab-badge">{skills.length}</span>
              </button>
              {(workExp.length > 0 || education.length > 0) && (
                <button
                  type="button"
                  className={`prof-cred-tab ${activeTab === "experience" ? "prof-cred-tab--active" : ""}`}
                  onClick={() => setActiveTab("experience")}
                >
                  <Briefcase size={14} />
                  <span>Experience & Education</span>
                  <span className="prof-tab-badge">{workExp.length + education.length}</span>
                </button>
              )}
              <div className="prof-cred-tab-spacer" />
              <button
                type="button"
                className="prof-link-btn"
                onClick={() => setEditModalOpen(true)}
              >
                + Add Skill
              </button>
            </div>

            <div className="prof-cred-body">
              {activeTab === "skills" ? (
                <div className="prof-skills-container">
                  {skills.length > 0 ? (
                    <div className="prof-skills-grid">
                      {skills.map((skill, i) => (
                        <span key={`${i}-${skill}`} className="prof-skill-chip">
                          <span className="prof-skill-chip-dot" />
                          <span>{skill}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="prof-empty-box">
                      <p>No skills on file yet. Click &quot;+ Add Skill&quot; to calibrate matching.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="prof-timeline-container">
                  {workExp.length > 0 && (
                    <div className="prof-timeline-section">
                      <span className="prof-timeline-header">Work Experience</span>
                      <div className="prof-timeline-list">
                        {workExp.map((w, i) => (
                          <div key={i} className="prof-timeline-card">
                            <div className="prof-timeline-icon-box">
                              <Briefcase size={14} />
                            </div>
                            <div className="prof-timeline-info">
                              <span className="prof-timeline-title">{w.title}</span>
                              <span className="prof-timeline-company">
                                {w.company}{w.location ? ` · ${w.location}` : ""}
                              </span>
                              <span className="prof-timeline-date">
                                {[w.startDate, w.endDate].filter(Boolean).join(" → ")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {education.length > 0 && (
                    <div className="prof-timeline-section">
                      <span className="prof-timeline-header">Education</span>
                      <div className="prof-timeline-list">
                        {education.map((e, i) => (
                          <div key={i} className="prof-timeline-card">
                            <div className="prof-timeline-icon-box prof-timeline-icon-box--edu">
                              <GraduationCap size={14} />
                            </div>
                            <div className="prof-timeline-info">
                              <span className="prof-timeline-title">{e.degree}</span>
                              <span className="prof-timeline-company">{e.school}</span>
                              {e.date ? <span className="prof-timeline-date">{e.date}</span> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Resume Preview Modal ─── */}
      {resumePreviewUrl && (
        <div className="prof-modal-backdrop" onClick={() => setResumePreviewUrl(null)}>
          <div className="prof-resume-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prof-modal-header">
              <div className="prof-modal-header-left">
                <FileText size={18} className="text-indigo-600" />
                <h3>Resume Preview — {resumeMeta?.fileName}</h3>
              </div>
              <button 
                type="button" 
                className="prof-modal-close"
                onClick={() => setResumePreviewUrl(null)}
                aria-label="Close modal"
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

      {/* ─── Edit Preferences Modal ─── */}
      {editModalOpen && (
        <div className="prof-modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="prof-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="prof-modal-header">
              <div className="prof-modal-header-left">
                <Edit3 size={18} className="text-indigo-600" />
                <h3>Edit Career Preferences</h3>
              </div>
              <button 
                type="button" 
                className="prof-modal-close"
                onClick={() => setEditModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="prof-modal-form">
              <div className="prof-modal-field">
                <label>Target Job Titles (comma separated)</label>
                <input
                  type="text"
                  className="prof-modal-input"
                  value={jobTitles.join(", ")}
                  onChange={(e) => setJobTitles(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="e.g. Software Engineer, Motion Designer"
                />
              </div>

              <div className="prof-modal-field">
                <label>Preferred Work Mode</label>
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
                <label>Add Skill to Profile</label>
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
                  {skills.slice(0, 12).map((s) => (
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
