# Swipe Select — Web Frontend

Modern React (Vite + TypeScript) client for **Swipe Select** — the AI-powered job discovery platform with real-time fraud detection and ATS resume synthesis.

See **[`docs/AGENTS.md`](docs/AGENTS.md)** for architecture, routing, and backend/ML integration details.

---

## Features & Core Capabilities

- **Auth & Session Rehydration:** Email/password authentication, Google OAuth integration, `localStorage` session caching, and automated `GET /api/auth/profile` rehydration.
- **Polished 13-Step Onboarding:** Comprehensive career preferences setup with PDF resume extraction (`POST /api/onboarding/resume-extract`), refined personal & contact info screens, and streamlined experience level selection cards.
- **Swipe-Based Job Discovery (`/dashboard/discover`):** Tinder-style swipe interface for aggregated jobs (Indeed, LinkedIn, Rozee) with live **ModernBERT fraud detection** badges.
- **Matches & Saved Jobs (`/dashboard/matches`):** Complete tracking for liked and applied postings.
- **AI Career Intelligence Studio (`/dashboard/ai-tools`):**
  - **AI Resume Studio (Qwen2.5-3B):** Generates role-tailored bullet points, summaries, and full ATS-optimized resumes with live PDF preview and download.
  - **Fake Job Authenticity Verifier (ModernBERT):** Deep transformer sequence classification screening listings against 50,000+ known recruitment scams.
- **Profile & Settings (`/dashboard/profile`):** Base resume PDF management, user credentials, and platform preferences.

---

## Architecture & Routes

| Path | Component | Access | Description |
|---|---|---|---|
| `/` | `WelcomePage` | Public | Interactive landing page with preview swipe deck |
| `/login` | `LoginPage` | Public | User sign-in |
| `/signup` | `SignUpPage` | Public | Account creation |
| `/onboarding` | `OnboardingPage` | Authenticated | 13-step profile builder (Steps 0–12) |
| `/onboarding/complete` | `PostOnboardingPage` | Authenticated | Onboarding completion & dashboard handoff |
| `/dashboard/discover` | `JobSwipePage` | Completed Profile | Main swipe deck with ModernBERT verification |
| `/dashboard/matches` | `MatchesPage` | Completed Profile | Liked & applied job listings |
| `/dashboard/ai-tools` | `AiToolsPage` | Completed Profile | AI Resume Studio & Fake Job Verifier |
| `/dashboard/profile` | `ProfilePage` | Completed Profile | Profile settings & stored base resume |

---

## Service Integrations & Ports

| Service | Port | Description |
|---|---|---|
| **Frontend Web** | `http://localhost:5173` | Vite development server |
| **Backend API** | `http://localhost:5002` | Express & Node.js backend connected to MongoDB |
| **MongoDB** | `127.0.0.1:27017` | Database storing users, preferences, and matched jobs |
| **Job Scraper** | `http://localhost:5001` | Flask & JobSpy microservice scraping Indeed/LinkedIn/Rozee |
| **ML Microservice** | `http://localhost:8000` | FastML server running ModernBERT & Qwen2.5-3B |

---

## Quick Links & Documentation

| Document | Purpose |
|---|---|
| [`docs/AGENTS.md`](docs/AGENTS.md) | Agent guide, system conventions, ML/Scraper connectivity |
| [`docs/auth.md`](docs/auth.md) | Authentication flows, session storage, and security contracts |
| [`docs/onboarding.md`](docs/onboarding.md) | Step-by-step onboarding breakdown, schemas, and UI design |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev      # http://localhost:5173

# Production build & linting
npm run build
npm run lint
```
