# AGENTS.md — Swipe Select Frontend Web

This file is the authoritative reference for any AI agent or developer working on this repository. Read it before making changes.

---

## Project overview

**Swipe Select** is an AI-powered job discovery platform that allows users to swipe through curated job opportunities, verify job authenticity against 50,000+ fraud patterns using fine-tuned **ModernBERT**, and synthesize tailored ATS resumes with **Qwen2.5-3B**.

---

## Tech stack

| Tool | Version | Role |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | ~6.0 | Type safety |
| React Router DOM | 7 | Client-side routing |
| Vite | 8 | Dev server & bundler |
| ESLint | 9 | Linting |
| Lucide React | Latest | Standard icon library |

---

## Project structure

```
src/
  App.tsx                    # Routes + ROUTE_ORDER forward/back route-transition-* wrapper
  components/
    AppNavbar.tsx            # Public top bar; Logout when onboarding complete
    DashboardLayout.tsx/.css # Collapsible sidebar, top status bar, breadcrumb nav
    ProtectedRoute.tsx       # JWT & onboarding completion guards
    ResumePaperTemplate.tsx  # Editable live ATS resume sheet & PDF export
    ResumeErrorBoundary.tsx  # Fault-tolerant wrapper for resume generation UI
  main.tsx                   # Vite entry (AuthProvider, GoogleOAuthProvider)
  index.css                  # Layout, typography, motion tokens, transitions
  api/
    client.ts                # Fetch wrapper with auto-auth headers & error handling
    types.ts                 # User, Job, Preference, and Match types
    jobs.ts                  # GET recommended, POST refresh, POST swipe
    ml.ts                    # ML client for ModernBERT fraud check & Qwen resume generation
  auth/
    onboardingStep.ts        # ONBOARDING_COMPLETE_STEP (= 13)
    normalizeSession.ts      # Auth payload normalization & session merging
    resumeStorage.ts         # Local base resume PDF storage & retrieval
    storage.ts               # LocalStorage session reader/writer
  brand.ts                   # BRAND_NAME constant
  figma/                     # SVG & image asset mappings
  pages/
    WelcomePage.tsx/.css     # Public landing page with interactive swipe deck
    LoginPage.tsx/.css       # Sign-in page (/login)
    SignUpPage.tsx/.css      # Registration page (/signup)
    OnboardingPage.tsx/.css  # 13-step onboarding flow (/onboarding)
    PostOnboardingPage.tsx/.css # Completion screen (/onboarding/complete)
    JobSwipePage.tsx/.css    # Core swipe interface (/dashboard/discover)
    MatchesPage.tsx/.css     # Saved matches & applications (/dashboard/matches)
    AiToolsPage.tsx/.css     # AI Resume Studio & Fake Job Verifier (/dashboard/ai-tools)
    ProfilePage.tsx/.css     # User profile settings & base resume manager (/dashboard/profile)
docs/
  AGENTS.md                  # This file
  auth.md                    # Auth screens reference
  onboarding.md              # Onboarding flow reference
```

---

## Routes & Navigation

| Path | Component | Guard | Description |
|---|---|---|---|
| `/` | `WelcomePage` | Public | Interactive landing page with preview swipe deck |
| `/login` | `LoginPage` | `PublicOnlyRoute` | User sign-in |
| `/signup` | `SignUpPage` | `PublicOnlyRoute` | Account registration |
| `/onboarding` | `OnboardingPage` | `ProtectedRoute (requireIncomplete)` | 13-step onboarding flow (Steps 0–12) |
| `/onboarding/complete` | `PostOnboardingPage` | `ProtectedRoute (requireIncomplete)` | Completion celebration & handoff |
| `/discover` | redirect | Public | Redirects to `/dashboard/discover` |
| `/dashboard` | `DashboardLayout` | `ProtectedRoute (requireCompleted)` | Main application workspace |
| `/dashboard/discover` | `JobSwipePage` | `ProtectedRoute (requireCompleted)` | Main swipe feed with live ModernBERT checking |
| `/dashboard/matches` | `MatchesPage` | `ProtectedRoute (requireCompleted)` | Saved, liked, and applied jobs |
| `/dashboard/ai-tools` | `AiToolsPage` | `ProtectedRoute (requireCompleted)` | AI Career Intelligence Studio |
| `/dashboard/profile` | `ProfilePage` | `ProtectedRoute (requireCompleted)` | Profile settings & stored base resume |

---

## Service Integrations & Ports

- **Frontend Dev Server:** `http://localhost:5173`
- **Backend API:** `http://localhost:5002` (Proxies requests to MongoDB, Scraper, and ML server)
- **MongoDB Server:** `127.0.0.1:27017`
- **Web Scraper (JobSpy microservice):** `http://localhost:5001` (Invoked by backend `POST /api/jobs/refresh`)
- **ML Server (FastML):** `http://localhost:8000` (ModernBERT on `/predict/fake-job` and Qwen2.5-3B on `/generate/resume`)

---

## ModernBERT Fraud Detection Flow in JobSwipePage

1. When the Discover feed loads or updates from scraper ingestion, `JobSwipePage` evaluates the topmost cards.
2. For unchecked cards, `checkFakeJobs()` calls `predictFakeJob()` via `/api/ml/predict/fake-job`.
3. While the prediction is pending:
   - The badge shows `.job-swipe-badge--checking` with text `"Checking with ModernBERT..."`.
   - The indicator dot `.job-swipe-checking-dot` pulses using `animation: pulseGlow 1.5s infinite`.
4. When the prediction resolves:
   - **Authentic (`isFake === false`):** Shows green badge `Authentic (xx%)` with `ShieldCheck` icon.
   - **Suspicious (`isFake === true`):** Shows red badge `Suspicious Posting` with `AlertTriangle` icon.
5. If the ML server on port 8000 is offline or in Standby, the request gracefully times out and falls back cleanly without breaking the swipe interaction.

---

## AI Career Intelligence Studio (`/dashboard/ai-tools`)

- Zero-scroll layout: Header, model health badges, section selector, job inputs, and CTA buttons fit completely within the viewport.
- Base Resume strip: Integrates active PDF from profile settings with quick View modal and tailoring toggle.
- 1-Click Role Presets: Placed inline within the Target Job Title row (`[Frontend]`, `[AI/ML]`).
- Live Resume Output: Features split before/after view, full ATS PDF preview with client-side export, and raw editable text mode.

---

## Onboarding UI Standards & Conventions

1. **Step 2 (Personal / Contact Info):**
   - Clean floating icon inputs with no overlapping text.
   - Sectioned into **Basic Details** (Public Profile) and **Contact & Communication** (Private & Secure).
   - Enterprise-grade privacy badge with balanced vertical padding to eliminate unnecessary scrolling.
2. **Step 12 (Experience Level):**
   - Concise single-line descriptions focusing on concrete responsibilities.
   - Rich category icons (`Sparkles`, `Briefcase`, `Award`) and year chips (`0-2 years`, `3-5 years`, `5+ years`).
   - Clean radio indicators on the right for intuitive single-select interaction.
3. **Primary CTA Buttons:**
   - Must use `onb-btn-primary onb-btn-primary--brand`. Inline background hex codes are forbidden.
