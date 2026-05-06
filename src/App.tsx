import { useMemo, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { AppNavbar } from "./components/AppNavbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { SignUpPage } from "./pages/SignUpPage";
import { PostOnboardingPage } from "./pages/PostOnboardingPage";
import { JobSwipePage } from "./pages/JobSwipePage";
import { WelcomePage } from "./pages/WelcomePage";

const ROUTE_ORDER: Record<string, number> = {
  "/": 0,
  "/welcome": 0,
  "/login": 1,
  "/signup": 2,
  "/onboarding": 3,
  "/onboarding/complete": 4,
  "/discover": 5,
};

function AppRoutes() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathRef = useRef(location.pathname);

  const transitionClass = useMemo(
    () => {
      const prevPath = prevPathRef.current;
      const prevOrder = ROUTE_ORDER[prevPath] ?? 0;
      const nextOrder = ROUTE_ORDER[location.pathname] ?? 0;
      const isBackNavigation = navigationType === "POP" || nextOrder < prevOrder;
      prevPathRef.current = location.pathname;
      return isBackNavigation ? "route-transition-back" : "route-transition-forward";
    },
    [location.pathname, navigationType],
  );

  return (
    <div className="app-main">
      <div key={location.pathname} className={`route-transition ${transitionClass}`}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/complete"
            element={
              <ProtectedRoute>
                <PostOnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <JobSwipePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-viewport">
        <AppNavbar />
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
