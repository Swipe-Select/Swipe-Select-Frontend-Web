import { useMemo, useRef } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { AppNavbar } from "./components/AppNavbar";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { LoginPage } from "./pages/LoginPage";
import { MatchesPage } from "./pages/MatchesPage";
import { MessagesPage } from "./pages/MessagesPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PostOnboardingPage } from "./pages/PostOnboardingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { JobSwipePage } from "./pages/JobSwipePage";
import { SignUpPage } from "./pages/SignUpPage";
import { WelcomePage } from "./pages/WelcomePage";

const ROUTE_ORDER: Record<string, number> = {
  "/": 0,
  "/welcome": 0,
  "/login": 1,
  "/signup": 2,
  "/onboarding": 3,
  "/onboarding/complete": 4,
  "/dashboard": 5,
  "/discover": 5,
};

function AppRoutes() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathRef = useRef(location.pathname);

  // Use the top-level segment as the transition key so within-dashboard
  // navigation does not remount the DashboardLayout on every sub-route change.
  const topKey = "/" + (location.pathname.split("/")[1] ?? "");

  const transitionClass = useMemo(() => {
    const prevPath = prevPathRef.current;
    const prevTop = "/" + (prevPath.split("/")[1] ?? "");
    const prevOrder = ROUTE_ORDER[prevTop] ?? 0;
    const nextOrder = ROUTE_ORDER[topKey] ?? 0;
    const isBack = navigationType === "POP" || nextOrder < prevOrder;
    prevPathRef.current = location.pathname;
    return isBack ? "route-transition-back" : "route-transition-forward";
  }, [location.pathname, navigationType, topKey]);

  return (
    <div className="app-main">
      <div key={topKey} className={`route-transition ${transitionClass}`}>
        <Routes>
          {/* Public — always accessible */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/welcome" element={<WelcomePage />} />

          {/* Auth pages — redirect away if already logged in */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <SignUpPage />
              </PublicOnlyRoute>
            }
          />

          {/* Onboarding — needs auth; redirects to /dashboard if already complete */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute requireIncomplete>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/complete"
            element={
              <ProtectedRoute requireIncomplete>
                <PostOnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Legacy redirect — keeps old links working */}
          <Route path="/discover" element={<Navigate to="/dashboard/discover" replace />} />

          {/* Dashboard — needs auth + completed onboarding */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireCompleted>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="discover" replace />} />
            <Route path="discover" element={<JobSwipePage />} />
            <Route path="matches" element={<MatchesPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  const showNavbar = !pathname.startsWith("/dashboard");

  return (
    <div className="app-viewport">
      {showNavbar && <AppNavbar />}
      <AppRoutes />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
