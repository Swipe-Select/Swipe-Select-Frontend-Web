import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  AlertCircle,
  ShieldCheck 
} from "lucide-react";
import { BRAND_NAME } from "../brand";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { hasGoogleClientIdCandidates } from "../auth/googleClientIds";
import { useAuth } from "../context/AuthContext";
import { ONBOARDING_COMPLETE_STEP } from "../auth/onboardingStep";
import { readSession } from "../auth/storage";
import "./LoginPage.css";

const HAS_GOOGLE = hasGoogleClientIdCandidates();

function landingAfterAuth() {
  const s = readSession();
  const step = s?.onboardingStep ?? 0;
  return step >= ONBOARDING_COMPLETE_STEP ? "/dashboard/discover" : "/onboarding";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fillDemoAccount = () => {
    setEmail("evaluator@swipeselect.io");
    setPassword("Password123!");
    setError(null);
  };

  const doLogin = async () => {
    setError(null);
    setPending(true);
    try {
      const msg = await login({ email: email.trim(), password });
      if (msg) {
        setError(msg);
        return;
      }
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? landingAfterAuth(), { replace: true });
    } catch {
      setError(
        "Unable to reach the server. Confirm the backend is running on port 5002.",
      );
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    void doLogin();
  };

  const afterGoogleSignIn = () => {
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? landingAfterAuth(), { replace: true });
  };

  return (
    <div className="login-page page-fill">
      {/* Background radial glow */}
      <div className="login-bg-glow" aria-hidden />

      <div className="login-canvas">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-badge">
              <ShieldCheck size={14} className="text-indigo-600" />
              <span>Secure Authentication</span>
            </div>
            <h1>Welcome Back</h1>
            <p>Sign in to your {BRAND_NAME} account</p>
          </div>

          {/* Quick Demo Credentials Helper */}
          <div className="login-demo-helper">
            <button
              type="button"
              className="login-demo-btn"
              onClick={fillDemoAccount}
              title="Click to pre-fill test credentials"
            >
              <Sparkles size={14} />
              <span>Demo Account Fill</span>
            </button>
          </div>

          {HAS_GOOGLE ? (
            <>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <GoogleSignInButton uxMode="login" width={356} onSignedIn={afterGoogleSignIn} />
              </div>
              <div className="login-divider" aria-hidden="true">
                <div className="login-divider-inner">
                  <span className="login-divider-label">OR SIGN IN WITH EMAIL</span>
                </div>
              </div>
            </>
          ) : null}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Email Address</label>
              <div className="login-input-wrap">
                <span className="login-input-icon"><Mail size={18} /></span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={pending}
                />
              </div>
            </div>

            <div className="login-field">
              <div className="login-field-label-row">
                <label htmlFor="login-password">Password</label>
                <a className="forgot" href="#forgot">
                  Forgot Password?
                </a>
              </div>
              <div className="login-input-wrap password">
                <span className="login-input-icon"><Lock size={18} /></span>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={pending}
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="login-error-banner" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="login-submit-wrap">
              <button type="submit" className="login-submit" disabled={pending}>
                {pending ? (
                  <span>Signing in…</span>
                ) : (
                  <>
                    <span>Sign In to {BRAND_NAME}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="login-card-footer">
            <p>
              Don&apos;t have an account? <Link to="/signup">Join Now</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
