import { useEffect, useState } from "react";
import {
  checkMlHealth,
  generateResume,
  predictFakeJob,
  type FakeJobPrediction,
} from "../api/ml";
import { readSession } from "../auth/storage";
import { useAuth } from "../context/AuthContext";
import "./AiToolsPage.css";

type Tab = "resume" | "detector";
type ResumeSection = "summary" | "experience" | "cover_letter";

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
  const [sectionType, setSectionType] = useState<ResumeSection>("summary");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [generatedResume, setGeneratedResume] = useState("");
  const [generatingResume, setGeneratingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [copiedResume, setCopiedResume] = useState(false);

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
  }, []);

  // Handle Resume Generation
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
      } else {
        setResumeError(res.message || "Failed to generate resume text.");
      }
    } catch {
      setResumeError("Network error or ML service offline.");
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

  // Handle Fake Job Detection
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
      setDetectorError("Network error or ML service offline.");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="ai-tools-page">
      {/* Header */}
      <div className="ai-tools-header">
        <div>
          <h1 className="ai-tools-title">AI Career Intelligence</h1>
          <p className="ai-tools-subtitle">
            Powered by fine-tuned ModernBERT & Qwen2.5-3B models running locally.
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
              ModernBERT: {healthStatus.fakeJobLoaded ? "Active" : "Offline"}
            </span>

            <span
              className={`ai-status-pill ${
                healthStatus.resumeLoaded ? "ai-status-pill--active" : "ai-status-pill--offline"
              }`}
              title="Qwen2.5-3B Instruct GGUF Model for Resume Generation"
            >
              <span className="ai-status-dot" />
              Qwen2.5: {healthStatus.resumeLoaded ? "Active" : "Offline"}
            </span>
          </div>

          <button
            type="button"
            className="ai-tools-refresh-btn"
            onClick={fetchHealth}
            disabled={checkingHealth}
            title="Refresh ML Engine Status"
          >
            {checkingHealth ? "Checking…" : "↻ Check Status"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ai-tools-tabs">
        <button
          type="button"
          className={`ai-tools-tab ${activeTab === "resume" ? "ai-tools-tab--active" : ""}`}
          onClick={() => setActiveTab("resume")}
        >
          <span className="ai-tab-icon">✨</span>
          AI Resume & Cover Letter Studio
        </button>
        <button
          type="button"
          className={`ai-tools-tab ${activeTab === "detector" ? "ai-tools-tab--active" : ""}`}
          onClick={() => setActiveTab("detector")}
        >
          <span className="ai-tab-icon">🛡️</span>
          Fake Job Authenticity Verifier
        </button>
      </div>

      {/* Tab 1: AI Resume Studio */}
      {activeTab === "resume" && (
        <div className="ai-tab-content">
          <div className="ai-resume-grid">
            {/* Form */}
            <form className="ai-card ai-resume-form" onSubmit={handleGenerateResume}>
              <h2 className="ai-card-title">Generate Tailored Content</h2>
              <p className="ai-card-desc">
                Select a section to craft. Your profile skills, work experience, and education will be
                automatically integrated.
              </p>

              <div className="ai-form-group">
                <label className="ai-label">Select Output Section</label>
                <div className="ai-pill-selector">
                  <button
                    type="button"
                    className={`ai-selector-pill ${
                      sectionType === "summary" ? "ai-selector-pill--active" : ""
                    }`}
                    onClick={() => setSectionType("summary")}
                  >
                    Professional Summary
                  </button>
                  <button
                    type="button"
                    className={`ai-selector-pill ${
                      sectionType === "experience" ? "ai-selector-pill--active" : ""
                    }`}
                    onClick={() => setSectionType("experience")}
                  >
                    Work Experience Bullets
                  </button>
                  <button
                    type="button"
                    className={`ai-selector-pill ${
                      sectionType === "cover_letter" ? "ai-selector-pill--active" : ""
                    }`}
                    onClick={() => setSectionType("cover_letter")}
                  >
                    Cover Letter
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
                  placeholder="Paste key responsibilities or requirements here to tailor keywords and skills…"
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
                    <span className="ai-spinner" /> Generating with Qwen2.5…
                  </>
                ) : (
                  "✨ Generate Section with AI"
                )}
              </button>
            </form>

            {/* Preview Box */}
            <div className="ai-card ai-resume-preview">
              <div className="ai-preview-header">
                <h3 className="ai-card-title">Generated Output</h3>
                {generatedResume && (
                  <button
                    type="button"
                    className="ai-btn ai-btn--secondary ai-btn--sm"
                    onClick={handleCopyResume}
                  >
                    {copiedResume ? "✓ Copied to Clipboard!" : "📋 Copy"}
                  </button>
                )}
              </div>

              {generatingResume ? (
                <div className="ai-placeholder-state">
                  <div className="ai-pulse-loader" />
                  <p className="ai-placeholder-text">Synthesizing content with local AI model…</p>
                  <span className="ai-placeholder-sub">
                    Analyzing profile metrics and tailoring phrasing
                  </span>
                </div>
              ) : generatedResume ? (
                <div className="ai-output-container">
                  <textarea
                    className="ai-output-textarea"
                    value={generatedResume}
                    onChange={(e) => setGeneratedResume(e.target.value)}
                    rows={14}
                  />
                  <div className="ai-output-footer">
                    <span>
                      {generatedResume.split(/\s+/).filter(Boolean).length} words •{" "}
                      {generatedResume.length} characters
                    </span>
                    <span className="ai-hint">You can edit the text directly above</span>
                  </div>
                </div>
              ) : (
                <div className="ai-placeholder-state">
                  <div className="ai-placeholder-icon">📄</div>
                  <p className="ai-placeholder-text">No content generated yet</p>
                  <span className="ai-placeholder-sub">
                    Fill out the options on the left and click "Generate Section with AI"
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Fake Job Detector */}
      {activeTab === "detector" && (
        <div className="ai-tab-content">
          <div className="ai-resume-grid">
            {/* Form */}
            <form className="ai-card ai-resume-form" onSubmit={handleDetectFakeJob}>
              <h2 className="ai-card-title">Analyze Job Authenticity</h2>
              <p className="ai-card-desc">
                Paste the details of any job posting to evaluate its authenticity with the fine-tuned
                ModernBERT classifier.
              </p>

              <div className="ai-form-group">
                <label htmlFor="det-title" className="ai-label">
                  Job Title <span className="ai-label-req">*</span>
                </label>
                <input
                  id="det-title"
                  type="text"
                  className="ai-input"
                  placeholder="e.g. Remote Data Entry Clerk"
                  value={detectorTitle}
                  onChange={(e) => setDetectorTitle(e.target.value)}
                  required
                />
              </div>

              <div className="ai-form-row">
                <div className="ai-form-group">
                  <label htmlFor="det-company" className="ai-label">
                    Company Name
                  </label>
                  <input
                    id="det-company"
                    type="text"
                    className="ai-input"
                    placeholder="e.g. Global Tech Solutions"
                    value={detectorCompany}
                    onChange={(e) => setDetectorCompany(e.target.value)}
                  />
                </div>

                <div className="ai-form-group">
                  <label htmlFor="det-location" className="ai-label">
                    Location
                  </label>
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
                    <span className="ai-spinner" /> Evaluating Authenticity…
                  </>
                ) : (
                  "🛡️ Verify Job Authenticity"
                )}
              </button>
            </form>

            {/* Detection Result */}
            <div className="ai-card ai-resume-preview">
              <h3 className="ai-card-title">Verification Analysis</h3>

              {detecting ? (
                <div className="ai-placeholder-state">
                  <div className="ai-pulse-loader" />
                  <p className="ai-placeholder-text">Running ModernBERT Sequence Classifier…</p>
                  <span className="ai-placeholder-sub">
                    Scanning for patterns, anomaly markers, and known deceptive phrasing
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
                      {detectorResult.isFake ? "⚠️" : "✓"}
                    </div>
                    <div>
                      <h4 className="ai-verdict-title">
                        {detectorResult.isFake ? "Suspicious Listing Detected" : "Verified Authentic Listing"}
                      </h4>
                      <p className="ai-verdict-sub">
                        Classification: <strong>{detectorResult.label}</strong> with{" "}
                        <strong>{Math.round(detectorResult.confidence * 100)}% confidence</strong>
                      </p>
                    </div>
                  </div>

                  {/* Confidence Meter */}
                  <div className="ai-meter-group">
                    <div className="ai-meter-labels">
                      <span>Model Confidence</span>
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
                      {detectorResult.isFake ? "🚨 Cautionary Flags" : "💡 Safe Job Search Tips"}
                    </h5>
                    <ul className="ai-advice-list">
                      {detectorResult.isFake ? (
                        <>
                          <li>Never pay fees for onboarding, equipment, or training materials.</li>
                          <li>Verify that emails originate from the official corporate domain.</li>
                          <li>Be cautious if interviews occur solely via Telegram or text messaging.</li>
                          <li>Verify the job listing on the company's official careers portal.</li>
                        </>
                      ) : (
                        <>
                          <li>This job description aligns with authentic, standard hiring postings.</li>
                          <li>Proceed with your application or save it to your matches.</li>
                          <li>You can use the AI Resume Studio to generate tailored bullet points!</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="ai-placeholder-state">
                  <div className="ai-placeholder-icon">🛡️</div>
                  <p className="ai-placeholder-text">Awaiting input</p>
                  <span className="ai-placeholder-sub">
                    Provide the job title and description on the left to verify authenticity
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
