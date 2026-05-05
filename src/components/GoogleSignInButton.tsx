import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuthConfig } from '../context/GoogleAuthConfigContext';

type Props = {
  uxMode: 'signup' | 'login';
  width?: number;
  onSignedIn: () => void;
};

/** Renders the official Google button; wrap in `.signup-google` / `.login-google` wrappers for layout parity. */
export function GoogleSignInButton({ uxMode, width = 332, onSignedIn }: Props) {
  const { googleLogin } = useAuth();
  const { activeClientId, activeIndex, totalCandidates, switchToNextClientId } = useGoogleAuthConfig();
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = async (cred: CredentialResponse) => {
    setError(null);
    if (!cred.credential) {
      setError('Google sign-in did not complete.');
      return;
    }
    const errMsg = await googleLogin(cred.credential);
    if (errMsg) {
      setError(errMsg);
    }
    else onSignedIn();
  };

  const handleGoogleError = () => {
    const switched = switchToNextClientId();
    if (switched) {
      setError('Google sign-in failed for this web client. Switched to a fallback config — click again.');
      return;
    }
    setError('Google popup failed. Please try again or use email sign-in.');
  };

  return (
    <span style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
      <GoogleLogin
        key={activeClientId ?? 'google-login-disabled'}
        onSuccess={handleSuccess}
        onError={handleGoogleError}
        theme="outline"
        size="large"
        width={width}
        text={uxMode === 'signup' ? 'signup_with' : 'continue_with'}
      />
      {import.meta.env.DEV && totalCandidates > 1 ? (
        <span style={{ color: '#64748b', fontSize: 11, textAlign: 'center' }}>
          Google config {activeIndex + 1}/{totalCandidates}
        </span>
      ) : null}
      {error ? (
        <span role="alert" style={{ color: '#dc2626', fontSize: 13, textAlign: 'center' }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
