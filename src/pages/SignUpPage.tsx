import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND_NAME } from "../brand";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { hasGoogleClientIdCandidates } from "../auth/googleClientIds";
import { signUpAssets } from "../figma/authAssets";
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
        "Unable to reach the server. Confirm the backend is running and VITE_API_URL matches its address.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="signup-page page-fill">
      <div className="signup-main">
        <aside className="signup-left" aria-label="Product benefits">
          <div className="signup-left-inner">
            <h2>
              Choose with
              <br />
              confidence
            </h2>
            <p className="signup-left-lead">
              Join people using {BRAND_NAME} to explore options quickly and land on what fits—without the
              noise.
            </p>
            <div className="signup-features">
              <div className="signup-feature">
                <div className="signup-feature-icon">
                  <img src={signUpAssets.featureInsights} alt="" width={42} height={42} />
                </div>
                <div className="signup-feature-body">
                  <h3>Tailored for you</h3>
                  <p>
                    Preferences and context shape what you see next, so every swipe feels relevant.
                  </p>
                </div>
              </div>
              <div className="signup-feature">
                <div className="signup-feature-icon">
                  <img src={signUpAssets.featureNetwork} alt="" width={46} height={40} />
                </div>
                <div className="signup-feature-body">
                  <h3>Swipe-ready flow</h3>
                  <p>
                    Move through choices in a fast, intentional way—built around how you actually decide.
                  </p>
                </div>
              </div>
              <div className="signup-feature">
                <div className="signup-feature-icon">
                  <img src={signUpAssets.featureCoaching} alt="" width={46} height={42} />
                </div>
                <div className="signup-feature-body">
                  <h3>Clear outcomes</h3>
                  <p>
                    See why options match before you commit, so you always know what you&apos;re selecting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="signup-right">
          <div className="signup-form-wrap">
            <div className="signup-form-heading">
              <h1>Create your account</h1>
              <p>Start your {BRAND_NAME} journey today.</p>
            </div>

            <form className="signup-form-fields" onSubmit={handleSubmit}>
              <div className="signup-field">
                <label htmlFor="signup-full-name">Full Name</label>
                <input
                  id="signup-full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  disabled={pending}
                />
              </div>
              <div className="signup-field">
                <label htmlFor="signup-email">Work Email</label>
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
              <div className="signup-field">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={pending}
                />
              </div>
              {error ? (
                <p role="alert" style={{ margin: 0, color: "#b91c1c", fontSize: 14 }}>
                  {error}
                </p>
              ) : null}
              <button type="submit" className="signup-submit" disabled={pending}>
                {pending ? "Creating account…" : "Sign Up"}
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

            <p className="signup-legal">
              By signing up, you agree to our <a href="#terms">Terms of Service</a> and{" "}
              <a href="#privacy">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>

      <footer className="signup-footer">
        <div className="signup-footer-inner">
          <p className="signup-footer-copy">
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
          <nav className="signup-footer-links" aria-label="Footer">
            <a href="#help">Help Center</a>
            <a href="#support">Contact Support</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
