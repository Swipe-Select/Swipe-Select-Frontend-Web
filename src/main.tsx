import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

const Shell = (
  <AuthProvider>
    <App />
  </AuthProvider>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{Shell}</GoogleOAuthProvider>
    ) : (
      Shell
    )}
  </StrictMode>,
);
