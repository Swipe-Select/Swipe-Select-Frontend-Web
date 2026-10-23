import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck, 
  Bot, 
  Zap
} from "lucide-react";
import { BRAND_NAME } from "../brand";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { hasGoogleClientIdCandidates } from "../auth/googleClientIds";
import { useAuth } from "../context/AuthContext";
import "./SignUpPage.css";

const HAS_GOOGLE = hasGoogleClientIdCandidates();

export function SignUpPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fillTestCredentials = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setName(`Test User ${randomSuffix}`);
    setEmail(`tester${randomSuffix}@swipeselect.io`);
    setPassword("Password123!");
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const msg = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (msg) {
        setError(msg);
        return;
      }
      navigate("/onboarding");
    } catch {
      setError(
        "Unable to reach the server. Confirm the backend is running on port 5002.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="signup-page page-fill">
      <div className="signup-main">
        {/* Left Value Showcase */}
        <aside className="signup-left" aria-label="Product benefits">
          <div className="signup-left-inner">
            <div className="signup-pill-badge">
              <Sparkles size={14} className="text-indigo-600" />
              <span>Smart Career Selection</span>
            </div>

            <h2>
              Choose Your Next Role
              <br />
              <span className="signup-gradient-text">With AI Precision</span>
            </h2>

            <p className="signup-left-lead">
              Join thousands using {BRAND_NAME} to bypass spammy postings, verify job legitimacy, and generate tailored ATS resumes in seconds.
            </p>

            <div className="signup-features">
              <div className="signup-feature">
                <div className="signup-feature-icon signup-feature-icon--purple">
                  <Bot size={22} />
                </div>
                <div className="signup-feature-body">
                  <h3>Tailored for You</h3>
                  <p>
                    Qwen2.5-3B model tailors your experience bullets to perfectly match target job requirements.
                  </p>
                </div>
              </div>

              <div className="signup-feature">
                <div className="signup-feature-icon signup-feature-icon--emerald">
                  <ShieldCheck size={22} />
                </div>
                <div className="signup-feature-body">
                  <h3>ModernBERT Fraud Guard</h3>
                  <p>
                    State-of-the-art classifier screens phantom postings and recruitment scams in real time.
                  </p>
                </div>
              </div>

              <div className="signup-feature">
                <div className="signup-feature-icon signup-feature-icon--indigo">
                  <Zap size={22} />
                </div>
                <div className="signup-feature-body">
                  <h3>Swipe-Ready Job Flow</h3>
                  <p>
                    Evaluate salaries, tech stacks, and match scores with rapid card swipes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Sign Up Form */}
        <div className="signup-right">
          <div className="signup-form-wrap">
            <div className="signup-form-heading">
              <h1>Create Your Account</h1>
              <p>Start your AI-powered career search today</p>
            </div>

            {/* Demo Helper Button */}
            <div className="signup-demo-wrap">
              <button
                type="button"
                className="signup-demo-btn"
                onClick={fillTestCredentials}
                title="Pre-fill unique test credentials"
              >
                <Sparkles size={14} />
                <span>Pre-fill Test Account</span>
              </button>
            </div>

            <form className="signup-form-fields" onSubmit={handleSubmit}>
              <div className="signup-field">
                <label htmlFor="signup-full-name">Full Name</label>
                <div className="signup-input-wrap">
                  <span className="signup-input-icon"><User size={18} /></span>
                  <input
                    id="signup-full-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Sameer Shahid"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    disabled={pending}
                  />
                </div>
              </div>

              <div className="signup-field">
                <label htmlFor="signup-email">Work Email</label>
                <div className="signup-input-wrap">
                  <span className="signup-input-icon"><Mail size={18} /></span>
                  <input
                    id="signup-email"
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

              <div className="signup-field">
                <label htmlFor="signup-password">Password</label>
                <div className="signup-input-wrap">
                  <span className="signup-input-icon"><Lock size={18} /></span>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={pending}
                  />
                </div>
              </div>

              {error ? (
                <div className="signup-error-banner" role="alert">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              ) : null}

              <button type="submit" className="signup-submit" disabled={pending}>
                {pending ? (
                  <span>Creating Account…</span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {HAS_GOOGLE ? (
              <>
                <div className="signup-divider" role="presentation">
                  <span>or continue with</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <GoogleSignInButton uxMode="signup" onSignedIn={() => navigate("/onboarding")} />
                </div>
              </>
            ) : null}

            <p className="signup-already">
              Already have an account? <Link to="/login">Sign In</Link>
            </p>

            <p className="signup-legal">
              By signing up, you agree to our <a href="#terms">Terms of Service</a> and{" "}
              <a href="#privacy">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
