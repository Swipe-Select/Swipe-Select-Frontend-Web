import './OnboardingTopBar.css';

type Props = {
  step: number;
  totalSteps: number;
  canGoBack: boolean;
  onBack: () => void;
};

const VISIBLE_STEPS = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

export function OnboardingTopBar({ step, totalSteps: _totalSteps, canGoBack, onBack }: Props) {
  const currentIdx = VISIBLE_STEPS.indexOf(step);
  const stepNum    = currentIdx + 1;
  const totalNum   = VISIBLE_STEPS.length;

  return (
    <header
      className="onb-topbar-persistent"
      role="banner"
      aria-label="Onboarding navigation"
    >
      {/* ── Left: Back button ── */}
      <button
        type="button"
        className="onb-topbar-back"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="Go back to previous step"
      >
        <svg
          className="onb-topbar-back-icon"
          width={14}
          height={14}
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
        >
          <path
            d="M9 2L4 7l5 5"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Back</span>
      </button>

      {/* ── Center: progress dots + step counter ── */}
      <div className="onb-topbar-progress-wrap">
        <div
          className="onb-topbar-dots"
          role="status"
          aria-label={`Step ${stepNum} of ${totalNum}`}
        >
          {VISIBLE_STEPS.map((s, idx) => {
            let cls = 'onb-topbar-dot';
            if (s === step)    cls += ' onb-topbar-dot--active';
            else if (idx < currentIdx) cls += ' onb-topbar-dot--done';
            return <span key={s} className={cls} />;
          })}
        </div>
        <span className="onb-topbar-step-label" aria-hidden>
          {stepNum}&nbsp;/&nbsp;{totalNum}
        </span>
      </div>

      {/* ── Right: spacer to keep dots centered ── */}
      <div className="onb-topbar-right" aria-hidden />
    </header>
  );
}
