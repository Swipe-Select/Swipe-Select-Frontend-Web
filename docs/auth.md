# Auth — Swipe Select

Covers the screens users see **before onboarding**: landing, sign-up, and sign-in. **Email + password** is always available. **Google sign-in** is shown when **`VITE_GOOGLE_CLIENT_ID`** is set (see `.env.example`); when unset, only email/password appears.

---

## Routes

| Route | Component | File |
|---|---|---|
| `/` or `/welcome` | `WelcomePage` | `src/pages/WelcomePage.tsx` |
| `/signup` | `SignUpPage` | `src/pages/SignUpPage.tsx` |
| `/login` | `LoginPage` | `src/pages/LoginPage.tsx` |

**Protected client routes** (must be signed in — see `ProtectedRoute` in `src/App.tsx`): `/onboarding`, `/onboarding/complete`, `/discover`. Logged-out visits redirect to **`/login`**.

**Navbar (`AppNavbar`):** When `onboardingStep >= 13` (`ONBOARDING_COMPLETE_STEP` in `src/auth/onboardingStep.ts`), the header shows **Logout**, which clears the client session and navigates to **`/login`**.

---

## Screens

### 1. Welcome (`/`)

The public landing page. Split into two sections:

**Left — copy**
- Headline: "Ready?"
- Social proof line: "1.5 million users are waiting for you"
- Short description of the AI-driven matching engine
- Primary CTA:
  - **Start Swiping** → `/signup`

**Right — interactive preview**
- Stacked job cards with **swipe/drag** interaction (Pass / Apply drive card motion)
- Match-style metadata and skill tags per card (see `WelcomePage.tsx`)
- **Apply** routes to **`/signup`** for users who are not yet registered

**Styles:** `src/pages/WelcomePage.css`  
**Assets:** `src/figma/welcomeAssets.ts` (match badge, location/salary/type/experience icons, pass/apply icons, floating hint icon)

---

### 2. Sign Up (`/signup`)

Two-column layout with a sticky header and footer.

**Header**
- Brand logo + "Swipe Select" wordmark (left)
- "Already have an account? Log In" link to `/login` (right)

**Left column — product benefits**
- Heading: "Choose with confidence"
- Lead paragraph
- Three feature tiles: Tailored for you · Swipe-ready flow · Clear outcomes

**Right column — registration form**
- Heading: "Create your account"
- Fields: Full Name, Work Email, Password
- Primary **Sign Up** submit button
- Legal disclaimer linking to Terms of Service and Privacy Policy

**On submit:** `POST /api/auth/register` via `AuthContext.register`; on success the session is persisted (see **Session & backend user data** below) and navigation goes to **`/onboarding`** (blocked if registration fails).

**Footer**
- Copyright line
- Help Center · Contact Support links

**Styles:** `src/pages/SignUpPage.css`  
**Assets:** `src/figma/authAssets.ts` (`signUpAssets` — featureInsights, featureNetwork, featureCoaching)

---

### 3. Login (`/login`)

Single centered card layout.

**Card header**
- Brand logo (56 × 56)
- Headline: "Welcome Back"
- Subline: "Sign in to your Swipe Select account"

**Email/password form**
- Email address field (autocomplete: email)
- Password field with show/hide toggle (controlled by `showPassword` state)
- "Forgot Password?" link (href `#forgot`)
- Primary **Sign In to Swipe Select** submit button

**Card footer**
- "Don't have an account? Join Now" → `/signup`

**After successful login:** navigate to **`/discover`** if `onboardingStep >= 13` (saved with the session payload; matches backend jobs gate), otherwise **`/onboarding`**.

**Styles:** `src/pages/LoginPage.css`  
**Assets:** `src/figma/authAssets.ts` (`loginAssets` — passwordToggle icon)

---

## Session & backend user data

The client persists auth in **`localStorage`**, key **`swipe-select-session`** (`src/auth/storage.ts`), typed as **`AuthUserPayload`** in `src/api/types.ts`. Authenticated requests set **`Authorization: Bearer <token>`** (e.g. `src/api/client.ts`, onboarding upload helpers).

| Field | Source |
|---|---|
| `token`, `_id`, `name`, `email`, `onboardingStep` | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google` |
| `profile`, `preferences` | Same auth responses **when the backend includes them** (mirrors the `User` document). Also merged from **`GET /api/auth/profile`** on app load (`refreshSession` in `AuthContext`). |

Implementation:

- **`normalizeAuthPayload`** (`src/auth/normalizeSession.ts`) — runs on successful register/login/Google; copies **`profile`** and **`preferences`** from the API `data` object when present.
- **`mergeProfileIntoSession`** — runs after **`GET /api/auth/profile`**; updates identity fields plus **`profile`** / **`preferences`** without replacing the JWT.

Onboarding can further update session from API responses: **`OnboardingPage`** sets **`profile`** after **`POST /api/onboarding/resume-extract`** and **`preferences`** (and **`onboardingStep`**) after **`POST /api/onboarding/preferences`**.

The backend does **not** expose a separate “patch profile” endpoint for manual onboarding fields beyond what resume extract and preferences save; see `docs/onboarding.md` for contract notes.

---

## State

| Page | Local state | Purpose |
|---|---|---|
| `LoginPage` | `showPassword: boolean`, `email`, `password`, `pending`, `error` | Form + feedback |
| `SignUpPage` | `name`, `email`, `password`, `pending`, `error` | Controlled fields + API errors |
| `WelcomePage` | Card stack / pointer / swipe state | Interactive demo cards |

---

## Navigation flow

```
/ (WelcomePage)
  ├── Start Swiping ─────────────────→ /signup
  └── Apply (card preview) ─────────→ /signup

/signup (after successful registration)
  ├── Session stored → /onboarding
  └── Log In link ───────────────────→ /login

/login (after successful sign-in)
  ├── onboarding incomplete → /onboarding
  ├── onboarding complete (step ≥ 13) → /discover
  └── Join Now link ─────────────────→ /signup
```

---

## Design tokens (auth pages)

Auth pages use their own CSS files rather than the shared `onb-*` token system. Colours are defined as plain hex values within each stylesheet.

| Token usage | Value |
|---|---|
| Primary brand purple | `#4648d4` |
| Muted text | `#64748b` |
| Border / divider | `#e2e8f0` |
