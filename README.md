# Fantaball

**On-chain fantasy football, settled in SOL.** Build a squad, set your lineup every matchday, climb a single cumulative leaderboard, and — when the prize pool is live — the top 100 are paid in SOL. Free to play; an optional token acts as the access pass.

Fantaball launches around the 2026 World Cup but is built to run season after season (domestic leagues, Champions League, future World Cups) on the same token and the same engine.

- **Live site:** https://fantaball.tech
- **Stack:** React + Vite (web client) · FastAPI (public API + scoring) · Supabase / Postgres (data) · Solana / pump.fun (token + prize funding)

---

## Table of contents
- [What Fantaball is](#what-fantaball-is)
- [How the game works](#how-the-game-works)
- [Prize pool & token](#prize-pool--token)
- [The web app](#the-web-app)
- [Live stream overlay](#live-stream-overlay)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Running locally](#running-locally)
- [Deployment](#deployment)
- [Environment variables](#environment-variables)
- [Branding](#branding)

---

## What Fantaball is

Fantaball is a fantasy-football competition where a public prize pool is funded transparently by on-chain trading fees and paid out in SOL. It is designed for a crypto-native audience first and football fans second: simple, visual, mobile-first.

Two principles shape every rule:

1. **Objective scoring only.** Points come exclusively from events that can be verified through a football data API (goals, assists, clean sheets, cards, minutes, etc.). There are no subjective "ratings", so a leaderboard position can always be reproduced and defended.
2. **One cumulative leaderboard, no eliminations.** Managers are never knocked out. Everyone keeps accumulating points for the whole tournament, and the prize curve pays the top 100 on a smooth descending scale — even 100th place is paid.

---

## How the game works

### Squad (the roster)
- **15 players:** 2 goalkeepers, 5 defenders, 5 midfielders, 3 forwards.
- **Budget:** 888 credits, fixed player prices. The budget is calibrated so an all-star XI is out of reach — a realistic squad is roughly four or five stars plus solid role players.
- **Transfers:** allowed only between tournament stages. When a player's nation is eliminated, that player returns 50% of their price as credits.

### Lineup (each matchday)
- Pick **11 starters** from your 15, respecting a minimum of 1 GK / 3 DEF / 2 MID / 1 FWD.
- **Captain** scores ×2 (floored at 0). **Vice-captain** scores ×1.5, but only if the captain doesn't play.
- **Auto-substitution:** if a starter plays 0 minutes, an eligible bench player is swapped in automatically.
- Lineups are stored as **per-gameweek snapshots**, so a past matchday can never be retroactively contested.

### Scoring & gameweeks
- Scoring is **hybrid**: it runs live while matches are in progress and is **frozen** when the gameweek closes.
- The tournament is split into **8 fantasy gameweeks** mapped to the competition stages — for the World Cup: group matchdays (GW1–3), Round of 32 (GW4), Round of 16 (GW5), Quarter-finals (GW6), Semi-finals (GW7), Final (GW8).
- The complete points table lives in [`docs/`](docs/).

### Leaderboard & payout
- A single cumulative leaderboard ranks every manager for the whole tournament.
- **Top 100** are paid in SOL on a smooth descending curve. Tie-breakers, in order: captain points, then lowest budget spent, then earliest signup.

---

## Prize pool & token

### Where the pool comes from
The public prize pool is funded by **creator trading fees of the $FANTABALL token**, distributed transparently and paid in SOL:

| Slice | Allocation | Purpose |
|------:|------------|---------|
| **60%** | Prize pool | Paid to the top 100 in SOL |
| **30%** | Side-quests / bounties | Reach and ladder rewards (see below), from a separate wallet |
| **10%** | Marketing | Growth and reach |

### Token as access pass
The game is **free to play**. Holding **$25 of $FANTABALL** unlocks entry — aligning players with the token that funds the pool. The token is bought on pump.fun at `pump.fun/coin/<mint>` once live.

### Side-quests (pump.fun GO)
The 30% slice funds **parallel side-quests** that are independent of the top-100 payout. Their goal is reach: paying creators and streamers in SOL for content that brings new eyes to the project (livestreams with the ticker on screen, posts past real view thresholds, prediction ladders such as "Bracket Oracle" and "Man of the Matchday"). Every quest is built around a single, objectively verifiable winner. Rationale and the quest set are documented in [`docs/pumpfun-go-strategy.md`](docs/pumpfun-go-strategy.md).

### Private leagues (future)
Private pools will carry a **4% service fee**, routed **90% to buyback-and-burn of $FANTABALL** and 10% to marketing — creating continuous buy pressure on the token.

> Social sharing only ever grants XP and cosmetics — **never** leaderboard points — to keep the SOL prize race free of farming abuse.

---

## The web app

The client is a mobile-first single-page app with a bottom tab bar. Main sections:

- **Build** — the squad builder: pick 15 players within the 888-credit budget, by position and price.
- **Pitch** — set the matchday lineup, formation, captain and vice.
- **Ranks** — the cumulative leaderboard and the SOL prize curve.
- **Token** — tokenomics and the fee/prize money flow.
- **Quests** — the active pump.fun GO side-quests.
- **About** — how it works, the story, and the payout model.

**Sign-in.** Players authenticate with their X account (via Supabase Auth) and link a Solana wallet (Phantom / Backpack / Solflare). Once signed in, their squad and matchday lineups are saved to their profile.

Contact and social links are driven by a `SOCIALS` config: each entry only renders when a real URL is set, so there are never dead "coming soon" buttons. Channels: X, CoinCommunity, the pump.fun buy page, the GO bounties page, and `hello@fantaball.tech`.

Design language: white / ink-black / orange, custom monochrome SVG icons, no system emoji (nation flags excepted, since they are data).

---

## Live stream overlay

`stream/overlay.html` is a self-contained broadcast overlay intended to be added as a **Browser Source in OBS at 1920×1080**. It is used during matchday livestreams (which also feed the reach side-quests).

It displays, in a continuous on-screen ticker:
- the **top of the live leaderboard**,
- the **matchday leaders**,
- the **active side-quests** and their rewards,
- a **now-playing** track label (the audio itself is added in OBS, kept separate so the overlay stays copyright-safe).

**Modes:**
- `DEMO = true` (default) drives the overlay with simulated data so it can be previewed and rehearsed with no backend.
- To go live, set `DEMO = false` and point `API_BASE` at the deployed backend. The overlay then reads `GET /public/stream/state`, which returns the live leaderboard, matchday leaders and quest list in one payload.

Because it is a single HTML file with no build step, it can be dropped straight into OBS or opened in any browser.

---

## Architecture

```
Browser ──► React/Vite client (Netlify)
                 │  reads/writes via Supabase JS client (RLS-gated)
                 ▼
            Supabase / Postgres (eu-central-1)
                 ▲
                 │  REST
   FastAPI public API + scoring jobs (Railway)
                 ▲
                 │  reads
   OBS overlay (stream/overlay.html)  ──► GET /public/stream/state
```

- **Frontend** — React + Vite, talks directly to Supabase through the JS client (row-level-security gated). Players sign in with their X account (via Supabase Auth) and link a Solana wallet (Phantom / Backpack / Solflare); their squad and matchday lineups are then saved to their profile. If Supabase env vars are absent, it falls back to bundled demo data so the UI always renders.
- **Backend** — FastAPI, deployed on Railway:
  - `scoring.py` — the pure scoring engine (self-tested).
  - `calc_gameweek.py` — computes player and manager scores for a gameweek and writes them to Supabase.
  - `import_fixtures.py` — imports the World Cup fixtures from the football data API.
  - `public_api.py` — a no-auth **read** API: per-manager matchday score and rank, matchday leaders, the full leaderboard, and the `/public/stream/state` payload for the overlay. These public endpoints make every score independently verifiable.
- **Database** — Supabase Postgres: schema, game tables, seed data (players + gameweeks) and row-level-security policies, as ordered SQL migrations.

### Public API endpoints
| Method | Path | Returns |
|-------|------|---------|
| GET | `/health` | service health |
| GET | `/public/user/{handle}/gameweek/{gw}` | a manager's score for a gameweek |
| GET | `/public/user/{handle}/rank` | a manager's leaderboard position |
| GET | `/public/matchday/{gw}/top` | matchday leaders |
| GET | `/public/leaderboard` | full leaderboard (optionally by gameweek) |
| GET | `/public/stream/state` | combined payload for the stream overlay |

---

## Repository structure

```
fantaball/
├── frontend/            React + Vite web client  → Netlify
│   ├── public/          static assets (favicon)
│   ├── src/
│   │   ├── App.jsx          the application
│   │   ├── main.jsx         entry point
│   │   ├── index.css        styles
│   │   ├── all_players_compact.json   bundled player dataset
│   │   └── lib/
│   │       ├── supabase.js  Supabase client (graceful demo fallback)
│   │       └── data.js      data access layer
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/             FastAPI public API + scoring  → Railway
│   ├── public_api.py
│   ├── scoring.py
│   ├── calc_gameweek.py
│   ├── import_fixtures.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── runtime.txt
│   └── README.md
├── database/            Supabase Postgres setup (run in order)
│   ├── 01_schema.sql
│   ├── 02_schema_game.sql
│   ├── 03_seed_players.sql
│   ├── 04_seed_gameweeks.sql
│   ├── 05_rls.sql
│   └── README.md
├── data/                source datasets (players, nations)
├── stream/
│   └── overlay.html     OBS broadcast overlay
├── brand/
│   └── fantaball-logo.html   animated logo
├── docs/                detailed game rules and strategy
├── netlify.toml         Netlify build config (root)
├── .gitignore
└── README.md
```

---

## Running locally

### Frontend
```bash
cd frontend
npm install
cp .env.example .env        # add your Supabase URL + anon key (optional; demo data works without)
npm run dev                 # http://localhost:5173
npm run build               # production build → dist/
```

### Backend
```bash
cd backend
pip install -r requirements.txt

# Set env vars (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY + API_FOOTBALL_KEY)
# or place them in a backend/.env file (loaded automatically by the scripts)
uvicorn public_api:app --reload --port 8000   # http://localhost:8000/health
python scoring.py                              # run the scoring engine tests
```

---

## Deployment

### Database (Supabase)
Create a project (region `eu-central-1`), then run the SQL files in `database/` **in order** (`01` → `05`) from the SQL editor. This creates the schema, seeds the players and gameweeks, and applies row-level-security.

### Frontend (Netlify)
The root `netlify.toml` configures the build automatically:
- base directory `frontend`, build command `npm run build`, publish directory `dist`, with an SPA redirect.

Connect the repository in Netlify and add the two environment variables below — no manual build settings required.

### Backend (Railway)
Connect the repository with **Root Directory = `backend`**. The `Procfile` starts the API with Uvicorn. Set the backend environment variables in Railway.

### Authentication
Sign-in uses Supabase Auth. Enable the **X (Twitter)** provider in Supabase → Authentication → Providers, add the X app credentials, and set the redirect URL to the deployed site. Solana wallet linking runs entirely client-side (no extra configuration).

---

## Environment variables

**Frontend** (set in Netlify → Environment variables, or in `frontend/.env` for local dev — only `VITE_*` variables are exposed to the browser):
| Variable                  | Description |
|---------------------------|-------------|
| `VITE_SUPABASE_URL`       | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY`  | Supabase **anon** public key (**never** the service role key) |
| `VITE_API_URL`            | Base URL of the public backend (e.g. the Railway FastAPI). Optional for some read-only features. |
| `VITE_SITE_URL`           | Your production site URL (e.g. `https://fantaball.tech`). Strongly recommended for reliable X/Twitter OAuth redirects. |

**Backend** (Railway variables, or `backend/.env` locally):
| Variable                        | Description |
|---------------------------------|-------------|
| `SUPABASE_URL`                  | Supabase REST URL |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (recommended for write jobs). `SUPABASE_KEY` is also accepted as fallback. |
| `API_FOOTBALL_KEY`              | API-Football (api-sports.io) key. Only required by scoring/fixtures/stats jobs. |

> **Important**: Never put backend-only variables (`SUPABASE_*`, `API_FOOTBALL_KEY`) into the frontend/Netlify environment. See `netlify.toml` for details.

---

## Branding

`brand/fantaball-logo.html` is a self-contained animated logo (a rotating sphere built from small cubes in the Fantaball palette) designed to export as a seamless looping GIF. Open it in a browser; the control panel adjusts the loop and exports the GIF.

---

© Fantaball. All rights reserved.
