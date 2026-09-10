# Findings & Research: AI Ranking & Monetization Platform (GitHub Pages)

## 1. GoodAIList Architecture Analysis
- **Target URL:** `https://goodailist.com/`
- **Frontend:** Vanilla HTML5 + CSS + JS (modular: `app.js`, `formatters.js`, `header.js`) + Chart.js.
- **Data Source:** Backend exposes REST endpoints:
  - `/api/summary`: Total counts (repos, devs, stars).
  - `/api/repos?page=1&limit=100&sortBy=star_1d&sortOrder=desc`: Paginated repo metrics.
  - Metrics tracked: `stars`, `forks`, `star_1d`, `star_1d_pct`, `star_7d`, `star_7d_pct`, `category`, `subcat`, `top_devs`, `contributors`.
- **GitHub Pages Feasibility:** 100% possible by decoupling backend into **GitHub Actions cron generator** -> writes static JSON (`repos.json`, `summary.json`, `history.json`) -> Vanilla JS frontend queries static files client-side.

## 2. UI/UX Pro Max Design System Specs
- **Pattern:** Tech Directory / Ranking Dashboard (Dark OLED).
- **Colors:**
  - Background: `#0F172A` (Slate deep)
  - Card/Panel: `#1B2336` / `#1E293B`
  - Border: `#334155`
  - Accent / Primary CTA: `#22C55E` (Terminal Green) / `#38BDF8` (Electric Blue)
  - Text: Foreground `#F8FAFC`, Muted `#94A3B8`
- **Typography:** JetBrains Mono (metrics, stats, tags) + IBM Plex Sans (headings, text).
- **Icons:** SVG only (Lucide style), no emoji clutter.

## 3. Monetization & Ref Strategy
- **Cloud/GPU 1-Click Deploy:** RunPod, Railway, Vast.ai, DigitalOcean (Ref URLs embedded on deploy tags).
- **LLM/API Inference Providers:** OpenRouter, Together AI, Groq, Novita AI.
- **SaaS Tool Directory Expansion:** Future integration with AI tools using affiliate platforms (Rewardful/FirstPromoter/Tolt).
- **Sponsored Banners / Sticky Top 3 Repos.**
