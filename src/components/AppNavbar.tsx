import { Link, useLocation, useNavigate } from "react-router-dom";
import { BRAND_LOGO_SRC, BRAND_NAME } from "../brand";
import { ONBOARDING_COMPLETE_STEP } from "../auth/onboardingStep";
import { useAuth } from "../context/AuthContext";
import "./AppNavbar.css";

export function AppNavbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const showSignUpLoginCta = pathname === "/signup";
  const showLogout = (session?.onboardingStep ?? 0) >= ONBOARDING_COMPLETE_STEP;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="app-navbar" role="banner">
      <Link className="app-navbar-brand" to="/">
        <img src={BRAND_LOGO_SRC} alt="" width={32} height={32} className="app-navbar-logo" />
        <span className="app-navbar-title">{BRAND_NAME}</span>
      </Link>
      {showLogout ? (
        <button type="button" className="app-navbar-logout" onClick={handleLogout}>
          Logout
        </button>
      ) : showSignUpLoginCta ? (
        <p className="app-navbar-cta" aria-label="Account">
          <span className="app-navbar-cta-text">Already have an account?</span>
          <Link className="app-navbar-cta-link" to="/login">
            Log In
          </Link>
        </p>
      ) : null}
    </header>
  );
}
