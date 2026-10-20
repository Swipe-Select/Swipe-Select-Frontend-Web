import { useState } from "react";
import { tailorResumeWithUpload } from "../api/ml";
import { useAuth } from "../context/AuthContext";
import { readSession } from "../auth/storage";
import type { JobCard } from "../api/jobs";
import { ResumePaperTemplate } from "./ResumePaperTemplate";
import "./TailorResumeModal.css";

interface TailorResumeModalProps {
  job: JobCard | null;
  isOpen: boolean;
  onClose: () => void;
}

type TailorMode = "tailored_resume" | "experience" | "summary" | "cover_letter";
type SourceMode = "upload" | "profile" | "paste";
type EngineChoice = "ai" | "local";

export function TailorResumeModal({ job, isOpen, onClose }: TailorResumeModalProps) {
  const { session } = useAuth();
  const token = session?.token?.trim() || readSession()?.token?.trim() || "";

  const [sourceMode, setSourceMode] = useState<SourceMode>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedResume, setPastedResume] = useState("");
  const [tailorMode, setTailorMode] = useState<TailorMode>("tailored_resume");
  const [engine, setEngine] = useState<EngineChoice>("ai");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [generationMeta, setGenerationMeta] = useState<{
    engine?: string;
    extractedTextPreview?: string | null;
    extractedTextLength?: number;
  } | null>(null);
  const [activeView, setActiveView] = useState<"template" | "editor">("template");

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
      setErrorMessage(null);
      setGenerationMeta(null);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage("Please sign in to generate a tailored resume.");
      return;
    }

    if (sourceMode === "upload" && !selectedFile) {
      setErrorMessage("Please upload your resume PDF to tailor.");
      return;
    }

    if (sourceMode === "paste" && !pastedResume.trim()) {
      setErrorMessage("Please paste your resume text to tailor.");
      return;
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
          file: sourceMode === "upload" ? selectedFile : null,
          resumeText: sourceMode === "paste" ? pastedResume.trim() : "",
        },
        token,
      );

      if (res.ok && res.data) {
        setGeneratedText(res.data.generatedText);
        setGenerationMeta({
          engine: res.data.engine,
          extractedTextPreview: res.data.extractedTextPreview,
          extractedTextLength: res.data.extractedTextLength,
        });
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

  return (
    <div className="tailor-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="tailor-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="tailor-modal-header">
          <div className="tailor-modal-title-wrap">
            <span className="tailor-modal-badge">AI Resume Tailor</span>
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

            {sourceMode === "paste" && (
              <textarea
                className="tailor-textarea"
                rows={5}
                placeholder="Paste your resume sections, skills, and work experience here…"
                value={pastedResume}
                onChange={(e) => setPastedResume(e.target.value)}
              />
            )}

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
                  ? "Resume"
                  : tailorMode === "experience"
                  ? "Bullets"
                  : tailorMode === "summary"
                  ? "Summary"
                  : "Cover Letter"
              }`
            )}
          </button>

          {/* Generated Result Output */}
          {generatedText && (
            <div className="tailor-result-card">
              <div className="tailor-result-header">
                <div>
                  <h3 className="tailor-result-title">Tailored Resume Result</h3>
                  <span className="tailor-result-sub">
                    Optimized for {job.title} at {job.company}
                    {generationMeta?.extractedTextLength ? ` • ${generationMeta.extractedTextLength.toLocaleString()} characters analyzed from your resume` : ""}
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

              {/* View Switcher: Live Template vs Raw Markdown Editor */}
              <div className="tailor-view-tabs">
                <button
                  type="button"
                  className={`tailor-view-tab ${activeView === "template" ? "tailor-view-tab--active" : ""}`}
                  onClick={() => setActiveView("template")}
                >
                  📄 Live Resume Sheet (Template & PDF)
                </button>
                <button
                  type="button"
                  className={`tailor-view-tab ${activeView === "editor" ? "tailor-view-tab--active" : ""}`}
                  onClick={() => setActiveView("editor")}
                >
                  📝 Raw Markdown / Text
                </button>
              </div>

              {activeView === "template" ? (
                <ResumePaperTemplate
                  rawMarkdown={generatedText}
                  targetJobTitle={job.title}
                  targetCompany={job.company}
                  onTextChange={setGeneratedText}
                />
              ) : (
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
