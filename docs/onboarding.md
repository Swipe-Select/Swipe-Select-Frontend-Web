# Onboarding — Swipe Select

## Implementation notes (frontend)

The step-by-step sections below describe the UI; these bullets match **current code** in `OnboardingPage.tsx`:

- **Resume (step 1):** Backend accepts **PDF only**, **5 MB** (`POST /api/onboarding/resume-extract`). Continue is disabled while upload/extract runs; user advances manually (no auto-advance after extract). "Fill out manually" skips extraction. Later steps use per-step validation before Continue.
- **Personal Info (step 2):** Clean, symmetrical layout divided into **Basic Details** (`Public Profile`) and **Contact & Communication** (`Private & Secure`) with enterprise privacy confirmation. Zero-scroll design with perfectly aligned input icons and country phone prefix selector.
- **Work experience (step 4):** Multiple cards via **Add Work Experience**; Continue requires at least one **complete** entry (required fields filled).
- **Work preference (step 10):** **Multi-select** among remote / hybrid / office; saved as `workMode` on `POST /api/onboarding/preferences`.
- **Employment Models (step 11):** Multi-select among Full Time, Contract, Part Time, and Internship.
- **Experience level (step 12):** **Single-select** with role-level category icons (`Sparkles`, `Briefcase`, `Award`), year badges, and concise single-line impact statements (no bulky bullet lists). Continue disabled until one level is selected.
- **Application setup (step 7):** Country search and add/remove; selected countries show summary cards **without** per-country visa dropdowns.
- **Motion:** Step content uses `OnboardingPage.css` stage styling. App-level route slide transitions come from `App.tsx` + `index.css` (`route-transition-forward` / `route-transition-back`, `--motion-*` tokens, `prefers-reduced-motion`).
- **Footer layout:** `.onb-step-stage` is a flex column (`display: flex; flex-direction: column`) so that `.onb-footer` with `margin-top: auto` sticks to the bottom of the viewport on all steps.
- **`finish()`** calls `POST /api/onboarding/preferences` with `jobTitles`, `targetCountries`, `baseLocation`, `workLocations`, `workMode`, `jobTypes`, `experienceLevel`, and **`onboardingStep: 13`** (see `src/auth/onboardingStep.ts`; aligns with `GET /api/jobs/recommended` when `onboardingStep >= 13`).
- **Session:** After resume extract, **`profile`** in `localStorage` is updated from response `data`. After preferences save, **`preferences`** and **`onboardingStep`** update from response `data` (`AuthContext`, `src/auth/normalizeSession.ts`, `src/api/types.ts`).

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
step 2  → Personal & Contact Info
step 3  → Notifications (Skipped/Internal)
step 4  → Work Experience
step 5  → Ready screen ("You're almost ready to swipe!")
step 6  → Role Selection
step 7  → Application setup (target countries)
step 8  → Location (Live Map)
step 9  → Target Locations (Live Map)
step 10 → Work Preference
step 11 → Employment Models
step 12 → Experience Level
         → /onboarding/complete → /dashboard/discover
```

---

## Step-by-step breakdown

### Step 0 — Identity

**Headline:** "How do you identify?"  
**Sub-copy:** Explains the information is private by default.

**Options (single row of three on desktop):**
- Male
- Female
- Non-binary

Each card shows a gender avatar/icon, label, and clean radio indicator. Selected card highlights in brand indigo.

---

### Step 1 — Resume Upload

**Headline:** "Upload your resume"  
**Sub-copy:** "We'll automatically extract your details and set up your professional profile."

- Drag-and-drop zone with PDF-only validator (max 5 MB).
- "Browse Files" button.
- "Don't have a resume ready? Fill out manually" bypass option.

---

### Step 2 — Personal & Contact Info ("A little about you")

**Headline:** "A little about you"  
**Sub-copy:** "This helps us verify your professional profile and keep your account secure."

- **Basic Details Group (`Public Profile` badge):**
  - Full Name input with leading icon and clean placeholder.
- **Contact & Communication Group (`Private & Secure` badge):**
  - Work Email with `Verification Required` label.
  - Phone Number with custom country code dropdown (`PK +92`, `US +1`, etc.) and number input.
- **Enterprise-Grade Privacy Notice:**
  - Security checkmark confirming confidential candidate status.
- Designed to fit symmetrically within standard viewports without page scroll.

---

### Step 4 — Work Experience

**Headline:** "Work Experience"  
**Sub-copy:** "Detail your professional roles, duties, and achievements."

- Multi-entry card manager with Add/Remove capabilities.
- Fields: Job Title, Employer, Start/End dates (Present checkbox), Location, Description.
- Validates at least one valid entry before Continue.

---

### Step 5 — Ready screen

**Headline:** "You're almost ready to swipe!"  
**CTA:** Let's Go → advances to step 6.

---

### Step 6 — Role Selection

**Headline:** "What are you looking for?"  
**Sub-copy:** "Select all the roles that align with your next career move."

- Multi-select interactive role cards with title, description, and preview tags.

---

### Step 7 — Application Setup (Countries)

**Headline:** "Where would you like to work?"  
- Country search and multi-tag chip selector.

---

### Step 8 & 9 — Location & Target Locations

- Live interactive map powered by `OnboardingLocationMap`.
- Address geocoding producing clean `"City, Country"` format for backend/scraper compatibility.

---

### Step 10 — Work Preference

**Headline:** "How do you prefer to work?"  
- Multi-select options: **Remote**, **Hybrid** *(Popular)*, **In Person**.

---

### Step 11 — Employment Models

**Headline:** "Employment Models"  
- Multi-select grid: **Full Time**, **Contract**, **Part Time**, **Internship**.

---

### Step 12 — Experience Level ("Define Your Experience Level")

**Headline:** "Define Your Experience Level"  
**Sub-copy:** "Select the level that best reflects your current professional journey."

Three clean, aesthetic cards designed to eliminate visual noise and heavy text:

| Level | Badge | Icon | Concise Impact Description |
|---|---|---|---|
| **Entry Level Professional** | `0–2 years` | `Sparkles` | Building core skills and learning best practices with mentorship. |
| **Mid-Level Professional** | `3–5 years` | `Briefcase` | Executing projects independently and delivering end-to-end impact. |
| **Senior Level Expert** | `5+ years` | `Award` | Architecting systems, guiding strategy, and leading initiatives. |

- **Single-select behavior** with responsive radio button indicators on the right.
- Perfectly balanced vertical spacing with no scroll required.
- Continue button persists `experienceLevel: [selectedLabel]` and triggers `finish()`.

---

## Completion — PostOnboardingPage (`/onboarding/complete`)

Celebratory completion screen navigating users directly into the `/dashboard/discover` swipe experience or `/dashboard/profile` settings.
