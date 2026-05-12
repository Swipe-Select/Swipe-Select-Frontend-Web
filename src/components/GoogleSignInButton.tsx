import { useState } from 'react';
import { useGoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuthConfig } from '../context/GoogleAuthConfigContext';
import { loginAssets, signUpAssets } from '../figma/authAssets';
import './GoogleSignInButton.css';

type Props = {
  uxMode: 'signup' | 'login';
  width?: number;
  onSignedIn: () => void;
};

export function GoogleSignInButton({ uxMode, width = 332, onSignedIn }: Readonly<Props>) {
  const { googleLogin } = useAuth();
  const { switchToNextClientId } = useGoogleAuthConfig();
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
    } else {
      onSignedIn();
    }
  };

  const handleGoogleError = () => {
    const switched = switchToNextClientId();
    if (switched) {
      setError('Google sign-in failed for this web client. Switched to a fallback config — click again.');
      return;
    }
    setError('Google popup failed. Please try again or use email sign-in.');
  };

  const login = useGoogleLogin({
    onSuccess: handleSuccess,
    onError: handleGoogleError,
    flow: 'implicit',
  });

  const buttonText = uxMode === 'signup' ? 'Sign up with Google' : 'Continue with Google';
  const assetSrc = uxMode === 'signup' ? signUpAssets.google : loginAssets.google;

  return (
    <span className="google-signin-wrapper" style={{ maxWidth: width, width: '100%' }}>
      <button type="button" className="google-signin-button" onClick={() => login()}>
        <span className="google-signin-icon">
          <img src={assetSrc} alt="Google logo" aria-hidden="true" />
        </span>
        <span>{buttonText}</span>
      </button>
      {error ? (
        <span role="alert" className="google-signin-error">
          {error}
        </span>
      ) : null}
    </span>
  );
}
