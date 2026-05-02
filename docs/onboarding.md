# Onboarding — Swipe Select

## Current Status (May 2026)

This document contains legacy step details below. The current frontend behavior on `web-auth` differs in these important ways:

- Resume upload success advances to the "You're almost ready to swipe" path and does not require the old "A little about you" progression.
- "Fill out manually" routes into the manual onboarding path, and submit/continue actions are guarded by per-step validation.
- `finish()` sends normalized preference data to `POST /api/onboarding/preferences`, including:
  - `jobTitles`
  - `targetCountries`
  - `baseLocation` (from selected base location, not hardcoded empty)
  - `workLocations` (from selected target locations)
  - `workMode`, `jobTypes`, `experienceLevel`
  - **`onboardingStep: 13`** — matches the backend jobs gate (`onboardingStep >= 13` for `GET /api/jobs/recommended`); see `src/auth/onboardingStep.ts`.
- **Client session:** after a successful **resume extract**, **`profile`** in `localStorage` is updated from the API response **`data`**. After a successful **preferences** save, **`preferences`** and **`onboardingStep`** are updated from the response **`data`** (`AuthContext` / `src/auth/normalizeSession.ts` types in `src/api/types.ts`).
- The application setup UI (country selection and selected-country section) was refreshed with improved interaction behavior and subtle motion.
- Location UX is now general place search + explicit typed fallback behavior (not ZIP-only behavior).

Important contract note: manual frontend currently submits onboarding preferences only. Full `profile` arrays (e.g., `skills`, `education`, `workExperience`, `projects`, `certifications`, `interests`) are not written by this endpoint in the backend contract. The identity-step `gender` value is also not sent to the API (the backend preferences schema has no `gender` field); resume extraction may still set `profile.gender` when the PDF includes it.

Documents every step of the multi-screen onboarding flow that runs **after sign-up** when the user has a valid session. **`/onboarding` is protected** — unauthenticated users are sent to **`/login`**.

---

## Routes

| Route | Component | File |
|---|---|---|
| `/onboarding` | `OnboardingPage` | `src/pages/OnboardingPage.tsx` |
| `/onboarding/complete` | `PostOnboardingPage` | `src/pages/PostOnboardingPage.tsx` |

---

## Architecture

`OnboardingPage` is a **single-page, step-driven component**. It holds a `step` integer in local state (`useState(0)`) and conditionally renders the correct screen based on that value. Steps advance via `next()` (`Math.min(step + 1, 12)`) and regress via `back()` (`Math.max(step - 1, 0)`).

```
step 0  → Identity
step 1  → Resume Upload
step 2  → Personal Info
step 3  → Notifications
step 4  → Work Experience
step 5  → Ready screen ("You're almost ready to swipe!")
step 6  → Role Selection
step 7  → Country / Visa Setup
step 8  → Location
step 9  → Target Locations
step 10 → Work Preference
step 11 → Employment Models
step 12 → Experience Level
         → /onboarding/complete
```

---

## Shared state

| State variable | Type | Default | Purpose |
|---|---|---|---|
| `step` | `number` | `0` | Current step index |
| `gender` | `GenderId` | `"female"` | Identity selection |
| `notif` | `Record<string, boolean>` — keys: `appStatus`, `jobRec`, `appInfo` | Defaults: first two `true`, `appInfo` `false` |
| `roles` | `string[]` | `["Software Engineer", "Product Manager"]` | Selected job roles |
| `workPref` | `"remote" \| "hybrid" \| "office"` | `"hybrid"` | Work environment preference |
| `employment` | `string[]` | `["Full Time"]` | Employment model selection |
| `experience` | `string[]` | `["Entry Level Professional", "Mid-Level Professional"]` | Experience level selection |

**Default notification state (three toggles only):**  
`appStatus: true`, `jobRec: true`, `appInfo: false`

---

## Step-by-step breakdown

### Step 0 — Identity

**Headline:** "How do you identify?"  
**Sub-copy:** Explains the information is private by default.

**Options (single row of three on desktop; stacked on narrow view):**
- Male
- Female
- Non-binary

Each card shows a radio icon (on/off asset) and a label. The selected card gets an indigo border and indigo label colour. Subtitle descriptions ("Identify as female", etc.) have been **removed**.

**Buttons:** Back (disabled) · Continue

**Layout:** Full-height centred column. No sidebar.  
**CSS class:** `onb-gender-layout` / `onb-gender-main`

---

### Step 1 — Resume Upload

**Headline:** "Upload your resume"  
**Sub-copy:** "We'll automatically extract your details and set up your professional profile."

**Left card:**
- Drag-and-drop zone with cloud-upload icon
- **Implementation note:** the backend (`POST /api/onboarding/resume-extract`) accepts **PDF only**, max **5 MB**; UI copy should match.
- "Browse Files" button
- "Don't have a resume ready? Fill out manually" banner (skips extraction; user can still complete onboarding)

**Right card — "Why build your profile?"**
- Three feature rows with icons (fast setup, connections, AI matching)

**Navigation:** Help · Save & Exit (top bar)  
**CSS class:** `onb-resume-wrap` / `onb-resume-grid`

---

### Step 2 — Personal Info

Collects basic profile fields (name, location, contact, etc.).

---

### Step 3 — Notifications

**Headline:** Notification settings  
Single list of **three** toggles only (no grouped “Job / Messages / Security” sections):

| Toggle | Description line |
|---|---|
| Application Statuses | Stay informed about application statuses. |
| Job Recommendations | Receive job recommendations that fit your profile. |
| Application Info Alerts | Get alerted if an application needs more info. |

Each row: icon in a soft indigo circle · title · description · switch. Defaults: first two on, third off.

**Buttons:** Cancel (go back) · **Save Preferences** (brand purple `#4648d4`) → continues to step 4

### Step 4 — Work Experience

**Headline:** "Work Experience"  
**Sub-copy:** "Detail your professional roles, duties, and achievements."

Shows a pre-populated entry card (drag-handle, edit/delete icons) with fields:
- Job Title · Employer · Start Date · End Date (Present checkbox) · Location · Description

"Polish with AI" button has been **removed** from the Description field.

**Add Work Experience** dashed button at the bottom.

**Buttons:** Back · Continue

The AI Assistant / Preview right sidebar has been **removed**. The work experience panel is now full-width.

**CSS class:** `onb-we-layout` / `onb-we-main`

---

### Step 5 — Ready screen

**Headline:** "You're almost ready to swipe!"  
**CTA:** Let's Go → advances to step 6

Two feature cards: Personalized Matches · Instant Connect

---

### Step 6 — Role Selection

**Headline:** "What are you looking for?"  
**Sub-copy:** "Select all the roles that align with your next career move."

Grid of role cards, each with a title, description, and a "Learn More" chevron link. Selection toggles per-card. Multiple selections allowed.

**Available roles:** Software Engineer · Product Designer · Data Analyst · Product Manager · Marketing Director · UX Researcher

**Buttons:** Continue (top-right, brand purple)

No progress bar or step counter.

---

### Step 7 — Country / Visa Setup (Application Setup)

Two-panel layout:

**Left — Available Countries**
- Search field
- Scrollable country list (Canada, Australia, Germany) with add buttons
- Already-selected countries dimmed (United States, United Kingdom)

**Right — Selected Countries**
- Cards per selected country showing visa status dropdown and an info banner
- United States: Citizen / Permanent Resident (blue info)
- United Kingdom: Requires Visa Sponsorship (amber info)

**Buttons:** **Save & Continue** (brand purple). "Skip Step" button has been **removed**.

The "Step 3 of 5" badge in the header has been **removed**.

---

### Step 8 — Location ("Where are you based?")

Split screen:

**Left panel:**
- Back button
- Headline: "Where are you based?"
- City/zip search field
- Popular locations list (San Francisco, New York, London, Toronto, Sydney, Berlin) with selection state
- "Use current location" button
- **Continue** (full-width, brand purple)

The **Skip** button has been **removed**.

**Right panel:** Decorative map placeholder with concentric circles and a pin.

---

### Step 9 — Target Locations

Fixed top bar with brand name and help icon.

**Headline:** "Target Locations"  
**Sub-copy:** "Manage the cities or regions where you're open to new opportunities."

**Selected Locations panel:**
- Rows: Lahore, Pakistan (Primary badge) · Dubai, United Arab Emirates
- Add location button (indigo)
- Trash icon per row

**The Analysis / Smart Matching Active right sidebar has been removed.**

**Buttons:** Back · **Continue** (brand purple)

"Save Changes" button has been **removed**.

---

### Step 10 — Work Preference ("How do you prefer to work?")

Three-column card grid:

| Option | Key bullets |
|---|---|
| Remote | Maximum flexibility · Zero commute time · Global opportunities |
| Hybrid *(popular)* | Best of both worlds · Regular team connection · Structured flexibility |
| In Person | Dedicated workspace · Spontaneous collaboration · Clear work-life boundary |

Cards show icon, title, description, and bullet points. Selected card highlights in brand purple.

**Buttons:** ← Back · **Save Preference** → (brand purple `#4648d4`)

---

### Step 11 — Employment Models

**Headline:** "Employment Models"  
**Sub-copy:** "Select the types of employment you are currently considering."

Four cards in a 2 × 2 grid:

| Model | Tags |
|---|---|
| Full Time | Benefits included · W2 Status |
| Contract | 1099 or W2 · Flexible |
| Part Time | < 40 hours · Work-life balance |
| Internship | Learning focused · Entry level |

Each card has an icon, description, and tag pills. Multiple selection allowed. Checkbox (on/off) at top-right of each card.

**Buttons:** ← Back · **Save & Continue** → (brand purple)

The "Profile Setup" left sidebar (Basic Info / Job Preferences / Experience steps) has been **removed**.

---

### Step 12 — Experience Level ("Define Your Experience Level")

**Sub-copy:** "Help us tailor your dashboard by providing more context about your professional background."

Three selectable rows:

| Level | Years |
|---|---|
| Entry Level Professional | 0–2 years |
| Mid-Level Professional | 3–5 years |
| Senior Level Expert | 5+ years |

Each row shows a radio icon, title, year badge, and description. Multiple selection allowed.

**Buttons:** ← Back · **Continue to Profile** (brand purple) → calls `finish()` → navigates to `/onboarding/complete`

The "Step 2 of 5" label and progress bar above this screen have been **removed**.

---

## Completion — PostOnboardingPage (`/onboarding/complete`)

Centered card with:
- Check icon
- Headline: "You're all set!"
- Sub-copy: "Your profile is ready and you're all set to find your next dream job."

**Two action buttons:**
- **Explore Jobs** → `/discover`
- **View Profile** → `/` (**Welcome** — there is no standalone profile route yet; users remain authenticated)

**Footer buttons:** Back · **Finish** → `/discover`

---

## Navigation flow

```
/signup (success) or /login (success, onboarding not finished) → step 0 (Identity)
  → step 1 (Resume Upload)
  → step 2 (Personal Info)
  → step 3 (Notifications)
  → step 4 (Work Experience)
  → step 5 (Ready screen)
  → step 6 (Role Selection)
  → step 7 (Country / Visa Setup)
  → step 8 (Location)
  → step 9 (Target Locations)
  → step 10 (Work Preference)
  → step 11 (Employment Models)
  → step 12 (Experience Level)
  → /onboarding/complete
       ├── Explore Jobs / Finish ──────→ /discover
       └── View Profile ───────────────→ / (welcome — there is no dedicated profile URL yet)
```

---

## UI conventions

- **Primary action colour:** `#4648d4` (`--onb-brand`) via `onb-btn-primary--brand` class on all "Continue", "Save *", and "Save & Continue" buttons.
- **Ghost button:** `onb-btn-ghost` for Back buttons.
- **Removed UI from all steps:**
  - "Step X of Y" text labels
  - Top gradient / progress bar strips
  - Progress segment pill groups
  - Profile Setup sidebar (Basic Info / Identity / Experience)
  - Subtitle descriptions under gender identity cards ("Identify as female", etc.)
  - "Polish with AI" control
  - AI Assistant / Preview sidebar on Work Experience
  - Analysis / Smart Matching Active sidebar on Target Locations
  - "Skip Step" and "Skip" buttons
  - "Save Changes" header button on Target Locations

---

## Styles & assets

| File | Covers |
|---|---|
| `src/pages/OnboardingPage.css` | All onboarding step styles via `onb-*` CSS custom properties |
| `src/pages/PostOnboardingPage.css` | Completion page styles via `post-onb-*` classes |
| `src/figma/onboardingAssets.ts` | All SVG/image URLs (gender, resume, workExp, ready, roles, country, location, target, workPref, employment, experience, personal, etc.) |

**CSS custom properties (defined on `.onb`):**

| Variable | Value |
|---|---|
| `--onb-brand` | `#4648d4` |
| `--onb-brand-hover` | `#3d3fbb` |
| `--onb-indigo` | `#6366f1` |
| `--onb-slate-900` | `#0f172a` |
| `--onb-slate-600` | `#64748b` |
| `--onb-slate-200` | `#e2e8f0` |
| `--onb-white` | `#ffffff` |
| `--onb-bg` | `#f8fafc` |
