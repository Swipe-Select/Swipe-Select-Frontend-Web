import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { readSession } from '../auth/storage';
import { ONBOARDING_COMPLETE_STEP } from '../auth/onboardingStep';

/**
 * Wraps public-only pages (/login, /signup).
 * Authenticated users are redirected to the correct app destination
 * instead of seeing the auth forms again.
 */
export function PublicOnlyRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const { session } = useAuth();
  const activeSession = session ?? readSession();
  const token = activeSession?.token?.trim();

  if (!token) return <>{children}</>;

  const step = activeSession?.onboardingStep ?? 0;
  return <Navigate to={step >= ONBOARDING_COMPLETE_STEP ? '/dashboard/discover' : '/onboarding'} replace />;
}
