import { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuthConfig } from '../context/GoogleAuthConfigContext';
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

  return (
    <span className="google-signin-wrapper" style={{ maxWidth: width, width: '100%' }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleGoogleError}
        theme="outline"
        size="large"
        width={width}
        text={uxMode === 'signup' ? 'signup_with' : 'continue_with'}
        containerProps={{
          style: {
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          },
        }}
      />
      {error ? (
        <span role="alert" className="google-signin-error">
          {error}
        </span>
      ) : null}
    </span>
  );
}
