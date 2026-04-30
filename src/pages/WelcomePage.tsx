import { Link } from "react-router-dom";
import { welcomeAssets } from "../figma/welcomeAssets";
import "./WelcomePage.css";

export function WelcomePage() {
  return (
    <div className="welcome-page page-fill">
      <main className="welcome-main">
        <section className="welcome-copy" aria-label="Intro">
          <h1 className="welcome-title">Ready?</h1>
          <p className="welcome-highlight">1.5 million</p>
          <p className="welcome-subtitle">users are waiting for you</p>

          <p className="welcome-description">
            Discover opportunities tailored to your unique professional profile. Our
            AI-driven matching engine analyzes your skills, experience, and
            preferences to connect you with your ideal next role.
          </p>

          <div className="welcome-actions">
            <Link to="/signup" className="welcome-action-primary">
              <span>Start Swiping</span>
              <img src={welcomeAssets.startArrow} alt="" width={16} height={16} />
            </Link>
          </div>
        </section>

        <section className="welcome-visual" aria-label="Featured match preview">
          <div className="welcome-card-back" />
          <div className="welcome-card-middle" />

          <article className="welcome-card-front">
            <div className="welcome-match-badge">
              <img src={welcomeAssets.match} alt="" width={12} height={12} />
              <span>98% Match</span>
            </div>

            <header className="welcome-card-header">
              <div className="welcome-tech-avatar">
                <img src={welcomeAssets.techIcon} alt="" width={30} height={27} />
              </div>
              <div>
                <p className="welcome-tech-label">Technology</p>
                <p className="welcome-tech-name">Google</p>
              </div>
            </header>

            <div className="welcome-card-body">
              <h2>Senior Product Designer</h2>
              <div className="welcome-metadata-grid">
                <p>
                  <img src={welcomeAssets.location} alt="" width={14} height={17} />
                  Mountain View, CA (Hybrid)
                </p>
                <p>
                  <img src={welcomeAssets.salary} alt="" width={18} height={13} />
                  <strong>$180k - $240k</strong>
                </p>
                <p>
                  <img src={welcomeAssets.type} alt="" width={17} height={17} />
                  Full-time
                </p>
                <p>
                  <img src={welcomeAssets.experience} alt="" width={18} height={18} />
                  5+ years exp
                </p>
              </div>

              <div className="welcome-tags">
                <span className="welcome-tag active">Figma</span>
                <span className="welcome-tag">Design Systems</span>
                <span className="welcome-tag">Prototyping</span>
                <span className="welcome-tag">+3 more</span>
              </div>
            </div>

            <footer className="welcome-card-footer">
              <button type="button" className="welcome-btn-pass" aria-label="Pass this role">
                <img src={welcomeAssets.pass} alt="" width={14} height={14} />
                Pass
              </button>
              <Link to="/signup" className="welcome-btn-apply" aria-label="Apply for this role">
                <img src={welcomeAssets.apply} alt="" width={20} height={18} />
                Apply
              </Link>
            </footer>

            <div className="welcome-floating-hint" aria-hidden>
              <img src={welcomeAssets.floating} alt="" width={25} height={26} />
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
