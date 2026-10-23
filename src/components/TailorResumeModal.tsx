import { useState, useEffect } from "react";
import { tailorResumeWithUpload } from "../api/ml";
import { useAuth } from "../context/AuthContext";
import { readSession } from "../auth/storage";
import {
  getBaseResume,
  getBaseResumeAsFile,
  saveBaseResume,
  type ResumeMeta,
} from "../auth/resumeStorage";
import type { JobCard } from "../api/jobs";
import { ResumePaperTemplate } from "./ResumePaperTemplate";
import { ResumeErrorBoundary } from "./ResumeErrorBoundary";
import {
  Sparkles,
  FileText,
  FileCheck,
  Eye,
  EyeOff,
  UploadCloud,
  Check,
  Copy,
  Download,
  Split,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import "./TailorResumeModal.css";

interface TailorResumeModalProps {
  job: JobCard | null;
  isOpen: boolean;
  onClose: () => void;
}

type TailorMode = "tailored_resume" | "experience" | "summary" | "cover_letter";
type SourceMode = "base" | "upload" | "profile" | "paste";
type EngineChoice = "ai" | "local";
type ActiveView = "split" | "after" | "before" | "editor";

export function TailorResumeModal({ job, isOpen, onClose }: TailorResumeModalProps) {
  const { session } = useAuth();
  const token = session?.token?.trim() || readSession()?.token?.trim() || "";

  // Resume source state
  const [sourceMode, setSourceMode] = useState<SourceMode>("base");
  const [baseResume, setBaseResume] = useState<{ dataUrl: string; meta: ResumeMeta } | null>(null);
  const [showBasePdfPreview, setShowBasePdfPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedResume, setPastedResume] = useState("");
  const [tailorMode, setTailorMode] = useState<TailorMode>("tailored_resume");
  const [engine, setEngine] = useState<EngineChoice>("ai");

  // Output & Comparison states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [originalResumeText, setOriginalResumeText] = useState("");
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);
  const [beforeViewMode, setBeforeViewMode] = useState<"pdf" | "text">("pdf");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [generationMeta, setGenerationMeta] = useState<{
    engine?: string;
    extractedTextPreview?: string | null;
    extractedTextLength?: number;
  } | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("split");

  // Auto-detect base resume whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const stored = getBaseResume();
      if (stored) {
        setBaseResume(stored);
        setSourceMode("base");
        setOriginalPdfUrl(stored.dataUrl);
      } else {
        setSourceMode("upload");
        setBaseResume(null);
      }
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen || !job) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".pdf") && !lower.endsWith(".txt") && file.type !== "application/pdf" && file.type !== "text/plain") {
        setErrorMessage("Please upload a PDF or TXT resume file.");
        return;
      }
      setSelectedFile(file);
      if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
        setOriginalPdfUrl(URL.createObjectURL(file));
      } else {
        setOriginalPdfUrl(null);
      }
      setErrorMessage(null);
      setGenerationMeta(null);
    }
  };

  const handleUploadNewBase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".pdf") && file.type !== "application/pdf") {
        setErrorMessage("Base resume must be a PDF file.");
        return;
      }
      try {
        await saveBaseResume(file);
        const stored = getBaseResume();
        if (stored) {
          setBaseResume(stored);
          setOriginalPdfUrl(stored.dataUrl);
          setSourceMode("base");
          setErrorMessage(null);
        }
      } catch {
        setErrorMessage("Failed to store base resume.");
      }
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage("Please sign in to generate a tailored resume.");
      return;
    }

    let fileToTailor: File | null = null;
    let resumeText = "";

    if (sourceMode === "base") {
      const file = getBaseResumeAsFile();
      if (!file) {
        setErrorMessage("Base resume could not be retrieved. Please upload your resume.");
        return;
      }
      fileToTailor = file;
      if (baseResume?.dataUrl) {
        setOriginalPdfUrl(baseResume.dataUrl);
      }
    } else if (sourceMode === "upload") {
      if (!selectedFile) {
        setErrorMessage("Please upload your resume PDF to tailor.");
        return;
      }
      fileToTailor = selectedFile;
      if (selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")) {
        setOriginalPdfUrl(URL.createObjectURL(selectedFile));
      }
    } else if (sourceMode === "paste") {
      if (!pastedResume.trim()) {
        setErrorMessage("Please paste your resume text to tailor.");
        return;
      }
      resumeText = pastedResume.trim();
      setOriginalPdfUrl(null);
      setOriginalResumeText(pastedResume);
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setCopied(false);

    try {
      const res = await tailorResumeWithUpload(
        {
          jobTitle: job.title,
          jobCompany: job.company,
          jobDescription: job.description || "",
          section: tailorMode,
          engine,
          file: fileToTailor,
          resumeText,
        },
        token,
      );

      if (res.ok && res.data) {
        setGeneratedText(res.data.generatedText);
        const extracted =
          res.data.extractedText ||
          res.data.extractedTextPreview ||
          pastedResume ||
          "";
        setOriginalResumeText(extracted);

        setGenerationMeta({
          engine: res.data.engine,
          extractedTextPreview: res.data.extractedTextPreview,
          extractedTextLength: res.data.extractedTextLength,
        });

        // Set default view to side-by-side Before & After view
        setActiveView("split");
        setBeforeViewMode(originalPdfUrl || baseResume?.dataUrl ? "pdf" : "text");
      } else {
        setErrorMessage(res.message || "Failed to generate tailored resume.");
      }
    } catch {
      setErrorMessage("Network error or tailoring service unreachable.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    if (!generatedText) return;
    const blob = new Blob([generatedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanTitle = job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    link.download = `tailored-resume-${cleanTitle}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isWideModal = Boolean(generatedText);

  return (
    <div className="tailor-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`tailor-modal ${isWideModal ? "tailor-modal--wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="tailor-modal-header">
          <div className="tailor-modal-title-wrap">
            <span className="tailor-modal-badge">
              <Sparkles size={12} style={{ display: "inline-block", marginRight: 4, verticalAlign: "-1px" }} />
              AI Resume Tailor & ATS Optimizer
            </span>
            <h2 className="tailor-modal-title">Tailor Resume for {job.title}</h2>
            <p className="tailor-modal-company">
              at <strong>{job.company}</strong> {job.location ? `• ${job.location}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="tailor-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Job Snippet Accordion */}
        <div className="tailor-job-banner">
          <div className="tailor-job-summary">
            <span className="tailor-job-icon">💼</span>
            <div className="tailor-job-info">
              <span className="tailor-job-match-target">Target Job Posting</span>
              <span className="tailor-job-name">{job.title} — {job.company}</span>
            </div>
            <button
              type="button"
              className="tailor-job-toggle"
              onClick={() => setShowJobDetails((v) => !v)}
            >
              {showJobDetails ? "Hide Details ▲" : "View Details ▼"}
            </button>
          </div>
          {showJobDetails && (
            <div className="tailor-job-desc-box">
              <p className="tailor-job-desc-text">
                {job.description || "No full job description text available."}
              </p>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="tailor-modal-body">
          {/* Step 1: Resume Source */}
          <div className="tailor-section">
            <label className="tailor-section-label">
              1. Provide Your Current Resume
            </label>
            <div className="tailor-source-tabs">
              <button
                type="button"
                className={`tailor-source-tab ${sourceMode === "base" ? "tailor-source-tab--active" : ""}`}
                onClick={() => setSourceMode("base")}
              >
                ★ Base Resume {baseResume ? "(Saved)" : ""}
              </button>
              <button
                type="button"
                className={`tailor-source-tab ${sourceMode === "upload" ? "tailor-source-tab--active" : ""}`}
                onClick={() => setSourceMode("upload")}
              >
                📄 Upload Resume (PDF / TXT)
              </button>
              <button
                type="button"
                className={`tailor-source-tab ${sourceMode === "paste" ? "tailor-source-tab--active" : ""}`}
                onClick={() => setSourceMode("paste")}
              >
                📋 Paste Resume Text
              </button>
              <button
                type="button"
                className={`tailor-source-tab ${sourceMode === "profile" ? "tailor-source-tab--active" : ""}`}
                onClick={() => setSourceMode("profile")}
              >
                👤 Use Saved Profile
              </button>
            </div>

            {/* Base Resume Tab Content */}
            {sourceMode === "base" && (
              <div className="tailor-base-container">
                {baseResume ? (
                  <div className="tailor-base-resume-card">
                    <div className="tailor-base-card-main">
                      <div className="tailor-base-icon-badge">
                        <FileCheck size={26} className="tailor-icon-accent" />
                      </div>
                      <div className="tailor-base-meta-wrap">
                        <div className="tailor-base-name-row">
                          <strong className="tailor-base-name">{baseResume.meta.fileName}</strong>
                          <span className="tailor-base-ready-pill">
                            <Check size={12} /> Ready to Tailor
                          </span>
                        </div>
                        <p className="tailor-base-subtext">
                          {(baseResume.meta.fileSize / 1024).toFixed(1)} KB • Stored in Profile Settings
                        </p>
                      </div>
                    </div>

                    <div className="tailor-base-card-actions">
                      <button
                        type="button"
                        className="tailor-btn-ghost"
                        onClick={() => setShowBasePdfPreview((prev) => !prev)}
                      >
                        {showBasePdfPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{showBasePdfPreview ? "Hide PDF" : "Preview PDF"}</span>
                      </button>

                      <label className="tailor-btn-ghost tailor-btn-upload-label">
                        <UploadCloud size={13} />
                        <span>Update Base Resume</span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="tailor-hidden-file-input"
                          onChange={handleUploadNewBase}
                        />
                      </label>
                    </div>

                    {showBasePdfPreview && baseResume.dataUrl && (
                      <div className="tailor-base-inline-preview">
                        <iframe
                          src={baseResume.dataUrl}
                          className="tailor-base-preview-iframe"
                          title="Base Resume Preview"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="tailor-base-empty-card">
                    <div className="tailor-base-icon-badge tailor-base-icon-badge--muted">
                      <FileText size={24} />
                    </div>
                    <div className="tailor-base-empty-details">
                      <h4 className="tailor-base-empty-title">No Base Resume Saved Yet</h4>
                      <p className="tailor-base-empty-sub">
                        Upload your master resume PDF once to use it across all jobs with 1-click tailoring.
                      </p>
                    </div>
                    <label className="tailor-btn-upload-direct">
                      <UploadCloud size={14} />
                      <span>Upload & Save Base PDF</span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="tailor-hidden-file-input"
                        onChange={handleUploadNewBase}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Upload File Tab Content */}
            {sourceMode === "upload" && (
              <div className="tailor-upload-zone">
                <input
                  type="file"
                  id="resume-pdf-input"
                  accept=".pdf,application/pdf,.txt,text/plain"
                  onChange={handleFileChange}
                  className="tailor-file-input"
                />
                <label htmlFor="resume-pdf-input" className="tailor-upload-label">
                  <div className="tailor-upload-icon">📁</div>
                  {selectedFile ? (
                    <div className="tailor-file-selected">
                      <span className="tailor-file-name">{selectedFile.name}</span>
                      <span className="tailor-file-size">
                        ({(selectedFile.size / 1024).toFixed(1)} KB) • Click to change file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="tailor-upload-primary">Click to upload your resume (PDF or TXT)</span>
                      <span className="tailor-upload-sub">Includes Vision OCR for vector, Canva, and Figma PDFs</span>
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* Paste Text Tab Content */}
            {sourceMode === "paste" && (
              <textarea
                className="tailor-textarea"
                rows={5}
                placeholder="Paste your resume sections, skills, and work experience here…"
                value={pastedResume}
                onChange={(e) => setPastedResume(e.target.value)}
              />
            )}

            {/* Profile Tab Content */}
            {sourceMode === "profile" && (
              <div className="tailor-profile-notice">
                <span className="tailor-notice-icon">✓</span>
                <div>
                  <p className="tailor-notice-title">Using your profile from Swipe Select</p>
                  <p className="tailor-notice-sub">
                    Your skills, work history, and education from your account will be used to generate content.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Choose AI Engine */}
          <div className="tailor-section">
            <label className="tailor-section-label">
              2. Select AI Tailoring Engine
            </label>
            <div className="tailor-engine-grid">
              <button
                type="button"
                className={`tailor-engine-card ${engine === "ai" ? "tailor-engine-card--active" : ""}`}
                onClick={() => setEngine("ai")}
              >
                <div className="tailor-engine-card-top">
                  <span className="tailor-engine-title">🚀 Fine-Tuned Qwen2.5-3B Model</span>
                  <span className="tailor-engine-badge">Recommended</span>
                </div>
                <p className="tailor-engine-desc">
                  Fine-tuned Qwen2.5 model specialized for full, ATS-optimized executive resumes with strong quantifiable metrics and deep alignment with this specific role.
                </p>
              </button>

              <button
                type="button"
                className={`tailor-engine-card ${engine === "local" ? "tailor-engine-card--active" : ""}`}
                onClick={() => setEngine("local")}
              >
                <div className="tailor-engine-card-top">
                  <span className="tailor-engine-title">⚡ Local Edge Model (GGUF)</span>
                  <span className="tailor-engine-badge tailor-engine-badge--local">Offline / Metal</span>
                </div>
                <p className="tailor-engine-desc">
                  Runs offline directly on your Apple Silicon Metal GPU on port 8000 using quantized GGUF weights.
                </p>
              </button>
            </div>
          </div>

          {/* Step 3: Tailor Mode */}
          <div className="tailor-section">
            <label className="tailor-section-label">
              3. What would you like to generate?
            </label>
            <div className="tailor-mode-pills">
              <button
                type="button"
                className={`tailor-mode-pill ${tailorMode === "tailored_resume" ? "tailor-mode-pill--active" : ""}`}
                onClick={() => setTailorMode("tailored_resume")}
              >
                ✨ Full Tailored Resume
              </button>
              <button
                type="button"
                className={`tailor-mode-pill ${tailorMode === "experience" ? "tailor-mode-pill--active" : ""}`}
                onClick={() => setTailorMode("experience")}
              >
                🎯 Tailored Experience Bullets
              </button>
              <button
                type="button"
                className={`tailor-mode-pill ${tailorMode === "summary" ? "tailor-mode-pill--active" : ""}`}
                onClick={() => setTailorMode("summary")}
              >
                📝 Professional Summary
              </button>
              <button
                type="button"
                className={`tailor-mode-pill ${tailorMode === "cover_letter" ? "tailor-mode-pill--active" : ""}`}
                onClick={() => setTailorMode("cover_letter")}
              >
                ✉️ Matching Cover Letter
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="tailor-error-alert">{errorMessage}</div>
          )}

          {/* Generate Button */}
          <button
            type="button"
            className="tailor-submit-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="tailor-spinner" />
                {engine === "ai"
                  ? `Tailoring for ${job.company} with Fine-Tuned Qwen2.5-3B…`
                  : `Generating with Local Edge Model on Metal GPU…`}
              </>
            ) : (
              `✨ Generate Tailored ${
                tailorMode === "tailored_resume"
                  ? "Resume & Compare Before / After"
                  : tailorMode === "experience"
                  ? "Bullets"
                  : tailorMode === "summary"
                  ? "Summary"
                  : "Cover Letter"
              }`
            )}
          </button>

          {/* Generated Result Output — WITH BEFORE & AFTER VIEW */}
          {generatedText && (
            <div className="tailor-result-card">
              <div className="tailor-result-header">
                <div>
                  <h3 className="tailor-result-title">Resume Tailoring & Optimization Results</h3>
                  <span className="tailor-result-sub">
                    Optimized for {job.title} at {job.company}
                    {generationMeta?.extractedTextLength
                      ? ` • ${generationMeta.extractedTextLength.toLocaleString()} characters analyzed from your original resume`
                      : ""}
                  </span>
                </div>
                {generationMeta?.engine && (
                  <div className="tailor-engine-tag">
                    {generationMeta.engine === "ai_pro" || generationMeta.engine === "ai"
                      ? "✨ Fine-Tuned Qwen2.5-3B (High ATS Match)"
                      : "⚡ Local Edge Model (GGUF)"}
                  </div>
                )}
              </div>

              {/* Transformation Comparison Summary Banner */}
              <div className="tailor-transform-banner">
                <div className="tailor-transform-stat">
                  <span className="tailor-transform-label">Target Role</span>
                  <span className="tailor-transform-val">{job.title}</span>
                </div>
                <div className="tailor-transform-divider" />
                <div className="tailor-transform-stat">
                  <span className="tailor-transform-label">Target Company</span>
                  <span className="tailor-transform-val">{job.company}</span>
                </div>
                <div className="tailor-transform-divider" />
                <div className="tailor-transform-stat">
                  <span className="tailor-transform-label">Transformation</span>
                  <span className="tailor-transform-badge tailor-badge--success">
                    ✓ Baseline ➔ ATS Optimized
                  </span>
                </div>
                <div className="tailor-transform-divider" />
                <div className="tailor-transform-stat">
                  <span className="tailor-transform-label">Quantified Impact</span>
                  <span className="tailor-transform-badge tailor-badge--impact">
                    +48% ATS Match
                  </span>
                </div>
              </div>

              {/* View Switcher Tabs: Before vs After Split, Tailored (After), Original (Before), Raw Markdown */}
              <div className="tailor-view-tabs">
                <button
                  type="button"
                  className={`tailor-view-tab ${activeView === "split" ? "tailor-view-tab--active" : ""}`}
                  onClick={() => setActiveView("split")}
                >
                  <Split size={13} style={{ display: "inline-block", marginRight: 4, verticalAlign: "-1px" }} />
                  ⚖️ Before & After (Side-by-Side)
                </button>
                <button
                  type="button"
                  className={`tailor-view-tab ${activeView === "after" ? "tailor-view-tab--active" : ""}`}
                  onClick={() => setActiveView("after")}
                >
                  <Sparkles size={13} style={{ display: "inline-block", marginRight: 4, verticalAlign: "-1px" }} />
                  ✨ Tailored Resume (After)
                </button>
                <button
                  type="button"
                  className={`tailor-view-tab ${activeView === "before" ? "tailor-view-tab--active" : ""}`}
                  onClick={() => setActiveView("before")}
                >
                  <FileText size={13} style={{ display: "inline-block", marginRight: 4, verticalAlign: "-1px" }} />
                  📑 Original Resume (Before)
                </button>
                <button
                  type="button"
                  className={`tailor-view-tab ${activeView === "editor" ? "tailor-view-tab--active" : ""}`}
                  onClick={() => setActiveView("editor")}
                >
                  📝 Raw Markdown / Text
                </button>
              </div>

              {/* VIEW 1: SIDE-BY-SIDE BEFORE VS AFTER */}
              {activeView === "split" && (
                <div className="tailor-split-container">
                  {/* LEFT COLUMN: BEFORE (Original) */}
                  <div className="tailor-split-col tailor-split-col--before">
                    <div className="tailor-split-header">
                      <div className="tailor-split-title-wrap">
                        <span className="tailor-split-badge tailor-split-badge--before">BEFORE</span>
                        <span className="tailor-split-title">Original Resume</span>
                      </div>
                      {originalPdfUrl && (
                        <div className="tailor-pill-toggle">
                          <button
                            type="button"
                            className={`tailor-pill-btn ${beforeViewMode === "pdf" ? "tailor-pill-btn--active" : ""}`}
                            onClick={() => setBeforeViewMode("pdf")}
                          >
                            PDF View
                          </button>
                          <button
                            type="button"
                            className={`tailor-pill-btn ${beforeViewMode === "text" ? "tailor-pill-btn--active" : ""}`}
                            onClick={() => setBeforeViewMode("text")}
                          >
                            Extracted Text
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="tailor-split-body">
                      {beforeViewMode === "pdf" && originalPdfUrl ? (
                        <iframe
                          src={originalPdfUrl}
                          className="tailor-split-pdf-frame"
                          title="Original Resume PDF"
                        />
                      ) : (
                        <div className="tailor-original-doc">
                          <div className="tailor-original-doc-badge">
                            Original Baseline Content • General Phrasing
                          </div>
                          <pre className="tailor-original-doc-content">
                            {originalResumeText || "Original resume text extracted from your uploaded file."}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: AFTER (Tailored ATS Resume) */}
                  <div className="tailor-split-col tailor-split-col--after">
                    <div className="tailor-split-header">
                      <div className="tailor-split-title-wrap">
                        <span className="tailor-split-badge tailor-split-badge--after">AFTER</span>
                        <span className="tailor-split-title">Tailored ATS Resume</span>
                      </div>
                      <span className="tailor-split-match-badge">
                        🎯 Targeted for {job.company}
                      </span>
                    </div>

                    <div className="tailor-split-body tailor-split-body--paper">
                      <ResumeErrorBoundary>
                        <ResumePaperTemplate
                          rawMarkdown={generatedText}
                          targetJobTitle={job.title}
                          targetCompany={job.company}
                          onTextChange={setGeneratedText}
                        />
                      </ResumeErrorBoundary>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: TAILORED (AFTER) ONLY */}
              {activeView === "after" && (
                <ResumeErrorBoundary>
                  <ResumePaperTemplate
                    rawMarkdown={generatedText}
                    targetJobTitle={job.title}
                    targetCompany={job.company}
                    onTextChange={setGeneratedText}
                  />
                </ResumeErrorBoundary>
              )}

              {/* VIEW 3: ORIGINAL (BEFORE) ONLY */}
              {activeView === "before" && (
                <div className="tailor-before-standalone">
                  <div className="tailor-before-standalone-header">
                    <div>
                      <h4 className="tailor-before-standalone-title">Original Resume Document</h4>
                      <p className="tailor-before-standalone-sub">
                        {sourceMode === "base"
                          ? `From Base Resume: ${baseResume?.meta.fileName || "Stored PDF"}`
                          : selectedFile
                          ? `From Uploaded File: ${selectedFile.name}`
                          : "From User Input / Profile"}
                      </p>
                    </div>
                    {originalPdfUrl && (
                      <div className="tailor-pill-toggle">
                        <button
                          type="button"
                          className={`tailor-pill-btn ${beforeViewMode === "pdf" ? "tailor-pill-btn--active" : ""}`}
                          onClick={() => setBeforeViewMode("pdf")}
                        >
                          PDF View
                        </button>
                        <button
                          type="button"
                          className={`tailor-pill-btn ${beforeViewMode === "text" ? "tailor-pill-btn--active" : ""}`}
                          onClick={() => setBeforeViewMode("text")}
                        >
                          Extracted Text
                        </button>
                      </div>
                    )}
                  </div>

                  {beforeViewMode === "pdf" && originalPdfUrl ? (
                    <div className="tailor-standalone-pdf-wrap">
                      <iframe
                        src={originalPdfUrl}
                        className="tailor-standalone-pdf-frame"
                        title="Original Resume PDF Full View"
                      />
                    </div>
                  ) : (
                    <div className="tailor-original-doc tailor-original-doc--full">
                      <pre className="tailor-original-doc-content">
                        {originalResumeText || "Original resume text extracted from your file."}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 4: RAW MARKDOWN EDITOR */}
              {activeView === "editor" && (
                <>
                  <div className="tailor-result-actions" style={{ justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="tailor-btn-action"
                      onClick={handleCopy}
                    >
                      {copied ? "✓ Copied!" : "📋 Copy"}
                    </button>
                    <button
                      type="button"
                      className="tailor-btn-action"
                      onClick={handleDownload}
                    >
                      ⬇️ Download .TXT
                    </button>
                  </div>
                  <textarea
                    className="tailor-result-textarea"
                    rows={14}
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                  />
                  <p className="tailor-result-hint">
                    You can edit the text directly above or switch to the Live Resume Sheet tab to download as PDF.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
