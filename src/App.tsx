import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppNavbar } from "./components/AppNavbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { SignUpPage } from "./pages/SignUpPage";
import { PostOnboardingPage } from "./pages/PostOnboardingPage";
import { JobSwipePage } from "./pages/JobSwipePage";
import { WelcomePage } from "./pages/WelcomePage";

function App() {
  return (
    <BrowserRouter>
      <div className="app-viewport">
        <AppNavbar />
        <div className="app-main">
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
    </BrowserRouter>
  );
}

export default App;
