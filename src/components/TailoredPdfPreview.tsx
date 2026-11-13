import React, { useEffect, useMemo, useState } from "react";
import { Download, BookmarkCheck, Check, FileText, ChevronDown, ChevronUp, FileCheck2 } from "lucide-react";
import type { PdfBlockChange, PdfPagePreview } from "../api/ml";
import { saveBaseResume } from "../auth/resumeStorage";
import { ResumePaperTemplate } from "./ResumePaperTemplate";
import { ResumeErrorBoundary } from "./ResumeErrorBoundary";

interface TailoredPdfPreviewProps {
  pdfBase64: string;
  pagePreviews?: PdfPagePreview[];
  filename?: string;
  blocksModified?: number;
  changes?: PdfBlockChange[];
  onSwitchToPaper?: () => void;
  onSavedAsBaseResume?: () => void;
}

function base64ToPdfBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: "application/pdf" });
}

/**
 * Renders the in-place edited PDF binary inside an iframe while preserving
 * the original resume template design, plus download, save-as-base, and a
 * collapsible section diff summary.
 */
export const TailoredPdfPreview: React.FC<TailoredPdfPreviewProps> = ({
  pdfBase64,
  pagePreviews = [],
  filename = "tailored-resume.pdf",
  blocksModified,
  changes = [],
  onSwitchToPaper,
  onSavedAsBaseResume,
}) => {
  const [savedBase, setSavedBase] = useState(false);
  const [savingBase, setSavingBase] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  const pdfBlob = useMemo(() => base64ToPdfBlob(pdfBase64), [pdfBase64]);
  const [blobUrl, setBlobUrl] = useState<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(pdfBlob);
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pdfBlob]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAsBase = async () => {
    setSavingBase(true);
    try {
      const file = new File([pdfBlob], filename, { type: "application/pdf" });
      await saveBaseResume(file);
      onSavedAsBaseResume?.();
      setSavedBase(true);
      setTimeout(() => setSavedBase(false), 3000);
    } catch {
      // Non-critical storage error
    } finally {
      setSavingBase(false);
    }
  };

  const editedCount = blocksModified ?? changes.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
      <div
        className="resume-toolbar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "8px 12px",
          background: "#f8fafc",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#0f766e",
              background: "#ccfbf1",
              padding: "3px 9px",
              borderRadius: "999px",
            }}
          >
            Your original PDF · {editedCount} block{editedCount === 1 ? "" : "s"} updated
          </span>
          {changes.length > 0 && (
            <button
              type="button"
              className="resume-tool-btn"
              onClick={() => setShowChanges((v) => !v)}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              {showChanges ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              What Changed ({changes.length})
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {onSwitchToPaper && (
            <button
              type="button"
              className="resume-tool-btn"
              onClick={onSwitchToPaper}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <FileText size={14} />
              ATS Paper View
            </button>
          )}
          <button
            type="button"
            className="resume-tool-btn resume-tool-btn--accent"
            onClick={handleSaveAsBase}
            disabled={savingBase}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            {savedBase ? <Check size={14} /> : <BookmarkCheck size={14} />}
            {savedBase ? "Saved as Base" : savingBase ? "Saving..." : "Save as Base"}
          </button>
          <button
            type="button"
            className="resume-tool-btn resume-tool-btn--primary"
            onClick={handleDownload}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      {showChanges && changes.length > 0 && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            padding: "10px 12px",
            maxHeight: "220px",
            overflowY: "auto",
            fontSize: "0.78rem",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {changes.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px 10px",
              }}
            >
              <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
                {c.section || c.id}
              </div>
              <div style={{ color: "#991b1b", background: "#fef2f2", padding: "4px 6px", borderRadius: "4px", marginBottom: "4px" }}>
                <strong>Before:</strong> {c.before}
              </div>
              <div style={{ color: "#065f46", background: "#ecfdf5", padding: "4px 6px", borderRadius: "4px" }}>
                <strong>After:</strong> {c.after}
              </div>
            </div>
          ))}
        </div>
      )}

      {pagePreviews.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {pagePreviews.map((page, index) => (
            <img
              key={`page-${index}`}
              src={`data:image/jpeg;base64,${page.image}`}
              alt={`Updated resume page ${index + 1}`}
              style={{
                width: "100%",
                height: "auto",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            />
          ))}
        </div>
      )}

      {blobUrl && pagePreviews.length === 0 && (
        <iframe
          src={blobUrl}
          title="Tailored Resume PDF"
          className="tailor-split-pdf-frame"
          style={{ minHeight: "680px", width: "100%" }}
        />
      )}
      {blobUrl && pagePreviews.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", fontSize: "0.82rem", fontWeight: 650, color: "#0f766e" }}>
            Open the PDF file
          </summary>
          <iframe
            src={blobUrl}
            title="Tailored Resume PDF"
            className="tailor-split-pdf-frame"
            style={{ minHeight: "680px", width: "100%", marginTop: "8px" }}
          />
        </details>
      )}
    </div>
  );
};

interface TailoredResultPaneProps {
  pdfBase64: string | null;
  pagePreviews?: PdfPagePreview[];
  viewMode: "pdf" | "paper";
  onViewModeChange: (mode: "pdf" | "paper") => void;
  blocksModified?: number;
  changes?: PdfBlockChange[];
  filename?: string;
  rawMarkdown: string;
  targetJobTitle: string;
  targetCompany?: string;
  candidateName?: string;
  candidateEmail?: string;
  onTextChange: (next: string) => void;
  onSavedAsBaseResume?: () => void;
}

/**
 * Shared result renderer that prefers the in-place edited original PDF when available,
 * with a clean toggle to the editable ATS paper fallback.
 */
export const TailoredResultPane: React.FC<TailoredResultPaneProps> = ({
  pdfBase64,
  pagePreviews,
  viewMode,
  onViewModeChange,
  blocksModified,
  changes,
  filename,
  rawMarkdown,
  targetJobTitle,
  targetCompany,
  candidateName,
  candidateEmail,
  onTextChange,
  onSavedAsBaseResume,
}) => {
  if (pdfBase64 && viewMode === "pdf") {
    return (
      <TailoredPdfPreview
        pdfBase64={pdfBase64}
        pagePreviews={pagePreviews}
        filename={filename}
        blocksModified={blocksModified}
        changes={changes}
        onSwitchToPaper={() => onViewModeChange("paper")}
        onSavedAsBaseResume={onSavedAsBaseResume}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
      {pdfBase64 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="resume-tool-btn resume-tool-btn--primary"
            onClick={() => onViewModeChange("pdf")}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <FileCheck2 size={14} />
            Preview your updated PDF
          </button>
        </div>
      )}
      <ResumeErrorBoundary>
        <ResumePaperTemplate
          rawMarkdown={rawMarkdown}
          targetJobTitle={targetJobTitle}
          targetCompany={targetCompany}
          candidateName={candidateName}
          candidateEmail={candidateEmail}
          onTextChange={onTextChange}
          onSavedAsBaseResume={onSavedAsBaseResume}
        />
      </ResumeErrorBoundary>
    </div>
  );
};
