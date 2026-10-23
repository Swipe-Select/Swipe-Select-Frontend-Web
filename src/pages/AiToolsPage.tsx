import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  checkMlHealth,
  generateResume,
  tailorResumeWithUpload,
  predictFakeJob,
  type FakeJobPrediction,
} from "../api/ml";
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
  Bot,
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
} from "lucide-react";
import { ResumePaperTemplate } from "../components/ResumePaperTemplate";
import { ResumeErrorBoundary } from "../components/ResumeErrorBoundary";
import "./AiToolsPage.css";
import "../components/TailorResumeModal.css";

type Tab = "resume" | "detector";
type ResumeSection = "tailored_resume" | "summary" | "experience" | "cover_letter";

const PRESET_REAL_JOB = {
  title: "Senior Full Stack Engineer",
  company: "Stripe",
  location: "San Francisco, CA (Hybrid)",
  description: "We are looking for a Senior Full Stack Engineer to join our Core Payments team. You will architect robust distributed payment APIs, integrate real-time fraud mitigation, and collaborate with UX teams on developer dashboards. Requirements: 5+ years with TypeScript, React, Go or Node.js, distributed database scaling, and strong automated testing methodologies.",
};

const PRESET_FAKE_JOB = {
  title: "Remote Data Entry Assistant - Immediate Start",
  company: "Global Logistics VIP Services",
  location: "Remote / Anywhere",
  description: "URGENT HIRING: Earn $85/hour working from home! No experience needed! Must have personal laptop and smartphone. You will receive payments into your personal account and transfer to clients via cryptocurrency wire. Immediate start without interview. Contact manager on Telegram @hr_direct_vip to receive home office check for $4,500 equipment purchase.",
};

const PRESET_RESUME_1 = {
  jobTitle: "Senior Frontend Engineer",
  jobDescription: "Looking for an expert in React, TypeScript, state management, web performance optimization, and accessible component libraries.",
};

const PRESET_RESUME_2 = {
  jobTitle: "AI & ML Application Developer",
  jobDescription: "Seeking an engineer to build production web applications integrating Large Language Models (LLMs), quantized GGUF inference, and transformer embeddings.",
};

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

  // Stored Base Resume State (from Settings)
  const [baseResume, setBaseResume] = useState<{ dataUrl: string; meta: ResumeMeta } | null>(null);
  const [useBaseResume, setUseBaseResume] = useState<boolean>(true);
  const [showResumePreview, setShowResumePreview] = useState<boolean>(false);

  // Fake Job Detector State
  const [detectorTitle, setDetectorTitle] = useState("");
  const [detectorCompany, setDetectorCompany] = useState("");
  const [detectorLocation, setDetectorLocation] = useState("");
  const [detectorDescription, setDetectorDescription] = useState("");
  const [detectorResult, setDetectorResult] = useState<FakeJobPrediction | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectorError, setDetectorError] = useState<string | null>(null);

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
    setGeneratingResume(true);
    setResumeError(null);
    setCopiedResume(false);

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
              file: resumeFile,
            },
            token,
          );

          if (res.ok && res.data) {
            setGeneratedResume(res.data.generatedText);
            setExtractedResumeText(res.data.extractedText || res.data.extractedTextPreview || "");
            setOutputView("split");
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

  const handleDetectFakeJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setDetectorError("Please log in to analyze job postings.");
      return;
    }
    if (!detectorTitle.trim() || !detectorDescription.trim()) {
      setDetectorError("Job Title and Job Description are required.");
      return;
    }

    setDetecting(true);
    setDetectorError(null);
    setDetectorResult(null);

    try {
      const res = await predictFakeJob(
        {
          title: detectorTitle.trim(),
          company: detectorCompany.trim(),
          location: detectorLocation.trim(),
          description: detectorDescription.trim(),
        },
        token,
      );

      if (res.ok && res.data) {
        setDetectorResult(res.data);
      } else {
        setDetectorError(res.message || "Failed to analyze job posting.");
      }
    } catch {
      setDetectorError("Network error or ML service offline on port 8000.");
    } finally {
      setDetecting(false);
    }
  };

  const loadFakeJobPreset = (preset: typeof PRESET_REAL_JOB) => {
    setDetectorTitle(preset.title);
    setDetectorCompany(preset.company);
    setDetectorLocation(preset.location);
    setDetectorDescription(preset.description);
    setDetectorResult(null);
    setDetectorError(null);
  };

  const loadResumePreset = (preset: typeof PRESET_RESUME_1) => {
    setJobTitle(preset.jobTitle);
    setJobDescription(preset.jobDescription);
    setGeneratedResume("");
    setResumeError(null);
  };

  return (
    <div className="ai-tools-page page-fill">
      {/* Header */}
      <div className="ai-tools-header">
        <div>
          <h1 className="ai-tools-title">AI Career Intelligence Studio</h1>
          <p className="ai-tools-subtitle">
            Powered by fine-tuned <strong>ModernBERT</strong> (Fraud Detection) & <strong>Qwen2.5-3B</strong> (ATS Resume Generator) on port 8000.
          </p>
        </div>

        {/* Model Status Bar */}
        <div className="ai-tools-status-bar">
          <div className="ai-tools-models-badges">
            <span
              className={`ai-status-pill ${
                healthStatus.fakeJobLoaded ? "ai-status-pill--active" : "ai-status-pill--offline"
              }`}
              title="ModernBERT Sequence Classifier for Fake Job Detection"
            >
              <span className="ai-status-dot" />
              <ShieldCheck size={14} />
              <span>ModernBERT: {healthStatus.fakeJobLoaded ? "Ready" : "Standby"}</span>
            </span>

            <span
              className={`ai-status-pill ${
                healthStatus.resumeLoaded ? "ai-status-pill--active" : "ai-status-pill--offline"
              }`}
              title="Qwen2.5-3B Instruct GGUF Model for Resume Generation"
            >
              <span className="ai-status-dot" />
              <Bot size={14} />
              <span>Qwen2.5-3B: {healthStatus.resumeLoaded ? "Ready" : "Standby"}</span>
            </span>
          </div>

          <button
            type="button"
            className="ai-tools-refresh-btn"
            onClick={fetchHealth}
            disabled={checkingHealth}
            title="Ping ML Microservice"
          >
            <RotateCcw size={13} className={checkingHealth ? "animate-spin" : ""} />
            <span>{checkingHealth ? "Pinging…" : "Check Health"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="ai-tools-tabs">
        <button
          type="button"
          className={`ai-tools-tab ${activeTab === "resume" ? "ai-tools-tab--active" : ""}`}
          onClick={() => setActiveTab("resume")}
        >
          <Sparkles size={16} />
          <span>AI Resume Studio (Qwen2.5)</span>
        </button>

        <button
          type="button"
          className={`ai-tools-tab ${activeTab === "detector" ? "ai-tools-tab--active" : ""}`}
          onClick={() => setActiveTab("detector")}
        >
          <ShieldCheck size={16} />
          <span>Fake Job Authenticity Verifier (ModernBERT)</span>
        </button>
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

              {/* Base Resume Indicator / Tailoring Control */}
              {baseResume ? (
                <div className="ai-base-resume-banner">
                  <div className="ai-base-resume-left">
                    <div className="ai-base-resume-icon-wrapper">
                      <FileCheck size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="ai-base-resume-title-line">
                        <strong className="ai-base-resume-name">{baseResume.meta.fileName}</strong>
                        <span className="ai-badge-source">Active Base PDF</span>
                      </div>
                      <p className="ai-base-resume-meta">
                        {(baseResume.meta.fileSize / 1024).toFixed(1)} KB • Saved in Profile Settings
                      </p>
                    </div>
                  </div>
                  <div className="ai-base-resume-right">
                    <button
                      type="button"
                      className="ai-btn-ghost-sm"
                      onClick={() => setShowResumePreview(true)}
                    >
                      <Eye size={13} /> View PDF
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
                      <FileText size={20} className="text-slate-400" />
                    </div>
                    <div>
                      <div className="ai-base-resume-title-line">
                        <strong>No Base Resume PDF Stored</strong>
                      </div>
                      <p className="ai-base-resume-meta">
                        Upload your resume PDF in Settings so AI can automatically tailor it for any role.
                      </p>
                    </div>
                  </div>
                  <Link to="/dashboard/profile" className="ai-btn-ghost-sm">
                    <ExternalLink size={13} /> Upload in Settings
                  </Link>
                </div>
              )}

              {/* Demo Presets Row */}
              <div className="ai-preset-row">
                <span className="ai-preset-label">
                  <Sparkles size={13} className="text-indigo-500" /> 1-Click Role Presets:
                </span>
                <button
                  type="button"
                  className="ai-preset-btn"
                  onClick={() => loadResumePreset(PRESET_RESUME_1)}
                >
                  Frontend Engineer
                </button>
                <button
                  type="button"
                  className="ai-preset-btn"
                  onClick={() => loadResumePreset(PRESET_RESUME_2)}
                >
                  AI / ML Developer
                </button>
              </div>

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
                  <button
                    type="button"
                    className={`ai-selector-pill ${
                      sectionType === "experience" ? "ai-selector-pill--active" : ""
                    }`}
                    onClick={() => setSectionType("experience")}
                  >
                    <CheckCircle2 size={14} /> Work Experience
                  </button>
                  <button
                    type="button"
                    className={`ai-selector-pill ${
                      sectionType === "cover_letter" ? "ai-selector-pill--active" : ""
                    }`}
                    onClick={() => setSectionType("cover_letter")}
                  >
                    <FileText size={14} /> Cover Letter
                  </button>
                </div>
              </div>

              <div className="ai-form-group">
                <label htmlFor="target-job-title" className="ai-label">
                  Target Job Title <span className="ai-label-opt">(Optional)</span>
                </label>
                <input
                  id="target-job-title"
                  type="text"
                  className="ai-input"
                  placeholder="e.g. Senior Full-Stack Developer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>

              <div className="ai-form-group">
                <label htmlFor="target-job-desc" className="ai-label">
                  Job Description / Requirements <span className="ai-label-opt">(Optional)</span>
                </label>
                <textarea
                  id="target-job-desc"
                  className="ai-textarea"
                  rows={4}
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
                        : "Generate Tailored Section"}
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
                  <div className="tailor-split-container" style={{ minHeight: 620, marginTop: 12 }}>
                    <div className="tailor-split-col tailor-split-col--before">
                      <div className="tailor-split-header">
                        <div className="tailor-split-title-wrap">
                          <span className="tailor-split-badge tailor-split-badge--before">BEFORE</span>
                          <span className="tailor-split-title">Original Base Resume</span>
                        </div>
                        <span className="tailor-base-ready-pill">
                          <Check size={11} /> Saved in Settings
                        </span>
                      </div>
                      <div className="tailor-split-body">
                        {baseResume.dataUrl ? (
                          <iframe
                            src={baseResume.dataUrl}
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
                          <span className="tailor-split-title">Tailored ATS Resume</span>
                        </div>
                        <span className="tailor-split-match-badge">🎯 ATS Optimized</span>
                      </div>
                      <div className="tailor-split-body tailor-split-body--paper">
                        <ResumeErrorBoundary>
                          <ResumePaperTemplate
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
                        </ResumeErrorBoundary>
                      </div>
                    </div>
                  </div>
                ) : outputView === "pdf" ? (
                  <div className="ai-resume-template-container">
                    <ResumeErrorBoundary>
                      <ResumePaperTemplate
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
                    </ResumeErrorBoundary>
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
                  <p className="ai-placeholder-text">Awaiting prompt</p>
                  <span className="ai-placeholder-sub">
                    Click one of the demo presets or enter a role above to generate and export your tailored resume PDF.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Fake Job Authenticity Verifier */}
      {activeTab === "detector" && (
        <div className="ai-tab-content">
          <div className="ai-resume-grid">
            {/* Form */}
            <form className="ai-card ai-resume-form" onSubmit={handleDetectFakeJob}>
              <div className="ai-card-header-row">
                <div>
                  <h2 className="ai-card-title">Screen Job Posting Authenticity</h2>
                  <p className="ai-card-desc">
                    Evaluates postings against 50,000+ known fraudulent patterns using fine-tuned ModernBERT.
                  </p>
                </div>
              </div>

              {/* Demo Presets Row */}
              <div className="ai-preset-row">
                <span className="ai-preset-label"><ShieldCheck size={13} /> 1-Click Tests:</span>
                <button
                  type="button"
                  className="ai-preset-btn ai-preset-btn--real"
                  onClick={() => loadFakeJobPreset(PRESET_REAL_JOB)}
                >
                  ✓ Test Authentic Role (Stripe)
                </button>
                <button
                  type="button"
                  className="ai-preset-btn ai-preset-btn--fake"
                  onClick={() => loadFakeJobPreset(PRESET_FAKE_JOB)}
                >
                  ⚠ Test Fake Scam Role ($85/hr)
                </button>
              </div>

              <div className="ai-form-group">
                <label htmlFor="det-title" className="ai-label">
                  Job Title <span className="ai-label-req">*</span>
                </label>
                <input
                  id="det-title"
                  type="text"
                  className="ai-input"
                  placeholder="e.g. Senior Software Engineer"
                  value={detectorTitle}
                  onChange={(e) => setDetectorTitle(e.target.value)}
                  required
                />
              </div>

              <div className="ai-form-row">
                <div className="ai-form-group ai-form-group--half">
                  <label htmlFor="det-company" className="ai-label">Company Name</label>
                  <input
                    id="det-company"
                    type="text"
                    className="ai-input"
                    placeholder="e.g. Google, Acme"
                    value={detectorCompany}
                    onChange={(e) => setDetectorCompany(e.target.value)}
                  />
                </div>

                <div className="ai-form-group ai-form-group--half">
                  <label htmlFor="det-location" className="ai-label">Location</label>
                  <input
                    id="det-location"
                    type="text"
                    className="ai-input"
                    placeholder="e.g. Remote / New York, NY"
                    value={detectorLocation}
                    onChange={(e) => setDetectorLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="ai-form-group">
                <label htmlFor="det-desc" className="ai-label">
                  Job Description <span className="ai-label-req">*</span>
                </label>
                <textarea
                  id="det-desc"
                  className="ai-textarea"
                  rows={6}
                  placeholder="Paste the full job posting description, requirements, or responsibilities…"
                  value={detectorDescription}
                  onChange={(e) => setDetectorDescription(e.target.value)}
                  required
                />
              </div>

              {detectorError && (
                <div className="ai-alert ai-alert--error">{detectorError}</div>
              )}

              <button
                type="submit"
                className="ai-btn ai-btn--primary"
                disabled={detecting}
              >
                {detecting ? (
                  <>
                    <span className="ai-spinner" /> Running ModernBERT Classifier…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Verify Job Authenticity</span>
                  </>
                )}
              </button>
            </form>

            {/* Detection Result Box */}
            <div className="ai-card ai-resume-preview">
              <h3 className="ai-card-title">Verification Analysis</h3>

              {detecting ? (
                <div className="ai-placeholder-state">
                  <div className="ai-pulse-loader" />
                  <p className="ai-placeholder-text">Running ModernBERT Sequence Classifier…</p>
                  <span className="ai-placeholder-sub">
                    Scanning for suspicious compensation ratios, linguistic anomalies, and recruitment phishing
                  </span>
                </div>
              ) : detectorResult ? (
                <div className="ai-detector-result">
                  <div
                    className={`ai-verdict-box ${
                      detectorResult.isFake ? "ai-verdict-box--fake" : "ai-verdict-box--real"
                    }`}
                  >
                    <div className="ai-verdict-icon">
                      {detectorResult.isFake ? (
                        <AlertTriangle size={28} className="text-rose-600" />
                      ) : (
                        <CheckCircle2 size={28} className="text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="ai-verdict-title">
                        {detectorResult.isFake ? "Suspicious Listing Detected" : "Verified Authentic Listing"}
                      </h4>
                      <p className="ai-verdict-sub">
                        ModernBERT Output: <strong>{detectorResult.label}</strong> with{" "}
                        <strong>{Math.round(detectorResult.confidence * 100)}% Confidence</strong>
                      </p>
                    </div>
                  </div>

                  {/* Confidence Meter */}
                  <div className="ai-meter-group">
                    <div className="ai-meter-labels">
                      <span>Model Confidence Index</span>
                      <span>{Math.round(detectorResult.confidence * 100)}%</span>
                    </div>
                    <div className="ai-meter-track">
                      <div
                        className={`ai-meter-bar ${
                          detectorResult.isFake ? "ai-meter-bar--fake" : "ai-meter-bar--real"
                        }`}
                        style={{ width: `${Math.round(detectorResult.confidence * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Advice Card */}
                  <div className="ai-advice-card">
                    <h5 className="ai-advice-title">
                      {detectorResult.isFake ? "🚨 Cautionary Flags & Recommendations" : "💡 Security Assessment"}
                    </h5>
                    <ul className="ai-advice-list">
                      {detectorResult.isFake ? (
                        <>
                          <li>Never pay fees for background checks, equipment, or training materials.</li>
                          <li>Legitimate recruiters do not conduct hiring solely via Telegram or WhatsApp.</li>
                          <li>Watch out for unrealistic hourly rates relative to job experience.</li>
                          <li>Verify whether the company has an official registered career domain.</li>
                        </>
                      ) : (
                        <>
                          <li>Language structure and compensation expectations align with valid employer standards.</li>
                          <li>Proceed with your application safely through Swipe Select.</li>
                          <li>You can use the AI Resume Studio to generate tailored bullet points for this role!</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="ai-placeholder-state">
                  <div className="ai-placeholder-icon"><ShieldCheck size={40} className="text-emerald-500" /></div>
                  <p className="ai-placeholder-text">Awaiting input</p>
                  <span className="ai-placeholder-sub">
                    Click one of the 1-click test buttons on the left to immediately test ModernBERT.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Base Resume Preview Modal */}
      {showResumePreview && baseResume && (
        <div className="prof-modal-backdrop" onClick={() => setShowResumePreview(false)}>
          <div
            className="prof-modal-card"
            style={{ maxWidth: 840, width: "95%", height: "85vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="prof-modal-header"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileCheck size={20} className="text-emerald-600" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Base Resume Preview — {baseResume.meta.fileName}
                </h3>
              </div>
              <button
                type="button"
                className="prof-modal-close"
                onClick={() => setShowResumePreview(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, padding: 12 }}>
              <iframe
                src={baseResume.dataUrl}
                title="Base Resume PDF Preview"
                style={{ width: "100%", height: "100%", border: "1px solid #e2e8f0", borderRadius: 8 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
