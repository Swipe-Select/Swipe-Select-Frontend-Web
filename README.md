# Swipe Select — Web frontend

React (Vite) client for **Swipe Select**. It talks **only** to the **Swipe-Select-Backend** API (not the Python scraper). See **`docs/AGENTS.md`** for structure, routes, and integration rules.

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
