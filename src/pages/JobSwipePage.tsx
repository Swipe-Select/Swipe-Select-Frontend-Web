import { useNavigate } from "react-router-dom";
import "./JobSwipePage.css";

function IconLocation({ className }: { className?: string }) {
  return (
    <svg className={className} width={11} height={14} viewBox="0 0 11 14" fill="none" aria-hidden>
      <path
        d="M5.5 0C2.46 0 0 2.35 0 5.25c0 3.92 5.5 8.75 5.5 8.75S11 9.17 11 5.25C11 2.35 8.54 0 5.5 0zm0 7.12a1.88 1.88 0 110-3.76 1.88 1.88 0 010 3.76z"
        fill="#64748b"
      />
    </svg>
  );
}

function IconMoney({ className }: { className?: string }) {
  return (
    <svg className={className} width={15} height={11} viewBox="0 0 15 11" fill="none" aria-hidden>
      <path
        d="M7.5 0C3.36 0 0 1.23 0 2.75v5.5C0 9.77 3.36 11 7.5 11S15 9.77 15 8.25v-5.5C15 1.23 11.64 0 7.5 0zm0 1.38c3.31 0 6 .62 6 1.37 0 .76-2.69 1.38-6 1.38S1.5 3.5 1.5 2.75c0-.75 2.69-1.37 6-1.37zm6 6.5c0 .75-2.69 1.37-6 1.37S1.5 8.5 1.5 7.75V5.9a13.9 13.9 0 006 1.22 13.9 13.9 0 006-1.22v1.85z"
        fill="#64748b"
      />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width={13} height={13} viewBox="0 0 13 13" fill="none" aria-hidden>
      <path
        d="M6.5 0a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm.54 2.17v4.02l2.6 1.56-.45.74-3.1-1.86V2.17h.95z"
        fill="#64748b"
      />
    </svg>
  );
}

function IconPass({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M12.5 3.5L3.5 12.5M3.5 3.5l9 9" stroke="#64748b" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

function IconBookmark({ className }: { className?: string }) {
  return (
    <svg className={className} width={14} height={18} viewBox="0 0 14 18" fill="none" aria-hidden>
      <path
        d="M1 1.5h12v15L7 12.5 1 16.5v-15z"
        stroke="#64748b"
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={18} viewBox="0 0 20 18" fill="none" aria-hidden>
      <path d="M1 9l18-8-8 18-2-7-8-3z" fill="#fff" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={18} viewBox="0 0 20 18" fill="none" aria-hidden>
      <path
        d="M3 18V1h10v4h4v13H3zm4-8h2v2H7v-2zm0-4h2v2H7V6zm4 4h2v2h-2v-2zm0-4h2v2h-2V6zm-4 8h2v2H7v-2zm4 0h2v2h-2v-2z"
        fill="#4648d4"
      />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} width={15} height={15} viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M1 1l13 13M14 1L1 14" stroke="#64748b" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function JobSwipePage() {
  const navigate = useNavigate();

  return (
    <div className="job-swipe" data-name="Html → Body">
      <div className="job-swipe-progress" aria-hidden />

      <div className="job-swipe-layout">
        <div className="job-swipe-left">
          <article className="job-swipe-card">
            <header className="job-swipe-card-header">
              <div className="job-swipe-card-top">
                <span className="job-swipe-company">Acme Corp Global</span>
                <span className="job-swipe-badge">New</span>
              </div>
              <h1 className="job-swipe-title">Senior UX/UI Designer</h1>
            </header>

            <div className="job-swipe-meta">
              <span className="job-swipe-chip">
                <span className="job-swipe-chip-icon">
                  <IconLocation />
                </span>
                San Francisco, CA (Hybrid)
              </span>
              <span className="job-swipe-chip">
                <span className="job-swipe-chip-icon">
                  <IconMoney />
                </span>
                $140k - $175k
              </span>
              <span className="job-swipe-chip">
                <span className="job-swipe-chip-icon">
                  <IconClock />
                </span>
                Full-time
              </span>
            </div>

            <hr className="job-swipe-sep" />

            <p className="job-swipe-brief">
              We are looking for an experienced Senior UX/UI Designer to lead design initiatives for our core global
              platform. You will be responsible for end-to-end product design, from user research and wireframing to
              high-fidelity prototyping and collaborating closely with engineering teams to ship polished experiences.
            </p>
          </article>

          <div className="job-swipe-actions-wrap">
            <div className="job-swipe-actions">
              <button type="button" className="job-swipe-icon-btn" aria-label="Pass on this job">
                <IconPass />
              </button>
              <button type="button" className="job-swipe-icon-btn" aria-label="Save this job">
                <IconBookmark />
              </button>
              <button type="button" className="job-swipe-apply">
                <IconSend />
                Apply Now
              </button>
            </div>
          </div>
        </div>

        <aside className="job-swipe-aside">
          <header className="job-swipe-aside-header">
            <h2 className="job-swipe-aside-title">Details</h2>
            <button type="button" className="job-swipe-aside-close" aria-label="Close" onClick={() => navigate("/")}>
              <IconClose />
            </button>
          </header>

          <div className="job-swipe-aside-scroll">
            <section>
              <h3 className="job-swipe-section-label">About the role</h3>
              <p className="job-swipe-prose">
                We are looking for an experienced Senior UX/UI Designer to lead design initiatives for our core global
                platform. You will be responsible for end-to-end product design, from user research and wireframing to
                high-fidelity prototyping and collaborating closely with engineering teams to ensure pixel-perfect
                implementation.
              </p>
              <p className="job-swipe-prose">
                The ideal candidate has a strong portfolio demonstrating a deep understanding of user-centered design
                principles in complex enterprise applications. You will work within a highly collaborative,
                cross-functional team environment.
              </p>
              <ul className="job-swipe-list">
                <li>5+ years of experience in product design.</li>
                <li>Proficiency in Figma and modern prototyping tools.</li>
                <li>Experience with design systems and component libraries.</li>
              </ul>
            </section>

            <hr className="job-swipe-sep" />

            <section>
              <h3 className="job-swipe-section-label">Company info</h3>
              <div className="job-swipe-company-row">
                <div className="job-swipe-company-avatar" aria-hidden>
                  <IconBuilding />
                </div>
                <div>
                  <p className="job-swipe-company-name">Acme Corp Global</p>
                  <p className="job-swipe-company-meta">Enterprise Software · 10,000+ employees</p>
                  <button type="button" className="job-swipe-link">
                    View Company Profile
                  </button>
                </div>
              </div>
            </section>

            <hr className="job-swipe-sep" />

            <section>
              <h3 className="job-swipe-section-label">Similar roles</h3>
              <div className="job-swipe-similar-stack">
                <button type="button" className="job-swipe-similar-card">
                  <p className="job-swipe-similar-title">Lead Product Designer</p>
                  <p className="job-swipe-similar-meta">TechFlow · Remote</p>
                </button>
                <button type="button" className="job-swipe-similar-card">
                  <p className="job-swipe-similar-title">UX Researcher</p>
                  <p className="job-swipe-similar-meta">Innovate Inc. · San Francisco, CA</p>
                </button>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
