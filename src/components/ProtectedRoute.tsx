import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { readSession } from '../auth/storage';
import { ONBOARDING_COMPLETE_STEP } from '../auth/onboardingStep';

type Props = {
  children: React.ReactNode;
  /**
   * Pass `requireCompleted` on routes that need a finished onboarding (e.g. /discover).
   * Users mid-onboarding are redirected to /onboarding instead of being blocked entirely.
   */
  requireCompleted?: boolean;
  /**
   * Pass `requireIncomplete` on onboarding routes.
   * Users who already finished onboarding are sent straight to /discover.
   */
  requireIncomplete?: boolean;
};

export function ProtectedRoute({ children, requireCompleted, requireIncomplete }: Readonly<Props>) {
  const { session } = useAuth();
  const location = useLocation();

  // Prefer live context; fall back to storage for the first render before context hydrates
  const activeSession = session ?? readSession();
  const token = activeSession?.token?.trim();

  if (!token) {
    // Not authenticated — send to login and remember where we came from
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const step = activeSession?.onboardingStep ?? 0;
  const onboardingDone = step >= ONBOARDING_COMPLETE_STEP;

  if (requireCompleted && !onboardingDone) {
    // Trying to reach /discover before finishing onboarding
    return <Navigate to="/onboarding" replace />;
  }

  if (requireIncomplete && onboardingDone) {
    // Trying to re-enter onboarding after it's already complete
    return <Navigate to="/dashboard/discover" replace />;
  }

  return <>{children}</>;
}
