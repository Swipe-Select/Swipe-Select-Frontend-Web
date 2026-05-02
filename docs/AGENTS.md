# AGENTS.md — Swipe Select Frontend Web

This file is the authoritative reference for any AI agent or developer working on this repository. Read it before making changes.

---

## Project overview

**Swipe Select** is a job-discovery web app that lets users swipe through AI-matched job listings. This repo contains the complete React/TypeScript frontend.

---

## Tech stack

| Tool | Version | Role |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | ~6.0 | Type safety |
| React Router DOM | 7 | Client-side routing |
| Vite | 8 | Dev server & bundler |
| ESLint | 9 | Linting |

---

## Project structure

```
src/
  App.tsx                    # Root router (`ProtectedRoute` on onboarding + discover)
  components/ProtectedRoute.tsx   # JWT gate for private routes
  main.tsx                   # Vite entry (`AuthProvider`, optional `GoogleOAuthProvider`)
  api/types.ts               # `AuthUserPayload`, `UserProfile`, `UserPreferences` (mirror backend User)
  api/jobs.ts                # GET recommended, POST refresh & swipe
  auth/onboardingStep.ts     # ONBOARDING_COMPLETE_STEP (= 13)
  auth/normalizeSession.ts   # `normalizeAuthPayload`, `mergeProfileIntoSession`, profile/prefs guards
  brand.ts                   # BRAND_NAME, BRAND_LOGO_SRC constants
  figma/
    authAssets.ts            # Login & Sign-up SVG/image URLs
    onboardingAssets.ts      # All onboarding SVG/image URLs
    welcomeAssets.ts         # Welcome page SVG/image URLs
  pages/
    WelcomePage.tsx/.css     # Landing page (/  and /welcome)
    LoginPage.tsx/.css       # Sign-in page (/login)
    SignUpPage.tsx/.css      # Registration page (/signup)
    OnboardingPage.tsx/.css  # 13-step onboarding flow (/onboarding)
    PostOnboardingPage.tsx/.css  # Completion screen (/onboarding/complete)
    JobSwipePage.tsx/.css    # Job swipe interface (/discover)
docs/
  AGENTS.md                  # This file
  auth.md                    # Auth screens reference
  onboarding.md              # Onboarding flow reference
```

---

## Routes

| Path | Component | Auth | Description |
|---|---|---|---|
| `/` | `WelcomePage` | Public | Landing page |
| `/welcome` | `WelcomePage` | Public | Alias for `/` |
| `/login` | `LoginPage` | Public | Email/password sign-in |
| `/signup` | `SignUpPage` | Public | Registration → session then `/onboarding` on success |
| `/onboarding` | `OnboardingPage` | **Required** | Steps 0–12 |
| `/onboarding/complete` | `PostOnboardingPage` | **Required** | Completion screen |
| `/discover` | `JobSwipePage` | **Required** | Job swipe UI |
| `*` | redirect | Public | Unknown path → `/` |

`ProtectedRoute` checks JWT in React context / `localStorage`; missing token → redirect to `/login`.

---

## Onboarding step map

`OnboardingPage` renders one step at a time using a local `step` integer (`useState(0)`). Steps are advanced with `next()` and reversed with `back()`.

| `step` | Screen |
|---|---|
| 0 | Identity (gender) |
| 1 | Resume Upload |
| 2 | Personal Info |
| 3 | Notifications |
| 4 | Work Experience |
| 5 | Ready ("You're almost ready to swipe!") |
| 6 | Role Selection |
| 7 | Country / Visa Setup |
| 8 | Location |
| 9 | Target Locations |
| 10 | Work Preference |
| 11 | Employment Models |
| 12 | Experience Level → `finish()` → `/onboarding/complete` |

See `docs/onboarding.md` for full step-by-step detail.

---

## Connectivity & known quirks

- **`onboardingStep`:** finishing onboarding calls `POST /api/onboarding/preferences` with **`onboardingStep: 13`** (see `src/auth/onboardingStep.ts`). Login/Google redirect to **`/discover`** only when **`onboardingStep >= 13`**, matching the backend jobs API gate.
- **Session rehydration:** `AuthProvider` calls **`GET /api/auth/profile`** on load when a token exists (`refreshSession` in `AuthContext`), merges **`onboardingStep`**, name, email, and full **`profile`** / **`preferences`** into `localStorage` via `mergeProfileIntoSession` (`src/auth/normalizeSession.ts`). Register/login/Google responses also persist **`profile`** and **`preferences`** when the API returns them (`normalizeAuthPayload`). After resume extract and after saving preferences, `OnboardingPage` updates those objects in session from the response **`data`**.
- **`/discover`:** `JobSwipePage` uses **`GET /api/jobs/recommended`**, **`POST /api/jobs/refresh`**, and **`POST /api/jobs/:jobId/swipe`** (`src/api/jobs.ts`). **`401`** clears the session and sends the user to **`/login`**. Pass / save / apply map to **`pass`**, **`like`**, **`apply`**.
- **`View Profile`** on `/onboarding/complete` navigates to **`/`** (Welcome). There is **no `/profile` route yet** — copy on that button describes “completed profile”; product may add a dedicated profile route later.
- **Google OAuth:** wired in **`AuthContext`** and the backend; the **Google** button shows on login/sign-up when **`VITE_GOOGLE_CLIENT_ID`** is set (`GoogleOAuthProvider` in `src/main.tsx`).
- **Backend vs docs:** onboarding **resume extraction** accepts **PDF, 5 MB**; older copy sometimes mentioned DOCX/10 MB — **`docs/onboarding.md`** aligns with implementation.

## Brand & design conventions

### Colours (CSS custom properties on `.onb`)

| Variable | Hex | Usage |
|---|---|---|
| `--onb-brand` | `#4648d4` | All primary CTA buttons |
| `--onb-brand-hover` | `#3d3fbb` | Primary button hover |
| `--onb-indigo` | `#6366f1` | Secondary accent (selected states) |
| `--onb-slate-900` | `#0f172a` | Body text |
| `--onb-slate-600` | `#64748b` | Muted / sub-copy text |
| `--onb-slate-200` | `#e2e8f0` | Borders / dividers |
| `--onb-white` | `#ffffff` | Card backgrounds |
| `--onb-bg` | `#f8fafc` | Page background |

### Button classes

| Class | Description |
|---|---|
| `onb-btn` | Base reset (no border, no background) |
| `onb-btn-primary` | Filled pill — uses `--onb-indigo` |
| `onb-btn-primary--brand` | Override to `--onb-brand` (#4648d4) — **use this on all forward-navigation CTAs** |
| `onb-btn-ghost` | Transparent with no border — used for Back buttons |
| `onb-flex-gap` | `display:flex; gap:8px; align-items:center` utility |

### Primary button rule

Every "Continue", "Save Preferences", "Save Preference", "Save & Continue", "Save & Continue →", and "Continue to Profile" button **must** use both `onb-btn-primary` **and** `onb-btn-primary--brand`. Do not use inline `background` colours.

---

## What has been intentionally removed

The following UI elements were removed during the April 2026 design refinement. Do **not** re-add them:

| Removed element | Affected steps |
|---|---|
| "Identify as female / male / …" subtitle text under identity cards | Step 0 |
| Profile Setup sidebar (Basic Info / Identity / Experience) | Steps 0, 11 |
| "Step X of Y" text labels | Steps 7, 12 |
| Top gradient progress bar strips | Steps 1, 6, 9 |
| Segment pill progress indicators | Step 6 |
| Progress bar above Experience Level | Step 12 |
| "Polish with AI" button next to Description field | Step 4 |
| AI Assistant / Preview right sidebar | Step 4 |
| Analysis / Smart Matching Active right sidebar | Step 9 |
| "Save Changes" header button | Step 9 |
| "Skip Step" button | Step 7 |
| "Skip" button | Step 8 |

---

## Docs

| File | Contents |
|---|---|
| `docs/auth.md` | Welcome, Sign-up, and Login screen reference |
| `docs/onboarding.md` | Full 13-step onboarding flow reference |
| `docs/AGENTS.md` | This file — repo-wide conventions for agents and developers |

---

## Development commands

```bash
npm install       # install dependencies
npm run dev       # start dev server (http://localhost:5173)
npm run build     # TypeScript compile + Vite production build
npm run preview   # preview production build locally
npm run lint      # run ESLint
```

---

## Agent instructions

- Read `docs/auth.md` and `docs/onboarding.md` before editing any page in `src/pages/`.
- All primary CTA buttons must use `onb-btn-primary onb-btn-primary--brand`. Never use inline `background` hex values for brand buttons.
- Do not re-introduce any of the UI listed in the "What has been intentionally removed" table above.
- Do not modify `src/brand.ts` constants.
- Assets are managed via `src/figma/*.ts` files — all image URLs live there, not inline.
- Keep step numbering in `OnboardingPage` contiguous (0–12); do not add gaps.
- CSS for onboarding lives entirely in `OnboardingPage.css` using the `onb-*` namespace — do not add inline styles for things already covered by a utility class.
