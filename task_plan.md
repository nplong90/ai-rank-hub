# Task Plan: AI Repo & Tool Ranking Hub (GitHub Pages + Ref Engine)

## Goal
Build a static, high-performance GitHub Pages web app cloning GoodAIList's core features (trending AI repos, stars growth 1d/7d, categories, search/filter) with UI/UX Pro Max OLED Dark theme and built-in affiliate/ref slots (Cloud Deploy & LLM API keys).

## Architecture
- **Host:** GitHub Pages (Zero hosting cost, fast global CDN).
- **Data Pipeline:** Python crawler script (local / GitHub Actions cron every 6-12h) fetching top AI repos via GitHub Search API / GoodAIList seeds, caching to `data/repos.json`.
- **Frontend:** Single Page App (Vanilla HTML/CSS/JS + Chart.js + JetBrains Mono/IBM Plex Sans). Client-side search, filtering, sorting, and pagination.
- **Monetization Engine:** Affiliate link mapper (`config/affiliates.json`) auto-injecting "1-Click Deploy" and "Inference Provider" ref links.

## Phases
- [x] **Phase 1: Project Setup & UI Design System**
  - Scaffold `index.html`, `css/style.css`, `js/app.js`.
  - Apply UI/UX Pro Max design tokens (OLED dark, JetBrains Mono, contrast palette).
  - Status: complete
- [x] **Phase 2: Data Schema & Crawler Engine**
  - Create Python script `scripts/fetch_repos.py` to pull and format AI repo metrics (stars, deltas, topics, deploy targets).
  - Output mock & live datasets to `data/repos.json` and `data/summary.json`.
  - Status: complete
- [x] **Phase 3: Frontend Interactive Features**
  - Build table/grid view with metrics (1d growth, 7d growth, category badges).
  - Implement instant client-side search, category filter, and multi-column sorting.
  - Implement Chart.js summary trend overview.
  - Status: complete
- [x] **Phase 4: Affiliate & Ref Slot Integration**
  - Configurable affiliate map (RunPod, Railway, OpenRouter, Together AI).
  - Add "Deploy" modal/dropdown on repos with ref query params.
  - Add FTC / Affiliate disclaimer in footer.
  - Status: complete
- [x] **Phase 5: GitHub Actions Cron & Deployment Guide**
  - Create `.github/workflows/update-data.yml` for scheduled auto-updates.
  - Test locally via static HTTP server.
  - Status: complete

## Next Step
Deliver implementation summary and GitHub deployment instructions to user.
