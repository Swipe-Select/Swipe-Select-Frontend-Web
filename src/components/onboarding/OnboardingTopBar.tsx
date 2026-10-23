import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SwipeSelectLogo } from '../SwipeSelectLogo';
import './OnboardingTopBar.css';

type Props = {
  step: number;
  totalSteps?: number;
  canGoBack: boolean;
  onBack: () => void;
};

const VISIBLE_STEPS = [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12];

const STEP_TITLES: Record<number, string> = {
  0: 'Identity & Representation',
  1: 'Resume Upload & Extraction',
  2: 'Contact Information',
  4: 'Build Your Resume',
  5: 'Ready to Swipe',
  6: 'Target Roles & Titles',
  8: 'Current Location',
  9: 'Target Job Locations',
  10: 'Work Mode Preference',
  11: 'Employment Types',
  12: 'Experience Level',
};

export function OnboardingTopBar({ step, canGoBack, onBack }: Props) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const currentIdx = VISIBLE_STEPS.indexOf(step);
  const stepNum = currentIdx >= 0 ? currentIdx + 1 : 1;
  const totalNum = VISIBLE_STEPS.length;
  const progressPercent = Math.round((stepNum / totalNum) * 100);
  const currentTitle = STEP_TITLES[step] ?? 'Profile Calibration';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="onb-unified-topbar" role="banner" aria-label="Onboarding header">
      {/* ── Left: Brand identity + Integrated Back Button ── */}
      <div className="onb-unified-left">
        <div className="onb-unified-brand-wrap" title="Swipe Select Onboarding">
          <SwipeSelectLogo size={32} showText={true} />
          <span className="onb-unified-tag">Onboarding</span>
        </div>

        <div className="onb-unified-nav-divider" aria-hidden />

        <button
          type="button"
          className={`onb-unified-back-btn ${!canGoBack ? 'is-disabled' : ''}`}
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Go back to previous step"
        >
          <ArrowLeft size={16} className="onb-unified-back-icon" />
          <span>Back</span>
        </button>
      </div>

      {/* ── Center: Step Progress Pipeline ── */}
      <div className="onb-unified-center">
        <div className="onb-unified-meta">
          <span className="onb-unified-step-count">
            Step {stepNum} of {totalNum}
          </span>
          <span className="onb-unified-meta-dot">•</span>
          <span className="onb-unified-step-title">{currentTitle}</span>
        </div>

        <div className="onb-unified-progress-row">
          <div
            className="onb-unified-progress-track"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Onboarding progress: ${progressPercent}%`}
          >
            <div
              className="onb-unified-progress-fill"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="onb-unified-progress-glow" />
            </div>
          </div>
          <span className="onb-unified-pct-label">{progressPercent}%</span>
        </div>
      </div>

      {/* ── Right: Autosave status + Exit & Logout action ── */}
      <div className="onb-unified-right">
        <div className="onb-unified-save-badge" title="Changes are automatically saved to your draft">
          <CheckCircle2 size={15} className="text-emerald-500" />
          <span>Draft Saved</span>
        </div>

        <button
          type="button"
          className="onb-unified-logout-btn"
          onClick={handleLogout}
          title="Save draft and exit onboarding"
        >
          <LogOut size={16} />
          <span>Save & Exit</span>
        </button>
      </div>
    </header>
  );
}
