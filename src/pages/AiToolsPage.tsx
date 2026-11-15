import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  checkMlHealth,
  generateResume,
  tailorResumeWithUpload,
  predictFakeJob,
  type FakeJobPrediction,
  type PdfBlockChange,
  type PdfPagePreview,
} from "../api/ml";
import { fetchMatchedJobs, type JobCard } from "../api/jobs";
import { readSession } from "../auth/storage";
import { useAuth } from "../context/AuthContext";
import {
  getBaseResume,
  getBaseResumeAsFile,
  type ResumeMeta,
} from "../auth/resumeStorage";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Check,
  Copy,
  RotateCcw,
  CheckCircle2,
  Eye,
  X,
  ExternalLink,
  FileCheck,
  Split,
  Maximize2,
  Briefcase,
  DollarSign,
  Download,
} from "lucide-react";
import { TailoredResultPane } from "../components/TailoredPdfPreview";
import { ResumePaperTemplate } from "../components/ResumePaperTemplate";
import { ResumeErrorBoundary } from "../components/ResumeErrorBoundary";
import { LocationPinIcon } from "../components/LocationPinIcon";

import "./AiToolsPage.css";
import "../components/TailorResumeModal.css";

type Tab = "resume" | "detector";
type ResumeSection = "tailored_resume" | "summary" | "experience" | "cover_letter";

export function AiToolsPage() {
  const { session } = useAuth();
  const token = session?.token?.trim() || readSession()?.token?.trim() || "";

  const [activeTab, setActiveTab] = useState<Tab>("resume");

  // Health state
  const [healthStatus, setHealthStatus] = useState<{
    ok: boolean;
    fakeJobLoaded: boolean;
    resumeLoaded: boolean;
  }>({ ok: false, fakeJobLoaded: false, resumeLoaded: false });
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Resume Gen State
  const [sectionType, setSectionType] = useState<ResumeSection>("tailored_resume");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [generatedResume, setGeneratedResume] = useState("");
  const [generatingResume, setGeneratingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [copiedResume, setCopiedResume] = useState(false);
  const [outputView, setOutputView] = useState<"pdf" | "split" | "markdown">("pdf");
  const [extractedResumeText, setExtractedResumeText] = useState<string>("");
  const [engine] = useState<"local" | "ai">("local");
  const [tailoredPdfBase64, setTailoredPdfBase64] = useState<string | null>(null);
  const [pagePreviews, setPagePreviews] = useState<PdfPagePreview[]>([]);
  const [blocksModified, setBlocksModified] = useState<number>(0);
  const [pdfChanges, setPdfChanges] = useState<PdfBlockChange[]>([]);
  const [afterViewMode, setAfterViewMode] = useState<"pdf" | "paper">("pdf");
  const [beforeViewMode, setBeforeViewMode] = useState<"paper" | "pdf">("pdf");

  // Stored Base Resume State (from Settings)
  const [baseResume, setBaseResume] = useState<{ dataUrl: string; meta: ResumeMeta } | null>(null);
  const [useBaseResume, setUseBaseResume] = useState<boolean>(true);
  const [showResumePreview, setShowResumePreview] = useState<boolean>(false);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [compareModalLayout, setCompareModalLayout] = useState<"split" | "after" | "before">("split");

  // Memoized Blob URL for base resume with PDF open parameters
  const baseResumeBlobUrl = useMemo(() => {
    if (!baseResume?.dataUrl) return "";
    try {
      const parts = baseResume.dataUrl.split(",");
      if (parts.length < 2) return baseResume.dataUrl;
      const byteString = atob(parts[1]);
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "application/pdf";
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch {
      return baseResume.dataUrl;
    }
  }, [baseResume?.dataUrl]);

  useEffect(() => {
    return () => {
      if (baseResumeBlobUrl && baseResumeBlobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(baseResumeBlobUrl);
      }
    };
  }, [baseResumeBlobUrl]);

  const candidateDisplayName =
    baseResume?.meta?.fileName
      ?.replace(/[-_]?(?:latest|lastest|resume|cv|\.pdf)/gi, "")
      ?.replace(/[-_]/g, " ")
      ?.trim() || session?.name || "Candidate";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCompareModal(false);
        setShowResumePreview(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Matched Jobs Authenticity State
  const [matchedJobs, setMatchedJobs] = useState<JobCard[]>([]);
  const [loadingMatchedJobs, setLoadingMatchedJobs] = useState<boolean>(false);
  const [matchedJobsError, setMatchedJobsError] = useState<string | null>(null);
  const [jobAuthenticity, setJobAuthenticity] = useState<
    Record<string, { loading: boolean; prediction?: FakeJobPrediction; error?: string }>
  >({});
  const [authenticityFilter, setAuthenticityFilter] = useState<"all" | "real" | "fake">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchHealth = async () => {
    setCheckingHealth(true);
    const res = await checkMlHealth();
    setHealthStatus(res);
    setCheckingHealth(false);
  };

  useEffect(() => {
    void fetchHealth();
    // Load stored base resume from Settings/localStorage
    const stored = getBaseResume();
    if (stored) {
      setBaseResume(stored);
      setUseBaseResume(true);
    }
  }, []);

  const handleGenerateResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setResumeError("Please log in to generate resume content.");
      return;
    }
    if (!jobTitle.trim()) {
      setResumeError("Target Job Title is required.");
      return;
    }
    setGeneratingResume(true);
    setResumeError(null);
    setCopiedResume(false);
    setTailoredPdfBase64(null);
    setPagePreviews([]);
    setBlocksModified(0);
    setPdfChanges([]);

    try {
      // If user enabled base resume tailoring and base resume is available
      if (useBaseResume && baseResume) {
        const resumeFile = getBaseResumeAsFile();
        if (resumeFile) {
          const res = await tailorResumeWithUpload(
            {
              jobTitle: jobTitle.trim(),
              jobDescription: jobDescription.trim(),
              section: sectionType,
              engine,
              file: resumeFile,
            },
            token,
          );

          if (res.ok && res.data) {
            setGeneratedResume(res.data.generatedText);
            setExtractedResumeText(res.data.extractedText || res.data.extractedTextPreview || "");
            const hasEditedPdf = Boolean(res.data.pdfEdited && res.data.tailoredPdfBase64);
            setTailoredPdfBase64(hasEditedPdf ? res.data.tailoredPdfBase64 || null : null);
            setPagePreviews(hasEditedPdf ? res.data.pagePreviews || [] : []);
            setBlocksModified(res.data.blocksModified || 0);
            setPdfChanges(res.data.pdfChanges || []);
            setAfterViewMode(hasEditedPdf ? "pdf" : "paper");
            setBeforeViewMode("pdf");
            setOutputView("split");
            setCompareModalLayout("split");
            setShowCompareModal(true);
            setGeneratingResume(false);
            return;
          } else if (res.message) {
            // If upload tailoring threw a specific error, alert user
            setResumeError(res.message);
            setGeneratingResume(false);
            return;
          }
        }
      }

      // Default profile-based generation
      const res = await generateResume(
        {
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
          section: sectionType,
        },
        token,
      );

      if (res.ok && res.data) {
        setGeneratedResume(res.data.generatedText);
        setOutputView("pdf");
      } else {
        setResumeError(res.message || "Failed to generate resume text.");
      }
    } catch {
      setResumeError("Network error or ML service offline on port 8000.");
    } finally {
      setGeneratingResume(false);
    }
  };

  const handleCopyResume = async () => {
    if (!generatedResume) return;
    try {
      await navigator.clipboard.writeText(generatedResume);
      setCopiedResume(true);
      setTimeout(() => setCopiedResume(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownloadBaseResume = () => {
    if (!baseResume) return;
    const link = document.createElement("a");
    link.href = baseResume.dataUrl;
    link.download = baseResume.meta.fileName;
    link.click();
  };

  const scanJobsAuthenticity = useCallback(
    async (jobsList: JobCard[]) => {
      if (!token || jobsList.length === 0) return;

      setJobAuthenticity((prev) => {
        const next = { ...prev };
        for (const j of jobsList) {
          if (!next[j.id]?.prediction) {
            next[j.id] = { loading: true };
          }
        }
        return next;
      });

      await Promise.allSettled(
        jobsList.map(async (job) => {
          try {
            const res = await predictFakeJob(
              {
                title: job.title,
                company: job.company,
                description: job.description || "",
                location: job.location || "",
              },
              token,
            );
            if (res.ok && res.data) {
              setJobAuthenticity((prev) => ({
                ...prev,
                [job.id]: { loading: false, prediction: res.data! },
              }));
            } else {
              setJobAuthenticity((prev) => ({
                ...prev,
                [job.id]: { loading: false, error: res.message || "Screening failed" },
              }));
            }
          } catch {
            setJobAuthenticity((prev) => ({
              ...prev,
              [job.id]: { loading: false, error: "ML server offline" },
            }));
          }
        }),
      );
    },
    [token],
  );

  const loadMatchedJobs = useCallback(async () => {
    if (!token) return;
    setLoadingMatchedJobs(true);
    setMatchedJobsError(null);
    try {
      const res = await fetchMatchedJobs(token);
      if (res.success && res.jobs) {
        setMatchedJobs(res.jobs);
        void scanJobsAuthenticity(res.jobs);
      } else if (res.message) {
        setMatchedJobsError(res.message);
      }
    } catch {
      setMatchedJobsError("Could not retrieve matched jobs from server.");
    } finally {
      setLoadingMatchedJobs(false);
    }
  }, [token, scanJobsAuthenticity]);

  useEffect(() => {
    if (activeTab === "detector") {
      void loadMatchedJobs();
    }
  }, [activeTab, loadMatchedJobs]);

  const handleTailorJob = (job: JobCard) => {
    setJobTitle(job.title);
    setJobDescription(job.description || "");
    setActiveTab("resume");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalMatchesCount = matchedJobs.length;
  const authenticMatchesCount = useMemo(() => {
    return matchedJobs.filter(
      (j) => jobAuthenticity[j.id]?.prediction && !jobAuthenticity[j.id]?.prediction?.isFake,
    ).length;
  }, [matchedJobs, jobAuthenticity]);

  const suspiciousMatchesCount = useMemo(() => {
    return matchedJobs.filter(
      (j) => jobAuthenticity[j.id]?.prediction && jobAuthenticity[j.id]?.prediction?.isFake,
    ).length;
  }, [matchedJobs, jobAuthenticity]);

  const filteredMatchedJobs = useMemo(() => {
    return matchedJobs.filter((job) => {
      const auth = jobAuthenticity[job.id]?.prediction;
      if (authenticityFilter === "real" && (!auth || auth.isFake)) return false;
      if (authenticityFilter === "fake" && (!auth || !auth.isFake)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [matchedJobs, jobAuthenticity, authenticityFilter, searchQuery]);

  return (
    <div className="ai-tools-page page-fill">
            {/* Unified AI Studio Toolbar */}
      <div className="ai-studio-toolbar">
        <div className="ai-tools-tabs">
          <button
            type="button"
            className={`ai-tools-tab ${activeTab === "resume" ? "ai-tools-tab--active" : ""}`}
            onClick={() => setActiveTab("resume")}
          >
            <Sparkles size={15} />
            <span>AI Resume Studio</span>
          </button>

          <button
            type="button"
            className={`ai-tools-tab ${activeTab === "detector" ? "ai-tools-tab--active" : ""}`}
            onClick={() => setActiveTab("detector")}
          >
            <ShieldCheck size={15} />
            <span>Job Authenticity Verifier</span>
          </button>
        </div>

        {/* Model Status Bar */}
        <div className="ai-tools-status-bar">
          <div className="ai-tools-models-badges">
            <span
              className={`ai-status-pill ${
                healthStatus.fakeJobLoaded ? "ai-status-pill--active" : "ai-status-pill--offline"
              }`}
              title="AI Sequence Classifier for Job Authenticity"
            >
              <span className="ai-status-dot" />
              <span>Authenticity Scanner: {healthStatus.fakeJobLoaded ? "Ready" : "Standby"}</span>
            </span>

            <span
              className={`ai-status-pill ${
                healthStatus.resumeLoaded ? "ai-status-pill--active" : "ai-status-pill--offline"
              }`}
              title="AI Engine for Resume Generation"
            >
              <span className="ai-status-dot" />
              <span>Resume Tailor: {healthStatus.resumeLoaded ? "Ready" : "Standby"}</span>
            </span>
          </div>

          <button
            type="button"
            className="ai-tools-refresh-btn"
            onClick={fetchHealth}
            disabled={checkingHealth}
            title="Ping ML Microservice"
          >
            <RotateCcw size={12} className={checkingHealth ? "animate-spin" : ""} />
            <span>{checkingHealth ? "Pinging…" : "Check Health"}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: AI Resume Studio */}
      {activeTab === "resume" && (
        <div className="ai-tab-content">
          <div className="ai-resume-grid">
            {/* Form */}
            <form className="ai-card ai-resume-form" onSubmit={handleGenerateResume}>
              <div className="ai-card-header-row">
                <div>
                  <h2 className="ai-card-title">Generate Tailored Content</h2>
                  <p className="ai-card-desc">
                    Synthesizes customized phrasing aligned with your verified profile and target role.
                  </p>
                </div>
              </div>

              {/* Base Resume Indicator / Tailoring Control (Minimal & Clean) */}
              {baseResume ? (
                <div className="ai-base-resume-banner">
                  <div className="ai-base-resume-left">
                    <div className="ai-base-resume-icon-wrapper">
                      <FileCheck size={15} />
                    </div>
                    <div className="ai-base-resume-info">
                      <span className="ai-base-resume-name" title={baseResume.meta.fileName}>
                        {baseResume.meta.fileName}
                      </span>
                      <span className="ai-base-resume-size">
                        {(baseResume.meta.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <div className="ai-base-resume-right">
                    <button
                      type="button"
                      className="ai-btn-ghost-sm"
                      onClick={() => setShowResumePreview(true)}
                    >
                      <Eye size={12} /> View PDF
                    </button>
                    <label className="ai-switch-label" title="Use stored base resume as tailoring context">
                      <input
                        type="checkbox"
                        checked={useBaseResume}
                        onChange={(e) => setUseBaseResume(e.target.checked)}
                      />
                      <span className="ai-switch-slider" />
                      <span className="ai-switch-text">Tailor Base</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="ai-base-resume-banner ai-base-resume-banner--empty">
                  <div className="ai-base-resume-left">
                    <div className="ai-base-resume-icon-wrapper">
                      <FileText size={15} />
                    </div>
                    <div className="ai-base-resume-info">
                      <span className="ai-base-resume-name">No Base Resume</span>
                      <span className="ai-base-resume-size">Optional</span>
                    </div>
                  </div>
                  <Link to="/dashboard/profile" className="ai-btn-ghost-sm">
                    <ExternalLink size={12} /> Upload
                  </Link>
                </div>
              )}



              {/* Select Output Section (2 options only) */}
              <div className="ai-form-group">
                <label className="ai-label">Select Output Section</label>
                <div className="ai-pill-selector">
                  <button
                    type="button"
                    className={`ai-selector-pill ${
                      sectionType === "tailored_resume" ? "ai-selector-pill--active" : ""
                    }`}
                    onClick={() => setSectionType("tailored_resume")}
                  >
                    <FileCheck size={14} /> Complete Tailored Resume
                  </button>
                  <button
                    type="button"
                    className={`ai-selector-pill ${
                      sectionType === "summary" ? "ai-selector-pill--active" : ""
                    }`}
                    onClick={() => setSectionType("summary")}
                  >
                    <FileText size={14} /> Professional Summary
                  </button>
                </div>
              </div>

              <div className="ai-form-group">
                <label htmlFor="target-job-title" className="ai-label">
                  Target Job Title <span className="ai-label-req">*</span>
                </label>
                <input
                  id="target-job-title"
                  type="text"
                  className="ai-input"
                  placeholder="e.g. Senior Full-Stack Developer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
              </div>

              <div className="ai-form-group">
                <label htmlFor="target-job-desc" className="ai-label">
                  Job Description / Requirements <span className="ai-label-opt">(Optional)</span>
                </label>
                <textarea
                  id="target-job-desc"
                  className="ai-textarea"
                  rows={3}
                  placeholder="Paste key responsibilities or requirements to extract keywords…"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              {resumeError && <div className="ai-alert ai-alert--error">{resumeError}</div>}

              <button
                type="submit"
                className="ai-btn ai-btn--primary"
                disabled={generatingResume}
              >
                {generatingResume ? (
                  <>
                    <span className="ai-spinner" /> Generating tailored resume & PDF…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>
                      {sectionType === "tailored_resume"
                        ? "Generate Complete Tailored Resume"
                        : "Generate Professional Summary"}
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Preview Box */}
            <div className="ai-card ai-resume-preview">
              <div className="ai-preview-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 className="ai-card-title">Generated Tailored Resume</h3>
                  <p className="ai-card-desc" style={{ fontSize: 12, margin: "2px 0 0" }}>
                    Live editable ATS resume sheet & instant PDF download
                  </p>
                </div>
                {generatedResume && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div className="ai-view-tabs">
                      {baseResume && (
                        <button
                          type="button"
                          className={`ai-view-tab ${outputView === "split" ? "ai-view-tab--active" : ""}`}
                          onClick={() => setOutputView("split")}
                        >
                          <Split size={12} style={{ display: "inline-block", marginRight: 3, verticalAlign: "-1px" }} />
                          ⚖️ Before & After
                        </button>
                      )}
                      <button
                        type="button"
                        className={`ai-view-tab ${outputView === "pdf" ? "ai-view-tab--active" : ""}`}
                        onClick={() => setOutputView("pdf")}
                      >
                        📄 PDF Sheet
                      </button>
                      <button
                        type="button"
                        className={`ai-view-tab ${outputView === "markdown" ? "ai-view-tab--active" : ""}`}
                        onClick={() => setOutputView("markdown")}
                      >
                        📝 Raw Text
                      </button>
                    </div>

                    {outputView === "split" && baseResume && (
                      <button
                        type="button"
                        className="ai-btn-compare-popout"
                        onClick={() => setShowCompareModal(true)}
                        title="Open full-screen side-by-side comparison"
                      >
                        <Maximize2 size={13} />
                        <span>Compare Fullscreen</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="ai-btn ai-btn--secondary ai-btn--sm"
                      onClick={handleCopyResume}
                      title="Copy raw text to clipboard"
                    >
                      {copiedResume ? (
                        <><Check size={14} className="text-emerald-500" /> Copied!</>
                      ) : (
                        <><Copy size={14} /> Copy</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {generatingResume ? (
                <div className="ai-placeholder-state">
                  <div className="ai-pulse-loader" />
                  <p className="ai-placeholder-text">Synthesizing tailored resume & formatting PDF sheet…</p>
                  <span className="ai-placeholder-sub">
                    Extracting credentials from base resume & aligning with target job requirements
                  </span>
                </div>
              ) : generatedResume ? (
                outputView === "split" && baseResume ? (
                  <div style={{ display: "flex", flexDirection: "column", marginTop: 12, flex: 1, minHeight: 0 }}>
                    <div className="ai-compare-inline-banner">
                      <div className="ai-compare-inline-banner-left">
                        <Sparkles size={14} className="text-indigo-600" />
                        <span>Side-by-side comparison (Before & After)</span>
                      </div>
                      <button
                        type="button"
                        className="ai-compare-inline-banner-btn"
                        onClick={() => setShowCompareModal(true)}
                        title="Open full-screen comparison on top of this page"
                      >
                        <Maximize2 size={12} />
                        <span>Open Full Screen View</span>
                      </button>
                    </div>

                    <div className="tailor-split-container" style={{ minHeight: 620 }}>
                    <div className="tailor-split-col tailor-split-col--before">
                      <div className="tailor-split-header">
                        <div className="tailor-split-title-wrap">
                          <span className="tailor-split-badge tailor-split-badge--before">BEFORE</span>
                          <span className="tailor-split-title">Original Base Resume</span>
                        </div>
                        <div className="tailor-pill-toggle">
                          <button
                            type="button"
                            className={`tailor-pill-btn ${beforeViewMode === "paper" ? "tailor-pill-btn--active" : ""}`}
                            onClick={() => setBeforeViewMode("paper")}
                            title="Render identical paper sheet format matching tailored version"
                          >
                            ATS Paper View
                          </button>
                          <button
                            type="button"
                            className={`tailor-pill-btn ${beforeViewMode === "pdf" ? "tailor-pill-btn--active" : ""}`}
                            onClick={() => setBeforeViewMode("pdf")}
                            title="View original uploaded PDF document"
                          >
                            Original PDF
                          </button>
                        </div>
                        <span className="tailor-base-ready-pill">
                          <Check size={11} /> Saved in Settings
                        </span>
                      </div>
                      <div className={`tailor-split-body ${beforeViewMode === "paper" ? "tailor-split-body--paper" : ""}`}>
                        {beforeViewMode === "paper" && extractedResumeText ? (
                          <ResumeErrorBoundary
                            fallback={
                              <div className="tailor-original-doc">
                                <pre className="tailor-original-doc-content">{extractedResumeText}</pre>
                              </div>
                            }
                          >
                            <ResumePaperTemplate
                              rawMarkdown={extractedResumeText}
                              targetJobTitle="Original Profile"
                              candidateName={candidateDisplayName}
                              candidateEmail={session?.email || "candidate@swipeselect.io"}
                            />
                          </ResumeErrorBoundary>
                        ) : baseResume.dataUrl ? (
                          <iframe
                            src={`${baseResumeBlobUrl || baseResume.dataUrl}#view=FitH&navpanes=0&toolbar=0`}
                            className="tailor-split-pdf-frame"
                            title="Original Base Resume"
                          />
                        ) : (
                          <div className="tailor-original-doc">
                            <pre className="tailor-original-doc-content">{extractedResumeText || "Original resume text"}</pre>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="tailor-split-col tailor-split-col--after">
                      <div className="tailor-split-header">
                        <div className="tailor-split-title-wrap">
                          <span className="tailor-split-badge tailor-split-badge--after">AFTER</span>
                          <span className="tailor-split-title">
                            {tailoredPdfBase64 ? "Your PDF, updated" : "Tailored ATS Resume"}
                          </span>
                        </div>
                        <span className="tailor-split-match-badge">🎯 ATS Optimized</span>
                      </div>
                      <div className="tailor-split-body tailor-split-body--paper">
                        <TailoredResultPane
                          pdfBase64={tailoredPdfBase64} pagePreviews={pagePreviews} viewMode={afterViewMode} onViewModeChange={setAfterViewMode} blocksModified={blocksModified} changes={pdfChanges} filename={baseResume?.meta?.fileName ? `tailored-${baseResume.meta.fileName}` : "tailored-resume.pdf"}
                            rawMarkdown={generatedResume}
                            targetJobTitle={jobTitle || "Tailored Role"}
                            targetCompany=""
                            candidateName={
                              baseResume?.meta?.fileName
                                ?.replace(/[-_]?(?:latest|lastest|resume|cv|\.pdf)/gi, "")
                                ?.replace(/[-_]/g, " ")
                                ?.trim() || session?.name || "Candidate"
                            }
                            candidateEmail={session?.email || "candidate@swipeselect.io"}
                            onTextChange={setGeneratedResume}
                            onSavedAsBaseResume={() => {
                              const updated = getBaseResume();
                              if (updated) setBaseResume(updated);
                            }}
                          />

                      </div>
                    </div>
                  </div>
                </div>
                ) : outputView === "pdf" ? (
                  <div className="ai-resume-template-container">
                    <TailoredResultPane
                      pdfBase64={tailoredPdfBase64} pagePreviews={pagePreviews} viewMode={afterViewMode} onViewModeChange={setAfterViewMode} blocksModified={blocksModified} changes={pdfChanges} filename={baseResume?.meta?.fileName ? `tailored-${baseResume.meta.fileName}` : "tailored-resume.pdf"}
                        rawMarkdown={generatedResume}
                        targetJobTitle={jobTitle || "Tailored Role"}
                        targetCompany=""
                        candidateName={
                          baseResume?.meta?.fileName
                            ?.replace(/[-_]?(?:latest|lastest|resume|cv|\.pdf)/gi, "")
                            ?.replace(/[-_]/g, " ")
                            ?.trim() || session?.name || "Candidate"
                        }
                        candidateEmail={session?.email || "candidate@swipeselect.io"}
                        onTextChange={setGeneratedResume}
                        onSavedAsBaseResume={() => {
                          const updated = getBaseResume();
                          if (updated) setBaseResume(updated);
                        }}
                      />

                  </div>
                ) : (
                  <div className="ai-output-container">
                    <textarea
                      className="ai-output-textarea"
                      value={generatedResume}
                      onChange={(e) => setGeneratedResume(e.target.value)}
                      rows={16}
                    />
                    <div className="ai-output-footer">
                      <span>
                        {generatedResume.split(/\s+/).filter(Boolean).length} words •{" "}
                        {generatedResume.length} characters
                      </span>
                      <span className="ai-hint">Directly editable</span>
                    </div>
                  </div>
                )
              ) : (
                <div className="ai-placeholder-state">
                  <div className="ai-placeholder-icon"><FileText size={40} className="text-indigo-400" /></div>
                  <p className="ai-placeholder-text">Awaiting input</p>
                  <span className="ai-placeholder-sub">
                    Enter your target job title on the left to synthesize and format your tailored ATS resume PDF.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Fake Job Authenticity Verifier (Matched Jobs Authenticity Center) */}
      {activeTab === "detector" && (
        <div className="ai-tab-content">
          <div className="ai-auth-container">
            {/* Sleek, Presentable Header Bar */}
            <div className="ai-auth-compact-bar">
              <div className="ai-auth-bar-left">
                <div className="ai-auth-title-line">
                  <h2 className="ai-auth-heading">Screen Matched Roles Authenticity</h2>
                  <span className="ai-auth-model-pill">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    Scam & Fraud Shield
                  </span>
                </div>
                <p className="ai-auth-sub">
                  Real-time neural fraud screening of your saved job postings against 50,000+ scam patterns.
                </p>
              </div>

              <div className="ai-auth-bar-right">
                {/* Inline Compact KPI Counters */}
                <div className="ai-auth-mini-kpis">
                  <span className="ai-auth-mini-kpi ai-auth-mini-kpi--total">
                    <Briefcase size={12} />
                    <span><strong>{totalMatchesCount}</strong> Matched</span>
                  </span>
                  <span className="ai-auth-mini-kpi ai-auth-mini-kpi--real">
                    <CheckCircle2 size={12} />
                    <span><strong>{authenticMatchesCount}</strong> Authentic</span>
                  </span>
                  <span className="ai-auth-mini-kpi ai-auth-mini-kpi--fake">
                    <AlertTriangle size={12} />
                    <span><strong>{suspiciousMatchesCount}</strong> Suspicious</span>
                  </span>
                </div>

                {/* Filter Tabs */}
                <div className="ai-auth-tabs">
                  <button
                    type="button"
                    className={`ai-auth-tab ${authenticityFilter === "all" ? "ai-auth-tab--active" : ""}`}
                    onClick={() => setAuthenticityFilter("all")}
                  >
                    All ({totalMatchesCount})
                  </button>
                  <button
                    type="button"
                    className={`ai-auth-tab ${authenticityFilter === "real" ? "ai-auth-tab--active" : ""}`}
                    onClick={() => setAuthenticityFilter("real")}
                  >
                    ✓ Authentic ({authenticMatchesCount})
                  </button>
                  <button
                    type="button"
                    className={`ai-auth-tab ${authenticityFilter === "fake" ? "ai-auth-tab--active" : ""}`}
                    onClick={() => setAuthenticityFilter("fake")}
                  >
                    ⚠ Suspicious ({suspiciousMatchesCount})
                  </button>
                </div>

                {/* Rescan Button */}
                <button
                  type="button"
                  className="ai-auth-rescan-btn"
                  onClick={() => void loadMatchedJobs()}
                  disabled={loadingMatchedJobs}
                  title="Re-run authenticity verification on all matched positions"
                >
                  <RotateCcw size={12} className={loadingMatchedJobs ? "ai-spinner" : ""} />
                  <span>{loadingMatchedJobs ? "Scanning…" : "Rescan"}</span>
                </button>
              </div>
            </div>

            {/* Error Message if API failed */}
            {matchedJobsError && (
              <div className="ai-alert ai-alert--error" style={{ margin: 0, padding: "8px 14px", fontSize: "12px" }}>
                {matchedJobsError}
              </div>
            )}

            {/* Main Content Area: Fits 100% on screen with zero scrolling */}
            <div className="ai-auth-content-area">
              {loadingMatchedJobs && matchedJobs.length === 0 ? (
                <div className="ai-placeholder-state" style={{ height: "100%", minHeight: 0 }}>
                  <div className="ai-pulse-loader" />
                  <p className="ai-placeholder-text">Analyzing matched jobs authenticity…</p>
                  <span className="ai-placeholder-sub">
                    Evaluating roles against neural authenticity verification models
                  </span>
                </div>
              ) : matchedJobs.length === 0 ? (
                <div className="ai-auth-empty">
                  <div className="ai-auth-empty-icon">
                    <ShieldCheck size={26} />
                  </div>
                  <h3 className="ai-auth-empty-title">No Matched Jobs Yet</h3>
                  <p className="ai-auth-empty-desc">
                    You haven't swiped right on or saved any jobs yet. When you like positions in the Discover feed, they will appear here with automatic real-time job authenticity checks.
                  </p>
                  <Link to="/dashboard/swipe" className="ai-auth-empty-btn">
                    <Sparkles size={13} /> Go to Discover & Swipe Jobs
                  </Link>
                </div>
              ) : filteredMatchedJobs.length === 0 ? (
                <div className="ai-auth-empty">
                  <div className="ai-auth-empty-icon">
                    <CheckCircle2 size={26} className="text-emerald-500" />
                  </div>
                  <h3 className="ai-auth-empty-title">No Postings Match Filter</h3>
                  <p className="ai-auth-empty-desc">
                    {authenticityFilter === "fake"
                      ? "Great news! None of your matched roles are flagged as fraudulent or suspicious."
                      : "No positions match the current filter."}
                  </p>
                  <button
                    type="button"
                    className="ai-selector-pill ai-selector-pill--active"
                    style={{ padding: "6px 14px", fontSize: "12px" }}
                    onClick={() => {
                      setAuthenticityFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Reset Filter to All
                  </button>
                </div>
              ) : (
                <div className="ai-auth-grid">
                  {filteredMatchedJobs.map((job) => {
                    const authState = jobAuthenticity[job.id];
                    const isLoading = authState?.loading;
                    const pred = authState?.prediction;
                    const isFake = pred?.isFake;
                    const confidencePct = pred ? Math.round(pred.confidence * 100) : null;

                    const initials = (job.company || "SS")
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <div
                        key={job.id}
                        className={`ai-auth-card ${
                          isLoading
                            ? "ai-auth-card--scanning"
                            : isFake
                            ? "ai-auth-card--fake"
                            : "ai-auth-card--real"
                        }`}
                      >
                        {/* Compact Top Authenticity Ribbon */}
                        <div
                          className={`ai-auth-card-banner ${
                            isLoading
                              ? "ai-auth-card-banner--scanning"
                              : isFake
                              ? "ai-auth-card-banner--fake"
                              : "ai-auth-card-banner--real"
                          }`}
                        >
                          <div className="ai-auth-banner-left">
                            {isLoading ? (
                              <RotateCcw size={14} className="text-indigo-600 ai-spinner" />
                            ) : isFake ? (
                              <AlertTriangle size={15} className="text-rose-600" />
                            ) : (
                              <CheckCircle2 size={15} className="text-emerald-600" />
                            )}
                            <span className="ai-auth-banner-title">
                              {isLoading
                                ? "Authenticity Screening…"
                                : isFake
                                ? "SUSPICIOUS POSTING"
                                : "VERIFIED AUTHENTIC"}
                            </span>
                            <span className="ai-auth-banner-sub">
                              {isLoading
                                ? "Evaluating…"
                                : isFake
                                ? "High caution advised"
                                : "Legitimate employer structure"}
                            </span>
                          </div>

                          {confidencePct !== null && (
                            <span
                              className={`ai-auth-banner-pill ${
                                isFake ? "ai-auth-banner-pill--fake" : "ai-auth-banner-pill--real"
                              }`}
                            >
                              {isFake ? `${confidencePct}% Scam Risk` : `${confidencePct}% Authentic`}
                            </span>
                          )}
                        </div>

                        {/* Company & Title Block */}
                        <div className="ai-auth-card-body">
                          <div className="ai-auth-company-row">
                            <div className="ai-auth-company-avatar">{initials}</div>
                            <div className="ai-auth-company-meta">
                              <span className="ai-auth-company-name">{job.company || "Company"}</span>
                              {job.source && (
                                <span className="ai-auth-source-tag">via {job.source}</span>
                              )}
                            </div>
                            <span
                              className={`match-card-badge ${
                                job.status === "applied"
                                  ? "match-card-badge--applied"
                                  : "match-card-badge--saved"
                              }`}
                              style={{ marginLeft: "auto" }}
                            >
                              {job.status === "applied" ? "Applied" : "Saved Match"}
                            </span>
                          </div>

                          <h3 className="ai-auth-job-title" title={job.title}>
                            {job.title}
                          </h3>

                          <div className="ai-auth-meta-tags">
                            {job.location && (
                              <span className="ai-auth-meta-chip">
                                <LocationPinIcon size={12} /> {job.location}
                              </span>
                            )}
                            {job.jobType && (
                              <span className="ai-auth-meta-chip">
                                <Briefcase size={10} /> {job.jobType}
                              </span>
                            )}
                            {job.salaryRange && (
                              <span className="ai-auth-meta-chip">
                                <DollarSign size={10} /> {job.salaryRange}
                              </span>
                            )}
                          </div>

                          {/* Security Breakdown Box */}
                          <div className="ai-auth-breakdown">
                            <div className="ai-auth-bar-row">
                              <span>Authenticity Confidence Index</span>
                              <span>{confidencePct !== null ? `${confidencePct}%` : "Analyzing…"}</span>
                            </div>
                            <div className="ai-auth-bar-track">
                              <div
                                className={`ai-auth-bar-fill ${
                                  isFake ? "ai-auth-bar-fill--fake" : "ai-auth-bar-fill--real"
                                }`}
                                style={{ width: `${confidencePct ?? (isLoading ? 50 : 100)}%` }}
                              />
                            </div>
                            <p className="ai-auth-summary-text">
                              {isLoading
                                ? "Running neural classification across hiring phrases…"
                                : isFake
                                ? "⚠️ Caution: Detected non-standard hiring channels or phantom posting patterns. Do not transfer funds or share financial credentials."
                                : "✓ Safe to apply: Passed sequence classification against payroll scams and advance-fee hallmarks."}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="ai-auth-actions">
                          <button
                            type="button"
                            className="ai-auth-btn-tailor"
                            onClick={() => handleTailorJob(job)}
                            title="Generate a custom tailored resume matching this job description"
                          >
                            <Sparkles size={12} />
                            <span>Tailor Resume for this Job</span>
                          </button>

                          {job.sourceUrl && (
                            <button
                              type="button"
                              className="ai-auth-btn-view"
                              onClick={() => window.open(job.sourceUrl, "_blank", "noopener,noreferrer")}
                              title="Open original posting"
                            >
                              <ExternalLink size={12} />
                              <span>View Listing</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Base Resume Preview Modal */}
      {showResumePreview && baseResume && (
        <div
          className="ai-base-preview-backdrop"
          onClick={() => setShowResumePreview(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Base Resume Fullscreen Preview"
        >
          <div
            className="ai-base-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ai-base-preview-header">
              <div className="ai-base-preview-header-left">
                <div className="ai-base-preview-icon-wrap">
                  <FileCheck size={18} />
                </div>
                <div>
                  <h3 className="ai-base-preview-title">
                    Base Resume Preview — {baseResume.meta.fileName}
                  </h3>
                  <span className="ai-base-preview-size-badge">
                    {(baseResume.meta.fileSize / 1024).toFixed(1)} KB · Stored for AI Tailoring
                  </span>
                </div>
              </div>

              <div className="ai-base-preview-header-right">
                <button
                  type="button"
                  className="ai-base-preview-download-btn"
                  onClick={handleDownloadBaseResume}
                  title="Download PDF"
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  className="ai-base-preview-close-btn"
                  onClick={() => setShowResumePreview(false)}
                  aria-label="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="ai-base-preview-body">
              <iframe
                src={`${baseResumeBlobUrl || baseResume.dataUrl}#view=FitH&navpanes=0`}
                title="Base Resume PDF Full Preview"
                className="ai-base-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}

      {/* Expansive Full-Screen Before & After Comparison Modal */}
      {showCompareModal && baseResume && generatedResume && (
        <div
          className="ai-compare-modal-backdrop"
          onClick={() => setShowCompareModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Before and After Resume Comparison"
        >
          <div
            className="ai-compare-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header Bar */}
            <div className="ai-compare-modal-header">
              <div className="ai-compare-header-left">
                <div className="ai-compare-header-icon-wrap">
                  <Split size={18} className="text-indigo-600" />
                </div>
                <div>
                  <div className="ai-compare-header-title-row">
                    <h2 className="ai-compare-modal-title">Before & After Resume Comparison</h2>
                    <span className="ai-compare-header-badge">
                      {blocksModified ? `${blocksModified} blocks updated` : "ATS Optimized"}
                    </span>
                  </div>
                  <p className="ai-compare-modal-sub">
                    Comparing <strong>{baseResume.meta.fileName}</strong> with tailored version for <strong>{jobTitle || "Target Role"}</strong>
                  </p>
                </div>
              </div>

              {/* View Mode Switcher */}
              <div className="ai-compare-view-switcher">
                <button
                  type="button"
                  className={`ai-compare-switch-btn ${compareModalLayout === "split" ? "ai-compare-switch-btn--active" : ""}`}
                  onClick={() => setCompareModalLayout("split")}
                >
                  <Split size={13} />
                  <span>Side-by-Side</span>
                </button>
                <button
                  type="button"
                  className={`ai-compare-switch-btn ${compareModalLayout === "after" ? "ai-compare-switch-btn--active" : ""}`}
                  onClick={() => setCompareModalLayout("after")}
                >
                  <Sparkles size={13} />
                  <span>After (Tailored)</span>
                </button>
                <button
                  type="button"
                  className={`ai-compare-switch-btn ${compareModalLayout === "before" ? "ai-compare-switch-btn--active" : ""}`}
                  onClick={() => setCompareModalLayout("before")}
                >
                  <FileText size={13} />
                  <span>Before (Original)</span>
                </button>
              </div>

              {/* Header Right Actions */}
              <div className="ai-compare-header-right">
                <button
                  type="button"
                  className="ai-compare-close-btn"
                  onClick={() => setShowCompareModal(false)}
                  title="Close comparison (Esc)"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Comparison Body */}
            <div className="ai-compare-modal-body">
              {/* Left Column: BEFORE */}
              {(compareModalLayout === "split" || compareModalLayout === "before") && (
                <div className={`ai-compare-col ai-compare-col--before ${compareModalLayout === "before" ? "ai-compare-col--full" : ""}`}>
                  <div className="ai-compare-col-header">
                    <div className="ai-compare-col-title-wrap">
                      <span className="ai-compare-badge ai-compare-badge--before">BEFORE</span>
                      <span className="ai-compare-col-title">Original Base Resume</span>
                    </div>
                    <div className="tailor-pill-toggle">
                      <button
                        type="button"
                        className={`tailor-pill-btn ${beforeViewMode === "paper" ? "tailor-pill-btn--active" : ""}`}
                        onClick={() => setBeforeViewMode("paper")}
                        title="Render identical paper sheet format matching tailored version"
                      >
                        ATS Paper View
                      </button>
                      <button
                        type="button"
                        className={`tailor-pill-btn ${beforeViewMode === "pdf" ? "tailor-pill-btn--active" : ""}`}
                        onClick={() => setBeforeViewMode("pdf")}
                        title="View original uploaded PDF document"
                      >
                        Original PDF
                      </button>
                    </div>
                    <span className="tailor-base-ready-pill">
                      <Check size={11} /> Saved in Settings
                    </span>
                  </div>
                  <div className={`ai-compare-col-content ${beforeViewMode === "paper" ? "ai-compare-col-content--paper" : ""}`}>
                    {beforeViewMode === "paper" && extractedResumeText ? (
                      <ResumeErrorBoundary
                        fallback={
                          <div className="tailor-original-doc" style={{ height: "100%", overflowY: "auto" }}>
                            <pre className="tailor-original-doc-content">{extractedResumeText}</pre>
                          </div>
                        }
                      >
                        <ResumePaperTemplate
                          rawMarkdown={extractedResumeText}
                          targetJobTitle="Original Profile"
                          candidateName={candidateDisplayName}
                          candidateEmail={session?.email || "candidate@swipeselect.io"}
                        />
                      </ResumeErrorBoundary>
                    ) : baseResume.dataUrl ? (
                      <iframe
                        src={`${baseResumeBlobUrl || baseResume.dataUrl}#view=FitH&navpanes=0&toolbar=0`}
                        className="ai-compare-iframe"
                        title="Original Base Resume (Large View)"
                      />
                    ) : (
                      <div className="tailor-original-doc" style={{ height: "100%", overflowY: "auto" }}>
                        <pre className="tailor-original-doc-content">{extractedResumeText || "Original resume text"}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Right Column: AFTER */}
              {(compareModalLayout === "split" || compareModalLayout === "after") && (
                <div className={`ai-compare-col ai-compare-col--after ${compareModalLayout === "after" ? "ai-compare-col--full" : ""}`}>
                  <div className="ai-compare-col-header">
                    <div className="ai-compare-col-title-wrap">
                      <span className="ai-compare-badge ai-compare-badge--after">AFTER</span>
                      <span className="ai-compare-col-title">
                        {tailoredPdfBase64 ? "Your PDF, updated" : "Tailored ATS Resume"}
                      </span>
                    </div>
                    <span className="tailor-split-match-badge">🎯 ATS Optimized</span>
                  </div>
                  <div className="ai-compare-col-content ai-compare-col-content--paper">
                    <TailoredResultPane
                      pdfBase64={tailoredPdfBase64}
                      pagePreviews={pagePreviews}
                      viewMode={afterViewMode}
                      onViewModeChange={setAfterViewMode}
                      blocksModified={blocksModified}
                      changes={pdfChanges}
                      filename={baseResume?.meta?.fileName ? `tailored-${baseResume.meta.fileName}` : "tailored-resume.pdf"}
                      rawMarkdown={generatedResume}
                      targetJobTitle={jobTitle || "Tailored Role"}
                      targetCompany=""
                      candidateName={
                        baseResume?.meta?.fileName
                          ?.replace(/[-_]?(?:latest|lastest|resume|cv|\.pdf)/gi, "")
                          ?.replace(/[-_]/g, " ")
                          ?.trim() || session?.name || "Candidate"
                      }
                      candidateEmail={session?.email || "candidate@swipeselect.io"}
                      onTextChange={setGeneratedResume}
                      onSavedAsBaseResume={() => {
                        const updated = getBaseResume();
                        if (updated) setBaseResume(updated);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
