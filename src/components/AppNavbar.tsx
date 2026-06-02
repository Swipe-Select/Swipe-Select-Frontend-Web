import { Link, useLocation, useNavigate } from "react-router-dom";
import { BRAND_LOGO_SRC, BRAND_NAME } from "../brand";
import { useAuth } from "../context/AuthContext";
import "./AppNavbar.css";

export function AppNavbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const showLogout = Boolean(session?.token);
  const showLoginCta = pathname === "/signup" && !showLogout;
  const showSignUpCta = pathname === "/login" && !showLogout;

  function renderNavAction() {
    if (showLogout) {
      return (
        <button type="button" className="app-navbar-logout" onClick={handleLogout}>
          Logout
        </button>
      );
    }
    if (showLoginCta) {
      return (
        <p className="app-navbar-cta" aria-label="Account">
          <span className="app-navbar-cta-text">Already have an account?</span>
          <Link className="app-navbar-cta-link" to="/login">Log In</Link>
        </p>
      );
    }
    if (showSignUpCta) {
      return (
        <p className="app-navbar-cta" aria-label="Account">
          <span className="app-navbar-cta-text">Don&apos;t have an account?</span>
          <Link className="app-navbar-cta-link" to="/signup">Sign Up</Link>
        </p>
      );
    }
    return null;
  }

  return (
    <header className="app-navbar" role="banner">
      <Link className="app-navbar-brand" to="/">
        <img src={BRAND_LOGO_SRC} alt="" width={32} height={32} className="app-navbar-logo" />
        <span className="app-navbar-title">{BRAND_NAME}</span>
      </Link>
      {renderNavAction()}
    </header>
  );
}
