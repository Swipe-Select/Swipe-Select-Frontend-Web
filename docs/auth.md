# Auth — Swipe Select

Covers the three screens a user sees before they ever reach onboarding: the landing/welcome page, the sign-up form, and the sign-in form.

---

## Routes

| Route | Component | File |
|---|---|---|
| `/` or `/welcome` | `WelcomePage` | `src/pages/WelcomePage.tsx` |
| `/signup` | `SignUpPage` | `src/pages/SignUpPage.tsx` |
| `/login` | `LoginPage` | `src/pages/LoginPage.tsx` |

---

## Screens

### 1. Welcome (`/`)

The public landing page. Split into two sections:

**Left — copy**
- Headline: "Ready?"
- Social proof line: "1.5 million users are waiting for you"
- Short description of the AI-driven matching engine
- Two CTAs:
  - **Start Swiping** → `/signup`
  - **Update Profile** → `/login`

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
- Divider: "or continue with"
- **Google** OAuth button
- Legal disclaimer linking to Terms of Service and Privacy Policy

**On submit:** `handleSubmit` prevents default and navigates to `/onboarding`.

**Footer**
- Copyright line
- Help Center · Contact Support links

**Styles:** `src/pages/SignUpPage.css`  
**Assets:** `src/figma/authAssets.ts` (`signUpAssets` — featureInsights, featureNetwork, featureCoaching, google logo)

---

### 3. Login (`/login`)

Single centered card layout.

**Card header**
- Brand logo (56 × 56)
- Headline: "Welcome Back"
- Subline: "Sign in to your Swipe Select account"

**Google OAuth**
- Full-width "Continue with Google" button

**Divider**
- "OR SIGN IN WITH EMAIL"

**Email/password form**
- Email address field (autocomplete: email)
- Password field with show/hide toggle (controlled by `showPassword` state)
- "Forgot Password?" link (href `#forgot`)
- Primary **Sign In to Swipe Select** submit button

**Card footer**
- "Don't have an account? Join Now" → `/signup`

**Styles:** `src/pages/LoginPage.css`  
**Assets:** `src/figma/authAssets.ts` (`loginAssets` — google logo, passwordToggle icon)

---

## State

| Page | Local state | Purpose |
|---|---|---|
| `LoginPage` | `showPassword: boolean` | Toggles `input type` between `password` and `text` |
| `SignUpPage` | — | Stateless; uses `useNavigate` to redirect on submit |
| `WelcomePage` | — | Fully static |

---

## Navigation flow

```
/ (WelcomePage)
  ├── Start Swiping ──────────────────→ /signup
  └── Update Profile ─────────────────→ /login

/signup
  ├── Submit form ────────────────────→ /onboarding
  └── Log In link ────────────────────→ /login

/login
  └── Join Now link ──────────────────→ /signup
```

---

## Design tokens (auth pages)

Auth pages use their own CSS files rather than the shared `onb-*` token system. Colours are defined as plain hex values within each stylesheet.

| Token usage | Value |
|---|---|
| Primary brand purple | `#4648d4` |
| Muted text | `#64748b` |
| Border / divider | `#e2e8f0` |
