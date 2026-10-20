import { useRef, useState, useEffect } from "react";
import { exportElementToPdf } from "../utils/pdfExport";
import "./ResumePaperTemplate.css";

export interface ResumePaperProps {
  rawMarkdown: string;
  targetJobTitle?: string;
  targetCompany?: string;
  onTextChange?: (newText: string) => void;
}

export function ResumePaperTemplate({
  rawMarkdown,
  targetJobTitle,
  targetCompany,
}: ResumePaperProps) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editable fields with default values from user profile & generated text
  const [name, setName] = useState("Muhammad Sameer Shahid");
  const [contactInfo, setContactInfo] = useState(
    "📍 Lahore, Punjab, Pakistan • ✉ sp23-bse-128@cuilahore.edu.pk • 📱 03324292913 • 💼 in/sameershahid-a05602274 • 🐙 github.com/X-SAMEER-SHAHID/"
  );
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState<Array<{ category: string; content: string }>>([]);
  const [experience, setExperience] = useState<
    Array<{ role: string; company: string; date: string; bullets: string[] }>
  >([]);
  const [projects, setProjects] = useState<
    Array<{ title: string; subtitle: string; bullets: string[] }>
  >([]);
  const [education, setEducation] = useState<
    Array<{ degree: string; institution: string; date: string }>
  >([]);

  // Parse markdown into template sections whenever rawMarkdown changes
  useEffect(() => {
    if (!rawMarkdown) return;

    // 1. Try to extract name from top heading
    const nameMatch = rawMarkdown.match(/#\s*(?:TAILORED\s*RESUME:\s*)?([^\n\r#]+)/i);
    if (nameMatch && nameMatch[1].trim()) {
      const cleanName = nameMatch[1].replace(/[*#]/g, "").trim();
      if (cleanName && cleanName.length < 50) setName(cleanName);
    }

    // 2. Parse sections by headers (### or ##)
    const sections = rawMarkdown.split(/\n#{2,3}\s+/);
    let parsedSummary = "";
    const parsedSkills: Array<{ category: string; content: string }> = [];
    const parsedExperience: Array<{
      role: string;
      company: string;
      date: string;
      bullets: string[];
    }> = [];
    const parsedProjects: Array<{
      title: string;
      subtitle: string;
      bullets: string[];
    }> = [];
    const parsedEducation: Array<{ degree: string; institution: string; date: string }> = [];

    for (const sec of sections) {
      const trimmed = sec.trim();
      if (!trimmed) continue;

      const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
      const header = lines[0]?.toUpperCase() || "";

      if (header.includes("SUMMARY") || header.includes("PROFESSIONAL SUMMARY")) {
        parsedSummary = lines
          .slice(1)
          .filter((l) => !l.startsWith("---") && !l.startsWith("#"))
          .join(" ")
          .replace(/[*_]/g, "");
      } else if (header.includes("COMPETENCIES") || header.includes("SKILLS") || header.includes("EXPERTISE")) {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("---")) continue;
          const colonMatch = line.match(/^[-*•]?\s*\*\*([^*]+)\*\*[:\s]*(.*)/);
          if (colonMatch) {
            parsedSkills.push({
              category: colonMatch[1].trim(),
              content: colonMatch[2].trim(),
            });
          } else {
            const clean = line.replace(/^[-*•]\s*/, "").replace(/[*_]/g, "");
            if (clean) parsedSkills.push({ category: "Skills", content: clean });
          }
        }
      } else if (header.includes("EXPERIENCE") || header.includes("WORK HISTORY")) {
        let currentExp: {
          role: string;
          company: string;
          date: string;
          bullets: string[];
        } | null = null;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("---")) continue;

          // Check if line represents a job title & company
          // e.g. **Member | RAS** or **Software Engineer Intern | Team Tech Studio**
          const jobHeader = line.match(/^\*\*([^*|]+)(?:\||\bat\b)\s*([^*]+)\*\*/i);
          if (jobHeader) {
            if (currentExp) parsedExperience.push(currentExp);
            currentExp = {
              role: jobHeader[1].trim(),
              company: jobHeader[2].trim(),
              date: "Recent",
              bullets: [],
            };
            continue;
          }

          // Check date/location line: *January 2025 – Present | Lahore, Punjab*
          const dateMatch = line.match(/^\*([^*]+)\*$/);
          if (dateMatch && currentExp) {
            currentExp.date = dateMatch[1].trim();
            continue;
          }

          // Bullet points
          if (line.startsWith("*") || line.startsWith("-") || line.startsWith("•")) {
            const cleanBullet = line.replace(/^[-*•]\s*/, "").replace(/[*_]/g, "").trim();
            if (cleanBullet && currentExp) {
              currentExp.bullets.push(cleanBullet);
            }
          }
        }
        if (currentExp) parsedExperience.push(currentExp);
      } else if (header.includes("PROJECT")) {
        let currentProj: { title: string; subtitle: string; bullets: string[] } | null = null;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("---")) continue;

          const projHeader = line.match(/^\*\*([^*|]+)(?:\||\b[-–]\b)?\s*([^*]*)\*\*/);
          if (projHeader) {
            if (currentProj) parsedProjects.push(currentProj);
            currentProj = {
              title: projHeader[1].trim(),
              subtitle: projHeader[2]?.trim() || "",
              bullets: [],
            };
            continue;
          }

          if (line.startsWith("*") || line.startsWith("-") || line.startsWith("•")) {
            const cleanBullet = line.replace(/^[-*•]\s*/, "").replace(/[*_]/g, "").trim();
            if (cleanBullet && currentProj) {
              currentProj.bullets.push(cleanBullet);
            }
          }
        }
        if (currentProj) parsedProjects.push(currentProj);
      } else if (header.includes("EDUCATION") || header.includes("CREDENTIALS")) {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("---")) continue;
          const degMatch = line.match(/^\*\*([^*]+)\*\*/);
          if (degMatch) {
            const nextLine = lines[i + 1] || "";
            parsedEducation.push({
              degree: degMatch[1].trim(),
              institution: nextLine.replace(/[*_]/g, "").trim(),
              date: "",
            });
            i++;
          }
        }
      }
    }

    if (parsedSummary) setSummary(parsedSummary);
    if (parsedSkills.length > 0) setSkills(parsedSkills);
    if (parsedExperience.length > 0) setExperience(parsedExperience);
    if (parsedProjects.length > 0) setProjects(parsedProjects);
    if (parsedEducation.length > 0) setEducation(parsedEducation);

    // If summary was empty but we have raw text, use it
    if (!parsedSummary && rawMarkdown) {
      setSummary(rawMarkdown.replace(/[#*_-]/g, "").slice(0, 400));
    }
  }, [rawMarkdown]);

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    if (!paperRef.current) return;
    setIsExporting(true);
    try {
      const cleanName = name.replace(/[^a-zA-Z0-9]+/g, "_");
      const cleanJob = (targetJobTitle || "Resume").replace(/[^a-zA-Z0-9]+/g, "_");
      const cleanCo = (targetCompany || "").replace(/[^a-zA-Z0-9]+/g, "_");
      const filename = cleanCo
        ? `${cleanName}_Tailored_${cleanCo}_${cleanJob}.pdf`
        : `${cleanName}_Tailored_${cleanJob}.pdf`;
      await exportElementToPdf(paperRef.current, filename);
    } catch (err) {
      console.error("PDF export error:", err);
      // Fallback to print
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    if (!rawMarkdown) return;
    await navigator.clipboard.writeText(rawMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="resume-template-wrapper">
      {/* Action Toolbar */}
      <div className="resume-toolbar">
        <div className="resume-toolbar-left">
          <span className="resume-toolbar-badge">Live Editable Template</span>
          <span className="resume-toolbar-hint">
            ✏️ Click any text on the paper to edit directly before downloading
          </span>
        </div>
        <div className="resume-toolbar-actions">
          <button
            type="button"
            className="resume-tool-btn resume-tool-btn--primary"
            onClick={handleDownloadPdf}
            disabled={isExporting}
          >
            {isExporting ? "Generating PDF…" : "⬇️ Download PDF"}
          </button>
          <button
            type="button"
            className="resume-tool-btn"
            onClick={handlePrint}
            title="Open browser print dialog for high-res vector output"
          >
            🖨️ Print
          </button>
          <button
            type="button"
            className="resume-tool-btn"
            onClick={handleCopy}
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
        </div>
      </div>

      {/* Sheet Container */}
      <div className="resume-sheet-container">
        <div className="resume-paper" ref={paperRef}>
          {/* Header */}
          <header className="resume-header">
            <h1
              className="resume-name"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setName(e.currentTarget.textContent || "")}
            >
              {name}
            </h1>
            <div
              className="resume-contact-row"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setContactInfo(e.currentTarget.textContent || "")}
            >
              {contactInfo}
            </div>
          </header>

          {/* SUMMARY */}
          {summary && (
            <section className="resume-section">
              <h2 className="resume-section-title">SUMMARY</h2>
              <div className="resume-section-divider" />
              <p
                className="resume-paragraph"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setSummary(e.currentTarget.textContent || "")}
              >
                {summary}
              </p>
            </section>
          )}

          {/* SKILLS */}
          {skills.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-section-title">SKILLS</h2>
              <div className="resume-section-divider" />
              <div className="resume-skills-block">
                {skills.map((s, idx) => (
                  <div key={idx} className="resume-skill-row">
                    <strong
                      className="resume-skill-cat"
                      contentEditable
                      suppressContentEditableWarning
                    >
                      {s.category}:
                    </strong>{" "}
                    <span
                      className="resume-skill-desc"
                      contentEditable
                      suppressContentEditableWarning
                    >
                      {s.content}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* EDUCATION */}
          {education.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-section-title">EDUCATION</h2>
              <div className="resume-section-divider" />
              <div className="resume-entries-block">
                {education.map((edu, idx) => (
                  <div key={idx} className="resume-entry">
                    <div className="resume-entry-header">
                      <strong
                        className="resume-entry-title"
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {edu.degree}
                      </strong>
                      {edu.date && (
                        <span
                          className="resume-entry-date"
                          contentEditable
                          suppressContentEditableWarning
                        >
                          {edu.date}
                        </span>
                      )}
                    </div>
                    <div
                      className="resume-entry-sub"
                      contentEditable
                      suppressContentEditableWarning
                    >
                      {edu.institution}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* EXPERIENCE */}
          {experience.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-section-title">EXPERIENCE</h2>
              <div className="resume-section-divider" />
              <div className="resume-entries-block">
                {experience.map((exp, idx) => (
                  <div key={idx} className="resume-entry">
                    <div className="resume-entry-header">
                      <strong
                        className="resume-entry-title"
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {exp.role}
                      </strong>
                      <span
                        className="resume-entry-date"
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {exp.date}
                      </span>
                    </div>
                    <div
                      className="resume-entry-sub"
                      contentEditable
                      suppressContentEditableWarning
                    >
                      {exp.company}
                    </div>
                    {exp.bullets.length > 0 && (
                      <ul className="resume-bullet-list">
                        {exp.bullets.map((b, bIdx) => (
                          <li
                            key={bIdx}
                            className="resume-bullet-item"
                            contentEditable
                            suppressContentEditableWarning
                          >
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* PROJECT */}
          {projects.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-section-title">PROJECT</h2>
              <div className="resume-section-divider" />
              <div className="resume-entries-block">
                {projects.map((proj, idx) => (
                  <div key={idx} className="resume-entry">
                    <div className="resume-entry-header">
                      <strong
                        className="resume-entry-title"
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {proj.title}
                      </strong>
                    </div>
                    {proj.subtitle && (
                      <div
                        className="resume-entry-sub"
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {proj.subtitle}
                      </div>
                    )}
                    {proj.bullets.length > 0 && (
                      <ul className="resume-bullet-list">
                        {proj.bullets.map((b, bIdx) => (
                          <li
                            key={bIdx}
                            className="resume-bullet-item"
                            contentEditable
                            suppressContentEditableWarning
                          >
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
