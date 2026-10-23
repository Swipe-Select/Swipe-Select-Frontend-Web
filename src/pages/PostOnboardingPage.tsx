import { useNavigate } from "react-router-dom";
import { CheckCircle2, Sparkles, Compass, User, ArrowRight } from "lucide-react";
import "./PostOnboardingPage.css";

export function PostOnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="post-onb page-fill">
      {/* Background glow */}
      <div className="post-onb-glow" aria-hidden />

      <main className="post-onb-main">
        <div className="post-onb-card">
          <div className="post-onb-hero">
            <div className="post-onb-check-circle" aria-hidden>
              <CheckCircle2 size={56} className="text-emerald-500" />
            </div>
            <div className="post-onb-badge">
              <Sparkles size={14} className="text-amber-500" />
              <span>Profile Calibrated & Verified</span>
            </div>
            <h1 className="post-onb-title">You&apos;re All Set!</h1>
            <p className="post-onb-sub">
              Your preferences, skills, and resume have been processed. Our ML matching engine and ModernBERT fraud scanner are primed for your feed.
            </p>
          </div>

          <div className="post-onb-actions">
            <button
              type="button"
              className="post-onb-action post-onb-action--primary"
              onClick={() => navigate("/dashboard/discover")}
            >
              <span className="post-onb-action-icon post-onb-action-icon--jobs" aria-hidden>
                <Compass size={28} />
              </span>
              <span className="post-onb-action-copy">
                <span className="post-onb-action-title">Start Discovering Jobs</span>
                <span className="post-onb-action-desc">
                  Browse personalized recommendations and start swiping matching roles.
                </span>
              </span>
              <ArrowRight size={20} className="post-onb-action-arrow" />
            </button>

            <button
              type="button"
              className="post-onb-action post-onb-action--secondary"
              onClick={() => navigate("/dashboard/profile")}
            >
              <span className="post-onb-action-icon post-onb-action-icon--profile" aria-hidden>
                <User size={26} />
              </span>
              <span className="post-onb-action-copy">
                <span className="post-onb-action-title">Review Profile & Stats</span>
                <span className="post-onb-action-desc">
                  View your calibrated profile, uploaded resume details, and job targets.
                </span>
              </span>
              <ArrowRight size={20} className="post-onb-action-arrow" />
            </button>
          </div>

          <div className="post-onb-footer">
            <button type="button" className="post-onb-finish" onClick={() => navigate("/dashboard/discover")}>
              <span>Enter Workspace</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
