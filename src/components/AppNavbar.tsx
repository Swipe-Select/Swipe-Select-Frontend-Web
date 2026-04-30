import { Link, useLocation } from "react-router-dom";
import { BRAND_LOGO_SRC, BRAND_NAME } from "../brand";
import "./AppNavbar.css";

export function AppNavbar() {
  const { pathname } = useLocation();
  const showSignUpLoginCta = pathname === "/signup";

  return (
    <header className="app-navbar" role="banner">
      <Link className="app-navbar-brand" to="/">
        <img src={BRAND_LOGO_SRC} alt="" width={32} height={32} className="app-navbar-logo" />
        <span className="app-navbar-title">{BRAND_NAME}</span>
      </Link>
      {showSignUpLoginCta ? (
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
