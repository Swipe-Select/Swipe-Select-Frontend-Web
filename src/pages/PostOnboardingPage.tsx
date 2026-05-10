import { useNavigate } from "react-router-dom";
import { onboardingAssets } from "../figma/onboardingAssets";
import "./PostOnboardingPage.css";

const ast = onboardingAssets;

export function PostOnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="post-onb page-fill">
      <main className="post-onb-main">
        <div className="post-onb-card">
          <div className="post-onb-hero">
            <div className="post-onb-check" aria-hidden>
              <img src={ast.ready.check} alt="" width={50} height={50} />
            </div>
            <h1 className="post-onb-title">You&apos;re all set!</h1>
            <p className="post-onb-sub">
              Your profile is ready and you&apos;re all set to find your next dream job.
            </p>
          </div>

          <div className="post-onb-actions">
            <button type="button" className="post-onb-action" onClick={() => navigate("/dashboard/discover")}>
              <span className="post-onb-action-icon post-onb-action-icon--jobs" aria-hidden>
                <img src={ast.ready.match} alt="" width={33} height={33} />
              </span>
              <span className="post-onb-action-copy">
                <span className="post-onb-action-title">Explore Jobs</span>
                <span className="post-onb-action-desc">
                  Start browsing jobs that match your profile and preferences.
                </span>
              </span>
            </button>
            <button type="button" className="post-onb-action" onClick={() => navigate("/")}>
              <span className="post-onb-action-icon post-onb-action-icon--profile" aria-hidden>
                <img src={ast.personal.userIcon} alt="" width={28} height={28} />
              </span>
              <span className="post-onb-action-copy">
                <span className="post-onb-action-title">View Profile</span>
                <span className="post-onb-action-desc">
                  Take a look at your completed profile and make any final adjustments.
                </span>
              </span>
            </button>
          </div>

          <div className="post-onb-footer">
            <button type="button" className="post-onb-back" onClick={() => navigate(-1)}>
              Back
            </button>
            <button type="button" className="post-onb-finish" onClick={() => navigate("/dashboard/discover")}>
              Finish
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
