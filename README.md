# Swipe Select — Web frontend

React (Vite) client for **Swipe Select**. It uses the **Swipe-Select-Backend** API only (not the Python scraper). See **`docs/AGENTS.md`** for structure and integration.

**Shipped in this repo:** email/password auth with **`localStorage`** session and **`GET /api/auth/profile`** rehydration; optional Google sign-in via env; **Welcome** swipeable job cards; **route slide transitions**; onboarding steps **0–12** with resume extract, preferences save, completion at **`onboardingStep: 13`**; **Discover** job swipe (`GET/POST` jobs API); **navbar Logout** after onboarding complete; **ProfilePage** (avatar, stats, skills, work exp, education — Edit Profile button wired but no backend endpoint yet; `/profile` route not added yet).

## Quick links

| Doc | Purpose |
|-----|---------|
| [`docs/AGENTS.md`](docs/AGENTS.md) | Conventions, connectivity, jobs + session behavior |
| [`docs/auth.md`](docs/auth.md) | Auth screens + **session / `profile` / `preferences`** |
| [`docs/onboarding.md`](docs/onboarding.md) | Onboarding steps + API contract notes |

## Environment

Copy **`.env.example`** → **`.env`** and set at least:

- **`VITE_API_URL`** — backend base URL (default in code: `http://localhost:5000`)
- **`VITE_GOOGLE_CLIENT_ID`** (optional) — enables Google sign-in UI

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Related repo

**Swipe-Select-Backend** — Express API, MongoDB, onboarding, jobs feed (calls scraper server-side).
