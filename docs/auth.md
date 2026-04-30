# Auth — Swipe Select

Covers the three screens users see **before onboarding**: landing, sign-up, and sign-in (**email + password**; Google OAuth is **not shown** in the current UI).

---

## Routes

| Route | Component | File |
|---|---|---|
| `/` or `/welcome` | `WelcomePage` | `src/pages/WelcomePage.tsx` |
| `/signup` | `SignUpPage` | `src/pages/SignUpPage.tsx` |
| `/login` | `LoginPage` | `src/pages/LoginPage.tsx` |

**Protected client routes** (must be signed in — see `ProtectedRoute` in `src/App.tsx`): `/onboarding`, `/onboarding/complete`, `/discover`. Logged-out visits redirect to **`/login`**.

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

**Right — visual preview**
- Stacked card mockup showing a sample job match (98% match, Senior Product Designer at Google)
- Match metadata: location, salary range ($180k–$240k), job type, experience level
- Skill tags: Figma, Design Systems, Prototyping
- Pass / Apply buttons (Apply links to `/signup`)

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

**On submit:** `POST /api/auth/register` via `AuthContext.register`; on success the JWT is persisted and navigation goes to **`/onboarding`** (blocked if registration fails).

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

**After successful login:** navigate to **`/discover`** if `onboardingStep >= 2` (saved with the session payload), otherwise **`/onboarding`**.

**Styles:** `src/pages/LoginPage.css`  
**Assets:** `src/figma/authAssets.ts` (`loginAssets` — passwordToggle icon)

---

## State

| Page | Local state | Purpose |
|---|---|---|
| `LoginPage` | `showPassword: boolean`, `email`, `password`, `pending`, `error` | Form + feedback |
| `SignUpPage` | `name`, `email`, `password`, `pending`, `error` | Controlled fields + API errors |
| `WelcomePage` | — | Fully static |

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
  ├── onboarding complete (step ≥ 2) → /discover
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
