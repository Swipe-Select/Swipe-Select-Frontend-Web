import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useMemo, useState } from 'react';
import './index.css';
import App from './App.tsx';
import { getGoogleClientIdCandidates } from './auth/googleClientIds';
import { AuthProvider } from './context/AuthContext.tsx';
import { GoogleAuthConfigProvider } from './context/GoogleAuthConfigContext.tsx';

const Shell = (
  <AuthProvider>
    <App />
  </AuthProvider>
);

function Root() {
  const candidates = useMemo(() => getGoogleClientIdCandidates(), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeClientId = candidates[activeIndex] ?? null;

  const switchToNextClientId = () => {
    if (activeIndex + 1 >= candidates.length) {
      return false;
    }
    setActiveIndex((prev) => prev + 1);
    return true;
  };

  const app = activeClientId ? (
    <GoogleOAuthProvider key={activeClientId} clientId={activeClientId}>
      {Shell}
    </GoogleOAuthProvider>
  ) : (
    Shell
  );

  return (
    <GoogleAuthConfigProvider
      value={{
        activeClientId,
        activeIndex,
        totalCandidates: candidates.length,
        switchToNextClientId,
      }}
    >
      {app}
    </GoogleAuthConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
