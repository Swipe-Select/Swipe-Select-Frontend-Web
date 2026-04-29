import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BRAND_LOGO_SRC, BRAND_NAME } from "../brand";
import { signUpAssets } from "../figma/authAssets";
import "./SignUpPage.css";

export function SignUpPage() {
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate("/onboarding");
  };

  return (
    <div className="signup-page">
      <header className="signup-header">
        <div className="signup-brand">
          <img
            className="signup-brand-logo"
            src={BRAND_LOGO_SRC}
            alt=""
            width={36}
            height={36}
            aria-hidden
          />
          <p className="signup-brand-name">{BRAND_NAME}</p>
        </div>
        <p className="signup-header-cta">
          <span>Already have an account?</span>
          <Link to="/login">Log In</Link>
        </p>
      </header>

      <div className="signup-main">
        <aside className="signup-left" aria-label="Product benefits">
          <div className="signup-left-inner">
            <h2>
              Choose with
              <br />
              confidence
            </h2>
            <p className="signup-left-lead">
              Join people using {BRAND_NAME} to explore options quickly and land on
              what fits—without the noise.
            </p>
            <div className="signup-features">
              <div className="signup-feature">
                <div className="signup-feature-icon">
                  <img src={signUpAssets.featureInsights} alt="" width={42} height={42} />
                </div>
                <div className="signup-feature-body">
                  <h3>Tailored for you</h3>
                  <p>
                    Preferences and context shape what you see next, so every swipe
                    feels relevant.
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
                    Move through choices in a fast, intentional way—built around how
                    you actually decide.
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
                    See why options match before you commit, so you always know what
                    you&apos;re selecting.
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

            <form className="signup-form-fields" noValidate onSubmit={handleSubmit}>
              <div className="signup-field">
                <label htmlFor="signup-full-name">Full Name</label>
                <input
                  id="signup-full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Jane Doe"
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
                />
              </div>
              <button type="submit" className="signup-submit">
                Sign Up
              </button>
            </form>

            <div className="signup-divider" role="presentation">
              <span>or continue with</span>
            </div>

            <button type="button" className="signup-google">
              <img src={signUpAssets.google} alt="" width={16} height={16} />
              Google
            </button>

            <p className="signup-legal">
              By signing up, you agree to our{" "}
              <a href="#terms">Terms of Service</a> and{" "}
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
