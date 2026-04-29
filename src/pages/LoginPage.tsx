import { useState } from "react";
import { Link } from "react-router-dom";
import { BRAND_LOGO_SRC, BRAND_NAME } from "../brand";
import { loginAssets } from "../figma/authAssets";
import "./LoginPage.css";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-page">
      <div className="login-top-accent" aria-hidden />
      <div className="login-canvas">
        <div className="login-card">
          <div className="login-card-header">
            <img
              className="login-brand-logo"
              src={BRAND_LOGO_SRC}
              alt={`${BRAND_NAME} logo`}
              width={56}
              height={56}
            />
            <h1>Welcome Back</h1>
            <p>Sign in to your {BRAND_NAME} account</p>
          </div>

          <button type="button" className="login-google">
            <img src={loginAssets.google} alt="" width={24} height={24} />
            <span>Continue with Google</span>
          </button>

          <div className="login-divider" role="presentation">
            <div className="login-divider-inner">
              <span className="login-divider-label">OR SIGN IN WITH EMAIL</span>
            </div>
          </div>

          <form className="login-form" noValidate>
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <div className="login-input-wrap">
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
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
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <img src={loginAssets.passwordToggle} alt="" width={18} height={17} />
                </button>
              </div>
            </div>

            <div className="login-submit-wrap">
              <button type="submit" className="login-submit">
                Sign In to {BRAND_NAME}
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
