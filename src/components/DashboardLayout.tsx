import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { 
  Compass, 
  Heart, 
  Sparkles, 
  User, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Settings
} from "lucide-react";
import { BRAND_NAME } from "../brand";
import { useAuth } from "../context/AuthContext";
import { SwipeSelectLogo } from "./SwipeSelectLogo";
import "./DashboardLayout.css";

const NAV_ITEMS = [
  { to: "/dashboard/discover", label: "Discover", icon: <Compass size={19} /> },
  { to: "/dashboard/matches", label: "Matches", icon: <Heart size={19} /> },
  { to: "/dashboard/ai-tools", label: "AI Tools", icon: <Sparkles size={19} /> },
  { to: "/dashboard/profile", label: "Settings", icon: <Settings size={19} /> },
] as const;

const SECTION_LABELS: Record<string, string> = {
  "/dashboard/discover": "Discover & Swipe Jobs",
  "/dashboard/matches": "Your Matches & Saved Jobs",
  "/dashboard/ai-tools": "AI Tools & Resume Studio",
  "/dashboard/profile": "Settings & Profile",
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
          <Link to="/" className="dash-logo-icon-wrap" title="Go to home">
            <SwipeSelectLogo size={26} showText={false} />
          </Link>
          <span className="dash-logo-name">{BRAND_NAME}</span>
          <button
            type="button"
            className="dash-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="dash-nav" aria-label="Main">
          <span className="dash-nav-section-label">{collapsed ? "•••" : "MAIN MENU"}</span>
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

        {/* User card at bottom */}
        <div className="dash-user">
          <Link to="/dashboard/profile" className="dash-user-link">
            <div className="dash-user-avatar" aria-hidden title={displayName}>
              {initials}
            </div>
            <div className="dash-user-info">
              <p className="dash-user-name">{displayName}</p>
              <p className="dash-user-email">{email}</p>
            </div>
          </Link>
          <button
            type="button"
            className="dash-logout-btn"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <div className="dash-topbar-left">
            {collapsed && (
              <button
                type="button"
                className="dash-topbar-expand"
                onClick={() => setCollapsed(false)}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <ChevronRight size={18} />
              </button>
            )}
            <div>
              <div className="dash-topbar-breadcrumb">
                <span>Workspace</span>
                <span className="dash-topbar-sep">/</span>
                <span className="dash-topbar-curr">{sectionLabel.split(" ")[0]}</span>
              </div>
              <h1 className="dash-topbar-title">{sectionLabel}</h1>
            </div>
          </div>

          <div className="dash-topbar-right">
            {/* Live Model Status Pill */}
            <div className="dash-topbar-status-pill" title="ModernBERT & Qwen2.5-3B microservices operational">
              <span className="dash-status-dot" aria-hidden />
              <span>AI Models Active</span>
            </div>

            <Link to="/dashboard/profile" className="dash-topbar-user" title="View profile">
              <span className="dash-topbar-name">{displayName}</span>
              <div className="dash-topbar-avatar" aria-hidden>{initials}</div>
            </Link>
          </div>
        </header>

        <div className="dash-outlet">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
