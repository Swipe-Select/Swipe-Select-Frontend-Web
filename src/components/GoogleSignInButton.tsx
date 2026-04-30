import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type Props = {
  uxMode: 'signup' | 'login';
  width?: number;
  onSignedIn: () => void;
};

/** Renders the official Google button; wrap in `.signup-google` / `.login-google` wrappers for layout parity. */
export function GoogleSignInButton({ uxMode, width = 332, onSignedIn }: Props) {
  const { googleLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = async (cred: CredentialResponse) => {
    setError(null);
    if (!cred.credential) {
      setError('Google sign-in did not complete.');
      return;
    }
    const errMsg = await googleLogin(cred.credential);
    if (errMsg) setError(errMsg);
    else onSignedIn();
  };

  return (
    <span style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError('Google popup failed — try email sign-in')}
        theme="outline"
        size="large"
        width={width}
        text={uxMode === 'signup' ? 'signup_with' : 'continue_with'}
      />
      {error ? (
        <span role="alert" style={{ color: '#dc2626', fontSize: 13, textAlign: 'center' }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
