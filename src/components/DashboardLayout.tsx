import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BRAND_LOGO_SRC, BRAND_NAME } from "../brand";
import { useAuth } from "../context/AuthContext";
import "./DashboardLayout.css";

function IconCompass() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/dashboard/discover", label: "Discover", icon: <IconCompass /> },
  { to: "/dashboard/matches", label: "Matches", icon: <IconHeart /> },
  { to: "/dashboard/messages", label: "Messages", icon: <IconChat /> },
  { to: "/dashboard/profile", label: "Profile", icon: <IconUser /> },
] as const;

const SECTION_LABELS: Record<string, string> = {
  "/dashboard/discover": "Discover Jobs",
  "/dashboard/matches": "Your Matches",
  "/dashboard/messages": "Messages",
  "/dashboard/profile": "Profile",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName = session?.name ?? "User";
  const email = session?.email ?? "";
  const initials = getInitials(displayName);
  const sectionLabel = SECTION_LABELS[location.pathname] ?? "Dashboard";

  return (
    <div className={`dash-root${collapsed ? " dash-root--collapsed" : ""}`}>
      <aside className="dash-sidebar" aria-label="Dashboard navigation">
        {/* Top glow accent */}
        <div className="dash-sidebar-glow" aria-hidden />

        {/* Logo + collapse button */}
        <div className="dash-logo">
          <div className="dash-logo-icon-wrap">
            <img src={BRAND_LOGO_SRC} alt="" width={28} height={28} />
          </div>
          <span className="dash-logo-name">{BRAND_NAME}</span>
          <button
            type="button"
            className="dash-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="dash-collapse-chevron">
              <IconChevron />
            </span>
          </button>
        </div>

        {/* Nav */}
        <nav className="dash-nav" aria-label="Main">
          <span className="dash-nav-section-label">MAIN MENU</span>
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `dash-nav-item${isActive ? " dash-nav-item--active" : ""}`
              }
              title={collapsed ? label : undefined}
            >
              <span className="dash-nav-icon">{icon}</span>
              <span className="dash-nav-text">{label}</span>
              <span className="dash-nav-active-dot" aria-hidden />
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div className="dash-spacer" />

        {/* User card */}
        <div className="dash-user">
          <div className="dash-user-avatar" aria-hidden title={displayName}>
            {initials}
          </div>
          <div className="dash-user-info">
            <p className="dash-user-name">{displayName}</p>
            <p className="dash-user-email">{email}</p>
          </div>
          <button
            type="button"
            className="dash-logout-btn"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
          >
            <IconLogout />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <div className="dash-topbar-left">
            <h1 className="dash-topbar-title">{sectionLabel}</h1>
          </div>
          <div className="dash-topbar-right">
            <div className="dash-topbar-user">
              <span className="dash-topbar-name">{displayName}</span>
              <div className="dash-topbar-avatar" aria-hidden>{initials}</div>
            </div>
          </div>
        </header>

        <div className="dash-outlet">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
