import './OnboardingBottomBar.css';

/**
 * OnboardingBottomBar
 *
 * Sticky bottom action bar shared across most onboarding steps.
 * Hidden for steps that manage their own action areas:
 *   - Step 4  (Resume Builder — has its own onb-rb-footer)
 *   - Step 8  (Base Location — side-panel has Continue)
 *   - Step 9  (Target Locations — side-panel has Continue)
 */

type Props = {
  /** Button label, e.g. "Continue", "Save Preferences", "Finish" */
  label: string;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
  /** When false the bar is hidden entirely (map steps, builder step) */
  show: boolean;
};

export function OnboardingBottomBar({ label, disabled = false, busy = false, onClick, show }: Props) {
  if (!show) return null;

  return (
    <div className="onb-bottom-bar">
      <button
        type="button"
        id="onb-continue-btn"
        className="onb-bottom-bar-btn"
        disabled={disabled || busy}
        onClick={onClick}
        aria-busy={busy}
      >
        {busy ? 'Saving…' : label}
        {!busy && (
          <svg
            className="onb-bottom-bar-btn-icon"
            width={14}
            height={14}
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
          >
            <path
              d="M3 7h8M8 4l3 3-3 3"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
